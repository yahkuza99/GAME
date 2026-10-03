'use strict';
// ============================================================
//  ชุดสกิลบอส (Boss Kit) — บอสทุกตัวมีท่าชุดของตัวเอง + เรียกลูกสมุน • บอส 2 ระดับ
//  โหลดหลัง js/worldboss.js (ต้องมี MOBS ของ World Boss แล้ว) • เกี่ยวเข้าเกมผ่าน BossKit.update / rotation / onSpawn (js/game.js)
//
//  ระดับ 1 = MVP ประจำแผนที่ (ความแรงเดิม) — ท่าสลับ 4–5 ท่า (ทุกท่ามีป้ายแดงเตือน ≥ 1 วิ หลบได้หมด) + เรียกลูกสมุนทีละ 2 (คูลดาวน์ 40 วิ หรือทันทีเมื่อเลือดผ่าน 75/50/25% • ค้างได้สูงสุด 3 อยู่ได้ 30 วิ)
//  ระดับ 2 = Ancient (World Boss, worldboss.js: HP/ATK ต่อบอสใน WB.TUNE — ATK ×1.5–2, HP ×6–100 ของ MVP จูนให้ปาร์ตี้ 5 คนล้มได้ ~10–15 นาที)
//     • ป้ายใหญ่ขึ้น 25% / ร่ายเร็วขึ้น (ป้ายสั้นลง 10% แต่ไม่ต่ำกว่า 1 วิ) / ร่ายถี่ขึ้น 15% • มีท่าเฉพาะ Ancient 1 ท่า
//     • ลูกสมุนแรงขึ้น เรียกทีละ 3 ตัว ทุก ~20 วิ (ค้างได้สูงสุด 6 อยู่ได้ 45 วิ)
//     • คลั่ง 2 ช่วง (ตามเลือดที่ใช้ร่วมกันทั้งแผนที่): 50% → ท่าแรงขึ้น 20% ร่ายถี่ขึ้น + ลูกสมุนชั้นยอด 2 ตัว
//                                                  20% → ท่าแรงขึ้น 35% ร่ายถี่สุด + ชั้นยอด 3 ตัว + ใช้ท่าไม้ตายทันที
//  ความยุติธรรม: ท่า/ตีปกติของบอสครั้งเดียวแรงไม่เกิน 60% MaxHP (bossDmg / mobAttack ใน game.js) • ไม่มีท่าที่หลบไม่ได้ • ลูกสมุนไม่มีรางวัล (killMob ใน game.js)
//  ออนไลน์: มอนทุกตัว (รวมบอสโลก) จำลองในเครื่องใครเครื่องมัน มีแค่ "เลือดบอสโลก" ที่ส่งหากัน → ลูกสมุนเป็นของในเครื่องล้วน ๆ
//     ไม่ส่งผ่านเครือข่าย ไม่ทำให้ข้อมูลเพี้ยน • ช่วงคลั่งคิดจากเลือดร่วม จึงเริ่มพร้อม ๆ กันทุกเครื่อง • เข้ามากลางศึก = เข้าช่วงที่ถูกต้องเงียบ ๆ
// ============================================================
const BossKit = (() => {
  const K = {};
  const vis = () => !G.fastSim && typeof document !== 'undefined';
  const sfxOn = () => vis() && typeof Sound !== 'undefined' && Sound.ctx && G.player && G.player.options.sound && !document.hidden;

  // ---------- ลูกสมุน: มอนสีต่างแบบเบา (EXP/ดรอป/Zeny = 0) ----------
  const VISUAL = ['sprite', 'look', 'variant', 'color', 'color2', 'size', 'scale', 'wings', 'tusk', 'glow', 'skin', 'face', 'outfit', 'hair',
    'viking', 'joint', 'bones', 'weapon', 'hood', 'halfskull', 'fox', 'jiangshi'];
  const variant = (base, def) => {
    const b = MOBS[base], v = { base, hue: def.hue, sat: def.sat, bri: def.bri, tint: def.tint };
    for (const k of VISUAL) if (b[k] !== undefined) v[k] = b[k];
    const spec = { hue: def.hue, sat: def.sat, bri: def.bri, tint: def.tint }, dye = c => (typeof Art !== 'undefined' && Art.tintHex ? Art.tintHex(c, spec) : c);
    for (const k of ['color', 'color2', 'glow', 'skin', 'face', 'outfit', 'hair', 'joint', 'hood']) if (typeof v[k] === 'string') v[k] = dye(v[k]);
    if (v.look) { v.look = Object.assign({}, v.look); for (const k in v.look) if (typeof v.look[k] === 'string') v.look[k] = dye(v.look[k]); }
    return Object.assign(v, def);
  };
  const MINION = { exp: 0, jexp: 0, zeny: [0, 0], drops: [], aggro: true, minion: true, hpBoosted: true, dropsTuned: true, wbTuned: true, lootPatched: true };
  const addMinion = (id, base, def) => {
    if (!MOBS[base]) return;
    MOBS[id] = variant(base, Object.assign({}, MINION, def));
    // Ancient: ลูกสมุนรุ่นแรงขึ้น (Lv +10) และ "ชั้นยอด" (ออกตอนบอสคลั่ง)
    const n = MOBS[id];
    MOBS[id + '_a'] = Object.assign({}, n, { lv: n.lv + 10, hp: Math.round(n.hp * 2), atk: [Math.round(n.atk[0] * 1.6), Math.round(n.atk[1] * 1.6)], hit: n.hit + 15 });
    const a = MOBS[id + '_a'];
    MOBS[id + '_e'] = Object.assign({}, a, { name: `Elite ${n.name}`, hp: a.hp * 3, atk: [Math.round(a.atk[0] * 1.3), Math.round(a.atk[1] * 1.3)], def: Math.min(60, a.def + 15), mdef: Math.min(60, a.mdef + 10),
      scale: (n.scale || 1) * 1.3, elite: true, bri: (n.bri || 1) * 1.12 });
    for (const k of [id, id + '_a', id + '_e']) MOBS[k].id = k;
  };
  // Seraph Core (Lv 25, Mistlake): ก้อนเจลเทวดา + ภูตวงแหวน
  addMinion('mn_cherub', 'moss_pudding', { name: 'Cherub Gel', lv: 22, hp: 220, atk: [30, 40], def: 5, mdef: 20, vit: 15, flee: 30, hit: 55, speed: 1.8, element: 'holy', race: 'angel',
    scale: 0.85, hue: 25, sat: 0.55, bri: 1.25, tint: ['#ffe27a', 0.35] });
  addMinion('mn_halo', 'buzzfly', { name: 'Halo Sprite', lv: 22, hp: 150, atk: [32, 42], def: 0, mdef: 15, vit: 10, flee: 50, hit: 60, speed: 2.6, element: 'holy', race: 'angel',
    hue: 15, sat: 0.6, bri: 1.4, tint: ['#fff3c4', 0.4] });
  // Kitsura EX (Lv 45, Hel's Hollow): วิญญาณจิ้งจอกไฟ + สาวใช้แห่งเฮล
  addMinion('mn_foxfire', 'ashtail', { name: 'Foxfire Spirit', lv: 40, hp: 480, atk: [70, 88], def: 10, mdef: 15, vit: 30, flee: 70, hit: 100, speed: 2.4, element: 'fire', race: 'demon',
    hue: -170, sat: 2.2, bri: 1.2, tint: ['#ff7a1a', 0.55] });
  addMinion('mn_handmaiden', 'hel_maiden', { name: 'Hel Handmaiden', lv: 40, hp: 650, atk: [72, 90], def: 20, mdef: 30, vit: 30, flee: 60, hit: 100, speed: 1.6, element: 'undead', race: 'undead',
    hue: -150, sat: 1.4, tint: ['#e8602a', 0.3] });
  // Garmr (Lv 60, Gnawed Roots): ลูกหมาป่าของ Garmr + ศพล่ามโซ่
  addMinion('mn_whelp', 'fenrir_pup', { name: 'Garmr Whelp', lv: 54, hp: 800, atk: [115, 140], def: 20, mdef: 25, vit: 45, flee: 90, hit: 140, speed: 2.6, element: 'shadow', race: 'brute',
    scale: 0.85, hue: 180, bri: 0.7, tint: ['#6a0a0a', 0.4] });
  addMinion('mn_chained', MOBS.rust_draugr ? 'rust_draugr' : 'draugr', { name: 'Chained Draugr', lv: 54, hp: 1100, atk: [120, 145], def: 25, mdef: 20, vit: 50, flee: 60, hit: 130, speed: 1.2, element: 'undead', race: 'undead',
    hue: 150, sat: 0.8, bri: 0.75, tint: ['#5a1008', 0.35] });

  // ---------- ชุดท่าของบอสแต่ละตัว ----------
  // rot = ลำดับท่า MVP • wbRot = ลำดับท่า Ancient • ult = ท่าเฉพาะ Ancient (ใช้ทันทีตอนคลั่งช่วง 2)
  // minions = ลูกสมุนที่เรียก (สลับกัน) • elite = ลูกสมุนชั้นยอด (Ancient คลั่ง) • col = สีวงเรียก/ออร่า
  K.KITS = {
    seraph_pudding: { col: '255,226,122', hex: '#ffe27a', rot: ['shockwave', 'heal', 'holycross', 'halodrops'], wbRot: ['shockwave', 'holycross', 'judgment', 'halodrops'], ult: 'judgment',
      minions: ['mn_cherub', 'mn_halo'], elite: 'mn_cherub', cry: L('ลูก ๆ ของข้า ลงมา!', 'Descend, my little ones!') },
    kitsura: { col: '255,150,60', hex: '#ffae40', rot: ['firestorm', 'slam', 'shockwave', 'foxfan', 'foxfire'], wbRot: ['firestorm', 'pinwheel', 'foxfan', 'foxfire', 'slam', 'shockwave'], ult: 'pinwheel',
      minions: ['mn_foxfire', 'mn_handmaiden'], elite: 'mn_foxfire', cry: L('จิ้งจอกทั้งเก้า ตื่นเถิด!', 'Nine tails — awaken!') },
    garmr: { col: '230,70,50', hex: '#ff5a3a', rot: ['rootquake', 'slam', 'shockwave', 'pounce', 'maw'], wbRot: ['rootquake', 'hunt', 'maw', 'pounce', 'shockwave', 'slam'], ult: 'hunt',
      minions: ['mn_whelp', 'mn_chained'], elite: 'mn_whelp', cry: L('อาวู้ววว — ฝูงของข้า!', 'AWOOOO — to me, pack!') },
  };
  // ชุดท่าจากไฟล์เนื้อหา (เช่น js/content_ch7.js — Nidhogg): window.BOSSKIT_EXTRA = [(K, addMinion) => { ... K.KITS.<id> = {...} }]
  for (const f of (typeof window !== 'undefined' && window.BOSSKIT_EXTRA) || []) f(K, addMinion);
  // บอสในอนาคตที่ยังไม่มีชุดท่า: ใช้ท่ากลาง + ลูกสมุนจากมอนในแผนที่ของมันเอง (สร้างรุ่นเบาให้อัตโนมัติ)
  K.autoKit = d => {
    const id = d.id, map = Object.keys(MAP_DEFS).find(k => MAP_DEFS[k].mvp === id);
    const pool = map ? (MAP_DEFS[map].spawns || []).map(s => s[0]).filter(x => MOBS[x] && !MOBS[x].boss) : [];
    const mins = pool.slice(-2).map(src => {
      const mid = 'mn_auto_' + src;
      if (!MOBS[mid]) { const s = MOBS[src]; addMinion(mid, src, { name: `${s.name} Minion`, lv: s.lv, hp: Math.round(s.hp * 0.5), atk: [Math.round(s.atk[0] * 0.8), Math.round(s.atk[1] * 0.8)], def: s.def, mdef: s.mdef, vit: s.vit, flee: s.flee, hit: s.hit, speed: s.speed, element: s.element, race: s.race }); }
      return mid;
    }).filter(x => MOBS[x]);
    const own = d.bossSkill && d.bossSkill !== 'heal' && (BOSS_SKILLS[d.bossSkill] || d.bossSkill === 'firestorm') ? [d.bossSkill] : [];
    return (K.KITS[id] = { col: '255,90,70', hex: '#ff6a5a', rot: [...own, 'slam', 'shockwave', 'maw'], wbRot: [...own, 'slam', 'judgment', 'shockwave', 'maw'], ult: 'judgment', minions: mins, elite: mins[0], cry: L('มาช่วยข้า!', 'To my side!') });
  };
  K.kit = m => { const d = m.def, id = d.worldBoss ? d.base : d.id; return K.KITS[id] || (MOBS[id] && MOBS[id].boss ? K.autoKit(MOBS[id]) : null); };
  K.ancient = m => !!(m.isWB || m.def.worldBoss);
  // ลำดับท่าที่ bossSkill (game.js) ใช้
  K.rotation = m => {
    const k = K.kit(m); if (!k) return null;
    m.lastCast = G.time;
    return K.ancient(m) ? k.wbRot : k.rot;
  };

  // ---------- ตัวช่วยของท่า ----------
  const say = (m, th) => UI.msg(th, 'mvp');
  const cue = (m, name, col) => { // ชื่อท่าลอยเหนือหัวบอส (อ่านได้ทันทีว่ากำลังจะทำอะไร)
    if (!vis()) return;
    addFloater(m.x, m.y - 1.2 * (m.def.scale || 1) - 1.4, name, col || '#ffb070', true);
  };
  const toP = m => Math.atan2(G.player.y - m.y, G.player.x - m.x);
  const dmgCol = { holy: '#ffe27a', fire: '#ff8040', phys: '#ff5a3a', shadow: '#c05aff' };

  // กากบาทศักดิ์สิทธิ์: 4 ลำแสงจากตัวบอส (แนวหนึ่งเล็งมาที่เรา) — ยืนในช่องเฉียงระหว่างลำแสง • Ancient: ตามด้วยกากบาทเอียง 45°
  BOSS_SKILLS.holycross = m => {
    const p = G.player; if (p.dead) return;
    const x = m.x, y = m.y, a0 = toP(m), A = K.ancient(m);
    cue(m, 'HOLY CROSS', '#ffe27a');
    say(m, L(`${m.def.name} สร้างกากบาทแสง 4 ทิศ! ยืนในช่องเฉียงระหว่างลำแสง!`, `${m.def.name} forms a holy cross! Stand in the gaps between the beams!`));
    const set = (off, dur) => { for (let i = 0; i < 4; i++) { const a = a0 + off + i * Math.PI / 2;
      telegraph(m, { shape: 'line', x, y, a, len: 7, w: 1.6, dur }, () => damagePlayer(bossDmg(m, 1.3, true), dmgCol.holy),
        () => { for (let j = 1; j <= 3; j++) addFx({ type: 'ring', x: x + Math.cos(a) * j * 2.2, y: y + Math.sin(a) * j * 2.2, dur: 0.45, r: 0.9, color: '255,230,140' }); }); } };
    set(0, 1.2);
    if (A) set(Math.PI / 4, 2.0);
    if (vis()) Sound.play('holy');
  };
  // ฝนดาวตก (halodrops / foxfire): วงเล็กตกตามจุดที่เรายืน ทีละวง ห่างกัน 0.55 วิ — เดินไปเรื่อย ๆ ก็พ้น
  const barrage = (key, name, th, en, col, fx) => m => {
    const p = G.player; if (p.dead) return;
    const n = K.ancient(m) ? 5 : 3;
    cue(m, name, col);
    say(m, L(`${m.def.name} ${th}`, `${m.def.name} ${en}`));
    const drop = () => {
      if (m.dead || p.dead) return;
      const x = p.x, y = p.y;
      telegraph(m, { shape: 'circle', x, y, r: 1.5, dur: 1.1 }, () => damagePlayer(bossDmg(m, 1.1, true), col),
        () => fx === 'fire' ? addFx({ type: 'firering', x, y, dur: 0.5, r: 1.6 }) : addFx({ type: 'ring', x, y, dur: 0.5, r: 1.8, color: '255,236,160', waves: 2 }));
    };
    drop(); for (let i = 1; i < n; i++) later(i * 0.55, drop);
  };
  BOSS_SKILLS.halodrops = barrage('halodrops', 'HALO RAIN', 'โปรยวงแสงตามรอยเท้าเจ้า! เดินไปเรื่อย ๆ อย่าหยุด!', 'rains halos where you stand! Keep moving!', '#ffe27a', 'holy');
  BOSS_SKILLS.foxfire = barrage('foxfire', 'FOXFIRE', 'ปล่อยไฟจิ้งจอกตามรอยเท้าเจ้า! เดินไปเรื่อย ๆ อย่าหยุด!', 'drops foxfire where you stand! Keep moving!', '#ff8040', 'fire');
  // พัดกรวย (foxfan / maw): กรวยหน้าบอสหันมาทางเรา — อ้อมไปด้านข้าง/หลังบอส หรือถอยออกนอกระยะ
  const cone = (name, th, en, arc, r, mult, magic, col) => m => {
    const p = G.player; if (p.dead) return;
    const x = m.x, y = m.y, a = toP(m);
    faceTo(m, p.x, p.y);
    cue(m, name, col);
    say(m, L(`${m.def.name} ${th}`, `${m.def.name} ${en}`));
    telegraph(m, { shape: 'cone', x, y, a, arc, r, dur: 1.1 }, () => { damagePlayer(bossDmg(m, mult, magic), col); R.kick(5, 0.18); },
      () => { m.atkAnim = 1; for (let i = -1; i <= 1; i++) addFx({ type: 'ring', x: x + Math.cos(a + i * arc / 3) * r * 0.6, y: y + Math.sin(a + i * arc / 3) * r * 0.6, dur: 0.45, r: 1.2, color: magic ? '255,150,60' : '255,90,60' }); });
  };
  BOSS_SKILLS.foxfan = cone('NINE-TAIL FAN', 'กางหางพัดไฟเป็นรูปกรวย! อ้อมไปด้านข้างหรือหลัง!', 'fans its tails in a cone of fire! Circle to the side or behind!', Math.PI * 0.6, 5, 1.5, true, '#ff8040');
  BOSS_SKILLS.maw = cone('RENDING MAW', 'อ้าปากงับเป็นรูปกรวย! อ้อมไปด้านข้างหรือหลัง!', 'lunges with a rending bite! Circle to the side or behind!', Math.PI * 0.66, 4.5, 1.7, false, '#ff5a3a');
  // ตะครุบ: วงแดงที่จุดที่เรายืน แล้ว Garmr กระโดดลงตรงนั้น — ก้าวออกจากวง
  const pounceAt = (m, x, y, dur, mult) => telegraph(m, { shape: 'circle', x, y, r: 2.2, dur }, () => { damagePlayer(bossDmg(m, mult), '#ff5a3a'); R.kick(7, 0.22); }, () => {
    if (G.map.walkable(Math.floor(x), Math.floor(y))) { m.x = x; m.y = y; m.path = []; }
    m.atkAnim = 1;
    addFx({ type: 'ring', x, y, dur: 0.6, r: 2.6, color: '230,80,50', waves: 3 });
    if (typeof Juice !== 'undefined' && Juice.dust) Juice.dust(x, y, 2);
  });
  BOSS_SKILLS.pounce = m => {
    const p = G.player; if (p.dead) return;
    cue(m, 'POUNCE', '#ff5a3a');
    say(m, L(`${m.def.name} ย่อตัวจะตะครุบ! ก้าวออกจากวงแดง!`, `${m.def.name} crouches to pounce! Step out of the red circle!`));
    pounceAt(m, p.x, p.y, 1.2, 1.6);
  };
  // ---------- ท่าเฉพาะ Ancient ----------
  // พิพากษาแห่งแสง: ทั้งลานรอบบอสระเบิด ยกเว้นวงในชิดตัวบอส — วิ่งเข้าหาบอส!
  BOSS_SKILLS.judgment = m => {
    const p = G.player; if (p.dead) return;
    const x = m.x, y = m.y, k = K.kit(m) || {};
    cue(m, 'JUDGMENT', '#fff3c4');
    say(m, L(`${m.def.name} กำลังพิพากษาทั้งลาน! วิ่งเข้าวงในชิดตัวบอส!`, `${m.def.name} passes JUDGMENT on the whole arena! Run INTO the safe circle at its feet!`));
    telegraph(m, { shape: 'ring', x, y, r0: 2.2, r: 9, dur: 2.0 }, () => damagePlayer(bossDmg(m, 2.0, true), dmgCol.holy),
      () => { addFx({ type: 'ring', x, y, dur: 0.8, r: 9, color: k.col || '255,230,140', waves: 3 }); R.kick(8, 0.3); });
    if (vis()) Sound.play('holy');
  };
  // กังหันเก้าหาง: กรวยไฟ 4 แฉกรอบตัว แล้วตามด้วยอีก 4 แฉกเอียง 45° — ยืนในช่องว่าง แล้วก้าวเข้าแฉกที่ระเบิดไปแล้ว
  BOSS_SKILLS.pinwheel = m => {
    const p = G.player; if (p.dead) return;
    const x = m.x, y = m.y, a0 = toP(m) + Math.PI / 4;
    cue(m, 'NINE-TAIL PINWHEEL', '#ff8040');
    say(m, L(`${m.def.name} หมุนหางเป็นกังหันไฟ 2 ระลอก! ยืนในช่องว่าง แล้วก้าวเข้าแฉกที่ระเบิดไปแล้ว!`, `${m.def.name} spins a two-wave pinwheel of fire! Stand in a gap, then step into a blade that already burst!`));
    for (const [off, dur] of [[0, 1.2], [Math.PI / 4, 2.1]]) for (let i = 0; i < 4; i++) {
      const a = a0 + off + i * Math.PI / 2;
      telegraph(m, { shape: 'cone', x, y, a, arc: 0.85, r: 7, dur }, () => damagePlayer(bossDmg(m, 1.7, true), dmgCol.fire),
        () => addFx({ type: 'firering', x: x + Math.cos(a) * 3.5, y: y + Math.sin(a) * 3.5, dur: 0.5, r: 1.6 }));
    }
    if (vis()) Sound.play('fire');
  };
  // ล่าของเฮล: ตะครุบไล่ 3 ครั้งติดกัน ทุกครั้งเล็งจุดที่เรายืนตอนนั้น — วิ่งไม่หยุด
  BOSS_SKILLS.hunt = m => {
    const p = G.player; if (p.dead) return;
    cue(m, "HEL'S HUNT", '#ff5a3a');
    say(m, L(`${m.def.name} ออกล่า! ตะครุบไล่ 3 ครั้ง — วิ่งอย่าหยุด!`, `${m.def.name} begins HEL'S HUNT — three pounces in a row! Keep running!`));
    const jump = () => { if (!m.dead && !p.dead) pounceAt(m, p.x, p.y, 1.1, 1.5); };
    jump(); later(1.15, jump); later(2.3, jump);
  };

  // ---------- เรียกลูกสมุน ----------
  K.minionsOf = m => G.mobs.filter(x => x.minion && x.master === m && !x.dead);
  K.summon = (m, elite) => {
    const k = K.kit(m), A = K.ancient(m); if (!k || !k.minions.length) return false;
    const alive = K.minionsOf(m), cap = A ? 6 : 3;
    let n = elite ? (m.phase >= 2 ? 3 : 2) : Math.min(A ? 3 : 2, cap - alive.filter(x => !x.def.elite).length);
    if (n <= 0) return false;
    const pos = [], a0 = Math.random() * Math.PI * 2;
    for (let i = 0; i < n * 3 && pos.length < n; i++) {
      const a = a0 + i * (Math.PI * 2 / n) + (i >= n ? 0.5 : 0), r = i < n ? 2.4 : i < n * 2 ? 1.6 : 3.2;
      const tx = Math.floor(m.x + Math.cos(a) * r), ty = Math.floor(m.y + Math.sin(a) * r);
      if (G.map.walkable(tx, ty) && !pos.some(q => q.x === tx && q.y === ty)) pos.push({ x: tx, y: ty });
    }
    if (!pos.length) return false;
    m.summonSeq = (m.summonSeq || 0) + 1;
    const ids = pos.map((q, i) => elite ? k.elite + '_e' : k.minions[(m.summonSeq + i) % k.minions.length] + (A ? '_a' : ''));
    m.speech = { text: k.cry, until: G.time + 2.2 };
    cue(m, elite ? 'ELITE GUARD!' : 'SUMMON!', k.hex);
    UI.msg(elite ? L(`☠ ${m.def.name} เรียกลูกสมุนชั้นยอด ${pos.length} ตัว! (${MOBS[ids[0]].name})`, `☠ ${m.def.name} calls ${pos.length} ELITE minions! (${MOBS[ids[0]].name})`)
      : L(`${m.def.name} เรียกลูกสมุน ${pos.length} ตัว! (${[...new Set(ids)].map(i => MOBS[i].name).join(', ')}) — ลูกสมุนไม่มี EXP/ของดรอป จัดการแล้วกลับไปตีบอส`,
        `${m.def.name} summons ${pos.length} minions! (${[...new Set(ids)].map(i => MOBS[i].name).join(', ')}) — minions give no EXP/loot; clear them and refocus the boss`), 'mvp');
    for (const q of pos) {
      addFx({ type: 'castcircle', x: q.x + 0.5, y: q.y + 0.5, dur: 1.1, color: k.hex });
      addFx({ type: 'ring', x: q.x + 0.5, y: q.y + 0.5, dur: 1.1, r: elite ? 1.6 : 1.1, color: k.col, waves: 3 });
      if (elite) addFx({ type: 'beam', x: q.x + 0.5, y: q.y + 0.5, dur: 1.4 });
    }
    if (sfxOn()) { Sound.play('warp'); Sound.tone(elite ? 98 : 147, 0.7, 'sawtooth', 0.035, elite ? -30 : 40); }
    later(1.1, () => {
      if (m.dead || !G.mobs.includes(m)) return;
      pos.forEach((q, i) => {
        const mm = spawnMob(ids[i], q);
        mm.minion = true; mm.master = m; mm.state = 'chase'; mm.emoteUntil = G.time + 0.6; mm.nextAtk = G.time + 0.9; mm.facing = q.x + 0.5 < G.player.x ? 1 : -1;
        mm.expireAt = elite ? 1e12 : G.time + (A ? 45 : 30); // ลูกสมุนธรรมดาอยู่ได้ชั่วคราว (ชั้นยอดอยู่จนบอสตาย)
        addFx({ type: 'ring', x: mm.x, y: mm.y, dur: 0.5, r: 1.3, color: k.col, waves: 2 });
      });
    });
    return true;
  };
  // ลูกสมุนสลายตัว (บอสตาย/หายไป/รีเซ็ต): ไม่ผ่าน killMob จึงไม่มีรางวัลใด ๆ
  K.poof = mm => {
    mm.dead = true; mm.deathT = 0.3; mm.path = []; mm.moving = false;
    if (G.player.target === mm) G.player.target = null;
    if (vis()) addFx({ type: 'ring', x: mm.x, y: mm.y, dur: 0.5, r: 1.1, color: '200,200,220', waves: 2 });
  };

  // ---------- Ancient: ช่วงคลั่ง ----------
  K.setPhase = (m, ph) => {
    m.phase = ph;
    m.dmgMul = [1, 1.2, 1.35][ph]; m.castMul = [0.85, 0.65, 0.5][ph];
  };
  K.enrage = (m, ph) => {
    const k = K.kit(m) || {};
    K.setPhase(m, ph);
    m.nextBossSkill = Math.min(m.nextBossSkill, G.time + (ph >= 2 ? 1.6 : 3));
    m.nextSummon = G.time + 20 * 0.8; // ลูกสมุนธรรมดารอบถัดไปหลังชั้นยอด
    const pct = ph >= 2 ? 20 : 50;
    UI.announce(ph >= 2 ? L(`☠ ${m.def.name} คลั่งถึงขีดสุด! (เลือด ${pct}%) ท่าแรงขึ้น 35% ร่ายถี่สุด — ระวังท่าไม้ตาย!`, `☠ ${m.def.name} is in a LAST-STAND FRENZY! (HP ${pct}%) skills hit 35% harder and come faster — brace for its ultimate!`)
      : L(`🔥 ${m.def.name} เดือดดาล! (เลือด ${pct}%) ท่าแรงขึ้น 20% ร่ายถี่ขึ้น และเรียกลูกสมุนชั้นยอด!`, `🔥 ${m.def.name} is ENRAGED! (HP ${pct}%) skills hit 20% harder, cast faster, and it calls its elite guard!`));
    UI.msg(L(`[ANCIENT] ช่วงคลั่ง ${ph}/2 — ท่าแรง ×${m.dmgMul} ร่ายถี่ขึ้น`, `[ANCIENT] Enrage phase ${ph}/2 — skill damage ×${m.dmgMul}, faster casting`), 'mvp');
    m.speech = { text: ph >= 2 ? L('ข้าจะไม่ล้มลงคนเดียว!', 'I will not fall alone!') : L('พวกเจ้า... ทำให้ข้าโกรธแล้ว!', 'Now... you have made me ANGRY!'), until: G.time + 2.5 };
    if (vis()) {
      if (typeof Feel !== 'undefined' && Feel.banner) Feel.banner(ph >= 2 ? 'FRENZY' : 'ENRAGED', m.def.name.toUpperCase(), false);
      if (typeof Juice !== 'undefined') { Juice.flash('hurt', 0.6); Juice.shake(7, 0.6); }
      for (let i = 0; i < 3; i++) addFx({ type: 'ring', x: m.x, y: m.y, dur: 0.9 + i * 0.25, r: 3 + i * 2.2, color: '255,60,40', waves: 2 });
    }
    if (sfxOn()) { Sound.tone(55, 1.5, 'sawtooth', 0.06, -22); Sound.tone(82, 1.1, 'square', 0.03, -30, 0.08); Sound.noise(1.0, 0.04, 160); }
    K.summon(m, true);
    if (ph >= 2 && k.ult && BOSS_SKILLS[k.ult]) later(1.6, () => { if (!m.dead && m.state === 'chase' && !G.player.dead) { m.lastCast = G.time; BOSS_SKILLS[k.ult](m); } });
  };

  // ---------- เกิด / ทุกเฟรม ----------
  K.init = m => {
    if (m.kitInit) return; m.kitInit = true;
    if (K.ancient(m)) {
      m.teleScale = 1.25; m.teleDur = 0.9;
      const k = m.hp / m.maxHp; K.setPhase(m, k <= 0.2 ? 2 : k <= 0.5 ? 1 : 0); // เข้ามากลางศึก: เข้าช่วงที่ถูกต้องเงียบ ๆ
    }
  };
  // บอสเกิด (spawnMvp / WB.spawn): จุดประจำ + ฉากออกจากประตู (MAP_DEFS[id].mvpGate)
  K.onSpawn = m => {
    K.init(m);
    const def = G.map && G.map.def;
    if (!def || !def.mvpAt) return;
    m.home = { x: m.x, y: m.y };
    const gate = def.mvpGate;
    if (!gate) return;
    const gx = gate[0], gy = gate[1];
    if (G.map.walkable(Math.floor(gx), Math.floor(gy))) { // เริ่มในซุ้มประตู แล้วเดินออกมายืนหน้าประตู
      const to = { x: Math.floor(m.x), y: Math.floor(m.y) };
      m.x = gx; m.y = gy; m.path = findPath(G.map, Math.floor(gx), Math.floor(gy), to.x, to.y, 200); m.nextWander = G.time + 4;
    }
    m.nextBossSkill = Math.max(m.nextBossSkill, G.time + 4);
    m.speech = { text: L('กรรรร...', 'Grrrrr...'), until: G.time + 2 };
    UI.msg(L(`⛓ ${m.def.name} พังโซ่ออกมาจากประตูราก!`, `⛓ ${m.def.name} breaks its chains and emerges from the root gate!`), 'mvp');
    if (!vis()) return;
    for (let i = 0; i < 3; i++) addFx({ type: 'ring', x: gx, y: gy, dur: 1.0 + i * 0.35, r: 2 + i * 1.4, color: '255,90,60', waves: 2 });
    if (typeof Juice !== 'undefined') { Juice.dust(gx, gy, 2.4); Juice.dust(m.home.x, m.home.y, 1.6); }
  };
  K.update = () => {
    const p = G.player;
    for (const m of G.mobs) {
      if (m.dead || m.isPlayer) continue;
      if (m.minion) { // ลูกสมุน: บอสตาย/หายไป/รีเซ็ตเกิน 4 วิ หรือหลุดการไล่เกิน 6 วิ → สลายตัว
        const b = m.master, gone = !b || b.dead || !G.mobs.includes(b);
        if (m.state === 'chase') m.calmAt = 0; else if (!m.calmAt) m.calmAt = G.time;
        if (gone || (b.calmAt && G.time - b.calmAt > 4) || (m.calmAt && G.time - m.calmAt > 6) || G.time >= (m.expireAt || 1e12)) K.poof(m);
        continue;
      }
      if (!m.def.boss || m.def.dummy) continue;
      K.init(m);
      const A = K.ancient(m);
      if (A) { // ช่วงคลั่งตามเลือดร่วม: กำลังสู้ = ฉากคลั่งเต็ม (ประกาศ + ชั้นยอด) • ไม่ได้สู้อยู่ (คนอื่นตีจนข้ามเส้น) = เปลี่ยนช่วงเงียบ ๆ
        const k = m.hp / m.maxHp, want = k <= 0.2 ? 2 : k <= 0.5 ? 1 : 0;
        if (want > (m.phase || 0)) { if (m.state === 'chase') K.enrage(m, want); else K.setPhase(m, want); }
      }
      if (m.state !== 'chase') { if (!m.calmAt) m.calmAt = G.time; continue; }
      m.calmAt = 0;
      if (!m.engaged) { m.engaged = true; m.nextSummon = Math.max(m.nextSummon || 0, G.time + (A ? 7 : 12)); }
      if (A) {
        if (m.phase && vis() && G.time >= (m.auraAt || 0)) { m.auraAt = G.time + 0.7; addFx({ type: 'ring', x: m.x, y: m.y, dur: 0.7, r: 1.6 * Math.sqrt(m.def.scale || 1), color: m.phase >= 2 ? '255,40,30' : '255,110,50' }); }
      }
      // เรียกลูกสมุน: คูลดาวน์ (MVP 40 วิ / Ancient 20 วิ) • MVP: เลือดลดผ่าน 75% / 50% / 25% = เรียกทันที (ห่างครั้งก่อน ≥ 8 วิ)
      //   → จำนวนลูกสมุนผูกกับความคืบหน้าของการสู้ ไม่ท่วมคนที่ตีช้า • ห่างจากท่าที่เพิ่งร่ายอย่างน้อย 1.5 วิ (ป้ายไม่ซ้อนจนอ่านไม่ทัน)
      const k = m.hp / m.maxHp, mark = A ? 0 : [0.75, 0.5, 0.25].filter(x => k <= x).length;
      const due = G.time >= (m.nextSummon || 0) || (mark > (m.summonMark || 0) && G.time - (m.summonAt || -99) >= 8);
      if (due && !p.dead && U.dist(m.x, m.y, p.x, p.y) < 10 && G.time - (m.lastCast || -9) > 1.5) {
        const cd = (A ? 20 : 40) * (m.phase ? 0.8 : 1), okS = K.summon(m);
        m.nextSummon = G.time + (okS ? cd : 3); m.summonMark = mark;
        if (okS) m.summonAt = G.time;
      }
    }
  };
  return K;
})();
