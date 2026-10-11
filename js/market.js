'use strict';
// ============================================================
//  ตลาดกลาง (Central Market) — วางขาย/ซื้อของได้จากทุกแผนที่ ไม่ต้องตั้งแผง ไม่ต้องนั่ง ไม่ต้องเดินไปหาร้าน
//  • ผู้ขาย: เลือกของในกระเป๋า + ราคา → ของย้ายไปพักไว้ (escrow) ใน p.vend (อยู่ในเซฟ) ได้สูงสุด MARKET_CFG.slots รายการ
//    เดิน/ตีมอน/AUTO/ย้ายแผนที่ได้ตามปกติ • แก้ราคา/ยกเลิก (ของคืนเข้ากระเป๋า) ได้ทุกเมื่อ
//  • ขายได้ขณะผู้ขายออนไลน์เท่านั้น (รอบนี้ยังไม่มีตารางบนเซิร์ฟเวอร์) — ออฟไลน์/ออกจากเกม ของยังพักอยู่ใน p.vend
//    ไม่หาย และกลับขึ้นตลาดเองเมื่อออนไลน์ครั้งถัดไป
//  • ผู้ซื้อ: แท็บ "ซื้อ" รวมของทุกคนจากทุกแผนที่ → ค้น/กรอง/เรียง → แตะ → ยืนยัน (ราคา + Volt หลังซื้อ) → ซื้อ
//
//  สื่อสารผ่านช่อง broadcast "market" ของ Supabase (ช่องเดียวทั้งเกม ไม่มีตาราง ไม่แตะฐานข้อมูล) — แบบเดียวกับ trade.js / party.js
//    ad   ผู้ขายประกาศรายการ (heartbeat ทุก 3 วิ + ทันทีเมื่อเปลี่ยน) • ไม่ได้ยิน 12 วิ = หายจากตลาด
//    off  ผู้ขายเลิกขาย/ปิดเกม • ask คนที่เพิ่งเข้าขอให้ทุกคนประกาศใหม่
//    buy  ผู้ซื้อ → ผู้ขาย { tid, ช่อง, จำนวน, ราคา, แฮชของช่อง } • res ผู้ขาย → ผู้ซื้อ { tid, ok, why }
//    (รูปแบบข้อความเดิมของระบบแผงขายของ — เครื่องที่ยังเปิดเวอร์ชันเก่าค้างไว้ยังซื้อขายกันได้)
//  กันของซ้ำ/โกง (เท่าที่เกมแบบเครื่องใครเครื่องมันทำได้ — ใช้แนวเดียวกับ trade.js):
//  • ผู้ขาย: ของที่วางขายอยู่นอกกระเป๋า (p.vend ในเซฟ) → ปิดเกมกลางคัน เข้าใหม่ของยังวางขายอยู่ / ยกเลิกได้ของคืน
//  • ผู้ซื้อ: กันเงินไว้ก่อนส่งคำขอ (escrow) แล้วส่งแฮชของช่องที่เห็น • ผู้ขายตรวจ ช่อง/แฮช/ราคา/ของเหลือ
//    → หักของ + รับเงิน + เซฟทันที → ตอบ ok → ผู้ซื้อรับของ + เซฟทันที • ไม่ผ่าน/ไม่ตอบ 8 วิ = คืนเงินที่กันไว้
//  • ผู้ซื้อหลายคนพร้อมกัน: ผู้ขายรับทีละข้อความ ใครถึงก่อนได้ คนถัดไปได้ "หมดแล้ว" • tid ซ้ำ = ส่งคำตอบเดิม ไม่ขายซ้ำ
//  • คำตอบ ok ที่มาช้าหลังคืนเงินไปแล้ว: ส่งของให้และหักเงินอีกครั้ง (เท่าที่มี) — ผู้ขายหักของไปแล้ว
// ============================================================

const MARKET_CFG = { slots: 12, maxPrice: 1e9, hb: 3000, expire: 12000, stale: 7000, buyWait: 8000, lateKeep: 60000, salesKeep: 20 };
// ภาษีขาย (0–1) หักจากเงินที่ผู้ขายได้ = ที่ทิ้ง Volt ออกจากเกม • ค่าเริ่มต้น 0 (ไม่หัก)
const MARKET_TAX = 0;
const MARKET_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 9.5L5 4.5h14l1.5 5"/><path d="M3.5 9.5c0 1.5 1.2 2.5 2.7 2.5s2.7-1 2.7-2.5c0 1.5 1.2 2.5 2.8 2.5s2.8-1 2.8-2.5c0 1.5 1.2 2.5 2.7 2.5s2.7-1 2.7-2.5"/><path d="M5 12v7.5h14V12"/><path d="M10 19.5v-4.5h4v4.5"/></svg>';
const MARKET_TYPES = [['all', L('ทั้งหมด', 'All')], ['use', L('ของใช้', 'Usable')], ['weapon', L('อาวุธ', 'Weapon')], ['armor', L('ชุดเกราะ', 'Armor')], ['card', L('ชิป', 'Chip')], ['etc', L('อื่น ๆ', 'Etc')]];

