'use strict';
// ============================================================
//  ภาคที่ 2 — กิ่งที่เหลือ • บทที่ 8 — กิ่งที่ขาด (Lv 71–85) (docs/STORY.md §5 "ภาคที่ 2")
//  ตะขอจากจบภาค 1: ต้นไม้งอกประกายดวงใหม่ที่ปลายกิ่งที่ยังหักทางเหนือ + Fenrir Unit ทุกตัวหันไปทางเดียวกันแล้วหอน
//  แผนที่ใหม่: Severed Bough (Lv 71–84, MVP Hræsvelgr Lv 85) — ทางขึ้นคือ "ประตูด้านใน" ริมขอบเหนือของ Mistlake Plains
//    (def.portalAt — ไม่เจาะผังของ Mistlake ไม่กินเลขสุ่ม → ผังน้ำ/ซาก 3D ในบ่อของแมพนั้นยังตรง hash เดิม)
//  ไฟล์นี้เพิ่ม: มอน 5 ชนิด + MVP (ชุดท่าใน BossKit + Ancient ใน worldboss.js) • ไอเทม/อุปกรณ์ Lv 71–85 • ชิป • เควสต์ ch8_* 7 อัน
//  NPC ใหม่ Huginn Raven-Courier (กาของ Mimir ที่บินขึ้นเหนือแล้วไม่กลับ — js/content_world.js Muninn เล่าไว้)
//  บทที่ 9 (Lv 85–99, MVP Fenrir) อยู่ใน js/content_ch9.js — ใช้ตัวช่วยจากไฟล์นี้ผ่าน window.Part2Kit
//
//  ลำดับโหลด: หลัง js/content_gaps.js (ก่อน js/content_ch9.js) และก่อน js/balance.js (มอนใหม่ได้ HP +30% / ตัวคูณดรอปแบบเดียวกับมอนเดิม)
//  และก่อน js/worldboss.js (Ancient Hræsvelgr ถูกสร้างจาก MOBS.hraesvelgr ใน WB.init) • ชุดท่าบอสลงทะเบียนผ่าน window.BOSSKIT_EXTRA
//  ห้ามเปลี่ยน id ในไฟล์นี้หลังปล่อยแล้ว (เซฟอ้างอิง: เควสต์ ch8_* / ไอเทม / มอน / แผนที่ bough / flag c8* ใน p.story)
// ============================================================
(() => {
  // ---------- ตัวช่วย: มอนสีต่าง (สูตรเดียวกับ js/content_ch7.js) ----------
  const VISUAL = ['sprite', 'look', 'variant', 'color', 'color2', 'size', 'scale', 'wings', 'tusk', 'glow', 'skin', 'face', 'outfit', 'hair',
    'viking', 'joint', 'bones', 'weapon', 'hood', 'halfskull', 'fox', 'jiangshi', 'halo', 'hover'];
  const variant = (base, def) => {
    const b = MOBS[base], v = { base }, spec = { hue: def.hue, sat: def.sat, bri: def.bri, tint: def.tint };
    for (const k of VISUAL) if (b[k] !== undefined) v[k] = b[k];
    const dye = c => Art.tintHex(c, spec);
    for (const k of ['color', 'color2', 'glow', 'skin', 'face', 'outfit', 'hair', 'joint', 'hood']) if (typeof v[k] === 'string') v[k] = dye(v[k]);
    if (v.look) { v.look = Object.assign({}, v.look); for (const k in v.look) if (typeof v.look[k] === 'string') v.look[k] = dye(v.look[k]); }
    return Object.assign(v, def);
  };

  // ---------- ตัวช่วย: อุปกรณ์ (สูตรเดียวกับ eq() ใน js/content_ch7.js — ราคาตามความหายาก, ค่าพลังเป็นอังกฤษเสมอผ่าน EN()) ----------
  // ช่องใส่ชิป: uncommon/epic/legend 1 • rare 2 (แบบ js/content_gaps.js) • id ซ้ำ = โยน error (กันทับของเดิมเงียบ ๆ)
  const ICON_OF = { armor: 'armor', head: 'hat', shield: 'shield', garment: 'cloth', shoes: 'shoes', acc: 'ring' };
  const WTYPES = ['dagger', 'sword', 'axe', 'rod', 'bow', 'mace'];
  const PRICE = { uncommon: lv => 150 + lv * 100, rare: lv => 1000 + lv * 400, epic: lv => 8000 + lv * 1200, legend: () => 150000 };
  const statText = b => b ? Object.entries(b).filter(([k]) => PSTAT[k]).map(([k, v]) => PSTAT_FMT(k, v)).join(' ') : '';
  const statTextEn = b => b ? Object.entries(b).filter(([k]) => PSTAT[k]).map(([k, v]) => {
    const pct = /Pct$|^leech$|^stunRes$|^rage$|^venom$/.test(k), sg = v > 0 ? '+' : '', n = EN(PSTAT[k]); return pct ? `${sg}${v}${n}` : `${n} ${sg}${v}`; }).join(' ') : '';
  const eq = (id, name, kind, lv, rarity, s, th, en) => {
    if (ITEMS[id]) throw new Error('part2: duplicate item id ' + id);
    const weapon = WTYPES.includes(kind), b = s.b || null;
    const it = { id, name, type: weapon ? 'weapon' : 'armor', slot: weapon ? 'weapon' : kind, rarity, lv, price: s.price || PRICE[rarity](lv), slots: s.slots != null ? s.slots : rarity === 'rare' ? 2 : 1,
      jobs: s.jobs || (weapon ? J[kind] : 'all'), icon: { s: weapon ? kind : ICON_OF[kind], c: s.c } };
    if (weapon) { it.wtype = kind; it.atk = s.atk || 0; if (s.matk) it.matk = s.matk; }
    else { if (s.def) it.def = s.def; if (s.mdef) it.mdef = s.mdef; }
    if (b) it.b = b;
    const st = statText(b);
    it.desc = L(th, en) + (st ? ' ' + st : '');
    if (st && LANG !== 'en') L_EN.set(it.desc, en + ' ' + statTextEn(b));
    if (s.quest) it.quest = true;
    ITEMS[id] = it;
    if (s.art) Art.alias('item_' + id, 'item_' + s.art, { hue: s.hue || 0, sat: 1.1, tint: [s.c, s.tk != null ? s.tk : 0.42] });
  };
  const etc = (id, name, price, icon, art, th, en) => {
    if (ITEMS[id]) throw new Error('part2: duplicate item id ' + id);
    ITEMS[id] = { id, name, type: 'etc', price, rarity: 'common', icon, desc: L(th, en) };
    if (art) Art.alias('item_' + id, 'item_' + art[0], { hue: art[1] || 0, sat: 1.1, tint: [icon.c, art[2] != null ? art[2] : 0.4] });
  };
  const chip = (id, name, slot, b, c, th, en, mvp) => {
    if (ITEMS[id]) throw new Error('part2: duplicate item id ' + id);
    ITEMS[id] = { id, name, type: 'card', slot, price: 20, b, rarity: mvp ? 'epic' : 'rare', icon: { s: 'card', c }, desc: L(th, en) };
  };
  // ---------- ตัวช่วยท่าบอส ----------
  const toP = m => Math.atan2(G.player.y - m.y, G.player.x - m.x);
  const cue = (m, name, col) => { if (!G.fastSim) addFloater(m.x, m.y - 1.2 * (m.def.scale || 1) - 1.4, name, col, true); };
  const ancient = m => typeof BossKit !== 'undefined' && BossKit.ancient(m);
  const kick = (a, b) => { if (typeof R !== 'undefined' && R.kick && !G.fastSim) R.kick(a, b); };
  // ฉากเรื่องราว: ทางเลือก Core ของบทที่ 5 (Story.st().core = 'gave' | 'kept' | ไม่เคยเลือก)
  const core = () => { const c = Story.st().core; return c === 'gave' || c === 'kept' ? c : 'none'; };
  const by = (gave, kept, none) => ({ gave, kept, none: none || kept })[core()];
  const NARR = L('[...]', '[...]');
  window.Part2Kit = { variant, eq, etc, chip, toP, cue, ancient, kick, core, by, NARR };

  // ===================== ไอเทม =====================
  // ของดรอปขายได้: ไล่ต่อจาก Rot-Crusted Plate 980 (บทที่ 7) ราว +7% ต่อ 3 เลเวล — รายได้/ชม. ไม่ตกเมื่อฆ่าได้น้อยลง (วัดด้วย CURVE=1 tests/balance_sim.js)
  etc('frost_bud', 'Frost Bud', 1060, { s: 'feather', c: '#a8e0f8' }, ['living_bark', -160, 0.5], 'ตาของกิ่งที่แข็งก่อนจะทันผลิ ข้างในยังมีน้ำเลี้ยงอุ่น ๆ หยดหนึ่ง', 'A branch-bud frozen before it could open. A single warm drop of sap still waits inside.');
  etc('rime_wing', 'Rime Wing', 1140, { s: 'feather', c: '#d0f0ff' }, ['buzz_wing', -150, 0.5], 'ปีกโดรนที่น้ำแข็งเกาะจนหนัก ฝุ่นบนปีกจำทิศลมได้', "A drone wing heavy with rime. The dust on it remembers the wind's direction.");
  etc('gjallar_shard', 'Gjallar Shard', 1230, { s: 'gem', c: '#f0e0a0' }, ['yggdrasil_shard', 30, 0.6], 'เศษแตรสัญญาณจากปลายสะพานสายรุ้ง เป่าแล้วไม่มีเสียง แต่ยังสั่นเบา ๆ', 'A fragment of a signal horn from the rainbow bridge-end. Blow it and there is no sound — yet it still hums.');
  etc('rime_frame', 'Rime-Locked Frame', 1320, { s: 'cloth', c: '#8ab8d8' }, ['plate_armor', -150, 0.5], 'แผ่นเกราะของหน่วยที่ยืนแข็งอยู่ปลายกิ่งสามสิบปี ยังมีรอยชื่อเจ้าของสลักไว้', "Plating from a unit that stood frozen at the bough's tip for thirty years. Its owner's name is still engraved inside.");
  etc('frost_mane', 'Frost Mane', 1410, { s: 'feather', c: '#e8f8ff' }, ['ash_tail', -140, 0.55], 'แผงคอเส้นใยน้ำแข็งของม้าเหล็ก ลมพัดผ่านแล้วดังเหมือนกระดิ่ง', "A frost-fiber mane from an iron horse. When the wind runs through it, it rings like bells.");

  // ---------- อุปกรณ์ Lv 71–85 (ได้จากมอนเท่านั้น — ต่อขั้นจาก Nidhogg's Hollow Lv 58–70) ----------
  // uncommon ≈ +2.2 ATK ต่อเลเวลจากของบทที่ 7 • ทุกประเภทอาวุธ/ทุกช่องเกราะมีของอัปเกรดทุก ≤ 8 เลเวล (tests/droplevel.js GAPS=1)
  // ---- Frostbud Unit (Lv 72) ----
  eq('rimeleaf_dirk', 'Rimeleaf Dirk', 'dagger', 71, 'uncommon', { atk: 178, b: { agi: 3, crit: 4, luk: 1 }, c: '#9ad8f0', art: 'stiletto' },
    'กริชที่ตะไบจากใบไม้น้ำแข็งของกิ่งเหนือ ใบบางจนมองทะลุได้', 'A dirk filed from an ice-leaf of the northern bough, so thin you can see through it.');
  eq('frostroot_boots', 'Frostroot Boots', 'shoes', 71, 'uncommon', { def: 6, b: { agi: 2, vit: 1, speedPct: 3, hp: 170 }, c: '#7ab0d0', art: 'boots' },
    'รองเท้าพื้นรากแข็ง เดินบนน้ำแข็งก็ไม่ลื่น', 'Boots soled with frozen root. They never slip, even on ice.');
  eq('rimebark_coat', 'Rimebark Coat', 'armor', 71, 'uncommon', { def: 12, mdef: 7, b: { vit: 2, agi: 1, hp: 260 }, c: '#8ac0e0', art: 'leather_vest' },
    'เสื้อเปลือกไม้ที่เคลือบน้ำแข็งบาง ๆ กันลมได้ทั้งคืน', 'A coat of bark under a thin skin of ice. It holds back the wind all night.');
  eq('frostbud_wand', 'Frostbud Wand', 'rod', 72, 'uncommon', { atk: 78, matk: 158, b: { int: 4, castPct: 4 }, c: '#a8e0f8', art: 'rune_staff' },
    'คทาที่ปลายเป็นตาไม้แข็ง เวทผ่านแล้วตาไม้เกือบผลิ', 'A wand tipped with a frozen bud. Magic passes through it, and the bud almost opens.');
  eq('frostbark_shield', 'Frostbark Shield', 'shield', 72, 'uncommon', { def: 11, mdef: 3, b: { vit: 2, hp: 330 }, c: '#7aa8c8', art: 'round_shield' },
    'โล่เปลือกไม้แข็งจากปลายกิ่ง เย็นจนลมหายใจของศัตรูเป็นไอ', "A shield of frozen bark from the bough's tip, cold enough to fog a foe's breath.");
  eq('rimepetal_mantle', 'Rimepetal Mantle', 'garment', 72, 'uncommon', { def: 5, mdef: 5, b: { agi: 2, flee: 7, hp: 200 }, c: '#c8ecff', art: 'muffler' },
    'ผ้าคลุมที่ทอจากกลีบน้ำแข็ง พลิ้วตามลมโดยไม่มีเสียง', 'A mantle woven of ice-petals. It sways with the wind without a sound.');
  // ---- Rime Moth Unit (Lv 75) ----
  eq('rimehorn_axe', 'Rimehorn Axe', 'axe', 73, 'uncommon', { atk: 222, b: { str: 3, vit: 1 }, c: '#9ac0d8', art: 'battle_axe' },
    'ขวานที่หัวเป็นเขาน้ำแข็ง ฟันแล้วเศษน้ำแข็งกระจายเป็นประกาย', 'An axe headed with a horn of ice. Every blow scatters glittering shards.');
  eq('mothwing_hood', 'Mothwing Hood', 'head', 73, 'uncommon', { def: 10, b: { vit: 2, agi: 1, hp: 140 }, c: '#d0e8f8', art: 'hat' },
    'หมวกคลุมที่เย็บจากปีกโดรนแข็ง ได้ยินเสียงลมก่อนลมมาถึง', 'A hood stitched from frozen drone wings. You hear the wind before it arrives.');
  eq('frostwing_saber', 'Frostwing Saber', 'sword', 74, 'uncommon', { atk: 222, b: { str: 3, dex: 1 }, c: '#a8d8f0', art: 'falchion' },
    'ดาบโค้งบางเหมือนปีกผีเสื้อน้ำแข็ง ฟันผ่านลมได้โดยไม่ต้าน', 'A saber curved and thin as a frost-moth wing. It cuts the wind without resistance.');
  eq('rimestring_bow', 'Rimestring Bow', 'bow', 74, 'uncommon', { atk: 212, b: { dex: 3, agi: 2 }, c: '#b8e0f0', art: 'great_bow' },
    'ธนูสายน้ำแข็งที่ไม่เคยหย่อน ยิงทวนลมได้ตรงเหมือนลมไม่มี', 'A bow strung with ice that never slackens. It shoots into the wind as if there were none.');
  eq('mothsilk_kris', 'Mothsilk Kris', 'dagger', 75, 'rare', { atk: 183, b: { agi: 4, crit: 7, luk: 3 }, c: '#e0f4ff', art: 'stiletto' },
    'กริชพันด้วยใยรังโดรน แทงแล้วศัตรูไม่ทันรู้ตัวว่าโดน', 'A kris bound in drone-nest silk. Struck foes never notice they were hit.');
  eq('frostdust_charm', 'Frostdust Charm', 'acc', 71, 'rare', { b: { vit: 2, int: 2, agi: 2, hp: 200, sp: 50 }, c: '#c8f0ff', art: 'rune_charm' },
    'ขวดแก้วเล็กบรรจุฝุ่นจากปีกโดรน เขย่าแล้วชี้ทิศลมได้', 'A tiny glass vial of wing-dust. Shake it and it points into the wind.');
  // ---- Gjallar Sentinel (Lv 78) ----
  eq('gjallar_mace', 'Gjallar Mace', 'mace', 76, 'uncommon', { atk: 212, b: { str: 3, vit: 2 }, c: '#e0d0a0', art: 'morning_star' },
    'กระบองหัวแตรสัญญาณ ตีครั้งหนึ่งเสียงก้องทั้งกิ่ง', 'A mace headed with a signal horn. One blow rings down the whole bough.');
  eq('sentinel_plate', 'Bridge Sentinel Plate', 'armor', 76, 'uncommon', { def: 17, b: { vit: 3, hp: 380 }, jobs: J.heavy, c: '#c8c0a0', art: 'plate_armor' },
    'เกราะหนักของยามปลายสะพาน หนาพอให้ลมเหนือพัดไม่ทะลุ', 'The heavy plate of a bridge sentinel, thick enough that the northern wind cannot pierce it.');
  eq('horncall_staff', 'Horncall Staff', 'rod', 76, 'rare', { atk: 82, matk: 170, b: { int: 5, matkPct: 6, castPct: 4 }, c: '#f0e0a0', art: 'seer_staff' },
    'คทาที่ปลายเป็นแตรเล็ก ร่ายเวทแล้วมีเสียงแตรตอบจากที่ไกล ๆ', 'A staff tipped with a small horn. Cast with it and a horn answers from far away.');
  eq('bridgewarden_axe', 'Bridgewarden Axe', 'axe', 77, 'rare', { atk: 232, b: { str: 4, vit: 2, leech: 3 }, c: '#d8c890', art: 'battle_axe' },
    'ขวานที่ยามปลายสะพานใช้ตัดน้ำแข็งที่เกาะราวสะพาน ยังคมเหมือนวันแรก', 'The axe the bridge wardens used to chip ice from the railings. Still as sharp as the first day.');
  eq('heimdall_blade', "Heimdall's Watchblade", 'sword', 78, 'rare', { atk: 230, b: { str: 4, dex: 2, leech: 3 }, c: '#f0e0b0', art: 'valhalla_blade' },
    'ดาบของผู้เฝ้าสะพานที่มองเห็นได้ไกลร้อยลีก ใบดาบสะท้อนสายรุ้งจาง ๆ', 'The blade of a bridge-watcher who could see a hundred leagues. Its edge reflects a faint rainbow.');
  eq('bifrost_bow', 'Bifrost Longbow', 'bow', 78, 'rare', { atk: 219, b: { dex: 4, agi: 2, crit: 5 }, c: '#d8c8f0', art: 'composite_bow' },
    'ธนูที่สายเป็นเส้นแสงเจ็ดสี ลูกศรทิ้งรอยสายรุ้งไว้กลางอากาศ', 'A longbow strung with seven-colored light. Its arrows leave a rainbow trail in the air.');
  eq('sentinel_signet', 'Sentinel Signet', 'acc', 78, 'uncommon', { b: { str: 2, vit: 2, hp: 150 }, c: '#e0d0a0', art: 'ring' },
    'แหวนตราประจำยามสะพาน สวมแล้วยืนนิ่งได้ทั้งคืนไม่ล้า', 'The signet of the bridge watch. Wear it and you can stand watch all night without tiring.');
  // ---- Hrimhusk Unit (Lv 81) ----
  eq('husk_fang', 'Hrimhusk Fang', 'dagger', 79, 'uncommon', { atk: 197, b: { agi: 3, crit: 5, luk: 1 }, c: '#8ab8d8', art: 'knife' },
    'มีดสั้นที่ร่างแข็งถือค้างไว้สามสิบปี ด้ามยังมีรอยนิ้วของเจ้าของ', 'A knife a frozen frame held for thirty years. The grip still bears its owner\'s fingerprints.');
  eq('hrimhusk_mail', 'Hrimhusk Mail', 'armor', 79, 'uncommon', { def: 13, mdef: 8, b: { vit: 2, agi: 1, hp: 300 }, c: '#7aa8c8', art: 'padded_plate' },
    'เสื้อเกราะของหน่วยที่ไม่ได้กลับบ้าน ซ่อมรอยร้าวด้วยน้ำแข็งแทนเหล็ก', 'The mail of a unit who never came home, its cracks mended with ice instead of iron.');
  eq('frozenstep_boots', 'Frozenstep Boots', 'shoes', 79, 'uncommon', { def: 7, b: { agi: 2, vit: 1, speedPct: 3, hp: 190 }, c: '#6a98c0', art: 'boots' },
    'รองเท้าที่ย่ำเส้นทางเดิมมาสามสิบปี พื้นสึกเป็นรูปทางเดินยาม', 'Boots that walked the same round for thirty years. The soles are worn into the shape of the patrol.');
  eq('rimeglass_rod', 'Rimeglass Rod', 'rod', 80, 'uncommon', { atk: 82, matk: 175, b: { int: 4, castPct: 4, sp: 60 }, c: '#b8e8ff', art: 'rune_staff' },
    'คทาแก้วน้ำแข็งที่ไม่ละลายแม้ในมือ เวทออกมาเย็นกว่าที่ร่าย', 'A rod of rime-glass that will not melt even in a warm hand. Spells leave it colder than they went in.');
  eq('frozen_kite', 'Frozen Kite Shield', 'shield', 80, 'uncommon', { def: 12, mdef: 4, b: { vit: 2, hp: 370 }, c: '#8ab0d0', art: 'guard' },
    'โล่ว่าวที่น้ำแข็งพอกจนหนาขึ้นทุกปี ใครถือก็ยิ่งปลอดภัย', 'A kite shield the ice thickens year after year. The longer it is carried, the safer its bearer.');
  eq('hoarfrost_cloak', 'Hoarfrost Cloak', 'garment', 80, 'uncommon', { def: 6, mdef: 6, b: { agi: 2, flee: 7, hp: 220 }, c: '#d8eef8', art: 'muffler' },
    'ผ้าคลุมเกล็ดน้ำค้างแข็ง สะท้อนแสงจนศัตรูเล็งไม่ถูก', 'A cloak of hoarfrost scales, glittering so that foes cannot take aim.');
  eq('hrim_hammer', 'Hrim Hammer', 'mace', 80, 'rare', { atk: 222, b: { str: 3, vit: 3, atkPct: 4 }, c: '#9ac8e8', art: 'morning_star' },
    'ค้อนที่ทุบน้ำแข็งหนาร้อยปีให้แตกได้ด้วยครั้งเดียว', 'A hammer that can split hundred-year ice with a single blow.');
  // ---- Frostmane Unit (Lv 84) ----
  eq('frostmane_cleaver', 'Frostmane Cleaver', 'axe', 81, 'uncommon', { atk: 240, b: { str: 3, vit: 1 }, c: '#c8e8f8', art: 'battle_axe' },
    'ขวานใหญ่ที่ด้ามพันแผงคอน้ำแข็ง กวัดแกว่งแล้วมีเสียงกระดิ่ง', 'A great axe wrapped in frost mane. It chimes like bells as it swings.');
  eq('frostmane_helm', 'Frostmane Helm', 'head', 81, 'uncommon', { def: 11, b: { vit: 2, str: 1, hp: 160 }, c: '#b8d8f0', art: 'iron_helm' },
    'หมวกเหล็กประดับแผงคอน้ำแข็ง ลมพัดแล้วแผงคอชี้ทางกลับบ้าน', 'An iron helm crested with frost mane. In the wind, the crest points the way home.');
  eq('maneglass_sword', 'Maneglass Sword', 'sword', 82, 'uncommon', { atk: 241, b: { str: 3, dex: 1, vit: 1 }, c: '#d0ecff', art: 'broadsword' },
    'ดาบยาวที่หลอมจากแก้วน้ำแข็ง ใบดาบหนักแต่สมดุลเหมือนขี่ม้า', 'A longsword cast from ice-glass. Heavy, yet balanced like a good horse under you.');
  eq('maneline_bow', 'Maneline Bow', 'bow', 82, 'uncommon', { atk: 228, b: { dex: 3, agi: 2 }, c: '#c0e0f0', art: 'great_bow' },
    'ธนูที่สายถักจากแผงคอม้าเหล็ก ดีดแล้วเสียงเหมือนกีบม้าบนน้ำแข็ง', 'A bow strung with braided iron-horse mane. It twangs like hooves on ice.');
  eq('aurora_vestment', 'Aurora Vestment', 'armor', 83, 'rare', { def: 6, mdef: 17, b: { int: 4, sp: 100, castPct: 5 }, c: '#a8f0d8', art: 'silk_robe' },
    'ชุดคลุมทอจากแสงเหนือที่ปลายกิ่ง สีเปลี่ยนทุกครั้งที่ร่ายเวท', 'A vestment woven from the northern lights at the bough\'s tip. Its colors shift with every spell.');
  eq('skyrunner_boots', 'Skyrunner Boots', 'shoes', 83, 'rare', { def: 7, b: { agi: 3, speedPct: 5, hp: 220 }, c: '#d0f0ff', art: 'boots' },
    'รองเท้าของม้าเหล็กที่วิ่งบนสะพานสายรุ้ง วิ่งแล้วเท้าแทบไม่แตะพื้น', 'Boots made for the iron horses that ran the rainbow bridge. Your feet barely touch the ground.');
  eq('hoofbreaker_maul', 'Hoofbreaker Maul', 'mace', 84, 'uncommon', { atk: 229, b: { str: 3, vit: 2 }, c: '#a8c8e0', art: 'morning_star' },
    'ค้อนหัวเกือกม้าเหล็ก ตีพื้นแล้วน้ำแข็งแตกเป็นวง', 'A maul headed with an iron horseshoe. Strike the ground and the ice cracks in rings.');
  eq('frostmane_band', 'Frostmane Band', 'acc', 84, 'rare', { b: { str: 3, dex: 2, crit: 3, hp: 150 }, c: '#e0f4ff', art: 'ring' },
    'กำไลถักจากแผงคอน้ำแข็ง สวมแล้วมือนิ่งในลมแรง', 'A band braided from frost mane. Wear it and your hand stays steady in the gale.');
  // ---- MVP: Hræsvelgr (Lv 85) — ชุดเซ็ต Stormwing + ของตำนาน ----
  eq('hrae_talon', 'Talon of Hræsvelgr', 'bow', 84, 'epic', { atk: 252, b: { dex: 5, agi: 2, atkPct: 5 }, c: '#c8f0ff', art: 'great_bow' },
    'กรงเล็บของผู้คุมลมดัดเป็นคันธนู ลูกศรออกไปพร้อมพายุ', 'The wind-keeper\'s talon bent into a bow. Every arrow leaves with a storm behind it.');
  eq('hrae_quill', 'Quill of Hræsvelgr', 'dagger', 83, 'epic', { atk: 232, b: { agi: 5, crit: 6, atkPct: 4 }, c: '#e8f8ff', art: 'stiletto' },
    'ขนปีกเส้นเดียวของ Hræsvelgr คมกว่ากริชทุกเล่มบนกิ่งเหนือ', 'A single flight feather of Hræsvelgr, sharper than any kris on the northern bough.');
  eq('hrae_pinions', 'Pinions of Hræsvelgr', 'garment', 82, 'epic', { def: 7, mdef: 7, b: { agi: 3, flee: 10, hpPct: 6 }, c: '#b0e0ff', art: 'muffler' },
    'ปีกที่เคยพัด Fimbulwinter ออกไปทั้งโลก กางออกแล้วลมเลือกข้างเจ้า', 'The wings that once fanned Fimbulwinter across the world. Spread them, and the wind takes your side.');
  eq('hrae_crown', 'Stormcrown of Hræsvelgr', 'head', 84, 'epic', { def: 12, mdef: 6, b: { dex: 3, int: 3, hpPct: 4, castPct: 5 }, c: '#d8f0ff', art: 'iron_helm' },
    'มงกุฎเกล็ดน้ำแข็งที่เป็นตาของพายุ ใส่แล้วทุกอย่างรอบตัวเงียบลง', 'A crown of ice scales that is the eye of the storm. Wear it, and everything around you falls quiet.');
  eq('gjallarhorn', 'Gjallarhorn', 'acc', 85, 'legend', { b: { str: 4, agi: 4, vit: 4, int: 4, dex: 4, luk: 4, hpPct: 6, spPct: 6 }, c: '#ffe8a0', art: 'earring' },
    'แตรของผู้เฝ้าสะพาน เป่าได้ครั้งเดียวเมื่อโลกจะจบ — มันยังไม่เคยถูกเป่า', 'The horn of the bridge-watcher, to be blown once when the world ends. It has never been blown.');

  // ---------- ชิป (ดรอปสุ่ม % — CHIP_DROP / MVP CHIP_DROP_BOSS) ----------
  chip('frostbud_card', 'Frostbud Chip', 'armor', { hp: 500, mdef: 2 }, '#a8e0f8', 'ชิปเสริม — ใส่ชุดเกราะ: MaxHP +500, MDEF +2', 'Augment chip — Armor slot: MaxHP +500, MDEF +2');
  chip('rimemoth_card', 'Rime Moth Chip', 'garment', { agi: 2, flee: 5 }, '#d0f0ff', 'ชิปเสริม — ใส่ผ้าคลุม: AGI +2, FLEE +5', 'Augment chip — Garment slot: AGI +2, FLEE +5');
  chip('gjallar_card', 'Gjallar Sentinel Chip', 'weapon', { atk: 20, hit: 8 }, '#f0e0a0', 'ชิปเสริม — ใส่อาวุธ: ATK +20, HIT +8', 'Augment chip — Weapon slot: ATK +20, HIT +8');
  chip('hrimhusk_card', 'Hrimhusk Chip', 'shield', { vit: 3, def: 3 }, '#8ab8d8', 'ชิปเสริม — ใส่โล่: VIT +3, DEF +3', 'Augment chip — Shield slot: VIT +3, DEF +3');
  chip('frostmane_card', 'Frostmane Chip', 'shoes', { agi: 2, hp: 250, speedPct: 3 }, '#e8f8ff', 'ชิปเสริม — ใส่รองเท้า: AGI +2, MaxHP +250, ความเร็วเดิน +3%', 'Augment chip — Shoes slot: AGI +2, MaxHP +250, Move Speed +3%');
  chip('hraesvelgr_card', 'Hræsvelgr Chip', 'acc', { agi: 3, dex: 3, critDmgPct: 10 }, '#c8f0ff', '[MVP] ใส่เครื่องประดับ: AGI +3, DEX +3, แรงคริติคอล +10%', '[MVP] Accessory slot: AGI +3, DEX +3, Crit DMG +10%', true);

  // ===================== มอนสเตอร์ (Lv 72–84) =====================
  // เส้น EXP ต่อจากบทที่ 7: exp ≈ 3460 × (lv/57)^2.5 (เส้นเดียวกับ js/content_ch6.js / content_ch7.js) • HP ≈ 4000 × (lv/58)^1.9 • ATK ≈ 206 × (lv/58)^1.25
  // HIT +2.3/เลเวล • ตีก่อน 2 จาก 5 ชนิด • เผ่า: พืช 1 • แมลง 1 • เทวดา 1 • อมตะ 1 • สัตว์กลไก 1 (Slayer ทุกเผ่าในร้าน Hunt Rune มีเป้า)
  Object.assign(MOBS, {
    frostbud: variant('stumpling', { name: 'Frostbud Unit', lv: 72, hp: 6000, atk: [270, 337], def: 30, mdef: 35, vit: 70, flee: 74, hit: 169, exp: 6200, jexp: 4340, speed: 1.1,
      aggro: false, element: 'water', race: 'plant', hue: -150, sat: 0.7, bri: 1.1, tint: ['#a8d8f0', 0.45],
      lore: L('ตาของกิ่งที่ถูกน้ำแข็งกัดก่อนจะทันผลิ สามสิบปีที่มันหันหน้าเข้าหาความอุ่นที่ไม่เคยมาถึง', 'A branch-bud frozen before it could open. For thirty years it has turned toward a warmth that never came.'),
      drops: [['frost_bud', 0.5], ['leaf_silk', 0.3], ['white_potion', 0.04], ['volt_ore', 0.05],
        ['rimeleaf_dirk', 0.0075], ['frostroot_boots', 0.0075], ['rimebark_coat', 0.0075], ['frostbud_wand', 0.0075], ['frostbark_shield', 0.0075], ['rimepetal_mantle', 0.0075]] }),
    rime_moth: variant('buzzfly', { name: 'Rime Moth Unit', lv: 75, hp: 6200, atk: [284, 355], def: 15, mdef: 30, vit: 66, flee: 104, hit: 176, exp: 6870, jexp: 4810, speed: 2.3,
      aggro: true, element: 'wind', race: 'insect', scale: 1.45, hue: -170, sat: 0.55, bri: 1.2, tint: ['#d0f0ff', 0.5],
      lore: L('โดรนผสมเกสรของกิ่งเหนือ ปีกจับน้ำแข็งจนหนัก แต่ยังบินเข้าหาประกายทุกดวงที่อุ่นกว่ามัน', 'Pollinator drones of the northern branch, wings heavy with rime — they still fly at any spark warmer than themselves.'),
      drops: [['rime_wing', 0.45], ['buzz_wing', 0.3], ['white_potion', 0.04], ['rune_alloy', 0.05],
        ['rimehorn_axe', 0.009], ['mothwing_hood', 0.009], ['frostwing_saber', 0.009], ['rimestring_bow', 0.009], ['mothsilk_kris', 0.0025], ['frostdust_charm', 0.0025]] }),
    gjallar_sentinel: variant('hel_guard', { name: 'Gjallar Sentinel', lv: 78, hp: 7000, atk: [298, 373], def: 45, mdef: 30, vit: 76, flee: 80, hit: 183, exp: 7580, jexp: 5300, speed: 1.5,
      aggro: false, stun: [10, 2], element: 'neutral', race: 'angel', hue: 35, sat: 0.6, bri: 1.15, tint: ['#f0e0a0', 0.35],
      lore: L('ยามปลายสะพานสายรุ้งของ Heimdall ถือแตรที่เป่าไม่ออกเสียงมาสามสิบปี ยังรอสัญญาณว่าให้ใครผ่าน', "Sentinels of Heimdall's bridge-end, holding horns that have made no sound in thirty years. They still wait for the signal to let someone pass."),
      drops: [['gjallar_shard', 0.45], ['rune_shard', 0.3], ['white_potion', 0.04], ['volt_ore', 0.05],
        ['gjallar_mace', 0.009], ['sentinel_plate', 0.009], ['sentinel_signet', 0.009], ['horncall_staff', 0.0025], ['bridgewarden_axe', 0.0025], ['heimdall_blade', 0.0025], ['bifrost_bow', 0.0025]] }),
    hrimhusk: variant('rust_draugr', { name: 'Hrimhusk Unit', lv: 81, hp: 7600, atk: [313, 391], def: 40, mdef: 25, vit: 80, flee: 72, hit: 190, exp: 8330, jexp: 5830, speed: 1.1,
      aggro: false, stun: [12, 2], element: 'undead', race: 'undead', hue: -160, sat: 0.5, bri: 1.1, tint: ['#8ab8d8', 0.45],
      lore: L('ร่างของหน่วยที่ล้มลงนอกรัศมีรากในคืนที่กิ่งหัก ใบไม้มาไม่ถึง ร่างจึงยืนแข็งอยู่ตรงนั้น — ยังเดินยามแทนเจ้าของ', "Frames of units who fell beyond the roots on the night the branches broke. No leaf came; the frames froze where they stood — still walking their owners' rounds."),
      drops: [['rime_frame', 0.45], ['grave_dust', 0.3], ['white_potion', 0.04], ['rune_alloy', 0.05],
        ['husk_fang', 0.0065], ['hrimhusk_mail', 0.0065], ['frozenstep_boots', 0.0065], ['rimeglass_rod', 0.0065], ['frozen_kite', 0.0065], ['hoarfrost_cloak', 0.0065], ['hrim_hammer', 0.003]] }),
    frostmane: variant('tuskboar', { name: 'Frostmane Unit', lv: 84, hp: 8100, atk: [327, 409], def: 40, mdef: 30, vit: 84, flee: 86, hit: 197, exp: 9120, jexp: 6380, speed: 1.9,
      aggro: true, element: 'water', race: 'brute', scale: 1.2, hue: -165, sat: 0.6, bri: 1.2, tint: ['#e0f4ff', 0.45],
      lore: L('ม้าเหล็กแผงคอน้ำแข็งที่เคยลากเลื่อนขนน้ำเลี้ยงขึ้นปลายกิ่ง เส้นทางขาดไปแล้ว แต่มันยังวิ่งเต็มฝีเท้าทุกครั้งที่เห็นใคร', "Frost-maned iron horses that once hauled sap-sleds to the bough's tip. The road is long gone, but they still charge full tilt at anyone they see."),
      drops: [['frost_mane', 0.45], ['iron_tusk', 0.3], ['volt_ore', 0.055], // ไม่มียา: เพดาน 12 ดรอป/มอน (tests/loot_audit.js)
       
        ['frostmane_cleaver', 0.0065], ['frostmane_helm', 0.0065], ['maneglass_sword', 0.0065], ['maneline_bow', 0.0065], ['hoofbreaker_maul', 0.0065],
        ['aurora_vestment', 0.0025], ['skyrunner_boots', 0.0025], ['frostmane_band', 0.0025], ['hrae_quill', 0.0015]] }),

    // --- MVP: Hræsvelgr (Lv 85) — หน่วยคุมลมที่ปลายกิ่งเหนือ ต้นลม Fimbulwinter ---
    hraesvelgr: variant('seraph_pudding', { name: 'Hræsvelgr', lv: 85, hp: 100000, atk: [370, 470], def: 50, mdef: 55, vit: 85, flee: 140, hit: 225, exp: 100000, jexp: 70000, speed: 2.0,
      aggro: true, stun: [12, 2], element: 'wind', race: 'angel', scale: 2.6, boss: true, respawn: 900000, bossSkill: 'galeburst',
      hue: -160, sat: 0.55, bri: 1.15, tint: ['#9ad8ff', 0.45],
      lore: L('หน่วยคุมลมที่ Odin ตั้งไว้ปลายกิ่งเหนือ ปีกของมันคือต้นลม Fimbulwinter — คำสั่งสุดท้าย: ดับทุกประกายนอกรัศมีราก', 'The wind-keeper Odin set at the tip of the northern branch; its wings are where the Fimbulwinter wind is born. Its last order: snuff out every spark beyond the roots.'),
      drops: [['hrae_talon', 0.08], ['hrae_quill', 0.08], ['hrae_pinions', 0.08], ['hrae_crown', 0.08], ['gjallarhorn', 0.0005], ['frost_mane', 0.8], ['rune_alloy', 0.7], ['yggdrasil_shard', 0.25]] }),
  });
  for (const id of ['frostbud', 'rime_moth', 'gjallar_sentinel', 'hrimhusk', 'frostmane', 'hraesvelgr']) MOBS[id].id = id;
  Object.assign(MOB_CHIP, { frostbud: 'frostbud_card', rime_moth: 'rimemoth_card', gjallar_sentinel: 'gjallar_card', hrimhusk: 'hrimhusk_card', frostmane: 'frostmane_card', hraesvelgr: 'hraesvelgr_card' });
  // ของตำนานจากบอสโลก (Ancient Hræsvelgr) ดรอปง่ายขึ้น — LOOT.patchWorldBoss (js/loot.js) • ชุดเซ็ตจาก MVP
  LOOT.WB_EXTRA.hraesvelgr = ['gjallarhorn'];
  LOOT.SETS.stormwing = { id: 'stormwing', name: 'Stormwing', items: ['hrae_talon', 'hrae_pinions', 'hrae_crown'], bonus: { 2: { agi: 3, dex: 3 }, 3: { aspdPct: 6, critDmgPct: 12 } } };

  // ===================== แผนที่: Severed Bough =====================
  // ทางขึ้น: ประตูด้านในริมขอบเหนือของ Mistlake (ช่องหญ้าที่เดินได้อยู่แล้ว) • ทางต่อ: ขากรรไกรของ Fenrir ที่ปลายกิ่ง (ขอบเหนือ → js/content_ch9.js)
  MAP_DEFS.bough = {
    name: 'Severed Bough', thai: L('กิ่งที่ขาด — โพรงในกิ่งหักที่น้ำแข็งกัด ทางเหนือ', 'The Severed Bough — a frozen hollow inside the broken branch, far to the north'), w: 88, h: 84, kind: 'cave', seed: 919, dark: true,
    links: { S: 'mistlake' }, level: '71-84 (MVP: Hræsvelgr)',
    spawns: [['frostbud', 16], ['rime_moth', 11], ['gjallar_sentinel', 11], ['hrimhusk', 11], ['frostmane', 10]], mvp: 'hraesvelgr',
    mvpAt: [75.5, 7.5], // ปลายกิ่ง: ลานกว้างมุมตะวันออกเฉียงเหนือ (ไกลจากทางขึ้นทางใต้) • ใช้กับ Ancient Hræsvelgr ด้วย
    npcs: [{ id: 'huginn', name: 'Huginn Raven-Courier', x: 47, y: 77, look: 'keeper' }], // กาของ Mimir — รอที่ปากทางขึ้น
    arrive: { bifrost: [44.5, 77.5] },
  };
  MAP_DEFS.mistlake.links.N = 'bough';
  MAP_DEFS.mistlake.portalAt = Object.assign(MAP_DEFS.mistlake.portalAt || {}, { N: [48, 2, 48, 4] });
  ATMOS.bough = { kind: 'snow', n: 70, fog: true, grade: 'rgba(120,180,235,0.14)' }; // หิมะปลิว + หมอกเย็น (render.js)
  Object.assign(MAP_DEFS.bough, { caveTheme: { tint: '#7ab8e8', tintA: 0.62, colorA: 0.42, roots: '#a8c8dc' }, crystalImg: 'prop_crystal_frost', crystalGlow: '170,230,255' });
  Art.alias('prop_crystal_frost', 'prop_crystal', { hue: -40, sat: 0.6, bri: 1.2 });
  Art.alias('map_bough', 'map_helcave', { hue: -140, sat: 0.55, bri: 1.05, tint: ['#9ad0f0', 0.35], w: 960 });
  // ฉากเปิดตัว MVP (mvp_hraesvelgr): ย้อมจากภาพ Seraph Core เองอัตโนมัติ (Art.variantSource — base = seraph_pudding)
  // Huginn: ภาพเดินของ Trickster ย้อมโทนกาดำเย็น (แบบเดียวกับ Muninn ใน js/content_world.js) — ภาพในกล่องคุยใช้ภาพเดียวกัน
  const RAVEN = { hue: 230, sat: 0.35, bri: 0.6 };
  Art.alias('anim_npc_huginn_walk', 'anim_trickster_m_walk', RAVEN);
  Art.alias('npc_huginn', 'job_trickster_m', RAVEN);

  // ===================== ชุดท่าบอส Hræsvelgr =====================
  // ทุกท่ามีป้ายแดง ≥ 1 วิ หลบได้หมด • ดาเมจผ่าน bossDmg (เพดาน 60% MaxHP) • ลูกสมุนไม่มีรางวัล (BossKit.MINION)
  // ลมพัด (แนวตรงกว้าง) • ขนน้ำแข็ง (วงตกตามรอยเท้า 3 ระลอก) • ตาพายุ (วงโดนัทรอบตัวมัน — เข้าชิดตัวคือที่ปลอดภัย + แข็งมึน)
  // Ancient: ลมพัด 3 แนว + ตาพายุปิด (วงในตามมา) + ท่าไม้ตาย "ฉีกฟ้า" (แฉก 4 ทิศ แล้วแฉกทแยง — ยืนระหว่างแฉก)
  const ICE = '#a8e8ff', ICE_RGB = '168,232,255';
  BOSS_SKILLS.galeburst = m => {
    const p = G.player; if (p.dead) return;
    const x = m.x, y = m.y, a = toP(m), A = ancient(m);
    faceTo(m, p.x, p.y);
    cue(m, 'GALE', ICE);
    UI.msg(A ? L(`${m.def.name} พัดลมหนาว 3 แนว! แนวกลางตรงมาหาเจ้า — วิ่งออกด้านข้างให้พ้นทั้งสามแนว!`, `${m.def.name} looses a three-lane GALE! The middle lane comes straight at you — run wide of all three!`)
      : L(`${m.def.name} กางปีกจะพัดลมหนาว! แนวลมพุ่งตรงมา — ก้าวออกด้านข้าง!`, `${m.def.name} spreads its wings for a GALE! A wind lane races straight at you — step aside!`), 'mvp');
    const lane = (ang, dur) => telegraph(m, { shape: 'line', x, y, a: ang, len: 12, w: 2.6, dur }, () => damagePlayer(bossDmg(m, 1.5, true), ICE),
      () => { m.atkAnim = 1; for (let i = 1; i <= 6; i++) addFx({ type: 'ring', x: x + Math.cos(ang) * i * 2, y: y + Math.sin(ang) * i * 2, dur: 0.45, r: 1.2, color: ICE_RGB }); kick(4, 0.15); });
    lane(a, 1.3);
    if (A) { lane(a + 0.62, 1.7); lane(a - 0.62, 1.7); }
    if (!G.fastSim) Sound.play('fire');
  };
  BOSS_SKILLS.featherfall = m => {
    const p = G.player; if (p.dead) return;
    const n = ancient(m) ? 5 : 3;
    cue(m, 'FROST FEATHERS', '#e0f6ff');
    UI.msg(L(`${m.def.name} สลัดขนน้ำแข็งตกตามรอยเท้าเจ้า ${n} ระลอก! เดินไม่หยุด!`, `${m.def.name} sheds FROST FEATHERS onto your footsteps — ${n} waves! Keep moving!`), 'mvp');
    for (let i = 0; i < n; i++) later(i * 0.5, () => {
      if (m.dead || p.dead) return;
      const x = p.x, y = p.y;
      telegraph(m, { shape: 'circle', x, y, r: 1.8, dur: 1.2 }, () => damagePlayer(bossDmg(m, 1.2, true), '#e0f6ff'),
        () => { addFx({ type: 'ring', x, y, dur: 0.5, r: 2.0, color: '224,246,255', waves: 2 }); });
    });
  };
  BOSS_SKILLS.stormeye = m => {
    const p = G.player; if (p.dead) return;
    const x = m.x, y = m.y, R0 = 3, A = ancient(m);
    cue(m, 'EYE OF THE STORM', ICE);
    UI.msg(A ? L(`${m.def.name} หมุนพายุรอบตัว! เข้าไปในตาพายุชิดตัวมัน — แล้วรีบออกก่อนตาพายุปิด!`, `${m.def.name} whirls a storm about itself! Get into the EYE beside it — then get out before the eye closes!`)
      : L(`${m.def.name} หมุนพายุรอบตัว! ที่ปลอดภัยคือตาพายุ — ชิดตัวมัน!`, `${m.def.name} whirls a storm about itself! The only safe place is the EYE — right beside it!`), 'mvp');
    telegraph(m, { shape: 'ring', x, y, r0: R0, r: 10, dur: 1.6 }, () => {
      damagePlayer(bossDmg(m, 1.6, true), ICE);
      const d = p.d; if (!d.unshaken) stunPlayer(1.0 * (1 - (d.stunRes || 0) / 100)); // แข็งค้าง 1 วิ
      UI.msg(L('ลมหนาวตรึงร่างเจ้าไว้ชั่วครู่!', 'The freezing wind locks your frame in place for a moment!'), 'err');
    }, () => { addFx({ type: 'ring', x, y, dur: 0.8, r: 10, color: ICE_RGB, waves: 3 }); kick(6, 0.22); });
    if (A) telegraph(m, { shape: 'circle', x, y, r: R0, dur: 2.5 }, () => damagePlayer(bossDmg(m, 1.8, true), '#ffffff'),
      () => { m.atkAnim = 1; addFx({ type: 'ring', x, y, dur: 0.7, r: R0 + 0.4, color: '255,255,255', waves: 3 }); });
    if (!G.fastSim) Sound.play('holy');
  };
  BOSS_SKILLS.skytear = m => {
    const p = G.player; if (p.dead) return;
    const x = m.x, y = m.y, a = toP(m);
    cue(m, 'SKY TEAR', '#ffffff');
    UI.msg(L(`${m.def.name} ฉีกฟ้าเป็นแฉก! แฉกตรง 4 ทิศก่อน แล้วแฉกทแยง — ยืนระหว่างแฉก!`, `${m.def.name} TEARS THE SKY into spokes! Four straight spokes first, then the diagonals — stand between them!`), 'mvp');
    const wave = (off, dur) => { for (let k = 0; k < 4; k++) { const q = a + off + k * Math.PI / 2;
      telegraph(m, { shape: 'line', x, y, a: q, len: 13, w: 1.6, dur }, () => damagePlayer(bossDmg(m, 1.7, true), '#ffffff'),
        () => { for (let j = 1; j <= 5; j++) addFx({ type: 'ring', x: x + Math.cos(q) * j * 2.4, y: y + Math.sin(q) * j * 2.4, dur: 0.4, r: 1.0, color: '235,250,255' }); }); } };
    wave(0, 1.3); wave(Math.PI / 4, 2.1);
    if (!G.fastSim) Sound.play('holy');
  };
  BOSS_ROTATION.galeburst = ['galeburst', 'featherfall', 'shockwave']; // สำรองเมื่อไม่มี BossKit
  (window.BOSSKIT_EXTRA = window.BOSSKIT_EXTRA || []).push((K, addMinion) => {
    addMinion('mn_galechick', 'buzzfly', { name: 'Gale Chick', lv: 79, hp: 1300, atk: [170, 205], def: 15, mdef: 30, vit: 60, flee: 110, hit: 175, speed: 2.7, element: 'wind', race: 'insect',
      scale: 1.0, hue: -170, sat: 0.55, bri: 1.25, tint: ['#e0f6ff', 0.5],
      lore: L('ลูกนกลมที่ Hræsvelgr สลัดออกจากปีก บินได้ไม่นานก็สลายเป็นเกล็ดน้ำแข็ง', "Gale-chicks shaken from Hræsvelgr's wings. They fly briefly, then scatter into ice.") });
    addMinion('mn_rimeling', 'stumpling', { name: 'Rimeling', lv: 79, hp: 1700, atk: [175, 210], def: 30, mdef: 35, vit: 65, flee: 60, hit: 165, speed: 1.4, element: 'water', race: 'plant',
      scale: 0.8, hue: -150, sat: 0.7, bri: 1.15, tint: ['#a8d8f0', 0.45],
      lore: L('ตาน้ำแข็งที่หลุดจากกิ่ง ลมพัดให้มันกลิ้งเข้าหาเจ้า', 'Ice-buds broken off the bough, rolled toward you by the wind.') });
    K.KITS.hraesvelgr = { col: ICE_RGB, hex: ICE, rot: ['galeburst', 'featherfall', 'stormeye', 'shockwave', 'slam'], wbRot: ['galeburst', 'skytear', 'featherfall', 'stormeye', 'shockwave', 'slam'], ult: 'skytear',
      minions: ['mn_galechick', 'mn_rimeling'], elite: 'mn_galechick', cry: L('ลมเอ๋ย... พัดมันให้ดับ!', 'Wind... blow them out!') };
  });

  // ===================== เรื่องราว: MVP / บรรทัดแผนที่ =====================
  Story.MAP_LINES.bough = L('ลมที่นี่พัดทางเดียวมาสามสิบปี — ทุกอย่างที่อุ่นถูกพัดจนเย็น', 'The wind here has blown one way for thirty years — everything warm has been blown cold.');
  Story.MAP_LINES_AFTER.bough = L('ลมหยุดแล้ว... น้ำแข็งที่ปลายกิ่งเริ่มละลายเป็นหยดน้ำเลี้ยง', 'The wind has stopped... the ice at the tip of the bough has begun to melt into drops of sap.');
  Story.MVP.hraesvelgr = {
    sub: L('ผู้คุมลมที่ปลายกิ่ง — ลมหายใจของ Fimbulwinter', 'Keeper of the Wind at the Bough\'s Tip — the breath of Fimbulwinter'),
    spawn: L('Hræsvelgr กางปีกบนปลายกิ่งที่ขาด — ลมทั้งกิ่งเปลี่ยนทิศเข้าหาประกายของเจ้า', 'Hræsvelgr spreads its wings at the tip of the Severed Bough — and every wind on the branch turns toward your spark.'),
    fallName: '[Hræsvelgr]',
    fall: L('ปีกของ Hræsvelgr หุบลงเป็นครั้งแรกในรอบสามสิบปี ลมทั้งกิ่งเงียบ<br>และในความเงียบนั้น — ที่ปลายกิ่ง — <b>ประกายดวงใหม่สว่างขึ้นเต็มดวง</b>',
      'Hræsvelgr folds its wings for the first time in thirty years, and the whole bough falls still.<br>And in that stillness — at the very tip — <b>the new spark blazes into full light.</b>'),
    fallShort: L('Hræsvelgr ล้มลง — ลมที่ปลายกิ่งหยุดพัดเป็นครั้งแรกในรอบสามสิบปี', 'Hræsvelgr falls — the wind at the bough\'s tip stops for the first time in thirty years.'),
  };

  // ===================== เควสต์บทที่ 8 =====================
  // เริ่มต่อจาก ch7_home (เซฟที่จบภาค 1 แล้ว = เควสต์ถัดไปคือ ch8_howl ทันที — Quest.state ต่อท้ายสายเอง)
  // รางวัล EXP รวมราว 0.35 เลเวลที่ Lv 78 (สัดส่วนเดียวกับบท 7) • เรื่องเดินไปพร้อมเลเวล ไม่ล็อกการเดินทาง
  if (typeof CHAPTERS !== 'undefined') CHAPTERS[8] = L('กิ่งที่ขาด', 'The Severed Bough');
  QUESTS.push(
    { id: 'ch8_howl', ch: 8, title: L('เสียงหอนสี่สิบเอ็ดเสียง', 'Forty-One Howls'), desc: L('Mimir บันทึกว่า Fenrir Unit ทุกตัวหอนพร้อมกัน — Bifrost Keeper ในนีโอเอลด์ไฮม์จดจำทุกอย่าง ไปถามเขาว่าพวกมันหันไปทางไหน', 'Mimir recorded every Fenrir Unit howling as one — the Bifrost Keeper in Neo Eldheim remembers everything. Ask him which way they were facing.'),
      done: L('Bifrost Keeper: "ทุกตัวหันไปทางเหนือ — ผ่าน Mistlake ไปถึงที่ที่สะพานของข้าเคยสิ้นสุด"', 'Bifrost Keeper: "Every one faced north — past Mistlake, to where my bridge once ended."'),
      obj: { type: 'talk', npc: 'bifrost' }, reward: { items: [['white_potion', 5]], bexp: 40000, jexp: 28000 } },
    { id: 'ch8_bud', ch: 8, title: L('ตาที่ไม่เคยผลิ', 'Buds That Never Opened'), desc: L('เดินขึ้นเหนือจากขอบเหนือของ Mistlake Plains เข้าสู่ Severed Bough แล้วทำลาย Frostbud Unit 20 ตัว', 'Walk north from the northern edge of the Mistlake Plains into the Severed Bough, and destroy 20 Frostbud Units.'),
      done: L('ตาไม้ทุกตาเอียงไปทางเดียวกัน — ทางปลายกิ่ง ที่มีอะไรบางอย่างอุ่นอยู่', 'Every bud leans the same way — toward the tip of the bough, where something is warm.'),
      obj: { type: 'kill', mob: 'frostbud', n: 20 }, reward: { items: [['white_potion', 5]], bexp: 70000, jexp: 49000 } },
    { id: 'ch8_wing', ch: 8, title: L('ปีกที่จับน้ำแข็ง', 'Wings Rimed in Ice'), desc: L('เก็บ Rime Wing 8 ชิ้นจาก Rime Moth Unit — ฝุ่นบนปีกพวกมันจำทิศลมได้ (ส่งแล้วไอเทมจะถูกใช้ไป)', "Collect 8 Rime Wings from Rime Moth Units — the dust on their wings remembers the wind's direction (the items are consumed on turn-in)."),
      done: L('ลมพัดทางเดียวมาสามสิบปี... และในฝุ่นมีขนนกสีดำติดอยู่เส้นหนึ่ง — ขนของกา', 'The wind has blown one way for thirty years... and caught in the dust is a single black feather — a raven\'s.'),
      obj: { type: 'collect', item: 'rime_wing', n: 8, mob: 'rime_moth' }, reward: { zeny: 25000, bexp: 90000, jexp: 63000 } },
    { id: 'ch8_huginn', ch: 8, title: L('ความคิดไปไกลกว่าความจำ', 'Thought Flies Farther'), desc: L('กาเหล็กสีดำตัวหนึ่งเกาะรออยู่ใกล้ทางขึ้นของ Severed Bough — Huginn ความคิดของ Mimir ที่บินขึ้นเหนือแล้วไม่กลับ ไปฟังเขา', "A black iron raven perches near the way up into the Severed Bough — Huginn, Mimir's Thought, who flew north and never returned. Go and hear him."),
      done: L('Huginn: "ลดจำนวนร่างแข็งตามกิ่งก่อน แล้วลมจะพาเจ้าไปหามันเอง"', 'Huginn: "Thin out the frozen frames along the bough first — then the wind itself will lead you to it."'),
      obj: { type: 'talk', npc: 'huginn' }, reward: { items: [['white_potion', 5], ['blue_potion', 3]], bexp: 60000, jexp: 42000 } },
    { id: 'ch8_husk', ch: 8, title: L('ผู้ที่ไม่ได้กลับบ้าน', 'Those Who Never Came Home'), desc: L('Hrimhusk Unit คือร่างของหน่วยที่ล้มลงนอกรัศมีรากในคืนที่กิ่งหัก ใบไม้มาไม่ถึง — ปล่อยพวกเขาพัก 25 ร่าง', 'Hrimhusk Units are the frames of units who fell beyond the roots on the night the branches broke, where no leaf could reach. Lay 25 of them to rest.'),
      done: L('ร่างหนึ่งไม่มีหมวก — บนไหล่ยังมีรอยของหมวกเขาที่เคยสวม... แล้วลมทั้งกิ่งก็หมุนกลับเข้าหาเจ้า', 'One frame wears no helm — yet its shoulders still bear the marks of a horned one... and then every wind on the bough turns toward you.'),
      obj: { type: 'kill', mob: 'hrimhusk', n: 25 }, reward: { items: [['white_potion', 5]], bexp: 140000, jexp: 98000 } },
    { id: 'ch8_storm', ch: 8, title: L('ล่า MVP: Hræsvelgr', 'MVP Hunt: Hræsvelgr'), desc: L('Hræsvelgr ผู้คุมลมที่ปลายกิ่ง พัดประกายดวงใหม่จนริบหรี่ทุกคืน ปราบมันที่ลานปลายกิ่งทางเหนือ (MVP Lv 85) ระวังแนวลม ขนน้ำแข็งที่ตกตามรอยเท้า และตาพายุ!', 'Hræsvelgr, keeper of the wind at the tip, beats the new spark dim every night. Defeat it on the open ground at the north tip of the bough (MVP Lv 85). Beware its gale lanes, the frost feathers that fall on your footsteps, and the eye of the storm!'),
      done: L('ลมหยุดพัดเป็นครั้งแรกในรอบสามสิบปี — กลับไปหา Huginn', 'For the first time in thirty years, the wind stops — return to Huginn.'),
      obj: { type: 'kill', mob: 'hraesvelgr', n: 1 }, reward: { items: [['yggdrasil_shard', 1], ['white_potion', 10]], zeny: 60000 } },
    { id: 'ch8_tip', ch: 8, title: L('ปลายกิ่ง', 'The Tip of the Bough'), desc: L('ลมเงียบแล้ว — กลับไปหา Huginn ที่ทางขึ้นของ Severed Bough ที่ปลายกิ่งมีบางอย่างกำลังตื่น', 'The wind is silent — return to Huginn by the way up into the Severed Bough. Something at the tip of the branch is waking.'),
      done: L('ขากรรไกรเหล็กที่ปลายกิ่งอ้าออก... และประกายดวงใหม่ถูกกลืนหายไป', 'The iron jaws at the bough\'s tip opened... and the new spark was swallowed whole.'),
      obj: { type: 'talk', npc: 'huginn' }, reward: { items: [['white_potion', 10]], bexp: 120000, jexp: 84000 } },
  );

  // ===================== ฉากเรื่องราว =====================
  // Quest.onTalk ทำงานก่อนสคริปต์ NPC: เควสต์ talk ที่กำลังทำสำเร็จไปแล้วเมื่อถึงตรงนี้ → ใช้ flag c8* ใน Story.st() เล่นฉากครั้งเดียว
  const SCENES = {
    async howl(nm) {
      await UI.say(nm, L('ข้าจดจำเสียงหอน <b>สี่สิบเอ็ดเสียง</b> เมื่อคืน ทุกเสียงเริ่มพร้อมกัน และจบพร้อมกัน<br>Fenrir Unit ทุกตัวในป่าหันหน้าไปทางเดียว — ทางเหนือ',
        'I recorded <b>forty-one howls</b> last night. Every one began at the same instant, and ended at the same instant.<br>Every Fenrir Unit in the wood faced one way — north.'));
      await UI.say(nm, L('ทางเหนือของ Mistlake คือที่ที่สะพานของข้าเคยไปสิ้นสุด — <b>กิ่งที่ขาด</b> นอนอยู่ตรงนั้นตั้งแต่คืนที่กิ่งหัก<br>สายรุ้งของข้าไปไม่ถึงมาสามสิบปี ลมที่นั่นพัดมันขาดทุกครั้ง',
        'North of Mistlake is where my bridge once ended — <b>the Severed Bough</b> has lain there since the night the branches broke.<br>My rainbow has not reached it in thirty years; the wind there tears it apart every time.'));
      await UI.say(nm, L('เดินขึ้นเหนือจากขอบทุ่ง Mistlake ไปเอง ใบแรก<br>ข้าจะจดจำทุกก้าว... และจะนับว่าเจ้ากลับมากี่ครั้ง',
        'Walk north from the edge of the Mistlake plains yourself, First Leaf.<br>I will record every step... and count how many times you come back.'));
    },
    async huginn(nm) {
      await UI.say(nm, L('(กาเหล็กสีดำกระพือปีกที่น้ำแข็งเกาะจนหนัก) ...ใบแรก? Muninn ส่งข่าวถึงข้าไม่ได้ แต่ข้า<b>คิด</b>ว่าเจ้าจะมา<br>ข้าคือ Huginn — ความคิดของ Mimir ความคิดไปไกลกว่าความจำเสมอ',
        '(A black iron raven shakes out wings heavy with ice.) ...The First Leaf? Muninn could never reach me with news, but I <b>thought</b> you would come.<br>I am Huginn — Mimir\'s Thought. Thought always flies farther than memory.'));
      await UI.say(nm, L('ข้าบินตามประกายดวงใหม่มาถึงปลายกิ่งนี้ — มันงอกขึ้นคืนที่เสียงแทะหยุด<br>แต่ <b>Hræsvelgr</b> ผู้คุมลมพัดมันจนริบหรี่ทุกคืน มันจำได้แค่คำสั่งเดียว: <b>ดับทุกประกายนอกรัศมีราก</b>',
        'I followed the new spark here, to the tip of this bough — it sprouted the night the gnawing stopped.<br>But <b>Hræsvelgr</b>, the wind-keeper, beats it dim every night. It remembers only one order: <b>snuff out every spark beyond the roots.</b>'));
      await UI.say(nm, L('ใครสั่ง? ข้าคิดว่า Odin... ในคืนนั้น เพื่อไม่ให้สนิมได้กินประกายที่หลุดออกไป<br>และอีกเรื่อง ใบแรก — เสียงหอนที่เจ้าได้ยิน ไม่ได้หอน<b>ถึง</b>ประกายดวงนี้ มันหอน<b>เตือน</b>',
        'Who gave that order? I think Odin... that night, so the Rust could not feed on any spark that slipped away.<br>And one more thing, First Leaf — the howls you heard were not howling <b>at</b> this spark. They were a <b>warning</b>.'));
    },
    async tip(nm) {
      await UI.say(NARR, L('ลมหยุดพัดเป็นครั้งแรกในรอบสามสิบปี น้ำแข็งที่ปลายกิ่งแตกออก<br>ใต้มันคือ<b>หัวหมาป่าเหล็กขนาดเท่าภูเขา</b> นอนนิ่งอยู่บนกิ่งที่มันหักลงมา',
        'For the first time in thirty years, the wind stops. The ice at the tip of the bough cracks open —<br>beneath it lies <b>an iron wolf\'s head the size of a mountain</b>, motionless on the branch it broke as it fell.'));
      await UI.say(nm, L('Fenrir ไม่ได้แตกเป็นร้อยตัว... ร้อยตัวในป่าคือเขี้ยวและเกล็ดที่มันสลัดทิ้ง<br>ร่างจริงตกลงมาที่นี่ในคืนนั้น พร้อมทุกอย่างที่มันกลืนไว้',
        'Fenrir never shattered into a hundred pieces... the hundred in the wood are teeth and plates it shed.<br>Its true body fell here that night — with everything it had swallowed.'));
      await UI.say(NARR, L('ประกายดวงใหม่ที่ปลายกิ่งสว่างขึ้นเมื่อไม่มีลมพัด — แล้ว<b>ขากรรไกรเหล็กก็อ้าออก</b><br>แสงสีเขียวสนิมเรืองขึ้นจากข้างใน... และประกายดวงนั้นถูกดูดหายเข้าไปในปาก',
        'Unbeaten by the wind, the new spark blazes up — and then <b>the iron jaws open</b>.<br>A rust-green light glows from within... and the spark is drawn into the maw and gone.'));
      await UI.say(nm, L('หัวของ Nidhogg... มันยังหิว และมันรอประกายดวงนี้มาตลอด<br>ข้าคิดไม่ออกว่าจะเข้าไปอย่างไร — แต่คนที่ตีโซ่ล่ามหมาป่าตัวนี้รู้ ไปหา Brokk เถิด',
        'Nidhogg\'s head... still hungry, and it has waited for this very spark all along.<br>I cannot think of a way inside — but the one who forged the chain that bound this wolf would know. Go to Brokk.'));
    },
  };
  const chapterCard = () => {
    if (G.fastSim) return;
    UI.splash(null, L('ภาคที่ 2 • บทที่ 8 — กิ่งที่ขาด', 'Part II • Chapter 8 — The Severed Bough'), L('เสียงหอนชี้ไปทางเหนือ • IRON VALHALLA', 'The howls point north • IRON VALHALLA'), 'upgrade');
  };
  Story.ch8 = { SCENES, chapterCard };

  // ---------- Bifrost Keeper: ฉากเสียงหอน (ห่อสคริปต์เดิม) ----------
  const bifRun = NPC.scripts.bifrost;
  NPC.scripts.bifrost = async n => {
    const st = Story.st();
    if (Quest.isDone('ch8_howl') && !st.c8howl) { await SCENES.howl(`[${n.name}]`); st.c8howl = 1; saveGame(); UI.dlgClose(); chapterCard(); return; }
    return bifRun(n);
  };
  // ---------- Huginn (ทางขึ้นของ Severed Bough) ----------
  NPC.scripts.huginn = async n => {
    const st = Story.st(), nm = `[${n.name}]`;
    if (Quest.isDone('ch8_huginn') && !st.c8huginn) { await SCENES.huginn(nm); st.c8huginn = 1; saveGame(); return; }
    if (Quest.isDone('ch8_tip') && !st.c8tip) { await SCENES.tip(nm); st.c8tip = 1; saveGame(); UI.dlgClose(); if (Story.ch9) Story.ch9.chapterCard(); return; }
    const line = !Quest.passed('ch8_huginn') ? L('(กาเหล็กเอียงหัวมองเจ้า) ...ข้ากำลังคิด อย่าเพิ่งรบกวน<br>ไปดูตาไม้กับโดรนน้ำแข็งก่อน แล้วค่อยกลับมา', '(The iron raven tilts its head at you.) ...I am thinking. Do not interrupt just yet.<br>Go and look at the frozen buds and drones first, then come back.')
      : Quest.passed('ch8_tip') ? L('ข้าจะรอตรงนี้ จนกว่าจะเห็นประกายดวงนั้นออกมาจากปากหมาป่า<br>ความคิดรอได้นานกว่าที่เจ้าคิด ใบแรก', 'I will wait here until I see that spark come out of the wolf\'s jaws.<br>Thought can wait longer than you think, First Leaf.')
      : Quest.isDone('ch8_storm') ? L('ลมหยุดแล้ว... เจ้ารู้สึกไหม ปลายกิ่งกำลังอุ่นขึ้น', 'The wind has stopped... can you feel it? The tip of the bough is growing warm.')
      : L('Hræsvelgr มีสามท่าที่เจ้าต้องจำ: แนวลมพุ่งตรง — ก้าวออกด้านข้าง • ขนน้ำแข็งตกตามรอยเท้า — เดินไม่หยุด<br>และตาพายุ: วงลมรอบตัวมัน ที่ปลอดภัยคือชิดตัวมันเอง', 'Three things to remember about Hræsvelgr: a gale lane races straight at you — step aside • frost feathers fall on your footsteps — keep moving.<br>And the eye of the storm: a ring of wind around it. The only safe place is right beside it.');
    const c = await UI.menu(nm, line, [L('ขอยาไว้ใช้ (ร้าน)', 'Spare supplies (shop)'), L('ลาก่อน', 'Farewell')]);
    if (c === 0) UI.openShop('Huginn', ['white_potion', 'blue_potion', 'green_herb', 'yellow_potion'].filter(id => ITEMS[id]));
  };
  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => {
    if (typeof UnitCard !== 'undefined' && UnitCard.NPC_ROLE) UnitCard.NPC_ROLE.huginn = L('กาของ Mimir • ร้านยา • เนื้อเรื่อง', "Mimir's raven • Supplies • Story");
  });
})();
