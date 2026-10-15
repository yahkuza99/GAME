'use strict';
// ============================================================
//  เศรษฐกิจฝั่งเซิร์ฟเวอร์ (ระยะ 1) — ฝั่งเกม • เซิร์ฟเวอร์: supabase/migrations/20261012001000_economy.sql • อธิบาย: docs/SAVE_VERIFY.md
//  ร้าน NPC / ตีบวก / ตลาดกลาง / แลกเปลี่ยน: เกมขอเซิร์ฟเวอร์ทำ (RPC) → เซิร์ฟเวอร์แก้เซฟในฐานข้อมูล แล้วคืน "ส่วนต่าง" (delta)
//  → เกมใส่ส่วนต่างนั้นให้ตัวละคร + จำเลขลำดับ (p.econSeq) • เซฟถัดไปที่ส่งขึ้นไปจึงตรงกับเซิร์ฟเวอร์เสมอ
//  ก่อนขอทุกครั้ง: ส่งเซฟที่ค้างก่อน (เซิร์ฟเวอร์ต้องเห็นของ/Volt ล่าสุด เช่นของที่เพิ่งเก็บได้แล้วจะขาย)
//  เซิร์ฟเวอร์ยังไม่ได้รัน migration (PGRST202) / ปิดระบบ (econ_off) / เล่นในเครื่อง = ใช้วิธีเดิมในเกม (ทุกที่มีทางถอย)
// ============================================================
const Econ = {
  server: null, busy: 0, pulling: null, sellQ: null,

  boot() {
    if (typeof SAVE_FIELDS !== 'undefined' && !SAVE_FIELDS.includes('econSeq')) SAVE_FIELDS.push('econSeq'); // เลขลำดับรายการเซิร์ฟเวอร์ล่าสุดที่ตัวละครนี้ได้รับแล้ว
  },
  usable() { return this.server !== false && typeof Online !== 'undefined' && Online.online && !Online.local && !!Online.sb && !Online.kicked && typeof G !== 'undefined' && !!G.player; },
  missing(e) { return !!e && (e.code === 'PGRST202' || e.code === '42883' || /Could not find the function|does not exist|econ_off/i.test(e.message || '')); },
  code(e) { const m = String((e && e.message) || e || '').match(/econ_[a-z_]+|banned/); return m ? m[0] : 'error'; },

  // เรียก RPC • คืน { ok, data } | { fallback: true } (ใช้วิธีเดิม) | { err: 'econ_…' }
  async call(fn, args) {
    if (!this.usable()) return { fallback: true };
    this.busy++;
    try {
      // เซิร์ฟเวอร์ต้องเห็นสถานะล่าสุดก่อน (เช่นของที่เพิ่งเก็บได้แล้วจะขาย) — ส่งเซฟก่อนทุกครั้ง (งานเงิน/ของ ไม่ถี่)
      if (fn !== 'econ_pull' && fn !== 'econ_trade_cancel' && G.started) saveGame(true, true);
      if (Online.pendingSave || Online.saving) await Online.flushAll(4000);
      const { data, error } = await Online.sb.rpc(fn, args);
      if (error) {
        if (this.missing(error)) { this.server = false; return { fallback: true }; }
        if (/banned/.test(error.message || '') && typeof SaveVerify !== 'undefined') SaveVerify.showBan(SaveVerify.banned || '');
        return { err: this.code(error) };
      }
      this.server = true;
      return { ok: true, data };
    } catch (e) { return { err: 'network' }; } finally { this.busy--; }
  },
  // ถามครั้งแรกว่าเซิร์ฟเวอร์มีระบบนี้ไหม (ไม่แตะข้อมูล)
  async probe() {
    if (!this.usable() || this.server !== null) return this.server;
    try {
      const { error } = await Online.sb.rpc('econ_pull', { ch: G.player.name, since: 2147483647 });
      if (error && this.missing(error)) this.server = false;
      else if (!error) this.server = true;
    } catch (e) { /* เน็ตหลุด: ถามใหม่ภายหลัง */ }
    return this.server;
  },
  errText(code) {
    return ({
      econ_no_zeny: L(`${CUR} ไม่พอ`, `Not enough ${CUR}`), econ_missing_item: L('ไม่พบของในกระเป๋า (เซิร์ฟเวอร์)', 'Item not found in your bag (server)'),
      econ_not_sold: L('ร้านนี้ไม่ได้ขายของชิ้นนี้', 'This shop does not sell that'), econ_bad_qty: L('จำนวนไม่ถูกต้อง', 'Invalid quantity'), econ_bad_price: L('ราคาไม่ถูกต้อง', 'Invalid price'),
      econ_market_full: L('วางขายได้สูงสุด 12 รายการ', 'You can list up to 12 items'), econ_no_listing: L('ไม่พบรายการขาย', 'Listing not found'),
      econ_soldout: L('ของหมดแล้ว (มีคนซื้อตัดหน้า)', 'sold out (someone bought it first)'), econ_stock: L('ของเหลือไม่พอ', 'not enough left'), econ_changed: L('ผู้ขายเปลี่ยนราคาหรือยกเลิกรายการนี้', 'the seller changed or cancelled this listing'),
      econ_maxed: L('ตีบวกเต็มแล้ว', 'Already at +10'), econ_no_char: L('เซิร์ฟเวอร์ยังไม่มีตัวละครนี้ (ลองใหม่อีกครั้ง)', 'The server has no save for this character yet (try again)'),
      econ_bad_peer: L('ผู้เล่นไม่ถูกต้อง', 'Invalid player'), econ_seller_banned: L('ผู้ขายถูกระงับ', 'The seller is blocked'), banned: L('บัญชีถูกระงับ', 'Account blocked'), network: L('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'Could not reach the server'),
    })[code] || L('เซิร์ฟเวอร์ไม่รับคำขอ', 'The server rejected the request');
  },

  // ---------- ใส่ส่วนต่างจากเซิร์ฟเวอร์ (ตรรกะเดียวกับ ec_apply ใน SQL แบบไม่ strict) ----------
  applyDelta(p, d) {
    if (!d) return;
    if (d.zeny) p.zeny = Math.max(0, (p.zeny || 0) + d.zeny);
    for (const r of d.remove || []) {
      if (r.uid != null) { const i = p.inventory.findIndex(e => e.uid === r.uid); if (i >= 0) p.inventory.splice(i, 1); continue; }
      let need = r.qty;
      for (const e of p.inventory.filter(y => y.id === r.id && y.uid == null)) { const k = Math.min(need, e.qty); e.qty -= k; need -= k; if (!need) break; }
      p.inventory = p.inventory.filter(e => !(e.qty <= 0 && e.uid == null));
    }
    for (const a of d.add || []) {
      if (a.uid != null) p.inventory.push({ id: a.id, qty: 1, uid: a.uid, refine: a.refine || 0, cards: (a.cards || []).slice() });
      else { const ex = p.inventory.find(e => e.id === a.id && e.uid == null); if (ex) ex.qty += a.qty; else p.inventory.push({ id: a.id, qty: a.qty }); }
    }
    if ('vend' in d) { p.vend = d.vend || null; if (typeof Market !== 'undefined' && Market.owner === p) Market.mine = p.vend; }
    if (d.sale) { if (!Array.isArray(p.mkSales)) p.mkSales = []; p.mkSales.unshift(d.sale); p.mkSales.length = Math.min(p.mkSales.length, 20); }
    if (d.refine && p.equip[d.refine.slot]) p.equip[d.refine.slot].refine = d.refine.to;
    // รางวัลจากการล่าที่เซิร์ฟเวอร์ทอย (ระยะ 2 — js/chain.js): EXP ผ่าน gainExp (ขึ้นเลเวลแบบเดียวกับเซิร์ฟเวอร์ + เอฟเฟกต์) · สมุดมอนที่ได้ชิป
    if (d.exp && (d.exp.b > 0 || d.exp.j > 0) && p === G.player) gainExp(d.exp.b || 0, d.exp.j || 0);
    if (Array.isArray(d.chips)) { if (!Array.isArray(p.chips)) p.chips = []; for (const id of d.chips) if (!p.chips.includes(id)) p.chips.push(id); }
    if (typeof SaveVerify !== 'undefined' && SaveVerify.fixDups) SaveVerify.fixDups(p, 'econ'); // อุปกรณ์ uid ที่มีอยู่แล้วถูกเพิ่มซ้ำ (เช่นรายการเดียวกันถูกใส่สองรอบ) = ซ่อมทันที
    if (p === G.player) { recalc(); UI.dirty(); }
  },
  // ผลจาก RPC ของเรา ({ seq, delta }) — ถ้ามีรายการที่เรายังไม่ได้รับคั่นอยู่ ดึงมาก่อนตามลำดับ
  async take(res) {
    const p = G.player;
    if (!res || !res.delta) return;
    if ((p.econSeq || 0) + 1 < res.seq) await this.pull(res.seq - 1);
    if ((p.econSeq || 0) >= res.seq) return; // ได้ไปแล้ว (เช่นจาก pull)
    this.applyDelta(p, res.delta);
    p.econSeq = res.seq;
    saveGame(true, true);
  },
  // ดึงรายการที่เซิร์ฟเวอร์ทำกับตัวละครเรา (ขายได้ในตลาด / อีกฝ่ายกดแลกสำเร็จ) • upto = หยุดที่ลำดับนี้
  pull(upto) {
    if (!this.usable() || this.server !== true) return Promise.resolve([]);
    if (this.pulling) return this.pulling;
    const p = G.player;
    this.pulling = (async () => {
      const got = [];
      const { data, error } = await Online.sb.rpc('econ_pull', { ch: p.name, since: p.econSeq || 0 });
      if (error || !Array.isArray(data) || G.player !== p) return got;
      for (const ev of data) {
        if (upto && ev.seq > upto) break;
        if (ev.seq !== (p.econSeq || 0) + 1) break; // ขาดช่วง (ไม่ควรเกิด) — รอเซฟให้เซิร์ฟเวอร์เติมแทน
        this.applyDelta(p, ev.delta);
        p.econSeq = ev.seq;
        got.push(ev);
      }
      if (got.length) saveGame(true, true);
      for (const ev of got) if (ev.kind === 'market_sale' && typeof Market !== 'undefined') Market.onServerSale(ev.delta);
      return got;
    })().finally(() => { this.pulling = null; });
    return this.pulling;
  },

  // ---------- ร้าน NPC ----------
  async shopBuy(id, qty) {
    const r = await this.call('econ_shop_buy', { ch: G.player.name, item: id, qty });
    if (r.ok) { await this.take(r.data); UI.msg(L(`ซื้อ ${ITEMS[id].name} ×${qty} (-${U.fmt(ITEMS[id].price * qty)} ${CUR})`, `Bought ${ITEMS[id].name} ×${qty} (-${U.fmt(ITEMS[id].price * qty)} ${CUR})`), 'item'); Sound.play('buy'); }
    else if (r.err) UI.msg(L(`ซื้อไม่สำเร็จ: ${this.errText(r.err)}`, `Purchase failed: ${this.errText(r.err)}`), 'err');
    return r;
  },
  // ขายหลายครั้งในจังหวะเดียว (ขายทั้งหมด) รวมเป็นคำขอเดียว
  shopSell(e, qty, quiet, legacy) {
    if (!this.sellQ) {
      this.sellQ = { lines: [], ents: [], quiet: true, legacy };
      setTimeout(() => this.flushSell(), 0);
    }
    const q = this.sellQ;
    if (q.ents.includes(e) && e.uid != null) return;
    q.ents.push(e); q.quiet = q.quiet && !!quiet;
    q.lines.push(e.uid != null ? { uid: e.uid } : { id: e.id, qty });
    e.__selling = true;
  },
  async flushSell() {
    const q = this.sellQ; this.sellQ = null;
    if (!q || !q.lines.length) return;
    // ของกองชนิดเดียวกันรวมเป็นบรรทัดเดียว
    const lines = [], by = {};
    for (const l of q.lines) { if (l.uid != null) lines.push(l); else if (by[l.id]) by[l.id].qty += l.qty; else lines.push(by[l.id] = { id: l.id, qty: l.qty }); }
    const r = await this.call('econ_shop_sell', { ch: G.player.name, lines });
    for (const e of q.ents) delete e.__selling;
    const bump = n => { if (n > 0 && typeof Daily !== 'undefined' && Daily.bump) Daily.bump('sell', n); }; // ภารกิจประจำวัน "ขายของ" (นับ Volt ที่ได้)
    if (r.fallback) { const z0 = G.player.zeny; for (let i = 0; i < q.ents.length; i++) q.legacy(q.ents[i], q.lines[i].qty || 1, q.quiet); bump(G.player.zeny - z0); return; }
    if (!r.ok) { UI.msg(L(`ขายไม่สำเร็จ: ${this.errText(r.err)}`, `Sale failed: ${this.errText(r.err)}`), 'err'); return; }
    await this.take(r.data);
    bump(r.data.delta.zeny);
    if (!q.quiet) { UI.msg(L(`ขายของ ${lines.length} รายการ (+${U.fmt(r.data.delta.zeny)} ${CUR})`, `Sold ${lines.length} item line(s) (+${U.fmt(r.data.delta.zeny)} ${CUR})`), 'item'); Sound.play('buy'); }
  },

  // ---------- ตีบวก 1 ครั้ง (เซิร์ฟเวอร์สุ่ม) → { ok, success } | { fallback } | { err } ----------
  async refine(slot) {
    const r = await this.call('econ_refine', { ch: G.player.name, slot });
    if (!r.ok) return r;
    await this.take(r.data);
    return { ok: true, success: !!r.data.delta.ok, delta: r.data.delta };
  },
};
Econ.boot();
// ร้าน NPC: ซื้อ/ขายผ่านเซิร์ฟเวอร์เมื่อพร้อม (ไม่พร้อม = วิธีเดิมใน js/ui.js)
window.addEventListener('DOMContentLoaded', () => {
  if (typeof UI === 'undefined' || UI.buy.__econ) return;
  const buy0 = UI.buy, sell0 = UI.sell;
  UI.buy = function (id, qty) {
    if (!Econ.usable()) return buy0.call(this, id, qty);
    const it = ITEMS[id];
    if (!it || G.player.zeny < it.price * qty) return buy0.call(this, id, qty); // ข้อความ "เงินไม่พอ" แบบเดิม
    Econ.shopBuy(id, qty).then(r => { if (r.fallback) buy0.call(UI, id, qty); UI.dirty(); });
  };
  UI.sell = function (e, qty, quiet) {
    if (!Econ.usable() || !e || !G.player.inventory.includes(e)) return sell0.call(this, e, qty, quiet);
    if (e.__selling) return;
    Econ.shopSell(e, qty, quiet, (x, n, qt) => sell0.call(UI, x, n, qt));
  };
  UI.buy.__econ = UI.sell.__econ = true;
});
