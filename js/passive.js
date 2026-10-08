'use strict';
// ============================================================
//  ต้นไม้พาสซีฟแบบ Path of Exile
//  ได้ 1 แต้มต่อ 1 Base Level • เริ่มที่แกนกลาง (Core) แล้วเลือกจุดที่ "ติดกับจุดที่เปิดแล้ว" ทีละจุด
//  6 แฉกตามสาย Class: จุดเล็ก (สเตตัสเล็ก ๆ) → จุดเด่น Notable (สเตตัส หรือ ลูกเล่นมีเงื่อนไข) → ปลายแฉก Keystone (กติกา + เงื่อนไข + ข้อเสีย)
//  ระหว่างแฉกมีจุดผสม (วงใน/วงนอก) ให้ข้ามสายได้ • Class ไหนก็เดินไปแฉกไหนก็ได้
// ============================================================

// ป้ายสเตตัส (ใช้ทั้งคำอธิบายจุดและหน้าต่าง)
const PSTAT = {
  str: 'STR', agi: 'AGI', vit: 'VIT', int: 'INT', dex: 'DEX', luk: 'LUK',
  atk: 'ATK', matk: 'MATK', def: 'DEF', mdef: 'MDEF', hit: 'HIT', flee: 'FLEE', crit: 'CRI',
  hp: 'Max HP', sp: 'Max SP', hpPct: L('% HP สูงสุด', '% Max HP'), spPct: L('% SP สูงสุด', '% Max SP'),
  atkPct: L('% ดาเมจกายภาพ', '% Physical DMG'), matkPct: '% MATK', critDmgPct: L('% แรงคริติคอล', '% Crit DMG'), aspdPct: L('% ความเร็วโจมตี', '% Attack Speed'),
  castPct: L('% ร่ายเร็วขึ้น', '% Cast Speed'), speedPct: L('% ความเร็วเดิน', '% Move Speed'), healPct: L('% ฮีลแรงขึ้น', '% Healing'), regenPct: L('% HP ฟื้นต่อรอบ', '% HP Regen per tick'),
  leech: L('% ดาเมจกายภาพดูดเป็น HP', '% Physical Lifesteal'), stunRes: L('% ต้านมึน', '% Stun Resist'), spCostPct: L('% SP ที่ใช้', '% SP Cost'), range: L('ระยะธนู', 'Bow Range'),
  rage: L('% ATK ตาม HP ที่เสียไป', '% ATK by Missing HP'), venom: L('% โอกาสติดพิษเมื่อตี', '% Poison Chance on Hit'),
};
const PSTAT_FMT = (k, v) => {
  const pct = /Pct$|^leech$|^stunRes$|^rage$|^venom$/.test(k);
  const sign = v > 0 ? '+' : '';
  return pct ? `${sign}${v}${PSTAT[k]}` : `${PSTAT[k]} ${sign}${v}`;
};

