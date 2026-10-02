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
  WIDTH: 20,    // ความหนาของแสง (px ในช่อง 240)

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
      const d = Math.hypot(q.tx - p.tx, q.ty - p.ty);
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
    const fade = fr.f === sf ? 1 : 0.4; // เฟรมถัดจากจังหวะฟัน: แสงจางลง
    // กวาดมุมจากเฟรมก่อน → เฟรมฟัน (ทางที่สั้นกว่า) รอบมือ ได้แสงเป็นเสี้ยวโค้งตามวงอาวุธจริง
    // ทางกวาด: จาก 2 ทาง (ตามเข็ม/ทวนเข็ม) เลือกทางที่ผ่านฝั่งเดียวกับที่อาวุธฟันลงไป (ฟันผ่านด้านหน้า ไม่อ้อมหลังหัว)
    let da = p1.a - p0.a; da = Math.atan2(Math.sin(da), Math.cos(da));
    const alt = da - Math.sign(da) * Math.PI * 2, side = Math.sign(Math.cos(p1.a)) || 1;
    if (Math.abs(da) > Math.PI * 0.6 && Math.sign(Math.cos(p0.a + alt / 2)) === side && Math.sign(Math.cos(p0.a + da / 2)) !== side) da = alt;
    // แถบโค้งแบบเส้นพู่กัน: ท้ายเรียวแหลม หัว (ตรงอาวุธ) หนาสุด • 3 ชั้น = เรืองแสงสี / ตัวสี / แกนขาว + เส้นความเร็วบาง ๆ
    const N = 24, col = this.COLOR[it.cls] || '255,255,255';
    this._outerSign = da >= 0 ? 1 : -1; // กวาดตามเข็ม (da>0): แกน +y ของแถบชี้เข้าหามือพอดี • ทวนเข็ม = กลับด้าน
    const at = (t, dr) => {
      const a = p0.a + da * t, x = p0.x + (p1.x - p0.x) * t, y = p0.y + (p1.y - p0.y) * t, r = p0.r + (p1.r - p0.r) * t + dr;
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
