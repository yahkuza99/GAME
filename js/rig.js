'use strict';
// ============================================================
//  ตัวละครแบบแยกชิ้น + กระดูก (cutout / skeletal animation)
//  ชิ้นส่วน: assets/rig_<key>_<part>.webp วาดสเกลเดียวกัน ท่ายืนตรง หันซ้าย 3/4
//  part: head, torso, arm_front, arm_back, leg_front, leg_back, hair_back, weapon
//  จุดหมุน (pivot) คำนวณจากกรอบภาพ: แขน/ขา = กึ่งกลางขอบบน, ลำตัว = กึ่งกลางขอบล่าง,
//  หัว = กึ่งกลางค่อนล่าง (คอ), อาวุธ = ด้ามล่าง
// ============================================================

const RIG_PARTS = ['hair_back', 'arm_back', 'leg_back', 'leg_front', 'torso', 'head', 'weapon', 'arm_front'];

const Rig = {
  enabled: false, // ปิดไว้: ใช้แอนิเมชันแบบวาดทีละเฟรม (anim.js) แทน
  ON: [], // เจ้าของตัดสินใจไม่ใช้ Rig (เคลื่อนไหวไม่เป็นธรรมชาติ) — ใช้แอนิเมชันวาดทีละเฟรมแทน
  cache: {},
  // โหลดชิ้นส่วนของตัวละคร key (เช่น novice_f) คืน null ถ้ายังไม่ครบชิ้นหลัก
  get(key) {
    if (this.cache[key] !== undefined && this.cache[key] !== null) return this.cache[key];
    const P = {};
    for (const part of RIG_PARTS) { const im = Art.get(`rig_${key}_${part}`); if (im) P[part] = im; }
    if (!P.head || !P.torso || !P.leg_front || !P.arm_front) return null;
    P.leg_back = P.leg_back || P.leg_front;
    P.arm_back = P.arm_back || P.arm_front;
    // สเกลฐาน: หัว+ลำตัว+ขา (หักส่วนที่ซ้อนกันที่ข้อต่อ)
    const natH = P.head.height * 0.9 + P.torso.height * 0.82 + P.leg_front.height * 0.92;
    return (this.cache[key] = { P, natH });
  },
  reset() { this.cache = {}; },

  // ท่าทาง (เรเดียน, ภาพหันซ้าย): แขน/ขา บวก = ยื่นไปข้างหน้า, lean บวก = เอนไปข้างหลัง
  pose(st, t) {
    const o = { body: 0, bob: 0, lean: 0, head: 0, armF: 0.08, armB: -0.08, legF: 0, legB: 0, weapon: 0, hair: 0, drop: 0, rot: 0, sx: 1, sy: 1 };
    const w = t * 9;
    if (st.dead) { const k = Math.min(1, (st.deathT || 1) / 0.5); o.rot = -1.45 * k; o.drop = 0.12 * k; o.armF = 0.6 * k; o.armB = 0.9 * k; o.legF = 0.2 * k; o.head = 0.2 * k; return o; }
    if (st.sit) { o.legF = 1.45; o.legB = 1.3; o.drop = 0.72; o.armF = 0.35; o.armB = 0.25; o.lean = 0.12; o.head = 0.05 + Math.sin(t * 1.5) * 0.03; o.bob = Math.sin(t * 1.8) * 0.4; return o; }
    if (st.moving) {
      const s = Math.sin(w), c = Math.cos(w);
      o.legF = s * 0.4; o.legB = -s * 0.4;
      o.armF = -s * 0.42 + 0.05; o.armB = s * 0.42 - 0.05;
      o.bob = -Math.abs(c) * 2.2; o.lean = -0.07; o.head = s * 0.03; o.hair = -s * 0.06 + 0.08;
    } else {
      const b = Math.sin(t * 2.2);
      o.bob = b * 0.6; o.armF = 0.08 + b * 0.03; o.armB = -0.08 - b * 0.03; o.head = Math.sin(t * 0.9) * 0.025; o.hair = b * 0.03;
      o.sy = 1 + b * 0.008;
    }
    // โจมตี: ง้าง (0→0.35) → ฟาด (0.35→0.6) → คืนท่า
    if (st.atk > 0) {
      const k = 1 - st.atk; // 0 → 1 ตลอดท่า
      const wind = k < 0.35 ? k / 0.35 : 1, swing = k < 0.35 ? 0 : Math.min(1, (k - 0.35) / 0.25), back = k > 0.6 ? (k - 0.6) / 0.4 : 0;
      const kind = st.atkKind || 'melee';
      if (kind === 'cast') { o.armF = 2.5 * (1 - back); o.armB = 2.1 * (1 - back); o.lean = 0.1 * (1 - back); o.head = 0.12 * (1 - back); }
      else if (kind === 'bow') { o.armF = 1.55 * (1 - back); o.armB = 1.4 * (1 - back); o.lean = 0.06; }
      else {
        const a = -2.4 * wind + 3.2 * swing;
        o.armF = a * (1 - back) + o.armF * back; o.weapon = -0.4 * wind + 0.9 * swing * (1 - back);
        o.lean = (0.14 * wind - 0.24 * swing) * (1 - back); o.legF = 0.35 * (1 - back); o.legB = -0.25 * (1 - back);
      }
    }
    if (st.hurt > 0) { o.lean += st.hurt * 1.4; o.head += st.hurt * 1.0; o.armF -= st.hurt * 1.2; o.armB -= st.hurt * 1.0; }
    return o;
  },

  // วาดตัวละครที่ตำแหน่งเท้า (x, y), สูงราว H พิกเซล
  draw(g, x, y, key, st, t, H = 66) {
    const R = this.get(key); if (!R) return false;
    const P = R.P, k = H / R.natH, o = this.pose(st, t);
    const sz = im => [im.width * k, im.height * k];
    const [lw, lh] = sz(P.leg_front), [tw, th] = sz(P.torso), [hw, hh] = sz(P.head), [aw, ah] = sz(P.arm_front);
    Sprites.shadow(g, x, y, H * 0.3, H * 0.09, 0.3);
    g.save();
    g.translate(x, y + o.drop * lh);
    if (o.rot) g.rotate(o.rot * (st.facing > 0 ? -1 : 1));
    g.scale(st.facing > 0 ? -1 : 1, 1); // ภาพต้นฉบับหันซ้าย
    g.scale(o.sx, o.sy);
    const hipY = -lh * 0.92 + o.bob, hipX = 0;
    // จุดข้อต่อ (พิกัดท้องถิ่นของลำตัว)
    const torsoTop = -th * 0.82;
    const shoulderF = { x: -tw * 0.18, y: torsoTop + th * 0.16 }, shoulderB = { x: tw * 0.2, y: torsoTop + th * 0.14 };
    const legFx = -tw * 0.14, legBx = tw * 0.16;
    const part = (im, px, py, ang, ax, ay) => { // วาดภาพ im หมุนรอบจุด (ax, ay) ของภาพ (สัดส่วน 0..1)
      const [w, h] = sz(im);
      g.save(); g.translate(px, py); g.rotate(ang); g.drawImage(im, -w * ax, -h * ay, w, h); g.restore();
    };
    const drawBody = which => {
      g.save(); g.translate(hipX, hipY); g.rotate(o.lean);
      if (which === 'hair_back' && P.hair_back) {
        g.save(); g.translate(0, torsoTop - hh * 0.55); g.rotate(o.head * 0.6 + o.hair);
        const [w, h] = sz(P.hair_back); g.drawImage(P.hair_back, -w * 0.5, -h * 0.12, w, h); g.restore();
      }
      if (which === 'arm_back') part(P.arm_back, shoulderB.x, shoulderB.y, o.armB, 0.5, 0.08);
      if (which === 'torso') { const [w, h] = sz(P.torso); g.drawImage(P.torso, -w * 0.5, -h * 0.82, w, h); }
      if (which === 'head') part(P.head, 0, torsoTop + hh * 0.08, o.head, 0.5, 0.9);
      if (which === 'arm_front' || which === 'weapon') {
        g.save(); g.translate(shoulderF.x, shoulderF.y); g.rotate(o.armF);
        if (which === 'weapon' && P.weapon) { const [w, h] = sz(P.weapon); g.translate(0, ah * 0.86); g.rotate(-0.35 + o.weapon); g.drawImage(P.weapon, -w * 0.5, -h * 0.9, w, h); }
        if (which === 'arm_front') g.drawImage(P.arm_front, -aw * 0.5, -ah * 0.08, aw, ah);
        g.restore();
      }
      g.restore();
    };
    for (const pn of RIG_PARTS) {
      if (pn === 'leg_back') part(P.leg_back, hipX + legBx, hipY - lh * 0.02, o.legB, 0.5, 0.06);
      else if (pn === 'leg_front') part(P.leg_front, hipX + legFx, hipY, o.legF, 0.5, 0.06);
      else drawBody(pn);
    }
    g.restore();
    return true;
  },
};