// ---------- ภาพประกอบจุด (เฉพาะหน้าตา ไม่กระทบค่า) ----------
// ป้ายสั้นสำหรับเขียนใต้จุดเล็กตอนซูมเข้า เช่น "+3 VIT" / "+4% ATK"
const PSHORT = {
  str: 'STR', agi: 'AGI', vit: 'VIT', int: 'INT', dex: 'DEX', luk: 'LUK', atk: 'ATK', matk: 'MATK', def: 'DEF', mdef: 'MDEF', hit: 'HIT', flee: 'FLEE', crit: 'CRI',
  hp: 'HP', sp: 'SP', hpPct: 'HP', spPct: 'SP', atkPct: 'ATK', matkPct: 'MATK', critDmgPct: 'CRI DMG', aspdPct: 'ASPD', castPct: 'CAST', speedPct: 'SPEED',
  healPct: 'HEAL', regenPct: 'REGEN', leech: 'LEECH', stunRes: 'STUN RES', spCostPct: 'SP COST', range: 'RANGE', rage: 'RAGE', venom: 'VENOM',
};
const PSTAT_SHORT = (k, v) => {
  const pct = /Pct$|^leech$|^stunRes$|^rage$|^venom$/.test(k), sign = v > 0 ? '+' : '';
  return `${sign}${v}${pct ? '%' : ''} ${PSHORT[k] || k}`;
};
// ไอคอนเส้น (SVG path ในกรอบ 24×24, เส้นปลายมน) ใช้ได้ทั้งบน canvas (Path2D) และใน HTML (<svg>)
const PGLYPH_PATH = {
  sword: 'M19.5 4.5L9.5 14.5M6.5 12.5l5 5M8.5 15.5l-4 4M19.5 4.5h-4M19.5 4.5v4',
  shield: 'M12 3.5l7 2.6v5.4c0 4.6-3 7.6-7 9.5-4-1.9-7-4.9-7-9.5V6.1z',
  mshield: 'M12 3.5l7 2.6v5.4c0 4.6-3 7.6-7 9.5-4-1.9-7-4.9-7-9.5V6.1zM12 8.5l2.6 3.2-2.6 3.3-2.6-3.3z',
  heart: 'M12 20.5s-7.5-4.6-7.5-10.3A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 2.6c0 5.7-7.5 10.3-7.5 10.3z',
  pulse: 'M3 12.5h4.5l2-5.5 3 11 2.5-5.5H21',
  battery: 'M3 8.5h14a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1zM20.5 10.5v3M5.5 11.5v2M9 11.5v2',
  drop: 'M12 3.5s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z',
  star: 'M12 3.2l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.5l6-.8z',
  sparkle: 'M12 3.5c.4 4.8 3.7 8.1 8.5 8.5-4.8.4-8.1 3.7-8.5 8.5-.4-4.8-3.7-8.1-8.5-8.5 4.8-.4 8.1-3.7 8.5-8.5z',
  feather: 'M19.5 4.5c-5.5 0-10 4.5-12 11.5L5 20.5M7.5 15.5c4.5-.5 8.5-3 10.5-8M11 12h3.5M9 15.5l4-4',
  bolt: 'M13.5 3L6 13.5h5.5l-1 7.5L18 10.5h-5.5z',
  wind: 'M3.5 8h10a2.5 2.5 0 1 0-2.5-2.5M3.5 12.5h14a2.5 2.5 0 1 1-2.5 2.5M3.5 17h7',
  wand: 'M3.5 20.5L14 10M15 4.5l1 2.3 2.3 1-2.3 1-1 2.3-1-2.3-2.3-1 2.3-1z',
  crosshair: 'M12 3v4M12 17v4M3 12h4M17 12h4M16.5 12a4.5 4.5 0 1 1-9 0a4.5 4.5 0 1 1 9 0',
  arrow: 'M4.5 19.5L19 5M19 5h-6.5M19 5v6.5',
  crystal: 'M12 3l7 8.5L12 21 5 11.5zM12 3v18M5 11.5h14',
  plus: 'M12 5v14M5 12h14',
  flame: 'M12 3c.8 4.2 5.5 5.6 5.5 10.5a5.5 5.5 0 0 1-11 0c0-2 .9-3.4 2.2-4.6.1 1.9 1 3 2.1 3.4C10.6 9.5 11.6 6.6 12 3z',
  vial: 'M9.5 3h5M10.5 3v5.2L5.6 16.6A3 3 0 0 0 8.2 21h7.6a3 3 0 0 0 2.6-4.4L13.5 8.2V3M7.6 14.5h8.8M11 17.5h.1M14 18.5h.1',
  anchor: 'M12 4a2 2 0 1 0 .1 0M12 8v13M5 14a7 7 0 0 0 14 0M3.5 13.5l1.5 1.5M20.5 13.5L19 15',
  ghost: 'M5.5 20.5V11a6.5 6.5 0 0 1 13 0v9.5l-2.2-2-2.1 2-2.2-2-2.1 2-2.2-2zM9.5 11h.1M14.5 11h.1',
  eye: 'M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM15 12a3 3 0 1 1-6 0a3 3 0 1 1 6 0',
  core: 'M12 4a8 8 0 1 0 .1 0M12 9a3 3 0 1 0 .1 0M12 1.5V4M12 20v2.5M1.5 12H4M20 12h2.5',
};
// โบนัสแต่ละตัว → ตระกูลไอคอน (ดาบ=ตี โล่=ป้องกัน หัวใจ=HP แบต=SP ดาว=คริ ขนนก=หลบ สายฟ้า=เร็ว เป้า=แม่น ผลึก=เวท)
const PGLYPH = {
  str: 'sword', atk: 'sword', atkPct: 'sword', rage: 'flame',
  vit: 'heart', hp: 'heart', hpPct: 'heart', regenPct: 'pulse', healPct: 'plus',
  def: 'shield', mdef: 'mshield', stunRes: 'anchor',
  agi: 'feather', flee: 'feather', speedPct: 'wind', aspdPct: 'bolt',
  dex: 'crosshair', hit: 'crosshair', range: 'arrow',
  int: 'crystal', matk: 'crystal', matkPct: 'crystal', castPct: 'wand',
  sp: 'battery', spPct: 'battery', spCostPct: 'battery',
  crit: 'star', critDmgPct: 'star', luk: 'sparkle',
  leech: 'drop', venom: 'vial',
};
// Keystone แต่ละอันมีไอคอนเฉพาะตัว
const PKS_GLYPH = { unshaken: 'anchor', overclock: 'flame', phantom: 'ghost', resolute: 'crosshair', bloodmagic: 'drop', mom: 'eye' };
// คำอธิบายสั้นของไอคอน (ใช้ในคำอธิบายประกอบ)
const PGLYPH_LEGEND = [['sword', 'ATK'], ['shield', 'DEF'], ['heart', 'HP'], ['battery', 'SP'], ['star', 'CRI'], ['feather', 'FLEE'], ['bolt', 'ASPD'], ['crosshair', 'HIT'], ['crystal', 'MATK'], ['plus', L('ฮีล', 'Heal')]];
// ---------- Passive แบบ D (เจ้าของ 2026-10-03 "ทำเลย" • "อย่าให้โกงเกินไป") ----------
// 1) ตัวเลขเล็กลง + เพดานรวมเฉพาะส่วนที่มาจากต้นไม้ (PCAP) — ของสวม/Class/สกิล/บัฟ ไม่ถูกตัด
// 2) โหนดใหญ่ (Notable 2–3 อัน/แฉก + Keystone ทุกอัน) เป็น "ลูกเล่นมีเงื่อนไข" (fx) ที่เปลี่ยนวิธีเล่น ไม่ใช่ +% เฉย ๆ
//    ดาเมจ/ASPD/ฮีลจากเงื่อนไข "นับรวม" กับค่าคงที่ใต้เพดานเดียวกัน (เช่น ATK% คงที่ 7 + เงื่อนไข 18 = ใช้ได้แค่ 20)
//    จำลอง DPS: tests/passive.js (Lv 99 เต็มต้น ≈ +30% เดิม +131% • เส้นทางดีสุดเหนือค่ากลาง ≈ +12% เดิม +46%)
//    กติกาเดียวทุกที่ (มอน/ผู้เล่นในลานประลอง ใช้เงื่อนไขเดียวกัน)
// id จุดเดิมทุกจุด (เซฟเก่าโหลดได้ 1:1) • เซฟก่อนรุ่นนี้ได้ "รีเซ็ตฟรี 1 ครั้ง" (PASSIVE_VER)
const PASSIVE_VER = 2;
// เพดานรวมจากต้นไม้ (ค่าลบ = เพดานด้านล่าง เช่น SP cost ลดได้ไม่เกิน 15%)
const PCAP = {
  atkPct: 20, matkPct: 20, aspdPct: 8, castPct: 15, crit: 10, critDmgPct: 15, hpPct: 20, spPct: 20, speedPct: 10,
  def: 12, mdef: 12, hit: 30, flee: 30, leech: 2, healPct: 25, regenPct: 1.5, stunRes: 40, venom: 10, spCostPct: -15, range: 1,
};
// เพดานของผลชั่วคราว (ใช้ร่วมกับค่าคงที่ข้างบน) • taken = ดาเมจที่โดนลดได้มากสุด (%)
const PCAP_FX = { taken: 25 };
// ผลมีเงื่อนไข: ข้อความสั้น (ไทย/อังกฤษ) + ไอคอน • ตัวเลขอยู่ในโหนด (fx: { ชื่อ: ค่า })
const PFX = {
  // --- ดาเมจ (นับรวมเพดาน ATK%/MATK%) ---
  lowDmg: { g: 'flame', th: v => `HP ต่ำกว่า 50%: ดาเมจ +${v}%`, en: v => `Below 50% HP: +${v}% damage` },
  woundDmg: { g: 'flame', th: v => `HP ยิ่งน้อยยิ่งแรง (สูงสุด +${v}%)`, en: v => `Up to +${v}% damage as your HP drops` },
  crowdDmg: { g: 'sword', th: v => `ดาเมจ +${v}% ต่อศัตรูใกล้ตัว (สูงสุด 4)`, en: v => `+${v}% damage per enemy within 3 cells (max 4)` },
  openDmg: { g: 'crosshair', th: v => `ตีแรกใส่เป้าเลือดเต็ม: ดาเมจ +${v}%`, en: v => `First hit on a full-HP target: +${v}% damage` },
  execDmg: { g: 'sword', th: v => `เป้า HP ต่ำกว่า 35%: ดาเมจ +${v}%`, en: v => `+${v}% damage vs targets below 35% HP` },
  dodgeDmg: { g: 'feather', th: v => `หลบได้: ตีครั้งถัดไป +${v}% (ทุก 2 วิ)`, en: v => `After a dodge: next hit +${v}% (every 2s)` },
  weakDmg: { g: 'crystal', th: v => `ธาตุเราชนะธาตุเป้า: ดาเมจ +${v}%`, en: v => `+${v}% damage when your element beats the target's` },
  lowMagic: { g: 'wand', th: v => `HP ต่ำกว่า 50%: ดาเมจเวท +${v}%`, en: v => `Below 50% HP: +${v}% spell damage` },
  farDmg: { g: 'arrow', th: v => `ไม่มีศัตรูในระยะ 2 ช่อง: ดาเมจ +${v}%`, en: v => `No enemy within 2 cells: +${v}% damage` },
  // --- ร่ายเร็ว (ครั้งเดียวหลังฆ่า ไม่นับเพดาน) ---
  killCast: { g: 'wand', th: v => `ฆ่าได้: ร่ายครั้งถัดไป (4 วิ) เร็วขึ้น ${v}%`, en: v => `On kill: next cast within 4s is ${v}% faster` },
  // --- ASPD (นับรวมเพดาน ASPD) ---
  killAspd: { g: 'bolt', th: v => `ฆ่าได้: ASPD +${v}% 5 วิ`, en: v => `On kill: +${v}% ASPD for 5s` },
  stillAspd: { g: 'bolt', th: v => `ยืนนิ่ง 1 วิ: ASPD +${v}%`, en: v => `Standing still: +${v}% ASPD` },
  lowAspd: { g: 'bolt', th: v => `HP ต่ำกว่า 50%: ASPD +${v}%`, en: v => `Below 50% HP: +${v}% ASPD` },
  // --- ฮีล (นับรวมเพดานฮีล) ---
  lowHeal: { g: 'plus', th: v => `HP ต่ำกว่า 50%: ฮีล +${v}%`, en: v => `Below 50% HP: +${v}% healing` },
  spHeal: { g: 'plus', th: v => `SP 50% ขึ้นไป: ฮีล +${v}%`, en: v => `SP above 50%: +${v}% healing` },
  // --- ป้องกัน (ดาเมจที่โดนลดรวมไม่เกิน PCAP_FX.taken) ---
  stillGuard: { g: 'shield', th: v => `ยืนนิ่ง 1 วิ: ดาเมจที่โดน −${v}%`, en: v => `Standing still: −${v}% damage taken` },
  crowdGuard: { g: 'shield', th: v => `ดาเมจที่โดน −${v}% ต่อศัตรูใกล้ตัว (สูงสุด 4)`, en: v => `−${v}% damage taken per enemy within 3 cells (max 4)` },
  ward: { g: 'mshield', th: v => `โดนแรง ≥10% HP: ดาเมจที่โดน −${v}% 3 วิ`, en: v => `Hit for 10%+ Max HP: −${v}% damage taken for 3s` },
  killHeal: { g: 'heart', th: v => `ฆ่าได้: ฟื้น HP ${v}%`, en: v => `On kill: restore ${v}% Max HP` },
  // --- กติกา Keystone ---
  killCrit: { g: 'star', th: () => 'ฆ่าได้: ตีปกติครั้งถัดไป (4 วิ) คริแน่นอน', en: () => 'On kill: next attack within 4s is a sure crit' },
  noStun: { g: 'anchor', th: () => 'ไม่มีวันมึน', en: () => 'Can never be stunned' },
  noFlee: { g: 'feather', th: () => 'FLEE เป็น 0 เสมอ', en: () => 'FLEE is always 0' },
  fleeMul: { g: 'feather', th: v => `FLEE ×${v}`, en: v => `FLEE ×${v}` },
  halfDef: { g: 'shield', th: () => 'DEF เหลือครึ่งเดียว', en: () => 'DEF is halved' },
  farHit: { g: 'crosshair', th: () => 'ไม่มีศัตรูในระยะ 2 ช่อง: ตีโดนทุกครั้ง', en: () => 'No enemy within 2 cells: attacks always hit' },
  noCrit: { g: 'star', th: () => 'ไม่ติดคริติคอลเลย', en: () => 'Can never crit' },
  hpCost: { g: 'drop', th: v => `ใช้สกิลด้วย HP แทน SP (สัดส่วนเท่ากัน ×${v})`, en: v => `Skills cost HP instead of SP (same % of max ×${v})` },
  spShield: { g: 'eye', th: v => `ดาเมจที่โดน ${v}% หักจาก SP ก่อน`, en: v => `${v}% of damage taken drains SP first` },
};

