'use strict';
// ============================================================
//  ทดลอง: เปลี่ยนอาวุธ/ใส่หมวกบนภาพเคลื่อนไหวทีละเฟรม (paperdoll แบบ RO)
//  ตัวละครที่มีภาพ "ตัวเปล่า" (anim_<key>_bare_<ท่า> ไม่มีอาวุธในมือ) + จุดมือ/มุม/หัว ทุกเฟรม (PAPERDOLL_DATA)
//  → วาดไอคอนอาวุธที่สวมจริงไว้ในมือ หมุนตามมุมของเฟรมนั้น และวาดหมวกที่หัว
//  สร้างข้อมูลด้วย tools/paperdoll.py (ลบอาวุธเดิมออกจากภาพ + วัดจุด)
// ============================================================

const Paperdoll = {
  ON: true,
  // อาวุธแต่ละชนิด: ยาว (px ในช่อง 240), grip = ตำแหน่งที่มือจับ (สัดส่วนจากปลายด้ามถึงปลายอาวุธ)
  // rev = ไอคอนวาดด้ามไว้ขวาบน ปลายคมซ้ายล่าง (มีด/ดาบทุกชิ้น) — ต้องจับฝั่งด้าม ไม่ใช่ฝั่งคม
  W: {
    dagger: { len: 46, grip: 0.12, rev: 1 },
    sword: { len: 74, grip: 0.1, rev: 1 },
    axe: { len: 64, grip: 0.14 },
    mace: { len: 64, grip: 0.14 },
    rod: { len: 86, grip: 0.36, up: 1, stand: 0.8 },
    bow: { len: 80, grip: 0.5, up: 1, stand: 0.6 },
  },
  // up = ชี้ขึ้นเสมอ (คทา/ธนู ถือหัวขึ้น ไม่ชี้ตามใบมีดที่ห้อยลง), stand = ดึงเข้าหาแนวตั้งมากน้อยแค่ไหน
  // หมวก: w = กว้าง (px ในช่อง 240), dy = เลื่อนลงจากยอดผม, dx = เลื่อนไปทางหน้า, back = ซ่อนตอนหันหลัง
  HAT: {
    hat: { w: 68, dy: 20, dx: 2 },
    iron_helm: { w: 64, dy: 28, dx: 0 },
    ribbon: { w: 46, dy: 12, dx: -16 },
  },
  // ผมแต่ละตัวสูงไม่เท่ากัน (ผมชี้ฟู = ยอดผมสูงกว่าหัวจริง) → เลื่อนหมวกลงเพิ่มต่อตัวละคร
  HEAD_DY: { novice_m: 10 },
  // ไอคอนในเกมวาดเฉียงตามแนวทแยง (ราว 8%..92% ของภาพ): ขวาน/กระบอง/คทา ด้ามซ้ายล่าง • มีด/ดาบ ด้ามขวาบน (rev)
  ICON_A: 0.08, ICON_B: 0.92,
  // อาวุธที่ยังไม่มีไอคอนเฉพาะ: ใช้ไอคอนชิ้นพื้นฐานของชนิดเดียวกัน
  BASE: { dagger: 'knife', sword: 'sword', axe: 'hand_axe', mace: 'mace', rod: 'rod', bow: 'bow' },

  key(gk) {
    return this.ON && typeof PAPERDOLL_DATA !== 'undefined' && PAPERDOLL_DATA[gk] && Anim.has(gk + '_bare') ? gk + '_bare' : null;
  },
  // ข้อมูลเฟรม: ใช้ชื่อท่าที่ภาพจริงเล่นอยู่ (Anim.pick คืน action)
  frame(gk, p) {
    const d = PAPERDOLL_DATA[gk], a = d && d[p.action || 'walk'];
    if (!a) return null;
    return { hand: a.hand[p.row] && a.hand[p.row][p.f], head: a.head[p.row] && a.head[p.row][p.f] };
  },
  // หันหลัง (แถว 5,6,7 = ซ้ายบน/บน/ขวาบน): อาวุธอยู่หลังตัว
  isBack(row) { return row >= 5 && row <= 7; },

  icon(it) { return it && (Art.get('item_' + it.id) || Art.get('item_' + (this.BASE[it.wtype] || ''))); },

  // ธนูไม่เคยฟัน: ตอนโจมตีด้วยธนู Anim ใช้ท่า shoot (ถ้ามีภาพ) ไม่มีก็ยืนถือธนูนิ่ง ๆ ให้ลูกศร (เอฟเฟกต์เกม) บินออกไป
  weapon(g, it, hand) {
    const img = this.icon(it);
    if (!img || !hand) return;
    const spec = this.W[it.wtype] || this.W.dagger;
    const s = img.width, a0 = this.ICON_A * s, b0 = this.ICON_B * s;
    const diag = (b0 - a0) * Math.SQRT2, k = spec.len / diag;
    const hx = hand[0], hy = hand[1];
    let ang = hand[2];
    if (spec.up && Math.sin(ang) > 0) ang += Math.PI;
    if (spec.stand) ang += Math.atan2(Math.sin(-Math.PI / 2 - ang), Math.cos(-Math.PI / 2 - ang)) * spec.stand;
    g.save();
    g.translate(hx - Anim.CX, hy - Anim.GROUND);
    // ไอคอนวาดเฉียง 45° → หมุนให้แนวด้าม→ปลายตรงกับมุมในเฟรม และให้จุดจับ (ห่างจากปลายด้าม grip) อยู่ที่มือ
    let gx, gy;
    if (spec.rev) { g.rotate(ang - Math.PI * 3 / 4); gx = b0 - (b0 - a0) * spec.grip; gy = a0 + (b0 - a0) * spec.grip; }
    else { g.rotate(ang + Math.PI / 4); gx = a0 + (b0 - a0) * spec.grip; gy = b0 - (b0 - a0) * spec.grip; }
    g.scale(k, k);
    g.drawImage(img, -gx, -gy);
    g.restore();
  },

  // วาดมือ (จากภาพตัวเปล่า) ทับด้ามอีกรอบ ให้ดูเหมือนนิ้วกำด้ามไว้ ไม่ใช่อาวุธแปะทับมือ
  FIST_R: 8, FIST_BACK: 5,
  fist(g, fr, hand) {
    const C = Anim.CELL, cx = hand[0] - Math.cos(hand[2]) * this.FIST_BACK - Anim.CX, cy = hand[1] - Math.sin(hand[2]) * this.FIST_BACK - Anim.GROUND;
    g.save();
    g.beginPath(); g.arc(cx, cy, this.FIST_R, 0, Math.PI * 2); g.clip();
    g.drawImage(fr.img, fr.f * C, fr.row * C, C, C, -Anim.CX, -Anim.GROUND, C, C);
    g.restore();
  },

  hat(g, id, head, row, gk) {
    const spec = this.HAT[id], img = spec && Art.get('item_' + id);
    if (!img || !head) return;
    const w = spec.w, h = w * img.height / img.width;
    // ไอคอนหมวกหันซ้าย: ตัวละครหันขวา (แถว 7,0,1) กลับด้าน
    const right = row === 7 || row === 0 || row === 1, left = row >= 3 && row <= 5;
    const dx = right ? spec.dx : left ? -spec.dx : 0;
    g.save();
    g.translate(head[0] - Anim.CX + dx, head[1] - Anim.GROUND + spec.dy + (this.HEAD_DY[gk] || 0));
    if (right) g.scale(-1, 1);
    g.drawImage(img, -w / 2, -h / 2 - h * 0.12, w, h);
    g.restore();
  },

  // ส่งเข้า Anim.draw เป็น st.under / st.over (วาดในพิกัดช่องภาพ หลังตั้งตำแหน่ง/สเกลแล้ว)
  layers(gk, p) {
    const w = p.equip.weapon ? ITEMS[p.equip.weapon.id] : null;
    const wid = w ? Object.assign({ id: p.equip.weapon.id }, w) : null;
    const hid = p.equip.head ? p.equip.head.id : null;
    return {
      under: (g, fr) => {
        const d = this.frame(gk, fr); if (!d) return;
        if (this.isBack(fr.row)) this.weapon(g, wid, d.hand);
      },
      over: (g, fr) => {
        const d = this.frame(gk, fr); if (!d) return;
        if (!this.isBack(fr.row) && wid && d.hand) {
          this.weapon(g, wid, d.hand);
          this.fist(g, fr, d.hand);
        }
        if (hid && fr.action !== 'dead') this.hat(g, hid, d.head, fr.row, gk);
      },
    };
  },
};
