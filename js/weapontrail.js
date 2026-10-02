'use strict';
// ============================================================
//  เส้นแสงฟันตามวงอาวุธ (ท่าโจมตี) — วาดเองจากตำแหน่งปลายอาวุธในแต่ละเฟรม ไม่ต้องมีภาพเอฟเฟกต์
//  ห่อ Paperdoll.layers: ท่า attack วาดแสงโค้งผ่านปลายอาวุธของเฟรมก่อนหน้า → เฟรมนี้ (ทับตัว ใต้อาวุธ)
//  สีตามอาวุธประจำ Class • ปิด: WeaponTrail.ON = false
// ============================================================

const WeaponTrail = {
  ON: true,
  COLOR: { einherjar: '255,90,70', runecaster: '110,200,255', wildhunter: '140,255,120', volva: '255,215,110', trickster: '200,120,255', berserker: '255,150,50' },
  ACTS: { attack: 1 },
  MIN_MOVE: 18, // ปลายอาวุธต้องเคลื่อนเกินนี้ (px) ถึงนับว่าเป็นจังหวะเหวี่ยง
  WIDTH: 20,
  EXTEND: 0.45, // ยืดหางย้อนหลัง (สัดส่วนของมุมที่กวาดในเฟรม)    // ความหนาของแสง (px ในช่อง 240)

  // มือ + มุมอาวุธ + ระยะถึงปลาย ของเฟรมหนึ่ง (พิกัดช่อง 240 เทียบ CX/GROUND) — คิดแบบเดียวกับ Paperdoll.weapon
  pose(gk, it, act, row, f) {
    const D = PAPERDOLL_DATA[gk] && PAPERDOLL_DATA[gk][act], h = D && D.hand[row] && D.hand[row][f];
    if (!h) return null;
    const F = typeof PAPERDOLL_FIX !== 'undefined' && PAPERDOLL_FIX[gk] && PAPERDOLL_FIX[gk][act];
    const fix = (F && F[row * 64 + f]) || [0, 0, 0];
    if (Paperdoll.pose) { // ใช้คณิตเดียวกับที่วาดอาวุธจริง (ไม่เพี้ยนกันเมื่อจูนการถือ)
      const q = Paperdoll.pose(it, h, act, fix);
      if (q) return { x: q.x, y: q.y, a: q.ang, r: q.reach, tx: q.x + Math.cos(q.ang) * q.reach, ty: q.y + Math.sin(q.ang) * q.reach };
    }
    const s = Paperdoll.spec(it, act);
    let a = h[2] + (s.flip ? Math.PI : 0) + ((s.rot || 0) + fix[2]) * Math.PI / 180;
    if (s.up && Math.sin(a) > 0) a += Math.PI;
    if (s.stand) a += Math.atan2(Math.sin(-Math.PI / 2 - a), Math.cos(-Math.PI / 2 - a)) * s.stand;
    const x = h[0] - Anim.CX + fix[0], y = h[1] - Anim.GROUND + fix[1], r = s.len * (1 - (s.grip || 0));
    return { x, y, a, r, tx: x + Math.cos(a) * r, ty: y + Math.sin(a) * r };
  },
  // เฟรมที่เป็นจังหวะฟันของแต่ละแถว = เฟรมที่ปลายอาวุธเคลื่อนมากที่สุดจากเฟรมก่อน (ไม่ใช่จังหวะง้าง/ยกกลับ)
  strike(gk, it, act, row, n) {
    const key = gk + act + row, c = this._sk || (this._sk = {});
    if (c[key] !== undefined) return c[key];
    let best = -1, bd = this.MIN_MOVE;
    // ไม่นับเฟรมสุดท้าย (ยกกลับท่าเตรียม) และจังหวะที่ปลายอาวุธเคลื่อนขึ้น (ง้าง) — ฟันจริงเหวี่ยงลง/ไปข้างหน้า
    for (let f = 1; f < n - 1; f++) {
      const p = this.pose(gk, it, act, row, f - 1), q = this.pose(gk, it, act, row, f);
      if (!p || !q || q.ty - p.ty < -6) continue;
      // ให้น้ำหนักการฟันลง (ปลายอาวุธลงมาก) มากกว่าการกวาดเลียดพื้นด้านข้าง
      const d = Math.hypot(q.tx - p.tx, q.ty - p.ty) + 2 * Math.max(0, q.ty - p.ty);
      if (d > bd) { bd = d; best = f; }
    }
    return (c[key] = best);
  },

  draw(g, gk, it, fr) {
    if (!this.ON || !it || !this.ACTS[fr.action] || fr.f < 1) return;
    const D = PAPERDOLL_DATA[gk] && PAPERDOLL_DATA[gk][fr.action];
    const n = D && D.hand[fr.row] ? D.hand[fr.row].length : 0;
    const sf = this.strike(gk, it, fr.action, fr.row, n);
    if (sf < 0 || (fr.f !== sf && fr.f !== sf + 1)) return;
    const p0 = this.pose(gk, it, fr.action, fr.row, sf - 1), p1 = this.pose(gk, it, fr.action, fr.row, sf);
    if (!p0 || !p1) return;
    this.arc(g, p0, p1, it.cls, fr.f === sf ? 1 : 0.4, fr); // เฟรมถัดจากจังหวะฟัน: แสงจางลง
  },

  // ภาพถืออาวุธในภาพ (ไม่มี paperdoll): ใช้วงเหวี่ยงที่ tools/armed_trail.py หาไว้ (ไหล่ + ปลายอาวุธก่อน/ตอนฟัน)
  drawArmed(g, gk, cls, fr) {
    if (!this.ON || !this.ACTS[fr.action] || typeof ARMED_TRAIL === 'undefined') return;
    const v = ARMED_TRAIL[gk] && ARMED_TRAIL[gk][fr.row];
    if (!v || (fr.f !== v.f && fr.f !== v.f + 1)) return;
    const P = q => { const dx = q[0] - v.p[0], dy = q[1] - v.p[1]; return { x: v.p[0], y: v.p[1], a: Math.atan2(dy, dx), r: Math.hypot(dx, dy) }; };
    const p0 = P(v.a), p1 = P(v.b), da = Math.atan2(Math.sin(p1.a - p0.a), Math.cos(p1.a - p0.a));
    // วงกว้างที่ข้ามเหนือหัว (แทงคทาจากข้างหนึ่งไปอีกข้าง) ไม่ใช่การเหวี่ยง → ไม่วาด
    if (Math.abs(da) > Math.PI * 0.7 && Math.sin(p0.a + da / 2) < -0.7) return;
    this.arc(g, p0, p1, cls, fr.f === v.f ? 1 : 0.4, fr, { front: 0, extend: 0.15 }); // ทางสั้นเสมอ
  },

  // วาดแสงโค้งรอบจุดหมุน จากมุม/ระยะของ p0 (ก่อนฟัน) → p1 (ตอนฟัน)
  // o.front = ด้านหน้าตัว (+1 ขวา / -1 ซ้าย / 0 ไม่รู้): บังคับให้วงผ่านด้านหน้า • o.extend = หางยืดย้อน (แทน EXTEND)
  arc(g, p0, p1, cls, fade, fr, o = {}) {
    // กวาดมุมจากเฟรมก่อน → เฟรมฟัน (ทางที่สั้นกว่า) รอบมือ ได้แสงเป็นเสี้ยวโค้งตามวงอาวุธจริง
    // ทางกวาด: จาก 2 ทาง (ตามเข็ม/ทวนเข็ม) เลือกทางที่ผ่านฝั่งเดียวกับที่อาวุธฟันลงไป (ฟันผ่านด้านหน้า ไม่อ้อมหลังหัว)
    let da = p1.a - p0.a; da = Math.atan2(Math.sin(da), Math.cos(da));
    const alt = da - Math.sign(da) * Math.PI * 2, side = Math.sign(Math.cos(p1.a)) || 1;
    if (o.front === 0) { /* ทางสั้น */ }
    else if (o.front) { if (Math.sign(Math.cos(p0.a + da / 2)) !== o.front && Math.sign(Math.cos(p0.a + alt / 2)) === o.front) da = alt; }
    else if (Math.abs(da) > Math.PI * 0.6 && Math.sign(Math.cos(p0.a + alt / 2)) === side && Math.sign(Math.cos(p0.a + da / 2)) !== side) da = alt;
    const EXT = o.extend != null ? o.extend : this.EXTEND;
    // แถบโค้งแบบเส้นพู่กัน: ท้ายเรียวแหลม หัว (ตรงอาวุธ) หนาสุด • 3 ชั้น = เรืองแสงสี / ตัวสี / แกนขาว + เส้นความเร็วบาง ๆ
    const N = 24, col = this.COLOR[cls] || '255,255,255';
    this._outerSign = da >= 0 ? 1 : -1; // กวาดตามเข็ม (da>0): แกน +y ของแถบชี้เข้าหามือพอดี • ทวนเข็ม = กลับด้าน
    const at = (t, dr) => {
      // หางยืดย้อนไปก่อนเฟรมก่อนหน้า (EXTEND) ให้วงแสงกว้างแบบเหวี่ยงเต็มแขน
      const u = t * (1 + EXT) - EXT, c = Math.max(0, u);
      const a = p0.a + da * u, x = p0.x + (p1.x - p0.x) * c, y = p0.y + (p1.y - p0.y) * c, r = p0.r + (p1.r - p0.r) * c + dr;
      return [x + Math.cos(a) * r, y + Math.sin(a) * r];
    };
    const band = (w0, inset, from = 0) => { // w0 = หนาสุด, inset = ขยับเข้าจากขอบนอก
      const out = [], inn = [];
      for (let k = 0; k <= N; k++) {
        const t = from + (1 - from) * k / N, taper = Math.pow(t, 1.6) * (t > 0.92 ? (1 - t) / 0.08 * 0.5 + 0.5 : 1);
        out.push(at(t, -inset)); inn.push(at(t, -inset - Math.max(0.6, w0 * taper)));
      }
      g.beginPath(); g.moveTo(out[0][0], out[0][1]);
      for (const q of out) g.lineTo(q[0], q[1]);
      for (let k = N; k >= 0; k--) g.lineTo(inn[k][0], inn[k][1]);
      g.closePath();
    };
    const W = this.WIDTH;
    if (this.drawTexture(g, at, col, fade)) return;
    if (this.STYLE === 'energy') { this.energy(g, at, col, fade, fr, da); return; }
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.shadowColor = `rgba(${col},${0.9 * fade})`; g.shadowBlur = 8;
    band(W, -1); g.fillStyle = `rgba(${col},${0.35 * fade})`; g.fill();           // เรืองแสงรอบนอก
    g.shadowBlur = 0;
    band(W * 0.7, 0, 0.15); g.fillStyle = `rgba(${col},${0.6 * fade})`; g.fill();   // ตัวสี
    band(W * 0.28, 0.5, 0.35); g.fillStyle = `rgba(255,255,245,${0.9 * fade})`; g.fill(); // แกนขาวชิดขอบนอก
    // เส้นความเร็ว: สั้น ๆ ในเนื้อแสง คนละระยะ
    g.lineCap = 'round';
    [[0.45, 0.55, 0.95], [0.7, 0.35, 0.8], [0.9, 0.6, 0.98]].forEach(([d, t0, t1]) => {
      g.beginPath();
      for (let k = 0; k <= 8; k++) { const q = at(t0 + (t1 - t0) * k / 8, -W * d); k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }
      g.strokeStyle = `rgba(255,255,235,${0.35 * fade})`; g.lineWidth = 1; g.stroke();
    });
    g.restore();
  },
};

