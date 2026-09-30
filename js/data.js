'use strict';
// ============================================================
//  ข้อมูลเกม: อาชีพ สกิล ไอเทม มอนสเตอร์ ธาตุ
// ============================================================

const TILE = 40;

// ตัวคูณธาตุ: ELEM_TABLE[ธาตุผู้โจมตี][ธาตุผู้ป้องกัน]
const ELEM_TABLE = {
  neutral: { ghost: 0.25 },
  water:   { fire: 1.5, water: 0.25, wind: 0.75, undead: 1.0 },
  earth:   { wind: 1.5, earth: 0.25, fire: 0.75 },
  fire:    { earth: 1.5, undead: 1.25, fire: 0.25, water: 0.75 },
  wind:    { water: 1.5, wind: 0.25, earth: 0.75 },
  poison:  { undead: 0.5, poison: 0, holy: 0.75 },
  holy:    { undead: 1.5, shadow: 1.25, holy: 0 },
  shadow:  { holy: 1.25, shadow: 0, undead: 0 },
  ghost:   { ghost: 1.25, neutral: 0.25 },
  undead:  { holy: 1.25, undead: 0 },
};
function elemMod(atk, def) {
  const row = ELEM_TABLE[atk];
  if (row && row[def] != null) return row[def];
  return 1;
}
const ELEM_THAI = {
  neutral: 'ไม่มีธาตุ', water: 'น้ำ', earth: 'ดิน', fire: 'ไฟ', wind: 'ลม',
  poison: 'พิษ', holy: 'ศักดิ์สิทธิ์', shadow: 'มืด', ghost: 'วิญญาณ', undead: 'อมตะ',
};

// ------------------------------------------------------------
//  อาชีพ
// ------------------------------------------------------------
const JOBS = {
  novice:   { name: 'Novice',   thai: 'โนวิซ',     hp: 0.9, sp: 1.0, jobMax: 10, aspd: 1500,
              outfit: '#b8905a', outfit2: '#7a5a33', pants: '#5a4127',
              skills: ['basic_skill', 'first_aid'] },
  swordman: { name: 'Swordman', thai: 'นักดาบ',     hp: 1.8, sp: 0.9, jobMax: 50, aspd: 1300,
              outfit: '#4a6fb3', outfit2: '#c9ced8', pants: '#2c3550',
              skills: ['sword_mastery', 'hp_recovery', 'bash', 'magnum_break'],
              desc: 'พลังชีวิตสูง ป้องกันแข็งแกร่ง ถนัดดาบ' },
  mage:     { name: 'Mage',     thai: 'นักเวทย์',    hp: 0.8, sp: 2.0, jobMax: 50, aspd: 1500,
              outfit: '#6b3fa0', outfit2: '#e2c45a', pants: '#3a2358',
              skills: ['sp_recovery', 'fire_bolt', 'cold_bolt', 'lightning_bolt', 'soul_strike', 'frost_diver'],
              desc: 'เวทมนตร์ธาตุโจมตีระยะไกลรุนแรง แต่ตัวบาง' },
  archer:   { name: 'Archer',   thai: 'นักธนู',     hp: 1.1, sp: 1.2, jobMax: 50, aspd: 1400,
              outfit: '#3f8a4a', outfit2: '#d9b36b', pants: '#4a3a24',
              skills: ['owl_eye', 'vultures_eye', 'improve_concentration', 'double_strafe', 'arrow_shower'],
              desc: 'ยิงธนูจากระยะไกล DEX สูง' },
  acolyte:  { name: 'Acolyte',  thai: 'อโคไลท์',    hp: 1.3, sp: 1.6, jobMax: 50, aspd: 1400,
              outfit: '#ece6d6', outfit2: '#b83a3a', pants: '#6a5a4a',
              skills: ['demon_bane', 'heal', 'increase_agi', 'blessing', 'holy_light'],
              desc: 'ผู้รักษา มีบัฟและเวทศักดิ์สิทธิ์ แข็งแกร่งต่ออมตะ' },
  thief:    { name: 'Thief',    thai: 'โจร',        hp: 1.3, sp: 1.0, jobMax: 50, aspd: 1200,
              outfit: '#444a55', outfit2: '#9a2f2f', pants: '#2a2d33',
              skills: ['double_attack', 'improve_dodge', 'envenom', 'steal'],
              desc: 'ว่องไว หลบหลีกเก่ง โจมตีสองครั้ง' },
};
const FIRST_JOBS = ['swordman', 'mage', 'archer', 'acolyte', 'thief'];

const WEAPON_ASPD_MOD = { none: 0.85, dagger: 0.9, sword: 1.0, rod: 1.1, bow: 1.05, mace: 1.05 };
const WTYPE_THAI = { none: 'มือเปล่า', dagger: 'มีดสั้น', sword: 'ดาบ', rod: 'คทา', bow: 'ธนู', mace: 'กระบอง' };

