'use strict';
// ============================================================
//  ผู้เล่นออนไลน์ + เพื่อน + "ไปหา" (รอบ 36 — เจ้าของ: "สร้างระบบผู้เล่นออนไลน์ เพื่อน การเดินไปหาผู้เล่นนั้นไว้ด้วย")
//  • ผู้เล่นออนไลน์: ช่อง Supabase Realtime presence "online" ช่องเดียวทั้งเกม (ไม่มีตาราง)
//      payload { id, name, job, baseLv, map, x, y, party, hide, at } — ส่งใหม่เมื่อเปลี่ยนแผนที่ทันที / ทุก ~5 วิ ถ้าเปลี่ยน / ทุก 30 วิ กันหลุด
//      ตั้งค่า "ซ่อนตำแหน่งจากคนที่ไม่ใช่เพื่อน" (p.options.hidePos อยู่ในเซฟ ค่าเริ่มต้นปิด) → presence ไม่มี map/x/y
//      แล้วส่งตำแหน่งให้เพื่อนที่ออนไลน์ผ่าน broadcast 'loc' { to:[id...] } แทน
//      (ระดับไคลเอนต์ — ช่อง broadcast ทุกคนฟังได้ ซ่อนจริงต้องใช้ Realtime Authorization/private channel บนเซิร์ฟเวอร์)
//  • เพื่อน: ตาราง friends + RPC friend_request/accept/remove/list (supabase/migrations/20261012010000_friends.sql)
//      เซิร์ฟเวอร์ยังไม่ได้รัน migration (ไม่มีฟังก์ชัน) → server = false → ซ่อนแท็บเพื่อน + ข้อความ "ระบบเพื่อนยังไม่เปิดบนเซิร์ฟเวอร์"
//      (แนวเดียวกับ SessionGuard.claimServer) • อีกฝ่ายรู้ทันทีผ่าน broadcast 'fr' { to } แล้วโหลดรายชื่อใหม่ (นอกนั้นโหลดทุก 30 วิ)
//  • ไปหา: Nav เป้าหมายชนิด 'player' (js/nav.js) — ข้ามแผนที่ผ่านประตู แล้วเดินตามตำแหน่งล่าสุด หยุดเมื่อห่าง ≤ 2 ช่อง
//      ตำแหน่ง: แผนที่เดียวกัน = ตำแหน่งสดจากช่องแผนที่ (Online.others) • ต่างแผนที่ = presence / 'loc'
//      ปลายทางเป็นลานประลอง (PvP) ต้องยืนยันก่อน • ตำแหน่งถูกซ่อน = ไปหาไม่ได้
//  ทางเข้า: ปุ่มเมนู "เพื่อน/ออนไลน์" (คอม + แผ่นเมนูมือถือ) • การ์ดผู้เล่น (แตะตัวผู้เล่นอื่น) • /who • /friend ชื่อ
// ============================================================

