'use strict';
// ============================================================
//  FX2: เอฟเฟกต์เฉพาะสกิล (Class ขั้น 2 + สกิลที่ 6 ของ Class แรก)
//  - SKILLS[id].vfx = ชื่อเอฟเฟกต์ (ตั้งจากตาราง FX2.SKILL ด้านล่าง • ใส่ vfx ใน data.js เองเพื่อทับได้)
//    ถ้าไม่มี vfx → ใช้ fx / selfFx เดิมตามปกติ
//  - FX2.cast(s, lv, tgt)        ตอนใช้สกิล (วงรอบตัว/เส้นตรง/พื้นที่/บัฟ/ฮีล) → true = แทน selfFx เดิม
//  - FX2.hit(s, lv, m, deliver)  ต่อการโดน 1 ครั้ง → true = จัดการเอง (เรียก deliver ตามจังหวะภาพ)
//  - FX2.draw(g, f, t)           วาด (เรียกจาก R.drawFx เมื่อ f.fx2)
//  - ออร่าบัฟที่ยังทำงาน + ภาพชาร์จตอนร่าย: ห่อ Sprites.drawPlayer
//  G.fastSim → ไม่สร้างภาพเลย (คืน false ให้ระบบเดิมทำงาน) • คุณภาพ 'low' → อนุภาคครึ่งเดียว
//  ประสิทธิภาพ: แสงเรือง/ลำแสงเป็นสไปรต์ที่แคชไว้ (ไม่สร้าง gradient ทุกเฟรม)
// ============================================================
const FX2 = {
  SKILL: {
    // สกิลที่ 6 ของ Class แรก
    shield_throw: 'shield_spin', earth_rune: 'rock_spikes', charge_arrow: 'charge_arrow',
    divine_shield: 'hex_shield', throwing_knife: 'knife_spin', axe_throw: 'axe_spin',
    venom_blade: 'venom',
    // Valkyrie Knight
    spear_of_valhalla: 'valhalla_spear', einherjar_guard: 'guard', judgment_quake: 'quake', valhallas_call: 'valhalla_heal',
    // Galdr Sage
    meteor_rune: 'meteor', frost_nova: 'frost_nova', chain_lightning: 'chain', rune_barrier: 'rune_barrier',
    // Skadi Ranger
    arrow_storm: 'arrow_rain', frost_arrow: 'frost_arrow', focused_volley: 'volley', winter_hunt: 'winter',
    // Norn Oracle
    great_restoration: 'restoration', fate_weave: 'fate', ragnarok_light: 'ragnarok_light', skuld_judgment: 'judgment',
    // Loki's Phantom
    mirror_strike: 'mirror', fang_of_fenrir: 'fang', smoke_cyclone: 'smoke', trickster_haste: 'haste',
    // Ulfhednar Warlord
    fenrir_bite: 'bite', ragnarok_cleave: 'cleave', war_howl: 'war_howl', undying_rage: 'undying',
    // Hersir Vanguard
    charge_strike: 'charge', spiral_pierce: 'spiral', battle_aura: 'battle_aura', ragnars_fury: 'fury',
    // Seidr Witch
    soul_drain: 'drain', hex_of_hel: 'hex', dark_nova: 'dark_nova', void_lance: 'void_lance',
    // Ullr Sniper
    sharp_shot: 'sharp_shot', snipe: 'snipe', wind_walk: 'wind_walk', twin_shot: 'twin',
    // Gythja Monk
    holy_fist: 'holy_fist', triple_palm: 'palm', divine_burst: 'divine_burst', zen_body: 'zen',
    // Skald Bard
    sonic_strike: 'sonic', war_drum: 'drum', song_of_battle: 'song', hymn_of_loki: 'hymn',
    // Jotun Breaker
    titan_smash: 'titan', earth_splitter: 'fissure', giants_wrath: 'giant', mountain_heart: 'mountain_heal',
  },
};
for (const id in FX2.SKILL) if (typeof SKILLS !== 'undefined' && SKILLS[id] && !SKILLS[id].vfx) SKILLS[id].vfx = FX2.SKILL[id];

