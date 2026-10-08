'use strict';
// ============================================================
//  ข้อมูลเกม IRON VALHALLA: Class สกิล ไอเทม มอนสเตอร์ ธาตุ
//  ต้องการปรับสมดุล / เพิ่มสกิล / เพิ่มไอเทม แก้ที่ไฟล์นี้ได้เลย
// ============================================================

const TILE = 40;
// ชื่อสกุลเงินในเกม (แสดงผลทุกที่) — ในโค้ด/เซฟยังใช้ชื่อตัวแปร zeny เดิม
const CUR = 'Volt';

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
  neutral: L('ไม่มีธาตุ', 'Neutral'), water: L('น้ำ', 'Water'), earth: L('ดิน', 'Earth'), fire: L('ไฟ', 'Fire'), wind: L('ลม', 'Wind'),
  poison: L('พิษ', 'Poison'), holy: L('ศักดิ์สิทธิ์', 'Holy'), shadow: L('มืด', 'Shadow'), ghost: L('วิญญาณ', 'Ghost'), undead: L('อมตะ', 'Undead'),
};

// ------------------------------------------------------------
//  Class (ออกแบบใหม่ ธีมตำนานนอร์ส)
//  hp/sp = ตัวคูณ MaxHP/MaxSP   aspd = ดีเลย์โจมตีพื้นฐาน (ms)
//  look = หน้าตา (สีชุด + หมวกประจำ Class)
// ------------------------------------------------------------
const JOBS = {
  novice: { glow: '#7ad8ff', name: 'Novice', thai: L('ผู้เริ่มต้น', 'Beginner'), hp: 0.9, sp: 1.0, jobMax: 10, aspd: 1500,
    outfit: '#b8905a', outfit2: '#7a5a33', pants: '#5a4127',
    skills: ['first_aid', 'basic_training'] },
  einherjar: { glow: '#ff6a4a', name: 'Einherjar', thai: L('นักรบวิญญาณ', 'Soul Warrior'), hp: 1.8, sp: 0.9, jobMax: 26, aspd: 1200,
    outfit: '#7a8494', outfit2: '#b03a2e', pants: '#3a3f4a', cape: '#9a2a22', jobHat: 'viking',
    stats: 'STR / VIT', role: L('แทงค์ แนวหน้า', 'Frontline Tank'),
    desc: L('นักรบผู้ถูกเลือกจากวัลฮัลลา ยืนแนวหน้า ทนทานที่สุด ดึงศัตรูเข้าหาตัวและฟาดด้วยโล่', 'A warrior chosen by Valhalla. Holds the front line as the toughest of all, drawing foes in and battering them with a shield.'),
    skills: ['iron_body', 'shield_slam', 'war_cry', 'whirlwind', 'shield_throw', 'valhalla_oath'] },
  runecaster: { glow: '#6ae0ff', name: 'Rune Caster', thai: L('นักเวทรูน', 'Rune Mage'), hp: 0.8, sp: 2.0, jobMax: 26, aspd: 1500,
    outfit: '#2f4f9a', outfit2: '#8fe0ff', pants: '#1f2f5a', robe: true, jobHat: 'runehood',
    stats: 'INT / DEX', role: L('เวทธาตุระยะไกล', 'Ranged Elemental Magic'),
    desc: L('ผู้จารึกอักษรรูนโบราณเพื่อเรียกพลังธาตุ ไฟ น้ำแข็ง และสายฟ้า โจมตีแรงแต่ตัวบาง', 'An inscriber of ancient runes who calls forth fire, frost and lightning. Hits hard, but fragile.'),
    skills: ['rune_mastery', 'fire_rune', 'ice_rune', 'thunder_rune', 'earth_rune', 'runic_ward'] },
  wildhunter: { glow: '#8cff7a', name: 'Wildhunter', thai: L('นักล่าแห่งป่า', 'Hunter of the Wilds'), hp: 1.1, sp: 1.2, jobMax: 26, aspd: 1400,
    outfit: '#3f6a3a', outfit2: '#c9a15a', pants: '#4a3a24', cape: '#2f5a2a', jobHat: 'hood',
    stats: 'DEX / AGI', role: L('ธนูระยะไกล + สัตว์คู่ใจ', 'Ranged Archery + Wolf Companion'),
    desc: L('นักล่าผู้เติบโตในป่าลึก ยิงธนูทะลุแนวศัตรู วางกับดัก และมีหมาป่าคู่ใจช่วยสู้', 'A hunter raised in the deep forest. Looses arrows that pierce enemy lines, sets traps, and fights beside a loyal wolf.'),
    skills: ['eagle_eye', 'piercing_arrow', 'wolf_companion', 'blast_trap', 'charge_arrow', 'hunters_rhythm'] },
  volva: { glow: '#ffe27a', name: 'Völva', thai: L('นักพยากรณ์แห่งแสง', 'Seer of Light'), hp: 1.3, sp: 1.6, jobMax: 26, aspd: 1400,
    outfit: '#f2ecdc', outfit2: '#d8b040', pants: '#8a7a5a', robe: true, jobHat: 'circlet',
    stats: 'INT / VIT', role: L('ฮีล บัฟ ปราบอมตะ', 'Healing, Buffs, Undead Bane'),
    desc: L('ผู้หยั่งรู้ที่ได้รับพรจากเทพี ฟื้นฟูตนเอง อวยพรพลัง และแทงหอกแสงใส่ปีศาจ', 'A seer blessed by the goddess. Mends her own wounds, grants blessings of power, and pierces demons with spears of light.'),
    skills: ['sanctuary', 'light_of_freyja', 'blessing_of_odin', 'holy_spear', 'divine_shield', 'freyjas_grace'] },
  trickster: { glow: '#c07aff', name: "Loki's Trickster", thai: L('นักลวงแห่งโลกิ', 'Trickster of Loki'), hp: 1.3, sp: 1.0, jobMax: 26, aspd: 1200,
    outfit: '#3a2f4a', outfit2: '#7ad04a', pants: '#24202e', jobHat: 'mask',
    stats: 'AGI / LUK', role: L('ว่องไว คริติคอล ลอบโจมตี', 'Agile Crits & Ambushes'),
    desc: L('สาวกของโลกิ เทพแห่งกลลวง หายตัวในควัน แทงข้างหลัง และอาบพิษบนใบมีด', 'A disciple of Loki, god of mischief. Vanishes into smoke, strikes from behind, and coats blades in venom.'),
    skills: ['shadow_step', 'backstab', 'smoke_veil', 'venom_blade', 'throwing_knife', 'lokis_gambit'] },
  berserker: { glow: '#ff8a2a', name: 'Berserker', thai: L('นักรบคลั่ง', 'Raging Warrior'), hp: 1.6, sp: 0.7, jobMax: 26, aspd: 1250,
    outfit: '#8a5a34', outfit2: '#5a3a1e', pants: '#3a2a1a', jobHat: 'wolfpelt',
    stats: 'STR / AGI', role: L('แลก HP เป็นพลังโจมตี', 'Trades HP for Attack Power'),
    desc: L('นักรบหนังหมาป่า (Úlfhéðnar) ยิ่งบาดเจ็บยิ่งดุร้าย ใช้เลือดตัวเองแลกพลังทำลายล้าง', 'A wolf-pelt warrior (Úlfhéðnar) who grows fiercer with every wound, spending their own blood for devastating power.'),
    skills: ['wolf_blood', 'rage_strike', 'blood_frenzy', 'howl', 'axe_throw', 'bloodthirst'] },
};
const FIRST_JOBS = ['einherjar', 'runecaster', 'wildhunter', 'volva', 'trickster', 'berserker'];
// ===== Class ขั้นที่ 2 — แยก 2 สายต่อ Class แรก (parent = Class แรก ใช้สกิล/อาวุธของ Class แรกได้ต่อ) =====
Object.assign(JOBS, {
  valkyrie: { glow: '#ffd27a', name: 'Valkyrie Knight', thai: L('อัศวินวาลคิรี', 'Chooser of the Slain'), parent: 'einherjar', tier: 2, bonus: { atkPct: 15, matkPct: 10, hit: 10, hpPct: 10 }, hp: 2.1, sp: 1.0, jobMax: 26, aspd: 1150,
    outfit: '#d8dce8', outfit2: '#e0b040', pants: '#4a4f62', cape: '#f0e6c8', jobHat: 'viking',
    stats: 'STR / VIT', role: L('แทงค์ศักดิ์สิทธิ์ ปกป้องและลงทัณฑ์', 'Holy Tank — Protect and Punish'),
    desc: L('ผู้เลือกวิญญาณแห่งสมรภูมิ ถือโล่ทองและหอกแสง ยืนรับแทนทุกคนแล้วฟาดคืนเป็นแผ่นดินไหว', 'Chooser of souls on the battlefield. Bearing a golden shield and a spear of light, she takes every blow for her allies and answers with an earthquake.'),
    skills: ['aegis_wall', 'spear_of_valhalla', 'einherjar_guard', 'judgment_quake', 'valhallas_call'] },
  galdr: { glow: '#9ad8ff', name: 'Galdr Sage', thai: L('ปราชญ์กัลดร์', 'Chanter of Runes'), parent: 'runecaster', tier: 2, bonus: { atkPct: 10, matkPct: 10, hit: 10, hpPct: 10 }, hp: 0.95, sp: 2.4, jobMax: 26, aspd: 1450,
    outfit: '#1e2f6a', outfit2: '#c8e8ff', pants: '#141f44', robe: true, jobHat: 'runehood',
    stats: 'INT / DEX', role: L('เวทวงกว้าง ฝนอุกกาบาตและน้ำแข็ง', 'Wide-Area Magic — Meteors and Frost'),
    desc: L('ผู้ขับขานบทกัลดร์ เสียงร้องของเขาเปลี่ยนรูนให้เป็นพายุ ทำลายทั้งฝูงในคราวเดียว', 'A chanter of galdr verses whose voice turns runes into storms, wiping out entire packs at once.'),
    skills: ['galdr_focus', 'meteor_rune', 'frost_nova', 'chain_lightning', 'rune_barrier'] },
  skadi: { glow: '#b8f0ff', name: 'Skadi Ranger', thai: L('เรนเจอร์แห่งสกาดี', 'Ranger of Skadi'), parent: 'wildhunter', tier: 2, bonus: { atkPct: 20, matkPct: 10, hit: 10, hpPct: 10 }, hp: 1.25, sp: 1.5, jobMax: 26, aspd: 1200,
    outfit: '#e8f0f4', outfit2: '#6aa8c8', pants: '#3a4a58', cape: '#9ac8e0', jobHat: 'hood',
    stats: 'DEX / AGI', role: L('ธนูน้ำแข็ง ห่าธนูวงกว้าง', 'Frost Arrows & Arrow Rain'),
    desc: L('นักล่าแห่งยอดเขาหิมะ สาวกของเทพีสกาดี ลูกธนูของเธอแช่แข็งเหยื่อก่อนจะร่วงลงมาเป็นห่าฝน', 'A hunter of the snowy peaks and follower of the goddess Skadi. Her arrows freeze prey solid before raining down from the sky.'),
    skills: ['skadis_mark', 'arrow_storm', 'frost_arrow', 'focused_volley', 'winter_hunt'] },
  norn: { glow: '#fff0a8', name: 'Norn Oracle', thai: L('นอร์นผู้ทอชะตา', 'Weaver of Fate'), parent: 'volva', tier: 2, bonus: { atkPct: 10, matkPct: 15, hit: 10, hpPct: 10 }, hp: 1.45, sp: 1.9, jobMax: 26, aspd: 1350,
    outfit: '#fbf6ea', outfit2: '#b89ae8', pants: '#7a6a8a', robe: true, jobHat: 'circlet',
    stats: 'INT / VIT', role: L('ฮีลใหญ่ บัฟชะตา แสงพิพากษา', 'Greater Heals, Fate Buffs, Light of Judgment'),
    desc: L('ผู้ทอเส้นด้ายแห่งชะตาร่วมกับสามนอร์นใต้รากต้นไม้ เยียวยาได้แม้ร่างใกล้ดับ และตัดสินศัตรูด้วยแสง', 'One who weaves the threads of fate with the three Norns beneath the World Tree. Mends even bodies on the brink of death, and judges foes with light.'),
    skills: ['wyrd_thread', 'great_restoration', 'fate_weave', 'ragnarok_light', 'skuld_judgment'] },
  phantom: { glow: '#e08aff', name: "Loki's Phantom", thai: L('ภูตลวงแห่งโลกิ', 'Phantom of Deceit'), parent: 'trickster', tier: 2, bonus: { atkPct: 10, matkPct: 10, hit: 10, hpPct: 10 }, hp: 1.45, sp: 1.1, jobMax: 26, aspd: 1100,
    outfit: '#24182e', outfit2: '#d040a0', pants: '#18121e', jobHat: 'mask',
    stats: 'AGI / LUK', role: L('คริติคอลรุนแรง ฟันเงาซ้อน', 'Brutal Crits & Shadow Combos'),
    desc: L('เงาที่โลกิทิ้งไว้ในโลกกลาง หายตัวกลางคมมีด ฟันซ้ำสองครั้งก่อนเหยื่อจะรู้ตัว', 'A shadow Loki left behind in Midgard. Vanishes mid-swing and strikes twice before the prey even knows it.'),
    skills: ['phantom_edge', 'mirror_strike', 'fang_of_fenrir', 'smoke_cyclone', 'trickster_haste'] },
  warlord: { glow: '#ff6a3a', name: 'Ulfhednar Warlord', thai: L('จอมทัพอุลฟ์เฮดนาร์', 'Warlord of the Úlfhéðnar'), parent: 'berserker', tier: 2, bonus: { atkPct: 5, matkPct: 10, hit: 10, hpPct: 10 }, hp: 1.85, sp: 0.8, jobMax: 26, aspd: 1250,
    outfit: '#5a3a24', outfit2: '#2a1a10', pants: '#2a1e14', cape: '#6a2a1a', jobHat: 'wolfpelt',
    stats: 'STR / AGI', role: L('ฟันวงกว้าง ยิ่งเจ็บยิ่งไม่ตาย', 'Wide Cleaves — Deathless in Pain'),
    desc: L('จ่าฝูงแห่งนักรบหนังหมาป่า เลือดของเขาเดือดจนความตายต้องถอยให้ ฟันขวานทีเดียวกวาดทั้งแนว', 'Pack leader of the wolf-pelt warriors. His blood boils so hot that death itself steps aside, and a single swing of his axe sweeps the whole line.'),
    skills: ['berserk_soul', 'fenrir_bite', 'ragnarok_cleave', 'war_howl', 'undying_rage'] },
  // ---- สายที่สอง (2-2) ----
  hersir: { glow: '#ff8060', name: 'Hersir Vanguard', thai: L('แนวหน้าเฮิร์เซียร์', 'Hersir of the Vanguard'), parent: 'einherjar', tier: 2, bonus: { atkPct: 10, matkPct: 10, hit: 10, hpPct: 10 }, hp: 1.9, sp: 0.95, jobMax: 26, aspd: 1100,
    outfit: '#4a505e', outfit2: '#c0302a', pants: '#2a2e38', cape: '#7a1a14', jobHat: 'viking',
    stats: 'STR / VIT', role: L('นักรบบุกทะลวง ดาเมจแรงแต่ยังทน', 'Assault Warrior — Heavy Damage, Still Sturdy'),
    desc: L('ขุนศึกผู้นำทัพบุกก่อนใคร พุ่งชาร์จเข้าใส่และหมุนหอกเจาะแนว ไม่ได้ยืนรับ แต่บุกไปจบเอง', 'A war-chief who leads the charge before anyone else. Rushes in and drives a spinning spear through the line — not one to hold ground, but to end the fight himself.'),
    skills: ['hersir_might', 'charge_strike', 'spiral_pierce', 'battle_aura', 'ragnars_fury'] },
  seidr: { glow: '#c07aff', name: 'Seidr Witch', thai: L('แม่มดเซดร์', 'Witch of Seidr'), parent: 'runecaster', tier: 2, bonus: { atkPct: 10, matkPct: 10, hit: 10, hpPct: 10 }, hp: 1.0, sp: 2.3, jobMax: 26, aspd: 1450,
    outfit: '#2a1840', outfit2: '#a060e0', pants: '#1a1028', robe: true, jobHat: 'runehood',
    stats: 'INT / DEX', role: L('เวทมืด คำสาป พิษ', 'Dark Magic, Curses, Poison'),
    desc: L('ผู้ฝึกเวทเซดร์ต้องห้ามของวานาเฮล์ม ดึงพลังจากความมืดใต้ราก สาปศัตรูให้เปื่อยช้า ๆ แล้วแทงด้วยหอกความว่างเปล่า', 'A practitioner of the forbidden seidr of Vanaheim. Draws power from the darkness beneath the roots, curses foes to wither slowly, then pierces them with a lance of the void.'),
    skills: ['seidr_lore', 'soul_drain', 'hex_of_hel', 'dark_nova', 'void_lance'] },
  ullr: { glow: '#d0ff8a', name: 'Ullr Sniper', thai: L('สไนเปอร์แห่งอุลล์', 'Sniper of Ullr'), parent: 'wildhunter', tier: 2, bonus: { atkPct: 25, matkPct: 10, hit: 10, hpPct: 10 }, hp: 1.2, sp: 1.45, jobMax: 26, aspd: 1200,
    outfit: '#2e4a2a', outfit2: '#d8c070', pants: '#2a2418', cape: '#3a5a2a', jobHat: 'hood',
    stats: 'DEX / LUK', role: L('ยิงไกล เป้าเดียวแรงที่สุด', 'Long Range — Strongest Single Target'),
    desc: L('ศิษย์ของอุลล์เทพแห่งธนูและสกี มองเห็นไกลกว่าใคร ยิงนัดเดียวจบก่อนเหยื่อจะเข้าใกล้', 'A disciple of Ullr, god of the bow and the ski. Sees farther than anyone and ends the hunt with one shot before the prey draws near.'),
    skills: ['ullr_focus', 'sharp_shot', 'snipe', 'wind_walk', 'twin_shot'] },
  gythja: { glow: '#ffc070', name: 'Gythja Monk', thai: L('นักบวชหมัดเทพ', 'Priestess of the Holy Fist'), parent: 'volva', tier: 2, bonus: { atkPct: 15, matkPct: 10, hit: 10, hpPct: 10 }, hp: 1.6, sp: 1.4, jobMax: 26, aspd: 1100,
    outfit: '#f0e2c8', outfit2: '#d07a30', pants: '#6a4a2a', jobHat: 'circlet',
    stats: 'STR / VIT', role: L('นักบวชสายบู๊ หมัดศักดิ์สิทธิ์ระยะประชิด', 'Battle Priest — Holy Melee Fists'),
    desc: L('นักบวชที่เลือกต่อยแทนการอธิษฐาน หมัดของเธออาบแสงศักดิ์สิทธิ์ ปีศาจและอมตะกลัวที่สุด', 'A priestess who chose fists over prayer. Her blows are bathed in holy light — what demons and undead fear most.'),
    skills: ['iron_faith', 'holy_fist', 'triple_palm', 'divine_burst', 'zen_body'] },
  skald: { glow: '#7ad0ff', name: 'Skald Bard', thai: L('สคาลด์ กวีสงคราม', 'Skald, Poet of War'), parent: 'trickster', tier: 2, bonus: { atkPct: 10, matkPct: 10, hit: 10, hpPct: 10 }, hp: 1.35, sp: 1.25, jobMax: 26, aspd: 1150,
    outfit: '#2a3a5a', outfit2: '#e0c060', pants: '#1e2638', cape: '#4a6aa0', jobHat: 'mask',
    stats: 'AGI / DEX', role: L('บทเพลงบัฟ คลื่นเสียงระยะกลาง', 'Buffing Songs & Mid-Range Sound Waves'),
    desc: L('กวีผู้ขับขานตำนานกลางสนามรบ เสียงกลองทำให้ศัตรูมึน บทเพลงทำให้ตัวเองเร็วและแรงขึ้น', 'A poet who sings legends amid battle. The war drum dazes enemies, and the songs make the singer faster and stronger.'),
    skills: ['skald_verse', 'sonic_strike', 'war_drum', 'song_of_battle', 'hymn_of_loki'] },
  jotun: { glow: '#c0a080', name: 'Jotun Breaker', thai: L('ผู้พิฆาตโยตุน', 'Slayer of Giants'), parent: 'berserker', tier: 2, bonus: { atkPct: 10, matkPct: 10, hit: 10, hpPct: 10 }, hp: 1.8, sp: 0.75, jobMax: 26, aspd: 1300,
    outfit: '#6a5a4a', outfit2: '#3a2a1a', pants: '#2a2218', cape: '#4a3a2a', jobHat: 'wolfpelt',
    stats: 'STR / VIT', role: L('ทุบเป้าเดียวแรงที่สุด แลกเลือด', 'Strongest Single-Target Smash, Paid in Blood'),
    desc: L('ผู้ล่ายักษ์น้ำแข็งด้วยมือเปล่าและขวานหนัก ทุบทีเดียวพื้นแยก แต่ทุกทีต้องจ่ายด้วยเลือด', 'A hunter of frost giants armed with bare hands and a heavy axe. One blow splits the earth — but every blow is paid for in blood.'),
    skills: ['jotun_blood', 'titan_smash', 'earth_splitter', 'giants_wrath', 'mountain_heart'] },
});
const SECOND_JOBS = { einherjar: ['valkyrie', 'hersir'], runecaster: ['galdr', 'seidr'], wildhunter: ['skadi', 'ullr'], volva: ['norn', 'gythja'], trickster: ['phantom', 'skald'], berserker: ['warlord', 'jotun'] };
const SECOND_JOB_REQ = { base: 30, job: 26 }; // เปลี่ยน Class ขั้นที่ 2: Base Lv 30 และต้องอัป Job ของ Class แรกให้เต็ม (26) ก่อน
// สาย Class: [Class ปัจจุบัน, Class แรก] — ใช้ตรวจอาวุธ/สกิล/โบนัสประจำสาย
function jobLine(job) { const out = []; for (let j = job; j && JOBS[j]; j = JOBS[j].parent) out.push(j); return out; }
function jobRoot(job) { const l = jobLine(job); return l[l.length - 1]; }
function canJobUse(jobs, job) { return jobs === 'all' || jobLine(job).some(j => jobs.includes(j)); }
const JOB_CHANGE_LV = 10;

