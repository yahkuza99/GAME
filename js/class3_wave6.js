'use strict';
// ============================================================
//  Class 3 รอบ 6 (2026-10-09): Sixth Shadow (← Loki's Phantom) + Edda Warsinger (← Skald Bard)
//  ตามแบบ docs/CLASS3_DESIGN.md §3.9 / §3.10 — สาย Trickster ครบคู่ = Class 3 ครบ 12 ตัว
//  โครงเดียวกับ js/class3_wave5.js (โหลดต่อจากไฟล์นั้น)
//  ทำให้ง่ายลงจากแบบ (บันทึกไว้):
//   • ร่างเงา (Doppel Step) = ผู้ช่วยในเกม kind 'c3shade' ยืนนิ่ง ไม่ตี — มอนที่ถูก Green Flicker หันไปตีมันแทน
//     "กดซ้ำ = สลับที่" → กด Doppel Step ตอนร่างเงายังอยู่ = สลับที่ (คูลดาวน์สั้น 4 วิ ให้ทันกดซ้ำ)
//   • Thousand Cuts "ตัวจริง+ร่างเงาฟันพร้อมกัน" → มีร่างเงาอยู่ = แรง ×1.2
//   • Saga of Heroes ออร่า 8 ช่อง — ปาร์ตี้ออนไลน์ยังส่งบัฟข้ามเครื่องไม่ได้ → บัฟตัวเรา (กดซ้ำ = เปลี่ยนโหมด ATK → DEF → CRIT)
//   • Discord "สับสน เดินมั่ว" → มอนเลิกไล่ 3 วิ (บอส/ผู้เล่น: ช้า 1 วิ)
//   • Rally Drum ฟื้น SP / ลดคูลดาวน์ ตัวเราเท่านั้น
// ============================================================
(() => {
  if (typeof Class3 === 'undefined') return;
  const C = Class3;
  const K = Object.assign(C.K, {
    // Sixth Shadow
    s6_shade: 6, s6_shade_hp: 0.35, s6_dash: 6, s6_long: 8,
    s6_cuts_shade: 1.2, s6_flick: 5, s6_flick_boss: 2,
    s6_venom: 1.35, s6_mask_dur: 2, s6_mask_k: 0.85,
    s6_trap_r: 2, s6_trap_k: 2.5,
    s6_ult: 10, s6_ult_k: 0.5,
    // Warsinger
    w6_r: 8, w6_chorus_r: 12, w6_drain: 2, w6_solo: 1.5, w6_chorus_k: 0.85,
    // Battle Hymn 42~70% → 30~50% (เดิม 0.35+0.07×Lv = ฝูง +15% — tests/runes_c3.js)
    w6_hymn_r: 4, w6_hymn: lv => 0.25 + 0.05 * lv, w6_march: 20,
    w6_kenning_n: 3, w6_kenning_win: 8, w6_verse: 6,
    w6_cone: 5, w6_cone_cos: 0.7, w6_push: 1.5,
    w6_discord: 3, w6_discord_boss: 1, w6_echo: 0.5,
    w6_rally_sp: 0.1, w6_rally_cd: 2,
    w6_ult: 12,
  });
  const P = () => G.player;
  const fast = () => !!G.fastSim;
  const lvOf = id => (G.player && G.player.skills[id]) || 0;
  const say = (o, t, c, big) => { if (!fast()) addFloater(o.x, o.y - 1.6, t, c, big); };
  const chosen = sk => typeof Runes !== 'undefined' && Runes.chosen(sk);
  const oath = sk => { const r = chosen(sk); return r ? r.oath || null : null; };
  const rune = sk => { const r = chosen(sk); return r ? r.c3w6 || null : null; };
  const isJob = j => !!G.player && G.player.job === j;
  const buffOn = id => { const p = P(), b = p && p.buffs[id]; return !!(b && b.until > G.time); };
  const tough = m => !!(m.def.boss || m.isPlayer);

  // ------------------------------------------------------------
  //  ข้อมูล Class + สกิล
  // ------------------------------------------------------------
  Object.assign(THIRD_JOBS, { phantom: 'sixth', skald: 'warsinger' });
  Object.assign(JOBS, {
    sixth: { glow: '#7aff9a', name: 'Sixth Shadow', thai: L('เงาที่หก', 'The Sixth Shadow'), parent: 'phantom', tier: 3,
      bonus: { atkPct: 15, matkPct: 15, hit: 15, hpPct: 15 }, hp: 1.5, sp: 1.15, jobMax: 60, aspd: 1080,
      outfit: '#181018', outfit2: '#d03090', pants: '#120c16', jobHat: 'mask',
      stats: 'AGI / LUK', role: L('นักฆ่าสองร่าง ทิ้งเงา สลับที่ หลอกมอน', 'Two-Bodied Assassin — Leaves a Shade, Swaps, Deceives'),
      desc: L('ผู้ที่ไม่มีใครเซ็นชื่อแม่พิมพ์ให้ พาคนออกจากกำแพงได้สิบสองคน ทิ้งร่างเงาไว้ข้างหลัง สลับที่กับมันเมื่อถึงเวลา แล้วแทงจากด้านที่ศัตรูไม่ได้มอง',
        'One whose mold no one ever signed, who led twelve out through the wall. It leaves a shade behind, swaps places with it when the moment comes, and strikes from the side the foe is not watching.'),
      skills: ['unsigned_mold', 'doppel_step', 'thousand_cuts', 'green_flicker', 'venom_requiem', 'shadow_vanish'] },
    warsinger: { glow: '#9ad8ff', name: 'Edda Warsinger', thai: L('นักขับศึกแห่งเอ็ดดา', 'Warsinger of the Edda'), parent: 'skald', tier: 3,
      bonus: { atkPct: 15, matkPct: 15, hit: 15, hpPct: 15 }, hp: 1.4, sp: 1.3, jobMax: 60, aspd: 1150,
      outfit: '#22304e', outfit2: '#e0c060', pants: '#1a2236', cape: '#3a5a90', jobHat: 'mask',
      stats: 'AGI / DEX', role: L('ซัพพอร์ตออร่า สลับเพลงสลับโหมด คลื่นเสียงคุมฝูง', 'Aura Support — Switches Songs and Stances, Sound Waves Control Packs'),
      desc: L('ผู้แต่งเพลงของคนที่ยังอยู่ ห้าท่อนครบ — ท่อนที่หกปล่อยว่างไว้เหมือนเดิม ขับออร่าศึก เปลี่ยนเพลงกลางสนาม แล้วดีดคลื่นเสียงใส่ฝูง',
        'One who composes the song of those still here, five verses whole — the sixth left blank as it always was. It sings a war aura, changes the song mid-fight, and strikes the pack with waves of sound.'),
      skills: ['kenning', 'saga_of_heroes', 'thunder_chord', 'discord', 'echo_strike', 'rally_drum'] },
  });
  Object.assign(SKILLS, {
    // ===== Sixth Shadow =====
    unsigned_mold: { name: 'Unsigned Mold', max: 5, type: 'passive', icon: '#80ff9a', glyph: 'ᛚ',
      passive: lv => ({ critDmgPct: 4 * lv, agi: lv, crit: lv }),
      desc: L('แม่พิมพ์ไร้ชื่อ แรงคริติคอล +4%×Lv AGI +Lv CRIT +Lv • ตีแรกหลังหายตัว/สลับร่างคริติคอลแน่นอน',
        'The unsigned mold. Critical damage +4%×Lv, AGI +Lv, CRIT +Lv • your first strike after vanishing or swapping is a guaranteed critical.') },
    doppel_step: { name: 'Doppel Step', max: 5, type: 'active', target: 'enemy', range: 6, icon: '#c040a0', glyph: '⧉', req: { unsigned_mold: 1 },
      sp: lv => 14 + 2 * lv, delay: 500, cd: 4, fx: 'slash', chain: true, c3w6doppel: true,
      dmg: { type: 'phys', mult: lv => 2.2 + 0.44 * lv },
      desc: L('ทิ้งร่างเงาไว้ 6 วินาที แล้วพุ่งไปหลังเป้า แทง 264~440% • กดอีกครั้งตอนร่างเงายังอยู่ = สลับที่กับร่างเงา',
        'Leave a shade behind for 6s and dash behind the target, stabbing for 264~440% • cast again while the shade remains to swap places with it.') },
    thousand_cuts: { name: 'Thousand Cuts', max: 5, type: 'active', target: 'enemy', melee: true, icon: '#e060b0', glyph: '✂', req: { doppel_step: 1 },
      sp: lv => 22 + 2 * lv, delay: 900, cd: 8, fx: 'slash', c3w6cuts: true,
      dmg: { type: 'phys', mult: lv => 0.35 + 0.07 * lv, hits: 6, area: 2, at: 'target' },
      desc: L('ฟันรัวรอบเป้า 2 ช่อง 6 ครั้ง ครั้งละ 42~70% • มีร่างเงาอยู่ = ร่างเงาฟันด้วย แรง ×1.2',
        'Slash everything within 2 cells of the target 6 times for 42~70% each • with a shade out, it slashes too: ×1.2.') },
    green_flicker: { name: 'Green Flicker', max: 5, type: 'active', target: 'enemy', range: 7, icon: '#60ff80', glyph: '◐', req: { unsigned_mold: 2 },
      sp: () => 18, delay: 400, cd: 12, special: 'c3w6_flicker',
      buff: { dur: () => 5, stats: lv => ({ flee: 3 * lv }) },
      desc: L('วิเซอร์กะพริบเขียว ลวงเป้า 5 วินาทีให้หันไปตีร่างเงา (ไม่มีร่างเงา = สร้างใหม่ที่เท้า) • บอส/ผู้เล่น 2 วินาที • ตัวเรา FLEE +3×Lv',
        'Your visor flickers green: the target attacks your shade for 5s instead of you (no shade = one appears at your feet) • bosses/players 2s • you gain FLEE +3×Lv.') },
    venom_requiem: { name: 'Venom Requiem', max: 5, type: 'active', target: 'enemy', melee: true, icon: '#a040c0', glyph: '☠', req: { thousand_cuts: 1 },
      sp: lv => 20 + 3 * lv, delay: 800, cd: 7, fx: 'slash', chain: true, c3w6venom: true,
      dmg: { type: 'phys', mult: lv => 3.9 + 0.7 * lv },
      desc: L('แทงเพลงสุดท้าย 460~740% • เป้าติดพิษ = พิษระเบิด ×1.35 (ล้างพิษ)',
        'A final stab for 460~740% • against a poisoned target the venom bursts ×1.35 (consuming the poison).') },
    shadow_vanish: { name: 'Vanish', max: 5, type: 'active', target: 'self', icon: '#605070', glyph: '◌', req: { green_flicker: 1 },
      sp: () => 20, delay: 300, cd: 15, special: 'stealth', dur: () => 3, selfFx: 'buff', c3w6vanish: true,
      buff: { dur: () => 6, stats: lv => ({ speedPct: 4 * lv }) },
      desc: L('หายตัว 3 วินาที ล้างการไล่ของมอนทั้งหมด เดินเร็ว +4%×Lv 6 วินาที', 'Vanish for 3s, shaking off every pursuer, movement speed +4%×Lv for 6s.') },
    // ===== Edda Warsinger =====
    kenning: { name: 'Kenning', max: 5, type: 'passive', icon: '#a0d8ff', glyph: 'ᚲ',
      passive: lv => ({ aspdPct: lv, dex: lv, luk: lv }),
      desc: L('เคนนิง ความเร็วโจมตี +1%×Lv DEX +Lv LUK +Lv • ใช้สกิล Warsinger ต่างกัน 3 อันติดกัน (ใน 8 วิ) = "Verse Complete" 6 วินาที ATK +2%×Lv ความเร็วโจมตี +Lv%',
        'Kenning. Attack speed +1%×Lv, DEX +Lv, LUK +Lv • using 3 different Warsinger skills in a row (within 8s) completes a Verse: ATK +2%×Lv, attack speed +Lv% for 6s.') },
    saga_of_heroes: { name: 'Saga of Heroes', max: 5, type: 'active', target: 'self', icon: '#ffd890', glyph: '♬', req: { kenning: 1 },
      sp: () => 10, delay: 400, cd: 1.5, selfFx: 'shout', c3w6saga: true,
      desc: L('ขับออร่าศึก ค้างจนกว่า SP จะหมด (2 SP/วิ) • กดซ้ำ = เปลี่ยนโหมด: ศึก ATK +4×Lv ความเร็วโจมตี +2%×Lv → ป้อม DEF +4×Lv MDEF +2×Lv ฟื้น HP → ลม CRIT +2×Lv FLEE +4×Lv',
        'Sing a war aura that holds until SP runs out (2 SP/s) • cast again to change modes: War ATK +4×Lv, attack speed +2%×Lv → Bulwark DEF +4×Lv, MDEF +2×Lv, HP regen → Gale CRIT +2×Lv, FLEE +4×Lv.') },
    thunder_chord: { name: 'Thunder Chord', max: 5, type: 'active', target: 'enemy', range: 5, icon: '#c0e0ff', glyph: '⚡', req: { kenning: 2 },
      sp: lv => 20 + 2 * lv, delay: 700, cd: 6, fx: 'lightning', c3w6chord: true,
      dmg: { type: 'phys', element: 'wind', mult: lv => 2.0 + 0.36 * lv },
      desc: L('ดีดคลื่นเสียงกรวยหน้า 5 ช่อง 236~380% ธาตุลม ผลักถอย', 'Strike a 5-cell cone of sound ahead for 236~380% Wind, knocking foes back.') },
    discord: { name: 'Discord', max: 5, type: 'active', target: 'self', icon: '#b090ff', glyph: '♮', req: { thunder_chord: 1 },
      sp: () => 24, delay: 700, cd: 12, selfFx: 'howl', c3w6discord: true,
      dmg: { type: 'phys', element: 'wind', mult: lv => 1.0 + 0.2 * lv, area: 5, at: 'self' },
      desc: L('เพลงเพี้ยนรอบตัว 5 ช่อง 120~200% ธาตุลม ศัตรูสับสน เลิกไล่ 3 วินาที (บอส/ผู้เล่น: ช้า 1 วิ)',
        'A discordant song within 5 cells for 120~200% Wind: foes are confused and stop chasing for 3s (bosses/players: slowed 1s).') },
    echo_strike: { name: 'Echo Strike', max: 5, type: 'active', target: 'enemy', range: 6, icon: '#90c0ff', glyph: '♪', req: { kenning: 1 },
      sp: lv => 14 + 2 * lv, delay: 600, cd: 4, fx: 'lightning', chain: true, c3w6echo: true,
      dmg: { type: 'phys', element: 'wind', mult: lv => 3.2 + 0.56 * lv },
      desc: L('โน้ตเสียง 376~600% ธาตุลม แล้วสะท้อนซ้ำ 50% หลัง 1 วินาที', 'A sound note for 376~600% Wind that echoes for 50% one second later.') },
    rally_drum: { name: 'Rally Drum', max: 5, type: 'active', target: 'self', icon: '#e0a060', glyph: '◉', req: { saga_of_heroes: 1 },
      sp: () => 5, delay: 500, cd: 20, selfFx: 'buff', c3w6rally: true,
      buff: { dur: () => 6, stats: lv => ({ aspdPct: lv }) },
      desc: L('ตีกลองรวมพล ฟื้น SP 10% + คูลดาวน์สกิลอื่นที่เหลือ −2 วินาที • ความเร็วโจมตี +Lv% 6 วินาที',
        'Beat the rally drum: restore 10% SP and cut 2s from every other skill cooldown • attack speed +Lv% for 6s.') },
  });
  const NEW = ['unsigned_mold', 'doppel_step', 'thousand_cuts', 'green_flicker', 'venom_requiem', 'shadow_vanish', 'kenning', 'saga_of_heroes', 'thunder_chord', 'discord', 'echo_strike', 'rally_drum'];
  for (const id of NEW) SKILLS[id].id = id;

  // ------------------------------------------------------------
  //  ร่างเงา (Sixth Shadow) — ผู้ช่วย kind 'c3shade' ยืนนิ่ง รับดาเมจแทน
  // ------------------------------------------------------------
  const shadeOf = () => G.allies.find(a => a.kind === 'c3shade' && !a.dead && a.hp > 0 && a.until > G.time) || null;
  C.shade = shadeOf;
  C.spawnShade = (x, y, sec) => {
    const p = P(), lv = lvOf('doppel_step') || 1;
    G.allies = G.allies.filter(a => a.kind !== 'c3shade');
    const mx = Math.max(1, Math.round(p.d.maxHp * K.s6_shade_hp));
    const a = { kind: 'c3shade', name: 'Shade', x, y, path: [], facing: p.facing, moving: false, seed: Math.random(), until: G.time + sec, lv, hp: mx, maxHp: mx,
      defense: 0, flee: 0, born: G.time, hitFlash: 0, nextAtk: 1e12, repathAt: 0, atkAnim: 0, target: null, state: 'ally', def: { size: 1, color: '#2a1830', color2: '#d03090', variant: 'wolf' } };
    G.allies.push(a);
    if (!fast()) addFx({ type: 'ring', x, y, dur: 0.5, r: 1, color: '120,255,150' });
    return a;
  };
  const shadeBoom = a => {
    if (a.boomed) return; a.boomed = true;
    if (rune('doppel_step') !== 'trap') return;
    const s = SKILLS.doppel_step;
    for (const m of Runes.foes(a.x, a.y, K.s6_trap_r)) Runes.hit(m, s, K.s6_trap_k, { color: '#80ff9a' });
    say(a, 'MIRROR TRAP', '#80ff9a');
    if (!fast()) addFx({ type: 'ring', x: a.x, y: a.y, dur: 0.45, r: K.s6_trap_r, color: '120,255,150' });
  };
  // ร่างเงาไม่เดินตาม/ไม่กัด (ระบบผู้ช่วยเดิมทำให้หมาป่าวิ่งไล่ตี) — ยกออกจากรายการตอนอัปเดต แล้วใส่คืน
  if (typeof updateAllies === 'function' && !updateAllies._c3w6) {
    const f0 = updateAllies;
    updateAllies = function () { // eslint-disable-line no-global-assign
      const sh = G.allies.filter(a => a.kind === 'c3shade');
      if (!sh.length) return f0.apply(this, arguments);
      G.allies = G.allies.filter(a => a.kind !== 'c3shade');
      try { return f0.apply(this, arguments); }
      finally {
        for (const a of sh) { if (a.until <= G.time || a.dead || !(a.hp > 0)) shadeBoom(a); else G.allies.push(a); }
      }
    };
    updateAllies._c3w6 = true;
  }
  if (typeof damageAlly === 'function' && !damageAlly._c3w6) {
    const f0 = damageAlly;
    damageAlly = function (a, dmg, source) { // eslint-disable-line no-global-assign
      if (!a || a.kind !== 'c3shade') return f0.apply(this, arguments);
      if (a.dead || !(a.hp > 0)) return;
      const amount = Math.max(1, Math.round(dmg));
      a.hp = Math.max(0, a.hp - amount); a.hitFlash = 0.18;
      if (!fast()) addFloater(a.x, a.y - 1, amount, '#c0a0d0');
      if (a.hp === 0) { a.dead = true; if (source && source.allyTarget === a) source.allyTarget = null; shadeBoom(a); }
    };
    damageAlly._c3w6 = true;
  }
  C.doppel = (s, lv, tgt) => {
    const p = P(), rn = rune('doppel_step'), sh = shadeOf();
    if (sh && rn !== 'long') { // สลับที่
      const x = p.x, y = p.y; p.x = sh.x; p.y = sh.y; sh.x = x; sh.y = y; p.path = []; p.skillIntent = null;
      RU._crit = true; say(p, 'SWAP', '#80ff9a');
      if (!fast()) { addFx({ type: 'ring', x: p.x, y: p.y, dur: 0.4, r: 1, color: '120,255,150' }); addFx({ type: 'ring', x, y, dur: 0.4, r: 1, color: '200,60,160' }); }
      return;
    }
    if (rn !== 'long' && oath('unsigned_mold') !== 'unmasked') C.spawnShade(p.x, p.y, K.s6_shade * (oath('unsigned_mold') === 'mask' ? K.s6_mask_dur : 1));
    const dx = tgt.x - p.x, dy = tgt.y - p.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    const reach = rn === 'long' ? K.s6_long : K.s6_dash, go = Math.min(reach, d + 0.9);
    let nx = p.x + ux * go, ny = p.y + uy * go;
    if (!G.map.walkable(Math.floor(nx), Math.floor(ny))) { const w = G.map.nearestWalkable(nx, ny); nx = w.x; ny = w.y; }
    p.x = nx; p.y = ny; p.path = []; p.skillIntent = null; faceTo(p, tgt.x, tgt.y);
    if (!fast()) Runes.fx({ kind: 'drag', x: p.x, y: p.y, ox: ux, oy: uy, dur: 0.3, col: '200,60,160' });
    skillHitOne(s, lv, tgt);
  };
  C.flicker = (s, lv, at) => {
    const p = P(), m = at && !at.dead && at.def ? at : p.target && !p.target.dead ? p.target : null; if (!m) return;
    const sh = shadeOf() || C.spawnShade(p.x, p.y, K.s6_flick);
    m.allyTarget = sh; m.c3flick = G.time + (tough(m) ? K.s6_flick_boss : K.s6_flick); m.state = 'chase';
    say(m, 'FLICKER', '#60ff80');
  };
  C.twelve = () => C.ultOn('twelve');

  // ------------------------------------------------------------
  //  ออร่า Saga of Heroes / Kenning (Warsinger)
  // ------------------------------------------------------------
  const MODES = ['war', 'guard', 'gale'];
  const modeStats = (mode, lv) => mode === 'war' ? { atk: 4 * lv, aspdPct: 2 * lv } : mode === 'guard' ? { def: 4 * lv, mdef: 2 * lv, regenPct: 0.4 * lv } : { crit: 2 * lv, flee: 4 * lv };
  C.sagaStats = () => {
    const p = P(), sg = p && p.c3saga; if (!sg || !sg.on) return null;
    const lv = sg.lv, all = C.ultOn('verse'), o = {};
    for (const md of all ? MODES : [sg.mode]) for (const [k, v] of Object.entries(modeStats(md, lv))) o[k] = (o[k] || 0) + v;
    const k = oath('kenning') === 'solo' ? K.w6_solo : 1;
    for (const key in o) o[key] = o[key] * k;
    if (rune('saga_of_heroes') === 'march') o.speedPct = (o.speedPct || 0) + K.w6_march;
    return o;
  };
  const sagaApply = () => { const o = C.sagaStats(); if (o) Runes.giveBuff('c3w6_saga', 'saga_of_heroes', 1.3, o); };
  C.saga = (s, lv) => {
    const p = P(), sg = p.c3saga;
    if (!sg || !sg.on) p.c3saga = { on: true, mode: 'war', lv, next: G.time + 1 };
    else { sg.mode = MODES[(MODES.indexOf(sg.mode) + 1) % MODES.length]; sg.lv = lv; }
    if (p.rb) delete p.rb.c3w6_saga;
    sagaApply();
    say(p, { war: 'SAGA · WAR', guard: 'SAGA · BULWARK', gale: 'SAGA · GALE' }[p.c3saga.mode], '#ffd890');
  };
  const song = id => { // Kenning: สกิล Warsinger ต่างกัน 3 อันติดกัน
    const p = P(), lv = lvOf('kenning'); if (!lv || !isJob('warsinger')) return;
    const list = (p.c3songs || []).filter(x => G.time - x.t <= K.w6_kenning_win && x.id !== id);
    list.push({ id, t: G.time }); p.c3songs = list.slice(-K.w6_kenning_n);
    if (p.c3songs.length >= K.w6_kenning_n) {
      p.c3songs = [];
      Runes.giveBuff('c3w6_verse', 'kenning', K.w6_verse, { atkPct: 2 * lv, aspdPct: lv });
      say(p, 'VERSE COMPLETE', '#a0d8ff', true);
    }
  };

  // ------------------------------------------------------------
  //  สูตรตี: Oath of the Unmasked (ด้านหลังคริ) • ULT TWELVE SHADOWS (เงาฟันซ้ำ 50%)
  // ------------------------------------------------------------
  const behind = m => { const p = P(); return !!m && !m.isPlayer && (p.x - m.x) * (m.facing || 1) < 0; };
  if (typeof physHit === 'function' && !physHit._c3w6) {
    const f0 = physHit;
    physHit = function (m, mult = 1, opts = {}) { // eslint-disable-line no-global-assign
      if (m && isJob('sixth') && oath('unsigned_mold') === 'unmasked' && behind(m)) opts = Object.assign({}, opts, { forceCrit: true });
      return f0.call(this, m, mult, opts);
    };
    physHit._c3w6 = true;
  }
  C.behind = behind;
  if (typeof applyHit === 'function' && !applyHit._c3w6) {
    const f0 = applyHit;
    applyHit = function (m, r, opts) { // eslint-disable-line no-global-assign
      const out = f0.apply(this, arguments);
      if (r && !r.miss && r.dmg > 0 && m && !m.dead && isJob('sixth') && C.twelve() && opts && opts.src && opts.src !== 'twelve_shadows') {
        const d = Math.max(1, Math.round(r.dmg * K.s6_ult_k));
        later(0.12, () => { if (!m.dead) damageMob(m, d, { src: 'twelve_shadows', color: '#80ff9a' }); });
      }
      return out;
    };
    applyHit._c3w6 = true;
  }

  // ------------------------------------------------------------
  //  จุดเกาะ Runes (ห่อต่อจาก js/class3_wave5.js)
  // ------------------------------------------------------------
  const RU = Runes;
  { const f0 = RU.onCast;
    RU.onCast = function (s, lv, tgt) {
      const p = P();
      if (s.c3w6vanish) RU._crit = true;
      if (s.c3w6saga) { C.saga(s, lv); song(s.id); }
      if (s.c3w6rally) {
        p.sp = Math.min(p.d.maxSp, p.sp + Math.round(p.d.maxSp * K.w6_rally_sp));
        if (p.cds) for (const id in p.cds) if (id !== s.id) p.cds[id] = Math.max(G.time, p.cds[id] - K.w6_rally_cd);
        song(s.id);
      }
      if (s.c3w6chord || s.c3w6discord || s.c3w6echo) song(s.id);
      if (s.c3w6discord) for (const m of Runes.foes(p.x, p.y, s.dmg.area)) { // สับสนแม้ดาเมจพลาด (เพลงไม่ต้องโดนตัว)
        if (tough(m)) m.slowUntil = Math.max(m.slowUntil || 0, G.time + K.w6_discord_boss);
        else { m.c3confuse = G.time + K.w6_discord; m.state = 'idle'; m.path = []; m.moving = false; m.nextWander = G.time; }
      }
      const r = f0.apply(this, arguments);
      if (s.c3w6doppel && tgt && !tgt.dead) { C.doppel(s, lv, tgt); return true; }
      if (s.c3w6chord && tgt && !tgt.dead) {
        const dx = tgt.x - p.x, dy = tgt.y - p.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
        const hits = G.mobs.filter(m => { if (m.dead) return false; const ex = m.x - p.x, ey = m.y - p.y, e = Math.hypot(ex, ey) || 1; return e <= K.w6_cone && (ex * ux + ey * uy) / e >= K.w6_cone_cos; });
        if (!hits.includes(tgt)) hits.push(tgt);
        hits.forEach((m, i) => later(i * 0.03, () => skillHitOne(s, lv, m)));
        if (!fast()) addFx({ type: 'ring', x: p.x + ux * 2, y: p.y + uy * 2, dur: 0.4, r: 2.5, color: '180,220,255' });
        return true;
      }
      if (s.c3w6echo && tgt && !tgt.dead) later(1, () => { if (!tgt.dead && G.mobs.includes(tgt)) skillHitOne(s, lv, tgt, K.w6_echo); });
      return r;
    }; }
  { const f0 = RU.hitMul;
    RU.hitMul = function (s, lv, m) {
      let k = f0.apply(this, arguments);
      const p = P(); if (!p || !m) return k;
      if (s.c3w6cuts && shadeOf()) k *= K.s6_cuts_shade;
      if (s.c3w6venom && m.poisonUntil > G.time) { k *= K.s6_venom; m.c3venomPop = true; }
      if (isJob('sixth') && oath('unsigned_mold') === 'mask') k *= K.s6_mask_k;
      if (isJob('warsinger') && oath('kenning') === 'chorus') k *= K.w6_chorus_k;
      return k;
    }; }
  { const f0 = RU.afterHit;
    RU.afterHit = function (s, lv, m, r) {
      f0.apply(this, arguments);
      if (!m || m.dead || !r || r.miss) return;
      if (m.c3venomPop) { m.c3venomPop = false; m.poisonUntil = 0; say(m, 'REQUIEM', '#c060e0', true); }
      if (s.c3w6chord && !tough(m)) knockback(m, P().x, P().y, K.w6_push);
    }; }
  { const f0 = RU.update;
    RU.update = function () {
      f0.apply(this, arguments);
      const p = P(); if (!p) return;
      for (const m of G.mobs) {
        if (m.c3confuse > G.time && m.state === 'chase') { m.state = 'idle'; m.path = []; }
        if (m.c3flick && m.c3flick <= G.time) { m.c3flick = 0; if (m.allyTarget && m.allyTarget.kind === 'c3shade') m.allyTarget = null; }
      }
      const sg = p.c3saga;
      if (sg && sg.on) {
        if (!isJob('warsinger') || p.dead) { sg.on = false; if (p.rb) { delete p.rb.c3w6_saga; recalc(); } }
        else if (G.time >= sg.next) {
          sg.next = G.time + 1;
          if (p.sp < K.w6_drain) { sg.on = false; if (p.rb) { delete p.rb.c3w6_saga; recalc(); } say(p, 'Saga ends', '#a0a0c0'); }
          else {
            p.sp -= K.w6_drain; sagaApply();
            if (rune('saga_of_heroes') === 'hymn') for (const m of Runes.foes(p.x, p.y, K.w6_hymn_r)) Runes.hit(m, SKILLS.saga_of_heroes, K.w6_hymn(sg.lv), { type: 'phys', element: 'wind', color: '#c0e0ff' });
          }
        }
      }
    }; }
  if (typeof runSpecialSkill === 'function' && !runSpecialSkill._c3w6) {
    const f0 = runSpecialSkill;
    runSpecialSkill = function (kind, s, lv) { // eslint-disable-line no-global-assign
      if (kind === 'c3w6_flicker') return void C.flicker(s, lv, C.tgt);
      return f0.apply(this, arguments);
    };
    runSpecialSkill._c3w6 = true;
  }

  // ------------------------------------------------------------
  //  Oath (สกิลติดตัว) + รูนสกิลประจำตัว ★
  // ------------------------------------------------------------
  const pc = v => Math.round(v * 100);
  const keepP = id => () => ({ passive: SKILLS[id].passive });
  Runes.add('unsigned_mold', [
    { id: 'unsigned_mold.mask', name: 'Of the Mask', oath: 'mask', intent: 'pack', glyph: '◐', col: '#c040a0',
      short: `Oath: shade lasts ×${K.s6_mask_dur} · your skills ${pc(K.s6_mask_k)}%`,
      desc: () => L(`Oath of the Mask — ร่างเงาอยู่นาน ×${K.s6_mask_dur} แต่สกิลของตัวจริงเหลือ ${pc(K.s6_mask_k)}% — ให้เงาเป็นตัวล่อ`, `Oath of the Mask — your shade lasts ×${K.s6_mask_dur}, but your own skills drop to ${pc(K.s6_mask_k)}% — let the shade be the lure.`),
      mod: keepP('unsigned_mold') },
    { id: 'unsigned_mold.unmasked', name: 'Of the Unmasked', oath: 'unmasked', intent: 'single', glyph: '●', col: '#7aff9a',
      short: 'Oath: no shade · every hit from behind crits',
      desc: () => L('Oath of the Unmasked — ไม่ทิ้งร่างเงา แต่ทุกการตีจากด้านหลังเป้าคริติคอล (Doppel Step พาไปข้างหลังพอดี)', 'Oath of the Unmasked — no shade, but every hit from behind the target is a critical (Doppel Step lands you right there).'),
      mod: keepP('unsigned_mold') },
  ]);
  Runes.add('doppel_step', [
    { id: 'doppel_step.mirror_trap', name: 'Mirror Trap', c3w6: 'trap', intent: 'pack', glyph: '✸', col: '#80ff9a',
      short: `Shade explodes on expiry · ${K.s6_trap_r} cells ${pc(K.s6_trap_k)}%`,
      desc: () => L(`ร่างเงาระเบิดตอนหมดเวลา/ถูกทำลาย รัศมี ${K.s6_trap_r} ช่อง ${pc(K.s6_trap_k)}%`, `The shade explodes when it expires or breaks: ${K.s6_trap_r} cells, ${pc(K.s6_trap_k)}%.`) },
    { id: 'doppel_step.long_shadow', name: 'Long Shadow', c3w6: 'long', intent: 'single', glyph: '⟿', col: '#c060c0',
      short: `Dash ${K.s6_long} cells · no shade`,
      desc: () => L(`พุ่งไกล ${K.s6_long} ช่อง แต่ไม่ทิ้งร่างเงา (สลับที่ไม่ได้)`, `Dash up to ${K.s6_long} cells but leave no shade (no swapping).`) },
  ]);
  Runes.add('kenning', [
    { id: 'kenning.chorus', name: 'Of the Chorus', oath: 'chorus', intent: 'pack', glyph: '♫', col: '#9ad8ff',
      short: `Oath: aura ${K.w6_chorus_r} cells · your skills ${pc(K.w6_chorus_k)}%`,
      desc: () => L(`Oath of the Chorus — ออร่า ${K.w6_chorus_r} ช่อง (สำหรับปาร์ตี้ในอนาคต) แต่สกิลของเราเหลือ ${pc(K.w6_chorus_k)}%`, `Oath of the Chorus — the aura reaches ${K.w6_chorus_r} cells (for parties), but your skills drop to ${pc(K.w6_chorus_k)}%.`),
      mod: keepP('kenning') },
    { id: 'kenning.solo', name: 'Of the Solo', oath: 'solo', intent: 'single', glyph: '♩', col: '#ffd890',
      short: `Oath: the aura is yours alone · ×${K.w6_solo}`,
      desc: () => L(`Oath of the Solo — ออร่ามีผลกับตัวเราคนเดียว แต่แรง ×${K.w6_solo} — สายเล่นคนเดียว`, `Oath of the Solo — the aura is yours alone, at ×${K.w6_solo} — the solo path.`),
      mod: keepP('kenning') },
  ]);
  Runes.add('saga_of_heroes', [
    { id: 'saga_of_heroes.battle_hymn', name: 'Battle Hymn', c3w6: 'hymn', intent: 'pack', glyph: '≋', col: '#c0e0ff',
      short: `Aura deals light Wind damage every second (${K.w6_hymn_r} cells)`,
      desc: () => L(`ออร่าทำดาเมจลม 70~70% ใส่ศัตรูรอบตัว ${K.w6_hymn_r} ช่องทุกวินาที`.replace('70~70%', `${pc(K.w6_hymn(1))}~${pc(K.w6_hymn(5))}%`), `The aura deals ${pc(K.w6_hymn(1))}~${pc(K.w6_hymn(5))}% Wind to foes within ${K.w6_hymn_r} cells every second.`) },
    { id: 'saga_of_heroes.march', name: 'March', c3w6: 'march', intent: 'both', glyph: '»', col: '#ffe0a0',
      short: `Every mode adds +${K.w6_march}% movement speed`,
      desc: () => L(`ทุกโหมดเดินเร็ว +${K.w6_march}% — สายฟาร์ม`, `Every mode adds +${K.w6_march}% movement speed — the farming path.`) },
  ]);

  // ------------------------------------------------------------
  //  ไม้ตายตัวเลือกที่ 4
  // ------------------------------------------------------------
  if (typeof Feel !== 'undefined' && Feel.ULTS) {
    Feel.ULTS.twelve = { job: 'sixth', name: 'TWELVE SHADOWS', th: L('สิบสองเงา', 'Twelve Shadows'),
      desc: L(`${K.s6_ult} วินาที: ทุกการตีมีเงาตามมาฟันซ้ำ ${pc(K.s6_ult_k)}%`, `${K.s6_ult}s: every hit is followed by a shadow strike for ${pc(K.s6_ult_k)}%`),
      fire(p, col) { p.c3ult = { kind: 'twelve', until: G.time + K.s6_ult }; addFloater(p.x, p.y - 2, 'TWELVE SHADOWS!', col || '#7aff9a', true); } };
    Feel.ULTS.verse = { job: 'warsinger', name: 'VERSE OF THE FIVE', th: L('เพลงห้าท่อน', 'Verse of the Five'),
      desc: L(`${K.w6_ult} วินาที: ออร่า Saga ทั้ง 3 โหมดพร้อมกัน (ไม่ใช้ SP) — ท่อนที่หกยังว่างไว้`, `${K.w6_ult}s: all 3 Saga modes at once (no SP) — the sixth verse stays blank`),
      fire(p, col) {
        p.c3ult = { kind: 'verse', until: G.time + K.w6_ult };
        if (!p.c3saga || !p.c3saga.on) p.c3saga = { on: true, mode: 'war', lv: lvOf('saga_of_heroes') || 1, next: G.time + 1 };
        p.c3saga.ultFree = true; sagaApply();
        addFloater(p.x, p.y - 2, 'VERSE OF THE FIVE!', col || '#9ad8ff', true);
      } };
  }
  // ระหว่างไม้ตายเพลงห้าท่อน ออร่าไม่กิน SP
  { const f0 = RU.update;
    RU.update = function () {
      const p = P(), sg = p && p.c3saga;
      const free = sg && sg.on && C.ultOn('verse');
      if (free && G.time >= sg.next) p.sp += K.w6_drain; // คืนก่อนตัวหลักหัก
      return f0.apply(this, arguments);
    }; }

  // ------------------------------------------------------------
  //  เควสต์ทดสอบ (เงาแม่พิมพ์)
  // ------------------------------------------------------------
  const NB = s => (typeof B === 'function' ? B(s) : `<b>${s}</b>`);
  Object.assign(C.TRIAL, {
    sixth: { npc: 'bragi', map: 'eldheim', place: 'Eldheim', who: 'Bragi',
      thought: L('"พาออกไปได้สิบสองคน"', '"Twelve led out."'),
      meet: L(`(Bragi เปิดเพลงเก่า ท่อนที่หกเงียบ) เพลงนี้มีหกท่อน แต่ไม่มีใครร้องท่อนที่หก — คนที่พาคนออกจากกำแพงได้สิบสองคนไม่เคยเซ็นชื่อแม่พิมพ์ ความคิดที่เหลือคือ ${NB('"พาออกไปได้สิบสองคน"')}<br>(เงาสองร่างก้าวออกจากมุมเดียวกัน — วิเซอร์ของร่างหนึ่งกะพริบเขียว)`,
        `(Bragi plays an old song; the sixth verse is silent) This song has six verses, but no one sings the sixth — the one who led twelve out through the wall never signed the mold. The thought left behind is ${NB('"Twelve led out."')}<br>(Two shadows step out of the same corner — one visor flickers green)`) },
    warsinger: { npc: 'toki', map: 'eldheim', place: 'Eldheim', who: 'Tóki',
      thought: L('"เพลงของคนที่ยังอยู่"', '"A song for those still here."'),
      meet: L(`(Tóki ยื่นกระดาษเพลงที่เขียนไม่จบ) ข้าอยากได้เพลงที่ไม่ใช่เพลงไว้อาลัย — เพลงของคนที่ยังอยู่ ห้าท่อนก็พอ ความคิดที่ข้าตามหาคือ ${NB('"เพลงของคนที่ยังอยู่"')}<br>(เสียงพิณดังจากหลังร้าน — เงาถือพิณเขาแตรเดินออกมาตามจังหวะกลอง)`,
        `(Tóki holds out an unfinished song sheet) I want a song that isn't a lament — a song for those still here. Five verses are enough. The thought I'm looking for is ${NB('"A song for those still here."')}<br>(A lyre sounds behind the shop — a shadow with a horn-lyre walks out in step with a drum)`) },
  });
  if (typeof C.install === 'function') C.install();

  // ------------------------------------------------------------
  //  บอท: Doppel Step เปิด • Venom Requiem ตัวติดพิษ • Green Flicker เมื่อโดนรุม • Saga เปิดค้างไว้ • Discord เมื่อโดนล้อม
  // ------------------------------------------------------------
  if (typeof Bot !== 'undefined') {
    const pick0 = Bot.pickSkill;
    Bot.pickSkill = function (t, threats, hpPct, spPct) {
      const p = G.player, n = threats ? threats.length : 0;
      if (isJob('sixth') && t) {
        if (lvOf('doppel_step') && !shadeOf() && this.canCast('doppel_step')) return 'doppel_step';
        if (lvOf('venom_requiem') && t.poisonUntil > G.time && this.canCast('venom_requiem')) return 'venom_requiem';
        if (lvOf('green_flicker') && hpPct < 60 && this.canCast('green_flicker')) return 'green_flicker';
      }
      if (isJob('warsinger')) {
        if (lvOf('saga_of_heroes') && !(p.c3saga && p.c3saga.on) && spPct > 30 && this.canCast('saga_of_heroes')) return 'saga_of_heroes';
        if (t && lvOf('discord') && n >= 3 && this.canCast('discord')) return 'discord';
        if (lvOf('rally_drum') && spPct < 50 && this.canCast('rally_drum')) return 'rally_drum';
      }
      return pick0.apply(this, arguments);
    };
  }

  // ------------------------------------------------------------
  //  ภาพ: ย้อมจาก Class 2 จนกว่าจะมีภาพจริง (prompt docs/CLASS3_ART.md) • ร่างเงาวาดเป็นตัวเราสีเงาม่วง-เขียว
  // ------------------------------------------------------------
  if (typeof Sprites !== 'undefined' && Sprites.drawAlly && !Sprites.drawAlly._c3w6) {
    const da0 = Sprites.drawAlly;
    Sprites.drawAlly = (g, a, t) => {
      if (a.kind !== 'c3shade') return da0(g, a, t);
      const p = P(); if (!p) return;
      const px = a._px || (a._px = { buffs: {} });
      Object.assign(px, { x: a.x, y: a.y, job: p.job, gender: p.gender, hair: p.hair, look: p.look, equip: p.equip, facing: a.facing, moving: false, sitting: false,
        dead: false, atkAnim: 0, hurtFlash: a.hitFlash, cast: null, stunUntil: 0, stunAt: 0 });
      const fade = Math.min(1, Math.max(0, (a.until - G.time) / 0.6));
      g.save();
      try {
        g.globalAlpha = 0.6 * fade; g.filter = 'grayscale(1) brightness(0.35) sepia(0.6) hue-rotate(260deg) saturate(3) contrast(1.4)';
        Sprites.drawPlayer(g, px, t);
        if (Math.sin(t * 9 + a.seed * 7) > 0.6) { g.globalCompositeOperation = 'lighter'; g.filter = 'none'; g.fillStyle = 'rgba(120,255,150,0.55)'; g.fillRect(a.x * TILE - 7, a.y * TILE - 46, 14, 2); }
      } catch (e) { g.filter = 'none'; }
      g.restore();
    };
    Sprites.drawAlly._c3w6 = true;
  }
  if (typeof Art !== 'undefined') {
    const ART = { sixth: ['phantom', { hue: 90, sat: 1.0, bri: 0.86, tint: ['#1a3020', 0.2] }], warsinger: ['skald', { hue: -12, sat: 1.1, bri: 1.06, tint: ['#e0c060', 0.16] }] };
    for (const [id, [base, spec]] of Object.entries(ART)) {
      for (const g of ['f', 'm']) Art.alias(`job_${id}_${g}`, `job_${base}_${g}`, Object.assign({ flip: true }, spec));
      Art.alias(`emblem_${id}`, `emblem_${base}`, spec);
    }
    const SRC = {
      sixth: [['unsigned_mold', 'phantom_edge', 100], ['doppel_step', 'mirror_strike', 120], ['thousand_cuts', 'smoke_cyclone', -20], ['green_flicker', 'trickster_haste', 40], ['venom_requiem', 'fang_of_fenrir', 30], ['shadow_vanish', 'smoke_cyclone', 140]],
      warsinger: [['kenning', 'skald_verse', 20], ['saga_of_heroes', 'song_of_battle', -15], ['thunder_chord', 'sonic_strike', 30], ['discord', 'hymn_of_loki', 40], ['echo_strike', 'sonic_strike', -30], ['rally_drum', 'war_drum', 15]],
    };
    for (const job in SRC) SRC[job].forEach(([id, from, hue], i) => Art.alias('skill_' + id, 'skill_' + from, { hue, sat: 1.15, bri: i % 2 ? 1.0 : 1.06, flip: i % 2 === 0, tint: [JOBS[job].glow, 0.14] }));
  }
  if (typeof CLASSBOOK !== 'undefined') Object.assign(CLASSBOOK, {
    sixth: { diff: 3, weapon: L('มีดยาวโค้งคู่', 'Twin curved long-knives'), stats: [['agi', 50], ['luk', 30], ['str', 20]],
      build: [['unsigned_mold', 5], ['doppel_step', 5], ['thousand_cuts', 5], ['venom_requiem', 5], ['green_flicker', 4], ['shadow_vanish', 1]],
      play: L('Doppel Step ทิ้งร่างเงาแล้วพุ่งไปหลังเป้า • Green Flicker ให้มอนหันไปตีร่างเงา • Thousand Cuts ตอนร่างเงายังอยู่ • จะพลาดเมื่อไหร่ กด Doppel Step ซ้ำสลับที่หนี',
        'Doppel Step to leave a shade and dash behind the target • Green Flicker turns monsters onto the shade • Thousand Cuts while the shade lives • in trouble, cast Doppel Step again to swap away.'),
      pros: L('หลบเก่ง ดาเมจคริสูง', 'Slippery, high critical damage'), cons: L('ต้องคุมตำแหน่งสองร่าง', 'You manage two positions at once'),
      tips: L('Oath of the Mask = ใช้เงาล่อ • Oath of the Unmasked = ไม่มีเงา ตีหลังคริทุกครั้ง', 'Oath of the Mask to lure with the shade • Oath of the Unmasked: no shade, every hit from behind crits.') },
    warsinger: { diff: 2, weapon: L('พิณเขาแตรศึก + กลองเล็ก', 'Horn-lyre + small drum'), stats: [['agi', 45], ['dex', 40], ['vit', 15]],
      build: [['kenning', 5], ['saga_of_heroes', 5], ['echo_strike', 5], ['thunder_chord', 5], ['discord', 4], ['rally_drum', 1]],
      play: L('เปิด Saga of Heroes ค้างไว้ (กดซ้ำเปลี่ยนโหมดตามสถานการณ์) • Echo Strike → Thunder Chord → Discord ต่างกัน 3 เพลง = Verse Complete • SP ใกล้หมด ตี Rally Drum',
        'Keep Saga of Heroes running (cast again to change mode as needed) • Echo Strike → Thunder Chord → Discord: three different songs complete a Verse • low on SP, beat the Rally Drum.'),
      pros: L('บัฟสลับโหมดได้ คุมฝูงด้วยเสียง', 'Switchable buffs, crowd control by sound'), cons: L('ออร่ากิน SP ตลอด', 'The aura drains SP constantly'),
      tips: L('Oath of the Solo = เล่นคนเดียว ออร่าแรง ×1.5 • Oath of the Chorus = ปาร์ตี้', 'Oath of the Solo for solo play (aura ×1.5) • Oath of the Chorus for parties.') },
  });
})();