(() => {
  const TAU = Math.PI * 2;
  // ---------- สเปกของแต่ละเอฟเฟกต์ ----------
  // cast: 'area' (ที่เป้า) | 'self' (รอบตัว) | 'line' | 'buff' | 'heal'   impact: วินาทีที่ดาเมจเข้า (area)
  // ring: เวลาที่วงขยายถึงขอบ (self)   travel: เวลาที่พุ่งสุดเส้น (line)   imp: ภาพตอนโดนแต่ละตัว
  // hit: 'proj' (speed ช่อง/วิ, arc โค้ง px) | 'melee' | 'strike' (ตกจากฟ้า) | 'chain' | 'snipe'
  const SPEC = {
    venom: { cast: 'buff', dur: .9 },
    shield_spin: { hit: 'proj', speed: 15, arc: 12, imp: 'clang' },
    knife_spin: { hit: 'proj', speed: 20, arc: 4, imp: 'knife' },
    axe_spin: { hit: 'proj', speed: 12, arc: 20, imp: 'chop' },
    charge_arrow: { hit: 'proj', speed: 24, imp: 'shock' },
    frost_arrow: { hit: 'proj', speed: 18, imp: 'ice' },
    volley: { hit: 'proj', speed: 26, imp: 'gold_s' },
    twin: { hit: 'proj', speed: 24, imp: 'green_s' },
    void_lance: { hit: 'proj', speed: 16, imp: 'void' },
    sonic: { hit: 'proj', speed: 14, imp: 'sonic' },
    drain: { hit: 'proj', speed: 15, imp: 'drain', back: 1 },
    chain: { hit: 'chain' },
    snipe: { hit: 'snipe' },
    judgment: { hit: 'strike', dur: 0.95, at: 0.3 },
    holy_fist: { hit: 'melee', dur: 0.5 },
    palm: { hit: 'melee', dur: 0.42 },
    divine_burst: { hit: 'melee', dur: 0.8, kick: [5, 0.25] },
    mirror: { hit: 'melee', dur: 0.38 },
    fang: { hit: 'melee', dur: 0.55 },
    bite: { hit: 'melee', dur: 0.45 },
    charge: { hit: 'melee', dur: 0.5 },
    titan: { hit: 'melee', dur: 0.75, kick: [6, 0.3] },
    rock_spikes: { cast: 'area', dur: 1.1, impact: 0.15, imp: 'rock' },
    meteor: { cast: 'area', dur: 1.5, impact: 0.42, imp: 'fire', kick: [6, 0.3] },
    arrow_rain: { cast: 'area', dur: 1.15, impact: 0.3, imp: 'arrow' },
    ragnarok_light: { cast: 'area', dur: 1.25, impact: 0.25, imp: 'holy' },
    hex: { cast: 'area', dur: 1.4, impact: 0.3, imp: 'hex' },
    quake: { cast: 'self', dur: 1.0, ring: 0.25, imp: 'quake', kick: [5, 0.3] },
    frost_nova: { cast: 'self', dur: 0.95, ring: 0.3, imp: 'frost' },
    smoke: { cast: 'self', dur: 1.0, ring: 0.3, imp: 'smoke' },
    cleave: { cast: 'self', dur: 0.6, ring: 0.2, imp: 'cleave' },
    fury: { cast: 'self', dur: 0.6, ring: 0.2, imp: 'fury' },
    dark_nova: { cast: 'self', dur: 0.95, ring: 0.45, imp: 'dark' },
    drum: { cast: 'self', dur: 1.05, ring: 0.2, imp: 'drum', kick: [3, 0.2] },
    valhalla_spear: { cast: 'line', dur: 0.6, travel: 0.2, imp: 'spear' },
    spiral: { cast: 'line', dur: 0.55, travel: 0.25, imp: 'spiral' },
    sharp_shot: { cast: 'line', dur: 0.45, travel: 0.12, imp: 'sharp' },
    fissure: { cast: 'line', dur: 0.95, travel: 0.3, imp: 'rock', ground: 1 },
    guard: { cast: 'buff', dur: 1.1 }, battle_aura: { cast: 'buff', dur: 1.0 }, war_howl: { cast: 'buff', dur: 1.0 },
    undying: { cast: 'buff', dur: 1.0 }, rune_barrier: { cast: 'buff', dur: 1.2 }, winter: { cast: 'buff', dur: 1.1 },
    fate: { cast: 'buff', dur: 1.2 }, haste: { cast: 'buff', dur: 0.8 }, wind_walk: { cast: 'buff', dur: 1.0 },
    zen: { cast: 'buff', dur: 1.2 }, song: { cast: 'buff', dur: 1.1 }, hymn: { cast: 'buff', dur: 1.1 },
    giant: { cast: 'buff', dur: 1.0, kick: [3, 0.2] }, hex_shield: { cast: 'buff', dur: 1.1 },
    valhalla_heal: { cast: 'heal', dur: 1.3 }, restoration: { cast: 'heal', dur: 1.4 }, mountain_heal: { cast: 'heal', dur: 1.3 },
  };
  FX2.SPEC = SPEC;
  const SND = { arrow: 'bow', firebolt: 'fire', coldbolt: 'ice', lightning: 'zap', holy: 'holy', soul: 'magic' };

  // ---------- ตัวช่วย ----------
  const LQ = () => R.quality === 'low';
  const N = n => (LQ() ? Math.ceil(n / 2) : n);
  const cl = v => (v < 0 ? 0 : v > 1 ? 1 : v);
  const eo = k => 1 - (1 - k) * (1 - k);
  const eo3 = k => 1 - (1 - k) * (1 - k) * (1 - k);
  const env = (k, a, b) => Math.max(0, Math.min(1, a > 0 ? k / a : 1, b > 0 ? (1 - k) / b : 1));
  const H = (f, i, s) => U.hash2(i, s || 0, f.seed);
  const lit = g => { g.globalCompositeOperation = 'lighter'; };
  const nrm = g => { g.globalCompositeOperation = 'source-over'; };
  const sc = o => (o && o.def && o.def.scale) || 1;
  const feet = o => [o.x * TILE, o.y * TILE * R.K];
  const body = o => [o.x * TILE, o.y * TILE * R.K - (o === G.player ? 30 : 18 * sc(o))];
  const hand = p => [p.x * TILE + (p.facing || 1) * 10, p.y * TILE * R.K - 30];
  const gEll = (g, x, y, r) => { g.beginPath(); g.ellipse(x, y, Math.max(0.1, r), Math.max(0.1, r * R.K), 0, 0, TAU); };

  // แสงเรือง/ควันแบบสไปรต์ (แคชตามสี)
  const GC = {};
  function spr(col, soft) {
    const key = col + (soft ? '|s' : '');
    if (GC[key]) return GC[key];
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    if (soft) { gr.addColorStop(0, `rgba(${col},0.85)`); gr.addColorStop(0.55, `rgba(${col},0.4)`); gr.addColorStop(1, `rgba(${col},0)`); }
    else { gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.16, `rgba(${col},0.95)`); gr.addColorStop(0.45, `rgba(${col},0.32)`); gr.addColorStop(1, `rgba(${col},0)`); }
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    return (GC[key] = c);
  }
  function glow(g, x, y, r, col, a, sy) {
    if (!(a > 0.01) || r <= 0.5) return;
    g.globalAlpha = Math.min(1, a); g.drawImage(spr(col), x - r, y - r * (sy || 1), r * 2, r * 2 * (sy || 1)); g.globalAlpha = 1;
  }
  function puff(g, x, y, r, col, a) {
    if (!(a > 0.01) || r <= 0.5) return;
    g.globalAlpha = Math.min(1, a); g.drawImage(spr(col, 1), x - r, y - r, r * 2, r * 2); g.globalAlpha = 1;
  }
  // ลำแสงแนวตั้ง (แคช)
  function colSpr(col) {
    const key = 'col|' + col;
    if (GC[key]) return GC[key];
    const c = document.createElement('canvas'); c.width = 48; c.height = 256;
    const x = c.getContext('2d');
    const v = x.createLinearGradient(0, 0, 0, 256);
    v.addColorStop(0, `rgba(${col},0)`); v.addColorStop(0.55, `rgba(${col},0.45)`); v.addColorStop(0.92, `rgba(${col},0.9)`); v.addColorStop(1, 'rgba(255,255,255,1)');
    x.fillStyle = v; x.fillRect(0, 0, 48, 256);
    x.globalCompositeOperation = 'destination-in';
    const h = x.createLinearGradient(0, 0, 48, 0);
    h.addColorStop(0, 'rgba(0,0,0,0)'); h.addColorStop(0.5, 'rgba(0,0,0,1)'); h.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = h; x.fillRect(0, 0, 48, 256);
    return (GC[key] = c);
  }
  function pillar(g, x, yb, w, h, col, a) {
    if (!(a > 0.01)) return;
    g.globalAlpha = Math.min(1, a); g.drawImage(colSpr(col), x - w / 2, yb - h, w, h); g.globalAlpha = 1;
  }
  // อักษรรูน (เส้น)
  const RUNES = [
    [[0, -0.5, 0, 0.5], [0, -0.15, 0.32, -0.45], [0, 0.12, 0.32, -0.18]],
    [[0, 0.5, 0, -0.5, 0.3, -0.28, 0, -0.05, 0.3, 0.5]],
    [[0, 0.5, 0, -0.5], [-0.3, -0.42, 0, -0.1, 0.3, -0.42]],
    [[0, 0.5, 0, -0.5], [-0.3, -0.2, 0, -0.5, 0.3, -0.2]],
    [[0, -0.5, 0, 0.5], [0, -0.28, 0.3, 0, 0, 0.28]],
    [[-0.28, 0.5, -0.28, -0.5, 0, -0.15, 0.28, -0.5, 0.28, 0.5]],
    [[-0.2, -0.5, 0.2, -0.15, -0.2, 0.15, 0.2, 0.5]],
    [[-0.3, 0.5, 0.3, -0.1, 0, -0.5, -0.3, -0.1, 0.3, 0.5]],
  ];
  function rune(g, i, x, y, s) {
    g.beginPath();
    for (const pl of RUNES[i % RUNES.length]) {
      g.moveTo(x + pl[0] * s, y + pl[1] * s);
      for (let j = 2; j < pl.length; j += 2) g.lineTo(x + pl[j] * s, y + pl[j + 1] * s);
    }
    g.stroke();
  }
  function note(g, x, y, s, dbl) {
    g.beginPath(); g.ellipse(x, y, 3.4 * s, 2.5 * s, -0.4, 0, TAU); g.fill();
    g.fillRect(x + 2.4 * s, y - 12 * s, 1.4 * s, 12 * s);
    if (dbl) { g.beginPath(); g.ellipse(x + 9 * s, y - 2 * s, 3.4 * s, 2.5 * s, -0.4, 0, TAU); g.fill(); g.fillRect(x + 11.4 * s, y - 14 * s, 1.4 * s, 12 * s); g.fillRect(x + 2.4 * s, y - 12 * s, 10.4 * s, 2.4 * s); }
    else { g.beginPath(); g.moveTo(x + 3.8 * s, y - 12 * s); g.quadraticCurveTo(x + 9 * s, y - 9 * s, x + 7 * s, y - 4 * s); g.lineWidth = 1.4 * s; g.stroke(); }
  }
  function bolt(g, x1, y1, x2, y2, seed, amp, segs) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    g.beginPath(); g.moveTo(x1, y1);
    for (let i = 1; i < segs; i++) {
      const q = i / segs, o = (U.hash2(i, seed, 7) - 0.5) * 2 * amp * Math.sin(q * Math.PI);
      g.lineTo(x1 + dx * q + nx * o, y1 + dy * q + ny * o);
    }
    g.lineTo(x2, y2);
  }
  function boltGlow(g, x1, y1, x2, y2, seed, amp, segs, col, a, w) {
    w = w || 1;
    bolt(g, x1, y1, x2, y2, seed, amp, segs);
    g.strokeStyle = `rgba(${col},${0.3 * a})`; g.lineWidth = 7 * w; g.stroke();
    g.strokeStyle = `rgba(${col},${0.9 * a})`; g.lineWidth = 2.4 * w; g.stroke();
    g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = 1 * w; g.stroke();
  }
  // หินแหลม/คริสตัลตั้งจากพื้น (ฐานที่ x,y)
  function spike(g, x, y, h, w, lean, c1, c2, edge) {
    if (h < 1) return;
    g.fillStyle = c1; g.beginPath(); g.moveTo(x - w, y); g.lineTo(x + lean, y - h); g.lineTo(x + w * 0.2, y + 1.5); g.closePath(); g.fill();
    g.fillStyle = c2; g.beginPath(); g.moveTo(x + w * 0.2, y + 1.5); g.lineTo(x + lean, y - h); g.lineTo(x + w, y); g.closePath(); g.fill();
    if (edge) { g.strokeStyle = edge; g.lineWidth = 1; g.beginPath(); g.moveTo(x - w * 0.7, y - 1); g.lineTo(x + lean, y - h); g.stroke(); }
  }
  // เสี้ยวพระจันทร์ (รอยฟัน) — หนาตรงกลาง บางที่ปลาย
  function crescent(g, cx, cy, r, a0, a1, w, sy) {
    const n = 16; sy = sy || 1;
    g.beginPath();
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * sy); }
    for (let i = n; i >= 0; i--) { const u = i / n, a = a0 + (a1 - a0) * u, rr = r - w * Math.sin(u * Math.PI); g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * sy); }
    g.closePath();
  }
  function star4(g, x, y, s, col, a) {
    if (a <= 0.01) return;
    g.fillStyle = `rgba(${col},${a})`;
    g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.18, y - s * 0.18); g.lineTo(x + s, y); g.lineTo(x + s * 0.18, y + s * 0.18);
    g.lineTo(x, y + s); g.lineTo(x - s * 0.18, y + s * 0.18); g.lineTo(x - s, y); g.lineTo(x - s * 0.18, y - s * 0.18); g.closePath(); g.fill();
  }
  function cross(g, x, y, s) { g.fillRect(x - s * 0.3, y - s, s * 0.6, s * 2); g.fillRect(x - s, y - s * 0.3, s * 2, s * 0.6); }
  function flake(g, x, y, s) {
    g.beginPath();
    for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; g.moveTo(x - Math.cos(a) * s, y - Math.sin(a) * s); g.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s); }
    g.stroke();
  }
  function kite(g, x, y, s) {
    g.beginPath(); g.moveTo(x, y - 18 * s); g.lineTo(x + 14 * s, y - 12 * s); g.lineTo(x + 12 * s, y + 5 * s); g.lineTo(x, y + 19 * s); g.lineTo(x - 12 * s, y + 5 * s); g.lineTo(x - 14 * s, y - 12 * s); g.closePath();
  }
  function hexPath(g, x, y, s) {
    g.moveTo(x + s, y);
    for (let i = 1; i <= 6; i++) g.lineTo(x + Math.cos(i * Math.PI / 3) * s, y + Math.sin(i * Math.PI / 3) * s);
  }
  function feather(g, x, y, s, a) {
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = 'rgba(255,255,250,0.9)'; g.beginPath(); g.ellipse(0, 0, 7 * s, 2.4 * s, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(220,190,110,0.9)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-8 * s, 0); g.lineTo(7 * s, 0); g.stroke();
    g.restore();
  }

  // ---------- สร้างเอฟเฟกต์ ----------
  function add(f) {
    f.fx2 = 1; f.src = f.src || FX2.presentationSource; f.t = 0; f.linger = 0; f.seed = (Math.random() * 1e6) | 0;
    G.fx.push(f); return f;
  }
  const CAST = {}; // id สกิล → ข้อมูลการร่ายล่าสุด (ใช้จับจังหวะดาเมจ)
  const HC = {};   // ตัวนับลำดับการโดนต่อสกิล (หลายฮิต)
  const AST = {};  // เวลาเริ่มบัฟ (ให้ออร่าค่อย ๆ ปรากฏหลังภาพร่าย)
  function hitIdx(s, m) {
    const c = HC[s.id];
    if (c && c.m === m && G.time - c.t < 0.7) { c.n++; c.t = G.time; return c; }
    return (HC[s.id] = { m, n: 0, t: G.time });
  }
  function impact(v, m, n, src, runeVariant, groundAngle) { if (v && IMP[v]) add({ kind: 'imp', v, src, runeVariant, groundAngle, groundLayer: runeVariant==='earth_rune.fissure', ref: m, dur: IMP[v].dur, n: n || 0 }); }

  FX2.cast = (s, lv, tgt) => {
    if (G.fastSim || !s.vfx || !SPEC[s.vfx] || !SPEC[s.vfx].cast) return false;
    const sp = SPEC[s.vfx], p = G.player, kind = s.vfx;
    const r = (s.dmg && s.dmg.area) || 2.5;
    let c = null;
    if (sp.cast === 'area') {
      const o = tgt || p;
      add({ kind, x: o.x, y: o.y, r, dur: sp.dur });
      c = { t: G.time, x: o.x, y: o.y, r };
    } else if (sp.cast === 'self') {
      add({ kind, x: p.x, y: p.y, r, dur: sp.dur, face: p.facing || 1 });
      c = { t: G.time, x: p.x, y: p.y, r };
    } else if (sp.cast === 'line') {
      if (!tgt) return false;
      const dx = tgt.x - p.x, dy = tgt.y - p.y, d = Math.hypot(dx, dy) || 1, len = skillRange(s) + 1;
      add({ kind, runeVariant: s.rune?.id==='earth_rune.fissure' ? s.rune.id : undefined, groundLayer: s.rune?.id==='earth_rune.fissure', x: p.x, y: p.y, ux: dx / d, uy: dy / d, len, dur: sp.dur });
      c = { t: G.time, x: p.x, y: p.y, r: len, angle: Math.atan2(dy, dx) };
    } else {
      add({ kind, ref: p, dur: sp.dur, face: p.facing || 1 });
      if (sp.cast === 'buff') AST[s.id] = G.time;
    }
    if (c) CAST[s.id] = c;
    if (sp.kick) later(sp.impact || 0, () => R.kick(sp.kick[0], sp.kick[1]));
    return true;
  };

  FX2.hit = (s, lv, m, deliver) => {
    if (G.fastSim || !s.vfx || !SPEC[s.vfx]) return false;
    const sp = SPEC[s.vfx], p = G.player, kind = s.vfx, snd = SND[s.fx];
    if (sp.cast === 'area' || sp.cast === 'self' || sp.cast === 'line') {
      const c = CAST[s.id]; if (!c || G.time - c.t > 2) return false;
      let at = c.t;
      if (sp.cast === 'area') at += sp.impact || 0;
      else at += (sp.ring || sp.travel || 0) * cl(U.dist(c.x, c.y, m.x, m.y) / (c.r || 1));
      const go = () => { if (m.dead) return; deliver(); impact(sp.imp, m, 0, s.id, s.rune?.id==='earth_rune.fissure' ? s.rune.id : undefined, c.angle); };
      if (snd) Sound.play(snd);
      if (at - G.time > 0.01) later(at - G.time, go); else go();
      return true;
    }
    if (!sp.hit) return false;
    const hc = hitIdx(s, m), n = hc.n;
    if (sp.hit === 'proj') {
      const [hx, hy] = s.bow && typeof HunterMotion !== 'undefined' ? HunterMotion.muzzle(p,m) : hand(p), d = U.dist(p.x, p.y, m.x, m.y);
      add({ kind, X0: hx, Y0: hy, ref: m, dur: Math.max(0.08, d / sp.speed), arc: sp.arc || 0, n, onHit: () => {
        deliver(); impact(sp.imp, m, n, s.id);
        if (sp.back) add({ kind: 'drain_back', src:s.id, ref: m, dur: 0.75 });
      } });
      if (snd) Sound.play(snd);
    } else if (sp.hit === 'melee') {
      deliver();
      add({ kind, ref: m, dur: sp.dur, n, px: p.x, py: p.y });
      if (sp.kick) R.kick(sp.kick[0], sp.kick[1]);
      if (snd) Sound.play(snd);
    } else if (sp.hit === 'strike') {
      add({ kind, ref: m, dur: sp.dur, hitAt: sp.at, onHit: () => { deliver(); R.kick(4, 0.2); } });
      if (snd) Sound.play(snd);
    } else if (sp.hit === 'chain') {
      // สายฟ้ากระโดด 3 ช่วง: มือ → เป้า → จุดข้าง ๆ → เป้า (ดาเมจลงเป้าเดียวตามระบบเดิม)
      if (n === 0) {
        const a = Math.random() * TAU, [bx, by] = body(m);
        hc.nodes = [hand(p), null, [bx + Math.cos(a) * 52, by + 14 + Math.sin(a) * 22], null];
      }
      const nd = hc.nodes || [hand(p), null], i = Math.min(n, 2);
      add({ kind, ref: m, from: nd[i], to: nd[i + 1], dur: 0.3, hitAt: 0.03, onHit: deliver });
      if (snd) Sound.play(snd);
    } else if (sp.hit === 'snipe') {
      const [hx, hy] = hand(p);
      add({ kind, X0: hx, Y0: hy, ref: m, dur: 0.6, hitAt: 0.12, onHit: () => { deliver(); R.kick(3, 0.15); } });
      if (snd) Sound.play(snd);
    }
    return true;
  };

  // ---------- วาด ----------
  const DRAW = {};
  FX2.draw = (g, f, t) => {
    // Cutting is drawn by WeaponTrail from the actor's actual weapon poses.
    if (['mirror','cleave','fury'].includes(f.kind)) return;
    const fn = DRAW[f.kind]; if (!fn) return;
    const k = Math.min(1, f.t / f.dur);
    const [X, Y] = f.ref ? feet(f.ref) : [f.x * TILE, f.y * TILE * R.K];
    g.save();
    fn(g, f, k, t, X, Y);
    g.restore();
  };

  // ===== ภาพตอนโดน (impact) =====
  const IMP = {
    clang: { dur: 0.35, col: '255,225,140', n: 8, ring: 22, flash: 28, star: 1 },
    knife: { dur: 0.3, col: '215,230,255', n: 5, ring: 12, flash: 16, x: 1 },
    chop: { dur: 0.4, col: '255,150,60', n: 9, ring: 18, flash: 28, x: 1 },
    shock: { dur: 0.45, col: '255,235,180', n: 10, ring: 34, flash: 32, rings: 2 },
    ice: { dur: 0.5, col: '170,230,255', n: 6, ring: 20, flash: 26, shards: 1 },
    gold_s: { dur: 0.25, col: '255,220,120', n: 5, ring: 10, flash: 15 },
    green_s: { dur: 0.25, col: '200,255,150', n: 5, ring: 10, flash: 15 },
    void: { dur: 0.6, col: '180,100,255', n: 8, ring: 26, flash: 26, rift: 1 },
    sonic: { dur: 0.4, col: '150,230,255', n: 0, ring: 26, flash: 18, rings: 3 },
    drain: { dur: 0.35, col: '170,90,255', n: 6, ring: 14, flash: 22 },
    fire: { dur: 0.45, col: '255,140,50', n: 7, ring: 14, flash: 22 },
    arrow: { dur: 0.22, col: '240,220,170', n: 4, ring: 8, flash: 10 },
    holy: { dur: 0.45, col: '255,240,170', n: 6, ring: 14, flash: 24 },
    hex: { dur: 0.5, col: '120,255,110', n: 6, ring: 12, flash: 18 },
    rock: { dur: 0.4, col: '220,180,120', n: 5, ring: 12, flash: 12, debris: 1 },
    frost: { dur: 0.45, col: '170,230,255', n: 5, ring: 12, flash: 18, shards: 1 },
    quake: { dur: 0.4, col: '255,210,120', n: 6, ring: 14, flash: 16, debris: 1 },
    smoke: { dur: 0.35, col: '225,205,255', n: 4, ring: 10, flash: 12, x: 1 },
    cleave: { dur: 0.35, col: '255,120,60', n: 6, ring: 14, flash: 22, x: 1 },
    fury: { dur: 0.35, col: '255,90,60', n: 6, ring: 14, flash: 20 },
    dark: { dur: 0.45, col: '170,90,255', n: 6, ring: 14, flash: 18 },
    drum: { dur: 0.35, col: '255,200,120', n: 0, ring: 18, flash: 14, rings: 2 },
    spear: { dur: 0.4, col: '255,230,140', n: 8, ring: 16, flash: 26, star: 1 },
    spiral: { dur: 0.35, col: '230,235,255', n: 6, ring: 14, flash: 18 },
    sharp: { dur: 0.3, col: '220,255,140', n: 6, ring: 12, flash: 18 },
  };
  for (const v in IMP) IMP[v].dk = IMP[v].col.split(',').map(c => Math.round(c * 0.45)).join(',');
  // วง/ประกาย: ชั้นล่างสีเข้ม (source-over) ให้เห็นชัดบนพื้นสว่าง + ชั้นบนเรืองแสง (lighter)
  DRAW.imp = (g, f, k) => {
    const P = IMP[f.v], [bx, by] = body(f.ref), a = 1 - k, e = eo(k), S = 1.5;
    nrm(g);
    if (P.rift) {
      g.fillStyle = `rgba(18,4,32,${0.8 * a})`;
      g.beginPath(); g.ellipse(bx, by, 9 + 16 * e, 24 * (1 - k * 0.6), 0.5, 0, TAU); g.fill();
    }
    if (P.debris) {
      g.fillStyle = `rgba(110,82,52,${a})`;
      for (let i = 0; i < N(7); i++) { const an = H(f, i) * TAU, v = 18 + 26 * H(f, i, 2); g.fillRect(bx + Math.cos(an) * v * e - 2, by + 10 - Math.sin(k * Math.PI) * (16 + 20 * H(f, i, 3)) + Math.sin(an) * v * e * 0.5, 4, 4); }
    }
    const rr = P.ring * S * (0.3 + e);
    g.strokeStyle = `rgba(${P.dk},${0.5 * a})`; g.lineWidth = 5 * a + 1.5;
    g.beginPath(); g.ellipse(bx, by, rr, rr * 0.75, 0, 0, TAU); g.stroke();
    const sparks = path => {
      g.beginPath();
      for (let i = 0; i < N(P.n); i++) {
        const an = H(f, i, 4) * TAU, d = (10 + 38 * e) * (0.6 + 0.6 * H(f, i, 5));
        g.moveTo(bx + Math.cos(an) * d * 0.5, by + Math.sin(an) * d * 0.5); g.lineTo(bx + Math.cos(an) * d, by + Math.sin(an) * d);
      }
      path();
    };
    if (P.n) sparks(() => { g.strokeStyle = `rgba(${P.dk},${0.6 * a})`; g.lineWidth = 4.5; g.stroke(); });
    lit(g);
    glow(g, bx, by, P.flash * S * (0.6 + 0.5 * e), P.col, a * (k < 0.15 ? 1 : 0.9));
    g.strokeStyle = `rgba(${P.col},${a})`; g.lineWidth = 3 * a + 1;
    g.beginPath(); g.ellipse(bx, by, rr, rr * 0.75, 0, 0, TAU); g.stroke();
    if (P.rings) for (let j = 1; j <= P.rings; j++) {
      const q = cl(k * 1.3 - j * 0.18); if (q <= 0 || q >= 1) continue;
      const r2 = P.ring * S * (0.3 + eo(q));
      g.strokeStyle = `rgba(${P.col},${(1 - q) * 0.8})`; g.lineWidth = 2.2;
      g.beginPath(); g.ellipse(bx, by, r2, r2 * 0.75, 0, 0, TAU); g.stroke();
    }
    if (P.n) sparks(() => { g.strokeStyle = `rgba(${P.col},${a})`; g.lineWidth = 2.2; g.stroke(); });
    if (P.star) star4(g, bx, by, 36 * (1 - k * 0.7), '255,255,240', a);
    if (P.shards) {
      for (let i = 0; i < N(8); i++) {
        const an = i / 8 * TAU + H(f, i) * 0.4, d = 8 + 34 * e;
        g.save(); g.translate(bx + Math.cos(an) * d, by + Math.sin(an) * d * 0.8); g.rotate(an);
        g.beginPath(); g.moveTo(10, 0); g.lineTo(0, -3.2); g.lineTo(-7, 0); g.lineTo(0, 3.2); g.closePath();
        nrm(g); g.fillStyle = `rgba(70,150,220,${0.8 * a})`; g.fill();
        lit(g); g.strokeStyle = `rgba(235,250,255,${a})`; g.lineWidth = 1.2; g.stroke();
        g.restore();
      }
    }
    if (P.rift) { g.strokeStyle = `rgba(210,150,255,${a})`; g.lineWidth = 2; g.beginPath(); g.ellipse(bx, by, 9 + 16 * e, 24 * (1 - k * 0.6), 0.5, 0, TAU); g.stroke(); }
  };

  // ===== โปรเจกไทล์ =====
  function projAt(f, k) {
    const [tx, ty] = body(f.ref), arc = f.arc || 0;
    const x = f.X0 + (tx - f.X0) * k, y = f.Y0 + (ty - f.Y0) * k - Math.sin(k * Math.PI) * arc;
    const a = Math.atan2((ty - f.Y0) - Math.cos(k * Math.PI) * Math.PI * arc, tx - f.X0);
    return [x, y, a];
  }
  function trailPts(f, k, n, step) { const out = []; for (let j = 0; j <= n; j++) { const kj = k - j * step; if (kj < 0) break; out.push(projAt(f, kj)); } return out; }
  const PS = 1.45; // ขนาดตัวโปรเจกไทล์
  // หางโปรเจกไทล์: dk = ชั้นล่างสีเข้ม (ให้เห็นชัดบนพื้นสว่าง)
  function strokeTrail(g, pts, col, w, a, dk) {
    if (pts.length < 2) return;
    for (let pass = dk ? 0 : 1; pass < 2; pass++) {
      if (pass) lit(g); else nrm(g);
      for (let j = 1; j < pts.length; j++) {
        const q = 1 - j / pts.length;
        g.strokeStyle = pass ? `rgba(${col},${a * q})` : `rgba(${dk},${0.45 * a * q})`; g.lineWidth = (w + (pass ? 0 : 3)) * (0.35 + 0.65 * q);
        g.beginPath(); g.moveTo(pts[j - 1][0], pts[j - 1][1]); g.lineTo(pts[j][0], pts[j][1]); g.stroke();
      }
    }
  }
  const PROJ = {
    knife_spin(g, f, k, t, x, y, a) {
      lit(g); strokeTrail(g, trailPts(f, k, 6, 0.05), '220,230,255', 4, 0.7, '70,80,110');
      glow(g, x, y, 16, '200,215,255', 0.45);
      g.strokeStyle = 'rgba(230,240,255,0.35)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 10, 0, TAU); g.stroke();
      nrm(g); g.translate(x, y); g.scale(PS, PS); g.rotate(f.t * 30);
      g.fillStyle = '#eef3ff'; g.strokeStyle = '#4c5466'; g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(-1, -2.4); g.lineTo(11, 0); g.lineTo(-1, 2.4); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#d0b468'; g.fillRect(-2.4, -3.8, 1.8, 7.6);
      g.fillStyle = '#3a2c3c'; g.fillRect(-8.5, -1.5, 6.4, 3);
    },
    axe_spin(g, f, k, t, x, y, a) {
      lit(g); strokeTrail(g, trailPts(f, k, 6, 0.05), '255,150,70', 6, 0.6, '150,60,20');
      glow(g, x, y, 22, '255,140,60', 0.45);
      const sp = f.t * 18;
      g.strokeStyle = 'rgba(255,170,90,0.45)'; g.lineWidth = 3;
      g.beginPath(); g.arc(x, y, 16, sp, sp + 1.9); g.stroke(); g.beginPath(); g.arc(x, y, 16, sp + Math.PI, sp + Math.PI + 1.9); g.stroke();
      nrm(g); g.translate(x, y); g.scale(PS, PS); g.rotate(sp);
      g.fillStyle = '#6a4528'; g.fillRect(-12, -1.7, 21, 3.4);
      g.fillStyle = '#cfd4dc'; g.strokeStyle = '#3e4048'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(4, -2.5); g.lineTo(9, -11); g.quadraticCurveTo(18, -6, 18, 0); g.quadraticCurveTo(18, 6, 9, 11); g.lineTo(4, 2.5); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = '#ffffff'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(10, -9.5); g.quadraticCurveTo(17, -5, 17, 0); g.stroke();
    },
    shield_spin(g, f, k, t, x, y, a) {
      lit(g);
      for (let j = 1; j <= 2; j++) { const [gx, gy] = projAt(f, Math.max(0, k - j * 0.07)); glow(g, gx, gy, 14, '255,220,140', 0.22 / j); }
      glow(g, x, y, 20, '255,220,140', 0.5);
      nrm(g); g.translate(x, y); g.scale(PS, PS); g.rotate(a); g.scale(1, 0.62); g.rotate(f.t * 16);
      g.fillStyle = '#6e5630'; g.beginPath(); g.arc(0, 0, 11, 0, TAU); g.fill();
      g.fillStyle = '#c8b278'; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill();
      g.fillStyle = '#8a6a3a'; g.fillRect(-9, -1.8, 18, 3.6); g.fillRect(-1.8, -9, 3.6, 18);
      g.fillStyle = '#f2e6b0'; g.beginPath(); g.arc(0, 0, 3.4, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,250,220,0.9)'; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, 10, -2.4, -0.9); g.stroke();
    },
    void_lance(g, f, k, t, x, y, a) {
      lit(g);
      const pts = trailPts(f, k, 9, 0.035);
      strokeTrail(g, pts, '140,60,255', 14, 0.35, '40,10,70'); strokeTrail(g, pts, '200,140,255', 5, 0.8);
      for (let j = 1; j < pts.length; j += 2) glow(g, pts[j][0] + Math.sin(f.t * 30 + j) * 4, pts[j][1] + Math.cos(f.t * 25 + j) * 4, 6, '170,80,255', 0.5 * (1 - j / pts.length));
      glow(g, x, y, 24, '160,70,255', 0.8);
      nrm(g); g.translate(x, y); g.scale(PS, PS); g.rotate(a);
      g.fillStyle = '#140822'; g.fillRect(-26, -1.8, 28, 3.6);
      g.fillStyle = '#1e0a36'; g.strokeStyle = '#d8a8ff'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(1, -6); g.lineTo(20, 0); g.lineTo(1, 6); g.lineTo(5, 0); g.closePath(); g.fill(); g.stroke();
      lit(g); g.strokeStyle = 'rgba(200,140,255,0.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-26, -2.2); g.lineTo(2, -2.2); g.stroke();
    },
    frost_arrow(g, f, k, t, x, y, a) {
      lit(g);
      const pts = trailPts(f, k, 7, 0.04);
      strokeTrail(g, pts, '150,220,255', 7, 0.6, '40,110,190');
      g.fillStyle = 'rgba(235,250,255,0.9)';
      for (let j = 1; j < pts.length; j++) { const o = (H(f, j) - 0.5) * 10; g.fillRect(pts[j][0] + o * 0.3, pts[j][1] + o, 2, 2); }
      glow(g, x, y, 16, '140,220,255', 0.7);
      nrm(g); g.translate(x, y); g.scale(PS, PS); g.rotate(a);
      g.strokeStyle = '#bfefff'; g.lineWidth = 2; g.beginPath(); g.moveTo(-17, 0); g.lineTo(4, 0); g.stroke();
      g.fillStyle = '#eaffff'; g.strokeStyle = '#6fc8f0'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(3, -5); g.lineTo(16, 0); g.lineTo(3, 5); g.lineTo(6, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#9ad8ff'; g.beginPath(); g.moveTo(-17, 0); g.lineTo(-21, -4); g.lineTo(-13, 0); g.lineTo(-21, 4); g.closePath(); g.fill();
    },
    charge_arrow(g, f, k, t, x, y, a) {
      lit(g);
      for (const j of [0.2, 0.45, 0.7]) {
        if (k <= j) continue;
        const age = cl((k - j) / 0.45), [px, py, pa] = projAt(f, j);
        g.save(); g.translate(px, py); g.rotate(pa);
        g.strokeStyle = `rgba(255,232,170,${(1 - age) * 0.85})`; g.lineWidth = 2.2;
        g.beginPath(); g.ellipse(0, 0, 3 + age * 5, 9 + age * 16, 0, 0, TAU); g.stroke(); g.restore();
      }
      glow(g, x, y, 26, '255,215,140', 0.65);
      g.translate(x, y); g.scale(PS, PS); g.rotate(a);
      g.strokeStyle = 'rgba(255,230,160,0.35)'; g.lineWidth = 9; g.beginPath(); g.moveTo(-46, 0); g.lineTo(-10, 0); g.stroke();
      nrm(g);
      R.arrowGlyph(g,'charge',k);
    },
    volley(g, f, k, t, x, y, a) { arrowBody(g, f, k, x, y, a, '255,220,120', '#ffe9a8', (f.n - 1) * 5); },
    twin(g, f, k, t, x, y, a) { arrowBody(g, f, k, x, y, a, '200,255,150', '#e6ffc8', f.n % 2 ? 5 : -5); },
    sonic(g, f, k, t, x, y, a) {
      for (let pass = 0; pass < 2; pass++) {
        if (pass) lit(g); else nrm(g);
        for (let j = 0; j < 3; j++) {
          const kj = k - j * 0.1; if (kj < 0) continue;
          const [px, py, pa] = projAt(f, kj);
          g.save(); g.translate(px, py); g.rotate(pa);
          g.strokeStyle = pass ? `rgba(160,235,255,${1 - j * 0.25})` : `rgba(20,80,130,${0.5 * (1 - j * 0.25)})`; g.lineWidth = (pass ? 3.2 : 6.5) - j * 0.7;
          g.beginPath(); g.arc(-8, 0, 14 + j * 7, -1.15, 1.15); g.stroke(); g.restore();
        }
      }
      glow(g, x, y, 20, '150,230,255', 0.6);
      nrm(g); g.fillStyle = 'rgba(30,90,140,0.8)'; note(g, x - 3, y - 11 + Math.sin(f.t * 30) * 2, 1.1);
      lit(g); g.fillStyle = g.strokeStyle = 'rgba(200,245,255,0.9)'; note(g, x - 4, y - 12 + Math.sin(f.t * 30) * 2, 1.05);
    },
    drain(g, f, k, t, x, y, a) {
      lit(g); strokeTrail(g, trailPts(f, k, 6, 0.05), '160,80,255', 8, 0.6, '50,15,90');
      glow(g, x, y, 16, '160,80,255', 0.85);
      nrm(g); g.fillStyle = '#1a0a2a'; g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill();
    },
  };
  function arrowBody(g, f, k, x, y, a, col, shaft, off) {
    lit(g);
    g.translate(x, y); g.scale(PS, PS); g.rotate(a); g.translate(0, off);
    g.strokeStyle = `rgba(${col},0.4)`; g.lineWidth = 5; g.beginPath(); g.moveTo(-40, 0); g.lineTo(-8, 0); g.stroke();
    glow(g, 4, 0, 12, col, 0.6);
    nrm(g);
    R.arrowGlyph(g,'piercing',k);
  }
  for (const kname in PROJ) DRAW[kname] = (g, f, k, t) => { if (f.t >= f.dur) return; const [x, y, a] = projAt(f, k); PROJ[kname](g, f, k, t, x, y, a); };

  DRAW.drain_back = (g, f, k) => {
    const p = G.player, [sx, sy] = body(f.ref), [ex, ey] = body(p);
    const dx = ex - sx, dy = ey - sy, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const at = (i, q) => { const bend = (i % 2 ? 1 : -1) * (24 + 22 * H(f, i)) * Math.sin(q * Math.PI); return [sx + dx * eo(q) + nx * bend, sy + dy * eo(q) + ny * bend - Math.sin(q * Math.PI) * 10]; };
    for (let i = 0; i < N(5); i++) {
      const q = cl((f.t - i * 0.07) / 0.5); if (q <= 0 || q >= 1) continue;
      g.beginPath();
      for (let j = 0; j <= 8; j++) { const [x, y] = at(i, Math.max(0, q - j * 0.03)); g.lineTo(x, y); }
      g.lineCap = 'round'; nrm(g); g.strokeStyle = 'rgba(60,15,100,0.45)'; g.lineWidth = 7; g.stroke();
      lit(g); g.strokeStyle = 'rgba(200,140,255,0.8)'; g.lineWidth = 2.5; g.stroke();
      const [x, y] = at(i, q);
      nrm(g); g.fillStyle = 'rgba(60,10,100,0.85)'; g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill();
      lit(g); glow(g, x, y, 13, '180,100,255', 0.95); g.fillStyle = '#fff'; g.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
    if (k > 0.55) glow(g, ex, ey, 30, '180,110,255', (1 - k) * 1.8);
  };

  // ===== เส้นสายฟ้ากระโดด =====
  DRAW.chain = (g, f, k, t) => {
    const a = (1 - k) * (0.7 + 0.3 * U.hash2((t * 40) | 0, 3, f.seed));
    const [x1, y1] = f.from || body(f.ref), [x2, y2] = f.to || body(f.ref);
    const seed = f.seed + ((f.t * 12) | 0);
    lit(g);
    boltGlow(g, x1, y1, x2, y2, seed, Math.min(13, Math.hypot(x2 - x1, y2 - y1) * 0.12), 14, '145,212,255', a,.75);
    for (let b = 0; b < N(2); b++) {
      const q = 0.3 + 0.4 * U.hash2(b, seed, 2), bx = x1 + (x2 - x1) * q, by = y1 + (y2 - y1) * q, an = U.hash2(b, seed, 5) * TAU;
      boltGlow(g, bx, by, bx + Math.cos(an) * 22, by + Math.sin(an) * 16, seed + b * 9, 4, 6, '255,225,150', a * 0.65, 0.4);
    }
    glow(g, x2, y2, 20, '150,215,255', a*.7); glow(g, x1, y1, 10, '150,215,255', a * 0.5);
  };

  // ===== Snipe: ประกายที่คันธนู → เส้นกระสุนร้อน → แสงกระทบ =====
  DRAW.snipe = (g, f, k, t) => {
    const T = f.t, [tx, ty] = body(f.ref);
    if(T<.12&&typeof ProjectileArt!=='undefined'){
      const q=cl(T/.12),dx=tx-f.X0,dy=ty-f.Y0;
      ProjectileArt.head(g,f.X0+dx*q,f.Y0+dy*q,Math.atan2(dy,dx),104,T,Math.hypot(dx,dy)*q);
    }
    lit(g);
    if (T < 0.16) { const q = T / 0.16; glow(g, f.X0, f.Y0, 18 + 10 * q, '255,240,190', 1); star4(g, f.X0, f.Y0, 6 + 16 * Math.sin(q * Math.PI), '255,255,240', 1); }
    if (T >= 0.08) {
      const af = 1 - cl((T - 0.12) / 0.3);
      g.strokeStyle = `rgba(255,200,120,${0.35 * af})`; g.lineWidth = 7; g.beginPath(); g.moveTo(f.X0, f.Y0); g.lineTo(tx, ty); g.stroke();
      g.strokeStyle = `rgba(255,250,225,${af})`; g.lineWidth = 1.8; g.beginPath(); g.moveTo(f.X0, f.Y0); g.lineTo(tx, ty); g.stroke();
    }
    if (T >= 0.12) {
      const q = cl((T - 0.12) / 0.48);
      glow(g, tx, ty, 46 * (0.6 + 0.5 * q), '255,220,150', 1 - q);
      g.strokeStyle = `rgba(255,230,170,${1 - q})`; g.lineWidth = 2;
      const r = 10 + 30 * eo(q); g.beginPath(); g.arc(tx, ty, r, 0, TAU); g.stroke();
      g.beginPath();
      for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2 + Math.PI / 4; g.moveTo(tx + Math.cos(an) * r * 0.6, ty + Math.sin(an) * r * 0.6); g.lineTo(tx + Math.cos(an) * (r + 10), ty + Math.sin(an) * (r + 10)); }
      g.stroke();
    }
  };

  // ===== ดาบแสงแห่งสคูลด์ ตกจากฟ้า =====
  DRAW.judgment = (g, f, k, t, X, Y) => {
    const T = f.t, ti = f.hitAt || 0.3, q = cl(T / ti), e = q * q;
    const a = T > 0.55 ? cl(1 - (T - 0.55) / 0.4) : 1;
    const tip = Y - 4 - (1 - e) * 280;
    lit(g);
    glow(g, X, tip - 50, 64, '255,240,190', 0.55 * a, 1.7);
    if (T < ti) { g.strokeStyle = `rgba(255,240,180,${0.5 * q})`; g.lineWidth = 1.5; gEll(g, X, Y, 30 - 10 * q); g.stroke(); }
    nrm(g); g.globalAlpha = a;
    g.fillStyle = '#fffbe8'; g.beginPath(); g.moveTo(X, tip); g.lineTo(X - 7, tip - 16); g.lineTo(X - 7, tip - 98); g.lineTo(X + 7, tip - 98); g.lineTo(X + 7, tip - 16); g.closePath(); g.fill();
    g.strokeStyle = '#ffd56a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X, tip - 6); g.lineTo(X, tip - 96); g.stroke();
    g.fillStyle = '#ffd56a'; g.fillRect(X - 24, tip - 104, 48, 7);
    g.fillStyle = '#c9a040'; g.fillRect(X - 3, tip - 128, 6, 24);
    g.fillStyle = '#ffe9a0'; g.beginPath(); g.arc(X, tip - 132, 5, 0, TAU); g.fill();
    g.globalAlpha = 1;
    if (T >= ti) {
      const q2 = cl((T - ti) / (f.dur - ti));
      lit(g);
      glow(g, X, Y - 16, 90, '255,245,200', 1 - q2 * 2.2);
      g.strokeStyle = `rgba(255,235,160,${1 - q2})`; g.lineWidth = 3 * (1 - q2) + 1; gEll(g, X, Y, 16 + 70 * eo(q2)); g.stroke();
      g.strokeStyle = `rgba(255,250,220,${(1 - q2) * 0.6})`; g.lineWidth = 1.5; gEll(g, X, Y, 10 + 46 * eo(q2)); g.stroke();
      g.beginPath();
      for (let i = 0; i < 8; i++) { const an = i / 8 * TAU + 0.2, d = 50 * eo(cl(q2 * 3)); g.moveTo(X, Y); g.lineTo(X + Math.cos(an) * d, Y + Math.sin(an) * d * R.K); }
      g.strokeStyle = `rgba(255,230,140,${(1 - q2) * 0.8})`; g.lineWidth = 1.5; g.stroke();
    }
  };

  // ===== ระยะประชิด =====
  function dirOf(f) { return f.ref.x >= (f.px != null ? f.px : G.player.x) ? 1 : -1; }
  // ชั้นล่างทึบสีเข้ม + ชั้นบนเรืองแสง (+ แกนขาว) ให้อ่านออกทั้งบนหญ้าสว่างและในถ้ำมืด
  function duo(g, path, dark, light, a, core) {
    path(); nrm(g); g.fillStyle = `rgba(${dark},${0.85 * a})`; g.fill();
    lit(g); g.fillStyle = `rgba(${light},${0.6 * a})`; g.fill();
    if (core) { core(); g.fillStyle = `rgba(255,255,255,${0.95 * a})`; g.fill(); }
  }
  function ringDuo(g, x, y, r, sy, dark, light, a, w) {
    g.beginPath(); g.ellipse(x, y, r, r * sy, 0, 0, TAU);
    nrm(g); g.strokeStyle = `rgba(${dark},${0.5 * a})`; g.lineWidth = w + 3; g.stroke();
    lit(g); g.strokeStyle = `rgba(${light},${a})`; g.lineWidth = w; g.stroke();
  }
  DRAW.holy_fist = (g, f, k) => {
    const [bx, by] = body(f.ref), q = cl(k / 0.28), a = 1 - cl((k - 0.4) / 0.6), dir = dirOf(f);
    const rays = () => { g.beginPath(); for (let i = 0; i < 12; i++) { const an = i / 12 * TAU + k * 0.8, L = (26 + 46 * eo(q)) * (i % 2 ? 0.6 : 1); g.moveTo(bx + Math.cos(an) * L * 0.45, by + Math.sin(an) * L * 0.45); g.lineTo(bx + Math.cos(an) * L, by + Math.sin(an) * L); } };
    nrm(g); rays(); g.strokeStyle = `rgba(160,100,10,${0.5 * a})`; g.lineWidth = 5; g.stroke();
    lit(g); glow(g, bx, by, 70 * (0.6 + 0.6 * q), '255,215,110', a);
    rays(); g.strokeStyle = `rgba(255,235,150,${a})`; g.lineWidth = 2.2; g.stroke();
    ringDuo(g, bx, by, 14 + 46 * eo(k), 1, '160,100,10', '255,230,140', 1 - k, 3);
    // กำปั้นทอง
    const s = (1.7 - 0.7 * eo3(q)) * 1.45, fx = bx - dir * 34 * (1 - eo3(q)) - dir * 8;
    const rr = (x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill(); g.stroke(); };
    g.save(); g.translate(fx, by); g.scale(dir * s, s); g.globalAlpha = a;
    nrm(g); g.fillStyle = '#ffcf4a'; g.strokeStyle = '#7a4c08'; g.lineWidth = 1.3;
    rr(-19, -6, 10, 12, 2); rr(-11, -10, 15, 20, 4);
    for (let i = 0; i < 4; i++) rr(2, -10 + i * 5, 7, 4.6, 2.2);
    rr(-7, -13, 11, 5, 2.5);
    lit(g); g.fillStyle = 'rgba(255,250,210,0.55)'; g.fillRect(-9, -8, 11, 4);
    g.restore();
    lit(g); glow(g, bx + dir * 4, by, 26, '255,250,220', a * (1 - q * 0.5));
  };
  DRAW.palm = (g, f, k) => {
    const [bx, by] = body(f.ref), i = f.n % 3, ox = [-12, 12, 0][i], oy = [-4, 4, -18][i];
    const q = cl(k / 0.25), a = 1 - cl((k - 0.3) / 0.7), s = (1.5 - 0.5 * eo3(q)) * 1.6, x = bx + ox, y = by + oy;
    lit(g); glow(g, x, y, 34, '255,190,110', 0.55 * a);
    ringDuo(g, x, y, 10 + 40 * eo(k), 1, '150,80,10', '255,210,140', 1 - k, 2.5);
    const palm = sc2 => () => {
      g.beginPath();
      g.ellipse(x, y + 3 * s, 7.5 * s * sc2, 8.5 * s * sc2, 0, 0, TAU);
      for (let j = 0; j < 4; j++) { const fx = x + (-5.4 + j * 3.6) * s, fy = y + (-9 - (j === 1 || j === 2 ? 1.5 : 0)) * s; g.moveTo(fx + 1.7 * s * sc2, fy); g.ellipse(fx, fy, 1.7 * s * sc2, 5 * s * sc2, 0, 0, TAU); }
      g.moveTo(x - 9 * s + 1.8 * s * sc2, y + 3 * s); g.ellipse(x - 9 * s, y + 3 * s, 1.8 * s * sc2, 4.6 * s * sc2, -0.8, 0, TAU);
    };
    duo(g, palm(1), '160,80,10', '255,190,90', a, palm(0.3));
  };
  DRAW.divine_burst = (g, f, k) => {
    const [bx, by] = body(f.ref), a = 1 - k, e = eo3(k);
    lit(g);
    glow(g, bx, by, 120 * (0.4 + e), '255,240,190', 1 - k * 1.7);
    glow(g, bx, by, 40, '255,255,255', 1 - k * 3);
    const rays = () => { g.beginPath(); for (let i = 0; i < N(16); i++) { const an = i / N(16) * TAU + k * 0.6, L = (40 + 70 * e) * (i % 2 ? 0.55 : 1), w = 0.06; g.moveTo(bx + Math.cos(an - w) * 10, by + Math.sin(an - w) * 10); g.lineTo(bx + Math.cos(an) * L, by + Math.sin(an) * L); g.lineTo(bx + Math.cos(an + w) * 10, by + Math.sin(an + w) * 10); } };
    nrm(g); rays(); g.strokeStyle = `rgba(170,120,20,${0.4 * a})`; g.lineWidth = 2; g.stroke();
    lit(g); rays(); g.fillStyle = `rgba(255,240,180,${0.8 * a})`; g.fill();
    for (let j = 0; j < 2; j++) { const q = cl(k * 1.4 - j * 0.2); if (q < 1) ringDuo(g, bx, by, 14 + 70 * eo(q), 1, '170,120,20', '255,245,200', 1 - q, 3); }
    for (let i = 0; i < N(12); i++) { const an = H(f, i) * TAU, d = 20 + 80 * e * (0.5 + H(f, i, 2) * 0.5); star4(g, bx + Math.cos(an) * d, by + Math.sin(an) * d * 0.8, 6 * a, '255,250,220', a); }
  };
  DRAW.mirror = (g, f, k) => {
    const [bx, by] = body(f.ref), d = f.n % 2 ? 1 : -1, q = eo(cl(k / 0.45)), a = 1 - cl((k - 0.35) / 0.65);
    lit(g); glow(g, bx, by, 34, '220,140,255', a * 0.7);
    for (const [m, al, off] of [[-1, 0.4, 9], [1, 1, 0]]) {
      g.save(); g.translate(bx + off * d, by - 4 - off * 0.6); g.scale(d * m, 1);
      const a0 = -2.5, a1 = a0 + 2.4 * q;
      duo(g, () => crescent(g, 0, 0, 40, a0, a1, 13), '100,25,160', '230,150,255', a * al, () => crescent(g, 0, 0, 40, a0, a1, 4));
      g.restore();
    }
    for (let i = 0; i < N(7); i++) {
      const an = H(f, i) * TAU, r = 12 + 40 * eo(k) * H(f, i, 2);
      g.save(); g.translate(bx + Math.cos(an) * r, by + Math.sin(an) * r); g.rotate(an + k * 6);
      g.beginPath(); g.moveTo(0, -5); g.lineTo(3, 3); g.lineTo(-3, 3); g.closePath();
      nrm(g); g.fillStyle = `rgba(90,30,140,${0.7 * a})`; g.fill(); lit(g); g.strokeStyle = `rgba(245,225,255,${a})`; g.lineWidth = 1; g.stroke();
      g.restore();
    }
  };
  DRAW.fang = (g, f, k) => {
    const [bx, by] = body(f.ref), q = eo3(cl(k / 0.3)), a = 1 - cl((k - 0.35) / 0.65);
    lit(g); glow(g, bx, by, 46, '220,40,130', a * 0.8);
    for (const sd of [-1, 1]) {
      g.save(); g.translate(bx + sd * 34 * (1 - q), by - 6); g.scale(sd, 1);
      const a0 = Math.PI - 1.0, a1 = a0 + 2.0 * q;
      duo(g, () => crescent(g, 42, 0, 48, a0, a1, 15), '110,10,70', '255,90,180', a, () => crescent(g, 42, 0, 48, a0, a1, 4.5));
      g.restore();
    }
    for (let i = 0; i < N(7); i++) {
      const tt = cl((f.t - 0.12 - H(f, i) * 0.15) / 0.35); if (tt <= 0 || tt >= 1) continue;
      const x = bx + (H(f, i, 2) - 0.5) * 40, y = by + 6 + tt * 30;
      g.beginPath(); g.moveTo(x, y - 6); g.quadraticCurveTo(x + 3.5, y, x, y + 3); g.quadraticCurveTo(x - 3.5, y, x, y - 6);
      nrm(g); g.fillStyle = `rgba(60,170,30,${(1 - tt) * 0.95})`; g.fill();
      lit(g); g.fillStyle = `rgba(170,255,120,${(1 - tt) * 0.6})`; g.fill();
    }
  };
  DRAW.bite = (g, f, k) => {
    const [bx, by] = body(f.ref), q = eo3(cl(k / 0.3)), a = 1 - cl((k - 0.35) / 0.65), gap = 36 * (1 - q) + 3;
    lit(g); glow(g, bx, by, 50, '255,70,40', a * 0.75);
    for (const sd of [-1, 1]) {
      const cy = by + sd * gap;
      const jaw = w => () => crescent(g, bx, cy - sd * 26, 38, sd < 0 ? 0.35 : Math.PI + 0.35, sd < 0 ? Math.PI - 0.35 : TAU - 0.35, w);
      duo(g, jaw(11), '140,15,10', '255,100,60', a, jaw(3));
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const tx = bx - 25 + i * 10, ty = cy - sd * (i === 0 || i === 5 ? 8 : 2), h = (i === 1 || i === 4 ? 14 : 9) * sd;
        g.moveTo(tx - 4, ty); g.lineTo(tx + 4, ty); g.lineTo(tx, ty + h); g.closePath();
      }
      nrm(g); g.fillStyle = `rgba(255,245,235,${a})`; g.fill(); g.strokeStyle = `rgba(110,20,10,${0.8 * a})`; g.lineWidth = 1; g.stroke();
    }
    if (k > 0.25) {
      const q2 = cl((k - 0.25) / 0.75);
      nrm(g); g.fillStyle = `rgba(200,30,20,${1 - q2})`;
      for (let i = 0; i < N(10); i++) { const an = H(f, i) * TAU, d = 10 + 46 * eo(q2) * H(f, i, 2); g.beginPath(); g.arc(bx + Math.cos(an) * d, by + Math.sin(an) * d * 0.7 + q2 * 10, 2.4, 0, TAU); g.fill(); }
    }
  };
  DRAW.charge = (g, f, k) => {
    const [bx, by] = body(f.ref), sx = f.px * TILE, sy = f.py * TILE * R.K - 26;
    const dx = bx - sx, dy = by - sy, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux, a = 1 - k;
    lit(g);
    for (let i = 0; i < N(8); i++) {
      const o = (H(f, i) - 0.5) * 34, s0 = cl(k * 1.6 + H(f, i, 2) * 0.4 - 0.2), s1 = cl(s0 + 0.35);
      g.strokeStyle = `rgba(255,${170 + (i % 3) * 25},100,${0.7 * a})`; g.lineWidth = 2;
      g.beginPath(); g.moveTo(sx + dx * s0 + nx * o, sy + dy * s0 + ny * o); g.lineTo(sx + dx * s1 + nx * o * 0.6, sy + dy * s1 + ny * o * 0.6); g.stroke();
    }
    const q = cl(k / 0.6);
    glow(g, bx, by, 44 * (0.6 + 0.6 * q), '255,150,70', 1 - q);
    g.strokeStyle = `rgba(255,200,130,${1 - q})`; g.lineWidth = 3;
    const ang = Math.atan2(uy, ux);
    for (let j = 0; j < 2; j++) { const r = 12 + 34 * eo(cl(q * 1.3 - j * 0.2)); g.beginPath(); g.arc(bx, by, r, ang - 0.9, ang + 0.9); g.stroke(); }
    g.strokeStyle = `rgba(255,240,210,${1 - q})`; g.lineWidth = 1.5; g.beginPath();
    for (let i = 0; i < 6; i++) { const an = ang + (i / 5 - 0.5) * 1.6, d = 14 + 30 * eo(q); g.moveTo(bx + Math.cos(an) * d * 0.5, by + Math.sin(an) * d * 0.5); g.lineTo(bx + Math.cos(an) * d, by + Math.sin(an) * d); }
    g.stroke();
  };
  DRAW.titan = (g, f, k, t, X, Y) => {
    if(typeof JudgmentVFX!=='undefined'&&JudgmentVFX.ground(g,X,Y,170,f.t,f.dur))return;
    const a = 1 - k, e = eo3(k), Rr = 70;
    nrm(g);
    for (let i = 0; i < N(14); i++) { const an = i / N(14) * TAU + H(f, i) * 0.3, d = Rr * e * (0.8 + 0.3 * H(f, i, 2)); puff(g, X + Math.cos(an) * d, Y + Math.sin(an) * d * R.K - 8, 12 + 12 * k, '165,145,115', 0.55 * a); }
    g.strokeStyle = `rgba(40,25,12,${0.85 * a})`; g.lineWidth = 3; g.beginPath();
    for (let i = 0; i < 7; i++) {
      const an = i / 7 * TAU + H(f, i, 3), L = (26 + 22 * H(f, i, 4)) * eo3(cl(k * 4));
      g.moveTo(X, Y); g.lineTo(X + Math.cos(an + 0.15) * L * 0.5, Y + Math.sin(an + 0.15) * L * 0.5 * R.K); g.lineTo(X + Math.cos(an) * L, Y + Math.sin(an) * L * R.K);
    }
    g.stroke();
    g.fillStyle = `rgba(105,80,52,${a})`;
    for (let i = 0; i < N(10); i++) { const an = H(f, i, 5) * TAU, v = 30 + 40 * H(f, i, 6), q = cl(k * 1.4); g.fillRect(X + Math.cos(an) * v * q - 2, Y + Math.sin(an) * v * q * R.K - Math.sin(q * Math.PI) * (30 + 40 * H(f, i, 7)) - 2, 4, 4); }
    lit(g);
    glow(g, X, Y - 14, 70, '255,190,110', 1 - k * 3);
    g.strokeStyle = `rgba(255,220,160,${a})`; g.lineWidth = 4 * a + 1; gEll(g, X, Y, 14 + Rr * e); g.stroke();
  };

  // ===== พื้นที่ที่เป้า =====
  DRAW.meteor = (g, f, k, t, X, Y) => {
    const T = f.t, ti = SPEC.meteor.impact, Rr = f.r * TILE;
    if (T < ti) {
      const q = T / ti, e = Math.pow(q, 1.5);
      g.strokeStyle = `rgba(255,90,40,${0.25 + 0.5 * q})`; g.lineWidth = 2; gEll(g, X, Y, Rr * (1.15 - 0.15 * q)); g.stroke();
      g.fillStyle = `rgba(255,80,30,${0.14 * q})`; g.fill();
      const sx = X + 170, sy = Y - 330, ex = X, ey = Y - 14, P = qq => [sx + (ex - sx) * qq, sy + (ey - sy) * qq], [mx, my] = P(e);
      for (let j = N(8); j >= 1; j--) { const [px, py] = P(Math.max(0, e - j * 0.06)); puff(g, px + (H(f, j) - 0.5) * 10, py, 10 + j * 2.4, '60,45,40', 0.5 * (1 - j / 9)); }
      lit(g);
      const [tx, ty] = P(Math.max(0, e - 0.28));
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(255,110,40,0.35)'; g.lineWidth = 18; g.beginPath(); g.moveTo(tx, ty); g.lineTo(mx, my); g.stroke();
      g.strokeStyle = 'rgba(255,220,150,0.8)'; g.lineWidth = 5; g.stroke();
      for (let j = N(10); j >= 1; j--) { const [px, py] = P(Math.max(0, e - j * (LQ() ? 0.07 : 0.035))); glow(g, px, py, 30 - j * 2, j < 4 ? '255,190,80' : '255,90,30', 0.65 - j * 0.045); }
      const meteorArt=Art.get('vfx_art_meteor');
      if(meteorArt){
        // The existing trajectory and impact timer remain authoritative.
        nrm(g);g.drawImage(meteorArt,256,0,256,256,mx-50,my-62,100,100);
        return;
      }
      glow(g, mx, my, 58, '255,150,50', 0.95); glow(g, mx, my, 24, '255,250,220', 1);
      nrm(g); g.fillStyle = '#2a140c'; g.beginPath(); g.arc(mx, my, 11, 0, TAU); g.fill();
      lit(g); const da = Math.atan2(ey - sy, ex - sx);
      g.strokeStyle = 'rgba(255,180,80,0.95)'; g.lineWidth = 3; g.beginPath(); g.arc(mx, my, 11, da - 1.4, da + 1.4); g.stroke();
      g.fillStyle = 'rgba(255,120,40,0.7)'; g.beginPath(); g.arc(mx - 3, my + 2, 4, 0, TAU); g.fill();
      return;
    }
    const q = (T - ti) / (f.dur - ti), a = 1 - cl((q - 0.55) / 0.45);
    nrm(g);
    g.fillStyle = `rgba(28,14,8,${0.5 * a})`; gEll(g, X, Y, Rr * 0.5); g.fill();
    g.strokeStyle = `rgba(80,40,20,${0.6 * a})`; g.lineWidth = 3; gEll(g, X, Y, Rr * 0.55); g.stroke();
    if (q > 0.15) for (let i = 0; i < N(6); i++) { const qq = cl((q - 0.15 - H(f, i) * 0.2) / 0.6); if (qq > 0 && qq < 1) puff(g, X + (H(f, i, 2) - 0.5) * Rr, Y - 20 - qq * 50, 16 + qq * 18, '70,58,50', 0.4 * (1 - qq)); }
    lit(g);
    g.strokeStyle = `rgba(255,150,60,${0.8 * a})`; g.lineWidth = 1.6; g.beginPath();
    for (let i = 0; i < 7; i++) { const an = i / 7 * TAU + H(f, i, 3), L = Rr * 0.45 * (0.6 + 0.4 * H(f, i, 4)); g.moveTo(X, Y); g.lineTo(X + Math.cos(an + 0.2) * L * 0.5, Y + Math.sin(an + 0.2) * L * 0.5 * R.K); g.lineTo(X + Math.cos(an) * L, Y + Math.sin(an) * L * R.K); }
    g.stroke();
    const qr = cl(q * 2.4), rr = Rr * eo3(qr);
    g.strokeStyle = `rgba(255,170,70,${(1 - qr) * 0.95})`; g.lineWidth = 7 * (1 - qr) + 1; gEll(g, X, Y, rr); g.stroke();
    g.strokeStyle = `rgba(255,250,220,${(1 - qr) * 0.8})`; g.lineWidth = 1.5; gEll(g, X, Y, rr * 0.93); g.stroke();
    for (let i = 0; i < N(18); i++) {
      const an = i / N(18) * TAU, x = X + Math.cos(an) * rr, y = Y + Math.sin(an) * rr * R.K, h = (14 + 10 * H(f, i, 5)) * (1 - qr);
      if (h < 1) continue;
      g.fillStyle = `rgba(255,${110 + (i % 3) * 45},40,${1 - qr})`;
      g.beginPath(); g.moveTo(x, y - h * 1.6); g.quadraticCurveTo(x + 6, y - h * 0.5, x, y); g.quadraticCurveTo(x - 6, y - h * 0.5, x, y - h * 1.6); g.fill();
    }
    glow(g, X, Y - 12, 150 * (0.5 + q), '255,160,70', 1 - q * 3);
    glow(g, X, Y - 8, 56, '255,245,210', 1 - q * 4.5);
    for (let i = 0; i < N(16); i++) {
      const an = H(f, i, 6) * TAU, v = 50 + 80 * H(f, i, 7), qq = cl(q * 1.3);
      glow(g, X + Math.cos(an) * v * eo(qq), Y + Math.sin(an) * v * eo(qq) * R.K - Math.sin(qq * Math.PI) * (40 + 60 * H(f, i, 8)), 5, '255,140,50', 1 - qq);
    }
  };
  DRAW.arrow_rain = (g, f, k, t, X, Y) => {
    const Rr = f.r * TILE, fall = 0.2, ang = Math.atan2(190, 46);
    lit(g); g.strokeStyle = `rgba(240,220,170,${0.35 * env(k, 0.1, 0.3)})`; g.lineWidth = 1.5; gEll(g, X, Y, Rr); g.stroke();
    const n = N(22);
    for (let i = 0; i < n; i++) {
      const di = H(f, i, 1) * 0.5, q = (f.t - di) / fall; if (q < 0) continue;
      const an = H(f, i, 2) * TAU, rad = Math.sqrt(H(f, i, 3)) * Rr * 0.95, gx = X + Math.cos(an) * rad, gy = Y + Math.sin(an) * rad * R.K;
      if (q < 1) {
        const x = gx - 46 * (1 - q), y = gy - 190 * (1 - q);
        g.save(); g.translate(x, y); g.rotate(ang);
        lit(g); g.strokeStyle = 'rgba(255,230,160,0.4)'; g.lineWidth = 5; g.beginPath(); g.moveTo(-40, 0); g.lineTo(-6, 0); g.stroke();
        nrm(g); g.strokeStyle = '#5a3c20'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(-19, 0); g.lineTo(5, 0); g.stroke();
        g.fillStyle = '#eef0f6'; g.strokeStyle = '#3a3a44'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(4, -4); g.lineTo(13, 0); g.lineTo(4, 4); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#f4f0e0'; g.beginPath(); g.moveTo(-19, 0); g.lineTo(-24, -4); g.lineTo(-15, 0); g.lineTo(-24, 4); g.closePath(); g.fill();
        g.restore();
      } else {
        const age = f.t - di - fall, a = 1 - cl((age - 0.3) / 0.3);
        if (a <= 0) continue;
        nrm(g); g.globalAlpha = a;
        g.strokeStyle = '#5a3c20'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx - 5, gy - 16); g.stroke();
        g.fillStyle = '#f4f0e0'; g.beginPath(); g.moveTo(gx - 5, gy - 16); g.lineTo(gx - 10, gy - 21); g.lineTo(gx - 2, gy - 19); g.closePath(); g.fill();
        g.globalAlpha = 1;
        if (age < 0.25) { lit(g); g.strokeStyle = `rgba(240,225,180,${1 - age / 0.25})`; g.lineWidth = 1.5; gEll(g, gx, gy, 3 + age * 44); g.stroke(); }
      }
    }
  };
  DRAW.ragnarok_light = (g, f, k, t, X, Y) => {
    const Rr = f.r * TILE, T = f.t, ti = SPEC.ragnarok_light.impact, a = env(k, 0.08, 0.35);
    lit(g);
    if (T < ti) {
      const q = T / ti;
      for (let j = 0; j < 2; j++) { g.strokeStyle = `rgba(255,235,150,${q})`; g.lineWidth = 2; gEll(g, X, Y - (1 - q) * (130 + j * 70), Rr * (1.4 - 0.4 * q)); g.stroke(); }
    }
    g.fillStyle = `rgba(255,240,170,${0.4 * a})`;
    for (let i = 0; i < N(12); i++) {
      const an = i / N(12) * TAU + T * 0.6, L = Rr * (0.75 + 0.25 * Math.sin(i * 3 + T * 8)), w = 0.07;
      g.beginPath(); g.moveTo(X + Math.cos(an - w) * Rr * 0.15, Y + Math.sin(an - w) * Rr * 0.15 * R.K); g.lineTo(X + Math.cos(an) * L, Y + Math.sin(an) * L * R.K); g.lineTo(X + Math.cos(an + w) * Rr * 0.15, Y + Math.sin(an + w) * Rr * 0.15 * R.K); g.fill();
    }
    g.strokeStyle = `rgba(255,230,140,${0.9 * a})`; g.lineWidth = 2.5; gEll(g, X, Y, Rr); g.stroke();
    g.strokeStyle = `rgba(255,250,220,${0.6 * a})`; g.lineWidth = 1; gEll(g, X, Y, Rr * 0.82); g.stroke();
    glow(g, X, Y, Rr * 1.1, '255,230,140', 0.5 * a, R.K);
    pillar(g, X, Y + 6, Rr * 1.2, 340, '255,225,130', 0.55 * a);
    pillar(g, X, Y + 4, Rr * 0.3, 360, '255,255,240', 0.75 * a);
    if (T >= ti) glow(g, X, Y - 24, 90, '255,245,200', 0.8 * (1 - (T - ti) / 0.3));
    for (let i = 0; i < N(14); i++) { const q = (k * 1.5 + H(f, i)) % 1; glow(g, X + (H(f, i, 2) - 0.5) * 1.6 * Rr, Y - q * 190, 5, '255,240,180', a * (1 - q)); }
  };
  DRAW.hex = (g, f, k, t, X, Y) => {
    const Rr = f.r * TILE * 1.05, a = env(k, 0.12, 0.3), rot = f.t * 0.9;
    nrm(g); g.fillStyle = `rgba(8,22,8,${0.45 * a})`; gEll(g, X, Y, Rr); g.fill();
    lit(g);
    glow(g, X, Y, Rr, '70,220,70', 0.45 * a, R.K);
    g.strokeStyle = `rgba(130,255,110,${0.9 * a})`; g.lineWidth = 2; gEll(g, X, Y, Rr); g.stroke();
    g.lineWidth = 1.2; gEll(g, X, Y, Rr * 0.78); g.stroke();
    const pts = [];
    for (let i = 0; i < 5; i++) { const an = rot + i * TAU / 5 - Math.PI / 2; pts.push([X + Math.cos(an) * Rr * 0.78, Y + Math.sin(an) * Rr * 0.78 * R.K]); }
    g.lineWidth = 1.8; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i <= 5; i++) { const pp = pts[(i * 2) % 5]; g.lineTo(pp[0], pp[1]); }
    g.stroke();
    g.lineWidth = 1.2;
    for (let i = 0; i < 8; i++) { const an = -rot * 0.6 + i * TAU / 8; rune(g, i, X + Math.cos(an) * Rr * 0.89, Y + Math.sin(an) * Rr * 0.89 * R.K, 7); }
    for (let i = 0; i < N(7); i++) {
      const q = (f.t * 0.9 + H(f, i)) % 1, x = X + (H(f, i, 2) - 0.5) * Rr * 1.4 + Math.sin(q * 6 + i) * 6, y = Y - q * 80;
      nrm(g); puff(g, x, y, 9, '15,30,15', 0.5 * a * (1 - q));
      lit(g); glow(g, x, y, 7, '120,255,110', 0.8 * a * (1 - q));
    }
    const q = cl((f.t - 0.1) / 1.1), sy = Y - 34 - q * 44, sa = a * (1 - q) * 0.95;
    if (sa > 0.02) {
      g.fillStyle = `rgba(150,255,130,${0.55 * sa})`; g.strokeStyle = `rgba(200,255,180,${sa})`; g.lineWidth = 1.2;
      g.beginPath(); g.ellipse(X, sy, 9, 8, 0, 0, TAU); g.fill(); g.stroke();
      g.fillRect(X - 5, sy + 5, 10, 6);
      nrm(g); g.fillStyle = `rgba(0,10,0,${0.85 * sa})`;
      g.beginPath(); g.ellipse(X - 3.4, sy, 2.4, 2.8, 0, 0, TAU); g.ellipse(X + 3.4, sy, 2.4, 2.8, 0, 0, TAU); g.fill();
      g.fillRect(X - 3.5, sy + 7, 1.2, 4); g.fillRect(X - 0.6, sy + 7, 1.2, 4); g.fillRect(X + 2.3, sy + 7, 1.2, 4);
    }
  };
  DRAW.rock_spikes = (g, f, k, t, X, Y) => {
    const Rr = f.r * TILE, sink = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
    lit(g); const ra = 1 - cl(k * 2.2);
    if (ra > 0) { g.strokeStyle = `rgba(255,190,90,${0.8 * ra})`; g.lineWidth = 2; gEll(g, X, Y, Rr); g.stroke(); g.lineWidth = 1.5; rune(g, 5, X, Y - 12, 18 * (0.8 + 0.4 * k)); glow(g, X, Y, Rr * 0.9, '255,170,70', 0.4 * ra, R.K); }
    const list = [];
    for (let i = 0; i < N(10); i++) { const an = H(f, i) * TAU, rad = (i === 0 ? 0 : Math.sqrt(H(f, i, 2))) * Rr * 0.85; list.push([X + Math.cos(an) * rad, Y + Math.sin(an) * rad * R.K, i]); }
    list.sort((p, q) => p[1] - q[1]);
    nrm(g);
    for (const [x, y, i] of list) {
      const q = (f.t - H(f, i, 3) * 0.12) / 0.1; if (q < 0) continue;
      const h = (i === 0 ? 50 : 26 + 22 * H(f, i, 4)) * eo3(cl(q)) * sink, w = (i === 0 ? 11 : 6 + 4 * H(f, i, 5)), lean = (H(f, i, 6) - 0.5) * 9;
      if (q < 1.8) puff(g, x, y - 3, 10 + q * 7, '150,125,95', 0.5 * (1 - q / 1.8));
      spike(g, x, y, h, w, lean, '#a48256', '#5e4428', 'rgba(255,232,190,0.7)');
    }
    g.fillStyle = `rgba(110,85,55,${1 - cl(k * 1.6)})`;
    for (let i = 0; i < N(10); i++) { const an = H(f, i, 7) * TAU, v = 20 + 40 * H(f, i, 8), q = cl(k * 1.6); g.fillRect(X + Math.cos(an) * v * q - 1.5, Y + Math.sin(an) * v * q * R.K - Math.sin(q * Math.PI) * (36 + 30 * H(f, i, 9)) - 1.5, 3, 3); }
  };

  // ===== รอบตัว =====
  DRAW.quake = (g, f, k, t, X, Y) => {
    const Rr = f.r * TILE, a = k < 0.7 ? 1 : (1 - k) / 0.3;
    const n = N(10), grow = eo3(cl(k * 3.5));
    for (let pass = 0; pass < 2; pass++) {
      if (pass) { lit(g); g.lineWidth = 1.6; } else { nrm(g); g.lineWidth = 4; g.strokeStyle = `rgba(30,18,8,${0.85 * a})`; }
      for (let i = 0; i < n; i++) {
        const an = i / n * TAU + H(f, i) * 0.5, L = Rr * (0.55 + 0.45 * H(f, i, 2)) * grow;
        if (pass) g.strokeStyle = `rgba(255,200,90,${a * (0.65 + 0.35 * Math.sin(t * 20 + i))})`;
        g.beginPath(); g.moveTo(X, Y); let aa = an;
        for (let j = 1; j <= 5; j++) { aa += (H(f, i, j + 3) - 0.5) * 0.5; const d = L * j / 5; g.lineTo(X + Math.cos(aa) * d, Y + Math.sin(aa) * d * R.K); }
        g.stroke();
      }
    }
    nrm(g);
    const q = eo3(k);
    for (let i = 0; i < N(14); i++) { const an = i / N(14) * TAU + H(f, i, 9), d = Rr * q * (0.9 + 0.2 * H(f, i, 10)); puff(g, X + Math.cos(an) * d, Y + Math.sin(an) * d * R.K - 8, 13 + 12 * k, '170,150,120', 0.5 * (1 - k)); }
    g.fillStyle = `rgba(100,76,50,${1 - k})`;
    for (let i = 0; i < N(12); i++) { const an = H(f, i, 11) * TAU, r0 = H(f, i, 12) * Rr * 0.7, q2 = cl(k * 1.6 - H(f, i, 13) * 0.3); g.fillRect(X + Math.cos(an) * (r0 + 20 * q2) - 2, Y + Math.sin(an) * (r0 + 20 * q2) * R.K - Math.sin(q2 * Math.PI) * (30 + 40 * H(f, i, 14)) - 2, 4, 4); }
    lit(g);
    g.strokeStyle = `rgba(255,220,140,${(1 - k) * 0.8})`; g.lineWidth = 4 * (1 - k) + 1; gEll(g, X, Y, Rr * q); g.stroke();
    glow(g, X, Y - 10, 80, '255,210,120', 1 - k * 4);
  };
  DRAW.frost_nova = (g, f, k, t, X, Y) => {
    const Rr = f.r * TILE, q = eo3(cl(k * 1.5)), a = k < 0.6 ? 1 : (1 - k) / 0.4;
    lit(g);
    g.fillStyle = `rgba(150,210,255,${0.16 * a})`; gEll(g, X, Y, Rr * q); g.fill();
    g.strokeStyle = `rgba(210,245,255,${0.9 * a})`; g.lineWidth = 3; gEll(g, X, Y, Rr * q); g.stroke();
    g.strokeStyle = `rgba(160,220,255,${0.5 * a})`; g.lineWidth = 1.2; gEll(g, X, Y, Rr * q * 0.8); g.stroke();
    glow(g, X, Y - 12, 70, '170,230,255', 1 - k * 3);
    if (k > 0.3) {
      const cq = eo(cl((k - 0.3) * 4)) * a;
      nrm(g);
      const n = N(12);
      for (let i = 0; i < n; i++) {
        const an = i / n * TAU + 0.26, x = X + Math.cos(an) * Rr * 0.97, y = Y + Math.sin(an) * Rr * 0.97 * R.K;
        if (Math.sin(an) < 0) spike(g, x, y, (16 + 10 * H(f, i)) * cq, 5, (H(f, i, 2) - 0.5) * 6, '#d8f4ff', '#7cc0e8', 'rgba(255,255,255,0.9)');
      }
      lit(g);
    }
    for (let i = 0; i < N(18); i++) {
      const an = i / N(18) * TAU + (H(f, i) - 0.5) * 0.2, d = Rr * q * (0.85 + 0.15 * H(f, i, 2));
      const x = X + Math.cos(an) * d, y = Y + Math.sin(an) * d * R.K - 8, sa = Math.atan2(Math.sin(an) * R.K, Math.cos(an)), L = 15 + 6 * H(f, i, 3);
      g.save(); g.translate(x, y); g.rotate(sa);
      g.fillStyle = `rgba(225,248,255,${a})`; g.beginPath(); g.moveTo(L * 0.6, 0); g.lineTo(0, -3); g.lineTo(-L * 0.4, 0); g.lineTo(0, 3); g.closePath(); g.fill();
      g.restore();
      glow(g, x, y, 9, '150,215,255', 0.5 * a);
    }
    if (k > 0.3) {
      nrm(g);
      const cq = eo(cl((k - 0.3) * 4)) * a, n = N(12);
      for (let i = 0; i < n; i++) {
        const an = i / n * TAU + 0.26, x = X + Math.cos(an) * Rr * 0.97, y = Y + Math.sin(an) * Rr * 0.97 * R.K;
        if (Math.sin(an) >= 0) spike(g, x, y, (16 + 10 * H(f, i)) * cq, 5, (H(f, i, 2) - 0.5) * 6, '#d8f4ff', '#7cc0e8', 'rgba(255,255,255,0.9)');
      }
    }
  };
  DRAW.smoke = (g, f, k, t, X, Y) => {
    const Rr = f.r * TILE, a = env(k, 0.1, 0.35);
    nrm(g);
    for (let i = 0; i < N(18); i++) {
      const an = H(f, i) * TAU + k * 6, rr = Rr * (0.2 + 0.8 * eo(k)) * (0.55 + 0.45 * H(f, i, 2));
      puff(g, X + Math.cos(an) * rr, Y + Math.sin(an) * rr * R.K - 10 - H(f, i, 3) * 18, 15 + 14 * k + 6 * H(f, i, 4), H(f, i, 5) < 0.5 ? '112,96,142' : '78,72,96', 0.6 * a);
    }
    lit(g);
    g.save(); g.translate(X, Y - 12); g.scale(1, R.K);
    for (let j = 0; j < 3; j++) { const a0 = k * 10 + j * 2.1; g.strokeStyle = `rgba(225,205,255,${a * 0.55})`; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, Rr * (0.4 + 0.22 * j) * eo(k), a0, a0 + 1.4); g.stroke(); }
    g.restore();
    g.strokeStyle = `rgba(240,240,255,${a})`; g.lineWidth = 2;
    for (let i = 0; i < N(7); i++) {
      const an = i / N(7) * TAU + k * 9, rr = Rr * eo(k) * 0.8, x = X + Math.cos(an) * rr, y = Y + Math.sin(an) * rr * R.K - 16, ta = an + Math.PI / 2;
      const fl = 0.5 + 0.5 * Math.sin(t * 30 + i);
      g.globalAlpha = fl; g.beginPath(); g.moveTo(x - Math.cos(ta) * 7, y - Math.sin(ta) * 4); g.lineTo(x + Math.cos(ta) * 7, y + Math.sin(ta) * 4); g.stroke();
    }
    g.globalAlpha = 1;
  };
  DRAW.cleave = (g, f, k, t, X, Y) => {
    const Rr = f.r * TILE * 0.95, dir = f.face > 0 ? 1 : -1, q = eo(cl(k / 0.45)), a = k < 0.45 ? 1 : 1 - (k - 0.45) / 0.55;
    const span = TAU * 0.95, a0 = dir > 0 ? Math.PI * 0.85 : Math.PI * 0.15, head = a0 + dir * q * span, tail = Math.min(q * span, 2.8);
    const P = (an, r) => [X + Math.cos(an) * r, Y - 14 + Math.sin(an) * r * R.K];
    lit(g);
    g.strokeStyle = `rgba(255,110,50,${0.35 * (1 - k)})`; g.lineWidth = 3; gEll(g, X, Y, Rr); g.stroke();
    for (const [inner, col, al, dark] of [[0.42, '130,20,10', 0.55, 1], [0.42, '255,80,40', 0.4], [0.7, '255,160,70', 0.65]]) {
      if (dark) nrm(g); else lit(g);
      g.beginPath();
      const n = 18;
      for (let i = 0; i <= n; i++) { const an = head - dir * tail * (i / n), [x, y] = P(an, Rr); g.lineTo(x, y); }
      for (let i = n; i >= 0; i--) { const u = i / n, an = head - dir * tail * u, [x, y] = P(an, Rr * (inner + (1 - inner) * u)); g.lineTo(x, y); }
      g.closePath(); g.fillStyle = `rgba(${col},${al * a})`; g.fill();
    }
    g.beginPath();
    for (let i = 0; i <= 18; i++) { const an = head - dir * tail * (i / 18), [x, y] = P(an, Rr); g.lineTo(x, y); }
    g.strokeStyle = `rgba(255,245,210,${0.95 * a})`; g.lineWidth = 2.5; g.stroke();
    const [hx, hy] = P(head, Rr * 0.92);
    glow(g, hx, hy, 26, '255,200,120', a);
    for (let i = 0; i < N(16); i++) {
      const ai = a0 + dir * H(f, i) * span, born = H(f, i) * 0.45; if (k < born) continue;
      const age = cl((k - born) / 0.4), [ex, ey] = P(ai, Rr * (1 + 0.5 * age));
      glow(g, ex, ey - age * 16, 5, '255,150,60', 1 - age);
    }
  };
  DRAW.fury = (g, f, k, t, X, Y) => {
    const Rr = f.r * TILE, n = N(10);
    lit(g);
    glow(g, X, Y - 18, 56, '255,80,50', 1 - k * 2.5);
    g.strokeStyle = `rgba(255,100,70,${(1 - k) * 0.6})`; g.lineWidth = 2; gEll(g, X, Y, Rr * eo(k)); g.stroke();
    for (let i = 0; i < n; i++) {
      const an = i / n * TAU + H(f, i) * 0.4, ti = H(f, i, 2) * 0.25, q = cl((f.t - ti) / 0.16); if (q <= 0) continue;
      const fade = 1 - cl((f.t - ti - 0.16) / 0.2); if (fade <= 0) continue;
      const r1 = Rr * eo3(q), r0 = r1 * 0.3;
      const x0 = X + Math.cos(an) * r0, y0 = Y - 16 + Math.sin(an) * r0 * R.K, x1 = X + Math.cos(an) * r1, y1 = Y - 16 + Math.sin(an) * r1 * R.K;
      g.strokeStyle = `rgba(255,60,40,${0.45 * fade})`; g.lineWidth = 8; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      g.strokeStyle = `rgba(255,225,200,${fade})`; g.lineWidth = 2; g.stroke();
      const sa = Math.atan2(y1 - y0, x1 - x0);
      g.fillStyle = `rgba(255,240,220,${fade})`; g.beginPath(); g.moveTo(x1 + Math.cos(sa) * 9, y1 + Math.sin(sa) * 9); g.lineTo(x1 + Math.cos(sa + 2.6) * 6, y1 + Math.sin(sa + 2.6) * 6); g.lineTo(x1 + Math.cos(sa - 2.6) * 6, y1 + Math.sin(sa - 2.6) * 6); g.closePath(); g.fill();
      glow(g, x1, y1, 12, '255,110,70', fade);
    }
  };
  DRAW.dark_nova = (g, f, k, t, X, Y) => {
    const Rr = f.r * TILE, T = f.t, ph = 0.22;
    if (T < ph) {
      const q = T / ph;
      lit(g); glow(g, X, Y - 22, 34 + 22 * q, '150,70,255', 0.75);
      for (let i = 0; i < N(10); i++) { const an = i / N(10) * TAU + q * 2, rr = (1 - q) * 80; glow(g, X + Math.cos(an) * rr, Y - 22 + Math.sin(an) * rr * 0.6, 6, '170,90,255', q); }
      nrm(g); g.fillStyle = 'rgba(14,4,24,0.9)'; g.beginPath(); g.arc(X, Y - 22, 6 + 14 * q, 0, TAU); g.fill();
      return;
    }
    const q = (T - ph) / (f.dur - ph), e = eo3(q), a = 1 - q;
    nrm(g);
    g.fillStyle = `rgba(20,5,35,${0.35 * a})`; gEll(g, X, Y, Rr * e); g.fill();
    g.strokeStyle = `rgba(25,5,40,${0.6 * a})`; g.lineWidth = 9 * a + 1; gEll(g, X, Y, Rr * e * 0.96); g.stroke();
    for (let i = 0; i < N(10); i++) { const an = i / N(10) * TAU + q * 1.5, rr = Rr * e * (0.5 + 0.4 * H(f, i)); puff(g, X + Math.cos(an) * rr, Y + Math.sin(an) * rr * R.K - 14, 12, '20,8,32', 0.5 * a); }
    lit(g);
    g.strokeStyle = `rgba(170,90,255,${a})`; g.lineWidth = 4 * a + 1; gEll(g, X, Y, Rr * e); g.stroke();
    g.strokeStyle = `rgba(255,200,255,${0.6 * a})`; g.lineWidth = 1.5; gEll(g, X, Y, Rr * e * 0.9); g.stroke();
    for (let i = 0; i < N(12); i++) { const an = i / N(12) * TAU - q * 1.2, rr = Rr * e * (0.6 + 0.35 * H(f, i, 2)); glow(g, X + Math.cos(an) * rr, Y + Math.sin(an) * rr * R.K - 12 - q * 16, 8, '150,70,240', a); }
    glow(g, X, Y - 22, 44, '130,50,220', 0.8 * a);
    nrm(g); g.fillStyle = `rgba(10,2,20,${0.85 * a})`; g.beginPath(); g.arc(X, Y - 22, 20 * a, 0, TAU); g.fill();
  };
  DRAW.drum = (g, f, k, t, X, Y) => {
    const Rr = f.r * TILE;
    lit(g);
    for (const b of [0, 0.28, 0.56]) {
      const q = (f.t - b) / 0.45; if (q < 0 || q > 1) continue;
      const e = eo(q), a = 1 - q;
      g.fillStyle = `rgba(255,170,80,${0.09 * a})`; gEll(g, X, Y, Rr * e); g.fill();
      g.strokeStyle = `rgba(255,200,110,${0.9 * a})`; g.lineWidth = 6 * a + 1; gEll(g, X, Y, Rr * e); g.stroke();
      g.strokeStyle = `rgba(255,245,210,${0.6 * a})`; g.lineWidth = 1.5; gEll(g, X, Y, Rr * e * 0.88); g.stroke();
      glow(g, X, Y - 2, 40, '255,190,100', 0.8 * a, R.K);
      g.strokeStyle = `rgba(255,220,150,${a})`; g.lineWidth = 2.5;
      for (const s of [-1, 1]) { g.beginPath(); g.arc(X, Y - 36, 14 + q * 30, (s > 0 ? 0 : Math.PI) - 0.55, (s > 0 ? 0 : Math.PI) + 0.55); g.stroke(); }
    }
    g.fillStyle = `rgba(255,220,140,${1 - k})`; g.strokeStyle = g.fillStyle;
    for (let i = 0; i < N(5); i++) { const q = cl(k * 1.3 - i * 0.08), an = i / 5 * TAU + 0.5; note(g, X + Math.cos(an) * (20 + 50 * q), Y - 40 - q * 40 + Math.sin(an) * 10, 0.9, i % 2); }
  };

  // ===== เส้นตรง =====
  function lineGeom(f, ground) {
    const h = ground ? 0 : 24;
    const sx = f.x * TILE + f.ux * 10, sy = f.y * TILE * R.K - h;
    const ex = (f.x + f.ux * f.len) * TILE, ey = (f.y + f.uy * f.len) * TILE * R.K - h;
    const dx = ex - sx, dy = ey - sy, L = Math.hypot(dx, dy) || 1;
    return { sx, sy, ex, ey, dx, dy, L, ux: dx / L, uy: dy / L, nx: -dy / L, ny: dx / L, a: Math.atan2(dy, dx) };
  }
  DRAW.valhalla_spear = (g, f, k) => {
    const G2 = lineGeom(f), tr = SPEC.valhalla_spear.travel, q = eo(cl(f.t / tr)), af = f.t < tr ? 1 : 1 - (f.t - tr) / (f.dur - tr);
    const hx = G2.sx + G2.dx * q, hy = G2.sy + G2.dy * q;
    const tail=Math.min(110,G2.L*q),sx=hx-G2.ux*tail,sy=hy-G2.uy*tail;
    lit(g);
    g.strokeStyle = `rgba(255,215,110,${0.22 * af})`; g.lineWidth = 10; g.beginPath(); g.moveTo(sx,sy); g.lineTo(hx, hy); g.stroke();
    g.strokeStyle = `rgba(255,240,180,${0.6 * af})`; g.lineWidth = 5; g.stroke();
    g.strokeStyle = `rgba(255,255,255,${af})`; g.lineWidth = 1.5; g.stroke();
    if (f.t < 0.3) glow(g, G2.sx, G2.sy, 30, '255,225,140', 1 - f.t / 0.3);
    nrm(g);
    for (let i = 0; i < N(6); i++) { const s = H(f, i) * q, dr = f.t * 18 * (0.6 + H(f, i, 2)); feather(g, G2.sx + G2.dx * s + Math.sin(f.t * 6 + i) * 5, G2.sy + G2.dy * s + dr, 0.8, Math.sin(f.t * 5 + i * 2) * 0.8); }
    if (f.t < tr + 0.15) {
      const la = f.t < tr ? 1 : 1 - (f.t - tr) / 0.15;
      lit(g); glow(g, hx, hy, 20, '255,220,120', la*.35);
      if(typeof ProjectileArt!=='undefined'&&ProjectileArt.head(g,hx,hy,G2.a,124,f.t,G2.L*q,'odin_spear'))return;
      g.save(); g.translate(hx, hy); g.rotate(G2.a); g.globalAlpha = la;
      nrm(g);
      g.fillStyle = '#f6e7b0'; g.fillRect(-38, -1.6, 34, 3.2);
      g.fillStyle = '#ffd56a'; g.beginPath(); g.moveTo(-8, -1.5); g.lineTo(-14, -7); g.lineTo(-4, -2); g.moveTo(-8, 1.5); g.lineTo(-14, 7); g.lineTo(-4, 2); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(-4, -5); g.lineTo(16, 0); g.lineTo(-4, 5); g.closePath(); g.fill();
      g.restore();
    }
  };
  DRAW.spiral = (g, f, k) => {
    const G2 = lineGeom(f), tr = SPEC.spiral.travel, q = eo(cl(f.t / tr)), af = f.t < tr ? 1 : 1 - (f.t - tr) / (f.dur - tr), L = G2.L * q;
    lit(g);
    g.strokeStyle = `rgba(255,255,255,${0.6 * af})`; g.lineWidth = 2; g.beginPath(); g.moveTo(G2.sx, G2.sy); g.lineTo(G2.sx + G2.ux * L, G2.sy + G2.uy * L); g.stroke();
    for (let j = 0; j < 2; j++) {
      g.strokeStyle = `rgba(${j ? '190,205,255' : '235,240,255'},${af * (j ? 0.55 : 0.9)})`; g.lineWidth = j ? 1.6 : 2.4;
      g.beginPath();
      for (let s = 0; s <= L; s += 5) { const A = 9 * (0.5 + 0.5 * s / (G2.L || 1)), o = A * Math.sin(s * 0.17 - f.t * 40 + j * Math.PI); g.lineTo(G2.sx + G2.ux * s + G2.nx * o, G2.sy + G2.uy * s + G2.ny * o); }
      g.stroke();
    }
    for (let s = 24; s < L; s += 28) {
      g.save(); g.translate(G2.sx + G2.ux * s, G2.sy + G2.uy * s); g.rotate(G2.a);
      g.strokeStyle = `rgba(200,215,255,${0.5 * af})`; g.lineWidth = 1.2; g.beginPath(); g.ellipse(0, 0, 3, 11, 0, 0, TAU); g.stroke(); g.restore();
    }
    const hx = G2.sx + G2.ux * L, hy = G2.sy + G2.uy * L;
    glow(g, hx, hy, 24, '220,230,255', af);
    g.save(); g.translate(hx, hy); g.rotate(G2.a); g.fillStyle = `rgba(255,255,255,${af})`;
    g.beginPath(); g.moveTo(14, 0); g.lineTo(-6, -6); g.lineTo(-6, 6); g.closePath(); g.fill(); g.restore();
  };
  DRAW.sharp_shot = (g, f, k) => {
    const G2 = lineGeom(f), tr = SPEC.sharp_shot.travel, q = cl(f.t / tr), af = f.t < tr ? 1 : 1 - (f.t - tr) / (f.dur - tr);
    const hx = G2.sx + G2.dx * q, hy = G2.sy + G2.dy * q;
    lit(g);
    g.strokeStyle = `rgba(200,255,120,${0.22 * af})`; g.lineWidth = 11; g.beginPath(); g.moveTo(G2.sx, G2.sy); g.lineTo(hx, hy); g.stroke();
    g.strokeStyle = `rgba(230,255,170,${0.85 * af})`; g.lineWidth = 3; g.stroke();
    g.strokeStyle = `rgba(255,255,255,${af})`; g.lineWidth = 1; g.stroke();
    for (let j = 1; j <= 4; j++) {
      const s = j / 5; if (q < s) continue;
      const age = (f.t - s * tr) * 3; if (age > 1) continue;
      g.save(); g.translate(G2.sx + G2.dx * s, G2.sy + G2.dy * s); g.rotate(G2.a);
      g.strokeStyle = `rgba(210,255,160,${1 - age})`; g.lineWidth = 1.8; g.beginPath(); g.ellipse(0, 0, 3 + age * 8, 8 + age * 22, 0, 0, TAU); g.stroke(); g.restore();
    }
    if (q < 1) { glow(g, hx, hy, 18, '220,255,150', .6);if(typeof ProjectileArt==='undefined'||!ProjectileArt.head(g,hx,hy,G2.a,110,f.t,Math.hypot(G2.dx,G2.dy)*q)){g.save(); g.translate(hx, hy); g.rotate(G2.a); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(10, 0); g.lineTo(0, -4); g.lineTo(0, 4); g.closePath(); g.fill(); g.restore();} }
  };
  DRAW.fissure = (g, f, k) => {
    const G2 = lineGeom(f, true), tr = SPEC.fissure.travel, q = cl(f.t / tr), a = k < 0.72 ? 1 : (1 - k) / 0.28, n = 14;
    const pts = [];
    for (let i = 0; i <= n; i++) { const s = i / n, o = i === 0 ? 0 : (H(f, i) - 0.5) * 12; pts.push([G2.sx + G2.dx * s + G2.nx * o, G2.sy + G2.dy * s + G2.ny * o]); }
    const m = q * n;
    const path = () => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i <= n && i - 1 < m; i++) { const u = Math.min(1, m - (i - 1)); g.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u); } };
    nrm(g); path(); g.strokeStyle = `rgba(35,20,10,${0.9 * a})`; g.lineWidth = 6; g.stroke();
    lit(g); path(); g.strokeStyle = `rgba(255,170,70,${a * (0.65 + 0.3 * Math.sin(f.t * 25))})`; g.lineWidth = 2; g.stroke();
    nrm(g);
    const nj = Math.max(3, Math.round(f.len / 0.55));
    for (let j = 0; j < nj; j++) {
      const s = (j + 0.6) / nj, age = f.t - s * tr; if (age < 0) continue;
      const h = (30 + 18 * H(f, j, 3)) * eo3(cl(age / 0.08)) * (1 - cl((age - 0.35) / 0.25)), side = (H(f, j, 4) - 0.5) * 18;
      const x = G2.sx + G2.dx * s + G2.nx * side, y = G2.sy + G2.dy * s + G2.ny * side;
      if (age < 0.4) puff(g, x, y - 3, 10 + age * 30, '150,125,95', 0.5 * (1 - age / 0.4));
      if(typeof EarthVFX==='undefined'||!EarthVFX.cluster(g,x,y,65+10*H(f,j,5),age,.65))
        spike(g, x, y, h, 7 + 4 * H(f, j, 5), (H(f, j, 6) - 0.5) * 8, '#a48256', '#5e4428', 'rgba(255,232,190,0.7)');
    }
  };

  // ===== บัฟ / ฮีล (ตอนร่าย) =====
  DRAW.guard = (g, f, k, t, X, Y) => {
    const a = env(k, 0.1, 0.35), pop = 1 + 0.6 * (1 - eo3(cl(k * 3))), sy = Y - 130;
    lit(g);
    for (let j = 0; j < 2; j++) { const q = cl(k * 1.3 - j * 0.25); if (q > 0 && q < 1) { g.strokeStyle = `rgba(255,215,110,${1 - q})`; g.lineWidth = 3; gEll(g, X, Y, 20 + 100 * eo(q)); g.stroke(); } }
    g.fillStyle = `rgba(255,230,150,${0.35 * a})`;
    for (let i = 0; i < 10; i++) { const an = i / 10 * TAU + k * 1.5, L = 46 * pop; g.beginPath(); g.moveTo(X, sy); g.lineTo(X + Math.cos(an - 0.08) * L, sy + Math.sin(an - 0.08) * L); g.lineTo(X + Math.cos(an + 0.08) * L, sy + Math.sin(an + 0.08) * L); g.fill(); }
    glow(g, X, sy, 56, '255,220,120', 0.7 * a);
    nrm(g); g.globalAlpha = a;
    kite(g, X, sy, pop); g.fillStyle = '#d8b450'; g.fill(); g.strokeStyle = '#fff3c0'; g.lineWidth = 2; g.stroke();
    kite(g, X, sy, pop * 0.72); g.fillStyle = '#f6e3a0'; g.fill();
    g.fillStyle = '#c08a30'; g.fillRect(X - 2 * pop, sy - 11 * pop, 4 * pop, 24 * pop); g.fillRect(X - 9 * pop, sy - 4 * pop, 18 * pop, 4 * pop);
    g.globalAlpha = 1;
  };
  function flames(g, X, Y, r, n, h, a, t, seed) {
    for (let i = 0; i < n; i++) {
      const an = i / n * TAU, x = X + Math.cos(an) * r, y = Y + Math.sin(an) * r * R.K;
      const hh = h * (0.7 + 0.3 * Math.sin(t * 14 + i * 1.7 + seed));
      g.fillStyle = `rgba(255,${110 + (i % 3) * 45},40,${a})`;
      g.beginPath(); g.moveTo(x, y - hh); g.quadraticCurveTo(x + 5, y - hh * 0.4, x, y); g.quadraticCurveTo(x - 5, y - hh * 0.4, x, y - hh); g.fill();
    }
  }
  DRAW.battle_aura = (g, f, k, t, X, Y) => {
    const a = env(k, 0.1, 0.4);
    lit(g);
    glow(g, X, Y - 30, 60, '255,130,60', 0.6 * a);
    flames(g, X, Y, 24 + 10 * k, N(16), 26 * Math.sin(Math.min(1, k * 1.4) * Math.PI) + 4, a, t, 0);
    const q = cl(k * 1.3); g.strokeStyle = `rgba(255,150,70,${1 - q})`; g.lineWidth = 3; gEll(g, X, Y, 20 + 90 * eo(q)); g.stroke();
    for (let i = 0; i < N(10); i++) { const qq = (k * 1.6 + H(f, i)) % 1; glow(g, X + (H(f, i, 2) - 0.5) * 50, Y - 10 - qq * 80, 4, '255,150,60', a * (1 - qq)); }
  };
  DRAW.war_howl = (g, f, k, t, X, Y) => {
    const a = env(k, 0.05, 0.4);
    lit(g);
    glow(g, X, Y - 40, 50, '255,70,40', 0.5 * a);
    for (let j = 0; j < 3; j++) {
      const q = cl(k * 1.4 - j * 0.2); if (q <= 0 || q >= 1) continue;
      const r = 18 + 100 * eo(q);
      // Layered pressure waves soften at their outside edge, rather than a
      // toothed polygon that reads like a spell symbol instead of a howl.
      g.strokeStyle = `rgba(255,${80 + j * 30},50,${(1-q)*.13})`; g.lineWidth = 10*(1-q)+2;
      gEll(g,X,Y,r);g.stroke();
      g.strokeStyle = `rgba(255,${125 + j * 25},90,${(1-q)*.8})`;g.lineWidth=1.5;
      gEll(g,X,Y,r);g.stroke();
      g.lineWidth = 2.5;
      for (const s of [-1, 1]) { g.beginPath(); g.arc(X, Y - 52, 10 + q * 34, (s > 0 ? 0 : Math.PI) - 0.6, (s > 0 ? 0 : Math.PI) + 0.6); g.stroke(); }
    }
  };
  DRAW.undying = (g, f, k, t, X, Y) => {
    const a = env(k, 0.05, 0.4);
    lit(g);
    for (const b of [0, 0.25]) { const q = cl((f.t - b) / 0.4); if (q > 0 && q < 1) glow(g, X, Y - 30, 40 + 40 * q, '255,40,40', (1 - q) * 0.85); }
    g.strokeStyle = `rgba(255,60,60,${0.6 * (1 - k)})`; g.lineWidth = 3; gEll(g, X, Y, 18 + 30 * eo(k)); g.stroke();
    g.lineWidth = 2;
    for (let i = 0; i < N(12); i++) {
      const q = cl(k * 1.5 - H(f, i) * 0.5); if (q <= 0 || q >= 1) continue;
      const x = X + (H(f, i, 2) - 0.5) * 34, y = Y - 6 - q * 80;
      g.strokeStyle = `rgba(255,${50 + (i % 3) * 30},50,${(1 - q) * a})`;
      g.beginPath(); g.moveTo(x + Math.sin(q * 8 + i) * 5, y); g.quadraticCurveTo(x + Math.sin(q * 8 + i + 1) * 8, y + 9, x + Math.sin(q * 8 + i + 2) * 5, y + 18); g.stroke();
    }
  };
  DRAW.rune_barrier = (g, f, k, t, X, Y) => {
    const a = env(k, 0.1, 0.35), rise = eo3(cl(k * 1.6));
    lit(g);
    g.strokeStyle = `rgba(140,190,255,${0.7 * a})`; g.lineWidth = 2; gEll(g, X, Y, 36); g.stroke();
    for (let i = 0; i < 8; i++) {
      const an = i / 8 * TAU + k * 2.5, x = X + Math.cos(an) * 36, y = Y + Math.sin(an) * 36 * R.K - 6 - rise * 40 * (0.6 + 0.4 * ((i % 2) ? 1 : 0.6));
      const front = Math.sin(an) > 0 ? 1 : 0.55;
      glow(g, x, y, 14, '110,160,255', 0.6 * a * front);
      g.strokeStyle = `rgba(200,225,255,${a * front})`; g.lineWidth = 2; rune(g, i, x, y, 12);
    }
    if (k > 0.45) {
      const q = (k - 0.45) / 0.55;
      for (let j = 0; j < 3; j++) { g.strokeStyle = `rgba(150,195,255,${(1 - q) * 0.6})`; g.lineWidth = 1.5; g.beginPath(); g.ellipse(X, Y - 10 - j * 24, 30 - j * 4, (30 - j * 4) * 0.35, 0, 0, TAU); g.stroke(); }
      glow(g, X, Y - 34, 60, '120,170,255', (1 - q) * 0.5);
    }
  };
  DRAW.winter = (g, f, k, t, X, Y) => {
    const a = env(k, 0.1, 0.35);
    lit(g);
    glow(g, X, Y - 30, 50, '170,230,255', 0.5 * a);
    g.strokeStyle = `rgba(200,240,255,${1 - k})`; g.lineWidth = 2.5; gEll(g, X, Y, 16 + 70 * eo(k)); g.stroke();
    g.strokeStyle = `rgba(235,250,255,${a})`; g.lineWidth = 1.3;
    for (let i = 0; i < N(22); i++) {
      const an = H(f, i) * TAU + k * 7, rad = 14 + 26 * k + H(f, i, 2) * 12, y = Y - 4 - k * 80 * H(f, i, 3) - 10 * H(f, i, 4);
      flake(g, X + Math.cos(an) * rad, y + Math.sin(an) * rad * 0.35, 2.5 + 1.5 * H(f, i, 5));
    }
  };
  DRAW.fate = (g, f, k, t, X, Y) => {
    const a = env(k, 0.12, 0.35), h = 90 * eo(cl(k * 1.4));
    lit(g);
    for (let j = 0; j < 5; j++) {
      g.strokeStyle = `rgba(255,${210 + j * 8},130,${0.75 * a})`; g.lineWidth = 1.4;
      g.beginPath();
      for (let i = 0; i <= 20; i++) { const s = i / 20, an = j * TAU / 5 + s * 3.2 + k * 4, rad = 24 * (1 - s * 0.45); g.lineTo(X + Math.cos(an) * rad, Y - s * h + Math.sin(an) * rad * 0.35); }
      g.stroke();
    }
    const wy = Y - 100, wr = 12 * eo(cl(k * 2));
    glow(g, X, wy, 30, '255,220,130', 0.6 * a);
    g.strokeStyle = `rgba(255,235,170,${a})`; g.lineWidth = 1.6; g.beginPath(); g.arc(X, wy, wr, 0, TAU); g.stroke();
    g.beginPath(); for (let i = 0; i < 8; i++) { const an = i / 8 * TAU + k * 3; g.moveTo(X, wy); g.lineTo(X + Math.cos(an) * wr, wy + Math.sin(an) * wr); } g.stroke();
  };
  DRAW.haste = (g, f, k, t, X, Y) => {
    const a = env(k, 0.05, 0.4), d = f.face > 0 ? 1 : -1;
    lit(g);
    for (let j = 1; j <= 3; j++) glow(g, X - d * j * 14 * eo(k), Y - 30, 22, '170,255,120', (1 - k) * 0.45 / j, 1.4);
    g.lineWidth = 2;
    for (let i = 0; i < N(12); i++) {
      const y = Y - 8 - H(f, i) * 60, s = (i % 2 ? 1 : -1), q = cl(k * 1.5 - H(f, i, 2) * 0.4), x0 = X + s * (70 - 50 * eo(q)), L = 20 * (1 - q) + 6;
      g.strokeStyle = `rgba(190,255,140,${a * (1 - q)})`; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + s * L, y); g.stroke();
    }
    g.strokeStyle = `rgba(200,255,150,${1 - k})`; g.lineWidth = 2; gEll(g, X, Y, 14 + 40 * eo(k)); g.stroke();
  };
  DRAW.wind_walk = (g, f, k, t, X, Y) => {
    const a = env(k, 0.1, 0.35);
    lit(g);
    for (let j = 0; j < 3; j++) {
      g.strokeStyle = `rgba(190,255,215,${0.75 * a})`; g.lineWidth = 2.2 - j * 0.4;
      g.beginPath();
      for (let i = 0; i <= 18; i++) { const s = i / 18; if (s > eo(cl(k * 1.6)) + 0.05) break; const an = j * TAU / 3 + s * 5 + k * 6, rad = 26 - s * 8; g.lineTo(X + Math.cos(an) * rad, Y - 4 - s * 80 + Math.sin(an) * rad * 0.35); }
      g.stroke();
    }
    g.fillStyle = `rgba(170,240,150,${a})`;
    for (let i = 0; i < N(6); i++) { const an = H(f, i) * TAU + k * 8, y = Y - 10 - k * 70 * H(f, i, 2); g.save(); g.translate(X + Math.cos(an) * 28, y); g.rotate(an); g.beginPath(); g.ellipse(0, 0, 4, 1.8, 0, 0, TAU); g.fill(); g.restore(); }
  };
  DRAW.venom = (g, f, k) => {
    const [x,y]=hand(f.ref),a=env(k,.08,.3),d=f.ref.facing||1;
    // The weapon itself is coated in Paperdoll's actual pose. Only liquid motes
    // belong in this world-space cast effect; a guessed blade angle floats off it.
    lit(g);
    for(let i=0;i<N(10);i++){
      const q=cl(k*1.6-H(f,i)*.45),u=H(f,i,2),xx=x+d*(u*24-4)+Math.sin(q*7+i)*3,yy=y+4-u*26+q*q*25;
      if(q<=0||q>=1)continue;
      glow(g,xx,yy,4,'110,245,60',a*(1-q)*.6);
      g.fillStyle=`rgba(160,255,100,${a*(1-q)})`;g.beginPath();g.ellipse(xx,yy,1.5,2.5,0,0,TAU);g.fill();
    }
  };
  DRAW.zen = (g, f, k, t, X, Y) => {
    const a = env(k, 0.12, 0.35), open = eo3(cl(k * 1.8));
    lit(g);
    g.save(); g.translate(X, Y); g.scale(1, R.K); g.rotate(k * 0.8);
    for (let i = 0; i < 8; i++) {
      g.save(); g.rotate(i * TAU / 8);
      g.fillStyle = `rgba(120,240,200,${0.3 * a})`; g.strokeStyle = `rgba(170,255,225,${0.85 * a})`; g.lineWidth = 1.4;
      g.beginPath(); g.ellipse(22 * open, 0, 18 * open + 1, 7 * open + 1, 0, 0, TAU); g.fill(); g.stroke();
      g.restore();
    }
    g.strokeStyle = `rgba(170,255,225,${0.8 * a})`; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, 44 * open, 0, TAU); g.stroke();
    g.restore();
    pillar(g, X, Y, 46, 110, '120,240,200', 0.5 * a);
    for (let i = 0; i < N(10); i++) { const q = (k * 1.4 + H(f, i)) % 1; glow(g, X + (H(f, i, 2) - 0.5) * 50, Y - q * 90, 4, '150,255,215', a * (1 - q)); }
  };
  function notesFx(g, f, k, X, Y, col, glowCol) {
    const a = env(k, 0.08, 0.35);
    lit(g);
    glow(g, X, Y - 30, 46, glowCol, 0.45 * a);
    for (let j = 0; j < 2; j++) { const q = cl(k * 1.3 - j * 0.25); if (q > 0 && q < 1) { g.strokeStyle = `rgba(${col},${1 - q})`; g.lineWidth = 2; gEll(g, X, Y, 16 + 70 * eo(q)); g.stroke(); } }
    const dk = col.split(',').map(c => Math.round(c * 0.4)).join(',');
    for (let pass = 0; pass < 2; pass++) {
      if (pass) lit(g); else nrm(g);
      g.fillStyle = g.strokeStyle = pass ? `rgba(${col},${0.8 * a})` : `rgba(${dk},${0.85 * a})`;
      for (let i = 0; i < N(9); i++) {
        const an = i / 9 * TAU + k * 3, q = cl(k * 1.2 - H(f, i) * 0.2), rad = 20 + 20 * q;
        note(g, X + Math.cos(an) * rad + (pass ? 0 : 1), Y - 20 - q * 70 + Math.sin(an) * rad * 0.35 + (pass ? 0 : 1), 1.15 + 0.2 * H(f, i, 2), i % 3 === 0);
      }
    }
  }
  DRAW.song = (g, f, k, t, X, Y) => notesFx(g, f, k, X, Y, '255,215,110', '255,190,80');
  DRAW.hymn = (g, f, k, t, X, Y) => notesFx(g, f, k, X, Y, '210,150,255', '160,90,230');
  DRAW.giant = (g, f, k, t, X, Y) => {
    const a = env(k, 0.05, 0.4);
    nrm(g);
    for (let i = 0; i < N(12); i++) { const an = i / N(12) * TAU, d = 20 + 50 * eo3(k); puff(g, X + Math.cos(an) * d, Y + Math.sin(an) * d * R.K - 6, 10 + 10 * k, '160,135,105', 0.5 * (1 - k)); }
    lit(g);
    glow(g, X, Y - 34, 64, '255,120,50', 0.7 * a, 1.3);
    g.strokeStyle = `rgba(255,170,90,${1 - k})`; g.lineWidth = 4 * (1 - k) + 1; gEll(g, X, Y, 16 + 60 * eo3(k)); g.stroke();
    for (let i = 0; i < N(14); i++) { const q = cl(k * 1.4 - H(f, i) * 0.4); if (q > 0 && q < 1) glow(g, X + (H(f, i, 2) - 0.5) * 44 + Math.sin(q * 6 + i) * 4, Y - 10 - q * 90, 4.5, '255,140,60', 1 - q); }
  };
  // หกเหลี่ยมบนโดม (แคชตำแหน่ง)
  let HEXES = null;
  function hexCells() {
    if (HEXES) return HEXES;
    HEXES = [];
    const s = 7.2, w = s * Math.sqrt(3);
    for (let r = -7; r <= 7; r++) for (let c = -5; c <= 5; c++) {
      const x = c * w + (r & 1 ? w / 2 : 0), y = r * s * 1.5;
      const nx = x / 30, ny = y / 42; if (nx * nx + ny * ny > 0.92) continue;
      HEXES.push([x, y, Math.sqrt(nx * nx + ny * ny)]);
    }
    return HEXES;
  }
  DRAW.hex_shield = (g, f, k, t, X, Y) => {
    const a = env(k, 0.05, 0.4), cx = X, cy = Y - 32;
    lit(g);
    glow(g, cx, cy, 52, '150,200,255', 0.45 * a, 1.25);
    g.strokeStyle = `rgba(200,230,255,${0.9 * a})`; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy, 31, 43, 0, 0, TAU); g.stroke();
    const front = k * 1.6;
    g.lineWidth = 1.1;
    for (const [x, y, d] of hexCells()) {
      const appear = (y + 42) / 84; // ล่าง → บน
      const v = cl((front - (1 - appear)) * 4); if (v <= 0) continue;
      const fl = v < 1 ? 1 : 0.5 + 0.5 * Math.sin(t * 6 + x * 0.3 + y * 0.2);
      g.strokeStyle = `rgba(${170 + 60 * (1 - d) | 0},220,255,${a * v * (0.35 + 0.45 * fl) * (0.6 + 0.4 * d)})`;
      g.beginPath(); hexPath(g, cx + x, cy + y, 3.9); g.stroke();
    }
    if (k > 0.4 && k < 0.7) glow(g, cx, cy, 46, '230,245,255', 0.55 * (1 - Math.abs(k - 0.55) / 0.15));
  };
  DRAW.valhalla_heal = (g, f, k, t, X, Y) => {
    const a = env(k, 0.1, 0.35);
    lit(g);
    pillar(g, X, Y + 4, 64, 280, '255,225,140', 0.8 * a);
    pillar(g, X, Y + 2, 20, 300, '255,255,235', a);
    g.strokeStyle = `rgba(255,225,140,${0.8 * a})`; g.lineWidth = 2; gEll(g, X, Y, 32); g.stroke();
    g.fillStyle = `rgba(190,255,170,${a})`;
    for (let i = 0; i < N(8); i++) { const q = (k * 1.3 + H(f, i)) % 1; cross(g, X + Math.cos(i * 2.4) * 22, Y - 10 - q * 70, 3.2 * (1 - q * 0.5)); }
    nrm(g);
    for (let i = 0; i < N(6); i++) { const q = cl(k * 1.2 - H(f, i) * 0.3), y = Y - 160 + q * 150; if (q > 0 && q < 1) { g.globalAlpha = a * (1 - q * 0.6); feather(g, X + (H(f, i, 2) - 0.5) * 70 + Math.sin(q * 9 + i) * 10, y, 1, Math.sin(q * 7 + i) * 0.9); g.globalAlpha = 1; } }
  };
  DRAW.restoration = (g, f, k, t, X, Y) => {
    const a = env(k, 0.1, 0.35), rot = k * 1.6, Rr = 46;
    lit(g);
    glow(g, X, Y, Rr * 1.2, '110,255,150', 0.5 * a, R.K);
    g.strokeStyle = `rgba(150,255,180,${0.9 * a})`; g.lineWidth = 2; gEll(g, X, Y, Rr); g.stroke();
    g.lineWidth = 1.2; gEll(g, X, Y, Rr * 0.75); g.stroke();
    for (let i = 0; i < 8; i++) { const an = rot + i * TAU / 8; rune(g, i + 2, X + Math.cos(an) * Rr * 0.88, Y + Math.sin(an) * Rr * 0.88 * R.K, 7); }
    pillar(g, X, Y + 4, 50, 200, '140,255,170', 0.6 * a);
    for (let i = 0; i < N(14); i++) { const q = (k * 1.5 + H(f, i)) % 1; glow(g, X + (H(f, i, 2) - 0.5) * 70, Y - q * 110, 5, '170,255,190', a * (1 - q)); }
    g.fillStyle = `rgba(210,255,200,${a})`;
    for (let i = 0; i < N(6); i++) { const q = cl(k * 1.3 - H(f, i, 3) * 0.3); if (q > 0 && q < 1) cross(g, X + Math.cos(i * 2.1) * 26, Y - 10 - q * 70, 3.4); }
    nrm(g);
    for (let i = 0; i < N(6); i++) { const q = (k * 1.2 + H(f, i, 4)) % 1, an = H(f, i, 5) * TAU + k * 5; g.fillStyle = `rgba(90,200,90,${a * (1 - q)})`; g.save(); g.translate(X + Math.cos(an) * 30, Y - 10 - q * 80); g.rotate(an * 2); g.beginPath(); g.ellipse(0, 0, 4.5, 2, 0, 0, TAU); g.fill(); g.restore(); }
  };
  DRAW.mountain_heal = (g, f, k, t, X, Y) => {
    const a = env(k, 0.1, 0.35);
    lit(g);
    glow(g, X, Y, 50, '140,230,110', 0.5 * a, R.K);
    g.strokeStyle = `rgba(170,240,140,${0.8 * a})`; g.lineWidth = 2; gEll(g, X, Y, 30 + 10 * k); g.stroke();
    g.fillStyle = `rgba(190,255,170,${a})`;
    for (let i = 0; i < N(6); i++) { const q = (k * 1.2 + H(f, i)) % 1; cross(g, X + Math.cos(i * 2.4) * 18, Y - 14 - q * 60, 3.2); }
    const list = [];
    pillar(g, X, Y + 4, 54, 150, '150,230,110', 0.5 * a);
    for (let i = 0; i < 8; i++) { const an = i / 8 * TAU + k * 4, h = 6 + eo(cl(k * 1.5)) * (20 + 34 * H(f, i)); list.push([X + Math.cos(an) * 34, Y - h + Math.sin(an) * 12, Math.sin(an), i]); }
    list.sort((p, q) => p[2] - q[2]);
    nrm(g);
    for (const [x, y, d, i] of list) {
      const s = 6.5 + 3.5 * H(f, i, 2);
      if(typeof RelicVFX!=='undefined'&&RelicVFX.stone(g,x,y,s*4,k>.78?3:i%3,a))continue;
      g.globalAlpha = a; g.strokeStyle = 'rgba(40,28,16,0.8)'; g.lineWidth = 1; g.fillStyle = d > 0 ? '#8a6c48' : '#6a5236';
      g.beginPath(); g.moveTo(x - s, y + s * 0.4); g.lineTo(x - s * 0.5, y - s * 0.8); g.lineTo(x + s * 0.6, y - s * 0.7); g.lineTo(x + s, y + s * 0.3); g.lineTo(x + s * 0.2, y + s * 0.9); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = 'rgba(190,255,150,0.6)'; g.fillRect(x - s * 0.4, y - s * 0.6, s * 0.7, 1.4);
    }
    g.globalAlpha = 1;
  };

  // ---------- ออร่าบัฟที่ยังทำงาน (จาง ๆ) ----------
  // AURA[vfx](g, x, y, t, front, a, p)  x,y = เท้า (พิกัดในเฟรมตัวละครที่ยืนตรง)
  const AURA = {
    guard(g, x, y, t, front, a) {
      for (let i = 0; i < 2; i++) {
        const an = t * 1.4 + i * Math.PI, dz = Math.sin(an); if ((dz > 0) !== front) continue;
        const sx = x + Math.cos(an) * 22, sy = y - 34 + dz * 6;
        nrm(g); g.globalAlpha = 0.5 * a * (0.6 + 0.4 * (dz + 1) / 2);
        kite(g, sx, sy, 0.38); g.fillStyle = '#e8c860'; g.fill(); g.strokeStyle = '#fff3c0'; g.lineWidth = 1; g.stroke(); g.globalAlpha = 1;
      }
    },
    battle_aura(g, x, y, t, front, a) { if (front) return; lit(g); flames(g, x, y, 17, N(8), 9, 0.32 * a, t, 1); },
    war_howl(g, x, y, t, front, a) {
      if (front) return;
      lit(g); const q = (t * 0.8) % 1;
      g.strokeStyle = `rgba(255,80,50,${0.4 * a * (1 - q)})`; g.lineWidth = 2; gEll(g, x, y, 12 + 16 * q); g.stroke();
      glow(g, x, y, 22, '255,70,40', 0.18 * a, R.K);
    },
    undying(g, x, y, t, front, a) {
      if (!front) return;
      lit(g); glow(g, x, y - 30, 20 + 4 * Math.sin(t * 7), '255,40,40', 0.25 * a, 1.5);
      g.lineWidth = 1.6;
      for (let i = 0; i < N(4); i++) { const q = (t * 0.7 + i / 4) % 1, xx = x + Math.sin(i * 2.3) * 12 + Math.sin(q * 7 + i) * 3, yy = y - 12 - q * 50; g.strokeStyle = `rgba(255,60,60,${0.4 * a * Math.sin(q * Math.PI)})`; g.beginPath(); g.moveTo(xx, yy); g.quadraticCurveTo(xx + 4, yy + 6, xx, yy + 12); g.stroke(); }
    },
    rune_barrier(g, x, y, t, front, a) {
      lit(g);
      for (let i = 0; i < 3; i++) {
        const an = t * 0.9 + i * TAU / 3, dz = Math.sin(an); if ((dz > 0) !== front) continue;
        const rx = x + Math.cos(an) * 22, ry = y - 36 + dz * 6, al = a * (0.3 + 0.25 * (dz + 1) / 2);
        glow(g, rx, ry, 9, '110,160,255', al);
        g.strokeStyle = `rgba(200,225,255,${al * 1.4})`; g.lineWidth = 1.4; rune(g, i * 3, rx, ry, 8);
      }
    },
    winter(g, x, y, t, front, a) {
      if (!front) return;
      lit(g); g.strokeStyle = `rgba(230,248,255,${0.6 * a})`; g.lineWidth = 1;
      for (let i = 0; i < N(5); i++) { const q = (t * 0.35 + i / 5) % 1; flake(g, x + Math.sin(i * 3.7 + q * 3) * 18, y - 70 + q * 68, 2); }
    },
    fate(g, x, y, t, front, a) {
      lit(g); g.strokeStyle = `rgba(255,220,130,${0.35 * a})`; g.lineWidth = 1;
      g.beginPath();
      for (let i = 0; i <= 24; i++) { const an = i / 24 * TAU + t * 1.2; if ((Math.sin(an) > 0) !== front) { g.moveTo(x + Math.cos(an) * 20, y - 28 + Math.sin(an * 2 + t) * 14 + Math.sin(an) * 6); continue; } g.lineTo(x + Math.cos(an) * 20, y - 28 + Math.sin(an * 2 + t) * 14 + Math.sin(an) * 6); }
      g.stroke();
    },
    haste(g, x, y, t, front, a, p) {
      if (front) return;
      lit(g); const d = (p.facing || 1) > 0 ? 1 : -1;
      for (let i = 0; i < 3; i++) { const q = (t * 2.2 + i / 3) % 1, yy = y - 6 - i * 9; g.strokeStyle = `rgba(190,255,140,${0.4 * a * (1 - q)})`; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - d * (10 + q * 16), yy); g.lineTo(x - d * (22 + q * 16), yy); g.stroke(); }
    },
    wind_walk(g, x, y, t, front, a) {
      lit(g); g.lineWidth = 1.5;
      for (let j = 0; j < 2; j++) {
        g.strokeStyle = `rgba(190,255,215,${0.32 * a})`; g.beginPath(); let on = false;
        for (let i = 0; i <= 14; i++) { const an = j * Math.PI + i / 14 * 4 + t * 3, dz = Math.sin(an), px = x + Math.cos(an) * 16, py = y - 4 - i * 1.8 + dz * 5; if ((dz > 0) === front) { if (on) g.lineTo(px, py); else g.moveTo(px, py); on = true; } else on = false; }
        g.stroke();
      }
    },
    zen(g, x, y, t, front, a) {
      if (front) return;
      lit(g); g.save(); g.translate(x, y); g.scale(1, R.K); g.rotate(t * 0.4);
      g.strokeStyle = `rgba(150,255,215,${0.3 * a})`; g.lineWidth = 1.2;
      g.beginPath(); g.arc(0, 0, 24, 0, TAU); g.stroke();
      for (let i = 0; i < 8; i++) { g.save(); g.rotate(i * TAU / 8); g.beginPath(); g.ellipse(14, 0, 9, 3.5, 0, 0, TAU); g.stroke(); g.restore(); }
      g.restore();
    },
    song(g, x, y, t, front, a) { if (front) noteAura(g, x, y, t, a, '255,215,110'); },
    hymn(g, x, y, t, front, a) { if (front) noteAura(g, x, y, t, a, '210,150,255'); },
    giant(g, x, y, t, front, a) {
      lit(g);
      if (!front) { glow(g, x, y, 26, '255,120,50', 0.3 * a, R.K); return; }
      for (let i = 0; i < N(5); i++) { const q = (t * 0.6 + i / 5) % 1; glow(g, x + Math.sin(i * 2.9 + q * 4) * 14, y - 8 - q * 56, 5, '255,140,60', 0.6 * a * Math.sin(q * Math.PI)); }
    },
    hex_shield(g, x, y, t, front, a) {
      if (!front) return;
      lit(g); const cy = y - 32;
      g.strokeStyle = `rgba(180,220,255,${0.18 * a})`; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, cy, 28, 40, 0, 0, TAU); g.stroke();
      const cells = hexCells(); g.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const ph = t * 0.5 + i / 3, q = ph % 1, c = cells[((ph | 0) * 13 + i * 17) % cells.length];
        g.strokeStyle = `rgba(210,235,255,${0.5 * a * Math.sin(q * Math.PI)})`;
        g.beginPath(); hexPath(g, x + c[0] * 0.93, cy + c[1] * 0.93, 3.8); g.stroke();
      }
    },
  };
  function noteAura(g, x, y, t, a, col) {
    const dk = col.split(',').map(c => Math.round(c * 0.4)).join(',');
    for (let pass = 0; pass < 2; pass++) {
      if (pass) lit(g); else nrm(g);
      g.fillStyle = g.strokeStyle = pass ? `rgba(${col},${0.5 * a})` : `rgba(${dk},${0.4 * a})`;
      for (let i = 0; i < 2; i++) { const q = (t * 0.45 + i / 2) % 1; g.globalAlpha = Math.sin(q * Math.PI); note(g, x + (i ? 14 : -16) + Math.sin(q * 5) * 3, y - 40 - q * 34, 0.85, i); }
    }
    g.globalAlpha = 1;
  }

  // ---------- ภาพชาร์จระหว่างร่าย ----------
  const CHG = { meteor: '255,140,50', void_lance: '170,80,255', rock_spikes: '230,175,95', frost_nova: '170,230,255', dark_nova: '160,80,255', hex: '120,255,110', drain: '170,90,255', ragnarok_light: '255,235,160', judgment: '255,240,190', restoration: '140,255,170', chain: '255,240,120', snipe: '255,220,150' };
  function charge(g, p, t, x, y, front) {
    const c = p.cast, s = c && SKILLS[c.id], v = s && s.vfx; if (!v || !CHG[v]) return;
    const k = cl((G.time - c.start) / Math.max(0.05, c.end - c.start)), col = CHG[v];
    const hx = x + (p.facing || 1) * 10, hy = y - 30;
    lit(g);
    if (!front) {
      g.save(); g.translate(x, y); g.scale(1, R.K); g.rotate(t * 1.5);
      g.strokeStyle = `rgba(${col},${0.45 + 0.3 * k})`; g.lineWidth = 1.5; g.setLineDash([6, 5]); g.beginPath(); g.arc(0, 0, 30, 0, TAU); g.stroke(); g.setLineDash([]);
      g.restore();
      return;
    }
    if (v === 'meteor') { glow(g, x, y - 84, 10 + 18 * k, '255,140,50', 0.9); glow(g, x, y - 84, 5 + 6 * k, '255,240,200', 1); }
    else if (v === 'chain') {
      for (let b = 0; b < 2; b++) { const sd = ((t * 20) | 0) + b * 31, an = U.hash2(sd, 1) * TAU; boltGlow(g, hx, hy, hx + Math.cos(an) * (12 + 10 * k), hy + Math.sin(an) * (12 + 10 * k), sd, 4, 4, col, 0.8, 0.5); }
      glow(g, hx, hy, 8 + 10 * k, col, 0.8);
    } else if (v === 'snipe') {
      glow(g, hx, hy, 6 + 8 * k, col, 0.8); star4(g, hx, hy, 6 + 10 * k * (0.7 + 0.3 * Math.sin(t * 20)), '255,255,240', 0.9);
      const m = c.target;
      if (m && !m.dead) {
        const tx = m.x * TILE, ty = m.y * TILE * R.K - 18 * sc(m) - p.y * TILE * (R.K - 1), r = 38 - 22 * eo(k);
        g.strokeStyle = `rgba(255,90,60,${0.5 + 0.4 * k})`; g.lineWidth = 1.5;
        g.save(); g.translate(tx, ty); g.rotate(t * 1.2 * (1 - k));
        g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
        g.beginPath(); for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2; g.moveTo(Math.cos(an) * (r - 6), Math.sin(an) * (r - 6)); g.lineTo(Math.cos(an) * (r + 7), Math.sin(an) * (r + 7)); } g.stroke();
        g.fillStyle = 'rgba(255,90,60,0.9)'; g.fillRect(-1.5, -1.5, 3, 3);
        g.restore();
      }
    } else {
      for (let i = 0; i < N(8); i++) { const q = (t * 1.4 + i / 8) % 1, an = i / 8 * TAU + t, rr = 34 * (1 - q); glow(g, hx + Math.cos(an) * rr, hy + Math.sin(an) * rr * 0.7, 4, col, 0.9 * q); }
      glow(g, hx, hy, 8 + 12 * k, col, 0.8);
    }
  }

  // ห่อ Sprites.drawPlayer: ออร่า/ชาร์จด้านหลัง → ตัวละคร → ด้านหน้า
  function auras(p) {
    if (!p.buffs) return null;
    let out = null;
    for (const id in p.buffs) {
      const b = p.buffs[id], s = SKILLS[id], v = s && s.vfx;
      if (!v || !AURA[v] || !b || !(b.until > G.time)) continue;
      const st = AST[id], fin = st ? cl((G.time - st - 0.6) / 0.8) : 1, a = fin * Math.min(1, (b.until - G.time) / 1.5);
      if (a <= 0.01) continue;
      (out || (out = [])).push([v, a * 1.7]); // ×1.7: ยังจาง แต่มองเห็นบนพื้นสว่าง
      if (out.length >= 3) break;
    }
    return out;
  }
  if (typeof Sprites !== 'undefined' && Sprites.drawPlayer) {
    const base = Sprites.drawPlayer;
    Sprites.drawPlayer = (g, p, t) => {
      if (G.fastSim || p !== G.player || p.dead || (typeof SciencePresentation !== 'undefined' && SciencePresentation.caster(p.job))) return base(g, p, t);
      const list = auras(p), x = p.x * TILE, y = p.y * TILE;
      if (list || p.cast) { g.save(); if (list) for (const [v, a] of list) AURA[v](g, x, y, t, false, a, p); if (p.cast) charge(g, p, t, x, y, false); g.restore(); }
      base(g, p, t);
      if (list || p.cast) { g.save(); if (list) for (const [v, a] of list) AURA[v](g, x, y, t, true, a, p); if (p.cast) charge(g, p, t, x, y, true); g.restore(); }
    };
  }
})();
