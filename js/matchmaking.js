'use strict';
// ============================================================
//  หาปาร์ตี้อัตโนมัติ (Matchmaking) ไปตีบอสด้วยกัน — เลือกเข้าเองเท่านั้น (ปาร์ตี้แบบสร้าง/เชิญเองใน js/party.js ยังเป็นค่าเริ่มต้น)
//  • คนเดียว: กดเข้าคิว → จับคู่อัตโนมัติ มาก่อนได้ก่อน (ไม่จัดตามบทบาท — เจ้าของเลือก)
//  • มาเป็นทีม (หัวหน้าเลือก): "ไปทั้งทีมนี้" (ค่าเริ่มต้น — ไม่เข้าคิว แค่นำทางทั้งทีมไปบอส)
//      หรือ "เติมที่ว่าง" (เข้าคิวทั้งทีม รับเฉพาะคนเดี่ยวเติมช่องที่ขาด หัวหน้าเดิมยังเป็นหัวหน้า)
//    + สวิตช์ "รับคนนอกเติมทีม" ปิดเมื่อไร = ทีมนี้ไม่มีคนนอกเข้ามาเลย
//  ใช้ Supabase Realtime broadcast ล้วน (ไม่มีตาราง/ไม่แตะเซฟ):
//    ช่อง 'mm' ของทุกคน: hb (สถานะในคิว ทุก 2 วิ) · bye · hello · offer · ans · cancel · go
//  จับคู่: ทุกเครื่องคำนวณแผนเดียวกันจากคิว (MM.plan) — เฉพาะ "คนที่เข้าคิวก่อนสุด" ของกลุ่มเป็นคนส่งคำชวน (หัวหน้าปาร์ตี้ใหม่)
//    คนที่ถูกชวนมีเวลาตอบ 20 วิ · ปฏิเสธ/ไม่ตอบ = หลุดจากคิว แล้วหัวหน้าเติมคนถัดไปจากคิว
//    ครบแล้วตั้งปาร์ตี้ด้วยกลไกเดิมของ js/party.js (Party.create + Party.accept) แล้วนำทางทุกคนไปที่บอส
// ============================================================

