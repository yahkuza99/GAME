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
//  แผนที่โลกภาพวาด (W) — ผืนแผ่นดินเดียวต่อเนื่อง
//  ภูมิภาคจริงวาดจากผังช่อง (GameMap lite) ณ พิกัดโลก • ช่องว่างระหว่างภูมิภาคเติมด้วยป่า/เนิน/ภูเขา/ทะเลสาบป่าเถื่อน
//  แนวชายฝั่งโค้งตามธรรมชาติ ทะเลมีเส้นคลื่นรอบฝั่ง • โทนสีน้ำบนกระดาษ • กรอบทองลาย • ป้าย MIDGARD + เข็มทิศ
//  ถ้ำ (ใต้ดิน) = ไอคอนปากถ้ำที่ทางลงจริง ไม่แยกแผง
// ============================================================
WORLD.P = 4;
WORLD.rgb = h => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
WORLD.art = function () {
  if (this._art && !(this._art.missing && Date.now() - this._art.at > 2500)) return this._art;
  const P = this.P, LY = this.layout(), M = 36;
  const up = Object.keys(LY).filter(id => MAP_DEFS[id].kind !== 'cave'), caves = Object.keys(LY).filter(id => MAP_DEFS[id].kind === 'cave');
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const id of up) { const p = LY[id], d = MAP_DEFS[id]; x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x + d.w); y1 = Math.max(y1, p.y + d.h); }
  const TW = x1 - x0 + M * 2, TH = y1 - y0 + M * 2, W = TW * P, H = TH * P;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  let missing = !(document.fonts && document.fonts.check('800 40px Cinzel'));
  // ---------- ผังโลก: ช่องของภูมิภาค + ระยะห่างจากภูมิภาค ----------
  const N = TW * TH, terr = new Int16Array(N).fill(-1), reg = new Int8Array(N).fill(-1), dist = new Uint16Array(N).fill(999);
  const maps = up.map(id => new GameMap(id, { lite: true })), regions = {};
  const q = [];
  maps.forEach((m, ri) => {
    const ox = LY[m.id].x - x0 + M, oy = LY[m.id].y - y0 + M;
    regions[m.id] = { x: ox * P, y: oy * P, w: m.w * P, h: m.h * P, portals: m.portals, ri };
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const border = x < 4 || y < 4 || x >= m.w - 4 || y >= m.h - 4, t = m.tile(x, y);
      const i = (oy + y) * TW + ox + x;
      reg[i] = ri; dist[i] = 0; q.push(i);
      terr[i] = border && t === T.TREE ? -3 : m.def.kind === 'field' && t === T.ROCK ? -4 : t; // สันหินในทุ่ง = เทือกเขา // ต้นไม้ขอบแมพ = ให้ภูมิประเทศรอบนอกเป็นคนวาด (ไม่เห็นเป็นแนวเหลี่ยม)
    }
  });
  for (let k = 0; k < q.length; k++) { // BFS: ระยะ + ภูมิภาคที่ใกล้ที่สุด (ใช้ไล่สีหญ้าให้ต่อเนื่อง)
    const i = q[k], x = i % TW, y = (i / TW) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= TW || ny >= TH) continue;
      const j = ny * TW + nx; if (dist[j] <= dist[i] + 1) continue;
      dist[j] = dist[i] + 1; reg[j] = reg[i]; q.push(j);
    }
  }
  const nz = (x, y, s, o) => U.fbm(x / s, y / s, 9001 + o, 3);
  const land = new Uint8Array(N);
  for (let i = 0; i < N; i++) { const x = i % TW, y = (i / TW) | 0; land[i] = dist[i] < 14 + nz(x, y, 22, 1) * 26 ? 1 : 0; }
  const od = new Uint16Array(N).fill(999), q2 = [];
  for (let i = 0; i < N; i++) if (land[i]) { od[i] = 0; q2.push(i); }
  for (let k = 0; k < q2.length; k++) { const i = q2[k], x = i % TW, y = (i / TW) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= TW || ny >= TH) continue; const j = ny * TW + nx; if (od[j] <= od[i] + 1) continue; od[j] = od[i] + 1; q2.push(j); } }
  // ---------- ภูมิประเทศรอบนอก (ป่า/เนิน/ภูเขา/ทะเลสาบ) ----------
  const WILD = new Uint8Array(N); // 0 ทุ่ง 1 ป่า 2 ภูเขา 3 ทะเลสาบ
  for (let i = 0; i < N; i++) {
    if (!land[i] || terr[i] >= 0) continue;
    if (terr[i] === -4) { WILD[i] = 2; continue; }
    if (terr[i] === -3) { const d = maps[reg[i]].def; WILD[i] = d.trees >= 1.5 ? 1 : 0; continue; } // ขอบภูมิภาค: ตามลักษณะของภูมิภาคเอง (ป่าทึบ = ป่า, ทุ่ง = หญ้า) → ไม่เกิดแนวเส้น
    const x = i % TW, y = (i / TW) | 0, f = nz(x, y, 11, 2), mtn = nz(x, y, 26, 3), d = dist[i];
    WILD[i] = mtn > 0.6 && d > 5 ? 2 : f < 0.24 && d > 8 && mtn < 0.42 ? 3 : f > 0.5 ? 1 : 0;
  }
  // ---------- ระบายสีพื้นทีละช่อง → ขยายนุ่ม ----------
  const grassOf = maps.map(m => this.rgb(m.def.grass || '#6fae4a'));
  const COL = {
    [T.DIRT]: [176, 136, 88], [T.STONE]: [226, 228, 232], [T.HOUSE]: [214, 216, 222], [T.WATER]: [64, 132, 172], [T.FOUNTAIN]: [96, 180, 214],
    [T.ROCK]: [138, 128, 114], [T.WALL]: [40, 36, 34],
  };
  const rd0 = i => maps[reg[i]] && maps[reg[i]].def;
  // สีหญ้าแบบต่อเนื่อง: สีประจำภูมิภาค (ป่าทึบ = เข้มกว่า) แล้วเบลอกว้าง ~12 ช่อง → รอยต่อภูมิภาคไล่สีกันเนียน ไม่เห็นเป็นสี่เหลี่ยม
  const fr = new Float32Array(N), fgc = new Float32Array(N), fb = new Float32Array(N);
  for (let i = 0; i < N; i++) { const d = rd0(i), c0 = grassOf[reg[i]] || [110, 170, 80], k = d && d.trees >= 1.5 ? 0.8 : 1; fr[i] = c0[0] * k; fgc[i] = c0[1] * k; fb[i] = c0[2] * k; }
  const FR = U.boxBlur(fr, TW, TH, 6, 2), FG = U.boxBlur(fgc, TW, TH, 6, 2), FB = U.boxBlur(fb, TW, TH, 6, 2);
  const sc = document.createElement('canvas'); sc.width = TW; sc.height = TH;
  const sg = sc.getContext('2d'), im = sg.createImageData(TW, TH), dd = im.data;
  for (let i = 0; i < N; i++) {
    const x = i % TW, y = (i / TW) | 0, k = 0.9 + nz(x, y, 7, 4) * 0.2, o = i * 4;
    let col;
    if (!land[i]) { // ทะเล: ตื้นใกล้ฝั่ง → ลึก + เส้นคลื่นรอบฝั่ง
      const e = Math.min(1, od[i] / 26);
      col = [94 - e * 52, 150 - e * 70, 160 - e * 50];
      if (od[i] === 1) col = [58, 70, 70]; // เส้นหมึกชายฝั่ง
      else if (od[i] === 3 || od[i] === 6 || od[i] === 10) col = col.map(v => v + 24 - od[i] * 1.6);
    } else {
      const gr = [FR[i], FG[i], FB[i]], t = terr[i];
      const dense = rd0(i) && rd0(i).trees >= 1.5 && (t === T.GRASS || t === T.FLOWER);
      if (t >= 0 && COL[t]) col = COL[t];
      else if (dense) col = gr.map(v => v * 0.66 / 0.8); // ป่าทึบ: พื้นป่าเดียวกับป่ารอบนอก
      else if (t === T.TREE || (t < 0 && WILD[i] === 1)) col = gr.map(v => v * 0.66);
      else if (WILD[i] === 2) col = [150, 140, 122];
      else if (WILD[i] === 3) col = [70, 136, 170];
      else col = gr.map((v, ci) => v * (0.92 + (ci === 0 ? 0.06 : 0)));
      if (od[i] === 0) { let shore = 0; const x2 = x, y2 = y; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = (y2 + dy) * TW + x2 + dx; if (j >= 0 && j < N && !land[j]) shore = 1; } if (shore) col = [214, 196, 150]; } // หาดทราย
    }
    dd[o] = col[0] * k; dd[o + 1] = col[1] * k; dd[o + 2] = col[2] * k; dd[o + 3] = 255;
  }
  sg.putImageData(im, 0, 0);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.filter = 'blur(1.6px)'; g.drawImage(sc, 0, 0, W, H); g.filter = 'none'; // ขอบนุ่มแบบสีน้ำ (ไม่เป็นขั้นบันไดตามช่อง)
  // ---------- ต้นไม้ (ภูมิภาค + ป่ารอบนอก) และภูเขา เรียงตามความลึก ----------
  const items = [];
  for (let i = 0; i < N; i++) {
    if (!land[i]) continue;
    const x = i % TW, y = (i / TW) | 0, t = terr[i], h1 = U.hash2(x, y, 77);
    const rd = maps[reg[i]] && maps[reg[i]].def, wildT = t < 0 && WILD[i] === 1;
    // ต้นไม้ในภูมิภาคเป็นต้นใหญ่ (ยอดกว้าง ~2 ช่องแบบในเกม) • ป่าป่าเถื่อนหนาแน่นแต่ต้นเล็กกว่า
    if (t === T.TREE) items.push({ k: 'tree', x: (x + 0.5) * P, y: (y + 0.5) * P, r: P * (1.5 + U.hash2(x, y, 8) * 0.6) * (rd && rd.pine ? 0.85 : 1), pine: rd && rd.pine });
    else if ((wildT || (rd && rd.trees >= 1.5 && (t === T.GRASS || t === T.FLOWER))) && h1 < 0.5) items.push({ k: 'tree', x: (x + 0.5 + (U.hash2(x, y, 5) - 0.5) * 0.6) * P, y: (y + 0.5 + (U.hash2(y, x, 6) - 0.5) * 0.6) * P, r: P * (0.95 + U.hash2(x, y, 8) * 0.5), pine: rd && rd.pine });
    if (t < 0 && WILD[i] === 2 && h1 < (t === -4 ? 0.2 : 0.07)) items.push({ k: 'mtn', x: (x + 0.5) * P, y: (y + 0.5) * P, s: P * (3.2 + U.hash2(x, y, 9) * 3.2), snow: nz(x, y, 26, 3) > 0.68 });
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) {
    if (it.k === 'tree') {
      const { x, y, r } = it;
      g.fillStyle = 'rgba(16,26,10,0.32)'; g.beginPath(); g.ellipse(x + r * 0.4, y + r * 0.5, r, r * 0.65, 0, 0, 7); g.fill();
      const gr = g.createRadialGradient(x - r * 0.4, y - r * 0.5, r * 0.1, x, y, r * 1.15);
      gr.addColorStop(0, it.pine ? '#6f9e62' : '#8cc66a'); gr.addColorStop(1, it.pine ? '#1f4528' : '#2c5f2a');
      g.fillStyle = gr; g.beginPath();
      if (it.pine) { g.moveTo(x, y - r * 1.4); g.lineTo(x + r * 0.95, y + r * 0.75); g.lineTo(x - r * 0.95, y + r * 0.75); g.closePath(); } else g.arc(x, y, r, 0, 7);
      g.fill();
    } else { // ภูเขาลายหมึก: ด้านซ้ายรับแสง ด้านขวาเงา ยอดหิมะ
      const { x, y, s } = it, hgt = s * 1.25;
      g.fillStyle = 'rgba(30,24,14,0.28)'; g.beginPath(); g.ellipse(x + s * 0.3, y + 2, s * 1.1, s * 0.28, 0, 0, 7); g.fill();
      g.fillStyle = '#b3a68c'; g.beginPath(); g.moveTo(x - s, y); g.lineTo(x - s * 0.08, y - hgt); g.lineTo(x + s * 0.12, y); g.closePath(); g.fill();
      g.fillStyle = '#7d715e'; g.beginPath(); g.moveTo(x - s * 0.08, y - hgt); g.lineTo(x + s, y); g.lineTo(x + s * 0.12, y); g.closePath(); g.fill();
      if (it.snow) { g.fillStyle = '#f4f1ea'; g.beginPath(); g.moveTo(x - s * 0.08, y - hgt); g.lineTo(x - s * 0.36, y - hgt * 0.66); g.lineTo(x - s * 0.12, y - hgt * 0.72); g.lineTo(x + s * 0.06, y - hgt * 0.6); g.lineTo(x + s * 0.3, y - hgt * 0.7); g.closePath(); g.fill(); }
      g.strokeStyle = 'rgba(46,36,22,0.75)'; g.lineWidth = 1.3; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(x - s, y); g.lineTo(x - s * 0.08, y - hgt); g.lineTo(x + s, y); g.stroke();
    }
  }
  // ---------- อาคารในเมือง (ภาพจริง) ----------
  for (const m of maps) for (const b of m.buildings) {
    const img = Art.get(BUILDING_ART[b.label] || (b.kind === 'castle' ? 'prop_bld_tower' : '')); if (!img) { missing = true; continue; }
    const R0 = regions[m.id], bw = b.w * P * (b.kind === 'castle' ? 1.4 : 1.2), bh = bw * img.height / img.width;
    g.drawImage(img, R0.x + (b.x + b.w / 2) * P - bw / 2, R0.y + (b.y + b.h) * P - bh, bw, bh);
  }
  // ---------- ปากถ้ำ (ทางลงใต้ดิน) ----------
  let caveIcon = null;
  for (const m of maps) for (const pt of m.portals) if (MAP_DEFS[pt.to] && MAP_DEFS[pt.to].kind === 'cave') {
    const R0 = regions[m.id], x = R0.x + (pt.x + 0.5) * P, y = R0.y + (pt.y + 0.5) * P + P * 1.5;
    caveIcon = { x, y, ids: caves };
    g.fillStyle = '#6e6656'; g.beginPath(); g.moveTo(x - 30, y + 14); g.quadraticCurveTo(x - 26, y - 22, x, y - 26); g.quadraticCurveTo(x + 26, y - 22, x + 30, y + 14); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(40,30,20,0.8)'; g.lineWidth = 2; g.stroke();
    const cg = g.createRadialGradient(x, y + 4, 2, x, y + 4, 18); cg.addColorStop(0, '#05030a'); cg.addColorStop(1, '#2a2030');
    g.fillStyle = cg; g.beginPath(); g.moveTo(x - 16, y + 14); g.quadraticCurveTo(x - 14, y - 12, x, y - 14); g.quadraticCurveTo(x + 14, y - 12, x + 16, y + 14); g.closePath(); g.fill();
  }
  // ---------- โทนสีน้ำบนกระดาษ + ลายกระดาษ + ขอบจาง ----------
  g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(236,214,170,0.42)'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'soft-light';
  const tc = document.createElement('canvas'); tc.width = TW >> 2; tc.height = TH >> 2;
  const tg = tc.getContext('2d'), ti = tg.createImageData(tc.width, tc.height);
  for (let i = 0; i < tc.width * tc.height; i++) { const v = 128 + (nz(i % tc.width, (i / tc.width) | 0, 5, 7) - 0.5) * 120; ti.data[i * 4] = v + 10; ti.data[i * 4 + 1] = v; ti.data[i * 4 + 2] = v - 14; ti.data[i * 4 + 3] = 255; }
  tg.putImageData(ti, 0, 0); g.drawImage(tc, 0, 0, W, H);
  g.globalCompositeOperation = 'source-over';
  const rr = U.seeded(1717);
  for (let i = 0; i < W * H / 90; i++) { g.fillStyle = `rgba(${rr() < 0.5 ? '255,244,220' : '60,40,20'},${0.04 + rr() * 0.05})`; g.fillRect(rr() * W, rr() * H, 1.3, 1.3); }
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.56);
  vg.addColorStop(0, 'rgba(40,24,8,0)'); vg.addColorStop(1, 'rgba(40,24,8,0.55)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  // ---------- เรือ + คลื่นตกแต่งในทะเล ----------
  g.strokeStyle = 'rgba(220,235,235,0.45)'; g.lineWidth = 1.6;
  for (let i = 0; i < 40; i++) {
    const x = rr() * W, y = rr() * H, j = ((y / P) | 0) * TW + ((x / P) | 0);
    if (land[j] || od[j] < 6) continue;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 7, y - 5, x + 14, y); g.quadraticCurveTo(x + 21, y - 5, x + 28, y); g.stroke();
  }
  // ---------- เส้นเขตแดนระหว่างภูมิภาค (เส้นประหมึกจาง) ----------
  g.strokeStyle = 'rgba(70,44,16,0.45)'; g.lineWidth = 2; g.setLineDash([7, 6]);
  const ids = Object.keys(regions);
  for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) {
    const A = regions[ids[a]], B = regions[ids[b]];
    if (Math.abs(A.x + A.w - B.x) < 2 || Math.abs(B.x + B.w - A.x) < 2) { const x = Math.abs(A.x + A.w - B.x) < 2 ? B.x : A.x, ya = Math.max(A.y, B.y), yb = Math.min(A.y + A.h, B.y + B.h); if (yb > ya) { g.beginPath(); g.moveTo(x, ya); g.lineTo(x, yb); g.stroke(); } }
    if (Math.abs(A.y + A.h - B.y) < 2 || Math.abs(B.y + B.h - A.y) < 2) { const y = Math.abs(A.y + A.h - B.y) < 2 ? B.y : A.y, xa = Math.max(A.x, B.x), xb = Math.min(A.x + A.w, B.x + B.w); if (xb > xa) { g.beginPath(); g.moveTo(xa, y); g.lineTo(xb, y); g.stroke(); } }
  }
  g.setLineDash([]);
  // ---------- ทะเลแห่งเจอร์มุนกันดร์: งูโลกขดตัวในทะเล + เรือยาวไวกิ้ง + ชื่อทะเล ----------
  let sx = 0, sy = 0, best = -1; // หาทะเลเปิดที่กว้างที่สุด (ไกลฝั่งสุด)
  for (let y = 4; y < TH - 4; y += 2) for (let x = 4; x < TW - 4; x += 2) {
    const j = y * TW + x; if (land[j] || od[j] >= 900) continue;
    const sc2 = Math.min(od[j], x - 10, TW - 10 - x, y - 14, TH - 14 - y) - (x > TW - 50 && y > TH - 50 ? 99 : 0); // ห่างฝั่ง ห่างขอบภาพ และไม่ทับเข็มทิศ
    if (sc2 > best) { best = sc2; sx = x * P; sy = y * P; }
  }
  if (best > 12) {
    const L0 = Math.min(260, best * P * 1.6);
    g.save(); g.translate(sx, sy);
    for (let k = 0; k < 4; k++) { // หลังงูโผล่พ้นน้ำเป็นช่วง ๆ
      const hx = -L0 * 0.5 + k * L0 * 0.28, hw = L0 * 0.12;
      g.fillStyle = 'rgba(30,70,70,0.35)'; g.beginPath(); g.ellipse(hx, 4, hw * 1.2, 5, 0, 0, 7); g.fill();
      g.fillStyle = '#3c7a6a'; g.strokeStyle = '#173a32'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(hx - hw, 0); g.bezierCurveTo(hx - hw * 0.8, -hw * 1.15, hx + hw * 0.8, -hw * 1.15, hx + hw, 0); g.lineTo(hx + hw * 0.62, 0); g.bezierCurveTo(hx + hw * 0.5, -hw * 0.6, hx - hw * 0.5, -hw * 0.6, hx - hw * 0.62, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#6aa890'; for (let f = 0; f < 3; f++) { const fx = hx - hw * 0.4 + f * hw * 0.4; g.beginPath(); g.moveTo(fx - 4, -hw * 0.95); g.lineTo(fx, -hw * 1.25); g.lineTo(fx + 4, -hw * 0.95); g.closePath(); g.fill(); } // ครีบ
    }
    const hx = L0 * 0.62; // หัวงู
    g.fillStyle = '#3c7a6a'; g.strokeStyle = '#173a32'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(hx - 22, 2); g.quadraticCurveTo(hx - 18, -30, hx + 6, -34); g.quadraticCurveTo(hx + 30, -32, hx + 34, -20); g.quadraticCurveTo(hx + 20, -16, hx + 4, -14); g.quadraticCurveTo(hx - 2, -6, hx - 6, 2); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ffd34a'; g.beginPath(); g.arc(hx + 12, -26, 3, 0, 7); g.fill();
    g.strokeStyle = '#e8f0e8'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(hx + 30, -19); g.lineTo(hx + 26, -12); g.stroke();
    g.font = 'italic 700 20px Cinzel, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(220,236,226,0.85)';
    if ('letterSpacing' in g) g.letterSpacing = '3px';
    g.fillText(L('ทะเลแห่งเจอร์มุนกันดร์', 'SEA OF JÖRMUNGANDR'), 0, 46);
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    g.restore();
    // เรือยาว (ใกล้ฝั่ง)
    let bx = 0, by = 0; for (let y = 4; y < TH - 4; y += 3) for (let x = 4; x < TW - 4; x += 3) { const j = y * TW + x; if (!land[j] && od[j] === 8 && U.hash2(x, y, 12) < 0.08) { bx = x * P; by = y * P; } }
    if (bx) {
      g.save(); g.translate(bx, by);
      g.fillStyle = '#5a3a1a'; g.strokeStyle = '#2a1808'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(-24, 0); g.quadraticCurveTo(0, 12, 24, 0); g.quadraticCurveTo(28, -8, 30, -12); g.lineTo(26, -4); g.lineTo(-26, -4); g.lineTo(-30, -12); g.quadraticCurveTo(-28, -8, -24, 0); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = '#2a1808'; g.beginPath(); g.moveTo(0, -4); g.lineTo(0, -34); g.stroke();
      g.fillStyle = '#e8d8b0'; g.beginPath(); g.moveTo(-14, -32); g.lineTo(14, -32); g.lineTo(12, -10); g.lineTo(-12, -10); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = '#b8382a'; g.lineWidth = 3; for (const yy of [-26, -20, -14]) { g.beginPath(); g.moveTo(-12, yy); g.lineTo(12, yy); g.stroke(); }
      g.restore();
    }
  }
  // ---------- กรอบทองลาย ----------
  g.strokeStyle = 'rgba(30,18,6,0.9)'; g.lineWidth = 10; g.strokeRect(5, 5, W - 10, H - 10);
  g.strokeStyle = '#c9a24e'; g.lineWidth = 2.5; g.strokeRect(10, 10, W - 20, H - 20);
  g.strokeStyle = 'rgba(201,162,78,0.6)'; g.lineWidth = 1; g.strokeRect(16, 16, W - 32, H - 32);
  for (const [cx, cy] of [[16, 16], [W - 16, 16], [16, H - 16], [W - 16, H - 16]]) {
    g.save(); g.translate(cx, cy); g.rotate(Math.PI / 4); g.fillStyle = '#c9a24e'; g.fillRect(-7, -7, 14, 14); g.fillStyle = '#2a1a08'; g.fillRect(-3.5, -3.5, 7, 7); g.restore();
  }
  // ---------- ป้าย MIDGARD (ม้วนกระดาษ) ----------
  g.save(); g.translate(40, 34);
  g.fillStyle = 'rgba(236,220,180,0.92)'; g.strokeStyle = '#6a4a20'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, 10); g.lineTo(290, 10); g.quadraticCurveTo(306, 40, 290, 70); g.lineTo(0, 70); g.quadraticCurveTo(-16, 40, 0, 10); g.closePath(); g.fill(); g.stroke();
  g.font = '800 40px Cinzel, "Kanit", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#3a2408'; g.fillText('MIDGARD', 145, 37);
  g.font = '600 13px Kanit, sans-serif'; g.fillStyle = '#6a4a20'; g.fillText(L('ดินแดนแห่งมนุษย์และแอนดรอยด์', 'Realm of Humans & Androids'), 145, 61);
  g.restore();
  // ---------- เข็มทิศประดับ ----------
  const cx = W - 118, cy = H - 112, R0 = 62;
  g.save(); g.translate(cx, cy);
  g.fillStyle = 'rgba(236,220,180,0.25)'; g.beginPath(); g.arc(0, 0, R0 + 14, 0, 7); g.fill();
  g.strokeStyle = '#6a4a20'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, R0 + 10, 0, 7); g.stroke(); g.lineWidth = 1; g.beginPath(); g.arc(0, 0, R0 + 4, 0, 7); g.stroke();
  for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2, l = i % 4 ? 4 : 9; g.beginPath(); g.moveTo(Math.cos(a) * (R0 + 4), Math.sin(a) * (R0 + 4)); g.lineTo(Math.cos(a) * (R0 + 4 - l), Math.sin(a) * (R0 + 4 - l)); g.stroke(); }
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 - Math.PI / 2, L0 = i % 2 ? R0 * 0.55 : R0 * 0.95;
    for (const side of [1, -1]) {
      g.fillStyle = side > 0 ? (i === 0 ? '#b8382a' : '#3a2408') : (i === 0 ? '#e86a50' : '#e8d4a4');
      g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * L0, Math.sin(a) * L0); g.lineTo(Math.cos(a + side * 0.42) * 11, Math.sin(a + side * 0.42) * 11); g.closePath(); g.fill();
    }
  }
  g.fillStyle = '#c9a24e'; g.beginPath(); g.arc(0, 0, 5, 0, 7); g.fill();
  g.font = '800 20px Cinzel, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#3a2408';
  for (const [t, a] of [['N', -Math.PI / 2], ['E', 0], ['S', Math.PI / 2], ['W', Math.PI]]) g.fillText(t, Math.cos(a) * (R0 + 26), Math.sin(a) * (R0 + 26));
  g.restore();
  return (this._art = { c, P, regions, caveIcon, missing, at: Date.now() });
};
