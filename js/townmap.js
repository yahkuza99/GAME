'use strict';
// ============================================================
//  ภาพพื้นเมือง Neo Eldheim — แปลงภาพ assets/map_eldheim.webp เป็นมุมมองจากบน
//  หินอ่อนขาวขอบทอง • เส้นแสงฟ้ารอบน้ำพุและตามถนน • สระน้ำพุกลมหลายชั้น
//  คลองขอบหินอ่อน + สะพานราวทอง • กระถางต้นไม้ • ขอบสวน
//  (ผังเมือง/การชนอยู่ใน GameMap.genTown — ที่นี่วาดอย่างเดียว)
// ============================================================
const TownArt = {
  GLOW: '#5fd4ff', GOLD: '#d7b25a', GOLD_D: '#8a6a2a',

  isStone(m, x, y) { const t = m.tile(x, y); return t === T.STONE || t === T.FOUNTAIN; },
  hh(m, x, y, k) { return U.hash2(x * 7 + k, y * 13 - k, m.def.seed + 4242); },

  // เส้นเรืองแสง: แกนขาว + เรืองฟ้า
  glow(g, draw, w = 2.4, col = this.GLOW, blur = 9) {
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    g.shadowColor = col; g.shadowBlur = blur; g.strokeStyle = col; g.lineWidth = w;
    g.beginPath(); draw(); g.stroke();
    g.shadowBlur = 0; g.strokeStyle = 'rgba(235,252,255,0.95)'; g.lineWidth = Math.max(0.8, w * 0.35);
    g.beginPath(); draw(); g.stroke(); g.restore();
  },
  // เส้นทอง: ขอบเข้ม + เนื้อทอง + ไฮไลต์
  gold(g, draw, w = 2) {
    g.save(); g.lineCap = 'butt'; g.lineJoin = 'miter';
    g.strokeStyle = 'rgba(70,50,20,0.45)'; g.lineWidth = w + 1.6; g.beginPath(); draw(); g.stroke();
    g.strokeStyle = this.GOLD; g.lineWidth = w; g.beginPath(); draw(); g.stroke();
    g.strokeStyle = 'rgba(255,240,190,0.7)'; g.lineWidth = Math.max(0.6, w * 0.35); g.beginPath(); draw(); g.stroke();
    g.restore();
  },

  // ---------- 1) พื้นหินอ่อน (ก่อนรายละเอียดอื่น) ----------
  floor(m, g) {
    const W = m.w, H = m.h, S = TILE * 2;
    g.save();
    g.beginPath();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (this.isStone(m, x, y) || m.tile(x, y) === T.HOUSE) g.rect(x * TILE, y * TILE, TILE, TILE);
    g.clip();
    // แผ่นหินอ่อน 2x2 ช่อง สีต่างกันเล็กน้อย มีลายเส้นหินและเงาขัดเงา
    for (let sy = 0; sy < H; sy += 2) for (let sx = 0; sx < W; sx += 2) {
      const px = sx * TILE, py = sy * TILE, k = this.hh(m, sx, sy, 1), k2 = this.hh(m, sx, sy, 2);
      const gr = g.createLinearGradient(px, py, px + S, py + S);
      const a = 228 + k * 14 | 0, b = 216 + k * 12 | 0;
      gr.addColorStop(0, `rgb(${a},${a + 3},${a + 7})`); gr.addColorStop(1, `rgb(${b},${b + 4},${b + 10})`);
      g.fillStyle = gr; g.fillRect(px, py, S, S);
      // ลายหิน
      g.strokeStyle = `rgba(140,150,168,${0.16 + k2 * 0.14})`; g.lineWidth = 0.9;
      for (let i = 0; i < 2; i++) {
        const r1 = this.hh(m, sx, sy, 10 + i), r2 = this.hh(m, sx, sy, 20 + i), r3 = this.hh(m, sx, sy, 30 + i);
        g.beginPath(); g.moveTo(px + r1 * S, py);
        g.bezierCurveTo(px + r2 * S, py + S * 0.35, px + r3 * S, py + S * 0.65, px + (1 - r1) * S, py + S); g.stroke();
      }
      // ประกายขัดเงา
      if (k2 > 0.55) {
        const sh = g.createLinearGradient(px, py + S, px + S, py);
        sh.addColorStop(0.35, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.22)'); sh.addColorStop(0.65, 'rgba(255,255,255,0)');
        g.fillStyle = sh; g.fillRect(px, py, S, S);
      }
      // ร่องแผ่น: เส้นทองบาง + ขอบสว่าง
      g.fillStyle = 'rgba(176,146,84,0.55)'; g.fillRect(px, py, S, 1.2); g.fillRect(px, py, 1.2, S);
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(px + 1.2, py + 1.2, S - 1.2, 1); g.fillRect(px + 1.2, py + 1.2, 1, S - 1.2);
    }
    // ลานกลาง: หินอ่อนวงกลมเรียงเป็นวง (ลายโมเสก)
    const C = (m.w >> 1) + 0.5, cxp = C * TILE, cyp = C * TILE, RO = 7.6 * TILE;
    const rg = g.createRadialGradient(cxp, cyp, TILE * 2, cxp, cyp, RO);
    rg.addColorStop(0, '#f4f6f9'); rg.addColorStop(1, '#e2e7ee');
    g.fillStyle = rg; g.beginPath(); g.arc(cxp, cyp, RO, 0, 7); g.fill();
    g.strokeStyle = 'rgba(176,146,84,0.45)'; g.lineWidth = 1.1;
    for (let r = 3.4; r < 7.6; r += 1.05) { g.beginPath(); g.arc(cxp, cyp, r * TILE, 0, 7); g.stroke(); }
    for (let r = 3.4, ring = 0; r < 7.5; r += 1.05, ring++) {
      const n = Math.round(r * 3.2), off = ring % 2 ? Math.PI / n : 0;
      for (let i = 0; i < n; i++) {
        const a = off + i / n * Math.PI * 2;
        g.beginPath(); g.moveTo(cxp + Math.cos(a) * r * TILE, cyp + Math.sin(a) * r * TILE);
        g.lineTo(cxp + Math.cos(a) * (r + 1.05) * TILE, cyp + Math.sin(a) * (r + 1.05) * TILE); g.stroke();
      }
    }
    g.restore();
  },

  // ---------- ถนนหินอ่อนนอกเมือง (ทุ่งที่ติดประตูเมือง): แผ่นหินอ่อนขอบทอง เส้นแสงกลางถนนจางลงเมื่อห่างเมือง ----------
  pave(m, g) {
    const W = m.w, H = m.h, isP = (x, y) => m.tile(x, y) === T.STONE;
    g.save(); g.beginPath();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isP(x, y)) g.rect(x * TILE, y * TILE, TILE, TILE);
    g.clip();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isP(x, y)) {
      const px = x * TILE, py = y * TILE, k = this.hh(m, x, y, 1), a = 222 + k * 16 | 0;
      g.fillStyle = `rgb(${a},${a + 2},${a + 6})`; g.fillRect(px, py, TILE, TILE);
      g.strokeStyle = `rgba(140,150,168,${0.15 + k * 0.15})`; g.lineWidth = 0.9;
      g.beginPath(); g.moveTo(px + this.hh(m, x, y, 3) * TILE, py); g.bezierCurveTo(px + k * TILE, py + TILE * 0.4, px + (1 - k) * TILE, py + TILE * 0.6, px + this.hh(m, x, y, 4) * TILE, py + TILE); g.stroke();
      g.fillStyle = 'rgba(176,146,84,0.5)'; g.fillRect(px, py, TILE, 1.2); g.fillRect(px, py, 1.2, TILE);
      // คราบดิน/หญ้าแทรกตามร่อง: ยิ่งห่างเมืองยิ่งรก
      const wild = Math.min(1, (m.paved || []).reduce((b, r) => Math.min(b, Math.abs((x - r.x) * r.dx + (y - r.y) * r.dy)), 99) / 11);
      // หญ้าขึ้นตามร่องแผ่นหิน: ยิ่งห่างเมืองยิ่งรก
      if (this.hh(m, x, y, 8) < 0.15 + wild * 0.7) {
        const n = 1 + Math.floor(wild * 4);
        for (let i = 0; i < n; i++) {
          const onX = this.hh(m, x, y, 9 + i) < 0.5, gx = onX ? px + this.hh(m, x, y, 20 + i) * TILE : px + 1, gy = onX ? py + 1 : py + this.hh(m, x, y, 30 + i) * TILE;
          g.fillStyle = i % 2 ? 'rgba(78,140,52,0.85)' : 'rgba(120,180,70,0.8)';
          g.beginPath(); g.ellipse(gx, gy, 1.6 + wild * 1.8, 1.1 + wild * 0.8, this.hh(m, x, y, 40 + i) * 3, 0, 7); g.fill();
        }
      }
    }
    for (const r of m.paved || []) { // เส้นแสงกลางถนน
      const len = r.len + 0.5;
      for (let i = 0; i < len; i += 0.5) {
        const x0 = (r.x + 0.5 + r.dx * i) * TILE, y0 = (r.y + 0.5 + r.dy * i) * TILE, x1 = x0 + r.dx * TILE * 0.35, y1 = y0 + r.dy * TILE * 0.35;
        g.globalAlpha = Math.max(0, 1 - i / len) * 0.9;
        this.glow(g, () => { g.moveTo(x0, y0); g.lineTo(x1, y1); }, 2);
      }
      g.globalAlpha = 1;
    }
    g.restore();
    // ขอบถนน: ขอบหินยก + เส้นทอง
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (isP(x, y)) {
      const px = x * TILE, py = y * TILE;
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const t = m.tile(x + dx, y + dy); if (t === T.STONE || t === T.TREE && (x + dx < 2 || y + dy < 2 || x + dx >= W - 2 || y + dy >= H - 2)) continue;
        const hor = dy !== 0, ex = dx > 0 ? px + TILE : px, ey = dy > 0 ? py + TILE : py;
        g.fillStyle = 'rgba(30,40,20,0.3)';
        if (hor) g.fillRect(px, dy > 0 ? ey : ey - 4, TILE, 4); else g.fillRect(dx > 0 ? ex : ex - 4, py, 4, TILE);
        g.fillStyle = '#eef1f5';
        if (hor) g.fillRect(px, dy > 0 ? ey - 4 : ey, TILE, 4); else g.fillRect(dx > 0 ? ex - 4 : ex, py, 4, TILE);
        this.gold(g, () => { if (hor) { const yy = dy > 0 ? ey - 4 : ey + 4; g.moveTo(px, yy); g.lineTo(px + TILE, yy); } else { const xx = dx > 0 ? ex - 4 : ex + 4; g.moveTo(xx, py); g.lineTo(xx, py + TILE); } }, 1.1);
      }
    }
  },

  // ---------- 2) คลอง สะพาน น้ำพุ เส้นแสง กระถาง ----------
  over(m, g) {
    this.canals(m, g);
    this.bedCurbs(m, g);
    this.lines(m, g);
    this.basin(m, g);
    for (const b of m.bridges || []) this.bridge(m, g, b);
    for (const [x, y] of m.planters || []) if (m.tile(x, y) === T.TREE) this.planter(g, x, y);
  },

  // น้ำในคลอง: คมตามช่อง ขอบหินอ่อนเส้นทอง และเส้นแสงด้านใน
  canals(m, g) {
    const W = m.w, H = m.h, isW = (x, y) => m.tile(x, y) === T.WATER;
    g.save();
    g.beginPath();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isW(x, y)) g.rect(x * TILE, y * TILE, TILE, TILE);
    g.clip();
    const gr = g.createLinearGradient(0, 0, 0, H * TILE);
    gr.addColorStop(0, '#4cc3e6'); gr.addColorStop(1, '#2c8fc8');
    g.fillStyle = gr; g.fillRect(0, 0, W * TILE, H * TILE);
    // ความลึกกลางคลอง + แสงสะท้อน
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isW(x, y)) {
      let n = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (isW(x + dx, y + dy)) n++;
      g.fillStyle = `rgba(10,60,120,${0.06 * n})`; g.fillRect(x * TILE, y * TILE, TILE, TILE);
      const r = this.hh(m, x, y, 5);
      g.strokeStyle = 'rgba(220,250,255,0.35)'; g.lineWidth = 1.2;
      const ox = x * TILE + 6 + r * 20, oy = y * TILE + 8 + this.hh(m, x, y, 6) * 24;
      g.beginPath(); g.moveTo(ox, oy); g.quadraticCurveTo(ox + 5, oy - 2, ox + 11, oy); g.stroke();
    }
    g.restore();
    // ขอบ: เงาจากขอบหิน (ด้านบนของน้ำ) + ขอบหินอ่อน + เส้นทอง + เส้นแสง
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isW(x, y)) {
      const px = x * TILE, py = y * TILE;
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const t = m.tile(x + dx, y + dy);
        if (t === T.WATER || t === T.HOUSE || t === T.TREE && (x + dx < 2 || x + dx >= W - 2)) continue;
        const ex = dx > 0 ? px + TILE : px, ey = dy > 0 ? py + TILE : py, hor = dy !== 0;
        // เงาใต้ขอบ (น้ำต่ำกว่าพื้น)
        const sd = hor ? g.createLinearGradient(0, ey, 0, ey - dy * 10) : g.createLinearGradient(ex, 0, ex - dx * 10, 0);
        sd.addColorStop(0, `rgba(8,40,80,${dy < 0 ? 0.55 : 0.3})`); sd.addColorStop(1, 'rgba(8,40,80,0)');
        g.fillStyle = sd;
        if (hor) g.fillRect(px, dy > 0 ? py + TILE - 10 : py, TILE, 10); else g.fillRect(dx > 0 ? px + TILE - 10 : px, py, 10, TILE);
        // ขอบหินอ่อนยกสูง (ฝั่งพื้น)
        g.fillStyle = '#f2f4f7';
        if (hor) g.fillRect(px - 1, dy > 0 ? ey : ey - 6, TILE + 2, 6); else g.fillRect(dx > 0 ? ex : ex - 6, py - 1, 6, TILE + 2);
        g.fillStyle = 'rgba(120,130,150,0.5)';
        if (hor) g.fillRect(px - 1, dy > 0 ? ey + 6 : ey - 7, TILE + 2, 1); else g.fillRect(dx > 0 ? ex + 6 : ex - 7, py - 1, 1, TILE + 2);
        this.gold(g, () => { if (hor) { g.moveTo(px - 1, ey); g.lineTo(px + TILE + 1, ey); } else { g.moveTo(ex, py - 1); g.lineTo(ex, py + TILE + 1); } }, 1.6);
        const gi = hor ? ey - dy * 3 : 0, gj = hor ? 0 : ex - dx * 3;
        this.glow(g, () => { if (hor) { g.moveTo(px + 1, gi); g.lineTo(px + TILE - 1, gi); } else { g.moveTo(gj, py + 1); g.lineTo(gj, py + TILE - 1); } }, 1.6, this.GLOW, 6);
      }
    }
  },

  // ขอบสวน/แปลงหญ้า: ขอบหินอ่อนยกสูงแบบกระถางในภาพ
  bedCurbs(m, g) {
    const W = m.w, H = m.h, green = t => t === T.GRASS || t === T.FLOWER || t === T.TREE;
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
      const t = m.tile(x, y);
      if (!green(t) || (m.planters || []).some(([px, py]) => px === x && py === y)) continue;
      const px = x * TILE, py = y * TILE;
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        if (!this.isStone(m, x + dx, y + dy)) continue;
        const hor = dy !== 0, ex = dx > 0 ? px + TILE : px, ey = dy > 0 ? py + TILE : py;
        g.fillStyle = 'rgba(30,40,20,0.35)';                       // เงาขอบบนดิน
        if (hor) g.fillRect(px, dy < 0 ? py + 5 : py + TILE - 9, TILE, 4); else g.fillRect(dx < 0 ? px + 5 : px + TILE - 9, py, 4, TILE);
        g.fillStyle = '#eef1f5';
        if (hor) g.fillRect(px - 2, dy < 0 ? ey - 1 : ey - 6, TILE + 4, 7); else g.fillRect(dx < 0 ? ex - 1 : ex - 6, py - 2, 7, TILE + 4);
        g.fillStyle = 'rgba(110,120,140,0.55)';
        if (hor) g.fillRect(px - 2, dy < 0 ? ey + 6 : ey + 1, TILE + 4, 1.2); else g.fillRect(dx < 0 ? ex + 6 : ex + 1, py - 2, 1.2, TILE + 4);
        this.gold(g, () => { if (hor) { const yy = dy < 0 ? ey + 2 : ey - 3; g.moveTo(px - 2, yy); g.lineTo(px + TILE + 2, yy); } else { const xx = dx < 0 ? ex + 2 : ex - 3; g.moveTo(xx, py - 2); g.lineTo(xx, py + TILE + 2); } }, 1.2);
      }
    }
  },

  // เส้นแสงฟ้า + เส้นทอง: วงรอบน้ำพุ รัศมีแปดทิศ และคู่เส้นตามถนนหลักออกไปทางออกเมือง (มุมหักแบบในภาพ)
  lines(m, g) {
    const T_ = TILE, cx = m.w >> 1, C = (cx + 0.5) * T_, R1 = 3.4 * T_, R2 = 7.6 * T_;
    this.gold(g, () => { g.arc(C, C, R2 + 7, 0, 7); }, 2.4);
    this.glow(g, () => { g.arc(C, C, R2, 0, 7); }, 3);
    this.glow(g, () => { g.arc(C, C, R1, 0, 7); }, 2.4);
    this.gold(g, () => { g.arc(C, C, R1 - 6, 0, 7); }, 1.6);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + Math.PI / 8;
      this.glow(g, () => { g.moveTo(C + Math.cos(a) * R1, C + Math.sin(a) * R1); g.lineTo(C + Math.cos(a) * R2, C + Math.sin(a) * R2); }, 1.8);
    }
    // ถนน 4 ทิศ (กว้าง 3 ช่อง): เส้นแสงขอบถนน + เส้นทองด้านนอก + ลูกศรนำทางกลางถนน
    const ends = { N: 9.2, S: m.h - 1.2, E: m.w - 1.2, W: 2.2 };
    for (const dir of ['N', 'S', 'E', 'W']) {
      const sgn = dir === 'S' || dir === 'E' ? 1 : -1, vert = dir === 'N' || dir === 'S';
      const from = C + sgn * Math.sqrt(R2 * R2 - (1.5 * T_) ** 2), to = ends[dir] * T_ + (sgn > 0 ? 0 : 0);
      const P = (along, across) => vert ? [C + across, along] : [along, C + across];
      for (const side of [-1, 1]) {
        // หักมุม 45° แบบลายในภาพ: ออกจากวงแคบ แล้วถ่างออกเป็นขอบถนน
        const nIn = side * 1.2 * T_, nOut = side * 1.42 * T_, bend = from + sgn * 0.6 * T_;
        this.glow(g, () => { g.moveTo(...P(from, nIn)); g.lineTo(...P(bend, nIn)); g.lineTo(...P(bend + sgn * 0.22 * T_, nOut)); g.lineTo(...P(to, nOut)); }, 2.2);
        this.gold(g, () => { g.moveTo(...P(from + sgn * 0.2 * T_, side * 1.62 * T_)); g.lineTo(...P(to, side * 1.62 * T_)); }, 1.6);
      }
      for (let d = from + sgn * 1.6 * T_; sgn > 0 ? d < to - T_ : d > to + T_; d += sgn * 2.2 * T_) {
        this.glow(g, () => { g.moveTo(...P(d, -0.32 * T_)); g.lineTo(...P(d + sgn * 0.3 * T_, 0)); g.lineTo(...P(d, 0.32 * T_)); }, 1.6, '#8fe6ff', 6);
      }
    }
  },

  // สระน้ำพุกลม 3 ชั้น (ภาพน้ำพุคริสตัลตั้งอยู่กลางสระ — วาดใน render)
  basin(m, g) {
    const f = m.fountain; if (!f) return;
    const x = f.x * TILE, y = f.y * TILE, R = 2.85 * TILE;
    g.save();
    g.fillStyle = 'rgba(30,50,80,0.25)'; g.beginPath(); g.ellipse(x + 4, y + 7, R + 6, R + 4, 0, 0, 7); g.fill();
    // ขอบสระหินอ่อน
    g.fillStyle = '#f3f5f8'; g.beginPath(); g.arc(x, y, R, 0, 7); g.fill();
    g.strokeStyle = 'rgba(110,120,140,0.6)'; g.lineWidth = 1.5; g.stroke();
    this.gold(g, () => g.arc(x, y, R - 4, 0, 7), 2);
    // น้ำ
    const wg = g.createRadialGradient(x, y - R * 0.2, R * 0.2, x, y, R - 9);
    wg.addColorStop(0, '#8ae4ff'); wg.addColorStop(0.6, '#45b8e6'); wg.addColorStop(1, '#237fbf');
    g.fillStyle = wg; g.beginPath(); g.arc(x, y, R - 9, 0, 7); g.fill();
    const ish = g.createRadialGradient(x, y, R - 22, x, y, R - 9);
    ish.addColorStop(0, 'rgba(10,50,100,0)'); ish.addColorStop(1, 'rgba(10,50,100,0.45)');
    g.fillStyle = ish; g.beginPath(); g.arc(x, y, R - 9, 0, 7); g.fill();
    // ชั้นน้ำตกกลาง (วงหินอ่อน + ม่านน้ำไหลลง)
    for (const [r, wdt] of [[1.75, 7], [1.05, 6]]) {
      const rr = r * TILE;
      g.strokeStyle = 'rgba(200,245,255,0.55)'; g.lineWidth = 6;
      g.beginPath(); g.arc(x, y + 3, rr + 4, 0, 7); g.stroke();
      g.fillStyle = '#eef2f6'; g.beginPath(); g.arc(x, y, rr + 1, 0, 7); g.arc(x, y, rr - wdt, 0, 7, true); g.fill();
      this.gold(g, () => g.arc(x, y, rr, 0, 7), 1.3);
      for (let i = 0; i < 28; i++) {
        const a = i / 28 * Math.PI * 2, k = 0.5 + 0.5 * Math.sin(i * 2.7);
        g.strokeStyle = `rgba(235,252,255,${0.35 + k * 0.4})`; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(x + Math.cos(a) * (rr + 2), y + Math.sin(a) * (rr + 2)); g.lineTo(x + Math.cos(a) * (rr + 8), y + Math.sin(a) * (rr + 8) + 2); g.stroke();
      }
    }
    g.fillStyle = '#8ae4ff'; g.beginPath(); g.arc(x, y, 1.05 * TILE - 7, 0, 7); g.fill();
    this.glow(g, () => g.arc(x, y, R - 10, 0, 7), 2.2);
    g.restore();
  },

  // สะพาน: พื้นหินอ่อนปูขวาง ราวสองข้างทองขาว เสาเป็นระยะ เงาตกบนน้ำ
  bridge(m, g, b) {
    const v = b.dir === 'v';
    // แกน along = ทิศเดิน, across = ขวางสะพาน
    const a0 = (v ? b.y0 : b.x0) * TILE - 8, a1 = ((v ? b.y1 : b.x1) + 1) * TILE + 8;
    const c0 = (v ? b.x0 : b.y0) * TILE - 4, c1 = ((v ? b.x1 : b.y1) + 1) * TILE + 4;
    const rect = (al, ac, la, lc) => v ? g.fillRect(ac, al, lc, la) : g.fillRect(al, ac, la, lc);
    const line = (al0, ac0, al1, ac1) => v ? (g.moveTo(ac0, al0), g.lineTo(ac1, al1)) : (g.moveTo(al0, ac0), g.lineTo(al1, ac1));
    g.save();
    // เงาบนน้ำ (เยื้องลงขวา)
    g.fillStyle = 'rgba(6,40,80,0.35)'; rect(a0 + 10, c0 + 6, a1 - a0 - 20, c1 - c0 + 6);
    // ซุ้มโค้งใต้สะพาน (มองเห็นเป็นเงาโค้งตรงกลาง)
    g.fillStyle = 'rgba(6,40,80,0.25)';
    if (v) { g.beginPath(); g.ellipse((c0 + c1) / 2, a1 - 2, (c1 - c0) / 2 + 6, 7, 0, 0, Math.PI); g.fill(); }
    else { g.beginPath(); g.ellipse((a0 + a1) / 2, c1 + 2, (a1 - a0) / 2 - 12, 7, 0, 0, Math.PI); g.fill(); }
    // พื้นสะพาน
    const dg = v ? g.createLinearGradient(c0, 0, c1, 0) : g.createLinearGradient(0, c0, 0, c1);
    dg.addColorStop(0, '#dfe3ea'); dg.addColorStop(0.5, '#f6f7fa'); dg.addColorStop(1, '#d6dbe3');
    g.fillStyle = dg; rect(a0, c0, a1 - a0, c1 - c0);
    g.strokeStyle = 'rgba(150,135,100,0.45)'; g.lineWidth = 1;
    g.beginPath(); for (let a = a0 + 10; a < a1; a += 10) line(a, c0 + 6, a, c1 - 6); g.stroke();
    this.glow(g, () => line(a0 + 4, (c0 + c1) / 2, a1 - 4, (c0 + c1) / 2), 2.2);
    // ราวสะพานสองข้าง
    for (const side of [c0, c1 - 7]) {
      g.fillStyle = 'rgba(40,50,70,0.35)'; rect(a0, side + 2, a1 - a0, 7);
      g.fillStyle = '#f7f8fa'; rect(a0, side, a1 - a0, 6);
      this.gold(g, () => line(a0, side + 1, a1, side + 1), 1.4);
      for (let a = a0; a <= a1 - 6; a += (a1 - a0 - 6) / 4) {
        g.fillStyle = 'rgba(30,40,60,0.4)'; rect(a + 1, side + 1, 8, 8);
        g.fillStyle = '#e9edf2'; rect(a, side - 1, 8, 8);
        g.fillStyle = this.GOLD; rect(a + 2, side + 1, 4, 4);
      }
    }
    g.restore();
  },

  // กระถางต้นไม้หินอ่อนขอบทอง (ต้นไม้วาดทับจาก Flora)
  planter(g, x, y) {
    const px = x * TILE, py = y * TILE, s = 4;
    g.save();
    g.fillStyle = 'rgba(30,40,60,0.3)'; g.fillRect(px - s + 4, py - s + 5, TILE + s * 2, TILE + s * 2);
    g.fillStyle = '#eef1f5'; g.fillRect(px - s, py - s, TILE + s * 2, TILE + s * 2);
    g.strokeStyle = 'rgba(110,120,140,0.6)'; g.lineWidth = 1; g.strokeRect(px - s + 0.5, py - s + 0.5, TILE + s * 2 - 1, TILE + s * 2 - 1);
    this.gold(g, () => g.rect(px - 1, py - 1, TILE + 2, TILE + 2), 1.4);
    const sg = g.createRadialGradient(px + TILE / 2, py + TILE / 2, 3, px + TILE / 2, py + TILE / 2, TILE * 0.7);
    sg.addColorStop(0, '#6aa848'); sg.addColorStop(1, '#3d6e2c');
    g.fillStyle = sg; g.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
    g.restore();
  },
};
