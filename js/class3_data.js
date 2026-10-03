'use strict';
// ============================================================
//  Class 3 — ข้อมูล (docs/CLASS3_DESIGN.md: ทาง A+ = 1 สายต่อ Class 2 + Oath 2 แบบ)
//  • tier: 3, parent = Class 2 → ใช้สกิล/อาวุธของทั้งสาย (Class 1 → 2 → 3) ได้ต่อ (jobLine เดินตาม parent)
//  • bonus = ค่าของ Class 2 + 5 ทุกช่อง (แทนที่ ไม่ซ้อน — recalc ใช้ j.bonus ของ Class ปัจจุบันตัวเดียว)
//  • Job max 26 → 25 แต้ม สำหรับ 6 สกิล (30 ช่อง) = ต้องเลือกว่าจะไม่เต็มตัวไหน (Custom Play)
//  • Oath = รูน 2 แบบของสกิลติดตัว (Rune Paths เดิม — ลงทะเบียนใน js/class3.js)
//  • Pilot (2026-10-03): Yggdrasil Runelord (← Galdr Sage) + Fenrir Packlord (← Ulfhednar Warlord)
//  ตัวเลขสมดุลทั้งหมด: กรอบ §4 (เวลาฆ่า −15~25% เทียบ Class 2 • P ถาวร ≤ +10% • รูน/Oath ±12% • CC บอส/ผู้เล่น ≤ 1 วิ)
//  ไฟล์นี้โหลดต่อจาก data.js (ไม่แตะ id เดิม) — กลไก/ภาพ/บอท/Mimir อยู่ใน js/class3.js
// ============================================================

// Class 2 → Class 3 (ตัวละ 1 สาย) • เพิ่มทีละคู่ตามเฟสในเอกสารออกแบบ
const THIRD_JOBS = { galdr: 'runelord', warlord: 'packlord' };
// ปลด: Base Lv 70 + Job Class 2 เต็ม (26) + จบภาค 1 (เควสต์ ch7_home) + เควสต์ทดสอบ (ดวลเงาแม่พิมพ์)
const THIRD_JOB_REQ = { base: 70, job: 26, quest: 'ch7_home' };

Object.assign(JOBS, {
  runelord: { glow: '#7fe8ff', name: 'Yggdrasil Runelord', thai: L('จอมรูนแห่งอิกดราซิล', 'Runelord of Yggdrasil'), parent: 'galdr', tier: 3,
    bonus: { atkPct: 15, matkPct: 15, hit: 15, hpPct: 15 }, hp: 1.0, sp: 2.5, jobMax: 26, aspd: 1450,
    outfit: '#14285a', outfit2: '#8a6a44', pants: '#0e1838', robe: true, jobHat: 'runehood',
    stats: 'INT / DEX', role: L('จอมเวทจัดสนาม วงรูนทวีคูณคาถา', 'Field Mage — Rune Circles Multiply Spells'),
    desc: L('ผู้เดินตาม "ความคิดสุดท้าย" ของจอมรูนบนกำแพง วางวงรูนบนพื้นก่อน แล้วร่ายให้คาถาตกในวง — ทุกลูกที่ตกในวงจะระเบิดซ้ำ',
      'One who followed the last thought of the rune-master on the wall. Draws rune circles on the ground first, then makes every spell land inside — and echo.'),
    skills: ['root_script', 'rune_circle', 'ragnarok_verse', 'odins_spear_rune', 'sap_ward', 'blink_glyph'] },
  packlord: { glow: '#ff6a2a', name: 'Fenrir Packlord', thai: L('จ้าวฝูงเฟนเรียร์', 'Lord of the Fenrir Pack'), parent: 'warlord', tier: 3,
    bonus: { atkPct: 10, matkPct: 15, hit: 15, hpPct: 15 }, hp: 1.9, sp: 0.85, jobMax: 26, aspd: 1250,
    outfit: '#4a2a1a', outfit2: '#1a1210', pants: '#1e1610', cape: '#7a2a12', jobHat: 'wolfpelt',
    stats: 'STR / AGI', role: L('นักรบกลางวงล้อม เรียกเงาหมาป่า', 'Brawler in the Ring — Summons Shadow Wolves'),
    desc: L('ผู้ตอบเสียงหอนของฝูง ยิ่งศัตรูล้อมยิ่งแรง หอนครั้งเดียวเงาหมาป่าเพลิงก็วิ่งออกมากัดรอบตัว แล้วชี้เป้าให้ทั้งฝูงรุม',
      'One who answered the howl of the pack. The more foes surround him the harder he hits; one howl and shadow fire-wolves pour out to bite — then he marks the prey for the whole pack.'),
    skills: ['pack_blood', 'howl_of_the_pack', 'jaws_of_fenrir', 'wolfstorm_cleave', 'alphas_mark', 'unchained'] },
});

