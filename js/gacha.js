'use strict';
// ============================================================================================
//  วงล้อนอร์น (Norn's Wheel) — ระบบกาชาจากของบอส
//  ฆ่าบอส → ได้ "Valhalla Sigil" (ตราวัลฮัลลา) → นำไปหมุนวงล้อนอร์นที่นีโอเอลด์ไฮม์ (เครื่องข้างลานน้ำพุ ฝั่งตะวันตก)
//  Kill bosses → collect Valhalla Sigils → spin Norn's Wheel in Neo Eldheim (west side of the fountain plaza).
// ============================================================================================
//
//  ┌─────────────────────────────── วิธีแก้ตาราง (เจ้าของเกม) ───────────────────────────────┐
//  │ แก้เฉพาะ GACHA_CONFIG ด้านล่างนี้ แล้วรีโหลดหน้าเกม                                          │
//  │                                                                                          │
//  │ • เปอร์เซ็นต์ "รายชิ้น": ของรางวัลแต่ละแถวมีค่า pct ของตัวเอง (ไม่ได้แบ่งตามระดับความหายาก)      │
//  │   pct ทุกแถวรวมกันต้องได้ 100 พอดี — ถ้าไม่ครบ 100 เกมจะปรับสัดส่วนให้เอง                      │
//  │   และเตือนใน Console (F12) เท่านั้น ผู้เล่นไม่เห็น                                            │
//  │ • เพิ่มของรางวัล: คัดลอก 1 แถว เช่น  { id: 'white_potion', qty: 5, pct: 14 },                │
//  │     id  = รหัสไอเทม (ดูใน js/data.js, js/loot.js, js/content_ch6.js)                        │
//  │     qty = จำนวนที่ได้ต่อครั้ง   pct = โอกาสออก (%)                                            │
//  │   แล้วลด pct แถวอื่นลงให้รวมกันยังเป็น 100                                                  │
//  │ • รางวัลเป็นเงิน: { volt: 5000, pct: 9, rarity: 'uncommon' }  (rarity = สีกรอบ/ระดับ)          │
//  │ • ลบของรางวัล: ลบทั้งแถว แล้วเอา pct ของแถวนั้นไปเพิ่มให้แถวอื่น                               │
//  │ • rarity (ไม่บังคับ): บังคับระดับของแถวนั้น — ปกติใช้ความหายากของไอเทมเอง                     │
//  │   common < uncommon < rare < epic < legend                                               │
//  │ • ค่าหมุน: cost = ใช้ตรากี่อันต่อ 1 ครั้ง                                                    │
//  │   multi.count / multi.cost = หมุนรวดกี่ครั้ง ใช้ตรากี่อัน                                      │
//  │   multi.guarantee = การันตีอย่างน้อย 1 ชิ้นระดับนี้ขึ้นไปในการหมุนรวด (null = ไม่การันตี)        │
//  │ • pity: every = หมุนครบกี่ครั้งโดยไม่ได้ของระดับ rarity ขึ้นไป แล้วครั้งนั้นได้แน่นอน (null = ปิด)  │
//  │   การันตี/pity สุ่มใหม่เฉพาะของที่เข้าเงื่อนไข โดยใช้ pct เดิมเป็นน้ำหนัก (สัดส่วนเท่าเดิม)       │
//  │ • drop: จำนวนตราที่ได้ — mvp = ผู้ปราบ MVP ได้, worldBoss = ทุกคนที่ร่วมตี World Boss ได้          │
//  └──────────────────────────────────────────────────────────────────────────────────────────┘
//  ┌──────────────────────────────── How to edit (owner) ─────────────────────────────────────┐
//  │ Edit only GACHA_CONFIG below, then reload the game.                                       │
//  │ • Every prize row has its OWN percentage (pct). There are no per-tier/overall rates.      │
//  │   All pct values must add up to exactly 100. If they don't, the game rescales them and    │
//  │   prints a warning in the browser console (F12) only — players never see it.             │
//  │ • Add a prize: copy a row, e.g. { id: 'white_potion', qty: 5, pct: 14 },                 │
//  │   (id = item id from js/data.js / js/loot.js / js/content_ch6.js, qty = amount per win)   │
//  │   then lower other rows so the total stays 100.                                          │
//  │ • Volt prize: { volt: 5000, pct: 9, rarity: 'uncommon' }                                 │
//  │ • Remove a prize: delete its row and give its pct to the other rows.                      │
//  │ • rarity (optional) overrides the row's tier; default = the item's own rarity.           │
//  │ • Costs: cost = Sigils per single roll; multi.count / multi.cost = the bulk roll.        │
//  │   multi.guarantee = at least one prize of this tier or higher in a bulk roll (or null).  │
//  │ • pity.every = after this many rolls without a pity.rarity+ prize, the next one is       │
//  │   guaranteed (null disables). Guarantees re-roll among eligible rows only, weighted by   │
//  │   the same pct values.                                                                   │
//  │ • drop.mvp = Sigils for the MVP killer; drop.worldBoss = Sigils for every World Boss     │
//  │   participant who receives the kill reward.                                              │
//  └──────────────────────────────────────────────────────────────────────────────────────────┘
const GACHA_CONFIG = {
  token: 'valhalla_sigil',              // ไอเทมที่ใช้หมุน (สร้างในไฟล์นี้) / the roll currency item
  drop: { mvp: 1, worldBoss: 3 },       // ตราที่ได้ต่อการปราบ / Sigils per boss kill
  cost: 1,                              // ตราต่อการหมุน 1 ครั้ง / Sigils per single roll
  multi: { count: 10, cost: 10, guarantee: 'rare' }, // หมุนรวด 10 ครั้ง การันตี Rare+ 1 ชิ้น
  pity: { every: 50, rarity: 'epic' },  // ครบ 50 ครั้งไม่ได้ Epic+ → ครั้งที่ 50 ได้แน่นอน (null = ปิด)
  table: [
    // ---- ของใช้ / Consumables (common) ----
    { id: 'white_potion',   qty: 5,  pct: 14 },   // Repair Kit XL ×5
    { id: 'yellow_potion',  qty: 10, pct: 12 },   // Repair Kit L ×10
    { id: 'blue_potion',    qty: 3,  pct: 11 },   // Energy Cell ×3
    { id: 'mead',           qty: 5,  pct: 8 },    // Overclock Brew ×5
    { id: 'hearth_rune',    qty: 3,  pct: 6 },    // Return Beacon ×3
    // ---- เงิน / แร่ตีบวก / ของขาย (uncommon) ----
    { volt: 5000,                    pct: 9, rarity: 'uncommon' },
    { id: 'rune_alloy',     qty: 2,  pct: 9 },    // แร่ตีบวกอาวุธ / weapon refine ore
    { id: 'volt_ore',       qty: 2,  pct: 9 },    // แร่ตีบวกชุดเกราะ / armor refine ore
    { id: 'einherjar_medal', qty: 1, pct: 5 },
    // ---- หายาก / Rare ----
    { volt: 25000,                   pct: 3, rarity: 'rare' },
    { id: 'valkyrie_plume', qty: 1,  pct: 3 },
    { id: 'meadow_charm',   qty: 1,  pct: 2.5 },  // เครื่องประดับ Rare (ทุก Class)
    { id: 'husk_signet',    qty: 1,  pct: 2.5 },  // เครื่องประดับ Rare (ทุก Class)
    // ---- Epic / Epic ----
    { id: 'yggdrasil_shard', qty: 1, pct: 2.8 },  // Yggdrasil Core
    { id: 'seraph_mantle',  qty: 1,  pct: 1.2 },
    { id: 'kitsune_tail',   qty: 1,  pct: 0.8 },
    { id: 'garmr_collar',   qty: 1,  pct: 0.6 },
    { id: 'seraph_card',    qty: 1,  pct: 0.5 },  // ชิป MVP / MVP chip
    // ---- ตำนาน / Legendary ----
    { id: 'aureole',        qty: 1,  pct: 0.05 },
    { id: 'ragnarok_ember', qty: 1,  pct: 0.05 },
  ],
};

// ============================================================================================
//  ตรา (ไอเทมใหม่) + ไอคอนวาดด้วยโค้ด
// ============================================================================================
ITEMS[GACHA_CONFIG.token] = {
  id: GACHA_CONFIG.token, name: 'Valhalla Sigil', type: 'etc', price: 100, rarity: 'rare', icon: { s: 'sigil', c: '#ffd36a' },
  desc: L(`ตราวัลฮัลลา ฉีกออกมาจากแกนของบอสที่ล้มลง — ปราบ MVP ได้ ${GACHA_CONFIG.drop.mvp} อัน, ร่วมตี World Boss ได้ ${GACHA_CONFIG.drop.worldBoss} อัน นำไปหมุนวงล้อนอร์น (Norn's Wheel) ที่นีโอเอลด์ไฮม์`,
    `A sigil torn from a fallen champion's core — ${GACHA_CONFIG.drop.mvp} per MVP kill, ${GACHA_CONFIG.drop.worldBoss} per World Boss you helped defeat. Spend it at Norn's Wheel in Neo Eldheim.`),
};
{
  const shape0 = drawIconShape;
  // ไอคอนเหรียญตรา: ขอบทอง + หน้ากากไวเซอร์สีฟ้า + สามเหลี่ยมวาลนุต
  drawIconShape = function (g, spec, S) {
    if (!spec || spec.s !== 'sigil') return shape0(g, spec, S);
    g.save(); g.scale(S / 24, S / 24);
    const rg = g.createRadialGradient(9, 8, 1, 12, 12, 11);
    rg.addColorStop(0, '#fff4c4'); rg.addColorStop(0.55, '#f0bd48'); rg.addColorStop(1, '#8a5a12');
    g.fillStyle = rg; g.beginPath(); g.arc(12, 12, 10.5, 0, 7); g.fill();
    g.strokeStyle = 'rgba(40,24,0,0.7)'; g.lineWidth = 1.1; g.stroke();
    g.strokeStyle = 'rgba(255,248,210,0.75)'; g.lineWidth = 0.7; g.beginPath(); g.arc(12, 12, 8.6, 0, 7); g.stroke();
    g.fillStyle = '#0e1626'; g.beginPath(); g.arc(12, 12.4, 6.6, 0, 7); g.fill();
    g.strokeStyle = '#f0bd48'; g.lineWidth = 1; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(8.2, 8.6); g.lineTo(15.8, 8.6); g.lineTo(12, 15.4); g.closePath(); g.stroke();
    g.shadowColor = '#6ff3ff'; g.shadowBlur = 3;
    g.fillStyle = '#7ff6ff'; g.beginPath(); g.moveTo(7.4, 11.2); g.lineTo(16.6, 11.2); g.lineTo(15.8, 12.8); g.lineTo(8.2, 12.8); g.closePath(); g.fill();
    g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(8.6, 11.5, 3, 0.7);
    g.restore();
  };
}

