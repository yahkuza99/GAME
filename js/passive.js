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
  hp: 'HP สูงสุด', sp: 'SP สูงสุด', hpPct: '% HP สูงสุด', spPct: '% SP สูงสุด',
  atkPct: '% ดาเมจกายภาพ', matkPct: '% MATK', critDmgPct: '% แรงคริติคอล', aspdPct: '% ความเร็วโจมตี',
  castPct: '% ร่ายเร็วขึ้น', speedPct: '% ความเร็วเดิน', healPct: '% ฮีลแรงขึ้น', regenPct: '% HP ฟื้นต่อรอบ',
  leech: '% ดาเมจกายภาพดูดเป็น HP', stunRes: '% ต้านมึน', spCostPct: '% SP ที่ใช้', range: 'ระยะธนู',
  rage: '% ATK ตาม HP ที่เสียไป', venom: '% โอกาสติดพิษเมื่อตี',
};
const PSTAT_FMT = (k, v) => {
  const pct = /Pct$|^leech$|^stunRes$|^rage$|^venom$/.test(k);
  const sign = v > 0 ? '+' : '';
  return pct ? `${sign}${v}${PSTAT[k]}` : `${PSTAT[k]} ${sign}${v}`;
};

// 6 แฉก (เรียงตามเข็มนาฬิกาจากด้านบน): ธีมแฉกติดกันจะเกี่ยวข้องกัน STR → AGI → DEX → INT → VIT
const PSECT = [
  { job: 'einherjar', name: 'Bulwark', th: 'ป้อมปราการ', color: '#e05a50', main: 'vit',
    small: [{ vit: 3 }, { def: 2 }, { hpPct: 3 }, { mdef: 2 }],
    notables: [['Iron Frame', { vit: 6, def: 5 }], ['Shield Wall', { def: 8, mdef: 6 }], ['Titan Core', { hpPct: 10, hp: 100 }],
      ['Steadfast', { stunRes: 50, vit: 4 }], ['Repair Protocol', { regenPct: 1, hpPct: 5 }]],
    key: ['Bulwark Frame', { def: 15, mdef: 10 }, 'unshaken', 'ไม่มีวันมึน แต่ FLEE เหลือ 0 (หลบไม่ได้เลย)'] },
  { job: 'berserker', name: 'Fury', th: 'คลั่ง', color: '#ff8a3a', main: 'str',
    small: [{ str: 3 }, { atkPct: 4 }, { hp: 40 }, { aspdPct: 2 }],
    notables: [['Brute Force', { str: 6, atkPct: 6 }], ['Blood Engine', { leech: 2, hp: 60 }], ['Frenzy Drive', { aspdPct: 6, atkPct: 4 }],
      ['Wound Fury', { rage: 15 }], ['Heavy Hitter', { atkPct: 10, critDmgPct: 10 }]],
    key: ['Overclock', { atkPct: 40, hpPct: -25 }, 'overclock', 'ดาเมจกายภาพ +40% แต่ HP สูงสุด -25%'] },
  { job: 'trickster', name: 'Shadow', th: 'เงา', color: '#b070ff', main: 'agi',
    small: [{ agi: 3 }, { flee: 4 }, { crit: 2 }, { luk: 3 }],
    notables: [['Quickstep', { agi: 6, speedPct: 5 }], ['Ghost Protocol', { flee: 15 }], ['Lucky Seven', { luk: 7, crit: 4 }],
      ['Assassin Code', { critDmgPct: 25 }], ['Toxin Coating', { venom: 10 }]],
    key: ['Phantom Code', {}, 'phantom', 'FLEE x1.5 แต่ DEF เหลือครึ่งเดียว'] },
  { job: 'wildhunter', name: 'Hunt', th: 'นักล่า', color: '#5ad05a', main: 'dex',
    small: [{ dex: 3 }, { hit: 4 }, { aspdPct: 2 }, { critDmgPct: 6 }],
    notables: [['Eagle Sight', { dex: 6, hit: 8 }], ['Long Shot', { range: 1, dex: 3 }], ['Rapid Fire', { aspdPct: 8 }],
      ['Hunter Mark', { critDmgPct: 15, crit: 3 }], ['Trail Runner', { speedPct: 8, agi: 3 }]],
    key: ['Resolute Aim', { atkPct: 10 }, 'resolute', 'ตีโดนทุกครั้ง แต่ไม่ติดคริติคอลเลย'] },
  { job: 'runecaster', name: 'Rune', th: 'รูน', color: '#4aa8ff', main: 'int',
    small: [{ int: 3 }, { matkPct: 4 }, { castPct: 3 }, { sp: 20 }],
    notables: [['Rune Scholar', { int: 6, matkPct: 6 }], ['Quick Glyph', { castPct: 10 }], ['Arcane Battery', { sp: 60, spPct: 6 }],
      ['Elemental Focus', { matkPct: 12 }], ['Efficient Casting', { spCostPct: -12, int: 3 }]],
    key: ['Blood Circuit', { hpPct: 20 }, 'bloodmagic', 'ใช้สกิลด้วย HP แทน SP (HP สูงสุด +20%)'] },
  { job: 'volva', name: 'Seer', th: 'พยากรณ์', color: '#ffd84a', main: 'int',
    small: [{ int: 3 }, { healPct: 6 }, { spPct: 4 }, { regenPct: 0.5 }],
    notables: [['Seer Mind', { int: 6, mdef: 5 }], ['Healing Light', { healPct: 20 }], ['Spirit Well', { spPct: 10, sp: 40 }],
      ['Sacred Ward', { mdef: 8, vit: 4 }], ['Renewal', { regenPct: 1.5 }]],
    key: ['Mind over Matter', {}, 'mom', 'ดาเมจที่โดน 30% หักจาก SP ก่อน HP'] },
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
    if (!this.canRefund(p, id)) return 'ต้องคืนจุดที่อยู่ปลายทางก่อน (จุดที่เหลือต้องต่อถึงแกนกลาง)';
    if (p.zeny < cost) return `เงินไม่พอ (ต้องใช้ ${U.fmt(cost)} ${CUR})`;
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
};
