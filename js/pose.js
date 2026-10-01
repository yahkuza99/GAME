'use strict';
// ============================================================
//  ชั้นท่าทาง (pose layer) ของผู้เล่นทุกคลาสที่ยังไม่มีภาพแอนิเมชันวาดจริง
//  (Novice มีแถบเฟรมจริงใน anim.js → ไม่ยุ่ง)
//
//  Pose.of(p, t) คำนวณท่าต่อตัวละครต่อเฟรม: ยืนหายใจ, รอบเดิน (ก้าว/แกว่งแขน/ยุบตัว/เอน),
//  โจมตี ง้าง→ฟาด→ตามแรง→คืนท่า (ผูกกับดีเลย์โจมตี + ง้างรอระหว่างดีเลย์), ร่ายเวท (ยกมือ+แสง),
//  สะดุ้ง, นั่ง, ล้มตาย — ท่าแยกตามชนิดอาวุธ/สายอาชีพ
//
//  ใช้กับตัวละคร 2 แบบ:
//   • ภาพนิ่ง hero_<job>_<g> (คลาสแรก): Pose.drawHero วาดภาพเป็นแถบแนวนอนแล้วดัดทีละแถบ
//     (เอนช่วงบน, ขาสลับก้าว, ชายเสื้อคลุมพลิ้ว, ย่อตัวตอนนั่ง) + เอฟเฟกต์รอยฟัน
//   • ตัววาดด้วยโค้ด Sprites.human (คลาสขั้น 2): ส่งท่าผ่าน Pose.cur ให้จุดเกี่ยว [POSE] ใน sprites.js
//     (มุมแขน/อาวุธ/ลำตัว/สายธนู) แล้ววาดรอยฟัน วงรูน โล่ ทับด้านหน้า
//  ห่อ Sprites.drawPlayer (ผู้เล่นตัวเอง ผู้เล่นออนไลน์ และภาพตัวอย่างในหน้าต่าง ใช้ทางเดียวกัน)
//  ความจำต่อตัว (เวลาเริ่มท่า, เฟสเดิน) เก็บใน WeakMap ตามวัตถุ → สำเนาชั่วคราวของหน้าต่างพรีวิวไม่ปนกับตัวจริง
//  G.fastSim → ใช้ทางเดิมทั้งหมด • คุณภาพ 'low' → ไม่ดัดแถบภาพ (ขยับทั้งตัว) และเอฟเฟกต์แบบเบา
// ============================================================