// ---------------- แบบพลังงานไหล (ค่าเริ่มต้น): แถบกว้าง สว่างขาวที่ขอบนอกใกล้อาวุธ ไล่เป็นสี Class แล้วจางเข้าใน/ไปทางหาง
// + เส้นพลังงานไหลหลายเส้นคนละระยะ (ส่ายเล็กน้อยแบบเปลวไฟ) + ประกายดาวกระจาย • ทั้งหมดวาดแบบเรืองแสงทับกัน
WeaponTrail.STYLE = 'energy';
WeaponTrail.energy = function (g, at, col, fade, fr, da) {
  const N = 30, W = this.WIDTH * 1.6, seed = (fr.row * 7 + fr.f * 13) % 97;
  const rnd = i => { const x = Math.sin((seed + i) * 127.1) * 43758.5453; return x - Math.floor(x); };
  const sh = (t, d) => at(t, -d); // จุดบนวง: t = 0 หาง → 1 อาวุธ, d = ลึกเข้าด้านในจากขอบนอก
  const wid = t => W * Math.pow(t, 0.9) * (t > 0.94 ? 0.6 + (1 - t) / 0.06 * 0.4 : 1);
  const fillBand = (d0, d1, from, style) => {
    const out = [], inn = [];
    for (let k = 0; k <= N; k++) { const t = from + (1 - from) * k / N, w = wid(t); out.push(sh(t, d0 * w)); inn.push(sh(t, d1 * w)); }
    g.beginPath(); g.moveTo(out[0][0], out[0][1]);
    for (const q of out) g.lineTo(q[0], q[1]);
    for (let k = N; k >= 0; k--) g.lineTo(inn[k][0], inn[k][1]);
    g.closePath(); g.fillStyle = style; g.fill();
  };
  const tail = sh(0, 0), head = sh(1, 0);
  const grad = (a0, a1) => { const gr = g.createLinearGradient(tail[0], tail[1], head[0], head[1]); gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(0.55, `rgba(${col},${a0 * fade})`); gr.addColorStop(1, `rgba(${col},${a1 * fade})`); return gr; };
  g.save();
  g.globalCompositeOperation = 'lighter';
  // 1) หมอกเรืองแสงกว้าง
  g.shadowColor = `rgba(${col},${fade})`; g.shadowBlur = 14;
  fillBand(-0.1, 1.15, 0, grad(0.18, 0.4));
  g.shadowBlur = 0;
  // 2) ตัวพลังงาน (ชั้นสีเข้มขึ้นเรื่อย ๆ เข้าหาขอบนอก)
  fillBand(0, 0.8, 0.05, grad(0.25, 0.55));
  fillBand(0, 0.45, 0.2, grad(0.35, 0.75));
  // 3) แกนขาวร้อนชิดขอบนอก ใกล้อาวุธ
  const wg = g.createLinearGradient(tail[0], tail[1], head[0], head[1]);
  wg.addColorStop(0, 'rgba(255,255,255,0)'); wg.addColorStop(0.6, `rgba(255,255,255,${0.35 * fade})`); wg.addColorStop(1, `rgba(255,255,255,${0.95 * fade})`);
  fillBand(0, 0.16, 0.3, wg);
  // 4) เส้นพลังงานไหล
  g.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const d = 0.08 + rnd(i) * 0.95, t0 = 0.05 + rnd(i + 20) * 0.45, t1 = Math.min(1, t0 + 0.35 + rnd(i + 40) * 0.5);
    const amp = 1.5 + rnd(i + 60) * 2.5, ph = rnd(i + 80) * 6;
    g.beginPath();
    for (let k = 0; k <= 16; k++) {
      const t = t0 + (t1 - t0) * k / 16, q = sh(t, d * wid(t) + Math.sin(t * 14 + ph) * amp);
      k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]);
    }
    const bright = d < 0.3;
    g.strokeStyle = bright ? `rgba(255,255,255,${(0.25 + rnd(i + 5) * 0.3) * fade})` : `rgba(${col},${(0.3 + rnd(i + 5) * 0.35) * fade})`;
    g.lineWidth = 0.8 + rnd(i + 9) * 1.8; g.stroke();
  }
  // 5) ประกายดาว: จุดเล็ก + ดาว 4 แฉกไม่กี่ดวง กระจายรอบวง (ด้านนอกเยอะกว่า)
  for (let i = 0; i < 16; i++) {
    const t = 0.15 + rnd(i + 100) * 0.85, d = (rnd(i + 120) * 1.8 - 0.5) * wid(t), q = sh(t, d);
    const r = 0.6 + rnd(i + 140) * 1.2, a = (0.4 + rnd(i + 160) * 0.6) * fade;
    g.fillStyle = rnd(i + 180) < 0.5 ? `rgba(255,255,255,${a})` : `rgba(${col},${a})`;
    g.beginPath(); g.arc(q[0], q[1], r, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 3; i++) {
    const t = 0.6 + rnd(i + 200) * 0.4, q = sh(t, (rnd(i + 220) * 0.6 - 0.35) * wid(t)), r = 3 + rnd(i + 240) * 2.5;
    g.fillStyle = `rgba(255,255,255,${0.85 * fade})`;
    g.beginPath(); g.moveTo(q[0], q[1] - r); g.lineTo(q[0] + r * 0.22, q[1] - r * 0.22); g.lineTo(q[0] + r, q[1]); g.lineTo(q[0] + r * 0.22, q[1] + r * 0.22);
    g.lineTo(q[0], q[1] + r); g.lineTo(q[0] - r * 0.22, q[1] + r * 0.22); g.lineTo(q[0] - r, q[1]); g.lineTo(q[0] - r * 0.22, q[1] - r * 0.22); g.closePath(); g.fill();
  }
  g.restore();
};

