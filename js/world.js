'use strict';
// ============================================================
//  โลกที่เชื่อมกันทางกายภาพ
//  ตำแหน่งจริงของแต่ละแมพบนผืนโลก (หน่วย: ช่อง) คำนวณจาก links + ขนาดแมพ (แต่ละแมพขนาดไม่เท่ากันได้)
//  วางให้ประตูสองฝั่งชนกันพอดี → ออกขอบตะวันออกของแมพหนึ่ง = โผล่ขอบตะวันตกของแมพถัดไป ณ จุดเดียวกันบนโลก
//  ใช้กับ: แผนที่โลก (ui.js renderWorld) และโซนรอยต่อขอบแมพ (maps.js seamTransitions)
// ============================================================
const WORLD = {
  _pos: null,
  layout() {
    if (this._pos) return this._pos;
    const pos = { [HOME_MAP]: { x: 0, y: 0 } }, q = [HOME_MAP];
    while (q.length) {
      const a = q.shift(), A = MAP_DEFS[a];
      for (const [s, b] of Object.entries(A.links || {})) {
        const B = MAP_DEFS[b];
        if (pos[b] || !B || !PORTAL_SIDE[s]) continue;
        const pa = portalPos(A, s), pb = portalPos(B, OPP_SIDE[s]), o = pos[a];
        pos[b] = {
          x: s === 'E' ? o.x + A.w : s === 'W' ? o.x - B.w : o.x + pa.x - pb.x,
          y: s === 'S' ? o.y + A.h : s === 'N' ? o.y - B.h : o.y + pa.y - pb.y,
        };
        q.push(b);
      }
    }
    return (this._pos = pos);
  },
  // กรอบรวมของโลก (ใช้วาดแผนที่โลกตามสัดส่วนจริง)
  bounds() {
    const P = this.layout();
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [id, p] of Object.entries(P)) { const d = MAP_DEFS[id]; x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x + d.w); y1 = Math.max(y1, p.y + d.h); }
    return { x0, y0, w: x1 - x0, h: y1 - y0 };
  },
  // ตรวจว่าไม่มีแมพซ้อนทับกันบนผืนโลก (ทางกายภาพต้องเป็นไปได้) — ใช้ในเทสต์
  overlaps() {
    const P = this.layout(), ids = Object.keys(P), out = [];
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const a = P[ids[i]], b = P[ids[j]], A = MAP_DEFS[ids[i]], B = MAP_DEFS[ids[j]];
      if (a.x < b.x + B.w && b.x < a.x + A.w && a.y < b.y + B.h && b.y < a.y + A.h) out.push(ids[i] + '/' + ids[j]);
    }
    return out;
  },
  // ด้านที่ประตูอยู่ (จากตำแหน่งประตูในแมพ)
  sideOf(m, p) { return p.x <= 1 ? 'W' : p.x >= m.w - 2 ? 'E' : p.y <= 1 ? 'N' : 'S'; },
};
// กันพลาด: แมพที่ไม่มี kind/seed (เช่นคอมเมนต์ // กลางบรรทัดกินค่าไป) จะสร้างผิดแบบเงียบ ๆ → เตือนตั้งแต่โหลด
for (const [id, d] of Object.entries(MAP_DEFS)) if (!d.kind || d.seed == null || !d.w || !d.h) console.warn(`MAP_DEFS.${id}: ขาด kind/seed/w/h`);

