'use strict';
// ============================================================
//  JUICE: ความรู้สึกตอนตี + ท่ามอนสเตอร์ (ไฟล์แยก เกี่ยวเข้าระบบด้วยการห่อฟังก์ชัน ไม่แก้ไส้ในของไฟล์อื่น)
//  - หยุดเฟรม (hit-stop): มอนที่โดนค้างท่าชั่วครู่ (คริ 60ms / สกิลแรง 80ms) + เวลาทั้งเกมช้าลงสั้น ๆ
//    เฉพาะลูปจริง (advanceSim) — เทสต์/บอทที่เรียก updateGame ตรง ๆ และ G.fastSim ไม่โดนเลย • มีงบจำกัดต่อวินาที
//  - มอนโดนตี: ยุบ-ยืด (สปริง) + ถอยห่างจากผู้ตี • แฟลชขาวเดิมยังอยู่ • โดนธาตุ = ตัวติดสีธาตุจาง ๆ
//  - ท่ามอนทุกตัว (มี/ไม่มีภาพแอนิเมชัน): หายใจ, เดินเอนตามทาง, ง้างก่อนตี 120ms แล้วพุ่ง, มึนโยก+ดาว,
//    ช้า = ตัวฟ้า+ขยับช้า, พิษ = ฟองเขียว, ไหม้ = สะเก็ดไฟ • บอส: หนัก ช้า ฝุ่นตอนก้าว
//  - ตาย: แตกเป็นเศษข้อมูลเรืองแสง + วงแหวน • MVP/World Boss: สโลว์ + ลำแสง + แฟลชทอง + จอสั่นแรง
//  - ตัวเลขดาเมจ: ตารางสไตล์ตามชนิด (ปกติ/คริ/สกิลตามธาตุ/ฮีล/มิส/ผู้เล่นโดน/DoT) + กระจายไม่ทับ + จำกัดจำนวน
//  - จอสั่น: ผ่าน R.kick (ตั้งค่า "จอสั่น" ปิดได้, prefers-reduced-motion = เบาลง)
//  - ผู้เล่นโดนแรง: ขอบจอแดงวาบ (DOM overlay ไม่ต้องแก้ render)
//  คุณภาพ 'low' → อนุภาคน้อยลง ไม่มีฟิลเตอร์สี • G.fastSim → ไม่ทำอะไรทางภาพ
// ============================================================
const Juice = (() => {
  const J = {
    ctx: null, muteKick: 0, inLoop: false, slows: [], bw0: 0, bused: 0, frame: 0, lastHurt: -9,
    rm: false, // prefers-reduced-motion
  };
  try {
    const mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq) { J.rm = mq.matches; if (mq.addEventListener) mq.addEventListener('change', e => { J.rm = e.matches; }); }
  } catch (e) { /* ไม่รองรับ */ }

  const TAU = Math.PI * 2;
  const low = () => typeof R !== 'undefined' && R.quality === 'low';
  const vis = () => !G.fastSim;
  const rmMul = () => (J.rm ? 0.5 : 1);
  const isBoss = m => !!(m.def.boss || m.isMvp || m.isWB || m.def.worldBoss);
  const easeOut = k => 1 - (1 - k) * (1 - k) * (1 - k);
  const clamp01 = k => (k < 0 ? 0 : k > 1 ? 1 : k);
  // สีประจำธาตุ (ตัวเลขดาเมจสกิล + สีติดตัวตอนโดน)
  const EL_COL = {
    neutral: '#bff4ff', fire: '#ff8a3a', water: '#5ac8ff', wind: '#9dff8a', earth: '#e0b060', holy: '#fff0a0',
    shadow: '#c08aff', ghost: '#e0a8ff', poison: '#a8ff5a', undead: '#b090d0',
  };
  const EL_FILTER = {
    fire: 'sepia(1) saturate(5) hue-rotate(-28deg) brightness(1.15)', water: 'sepia(1) saturate(3.2) hue-rotate(165deg) brightness(1.15)',
    wind: 'sepia(1) saturate(3) hue-rotate(60deg) brightness(1.2)', earth: 'sepia(1) saturate(2.2) hue-rotate(-8deg)',
    holy: 'sepia(.8) saturate(2.2) brightness(1.6)', shadow: 'sepia(1) saturate(3) hue-rotate(225deg) brightness(.85)',
    ghost: 'sepia(1) saturate(2.6) hue-rotate(245deg) brightness(1.25)', poison: 'sepia(1) saturate(3.5) hue-rotate(55deg)',
    undead: 'sepia(1) saturate(1.6) hue-rotate(215deg) brightness(.85)',
  };
  const SLOW_FILTER = 'sepia(.45) hue-rotate(165deg) saturate(1.4) brightness(1.08)';
  const rgba = (hex, a) => {
    let h = String(hex || '#ffffff').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16) || 0xffffff;
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
  };
  const mobGlow = m => m.def.glow || (m.isWB || m.isMvp ? '#ffd66a' : '#7ff3ff');
  const mobCol = m => m.def.color || m.def.outfit || '#c8d4e8';

  // ---------- แคชสไปรต์ (ไม่สร้าง gradient ทุกเฟรม) ----------
  const cache = {};
  const glowSprite = col => {
    if (cache['g' + col]) return cache['g' + col];
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, rgba(col, 1)); grd.addColorStop(0.35, rgba(col, 0.45)); grd.addColorStop(1, rgba(col, 0));
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    return (cache['g' + col] = c);
  };
  const starburst = () => {
    if (cache.burst) return cache.burst;
    const c = document.createElement('canvas'); c.width = c.height = 72;
    const g = c.getContext('2d'); g.translate(36, 36);
    const grd = g.createRadialGradient(0, 0, 2, 0, 0, 34);
    grd.addColorStop(0, '#fff6b0'); grd.addColorStop(0.45, '#ffb030'); grd.addColorStop(1, 'rgba(220,40,30,0.9)');
    g.fillStyle = grd; g.beginPath();
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, r = i % 2 ? 15 : 34 - (i % 4 === 0 ? 0 : 7); g.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.8); }
    g.closePath(); g.fill();
    return (cache.burst = c);
  };
  const STAR = (() => { const p = new Path2D(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i / 10 * TAU, r = i % 2 ? 2.2 : 5.2; p.lineTo(Math.cos(a) * r, Math.sin(a) * r); } p.closePath(); return p; })();

  // ---------- จอสั่น / เวลา ----------
  J.shakeMul = () => (G.player && G.player.options && G.player.options.shake === false ? 0 : J.rm ? 0.35 : 1);
  J.shake = (amp, dur) => { if (vis() && typeof R !== 'undefined') R.kick(amp, dur); };
  // ทำให้เวลาทั้งเกมช้าลงชั่วคราว (เฉพาะลูปจริง) • งบ 0.2 วิ/วินาที กันค้างสะสม • force = MVP ตาย
  J.dilate = (scale, sec, force, delay = 0) => {
    if (!vis() || (!force && typeof Bot !== 'undefined' && Bot.on)) return;
    sec *= rmMul();
    const now = performance.now();
    if (!force) {
      if (now - J.bw0 > 1000) { J.bw0 = now; J.bused = 0; }
      if (J.bused + sec > 0.2) return;
      J.bused += sec;
    }
    J.slows.push({ from: now + delay * 1000, until: now + (delay + sec) * 1000, scale: J.rm ? Math.max(scale, 0.4) : scale });
  };
  J.timeScale = () => {
    if (!J.slows.length || G.fastSim) return 1;
    const now = performance.now();
    let s = 1;
    J.slows = J.slows.filter(x => x.until > now);
    for (const x of J.slows) if (x.from <= now && x.scale < s) s = x.scale;
    return Math.max(0.03, s);
  };

  // ---------- สถานะภาพต่อมอน ----------
  const st = m => m._jz || (m._jz = { hitT: -9, hitA: 0, rx: 0, ry: 0, rec: 0, frzUntil: -9, tintEl: null, tintUntil: -9, clk: G.time, lastT: G.time, lean: 0, puffs: [], step: -1, stepT: -9 });

  // ---------- เอฟเฟกต์ของ juice ใน G.fx (ล้างเองตอนเปลี่ยนแมพ, วาดผ่าน R.drawFx) ----------
  const pushFx = f => { f.juice = true; f.type = 'juice'; f.t = 0; f.linger = 0; G.fx.push(f); return f; };
  // สุ่มของตัวเอง (ไม่แตะ Math.random ของเกม → ผลจำลอง/บอทเหมือนเดิมทุกประการเมื่อ seed เดียวกัน)
  let rs = 0x2f6b1d3 ^ (Date.now() & 0xffff);
  const rand = () => { rs ^= rs << 13; rs ^= rs >>> 17; rs ^= rs << 5; return ((rs >>> 0) % 1000003) / 1000003; };
  const rnd = (a, b) => a + rand() * (b - a);
  J.sparks = (m, col, n, spd) => {
    if (!vis()) return;
    if (low()) n = Math.ceil(n / 2);
    const s = (m.def.scale || 1), parts = [];
    for (let i = 0; i < n; i++) parts.push({ a: rnd(0, TAU), v: rnd(0.6, 1) * spd, l: rnd(3, 9) });
    pushFx({ jk: 'sparks', x: m.x, y: m.y, h: 18 * s, dur: 0.22, col, parts });
  };
  J.shatter = (m, big) => {
    const s = (m.def.scale || 1) * (m.def.size || 1), lo = low();
    const n = Math.round((big ? 48 : 22) * (lo ? 0.5 : 1));
    const glow = mobGlow(m), col = mobCol(m), parts = [];
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU), body = i % 3 === 2;
      parts.push({
        a, v: rnd(30, 95) * (big ? 1.9 : 1) * Math.sqrt(s), rise: rnd(10, 46) * (big ? 1.5 : 1), sz: rnd(2.6, 5.4) * (big ? 1.5 : 1) * Math.min(1.6, Math.sqrt(s)),
        rot: rnd(0, TAU), w: rnd(-9, 9), life: rnd(0.45, 1), c: body ? col : i % 3 === 0 ? '#ffffff' : glow, sq: rand() < 0.35, body, halo: !body && i % 2 === 0,
      });
    }
    pushFx({ jk: 'shatter', x: m.x, y: m.y, h: 20 * s, s, dur: big ? 1.6 : 0.85, parts, glow, big });
  };
  // รอยฟันแบบ Ragnarok บนตัวมอน: อาวุธมีค = เสี้ยวจันทร์ขาวกวาดพาดตัว (สลับทิศทุกครั้ง → ตีติดกันเป็นกากบาท)
  // อาวุธทุบ = วงกระแทก + ดาวแตก • คริ = รอยไขว้ X สีทอง-แดง + ดาวระเบิด
  J.slashMark = (m, opts) => {
    if (!vis()) return;
    const z = st(m), s = Math.min(1.8, (m.def.scale || 1) * (m.def.size || 1));
    const smash = opts.sfx === 'smash', crit = !!opts.crit;
    z.sflip = !z.sflip;
    const base = (z.sflip ? -0.6 : 0.6) + rnd(-0.25, 0.25);
    pushFx({ jk: 'roslash', x: m.x, y: m.y, h: 20 * s, s, ang: base, flip: z.sflip, crit, smash,
      dur: crit ? 0.42 : 0.3, sparks: low() ? 3 : 6, seed: rand() });
  };
  J.pillar = (m) => pushFx({ jk: 'pillar', x: m.x, y: m.y, s: (m.def.scale || 1), dur: 1.9, col: '#ffd66a' });
  J.dust = (x, y, s) => pushFx({ jk: 'dust', x, y, s, dur: 0.6, seed: rand() });

  // วาดรอยฟัน (เรียกจาก J.drawFx) • cx,cy = กลางตัวมอน • เสี้ยวจันทร์: แกน x = แนวฟัน, โค้งนูนขึ้น, หัวหนาด้านขวา
  const SWEEP = 0.07; // เวลาที่รอยฟันวิ่งจากหางถึงหัว (วิ)
  const crescent = (g, cx, cy, ang, L, W, bend, pr, alpha, glow, s) => {
    const N = 18, pt = (u, off) => { const x = (u * 2 - 1) * L, y = -bend * (1 - (u * 2 - 1) ** 2) - off; return [x, y]; };
    const wid = u => W * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.04)), 1.3) * (0.35 + 0.65 * u);
    const band = (scale) => {
      g.beginPath();
      for (let i = 0; i <= N; i++) { const u = pr * i / N, p = pt(u, wid(u) * scale * 0.5); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }
      for (let i = N; i >= 0; i--) { const u = pr * i / N, p = pt(u, -wid(u) * scale * 0.5); g.lineTo(p[0], p[1]); }
      g.closePath(); g.fill();
    };
    g.save(); g.translate(cx, cy); g.rotate(ang); g.globalCompositeOperation = 'lighter';
    g.globalAlpha = alpha * 0.5; g.fillStyle = `rgb(${glow})`; band(2.4);
    g.globalAlpha = alpha * 0.85; band(1.3);
    g.globalCompositeOperation = 'source-over'; // แกนขาวทึบ: คมชัดแม้บนพื้นสว่าง (บวกแสงอย่างเดียวจะจางหาย)
    g.globalAlpha = alpha; g.fillStyle = '#ffffff'; band(0.55);
    // เส้นรองบาง ๆ ใต้รอยหลัก (เหมือนรอยดาบสองคมของ RO)
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = alpha * 0.7; g.strokeStyle = `rgb(${glow})`; g.lineWidth = Math.max(1, W * 0.18);
    g.beginPath();
    for (let i = 0; i <= N; i++) { const u = 0.15 + (pr - 0.15) * i / N; if (u < 0.15) break; const p = pt(u, -W * 1.1); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }
    g.stroke();
    g.restore();
    return pt;
  };
  const star4 = (g, x, y, r) => {
    g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 0.2, y - r * 0.2); g.lineTo(x + r, y); g.lineTo(x + r * 0.2, y + r * 0.2);
    g.lineTo(x, y + r); g.lineTo(x - r * 0.2, y + r * 0.2); g.lineTo(x - r, y); g.lineTo(x - r * 0.2, y - r * 0.2); g.closePath(); g.fill();
  };
  const drawSlash = (g, cx, cy, f, t, k) => {
    const s = f.s, fade = 1 - clamp01((t - SWEEP) / (f.dur - SWEEP)), R0 = 26 * Math.sqrt(s);
    const hash = i => { const x = Math.sin((f.seed * 997 + i) * 12.9898) * 43758.5453; return x - Math.floor(x); };
    g.globalCompositeOperation = 'lighter';
    if (f.smash && !f.crit) { // ทุบ: แฟลช + วงกระแทก + รัศมีหนา
      if (t < 0.09) { g.globalAlpha = 1 - t / 0.09; g.drawImage(glowSprite('#ffffff'), cx - R0, cy - R0, R0 * 2, R0 * 2); }
      const e = easeOut(k), r = (6 + 24 * e) * Math.sqrt(s);
      g.globalAlpha = 1 - k; g.strokeStyle = '#fff4d6'; g.lineWidth = 3.2 * (1 - k) + 0.6;
      g.beginPath(); g.ellipse(cx, cy, r, r * 0.8, 0, 0, TAU); g.stroke();
      g.lineCap = 'round'; g.strokeStyle = 'rgba(255,200,120,1)'; g.lineWidth = 4 * (1 - k) + 1;
      g.beginPath();
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + f.ang, r0 = r * 0.55, r1 = r * 1.25 + 6; g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.8); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.8); }
      g.stroke();
      g.fillStyle = '#ffffff'; g.globalAlpha = (1 - k) * 0.9; star4(g, cx, cy, (9 + 6 * (1 - k)) * Math.sqrt(s));
      return;
    }
    const L = (f.crit ? 36 : 32) * Math.sqrt(s), W = (f.crit ? 6.5 : 5) * Math.sqrt(s), bend = 13 * Math.sqrt(s);
    const glow = f.crit ? '255,120,40' : '150,215,255';
    // คริ: ดาวระเบิดหลังรอยฟัน
    if (f.crit && t < 0.22) { const a = 1 - t / 0.22, b = starburst(), sc = (0.7 + 0.6 * easeOut(t / 0.22)) * Math.sqrt(s); g.globalAlpha = a * 0.85; g.drawImage(b, cx - 36 * sc, cy - 36 * sc, 72 * sc, 72 * sc); }
    const cuts = f.crit ? [[f.ang, 0], [f.ang + (f.flip ? 1.35 : -1.35), 0.05]] : [[f.ang, 0]];
    for (const [ang, delay] of cuts) {
      const tt = t - delay; if (tt <= 0) continue;
      const pr = clamp01(tt / SWEEP), al = Math.min(1, fade * 1.1);
      const pt = crescent(g, cx, cy, ang, L, W * (0.6 + 0.4 * fade), bend, pr, al, glow, s);
      // ประกายตามแนวรอยฟัน ปลิวออกด้านนอก
      g.save(); g.translate(cx, cy); g.rotate(ang); g.fillStyle = f.crit ? '#ffe2a0' : '#e8f6ff';
      for (let i = 0; i < f.sparks; i++) {
        const u = 0.25 + hash(i) * 0.7; if (u > pr) continue;
        const p = pt(u, 0), drift = (6 + hash(i + 9) * 10) * easeOut(k);
        g.globalAlpha = fade * (0.6 + hash(i + 3) * 0.4);
        star4(g, p[0] + (hash(i + 5) - 0.5) * 6, p[1] - drift, (1.6 + hash(i + 7) * 2.2) * (1 - k * 0.6));
      }
      g.restore();
    }
  };

  J.drawFx = (g, f) => {
    const X = f.x * TILE, Y = f.y * TILE * R.K, t = f.t, k = clamp01(t / f.dur);
    g.save();
    if (f.jk === 'sparks') {
      g.globalCompositeOperation = 'lighter'; g.strokeStyle = f.col; g.lineCap = 'round';
      const e = easeOut(k), cy = Y - f.h;
      g.globalAlpha = 1 - k; g.lineWidth = 2.2 * (1 - k) + 0.6;
      g.beginPath();
      for (const p of f.parts) {
        const c = Math.cos(p.a), sn = Math.sin(p.a) * 0.8, r0 = p.v * e * 0.55, r1 = p.v * e + p.l;
        g.moveTo(X + c * r0, cy + sn * r0); g.lineTo(X + c * r1, cy + sn * r1);
      }
      g.stroke();
    } else if (f.jk === 'shatter') {
      const cy = Y - f.h;
      g.globalCompositeOperation = 'lighter';
      // แสงแฟลชกลางตัว
      if (t < 0.18) { const a = 1 - t / 0.18, R0 = (f.big ? 70 : 46) * Math.sqrt(f.s); g.globalAlpha = a * (f.big ? 0.8 : 1); g.drawImage(glowSprite(f.glow), X - R0, cy - R0, R0 * 2, R0 * 2); }
      // วงแหวนสั้น ๆ บนพื้น (บีบตามมุมกล้อง)
      const rk = clamp01(t / (f.big ? 0.7 : 0.38));
      if (rk < 1) {
        const rr = (10 + (f.big ? 120 : 46) * easeOut(rk)) * Math.sqrt(f.s);
        g.globalAlpha = (1 - rk) * 0.9; g.strokeStyle = f.glow; g.lineWidth = (f.big ? 5 : 3) * (1 - rk) + 0.8;
        g.beginPath(); g.ellipse(X, Y, rr, rr * R.K * 0.62, 0, 0, TAU); g.stroke();
        if (f.big) { const r2 = rr * 0.6; g.globalAlpha = (1 - rk) * 0.5; g.beginPath(); g.ellipse(X, Y, r2, r2 * R.K * 0.62, 0, 0, TAU); g.stroke(); }
      }
      // เศษข้อมูล: พุ่งออก แล้วลอยขึ้นจางหาย (แสงเรือง = บวกแสง, ตัวเศษ = ทึบ อ่านออกบนพื้นสว่าง)
      const lo = low();
      for (const p of f.parts) {
        const pk = clamp01(t / (f.dur * p.life)); if (pk >= 1) continue;
        const e = easeOut(Math.min(1, pk * 1.6));
        const px = X + Math.cos(p.a) * p.v * e, py = cy + Math.sin(p.a) * p.v * e * 0.6 - p.rise * pk * pk * 2.2;
        const sz = p.sz * (1 - pk * 0.55), al = 1 - pk * pk;
        if (p.halo && !lo) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = al * 0.7; const hr = sz * 3.2; g.drawImage(glowSprite(f.glow), px - hr, py - hr, hr * 2, hr * 2); }
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = al; g.fillStyle = p.c;
        g.save(); g.translate(px, py); g.rotate(p.rot + p.w * t);
        if (p.sq) g.fillRect(-sz * 0.5, -sz * 0.5, sz, sz);
        else { g.beginPath(); g.moveTo(0, -sz * 1.3); g.lineTo(sz * 0.55, 0); g.lineTo(0, sz * 1.3); g.lineTo(-sz * 0.55, 0); g.closePath(); g.fill(); }
        if (p.body) { g.lineWidth = 0.8; g.strokeStyle = 'rgba(20,20,30,.55)'; g.stroke(); }
        g.restore();
      }
    } else if (f.jk === 'roslash') {
      drawSlash(g, X, Y - f.h, f, t, k);
    } else if (f.jk === 'pillar') {
      // ลำแสงทองพุ่งขึ้นฟ้า (MVP / World Boss)
      const grow = easeOut(clamp01(t / 0.25)), fade = k > 0.55 ? 1 - (k - 0.55) / 0.45 : 1;
      const w = (26 + 18 * Math.sin(t * 18) * 0.15) * Math.sqrt(f.s) * (0.6 + 0.4 * grow) * (k > 0.55 ? 0.5 + 0.5 * fade : 1);
      const H = 900 * grow;
      g.globalCompositeOperation = 'lighter';
      const grd = g.createLinearGradient(X - w, 0, X + w, 0);
      grd.addColorStop(0, 'rgba(255,200,80,0)'); grd.addColorStop(0.35, 'rgba(255,214,106,0.55)'); grd.addColorStop(0.5, 'rgba(255,252,230,0.95)');
      grd.addColorStop(0.65, 'rgba(255,214,106,0.55)'); grd.addColorStop(1, 'rgba(255,200,80,0)');
      g.globalAlpha = fade; g.fillStyle = grd; g.fillRect(X - w, Y - H, w * 2, H);
      g.globalAlpha = fade * 0.5; const G0 = 90 * Math.sqrt(f.s); g.drawImage(glowSprite('#ffd66a'), X - G0, Y - G0 * 0.55, G0 * 2, G0 * 1.1);
      // วงรูนหมุนที่ฐาน
      g.globalAlpha = fade * 0.85; g.strokeStyle = '#ffe9a0'; g.lineWidth = 2; g.setLineDash([10, 7]); g.lineDashOffset = -t * 60;
      const rr = 60 * Math.sqrt(f.s) * grow; g.beginPath(); g.ellipse(X, Y, rr, rr * R.K * 0.6, 0, 0, TAU); g.stroke();
    } else if (f.jk === 'dust') {
      const e = easeOut(k);
      g.fillStyle = 'rgba(214,200,172,1)';
      for (let i = -1; i <= 1; i += 2) {
        const r = (6 + 14 * e) * Math.sqrt(f.s);
        g.globalAlpha = 0.55 * (1 - k);
        g.beginPath(); g.ellipse(X + i * (10 + 16 * e) * Math.sqrt(f.s), Y - 2 - 5 * e, r, r * 0.5, 0, 0, TAU); g.fill();
      }
    }
    g.restore();
  };

  // ---------- เหตุการณ์: มอนโดนตี / ตาย / ผู้เล่นโดน ----------
  J.onMobHit = (m, dmg, opts, kind) => {
    if (!vis() || m.isPlayer || m.dead) return;
    const z = st(m), p = G.player, boss = isBoss(m), now = G.time;
    const crit = !!opts.crit, skill = kind === 'skill', dot = kind === 'dot';
    const big = skill && dmg >= m.maxHp * (boss ? 0.05 : 0.2);
    let dx = m.x - p.x, dy = m.y - p.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    z.hitT = now; z.rx = dx; z.ry = dy;
    z.hitA = (dot ? 0.06 : crit ? 0.3 : big ? 0.26 : skill ? 0.2 : 0.16) * (boss ? 0.5 : 1);
    z.rec = (dot ? 1.5 : crit ? 8 : big ? 7 : 4.5) * (boss ? 0.4 : 1);
    // ค้างท่า: ตีโดนทุกครั้ง 35ms (ฟันแล้วรู้สึกว่าโดนเนื้อ) • คริ 70ms • สกิลแรง 80ms (เวลาเกม, เฉพาะภาพ)
    const melee = kind === 'hit' && (opts.sfx === 'slash' || opts.sfx === 'smash');
    const frz = (crit ? 0.07 : big ? 0.08 : melee ? 0.035 : 0) * rmMul();
    if (frz > 0) { z.frzUntil = now + frz; }
    if (skill && opts.element && EL_FILTER[opts.element]) { z.tintEl = opts.element; z.tintUntil = now + 0.34; }
    // รอยฟันแบบ RO: เฉพาะตีประชิดธรรมดา (ธนู/สกิล/DoT ไม่มี) — sfx 'slash' = อาวุธมีคม, 'smash' = อาวุธทุบ
    if (kind === 'hit' && (opts.sfx === 'slash' || opts.sfx === 'smash')) J.slashMark(m, opts);
    if (crit) { J.dilate(0.25, 0.045); J.sparks(m, '#ffd23a', 14, 54); J.shake(3, 0.14); }
    else if (big) { J.dilate(0.2, 0.06); J.sparks(m, EL_COL[opts.element] || '#bff4ff', 9, 40); J.shake(2.5, 0.12); }
    else if (melee && !boss) { J.sparks(m, '#fff1c8', 5, 30); J.shake(1.1, 0.06); } // ตีประชิดปกติ: ประกายเล็ก + จอกระตุกนิด
  };
  J.onKill = m => {
    if (!vis() || m.isPlayer || m.def.dummy) return;
    const big = isBoss(m), z = st(m);
    z.deadAt = G.time;
    J.shatter(m, big);
    if (big) {
      // MVP / World Boss: ค้าง 150ms → สโลว์ 0.35x อีก 0.4 วิ + ลำแสง + แฟลชทอง + จอสั่นแรง
      J.dilate(0.05, 0.15, true);
      if (!J.rm) J.dilate(0.35, 0.4, true, 0.15);
      J.pillar(m);
      J.shake(10, 0.45);
      J.flash('gold');
    } else J.dilate(0.3, 0.05);
  };
  J.onPlayerHurt = (dmg, color) => {
    const p = G.player;
    if (!vis() || !p || !p.d) return;
    const k = dmg / Math.max(1, p.d.maxHp);
    // แค่โดนเบา ๆ ไม่วาบ (กันรก) • แรง ≥ 8% ของ MaxHP = ขอบจอแดงวาบตามความแรง
    if (k >= 0.08 && performance.now() - J.lastHurt > 220) {
      J.lastHurt = performance.now();
      J.flash('hurt', Math.min(1, 0.45 + k * 2.2));
      if (k >= 0.15) J.shake(3.5, 0.14);
    }
  };

  // ---------- DOM overlay: ขอบจอแดง / แฟลชทอง ----------
  J.overlays = {};
  J.flash = (kind, a = 1) => {
    if (!vis() || typeof document === 'undefined') return;
    let el = J.overlays[kind];
    if (!el) {
      el = document.createElement('div');
      el.className = 'juice-ov';
      el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:4;opacity:0;' + (kind === 'hurt'
        ? 'background:radial-gradient(ellipse at 50% 50%, rgba(255,0,40,0) 48%, rgba(220,10,40,.35) 78%, rgba(160,0,24,.75) 100%);'
        : 'background:radial-gradient(circle at 50% 52%, rgba(255,252,230,.85), rgba(255,214,106,.4) 32%, rgba(255,190,60,0) 72%);mix-blend-mode:screen;');
      const cv = document.getElementById('cv');
      if (cv && cv.parentNode) cv.parentNode.insertBefore(el, cv.nextSibling); else document.body.appendChild(el);
      J.overlays[kind] = el;
    }
    // ขับ opacity เองด้วย rAF ช่วงสั้น ๆ (ทำงานเฉพาะตอนมีแฟลช) — แบบ WAAPI บางเครื่อง/headless ไม่วาดผล
    el._a = { t0: performance.now(), peak: Math.min(1, (J.rm ? 0.6 : 1) * a), dur: kind === 'hurt' ? 480 : 900 };
    el.style.opacity = el._a.peak;
    if (!J.ovRaf) J.ovRaf = requestAnimationFrame(J.ovTick);
  };

  J.ovTick = () => {
    J.ovRaf = 0;
    let live = false;
    const now = performance.now();
    for (const k in J.overlays) {
      const el = J.overlays[k], A = el._a; if (!A) continue;
      const q = (now - A.t0) / A.dur;
      if (q >= 1) { el.style.opacity = 0; el._a = null; continue; }
      el.style.opacity = (A.peak * (q < 0.2 ? 1 - q : 0.8 * (1 - (q - 0.2) / 0.8) * (1 - (q - 0.2) / 0.8))).toFixed(3);
      live = true;
    }
    if (live) J.ovRaf = requestAnimationFrame(J.ovTick);
  };

  // ---------- ท่ามอนสเตอร์ (ห่อ Sprites.drawMob) ----------
  J.drawMob = (base, g, m, t) => {
    // g._mobBody = ของเดิมวาดตัวซ้ำผ่าน R.filterCtx ตอนกะพริบ (เรียกกลับมาที่ตัวห่อนี้) → ส่งผ่านตรง ๆ ไม่แปลงซ้ำ
    if (G.fastSim || m.isPlayer || g._mobBody) return base(g, m, t);
    const jit = (Math.floor(performance.now() / 32) & 1) ? 1 : -1;
    const z = st(m), d = m.def, now = G.time, lo = low();
    const x = m.x * TILE, y = m.y * TILE, hs = (d.scale || 1) * (d.size || 1), boss = isBoss(m), face = m.facing || 1;
    const stun = m.stunUntil > now, slow = m.slowUntil > now;
    // นาฬิกาแอนิเมชันของตัวนี้: ค้างตอนหยุดเฟรม, ช้าลงตอนติด Slow/มึน, บอสช้ากว่า
    const dtv = Math.max(0, Math.min(0.1, t - z.lastT)); z.lastT = t;
    const frozen = now < z.frzUntil;
    const rate = frozen ? 0 : (stun ? 0.2 : slow ? 0.45 : 1) * (boss ? 0.8 : 1);
    z.clk += dtv * rate;
    const clk = z.clk;

    // ---------- ตาย: แฟลชขาว ยุบแบน แล้วสลายเป็นเศษ (เศษวาดใน G.fx) ----------
    if (m.dead) {
      const life = boss ? 0.55 : 0.22, k = m.deathT / life;
      if (k >= 1) return;
      const e = easeOut(k);
      g.save();
      g.translate(x + (boss ? jit * 2 * (1 - k) : 0), y);
      g.scale(1 + 0.3 * e, 1 - 0.6 * e * e);
      g.translate(-x, -y);
      g.globalAlpha = 1 - k * k;
      masked(base, g, m, clk);
      g.restore();
      return;
    }

    let sx = 1, sy = 1, rot = 0, dx = 0, dy = 0, lift = 0;
    const motion = d.wings ? 'fly' : (typeof MOB_MOTION !== 'undefined' && MOB_MOTION[d.sprite]) || 'walk';
    const heavy = boss ? 1.5 : 1;
    // หายใจ / ลอยตัวตอนยืน
    const ph = clk * (2.3 / heavy) + (m.seed || 0) * 10;
    if (!m.moving) { const b = Math.sin(ph); sy *= 1 + b * 0.018 * heavy; sx *= 1 - b * 0.01 * heavy; }
    // เดิน: เอนตัวไปทางที่เดิน + เด้งเบา ๆ (บอสหนัก เด้งน้อย มีฝุ่นตอนเหยียบ)
    const leanT = m.moving && motion !== 'crawl' ? face * (boss ? 0.045 : motion === 'fly' ? 0.12 : 0.08) : 0;
    z.lean += (leanT - z.lean) * Math.min(1, dtv * 10);
    rot += z.lean;
    if (m.moving) {
      const wp = clk * (boss ? 5.2 : 8) + (m.seed || 0) * 7;
      if (motion === 'walk') { lift += Math.abs(Math.sin(wp)) * (boss ? 1 : 1.6); const s2 = Math.cos(wp * 2) * 0.03; sy *= 1 + s2; sx *= 1 - s2 * 0.6; }
      if (boss) {
        const stp = Math.floor(clk * 1.65);
        if (stp !== z.step) { if (z.step >= 0) { J.dust(m.x, m.y, hs); z.stepT = clk; } z.step = stp; }
        const imp = Math.exp(-(clk - z.stepT) * 14); sy *= 1 - 0.05 * imp; sx *= 1 + 0.035 * imp;
      }
    }
    // ง้างก่อนตี (wind-up) → พุ่ง (lunge) ไปทางผู้เล่น
    const p = G.player;
    let ax = face, ay = 0;
    { const ddx = p.x - m.x, ddy = p.y - m.y, dd = Math.hypot(ddx, ddy) || 1; ax = ddx / dd; ay = ddy / dd; }
    const WU = boss ? 0.24 : 0.12;
    if (!stun && m.state === 'chase' && !p.dead && m.nextAtk > now && m.nextAtk - now < WU && m.atkAnim <= 0.01 && !d.dummy
      && U.dist(m.x, m.y, p.x, p.y) <= (d.range || 1) + 0.5) {
      const w = 1 - (m.nextAtk - now) / WU, e = w * w;
      rot -= face * 0.2 * e; dx -= ax * 5 * e * Math.sqrt(hs); dy -= ay * 2.5 * e; sy *= 1 - 0.14 * e; sx *= 1 + 0.1 * e;
    }
    if (m.atkAnim > 0) {
      const u = 1 - m.atkAnim, L = u < 0.22 ? easeOut(u / 0.22) : 1 - easeOut((u - 0.22) / 0.78);
      dx += ax * 4 * L * Math.sqrt(hs); dy += ay * 4 * L; rot += face * 0.08 * L; sx *= 1 + 0.08 * L; sy *= 1 - 0.06 * L;
    }
    // โดนตี: สปริงยุบ-ยืด + ถอยห่างผู้ตี (ค้างท่าระหว่างหยุดเฟรม + สั่นเล็กน้อย)
    const ha = frozen ? 0 : now - z.hitT;
    if (ha < 0.6) {
      const sp = z.hitA * Math.exp(-ha * 14) * Math.cos(ha * 40);
      sx *= 1 + sp; sy *= 1 - sp * 1.2;
      const rc = z.rec * Math.exp(-ha * 11);
      dx += z.rx * rc; dy += z.ry * rc * R.K;
      if (frozen) dx += jit * 1.6;
    }
    // มึน: ส่ายหัวโยกตัว
    if (stun) { rot += Math.sin(now * 9 + (m.seed || 0) * 5) * 0.1; sy *= 0.96; }

    g.save();
    g.translate(x + dx, y + dy - lift);
    if (rot) g.rotate(rot);
    g.scale(sx, sy);
    g.translate(-x, -y);
    // สีติดตัว (ช้า = ฟ้า / โดนธาตุ = สีธาตุ): ห้ามตั้ง ctx.filter บนแคนวาสหลัก (เลเยอร์เต็มจอทุกคำสั่งวาด)
    // → วาดผ่าน R.filterCtx (แปลงสีรายคำสั่ง / ภาพแอนิเมชันใส่ filter ในช่องเฟรมเล็ก) • ระหว่างแฟลชขาวใช้ของเดิม
    const fl = m.hitFlash > 0, fctx = !lo && typeof R !== 'undefined' && R.filterCtx;
    masked(base, slow && !fl && fctx ? R.filterCtx(g, SLOW_FILTER) : g, m, clk);
    // สีธาตุจาง ๆ หลังแฟลชขาว (วาดทับอีกชั้นแบบโปร่ง)
    if (fctx && !fl && now < z.tintUntil && z.tintEl) {
      g.globalAlpha = Math.min(0.85, (z.tintUntil - now) / 0.34 * 0.95);
      masked(base, R.filterCtx(g, EL_FILTER[z.tintEl]), m, clk);
    }
    g.restore();

    // ---------- สถานะผิดปกติ (แทนของเดิมด้วยแบบที่อ่านง่ายกว่า) ----------
    const cx = x + dx, top = y + dy - lift - 38 * hs - (motion === 'fly' ? 12 : 0);
    const seed = (m.seed || 0) * 10;
    if (stun) {
      g.save();
      g.strokeStyle = 'rgba(255,230,120,.45)'; g.lineWidth = 1.2;
      g.beginPath(); g.ellipse(cx, top, 14 * Math.sqrt(hs), 4.5, 0, 0, TAU); g.stroke();
      for (let i = 0; i < 3; i++) {
        const a = now * 4.2 + i * TAU / 3, dep = Math.sin(a);
        g.globalAlpha = 0.75 + dep * 0.25;
        g.save(); g.translate(cx + Math.cos(a) * 13 * Math.sqrt(hs), top + dep * 4); g.rotate(now * 3 + i); g.scale(1.1 + dep * 0.3, 1.1 + dep * 0.3);
        g.fillStyle = '#ffe060'; g.fill(STAR); g.lineWidth = 1; g.strokeStyle = 'rgba(90,60,0,.8)'; g.stroke(STAR);
        g.restore();
      }
      g.restore();
    }
    if (slow) {
      g.save();
      const pul = 0.55 + Math.sin(now * 3) * 0.15;
      g.strokeStyle = `rgba(150,225,255,${pul})`; g.lineWidth = 2; g.setLineDash([6, 5]); g.lineDashOffset = -now * 8;
      g.beginPath(); g.ellipse(x, y, 17 * hs, 6.5 * hs, 0, 0, TAU); g.stroke();
      g.setLineDash([]);
      if (!lo) {
        g.fillStyle = 'rgba(210,245,255,0.9)';
        for (let i = 0; i < 4; i++) {
          const k = (now * 0.5 + i / 4 + seed) % 1;
          g.globalAlpha = Math.sin(k * Math.PI);
          const sxp = x + Math.sin(i * 2.4 + seed) * 12 * hs, syp = top + 6 + k * 30 * hs;
          g.fillRect(sxp - 1.5, syp - 0.5, 3, 1); g.fillRect(sxp - 0.5, syp - 1.5, 1, 3);
        }
      }
      g.restore();
    }
    if (m.poisonUntil > now) {
      g.save();
      const n = lo ? 3 : 5;
      for (let i = 0; i < n; i++) {
        const k = (now * 0.75 + i / n + seed) % 1;
        const bx = x + Math.sin(i * 2.7 + seed * 3) * 10 * hs + Math.sin(now * 3 + i) * 2, by = y + dy - (12 + k * 30) * hs;
        if (k > 0.86) { // ฟองแตก
          const q = (k - 0.86) / 0.14; g.globalAlpha = 1 - q; g.strokeStyle = 'rgba(190,255,140,1)'; g.lineWidth = 1;
          g.beginPath(); g.arc(bx, by, 3 + q * 4, 0, TAU); g.stroke();
        } else {
          const r = 1.4 + k * 2.6; g.globalAlpha = 0.85;
          g.fillStyle = 'rgba(120,230,70,0.55)'; g.strokeStyle = 'rgba(210,255,170,0.95)'; g.lineWidth = 1;
          g.beginPath(); g.arc(bx, by, r, 0, TAU); g.fill(); g.stroke();
          g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(bx - r * 0.45, by - r * 0.5, 1, 1);
        }
      }
      g.restore();
    }
    if (m.burnUntil > now) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const gl = 30 * hs * (1 + Math.sin(now * 23 + seed) * 0.08);
      g.globalAlpha = 0.6; g.drawImage(glowSprite('#ff6a1a'), x - gl, y + dy - gl * 1.2 - 8 * hs, gl * 2, gl * 1.8);
      g.globalCompositeOperation = 'source-over';
      // เปลวไฟเลียขึ้นจากลำตัว (4 ลิ้นไฟ: นอกส้ม ในเหลือง) + สะเก็ดไฟลอย
      const fs = Math.sqrt(hs);
      for (let i = 0; i < 4; i++) {
        const k = (now * 1.7 + i / 4 + seed) % 1, fx = x + (i - 1.5) * 7 * hs + Math.sin(now * 7 + i * 2) * 2, fy = y + dy - (10 + k * 30) * hs;
        const w = (6.5 * (1 - k) + 1.5) * fs, h = (12 * (1 - k) + 2) * fs;
        g.globalAlpha = 0.72 * (1 - k * k);
        g.fillStyle = '#ff6a20'; g.beginPath(); g.ellipse(fx, fy, w, h, 0, 0, TAU); g.fill();
        g.fillStyle = '#ffe070'; g.beginPath(); g.ellipse(fx, fy + h * 0.25, w * 0.5, h * 0.55, 0, 0, TAU); g.fill();
      }
      const n = lo ? 4 : 8;
      for (let i = 0; i < n; i++) {
        const k = (now * 1.25 + i / n + seed) % 1;
        const ex = x + Math.sin(i * 3.1 + seed * 5) * 12 * hs + Math.sin(now * 5 + i * 2) * 5 * k, ey = y + dy - (10 + k * 46) * hs;
        const sz = 3.4 * (1 - k) + 1;
        g.globalAlpha = 1 - k * k; g.fillStyle = k < 0.25 ? '#fff4b0' : k < 0.6 ? '#ffa030' : '#ff4a20';
        g.fillRect(ex - sz / 2, ey - sz / 2, sz, sz);
      }
      g.restore();
    }
  };
  // วาดตัวมอน โดยซ่อนสถานะไว้ชั่วคราว (ของเดิมวาดดาว/วง/ไฟ/พิษเองใน drawMob — เราวาดแบบใหม่แทน)
  function masked(base, g, m, t) {
    const a = m.stunUntil, b = m.slowUntil, c = m.burnUntil, d = m.poisonUntil;
    m.stunUntil = m.slowUntil = m.burnUntil = m.poisonUntil = 0;
    try { base(g, m, t); } finally { m.stunUntil = a; m.slowUntil = b; m.burnUntil = c; m.poisonUntil = d; }
  }

  // ---------- ตัวเลขดาเมจ ----------
  const HEAL_COL = { '#70ff70': 1, '#8dffb0': 1, '#62ff8e': 1 };
  J.styleFloater = (f, color, big) => {
    const c = J.ctx, txt = f.text;
    if (txt === 'Miss') { f.js = 'miss'; f.dur = 0.8; f.dir = rand() < 0.5 ? -1 : 1; return; }
    if (!f.num) { // ข้อความอื่น (สถานะ/Zeny/EXP) ใช้แบบเดิม • ยกเว้นฮีลที่มีชื่อต่อท้าย = สไตล์ฮีล
      if (txt[0] === '+' && HEAL_COL[color]) { f.js = 'heal'; f.dur = 1.4; f.ox = 0; f.vx = 0; f.glow = rgba(color, 0.4); }
      return;
    }
    if (txt[0] === '+') { f.js = 'heal'; f.dur = 1.3; f.crit = false; f.color = color || '#62ff8e'; }
    else if (c && c.kind === 'player') { f.js = 'player'; f.dur = 1.0; f.color = !color || color === '#ff5050' ? '#ff4a4a' : color; }
    else if (c && c.kind === 'mob') {
      if (c.crit) { f.js = 'crit'; f.dur = 1.25; }
      else if (c.skill) { f.js = 'skill'; f.dur = 1.05; f.color = EL_COL[c.el] || EL_COL.neutral; }
      else if (c.dot) { f.js = 'dot'; f.dur = 0.85; }
      else { f.js = 'normal'; f.dur = 0.95; f.color = color || '#ffffff'; }
      if (c.boss && f.js !== 'dot') f.bossHit = true;
    } else { f.js = color === '#c080ff' || !big ? 'dot' : 'normal'; f.dur = 0.9; }
    // กระจายไม่ให้ทับ: สุ่มซ้ายขวา + ซ้อนขึ้นถ้าตัวก่อนหน้ายังอยู่ใกล้ ๆ
    f.ox = rnd(-12, 12); f.vx = rnd(-14, 14);
    let near = 0;
    for (let i = G.floaters.length - 2; i >= 0 && near < 4; i--) {
      const o = G.floaters[i];
      if (o.js && o.js !== 'miss' && o.t < 0.45 && Math.abs(o.x - f.x) < 1 && Math.abs(o.y - f.y) < 1.8) near += o.js === 'crit' ? 2.2 : 1; // คริตัวสูงกว่า (มีป้าย CRITICAL)
    }
    f.y -= near * 0.6;
    f.glow = rgba(f.color || '#ffffff', 0.4);
  };
  // จำกัดจำนวนตัวเลขบนจอ (ตัวเก่าสุดที่ไม่ใช่คริออกก่อน)
  J.cap = () => {
    const max = low() ? 16 : 32;
    let n = 0;
    for (const f of G.floaters) if (f.num) n++;
    while (n > max) {
      let i = G.floaters.findIndex(f => f.num && f.js !== 'crit');
      if (i < 0) i = G.floaters.findIndex(f => f.num);
      if (i < 0) break;
      G.floaters.splice(i, 1); n--;
    }
  };
  const FONT = 'Kanit, "Trebuchet MS", Tahoma, sans-serif';
  const pop = (t, peak, d = 0.06, back = 0.14) => (t < d ? 0.5 + (peak - 0.5) * (t / d) : t < d + back ? peak + (1 - peak) * easeOut((t - d) / back) : 1);
  J.drawFloater = (base, g, f) => {
    const s = f.js;
    if (!s) return base(g, f);
    const t = f.t, k = t / f.dur;
    let x = f.x * TILE + (f.ox || 0), y = R.py(f.y * TILE), sc = 1, a = 1, size = 18, fill = f.color || '#fff', stroke = 'rgba(0,0,0,0.88)', lw = 4, font = '800';
    const fadeFrom = (k0) => (k > k0 ? Math.max(0, 1 - (k - k0) / (1 - k0)) : 1);
    if (s === 'normal') {
      sc = pop(t, 1.55); y -= 28 * easeOut(Math.min(1, t / 0.6)) + 6 * k; x += f.vx * k; a = fadeFrom(0.6);
    } else if (s === 'crit') {
      sc = pop(t, 1.85, 0.05, 0.18); size = 25; lw = 6; stroke = '#3a1000';
      y -= 22 * easeOut(Math.min(1, t / 0.7)) + 8 * k; a = fadeFrom(0.65);
      if (t < 0.2) { const j = (1 - t / 0.2) * 3; x += (rand() - 0.5) * j * 2; y += (rand() - 0.5) * j; }
      fill = J.goldGrad || (J.goldGrad = (() => { const gr = g.createLinearGradient(0, -13, 0, 13); gr.addColorStop(0, '#fffbe0'); gr.addColorStop(0.45, '#ffd84a'); gr.addColorStop(1, '#ff9a1a'); return gr; })());
    } else if (s === 'skill') {
      sc = pop(t, 1.8); size = 21; y -= 32 * easeOut(Math.min(1, t / 0.65)) + 6 * k; x += f.vx * k; a = fadeFrom(0.62);
    } else if (s === 'heal') {
      sc = pop(t, f.num ? 1.3 : 1.15, 0.06, 0.2); size = f.num ? 17 : 14; y -= 46 * easeOut(k); a = fadeFrom(0.7);
    } else if (s === 'miss') {
      size = 14; font = 'italic 700'; fill = '#b4bccb'; lw = 3; stroke = 'rgba(10,14,24,.8)';
      x += f.dir * 22 * easeOut(k); y -= 14 * k; a = fadeFrom(0.45);
    } else if (s === 'player') {
      sc = pop(t, 1.6); size = 19; lw = 5; stroke = '#2a0006';
      if (t < 0.12) x += (rand() - 0.5) * 3;
      y += -14 * Math.sin(Math.min(1, t / 0.3) * Math.PI) + 10 * easeOut(Math.max(0, (t - 0.15) / 0.85)); x += f.vx * k; a = fadeFrom(0.6);
    } else if (s === 'dot') {
      size = 14; lw = 3; y -= 20 * k; a = fadeFrom(0.5);
    }
    if (a <= 0) return;
    g.save();
    g.globalAlpha = a;
    g.translate(x, y); g.scale(sc, sc);
    if (s === 'crit') {
      const b = starburst(), bs = 1 + Math.min(1, t / 0.08) * 0.15;
      g.save(); g.rotate(t * 1.6); g.globalAlpha = a * (k < 0.5 ? 1 : 1 - (k - 0.5) * 2); g.drawImage(b, -36 * bs, -36 * bs, 72 * bs, 72 * bs); g.restore();
    }
    g.font = `${font} ${size}px ${FONT}`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    if ((s === 'skill' || s === 'heal') && !low()) { g.lineWidth = lw + 5; g.strokeStyle = f.glow; g.strokeText(f.text, 0, 0); }
    if (f.bossHit && s !== 'crit') { g.lineWidth = lw + 3; g.strokeStyle = 'rgba(255,200,80,.55)'; g.strokeText(f.text, 0, 0); }
    g.lineWidth = lw; g.strokeStyle = stroke; g.strokeText(f.text, 0, 0);
    g.fillStyle = fill; g.fillText(f.text, 0, 0);
    if (s === 'crit' && t > 0.05) {
      g.font = `800 9px ${FONT}`; g.lineWidth = 3; g.strokeStyle = '#3a1000';
      g.strokeText('CRITICAL', 0, -19); g.fillStyle = '#fff3c0'; g.fillText('CRITICAL', 0, -19);
    }
    g.restore();
  };

  // ============================================================
  //  เกี่ยวเข้าระบบ (ห่อฟังก์ชันเดิม)
  // ============================================================
  // ฟังก์ชันใน game.js (โหลดก่อนไฟล์นี้)
  {
    const dm0 = damageMob;
    damageMob = function (m, dmg, opts = {}) {
      if (!m || m.dead) return dm0(m, dmg, opts);
      const kind = 'element' in opts ? 'skill' : (!('sfx' in opts) && opts.color) ? 'dot' : 'hit';
      const prev = J.ctx;
      J.ctx = { kind: 'mob', crit: !!opts.crit, skill: kind === 'skill', dot: kind === 'dot', el: opts.element || 'neutral', boss: isBoss(m) };
      try { dm0(m, dmg, opts); } finally { J.ctx = prev; }
      J.onMobHit(m, dmg, opts, kind);
    };
    const km0 = killMob;
    killMob = function (m) { const was = m && m.dead; km0(m); if (m && !was && m.dead) J.onKill(m); };
    const dp0 = damagePlayer;
    damagePlayer = function (dmg, color) {
      const p = G.player, hp0 = p && p.hp, prev = J.ctx;
      J.ctx = { kind: 'player' };
      try { dp0.apply(this, arguments); } finally { J.ctx = prev; }
      if (p && p.hp < hp0) J.onPlayerHurt(hp0 - p.hp, color);
    };
    const af0 = addFloater;
    addFloater = function (x, y, text, color, big) {
      J.muteKick++;
      try { af0(x, y, text, color, big); } finally { J.muteKick--; }
      const f = G.floaters[G.floaters.length - 1];
      if (!f || f.text !== String(text)) return;
      J.styleFloater(f, color, big);
      if (f.js === 'crit') J.shake(3.2, 0.13); // คริ = สั่นเล็ก ๆ
      J.cap();
    };
  }
  if (typeof Sprites !== 'undefined' && Sprites.drawMob) {
    const base = Sprites.drawMob;
    Sprites.drawMob = (g, m, t) => J.drawMob(base, g, m, t);
  }
  // ของที่โหลดหลังไฟล์นี้ (render.js / main.js): เกี่ยวตอน DOM พร้อม (สคริปต์ทุกไฟล์รันแล้ว)
  const late = () => {
    if (J.lateDone || typeof R === 'undefined') return;
    J.lateDone = true;
    const kick0 = R.kick;
    R.kick = (amp, dur) => { if (J.muteKick) return; const k = J.shakeMul(); if (k > 0) kick0(amp * k, dur); };
    const df0 = R.drawFloater;
    R.drawFloater = (g, f) => J.drawFloater(df0, g, f);
    const dfx0 = R.drawFx;
    R.drawFx = (g, f, t) => (f.juice ? J.drawFx(g, f, t) : dfx0(g, f, t));
    // หยุดเฟรมแบบทั้งเกม: เฉพาะเวลาที่มาจากลูปจริง (advanceSim) ไม่กระทบเทสต์/บอทเร่งเวลา
    if (typeof updateGame === 'function') {
      const ug0 = updateGame;
      updateGame = function (dt) { return ug0(J.inLoop && !G.fastSim ? dt * J.timeScale() : dt); };
    }
    if (typeof advanceSim === 'function') {
      const as0 = advanceSim;
      advanceSim = function () { J.inLoop = true; try { return as0.apply(this, arguments); } finally { J.inLoop = false; } };
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', late);
  else setTimeout(late, 0);
  J.late = late;
  return J;
})();
