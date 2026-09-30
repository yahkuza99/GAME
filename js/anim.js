'use strict';
// ============================================================
//  แอนิเมชันแบบวาดทีละเฟรม (แบบ RO) — มาตรฐานขนาด NMS-1
//  assets/anim_<key>_<action>.webp = แถบเฟรม ช่องละ 240x240 (แนวนอน = เฟรม)
//    1 แถว = ภาพหันซ้ายทิศเดียว (กลับด้านเมื่อหันขวา)
//    8 แถว = 8 ทิศแบบ RO (แถว i = ทิศ i ตาม dirFromVec: 0=ขวา 1=ขวาล่าง 2=ล่าง ... 6=บน 7=ขวาบน)
//  เส้นพื้น y=220, แกนกลาง x=120, ตัวยืนสูง 150px, ภาพหันซ้าย
//  (ติดตั้งด้วย tools/sprite_std.py ซึ่งวัดและจัดขนาดทุกเฟรมให้เท่ากัน)
// ============================================================

const Anim = {
  CELL: 240, GROUND: 220, CX: 120, STD_H: 150,
  // ท่า: วินาทีต่อเฟรม, วนซ้ำ, ท่าสำรองเมื่อยังไม่มีภาพ
  ACTIONS: {
    // cycle = เวลาทั้งรอบ (หารตามจำนวนเฟรมที่มีจริง), alt = ท่าสำรอง (ท่า walk ที่ใช้แทนจะหยุดที่เฟรมแรก)
    idle: { cycle: 1.0, loop: true, alt: 'walk' },
    walk: { cycle: 0.72, loop: true, alt: 'idle' },
    attack: { loop: false, alt: 'idle' },
    cast: { cycle: 0.56, loop: true, alt: 'attack' },
    hurt: { loop: false, alt: 'idle' },
    sit: { cycle: 1.2, loop: true, alt: 'idle' },
    dead: { loop: false, alt: 'hurt' },
  },

  // ภาพแถบเฟรมของท่านั้น (ไล่ท่าสำรองถ้ายังไม่มี) คืน { img, n } หรือ null
  strip(key, action) {
    for (let a = action, guard = 0; a && guard < 5; a = (this.ACTIONS[a] || {}).alt, guard++) {
      const img = Art.get(`anim_${key}_${a}`);
      if (img) return { img, n: Math.max(1, Math.round(img.width / this.CELL)), dirs: Math.round(img.height / this.CELL) >= 8 ? 8 : 1, action: a };
    }
    return null;
  },
  // ระยะเวลาท่าที่เล่นครั้งเดียว (วินาที) — นับจากเหตุการณ์จริง ไม่ผูกกับตัวแปรเอฟเฟกต์ที่หมดเร็ว
  DUR: { attack: 0.42, hurt: 0.3, dead: 0.6 },
  // จับเวลาเริ่มท่าจากสถานะของตัวละคร (เก็บใน o._an) คืนค่าความคืบหน้าให้ pick()
  track(o, t, atk, hurtOn, dead) {
    const a = o._an || (o._an = { pa: 0, at: -9, ph: false, ht: -9, pd: false, dt: -9 });
    if (atk > a.pa + 0.05) a.at = t;
    if (hurtOn && !a.ph) a.ht = t;
    if (dead && !a.pd) a.dt = t;
    a.pa = atk; a.ph = hurtOn; a.pd = dead;
    const D = this.DUR, ka = (t - a.at) / D.attack, kh = (t - a.ht) / D.hurt;
    return { atk: ka >= 0 && ka < 1 ? 1 - ka : 0, hurt: kh >= 0 && kh < 1 ? 1 - kh : 0, deathT: dead ? Math.max(0, t - a.dt) * 0.5 / D.dead : 0 };
  },
  // วัดความกว้างช่วงเท้าของทุกเฟรมครั้งเดียวต่อภาพ: เท้ากางกว้าง = จังหวะเหยียบ (ตัวต่ำ), เท้าชิด = จังหวะก้าวผ่าน (ตัวสูง)
  feet(img, n) {
    if (img._feet) return img._feet;
    img._feet = [];
    try {
      const C = this.CELL, c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const rows = Math.round(img.height / C);
      for (let r = 0; r < rows; r++) {
        const ws = [];
        for (let f = 0; f < n; f++) {
          const d = g.getImageData(f * C, r * C + this.GROUND - 28, C, 26).data;
          let x0 = C, x1 = 0;
          for (let y = 0; y < 26; y++) for (let x = 0; x < C; x++) if (d[(y * C + x) * 4 + 3] > 80) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
          ws.push(Math.max(0, x1 - x0));
        }
        const lo = Math.min(...ws), hi = Math.max(...ws);
        const lift = ws.map(w => (hi - lo < 3 ? 0.5 : (hi - w) / (hi - lo)));
        // จังหวะสม่ำเสมอ: เฟรมคู่/คี่ฝั่งที่เท้าชิดกว่าเฉลี่ย = จังหวะก้าวผ่าน (ตัวสูง)
        const avg = q => { const v = lift.filter((_, i) => i % 2 === q); return v.reduce((a, b) => a + b, 0) / (v.length || 1); };
        img._feet.push({ still: ws.indexOf(lo), pass: avg(1) > avg(0) ? 1 : 0 });
      }
    } catch (e) { /* อ่านพิกเซลไม่ได้ (file://) */ }
    return img._feet;
  },
  stillFrame(img, n, row) {
    const r = this.feet(img, n)[row];
    return r ? r.still : Math.min(1, n - 1);
  },
  has(key) { return !!Art.get(`anim_${key}_idle`) || !!Art.get(`anim_${key}_walk`); },

  // เลือกท่าและเฟรมจากสถานะตัวละคร
  // st: { moving, atk (1→0), cast, hurt (0..1), sit, dead, deathT }
  pick(key, st, t) {
    let action = 'idle', k = null;
    if (st.dead) { action = 'dead'; k = Math.min(1, (st.deathT == null ? 1 : st.deathT) / 0.5); }
    else if (st.hurt > 0) { action = 'hurt'; k = 1 - st.hurt; }
    else if (st.atk > 0) { action = 'attack'; k = 1 - st.atk; }
    else if (st.cast) action = 'cast';
    else if (st.sit) action = 'sit';
    else if (st.moving) action = 'walk';
    const s = this.strip(key, action); if (!s) return null;
    // ท่าเดินเป็น 8 ทิศแต่ท่ายืนเป็นภาพทิศเดียว (มักเป็นคนละชุดภาพ ตัวจะดูเปลี่ยนไปตอนหยุด):
    // ยืนด้วยเฟรมกลางก้าวของท่าเดินทิศนั้นแทน + หายใจเบา ๆ ตัวละครจึงเป็นแบบเดียวกันตลอด
    if (action === 'idle') {
      const w = this.strip(key, 'walk');
      if (w && w.dirs === 8 && s.dirs !== 8) {
        const dir = st.dir != null ? st.dir : (st.facing > 0 ? 0 : 4);
        return { img: w.img, f: this.stillFrame(w.img, w.n, dir), row: dir, flip: false, breathe: true };
      }
    }
    const def = this.ACTIONS[s.action];
    let f;
    if (s.action === 'walk' && action !== 'walk') f = 0; // ยืนนิ่งด้วยเฟรมแรกของท่าเดิน
    else if (k != null && !def.loop) f = Math.min(s.n - 1, Math.floor(k * s.n)); // ท่าที่เล่นครั้งเดียว: ตามความคืบหน้า
    else f = Math.floor((t + (st.seed || 0)) / ((def.cycle || 1) / s.n)) % s.n;
    // แถว: ภาพ 8 ทิศเลือกตามทิศที่หัน, ภาพทิศเดียวใช้แถวแรกแล้วกลับด้านตอนหันขวา
    const dir = st.dir != null ? st.dir : (st.facing > 0 ? 0 : 4);
    const row = s.dirs === 8 ? dir : 0;
    // ท่าเดิน: ยกตัวขึ้นเล็กน้อยตอนก้าวผ่าน ลงตอนเหยียบ (ขั้นละเฟรม ตามจังหวะขาในภาพ) ให้เห็นการก้าวชัดขึ้น
    let lift = 0;
    if (s.action === 'walk' && action === 'walk') { const fr = this.feet(s.img, s.n)[row]; lift = fr && Math.max(0, f) % 2 === fr.pass ? 4 : 0; }
    return { img: s.img, f: Math.max(0, f), row, flip: s.dirs === 8 ? false : st.facing > 0, lift };
  },

  // วาดที่ตำแหน่งเท้า (x, y), ตัวสูงราว H px, facing>0 = หันขวา (ภาพต้นฉบับหันซ้าย)
  draw(g, x, y, key, st, t, H = 66) {
    const p = this.pick(key, st, t); if (!p) return false;
    const k = H / this.STD_H, C = this.CELL;
    Sprites.shadow(g, x, y, H * 0.3, H * 0.09, 0.3);
    g.save();
    g.translate(x, y);
    if (p.lift) g.translate(0, -p.lift * k);
    g.scale(p.flip ? -k : k, k * (p.breathe ? 1 + Math.sin(t * 2.4 + (st.seed || 0)) * 0.012 : 1));
    if (st.flash) g.filter = 'brightness(1.9)';
    g.drawImage(p.img, p.f * C, p.row * C, C, C, -this.CX, -this.GROUND, C, C);
    g.restore();
    return true;
  },
};
