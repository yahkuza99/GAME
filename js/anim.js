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
    const def = this.ACTIONS[s.action];
    let f;
    if (s.action === 'walk' && action !== 'walk') f = 0; // ยืนนิ่งด้วยเฟรมแรกของท่าเดิน
    else if (k != null && !def.loop) f = Math.min(s.n - 1, Math.floor(k * s.n)); // ท่าที่เล่นครั้งเดียว: ตามความคืบหน้า
    else f = Math.floor((t + (st.seed || 0)) / ((def.cycle || 1) / s.n)) % s.n;
    // แถว: ภาพ 8 ทิศเลือกตามทิศที่หัน, ภาพทิศเดียวใช้แถวแรกแล้วกลับด้านตอนหันขวา
    const dir = st.dir != null ? st.dir : (st.facing > 0 ? 0 : 4);
    return { img: s.img, f: Math.max(0, f), row: s.dirs === 8 ? dir : 0, flip: s.dirs === 8 ? false : st.facing > 0 };
  },

  // วาดที่ตำแหน่งเท้า (x, y), ตัวสูงราว H px, facing>0 = หันขวา (ภาพต้นฉบับหันซ้าย)
  draw(g, x, y, key, st, t, H = 66) {
    const p = this.pick(key, st, t); if (!p) return false;
    const k = H / this.STD_H, C = this.CELL;
    Sprites.shadow(g, x, y, H * 0.3, H * 0.09, 0.3);
    g.save();
    g.translate(x, y);
    g.scale(p.flip ? -k : k, k);
    if (st.flash) g.filter = 'brightness(1.9)';
    g.drawImage(p.img, p.f * C, p.row * C, C, C, -this.CX, -this.GROUND, C, C);
    g.restore();
    return true;
  },
};