// ============================================================================================
//  แกนระบบ: ตรวจตาราง / สุ่ม / เก็บสถานะ
// ============================================================================================
const Gacha = {
  C: GACHA_CONFIG,
  TOKEN: GACHA_CONFIG.token,
  NPC_ID: 'norn',
  rows: [], rawSum: 0, pityRank: null, guarRank: null,
  tab: 'wheel', anim: null, angle: 0,

  rankOf(r) { return (typeof RARITY !== 'undefined' && RARITY[r]) ? RARITY[r].rank : 0; },
  validate() {
    const C = this.C, warn = m => console.warn('[Gacha] ' + m), rows = [];
    (Array.isArray(C.table) ? C.table : []).forEach((r0, i) => {
      if (!r0 || typeof r0 !== 'object') { warn(`table[${i}] is not an object — skipped`); return; }
      const r = Object.assign({}, r0);
      if (r.volt != null) {
        r.volt = Math.floor(+r.volt); delete r.id;
        if (!(r.volt > 0)) { warn(`table[${i}]: volt must be > 0 — skipped`); return; }
      } else if (!ITEMS[r.id]) { warn(`table[${i}]: unknown item id "${r.id}" — skipped`); return; }
      r.qty = Math.max(1, Math.floor(+r.qty || 1));
      r.pct = +r.pct;
      if (!(r.pct > 0)) { warn(`table[${i}] (${r.id || r.volt + ' Volt'}): pct must be > 0 — skipped`); return; }
      if (r.rarity && !RARITY[r.rarity]) { warn(`table[${i}]: unknown rarity "${r.rarity}" — using the item's own`); delete r.rarity; }
      r.rar = r.rarity || (r.id ? LOOT.rarityOf(r.id) : 'uncommon');
      r.rank = this.rankOf(r.rar);
      r.i = rows.length;
      rows.push(r);
    });
    const sum = rows.reduce((a, r) => a + r.pct, 0);
    this.rawSum = sum;
    if (rows.length && Math.abs(sum - 100) > 0.001) warn(`table percentages add up to ${+sum.toFixed(4)}, not 100 — normalizing every row by ×${+(100 / sum).toFixed(5)}. Fix GACHA_CONFIG.table in js/gacha.js.`);
    for (const r of rows) r.w = sum > 0 ? r.pct * 100 / sum : 0;
    if (!rows.length) warn('table is empty — the wheel is disabled.');
    this.rows = rows;
    const elig = rk => rk != null && rows.some(r => r.rank >= rk);
    const pc = C.pity, mc = C.multi;
    this.pityRank = pc && pc.rarity && pc.every > 0 ? this.rankOf(pc.rarity) : null;
    if (pc && pc.rarity && !RARITY[pc.rarity]) { warn(`pity.rarity "${pc.rarity}" is unknown — pity disabled`); this.pityRank = null; }
    if (this.pityRank != null && !elig(this.pityRank)) { warn(`no prize is ${pc.rarity} or better — pity disabled`); this.pityRank = null; }
    this.guarRank = mc && mc.guarantee ? this.rankOf(mc.guarantee) : null;
    if (mc && mc.guarantee && !RARITY[mc.guarantee]) { warn(`multi.guarantee "${mc.guarantee}" is unknown — guarantee disabled`); this.guarRank = null; }
    if (this.guarRank != null && !elig(this.guarRank)) { warn(`no prize is ${mc.guarantee} or better — guarantee disabled`); this.guarRank = null; }
    return rows;
  },
  // สุ่ม 1 แถวตามน้ำหนัก pct (minRank = สุ่มใหม่เฉพาะแถวที่ระดับถึง — สัดส่วนเดิม)
  pick(minRank = 0) {
    let pool = this.rows.filter(r => r.rank >= minRank);
    if (!pool.length) pool = this.rows;
    const tot = pool.reduce((a, r) => a + r.w, 0);
    let x = Math.random() * tot;
    for (const r of pool) { x -= r.w; if (x < 0) return r; }
    return pool[pool.length - 1];
  },
  // ผลการหมุน n ครั้ง (เปลี่ยน st.pity ตามไปด้วย) • multi = หมุนรวด (มีการันตีชิ้นสุดท้าย)
  rollRows(n, st, multi) {
    const out = [], every = this.C.pity && this.C.pity.every;
    for (let i = 0; i < n; i++) {
      let min = 0;
      if (this.pityRank != null && st.pity + 1 >= every) min = this.pityRank;
      if (multi && this.guarRank != null && i === n - 1 && !out.some(r => r.rank >= this.guarRank)) min = Math.max(min, this.guarRank);
      const r = this.pick(min);
      out.push(r);
      st.pity = this.pityRank != null && r.rank < this.pityRank ? st.pity + 1 : 0;
    }
    return out;
  },
  // สถานะในเซฟ: { pity, total, hist: [{ t, id|volt, q, r }] } — เซฟเก่าไม่มีก็สร้างใหม่
  st(p = G.player) {
    if (!p) return { pity: 0, total: 0, hist: [] };
    const s = p.gacha && typeof p.gacha === 'object' ? p.gacha : {};
    p.gacha = {
      pity: Math.max(0, Math.floor(+s.pity || 0)), total: Math.max(0, Math.floor(+s.total || 0)),
      hist: (Array.isArray(s.hist) ? s.hist : []).filter(e => e && (ITEMS[e.id] || e.volt > 0)).slice(-20),
    };
    return p.gacha;
  },
  tokens(p = G.player) { return p ? p.inventory.filter(e => e.id === this.TOKEN).reduce((a, e) => a + e.qty, 0) : 0; },
  costOf(multi) { return multi ? this.C.multi.cost : this.C.cost; },
  countOf(multi) { return multi ? this.C.multi.count : 1; },
  canRoll(multi) { return !!(G.started && G.player && this.rows.length && this.tokens() >= this.costOf(multi)); },
  takeTokens(n) {
    const p = G.player;
    for (const e of p.inventory.filter(x => x.id === this.TOKEN)) { if (n <= 0) break; const k = Math.min(n, e.qty); removeEntry(e, k); n -= k; }
  },
  grant(r) {
    if (r.volt) { G.player.zeny += r.volt; return; }
    addItem(r.id, r.qty, true);
  },
  // หมุนจริง: ตัดตรา → สุ่ม → ให้ของ → เซฟทันที (ก่อนเล่นแอนิเมชัน: รีเฟรชหน้าก็สุ่มใหม่ไม่ได้)
  roll(multi) {
    if (this.anim || !this.canRoll(multi)) return null;
    const st = this.st(), n = this.countOf(multi);
    this.takeTokens(this.costOf(multi));
    const res = this.rollRows(n, st, multi);
    for (const r of res) this.grant(r);
    st.total += n;
    for (const r of res) st.hist.push(r.volt ? { t: Date.now(), volt: r.volt, r: r.rar } : { t: Date.now(), id: r.id, q: r.qty, r: r.rar });
    st.hist = st.hist.slice(-20);
    saveGame(true, true);
    UI.dirty();
    return res;
  },

  // ---------------- ของจากบอส ----------------
  bossTokens(m) {
    const d = m && m.def; if (!d || d.dummy || m.isPlayer) return 0;
    if (m.isWB || d.worldBoss) return this.C.drop.worldBoss | 0;
    if (d.boss || m.isMvp) return this.C.drop.mvp | 0;
    return 0;
  },
  onBossKill(m) {
    const n = this.bossTokens(m); if (n <= 0 || !G.player) return;
    addItem(this.TOKEN, n, true);
    const nm = ITEMS[this.TOKEN].name;
    addFloater(m.x, m.y - 1.6, `+${n} ${nm}`, '#ffd36a', true);
    UI.msg(L(`◈ ได้รับ ${nm} ×${n} จาก ${m.def.name} — นำไปหมุนวงล้อนอร์นที่นีโอเอลด์ไฮม์`, `◈ Obtained ${nm} ×${n} from ${m.def.name} — spend it at Norn's Wheel in Neo Eldheim.`), 'lvl');
    saveGame(true);
    this.refresh();
  },

  // ---------------- ข้อความแสดงผล ----------------
  rowName(r) { return r.volt ? `${U.fmt(r.volt)} ${CUR}` : ITEMS[r.id].name; },
  rowFull(r) { return this.rowName(r) + (!r.volt && r.qty > 1 ? ` ×${r.qty}` : ''); },
  color(rar) { return RARITY[rar] ? RARITY[rar].color : '#e8eef6'; },
  fmtPct(w) { return `${+w.toFixed(w < 0.1 ? 3 : 2)}%`; },
  voltUrl: null,
  voltIcon() {
    if (this.voltUrl) return this.voltUrl;
    const c = document.createElement('canvas'); c.width = c.height = 48;
    const g = c.getContext('2d'); g.scale(2, 2);
    const rg = g.createRadialGradient(9, 8, 1, 12, 12, 11); rg.addColorStop(0, '#fff7c8'); rg.addColorStop(0.6, '#ffd040'); rg.addColorStop(1, '#a07010');
    g.fillStyle = rg; g.beginPath(); g.arc(12, 12, 10, 0, 7); g.fill(); g.strokeStyle = 'rgba(60,36,0,.7)'; g.lineWidth = 1.1; g.stroke();
    g.fillStyle = '#3a2600'; g.beginPath(); g.moveTo(13.5, 4.5); g.lineTo(7.5, 13); g.lineTo(11.5, 13); g.lineTo(10.5, 19.5); g.lineTo(16.5, 10.5); g.lineTo(12.5, 10.5); g.closePath(); g.fill();
    return (this.voltUrl = c.toDataURL());
  },
  icon(r) { return r.volt ? this.voltIcon() : itemIconUrl(r.id); },
  img(r, cls) {
    const el = h('img', { src: this.icon(r), alt: '', class: cls || '' });
    return r.volt ? el : UI.tipFor(el, { id: r.id, refine: 0, cards: [] });
  },
  simple() {
    let rm = false; try { rm = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ไม่เป็นไร */ }
    return rm || (typeof R !== 'undefined' && R.quality === 'low');
  },
};
Gacha.validate();

// ============================================================================================
//  เกี่ยวเข้ากับเกม (ไม่แก้ไฟล์หลัก): NPC / การตายของบอส / ข้อมูลไอเทม / เมนู / ปุ่มลัด
// ============================================================================================
// เครื่องวงล้ออยู่ริมลานน้ำพุฝั่งตะวันตก (ตรงข้าม Storage Unit Kaia)
if (MAP_DEFS.eldheim && !MAP_DEFS.eldheim.npcs.some(n => n.id === Gacha.NPC_ID)) MAP_DEFS.eldheim.npcs.push({ id: Gacha.NPC_ID, name: "Norn's Wheel", x: 13, y: 20, look: 'machine' });