// ---------------- แบบวาดมือ: ภาพเส้นฟันจริง (assets/fx_trail.webp) ดัดไปตามวงอาวุธ ----------------
// ภาพ: แถบแนวนอนบนพื้นดำ ซ้าย = หางเรียว ขวา = หัวหนา ขอบบน = ขอบนอกของวง (วาดสีขาว/เทา เกมย้อมสีตาม Class)
// พื้นดำหายไปเองเพราะวาดแบบ 'lighter' • ไม่มีภาพ = ใช้แบบวาดด้วยโค้ดด้านบน
WeaponTrail.tinted = function (col) {
  const tex = typeof Art !== 'undefined' && Art.get('fx_trail');
  if (!tex) return null;
  const c = this._tint || (this._tint = {});
  if (c[col]) return c[col];
  const cv = document.createElement('canvas'); cv.width = tex.width; cv.height = tex.height;
  const g = cv.getContext('2d');
  g.drawImage(tex, 0, 0);
  g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgb(${col})`; g.fillRect(0, 0, cv.width, cv.height); // ย้อมสี
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.55; g.drawImage(tex, 0, 0);                       // คืนแกนขาว
  return (c[col] = cv);
};
WeaponTrail.drawTexture = function (g, at, col, fade) {
  const tex = this.tinted(col);
  if (!tex) return false;
  const S = 28, H = this.WIDTH * 1.35, tw = tex.width, th = tex.height;
  g.save();
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = fade;
  for (let k = 0; k < S; k++) {
    const t0 = k / S, t1 = (k + 1) / S, p = at(t0, 0), q = at(t1, 0);
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]) + 0.8, ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
    g.save(); g.translate(p[0], p[1]); g.rotate(ang);
    // แนวสัมผัสวง → ขอบบนของภาพอยู่ด้านนอก: ด้านนอกของวงคือทางซ้ายหรือขวาของทิศเดิน ขึ้นกับทางกวาด
    if (this._outerSign < 0) g.scale(1, -1);
    g.drawImage(tex, tw * t0, 0, tw / S + 1, th, 0, 0, len, H);
    g.restore();
  }
  g.restore();
  return true;
};

// ห่อ Paperdoll.layers: แสงฟันวาดทับตัวละครแต่อยู่ใต้อาวุธ เฉพาะภาพตัวเปล่าที่มีอาวุธประจำ Class
if (typeof Paperdoll !== 'undefined' && !Paperdoll._trail) {
  const base = Paperdoll.layers.bind(Paperdoll);
  Paperdoll.layers = (gk, p, bare) => {
    const L = base(gk, p, bare);
    if (!bare || !L.over) return L;
    const it = Paperdoll.classWeapon(p.job), over = L.over;
    return Object.assign({}, L, { over: (g, fr) => { WeaponTrail.draw(g, gk, it, fr); over(g, fr); } });
  };
  Paperdoll._trail = true;
}
// ภาพ Class ที่วาดอาวุธในภาพแล้ว: เพิ่มแสงฟันทับตัว (ตามวงเหวี่ยงในภาพ)
if (typeof Paperdoll !== 'undefined' && !Paperdoll._trailArmed) {
  const base = Paperdoll.layers.bind(Paperdoll);
  Paperdoll.layers = (gk, p, bare) => {
    const L = base(gk, p, bare);
    if (bare || typeof ARMED_TRAIL === 'undefined' || !ARMED_TRAIL[gk]) return L;
    const b = Paperdoll.baseJob(p.job), over = L.over;
    return Object.assign({}, L, { over: (g, fr) => { WeaponTrail.drawArmed(g, gk, b, fr); if (over) over(g, fr); } });
  };
  Paperdoll._trailArmed = true;
}
