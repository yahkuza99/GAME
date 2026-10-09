'use strict';
// ============================================================
//  ตลาดผู้เล่น (แบบ RO): แผงขายของ (Vending) + บอร์ดตลาดรวมทุกแผนที่
//  • เปิดแผงได้ในเมือง (แผนที่ kind 'town') ตั้งชื่อร้าน + ของได้สูงสุด 12 ช่อง (จำนวน + ราคา Volt ต่อชิ้น)
//    ตัวละครนั่งลงพร้อมป้ายเหนือหัว ทิ้งไว้ AFK ได้ • เดินออก/ย้ายแผนที่/ล้ม/หลุดออนไลน์/ปิดเกม = ร้านปิด
//  • ผู้เล่นอื่นคลิกที่แผง (หรือเปิดจากบอร์ดตลาด) เพื่อดูและซื้อ • ผู้ขายต้องออนไลน์อยู่เท่านั้น
//
//  สื่อสารผ่านช่อง broadcast "market" ของ Supabase (ช่องเดียวทั้งเกม ไม่มีตาราง ไม่แตะฐานข้อมูล) — แบบเดียวกับ trade.js / party.js
//    ad   ร้านประกาศรายการ (heartbeat ทุก 3 วิ + ทันทีเมื่อเปลี่ยน) • ไม่ได้ยิน 12 วิ = ร้านหายจากบอร์ด
//    off  ร้านปิด • ask คนที่เพิ่งเข้าขอให้ทุกร้านประกาศใหม่
//    buy  ผู้ซื้อ → ผู้ขาย { tid, ช่อง, จำนวน, ราคา, แฮชของช่อง } • res ผู้ขาย → ผู้ซื้อ { tid, ok, why }
//  กันของซ้ำ/โกง (เท่าที่เกมแบบเครื่องใครเครื่องมันทำได้ — ใช้แนวเดียวกับ trade.js):
//  • ผู้ขาย: เปิดร้าน = ย้ายของออกจากกระเป๋าไปพักไว้ (escrow) ใน p.vend ซึ่งอยู่ในเซฟ → ปิดเกมกลางคัน เข้าเกมใหม่ได้ของคืน
//  • ผู้ซื้อ: กันเงินไว้ก่อนส่งคำขอ (escrow) แล้วส่งแฮชของช่องที่เห็น • ผู้ขายตรวจ ร้าน/ช่อง/แฮช/ราคา/ของเหลือ
//    → หักของ + รับเงิน + เซฟทันที → ตอบ ok → ผู้ซื้อรับของ + เซฟทันที • ไม่ผ่าน/ไม่ตอบ 8 วิ = คืนเงินที่กันไว้
//  • ผู้ซื้อหลายคนพร้อมกัน: ผู้ขายรับทีละข้อความ ใครถึงก่อนได้ คนถัดไปได้ "หมดแล้ว" • tid ซ้ำ = ส่งคำตอบเดิม ไม่ขายซ้ำ
//  • คำตอบ ok ที่มาช้าหลังคืนเงินไปแล้ว: ส่งของให้และหักเงินอีกครั้ง (เท่าที่มี) — ผู้ขายหักของไปแล้ว
// ============================================================

const MARKET_CFG = { slots: 12, titleMax: 30, maxPrice: 1e9, hb: 3000, expire: 12000, buyWait: 8000, moveLimit: 1.2, lateKeep: 60000 };
// ภาษีขาย (0–1) หักจากเงินที่ผู้ขายได้ = ที่ทิ้ง Volt ออกจากเกม • ค่าเริ่มต้น 0 (ไม่หัก)
const MARKET_TAX = 0;
const MARKET_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 9.5L5 4.5h14l1.5 5"/><path d="M3.5 9.5c0 1.5 1.2 2.5 2.7 2.5s2.7-1 2.7-2.5c0 1.5 1.2 2.5 2.8 2.5s2.8-1 2.8-2.5c0 1.5 1.2 2.5 2.7 2.5s2.7-1 2.7-2.5"/><path d="M5 12v7.5h14V12"/><path d="M10 19.5v-4.5h4v4.5"/></svg>';
const MARKET_TYPES = [['all', L('ทั้งหมด', 'All')], ['use', L('ของใช้', 'Usable')], ['weapon', L('อาวุธ', 'Weapon')], ['armor', L('ชุดเกราะ', 'Armor')], ['card', L('ชิป', 'Chip')], ['etc', L('อื่น ๆ', 'Etc')]];

