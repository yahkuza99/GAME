'use strict';
// ============================================================
//  Flora: ต้นไม้ใหญ่ + ของประดับทุ่ง/ป่า แบบภาพวาดนิทาน (สัดส่วนแบบ MMO คลาสสิก: ต้นไม้สูง ~3-4 เท่าตัวละคร)
//  - ต้นไม้: ภาพ prop_tree_* ย้อมสี/ประดับผล-ดอก เป็นหลายสายพันธุ์ แคชลง canvas ครั้งเดียว
//    ชนเฉพาะช่องลำต้น (ช่อง T.TREE เดิม) • ยอดไม้บังตัวละคร → ยอดจางลงอัตโนมัติ
//  - ช่องต้นไม้ที่ชิดกันเป็นแนว: เลือกต้นหลักห่างกัน ~2 ช่อง ที่เหลือเป็นพุ่มไม้เตี้ย (ยังเดินไม่ได้เหมือนเดิม)
//  - พื้น: หย่อมดินขอบหยัก หญ้ากระจุก ต้นอ่อน ดอกไม้จิ๋ว ก้อนกรวด เงาต้นไม้ อบลงภาพพื้น (ไม่มีต้นทุนต่อเฟรม)
//  - ของประดับ: พุ่มดอกไม้สีอุ่น พุ่มใบ เฟิร์น หญ้าสูง ตอไม้ ขอนไม้ รั้วไม้ เป็นกลุ่มตามขอบป่า/รอบต้นไม้ (ไม่กีดขวาง)
//  โหลดหลัง js/maps.js • ใช้ Art/U/TILE/T (โหลดก่อนแล้ว) • ทุกอย่างมีทางสำรองวาดด้วยโค้ดเมื่อไม่มีภาพ
// ============================================================