// ------------------------------------------------------------
//  สกิล
// ------------------------------------------------------------
// target: 'self' | 'enemy'  type: 'active' | 'passive'
const SKILLS = {
  // --- Novice ---
  basic_skill: { name: 'Basic Skill', max: 9, type: 'passive', icon: '#c9a36b', glyph: 'B',
    desc: 'ทักษะพื้นฐานของนักผจญภัย ต้องมี Lv 9 จึงจะเปลี่ยนอาชีพได้' },
  first_aid: { name: 'First Aid', max: 1, type: 'active', target: 'self', icon: '#e0707a', glyph: '+',
    sp: () => 3, delay: 600, noLearn: true, desc: 'ปฐมพยาบาล ฟื้นฟู HP 5 หน่วย' },

  // --- Swordman ---
  sword_mastery: { name: 'Sword Mastery', max: 10, type: 'passive', icon: '#9fb4d8', glyph: '⚔',
    desc: 'ATK +4 ต่อเลเวล เมื่อใช้ดาบหรือมีดสั้น' },
  hp_recovery: { name: 'Increase HP Recovery', max: 10, type: 'passive', icon: '#e06060', glyph: '♥',
    desc: 'ฟื้นฟู HP เพิ่ม 5×Lv + 0.2%×Lv ของ MaxHP ทุกรอบการฟื้นฟู' },
  bash: { name: 'Bash', max: 10, type: 'active', target: 'enemy', melee: true, icon: '#d8a040', glyph: 'B',
    sp: lv => (lv <= 5 ? 8 : 15), delay: 500, chain: true,
    desc: 'ฟาดอย่างรุนแรง ความเสียหาย 100%+30%×Lv และ HIT +5%×Lv' },
  magnum_break: { name: 'Magnum Break', max: 10, type: 'active', target: 'self', icon: '#f06030', glyph: '✹',
    sp: () => 30, delay: 1800, req: { bash: 5 },
    desc: 'ระเบิดไฟรอบตัว (2 ช่อง) ความเสียหาย 100%+20%×Lv ธาตุไฟ ผลักศัตรูออก' },

  // --- Mage ---
  sp_recovery: { name: 'Increase SP Recovery', max: 10, type: 'passive', icon: '#6080e0', glyph: '✦',
    desc: 'ฟื้นฟู SP เพิ่ม 3×Lv + 0.2%×Lv ของ MaxSP ทุกรอบการฟื้นฟู' },
  fire_bolt: { name: 'Fire Bolt', max: 10, type: 'active', target: 'enemy', range: 9, magic: true, element: 'fire',
    icon: '#f05a28', glyph: '火', sp: lv => 10 + 2 * lv, cast: lv => 500 + 350 * lv, delay: lv => 800 + 150 * lv,
    hits: lv => lv, mult: () => 1, desc: 'ลูกไฟตกใส่เป้าหมาย Lv ลูก ลูกละ 100% MATK ธาตุไฟ' },
  cold_bolt: { name: 'Cold Bolt', max: 10, type: 'active', target: 'enemy', range: 9, magic: true, element: 'water',
    icon: '#50b8f0', glyph: '氷', sp: lv => 10 + 2 * lv, cast: lv => 500 + 350 * lv, delay: lv => 800 + 150 * lv,
    hits: lv => lv, mult: () => 1, desc: 'หอกน้ำแข็ง Lv เล่ม เล่มละ 100% MATK ธาตุน้ำ' },
  lightning_bolt: { name: 'Lightning Bolt', max: 10, type: 'active', target: 'enemy', range: 9, magic: true, element: 'wind',
    icon: '#e8e050', glyph: '雷', sp: lv => 10 + 2 * lv, cast: lv => 500 + 350 * lv, delay: lv => 800 + 150 * lv,
    hits: lv => lv, mult: () => 1, desc: 'สายฟ้าฟาด Lv ครั้ง ครั้งละ 100% MATK ธาตุลม' },
  soul_strike: { name: 'Soul Strike', max: 10, type: 'active', target: 'enemy', range: 9, magic: true, element: 'ghost',
    icon: '#b0a0ff', glyph: '魂', sp: lv => 16 + 2 * lv, cast: () => 500, delay: lv => 800 + 100 * lv,
    hits: lv => Math.ceil(lv / 2), mult: () => 1, desc: 'วิญญาณพุ่งใส่ ⌈Lv/2⌉ ลูก ธาตุวิญญาณ แรงขึ้นกับอมตะ' },
  frost_diver: { name: 'Frost Diver', max: 10, type: 'active', target: 'enemy', range: 9, magic: true, element: 'water',
    icon: '#9ae0ff', glyph: '❄', sp: lv => 26 - lv, cast: () => 800, delay: () => 1500, req: { cold_bolt: 5 },
    hits: () => 1, mult: lv => 1 + 0.1 * lv, desc: 'แช่แข็งศัตรู โอกาส 35%+3%×Lv นาน 3×Lv วินาที' },

  // --- Archer ---
  owl_eye: { name: "Owl's Eye", max: 10, type: 'passive', icon: '#a07a50', glyph: '◉', desc: 'DEX +1 ต่อเลเวล' },
  vultures_eye: { name: "Vulture's Eye", max: 10, type: 'passive', icon: '#806040', glyph: '➶', req: { owl_eye: 3 },
    desc: 'ระยะยิงธนู +1 ช่อง และ HIT +1 ต่อเลเวล' },
  improve_concentration: { name: 'Improve Concentration', max: 10, type: 'active', target: 'self', icon: '#60c070', glyph: '◎',
    sp: lv => 20 + 5 * lv, delay: 1000, req: { vultures_eye: 1 },
    desc: 'AGI และ DEX +(2+Lv) นาน 40+20×Lv วินาที' },
  double_strafe: { name: 'Double Strafe', max: 10, type: 'active', target: 'enemy', bow: true, icon: '#c09050', glyph: '»',
    sp: () => 12, delay: 400, chain: true, desc: 'ยิงธนู 2 ดอก ดอกละ 100%+10%×Lv (ต้องใช้ธนู)' },
  arrow_shower: { name: 'Arrow Shower', max: 10, type: 'active', target: 'enemy', bow: true, icon: '#a0c050', glyph: '⇶',
    sp: () => 15, delay: 800, chain: true, req: { double_strafe: 5 },
    desc: 'ห่าธนูรอบเป้าหมาย รัศมี 1.5 ช่อง 80%+5%×Lv (ต้องใช้ธนู)' },

  // --- Acolyte ---
  demon_bane: { name: 'Demon Bane', max: 10, type: 'passive', icon: '#f0e0a0', glyph: '✝',
    desc: 'ATK +3×Lv เมื่อโจมตีอมตะและปีศาจ' },
  heal: { name: 'Heal', max: 10, type: 'active', target: 'self', icon: '#70e070', glyph: '✚',
    sp: lv => 10 + 3 * lv, delay: 1000,
    desc: 'ฟื้นฟู HP = ⌊(BaseLv+INT)/8⌋×(4+8×Lv) (กดใช้กับศัตรูอมตะจะสร้างความเสียหายครึ่งหนึ่ง)' },
  increase_agi: { name: 'Increase AGI', max: 10, type: 'active', target: 'self', icon: '#60d0e0', glyph: '≫',
    sp: lv => 15 + 3 * lv, cast: () => 700, delay: 1000, req: { heal: 3 },
    desc: 'AGI +(2+Lv) และเดินเร็วขึ้น นาน 60+20×Lv วินาที' },
  blessing: { name: 'Blessing', max: 10, type: 'active', target: 'self', icon: '#f0d060', glyph: '☼',
    sp: lv => 24 + 4 * lv, delay: 1000, req: { demon_bane: 5 },
    desc: 'STR, INT, DEX +Lv นาน 40+20×Lv วินาที' },
  holy_light: { name: 'Holy Light', max: 5, type: 'active', target: 'enemy', range: 9, magic: true, element: 'holy',
    icon: '#fff6c0', glyph: '✧', sp: () => 15, cast: () => 1500, delay: () => 800,
    hits: () => 1, mult: lv => 1.25 + 0.25 * (lv - 1), desc: 'ลำแสงศักดิ์สิทธิ์ 125%+25%×(Lv-1) MATK ธาตุศักดิ์สิทธิ์' },

  // --- Thief ---
  double_attack: { name: 'Double Attack', max: 10, type: 'passive', icon: '#c0c0d0', glyph: '‖',
    desc: 'โอกาส 5%×Lv โจมตี 2 ครั้ง (เมื่อใช้มีดสั้น)' },
  improve_dodge: { name: 'Improve Dodge', max: 10, type: 'passive', icon: '#90e0b0', glyph: '↯', desc: 'FLEE +3 ต่อเลเวล' },
  envenom: { name: 'Envenom', max: 10, type: 'active', target: 'enemy', melee: true, icon: '#70c040', glyph: '☠',
    sp: () => 12, delay: 500, chain: true,
    desc: 'โจมตีธาตุพิษ ATK +15×Lv โอกาสติดพิษ 10%+4%×Lv' },
  steal: { name: 'Steal', max: 10, type: 'active', target: 'enemy', melee: true, icon: '#d0a0e0', glyph: '✋',
    sp: () => 10, delay: 500, req: { double_attack: 1 },
    desc: 'ขโมยไอเทมจากมอนสเตอร์ (1 ครั้งต่อตัว) โอกาสขึ้นกับ Lv และ DEX' },
};

