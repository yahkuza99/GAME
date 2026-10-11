// ============================================================
//  Supabase ปลอมสำหรับทดสอบหลายผู้เล่นในเครื่องเดียว (Playwright addInitScript)
//  ใช้ BroadcastChannel ระหว่างแท็บใน browser context เดียวกัน แทน Realtime จริง
//  รองรับเฉพาะ API ที่ js/online.js ใช้: auth, from('characters'|'chat_messages'), rpc, channel (broadcast + presence)
// ============================================================
(() => {
  const DB = 'fake_sb_db';
  const db = () => { try { return JSON.parse(localStorage.getItem(DB)) || { users: {}, chars: {}, chat: [] }; } catch (e) { return { users: {}, chars: {}, chat: [] }; } };
  const save = d => localStorage.setItem(DB, JSON.stringify(d));
  const ok = data => Promise.resolve({ data, error: null });
  // เซสชันอยู่ต่อหลังรีโหลดแท็บเดิม (เหมือน persistSession ของจริง) แต่แยกตามแท็บ ให้หลายผู้เล่นในเบราว์เซอร์เดียวไม่ชนกัน
  const SKEY = 'fake_sb_session';
  let session = (() => { try { return JSON.parse(sessionStorage.getItem(SKEY)); } catch (e) { return null; } })();
  const setSession = s => { session = s; try { if (s) sessionStorage.setItem(SKEY, JSON.stringify(s)); else sessionStorage.removeItem(SKEY); } catch (e) { /* ignore */ } };

  function query(table) {
    const q = { table, filters: [], op: 'select', row: null };
    const run = () => {
      const d = db();
      if (q.op === 'upsert') {
        // trigger characters_session_guard (supabase/migrations/20261011000000_single_session.sql)
        const cur = d.sess && d.sess[q.row.user_id];
        if (table === 'characters' && cur && q.row.sid !== cur) return { data: null, error: { code: 'P0001', message: 'stale_session' } };
        if (table === 'characters') d.chars[q.row.user_id] = q.row; save(d); return { data: null, error: null };
      }
      if (q.op === 'insert') {
        if (table === 'chat_messages') {
          const m = Object.assign({ id: Date.now(), user_id: session && session.user.id, name: session && session.user.user_metadata.username }, q.row);
          d.chat.push(m); save(d); bus.postMessage({ kind: 'pg', table, row: m });
        }
        return { data: null, error: null };
      }
      let rows = table === 'characters' ? Object.values(d.chars) : d.chat;
      for (const [k, v] of q.filters) rows = rows.filter(r => r[k] === v);
      return { data: q.single ? (rows[0] || null) : rows, error: null };
    };
    const thenable = {
      select() { return thenable; }, eq(k, v) { q.filters.push([k, v]); return thenable; }, limit() { return thenable; },
      order() { return thenable; }, abortSignal() { return thenable; },
      maybeSingle() { q.single = true; return Promise.resolve(run()); },
      upsert(row) { q.op = 'upsert'; q.row = row; return Promise.resolve(run()); },
      insert(row) { q.op = 'insert'; q.row = row; return Promise.resolve(run()); },
      then(res, rej) { return Promise.resolve(run()).then(res, rej); },
    };
    return thenable;
  }

  const bus = new BroadcastChannel('fake_supabase_bus');
  const channels = new Set();
  bus.onmessage = ({ data: m }) => { for (const ch of channels) ch._recv(m); };

  function channel(name, opts) {
    const key = opts && opts.config && opts.config.presence && opts.config.presence.key;
    const handlers = [];
    const presence = {}; // key -> [meta]
    const ch = {
      name,
      on(type, filter, cb) { handlers.push({ type, filter, cb }); return ch; },
      subscribe(cb) {
        channels.add(ch);
        setTimeout(() => { cb && cb('SUBSCRIBED'); bus.postMessage({ kind: 'hello', ch: name, from: key }); }, 20);
        return ch;
      },
      track(meta) { if (key) { presence[key] = [meta]; bus.postMessage({ kind: 'presence', ch: name, key, meta }); fire('presence', 'sync'); } return Promise.resolve('ok'); },
      presenceState() { return presence; },
      send(msg) { bus.postMessage({ kind: 'bc', ch: name, event: msg.event, payload: msg.payload }); return Promise.resolve('ok'); },
      _leave() { if (key) bus.postMessage({ kind: 'leave', ch: name, key }); channels.delete(ch); },
      _recv(m) {
        if (m.kind === 'pg') { for (const h of handlers) if (h.type === 'postgres_changes' && h.filter.table === m.table) h.cb({ new: m.row }); return; }
        if (m.ch !== name) return;
        if (m.kind === 'bc') for (const h of handlers) if (h.type === 'broadcast' && h.filter.event === m.event) h.cb({ payload: m.payload });
        if (m.kind === 'hello' && key && presence[key]) bus.postMessage({ kind: 'presence', ch: name, key, meta: presence[key][0] });
        if (m.kind === 'presence') {
          const isNew = !presence[m.key]; presence[m.key] = [m.meta]; fire('presence', 'sync');
          if (isNew) for (const h of handlers) if (h.type === 'presence' && h.filter.event === 'join') h.cb({ key: m.key });
        }
        if (m.kind === 'leave') { delete presence[m.key]; fire('presence', 'sync'); for (const h of handlers) if (h.type === 'presence' && h.filter.event === 'leave') h.cb({ key: m.key }); }
      },
    };
    function fire(type, ev) { for (const h of handlers) if (h.type === type && h.filter.event === ev) h.cb({}); }
    return ch;
  }

  const auth = {
    async signUp({ email, password, options }) {
      const d = db(); if (d.users[email]) return { data: {}, error: { message: 'User already registered' } };
      const user = { id: 'u_' + Math.random().toString(36).slice(2, 10), email, user_metadata: options && options.data || {} };
      d.users[email] = { user, password }; save(d); setSession({ user });
      return { data: { session, user }, error: null };
    },
    async signInWithPassword({ email, password }) {
      const u = db().users[email]; if (!u || u.password !== password) return { data: {}, error: { message: 'Invalid login credentials' } };
      setSession({ user: u.user }); return { data: { session, user: u.user }, error: null };
    },
    async getSession() { return { data: { session } }; },
    async signOut() { setSession(null); return { error: null }; },
  };

  window.__FAKE_SUPABASE__ = true;
  window.supabase = {
    createClient() {
      // name_available: เหมือน supabase/migrations/..._multi_char.sql — เช็กทั้งคอลัมน์ name และทุกช่องใน data.chars ของคนอื่น (ไม่สนตัวพิมพ์)
      const lc = s => String(s || '').trim().toLowerCase();
      const names = c => [c.name, ...((c.data && Array.isArray(c.data.chars)) ? c.data.chars.map(x => x && x.name) : [])].map(lc);
      // claim_session: เครื่องล่าสุดเป็นเจ้าของบัญชี (window.__noServerGuard = จำลองเซิร์ฟเวอร์ที่ยังไม่ได้รัน migration)
      const claim = s => {
        if (window.__noServerGuard) return Promise.resolve({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.claim_session' } });
        if (!session) return Promise.resolve({ data: null, error: { message: 'not signed in' } });
        const d = db(); d.sess = d.sess || {}; d.sess[session.user.id] = s; save(d); return ok(null);
      };
      // ระบบเพื่อน: เหมือน supabase/migrations/20261012010000_friends.sql (window.__noFriendsServer = เซิร์ฟเวอร์ที่ยังไม่ได้รัน migration)
      const friend = (fn, args) => {
        if (window.__noFriendsServer) return Promise.resolve({ data: null, error: { code: 'PGRST202', message: `Could not find the function public.${fn}` } });
        if (!session) return Promise.resolve({ data: null, error: { message: 'not signed in' } });
        // เก็บแยกคีย์ (ไม่ปนกับก้อน db ที่ทุกแท็บเขียนทับทั้งก้อนตอนเซฟตัวละคร — localStorage ข้ามแท็บส่งค่าแบบ async)
        const FK = 'fake_sb_friends', d = db(), me = session.user.id;
        const fr = { friends: (() => { try { return JSON.parse(localStorage.getItem(FK)) || []; } catch (e) { return []; } })() };
        const saveF = () => localStorage.setItem(FK, JSON.stringify(fr.friends));
        const F = fr.friends, rel = (a, b) => F.find(r => r.user_id === a && r.friend_id === b);
        const nameOf = id => (d.chars[id] || {}).name || null;
        if (fn === 'friend_list') return ok(F.filter(r => r.user_id === me || r.friend_id === me).map(r => {
          const id = r.user_id === me ? r.friend_id : r.user_id;
          return { id, name: nameOf(id), status: r.status, dir: r.status === 'accepted' ? 'both' : r.user_id === me ? 'out' : 'in', created_at: r.created_at };
        }));
        if (fn === 'friend_accept') { const r = rel(args.id, me); if (r && r.status === 'pending') { r.status = 'accepted'; saveF(); return ok(true); } return ok(false); }
        if (fn === 'friend_remove') { const n = F.length; fr.friends = F.filter(r => !((r.user_id === me && r.friend_id === args.id) || (r.user_id === args.id && r.friend_id === me))); saveF(); return ok(fr.friends.length < n); }
        if (fn === 'friend_request') {
          const q = lc(args.n); if (!q || q.length > 24) return ok({ ok: false, why: 'bad_name' });
          const row = Object.values(d.chars).find(c => names(c).includes(q)); if (!row) return ok({ ok: false, why: 'not_found' });
          const other = row.user_id, shown = [row.name, ...((row.data && Array.isArray(row.data.chars)) ? row.data.chars.map(x => x && x.name) : [])].find(x => lc(x) === q) || row.name;
          if (other === me) return ok({ ok: false, why: 'self' });
          const back = rel(other, me);
          if (back && back.status === 'pending') { back.status = 'accepted'; saveF(); return ok({ ok: true, id: other, name: shown, status: 'accepted' }); }
          if (back || rel(me, other)) return ok({ ok: false, why: 'exists', id: other, status: (back || rel(me, other)).status });
          F.push({ user_id: me, friend_id: other, status: 'pending', created_at: new Date().toISOString() }); saveF();
          return ok({ ok: true, id: other, name: shown, status: 'pending' });
        }
        return ok(null);
      };
      return { auth, from: query, rpc: (fn, args) => fn === 'claim_session' ? claim(args.s) : /^friend_/.test(fn) ? friend(fn, args || {}) : ok(fn === 'name_available' ? !Object.values(db().chars).some(c => names(c).includes(lc(args.n)) && (!session || c.user_id !== session.user.id)) : null),
        channel, removeChannel(ch) { ch && ch._leave && ch._leave(); } };
    },
  };
  // ไม่ให้สคริปต์ CDN จริงมาทับของปลอม
  Object.defineProperty(window, 'supabase', { configurable: false, writable: false, value: window.supabase });
  window.ONLINE_CONFIG = { url: 'https://fake.supabase.test', anonKey: 'fake', emailDomain: 'players.test' };
  Object.defineProperty(window, 'ONLINE_CONFIG', { configurable: false, writable: false, value: window.ONLINE_CONFIG });
})();