// ------------------------------------------------------------
//  สกิล Class 3 — ฟิลด์มาตรฐานตาม data.js • ฟิลด์ c3* อ่านโดย js/class3.js (กลไกพิเศษ)
//  c3res: Resonance • c3circle: วงรูน • c3cast: ร่ายแบบพิเศษ • c3inCircle: ตัวคูณเมื่อเป้าอยู่ในวง • c3ward: โล่ดูดซับ
//  c3pack: Pack Blood • c3wolves: เงาหมาป่า • c3leech: ดูดเลือดของสกิล • c3mark: ประกาศเป้า • c3unchained: ไม่ล้ม
// ------------------------------------------------------------
Object.assign(SKILLS, {
  // ===== Yggdrasil Runelord =====
  root_script: { name: 'Root Script', max: 5, type: 'passive', icon: '#7fd8ff', glyph: 'ᛉ',
    passive: lv => ({ matkPct: 2 * lv, castPct: 2 * lv }),
    c3res: lv => 0.02 * lv,
    desc: L('อักษรราก MATK +2%×Lv และร่ายเร็วขึ้น 2%×Lv • ร่ายคาถาต่างธาตุจากลูกก่อน = Resonance คาถาลูกนั้นแรงขึ้น +2%×Lv',
      'Root script. MATK +2%×Lv and cast speed +2%×Lv • casting a different element than your last spell triggers Resonance: that spell deals +2%×Lv.') },
  rune_circle: { name: 'Rune Circle', max: 5, type: 'active', target: 'enemy', range: 9, icon: '#6ff0ff', glyph: '❂', req: { root_script: 1 },
    sp: lv => 18 + 2 * lv, cast: () => 450, delay: 600, cd: 3, special: 'c3_circle',
    c3circle: { r: lv => 2 + 0.2 * lv, dur: () => 10, echo: lv => 0.1 + 0.02 * lv, max: 2 },
    desc: L('วางวงรูนใต้เป้า รัศมี 2.2~3 ช่อง 10 วินาที (มีได้ 2 วง) • คาถาที่ตกใส่ศัตรูในวงจะระเบิดซ้ำ 12~20% ของดาเมจ',
      'Draws a rune circle under the target, 2.2~3-cell radius for 10s (up to 2) • spells that hit enemies inside echo for 12~20% of their damage.') },
  ragnarok_verse: { name: 'Ragnarok Verse', max: 5, type: 'active', target: 'enemy', range: 9, icon: '#ffa860', glyph: '☄', req: { rune_circle: 2 },
    sp: lv => 40 + 6 * lv, cast: () => 3000, delay: 1200, cd: 12, fx: 'firebolt', c3cast: 'verse',
    dmg: { type: 'magic', element: 'fire', mult: lv => 0.95 + 0.17 * lv, area: 4, at: 'target', hits: 3 },
    desc: L('ร่ายบทแรกนาร็อก 3 วินาที ไฟ → น้ำแข็ง → สายฟ้า ตก 3 ระลอก รัศมี 4 ช่อง ระลอกละ 112~180% (ธาตุต่างกันทุกระลอก = Resonance ได้ครบ)',
      'A 3-second verse of Ragnarök: fire → ice → lightning fall in 3 waves over a 4-cell radius, 112~180% each (a different element every wave).') },
  odins_spear_rune: { name: "Odin's Spear Rune", max: 5, type: 'active', target: 'enemy', range: 10, icon: '#ffe08a', glyph: 'ᛏ', req: { root_script: 2 },
    sp: lv => 26 + 4 * lv, cast: () => 1500, delay: 900, cd: 8, fx: 'holy', vfx: 'valhalla_spear', c3inCircle: 1.2,
    dmg: { type: 'magic', element: 'neutral', mult: lv => 2.4 + 0.5 * lv, sureHit: true },
    desc: L('หอกรูนของโอดิน 290~490% ไม่มีวันพลาด • เป้าที่ยืนในวงรูนโดน ×1.2',
      "Odin's rune spear for 290~490%, never misses • ×1.2 against a target standing in your rune circle.") },
  sap_ward: { name: 'Sap Ward', max: 5, type: 'active', target: 'self', icon: '#8af0c0', glyph: '❖', req: { root_script: 3 },
    sp: lv => 24 + 3 * lv, delay: 800, cd: 18, selfFx: 'buff', vfx: 'rune_barrier',
    buff: { dur: () => 8, stats: lv => ({ mdef: 2 * lv }) },
    c3ward: { shield: lv => 1.2 + 0.3 * lv, boom: lv => 1.0 + 0.2 * lv, r: 2.5 },
    desc: L('โล่น้ำเลี้ยง 8 วินาที ดูดซับดาเมจ 150~270% ของ MATK • โล่แตก = ระเบิดน้ำแข็งรอบตัว 2.5 ช่อง 120~200% และทำให้ช้า',
      'A sap ward for 8s that absorbs damage equal to 150~270% of MATK • when it breaks it bursts into ice around you (2.5 cells) for 120~200% and slows.') },
  blink_glyph: { name: 'Blink Glyph', max: 5, type: 'active', target: 'self', icon: '#b0a0ff', glyph: '⟡', req: { rune_circle: 1 },
    sp: () => 12, delay: 300, cd: 6, special: 'c3_blink', c3blink: { dist: lv => 4 + 0.2 * lv },
    desc: L('วาร์ปไปกลางวงรูนของตัวเองที่ใกล้ที่สุด (ไม่มีวง = พุ่งไปข้างหน้า 4.2~5 ช่อง หนีจากศัตรู)',
      'Warp to the centre of your nearest rune circle (no circle = blink 4.2~5 cells away from the enemy).') },

  // ===== Fenrir Packlord =====
  pack_blood: { name: 'Pack Blood', max: 5, type: 'passive', icon: '#ff7040', glyph: 'ᚹ',
    passive: lv => ({ hpPct: 2 * lv }),
    c3pack: { per: lv => 0.006 * lv, cap: 5, r: 3, leech: lv => lv },
    desc: L('เลือดฝูง MaxHP +2%×Lv • ศัตรูในระยะ 3 ช่องแต่ละตัว ดาเมจกายภาพ +0.6%×Lv (สูงสุด 5 ตัว = +15%) • HP ต่ำกว่า 50% ดูดเลือด +1%×Lv',
      'Pack blood. MaxHP +2%×Lv • each enemy within 3 cells grants +0.6%×Lv physical damage (up to 5 = +15%) • below 50% HP gain +1%×Lv lifesteal.') },
  howl_of_the_pack: { name: 'Howl of the Pack', max: 5, type: 'active', target: 'self', icon: '#ff5a2a', glyph: 'ᚺ', req: { pack_blood: 1 },
    sp: lv => 26 + 2 * lv, delay: 900, cd: 16, selfFx: 'howl', special: 'c3_howl', dur: () => 10,
    c3wolves: { n: 3, pow: lv => 0.25 + 0.05 * lv },
    desc: L('หอนเรียกเงาหมาป่าเพลิง 3 ตัว 10 วินาที วิ่งกัดศัตรูรอบตัว (แรงกัด 30~50% ของพลังหมาป่าคู่ใจ ตามเลเวลสกิลและ ATK)',
      'Howl to call 3 shadow fire-wolves for 10s that bite enemies around you (30~50% of a companion wolf\'s power, scaling with skill level and ATK).') },
  jaws_of_fenrir: { name: 'Jaws of Fenrir', max: 5, type: 'active', target: 'enemy', melee: true, icon: '#e04a20', glyph: '⩔', req: { pack_blood: 1 },
    sp: () => 14, delay: 700, cd: 4, chain: true, fx: 'bash', vfx: 'fang', c3leech: 0.1,
    dmg: { type: 'phys', mult: lv => 2.2 + 0.38 * lv, hits: 2 },
    desc: L('ขากรรไกรเฟนเรียร์ กัด 2 ครั้ง ครั้งละ 258~410% ดูดเลือด 10% ของดาเมจ',
      'Jaws of Fenrir: bite twice for 258~410% each, healing 10% of the damage dealt.') },
  wolfstorm_cleave: { name: 'Wolfstorm Cleave', max: 5, type: 'active', target: 'self', icon: '#ff9050', glyph: '⟳', req: { jaws_of_fenrir: 2 },
    sp: () => 18, hpCost: () => 6, delay: 1100, cd: 10, selfFx: 'whirl', vfx: 'cleave',
    dmg: { type: 'phys', mult: lv => 0.9 + 0.16 * lv, hits: 3, area: 2.5, at: 'self' },
    desc: L('หมุนขวานพายุหมาป่า 3 รอบ รอบตัว 2.5 ช่อง รอบละ 106~170% เสีย HP 6%',
      'Spin the axe in a wolfstorm 3 times within 2.5 cells for 106~170% each. Costs 6% HP.') },
  alphas_mark: { name: "Alpha's Mark", max: 5, type: 'active', target: 'enemy', range: 9, icon: '#ffd060', glyph: '◎', req: { howl_of_the_pack: 2 },
    sp: () => 15, delay: 500, cd: 12, special: 'c3_mark', c3mark: { k: lv => 0.05 + 0.02 * lv, dur: () => 10 },
    desc: L('ประกาศเป้าของจ่าฝูง 10 วินาที: เราและหมาป่าตีเป้านั้นแรงขึ้น 7~15%',
      "Mark the alpha's prey for 10s: you and your wolves deal 7~15% more damage to it.") },
  unchained: { name: 'Unchained', max: 5, type: 'active', target: 'self', icon: '#ff3a3a', glyph: '⛓', req: { pack_blood: 3 },
    sp: () => 20, delay: 500, cd: 30, selfFx: 'buff', vfx: 'undying',
    buff: { dur: () => 6, stats: lv => ({ stunRes: 20 * lv }) },
    c3unchained: { floor: () => 2 },
    desc: L('หลุดโซ่ ล้างอาการมึน และกันมึน 6 วินาที (ต้านมึน +20%×Lv หลังจากนั้น) • 2 วินาทีแรก HP ไม่ต่ำกว่า 1',
      'Break the chains: clears stun and blocks stuns for 6s (stun resist +20%×Lv) • for the first 2s your HP cannot drop below 1.') },
});
for (const id of ['root_script', 'rune_circle', 'ragnarok_verse', 'odins_spear_rune', 'sap_ward', 'blink_glyph', 'pack_blood', 'howl_of_the_pack', 'jaws_of_fenrir', 'wolfstorm_cleave', 'alphas_mark', 'unchained'])
  SKILLS[id].id = id;
