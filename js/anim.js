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
    shoot: { loop: false, alt: 'idle' }, // ยิงธนู (ท่าแยกของ Class ที่ใช้ธนู) — ยังไม่มีภาพ: ยืนถือธนูนิ่ง ไม่เล่นท่าฟัน
    cast: { cycle: 0.56, loop: true, alt: 'attack' },
    buff: { loop: false, alt: 'cast' },  // ใช้สกิลบัฟ/ฮีล/กับตัวเอง (ยังไม่มีภาพ = ใช้ท่าร่าย)
    skill: { loop: false, alt: 'cast' }, // ใช้สกิลโจมตีใส่ศัตรู (ยังไม่มีภาพ = ใช้ท่าร่าย)
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
  // กรอบเนื้อภาพ (บน/ล่าง) ของเฟรมหนึ่ง — วัดครั้งเดียวแล้วจำ
  frameBox(img, f, row) {
    const key = row * 64 + f, cache = img._box || (img._box = {});
    if (cache[key] !== undefined) return cache[key];
    let box = null;
    try {
      const C = this.CELL, c = document.createElement('canvas'); c.width = C; c.height = C;
      const g = c.getContext('2d'); g.drawImage(img, f * C, row * C, C, C, 0, 0, C, C);
      const d = g.getImageData(0, 0, C, C).data;
      let top = -1, bot = -1;
      for (let y = 0; y < C; y++) { let any = false; for (let x = 0; x < C; x += 2) if (d[(y * C + x) * 4 + 3] > 80) { any = true; break; } if (any) { if (top < 0) top = y; bot = y; } }
      if (top >= 0) box = { top, bot };
    } catch (e) { /* อ่านพิกเซลไม่ได้ */ }
    return (cache[key] = box);
  },
  stillFrame(img, n, row) {
    const r = this.feet(img, n)[row];
    return r ? r.still : Math.min(1, n - 1);
  },
  // รูปหน้าในกรอบโปรไฟล์: ครอปหัวจากท่ายืนหันหน้า (ตัวเดียวกับในเกม)
  drawFace(g, key, w, h) {
    const s = this.strip(key, 'idle'); if (!s) return false;
    const C = this.CELL, row = s.dirs === 8 ? 2 : 0, f = s.dirs === 8 ? 0 : 0;
    let top = this.GROUND - this.STD_H;
    try {
      if (s.img._faceTop == null) {
        const c = document.createElement('canvas'); c.width = C; c.height = C;
        const cg = c.getContext('2d'); cg.drawImage(s.img, f * C, row * C, C, C, 0, 0, C, C);
        const d = cg.getImageData(0, 0, C, C).data;
        let ty = -1;
        for (let y = 0; y < C && ty < 0; y++) for (let x = 80; x < 160; x++) if (d[(y * C + x) * 4 + 3] > 100) { ty = y; break; }
        s.img._faceTop = ty < 0 ? top : ty;
      }
      top = s.img._faceTop;
    } catch (e) { /* อ่านพิกเซลไม่ได้ ใช้ค่ามาตรฐาน */ }
    const size = 76;
    g.drawImage(s.img, f * C + this.CX - size / 2, row * C + top - 2, size, size * h / w, 0, 0, w, h);
    return true;
  },
  // ภาพติดตา (motion blur) ของอาวุธตอนฟัน: ภาพเฟรมก่อนหน้า "เฉพาะส่วนที่ขยับไปแล้ว" (มีในเฟรมก่อน ไม่มีในเฟรมนี้ = อาวุธ/แขนที่เหวี่ยง)
  // เบลอเล็กน้อย วาดจางใต้ตัวละคร 2 ชั้น (เฟรม −1 ชัดกว่า −2) • แคชต่อเฟรม (ภาพ 240px ไม่กี่สิบช่อง)
  ghost(img, row, f, back) {
    const C = this.CELL, key = row * 64 * 4 + f * 4 + back, c = img._ghost || (img._ghost = {});
    if (c[key] !== undefined) return c[key];
    const cv = document.createElement('canvas'); cv.width = C; cv.height = C;
    const g = cv.getContext('2d');
    try {
      g.filter = 'blur(2.2px)';
      g.drawImage(img, (f - back) * C, row * C, C, C, 0, 0, C, C);
      g.filter = 'none'; g.globalCompositeOperation = 'destination-out';
      g.drawImage(img, f * C, row * C, C, C, 0, 0, C, C); // ลบส่วนที่ยังอยู่ที่เดิม (ลำตัว) ออก
    } catch (e) { return (c[key] = null); }
    return (c[key] = cv);
  },
  motionBlur(g, p) {
    const C = this.CELL;
    for (const [back, a] of [[2, 0.3], [1, 0.6]]) {
      if (p.f - back < 0) continue;
      const gh = this.ghost(p.img, p.row, p.f, back); if (!gh) continue;
      g.save(); g.globalAlpha *= a; g.drawImage(gh, -this.CX, -this.GROUND, C, C); g.restore();
    }
  },
  has(key) { return !!Art.get(`anim_${key}_idle`) || !!Art.get(`anim_${key}_walk`); },
  // ชุดภาพของตัวละครผู้เล่น: ของ Class ตัวเอง • Class 2 ที่ยังไม่มีภาพ → ใช้ภาพ Class ต้นสาย (ไม่ใช่ตัววาดด้วยโค้ดแบบเก่า)
  playerKey(job, gender) {
    const g = gender === 'm' ? 'm' : 'f', own = `${job}_${g}`;
    if (this.has(own)) return own;
    const par = typeof JOBS !== 'undefined' && JOBS[job] && JOBS[job].parent;
    return par && this.has(`${par}_${g}`) ? `${par}_${g}` : own;
  },

  // เลือกท่าและเฟรมจากสถานะตัวละคร
  // st: { moving, atk (1→0), cast, hurt (0..1), sit, dead, deathT }
  pick(key, st, t) {
    let action = 'idle', k = null;
    // มึน: ล้มลงด้วยเฟรมแรก ๆ ของท่าตาย (ไม่ถึงเฟรมสุดท้ายที่ไฟหน้ากากดับ) นอนค้าง แล้วเล่นย้อนกลับตอนลุก
    if (st.stun && !st.dead) {
      const s = this.strip(key, 'dead');
      if (s && s.action === 'dead') {
        const top = Math.max(0, s.n - 2), step = 0.11;
        const f = Math.max(0, Math.min(top, Math.floor(st.stun.e / step), Math.floor(st.stun.r / step)));
        const dir = st.dir != null ? st.dir : (st.facing > 0 ? 0 : 4);
        return { img: s.img, f, row: s.dirs === 8 ? dir : 0, flip: s.dirs === 8 ? false : st.facing > 0, action: 'dead', n: top + 1 };
      }
    }
    if (st.dead) { action = 'dead'; k = Math.min(1, (st.deathT == null ? 1 : st.deathT) / 0.5); }
    else if (st.hurt > 0) { action = 'hurt'; k = 1 - st.hurt; }
    else if (st.skill > 0) { action = st.skillKind === 'buff' ? 'buff' : st.skillKind === 'skill' ? 'skill' : 'cast'; k = 1 - st.skill; }
    else if (st.atk > 0) {
      k = 1 - st.atk; action = 'attack';
      // ธนูมีไว้ยิง ไม่ได้ฟัน: ใช้ท่ายิงถ้ามีภาพ ไม่มีก็ยืนนิ่ง (ลูกศรเป็นเอฟเฟกต์ของเกม)
      if (st.shoot) { const sh = this.strip(key, 'shoot'); if (sh && sh.action === 'shoot') action = 'shoot'; else { action = 'idle'; k = null; } }
    }
    else if (st.cast) action = 'cast';
    else if (st.sit) action = 'sit';
    else if (st.moving) action = 'walk';
    // Class ธนู: ใช้สกิล/ร่าย = ท่ายิงเดียวกับท่าโจมตี (ไม่มีท่าร่ายแยก)
    // (ท่าบัฟ/ท่าสกิลโจมตีของตัวเอง ถ้ามีภาพแยกก็ใช้ภาพนั้น)
    if ((action === 'cast' || action === 'buff' || action === 'skill') && st.shoot) {
      const own = this.strip(key, action), sh = this.strip(key, 'shoot');
      if ((action === 'cast' || !own || own.action !== action) && sh && sh.action === 'shoot') action = 'shoot';
    }
    const s = this.strip(key, action); if (!s) return null;
    // ท่าเดินเป็น 8 ทิศแต่ท่ายืนเป็นภาพทิศเดียว (มักเป็นคนละชุดภาพ ตัวจะดูเปลี่ยนไปตอนหยุด):
    // ยืนด้วยเฟรมกลางก้าวของท่าเดินทิศนั้นแทน + หายใจเบา ๆ ตัวละครจึงเป็นแบบเดียวกันตลอด
    if (action === 'idle') {
      const w = this.strip(key, 'walk');
      if (w && w.dirs === 8 && s.dirs !== 8) {
        const dir = st.dir != null ? st.dir : (st.facing > 0 ? 0 : 4);
        return { img: w.img, f: this.stillFrame(w.img, w.n, dir), row: dir, flip: false, breathe: true, action: 'walk' };
      }
    }
    const def = this.ACTIONS[s.action];
    let f;
    if (s.action === 'walk' && action !== 'walk') f = this.stillFrame(s.img, s.n, st.dir != null ? st.dir : (st.facing > 0 ? 0 : 4)); // ยืนนิ่งด้วยเฟรมเท้าชิดของท่าเดิน (ยังไม่มีภาพท่าอื่น)
    else if (k != null && (!def.loop || st.skill > 0)) f = Math.min(s.n - 1, Math.floor(k * s.n)); // ท่าที่เล่นครั้งเดียว (รวมท่าใช้สกิล): ตามความคืบหน้า
    else f = Math.floor((t + (st.seed || 0)) / ((def.cycle || 1) / s.n)) % s.n;
    // แถว: ภาพ 8 ทิศเลือกตามทิศที่หัน, ภาพทิศเดียวใช้แถวแรกแล้วกลับด้านตอนหันขวา
    const dir = st.dir != null ? st.dir : (st.facing > 0 ? 0 : 4);
    const row = s.dirs === 8 ? dir : 0;
    // ท่าเดิน: ยกตัวขึ้นเล็กน้อยตอนก้าวผ่าน ลงตอนเหยียบ (ขั้นละเฟรม ตามจังหวะขาในภาพ) ให้เห็นการก้าวชัดขึ้น
    let lift = 0;
    if (s.action === 'walk' && action === 'walk') { const fr = this.feet(s.img, s.n)[row]; lift = fr && Math.max(0, f) % 2 === fr.pass ? 3 : 0; }
    return { img: s.img, f: Math.max(0, f), row, flip: s.dirs === 8 ? false : st.facing > 0, lift, breathe: s.action === 'idle' && s.n === 1, action: s.action, n: s.n };
  },

  // วาดที่ตำแหน่งเท้า (x, y), ตัวสูงราว H px, facing>0 = หันขวา (ภาพต้นฉบับหันซ้าย)
  draw(g, x, y, key, st, t, H = 66) {
    const p = this.pick(key, st, t); if (!p) return false;
    const k = H / this.STD_H, C = this.CELL;
    // ท่าล้ม: ภาพนอนราบยึดที่ปลายเท้า ดูเหมือนลอย → เลื่อนให้กลางลำตัวทับจุดยืน (ค่อย ๆ เลื่อนตามจังหวะล้ม) + เงากว้างขึ้น
    let sink = 0;
    if (p.action === 'dead') {
      const b = this.frameBox(p.img, p.f, p.row);
      if (b) sink = Math.max(0, this.GROUND - 24 - (b.top + b.bot) / 2) * (p.n > 1 ? p.f / (p.n - 1) : 1);
    }
    if (sink) Sprites.shadow(g, x, y, H * 0.46, H * 0.13, 0.32); else Sprites.shadow(g, x, y, H * 0.3, H * 0.09, 0.3);
    g.save();
    // ตายแต่ยังไม่มีภาพท่าล้มของ Class นี้: ยืนเป็นเงาสีเทาจาง ๆ ให้รู้ว่าตายแล้ว (แทนยืนปกติ) จนกว่าจะมีภาพ
    if (st.dead && p.action !== 'dead' && p.action !== 'hurt') { g.globalAlpha *= 0.55; st = Object.assign({}, st, { filter: 'grayscale(1) brightness(0.75)' }); }
    g.translate(x, y - (st.raise || 0) + sink * k);
    if (p.lift) g.translate(0, -p.lift * k);
    g.scale(p.flip ? -k : k, k * (p.breathe ? 1 + Math.sin(t * 2.4 + (st.seed || 0)) * 0.012 : 1));
    if (st.under) st.under(g, p); // ชั้นหลังตัว (เช่นอาวุธตอนหันหลัง — Paperdoll)
    if (st.blur && (p.action === 'attack' || p.action === 'skill') && p.f > 0) this.motionBlur(g, p);
    if (st.flash) g.filter = 'brightness(1.9)';
    if (st.filter) { // ใส่ filter ที่ช่องเฟรมขนาด 240px แทนแคนวาสหลัก (filter บนแคนวาสหลัก = เลเยอร์เต็มจอ ช้ามาก)
      const fc = this._fc || (this._fc = document.createElement('canvas'));
      if (fc.width !== C) { fc.width = C; fc.height = C; }
      const fg = fc.getContext('2d');
      fg.clearRect(0, 0, C, C); fg.filter = st.filter;
      fg.drawImage(p.img, p.f * C, p.row * C, C, C, 0, 0, C, C); fg.filter = 'none';
      g.drawImage(fc, 0, 0, C, C, -this.CX, -this.GROUND, C, C);
    } else g.drawImage(p.img, p.f * C, p.row * C, C, C, -this.CX, -this.GROUND, C, C);
    if (st.over) { g.filter = 'none'; st.over(g, p); } // ชั้นหน้าตัว (อาวุธในมือ/หมวก)
    g.restore();
    return true;
  },
};
