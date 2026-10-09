'use strict';
// ============================================================
//  Class 3 รอบ 2 (2026-10-09): Niflheim Hexer (← Seidr Witch) + Ymir Worldbreaker (← Jotun Breaker)
//  ตามแบบ docs/CLASS3_DESIGN.md §3.4 / §3.12 — ครบสายของตัวนำร่อง (Runelord/Seidr = สาย Runecaster • Packlord/Jotun = สาย Berserker)
//  ใช้โครงเดียวกับ js/class3_data.js + js/class3.js (Mimir/เงาแม่พิมพ์/Oath/ULT/บอท/Class Book) — ไฟล์นี้โหลดต่อจาก js/class3.js
//  ทำให้ง่ายลงจากแบบ (บันทึกไว้): Worldsplitter "กดค้างชาร์จ" → ร่าย 0.9 วิคงที่ (ไม้ตาย = ชาร์จเต็มทันที ×1.5)
// ============================================================
(() => {
  if (typeof Class3 === 'undefined') return;
  const C = Class3;
  const K = Object.assign(C.K, {
    // Hexer — คำสาป (Plague Hex)
    hx_tick: lv => 0.35 + 0.07 * lv, hx_dur: 8, hx_jump: 2, hx_jump_r: 4, hx_hit: lv => 0.5 + 0.1 * lv,
    hx_crit: 1.5,                                   // Mist of Nifl: คำสาปคริได้ ×1.5
    hx_sp: 0.02,                                    // Half-Mask Siphon: SP คืน 2% ต่อชั้นคำสาปบนเป้า
    hx_wither_k: 1.15,                              // Wither Field: เวทใส่ตัวในหมอกแรงขึ้น (แทน MDEF −)
    hx_harvest: 1.2, hx_harvest_r: 9,
    hx_rot_max: 3,                                  // Oath of Rot: ไม่กระโดด ซ้อน 3 ชั้น
    hx_release: 0.03, hx_release_cap: 0.3,          // Oath of Release: Harvest คืน HP 3% ต่อคำสาป (สูงสุด 30%)
    hx_contagion: 0.6, hx_doom: 1.6,                // รูน Plague Hex: Contagion ลามทันทีแรง 60% / Single Doom ไม่ลาม ×1.6
    ult_gate: 10, ult_gate_k: 1.5,
    // Worldbreaker
    yb_fury: 0.3, yb_cap: 0.4,                      // Ymir's Bones: 30% ของ HP ที่จ่ายเป็นค่าสกิล → สกิลถัดไปแรงขึ้น (สูงสุด +40%)
    ws_charge: 900,                                 // Worldsplitter ร่าย (ชาร์จ) 0.9 วิ (เดิม 1.2 — ตีเดี่ยวช้ากว่า Jotun)
    om_cd: 1.5, ob_hp: 1.5, ob_k: 1.05,             // Oath of the Mountain: ไม่เสีย HP คูลดาวน์ ×1.5 / of Blood: ค่า HP ×1.5 แรง ×1.05 (เดิม ×2 / ×1.15 = +15%/+12% • ×1.5/×1.1 ยังเฉลี่ย +8% — tests/runes_c3.js)
    qr_k: 0.6, qr_r: 3, fl_k: 0.3, fl_dur: 4, fl_r: 1.5, // รูน Worldsplitter: Quake Ring / Fault Line
    hide_hp: 0.5,                                   // Frost Hide: HP ค่าสกิล −50%
    ult_ymir: 10, ult_ymir_k: 1.5,
  });
  const P = () => G.player;
  const fast = () => !!G.fastSim;
  const lvOf = id => (G.player && G.player.skills[id]) || 0;
  const say = (o, t, c, big) => { if (!fast()) addFloater(o.x, o.y - 1.6, t, c, big); };
  const chosen = sk => typeof Runes !== 'undefined' && Runes.chosen(sk);
  const oath = sk => { const r = chosen(sk); return r ? r.oath || null : null; };
  const rune = sk => { const r = chosen(sk); return r ? r.c3w2 || null : null; };
  const isJob = j => !!G.player && G.player.job === j;

  // ------------------------------------------------------------
  //  ข้อมูล Class + สกิล
  // ------------------------------------------------------------
  Object.assign(THIRD_JOBS, { seidr: 'hexer', jotun: 'worldbreaker' });
  Object.assign(JOBS, {
    hexer: { glow: '#a070ff', name: 'Niflheim Hexer', thai: L('ผู้สาปแห่งนิฟล์ไฮม์', 'Curse-Bearer of Niflheim'), parent: 'seidr', tier: 3,
      bonus: { atkPct: 15, matkPct: 15, hit: 15, hpPct: 15 }, hp: 1.05, sp: 2.35, jobMax: 60, aspd: 1450,
      outfit: '#2a1840', outfit2: '#4a6a50', pants: '#160c22', robe: true, jobHat: 'runehood',
      stats: 'INT / DEX', role: L('จอมสาปคุมฝูง คำสาปลามจากตัวสู่ตัว', 'Crowd Curser — Curses That Spread'),
      desc: L('ผู้เดินตามความคิดสุดท้ายของแม่มดที่ถือตะเกียงครึ่งดับ สาปแล้วปล่อยให้คำสาปทำงานเอง ลามจากตัวที่ล้มไปตัวถัดไป แล้วเก็บเกี่ยวทีเดียว — สาปเพื่อปล่อย ไม่ใช่ความชั่ว',
        'One who followed the last thought of the witch with the half-lit lantern. She curses, lets the curse work on its own, leaping from each fallen foe to the next — then harvests it all at once. A curse to release, not to harm.'),
      skills: ['mist_of_nifl', 'plague_hex', 'half_mask_siphon', 'wither_field', 'grave_bind', 'harvest'] },
    worldbreaker: { glow: '#8fd0ff', name: 'Ymir Worldbreaker', thai: L('ผู้ทลายพิภพแห่งยมีร์', 'Worldbreaker of Ymir'), parent: 'jotun', tier: 3,
      bonus: { atkPct: 15, matkPct: 15, hit: 15, hpPct: 15 }, hp: 1.85, sp: 0.8, jobMax: 60, aspd: 1300,
      outfit: '#5a6470', outfit2: '#6a4a30', pants: '#2c2620', cape: '#3a4a5a', jobHat: 'wolfpelt',
      stats: 'STR / VIT', role: L('ช็อตชาร์จหนักที่สุดในเกม ทุบเป็นแนว/วงกว้าง', 'The Heaviest Charged Blows — Lines and Rings'),
      desc: L('ผู้ตอบความคิดสุดท้ายของยักษ์ที่ร่างกายกลายเป็นพิภพ ยิ่งจ่ายเลือดเป็นค่าสกิลยิ่งสะสมแรง แล้วชาร์จทุบแนวยาวจนพื้นแตก',
        'One who answered the last thought of the giant whose body became the world. The more blood you pay for skills, the more force you store — then charge and split the ground in a long line.'),
      skills: ['ymirs_bones', 'worldsplitter', 'glacier_fall', 'giants_grip', 'frost_hide', 'tremor_step'] },
  });
  Object.assign(SKILLS, {
    // ===== Niflheim Hexer =====
    mist_of_nifl: { name: 'Mist of Nifl', max: 5, type: 'passive', icon: '#9a70ff', glyph: 'ᚾ',
      passive: lv => ({ matkPct: 2 * lv }), c3w2mist: lv => 0.06 * lv,
      desc: L('หมอกนิฟล์ MATK +2%×Lv • คำสาปของเรานานขึ้น 6%×Lv และติดคริติคอลได้ (×1.5 ตามโอกาสคริของเรา)',
        'Mist of Nifl. MATK +2%×Lv • your curses last 6%×Lv longer and can critically strike (×1.5 at your crit chance).') },
    plague_hex: { name: 'Plague Hex', max: 5, type: 'active', target: 'enemy', range: 9, icon: '#b070ff', glyph: '☠', req: { mist_of_nifl: 1 },
      sp: lv => 22 + 3 * lv, cast: () => 700, delay: 700, cd: 3, fx: 'dark', c3w2hex: true,
      dmg: { type: 'magic', element: 'shadow', mult: lv => K.hx_hit(lv), area: 2.5, at: 'target' },
      desc: L('สาปรัศมี 2.5 ช่อง ดาเมจทันที 60~100% + คำสาป 8 วิ ดาเมจมืดทุกวินาที 42~70% • ตัวที่ติดสาปล้ม → คำสาปกระโดดไป 2 ตัวใกล้สุด (4 ช่อง)',
        'Curse a 2.5-cell area: 60~100% at once + an 8s curse dealing 42~70% shadow damage every second • when a cursed foe falls, the curse leaps to the 2 nearest (4 cells).') },
    half_mask_siphon: { name: 'Half-Mask Siphon', max: 5, type: 'active', target: 'enemy', range: 9, icon: '#d090ff', glyph: '◐', req: { plague_hex: 1 },
      sp: lv => 20 + 3 * lv, cast: () => 900, delay: 700, cd: 5, fx: 'dark', c3w2siphon: true,
      dmg: { type: 'magic', element: 'shadow', mult: lv => 3.6 + 0.65 * lv },
      desc: L('ดูดผ่านหน้ากากครึ่งซีก 425~685% ธาตุมืด • ได้ SP คืน 2% ต่อชั้นคำสาปบนเป้า',
        'Siphon through the half mask for 425~685% shadow damage • restores 2% SP per curse stack on the target.') },
    wither_field: { name: 'Wither Field', max: 5, type: 'active', target: 'enemy', range: 9, icon: '#7a9a70', glyph: '≈', req: { plague_hex: 2 },
      sp: lv => 24 + 2 * lv, cast: () => 500, delay: 600, cd: 10, special: 'c3w2_wither', c3w2wither: { r: 3, dur: () => 6 },
      desc: L('หมอกเหี่ยวรัศมี 3 ช่อง 6 วินาที ศัตรูในหมอกช้า และโดนเวทของเราแรงขึ้น 15%',
        'A withering fog (3 cells, 6s): enemies inside are slowed and take 15% more from your spells.') },
    grave_bind: { name: 'Grave Bind', max: 5, type: 'active', target: 'enemy', range: 8, icon: '#6050a0', glyph: '⛓', req: { half_mask_siphon: 1 },
      sp: () => 18, cast: () => 400, delay: 600, cd: 9, fx: 'dark',
      dmg: { type: 'magic', element: 'shadow', mult: lv => 1.6 + 0.3 * lv, status: { kind: 'stun', chance: () => 100, dur: () => 2 } },
      desc: L('โซ่เงาตรึง 190~310% และตรึง 2 วินาที (บอส/ผู้เล่น: ตรึงไม่ได้ — ได้แค่ดาเมจ)',
        'Shadow chains for 190~310% that bind for 2s (bosses/players: damage only).') },
    harvest: { name: 'Harvest', max: 5, type: 'active', target: 'self', icon: '#e0a0ff', glyph: '⚘', req: { plague_hex: 3 },
      sp: lv => 30 + 3 * lv, delay: 900, cd: 14, selfFx: 'buff', special: 'c3w2_harvest',
      desc: L('เก็บเกี่ยวคำสาปทั้งหมดรอบ 9 ช่อง: ดาเมจที่เหลือของคำสาปเข้าทันที ×1.2 แล้วคำสาปหายไป',
        'Harvest every curse within 9 cells: the curse\'s remaining damage lands at once ×1.2, then the curse ends.') },
    // ===== Ymir Worldbreaker =====
    ymirs_bones: { name: "Ymir's Bones", max: 5, type: 'passive', icon: '#a0c8e0', glyph: 'ᛃ',
      passive: lv => ({ hpPct: 2 * lv, str: lv, atkPct: lv }),
      desc: L('กระดูกยมีร์ MaxHP +2%×Lv STR +Lv ATK +1%×Lv • 30% ของ HP ที่จ่ายเป็นค่าสกิลสะสมเป็นแรง → สกิลโจมตีถัดไปแรงขึ้น (สูงสุด +40%)',
        "Ymir's Bones. MaxHP +2%×Lv, STR +Lv, ATK +1%×Lv • 30% of the HP you pay for skills is stored as force → your next attack skill hits harder (up to +40%).") },
    worldsplitter: { name: 'Worldsplitter', max: 5, type: 'active', target: 'enemy', melee: false, range: 6, icon: '#80c0ff', glyph: '⟰', req: { ymirs_bones: 1 },
      sp: () => 14, hpCost: () => 10, cast: () => K.ws_charge, delay: 900, cd: 9, fx: 'quake', vfx: 'earth', c3w2split: true,
      dmg: { type: 'phys', element: 'earth', mult: lv => 3.6 + 0.7 * lv, line: true },
      desc: L('ชาร์จ 0.9 วินาที แล้วทุบแนว 6 ช่อง 430~710% ธาตุดิน เสีย HP 10%',
        'Charge for 0.9s, then split the ground in a 6-cell line for 430~710% Earth. Costs 10% HP.') },
    glacier_fall: { name: 'Glacier Fall', max: 5, type: 'active', target: 'enemy', range: 6, icon: '#a0e0ff', glyph: '❄', req: { worldsplitter: 1 },
      sp: () => 16, hpCost: () => 6, delay: 900, cd: 7, fx: 'quake',
      dmg: { type: 'phys', element: 'water', mult: lv => 2.2 + 0.4 * lv, area: 3, at: 'target', status: { kind: 'stun', chance: () => 25, dur: () => 1 } },
      desc: L('ทุบวงน้ำแข็ง 3 ช่อง 260~420% ธาตุน้ำ โอกาส 25% แช่แข็ง 1 วินาที เสีย HP 6%',
        'Smash a 3-cell ring of ice for 260~420% Water with a 25% chance to freeze for 1s. Costs 6% HP.') },
    giants_grip: { name: "Giant's Grip", max: 5, type: 'active', target: 'enemy', melee: true, icon: '#c0a080', glyph: '✊', req: { ymirs_bones: 2 },
      sp: () => 12, hpCost: () => 5, delay: 800, cd: 8, fx: 'bash', chain: true,
      dmg: { type: 'phys', mult: lv => 3.3 + 0.6 * lv, sureHit: true, status: { kind: 'stun', chance: () => 100, dur: () => 2 } }, // จับทุ่ม = ไม่พลาด
      desc: L('จับทุ่ม 390~630% (ไม่พลาด) มึน 2 วินาที (บอส/ผู้เล่น: ได้แค่ดาเมจ) เสีย HP 5%',
        'Grab and slam for 390~630% (never misses) and stun for 2s (bosses/players: damage only). Costs 5% HP.') },
    frost_hide: { name: 'Frost Hide', max: 5, type: 'active', target: 'self', icon: '#c0f0ff', glyph: '⛉', req: { glacier_fall: 2 },
      sp: () => 20, delay: 600, cd: 25, selfFx: 'buff', c3w2hide: true,
      buff: { dur: () => 15, stats: lv => ({ def: 2 * lv, mdef: lv }) },
      desc: L('หนังน้ำแข็ง 15 วินาที DEF +2×Lv MDEF +Lv และ HP ที่จ่ายเป็นค่าสกิลลดครึ่ง',
        'Frost hide for 15s: DEF +2×Lv, MDEF +Lv, and skills cost half the HP.') },
    tremor_step: { name: 'Tremor Step', max: 5, type: 'active', target: 'enemy', range: 5, icon: '#d0b090', glyph: '⤒', req: { giants_grip: 1 },
      sp: () => 14, hpCost: () => 4, delay: 700, cd: 7, fx: 'quake', c3w2leap: true,
      dmg: { type: 'phys', mult: lv => 1.5 + 0.3 * lv, area: 2, at: 'self' },
      desc: L('กระโดดเข้าหาเป้า (ไม่เกิน 5 ช่อง) กระแทกรอบตัว 2 ช่อง 180~300% เสีย HP 4%',
        'Leap at the target (up to 5 cells) and slam everything within 2 cells for 180~300%. Costs 4% HP.') },
  });
  const NEW = ['mist_of_nifl', 'plague_hex', 'half_mask_siphon', 'wither_field', 'grave_bind', 'harvest', 'ymirs_bones', 'worldsplitter', 'glacier_fall', 'giants_grip', 'frost_hide', 'tremor_step'];
  for (const id of NEW) SKILLS[id].id = id;

  // ------------------------------------------------------------
  //  คำสาป (Hexer)
  // ------------------------------------------------------------
  const curseDur = () => K.hx_dur * (1 + (SKILLS.mist_of_nifl.c3w2mist(lvOf('mist_of_nifl')) || 0));
  const gateOn = () => C.ultOn('gate');
  // ใส่คำสาปบนมอน: k = ตัวคูณแรงต่อวิ (Contagion 0.6 / Single Doom 1.6) • Oath of Rot ซ้อนได้ 3 ชั้น
  C.curse = (m, lv, k = 1) => {
    if (!m || m.dead || m.isPlayer || !m.def) return;
    const r = magicHit(m, K.hx_tick(lv) * k, 'shadow'), per = Math.max(1, r.dmg || 1);
    const rot = oath('mist_of_nifl') === 'rot', c = m.c3hex;
    if (c && c.until > G.time) { c.until = G.time + curseDur(); c.per = Math.max(c.per, per); if (rot) c.stacks = Math.min(K.hx_rot_max, c.stacks + 1); return; }
    m.c3hex = { until: G.time + curseDur(), next: G.time + 1, per, lv, stacks: 1, k };
    say(m, 'HEXED', '#c090ff');
  };
  C.curseJump = (m, k = 1) => {
    if (oath('mist_of_nifl') === 'rot' || rune('plague_hex') === 'doom') return;
    const lv = (m.c3hex && m.c3hex.lv) || Math.max(1, lvOf('plague_hex'));
    G.mobs.filter(o => o !== m && !o.dead && !o.isPlayer && U.dist(o.x, o.y, m.x, m.y) <= K.hx_jump_r && !(o.c3hex && o.c3hex.until > G.time))
      .sort((a, b) => U.dist(a.x, a.y, m.x, m.y) - U.dist(b.x, b.y, m.x, m.y)).slice(0, K.hx_jump)
      .forEach(o => { C.curse(o, lv, k); if (!fast()) Runes.fly(m.x, m.y, o, 0.25, '170,120,255', () => {}, { size: 8 }); });
  };
  C.curseTick = () => {
    const p = P(); if (!p || !G.mobs) return;
    for (const m of G.mobs) {
      const c = m.c3hex; if (!c || m.dead) continue;
      if (c.until <= G.time) { m.c3hex = null; continue; }
      if (G.time < c.next) continue;
      c.next += 1;
      let amt = c.per * c.stacks * (gateOn() ? K.ult_gate_k : 1);
      if (lvOf('mist_of_nifl') && U.chance(Math.min(1, (p.d.crit || 0) / 100))) amt *= K.hx_crit;
      damageMob(m, Math.max(1, Math.round(amt)), { src: 'plague_hex', dot: true, color: '#b080ff' });
    }
  };
  C.harvest = (s, lv) => {
    const p = P(); let n = 0;
    for (const m of G.mobs.filter(o => !o.dead && o.c3hex && o.c3hex.until > G.time && U.dist(o.x, o.y, p.x, p.y) <= K.hx_harvest_r)) {
      const c = m.c3hex, left = Math.max(1, Math.ceil(c.until - G.time)), amt = Math.round(c.per * c.stacks * left * K.hx_harvest);
      m.c3hex = null; n++;
      damageMob(m, amt, { src: 'harvest', color: '#e0a0ff' });
      if (!fast()) Runes.fly(m.x, m.y, p, 0.3, '224,160,255', () => {}, { size: 7 });
    }
    if (n && oath('mist_of_nifl') === 'release') { healPlayer(Math.round(p.d.maxHp * Math.min(K.hx_release_cap, K.hx_release * n)), 'Release'); }
    say(p, n ? `HARVEST ×${n}` : 'Harvest', '#e0a0ff', n > 2);
  };
  C.wither = (s, lv, at) => {
    const p = P(), o = at || C.tgt || p, w = s.c3w2wither;
    Runes.zone({ skill: s.id, x: o.x, y: o.y, r: w.r, until: G.time + w.dur(lv), every: 0.5, first: 0.05, rgb: '120,160,110', c3wither: true,
      tick: (z, ms) => { for (const m of ms) { m.slowUntil = Math.max(m.slowUntil || 0, G.time + 0.6); m.c3wither = G.time + 0.6; } } });
  };

  // ------------------------------------------------------------
  //  Ymir's Bones / ค่า HP / ไม้ตาย (Worldbreaker)
  // ------------------------------------------------------------
  const hpScale = () => {
    const p = P(); if (!p || !p.skills.ymirs_bones && p.job !== 'worldbreaker') return 1;
    if (C.ultOn('ymir')) return 0;
    let k = 1;
    if (p.buffs.frost_hide && p.buffs.frost_hide.until > G.time) k *= K.hide_hp;
    const o = oath('ymirs_bones'); if (o === 'mountain') k = 0; else if (o === 'blood') k *= K.ob_hp;
    return k;
  };
  if (typeof skillDef === 'function' && !skillDef._c3w2) {
    const f0 = skillDef;
    skillDef = function (id) { // eslint-disable-line no-global-assign
      const s = f0.apply(this, arguments);
      if (!s || !isJob('worldbreaker')) return s;
      const hk = s.hpCost ? hpScale() : 1, ult = C.ultOn('ymir') && s.c3w2split, mtn = oath('ymirs_bones') === 'mountain' && s.hpCost && s.cd;
      if (hk === 1 && !ult && !mtn) return s;
      const d = Object.create(s);
      if (s.hpCost && hk !== 1) { const h0 = s.hpCost; d.hpCost = lv => h0(lv) * hk; }
      if (ult) d.cast = () => 0;
      if (mtn) d.cd = s.cd * K.om_cd;
      return d;
    };
    skillDef._c3w2 = true;
  }
  if (typeof executeSkill === 'function' && !executeSkill._c3w2) {
    const f0 = executeSkill;
    executeSkill = function (id) { // eslint-disable-line no-global-assign
      const p = G.player, hp0 = p && p.hp;
      const r = f0.apply(this, arguments);
      if (p && isJob('worldbreaker') && lvOf('ymirs_bones') && SKILLS[id] && SKILLS[id].hpCost && p.hp < hp0) {
        p.c3bones = Math.min(p.d.maxHp * K.yb_cap / 2, (p.c3bones || 0) + (hp0 - p.hp) * K.yb_fury);
      }
      return r;
    };
    executeSkill._c3w2 = true;
  }

  // ------------------------------------------------------------
  //  จุดเกาะ Runes (ห่อต่อจาก js/class3.js)
  // ------------------------------------------------------------
  const RU = Runes;
  { const f0 = RU.preCast;
    RU.preCast = function (s, lv, tgt) {
      const p = P();
      if (p && s && s.dmg && p.c3bones > 0 && isJob('worldbreaker')) { // แรงที่สะสม → สกิลโจมตีลูกนี้
        p.c3boneCast = { id: s.id, k: 1 + Math.min(K.yb_cap, p.c3bones / Math.max(1, p.d.maxHp) * 2), until: G.time + 2 };
        p.c3bones = 0;
      }
      return f0.apply(this, arguments);
    }; }
  { const f0 = RU.onCast;
    RU.onCast = function (s, lv, tgt) {
      if (s.c3w2leap && tgt && !tgt.dead) { // Tremor Step: กระโดดไปข้างเป้า แล้วกระแทกรอบตัว (ดาเมจ at:'self' ของเดิม)
        const p = P(), dx = tgt.x - p.x, dy = tgt.y - p.y, d = Math.hypot(dx, dy) || 1, go = Math.max(0, Math.min(5, d - 0.9));
        const nx = p.x + dx / d * go, ny = p.y + dy / d * go;
        if (G.map.walkable(Math.floor(nx), Math.floor(ny))) { p.x = nx; p.y = ny; p.path = []; }
        if (!fast()) addFx({ type: 'ring', x: p.x, y: p.y, dur: 0.5, r: 2, color: '200,170,130' });
      }
      return f0.apply(this, arguments);
    }; }
  { const f0 = RU.hitMul;
    RU.hitMul = function (s, lv, m) {
      let k = f0.apply(this, arguments);
      const p = P(); if (!p) return k;
      if (s.dmg && s.dmg.type === 'magic' && m.c3wither > G.time) k *= K.hx_wither_k;
      const bc = p.c3boneCast; if (bc && bc.id === s.id && bc.until > G.time) k *= bc.k;
      if (isJob('worldbreaker') && oath('ymirs_bones') === 'blood' && s.hpCost) k *= K.ob_k;
      if (s.c3w2split && C.ultOn('ymir')) k *= K.ult_ymir_k;
      return k;
    }; }
  { const f0 = RU.afterHit;
    RU.afterHit = function (s, lv, m, r) {
      f0.apply(this, arguments);
      if (!r || r.miss || !m || m.dead) return;
      const p = P();
      if (s.c3w2hex) {
        const rn = rune('plague_hex');
        C.curse(m, lv, rn === 'doom' ? K.hx_doom : 1);
        if (rn === 'contagion') C.curseJump(m, K.hx_contagion);
      } else if (gateOn() && s.dmg && !(m.c3hex && m.c3hex.until > G.time)) C.curse(m, Math.max(1, lvOf('plague_hex')));
      if (s.c3w2siphon && m.c3hex && m.c3hex.until > G.time) p.sp = Math.min(p.d.maxSp, p.sp + Math.round(p.d.maxSp * K.hx_sp * m.c3hex.stacks));
      if (s.c3w2split && rune('worldsplitter') === 'fault' && !p.c3fault) { // Fault Line: พื้นแตกที่เป้าแรก 4 วิ
        p.c3fault = true; later(0.05, () => { p.c3fault = false; });
        Runes.zone({ skill: s.id, x: m.x, y: m.y, r: K.fl_r, until: G.time + K.fl_dur, every: 1, first: 0.5, rgb: '140,200,255',
          tick: (z, ms) => { for (const o of ms) { const h = physHit(o, s.dmg.mult(lv) * K.fl_k, { skill: true, element: 'earth' }); applyHit(o, h, { src: s.id, color: '#90d0ff' }); } } });
      }
    }; }
  { const f0 = RU.onKill;
    RU.onKill = function (m) {
      f0.apply(this, arguments);
      if (m && m.c3hex && m.c3hex.until > G.time) C.curseJump(m, m.c3hex.k || 1);
    }; }
  { const f0 = RU.update; RU.update = function () { f0.apply(this, arguments); C.curseTick(); }; }
  if (typeof runSpecialSkill === 'function' && !runSpecialSkill._c3w2) {
    const f0 = runSpecialSkill;
    runSpecialSkill = function (kind, s, lv) { // eslint-disable-line no-global-assign
      if (kind === 'c3w2_wither') return void C.wither(s, lv, C.tgt);
      if (kind === 'c3w2_harvest') return void C.harvest(s, lv);
      return f0.apply(this, arguments);
    };
    runSpecialSkill._c3w2 = true;
  }

  // ------------------------------------------------------------
  //  Oath (สกิลติดตัว) + รูนสกิลประจำตัว ★
  // ------------------------------------------------------------
  const pc = v => Math.round(v * 100);
  const keepP = id => () => ({ passive: SKILLS[id].passive });
  Runes.add('mist_of_nifl', [
    { id: 'mist_of_nifl.rot', name: 'Of Rot', oath: 'rot', intent: 'single', glyph: 'ᚱ', col: '#90a060',
      short: `Oath: curses don't leap · stack ×${K.hx_rot_max}`,
      desc: () => L(`Oath of Rot — คำสาปไม่กระโดดไปตัวอื่น แต่สาปซ้ำตัวเดิมซ้อนได้ ${K.hx_rot_max} ชั้น (สายบอส)`, `Oath of Rot — curses no longer leap, but re-cursing the same foe stacks up to ${K.hx_rot_max} times (for bosses).`),
      mod: keepP('mist_of_nifl') },
    { id: 'mist_of_nifl.release', name: 'Of Release', oath: 'release', intent: 'pack', glyph: 'ᛚ', col: '#ffd0f0',
      short: `Oath: Harvest heals ${pc(K.hx_release)}% per curse`,
      desc: () => L(`Oath of Release — Harvest คืน HP ${pc(K.hx_release)}% ต่อคำสาปที่เก็บเกี่ยว (สูงสุด ${pc(K.hx_release_cap)}%) — สาปเพื่อปล่อยประกายแบบ Hel`, `Oath of Release — Harvest restores ${pc(K.hx_release)}% HP per curse reaped (up to ${pc(K.hx_release_cap)}%) — curse to release, as Hel does.`),
      mod: keepP('mist_of_nifl') },
  ]);
  Runes.add('plague_hex', [
    { id: 'plague_hex.contagion', name: 'Contagion', c3w2: 'contagion', intent: 'pack', glyph: '✣', col: '#c0a0ff',
      short: `Spreads on contact at ${pc(K.hx_contagion)}%`,
      desc: () => L(`คำสาปลามไป 2 ตัวใกล้ทันทีที่ติด (ไม่ต้องรอตาย) แต่ตัวที่ติดจากการลามแรง ${pc(K.hx_contagion)}%`, `The curse leaps to the 2 nearest foes the moment it lands (no need to wait for a death), but spread curses deal ${pc(K.hx_contagion)}%.`) },
    { id: 'plague_hex.doom', name: 'Single Doom', c3w2: 'doom', intent: 'single', glyph: '☗', col: '#ff80c0',
      short: `No spread · curse ×${K.hx_doom}`,
      desc: () => L(`คำสาปไม่ลามเลย แต่แรงต่อวินาที ×${K.hx_doom} บนเป้าเดียว`, `The curse never spreads, but deals ×${K.hx_doom} per second on its one target.`) },
  ]);
  Runes.add('ymirs_bones', [
    { id: 'ymirs_bones.mountain', name: 'Of the Mountain', oath: 'mountain', intent: 'single', glyph: '⛰', col: '#a0b0c0',
      short: `Oath: no HP cost · cooldowns ×${K.om_cd}`,
      desc: () => L(`Oath of the Mountain — สกิลไม่เสีย HP แต่คูลดาวน์นานขึ้น ×${K.om_cd} (ไม่สะสมแรงจากกระดูก)`, `Oath of the Mountain — skills cost no HP, but cooldowns are ×${K.om_cd} (no force from the bones).`),
      mod: keepP('ymirs_bones') },
    { id: 'ymirs_bones.blood', name: 'Of Blood', oath: 'blood', intent: 'pack', glyph: '🩸', col: '#ff6060',
      short: `Oath: HP costs ×${K.ob_hp} · those skills ×${K.ob_k}`,
      desc: () => L(`Oath of Blood — ค่า HP ของสกิล ×${K.ob_hp} แต่สกิลที่จ่ายด้วย HP แรงขึ้น ×${K.ob_k} (และสะสมแรงได้มากขึ้น)`, `Oath of Blood — HP costs ×${K.ob_hp}, but HP-cost skills hit ×${K.ob_k} (and store more force).`),
      mod: keepP('ymirs_bones') },
  ]);
  Runes.add('worldsplitter', [
    { id: 'worldsplitter.quake_ring', name: 'Quake Ring', intent: 'pack', glyph: '◎', col: '#a0d0ff',
      short: `Ring around you ${K.qr_r} cells, ${pc(K.qr_k)}%`,
      desc: () => L(`เปลี่ยนจากแนวเป็นวงรอบตัว ${K.qr_r} ช่อง แรง ${pc(K.qr_k)}%`, `Turns the line into a ${K.qr_r}-cell ring around you at ${pc(K.qr_k)}%.`),
      mod: base => ({ dmg: { line: false, area: K.qr_r, at: 'self', mult: lv => base.dmg.mult(lv) * K.qr_k } }) },
    { id: 'worldsplitter.fault_line', name: 'Fault Line', c3w2: 'fault', intent: 'both', glyph: '⚡', col: '#80c0ff',
      short: `Cracked ground ${K.fl_dur}s · ${pc(K.fl_k)}%/s`,
      desc: () => L(`แนวแตกทิ้งพื้นลาวา-น้ำแข็งที่เป้าแรก ${K.fl_dur} วินาที ศัตรูในวง ${K.fl_r} ช่องโดน ${pc(K.fl_k)}% ทุกวินาที`, `The split leaves lava-ice ground at the first target for ${K.fl_dur}s: foes within ${K.fl_r} cells take ${pc(K.fl_k)}% every second.`) },
  ]);

  // ------------------------------------------------------------
  //  ไม้ตายตัวเลือกที่ 4
  // ------------------------------------------------------------
  if (typeof Feel !== 'undefined' && Feel.ULTS) {
    Feel.ULTS.gate = { job: 'hexer', name: 'NIFLHEIM GATE', th: L('ประตูนิฟล์ไฮม์', 'Niflheim Gate'),
      desc: L(`${K.ult_gate} วินาที: ตีโดน = ติดคำสาปทันที + ดาเมจคำสาป ×${K.ult_gate_k}`, `${K.ult_gate}s: every hit curses at once + curse damage ×${K.ult_gate_k}`),
      fire(p, col) { p.c3ult = { kind: 'gate', until: G.time + K.ult_gate }; addFloater(p.x, p.y - 2, 'NIFLHEIM GATE!', col || '#a070ff', true); } };
    Feel.ULTS.ymir = { job: 'worldbreaker', name: 'FALL OF YMIR', th: L('การล้มของยมีร์', 'Fall of Ymir'),
      desc: L(`${K.ult_ymir} วินาที: ไม่เสีย HP ค่าสกิล + Worldsplitter ชาร์จเต็มทันที (×${K.ult_ymir_k})`, `${K.ult_ymir}s: no HP costs + Worldsplitter charges instantly (×${K.ult_ymir_k})`),
      fire(p, col) { p.c3ult = { kind: 'ymir', until: G.time + K.ult_ymir }; addFloater(p.x, p.y - 2, 'FALL OF YMIR!', col || '#8fd0ff', true); } };
  }

  // ------------------------------------------------------------
  //  เควสต์ทดสอบ (เงาแม่พิมพ์) — ใช้ระบบเดิมของ js/class3.js
  // ------------------------------------------------------------
  const NB = s => (typeof B === 'function' ? B(s) : `<b>${s}</b>`);
  Object.assign(C.TRIAL, {
    hexer: { npc: 'hel', map: 'helcave', place: "Hel's Hollow", who: 'Hel',
      thought: L('"คำสาปที่ดีที่สุด คือคำสาปที่ปล่อยให้ประกายได้กลับบ้าน"', '"The best curse is the one that lets a spark go home."'),
      meet: L(`(Hel ยกตะเกียงครึ่งดับขึ้น) แม่มดคนหนึ่งเคยถือมันมาที่นี่ แล้วทิ้งความคิดไว้ ${NB('"คำสาปที่ดีที่สุด คือคำสาปที่ปล่อยให้ประกายได้กลับบ้าน"')}<br>จุดตะเกียงสิ... (ครึ่งที่ดับอยู่เคลื่อนเป็นเงา — เงานั้นใส่หน้ากากเดียวกับเจ้า)`,
        `(Hel lifts a half-lit lantern) A witch once carried this here and left a thought behind: ${NB('"The best curse is the one that lets a spark go home."')}<br>Light it... (the dark half moves like a shadow — wearing the same mask as you)`) },
    worldbreaker: { npc: 'loki', map: 'abyss', place: "Nidhogg's Hollow", who: 'Loki',
      thought: L('"ยักษ์ไม่ได้ตาย เขาแค่นอนลงแล้วกลายเป็นพื้นที่ทุกคนเหยียบ"', '"The giant did not die. He lay down and became the ground everyone walks on."'),
      meet: L(`(Loki เคาะพื้นหินที่แตกร้าว) ข้ารู้จักยักษ์ตัวหนึ่ง... ${NB('"ยักษ์ไม่ได้ตาย เขาแค่นอนลงแล้วกลายเป็นพื้นที่ทุกคนเหยียบ"')} — ทุบพื้นสิ แล้วดูว่าใครลุกขึ้นมา... (เงาที่หนักกว่าตัวเจ้าดันหินขึ้นจากรอยแตก)`,
        `(Loki taps the cracked stone floor) I knew a giant once... ${NB('"The giant did not die. He lay down and became the ground everyone walks on."')} — strike the floor, and see who rises... (a shadow heavier than you pushes up through the crack)`) },
  });
  if (typeof C.install === 'function') C.install(); // ผูกบทพูด NPC ใหม่ (Mimir ผูกแล้ว — ไม่ซ้ำ)

  // ------------------------------------------------------------
  //  บอท: Wither Field = โซน • Harvest เมื่อมีคำสาปรอบตัว ≥ 3 • ไม่ใช้ Harvest ตอนไม่มีคำสาป
  // ------------------------------------------------------------
  if (typeof Bot !== 'undefined') {
    const role0 = Bot.role;
    Bot.role = function (id) {
      const s = skillDef(id);
      if (s && s.special === 'c3w2_wither') return 'zone';
      if (s && s.special === 'c3w2_harvest') return 'other';
      return role0.apply(this, arguments);
    };
    const pick0 = Bot.pickSkill;
    Bot.pickSkill = function (t, threats, hpPct, spPct) {
      const p = G.player;
      if (lvOf('harvest') && this.canCast('harvest') && G.mobs.filter(m => !m.dead && m.c3hex && m.c3hex.until > G.time + 2 && U.dist(m.x, m.y, p.x, p.y) <= K.hx_harvest_r).length >= 3) return 'harvest';
      if (t && lvOf('plague_hex') && this.canCast('plague_hex') && !(t.c3hex && t.c3hex.until > G.time + 1)) return 'plague_hex';
      return pick0.apply(this, arguments);
    };
  }

  // ------------------------------------------------------------
  //  ภาพ: ย้อมจาก Class 2 จนกว่าจะมีภาพจริง (prompt docs/CLASS3_ART.md) • ไอคอนสกิลย้อมจากไอคอนใกล้เคียง
  // ------------------------------------------------------------
  if (typeof Art !== 'undefined') {
    const ART = { hexer: ['seidr', { hue: 25, sat: 0.9, bri: 0.86, tint: ['#5a3a8a', 0.22] }], worldbreaker: ['jotun', { hue: 180, sat: 0.7, bri: 1.0, tint: ['#8fd0ff', 0.2] }] };
    for (const [id, [base, spec]] of Object.entries(ART)) {
      for (const g of ['f', 'm']) Art.alias(`job_${id}_${g}`, `job_${base}_${g}`, Object.assign({ flip: true }, spec));
      Art.alias(`emblem_${id}`, `emblem_${base}`, spec);
    }
    const SRC = {
      hexer: [['mist_of_nifl', 'seidr_lore', 40], ['plague_hex', 'hex_of_hel', -20], ['half_mask_siphon', 'soul_drain', 30], ['wither_field', 'dark_nova', 90], ['grave_bind', 'void_lance', -40], ['harvest', 'dark_nova', -60]],
      worldbreaker: [['ymirs_bones', 'jotun_blood', 170], ['worldsplitter', 'earth_splitter', 160], ['glacier_fall', 'frost_nova', 0], ['giants_grip', 'titan_smash', 150], ['frost_hide', 'mountain_heart', 180], ['tremor_step', 'giants_wrath', 140]],
    };
    for (const job in SRC) SRC[job].forEach(([id, from, hue], i) => Art.alias('skill_' + id, 'skill_' + from, { hue, sat: 1.15, bri: i % 2 ? 1.0 : 1.06, flip: i % 2 === 0, tint: [JOBS[job].glow, 0.14] }));
  }
  if (typeof CLASSBOOK !== 'undefined') Object.assign(CLASSBOOK, {
    hexer: { diff: 2, weapon: 'Rod', stats: [['int', 60], ['dex', 30], ['vit', 10]],
      build: [['mist_of_nifl', 5], ['plague_hex', 5], ['half_mask_siphon', 5], ['harvest', 5], ['wither_field', 4], ['grave_bind', 1]],
      play: L('สาปฝูงด้วย Plague Hex แล้วปล่อยให้คำสาปลามเองตอนมอนล้ม • ดูด SP คืนด้วย Half-Mask Siphon • มอนติดสาปเยอะ ๆ ค่อย Harvest ทีเดียว',
        'Curse the pack with Plague Hex and let it leap as foes fall • refill SP with Half-Mask Siphon • when many are cursed, Harvest them all at once.'),
      pros: L('ฟาร์มฝูงสบาย SP ไม่หมด', 'Easy pack farming, never runs dry'), cons: L('เป้าเดี่ยวช้าถ้าไม่ใช้ Oath of Rot', 'Slow on single targets without Oath of Rot'),
      tips: L('Oath of Rot = บอส • Oath of Release = ฟาร์มยาว/ปาร์ตี้', 'Oath of Rot for bosses • Oath of Release for long farming/parties.') },
    worldbreaker: { diff: 3, weapon: 'Hammer', stats: [['str', 55], ['vit', 30], ['dex', 15]],
      build: [['ymirs_bones', 5], ['worldsplitter', 5], ['glacier_fall', 5], ['giants_grip', 5], ['frost_hide', 4], ['tremor_step', 1]],
      play: L('จ่าย HP ด้วยสกิลเล็กก่อน (แรงสะสมในกระดูก) แล้วปิดด้วย Worldsplitter ตามแนวฝูง • เลือดเหลือน้อย Frost Hide ลดค่า HP • Giant\'s Grip ตรึงตัวอันตราย',
        "Pay HP with small skills first (force builds in the bones), then finish with Worldsplitter along the pack • low on blood: Frost Hide halves HP costs • Giant's Grip pins the dangerous one."),
      pros: L('ดาเมจต่อครั้งสูงสุดในเกม ตัวถึก', 'Biggest single blows in the game, tanky'), cons: L('ร่ายชาร์จช้า เสียเลือดตลอด', 'Slow charges, constant blood cost'),
      tips: L('Oath of Blood = ฟาร์มฝูงแรงสุด (ต้องมียา) • Oath of the Mountain = เล่นปลอดภัย/บอสยาว', 'Oath of Blood for the hardest pack farming (bring potions) • Oath of the Mountain for safety/long bosses.') },
  });
})();
