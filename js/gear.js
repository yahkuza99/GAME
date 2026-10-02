'use strict';
// ============================================================
//  Gear: ของสวมใส่ที่ขยับเองบนตัวละครภาพวาดทีละเฟรม (ทาง A+B)
//  ผ้าคลุม (slot garment) = ผ้าจำลองฟิสิกส์ (verlet) ยึดที่ไหล่ พลิ้วตามการเดิน/ลม/แรงเหวี่ยง
//  วาดหลังตัวละครเมื่อหันหน้า/ด้านข้าง และทับตัวเมื่อหันหลัง • ไม่มีภาพเพิ่ม ไม่ต้องรอศิลปิน
// ============================================================
const Gear = {
  N: 7,             // จุดต่อขอบผ้า (ยิ่งมากยิ่งนุ่ม)
  // ทิศหันหลัง (dirFromVec: 0=ขวา 2=ล่าง 4=ซ้าย 6=บน) → ผ้าคลุมอยู่หน้าภาพตัวละคร
  backDir(d) { return d === 5 || d === 6 || d === 7; },
  garment(p) {
    const e = p && p.equip && p.equip.garment, it = e && typeof ITEMS !== 'undefined' && ITEMS[e.id];
    return it ? (it.icon && it.icon.c) || '#8a4a3a' : null;
  },
  // จำลองผ้า: ขอบซ้าย/ขวาเป็นเชือก N จุด ยึดจุดแรกที่ไหล่ ที่เหลือมีแรงโน้มถ่วง + แรงต้านจากการเคลื่อนที่ + ลม
  step(p, ax, ay, H, t, wf = 1) {
    const now = typeof G !== 'undefined' ? G.time : t;
    const C = p._cape || (p._cape = { t: now, px: ax, py: ay, vx: 0, vy: 0, L: null, R: null });
    let dt = Math.min(0.05, Math.max(0, now - C.t)); C.t = now;
    if (Math.abs(ax - C.px) > H * 3 || Math.abs(ay - C.py) > H * 3) { C.L = C.R = null; dt = 0; } // วาร์ป/เปลี่ยนแมพ: ตั้งใหม่
    if (dt > 0) { const k = 1 - Math.exp(-dt * 10); C.vx += ((ax - C.px) / dt - C.vx) * k; C.vy += ((ay - C.py) / dt - C.vy) * k; }
    C.px = ax; C.py = ay;
    const seg = H * 0.58 / (this.N - 1), half = H * 0.12 * wf;
    const mk = off => Array.from({ length: this.N }, (_, i) => ({ x: ax + off, y: ay + i * seg, ox: ax + off, oy: ay + i * seg }));
    if (!C.L) { C.L = mk(-half); C.R = mk(half); }
    const grav = H * 9, wind = (Math.sin(t * 1.7 + (p.x || 0)) * 0.9 + Math.sin(t * 4.3) * 0.35) * H * 1.6;
    for (const [rope, off] of [[C.L, -half], [C.R, half]]) {
      rope[0].x = ax + off; rope[0].y = ay;
      for (let i = 1; i < this.N; i++) {
        const q = rope[i], vx = (q.x - q.ox) * 0.97, vy = (q.y - q.oy) * 0.97;
        q.ox = q.x; q.oy = q.y;
        // วิ่ง: ผ้าโดนแรงต้านปลิวไปด้านหลังการเคลื่อนที่ (ปลายผ้าปลิวมากกว่าโคน)
        const drag = i / this.N;
        // แรงต้านลม ≈ 1/3 ของแรงโน้มถ่วงตอนวิ่งเต็มที่ → ผ้าเอียงไปหลังราว 20–30° ไม่ปลิวเป็นปีก
        q.x += vx + (-C.vx * 0.5 * drag + wind * drag) * dt * dt;
        q.y += vy + (grav - C.vy * 0.8 * drag) * dt * dt;
      }
      for (let it = 0; it < 3; it++) for (let i = 1; i < this.N; i++) { // รักษาความยาวผ้า
        const a = rope[i - 1], b = rope[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, f = (d - seg) / d;
        if (i === 1) { b.x -= dx * f; b.y -= dy * f; } else { a.x += dx * f * 0.5; a.y += dy * f * 0.5; b.x -= dx * f * 0.5; b.y -= dy * f * 0.5; }
      }
    }
    // ขอบสองฝั่งไม่ไขว้กัน และผ้าไม่ม้วนขึ้นเหนือไหล่
    for (let i = 1; i < this.N; i++) {
      const l = C.L[i], r = C.R[i], minW = half * 2 * (1 + i / (this.N - 1) * 0.55); // บานออกที่ชายผ้า
      if (r.x - l.x < minW) { const m = (l.x + r.x) / 2; l.x = m - minW / 2; r.x = m + minW / 2; }
      if (l.y < ay + i * seg * 0.35) l.y = ay + i * seg * 0.35;
      if (r.y < ay + i * seg * 0.35) r.y = ay + i * seg * 0.35;
    }
    return C;
  },
  // วาดผ้าคลุม: x,y = จุดยืน • H = ความสูงตัวละคร (px) • front = รอบวาดทับตัว (หันหลัง)
  cape(g, p, x, y, H, t, front) {
    const col = this.garment(p); if (!col || p.dead || p.sitting) return;
    if (!!front !== this.backDir(p.dir)) return;
    const f = p.facing || 1, back = this.backDir(p.dir), side = p.dir === 0 || p.dir === 4;
    const ax = x - f * (side ? H * 0.06 : 0), ay = y - H * 0.66;
    const C = this.step(p, ax, ay, H, t, side ? 0.35 : 1); // มองด้านข้าง = เห็นผ้าเกือบเป็นแนวสัน
    const L = C.L, R = C.R;
    g.save();
    if (!back) g.globalAlpha = 0.96;
    const N = this.N, lb = L[N - 1], rb = R[N - 1];
    const grd = g.createLinearGradient(lb.x, 0, rb.x, 0); // เงาซ้ายขวา = ผ้ามีความโค้ง
    grd.addColorStop(0, U.rgba(this.shade(col, -0.4), 1)); grd.addColorStop(0.35, U.rgba(col, 1)); grd.addColorStop(0.6, U.rgba(this.shade(col, 0.12), 1)); grd.addColorStop(1, U.rgba(this.shade(col, -0.45), 1));
    g.fillStyle = grd;
    g.beginPath(); g.moveTo(L[0].x, L[0].y);
    for (let i = 1; i < N; i++) g.lineTo(L[i].x, L[i].y);
    // ชายผ้าเป็นคลื่น 3 ลอน (ขยับตามเวลา)
    const waves = 3, sway = Math.sin(t * 5 + (p.x || 0)) * H * 0.012;
    for (let k = 1; k <= waves * 2; k++) {
      const u = k / (waves * 2), xx = lb.x + (rb.x - lb.x) * u, yy = lb.y + (rb.y - lb.y) * u + (k % 2 ? H * 0.035 + sway : 0);
      g.lineTo(xx, yy);
    }
    for (let i = N - 2; i >= 0; i--) g.lineTo(R[i].x, R[i].y);
    g.closePath(); g.fill();
    g.strokeStyle = U.rgba(this.shade(col, -0.6), 0.9); g.lineWidth = 1.1; g.stroke();
    // รอยพับแนวตั้ง 2 เส้น (ตามรูปผ้า)
    g.strokeStyle = U.rgba(this.shade(col, -0.35), 0.6); g.lineWidth = 1;
    for (const u of [0.33, 0.67]) {
      g.beginPath(); g.moveTo(L[1].x + (R[1].x - L[1].x) * u, L[1].y + (R[1].y - L[1].y) * u);
      for (let i = 2; i < N; i++) g.lineTo(L[i].x + (R[i].x - L[i].x) * u, L[i].y + (R[i].y - L[i].y) * u + (i === N - 1 ? H * 0.02 : 0));
      g.stroke();
    }
    // คอเสื้อ/ปลอกรัดที่ไหล่
    g.fillStyle = U.rgba(this.shade(col, -0.5), 1);
    g.beginPath(); g.ellipse((L[0].x + R[0].x) / 2, ay, Math.max(3, Math.abs(R[0].x - L[0].x) / 2 + 2), H * 0.025, 0, 0, 7); g.fill();
    g.restore();
  },
  shade(hex, k) {
    const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  },
};