// ------------------------------------------------------------
//  ไอเทม
//  type: use | etc | weapon | armor | card
//  slot (อุปกรณ์): weapon head armor shield garment shoes acc
// ------------------------------------------------------------
const ALL_BUT_ACO = ['novice', 'swordman', 'mage', 'archer', 'thief'];
const ITEMS = {
  // --- ของใช้ ---
  red_potion:    { name: 'Red Potion',    type: 'use', price: 50,   heal: [45, 65],   icon: { s: 'potion', c: '#e03030' }, desc: 'ฟื้นฟู HP 45~65' },
  orange_potion: { name: 'Orange Potion', type: 'use', price: 200,  heal: [105, 145], icon: { s: 'potion', c: '#f08020' }, desc: 'ฟื้นฟู HP 105~145' },
  yellow_potion: { name: 'Yellow Potion', type: 'use', price: 550,  heal: [175, 235], icon: { s: 'potion', c: '#e8d020' }, desc: 'ฟื้นฟู HP 175~235' },
  white_potion:  { name: 'White Potion',  type: 'use', price: 1200, heal: [325, 405], icon: { s: 'potion', c: '#f4f4f4' }, desc: 'ฟื้นฟู HP 325~405' },
  blue_potion:   { name: 'Blue Potion',   type: 'use', price: 2500, spHeal: [40, 60], icon: { s: 'potion', c: '#3060e0' }, desc: 'ฟื้นฟู SP 40~60' },
  apple:         { name: 'Apple',         type: 'use', price: 15,   heal: [16, 22],   icon: { s: 'fruit', c: '#d82828' }, desc: 'แอปเปิลสด ฟื้นฟู HP 16~22' },
  carrot:        { name: 'Carrot',        type: 'use', price: 15,   heal: [18, 24],   icon: { s: 'carrot', c: '#f08020' }, desc: 'แครอท ฟื้นฟู HP 18~24' },
  meat:          { name: 'Meat',          type: 'use', price: 50,   heal: [70, 100],  icon: { s: 'meat', c: '#b05030' }, desc: 'เนื้อย่าง ฟื้นฟู HP 70~100' },
  grape:         { name: 'Grape',         type: 'use', price: 200,  spHeal: [10, 15], icon: { s: 'grape', c: '#7040a0' }, desc: 'องุ่น ฟื้นฟู SP 10~15' },
  green_herb:    { name: 'Green Herb',    type: 'use', price: 10,   heal: [12, 18], cure: true, icon: { s: 'herb', c: '#40a040' }, desc: 'สมุนไพรเขียว ฟื้นฟู HP 12~18 และแก้พิษ' },
  red_herb:      { name: 'Red Herb',      type: 'use', price: 18,   heal: [18, 28],   icon: { s: 'herb', c: '#d04040' }, desc: 'สมุนไพรแดง ฟื้นฟู HP 18~28' },
  honey:         { name: 'Honey',         type: 'use', price: 500,  heal: [70, 100], spHeal: [20, 40], icon: { s: 'jar', c: '#f0b020' }, desc: 'น้ำผึ้ง ฟื้นฟู HP 70~100 และ SP 20~40' },
  fly_wing:      { name: 'Fly Wing',      type: 'use', price: 60,   effect: 'fly',    icon: { s: 'wing', c: '#8fd0f0' }, desc: 'วาร์ปไปยังจุดสุ่มในแผนที่ปัจจุบัน' },
  butterfly_wing:{ name: 'Butterfly Wing',type: 'use', price: 300,  effect: 'return', icon: { s: 'wing', c: '#f0a0d0' }, desc: 'วาร์ปกลับจุดเซฟ' },

  // --- ของดรอป (ขายได้) ---
  jellopy:          { name: 'Jellopy',          type: 'etc', price: 6,    icon: { s: 'blob', c: '#e8b0d0' }, desc: 'ก้อนเจลลี่ใส ๆ จากโพริง' },
  fluff:            { name: 'Fluff',            type: 'etc', price: 8,    icon: { s: 'blob', c: '#f4f4e8' }, desc: 'ขนปุยนุ่มนิ่ม' },
  clover:           { name: 'Clover',           type: 'etc', price: 6,    icon: { s: 'herb', c: '#50c050' }, desc: 'ใบโคลเวอร์สามแฉก' },
  feather:          { name: 'Feather',          type: 'etc', price: 6,    icon: { s: 'feather', c: '#f0f0f0' }, desc: 'ขนนกสีขาว' },
  shell:            { name: 'Shell',            type: 'etc', price: 14,   icon: { s: 'shell', c: '#c0a070' }, desc: 'เปลือกแข็งของแมลง' },
  sticky_mucus:     { name: 'Sticky Mucus',     type: 'etc', price: 8,    icon: { s: 'blob', c: '#90d060' }, desc: 'เมือกเหนียว ๆ' },
  grasshoppers_leg: { name: "Grasshopper's Leg",type: 'etc', price: 24,   icon: { s: 'bone', c: '#80b040' }, desc: 'ขาตั๊กแตน' },
  tree_root:        { name: 'Tree Root',        type: 'etc', price: 8,    icon: { s: 'bone', c: '#8a6038' }, desc: 'รากไม้' },
  mushroom_spore:   { name: 'Mushroom Spore',   type: 'etc', price: 12,   icon: { s: 'blob', c: '#d05050' }, desc: 'สปอร์เห็ด' },
  wolf_claw:        { name: 'Wolf Claw',        type: 'etc', price: 60,   icon: { s: 'claw', c: '#e0e0e0' }, desc: 'กรงเล็บหมาป่า' },
  raccoon_leaf:     { name: 'Raccoon Leaf',     type: 'etc', price: 44,   icon: { s: 'herb', c: '#70a030' }, desc: 'ใบไม้วิเศษของแรคคูน' },
  bear_footskin:    { name: "Bear's Footskin",  type: 'etc', price: 180,  icon: { s: 'claw', c: '#8a5a30' }, desc: 'หนังเท้าหมี' },
  animal_skin:      { name: 'Animal Skin',      type: 'etc', price: 30,   icon: { s: 'cloth', c: '#9a7040' }, desc: 'หนังสัตว์' },
  decayed_nail:     { name: 'Decayed Nail',     type: 'etc', price: 24,   icon: { s: 'claw', c: '#80a080' }, desc: 'เล็บที่เน่าเปื่อย' },
  skel_bone:        { name: 'Skel-Bone',        type: 'etc', price: 72,   icon: { s: 'bone', c: '#f0ecd8' }, desc: 'กระดูกโครงกระดูก' },
  munak_turban:     { name: 'Munak Turban',     type: 'etc', price: 180,  icon: { s: 'cloth', c: '#303060' }, desc: 'หมวกของมูนัค' },
  amulet:           { name: 'Amulet',           type: 'etc', price: 240,  icon: { s: 'ring', c: '#e0c040' }, desc: 'เครื่องรางโบราณ' },
  emperium:         { name: 'Emperium',         type: 'etc', price: 20000,icon: { s: 'gem', c: '#f0e040' }, desc: 'อัญมณีล้ำค่าในตำนาน' },

  // --- อาวุธ ---
  knife:        { name: 'Knife',        type: 'weapon', slot: 'weapon', wtype: 'dagger', atk: 17, price: 50,    slots: 3, jobs: ALL_BUT_ACO, icon: { s: 'dagger', c: '#c8c8d0' }, desc: 'มีดสั้นธรรมดา' },
  cutter:       { name: 'Cutter',       type: 'weapon', slot: 'weapon', wtype: 'dagger', atk: 30, price: 1250,  slots: 3, jobs: ALL_BUT_ACO, icon: { s: 'dagger', c: '#d0d8e0' }, desc: 'มีดคัตเตอร์คมกริบ' },
  main_gauche:  { name: 'Main Gauche',  type: 'weapon', slot: 'weapon', wtype: 'dagger', atk: 43, price: 2400,  slots: 3, jobs: ALL_BUT_ACO, icon: { s: 'dagger', c: '#e0e0f0' }, desc: 'มีดคู่มือซ้าย' },
  stiletto:     { name: 'Stiletto',     type: 'weapon', slot: 'weapon', wtype: 'dagger', atk: 60, price: 7500,  slots: 2, lv: 12, jobs: ['mage', 'archer', 'thief', 'swordman'], icon: { s: 'dagger', c: '#a0c0f0' }, desc: 'มีดเรียวยาว' },
  gladius:      { name: 'Gladius',      type: 'weapon', slot: 'weapon', wtype: 'dagger', atk: 105, price: 26000, slots: 1, lv: 30, jobs: ['thief'], icon: { s: 'dagger', c: '#f0d080' }, desc: 'มีดสั้นของนักสู้ (โจรเท่านั้น)' },
  sword:        { name: 'Sword',        type: 'weapon', slot: 'weapon', wtype: 'sword', atk: 25, price: 100,    slots: 3, jobs: ['novice', 'swordman', 'thief'], icon: { s: 'sword', c: '#c8c8d0' }, desc: 'ดาบมือเดียวพื้นฐาน' },
  falchion:     { name: 'Falchion',     type: 'weapon', slot: 'weapon', wtype: 'sword', atk: 49, price: 1500,   slots: 3, jobs: ['novice', 'swordman', 'thief'], icon: { s: 'sword', c: '#d8d8e8' }, desc: 'ดาบโค้ง' },
  blade:        { name: 'Blade',        type: 'weapon', slot: 'weapon', wtype: 'sword', atk: 60, price: 3200,   slots: 3, jobs: ['novice', 'swordman', 'thief'], icon: { s: 'sword', c: '#e8e8f8' }, desc: 'ดาบใบกว้าง' },
  tsurugi:      { name: 'Tsurugi',      type: 'weapon', slot: 'weapon', wtype: 'sword', atk: 130, price: 32000, slots: 1, lv: 30, jobs: ['swordman'], icon: { s: 'sword', c: '#f0e0a0' }, desc: 'ดาบซามูไร (นักดาบเท่านั้น)' },
  rod:          { name: 'Rod',          type: 'weapon', slot: 'weapon', wtype: 'rod', atk: 15, matk: 15, price: 50,     slots: 3, jobs: ['novice', 'mage', 'acolyte'], icon: { s: 'rod', c: '#a07040' }, desc: 'คทาไม้ MATK +15' },
  wand:         { name: 'Wand',         type: 'weapon', slot: 'weapon', wtype: 'rod', atk: 25, matk: 35, price: 2500,   slots: 2, lv: 12, jobs: ['mage', 'acolyte'], icon: { s: 'rod', c: '#50a0e0' }, desc: 'ไม้กายสิทธิ์ MATK +35 INT +1', b: { int: 1 } },
  arc_wand:     { name: 'Arc Wand',     type: 'weapon', slot: 'weapon', wtype: 'rod', atk: 60, matk: 75, price: 14000,  slots: 1, lv: 24, jobs: ['mage'], icon: { s: 'rod', c: '#e050e0' }, desc: 'คทาอาร์ค MATK +75 INT +3 (นักเวทย์เท่านั้น)', b: { int: 3 } },
  bow:          { name: 'Bow',          type: 'weapon', slot: 'weapon', wtype: 'bow', atk: 15, price: 1000,    slots: 3, jobs: ['archer', 'thief'], icon: { s: 'bow', c: '#a07040' }, desc: 'ธนูไม้' },
  composite_bow:{ name: 'Composite Bow',type: 'weapon', slot: 'weapon', wtype: 'bow', atk: 32, price: 2500,    slots: 3, jobs: ['archer', 'thief'], icon: { s: 'bow', c: '#c08040' }, desc: 'ธนูผสม' },
  great_bow:    { name: 'Great Bow',    type: 'weapon', slot: 'weapon', wtype: 'bow', atk: 55, price: 10000,   slots: 2, lv: 18, jobs: ['archer'], icon: { s: 'bow', c: '#6a4a2a' }, desc: 'ธนูใหญ่ (นักธนูเท่านั้น)' },
  hunter_bow:   { name: 'Hunter Bow',   type: 'weapon', slot: 'weapon', wtype: 'bow', atk: 125, price: 34000,  slots: 1, lv: 30, jobs: ['archer'], icon: { s: 'bow', c: '#308040' }, desc: 'ธนูนายพราน DEX +2', b: { dex: 2 } },
  club:         { name: 'Club',         type: 'weapon', slot: 'weapon', wtype: 'mace', atk: 23, price: 60,     slots: 3, jobs: ['novice', 'swordman', 'acolyte'], icon: { s: 'mace', c: '#8a6038' }, desc: 'กระบองไม้' },
  mace:         { name: 'Mace',         type: 'weapon', slot: 'weapon', wtype: 'mace', atk: 40, price: 800,    slots: 3, jobs: ['novice', 'swordman', 'acolyte'], icon: { s: 'mace', c: '#a0a0b0' }, desc: 'คทาเหล็ก' },
  morning_star: { name: 'Morning Star', type: 'weapon', slot: 'weapon', wtype: 'mace', atk: 90, price: 12000,  slots: 1, lv: 20, jobs: ['swordman', 'acolyte'], icon: { s: 'mace', c: '#d0d0e0' }, desc: 'กระบองหนามดาว' },
  moonlight_dagger: { name: 'Moonlight Dagger', type: 'weapon', slot: 'weapon', wtype: 'dagger', atk: 70, matk: 40, price: 60000, slots: 0, lv: 25, jobs: ALL_BUT_ACO, icon: { s: 'dagger', c: '#f0e070' },
    b: { sp: 60, int: 2 }, desc: '[MVP] มีดแสงจันทร์ MATK +40, INT +2, MaxSP +60' },

  // --- ชุดเกราะ / สวมใส่ ---
  cotton_shirt: { name: 'Cotton Shirt', type: 'armor', slot: 'armor', def: 1, price: 10,   slots: 1, jobs: 'all', icon: { s: 'armor', c: '#e8e0c8' }, desc: 'เสื้อฝ้าย DEF 1' },
  padded_armor: { name: 'Padded Armor', type: 'armor', slot: 'armor', def: 4, price: 1500, slots: 1, jobs: ['novice', 'swordman', 'archer', 'acolyte', 'thief'], icon: { s: 'armor', c: '#b09060' }, desc: 'เกราะนวม DEF 4' },
  silk_robe:    { name: 'Silk Robe',    type: 'armor', slot: 'armor', def: 3, mdef: 10, price: 3000, slots: 1, jobs: 'all', icon: { s: 'armor', c: '#a080d0' }, b: { int: 1 }, desc: 'เสื้อคลุมไหม DEF 3 MDEF 10 INT +1' },
  chain_mail:   { name: 'Chain Mail',   type: 'armor', slot: 'armor', def: 8, price: 9000, slots: 1, lv: 20, jobs: ['swordman', 'acolyte'], icon: { s: 'armor', c: '#a0a8b8' }, desc: 'เกราะโซ่ DEF 8' },
  plate_armor:  { name: 'Plate Armor',  type: 'armor', slot: 'armor', def: 12, price: 30000, slots: 1, lv: 35, jobs: ['swordman'], icon: { s: 'armor', c: '#d0d8e8' }, desc: 'เกราะเหล็ก DEF 12 (นักดาบเท่านั้น)' },
  hat:          { name: 'Hat',          type: 'armor', slot: 'head', def: 2, price: 1000,  slots: 0, jobs: 'all', icon: { s: 'hat', c: '#8a6a4a' }, desc: 'หมวก DEF 2' },
  ribbon:       { name: 'Ribbon',       type: 'armor', slot: 'head', def: 1, mdef: 3, price: 800, slots: 0, jobs: 'all', icon: { s: 'ribbon', c: '#e04070' }, b: { int: 1 }, desc: 'ริบบิ้น DEF 1 MDEF 3 INT +1' },
  cap:          { name: 'Cap',          type: 'armor', slot: 'head', def: 4, price: 6000, slots: 1, lv: 12, jobs: ['swordman', 'archer', 'acolyte', 'thief'], icon: { s: 'hat', c: '#8090a0' }, desc: 'หมวกเหล็ก DEF 4' },
  angel_wing:   { name: 'Angel Wing',   type: 'armor', slot: 'head', def: 3, mdef: 5, price: 50000, slots: 0, jobs: 'all', icon: { s: 'wing', c: '#ffffff' }, b: { int: 2, luk: 2, agi: 1 }, desc: '[MVP] ปีกนางฟ้า DEF 3 MDEF 5 INT +2 LUK +2 AGI +1' },
  guard:        { name: 'Guard',        type: 'armor', slot: 'shield', def: 3, price: 500,  slots: 1, jobs: 'all', icon: { s: 'shield', c: '#a07040' }, desc: 'โล่ไม้ DEF 3 (ใช้กับธนูไม่ได้)' },
  buckler:      { name: 'Buckler',      type: 'armor', slot: 'shield', def: 5, price: 6000, slots: 1, lv: 14, jobs: ['swordman', 'acolyte', 'thief', 'mage'], icon: { s: 'shield', c: '#b0b8c8' }, desc: 'โล่กลม DEF 5' },
  hood:         { name: 'Hood',         type: 'armor', slot: 'garment', def: 1, price: 120, slots: 1, jobs: 'all', icon: { s: 'cloth', c: '#6a8a5a' }, desc: 'ฮู้ด DEF 1' },
  muffler:      { name: 'Muffler',      type: 'armor', slot: 'garment', def: 2, price: 5000, slots: 1, jobs: 'all', icon: { s: 'cloth', c: '#c04040' }, desc: 'ผ้าพันคอ DEF 2' },
  sandals:      { name: 'Sandals',      type: 'armor', slot: 'shoes', def: 1, price: 400,  slots: 1, jobs: 'all', icon: { s: 'shoes', c: '#b08050' }, desc: 'รองเท้าแตะ DEF 1' },
  shoes:        { name: 'Shoes',        type: 'armor', slot: 'shoes', def: 2, price: 3500, slots: 1, jobs: 'all', icon: { s: 'shoes', c: '#6a4a3a' }, desc: 'รองเท้าหนัง DEF 2' },
  boots:        { name: 'Boots',        type: 'armor', slot: 'shoes', def: 4, price: 18000, slots: 1, lv: 20, jobs: 'all', icon: { s: 'shoes', c: '#4a3a2a' }, desc: 'รองเท้าบู๊ต DEF 4' },
  clip:         { name: 'Clip',         type: 'armor', slot: 'acc', price: 5000, slots: 1, jobs: 'all', icon: { s: 'ring', c: '#c0c0c0' }, b: { sp: 10 }, desc: 'กิ๊บติดผม MaxSP +10 (มีช่องการ์ด)' },
  ring:         { name: 'Ring',         type: 'armor', slot: 'acc', price: 20000, slots: 0, jobs: 'all', icon: { s: 'ring', c: '#e0b040' }, b: { str: 2 }, desc: 'แหวน STR +2' },
  earring:      { name: 'Earring',      type: 'armor', slot: 'acc', price: 20000, slots: 0, jobs: 'all', icon: { s: 'ring', c: '#60c0e0' }, b: { int: 2 }, desc: 'ต่างหู INT +2' },
  glove:        { name: 'Glove',        type: 'armor', slot: 'acc', price: 20000, slots: 0, jobs: 'all', icon: { s: 'ring', c: '#a06040' }, b: { dex: 2 }, desc: 'ถุงมือ DEX +2' },
  rosary:       { name: 'Rosary',       type: 'armor', slot: 'acc', price: 20000, slots: 0, jobs: 'all', icon: { s: 'ring', c: '#f0f0f0' }, b: { luk: 2, mdef: 3 }, desc: 'สร้อยประคำ LUK +2 MDEF 3' },

  // --- การ์ด ---
  poring_card:   { name: 'Poring Card',   type: 'card', slot: 'armor',   price: 20, b: { luk: 2, flee: 1 }, icon: { s: 'card', c: '#f0a0c0' }, desc: 'ใส่ชุดเกราะ: LUK +2, FLEE +1' },
  fabre_card:    { name: 'Fabre Card',    type: 'card', slot: 'armor',   price: 20, b: { vit: 1, hp: 100 }, icon: { s: 'card', c: '#90d060' }, desc: 'ใส่ชุดเกราะ: VIT +1, MaxHP +100' },
  lunatic_card:  { name: 'Lunatic Card',  type: 'card', slot: 'garment', price: 20, b: { luk: 1, crit: 1 }, icon: { s: 'card', c: '#f0f0f0' }, desc: 'ใส่ผ้าคลุม: LUK +1, CRIT +1' },
  drops_card:    { name: 'Drops Card',    type: 'card', slot: 'acc',     price: 20, b: { dex: 1, hit: 3 }, icon: { s: 'card', c: '#f0a040' }, desc: 'ใส่เครื่องประดับ: DEX +1, HIT +3' },
  chonchon_card: { name: 'Chonchon Card', type: 'card', slot: 'garment', price: 20, b: { agi: 1, flee: 2 }, icon: { s: 'card', c: '#e0d040' }, desc: 'ใส่ผ้าคลุม: AGI +1, FLEE +2' },
  rocker_card:   { name: 'Rocker Card',   type: 'card', slot: 'acc',     price: 20, b: { dex: 1, atk: 5 }, icon: { s: 'card', c: '#80c040' }, desc: 'ใส่เครื่องประดับ: DEX +1, ATK +5' },
  willow_card:   { name: 'Willow Card',   type: 'card', slot: 'armor',   price: 20, b: { sp: 80 }, icon: { s: 'card', c: '#a07040' }, desc: 'ใส่ชุดเกราะ: MaxSP +80' },
  spore_card:    { name: 'Spore Card',    type: 'card', slot: 'head',    price: 20, b: { vit: 2 }, icon: { s: 'card', c: '#e05050' }, desc: 'ใส่หมวก: VIT +2' },
  poporing_card: { name: 'Poporing Card', type: 'card', slot: 'weapon',  price: 20, b: { atk: 10, luk: 1 }, icon: { s: 'card', c: '#80d080' }, desc: 'ใส่อาวุธ: ATK +10, LUK +1' },
  smokie_card:   { name: 'Smokie Card',   type: 'card', slot: 'garment', price: 20, b: { agi: 2, flee: 3 }, icon: { s: 'card', c: '#909090' }, desc: 'ใส่ผ้าคลุม: AGI +2, FLEE +3' },
  wolf_card:     { name: 'Wolf Card',     type: 'card', slot: 'weapon',  price: 20, b: { crit: 8 }, icon: { s: 'card', c: '#c0c0d0' }, desc: 'ใส่อาวุธ: CRIT +8' },
  bigfoot_card:  { name: 'Bigfoot Card',  type: 'card', slot: 'shield',  price: 20, b: { vit: 1, def: 2 }, icon: { s: 'card', c: '#8a5a30' }, desc: 'ใส่โล่: VIT +1, DEF +2' },
  savage_card:   { name: 'Savage Card',   type: 'card', slot: 'armor',   price: 20, b: { vit: 3 }, icon: { s: 'card', c: '#6a4020' }, desc: 'ใส่ชุดเกราะ: VIT +3' },
  zombie_card:   { name: 'Zombie Card',   type: 'card', slot: 'shield',  price: 20, b: { hp: 200 }, icon: { s: 'card', c: '#709070' }, desc: 'ใส่โล่: MaxHP +200' },
  skeleton_card: { name: 'Skeleton Card', type: 'card', slot: 'weapon',  price: 20, b: { atk: 10, crit: 2 }, icon: { s: 'card', c: '#f0ecd8' }, desc: 'ใส่อาวุธ: ATK +10, CRIT +2' },
  munak_card:    { name: 'Munak Card',    type: 'card', slot: 'head',    price: 20, b: { int: 1, mdef: 5 }, icon: { s: 'card', c: '#4050a0' }, desc: 'ใส่หมวก: INT +1, MDEF +5' },
  bongun_card:   { name: 'Bongun Card',   type: 'card', slot: 'shoes',   price: 20, b: { vit: 1, hp: 150 }, icon: { s: 'card', c: '#303050' }, desc: 'ใส่รองเท้า: VIT +1, MaxHP +150' },
  angeling_card: { name: 'Angeling Card', type: 'card', slot: 'armor',   price: 20, b: { str: 2, agi: 2, vit: 2, int: 2, dex: 2, luk: 2 }, icon: { s: 'card', c: '#fff0a0' }, desc: '[MVP] ใส่ชุดเกราะ: สเตตัสทั้งหมด +2' },
  moonlight_card:{ name: 'Moonlight Flower Card', type: 'card', slot: 'shoes', price: 20, b: { agi: 3, sp: 50, flee: 5 }, icon: { s: 'card', c: '#f0c050' }, desc: '[MVP] ใส่รองเท้า: AGI +3, MaxSP +50, FLEE +5' },
};
for (const id in ITEMS) ITEMS[id].id = id;