const SOCIAL_CFG = { tick: 500, track: 5000, keep: 30000, list: 30000, stale: 600000, locFresh: 20000, lost: 12000, near: 2, rows: 150 };
const Social = {
  ch: null, joined: false, uiReady: false, wasOpen: false,
  players: new Map(),   // id → { id, name, job, baseLv, map, x, y, party, hide, at } (รวมตัวเอง)
  locs: new Map(),      // id → { map, x, y, at } ตำแหน่งที่เพื่อน (ที่ซ่อนตำแหน่ง) ส่งให้เรา
  friends: new Map(),   // id → { id, name, status: 'pending'|'accepted', dir: 'in'|'out'|'both' }
  server: null,         // ระบบเพื่อนบนเซิร์ฟเวอร์: null = ยังไม่รู้ • true = มี • false = ยังไม่ได้รัน migration
  seenIds: null, toldIn: new Set(), lastTrack: 0, trackKey: '', trackMap: '', lastList: 0, listing: false, lostAt: 0,
  tab: 'online', q: '', mapF: 'all', addName: '', addMsg: '', addBusy: false, renderKey: '',

  boot() {
    if (typeof ICONS !== 'undefined' && !ICONS.friends) ICONS.friends = '<circle cx="8.5" cy="8" r="3"/><path d="M3 19.5c.5-3.4 2.7-5.3 5.5-5.3s5 1.9 5.5 5.3"/><circle cx="16.5" cy="9" r="2.4"/><path d="M15.2 14.3c2.6-.3 4.6 1.3 5.3 4.4"/><path d="M18.5 3.5v4M16.5 5.5h4"/>';
    if (typeof MENU_ICONS !== 'undefined') MENU_ICONS['w-social'] = 'friends';
    setInterval(() => { try { this.tick(); } catch (e) { console.warn('social tick', e); } }, SOCIAL_CFG.tick);
  },
  me() { return Online.user ? Online.user.id : null; },
  clean(s, n = 24) { return String(s || '').replace(/[\u0000-\u001f<>"]/g, '').trim().slice(0, n); },
  isFriend(id) { const f = this.friends.get(id); return !!(f && f.status === 'accepted'); },
  mapName(id) { return MAP_DEFS[id] ? MAP_DEFS[id].name : ''; },

  // ---------------- ทุก 0.5 วิ ----------------
  tick() {
    if (typeof G === 'undefined' || !G.started || !G.player || !G.map) return;
    if (!this.uiReady) this.setupUi();
    if (!Online.online || !Online.sb) { if (this.ch) this.leave(); if (this.isOpen()) this.refresh(); return; }
    this.join();
    this.track(false);
    const now = Date.now();
    if (this.server !== false && now - this.lastList > SOCIAL_CFG.list) this.loadFriends();
    for (const [id, l] of this.locs) if (now - l.at > SOCIAL_CFG.locFresh * 3) this.locs.delete(id);
    this.follow();
    if (this.isOpen()) this.refresh();
  },

  // ---------------- presence ----------------
  join() {
    if (this.ch) return;
    const ch = Online.sb.channel('online', { config: { presence: { key: this.me() }, broadcast: { self: false } } });
    ch.on('presence', { event: 'sync' }, () => this.sync());
    ch.on('presence', { event: 'leave' }, () => this.sync());
    ch.on('broadcast', { event: 'loc' }, ({ payload }) => this.onLoc(payload));
    ch.on('broadcast', { event: 'fr' }, ({ payload }) => { if (payload && payload.to === this.me()) this.loadFriends(); });
    ch.subscribe(st => {
      if (ch !== this.ch) return;
      if (st === 'SUBSCRIBED') { this.joined = true; this.track(true); }
    });
    this.ch = ch; this.joined = false; this.seenIds = null;
    this.loadFriends();
  },
  leave() {
    if (this.ch && Online.sb) { try { Online.sb.removeChannel(this.ch); } catch (e) { /* ปิดแล้ว */ } }
    this.ch = null; this.joined = false; this.players.clear(); this.seenIds = null; this.trackKey = ''; this.trackMap = '';
  },
  hidden() { return !!(G.player && G.player.options && G.player.options.hidePos); },
  payload() {
    const p = G.player, hide = this.hidden();
    return { id: this.me(), name: p.name, job: p.job, baseLv: p.baseLv, map: hide ? null : G.map.id,
      x: hide ? null : Math.round(p.x), y: hide ? null : Math.round(p.y), party: typeof Party !== 'undefined' && Party.party ? this.clean(Party.party.name) : '', hide: hide ? 1 : 0 };
  },
  track(force) {
    if (!this.ch || !this.joined) return;
    const pl = this.payload(), key = JSON.stringify(pl), now = Date.now();
    const mapChanged = G.map.id !== this.trackMap;
    if (!force && !mapChanged && !(key !== this.trackKey && now - this.lastTrack >= SOCIAL_CFG.track) && now - this.lastTrack < SOCIAL_CFG.keep) return;
    this.trackKey = key; this.trackMap = G.map.id; this.lastTrack = now;
    try { this.ch.track(Object.assign(pl, { at: now })); } catch (e) { /* ช่องปิด */ }
    if (pl.hide) { // ซ่อนตำแหน่ง: ส่งให้เฉพาะเพื่อนที่ออนไลน์
      const to = [...this.friends.values()].filter(f => f.status === 'accepted' && this.players.has(f.id)).map(f => f.id);
      if (to.length) this.ch.send({ type: 'broadcast', event: 'loc', payload: { id: this.me(), to, map: G.map.id, x: Math.round(G.player.x), y: Math.round(G.player.y) } });
    }
    this.sync();
  },
  sync() {
    if (!this.ch) return;
    let st = {}; try { st = this.ch.presenceState() || {}; } catch (e) { /* ยังไม่พร้อม */ }
    const now = Date.now(), next = new Map();
    for (const key in st) {
      const metas = st[key], m = Array.isArray(metas) && metas.length ? metas[metas.length - 1] : null;
      if (!m || typeof m !== 'object') continue;
      if (m.at && now - m.at > SOCIAL_CFG.stale && key !== this.me()) continue; // แท็บที่ปิดไปโดยไม่ได้บอกลา
      const map = MAP_DEFS[m.map] ? m.map : null;
      next.set(key, { id: key, name: this.clean(m.name, 16) || '?', job: JOBS[m.job] ? m.job : 'novice', baseLv: Math.max(1, Math.floor(+m.baseLv) || 1),
        map, x: map && Number.isFinite(+m.x) ? +m.x : null, y: map && Number.isFinite(+m.y) ? +m.y : null, party: this.clean(m.party), hide: !!m.hide, at: +m.at || now });
    }
    // เพื่อนเพิ่งออนไลน์ → แจ้ง (รอบแรกหลังเข้าช่องไม่แจ้ง — คนที่ออนไลน์อยู่ก่อนแล้ว)
    if (this.seenIds) for (const [id, pl] of next) {
      if (!this.seenIds.has(id) && id !== this.me() && this.isFriend(id)) {
        const t = L(`เพื่อน ${pl.name} ออนไลน์แล้ว${pl.map ? ` · ${this.mapName(pl.map)}` : ''}`, `Your friend ${pl.name} is online${pl.map ? ` · ${this.mapName(pl.map)}` : ''}`);
        UI.msg(t, 'party'); this.toast(t);
      }
    }
    if (this.joined && next.has(this.me())) this.seenIds = new Set(next.keys());
    this.players = next;
  },
  onLoc(v) {
    if (!v || !v.id || !Array.isArray(v.to) || !v.to.includes(this.me()) || !this.isFriend(v.id) || !MAP_DEFS[v.map]) return;
    this.locs.set(v.id, { map: v.map, x: +v.x || 0, y: +v.y || 0, at: Date.now() });
  },
  // ตำแหน่งล่าสุดที่รู้ของผู้เล่น id → { map, x, y } หรือ null (ไม่ออนไลน์ / ซ่อนตำแหน่ง)
  pos(id) {
    const live = Online.others.get(id), pl = this.players.get(id), loc = this.locs.get(id);
    const sameMap = (pl && pl.map === G.map.id) || (loc && loc.map === G.map.id && Date.now() - loc.at < SOCIAL_CFG.locFresh);
    if (live && sameMap) return { map: G.map.id, x: live.x, y: live.y, live: true };
    if (pl && pl.map) return { map: pl.map, x: pl.x, y: pl.y };
    if (loc && Date.now() - loc.at < SOCIAL_CFG.locFresh) return { map: loc.map, x: loc.x, y: loc.y };
    return null;
  },
  nameOf(id) { const pl = this.players.get(id), f = this.friends.get(id), o = Online.others.get(id); return (pl && pl.name) || (f && f.name) || (o && o.name) || '?'; },

  // ---------------- ไปหา ----------------
  async goTo(id) {
    if (!id || id === this.me()) return;
    const name = this.nameOf(id), at = this.pos(id);
    if (!this.players.has(id) && !Online.others.has(id)) { UI.msg(L(`${name} ไม่ได้ออนไลน์อยู่`, `${name} is not online`), 'err'); return; }
    if (!at || !MAP_DEFS[at.map]) { UI.msg(L(`${name} ซ่อนตำแหน่งไว้ — ไปหาได้เฉพาะเพื่อน`, `${name} hides their location — only friends can go to them`), 'err'); return; }
    if (Nav.route(G.map.id, at.map) === null) { UI.msg(L(`ไม่มีทางเดินไป ${this.mapName(at.map)} ที่ ${name} อยู่`, `No route to ${this.mapName(at.map)} where ${name} is`), 'err'); return; }
    if (MAP_DEFS[at.map].pvp && at.map !== G.map.id
      && !(await UI.confirm(L(`${name} อยู่ใน ${this.mapName(at.map)} (PvP) — เข้าไปแล้วผู้เล่นอื่นโจมตีคุณได้ ไปต่อไหม?`, `${name} is in ${this.mapName(at.map)} (PvP) — other players can attack you there. Go anyway?`)))) return;
    if (at.map === G.map.id && U.dist(G.player.x, G.player.y, at.x, at.y) <= SOCIAL_CFG.near) { UI.msg(L(`คุณอยู่ข้าง ${name} แล้ว`, `You are already next to ${name}`), 'info'); return; }
    this.lostAt = 0;
    UI.close('w-social');
    Nav.goTo({ kind: 'player', uid: id, name, map: at.map, x: Math.floor(at.x), y: Math.floor(at.y) });
  },
  // นำทางอยู่: เลื่อนเป้าตามตำแหน่งล่าสุด (ย้ายแผนที่ก็ตามไป) • หายไปนาน = หยุด
  follow() {
    const t = typeof Nav !== 'undefined' && Nav.target;
    if (!t || t.kind !== 'player') return;
    const at = this.pos(t.uid);
    if (!at) {
      if (!this.lostAt) this.lostAt = Date.now();
      if (Date.now() - this.lostAt > SOCIAL_CFG.lost) { Nav.cancel(true); UI.msg(L(`หาตำแหน่ง ${t.name} ไม่เจอแล้ว (ออฟไลน์/ซ่อนตำแหน่ง) — หยุดนำทาง`, `Lost track of ${t.name} (offline or hidden) — navigation stopped`), 'info'); }
      return;
    }
    this.lostAt = 0;
    if (at.map !== t.map) { t.map = at.map; Nav.repathAt = 0; G.player.path = []; }
    t.x = Math.floor(at.x); t.y = Math.floor(at.y);
  },

  // ---------------- เพื่อน (RPC) ----------------
  missing(err) { return !!err && (['PGRST202', 'PGRST205', '42883', '42P01'].includes(err.code) || /could not find the function|does not exist|schema cache/i.test(err.message || '')); },
  async call(fn, args) {
    if (!Online.online || !Online.sb) return { data: null, error: { message: 'offline' } };
    try {
      const r = await Online.sb.rpc(fn, args || {});
      if (this.missing(r.error)) { this.server = false; this.friends.clear(); }
      return r;
    } catch (e) { return { data: null, error: { message: String(e && e.message || e) } }; }
  },
  async loadFriends() {
    if (this.listing || !Online.online) return;
    this.listing = true; this.lastList = Date.now();
    try {
      const { data, error } = await this.call('friend_list');
      if (error) return; // ไม่มีฟังก์ชัน = server false (ตั้งใน call) • เน็ตสะดุด = ลองรอบหน้า
      this.server = true;
      const next = new Map();
      for (const r of Array.isArray(data) ? data : []) {
        if (!r || !r.id || r.id === this.me()) continue;
        next.set(r.id, { id: r.id, name: this.clean(r.name, 16) || (this.players.get(r.id) || {}).name || '?', status: r.status === 'accepted' ? 'accepted' : 'pending', dir: r.status === 'accepted' ? 'both' : r.dir === 'in' ? 'in' : 'out' });
      }
      for (const f of next.values()) if (f.dir === 'in' && !this.toldIn.has(f.id)) {
        this.toldIn.add(f.id);
        const t = L(`${f.name} ขอเป็นเพื่อนกับคุณ — เปิด "เพื่อน/ออนไลน์" เพื่อตอบรับ`, `${f.name} sent you a friend request — open Friends to respond`);
        UI.msg(t, 'party'); this.toast(t);
      }
      this.friends = next;
    } finally { this.listing = false; this.renderKey = ''; }
  },
  nudge(id) { if (this.ch && id) { try { this.ch.send({ type: 'broadcast', event: 'fr', payload: { to: id, from: this.me() } }); } catch (e) { /* ช่องปิด */ } } },
  async request(name) {
    name = this.clean(name, 16);
    if (!name) { this.addMsg = L('พิมพ์ชื่อตัวละครที่ต้องการเพิ่มเป็นเพื่อน', 'Type the character name to add'); this.refresh(true); return false; }
    if (!Online.online) { UI.msg(L('ระบบเพื่อนใช้ได้เมื่อออนไลน์', 'Friends need an online connection'), 'err'); return false; }
    if (this.server === false) { UI.msg(L('ระบบเพื่อนยังไม่เปิดบนเซิร์ฟเวอร์', 'Friends are not enabled on the server yet'), 'err'); return false; }
    if (name.toLowerCase() === String(G.player.name).toLowerCase()) { this.addMsg = L('เพิ่มตัวเองเป็นเพื่อนไม่ได้', "You can't add yourself"); this.refresh(true); return false; }
    this.addBusy = true; this.addMsg = L('กำลังส่งคำขอ…', 'Sending…'); this.refresh(true);
    const { data, error } = await this.call('friend_request', { n: name });
    this.addBusy = false;
    let res = false;
    if (error) this.addMsg = this.server === false ? L('ระบบเพื่อนยังไม่เปิดบนเซิร์ฟเวอร์', 'Friends are not enabled on the server yet') : L(`ส่งคำขอไม่สำเร็จ: ${Online.errText(error)}`, `Request failed: ${Online.errText(error)}`);
    else if (!data || !data.ok) {
      const why = data && data.why;
      this.addMsg = why === 'not_found' ? L(`ไม่พบตัวละครชื่อ ${name}`, `No character named ${name}`)
        : why === 'self' ? L('ชื่อนี้เป็นตัวละครในบัญชีของคุณเอง', 'That character is on your own account')
        : why === 'exists' ? (data.status === 'accepted' ? L(`${name} เป็นเพื่อนกับคุณอยู่แล้ว`, `${name} is already your friend`) : L(`มีคำขอค้างอยู่กับ ${name} แล้ว`, `A request with ${name} is already pending`))
        : why === 'limit' ? L('คำขอ/รายชื่อเพื่อนเต็มแล้ว', 'Friend list or pending requests are full')
        : L('ชื่อไม่ถูกต้อง', 'Invalid name');
    } else {
      res = true;
      this.addMsg = data.status === 'accepted' ? L(`★ ${data.name || name} เป็นเพื่อนกับคุณแล้ว`, `★ ${data.name || name} is now your friend`) : L(`ส่งคำขอถึง ${data.name || name} แล้ว — รออีกฝ่ายตอบรับ`, `Request sent to ${data.name || name} — waiting for them to accept`);
      UI.msg(this.addMsg, 'party');
      this.nudge(data.id);
      await this.loadFriends();
    }
    this.refresh(true);
    return res;
  },
  async accept(id) {
    const f = this.friends.get(id); if (!f) return;
    const { data, error } = await this.call('friend_accept', { id });
    if (error || !data) { UI.msg(L(`ตอบรับไม่สำเร็จ${error ? ': ' + Online.errText(error) : ' (คำขอถูกยกเลิกไปแล้ว)'}`, `Could not accept${error ? ': ' + Online.errText(error) : ' (request was withdrawn)'}`), 'err'); }
    else { UI.msg(L(`★ ${f.name} เป็นเพื่อนกับคุณแล้ว`, `★ ${f.name} is now your friend`), 'party'); Sound.play('buff'); this.nudge(id); }
    await this.loadFriends(); this.refresh(true);
  },
  async remove(id, kind) {
    const f = this.friends.get(id); if (!f) return;
    if (kind === 'unfriend' && !(await UI.confirm(L(`ลบ ${f.name} ออกจากรายชื่อเพื่อน?`, `Remove ${f.name} from your friends?`)))) return;
    const { error } = await this.call('friend_remove', { id });
    if (error) UI.msg(L(`ทำรายการไม่สำเร็จ: ${Online.errText(error)}`, `Failed: ${Online.errText(error)}`), 'err');
    else UI.msg(kind === 'decline' ? L(`ปฏิเสธคำขอของ ${f.name}`, `Declined ${f.name}'s request`) : kind === 'cancel' ? L(`ยกเลิกคำขอถึง ${f.name}`, `Cancelled your request to ${f.name}`) : L(`ลบ ${f.name} ออกจากเพื่อนแล้ว`, `${f.name} was removed from your friends`), 'info');
    this.nudge(id);
    await this.loadFriends(); this.refresh(true);
  },
  invite(id) { if (typeof Party !== 'undefined') Party.sendInvite({ id, name: this.nameOf(id) }); },
  setHide(on) {
    const p = G.player; p.options.hidePos = !!on;
    saveGame(true);
    this.track(true);
    UI.msg(on ? L('ซ่อนตำแหน่งจากคนที่ไม่ใช่เพื่อนแล้ว', 'Your location is now hidden from non-friends') : L('ผู้เล่นทุกคนเห็นแผนที่ที่คุณอยู่', 'Everyone can see which map you are on'), 'info');
    this.refresh(true);
  },
  command(arg) {
    arg = this.clean(arg, 16);
    if (arg) { this.show('friends'); this.request(arg); } else this.show('online');
  },

  // ---------------- ปุ่มบนการ์ดผู้เล่น (js/unitcard.js) ----------------
  cardButtons(o, close) {
    const out = [], id = o && o.id;
    if (!id || !Online.online || id === this.me()) return out;
    const f = this.friends.get(id);
    if (this.server && !f) out.push(h('button', { type: 'button', class: 'btn small', 'data-act': 'friend', onclick: () => { close(); this.request(o.name); } }, ivIconEl('friends'), L('เพิ่มเพื่อน', 'Add friend')));
    out.push(h('button', { type: 'button', class: 'btn small', 'data-act': 'goto', onclick: () => { close(); this.goTo(id); } }, ivIconEl('nav'), L('ไปหา', 'Go to')));
    return out;
  },

  // ---------------- หน้าต่าง ----------------
  setupUi() {
    const w = $('#w-social'), menu = $('#menubar');
    if (!w || !menu || !menu.children.length) return;
    this.uiReady = true;
    const t = $('.win-title span', w);
    if (t) t.textContent = L('ผู้เล่นออนไลน์ · เพื่อน', 'Online Players · Friends');
    if (!$('[data-win="w-social"]', menu)) {
      const b = h('button', { title: L('เพื่อน / ผู้เล่นออนไลน์ (/who)', 'Friends / Online players (/who)'), 'data-win': 'w-social', onclick: () => { UI.toggle('w-social'); if (Pad.enabled()) UI.setFold(menu, true); } });
      b.innerHTML = `${ivIcon('friends')}<span>${L('เพื่อน/ออนไลน์', 'Friends')}</span><small>/who</small>`;
      b.dataset.ivi = 'friends';
      const after = $('[data-win="w-party"]', menu);
      if (after) after.after(b); else menu.append(b);
    }
    new MutationObserver(() => {
      const open = !w.classList.contains('hidden');
      if (open && !this.wasOpen) { this.refresh(true); if (Online.online && this.server !== false) this.loadFriends(); }
      this.wasOpen = open;
    }).observe(w, { attributes: true, attributeFilter: ['class'] });
  },
  isOpen() { const w = $('#w-social'); return !!w && !w.classList.contains('hidden'); },
  show(tab) {
    if (tab) this.tab = tab;
    if (!this.isOpen()) UI.open('w-social');
    this.refresh(true);
  },
  refresh(force) {
    if (!this.isOpen()) return;
    const key = JSON.stringify([Online.online, this.server, this.tab, this.q, this.mapF, this.addMsg, this.addBusy, this.hidden(), G.map.id, LANG,
      [...this.players.values()].map(p => [p.id, p.name, p.job, p.baseLv, p.map, p.x, p.y, p.hide]), [...this.friends.values()].map(f => [f.id, f.name, f.status, f.dir]),
      [...this.locs.keys()], typeof Party !== 'undefined' && Party.party ? [...Party.party.members.keys()] : 0]);
    if (!force && key === this.renderKey) return;
    this.renderKey = key;
    this.render();
  },
  render() {
    const w = $('#w-social');
    if (!w || w.classList.contains('hidden') || !G.player) return;
    const body = $('.win-body', w), a = document.activeElement;
    const keep = a && body.contains(a) && a.dataset.focus ? { key: a.dataset.focus, value: a.value, s: a.selectionStart } : null;
    const scroll = body.scrollTop;
    body.innerHTML = '';
    if (!Online.online) body.append(this.viewOffline());
    else {
      if (this.server === false) this.tab = 'online';
      if (this.server !== false) body.append(this.tabs());
      body.append(this.tab === 'friends' ? this.viewFriends() : this.viewOnline());
    }
    if (keep) { const el = $(`[data-focus="${keep.key}"]`, body); if (el && !el.disabled) { el.value = keep.value; el.focus(); try { if (keep.s != null) el.setSelectionRange(keep.s, keep.s); } catch (e) { /* ไม่รองรับ */ } } }
    body.scrollTop = scroll;
  },
  viewOffline() {
    return h('div', { class: 'so-empty' }, h('b', {}, L('ต้องออนไลน์', 'Online Only')),
      h('p', {}, L('รายชื่อผู้เล่นออนไลน์และระบบเพื่อนใช้ได้เมื่อล็อกอินบัญชีออนไลน์และเชื่อมต่อเซิร์ฟเวอร์', 'Online players and friends need an online account connected to the server.')));
  },
  tabs() {
    const inN = [...this.friends.values()].filter(f => f.dir === 'in').length;
    const tb = (k, label, badge) => h('button', { type: 'button', role: 'tab', class: 'so-tab' + (this.tab === k ? ' on' : ''), 'aria-selected': this.tab === k ? 'true' : 'false', 'data-tab': k,
      onclick: () => { if (this.tab !== k) { this.tab = k; Sound.play('click'); this.refresh(true); } } }, label, badge ? h('i', { class: 'so-badge' }, badge) : null);
    return h('div', { class: 'so-tabs', role: 'tablist' },
      tb('online', L(`ออนไลน์ ${this.players.size}`, `Online ${this.players.size}`)),
      tb('friends', L('เพื่อน', 'Friends'), this.server === null ? '' : inN ? String(inN) : ''));
  },
  btn(label, act, onclick, extra = {}) { return h('button', Object.assign({ type: 'button', class: 'btn small' + (extra.primary ? ' primary' : ''), 'data-act': act, onclick, disabled: extra.disabled ? 'disabled' : false }), label); },
  line(pl) { // "Class · Lv · แผนที่"
    const J = JOBS[pl.job] || JOBS.novice;
    return `${J.name} · Lv ${pl.baseLv} · ${pl.map ? this.mapName(pl.map) : L('ซ่อนตำแหน่ง', 'Location hidden')}`;
  },
  viewOnline() {
    const me = this.me(), all = [...this.players.values()];
    const wrap = h('div', { class: 'so-view' });
    if (this.server === false) wrap.append(h('div', { class: 'so-note', 'data-note': 'no-friends' }, L('ระบบเพื่อนยังไม่เปิดบนเซิร์ฟเวอร์ — ดูผู้เล่นออนไลน์และ "ไปหา" ได้ตามปกติ', 'Friends are not enabled on the server yet — you can still see online players and go to them')));
    // ตัวกรอง: ค้นชื่อ + แผนที่
    const maps = {}; for (const pl of all) if (pl.map) maps[pl.map] = (maps[pl.map] || 0) + 1;
    if (this.mapF !== 'all' && this.mapF !== 'here' && !maps[this.mapF]) this.mapF = 'all';
    const q = h('input', { type: 'search', class: 'so-q', 'data-focus': 'q', placeholder: L('ค้นชื่อผู้เล่น', 'Search players'), 'aria-label': L('ค้นชื่อผู้เล่น', 'Search players'), maxlength: 16, value: this.q,
      oninput: e => { this.q = e.target.value; this.refresh(); } });
    const sel = h('select', { class: 'so-map', 'aria-label': L('กรองตามแผนที่', 'Filter by map'), onchange: e => { this.mapF = e.target.value; this.refresh(true); } },
      h('option', { value: 'all' }, L('ทุกแผนที่', 'All maps')), h('option', { value: 'here' }, L('แผนที่นี้', 'This map')),
      ...Object.keys(maps).sort((x, y) => maps[y] - maps[x]).map(id => h('option', { value: id }, `${this.mapName(id)} (${maps[id]})`)));
    sel.value = this.mapF;
    wrap.append(h('div', { class: 'so-filters' }, q, sel));
    const qs = this.q.trim().toLowerCase();
    const list = all.filter(pl => (!qs || pl.name.toLowerCase().includes(qs)) && (this.mapF === 'all' || (this.mapF === 'here' ? pl.map === G.map.id : pl.map === this.mapF)))
      .sort((x, y) => (y.id === me) - (x.id === me) || this.isFriend(y.id) - this.isFriend(x.id) || (y.map === G.map.id) - (x.map === G.map.id) || x.name.localeCompare(y.name));
    wrap.append(h('div', { class: 'so-sec' }, h('span', {}, L('ผู้เล่นออนไลน์', 'Online players')),
      h('small', { class: 'so-count' }, list.length === all.length ? L(`${all.length} คน`, `${all.length}`) : L(`แสดง ${list.length} จาก ${all.length} คน`, `${list.length} of ${all.length}`))));
    const box = h('div', { class: 'so-list' });
    if (!this.joined && !all.length) box.append(h('div', { class: 'so-none' }, L('กำลังเชื่อมต่อ…', 'Connecting…')));
    else if (!list.length) box.append(h('div', { class: 'so-none' }, L('ไม่พบผู้เล่นตามที่ค้น', 'No players match')));
    for (const pl of list.slice(0, SOCIAL_CFG.rows)) box.append(this.playerRow(pl));
    if (list.length > SOCIAL_CFG.rows) box.append(h('div', { class: 'so-none' }, L(`และอีก ${list.length - SOCIAL_CFG.rows} คน — พิมพ์ค้นชื่อเพื่อหา`, `and ${list.length - SOCIAL_CFG.rows} more — search by name`)));
    wrap.append(box, this.privacy());
    return wrap;
  },
  playerRow(pl) {
    const me = pl.id === this.me(), f = this.friends.get(pl.id), fr = this.isFriend(pl.id);
    const btns = [];
    if (!me) {
      const at = this.pos(pl.id);
      btns.push(this.btn(L('ไปหา', 'Go to'), 'goto', () => this.goTo(pl.id), { disabled: !at, primary: true }));
      if (this.server === true) {
        if (!f) btns.push(this.btn(L('+ เพื่อน', '+ Friend'), 'add', () => this.request(pl.name)));
        else if (f.dir === 'in') btns.push(this.btn(L('ตอบรับ', 'Accept'), 'accept', () => this.accept(pl.id)));
        else if (f.dir === 'out') btns.push(this.btn(L('ส่งคำขอแล้ว', 'Requested'), 'sent', null, { disabled: true }));
      }
    }
    const sub = !pl.map && fr && this.pos(pl.id) ? this.line(Object.assign({}, pl, { map: this.pos(pl.id).map })) : this.line(pl);
    return h('div', { class: 'so-row' + (me ? ' me' : '') + (fr ? ' fr' : ''), 'data-id': pl.id, 'data-name': pl.name },
      h('span', { class: 'so-main' }, h('b', {}, h('i', { class: 'so-dot', 'aria-hidden': 'true' }), pl.name, me ? h('em', { class: 'so-tag' }, L('คุณ', 'You')) : fr ? h('em', { class: 'so-tag fr' }, L('เพื่อน', 'Friend')) : null,
        pl.party ? h('em', { class: 'so-tag pt' }, pl.party) : null), h('small', {}, sub)),
      btns.length ? h('span', { class: 'so-btns' }, btns) : null);
  },
  privacy() {
    const on = this.hidden();
    return h('div', { class: 'so-priv' },
      h('button', { type: 'button', class: 'btn small so-switch' + (on ? ' on' : ''), role: 'switch', 'aria-checked': on ? 'true' : 'false', 'data-act': 'hide', onclick: () => this.setHide(!on) },
        L(`ซ่อนตำแหน่งจากคนที่ไม่ใช่เพื่อน: ${on ? 'เปิด' : 'ปิด'}`, `Hide my location from non-friends: ${on ? 'On' : 'Off'}`)),
      h('small', {}, on ? L('คนที่ไม่ใช่เพื่อนเห็นแค่ชื่อ Class และ Lv ของคุณ', 'Non-friends only see your name, Class and Lv') : L('ทุกคนเห็นแผนที่ที่คุณอยู่ และกด "ไปหา" คุณได้', 'Everyone can see your map and go to you')));
  },
  viewFriends() {
    const wrap = h('div', { class: 'so-view' });
    const inp = h('input', { type: 'text', class: 'so-add-in', 'data-focus': 'add', maxlength: 16, autocomplete: 'off', spellcheck: 'false', placeholder: L('ชื่อตัวละคร', 'Character name'), 'aria-label': L('ชื่อตัวละครที่จะเพิ่มเป็นเพื่อน', 'Character name to add'),
      value: this.addName, oninput: e => { this.addName = e.target.value; }, onkeydown: e => { if (e.key === 'Enter') send(); } });
    const send = () => { if (!this.addBusy) this.request(this.addName).then(ok => { if (ok) { this.addName = ''; this.refresh(true); } }); };
    wrap.append(h('div', { class: 'so-add' }, inp, h('button', { type: 'button', class: 'btn small primary', 'data-act': 'request', disabled: this.addBusy ? 'disabled' : false, onclick: send }, L('ส่งคำขอ', 'Send request'))));
    if (this.addMsg) wrap.append(h('div', { class: 'so-msg' }, this.addMsg));
    if (this.server === null) { wrap.append(h('div', { class: 'so-none' }, L('กำลังโหลดรายชื่อเพื่อน…', 'Loading friends…'))); return wrap; }
    const all = [...this.friends.values()];
    const inc = all.filter(f => f.dir === 'in'), out = all.filter(f => f.dir === 'out'), fr = all.filter(f => f.status === 'accepted')
      .sort((x, y) => this.players.has(y.id) - this.players.has(x.id) || x.name.localeCompare(y.name));
    const sec = (title, n, rows) => { wrap.append(h('div', { class: 'so-sec' }, h('span', {}, title), h('small', {}, String(n)))); const box = h('div', { class: 'so-list' }, rows); wrap.append(box); };
    if (inc.length) sec(L('คำขอเป็นเพื่อนที่ได้รับ', 'Friend requests'), inc.length, inc.map(f => this.friendRow(f, [
      this.btn(L('ตอบรับ', 'Accept'), 'accept', () => this.accept(f.id), { primary: true }), this.btn(L('ปฏิเสธ', 'Decline'), 'decline', () => this.remove(f.id, 'decline'))])));
    const onl = fr.filter(f => this.players.has(f.id)).length;
    sec(L('เพื่อน', 'Friends'), L(`ออนไลน์ ${onl} / ${fr.length}`, `${onl} / ${fr.length} online`), fr.length ? fr.map(f => {
      const online = this.players.has(f.id), inParty = typeof Party !== 'undefined' && Party.has(f.id);
      return this.friendRow(f, [
        this.btn(L('ไปหา', 'Go to'), 'goto', () => this.goTo(f.id), { disabled: !online || !this.pos(f.id), primary: true }),
        this.btn(inParty ? L('อยู่ปาร์ตี้แล้ว', 'In party') : L('เชิญเข้าปาร์ตี้', 'Party invite'), 'party', () => this.invite(f.id), { disabled: !online || inParty }),
        this.btn(L('ลบ', 'Remove'), 'remove', () => this.remove(f.id, 'unfriend'))]);
    }) : [h('div', { class: 'so-none' }, L('ยังไม่มีเพื่อน — พิมพ์ชื่อตัวละครด้านบน หรือกด "+ เพื่อน" ในแท็บออนไลน์', 'No friends yet — type a name above or tap "+ Friend" in the Online tab'))]);
    if (out.length) sec(L('คำขอที่ส่งไป (รอตอบรับ)', 'Sent requests'), out.length, out.map(f => this.friendRow(f, [this.btn(L('ยกเลิก', 'Cancel'), 'cancel', () => this.remove(f.id, 'cancel'))])));
    return wrap;
  },
  friendRow(f, btns) {
    const pl = this.players.get(f.id), at = pl ? this.pos(f.id) : null;
    const sub = !pl ? L('ออฟไลน์', 'Offline') : `${L('ออนไลน์', 'Online')} · ${this.line(Object.assign({}, pl, { map: at ? at.map : null }))}`;
    return h('div', { class: 'so-row' + (pl ? ' on' : ' off'), 'data-id': f.id, 'data-name': f.name },
      h('span', { class: 'so-main' }, h('b', {}, h('i', { class: 'so-dot', 'aria-hidden': 'true' }), pl ? pl.name : f.name), h('small', {}, sub)),
      h('span', { class: 'so-btns' }, btns));
  },
  toast(text) {
    let el = document.getElementById('so-toast');
    if (!el) { el = h('div', { id: 'so-toast', role: 'status', 'aria-live': 'polite' }); document.body.append(el); }
    el.innerHTML = '';
    el.append(h('span', { class: 'so-ti', html: ivIcon('friends') }), h('span', {}, text));
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(this._toastT); this._toastT = setTimeout(() => el.classList.remove('show'), 4500);
  },
};
Social.boot();
