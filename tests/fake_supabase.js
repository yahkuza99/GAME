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
  let session = null;

  function query(table) {
    const q = { table, filters: [], op: 'select', row: null };
    const run = () => {
      const d = db();
      if (q.op === 'upsert') { if (table === 'characters') d.chars[q.row.user_id] = q.row; save(d); return { data: null, error: null }; }
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
      d.users[email] = { user, password }; save(d); session = { user };
      return { data: { session, user }, error: null };
    },
    async signInWithPassword({ email, password }) {
      const u = db().users[email]; if (!u || u.password !== password) return { data: {}, error: { message: 'Invalid login credentials' } };
      session = { user: u.user }; return { data: { session, user: u.user }, error: null };
    },
    async getSession() { return { data: { session } }; },
    async signOut() { session = null; return { error: null }; },
  };

  window.__FAKE_SUPABASE__ = true;
  window.supabase = {
    createClient() {
      return { auth, from: query, rpc: (fn, args) => ok(fn === 'name_available' ? !Object.values(db().chars).some(c => c.name === args.n && (!session || c.user_id !== session.user.id)) : null),
        channel, removeChannel(ch) { ch && ch._leave && ch._leave(); } };
    },
  };
  // ไม่ให้สคริปต์ CDN จริงมาทับของปลอม
  Object.defineProperty(window, 'supabase', { configurable: false, writable: false, value: window.supabase });
  window.ONLINE_CONFIG = { url: 'https://fake.supabase.test', anonKey: 'fake', emailDomain: 'players.test' };
  Object.defineProperty(window, 'ONLINE_CONFIG', { configurable: false, writable: false, value: window.ONLINE_CONFIG });
})();
