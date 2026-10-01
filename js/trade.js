'use strict';
// ============================================================
//  แลกเปลี่ยนไอเทมระหว่างผู้เล่น (แบบ RO)
//  ขอแลก (ปุ่มในหน้าต่าง หรือ /trade ชื่อ) → อีกฝ่ายตอบรับ → ใส่ของได้ฝั่งละ 10 ช่อง + Volt
//  → ล็อกทั้งคู่ → ตกลงทั้งคู่ → นับถอยหลัง 1.5 วิ → สลับของ (เปลี่ยนข้อเสนอหลังล็อก = ปลดล็อกทั้งสองฝ่าย)
//
//  สื่อสารผ่านช่อง broadcast "trade" ของ Supabase (แยกจากช่องแผนที่) ทุกข้อความระบุ tid + from + to
//  • ตอนล็อก ส่งข้อเสนอเต็ม + แฮช — ตกลง/ยืนยันได้เฉพาะเมื่อแฮชของทั้งสองฝั่งตรงกัน
//  • หมดเวลานับถอยหลัง: ตรวจว่ายังมีของครบ → ย้ายของที่เสนอไปพักไว้ (escrow) → ส่ง commit
//    ได้ commit ของอีกฝ่าย (แฮชตรง) = รับของตามข้อเสนอที่ตกลงกัน + เซฟทันที • ยกเลิก/ไม่ครบ/ขาดการติดต่อ = คืนของที่พักไว้
//  • ยกเลิกเองเมื่อ ออกจากแผนที่ / ล้ม / ห่างกันเกิน 8 ช่อง / ครบ 2 นาที
//  • เกมยังไม่มีขีดจำกัดช่องกระเป๋าหรือน้ำหนัก (มีแค่คลัง STORAGE_MAX) จึงไม่ต้องตรวจที่ว่าง
// ============================================================

const TRADE_CFG = {
  slots: 10, startRange: 6, keepRange: 8,
  timeout: 120000, reqTimeout: 20000, countdown: 1500, commitWait: 6000, lostGrace: 2000,
};
const TRADE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5h14.5"/><path d="M15 5l3.5 3.5L15 12"/><path d="M20 15.5H5.5"/><path d="M9 12l-3.5 3.5L9 19"/></svg>';
const TRADE_VOLT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg>';