const Pose = (() => {
  const TAU = Math.PI * 2;
  const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const sm = (a, b, v) => { const x = cl((v - a) / (b - a)); return x * x * (3 - 2 * x); };
  const EASE = { in: x => x * x * x, out: x => 1 - (1 - x) ** 3, io: x => (x < 0.5 ? 4 * x * x * x : 1 - (2 - 2 * x) ** 3 / 2), lin: x => x };
  const F = ['a', 'b', 'w', 'lean', 'dx', 'bob', 'lift', 'pull', 'sq'];
  const mix = (A, B, k) => { const o = {}; for (const f of F) { const x = A[f] || 0; o[f] = x + ((B[f] || 0) - x) * k; } return o; };
  const lite = () => typeof R !== 'undefined' && R.quality === 'low';
  // สี hex ผสมขาว (k) + ความโปร่งใส → rgba()
  const pale = (hex, k, a) => { const n = parseInt(String(hex).replace('#', ''), 16) || 0x7ad8ff, f = c => Math.round(c + (255 - c) * k); return `rgba(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)},${a})`; };

  // ---------------- สไตล์การเคลื่อนไหวตามสายอาชีพ ----------------
  // rate = ความเร็วรอบเดิน (เรเดียน/วินาที), stride = ช่วงก้าว, bob = ยุบตัว (px), lean = เอนไปหน้าตอนเดิน
  const STYLE = {
    novice:     { rate: 10.5, stride: 1,    bob: 1.3, lean: 0.05, idle: 'calm' },
    einherjar:  { rate: 9.8,  stride: 1,    bob: 1.4, lean: 0.05, idle: 'guard' },
    berserker:  { rate: 9.2,  stride: 1.15, bob: 2.0, lean: 0.10, idle: 'heavy' },
    trickster:  { rate: 12.2, stride: 0.9,  bob: 1.0, lean: 0.09, idle: 'bounce' },
    wildhunter: { rate: 11,   stride: 1,    bob: 1.2, lean: 0.06, idle: 'alert' },
    runecaster: { rate: 9.4,  stride: 0.6,  bob: 0.7, lean: 0.02, idle: 'float' },
    volva:      { rate: 9.4,  stride: 0.7,  bob: 0.8, lean: 0.02, idle: 'serene' },
  };
  const STYLE_JOB = { gythja: { rate: 11, stride: 0.95, bob: 1.1, lean: 0.06, idle: 'bounce' }, skald: { idle: 'sway' } };
  const styleOf = job => {
    const root = typeof jobRoot === 'function' && JOBS[job] ? jobRoot(job) : job;
    return Object.assign({}, STYLE[root] || STYLE.novice, STYLE_JOB[job] || {}, { root });
  };

  // ---------------- ท่าโจมตี: คีย์เฟรมตามชนิดอาวุธ ----------------
  // k = ความคืบหน้า 0..1 ของท่า • a = มุมแขนถืออาวุธ (แบบ Sprites.human: 0 = ห้อยลง, −π/2 = ยื่นหน้า, π = ชูขึ้น)
  // b = แขนอีกข้าง • w = มุมอาวุธเทียบมือ • lean บวก = เอนไปหน้า • dx = พุ่งไปหน้า (px) • bob = ยกตัว • sq = ยุบตัวตอนกระแทก
  // wrap: มุมแขนหมุนครบรอบ (ฟาดข้ามหัว) แล้วกลับท่ายืนโดยหมุนต่อ ไม่ย้อนกลับ
  const ATK = {
    sword: { wrap: true, L: 30, trail: [0.10, 0.30], keys: [
      [0.10, { a: 2.35, b: -0.7, w: 0.9, lean: -0.10, dx: -1, bob: 0.4 }, 'out'],
      [0.30, { a: 5.55, b: 0.45, w: 2.3, lean: 0.16, dx: 3, bob: -1 }, 'in'],
      [0.55, { a: 5.8, b: 0.35, w: 2.35, lean: 0.12, dx: 2.5, bob: -0.6 }, 'out'],
    ] },
    axe: { wrap: true, L: 23, heavy: true, trail: [0.13, 0.33], impact: 0.33, keys: [
      [0.13, { a: 2.8, b: -0.4, w: 1.0, lean: -0.16, dx: -1.5, bob: 0.9 }, 'out'],
      [0.33, { a: 5.85, b: 0.6, w: 2.4, lean: 0.24, dx: 3.5, bob: -2, sq: 0.07 }, 'in'],
      [0.6, { a: 5.95, b: 0.5, w: 2.45, lean: 0.18, dx: 3, bob: -1.5, sq: 0.03 }, 'out'],
    ] },
    mace: { wrap: true, L: 24, heavy: true, trail: [0.13, 0.31], impact: 0.31, keys: [
      [0.13, { a: 3.2, b: -0.3, w: 0.5, lean: -0.13, dx: -0.5, bob: 1.4 }, 'out'],
      [0.31, { a: 5.35, b: 0.5, w: 2.65, lean: 0.2, dx: 3, bob: -2.4, sq: 0.09 }, 'in'],
      [0.6, { a: 5.4, b: 0.45, w: 2.65, lean: 0.16, dx: 2.5, bob: -1.8, sq: 0.04 }, 'out'],
    ] },
    dagger: { L: 16, stabs: [[0.08, 0.2], [0.34, 0.48]], keys: [
      [0.08, { a: 0.6, b: -0.3, w: 1.4, lean: -0.04, dx: -0.5 }, 'out'],
      [0.2, { a: -1.5, b: 0.4, w: 2.5, lean: 0.12, dx: 3 }, 'in'],
      [0.34, { a: -0.3, b: -0.2, w: 1.9, lean: 0.05, dx: 1 }, 'io'],
      [0.48, { a: -1.65, b: 0.5, w: 2.65, lean: 0.15, dx: 3.8 }, 'in'],
      [0.64, { a: -1.55, b: 0.4, w: 2.6, lean: 0.12, dx: 3.2 }, 'out'],
    ] },
    // ธนู: ง้างสายระหว่างรอดีเลย์ (ผู้เล่นตัวเอง) → ปล่อยทันทีที่ลูกออก → สะบัดมือกลับ
    bow: { L: 0, release: 0.2, keys: [
      [0.12, { a: -1.45, b: -1.3, pull: 6, lean: -0.03 }, 'out'],
      [0.2, { a: -1.45, b: 0.55, pull: 0, lean: -0.09, dx: -1.2 }, 'in'],
      [0.5, { a: -1.4, b: 0.3, pull: 0, lean: -0.04, dx: -0.5 }, 'out'],
    ] },
    rod: { L: 29, spark: 0.3, keys: [
      [0.1, { a: 0.7, b: -0.3, w: 0.2, lean: -0.06 }, 'out'],
      [0.3, { a: -2.0, b: 0.3, w: 2.2, lean: 0.12, dx: 2.5 }, 'in'],
      [0.55, { a: -1.9, b: 0.2, w: 2.1, lean: 0.08, dx: 2 }, 'out'],
    ] },
    none: { L: 2, keys: [
      [0.1, { a: 0.6, b: -0.5, lean: -0.05 }, 'out'],
      [0.26, { a: -1.6, b: 0.5, lean: 0.12, dx: 2.5 }, 'in'],
      [0.5, { a: -1.5, b: 0.4, lean: 0.1, dx: 2 }, 'out'],
    ] },
    // ปล่อยเวท (สายเวท/ไม้เท้า ตอนใช้สกิล): จากท่าชูมือ → ผลักไม้เท้าไปหน้า + แสงวาบ
    release: { L: 29, spark: 0.16, keys: [
      [0.16, { a: -1.75, b: -1.5, w: 2.6, lean: 0.1, dx: 1.5 }, 'in'],
      [0.5, { a: -1.7, b: -1.4, w: 2.55, lean: 0.07, dx: 1 }, 'out'],
    ] },
  };
  // ท่าร่าย (ระหว่างนับเวลาร่าย): ชูสองมือ อาวุธตั้งตรง ลอยเล็กน้อย (สายเวท)
  const castPose = (t, floaty, bow) => {
    const a = (bow ? -1.5 : -2.75) + Math.sin(t * 7) * 0.06; // ธนู: ถือธนูไว้ด้านหน้า ชูมืออีกข้าง
    return { a, b: -2.45 + Math.sin(t * 7 + 1.2) * 0.07, w: -a - 0.6, lean: -0.05, dx: 0, bob: 0.6, lift: floaty ? 2 + Math.sin(t * 3) * 0.8 : 0, pull: 0, sq: 0 };
  };

  // ท่าโจมตี ณ ความคืบหน้า k (ใช้ทั้งวาดตัวและย้อนคำนวณรอยฟัน)
  const atkAt = (M, k, rest) => {
    const A = ATK[M.kind] || ATK.none;
    let prevK = 0, prev = M.start;
    for (const [kk, key, e] of A.keys) {
      if (k < kk) return mix(prev, key, EASE[e || 'io'](cl((k - prevK) / (kk - prevK))));
      prevK = kk; prev = key;
    }
    const end = A.wrap ? Object.assign({}, rest, { a: rest.a + TAU }) : rest;
    return mix(prev, end, EASE.io(cl((k - prevK) / (1 - prevK))));
  };

  const mem = new WeakMap();
  const wtOf = p => { const w = p.equip && p.equip.weapon, it = w && typeof ITEMS !== 'undefined' && ITEMS[w.id]; return (it && it.wtype) || 'none'; };
  const hasShield = p => {
    const e = p.equip || {};
    if ('shield' in e) return !!e.shield;
    return typeof jobRoot === 'function' && JOBS[p.job] && jobRoot(p.job) === 'einherjar' && wtOf(p) !== 'bow'; // ผู้เล่นออนไลน์ไม่ส่งช่องโล่มา: เดาจากสายอาชีพ
  };

  // ---------------- คำนวณท่าต่อเฟรม ----------------
  function of(p, t) {
    let M = mem.get(p);
    const moving = !!(p.moving && !p.sitting && !p.dead);
    if (!M) { M = { t, ph: 0, mv: moving ? 1 : 0, pa: 0, at: -9, dur: 0.4, kind: 'none', start: null, hf: 0, ht: -9, pd: !!p.dead, dt: p.dead ? t - 9 : -9, pre: 0, cm: p.cast ? 1 : 0 }; mem.set(p, M); }
    if (M.P && M.pt === t) return M.P;
    let dt = t - M.t; if (!(dt > 0)) dt = 0; else if (dt > 0.25) dt = 0.25;
    M.pt0 = M.pt == null ? -9 : M.pt; M.t = t; M.pt = t;
    const job = JOBS[p.job] ? p.job : 'novice', S = M.sty && M.sj === job ? M.sty : (M.sj = job, M.sty = styleOf(job));
    const wt = wtOf(p), shield = hasShield(p), robe = !!(JOBS[job] && JOBS[job].robe), caster = wt === 'rod' || S.root === 'runecaster' || S.root === 'volva';
    const now = typeof G !== 'undefined' ? G.time : t;

    // ---- เดิน ----
    const ap = Math.min(1, dt * 12);
    M.mv += ((moving ? 1 : 0) - M.mv) * ap;
    if (moving) M.ph = (M.ph + dt * S.rate) % (TAU * 64);
    const mv = M.mv, sw = Math.sin(M.ph), walk = sw * mv * S.stride;
    const step = Math.abs(Math.cos(M.ph)); // 1 = ก้าวผ่าน (ตัวสูง), 0 = เท้าแตะพื้นกางสุด (ตัวต่ำ)
    // ---- ยืน (หายใจ + ท่าประจำสาย) ----
    const br = Math.sin(t * 2.2 + (M.seed || 0));
    let ib = br * 0.5, ia = 0.1 + br * 0.04, ibb = -0.1 - br * 0.04, il = 0;
    switch (S.idle) {
      case 'heavy': ib = Math.sin(t * 1.7) * 0.9; il = 0.06; ia = 0.2 + Math.sin(t * 1.7) * 0.05; break;
      case 'bounce': ib = Math.abs(Math.sin(t * 4.2)) * 0.9; il = 0.05; ia = -0.2 + Math.sin(t * 4.2) * 0.05; ibb = -0.5; break;
      case 'float': ib = Math.sin(t * 1.6) * 0.6; ia = -0.3 + Math.sin(t * 1.6) * 0.04; break;
      case 'serene': ia = -0.15 + br * 0.03; ibb = -0.25 - br * 0.03; break;
      case 'alert': il = 0.03; break;
      case 'sway': ib = Math.sin(t * 2.6) * 0.6; il = Math.sin(t * 1.3) * 0.03; break;
    }
    if (wt === 'bow') ia = -0.55 + br * 0.03;
    if (shield) ibb = -0.75;
    const rest = {
      a: ia * (1 - mv) + ((wt === 'bow' ? -0.55 : 0.1) + walk * (wt === 'bow' ? 0.18 : 0.5)) * mv,
      b: ibb * (1 - mv) + ((shield ? -0.8 : -0.1) - walk * (shield ? 0.12 : 0.45)) * mv,
      w: 0, lean: il * (1 - mv) + S.lean * mv, dx: 0,
      bob: ib * (1 - mv) + S.bob * step * mv, lift: 0, pull: 0, sq: 0,
    };

    // ---- ง้างรอจังหวะโจมตี (ผู้เล่นตัวเอง: รู้เวลาโจมตีครั้งถัดไป) ----
    const delay = p.d && p.d.aspdDelay ? p.d.aspdDelay / 1000 : 0.6;
    let pre = 0;
    const tg = p.target;
    if (tg && !tg.dead && p.nextAttack != null && !moving && !p.cast && !p.dead && !p.sitting && tg.x != null) {
      const rng = (p.d && p.d.range ? p.d.range : 1.5) + 1;
      if (Math.hypot(tg.x - p.x, tg.y - p.y) <= rng) {
        const win = wt === 'bow' ? delay * 0.75 : Math.min(0.3, delay * 0.4), left = p.nextAttack - now;
        pre = left <= 0 ? 1 : left < win ? 1 - left / win : 0;
      }
    }
    M.pre += (pre - M.pre) * Math.min(1, dt * 16);
    const A0 = ATK[wt] || ATK.none;
    let base = M.pre > 0.01 ? mix(rest, A0.keys[0][1], EASE.io(M.pre)) : rest;

    // ---- เริ่มท่าโจมตี (atkAnim กระโดดขึ้น) ----
    const aa = p.atkAnim || 0;
    if (aa > M.pa + 0.05) {
      const skill = p.skillPose != null && now - p.skillPose < 0.05 && now >= p.skillPose;
      M.kind = skill && caster && wt !== 'bow' ? 'release' : (ATK[wt] ? wt : 'none');
      M.dur = M.kind === 'release' ? 0.45 : M.kind === 'dagger' ? cl(delay, 0.3, 0.5) : cl(delay * 0.85, 0.26, 0.5);
      // เริ่มจากท่าที่เห็นอยู่เฟรมก่อน (ท่าง้างรอ) — ตอนโจมตี เกมตั้งเวลาโจมตีครั้งถัดไปใหม่ทันที ท่าง้างจึงหายจาก base
      const last = M.P && t - M.pt0 < 0.1 ? M.P : base;
      M.start = M.kind === 'release' ? castPose(t, wt === 'rod') : mix(last, last, 0); M.at = t;
    }
    M.pa = aa;
    let k = M.at > -9 ? (t - M.at) / M.dur : -1;
    if (!(k >= 0 && k < 1) || p.dead) k = -1;
    let P = k >= 0 ? atkAt(M, k, base) : base;

    // ---- ร่ายเวท ----
    const casting = !!(p.cast && !p.dead);
    M.cm += ((casting ? 1 : 0) - M.cm) * Math.min(1, dt * 10);
    if (!dt) M.cm = casting ? 1 : M.cm;
    if (M.cm > 0.01 && k < 0) P = mix(P, castPose(t, caster, wt === 'bow'), EASE.io(M.cm));
    // โล่: ถือไว้ด้านหน้าตลอด (ยกเว้นตอนร่าย)
    if (shield && !casting) P.b = P.b + (-0.95 + walk * 0.1 - P.b) * 0.85;

    // ---- สะดุ้ง ----
    const hf = p.hurtFlash || 0;
    if (hf > M.hf + 0.02) M.ht = t;
    M.hf = hf;
    const hurt = t - M.ht < 0.3 ? 1 - (t - M.ht) / 0.3 : 0;
    if (hurt) { const h = Math.sin(hurt * Math.PI * 0.5); P.lean -= 0.22 * h; P.dx -= 2.5 * h; P.a += 0.5 * h; P.b += 0.7 * h; P.bob -= 1 * h; }
    // ---- มึน: โยกตัว ----
    const stun = !p.dead && p.stunUntil > now;
    if (stun) { P.lean += Math.sin(t * 6) * 0.09; P.b = 0.3; P.a = 0.35; }
    // ---- ล้ม ----
    if (p.dead && !M.pd) M.dt = t;
    M.pd = !!p.dead;
    let dead = 0;
    if (p.dead) {
      const q = cl((t - M.dt) / 0.5);
      dead = q < 0.72 ? (q / 0.72) ** 2 : 1 - 0.07 * Math.sin((q - 0.72) / 0.28 * Math.PI);
      P = mix(P, rest, cl(q * 2)); P.lean = 0; P.dx = 0; P.lift = 0;
    }
    if (p.sitting) { P.lean = 0.04; P.dx = 0; }

    // ---- ผ้าคลุม: ปลิวไปข้างหลังตามความเร็ว + โบกช้า ๆ ตอนยืน / ปั่นตอนร่าย ----
    const cape = mv * (1.4 + 0.9 * Math.sin(M.ph * 2 + 0.6)) + (1 - mv) * 0.45 * Math.sin(t * 1.8) + M.cm * 0.9 * Math.sin(t * 9);
    Object.assign(P, {
      walk, step, cape, dead, hurt, stun, mv, ph: M.ph, breath: br, legV: Math.cos(M.ph) * mv, stride: S.stride,
      kind: k >= 0 ? M.kind : null, k, wt, shield, robe, caster, cast: M.cm, castK: casting ? cl((now - p.cast.start) / Math.max(0.05, p.cast.end - p.cast.start)) : 0,
      sit: !!p.sitting, glow: (p.look && p.look.glow) || (JOBS[job] && JOBS[job].glow) || '#7ad8ff', style: S, rest: base,
    });
    M.P = P;
    return P;
  }

  // ---------------- เรขาคณิตแขน/อาวุธ (หน่วยเดียวกับ Sprites.human, หน้า = +x) ----------------
  // จุดบนร่างช่วงบน → พิกัดตัว (เอนรอบสะโพก y=−14 แล้วยกตาม bob)
  const ub = (P, x, y, still) => {
    if (still) return [x, y];
    const c = Math.cos(P.lean), s = Math.sin(P.lean), yy = y + 14;
    return [x * c - yy * s, x * s + yy * c - 14 - P.bob];
  };
  // ปลายอาวุธ (len = ระยะจากมือ, 0 = ตำแหน่งมือ)
  const tipOf = (P, ax, a, w, len, still) => {
    const hx = ax - Math.sin(a) * 13, hy = -27 + Math.cos(a) * 13, ww = a + 0.6 + w;
    return ub(P, hx + Math.sin(ww) * len, hy - Math.cos(ww) * len, still);
  };

  // ---------------- เอฟเฟกต์ ----------------
  function trail(g, P, M, toW, ax, still, col, lenK = 1, from = 0) {
    const A = ATK[P.kind]; if (!A || !A.trail) return;
    const k1 = A.trail[1], k0 = A.trail[0] + (k1 - A.trail[0]) * from, k = P.k, span = 0.2;
    if (k < k0 || k > k1 + span) return;
    const a = k <= k1 ? 1 : 1 - (k - k1) / span, kb = Math.min(k, k1), ka = Math.max(k0, kb - span);
    if (kb - ka < 0.01) return;
    const n = lite() ? 6 : 20, out = [], inn = [];
    for (let j = 0; j <= n; j++) {
      const kk = ka + (kb - ka) * j / n, Q = atkAt(M, kk, P.rest), f = j / n;
      out.push(toW(...tipOf(P, ax, Q.a, Q.w, A.L * 1.04 * lenK, still)));
      inn.push(toW(...tipOf(P, ax, Q.a, Q.w, A.L * lenK * (1 - 0.32 * f), still)));
    }
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.beginPath(); g.moveTo(out[0][0], out[0][1]);
    for (const q of out) g.lineTo(q[0], q[1]);
    for (let j = inn.length - 1; j >= 0; j--) g.lineTo(inn[j][0], inn[j][1]);
    g.closePath();
    g.fillStyle = pale(col, 0.45, 0.32 * a); g.fill();
    g.beginPath(); g.moveTo(out[0][0], out[0][1]); for (const q of out) g.lineTo(q[0], q[1]);
    g.strokeStyle = `rgba(255,255,255,${0.75 * a})`; g.lineWidth = A.heavy ? 2.4 : 1.6; g.lineCap = 'round'; g.stroke();
    g.restore();
  }
  function stabs(g, P, M, toW, ax, still, col, lenK = 1) {
    const A = ATK.dagger, k = P.k;
    for (const [s0, s1] of A.stabs) {
      if (k < s0 + (s1 - s0) * 0.6 || k > s1 + 0.12) continue; // เห็นเมื่อแขนยื่นออกไปแล้ว (ช่วงต้นยังง้างอยู่)
      // ประกายแทงตามแนวใบมีด เลยปลายมีดออกไป (สองเส้น = แทงคู่)
      const a = k <= s1 ? 1 : 1 - (k - s1) / 0.12, Q = atkAt(M, Math.min(k, s1), P.rest), ext = 4 + 6 * a;
      const p0 = toW(...tipOf(P, ax, Q.a, Q.w, A.L * lenK - 5, still)), p1 = toW(...tipOf(P, ax, Q.a, Q.w, (A.L + ext) * lenK, still));
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      for (const [o, wdt, c] of [[-1.3, 1.2, `rgba(255,255,255,${0.8 * a})`], [1.3, 1, U.rgba(col, 0.7 * a)]]) {
        g.strokeStyle = c; g.lineWidth = wdt; g.beginPath(); g.moveTo(p0[0], p0[1] + o); g.lineTo(p1[0], p1[1] + o * 0.3); g.stroke();
      }
      g.restore();
    }
  }
  function burst(g, x, y, q, col, r = 7) { // ประกาย (q = 0..1 ค่อย ๆ จาง)
    if (q <= 0 || q >= 1) return;
    const a = 1 - q, rr = r * (0.6 + q * 0.8);
    g.save(); g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(x, y, 0, x, y, rr);
    gr.addColorStop(0, `rgba(255,255,255,${0.9 * a})`); gr.addColorStop(0.4, U.rgba(col, 0.6 * a)); gr.addColorStop(1, U.rgba(col, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
    g.strokeStyle = `rgba(255,255,255,${0.8 * a})`; g.lineWidth = 1;
    g.beginPath(); for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2 + 0.4; g.moveTo(x + Math.cos(an) * rr * 0.3, y + Math.sin(an) * rr * 0.3); g.lineTo(x + Math.cos(an) * rr * 1.5, y + Math.sin(an) * rr * 1.5); } g.stroke();
    g.restore();
  }
  function impactRing(g, x, y, q, col) {
    if (q <= 0 || q >= 1) return;
    const a = 1 - q, r = 4 + 16 * EASE.out(q);
    g.save(); g.strokeStyle = U.rgba(col, 0.8 * a); g.lineWidth = 2 * a + 0.5;
    g.beginPath(); g.ellipse(x, y, r, r * 0.34, 0, 0, TAU); g.stroke();
    if (!lite()) { g.fillStyle = `rgba(200,190,170,${0.55 * a})`; for (let i = 0; i < 5; i++) { const an = Math.PI + (i + 0.5) / 5 * Math.PI; g.beginPath(); g.arc(x + Math.cos(an) * r * 0.8, y - 2 + Math.sin(an) * r * 0.5 - q * 6, 1.6 * a + 0.4, 0, TAU); g.fill(); } }
    g.restore();
  }
  // วงรูนใต้เท้าตอนร่าย (ชั้นพื้น ก่อนวาดตัว)
  function runeCircle(g, x, y, t, P) {
    const a = P.cast; if (a < 0.02) return;
    const r = 19 + P.castK * 3, col = P.glow;
    g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = U.rgba(col, 0.55 * a); g.lineWidth = 1.4;
    g.beginPath(); g.ellipse(x, y, r, r * 0.36, 0, 0, TAU); g.stroke();
    g.beginPath(); g.ellipse(x, y, r * 0.68, r * 0.68 * 0.36, 0, 0, TAU); g.stroke();
    // ขีดรูนหมุน
    g.lineWidth = 1.2; g.strokeStyle = U.rgba(col, 0.75 * a);
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const an = t * 1.6 + i * TAU / 8, c = Math.cos(an), s = Math.sin(an);
      g.moveTo(x + c * r * 0.72, y + s * r * 0.72 * 0.36); g.lineTo(x + c * r * 0.95, y + s * r * 0.95 * 0.36);
    }
    g.stroke();
    // ส่วนโค้งที่เติมตามเวลาร่าย
    g.strokeStyle = `rgba(255,255,255,${0.7 * a})`; g.lineWidth = 1.6;
    g.beginPath(); g.ellipse(x, y, r, r * 0.36, 0, -Math.PI / 2, -Math.PI / 2 + TAU * P.castK); g.stroke();
    if (!lite()) for (let i = 0; i < 5; i++) { // ละอองลอยขึ้น
      const q = (t * 0.9 + i / 5) % 1, an = i * 2.3 + t * 0.7;
      g.fillStyle = U.rgba(col, 0.8 * a * (1 - q));
      g.beginPath(); g.arc(x + Math.cos(an) * r * 0.7, y + Math.sin(an) * r * 0.25 - q * 34, 1.3, 0, TAU); g.fill();
    }
    g.restore();
  }
  function handGlow(g, x, y, t, P, r = 5) {
    const a = P.cast; if (a < 0.02) return;
    const rr = r * (0.85 + Math.sin(t * 11) * 0.15) * (0.7 + 0.5 * P.castK);
    g.save(); g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(x, y, 0, x, y, rr * 2);
    gr.addColorStop(0, `rgba(255,255,255,${0.85 * a})`); gr.addColorStop(0.3, U.rgba(P.glow, 0.7 * a)); gr.addColorStop(1, U.rgba(P.glow, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr * 2, 0, TAU); g.fill();
    g.restore();
  }
  function shieldAt(g, x, y, sc, side, p) {
    const J = JOBS[p.job] || JOBS.novice, rx = (side ? 3.8 : 6) * sc, ry = 7.5 * sc;
    g.save();
    const gr = g.createLinearGradient(x - rx, y - ry, x + rx, y + ry);
    gr.addColorStop(0, U.shade(J.outfit, 0.25)); gr.addColorStop(0.6, J.outfit); gr.addColorStop(1, U.shade(J.outfit, -0.3));
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(x - rx, y - ry * 0.7); g.quadraticCurveTo(x, y - ry * 1.15, x + rx, y - ry * 0.7); g.quadraticCurveTo(x + rx, y + ry * 0.4, x, y + ry); g.quadraticCurveTo(x - rx, y + ry * 0.4, x - rx, y - ry * 0.7); g.closePath();
    g.fill(); g.lineWidth = 1.4 * sc; g.strokeStyle = J.outfit2 || '#c0c8d4'; g.stroke();
    g.fillStyle = (p.look && p.look.glow) || J.glow || '#7ad8ff'; g.beginPath(); g.arc(x, y - ry * 0.1, 1.6 * sc, 0, TAU); g.fill();
    g.restore();
  }

  // ---------------- ตัววาดด้วยโค้ด (Sprites.human): เอฟเฟกต์ก่อน/หลังตัว ----------------
  function humanGeo(p) {
    const D = DIR_VIEW[dirOf(p)], v = D.v, back = v === 'back' || v === 'b34';
    return { m: D.m, v, back, ax: back ? 9 : v === 'front' ? 10 : v === 'side' ? 2 : 7.5, bx: v === 'front' ? -10 : v === 'side' ? -3 : -9, bulky: p.gender === 'm' ? 1.08 : 1 };
  }
  function humanOver(g, p, t, P) {
    if (P.dead || P.sit) return;
    const M = mem.get(p), Gm = humanGeo(p), x = p.x * TILE, y = p.y * TILE;
    const toW = (X, Y) => [x + Gm.m * (P.dx + Gm.bulky * X), y + Y - P.lift];
    const col = P.glow, still = Gm.back;
    if (P.shield && !Gm.back) { const h = toW(...tipOf(P, Gm.bx, P.b, 0, 0, Gm.v !== 'front')); shieldAt(g, h[0], h[1] + 1, 1, Gm.v === 'side', p); }
    if (P.kind) {
      const A = ATK[P.kind];
      if (A.trail) trail(g, P, M, toW, Gm.ax, still, col);
      if (A.stabs) stabs(g, P, M, toW, Gm.ax, still, col);
      if (A.impact) { const q = (P.k - A.impact) / 0.3, Q = atkAt(M, A.impact, P.rest), tp = toW(...tipOf(P, Gm.ax, Q.a, Q.w, A.L, still)); impactRing(g, tp[0], y + 1, q, col); }
      if (A.spark) { const q = (P.k - A.spark + 0.04) / 0.3; if (q > 0 && q < 1) { const tp = toW(...tipOf(P, Gm.ax, P.a, P.w, A.L, still)); burst(g, tp[0], tp[1], q, col, 8); } }
      if (A.release) { const q = (P.k - A.release + 0.02) / 0.3; if (q > 0 && q < 1) { const h = toW(...tipOf(P, Gm.ax, P.a, 0, 0, still)); arrowStreak(g, h[0], h[1], Gm.m, q, col); } }
    }
    if (P.cast > 0.02) {
      const h1 = toW(...tipOf(P, Gm.ax, P.a, P.w, P.wt === 'rod' ? 29 : 0, still)), h2 = toW(...tipOf(P, Gm.bx, P.b, 0, 0, Gm.v !== 'front'));
      handGlow(g, h1[0], h1[1], t, P, P.wt === 'rod' ? 5 : 3.5); handGlow(g, h2[0], h2[1], t + 0.7, P, 3);
    }
  }
  function arrowStreak(g, x, y, dir, q, col) {
    const a = 1 - q;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    const x0 = x + dir * (4 + q * 22), x1 = x0 + dir * (10 + 8 * (1 - q));
    g.strokeStyle = U.rgba(col, 0.75 * a); g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
    g.strokeStyle = `rgba(255,255,255,${0.9 * a})`; g.lineWidth = 1; g.beginPath(); g.moveTo(x0 + dir * 3, y); g.lineTo(x1, y); g.stroke();
    // สายธนูสะบัด
    g.strokeStyle = `rgba(255,255,255,${0.6 * a})`; g.beginPath(); g.ellipse(x, y, 2 + q * 5, 9 + q * 3, 0, 0, TAU); g.stroke();
    g.restore();
  }

  // ---------------- ภาพนิ่ง hero_ (คลาสแรก): ดัดภาพเป็นแถบ ----------------
  // กลางเท้า (สัดส่วนความกว้าง) จากความทึบของแถวล่าง — แบ่งขาหน้า/ขาหลัง
  const midOf = img => {
    if (img._poseMid != null) return img._poseMid;
    let mid = 0.5;
    try {
      const w = 64, h = Math.round(64 * img.height / img.width), c = document.createElement('canvas'); c.width = w; c.height = h;
      const cg = c.getContext('2d'); cg.drawImage(img, 0, 0, w, h);
      const d = cg.getImageData(0, Math.floor(h * 0.86), w, Math.ceil(h * 0.14)).data, rows = d.length / 4 / w;
      let s = 0, n = 0;
      for (let yy = 0; yy < rows; yy++) for (let xx = 0; xx < w; xx++) if (d[(yy * w + xx) * 4 + 3] > 120) { s += xx; n++; }
      if (n > 8) mid = s / n / w;
    } catch (e) { /* อ่านพิกเซลไม่ได้ */ }
    return (img._poseMid = mid);
  };
  // จุดเรืองแสงของอาวุธในภาพ (ลูกแก้วไม้เท้า/อัญมณีธนู): กลุ่มพิกเซลสีใกล้สีประจำอาชีพ ครึ่งหน้า-บนของภาพ
  // คืนตำแหน่ง [สัดส่วน x, สัดส่วน y] หรือ null (หาไม่เจอ/อ่านพิกเซลไม่ได้) — วัดครั้งเดียวต่อภาพ
  const hueOf = (r, g2, b) => { const mx = Math.max(r, g2, b), mn = Math.min(r, g2, b), d = mx - mn; if (!d) return [0, 0, mx / 255]; let h = mx === r ? ((g2 - b) / d) % 6 : mx === g2 ? (b - r) / d + 2 : (r - g2) / d + 4; return [h * 60 < 0 ? h * 60 + 360 : h * 60, d / mx, mx / 255]; };
  const anchorOf = (img, hex) => {
    const key = '_poseAnc' + hex;
    if (img[key] !== undefined) return img[key];
    let res = null;
    try {
      const n = parseInt(hex.slice(1), 16), [gh] = hueOf((n >> 16) & 255, (n >> 8) & 255, n & 255);
      const w = 64, h = Math.round(64 * img.height / img.width), c = document.createElement('canvas'); c.width = w; c.height = h;
      const cg = c.getContext('2d'); cg.drawImage(img, 0, 0, w, h);
      const d = cg.getImageData(0, 0, w, h).data, mid = midOf(img) * w;
      // วิเซอร์ก็เป็นสีเดียวกัน → เลือกกลุ่มที่อยู่หน้าสุด (อาวุธยื่นออกหน้าตัวเสมอ)
      const hit = [];
      for (let yy = 0; yy < h * 0.75; yy++) for (let xx = 0; xx < w; xx++) {
        const i = (yy * w + xx) * 4; if (d[i + 3] < 160) continue;
        const [hh, ss, vv] = hueOf(d[i], d[i + 1], d[i + 2]), dh = Math.min(Math.abs(hh - gh), 360 - Math.abs(hh - gh));
        if (ss > 0.4 && vv > 0.75 && dh < 28) hit.push([xx, yy]);
      }
      if (hit.length >= 4) {
        hit.sort((p1, p2) => p1[0] - p2[0]);
        const x0 = hit[0][0], near = hit.filter(q => q[0] <= x0 + w * 0.08 && q[0] < mid);
        if (near.length >= 3) res = [near.reduce((s1, q) => s1 + q[0], 0) / near.length / w, near.reduce((s1, q) => s1 + q[1], 0) / near.length / h];
      }
    } catch (e) { /* อ่านพิกเซลไม่ได้ */ }
    return (img[key] = res);
  };
  const HERO_H = 66, HK = HERO_H / 52, LEG = 0.3;
  function drawHero(g, p, t, img, P) {
    const x = p.x * TILE, y = p.y * TILE, f = (p.facing || 1) > 0 ? 1 : -1;
    const iw = img.width, ih = img.height, H = HERO_H, W = H * iw / ih, lift = P.lift * HK;
    // ภาพนิ่งไม่มีแขนให้ขยับ → ขยายการเอน/พุ่งของลำตัวแทน
    const hl = P.lean * (P.kind || P.hurt ? 1.7 : 1.2), hdx = P.dx * 1.4;
    const toW = (X, Y) => [x + f * (hdx + X) * HK, y - lift + Y * HK];
    // เงา + วงบัฟ
    const shK = P.dead ? 1 + P.dead * 0.5 : 1 - Math.min(0.4, lift / 30);
    Sprites.shadow(g, x, y, W * 0.36 * shK, W * 0.12 * Math.min(1, shK), 0.32 * Math.min(1, shK));
    if (p.buffs && Object.keys(p.buffs).length) { g.strokeStyle = `rgba(255,240,150,${0.25 + Math.sin(t * 4) * 0.15})`; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, 16, 6, 0, 0, 7); g.stroke(); }
    runeCircle(g, x, y, t, P);
    g.save();
    g.translate(x + f * hdx * HK, y - lift);
    if (P.dead) { g.translate(f * H * 0.45 * P.dead, 0); g.rotate(-f * 1.42 * P.dead); }
    g.scale(-f, 1); // ภาพต้นฉบับหันซ้าย: ในกรอบนี้ "หน้า" = −x
    const strips = !lite() && g.globalAlpha > 0.98;
    const sit = P.sit ? 1 : 0, sq = P.sq || 0;
    const legK = 1 - 0.5 * sit;
    // ความสูงหลังดัด (h = 0 เท้า, 1 หัว) → พิกัด y
    const Y = h => {
      const hh = h < LEG ? h * legK : LEG * legK + (h - LEG);
      return -H * hh * (1 - sq * sm(0.1, 0.6, h)) - P.bob * HK * sm(0.1, 0.38, h) - P.breath * 0.9 * (1 - P.mv) * sm(0.35, 0.75, h);
    };
    // การเลื่อนแนวนอน (หน่วย px, บวก = ไปหน้า)
    const sway = P.robe ? (P.mv * Math.sin(P.ph * 2 + 1) * 1.6 + P.cast * Math.sin(t * 8) * 1.2 + Math.sin(t * 1.9) * 0.4) : 0;
    const X = h => hl * H * 0.8 * Math.max(0, h - 0.22) + (h < 0.4 ? sway * (1 - h / 0.4) ** 2 : 0);
    if (!strips) {
      // โหมดประหยัด: ขยับทั้งตัว (ยุบ/เอน) ไม่แบ่งแถบ
      g.rotate(-hl * 0.7);
      const sy = (1 - sq) * (1 - 0.18 * sit), bob = P.bob * HK * 0.6;
      g.drawImage(img, -W / 2, -H * sy - bob, W, H * sy + bob);
    } else {
      const N = P.mv > 0.02 || P.cast > 0.02 || P.kind || P.hurt || P.sit ? 20 : 10, rowH = ih / N, // ยืนเฉย ๆ ดัดแค่หายใจ ใช้แถบน้อยลง
         ov = ih / H * 0.9, mid = midOf(img) * iw;
      const stepOn = !P.robe && !sit && !P.dead && P.mv > 0.02;
      const st = P.walk * 3.2, lf = 2.2;
      for (let i = 0; i < N; i++) {
        const sy0 = i * rowH, sy1 = Math.min(ih, sy0 + rowH + ov), h0 = 1 - sy1 / ih, h1 = 1 - sy0 / ih, hm = (h0 + h1) / 2;
        const yT = Y(h1), yB = Y(h0), dx = -X(hm);
        if (stepOn && hm < LEG) {
          // ขาสลับก้าว: ครึ่งหน้า/ครึ่งหลังเลื่อนสวนกัน ขาที่กำลังก้าวยกขึ้นเล็กน้อย
          const wgt = (1 - hm / LEG) ** 1.3;
          const halves = [[mid - 1, iw - mid + 1, -1], [0, mid + 1, 1]]; // หลังก่อน แล้วหน้าทับ
          for (const [sx, sw, sgn] of halves) {
            const off = sgn * st * wgt, up = Math.max(0, sgn * P.legV) * lf * wgt;
            g.drawImage(img, sx, sy0, sw, sy1 - sy0, -W / 2 + sx * W / iw + dx - off, yT - up, sw * W / iw, yB - yT);
          }
        } else g.drawImage(img, 0, sy0, iw, sy1 - sy0, -W / 2 + dx, yT, W, yB - yT);
      }
    }
    g.restore();
    if (P.dead || P.sit) return;
    // เอฟเฟกต์: แขนเสมือน (ไหล่หน้าอก) — ภาพนิ่งมีอาวุธวาดในภาพอยู่แล้ว จึงแสดงเป็นรอยฟัน/ประกาย
    const M = mem.get(p), col = P.glow;
    // จุดเรืองแสงในภาพ → หน่วยท่าทาง (รวมการเอนของลำตัว) สำหรับประกายไม้เท้า/แสงร่าย
    const a0 = (P.wt === 'rod' || P.caster) && (P.kind || P.cast > 0.02) ? anchorOf(img, col) : null;
    const anc = a0 && [((0.5 - a0[0]) * W + hl * H * 0.8 * Math.max(0, 0.78 - a0[1])) / HK, -((1 - a0[1]) * H) / HK - P.bob * sm(0.1, 0.38, 1 - a0[1])];
    if (P.kind) {
      const A = ATK[P.kind];
      if (A.trail) trail(g, P, M, toW, 2, false, col, 0.62, 0.72);
      if (A.stabs) stabs(g, P, M, toW, 2, false, col, 0.8);
      if (A.impact) { const Q = atkAt(M, A.impact, P.rest), tp = toW(...tipOf(P, 2, Q.a, Q.w, A.L, false)); impactRing(g, tp[0], y + 1, (P.k - A.impact) / 0.3, col); }
      if (A.spark) { const q = (P.k - A.spark + 0.04) / 0.3; if (q > 0 && q < 1) { const tp = anc ? toW(anc[0] + 4, anc[1]) : toW(13, -36); burst(g, tp[0], tp[1], q, col, 9); } }
      if (A.release) { const q = (P.k - A.release + 0.02) / 0.3; if (q > 0 && q < 1) { const h = toW(9, -30); arrowStreak(g, h[0], h[1], f, q, col); } }
    }
    if (P.cast > 0.02) { const h = anc && P.caster ? toW(anc[0], anc[1]) : toW(10, -31 - Math.sin(t * 3) * 1.5); handGlow(g, h[0], h[1], t, P, 5); }
    if (P.stun) Sprites.stunStars(g, x, y - 62, t);
  }

  // ---------------- ห่อ Sprites.drawPlayer ----------------
  function mode(p) {
    if (!Pose.on || (typeof G !== 'undefined' && G.fastSim) || !p || !JOBS[p.job]) return 'base';
    const gk = `${p.job}_${p.gender === 'm' ? 'm' : 'f'}`;
    if (typeof Anim !== 'undefined' && Anim.has(gk)) return 'base';
    if (typeof Rig !== 'undefined' && Rig.enabled && Rig.get(gk)) return 'base';
    const img = typeof Art !== 'undefined' && Art.get(`hero_${gk}`);
    return img ? img : 'human';
  }
  function install() {
    if (typeof Sprites === 'undefined' || !Sprites.drawPlayer || Sprites.drawPlayer._pose) return;
    const base = Sprites.drawPlayer;
    const wrapped = (g, p, t) => {
      const md = mode(p);
      if (md === 'base') return base(g, p, t);
      const P = of(p, t);
      if (md !== 'human') return drawHero(g, p, t, md, P);
      if (P.cast > 0.02 && !P.dead) runeCircle(g, p.x * TILE, p.y * TILE, t, P);
      Pose.cur = P;
      try { base(g, p, t); } finally { Pose.cur = null; }
      humanOver(g, p, t, P);
      if (P.stun) Sprites.stunStars(g, p.x * TILE, p.y * TILE - 58, t);
    };
    wrapped._pose = true;
    Sprites.drawPlayer = wrapped;
  }

  return { on: true, cur: null, of, drawHero, install, ATK, STYLE, atkAt, mem };
})();
Pose.install();
