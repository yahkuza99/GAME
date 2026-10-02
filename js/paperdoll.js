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
  // guard = หาการ์ดจากภาพเอง แล้วให้ขอบหน้ากำปั้นชนการ์ดพอดี (ไม่มีด้ามโผล่ระหว่างมือกับการ์ด)
  W: {
    dagger: { len: 46, grip: 0.18, rev: 1, guard: 1 },
    sword: { len: 74, grip: 0.14, rev: 1, guard: 1 },
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
  // ไอคอนในเกมวาดเฉียงตามแนวทแยง: ขวาน/กระบอง/คทา ด้ามซ้ายล่าง • มีด/ดาบ ด้ามขวาบน (rev)
  // อาวุธที่ยังไม่มีไอคอนเฉพาะ: ใช้ไอคอนชิ้นพื้นฐานของชนิดเดียวกัน
  BASE: { dagger: 'knife', sword: 'sword', axe: 'hand_axe', mace: 'mace', rod: 'rod', bow: 'bow' },

  // เจ้าของเลือก (2026-10-02): ไม่เปลี่ยนอาวุธตามของที่สวม — แต่ละ Class ถืออาวุธประจำ Class ตลอด
  // (Class 2 ใช้ของ Class 1 ต้นสาย) • ภาพอาวุธเฉพาะ Class ทีหลังได้: assets/cweapon_<class>.webp (วาดเฉียงแบบไอคอน)
  CLASS_WEAPON: { einherjar: 'sword', runecaster: 'rune_staff', wildhunter: 'bow', volva: 'mace', trickster: 'main_gauche', berserker: 'battle_axe' },
  CLASS_LEN: { berserker: 1.3 }, // อาวุธใหญ่กว่าปกติ (ขวานสองมือ)
  baseJob(job) {
    if (this.CLASS_WEAPON[job]) return job;
    if (typeof SECOND_JOBS !== 'undefined') for (const b in SECOND_JOBS) if (SECOND_JOBS[b].includes(job)) return b;
    return null;
  },
  classWeapon(job) {
    const b = this.baseJob(job), id = b && this.CLASS_WEAPON[b];
    if (!id || !ITEMS[id]) return null;
    return Object.assign({ id, cls: b }, ITEMS[id]);
  },
  // ภาพตัวเปล่า (ลบแท่งบอกมือแล้ว) ใช้เมื่อ Class นั้นมีอาวุธประจำให้วาด • Novice ใช้ภาพเดิมที่มีมีดในภาพ
  key(gk, job) {
    return this.ON && typeof PAPERDOLL_DATA !== 'undefined' && PAPERDOLL_DATA[gk] && this.classWeapon(job) && Anim.has(gk + '_bare') ? gk + '_bare' : null;
  },
  // ข้อมูลเฟรม: ใช้ชื่อท่าที่ภาพจริงเล่นอยู่ (Anim.pick คืน action)
  frame(gk, p) {
    const d = PAPERDOLL_DATA[gk], a = d && d[p.action || 'walk'];
    if (!a) return null;
    return { hand: a.hand[p.row] && a.hand[p.row][p.f], head: a.head[p.row] && a.head[p.row][p.f] };
  },
  // หันหลัง (แถว 5,6,7 = ซ้ายบน/บน/ขวาบน): อาวุธอยู่หลังตัว
  isBack(row) { return row >= 5 && row <= 7; },

  // วัดไอคอนครั้งเดียว: ปลายด้าม (t0) ปลายอาวุธ (t1) และการ์ด (จุดกว้างสุดช่วงต้น) ตามแนวทแยง + ทำภาพมีเส้นขอบเข้ม
  // ให้เข้ากับตัวละครที่ตัดเส้นหนา
  OUTLINE: 3.5, OUTLINE_COL: 'rgba(28,20,24,0.92)',
  measure(img, rev) {
    const key = rev ? '_pdR' : '_pdN';
    if (img[key]) return img[key];
    const sz = img.width, pad = Math.ceil(this.OUTLINE) + 1;
    let t0 = sz * 0.08 * Math.SQRT2, t1 = sz * 0.92 * Math.SQRT2, guard = null;
    const out = document.createElement('canvas'); out.width = out.height = sz + pad * 2;
    const og = out.getContext('2d');
    try {
      const c = document.createElement('canvas'); c.width = c.height = sz;
      const cg = c.getContext('2d'); cg.drawImage(img, 0, 0);
      const d = cg.getImageData(0, 0, sz, sz).data;
      const op = (x, y) => { x |= 0; y |= 0; return x >= 0 && y >= 0 && x < sz && y < sz && d[(y * sz + x) * 4 + 3] > 60; };
      // เริ่มจากมุมด้าม (rev = ขวาบน, ปกติ = ซ้ายล่าง) ไล่ไปทางปลาย
      const D = sz * Math.SQRT2, ux = rev ? -Math.SQRT1_2 : Math.SQRT1_2, uy = rev ? Math.SQRT1_2 : -Math.SQRT1_2;
      const ox = rev ? sz : 0, oy = rev ? 0 : sz, w = [];
      for (let t = 0; t < D; t++) {
        let n = 0;
        for (let q = -sz * 0.4; q <= sz * 0.4; q++) if (op(ox + ux * t - uy * q, oy + uy * t + ux * q)) n++;
        w.push(n);
      }
      const on = w.map(v => v > 1);
      t0 = on.indexOf(true); t1 = on.lastIndexOf(true);
      if (t0 >= 0) {
        // การ์ด: ช่วง 45% แรกของด้าม หาจุดกว้างสุดที่กว้างกว่าด้าม (ช่วงแคบสุด) ชัดเจน
        const L = t1 - t0, end = t0 + Math.floor(L * 0.45);
        let mx = -1, mi = t0, mn = 1e9;
        for (let t = t0 + 2; t <= end; t++) { if (w[t] > mx) { mx = w[t]; mi = t; } }
        for (let t = t0 + 2; t < mi; t++) mn = Math.min(mn, w[t]);
        if (mx > mn * 1.8 && mi > t0 + L * 0.15) {
          // ขอบล่างของการ์ด (ฝั่งด้าม) = จุดแรกก่อนจุดกว้างสุดที่ยังกว้างเกินครึ่ง
          let g0 = mi; while (g0 > t0 && w[g0 - 1] > (mx + mn) / 2) g0--;
          guard = g0;
        }
      } else { t0 = sz * 0.08 * Math.SQRT2; t1 = sz * 0.92 * Math.SQRT2; }
    } catch (e) { /* อ่านพิกเซลไม่ได้ ใช้ค่าประมาณ */ }
    // ภาพสะอาด: ตัดเศษเล็ก ๆ ที่ลอยแยกจากตัวอาวุธในไอคอน (ไม่งั้นจะเห็นเป็นจุดลอยข้างตัวละคร)
    const clean = document.createElement('canvas'); clean.width = clean.height = sz;
    const cg2 = clean.getContext('2d'); cg2.drawImage(img, 0, 0);
    const sil = document.createElement('canvas'); sil.width = sil.height = sz;
    const sg = sil.getContext('2d');
    try {
      const id = cg2.getImageData(0, 0, sz, sz), d = id.data, lab = new Int32Array(sz * sz), area = [0];
      for (let i = 0; i < sz * sz; i++) {
        if (lab[i] || d[i * 4 + 3] <= 60) continue;
        const id_ = area.length, st = [i]; lab[i] = id_; let n = 0;
        while (st.length) {
          const j = st.pop(), x = j % sz, y = (j / sz) | 0; n++;
          for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { // ห่างกันไม่เกิน 2px นับเป็นชิ้นเดียว
            const xx = x + dx, yy = y + dy, q = yy * sz + xx;
            if (xx >= 0 && yy >= 0 && xx < sz && yy < sz && !lab[q] && d[q * 4 + 3] > 60) { lab[q] = id_; st.push(q); }
          }
        }
        area.push(n);
      }
      const big = Math.max(...area);
      for (let i = 0; i < sz * sz; i++) if (d[i * 4 + 3] > 0 && (!lab[i] ? true : area[lab[i]] < big * 0.04)) d[i * 4 + 3] = lab[i] ? 0 : d[i * 4 + 3] > 20 ? d[i * 4 + 3] : 0;
      cg2.putImageData(id, 0, 0);
      for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 110 ? 255 : 0; // เงาจากพิกเซลทึบจริงเท่านั้น
      sg.putImageData(id, 0, 0);
    } catch (e) { sg.drawImage(img, 0, 0); }
    // เส้นขอบเข้ม (ให้เข้ากับตัวละครที่ตัดเส้นหนา): วาดเงาทึบเลื่อนรอบทิศ แล้ววาดภาพจริงทับ
    sg.globalCompositeOperation = 'source-in'; sg.fillStyle = this.OUTLINE_COL; sg.fillRect(0, 0, sz, sz);
    const r = this.OUTLINE;
    for (let a = 0; a < 16; a++) og.drawImage(sil, pad + Math.cos(a / 16 * Math.PI * 2) * r, pad + Math.sin(a / 16 * Math.PI * 2) * r);
    og.drawImage(clean, pad, pad);
    return (img[key] = { t0, t1, len: Math.max(1, t1 - t0), guard, out, pad });
  },

  icon(it) { return it && ((it.cls && Art.get('cweapon_' + it.cls)) || Art.get('item_' + it.id) || Art.get('item_' + (this.BASE[it.wtype] || ''))); },

  // ธนูไม่เคยฟัน: ตอนโจมตีด้วยธนู Anim ใช้ท่า shoot (ถ้ามีภาพ) ไม่มีก็ยืนถือธนูนิ่ง ๆ ให้ลูกศร (เอฟเฟกต์เกม) บินออกไป
  weapon(g, it, hand) {
    const img = this.icon(it);
    if (!img || !hand) return;
    const spec = this.W[it.wtype] || this.W.dagger;
    const m = this.measure(img, !!spec.rev), k = spec.len * (this.CLASS_LEN[it.cls] || 1) / m.len;
    let ang = hand[2];
    if (spec.up && Math.sin(ang) > 0) ang += Math.PI;
    if (spec.stand) ang += Math.atan2(Math.sin(-Math.PI / 2 - ang), Math.cos(-Math.PI / 2 - ang)) * spec.stand;
    // จุดที่ต้องอยู่ตรงมือ (ระยะตามแนวทแยงจากมุมด้ามของภาพ, หน่วย px ของไอคอน)
    const at = spec.guard && m.guard != null ? m.guard - 2 : m.t0 + (m.t1 - m.t0) * spec.grip;
    g.save();
    g.translate(hand[0] - Anim.CX, hand[1] - Anim.GROUND);
    // ไอคอนวาดเฉียง 45° → หมุนให้แนวด้าม→ปลายตรงกับมุมในเฟรม
    g.rotate(ang - (spec.rev ? Math.PI * 3 / 4 : -Math.PI / 4));
    g.scale(k, k);
    const u = at / Math.SQRT2, pad = m.pad, sz = img.width;
    // มุมด้ามของภาพ: rev = ขวาบน (sz, 0), ปกติ = ซ้ายล่าง (0, sz)
    const px = spec.rev ? sz - u : u, py = spec.rev ? u : sz - u;
    g.drawImage(m.out, -px - pad, -py - pad);
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
  // bare = วาดบนภาพตัวเปล่า (ใส่อาวุธประจำ Class) • ไม่ใช่ = ภาพเดิมที่มีอาวุธในภาพแล้ว (ใส่แค่หมวก)
  layers(gk, p, bare) {
    if (!this.ON || typeof PAPERDOLL_DATA === 'undefined' || !PAPERDOLL_DATA[gk]) return {};
    const wid = bare ? this.classWeapon(p.job) : null;
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