// 6 แฉก (เรียงตามเข็มนาฬิกาจากด้านบน): ธีมแฉกติดกันจะเกี่ยวข้องกัน STR → AGI → DEX → INT → VIT
// icon/tag = ภาพประกอบ (ไอคอนแฉก + คำโปรยสั้นว่าแฉกนี้ให้อะไร)
// notables: [ชื่อ, โบนัสคงที่, ผลมีเงื่อนไข?] • key: [ชื่อ, โบนัสคงที่, ชนิด Keystone, ผลมีเงื่อนไข/กติกา]
const PSECT = [
  { job: 'einherjar', name: 'Bulwark', th: L('ป้อมปราการ', 'Fortress'), color: '#e05a50', main: 'vit', icon: 'shield', tag: L('HP • DEF • ยืนรับ', 'HP • DEF • Hold the line'),
    small: [{ vit: 2 }, { def: 1 }, { hpPct: 2 }, { mdef: 1 }], spine: { vit: 2 },
    notables: [['Iron Frame', { vit: 3, def: 2 }], ['Shield Wall', {}, { stillGuard: 10 }], ['Titan Core', { hpPct: 6, hp: 80 }],
      ['Steadfast', { stunRes: 25, vit: 2 }], ['Repair Protocol', {}, { killHeal: 3 }]],
    key: ['Bulwark Frame', { def: 4 }, 'unshaken', { noStun: 1, noFlee: 1, crowdGuard: 3 }] },
  { job: 'berserker', name: 'Fury', th: L('คลั่ง', 'Frenzy'), color: '#ff8a3a', main: 'str', icon: 'sword', tag: L('ATK • ฆ่าต่อเนื่อง • HP ต่ำ', 'ATK • Kill chains • Low HP'),
    small: [{ str: 1 }, { atkPct: 1 }, { hp: 40 }, { aspdPct: 1 }], spine: { str: 2 },
    notables: [['Brute Force', { str: 1, atkPct: 1 }], ['Blood Engine', { leech: 1, hp: 60 }], ['Frenzy Drive', {}, { killAspd: 5 }],
      ['Wound Fury', {}, { woundDmg: 4 }], ['Heavy Hitter', {}, { crowdDmg: 1 }]],
    key: ['Overclock', { hpPct: -15 }, 'overclock', { lowDmg: 8, lowAspd: 5 }] },
  { job: 'trickster', name: 'Shadow', th: L('เงา', 'Shade'), color: '#b070ff', main: 'agi', icon: 'feather', tag: L('FLEE • หลบแล้วสวน • ปิดฉาก', 'FLEE • Dodge & strike • Finish'),
    small: [{ agi: 1 }, { flee: 6 }, { crit: 1 }, { luk: 2 }], spine: { agi: 1, flee: 5 },
    notables: [['Quickstep', { agi: 1, speedPct: 4 }], ['Ghost Protocol', {}, { dodgeDmg: 12 }], ['Lucky Seven', { luk: 3, crit: 1 }],
      ['Assassin Code', {}, { execDmg: 8 }], ['Toxin Coating', { venom: 5 }]],
    key: ['Phantom Code', {}, 'phantom', { fleeMul: 1.2, halfDef: 1, killCrit: 1 }] },
  { job: 'wildhunter', name: 'Hunt', th: L('นักล่า', 'Hunter'), color: '#5ad05a', main: 'dex', icon: 'crosshair', tag: L('HIT • ยืนยิง • นัดเปิด', 'HIT • Stand & shoot • Opener'),
    small: [{ dex: 1 }, { hit: 1 }, { aspdPct: 1 }, { critDmgPct: 2 }], spine: { dex: 2 },
    notables: [['Eagle Sight', { dex: 1, hit: 1 }], ['Long Shot', { range: 1, dex: 1 }], ['Rapid Fire', {}, { stillAspd: 5 }],
      ['Hunter Mark', {}, { openDmg: 15 }], ['Trail Runner', { speedPct: 5, agi: 1 }]],
    key: ['Resolute Aim', {}, 'resolute', { farHit: 1, farDmg: 8, noCrit: 1 }] },
  { job: 'runecaster', name: 'Rune', th: L('รูน', 'Runecraft'), color: '#4aa8ff', main: 'int', icon: 'crystal', tag: L('MATK • ธาตุ • ยืนร่าย', 'MATK • Elements • Turret'),
    small: [{ int: 1 }, { matkPct: 1 }, { castPct: 2 }, { sp: 20 }], spine: { int: 2 },
    notables: [['Rune Scholar', { int: 1, matkPct: 1 }], ['Quick Glyph', { castPct: 3 }, { killCast: 30 }], ['Arcane Battery', { sp: 50, spPct: 4 }],
      ['Elemental Focus', {}, { weakDmg: 8 }], ['Efficient Casting', { spCostPct: -8, int: 1 }]],
    key: ['Blood Circuit', { hpPct: 10 }, 'bloodmagic', { hpCost: 1.5, lowMagic: 10 }] },
  { job: 'volva', name: 'Seer', th: L('พยากรณ์', 'Prophecy'), color: '#ffd84a', main: 'int', icon: 'eye', tag: L('ฮีล • SP • กันแรง', 'Healing • SP • Ward'),
    small: [{ int: 1 }, { healPct: 4 }, { spPct: 3 }, { regenPct: 0.3 }], spine: { int: 2 },
    notables: [['Seer Mind', { int: 1, mdef: 3 }], ['Healing Light', {}, { lowHeal: 25 }], ['Spirit Well', { spPct: 6, sp: 40 }],
      ['Sacred Ward', {}, { ward: 20 }], ['Renewal', { regenPct: 1 }]],
    key: ['Mind over Matter', {}, 'mom', { spShield: 30, spHeal: 20 }] },
];


