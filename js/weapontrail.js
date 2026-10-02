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
  WIDTH: 16,    // ความหนาของแสง (px ในช่อง 240)

  // มือ + มุมอาวุธ + ระยะถึงปลาย ของเฟรมหนึ่ง (พิกัดช่อง 240 เทียบ CX/GROUND) — คิดแบบเดียวกับ Paperdoll.weapon
  pose(gk, it, act, row, f) {
    const D = PAPERDOLL_DATA[gk] && PAPERDOLL_DATA[gk][act], h = D && D.hand[row] && D.hand[row][f];
    if (!h) return null;
    const s = Paperdoll.spec(it, act);
    const F = typeof PAPERDOLL_FIX !== 'undefined' && PAPERDOLL_FIX[gk] && PAPERDOLL_FIX[gk][act];
    const fix = (F && F[row * 64 + f]) || [0, 0, 0];
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
    const N = 14, outer = [], inner = [];
    for (let k = 0; k <= N; k++) {
      const t = k / N, a = p0.a + da * t, x = p0.x + (p1.x - p0.x) * t, y = p0.y + (p1.y - p0.y) * t;
      const r = p0.r + (p1.r - p0.r) * t, w = this.WIDTH * Math.sin(Math.PI * Math.min(1, t * 1.15)); // หัวแหลม ท้ายกว้าง
      outer.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
      inner.push([x + Math.cos(a) * (r - Math.max(2, w)), y + Math.sin(a) * (r - Math.max(2, w))]);
    }
    const col = this.COLOR[it.cls] || '255,255,255';
    const gr = g.createLinearGradient(outer[0][0], outer[0][1], outer[N][0], outer[N][1]);
    gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(0.7, `rgba(${col},${0.55 * fade})`); gr.addColorStop(1, `rgba(${col},${0.8 * fade})`);
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.beginPath(); g.moveTo(outer[0][0], outer[0][1]);
    for (const q of outer) g.lineTo(q[0], q[1]);
    for (let k = N; k >= 0; k--) g.lineTo(inner[k][0], inner[k][1]);
    g.closePath(); g.fillStyle = gr; g.fill();
    // ขอบนอกสว่าง
    g.beginPath(); g.moveTo(outer[3][0], outer[3][1]);
    for (let k = 4; k <= N; k++) g.lineTo(outer[k][0], outer[k][1]);
    g.strokeStyle = `rgba(255,255,240,${0.6 * fade})`; g.lineWidth = 2; g.lineCap = 'round'; g.stroke();
    g.restore();
  },
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