const MM = {
  SIZE: Math.min(3, PARTY_MAX), // ขนาดปาร์ตี้ที่จับคู่ (ปรับได้ ไม่เกิน PARTY_MAX)
  // Ancient (World Boss) = งานรุม (js/raid.js): ครบ SIZE คนก็ออกเดินทางได้ แต่ถ้าในคิวมีคนพร้อมมากกว่านั้นรับได้ถึง PARTY_MAX ในปาร์ตี้เดียว
  //   + หลายปาร์ตี้ไปบอสตัวเดียวกันได้อยู่แล้ว (เลือดร่วมทั้งแผนที่) • ทีมเข้าคิว "เติมที่ว่าง" สำหรับ Ancient เติมได้ถึง PARTY_MAX
  cap(t) { return /^wb:/.test(String(t || '')) ? PARTY_MAX : this.SIZE; },
  LV_WIN: 15,                   // ช่วงเลเวล ± Base Lv ของคนที่เข้าคิวก่อน (มาก่อนได้ก่อนภายในช่วงนี้)
  ACCEPT_SEC: 20, HB_MS: 2000, TIMEOUT_MS: 7000,
  GRACE_MS: 2500,               // เพิ่งเข้าคิว/เพิ่งต่อช่อง: รอฟังคิวของคนอื่นครบก่อนค่อยชวน (กันสองคนตั้งตัวเป็นหัวหน้าพร้อมกัน)
  readyAt: Infinity,
  ch: null,
  entries: new Map(), // id → สถานะในคิวของคนอื่น (จาก hb)
  me: null,           // { t, since, g, o } ตัวเราในคิว (null = ไม่ได้อยู่ในคิว)
  offer: null,        // คำชวนที่ได้รับ { from, fromName, oid, t, exp, acc }
  prop: null,         // คำชวนที่เราส่ง (เราเป็นหัวหน้า) { oid, t, mem: Map<id, {name, st, exp}> }
  sel: 'any', mode: 'asis', lastHb: 0, hbKey: '', call: null,
  trail: [],          // เหตุการณ์ล่าสุด 40 รายการ (ไว้ไล่ปัญหา/เทสต์: MM.trail)
  autofill: (() => { try { return localStorage.getItem('iv_mm_fill') !== '0'; } catch (e) { return true; } })(),

  myId() { return Online.user ? Online.user.id : null; },
  online() { return !!(Online.online && Online.sb); },
  needOnline() {
    if (this.online()) return true;
    UI.msg(L('ระบบหาปาร์ตี้ใช้ได้เฉพาะโหมดออนไลน์ (ล็อกอินบัญชีออนไลน์)', 'Party matchmaking needs online mode (log in with an online account).'), 'err');
    return false;
  },

  // ---------------- เป้าหมาย ----------------
  // 'any' = บอสใกล้เลเวลเรา · 'mvp:<mobId>' · 'wb:<map>' = Ancient (World Boss) ของแผนที่นั้น
  valid(t) {
    if (t === 'any') return true;
    const m = /^(mvp|wb):([a-z0-9_]{1,40})$/.exec(String(t || ''));
    if (!m) return false;
    if (m[1] === 'wb') return typeof WB !== 'undefined' && !!WB.MAPS[m[2]];
    return Object.values(MAP_DEFS).some(d => d.mvp === m[2]);
  },
  mvps() {
    const seen = new Set();
    return Nav.mobs().filter(t => t.mvp && !seen.has(t.mobId) && seen.add(t.mobId));
  },
  label(t) {
    if (t === 'any') return L('บอสใกล้เลเวลฉัน', 'Any boss near my level');
    const [k, id] = String(t).split(':');
    if (k === 'wb' && typeof WB !== 'undefined' && WB.MAPS[id]) return MOBS[WB.id(id)].name; // ชื่อมี "Ancient" นำหน้าอยู่แล้ว
    if (k === 'mvp' && MOBS[id]) return `MVP ${MOBS[id].name}`;
    return String(t);
  },
  bossLv(t) {
    const [k, id] = String(t).split(':');
    if (k === 'wb' && typeof WB !== 'undefined' && WB.MAPS[id]) return MOBS[WB.id(id)].lv;
    return MOBS[id] ? MOBS[id].lv : 0;
  },
  // 'any' → บอสที่ใกล้เลเวลที่สุด (Ancient ที่ตื่นอยู่และเหมาะกับเลเวลมาก่อน)
  resolve(t, lv) {
    if (t !== 'any') return t;
    if (typeof WB !== 'undefined') { const r = WB.pick(); if (r && r.on && r.fit) return 'wb:' + r.map; }
    const ms = this.mvps().sort((a, b) => Math.abs(a.lv - lv) - Math.abs(b.lv - lv));
    return ms.length ? 'mvp:' + ms[0].mobId : 'any';
  },
  navTo(t) {
    this.navT = t; // เป้าหมายล่าสุดที่นำทางไป (Nav ยกเลิกเองได้เมื่อถึง/แตะพื้น)
    const [k, id] = String(t).split(':');
    if (k === 'wb' && MAP_DEFS[id]) { if (G.map.id !== id) Nav.goTo({ kind: 'map', map: id, name: MAP_DEFS[id].name }); return; }
    const m = k === 'mvp' && this.mvps().find(x => x.mobId === id);
    if (m) Nav.goTo(m);
  },

  // ---------------- ช่อง 'mm' ----------------
  join() {
    if (this.ch || !this.online()) return;
    const ch = Online.sb.channel('mm', { config: { broadcast: { self: false } } });
    for (const ev of ['hb', 'bye', 'hello', 'offer', 'ans', 'cancel', 'go']) ch.on('broadcast', { event: ev }, ({ payload }) => this.onNet(ev, payload));
    ch.subscribe(st => { if (st === 'SUBSCRIBED') { this.readyAt = Date.now() + this.GRACE_MS; this.send('hello', {}); this.heartbeat(true); } });
    this.ch = ch;
  },
  send(event, payload) {
    if (event !== 'hb') this.note('>' + event, payload);
    if (this.ch) this.ch.send({ type: 'broadcast', event, payload });
  },
  note(k, v) {
    this.trail.push(`${(Date.now() % 1e6 / 1000).toFixed(1)} ${k} ${v ? JSON.stringify(v).slice(0, 90) : ''}`);
    if (this.trail.length > 40) this.trail.shift();
  },
  // สถานะในคิวของเรา (หน่วยคิว: คนเดียว n=1 หรือทั้งปาร์ตี้ n=จำนวนสมาชิก g=1)
  self() {
    if (!this.me) return null;
    const p = G.player;
    return { id: this.myId(), name: p.name, lv: p.baseLv, job: p.job, map: G.map ? G.map.id : p.map, t: this.me.t, since: this.me.since,
      n: this.me.g ? Party.roster().length : 1, g: this.me.g ? 1 : 0, pid: this.me.g && Party.party ? Party.party.id : '', o: this.me.o || '' };
  },
  heartbeat(force) {
    const s = this.self(); if (!s || !this.ch) return;
    const now = performance.now(), key = [s.t, s.n, s.o, s.lv, s.map].join('|');
    if (!force && key === this.hbKey && now - this.lastHb < this.HB_MS) return;
    this.hbKey = key; this.lastHb = now;
    this.send('hb', s);
  },
  // ทุกคนในคิว (รวมเรา) — ใช้ทั้งนับจำนวนและจับคู่
  list() {
    const out = [...this.entries.values()], s = this.self();
    if (s) out.push(s);
    return out;
  },
  count(t) { return this.list().filter(e => e.t === t).reduce((a, e) => a + e.n, 0); },

  onNet(ev, v) {
    if (!v || typeof v !== 'object' || !G.started) return;
    const me = this.myId(), num = (x, d) => (Number.isFinite(+x) ? +x : d);
    if (ev !== 'hb') this.note('<' + ev, v);
    if (ev === 'hello') { this.heartbeat(true); return; }
    if (typeof v.id === 'string' && v.id === me) return;
    if (ev === 'hb') {
      if (typeof v.id !== 'string' || !this.valid(v.t)) return;
      this.entries.set(v.id, { id: v.id, name: Party.cleanName(v.name) || '???', lv: num(v.lv, 1), job: JOBS[v.job] ? v.job : 'novice', map: String(v.map || ''),
        t: v.t, since: num(v.since, Date.now()), n: Math.max(1, Math.min(PARTY_MAX, num(v.n, 1) | 0)), g: v.g ? 1 : 0, pid: String(v.pid || '').slice(0, 40),
        o: String(v.o || '').slice(0, 40), seen: performance.now() });
    } else if (ev === 'bye') this.entries.delete(v.id);
    else if (v.to !== me && !(Array.isArray(v.to) && v.to.includes(me)) && !(Array.isArray(v.nav) && v.nav.includes(me))) return;
    else if (ev === 'offer') this.onOffer(v);
    else if (ev === 'ans') this.onAns(v);
    else if (ev === 'cancel') { if (this.offer && this.offer.oid === v.oid && this.offer.from === v.from) this.dropOffer(L('ปาร์ตี้ที่จับคู่ไว้ยกเลิก (มีคนหลุด) — ยังอยู่ในคิวเหมือนเดิม', 'The matched party fell through (someone dropped) — you\'re still in the queue.')); }
    else if (ev === 'go') this.onGo(v);
  },

  // ---------------- เข้าคิว / ออกจากคิว ----------------
  // ทีมที่มีอยู่แล้ว: group=true (หัวหน้าเท่านั้น และต้องเปิด "รับคนนอกเติมทีม")
  queue(t, group) {
    if (!this.needOnline()) return false;
    if (!this.valid(t)) return false;
    if (this.me) this.leave(true);
    if (Party.party) {
      if (!group) { UI.msg(L('คุณอยู่ในปาร์ตี้แล้ว — ให้หัวหน้าเลือก "เติมที่ว่าง" หรือออกจากปาร์ตี้ก่อน', 'You\'re already in a party — the leader can choose "Fill empty slots", or leave the party first.'), 'err'); return false; }
      if (!Party.isLeader()) { UI.msg(L('เฉพาะหัวหน้าปาร์ตี้ที่พาทีมเข้าคิวได้', 'Only the party leader can queue the team.'), 'err'); return false; }
      if (!this.autofill) { UI.msg(L('ปิด "รับคนนอกเติมทีม" อยู่ — เปิดก่อนถ้าจะให้ระบบเติมที่ว่าง', '"Accept auto-fill" is off — turn it on to let the queue fill your empty slots.'), 'err'); return false; }
      if (Party.roster().length >= this.cap(t)) { UI.msg(L(`ทีมมีครบ ${this.cap(t)} คนแล้ว — กด "ไปทั้งทีมนี้" ได้เลย`, `Your team already has ${this.cap(t)} — just use "Go as-is".`), 'info'); return false; }
    } else group = false;
    this.join();
    this.me = { t, since: Date.now(), g: !!group, o: '' };
    this.hbKey = '';
    this.heartbeat(true);
    if (group) Party.sendChat(L(`[หาปาร์ตี้] เข้าคิวเติมทีม → ${this.label(t)}`, `[Matchmaking] Queued to fill the team → ${this.label(t)}`));
    UI.msg(L(`🔎 เข้าคิวหาปาร์ตี้: ${this.label(t)} — ครบ ${this.SIZE} คนจะตั้งปาร์ตี้ให้อัตโนมัติ${this.cap(t) > this.SIZE ? ` (Ancient รับได้ถึง ${this.cap(t)} คน)` : ''}`, `🔎 Queued for ${this.label(t)} — a party forms automatically at ${this.SIZE} players${this.cap(t) > this.SIZE ? ` (Ancient takes up to ${this.cap(t)})` : ''}`), 'party');
    Sound.play('click');
    this.render(true);
    return true;
  },
  leave(quiet, why) {
    if (!this.me) return;
    if (this.prop) this.cancelProp();
    if (this.offer) { this.reply(this.offer, 'no'); this.offer = null; this.showOffer(); }
    this.me = null;
    this.send('bye', { id: this.myId() });
    if (!quiet) UI.msg(why || L('ออกจากคิวหาปาร์ตี้แล้ว', 'You left the matchmaking queue.'), 'info');
    this.render(true);
  },
  // ทีมเดิมไปเลย ไม่รับคนนอก: นำทางทั้งทีมไปบอส + บอกในแชทปาร์ตี้
  goAsIs(t) {
    if (!this.needOnline() || !Party.party) return false;
    if (!Party.isLeader()) { UI.msg(L('เฉพาะหัวหน้าปาร์ตี้ที่นำทีมไปได้', 'Only the party leader can lead the team.'), 'err'); return false; }
    if (this.me) this.leave(true);
    this.join();
    t = this.resolve(t, G.player.baseLv);
    const nav = Party.roster().filter(m => !m.me).map(m => m.id);
    this.send('go', { from: this.myId(), to: [], nav, pid: Party.party.id, t });
    Party.sendChat(L(`ไปปราบ ${this.label(t)} กันทั้งทีม — ระบบนำทางพาไปแล้ว`, `Let's take down ${this.label(t)} as a team — navigation is on its way`));
    this.navTo(t);
    return true;
  },
  setAutofill(on) {
    this.autofill = !!on;
    try { localStorage.setItem('iv_mm_fill', on ? '1' : '0'); } catch (e) { /* โหมดส่วนตัว */ }
    if (!on && this.me && this.me.g) this.leave(false, L('ปิด "รับคนนอกเติมทีม" — ทีมออกจากคิวแล้ว', '"Accept auto-fill" turned off — your team left the queue.'));
    this.render(true);
  },

  // ---------------- จับคู่ (มาก่อนได้ก่อน) ----------------
  // คืน [{ lead, fill: [...] }] — หน่วยแรกในคิวเป็นหัวหน้า เลือกคนเดี่ยวที่มาก่อนสุดในช่วงเลเวลมาเติมจนครบ
  //   คนเดี่ยว 'any' เติมให้บอสตัวไหนก็ได้ · ปาร์ตี้ (g) ไม่รวมกับปาร์ตี้อื่น — รับเฉพาะคนเดี่ยว
  //   หน่วยที่ยังเติมไม่ครบ = ข้ามไป (คนเดี่ยวนั้นยังเป็นตัวเติมให้ปาร์ตี้ที่เข้าคิวทีหลังได้)
  plan(list) {
    const free = list.filter(e => !e.o).sort((a, b) => (a.since - b.since) || (a.id < b.id ? -1 : 1));
    const used = new Set(), out = [];
    for (const u of free) {
      if (used.has(u.id)) continue;
      const need = this.SIZE - u.n, room = this.cap(u.t) - u.n;
      if (need <= 0 && !(u.g && room > 0)) continue;
      const cand = free.filter(e => e !== u && !used.has(e.id) && this.fits(u, e));
      if (cand.length < Math.max(1, need)) continue;
      const fill = cand.slice(0, Math.max(need, Math.min(cand.length, room)));
      used.add(u.id); for (const e of fill) used.add(e.id);
      out.push({ lead: u, fill });
    }
    return out;
  },
  fits(u, e) {
    if (e.g || e.n !== 1) return false;
    if (!(e.t === u.t || (e.t === 'any' && u.t !== 'any'))) return false;
    return Math.abs(e.lv - u.lv) <= this.LV_WIN;
  },

  // เราเป็นหน่วยแรกของกลุ่มที่ครบ → ส่งคำชวน
  propose() {
    const mine = this.plan(this.list()).find(p => p.lead.id === this.myId());
    if (!mine) return;
    const oid = 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    this.prop = { oid, t: this.me.t, mem: new Map() };
    this.me.o = oid;
    this.heartbeat(true);
    this.invite(mine.fill);
  },
  invite(list) {
    const P = this.prop, exp = Date.now() + (this.ACCEPT_SEC + 4) * 1000;
    for (const e of list) P.mem.set(e.id, { name: e.name, st: 'wait', exp });
    const s = this.self();
    this.send('offer', { to: list.map(e => e.id), from: this.myId(), fromName: G.player.name, oid: P.oid, t: P.t, n: s.n + P.mem.size, lv: s.lv });
  },
  // มีคนปฏิเสธ/หลุด → เติมจากคิว (คนเดี่ยวที่ยังว่าง มาก่อนได้ก่อน) · ไม่มีใครให้เติม = ยกเลิก ทุกคนกลับเข้าคิวตำแหน่งเดิม
  refill() {
    const P = this.prop, s = this.self();
    const need = Math.min(this.SIZE, this.cap(s.t)) - s.n - P.mem.size;
    if (need <= 0) return;
    const cand = [...this.entries.values()].filter(e => !e.o && !P.mem.has(e.id) && this.fits(s, e))
      .sort((a, b) => (a.since - b.since) || (a.id < b.id ? -1 : 1)).slice(0, need);
    if (cand.length < need) { this.cancelProp(); return; }
    this.invite(cand);
  },
  cancelProp() {
    const P = this.prop; if (!P) return;
    this.prop = null;
    const to = [...P.mem.keys()];
    if (to.length) this.send('cancel', { to, from: this.myId(), oid: P.oid });
    if (this.me) { this.me.o = ''; this.heartbeat(true); }
  },
  onAns(v) {
    const P = this.prop;
    if (!P || v.oid !== P.oid || !P.mem.has(v.from)) return;
    const m = P.mem.get(v.from);
    if (v.ans === 'yes') m.st = 'yes';
    else {
      P.mem.delete(v.from);
      if (v.ans !== 'busy') UI.msg(L(`${m.name} ไม่รับปาร์ตี้ — กำลังหาคนถัดไปในคิว`, `${m.name} passed — finding the next player in the queue`), 'info');
      this.refill();
    }
    this.render(true);
  },
  // ครบทุกคนตอบรับ → ตั้งปาร์ตี้ (กลไกเดิมของ js/party.js) แล้วส่ง 'go' ให้ทุกคนเข้าปาร์ตี้ + นำทาง
  form() {
    const P = this.prop; this.prop = null;
    const t = this.resolve(P.t, G.player.baseLv);
    if (!Party.party && !Party.create(L(`ทีม ${this.label(t)}`, `${this.label(t)} Team`).slice(0, 24))) { this.cancelProp(); return; }
    const r = Party.roster(), to = [...P.mem.keys()];
    this.send('go', { from: this.myId(), to, nav: r.filter(m => !m.me).map(m => m.id), oid: P.oid, pid: Party.party.id, pn: Party.party.name,
      since: Math.max(...r.map(m => m.since)), n: r.length, t });
    this.me = null;
    this.send('bye', { id: this.myId() });
    UI.msg(L(`★ จับคู่สำเร็จ! ปาร์ตี้ ${r.length + to.length} คน → ${this.label(t)}`, `★ Match found! Party of ${r.length + to.length} → ${this.label(t)}`), 'party');
    Sound.play('quest_new');
    const names = [...P.mem.values()].map(m => m.name).join(', ');
    setTimeout(() => { if (Party.party) Party.sendChat(L(`สวัสดีทีม ${names}! ไปปราบ ${this.label(t)} กัน — ระบบนำทางพาไปแล้ว`, `Hi team ${names}! Let's take down ${this.label(t)} — navigation is on its way`)); }, 1500);
    this.navTo(t);
    this.render(true);
  },

  // ---------------- ฝั่งคนที่ถูกชวน ----------------
  reply(o, ans) { this.send('ans', { to: o.from, from: this.myId(), oid: o.oid, ans }); },
  onOffer(v) {
    if (typeof v.from !== 'string' || typeof v.oid !== 'string' || !this.valid(v.t)) return;
    const o = { from: v.from, fromName: Party.cleanName(v.fromName) || 'Player', oid: v.oid.slice(0, 40), t: v.t, n: Math.max(2, Math.min(PARTY_MAX, +v.n || 2)) };
    if (!this.me || this.me.g || Party.party || (this.offer && this.offer.oid !== o.oid) || this.prop) { this.reply(o, 'busy'); return; }
    this.offer = Object.assign(o, { exp: Date.now() + this.ACCEPT_SEC * 1000, acc: false });
    this.me.o = o.oid;
    this.heartbeat(true);
    Sound.play('quest_new');
    UI.msg(L(`🔔 พบปาร์ตี้ ${o.n} คน → ${this.label(o.t)} — ตอบรับภายใน ${this.ACCEPT_SEC} วินาที`, `🔔 Party of ${o.n} found → ${this.label(o.t)} — accept within ${this.ACCEPT_SEC} seconds`), 'party');
    this.showOffer();
  },
  accept() {
    const o = this.offer; if (!o || o.acc) return;
    o.acc = true; o.exp = Date.now() + 15000; // รอหัวหน้าตั้งปาร์ตี้ (ไม่มา = กลับเข้าคิว)
    this.reply(o, 'yes');
    UI.msg(L('ตอบรับแล้ว — รอสมาชิกที่เหลือ…', 'Accepted — waiting for the others…'), 'party');
    this.showOffer();
  },
  // ปฏิเสธ/ไม่ตอบ = หลุดจากคิว (ไม่กลับไปชวนซ้ำ)
  decline(why) {
    const o = this.offer; if (!o) return;
    this.offer = null; this.showOffer();
    this.reply(o, why || 'no');
    this.leave(true);
    UI.msg(why === 'timeout' ? L('ไม่ได้ตอบรับปาร์ตี้ทันเวลา — ออกจากคิวแล้ว', 'You didn\'t accept in time — removed from the queue.') : L('ไม่รับปาร์ตี้นี้ — ออกจากคิวแล้ว', 'Party declined — removed from the queue.'), 'info');
  },
  dropOffer(msg) {
    this.offer = null; this.showOffer();
    if (this.me) { this.me.o = ''; this.heartbeat(true); }
    if (msg) UI.msg(msg, 'info');
  },
  onGo(v) {
    if (typeof v.from !== 'string' || !this.valid(v.t)) return;
    const me = this.myId(), o = this.offer;
    if (Array.isArray(v.to) && v.to.includes(me)) {
      if (!o || !o.acc || o.oid !== v.oid || o.from !== v.from || Party.party) return;
      this.offer = null; this.showOffer();
      this.me = null; this.send('bye', { id: me });
      // เข้าปาร์ตี้ด้วยทางเดิมของ js/party.js (เหมือนกดรับคำเชิญ)
      Party.invite = { from: v.from, fromName: o.fromName, partyId: String(v.pid).slice(0, 40), partyName: Party.cleanName(v.pn) || 'Party', since: +v.since || 0, n: +v.n || 1, exp: Date.now() + 5000 };
      Party.accept();
      this.navTo(v.t);
    } else if (Array.isArray(v.nav) && v.nav.includes(me)) {
      // สมาชิกเดิมของทีม: หัวหน้าพาไป
      if (!Party.party || Party.party.id !== v.pid || Party.leaderId() !== v.from) return;
      UI.msg(L(`♛ หัวหน้าพาทีมไป ${this.label(v.t)} — กำลังนำทาง`, `♛ Your leader is taking the team to ${this.label(v.t)} — navigating`), 'party');
      this.navTo(v.t);
    }
    this.render(true);
  },

  // ---------------- ทุก 250 ms ----------------
  tick() {
    if (typeof G === 'undefined' || !G.started || !G.player) return;
    const pn = performance.now(), now = Date.now();
    for (const [id, e] of this.entries) if (pn - e.seen > this.TIMEOUT_MS) this.entries.delete(id);
    if (this.me) {
      // คิวยังใช้ได้ไหม: หลุดออนไลน์ / คนเดี่ยวไปเข้าปาร์ตี้เอง / หัวหน้าทีมเปลี่ยน / ทีมครบแล้ว
      const bad = !this.online() ? L('หลุดจากโหมดออนไลน์ — ออกจากคิวแล้ว', 'Went offline — left the queue.')
        : !this.me.g && Party.party && !this.offer ? L('คุณเข้าปาร์ตี้แล้ว — ออกจากคิวหาปาร์ตี้', 'You joined a party — left the matchmaking queue.')
        : this.me.g && (!Party.party || !Party.isLeader()) ? L('ไม่ได้เป็นหัวหน้าปาร์ตี้แล้ว — ทีมออกจากคิว', 'You\'re no longer the party leader — the team left the queue.')
        : this.me.g && !this.prop && Party.roster().length >= this.cap(this.me.t) ? L('ทีมครบแล้ว — ออกจากคิว', 'Your team is full — left the queue.') : '';
      if (bad) this.leave(false, bad);
    }
    if (this.offer) {
      if (!this.offer.acc) this.showOffer();
      if (this.offer.exp < now) {
        if (this.offer.acc) this.dropOffer(L('หัวหน้าปาร์ตี้ไม่ตอบ — กลับเข้าคิวตำแหน่งเดิม', 'The party leader went quiet — back in the queue at your old spot.'));
        else this.decline('timeout');
      }
    }
    if (this.prop) {
      const P = this.prop;
      let lost = false;
      for (const [id, m] of P.mem) if (m.st === 'wait' && m.exp < now) { P.mem.delete(id); lost = true; this.send('cancel', { to: [id], from: this.myId(), oid: P.oid }); } // ปิดโทสต์ที่ค้าง (คำตอบมาไม่ถึง)
      if (lost) this.refill();
      if (this.prop && this.prop.mem.size && [...this.prop.mem.values()].every(m => m.st === 'yes') && this.self().n + this.prop.mem.size >= this.SIZE) this.form();
    } else if (this.me && !this.me.o && now > Math.max(this.readyAt, this.me.since + this.GRACE_MS)) this.propose();
    this.heartbeat(false);
    if (this.call && this.call.exp < now) this.showCall(null);
    this.render();
  },

  // ---------------- หน้าต่าง "หาปาร์ตี้" ----------------
  win() {
    let w = document.getElementById('w-mm');
    if (!w) {
      w = h('div', { id: 'w-mm', class: 'win hidden', style: 'right:64px;top:160px;width:380px' },
        h('div', { class: 'win-title' }, h('span', {}, L('หาปาร์ตี้', 'Find Party'))), h('div', { class: 'win-body' }));
      const ref = document.getElementById('w-party');
      (ref ? ref.parentNode : document.body).append(w);
      UI.makeWindow(w);
    }
    return w;
  },
  open(t) {
    if (t && this.valid(t)) this.sel = t;
    const w = this.win();
    if (this.online()) this.join();
    UI.open('w-mm');
    w.querySelector('.win-body').dataset.key = '';
    this.render(true);
  },
  render(force) {
    const w = document.getElementById('w-mm');
    if (!w || w.classList.contains('hidden') || !G.started) return;
    const body = w.querySelector('.win-body'), online = this.online(), lead = !!Party.party && Party.isLeader();
    const wb = typeof WB !== 'undefined' ? WB.pick() : null;
    const targets = [['any', this.label('any'), L('มาก่อนได้ก่อน · เลือกบอสให้ตามเลเวล', 'First come, first served · boss picked by level')]];
    if (wb) {
      const left = Math.max(0, Math.round((wb.at - Date.now()) / 1000));
      targets.push(['wb:' + wb.map, this.label('wb:' + wb.map), `World Boss · Lv ${wb.lvB} · ${wb.on ? L('ตื่นอยู่', 'Awake') : L(`ตื่นในอีก ${fmtLeft(left)}`, `Awakens in ${fmtLeft(left)}`)}`]);
    }
    for (const m of this.mvps()) targets.push(['mvp:' + m.mobId, this.label('mvp:' + m.mobId), `Lv ${m.lv} · ${m.mapName}`]);
    if (this.sel !== 'any' && !targets.some(x => x[0] === this.sel) && !(this.me && this.me.t === this.sel)) this.sel = 'any';
    const counts = targets.map(x => this.count(x[0]));
    const P = this.prop, wait = this.me ? Math.floor((Date.now() - this.me.since) / 1000) : 0;
    const key = JSON.stringify([online, this.sel, this.mode, this.autofill, lead, !!Party.party, Party.party ? Party.roster().length : 0, targets.map(x => x[2]), counts,
      this.me && [this.me.t, this.me.o, wait], P && [...P.mem.values()].map(m => m.st)]);
    if (!force && body.dataset.key === key) return;
    body.dataset.key = key; body.innerHTML = '';
    if (!online) {
      body.append(h('div', { class: 'py-empty' }, h('b', {}, L('หาปาร์ตี้ใช้ได้ในโหมดออนไลน์', 'Matchmaking needs online mode')),
        h('p', {}, L('ต้องล็อกอินบัญชีออนไลน์ถึงจะเห็นผู้เล่นคนอื่นและจับคู่ไปตีบอสด้วยกันได้', 'Log in with an online account to see other players and get matched to fight bosses together.'))));
      return;
    }
    if (this.me) {
      const n = this.self().n;
      body.append(h('div', { class: 'mm-status' },
        h('small', {}, this.me.g ? L('ทีมกำลังรอคนเติม', 'Team waiting for fill') : L('กำลังหาปาร์ตี้', 'Searching for a party')),
        h('b', {}, this.label(this.me.t)),
        h('span', {}, L(`ในคิวเป้าหมายนี้ ${this.count(this.me.t)} คน · ต้องการ ${this.SIZE} (ฝั่งเรา ${n}) · รอแล้ว ${fmtLeft(wait)}`, `${this.count(this.me.t)} queued for this target · need ${this.SIZE} (you: ${n}) · waited ${fmtLeft(wait)}`)),
        P ? h('span', { class: 'mm-wait' }, L(`จับคู่ได้แล้ว รอตอบรับ ${[...P.mem.values()].filter(m => m.st === 'yes').length}/${P.mem.size}`, `Matched — ${[...P.mem.values()].filter(m => m.st === 'yes').length}/${P.mem.size} accepted`)) : null,
        h('button', { type: 'button', class: 'btn danger mm-leave', onclick: () => this.leave() }, L('ออกจากคิว', 'Leave Queue'))));
    }
    body.append(h('div', { class: 'py-sec' }, h('span', {}, L('เลือกเป้าหมาย', 'Choose a Target')), h('small', {}, L(`จับคู่ ${this.SIZE} คน (Ancient ถึง ${PARTY_MAX}) · เลเวลห่างไม่เกิน ±${this.LV_WIN}`, `${this.SIZE} per party (Ancient up to ${PARTY_MAX}) · within ±${this.LV_WIN} Base Lv`))));
    const list = h('div', { class: 'mm-list' });
    targets.forEach(([t, name, sub], i) => list.append(h('button', { type: 'button', class: 'mm-row' + (this.sel === t ? ' on' : ''), 'data-t': t, 'aria-pressed': this.sel === t ? 'true' : 'false',
      onclick: () => { this.sel = t; this.render(true); } },
    h('span', { class: 'mm-mid' }, h('b', {}, name), h('small', {}, sub)),
    h('span', { class: 'mm-n' }, h('b', {}, String(counts[i])), h('small', {}, L('ในคิว', 'queued'))))));
    body.append(list);
    if (Party.party && !lead) {
      body.append(h('div', { class: 'py-none' }, L('คุณอยู่ในปาร์ตี้ — หัวหน้า (มงกุฎ) เป็นคนเลือกว่าจะไปทั้งทีมหรือเติมที่ว่างจากคิว', 'You\'re in a party — the leader (crown) chooses to go as-is or fill empty slots from the queue.')));
      return;
    }
    if (lead) {
      const n = Party.roster().length, cap = this.cap(this.sel), mode = (m, title, sub, dis) => h('label', { class: 'mm-mode' + (this.mode === m ? ' on' : '') + (dis ? ' off' : '') },
        h('input', { type: 'radio', name: 'mm-mode', value: m, checked: this.mode === m ? 'checked' : false, disabled: dis ? 'disabled' : false, onchange: () => { this.mode = m; this.render(true); } }),
        h('span', {}, h('b', {}, title), h('small', {}, sub)));
      body.append(h('div', { class: 'py-sec' }, h('span', {}, L(`ทีมของคุณ ${n} คน`, `Your team: ${n}`)), h('small', {}, L('ค่าเริ่มต้น = ไปทั้งทีมนี้', 'Default = go as-is'))),
        mode('asis', L('ไปทั้งทีมนี้', 'Go as-is'), L('ไม่เข้าคิว ไม่รับคนนอก — นำทางทั้งทีมไปที่บอส', 'No queue, no strangers — navigate the whole team to the boss')),
        mode('fill', L('เติมที่ว่างจากคิว', 'Fill empty slots'), n >= cap ? L(`ทีมครบ ${cap} คนแล้ว`, `Team already has ${cap}`) : L(`รับคนเดี่ยวในคิวเติม ${cap - n} ที่ (หัวหน้ายังเป็นคุณ)`, `Solo players fill ${cap - n} slot(s) (you stay leader)`), !this.autofill || n >= cap),
        h('label', { class: 'opt mm-fill' }, h('input', { type: 'checkbox', checked: this.autofill ? 'checked' : false, onchange: e => this.setAutofill(e.target.checked) }),
          L(' รับคนนอกเติมทีมอัตโนมัติ (ปิด = ทีมนี้ไม่มีคนนอกเข้ามา)', ' Accept auto-fill (off = no strangers ever join this team)')));
      if (this.mode === 'fill' && (!this.autofill || n >= cap)) this.mode = 'asis';
    }
    const go = lead && this.mode === 'asis'
      ? h('button', { type: 'button', class: 'btn primary mm-go', onclick: () => this.goAsIs(this.sel) }, L('นำทีมไปที่บอส', 'Lead Team to Boss'))
      : h('button', { type: 'button', class: 'btn primary mm-go', disabled: this.me && this.me.t === this.sel ? 'disabled' : false, onclick: () => this.queue(this.sel, lead) },
        this.me ? (this.me.t === this.sel ? L('อยู่ในคิวนี้แล้ว', 'Already queued') : L('ย้ายไปคิวนี้', 'Switch to this queue')) : lead ? L('เข้าคิวเติมทีม', 'Queue to Fill') : L('เข้าคิว', 'Join Queue'));
    body.append(h('div', { class: 'mm-foot' }, go),
      h('div', { class: 'hint' }, L('ปาร์ตี้ที่สร้าง/เชิญเองยังใช้ได้ตามปกติที่หน้าต่างปาร์ตี้ (Y) • คำสั่งแชท /lfg', 'Manual parties still work as usual in the Party window (Y) • chat command /lfg')));
  },

  // ---------------- โทสต์: คำชวนเข้าปาร์ตี้ (นับถอยหลังเป็นตัวเลข) ----------------
  showOffer() {
    let el = document.getElementById('mm-offer');
    const o = this.offer;
    if (!o) { if (el) el.hidden = true; return; }
    if (!el) {
      el = h('div', { id: 'mm-offer', role: 'alertdialog', 'aria-live': 'polite' });
      (document.getElementById('hud') || document.body).append(el);
    }
    const left = Math.max(0, Math.ceil((o.exp - Date.now()) / 1000)), key = [o.oid, o.acc].join('|');
    // นับถอยหลัง: เปลี่ยนแค่ตัวเลข (ไม่สร้างปุ่มใหม่ทุกวินาที — กดค้างอยู่แล้วปุ่มไม่หลุดมือ)
    if (el.dataset.key === key && !el.hidden) {
      const sec = el.querySelector('.mm-sec');
      if (sec && sec.textContent !== String(left)) { sec.textContent = String(left); sec.setAttribute('aria-label', L(`เหลือ ${left} วินาที`, `${left} seconds left`)); }
      return;
    }
    el.dataset.key = key; el.innerHTML = '';
    el.append(h('div', { class: 'mm-ot' }, h('small', {}, L('จับคู่ปาร์ตี้สำเร็จ', 'Party Match Found')),
      h('span', {}, h('b', {}, this.label(o.t)), L(` · ปาร์ตี้ ${o.n} คน · หัวหน้า ${o.fromName}`, ` · party of ${o.n} · leader ${o.fromName}`))),
    o.acc ? h('span', { class: 'mm-ow' }, L('รอคนอื่น…', 'Waiting…'))
      : h('div', { class: 'mm-ob' }, h('b', { class: 'mm-sec', 'aria-label': L(`เหลือ ${left} วินาที`, `${left} seconds left`) }, String(left)),
        h('button', { type: 'button', class: 'btn mm-yes', onclick: () => this.accept() }, 'Accept'),
        h('button', { type: 'button', class: 'btn mm-no', onclick: () => this.decline() }, 'Decline')));
    el.hidden = false;
  },
  // ---------------- โทสต์: Ancient ตื่น → แตะเดียวเข้าคิวบอส (เรียกจาก js/worldboss.js) ----------------
  offerQueue(map) {
    if (!this.online() || !this.valid('wb:' + map) || (this.me && this.me.t === 'wb:' + map)) return;
    this.call = { t: 'wb:' + map, exp: Date.now() + this.ACCEPT_SEC * 1000 };
    this.showCall(this.call);
  },
  showCall(c) {
    let el = document.getElementById('mm-call');
    if (!c) { this.call = null; if (el) el.hidden = true; return; }
    if (!el) { el = h('div', { id: 'mm-call', role: 'status' }); (document.getElementById('hud') || document.body).append(el); }
    el.innerHTML = '';
    const solo = !Party.party, lead = Party.party && Party.isLeader();
    el.append(h('span', {}, h('b', {}, this.label(c.t)), L(' ตื่นแล้ว', ' is awake')),
      solo ? h('button', { type: 'button', class: 'btn mm-cq', onclick: () => { this.showCall(null); this.queue(c.t); } }, L('เข้าคิวบอส', 'Join Boss Queue'))
        : lead ? h('button', { type: 'button', class: 'btn mm-cq', onclick: () => { this.showCall(null); this.open(c.t); } }, L('พาทีมไป', 'Take Team')) : null,
      h('button', { type: 'button', class: 'mm-cx', 'aria-label': 'Close', onclick: () => this.showCall(null) }, '×'));
    el.hidden = false;
  },
};

// ทางเข้า: ปุ่มในหน้าต่างปาร์ตี้ (Y) + คำสั่งแชท /lfg /mm — ห่อฟังก์ชันของ js/party.js โดยไม่แก้ไฟล์นั้น
{
  const render0 = Party.render.bind(Party), cmd0 = Party.chatCmd.bind(Party);
  Party.render = function () {
    render0();
    const body = document.querySelector('#w-party .win-body');
    if (!body || body.querySelector('.mm-entry') || !(Online.online && Online.sb) || (Party.party && !Party.isLeader())) return;
    body.append(h('button', { type: 'button', class: 'btn mm-entry', onclick: () => MM.open() },
      MM.me ? L('ดูคิวหาปาร์ตี้', 'View Matchmaking Queue') : L('หาปาร์ตี้อัตโนมัติ (ไปตีบอส)', 'Find a Party Automatically (Boss)')));
  };
  Party.chatCmd = function (text) {
    if (/^\/(lfg|mm|findparty)\b/i.test(text)) { MM.open(); if (!MM.online()) MM.needOnline(); return true; }
    return cmd0(text);
  };
}
setInterval(() => MM.tick(), 250);
window.addEventListener('pagehide', () => { if (MM.me) MM.send('bye', { id: MM.myId() }); });
