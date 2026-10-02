// สร้าง docs/GAME_REFERENCE.md จากข้อมูลจริงในเกม (อาชีพ สกิล มอน แผนที่ ไอเทม เซ็ต เควสต์ กาชา ...)
// ใช้: (python3 -m http.server 8790 &) ; NODE_PATH=$(npm root -g) node tools/make_reference.js
// ข้อมูลอ่านจากหน้าเกมที่รันจริง → แก้ตัวเลขใน js/ แล้วรันใหม่ เอกสารก็ตรงกับเกมเสมอ
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://localhost:8790/index.html';
const OUT = path.join(__dirname, '..', 'docs', 'GAME_REFERENCE.md');

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage();
  await p.goto(BASE); await p.waitForTimeout(1500);
  const D = await p.evaluate(() => {
    const strip = o => JSON.parse(JSON.stringify(o, (k, v) => typeof v === 'function' ? undefined : v));
    const skills = {};
    for (const [id, s] of Object.entries(SKILLS)) skills[id] = { id, name: s.name, type: s.type, max: s.max, desc: s.desc, cd: s.cd || 0, range: s.range || (s.melee ? 1 : 0), req: s.req || null };
    return {
      JOBS: strip(JOBS), SECOND_JOBS, SECOND_JOB_REQ, JOB_CHANGE_LV, skills, MOBS: strip(MOBS), MAP_DEFS: strip(MAP_DEFS), ITEMS: strip(ITEMS),
      SETS: strip(LOOT.SETS), QUESTS: strip(QUESTS), SHOPS: strip(SHOPS), GACHA: strip(GACHA_CONFIG), WB: { MAPS: WB.MAPS, MULT: WB.MULT, PERIOD: WB.PERIOD, WINDOW: WB.WINDOW },
      DAILY: strip(Daily.KINDS), MOB_CHIP: strip(MOB_CHIP), CLASSBOOK: strip(CLASSBOOK),
    };
  });
  await b.close();

  const { JOBS, skills: SK, MOBS, MAP_DEFS: MAPS, ITEMS } = D;
  const L = [];
  const w = (...a) => L.push(...a);
  const pct = x => { const v = x * 100, t = v >= 1 ? v.toFixed(1) : v >= 0.1 ? v.toFixed(2) : v.toFixed(3); return (t.includes('.') ? t.replace(/0+$/, '').replace(/\.$/, '') : t) + '%'; };
  const num = n => (n || 0).toLocaleString('en-US');
  const cell = s => String(s == null ? '' : s).replace(/\|/g, '/').replace(/\n/g, ' ');
  const row = a => w('| ' + a.map(cell).join(' | ') + ' |');
  const head = a => { row(a); w('|' + a.map(() => '---').join('|') + '|'); };
  const iname = id => ITEMS[id] ? ITEMS[id].name : id;
  const mname = id => MOBS[id] ? MOBS[id].name : id;
  const jname = id => JOBS[id] ? JOBS[id].name : id;
  const jobsTxt = j => j === 'all' || !j ? 'ทุกอาชีพ' : j.length >= 6 ? `${j.length} อาชีพ` : j.map(jname).join(', ');
  const RAR = { common: 'ธรรมดา', uncommon: 'ดี', rare: 'หายาก', epic: 'มหากาพย์', legend: 'ตำนาน' };
  const SLOT = { weapon: 'อาวุธ', armor: 'ชุดเกราะ', head: 'หมวก', shield: 'โล่', garment: 'ผ้าคลุม', shoes: 'รองเท้า', acc: 'เครื่องประดับ', accessory: 'เครื่องประดับ' };
  const STAT = { str: 'STR', agi: 'AGI', vit: 'VIT', int: 'INT', dex: 'DEX', luk: 'LUK', atk: 'ATK', matk: 'MATK', def: 'DEF', mdef: 'MDEF', hit: 'HIT', flee: 'FLEE', crit: 'CRIT', hp: 'HP', sp: 'SP', aspd: 'ASPD',
    hpPct: 'HP%', spPct: 'SP%', atkPct: 'ATK%', matkPct: 'MATK%', speedPct: 'วิ่ง%', cdCut: 'ลดคูลดาวน์%', healPct: 'ฮีล%' };
  const WTN = { dagger: 'มีดสั้น', sword: 'ดาบ', axe: 'ขวาน', rod: 'คทา', bow: 'ธนู', mace: 'กระบอง', spear: 'หอก', staff: 'ไม้เท้า', knuckle: 'สนับมือ', instrument: 'เครื่องดนตรี' };
  const ELE = { neutral: 'ไร้ธาตุ', water: 'น้ำ', earth: 'ดิน', fire: 'ไฟ', wind: 'ลม', holy: 'ศักดิ์สิทธิ์', undead: 'อมตะ', poison: 'พิษ', shadow: 'มืด' };
  const RACE = { formless: 'ไร้รูป', plant: 'พืช', insect: 'แมลง', brute: 'สัตว์', angel: 'เทวดา', undead: 'อมตะ', demon: 'ปีศาจ' };
  const bonus = o => o ? Object.entries(o).map(([k, v]) => `${STAT[k] || k} ${v > 0 ? '+' : ''}${v}`).join(', ') : '';
  const dropsBy = {}; // ไอเทม → มอนที่ดรอป
  for (const [mid, m] of Object.entries(MOBS)) for (const [iid, r] of m.drops || []) (dropsBy[iid] = dropsBy[iid] || []).push([mid, r]);
  for (const [mid, cid] of Object.entries(D.MOB_CHIP || {})) (dropsBy[cid] = dropsBy[cid] || []).push([mid, null]);
  const mobMaps = {};
  for (const [mk, md] of Object.entries(MAPS)) for (const [mid] of md.spawns || []) (mobMaps[mid] = mobMaps[mid] || []).push(md.name);
  for (const [mk, md] of Object.entries(MAPS)) if (md.mvp) (mobMaps[md.mvp] = mobMaps[md.mvp] || []).push(md.name + ' (MVP)');
  const firsts = Object.keys(D.SECOND_JOBS), seconds = firsts.flatMap(k => D.SECOND_JOBS[k]);
  const items = t => Object.values(ITEMS).filter(i => i.type === t);

  // ---------------- หัวเอกสาร ----------------
  w('# NEO MIDGARD — เอกสารเกม (Game Reference)', '',
    `> สร้างอัตโนมัติจากข้อมูลจริงในเกมด้วย \`tools/make_reference.js\` • อัปเดต ${new Date().toISOString().slice(0, 10)}`,
    '> แก้ตัวเลขในไฟล์ `js/` แล้วรันสคริปต์ใหม่ เอกสารนี้จะตรงกับเกมเสมอ', '',
    '## สารบัญ', '1. [ภาพรวม](#ภาพรวม)', '2. [ปรัชญาการออกแบบคลาส](#ปรัชญาการออกแบบคลาส)', '3. [อาชีพ](#อาชีพ)', '4. [สกิลทั้งหมด](#สกิลทั้งหมด)', '5. [แผนที่](#แผนที่)',
    '6. [มอนสเตอร์](#มอนสเตอร์)', '7. [อาวุธ](#อาวุธ)', '8. [ชุดเกราะและเครื่องแต่งกาย](#ชุดเกราะและเครื่องแต่งกาย)', '9. [ชิป (การ์ด)](#ชิป-การ์ด)', '10. [เซ็ตไอเทม](#เซ็ตไอเทม)',
    '11. [ไอเทมใช้งาน](#ไอเทมใช้งาน)', '12. [วัตถุดิบ](#วัตถุดิบ)', '13. [ร้านค้า](#ร้านค้า)', '14. [เควสต์เนื้อเรื่อง](#เควสต์เนื้อเรื่อง)', '15. [ภารกิจประจำวัน](#ภารกิจประจำวัน)',
    '16. [World Boss](#world-boss)', '17. [กาชา Norn\'s Wheel](#กาชา-norns-wheel)', '');

  // ---------------- ภาพรวม ----------------
  const cnt = t => items(t).length;
  w('## ภาพรวม', '', 'MMORPG บนเบราว์เซอร์สไตล์ Ragnarok Online — โลกตำนานนอร์ส ทุกตัวละครเป็นแอนดรอยด์ (หน้ากากโลหะ + วิซอร์เรืองแสง ไม่มีดวงตา)', '');
  head(['หมวด', 'จำนวน']);
  [['อาชีพคลาสแรก', firsts.length], ['อาชีพคลาส 2', seconds.length], ['สกิล', Object.keys(SK).length], ['แผนที่', Object.keys(MAPS).length], ['มอนสเตอร์', Object.keys(MOBS).filter(k => !MOBS[k].dummy && !k.startsWith('wb_')).length],
    ['อาวุธ', cnt('weapon')], ['ชุดเกราะ/เครื่องแต่งกาย', cnt('armor')], ['ชิป (การ์ด)', cnt('card')], ['ไอเทมใช้งาน', cnt('use')], ['วัตถุดิบ', cnt('etc')], ['เซ็ตไอเทม', Object.keys(D.SETS).length], ['เควสต์เนื้อเรื่อง', D.QUESTS.length]].forEach(row);
  w('', '**เส้นทางเติบโต:** Novice → (Job Lv ' + D.JOB_CHANGE_LV + ') คลาสแรก → (Base Lv ' + D.SECOND_JOB_REQ.base + ' + Job Lv ' + D.SECOND_JOB_REQ.job + ') คลาส 2 • เปลี่ยนอาชีพที่ Mimir AI ในนีโอเอลด์ไฮม์', '');

  // ---------------- ปรัชญา ----------------
  w('## ปรัชญาการออกแบบคลาส', '',
    '1. **ตำนานนอร์สก่อน แล้วแปลงเป็นหุ่นยนต์** — ทุกคลาสเริ่มจากบทบาทในตำนาน (ผู้ถูกเลือกแห่งวัลฮัลลา, หญิงพยากรณ์, นักรบหนังหมาป่า ...) แล้วตีความเป็นแอนดรอยด์ มีสีเรืองแสงประจำคลาสให้จำได้ทันที',
    '2. **หนึ่งคลาส = หนึ่งตัวตน + หนึ่งราคาที่ต้องจ่าย** — อธิบายได้ในประโยคเดียว และมีจุดอ่อนชัด ไม่มีคลาสไหนเก่งทุกอย่าง',
    '3. **คลาส 2 แตกเป็นทางแยกตรงข้ามกัน** — ตั้งรับ/บุก, ระเบิดทันที/ค่อยกัด, กว้าง/แม่น, ซัพพอร์ต/บู๊, ฆ่าเอง/ช่วยทีม, ฝูง/บอส',
    '4. **โครงสกิลเหมือนกันทุกคลาส** — คลาสแรก 6 สกิล (พาสซีฟหลัก, เป้าเดียว, วงกว้าง, ยูทิลิตี้/บัฟ, ดึง/ยิงไกล, พาสซีฟเสริม) • คลาส 2 เพิ่ม 5 สกิล • แต้มไม่พอเก็บทุกสกิล ต้องเลือก • สกิลที่ใช้บ่อยเก่งขึ้นเอง (ความชำนาญ)',
    '5. **สเตตัสอิสระแบบ RO แต่ทุกคลาสมี 2 สเตตัสหลัก** — ทั้ง 6 สเตตัสมีเจ้าของ (LUK = สายคริติคอล)',
    '6. **เติบโตชัด เล่นคนเดียวได้** — คลาส 2 แรงกว่าคลาสแรกอย่างน้อย ~41% • เล่นปาร์ตี้ดีกว่าแต่ไม่บังคับ', '');
  head(['คลาสแรก', 'ทาง A', 'ทาง B']);
  for (const f of firsts) row([`${jname(f)} — ${JOBS[f].role}`, ...D.SECOND_JOBS[f].map(s => `**${jname(s)}** — ${JOBS[s].role}`)]);
  w('');

  // ---------------- อาชีพ ----------------
  w('## อาชีพ', '', '### คลาสแรก', '');
  head(['อาชีพ', 'ชื่อไทย', 'บทบาท', 'สเตตัสหลัก', 'HP ×', 'SP ×', 'ความเร็วตี (ms)', 'Job สูงสุด', 'อาวุธ', 'ความยาก']);
  for (const f of firsts) { const j = JOBS[f], c = D.CLASSBOOK[f] || {}; row([j.name, j.thai, j.role, j.stats, j.hp, j.sp, j.aspd, j.jobMax, c.weapon || '', c.diff ? '★'.repeat(c.diff) : '']); }
  w('', '### คลาส 2', '');
  head(['อาชีพ', 'ชื่อไทย', 'มาจาก', 'บทบาท', 'สเตตัสหลัก', 'HP ×', 'SP ×', 'ความเร็วตี (ms)', 'โบนัสคลาส']);
  for (const s of seconds) { const j = JOBS[s]; row([j.name, j.thai, jname(j.parent), j.role, j.stats, j.hp, j.sp, j.aspd, bonus(j.bonus)]); }
  w('');
  for (const id of ['novice', ...firsts, ...seconds]) {
    const j = JOBS[id], c = D.CLASSBOOK[id] || {};
    w(`### ${j.name} (${j.thai})`, '', `*${j.desc || ''}*`, '');
    if (c.play) w(`- **วิธีเล่น:** ${c.play}`);
    if (c.pros) w(`- **จุดเด่น:** ${c.pros}`);
    if (c.cons) w(`- **จุดอ่อน:** ${c.cons}`);
    if (c.stats) w(`- **สเตตัสแนะนำ:** ${c.stats.map(([k, v]) => `${k.toUpperCase()} ${v}%`).join(' / ')}`);
    if (c.build) w(`- **ลำดับอัปสกิล:** ${c.build.map(([k, v]) => `${SK[k] ? SK[k].name : k} ${v}`).join(' → ')}`);
    if (c.tips) w(`- **เคล็ดลับ:** ${c.tips}`);
    w('');
    if (j.skills && j.skills.length) { head(['สกิล', 'ชนิด', 'เลเวลสูงสุด', 'คูลดาวน์', 'คำอธิบาย']); for (const k of j.skills) { const s = SK[k]; if (s) row([s.name, s.type === 'passive' ? 'ติดตัว' : 'กดใช้', s.max, s.cd ? s.cd + ' วิ' : '-', s.desc]); } w(''); }
  }

  // ---------------- สกิลทั้งหมด ----------------
  w('## สกิลทั้งหมด', '');
  head(['สกิล', 'อาชีพ', 'ชนิด', 'Lv สูงสุด', 'ต้องการ']);
  const owner = {};
  for (const [jid, j] of Object.entries(JOBS)) for (const k of j.skills || []) owner[k] = jid;
  for (const s of Object.values(SK)) row([s.name, owner[s.id] ? jname(owner[s.id]) : '-', s.type === 'passive' ? 'ติดตัว' : 'กดใช้', s.max, s.req ? Object.entries(s.req).map(([k, v]) => `${SK[k] ? SK[k].name : k} ${v}`).join(', ') : '']);
  w('');

  // ---------------- แผนที่ ----------------
  w('## แผนที่', '');
  head(['แผนที่', 'ชื่อไทย', 'ประเภท', 'เลเวล', 'มอนสเตอร์ (จำนวนเกิด)', 'MVP', 'World Boss', 'ทางเชื่อม']);
  const KIND = { town: 'เมือง', field: 'ทุ่ง', cave: 'ถ้ำ/ดันเจี้ยน' };
  for (const [mk, m] of Object.entries(MAPS)) row([m.name, m.thai || '', KIND[m.kind] || m.kind, m.level || (m.kind === 'town' ? 'เมือง' : ''), (m.spawns || []).map(([id, n]) => `${mname(id)} ×${n}`).join(', '), m.mvp ? mname(m.mvp) : '', D.WB.MAPS[mk] ? 'Ancient ' + mname(D.WB.MAPS[mk].mvp) : '', Object.entries(m.links || {}).map(([d, t]) => `${d}→${MAPS[t] ? MAPS[t].name : t}`).join(', ')]);
  w('', '### NPC', '');
  head(['แผนที่', 'NPC']);
  for (const m of Object.values(MAPS)) if (m.npcs && m.npcs.length) row([m.name, m.npcs.map(n => n.name).join(', ')]);
  w('');

  // ---------------- มอนสเตอร์ ----------------
  w('## มอนสเตอร์', '', 'อัตราดรอปเป็นค่าพื้นฐานต่อการฆ่า 1 ตัว (ก่อนโบนัส LUK/ปาร์ตี้) • ชิปของแต่ละมอนดรอปแยกต่างหาก', '');
  head(['มอน', 'Lv', 'HP', 'ATK', 'DEF/MDEF', 'ธาตุ', 'เผ่า', 'ดุ', 'EXP / JEXP', 'พบที่']);
  const mobs = Object.values(MOBS).filter(m => !m.dummy && !m.id.startsWith('wb_')).sort((a, b) => a.lv - b.lv);
  for (const m of mobs) row([m.name + (m.boss || m.mvp ? ' 👑' : ''), m.lv, num(m.hp), (m.atk || []).join('~'), `${m.def || 0}/${m.mdef || 0}`, ELE[m.element] || m.element, RACE[m.race] || m.race, m.aggro ? 'ใช่' : '-', `${num(m.exp)} / ${num(m.jexp)}`, (mobMaps[m.id] || []).join(', ')]);
  w('', '### ดรอปของมอนแต่ละตัว', '');
  for (const m of mobs) {
    if (!(m.drops || []).length) continue;
    w(`- **${m.name}** (Lv ${m.lv}): ` + m.drops.map(([id, r]) => `${iname(id)} ${pct(r)}`).join(' • ') + (D.MOB_CHIP[m.id] ? ` • ชิป: ${iname(D.MOB_CHIP[m.id])}` : ''));
  }
  w('');

  // ---------------- อาวุธ ----------------
  const src = id => (dropsBy[id] || []).filter(([, r]) => r !== null).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m, r]) => `${mname(m)} ${pct(r)}`).join(', ');
  const shopSet = new Set(Object.values(D.SHOPS).flat());
  w('## อาวุธ', '');
  const WT = [...new Set(items('weapon').map(i => i.wtype))];
  for (const t of WT) {
    w(`### ${WTN[t] || t}`, '');
    head(['อาวุธ', 'ATK', 'MATK', 'Lv', 'ช่องชิป', 'อาชีพ', 'ความหายาก', 'ราคา', 'หาได้จาก']);
    for (const i of items('weapon').filter(i => i.wtype === t).sort((a, b) => (a.lv || 0) - (b.lv || 0) || a.atk - b.atk)) row([i.name, i.atk || '', i.matk || '', i.lv || 1, i.slots || 0, jobsTxt(i.jobs), RAR[i.rarity] || i.rarity, num(i.price), [shopSet.has(i.id) ? 'ร้านค้า' : '', src(i.id)].filter(Boolean).join(' • ')]);
    w('');
  }

  // ---------------- เกราะ ----------------
  w('## ชุดเกราะและเครื่องแต่งกาย', '');
  const SL = [...new Set(items('armor').map(i => i.slot))];
  for (const s of SL) {
    w(`### ${SLOT[s] || s}`, '');
    head(['ไอเทม', 'DEF', 'MDEF', 'โบนัส', 'Lv', 'ช่องชิป', 'อาชีพ', 'ความหายาก', 'ราคา', 'หาได้จาก']);
    for (const i of items('armor').filter(i => i.slot === s).sort((a, b) => (a.lv || 0) - (b.lv || 0) || (a.def || 0) - (b.def || 0))) row([i.name, i.def || '', i.mdef || '', bonus(i.b), i.lv || 1, i.slots || 0, jobsTxt(i.jobs), RAR[i.rarity] || i.rarity, num(i.price), [shopSet.has(i.id) ? 'ร้านค้า' : '', src(i.id)].filter(Boolean).join(' • ')]);
    w('');
  }

  // ---------------- ชิป ----------------
  w('## ชิป (การ์ด)', '', 'ใส่ในช่องชิปของอุปกรณ์ตามตำแหน่ง', '');
  head(['ชิป', 'ใส่ใน', 'ผล', 'ได้จาก']);
  for (const i of items('card')) row([i.name, SLOT[i.slot] || i.slot, bonus(i.b) || i.desc, (dropsBy[i.id] || []).map(([m]) => mname(m)).join(', ')]);
  w('');

  // ---------------- เซ็ต ----------------
  w('## เซ็ตไอเทม', '');
  head(['เซ็ต', 'ชิ้นส่วน', 'โบนัส']);
  for (const s of Object.values(D.SETS)) row([s.name, s.items.map(iname).join(', '), Object.entries(s.bonus).map(([n, bb]) => `${n} ชิ้น: ${bonus(bb)}`).join(' • ')]);
  w('');

  // ---------------- ใช้งาน / วัตถุดิบ ----------------
  w('## ไอเทมใช้งาน', '');
  head(['ไอเทม', 'ผล', 'ราคา']);
  for (const i of items('use')) row([i.name, i.desc, num(i.price)]);
  w('', '## วัตถุดิบ', '');
  head(['วัตถุดิบ', 'คำอธิบาย', 'ราคาขาย', 'ได้จาก']);
  for (const i of items('etc')) row([i.name, i.desc, num(i.price), src(i.id)]);
  w('');

  // ---------------- ร้านค้า ----------------
  w('## ร้านค้า', '');
  head(['ร้าน', 'สินค้า']);
  for (const [k, list] of Object.entries(D.SHOPS)) row([k, list.map(iname).join(', ')]);
  w('');

  // ---------------- เควสต์ ----------------
  w('## เควสต์เนื้อเรื่อง', '');
  head(['บท', 'เควสต์', 'ทำอะไร', 'รางวัล']);
  const npcName = {}; for (const m of Object.values(MAPS)) for (const n of m.npcs || []) npcName[n.id] = n.name;
  const objTxt = o => !o ? '' : o.type === 'hit' ? `ตีหุ่นฝึก ×${o.n || ''}` : o.type === 'event' ? ({ save: 'บันทึกจุดเซฟที่ Bifrost', refine: 'ตีบวกอุปกรณ์ที่ Brokk' }[o.ev] || o.ev) : o.type === 'job' ? 'เปลี่ยนเป็นคลาสแรกที่ Mimir' : o.type === 'skill' ? 'อัปสกิลแรก' : o.type === 'useskill' ? `ใช้สกิล ×${o.n || ''}` : o.type === 'baseLv' ? `Base Lv ${o.lv || o.n}` : o.type === 'jobLv' ? `Job Lv ${o.lv || o.n}` : o.type === 'talk' ? `คุยกับ ${npcName[o.npc] || o.npc}` : o.type === 'kill' ? `ล่า ${mname(o.mob)} ×${o.n}` : o.type === 'collect' ? `เก็บ ${iname(o.item)} ×${o.n}${o.mob ? ' จาก ' + mname(o.mob) : ''}` : o.type === 'map' || o.type === 'visit' ? `ไปที่ ${MAPS[o.map] ? MAPS[o.map].name : o.map}` : o.type === 'level' ? `Base Lv ${o.lv}` : o.type;
  const rwTxt = r => !r ? '' : [r.zeny ? num(r.zeny) + ' Volt' : '', r.bexp ? num(r.bexp) + ' BEXP' : '', r.jexp ? num(r.jexp) + ' JEXP' : '', ...(r.items || []).map(([id, n]) => `${iname(id)} ×${n}`)].filter(Boolean).join(', ');
  for (const q of D.QUESTS) row([q.ch || 6, q.title, objTxt(q.obj), rwTxt(q.reward)]);
  w('');

  // ---------------- ประจำวัน ----------------
  w('## ภารกิจประจำวัน', '', 'ได้ 3 ภารกิจต่อวัน สุ่มตามเลเวล ทำครบเปิดหีบรางวัล และนับวันต่อเนื่อง (streak)', '');
  head(['ชนิด', 'น้ำหนักการสุ่ม', 'ปลดล็อก']);
  const DN = { hunt: 'ล่ามอน', map: 'สำรวจแผนที่', skill: 'ใช้สกิล', loot: 'เก็บของ', sell: 'ขายของ', refine: 'ตีบวก', mvp: 'ล่า MVP' };
  for (const [k, v] of Object.entries(D.DAILY)) row([`${v.ic} ${DN[k] || k}`, v.w, v.minLv ? 'Base Lv ' + v.minLv : 'ตั้งแต่เริ่ม']);
  w('');

  // ---------------- World Boss ----------------
  w('## World Boss', '', `แข็งกว่า MVP ${D.WB.MULT} เท่า • เกิดทุก ${D.WB.PERIOD / 60000} นาที อยู่ ${D.WB.WINDOW / 60000} นาที • เลือดใช้ร่วมกันทั้งแผนที่ ไม่ฟื้นเมื่อผู้เล่นตาย • มีตารางอันดับดาเมจ`, '');
  head(['แผนที่', 'บอส', 'เกิดนาทีที่']);
  for (const [mk, v] of Object.entries(D.WB.MAPS)) row([MAPS[mk].name, 'Ancient ' + mname(v.mvp), ':' + String(v.off).padStart(2, '0')]);
  w('');

  // ---------------- กาชา ----------------
  const G = D.GACHA;
  w("## กาชา Norn's Wheel", '', `ใช้ ${iname(G.token)} ${G.cost} อัน/ครั้ง • ได้จาก MVP ${G.drop.mvp} อัน, World Boss ${G.drop.worldBoss} อัน • หมุน ${G.multi.count} ครั้ง (${G.multi.cost} อัน) การันตี${RAR[G.multi.guarantee] || G.multi.guarantee}ขึ้นไป • การันตี${RAR[G.pity.rarity] || G.pity.rarity} ทุก ${G.pity.every} ครั้ง • NPC อยู่ที่นีโอเอลด์ไฮม์`, '');
  head(['รางวัล', 'จำนวน', 'โอกาส']);
  for (const t of G.table) row([t.volt ? 'Volt' : iname(t.id), t.volt ? num(t.volt) : t.qty || 1, t.pct + '%']);
  w('', `รวม ${G.table.reduce((a, t) => a + t.pct, 0).toFixed(1)}%`, '');

  fs.writeFileSync(OUT, L.join('\n'));
  console.log('เขียน', OUT, L.length, 'บรรทัด');
})();
