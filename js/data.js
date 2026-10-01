'use strict';
// ============================================================
//  ข้อมูลเกม NEO MIDGARD: อาชีพ สกิล ไอเทม มอนสเตอร์ ธาตุ
//  ต้องการปรับสมดุล / เพิ่มสกิล / เพิ่มไอเทม แก้ที่ไฟล์นี้ได้เลย
// ============================================================

const TILE = 40;

// ตัวคูณธาตุ: ELEM_TABLE[ธาตุผู้โจมตี][ธาตุผู้ป้องกัน]
const ELEM_TABLE = {
  neutral: { ghost: 0.25 },
  water:   { fire: 1.5, water: 0.25, wind: 0.75 },
  earth:   { wind: 1.5, earth: 0.25, fire: 0.75 },
  fire:    { earth: 1.5, undead: 1.25, fire: 0.25, water: 0.75 },
  wind:    { water: 1.5, wind: 0.25, earth: 0.75 },
  poison:  { undead: 0.5, poison: 0, holy: 0.75 },
  holy:    { undead: 1.75, shadow: 1.25, holy: 0 },
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
//  อาชีพ (ออกแบบใหม่ ธีมตำนานนอร์ส)
//  hp/sp = ตัวคูณ MaxHP/MaxSP   aspd = ดีเลย์โจมตีพื้นฐาน (ms)
//  look = หน้าตา (สีชุด + หมวกประจำอาชีพ)
// ------------------------------------------------------------
const JOBS = {
  novice: { glow: '#7ad8ff', name: 'Novice', thai: 'ผู้เริ่มต้น', hp: 0.9, sp: 1.0, jobMax: 10, aspd: 1500,
    outfit: '#b8905a', outfit2: '#7a5a33', pants: '#5a4127',
    skills: ['first_aid', 'basic_training'] },
  einherjar: { glow: '#ff6a4a', name: 'Einherjar', thai: 'นักรบวิญญาณ', hp: 1.8, sp: 0.9, jobMax: 21, aspd: 1300,
    outfit: '#7a8494', outfit2: '#b03a2e', pants: '#3a3f4a', cape: '#9a2a22', jobHat: 'viking',
    stats: 'STR / VIT', role: 'แทงค์ แนวหน้า',
    desc: 'นักรบผู้ถูกเลือกจากวัลฮัลลา ยืนแนวหน้า ทนทานที่สุด ดึงศัตรูเข้าหาตัวและฟาดด้วยโล่',
    skills: ['iron_body', 'shield_slam', 'war_cry', 'whirlwind'] },
  runecaster: { glow: '#6ae0ff', name: 'Rune Caster', thai: 'นักเวทรูน', hp: 0.8, sp: 2.0, jobMax: 21, aspd: 1500,
    outfit: '#2f4f9a', outfit2: '#8fe0ff', pants: '#1f2f5a', robe: true, jobHat: 'runehood',
    stats: 'INT / DEX', role: 'เวทธาตุระยะไกล',
    desc: 'ผู้จารึกอักษรรูนโบราณเพื่อเรียกพลังธาตุ ไฟ น้ำแข็ง และสายฟ้า โจมตีแรงแต่ตัวบาง',
    skills: ['rune_mastery', 'fire_rune', 'ice_rune', 'thunder_rune'] },
  wildhunter: { glow: '#8cff7a', name: 'Wildhunter', thai: 'นักล่าแห่งป่า', hp: 1.1, sp: 1.2, jobMax: 21, aspd: 1400,
    outfit: '#3f6a3a', outfit2: '#c9a15a', pants: '#4a3a24', cape: '#2f5a2a', jobHat: 'hood',
    stats: 'DEX / AGI', role: 'ธนูระยะไกล + สัตว์คู่ใจ',
    desc: 'นักล่าผู้เติบโตในป่าลึก ยิงธนูทะลุแนวศัตรู วางกับดัก และมีหมาป่าคู่ใจช่วยสู้',
    skills: ['eagle_eye', 'piercing_arrow', 'wolf_companion', 'blast_trap'] },
  volva: { glow: '#ffe27a', name: 'Völva', thai: 'นักพยากรณ์แห่งแสง', hp: 1.3, sp: 1.6, jobMax: 21, aspd: 1400,
    outfit: '#f2ecdc', outfit2: '#d8b040', pants: '#8a7a5a', robe: true, jobHat: 'circlet',
    stats: 'INT / VIT', role: 'ฮีล บัฟ ปราบอมตะ',
    desc: 'ผู้หยั่งรู้ที่ได้รับพรจากเทพี ฟื้นฟูตนเอง อวยพรพลัง และแทงหอกแสงใส่ปีศาจ',
    skills: ['sanctuary', 'light_of_freyja', 'blessing_of_odin', 'holy_spear'] },
  trickster: { glow: '#c07aff', name: "Loki's Trickster", thai: 'นักลวงแห่งโลกิ', hp: 1.3, sp: 1.0, jobMax: 21, aspd: 1200,
    outfit: '#3a2f4a', outfit2: '#7ad04a', pants: '#24202e', jobHat: 'mask',
    stats: 'AGI / LUK', role: 'ว่องไว คริติคอล ลอบโจมตี',
    desc: 'สาวกของโลกิ เทพแห่งกลลวง หายตัวในควัน แทงข้างหลัง และอาบพิษบนใบมีด',
    skills: ['shadow_step', 'backstab', 'smoke_veil', 'venom_blade'] },
  berserker: { glow: '#ff8a2a', name: 'Berserker', thai: 'นักรบคลั่ง', hp: 1.6, sp: 0.7, jobMax: 21, aspd: 1250,
    outfit: '#8a5a34', outfit2: '#5a3a1e', pants: '#3a2a1a', jobHat: 'wolfpelt',
    stats: 'STR / AGI', role: 'แลก HP เป็นพลังโจมตี',
    desc: 'นักรบหนังหมาป่า (Úlfhéðnar) ยิ่งบาดเจ็บยิ่งดุร้าย ใช้เลือดตัวเองแลกพลังทำลายล้าง',
    skills: ['wolf_blood', 'rage_strike', 'blood_frenzy', 'howl'] },
};
const FIRST_JOBS = ['einherjar', 'runecaster', 'wildhunter', 'volva', 'trickster', 'berserker'];
const JOB_CHANGE_LV = 10;

const WEAPON_ASPD_MOD = { none: 0.85, dagger: 0.9, sword: 1.0, axe: 1.12, rod: 1.1, bow: 1.05, mace: 1.05 };
const WTYPE_THAI = { none: 'มือเปล่า', dagger: 'มีดสั้น', sword: 'ดาบ', axe: 'ขวาน', rod: 'คทา', bow: 'ธนู', mace: 'กระบอง' };

// ------------------------------------------------------------
//  สกิล (ระบบข้อมูล — สร้างสกิลใหม่ได้โดยเพิ่มรายการที่นี่ แล้วใส่ชื่อในรายการ skills ของอาชีพ)
//
//  type: 'active' | 'passive'      max: เลเวลสูงสุด      icon/glyph: สีและสัญลักษณ์ไอคอน
//  --- สกิลติดตัว (passive) ---
//  passive: lv => ({ สเตตัสที่เพิ่ม })  คีย์ที่ใช้ได้: str agi vit int dex luk atk matk def mdef hp sp hit flee
//           crit range hpPct matkPct castPct aspdPct regenPct rage
//  --- สกิลกดใช้ (active) ---
//  target: 'enemy' | 'self'    sp: lv => SP    cast: lv => ms (เวลาร่าย)    delay: ms (ดีเลย์หลังใช้)
//  range: ระยะ (ช่อง) | melee: true (ระยะประชิด) | bow: true (ต้องใช้ธนู ใช้ระยะธนู)
//  hpCost: lv => % ของ HP ปัจจุบันที่เสีย
//  dmg: { type: 'phys'|'magic', mult: lv => ตัวคูณ, hits: จำนวนครั้ง, element: ธาตุ,
//         area: รัศมี (ช่อง), at: 'target'|'self', line: true (ทะลุเป็นเส้นตรง),
//         sureHit: true (ไม่พลาด), knockback: ช่อง,
//         status: { kind: 'stun'|'slow'|'burn'|'poison', chance: lv => %, dur: lv => วินาที } }
//  heal: (lv, d, p) => จำนวน HP ที่ฟื้นฟู
//  buff: { dur: lv => วินาที, stats: lv => ({ สเตตัสที่เพิ่มชั่วคราว }) }   (มีคีย์พิเศษ venom = % ติดพิษ)
//  aggro: รัศมีที่ดึงมอนสเตอร์ให้เข้ามาหา
//  special: 'summon_wolf' | 'trap' | 'stealth'
//  fx: เอฟเฟกต์เมื่อโดน ('firebolt','coldbolt','lightning','holy','soul','arrow','bash','slash')
//  selfFx: เอฟเฟกต์รอบตัว ('firering','whirl','howl','buff','heal','shout')
//  chain: true = โจมตีปกติต่อหลังใช้สกิล
// ------------------------------------------------------------
const SKILLS = {
  // ===== Novice =====
  first_aid: { name: 'First Aid', max: 1, type: 'active', target: 'self', icon: '#e0707a', glyph: '+', noLearn: true,
    sp: () => 3, delay: 600, heal: () => 8, selfFx: 'heal',
    desc: 'ปฐมพยาบาล ฟื้นฟู HP 8 หน่วย' },
  basic_training: { name: 'Basic Training', max: 9, type: 'passive', icon: '#c9a36b', glyph: 'B',
    passive: lv => ({ atk: 2 * lv, hpPct: 2 * lv }),
    desc: 'ฝึกฝนพื้นฐาน ATK +2 และ MaxHP +2% ต่อเลเวล' },

  // ===== Einherjar =====
  iron_body: { name: 'Iron Body', max: 5, type: 'passive', icon: '#9aa4b4', glyph: '⛨',
    passive: lv => ({ hpPct: 5 * lv, def: lv }),
    desc: 'ร่างเหล็ก MaxHP +5% และ DEF +1 ต่อเลเวล' },
  shield_slam: { name: 'Shield Slam', max: 5, type: 'active', target: 'enemy', melee: true, icon: '#c8a040', glyph: '◘',
    sp: lv => 8 + lv, delay: 700, chain: true, fx: 'bash',
    dmg: { type: 'phys', mult: lv => 1.25 + 0.25 * lv, status: { kind: 'stun', chance: lv => 30 + 10 * lv, dur: () => 2 } },
    desc: 'ฟาดโล่ใส่ศัตรู 150~250% โอกาสทำให้มึน 2 วินาที' },
  war_cry: { name: 'War Cry', max: 5, type: 'active', target: 'self', icon: '#d05040', glyph: '!',
    sp: () => 15, delay: 1000, aggro: 6, selfFx: 'shout',
    buff: { dur: lv => 20 + 5 * lv, stats: lv => ({ def: 4 * lv, mdef: 2 * lv }) },
    desc: 'คำรามท้าทาย ดึงมอนสเตอร์รอบตัว 6 ช่องเข้าหา และเพิ่ม DEF +4×Lv' },
  whirlwind: { name: 'Whirlwind', max: 5, type: 'active', target: 'self', icon: '#e0e0f0', glyph: '✺',
    sp: lv => 18 + 2 * lv, delay: 1200, selfFx: 'whirl',
    dmg: { type: 'phys', mult: lv => 1.0 + 0.2 * lv, area: 2, at: 'self', knockback: 1 },
    desc: 'หมุนตัวฟันทุกตัวรอบกาย 2 ช่อง 120~200% และผลักถอย' },

  // ===== Rune Caster =====
  rune_mastery: { name: 'Rune Mastery', max: 5, type: 'passive', icon: '#6aa0ff', glyph: 'ᚱ',
    passive: lv => ({ matkPct: 5 * lv, castPct: 6 * lv }),
    desc: 'ชำนาญรูน MATK +5% และลดเวลาร่าย 6% ต่อเลเวล' },
  fire_rune: { name: 'Fire Rune', max: 5, type: 'active', target: 'enemy', range: 9, icon: '#f05a28', glyph: 'ᚲ',
    sp: lv => 10 + 3 * lv, cast: lv => 700 + 100 * lv, delay: 700, fx: 'firebolt',
    dmg: { type: 'magic', element: 'fire', mult: lv => 1.3 + 0.3 * lv, status: { kind: 'burn', chance: () => 100, dur: lv => 2 + lv } },
    desc: 'รูนเพลิง 160~280% MATK ธาตุไฟ และเผาไหม้ต่อเนื่อง' },
  ice_rune: { name: 'Ice Rune', max: 5, type: 'active', target: 'enemy', range: 9, icon: '#50b8f0', glyph: 'ᛁ',
    sp: lv => 10 + 3 * lv, cast: lv => 600 + 100 * lv, delay: 700, fx: 'coldbolt',
    dmg: { type: 'magic', element: 'water', mult: lv => 1.1 + 0.25 * lv, status: { kind: 'slow', chance: () => 100, dur: lv => 3 + lv } },
    desc: 'หอกน้ำแข็ง 135~235% MATK ธาตุน้ำ และทำให้ศัตรูช้าลงครึ่งหนึ่ง' },
  thunder_rune: { name: 'Thunder Rune', max: 5, type: 'active', target: 'enemy', range: 9, icon: '#e8e050', glyph: 'ᚦ',
    sp: lv => 22 + 5 * lv, cast: lv => 1300 + 100 * lv, delay: 1500, fx: 'lightning',
    dmg: { type: 'magic', element: 'wind', mult: lv => 0.9 + 0.2 * lv, area: 2, at: 'target' },
    desc: 'สายฟ้าแห่งธอร์ ฟาดทุกตัวในรัศมี 2 ช่องรอบเป้าหมาย 110~190% ธาตุลม' },

  // ===== Wildhunter =====
  eagle_eye: { name: 'Eagle Eye', max: 5, type: 'passive', icon: '#a07a50', glyph: '◉',
    passive: lv => ({ range: lv, hit: 3 * lv, dex: lv }),
    desc: 'ตาเหยี่ยว ระยะธนู +1 ช่อง, HIT +3, DEX +1 ต่อเลเวล' },
  piercing_arrow: { name: 'Piercing Arrow', max: 5, type: 'active', target: 'enemy', bow: true, icon: '#d0a050', glyph: '➳',
    sp: () => 12, delay: 600, chain: true, fx: 'arrow',
    dmg: { type: 'phys', mult: lv => 1.2 + 0.2 * lv, line: true },
    desc: 'ยิงธนูทะลุทุกตัวในแนวเส้นตรง 140~220% (ต้องใช้ธนู)' },
  wolf_companion: { name: 'Wolf Companion', max: 5, type: 'active', target: 'self', icon: '#b0b0c0', glyph: '🐺',
    sp: () => 40, delay: 2000, special: 'summon_wolf', dur: lv => 20 + 10 * lv,
    desc: 'เรียกหมาป่าคู่ใจมาช่วยสู้ 30~70 วินาที ความแรงตามเลเวลสกิลและ ATK' },
  blast_trap: { name: 'Blast Trap', max: 5, type: 'active', target: 'self', icon: '#e08030', glyph: '✱',
    sp: () => 10, delay: 500, special: 'trap',
    desc: 'วางกับดักระเบิดที่เท้า (สูงสุด 3 อัน) ระเบิดไฟรัศมี 1.5 ช่อง แรงตาม DEX' },

  // ===== Völva =====
  sanctuary: { name: 'Sanctuary', max: 5, type: 'passive', icon: '#a0f0b0', glyph: '✥',
    passive: lv => ({ regenPct: 1 + 0.5 * lv, mdef: lv }),
    desc: 'แสงคุ้มครอง ฟื้นฟู HP เพิ่ม 1.5~3.5% ของ MaxHP ทุกรอบ, MDEF +1 ต่อเลเวล' },
  light_of_freyja: { name: 'Light of Freyja', max: 5, type: 'active', target: 'self', icon: '#70e070', glyph: '✚',
    sp: lv => 10 + 4 * lv, delay: 1000, selfFx: 'heal',
    heal: (lv, d, p) => Math.floor((4 + (p.baseLv + d.int) / 8) * (10 + 14 * lv)),
    desc: 'แสงของเทพีเฟรยา ฟื้นฟู HP ตาม Base Lv และ INT (คลิกมอนสเตอร์อมตะเพื่อทำร้าย)' },
  blessing_of_odin: { name: 'Blessing of Odin', max: 5, type: 'active', target: 'self', icon: '#f0d060', glyph: '☼',
    sp: lv => 20 + 4 * lv, delay: 1000, selfFx: 'buff',
    buff: { dur: lv => 60 + 30 * lv, stats: lv => ({ str: 2 * lv, int: 2 * lv, dex: 2 * lv }) },
    desc: 'พรแห่งโอดิน STR, INT, DEX +2×Lv นาน 90~210 วินาที' },
  holy_spear: { name: 'Holy Spear', max: 5, type: 'active', target: 'enemy', range: 9, icon: '#fff6c0', glyph: '✧',
    sp: lv => 12 + 3 * lv, cast: () => 1000, delay: 800, fx: 'holy',
    dmg: { type: 'magic', element: 'holy', mult: lv => 1.3 + 0.3 * lv },
    desc: 'หอกแสงศักดิ์สิทธิ์ 160~280% MATK รุนแรงมากกับอมตะ' },

  // ===== Loki's Trickster =====
  shadow_step: { name: 'Shadow Step', max: 5, type: 'passive', icon: '#90e0b0', glyph: '↯',
    passive: lv => ({ flee: 4 * lv, crit: 2 * lv }),
    desc: 'ก้าวเงา FLEE +4 และ CRIT +2 ต่อเลเวล' },
  backstab: { name: 'Backstab', max: 5, type: 'active', target: 'enemy', melee: true, icon: '#c05070', glyph: '†',
    sp: () => 15, delay: 900, chain: true, fx: 'slash',
    dmg: { type: 'phys', mult: lv => 2.0 + 0.5 * lv, multAware: lv => 1.2 + 0.2 * lv, sureHit: true },
    desc: 'แทงข้างหลัง 250~450% ถ้าศัตรูยังไม่ได้สู้กับคุณ (ถ้ากำลังสู้อยู่ 140~220%) ไม่มีพลาด' },
  smoke_veil: { name: 'Smoke Veil', max: 5, type: 'active', target: 'self', icon: '#8080a0', glyph: '☁',
    sp: () => 20, delay: 1500, special: 'stealth', dur: lv => 3 + lv,
    desc: 'หายตัวในม่านควัน 4~8 วินาที มอนสเตอร์ลืมคุณ และการโจมตีแรกจะคริติคอลแน่นอน' },
  venom_blade: { name: 'Venom Blade', max: 5, type: 'active', target: 'self', icon: '#70c040', glyph: '☠',
    sp: () => 20, delay: 1000, selfFx: 'buff',
    buff: { dur: lv => 30 + 10 * lv, stats: lv => ({ atk: 5 * lv, venom: 10 + 5 * lv }) },
    desc: 'อาบพิษบนอาวุธ ATK +5×Lv และโอกาสทำให้ติดพิษทุกครั้งที่โจมตี' },

  // ===== Berserker =====
  wolf_blood: { name: 'Wolf Blood', max: 5, type: 'passive', icon: '#c04040', glyph: 'ᚹ',
    passive: lv => ({ rage: 10 * lv, hpPct: 2 * lv }),
    desc: 'เลือดหมาป่า ยิ่ง HP น้อยยิ่งตีแรง (สูงสุด +10%×Lv เมื่อใกล้ตาย), MaxHP +2%×Lv' },
  rage_strike: { name: 'Rage Strike', max: 5, type: 'active', target: 'enemy', melee: true, icon: '#e04020', glyph: '⚡',
    sp: () => 5, hpCost: () => 5, delay: 600, chain: true, fx: 'bash',
    dmg: { type: 'phys', mult: lv => 1.6 + 0.3 * lv },
    desc: 'ฟาดสุดแรง 190~310% โดยแลกกับ HP 5% ของ HP ปัจจุบัน' },
  blood_frenzy: { name: 'Blood Frenzy', max: 5, type: 'active', target: 'self', icon: '#b02030', glyph: '♨',
    sp: () => 10, hpCost: () => 10, delay: 1000, selfFx: 'buff',
    buff: { dur: lv => 30 + 10 * lv, stats: lv => ({ aspdPct: 5 + 3 * lv, atk: 5 * lv }) },
    desc: 'คลั่งเลือด เสีย HP 10% แลกกับความเร็วโจมตี +8~20% และ ATK +5×Lv' },
  howl: { name: 'Howl', max: 5, type: 'active', target: 'self', icon: '#d0c0a0', glyph: 'ᚺ',
    sp: () => 20, delay: 1500, selfFx: 'howl',
    dmg: { type: 'phys', mult: lv => 1.0 + 0.15 * lv, area: 2.5, at: 'self', status: { kind: 'stun', chance: () => 70, dur: lv => 1 + 0.5 * lv } },
    desc: 'หอนสะท้านป่า ทำร้ายรอบตัว 2.5 ช่อง 115~175% และทำให้ศัตรูหวาดกลัว (มึน)' },
};

// ------------------------------------------------------------
//  ไอเทม
//  type: use | etc | weapon | armor | card
//  slot (อุปกรณ์): weapon head armor shield garment shoes acc
// ------------------------------------------------------------
const J = {
  dagger: ['novice', 'einherjar', 'runecaster', 'wildhunter', 'trickster', 'berserker'],
  sword: ['novice', 'einherjar', 'trickster', 'berserker'],
  axe: ['novice', 'einherjar', 'berserker'],
  rod: ['novice', 'runecaster', 'volva'],
  bow: ['wildhunter', 'trickster'],
  mace: ['novice', 'einherjar', 'volva', 'berserker'],
  heavy: ['einherjar', 'berserker', 'volva'],
  light: ['novice', 'einherjar', 'wildhunter', 'volva', 'trickster', 'berserker'],
};
const ITEMS = {
  // --- ของใช้ ---
  red_potion:    { name: 'Repair Kit S',    type: 'use', price: 50,   heal: [45, 65],   icon: { s: 'potion', c: '#e03030' }, desc: 'ชุดซ่อมขนาดเล็ก ฟื้นฟู HP 45~65' },
  orange_potion: { name: 'Repair Kit M', type: 'use', price: 200,  heal: [105, 145], icon: { s: 'potion', c: '#f08020' }, desc: 'ชุดซ่อมขนาดกลาง ฟื้นฟู HP 105~145' },
  yellow_potion: { name: 'Repair Kit L', type: 'use', price: 550,  heal: [175, 235], icon: { s: 'potion', c: '#e8d020' }, desc: 'ชุดซ่อมขนาดใหญ่ ฟื้นฟู HP 175~235' },
  white_potion:  { name: 'Repair Kit XL',  type: 'use', price: 1200, heal: [325, 405], icon: { s: 'potion', c: '#f4f4f4' }, desc: 'ชุดซ่อมพิเศษ ฟื้นฟู HP 325~405' },
  blue_potion:   { name: 'Energy Cell',   type: 'use', price: 2500, spHeal: [40, 60], icon: { s: 'potion', c: '#3060e0' }, desc: 'เซลล์พลังงาน ฟื้นฟู SP 40~60' },
  apple:         { name: 'Oil Can',         type: 'use', price: 15,   heal: [16, 22],   icon: { s: 'jar', c: '#6a7080' }, desc: 'น้ำมันหล่อลื่นข้อต่อ ฟื้นฟู HP 16~22' },
  carrot:        { name: 'Coolant',        type: 'use', price: 15,   heal: [18, 24],   icon: { s: 'potion', c: '#50c0e0' }, desc: 'น้ำยาหล่อเย็น ฟื้นฟู HP 18~24' },
  meat:          { name: 'Nano Paste',    type: 'use', price: 50,   heal: [70, 100],  icon: { s: 'jar', c: '#a0a8b8' }, desc: 'นาโนเพสต์ซ่อมโครงสร้าง ฟื้นฟู HP 70~100' },
  grape:         { name: 'Charge Chip',         type: 'use', price: 200,  spHeal: [10, 15], icon: { s: 'card', c: '#60d0ff' }, desc: 'ชิปชาร์จไฟ ฟื้นฟู SP 10~15' },
  green_herb:    { name: 'Antivirus Patch',    type: 'use', price: 10,   heal: [12, 18], cure: true, icon: { s: 'card', c: '#50e070' }, desc: 'แพตช์แอนตี้ไวรัส ฟื้นฟู HP 12~18 และล้างไวรัส (พิษ)' },
  red_herb:      { name: 'Patch Tape',      type: 'use', price: 18,   heal: [18, 28],   icon: { s: 'cloth', c: '#d0d4dc' }, desc: 'เทปซ่อมด่วน ฟื้นฟู HP 18~28' },
  mead:          { name: 'Overclock Brew',    type: 'use', price: 500,  heal: [70, 100], spHeal: [20, 40], icon: { s: 'jar', c: '#f0b020' }, desc: 'สารโอเวอร์คล็อก ฟื้นฟู HP 70~100 และ SP 20~40' },
  blink_feather: { name: 'Blink Chip', type: 'use', price: 60,   effect: 'fly',    icon: { s: 'card', c: '#8fd0f0' }, desc: 'ชิปวาร์ป เคลื่อนย้ายไปจุดสุ่มในแผนที่ปัจจุบัน' },
  hearth_rune:   { name: 'Return Beacon',   type: 'use', price: 300,  effect: 'return', icon: { s: 'gem', c: '#60e0ff' }, desc: 'บีคอนกลับฐาน วาร์ปกลับจุดเซฟ' },

  // --- ของดรอป (ขายได้) ---
  jelly_drop:      { name: 'Gel Cell',      type: 'etc', price: 6,    icon: { s: 'blob', c: '#e8b0d0' }, desc: 'เซลล์เจลจากโดรน' },
  leaf_silk:       { name: 'Copper Wire',       type: 'etc', price: 8,    icon: { s: 'blob', c: '#e4f4c8' }, desc: 'ขดลวดทองแดง' },
  clover:          { name: 'Micro Chip',          type: 'etc', price: 6,    icon: { s: 'card', c: '#50c050' }, desc: 'ไมโครชิปขนาดจิ๋ว' },
  moon_fur:        { name: 'Silver Mesh',        type: 'etc', price: 8,    icon: { s: 'feather', c: '#f0f0ff' }, desc: 'ตาข่ายเงินจากหุ่นกระต่าย' },
  buzz_wing:       { name: 'Rotor Blade',       type: 'etc', price: 14,   icon: { s: 'shell', c: '#c0d8e0' }, desc: 'ใบพัดโดรน' },
  ember_jelly:     { name: 'Heat Sink',     type: 'etc', price: 10,   icon: { s: 'blob', c: '#f5a442' }, desc: 'แผ่นระบายความร้อน' },
  moss_gel:        { name: 'Bio Gel',        type: 'etc', price: 16,   icon: { s: 'blob', c: '#90d060' }, desc: 'เจลชีวภาพเหนียว ๆ' },
  hopper_leg:      { name: 'Spring Coil',      type: 'etc', price: 24,   icon: { s: 'bone', c: '#80b040' }, desc: 'สปริงขาหุ่นตั๊กแตน' },
  living_bark:     { name: 'Scrap Plate',     type: 'etc', price: 12,   icon: { s: 'bone', c: '#8a6038' }, desc: 'แผ่นเหล็กขึ้นสนิม' },
  cap_spore:       { name: 'Detonator',       type: 'etc', price: 16,   icon: { s: 'blob', c: '#d05050' }, desc: 'ตัวจุดระเบิด' },
  ash_tail:        { name: 'Ash Filter',        type: 'etc', price: 44,   icon: { s: 'feather', c: '#909090' }, desc: 'ไส้กรองเถ้า' },
  fenrir_fang:     { name: 'Fenrir Fang',     type: 'etc', price: 60,   icon: { s: 'claw', c: '#e0e0e0' }, desc: 'เขี้ยวโลหะของหน่วยเฟนริร์' },
  moss_hide:       { name: 'Plated Hide',       type: 'etc', price: 180,  icon: { s: 'cloth', c: '#5a7a3a' }, desc: 'เกราะแผ่นของหมีเหล็ก' },
  iron_tusk:       { name: 'Iron Tusk',       type: 'etc', price: 70,   icon: { s: 'claw', c: '#c8c8d0' }, desc: 'งาเหล็กของรถถังหมูป่า' },
  grave_dust:      { name: 'Rust Dust',      type: 'etc', price: 24,   icon: { s: 'blob', c: '#9a9a80' }, desc: 'ผงสนิมจากเดรากร์' },
  old_bone:        { name: 'Old Frame',        type: 'etc', price: 72,   icon: { s: 'bone', c: '#f0ecd8' }, desc: 'โครงเหล็กเก่า' },
  hel_lantern:     { name: 'Soul Lantern',     type: 'etc', price: 180,  icon: { s: 'jar', c: '#60c0a0' }, desc: 'ตะเกียงวิญญาณดิจิทัล' },
  cursed_seal:     { name: 'Cursed Chip',     type: 'etc', price: 240,  icon: { s: 'ring', c: '#a040c0' }, desc: 'ชิปต้องคำสาป' },
  yggdrasil_shard: { name: 'Yggdrasil Core', type: 'etc', price: 20000, icon: { s: 'gem', c: '#60f0a0' }, desc: 'แกนพลังงานต้นไม้โลก ล้ำค่าที่สุดในนีโอมิดการ์ด' },

  // --- อาวุธ ---
  knife:        { name: 'Knife',        type: 'weapon', slot: 'weapon', wtype: 'dagger', atk: 17, price: 50,    slots: 3, jobs: J.dagger, icon: { s: 'dagger', c: '#c8c8d0' }, desc: 'มีดสั้นธรรมดา' },
  cutter:       { name: 'Cutter',       type: 'weapon', slot: 'weapon', wtype: 'dagger', atk: 30, price: 1250,  slots: 3, jobs: J.dagger, icon: { s: 'dagger', c: '#d0d8e0' }, desc: 'มีดคัตเตอร์คมกริบ' },
  main_gauche:  { name: 'Main Gauche',  type: 'weapon', slot: 'weapon', wtype: 'dagger', atk: 43, price: 2400,  slots: 3, jobs: J.dagger, icon: { s: 'dagger', c: '#e0e0f0' }, desc: 'มีดคู่มือซ้าย' },
  stiletto:     { name: 'Stiletto',     type: 'weapon', slot: 'weapon', wtype: 'dagger', atk: 60, price: 7500,  slots: 2, lv: 12, jobs: J.dagger, icon: { s: 'dagger', c: '#a0c0f0' }, desc: 'มีดเรียวยาว' },
  loki_fang:    { name: "Loki's Fang",  type: 'weapon', slot: 'weapon', wtype: 'dagger', atk: 105, price: 26000, slots: 1, lv: 30, jobs: ['trickster'], icon: { s: 'dagger', c: '#7ad04a' }, b: { luk: 3 }, desc: 'เขี้ยวแห่งโลกิ LUK +3 (นักลวงเท่านั้น)' },
  sword:        { name: 'Sword',        type: 'weapon', slot: 'weapon', wtype: 'sword', atk: 25, price: 100,    slots: 3, jobs: J.sword, icon: { s: 'sword', c: '#c8c8d0' }, desc: 'ดาบมือเดียวพื้นฐาน' },
  falchion:     { name: 'Falchion',     type: 'weapon', slot: 'weapon', wtype: 'sword', atk: 49, price: 1500,   slots: 3, jobs: J.sword, icon: { s: 'sword', c: '#d8d8e8' }, desc: 'ดาบโค้ง' },
  broadsword:   { name: 'Broadsword',   type: 'weapon', slot: 'weapon', wtype: 'sword', atk: 62, price: 3200,   slots: 3, jobs: J.sword, icon: { s: 'sword', c: '#e8e8f8' }, desc: 'ดาบใบกว้าง' },
  valhalla_blade: { name: 'Valhalla Blade', type: 'weapon', slot: 'weapon', wtype: 'sword', atk: 130, price: 32000, slots: 1, lv: 30, jobs: ['einherjar'], icon: { s: 'sword', c: '#f0e0a0' }, b: { vit: 2 }, desc: 'ดาบแห่งวัลฮัลลา VIT +2 (นักรบวิญญาณเท่านั้น)' },
  hand_axe:     { name: 'Hand Axe',     type: 'weapon', slot: 'weapon', wtype: 'axe', atk: 32, price: 300,      slots: 3, jobs: J.axe, icon: { s: 'axe', c: '#b8b8c4' }, desc: 'ขวานมือเดียว' },
  cleaver:      { name: 'Cleaver Axe',  type: 'weapon', slot: 'weapon', wtype: 'axe', atk: 50, price: 1800,     slots: 3, jobs: J.axe, icon: { s: 'axe', c: '#c8b8a8' }, desc: 'ขวานผ่าเหล็ก ATK 50' },
  battle_axe:   { name: 'Battle Axe',   type: 'weapon', slot: 'weapon', wtype: 'axe', atk: 72, price: 5500,     slots: 2, lv: 15, jobs: J.axe, icon: { s: 'axe', c: '#d0d0dc' }, desc: 'ขวานศึก' },
  ulfr_axe:     { name: 'Úlfr Axe',     type: 'weapon', slot: 'weapon', wtype: 'axe', atk: 145, price: 34000,   slots: 1, lv: 30, jobs: ['berserker'], icon: { s: 'axe', c: '#e04040' }, b: { str: 3 }, desc: 'ขวานหมาป่า STR +3 (นักรบคลั่งเท่านั้น)' },
  rod:          { name: 'Energy Rod',          type: 'weapon', slot: 'weapon', wtype: 'rod', atk: 15, matk: 15, price: 50,     slots: 3, jobs: J.rod, icon: { s: 'rod', c: '#a07040' }, desc: 'คทาพลังงาน MATK +15' },
  arc_wand:     { name: 'Arc Wand',     type: 'weapon', slot: 'weapon', wtype: 'rod', atk: 20, matk: 26, price: 900,    slots: 3, jobs: J.rod, icon: { s: 'rod', c: '#70b0d8' }, desc: 'คทาอาร์กไฟฟ้า MATK +26' },
  rune_staff:   { name: 'Rune Staff',   type: 'weapon', slot: 'weapon', wtype: 'rod', atk: 25, matk: 40, price: 2500,   slots: 2, lv: 12, jobs: J.rod, icon: { s: 'rod', c: '#50a0e0' }, b: { int: 1 }, desc: 'คทาจารึกรูน MATK +40 INT +1' },
  seer_staff:   { name: "Seer's Staff", type: 'weapon', slot: 'weapon', wtype: 'rod', atk: 60, matk: 80, price: 14000,  slots: 1, lv: 24, jobs: ['runecaster', 'volva'], icon: { s: 'rod', c: '#e050e0' }, b: { int: 3 }, desc: 'คทาผู้หยั่งรู้ MATK +80 INT +3' },
  bow:          { name: 'Bow',          type: 'weapon', slot: 'weapon', wtype: 'bow', atk: 15, price: 1000,    slots: 3, jobs: J.bow, icon: { s: 'bow', c: '#a07040' }, desc: 'ธนูไม้' },
  composite_bow:{ name: 'Composite Bow',type: 'weapon', slot: 'weapon', wtype: 'bow', atk: 32, price: 2500,    slots: 3, jobs: J.bow, icon: { s: 'bow', c: '#c08040' }, desc: 'ธนูผสม' },
  great_bow:    { name: 'Great Bow',    type: 'weapon', slot: 'weapon', wtype: 'bow', atk: 55, price: 10000,   slots: 2, lv: 18, jobs: ['wildhunter'], icon: { s: 'bow', c: '#6a4a2a' }, desc: 'ธนูใหญ่ (นักล่าเท่านั้น)' },
  ullr_bow:     { name: "Ullr's Bow",   type: 'weapon', slot: 'weapon', wtype: 'bow', atk: 125, price: 34000,  slots: 1, lv: 30, jobs: ['wildhunter'], icon: { s: 'bow', c: '#308040' }, b: { dex: 3 }, desc: 'ธนูแห่งอุลล์ เทพนักล่า DEX +3' },
  club:         { name: 'Club',         type: 'weapon', slot: 'weapon', wtype: 'mace', atk: 23, price: 60,     slots: 3, jobs: J.mace, icon: { s: 'mace', c: '#8a6038' }, desc: 'กระบองไม้' },
  mace:         { name: 'Mace',         type: 'weapon', slot: 'weapon', wtype: 'mace', atk: 40, price: 800,    slots: 3, jobs: J.mace, icon: { s: 'mace', c: '#a0a0b0' }, desc: 'คทาเหล็ก' },
  flail:        { name: 'Flail',        type: 'weapon', slot: 'weapon', wtype: 'mace', atk: 60, price: 4000,   slots: 2, lv: 12, jobs: J.mace, icon: { s: 'mace', c: '#b8b8c8' }, desc: 'ลูกตุ้มโซ่ ATK 60' },
  morning_star: { name: 'Morning Star', type: 'weapon', slot: 'weapon', wtype: 'mace', atk: 90, price: 12000,  slots: 1, lv: 20, jobs: J.mace, icon: { s: 'mace', c: '#d0d0e0' }, desc: 'กระบองหนามดาว' },
  emberfang:    { name: 'Emberfang',    type: 'weapon', slot: 'weapon', wtype: 'dagger', atk: 70, matk: 40, price: 60000, slots: 0, lv: 25, jobs: J.dagger, icon: { s: 'dagger', c: '#f0a040' },
    b: { sp: 60, int: 2, agi: 2 }, desc: '[MVP] เขี้ยวเพลิง MATK +40, INT +2, AGI +2, MaxSP +60' },

  // --- ชุดเกราะ / สวมใส่ ---
  cotton_shirt: { name: 'Basic Plating', type: 'armor', slot: 'armor', def: 1, price: 10,   slots: 1, jobs: 'all', icon: { s: 'armor', c: '#e8e0c8' }, desc: 'เกราะพื้นฐาน DEF 1' },
  padded_plate: { name: 'Padded Plating', type: 'armor', slot: 'armor', def: 2, price: 400, slots: 1, jobs: 'all', icon: { s: 'armor', c: '#c8c0a8' }, desc: 'เกราะบุนวม DEF 2' },
  leather_vest: { name: 'Light Plating', type: 'armor', slot: 'armor', def: 4, price: 1500, slots: 1, jobs: J.light, icon: { s: 'armor', c: '#b09060' }, desc: 'เกราะเบา DEF 4' },
  silk_robe:    { name: 'Nano Robe',    type: 'armor', slot: 'armor', def: 3, mdef: 10, price: 3000, slots: 1, jobs: 'all', icon: { s: 'armor', c: '#a080d0' }, b: { int: 1 }, desc: 'เสื้อคลุมนาโน DEF 3 MDEF 10 INT +1' },
  chain_mail:   { name: 'Mesh Armor',   type: 'armor', slot: 'armor', def: 8, price: 9000, slots: 1, lv: 20, jobs: J.heavy, icon: { s: 'armor', c: '#a0a8b8' }, desc: 'เกราะตาข่ายโลหะ DEF 8' },
  plate_armor:  { name: 'Titan Plate',  type: 'armor', slot: 'armor', def: 12, price: 30000, slots: 1, lv: 35, jobs: ['einherjar'], icon: { s: 'armor', c: '#d0d8e8' }, desc: 'เกราะไทเทเนียม DEF 12 (นักรบวิญญาณเท่านั้น)' },
  hat:          { name: 'Sensor Cap',          type: 'armor', slot: 'head', def: 2, price: 1000,  slots: 0, jobs: 'all', icon: { s: 'hat', c: '#8a6a4a' }, desc: 'หมวกเซ็นเซอร์ DEF 2' },
  ribbon:       { name: 'Signal Ribbon',       type: 'armor', slot: 'head', def: 1, mdef: 3, price: 800, slots: 0, jobs: 'all', icon: { s: 'ribbon', c: '#e04070' }, b: { int: 1 }, desc: 'ริบบิ้นสัญญาณ DEF 1 MDEF 3 INT +1' },
  iron_helm:    { name: 'Iron Helm',    type: 'armor', slot: 'head', def: 4, price: 6000, slots: 1, lv: 12, jobs: J.light, icon: { s: 'hat', c: '#8090a0' }, desc: 'หมวกเหล็ก DEF 4' },
  seraph_wings: { name: 'Seraph Wings', type: 'armor', slot: 'head', def: 3, mdef: 5, price: 50000, slots: 0, jobs: 'all', icon: { s: 'wing', c: '#ffffff' }, b: { int: 2, luk: 2, agi: 1 }, desc: '[MVP] ปีกเทวดา DEF 3 MDEF 5 INT +2 LUK +2 AGI +1' },
  guard:        { name: 'Guard',        type: 'armor', slot: 'shield', def: 3, price: 500,  slots: 1, jobs: 'all', icon: { s: 'shield', c: '#a07040' }, desc: 'โล่ไม้ DEF 3 (ใช้กับธนูไม่ได้)' },
  round_shield: { name: 'Energy Buckler', type: 'armor', slot: 'shield', def: 5, price: 6000, slots: 1, lv: 14, jobs: J.heavy, icon: { s: 'shield', c: '#b0b8c8' }, desc: 'โล่พลังงาน DEF 5' },
  hood:         { name: 'Hood',         type: 'armor', slot: 'garment', def: 1, price: 120, slots: 1, jobs: 'all', icon: { s: 'cloth', c: '#6a8a5a' }, desc: 'ฮู้ด DEF 1' },
  thermal_cloak:{ name: 'Thermal Cloak', type: 'armor', slot: 'garment', def: 1, price: 1200, slots: 1, jobs: 'all', icon: { s: 'cloth', c: '#5a7a9a' }, b: { flee: 3 }, desc: 'ผ้าคลุมกันความร้อน DEF 1 FLEE +3' },
  muffler:      { name: 'Cable Scarf',      type: 'armor', slot: 'garment', def: 2, price: 5000, slots: 1, jobs: 'all', icon: { s: 'cloth', c: '#c04040' }, desc: 'ผ้าพันคอเคเบิล DEF 2' },
  sandals:      { name: 'Hover Pads',      type: 'armor', slot: 'shoes', def: 1, price: 400,  slots: 1, jobs: 'all', icon: { s: 'shoes', c: '#b08050' }, desc: 'แผ่นลอยตัว DEF 1' },
  shoes:        { name: 'Servo Boots',        type: 'armor', slot: 'shoes', def: 2, price: 3500, slots: 1, jobs: 'all', icon: { s: 'shoes', c: '#6a4a3a' }, desc: 'รองเท้าเซอร์โว DEF 2' },
  boots:        { name: 'Mag Boots',        type: 'armor', slot: 'shoes', def: 4, price: 18000, slots: 1, lv: 20, jobs: 'all', icon: { s: 'shoes', c: '#4a3a2a' }, desc: 'รองเท้าแม่เหล็ก DEF 4' },
  clip:         { name: 'Clip',         type: 'armor', slot: 'acc', price: 5000, slots: 1, jobs: 'all', icon: { s: 'ring', c: '#c0c0c0' }, b: { sp: 10 }, desc: 'กิ๊บติดผม MaxSP +10 (มีช่องการ์ด)' },
  data_band:    { name: 'Data Band',    type: 'armor', slot: 'acc', price: 1500, slots: 0, jobs: 'all', icon: { s: 'ring', c: '#60c0e0' }, b: { vit: 1, hp: 40 }, desc: 'สายรัดข้อมูล VIT +1 HP +40' },
  ring:         { name: 'Power Ring',         type: 'armor', slot: 'acc', price: 20000, slots: 0, jobs: 'all', icon: { s: 'ring', c: '#e0b040' }, b: { str: 2 }, desc: 'แหวนพลัง STR +2' },
  earring:      { name: 'Signal Earring',      type: 'armor', slot: 'acc', price: 20000, slots: 0, jobs: 'all', icon: { s: 'ring', c: '#60c0e0' }, b: { int: 2 }, desc: 'ต่างหูรับสัญญาณ INT +2' },
  glove:        { name: 'Grip Glove',        type: 'armor', slot: 'acc', price: 20000, slots: 0, jobs: 'all', icon: { s: 'ring', c: '#a06040' }, b: { dex: 2 }, desc: 'ถุงมือยึดเกาะ DEX +2' },
  rune_charm:   { name: 'Rune Charm',   type: 'armor', slot: 'acc', price: 20000, slots: 0, jobs: 'all', icon: { s: 'ring', c: '#f0f0f0' }, b: { luk: 2, mdef: 3 }, desc: 'เครื่องรางรูน LUK +2 MDEF 3' },

  // --- การ์ด ---
  pudding_card:    { name: 'Gel Unit Chip',    type: 'card', slot: 'armor',   price: 20, b: { luk: 2, flee: 1 }, icon: { s: 'card', c: '#f0a0c0' }, desc: 'ชิปเสริม — ใส่ชุดเกราะ: LUK +2, FLEE +1' },
  leafworm_card:   { name: 'Crawler Chip',   type: 'card', slot: 'armor',   price: 20, b: { vit: 1, hp: 100 }, icon: { s: 'card', c: '#90d060' }, desc: 'ชิปเสริม — ใส่ชุดเกราะ: VIT +1, MaxHP +100' },
  moonbun_card:    { name: 'Bunny Unit Chip',    type: 'card', slot: 'garment', price: 20, b: { luk: 1, crit: 1 }, icon: { s: 'card', c: '#f0f0f0' }, desc: 'ชิปเสริม — ใส่ผ้าคลุม: LUK +1, CRIT +1' },
  ember_card:      { name: 'Ember Unit Chip', type: 'card', slot: 'acc',  price: 20, b: { dex: 1, hit: 3 }, icon: { s: 'card', c: '#f0a040' }, desc: 'ชิปเสริม — ใส่เครื่องประดับ: DEX +1, HIT +3' },
  buzzfly_card:    { name: 'Buzz Unit Chip',    type: 'card', slot: 'garment', price: 20, b: { agi: 1, flee: 2 }, icon: { s: 'card', c: '#e0d040' }, desc: 'ชิปเสริม — ใส่ผ้าคลุม: AGI +1, FLEE +2' },
  hopper_card:     { name: 'Hopper Unit Chip', type: 'card', slot: 'acc',   price: 20, b: { dex: 1, atk: 5 }, icon: { s: 'card', c: '#80c040' }, desc: 'ชิปเสริม — ใส่เครื่องประดับ: DEX +1, ATK +5' },
  stumpling_card:  { name: 'Rust Sentry Chip',  type: 'card', slot: 'armor',   price: 20, b: { sp: 80 }, icon: { s: 'card', c: '#a07040' }, desc: 'ชิปเสริม — ใส่ชุดเกราะ: MaxSP +80' },
  capshroom_card:  { name: 'Mine Unit Chip',  type: 'card', slot: 'head',    price: 20, b: { vit: 2 }, icon: { s: 'card', c: '#e05050' }, desc: 'ชิปเสริม — ใส่หมวก: VIT +2' },
  mosspud_card:    { name: 'Moss Unit Chip', type: 'card', slot: 'weapon', price: 20, b: { atk: 10, luk: 1 }, icon: { s: 'card', c: '#80d080' }, desc: 'ชิปเสริม — ใส่อาวุธ: ATK +10, LUK +1' },
  ashtail_card:    { name: 'Ash Stalker Chip',    type: 'card', slot: 'garment', price: 20, b: { agi: 2, flee: 3 }, icon: { s: 'card', c: '#909090' }, desc: 'ชิปเสริม — ใส่ผ้าคลุม: AGI +2, FLEE +3' },
  fenrir_card:     { name: 'Fenrir Unit Chip', type: 'card', slot: 'weapon',  price: 20, b: { crit: 8 }, icon: { s: 'card', c: '#c0c0d0' }, desc: 'ชิปเสริม — ใส่อาวุธ: CRIT +8' },
  bear_card:       { name: 'Iron Brute Chip',   type: 'card', slot: 'shield',  price: 20, b: { vit: 1, def: 2 }, icon: { s: 'card', c: '#5a7a3a' }, desc: 'ชิปเสริม — ใส่โล่: VIT +1, DEF +2' },
  boar_card:       { name: 'Tusk Trooper Chip',   type: 'card', slot: 'armor',   price: 20, b: { vit: 3 }, icon: { s: 'card', c: '#6a4020' }, desc: 'ชิปเสริม — ใส่ชุดเกราะ: VIT +3' },
  draugr_card:     { name: 'Draugr Husk Chip',     type: 'card', slot: 'shield',  price: 20, b: { hp: 200 }, icon: { s: 'card', c: '#709070' }, desc: 'ชิปเสริม — ใส่โล่: MaxHP +200' },
  warden_card:     { name: 'Frame Warden Chip', type: 'card', slot: 'weapon', price: 20, b: { atk: 10, crit: 2 }, icon: { s: 'card', c: '#f0ecd8' }, desc: 'ชิปเสริม — ใส่อาวุธ: ATK +10, CRIT +2' },
  helmaiden_card:  { name: 'Hel Maiden Chip', type: 'card', slot: 'head',    price: 20, b: { int: 1, mdef: 5 }, icon: { s: 'card', c: '#4050a0' }, desc: 'ชิปเสริม — ใส่หมวก: INT +1, MDEF +5' },
  helguard_card:   { name: 'Hel Guard Chip',  type: 'card', slot: 'shoes',   price: 20, b: { vit: 1, hp: 150 }, icon: { s: 'card', c: '#303050' }, desc: 'ชิปเสริม — ใส่รองเท้า: VIT +1, MaxHP +150' },
  seraph_card:     { name: 'Seraph Core Chip', type: 'card', slot: 'armor', price: 20, b: { str: 2, agi: 2, vit: 2, int: 2, dex: 2, luk: 2 }, icon: { s: 'card', c: '#fff0a0' }, desc: '[MVP] ใส่ชุดเกราะ: สเตตัสทั้งหมด +2' },
  kitsura_card:    { name: 'Kitsura EX Chip',    type: 'card', slot: 'shoes',   price: 20, b: { agi: 3, sp: 50, flee: 5 }, icon: { s: 'card', c: '#f0c050' }, desc: '[MVP] ใส่รองเท้า: AGI +3, MaxSP +50, FLEE +5' },
};
for (const id in ITEMS) ITEMS[id].id = id;

const SLOT_THAI = { weapon: 'อาวุธ', head: 'หมวก', armor: 'ชุดเกราะ', shield: 'โล่', garment: 'ผ้าคลุม', shoes: 'รองเท้า', acc: 'เครื่องประดับ' };
const EQUIP_SLOTS = ['head', 'weapon', 'shield', 'armor', 'garment', 'shoes', 'acc'];

// ------------------------------------------------------------
//  มอนสเตอร์ (ออกแบบใหม่)
//  def = hard def (%)  vit = soft def   sprite = รูปแบบการวาด
//  zeny = [min, max] (ไม่ใส่ = คิดจากเลเวล ดู mobZeny ใน game.js)
//  ชิป (การ์ด) ของมอน = ITEMS[<id>_card] ได้แน่นอนเมื่อล่าครบ CHIP_KILLS ตัว (MVP: ตัวแรก) ไม่ต้องฟาร์มดรอป
//  stun = [โอกาส %, วินาที] ตีผู้เล่นแล้วมีโอกาสทำให้มึน (ล้มลงลุกไม่ได้ชั่วครู่)
// ------------------------------------------------------------
const MOBS = {
  // หุ่นฝึกซ้อมในเมือง (ทดสอบท่าโจมตี/ดาเมจ): ไม่ตาย ไม่เดิน ไม่ให้ EXP ตีกลับครั้งละ 1
  training_dummy: { name: 'Training Dummy', lv: 1, hp: 3000, atk: [1, 1], def: 0, mdef: 0, vit: 1, flee: 0, hit: 200, exp: 0, jexp: 0, speed: 0, aggro: false, element: 'neutral', race: 'formless',
               sprite: 'dummy', color: '#c8a060', drops: [], dummy: true, range: 1.6, atkDelay: 1.6 },
  pudding:   { name: 'Gel Unit',       lv: 1,  hp: 50,   atk: [7, 10],   def: 0,  mdef: 5,  vit: 1,  flee: 5,   hit: 8,   exp: 18,  jexp: 12, speed: 1.4, aggro: false, element: 'water', race: 'plant',
               sprite: 'poring', color: '#f28fb4', drops: [['jelly_drop', 0.7], ['apple', 0.15], ['red_potion', 0.04], ['knife', 0.01]] },
  leafworm:  { name: 'Crawler Unit',      lv: 2,  hp: 63,   atk: [8, 11],   def: 0,  mdef: 0,  vit: 2,  flee: 7,   hit: 10,  exp: 22,  jexp: 15, speed: 1.2, aggro: false, element: 'earth', race: 'insect',
               sprite: 'fabre', color: '#8fd35a', drops: [['leaf_silk', 0.65], ['clover', 0.1], ['green_herb', 0.2]] },
  moonbun:   { name: 'Bunny Unit',       lv: 3,  hp: 60,   atk: [9, 12],   def: 0,  mdef: 20, vit: 3,  flee: 12,  hit: 12,  exp: 26,  jexp: 18, speed: 2.0, aggro: false, element: 'neutral', race: 'brute',
               sprite: 'lunatic', color: '#fafafa', drops: [['moon_fur', 0.6], ['clover', 0.2], ['carrot', 0.3]] },
  ember_pudding: { name: 'Ember Unit', lv: 3, hp: 72, atk: [10, 13], def: 0,  mdef: 0,  vit: 3,  flee: 9,   hit: 12,  exp: 30,  jexp: 20, speed: 1.4, aggro: false, element: 'fire', race: 'plant',
               sprite: 'poring', color: '#f5a442', drops: [['ember_jelly', 0.5], ['orange_potion', 0.04], ['red_herb', 0.2]] },
  buzzfly:   { name: 'Buzz Unit',       lv: 4,  hp: 67,   atk: [10, 13],  def: 10, mdef: 0,  vit: 4,  flee: 20,  hit: 16,  exp: 35,  jexp: 24, speed: 2.4, aggro: true, element: 'wind', race: 'insect',
               sprite: 'chonchon', color: '#3a3a3a', drops: [['buzz_wing', 0.55], ['jelly_drop', 0.3], ['blink_feather', 0.05]] },

  stumpling: { name: 'Rust Sentry',     lv: 8,  hp: 170,  atk: [18, 22],  def: 35, mdef: 5,  vit: 8,  flee: 10,  hit: 20,  exp: 80,  jexp: 55, speed: 1.0, aggro: false, element: 'earth', race: 'plant',
               sprite: 'willow', color: '#8a6038', drops: [['living_bark', 0.6], ['leaf_silk', 0.3]] },
  fiddlehopper: { name: 'Hopper Unit', lv: 9, hp: 198, atk: [24, 29],  def: 5,  mdef: 10, vit: 10, flee: 22,  hit: 28,  exp: 90,  jexp: 60, speed: 1.6, aggro: false, element: 'earth', race: 'insect',
               sprite: 'rocker', color: '#7cb342', drops: [['hopper_leg', 0.55], ['green_herb', 0.2], ['cutter', 0.005]] },
  capshroom: { name: 'Mine Unit',     lv: 12, hp: 280,  atk: [28, 34],  def: 10, mdef: 10, vit: 12, flee: 20,  hit: 30,  exp: 130, jexp: 90, speed: 1.2, aggro: false, element: 'water', race: 'plant',
               sprite: 'spore', color: '#d8433a', drops: [['cap_spore', 0.6], ['red_herb', 0.3], ['hat', 0.01]] },
  moss_pudding: { name: 'Moss Unit', lv: 14, hp: 330, atk: [32, 40], def: 10, mdef: 10, vit: 14, flee: 24,  hit: 34,  exp: 160, jexp: 110, speed: 1.6, aggro: false, element: 'earth', race: 'plant',
               sprite: 'poring', color: '#7fcf6f', drops: [['moss_gel', 0.5], ['green_herb', 0.3], ['grape', 0.06]] },
  seraph_pudding: { name: 'Seraph Core', lv: 25, hp: 5500, atk: [90, 120], def: 30, mdef: 50, vit: 25, flee: 60, hit: 70, exp: 3500, jexp: 2400, speed: 1.8, aggro: true, stun: [12, 2], element: 'holy', race: 'angel',
               sprite: 'poring', color: '#fff3c4', scale: 2.0, boss: true, wings: true, respawn: 300000, bossSkill: 'heal',
               drops: [['seraph_wings', 0.35], ['white_potion', 0.6], ['blue_potion', 0.5], ['yggdrasil_shard', 0.1]] },

  ashtail:   { name: 'Ash Stalker',       lv: 18, hp: 600,  atk: [45, 58],  def: 10, mdef: 5,  vit: 18, flee: 45,  hit: 48,  exp: 300, jexp: 210, speed: 1.8, aggro: false, element: 'earth', race: 'brute',
               sprite: 'quad', variant: 'raccoon', color: '#8a8e98', color2: '#4e525c', size: 0.8, drops: [['ash_tail', 0.5], ['moon_fur', 0.3], ['muffler', 0.01]] },
  fenrir_pup:{ name: 'Fenrir Unit',    lv: 25, hp: 900,  atk: [60, 78],  def: 15, mdef: 0,  vit: 22, flee: 55,  hit: 60,  exp: 460, jexp: 320, speed: 2.4, aggro: true, element: 'earth', race: 'brute',
               sprite: 'quad', variant: 'wolf', color: '#b8c0cc', color2: '#5e6674', size: 1.0, drops: [['fenrir_fang', 0.6], ['meat', 0.3]] },
  mossback:  { name: 'Iron Brute', lv: 26, hp: 1150, atk: [65, 82],  def: 25, mdef: 5,  vit: 26, flee: 40,  hit: 55,  exp: 520, jexp: 350, speed: 1.3, aggro: false, stun: [10, 2], element: 'earth', race: 'brute',
               sprite: 'quad', variant: 'bear', color: '#8a7456', color2: '#4e5a3a', size: 1.35, drops: [['moss_hide', 0.5], ['mead', 0.08]] },
  tuskboar:  { name: 'Tusk Trooper',      lv: 28, hp: 1400, atk: [80, 100], def: 30, mdef: 5,  vit: 28, flee: 50,  hit: 65,  exp: 640, jexp: 450, speed: 1.9, aggro: true, stun: [8, 1.5], element: 'earth', race: 'brute',
               sprite: 'quad', variant: 'boar', color: '#6e6258', color2: '#3a342e', size: 1.15, tusk: true, drops: [['iron_tusk', 0.6], ['meat', 0.3]] },

  draugr:    { name: 'Draugr Husk',        lv: 17, hp: 700,  atk: [45, 60],  def: 5,  mdef: 10, vit: 17, flee: 20,  hit: 45,  exp: 330, jexp: 220, speed: 0.9, aggro: true, element: 'undead', race: 'undead',
               glow: '#ff4a3a', sprite: 'human', skin: '#9a8a78', face: '#b4aaa4', outfit: '#5a4a3a', hair: '#6a5a4a', viking: true, joint: '#3a2a22', drops: [['grave_dust', 0.6], ['moss_gel', 0.3]] },
  bone_warden: { name: 'Frame Warden', lv: 24, hp: 1000, atk: [70, 90],  def: 20, mdef: 10, vit: 20, flee: 50,  hit: 60,  exp: 520, jexp: 360, speed: 1.6, aggro: true, stun: [8, 1.5], element: 'undead', race: 'undead',
               glow: '#ff3030', sprite: 'human', skin: '#f0ecd8', outfit: '#f0ecd8', hair: null, bones: true, weapon: 'sword', drops: [['old_bone', 0.5], ['falchion', 0.01]] },
  hel_maiden:{ name: 'Hel Maiden Unit',    lv: 30, hp: 1500, atk: [90, 115], def: 30, mdef: 30, vit: 25, flee: 55,  hit: 75,  exp: 720, jexp: 500, speed: 1.5, aggro: true, element: 'undead', race: 'undead',
               glow: '#60f0d0', sprite: 'human', skin: '#c8d0e0', outfit: '#3a4a6a', hair: '#e8e8f0', hood: '#2a2a3a', halfskull: true, drops: [['hel_lantern', 0.4], ['ribbon', 0.02]] },
  hel_guard: { name: 'Hel Guard Unit',     lv: 32, hp: 1700, atk: [100, 125],def: 30, mdef: 20, vit: 30, flee: 60,  hit: 80,  exp: 800, jexp: 560, speed: 1.5, aggro: true, element: 'undead', race: 'undead',
               glow: '#ff4a3a', sprite: 'human', skin: '#b8c0d0', outfit: '#2a2a3a', hair: '#101018', viking: true, weapon: 'axe', drops: [['cursed_seal', 0.4], ['iron_helm', 0.02]] },
  kitsura:   { name: 'Kitsura EX', lv: 45, hp: 22000, atk: [180, 240], def: 40, mdef: 50, vit: 40, flee: 110, hit: 130, exp: 16000, jexp: 11000, speed: 2.2, aggro: true, stun: [12, 2], element: 'fire', race: 'demon',
               glow: '#ffae40', sprite: 'human', skin: '#f6d7b8', outfit: '#e86a2a', hair: '#f0a040', fox: true, scale: 1.6, boss: true, respawn: 600000, bossSkill: 'firestorm',
               drops: [['emberfang', 0.4], ['white_potion', 0.8], ['blue_potion', 0.6], ['yggdrasil_shard', 0.15]] },
};
for (const id in MOBS) MOBS[id].id = id;
for (const id in SKILLS) SKILLS[id].id = id;
// ชิปประจำมอน (ได้เมื่อล่าครบ CHIP_KILLS ตัว)
const MOB_CHIP = {"pudding": "pudding_card", "leafworm": "leafworm_card", "moonbun": "moonbun_card", "ember_pudding": "ember_card", "buzzfly": "buzzfly_card", "stumpling": "stumpling_card", "fiddlehopper": "hopper_card", "capshroom": "capshroom_card", "moss_pudding": "mosspud_card", "seraph_pudding": "seraph_card", "ashtail": "ashtail_card", "fenrir_pup": "fenrir_card", "mossback": "bear_card", "tuskboar": "boar_card", "draugr": "draugr_card", "bone_warden": "warden_card", "hel_maiden": "helmaiden_card", "hel_guard": "helguard_card", "kitsura": "kitsura_card"};
const CHIP_KILLS = 50;

// ------------------------------------------------------------
//  รูปร่างมอนสเตอร์: ทุกตัวเป็นแอนดรอยด์ร่างมนุษย์ (ไม่มีมนุษย์ในโลกนี้)
//  ค่าที่ใช้ได้: skin (โครง) outfit/outfit2 (เกราะ) hair+hairStyle (แผ่นหัว) glow (ไฟ) visor (band|v|slit)
//  wtype (อาวุธ) scale bulky hover wings (angel|mech|bee) ears (bunny|wolf|fox) halo robe cape hat
// ------------------------------------------------------------
const MOB_LOOKS = {
  pudding:       { skin: '#f4d6e4', outfit: '#e07aa8', outfit2: '#ffd0e4', hair: '#f28fb4', hairStyle: 'bob', glow: '#ff9ad0', visor: 'band', hover: true, scale: 0.72 },
  leafworm:      { skin: '#d8e8cc', outfit: '#6aa84a', outfit2: '#bfe08a', hair: '#7cc050', hairStyle: 'short', glow: '#b0ff6a', visor: 'slit', wtype: 'dagger', scale: 0.74 },
  moonbun:       { skin: '#f2f4f8', outfit: '#c8ccd8', outfit2: '#ffffff', hair: '#e8ecf4', hairStyle: 'bob', ears: 'bunny', earColor: '#f2f4f8', glow: '#ff7aa0', visor: 'band', scale: 0.76 },
  ember_pudding: { skin: '#f6dcc4', outfit: '#e8803a', outfit2: '#ffd08a', hair: '#f5a442', hairStyle: 'bob', glow: '#ffae40', visor: 'band', hover: true, scale: 0.74 },
  buzzfly:       { skin: '#2e3038', outfit: '#e0b830', outfit2: '#1e2028', hair: '#e0b830', hairStyle: 'spiky', wings: 'bee', hover: true, glow: '#ffd84a', visor: 'v', wtype: 'dagger', scale: 0.78 },
  stumpling:     { skin: '#8a6a4a', outfit: '#6a4a30', outfit2: '#a0784a', joint: '#3a2a1a', hat: 'helmet', bulky: 1.25, glow: '#ffb040', visor: 'slit', wtype: 'mace', scale: 0.95 },
  fiddlehopper:  { skin: '#d0e0c0', outfit: '#7cb342', outfit2: '#3a5a2a', hair: '#8ccf52', hairStyle: 'spiky', glow: '#b0ff6a', visor: 'v', wtype: 'bow', scale: 0.9 },
  capshroom:     { skin: '#e8e2d0', outfit: '#b8332a', outfit2: '#e8e2d0', hat: 'dome', hatColor: '#d8433a', glow: '#ff5a4a', visor: 'slit', scale: 0.8 },
  moss_pudding:  { skin: '#d4ecd0', outfit: '#5aa860', outfit2: '#bff0b0', hair: '#7fcf6f', hairStyle: 'bob', hover: true, glow: '#8aff9a', visor: 'band', scale: 0.8 },
  seraph_pudding:{ skin: '#fbf8ee', outfit: '#e8d8a0', outfit2: '#ffffff', hair: '#fff3c4', hairStyle: 'long', wings: 'angel', halo: true, hover: true, robe: true, glow: '#ffe27a', visor: 'band', wtype: 'rod', scale: 1.7 },
  ashtail:       { skin: '#9aa0aa', outfit: '#5e626c', outfit2: '#3a3e48', hair: '#7a7e88', hairStyle: 'short', ears: 'wolf', earColor: '#7a7e88', glow: '#8ad8ff', visor: 'v', wtype: 'dagger', cape: '#4e525c' },
  fenrir_pup:    { skin: '#c8d0dc', outfit: '#8a94a6', outfit2: '#5e6674', hair: '#b8c0cc', hairStyle: 'spiky', ears: 'wolf', earColor: '#b8c0cc', glow: '#8ad8ff', visor: 'v', wtype: 'sword' },
  mossback:      { skin: '#8a7456', outfit: '#4e5a3a', outfit2: '#8a7456', joint: '#2a2a1e', hat: 'helmet', bulky: 1.35, glow: '#ffb040', visor: 'slit', wtype: 'mace', scale: 1.25 },
  tuskboar:      { skin: '#6e6258', outfit: '#3a342e', outfit2: '#8a7a6a', hat: 'viking', hatColor: '#6e6258', bulky: 1.2, glow: '#ff7a3a', visor: 'slit', wtype: 'axe', scale: 1.12 },
  draugr:        { skin: '#8a7a68', face: '#a09488', outfit: '#5a4a3a', outfit2: '#3a2e24', joint: '#3a2a22', hat: 'viking', hatColor: '#6a6a60', glow: '#ff4a3a', visor: 'slit', wtype: 'axe' },
  bone_warden:   { skin: '#e8e4d8', bones: true, outfit: '#e8e4d8', glow: '#ff3030', visor: 'slit', wtype: 'sword' },
  hel_maiden:    { skin: '#c8d0e0', outfit: '#3a4a6a', outfit2: '#1e2638', hair: '#e8e8f0', hairStyle: 'long', hat: 'hood', hatColor: '#2a2a3a', glow: '#60f0d0', visor: 'band', robe: true, wtype: 'rod' },
  hel_guard:     { skin: '#b8c0d0', outfit: '#2a2a3a', outfit2: '#4a4a5a', hat: 'viking', hatColor: '#4a4e58', glow: '#ff4a3a', visor: 'v', wtype: 'axe', cape: '#3a1a1a' },
  kitsura:       { skin: '#f6ece0', outfit: '#e86a2a', outfit2: '#ffd0a0', hair: '#f0a040', hairStyle: 'long', ears: 'fox', earColor: '#f0a040', fox: true, glow: '#ffae40', visor: 'v', wtype: 'dagger', scale: 1.6 },
};
// มอนสเตอร์สไตล์ RO เวอร์ชันหุ่นยนต์: สัตว์/สไลม์กลไก ใช้สไปรต์สัตว์เดิม ส่วนอันเดดและบอสทรงคนใช้แอนดรอยด์
const HUMANOID_MOBS = ['draugr', 'bone_warden', 'hel_maiden', 'hel_guard', 'kitsura'];
for (const id in MOB_LOOKS) { if (!HUMANOID_MOBS.includes(id)) continue; MOBS[id].sprite = 'android'; MOBS[id].look = MOB_LOOKS[id]; if (MOB_LOOKS[id].scale) MOBS[id].scale = MOB_LOOKS[id].scale; delete MOBS[id].size; }

// ------------------------------------------------------------
//  ร้านค้า
// ------------------------------------------------------------
// ร้านขายอาวุธ: อาวุธแต่ละประเภทมี 4 ขั้นตามเลเวล (เริ่มต้น / Lv 10+ / Lv 20+ / ท้ายเกม) ซื้อด้วยเงินจากการล่า
const SHOPS = {
  tool:   ['red_potion', 'orange_potion', 'yellow_potion', 'white_potion', 'blue_potion', 'apple', 'meat', 'grape', 'mead', 'blink_feather', 'hearth_rune'],
  weapon: ['knife', 'cutter', 'stiletto', 'loki_fang', 'sword', 'falchion', 'broadsword', 'valhalla_blade', 'hand_axe', 'cleaver', 'battle_axe', 'ulfr_axe',
           'rod', 'arc_wand', 'rune_staff', 'seer_staff', 'bow', 'composite_bow', 'great_bow', 'ullr_bow', 'club', 'mace', 'flail', 'morning_star'],
  armor:  ['cotton_shirt', 'padded_plate', 'leather_vest', 'silk_robe', 'chain_mail', 'plate_armor', 'hat', 'ribbon', 'iron_helm', 'guard', 'round_shield', 'hood', 'thermal_cloak', 'muffler',
           'sandals', 'shoes', 'boots', 'data_band', 'clip', 'ring', 'earring', 'glove', 'rune_charm'],
};
const JOB_STARTER = { einherjar: 'sword', runecaster: 'rod', wildhunter: 'bow', volva: 'club', trickster: 'main_gauche', berserker: 'hand_axe' };

// ------------------------------------------------------------
//  ตารางประสบการณ์
// ------------------------------------------------------------
const MAX_BASE_LV = 99;
function baseExpNeed(lv) { return Math.floor(10 * Math.pow(lv, 1.9)); }
function jobExpNeed(job, jl) {
  if (job === 'novice') return Math.floor(5 * Math.pow(jl, 1.5)) + 5;
  return Math.floor(40 * jl * jl);
}
function statCost(v) { return Math.floor((v - 1) / 10) + 2; }
function statPointsForLevel(lv) { return Math.floor(lv / 5) + 3; }