// แบบแปลนของ 1 แฉก: [ชื่อ, รัศมี, มุมเบี่ยงจากแกนแฉก (องศา), ชนิด]  ชนิด: s0-3 จุดเล็ก, S จุดสเตตัสหลัก, N0-4 Notable, K Keystone
const PTPL = [
  ['a', 95, 0, 's0'], ['b', 155, 0, 'S'], ['c', 210, -9, 's1'], ['d', 210, 9, 's2'], ['e', 265, 0, 'N0'],
  ['f', 320, -12, 's0'], ['g', 320, 12, 's3'], ['h', 375, -16, 's1'], ['i', 375, 16, 's2'], ['j', 430, -21, 'N1'], ['k', 430, 21, 'N2'],
  ['m', 480, -8, 's3'], ['m2', 480, 8, 's0'], ['n', 535, 0, 'S'], ['n2', 590, 0, 's1'], ['o', 655, 0, 'K'],
  ['p', 255, -19, 's3'], ['p2', 300, -22, 's2'], ['q', 345, -24, 'N3'], ['q1', 398, -26, 's0'],
  ['r', 255, 19, 's3'], ['r2', 300, 22, 's2'], ['t', 345, 24, 'N4'], ['t1', 398, 26, 's1'],
];
const PTPL_LINKS = [['a', 'b'], ['b', 'c'], ['b', 'd'], ['c', 'e'], ['d', 'e'], ['e', 'f'], ['e', 'g'], ['f', 'h'], ['g', 'i'], ['h', 'j'], ['i', 'k'],
  ['j', 'm'], ['k', 'm2'], ['m', 'm2'], ['m', 'n'], ['m2', 'n'], ['n', 'n2'], ['n2', 'o'],
  ['c', 'p'], ['p', 'p2'], ['p2', 'q'], ['q', 'q1'], ['q1', 'h'], ['d', 'r'], ['r', 'r2'], ['r2', 't'], ['t', 't1'], ['t1', 'i']];