const Market = {
  ch: null, uiReady: false, wasOpen: false,
  stalls: new Map(),   // id ผู้ขาย → ร้าน { id, sid, name, map, x, y, title, items:[{ i, id, qty, price, refine, cards, uid }], seen }
  mine: null,          // ร้านของเรา (อ้างถึง G.player.vend ที่อยู่ในเซฟ) — null = ไม่ได้เปิด
  owner: null,         // ตัวละครที่เปิดร้าน (สลับตัวละคร = ร้านปิด)
  done: new Map(),     // tid → คำตอบที่ส่งไปแล้ว (คำขอซ้ำ = ส่งคำตอบเดิม ไม่ขายซ้ำ)
  pend: null,          // คำขอซื้อที่รอคำตอบ (เงินกันไว้แล้ว)
  late: new Map(),     // tid → คำขอที่หมดเวลา/คืนเงินแล้ว (รอรับคำตอบ ok ที่มาช้า)
  sales: [],           // บันทึกการขายของร้านเรา (รอบนี้)
  view: 'board', shop: null, q: '', type: 'all', sort: 'price', draft: null, pick: null, renderKey: '', lastAd: 0, lastAsk: 0, navTo: null,

  boot() {
    if (typeof SAVE_FIELDS !== 'undefined' && !SAVE_FIELDS.includes('vend')) SAVE_FIELDS.push('vend'); // ของที่พักไว้ในร้าน (คืนได้ถ้าปิดเกมกลางคัน)
    setInterval(() => { try { this.tick(); } catch (e) { console.warn('market tick', e); } }, 250);
    window.addEventListener('pagehide', () => { if (this.mine) this.send({ k: 'off', sid: this.mine.sid }); });
  },
  me() { return Online.user ? Online.user.id : null; },
  join() {
    if (this.ch || !Online.online || !Online.sb) return;
    this.ch = Online.sb.channel('market', { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'mk' }, ({ payload }) => { try { this.onMsg(payload); } catch (e) { console.warn('market msg', e); } })
      .subscribe(st => { if (st === 'SUBSCRIBED') { this.send({ k: 'ask' }); if (this.mine) this.announce(true); } });
  },
  send(data) {
    if (!this.ch || !Online.user) return;
    this.ch.send({ type: 'broadcast', event: 'mk', payload: Object.assign({ from: this.me() }, data) });
  },
  needOnline() {
    if (Online.online) return true;
    UI.msg(L('ตลาดต้องออนไลน์ — ล็อกอินบัญชีออนไลน์และเชื่อมต่อเซิร์ฟเวอร์ก่อน', 'The market needs online — log in with an online account and connect to the server first.'), 'err');
    return false;
  },
  cleanText(s, n) { return String(s || '').replace(/[\u0000-\u001f<>"]/g, '').trim().slice(0, n); },

  // ---------------- ทุก 250 ms ----------------
  tick() {
    if (typeof G === 'undefined' || !G.started || !G.player || !G.map) return;
    if (!this.uiReady) this.setupUi();
    if (Online.online) this.join();
    const p = G.player, now = Date.now();
    // ร้านที่เปิดค้างจากรอบก่อน (ปิดเกม/หลุดกลางคัน) → คืนของให้
    if (this.mine && this.owner !== p) this.drop();
    if (p.vend && !this.mine) this.recover(p);
    if (this.mine) this.guard(p);
    if (this.pend && now - this.pend.at > MARKET_CFG.buyWait) this.timeoutBuy();
    for (const [k, v] of this.late) if (now - v.at > MARKET_CFG.lateKeep) this.late.delete(k);
    for (const [k, v] of this.done) if (now - v.at > MARKET_CFG.lateKeep) this.done.delete(k);
    for (const [id, s] of this.stalls) if (now - s.seen > MARKET_CFG.expire) this.stalls.delete(id);
    if (this.mine && now - this.lastAd > MARKET_CFG.hb) this.announce(false);
    // นำทางไปร้านจากบอร์ด: ถึงแล้ว (เดินจบ) = เปิดหน้าร้านให้เลย
    if (this.navTo && !Nav.target) {
      const s = this.stalls.get(this.navTo);
      if (s && s.map === G.map.id && U.dist(p.x, p.y, s.x, s.y) < 3) this.openShop(s.id);
      this.navTo = null;
    }
    if (this.isOpen()) this.refresh();
  },
  // ร้านเราต้องอยู่ในเงื่อนไข: ออนไลน์ แผนที่เดิม ไม่ล้ม ไม่เดินออกจากจุดตั้งร้าน
  guard(p) {
    const v = this.mine;
    if (!Online.online) this.close('offline');
    else if (p.dead) this.close('dead');
    else if (G.map.id !== v.map) this.close('map');
    else if (U.dist(p.x, p.y, v.x, v.y) > MARKET_CFG.moveLimit) this.close('moved');
  },

  // ---------------- ข้อความ ----------------
  onMsg(m) {
    if (!m || typeof m.k !== 'string' || !m.from || m.from === this.me() || !G.started) return;
    switch (m.k) {
      case 'ad': this.onAd(m); break;
      case 'off': { const s = this.stalls.get(m.from); if (s && (!m.sid || s.sid === m.sid)) { this.stalls.delete(m.from); if (this.shop === m.from) this.refresh(true); } break; }
      case 'ask': if (this.mine && Date.now() - this.lastAd > 800) setTimeout(() => this.announce(true), 100 + Math.random() * 400); break;
      case 'buy': if (m.to === this.me()) this.onBuy(m); break;
      case 'res': if (m.to === this.me()) this.onRes(m); break;
    }
  },
  onAd(m) {
    if (!MAP_DEFS[m.map] || !Array.isArray(m.items) || m.items.length > MARKET_CFG.slots || typeof m.sid !== 'string') return;
    const items = [];
    for (const x of m.items) { const c = this.cleanLine(x); if (c) items.push(c); }
    const num = v => (Number.isFinite(+v) ? +v : 0);
    this.stalls.set(m.from, {
      id: m.from, sid: m.sid.slice(0, 40), name: this.cleanText(m.name, 24) || '?', title: this.cleanText(m.title, MARKET_CFG.titleMax) || 'Shop',
      map: m.map, x: num(m.x), y: num(m.y), items, seen: Date.now(),
    });
  },
  // ช่องสินค้าจากเครือข่าย: ไอเทมต้องมีจริง จำนวน/ราคาสมเหตุสมผล (แนวเดียวกับ Trade.clean)
  cleanLine(x) {
    const it = x && typeof x.id === 'string' && Object.prototype.hasOwnProperty.call(ITEMS, x.id) ? ITEMS[x.id] : null;
    if (!it) return null;
    const i = Math.floor(+x.i), qty = Math.floor(+x.qty), price = Math.floor(+x.price);
    if (!(i >= 0 && i < MARKET_CFG.slots) || !(qty >= 1 && qty <= 1e6) || !(price >= 1 && price <= MARKET_CFG.maxPrice)) return null;
    if (isEquipType(it)) {
      const refine = Math.floor(+x.refine) || 0, uid = Math.floor(+x.uid) || 0;
      if (refine < 0 || refine > 10 || !uid || qty !== 1) return null;
      return { i, id: x.id, qty: 1, price, refine, uid, cards: Array.isArray(x.cards) ? x.cards.filter(c => ITEMS[c] && ITEMS[c].type === 'card').slice(0, it.slots || 0) : [] };
    }
    return { i, id: x.id, qty, price };
  },
  // แฮชของช่องสินค้า (cyrb53 แบบเดียวกับ Trade.hash) — ผู้ซื้อส่งแฮชของสิ่งที่เห็น ผู้ขายเทียบกับของจริง
  lineHash(sid, x) {
    const s = JSON.stringify([sid, x.i, x.id, x.price, Math.floor(+x.uid) || 0, Math.floor(+x.refine) || 0, (x.cards || []).slice()]);
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  },

  // ---------------- ร้านของเรา ----------------
  inTown() { return !!G.map && G.map.def.kind === 'town'; },
  // เปิดร้านจากร่าง: ตรวจทุกช่องว่ายังมีของจริง → ย้ายของเข้า escrow (p.vend อยู่ในเซฟ) → นั่ง → ประกาศ
  open() {
    if (!this.needOnline()) return false;
    const p = G.player, d = this.draft;
    if (this.mine) { UI.msg(L('คุณเปิดร้านอยู่แล้ว', 'Your stall is already open.'), 'err'); return false; }
    if (!this.inTown()) { UI.msg(L('เปิดร้านได้เฉพาะในเมือง (Neo Eldheim)', 'Stalls can only be opened in town (Neo Eldheim).'), 'err'); return false; }
    if (p.dead) { UI.msg(L('เปิดร้านไม่ได้ขณะล้มอยู่', 'You can\'t open a stall while fallen.'), 'err'); return false; }
    if (typeof Trade !== 'undefined' && Trade.t) { UI.msg(L('จบการแลกเปลี่ยนก่อน จึงจะเปิดร้านได้', 'Finish your trade before opening a stall.'), 'err'); return false; }
    if (this.pend) { UI.msg(L('รอการซื้อที่ค้างอยู่ให้เสร็จก่อน', 'Wait for your pending purchase to finish first.'), 'err'); return false; }
    if (!d || !d.lines.length) { UI.msg(L('ใส่ของอย่างน้อย 1 ช่องก่อนเปิดร้าน', 'Add at least one item before opening the stall.'), 'err'); return false; }
    for (const x of d.lines) {
      if (!(x.price >= 1 && x.price <= MARKET_CFG.maxPrice)) { UI.msg(L(`ตั้งราคา ${ITEMS[x.id].name} ให้ถูกต้อง (1–${U.fmt(MARKET_CFG.maxPrice)} ${CUR})`, `Set a valid price for ${ITEMS[x.id].name} (1–${U.fmt(MARKET_CFG.maxPrice)} ${CUR}).`), 'err'); return false; }
      if (x.uid ? !this.findEquip(x) : countItem(x.id) < x.qty) { UI.msg(L(`${ITEMS[x.id].name} ในกระเป๋าไม่พอแล้ว — ปรับรายการใหม่`, `Not enough ${ITEMS[x.id].name} in your bag any more — adjust the list.`), 'err'); this.fixDraft(); this.refresh(true); return false; }
    }
    const items = [];
    d.lines.forEach((x, i) => {
      if (x.uid) { const e = this.findEquip(x); p.inventory.splice(p.inventory.indexOf(e), 1); items.push({ i, id: e.id, qty: 1, price: x.price, uid: e.uid, refine: e.refine || 0, cards: (e.cards || []).slice() }); return; }
      let need = x.qty;
      for (const e of p.inventory.filter(y => y.id === x.id)) { const k = Math.min(need, e.qty); removeEntry(e, k); need -= k; if (!need) break; }
      items.push({ i, id: x.id, qty: x.qty, price: x.price });
    });
    const title = this.cleanText(d.title, MARKET_CFG.titleMax) || L(`ร้านของ ${p.name}`, `${p.name}'s Shop`);
    p.vend = { sid: Math.random().toString(36).slice(2, 10) + Date.now().toString(36), title, map: G.map.id, x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100, items, earned: 0, at: Date.now() };
    this.mine = p.vend; this.owner = p; this.sales = []; this.draft = null; this.pick = null;
    p.path = []; p.target = null; p.sitting = true;
    if (typeof Bot !== 'undefined' && Bot.on) Bot.toggle(false);
    UI.dirty();
    saveGame(true, true);
    this.join();
    this.announce(true);
    UI.msg(L(`เปิดร้าน "${title}" แล้ว — ผู้เล่นอื่นคลิกที่ป้ายเพื่อซื้อ • เดินออกจากจุดนี้ = ปิดร้าน`, `Stall "${title}" is open — other players click your sign to buy • Walking away closes it`), 'info');
    Sound.play('buff');
    return true;
  },
  // ปิดร้าน: คืนของที่ยังขายไม่หมดเข้ากระเป๋า + เซฟทันที
  close(why) {
    const v = this.mine;
    if (!v) return;
    this.send({ k: 'off', sid: v.sid });
    const p = this.owner || G.player;
    this.mine = null; this.owner = null;
    const back = this.restoreItems(p, v);
    p.vend = null;
    UI.dirty();
    saveGame(true, true);
    const txt = {
      user: L('ปิดร้านแล้ว', 'Stall closed.'), soldout: L('ขายหมดแล้ว — ปิดร้าน', 'Sold out — stall closed.'), offline: L('หลุดการเชื่อมต่อ — ปิดร้าน', 'Connection lost — stall closed.'),
      dead: L('คุณล้มลง — ปิดร้าน', 'You fell — stall closed.'), map: L('ออกจากแผนที่ — ปิดร้าน', 'You left the map — stall closed.'), moved: L('เดินออกจากร้าน — ปิดร้าน', 'You walked away — stall closed.'),
    }[why] || L('ปิดร้านแล้ว', 'Stall closed.');
    UI.msg(back ? L(`${txt} ของที่เหลือคืนเข้ากระเป๋า: ${back}`, `${txt} Unsold items returned to your bag: ${back}`) : txt, why === 'user' || why === 'soldout' ? 'info' : 'err');
    if (this.view === 'mine') this.refresh(true);
  },
  // สลับตัวละครระหว่างเปิดร้าน: ร้านเดิมหายจากตลาด (ของยังอยู่ใน p.vend ของตัวนั้น — คืนเมื่อเล่นตัวนั้นอีกครั้ง)
  drop() { if (this.mine) this.send({ k: 'off', sid: this.mine.sid }); this.mine = null; this.owner = null; },
  recover(p) {
    const v = p.vend;
    const back = this.restoreItems(p, v);
    p.vend = null;
    UI.dirty();
    saveGame(true, true);
    if (back) UI.msg(L(`ร้านที่เปิดค้างไว้ถูกปิด — คืนของเข้ากระเป๋า: ${back}`, `Your previous stall was closed — items returned to your bag: ${back}`), 'info');
  },
  restoreItems(p, v) {
    const out = [];
    for (const x of (v && Array.isArray(v.items) ? v.items : [])) {
      const it = x && ITEMS[x.id], qty = Math.floor(+x.qty) || 0;
      if (!it || qty <= 0) continue;
      if (isEquipType(it)) p.inventory.push({ id: x.id, qty: 1, uid: x.uid || G.uid++, refine: x.refine || 0, cards: (x.cards || []).filter(c => ITEMS[c]) });
      else { const ex = p.inventory.find(e => e.id === x.id); if (ex) ex.qty += qty; else p.inventory.push({ id: x.id, qty }); }
      out.push(this.lineName(x, qty));
    }
    return out.join(', ');
  },
  announce(force) {
    const v = this.mine;
    if (!v || !this.ch) return;
    const now = Date.now();
    if (!force && now - this.lastAd < MARKET_CFG.hb) return;
    this.lastAd = now;
    const p = G.player;
    this.send({ k: 'ad', sid: v.sid, name: p.name, title: v.title, map: v.map, x: v.x, y: v.y,
      items: v.items.filter(x => x.qty > 0).map(x => (x.uid ? { i: x.i, id: x.id, qty: 1, price: x.price, uid: x.uid, refine: x.refine, cards: x.cards.slice() } : { i: x.i, id: x.id, qty: x.qty, price: x.price })) });
  },
  // คำขอซื้อ (ทำงานทีละข้อความ → ใครถึงก่อนได้ก่อน)
  onBuy(m) {
    const tid = String(m.tid || '').slice(0, 40);
    if (!tid) return;
    const old = this.done.get(tid);
    if (old) { if (old.to === m.from) this.send(old.res); return; } // ส่งซ้ำ = ตอบเหมือนเดิม ไม่ขายซ้ำ
    const v = this.mine, reply = (ok, why, extra) => {
      const res = Object.assign({ k: 'res', to: m.from, tid, ok, why: why || '' }, extra || {});
      this.done.set(tid, { to: m.from, res, at: Date.now() });
      this.send(res);
    };
    if (!v || m.sid !== v.sid) { reply(false, 'closed'); return; }
    const x = v.items.find(y => y.i === Math.floor(+m.i));
    if (!x || this.lineHash(v.sid, x) !== m.hash || Math.floor(+m.price) !== x.price) { reply(false, 'changed'); return; }
    const qty = Math.floor(+m.qty);
    if (!(qty >= 1) || (x.uid && qty !== 1)) { reply(false, 'bad'); return; }
    if (x.qty < qty) { reply(false, x.qty <= 0 ? 'soldout' : 'stock', { left: x.qty }); return; }
    const p = this.owner || G.player, cost = x.price * qty, tax = Math.floor(cost * MARKET_TAX), gain = cost - tax;
    x.qty -= qty;
    p.zeny += gain;
    v.earned = (v.earned || 0) + gain;
    const who = this.cleanText(m.name, 24) || '?';
    this.sales.unshift({ who, id: x.id, qty, gain, refine: x.refine || 0, at: Date.now() });
    UI.dirty();
    saveGame(true, true); // ของออก + เงินเข้า เซฟทันที ก่อนตอบผู้ซื้อ
    reply(true, '', { i: x.i, qty, cost });
    UI.msg(L(`ขาย ${this.lineName(x, qty)} ให้ ${who} — ได้ ${U.fmt(gain)} ${CUR}${tax ? ` (ภาษี ${U.fmt(tax)})` : ''}`, `Sold ${this.lineName(x, qty)} to ${who} — earned ${U.fmt(gain)} ${CUR}${tax ? ` (tax ${U.fmt(tax)})` : ''}`), 'item');
    Sound.play('buy');
    if (v.items.every(y => y.qty <= 0)) this.close('soldout');
    else this.announce(true);
    if (this.view === 'mine') this.refresh(true);
  },

  // ---------------- ซื้อ ----------------
  // ซื้อจากร้าน seller ช่อง i จำนวน qty — กันเงินไว้ก่อน แล้วรอผู้ขายยืนยัน
  buy(seller, i, qty) {
    if (!this.needOnline()) return false;
    const p = G.player, s = this.stalls.get(seller), x = s && s.items.find(y => y.i === i);
    if (!s || !x) { UI.msg(L('ร้านนี้ปิดไปแล้ว หรือของหมดแล้ว', 'That stall has closed or the item is gone.'), 'err'); return false; }
    if (this.pend) { UI.msg(L('กำลังรอคำตอบจากผู้ขายอยู่', 'Still waiting for the seller to respond.'), 'err'); return false; }
    if (p.dead) { UI.msg(L('ซื้อไม่ได้ขณะล้มอยู่', 'You can\'t buy while fallen.'), 'err'); return false; }
    qty = Math.floor(+qty) || 0;
    if (qty < 1 || qty > x.qty || (x.uid && qty !== 1)) { UI.msg(L(`จำนวนไม่ถูกต้อง (มี ${x.qty} ชิ้น)`, `Invalid quantity (${x.qty} available).`), 'err'); return false; }
    const cost = x.price * qty;
    if (p.zeny < cost) { UI.msg(L(`${CUR} ไม่พอ — ต้องใช้ ${U.fmt(cost)} ${CUR} (มี ${U.fmt(p.zeny)})`, `Not enough ${CUR} — need ${U.fmt(cost)} ${CUR} (you have ${U.fmt(p.zeny)}).`), 'err'); return false; }
    this.join();
    p.zeny -= cost; // กันเงิน (escrow)
    UI.dirty();
    const tid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    this.pend = { tid, seller, name: s.name, sid: s.sid, i, qty, cost, item: { id: x.id, refine: x.refine || 0, cards: (x.cards || []).slice(), uid: x.uid || 0 }, at: Date.now() };
    this.send({ k: 'buy', to: seller, tid, sid: s.sid, i, qty, price: x.price, hash: this.lineHash(s.sid, x), name: p.name });
    UI.msg(L(`ส่งคำขอซื้อ ${this.lineName(x, qty)} จาก ${s.name}…`, `Buying ${this.lineName(x, qty)} from ${s.name}…`), 'info');
    this.refresh(true);
    return true;
  },
  onRes(m) {
    const q = this.pend;
    if (q && m.tid === q.tid && m.from === q.seller) {
      this.pend = null;
      if (m.ok) this.receive(q, false);
      else {
        G.player.zeny += q.cost; // คืนเงินที่กันไว้
        UI.dirty();
        const why = { soldout: L('ของหมดแล้ว (มีคนซื้อตัดหน้า)', 'sold out (someone bought it first)'), stock: L(`ของเหลือไม่พอ (เหลือ ${Math.floor(+m.left) || 0})`, `not enough left (${Math.floor(+m.left) || 0} left)`),
          closed: L('ร้านปิดไปแล้ว', 'the stall has closed'), changed: L('รายการในร้านเปลี่ยนไป', 'the listing changed'), bad: L('คำขอไม่ถูกต้อง', 'invalid request') }[m.why] || L('ผู้ขายไม่รับคำขอ', 'the seller rejected it');
        UI.msg(L(`ซื้อไม่สำเร็จ: ${why} — คืน ${U.fmt(q.cost)} ${CUR}`, `Purchase failed: ${why} — ${U.fmt(q.cost)} ${CUR} refunded`), 'err');
        if (m.why === 'soldout' || m.why === 'stock') { const s = this.stalls.get(q.seller), x = s && s.items.find(y => y.i === q.i); if (x) { x.qty = Math.floor(+m.left) || 0; if (!x.qty) s.items = s.items.filter(y => y !== x); } }
      }
      this.refresh(true);
      return;
    }
    // คำตอบ ok ที่มาหลังหมดเวลา (คืนเงินไปแล้ว): ผู้ขายหักของแล้ว → ส่งของให้ + หักเงินอีกครั้ง
    const l = this.late.get(m.tid);
    if (l && m.from === l.seller) {
      this.late.delete(m.tid);
      if (m.ok) this.receive(l, true);
    }
  },
  receive(q, late) {
    const p = G.player;
    if (late) p.zeny -= Math.min(q.cost, p.zeny);
    const it = ITEMS[q.item.id];
    if (isEquipType(it)) p.inventory.push({ id: q.item.id, qty: 1, uid: G.uid++, refine: q.item.refine || 0, cards: (q.item.cards || []).slice() });
    else addItem(q.item.id, q.qty, true);
    UI.dirty();
    saveGame(true, true);
    Sound.play('buy');
    UI.msg(L(`ซื้อ ${this.lineName(q.item, q.qty)} จาก ${q.name} สำเร็จ — จ่าย ${U.fmt(q.cost)} ${CUR}`, `Bought ${this.lineName(q.item, q.qty)} from ${q.name} — paid ${U.fmt(q.cost)} ${CUR}`), 'item');
  },
  timeoutBuy() {
    const q = this.pend;
    this.pend = null;
    G.player.zeny += q.cost;
    UI.dirty();
    this.late.set(q.tid, Object.assign({}, q, { at: Date.now() }));
    UI.msg(L(`${q.name} ไม่ตอบ — ยกเลิกการซื้อ คืน ${U.fmt(q.cost)} ${CUR}`, `${q.name} didn't respond — purchase cancelled, ${U.fmt(q.cost)} ${CUR} refunded`), 'err');
    this.refresh(true);
  },

  // ---------------- ข้อมูลช่วย ----------------
  lineName(x, qty) { const n = itemDisplayName({ id: x.id, refine: x.refine || 0 }); return qty > 1 ? `${n} ×${U.fmt(qty)}` : n; },
  findEquip(x) { return G.player.inventory.find(e => e.uid === x.uid && e.id === x.id); },
  stallOf(id) { return this.stalls.get(id) || null; },
  // ร้านทั้งหมดที่เห็น (รวมร้านเรา)
  all() {
    const out = [...this.stalls.values()];
    const v = this.mine;
    if (v) out.push({ id: this.me(), sid: v.sid, name: G.player.name, title: v.title, map: v.map, x: v.x, y: v.y, items: v.items.filter(x => x.qty > 0), mine: true });
    return out;
  },
  // แถวบนบอร์ด: ของทุกชิ้นจากทุกร้าน → ค้นชื่อ / กรองชนิด / เรียงราคา
  rows() {
    const q = this.q.trim().toLowerCase(), out = [];
    for (const s of this.all()) for (const x of s.items) {
      const it = ITEMS[x.id];
      if (this.type !== 'all' && it.type !== this.type) continue;
      if (q && !(it.name.toLowerCase().includes(q) || String(EN(it.name)).toLowerCase().includes(q) || s.title.toLowerCase().includes(q))) continue;
      out.push({ s, x });
    }
    const dir = this.sort === 'price_desc' ? -1 : 1;
    out.sort((a, b) => (a.x.price - b.x.price) * dir || a.s.name.localeCompare(b.s.name) || a.x.i - b.x.i);
    return out;
  },
  mapName(id) { return MAP_DEFS[id] ? MAP_DEFS[id].name : id; },
  goTo(s) {
    if (!s || !G.started) return;
    UI.close('w-market');
    this.navTo = s.id;
    Nav.goTo({ kind: 'tile', map: s.map, x: Math.floor(s.x), y: Math.floor(s.y), name: L(`ร้าน ${s.title}`, `Stall ${s.title}`) });
  },
  openShop(id) {
    if (!this.needOnline() && !(this.mine && id === this.me())) { this.show('board'); return; }
    this.shop = id; this.show(id === this.me() ? 'mine' : 'shop');
  },
  command(arg) {
    arg = String(arg || '').trim().toLowerCase();
    this.show(arg === 'vend' || arg === 'sell' || arg === 'mine' ? 'mine' : 'board');
  },

  // ---------------- คลิกในฉาก (เรียกจาก js/main.js handleClick) ----------------
  // คืน true = จัดการแล้ว (เปิดหน้าร้าน / กันคนขายเดินออกจากร้านโดยไม่ตั้งใจ)
  onClick() {
    const p = G.player, wx = R.mouse.wx / TILE, wy = R.mouse.wy / TILE;
    const hit = this.hit(wx, wy);
    if (hit) { this.openShop(hit.id); return true; }
    if (this.mine) {
      if (U.dist(wx, wy, p.x, p.y) < 1.4) { this.show('mine'); return true; }
      UI.msg(L('กำลังเปิดร้านอยู่ — ปิดร้านก่อนจึงจะเดินได้ (หน้าต่างตลาด → ร้านของฉัน)', 'Your stall is open — close it before walking (Market window → My Stall)'), 'info');
      return true;
    }
    return false;
  },
  // ตำแหน่งที่คลิกโดนตัวคนขายหรือป้ายเหนือหัว
  hit(wx, wy) {
    let best = null, bd = Infinity;
    for (const s of this.stalls.values()) {
      if (s.map !== G.map.id) continue;
      const o = Online.others.get(s.id), x = o ? o.x : s.x, y = o ? o.y : s.y;
      // ป้ายอยู่สูงจากเท้า ~2.5 ช่อง กว้างกว่าตัว → ช่วงแนวนอนกว้างขึ้นเมื่อคลิกระดับป้าย
      if (wy < y - 3 || wy > y + 0.6 || Math.abs(wx - x) > (wy < y - 2 ? 2.2 : 0.9)) continue;
      const d = Math.abs(wx - x) + Math.abs(wy - (y - 1));
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  },
  // ป้ายร้านเหนือหัว (เรียกจาก js/render.js) — สี่เหลี่ยมมุมมนเล็ก ไม่ใช่แคปซูล
  drawSign(g, x, y, title, mine) {
    g.save();
    g.font = `600 13px ${R.FONT}`;
    const w = Math.min(190, g.measureText(title).width + 30), top = y - 13;
    g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 8; g.shadowOffsetY = 2;
    g.fillStyle = mine ? 'rgba(255,236,170,0.97)' : 'rgba(255,246,214,0.97)';
    rr(g, x - w / 2, top, w, 26, 4); g.fill();
    g.shadowColor = 'transparent';
    g.strokeStyle = '#b8862e'; g.lineWidth = 1.5; rr(g, x - w / 2, top, w, 26, 4); g.stroke();
    g.fillStyle = '#b8862e'; g.fillRect(x - w / 2 + 7, y - 4, 9, 8); // ไอคอนกล่องร้านเล็ก ๆ
    g.fillStyle = '#3a2808'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(title, x - w / 2 + 21, y + 0.5, w - 28);
    g.restore();
  },
  signFor(id) {
    if (this.mine && id === this.me()) return this.mine.title;
    const s = this.stalls.get(id);
    return s && G.map && s.map === G.map.id ? s.title : null;
  },

  // ---------------- หน้าต่าง ----------------
  setupUi() {
    const w = $('#w-market'), menu = $('#menubar');
    if (!w || !menu || !menu.children.length) return;
    this.uiReady = true;
    if (!$('[data-win="w-market"]', menu)) {
      const b = h('button', { title: L('ตลาด (/market)', 'Market (/market)'), 'data-win': 'w-market', onclick: () => { UI.toggle('w-market'); if (Pad.enabled()) UI.setFold(menu, true); } });
      b.innerHTML = L(`${MARKET_ICON}<span>ตลาด</span><small>/market</small>`, `${MARKET_ICON}<span>Market</span><small>/market</small>`);
      const after = $('[data-win="w-trade"]', menu) || $('[data-win="w-emote"]', menu);
      if (after) after.after(b); else menu.append(b);
    }
    new MutationObserver(() => {
      const open = !w.classList.contains('hidden');
      if (open && !this.wasOpen) this.refresh(true);
      this.wasOpen = open;
    }).observe(w, { attributes: true, attributeFilter: ['class'] });
  },
  isOpen() { const w = $('#w-market'); return !!w && !w.classList.contains('hidden'); },
  show(view) {
    if (view) this.view = view;
    if (!this.isOpen()) UI.open('w-market');
    this.refresh(true);
  },
  // วาดใหม่เมื่อข้อมูลเปลี่ยน (กำลังพิมพ์อยู่ = คงโฟกัสและค่าเดิม)
  refresh(force) {
    if (!this.isOpen()) return;
    const key = JSON.stringify([Online.online, this.view, this.shop, this.q, this.type, this.sort, !!this.pend, G.player.zeny, G.map.id,
      this.all().map(s => [s.id, s.sid, s.title, s.map, s.items.map(x => [x.i, x.qty])]), this.mine && this.sales.length, this.draft, this.pick && this.pick.uid, this.pick && this.pick.id]);
    if (!force && key === this.renderKey) return;
    this.renderKey = key;
    this.render();
  },
  render() {
    const w = $('#w-market');
    if (!w || w.classList.contains('hidden') || typeof G === 'undefined' || !G.player) return;
    const body = $('.win-body', w), a = document.activeElement;
    const keep = a && body.contains(a) && a.dataset.focus ? { key: a.dataset.focus, value: a.value, s: a.selectionStart } : null;
    const scroll = body.scrollTop;
    body.innerHTML = '';
    if (!Online.online) body.append(this.viewOffline());
    else {
      if (this.view === 'shop' && !this.stalls.has(this.shop)) this.view = 'board';
      body.append(this.tabs());
      body.append(this.view === 'mine' ? this.viewMine() : this.view === 'shop' ? this.viewShop(this.stalls.get(this.shop)) : this.viewBoard());
    }
    if (keep) { const el = $(`[data-focus="${keep.key}"]`, body); if (el && !el.disabled) { el.value = keep.value; el.focus(); try { if (keep.s != null) el.setSelectionRange(keep.s, keep.s); } catch (e) { /* number input */ } } }
    body.scrollTop = scroll;
  },
  viewOffline() {
    return h('div', { class: 'mk-empty' },
      h('span', { class: 'mk-empty-ic', html: MARKET_ICON }),
      h('b', {}, L('ตลาดต้องออนไลน์', 'Market Needs Online')),
      h('p', {}, Online.loggedIn ? L(`ตอนนี้คุณเล่นด้วยบัญชีในเครื่อง (${Online.username}) จึงยังซื้อขายกับผู้เล่นอื่นไม่ได้`, `You're playing with a local account (${Online.username}), so you can't trade with other players yet.`)
        : L('ตอนนี้คุณเล่นแบบไม่ล็อกอิน (เซฟในเครื่องนี้) จึงยังซื้อขายกับผู้เล่นอื่นไม่ได้', 'You\'re playing without logging in (saved on this device), so you can\'t trade with other players yet.')),
      h('p', {}, L('ล็อกอินบัญชีออนไลน์เพื่อเปิดร้าน ดูบอร์ดตลาด และซื้อของจากผู้เล่นคนอื่น', 'Log in with an online account to open a stall, browse the market board, and buy from other players.')));
  },
  tabs() {
    const tab = (k, label) => h('button', { type: 'button', class: 'mk-tab' + (this.view === k || (k === 'board' && this.view === 'shop') ? ' on' : ''), 'data-tab': k, onclick: () => { this.view = k; this.refresh(true); } }, label);
    return h('div', { class: 'mk-tabs', role: 'tablist' }, tab('board', L('บอร์ดตลาด', 'Market Board')), tab('mine', this.mine ? L('ร้านของฉัน (เปิดอยู่)', 'My Stall (open)') : L('ร้านของฉัน', 'My Stall')));
  },
  volt(n) { return h('span', { class: 'mk-volt' }, h('i', { class: 'mk-vi', html: TRADE_VOLT }), h('b', {}, U.fmt(n)), h('small', {}, CUR)); },
  icon(x) {
    const it = ITEMS[x.id];
    return h('span', { class: 'inv-cell mk-ic' }, h('img', { src: itemIconUrl(x.id), alt: '' }), x.refine ? h('span', { class: 'rf' }, '+' + x.refine) : null,
      it.slots ? h('span', { class: 'mk-holes' }, Array.from({ length: it.slots }, (_, k) => h('i', { class: k < (x.cards || []).length ? 'on' : '' }))) : null);
  },
  viewBoard() {
    const wrap = h('div', { class: 'mk-board' }), list = this.rows(), n = this.all().length;
    const inp = h('input', { type: 'search', class: 'mk-q', placeholder: L('ค้นหาชื่อไอเทม / ชื่อร้าน', 'Search item / stall name'), value: this.q, 'data-focus': 'q', 'aria-label': L('ค้นหา', 'Search') });
    inp.addEventListener('input', () => { this.q = inp.value; this.refresh(); });
    inp.addEventListener('keydown', e => e.stopPropagation());
    const type = h('select', { class: 'mk-type', 'aria-label': L('ชนิดไอเทม', 'Item type') }, MARKET_TYPES.map(([k, lab]) => h('option', { value: k }, lab)));
    type.value = this.type; type.addEventListener('change', () => { this.type = type.value; this.refresh(); });
    const sort = h('select', { class: 'mk-sort', 'aria-label': L('เรียง', 'Sort') }, h('option', { value: 'price' }, L('ราคาต่ำ → สูง', 'Price: low → high')), h('option', { value: 'price_desc' }, L('ราคาสูง → ต่ำ', 'Price: high → low')));
    sort.value = this.sort; sort.addEventListener('change', () => { this.sort = sort.value; this.refresh(); });
    wrap.append(h('div', { class: 'mk-filters' }, inp, type, sort));
    wrap.append(h('div', { class: 'mk-sec' }, L(`ร้านที่เปิดอยู่ ${n} ร้าน`, `${n} open stall${n === 1 ? '' : 's'}`), h('small', {}, L(`${list.length} รายการ`, `${list.length} listing${list.length === 1 ? '' : 's'}`))));
    const box = h('div', { class: 'mk-list' });
    for (const { s, x } of list) {
      box.append(h('div', { class: 'mk-row' + (s.mine ? ' mine' : ''), 'data-seller': s.id, 'data-i': String(x.i), 'data-id': x.id },
        this.icon(x),
        h('span', { class: 'mk-mid' },
          h('b', { class: rarCls(x.id) }, this.lineName(x, 1), x.qty > 1 ? h('small', { class: 'mk-qty' }, ` ×${U.fmt(x.qty)}`) : null),
          h('small', {}, `${s.name}${s.mine ? L(' (คุณ)', ' (you)') : ''} · ${this.mapName(s.map)}`)),
        h('span', { class: 'mk-end' }, this.volt(x.price),
          h('span', { class: 'mk-btns' },
            s.mine ? null : h('button', { type: 'button', class: 'btn small mk-go', title: L('นำทางไปที่ร้าน', 'Navigate to stall'), onclick: () => this.goTo(s) }, L('ไปที่ร้าน', 'Go')),
            h('button', { type: 'button', class: 'btn small mk-view', onclick: () => this.openShop(s.id) }, s.mine ? L('ร้านฉัน', 'Mine') : L('ดูร้าน', 'View'))))));
    }
    if (!list.length) box.append(h('div', { class: 'mk-none' }, n ? L('ไม่พบรายการที่ตรงกับการค้นหา', 'No listings match your search') : L('ยังไม่มีใครเปิดร้าน — เปิดร้านของคุณเองได้ที่แท็บ "ร้านของฉัน" (ในเมือง)', 'No stalls are open yet — open your own on the "My Stall" tab (in town)')));
    wrap.append(box);
    wrap.append(h('div', { class: 'hint' }, L('คลิกที่ป้ายร้านเหนือหัวผู้เล่นเพื่อดูร้าน • ผู้ขายต้องออนไลน์อยู่จึงจะซื้อได้', 'Click the sign above a player to view their stall • The seller must be online to buy')));
    return wrap;
  },
  viewShop(s) {
    const wrap = h('div', { class: 'mk-shop' }), p = G.player;
    wrap.append(h('div', { class: 'mk-shead' },
      h('button', { type: 'button', class: 'btn small mk-back', onclick: () => { this.view = 'board'; this.refresh(true); } }, L('← บอร์ด', '← Board')),
      h('span', { class: 'mk-st' }, h('b', {}, s.title), h('small', {}, `${s.name} · ${this.mapName(s.map)}`)),
      s.map === G.map.id && U.dist(p.x, p.y, s.x, s.y) < 4 ? null : h('button', { type: 'button', class: 'btn small mk-go', onclick: () => this.goTo(s) }, L('ไปที่ร้าน', 'Go'))));
    if (this.pend) wrap.append(h('div', { class: 'mk-note' }, L(`กำลังรอ ${this.pend.name} ยืนยันการขาย…`, `Waiting for ${this.pend.name} to confirm the sale…`)));
    const box = h('div', { class: 'mk-list' });
    for (const x of s.items) {
      const eq = !!x.uid, qn = h('input', { type: 'number', class: 'mk-n', min: 1, max: x.qty, step: 1, value: '1', 'data-focus': 'n' + x.i, inputmode: 'numeric', 'aria-label': L('จำนวน', 'Quantity') });
      qn.addEventListener('keydown', e => e.stopPropagation());
      box.append(h('div', { class: 'mk-row', 'data-i': String(x.i), 'data-id': x.id },
        this.icon(x),
        h('span', { class: 'mk-mid' }, h('b', { class: rarCls(x.id) }, this.lineName(x, 1)), h('small', {}, L(`เหลือ ${U.fmt(x.qty)} ชิ้น`, `${U.fmt(x.qty)} left`))),
        h('span', { class: 'mk-end' }, this.volt(x.price),
          h('span', { class: 'mk-btns' }, eq || x.qty === 1 ? null : qn,
            h('button', { type: 'button', class: 'btn small mk-buy', disabled: this.pend ? 'disabled' : false, onclick: () => this.askBuy(s, x, eq || x.qty === 1 ? 1 : qn.value) }, L('ซื้อ', 'Buy'))))));
    }
    if (!s.items.length) box.append(h('div', { class: 'mk-none' }, L('ร้านนี้ขายหมดแล้ว', 'This stall is sold out')));
    wrap.append(box);
    wrap.append(h('div', { class: 'hint' }, L(`คุณมี ${U.fmt(p.zeny)} ${CUR}${MARKET_TAX ? ` • ผู้ขายเสียภาษี ${Math.round(MARKET_TAX * 100)}%` : ''}`, `You have ${U.fmt(p.zeny)} ${CUR}${MARKET_TAX ? ` • Sellers pay ${Math.round(MARKET_TAX * 100)}% tax` : ''}`)));
    return wrap;
  },
  async askBuy(s, x, qty) {
    qty = U.clamp(Math.floor(+qty) || 1, 1, x.qty);
    const cost = x.price * qty;
    if (G.player.zeny < cost) { this.buy(s.id, x.i, qty); return; } // ข้อความ "Volt ไม่พอ"
    if (!(await UI.confirm(L(`ซื้อ ${this.lineName(x, qty)} จาก ${s.name} ราคา ${U.fmt(cost)} ${CUR}?`, `Buy ${this.lineName(x, qty)} from ${s.name} for ${U.fmt(cost)} ${CUR}?`)))) return;
    this.buy(s.id, x.i, qty);
  },
  viewMine() {
    const wrap = h('div', { class: 'mk-mine' }), p = G.player, v = this.mine;
    if (v) {
      wrap.append(h('div', { class: 'mk-shead' }, h('span', { class: 'mk-st' }, h('b', {}, v.title), h('small', {}, L(`เปิดอยู่ที่ ${this.mapName(v.map)} · ขายได้ ${U.fmt(v.earned || 0)} ${CUR}`, `Open in ${this.mapName(v.map)} · earned ${U.fmt(v.earned || 0)} ${CUR}`)))));
      const box = h('div', { class: 'mk-list' });
      for (const x of v.items) box.append(h('div', { class: 'mk-row' + (x.qty <= 0 ? ' gone' : ''), 'data-i': String(x.i), 'data-id': x.id }, this.icon(x),
        h('span', { class: 'mk-mid' }, h('b', { class: rarCls(x.id) }, this.lineName(x, 1)), h('small', {}, x.qty > 0 ? L(`เหลือ ${U.fmt(x.qty)} ชิ้น`, `${U.fmt(x.qty)} left`) : L('ขายหมดแล้ว', 'Sold out'))),
        h('span', { class: 'mk-end' }, this.volt(x.price))));
      wrap.append(box);
      if (this.sales.length) {
        wrap.append(h('div', { class: 'mk-sec' }, L('ขายแล้ว', 'Sales'), h('small', {}, String(this.sales.length))));
        wrap.append(h('div', { class: 'mk-log' }, this.sales.slice(0, 12).map(r => h('div', {}, L(`${r.who} ซื้อ ${this.lineName(r, r.qty)} · +${U.fmt(r.gain)} ${CUR}`, `${r.who} bought ${this.lineName(r, r.qty)} · +${U.fmt(r.gain)} ${CUR}`)))));
      }
      wrap.append(h('div', { class: 'mk-acts' }, h('button', { type: 'button', class: 'btn danger mk-close', onclick: () => this.close('user') }, L('ปิดร้าน', 'Close Stall'))));
      wrap.append(h('div', { class: 'hint' }, L('ทิ้งไว้ได้ (AFK) — ร้านปิดเองเมื่อเดินออก ย้ายแผนที่ ล้ม หลุดออนไลน์ หรือปิดเกม ของที่เหลือคืนเข้ากระเป๋า', 'You can go AFK — the stall closes if you walk away, change map, fall, go offline, or close the game; unsold items return to your bag')));
      return wrap;
    }
    const d = this.draft || (this.draft = { title: '', lines: [] });
    if (!this.inTown()) wrap.append(h('div', { class: 'mk-note' }, L('เปิดร้านได้เฉพาะในเมือง (Neo Eldheim) — จัดของรอไว้ก่อนได้', 'Stalls can only be opened in town (Neo Eldheim) — you can prepare the list now')));
    const title = h('input', { type: 'text', class: 'mk-title', maxlength: MARKET_CFG.titleMax, value: d.title, 'data-focus': 'title', placeholder: L(`ร้านของ ${p.name}`, `${p.name}'s Shop`), 'aria-label': L('ชื่อร้าน', 'Stall name') });
    title.addEventListener('input', () => { d.title = title.value; });
    title.addEventListener('keydown', e => e.stopPropagation());
    wrap.append(h('label', { class: 'mk-field' }, h('span', {}, L('ชื่อร้าน', 'Stall name')), title));
    wrap.append(h('div', { class: 'mk-sec' }, L('ของที่จะขาย', 'Items for sale'), h('small', {}, `${d.lines.length}/${MARKET_CFG.slots}`)));
    const box = h('div', { class: 'mk-list' });
    d.lines.forEach((x, i) => box.append(h('div', { class: 'mk-row', 'data-id': x.id }, this.icon(x),
      h('span', { class: 'mk-mid' }, h('b', { class: rarCls(x.id) }, this.lineName(x, 1)), h('small', {}, `×${U.fmt(x.qty)}`)),
      h('span', { class: 'mk-end' }, this.volt(x.price), h('button', { type: 'button', class: 'btn small mk-rm', onclick: () => { d.lines.splice(i, 1); this.refresh(true); } }, L('เอาออก', 'Remove'))))));
    if (!d.lines.length) box.append(h('div', { class: 'mk-none' }, L('แตะของในกระเป๋าด้านล่าง แล้วตั้งจำนวน + ราคา', 'Tap an item in your bag below, then set quantity + price')));
    wrap.append(box);
    if (d.lines.length < MARKET_CFG.slots) wrap.append(this.picker(d));
    wrap.append(h('div', { class: 'mk-acts' }, h('button', { type: 'button', class: 'btn mk-open primary', disabled: d.lines.length && this.inTown() ? false : 'disabled', onclick: () => this.open() }, L('เปิดร้าน', 'Open Stall'))));
    wrap.append(h('div', { class: 'hint' }, L('ของที่วางขายถูกพักไว้นอกกระเป๋าระหว่างเปิดร้าน • ปิดร้านเมื่อไรได้ของที่เหลือคืน', 'Listed items are held outside your bag while the stall is open • Close the stall any time to get unsold items back')));
    return wrap;
  },
  listed(d, id) { return d.lines.filter(x => x.id === id && !x.uid).reduce((a, x) => a + x.qty, 0); },
  fixDraft() {
    const d = this.draft;
    if (!d) return;
    d.lines = d.lines.filter(x => (x.uid ? !!this.findEquip(x) : (x.qty = Math.min(x.qty, countItem(x.id))) > 0));
  },
  // กระเป๋า: แตะเพื่อเลือก → ตั้งจำนวน/ราคา → ใส่ (ของที่สวมอยู่ไม่อยู่ในกระเป๋า จึงขายไม่ได้)
  picker(d) {
    const p = G.player, wrap = h('div', { class: 'mk-pick' });
    const left = e => (isEquipType(ITEMS[e.id]) ? (d.lines.some(x => x.uid && x.uid === e.uid) ? 0 : 1) : countItem(e.id) - this.listed(d, e.id));
    wrap.append(h('div', { class: 'mk-sec' }, L('กระเป๋า — แตะเพื่อเลือก', 'Bag — tap to choose')));
    const grid = h('div', { class: 'mk-inv' });
    for (const e of p.inventory.filter(y => ITEMS[y.id])) {
      const n = left(e), sel = this.pick === e;
      grid.append(h('button', { type: 'button', class: 'inv-cell mk-icell' + (n <= 0 ? ' used' : '') + (sel ? ' sel' : ''), disabled: n <= 0 ? 'disabled' : false, 'data-id': e.id,
        title: itemDisplayName(e), onclick: () => { this.pick = sel ? null : e; this.refresh(true); } },
      h('img', { src: itemIconUrl(e.id), alt: '' }), isEquipType(ITEMS[e.id]) ? null : h('span', { class: 'q' }, U.fmt(n)), e.refine ? h('span', { class: 'rf' }, '+' + e.refine) : null));
    }
    if (!p.inventory.length) grid.append(h('div', { class: 'mk-none' }, L('กระเป๋าว่าง', 'Bag is empty')));
    wrap.append(grid);
    const e = this.pick && p.inventory.includes(this.pick) ? this.pick : null;
    if (e) {
      const it = ITEMS[e.id], max = left(e), eq = isEquipType(it);
      const qn = h('input', { type: 'number', class: 'mk-pq', min: 1, max, step: 1, value: String(max), 'data-focus': 'pq', inputmode: 'numeric', 'aria-label': L('จำนวน', 'Quantity') });
      const pr = h('input', { type: 'number', class: 'mk-pp', min: 1, max: MARKET_CFG.maxPrice, step: 1, value: String(Math.max(1, it.price || 1)), 'data-focus': 'pp', inputmode: 'numeric', 'aria-label': L(`ราคาต่อชิ้น (${CUR})`, `Price each (${CUR})`) });
      for (const el of [qn, pr]) el.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); add(); } ev.stopPropagation(); });
      const add = () => {
        const qty = eq ? 1 : U.clamp(Math.floor(+qn.value) || 0, 0, max), price = Math.floor(+pr.value) || 0;
        if (qty < 1) return;
        if (!(price >= 1 && price <= MARKET_CFG.maxPrice)) { UI.msg(L(`ราคาต้องอยู่ระหว่าง 1–${U.fmt(MARKET_CFG.maxPrice)} ${CUR}`, `Price must be 1–${U.fmt(MARKET_CFG.maxPrice)} ${CUR}`), 'err'); return; }
        if (eq) { if (e.uid == null) e.uid = G.uid++; d.lines.push({ id: e.id, qty: 1, price, uid: e.uid, refine: e.refine || 0, cards: (e.cards || []).slice() }); }
        else { const cur = d.lines.find(x => x.id === e.id && !x.uid); if (cur) { cur.qty += qty; cur.price = price; } else d.lines.push({ id: e.id, qty, price }); }
        this.pick = null; Sound.play('click'); this.refresh(true);
      };
      wrap.append(h('div', { class: 'mk-set' },
        h('span', { class: 'mk-set-n' }, h('img', { src: itemIconUrl(e.id), alt: '' }), h('b', {}, itemDisplayName(e))),
        eq ? null : h('label', {}, h('span', {}, L('จำนวน', 'Qty')), qn),
        h('label', {}, h('span', {}, L(`ราคา/ชิ้น`, 'Price each')), pr),
        h('button', { type: 'button', class: 'btn small primary mk-add', onclick: add }, L('ใส่', 'Add'))));
    }
    return wrap;
  },
};
Market.boot();