const WEAPON_ASPD_MOD = { none: 0.85, dagger: 0.9, sword: 1.0, axe: 1.12, rod: 1.1, bow: 1.05, mace: 1.05 };
const WTYPE_THAI = { none: L('มือเปล่า', 'Unarmed'), dagger: L('มีดสั้น', 'Dagger'), sword: L('ดาบ', 'Sword'), axe: L('ขวาน', 'Axe'), rod: L('คทา', 'Rod'), bow: L('ธนู', 'Bow'), mace: L('กระบอง', 'Mace') };

// ------------------------------------------------------------
//  สกิล (ระบบข้อมูล — สร้างสกิลใหม่ได้โดยเพิ่มรายการที่นี่ แล้วใส่ชื่อในรายการ skills ของ Class)
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
//  vfx: เอฟเฟกต์เฉพาะสกิล (ดู js/fx2.js — ตั้งให้อัตโนมัติจาก FX2.SKILL; ไม่มี = ใช้ fx/selfFx เดิม)
//  chain: true = โจมตีปกติต่อหลังใช้สกิล
// ------------------------------------------------------------
const SKILLS = {
  // ===== Novice =====
  first_aid: { name: 'First Aid', max: 1, type: 'active', target: 'self', icon: '#e0707a', glyph: '+', noLearn: true,
    sp: () => 3, delay: 600, heal: () => 8, selfFx: 'heal',
    desc: L('ปฐมพยาบาล ฟื้นฟู HP 8 หน่วย', 'First aid. Restores 8 HP.') },
  basic_training: { name: 'Basic Training', max: 9, type: 'passive', icon: '#c9a36b', glyph: 'B',
    passive: lv => ({ atk: 2 * lv, hpPct: 2 * lv }),
    desc: L('ฝึกฝนพื้นฐาน ATK +2 และ MaxHP +2% ต่อเลเวล', 'Basic training. ATK +2 and MaxHP +2% per level.') },

  // ===== Einherjar =====
  iron_body: { name: 'Iron Body', max: 5, type: 'passive', icon: '#9aa4b4', glyph: '⛨',
    passive: lv => ({ hpPct: 5 * lv, def: lv, atk: 5 * lv, hit: 2 * lv }),
    desc: L('ร่างเหล็ก MaxHP +5%, DEF +1, ATK +5 และ HIT +2 ต่อเลเวล (Einherjar: VIT ช่วยเพิ่มแรงตีด้วย)', 'Iron frame. MaxHP +5%, DEF +1, ATK +5 and HIT +2 per level (Einherjar: VIT also adds attack power).') },
  shield_slam: { name: 'Shield Slam', max: 5, type: 'active', target: 'enemy', melee: true, icon: '#c8a040', glyph: '◘',
    sp: lv => 6 + Math.ceil(lv / 2), delay: 700, chain: true, fx: 'bash',
    dmg: { type: 'phys', mult: lv => 2.0 + 0.4 * lv, status: { kind: 'stun', chance: lv => 30 + 10 * lv, dur: () => 2 } },
    desc: L('ฟาดโล่ใส่ศัตรู 240~400% โอกาสทำให้มึน 2 วินาที', 'Slams a shield into the enemy for 240~400%, with a chance to stun for 2 seconds.') },
  war_cry: { name: 'War Cry', max: 5, type: 'active', target: 'self', icon: '#d05040', glyph: '!',
    sp: () => 15, delay: 1000, aggro: 6, selfFx: 'shout',
    buff: { dur: lv => 20 + 5 * lv, stats: lv => ({ def: 4 * lv, mdef: 2 * lv }) },
    desc: L('คำรามท้าทาย ดึงมอนสเตอร์รอบตัว 6 ช่องเข้าหา และเพิ่ม DEF +4×Lv', 'A challenging roar. Pulls monsters within 6 cells toward you and grants DEF +4×Lv.') },
  whirlwind: { name: 'Whirlwind', max: 5, type: 'active', target: 'self', icon: '#e0e0f0', glyph: '✺',
    sp: lv => 14 + 2 * lv, delay: 1200, selfFx: 'whirl',
    dmg: { type: 'phys', mult: lv => 1.4 + 0.3 * lv, area: 2, at: 'self', knockback: 1 },
    desc: L('หมุนตัวฟันทุกตัวรอบกาย 2 ช่อง 170~290% และผลักถอย', 'Spin and slash every enemy within 2 cells for 170~290%, knocking them back.') },

  // ===== Rune Caster =====
  rune_mastery: { name: 'Rune Mastery', max: 5, type: 'passive', icon: '#6aa0ff', glyph: 'ᚱ',
    passive: lv => ({ matkPct: 5 * lv, castPct: 6 * lv }),
    desc: L('ชำนาญรูน MATK +5% และลดเวลาร่าย 6% ต่อเลเวล', 'Rune mastery. MATK +5% and cast time -6% per level.') },
  fire_rune: { name: 'Fire Rune', max: 5, type: 'active', target: 'enemy', range: 9, icon: '#f05a28', glyph: 'ᚲ',
    sp: lv => 10 + 3 * lv, cast: lv => 700 + 100 * lv, delay: 700, fx: 'firebolt',
    dmg: { type: 'magic', element: 'fire', mult: lv => 1.3 + 0.3 * lv, status: { kind: 'burn', chance: () => 100, dur: lv => 2 + lv } },
    desc: L('รูนเพลิง 160~280% MATK ธาตุไฟ และเผาไหม้ต่อเนื่อง', 'A rune of flame dealing 160~280% MATK Fire damage and burning over time.') },
  ice_rune: { name: 'Ice Rune', max: 5, type: 'active', target: 'enemy', range: 9, icon: '#50b8f0', glyph: 'ᛁ',
    sp: lv => 10 + 3 * lv, cast: lv => 600 + 100 * lv, delay: 700, fx: 'coldbolt',
    dmg: { type: 'magic', element: 'water', mult: lv => 1.1 + 0.25 * lv, status: { kind: 'slow', chance: () => 100, dur: lv => 3 + lv } },
    desc: L('หอกน้ำแข็ง 135~235% MATK ธาตุน้ำ และทำให้ศัตรูช้าลงครึ่งหนึ่ง', "A lance of ice dealing 135~235% MATK Water damage and halving the enemy's speed.") },
  thunder_rune: { name: 'Thunder Rune', max: 5, type: 'active', target: 'enemy', range: 9, icon: '#e8e050', glyph: 'ᚦ',
    sp: lv => 22 + 5 * lv, cast: lv => 1300 + 100 * lv, delay: 1500, fx: 'lightning',
    dmg: { type: 'magic', element: 'wind', mult: lv => 0.9 + 0.2 * lv, area: 2, at: 'target' },
    desc: L('สายฟ้าแห่งธอร์ ฟาดทุกตัวในรัศมี 2 ช่องรอบเป้าหมาย 110~190% ธาตุลม', "Thor's lightning strikes everything within 2 cells of the target for 110~190% Wind damage.") },

  // ===== Wildhunter =====
  eagle_eye: { name: 'Eagle Eye', max: 5, type: 'passive', icon: '#a07a50', glyph: '◉',
    passive: lv => ({ range: lv, hit: 3 * lv, dex: lv }),
    desc: L('ตาเหยี่ยว ระยะธนู +1 ช่อง, HIT +3, DEX +1 ต่อเลเวล', 'Eagle eye. Bow range +1 cell, HIT +3 and DEX +1 per level.') },
  piercing_arrow: { name: 'Piercing Arrow', max: 5, type: 'active', target: 'enemy', bow: true, icon: '#d0a050', glyph: '➳',
    sp: () => 3, delay: 600, chain: true, fx: 'arrow',
    dmg: { type: 'phys', mult: lv => 1.2 + 0.2 * lv, line: true },
    desc: L('ยิงธนูทะลุทุกตัวในแนวเส้นตรง 140~220% (ต้องใช้ธนู)', 'Fires an arrow that pierces every enemy in a straight line for 140~220% (bow required).') },
  wolf_companion: { name: 'Wolf Companion', max: 5, type: 'active', target: 'self', icon: '#b0b0c0', glyph: '🐺',
    sp: () => 6, delay: 1000, special: 'summon_wolf', dur: lv => 60 + 24 * lv,
    desc: L('เรียกหมาป่าคู่ใจ 84~180 วินาที มี HP ตามเลเวลสกิลและ MaxHP ของเรา ตามข้ามแผนที่ หายเมื่อตายหรือหมดเวลา เรียกซ้ำต่อเวลาให้ตัวเดิมโดยไม่ฟื้นเลือด', 'Summons a loyal wolf for 84~180 seconds, with HP based on skill level and your MaxHP. Follows across maps; leaves only on death or expiry. Recasting refreshes its duration without healing.') },
  blast_trap: { name: 'Blast Trap', max: 5, type: 'active', target: 'self', icon: '#e08030', glyph: '✱',
    sp: () => 3, delay: 500, special: 'trap',
    desc: L('วางกับดักระเบิดที่เท้า (สูงสุด 3 อัน) ระเบิดไฟรัศมี 1.5 ช่อง แรงตาม DEX', 'Sets an explosive trap at your feet (max 3). Detonates in a 1.5-cell Fire blast; damage scales with DEX.') },

  // ===== Völva =====
  sanctuary: { name: 'Sanctuary', max: 5, type: 'passive', icon: '#a0f0b0', glyph: '✥',
    passive: lv => ({ regenPct: 1 + 0.5 * lv, mdef: lv }),
    desc: L('แสงคุ้มครอง ฟื้นฟู HP เพิ่ม 1.5~3.5% ของ MaxHP ทุกรอบ, MDEF +1 ต่อเลเวล', 'Protective light. Restores an extra 1.5~3.5% of MaxHP each regen tick, MDEF +1 per level.') },
  light_of_freyja: { name: 'Light of Freyja', max: 5, type: 'active', target: 'self', icon: '#70e070', glyph: '✚',
    sp: lv => 10 + 4 * lv, delay: 1000, selfFx: 'heal',
    heal: (lv, d, p) => Math.floor((4 + (p.baseLv + d.int) / 8) * (10 + 14 * lv)),
    desc: L('แสงของเทพีเฟรยา ฟื้นฟู HP ตาม Base Lv และ INT (คลิกมอนสเตอร์อมตะเพื่อทำร้าย)', "Freyja's light. Restores HP based on Base Lv and INT (click an undead monster to damage it).") },
  blessing_of_odin: { name: 'Blessing of Odin', max: 5, type: 'active', target: 'self', icon: '#f0d060', glyph: '☼',
    sp: lv => 20 + 4 * lv, delay: 1000, selfFx: 'buff',
    buff: { dur: lv => 60 + 30 * lv, stats: lv => ({ str: 2 * lv, int: 2 * lv, dex: 2 * lv }) },
    desc: L('พรแห่งโอดิน STR, INT, DEX +2×Lv นาน 90~210 วินาที', 'Blessing of Odin. STR, INT, DEX +2×Lv for 90~210 seconds.') },
  holy_spear: { name: 'Holy Spear', max: 5, type: 'active', target: 'enemy', range: 9, icon: '#fff6c0', glyph: '✧',
    sp: lv => 12 + 3 * lv, cast: () => 1000, delay: 800, fx: 'holy',
    dmg: { type: 'magic', element: 'holy', mult: lv => 1.3 + 0.3 * lv },
    desc: L('หอกแสงศักดิ์สิทธิ์ 160~280% MATK รุนแรงมากกับอมตะ', 'A spear of holy light dealing 160~280% MATK. Devastating against undead.') },

  // ===== Loki's Trickster =====
  shadow_step: { name: 'Shadow Step', max: 5, type: 'passive', icon: '#90e0b0', glyph: '↯',
    passive: lv => ({ flee: 5 * lv, crit: 2 * lv, atk: 4 * lv }),
    desc: L('ก้าวเงา FLEE +5, CRIT +2 และ ATK +4 ต่อเลเวล', 'Shadow step. FLEE +5, CRIT +2 and ATK +4 per level.') },
  backstab: { name: 'Backstab', max: 5, type: 'active', target: 'enemy', melee: true, icon: '#c05070', glyph: '†',
    sp: () => 15, delay: 900, chain: true, fx: 'slash',
    dmg: { type: 'phys', mult: lv => 2.0 + 0.5 * lv, multAware: lv => 1.6 + 0.3 * lv, sureHit: true },
    desc: L('แทงข้างหลัง 250~450% ถ้าศัตรูยังไม่ได้สู้กับคุณ (ถ้ากำลังสู้อยู่ 190~310%) ไม่มีพลาด', 'Stab from behind for 250~450% if the enemy has not yet engaged you (190~310% if already in combat). Never misses.') },
  smoke_veil: { name: 'Smoke Veil', max: 5, type: 'active', target: 'self', icon: '#8080a0', glyph: '☁',
    sp: () => 20, delay: 1500, special: 'stealth', dur: lv => 3 + lv,
    desc: L('หายตัวในม่านควัน 4~8 วินาที มอนสเตอร์ลืมคุณ และการโจมตีแรกจะคริติคอลแน่นอน', 'Vanish into a veil of smoke for 4~8 seconds. Monsters lose track of you, and your first attack is a guaranteed critical.') },
  venom_blade: { name: 'Venom Blade', max: 5, type: 'active', target: 'self', icon: '#70c040', glyph: '☠',
    sp: () => 20, delay: 1000, selfFx: 'buff',
    buff: { dur: lv => 30 + 10 * lv, stats: lv => ({ atk: 8 * lv, venom: 10 + 5 * lv }) },
    desc: L('อาบพิษบนอาวุธ ATK +8×Lv และโอกาสทำให้ติดพิษทุกครั้งที่โจมตี', 'Coat your weapon in venom. ATK +8×Lv and a chance to poison on every hit.') },

  // ===== Berserker =====
  wolf_blood: { name: 'Wolf Blood', max: 5, type: 'passive', icon: '#c04040', glyph: 'ᚹ',
    passive: lv => ({ rage: 10 * lv, hpPct: 2 * lv }),
    desc: L('เลือดหมาป่า ยิ่ง HP น้อยยิ่งตีแรง (สูงสุด +10%×Lv เมื่อใกล้ตาย), MaxHP +2%×Lv', 'Wolf blood. The lower your HP, the harder you hit (up to +10%×Lv near death). MaxHP +2%×Lv.') },
  rage_strike: { name: 'Rage Strike', max: 5, type: 'active', target: 'enemy', melee: true, icon: '#e04020', glyph: '⚡',
    sp: () => 5, hpCost: () => 5, delay: 600, chain: true, fx: 'bash',
    dmg: { type: 'phys', mult: lv => 1.6 + 0.3 * lv },
    desc: L('ฟาดสุดแรง 190~310% โดยแลกกับ HP 5% ของ HP ปัจจุบัน', 'An all-out strike for 190~310% at the cost of 5% of current HP.') },
  blood_frenzy: { name: 'Blood Frenzy', max: 5, type: 'active', target: 'self', icon: '#b02030', glyph: '♨',
    sp: () => 10, hpCost: () => 10, delay: 1000, selfFx: 'buff',
    buff: { dur: lv => 30 + 10 * lv, stats: lv => ({ aspdPct: 5 + 3 * lv, atk: 5 * lv }) },
    desc: L('คลั่งเลือด เสีย HP 10% แลกกับความเร็วโจมตี +8~20% และ ATK +5×Lv', 'Blood frenzy. Sacrifice 10% HP for attack speed +8~20% and ATK +5×Lv.') },
  howl: { name: 'Howl', max: 5, type: 'active', target: 'self', icon: '#d0c0a0', glyph: 'ᚺ',
    sp: () => 20, delay: 1500, selfFx: 'howl',
    dmg: { type: 'phys', mult: lv => 1.0 + 0.15 * lv, area: 2.5, at: 'self', status: { kind: 'stun', chance: () => 70, dur: lv => 1 + 0.5 * lv } },
    desc: L('หอนสะท้านป่า ทำร้ายรอบตัว 2.5 ช่อง 115~175% และทำให้ศัตรูหวาดกลัว (มึน)', 'A forest-shaking howl that deals 115~175% within 2.5 cells and terrifies enemies (stun).') },

  // ===== สกิลติดตัวชุดที่ 2 (Job Lv 21–26) =====
  valhalla_oath: { name: "Valhalla's Oath", max: 5, type: 'passive', icon: '#e0b050', glyph: 'ᛟ', req: { iron_body: 3 },
    passive: lv => ({ spCostPct: -4 * lv, stunRes: 8 * lv, sp: 4 * lv }),
    desc: L('คำสาบานแห่งวัลฮัลลา สกิลใช้ SP น้อยลง 4%×Lv, ต้านมึน +8%×Lv และ MaxSP +4×Lv', 'Oath of Valhalla. Skill SP cost -4%×Lv, stun resistance +8%×Lv and MaxSP +4×Lv.') },
  runic_ward: { name: 'Runic Ward', max: 5, type: 'passive', icon: '#7ab0ff', glyph: 'ᛉ', req: { rune_mastery: 3 },
    passive: lv => ({ hpPct: 4 * lv, spPct: 4 * lv, mdef: 2 * lv }),
    desc: L('เกราะรูนรอบกาย MaxHP +4%×Lv, MaxSP +4%×Lv และ MDEF +2×Lv (ตัวบางน้อยลง)', 'A ward of runes around the body. MaxHP +4%×Lv, MaxSP +4%×Lv and MDEF +2×Lv (less fragile).') },
  hunters_rhythm: { name: "Hunter's Rhythm", max: 5, type: 'passive', icon: '#9ad070', glyph: 'ᛋ', req: { eagle_eye: 3 },
    passive: lv => ({ aspdPct: 2 * lv, critDmgPct: 4 * lv }),
    desc: L('จังหวะนักล่า ความเร็วโจมตี +2%×Lv และแรงคริติคอล +4%×Lv', "Hunter's rhythm. Attack speed +2%×Lv and critical damage +4%×Lv.") },
  freyjas_grace: { name: "Freyja's Grace", max: 5, type: 'passive', icon: '#ffe8a0', glyph: 'ᛒ', req: { sanctuary: 3 },
    passive: lv => ({ healPct: 6 * lv, spPct: 4 * lv, mdef: lv }),
    desc: L('พรแห่งเฟรยา ฮีลแรงขึ้น 6%×Lv, MaxSP +4%×Lv และ MDEF +1×Lv', "Freyja's blessing. Healing +6%×Lv, MaxSP +4%×Lv and MDEF +1×Lv.") },
  lokis_gambit: { name: "Loki's Gambit", max: 5, type: 'passive', icon: '#b07ae0', glyph: 'ᛚ', req: { shadow_step: 3 },
    passive: lv => ({ critDmgPct: 6 * lv, crit: lv, speedPct: 2 * lv }),
    desc: L('เล่ห์กลของโลกิ แรงคริติคอล +6%×Lv, CRIT +1×Lv และเดินเร็วขึ้น 2%×Lv', "Loki's cunning. Critical damage +6%×Lv, CRIT +1×Lv and movement speed +2%×Lv.") },
  bloodthirst: { name: 'Bloodthirst', max: 5, type: 'passive', icon: '#a02030', glyph: 'ᛞ', req: { wolf_blood: 3 },
    passive: lv => ({ leech: 0.6 * lv, atkPct: 2 * lv }),
    desc: L('กระหายเลือด ดาเมจกายภาพดูดกลับเป็น HP 0.6%×Lv และดาเมจกายภาพ +2%×Lv', 'Bloodthirst. Physical damage drains 0.6%×Lv as HP, and physical damage +2%×Lv.') },

  // ===== สกิลที่ 6 ของ Class แรก (แต้มมีแค่ 25 จาก 30 ช่อง — ต้องเลือกเอง) =====
  shield_throw: { name: 'Shield Throw', max: 5, type: 'active', target: 'enemy', range: 6, icon: '#b0a070', glyph: '◎', req: { shield_slam: 1 },
    sp: lv => 8 + lv, delay: 700, chain: true, fx: 'bash',
    dmg: { type: 'phys', mult: lv => 1.6 + 0.3 * lv, status: { kind: 'slow', chance: () => 100, dur: () => 2 } },
    desc: L('ขว้างโล่ใส่ศัตรูระยะ 6 ช่อง 190~310% ทำให้ช้าลง (ดึงมอนจากไกลได้)', 'Hurls a shield at an enemy up to 6 cells away for 190~310%, slowing it (great for pulling from range).') },
  earth_rune: { name: 'Earth Rune', max: 5, type: 'active', target: 'enemy', range: 9, icon: '#a08050', glyph: 'ᛖ', req: { fire_rune: 1 },
    sp: lv => 12 + 3 * lv, cast: lv => 800 + 80 * lv, delay: 800, fx: 'firebolt',
    dmg: { type: 'magic', element: 'earth', mult: lv => 1.2 + 0.25 * lv, area: 1.5, at: 'target', status: { kind: 'stun', chance: lv => 15 + 5 * lv, dur: () => 1.5 } },
    desc: L('รูนแผ่นดินยกหินขึ้นรอบเป้า 1.5 ช่อง 145~245% ธาตุดิน อาจทำให้มึน', 'A rune of earth raises stone within 1.5 cells of the target for 145~245% Earth damage. May stun.') },
  charge_arrow: { name: 'Charge Arrow', max: 5, type: 'active', target: 'enemy', bow: true, icon: '#c09060', glyph: '⇥', req: { piercing_arrow: 1 },
    sp: () => 4, delay: 600, chain: true, fx: 'arrow',
    dmg: { type: 'phys', mult: lv => 1.5 + 0.3 * lv, knockback: 3 },
    desc: L('ลูกธนูอัดแรง 180~300% ผลักศัตรูถอย 3 ช่อง (เว้นระยะ)', 'A charged arrow dealing 180~300% that knocks the enemy back 3 cells (keep your distance).') },
  divine_shield: { name: 'Divine Shield', max: 5, type: 'active', target: 'self', icon: '#c0e0ff', glyph: '⛉', req: { light_of_freyja: 1 },
    sp: lv => 20 + 2 * lv, delay: 1000, selfFx: 'buff',
    buff: { dur: lv => 60 + 20 * lv, stats: lv => ({ def: 4 * lv, mdef: 4 * lv }) },
    desc: L('โล่ศักดิ์สิทธิ์ DEF +4×Lv และ MDEF +4×Lv', 'Divine shield. DEF +4×Lv and MDEF +4×Lv.') },
  throwing_knife: { name: 'Throwing Knife', max: 5, type: 'active', target: 'enemy', range: 6, icon: '#c0c0d0', glyph: '⟋', req: { backstab: 1 },
    sp: () => 8, delay: 500, chain: true, fx: 'slash',
    dmg: { type: 'phys', mult: lv => 1.4 + 0.3 * lv, status: { kind: 'poison', chance: lv => 20 + 6 * lv, dur: () => 5 } },
    desc: L('ปามีดระยะ 6 ช่อง 170~290% มีโอกาสติดพิษ', 'Throws a knife up to 6 cells for 170~290%, with a chance to poison.') },
  axe_throw: { name: 'Axe Throw', max: 5, type: 'active', target: 'enemy', range: 5, icon: '#c07040', glyph: '⟲', req: { rage_strike: 1 },
    sp: () => 6, hpCost: () => 3, delay: 700, chain: true, fx: 'bash',
    dmg: { type: 'phys', mult: lv => 1.8 + 0.35 * lv },
    desc: L('ขว้างขวานระยะ 5 ช่อง 215~355% เสีย HP 3%', 'Hurls an axe up to 5 cells for 215~355%. Costs 3% HP.') },
  // ===================== Class ขั้นที่ 2 =====================
  // ===== Valkyrie Knight =====
  aegis_wall: { name: 'Aegis Wall', max: 5, type: 'passive', icon: '#e8d080', glyph: '⛉',
    passive: lv => ({ def: 3 * lv, mdef: 2 * lv, hpPct: 4 * lv }),
    desc: L('กำแพงอีจิส DEF +3×Lv, MDEF +2×Lv และ MaxHP +4%×Lv', 'Aegis wall. DEF +3×Lv, MDEF +2×Lv and MaxHP +4%×Lv.') },
  spear_of_valhalla: { name: 'Spear of Valhalla', max: 5, type: 'active', target: 'enemy', range: 4, icon: '#ffe08a', glyph: '↟', req: { aegis_wall: 1 },
    sp: lv => 8 + 2 * lv, delay: 700, chain: true, fx: 'holy',
    dmg: { type: 'phys', element: 'holy', mult: lv => 2.3 + 0.4 * lv, line: true },
    desc: L('พุ่งหอกแสงทะลุแนวศัตรูระยะ 4 ช่อง 270~430% ธาตุศักดิ์สิทธิ์', 'Thrusts a spear of light through the enemy line up to 4 cells for 270~430% Holy damage.') },
  einherjar_guard: { name: 'Einherjar Guard', max: 5, type: 'active', target: 'self', icon: '#c8b070', glyph: '⛨', req: { aegis_wall: 3 },
    sp: () => 25, delay: 1000, aggro: 7, selfFx: 'shout',
    buff: { dur: lv => 40 + 10 * lv, stats: lv => ({ def: 5 * lv, mdef: 3 * lv, stunRes: 10 * lv }) },
    desc: L('ตั้งการ์ดวิญญาณนักรบ ดึงศัตรูรอบ 7 ช่อง DEF +5×Lv, MDEF +3×Lv และต้านมึน +10%×Lv', 'Raise the guard of the warrior souls. Pulls enemies within 7 cells; DEF +5×Lv, MDEF +3×Lv and stun resistance +10%×Lv.') },
  judgment_quake: { name: 'Judgment Quake', max: 5, type: 'active', target: 'self', icon: '#d0a040', glyph: '⌇', req: { spear_of_valhalla: 3 },
    sp: lv => 24 + 3 * lv, delay: 1200, selfFx: 'whirl',
    dmg: { type: 'phys', mult: lv => 1.5 + 0.3 * lv, area: 3, at: 'self', status: { kind: 'stun', chance: lv => 20 + 8 * lv, dur: () => 1.5 } },
    desc: L('กระแทกโล่ลงดิน แผ่นดินไหวรอบตัว 3 ช่อง 180~300% อาจทำให้มึน', 'Slams the shield into the ground, quaking everything within 3 cells for 180~300%. May stun.') },
  valhallas_call: { name: "Valhalla's Call", max: 5, type: 'active', target: 'self', icon: '#fff0c0', glyph: '✚', req: { einherjar_guard: 2 },
    sp: lv => 20 + 4 * lv, delay: 1000, selfFx: 'heal',
    heal: (lv, d, p) => Math.floor(d.maxHp * (0.08 + 0.03 * lv)),
    desc: L('เสียงเรียกจากวัลฮัลลา ฟื้นฟู HP 11~23% ของ MaxHP', 'The call of Valhalla. Restores 11~23% of MaxHP.') },

  // ===== Galdr Sage =====
  galdr_focus: { name: 'Galdr Focus', max: 5, type: 'passive', icon: '#8ac8ff', glyph: 'ᚷ',
    passive: lv => ({ matkPct: 4 * lv, spPct: 4 * lv, castPct: 3 * lv }),
    desc: L('สมาธิแห่งบทขับ MATK +4%×Lv, MaxSP +4%×Lv และร่ายเร็วขึ้น 3%×Lv', 'Focus of the chant. MATK +4%×Lv, MaxSP +4%×Lv and casting speed +3%×Lv.') },
  meteor_rune: { name: 'Meteor Rune', max: 5, type: 'active', target: 'enemy', range: 9, icon: '#ff7a3a', glyph: '☄', req: { galdr_focus: 1 },
    sp: lv => 30 + 5 * lv, cast: lv => 1700 + 100 * lv, delay: 1300, fx: 'firebolt',
    dmg: { type: 'magic', element: 'fire', mult: lv => 1.5 + 0.35 * lv, area: 2.5, at: 'target', status: { kind: 'burn', chance: () => 50, dur: () => 3 } },
    desc: L('เรียกอุกกาบาตรูนตกใส่ รัศมี 2.5 ช่อง 185~325% ธาตุไฟ อาจติดไฟ', 'Calls down a rune meteor in a 2.5-cell radius for 185~325% Fire damage. May ignite.') },
  frost_nova: { name: 'Frost Nova', max: 5, type: 'active', target: 'self', icon: '#9ae0ff', glyph: '❄', req: { galdr_focus: 2 },
    sp: lv => 22 + 3 * lv, cast: () => 500, delay: 1000, selfFx: 'firering',
    dmg: { type: 'magic', element: 'water', mult: lv => 1.2 + 0.25 * lv, area: 3, at: 'self', status: { kind: 'slow', chance: () => 100, dur: () => 4 } },
    desc: L('ระเบิดน้ำแข็งรอบตัว 3 ช่อง 145~245% และทำให้ศัตรูช้าลง', 'An icy blast within 3 cells for 145~245%, slowing enemies.') },
  chain_lightning: { name: 'Chain Lightning', max: 5, type: 'active', target: 'enemy', range: 9, icon: '#f0f070', glyph: 'ϟ', req: { meteor_rune: 2 },
    sp: lv => 18 + 3 * lv, cast: lv => 800 + 60 * lv, delay: 800, fx: 'lightning',
    dmg: { type: 'magic', element: 'wind', mult: lv => 0.65 + 0.15 * lv, hits: 3 },
    desc: L('สายฟ้าฟาดซ้ำ 3 ครั้ง ครั้งละ 80~140% ธาตุลม', 'Lightning that strikes 3 times for 80~140% each, Wind element.') },
  rune_barrier: { name: 'Rune Barrier', max: 5, type: 'active', target: 'self', icon: '#7aa0ff', glyph: '◈', req: { galdr_focus: 3 },
    sp: () => 30, delay: 1000, selfFx: 'buff',
    buff: { dur: lv => 60 + 15 * lv, stats: lv => ({ mdef: 4 * lv, def: 3 * lv, hpPct: 3 * lv }) },
    desc: L('ม่านรูนป้องกัน MDEF +4×Lv, DEF +3×Lv และ MaxHP +3%×Lv', 'A protective rune barrier. MDEF +4×Lv, DEF +3×Lv and MaxHP +3%×Lv.') },

  // ===== Skadi Ranger =====
  skadis_mark: { name: "Skadi's Mark", max: 5, type: 'passive', icon: '#a8e0f0', glyph: '❆',
    passive: lv => ({ crit: 3 * lv, critDmgPct: 5 * lv, hit: 3 * lv, aspdPct: 3 * lv }),
    desc: L('ตราแห่งสกาดี CRIT +3×Lv, แรงคริติคอล +5%×Lv, HIT +3×Lv และความเร็วโจมตี +3%×Lv', "Skadi's mark. CRIT +3×Lv, critical damage +5%×Lv, HIT +3×Lv and attack speed +3%×Lv.") },
  arrow_storm: { name: 'Arrow Storm', max: 5, type: 'active', target: 'enemy', bow: true, icon: '#d8c080', glyph: '⇶', req: { skadis_mark: 1 },
    sp: lv => 15 + 2 * lv, delay: 600, chain: true, fx: 'arrow',
    dmg: { type: 'phys', mult: lv => 1.9 + 0.4 * lv, area: 2.5, at: 'target' },
    desc: L('ยิงห่าธนูลงพื้นที่ รัศมี 2.5 ช่อง 230~390%', 'Rains arrows over a 2.5-cell radius for 230~390%.') },
  frost_arrow: { name: 'Frost Arrow', max: 5, type: 'active', target: 'enemy', bow: true, icon: '#8ad8ff', glyph: '➶', req: { skadis_mark: 2 },
    sp: lv => 10 + lv, delay: 500, chain: true, fx: 'coldbolt',
    dmg: { type: 'phys', mult: lv => 2.3 + 0.4 * lv, status: { kind: 'slow', chance: () => 100, dur: () => 3 } },
    desc: L('ลูกธนูน้ำแข็ง 270~430% ทำให้ช้าลง 3 วินาที', 'A frost arrow dealing 270~430% and slowing for 3 seconds.') },
  focused_volley: { name: 'Focused Volley', max: 5, type: 'active', target: 'enemy', bow: true, icon: '#f0d090', glyph: '⋙', req: { arrow_storm: 2 },
    sp: lv => 16 + 2 * lv, delay: 700, chain: true, fx: 'arrow',
    dmg: { type: 'phys', mult: lv => 0.85 + 0.15 * lv, hits: 3, sureHit: true },
    desc: L('ยิงรัว 3 ดอกไม่พลาด ดอกละ 100~160%', 'Looses 3 arrows in rapid succession that never miss, 100~160% each.') },
  winter_hunt: { name: 'Winter Hunt', max: 5, type: 'active', target: 'self', icon: '#c0f0ff', glyph: '❅', req: { skadis_mark: 3 },
    sp: () => 30, delay: 1000, selfFx: 'buff',
    buff: { dur: lv => 40 + 10 * lv, stats: lv => ({ aspdPct: 4 + 3 * lv, dex: 2 * lv }) },
    desc: L('จังหวะล่าแห่งฤดูหนาว ความเร็วโจมตี +7~19% และ DEX +2×Lv', 'Rhythm of the winter hunt. Attack speed +7~19% and DEX +2×Lv.') },

  // ===== Norn Oracle =====
  wyrd_thread: { name: 'Wyrd Thread', max: 5, type: 'passive', icon: '#d8c0ff', glyph: 'ᚹ',
    passive: lv => ({ healPct: 5 * lv, int: 2 * lv, mdef: lv }),
    desc: L('เส้นด้ายแห่งเวิร์ด ฮีลแรงขึ้น 5%×Lv, INT +2×Lv และ MDEF +1×Lv', 'Thread of wyrd. Healing +5%×Lv, INT +2×Lv and MDEF +1×Lv.') },
  great_restoration: { name: 'Great Restoration', max: 5, type: 'active', target: 'self', icon: '#a0ffc0', glyph: '✙', req: { wyrd_thread: 1 },
    sp: lv => 25 + 6 * lv, cast: () => 600, delay: 1200, selfFx: 'heal',
    heal: (lv, d, p) => Math.floor((6 + (p.baseLv + d.int) / 6) * (14 + 18 * lv)),
    desc: L('ฟื้นฟูครั้งใหญ่ HP มากกว่า Light of Freyja ราว 1.5 เท่า (ขึ้นกับ INT)', 'A great restoration. Restores about 1.5× the HP of Light of Freyja (scales with INT).') },
  fate_weave: { name: 'Fate Weave', max: 5, type: 'active', target: 'self', icon: '#ffe0a0', glyph: '☸', req: { wyrd_thread: 2 },
    sp: lv => 30 + 4 * lv, delay: 1000, selfFx: 'buff',
    buff: { dur: lv => 90 + 30 * lv, stats: lv => ({ agi: 2 * lv, vit: 2 * lv, luk: 2 * lv, flee: 2 * lv }) },
    desc: L('ทอชะตาให้ตนเอง AGI, VIT, LUK +2×Lv และ FLEE +2×Lv (ซ้อนกับ Blessing of Odin ได้)', 'Weave your own fate. AGI, VIT, LUK +2×Lv and FLEE +2×Lv (stacks with Blessing of Odin).') },
  ragnarok_light: { name: 'Ragnarok Light', max: 5, type: 'active', target: 'enemy', range: 9, icon: '#fff8d0', glyph: '✺', req: { wyrd_thread: 3 },
    sp: lv => 26 + 4 * lv, cast: () => 1200, delay: 1100, fx: 'holy',
    dmg: { type: 'magic', element: 'holy', mult: lv => 1.3 + 0.3 * lv, area: 2, at: 'target' },
    desc: L('แสงแห่งวันสิ้นโลกตกลงพื้นที่ รัศมี 2 ช่อง 160~280% ธาตุศักดิ์สิทธิ์', 'The light of the end of days falls on a 2-cell radius for 160~280% Holy damage.') },
  skuld_judgment: { name: "Skuld's Judgment", max: 5, type: 'active', target: 'enemy', range: 9, icon: '#ffffff', glyph: '⚖', req: { ragnarok_light: 2 },
    sp: lv => 22 + 4 * lv, cast: () => 1300, delay: 900, fx: 'holy',
    dmg: { type: 'magic', element: 'holy', mult: lv => 2.4 + 0.5 * lv, sureHit: true },
    desc: L('คำพิพากษาของสคูลด์ เป้าเดียว 290~490% ธาตุศักดิ์สิทธิ์ ไม่พลาด', "Skuld's judgment. Single target, 290~490% Holy damage. Never misses.") },

  // ===== Loki's Phantom =====
  phantom_edge: { name: 'Phantom Edge', max: 5, type: 'passive', icon: '#d07ae0', glyph: '⟡',
    passive: lv => ({ critDmgPct: 5 * lv, agi: 2 * lv, aspdPct: 2 * lv }),
    desc: L('คมเงา แรงคริติคอล +5%×Lv, AGI +2×Lv และความเร็วโจมตี +2%×Lv', 'Shadow edge. Critical damage +5%×Lv, AGI +2×Lv and attack speed +2%×Lv.') },
  mirror_strike: { name: 'Mirror Strike', max: 5, type: 'active', target: 'enemy', melee: true, icon: '#e090f0', glyph: '⚔', req: { phantom_edge: 1 },
    sp: lv => 10 + 2 * lv, delay: 550, chain: true, fx: 'slash',
    dmg: { type: 'phys', mult: lv => 1.5 + 0.3 * lv, hits: 2, sureHit: true },
    desc: L('ร่างเงาฟันซ้อน 2 ครั้ง ครั้งละ 180~300% ไม่พลาด', 'A shadow double strikes twice, 180~300% each. Never misses.') },
  fang_of_fenrir: { name: 'Fang of Fenrir', max: 5, type: 'active', target: 'enemy', melee: true, icon: '#a03070', glyph: '⟆', req: { mirror_strike: 2 },
    sp: lv => 20 + 3 * lv, delay: 800, chain: true, fx: 'slash',
    dmg: { type: 'phys', mult: lv => 3.0 + 0.6 * lv, status: { kind: 'poison', chance: lv => 40 + 10 * lv, dur: () => 6 } },
    desc: L('แทงด้วยเขี้ยวเฟนเรียร์ 360~600% มีโอกาสติดพิษ', "Pierce with Fenrir's fang for 360~600%, with a chance to poison.") },
  smoke_cyclone: { name: 'Smoke Cyclone', max: 5, type: 'active', target: 'self', icon: '#9080b0', glyph: '꩜', req: { phantom_edge: 2 },
    sp: lv => 20 + 2 * lv, delay: 1000, selfFx: 'whirl',
    dmg: { type: 'phys', mult: lv => 1.2 + 0.25 * lv, area: 2.5, at: 'self', status: { kind: 'stun', chance: lv => 15 + 5 * lv, dur: () => 1.5 } },
    desc: L('หมุนตัวในพายุควัน รอบตัว 2.5 ช่อง 145~245% อาจทำให้มึน', 'Spin within a storm of smoke, hitting everything within 2.5 cells for 145~245%. May stun.') },
  trickster_haste: { name: 'Trickster Haste', max: 5, type: 'active', target: 'self', icon: '#c0f0a0', glyph: '»', req: { phantom_edge: 3 },
    sp: () => 25, delay: 800, selfFx: 'buff',
    buff: { dur: lv => 40 + 10 * lv, stats: lv => ({ flee: 5 * lv, speedPct: 4 * lv, crit: 2 * lv }) },
    desc: L('ความเร็วแห่งนักลวง FLEE +5×Lv, เดินเร็วขึ้น 4%×Lv และ CRIT +2×Lv', "The trickster's haste. FLEE +5×Lv, movement speed +4%×Lv and CRIT +2×Lv.") },

  // ===== Ulfhednar Warlord =====
  berserk_soul: { name: 'Berserk Soul', max: 5, type: 'passive', icon: '#d05030', glyph: 'ᛉ',
    passive: lv => ({ atkPct: 2 * lv, hpPct: 2 * lv, rage: 4 * lv }),
    desc: L('วิญญาณคลั่ง ดาเมจกายภาพ +2%×Lv, MaxHP +2%×Lv และยิ่ง HP น้อยยิ่งแรงขึ้นอีก +4%×Lv', 'Berserk soul. Physical damage +2%×Lv, MaxHP +2%×Lv, and up to +4%×Lv more the lower your HP.') },
  fenrir_bite: { name: 'Fenrir Bite', max: 5, type: 'active', target: 'enemy', melee: true, icon: '#e05a30', glyph: '⩔', req: { berserk_soul: 1 },
    sp: () => 8, hpCost: () => 4, delay: 700, chain: true, fx: 'bash',
    dmg: { type: 'phys', mult: lv => 2.2 + 0.4 * lv },
    desc: L('กัดฉีกแบบหมาป่าเฟนเรียร์ 260~420% เสีย HP 4%', 'A rending bite like the wolf Fenrir for 260~420%. Costs 4% HP.') },
  ragnarok_cleave: { name: 'Ragnarok Cleave', max: 5, type: 'active', target: 'self', icon: '#ff8040', glyph: '⟳', req: { fenrir_bite: 2 },
    sp: () => 15, hpCost: () => 6, delay: 1100, selfFx: 'whirl',
    dmg: { type: 'phys', mult: lv => 1.8 + 0.35 * lv, area: 2.5, at: 'self' },
    desc: L('ฟันขวานกวาดรอบตัว 2.5 ช่อง 215~355% เสีย HP 6%', 'A sweeping axe cleave within 2.5 cells for 215~355%. Costs 6% HP.') },
  war_howl: { name: 'War Howl', max: 5, type: 'active', target: 'self', icon: '#e0b080', glyph: 'ᚺ', req: { berserk_soul: 2 },
    sp: () => 20, delay: 1200, selfFx: 'howl',
    buff: { dur: lv => 40 + 10 * lv, stats: lv => ({ atk: 8 * lv, aspdPct: 3 * lv, stunRes: 8 * lv }) },
    desc: L('หอนปลุกฝูง ATK +8×Lv, ความเร็วโจมตี +3%×Lv และต้านมึน +8%×Lv', 'A howl that rouses the pack. ATK +8×Lv, attack speed +3%×Lv and stun resistance +8%×Lv.') },
  undying_rage: { name: 'Undying Rage', max: 5, type: 'active', target: 'self', icon: '#ff3030', glyph: '♥', req: { berserk_soul: 3 },
    sp: () => 25, delay: 1000, selfFx: 'buff',
    buff: { dur: lv => 15 + 3 * lv, stats: lv => ({ leech: 1 + lv, def: 4 * lv }) },
    desc: L('ความแค้นที่ไม่ยอมตาย ดูดเลือด +(1+Lv)% และ DEF +4×Lv ชั่วคราว', 'Rage that refuses to die. Temporary lifesteal +(1+Lv)% and DEF +4×Lv.') },

  // ===================== Class ขั้นที่ 2 สายที่สอง =====================
  // ===== Hersir Vanguard =====
  hersir_might: { name: 'Hersir Might', max: 5, type: 'passive', icon: '#e06a50', glyph: 'ᛏ',
    passive: lv => ({ atkPct: 3 * lv, str: lv, hit: 2 * lv }),
    desc: L('พลังขุนศึก ดาเมจกายภาพ +3%×Lv, STR +1×Lv และ HIT +2×Lv', "A war-chief's might. Physical damage +3%×Lv, STR +1×Lv and HIT +2×Lv.") },
  charge_strike: { name: 'Charge Strike', max: 5, type: 'active', target: 'enemy', range: 5, icon: '#ff8a5a', glyph: '⇒', req: { hersir_might: 1 },
    sp: lv => 14 + 2 * lv, delay: 800, chain: true, fx: 'bash',
    dmg: { type: 'phys', mult: lv => 2.4 + 0.45 * lv, knockback: 2, status: { kind: 'stun', chance: () => 30, dur: () => 1 } },
    desc: L('พุ่งชาร์จใส่ศัตรูระยะ 5 ช่อง 285~465% ผลักถอยและอาจทำให้มึน', 'Charge an enemy up to 5 cells away for 285~465%, knocking it back with a chance to stun.') },
  spiral_pierce: { name: 'Spiral Pierce', max: 5, type: 'active', target: 'enemy', range: 3, icon: '#d0d0e0', glyph: '⥁', req: { charge_strike: 2 },
    sp: lv => 16 + 2 * lv, delay: 800, chain: true, fx: 'slash',
    dmg: { type: 'phys', mult: lv => 1.8 + 0.35 * lv, hits: 2, line: true },
    desc: L('หมุนหอกเจาะทะลุแนว 3 ช่อง 2 ครั้ง ครั้งละ 215~355%', 'Drive a spinning spear through the line up to 3 cells, hitting 2 times for 215~355% each.') },
  battle_aura: { name: 'Battle Aura', max: 5, type: 'active', target: 'self', icon: '#ffb070', glyph: '♦', req: { hersir_might: 3 },
    sp: () => 25, delay: 1000, selfFx: 'shout',
    buff: { dur: lv => 60 + 10 * lv, stats: lv => ({ atk: 6 * lv, aspdPct: 2 * lv, hit: 3 * lv }) },
    desc: L('ออร่าสงคราม ATK +6×Lv, ความเร็วโจมตี +2%×Lv และ HIT +3×Lv', 'War aura. ATK +6×Lv, attack speed +2%×Lv and HIT +3×Lv.') },
  ragnars_fury: { name: "Ragnar's Fury", max: 5, type: 'active', target: 'self', icon: '#c03020', glyph: '✸', req: { spiral_pierce: 2 },
    sp: lv => 22 + 3 * lv, delay: 1100, selfFx: 'whirl',
    dmg: { type: 'phys', mult: lv => 2.0 + 0.4 * lv, area: 2, at: 'self' },
    desc: L('ฟาดรอบตัวด้วยโทสะของรักนาร์ 2 ช่อง 240~400%', "Strike everything within 2 cells with Ragnar's fury for 240~400%.") },

  // ===== Seidr Witch =====
  seidr_lore: { name: 'Seidr Lore', max: 5, type: 'passive', icon: '#a070e0', glyph: 'ᛊ',
    passive: lv => ({ matkPct: 3 * lv, castPct: 4 * lv, sp: 6 * lv }),
    desc: L('ตำราเซดร์ MATK +3%×Lv, ร่ายเร็วขึ้น 4%×Lv และ MaxSP +6×Lv', 'Seidr lore. MATK +3%×Lv, casting speed +4%×Lv and MaxSP +6×Lv.') },
  soul_drain: { name: 'Soul Drain', max: 5, type: 'active', target: 'enemy', range: 9, icon: '#9050d0', glyph: '◐', req: { seidr_lore: 1 },
    sp: lv => 12 + 2 * lv, cast: lv => 700 + 60 * lv, delay: 700, fx: 'soul',
    dmg: { type: 'magic', element: 'shadow', mult: lv => 1.6 + 0.35 * lv },
    desc: L('ดูดวิญญาณศัตรู 195~335% ธาตุมืด', "Drains the enemy's soul for 195~335% Shadow damage.") },
  hex_of_hel: { name: 'Hex of Hel', max: 5, type: 'active', target: 'enemy', range: 9, icon: '#60a040', glyph: '⛧', req: { seidr_lore: 2 },
    sp: lv => 18 + 3 * lv, cast: () => 600, delay: 800, fx: 'soul',
    dmg: { type: 'magic', element: 'shadow', mult: lv => 1.0 + 0.2 * lv, area: 1.5, at: 'target', status: { kind: 'poison', chance: () => 100, dur: lv => 6 + lv } },
    desc: L('คำสาปของเฮล รัศมี 1.5 ช่อง 120~200% และทำให้ติดพิษ 7~11 วินาที', 'The Hex of Hel. 120~200% in a 1.5-cell radius and poisons for 7~11 seconds.') },
  dark_nova: { name: 'Dark Nova', max: 5, type: 'active', target: 'self', icon: '#5a3090', glyph: '✹', req: { soul_drain: 2 },
    sp: lv => 24 + 3 * lv, cast: () => 500, delay: 1000, selfFx: 'firering',
    dmg: { type: 'magic', element: 'shadow', mult: lv => 1.4 + 0.3 * lv, area: 3, at: 'self', status: { kind: 'slow', chance: () => 100, dur: () => 3 } },
    desc: L('ระเบิดความมืดรอบตัว 3 ช่อง 170~290% และทำให้ช้าลง', 'Darkness erupts within 3 cells for 170~290%, slowing enemies.') },
  void_lance: { name: 'Void Lance', max: 5, type: 'active', target: 'enemy', range: 9, icon: '#3a1a6a', glyph: '⟟', req: { hex_of_hel: 2 },
    sp: lv => 24 + 4 * lv, cast: lv => 1500 + 60 * lv, delay: 900, fx: 'soul',
    dmg: { type: 'magic', element: 'ghost', mult: lv => 2.6 + 0.55 * lv, sureHit: true },
    desc: L('หอกความว่างเปล่า เป้าเดียว 315~535% ธาตุวิญญาณ ไม่พลาด', 'A lance of the void. Single target, 315~535% Ghost damage. Never misses.') },

  // ===== Ullr Sniper =====
  ullr_focus: { name: 'Ullr Focus', max: 5, type: 'passive', icon: '#c0d070', glyph: '⌖',
    passive: lv => ({ range: 1 + Math.floor(lv / 2), crit: 2 * lv, dex: 2 * lv }),
    desc: L('สมาธิแห่งอุลล์ ระยะธนู +1~3, CRIT +2×Lv และ DEX +2×Lv', "Ullr's focus. Bow range +1~3, CRIT +2×Lv and DEX +2×Lv.") },
  sharp_shot: { name: 'Sharp Shot', max: 5, type: 'active', target: 'enemy', bow: true, icon: '#e0d080', glyph: '➹', req: { ullr_focus: 1 },
    sp: lv => 12 + 2 * lv, delay: 600, chain: true, fx: 'arrow',
    dmg: { type: 'phys', mult: lv => 2.4 + 0.5 * lv, line: true },
    desc: L('ลูกธนูคมกริบทะลุแนว 290~490%', 'A razor-sharp arrow that pierces the line for 290~490%.') },
  snipe: { name: 'Snipe', max: 5, type: 'active', target: 'enemy', bow: true, icon: '#ffe0a0', glyph: '⊕', req: { sharp_shot: 2 },
    sp: lv => 20 + 3 * lv, cast: () => 1200, delay: 900, chain: true, fx: 'arrow',
    dmg: { type: 'phys', mult: lv => 3.6 + 0.7 * lv, sureHit: true },
    desc: L('เล็งแล้วยิงนัดเดียว 430~710% ไม่พลาด (ร่าย 1.2 วินาที)', 'Take aim and fire a single shot for 430~710%. Never misses (1.2-second cast).') },
  wind_walk: { name: 'Wind Walk', max: 5, type: 'active', target: 'self', icon: '#c0ffd0', glyph: '≋', req: { ullr_focus: 2 },
    sp: () => 25, delay: 800, selfFx: 'buff',
    buff: { dur: lv => 60 + 15 * lv, stats: lv => ({ speedPct: 4 * lv, flee: 4 * lv, aspdPct: 2 * lv }) },
    desc: L('เดินตามลม เดินเร็วขึ้น 4%×Lv, FLEE +4×Lv และความเร็วโจมตี +2%×Lv', 'Walk with the wind. Movement speed +4%×Lv, FLEE +4×Lv and attack speed +2%×Lv.') },
  twin_shot: { name: 'Twin Shot', max: 5, type: 'active', target: 'enemy', bow: true, icon: '#d0b070', glyph: '⇉', req: { ullr_focus: 3 },
    sp: lv => 8 + 2 * lv, delay: 500, chain: true, fx: 'arrow',
    dmg: { type: 'phys', mult: lv => 1.3 + 0.3 * lv, hits: 2 },
    desc: L('ยิงคู่ 2 ดอกติด ดอกละ 160~280%', 'Looses 2 arrows back to back, 160~280% each.') },

  // ===== Gythja Monk =====
  iron_faith: { name: 'Iron Faith', max: 5, type: 'passive', icon: '#e0b070', glyph: '☯',
    passive: lv => ({ def: 2 * lv, atkPct: 4 * lv, hpPct: 3 * lv, aspdPct: 2 * lv }),
    desc: L('ศรัทธาเหล็ก DEF +2×Lv, ดาเมจกายภาพ +4%×Lv, MaxHP +3%×Lv และความเร็วโจมตี +2%×Lv', 'Iron faith. DEF +2×Lv, physical damage +4%×Lv, MaxHP +3%×Lv and attack speed +2%×Lv.') },
  holy_fist: { name: 'Holy Fist', max: 5, type: 'active', target: 'enemy', melee: true, icon: '#fff0a0', glyph: '✊', req: { iron_faith: 1 },
    sp: lv => 7 + lv, delay: 500, chain: true, fx: 'holy',
    dmg: { type: 'phys', element: 'holy', mult: lv => 2.0 + 0.4 * lv },
    desc: L('หมัดศักดิ์สิทธิ์ 240~400% ธาตุศักดิ์สิทธิ์ (แรงมากกับอมตะ/ปีศาจ)', 'A holy fist dealing 240~400% Holy damage (devastating against undead/demons).') },
  triple_palm: { name: 'Triple Palm', max: 5, type: 'active', target: 'enemy', melee: true, icon: '#f0c080', glyph: '⁂', req: { holy_fist: 2 },
    sp: lv => 9 + lv, delay: 600, chain: true, fx: 'bash',
    dmg: { type: 'phys', mult: lv => 0.9 + 0.2 * lv, hits: 3, sureHit: true },
    desc: L('ฝ่ามือสามจังหวะ 3 ครั้ง ครั้งละ 110~190% ไม่พลาด', 'A three-beat palm strike, hitting 3 times for 110~190% each. Never misses.') },
  divine_burst: { name: 'Divine Burst', max: 5, type: 'active', target: 'enemy', melee: true, icon: '#ffffff', glyph: '☀', req: { triple_palm: 2 },
    sp: lv => 30 + 5 * lv, delay: 1200, chain: true, fx: 'holy',
    dmg: { type: 'phys', element: 'holy', mult: lv => 4.0 + 0.8 * lv, sureHit: true },
    desc: L('ระเบิดพลังศรัทธาทั้งหมดใส่เป้าเดียว 480~800% ธาตุศักดิ์สิทธิ์ ไม่พลาด', 'Unleash all your faith on a single target for 480~800% Holy damage. Never misses.') },
  zen_body: { name: 'Zen Body', max: 5, type: 'active', target: 'self', icon: '#a0e0c0', glyph: '☸', req: { iron_faith: 3 },
    sp: () => 25, delay: 1000, selfFx: 'buff',
    buff: { dur: lv => 60 + 15 * lv, stats: lv => ({ def: 3 * lv, hpPct: 3 * lv, regenPct: lv }) },
    desc: L('กายสงบ DEF +3×Lv, MaxHP +3%×Lv และฟื้น HP ต่อรอบ +1%×Lv', 'Body at peace. DEF +3×Lv, MaxHP +3%×Lv and HP regen per tick +1%×Lv.') },

  // ===== Skald Bard =====
  skald_verse: { name: 'Skald Verse', max: 5, type: 'passive', icon: '#80c0f0', glyph: '♪',
    passive: lv => ({ aspdPct: 2 * lv, luk: 2 * lv, crit: lv }),
    desc: L('บทกวีสคาลด์ ความเร็วโจมตี +2%×Lv, LUK +2×Lv และ CRIT +1×Lv', "Skald's verse. Attack speed +2%×Lv, LUK +2×Lv and CRIT +1×Lv.") },
  sonic_strike: { name: 'Sonic Strike', max: 5, type: 'active', target: 'enemy', range: 5, icon: '#a0e0ff', glyph: '♫', req: { skald_verse: 1 },
    sp: lv => 12 + 2 * lv, delay: 650, chain: true, fx: 'lightning',
    dmg: { type: 'phys', element: 'wind', mult: lv => 1.8 + 0.35 * lv },
    desc: L('คลื่นเสียงตัดอากาศระยะ 5 ช่อง 215~355% ธาตุลม', 'A sound wave that cuts the air up to 5 cells for 215~355% Wind damage.') },
  war_drum: { name: 'War Drum', max: 5, type: 'active', target: 'self', icon: '#c08040', glyph: '◉', req: { sonic_strike: 2 },
    sp: lv => 20 + 2 * lv, delay: 1000, selfFx: 'howl',
    dmg: { type: 'phys', mult: lv => 1.1 + 0.2 * lv, area: 3, at: 'self', status: { kind: 'stun', chance: lv => 25 + 5 * lv, dur: () => 1.5 } },
    desc: L('ตีกลองศึก ทำร้ายรอบตัว 3 ช่อง 130~210% และอาจทำให้มึน', 'Beat the war drum, hitting everything within 3 cells for 130~210%. May stun.') },
  song_of_battle: { name: 'Song of Battle', max: 5, type: 'active', target: 'self', icon: '#ffd080', glyph: '♬', req: { skald_verse: 2 },
    sp: () => 25, delay: 1000, selfFx: 'buff',
    buff: { dur: lv => 90 + 15 * lv, stats: lv => ({ atk: 6 * lv, aspdPct: 3 * lv, hit: 3 * lv }) },
    desc: L('บทเพลงแห่งศึก ATK +6×Lv, ความเร็วโจมตี +3%×Lv และ HIT +3×Lv', 'Song of battle. ATK +6×Lv, attack speed +3%×Lv and HIT +3×Lv.') },
  hymn_of_loki: { name: 'Hymn of Loki', max: 5, type: 'active', target: 'self', icon: '#b080e0', glyph: '♩', req: { skald_verse: 3 },
    sp: () => 25, delay: 1000, selfFx: 'buff',
    buff: { dur: lv => 90 + 15 * lv, stats: lv => ({ flee: 5 * lv, critDmgPct: 5 * lv }) },
    desc: L('บทสวดของโลกิ FLEE +5×Lv และแรงคริติคอล +5%×Lv', "Loki's hymn. FLEE +5×Lv and critical damage +5%×Lv.") },

  // ===== Jotun Breaker =====
  jotun_blood: { name: 'Jotun Blood', max: 5, type: 'passive', icon: '#a08060', glyph: 'ᛃ',
    passive: lv => ({ str: 2 * lv, atkPct: 3 * lv, hpPct: 3 * lv }),
    desc: L('เลือดยักษ์ STR +2×Lv, ดาเมจกายภาพ +3%×Lv และ MaxHP +3%×Lv', "Giant's blood. STR +2×Lv, physical damage +3%×Lv and MaxHP +3%×Lv.") },
  titan_smash: { name: 'Titan Smash', max: 5, type: 'active', target: 'enemy', melee: true, icon: '#c09060', glyph: '⬢', req: { jotun_blood: 1 },
    sp: () => 10, hpCost: () => 8, delay: 900, chain: true, fx: 'bash',
    dmg: { type: 'phys', mult: lv => 3.4 + 0.7 * lv, status: { kind: 'stun', chance: () => 30, dur: () => 1.5 } },
    desc: L('ทุบแบบไททัน 410~690% อาจทำให้มึน เสีย HP 8%', 'A titanic smash for 410~690%. May stun. Costs 8% HP.') },
  earth_splitter: { name: 'Earth Splitter', max: 5, type: 'active', target: 'enemy', range: 4, icon: '#8a6a40', glyph: '⚡', req: { titan_smash: 2 },
    sp: () => 12, hpCost: () => 5, delay: 900, chain: true, fx: 'bash',
    dmg: { type: 'phys', element: 'earth', mult: lv => 2.0 + 0.4 * lv, line: true },
    desc: L('ฟาดพื้นแยกเป็นแนว 4 ช่อง 240~400% ธาตุดิน เสีย HP 5%', 'Strikes the ground and splits it in a 4-cell line for 240~400% Earth damage. Costs 5% HP.') },
  giants_wrath: { name: "Giant's Wrath", max: 5, type: 'active', target: 'self', icon: '#e07040', glyph: '✊', req: { jotun_blood: 3 },
    sp: () => 15, hpCost: () => 10, delay: 1000, selfFx: 'buff',
    buff: { dur: lv => 30 + 10 * lv, stats: lv => ({ str: 3 * lv, atkPct: 4 * lv }) },
    desc: L('โทสะยักษ์ STR +3×Lv และดาเมจกายภาพ +4%×Lv เสีย HP 10%', "Giant's wrath. STR +3×Lv and physical damage +4%×Lv. Costs 10% HP.") },
  mountain_heart: { name: 'Mountain Heart', max: 5, type: 'active', target: 'self', icon: '#90a080', glyph: '⛰', req: { jotun_blood: 2 },
    sp: () => 20, delay: 1000, selfFx: 'heal',
    heal: (lv, d, p) => Math.floor(d.maxHp * (0.1 + 0.03 * lv)),
    desc: L('หัวใจภูผา ฟื้นฟู HP 13~25% ของ MaxHP', 'Heart of the mountain. Restores 13~25% of MaxHP.') },
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
  red_potion:    { name: 'Repair Kit S',    type: 'use', price: 50,   heal: [45, 65],   icon: { s: 'potion', c: '#e03030' }, desc: L('ชุดซ่อมขนาดเล็ก ฟื้นฟู HP 45~65', 'A small repair kit. Restores 45~65 HP.') },
  orange_potion: { name: 'Repair Kit M', type: 'use', price: 200,  heal: [105, 145], icon: { s: 'potion', c: '#f08020' }, desc: L('ชุดซ่อมขนาดกลาง ฟื้นฟู HP 105~145', 'A medium repair kit. Restores 105~145 HP.') },
  yellow_potion: { name: 'Repair Kit L', type: 'use', price: 550,  heal: [175, 235], icon: { s: 'potion', c: '#e8d020' }, desc: L('ชุดซ่อมขนาดใหญ่ ฟื้นฟู HP 175~235', 'A large repair kit. Restores 175~235 HP.') },
  white_potion:  { name: 'Repair Kit XL',  type: 'use', price: 1200, heal: [325, 405], icon: { s: 'potion', c: '#f4f4f4' }, desc: L('ชุดซ่อมพิเศษ ฟื้นฟู HP 325~405', 'A premium repair kit. Restores 325~405 HP.') },
  blue_potion:   { name: 'Energy Cell',   type: 'use', price: 2500, spHeal: [40, 60], icon: { s: 'potion', c: '#3060e0' }, desc: L('เซลล์พลังงาน ฟื้นฟู SP 40~60', 'An energy cell. Restores 40~60 SP.') },
  apple:         { name: 'Oil Can',         type: 'use', price: 15,   heal: [16, 22],   icon: { s: 'jar', c: '#6a7080' }, desc: L('น้ำมันหล่อลื่นข้อต่อ ฟื้นฟู HP 16~22', 'Joint lubricant. Restores 16~22 HP.') },
  carrot:        { name: 'Coolant',        type: 'use', price: 15,   heal: [18, 24],   icon: { s: 'potion', c: '#50c0e0' }, desc: L('น้ำยาหล่อเย็น ฟื้นฟู HP 18~24', 'Coolant fluid. Restores 18~24 HP.') },
  meat:          { name: 'Nano Paste',    type: 'use', price: 50,   heal: [70, 100],  icon: { s: 'jar', c: '#a0a8b8' }, desc: L('นาโนเพสต์ซ่อมโครงสร้าง ฟื้นฟู HP 70~100', 'Structural repair nano-paste. Restores 70~100 HP.') },
  grape:         { name: 'Charge Chip',         type: 'use', price: 200,  spHeal: [10, 15], icon: { s: 'card', c: '#60d0ff' }, desc: L('ชิปชาร์จไฟ ฟื้นฟู SP 10~15', 'A charging chip. Restores 10~15 SP.') },
  green_herb:    { name: 'Antivirus Patch',    type: 'use', price: 10,   heal: [12, 18], cure: true, icon: { s: 'card', c: '#50e070' }, desc: L('แพตช์แอนตี้ไวรัส ฟื้นฟู HP 12~18 และล้างไวรัส (พิษ)', 'An antivirus patch. Restores 12~18 HP and purges viruses (poison).') },
  red_herb:      { name: 'Patch Tape',      type: 'use', price: 18,   heal: [18, 28],   icon: { s: 'cloth', c: '#d0d4dc' }, desc: L('เทปซ่อมด่วน ฟื้นฟู HP 18~28', 'Quick-fix repair tape. Restores 18~28 HP.') },
  mead:          { name: 'Overclock Brew',    type: 'use', price: 500,  heal: [70, 100], spHeal: [20, 40], icon: { s: 'jar', c: '#f0b020' }, desc: L('สารโอเวอร์คล็อก ฟื้นฟู HP 70~100 และ SP 20~40', 'An overclocking compound. Restores 70~100 HP and 20~40 SP.') },
  blink_feather: { name: 'Blink Chip', type: 'use', price: 60,   effect: 'fly',    icon: { s: 'card', c: '#8fd0f0' }, desc: L('ชิปวาร์ป เคลื่อนย้ายไปจุดสุ่มในแผนที่ปัจจุบัน', 'A warp chip. Teleports you to a random spot on the current map.') },
  hearth_rune:   { name: 'Return Beacon',   type: 'use', price: 300,  effect: 'return', icon: { s: 'gem', c: '#60e0ff' }, desc: L('บีคอนกลับฐาน วาร์ปกลับจุดเซฟ', 'A return beacon. Warps you back to your save point.') },

  // --- ของดรอป (ขายได้) ---
  jelly_drop:      { name: 'Gel Cell',      type: 'etc', price: 6,    icon: { s: 'blob', c: '#e8b0d0' }, desc: L('เซลล์เจลจากโดรน', 'A gel cell salvaged from a drone.') },
  leaf_silk:       { name: 'Copper Wire',       type: 'etc', price: 8,    icon: { s: 'blob', c: '#e4f4c8' }, desc: L('ขดลวดทองแดง', 'A coil of copper wire.') },
  clover:          { name: 'Micro Chip',          type: 'etc', price: 6,    icon: { s: 'card', c: '#50c050' }, desc: L('ไมโครชิปขนาดจิ๋ว', 'A tiny microchip.') },
  moon_fur:        { name: 'Silver Mesh',        type: 'etc', price: 8,    icon: { s: 'feather', c: '#f0f0ff' }, desc: L('ตาข่ายเงินจากหุ่นกระต่าย', 'Silver mesh from a bunny unit.') },
  buzz_wing:       { name: 'Rotor Blade',       type: 'etc', price: 14,   icon: { s: 'shell', c: '#c0d8e0' }, desc: L('ใบพัดโดรน', 'A drone rotor blade.') },
  ember_jelly:     { name: 'Heat Sink',     type: 'etc', price: 10,   icon: { s: 'blob', c: '#f5a442' }, desc: L('แผ่นระบายความร้อน', 'A heat-dissipation plate.') },
  moss_gel:        { name: 'Bio Gel',        type: 'etc', price: 16,   icon: { s: 'blob', c: '#90d060' }, desc: L('เจลชีวภาพเหนียว ๆ', 'Sticky bio-gel.') },
  hopper_leg:      { name: 'Spring Coil',      type: 'etc', price: 24,   icon: { s: 'bone', c: '#80b040' }, desc: L('สปริงขาหุ่นตั๊กแตน', 'A leg spring from a grasshopper unit.') },
  living_bark:     { name: 'Scrap Plate',     type: 'etc', price: 12,   icon: { s: 'bone', c: '#8a6038' }, desc: L('แผ่นเหล็กขึ้นสนิม', 'A rusted steel plate.') },
  cap_spore:       { name: 'Detonator',       type: 'etc', price: 16,   icon: { s: 'blob', c: '#d05050' }, desc: L('ตัวจุดระเบิด', 'A detonator.') },
  ash_tail:        { name: 'Ash Filter',        type: 'etc', price: 44,   icon: { s: 'feather', c: '#909090' }, desc: L('ไส้กรองเถ้า', 'An ash filter.') },
  fenrir_fang:     { name: 'Fenrir Fang',     type: 'etc', price: 60,   icon: { s: 'claw', c: '#e0e0e0' }, desc: L('เขี้ยวโลหะของหน่วยเฟนริร์', 'A metal fang from a Fenrir unit.') },
  moss_hide:       { name: 'Plated Hide',       type: 'etc', price: 180,  icon: { s: 'cloth', c: '#5a7a3a' }, desc: L('เกราะแผ่นของหมีเหล็ก', 'Armor plating from an iron bear.') },
  iron_tusk:       { name: 'Iron Tusk',       type: 'etc', price: 70,   icon: { s: 'claw', c: '#c8c8d0' }, desc: L('งาเหล็กของรถถังหมูป่า', 'An iron tusk from a boar tank.') },
  grave_dust:      { name: 'Rust Dust',      type: 'etc', price: 24,   icon: { s: 'blob', c: '#9a9a80' }, desc: L('ผงสนิมจากเดรากร์', 'Rust dust shed by a Draugr.') },
  old_bone:        { name: 'Old Frame',        type: 'etc', price: 72,   icon: { s: 'bone', c: '#f0ecd8' }, desc: L('โครงเหล็กเก่า', 'An old steel frame.') },
  hel_lantern:     { name: 'Soul Lantern',     type: 'etc', price: 180,  icon: { s: 'jar', c: '#60c0a0' }, desc: L('ตะเกียงวิญญาณดิจิทัล', 'A digital soul lantern.') },
  cursed_seal:     { name: 'Cursed Chip',     type: 'etc', price: 240,  icon: { s: 'ring', c: '#a040c0' }, desc: L('ชิปต้องคำสาป', 'A cursed chip.') },
  yggdrasil_shard: { name: 'Yggdrasil Core', type: 'etc', price: 20000, icon: { s: 'gem', c: '#60f0a0' }, desc: L('แกนพลังงานต้นไม้โลก ล้ำค่าที่สุดในไอรอนวัลฮัลลา', 'An energy core of the World Tree — the most precious thing in Iron Valhalla.') },

  // --- อาวุธ ---
  knife:        { name: 'Knife',        type: 'weapon', slot: 'weapon', wtype: 'dagger', atk: 17, price: 50,    slots: 3, jobs: J.dagger, icon: { s: 'dagger', c: '#c8c8d0' }, desc: L('มีดสั้นธรรมดา', 'An ordinary dagger.') },
  cutter:       { name: 'Cutter',       type: 'weapon', slot: 'weapon', wtype: 'dagger', atk: 30, price: 1250,  slots: 3, jobs: J.dagger, icon: { s: 'dagger', c: '#d0d8e0' }, desc: L('มีดคัตเตอร์คมกริบ', 'A razor-sharp cutter blade.') },
  main_gauche:  { name: 'Main Gauche',  type: 'weapon', slot: 'weapon', wtype: 'dagger', atk: 43, price: 2400,  slots: 3, jobs: J.dagger, icon: { s: 'dagger', c: '#e0e0f0' }, desc: L('มีดคู่มือซ้าย', 'A left-hand parrying dagger.') },
  stiletto:     { name: 'Stiletto',     type: 'weapon', slot: 'weapon', wtype: 'dagger', atk: 60, price: 7500,  slots: 2, lv: 12, jobs: J.dagger, icon: { s: 'dagger', c: '#a0c0f0' }, desc: L('มีดเรียวยาว', 'A long, slender dagger.') },
  loki_fang:    { name: "Loki's Fang",  type: 'weapon', slot: 'weapon', wtype: 'dagger', atk: 105, price: 26000, slots: 1, lv: 30, jobs: ['trickster'], icon: { s: 'dagger', c: '#7ad04a' }, b: { luk: 3 }, desc: L('เขี้ยวแห่งโลกิ LUK +3 (นักลวงเท่านั้น)', "Loki's fang. LUK +3 (Trickster only)") },
  sword:        { name: 'Sword',        type: 'weapon', slot: 'weapon', wtype: 'sword', atk: 25, price: 100,    slots: 3, jobs: J.sword, icon: { s: 'sword', c: '#c8c8d0' }, desc: L('ดาบมือเดียวพื้นฐาน', 'A basic one-handed sword.') },
  falchion:     { name: 'Falchion',     type: 'weapon', slot: 'weapon', wtype: 'sword', atk: 49, price: 1500,   slots: 3, jobs: J.sword, icon: { s: 'sword', c: '#d8d8e8' }, desc: L('ดาบโค้ง', 'A curved sword.') },
  broadsword:   { name: 'Broadsword',   type: 'weapon', slot: 'weapon', wtype: 'sword', atk: 62, price: 3200,   slots: 3, jobs: J.sword, icon: { s: 'sword', c: '#e8e8f8' }, desc: L('ดาบใบกว้าง', 'A broad-bladed sword.') },
  valhalla_blade: { name: 'Valhalla Blade', type: 'weapon', slot: 'weapon', wtype: 'sword', atk: 130, price: 32000, slots: 1, lv: 30, jobs: ['einherjar'], icon: { s: 'sword', c: '#f0e0a0' }, b: { vit: 2 }, desc: L('ดาบแห่งวัลฮัลลา VIT +2 (นักรบวิญญาณเท่านั้น)', 'Blade of Valhalla. VIT +2 (Einherjar only)') },
  hand_axe:     { name: 'Hand Axe',     type: 'weapon', slot: 'weapon', wtype: 'axe', atk: 32, price: 300,      slots: 3, jobs: J.axe, icon: { s: 'axe', c: '#b8b8c4' }, desc: L('ขวานมือเดียว', 'A one-handed axe.') },
  cleaver:      { name: 'Cleaver Axe',  type: 'weapon', slot: 'weapon', wtype: 'axe', atk: 50, price: 1800,     slots: 3, jobs: J.axe, icon: { s: 'axe', c: '#c8b8a8' }, desc: L('ขวานผ่าเหล็ก ATK 50', 'A steel-splitting axe. ATK 50') },
  battle_axe:   { name: 'Battle Axe',   type: 'weapon', slot: 'weapon', wtype: 'axe', atk: 72, price: 5500,     slots: 2, lv: 15, jobs: J.axe, icon: { s: 'axe', c: '#d0d0dc' }, desc: L('ขวานศึก', 'A war axe.') },
  ulfr_axe:     { name: 'Úlfr Axe',     type: 'weapon', slot: 'weapon', wtype: 'axe', atk: 145, price: 34000,   slots: 1, lv: 30, jobs: ['berserker'], icon: { s: 'axe', c: '#e04040' }, b: { str: 3 }, desc: L('ขวานหมาป่า STR +3 (นักรบคลั่งเท่านั้น)', 'Wolf axe. STR +3 (Berserker only)') },
  rod:          { name: 'Energy Rod',          type: 'weapon', slot: 'weapon', wtype: 'rod', atk: 15, matk: 15, price: 50,     slots: 3, jobs: J.rod, icon: { s: 'rod', c: '#a07040' }, desc: L('คทาพลังงาน MATK +15', 'An energy rod. MATK +15') },
  arc_wand:     { name: 'Arc Wand',     type: 'weapon', slot: 'weapon', wtype: 'rod', atk: 20, matk: 26, price: 900,    slots: 3, jobs: J.rod, icon: { s: 'rod', c: '#70b0d8' }, desc: L('คทาอาร์กไฟฟ้า MATK +26', 'An electric arc wand. MATK +26') },
  rune_staff:   { name: 'Rune Staff',   type: 'weapon', slot: 'weapon', wtype: 'rod', atk: 25, matk: 40, price: 2500,   slots: 2, lv: 12, jobs: J.rod, icon: { s: 'rod', c: '#50a0e0' }, b: { int: 1 }, desc: L('คทาจารึกรูน MATK +40 INT +1', 'A rune-inscribed staff. MATK +40 INT +1') },
  seer_staff:   { name: "Seer's Staff", type: 'weapon', slot: 'weapon', wtype: 'rod', atk: 60, matk: 80, price: 14000,  slots: 1, lv: 24, jobs: ['runecaster', 'volva'], icon: { s: 'rod', c: '#e050e0' }, b: { int: 3 }, desc: L('คทาผู้หยั่งรู้ MATK +80 INT +3', "A seer's staff. MATK +80 INT +3") },
  bow:          { name: 'Bow',          type: 'weapon', slot: 'weapon', wtype: 'bow', atk: 15, price: 1000,    slots: 3, jobs: J.bow, icon: { s: 'bow', c: '#a07040' }, desc: L('ธนูไม้', 'A wooden bow.') },
  composite_bow:{ name: 'Composite Bow',type: 'weapon', slot: 'weapon', wtype: 'bow', atk: 32, price: 2500,    slots: 3, jobs: J.bow, icon: { s: 'bow', c: '#c08040' }, desc: L('ธนูผสม', 'A composite bow.') },
  great_bow:    { name: 'Great Bow',    type: 'weapon', slot: 'weapon', wtype: 'bow', atk: 55, price: 10000,   slots: 2, lv: 18, jobs: ['wildhunter'], icon: { s: 'bow', c: '#6a4a2a' }, desc: L('ธนูใหญ่ (นักล่าเท่านั้น)', 'A great bow (Wildhunter only).') },
  ullr_bow:     { name: "Ullr's Bow",   type: 'weapon', slot: 'weapon', wtype: 'bow', atk: 125, price: 34000,  slots: 1, lv: 30, jobs: ['wildhunter'], icon: { s: 'bow', c: '#308040' }, b: { dex: 3 }, desc: L('ธนูแห่งอุลล์ เทพนักล่า DEX +3', 'Bow of Ullr, god of the hunt. DEX +3') },
  club:         { name: 'Club',         type: 'weapon', slot: 'weapon', wtype: 'mace', atk: 23, price: 60,     slots: 3, jobs: J.mace, icon: { s: 'mace', c: '#8a6038' }, desc: L('กระบองไม้', 'A wooden club.') },
  mace:         { name: 'Mace',         type: 'weapon', slot: 'weapon', wtype: 'mace', atk: 40, price: 800,    slots: 3, jobs: J.mace, icon: { s: 'mace', c: '#a0a0b0' }, desc: L('คทาเหล็ก', 'An iron mace.') },
  flail:        { name: 'Flail',        type: 'weapon', slot: 'weapon', wtype: 'mace', atk: 60, price: 4000,   slots: 2, lv: 12, jobs: J.mace, icon: { s: 'mace', c: '#b8b8c8' }, desc: L('ลูกตุ้มโซ่ ATK 60', 'A chained flail. ATK 60') },
  morning_star: { name: 'Morning Star', type: 'weapon', slot: 'weapon', wtype: 'mace', atk: 90, price: 12000,  slots: 1, lv: 20, jobs: J.mace, icon: { s: 'mace', c: '#d0d0e0' }, desc: L('กระบองหนามดาว', 'A star-spiked mace.') },
  emberfang:    { name: 'Emberfang',    type: 'weapon', slot: 'weapon', wtype: 'dagger', atk: 70, matk: 40, price: 60000, slots: 0, lv: 25, jobs: J.dagger, icon: { s: 'dagger', c: '#f0a040' },
    b: { sp: 60, int: 2, agi: 2 }, desc: L('[MVP] เขี้ยวเพลิง MATK +40, INT +2, AGI +2, MaxSP +60', '[MVP] Fang of flame. MATK +40, INT +2, AGI +2, MaxSP +60') },

  // --- ชุดเกราะ / สวมใส่ ---
  cotton_shirt: { name: 'Basic Plating', type: 'armor', slot: 'armor', def: 1, price: 10,   slots: 1, jobs: 'all', icon: { s: 'armor', c: '#e8e0c8' }, desc: L('เกราะพื้นฐาน DEF 1', 'Basic plating. DEF 1') },
  padded_plate: { name: 'Padded Plating', type: 'armor', slot: 'armor', def: 2, price: 400, slots: 1, jobs: 'all', icon: { s: 'armor', c: '#c8c0a8' }, desc: L('เกราะบุนวม DEF 2', 'Padded plating. DEF 2') },
  leather_vest: { name: 'Light Plating', type: 'armor', slot: 'armor', def: 4, price: 1500, slots: 1, jobs: J.light, icon: { s: 'armor', c: '#b09060' }, desc: L('เกราะเบา DEF 4', 'Light plating. DEF 4') },
  silk_robe:    { name: 'Nano Robe',    type: 'armor', slot: 'armor', def: 3, mdef: 10, price: 3000, slots: 1, jobs: 'all', icon: { s: 'armor', c: '#a080d0' }, b: { int: 1 }, desc: L('เสื้อคลุมนาโน DEF 3 MDEF 10 INT +1', 'A nano robe. DEF 3 MDEF 10 INT +1') },
  chain_mail:   { name: 'Mesh Armor',   type: 'armor', slot: 'armor', def: 8, price: 9000, slots: 1, lv: 20, jobs: J.heavy, icon: { s: 'armor', c: '#a0a8b8' }, desc: L('เกราะตาข่ายโลหะ DEF 8', 'Metal mesh armor. DEF 8') },
  plate_armor:  { name: 'Titan Plate',  type: 'armor', slot: 'armor', def: 12, price: 30000, slots: 1, lv: 35, jobs: ['einherjar'], icon: { s: 'armor', c: '#d0d8e8' }, desc: L('เกราะไทเทเนียม DEF 12 (นักรบวิญญาณเท่านั้น)', 'Titanium plate. DEF 12 (Einherjar only)') },
  hat:          { name: 'Sensor Cap',          type: 'armor', slot: 'head', def: 2, price: 1000,  slots: 0, jobs: 'all', icon: { s: 'hat', c: '#8a6a4a' }, desc: L('หมวกเซ็นเซอร์ DEF 2', 'A sensor cap. DEF 2') },
  ribbon:       { name: 'Signal Ribbon',       type: 'armor', slot: 'head', def: 1, mdef: 3, price: 800, slots: 0, jobs: 'all', icon: { s: 'ribbon', c: '#e04070' }, b: { int: 1 }, desc: L('ริบบิ้นสัญญาณ DEF 1 MDEF 3 INT +1', 'A signal ribbon. DEF 1 MDEF 3 INT +1') },
  iron_helm:    { name: 'Iron Helm',    type: 'armor', slot: 'head', def: 4, price: 6000, slots: 1, lv: 12, jobs: J.light, icon: { s: 'hat', c: '#8090a0' }, desc: L('หมวกเหล็ก DEF 4', 'An iron helm. DEF 4') },
  seraph_wings: { name: 'Seraph Wings', type: 'armor', slot: 'head', def: 3, mdef: 5, price: 50000, slots: 0, jobs: 'all', icon: { s: 'wing', c: '#ffffff' }, b: { int: 2, luk: 2, agi: 1 }, desc: L('[MVP] ปีกเทวดา DEF 3 MDEF 5 INT +2 LUK +2 AGI +1', '[MVP] Angel wings. DEF 3 MDEF 5 INT +2 LUK +2 AGI +1') },
  guard:        { name: 'Guard',        type: 'armor', slot: 'shield', def: 3, price: 500,  slots: 1, jobs: 'all', icon: { s: 'shield', c: '#a07040' }, desc: L('โล่ไม้ DEF 3 (ใช้กับธนูไม่ได้)', 'A wooden shield. DEF 3 (cannot be used with a bow)') },
  round_shield: { name: 'Energy Buckler', type: 'armor', slot: 'shield', def: 5, price: 6000, slots: 1, lv: 14, jobs: J.heavy, icon: { s: 'shield', c: '#b0b8c8' }, desc: L('โล่พลังงาน DEF 5', 'An energy shield. DEF 5') },
  hood:         { name: 'Hood',         type: 'armor', slot: 'garment', def: 1, price: 120, slots: 1, jobs: 'all', icon: { s: 'cloth', c: '#6a8a5a' }, desc: L('ฮู้ด DEF 1', 'A hood. DEF 1') },
  thermal_cloak:{ name: 'Thermal Cloak', type: 'armor', slot: 'garment', def: 1, price: 1200, slots: 1, jobs: 'all', icon: { s: 'cloth', c: '#5a7a9a' }, b: { flee: 3 }, desc: L('ผ้าคลุมกันความร้อน DEF 1 FLEE +3', 'A heat-resistant cloak. DEF 1 FLEE +3') },
  muffler:      { name: 'Cable Scarf',      type: 'armor', slot: 'garment', def: 2, price: 5000, slots: 1, jobs: 'all', icon: { s: 'cloth', c: '#c04040' }, desc: L('ผ้าพันคอเคเบิล DEF 2', 'A cable scarf. DEF 2') },
  sandals:      { name: 'Hover Pads',      type: 'armor', slot: 'shoes', def: 1, price: 400,  slots: 1, jobs: 'all', icon: { s: 'shoes', c: '#b08050' }, desc: L('แผ่นลอยตัว DEF 1', 'Hover pads. DEF 1') },
  shoes:        { name: 'Servo Boots',        type: 'armor', slot: 'shoes', def: 2, price: 3500, slots: 1, jobs: 'all', icon: { s: 'shoes', c: '#6a4a3a' }, desc: L('รองเท้าเซอร์โว DEF 2', 'Servo boots. DEF 2') },
  boots:        { name: 'Mag Boots',        type: 'armor', slot: 'shoes', def: 4, price: 18000, slots: 1, lv: 20, jobs: 'all', icon: { s: 'shoes', c: '#4a3a2a' }, desc: L('รองเท้าแม่เหล็ก DEF 4', 'Magnetic boots. DEF 4') },
  clip:         { name: 'Clip',         type: 'armor', slot: 'acc', price: 5000, slots: 1, jobs: 'all', icon: { s: 'ring', c: '#c0c0c0' }, b: { sp: 10 }, desc: L('กิ๊บติดผม MaxSP +10 (มีช่องการ์ด)', 'A hair clip. MaxSP +10 (has a chip slot)') },
  data_band:    { name: 'Data Band',    type: 'armor', slot: 'acc', price: 1500, slots: 0, jobs: 'all', icon: { s: 'ring', c: '#60c0e0' }, b: { vit: 1, hp: 40 }, desc: L('สายรัดข้อมูล VIT +1 HP +40', 'A data band. VIT +1 HP +40') },
  ring:         { name: 'Power Ring',         type: 'armor', slot: 'acc', price: 20000, slots: 0, jobs: 'all', icon: { s: 'ring', c: '#e0b040' }, b: { str: 2 }, desc: L('แหวนพลัง STR +2', 'A ring of power. STR +2') },
  earring:      { name: 'Signal Earring',      type: 'armor', slot: 'acc', price: 20000, slots: 0, jobs: 'all', icon: { s: 'ring', c: '#60c0e0' }, b: { int: 2 }, desc: L('ต่างหูรับสัญญาณ INT +2', 'A signal-receiver earring. INT +2') },
  glove:        { name: 'Grip Glove',        type: 'armor', slot: 'acc', price: 20000, slots: 0, jobs: 'all', icon: { s: 'ring', c: '#a06040' }, b: { dex: 2 }, desc: L('ถุงมือยึดเกาะ DEX +2', 'A grip glove. DEX +2') },
  rune_charm:   { name: 'Rune Charm',   type: 'armor', slot: 'acc', price: 20000, slots: 0, jobs: 'all', icon: { s: 'ring', c: '#f0f0f0' }, b: { luk: 2, mdef: 3 }, desc: L('เครื่องรางรูน LUK +2 MDEF 3', 'A rune charm. LUK +2 MDEF 3') },

  // --- การ์ด ---
  pudding_card:    { name: 'Gel Unit Chip',    type: 'card', slot: 'armor',   price: 20, b: { luk: 2, flee: 1 }, icon: { s: 'card', c: '#f0a0c0' }, desc: L('ชิปเสริม — ใส่ชุดเกราะ: LUK +2, FLEE +1', 'Augment chip — Armor slot: LUK +2, FLEE +1') },
  leafworm_card:   { name: 'Crawler Chip',   type: 'card', slot: 'armor',   price: 20, b: { vit: 1, hp: 100 }, icon: { s: 'card', c: '#90d060' }, desc: L('ชิปเสริม — ใส่ชุดเกราะ: VIT +1, MaxHP +100', 'Augment chip — Armor slot: VIT +1, MaxHP +100') },
  moonbun_card:    { name: 'Bunny Unit Chip',    type: 'card', slot: 'garment', price: 20, b: { luk: 1, crit: 1 }, icon: { s: 'card', c: '#f0f0f0' }, desc: L('ชิปเสริม — ใส่ผ้าคลุม: LUK +1, CRIT +1', 'Augment chip — Garment slot: LUK +1, CRIT +1') },
  ember_card:      { name: 'Ember Unit Chip', type: 'card', slot: 'acc',  price: 20, b: { dex: 1, hit: 3 }, icon: { s: 'card', c: '#f0a040' }, desc: L('ชิปเสริม — ใส่เครื่องประดับ: DEX +1, HIT +3', 'Augment chip — Accessory slot: DEX +1, HIT +3') },
  buzzfly_card:    { name: 'Buzz Unit Chip',    type: 'card', slot: 'garment', price: 20, b: { agi: 1, flee: 2 }, icon: { s: 'card', c: '#e0d040' }, desc: L('ชิปเสริม — ใส่ผ้าคลุม: AGI +1, FLEE +2', 'Augment chip — Garment slot: AGI +1, FLEE +2') },
  hopper_card:     { name: 'Hopper Unit Chip', type: 'card', slot: 'acc',   price: 20, b: { dex: 1, atk: 5 }, icon: { s: 'card', c: '#80c040' }, desc: L('ชิปเสริม — ใส่เครื่องประดับ: DEX +1, ATK +5', 'Augment chip — Accessory slot: DEX +1, ATK +5') },
  stumpling_card:  { name: 'Rust Sentry Chip',  type: 'card', slot: 'armor',   price: 20, b: { sp: 80 }, icon: { s: 'card', c: '#a07040' }, desc: L('ชิปเสริม — ใส่ชุดเกราะ: MaxSP +80', 'Augment chip — Armor slot: MaxSP +80') },
  capshroom_card:  { name: 'Mine Unit Chip',  type: 'card', slot: 'head',    price: 20, b: { vit: 2 }, icon: { s: 'card', c: '#e05050' }, desc: L('ชิปเสริม — ใส่หมวก: VIT +2', 'Augment chip — Headgear slot: VIT +2') },
  mosspud_card:    { name: 'Moss Unit Chip', type: 'card', slot: 'weapon', price: 20, b: { atk: 10, luk: 1 }, icon: { s: 'card', c: '#80d080' }, desc: L('ชิปเสริม — ใส่อาวุธ: ATK +10, LUK +1', 'Augment chip — Weapon slot: ATK +10, LUK +1') },
  ashtail_card:    { name: 'Ash Stalker Chip',    type: 'card', slot: 'garment', price: 20, b: { agi: 2, flee: 3 }, icon: { s: 'card', c: '#909090' }, desc: L('ชิปเสริม — ใส่ผ้าคลุม: AGI +2, FLEE +3', 'Augment chip — Garment slot: AGI +2, FLEE +3') },
  fenrir_card:     { name: 'Fenrir Unit Chip', type: 'card', slot: 'weapon',  price: 20, b: { crit: 8 }, icon: { s: 'card', c: '#c0c0d0' }, desc: L('ชิปเสริม — ใส่อาวุธ: CRIT +8', 'Augment chip — Weapon slot: CRIT +8') },
  bear_card:       { name: 'Iron Brute Chip',   type: 'card', slot: 'shield',  price: 20, b: { vit: 1, def: 2 }, icon: { s: 'card', c: '#5a7a3a' }, desc: L('ชิปเสริม — ใส่โล่: VIT +1, DEF +2', 'Augment chip — Shield slot: VIT +1, DEF +2') },
  boar_card:       { name: 'Tusk Trooper Chip',   type: 'card', slot: 'armor',   price: 20, b: { vit: 3 }, icon: { s: 'card', c: '#6a4020' }, desc: L('ชิปเสริม — ใส่ชุดเกราะ: VIT +3', 'Augment chip — Armor slot: VIT +3') },
  draugr_card:     { name: 'Draugr Husk Chip',     type: 'card', slot: 'shield',  price: 20, b: { hp: 200 }, icon: { s: 'card', c: '#709070' }, desc: L('ชิปเสริม — ใส่โล่: MaxHP +200', 'Augment chip — Shield slot: MaxHP +200') },
  warden_card:     { name: 'Frame Warden Chip', type: 'card', slot: 'weapon', price: 20, b: { atk: 10, crit: 2 }, icon: { s: 'card', c: '#f0ecd8' }, desc: L('ชิปเสริม — ใส่อาวุธ: ATK +10, CRIT +2', 'Augment chip — Weapon slot: ATK +10, CRIT +2') },
  helmaiden_card:  { name: 'Hel Maiden Chip', type: 'card', slot: 'head',    price: 20, b: { int: 1, mdef: 5 }, icon: { s: 'card', c: '#4050a0' }, desc: L('ชิปเสริม — ใส่หมวก: INT +1, MDEF +5', 'Augment chip — Headgear slot: INT +1, MDEF +5') },
  helguard_card:   { name: 'Hel Guard Chip',  type: 'card', slot: 'shoes',   price: 20, b: { vit: 1, hp: 150 }, icon: { s: 'card', c: '#303050' }, desc: L('ชิปเสริม — ใส่รองเท้า: VIT +1, MaxHP +150', 'Augment chip — Shoes slot: VIT +1, MaxHP +150') },
  seraph_card:     { name: 'Seraph Core Chip', type: 'card', slot: 'armor', price: 20, b: { str: 2, agi: 2, vit: 2, int: 2, dex: 2, luk: 2 }, icon: { s: 'card', c: '#fff0a0' }, desc: L('[MVP] ใส่ชุดเกราะ: สเตตัสทั้งหมด +2', '[MVP] Armor slot: All stats +2') },
  kitsura_card:    { name: 'Kitsura EX Chip',    type: 'card', slot: 'shoes',   price: 20, b: { agi: 3, sp: 50, flee: 5 }, icon: { s: 'card', c: '#f0c050' }, desc: L('[MVP] ใส่รองเท้า: AGI +3, MaxSP +50, FLEE +5', '[MVP] Shoes slot: AGI +3, MaxSP +50, FLEE +5') },
};
for (const id in ITEMS) ITEMS[id].id = id;