// ข้อความผลมีเงื่อนไขของจุด (ทีละบรรทัด) • lang: 'th' | 'en' (ไม่ใส่ = ภาษาที่เล่นอยู่)
function pfxLines(n, lang) {
  const en = (lang || (typeof LANG !== 'undefined' ? LANG : 'th')) === 'en';
  return n && n.fx ? Object.entries(n.fx).map(([k, v]) => PFX[k][en ? 'en' : 'th'](v)) : [];
}

const PTREE = (() => {
  const nodes = {}, add = (id, x, y, kind, o) => (nodes[id] = Object.assign({ id, x, y, kind, links: [] }, o));
  const link = (a, b) => { nodes[a].links.push(b); nodes[b].links.push(a); };
  const polar = (r, deg) => [Math.cos(deg * Math.PI / 180) * r, Math.sin(deg * Math.PI / 180) * r];
  const merge = (a, b) => { const o = Object.assign({}, a); for (const k in b) o[k] = (o[k] || 0) + b[k]; return o; };
  add('core', 0, 0, 'start', { name: 'Core', b: {}, sect: -1 });
  PSECT.forEach((S, si) => {
    const base = -90 + si * 60;
    for (const [k, r, off, t] of PTPL) {
      const [x, y] = polar(r, base + off), id = `${si}${k}`;
      if (t === 'K') add(id, x, y, 'key', { name: S.key[0], b: S.key[1], ks: S.key[2], fx: S.key[3], sect: si });
      else if (t[0] === 'N') { const [nm, b, fx] = S.notables[+t[1]]; add(id, x, y, 'notable', { name: nm, b, fx: fx || null, sect: si }); }
      else if (t === 'S') add(id, x, y, 'small', { name: `${S.name} Node`, b: S.spine, sect: si });
      else add(id, x, y, 'small', { name: `${S.name} Node`, b: S.small[+t[1]], sect: si });
    }
    for (const [a, b] of PTPL_LINKS) link(`${si}${a}`, `${si}${b}`);
    link('core', `${si}a`);
  });
  // จุดผสมระหว่างแฉก: วงใน (สเตตัสหลักของสองฝั่ง) และวงนอก (จุดเล็กของสองฝั่งรวมกัน)
  PSECT.forEach((S, si) => {
    const nj = (si + 1) % 6, N = PSECT[nj], mid = -90 + si * 60 + 30;
    const [ix, iy] = polar(160, mid);
    add(`in${si}`, ix, iy, 'small', { name: `${S.name}–${N.name}`, b: merge({ [S.main]: 1 }, { [N.main]: 1 }), sect: -1, mix: [si, nj] });
    link(`in${si}`, `${si}b`); link(`in${si}`, `${nj}b`);
    const [ox, oy] = polar(450, mid);
    add(`out${si}`, ox, oy, 'small', { name: `${S.name}–${N.name}`, b: merge(S.small[1], N.small[1]), sect: -1, mix: [si, nj] });
    link(`out${si}`, `${si}k`); link(`out${si}`, `${nj}j`);
  });
  // ข้อความผลมีเงื่อนไข (ภาษาที่เล่นอยู่) • kdesc = ชื่อเดิมที่โค้ดอื่นใช้กับ Keystone
  for (const n of Object.values(nodes)) if (n.fx) { n.fdesc = pfxLines(n).join(' • '); if (n.kind === 'key') n.kdesc = n.fdesc; }
  return nodes;
})();

