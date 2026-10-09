'use strict';
// ============================================================
//  Class 3 รอบ 4 (2026-10-09): Fimbul Huntmaster (← Skadi Ranger) + Gungnir Deadeye (← Ullr Sniper)
//  ตามแบบ docs/CLASS3_DESIGN.md §3.5 / §3.6 — สาย Wildhunter ครบคู่ • โครงเดียวกับ js/class3_wave3.js (โหลดต่อจากไฟล์นั้น)
//  ทำให้ง่ายลงจากแบบ (บันทึกไว้):
//   • Winter Pack "หมาป่าคู่ใจเป็นหมาป่าน้ำแข็ง 2 ตัว" → ต่อยอด Wolf Companion เดิม: เรียกหมาป่าเมื่อไหร่ได้ 2 ตัว (Oath of the Pack 3 ตัว)
//     ใช้ระบบผู้ช่วยเดิม (G.allies kind 'wolf') — ตามข้ามแผนที่/หมดเวลา/บอทเรียกใหม่ เหมือนเดิมทุกอย่าง
//   • "ช้าซ้อน 3 ครั้ง = แช่แข็ง" → รอยหนาว (chill) นับจาก Blizzard Volley / เขี้ยวหมาป่าน้ำแข็ง / Frost Snare / ไม้ตาย ครบ 3 = แช่แข็ง (บอส/ผู้เล่น: ช้า)
//   • Oath of Patience "ชาร์จได้ถึง 3 วิ ยิ่งนานยิ่งแรง" → ชาร์จ 3 วิเสมอ แรง ×1.45 (ยังไม่มีระบบปล่อยชาร์จกลางทาง)
//   • Mark Prey "เรา+ปาร์ตี้" → ทุกการตีของเรา (ตีปกติ+สกิล) บนเป้าที่มาร์ก — ปาร์ตี้ออนไลน์ยังส่งรอยข้ามเครื่องไม่ได้ • ตัวเราได้ HIT ด้วย (ซัพเลือกตัวเองได้)
// ============================================================
(() => {
  if (typeof Class3 === 'undefined') return;
  const C = Class3;
  const K = Object.assign(C.K, {
    // Huntmaster
    h4_wolf: lv => 0.56 + 0.04 * lv, h4_pack3: 0.8,       // Winter Pack: แรงกัดต่อตัว 60~76% ของหมาป่าเดิม • Oath of the Pack: ตัวละ ×0.8
    h4_chill: 3, h4_chill_dur: 4, h4_frz: 1.5, h4_frz_boss: 1,
    h4_bz_r: 2.8, h4_bz_waves: 4, h4_bz_every: 0.4,
    h4_av_k: 4.4, h4_av_r: 1.6,                           // รูน Avalanche: ระลอกเดียว ×4.4 ของระลอกปกติ วงแคบ 1.6
    h4_cmd: 1.5,                                          // Pack Command: หมาแรง +50%
    h4_shatter: 1.5,
    h4_sn_max: 3, h4_sn_r: 1.8, h4_sn_root: 2, h4_sn_k: lv => 1.2 + 0.2 * lv,
    h4_pack_bow: 0.88, h4_lone_bow: 1.15, h4_lone_cd: 0.6, // Oath of the Pack / of the Lone Peak
    h4_ult: 10, h4_ult_r: 7,
    // Deadeye
    d4_far: 6, d4_far_k: lv => 0.03 * lv, d4_far_max: 10,  // Gungnir's Truth: ≥6 ช่องไม่พลาด • +3%×Lv × (ระยะ/10)
    d4_pat_cast: 3000, d4_pat_k: 1.45, d4_sk_k: 0.6, d4_sk_cd: 1.8,
    d4_rico_n: 2, d4_rico_k: 0.5, d4_rico_r: 4, d4_pin: 3, d4_pin_boss: 1,
    d4_prey: lv => 0.02 * lv, d4_prey_dur: 12,
    d4_back: 4,
    d4_rain_n: 5, d4_rain_r: 2.5, d4_rain_hit: 0.9,
    d4_br_aspd: lv => lv, d4_br_cdmg: lv => 2 * lv, d4_br_max: 5,
    d4_ult: 8,
  });
  const P = () => G.player;
  const fast = () => !!G.fastSim;
  const lvOf = id => (G.player && G.player.skills[id]) || 0;
  const say = (o, t, c, big) => { if (!fast()) addFloater(o.x, o.y - 1.6, t, c, big); };
  const chosen = sk => typeof Runes !== 'undefined' && Runes.chosen(sk);
  const oath = sk => { const r = chosen(sk); return r ? r.oath || null : null; };
  const rune = sk => { const r = chosen(sk); return r ? r.c3w4 || null : null; };
  const isJob = j => !!G.player && G.player.job === j;
  const buffOn = id => { const p = P(), b = p && p.buffs[id]; return !!(b && b.until > G.time); };
  const tough = m => !!(m.def.boss || m.isPlayer);

  // ------------------------------------------------------------
  //  ข้อมูล Class + สกิล
  // ------------------------------------------------------------
  Object.assign(THIRD_JOBS, { skadi: 'huntmaster', ullr: 'deadeye' });
  Object.assign(JOBS, {
    huntmaster: { glow: '#d8f4ff', name: 'Fimbul Huntmaster', thai: L('จ้าวพรานแห่งฟิมบูล', 'Huntmaster of the Fimbulwinter'), parent: 'skadi', tier: 3,
      bonus: { atkPct: 25, matkPct: 15, hit: 15, hpPct: 15 }, hp: 1.35, sp: 1.55, jobMax: 60, aspd: 1150,
      outfit: '#e8f2f8', outfit2: '#8ac8e8', pants: '#4a5a6a', cape: '#f4fbff', jobHat: 'hood',
      stats: 'DEX / AGI', role: L('นักธนูคู่ฝูงหมาป่าน้ำแข็ง แช่แข็งทั้งสนาม', 'Pack Archer — Frost Wolves and a Frozen Field'),
      desc: L('ผู้ตามเสียงหอนของหมาป่าที่ไม่เคยทิ้งนาง ยิงห่าธนูหิมะให้ศัตรูช้าจนแข็ง แล้วสั่งฝูงหมาป่าน้ำแข็งรุมตัวที่หยุดนิ่ง',
        'One who followed the howl of the wolf that never left her. She looses blizzard volleys until foes freeze solid, then sends her frost wolves at whatever stands still.'),
      skills: ['winter_pack', 'blizzard_volley', 'pack_command', 'glacier_arrow', 'fimbul_whiteout', 'frost_snare'] },
    deadeye: { glow: '#e0f080', name: 'Gungnir Deadeye', thai: L('นักแม่นธนูแห่งกุงนีร์', 'Deadeye of Gungnir'), parent: 'ullr', tier: 3,
      bonus: { atkPct: 30, matkPct: 15, hit: 15, hpPct: 15 }, hp: 1.3, sp: 1.5, jobMax: 60, aspd: 1200,
      outfit: '#5a6038', outfit2: '#c8a040', pants: '#3a2c20', cape: '#6a5a30', jobHat: 'hood',
      stats: 'DEX / LUK', role: L('สไนเปอร์ระยะไกลสุด ช็อตชาร์จที่ไม่เคยพลาด', 'Long-range Sniper — Charged Shots That Never Miss'),
      desc: L('ผู้ยิงลูกธนูดอกต่อจากนักล่าที่ลูกสุดท้ายยังไม่ตกถึงพื้น ยืนนิ่ง หายใจออก แล้วปล่อยหอกที่ไม่เคยพลาดเป้า',
        'One who looses the next arrow after a huntress whose last shot never landed. Stand still, breathe out, and release the spear that never misses.'),
      skills: ['gungnirs_truth', 'spear_shot', 'mark_prey', 'recoil_shot', 'rain_of_spears', 'steady_breath'] },
  });
  Object.assign(SKILLS, {
    // ===== Fimbul Huntmaster =====
    winter_pack: { name: 'Winter Pack', max: 5, type: 'passive', icon: '#d0f0ff', glyph: 'ᚹ',
      passive: lv => ({ dex: lv, hit: 2 * lv, aspdPct: lv }),
      desc: L('ฝูงฤดูหนาว DEX +Lv HIT +2×Lv ความเร็วโจมตี +1%×Lv • Wolf Companion เรียกหมาป่าน้ำแข็ง 2 ตัว (ตัวละ 60~76%) เขี้ยวติดรอยหนาว • ศัตรูหนาวครบ 3 ชั้น = แช่แข็ง 1.5 วินาที',
        'The winter pack. DEX +Lv, HIT +2×Lv, attack speed +1%×Lv • Wolf Companion calls 2 frost wolves (60~76% each) whose bites chill • 3 chill stacks freeze a foe for 1.5s.') },
    blizzard_volley: { name: 'Blizzard Volley', max: 5, type: 'active', target: 'enemy', bow: true, range: 9, icon: '#c0e8ff', glyph: '❄', req: { winter_pack: 1 },
      sp: lv => 24 + 2 * lv, delay: 700, cd: 5, c3w4bliz: true,
      dmg: { type: 'phys', element: 'water', mult: lv => 0.82 + 0.16 * lv, area: 2.8, at: 'target' },
      desc: L('ห่าธนูหิมะรัศมี 2.8 ช่อง 4 ระลอก ระลอกละ 98~162% ธาตุน้ำ ทุกระลอกติดรอยหนาว',
        'A blizzard of arrows over 2.8 cells in 4 waves of 98~162% Water each; every wave chills.') },
    pack_command: { name: 'Pack Command', max: 5, type: 'active', target: 'self', icon: '#e0f0ff', glyph: '⚐', req: { winter_pack: 2 },
      sp: () => 20, delay: 500, cd: 15, selfFx: 'shout', c3w4cmd: true,
      buff: { dur: () => 6, stats: lv => ({ aspdPct: 2 * lv }) },
      desc: L('สั่งฝูง 6 วินาที หมาป่ารุมเป้าของเรา กัดแรง +50% • ตัวเราความเร็วโจมตี +2%×Lv',
        'Command the pack for 6s: wolves converge on your target and bite 50% harder • you gain attack speed +2%×Lv.') },
    glacier_arrow: { name: 'Glacier Arrow', max: 5, type: 'active', target: 'enemy', bow: true, icon: '#a0e0ff', glyph: '➶', req: { blizzard_volley: 1 },
      sp: lv => 16 + 2 * lv, delay: 700, cd: 4, fx: 'coldbolt', chain: true, c3w4glacier: true,
      dmg: { type: 'phys', element: 'water', mult: lv => 3.9 + 0.62 * lv },
      desc: L('ลูกธนูธารน้ำแข็ง 452~700% ธาตุน้ำ • เป้าที่แช่แข็งอยู่ ×1.5 แล้วน้ำแข็งแตก',
        'A glacier arrow for 452~700% Water • against a frozen target ×1.5, shattering the ice.') },
    fimbul_whiteout: { name: 'Whiteout', max: 5, type: 'active', target: 'self', icon: '#f4fbff', glyph: '❅', req: { winter_pack: 3 },
      sp: () => 18, delay: 400, cd: 14, special: 'stealth', dur: () => 4, c3w4white: true, selfFx: 'buff',
      buff: { dur: () => 6, stats: lv => ({ flee: 4 * lv }) },
      desc: L('หายในหิมะ 4 วินาที FLEE +4×Lv 6 วินาที • ลูกแรกที่ยิงออกมา (ตีปกติหรือสกิล) คริติคอลแน่นอน',
        'Vanish into the snow for 4s, FLEE +4×Lv for 6s • your first shot out of it (basic or skill) is a guaranteed critical.') },
    frost_snare: { name: 'Frost Snare', max: 5, type: 'active', target: 'self', icon: '#90d8f0', glyph: '✲', req: { glacier_arrow: 1 },
      sp: () => 12, delay: 400, cd: 4, c3w4snare: true,
      desc: L('วางกับดักน้ำแข็งที่เท้า (สูงสุด 3 อัน) ศัตรูเหยียบ: 140~220% ธาตุน้ำในรัศมี 1.8 ตรึง 2 วินาที + รอยหนาว (บอส/ผู้เล่น: ช้า)',
        'Set an ice snare at your feet (max 3). When stepped on: 140~220% Water within 1.8 cells, root 2s + chill (bosses/players: slowed).') },
    // ===== Gungnir Deadeye =====
    gungnirs_truth: { name: "Gungnir's Truth", max: 5, type: 'passive', icon: '#f0e090', glyph: 'ᛃ',
      passive: lv => ({ dex: 2 * lv, hit: 2 * lv, critDmgPct: 3 * lv }),
      desc: L('ความจริงของกุงนีร์ DEX +2×Lv HIT +2×Lv แรงคริติคอล +3%×Lv • เป้าห่าง ≥6 ช่อง ไม่พลาด • ดาเมจ +3%×Lv ตามระยะ (เต็มที่ 10 ช่อง)',
        "Gungnir's truth. DEX +2×Lv, HIT +2×Lv, critical damage +3%×Lv • never miss a target 6+ cells away • damage +3%×Lv scaled by distance (full at 10 cells).") },
    spear_shot: { name: 'Spear-Shot', max: 5, type: 'active', target: 'enemy', bow: true, range: 11, icon: '#ffe070', glyph: '➳', req: { gungnirs_truth: 1 },
      sp: lv => 30 + 3 * lv, cast: () => 2000, delay: 900, cd: 2, chain: true, fx: 'arrow', c3w4spear: true,
      dmg: { type: 'phys', mult: lv => 6.0 + 1.0 * lv, line: true, sureHit: true },
      desc: L('ชาร์จ 2 วินาที (ยืนนิ่ง) แล้วปล่อยลูกศรหัวหอก 700~1100% ทะลุทั้งแนว ไม่พลาด',
        'Charge for 2s (stand still), then loose a spearhead arrow for 700~1100% that pierces the whole line and never misses.') },
    mark_prey: { name: 'Mark Prey', max: 5, type: 'active', target: 'enemy', range: 11, icon: '#d0e070', glyph: '◎', req: { gungnirs_truth: 2 },
      sp: () => 16, delay: 400, cd: 12, special: 'c3w4_mark',
      buff: { dur: () => 12, stats: lv => ({ hit: 2 * lv }) },
      desc: L('มาร์กเหยื่อ 12 วินาที ทุกการตีของเราใส่ตัวนั้นแรง +2%×Lv • ตัวเรา HIT +2×Lv',
        'Mark your prey for 12s: everything you land on it deals +2%×Lv • you gain HIT +2×Lv.') },
    recoil_shot: { name: 'Recoil Shot', max: 5, type: 'active', target: 'enemy', bow: true, icon: '#c0d080', glyph: '⇜', req: { spear_shot: 1 },
      sp: lv => 14 + 2 * lv, delay: 600, cd: 6, chain: true, fx: 'arrow', c3w4recoil: true,
      dmg: { type: 'phys', mult: lv => 2.55 + 0.45 * lv },
      desc: L('ยิง 300~480% แล้วกระโดดถอยหลัง 4 ช่อง', 'Fire for 300~480%, then leap 4 cells back.') },
    rain_of_spears: { name: 'Rain of Spears', max: 5, type: 'active', target: 'enemy', bow: true, range: 9, icon: '#e8d080', glyph: '⇊', req: { mark_prey: 1 },
      sp: lv => 22 + 2 * lv, delay: 700, cd: 7, c3w4rain: true,
      dmg: { type: 'phys', mult: lv => 1.65 + 0.35 * lv, area: 2.5, at: 'target' },
      desc: L('หอกธนู 5 ดอกตกสุ่มในรัศมี 2.5 ช่อง ดอกละ 200~340% (ดอกละวง 0.9 ช่อง)',
        'Five spear-arrows fall at random within 2.5 cells, 200~340% each (0.9-cell impact).') },
    steady_breath: { name: 'Steady Breath', max: 5, type: 'active', target: 'self', icon: '#e0f0c0', glyph: '≈', req: { recoil_shot: 1 },
      sp: () => 24, delay: 400, cd: 22, selfFx: 'buff', c3w4breath: true,
      buff: { dur: () => 10, stats: lv => ({ hit: lv }) },
      desc: L('หายใจนิ่ง 10 วินาที ยืนนิ่งทุก 1 วินาทีได้ 1 ชั้น: ความเร็วโจมตี +Lv% แรงคริติคอล +2%×Lv (สูงสุด 5 ชั้น เดินแล้วหาย)',
        'Steady your breath for 10s: every second you stand still adds a stack of attack speed +Lv% and critical damage +2%×Lv (up to 5; moving clears them).') },
  });
  const NEW = ['winter_pack', 'blizzard_volley', 'pack_command', 'glacier_arrow', 'fimbul_whiteout', 'frost_snare', 'gungnirs_truth', 'spear_shot', 'mark_prey', 'recoil_shot', 'rain_of_spears', 'steady_breath'];
  for (const id of NEW) SKILLS[id].id = id;

  // ------------------------------------------------------------
  //  รอยหนาว → แช่แข็ง (Huntmaster)
  // ------------------------------------------------------------
  C.chill = (m, n = 1) => {
    if (!m || m.dead) return;
    const c = m.c3chill && m.c3chill.until > G.time ? m.c3chill : { n: 0 };
    c.n += n; c.until = G.time + K.h4_chill_dur; m.c3chill = c;
    m.slowUntil = Math.max(m.slowUntil || 0, G.time + 2);
    if (c.n < K.h4_chill) return;
    c.n = 0;
    if (tough(m)) { m.slowUntil = Math.max(m.slowUntil, G.time + K.h4_frz_boss); return; }
    m.stunUntil = Math.max(m.stunUntil || 0, G.time + K.h4_frz); m.c3frozen = G.time + K.h4_frz; m.path = []; m.moving = false;
    say(m, 'FROZEN', '#c8f0ff');
    if (!fast()) addFx({ type: 'ring', x: m.x, y: m.y, dur: 0.5, r: 0.9, color: '200,240,255' });
  };
  const packN = () => { const o = oath('winter_pack'); return o === 'lone' ? 0 : o === 'pack' ? 3 : 2; };
  // หลัง Wolf Companion เรียกหมาป่า: แปลงเป็นฝูงน้ำแข็ง (จำนวนตาม Oath)
  C.winterPack = () => {
    const p = P(), lv = lvOf('winter_pack'); if (!p || !lv || !isJob('huntmaster')) return;
    const n = packN();
    let pack = G.allies.filter(a => a.kind === 'wolf' && !a.dead && a.hp > 0 && a.until > G.time);
    if (!n) { G.allies = G.allies.filter(a => a.kind !== 'wolf'); return; }
    if (!pack.length) return;
    const w0 = pack[0];
    for (let i = pack.length; i < n; i++) {
      const near = { x: p.x + (i % 2 ? -0.8 : 0.4), y: p.y + (i > 1 ? 0.8 : -0.4) };
      const pos = G.map.walkable(Math.floor(near.x), Math.floor(near.y)) ? near : G.map.nearestWalkable(near.x, near.y);
      G.allies.push(Object.assign({}, w0, { x: pos.x, y: pos.y, path: [], target: null, nextAtk: 0, hitFlash: 0, seed: Math.random(), split: i % 2 === 1, def: Object.assign({}, w0.def) }));
    }
    pack = G.allies.filter(a => a.kind === 'wolf' && !a.dead && a.hp > 0 && a.until > G.time).slice(0, n);
    G.allies = G.allies.filter(a => a.kind !== 'wolf' || pack.includes(a));
    for (const a of pack) {
      a.c3frost = true; a.c3pow = K.h4_wolf(lv) * (n === 3 ? K.h4_pack3 : 1); a.pow = a.c3pow;
      a.def = Object.assign({}, a.def, { color: '#eaf6ff', color2: '#7ab8d8', size: 0.85 });
    }
    say(p, n === 3 ? 'WINTER PACK ×3' : 'WINTER PACK', '#d8f4ff');
  };

  // ------------------------------------------------------------
  //  Blizzard Volley / Frost Snare (Huntmaster) • Rain of Spears / Recoil / Mark Prey (Deadeye)
  // ------------------------------------------------------------
  C.blizzard = (s, lv, tgt) => {
    const rn = rune('blizzard_volley'), at = { x: tgt.x, y: tgt.y };
    if (rn === 'avalanche') {
      later(0.35, () => { for (const m of Runes.foes(at.x, at.y, K.h4_av_r)) { skillHitOne(s, lv, m, K.h4_av_k); C.chill(m, 2); } });
      if (!fast()) Runes.fx({ kind: 'zone', x: at.x, y: at.y, r: K.h4_av_r, dur: 0.6, col: '200,240,255', style: 'ring' });
      return;
    }
    const drift = rn === 'drift';
    Runes.zone({ skill: s.id, x: at.x, y: at.y, ref: drift ? tgt : null, r: K.h4_bz_r, every: drift ? 1 : K.h4_bz_every, first: 0.15, rgb: '200,235,255',
      until: G.time + 0.15 + (drift ? 1 : K.h4_bz_every) * (K.h4_bz_waves - 1) + 0.05,
      tick: (z, ms) => { for (const m of ms) { skillHitOne(s, lv, m); C.chill(m); } } });
  };
  C.snare = (s, lv) => {
    const p = P(), at = { x: p.x, y: p.y };
    p.c3snares = (p.c3snares || []).filter(z => z.until > G.time);
    while (p.c3snares.length >= K.h4_sn_max) p.c3snares.shift().until = G.time;
    const z = Runes.zone({ skill: s.id, x: at.x, y: at.y, r: 0.9, until: G.time + 30, every: 0.2, first: 0.6, rgb: '150,220,255', style: 'ring',
      tick: (zz, ms) => {
        if (!ms.length) return;
        zz.until = G.time;
        for (const m of Runes.foes(at.x, at.y, K.h4_sn_r)) {
          Runes.hit(m, s, K.h4_sn_k(lv), { element: 'water', color: '#a0e0ff' });
          if (tough(m)) m.slowUntil = Math.max(m.slowUntil || 0, G.time + 1);
          else { m.stunUntil = Math.max(m.stunUntil || 0, G.time + K.h4_sn_root); m.path = []; m.moving = false; }
          C.chill(m);
        }
        say(zz, 'SNARE', '#a0e0ff');
        if (!fast()) addFx({ type: 'ring', x: at.x, y: at.y, dur: 0.5, r: K.h4_sn_r, color: '160,225,255' });
      } });
    p.c3snares.push(z);
  };
  C.rain = (s, lv, tgt) => {
    const at = { x: tgt.x, y: tgt.y };
    for (let i = 0; i < K.d4_rain_n; i++) {
      const a = Math.random() * Math.PI * 2, r = i === 0 ? 0 : Math.sqrt(Math.random()) * K.d4_rain_r, x = at.x + Math.cos(a) * r, y = at.y + Math.sin(a) * r;
      later(0.1 + i * 0.12, () => {
        if (!fast()) addFx({ type: 'arrow', sx: x, sy: y - 6, tx: x, ty: y, dur: 0.18, big: true });
        for (const m of Runes.foes(x, y, K.d4_rain_hit)) skillHitOne(s, lv, m);
      });
    }
  };
  const leapBack = (from, dist) => {
    const p = P(), dx = p.x - from.x, dy = p.y - from.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    let go = 0;
    for (let g = 0.3; g <= dist; g += 0.3) { if (!G.map.walkable(Math.floor(p.x + ux * g), Math.floor(p.y + uy * g))) break; go = g; }
    p.x += ux * go; p.y += uy * go; p.path = [];
    if (!fast()) Runes.fx({ kind: 'drag', x: p.x, y: p.y, ox: ux, oy: uy, dur: 0.35, col: '220,230,140' });
  };
  C.prey = (s, lv, at) => {
    const p = P(), m = at && !at.dead && at.def ? at : p.target && !p.target.dead ? p.target : null; if (!m) return;
    m.c3prey = G.time + K.d4_prey_dur; m.c3preyK = 1 + K.d4_prey(lv);
    say(m, 'MARKED', '#e0f070');
    if (!fast()) Runes.fx({ kind: 'mark', ref: m, dur: K.d4_prey_dur, col: '224,240,112', glyph: '◎' });
  };
  C.never = () => C.ultOn('never');

  // ------------------------------------------------------------
  //  สูตรตี: Gungnir's Truth (ระยะ) + Mark Prey — ห่อ physHit/magicHit (ตีปกติ+สกิล+รูน)
  // ------------------------------------------------------------
  const farMul = m => {
    const p = P(); if (!p || !m || !isJob('deadeye')) return 1;
    const lv = lvOf('gungnirs_truth'); if (!lv) return 1;
    return 1 + K.d4_far_k(lv) * Math.min(1, U.dist(p.x, p.y, m.x, m.y) / K.d4_far_max);
  };
  const preyMul = m => (m && m.c3prey > G.time ? m.c3preyK || 1 : 1);
  if (typeof physHit === 'function' && !physHit._c3w4) {
    const f0 = physHit;
    physHit = function (m, mult = 1, opts = {}) { // eslint-disable-line no-global-assign
      const p = G.player;
      if (p && m && isJob('deadeye') && lvOf('gungnirs_truth') && U.dist(p.x, p.y, m.x, m.y) >= K.d4_far) opts = Object.assign({}, opts, { sureHit: true });
      return f0.call(this, m, mult * farMul(m) * preyMul(m), opts);
    };
    physHit._c3w4 = true;
  }
  if (typeof magicHit === 'function' && !magicHit._c3w4) {
    const f0 = magicHit;
    magicHit = function (m, mult = 1, element = null) { return f0.call(this, m, mult * preyMul(m), element); }; // eslint-disable-line no-global-assign
    magicHit._c3w4 = true;
  }
  C.farMul = farMul;

  // ------------------------------------------------------------
  //  skillDef: Oath ของ Spear-Shot • Lone Peak คูลดาวน์ Whiteout • ไม้ตาย NEVER-MISSING
  // ------------------------------------------------------------
  if (typeof skillDef === 'function' && !skillDef._c3w4) {
    const f0 = skillDef;
    skillDef = function (id) { // eslint-disable-line no-global-assign
      const s = f0.apply(this, arguments), p = G.player;
      if (!s || !p) return s;
      if (s.c3w4white && isJob('huntmaster') && oath('winter_pack') === 'lone') { const d = Object.create(s); d.cd = s.cd * K.h4_lone_cd; return d; }
      if (!isJob('deadeye')) return s;
      const ult = C.never();
      if (s.c3w4spear) {
        const o = oath('gungnirs_truth'), pierce = ult || !rune('spear_shot');
        let k = 1; const d = Object.create(s);
        if (ult) d.cast = () => 0;
        else if (o === 'patience') { d.cast = () => K.d4_pat_cast; k = K.d4_pat_k; }
        else if (o === 'skirmisher') { d.cast = () => 0; d.cd = K.d4_sk_cd; k = K.d4_sk_k; }
        d.dmg = Object.assign({}, s.dmg, { mult: lv => s.dmg.mult(lv) * k, line: pierce });
        if (!pierce) d.fx = 'arrow';
        return d;
      }
      if (ult && s.bow && s.dmg && !s.dmg.area && !s.dmg.line && !s.c3w4rain) { const d = Object.create(s); d.dmg = Object.assign({}, s.dmg, { line: true }); return d; }
      return s;
    };
    skillDef._c3w4 = true;
  }
  // หมาป่า: Wolf Companion ของ Huntmaster = ฝูงน้ำแข็ง • Lone Peak ไม่เรียกหมา (บอทก็ไม่กด)
  if (typeof runSpecialSkill === 'function' && !runSpecialSkill._c3w4) {
    const f0 = runSpecialSkill;
    runSpecialSkill = function (kind, s, lv) { // eslint-disable-line no-global-assign
      if (kind === 'c3w4_mark') return void C.prey(s, lv, C.tgt);
      if (kind === 'summon_wolf' && isJob('huntmaster') && lvOf('winter_pack') && !packN()) { say(P(), 'Lone Peak', '#d8f4ff'); return; }
      const r = f0.apply(this, arguments);
      if (kind === 'summon_wolf') C.winterPack();
      return r;
    };
    runSpecialSkill._c3w4 = true;
  }
  if (typeof Bot !== 'undefined' && !Bot._c3w4) {
    const cc0 = Bot.canCast;
    Bot.canCast = function (id) { if (id === 'wolf_companion' && isJob('huntmaster') && lvOf('winter_pack') && !packN()) return false; return cc0.apply(this, arguments); };
    Bot._c3w4 = true;
  }

  // ------------------------------------------------------------
  //  จุดเกาะ Runes (ห่อต่อจาก js/class3_wave3.js)
  // ------------------------------------------------------------
  const RU = Runes;
  { const f0 = RU.afterWolf;
    RU.afterWolf = function (a, t) { f0.apply(this, arguments); if (a && a.c3frost && t && !t.dead) C.chill(t); }; }
  { const f0 = RU.preCast;
    RU.preCast = function (s, lv, tgt) {
      const p = P();
      if (p && s && s.c3w4breath) { p.c3breathAt = { x: p.x, y: p.y }; p.c3breathNext = G.time + 1; }
      return f0.apply(this, arguments);
    }; }
  { const f0 = RU.onCast;
    RU.onCast = function (s, lv, tgt) {
      const p = P();
      if (s.c3w4white) RU._crit = true; // ลูกแรกหลัง Whiteout คริ (ตีปกติได้ Ambush จากการซ่อนตัวอยู่แล้ว)
      if (s.c3w4snare) C.snare(s, lv);
      const r = f0.apply(this, arguments);
      if (s.c3w4bliz && tgt && !tgt.dead) { C.blizzard(s, lv, tgt); return true; }
      if (s.c3w4rain && tgt && !tgt.dead) { C.rain(s, lv, tgt); return true; }
      if (s.c3w4recoil && tgt) later(0.12, () => { if (!p.dead) leapBack(tgt, K.d4_back); });
      return r;
    }; }
  { const f0 = RU.hitMul;
    RU.hitMul = function (s, lv, m) {
      let k = f0.apply(this, arguments);
      const p = P(); if (!p || !m) return k;
      if (isJob('huntmaster') && s.bow) { const o = oath('winter_pack'); if (o === 'pack') k *= K.h4_pack_bow; else if (o === 'lone') k *= K.h4_lone_bow; }
      if (s.c3w4glacier && m.c3frozen > G.time) { k *= K.h4_shatter; m.c3shatter = true; }
      return k;
    }; }
  { const f0 = RU.afterHit;
    RU.afterHit = function (s, lv, m, r) {
      f0.apply(this, arguments);
      if (!r || r.miss || !m || m.dead) return;
      if (m.c3shatter) { m.c3shatter = false; m.c3frozen = 0; m.stunUntil = G.time; say(m, 'SHATTER', '#e0f8ff', true); }
      if (C.ultOn('fimbul')) C.chill(m);
      if (s.c3w4spear && !C._rico) {
        const rn = rune('spear_shot');
        if (rn === 'pin') { if (tough(m)) m.slowUntil = Math.max(m.slowUntil || 0, G.time + K.d4_pin_boss); else { m.stunUntil = Math.max(m.stunUntil || 0, G.time + K.d4_pin); m.path = []; m.moving = false; say(m, 'PINNED', '#e0f070'); } }
        if (rn === 'ricochet') {
          const near = G.mobs.filter(o => !o.dead && o !== m && U.dist(o.x, o.y, m.x, m.y) <= K.d4_rico_r).sort((a, b) => U.dist(a.x, a.y, m.x, m.y) - U.dist(b.x, b.y, m.x, m.y)).slice(0, K.d4_rico_n);
          near.forEach((o, i) => later(0.08 * (i + 1), () => {
            if (o.dead) return;
            if (!fast()) addFx({ type: 'arrow', sx: m.x, sy: m.y - 0.6, tx: o.x, ty: o.y - 0.6, dur: 0.12 });
            C._rico = true; try { skillDeliver(s, lv, o, K.d4_rico_k); } finally { C._rico = false; }
          }));
        }
      }
    }; }
  { const f0 = RU.update;
    RU.update = function () {
      f0.apply(this, arguments);
      const p = P(); if (!p) return;
      if (isJob('huntmaster')) {
        const cmd = buffOn('pack_command');
        for (const a of G.allies) if (a.c3frost && !a.dead) { a.pow = (a.c3pow || 1) * (cmd ? K.h4_cmd : 1); if (cmd && p.target && !p.target.dead && G.mobs.includes(p.target)) a.target = p.target; }
        if (C.ultOn('fimbul') && G.time >= (p.c3fimbulAt || 0)) {
          p.c3fimbulAt = G.time + 0.5;
          for (const m of G.mobs) if (!m.dead && U.dist(m.x, m.y, p.x, p.y) <= K.h4_ult_r) m.slowUntil = Math.max(m.slowUntil || 0, G.time + 0.6);
        }
      }
      if (isJob('deadeye') && buffOn('steady_breath')) { // ยืนนิ่งทุก 1 วิ = 1 ชั้น • เดิน = หาย
        const at = p.c3breathAt || (p.c3breathAt = { x: p.x, y: p.y });
        if (U.dist(p.x, p.y, at.x, at.y) > 0.25) {
          p.c3breathAt = { x: p.x, y: p.y }; p.c3breathNext = G.time + 1;
          if (p.rb && p.rb.c3w4_breath) { delete p.rb.c3w4_breath; recalc(); }
        } else if (G.time >= (p.c3breathNext || 0)) {
          p.c3breathNext = G.time + 1;
          const lv = p.buffs.steady_breath.lv || lvOf('steady_breath');
          const b = Runes.giveBuff('c3w4_breath', 'steady_breath', 1.5, { aspdPct: K.d4_br_aspd(lv), critDmgPct: K.d4_br_cdmg(lv) }, K.d4_br_max);
          if (b.stacks === K.d4_br_max) say(p, 'STEADY', '#e0f0c0');
        }
      }
    }; }

  // ------------------------------------------------------------
  //  Oath (สกิลติดตัว) + รูนสกิลประจำตัว ★
  // ------------------------------------------------------------
  const pc = v => Math.round(v * 100);
  const keepP = id => () => ({ passive: SKILLS[id].passive });
  Runes.add('winter_pack', [
    { id: 'winter_pack.pack', name: 'Of the Pack', oath: 'pack', intent: 'pack', glyph: 'ᚹ', col: '#d8f4ff',
      short: `Oath: 3 frost wolves (×${pc(K.h4_pack3)}% each) · bow skills ${pc(K.h4_pack_bow)}%`,
      desc: () => L(`Oath of the Pack — เรียกหมาป่าน้ำแข็ง 3 ตัว (ตัวละ ${pc(K.h4_pack3)}%) แต่สกิลธนูเบาลงเหลือ ${pc(K.h4_pack_bow)}% — ฝูงคือดาบ`,
        `Oath of the Pack — call 3 frost wolves (${pc(K.h4_pack3)}% each), but your bow skills drop to ${pc(K.h4_pack_bow)}% — the pack is the blade.`),
      mod: keepP('winter_pack') },
    { id: 'winter_pack.lone', name: 'Of the Lone Peak', oath: 'lone', intent: 'single', glyph: '▲', col: '#b0d8f0',
      short: `Oath: no wolves · bow skills ${pc(K.h4_lone_bow)}% · Whiteout cd ×${K.h4_lone_cd}`,
      desc: () => L(`Oath of the Lone Peak — ไม่มีหมาป่า สกิลธนูแรง ${pc(K.h4_lone_bow)}% และ Whiteout คูลดาวน์ ×${K.h4_lone_cd} — นักล่าคนเดียวบนยอดเขา`,
        `Oath of the Lone Peak — no wolves; bow skills deal ${pc(K.h4_lone_bow)}% and Whiteout cools down ×${K.h4_lone_cd} — a lone hunter on the peak.`),
      mod: keepP('winter_pack') },
  ]);
  Runes.add('blizzard_volley', [
    { id: 'blizzard_volley.avalanche', name: 'Avalanche', c3w4: 'avalanche', intent: 'single', glyph: '▼', col: '#c0e8ff',
      short: `One crushing wave ×${K.h4_av_k} · ${K.h4_av_r}-cell core · 2 chill`,
      desc: () => L(`รวม 4 ระลอกเป็นระลอกเดียวกลางวง ${K.h4_av_r} ช่อง แรง ×${K.h4_av_k} ของระลอกปกติ ติดรอยหนาว 2 ชั้น`, `All 4 waves fall as one in a ${K.h4_av_r}-cell core at ×${K.h4_av_k} of a normal wave, applying 2 chill stacks.`) },
    { id: 'blizzard_volley.drift', name: 'Drift', c3w4: 'drift', intent: 'pack', glyph: '≈', col: '#e0f4ff',
      short: 'The storm follows the target · 4 waves over 4s',
      desc: () => L('พายุเคลื่อนตามเป้า 4 ระลอกใน 4 วินาที (เดิม 1.2 วินาที) — ฝูงที่วิ่งหนีไม่พ้น', 'The storm follows the target: 4 waves over 4s (normally 1.2s) — a fleeing pack cannot escape it.') },
  ]);
  Runes.add('gungnirs_truth', [
    { id: 'gungnirs_truth.patience', name: 'Of Patience', oath: 'patience', intent: 'single', glyph: 'ᛁ', col: '#f0e090',
      short: `Oath: Spear-Shot charges ${K.d4_pat_cast / 1000}s · ×${K.d4_pat_k}`,
      desc: () => L(`Oath of Patience — Spear-Shot ชาร์จ ${K.d4_pat_cast / 1000} วินาที แรง ×${K.d4_pat_k} — หายใจออกให้สุดก่อนปล่อย`, `Oath of Patience — Spear-Shot charges for ${K.d4_pat_cast / 1000}s at ×${K.d4_pat_k} — breathe all the way out before you release.`),
      mod: keepP('gungnirs_truth') },
    { id: 'gungnirs_truth.skirmisher', name: 'Of the Skirmisher', oath: 'skirmisher', intent: 'pack', glyph: 'ᚢ', col: '#c0d080',
      short: `Oath: Spear-Shot needs no charge · ${pc(K.d4_sk_k)}% · cd ${K.d4_sk_cd}s`,
      desc: () => L(`Oath of the Skirmisher — Spear-Shot ไม่ต้องชาร์จ ยิงขณะเดินได้ แต่แรง ${pc(K.d4_sk_k)}% คูลดาวน์ ${K.d4_sk_cd} วินาที`, `Oath of the Skirmisher — Spear-Shot needs no charge and fires on the move, at ${pc(K.d4_sk_k)}% with a ${K.d4_sk_cd}s cooldown.`),
      mod: keepP('gungnirs_truth') },
  ]);
  Runes.add('spear_shot', [
    { id: 'spear_shot.ricochet', name: 'Ricochet', c3w4: 'ricochet', intent: 'pack', glyph: '⤳', col: '#ffe070',
      short: `No pierce · bounces to ${K.d4_rico_n} more at ${pc(K.d4_rico_k)}%`,
      desc: () => L(`ไม่ทะลุแนว แต่กระดอนไปอีก ${K.d4_rico_n} ตัวใกล้สุด (ในระยะ ${K.d4_rico_r}) แรง ${pc(K.d4_rico_k)}%`, `No longer pierces; instead bounces to the ${K.d4_rico_n} nearest foes (within ${K.d4_rico_r}) at ${pc(K.d4_rico_k)}%.`) },
    { id: 'spear_shot.pin', name: 'Pin', c3w4: 'pin', intent: 'single', glyph: '⊥', col: '#d0c060',
      short: `No pierce · pins the target ${K.d4_pin}s`,
      desc: () => L(`ไม่ทะลุแนว ตรึงเป้า ${K.d4_pin} วินาที (บอส/ผู้เล่น: ช้า ${K.d4_pin_boss} วิ)`, `No longer pierces; pins the target for ${K.d4_pin}s (bosses/players: slowed ${K.d4_pin_boss}s).`) },
  ]);

  // ------------------------------------------------------------
  //  ไม้ตายตัวเลือกที่ 4
  // ------------------------------------------------------------
  if (typeof Feel !== 'undefined' && Feel.ULTS) {
    Feel.ULTS.fimbul = { job: 'huntmaster', name: 'FIMBULWINTER', th: L('ฤดูหนาวฟิมบูล', 'Fimbulwinter'),
      desc: L(`${K.h4_ult} วินาที: พายุหิมะรอบตัว ${K.h4_ult_r} ช่อง ศัตรูช้า 50% + ทุกลูกธนู/เขี้ยวติดรอยหนาว`, `${K.h4_ult}s: a blizzard within ${K.h4_ult_r} cells slows foes by 50% + every arrow and bite chills`),
      fire(p, col) { p.c3ult = { kind: 'fimbul', until: G.time + K.h4_ult }; p.c3fimbulAt = 0; addFloater(p.x, p.y - 2, 'FIMBULWINTER!', col || '#d8f4ff', true);
        if (!fast()) Runes.fx({ kind: 'zone', ref: p, x: p.x, y: p.y, r: K.h4_ult_r, dur: K.h4_ult, col: '210,240,255', style: 'ring' }); } };
    Feel.ULTS.never = { job: 'deadeye', name: 'NEVER-MISSING', th: L('ไม่เคยพลาด', 'Never-Missing'),
      desc: L(`${K.d4_ult} วินาที: ทุกลูกทะลุแนว + Spear-Shot ไม่ต้องชาร์จ`, `${K.d4_ult}s: every shot pierces + Spear-Shot needs no charge`),
      fire(p, col) { p.c3ult = { kind: 'never', until: G.time + K.d4_ult }; if (p.cds) p.cds.spear_shot = G.time; addFloater(p.x, p.y - 2, 'NEVER-MISSING!', col || '#e0f080', true); } };
  }

  // ------------------------------------------------------------
  //  เควสต์ทดสอบ (เงาแม่พิมพ์)
  // ------------------------------------------------------------
  const NB = s => (typeof B === 'function' ? B(s) : `<b>${s}</b>`);
  Object.assign(C.TRIAL, {
    huntmaster: { npc: 'sigrun', map: 'wolfwood', place: 'Wolfwood', who: 'Sigrún',
      thought: L('"ตามเสียงหอน"', '"Follow the howl."'),
      meet: L(`(Sigrún เงี่ยหูฟังทางเหนือ) ได้ยินไหม... หมาป่าตัวหนึ่งยังหอนเรียกนักล่าที่ไม่กลับมา มันไม่เคยทิ้งนาง ความคิดสุดท้ายของนางคือ ${NB('"ตามเสียงหอน"')}<br>(หิมะร่วงทั้งที่ไม่ใช่ฤดู — เงาถือธนูน้ำแข็งก้าวออกมาพร้อมหมาป่าสีขาว)`,
        `(Sigrún listens to the north) Do you hear it... a wolf still howling for a huntress who never came back. It never left her. Her last thought was ${NB('"Follow the howl."')}<br>(Snow falls out of season — a shadow with an ice bow steps out beside a white wolf)`) },
    deadeye: { npc: 'lopt', map: 'mistlake', place: 'Mistlake', who: 'Lopt',
      thought: L('"ข้อความต้องส่งให้ถึง"', '"The message must arrive."'),
      meet: L(`(Lopt ชี้ขึ้นฟ้าเหนือทะเลสาบ) ตรงนั้นแหละที่ Seraph Core เคยบิน มีนักธนูคนหนึ่งยิงข้อความถึง "ผู้ถือกุญแจราก" — ลูกนั้นยังไม่ตกถึงพื้น ความคิดที่ค้างอยู่คือ ${NB('"ข้อความต้องส่งให้ถึง"')}<br>(หมอกแยกออก — เงาถือธนูยาวเกินตัวเล็งมาจากอีกฝั่ง)`,
        `(Lopt points at the sky above the lake) That is where the Seraph Core used to fly. An archer once shot a message to "the one who holds the root-key" — it has yet to land. The thought still in flight is ${NB('"The message must arrive."')}<br>(The mist parts — a shadow with a bow taller than itself takes aim from the far shore)`) },
  });
  if (typeof C.install === 'function') C.install();

  // ------------------------------------------------------------
  //  บอท: กับดักเมื่อโดนประชิด • Rain/Blizzard เมื่อหลายตัว • Mark ก่อนยิงหนัก • Recoil เมื่อโดนประชิด
  // ------------------------------------------------------------
  if (typeof Bot !== 'undefined') {
    const pick0 = Bot.pickSkill;
    Bot.pickSkill = function (t, threats, hpPct, spPct) {
      const p = G.player, n = threats ? threats.length : 0;
      const close = (threats || []).some(m => !m.dead && U.dist(m.x, m.y, p.x, p.y) <= 2.2);
      if (isJob('huntmaster') && t) {
        if (close && lvOf('frost_snare') && this.canCast('frost_snare')) return 'frost_snare';
        if (n >= 2 && lvOf('blizzard_volley') && this.canCast('blizzard_volley')) return 'blizzard_volley';
        if (lvOf('pack_command') && G.allies.some(a => a.c3frost && !a.dead) && this.canCast('pack_command')) return 'pack_command';
      }
      if (isJob('deadeye') && t) {
        if (lvOf('mark_prey') && !(t.c3prey > G.time) && t.hp > t.maxHp * 0.4 && this.canCast('mark_prey')) return 'mark_prey';
        if (close && lvOf('recoil_shot') && this.canCast('recoil_shot')) return 'recoil_shot';
        if (n >= 2 && lvOf('rain_of_spears') && this.canCast('rain_of_spears')) return 'rain_of_spears';
      }
      return pick0.apply(this, arguments);
    };
  }

  // ------------------------------------------------------------
  //  ภาพ: ย้อมจาก Class 2 จนกว่าจะมีภาพจริง (prompt docs/CLASS3_ART.md)
  // ------------------------------------------------------------
  if (typeof Art !== 'undefined') {
    const ART = { huntmaster: ['skadi', { hue: 20, sat: 0.6, bri: 1.18, tint: ['#e8f6ff', 0.26] }], deadeye: ['ullr', { hue: -10, sat: 1.05, bri: 0.9, tint: ['#7a7030', 0.2] }] };
    for (const [id, [base, spec]] of Object.entries(ART)) {
      for (const g of ['f', 'm']) Art.alias(`job_${id}_${g}`, `job_${base}_${g}`, Object.assign({ flip: true }, spec));
      Art.alias(`emblem_${id}`, `emblem_${base}`, spec);
    }
    const SRC = {
      huntmaster: [['winter_pack', 'wolf_companion', 190], ['blizzard_volley', 'arrow_storm', 170], ['pack_command', 'winter_hunt', -20], ['glacier_arrow', 'frost_arrow', 20], ['fimbul_whiteout', 'winter_hunt', 30], ['frost_snare', 'blast_trap', 180]],
      deadeye: [['gungnirs_truth', 'ullr_focus', 20], ['spear_shot', 'snipe', -15], ['mark_prey', 'skadis_mark', 260], ['recoil_shot', 'charge_arrow', 40], ['rain_of_spears', 'arrow_storm', 20], ['steady_breath', 'wind_walk', 30]],
    };
    for (const job in SRC) SRC[job].forEach(([id, from, hue], i) => Art.alias('skill_' + id, 'skill_' + from, { hue, sat: 1.15, bri: i % 2 ? 1.0 : 1.06, flip: i % 2 === 0, tint: [JOBS[job].glow, 0.14] }));
  }
  if (typeof CLASSBOOK !== 'undefined') Object.assign(CLASSBOOK, {
    huntmaster: { diff: 2, weapon: L('ธนูโค้งใหญ่ผลึกน้ำแข็ง', 'Great ice-crystal bow'), stats: [['dex', 55], ['agi', 30], ['vit', 15]],
      build: [['winter_pack', 5], ['blizzard_volley', 5], ['glacier_arrow', 5], ['pack_command', 5], ['frost_snare', 4], ['fimbul_whiteout', 1]],
      play: L('เรียก Wolf Companion ได้หมาป่าน้ำแข็ง 2 ตัว • Blizzard Volley ใส่ฝูงจนแข็ง แล้ว Glacier Arrow ตัวที่แข็งให้แตก • โดนประชิด วาง Frost Snare',
        'Call Wolf Companion for 2 frost wolves • Blizzard Volley the pack until it freezes, then Glacier Arrow the frozen ones to shatter them • when rushed, drop a Frost Snare.'),
      pros: L('คุมฝูงเก่ง มีหมาป่าช่วยรับ', 'Great pack control, wolves soak hits'), cons: L('ต้องรอรอยหนาวครบถึงจะแรงสุด', 'Peaks only once the chill stacks up'),
      tips: L('Oath of the Pack = หมา 3 ตัว เล่นฝูง • Oath of the Lone Peak = ไม่มีหมา ธนูแรง เล่นบอส', 'Oath of the Pack for 3 wolves and packs • Oath of the Lone Peak for no wolves, harder arrows, bosses.') },
    deadeye: { diff: 3, weapon: L('ธนูยาวเกินตัว ปลายหุ้มเหล็กรูปหอก', 'Longbow taller than its archer, spear-tipped'), stats: [['dex', 60], ['luk', 25], ['agi', 15]],
      build: [['gungnirs_truth', 5], ['spear_shot', 5], ['mark_prey', 5], ['rain_of_spears', 5], ['recoil_shot', 4], ['steady_breath', 1]],
      play: L('Mark Prey เป้าใหญ่ก่อน • ยืนห่าง ≥6 ช่องแล้วชาร์จ Spear-Shot (ไม่พลาด) • โดนประชิด Recoil Shot ถอยแล้วชาร์จต่อ • ฝูงใช้ Rain of Spears',
        'Mark Prey the big one first • stand 6+ cells away and charge Spear-Shot (never misses) • when rushed, Recoil Shot back and charge again • Rain of Spears for packs.'),
      pros: L('ดาเมจเป้าเดี่ยวสูงสุด ไม่พลาด', 'Highest single-target damage, never misses'), cons: L('ต้องยืนนิ่ง คุมระยะ', 'Must stand still and keep distance'),
      tips: L('Oath of Patience = บอส ช็อตหนัก • Oath of the Skirmisher = ฟาร์ม เดินไปยิงไป', 'Oath of Patience for bosses and heavy shots • Oath of the Skirmisher for farming on the move.') },
  });
})();