const SLOT_THAI = { weapon: 'อาวุธ', head: 'หมวก', armor: 'ชุดเกราะ', shield: 'โล่', garment: 'ผ้าคลุม', shoes: 'รองเท้า', acc: 'เครื่องประดับ' };
const EQUIP_SLOTS = ['head', 'weapon', 'shield', 'armor', 'garment', 'shoes', 'acc'];

// ------------------------------------------------------------
//  มอนสเตอร์
//  def = hard def (%)  vit = soft def
// ------------------------------------------------------------
const MOBS = {
  poring:   { name: 'Poring',   lv: 1,  hp: 50,   atk: [7, 10],   def: 0,  mdef: 5,  vit: 1,  flee: 5,   hit: 8,   exp: 18,  jexp: 12, speed: 1.4, aggro: false, element: 'water', race: 'plant',
              sprite: 'poring', color: '#f28fb4', drops: [['jellopy', 0.7], ['apple', 0.15], ['red_potion', 0.04], ['knife', 0.01], ['poring_card', 0.01]] },
  fabre:    { name: 'Fabre',    lv: 2,  hp: 63,   atk: [8, 11],   def: 0,  mdef: 0,  vit: 2,  flee: 7,   hit: 10,  exp: 22,  jexp: 15, speed: 1.2, aggro: false, element: 'earth', race: 'insect',
              sprite: 'fabre', color: '#8fd35a', drops: [['fluff', 0.65], ['clover', 0.1], ['green_herb', 0.2], ['fabre_card', 0.01]] },
  lunatic:  { name: 'Lunatic',  lv: 3,  hp: 60,   atk: [9, 12],   def: 0,  mdef: 20, vit: 3,  flee: 12,  hit: 12,  exp: 26,  jexp: 18, speed: 2.0, aggro: false, element: 'neutral', race: 'brute',
              sprite: 'lunatic', color: '#fafafa', drops: [['clover', 0.6], ['feather', 0.2], ['carrot', 0.3], ['lunatic_card', 0.01]] },
  drops:    { name: 'Drops',    lv: 3,  hp: 72,   atk: [10, 13],  def: 0,  mdef: 0,  vit: 3,  flee: 9,   hit: 12,  exp: 30,  jexp: 20, speed: 1.4, aggro: false, element: 'fire', race: 'plant',
              sprite: 'poring', color: '#f5a442', drops: [['jellopy', 0.5], ['orange_potion', 0.04], ['red_herb', 0.2], ['drops_card', 0.01]] },
  chonchon: { name: 'Chonchon', lv: 4,  hp: 67,   atk: [10, 13],  def: 10, mdef: 0,  vit: 4,  flee: 20,  hit: 16,  exp: 35,  jexp: 24, speed: 2.4, aggro: true, element: 'wind', race: 'insect',
              sprite: 'chonchon', color: '#3a3a3a', drops: [['shell', 0.55], ['jellopy', 0.3], ['fly_wing', 0.05], ['chonchon_card', 0.01]] },

  willow:   { name: 'Willow',   lv: 8,  hp: 170,  atk: [18, 22],  def: 35, mdef: 5,  vit: 8,  flee: 10,  hit: 20,  exp: 80,  jexp: 55, speed: 1.0, aggro: false, element: 'earth', race: 'plant',
              sprite: 'willow', color: '#8a6038', drops: [['tree_root', 0.6], ['fluff', 0.3], ['willow_card', 0.01]] },
  rocker:   { name: 'Rocker',   lv: 9,  hp: 198,  atk: [24, 29],  def: 5,  mdef: 10, vit: 10, flee: 22,  hit: 28,  exp: 90,  jexp: 60, speed: 1.6, aggro: false, element: 'earth', race: 'insect',
              sprite: 'rocker', color: '#7cb342', drops: [['grasshoppers_leg', 0.55], ['green_herb', 0.2], ['cutter', 0.005], ['rocker_card', 0.01]] },
  spore:    { name: 'Spore',    lv: 12, hp: 280,  atk: [28, 34],  def: 10, mdef: 10, vit: 12, flee: 20,  hit: 30,  exp: 130, jexp: 90, speed: 1.2, aggro: false, element: 'water', race: 'plant',
              sprite: 'spore', color: '#d8433a', drops: [['mushroom_spore', 0.6], ['red_herb', 0.3], ['hat', 0.01], ['spore_card', 0.01]] },
  poporing: { name: 'Poporing', lv: 14, hp: 330,  atk: [32, 40],  def: 10, mdef: 10, vit: 14, flee: 24,  hit: 34,  exp: 160, jexp: 110, speed: 1.6, aggro: false, element: 'earth', race: 'plant',
              sprite: 'poring', color: '#7fcf6f', drops: [['sticky_mucus', 0.5], ['green_herb', 0.3], ['grape', 0.06], ['poporing_card', 0.01]] },
  angeling: { name: 'Angeling', lv: 25, hp: 5500, atk: [90, 120], def: 30, mdef: 50, vit: 25, flee: 60,  hit: 70,  exp: 3500, jexp: 2400, speed: 1.8, aggro: true, element: 'holy', race: 'angel',
              sprite: 'poring', color: '#fff3c4', scale: 2.0, boss: true, wings: true, respawn: 300000,
              drops: [['angel_wing', 0.35], ['white_potion', 0.6], ['blue_potion', 0.5], ['emperium', 0.1], ['angeling_card', 0.15]] },

  smokie:   { name: 'Smokie',   lv: 18, hp: 600,  atk: [45, 58],  def: 10, mdef: 5,  vit: 18, flee: 45,  hit: 48,  exp: 300, jexp: 210, speed: 1.8, aggro: false, element: 'earth', race: 'brute',
              sprite: 'quad', color: '#8a8a8a', color2: '#5a5a5a', size: 0.8, drops: [['raccoon_leaf', 0.5], ['animal_skin', 0.3], ['muffler', 0.01], ['smokie_card', 0.01]] },
  wolf:     { name: 'Wolf',     lv: 25, hp: 900,  atk: [60, 78],  def: 15, mdef: 0,  vit: 22, flee: 55,  hit: 60,  exp: 460, jexp: 320, speed: 2.4, aggro: true, element: 'earth', race: 'brute',
              sprite: 'quad', color: '#b0b0b8', color2: '#707078', size: 1.0, drops: [['wolf_claw', 0.6], ['meat', 0.3], ['wolf_card', 0.01]] },
  bigfoot:  { name: 'Bigfoot',  lv: 26, hp: 1150, atk: [65, 82],  def: 25, mdef: 5,  vit: 26, flee: 40,  hit: 55,  exp: 520, jexp: 350, speed: 1.3, aggro: false, element: 'earth', race: 'brute',
              sprite: 'quad', color: '#8a5a30', color2: '#5a3a1a', size: 1.35, drops: [['bear_footskin', 0.5], ['honey', 0.08], ['bigfoot_card', 0.01]] },
  savage:   { name: 'Savage',   lv: 28, hp: 1400, atk: [80, 100], def: 30, mdef: 5,  vit: 28, flee: 50,  hit: 65,  exp: 640, jexp: 450, speed: 1.9, aggro: true, element: 'earth', race: 'brute',
              sprite: 'quad', color: '#6a4a2a', color2: '#3a2a1a', size: 1.15, tusk: true, drops: [['animal_skin', 0.6], ['meat', 0.3], ['savage_card', 0.01]] },

  zombie:   { name: 'Zombie',   lv: 17, hp: 700,  atk: [45, 60],  def: 5,  mdef: 10, vit: 17, flee: 20,  hit: 45,  exp: 330, jexp: 220, speed: 0.9, aggro: true, element: 'undead', race: 'undead',
              sprite: 'human', skin: '#8fae84', outfit: '#5a4a3a', hair: '#3a3a2a', drops: [['decayed_nail', 0.6], ['sticky_mucus', 0.3], ['zombie_card', 0.01]] },
  skeleton: { name: 'Skeleton', lv: 24, hp: 1000, atk: [70, 90],  def: 20, mdef: 10, vit: 20, flee: 50,  hit: 60,  exp: 520, jexp: 360, speed: 1.6, aggro: true, element: 'undead', race: 'undead',
              sprite: 'human', skin: '#f0ecd8', outfit: '#f0ecd8', hair: null, bones: true, weapon: 'sword', drops: [['skel_bone', 0.5], ['falchion', 0.01], ['skeleton_card', 0.01]] },
  munak:    { name: 'Munak',    lv: 30, hp: 1500, atk: [90, 115], def: 30, mdef: 30, vit: 25, flee: 55,  hit: 75,  exp: 720, jexp: 500, speed: 1.5, aggro: true, element: 'undead', race: 'undead',
              sprite: 'human', skin: '#c8d0e0', outfit: '#3a4a8a', hair: '#101018', jiangshi: true, drops: [['munak_turban', 0.4], ['ribbon', 0.02], ['munak_card', 0.01]] },
  bongun:   { name: 'Bongun',   lv: 32, hp: 1700, atk: [100, 125],def: 30, mdef: 20, vit: 30, flee: 60,  hit: 80,  exp: 800, jexp: 560, speed: 1.5, aggro: true, element: 'undead', race: 'undead',
              sprite: 'human', skin: '#b8c0d0', outfit: '#2a2a3a', hair: '#101018', jiangshi: true, drops: [['amulet', 0.4], ['cap', 0.02], ['bongun_card', 0.01]] },
  moonlight:{ name: 'Moonlight Flower', lv: 45, hp: 22000, atk: [180, 240], def: 40, mdef: 50, vit: 40, flee: 110, hit: 130, exp: 16000, jexp: 11000, speed: 2.2, aggro: true, element: 'fire', race: 'demon',
              sprite: 'human', skin: '#f6d7b8', outfit: '#e86a2a', hair: '#f0a040', fox: true, scale: 1.6, boss: true, respawn: 600000,
              drops: [['moonlight_dagger', 0.4], ['white_potion', 0.8], ['blue_potion', 0.6], ['emperium', 0.15], ['moonlight_card', 0.15]] },
};
for (const id in MOBS) MOBS[id].id = id;