{
  // บอส: ห่อ killMob (ห่อทับของ worldboss.js) — ผู้ปราบ MVP / ทุกคนที่ได้รางวัลบอสโลก (remoteKill → killMob)
  const kill0 = killMob;
  killMob = function (m) {
    const was = !!(m && m.dead);
    const r = kill0.apply(this, arguments);
    if (!was) Gacha.onBossKill(m);
    return r;
  };
  // การ์ดไอเทม "ได้จาก": ตราไม่ได้อยู่ในตารางดรอป (ให้ตรงเข้ากระเป๋า) → แสดงรายชื่อบอสแทน
  const src0 = UI.dropSources.bind(UI);
  UI.dropSources = id => {
    if (id !== Gacha.TOKEN) return src0(id);
    const mvps = Object.values(MOBS).filter(m => m.boss && !m.worldBoss && !m.dummy && !/^wb_/.test(m.id)).sort((a, b) => a.lv - b.lv);
    const where = mid => { const k = Object.keys(MAP_DEFS).find(k => MAP_DEFS[k].mvp === mid || (MAP_DEFS[k].spawns || []).some(s => s[0] === mid)); return k ? MAP_DEFS[k].name : ''; };
    const C = Gacha.C.drop;
    return h('div', { class: 'tip-src' }, h('b', {}, 'Dropped by'),
      ...mvps.map(m => h('div', {}, `${m.name} (MVP) · Lv ${m.lv}`, h('small', {}, ` ${where(m.id)}${where(m.id) ? ' · ' : ''}×${C.mvp} (100%)`))),
      C.worldBoss > 0 ? h('div', {}, 'Every World Boss', h('small', {}, ` · each participant ×${C.worldBoss} (100%)`)) : null); // รายละเอียดไอเทม = อังกฤษเสมอ
  };
  // หน้าต่างข้อมูลมอน: บอสแสดงตราเป็นของดรอปแถวแรก
  const mob0 = UI.renderMob.bind(UI);
  UI.renderMob = () => {
    mob0();
    const d = MOBS[UI.mobInfo], body = document.querySelector('#w-mob .win-body'), list = body && body.querySelector('.mb-drops');
    if (!d || !list || list.querySelector('.gc-mbtok')) return;
    const n = Gacha.bossTokens({ def: d, isWB: !!d.worldBoss }); if (n <= 0) return;
    const hint = list.querySelector('.hint'); if (hint) hint.remove();
    list.prepend(h('div', { class: 'mb-drop gc-mbtok', title: ITEMS[Gacha.TOKEN].desc },
      h('img', { src: itemIconUrl(Gacha.TOKEN), alt: '' }), h('span', { class: rarCls(Gacha.TOKEN) }, `${ITEMS[Gacha.TOKEN].name} ×${n}`), h('em', {}, '100%')));
  };
  // วาดเครื่องวงล้อแทนตัวคน
  const npc0 = Sprites.drawNpc;
  Sprites.drawNpc = (g, n, t) => (n.id === Gacha.NPC_ID ? Gacha.drawMachine(g, n, t) : npc0(g, n, t));
}

NPC.scripts[Gacha.NPC_ID] = async n => {
  const nm = `[${n.name}]`, tk = ITEMS[Gacha.TOKEN].name, have = Gacha.tokens();
  const c = await UI.menu(nm, L(`<i>วงล้อหมุนช้า ๆ เสียงเฟืองดังเหมือนเสียงกระซิบของสามนอร์น — อูร์ด, แวร์ดันดี, สกุลด์</i><br>เด็กแห่งเหล็ก... ป้อน ${B(tk)} ให้วงล้อ แล้วเส้นด้ายแห่งโชคชะตาจะถักของขวัญให้เจ้า<br>เจ้ามี ${B(have + ' อัน')}`,
    `<i>The wheel turns slowly; its gears hum like the whisper of the three Norns — Urd, Verdandi, Skuld.</i><br>Child of steel... feed the wheel a ${B(tk)} and the threads of fate will weave you a gift.<br>You carry ${B(String(have))}.`),
  [L('หมุนวงล้อ', 'Spin the Wheel'), L('ดูอัตราของรางวัลทั้งหมด', 'View every prize rate'), L(`${tk} หาได้จากไหน?`, `Where do I get ${tk}s?`), L('ไว้ทีหลัง', 'Later')]);
  if (c === 0 || c === 1) { UI.dlgClose(); Gacha.open(c === 1 ? 'rates' : 'wheel'); }
  else if (c === 2) {
    const D = Gacha.C.drop;
    await UI.say(nm, L(`เมื่อแชมเปียนล้มลง แกนของมันจะทิ้ง ${B(tk)} ไว้<br>• ปราบ ${B('MVP')}: ได้ ${B(D.mvp + ' อัน')} (ผู้ปราบ)<br>• ร่วมตี ${B('World Boss')} จนล้ม: ทุกคนที่ร่วมตีได้ ${B(D.worldBoss + ' อัน')}<br>หมุน 1 ครั้งใช้ ${Gacha.C.cost} อัน • หมุนรวด ${Gacha.C.multi.count} ครั้งใช้ ${Gacha.C.multi.cost} อัน`,
      `When a champion falls, its core leaves a ${B(tk)} behind.<br>• Defeat an ${B('MVP')}: ${B(String(D.mvp))} for the killer<br>• Help bring down a ${B('World Boss')}: ${B(String(D.worldBoss))} for every participant<br>One spin costs ${Gacha.C.cost} • ${Gacha.C.multi.count} spins cost ${Gacha.C.multi.cost}`));
  }
};

// ============================================================================================
//  ภาพเครื่องวงล้อในเมือง: ภาพอบจาก Blender (tools/bifrost3d.py → NORN_BAKE ใน js/bake_data_eldheim_bifrost.js)
//  ไม่มีภาพ/ยังโหลดไม่เสร็จ/ผังช่องรอบเครื่องเปลี่ยน (hash) → วาดด้วยโค้ดแบบเดิม (drawMachineCode)
// ============================================================================================
Gacha.drawMachine = (g, n, t) => { if (!Gacha.drawMachine3D(g, n, t)) Gacha.drawMachineCode(g, n, t); };
// วงล้อ 3D: ชีต 24 เฟรม/รอบ (เฟรมละ 15° ตามเข็มนาฬิกา) + หมุนส่วนที่เหลือระหว่างเฟรมด้วย 2D
//   (หน้าวงล้อเป็นระนาบ กล้องออร์โธ → หมุนในระนาบ = บีบแนวตั้ง c แล้วหมุนแล้วคลายคืน ตรงพอดี) — เฟรมเปลี่ยนแค่แสง/ไฮไลต์ทอง
//   ปกติหมุนช้า ๆ • ตอนหน้าต่างกาชากำลังหมุน (Gacha.anim.spinAnim) เร่งเร็วขึ้นแบบนุ่ม ๆ แล้วค่อย ๆ ช้าลง
//   วาดวงล้อก่อน แล้ววาดฐานทับ (ส่วนของฐานที่อยู่หลังวงล้อถูกเจาะโปร่งตอนอบ — เข็มชี้ที่อยู่หน้าวงล้อจึงทับวงล้อถูกต้อง)
Gacha.drawMachine3D = (g, n, t) => {
  const nb = typeof NORN_BAKE !== 'undefined' && NORN_BAKE, map = typeof G !== 'undefined' && G.map;
  if (!nb || !map || map.id !== 'eldheim' || typeof Bake === 'undefined' || !Bake.rectOk(map, nb)) return false;
  const W = nb.wheel, B = nb.base;
  Art.need(W.img); Art.need(B.img); // โหลดตอนเข้าเมือง (bake_* ไม่โหลดตอนบูต)
  const wi = Art.get(W.img), bi = Art.get(B.img);
  if (!wi || !bi) return false;
  const st = n._wheel || (n._wheel = { a: 0, v: 24, lt: t });
  const dt = Math.min(0.1, Math.max(0, t - st.lt)); st.lt = t;
  const A = Gacha.anim, fast = !!(A && !A.dead && A.spinAnim && A.spinAnim.playState === 'running');
  st.v += ((fast ? 620 : 24) - st.v) * Math.min(1, dt * (fast ? 3 : 1.2)); // องศา/วินาที
  st.a = (st.a + st.v * dt) % 360;
  const step = 360 / W.n, f = Math.floor(st.a / step) % W.n, res = (st.a - f * step) * Math.PI / 180;
  const s = nb.scale, x = nb.x * TILE, y = nb.y * TILE, cx = x + W.dx, cy = y + W.dy;
  // ผู้เล่นยืนหลังเครื่อง (เหนือ) แล้วโดนวงล้อบัง → จางลง (แบบชิ้นอบอื่นใน js/bake.js)
  const p = G.player, behind = p && !p.dead && p.y < nb.y && p.y > nb.y - 3.2 && Math.abs(p.x - nb.x) < 1.3;
  st.fa = (st.fa == null ? 1 : st.fa) + ((behind ? 0.45 : 1) - (st.fa == null ? 1 : st.fa)) * Math.min(1, dt * 8);
  g.save();
  g.imageSmoothingEnabled = true;
  if (st.fa < 0.995) g.globalAlpha *= st.fa;
  g.save(); g.translate(cx, cy); g.scale(1, W.c); g.rotate(res); g.scale(1, 1 / W.c);
  g.drawImage(wi, (f % W.cols) * W.fw, Math.floor(f / W.cols) * W.fh, W.fw, W.fh, -W.cx * s, -W.cy * s, W.fw * s, W.fh * s);
  g.restore();
  g.drawImage(bi, x - B.ax * s, y - B.ay * s, bi.width * s, bi.height * s);
  if (R.quality !== 'low') { // ลูกแก้วกลางดุมเรือง (แรงขึ้นตอนหมุนเร็ว)
    const k = Math.min(1, st.v / 620), pulse = 0.5 + 0.5 * Math.sin(t * 2.2), gl = Bake.glint('150,220,255'), r = 9 + 5 * pulse + 10 * k;
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = st.fa * (0.35 + 0.2 * pulse + 0.4 * k);
    g.drawImage(gl, cx - r, cy - r * 0.95, r * 2, r * 2);
  }
  g.restore();
  return true;
};
Gacha.drawMachineCode = (g, n, t) => {
  const bx = n.x * TILE + TILE / 2, by = n.y * TILE + TILE / 2 + 10, S = 1.3;
  const COL = ['#e8eef6', '#62e27e', '#4fa8ff', '#c27bff', '#ffb52e'];
  Sprites.shadow(g, bx, by, 36, 11, 0.34);
  g.save();
  g.translate(bx, by); g.scale(S, S);
  const x = 0, y = 0, cy = y - 52, Rr = 23;
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
  // แท่นวงรีเรืองแสง
  g.fillStyle = '#1a2234'; g.beginPath(); g.ellipse(x, y + 1, 30, 7, 0, 0, 7); g.fill();
  g.strokeStyle = `rgba(111,243,255,${0.35 + pulse * 0.35})`; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y + 1, 30, 7, 0, 0, 7); g.stroke();
  // แสงออร่าหลังวงล้อ
  const au = g.createRadialGradient(x, cy, 6, x, cy, 52);
  au.addColorStop(0, `rgba(170,140,255,${0.28 + pulse * 0.12})`); au.addColorStop(1, 'rgba(170,140,255,0)');
  g.fillStyle = au; g.beginPath(); g.arc(x, cy, 52, 0, 7); g.fill();
  // เสาค้ำ
  const post = g.createLinearGradient(0, cy, 0, y - 12); post.addColorStop(0, '#c9a24a'); post.addColorStop(1, '#5a6684');
  g.fillStyle = post; g.fillRect(x - 25, cy - 2, 4, y - 12 - cy); g.fillRect(x + 21, cy - 2, 4, y - 12 - cy);
  // ฐาน
  const base = g.createLinearGradient(0, y - 16, 0, y + 3); base.addColorStop(0, '#34405c'); base.addColorStop(1, '#121826');
  g.fillStyle = base; g.beginPath(); g.moveTo(x - 27, y - 15); g.lineTo(x + 27, y - 15); g.lineTo(x + 22, y + 3); g.lineTo(x - 22, y + 3); g.closePath(); g.fill();
  g.strokeStyle = `rgba(111,243,255,${0.55 + pulse * 0.3})`; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x - 27, y - 15); g.lineTo(x + 27, y - 15); g.stroke();
  g.fillStyle = `rgba(111,243,255,${0.5 + pulse * 0.4})`; g.font = '600 8px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('ᚢ  ᚹ  ᛋ', x, y - 6);
  // วงล้อ (หมุนช้า ๆ)
  g.fillStyle = '#0c1220'; g.beginPath(); g.arc(x, cy, Rr + 3, 0, 7); g.fill();
  const rot = t * 0.45, N = 10;
  for (let i = 0; i < N; i++) {
    const a0 = rot + i * Math.PI * 2 / N, a1 = a0 + Math.PI * 2 / N;
    g.fillStyle = U.rgba(COL[[0, 1, 2, 0, 1, 3, 0, 1, 2, 4][i]], 0.62);
    g.beginPath(); g.arc(x, cy, Rr, a0, a1); g.arc(x, cy, 10, a1, a0, true); g.closePath(); g.fill();
  }
  g.strokeStyle = 'rgba(10,14,24,0.85)'; g.lineWidth = 1.2;
  for (let i = 0; i < N; i++) { const a = rot + i * Math.PI * 2 / N; g.beginPath(); g.moveTo(x + Math.cos(a) * 10, cy + Math.sin(a) * 10); g.lineTo(x + Math.cos(a) * Rr, cy + Math.sin(a) * Rr); g.stroke(); }
  g.fillStyle = 'rgba(255,246,220,0.85)'; g.font = '600 6.5px serif';
  for (let i = 0; i < N; i++) { const a = rot + (i + 0.5) * Math.PI * 2 / N; g.fillText(Gacha.RUNES[i], x + Math.cos(a) * 17, cy + Math.sin(a) * 17); }
  // ซุ้มโค้งทองเหนือวงล้อ + อัญมณี
  g.strokeStyle = '#c9a24a'; g.lineWidth = 2.4; g.beginPath(); g.arc(x, cy, Rr + 9, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
  g.fillStyle = '#6ff3ff'; g.shadowColor = '#6ff3ff'; g.shadowBlur = 8 + pulse * 6;
  g.beginPath(); g.moveTo(x, cy - Rr - 16); g.lineTo(x + 3.5, cy - Rr - 11.5); g.lineTo(x, cy - Rr - 7); g.lineTo(x - 3.5, cy - Rr - 11.5); g.closePath(); g.fill();
  g.shadowBlur = 0;
  g.strokeStyle = '#e8bf5a'; g.lineWidth = 2.6; g.beginPath(); g.arc(x, cy, Rr + 1.5, 0, 7); g.stroke();
  g.strokeStyle = `rgba(255,240,190,${0.35 + pulse * 0.3})`; g.lineWidth = 1; g.beginPath(); g.arc(x, cy, Rr + 4, 0, 7); g.stroke();
  // ดุมกลาง: หน้ากากไวเซอร์แอนดรอยด์
  g.fillStyle = '#0b1020'; g.beginPath(); g.arc(x, cy, 10, 0, 7); g.fill();
  g.strokeStyle = 'rgba(111,243,255,0.8)'; g.lineWidth = 1.3; g.stroke();
  g.shadowColor = '#6ff3ff'; g.shadowBlur = 6 + pulse * 6;
  g.fillStyle = '#8ff7ff'; g.beginPath(); g.moveTo(x - 7, cy - 1.8); g.lineTo(x + 7, cy - 1.8); g.lineTo(x + 6, cy + 1.8); g.lineTo(x - 6, cy + 1.8); g.closePath(); g.fill();
  g.shadowBlur = 0;
  // เข็มชี้ด้านบน
  g.fillStyle = '#ffd36a'; g.strokeStyle = 'rgba(60,36,0,0.8)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(x - 5.5, cy - Rr - 6); g.lineTo(x + 5.5, cy - Rr - 6); g.lineTo(x, cy - Rr + 3); g.closePath(); g.fill(); g.stroke();
  // ประกายลอยรอบเครื่อง
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const a = t * 0.9 + i * 1.57, rr = 34 + Math.sin(t * 1.3 + i) * 4;
    g.fillStyle = `rgba(255,220,140,${0.4 + 0.4 * Math.sin(t * 3 + i * 2)})`;
    g.beginPath(); g.arc(x + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.55, 1.6, 0, 7); g.fill();
  }
  g.restore();
};

