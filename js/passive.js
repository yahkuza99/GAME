'use strict';
// ============================================================
//  ต้นไม้พาสซีฟแบบ Path of Exile
//  ได้ 1 แต้มต่อ 1 Base Level • เริ่มที่แกนกลาง (Core) แล้วเลือกจุดที่ "ติดกับจุดที่เปิดแล้ว" ทีละจุด
//  6 แฉกตามสายอาชีพ: จุดเล็ก (สเตตัส) → จุดเด่น Notable (โบนัสใหญ่) → ปลายแฉก Keystone (เปลี่ยนกติกา มีข้อเสีย)
//  ระหว่างแฉกมีจุดผสม (วงใน/วงนอก) ให้ข้ามสายได้ • อาชีพไหนก็เดินไปแฉกไหนก็ได้
// ============================================================

// ป้ายสเตตัส (ใช้ทั้งคำอธิบายจุดและหน้าต่าง)
const PSTAT = {
  str: 'STR', agi: 'AGI', vit: 'VIT', int: 'INT', dex: 'DEX', luk: 'LUK',
  atk: 'ATK', matk: 'MATK', def: 'DEF', mdef: 'MDEF', hit: 'HIT', flee: 'FLEE', crit: 'CRI',
  hp: L('HP สูงสุด', 'Max HP'), sp: L('SP สูงสุด', 'Max SP'), hpPct: L('% HP สูงสุด', '% Max HP'), spPct: L('% SP สูงสุด', '% Max SP'),
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

// 6 แฉก (เรียงตามเข็มนาฬิกาจากด้านบน): ธีมแฉกติดกันจะเกี่ยวข้องกัน STR → AGI → DEX → INT → VIT
// icon/tag = ภาพประกอบ (ไอคอนแฉก + คำโปรยสั้นว่าแฉกนี้ให้อะไร)
const PSECT = [
  { job: 'einherjar', name: 'Bulwark', th: L('ป้อมปราการ', 'Fortress'), color: '#e05a50', main: 'vit', icon: 'shield', tag: L('HP • DEF • ต้านมึน', 'HP • DEF • Stun Resist'),
    small: [{ vit: 3 }, { def: 2 }, { hpPct: 3 }, { mdef: 2 }],
    notables: [['Iron Frame', { vit: 6, def: 5 }], ['Shield Wall', { def: 8, mdef: 6 }], ['Titan Core', { hpPct: 10, hp: 100 }],
      ['Steadfast', { stunRes: 50, vit: 4 }], ['Repair Protocol', { regenPct: 1, hpPct: 5 }]],
    key: ['Bulwark Frame', { def: 15, mdef: 10 }, 'unshaken', L('ไม่มีวันมึน แต่ FLEE เหลือ 0 (หลบไม่ได้เลย)', 'Can never be stunned, but FLEE drops to 0 (cannot dodge at all)')] },
  { job: 'berserker', name: 'Fury', th: L('คลั่ง', 'Frenzy'), color: '#ff8a3a', main: 'str', icon: 'sword', tag: L('ATK • ASPD • ดูดเลือด', 'ATK • ASPD • Lifesteal'),
    small: [{ str: 3 }, { atkPct: 4 }, { hp: 40 }, { aspdPct: 2 }],
    notables: [['Brute Force', { str: 6, atkPct: 6 }], ['Blood Engine', { leech: 2, hp: 60 }], ['Frenzy Drive', { aspdPct: 6, atkPct: 4 }],
      ['Wound Fury', { rage: 15 }], ['Heavy Hitter', { atkPct: 10, critDmgPct: 10 }]],
    key: ['Overclock', { atkPct: 40, hpPct: -25 }, 'overclock', L('ดาเมจกายภาพ +40% แต่ HP สูงสุด -25%', 'Physical damage +40%, but Max HP -25%')] },
  { job: 'trickster', name: 'Shadow', th: L('เงา', 'Shade'), color: '#b070ff', main: 'agi', icon: 'feather', tag: 'FLEE • CRI • LUK',
    small: [{ agi: 3 }, { flee: 4 }, { crit: 2 }, { luk: 3 }],
    notables: [['Quickstep', { agi: 6, speedPct: 5 }], ['Ghost Protocol', { flee: 15 }], ['Lucky Seven', { luk: 7, crit: 4 }],
      ['Assassin Code', { critDmgPct: 25 }], ['Toxin Coating', { venom: 10 }]],
    key: ['Phantom Code', {}, 'phantom', L('FLEE x1.5 แต่ DEF เหลือครึ่งเดียว', 'FLEE x1.5, but DEF is halved')] },
  { job: 'wildhunter', name: 'Hunt', th: L('นักล่า', 'Hunter'), color: '#5ad05a', main: 'dex', icon: 'crosshair', tag: L('HIT • DEX • ระยะยิง', 'HIT • DEX • Range'),
    small: [{ dex: 3 }, { hit: 4 }, { aspdPct: 2 }, { critDmgPct: 6 }],
    notables: [['Eagle Sight', { dex: 6, hit: 8 }], ['Long Shot', { range: 1, dex: 3 }], ['Rapid Fire', { aspdPct: 8 }],
      ['Hunter Mark', { critDmgPct: 15, crit: 3 }], ['Trail Runner', { speedPct: 8, agi: 3 }]],
    key: ['Resolute Aim', { atkPct: 10 }, 'resolute', L('ตีโดนทุกครั้ง แต่ไม่ติดคริติคอลเลย', 'Always hits, but can never land a critical')] },
  { job: 'runecaster', name: 'Rune', th: L('รูน', 'Runecraft'), color: '#4aa8ff', main: 'int', icon: 'crystal', tag: L('MATK • ร่ายเร็ว • SP', 'MATK • Fast Cast • SP'),
    small: [{ int: 3 }, { matkPct: 4 }, { castPct: 3 }, { sp: 20 }],
    notables: [['Rune Scholar', { int: 6, matkPct: 6 }], ['Quick Glyph', { castPct: 10 }], ['Arcane Battery', { sp: 60, spPct: 6 }],
      ['Elemental Focus', { matkPct: 12 }], ['Efficient Casting', { spCostPct: -12, int: 3 }]],
    key: ['Blood Circuit', { hpPct: 20 }, 'bloodmagic', L('ใช้สกิลด้วย HP แทน SP (HP สูงสุด +20%)', 'Skills consume HP instead of SP (Max HP +20%)')] },
  { job: 'volva', name: 'Seer', th: L('พยากรณ์', 'Prophecy'), color: '#ffd84a', main: 'int', icon: 'eye', tag: L('ฮีล • SP • MDEF', 'Healing • SP • MDEF'),
    small: [{ int: 3 }, { healPct: 6 }, { spPct: 4 }, { regenPct: 0.5 }],
    notables: [['Seer Mind', { int: 6, mdef: 5 }], ['Healing Light', { healPct: 20 }], ['Spirit Well', { spPct: 10, sp: 40 }],
      ['Sacred Ward', { mdef: 8, vit: 4 }], ['Renewal', { regenPct: 1.5 }]],
    key: ['Mind over Matter', {}, 'mom', L('ดาเมจที่โดน 30% หักจาก SP ก่อน HP', '30% of damage taken is drained from SP before HP')] },
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
      if (t === 'K') add(id, x, y, 'key', { name: S.key[0], b: S.key[1], ks: S.key[2], kdesc: S.key[3], sect: si });
      else if (t[0] === 'N') { const [nm, b] = S.notables[+t[1]]; add(id, x, y, 'notable', { name: nm, b, sect: si }); }
      else if (t === 'S') add(id, x, y, 'small', { name: `${S.name} Node`, b: { [S.main]: 5 }, sect: si });
      else add(id, x, y, 'small', { name: `${S.name} Node`, b: S.small[+t[1]], sect: si });
    }
    for (const [a, b] of PTPL_LINKS) link(`${si}${a}`, `${si}${b}`);
    link('core', `${si}a`);
  });
  // จุดผสมระหว่างแฉก: วงใน (สเตตัสหลักของสองฝั่ง) และวงนอก (จุดเล็กของสองฝั่งรวมกัน)
  PSECT.forEach((S, si) => {
    const nj = (si + 1) % 6, N = PSECT[nj], mid = -90 + si * 60 + 30;
    const [ix, iy] = polar(160, mid);
    add(`in${si}`, ix, iy, 'small', { name: `${S.name}–${N.name}`, b: merge({ [S.main]: 2 }, { [N.main]: 2 }), sect: -1, mix: [si, nj] });
    link(`in${si}`, `${si}b`); link(`in${si}`, `${nj}b`);
    const [ox, oy] = polar(450, mid);
    add(`out${si}`, ox, oy, 'small', { name: `${S.name}–${N.name}`, b: merge(S.small[1], N.small[1]), sect: -1, mix: [si, nj] });
    link(`out${si}`, `${si}k`); link(`out${si}`, `${nj}j`);
  });
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
  // รวมโบนัสทุกจุดที่เปิด (เรียกจาก recalc)
  bonus(p) {
    const b = {};
    for (const id of this.list(p)) for (const k in PTREE[id].b) b[k] = (b[k] || 0) + PTREE[id].b[k];
    return b;
  },
  desc(n) {
    const lines = Object.entries(n.b).map(([k, v]) => PSTAT_FMT(k, v));
    if (n.kdesc) lines.push(n.kdesc);
    return lines;
  },
  // ไอคอนประจำจุด: Keystone ใช้ของตัวเอง, แกนกลาง = core, ที่เหลือดูจากโบนัสตัวแรก
  glyph(n) {
    if (n.ks && PKS_GLYPH[n.ks]) return PKS_GLYPH[n.ks];
    if (n.kind === 'start') return 'core';
    for (const k in n.b) if (PGLYPH[k]) return PGLYPH[k];
    return 'sparkle';
  },
};