// ------------------------------------------------------------
//  ร้านค้า
// ------------------------------------------------------------
const SHOPS = {
  tool:   ['red_potion', 'orange_potion', 'yellow_potion', 'white_potion', 'blue_potion', 'apple', 'meat', 'grape', 'fly_wing', 'butterfly_wing'],
  weapon: ['knife', 'cutter', 'main_gauche', 'stiletto', 'gladius', 'sword', 'falchion', 'blade', 'tsurugi', 'rod', 'wand', 'arc_wand', 'bow', 'composite_bow', 'great_bow', 'hunter_bow', 'club', 'mace', 'morning_star'],
  armor:  ['cotton_shirt', 'padded_armor', 'silk_robe', 'chain_mail', 'plate_armor', 'hat', 'ribbon', 'cap', 'guard', 'buckler', 'hood', 'muffler', 'sandals', 'shoes', 'boots', 'clip', 'ring', 'earring', 'glove', 'rosary'],
};

// ------------------------------------------------------------
//  ตารางประสบการณ์
// ------------------------------------------------------------
const MAX_BASE_LV = 99;
function baseExpNeed(lv) { return Math.floor(10 * Math.pow(lv, 1.9)); }
function jobExpNeed(job, jl) {
  if (job === 'novice') return Math.floor(5 * Math.pow(jl, 1.5)) + 5;
  return Math.floor(12 * Math.pow(jl, 1.9));
}
function statCost(v) { return Math.floor((v - 1) / 10) + 2; }
function statPointsForLevel(lv) { return Math.floor(lv / 5) + 3; }
