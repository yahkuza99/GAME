'use strict';
// ============================================================
//  ข้อมูลเกม: อาชีพ สกิล ไอเทม มอนสเตอร์ ธาตุ
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
  novice: { name: 'Novice', thai: 'ผู้เริ่มต้น', hp: 0.9, sp: 1.0, jobMax: 10, aspd: 1500,
    outfit: '#b8905a', outfit2: '#7a5a33', pants: '#5a4127',
    skills: ['first_aid', 'basic_training'] },
  einherjar: { name: 'Einherjar', thai: 'นักรบวิญญาณ', hp: 1.8, sp: 0.9, jobMax: 21, aspd: 1300,
    outfit: '#7a8494', outfit2: '#b03a2e', pants: '#3a3f4a', cape: '#9a2a22', jobHat: 'viking',
    stats: 'STR / VIT', role: 'แทงค์ แนวหน้า',
    desc: 'นักรบผู้ถูกเลือกจากวัลฮัลลา ยืนแนวหน้า ทนทานที่สุด ดึงศัตรูเข้าหาตัวและฟาดด้วยโล่',
    skills: ['iron_body', 'shield_slam', 'war_cry', 'whirlwind'] },
  runecaster: { name: 'Rune Caster', thai: 'นักเวทรูน', hp: 0.8, sp: 2.0, jobMax: 21, aspd: 1500,
    outfit: '#2f4f9a', outfit2: '#8fe0ff', pants: '#1f2f5a', robe: true, jobHat: 'runehood',
    stats: 'INT / DEX', role: 'เวทธาตุระยะไกล',
    desc: 'ผู้จารึกอักษรรูนโบราณเพื่อเรียกพลังธาตุ ไฟ น้ำแข็ง และสายฟ้า โจมตีแรงแต่ตัวบาง',
    skills: ['rune_mastery', 'fire_rune', 'ice_rune', 'thunder_rune'] },
  wildhunter: { name: 'Wildhunter', thai: 'นักล่าแห่งป่า', hp: 1.1, sp: 1.2, jobMax: 21, aspd: 1400,
    outfit: '#3f6a3a', outfit2: '#c9a15a', pants: '#4a3a24', cape: '#2f5a2a', jobHat: 'hood',
    stats: 'DEX / AGI', role: 'ธนูระยะไกล + สัตว์คู่ใจ',
    desc: 'นักล่าผู้เติบโตในป่าลึก ยิงธนูทะลุแนวศัตรู วางกับดัก และมีหมาป่าคู่ใจช่วยสู้',
    skills: ['eagle_eye', 'piercing_arrow', 'wolf_companion', 'blast_trap'] },
  volva: { name: 'Völva', thai: 'นักพยากรณ์แห่งแสง', hp: 1.3, sp: 1.6, jobMax: 21, aspd: 1400,
    outfit: '#f2ecdc', outfit2: '#d8b040', pants: '#8a7a5a', robe: true, jobHat: 'circlet',
    stats: 'INT / VIT', role: 'ฮีล บัฟ ปราบอมตะ',
    desc: 'ผู้หยั่งรู้ที่ได้รับพรจากเทพี ฟื้นฟูตนเอง อวยพรพลัง และแทงหอกแสงใส่ปีศาจ',
    skills: ['sanctuary', 'light_of_freyja', 'blessing_of_odin', 'holy_spear'] },
  trickster: { name: "Loki's Trickster", thai: 'นักลวงแห่งโลกิ', hp: 1.3, sp: 1.0, jobMax: 21, aspd: 1200,
    outfit: '#3a2f4a', outfit2: '#7ad04a', pants: '#24202e', jobHat: 'mask',
    stats: 'AGI / LUK', role: 'ว่องไว คริติคอล ลอบโจมตี',
    desc: 'สาวกของโลกิ เทพแห่งกลลวง หายตัวในควัน แทงข้างหลัง และอาบพิษบนใบมีด',
    skills: ['shadow_step', 'backstab', 'smoke_veil', 'venom_blade'] },
  berserker: { name: 'Berserker', thai: 'นักรบคลั่ง', hp: 1.6, sp: 0.7, jobMax: 21, aspd: 1250,
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
  red_potion:    { name: 'Red Potion',    type: 'use', price: 50,   heal: [45, 65],   icon: { s: 'potion', c: '#e03030' }, desc: 'ยาแดง ฟื้นฟู HP 45~65' },
  orange_potion: { name: 'Orange Potion', type: 'use', price: 200,  heal: [105, 145], icon: { s: 'potion', c: '#f08020' }, desc: 'ยาส้ม ฟื้นฟู HP 105~145' },
  yellow_potion: { name: 'Yellow Potion', type: 'use', price: 550,  heal: [175, 235], icon: { s: 'potion', c: '#e8d020' }, desc: 'ยาเหลือง ฟื้นฟู HP 175~235' },
  white_potion:  { name: 'White Potion',  type: 'use', price: 1200, heal: [325, 405], icon: { s: 'potion', c: '#f4f4f4' }, desc: 'ยาขาว ฟื้นฟู HP 325~405' },
  blue_potion:   { name: 'Blue Potion',   type: 'use', price: 2500, spHeal: [40, 60], icon: { s: 'potion', c: '#3060e0' }, desc: 'ยาฟ้า ฟื้นฟู SP 40~60' },
  apple:         { name: 'Apple',         type: 'use', price: 15,   heal: [16, 22],   icon: { s: 'fruit', c: '#d82828' }, desc: 'แอปเปิลสด ฟื้นฟู HP 16~22' },
  carrot:        { name: 'Carrot',        type: 'use', price: 15,   heal: [18, 24],   icon: { s: 'carrot', c: '#f08020' }, desc: 'แครอท ฟื้นฟู HP 18~24' },
  meat:          { name: 'Roast Meat',    type: 'use', price: 50,   heal: [70, 100],  icon: { s: 'meat', c: '#b05030' }, desc: 'เนื้อย่าง ฟื้นฟู HP 70~100' },
  grape:         { name: 'Grape',         type: 'use', price: 200,  spHeal: [10, 15], icon: { s: 'grape', c: '#7040a0' }, desc: 'องุ่น ฟื้นฟู SP 10~15' },
  green_herb:    { name: 'Green Herb',    type: 'use', price: 10,   heal: [12, 18], cure: true, icon: { s: 'herb', c: '#40a040' }, desc: 'สมุนไพรเขียว ฟื้นฟู HP 12~18 และแก้พิษ' },
  red_herb:      { name: 'Red Herb',      type: 'use', price: 18,   heal: [18, 28],   icon: { s: 'herb', c: '#d04040' }, desc: 'สมุนไพรแดง ฟื้นฟู HP 18~28' },
  mead:          { name: 'Honey Mead',    type: 'use', price: 500,  heal: [70, 100], spHeal: [20, 40], icon: { s: 'jar', c: '#f0b020' }, desc: 'เหล้าน้ำผึ้งแห่งนอร์ส ฟื้นฟู HP 70~100 และ SP 20~40' },
  blink_feather: { name: 'Blink Feather', type: 'use', price: 60,   effect: 'fly',    icon: { s: 'feather', c: '#8fd0f0' }, desc: 'ขนนกวาร์ป เคลื่อนย้ายไปจุดสุ่มในแผนที่ปัจจุบัน' },
  hearth_rune:   { name: 'Hearth Rune',   type: 'use', price: 300,  effect: 'return', icon: { s: 'gem', c: '#f0a060' }, desc: 'หินรูนคืนถิ่น วาร์ปกลับจุดเซฟ' },

  // --- ของดรอป (ขายได้) ---
  jelly_drop:      { name: 'Jelly Drop',      type: 'etc', price: 6,    icon: { s: 'blob', c: '#e8b0d0' }, desc: 'หยดเยลลี่ใส ๆ จากพุดดิ้ง' },
  leaf_silk:       { name: 'Leaf Silk',       type: 'etc', price: 8,    icon: { s: 'blob', c: '#e4f4c8' }, desc: 'ใยไหมจากหนอนใบไม้' },
  clover:          { name: 'Clover',          type: 'etc', price: 6,    icon: { s: 'herb', c: '#50c050' }, desc: 'ใบโคลเวอร์สามแฉก' },
  moon_fur:        { name: 'Moon Fur',        type: 'etc', price: 8,    icon: { s: 'feather', c: '#f0f0ff' }, desc: 'ขนนุ่มสีเงินของกระต่ายจันทร์' },
  buzz_wing:       { name: 'Buzz Wing',       type: 'etc', price: 14,   icon: { s: 'shell', c: '#c0d8e0' }, desc: 'ปีกบางใสของแมลงหึ่ง' },
  ember_jelly:     { name: 'Ember Jelly',     type: 'etc', price: 10,   icon: { s: 'blob', c: '#f5a442' }, desc: 'เยลลี่อุ่น ๆ จากพุดดิ้งถ่านไฟ' },
  moss_gel:        { name: 'Moss Gel',        type: 'etc', price: 16,   icon: { s: 'blob', c: '#90d060' }, desc: 'เจลตะไคร่เหนียว ๆ' },
  hopper_leg:      { name: 'Hopper Leg',      type: 'etc', price: 24,   icon: { s: 'bone', c: '#80b040' }, desc: 'ขาตั๊กแตนนักดนตรี' },
  living_bark:     { name: 'Living Bark',     type: 'etc', price: 12,   icon: { s: 'bone', c: '#8a6038' }, desc: 'เปลือกไม้ที่ยังขยับได้' },
  cap_spore:       { name: 'Cap Spore',       type: 'etc', price: 16,   icon: { s: 'blob', c: '#d05050' }, desc: 'สปอร์จากหมวกเห็ดแดง' },
  ash_tail:        { name: 'Ash Tail',        type: 'etc', price: 44,   icon: { s: 'feather', c: '#909090' }, desc: 'หางสีเถ้าของแรคคูน' },
  fenrir_fang:     { name: 'Fenrir Fang',     type: 'etc', price: 60,   icon: { s: 'claw', c: '#e0e0e0' }, desc: 'เขี้ยวของลูกหมาป่าเฟนริร์' },
  moss_hide:       { name: 'Moss Hide',       type: 'etc', price: 180,  icon: { s: 'cloth', c: '#5a7a3a' }, desc: 'หนังหมีปกคลุมด้วยตะไคร่' },
  iron_tusk:       { name: 'Iron Tusk',       type: 'etc', price: 70,   icon: { s: 'claw', c: '#c8c8d0' }, desc: 'งาแข็งดั่งเหล็กของหมูป่า' },
  grave_dust:      { name: 'Grave Dust',      type: 'etc', price: 24,   icon: { s: 'blob', c: '#9a9a80' }, desc: 'ฝุ่นจากหลุมศพของเดรากร์' },
  old_bone:        { name: 'Old Bone',        type: 'etc', price: 72,   icon: { s: 'bone', c: '#f0ecd8' }, desc: 'กระดูกเก่าแก่' },
  hel_lantern:     { name: 'Hel Lantern',     type: 'etc', price: 180,  icon: { s: 'jar', c: '#60c0a0' }, desc: 'ตะเกียงวิญญาณแห่งเฮล' },
  cursed_seal:     { name: 'Cursed Seal',     type: 'etc', price: 240,  icon: { s: 'ring', c: '#a040c0' }, desc: 'ตราผนึกคำสาป' },
  yggdrasil_shard: { name: 'Yggdrasil Shard', type: 'etc', price: 20000, icon: { s: 'gem', c: '#60f0a0' }, desc: 'เศษกิ่งต้นไม้โลก ล้ำค่าที่สุดในมิดการ์ด' },

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
  battle_axe:   { name: 'Battle Axe',   type: 'weapon', slot: 'weapon', wtype: 'axe', atk: 72, price: 5500,     slots: 2, lv: 15, jobs: J.axe, icon: { s: 'axe', c: '#d0d0dc' }, desc: 'ขวานศึก' },
  ulfr_axe:     { name: 'Úlfr Axe',     type: 'weapon', slot: 'weapon', wtype: 'axe', atk: 145, price: 34000,   slots: 1, lv: 30, jobs: ['berserker'], icon: { s: 'axe', c: '#e04040' }, b: { str: 3 }, desc: 'ขวานหมาป่า STR +3 (นักรบคลั่งเท่านั้น)' },
  rod:          { name: 'Rod',          type: 'weapon', slot: 'weapon', wtype: 'rod', atk: 15, matk: 15, price: 50,     slots: 3, jobs: J.rod, icon: { s: 'rod', c: '#a07040' }, desc: 'คทาไม้ MATK +15' },
  rune_staff:   { name: 'Rune Staff',   type: 'weapon', slot: 'weapon', wtype: 'rod', atk: 25, matk: 40, price: 2500,   slots: 2, lv: 12, jobs: J.rod, icon: { s: 'rod', c: '#50a0e0' }, b: { int: 1 }, desc: 'คทาจารึกรูน MATK +40 INT +1' },
  seer_staff:   { name: "Seer's Staff", type: 'weapon', slot: 'weapon', wtype: 'rod', atk: 60, matk: 80, price: 14000,  slots: 1, lv: 24, jobs: ['runecaster', 'volva'], icon: { s: 'rod', c: '#e050e0' }, b: { int: 3 }, desc: 'คทาผู้หยั่งรู้ MATK +80 INT +3' },
  bow:          { name: 'Bow',          type: 'weapon', slot: 'weapon', wtype: 'bow', atk: 15, price: 1000,    slots: 3, jobs: J.bow, icon: { s: 'bow', c: '#a07040' }, desc: 'ธนูไม้' },
  composite_bow:{ name: 'Composite Bow',type: 'weapon', slot: 'weapon', wtype: 'bow', atk: 32, price: 2500,    slots: 3, jobs: J.bow, icon: { s: 'bow', c: '#c08040' }, desc: 'ธนูผสม' },
  great_bow:    { name: 'Great Bow',    type: 'weapon', slot: 'weapon', wtype: 'bow', atk: 55, price: 10000,   slots: 2, lv: 18, jobs: ['wildhunter'], icon: { s: 'bow', c: '#6a4a2a' }, desc: 'ธนูใหญ่ (นักล่าเท่านั้น)' },
  ullr_bow:     { name: "Ullr's Bow",   type: 'weapon', slot: 'weapon', wtype: 'bow', atk: 125, price: 34000,  slots: 1, lv: 30, jobs: ['wildhunter'], icon: { s: 'bow', c: '#308040' }, b: { dex: 3 }, desc: 'ธนูแห่งอุลล์ เทพนักล่า DEX +3' },
  club:         { name: 'Club',         type: 'weapon', slot: 'weapon', wtype: 'mace', atk: 23, price: 60,     slots: 3, jobs: J.mace, icon: { s: 'mace', c: '#8a6038' }, desc: 'กระบองไม้' },
  mace:         { name: 'Mace',         type: 'weapon', slot: 'weapon', wtype: 'mace', atk: 40, price: 800,    slots: 3, jobs: J.mace, icon: { s: 'mace', c: '#a0a0b0' }, desc: 'คทาเหล็ก' },
  morning_star: { name: 'Morning Star', type: 'weapon', slot: 'weapon', wtype: 'mace', atk: 90, price: 12000,  slots: 1, lv: 20, jobs: J.mace, icon: { s: 'mace', c: '#d0d0e0' }, desc: 'กระบองหนามดาว' },
  emberfang:    { name: 'Emberfang',    type: 'weapon', slot: 'weapon', wtype: 'dagger', atk: 70, matk: 40, price: 60000, slots: 0, lv: 25, jobs: J.dagger, icon: { s: 'dagger', c: '#f0a040' },
    b: { sp: 60, int: 2, agi: 2 }, desc: '[MVP] เขี้ยวเพลิง MATK +40, INT +2, AGI +2, MaxSP +60' },

  // --- ชุดเกราะ / สวมใส่ ---
  cotton_shirt: { name: 'Cotton Shirt', type: 'armor', slot: 'armor', def: 1, price: 10,   slots: 1, jobs: 'all', icon: { s: 'armor', c: '#e8e0c8' }, desc: 'เสื้อฝ้าย DEF 1' },
  leather_vest: { name: 'Leather Vest', type: 'armor', slot: 'armor', def: 4, price: 1500, slots: 1, jobs: J.light, icon: { s: 'armor', c: '#b09060' }, desc: 'เสื้อหนัง DEF 4' },
  silk_robe:    { name: 'Silk Robe',    type: 'armor', slot: 'armor', def: 3, mdef: 10, price: 3000, slots: 1, jobs: 'all', icon: { s: 'armor', c: '#a080d0' }, b: { int: 1 }, desc: 'เสื้อคลุมไหม DEF 3 MDEF 10 INT +1' },
  chain_mail:   { name: 'Chain Mail',   type: 'armor', slot: 'armor', def: 8, price: 9000, slots: 1, lv: 20, jobs: J.heavy, icon: { s: 'armor', c: '#a0a8b8' }, desc: 'เกราะโซ่ DEF 8' },
  plate_armor:  { name: 'Plate Armor',  type: 'armor', slot: 'armor', def: 12, price: 30000, slots: 1, lv: 35, jobs: ['einherjar'], icon: { s: 'armor', c: '#d0d8e8' }, desc: 'เกราะเหล็กเต็มตัว DEF 12 (นักรบวิญญาณเท่านั้น)' },
  hat:          { name: 'Hat',          type: 'armor', slot: 'head', def: 2, price: 1000,  slots: 0, jobs: 'all', icon: { s: 'hat', c: '#8a6a4a' }, desc: 'หมวก DEF 2' },
  ribbon:       { name: 'Ribbon',       type: 'armor', slot: 'head', def: 1, mdef: 3, price: 800, slots: 0, jobs: 'all', icon: { s: 'ribbon', c: '#e04070' }, b: { int: 1 }, desc: 'ริบบิ้น DEF 1 MDEF 3 INT +1' },
  iron_helm:    { name: 'Iron Helm',    type: 'armor', slot: 'head', def: 4, price: 6000, slots: 1, lv: 12, jobs: J.light, icon: { s: 'hat', c: '#8090a0' }, desc: 'หมวกเหล็ก DEF 4' },
  seraph_wings: { name: 'Seraph Wings', type: 'armor', slot: 'head', def: 3, mdef: 5, price: 50000, slots: 0, jobs: 'all', icon: { s: 'wing', c: '#ffffff' }, b: { int: 2, luk: 2, agi: 1 }, desc: '[MVP] ปีกเทวดา DEF 3 MDEF 5 INT +2 LUK +2 AGI +1' },
  guard:        { name: 'Guard',        type: 'armor', slot: 'shield', def: 3, price: 500,  slots: 1, jobs: 'all', icon: { s: 'shield', c: '#a07040' }, desc: 'โล่ไม้ DEF 3 (ใช้กับธนูไม่ได้)' },
  round_shield: { name: 'Round Shield', type: 'armor', slot: 'shield', def: 5, price: 6000, slots: 1, lv: 14, jobs: J.heavy, icon: { s: 'shield', c: '#b0b8c8' }, desc: 'โล่กลมไวกิ้ง DEF 5' },
  hood:         { name: 'Hood',         type: 'armor', slot: 'garment', def: 1, price: 120, slots: 1, jobs: 'all', icon: { s: 'cloth', c: '#6a8a5a' }, desc: 'ฮู้ด DEF 1' },
  muffler:      { name: 'Muffler',      type: 'armor', slot: 'garment', def: 2, price: 5000, slots: 1, jobs: 'all', icon: { s: 'cloth', c: '#c04040' }, desc: 'ผ้าพันคอ DEF 2' },
  sandals:      { name: 'Sandals',      type: 'armor', slot: 'shoes', def: 1, price: 400,  slots: 1, jobs: 'all', icon: { s: 'shoes', c: '#b08050' }, desc: 'รองเท้าแตะ DEF 1' },
  shoes:        { name: 'Shoes',        type: 'armor', slot: 'shoes', def: 2, price: 3500, slots: 1, jobs: 'all', icon: { s: 'shoes', c: '#6a4a3a' }, desc: 'รองเท้าหนัง DEF 2' },
  boots:        { name: 'Boots',        type: 'armor', slot: 'shoes', def: 4, price: 18000, slots: 1, lv: 20, jobs: 'all', icon: { s: 'shoes', c: '#4a3a2a' }, desc: 'รองเท้าบู๊ต DEF 4' },
  clip:         { name: 'Clip',         type: 'armor', slot: 'acc', price: 5000, slots: 1, jobs: 'all', icon: { s: 'ring', c: '#c0c0c0' }, b: { sp: 10 }, desc: 'กิ๊บติดผม MaxSP +10 (มีช่องการ์ด)' },
  ring:         { name: 'Ring',         type: 'armor', slot: 'acc', price: 20000, slots: 0, jobs: 'all', icon: { s: 'ring', c: '#e0b040' }, b: { str: 2 }, desc: 'แหวน STR +2' },
  earring:      { name: 'Earring',      type: 'armor', slot: 'acc', price: 20000, slots: 0, jobs: 'all', icon: { s: 'ring', c: '#60c0e0' }, b: { int: 2 }, desc: 'ต่างหู INT +2' },
  glove:        { name: 'Glove',        type: 'armor', slot: 'acc', price: 20000, slots: 0, jobs: 'all', icon: { s: 'ring', c: '#a06040' }, b: { dex: 2 }, desc: 'ถุงมือ DEX +2' },
  rune_charm:   { name: 'Rune Charm',   type: 'armor', slot: 'acc', price: 20000, slots: 0, jobs: 'all', icon: { s: 'ring', c: '#f0f0f0' }, b: { luk: 2, mdef: 3 }, desc: 'เครื่องรางรูน LUK +2 MDEF 3' },

  // --- การ์ด ---
  pudding_card:    { name: 'Pudding Card',    type: 'card', slot: 'armor',   price: 20, b: { luk: 2, flee: 1 }, icon: { s: 'card', c: '#f0a0c0' }, desc: 'ใส่ชุดเกราะ: LUK +2, FLEE +1' },
  leafworm_card:   { name: 'Leafworm Card',   type: 'card', slot: 'armor',   price: 20, b: { vit: 1, hp: 100 }, icon: { s: 'card', c: '#90d060' }, desc: 'ใส่ชุดเกราะ: VIT +1, MaxHP +100' },
  moonbun_card:    { name: 'Moonbun Card',    type: 'card', slot: 'garment', price: 20, b: { luk: 1, crit: 1 }, icon: { s: 'card', c: '#f0f0f0' }, desc: 'ใส่ผ้าคลุม: LUK +1, CRIT +1' },
  ember_card:      { name: 'Ember Pudding Card', type: 'card', slot: 'acc',  price: 20, b: { dex: 1, hit: 3 }, icon: { s: 'card', c: '#f0a040' }, desc: 'ใส่เครื่องประดับ: DEX +1, HIT +3' },
  buzzfly_card:    { name: 'Buzzfly Card',    type: 'card', slot: 'garment', price: 20, b: { agi: 1, flee: 2 }, icon: { s: 'card', c: '#e0d040' }, desc: 'ใส่ผ้าคลุม: AGI +1, FLEE +2' },
  hopper_card:     { name: 'Fiddlehopper Card', type: 'card', slot: 'acc',   price: 20, b: { dex: 1, atk: 5 }, icon: { s: 'card', c: '#80c040' }, desc: 'ใส่เครื่องประดับ: DEX +1, ATK +5' },
  stumpling_card:  { name: 'Stumpling Card',  type: 'card', slot: 'armor',   price: 20, b: { sp: 80 }, icon: { s: 'card', c: '#a07040' }, desc: 'ใส่ชุดเกราะ: MaxSP +80' },
  capshroom_card:  { name: 'Capshroom Card',  type: 'card', slot: 'head',    price: 20, b: { vit: 2 }, icon: { s: 'card', c: '#e05050' }, desc: 'ใส่หมวก: VIT +2' },
  mosspud_card:    { name: 'Moss Pudding Card', type: 'card', slot: 'weapon', price: 20, b: { atk: 10, luk: 1 }, icon: { s: 'card', c: '#80d080' }, desc: 'ใส่อาวุธ: ATK +10, LUK +1' },
  ashtail_card:    { name: 'Ashtail Card',    type: 'card', slot: 'garment', price: 20, b: { agi: 2, flee: 3 }, icon: { s: 'card', c: '#909090' }, desc: 'ใส่ผ้าคลุม: AGI +2, FLEE +3' },
  fenrir_card:     { name: 'Fenrir Pup Card', type: 'card', slot: 'weapon',  price: 20, b: { crit: 8 }, icon: { s: 'card', c: '#c0c0d0' }, desc: 'ใส่อาวุธ: CRIT +8' },
  bear_card:       { name: 'Mossback Card',   type: 'card', slot: 'shield',  price: 20, b: { vit: 1, def: 2 }, icon: { s: 'card', c: '#5a7a3a' }, desc: 'ใส่โล่: VIT +1, DEF +2' },
  boar_card:       { name: 'Tuskboar Card',   type: 'card', slot: 'armor',   price: 20, b: { vit: 3 }, icon: { s: 'card', c: '#6a4020' }, desc: 'ใส่ชุดเกราะ: VIT +3' },
  draugr_card:     { name: 'Draugr Card',     type: 'card', slot: 'shield',  price: 20, b: { hp: 200 }, icon: { s: 'card', c: '#709070' }, desc: 'ใส่โล่: MaxHP +200' },
  warden_card:     { name: 'Bone Warden Card', type: 'card', slot: 'weapon', price: 20, b: { atk: 10, crit: 2 }, icon: { s: 'card', c: '#f0ecd8' }, desc: 'ใส่อาวุธ: ATK +10, CRIT +2' },
  helmaiden_card:  { name: 'Hel Maiden Card', type: 'card', slot: 'head',    price: 20, b: { int: 1, mdef: 5 }, icon: { s: 'card', c: '#4050a0' }, desc: 'ใส่หมวก: INT +1, MDEF +5' },
  helguard_card:   { name: 'Hel Guard Card',  type: 'card', slot: 'shoes',   price: 20, b: { vit: 1, hp: 150 }, icon: { s: 'card', c: '#303050' }, desc: 'ใส่รองเท้า: VIT +1, MaxHP +150' },
  seraph_card:     { name: 'Seraph Pudding Card', type: 'card', slot: 'armor', price: 20, b: { str: 2, agi: 2, vit: 2, int: 2, dex: 2, luk: 2 }, icon: { s: 'card', c: '#fff0a0' }, desc: '[MVP] ใส่ชุดเกราะ: สเตตัสทั้งหมด +2' },
  kitsura_card:    { name: 'Kitsura Card',    type: 'card', slot: 'shoes',   price: 20, b: { agi: 3, sp: 50, flee: 5 }, icon: { s: 'card', c: '#f0c050' }, desc: '[MVP] ใส่รองเท้า: AGI +3, MaxSP +50, FLEE +5' },
};
for (const id in ITEMS) ITEMS[id].id = id;

