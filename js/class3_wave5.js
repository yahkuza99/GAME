'use strict';
// ============================================================
//  Class 3 รอบ 5 (2026-10-09): Urd Lifeweaver (← Norn Oracle) + Tyr Oathfist (← Gythja Monk)
//  ตามแบบ docs/CLASS3_DESIGN.md §3.7 / §3.8 — สาย Völva ครบคู่ • โครงเดียวกับ js/class3_wave4.js (โหลดต่อจากไฟล์นั้น)
//  ทำให้ง่ายลงจากแบบ (บันทึกไว้):
//   • Lifethread "ผูกด้ายกับเพื่อน แบ่งดาเมจ 30%" — ปาร์ตี้ออนไลน์ยังส่งดาเมจ/ฮีลข้ามเครื่องไม่ได้ → ผูกตัวเอง = ฮีลต่อเนื่อง
//     + ผู้ช่วยในเกม (G.allies) ในระยะ 8 ได้ฮีลด้วย • รูน Taut Thread ผูกศัตรูได้จริง
//   • Verdandi's Now / Sap Spring / ULT มีผลกับตัวเรา + ผู้ช่วยในเกมเท่านั้น
//   • Leaf Recall เป็นบัฟ 60 วิ (ไม่ต้องผูกด้ายก่อน) — ล้มเมื่อไหร่ ฟื้น 30% HP แทน
//   • Seal "ใช้สกิลไม่ได้ 3 วิ" → บอสเลื่อนท่าถัดไป 3 วิ (มอนธรรมดาไม่มีสกิล = มึน 1 วิ แทน)
//   • Oath of the Lost Hand "ฮีลตัวเองไม่ได้" → ใช้ยาฟื้น HP ไม่ได้ (ดูดเลือด/รีเจนยังทำงาน)
// ============================================================
(() => {
  if (typeof Class3 === 'undefined') return;
  const C = Class3;
  const K = Object.assign(C.K, {
    // Lifeweaver
    l5_cap: lv => 0.03 * lv, l5_well_dur: 10,           // Well of Urd: ฮีลส่วนเกิน → โล่ ≤3%×Lv MaxHP (10 วิ)
    l5_th: lv => 2 + 1.6 * lv, l5_th_r: 8,               // Lifethread: ฮีลทุกวิ = ฐานฮีล × (3.6~10)
    l5_twin: 0.6, l5_taut: 0.3,
    l5_sp: lv => 3 + 2 * lv, l5_sp_r: 3,                 // Sap Spring: ฮีลทุกวิ = ฐานฮีล × (5~13)
    l5_cut_max: 0.4,                                      // Norn Cut: +40% เมื่อเป้าเลือดหมด (นับรวมเพดาน Hunt Rune)
    l5_leaf: 0.3,
    l5_well_heal: 1.25, l5_well_dmg: 0.85, l5_skuld: lv => 1.0 + 0.2 * lv, l5_skuld_r: 2.5, l5_skuld_icd: 0.6,
    l5_ult_regen: 6,
    // Oathfist
    o5_combo: 5, o5_window: 3, o5_free_k: 0.4,           // Holy Fist ฟรีแรง 40%
    o5_storm_k: 0.5, o5_storm_r: 2, o5_seal: 3, o5_seal_hits: 6,
    o5_lost_hp: 0.5, o5_lost_k: 1.2,
    o5_ult: 8, o5_ult_every: 3, o5_ult_r: 2, o5_ult_k: 1.2,
  });
  const P = () => G.player;
  const fast = () => !!G.fastSim;
  const lvOf = id => (G.player && G.player.skills[id]) || 0;
  const say = (o, t, c, big) => { if (!fast()) addFloater(o.x, o.y - 1.6, t, c, big); };
  const chosen = sk => typeof Runes !== 'undefined' && Runes.chosen(sk);
  const oath = sk => { const r = chosen(sk); return r ? r.oath || null : null; };
  const rune = sk => { const r = chosen(sk); return r ? r.c3w5 || null : null; };
  const isJob = j => !!G.player && G.player.job === j;
  const buffOn = id => { const p = P(), b = p && p.buffs[id]; return !!(b && b.until > G.time); };
  const tough = m => !!(m.def.boss || m.isPlayer);
  const healBase = () => { const p = P(); return (6 + (p.baseLv + p.d.int) / 6) * (1 + (p.d.healPct || 0) / 100); };

  // ------------------------------------------------------------
  //  ข้อมูล Class + สกิล
  // ------------------------------------------------------------
  Object.assign(THIRD_JOBS, { norn: 'lifeweaver', gythja: 'oathfist' });
  Object.assign(JOBS, {
    lifeweaver: { glow: '#d8f0ff', name: 'Urd Lifeweaver', thai: L('ผู้ทอชีวิตแห่งบ่ออูร์ด', 'Lifeweaver of the Well of Urd'), parent: 'norn', tier: 3,
      bonus: { atkPct: 15, matkPct: 20, hit: 15, hpPct: 15 }, hp: 1.55, sp: 2.0, jobMax: 60, aspd: 1350,
      outfit: '#fbf8f0', outfit2: '#a8c8f0', pants: '#6a7a9a', robe: true, jobHat: 'circlet',
      stats: 'INT / VIT', role: L('ฮีลเลอร์ด้ายชีวิต ฮีลเป็นพื้นที่ ฮีลเกินเป็นโล่', 'Thread Healer — Area Heals, Overheal Becomes a Shield'),
      desc: L('ผู้ส่งน้ำเลี้ยงระหว่างพี่น้องสองคนที่อยู่คนละฝั่งของความตาย ผูกด้ายชีวิต เปิดบ่อน้ำเลี้ยง และตัดด้ายของศัตรูด้วยกรรไกรของนอร์น',
        'One who carried the sap between two sisters on either side of death. She ties lifethreads, opens springs of sap, and cuts her foes\' threads with the Norns\' shears.'),
      skills: ['well_of_urd', 'lifethread', 'sap_spring', 'verdandis_now', 'norn_cut', 'leaf_recall'] },
    oathfist: { glow: '#ffd890', name: 'Tyr Oathfist', thai: L('หมัดสาบานแห่งทีร์', 'Oathfist of Tyr'), parent: 'gythja', tier: 3,
      bonus: { atkPct: 20, matkPct: 15, hit: 15, hpPct: 15 }, hp: 1.7, sp: 1.45, jobMax: 60, aspd: 1080,
      outfit: '#f4e8d0', outfit2: '#e08a30', pants: '#6a4a2a', jobHat: 'circlet',
      stats: 'STR / VIT', role: L('นักบวชหมัดคอมโบ ดึงเป้าด้วยโซ่ สาบานแลกพลัง', 'Combo Fist Priest — Chains Foes In, Trades Oaths for Power'),
      desc: L('ผู้เดินตามความคิดของมือที่ยอมเสียเพื่อล่ามสิ่งที่ต้องล่าม นับจังหวะหมัด ดึงเป้าด้วยโซ่ Gleipnir และแลกเลือดตัวเองเป็นแสงพิพากษา',
        'One who followed the thought of the hand given up to bind what had to be bound. He counts his strikes, drags foes in with Gleipnir\'s chain, and trades his own blood for judgment.'),
      skills: ['oath_of_tyr', 'hundred_palms', 'sun_pillar', 'iron_vow', 'chain_of_gleipnir', 'hand_of_sacrifice'] },
  });
  Object.assign(SKILLS, {
    // ===== Urd Lifeweaver =====
    well_of_urd: { name: 'Well of Urd', max: 5, type: 'passive', icon: '#c0e8ff', glyph: 'ᚢ',
      passive: lv => ({ healPct: 3 * lv, int: lv, mdef: lv }),
      desc: L('บ่ออูร์ด ฮีลแรง +3%×Lv INT +Lv MDEF +Lv • ฮีลที่เกิน HP เต็มกลายเป็นโล่ (สูงสุด 3%×Lv ของ MaxHP อยู่ 10 วิ)',
        'The Well of Urd. Healing +3%×Lv, INT +Lv, MDEF +Lv • healing past full HP becomes a shield (up to 3%×Lv of MaxHP, lasts 10s).') },
    lifethread: { name: 'Lifethread', max: 5, type: 'active', target: 'self', icon: '#ffe0a0', glyph: '〰', req: { well_of_urd: 1 },
      sp: lv => 24 + 3 * lv, delay: 600, cd: 16, selfFx: 'heal', c3w5thread: true,
      buff: { dur: () => 15, stats: lv => ({ mdef: lv }) },
      desc: L('ผูกด้ายชีวิต 15 วินาที ฮีลตัวเองทุกวินาที (ผู้ช่วยในระยะ 8 ช่องได้ด้วย) MDEF +Lv',
        'Tie a lifethread for 15s: heals you every second (allies within 8 cells too), MDEF +Lv.') },
    sap_spring: { name: 'Sap Spring', max: 5, type: 'active', target: 'self', icon: '#a0f0c0', glyph: '❦', req: { well_of_urd: 2 },
      sp: lv => 30 + 3 * lv, delay: 800, cd: 15, c3w5spring: true,
      desc: L('เปิดบ่อน้ำเลี้ยงรัศมี 3 ช่องที่เท้า 8 วินาที ยืนในบ่อฮีลทุกวินาที (แรงกว่าด้ายชีวิต)',
        'Open a spring of sap (3 cells) at your feet for 8s: standing in it heals every second (stronger than the lifethread).') },
    verdandis_now: { name: "Verdandi's Now", max: 5, type: 'active', target: 'self', icon: '#fff0c0', glyph: '⧗', req: { lifethread: 1 },
      sp: () => 22, delay: 500, cd: 20, selfFx: 'buff', c3w5now: true,
      buff: { dur: () => 6, stats: lv => ({ stunRes: 100, mdef: 2 * lv }) },
      desc: L('ปัจจุบันของแวร์ดันดี ล้างมึน/ช้า/พิษทันที + กันมึน/พิษ 6 วินาที MDEF +2×Lv',
        "Verdandi's Now: instantly clears stun/slow/poison, then blocks stun and poison for 6s, MDEF +2×Lv.") },
    norn_cut: { name: 'Norn Cut', max: 5, type: 'active', target: 'enemy', range: 9, icon: '#f0f0ff', glyph: '✂', req: { well_of_urd: 1 },
      sp: lv => 18 + 3 * lv, cast: () => 800, delay: 800, cd: 7, fx: 'holy', chain: true, c3w5cut: true,
      dmg: { type: 'magic', element: 'holy', mult: lv => 3.6 + 0.64 * lv, sureHit: true },
      desc: L('ตัดด้ายศัตรู 424~680% ธาตุศักดิ์สิทธิ์ ไม่พลาด • แรงขึ้นตาม HP ที่เป้าเสียไป (สูงสุด +40%)',
        "Cut a foe's thread for 424~680% Holy, never misses • stronger the more HP the target has lost (up to +40%).") },
    leaf_recall: { name: 'Leaf Recall', max: 5, type: 'active', target: 'self', icon: '#b0f0a0', glyph: '❧', req: { lifethread: 2 },
      sp: () => 30, delay: 500, cd: 120, selfFx: 'buff', c3w5leaf: true,
      buff: { dur: () => 60, stats: lv => ({ vit: 2 * lv }) },
      desc: L('ใบไม้รับไว้ 60 วินาที VIT +2×Lv • ถ้าจะล้ม ใบไม้รับไว้ ฟื้น 30% HP แทน (ครั้งเดียว)',
        'A leaf to catch you for 60s, VIT +2×Lv • if you would fall, the leaf catches you and you rise with 30% HP instead (once).') },
    // ===== Tyr Oathfist =====
    oath_of_tyr: { name: 'Oath of Tyr', max: 5, type: 'passive', icon: '#ffe0a0', glyph: 'ᛏ',
      passive: lv => ({ str: lv, hit: 2 * lv, def: lv }),
      desc: L('คำสาบานของทีร์ STR +Lv HIT +2×Lv DEF +Lv • ตีโดนครบ 5 ครั้งภายใน 3 วิ = Holy Fist ฟรี 1 ครั้ง (แรง 40% ไม่เกิน 1 ครั้งต่อ 3 วิ)',
        'The oath of Tyr. STR +Lv, HIT +2×Lv, DEF +Lv • every 5 hits landed within 3s fire a free Holy Fist (40% power, at most once per 3s).') },
    hundred_palms: { name: 'Hundred Palms', max: 5, type: 'active', target: 'enemy', melee: true, icon: '#ffd080', glyph: '✋', req: { oath_of_tyr: 1 },
      sp: lv => 20 + 2 * lv, delay: 900, cd: 6, fx: 'bash', chain: true, c3w5palm: true,
      dmg: { type: 'phys', mult: lv => 0.5 + 0.06 * lv, hits: 8, sureHit: true },
      desc: L('ฝ่ามือรัว 8 ครั้ง ครั้งละ 56~80% ไม่พลาด ครั้งสุดท้ายมึน 1 วินาที (บอส/ผู้เล่น: ได้แค่ดาเมจ)',
        'Strike 8 palms of 56~80% each that never miss; the last one stuns for 1s (bosses/players: damage only).') },
    sun_pillar: { name: 'Sun Pillar', max: 5, type: 'active', target: 'enemy', melee: true, icon: '#fff0a0', glyph: '☀', req: { oath_of_tyr: 2 },
      sp: lv => 22 + 2 * lv, delay: 800, cd: 8, fx: 'holy',
      dmg: { type: 'phys', element: 'holy', mult: lv => 1.8 + 0.3 * lv, area: 2.5, at: 'target' },
      desc: L('ทุบพื้นเป็นเสาแสงรัศมี 2.5 ช่อง 210~330% ธาตุศักดิ์สิทธิ์', 'Slam the ground into a pillar of light (2.5 cells) for 210~330% Holy.') },
    iron_vow: { name: 'Iron Vow', max: 5, type: 'active', target: 'self', icon: '#d0a060', glyph: '⛓', req: { oath_of_tyr: 3 },
      sp: () => 20, delay: 500, cd: 25, selfFx: 'buff', c3w5vow: true,
      buff: { dur: () => 10, stats: lv => ({ atk: 6 * lv, def: 3 * lv, leech: lv }) },
      desc: L('สาบานเหล็ก 10 วินาที ATK +6×Lv DEF +3×Lv ดูดเลือด +1%×Lv • ระหว่างสาบานใช้ยาฟื้น HP ไม่ได้',
        'An iron vow for 10s: ATK +6×Lv, DEF +3×Lv, lifesteal +1%×Lv • HP potions cannot be used while it lasts.') },
    chain_of_gleipnir: { name: 'Chain of Gleipnir', max: 5, type: 'active', target: 'enemy', range: 6, icon: '#c0c0d0', glyph: '⫘', req: { hundred_palms: 1 },
      sp: () => 16, delay: 600, cd: 8, fx: 'bash', chain: true, c3w5chain: true,
      dmg: { type: 'phys', mult: lv => 1.5 + 0.3 * lv, status: { kind: 'stun', chance: () => 100, dur: () => 1 } },
      desc: L('เหวี่ยงโซ่ Gleipnir ดึงเป้าระยะ ≤6 ช่องมาประชิด 180~300% มึน 1 วินาที (บอส/ผู้เล่น: ไม่ถูกดึง/ไม่มึน)',
        "Hurl Gleipnir's chain: drag a target up to 6 cells away into melee for 180~300% and stun for 1s (bosses/players: no pull, no stun).") },
    hand_of_sacrifice: { name: 'Hand of Sacrifice', max: 5, type: 'active', target: 'enemy', melee: true, icon: '#ffe8c0', glyph: '✋', req: { sun_pillar: 1 },
      sp: () => 12, hpCost: () => 15, delay: 1000, cd: 14, fx: 'holy', chain: true, c3w5hand: true,
      dmg: { type: 'phys', element: 'holy', mult: lv => 5.4 + 0.9 * lv, sureHit: true },
      desc: L('เสีย HP ปัจจุบัน 15% แลกหมัดพิพากษา 630~990% ธาตุศักดิ์สิทธิ์ ไม่พลาด',
        'Give up 15% of your current HP for a judgment fist of 630~990% Holy that never misses.') },
  });
  const NEW = ['well_of_urd', 'lifethread', 'sap_spring', 'verdandis_now', 'norn_cut', 'leaf_recall', 'oath_of_tyr', 'hundred_palms', 'sun_pillar', 'iron_vow', 'chain_of_gleipnir', 'hand_of_sacrifice'];
  for (const id of NEW) SKILLS[id].id = id;

  // ------------------------------------------------------------
  //  ฮีล (Lifeweaver): Well of Urd โล่ส่วนเกิน • Oath of the Well แรงขึ้น • Oath of Skuld ฮีลแตกเป็นแสง
  // ------------------------------------------------------------
  let itemNames = null;
  const isItem = label => !!label && (itemNames || (itemNames = new Set(Object.values(ITEMS).map(it => it.name)))).has(label);
  C.weave = amt => { const p = P(); if (!p || p.dead || amt <= 0) return; healPlayer(Math.round(amt), 'Lifeweave'); };
  const healAllies = (amt, r) => { const p = P(); for (const a of G.allies) if (!a.dead && a.hp > 0 && a.maxHp && U.dist(a.x, a.y, p.x, p.y) <= r) a.hp = Math.min(a.maxHp, a.hp + Math.round(amt)); };
  if (typeof healPlayer === 'function' && !healPlayer._c3w5) {
    const f0 = healPlayer;
    healPlayer = function (amt, label) { // eslint-disable-line no-global-assign
      const p = G.player;
      if (p && !p.dead && amt > 0 && isJob('lifeweaver')) {
        const item = isItem(label);
        if (!item && oath('well_of_urd') === 'well') amt = Math.round(amt * K.l5_well_heal);
        const lv = lvOf('well_of_urd'), over = p.hp + amt - p.d.maxHp;
        if (lv && over > 0) { const cap = Math.round(p.d.maxHp * K.l5_cap(lv)); p.c3well = Math.min(cap, (p.c3well || 0) + over); p.c3wellUntil = G.time + K.l5_well_dur; }
        if (!item && oath('well_of_urd') === 'skuld' && amt >= p.d.maxHp * 0.01 && Runes.icd('c3w5_skuld', K.l5_skuld_icd)) {
          const s = SKILLS.norn_cut, k = K.l5_skuld(lv || 1);
          for (const m of Runes.foes(p.x, p.y, K.l5_skuld_r)) Runes.hit(m, s, k, { type: 'magic', element: 'holy', color: '#fff8c0' });
          if (!fast()) addFx({ type: 'ring', x: p.x, y: p.y, dur: 0.4, r: K.l5_skuld_r, color: '255,248,200' });
        }
      }
      return f0.call(this, amt, label);
    };
    healPlayer._c3w5 = true;
  }
  // ดาเมจที่เราโดน: โล่ Well • Taut Thread ส่ง 30% ไปหาศัตรูที่ผูก • Leaf Recall รับไว้
  if (typeof damagePlayer === 'function' && !damagePlayer._c3w5) {
    const f0 = damagePlayer;
    damagePlayer = function (dmg, color, src) { // eslint-disable-line no-global-assign
      const p = G.player;
      if (p && !p.dead && dmg > 0 && isJob('lifeweaver')) {
        const tb = p.c3taut;
        if (tb && tb.until > G.time && tb.m && !tb.m.dead) { const sh = Math.round(dmg * K.l5_taut); dmg -= sh; if (sh > 0) damageMob(tb.m, sh, { src: 'lifethread', color: '#ffe0a0' }); }
        if (p.c3well > 0 && p.c3wellUntil > G.time) { const ab = Math.min(p.c3well, dmg); p.c3well -= ab; dmg -= ab; if (dmg <= 0) { say(p, 'Well', '#c0e8ff'); return; } }
        if (dmg >= p.hp && buffOn('leaf_recall')) {
          delete p.buffs.leaf_recall; recalc();
          p.hp = Math.max(1, Math.round(p.d.maxHp * K.l5_leaf)); say(p, 'LEAF RECALL', '#b0f0a0', true);
          if (!fast()) addFx({ type: 'heal', ref: p, dur: 1.1 });
          return;
        }
      }
      return f0.call(this, dmg, color, src);
    };
    damagePlayer._c3w5 = true;
  }
  // กันมึน (Verdandi's Now) • Oath of the Lost Hand / Iron Vow: ใช้ยาฟื้น HP ไม่ได้
  if (typeof stunPlayer === 'function' && !stunPlayer._c3w5) {
    const f0 = stunPlayer;
    stunPlayer = function () { if (isJob('lifeweaver') && buffOn('verdandis_now')) { say(P(), 'Now', '#fff0c0'); return; } return f0.apply(this, arguments); }; // eslint-disable-line no-global-assign
    stunPlayer._c3w5 = true;
  }
  const potionLocked = () => isJob('oathfist') && (buffOn('iron_vow') || oath('oath_of_tyr') === 'lost');
  if (typeof useItem === 'function' && !useItem._c3w5) {
    const f0 = useItem;
    useItem = function (entry) { // eslint-disable-line no-global-assign
      const it = entry && ITEMS[entry.id];
      if (it && it.heal && potionLocked()) { if (Runes.icd('c3w5_vowmsg', 2)) say(P(), L('สาบานไว้ — ใช้ยาไม่ได้', 'Sworn — no potions'), '#d0a060'); return; }
      return f0.apply(this, arguments);
    };
    useItem._c3w5 = true;
  }
  // Oath of the Open Hand: Hand of Sacrifice ใช้ SP แทน HP
  if (typeof skillDef === 'function' && !skillDef._c3w5) {
    const f0 = skillDef;
    skillDef = function () { // eslint-disable-line no-global-assign
      const s = f0.apply(this, arguments), p = G.player;
      if (!s || !p || !isJob('oathfist')) return s;
      if (s.c3w5hand && oath('oath_of_tyr') === 'open') { const d = Object.create(s); d.hpCost = null; d.sp = lv => 30 + 4 * lv; return d; }
      if (s.c3w5palm) {
        const rn = rune('hundred_palms');
        if (rn === 'storm') { const d = Object.create(s); d.dmg = Object.assign({}, s.dmg, { mult: lv => s.dmg.mult(lv) * K.o5_storm_k, area: K.o5_storm_r, at: 'self' }); return d; }
        if (rn === 'seal') { const d = Object.create(s); d.dmg = Object.assign({}, s.dmg, { hits: K.o5_seal_hits }); return d; }
      }
      if (C.ultOn('tyr') && s.dmg && s.dmg.type === 'phys' && !s.dmg.element) { const d = Object.create(s); d.dmg = Object.assign({}, s.dmg, { element: 'holy' }); return d; }
      return s;
    };
    skillDef._c3w5 = true;
  }
  const FREE = { id: 'oath_of_tyr', dmg: SKILLS.holy_fist.dmg }; // Holy Fist ฟรี — นับดาเมจแยกเป็นของ Oath of Tyr
  // คอมโบ Oath of Tyr: ตีโดน 5 ครั้งใน 3 วิ = Holy Fist ฟรี • ULT TYR'S JUDGMENT: ทุกครั้งที่ 3 กระแทกรอบ 2 ช่อง
  if (typeof applyHit === 'function' && !applyHit._c3w5) {
    const f0 = applyHit;
    applyHit = function (m, r, opts) { // eslint-disable-line no-global-assign
      const out = f0.apply(this, arguments), p = G.player;
      if (p && r && !r.miss && r.phys && isJob('oathfist') && lvOf('oath_of_tyr') && opts && opts.src && !opts.dot && !C._free && m && !m.dead) {
        const c = p.c3combo && G.time - p.c3combo.at <= K.o5_window ? p.c3combo : { n: 0 };
        c.n++; c.at = G.time; p.c3combo = c;
        if (c.n >= K.o5_combo && Runes.icd('c3w5_free', K.o5_window)) { // ได้ไม่เกิน 1 ครั้งต่อ 3 วิ — ตีหมู่/ฝ่ามือรัวไม่ให้ยิงฟรีรัว
          c.n = 0;
          const s = SKILLS.holy_fist, lv = lvOf('holy_fist') || lvOf('oath_of_tyr');
          C._free = true; try { Runes.hit(m, FREE, s.dmg.mult(lv) * K.o5_free_k, { element: 'holy', color: '#fff0a0', sureHit: true }); } finally { C._free = false; }
          say(m, 'HOLY FIST', '#fff0a0');
        }
        if (C.ultOn('tyr') && (p.c3tyrN = (p.c3tyrN || 0) + 1) % K.o5_ult_every === 0) {
          C._free = true;
          try { for (const o of Runes.foes(m.x, m.y, K.o5_ult_r)) Runes.hit(o, SKILLS.sun_pillar, K.o5_ult_k, { element: 'holy', color: '#ffe080', sureHit: true }); } finally { C._free = false; }
          if (!fast()) addFx({ type: 'ring', x: m.x, y: m.y, dur: 0.35, r: K.o5_ult_r, color: '255,230,140' });
        }
      }
      return out;
    };
    applyHit._c3w5 = true;
  }

  // ------------------------------------------------------------
  //  จุดเกาะ Runes (ห่อต่อจาก js/class3_wave4.js)
  // ------------------------------------------------------------
  const RU = Runes;
  { const f0 = RU.preCast;
    RU.preCast = function (s, lv, tgt) {
      const p = P();
      if (p && s && s.c3w5now) { p.stunUntil = 0; p.slowUntil = 0; p.poisonUntil = 0; p.flinchUntil = 0; }
      if (p && s && s.c3w5palm) p.c3palm = { n: 0, hits: (s.dmg.hits || 8) };
      return f0.apply(this, arguments);
    }; }
  { const f0 = RU.onCast;
    RU.onCast = function (s, lv, tgt) {
      const p = P();
      if (s.c3w5thread) {
        const rn = rune('lifethread');
        p.c3thread = { until: G.time + 15, lv, next: G.time + 0.5, k: rn === 'twin' ? K.l5_twin : 1, heal: rn !== 'taut' };
        if (rn === 'taut') { const m = p.target && !p.target.dead ? p.target : Runes.foes(p.x, p.y, 8)[0]; p.c3taut = m ? { m, until: G.time + 15 } : null; if (m) say(m, 'TAUT', '#ffe0a0'); }
      }
      if (s.c3w5spring) {
        const at = { x: p.x, y: p.y };
        Runes.zone({ skill: s.id, x: at.x, y: at.y, r: K.l5_sp_r, until: G.time + 8, every: 1, first: 0.3, rgb: '160,240,190',
          tick: () => { const amt = healBase() * K.l5_sp(lv); if (U.dist(p.x, p.y, at.x, at.y) <= K.l5_sp_r) C.weave(amt); for (const a of G.allies) if (!a.dead && a.hp > 0 && a.maxHp && U.dist(a.x, a.y, at.x, at.y) <= K.l5_sp_r) a.hp = Math.min(a.maxHp, a.hp + Math.round(amt)); } });
      }
      if (s.c3w5chain && tgt && !tgt.dead && !tough(tgt)) Runes.pull(tgt, p.x, p.y, 1.0);
      return f0.apply(this, arguments);
    }; }
  { const f0 = RU.hitMul;
    RU.hitMul = function (s, lv, m) {
      let k = f0.apply(this, arguments);
      const p = P(); if (!p || !m) return k;
      if (s.c3w5cut && m.maxHp) k *= 1 + K.l5_cut_max * Math.max(0, 1 - m.hp / m.maxHp);
      if (isJob('lifeweaver') && oath('well_of_urd') === 'well') k *= K.l5_well_dmg;
      if (isJob('oathfist') && oath('oath_of_tyr') === 'lost' && p.hp < p.d.maxHp * K.o5_lost_hp) k *= K.o5_lost_k;
      return k;
    }; }
  { const f0 = RU.afterHit;
    RU.afterHit = function (s, lv, m, r) {
      f0.apply(this, arguments);
      const p = P();
      if (!s.c3w5palm || !p || !p.c3palm) return;
      p.c3palm.n++;
      if (p.c3palm.n !== p.c3palm.hits || !m || m.dead || !r || r.miss) return;
      if (rune('hundred_palms') === 'seal') { if (m.def.boss) m.nextBossSkill = Math.max(m.nextBossSkill || 0, G.time + K.o5_seal); else if (!m.isPlayer) m.stunUntil = Math.max(m.stunUntil || 0, G.time + 1); say(m, 'SEALED', '#ffd080'); }
      else if (!tough(m)) { m.stunUntil = Math.max(m.stunUntil || 0, G.time + 1); m.path = []; m.moving = false; }
    }; }
  { const f0 = RU.update;
    RU.update = function () {
      f0.apply(this, arguments);
      const p = P(); if (!p || p.dead) return;
      if (!isJob('lifeweaver')) return;
      const th = p.c3thread;
      if (th && th.until > G.time && th.heal && G.time >= th.next) {
        th.next = G.time + 1;
        const amt = healBase() * K.l5_th(th.lv) * th.k;
        C.weave(amt); healAllies(amt, K.l5_th_r);
      }
      if (p.c3well > 0 && !(p.c3wellUntil > G.time)) p.c3well = 0;
      if (C.ultOn('norns') && G.time >= (p.c3nornsAt || 0)) { p.c3nornsAt = G.time + 0.5; C.weave(p.d.maxHp * 0.04); healAllies(p.d.maxHp * 0.04, 8); }
      if (buffOn('verdandis_now')) p.poisonUntil = 0;
    }; }

  // ------------------------------------------------------------
  //  Oath (สกิลติดตัว) + รูนสกิลประจำตัว ★
  // ------------------------------------------------------------
  const pc = v => Math.round(v * 100);
  const keepP = id => () => ({ passive: SKILLS[id].passive });
  Runes.add('well_of_urd', [
    { id: 'well_of_urd.well', name: 'Of the Well', oath: 'well', intent: 'pack', glyph: 'ᚢ', col: '#c0e8ff',
      short: `Oath: heals ${pc(K.l5_well_heal)}% · damage ${pc(K.l5_well_dmg)}%`,
      desc: () => L(`Oath of the Well — ฮีลแรง ${pc(K.l5_well_heal)}% แต่ดาเมจสกิลเหลือ ${pc(K.l5_well_dmg)}% — สายปาร์ตี้/ผู้ช่วย`, `Oath of the Well — healing at ${pc(K.l5_well_heal)}%, but skill damage drops to ${pc(K.l5_well_dmg)}% — the party/ally path.`),
      mod: keepP('well_of_urd') },
    { id: 'well_of_urd.skuld', name: 'Of Skuld', oath: 'skuld', intent: 'single', glyph: 'ᛋ', col: '#fff8c0',
      short: `Oath: each heal bursts Holy around you (${K.l5_skuld_r} cells)`,
      desc: () => L(`Oath of Skuld — ทุกครั้งที่ฮีล (ไม่นับยา) แสงแตกออกใส่ศัตรูรอบตัว ${K.l5_skuld_r} ช่อง ธาตุศักดิ์สิทธิ์ (พัก ${K.l5_skuld_icd} วิ) — นักบวชสายบู๊ เล่นคนเดียวได้`,
        `Oath of Skuld — every heal (not potions) bursts into Holy damage on foes within ${K.l5_skuld_r} cells (${K.l5_skuld_icd}s cooldown) — the battle-healer path, fine solo.`),
      mod: keepP('well_of_urd') },
  ]);
  Runes.add('lifethread', [
    { id: 'lifethread.twin', name: 'Twin Thread', c3w5: 'twin', intent: 'pack', glyph: '≈', col: '#ffe0a0',
      short: `Thread heals ${pc(K.l5_twin)}% · reaches every ally in range`,
      desc: () => L(`ด้ายสองเส้น ฮีลเส้นละ ${pc(K.l5_twin)}% — ตัวเรา + ผู้ช่วยทุกตัวในระยะ ${K.l5_th_r} ช่อง`, `Two threads at ${pc(K.l5_twin)}% each — you plus every ally within ${K.l5_th_r} cells.`) },
    { id: 'lifethread.taut', name: 'Taut Thread', c3w5: 'taut', intent: 'single', glyph: '⟷', col: '#ffc080',
      short: `Bind a foe: ${pc(K.l5_taut)}% of damage you take goes to it · no heal`,
      desc: () => L(`ผูกด้ายกับศัตรูแทน ${pc(K.l5_taut)}% ของดาเมจที่เราโดนส่งไปหามัน 15 วินาที (ไม่มีฮีลต่อเนื่อง)`, `Bind the thread to a foe instead: ${pc(K.l5_taut)}% of the damage you take is sent to it for 15s (no healing).`) },
  ]);
  Runes.add('oath_of_tyr', [
    { id: 'oath_of_tyr.open', name: 'Of the Open Hand', oath: 'open', intent: 'pack', glyph: '✋', col: '#ffe8c0',
      short: 'Oath: Hand of Sacrifice costs SP, not HP',
      desc: () => L('Oath of the Open Hand — Hand of Sacrifice ใช้ SP แทน HP — สายปลอดภัย', 'Oath of the Open Hand — Hand of Sacrifice costs SP instead of HP — the safe path.'),
      mod: keepP('oath_of_tyr') },
    { id: 'oath_of_tyr.lost', name: 'Of the Lost Hand', oath: 'lost', intent: 'single', glyph: 'ᛏ', col: '#e08a30',
      short: `Oath: below ${pc(K.o5_lost_hp)}% HP skills ×${K.o5_lost_k} · no HP potions`,
      desc: () => L(`Oath of the Lost Hand — HP ต่ำกว่า ${pc(K.o5_lost_hp)}% สกิลแรง ×${K.o5_lost_k} แต่ใช้ยาฟื้น HP ไม่ได้ (ดูดเลือดยังทำงาน)`, `Oath of the Lost Hand — below ${pc(K.o5_lost_hp)}% HP your skills hit ×${K.o5_lost_k}, but HP potions are forbidden (lifesteal still works).`),
      mod: keepP('oath_of_tyr') },
  ]);
  Runes.add('hundred_palms', [
    { id: 'hundred_palms.storm', name: 'Palm Storm', c3w5: 'storm', intent: 'pack', glyph: '✺', col: '#ffd080',
      short: `Spins around you (${K.o5_storm_r} cells) · ${pc(K.o5_storm_k)}% per palm`,
      desc: () => L(`ฝ่ามือหมุนรอบตัว ${K.o5_storm_r} ช่อง ครั้งละ ${pc(K.o5_storm_k)}% ของเดิม`, `The palms spin around you (${K.o5_storm_r} cells) at ${pc(K.o5_storm_k)}% each.`) },
    { id: 'hundred_palms.seal', name: 'Seal', c3w5: 'seal', intent: 'single', glyph: '⊗', col: '#e0b060',
      short: `${K.o5_seal_hits} palms · the last seals the target ${K.o5_seal}s`,
      desc: () => L(`${K.o5_seal_hits} ครั้ง ครั้งสุดท้ายผนึกเป้า — บอสใช้ท่าไม่ได้ ${K.o5_seal} วินาที (มอนธรรมดา: มึน 1 วิ)`, `${K.o5_seal_hits} palms; the last seals the target — a boss cannot use its moves for ${K.o5_seal}s (normal monsters: stunned 1s).`) },
  ]);

  // ------------------------------------------------------------
  //  ไม้ตายตัวเลือกที่ 4
  // ------------------------------------------------------------
  if (typeof Feel !== 'undefined' && Feel.ULTS) {
    Feel.ULTS.norns = { job: 'lifeweaver', name: 'THREAD OF THE NORNS', th: L('ด้ายแห่งนอร์น', 'Thread of the Norns'),
      desc: L(`ฟื้น HP เต็ม + ฮีลต่อเนื่อง ${K.l5_ult_regen} วินาที (ตัวเรา + ผู้ช่วยระยะ 8)`, `Restore full HP + heal over ${K.l5_ult_regen}s (you + allies within 8 cells)`),
      fire(p, col) { p.c3ult = { kind: 'norns', until: G.time + K.l5_ult_regen }; p.c3nornsAt = 0; p.hp = p.d.maxHp; healAllies(1e9, 8); addFloater(p.x, p.y - 2, 'THREAD OF THE NORNS!', col || '#d8f0ff', true); } };
    Feel.ULTS.tyr = { job: 'oathfist', name: "TYR'S JUDGMENT", th: L('การพิพากษาของทีร์', "Tyr's Judgment"),
      desc: L(`${K.o5_ult} วินาที: ทุกหมัดเป็นธาตุศักดิ์สิทธิ์ + ตีโดนทุกครั้งที่ ${K.o5_ult_every} กระแทกรอบ ${K.o5_ult_r} ช่อง`, `${K.o5_ult}s: every fist turns Holy + every ${K.o5_ult_every}rd hit bursts within ${K.o5_ult_r} cells`),
      fire(p, col) { p.c3ult = { kind: 'tyr', until: G.time + K.o5_ult }; addFloater(p.x, p.y - 2, "TYR'S JUDGMENT!", col || '#ffd890', true); } };
  }

  // ------------------------------------------------------------
  //  เควสต์ทดสอบ (เงาแม่พิมพ์)
  // ------------------------------------------------------------
  const NB = s => (typeof B === 'function' ? B(s) : `<b>${s}</b>`);
  Object.assign(C.TRIAL, {
    lifeweaver: { npc: 'nurse', map: 'eldheim', place: 'Eldheim', who: 'Eir',
      thought: L('"ซ่อม ไม่ใช่ย้อนกลับ"', '"Mend. Don\'t rewind."'),
      meet: L(`(Eir วางเครื่องมือลง) ข้าซ่อมร่างได้ทุกร่าง แต่ส่งน้ำเลี้ยงไปฝั่ง Hel ไม่ได้ — คนที่เคยทำได้ทิ้งความคิดไว้ว่า ${NB('"ซ่อม ไม่ใช่ย้อนกลับ"')}<br>(ด้ายสีทองเส้นหนึ่งตึงขึ้นจากพื้น — ปลายด้ายมีเงาถือคทากระสวยยืนรออยู่)`,
        `(Eir sets down her tools) I can repair any frame, but I cannot carry sap to Hel's side — the one who could left a thought: ${NB('"Mend. Don\'t rewind."')}<br>(A golden thread pulls taut from the floor — at its end a shadow with a spindle staff is waiting)`) },
    oathfist: { npc: 'refine', map: 'eldheim', place: 'Eldheim', who: 'Brokk',
      thought: L('"มือที่ยอมเสียเพื่อล่ามสิ่งที่ต้องล่าม"', '"The hand given up to bind what must be bound."'),
      meet: L(`(Brokk ยกโซ่เส้นเล็กบางเหมือนเส้นไหมขึ้นมา) Gleipnir... ข้าตีมันไม่ได้ ข้าแค่ซ่อมข้อที่ขาด คนที่ล่ามสุนัขยักษ์ด้วยมันเสียมือไปข้างหนึ่ง ความคิดของเขาคือ ${NB('"มือที่ยอมเสียเพื่อล่ามสิ่งที่ต้องล่าม"')}<br>(เงาไร้มือขวาก้าวออกจากเตาหลอม — มันกำหมัดซ้ายแน่น)`,
        `(Brokk lifts a chain as thin as silk) Gleipnir... I could never forge it, only mend its broken links. The one who bound the great hound with it lost a hand. His thought was ${NB('"The hand given up to bind what must be bound."')}<br>(A shadow missing its right hand steps out of the forge — its left fist clenched)`) },
  });
  if (typeof C.install === 'function') C.install();

  // ------------------------------------------------------------
  //  บอท: ด้ายชีวิต/บ่อน้ำเมื่อเลือดลด • Verdandi เมื่อโดนมึน • Chain ดึงตัวไกล • Hand of Sacrifice เมื่อเลือดพอ
  // ------------------------------------------------------------
  if (typeof Bot !== 'undefined') {
    const pick0 = Bot.pickSkill;
    Bot.pickSkill = function (t, threats, hpPct, spPct) {
      const p = G.player;
      if (isJob('lifeweaver')) {
        if (hpPct < 70 && lvOf('sap_spring') && this.canCast('sap_spring')) return 'sap_spring';
        if (hpPct < 85 && lvOf('lifethread') && !(p.c3thread && p.c3thread.until > G.time) && this.canCast('lifethread')) return 'lifethread';
        if (hpPct < 45 && lvOf('leaf_recall') && this.canCast('leaf_recall')) return 'leaf_recall';
      }
      if (isJob('oathfist') && t) {
        if (lvOf('chain_of_gleipnir') && !tough(t) && U.dist(t.x, t.y, p.x, p.y) > 2.5 && this.canCast('chain_of_gleipnir')) return 'chain_of_gleipnir';
        if (lvOf('hand_of_sacrifice') && hpPct > 60 && this.canCast('hand_of_sacrifice')) return 'hand_of_sacrifice';
      }
      return pick0.apply(this, arguments);
    };
  }

  // ------------------------------------------------------------
  //  ภาพ: ย้อมจาก Class 2 จนกว่าจะมีภาพจริง (prompt docs/CLASS3_ART.md)
  // ------------------------------------------------------------
  if (typeof Art !== 'undefined') {
    const ART = { lifeweaver: ['norn', { hue: 40, sat: 0.85, bri: 1.1, tint: ['#c8f0ff', 0.22] }], oathfist: ['gythja', { hue: 10, sat: 1.15, bri: 1.04, tint: ['#ffc060', 0.2] }] };
    for (const [id, [base, spec]] of Object.entries(ART)) {
      for (const g of ['f', 'm']) Art.alias(`job_${id}_${g}`, `job_${base}_${g}`, Object.assign({ flip: true }, spec));
      Art.alias(`emblem_${id}`, `emblem_${base}`, spec);
    }
    const SRC = {
      lifeweaver: [['well_of_urd', 'wyrd_thread', 30], ['lifethread', 'fate_weave', -20], ['sap_spring', 'great_restoration', 20], ['verdandis_now', 'fate_weave', 40], ['norn_cut', 'skuld_judgment', 200], ['leaf_recall', 'great_restoration', -40]],
      oathfist: [['oath_of_tyr', 'iron_faith', 15], ['hundred_palms', 'triple_palm', -10], ['sun_pillar', 'divine_burst', 20], ['iron_vow', 'zen_body', 160], ['chain_of_gleipnir', 'holy_fist', 200], ['hand_of_sacrifice', 'divine_burst', -25]],
    };
    for (const job in SRC) SRC[job].forEach(([id, from, hue], i) => Art.alias('skill_' + id, 'skill_' + from, { hue, sat: 1.15, bri: i % 2 ? 1.0 : 1.06, flip: i % 2 === 0, tint: [JOBS[job].glow, 0.14] }));
  }
  if (typeof CLASSBOOK !== 'undefined') Object.assign(CLASSBOOK, {
    lifeweaver: { diff: 2, weapon: L('คทากระสวยทอผ้า', 'Spindle staff'), stats: [['int', 55], ['vit', 30], ['dex', 15]],
      build: [['well_of_urd', 5], ['norn_cut', 5], ['lifethread', 5], ['sap_spring', 5], ['leaf_recall', 4], ['verdandis_now', 1]],
      play: L('ผูก Lifethread ก่อนเข้าฝูง • ยืนสู้ใน Sap Spring ให้ฮีลเกินเป็นโล่ • ตัดตัวที่เลือดน้อยด้วย Norn Cut • เก็บ Leaf Recall ไว้กันล้ม',
        'Tie a Lifethread before the fight • fight inside a Sap Spring so overheal turns into a shield • finish wounded foes with Norn Cut • keep Leaf Recall up as a safety net.'),
      pros: L('อึดมาก ฟื้นตัวเองตลอด', 'Extremely sustainable, constant self-healing'), cons: L('ดาเมจต่ำกว่าสายตี', 'Lower damage than the fighting lines'),
      tips: L('Oath of Skuld = เล่นคนเดียว ฮีลแตกเป็นดาเมจ • Oath of the Well = มีผู้ช่วย/ปาร์ตี้', 'Oath of Skuld for solo play (heals burst into damage) • Oath of the Well with allies/party.') },
    oathfist: { diff: 2, weapon: L('ถุงมือเหล็กทองข้างขวา + โซ่พันข้อมือซ้าย', 'Golden iron right gauntlet + chained left wrist'), stats: [['str', 50], ['vit', 30], ['agi', 20]],
      build: [['oath_of_tyr', 5], ['hundred_palms', 5], ['sun_pillar', 5], ['hand_of_sacrifice', 5], ['chain_of_gleipnir', 4], ['iron_vow', 1]],
      play: L('Chain of Gleipnir ดึงตัวไกลเข้ามา • Hundred Palms นับคอมโบ (ทุก 5 หมัด = Holy Fist ฟรี) • ฝูงใช้ Sun Pillar • เลือดเต็มใช้ Hand of Sacrifice',
        'Pull distant foes in with Chain of Gleipnir • Hundred Palms builds the combo (every 5 hits = a free Holy Fist) • Sun Pillar for packs • spend HP on Hand of Sacrifice while healthy.'),
      pros: L('คอมโบลื่น ดาเมจเดี่ยวสูง', 'Fluid combos, high single-target damage'), cons: L('ต้องประชิด แลกเลือดตัวเอง', 'Melee only, spends its own HP'),
      tips: L('Oath of the Open Hand = เล่นปลอดภัย • Oath of the Lost Hand = เลือดต่ำแรงขึ้น ห้ามกินยา', 'Oath of the Open Hand for safe play • Oath of the Lost Hand: stronger at low HP, no potions.') },
  });
})();
