'use strict';
// ============================================================
//  บันทึกการเล่นแบบโซ่แฮช + EXP/ดรอปจากเซิร์ฟเวอร์ (ระยะ 2) • เซิร์ฟเวอร์: supabase/migrations/20261012002000_event_chain.sql
//  ฆ่ามอนแล้วเกม "ไม่ให้รางวัลเอง" — จดเหตุการณ์ต่อกันเป็นโซ่ { seq, prev, t, k, a } + h = SHA-256(seq|prev|t|k|a…)
//  แล้วส่งเป็นชุด (ทุก 10 ตัว / 30 วิ / ฆ่าบอสทันที) → เซิร์ฟเวอร์ตรวจโซ่ + ความเป็นไปได้ → ทอยรางวัลเอง → เกมใส่ผล (Econ.take) แล้วแสดง
//  หมุด (anchor) จากเซิร์ฟเวอร์ = จุดต่อของชุดถัดไป • ถูกปฏิเสธ = ทิ้งชุดนั้น เริ่มต่อจากหมุดล่าสุดของเซิร์ฟเวอร์
//  เน็ตหลุด: เก็บคิวในเครื่อง (สูงสุด QMAX) ส่งตามลำดับเมื่อกลับมา • เซิร์ฟเวอร์ไม่มีระบบ (PGRST202) / ปิด (chain_off) = เกมให้รางวัลเองแบบเดิม
// ============================================================
const Chain = {
  server: null, anchor: null, head: null, queue: [], key: null, p: Promise.resolve(), busy: false, sinceSend: 0, lastSend: 0, owner: null,
  QMAX: 1000, BATCH: 200, EVERY_MS: 30000, KILLS: 10,

  on() { return this.server === true && !!this.anchor && this.owner === (typeof G !== 'undefined' && G.player) && typeof Online !== 'undefined' && Online.online && !Online.local && !Online.kicked; },
  storeKey() { return `iv_chain_${Online.user && Online.user.id}_${String(G.player.name).trim().toLowerCase()}`; },
  persist() { try { localStorage.setItem(this.key, JSON.stringify({ anchor: this.anchor, head: this.head, queue: this.queue })); } catch (e) { /* โหมดส่วนตัว / เต็ม */ } },
  canon(e) { return [e.seq, e.prev, e.t, e.k, e.a.join('|')].join('|'); },
  async sha(s) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
  },

  // ตัวละครเข้าเกม: ขอหมุดล่าสุด + คืนคิวที่ค้างในเครื่อง (ถ้ายังต่อจากหมุดนี้ได้)
  async start() {
    const p = G.player;
    this.owner = p; this.anchor = null; this.queue = []; this.head = null;
    if (typeof Online === 'undefined' || !Online.online || Online.local || !Online.sb) return;
    let res;
    try { res = await Online.sb.rpc('chain_head', { ch: p.name }); } catch (e) { return; }
    if (G.player !== p) return;
    if (res.error) { if (typeof Econ !== 'undefined' && Econ.missing(res.error) || /chain_off/.test(res.error.message || '')) this.server = false; return; }
    this.server = true;
    if (typeof Econ !== 'undefined' && Econ.server === null) Econ.server = true; // มีโซ่ = มีระบบเศรษฐกิจเซิร์ฟเวอร์ (ต้องดึงรายการได้)
    this.key = this.storeKey();
    const a = res.data;
    let saved = null; try { saved = JSON.parse(localStorage.getItem(this.key)); } catch (e) { saved = null; }
    if (saved && saved.anchor && saved.anchor.id === a.id && Array.isArray(saved.queue) && saved.queue.length && saved.queue[0].seq === a.seq + 1 && saved.queue[0].prev === a.head) {
      this.queue = saved.queue.slice(0, this.QMAX); this.head = saved.head; // ค้างจากรอบก่อน (เน็ตหลุด/ปิดเกม) — ส่งต่อ
    } else this.head = { seq: a.seq, h: a.head };
    this.anchor = a; this.lastSend = Date.now();
    this.persist();
    if (this.queue.length) this.flush(true);
  },

  // ---------- จดเหตุการณ์ (ทีละอัน ตามลำดับ — prev ของอันใหม่ = แฮชของอันก่อน) ----------
  append(k, a) {
    this.p = this.p.then(async () => {
      if (!this.on()) return;
      if (this.queue.length >= this.QMAX) { if (!this.full) { this.full = true; UI.msg(L('⚠ ส่งบันทึกการเล่นไม่ได้นานเกินไป — รางวัลจากมอนจะได้เมื่อเชื่อมต่อเซิร์ฟเวอร์ได้อีกครั้ง', '⚠ Could not send play records for too long — monster rewards resume once the server is reachable.'), 'err'); } return; }
      this.full = false;
      const e = { seq: this.head.seq + 1, prev: this.head.h, t: Date.now(), k, a: a.map(x => (typeof x === 'number' ? Math.round(x) : String(x).replace(/\|/g, '/'))) };
      e.h = await this.sha(this.canon(e));
      this.queue.push(e); this.head = { seq: e.seq, h: e.h };
      this.persist();
    }).catch(err => console.warn('chain append', err));
    return this.p;
  },
  // ฆ่ามอน (แทนรางวัลในเครื่อง): [มอน, แผนที่, เลเวลเรา, จำนวนเพื่อนปาร์ตี้ที่แบ่ง EXP, บอส?]
  onKill(m, party) {
    const d = m.def, boss = !!(d.boss || m.isMvp || m.isWB);
    this.append('kill', [d.id, G.map.id, G.player.baseLv, party | 0, boss ? 1 : 0]);
    this.sinceSend++;
    if (boss || this.sinceSend >= this.KILLS) this.p.then(() => this.flush(true));
  },
  tick() {
    if (typeof G === 'undefined' || !G.started || !G.player) return;
    if (this.owner !== G.player && this.server !== false && Online.online && !Online.local) { this.start(); return; }
    if (this.on() && this.queue.length && Date.now() - this.lastSend > this.EVERY_MS) this.flush(false);
  },

  // ---------- ส่งชุด ----------
  async flush(force) {
    await this.p;
    if (!this.on() || this.busy || !this.queue.length) return;
    this.busy = true; this.lastSend = Date.now(); this.sinceSend = 0;
    const p = G.player, batch = this.queue.slice(0, this.BATCH);
    try {
      if (Online.pendingSave || Online.saving) await Online.flushAll(3000); // เซิร์ฟเวอร์คิด EXP จากเลเวลในเซฟล่าสุด
      const { data, error } = await Online.sb.rpc('submit_events', { ch: p.name, prev_anchor: this.anchor.id, entries: batch });
      if (G.player !== p) return;
      if (error) {
        if (typeof Econ !== 'undefined' && Econ.missing(error) || /chain_off/.test(error.message || '')) { this.server = false; this.anchor = null; return; }
        return; // เน็ต/เซิร์ฟเวอร์สะดุด: เก็บคิวไว้ส่งใหม่
      }
      if (data.status === 'ok') {
        this.anchor = data.anchor;
        await Econ.take({ seq: data.seq, delta: data.delta }); // ใส่รางวัลก่อนตัดคิว (ปิดเกมกลางทาง = ชุดนี้ถูกส่งซ้ำ → dup → ดึงผลจากเซิร์ฟเวอร์)
        this.queue.splice(0, batch.length);
        this.persist();
        this.show(data.got || []);
      } else if (data.status === 'dup') { // ชุดนี้เซิร์ฟเวอร์รับไปแล้ว (คำตอบรอบก่อนหาย) → ดึงผลมาใส่
        this.anchor = data.anchor; this.queue.splice(0, batch.length); this.persist();
        if (typeof Econ !== 'undefined') await Econ.pull();
      } else { // ถูกปฏิเสธ: ทิ้งชุดที่ค้าง เริ่มต่อจากหมุดล่าสุดของเซิร์ฟเวอร์
        this.anchor = data.anchor; this.queue = []; this.head = { seq: data.anchor.seq, h: data.anchor.head }; this.persist();
        this.rejected = (this.rejected || 0) + 1;
        UI.msg(L(`⚠ เซิร์ฟเวอร์ไม่รับบันทึกการเล่นชุดล่าสุด (${data.rule}) — รางวัลชุดนั้นไม่ถูกนับ เริ่มบันทึกใหม่แล้ว`, `⚠ The server rejected the latest play records (${data.rule}) — those rewards were not counted; recording restarted.`), 'err');
        if (typeof Econ !== 'undefined') await Econ.pull();
      }
    } catch (e) { console.warn('chain flush', e); }
    finally { this.busy = false; }
    if (this.queue.length && this.on()) setTimeout(() => this.flush(true), 50);
  },
  // ของที่เซิร์ฟเวอร์ให้ (เงิน/EXP แสดงผ่าน gainExp แล้ว) — ของหายากประกาศ + ลำแสงที่ตัวเรา
  show(got) {
    const p = G.player, by = {};
    for (const g of got) by[g.id] = (by[g.id] || 0) + (g.qty || 1);
    const parts = Object.entries(by).map(([id, n]) => `${ITEMS[id] ? ITEMS[id].name : id}${n > 1 ? ' ×' + n : ''}`);
    if (parts.length) UI.msg(L(`ได้รับจากการล่า: ${parts.join(', ')}`, `Loot from hunting: ${parts.join(', ')}`), 'item');
    for (const g of got) {
      const rank = typeof LOOT !== 'undefined' ? LOOT.rank(g.id) : 0;
      if (g.chip || rank >= 2) {
        addFx({ type: 'beam', x: p.x, y: p.y, dur: 2.6 });
        UI.announce(L(`✦ ได้ ${ITEMS[g.id] ? ITEMS[g.id].name : g.id}! ✦`, `✦ Obtained ${ITEMS[g.id] ? ITEMS[g.id].name : g.id}! ✦`));
      }
    }
  },
};
setInterval(() => { try { Chain.tick(); } catch (e) { console.warn('chain tick', e); } }, 1000);
window.addEventListener('pagehide', () => { if (Chain.on() && Chain.queue.length) Chain.flush(true); });