const Market = {
  ch: null, uiReady: false, wasOpen: false,
  stalls: new Map(),   // id ผู้ขาย → { id, sid, name, map, items:[{ i, id, qty, price, refine, cards, uid }], seen }
  mine: null,          // รายการขายของเรา (อ้างถึง G.player.vend ที่อยู่ในเซฟ) — null = ไม่มีของวางขาย
  owner: null,         // ตัวละครเจ้าของรายการ (สลับตัวละคร = รายการตัวเดิมหายจากตลาด ของยังอยู่ในเซฟตัวนั้น)
  done: new Map(),     // tid → คำตอบที่ส่งไปแล้ว (คำขอซ้ำ = ส่งคำตอบเดิม ไม่ขายซ้ำ)
  pend: null,          // คำขอซื้อที่รอคำตอบ (เงินกันไว้แล้ว)
  late: new Map(),     // tid → คำขอที่หมดเวลา/คืนเงินแล้ว (รอรับคำตอบ ok ที่มาช้า)
  view: 'buy', who: null, sel: null, q: '', type: 'all', sort: 'price', pick: null, renderKey: '', lastAd: 0, wasLive: false,

  boot() {
    if (typeof SAVE_FIELDS !== 'undefined') {
      if (!SAVE_FIELDS.includes('vend')) SAVE_FIELDS.push('vend');       // ของที่วางขาย (escrow)
      if (!SAVE_FIELDS.includes('mkSales')) SAVE_FIELDS.push('mkSales'); // ประวัติการขาย 20 รายการล่าสุด
    }
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
  newId() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); },
  live() { return !!(this.mine && this.mine.items.some(x => x.qty > 0)); },

  // ---------------- ทุก 250 ms ----------------
  tick() {
    if (typeof G === 'undefined' || !G.started || !G.player || !G.map) return;
    if (!this.uiReady) this.setupUi();
    if (Online.online) this.join();
    const p = G.player, now = Date.now();
    if (this.owner !== p) this.adopt(p);
    if (this.mine && this.mine !== p.vend) this.mine = p.vend || null; // เซฟถูกโหลดใหม่ทับ
    if (this.pend && now - this.pend.at > MARKET_CFG.buyWait) this.timeoutBuy();
    for (const [k, v] of this.late) if (now - v.at > MARKET_CFG.lateKeep) this.late.delete(k);
    for (const [k, v] of this.done) if (now - v.at > MARKET_CFG.lateKeep) this.done.delete(k);
    for (const [id, s] of this.stalls) if (now - s.seen > MARKET_CFG.expire) this.stalls.delete(id);
    // ช่องที่ขายหมดเก็บไว้สักพัก (ตอบคนที่กดซื้อตามมาว่า "หมดแล้ว") แล้วค่อยลบ
    const v = this.mine;
    if (v && v.items.some(x => x.qty <= 0 && now - (x.soldAt || 0) > MARKET_CFG.lateKeep)) {
      v.items = v.items.filter(x => x.qty > 0 || now - (x.soldAt || 0) <= MARKET_CFG.lateKeep);
      if (!v.items.length) { p.vend = null; this.mine = null; }
      UI.dirty();
    }
    const liveNow = Online.online && this.live();
    if (liveNow && now - this.lastAd > MARKET_CFG.hb) this.announce(false);
    else if (!liveNow && this.wasLive && Online.online) this.send({ k: 'off', sid: v ? v.sid : '' });
    this.wasLive = liveNow;
    if (this.isOpen()) this.refresh();
  },
  // ตัวละครที่กำลังเล่น (เข้าเกม/สลับตัว): รับรายการขายจากเซฟมาดูแล + แปลงร้านแบบเก่า (แผงขายของ) เป็นรายการในตลาดกลาง
  adopt(p) {
    if (this.mine) this.send({ k: 'off', sid: this.mine.sid });
    this.owner = p; this.mine = null; this.pick = null; this.sel = null;
    if (!Array.isArray(p.mkSales)) p.mkSales = [];
    const v = p.vend;
    if (!v) return;
    if (typeof v !== 'object' || !Array.isArray(v.items)) { p.vend = null; return; }
    const old = v.v !== 2, items = [], used = new Set(), extra = [];
    for (const x of v.items) {
      const it = x && ITEMS[x.id], qty = Math.floor(+x.qty) || 0, price = Math.floor(+x.price) || 0;
      if (!it || qty <= 0) continue;
      const eq = isEquipType(it);
      const line = eq ? { id: x.id, qty: 1, price, uid: Math.floor(+x.uid) || G.uid++, refine: Math.floor(+x.refine) || 0, cards: (x.cards || []).filter(c => ITEMS[c]) } : { id: x.id, qty, price };
      if (!(price >= 1 && price <= MARKET_CFG.maxPrice) || items.length >= MARKET_CFG.slots) { extra.push(line); continue; }
      let i = Math.floor(+x.i);
      if (!(i >= 0 && i < MARKET_CFG.slots) || used.has(i)) i = this.freeSlot(used);
      used.add(i); line.i = i; items.push(line);
    }
    const back = extra.length ? this.restoreItems(p, { items: extra }) : '';
    p.vend = items.length ? { v: 2, sid: typeof v.sid === 'string' && v.sid ? v.sid.slice(0, 40) : this.newId(), items, earned: Math.floor(+v.earned) || 0, at: v.at || Date.now() } : null;
    this.mine = p.vend;
    if (old && p.sitting) p.sitting = false; // แผงแบบเก่านั่งอยู่ — ตลาดกลางไม่ต้องนั่ง
    if (old || back) {
      UI.dirty();
      saveGame(true, true);
      if (old && items.length) UI.msg(L(`ร้านแผงขายของเดิมย้ายเข้าตลาดกลางแล้ว — วางขายอยู่ ${items.length} รายการ (ขายได้ขณะคุณออนไลน์)`, `Your old stall moved into the Central Market — ${items.length} listing${items.length === 1 ? '' : 's'} (sells while you're online)`), 'info');
      if (back) UI.msg(L(`คืนของที่วางขายไม่ได้เข้ากระเป๋า: ${back}`, `Returned to your bag: ${back}`), 'info');
    }
    if (this.mine && Online.online) this.announce(true);
  },
  freeSlot(used) { for (let i = 0; i < MARKET_CFG.slots; i++) if (!used.has(i)) return i; return -1; },

  // ---------------- ข้อความ ----------------
  onMsg(m) {
    if (!m || typeof m.k !== 'string' || !m.from || m.from === this.me() || !G.started) return;
    switch (m.k) {
      case 'ad': this.onAd(m); break;
      case 'off': { const s = this.stalls.get(m.from); if (s && (!m.sid || s.sid === m.sid)) { this.stalls.delete(m.from); this.refresh(true); } break; }
      case 'ask': if (this.live() && Date.now() - this.lastAd > 800) setTimeout(() => this.announce(true), 100 + Math.random() * 400); break;
      case 'buy': if (m.to === this.me()) this.onBuy(m); break;
      case 'res': if (m.to === this.me()) this.onRes(m); break;
    }
  },
  onAd(m) {
    if (!Array.isArray(m.items) || m.items.length > MARKET_CFG.slots || typeof m.sid !== 'string') return;
    const items = [];
    for (const x of m.items) { const c = this.cleanLine(x); if (c) items.push(c); }
    if (!items.length) { this.stalls.delete(m.from); return; }
    this.stalls.set(m.from, { id: m.from, sid: m.sid.slice(0, 40), name: this.cleanText(m.name, 24) || '?', map: MAP_DEFS[m.map] ? m.map : '', items, seen: Date.now() });
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

  // ---------------- ขายของฉัน ----------------
  // วางขาย: ย้ายของจากกระเป๋าเข้า escrow (p.vend อยู่ในเซฟ) ทันที • ทำได้ทุกแผนที่ ระหว่างเดิน/ต่อสู้/AUTO
  list(e, qty, price) {
    if (!this.needOnline()) return false;
    const p = G.player;
    if (!e || !p.inventory.includes(e) || !ITEMS[e.id]) { UI.msg(L('ไม่พบของชิ้นนี้ในกระเป๋าแล้ว', 'That item is no longer in your bag.'), 'err'); return false; }
    if (typeof Trade !== 'undefined' && Trade.t) { UI.msg(L('จบการแลกเปลี่ยนก่อน จึงจะวางขายได้', 'Finish your trade before listing items.'), 'err'); return false; }
    const it = ITEMS[e.id], eq = isEquipType(it);
    qty = eq ? 1 : Math.floor(+qty) || 0; price = Math.floor(+price) || 0;
    if (!(price >= 1 && price <= MARKET_CFG.maxPrice)) { UI.msg(L(`ราคาต้องอยู่ระหว่าง 1–${U.fmt(MARKET_CFG.maxPrice)} ${CUR}`, `Price must be 1–${U.fmt(MARKET_CFG.maxPrice)} ${CUR}`), 'err'); return false; }
    if (qty < 1 || (!eq && qty > countItem(e.id))) { UI.msg(L(`${it.name} ในกระเป๋าไม่พอ`, `Not enough ${it.name} in your bag.`), 'err'); return false; }
    const v = p.vend || { v: 2, sid: this.newId(), items: [], earned: 0, at: Date.now() };
    const same = eq ? null : v.items.find(x => x.id === e.id && !x.uid && x.qty > 0 && x.price === price);
    if (!same && v.items.filter(x => x.qty > 0).length >= MARKET_CFG.slots) { UI.msg(L(`วางขายได้สูงสุด ${MARKET_CFG.slots} รายการ`, `You can list up to ${MARKET_CFG.slots} items.`), 'err'); return false; }
    let i = -1;
    if (!same) {
      i = this.freeSlot(new Set(v.items.map(x => x.i)));
      if (i < 0) { v.items = v.items.filter(x => x.qty > 0); i = this.freeSlot(new Set(v.items.map(x => x.i))); } // ใช้ช่องที่ขายหมดแล้วซ้ำ
    }
    // ย้ายของออกจากกระเป๋า
    let line;
    if (eq) {
      p.inventory.splice(p.inventory.indexOf(e), 1);
      line = { i, id: e.id, qty: 1, price, uid: e.uid != null ? e.uid : G.uid++, refine: e.refine || 0, cards: (e.cards || []).slice() };
    } else {
      let need = qty;
      for (const y of p.inventory.filter(z => z.id === e.id)) { const k = Math.min(need, y.qty); removeEntry(y, k); need -= k; if (!need) break; }
      line = { i, id: e.id, qty, price };
    }
    if (same) same.qty += qty; else v.items.push(line);
    p.vend = v; this.mine = v; this.owner = p; this.pick = null;
    UI.dirty();
    saveGame(true, true);
    this.join();
    this.announce(true);
    UI.msg(L(`วางขาย ${this.lineName(line, qty)} ราคา ${U.fmt(price)} ${CUR}/ชิ้น ในตลาดกลางแล้ว (ขายได้ขณะคุณออนไลน์)`, `Listed ${this.lineName(line, qty)} at ${U.fmt(price)} ${CUR} each on the Central Market (sells while you're online)`), 'info');
    Sound.play('click');
    this.refresh(true);
    return true;
  },
  lineOf(i) { return this.mine ? this.mine.items.find(x => x.i === i && x.qty > 0) || null : null; },
  // แก้ราคา (แฮชเปลี่ยน → คำขอซื้อที่เห็นราคาเดิมถูกปฏิเสธ "รายการเปลี่ยน" + คืนเงินผู้ซื้อ)
  setPrice(i, price) {
    const x = this.lineOf(i);
    price = Math.floor(+price) || 0;
    if (!x) return false;
    if (!(price >= 1 && price <= MARKET_CFG.maxPrice)) { UI.msg(L(`ราคาต้องอยู่ระหว่าง 1–${U.fmt(MARKET_CFG.maxPrice)} ${CUR}`, `Price must be 1–${U.fmt(MARKET_CFG.maxPrice)} ${CUR}`), 'err'); return false; }
    if (price === x.price) return true;
    x.price = price;
    UI.dirty(); saveGame(true, true); this.announce(true);
    UI.msg(L(`ตั้งราคา ${this.lineName(x, 1)} เป็น ${U.fmt(price)} ${CUR}`, `${this.lineName(x, 1)} now ${U.fmt(price)} ${CUR}`), 'info');
    this.refresh(true);
    return true;
  },
  // ยกเลิกรายการ: ของที่เหลือคืนเข้ากระเป๋า + เซฟทันที
  cancel(i) {
    const v = this.mine, x = this.lineOf(i);
    if (!v || !x) return false;
    const p = this.owner || G.player;
    v.items = v.items.filter(y => y !== x);
    const back = this.restoreItems(p, { items: [x] });
    if (!this.live()) { this.send({ k: 'off', sid: v.sid }); p.vend = null; this.mine = null; }
    else this.announce(true);
    UI.dirty();
    saveGame(true, true);
    UI.msg(L(`ยกเลิกการขาย — คืนเข้ากระเป๋า: ${back}`, `Listing cancelled — returned to your bag: ${back}`), 'info');
    this.refresh(true);
    return true;
  },
  cancelAll() { for (const x of (this.mine ? this.mine.items.filter(y => y.qty > 0) : [])) this.cancel(x.i); },
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
    if (!v || !this.ch || !Online.online) return;
    const now = Date.now();
    if (!force && now - this.lastAd < MARKET_CFG.hb) return;
    this.lastAd = now;
    const items = v.items.filter(x => x.qty > 0).map(x => (x.uid ? { i: x.i, id: x.id, qty: 1, price: x.price, uid: x.uid, refine: x.refine, cards: x.cards.slice() } : { i: x.i, id: x.id, qty: x.qty, price: x.price }));
    if (!items.length) { this.send({ k: 'off', sid: v.sid }); return; }
    // map = แผนที่ที่ผู้ขายอยู่ตอนนี้ (บอกสถานะ) • x/y/title ส่งไว้ให้เครื่องเวอร์ชันเก่ายังแสดงได้
    this.send({ k: 'ad', sid: v.sid, name: G.player.name, title: L('ตลาดกลาง', 'Central Market'), map: G.map.id, x: 0, y: 0, items });
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
    if (x.qty <= 0) x.soldAt = Date.now();
    p.zeny += gain;
    v.earned = (v.earned || 0) + gain;
    const who = this.cleanText(m.name, 24) || '?';
    if (!Array.isArray(p.mkSales)) p.mkSales = [];
    p.mkSales.unshift({ who, id: x.id, qty, gain, refine: x.refine || 0, at: Date.now() });
    p.mkSales.length = Math.min(p.mkSales.length, MARKET_CFG.salesKeep);
    UI.dirty();
    saveGame(true, true); // ของออก + เงินเข้า เซฟทันที ก่อนตอบผู้ซื้อ
    reply(true, '', { i: x.i, qty, cost });
    const txt = L(`ขาย ${this.lineName(x, qty)} ให้ ${who} — ได้ ${U.fmt(gain)} ${CUR}${tax ? ` (ภาษี ${U.fmt(tax)})` : ''}`, `Sold ${this.lineName(x, qty)} to ${who} — earned ${U.fmt(gain)} ${CUR}${tax ? ` (tax ${U.fmt(tax)})` : ''}`);
    UI.msg(txt, 'item');
    this.toast(txt);
    Sound.play('buy');
    if (this.live()) this.announce(true);
    else this.send({ k: 'off', sid: v.sid }); // ขายหมดทุกรายการ
    this.refresh(true);
  },
  // แจ้งเตือนเล็ก ๆ บนจอ (ผู้ขายได้เงิน) — ไม่บังการเล่น หายเองใน 4 วิ
  toast(text) {
    let el = document.getElementById('mk-toast');
    if (!el) { el = h('div', { id: 'mk-toast', role: 'status', 'aria-live': 'polite' }); document.body.append(el); }
    el.innerHTML = '';
    el.append(h('span', { class: 'mk-ti', html: MARKET_ICON }), h('span', {}, text));
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(this._toastT); this._toastT = setTimeout(() => el.classList.remove('show'), 4200);
  },

  // ---------------- ซื้อ ----------------
  // ซื้อจากผู้ขาย seller ช่อง i จำนวน qty — กันเงินไว้ก่อน แล้วรอผู้ขายยืนยัน
  buy(seller, i, qty) {
    if (!this.needOnline()) return false;
    const p = G.player, s = this.stalls.get(seller), x = s && s.items.find(y => y.i === i);
    if (!s || !x) { UI.msg(L('ผู้ขายออฟไลน์ไปแล้ว หรือของหมดแล้ว', 'The seller went offline or the item is gone.'), 'err'); return false; }
    if (this.pend) { UI.msg(L('กำลังรอคำตอบจากผู้ขายอยู่', 'Still waiting for the seller to respond.'), 'err'); return false; }
    qty = Math.floor(+qty) || 0;
    if (qty < 1 || qty > x.qty || (x.uid && qty !== 1)) { UI.msg(L(`จำนวนไม่ถูกต้อง (มี ${x.qty} ชิ้น)`, `Invalid quantity (${x.qty} available).`), 'err'); return false; }
    const cost = x.price * qty;
    if (p.zeny < cost) { UI.msg(L(`${CUR} ไม่พอ — ต้องใช้ ${U.fmt(cost)} ${CUR} (มี ${U.fmt(p.zeny)})`, `Not enough ${CUR} — need ${U.fmt(cost)} ${CUR} (you have ${U.fmt(p.zeny)}).`), 'err'); return false; }
    this.join();
    p.zeny -= cost; // กันเงิน (escrow)
    UI.dirty();
    const tid = this.newId();
    this.pend = { tid, seller, name: s.name, sid: s.sid, i, qty, cost, item: { id: x.id, refine: x.refine || 0, cards: (x.cards || []).slice(), uid: x.uid || 0 }, at: Date.now() };
    this.send({ k: 'buy', to: seller, tid, sid: s.sid, i, qty, price: x.price, hash: this.lineHash(s.sid, x), name: p.name });
    UI.msg(L(`ส่งคำขอซื้อ ${this.lineName(x, qty)} จาก ${s.name}…`, `Buying ${this.lineName(x, qty)} from ${s.name}…`), 'info');
    this.sel = null;
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
          closed: L('ผู้ขายเลิกขายแล้ว', 'the seller stopped selling'), changed: L('ผู้ขายเปลี่ยนราคาหรือยกเลิกรายการนี้', 'the seller changed or cancelled this listing'), bad: L('คำขอไม่ถูกต้อง', 'invalid request') }[m.why] || L('ผู้ขายไม่รับคำขอ', 'the seller rejected it');
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
    this.refresh(true);
  },
  timeoutBuy() {
    const q = this.pend;
    this.pend = null;
    G.player.zeny += q.cost;
    UI.dirty();
    this.late.set(q.tid, Object.assign({}, q, { at: Date.now() }));
    UI.msg(L(`${q.name} ไม่ตอบ (อาจออฟไลน์ไปแล้ว) — ยกเลิกการซื้อ คืน ${U.fmt(q.cost)} ${CUR}`, `${q.name} didn't respond (may be offline) — purchase cancelled, ${U.fmt(q.cost)} ${CUR} refunded`), 'err');
    this.refresh(true);
  },

  // ---------------- ข้อมูลช่วย ----------------
  lineName(x, qty) { const n = itemDisplayName({ id: x.id, refine: x.refine || 0 }); return qty > 1 ? `${n} ×${U.fmt(qty)}` : n; },
  stallOf(id) { return this.stalls.get(id) || null; },
  isLive(s) { return !!s.mine || Date.now() - s.seen < MARKET_CFG.stale; },
  // ผู้ขายทั้งหมดที่เห็น (รวมเรา)
  all() {
    const out = [...this.stalls.values()];
    const v = this.mine;
    if (v && this.live()) out.push({ id: this.me(), sid: v.sid, name: G.player.name, map: G.map.id, items: v.items.filter(x => x.qty > 0), mine: true });
    return out;
  },
  // แถวในแท็บซื้อ: ของทุกชิ้นจากทุกผู้ขาย → ค้นชื่อ (ไอเทม/ผู้ขาย) / กรองชนิด / กรองผู้ขาย / เรียง
  rows() {
    const q = this.q.trim().toLowerCase(), out = [];
    for (const s of this.all()) {
      if (this.who && s.id !== this.who) continue;
      for (const x of s.items) {
        const it = ITEMS[x.id];
        if (this.type !== 'all' && it.type !== this.type) continue;
        if (q && !(it.name.toLowerCase().includes(q) || String(EN(it.name)).toLowerCase().includes(q) || s.name.toLowerCase().includes(q))) continue;
        out.push({ s, x });
      }
    }
    const dir = this.sort === 'price_desc' ? -1 : 1;
    if (this.sort === 'name') out.sort((a, b) => ITEMS[a.x.id].name.localeCompare(ITEMS[b.x.id].name) || a.x.price - b.x.price);
    else out.sort((a, b) => (a.x.price - b.x.price) * dir || a.s.name.localeCompare(b.s.name) || a.x.i - b.x.i);
    return out;
  },
  mapName(id) { return MAP_DEFS[id] ? MAP_DEFS[id].name : ''; },
  // เปิดตลาดดูเฉพาะของผู้ขายคนนี้ (จากการ์ดผู้เล่น)
  openShop(id) {
    if (this.mine && id === this.me()) { this.show('sell'); return; }
    this.who = this.stalls.has(id) ? id : null; this.sel = null; this.show('buy');
  },
  command(arg) {
    arg = String(arg || '').trim().toLowerCase();
    this.show(arg === 'vend' || arg === 'sell' || arg === 'mine' ? 'sell' : 'buy');
  },

  // ---------------- หน้าต่าง ----------------
  setupUi() {
    const w = $('#w-market'), menu = $('#menubar');
    if (!w || !menu || !menu.children.length) return;
    this.uiReady = true;
    const t = $('.win-title span', w);
    if (t) { t.dataset.en = 'Central Market'; t.textContent = L('ตลาดกลาง', 'Central Market'); }
    if (!$('[data-win="w-market"]', menu)) {
      const b = h('button', { title: L('ตลาดกลาง (/market)', 'Central Market (/market)'), 'data-win': 'w-market', onclick: () => { UI.toggle('w-market'); if (Pad.enabled()) UI.setFold(menu, true); } });
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
    if (view) this.view = view === 'board' || view === 'shop' ? 'buy' : view === 'mine' ? 'sell' : view;
    if (!this.isOpen()) UI.open('w-market');
    this.refresh(true);
  },
  // วาดใหม่เมื่อข้อมูลเปลี่ยน (กำลังพิมพ์อยู่ = คงโฟกัสและค่าเดิม)
  refresh(force) {
    if (!this.isOpen()) return;
    const now = Date.now();
    const key = JSON.stringify([Online.online, this.view, this.who, this.sel, this.q, this.type, this.sort, !!this.pend, G.player.zeny, G.map.id,
      this.all().map(s => [s.id, s.sid, s.map, this.isLive(s), s.items.map(x => [x.i, x.qty, x.price])]), this.mine && this.mine.items.map(x => [x.i, x.qty, x.price]),
      (G.player.mkSales || []).length && G.player.mkSales[0].at, this.pick && this.pick.uid, this.pick && this.pick.id, this.view === 'sell' ? G.player.inventory.length : 0, Math.floor(now / 60000)]);
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
    if (!Online.online && !this.mine) body.append(this.viewOffline());
    else {
      body.append(this.tabs());
      body.append(this.view === 'sell' ? this.viewSell() : this.viewBuy());
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
      h('p', {}, L('ล็อกอินบัญชีออนไลน์เพื่อวางขายของและซื้อของจากผู้เล่นคนอื่นในตลาดกลาง', 'Log in with an online account to list items and buy from other players on the Central Market.')));
  },
  tabs() {
    const n = this.mine ? this.mine.items.filter(x => x.qty > 0).length : 0;
    const tab = (k, label) => h('button', { type: 'button', role: 'tab', class: 'mk-tab' + (this.view === k ? ' on' : ''), 'data-tab': k, 'aria-selected': this.view === k ? 'true' : 'false', onclick: () => { this.view = k; this.sel = null; this.refresh(true); } }, label);
    return h('div', { class: 'mk-tabs', role: 'tablist' }, tab('buy', L('ซื้อ', 'Buy')), tab('sell', n ? L(`ขายของฉัน (${n}/${MARKET_CFG.slots})`, `My Listings (${n}/${MARKET_CFG.slots})`) : L('ขายของฉัน', 'My Listings')));
  },
  volt(n) { return h('span', { class: 'mk-volt' }, h('i', { class: 'mk-vi', html: TRADE_VOLT }), h('b', {}, U.fmt(n)), h('small', {}, CUR)); },
  icon(x) {
    const it = ITEMS[x.id];
    return h('span', { class: 'inv-cell mk-ic' }, h('img', { src: itemIconUrl(x.id), alt: '' }), x.refine ? h('span', { class: 'rf' }, '+' + x.refine) : null,
      it.slots ? h('span', { class: 'mk-holes' }, Array.from({ length: it.slots }, (_, k) => h('i', { class: k < (x.cards || []).length ? 'on' : '' }))) : null);
  },
  status(s) {
    const on = this.isLive(s), where = this.mapName(s.map);
    return h('span', { class: 'mk-on' + (on ? '' : ' idle') }, h('i', { class: 'mk-dot' }), on ? L(`ออนไลน์${where ? ' · ' + where : ''}`, `Online${where ? ' · ' + where : ''}`) : L('ไม่ตอบสนอง', 'Not responding'));
  },
  viewBuy() {
    const wrap = h('div', { class: 'mk-board' }), list = this.rows(), sellers = this.all().filter(s => !s.mine).length;
    const inp = h('input', { type: 'search', class: 'mk-q', placeholder: L('ค้นหาชื่อไอเทม / ผู้ขาย', 'Search item / seller'), value: this.q, 'data-focus': 'q', 'aria-label': L('ค้นหา', 'Search') });
    inp.addEventListener('input', () => { this.q = inp.value; this.refresh(); });
    inp.addEventListener('keydown', e => e.stopPropagation());
    const type = h('select', { class: 'mk-type', 'aria-label': L('ชนิดไอเทม', 'Item type') }, MARKET_TYPES.map(([k, lab]) => h('option', { value: k }, lab)));
    type.value = this.type; type.addEventListener('change', () => { this.type = type.value; this.refresh(); });
    const sort = h('select', { class: 'mk-sort', 'aria-label': L('เรียง', 'Sort') }, h('option', { value: 'price' }, L('ราคาต่ำ → สูง', 'Price: low → high')), h('option', { value: 'price_desc' }, L('ราคาสูง → ต่ำ', 'Price: high → low')), h('option', { value: 'name' }, L('ชื่อไอเทม', 'Item name')));
    sort.value = this.sort; sort.addEventListener('change', () => { this.sort = sort.value; this.refresh(); });
    wrap.append(h('div', { class: 'mk-filters' }, inp, type, sort));
    if (this.who) {
      const s = this.stalls.get(this.who);
      wrap.append(h('div', { class: 'mk-who' }, h('span', {}, L(`เฉพาะของ ${s ? s.name : '?'}`, `Only ${s ? s.name : '?'}'s listings`)),
        h('button', { type: 'button', class: 'btn small mk-who-x', onclick: () => { this.who = null; this.refresh(true); } }, L('ดูทั้งหมด', 'Show all'))));
    }
    wrap.append(h('div', { class: 'mk-sec' }, L(`ผู้ขายออนไลน์ ${sellers} คน`, `${sellers} seller${sellers === 1 ? '' : 's'} online`), h('small', {}, L(`${list.length} รายการ`, `${list.length} listing${list.length === 1 ? '' : 's'}`))));
    if (this.pend) wrap.append(h('div', { class: 'mk-note' }, L(`กำลังรอ ${this.pend.name} ยืนยันการขาย… (เงินกันไว้ ${U.fmt(this.pend.cost)} ${CUR} — ไม่สำเร็จได้คืนทั้งหมด)`, `Waiting for ${this.pend.name} to confirm… (${U.fmt(this.pend.cost)} ${CUR} held — refunded if it fails)`)));
    const box = h('div', { class: 'mk-list' });
    for (const { s, x } of list) {
      const on = this.sel && this.sel.seller === s.id && this.sel.i === x.i;
      const row = h('div', { class: 'mk-row mk-pickrow' + (s.mine ? ' mine' : '') + (on ? ' sel' : ''), role: 'button', tabindex: '0', 'aria-expanded': on ? 'true' : 'false', 'data-seller': s.id, 'data-i': String(x.i), 'data-id': x.id },
        this.icon(x),
        h('span', { class: 'mk-mid' },
          h('b', { class: rarCls(x.id) }, this.lineName(x, 1), x.qty > 1 ? h('small', { class: 'mk-qty' }, ` ×${U.fmt(x.qty)}`) : null),
          h('small', { class: 'mk-seller' }, h('span', { class: 'mk-sn' }, `${s.name}${s.mine ? L(' (คุณ)', ' (you)') : ''}`), this.status(s))),
        h('span', { class: 'mk-end' }, this.volt(x.price)));
      const pickRow = () => { this.sel = on ? null : { seller: s.id, i: x.i }; this.refresh(true); };
      row.addEventListener('click', pickRow);
      row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickRow(); } e.stopPropagation(); });
      box.append(row);
      if (on) box.append(this.buyBox(s, x));
    }
    if (!list.length) box.append(h('div', { class: 'mk-none' }, sellers || this.live() ? L('ไม่พบรายการที่ตรงกับการค้นหา', 'No listings match your search') : L('ยังไม่มีใครวางขายตอนนี้ — วางขายของคุณเองได้ที่แท็บ "ขายของฉัน" (ทุกแผนที่)', 'Nobody is selling right now — list your own items on the "My Listings" tab (any map)')));
    wrap.append(box);
    wrap.append(h('div', { class: 'hint' }, L(`ซื้อได้จากทุกแผนที่ ไม่ต้องเดินไปหาผู้ขาย • ผู้ขายต้องออนไลน์อยู่ • คุณมี ${U.fmt(G.player.zeny)} ${CUR}`, `Buy from any map — no walking needed • The seller must be online • You have ${U.fmt(G.player.zeny)} ${CUR}`)));
    return wrap;
  },
  // กล่องยืนยันการซื้อใต้แถวที่แตะ: จำนวน → ราคารวม → Volt หลังซื้อ → ยืนยัน
  buyBox(s, x) {
    const p = G.player, box = h('div', { class: 'mk-buybox', 'data-seller': s.id, 'data-i': String(x.i) });
    if (s.mine) {
      box.append(h('div', { class: 'mk-bb-line' }, L('นี่คือของที่คุณวางขายเอง', 'This is your own listing')),
        h('div', { class: 'mk-bb-btns' }, h('button', { type: 'button', class: 'btn mk-tosell', onclick: () => { this.view = 'sell'; this.sel = null; this.refresh(true); } }, L('จัดการที่ "ขายของฉัน"', 'Manage in "My Listings"'))));
      return box;
    }
    const eq = !!x.uid, multi = !eq && x.qty > 1, live = this.isLive(s);
    const qn = h('input', { type: 'number', class: 'mk-n', min: 1, max: x.qty, step: 1, value: '1', 'data-focus': 'n' + s.id + x.i, inputmode: 'numeric', 'aria-label': L('จำนวน', 'Quantity') });
    const total = h('b', { class: 'mk-bb-total' }), after = h('b', { class: 'mk-bb-after' }), go = h('button', { type: 'button', class: 'btn primary mk-buy' }, L('ยืนยันซื้อ', 'Confirm Buy'));
    const qty = () => (multi ? U.clamp(Math.floor(+qn.value) || 1, 1, x.qty) : 1);
    const upd = () => {
      const cost = x.price * qty(), left = p.zeny - cost;
      total.textContent = `${U.fmt(cost)} ${CUR}`;
      after.textContent = left >= 0 ? `${U.fmt(left)} ${CUR}` : L(`ไม่พอ (ขาด ${U.fmt(-left)})`, `Not enough (short ${U.fmt(-left)})`);
      after.classList.toggle('bad', left < 0);
      go.disabled = !!(this.pend || left < 0 || !live || !Online.online);
    };
    qn.addEventListener('input', upd);
    qn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go.click(); } e.stopPropagation(); });
    go.addEventListener('click', () => { if (!go.disabled) this.buy(s.id, x.i, qty()); });
    box.append(
      multi ? h('label', { class: 'mk-bb-q' }, h('span', {}, L(`จำนวน (มี ${U.fmt(x.qty)})`, `Quantity (${U.fmt(x.qty)} available)`)), qn) : null,
      h('div', { class: 'mk-bb-line' }, h('span', {}, L('ราคารวม', 'Total')), total),
      h('div', { class: 'mk-bb-line' }, h('span', {}, L(`${CUR} หลังซื้อ`, `${CUR} after`)), after),
      live ? null : h('div', { class: 'mk-bb-warn' }, L('ผู้ขายไม่ตอบสนอง อาจออฟไลน์ไปแล้ว', 'The seller is not responding and may be offline')),
      h('div', { class: 'mk-bb-btns' }, h('button', { type: 'button', class: 'btn mk-bb-x', onclick: () => { this.sel = null; this.refresh(true); } }, L('ยกเลิก', 'Cancel')), go));
    upd();
    return box;
  },
  viewSell() {
    const wrap = h('div', { class: 'mk-mine' }), p = G.player, v = this.mine;
    const act = v ? v.items.filter(x => x.qty > 0) : [];
    const on = Online.online;
    wrap.append(h('div', { class: 'mk-state' + (on ? ' on' : '') },
      h('b', {}, h('i', { class: 'mk-dot' }), on ? (act.length ? L('กำลังขาย — ผู้เล่นทุกแผนที่เห็นของคุณ', 'Selling — players on every map can see your items') : L('ยังไม่มีของวางขาย', 'Nothing listed yet'))
        : L('ออฟไลน์ — หยุดขายชั่วคราว ของยังพักไว้ปลอดภัย', 'Offline — selling paused, your items are held safely')),
      h('span', {}, L('ขายได้ขณะคุณออนไลน์ — เดิน ตีมอน เปิด AUTO หรือย้ายแผนที่ได้ตามปกติ • ออกจากเกมแล้วของไม่หาย กลับเข้ามาก็ขายต่อ (ขายตอนออฟไลน์ต้องมีตารางบนเซิร์ฟเวอร์ ยังไม่มีในรอบนี้)',
        'Sells while you\'re online — walk, fight, use AUTO or change maps freely • Logging out keeps your items safe and they go back on sale next login (offline selling needs a server table — not in this round)'))));
    wrap.append(h('div', { class: 'mk-sec' }, L(`วางขายอยู่ ${act.length}/${MARKET_CFG.slots}`, `Listed ${act.length}/${MARKET_CFG.slots}`), h('small', {}, L(`ขายได้รวม ${U.fmt(v ? v.earned || 0 : 0)} ${CUR}`, `Earned ${U.fmt(v ? v.earned || 0 : 0)} ${CUR}`))));
    const box = h('div', { class: 'mk-list' });
    for (const x of act) {
      const pr = h('input', { type: 'number', class: 'mk-price', min: 1, max: MARKET_CFG.maxPrice, step: 1, value: String(x.price), 'data-focus': 'pr' + x.i, inputmode: 'numeric', 'aria-label': L(`ราคาต่อชิ้น (${CUR})`, `Price each (${CUR})`) });
      const save = () => this.setPrice(x.i, pr.value);
      pr.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } e.stopPropagation(); });
      box.append(h('div', { class: 'mk-row mk-lrow', 'data-i': String(x.i), 'data-id': x.id },
        h('div', { class: 'mk-ltop' }, this.icon(x),
          h('span', { class: 'mk-mid' }, h('b', { class: rarCls(x.id) }, this.lineName(x, 1)), h('small', {}, L(`เหลือ ${U.fmt(x.qty)} ชิ้น`, `${U.fmt(x.qty)} left`))),
          h('span', { class: 'mk-end' }, this.volt(x.price))),
        h('div', { class: 'mk-ctl' },
          h('label', { class: 'mk-plab' }, h('span', {}, L('ราคา/ชิ้น', 'Price each')), pr),
          h('button', { type: 'button', class: 'btn mk-setp', onclick: save }, L('บันทึกราคา', 'Save price')),
          h('button', { type: 'button', class: 'btn danger mk-cancel', onclick: () => this.cancel(x.i) }, L('ยกเลิกขาย', 'Cancel')))));
    }
    if (!act.length) box.append(h('div', { class: 'mk-none' }, L('แตะของในกระเป๋าด้านล่าง ตั้งจำนวน + ราคา แล้วกด "วางขาย"', 'Tap an item in your bag below, set quantity + price, then press "List"')));
    wrap.append(box);
    if (act.length < MARKET_CFG.slots) wrap.append(this.picker());
    const sales = (p.mkSales || []).slice(0, MARKET_CFG.salesKeep);
    wrap.append(h('div', { class: 'mk-sec' }, L('ประวัติการขาย', 'Sales history'), h('small', {}, L(`ล่าสุด ${sales.length}/${MARKET_CFG.salesKeep}`, `last ${sales.length}/${MARKET_CFG.salesKeep}`))));
    wrap.append(sales.length ? h('div', { class: 'mk-log' }, sales.map(r => h('div', { class: 'mk-sale' },
      h('span', {}, L(`${r.who} ซื้อ ${this.lineName(r, r.qty)}`, `${r.who} bought ${this.lineName(r, r.qty)}`)),
      h('b', {}, `+${U.fmt(r.gain)} ${CUR}`), h('small', {}, this.when(r.at)))))
      : h('div', { class: 'mk-none' }, L('ยังไม่มีการขาย', 'No sales yet')));
    return wrap;
  },
  when(t) {
    const m = Math.floor((Date.now() - t) / 60000);
    if (m < 1) return L('เมื่อสักครู่', 'just now');
    if (m < 60) return L(`${m} นาทีก่อน`, `${m} min ago`);
    const d = new Date(t);
    return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  },
  // กระเป๋า: แตะเพื่อเลือก → ตั้งจำนวน/ราคา → วางขาย (ของที่สวมอยู่ไม่อยู่ในกระเป๋า จึงขายไม่ได้)
  picker() {
    const p = G.player, wrap = h('div', { class: 'mk-pick' });
    wrap.append(h('div', { class: 'mk-sec' }, L('กระเป๋า — แตะของที่จะขาย', 'Bag — tap an item to sell')));
    const grid = h('div', { class: 'mk-inv' });
    for (const e of p.inventory.filter(y => ITEMS[y.id])) {
      const sel = this.pick === e;
      grid.append(h('button', { type: 'button', class: 'inv-cell mk-icell' + (sel ? ' sel' : ''), 'data-id': e.id, 'data-uid': e.uid != null ? String(e.uid) : '',
        title: itemDisplayName(e), 'aria-label': itemDisplayName(e), onclick: () => { this.pick = sel ? null : e; this.refresh(true); } },
      h('img', { src: itemIconUrl(e.id), alt: '' }), isEquipType(ITEMS[e.id]) ? null : h('span', { class: 'q' }, U.fmt(e.qty)), e.refine ? h('span', { class: 'rf' }, '+' + e.refine) : null));
    }
    if (!p.inventory.length) grid.append(h('div', { class: 'mk-none' }, L('กระเป๋าว่าง', 'Bag is empty')));
    wrap.append(grid);
    const e = this.pick && p.inventory.includes(this.pick) ? this.pick : null;
    if (e) {
      const it = ITEMS[e.id], eq = isEquipType(it), max = eq ? 1 : countItem(e.id);
      const qn = h('input', { type: 'number', class: 'mk-pq', min: 1, max, step: 1, value: String(max), 'data-focus': 'pq', inputmode: 'numeric', 'aria-label': L('จำนวน', 'Quantity') });
      const pr = h('input', { type: 'number', class: 'mk-pp', min: 1, max: MARKET_CFG.maxPrice, step: 1, value: String(Math.max(1, it.price || 1)), 'data-focus': 'pp', inputmode: 'numeric', 'aria-label': L(`ราคาต่อชิ้น (${CUR})`, `Price each (${CUR})`) });
      const add = () => this.list(e, eq ? 1 : U.clamp(Math.floor(+qn.value) || 0, 0, max), pr.value);
      for (const el of [qn, pr]) el.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); add(); } ev.stopPropagation(); });
      wrap.append(h('div', { class: 'mk-set' },
        h('span', { class: 'mk-set-n' }, h('img', { src: itemIconUrl(e.id), alt: '' }), h('b', { class: rarCls(e.id) }, itemDisplayName(e))),
        eq ? null : h('label', {}, h('span', {}, L(`จำนวน (มี ${U.fmt(max)})`, `Qty (${U.fmt(max)})`)), qn),
        h('label', {}, h('span', {}, L(`ราคา/ชิ้น (${CUR})`, `Price each (${CUR})`)), pr),
        h('button', { type: 'button', class: 'btn primary mk-add', disabled: Online.online ? false : 'disabled', onclick: add }, L('วางขาย', 'List'))));
    }
    return wrap;
  },
};
Market.boot();