// ชื่อช่องสวมใส่: ใช้คำอังกฤษทั้งสองภาษา (เจ้าของสั่ง: ป้าย UI เป็นภาษาอังกฤษ)
const SLOT_THAI = { weapon: 'Weapon', head: 'Headgear', armor: 'Armor', shield: 'Shield', garment: 'Garment', shoes: 'Shoes', acc: 'Accessory', acc2: 'Accessory' };
const EQUIP_SLOTS = ['head', 'weapon', 'shield', 'armor', 'garment', 'shoes', 'acc', 'acc2'];
// ช่องที่จะสวมไอเทมนี้: เครื่องประดับใส่ช่องที่ว่างก่อน (acc → acc2) เต็มทั้งคู่ = แทนช่องแรก
function equipSlotFor(it, p) {
  if (it.slot !== 'acc') return it.slot;
  return !p.equip.acc ? 'acc' : !p.equip.acc2 ? 'acc2' : 'acc';
}

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
  fenrir_pup:{ name: 'Fenrir Unit',    lv: 25, hp: 900,  atk: [60, 78],  def: 15, mdef: 0,  vit: 22, flee: 55,  hit: 60,  exp: 460, jexp: 320, speed: 2.4, aggro: false, element: 'earth', race: 'brute',
               sprite: 'quad', variant: 'wolf', color: '#b8c0cc', color2: '#5e6674', size: 1.0, drops: [['fenrir_fang', 0.6], ['meat', 0.3]] },
  mossback:  { name: 'Iron Brute', lv: 26, hp: 1150, atk: [65, 82],  def: 25, mdef: 5,  vit: 26, flee: 40,  hit: 55,  exp: 520, jexp: 350, speed: 1.3, aggro: false, stun: [10, 2], element: 'earth', race: 'brute',
               sprite: 'quad', variant: 'bear', color: '#8a7456', color2: '#4e5a3a', size: 1.35, drops: [['moss_hide', 0.5], ['mead', 0.08]] },
  tuskboar:  { name: 'Tusk Trooper',      lv: 28, hp: 1400, atk: [80, 100], def: 30, mdef: 5,  vit: 28, flee: 50,  hit: 65,  exp: 640, jexp: 450, speed: 1.9, aggro: true, stun: [8, 1.5], element: 'earth', race: 'brute',
               sprite: 'quad', variant: 'boar', color: '#6e6258', color2: '#3a342e', size: 1.15, tusk: true, drops: [['iron_tusk', 0.6], ['meat', 0.3]] },

  draugr:    { name: 'Draugr Husk',        lv: 17, hp: 700,  atk: [45, 60],  def: 5,  mdef: 10, vit: 17, flee: 20,  hit: 45,  exp: 330, jexp: 220, speed: 0.9, aggro: true, element: 'undead', race: 'undead',
               glow: '#ff4a3a', sprite: 'human', skin: '#9a8a78', face: '#b4aaa4', outfit: '#5a4a3a', hair: '#6a5a4a', viking: true, joint: '#3a2a22', drops: [['grave_dust', 0.6], ['moss_gel', 0.3]] },
  bone_warden: { name: 'Frame Warden', lv: 24, hp: 1000, atk: [70, 90],  def: 20, mdef: 10, vit: 20, flee: 50,  hit: 60,  exp: 520, jexp: 360, speed: 1.6, aggro: true, stun: [8, 1.5], element: 'undead', race: 'undead',
               glow: '#ff3030', sprite: 'human', skin: '#f0ecd8', outfit: '#f0ecd8', hair: null, bones: true, weapon: 'sword', drops: [['old_bone', 0.5], ['falchion', 0.01]] },
  hel_maiden:{ name: 'Hel Maiden Unit',    lv: 30, hp: 1500, atk: [90, 115], def: 30, mdef: 30, vit: 25, flee: 55,  hit: 75,  exp: 720, jexp: 500, speed: 1.5, aggro: false, element: 'undead', race: 'undead',
               glow: '#60f0d0', sprite: 'human', skin: '#c8d0e0', outfit: '#3a4a6a', hair: '#e8e8f0', hood: '#2a2a3a', halfskull: true, drops: [['hel_lantern', 0.4], ['ribbon', 0.02]] },
  hel_guard: { name: 'Hel Guard Unit',     lv: 32, hp: 1700, atk: [100, 125],def: 30, mdef: 20, vit: 30, flee: 60,  hit: 80,  exp: 800, jexp: 560, speed: 1.5, aggro: true, element: 'undead', race: 'undead', size: 1.3,
               glow: '#ff4a3a', sprite: 'human', skin: '#b8c0d0', outfit: '#2a2a3a', hair: '#101018', viking: true, weapon: 'axe', drops: [['cursed_seal', 0.4], ['iron_helm', 0.02]] },
  kitsura:   { name: 'Kitsura EX', lv: 45, hp: 22000, atk: [180, 240], def: 40, mdef: 50, vit: 40, flee: 110, hit: 130, exp: 16000, jexp: 11000, speed: 2.2, aggro: true, stun: [12, 2], element: 'fire', race: 'demon',
               glow: '#ffae40', sprite: 'human', skin: '#f6d7b8', outfit: '#e86a2a', hair: '#f0a040', fox: true, scale: 1.6, boss: true, respawn: 600000, bossSkill: 'firestorm',
               drops: [['emberfang', 0.4], ['white_potion', 0.8], ['blue_potion', 0.6], ['yggdrasil_shard', 0.15]] },
};
for (const id in MOBS) MOBS[id].id = id;
for (const id in SKILLS) SKILLS[id].id = id;
// ชิปประจำมอน (ได้เมื่อล่าครบ CHIP_KILLS ตัว)
const MOB_CHIP = {"pudding": "pudding_card", "leafworm": "leafworm_card", "moonbun": "moonbun_card", "ember_pudding": "ember_card", "buzzfly": "buzzfly_card", "stumpling": "stumpling_card", "fiddlehopper": "hopper_card", "capshroom": "capshroom_card", "moss_pudding": "mosspud_card", "seraph_pudding": "seraph_card", "ashtail": "ashtail_card", "fenrir_pup": "fenrir_card", "mossback": "bear_card", "tuskboar": "boar_card", "draugr": "draugr_card", "bone_warden": "warden_card", "hel_maiden": "helmaiden_card", "hel_guard": "helguard_card", "kitsura": "kitsura_card"};
const CHIP_KILLS = 50; // (เลิกใช้ — เก็บไว้ให้โค้ดเก่า/เซฟอ้างถึงได้)
// ชิปดรอปแบบสุ่ม % (เจ้าของ 2026-10-03: "เอาเป็น % ก็ได้") — ดรอปซ้ำได้ • มอนทั่วไป 0.2% (≈ 1 ใบ/500 ตัว) • MVP 2%
const CHIP_DROP = 0.002, CHIP_DROP_BOSS = 0.02;

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
// เส้น EXP: ต้นเกมขึ้นไว (Lv 1-10 เท่าเดิมโดยประมาณ) แล้วหนักขึ้นช่วงกลาง-ปลาย
// 2026-10-02 วิเคราะห์ด้วยบอทจำลอง: เดิม 5·lv^2.75 → Lv 50 ใน ~9 ชม. (เร็วกว่า RO มาก) → 3·lv^3: Lv 30 ×1.4, Lv 50 ×1.6 (≈ 12 ชม.)
function baseExpNeed(lv) { return Math.floor(3 * Math.pow(lv, 3)) + 40; }
function jobExpNeed(job, jl) {
  if (job === 'novice') return Math.floor(5 * Math.pow(jl, 1.5)) + 5;
  if (JOBS[job] && JOBS[job].tier === 2) return Math.floor(70 * jl * jl); // Class ขั้น 2 เก็บ Job ช้ากว่า
  if (JOBS[job] && JOBS[job].tier === 3) return Math.floor(100 * jl * jl); // Class 3 (js/class3_data.js) ช้ากว่าอีกขั้น
  return Math.floor(40 * jl * jl);
}
function statCost(v) { return Math.floor((v - 1) / 10) + 2; }
function statPointsForLevel(lv) { return Math.floor(lv / 5) + 3; }

