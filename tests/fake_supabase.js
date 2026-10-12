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
        if (table === 'characters') {
          const err = SV.verify(d, q.row); // trigger characters_verify_save (20261012000000_save_verify.sql) — เปิดเมื่อเทสต์ใส่สำเนากติกา
          if (err) return { data: null, error: err };
          d.chars[q.row.user_id] = q.row;
        }
        save(d); return { data: null, error: null };
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

  // ---------- ระบบตรวจเซฟ (supabase/migrations/20261012000000_save_verify.sql) ----------
  // กติกาใช้สำเนา JavaScript (supabase/save_verify_rules.js → window.SaveVerifyRules) + ข้อมูล window.__SV_DATA (tests/save_verify_data.json)
  //   ไม่มีสองอย่างนี้ = เซิร์ฟเวอร์ไม่ตรวจเซฟ (เทสต์อื่นทำงานเหมือนเดิม) • window.__noSaveVerify = จำลองเซิร์ฟเวอร์ที่ยังไม่ได้รัน migration (RPC → PGRST202)
  //   เก็บแยกคีย์ต่อแถว (fake_sv:*) ไม่อ่าน-แก้-เขียนก้อนเดียวกันข้ามแท็บ (กันสองแท็บเขียนทับกัน) • เซฟล่าสุดที่ผ่านการตรวจ = fake_sv:row:<uid>
  //   นาฬิกาเซิร์ฟเวอร์ = Date.now() + fake_sv:clock (เทสต์เลื่อนเวลาได้ ใช้ร่วมกันทุกแท็บ) • ตั้งค่า fake_sv:cfg • แบน fake_sv:ban:<uid>
  const SV = {
    get(k, d) { try { const v = localStorage.getItem('fake_sv:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { localStorage.setItem('fake_sv:' + k, JSON.stringify(v)); },
    keys(pre) { const out = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('fake_sv:' + pre)) out.push(k.slice(8)); } return out; },
    on() { return !!(window.SaveVerifyRules && window.__SV_DATA) && !window.__noSaveVerify; },
    now() { return Date.now() + (+this.get('clock', 0) || 0); },
    cfg() { return Object.assign({ mode: 'log', soft_rules: ['unknown_item', 'unknown_job', 'dup_uid', 'import_offline'], params: {}, derived: window.__SV_DATA ? window.__SV_DATA.derived : {} }, this.get('cfg', {})); },
    banned(u) { return this.get('ban:' + u, null); },
    worth(items) {
      const I = window.__SV_DATA ? window.__SV_DATA.items : {};
      let w = 0;
      for (const x of Array.isArray(items) ? items : []) { if (!x) continue; w += (I[x.id] ? I[x.id].w : 0) * Math.max(0, Math.min(1e6, +x.qty || 0)); for (const c of x.cards || []) w += I[c] ? I[c].w : 0; }
      return w;
    },
    ledger(u) { return this.keys('led:').map(k => Object.assign({ key: k }, this.get(k))).filter(r => !u || r.user_id === u); },
    paired(r) { return !!this.get(`led:${r.kind}:${r.tid}:${r.peer_id}`, null) && this.get(`led:${r.kind}:${r.tid}:${r.peer_id}`).peer_id === r.user_id && this.get(`led:${r.kind}:${r.tid}:${r.peer_id}`).sig === r.sig; },
    flag(u, f) { const l = this.get('flags:' + u, []); l.push(f); this.set('flags:' + u, l); },
    verify(d, row) {
      if (!this.on()) return null;
      const u = row.user_id;
      if (this.banned(u) != null) return { code: 'P0001', message: 'banned' };
      const prev = this.get('row:' + u, null) || (d.chars[u] ? { data: d.chars[u].data, updated_ms: d.chars[u].updated_ms } : null);
      const now = this.now(), cfg = this.cfg();
      if (cfg.mode === 'off') { this.set('row:' + u, { data: row.data, updated_ms: now }); return null; }
      const rows = this.ledger(u).filter(r => !r.consumed).map(r => Object.assign({}, r, { paired: this.paired(r) }));
      const res = window.SaveVerifyRules.evaluate({ oldData: prev ? prev.data : null, newData: row.data, oldAt: prev ? prev.updated_ms : null, now, state: this.get('state:' + u, null), rows, cfg, items: window.__SV_DATA.items, jobs: window.__SV_DATA.jobs });
      const log = this.get('log:' + u, []); log.push({ at: now, t: res.t, dW: res.dW, credit: res.credit, flags: res.flags.map(f => f.rule), reject: res.reject, state: res.state }); this.set('log:' + u, log.slice(-300));
      if (res.reject) return { code: 'P0001', message: 'save_rejected:' + res.reject, hint: 'The server rejected this save' };
      this.set('state:' + u, res.state);
      for (const r of rows) if (res.consume.includes(r.id)) this.set(r.key, Object.assign(this.get(r.key), { consumed: now }));
      const fl = this.get('flags:' + u, []);
      for (const f of res.flags) if (!fl.some(x => x.rule === f.rule && x.slot === f.slot && now - x.at < 600000)) fl.push({ user_id: u, slot: f.slot, rule: f.rule, detail: f.detail, mode: cfg.mode, at: now });
      this.set('flags:' + u, fl);
      this.set('row:' + u, { data: row.data, updated_ms: now });
      row.updated_ms = now;
      return null;
    },
    rpc(fn, a) {
      if (window.__noSaveVerify) return { data: null, error: { code: 'PGRST202', message: `Could not find the function public.${fn}` } };
      if (!session) return { data: null, error: { message: 'not signed in' } };
      const u = session.user.id, now = this.now();
      if (fn === 'my_ban') return { data: this.banned(u), error: null };
      if (fn === 'save_verify_report') { this.flag(u, { user_id: u, slot: null, rule: 'rejected:' + a.rule, detail: a.detail || {}, mode: 'enforce', rejected: true, at: now }); return { data: null, error: null }; }
      if (this.banned(u) != null) return { data: null, error: { code: 'P0001', message: 'banned' } };
      let r;
      if (fn === 'market_record') {
        if (u !== a.seller && u !== a.buyer) return { data: null, error: { message: 'not a party to this sale' } };
        const peer = u === a.seller ? a.buyer : a.seller, w = this.worth([{ id: a.item, qty: a.qty, cards: a.cards || [] }]), cost = a.price * a.qty;
        if (!peer || peer === u) return { data: null, error: { message: 'bad peer' } };
        r = { kind: 'market', tid: a.tid, user_id: u, peer_id: peer, zin: u === a.seller ? cost : 0, zout: u === a.buyer ? cost : 0, win: u === a.buyer ? w : 0, wout: u === a.seller ? w : 0,
          sig: ['market', a.seller, a.buyer, a.item, a.qty, a.price, (a.cards || []).join(',')].join('|') };
      } else if (fn === 'trade_record') {
        if (!a.peer || a.peer === u) return { data: null, error: { message: 'bad peer' } };
        const zg = Math.max(0, Math.floor(+a.gave.zeny) || 0), zr = Math.max(0, Math.floor(+a.got.zeny) || 0), wg = this.worth(a.gave.items), wr = this.worth(a.got.items);
        r = { kind: 'trade', tid: a.tid, user_id: u, peer_id: a.peer, zin: zr, zout: zg, win: wr, wout: wg, sig: u < a.peer ? ['trade', u, zg, wg, a.peer, zr, wr].join('|') : ['trade', a.peer, zr, wr, u, zg, wg].join('|') };
      } else return { data: null, error: null };
      const k = `led:${r.kind}:${r.tid}:${u}`;
      if (!this.get(k, null)) this.set(k, Object.assign(r, { id: k, at: now }));
      return { data: this.paired(this.get(k)), error: null };
    },
  };
  window.__FAKE_SV = SV;

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
      const svRpc = (fn, args) => { window.__svCalls = (window.__svCalls || 0) + 1; return Promise.resolve(SV.rpc(fn, args || {})); };
      return { auth, from: query, rpc: (fn, args) => fn === 'claim_session' ? claim(args.s)
        : ['market_record', 'trade_record', 'save_verify_report', 'my_ban'].includes(fn) ? svRpc(fn, args)
        : ok(fn === 'name_available' ? !Object.values(db().chars).some(c => names(c).includes(lc(args.n)) && (!session || c.user_id !== session.user.id)) : null),
        channel, removeChannel(ch) { ch && ch._leave && ch._leave(); } };
    },
  };
  // ไม่ให้สคริปต์ CDN จริงมาทับของปลอม
  Object.defineProperty(window, 'supabase', { configurable: false, writable: false, value: window.supabase });
  window.ONLINE_CONFIG = { url: 'https://fake.supabase.test', anonKey: 'fake', emailDomain: 'players.test' };
  Object.defineProperty(window, 'ONLINE_CONFIG', { configurable: false, writable: false, value: window.ONLINE_CONFIG });
})();
