'use strict';
// ============================================================
//  บทที่ 6 — รากที่ถูกแทะ (Lv 33–60)
//  ต่อจาก Hel's Hollow ลงไปข้างล่าง: Archive Depths (Lv 33–45) → Gnawed Roots (Lv 45–60, MVP Garmr)
//  ไฟล์นี้เพิ่มเนื้อหาทั้งหมดของบท (มอน ไอเทม ชิป แผนที่ เควสต์ ของในร้าน สกิลบอส) ต่อท้ายข้อมูลเดิม
//  โหลดหลัง js/quest.js — ใช้ MOBS / ITEMS / MOB_CHIP / SHOPS (data.js), MAP_DEFS (maps.js), QUESTS (quest.js)
//
//  มอนใหม่ไม่มีภาพของตัวเอง: เป็น "สีต่าง" ของมอนเดิมแบบ RO (Poring → Drops → Poporing)
//  base = มอนต้นแบบ, hue = หมุนสี (องศา), sat/bri = ความสด/ความสว่าง, tint = เคลือบสี ['#สี', ความเข้ม]
//  ภาพย้อมสีสร้างใน Art (js/art.js) ครั้งแรกที่มีคนขอ — ถ้าวันหลังมีภาพจริง ใส่ assets/mobsprite_<id>.webp ได้เลย
// ============================================================
(() => {
  // ---------- ตัวช่วย: มอนสีต่าง ----------
  // คัดลอกรูปร่างของต้นแบบ (ใช้ตอนวาดด้วยโค้ดระหว่างที่ภาพยังโหลดไม่เสร็จ) แล้วย้อมสีโค้ดตามสูตรเดียวกับภาพ
  const VISUAL = ['sprite', 'look', 'variant', 'color', 'color2', 'size', 'scale', 'wings', 'tusk', 'glow', 'skin', 'face', 'outfit', 'hair',
    'viking', 'joint', 'bones', 'weapon', 'hood', 'halfskull', 'fox', 'jiangshi'];
  const variant = (base, def) => {
    const b = MOBS[base], v = { base }, spec = { hue: def.hue, sat: def.sat, bri: def.bri, tint: def.tint };
    for (const k of VISUAL) if (b[k] !== undefined) v[k] = b[k];
    const dye = c => Art.tintHex(c, spec);
    for (const k of ['color', 'color2', 'glow', 'skin', 'face', 'outfit', 'hair', 'joint', 'hood']) if (typeof v[k] === 'string') v[k] = dye(v[k]);
    if (v.look) { v.look = Object.assign({}, v.look); for (const k in v.look) v.look[k] = dye(v.look[k]); }
    return Object.assign(v, def);
  };

  // ---------- ไอเทมใหม่ ----------
  Object.assign(ITEMS, {
    // ของดรอป (ขายได้)
    rusty_sap:      { name: 'Rust Sap',       type: 'etc', price: 170, icon: { s: 'blob', c: '#b0602a' }, desc: 'น้ำเลี้ยงที่ขึ้นสนิม ข้นและอุ่นผิดปกติ' },
    archive_seal:   { name: 'Archive Seal',   type: 'etc', price: 220, icon: { s: 'ring', c: '#5ac8d0' }, desc: 'ตราประทับประจำชั้นวางในคลังประกาย' },
    rust_fuse:      { name: 'Rust Fuse',      type: 'etc', price: 240, icon: { s: 'blob', c: '#d07a30' }, desc: 'ชนวนทุ่นกั้นสนิม — สนิมกินจนจุดเองได้' },
    rusted_spark:   { name: 'Rusted Spark',   type: 'etc', price: 280, icon: { s: 'gem', c: '#c07a3a' }, desc: 'ประกายที่สนิมเกาะ ยังอุ่นอยู่ในมือ' },
    corroded_core:  { name: 'Corroded Core',  type: 'etc', price: 320, icon: { s: 'gem', c: '#8a5a3a' }, desc: 'แกนร่างเศษเหล็กที่ผุจนเป็นรู' },
    root_fiber:     { name: 'Root Fiber',     type: 'etc', price: 340, icon: { s: 'feather', c: '#8a6a40' }, desc: 'เส้นใยรากของ Yggdrasil ที่ถูกแทะขาด' },
    gnawed_bark:    { name: 'Gnawed Bark',    type: 'etc', price: 380, icon: { s: 'bone', c: '#7a6a8a' }, desc: 'เปลือกรากที่มีรอยฟันนับร้อย' },
    rust_plate:     { name: 'Rusted Plate',   type: 'etc', price: 420, icon: { s: 'cloth', c: '#9a4a1a' }, desc: 'แผ่นเกราะหนาที่สนิมกินเป็นลายราก' },
    gnawer_tusk:    { name: 'Gnawer Tusk',    type: 'etc', price: 500, icon: { s: 'claw', c: '#d0b090' }, desc: 'งาที่สึกเพราะแทะรากมาทั้งชีวิต' },
    // อุปกรณ์ใหม่ (ร้านค้า Lv 40–45)
    root_cloak:     { name: 'Rootweave Cloak', type: 'armor', slot: 'garment', def: 3, mdef: 3, price: 22000, slots: 1, lv: 40, jobs: 'all', icon: { s: 'cloth', c: '#7a5a34' },
      b: { flee: 4 }, desc: 'ผ้าคลุมทอจากใยราก DEF 3 MDEF 3 FLEE +4' },
    rootbark_plate: { name: 'Rootbark Plating', type: 'armor', slot: 'armor', def: 9, mdef: 4, price: 38000, slots: 1, lv: 42, jobs: J.light, icon: { s: 'armor', c: '#8a6a44' },
      b: { hp: 150 }, desc: 'เกราะเปลือกรากชุบน้ำเลี้ยง DEF 9 MDEF 4 MaxHP +150' },
    yggdrasil_branch: { name: 'Yggdrasil Branch', type: 'weapon', slot: 'weapon', wtype: 'rod', atk: 70, matk: 115, price: 52000, slots: 1, lv: 45, jobs: ['runecaster', 'volva'],
      icon: { s: 'rod', c: '#60e0a0' }, b: { int: 3, sp: 40 }, desc: 'กิ่งของต้นไม้โลกที่ยังมีน้ำเลี้ยง MATK +115 INT +3 MaxSP +40' },
    // ของ MVP
    garmr_collar:   { name: 'Garmr Collar',   type: 'armor', slot: 'acc', price: 70000, slots: 0, jobs: 'all', icon: { s: 'ring', c: '#d03030' },
      b: { str: 2, agi: 2, vit: 2, hp: 200 }, desc: '[MVP] ปลอกคอสุนัขเฝ้าประตูราก STR +2 AGI +2 VIT +2 MaxHP +200' },
    // ชิปประจำมอน (ได้เมื่อล่าครบ CHIP_KILLS ตัว / MVP ตัวแรก)
    rustsap_card:   { name: 'Rust Sap Chip',        type: 'card', slot: 'armor',   price: 20, b: { hp: 300, luk: 1 }, icon: { s: 'card', c: '#b0602a' }, desc: 'ชิปเสริม — ใส่ชุดเกราะ: MaxHP +300, LUK +1' },
    awarden_card:   { name: 'Archive Warden Chip',  type: 'card', slot: 'weapon',  price: 20, b: { atk: 15, hit: 5 }, icon: { s: 'card', c: '#5ac8d0' }, desc: 'ชิปเสริม — ใส่อาวุธ: ATK +15, HIT +5' },
    rustmine_card:  { name: 'Rust Mine Chip',       type: 'card', slot: 'head',    price: 20, b: { vit: 2, def: 1 }, icon: { s: 'card', c: '#d07a30' }, desc: 'ชิปเสริม — ใส่หมวก: VIT +2, DEF +1' },
    amaiden_card:   { name: 'Archive Maiden Chip',  type: 'card', slot: 'garment', price: 20, b: { int: 2, mdef: 3 }, icon: { s: 'card', c: '#9a60d0' }, desc: 'ชิปเสริม — ใส่ผ้าคลุม: INT +2, MDEF +3' },
    rusthusk_card:  { name: 'Rust Husk Chip',       type: 'card', slot: 'shield',  price: 20, b: { hp: 300, def: 1 }, icon: { s: 'card', c: '#c06a20' }, desc: 'ชิปเสริม — ใส่โล่: MaxHP +300, DEF +1' },
    rcrawler_card:  { name: 'Root Crawler Chip',    type: 'card', slot: 'shoes',   price: 20, b: { agi: 2, flee: 3 }, icon: { s: 'card', c: '#8a6a40' }, desc: 'ชิปเสริม — ใส่รองเท้า: AGI +2, FLEE +3' },
    gsentry_card:   { name: 'Gnawed Sentry Chip',   type: 'card', slot: 'armor',   price: 20, b: { sp: 120, int: 1 }, icon: { s: 'card', c: '#7a6a8a' }, desc: 'ชิปเสริม — ใส่ชุดเกราะ: MaxSP +120, INT +1' },
    gbrute_card:    { name: 'Gnawed Brute Chip',    type: 'card', slot: 'shield',  price: 20, b: { vit: 2, def: 2 }, icon: { s: 'card', c: '#9a4a1a' }, desc: 'ชิปเสริม — ใส่โล่: VIT +2, DEF +2' },
    gnawer_card:    { name: 'Root Gnawer Chip',     type: 'card', slot: 'acc',     price: 20, b: { str: 2, atk: 8 }, icon: { s: 'card', c: '#a03020' }, desc: 'ชิปเสริม — ใส่เครื่องประดับ: STR +2, ATK +8' },
    garmr_card:     { name: 'Garmr Chip',           type: 'card', slot: 'weapon',  price: 20, b: { str: 2, atk: 20, crit: 5 }, icon: { s: 'card', c: '#d03030' }, desc: '[MVP] ใส่อาวุธ: STR +2, ATK +20, CRIT +5' },
  });

  // ---------- มอนสเตอร์ใหม่ (Lv 33–60) ----------
  // เส้น EXP: ~85–100 ตัวต่อเลเวลเมื่อล่ามอนที่เลเวลเท่าตัว (baseExpNeed ใน data.js) • ตีก่อน 3 จาก 9 ชนิด
  Object.assign(MOBS, {
    // --- Archive Depths (Lv 33–45): คลังประกายชั้นล่างของ Hel ที่สนิมเริ่มลามขึ้นมา ---
    rust_sap: variant('pudding', { name: 'Rust Sap Unit', lv: 33, hp: 1600, atk: [100, 124], def: 15, mdef: 30, vit: 30, flee: 60, hit: 84, exp: 880, jexp: 620, speed: 1.4,
      aggro: false, element: 'poison', race: 'plant', hue: 45, sat: 0.85, bri: 0.85, tint: ['#7a3a12', 0.25],
      lore: 'ถุงน้ำเลี้ยงเดินได้ที่ไหลลงมาผิดทาง น้ำเลี้ยงในตัวกลายเป็นสีสนิม',
      drops: [['rusty_sap', 0.55], ['jelly_drop', 0.3], ['yellow_potion', 0.05]] }),
    archive_warden: variant('bone_warden', { name: 'Archive Warden', lv: 36, hp: 1800, atk: [118, 146], def: 28, mdef: 15, vit: 34, flee: 66, hit: 92, exp: 1140, jexp: 800, speed: 1.6,
      aggro: true, stun: [8, 1.5], element: 'undead', race: 'undead', hue: 160, tint: ['#3aa0b0', 0.35],
      lore: 'โครงร่างเฝ้าชั้นวางล่างสุด ใครเดินผ่านโดยไม่มีตราประทับถือว่าเป็นโจร',
      drops: [['archive_seal', 0.5], ['old_bone', 0.3], ['boots', 0.008]] }),
    rust_mine: variant('capshroom', { name: 'Rust Mine Unit', lv: 38, hp: 1950, atk: [124, 152], def: 25, mdef: 30, vit: 38, flee: 58, hit: 94, exp: 1260, jexp: 880, speed: 1.2,
      aggro: false, stun: [10, 1.5], element: 'fire', race: 'plant', hue: 25, sat: 0.9, bri: 0.8, tint: ['#6a3010', 0.2],
      lore: 'ทุ่นกั้นสนิมชุดสุดท้าย วางไว้ลึกที่สุด และเป็นชุดแรกที่สนิมกินจนจุดชนวนเอง',
      drops: [['rust_fuse', 0.5], ['cap_spore', 0.3], ['white_potion', 0.03]] }),
    archive_maiden: variant('hel_maiden', { name: 'Archive Maiden', lv: 41, hp: 2100, atk: [130, 162], def: 20, mdef: 45, vit: 36, flee: 72, hit: 100, exp: 1520, jexp: 1060, speed: 1.5,
      aggro: false, element: 'shadow', race: 'undead', hue: 80,
      lore: 'ผู้ดูแลชั้นวางล่างสุด เก็บประกายที่ขึ้นสนิมไว้ในตะเกียง ไม่ยอมทิ้งแม้แต่ดวงเดียว',
      drops: [['rusted_spark', 0.5], ['hel_lantern', 0.2], ['silk_robe', 0.01], ['yggdrasil_branch', 0.002]] }),
    rust_draugr: variant('draugr', { name: 'Rust Husk', lv: 44, hp: 2500, atk: [150, 186], def: 25, mdef: 25, vit: 44, flee: 64, hit: 108, exp: 1860, jexp: 1300, speed: 1.1,
      aggro: true, element: 'undead', race: 'undead', sat: 1.25, bri: 0.95, tint: ['#c05a10', 0.4],
      lore: 'Draugr ที่ถูกเก็บเกี่ยวผิดชั้น ร่างเศษเหล็กของมันถูกสนิมกินจนเหลือแต่ความโกรธ',
      drops: [['corroded_core', 0.45], ['grave_dust', 0.3], ['chain_mail', 0.008]] }),

    // --- Gnawed Roots (Lv 45–60): รากของ Yggdrasil ที่ถูกแทะจากข้างล่าง ---
    root_crawler: variant('leafworm', { name: 'Root Crawler Unit', lv: 46, hp: 2600, atk: [154, 190], def: 25, mdef: 35, vit: 46, flee: 70, hit: 112, exp: 2010, jexp: 1410, speed: 1.3,
      aggro: false, element: 'poison', race: 'insect', hue: -50, sat: 0.6, tint: ['#5a3a1a', 0.35],
      lore: 'หน่วยตรวจรากที่คลานลงมาหารอยร้าวจนเจอต้นตอ แล้วไม่ได้กลับขึ้นไปอีก',
      drops: [['root_fiber', 0.5], ['leaf_silk', 0.3], ['white_potion', 0.04]] }),
    gnawed_stump: variant('stumpling', { name: 'Gnawed Sentry', lv: 49, hp: 3000, atk: [164, 200], def: 35, mdef: 40, vit: 50, flee: 56, hit: 116, exp: 2350, jexp: 1650, speed: 1.0,
      aggro: false, element: 'earth', race: 'plant', sat: 0.35, bri: 0.85, tint: ['#5a3a6a', 0.3],
      lore: 'ยามตอไม้ที่ยืนเฝ้ารากมานานจนถูกแทะไปครึ่งตัว และยังไม่ยอมถอย',
      drops: [['gnawed_bark', 0.45], ['living_bark', 0.3], ['blue_potion', 0.02]] }),
    gnawed_brute: variant('mossback', { name: 'Gnawed Brute', lv: 53, hp: 3500, atk: [182, 226], def: 30, mdef: 25, vit: 55, flee: 66, hit: 126, exp: 2840, jexp: 1990, speed: 1.3,
      aggro: false, stun: [10, 2], element: 'earth', race: 'brute', hue: 150, sat: 0.5, bri: 0.8, tint: ['#6a2a10', 0.3],
      lore: 'หมีเหล็กที่แบกรากหักไปวางคืนที่เดิมทุกวัน ถูกแทะจนเกราะซีดเป็นสีเถ้า',
      drops: [['rust_plate', 0.45], ['moss_hide', 0.25], ['rootbark_plate', 0.004]] }),
    root_gnawer: variant('tuskboar', { name: 'Root Gnawer', lv: 57, hp: 3800, atk: [200, 250], def: 28, mdef: 30, vit: 58, flee: 80, hit: 136, exp: 3460, jexp: 2420, speed: 1.9,
      aggro: true, stun: [8, 1.5], element: 'poison', race: 'brute', sat: 1.3, tint: ['#8a1a10', 0.35],
      lore: 'เคยเป็นหน่วยไถดิน ตอนนี้ไถเข้าไปในรากแล้วแทะทุกอย่างที่ขวางทาง',
      drops: [['gnawer_tusk', 0.45], ['iron_tusk', 0.3], ['root_cloak', 0.006]] }),

    // --- MVP: Garmr (Lv 60) สุนัขเฝ้าประตูรากของ Hel ---
    garmr: variant('fenrir_pup', { name: 'Garmr', lv: 60, hp: 46000, atk: [255, 330], def: 38, mdef: 45, vit: 60, flee: 118, hit: 170, exp: 40000, jexp: 28000, speed: 2.4,
      aggro: true, stun: [12, 2], element: 'shadow', race: 'brute', scale: 2.0, boss: true, respawn: 720000, bossSkill: 'rootquake',
      hue: 180, bri: 0.75, tint: ['#6a0a0a', 0.45],
      lore: 'Hel ล่ามมันไว้ที่ประตูรากเพื่อกันสนิม มันแทะสนิมมาสามสิบปี จนสนิมแทะมันกลับ',
      drops: [['garmr_collar', 0.3], ['white_potion', 0.8], ['blue_potion', 0.6], ['yggdrasil_shard', 0.2]] }),
  });
  for (const id in MOBS) MOBS[id].id = id;
  for (const id in ITEMS) ITEMS[id].id = id;
  Object.assign(MOB_CHIP, {
    rust_sap: 'rustsap_card', archive_warden: 'awarden_card', rust_mine: 'rustmine_card', archive_maiden: 'amaiden_card', rust_draugr: 'rusthusk_card',
    root_crawler: 'rcrawler_card', gnawed_stump: 'gsentry_card', gnawed_brute: 'gbrute_card', root_gnawer: 'gnawer_card', garmr: 'garmr_card',
  });

  // ---------- ร้านค้า: ของ Lv 40–45 วางต่อจากของระดับใกล้กัน ----------
  const shopAdd = (list, after, id) => { if (list.includes(id)) return; const i = list.indexOf(after); list.splice(i < 0 ? list.length : i + 1, 0, id); };
  shopAdd(SHOPS.weapon, 'seer_staff', 'yggdrasil_branch');
  shopAdd(SHOPS.armor, 'plate_armor', 'rootbark_plate');
  shopAdd(SHOPS.armor, 'muffler', 'root_cloak');

  // ---------- แผนที่ใหม่ ----------
  // ประตูจาก Hel's Hollow ลงไป: ใช้ด้านที่ยังว่าง (ปกติ S เพราะ N คือ Wolfwood)
  const freeSide = (links, pref) => pref.find(s => !links[s]);
  MAP_DEFS.archive = {
    name: 'Archive Depths', thai: 'คลังประกายชั้นล่าง ใต้โพรงแห่งเฮล', w: 54, h: 54, kind: 'cave', seed: 606, dark: true,
    links: {}, level: '33-45',
    spawns: [['rust_sap', 10], ['archive_warden', 7], ['rust_mine', 8], ['archive_maiden', 7], ['rust_draugr', 6]],
  };
  MAP_DEFS.roots = {
    name: 'Gnawed Roots', thai: 'รากที่ถูกแทะ ใต้คลังของเฮล', w: 56, h: 56, kind: 'cave', seed: 707, dark: true,
    links: {}, level: '45-60 (MVP: Garmr)',
    spawns: [['root_crawler', 10], ['gnawed_stump', 8], ['gnawed_brute', 7], ['root_gnawer', 6]], mvp: 'garmr',
  };
  const link = (a, b, pref) => {
    const s = freeSide(MAP_DEFS[a].links, pref.filter(x => !MAP_DEFS[b].links[OPP_SIDE[x]]));
    if (!s) { console.warn(`content_ch6: ไม่มีด้านว่างให้ต่อ ${a} → ${b}`); return; }
    MAP_DEFS[a].links[s] = b; MAP_DEFS[b].links[OPP_SIDE[s]] = a;
  };
  link('helcave', 'archive', ['S', 'E', 'W']);
  link('archive', 'roots', ['E', 'S', 'W']);
  // บรรยากาศ (อนุภาค + สีทับจอ) และภาพแบนเนอร์/แผนที่โลก ย้อมจากภาพ Hel's Hollow
  ATMOS.archive = { kind: 'dust', n: 30, grade: 'rgba(150,120,40,0.10)' };
  ATMOS.roots = { kind: 'dust', n: 40, grade: 'rgba(130,45,20,0.14)' };
  Art.alias('map_archive', 'map_helcave', { hue: -135, sat: 0.9, flip: true, w: 960 });
  Art.alias('map_roots', 'map_helcave', { hue: 150, sat: 0.8, bri: 0.85, tint: ['#5a1a08', 0.3], w: 960 });
  // ฉากเปิดตัว MVP: ยังไม่มีภาพของ Garmr ใช้ฉากรากโทนแดงเข้มแทน (มีภาพจริงเมื่อไหร่ ใส่ assets/mvp_garmr.webp ได้เลย)
  Art.alias('mvp_garmr', 'map_helcave', { hue: 150, sat: 0.9, bri: 0.55, tint: ['#8a0a0a', 0.35], w: 1280 });

  // ---------- สกิลบอส Garmr: รากทะลวง ----------
  // วงแดงใต้เท้าผู้เล่น 1.2 วินาที แล้วรากพุ่งขึ้น (ดาเมจกายภาพ + มึน) • HP ต่ำกว่าครึ่ง บางครั้งแทะสนิมซ่อมร่างตัวเอง
  BOSS_SKILLS.rootquake = m => {
    const p = G.player;
    if (m.hp < m.maxHp * 0.5 && U.chance(0.35)) {
      const amt = Math.floor(m.maxHp * 0.05);
      m.hp = Math.min(m.maxHp, m.hp + amt);
      addFloater(m.x, m.y - 2.4, `+${amt}`, '#ff9a70', true);
      addFx({ type: 'ring', x: m.x, y: m.y, dur: 0.9, r: 2.5, color: '220,90,40', waves: 2 });
      UI.msg(`${m.def.name} แทะสนิมจากราก ซ่อมร่างตัวเอง!`, 'mvp');
      return;
    }
    if (p.dead) return;
    const x = p.x, y = p.y, R = 2;
    addFx({ type: 'warnring', x, y, dur: 1.2, r: R });
    UI.msg(`${m.def.name} ขุดรากใต้เท้าเจ้า! ออกจากวงแดง!`, 'mvp');
    later(1.2, () => {
      if (m.dead) return;
      addFx({ type: 'ring', x, y, dur: 0.6, r: R + 0.4, color: '210,110,50', waves: 3 });
      addFx({ type: 'shower', x, y, dur: 0.7, r: R });
      if (p.dead || U.dist(x, y, p.x, p.y) > R) return;
      const d = p.d, dmg = Math.max(1, Math.round(U.randi(m.def.atk[0], m.def.atk[1]) * 1.4 * (1 - d.def / 100) - d.softDef));
      damagePlayer(dmg, '#e0803a');
      if (!d.unshaken) stunPlayer(1.5 * (1 - d.stunRes / 100));
    });
  };

  // ---------- เควสต์บทที่ 6 (ต่อท้ายสายเดิม) ----------
  // say = บทพูดเนื้อเรื่องที่ NPC พูดตอนส่งเควสต์ talk (ก่อนเมนูปกติ)
  QUESTS.push(
    { id: 'ch6_listen', title: 'เสียงแทะใต้โพรง', desc: 'พื้น Hel\'s Hollow สั่นทุกคืน — Bifrost Keeper บอกว่าได้ยินอะไรบางอย่างจากราก ไปฟังเขา',
      obj: { type: 'talk', npc: 'bifrost' }, reward: { items: [['white_potion', 3]], bexp: 3000, jexp: 2000 },
      say: 'ข้าจดจำเสียงนี้ได้ 9,412 ครั้งในเจ็ดคืน<br>มันไม่ใช่รากที่ <b>ยืด</b> ลงไป — มันคือรากที่ถูก <b>แทะ</b><br>ทางลงอยู่ใต้ Hel\'s Hollow ทางทิศใต้' },
    { id: 'ch6_sap', title: 'น้ำเลี้ยงสีสนิม', desc: 'ลงใต้ Hel\'s Hollow สู่ Archive Depths แล้วทำลาย Rust Sap Unit 15 ตัว — น้ำเลี้ยงในตัวพวกมันกลายเป็นสีสนิม',
      obj: { type: 'kill', mob: 'rust_sap', n: 15 }, reward: { items: [['white_potion', 3]], bexp: 9000, jexp: 6000 } },
    { id: 'ch6_spark', title: 'ประกายที่ขึ้นสนิม', desc: 'เก็บ Rusted Spark 6 ชิ้นจาก Archive Maiden ผู้ดูแลชั้นวางล่างสุด (ส่งแล้วไอเทมจะถูกใช้ไป)',
      obj: { type: 'collect', item: 'rusted_spark', n: 6, mob: 'archive_maiden' }, reward: { zeny: 8000, bexp: 14000, jexp: 9000 } },
    { id: 'ch6_eir', title: 'ผลตรวจของ Eir', desc: 'นำประกายที่ขึ้นสนิมกลับไปให้ Eir Repair Unit ในเมืองตรวจ — เธอกลัวว่าสนิมจะลามถึงผิวดิน',
      obj: { type: 'talk', npc: 'nurse' }, reward: { items: [['white_potion', 5], ['blue_potion', 2]], bexp: 6000, jexp: 4000 },
      say: 'สนิมนี้ไม่ได้เกาะแค่ผิวโลหะค่ะ... มันกินเข้าไปถึงประกายข้างใน<br>ใบไม้ของต้นไม้ไม่ยอมแตะประกายแบบนี้เลยนะคะ<br>รอยร้าวเล็กน้อย... ไม่สิ ไม่เล็กเลย ระวังตัวด้วยนะคะ' },
    { id: 'ch6_lv45', title: 'ร่างที่ทนสนิม', desc: 'ขึ้นถึง Base Lv 45 — สนิมข้างล่างแรงกว่าที่เคยเจอ ร้านเกราะมีของที่ทอจากใยรากแล้ว',
      obj: { type: 'baseLv', n: 45 }, reward: { items: [['root_cloak', 1]], zeny: 5000 } },
    { id: 'ch6_roots', title: 'รากที่ถูกแทะ', desc: 'ผ่าน Archive Depths ไปทางตะวันออกสู่ Gnawed Roots แล้วทำลาย Root Crawler Unit 20 ตัว — หน่วยตรวจรากที่ลงไปแล้วไม่ได้ขึ้นมา',
      obj: { type: 'kill', mob: 'root_crawler', n: 20 }, reward: { items: [['white_potion', 5]], bexp: 30000, jexp: 20000 } },
    { id: 'ch6_garmr', title: 'ล่า MVP: Garmr', desc: 'สุนัขเฝ้าประตูรากของ Hel แทะสนิมมานานจนกลายเป็นสนิมเสียเอง ปราบ Garmr ที่ Gnawed Roots — ระวังรากที่พุ่งจากใต้เท้า!',
      obj: { type: 'kill', mob: 'garmr', n: 1 }, reward: { items: [['yggdrasil_shard', 1], ['white_potion', 5]], zeny: 20000 } },
    { id: 'ch6_mimir', title: 'ชื่อของสนิม', desc: 'กลับไปรายงาน Mimir AI — สิ่งที่แทะรากอยู่ข้างล่างไม่ได้ไม่มีชื่อ',
      obj: { type: 'talk', npc: 'jobmaster' }, reward: { items: [['white_potion', 5], ['blue_potion', 3]], bexp: 40000, jexp: 25000 },
      say: 'ข้าคือ Mimir AI... ข้อมูลยืนยันแล้ว 3 ข้อ<br>1) สนิมไม่เคยล้มลง 2) Fenrir กลืนไปแค่ส่วนหัว<br>3) ส่วนที่เหลือมีชื่อ — <b>Nidhogg</b><br>...และตอนนี้มันรู้แล้วว่าใบใหม่ลงไปหามัน' },
  );

  // บทพูดตอนส่งเควสต์ talk: Quest.onTalk ทำงานก่อนสคริปต์ NPC → จำไว้ แล้วให้ NPC พูดก่อนเมนูปกติ
  let pendingSay = null;
  const onTalk = Quest.onTalk;
  Quest.onTalk = function (npcId) {
    const q = this.current();
    onTalk.call(this, npcId);
    if (q && q.say && this.current() !== q) pendingSay = { npc: npcId, text: q.say };
  };
  for (const npcId of new Set(QUESTS.filter(q => q.say).map(q => q.obj.npc))) {
    const run = NPC.scripts[npcId];
    if (!run) continue;
    NPC.scripts[npcId] = async n => {
      if (pendingSay && pendingSay.npc === n.id) { const t = pendingSay.text; pendingSay = null; await UI.say(`[${n.name}]`, t); }
      return run(n);
    };
  }

  // นำทางเควสต์เลเวล (baseLv/jobLv) ตั้งแต่ Lv 33: ไปล่ามอนเลเวลใกล้ตัวที่สุดในแผนที่ใหม่ (สายเดิมแนะนำแค่ถึง Hel's Hollow)
  const navTarget = Quest.navTarget;
  Quest.navTarget = function (q = this.current()) {
    const o = q && q.obj, lv = G.player.baseLv;
    if (o && (o.type === 'baseLv' || o.type === 'jobLv') && lv >= 33) {
      const t = Nav.mobs().filter(t => !t.mvp && t.lv <= lv + 3).sort((a, b) => b.lv - a.lv)[0];
      if (t) return { kind: 'mob', map: t.map, mobId: t.mobId, name: t.name };
    }
    return navTarget.call(this, q);
  };
})();