const Passive = {
  // แต้มทั้งหมด = Base Level - 1 (ได้ย้อนหลังสำหรับตัวละครเก่าด้วย)
  total(p) { return Math.max(0, p.baseLv - 1); },
  list(p) { return (p.passives || (p.passives = [])).filter(id => PTREE[id]); },
  free(p) { return this.total(p) - this.list(p).length; },
  has(p, id) { return id === 'core' || this.list(p).includes(id); },
  keystone(p, ks) { return this.list(p).some(id => PTREE[id].ks === ks); },
  canAlloc(p, id) {
    const n = PTREE[id];
    return !!n && !this.has(p, id) && this.free(p) > 0 && n.links.some(l => this.has(p, l));
  },
  alloc(p, id) {
    if (!this.canAlloc(p, id)) return false;
    p.passives.push(id); recalc(); saveGame();
    Sound.play(PTREE[id].kind === 'small' ? 'click' : 'buff');
    return true;
  },
  // คืนแต้ม: ทำได้เมื่อจุดที่เหลือยังต่อถึงแกนกลางครบ • เลเวล 15 ลงมาคืนฟรี ไม่งั้นเสียเงิน
  refundCost(p) { return p.baseLv <= 15 ? 0 : 10 * p.baseLv; },
  canRefund(p, id) {
    if (!this.list(p).includes(id)) return false;
    const rest = new Set(this.list(p).filter(x => x !== id)), seen = new Set(['core']), st = ['core'];
    while (st.length) for (const l of PTREE[st.pop()].links) if (rest.has(l) && !seen.has(l)) { seen.add(l); st.push(l); }
    return seen.size - 1 === rest.size;
  },
  refund(p, id) {
    const cost = this.refundCost(p);
    if (!this.canRefund(p, id)) return L('ต้องคืนจุดที่อยู่ปลายทางก่อน (จุดที่เหลือต้องต่อถึงแกนกลาง)', 'Refund the outer nodes first (remaining nodes must stay connected to the Core)');
    if (p.zeny < cost) return L(`เงินไม่พอ (ต้องใช้ ${U.fmt(cost)} ${CUR})`, `Not enough funds (requires ${U.fmt(cost)} ${CUR})`);
    p.zeny -= cost; p.passives = this.list(p).filter(x => x !== id); recalc(); saveGame();
    return '';
  },
  // รีเซ็ตทั้งต้นฟรี (ได้ 1 ครั้งตอนปรับต้นไม้เป็นแบบ D — p.ptReset)
  resetAll(p) {
    if (!(p.ptReset > 0)) return L('ไม่มีสิทธิ์รีเซ็ตฟรีแล้ว', 'No free reset left');
    if (!this.list(p).length) return L('ยังไม่ได้เปิดจุดไหน', 'No nodes allocated yet');
    p.passives = []; p.ptReset--; recalc(); saveGame();
    return '';
  },
  // เซฟเก่า → รุ่นปัจจุบัน: id เดิมใช้ต่อ 1:1 • id ที่ไม่มี/ซ้ำ/ต่อแกนไม่ถึง ถูกตัด (แต้มคืนเอง เพราะแต้มว่าง = แต้มทั้งหมด − จุดที่เปิด)
  // เซฟก่อน PASSIVE_VER ที่เปิดจุดไว้แล้ว ได้รีเซ็ตฟรี 1 ครั้ง (ความหมายจุดใหญ่เปลี่ยน → เลือกใหม่ได้ไม่เสียเงิน)
  migrate(p, data) {
    const seen = new Set(), own = Object.prototype.hasOwnProperty;
    const list = (Array.isArray(p.passives) ? p.passives : []).filter(id => typeof id === 'string' && id !== 'core' && own.call(PTREE, id) && !seen.has(id) && seen.add(id));
    const set = new Set(list), ok = new Set(['core']), st = ['core'];
    while (st.length) for (const l of PTREE[st.pop()].links) if (set.has(l) && !ok.has(l)) { ok.add(l); st.push(l); }
    p.passives = list.filter(id => ok.has(id));
    const ver = data && Number.isFinite(data.ptV) ? data.ptV : 1;
    p.ptReset = ver < PASSIVE_VER ? (p.passives.length ? 1 : 0) : U.clamp(Math.floor(+(data && data.ptReset) || 0), 0, 9);
    p.ptV = PASSIVE_VER;
  },
  // ผลรวมโบนัสคงที่ "จากต้นไม้เท่านั้น" หลังตัดเพดาน (PCAP)
  raw(p) {
    const b = {};
    for (const id of this.list(p)) for (const k in PTREE[id].b) b[k] = (b[k] || 0) + PTREE[id].b[k];
    return b;
  },
  sum(p) {
    const b = this.raw(p);
    for (const k in PCAP) if (b[k] != null) b[k] = PCAP[k] < 0 ? Math.max(PCAP[k], b[k]) : Math.min(PCAP[k], b[k]);
    return b;
  },
  // recalc() บวกค่านี้ (js/loot.js ห่อฟังก์ชันนี้ระหว่าง recalc เพื่อบวกโบนัสชุดเซ็ตด้วย — เซ็ตจึงไม่ถูกตัดเพดาน)
  bonus(p) { return this.sum(p); },
  // ผลมีเงื่อนไขทั้งหมดที่เปิดอยู่ { ชื่อ: ค่ารวม } • ไม่มีเลย = null (ไม่ต้องคำนวณอะไรตอนเล่น)
  fxOf(p) {
    let o = null;
    for (const id of this.list(p)) { const f = PTREE[id].fx; if (f) for (const k in f) { o = o || {}; o[k] = (o[k] || 0) + f[k]; } }
    return o;
  },
  // ข้อมูลเมเตอร์เพดานในหน้าต่าง: [{ k, v (หลังตัด), raw, cap }] เฉพาะค่าที่มี • ATK%/MATK% ขึ้นก่อน
  capUse(p) {
    const r = this.raw(p), out = [];
    for (const k in PCAP) {
      const raw = r[k] || 0, cap = PCAP[k];
      if (cap < 0 ? raw >= 0 : raw <= 0) continue;
      out.push({ k, raw, cap, v: cap < 0 ? Math.max(cap, raw) : Math.min(cap, raw), full: cap < 0 ? raw <= cap : raw >= cap });
    }
    const pri = ['atkPct', 'matkPct', 'aspdPct', 'castPct', 'critDmgPct', 'hpPct'];
    return out.sort((a, b) => (pri.indexOf(a.k) + 1 || 99) - (pri.indexOf(b.k) + 1 || 99) || Math.abs(b.v / b.cap) - Math.abs(a.v / a.cap));
  },
  // ---------- ตอนเล่น: เงื่อนไข (เรียกจาก js/game.js) ----------
  still(p) { return p.pv_still != null && G.time - p.pv_still >= 1; }, // ยืนนิ่ง (ไม่เดิน) อย่างน้อย 1 วิ — ร่าย/ตีอยู่กับที่นับเป็นนิ่ง
  nearby(p) { let n = 0; for (const m of G.mobs) if (!m.dead && !m.ally && U.dist(m.x, m.y, p.x, p.y) <= 3) n++; return Math.min(4, n); },
  far(p) { for (const m of G.mobs) if (!m.dead && !m.ally && U.dist(m.x, m.y, p.x, p.y) <= 2) return false; return true; }, // ไม่มีศัตรูในระยะ 2 ช่อง (ยิงจากไกล)
  hpFrac(p) { return p.d.maxHp ? p.hp / p.d.maxHp : 1; },
  // ตัวคูณดาเมจจากเงื่อนไข (กายภาพ/เวท) — นับรวมกับ ATK%/MATK% คงที่จากต้นไม้ ใต้เพดานเดียวกัน • em = ตัวคูณธาตุ (>1 = ธาตุชนะ)
  // m = เป้า (มอน หรือผู้เล่นในลานประลอง — กติกาเดียว) • ใช้โบนัส "หลบแล้วสวน" ไปในครั้งนี้
  dmgMul(m, kind = 'phys', em = 1) {
    const p = G.player, d = p && p.d, fx = d && d.pfx;
    if (!fx) return 1;
    const hp = this.hpFrac(p), full = m && m.maxHp > 0 && m.hp >= m.maxHp, low = m && m.maxHp > 0 && m.hp < m.maxHp * 0.35;
    let add = 0;
    if (fx.lowDmg && hp < 0.5) add += fx.lowDmg;
    if (fx.farDmg && this.far(p)) add += fx.farDmg;
    if (fx.woundDmg) add += fx.woundDmg * Math.min(1, Math.max(0, 1 - hp) / 0.75);
    if (fx.crowdDmg) add += fx.crowdDmg * this.nearby(p);
    if (fx.openDmg && full) add += fx.openDmg;
    if (fx.execDmg && low) add += fx.execDmg;
    if (fx.weakDmg && em > 1) add += fx.weakDmg;
    if (fx.lowMagic && kind === 'magic' && hp < 0.5) add += fx.lowMagic;
    if (fx.dodgeDmg && p.pv_dodge > G.time) { add += fx.dodgeDmg; p.pv_dodge = 0; }
    if (add <= 0) return 1;
    const room = Math.max(0, (kind === 'magic' ? PCAP.matkPct - (d.pMatkPct || 0) : PCAP.atkPct - (d.pAtkPct || 0)));
    return 1 + Math.min(add, room) / 100;
  },
  consumeHit() { const p = G.player; if (p) p.pv_dodge = 0; },
  // ดาเมจที่โดน × ค่านี้ (ลดรวมไม่เกิน PCAP_FX.taken)
  takenMul() {
    const p = G.player, fx = p && p.d && p.d.pfx;
    if (!fx) return 1;
    let cut = 0;
    if (fx.stillGuard && this.still(p)) cut += fx.stillGuard;
    if (fx.crowdGuard) cut += fx.crowdGuard * this.nearby(p);
    if (fx.ward && p.pv_ward > G.time) cut += fx.ward;
    return 1 - Math.min(cut, PCAP_FX.taken) / 100;
  },
  aspdAdd(p) {
    const fx = p.d.pfx; let add = 0;
    if (fx.killAspd && p.pv_frenzy > G.time) add += fx.killAspd;
    if (fx.stillAspd && this.still(p)) add += fx.stillAspd;
    if (fx.lowAspd && this.hpFrac(p) < 0.5) add += fx.lowAspd;
    return Math.min(add, Math.max(0, PCAP.aspdPct - (p.d.pAspdPct || 0)));
  },
  healAdd(p) {
    const fx = p.d.pfx; let add = 0;
    if (fx.lowHeal && this.hpFrac(p) < 0.5) add += fx.lowHeal;
    if (fx.spHeal && p.d.maxSp && p.sp >= p.d.maxSp * 0.5) add += fx.spHeal;
    return Math.min(add, Math.max(0, PCAP.healPct - (p.d.pHealPct || 0)));
  },
  // ทุกเฟรม (updatePlayer): จับเวลายืนนิ่ง + ปรับ ASPD/ฮีลตามเงื่อนไข (ค่าฐานจาก recalc + ตัวห่อของ js/feel.js)
  tick(p) {
    if (p.pv_still == null || p.moving || (p.path && p.path.length)) p.pv_still = G.time;
    const d = p.d;
    if (!d || !d.pfx) return;
    if (!d.pvBase) Object.defineProperty(d, 'pvBase', { value: { aspd: d.aspdDelay, heal: d.healPct || 0 } }); // ไม่ enumerable: ไม่ปนข้อมูลสเตตัส (JSON/เทียบค่า)
    const a = this.aspdAdd(p), nd = a ? Math.max(Math.min(250, d.pvBase.aspd), Math.floor(d.pvBase.aspd * (1 - a / 100))) : d.pvBase.aspd;
    if (nd !== d.aspdDelay) { d.aspdDelay = nd; d.aspd = Math.floor(200 - nd / 10); }
    d.healPct = d.pvBase.heal + this.healAdd(p);
  },
  // เหตุการณ์
  onKill() {
    const p = G.player, fx = p && p.d && p.d.pfx;
    if (!fx || p.dead) return;
    if (fx.killAspd) { if (!(p.pv_frenzy > G.time)) addFloater(p.x, p.y - 1.7, 'Frenzy', '#ff9a4a'); p.pv_frenzy = G.time + 5; }
    if (fx.killCrit) { if (!(p.pv_kcrit > G.time)) addFloater(p.x, p.y - 1.7, 'Phantom', '#c890ff'); p.pv_kcrit = G.time + 4; }
    if (fx.killCast) p.pv_kcast = G.time + 4;
    if (fx.killHeal && p.hp < p.d.maxHp) healPlayer(Math.max(1, Math.round(p.d.maxHp * fx.killHeal / 100)), L('ซ่อม', 'Repair'));
  },
  takeCrit() { const p = G.player; if (p && p.pv_kcrit > G.time) { p.pv_kcrit = 0; return true; } return false; },
  // ตัวคูณเวลาร่าย (ใช้ครั้งเดียวหลังฆ่า)
  castMul() {
    const p = G.player, fx = p && p.d && p.d.pfx;
    if (!fx || !fx.killCast || !(p.pv_kcast > G.time)) return 1;
    p.pv_kcast = 0;
    return 1 - Math.min(60, fx.killCast) / 100;
  },
  onDodge() {
    const p = G.player, fx = p && p.d && p.d.pfx;
    if (!fx || !fx.dodgeDmg || p.pv_dodge > G.time || p.pv_dodgeCd > G.time) return; // ติดได้ทุก 2 วิ (หลบรัว ๆ ในฝูงไม่กลายเป็นบัฟถาวร)
    addFloater(p.x + 0.3, p.y - 1.7, 'Counter', '#d0a0ff');
    p.pv_dodge = G.time + 4; p.pv_dodgeCd = G.time + 2;
  },
  onHurt(dmg) {
    const p = G.player, fx = p && p.d && p.d.pfx;
    if (!fx || !fx.ward || dmg < p.d.maxHp * 0.1 || p.pv_wardCd > G.time) return;
    p.pv_ward = G.time + 3; p.pv_wardCd = G.time + 10;
    addFloater(p.x - 0.3, p.y - 1.7, 'Ward', '#ffe28a');
  },
  // ---------- ข้อความ ----------
  fxText(n, lang) { return pfxLines(n, lang).join(' • '); },
  desc(n) {
    const lines = Object.entries(n.b).map(([k, v]) => PSTAT_FMT(k, v));
    return lines.concat(pfxLines(n));
  },
  // ไอคอนประจำจุด: Keystone ใช้ของตัวเอง, แกนกลาง = core, ที่เหลือดูจากโบนัสตัวแรก (จุดมีเงื่อนไขล้วนดูจากผลแรก)
  glyph(n) {
    if (n.ks && PKS_GLYPH[n.ks]) return PKS_GLYPH[n.ks];
    if (n.kind === 'start') return 'core';
    for (const k in n.b) if (PGLYPH[k]) return PGLYPH[k];
    if (n.fx) for (const k in n.fx) if (PFX[k]) return PFX[k].g;
    return 'sparkle';
  },
};