// ============================================================
//  แผนที่โลกภาพวาด (W): วาดทุกภูมิภาคจากผังช่องจริง (GameMap แบบ lite) วางตามพิกัดโลก
//  ทุ่งหญ้า/ต้นไม้มีแสงเงา/น้ำ/ทางดิน/ลานหินอ่อน/ถ้ำ • พื้นหลังกระดาษเก่า เส้นพิกัด เข็มทิศ ป้าย MIDGARD
//  แคชครั้งเดียว (ผังแมพคงที่) • ป้าย/ประตู/ตัวเรา วาดทับทุกเฟรมใน ui.js drawWorldMap
// ============================================================
WORLD.P = 4; WORLD.PAD = 16;
WORLD.rgb = h => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
WORLD.art = function () {
  if (this._art && !(this._art.missing && Date.now() - this._art.at > 3000)) return this._art; // ภาพอาคารยังโหลดไม่เสร็จ → วาดใหม่ภายหลัง
  // สองชั้น: บนดิน (ซ้าย) • ใต้ดิน = ถ้ำ (ขวา) — ตำแหน่งภายในแต่ละชั้นตามพิกัดโลกจริง
  const P = this.P, pad = this.PAD, LY = this.layout(), gap = 30;
  const box = ids => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const id of ids) { const p = LY[id], d = MAP_DEFS[id]; x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x + d.w); y1 = Math.max(y1, p.y + d.h); } return { x0, y0, w: x1 - x0, h: y1 - y0 }; };
  const upIds = Object.keys(LY).filter(id => MAP_DEFS[id].kind !== 'cave'), dnIds = Object.keys(LY).filter(id => MAP_DEFS[id].kind === 'cave');
  const BU = box(upIds), BD = dnIds.length ? box(dnIds) : { x0: 0, y0: 0, w: 0, h: 0 };
  const Hh = Math.max(BU.h, BD.h);
  const off = {}; // id → ตำแหน่งมุมซ้ายบนบนผืนภาพ (หน่วยช่อง)
  for (const id of upIds) off[id] = { x: LY[id].x - BU.x0 + pad, y: LY[id].y - BU.y0 + pad + (Hh - BU.h) / 2 };
  for (const id of dnIds) off[id] = { x: LY[id].x - BD.x0 + pad + BU.w + gap, y: LY[id].y - BD.y0 + pad + (Hh - BD.h) / 2 };
  const B = { w: BU.w + (dnIds.length ? gap + BD.w : 0), h: Hh };
  const W = (B.w + pad * 2) * P, H = (B.h + pad * 2) * P;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  // พื้นหลัง: กระดาษเก่าโทนเข้ม + จุดหมึก + เส้นพิกัดจาง
  const bg = g.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, Math.hypot(W, H) / 2);
  bg.addColorStop(0, '#3b3222'); bg.addColorStop(0.7, '#251f15'); bg.addColorStop(1, '#120e08');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const rr = U.seeded(4242);
  for (let i = 0; i < W * H / 260; i++) { g.fillStyle = `rgba(${rr() < 0.5 ? '255,230,180' : '0,0,0'},${0.03 + rr() * 0.05})`; g.fillRect(rr() * W, rr() * H, 1 + rr() * 2, 1 + rr() * 2); }
  g.strokeStyle = 'rgba(215,178,90,0.09)'; g.lineWidth = 1; g.setLineDash([4, 6]);
  for (let x = 0; x < W; x += 24 * P) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 0; y < H; y += 24 * P) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.setLineDash([]);
  const regions = {}; let missing = false;
  // แผงใต้ดิน: พื้นหลังหินมืด + ป้าย
  if (dnIds.length) {
    const ux = (pad + BU.w + gap / 2) * P, uw = (BD.w + gap) * P;
    const ug = g.createLinearGradient(ux, 0, ux + uw, 0); ug.addColorStop(0, 'rgba(10,6,16,0)'); ug.addColorStop(0.12, 'rgba(14,8,22,0.55)'); ug.addColorStop(1, 'rgba(14,8,22,0.7)');
    g.fillStyle = ug; g.fillRect(ux, 0, uw + pad * P, H);
    g.font = '800 30px Kanit, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillStyle = 'rgba(205,180,255,0.85)';
    g.fillText(L('ใต้ดิน', 'UNDERGROUND'), (pad + BU.w + gap) * P, 16);
  }
  for (const id of Object.keys(off)) {
    const pos = off[id], m = new GameMap(id, { lite: true }), d = m.def, ox = pos.x * P, oy = pos.y * P;
    regions[id] = { x: ox, y: oy, w: m.w * P, h: m.h * P, portals: m.portals };
    const cave = d.kind === 'cave', th = d.caveTheme || {};
    const G0 = this.rgb(d.grass || '#6fae4a');
    const COL = {
      [T.GRASS]: G0, [T.FLOWER]: G0.map(v => Math.min(255, v * 1.08 + 8)), [T.TREE]: G0.map(v => v * 0.8),
      [T.DIRT]: [185, 141, 90], [T.STONE]: [228, 232, 238], [T.HOUSE]: [214, 218, 226], [T.WALL]: [34, 34, 34],
      [T.CAVE]: this.rgb(th.roots ? '#8a5a46' : th.glyph ? '#5b6a90' : '#6a5a72'), [T.ROCK]: cave ? [26, 20, 30] : [141, 132, 120],
      [T.WATER]: [52, 128, 190], [T.FOUNTAIN]: [90, 190, 230],
    };
    const sc = document.createElement('canvas'); sc.width = m.w; sc.height = m.h;
    const sg = sc.getContext('2d'), id_ = sg.createImageData(m.w, m.h);
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const t = m.tile(x, y), k = 0.92 + U.fbm(x / 9, y / 9, d.seed, 2) * 0.16;
      let col = COL[t] || G0;
      if (t === T.WATER) { let shore = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (m.tile(x + dx, y + dy) !== T.WATER) shore = 1; if (shore) col = [96, 176, 214]; }
      const o = (y * m.w + x) * 4;
      id_.data[o] = col[0] * k; id_.data[o + 1] = col[1] * k; id_.data[o + 2] = col[2] * k; id_.data[o + 3] = 255;
    }
    sg.putImageData(id_, 0, 0);
    // เงาภูมิภาค + ภาพพื้น (ขยายแบบนุ่ม)
    g.save(); g.shadowColor = 'rgba(0,0,0,0.75)'; g.shadowBlur = 22; g.fillStyle = '#000'; g.fillRect(ox, oy, m.w * P, m.h * P); g.restore();
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(sc, ox, oy, m.w * P, m.h * P);
    // ต้นไม้: พุ่มกลมมีแสงเงา (สน = แหลม)
    const pine = !!d.pine;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (m.tile(x, y) !== T.TREE) continue;
      const cx = ox + (x + 0.5) * P + (U.hash2(x, y, 3) - 0.5) * P * 0.5, cy = oy + (y + 0.5) * P + (U.hash2(y, x, 5) - 0.5) * P * 0.5, r = P * (0.85 + U.hash2(x, y, 9) * 0.35);
      g.fillStyle = 'rgba(10,20,8,0.35)'; g.beginPath(); g.arc(cx + r * 0.35, cy + r * 0.4, r, 0, 7); g.fill();
      const gr = g.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.1, cx, cy, r * 1.1);
      gr.addColorStop(0, pine ? '#6aa66a' : '#9ad672'); gr.addColorStop(1, pine ? '#1e4a2a' : '#2f6e2c');
      g.fillStyle = gr; g.beginPath();
      if (pine) { g.moveTo(cx, cy - r * 1.2); g.lineTo(cx + r * 0.9, cy + r * 0.8); g.lineTo(cx - r * 0.9, cy + r * 0.8); g.closePath(); } else g.arc(cx, cy, r, 0, 7);
      g.fill();
    }
    // อาคาร (เมือง) จากภาพจริง + น้ำพุ
    for (const b of m.buildings) {
      const img = Art.get(BUILDING_ART[b.label] || (b.kind === 'castle' ? 'prop_bld_tower' : '')); if (!img) { missing = true; continue; }
      const bw = b.w * P * 1.15, bh = bw * img.height / img.width;
      g.drawImage(img, ox + (b.x + b.w / 2) * P - bw / 2, oy + (b.y + b.h) * P - bh, bw, bh);
    }
    // โทนเฉพาะภูมิภาค: ป่ากลางคืน = น้ำเงินจันทร์ • ถ้ำ = มืดขอบ
    if (typeof d.dark === 'string') { g.fillStyle = 'rgba(14,24,64,0.32)'; g.fillRect(ox, oy, m.w * P, m.h * P); }
    if (cave) {
      const vg = g.createRadialGradient(ox + m.w * P / 2, oy + m.h * P / 2, 10, ox + m.w * P / 2, oy + m.h * P / 2, Math.hypot(m.w, m.h) * P / 2);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)'); g.fillStyle = vg; g.fillRect(ox, oy, m.w * P, m.h * P);
    }
    // ขอบภูมิภาค: เส้นทองบาง
    g.strokeStyle = cave ? 'rgba(170,140,220,0.55)' : 'rgba(215,178,90,0.75)'; g.lineWidth = 1.5; g.strokeRect(ox + 0.75, oy + 0.75, m.w * P - 1.5, m.h * P - 1.5);
  }
  // เส้นทางลงใต้ดิน: จากประตูบนดิน → ประตูถ้ำ (เส้นประโค้ง)
  for (const id of upIds) for (const pt of regions[id].portals) {
    const to = pt.to; if (!regions[to] || MAP_DEFS[to].kind !== 'cave') continue;
    const back = regions[to].portals.find(q => q.to === id); if (!back) continue;
    const x0 = regions[id].x + (pt.x + 0.5) * P, y0 = regions[id].y + (pt.y + 0.5) * P, x1 = regions[to].x + (back.x + 0.5) * P, y1 = regions[to].y + (back.y + 0.5) * P;
    // เดินเส้นอ้อมใต้แผงบนดิน แล้วขึ้นตามช่องว่างระหว่างแผง → เข้าประตูถ้ำ (ไม่ตัดผ่านภูมิภาคอื่น)
    const xg = (pad + BU.w + gap / 2) * P, yb = Math.min(H - 10, y0 + 26), yt = Math.max(10, y1 - 26);
    g.strokeStyle = 'rgba(190,160,255,0.85)'; g.lineWidth = 3.5; g.setLineDash([10, 8]); g.lineJoin = 'round';
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0, yb); g.arcTo(xg, yb, xg, yt, 18); g.arcTo(xg, yt, x1, yt, 18); g.arcTo(x1, yt, x1, y1, 12); g.lineTo(x1, y1); g.stroke(); g.setLineDash([]);
    g.save(); g.translate(xg - 10, (yb + yt) / 2); g.rotate(-Math.PI / 2);
    g.font = '700 22px Kanit, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillStyle = 'rgba(215,195,255,0.95)'; g.fillText(L('⬇ ทางลงใต้ดิน', '⬇ way down'), 0, 0); g.restore();
  }
  // ป้าย MIDGARD + เข็มทิศ
  g.font = '800 46px Kanit, serif'; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillStyle = 'rgba(255,228,160,0.9)';
  g.fillText('MIDGARD', 22, 14); g.font = '600 20px Kanit, sans-serif'; g.fillStyle = 'rgba(215,190,140,0.8)'; g.fillText(L('แผนที่โลก • ตามขนาดจริง', 'World map • true scale'), 25, 66);
  const cx = W - 80, cy = H - 80, R0 = 54;
  g.save(); g.translate(cx, cy); g.strokeStyle = 'rgba(215,178,90,0.8)'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, R0 + 6, 0, 7); g.stroke();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, L0 = i % 2 ? R0 * 0.55 : R0; g.fillStyle = i === 0 ? '#ff7a5a' : i % 2 ? '#a89060' : '#f0dca8'; g.beginPath(); g.moveTo(Math.cos(a) * L0, Math.sin(a) * L0); g.lineTo(Math.cos(a + 0.4) * 10, Math.sin(a + 0.4) * 10); g.lineTo(0, 0); g.lineTo(Math.cos(a - 0.4) * 10, Math.sin(a - 0.4) * 10); g.closePath(); g.fill(); }
  g.font = '800 20px Kanit, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillStyle = '#ffe9b0'; g.fillText('N', 0, -R0 - 8);
  g.restore();
  return (this._art = { c, P, pad, B, regions, missing, at: Date.now() });
};