// ============================================================================================
//  หน้าต่างกาชา
// ============================================================================================
Object.assign(Gacha, {
  RUNES: 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃ',
  init() {
    const w = document.createElement('div');
    w.id = 'w-gacha'; w.className = 'win hidden center';
    w.innerHTML = `<div class="win-title"><span>${"Norn's Wheel"}</span></div><div class="win-body gc-body"></div>`;
    (document.getElementById('w-classbook') || document.getElementById('w-help') || document.body.lastElementChild).after(w);
    const open0 = UI.open.bind(UI), close0 = UI.close.bind(UI), rw0 = UI.renderWindows.bind(UI);
    UI.open = id => { open0(id); if (id === 'w-gacha') this.render(); };
    UI.close = id => { const r = close0(id); if (id === 'w-gacha' && r) this.onClose(); return r; };
    UI.renderWindows = force => { const d = UI.isDirty || force; rw0(force); if (d) this.refresh(); };
    window.addEventListener('load', () => setTimeout(() => this.menuButton(), 0));
    document.addEventListener('keydown', e => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || U.key(e) !== 'r') return; // Shift+R = Runes (js/runebook.js)
      const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (typeof G === 'undefined' || !G.started || (UI.dialog && UI.isOpen('w-dialog'))) return;
      UI.toggle('w-gacha');
    });
    this.injectCss();
  },
  menuButton() {
    const m = document.getElementById('menubar'); if (!m || m.querySelector('[data-win="w-gacha"]')) return;
    const b = document.createElement('button');
    b.dataset.win = 'w-gacha'; b.title = L("วงล้อนอร์น — กาชา (R)", "Norn's Wheel — Gacha (R)");
    b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><circle cx="12" cy="13" r="2.4"/><path d="M12 5v5.6M12 15.4V21M4 13h5.6M14.4 13H20M6.4 7.4l4 4M13.6 14.6l4 4M17.6 7.4l-4 4M10.4 14.6l-4 4"/><path d="M10 2h4l-2 3z"/></svg><span>${'Gacha'}</span><small>R</small>`;
    b.addEventListener('click', () => { UI.toggle('w-gacha'); if (typeof Pad !== 'undefined' && Pad.enabled() && UI.setFold) UI.setFold(m, true); });
    const sit = [...m.querySelectorAll('button')].find(x => (x.querySelector('small') || {}).textContent === 'X');
    m.insertBefore(b, sit || null);
  },
  open(tab) { if (tab) this.tab = tab; if (UI.isOpen('w-gacha')) this.render(); else UI.open('w-gacha'); },
  body() { return document.querySelector('#w-gacha .gc-body'); },

  // ภาพจริงของหน้ากาชา (ฉากบ่อน้ำอูร์ด / วงล้อ / สามนอร์น / หลังการ์ด 5 ระดับ) — มีครบ = หน้าจอเต็มแบบมีภาพ
  art() { return typeof Art !== 'undefined' && Art.has('gacha_wheel') && Art.has('gacha_bg'); },
  applyArt() {
    const w = document.getElementById('w-gacha'); if (!w) return;
    const on = this.art(); w.classList.toggle('gc-art', on);
    if (!on || w.dataset.art) return;
    w.dataset.art = '1';
    const u = k => Art.has(k) ? `url("${Art.get(k).src}")` : 'none';
    w.style.setProperty('--gc-bg', u('gacha_bg'));
    ['common', 'uncommon', 'rare', 'epic', 'legend'].forEach((k, i) => w.style.setProperty('--cb' + i, u('gacha_card_' + k)));
  },
  render() {
    const body = this.body(); if (!body || !G.player) return;
    if (this.anim) return; // กำลังเล่นแอนิเมชัน: ไม่สร้างใหม่ทับ
    this.applyArt();
    body.innerHTML = '';
    const tabs = [['wheel', L('วงล้อ', 'Wheel')], ['rates', L('อัตรารางวัล', 'Rates')], ['hist', 'History']];
    body.append(h('div', { class: 'tabs gc-tabs', role: 'tablist' }, ...tabs.map(([k, t]) => h('button', { type: 'button', role: 'tab', class: 'tab' + (this.tab === k ? ' on' : ''), 'aria-selected': this.tab === k ? 'true' : 'false',
      onclick: () => { this.tab = k; Sound.play('click'); this.render(); } }, t))));
    body.append(this.tab === 'rates' ? this.ratesPane() : this.tab === 'hist' ? this.histPane() : this.wheelPane());
  },
  // อัปเดตเฉพาะตัวเลข/ปุ่ม (ไม่สร้างหน้าต่างใหม่)
  refresh() {
    if (!UI.isOpen || !document.getElementById('w-gacha') || !UI.isOpen('w-gacha') || !G.player) return;
    const body = this.body(); if (!body) return;
    const tk = this.tokens(), st = this.st();
    const set = (sel, v) => { const el = body.querySelector(sel); if (el && el.textContent !== String(v)) el.textContent = v; };
    set('.gc-tk b', U.fmt(tk));
    for (const b of body.querySelectorAll('[data-roll]')) b.disabled = !!this.anim || !this.canRoll(b.dataset.roll === 'multi');
    if (this.anim) return; // ตัวนับ pity อัปเดตหลังเปิดการ์ดครบ (ไม่สปอยว่าได้ Epic)
    const pv = this.pityRank != null ? Math.min(st.pity, this.C.pity.every) : 0;
    set('.gc-pity-n', `${pv}/${this.C.pity ? this.C.pity.every : 0}`);
    const fill = body.querySelector('.gc-pity i'); if (fill && this.pityRank != null) fill.style.transform = `scaleX(${pv / this.C.pity.every})`;
  },
  costChip(multi) { return h('span', { class: 'gc-cost' }, h('img', { src: itemIconUrl(this.TOKEN), alt: '' }), String(this.costOf(multi))); },
  rollBtns(cls) {
    const M = this.C.multi;
    return h('div', { class: 'gc-btns ' + (cls || '') },
      h('button', { type: 'button', class: 'btn gc-roll', 'data-roll': 'one', disabled: this.canRoll(false) ? null : 'disabled', onclick: () => this.go(false) },
        h('span', { class: 'gc-bl' }, L('หมุน ×1', 'Roll ×1')), this.costChip(false)),
      h('button', { type: 'button', class: 'btn gc-roll gc-ten', 'data-roll': 'multi', disabled: this.canRoll(true) ? null : 'disabled', onclick: () => this.go(true) },
        h('span', { class: 'gc-bl' }, L(`หมุน ×${M.count}`, `Roll ×${M.count}`), this.guarRank != null ? h('small', {}, L(`การันตี ${RARITY[M.guarantee].label}+`, `${RARITY[M.guarantee].label}+ guaranteed`)) : null),
        this.costChip(true)));
  },
  wheelPane() {
    const st = this.st(), tk = this.tokens(), P = this.C.pity, D = this.C.drop;
    const runes = [...this.RUNES].map((r, i) => h('i', { style: `transform:rotate(${i * 30 + 15}deg) translateY(calc(var(--wr) * -0.38))` }, r));
    const art = this.art();
    const ring = h('div', { class: 'gc-ring', style: `transform:rotate(${this.angle}deg)` }, ...(art ? [h('img', { src: Art.get('gacha_wheel').src, alt: '', draggable: 'false' })] : runes));
    const stage = h('div', { class: 'gc-stage' },
      h('div', { class: 'gc-rays' }),
      art && Art.has('gacha_norns') ? h('img', { class: 'gc-nornart', src: Art.get('gacha_norns').src, alt: '', 'aria-hidden': 'true', draggable: 'false' })
        : h('div', { class: 'gc-norns', 'aria-hidden': 'true' }, h('span', {}, 'URÐR'), h('span', {}, 'VERÐANDI'), h('span', {}, 'SKULD')),
      h('div', { class: 'gc-threads', 'aria-hidden': 'true', html: '<svg viewBox="0 0 300 60" preserveAspectRatio="none"><path d="M50 4 C 70 40, 130 44, 150 58"/><path d="M150 4 C 146 24, 154 40, 150 58"/><path d="M250 4 C 230 40, 170 44, 150 58"/></svg>' }),
      h('div', { class: 'gc-wheel' },
        h('div', { class: 'gc-idle' }, ring),
        h('div', { class: 'gc-rim' }),
        h('div', { class: 'gc-hub' }, h('i', { class: 'gc-visor' })),
        h('div', { class: 'gc-pointer' })),
      h('div', { class: 'gc-skip' }, L('แตะเพื่อข้าม', 'Tap to skip')));
    const pv = this.pityRank != null ? Math.min(st.pity, P.every) : 0;
    const info = h('div', { class: 'gc-info' },
      h('div', { class: 'gc-tk', title: ITEMS[this.TOKEN].desc }, h('img', { src: itemIconUrl(this.TOKEN), alt: '' }),
        h('div', {}, h('small', {}, ITEMS[this.TOKEN].name), h('b', {}, U.fmt(tk)))),
      this.pityRank != null ? h('div', { class: 'gc-pity-w', title: L(`หมุนครบ ${P.every} ครั้งโดยไม่ได้ ${RARITY[P.rarity].label} ขึ้นไป → ครั้งนั้นได้แน่นอน`, `${P.every} rolls without ${RARITY[P.rarity].label}+ → the next one is guaranteed`) },
        h('div', { class: 'gc-pity-t' }, h('span', {}, L(`การันตี ${RARITY[P.rarity].label}+`, `${RARITY[P.rarity].label}+ pity`)), h('b', { class: 'gc-pity-n' }, `${pv}/${P.every}`)),
        h('div', { class: 'gc-pity', style: `--pc:${this.color(P.rarity)}` }, h('i', { style: `transform:scaleX(${pv / P.every})` }))) : null);
    const main = h('div', { class: 'gc-main' }, stage, info, this.rollBtns(),
      h('div', { class: 'gc-hint' }, L(`หาตราได้จาก: ปราบ MVP ×${D.mvp} · ร่วมตี World Boss ×${D.worldBoss}`, `Earn Sigils: MVP kill ×${D.mvp} · World Boss participation ×${D.worldBoss}`)),
      h('canvas', { class: 'gc-fx', 'aria-hidden': 'true' }));
    main.addEventListener('pointerdown', e => { if (this.anim && !e.target.closest('button')) this.fastForward(); });
    return h('div', { class: 'gc-pane' }, main);
  },
  ratesPane() {
    const P = this.C.pity, M = this.C.multi, st = this.st();
    const rows = [...this.rows].sort((a, b) => b.rank - a.rank || a.w - b.w || a.i - b.i);
    const tiers = Object.keys(RARITY).map(k => [k, this.rows.filter(r => r.rar === k).reduce((a, r) => a + r.w, 0)]).filter(([, v]) => v > 0).reverse();
    return h('div', { class: 'gc-pane gc-rates' },
      h('div', { class: 'gc-rsum' },
        h('span', {}, L(`หมุน 1 ครั้ง: ${this.C.cost} ตรา`, `1 roll: ${this.C.cost} Sigil${this.C.cost > 1 ? 's' : ''}`)),
        h('span', {}, L(`หมุนรวด ${M.count} ครั้ง: ${M.cost} ตรา`, `${M.count} rolls: ${M.cost} Sigils`) + (this.guarRank != null ? L(` · การันตี ${RARITY[M.guarantee].label}+ อย่างน้อย 1`, ` · at least 1 ${RARITY[M.guarantee].label}+`) : '')),
        this.pityRank != null ? h('span', { class: 'gc-rpity' }, L(`การันตี ${RARITY[P.rarity].label}+ ทุก ${P.every} ครั้ง — ตอนนี้ ${Math.min(st.pity, P.every)}/${P.every} (อีก ${Math.max(1, P.every - st.pity)} ครั้ง)`,
          `${RARITY[P.rarity].label}+ guaranteed every ${P.every} rolls — now ${Math.min(st.pity, P.every)}/${P.every} (${Math.max(1, P.every - st.pity)} to go)`)) : null),
      h('div', { class: 'gc-tier', 'aria-hidden': 'true' }, ...tiers.map(([k, v]) => h('i', { style: `flex:${v} 1 0;background:${this.color(k)}`, title: `${RARITY[k].label} ${this.fmtPct(v)}` }))),
      h('div', { class: 'gc-tleg' }, ...tiers.map(([k, v]) => h('span', { style: `--c:${this.color(k)}` }, `${RARITY[k].label} ${this.fmtPct(v)}`))),
      h('div', { class: 'gc-rlist', role: 'table', 'aria-label': L('อัตราของรางวัล', 'Prize rates') },
        ...rows.map(r => h('div', { class: 'gc-rrow', role: 'row', style: `--c:${this.color(r.rar)}` },
          this.img(r, 'gc-ric'),
          h('div', { class: 'gc-rn' }, h('b', { class: 'rar-' + r.rar }, this.rowFull(r)), h('small', {}, RARITY[r.rar].label)),
          h('em', { class: 'gc-rp' }, this.fmtPct(r.w))))),
      h('p', { class: 'gc-note' }, L('ของแต่ละชิ้นมีเปอร์เซ็นต์ของตัวเอง (รวมกัน 100%) • การันตีหมุนรวดและการันตีสะสม จะสุ่มใหม่เฉพาะของที่เข้าเงื่อนไข ตามสัดส่วนเปอร์เซ็นต์เดิม',
        'Every prize has its own chance (all add up to 100%). The bulk-roll guarantee and pity re-roll only among eligible prizes, keeping these same proportions.')));
  },
  histPane() {
    const st = this.st(), list = [...st.hist].reverse();
    const ago = t => { const s = Math.max(0, (Date.now() - t) / 1000); return s < 60 ? L('เมื่อครู่', 'just now') : s < 3600 ? L(`${Math.floor(s / 60)} นาทีก่อน`, `${Math.floor(s / 60)}m ago`) : s < 86400 ? L(`${Math.floor(s / 3600)} ชม.ก่อน`, `${Math.floor(s / 3600)}h ago`) : L(`${Math.floor(s / 86400)} วันก่อน`, `${Math.floor(s / 86400)}d ago`); };
    return h('div', { class: 'gc-pane gc-hist' },
      h('div', { class: 'gc-rsum' }, h('span', {}, L(`หมุนไปแล้วทั้งหมด ${U.fmt(st.total)} ครั้ง`, `Total rolls: ${U.fmt(st.total)}`)), h('span', {}, L('แสดง 20 ครั้งล่าสุด', 'Showing the last 20'))),
      list.length ? h('div', { class: 'gc-rlist' }, ...list.map(e => {
        const r = e.volt ? { volt: e.volt, rar: e.r } : { id: e.id, qty: e.q || 1, rar: e.r || LOOT.rarityOf(e.id) };
        if (!RARITY[r.rar]) r.rar = 'common';
        return h('div', { class: 'gc-rrow', style: `--c:${this.color(r.rar)}` }, this.img(r, 'gc-ric'),
          h('div', { class: 'gc-rn' }, h('b', { class: 'rar-' + r.rar }, this.rowFull(r)), h('small', {}, RARITY[r.rar].label)), h('em', { class: 'gc-ago' }, ago(e.t)));
      })) : h('div', { class: 'gc-empty' }, L('ยังไม่เคยหมุน — วงล้อรอเส้นด้ายแรกของเจ้าอยู่', 'No rolls yet — the wheel awaits your first thread.')));
  },

  // ============================================================================================
  //  แอนิเมชัน: หมุน (ชะลอตอนจบ + สีแสงไล่ระดับ) → แฟลช/ประกาย → เปิดการ์ดทีละใบ (แตะ = เร่ง)
  // ============================================================================================
  go(multi) {
    if (this.anim) return;
    if (this.tab !== 'wheel') { this.tab = 'wheel'; this.render(); }
    const res = this.roll(multi);
    if (!res) { if (G.player) UI.msg(L(`${ITEMS[this.TOKEN].name} ไม่พอ (ต้องใช้ ${this.costOf(multi)} อัน)`, `Not enough ${ITEMS[this.TOKEN].name}s (need ${this.costOf(multi)}).`), 'err'); return; }
    this.play(res, multi);
  },
  async play(res, multi) {
    const body = this.body(), main = body && body.querySelector('.gc-main');
    const A = this.anim = { res, multi, ff: false, wake: null, dead: false, done: false };
    if (!main) { this.finish(A); return; }
    const simple = this.simple(), best = Math.max(...res.map(r => r.rank));
    main.classList.add('gc-busy'); main.classList.toggle('gc-simple', simple);
    main.querySelector('.gc-res') && main.querySelector('.gc-res').remove();
    this.refresh();
    const wait = ms => new Promise(r => {
      if (A.ff || A.dead || ms <= 0) return r();
      const t = setTimeout(() => { A.wake = null; r(); }, ms);
      A.wake = () => { clearTimeout(t); A.wake = null; r(); };
    });
    // ---- 1) หมุนวงล้อ ----
    const stage = main.querySelector('.gc-stage');
    if (simple) { this.hint(stage, best); await wait(300); }
    else await this.spin(stage, best, multi, wait, A);
    if (A.dead) return;
    // ---- 2) แฟลช + ประกาย (Epic / Legendary) ----
    if (best >= 3) { this.flash(best, simple); if (!simple) this.burst(main, null, best, best >= 4 ? 140 : 90); Sound.play(best >= 4 ? 'mvp' : 'levelup'); }
    else Sound.play(best >= 2 ? 'holy' : 'refine_ok');
    // ---- 3) การ์ด ----
    A.ff = false;
    const cards = this.cards(main, res, multi, simple);
    await wait(simple ? 0 : 260);
    for (let i = 0; i < cards.length; i++) {
      if (A.dead) return;
      const c = cards[i], r = res[i];
      if (!simple && !A.ff && r.rank >= 3) { c.classList.add('gc-tease'); await wait(r.rank >= 4 ? 700 : 480); }
      this.flip(c, r, simple || A.ff, main, multi);
      if (!A.ff && !simple) await wait(multi ? (r.rank >= 3 ? 420 : 150) : 0);
    }
    await wait(simple ? 0 : 380);
    if (!A.dead) this.finish(A);
  },
  hint(stage, k) {
    if (!stage) return;
    const c = this.color(Object.keys(RARITY).find(x => RARITY[x].rank === k) || 'common');
    stage.style.setProperty('--hint', c);
    stage.dataset.rank = k;
  },
  async spin(stage, best, multi, wait, A) {
    const ring = stage.querySelector('.gc-ring'), hub = stage.querySelector('.gc-hub');
    const D = multi ? 2000 : 1550, a0 = this.angle, a1 = a0 + 360 * (multi ? 5 : 4) + Math.floor(Math.random() * 360);
    this.angle = a1 % 360;
    stage.classList.add('gc-spin');
    this.hint(stage, 0);
    Sound.play('warp');
    const an = ring.animate([
      { transform: `rotate(${a0}deg)`, easing: 'cubic-bezier(.3,0,.6,1)' },
      { transform: `rotate(${a0 - 26}deg)`, offset: 0.13, easing: 'cubic-bezier(.22,.62,.12,1)' },
      { transform: `rotate(${a1}deg)` },
    ], { duration: D, fill: 'forwards' });
    A.spinAnim = an;
    const t0 = performance.now();
    // สีแสงไล่ระดับ ขาว → เขียว → ฟ้า → ม่วง → ทอง จนถึงระดับสูงสุดในผลลัพธ์
    for (let k = 1; k <= best; k++) {
      await wait(D * (0.3 + 0.55 * (k / best)) - (performance.now() - t0));
      if (A.dead) { an.cancel(); return; }
      this.hint(stage, k);
      hub.animate([{ transform: 'translate(-50%,-50%) scale(1)' }, { transform: `translate(-50%,-50%) scale(${1.1 + k * 0.04})` }, { transform: 'translate(-50%,-50%) scale(1)' }], { duration: 260, easing: 'ease-out' });
      Sound.play(k >= 3 ? 'buff' : 'click');
    }
    await wait(D - (performance.now() - t0));
    if (A.dead) { an.cancel(); return; }
    an.finish(); ring.style.transform = `rotate(${a1}deg)`; an.cancel();
    stage.classList.remove('gc-spin'); stage.classList.add('gc-landed');
    hub.animate([{ transform: 'translate(-50%,-50%) scale(1.25)', filter: 'brightness(2)' }, { transform: 'translate(-50%,-50%) scale(1)', filter: 'brightness(1)' }], { duration: 420, easing: 'ease-out' });
  },
  cards(main, res, multi, simple) {
    const panel = h('div', { class: 'gc-res' + (multi ? ' gc-multi' : ' gc-one') },
      h('div', { class: 'gc-rhead' }, multi ? L(`ผลการหมุน ×${res.length}`, `${res.length} rolls`) : L('ผลการหมุน', 'Your prize'), h('small', { class: 'gc-tap' }, L('แตะเพื่อเปิดทั้งหมด', 'Tap to reveal all'))),
      h('div', { class: 'gc-grid' }));
    const grid = panel.querySelector('.gc-grid'), out = [];
    res.forEach((r, i) => {
      const c = h('div', { class: `gc-card r${r.rank}`, style: `--rc:${this.color(r.rar)};--i:${i}` },
        h('div', { class: 'gc-cin' },
          h('div', { class: 'gc-back' }, h('b', {}, 'ᚾ')),
          h('div', { class: 'gc-front' },
            r.volt || r.qty <= 1 ? null : h('span', { class: 'gc-q' }, `×${r.qty}`),
            this.img(r, 'gc-cic'),
            h('b', { class: 'gc-cn rar-' + r.rar }, this.rowName(r)),
            h('small', { class: 'gc-cr' }, RARITY[r.rar].label))));
      grid.append(c); out.push(c);
    });
    panel.addEventListener('pointerdown', e => { if (this.anim && !e.target.closest('button')) this.fastForward(); });
    main.append(panel);
    if (!simple) panel.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'ease-out' });
    return out;
  },
  flip(card, r, instant, main, multi) {
    card.classList.remove('gc-tease'); card.classList.add('on');
    const cin = card.querySelector('.gc-cin');
    if (instant) { cin.style.transform = 'rotateY(180deg)'; return; }
    cin.animate([{ transform: 'rotateY(0) scale(1)' }, { transform: 'rotateY(90deg) scale(1.08)', offset: 0.5 }, { transform: 'rotateY(180deg) scale(1)' }], { duration: 380, easing: 'cubic-bezier(.3,.6,.3,1)' });
    cin.style.transform = 'rotateY(180deg)';
    if (r.rank >= 3) { this.burst(main, card, r.rank, r.rank >= 4 ? 70 : 44); if (multi) this.flash(r.rank, false, 0.45); Sound.play(r.rank >= 4 ? 'mvp' : 'levelup'); }
    else Sound.play(r.rank >= 2 ? 'holy' : multi ? 'click' : 'pickup');
  },
  fastForward() {
    const A = this.anim; if (!A || A.ff) return;
    A.ff = true;
    if (A.spinAnim && A.spinAnim.playState === 'running') A.spinAnim.finish();
    if (A.wake) A.wake();
  },
  finish(A) {
    if (A.done) return;
    A.done = true; A.dead = true;
    if (this.anim === A) this.anim = null;
    const main = this.body() && this.body().querySelector('.gc-main');
    if (main) {
      main.classList.remove('gc-busy');
      for (const c of main.querySelectorAll('.gc-card:not(.on)')) { c.classList.add('on'); c.querySelector('.gc-cin').style.transform = 'rotateY(180deg)'; }
      const panel = main.querySelector('.gc-res');
      if (panel && !panel.querySelector('.gc-rfoot')) {
        panel.classList.add('gc-done');
        panel.append(h('div', { class: 'gc-rfoot' },
          h('button', { type: 'button', class: 'btn gc-ok', onclick: () => { panel.remove(); const st = main.querySelector('.gc-stage'); if (st) { st.classList.remove('gc-landed'); this.hint(st, 0); } } }, 'OK'),
          this.rollBtns('gc-again')));
      }
    }
    this.report(A.res, A.multi);
    this.refresh();
  },
  onClose() {
    const A = this.anim; if (!A) return;
    if (A.spinAnim) try { A.spinAnim.cancel(); } catch (e) { /* ไม่เป็นไร */ }
    if (A.wake) A.wake();
    this.finish(A);
    this.render(); // เปิดใหม่ครั้งหน้าเริ่มที่วงล้อ
  },
  // แจ้งผลในแชต (หลังเปิดการ์ดครบ — ไม่สปอยก่อน) • Epic ขึ้นไปประกาศ
  report(res, multi) {
    const p = G.player; if (!p) return;
    const list = res.map(r => this.rowFull(r));
    UI.msg(L(`วงล้อนอร์น ×${res.length}: ${list.join(', ')}`, `Norn's Wheel ×${res.length}: ${list.join(', ')}`), 'item');
    const big = res.filter(r => r.rank >= 3).sort((a, b) => b.rank - a.rank);
    for (const r of big) UI.msg(L(`★ ${p.name} ได้รับ ${this.rowFull(r)} (${RARITY[r.rar].label}) จากวงล้อนอร์น!`, `★ ${p.name} obtained ${this.rowFull(r)} (${RARITY[r.rar].label}) from Norn's Wheel!`), 'mvp');
    if (big.length) {
      const r = big[0];
      UI.announce(L(`★ ${p.name} ได้รับ ${this.rowFull(r)} จากวงล้อนอร์น! ★`, `★ ${p.name} obtained ${this.rowFull(r)} from Norn's Wheel! ★`));
      if (typeof Online !== 'undefined' && Online.online && typeof Online.sendChat === 'function' && typeof LOOT !== 'undefined' && performance.now() - LOOT.lastShout > 30000) {
        LOOT.lastShout = performance.now();
        try { Online.sendChat(L(`★ ได้รับ ${this.rowFull(r)} (${RARITY[r.rar].label}) จากวงล้อนอร์น!`, `★ Obtained ${this.rowFull(r)} (${RARITY[r.rar].label}) from Norn's Wheel!`)); } catch (e) { /* ไม่เป็นไร */ }
      }
    }
  },

  // ---------------- แฟลชเต็มจอ / ประกาย (canvas) ----------------
  flash(rank, simple, k = 1) {
    let el = document.getElementById('gc-flash');
    if (!el) { el = document.createElement('div'); el.id = 'gc-flash'; el.setAttribute('aria-hidden', 'true'); document.body.append(el); }
    el.style.setProperty('--fc', U.rgba(this.color(rank >= 4 ? 'legend' : 'epic'), 0.75));
    el.animate(simple ? [{ opacity: 0 }, { opacity: 0.35 * k }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: k, offset: 0.12 }, { opacity: 0 }],
      { duration: simple ? 500 : rank >= 4 ? 1100 : 750, easing: 'ease-out' });
  },
  burst(main, card, rank, n) {
    const cv = main.querySelector('.gc-fx'); if (!cv) return;
    const mr = main.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(mr.width * dpr) || cv.height !== Math.round(mr.height * dpr)) { cv.width = Math.round(mr.width * dpr); cv.height = Math.round(mr.height * dpr); this.parts = []; }
    let x, y;
    if (card) { const r = card.getBoundingClientRect(); x = r.left + r.width / 2 - mr.left; y = r.top + r.height / 2 - mr.top; }
    else { const w = main.querySelector('.gc-wheel'), r = w ? w.getBoundingClientRect() : mr; x = r.left + r.width / 2 - mr.left; y = r.top + r.height / 2 - mr.top; }
    const cols = rank >= 4 ? ['#ffb52e', '#fff1b0', '#ffd36a', '#ffffff'] : ['#c27bff', '#e6c8ff', '#8f6bff', '#ffffff'];
    const P = this.parts || (this.parts = []);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = (card ? 90 : 160) + Math.random() * (card ? 160 : 300);
      P.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (card ? 40 : 60), life: 0, max: 0.7 + Math.random() * 0.7, s: 1.2 + Math.random() * (rank >= 4 ? 2.6 : 2), c: cols[i % cols.length], streak: rank >= 4 && i % 3 === 0 });
    }
    P.push({ ring: true, x, y, life: 0, max: card ? 0.45 : 0.7, r0: card ? 10 : 30, r1: card ? 70 : 170, c: cols[0] });
    if (!this.fxRun) { this.fxRun = true; let last = performance.now(); const g = cv.getContext('2d');
      const step = now => {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.globalCompositeOperation = 'lighter';
        for (let i = P.length - 1; i >= 0; i--) {
          const q = P[i]; q.life += dt; const k = q.life / q.max;
          if (k >= 1) { P.splice(i, 1); continue; }
          if (q.ring) { g.strokeStyle = U.rgba(q.c, (1 - k) * 0.8); g.lineWidth = 3 * (1 - k) + 1; g.beginPath(); g.arc(q.x, q.y, q.r0 + (q.r1 - q.r0) * (1 - (1 - k) * (1 - k)), 0, 7); g.stroke(); continue; }
          q.vx *= 1 - 2.2 * dt; q.vy = q.vy * (1 - 2.2 * dt) + 120 * dt; q.x += q.vx * dt; q.y += q.vy * dt;
          g.fillStyle = U.rgba(q.c, 1 - k);
          if (q.streak) { g.strokeStyle = g.fillStyle; g.lineWidth = q.s; g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(q.x - q.vx * 0.05, q.y - q.vy * 0.05); g.stroke(); }
          else { g.beginPath(); g.arc(q.x, q.y, q.s * (1 - k * 0.5), 0, 7); g.fill(); }
        }
        if (P.length) requestAnimationFrame(step); else { g.clearRect(0, 0, cv.width, cv.height); this.fxRun = false; }
      };
      requestAnimationFrame(step);
    }
  },

  // หน้าจอเต็มแบบมีภาพ: ฉากหลังเต็มจอ • สามนอร์นหลังวงล้อ • วงล้อภาพจริงหมุน • การ์ดคว่ำใช้หลังการ์ดตามระดับ
  artCss() {
    return `
#w-gacha.gc-art{position:fixed!important;inset:0!important;left:0!important;top:0!important;transform:none!important;width:100vw!important;max-width:none!important;height:100dvh!important;max-height:none!important;
  border-radius:0!important;border:0!important;background:#05080d var(--gc-bg) center/cover no-repeat!important;box-shadow:none!important;display:flex;flex-direction:column;padding-top:env(safe-area-inset-top,0px)}
#w-gacha.gc-art.hidden{display:none!important}
#w-gacha.gc-art::before{content:"";position:absolute;inset:0;background:radial-gradient(60% 55% at 50% 50%,transparent 30%,rgba(3,6,12,.55) 100%),linear-gradient(180deg,rgba(3,6,12,.35),transparent 25%,transparent 70%,rgba(3,6,12,.75));pointer-events:none}
#w-gacha.gc-art .win-title .win-x{position:absolute;right:14px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;font-size:22px;background:rgba(6,10,18,.6);border:1px solid rgba(255,255,255,.2)}
#w-gacha.gc-art .win-title{position:relative;min-height:52px;z-index:2;background:transparent;border:0;justify-content:center;font-size:15px;letter-spacing:.06em;text-shadow:0 2px 8px rgba(0,0,0,.9)}
#w-gacha.gc-art .gc-body{position:relative;z-index:1;flex:1;height:auto!important;min-height:0!important;width:min(980px,100%);margin:0 auto;padding:0 14px calc(12px + env(safe-area-inset-bottom,0px))}
#w-gacha.gc-art .gc-tabs{width:min(420px,100%);margin:0 auto;background:rgba(6,10,18,.55);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
#w-gacha.gc-art .gc-main{flex:1;min-height:0}
#w-gacha.gc-art .gc-stage{--wr:min(44vh,62vw,400px);flex:1;height:auto;min-height:260px;background:none;box-shadow:none;overflow:visible}
#w-gacha.gc-art .gc-stage[data-rank]{box-shadow:none}
#w-gacha.gc-art .gc-rays{opacity:.55}
#w-gacha.gc-art .gc-threads{display:none}
.gc-nornart{position:absolute;left:50%;bottom:-2%;height:104%;max-width:none;transform:translateX(-50%);pointer-events:none;user-select:none;filter:drop-shadow(0 10px 30px rgba(0,0,0,.6));opacity:.92;transition:filter .3s}
#w-gacha.gc-art .gc-wheel{top:47%;filter:drop-shadow(0 0 22px var(--hint)) drop-shadow(0 10px 24px rgba(0,0,0,.65))}
#w-gacha.gc-art .gc-ring{background:none!important;border:0!important;box-shadow:none!important}
#w-gacha.gc-art .gc-ring img{width:100%;height:100%;display:block;pointer-events:none;user-select:none}
#w-gacha.gc-art .gc-rim,#w-gacha.gc-art .gc-visor{display:none}
#w-gacha.gc-art .gc-hub{width:30%;height:30%;background:radial-gradient(circle,color-mix(in srgb,var(--hint) 55%,transparent),transparent 68%)!important;border:0!important;box-shadow:none!important;mix-blend-mode:screen}
#w-gacha.gc-art .gc-pointer{top:-16px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.8))}
#w-gacha.gc-art .gc-skip{color:#fff;text-shadow:0 1px 4px #000}
#w-gacha.gc-art .gc-info,#w-gacha.gc-art .gc-btns,#w-gacha.gc-art .gc-hint{width:min(560px,100%);margin-left:auto;margin-right:auto}
#w-gacha.gc-art .gc-info{background:rgba(6,10,18,.6);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border-radius:14px;padding:6px 10px}
#w-gacha.gc-art .gc-hint{text-shadow:0 1px 4px #000;color:#d6e2ee}
#w-gacha.gc-art .gc-rates,#w-gacha.gc-art .gc-hist{width:min(640px,100%);margin:10px auto 0;background:rgba(6,10,18,.82);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-radius:16px;padding:12px;overflow-y:auto}
#w-gacha.gc-art .gc-res{inset:0;background:radial-gradient(70% 60% at 50% 45%,rgba(10,14,26,.55),rgba(3,6,12,.86));-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}
#w-gacha.gc-art .gc-grid{width:min(760px,100%);margin:0 auto}
#w-gacha.gc-art .gc-multi .gc-grid{grid-template-columns:repeat(5,minmax(0,118px));justify-content:center}
#w-gacha.gc-art .gc-one .gc-grid{grid-template-columns:minmax(0,190px)}
#w-gacha.gc-art .gc-card{aspect-ratio:1/1.75}
#w-gacha.gc-art .gc-back{background:var(--cb0) center/100% 100% no-repeat;border-radius:10px}
#w-gacha.gc-art .gc-card.r1 .gc-back{background-image:var(--cb1)}
#w-gacha.gc-art .gc-card.r2 .gc-back{background-image:var(--cb2)}
#w-gacha.gc-art .gc-card.r3 .gc-back{background-image:var(--cb3)}
#w-gacha.gc-art .gc-card.r4 .gc-back{background-image:var(--cb4)}
#w-gacha.gc-art .gc-back::before,#w-gacha.gc-art .gc-back b{display:none}
#w-gacha.gc-art .gc-front{border-radius:10px;background:linear-gradient(180deg,rgba(20,28,44,.96),rgba(8,12,22,.98))}
@media (max-width:760px){
  #w-gacha.gc-art .gc-stage{--wr:min(36vh,66vw,320px);min-height:220px}
  #w-gacha.gc-art .gc-multi .gc-grid{grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}
  .gc-nornart{height:auto;width:155%;bottom:auto;top:50%;transform:translate(-50%,-46%)}
}
@media (orientation:landscape) and (max-height:520px){
  #w-gacha.gc-art .gc-stage{--wr:min(52vh,280px);min-height:150px}
  #w-gacha.gc-art .gc-card{aspect-ratio:1/1.5}
}`;
  },
  injectCss() {
    const R0 = RARITY;
    const css = `
#w-gacha{width:min(560px,calc(100vw - 24px))}
#w-gacha .gc-body{padding:10px 12px 12px;display:flex;flex-direction:column;gap:10px;height:min(486px,calc(100dvh - 96px))}
.gc-pane{flex:1 1 auto;min-height:0;display:flex;flex-direction:column}
.gc-tabs{display:flex}
.gc-tabs .tab{flex:1}
.gc-main{position:relative;display:flex;flex-direction:column;gap:10px;min-height:400px}
.gc-stage{--hint:#e8eef6;--wr:184px;position:relative;height:250px;border-radius:16px;overflow:hidden;
  background:radial-gradient(70% 70% at 50% 58%,rgba(120,100,220,.2),transparent 70%),linear-gradient(180deg,rgba(14,20,34,.75),rgba(4,8,14,.85));
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.07),inset 0 -30px 50px -30px rgba(111,243,255,.18);transition:box-shadow .3s}
.gc-stage[data-rank="3"]{box-shadow:inset 0 0 0 1px ${R0.epic.color}88,inset 0 0 60px -10px ${R0.epic.color}66}
.gc-stage[data-rank="4"]{box-shadow:inset 0 0 0 1px ${R0.legend.color}99,inset 0 0 70px -6px ${R0.legend.color}77}
.gc-rays{position:absolute;left:50%;top:58%;width:560px;height:560px;margin:-280px 0 0 -280px;opacity:.16;pointer-events:none;
  background:repeating-conic-gradient(from 0deg,var(--hint) 0 4deg,transparent 4deg 15deg);
  -webkit-mask:radial-gradient(circle,#000 0,rgba(0,0,0,.6) 30%,transparent 62%);mask:radial-gradient(circle,#000 0,rgba(0,0,0,.6) 30%,transparent 62%);
  animation:gcRot 48s linear infinite;transition:opacity .35s}
.gc-spin .gc-rays,.gc-landed .gc-rays{opacity:.42}
.gc-norns{position:absolute;left:0;right:0;top:8px;display:flex;justify-content:space-between;padding:0 11%;font:600 9.5px/1 var(--mono,ui-monospace,monospace);letter-spacing:.22em;color:rgba(255,226,160,.62);pointer-events:none}
.gc-threads{position:absolute;left:0;right:0;top:20px;height:28px;pointer-events:none}
.gc-threads svg{width:100%;height:100%;display:block}
.gc-threads path{fill:none;stroke:rgba(255,211,106,.42);stroke-width:1;stroke-dasharray:3 4;animation:gcThread 3s linear infinite;vector-effect:non-scaling-stroke}
.gc-wheel{position:absolute;left:50%;top:58%;width:var(--wr);height:var(--wr);transform:translate(-50%,-50%)}
.gc-idle{position:absolute;inset:0;animation:gcRot 80s linear infinite}
.gc-ring{position:absolute;inset:0;border-radius:50%;will-change:transform;
  background:radial-gradient(circle,transparent 0 30%,rgba(6,10,18,.55) 30% 31.5%,transparent 31.5%),
  repeating-conic-gradient(from -1deg,rgba(6,10,18,.9) 0 2deg,transparent 2deg 30deg),
  conic-gradient(${['common', 'uncommon', 'rare', 'common', 'uncommon', 'epic', 'common', 'uncommon', 'rare', 'common', 'uncommon', 'legend'].map((k, i) => `${R0[k].color}${k === 'common' ? '30' : '66'} ${i * 30}deg ${(i + 1) * 30}deg`).join(',')});
  box-shadow:0 0 0 2px rgba(6,10,18,.9),0 0 30px -4px var(--hint)}
.gc-ring i{position:absolute;left:50%;top:50%;width:24px;height:24px;margin:-12px 0 0 -12px;font:700 17px/24px 'Segoe UI Symbol','Noto Sans Runic',serif;font-style:normal;text-align:center;color:#fff6dc;text-shadow:0 0 4px rgba(0,0,0,.9),0 0 10px rgba(255,220,150,.7)}
.gc-rim{position:absolute;inset:-7px;border-radius:50%;pointer-events:none;border:3px solid #e8bf5a;
  box-shadow:0 0 0 1px rgba(60,36,0,.6),inset 0 0 0 1px rgba(60,36,0,.5),0 0 22px -2px var(--hint),0 0 60px -14px var(--hint);transition:box-shadow .25s}
.gc-rim::after{content:"";position:absolute;inset:-9px;border-radius:50%;background:repeating-conic-gradient(rgba(255,226,160,.55) 0 1.2deg,transparent 1.2deg 15deg);
  -webkit-mask:radial-gradient(circle,transparent 0 calc(50% - 6px),#000 calc(50% - 5px));mask:radial-gradient(circle,transparent 0 calc(50% - 6px),#000 calc(50% - 5px))}
.gc-hub{position:absolute;left:50%;top:50%;width:31%;height:31%;transform:translate(-50%,-50%);border-radius:50%;
  background:radial-gradient(circle at 50% 30%,#2a3550,#0b1020 70%);border:2px solid rgba(111,243,255,.55);box-shadow:0 0 0 4px rgba(6,10,18,.85),0 0 24px -4px var(--hint);display:grid;place-items:center}
.gc-visor{display:block;width:66%;height:16%;border-radius:999px;background:var(--hint);box-shadow:0 0 10px var(--hint),0 0 26px var(--hint);transition:background .2s,box-shadow .2s;animation:gcBlink 4s ease-in-out infinite}
.gc-pointer{position:absolute;left:50%;top:-21px;width:22px;height:26px;margin-left:-11px;background:linear-gradient(180deg,#fff2c0,#e8bf5a 60%,#a07018);
  clip-path:polygon(0 0,100% 0,50% 100%);filter:drop-shadow(0 2px 3px rgba(0,0,0,.6))}
.gc-skip{position:absolute;right:10px;bottom:8px;font-size:11px;color:var(--ink-faint,#8a98aa);opacity:0;transition:opacity .3s;pointer-events:none}
.gc-busy .gc-skip{opacity:.85}
.gc-info{display:flex;gap:10px;align-items:stretch}
.gc-tk{display:flex;align-items:center;gap:8px;padding:6px 14px 6px 8px;border-radius:14px;background:rgba(255,211,106,.08);box-shadow:inset 0 0 0 1px rgba(255,211,106,.28)}
.gc-tk img{width:32px;height:32px;image-rendering:auto;filter:drop-shadow(0 0 6px rgba(255,211,106,.5))}
.gc-tk small{display:block;font-size:10.5px;color:#d9c69a;letter-spacing:.04em;white-space:nowrap}
.gc-tk b{display:block;font:600 18px/1.1 var(--mono,ui-monospace,monospace);color:#ffe6a6}
.gc-pity-w{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:6px;padding:6px 12px;border-radius:14px;background:rgba(255,255,255,.035);box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)}
.gc-pity-t{display:flex;justify-content:space-between;gap:8px;font-size:11.5px;color:var(--ink-dim,#c6d0dc)}
.gc-pity-t b{font:600 12px var(--mono,ui-monospace,monospace);color:#e6c8ff}
.gc-pity{height:6px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}
.gc-pity i{display:block;height:100%;transform-origin:0 50%;background:linear-gradient(90deg,#8f6bff,var(--pc));box-shadow:0 0 10px var(--pc);transition:transform .5s}
.gc-btns{display:grid;grid-template-columns:1fr 1fr;gap:10px}
#w-gacha .gc-roll{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:50px;padding:6px 8px 6px 18px;border-radius:999px;text-align:left}
#w-gacha .gc-roll .gc-bl{display:flex;flex-direction:column;font:600 14.5px/1.15 var(--display,system-ui)}
#w-gacha .gc-roll .gc-bl small{font:500 10.5px/1.2 var(--font,system-ui);color:#e6c8ff;opacity:.9}
#w-gacha .gc-ten{background:linear-gradient(180deg,rgba(194,123,255,.28),rgba(111,80,220,.18));border-color:rgba(194,123,255,.55)}
#w-gacha .gc-ten:hover:not(:disabled){background:linear-gradient(180deg,rgba(194,123,255,.4),rgba(111,80,220,.26));border-color:#c27bff;box-shadow:0 0 24px -6px #c27bff}
#w-gacha .gc-roll:disabled{opacity:.42;cursor:not-allowed;filter:saturate(.4)}
.gc-cost{display:inline-flex;align-items:center;gap:4px;padding:4px 10px 4px 5px;border-radius:999px;background:rgba(0,0,0,.35);font:600 13px var(--mono,ui-monospace,monospace);color:#ffe6a6}
.gc-cost img{width:20px;height:20px}
.gc-hint{font-size:11.5px;color:var(--ink-faint,#8a98aa);text-align:center}
.gc-fx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:6}
.gc-res{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;gap:10px;padding:12px;border-radius:16px;
  background:radial-gradient(90% 60% at 50% 40%,rgba(40,30,80,.55),rgba(4,8,14,.94) 75%),rgba(4,8,14,.9);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.gc-rhead{display:flex;justify-content:space-between;align-items:baseline;font:600 13px var(--display,system-ui);color:#fff;letter-spacing:.04em}
.gc-rhead small{font:500 11px var(--font,system-ui);color:var(--ink-faint,#8a98aa)}
.gc-done .gc-tap{visibility:hidden}
.gc-grid{flex:1;display:grid;gap:8px;align-content:center;perspective:900px}
.gc-multi .gc-grid{grid-template-columns:repeat(5,1fr)}
.gc-one .gc-grid{grid-template-columns:minmax(0,170px);justify-content:center}
.gc-card{position:relative;aspect-ratio:3/4;animation:gcDeal .32s cubic-bezier(.2,.7,.3,1.2) backwards;animation-delay:calc(var(--i) * 45ms)}
.gc-cin{position:absolute;inset:0;transform-style:preserve-3d;will-change:transform}
.gc-back,.gc-front{position:absolute;inset:0;border-radius:12px;-webkit-backface-visibility:hidden;backface-visibility:hidden;overflow:hidden}
.gc-back{display:grid;place-items:center;background:radial-gradient(circle at 50% 45%,rgba(255,255,255,.08),transparent 60%),linear-gradient(160deg,#1a2238,#0b1020);
  box-shadow:inset 0 0 0 1.5px rgba(255,226,160,.45),0 0 14px -4px var(--rc)}
.gc-back::before{content:"";position:absolute;inset:5px;border-radius:8px;border:1px solid rgba(255,226,160,.18)}
.gc-back b{font:600 30px/1 serif;color:rgba(255,226,160,.75);text-shadow:0 0 10px var(--rc)}
.gc-card.r2 .gc-back{box-shadow:inset 0 0 0 1.5px var(--rc),0 0 18px -2px var(--rc)}
.gc-card.r3 .gc-back,.gc-card.r4 .gc-back{box-shadow:inset 0 0 0 2px var(--rc),0 0 26px 0 var(--rc);animation:gcPulse 1s ease-in-out infinite}
.gc-tease .gc-cin{animation:gcShake .12s linear infinite}
.gc-tease .gc-back{filter:brightness(1.5)}
.gc-front{transform:rotateY(180deg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:8px 5px 6px;text-align:center;
  background:radial-gradient(circle at 50% 36%,color-mix(in srgb,var(--rc) 30%,transparent),transparent 62%),linear-gradient(170deg,#1b2336,#0c111c);
  box-shadow:inset 0 0 0 1.5px var(--rc),inset 0 3px 0 -1px var(--rc)}
.gc-card.r0 .gc-front{box-shadow:inset 0 0 0 1px rgba(255,255,255,.22)}
.gc-card.r3.on .gc-front,.gc-card.r4.on .gc-front{box-shadow:inset 0 0 0 2px var(--rc),0 0 22px -2px var(--rc)}
.gc-card.r3.on .gc-front::after,.gc-card.r4.on .gc-front::after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.4) 48%,transparent 62%);
  background-size:260% 100%;animation:gcSheen 2.4s ease-in-out infinite;pointer-events:none}
.gc-cic{width:46%;max-width:56px;aspect-ratio:1;object-fit:contain;filter:drop-shadow(0 2px 4px rgba(0,0,0,.6))}
.gc-cn{font:600 11px/1.2 var(--font,system-ui);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:#fff;word-break:break-word}
.gc-cr{font-size:9.5px;letter-spacing:.06em;color:var(--rc);text-transform:uppercase}
.gc-q{position:absolute;right:5px;top:5px;font:600 10.5px var(--mono,ui-monospace,monospace);color:#fff;background:rgba(0,0,0,.5);padding:1px 6px;border-radius:999px}
.gc-one .gc-cic{width:52%;max-width:72px}
.gc-one .gc-cn{font-size:14px}
.gc-one .gc-cr{font-size:11px}
.gc-rfoot{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center;animation:gcUp .3s ease-out}
.gc-rfoot .gc-btns{grid-template-columns:1fr 1fr}
#w-gacha .gc-rfoot .gc-roll{min-height:42px;padding-left:14px}
#w-gacha .gc-rfoot .gc-roll .gc-bl{font-size:13px}
#w-gacha .gc-ok{min-height:42px;padding:0 20px}
.gc-rates,.gc-hist{display:flex;flex-direction:column;gap:10px}
.gc-rsum{display:flex;flex-wrap:wrap;gap:6px}
.gc-rsum span{font-size:11.5px;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,.05);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);color:var(--ink-dim,#c6d0dc)}
.gc-rsum .gc-rpity{color:#e6c8ff;box-shadow:inset 0 0 0 1px rgba(194,123,255,.4);background:rgba(194,123,255,.1)}
.gc-tier{display:flex;height:8px;border-radius:999px;overflow:hidden;gap:2px}
.gc-tier i{min-width:4px}
.gc-tleg{display:flex;flex-wrap:wrap;gap:4px 12px;font:500 11px var(--mono,ui-monospace,monospace);color:var(--ink-dim,#c6d0dc)}
.gc-tleg span::before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--c);margin-right:5px;vertical-align:0}
.gc-rlist{flex:1 1 auto;min-height:120px;display:flex;flex-direction:column;gap:4px;overflow-y:auto;padding-right:2px;scrollbar-width:thin}
.gc-rrow{display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:10px;padding:5px 12px 5px 6px;border-radius:12px;background:rgba(255,255,255,.035);box-shadow:inset 3px 0 0 -1px var(--c)}
.gc-ric{width:30px;height:30px;object-fit:contain;justify-self:center}
.gc-rn{min-width:0;display:flex;flex-direction:column}
.gc-rn b{font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gc-rn small{font-size:10px;color:var(--c);letter-spacing:.06em;text-transform:uppercase}
.gc-rp{font:600 13px var(--mono,ui-monospace,monospace);font-style:normal;color:#fff}
.gc-ago{font-size:11px;font-style:normal;color:var(--ink-faint,#8a98aa);white-space:nowrap}
.gc-note{margin:0;font-size:11px;line-height:1.5;color:var(--ink-faint,#8a98aa)}
.gc-empty{padding:30px 10px;text-align:center;color:var(--ink-faint,#8a98aa);font-size:12.5px}
#gc-flash{position:fixed;inset:0;z-index:5000;pointer-events:none;opacity:0;mix-blend-mode:screen;background:radial-gradient(circle at 50% 45%,rgba(255,255,255,.95),var(--fc,rgba(194,123,255,.75)) 32%,transparent 78%)}
.gc-mbtok{box-shadow:inset 0 0 0 1px rgba(255,211,106,.35)}
.gc-simple .gc-card{animation:gcFade .25s ease-out backwards;animation-delay:calc(var(--i) * 30ms)}
.gc-simple .gc-card .gc-back,.gc-simple .gc-tease .gc-cin{animation:none}
@keyframes gcRot{to{transform:rotate(360deg)}}
@keyframes gcThread{to{stroke-dashoffset:-14}}
@keyframes gcBlink{0%,92%,100%{opacity:1}95%{opacity:.35}}
@keyframes gcDeal{from{opacity:0;transform:translateY(18px) scale(.86)}}
@keyframes gcFade{from{opacity:0}}
@keyframes gcUp{from{opacity:0;transform:translateY(8px)}}
@keyframes gcPulse{50%{filter:brightness(1.35)}}
@keyframes gcShake{0%,100%{transform:translate(0,0) rotate(0)}25%{transform:translate(-1.5px,0) rotate(-1.2deg)}75%{transform:translate(1.5px,0) rotate(1.2deg)}}
@keyframes gcSheen{0%{background-position:120% 0}60%,100%{background-position:-60% 0}}
@media (max-width:760px){
  #w-gacha .gc-body{padding:8px 10px 10px;gap:8px;height:auto;min-height:min(452px,calc(100dvh - 80px))}
  .gc-main{min-height:360px}
  .gc-stage{--wr:160px;height:220px}
  .gc-norns{padding:0 6%;font-size:8.5px;letter-spacing:.16em}
  .gc-ring i{font-size:15px}
  .gc-multi .gc-grid{gap:6px}
  .gc-cn{font-size:9.5px}
  .gc-multi .gc-cr{display:none}
  .gc-multi .gc-front{gap:3px;padding:6px 3px 5px}
  .gc-q{font-size:9px;right:3px;top:3px;padding:0 4px}
  .gc-tk{padding:6px 10px 6px 6px}
  .gc-tk small{font-size:9.5px}
  #w-gacha .gc-roll{padding-left:14px;min-height:48px}
  #w-gacha .gc-roll .gc-bl{font-size:13.5px}
  .gc-rfoot{grid-template-columns:1fr}
  .gc-rfoot .gc-ok{order:2}
}
@media (prefers-reduced-motion:reduce){
  .gc-rays,.gc-idle,.gc-threads path,.gc-visor,.gc-card,.gc-card .gc-back,.gc-tease .gc-cin,.gc-card.on .gc-front::after{animation:none!important}
}`;
    const el = document.createElement('style'); el.id = 'gacha-css'; el.textContent = css + this.artCss();
    (document.head || document.documentElement).append(el);
  },
});
Gacha.init();