const SLOT_THAI = { weapon: 'อาวุธ', head: 'หมวก', armor: 'ชุดเกราะ', shield: 'โล่', garment: 'ผ้าคลุม', shoes: 'รองเท้า', acc: 'เครื่องประดับ' };
const EQUIP_SLOTS = ['head', 'weapon', 'shield', 'armor', 'garment', 'shoes', 'acc'];

// ------------------------------------------------------------
//  มอนสเตอร์ (ออกแบบใหม่)
//  def = hard def (%)  vit = soft def   sprite = รูปแบบการวาด
// ------------------------------------------------------------
const MOBS = {
  pudding:   { name: 'Pudding',       lv: 1,  hp: 50,   atk: [7, 10],   def: 0,  mdef: 5,  vit: 1,  flee: 5,   hit: 8,   exp: 18,  jexp: 12, speed: 1.4, aggro: false, element: 'water', race: 'plant',
               sprite: 'poring', color: '#f28fb4', drops: [['jelly_drop', 0.7], ['apple', 0.15], ['red_potion', 0.04], ['knife', 0.01], ['pudding_card', 0.01]] },
  leafworm:  { name: 'Leafworm',      lv: 2,  hp: 63,   atk: [8, 11],   def: 0,  mdef: 0,  vit: 2,  flee: 7,   hit: 10,  exp: 22,  jexp: 15, speed: 1.2, aggro: false, element: 'earth', race: 'insect',
               sprite: 'fabre', color: '#8fd35a', drops: [['leaf_silk', 0.65], ['clover', 0.1], ['green_herb', 0.2], ['leafworm_card', 0.01]] },
  moonbun:   { name: 'Moonbun',       lv: 3,  hp: 60,   atk: [9, 12],   def: 0,  mdef: 20, vit: 3,  flee: 12,  hit: 12,  exp: 26,  jexp: 18, speed: 2.0, aggro: false, element: 'neutral', race: 'brute',
               sprite: 'lunatic', color: '#fafafa', drops: [['moon_fur', 0.6], ['clover', 0.2], ['carrot', 0.3], ['moonbun_card', 0.01]] },
  ember_pudding: { name: 'Ember Pudding', lv: 3, hp: 72, atk: [10, 13], def: 0,  mdef: 0,  vit: 3,  flee: 9,   hit: 12,  exp: 30,  jexp: 20, speed: 1.4, aggro: false, element: 'fire', race: 'plant',
               sprite: 'poring', color: '#f5a442', drops: [['ember_jelly', 0.5], ['orange_potion', 0.04], ['red_herb', 0.2], ['ember_card', 0.01]] },
  buzzfly:   { name: 'Buzzfly',       lv: 4,  hp: 67,   atk: [10, 13],  def: 10, mdef: 0,  vit: 4,  flee: 20,  hit: 16,  exp: 35,  jexp: 24, speed: 2.4, aggro: true, element: 'wind', race: 'insect',
               sprite: 'chonchon', color: '#3a3a3a', drops: [['buzz_wing', 0.55], ['jelly_drop', 0.3], ['blink_feather', 0.05], ['buzzfly_card', 0.01]] },

  stumpling: { name: 'Stumpling',     lv: 8,  hp: 170,  atk: [18, 22],  def: 35, mdef: 5,  vit: 8,  flee: 10,  hit: 20,  exp: 80,  jexp: 55, speed: 1.0, aggro: false, element: 'earth', race: 'plant',
               sprite: 'willow', color: '#8a6038', drops: [['living_bark', 0.6], ['leaf_silk', 0.3], ['stumpling_card', 0.01]] },
  fiddlehopper: { name: 'Fiddlehopper', lv: 9, hp: 198, atk: [24, 29],  def: 5,  mdef: 10, vit: 10, flee: 22,  hit: 28,  exp: 90,  jexp: 60, speed: 1.6, aggro: false, element: 'earth', race: 'insect',
               sprite: 'rocker', color: '#7cb342', drops: [['hopper_leg', 0.55], ['green_herb', 0.2], ['cutter', 0.005], ['hopper_card', 0.01]] },
  capshroom: { name: 'Capshroom',     lv: 12, hp: 280,  atk: [28, 34],  def: 10, mdef: 10, vit: 12, flee: 20,  hit: 30,  exp: 130, jexp: 90, speed: 1.2, aggro: false, element: 'water', race: 'plant',
               sprite: 'spore', color: '#d8433a', drops: [['cap_spore', 0.6], ['red_herb', 0.3], ['hat', 0.01], ['capshroom_card', 0.01]] },
  moss_pudding: { name: 'Moss Pudding', lv: 14, hp: 330, atk: [32, 40], def: 10, mdef: 10, vit: 14, flee: 24,  hit: 34,  exp: 160, jexp: 110, speed: 1.6, aggro: false, element: 'earth', race: 'plant',
               sprite: 'poring', color: '#7fcf6f', drops: [['moss_gel', 0.5], ['green_herb', 0.3], ['grape', 0.06], ['mosspud_card', 0.01]] },
  seraph_pudding: { name: 'Seraph Pudding', lv: 25, hp: 5500, atk: [90, 120], def: 30, mdef: 50, vit: 25, flee: 60, hit: 70, exp: 3500, jexp: 2400, speed: 1.8, aggro: true, element: 'holy', race: 'angel',
               sprite: 'poring', color: '#fff3c4', scale: 2.0, boss: true, wings: true, respawn: 300000, bossSkill: 'heal',
               drops: [['seraph_wings', 0.35], ['white_potion', 0.6], ['blue_potion', 0.5], ['yggdrasil_shard', 0.1], ['seraph_card', 0.15]] },

  ashtail:   { name: 'Ashtail',       lv: 18, hp: 600,  atk: [45, 58],  def: 10, mdef: 5,  vit: 18, flee: 45,  hit: 48,  exp: 300, jexp: 210, speed: 1.8, aggro: false, element: 'earth', race: 'brute',
               sprite: 'quad', variant: 'raccoon', color: '#8a8a8a', color2: '#5a5a5a', size: 0.8, drops: [['ash_tail', 0.5], ['moon_fur', 0.3], ['muffler', 0.01], ['ashtail_card', 0.01]] },
  fenrir_pup:{ name: 'Fenrir Pup',    lv: 25, hp: 900,  atk: [60, 78],  def: 15, mdef: 0,  vit: 22, flee: 55,  hit: 60,  exp: 460, jexp: 320, speed: 2.4, aggro: true, element: 'earth', race: 'brute',
               sprite: 'quad', variant: 'wolf', color: '#b0b0b8', color2: '#707078', size: 1.0, drops: [['fenrir_fang', 0.6], ['meat', 0.3], ['fenrir_card', 0.01]] },
  mossback:  { name: 'Mossback Bear', lv: 26, hp: 1150, atk: [65, 82],  def: 25, mdef: 5,  vit: 26, flee: 40,  hit: 55,  exp: 520, jexp: 350, speed: 1.3, aggro: false, element: 'earth', race: 'brute',
               sprite: 'quad', variant: 'bear', color: '#6a5030', color2: '#4a6a2a', size: 1.35, drops: [['moss_hide', 0.5], ['mead', 0.08], ['bear_card', 0.01]] },
  tuskboar:  { name: 'Tuskboar',      lv: 28, hp: 1400, atk: [80, 100], def: 30, mdef: 5,  vit: 28, flee: 50,  hit: 65,  exp: 640, jexp: 450, speed: 1.9, aggro: true, element: 'earth', race: 'brute',
               sprite: 'quad', variant: 'boar', color: '#6a4a2a', color2: '#3a2a1a', size: 1.15, tusk: true, drops: [['iron_tusk', 0.6], ['meat', 0.3], ['boar_card', 0.01]] },

  draugr:    { name: 'Draugr',        lv: 17, hp: 700,  atk: [45, 60],  def: 5,  mdef: 10, vit: 17, flee: 20,  hit: 45,  exp: 330, jexp: 220, speed: 0.9, aggro: true, element: 'undead', race: 'undead',
               sprite: 'human', skin: '#8fae84', outfit: '#4a4a5a', hair: '#b0b0a0', viking: true, drops: [['grave_dust', 0.6], ['moss_gel', 0.3], ['draugr_card', 0.01]] },
  bone_warden: { name: 'Bone Warden', lv: 24, hp: 1000, atk: [70, 90],  def: 20, mdef: 10, vit: 20, flee: 50,  hit: 60,  exp: 520, jexp: 360, speed: 1.6, aggro: true, element: 'undead', race: 'undead',
               sprite: 'human', skin: '#f0ecd8', outfit: '#f0ecd8', hair: null, bones: true, weapon: 'sword', drops: [['old_bone', 0.5], ['falchion', 0.01], ['warden_card', 0.01]] },
  hel_maiden:{ name: 'Hel Maiden',    lv: 30, hp: 1500, atk: [90, 115], def: 30, mdef: 30, vit: 25, flee: 55,  hit: 75,  exp: 720, jexp: 500, speed: 1.5, aggro: true, element: 'undead', race: 'undead',
               sprite: 'human', skin: '#c8d0e0', outfit: '#3a4a6a', hair: '#e8e8f0', hood: '#2a2a3a', halfskull: true, drops: [['hel_lantern', 0.4], ['ribbon', 0.02], ['helmaiden_card', 0.01]] },
  hel_guard: { name: 'Hel Guard',     lv: 32, hp: 1700, atk: [100, 125],def: 30, mdef: 20, vit: 30, flee: 60,  hit: 80,  exp: 800, jexp: 560, speed: 1.5, aggro: true, element: 'undead', race: 'undead',
               sprite: 'human', skin: '#b8c0d0', outfit: '#2a2a3a', hair: '#101018', viking: true, weapon: 'axe', drops: [['cursed_seal', 0.4], ['iron_helm', 0.02], ['helguard_card', 0.01]] },
  kitsura:   { name: 'Kitsura, Ember Fox', lv: 45, hp: 22000, atk: [180, 240], def: 40, mdef: 50, vit: 40, flee: 110, hit: 130, exp: 16000, jexp: 11000, speed: 2.2, aggro: true, element: 'fire', race: 'demon',
               sprite: 'human', skin: '#f6d7b8', outfit: '#e86a2a', hair: '#f0a040', fox: true, scale: 1.6, boss: true, respawn: 600000, bossSkill: 'firestorm',
               drops: [['emberfang', 0.4], ['white_potion', 0.8], ['blue_potion', 0.6], ['yggdrasil_shard', 0.15], ['kitsura_card', 0.15]] },
};
for (const id in MOBS) MOBS[id].id = id;

// ------------------------------------------------------------
//  ร้านค้า
// ------------------------------------------------------------
const SHOPS = {
  tool:   ['red_potion', 'orange_potion', 'yellow_potion', 'white_potion', 'blue_potion', 'apple', 'meat', 'grape', 'mead', 'blink_feather', 'hearth_rune'],
  weapon: ['knife', 'cutter', 'main_gauche', 'stiletto', 'loki_fang', 'sword', 'falchion', 'broadsword', 'valhalla_blade', 'hand_axe', 'battle_axe', 'ulfr_axe',
           'rod', 'rune_staff', 'seer_staff', 'bow', 'composite_bow', 'great_bow', 'ullr_bow', 'club', 'mace', 'morning_star'],
  armor:  ['cotton_shirt', 'leather_vest', 'silk_robe', 'chain_mail', 'plate_armor', 'hat', 'ribbon', 'iron_helm', 'guard', 'round_shield', 'hood', 'muffler',
           'sandals', 'shoes', 'boots', 'clip', 'ring', 'earring', 'glove', 'rune_charm'],
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