// คูลดาวน์รายสกิล (วินาที) แยกจากดีเลย์รวมหลังใช้สกิล — สกิลตีเบาสั้น สกิลแรง/หมู่ปานกลาง บัฟ/สกิลพิเศษนาน
const SKILL_CD = {
  first_aid: 4, shield_slam: 2, war_cry: 12, whirlwind: 5,
  fire_rune: 2.5, ice_rune: 2, thunder_rune: 8,
  piercing_arrow: 1.5, wolf_companion: 20, blast_trap: 4,
  light_of_freyja: 3, blessing_of_odin: 15, holy_spear: 2,
  backstab: 2.5, smoke_veil: 15, venom_blade: 15,
  rage_strike: 1.5, blood_frenzy: 25, howl: 10,
  shield_throw: 3, earth_rune: 4, charge_arrow: 3, divine_shield: 30, throwing_knife: 1.5, axe_throw: 3,
  spear_of_valhalla: 2, einherjar_guard: 20, judgment_quake: 7, valhallas_call: 12,
  meteor_rune: 6, frost_nova: 8, chain_lightning: 3, rune_barrier: 30,
  arrow_storm: 3, frost_arrow: 2, focused_volley: 5, winter_hunt: 30,
  great_restoration: 5, fate_weave: 30, ragnarok_light: 5, skuld_judgment: 4,
  mirror_strike: 2, fang_of_fenrir: 6, smoke_cyclone: 8, trickster_haste: 30,
  fenrir_bite: 2, ragnarok_cleave: 6, war_howl: 30, undying_rage: 45,
  charge_strike: 3, spiral_pierce: 3, battle_aura: 30, ragnars_fury: 6,
  soul_drain: 1.5, hex_of_hel: 5, dark_nova: 8, void_lance: 4,
  sharp_shot: 2, snipe: 5, wind_walk: 30, twin_shot: 1.5,
  holy_fist: 1.5, triple_palm: 3, divine_burst: 10, zen_body: 30,
  sonic_strike: 1.5, war_drum: 8, song_of_battle: 30, hymn_of_loki: 30,
  titan_smash: 3, earth_splitter: 3, giants_wrath: 30, mountain_heart: 15,
};
for (const id in SKILL_CD) if (SKILLS[id]) SKILLS[id].cd = SKILL_CD[id];
