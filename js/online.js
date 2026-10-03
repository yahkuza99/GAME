'use strict';
// ============================================================
//  โหมดออนไลน์ (Supabase): สมัคร/ล็อกอิน, เซฟบนคลาวด์, เห็นผู้เล่นอื่น, แชทรวม
//  ถ้าไม่ได้ตั้งค่าใน js/online.config.js จะใช้ "บัญชีในเครื่อง" (local): สมัคร/ล็อกอินได้
//  ตัวละครแยกตามบัญชี เซฟในเบราว์เซอร์นี้ (ไม่มีผู้เล่นอื่น/แชทรวม)
// ============================================================

const Online = {
  enabled: false, local: false, sb: null, user: null, username: '',
  mapChannel: null, chatChannel: null, mapId: null, others: new Map(), count: 0,
  lastSend: 0, lastState: '', atkSeq: 0, lastAtkAnim: 0,
  saveTimer: null, pendingSave: null, saving: false, lastChat: 0,

  init() {
    const cfg = window.ONLINE_CONFIG || {};
    this.enabled = true;
    if (!cfg.url || !cfg.anonKey) { this.local = true; return; }
    if (!window.supabase || !window.supabase.createClient) { console.warn('โหลด Supabase ไม่สำเร็จ — ใช้บัญชีในเครื่อง'); this.local = true; return; }
    this.sb = window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: true, autoRefreshToken: true } });
    this.ready = this.probe(cfg);
  },
  ready: Promise.resolve(),
  // ตรวจว่าเซิร์ฟเวอร์พร้อมจริง (มีตาราง + ปิดยืนยันอีเมล + เชื่อมได้) ไม่พร้อม = ถอยไปใช้บัญชีในเครื่อง ผู้เล่นไม่ติดค้าง
  async probe(cfg) {
    const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 6000);
    let why = '';
    try {
      const r = await fetch(`${cfg.url}/auth/v1/settings`, { headers: { apikey: cfg.anonKey }, signal: ctrl.signal });
      const st = r.ok ? await r.json() : null;
      if (!st) why = 'auth ' + r.status;
      else if (!st.mailer_autoconfirm) why = 'ยังเปิด Confirm email';
      else {
        const { error } = await this.sb.from('characters').select('user_id', { head: true }).limit(1).abortSignal(ctrl.signal);
        if (error) why = 'ยังไม่มีตาราง (รัน supabase/schema.sql): ' + error.message;
      }
    } catch (e) { why = 'เชื่อมต่อไม่ได้: ' + (e && e.message || e); }
    clearTimeout(t);
    if (why) { console.warn('เซิร์ฟเวอร์ออนไลน์ยังไม่พร้อม — ใช้บัญชีในเครื่อง:', why); this.local = true; this.sb = null; this.offlineWhy = why; }
  },
  // online = เชื่อมเซิร์ฟเวอร์จริง (เห็นผู้เล่นอื่น แชทรวม เซฟคลาวด์) • loggedIn = ล็อกอินบัญชีแล้ว (รวมบัญชีในเครื่อง)
  get online() { return this.enabled && !this.local && !!this.user; },
  get loggedIn() { return this.enabled && !!this.user; },

  // ---------------- บัญชีในเครื่อง (ไม่มีเซิร์ฟเวอร์) ----------------
  LS: { accounts: 'nm_accounts', session: 'nm_session', char: u => `nm_char_${u.toLowerCase()}` },
  lsGet(k, def) { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
  lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  async hash(salt, pw) {
    const txt = `${salt}:${pw}:neo-midgard`;
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) { // บางเบราว์เซอร์ไม่มี crypto.subtle (หน้าไม่ใช่ https)
      let h1 = 0x811c9dc5, h2 = 0x1000193;
      for (let i = 0; i < txt.length; i++) { h1 = Math.imul(h1 ^ txt.charCodeAt(i), 16777619); h2 = Math.imul(h2 + txt.charCodeAt(i), 2246822507); }
      return 'f' + (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
    }
  },
  async localRegister(username, password) {
    const acc = this.lsGet(this.LS.accounts, {}), key = username.toLowerCase();
    if (acc[key]) throw new Error(L('ชื่อผู้ใช้นี้ถูกใช้แล้ว', 'That username is already taken.'));
    const salt = Math.random().toString(36).slice(2, 10);
    acc[key] = { name: username, salt, hash: await this.hash(salt, password), created: Date.now() };
    if (!this.lsSet(this.LS.accounts, acc)) throw new Error(L('เบราว์เซอร์นี้ไม่อนุญาตให้บันทึกข้อมูล', 'This browser does not allow saving data.'));
    this.setLocal(username);
  },
  async localLogin(username, password) {
    const a = this.lsGet(this.LS.accounts, {})[username.toLowerCase()];
    if (!a || a.hash !== await this.hash(a.salt, password)) throw new Error(L('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'Incorrect username or password.'));
    this.setLocal(a.name);
  },
  setLocal(username) {
    this.user = { id: 'local:' + username.toLowerCase(), local: true };
    this.username = username;
    this.lsSet(this.LS.session, username);
  },

  // ---------------- บัญชี ----------------
  validUsername(u) { return /^[a-zA-Z0-9_]{3,16}$/.test(u); },
  emailFor(u) { return `${u.toLowerCase()}@${(window.ONLINE_CONFIG.emailDomain || 'players.ragnarok-web.game')}`; },
  errText(err) {
    const m = String((err && (err.message || err.error_description)) || err || '');
    if (/invalid login credentials/i.test(m)) return L('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'Incorrect username or password.');
    if (/already registered|already exists/i.test(m)) return L('ชื่อผู้ใช้นี้ถูกใช้แล้ว', 'That username is already taken.');
    if (/password should be at least|weak/i.test(m)) return L('รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร', 'Password must be at least 6 characters.');
    if (/email not confirmed/i.test(m)) return L('เซิร์ฟเวอร์ยังเปิดการยืนยันอีเมลอยู่ (ผู้ดูแลต้องปิด Confirm email ใน Supabase)', 'The server still requires email confirmation (an admin must disable Confirm email in Supabase).');
    if (/rate limit/i.test(m)) return L('ลองใหม่อีกครั้งในอีกสักครู่', 'Please try again in a moment.');
    if (/failed to fetch|network/i.test(m)) return L('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ต', 'Cannot reach the server. Check your internet connection.');
    return m || L('เกิดข้อผิดพลาด', 'An error occurred.');
  },
  async register(username, password) {
    if (!this.validUsername(username)) throw new Error(L('ชื่อผู้ใช้ต้องเป็น a-z, 0-9 หรือ _ ยาว 3-16 ตัว', 'Username must be 3-16 characters: a-z, 0-9 or _.'));
    if (password.length < 6) throw new Error(L('รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร', 'Password must be at least 6 characters.'));
    await this.ready;
    if (this.local) return this.localRegister(username, password);
    const { data, error } = await this.sb.auth.signUp({ email: this.emailFor(username), password, options: { data: { username } } });
    if (error) throw new Error(this.errText(error));
    if (!data.session) throw new Error(L('สมัครแล้ว แต่เซิร์ฟเวอร์ต้องปิดการยืนยันอีเมล (Confirm email) ก่อนจึงจะเข้าเล่นได้', 'Registered, but the server must disable email confirmation (Confirm email) before you can play.'));
    this.setUser(data.session.user, username);
  },
  async login(username, password) {
    if (!this.validUsername(username)) throw new Error(L('ชื่อผู้ใช้ไม่ถูกต้อง', 'Invalid username.'));
    await this.ready;
    if (this.local) return this.localLogin(username, password);
    const { data, error } = await this.sb.auth.signInWithPassword({ email: this.emailFor(username), password });
    if (error) throw new Error(this.errText(error));
    this.setUser(data.user, username);
  },
  async restore() {
    if (!this.enabled) return false;
    await this.ready;
    if (this.local) {
      const u = this.lsGet(this.LS.session, null), acc = this.lsGet(this.LS.accounts, {});
      if (u && acc[String(u).toLowerCase()]) { this.setLocal(acc[String(u).toLowerCase()].name); return true; }
      return false;
    }
    try {
      const { data } = await this.sb.auth.getSession();
      if (data && data.session) { this.setUser(data.session.user); return true; }
    } catch (e) { /* ไม่มีเซสชัน */ }
    return false;
  },
  setUser(user, username) {
    this.user = user;
    this.username = username || (user.user_metadata && user.user_metadata.username) || String(user.email || '').split('@')[0];
  },
  // รอจนบันทึกคลาวด์ที่ค้างอยู่ส่งเสร็จ (ก่อนเปลี่ยนตัวละคร/ออกจากระบบ) — สำเนาในเครื่องเขียนไว้แล้วเสมอ
  async flushAll(ms = 4000) {
    const end = performance.now() + ms;
    while (this.online && (this.pendingSave || this.saving) && performance.now() < end) {
      clearTimeout(this.saveTimer); this.saveTimer = null;
      await this.flushSave();
      if (this.saving || this.pendingSave) await new Promise(r => setTimeout(r, 60));
    }
  },
  async logout() {
    await this.flushAll();
    this.rowName = null;
    if (this.local) { try { localStorage.removeItem(this.LS.session); } catch (e) { /* ignore */ } this.user = null; return; }
    this.leaveMap();
    if (this.chatChannel) { this.sb.removeChannel(this.chatChannel); this.chatChannel = null; }
    await this.sb.auth.signOut();
    this.user = null;
  },

  // ---------------- ตัวละคร ----------------
  // คืน "ก้อนบัญชี" { v: 2, active, chars: [...] } (เซฟรุ่นเก่าตัวเดียวถูกห่อเป็นช่องแรก — ดู Acct ใน game.js)
  async loadCharacter() {
    if (this.local) return Acct.wrap(this.lsGet(this.LS.char(this.username), null));
    const { data, error } = await this.sb.from('characters').select('name, data').eq('user_id', this.user.id).maybeSingle();
    if (error) throw new Error(this.errText(error));
    this.rowName = data ? data.name : null;
    const cloud = data ? data.data : null, mirror = this.lsGet(this.mirrorKey(), null);
    // ใช้ก้อนที่ใหม่กว่าระหว่างคลาวด์กับสำเนาในเครื่อง (เทียบ savedAt ของทั้งก้อน) แล้วส่งตัวที่ใหม่กว่าขึ้นคลาวด์
    const { acct, push } = Acct.merge(cloud, mirror);
    if (push) this.queueSave(acct, true);
    else this.lsSet(this.mirrorKey(), acct); // สำเนาในเครื่อง = ก้อนล่าสุดเสมอ (การเซฟจะรวมกับสำเนานี้ — ดู Acct.withStored)
    return acct;
  },
  mirrorKey() { return `nm_cloud_mirror_${this.user && this.user.id}`; },
  // ชื่อทุกตัวในเซฟ (ก้อนบัญชีหรือเซฟรุ่นเก่า)
  charNames(d) { return Acct.wrap(d).chars.map(c => String(c.name).toLowerCase()); },
  async nameAvailable(name) {
    if (this.local) { // ชื่อซ้ำกับตัวละครของบัญชีอื่นในเครื่องนี้ไม่ได้ (ทุกช่อง)
      const acc = this.lsGet(this.LS.accounts, {}), me = this.username.toLowerCase(), n = name.trim().toLowerCase();
      return !Object.keys(acc).some(k => k !== me && this.charNames(this.lsGet(this.LS.char(k), null)).includes(n));
    }
    const { data, error } = await this.sb.rpc('name_available', { n: name });
    if (error) throw new Error(this.errText(error));
    return !!data;
  },
  // บันทึกแบบหน่วงเวลา (รวมหลายครั้งเป็นครั้งเดียว)
  queueSave(data, immediate) {
    if (!this.loggedIn) return;
    if (this.local) { this.lsSet(this.LS.char(this.username), data); return; }
    // สำเนาในเครื่องทุกครั้ง: ถ้าปิดแอปก่อนเซฟคลาวด์ทัน (หน่วง 4 วิ) ครั้งหน้าจะใช้สำเนาที่ใหม่กว่า
    this.lsSet(this.mirrorKey(), data);
    this.pendingSave = data;
    // ไม่เลื่อนการบันทึกที่นัดไว้เร็วกว่าออกไป
    const due = performance.now() + (immediate ? 0 : 4000);
    if (this.saveTimer && this.saveDue <= due) return;
    clearTimeout(this.saveTimer);
    this.saveDue = due;
    this.saveTimer = setTimeout(() => { this.saveTimer = null; this.flushSave(); }, due - performance.now());
  },
  async flushSave() {
    if (!this.online || !this.pendingSave || this.saving) return;
    const data = this.pendingSave;
    this.pendingSave = null;
    // คอลัมน์ name = ชื่อตัวละครที่เล่นอยู่ (แชท/เช็กชื่อซ้ำใช้คอลัมน์นี้) • ไม่มีตัวละครเหลือ = คงชื่อเดิมของแถว
    const act = Acct.isV2(data) ? data.chars[data.active] : data;
    const name = (act && act.name) || this.rowName;
    if (!name) return;
    this.saving = true;
    try {
      let { error } = await this.sb.from('characters').upsert({ user_id: this.user.id, name, data, updated_at: new Date().toISOString() });
      // ชื่อชนกับคอลัมน์ name ของคนอื่น (เซิร์ฟเวอร์ที่ยังไม่อัปเดต name_available) → เก็บข้อมูลไว้ก่อนโดยคงชื่อเดิมของแถว
      if (error && this.rowName && name !== this.rowName && (error.code === '23505' || /duplicate|unique/i.test(error.message || ''))) {
        ({ error } = await this.sb.from('characters').upsert({ user_id: this.user.id, name: this.rowName, data, updated_at: new Date().toISOString() }));
        if (!error) { UI.setNet('ok'); return; }
      }
      if (error) throw error;
      this.rowName = name;
      UI.setNet('ok');
    } catch (e) {
      UI.setNet('err');
      if (!this.pendingSave) this.pendingSave = data; // ลองใหม่รอบหน้า
      console.warn('บันทึกบนคลาวด์ไม่สำเร็จ', e);
    } finally {
      this.saving = false;
      if (this.pendingSave && !this.saveTimer) this.queueSave(this.pendingSave, false);
    }
  },

  // ---------------- ผู้เล่นในแผนที่เดียวกัน ----------------
  joinMap(mapId) {
    if (!this.online) return;
    if (this.mapId === mapId && this.mapChannel) return;
    this.leaveMap();
    this.mapId = mapId;
    const ch = this.sb.channel(`map:${mapId}`, { config: { presence: { key: this.user.id }, broadcast: { self: false } } });
    ch.on('broadcast', { event: 'pos' }, ({ payload }) => this.onPos(payload));
    ch.on('broadcast', { event: 'say' }, ({ payload }) => this.onSay(payload));
    ch.on('broadcast', { event: 'hit' }, ({ payload }) => this.onHit(payload));
    ch.on('broadcast', { event: 'stun' }, ({ payload }) => this.onStun(payload));
    ch.on('broadcast', { event: 'kill' }, ({ payload }) => this.onKill(payload));
    ch.on('broadcast', { event: 'wb' }, ({ payload }) => { if (typeof WB !== 'undefined') WB.onNet(payload); }); // World Boss: เลือดร่วมกันทั้งแผนที่
    ch.on('broadcast', { event: 'emote' }, ({ payload }) => { const o = payload && this.others.get(payload.id); if (o && EMOTE_BY[payload.k]) Emote.play(payload.k, o); });
    ch.on('presence', { event: 'sync' }, () => {
      const st = ch.presenceState();
      this.count = Object.keys(st).length;
      for (const id of Array.from(this.others.keys())) if (!st[id]) this.others.delete(id);
    });
    ch.on('presence', { event: 'leave' }, ({ key }) => this.others.delete(key));
    ch.on('presence', { event: 'join' }, ({ key }) => { if (!this.user || key !== this.user.id) setTimeout(() => this.sendPos(true), 150); }); // มีคนเข้ามาใหม่ → ส่งตำแหน่งให้เห็นทันที
    ch.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        UI.setNet('ok');
        ch.track({ name: G.player.name, at: Date.now() });
        this.lastState = '';
        this.sendPos(true);
        if (typeof WB !== 'undefined' && WB.live()) WB.send('ask'); // เข้าแผนที่ระหว่างบอสโลกอยู่: ขอเลือดล่าสุดจากคนที่ตีอยู่ก่อน
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') UI.setNet('err');
    });
    this.mapChannel = ch;
  },
  leaveMap() {
    if (this.mapChannel) { this.sb.removeChannel(this.mapChannel); this.mapChannel = null; }
    this.others.clear(); this.count = 0; this.mapId = null;
    G.mobs = G.mobs.filter(m => !m.isPlayer);
    this.lastHitBy = null;
  },
  snapshot() {
    const p = G.player, e = p.equip;
    return {
      id: this.user.id, n: p.name, j: p.job, l: p.baseLv, h: p.hair, g: p.gender,
      w: e.weapon ? e.weapon.id : null, hd: e.head ? e.head.id : null, ga: e.garment ? e.garment.id : null,
      x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100, f: p.facing, dr: p.dir, m: p.moving ? 1 : 0,
      lk: p.look, s: p.sitting ? 1 : 0, d: p.dead ? 1 : 0, a: this.atkSeq, st: p.stealthUntil > G.time ? 1 : 0, b: Bot.on ? 1 : 0,
      // PvP: เลือดและค่าป้องกัน ให้อีกฝ่ายคำนวณดาเมจที่จะส่งมา
      ...(G.map.def.pvp ? { hp: Math.max(0, Math.round(p.hp)), mh: p.d.maxHp, pv: [p.d.def, p.d.mdef, p.d.flee, p.d.vit, p.baseLv] } : {}),
    };
  },
  sendPos(force) {
    if (!this.mapChannel) return;
    const snap = this.snapshot();
    const key = JSON.stringify(snap);
    const now = performance.now();
    const interval = G.player.moving ? 120 : 1500;
    if (!force && (now - this.lastSend < interval || (key === this.lastState && now - this.lastSend < 3000))) return;
    this.lastSend = now; this.lastState = key;
    this.mapChannel.send({ type: 'broadcast', event: 'pos', payload: snap });
  },
  onPos(s) {
    if (!s || !s.id || (this.user && s.id === this.user.id)) return;
    let o = this.others.get(s.id);
    if (!o) {
      o = { id: s.id, x: s.x, y: s.y, facing: 1, atkAnim: 0, speech: null, buffs: {}, lastA: s.a };
      this.others.set(s.id, o);
    }
    Object.assign(o, {
      name: s.n, look: s.lk && typeof s.lk === 'object' ? { head: String(s.lk.head || ''), color: String(s.lk.color || ''), glow: String(s.lk.glow || ''), visor: String(s.lk.visor || '') } : null, job: JOBS[s.j] ? s.j : 'novice', baseLv: s.l, hair: s.h, gender: s.g,
      equip: { weapon: s.w && ITEMS[s.w] ? { id: s.w } : null, head: s.hd && ITEMS[s.hd] ? { id: s.hd } : null, garment: s.ga && ITEMS[s.ga] ? { id: s.ga } : null },
      tx: s.x, ty: s.y, facing: s.f || 1, dir: s.dr, moving: !!s.m, sitting: !!s.s, dead: !!s.d, stealth: !!s.st, bot: !!s.b, seen: performance.now(),
    });
    if (s.a !== o.lastA) { o.lastA = s.a; o.atkAnim = 1; }
    o.hp = s.hp; o.maxHp = s.mh; o.pv = Array.isArray(s.pv) ? s.pv : null;
    if (Math.hypot(o.tx - o.x, o.ty - o.y) > 6) { o.x = o.tx; o.y = o.ty; }
  },
  onSay(s) {
    const o = s && this.others.get(s.id);
    if (o) o.speech = { text: s.t, until: G.time + 5 };
  },

  // ---------------- แชท ----------------
  joinChat() {
    if (!this.online || this.chatChannel) return;
    this.chatChannel = this.sb.channel('chat-global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, ({ new: m }) => {
        if (!m || (this.user && m.user_id === this.user.id)) return;
        const where = m.map && MAP_DEFS[m.map] && m.map !== G.map.id ? ` [${MAP_DEFS[m.map].name}]` : '';
        UI.msg(`${m.name}${where} : ${m.text}`, 'say');
      })
      .subscribe();
  },
  // อีโมตส่งเฉพาะคนในแผนที่เดียวกัน (ไม่บันทึกลงห้องแชต)
  sendEmote(k) {
    if (!this.online || !this.mapChannel) return;
    this.mapChannel.send({ type: 'broadcast', event: 'emote', payload: { id: this.user.id, k } });
  },
  async sendChat(text) {
    if (!this.online) return false;
    const now = performance.now();
    if (now - this.lastChat < 1000) { UI.msg(L('ส่งข้อความเร็วเกินไป', 'You are sending messages too fast.'), 'err'); return true; }
    this.lastChat = now;
    if (this.mapChannel) this.mapChannel.send({ type: 'broadcast', event: 'say', payload: { id: this.user.id, t: text } });
    const { error } = await this.sb.from('chat_messages').insert({ text, map: G.map.id });
    if (error) UI.msg(L(`ส่งแชทไม่สำเร็จ: ${this.errText(error)}`, `Failed to send message: ${this.errText(error)}`), 'err');
    return true;
  },

  // ---------------- PvP (ลานประลอง) ----------------
  // ผู้เล่นคนอื่นในลานประลองกลายเป็น "เป้า" ใน G.mobs (isPlayer) → ใช้ระบบเล็ง/ตี/สกิลเดิมได้ทั้งหมด
  // ผู้ตีคำนวณดาเมจแล้วส่ง 'hit' • ผู้ถูกตีหักเลือดตัวเอง (เลือดของใครของมัน) • ตายแล้วประกาศ 'kill'
  syncPvpTargets() {
    const pvp = G.map && G.map.def.pvp;
    const keep = new Set();
    if (pvp) for (const o of this.others.values()) {
      if (!o.pv) continue;
      keep.add(o.id);
      let m = G.mobs.find(x => x.isPlayer && x.ref === o);
      if (!m) {
        m = { uid: G.uid++, isPlayer: true, ref: o, state: 'idle', path: [], facing: 1, hitFlash: 0, atkAnim: 0, nextAtk: 0,
          def: { id: 'pvp_' + o.id, name: o.name, lv: 1, def: 0, mdef: 0, flee: 0, vit: 0, element: 'neutral', race: 'human', scale: 1, exp: 0, jexp: 0, drops: [] } };
        G.mobs.push(m);
      }
      const [df, mdf, fl, vt, lv] = o.pv;
      Object.assign(m.def, { name: o.name, def: df, mdef: mdf, flee: fl, vit: vt, lv });
      m.x = o.x; m.y = o.y; m.hp = o.hp || 0; m.maxHp = o.maxHp || 1; m.dead = !!o.dead || o.stealth;
    }
    if (G.mobs.some(m => m.isPlayer && !keep.has(m.ref.id))) {
      for (const m of G.mobs) if (m.isPlayer && !keep.has(m.ref.id)) m.dead = true; // ร่ายค้าง/เดินไปหาตัวที่ออกไปแล้วต้องยกเลิก
      G.mobs = G.mobs.filter(m => !m.isPlayer || keep.has(m.ref.id));
    }
    const p = G.player;
    if (p.target && p.target.isPlayer && p.target.dead) p.target = null;
  },
  sendHit(m, dmg, crit) {
    if (!this.mapChannel || !G.map.def.pvp) return;
    this.mapChannel.send({ type: 'broadcast', event: 'hit', payload: { from: this.user.id, fn: G.player.name, to: m.ref.id, dmg, crit } });
  },
  // รูนสตันใน PvP (js/runes.js Runes.tryStun): ผู้ตีทอยโอกาส 1% แล้วส่ง 'stun' • ผู้ถูกตีหักค่าต้านของตัวเอง (VIT/ต้านมึน/ไม่สะทกสะท้าน) แล้วค่อยมึน
  sendStun(m, dur) {
    if (!this.mapChannel || !G.map.def.pvp || !m || !m.ref) return;
    this.mapChannel.send({ type: 'broadcast', event: 'stun', payload: { from: this.user.id, to: m.ref.id, dur } });
  },
  onStun(s) {
    const p = G.player, d = p && p.d;
    if (!s || !this.user || s.to !== this.user.id || !G.map.def.pvp || p.dead || d.unshaken) return;
    const atk = this.others.get(s.from);
    if (!atk || atk.dead || U.dist(atk.x, atk.y, p.x, p.y) > 16) return;
    const now = performance.now(); if (now - (this.stunAt || 0) < 3000) return; // กันส่งรัว: มึนจากคนอื่นได้ทุก 3 วิ
    if (!U.chance((1 - Math.min(0.9, d.vit / 100)) * (1 - d.stunRes / 100))) return;
    this.stunAt = now;
    stunPlayer(U.clamp(+s.dur || 0, 0.3, 2));
  },
  onHit(s) {
    const p = G.player;
    if (!s || !this.user || s.to !== this.user.id || !G.map.def.pvp || p.dead) return;
    const atk = this.others.get(s.from);
    if (!atk || atk.dead || U.dist(atk.x, atk.y, p.x, p.y) > 16) return; // ต้องอยู่ในลานเดียวกันและอยู่ในระยะ
    // กันส่งรัว: คนเดียวตีได้ไม่เกิน 6 ครั้ง/วินาที
    const now = performance.now(), last = (this.hitRate || (this.hitRate = {}))[s.from] || 0;
    if (now - last < 160) return;
    this.hitRate[s.from] = now;
    let dmg = U.clamp(Math.round(+s.dmg || 0), 0, Math.max(1, Math.round(p.d.maxHp * 0.6)));
    this.lastHitBy = { id: s.from, name: s.fn || atk.name, at: G.time };
    p.sitting = false;
    const m = G.mobs.find(x => x.isPlayer && x.ref === atk);
    if (m && typeof Runes !== 'undefined') dmg = Runes.onHurt(m, dmg); // รูนป้องกัน (โล่ดูดซับ) ใช้ใน PvP ด้วย
    damagePlayer(dmg, s.crit ? '#ffe040' : '#ff5050');
    if (m && !p.dead && typeof Runes !== 'undefined') Runes.onAttacked(m, true); // รูนสวนกลับ → ดาเมจส่งกลับผ่าน sendHit
    // โจมตีกลับอัตโนมัติ (ตามตั้งค่า) ใส่คนที่ตีเรา
    if (m && !p.dead && p.options.autoCounter !== false && !(p.target && !p.target.dead) && !p.path.length && !p.cast) { p.target = m; p.repathAt = 0; }
  },
  // เราล้มในลานประลอง (เรียกจาก playerDie)
  onPvpDeath() {
    const p = G.player, k = this.lastHitBy && G.time - this.lastHitBy.at < 10 ? this.lastHitBy : null; // เครดิตเฉพาะคนที่ตีภายใน 10 วิ
    p.pvp = p.pvp || { k: 0, d: 0 }; p.pvp.d++;
    UI.msg(k ? L(`⚔ ${k.name} ล้มคุณในลานประลอง`, `⚔ ${k.name} defeated you in the Arena.`) : L('คุณล้มลงในลานประลอง', 'You have fallen in the Arena.'), 'err');
    if (this.mapChannel && k) this.mapChannel.send({ type: 'broadcast', event: 'kill', payload: { killer: k.id, kn: k.name, victim: this.user.id, vn: p.name } });
    this.lastHitBy = null;
    saveGame(true);
  },
  onKill(s) {
    if (!s || !G.map.def.pvp) return;
    const p = G.player;
    if (this.user && s.killer === this.user.id) {
      p.pvp = p.pvp || { k: 0, d: 0 }; p.pvp.k++;
      UI.announce(L(`⚔ คุณล้ม ${s.vn} ได้!`, `⚔ You defeated ${s.vn}!`)); Sound.play('mvp'); saveGame(true);
    } else UI.msg(L(`⚔ ${s.kn} ล้ม ${s.vn}`, `⚔ ${s.kn} defeated ${s.vn}`), 'sys');
  },

  // ---------------- ทุกเฟรม ----------------
  update(dt) {
    if (!this.online || !G.started) return;
    if (G.player.atkAnim > this.lastAtkAnim + 0.5) this.atkSeq++;
    this.lastAtkAnim = G.player.atkAnim;
    this.sendPos(false);
    this.syncPvpTargets();
    const now = performance.now();
    for (const [id, o] of this.others) {
      if (now - o.seen > 8000) { this.others.delete(id); continue; }
      const k = Math.min(1, dt * 10);
      const dx = o.tx - o.x, dy = o.ty - o.y;
      o.x += dx * k; o.y += dy * k;
      if (Math.hypot(dx, dy) > 0.05) { o.facing = dx > 0 ? 1 : -1; o.dir = dirFromVec(dx, dy); }
      o.moving = o.moving || Math.hypot(dx, dy) > 0.05;
      o.atkAnim = Math.max(0, o.atkAnim - dt * 4);
      if (o.speech && o.speech.until < G.time) o.speech = null;
    }
  },
};