const Flora = {
  cache: Object.create(null),
  TREE_H: { round: 212, pine: 244 }, // ความสูงต้นไม้ (พิกเซลโลก) — ตัวละคร ~66
  // สายพันธุ์ต้นไม้: ภาพต้นแบบ + ย้อมสี + ของประดับบนพุ่มใบ
  SPECIES: {
    round:   { img: 'prop_tree_round', sat: 1.12, bri: 1.03 },
    oak:     { img: 'prop_tree_round', hue: -8, sat: 1.15, bri: 0.8, wide: 1.14 },
    fruit:   { img: 'prop_tree_round', sat: 1.12, dots: 'fruit' },
    bloom:   { img: 'prop_tree_round', hue: 6, sat: 1.05, bri: 1.06, dots: 'bloom' },
    lime:    { img: 'prop_tree_round', hue: 16, sat: 1.1, bri: 1.1 },
    gold:    { img: 'prop_tree_round', hue: -38, sat: 1.25, bri: 1.08, dots: 'gold' },
    pine:    { img: 'prop_tree_pine', sat: 1.08, bri: 1.02, pine: 1 },
    pineDark:{ img: 'prop_tree_pine', hue: 10, sat: 1.05, bri: 0.8, pine: 1 },
    pineBlue:{ img: 'prop_tree_pine', hue: 24, sat: 0.9, bri: 0.95, pine: 1 },
    mossOak: { img: 'prop_tree_round', hue: 10, sat: 0.95, bri: 0.72, wide: 1.1 },
  },
  // ชุดพืชตามแผนที่: [สายพันธุ์, น้ำหนัก] • ขนาด • ความถี่ของประดับ • สีดอกไม้
  PRESET: {
    meadow: { trees: [['round', 5], ['fruit', 2], ['bloom', 2], ['oak', 2], ['gold', 1]], size: 1, deco: 1, patches: 1,
      warm: ['#ff8c2e', '#ffd23f', '#ff74a6', '#ef4a3c', '#ffffff'], hedge: 0 },
    lake: { trees: [['lime', 4], ['round', 3], ['bloom', 2], ['oak', 1]], size: 0.98, deco: 0.9, patches: 0.7,
      warm: ['#ffd23f', '#ffffff', '#ff9ec8', '#b88cff', '#ff8c2e'], hedge: 0.12 },
    forest: { trees: [['pine', 5], ['pineDark', 3], ['mossOak', 2], ['oak', 2], ['pineBlue', 1]], size: 1.04, deco: 1.1, patches: 0.6,
      warm: ['#ff8c2e', '#ffd23f', '#ff74a6', '#ffffff'], hedge: -0.12, dirt: 0.85 },
    arena: { trees: [['round', 3], ['oak', 2], ['gold', 1]], size: 0.9, deco: 0.6, patches: 1.2,
      warm: ['#ffd23f', '#ff8c2e', '#ef4a3c'], hedge: 0 },
    town: { trees: [['round', 3], ['bloom', 2], ['fruit', 1], ['lime', 1]], size: 0.7, deco: 0, patches: 0, warm: ['#ff74a6', '#ffd23f'], hedge: 0 },
  },
  preset(d) { return this.PRESET[d.flora || (d.kind === 'town' ? 'town' : d.pine ? 'forest' : 'meadow')] || this.PRESET.meadow; },
  pick(list, r) { let s = 0; for (const e of list) s += e[1]; r *= s; for (const e of list) { if ((r -= e[1]) < 0) return e[0]; } return list[0][0]; },
  canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; },

  // ------------------------------------------------------------
  //  หญ้าที่สงบลง: ลดลายเส้นถี่ของภาพหญ้า (เบลอด้วยย่อ-ขยาย ไม่พึ่ง ctx.filter) แล้วซ้อนรายละเอียดเดิมบางส่วน
  //  ใช้กับ ground_grass/2/3 ทุกที่ (พื้นที่อบ + หญ้าพลิ้วตามลม) — ต่อขอบลายได้เหมือนเดิม
  // ------------------------------------------------------------
  calm(img) {
    const S = img.width, q = 3, s = Math.ceil(S / q);
    const sm = this.canvas(s * 3, s * 3), sg = sm.getContext('2d');
    sg.imageSmoothingEnabled = true; sg.imageSmoothingQuality = 'high';
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) sg.drawImage(img, i * s, j * s, s, s);
    const c = this.canvas(S, img.height), g = c.getContext('2d');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(sm, s, s, s, s, 0, 0, S, img.height);
    g.globalAlpha = 0.45; g.drawImage(img, 0, 0);
    g.globalAlpha = 0.2; g.fillStyle = '#6cb43e'; g.fillRect(0, 0, S, img.height); // ลดคอนทราสต์ลาย + โทนเขียวสดสม่ำเสมอ
    g.globalAlpha = 1;
    c._calm = 1;
    return c;
  },

  // ------------------------------------------------------------
  //  ภาพต้นไม้ตามสายพันธุ์ (แคช)
  // ------------------------------------------------------------
  treeImg(sp) {
    const S = this.SPECIES[sp] || this.SPECIES.round;
    const src = typeof Art !== 'undefined' && Art.get(S.img);
    if (!src) return null;
    const key = 'tree:' + sp;
    const hit = this.cache[key];
    if (hit && hit.src0 === src) return hit;
    // ย้อมสีเฉพาะพุ่มใบ (ลำต้น/รากคงสีน้ำตาลเดิม): ภาพย้อมเต็ม × หน้ากากไล่จางจากยอดลงโคน วางทับภาพสีปกติ
    const c = Art.tint(src, { sat: 1.05 }), crown = Art.tint(src, { hue: S.hue || 0, sat: S.sat, bri: S.bri });
    {
      const g = crown.getContext('2d'), H = crown.height, a = S.pine ? 0.8 : 0.62, b = S.pine ? 0.9 : 0.76;
      const gr = g.createLinearGradient(0, H * a, 0, H * b); gr.addColorStop(0, '#000'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalCompositeOperation = 'destination-in'; g.fillStyle = gr; g.fillRect(0, 0, crown.width, H);
      c.getContext('2d').drawImage(crown, 0, 0);
    }
    if (S.dots) this.dots(c, S.dots, sp);
    c.src0 = src; c.pine = !!S.pine; c.wide = S.wide || 1;
    return (this.cache[key] = c);
  },
  // ผลไม้/ดอกบนพุ่มใบ: วาดเฉพาะส่วนที่มีภาพ (source-atop) และเฉพาะครึ่งบน (ไม่โดนลำต้น)
  dots(c, kind, sp) {
    const g = c.getContext('2d'), W = c.width, H = c.height;
    g.save(); g.globalCompositeOperation = 'source-atop';
    const n = kind === 'bloom' ? 34 : kind === 'gold' ? 16 : 14, k = W / 357;
    for (let i = 0; i < n; i++) {
      const a = U.hash2(i, 3, sp.length * 31), b = U.hash2(i, 7, sp.length * 17);
      const rr = Math.sqrt(a), ang = b * Math.PI * 2;
      const x = W * 0.5 + Math.cos(ang) * rr * W * 0.4, y = H * 0.34 + Math.sin(ang) * rr * H * 0.27;
      if (kind === 'fruit') {
        const r = (7 + U.hash2(i, 9, 5) * 3) * k, col = U.hash2(i, 11, 5) < 0.7 ? '#e8392f' : '#ff8a1c';
        g.fillStyle = 'rgba(40,20,10,0.55)'; g.beginPath(); g.arc(x + 1.5 * k, y + 2 * k, r + 1.6 * k, 0, 7); g.fill();
        g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.4, r * 0.3, 0, 7); g.fill();
        g.fillStyle = '#3d6a1e'; g.beginPath(); g.ellipse(x + r * 0.2, y - r, r * 0.45, r * 0.22, -0.5, 0, 7); g.fill();
      } else {
        const r = (kind === 'gold' ? 6 : 5 + U.hash2(i, 9, 6) * 3) * k;
        const cols = kind === 'gold' ? ['#ffe27a', '#ffb347'] : ['#ffc6dc', '#ffffff', '#ff9ec4', '#ffe0ec'];
        const col = cols[Math.floor(U.hash2(i, 13, 6) * cols.length)];
        g.fillStyle = 'rgba(60,30,40,0.35)'; g.beginPath(); g.arc(x + k, y + 1.5 * k, r * 1.35, 0, 7); g.fill();
        g.fillStyle = col;
        for (let p = 0; p < 5; p++) { const pa = p * 1.2566 + a * 6; g.beginPath(); g.arc(x + Math.cos(pa) * r * 0.62, y + Math.sin(pa) * r * 0.62, r * 0.55, 0, 7); g.fill(); }
        g.fillStyle = kind === 'gold' ? '#ff8a1c' : '#ffd23f'; g.beginPath(); g.arc(x, y, r * 0.32, 0, 7); g.fill();
      }
    }
    g.restore();
  },

  // ------------------------------------------------------------
  //  ของประดับ (แคชที่ความละเอียด ×2 ของขนาดโลก)
  // ------------------------------------------------------------
  SS: 2,
  sprite(k) {
    const art = typeof Art !== 'undefined' && Art.get('prop_bush');
    const key = k + (art ? '|A' : '|P'), hit = this.cache[key];
    if (hit) return hit;
    let c = null;
    const i0 = k.indexOf(':'), kind = i0 < 0 ? k : k.slice(0, i0), arg = i0 < 0 ? undefined : k.slice(i0 + 1); // arg อาจมี ':' (ดอกไม้ = สี:แบบ)
    if ((kind === 'bush' || kind === 'leafy') && art) c = this.recolorBush(art, kind === 'leafy' ? null : arg, kind === 'leafy' ? +arg || 0 : 0);
    if (!c) c = this.drawSprite(kind, arg);
    return (this.cache[key] = c);
  },
  // พุ่มดอกไม้: เปลี่ยนสีดอก (พิกเซลที่ไม่ใช่สีเขียว) เป็นสีอุ่นตามต้องการ • leafy: ดอก → ใบอ่อน (พุ่มใบล้วน)
  recolorBush(img, col, hueShift) {
    const W = img.width, H = img.height, c = this.canvas(W, H), g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    try {
      const id = g.getImageData(0, 0, W, H), d = id.data;
      const tc = col ? [parseInt(col.slice(1, 3), 16), parseInt(col.slice(3, 5), 16), parseInt(col.slice(5, 7), 16)] : null;
      const sh = hueShift || 0;
      for (let i = 0; i < d.length; i += 4) {
        if (!d[i + 3]) continue;
        const r = d[i], gg = d[i + 1], b = d[i + 2];
        const flower = r > gg - 6 && r > 120;
        if (flower) {
          const l = (r + gg + b) / 765;
          if (tc) {
            const k = 0.5 + l * 0.65, wh = Math.max(0, l - 0.9) * 4;
            d[i] = Math.min(255, tc[0] * k + 255 * wh); d[i + 1] = Math.min(255, tc[1] * k + 255 * wh); d[i + 2] = Math.min(255, tc[2] * k + 255 * wh);
          } else { d[i] = 120 * l + 40; d[i + 1] = 190 * l + 50; d[i + 2] = 60 * l + 20; }
        } else if (sh) {
          // พุ่มใบโทนเข้ม/อ่อน (ป่า/ทะเลสาบ)
          const k = 1 + sh; d[i] = Math.min(255, r * k); d[i + 1] = Math.min(255, gg * k); d[i + 2] = Math.min(255, b * k);
        }
      }
      g.putImageData(id, 0, 0);
    } catch (e) { /* อ่านพิกเซลไม่ได้ (file://) ใช้ภาพเดิม */ }
    return c;
  },
  // ของประดับวาดด้วยโค้ด: กรอบ = (w, h) พิกเซลโลก ฐานอยู่กึ่งกลางล่าง
  SIZE: { fern: [44, 40], tallgrass: [34, 30], flowers: [30, 26], stump: [34, 30], log: [56, 26], fence: [88, 40], bush: [52, 40], leafy: [52, 40], sprout: [26, 22] },
  drawSprite(kind, arg) {
    const [w, h] = this.SIZE[kind] || [40, 40], S = kind === 'flowers' ? 4 : this.SS, c = this.canvas(w * S, h * S), g = c.getContext('2d');
    g.scale(S, S); g.lineJoin = 'round'; g.lineCap = 'round';
    const OL = 'rgba(28,40,18,0.6)', cx = w / 2, by = h - 1;
    const leaf = (x, y, ang, len, wid, c1, c2) => {
      const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len, nx = -Math.sin(ang) * wid, ny = Math.cos(ang) * wid;
      const mx = (x + ex) / 2, my = (y + ey) / 2;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx + nx, my + ny, ex, ey); g.quadraticCurveTo(mx - nx, my - ny, x, y);
      g.fillStyle = c1; g.fill(); g.strokeStyle = OL; g.lineWidth = 0.9; g.stroke();
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx + nx * 0.5, my + ny * 0.5, ex, ey); g.quadraticCurveTo(mx, my, x, y); g.fillStyle = c2; g.fill();
    };
    const blossom = (x, y, r, col) => {
      g.fillStyle = 'rgba(40,20,20,0.35)'; g.beginPath(); g.arc(x + 0.6, y + 0.8, r * 1.3, 0, 7); g.fill();
      g.fillStyle = col; for (let p = 0; p < 5; p++) { const a = p * 1.2566 - 0.3; g.beginPath(); g.arc(x + Math.cos(a) * r * 0.65, y + Math.sin(a) * r * 0.65, r * 0.58, 0, 7); g.fill(); }
      g.fillStyle = col === '#ffd23f' ? '#ff8c2e' : '#ffd23f'; g.beginPath(); g.arc(x, y, r * 0.34, 0, 7); g.fill();
    };
    if (kind === 'fern' || kind === 'sprout') {
      const n = kind === 'fern' ? 9 : 5, L0 = kind === 'fern' ? 20 : 11;
      const dk = arg === 'dark' ? ['#2f6a2a', '#4d8f36'] : ['#3f8f2e', '#7cc443'];
      for (let i = 0; i < n; i++) {
        const k = i / (n - 1), ang = -Math.PI + 0.25 + k * (Math.PI - 0.5);
        const len = L0 * (0.75 + Math.sin(k * Math.PI) * 0.45);
        leaf(cx, by - 1, ang + (k - 0.5) * 0.1, len, len * 0.26, dk[0], dk[1]);
      }
    } else if (kind === 'tallgrass') {
      const cols = ['#3c8a2c', '#5aa836', '#7cc443'];
      for (let i = 0; i < 13; i++) {
        const x = cx + (U.hash2(i, 1, 9) - 0.5) * 18, hh = 14 + U.hash2(i, 2, 9) * 14, lean = (U.hash2(i, 3, 9) - 0.5) * 12;
        g.beginPath(); g.moveTo(x - 2, by); g.quadraticCurveTo(x + lean * 0.3, by - hh * 0.6, x + lean, by - hh); g.quadraticCurveTo(x + lean * 0.2 + 1.5, by - hh * 0.5, x + 2, by); g.closePath();
        g.fillStyle = cols[i % 3]; g.fill(); g.strokeStyle = OL; g.lineWidth = 0.6; g.stroke();
      }
      if (arg !== 'plain') for (let i = 0; i < 3; i++) { g.fillStyle = '#e9d27a'; g.beginPath(); g.ellipse(cx - 6 + i * 6, by - 22 - i * 2, 1.6, 3.4, 0.2, 0, 7); g.fill(); }
    } else if (kind === 'flowers') {
      // ดอกไม้ 6 พันธุ์ × ตำแหน่งดอกสุ่มตามเลขแบบ (arg = "สี:แบบ") → กอดอกไม้ในแมพหน้าตาไม่ซ้ำกัน
      // แสงสมจริง: แสงจากซ้ายบน • กลีบ 2 ชั้น (ชั้นหลังเข้ม) ไล่สีโคน→ปลาย มีเส้นกลีบ • เกสรเป็นเม็ด • เงาตกบนใบ/พื้น • ความละเอียด ×4
      const [col0, vs] = String(arg || '#ffd23f').split(':'), col = col0 || '#ffd23f', v = +vs || 0, sp = v % 6;
      const rn = (i, k) => U.hash2(i, k, 31 + v * 17);
      const MIX = ['#ffd23f', '#ff74a6', '#ffffff', '#b88cff', '#ff8c2e', '#7ac8f5'];
      const LA = -2.36; // ทิศแสง (ซ้ายบน)
      const tone = (c, k) => c === '#ffffff' && k < 0 ? U.shade('#d8dcea', k * 0.6) : U.shade(c, k);
      // เงาติดพื้นใต้กอ
      g.save(); g.translate(cx + 1.5, by - 1.2); g.scale(1, 0.28);
      const sh = g.createRadialGradient(0, 0, 1, 0, 0, 13); sh.addColorStop(0, 'rgba(18,32,8,0.5)'); sh.addColorStop(1, 'rgba(18,32,8,0)');
      g.fillStyle = sh; g.beginPath(); g.arc(0, 0, 13, 0, 7); g.fill(); g.restore();
      // ใบ: ไล่สีโคนเข้ม→ปลายสว่าง ซีกรับแสงอ่อนกว่า เส้นกลางใบ
      const leafR = (x, y, ang, len, wid) => {
        const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len, nx = -Math.sin(ang) * wid, ny = Math.cos(ang) * wid, mx = (x + ex) / 2, my = (y + ey) / 2;
        const gr = g.createLinearGradient(x, y, ex, ey); gr.addColorStop(0, '#24561f'); gr.addColorStop(0.55, '#3f8f2e'); gr.addColorStop(1, '#78c04a');
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx + nx, my + ny, ex, ey); g.quadraticCurveTo(mx - nx, my - ny, x, y);
        g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(20,40,12,0.55)'; g.lineWidth = 0.5; g.stroke();
        const lit = Math.cos(ang + Math.PI / 2 - LA) > 0 ? -1 : 1;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx + nx * lit, my + ny * lit, ex, ey); g.quadraticCurveTo(mx + nx * lit * 0.15, my + ny * lit * 0.15, x, y);
        g.fillStyle = 'rgba(190,240,140,0.28)'; g.fill();
        g.strokeStyle = 'rgba(200,240,160,0.55)'; g.lineWidth = 0.35; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx + nx * 0.12, my + ny * 0.12, ex, ey); g.stroke();
      };
      const nl = 3 + Math.floor(rn(0, 1) * 3);
      for (let i = 0; i < nl; i++) leafR(cx + (rn(i, 2) - 0.5) * 14, by, -Math.PI / 2 + (rn(i, 3) - 0.5) * 1.6, 8 + rn(i, 4) * 6, 2.6 + rn(i, 5));
      const stem = (x, y) => {
        g.strokeStyle = '#285a22'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(cx + x * 0.4, by); g.quadraticCurveTo(cx + x * 0.8, by + y * 0.5, cx + x, by + y); g.stroke();
        g.strokeStyle = 'rgba(150,210,110,0.7)'; g.lineWidth = 0.35; g.beginPath(); g.moveTo(cx + x * 0.4 - 0.35, by); g.quadraticCurveTo(cx + x * 0.8 - 0.35, by + y * 0.5, cx + x - 0.35, by + y); g.stroke();
      };
      // กลีบ: วงรีชี้ออกจากศูนย์กลาง (แบนเล็กน้อยตามมุมมอง) ไล่สีจากโคน
      const petal = (x, y, a, r, cIn, cOut, w = 0.36) => {
        const px = x + Math.cos(a) * r * 0.55, py = y + Math.sin(a) * r * 0.48;
        const gr = g.createRadialGradient(x, y, r * 0.1, x, y, r * 1.05); gr.addColorStop(0, cIn); gr.addColorStop(1, cOut);
        g.fillStyle = gr; g.beginPath(); g.ellipse(px, py, r * 0.56, r * w, a, 0, 7); g.fill();
      };
      const bloom = (x, y, r, c, n = 5) => {
        g.fillStyle = 'rgba(16,30,8,0.3)'; g.beginPath(); g.ellipse(x + r * 0.25, y + r * 0.45, r * 1.05, r * 0.6, 0, 0, 7); g.fill(); // เงาตกบนใบ
        const off = rn(Math.round(x * 7), Math.round(y * 5)) * 6;
        for (let p = 0; p < n; p++) petal(x, y, off + (p + 0.5) / n * 6.283, r * 0.95, tone(c, -0.5), tone(c, -0.2)); // ชั้นหลัง
        for (let p = 0; p < n; p++) {
          const a = off + p / n * 6.283, lit = Math.cos(a - LA);
          petal(x, y, a, r, tone(c, -0.3), tone(c, lit > 0 ? 0.12 + lit * 0.3 : -0.05 + lit * 0.12));
          if (r > 2.4) { // เส้นกลีบ
            g.strokeStyle = `rgba(60,20,40,${c === '#ffffff' ? 0.12 : 0.2})`; g.lineWidth = 0.25;
            g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.25, y + Math.sin(a) * r * 0.22); g.lineTo(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.74); g.stroke();
          }
        }
        // เกสร: จานไล่สี + เม็ดเกสร + ประกาย
        const cc = c === '#ffd23f' || c === '#ff8c2e' ? '#b8561a' : '#ffc928', cr = r * 0.32;
        const cg = g.createRadialGradient(x - cr * 0.35, y - cr * 0.4, cr * 0.1, x, y, cr); cg.addColorStop(0, U.shade(cc, 0.45)); cg.addColorStop(1, U.shade(cc, -0.35));
        g.fillStyle = cg; g.beginPath(); g.arc(x, y, cr, 0, 7); g.fill();
        if (r > 2.4) { g.fillStyle = 'rgba(90,40,10,0.55)'; for (let k = 0; k < 6; k++) { const a = k * 1.05 + off; g.beginPath(); g.arc(x + Math.cos(a) * cr * 0.6, y + Math.sin(a) * cr * 0.6, 0.22, 0, 7); g.fill(); } }
        g.fillStyle = 'rgba(255,255,240,0.85)'; g.beginPath(); g.arc(x - cr * 0.35, y - cr * 0.4, Math.max(0.3, cr * 0.22), 0, 7); g.fill();
      };
      const n = sp === 3 ? 1 : sp === 4 ? 7 : 3 + Math.floor(rn(0, 6) * 3);
      const pts = []; for (let i = 0; i < n; i++) pts.push(sp === 3 ? [(rn(i, 7) - 0.5) * 6, -14] : [(rn(i, 7) - 0.5) * 16, -(sp === 4 ? 4 + rn(i, 8) * 8 : sp === 2 ? 15 + rn(i, 8) * 3 : 7 + rn(i, 8) * 10)]); // อยู่ในกรอบ 30×26
      pts.sort((a, b) => a[1] - b[1]);
      pts.forEach(([x, y]) => stem(x, y));
      pts.forEach(([x, y], i) => {
        const X = cx + x, Y = by + y, c = sp === 5 ? MIX[Math.floor(rn(i, 9) * MIX.length)] : col;
        if (sp === 1) { // ทิวลิป: ถ้วยกลีบปลายแหลม ไล่สีโคนเข้ม ประกายด้านรับแสง
          g.fillStyle = 'rgba(16,30,8,0.3)'; g.beginPath(); g.ellipse(X + 1.2, Y + 1.5, 3.6, 1.6, 0, 0, 7); g.fill();
          const gr = g.createLinearGradient(X - 3.6, Y - 7, X + 3.6, Y + 1.5); gr.addColorStop(0, tone(c, 0.3)); gr.addColorStop(0.55, c); gr.addColorStop(1, tone(c, -0.45));
          g.fillStyle = gr; g.beginPath(); g.moveTo(X - 3.4, Y - 1); g.lineTo(X - 3.6, Y - 6); g.lineTo(X - 1.6, Y - 3.6); g.lineTo(X, Y - 7); g.lineTo(X + 1.6, Y - 3.6); g.lineTo(X + 3.6, Y - 6); g.lineTo(X + 3.4, Y - 1);
          g.quadraticCurveTo(X, Y + 2.4, X - 3.4, Y - 1); g.fill(); g.strokeStyle = 'rgba(60,15,20,0.4)'; g.lineWidth = 0.4; g.stroke();
          g.strokeStyle = tone(c, -0.4); g.lineWidth = 0.4; g.beginPath(); g.moveTo(X - 1.6, Y - 3.6); g.quadraticCurveTo(X - 1.2, Y - 1, X - 0.6, Y + 0.6); g.moveTo(X + 1.6, Y - 3.6); g.quadraticCurveTo(X + 1.2, Y - 1, X + 0.6, Y + 0.6); g.stroke();
          g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(X - 2.2, Y - 3, 0.6, 1.8, 0.15, 0, 7); g.fill();
        } else if (sp === 2) { // ลาเวนเดอร์: ช่อดอกตูมเรียงตามก้าน ล่างเข้ม บนสว่าง
          for (let k = 4; k >= 0; k--) {
            const bx = X + (k % 2 ? 1 : -1) * 1.2, byy = Y + k * 2.1, kk = 0.2 - k * 0.12;
            g.fillStyle = 'rgba(16,30,8,0.22)'; g.beginPath(); g.ellipse(bx + 0.6, byy + 0.9, 1.8, 1.2, 0, 0, 7); g.fill();
            const gr = g.createRadialGradient(bx - 0.6, byy - 0.6, 0.2, bx, byy, 2); gr.addColorStop(0, tone(c, Math.min(0.6, kk + 0.35))); gr.addColorStop(1, tone(c, kk - 0.3));
            g.fillStyle = gr; g.beginPath(); g.ellipse(bx, byy, 1.8, 1.45, 0, 0, 7); g.fill();
          }
          const gr = g.createRadialGradient(X - 0.5, Y - 1.8, 0.2, X, Y - 1, 2.3); gr.addColorStop(0, tone(c, 0.45)); gr.addColorStop(1, tone(c, -0.15));
          g.fillStyle = gr; g.beginPath(); g.ellipse(X, Y - 1, 1.5, 2.2, 0, 0, 7); g.fill();
        } else if (sp === 3) { // ดอกใหญ่ดอกเดียว + ตูม
          bloom(X - 7, Y + 7, 2.2, c); bloom(X + 7, Y + 6, 2, '#ffffff'); bloom(X, Y, 5.4, c, 7);
        } else if (sp === 4) { // ดอกจิ๋วกระจาย (โคลเวอร์/ดอกหญ้า)
          bloom(X, Y, 1.9 + rn(i, 10), i % 3 ? c : '#ffffff');
        } else bloom(X, Y, 3.3 + rn(i, 11) * 1.6, i === n - 1 && sp !== 5 ? '#ffffff' : c, sp === 0 ? 8 : 5); // เดซี่ (กลีบ 8) / กอผสมสี
      });
    } else if (kind === 'stump') {
      const top = by - 15;
      // ราก
      g.fillStyle = '#5a3418';
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 8, by - 6); g.quadraticCurveTo(cx + s * 15, by - 2, cx + s * 16, by); g.lineTo(cx + s * 7, by); g.closePath(); g.fill(); g.strokeStyle = OL; g.lineWidth = 0.9; g.stroke(); }
      const gr = g.createLinearGradient(cx - 11, 0, cx + 11, 0); gr.addColorStop(0, '#8a5a30'); gr.addColorStop(0.5, '#74461f'); gr.addColorStop(1, '#4e2e14');
      g.fillStyle = gr; g.beginPath(); g.moveTo(cx - 11, top); g.lineTo(cx - 12, by - 2); g.quadraticCurveTo(cx, by + 1.5, cx + 12, by - 2); g.lineTo(cx + 11, top); g.closePath(); g.fill();
      g.strokeStyle = OL; g.lineWidth = 1; g.stroke();
      g.strokeStyle = 'rgba(40,20,8,0.45)'; g.lineWidth = 0.8;
      for (const x of [-6, -1, 5]) { g.beginPath(); g.moveTo(cx + x, top + 4); g.lineTo(cx + x + 0.5, by - 2); g.stroke(); }
      g.fillStyle = '#d9a866'; g.beginPath(); g.ellipse(cx, top, 11, 4.4, 0, 0, 7); g.fill(); g.strokeStyle = OL; g.stroke();
      g.strokeStyle = 'rgba(150,95,45,0.8)'; g.lineWidth = 0.7;
      for (const r of [7, 4, 1.6]) { g.beginPath(); g.ellipse(cx, top, r, r * 0.4, 0, 0, 7); g.stroke(); }
      g.fillStyle = '#5aa836'; g.beginPath(); g.ellipse(cx - 9, by - 4, 4, 2.4, 0.3, 0, 7); g.fill();
      leaf(cx + 9, top + 2, -1.2, 9, 2.6, '#3f8f2e', '#7cc443');
    } else if (kind === 'log') {
      const y0 = by - 15, x0 = cx - 24, x1 = cx + 19;
      g.fillStyle = 'rgba(0,0,0,0)';
      const gr = g.createLinearGradient(0, y0, 0, by); gr.addColorStop(0, '#94622f'); gr.addColorStop(1, '#4e2e14');
      g.fillStyle = gr; g.beginPath(); g.moveTo(x0, y0 + 2); g.lineTo(x1, y0); g.lineTo(x1, by - 1); g.lineTo(x0, by - 0.5); g.quadraticCurveTo(x0 - 5, by - 8, x0, y0 + 2); g.closePath(); g.fill();
      g.strokeStyle = OL; g.lineWidth = 1; g.stroke();
      g.strokeStyle = 'rgba(40,20,8,0.4)'; g.lineWidth = 0.8;
      for (const yy of [y0 + 5, y0 + 10]) { g.beginPath(); g.moveTo(x0 + 2, yy); g.lineTo(x1 - 3, yy - 1); g.stroke(); }
      g.fillStyle = '#d9a866'; g.beginPath(); g.ellipse(x1, (y0 + by) / 2 - 0.5, 4.5, 7.5, 0, 0, 7); g.fill(); g.strokeStyle = OL; g.stroke();
      g.strokeStyle = 'rgba(150,95,45,0.8)'; g.lineWidth = 0.7; g.beginPath(); g.ellipse(x1, (y0 + by) / 2 - 0.5, 2.4, 4.2, 0, 0, 7); g.stroke();
      leaf(x0 + 10, y0 + 1, -1.9, 9, 2.6, '#3f8f2e', '#7cc443'); leaf(x0 + 12, y0 + 1, -1.1, 7, 2.2, '#3f8f2e', '#7cc443');
      g.fillStyle = '#5aa836'; g.beginPath(); g.ellipse(x0 + 22, y0 + 1, 6, 2, 0, 0, 7); g.fill();
    } else if (kind === 'fence') {
      const posts = [6, cx, w - 6], top = by - 30;
      const plank = (y) => {
        const gr = g.createLinearGradient(0, y, 0, y + 6); gr.addColorStop(0, '#c98d4e'); gr.addColorStop(1, '#94602e');
        g.fillStyle = gr; g.beginPath(); g.moveTo(2, y + 0.5); g.lineTo(w - 2, y - 0.5); g.lineTo(w - 2, y + 5.5); g.lineTo(2, y + 6.5); g.closePath(); g.fill();
        g.strokeStyle = OL; g.lineWidth = 0.9; g.stroke();
      };
      plank(top + 8); plank(top + 19);
      for (const x of posts) {
        const gr = g.createLinearGradient(x - 4, 0, x + 4, 0); gr.addColorStop(0, '#b47a40'); gr.addColorStop(1, '#6e4520');
        g.fillStyle = gr; g.beginPath(); g.moveTo(x - 4, by); g.lineTo(x - 4, top + 3); g.lineTo(x, top - 1); g.lineTo(x + 4, top + 3); g.lineTo(x + 4, by); g.closePath(); g.fill();
        g.strokeStyle = OL; g.lineWidth = 1; g.stroke();
        g.fillStyle = 'rgba(255,230,180,0.35)'; g.fillRect(x - 3, top + 3, 1.5, by - top - 4);
        g.fillStyle = '#4a4a4a'; g.beginPath(); g.arc(x, top + 11, 0.9, 0, 7); g.arc(x, top + 22, 0.9, 0, 7); g.fill();
      }
      leaf(posts[0] + 1, by, -1.9, 8, 2.4, '#3f8f2e', '#7cc443'); leaf(posts[2] - 1, by, -1.2, 9, 2.6, '#3f8f2e', '#7cc443');
    } else { // พุ่มไม้วาดเอง (ไม่มีภาพ prop_bush)
      const col = arg && arg[0] === '#' ? arg : null;
      const blobs = [[-13, -8, 10], [13, -8, 10], [0, -12, 13], [-6, -20, 9], [7, -21, 9]];
      for (const [ox, oy, r] of blobs) { g.fillStyle = '#2f6a2a'; g.beginPath(); g.arc(cx + ox, by + oy + 2, r, 0, 7); g.fill(); }
      for (const [ox, oy, r] of blobs) { g.fillStyle = '#4d9a36'; g.beginPath(); g.arc(cx + ox - 1, by + oy, r * 0.85, 0, 7); g.fill(); }
      for (const [ox, oy, r] of blobs) { g.fillStyle = '#7cc443'; g.beginPath(); g.arc(cx + ox - 3, by + oy - 3, r * 0.4, 0, 7); g.fill(); }
      if (col) for (let i = 0; i < 9; i++) blossom(cx + (U.hash2(i, 1, 3) - 0.5) * 34, by - 6 - U.hash2(i, 2, 3) * 22, 3.4, col);
    }
    return c;
  },

  // ------------------------------------------------------------
  //  วางต้นไม้ + ของประดับ (เรียกจาก GameMap.collectObjects)
  // ------------------------------------------------------------
  plan(m) {
    const d = m.def, P = this.preset(d), W = m.w, Hh = m.h, seed = d.seed;
    const hh = (x, y, k) => U.hash2(x, y, seed * 13 + k * 7919 + 777);
    const town = d.kind === 'town';
    m.objects = []; m.flora = [];
    const isTree = (x, y) => m.tile(x, y) === T.TREE;
    // ยอดไม้ที่จะบังวาร์ป/NPC (ต้นที่อยู่ใต้ลงมาไม่กี่แถว) → เป็นพุ่มเตี้ยแทน
    const keep = [...m.portals.map(p => ({ x: p.x, y: p.y, r: 3 })), ...(d.npcs || []).map(n => ({ x: n.x, y: n.y, r: 2 }))];
    const shaded = (x, y) => keep.some(k => Math.abs(k.x - x) <= k.r && y - k.y >= -1 && y - k.y <= (town ? 5 : 7));
    const tiles = [];
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) if (isTree(x, y)) {
      let nb = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && isTree(x + dx, y + dy)) nb++;
      tiles.push({ x, y, nb, r: hh(x, y, 1) });
    }
    tiles.sort((a, b) => (a.nb === 0) - (b.nb === 0) ? (b.nb === 0) - (a.nb === 0) : a.r - b.r);
    const anchor = new Uint8Array(W * Hh), spacing = town ? 1.5 : 2.15;
    const near = (x, y) => {
      for (let yy = y - 2; yy <= y + 2; yy++) for (let xx = x - 2; xx <= x + 2; xx++)
        if (xx >= 0 && yy >= 0 && xx < W && yy < Hh && anchor[yy * W + xx] && Math.hypot(xx - x, (yy - y) * 1.15) < spacing) return true;
      return false;
    };
    for (const tl of tiles) {
      const { x, y } = tl, r = hh(x, y, 2), r2 = hh(x, y, 3);
      if (!shaded(x, y) && (tl.nb === 0 || !near(x, y))) {
        anchor[y * W + x] = 1;
        const sw = m.seamWeight && m.seamWeight(x, y); // ใกล้ขอบที่ติดทุ่งอื่น: พันธุ์ไม้ของฝั่งโน้นปนเข้ามา (รอยต่อไม่ตัดฉับ)
        const sp = this.pick(sw && hh(x, y, 4) < sw.w * 0.7 ? this.preset(sw.def).trees : P.trees, r);
        const edgeLow = !town && y >= Hh - 2; // ขอบล่างสุด: ต้นเตี้ยลงหน่อย ไม่บังพื้นที่ล่ามากเกินไป
        m.objects.push({ kind: 'tree', sp, x: x + 0.5 + (r2 - 0.5) * 0.24, y: y + 0.5, size: P.size * (0.86 + r2 * 0.3) * (edgeLow ? 0.82 : 1), flip: r < 0.5 === (r2 < 0.5), r, fa: 1 });
      } else {
        m.objects.push({ kind: 'hedge', x: x + 0.5 + (r - 0.5) * 0.3, y: y + 0.5, size: 1.05 + r2 * 0.4, flip: r2 < 0.5, r, fa: 1, k: 'leafy:' + (P.hedge + (r - 0.5) * 0.16).toFixed(2) });
      }
    }
    m.objects.sort((a, b) => a.y - b.y);
    if (P.deco > 0) this.placeDecor(m, P, hh, anchor);
  },
  placeDecor(m, P, hh, anchor) {
    const d = m.def, W = m.w, Hh = m.h, cx = W >> 1, cy = Hh >> 1;
    const used = new Uint8Array(W * Hh);
    const avoid = [...m.portals.map(p => [p.x, p.y, 4]), ...(d.npcs || []).map(n => [n.x, n.y, 3]), ...(d.dummies || []).map(q => [q[0], q[1], 2]), [cx, cy, 5.5]];
    const free = (x, y) => {
      if (x < 2 || y < 2 || x >= W - 2 || y >= Hh - 2 || used[y * W + x]) return false;
      const t = m.tile(x, y);
      if (t !== T.GRASS && t !== T.FLOWER) return false;
      return !avoid.some(([ax, ay, r]) => Math.hypot(ax - x, ay - y) < r);
    };
    const add = (k, x, y, s, jx = 0.5, jy = 0.5) => {
      used[y * W + x] = 1;
      const r = hh(x, y, 9);
      m.flora.push({ k, x: x + 0.15 + jx * 0.7, y: y + 0.25 + jy * 0.6, s, flip: r < 0.5, r, sway: /^(bush|leafy|fern|tallgrass|flowers|sprout)/.test(k) });
    };
    const warm = () => P.warm;
    const pickDecor = (r, r2) => {
      const wc = warm(), col = wc[Math.floor(r2 * wc.length) % wc.length];
      if (r < 0.34) return ['bush:' + col, 0.85 + r2 * 0.35];
      if (r < 0.5) return ['leafy:' + (P.hedge + 0.06).toFixed(2), 0.85 + r2 * 0.3];
      if (r < 0.64) return ['fern' + (P.hedge < 0 ? ':dark' : ''), 0.85 + r2 * 0.3];
      if (r < 0.76) return ['tallgrass', 0.9 + r2 * 0.3];
      if (r < 0.88) return ['flowers:' + col + ':' + (Math.floor(r2 * 1000) % 24), 0.9 + r2 * 0.25];
      if (r < 0.95) return ['stump', 0.9 + r2 * 0.2];
      return ['log', 0.9 + r2 * 0.2];
    };
    // 1) แนวขอบป่า: ช่องเดินได้ที่ติดกับช่องต้นไม้ → กลุ่มพุ่มไม้/ดอกไม้
    const dens = 0.2 * P.deco;
    for (let y = 2; y < Hh - 2; y++) for (let x = 2; x < W - 2; x++) {
      if (!free(x, y)) continue;
      let adj = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (m.tile(x + dx, y + dy) === T.TREE) adj++;
      if (!adj) continue;
      // ต้นไม้เดี่ยวกลางทุ่ง: ประดับรอบโคนน้อยลง
      const lone = adj === 1 && !(x <= 3 || y <= 3 || x >= W - 4 || y >= Hh - 4);
      if (hh(x, y, 4) < (lone ? dens * 0.9 : dens)) { const [k, s] = pickDecor(hh(x, y, 5), hh(x, y, 6)); add(k, x, y, s, hh(x, y, 7), hh(x, y, 8)); }
    }
    // 2) รั้วไม้สั้น ๆ แนวขอบบน/ล่าง (ช่วงละ 2-3 ช่อง)
    for (const y of [2, 3, Hh - 3]) for (let x = 3; x < W - 5; x++) {
      if (hh(x, y, 11) > 0.035 * P.deco) continue;
      const n = 2 + (hh(x, y, 12) < 0.5 ? 1 : 0);
      let ok = true; for (let i = 0; i < n; i++) if (!free(x + i, y)) ok = false;
      if (!ok) continue;
      for (let i = 0; i < n; i++) { used[y * W + x + i] = 1; m.flora.push({ k: 'fence', x: x + i + 0.5 + 0.5, y: y + 0.55, s: 1, flip: false, r: 0.5 }); }
      // ดอกไม้/พุ่มเล็กเกาะรั้ว
      if (free(x - 1, y)) add('bush:' + P.warm[Math.floor(hh(x, y, 13) * P.warm.length)], x - 1, y, 0.8, 0.8, 0.6);
      x += n + 2;
    }
    // 3) กลางทุ่ง: ดอกไม้ป่า/หญ้าสูงประปราย (เว้นที่โล่งไว้ล่ามอน)
    for (let y = 3; y < Hh - 3; y++) for (let x = 3; x < W - 3; x++) {
      if (!free(x, y) || hh(x, y, 14) > 0.016 * P.deco) continue;
      const r = hh(x, y, 15), col = P.warm[Math.floor(hh(x, y, 16) * P.warm.length)];
      add(r < 0.45 ? 'flowers:' + col + ':' + Math.floor(hh(x, y, 19) * 24) : r < 0.8 ? 'tallgrass' : 'sprout', x, y, 0.85 + r * 0.3, hh(x, y, 17), hh(x, y, 18));
    }
  },

  // ------------------------------------------------------------
  //  อบลงพื้น: หย่อมดิน • เงาต้นไม้/ของประดับ • หญ้ากระจุก ต้นอ่อน ดอกไม้จิ๋ว กรวด
  // ------------------------------------------------------------
  bake(m, g) {
    const d = m.def, P = this.preset(d), seed = d.seed, W = m.w, Hh = m.h, k = typeof R !== 'undefined' && R.K ? R.K : 0.76;
    const hh = (x, y, i) => U.hash2(x, y, seed * 31 + i * 4099 + 4242);
    const cls = (x, y) => m.terrainClass(m.tile(x, y));
    // ---- หย่อมดินขอบหยัก ----
    if (P.patches > 0 && d.kind !== 'cave') {
      const tex = typeof Art !== 'undefined' && Art.get('ground_dirt');
      let pat = null;
      if (tex) { const pc = this.canvas(288, 288); pc.getContext('2d').drawImage(tex, 0, 0, 288, 288); pat = g.createPattern(pc, 'repeat'); }
      const n = Math.round(W * Hh / 110 * P.patches);
      const rnd = U.seeded(seed * 7 + 3), placed = [];
      for (let i = 0, tries = 0; i < n && tries < n * 8; tries++) {
        const tx = 3 + Math.floor(rnd() * (W - 6)), ty = 3 + Math.floor(rnd() * (Hh - 6)), R0 = 0.9 + rnd() * 1.5;
        let ok = true;
        for (let yy = Math.floor(ty - R0 - 1); yy <= ty + R0 + 1 && ok; yy++) for (let xx = Math.floor(tx - R0 - 1); xx <= tx + R0 + 1; xx++) {
          const c = cls(xx, yy); if (c === 'water' || c === 'stone' || c === 'dirt' || m.tile(xx, yy) === T.HOUSE) { ok = false; break; }
        }
        if (!ok || m.portals.some(p => Math.hypot(p.x - tx, p.y - ty) < 2.5) || placed.some(q => Math.hypot(q[0] - tx, q[1] - ty) < q[2] + R0 + 1.2)) continue;
        i++; placed.push([tx, ty, R0]);
        this.patch(g, (tx + 0.5) * TILE, (ty + 0.5) * TILE, R0 * TILE, R0 * TILE * (0.8 + rnd() * 0.5) / k * 0.76, rnd, pat, P.dirt || 1);
      }
    }
    // ---- เงาใต้ต้นไม้/ของประดับ (คงที่ → อบลงพื้น) ----
    for (const o of m.objects) {
      const big = o.kind === 'tree', img = big && this.treeImg(o.sp), pine = img ? img.pine : (o.sp || '').startsWith('pine');
      const Ht = big ? (pine ? this.TREE_H.pine : this.TREE_H.round) * o.size : 40 * o.size;
      const rx = big ? Ht * (pine ? 0.25 : 0.4) * (img ? img.wide : 1) : 22 * o.size, ry = rx * 0.42 / k * 0.76;
      const x = o.x * TILE + (big ? 10 : 3), y = (o.y + 0.32) * TILE;
      const gr = g.createRadialGradient(x, y, 1, x, y, rx);
      gr.addColorStop(0, `rgba(20,40,10,${big ? 0.42 : 0.3})`); gr.addColorStop(0.65, `rgba(20,40,10,${big ? 0.22 : 0.14})`); gr.addColorStop(1, 'rgba(20,40,10,0)');
      g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y);
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rx, 0, 7); g.fill(); g.restore();
    }
    for (const o of m.flora || []) {
      const [w] = this.SIZE[o.k.split(':')[0]] || [40], rx = w * 0.42 * o.s, x = o.x * TILE + 2, y = o.y * TILE;
      g.fillStyle = 'rgba(20,40,10,0.24)'; g.beginPath(); g.ellipse(x, y, rx, rx * 0.36, 0, 0, 7); g.fill();
    }
    // ---- รายละเอียดพื้นจิ๋ว (หนาแน่นแต่เบา) ----
    const grassBase = d.grass || '#6fae4a';
    const dk = U.shade(grassBase, -0.22), lt = U.shade(grassBase, 0.3), lt2 = U.shade(grassBase, 0.5);
    const tiny = P.warm.concat(['#ffffff', '#ffffff']);
    const tuft = (x, y, s) => {
      g.fillStyle = dk;
      g.beginPath();
      for (let i = -2; i <= 2; i++) { const hgt = (6 + (2 - Math.abs(i)) * 2.4) * s / k, bx = x + i * 2 * s; g.moveTo(bx - 1.3 * s, y); g.quadraticCurveTo(bx + i * 0.8 * s, y - hgt * 0.6, bx + i * 1.8 * s, y - hgt); g.quadraticCurveTo(bx + i * 0.4 * s + 0.6, y - hgt * 0.4, bx + 1.3 * s, y); }
      g.fill();
      g.fillStyle = lt;
      g.beginPath();
      for (let i = -1; i <= 1; i++) { const hgt = (5 + (1 - Math.abs(i)) * 2) * s / k, bx = x + i * 2 * s + 0.6; g.moveTo(bx - 0.8 * s, y - 0.5); g.quadraticCurveTo(bx + i * 0.6 * s, y - hgt * 0.6, bx + i * 1.4 * s, y - hgt); g.quadraticCurveTo(bx + 0.3, y - hgt * 0.4, bx + 0.8 * s, y - 0.5); }
      g.fill();
    };
    const sprout = (x, y, s) => {
      g.strokeStyle = dk; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 4 * s / k); g.stroke();
      for (const sd of [-1, 1]) { g.fillStyle = sd < 0 ? lt : lt2; g.beginPath(); g.ellipse(x + sd * 3 * s, y - 5 * s / k, 3.2 * s, 1.7 * s / k, sd * 0.5, 0, 7); g.fill(); }
    };
    const flower = (x, y, col, s) => {
      g.fillStyle = 'rgba(30,60,20,0.35)'; g.beginPath(); g.ellipse(x + 0.6, y + 1, 2.6 * s, 1.4 * s, 0, 0, 7); g.fill();
      g.fillStyle = col; for (let p = 0; p < 4; p++) { const a = p * 1.5708 + 0.4; g.beginPath(); g.ellipse(x + Math.cos(a) * 1.5 * s, y + Math.sin(a) * 1.5 * s / k * 0.8, 1.35 * s, 1.35 * s / k * 0.8, 0, 0, 7); g.fill(); }
      g.fillStyle = col === '#ffd23f' ? '#ff8c2e' : '#ffd23f'; g.beginPath(); g.arc(x, y, 0.9 * s, 0, 7); g.fill();
    };
    const pebble = (x, y, s) => {
      g.fillStyle = 'rgba(40,40,30,0.3)'; g.beginPath(); g.ellipse(x + 0.8, y + 1, 3.2 * s, 1.8 * s / k * 0.76, 0, 0, 7); g.fill();
      g.fillStyle = '#a9a294'; g.beginPath(); g.ellipse(x, y, 3 * s, 2 * s / k * 0.76, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(x - 0.8 * s, y - 0.7 * s, 1.3 * s, 0.7 * s, 0, 0, 7); g.fill();
    };
    if (d.kind === 'cave') return;
    // ดอกไม้จิ๋วขึ้นเป็นดง (ทุ่งดอกไม้เป็นหย่อม) แทนการโรยเท่ากันทั้งแมพ
    const fz = (x, y) => { const n = U.fbm(x / 6, y / 6, seed + 505, 2); return Math.min(1, Math.max(0, (n - 0.52) * 5)); };
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      const t = m.tile(x, y), c = cls(x, y), px = x * TILE, py = y * TILE;
      if (t === T.HOUSE || c === 'water' || c === 'stone') continue;
      if (c === 'dirt') { if (hh(x, y, 1) < 0.22) pebble(px + hh(x, y, 2) * TILE, py + hh(x, y, 3) * TILE, 0.7 + hh(x, y, 4) * 0.6); continue; }
      const n = d.kind === 'town' ? 1 : 2 + (t === T.FLOWER ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const r = hh(x, y, 10 + i), ox = px + 4 + hh(x, y, 20 + i) * (TILE - 8), oy = py + 6 + hh(x, y, 30 + i) * (TILE - 8), s = 0.8 + hh(x, y, 40 + i) * 0.5;
        if (r < 0.24) tuft(ox, oy, s);
        else if (r < 0.24 + 0.16 * fz(x + 40, y + 40)) sprout(ox, oy, s);
        else if (r < 0.4 + 0.015 + 0.17 * fz(x, y) || t === T.FLOWER && r < 0.75) { const col = tiny[Math.floor(hh(x, y, 50 + i) * tiny.length)]; flower(ox, oy, col, s); if (r < 0.44) flower(ox + 5, oy + 2, col, s * 0.85); }
        else if (r < 0.515) pebble(ox, oy, s * 0.8);
      }
    }
  },
  // หย่อมดินทรงหยัก ขอบนุ่ม: วงแหวนเข้มบาง ๆ → ผิวดิน → ไฮไลต์ด้านใน → หญ้าแซมขอบ
  patch(g, x, y, rx, ry, rnd, pat, tone) {
    const N = 30, ph = [rnd() * 6, rnd() * 6, rnd() * 6], pts = [];
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2;
      const k = 1 + 0.16 * Math.sin(a * 2 + ph[0]) + 0.1 * Math.sin(a * 3 + ph[1]) + 0.07 * Math.sin(a * 5 + ph[2]) + (rnd() - 0.5) * 0.12;
      pts.push([Math.cos(a) * rx * k, Math.sin(a) * ry * k]);
    }
    const path = (s, ox = 0, oy = 0) => {
      g.beginPath();
      for (let i = 0; i <= N; i++) {
        const p = pts[i % N], q = pts[(i + 1) % N], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
        if (!i) g.moveTo(x + ox + mx * s, y + oy + my * s); else g.quadraticCurveTo(x + ox + p[0] * s, y + oy + p[1] * s, x + ox + mx * s, y + oy + my * s);
      }
      g.closePath();
    };
    g.save();
    g.fillStyle = 'rgba(70,90,30,0.22)'; path(1.1); g.fill();
    g.fillStyle = 'rgba(110,80,40,0.35)'; path(1.03, 0, 2); g.fill();
    g.fillStyle = pat || '#b98a55'; path(1); g.fill();
    if (tone !== 1) { g.fillStyle = `rgba(40,30,20,${(1 - tone) * 1.2})`; path(1); g.fill(); }
    g.fillStyle = 'rgba(255,225,160,0.16)'; path(0.62, -rx * 0.08, -ry * 0.1); g.fill();
    // มิติ: ขอบบนเป็นตลิ่งหญ้าทอดเงาลงหลุมดิน • ขอบล่างรับแสง
    g.save(); path(1); g.clip();
    const sh = g.createLinearGradient(0, y - ry * 1.25, 0, y - ry * 0.35);
    sh.addColorStop(0, 'rgba(50,30,10,0.55)'); sh.addColorStop(1, 'rgba(50,30,10,0)');
    g.fillStyle = sh; g.fillRect(x - rx * 1.4, y - ry * 1.4, rx * 2.8, ry * 1.1);
    const lt = g.createLinearGradient(0, y + ry * 1.2, 0, y + ry * 0.6);
    lt.addColorStop(0, 'rgba(255,230,180,0.28)'); lt.addColorStop(1, 'rgba(255,230,180,0)');
    g.fillStyle = lt; g.fillRect(x - rx * 1.4, y + ry * 0.55, rx * 2.8, ry * 0.9);
    g.restore();
    g.strokeStyle = 'rgba(80,55,25,0.35)'; g.lineWidth = 1.5; path(1); g.stroke();
    g.restore();
  },

  // ------------------------------------------------------------
  //  วาดต่อเฟรม (เรียกจาก render.js): ใส่ลงรายการเรียงความลึกเดียวกับตัวละคร
  // ------------------------------------------------------------
  collect(list, g, m, t, L, Rr, Tp, B) {
    this.frame(t);
    for (const o of m.objects) if (o.x > L - 2 && o.x < Rr + 2 && o.y > Tp && o.y < B + 5) list.push({ y: o.y + 0.3, f: () => this.drawObj(g, o, t) });
    for (const o of m.flora) if (o.x > L && o.x < Rr && o.y > Tp && o.y < B + 1) list.push({ y: o.y, f: () => this.drawDecor(g, o, t) });
  },
  // ตัวละครที่ต้องมองเห็นผ่านยอดไม้: ผู้เล่น + เป้าหมายที่เล็งอยู่
  frame(t) {
    this.dt = Math.min(0.2, Math.max(0, t - (this.lt || 0))); this.lt = t;
    const K = typeof R !== 'undefined' ? R.K : 0.76, out = (this.seen = this.seen || []);
    out.length = 0;
    if (typeof G === 'undefined' || !G.player) return;
    const p = G.player;
    out.push(p.x * TILE, p.y * TILE * K, p.y);
    if (p.target && !p.target.dead && p.target.x != null) out.push(p.target.x * TILE, p.target.y * TILE * K, p.target.y);
  },
  drawObj(g, o, t) {
    if (o.kind === 'hedge') { this.drawDecor(g, { k: o.k, x: o.x, y: o.y + 0.3, s: o.size, flip: o.flip, r: o.r, sway: true }, t); return; }
    const img = this.treeImg(o.sp);
    if (!img) { // ไม่มีภาพ: ต้นไม้วาดด้วยโค้ดขนาดใหญ่ขึ้น
      if (typeof Sprites !== 'undefined') Sprites.drawTree(g, { kind: (o.sp || '').startsWith('pine') ? 'pine' : 'tree', x: o.x, y: o.y, size: o.size * 1.8, hue: '#3f8a3a', r: o.r }, t);
      return;
    }
    const H = (img.pine ? this.TREE_H.pine : this.TREE_H.round) * o.size, Wd = H * img.width / img.height * img.wide;
    const x = o.x * TILE, by = (o.y + 0.35) * TILE;
    // ยอดไม้บังผู้เล่น/เป้าหมาย → จางลง (ตัวที่อยู่หลังต้นไม้ = y น้อยกว่า)
    let target = 1;
    const K = R.K, sy = by * K, s = this.seen;
    for (let i = 0; i < s.length; i += 3) {
      if (s[i + 2] >= o.y + 0.3) continue;
      const dx = Math.abs(s[i] - x), cy = s[i + 1];
      if (dx < Wd * 0.4 + 12 && cy > sy - H * 0.98 + 20 && cy - 56 < sy - H * 0.22) { target = 0.42; break; }
    }
    o.fa += (target - o.fa) * Math.min(1, this.dt * 9);
    g.save(); g.translate(x, by);
    if (o.fa < 0.995) g.globalAlpha *= o.fa;
    const sway = Math.sin(t * 1.1 + o.r * 10) * (img.pine ? 0.016 : 0.012);
    g.transform(1, 0, sway, 1, 0, 0);
    if (o.flip) g.scale(-1, 1);
    g.drawImage(img, -Wd / 2, -H, Wd, H);
    g.restore();
  },
  drawDecor(g, o, t) {
    const img = this.sprite(o.k), kind = o.k.split(':')[0];
    let w, h;
    if ((kind === 'bush' || kind === 'leafy') && img.width === 320) { h = 40 * o.s; w = h * img.width / img.height; }
    else { const sz = this.SIZE[kind] || [40, 40]; w = sz[0] * o.s; h = sz[1] * o.s; }
    const x = o.x * TILE, y = o.y * TILE;
    g.save(); g.translate(x, y);
    if (o.sway) g.transform(1, 0, Math.sin(t * 1.3 + o.r * 10) * 0.03, 1, 0, 0);
    if (o.flip) g.scale(-1, 1);
    g.drawImage(img, -w / 2, -h, w, h);
    g.restore();
  },
};

// หญ้าที่สงบลง: แทนที่ภาพ ground_grass* ทันทีที่โหลด (ก่อน Art.onLoad สั่งวาดพื้นใหม่)
if (typeof Art !== 'undefined') {
  const onLoad0 = Art.onLoad;
  Art.onLoad = function (k) {
    if (/^ground_grass\d?$/.test(k) && this.imgs[k] && !this.imgs[k]._calm) { try { this.imgs[k] = Flora.calm(this.imgs[k]); } catch (e) { /* ใช้ภาพเดิม */ } }
    return onLoad0.call(this, k);
  };
}