const Trade = {
  ch: null, t: null, uiReady: false, wasOpen: false,
  pick: null, pickQty: 1, sel: null, note: null, listKey: '', listAt: 0,

  boot() {
    setInterval(() => { try { this.tick(); } catch (e) { console.warn('trade tick', e); } }, 100);
    window.addEventListener('pagehide', () => { if (this.t && this.t.state !== 'commit') this.send('cancel', { why: 'left' }); });
  },
  // ช่องสื่อสารของระบบแลกเปลี่ยน (เข้าครั้งเดียวเมื่อออนไลน์ ไม่แตะช่องแผนที่)
  join() {
    if (this.ch || !Online.online || !Online.sb) return;
    this.ch = Online.sb.channel('trade', { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'tr' }, ({ payload }) => { try { this.onMsg(payload); } catch (e) { console.warn('trade msg', e); } })
      .subscribe();
  },
  sendTo(to, tid, k, data) {
    if (!this.ch || !Online.user) return;
    this.ch.send({ type: 'broadcast', event: 'tr', payload: Object.assign({ k, tid, from: Online.user.id, to }, data || {}) });
  },
  send(k, data) { const t = this.t; if (t) this.sendTo(t.peer, t.tid, k, data); },

  // ปุ่มเมนู + เฝ้าการปิดหน้าต่าง (ปิด = ยกเลิก) — ทำใน trade.js ทั้งหมด ไม่ต้องแก้ ui.js
  setupUi() {
    const w = $('#w-trade'), menu = $('#menubar');
    if (!w || !menu || !menu.children.length) return;
    this.uiReady = true;
    if (!$('[data-win="w-trade"]', menu)) {
      const b = h('button', { title: L('แลกเปลี่ยน (/trade ชื่อ)', 'Trade (/trade name)'), 'data-win': 'w-trade', onclick: () => { UI.toggle('w-trade'); if (Pad.enabled()) UI.setFold(menu, true); } });
      b.innerHTML = L(`${TRADE_ICON}<span>แลกเปลี่ยน</span><small>/trade</small>`, `${TRADE_ICON}<span>Trade</span><small>/trade</small>`);
      const after = $('[data-win="w-emote"]', menu);
      if (after) after.after(b); else menu.append(b);
    }
    // แตะปุ่มขณะพิมพ์ Volt: ไม่ให้ช่องหลุดโฟกัสก่อน (จะวาดใหม่จนปุ่มหาย) แล้วค่อยใช้ค่าก่อนปุ่มทำงาน
    w.addEventListener('pointerdown', e => { const a = document.activeElement; if (a && a.classList.contains('tr-zeny') && e.target !== a && e.target.closest('button')) e.preventDefault(); }, true);
    w.addEventListener('click', e => { if (e.target.closest('button')) this.flush(); }, true);
    new MutationObserver(() => {
      const open = !w.classList.contains('hidden');
      if (open && !this.wasOpen) this.render();
      if (!open && this.wasOpen) this.onClosed();
      this.wasOpen = open;
    }).observe(w, { attributes: true, attributeFilter: ['class'] });
  },
  isOpen() { const w = $('#w-trade'); return !!w && !w.classList.contains('hidden'); },
  show() { if (!this.isOpen()) UI.open('w-trade'); this.wasOpen = true; this.render(); },
  hide() { const w = $('#w-trade'); this.wasOpen = false; if (w) w.classList.add('hidden'); },
  // ผู้เล่นปิดหน้าต่างเอง (× / Esc)
  onClosed() {
    const t = this.t;
    if (!t) return;
    if (t.state === 'inc') this.decline('decline');
    else if (t.state === 'req' || t.state === 'open' || t.state === 'count') this.abort('cancel', true);
    // ระหว่าง commit (กำลังสลับของ) ปิดหน้าต่างได้ แต่ไม่ยกเลิก — จบเองในเสี้ยววินาที
  },

  // ---------------- ตรวจทุก 100ms ----------------
  tick() {
    if (typeof G === 'undefined' || !G.started || !G.player) return;
    if (!this.uiReady) this.setupUi();
    if (Online.online) this.join();
    const now = Date.now(), t = this.t;
    if (t) this.guard(t, now);
    if (this.isOpen()) this.live(now);
  },
  guard(t, now) {
    if (t.state === 'commit') { if (now - t.commitAt > TRADE_CFG.commitWait) this.abort('commit', true); return; }
    if (!Online.online) { this.abort('offline', false); return; }
    if (t.state === 'req' && now - t.reqAt > TRADE_CFG.reqTimeout + 1500) { this.abort('noreply', true); return; }
    if (t.state === 'inc' && now - t.reqAt > TRADE_CFG.reqTimeout) { this.decline('timeout'); return; }
    const why = this.unsafe(t, now);
    if (why) { if (t.state === 'inc') this.decline(why); else this.abort(why, true); return; }
    if (t.state === 'open' || t.state === 'count') {
      if (now - t.at > TRADE_CFG.timeout) { this.abort('timeout', true); return; }
      if (t.state === 'count' && now >= t.endAt) this.commit();
      else if (t.state === 'open') this.revalidate();
    }
  },
  // เงื่อนไขความปลอดภัย: แผนที่เดียวกัน ยังไม่ล้ม อยู่ใกล้กัน
  unsafe(t, now) {
    const p = G.player;
    if (p.dead) return 'dead';
    if (t.map && G.map && G.map.id !== t.map) return 'map';
    const o = Online.others.get(t.peer);
    if (!o) { if (!t.lostAt) t.lostAt = now; return now - t.lostAt > TRADE_CFG.lostGrace ? 'gone' : null; }
    t.lostAt = 0;
    if (o.dead) return 'peerdead';
    if (this.dist(o) > TRADE_CFG.keepRange) return 'far';
    return null;
  },
  dist(o) { const p = G.player; return U.dist(p.x, p.y, o.tx != null ? o.tx : o.x, o.ty != null ? o.ty : o.y); },

  // ---------------- เริ่มการแลกเปลี่ยน ----------------
  needOnline() {
    if (Online.online) return true;
    UI.msg(L('ต้องออนไลน์ — การแลกเปลี่ยนใช้ได้เมื่อล็อกอินและเชื่อมต่อเซิร์ฟเวอร์', 'Online only — trading requires being logged in and connected to the server.'), 'err');
    return false;
  },
  // /trade ชื่อ (เรียกจากแชท) • /trade เฉย ๆ = เปิดหน้าต่าง
  command(arg) {
    if (!this.needOnline()) { this.show(); return; }
    arg = String(arg || '').trim();
    if (!arg) { this.show(); return; }
    const q = arg.toLowerCase(), all = this.nearby();
    const hit = all.find(x => x.o.name.toLowerCase() === q) || (() => { const m = all.filter(x => x.o.name.toLowerCase().startsWith(q)); return m.length === 1 ? m[0] : null; })();
    if (!hit) { UI.msg(L(`ไม่พบผู้เล่นชื่อ ${arg} ในแผนที่นี้`, `No player named ${arg} on this map.`), 'err'); return; }
    this.request(hit.o);
  },
  nearby() {
    return [...Online.others.values()].filter(o => o && o.name).map(o => ({ o, d: this.dist(o) })).sort((a, b) => a.d - b.d);
  },
  request(o) {
    if (!this.needOnline()) return;
    if (this.t) { UI.msg(this.t.state === 'req' ? L('กำลังรอคำตอบอยู่', 'Already waiting for a reply.') : L('กำลังแลกเปลี่ยนอยู่', 'Already trading.'), 'err'); this.show(); return; }
    const p = G.player;
    if (p.dead) { UI.msg(L('แลกเปลี่ยนไม่ได้ขณะล้มอยู่', 'You can\'t trade while fallen.'), 'err'); return; }
    if (!Online.others.has(o.id)) { UI.msg(L(`${o.name} ไม่ได้อยู่ในแผนที่นี้แล้ว`, `${o.name} is no longer on this map.`), 'err'); return; }
    if (o.dead) { UI.msg(L(`${o.name} ล้มอยู่ แลกเปลี่ยนไม่ได้`, `${o.name} has fallen and can't trade.`), 'err'); return; }
    if (this.dist(o) > TRADE_CFG.startRange) { UI.msg(L(`${o.name} อยู่ไกลเกินไป (ต้องห่างไม่เกิน ${TRADE_CFG.startRange} ช่อง)`, `${o.name} is too far away (must be within ${TRADE_CFG.startRange} tiles).`), 'err'); return; }
    this.join();
    this.note = null;
    this.t = { tid: Math.random().toString(36).slice(2, 10) + Date.now().toString(36), peer: o.id, name: o.name, state: 'req', reqAt: Date.now(), map: G.map.id };
    this.send('req', { name: p.name, map: G.map.id });
    UI.msg(L(`ส่งคำขอแลกเปลี่ยนไปยัง ${o.name}…`, `Trade request sent to ${o.name}…`), 'info');
    this.show();
  },
  onRequest(m) {
    const me = Online.user.id, p = G.player, o = Online.others.get(m.from);
    const reply = (ok, why) => this.sendTo(m.from, m.tid, 'res', { ok, why });
    if (this.t) {
      const t = this.t;
      // ต่างคนต่างขอกันพร้อมกัน: id น้อยกว่าเป็นฝ่ายขอ อีกฝ่ายเปลี่ยนเป็นผู้ตอบรับ
      if (t.state === 'req' && t.peer === m.from && me > m.from) this.t = null;
      else { if (t.tid !== m.tid) reply(false, 'busy'); return; }
    }
    if (!G.started || p.dead) { reply(false, 'busy'); return; }
    if (!o || m.map !== G.map.id || this.dist(o) > TRADE_CFG.startRange + 1) { reply(false, 'far'); return; }
    this.t = { tid: String(m.tid), peer: m.from, name: String(o.name || m.name || '?').slice(0, 24), state: 'inc', reqAt: Date.now(), map: G.map.id };
    UI.msg(L(`${this.t.name} ขอแลกเปลี่ยนไอเทมกับคุณ`, `${this.t.name} wants to trade items with you.`), 'info');
    Sound.play('emote');
    this.show();
  },
  accept() {
    const t = this.t;
    if (!t || t.state !== 'inc') return;
    const why = this.unsafe(t, Date.now());
    if (why) { this.decline(why); return; }
    this.sendTo(t.peer, t.tid, 'res', { ok: true });
    this.begin();
  },
  decline(why) {
    const t = this.t;
    if (!t || t.state !== 'inc') return;
    this.sendTo(t.peer, t.tid, 'res', { ok: false, why });
    this.t = null;
    UI.msg(why === 'decline' ? L(`ปฏิเสธการแลกเปลี่ยนกับ ${t.name}`, `Declined the trade with ${t.name}.`) : L(`คำขอแลกเปลี่ยนจาก ${t.name} ถูกยกเลิก: ${this.reason(why, false, t.name)}`, `Trade request from ${t.name} was cancelled: ${this.reason(why, false, t.name)}`), 'info');
    this.hide();
  },
  onResponse(m) {
    const t = this.t;
    if (t.state !== 'req') return;
    if (m.ok) { UI.msg(L(`${t.name} ตอบรับการแลกเปลี่ยน`, `${t.name} accepted the trade.`), 'info'); this.begin(); return; }
    const txt = { busy: L(`${t.name} กำลังทำรายการอื่นอยู่`, `${t.name} is busy with something else.`), decline: L(`${t.name} ปฏิเสธการแลกเปลี่ยน`, `${t.name} declined the trade.`), timeout: L(`${t.name} ไม่ตอบรับ`, `${t.name} didn't respond.`), far: L(`${t.name} อยู่ไกลเกินไป`, `${t.name} is too far away.`) }[m.why]
      || L(`${t.name} ไม่รับคำขอ: ${this.reason(m.why, true, t.name)}`, `${t.name} turned down the request: ${this.reason(m.why, true, t.name)}`);
    this.t = null;
    this.note = { text: txt, until: Date.now() + 6000 };
    UI.msg(txt, 'err');
    this.render();
  },
  begin() {
    const t = this.t, side = () => ({ items: [], zeny: 0, locked: false, confirmed: false, hash: '', offer: null, commit: false });
    Object.assign(t, { state: 'open', at: Date.now(), map: G.map.id, my: side(), their: side(), lostAt: 0 });
    this.pick = null; this.sel = null;
    UI.msg(L(`เริ่มแลกเปลี่ยนกับ ${t.name} — ใส่ไอเทม/${CUR} แล้วกด ล็อก`, `Trading with ${t.name} — add items/${CUR}, then press Lock.`), 'info');
    Sound.play('click');
    this.show();
  },

  // ---------------- ข้อความจากอีกฝ่าย ----------------
  onMsg(m) {
    if (!m || !Online.user || m.to !== Online.user.id || typeof m.k !== 'string' || !m.from || !m.tid) return;
    if (m.k === 'req') { this.onRequest(m); return; }
    const t = this.t;
    if (!t || m.tid !== t.tid || m.from !== t.peer) return; // ข้อความเก่า/ไม่เกี่ยวกับเรา
    switch (m.k) {
      case 'res': this.onResponse(m); break;
      case 'cancel': this.restore(t); this.end(L(`การแลกเปลี่ยนกับ ${t.name} ถูกยกเลิก: ${this.reason(m.why, true, t.name)}`, `Trade with ${t.name} was cancelled: ${this.reason(m.why, true, t.name)}`), 'err'); break;
      case 'offer': this.onOffer(m); break;
      case 'lock': this.onLock(m); break;
      case 'conf': this.onConfirm(m); break;
      case 'commit': this.onCommit(m); break;
    }
  },
  onOffer(m) {
    const t = this.t;
    if (t.state !== 'open') { this.abort('bad', true); return; } // หลังตกลงแล้วเปลี่ยนของไม่ได้
    const o = this.clean(m.offer);
    if (!o) { this.abort('bad', true); return; }
    const was = t.my.locked || t.their.locked;
    t.their.items = o.items; t.their.zeny = o.zeny;
    this.unlockAll();
    if (was) UI.msg(L(`${t.name} เปลี่ยนข้อเสนอ — ปลดล็อกทั้งสองฝ่าย`, `${t.name} changed their offer — both sides unlocked.`), 'info');
    if (this.sel && this.sel.side === 'their') this.sel = null;
    this.render();
  },
  onLock(m) {
    const t = this.t;
    if (t.state !== 'open') return;
    const o = this.clean(m.offer);
    if (!o || this.hash(o) !== m.hash) { this.abort('bad', true); return; }
    Object.assign(t.their, { items: o.items, zeny: o.zeny, offer: o, hash: m.hash, locked: true, confirmed: false });
    Sound.play('click');
    this.render();
  },
  onConfirm(m) {
    const t = this.t;
    if (t.state !== 'open' || !t.my.locked || !t.their.locked) return;
    // แฮชไม่ตรง = ข้อเสนอเพิ่งเปลี่ยนระหว่างทาง เมินไป (ข้อความปลดล็อกจะตามมาเอง)
    if (m.mine !== t.their.hash || m.theirs !== t.my.hash) return;
    t.their.confirmed = true;
    this.maybeCount();
    this.render();
  },
  onCommit(m) {
    const t = this.t;
    if (m.mine !== t.their.hash || m.theirs !== t.my.hash || (t.state !== 'count' && t.state !== 'commit')) { this.abort('bad', true); return; }
    t.their.commit = true;
    if (t.state === 'commit') this.finish();
  },

  // ---------------- ข้อเสนอของเรา ----------------
  editable() { const t = this.t; return !!t && t.state === 'open' && !t.my.confirmed; },
  offered(id) { const x = this.t && this.t.my.items.find(y => y.id === id && !y.uid); return x ? x.qty : 0; },
  snapEquip(e) { return { id: e.id, qty: 1, refine: e.refine || 0, cards: (e.cards || []).slice(), uid: e.uid }; },
  addOffer(e, qty) {
    if (!this.editable()) return;
    const t = this.t, it = ITEMS[e.id], my = t.my, p = G.player;
    if (!it || !p.inventory.includes(e)) return;
    if (isEquipType(it)) {
      if (e.uid == null) e.uid = G.uid++;
      if (my.items.some(x => x.uid === e.uid)) return;
      if (my.items.length >= TRADE_CFG.slots) { UI.msg(L(`วางของได้สูงสุด ${TRADE_CFG.slots} ช่อง`, `You can place up to ${TRADE_CFG.slots} slots.`), 'err'); return; }
      my.items.push(this.snapEquip(e));
    } else {
      const cur = my.items.find(x => x.id === e.id && !x.uid), room = countItem(e.id) - (cur ? cur.qty : 0);
      qty = U.clamp(Math.floor(+qty) || 0, 0, room);
      if (qty <= 0) return;
      if (cur) cur.qty += qty;
      else {
        if (my.items.length >= TRADE_CFG.slots) { UI.msg(L(`วางของได้สูงสุด ${TRADE_CFG.slots} ช่อง`, `You can place up to ${TRADE_CFG.slots} slots.`), 'err'); return; }
        my.items.push({ id: e.id, qty });
      }
    }
    this.pick = null;
    Sound.play('click');
    this.changed();
  },
  removeOffer(i) {
    if (!this.editable() || !this.t.my.items[i]) return;
    this.t.my.items.splice(i, 1);
    this.sel = null;
    this.changed();
  },
  setZeny(v, inp) {
    if (!this.editable()) return;
    const my = this.t.my;
    v = U.clamp(Math.floor(+v) || 0, 0, G.player.zeny);
    if (inp && inp.value !== String(v)) inp.value = String(v);
    if (v === my.zeny) return;
    my.zeny = v;
    this.changed();
  },
  // ช่อง Volt ที่ยังพิมพ์ค้าง: ใช้ค่าก่อนกดปุ่มใด ๆ ในหน้าต่าง (กด ล็อก ทันทีหลังพิมพ์ก็ได้ค่าล่าสุด)
  flush() {
    const a = document.activeElement;
    if (a && a.classList && a.classList.contains('tr-zeny')) { const v = a.value; a.blur(); this.setZeny(v); }
  },
  unlockAll() {
    for (const s of [this.t.my, this.t.their]) Object.assign(s, { locked: false, confirmed: false, hash: '', offer: null });
  },
  // ข้อเสนอเปลี่ยน: ปลดล็อกทั้งสองฝ่าย + ส่งของล่าสุดให้อีกฝ่ายเห็น
  changed() {
    const t = this.t, was = t.my.locked || t.their.locked;
    this.unlockAll();
    this.send('offer', { offer: this.mine() });
    if (was) UI.msg(L('ข้อเสนอเปลี่ยน — ปลดล็อกทั้งสองฝ่าย', 'Offer changed — both sides unlocked.'), 'info');
    this.render();
  },
  mine() {
    const my = this.t.my;
    return { items: my.items.map(x => (x.uid ? Object.assign({}, x, { cards: x.cards.slice() }) : { id: x.id, qty: x.qty })), zeny: my.zeny };
  },
  findEquip(x) {
    return G.player.inventory.find(e => e.uid === x.uid && e.id === x.id && (e.refine || 0) === (x.refine || 0) && JSON.stringify(e.cards || []) === JSON.stringify(x.cards || []));
  },
  // ยังมีของ/Volt ครบตามข้อเสนอไหม (ของที่สวมอยู่ไม่อยู่ในกระเป๋า จึงนับว่าไม่มี)
  owns(o) {
    if (G.player.zeny < o.zeny) return false;
    return o.items.every(x => (x.uid ? !!this.findEquip(x) : countItem(x.id) >= x.qty));
  },
  // ใช้/ทิ้ง/สวมของที่เสนอไประหว่างแลก → ปรับข้อเสนอตามจริง (= เปลี่ยนข้อเสนอ ปลดล็อก)
  revalidate() {
    const t = this.t, my = t.my;
    if (this.owns(this.mine())) return;
    my.items = my.items.filter(x => (x.uid ? !!this.findEquip(x) : (x.qty = Math.min(x.qty, countItem(x.id))) > 0));
    my.zeny = Math.min(my.zeny, G.player.zeny);
    my.confirmed = false;
    UI.msg(L('ของที่เสนอไว้ถูกใช้/ย้ายไป — ปรับข้อเสนอแล้ว', 'An offered item was used or moved — offer adjusted.'), 'info');
    this.changed();
  },

  // ---------------- ล็อก → ตกลง → นับถอยหลัง → สลับ ----------------
  lock() {
    const t = this.t;
    if (!t || t.state !== 'open' || t.my.locked) return;
    const o = this.mine();
    if (!this.owns(o)) { this.revalidate(); return; }
    Object.assign(t.my, { offer: o, hash: this.hash(o), locked: true, confirmed: false });
    this.pick = null;
    this.send('lock', { offer: o, hash: t.my.hash });
    Sound.play('click');
    this.render();
  },
  confirm() {
    const t = this.t;
    if (!t || t.state !== 'open' || !t.my.locked || !t.their.locked || t.my.confirmed) return;
    t.my.confirmed = true;
    this.send('conf', { mine: t.my.hash, theirs: t.their.hash });
    this.maybeCount();
    this.render();
  },
  maybeCount() {
    const t = this.t;
    if (t.state !== 'open' || !t.my.confirmed || !t.their.confirmed) return;
    t.state = 'count'; t.endAt = Date.now() + TRADE_CFG.countdown;
    Sound.play('buff');
  },
  commit() {
    const t = this.t;
    if (!this.owns(t.my.offer) || this.hash(this.mine()) !== t.my.hash) { this.abort('missing', true); return; }
    t.escrow = this.take(t.my.offer);
    t.state = 'commit'; t.commitAt = Date.now();
    this.send('commit', { mine: t.my.hash, theirs: t.their.hash });
    if (t.their.commit) this.finish(); else this.render();
  },
  // ย้ายของที่เสนอออกจากกระเป๋าไปพักไว้ (อุปกรณ์ย้ายทั้งชิ้นพร้อมค่าตีบวก/ชิป)
  take(o) {
    const p = G.player, esc = { items: [], zeny: o.zeny };
    for (const x of o.items) {
      if (x.uid) { const e = this.findEquip(x); p.inventory.splice(p.inventory.indexOf(e), 1); esc.items.push(e); continue; }
      let need = x.qty;
      for (const e of p.inventory.filter(y => y.id === x.id)) { const k = Math.min(need, e.qty); removeEntry(e, k); need -= k; if (!need) break; }
      esc.items.push({ id: x.id, qty: x.qty });
    }
    p.zeny -= o.zeny;
    UI.dirty();
    return esc;
  },
  restore(t) {
    const esc = t && t.escrow;
    if (!esc) return;
    const p = G.player;
    for (const e of esc.items) { if (e.uid) p.inventory.push(e); else addItem(e.id, e.qty, true); }
    p.zeny += esc.zeny;
    t.escrow = null;
    UI.dirty();
    saveGame(true, true);
  },
  finish() {
    const t = this.t, p = G.player, got = t.their.offer, gave = t.my.offer;
    for (const x of got.items) {
      if (isEquipType(ITEMS[x.id])) p.inventory.push({ id: x.id, qty: 1, uid: G.uid++, refine: x.refine || 0, cards: (x.cards || []).slice() });
      else addItem(x.id, x.qty, true);
    }
    p.zeny += got.zeny;
    t.escrow = null;
    UI.dirty();
    saveGame(true, true);
    Sound.play('buy');
    this.end(L(`แลกเปลี่ยนกับ ${t.name} สำเร็จ — ได้รับ: ${this.describe(got)} • ให้: ${this.describe(gave)}`, `Trade with ${t.name} complete — received: ${this.describe(got)} • gave: ${this.describe(gave)}`), 'item');
  },
  abort(why, notify) {
    const t = this.t;
    if (!t) return;
    if (notify) this.send('cancel', { why });
    this.restore(t);
    const txt = this.reason(why, false, t.name);
    if (t.state === 'req') {
      this.t = null;
      this.note = why === 'cancel' ? null : { text: txt, until: Date.now() + 6000 };
      UI.msg(why === 'cancel' ? L(`ยกเลิกคำขอแลกเปลี่ยนกับ ${t.name}`, `Cancelled the trade request to ${t.name}.`) : L(`คำขอแลกเปลี่ยนกับ ${t.name}: ${txt}`, `Trade request to ${t.name}: ${txt}`), why === 'cancel' ? 'info' : 'err');
      this.render();
      return;
    }
    this.end(L(`การแลกเปลี่ยนกับ ${t.name} ถูกยกเลิก: ${txt}`, `Trade with ${t.name} was cancelled: ${txt}`), 'err');
  },
  end(text, kind) {
    this.t = null; this.pick = null; this.sel = null;
    UI.msg(text, kind);
    this.hide();
  },
  // เหตุผลการยกเลิก (remote = อีกฝ่ายเป็นคนแจ้ง จึงกลับมุมมอง)
  reason(why, remote, n) {
    const R = {
      cancel: [L('คุณยกเลิก', 'you cancelled'), L(`${n} ยกเลิก`, `${n} cancelled`)], dead: [L('คุณล้มลง', 'you fell'), L(`${n} ล้มลง`, `${n} fell`)], peerdead: [L(`${n} ล้มลง`, `${n} fell`), L('คุณล้มลง', 'you fell')],
      map: [L('คุณออกจากแผนที่', 'you left the map'), L(`${n} ออกจากแผนที่`, `${n} left the map`)], gone: [L(`${n} ออกจากแผนที่`, `${n} left the map`), L('การเชื่อมต่อของคุณขาดหาย', 'your connection dropped')], left: [L('คุณออกจากเกม', 'you left the game'), L(`${n} ออกจากเกม`, `${n} left the game`)],
      far: [L(`อยู่ห่างกันเกิน ${TRADE_CFG.keepRange} ช่อง`, `more than ${TRADE_CFG.keepRange} tiles apart`), L(`อยู่ห่างกันเกิน ${TRADE_CFG.keepRange} ช่อง`, `more than ${TRADE_CFG.keepRange} tiles apart`)],
      timeout: [L('หมดเวลา 2 นาที', '2-minute time limit reached'), L('หมดเวลา 2 นาที', '2-minute time limit reached')], noreply: [L(`${n} ไม่ตอบรับ`, `${n} didn't respond`), L('หมดเวลาตอบรับ', 'response timed out')],
      missing: [L('ของที่คุณเสนอไม่ครบแล้ว', 'your offered items are no longer all there'), L(`ของที่ ${n} เสนอไม่ครบแล้ว`, `${n}'s offered items are no longer all there`)], bad: [L(`ข้อเสนอของ ${n} ไม่ตรงกัน`, `${n}'s offer didn't match`), L('ข้อเสนอไม่ตรงกัน', 'offers didn\'t match')],
      commit: [L('ไม่ได้รับการยืนยันจากอีกฝ่าย', 'no confirmation from the other side'), L('ไม่ได้รับการยืนยันจากอีกฝ่าย', 'no confirmation from the other side')], offline: [L('หลุดการเชื่อมต่อ', 'connection lost'), L(`${n} หลุดการเชื่อมต่อ`, `${n} lost connection`)],
      decline: [L('ปฏิเสธ', 'declined'), L(`${n} ปฏิเสธ`, `${n} declined`)], busy: [L('ไม่ว่าง', 'busy'), L(`${n} ไม่ว่าง`, `${n} is busy`)],
    }[why];
    return R ? R[remote ? 1 : 0] : L('ไม่ทราบสาเหตุ', 'unknown reason');
  },
  describe(o) {
    const parts = o.items.map(x => itemDisplayName(x) + (x.qty > 1 ? ` ×${U.fmt(x.qty)}` : ''));
    if (o.zeny) parts.push(`${U.fmt(o.zeny)} ${CUR}`);
    return parts.join(', ') || L('ไม่มี', 'nothing');
  },

  // ---------------- ข้อมูล/ความถูกต้อง ----------------
  // ตรวจข้อเสนอของอีกฝ่าย: ไอเทมต้องมีจริง จำนวนสมเหตุสมผล ไม่เกิน 10 ช่อง
  clean(o) {
    if (!o || !Array.isArray(o.items) || o.items.length > TRADE_CFG.slots) return null;
    const items = [];
    for (const x of o.items) {
      const it = x && typeof x.id === 'string' && Object.prototype.hasOwnProperty.call(ITEMS, x.id) ? ITEMS[x.id] : null;
      if (!it) return null;
      if (isEquipType(it)) {
        const refine = Math.floor(+x.refine) || 0, uid = Math.floor(+x.uid) || 0;
        const cards = Array.isArray(x.cards) ? x.cards.filter(c => ITEMS[c] && ITEMS[c].type === 'card').slice(0, it.slots || 0) : [];
        if (refine < 0 || refine > 10 || !uid) return null;
        items.push({ id: x.id, qty: 1, refine, cards, uid });
      } else {
        const qty = Math.floor(+x.qty);
        if (!(qty >= 1 && qty <= 1e6)) return null;
        items.push({ id: x.id, qty });
      }
    }
    const zeny = Math.floor(+o.zeny) || 0;
    if (zeny < 0 || zeny > 1e12) return null;
    return { items, zeny };
  },
  canon(o) {
    return JSON.stringify([this.t ? this.t.tid : '', Math.floor(+o.zeny) || 0,
      o.items.map(x => [x.id, Math.floor(+x.qty) || 0, Math.floor(+x.refine) || 0, (x.cards || []).slice(), Math.floor(+x.uid) || 0])]);
  },
  hash(o) { // cyrb53 (พอสำหรับเทียบว่าสองฝั่งเห็นข้อเสนอเดียวกัน)
    const s = this.canon(o);
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  },

  // ---------------- หน้าต่าง ----------------
  live(now) {
    const t = this.t, body = $('#w-trade .win-body');
    if (!t) {
      if (!Online.online || now - this.listAt < 500) return;
      this.listAt = now;
      const key = this.nearby().map(x => `${x.o.id}:${x.o.name}:${Math.round(x.d)}:${x.o.dead ? 1 : 0}`).join('|') + (this.note && this.note.until > now ? this.note.text : '');
      if (key !== this.listKey) this.render();
      return;
    }
    const tm = $('.tr-timer', body);
    if (tm) {
      const left = t.state === 'req' || t.state === 'inc' ? Math.max(0, Math.ceil((t.reqAt + TRADE_CFG.reqTimeout - now) / 1000)) : Math.max(0, Math.ceil((t.at + TRADE_CFG.timeout - now) / 1000));
      const txt = t.state === 'inc' ? L(`ตอบภายใน ${left} วินาที`, `Reply within ${left}s`) : t.state === 'req' ? L(`${left} วินาที`, `${left}s`) : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
      if (tm.textContent !== txt) tm.textContent = txt;
      tm.classList.toggle('warn', t.state !== 'req' && t.state !== 'inc' && left <= 20);
    }
    if (t.state === 'count') {
      const left = Math.max(0, t.endAt - now), c = $('.tr-count', body), bar = $('.tr-bar i', body);
      if (c) c.textContent = L(`แลกเปลี่ยนใน ${(left / 1000).toFixed(1)} วินาที`, `Trading in ${(left / 1000).toFixed(1)}s`);
      if (bar) bar.style.width = `${(1 - left / TRADE_CFG.countdown) * 100}%`;
    }
  },
  render() {
    const w = $('#w-trade');
    if (!w || w.classList.contains('hidden') || typeof G === 'undefined' || !G.player) return;
    const body = $('.win-body', w), t = this.t;
    const keep = this.saveFocus(body);
    body.innerHTML = '';
    const trading = !!t && !!t.my;
    w.classList.toggle('tr-wide', trading);
    $('.win-title span', w).textContent = trading ? L(`แลกเปลี่ยนกับ ${t.name}`, `Trade with ${t.name}`) : L('แลกเปลี่ยน (Trade)', 'Trade');
    if (!Online.online) body.append(this.viewOffline());
    else if (!t) body.append(this.viewList());
    else if (t.state === 'req') body.append(this.viewWaiting());
    else if (t.state === 'inc') body.append(this.viewIncoming());
    else body.append(this.viewTrade());
    this.restoreFocus(body, keep);
    this.live(Date.now());
  },
  saveFocus(body) {
    const a = document.activeElement;
    if (!a || !body.contains(a) || !a.dataset.focus) return null;
    return { key: a.dataset.focus, value: a.value };
  },
  restoreFocus(body, keep) {
    if (!keep) return;
    const el = $(`[data-focus="${keep.key}"]`, body);
    if (el && !el.disabled) { el.value = keep.value; el.focus(); }
  },
  avatar(name, cls) { return h('span', { class: 'tr-av' + (cls ? ' ' + cls : ''), 'aria-hidden': 'true' }, [...String(name || '?')][0].toUpperCase()); },

  viewOffline() {
    return h('div', { class: 'tr-empty' },
      h('span', { class: 'tr-empty-ic', html: TRADE_ICON }),
      h('b', {}, L('ต้องออนไลน์', 'Online Only')),
      h('p', {}, L('การแลกเปลี่ยนไอเทมกับผู้เล่นอื่นใช้ได้เมื่อล็อกอินและเชื่อมต่อเซิร์ฟเวอร์ออนไลน์', 'Trading items with other players is available when logged in and connected to the online server.')));
  },
  viewList() {
    const now = Date.now(), list = this.nearby();
    this.listKey = list.map(x => `${x.o.id}:${x.o.name}:${Math.round(x.d)}:${x.o.dead ? 1 : 0}`).join('|') + (this.note && this.note.until > now ? this.note.text : '');
    const wrap = h('div', { class: 'tr-list' });
    if (this.note && this.note.until > now) wrap.append(h('div', { class: 'tr-note' }, this.note.text));
    wrap.append(h('div', { class: 'tr-sec' }, L('ผู้เล่นในแผนที่นี้', 'Players on This Map'), h('small', {}, String(list.length))));
    if (!list.length) wrap.append(h('div', { class: 'tr-none' }, L('ยังไม่มีผู้เล่นอื่นในแผนที่นี้', 'No other players on this map yet')));
    for (const { o, d } of list) {
      const ok = d <= TRADE_CFG.startRange && !o.dead;
      wrap.append(h('div', { class: 'tr-prow' + (ok ? '' : ' far') },
        this.avatar(o.name),
        h('div', { class: 'tr-pn' }, h('b', {}, o.name), h('small', {}, L(`Lv ${o.baseLv || '?'} ${JOBS[o.job] ? JOBS[o.job].name : ''} • ${Math.round(d)} ช่อง`, `Lv ${o.baseLv || '?'} ${JOBS[o.job] ? JOBS[o.job].name : ''} • ${Math.round(d)} tiles`))),
        h('button', { type: 'button', class: 'btn small tr-go', disabled: !ok, 'data-peer': o.id, onclick: () => this.request(o) }, ok ? L('แลกเปลี่ยน', 'Trade') : o.dead ? L('ล้มอยู่', 'Fallen') : L('ไกลเกินไป', 'Too far'))));
    }
    wrap.append(h('div', { class: 'hint' }, L(`เข้าใกล้ไม่เกิน ${TRADE_CFG.startRange} ช่องเพื่อขอแลกเปลี่ยน • พิมพ์ /trade ชื่อ ในแชทก็ได้`, `Get within ${TRADE_CFG.startRange} tiles to request a trade • You can also type /trade name in chat`)));
    return wrap;
  },
  viewWaiting() {
    const t = this.t;
    return h('div', { class: 'tr-wait' },
      h('div', { class: 'tr-ring' }, this.avatar(t.name, 'big')),
      h('div', { class: 'tr-wait-t' }, L('กำลังรอ ', 'Waiting for '), h('b', {}, t.name), L(' ตอบรับ…', ' to respond…')),
      h('div', { class: 'tr-timer tr-sub' }),
      h('div', { class: 'tr-btns' }, h('button', { type: 'button', class: 'btn tr-cancel', onclick: () => this.abort('cancel', true) }, L('ยกเลิกคำขอ', 'Cancel Request'))));
  },
  viewIncoming() {
    const t = this.t;
    return h('div', { class: 'tr-wait' },
      h('div', { class: 'tr-ring in' }, this.avatar(t.name, 'big')),
      h('div', { class: 'tr-wait-t' }, h('b', {}, t.name), L(' ขอแลกเปลี่ยนไอเทมกับคุณ', ' wants to trade items with you')),
      h('div', { class: 'tr-timer tr-sub' }),
      h('div', { class: 'tr-btns' },
        h('button', { type: 'button', class: 'btn tr-primary tr-accept', onclick: () => this.accept() }, L('ยอมรับ', 'Accept')),
        h('button', { type: 'button', class: 'btn tr-decline', onclick: () => this.decline('decline') }, L('ปฏิเสธ', 'Decline'))));
  },
  viewTrade() {
    const t = this.t, my = t.my, th = t.their, both = my.locked && th.locked;
    const step = t.state === 'commit' ? L('กำลังสลับของ…', 'Swapping items…')
      : t.state === 'count' ? ''
      : my.confirmed ? L(`รอ ${t.name} กดตกลง…`, `Waiting for ${t.name} to confirm…`)
      : th.confirmed ? L(`${t.name} กดตกลงแล้ว — ตรวจให้ดีแล้วกด ตกลง`, `${t.name} confirmed — check carefully, then press OK`)
      : both ? L('ล็อกทั้งคู่แล้ว — ตรวจของให้ดีแล้วกด ตกลง', 'Both locked — check the items carefully, then press OK')
      : my.locked ? L(`รอ ${t.name} ล็อก…`, `Waiting for ${t.name} to lock…`)
      : th.locked ? L(`${t.name} ล็อกแล้ว — ใส่ของให้ครบแล้วกด ล็อก`, `${t.name} locked — finish adding items, then press Lock`)
      : L(`ใส่ไอเทม/${CUR} แล้วกด ล็อก`, `Add items/${CUR}, then press Lock`);
    const wrap = h('div', { class: 'tr-trade' + (t.state === 'count' || t.state === 'commit' ? ' sealing' : '') });
    wrap.append(h('div', { class: 'tr-head' },
      t.state === 'count' ? h('span', { class: 'tr-step tr-count' }) : h('span', { class: 'tr-step' }, step),
      h('span', { class: 'tr-timer', title: L('เวลาที่เหลือ', 'Time remaining') })));
    wrap.append(h('div', { class: 'tr-bar' + (t.state === 'count' ? ' on' : t.state === 'commit' ? ' on full' : '') }, h('i'))); // แถบนับถอยหลัง (live() เลื่อนให้)
    wrap.append(h('div', { class: 'tr-cols' }, this.column('my', L('ของคุณ', 'Your Offer'), my), this.column('their', L(`ของ ${t.name}`, `${t.name}'s Offer`), th)));
    const det = this.detail();
    if (det) wrap.append(det);
    if (this.editable()) wrap.append(this.picker());
    wrap.append(h('div', { class: 'tr-acts' },
      h('button', { type: 'button', class: 'btn tr-lock' + (my.locked ? ' on' : ''), disabled: t.state !== 'open' || my.locked, onclick: () => this.lock() }, my.locked ? L('ล็อกแล้ว', 'Locked') : L('ล็อก', 'Lock')),
      h('button', { type: 'button', class: 'btn tr-ok' + (both && !my.confirmed && t.state === 'open' ? ' tr-primary' : '') + (my.confirmed ? ' on' : ''), disabled: !both || my.confirmed || t.state !== 'open', onclick: () => this.confirm() }, my.confirmed ? L('ตกลงแล้ว', 'Confirmed') : L('ตกลง', 'OK')),
      h('button', { type: 'button', class: 'btn danger tr-cancel', disabled: t.state === 'commit', onclick: () => this.abort('cancel', true) }, L('ยกเลิก', 'Cancel'))));
    return wrap;
  },
  column(side, title, s) {
    const t = this.t, mineSide = side === 'my';
    const st = s.confirmed ? ['ok', L('ตกลงแล้ว', 'Confirmed')] : s.locked ? ['lock', L('ล็อกแล้ว', 'Locked')] : ['', L('กำลังเลือก', 'Choosing')];
    const grid = h('div', { class: 'tr-slots' });
    for (let i = 0; i < TRADE_CFG.slots; i++) {
      const x = s.items[i];
      if (!x) { grid.append(h('div', { class: 'inv-cell empty tr-slot' })); continue; }
      const it = ITEMS[x.id], sel = this.sel && this.sel.side === side && this.sel.i === i;
      grid.append(h('button', {
        type: 'button', class: 'inv-cell tr-slot' + (sel ? ' sel' : ''), 'data-id': x.id, title: itemDisplayName(x) + (x.qty > 1 ? ` ×${x.qty}` : ''),
        onclick: () => { this.sel = sel ? null : { side, i }; this.render(); },
      },
      h('img', { src: itemIconUrl(x.id), alt: '' }),
      isEquipType(it) ? null : h('span', { class: 'q' }, U.fmt(x.qty)),
      x.refine ? h('span', { class: 'rf' }, '+' + x.refine) : null,
      it.slots ? h('span', { class: 'tr-holes' }, Array.from({ length: it.slots }, (_, k) => h('i', { class: k < (x.cards || []).length ? 'on' : '' }))) : null));
    }
    let volt;
    if (mineSide && this.editable()) {
      const inp = h('input', { type: 'number', class: 'tr-zeny', min: 0, max: G.player.zeny, step: 1, value: String(s.zeny), 'data-focus': 'zeny', inputmode: 'numeric', 'aria-label': L(`จำนวน ${CUR} ที่เสนอ`, `Amount of ${CUR} to offer`) });
      inp.addEventListener('change', () => this.setZeny(inp.value, inp));
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } e.stopPropagation(); });
      volt = h('label', { class: 'tr-volt edit' }, h('i', { class: 'tr-vi', html: TRADE_VOLT }), inp, h('small', {}, `/ ${U.fmt(G.player.zeny)}`));
    } else volt = h('div', { class: 'tr-volt' }, h('i', { class: 'tr-vi', html: TRADE_VOLT }), h('b', { class: 'tr-zv' }, U.fmt(s.zeny)), h('small', {}, CUR));
    return h('div', { class: `tr-col ${side} ${st[0]}` },
      h('div', { class: 'tr-col-h' }, h('span', { class: 'tr-col-t' }, title), h('span', { class: 'tr-st' }, st[1])),
      grid, volt);
  },
  // รายละเอียดช่องที่เลือก (ชื่อ ค่าตีบวก ชิป ค่าพลัง) + ปุ่มนำออกสำหรับของเรา
  detail() {
    const t = this.t, s = this.sel && (this.sel.side === 'my' ? t.my : t.their), x = s && s.items[this.sel.i];
    if (!x) return null;
    const it = ITEMS[x.id], lines = UI.itemTooltip(x);
    return h('div', { class: 'tr-detail' },
      h('img', { src: itemIconUrl(x.id), alt: '' }),
      h('div', { class: 'tr-dt' },
        h('b', {}, itemDisplayName(x), x.qty > 1 ? h('small', {}, ` ×${U.fmt(x.qty)}`) : null),
        h('small', {}, lines.length ? lines.join(' • ') : (it.desc || ''))),
      this.sel.side === 'my' && this.editable() ? h('button', { type: 'button', class: 'btn small tr-rm', onclick: () => this.removeOffer(this.sel.i) }, L('นำออก', 'Remove')) : null);
  },
  // กระเป๋าของเรา: แตะเพื่อเสนอ (ของกองเลือกจำนวนได้) • ของที่สวมอยู่ไม่อยู่ในกระเป๋า จึงเสนอไม่ได้
  picker() {
    const p = G.player, t = this.t, wrap = h('div', { class: 'tr-pick' });
    const left = e => (isEquipType(ITEMS[e.id]) ? (t.my.items.some(x => x.uid && x.uid === e.uid) ? 0 : 1) : countItem(e.id) - this.offered(e.id));
    const inv = p.inventory.filter(e => ITEMS[e.id]);
    wrap.append(h('div', { class: 'tr-sec' }, L('กระเป๋า — แตะเพื่อเสนอ', 'Bag — tap to offer'), h('small', {}, L(`${t.my.items.length}/${TRADE_CFG.slots} ช่อง`, `${t.my.items.length}/${TRADE_CFG.slots} slots`))));
    const grid = h('div', { class: 'tr-inv' });
    for (const e of inv) {
      const it = ITEMS[e.id], n = left(e), picked = this.pick === e;
      grid.append(h('button', {
        type: 'button', class: 'inv-cell tr-icell' + (n <= 0 ? ' used' : '') + (picked ? ' sel' : ''), disabled: n <= 0, 'data-id': e.id,
        title: `${itemDisplayName(e)}${isEquipType(it) ? '' : L(` (เหลือ ${n})`, ` (${n} left)`)}`,
        onclick: () => {
          if (isEquipType(it) || n === 1) { this.addOffer(e, 1); return; }
          this.pick = picked ? null : e; this.pickQty = n; this.render();
        },
      },
      h('img', { src: itemIconUrl(e.id), alt: '' }),
      isEquipType(it) ? null : h('span', { class: 'q' }, U.fmt(n)),
      e.refine ? h('span', { class: 'rf' }, '+' + e.refine) : null));
    }
    if (!inv.length) grid.append(h('div', { class: 'tr-none' }, L('กระเป๋าว่าง', 'Bag is empty')));
    wrap.append(grid);
    const e = this.pick && p.inventory.includes(this.pick) ? this.pick : null;
    if (e) {
      const max = left(e);
      const inp = h('input', { type: 'number', class: 'tr-qn', min: 1, max, step: 1, value: String(U.clamp(this.pickQty, 1, max)), 'data-focus': 'qty', inputmode: 'numeric', 'aria-label': L('จำนวน', 'Quantity') });
      const set = v => { inp.value = String(U.clamp(Math.floor(+v) || 1, 1, max)); this.pickQty = +inp.value; };
      inp.addEventListener('input', () => { this.pickQty = Math.floor(+inp.value) || 1; });
      inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); set(inp.value); this.addOffer(e, +inp.value); } ev.stopPropagation(); });
      wrap.append(h('div', { class: 'tr-qty' },
        h('img', { src: itemIconUrl(e.id), alt: '' }),
        h('span', { class: 'tr-qty-n' }, ITEMS[e.id].name),
        h('span', { class: 'tr-step-btns' },
          h('button', { type: 'button', class: 'btn small', 'aria-label': L('ลด', 'Decrease'), onclick: () => set(+inp.value - 1) }, '−'),
          inp,
          h('button', { type: 'button', class: 'btn small', 'aria-label': L('เพิ่ม', 'Increase'), onclick: () => set(+inp.value + 1) }, '+'),
          h('button', { type: 'button', class: 'btn small', onclick: () => set(max) }, L('ทั้งหมด', 'All'))),
        h('button', { type: 'button', class: 'btn small tr-primary tr-add', onclick: () => { set(inp.value); this.addOffer(e, +inp.value); } }, L('ใส่', 'Add'))));
    }
    return wrap;
  },
};
Trade.boot();
