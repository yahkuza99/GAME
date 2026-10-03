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
  // floor = ปลายอาวุธห้ามต่ำกว่า y นี้ (px ช่อง, พื้น = 220) — หัวขวาน/กระบองกว้าง ต้องเผื่อมากกว่าปลายดาบ
  W: {
    dagger: { len: 46, grip: 0.18, rev: 1, guard: 1, floor: 216 },
    sword: { len: 74, grip: 0.14, rev: 1, guard: 1, floor: 216 },
    axe: { len: 64, grip: 0.14, floor: 196 },
    mace: { len: 64, grip: 0.14, floor: 204 },
    rod: { len: 86, grip: 0.36, up: 1, stand: 0.8 },
    bow: { len: 80, grip: 0.5, up: 1, stand: 0.6 },
  },
  FLOOR: 214,
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
  // (Class 2 ใช้ของ Class 1 ต้นสาย) • ภาพอาวุธเฉพาะ Class: assets/cweapon_<class>.webp (ด้ามซ้ายล่าง ปลายขวาบน — prompt: docs/CLASS_WEAPONS.md)
  CLASS_WEAPON: { einherjar: 'sword', runecaster: 'rune_staff', wildhunter: 'bow', volva: 'mace', trickster: 'main_gauche', berserker: 'battle_axe' },
  // ---------------- โครงการถืออาวุธ (grip skeleton) ต่อ Class ต่อท่า ----------------
  // ค่าพื้นฐานมาจาก W[ชนิดอาวุธ] แล้วทับด้วย GRIP[Class]['*'] และ GRIP[Class][ท่า]
  //   len  = ความยาวอาวุธ (px ในช่อง 240)     grip = มือจับตรงไหน (0 = ปลายด้าม, 1 = ปลายหัว)
  //   up   = หัวอาวุธชี้ขึ้นเสมอ (ถือตั้ง)      stand = ดึงเข้าหาแนวตั้ง 0..1 (ยังอิงมุมแท่งมาร์กเกอร์)
  //   lean = ถือตั้งแบบไม่อิงมุมแท่งเลย: หัวขึ้น เอียงยอดออกจากลำตัว lean องศา (ไม้เท้า/ธนู/ขวานพาดไหล่)
  //          ฝั่งที่เอียง = ฝั่งที่มืออยู่เทียบกับหัว (มือซ้ายของจอ → ยอดเอียงซ้าย) • แถวหันข้าง (0/4) ที่มืออยู่กลางตัว → เอียงไปทางหลัง
  //   rot  = หมุนเพิ่ม (องศา)                  flip = กลับหัว (หัวชี้ไปทางตรงข้ามแท่งในภาพ)
  // ท่าที่ไม่ได้ระบุ ใช้ '*' • แก้รายเฟรมได้ใน js/paperdoll_fix.js (หน้า tools/grip_tuner.html)
  GRIP: {
    // ดาบ: เดินถือปลายชี้ลงหน้า การ์ดชนหน้ากำปั้น (ตาม W.sword)
    einherjar: { '*': { len: 76 } },
    // ไม้เท้ารูน: ถือตั้งแบบไม้เท้าเดิน ยอดเอียงออกจากตัวเล็กน้อย ลูกแก้วอยู่ข้างศีรษะ (ไม่ทับหน้า) ปลายล่างเกือบถึงพื้น
    runecaster: { '*': { len: 112, grip: 0.47, lean: 16 } },
    // ธนู: ถือตั้งจับกลางคัน เกือบตั้งตรงข้างขา
    wildhunter: { '*': { len: 92, grip: 0.5, lean: 8 } },
    // คทาทองของ Völva: เดิน/ยืน ถือตั้งหัวขึ้นแบบไม้เท้า • ร่าย: ชูตามแขน (อิงแท่ง หัวขึ้น) • ตี: มือเลื่อนลงไปจับปลายด้าม หัวคทาไปตามแท่ง (ทุบ)
    // ความยาวเท่ากันทุกท่า ไม่ให้คทาเปลี่ยนขนาดตอนสลับท่า • เฟรมทุบลงพื้นถูก floor ยกขึ้นให้ไม่ตกขอบช่อง
    volva: { '*': { len: 72, grip: 0.3, lean: 12 }, cast: { lean: null, up: 1, stand: 0.5 }, attack: { lean: null, grip: 0.12, up: 0, stand: 0 } },
    // มีดสั้นมือซ้าย: ยาวราวแขนท่อนล่าง การ์ดวงชนหน้ากำปั้น
    trickster: { '*': { len: 58 } },
    // ขวานสองมือใหญ่: มือต่ำระดับเข่า ถ้าให้หัวขวานชี้ลงตามแท่งจะปักพื้น → ถือกลับหัว หัวขวานขึ้นพาดไหล่ (ด้ามเอียงไปทางหลัง)
    berserker: { '*': { len: 76, grip: 0.15, lean: 22 } },
  },
  spec(it, act) {
    const base = this.W[it.wtype] || this.W.dagger, g = (it.cls && this.GRIP[it.cls]) || {};
    return Object.assign({}, base, g['*'] || {}, g[act] || {});
  },
  baseJob(job) {
    if (this.CLASS_WEAPON[job]) return job;
    if (typeof SECOND_JOBS !== 'undefined') for (const b in SECOND_JOBS) if (SECOND_JOBS[b].includes(job)) return b;
    if (typeof jobRoot === 'function' && JOBS[job] && this.CLASS_WEAPON[jobRoot(job)]) return jobRoot(job); // Class 3: อาวุธประจำ Class แรกของสาย (จนกว่าจะมี cweapon ของตัวเอง)
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
    const act = p.action || 'walk', i = p.row * 64 + p.f;
    const F = typeof PAPERDOLL_FIX !== 'undefined' && PAPERDOLL_FIX[gk] && PAPERDOLL_FIX[gk][act];
    const fix = F && F[i];
    const D = typeof PAPERDOLL_DEPTH !== 'undefined' && PAPERDOLL_DEPTH[gk] && PAPERDOLL_DEPTH[gk][act];
    const depth = this.depthRange(fix && fix[3], D && D[i], p.row);
    return { hand: a.hand[p.row] && a.hand[p.row][p.f], head: a.head[p.row] && a.head[p.row][p.f], fix, depth, row: p.row };
  },
  // ---------------- ชั้นหน้า/หลังตัว (layering) ----------------
  // ช่วงของอาวุธที่อยู่ "หน้าตัว" = [s0, s1] ระยะตามแนวแท่งมาร์กเกอร์จากจุดมือ (px, ไปทางปลายแท่ง = บวก) ส่วนนอกช่วงวาดไว้หลังตัว
  // ลำดับ: ช่องที่ 4 ของ PAPERDOLL_FIX ('F' = หน้าทั้งชิ้น, 'B' = หลังทั้งชิ้น, [s0,s1]) > PAPERDOLL_DEPTH (วัดจากภาพแท่ง: tools/paperdoll_depth.py)
  //        > กฎแถว: หันหลัง (แถว 5,6,7) อยู่หลังตัว ที่เหลือหน้าตัว
  // วาดจริง: ส่วนหลังตัววาดก่อนภาพตัว (under) ส่วนหน้าตัววาดทับ (over) แล้ววาดกำปั้นจากภาพตัวเปล่าทับด้ามอีกที (fist)
  // → ดาบที่ปลายมุดหลังขา / ไม้เท้าที่ปลายล่างอยู่หลังชายเสื้อ ทำได้ด้วย [s0,s1] ช่วงเดียว ไม่ต้องใช้ mask รายพิกเซล
  FRONT: [-999, 999], BACK: [0, 0],
  depthRange(over, auto, row) {
    const v = over != null ? over : auto;
    if (v === 'F') return this.FRONT;
    if (v === 'B') return this.BACK;
    if (Array.isArray(v) && v.length === 2) return v;
    return this.isBack(row) ? this.BACK : this.FRONT;
  },
  // หันหลัง (แถว 5,6,7 = ซ้ายบน/บน/ขวาบน): อาวุธอยู่หลังตัว (ใช้เมื่อไม่มีข้อมูลชั้น)
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

  // ท่าถืออาวุธของเฟรม (ไม่วาด): จุดมือ/มุมสุดท้าย/ระยะถึงปลาย หลังรวม flip/rot/fix/up/stand และ floor แล้ว
  // คืน { x, y (พิกัดช่อง เทียบ CX/GROUND), ang (เรเดียน ด้าม→ปลาย), reach (px จากมือถึงปลายอาวุธ) } + ค่าภายในให้ weapon()
  // ใช้ร่วมกันระหว่าง weapon() กับเอฟเฟกต์อื่น (js/weapontrail.js) ให้มุม/ระยะตรงกันเสมอ • null = ไม่มีไอคอน/จุดมือ
  // ctx (ไม่บังคับ) = { row, head } ใช้เลือกฝั่งเอียงของอาวุธถือตั้ง (lean) และ depth = ช่วงหน้าตัวตามแนวแท่ง (ดู depthRange)
  pose(it, hand, act, fix, ctx) {
    const img = this.icon(it);
    if (!img || !hand) return null;
    let spec = this.spec(it, act);
    const rev = !!spec.rev && !(it.cls && img === Art.get('cweapon_' + it.cls)); // ภาพอาวุธ Class วาดด้ามซ้ายล่างทุกชิ้น
    const m = this.measure(img, rev), k = spec.len / m.len;
    const dfix = (fix ? fix[2] : 0) * Math.PI / 180;
    let ang = hand[2] + (spec.flip ? Math.PI : 0) + (spec.rot || 0) * Math.PI / 180 + dfix;
    if (spec.lean != null) {
      // ถือตั้ง: หัวขึ้น ยอดเอียงออกจากตัว • ฝั่ง = มืออยู่ซ้าย/ขวาของหัว; มือเกือบตรงกลาง (แถวหันข้าง) → เอียงไปทางหลัง
      const row = ctx && ctx.row, hx = ctx && ctx.head ? ctx.head[0] : Anim.CX, d = hand[0] - hx;
      const side = Math.abs(d) >= 8 ? Math.sign(d) : row === 0 ? -1 : row === 4 ? 1 : hand[0] >= Anim.CX ? 1 : -1;
      ang = -Math.PI / 2 + side * spec.lean * Math.PI / 180 + dfix;
    } else {
      if (spec.up && Math.sin(ang) > 0) ang += Math.PI;
      if (spec.stand) ang += Math.atan2(Math.sin(-Math.PI / 2 - ang), Math.cos(-Math.PI / 2 - ang)) * spec.stand;
    }
    // จุดที่ต้องอยู่ตรงมือ (ระยะตามแนวทแยงจากมุมด้ามของภาพ, หน่วย px ของไอคอน)
    const at = spec.guard && m.guard != null ? m.guard - 2 : m.t0 + (m.t1 - m.t0) * spec.grip;
    const x = hand[0] - Anim.CX + (fix ? fix[0] : 0), y = hand[1] - Anim.GROUND + (fix ? fix[1] : 0);
    // พื้น: ปลายอาวุธ (ระยะจากมือถึงปลายหัว) ห้ามต่ำกว่า floor → หมุนขึ้นเข้าหาแนวนอนเท่าที่จำเป็น
    // (ขวานใหญ่เดินถือต่ำ / กระบองทุบลงพื้น จะไม่ลากพื้นหรือตกขอบช่อง)
    const reach = spec.len * (1 - (at - m.t0) / m.len), hy = y + Anim.GROUND, fl = spec.floor || this.FLOOR;
    if (reach > 0 && hy + Math.sin(ang) * reach > fl) {
      const s = Math.asin(Math.max(-1, Math.min(1, (fl - hy) / reach)));
      ang = Math.cos(ang) >= 0 ? s : Math.PI - s;
    }
    // ช่วงหน้าตัว: แปลงจากแนวแท่งมาร์กเกอร์ → แนวอาวุธจริง (อาวุธถือกลับทิศกับแท่ง เช่นไม้เท้าหัวขึ้น → กลับเครื่องหมาย)
    const dr = (ctx && ctx.depth) || this.FRONT, same = Math.cos(ang - hand[2]) >= 0;
    const front = same ? dr : [-dr[1], -dr[0]];
    return { x, y, ang, reach, img, m, k, at, rev, front, split: !(front[0] <= -999 && front[1] >= 999) };
  },

  // ธนูไม่เคยฟัน: ตอนโจมตีด้วยธนู Anim ใช้ท่า shoot (ถ้ามีภาพ) ไม่มีก็ยืนถือธนูนิ่ง ๆ ให้ลูกศร (เอฟเฟกต์เกม) บินออกไป
  // layer: 'over' = วาดเฉพาะส่วนที่อยู่หน้าตัว (ช่วง front) • 'under' = เฉพาะส่วนหลังตัว • ไม่ระบุ = ทั้งชิ้น
  weapon(g, it, hand, act, fix, ctx, layer) {
    const p = this.pose(it, hand, act, fix, ctx);
    if (!p) return;
    const { m, k, at, rev, img } = p, [f0, f1] = p.front, BIG = 400;
    if (layer === 'over' && f1 <= f0) return;
    if (layer === 'under' && !p.split) return;
    g.save();
    g.translate(p.x, p.y);
    if (layer && p.split) { // ตัดตามแนวอาวุธ: แกน x = จากมือไปทางปลาย (px ช่อง)
      g.rotate(p.ang); g.beginPath();
      if (layer === 'over') g.rect(f0, -BIG, f1 - f0, BIG * 2);
      else { g.rect(-BIG, -BIG, BIG + f0, BIG * 2); g.rect(f1, -BIG, BIG - f1, BIG * 2); }
      g.clip(); g.rotate(-p.ang);
    }
    // ไอคอนวาดเฉียง 45° → หมุนให้แนวด้าม→ปลายตรงกับมุมในเฟรม
    g.rotate(p.ang - (rev ? Math.PI * 3 / 4 : -Math.PI / 4));
    g.scale(k, k);
    const u = at / Math.SQRT2, pad = m.pad, sz = img.width;
    // มุมด้ามของภาพ: rev = ขวาบน (sz, 0), ปกติ = ซ้ายล่าง (0, sz)
    const px = rev ? sz - u : u, py = rev ? u : sz - u;
    g.drawImage(m.out, -px - pad, -py - pad);
    g.restore();
  },

  // วาดมือ (จากภาพตัวเปล่า) ทับด้ามอีกรอบ ให้ดูเหมือนนิ้วกำด้ามไว้ ไม่ใช่อาวุธแปะทับมือ
  // บริเวณที่วาดทับ = แคปซูลตามแนวอาวุธ: จากหลังกำปั้น (FIST_BACK+FIST_R) ถึงหน้ากำปั้น (FIST_FRONT = ชิดการ์ด) กว้าง ±FIST_R
  // (ไม่ใช่วงกลม — วงกลมจะกัดการ์ด/ใบมีดหน้ากำปั้นเป็นรอยโค้ง) • วาดเฉพาะเมื่อจุดมืออยู่ในช่วงหน้าตัว
  FIST_R: 7, FIST_BACK: 6, FIST_FRONT: 2,
  fist(g, fr, p) {
    if (!p || p.front[0] > 0 || p.front[1] < 0) return;
    const C = Anim.CELL, r = this.FIST_R, x0 = -this.FIST_BACK - r, x1 = this.FIST_FRONT;
    g.save();
    g.translate(p.x, p.y); g.rotate(p.ang);
    g.beginPath();
    g.moveTo(x0, -r); g.lineTo(x1, -r); g.arc(x1, 0, r, -Math.PI / 2, Math.PI / 2); g.lineTo(x0, r); g.arc(x0, 0, r, Math.PI / 2, Math.PI * 3 / 2);
    g.closePath(); g.clip();
    g.rotate(-p.ang); g.translate(-p.x, -p.y);
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
      under: (g, fr) => { // ส่วนของอาวุธที่อยู่หลังตัว
        const d = this.frame(gk, fr); if (!d || !wid || !d.hand) return;
        this.weapon(g, wid, d.hand, fr.action, d.fix, d, 'under');
      },
      over: (g, fr) => { // ส่วนที่อยู่หน้าตัว + กำปั้นทับด้าม + หมวก
        const d = this.frame(gk, fr); if (!d) return;
        if (wid && d.hand) {
          this.weapon(g, wid, d.hand, fr.action, d.fix, d, 'over');
          this.fist(g, fr, this.pose(wid, d.hand, fr.action, d.fix, d));
        }
        if (hid && fr.action !== 'dead') this.hat(g, hid, d.head, fr.row, gk);
      },
    };
  },
};
