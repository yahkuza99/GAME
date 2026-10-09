// สร้าง docs/GAME_REFERENCE.md จากข้อมูลจริงในเกม (Class 1/2/3 สกิล รูน มอน แผนที่ ไอเทม เซ็ต เควสต์ กาชา ...)
// ใช้: NODE_PATH=$(npm root -g) node tools/make_reference.js   (เปิดเซิร์ฟเวอร์ไฟล์ในตัวเอง หรือ BASE=<url> ถ้ามีเซิร์ฟเวอร์อยู่แล้ว)
//      CHROME=/path/to/chrome ได้ (ไม่ตั้ง = /opt/pw-browsers/chromium ถ้ามี ไม่งั้น Chromium ของ Playwright)
// ข้อมูลอ่านจากหน้าเกมที่รันจริง → แก้ตัวเลขใน js/ แล้วรันใหม่ เอกสารก็ตรงกับเกมเสมอ
// ส่วนเสริม (Class 3 / รูน / Hunt Rune / ไม้ตาย / Passive / ท่าบอส / เควสต์เสริม ฯลฯ) ดึงด้วย tools/ref_extract.js — ใช้ร่วมกับหน้าเว็บ Codex
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const { extract, launchOpts, gameUrl, LANDMARKS, GATES } = require('./ref_extract');
const OUT = path.join(__dirname, '..', 'docs', 'GAME_REFERENCE.md');

(async () => {
  const srv = await gameUrl(), BASE = srv.url;
  const b = await chromium.launch(launchOpts());
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
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
  const X = await p.evaluate(extract);
  await b.close(); srv.close();
  if (errs.length) console.warn('หน้าเกมมี error:', errs.join(' | '));

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
  const jobsTxt = j => j === 'all' || !j ? 'ทุก Class' : j.length >= 6 ? `${j.length} Class` : j.map(jname).join(', ');
  const RAR = { common: 'ธรรมดา', uncommon: 'ดี', rare: 'หายาก', epic: 'Epic', legend: 'ตำนาน' };
  const SLOT = { weapon: 'อาวุธ', armor: 'ชุดเกราะ', head: 'หมวก', shield: 'โล่', garment: 'ผ้าคลุม', shoes: 'รองเท้า', acc: 'เครื่องประดับ', accessory: 'เครื่องประดับ' };
  const STAT = { str: 'STR', agi: 'AGI', vit: 'VIT', int: 'INT', dex: 'DEX', luk: 'LUK', atk: 'ATK', matk: 'MATK', def: 'DEF', mdef: 'MDEF', hit: 'HIT', flee: 'FLEE', crit: 'CRIT', hp: 'HP', sp: 'SP', aspd: 'ASPD',
    hpPct: 'HP%', spPct: 'SP%', atkPct: 'ATK%', matkPct: 'MATK%', speedPct: 'วิ่ง%', cdCut: 'ลดคูลดาวน์%', healPct: 'ฮีล%' };
  const WTN = { dagger: 'มีดสั้น', sword: 'ดาบ', axe: 'ขวาน', rod: 'คทา', bow: 'ธนู', mace: 'กระบอง', spear: 'หอก', staff: 'ไม้เท้า', knuckle: 'สนับมือ', instrument: 'เครื่องดนตรี' };
  const ELE = { neutral: 'ไร้ธาตุ', water: 'น้ำ', earth: 'ดิน', fire: 'ไฟ', wind: 'ลม', holy: 'ศักดิ์สิทธิ์', undead: 'อมตะ', poison: 'พิษ', shadow: 'มืด', ghost: 'วิญญาณ' };
  const RACE = { formless: 'ไร้รูป', plant: 'พืช', insect: 'แมลง', brute: 'สัตว์', angel: 'เทวดา', undead: 'อมตะ', demon: 'ปีศาจ', dragon: 'มังกร', human: 'ผู้เล่น' };
  const bonus = o => o ? Object.entries(o).map(([k, v]) => `${STAT[k] || k} ${v > 0 ? '+' : ''}${v}`).join(', ') : '';
  const dropsBy = {}; // ไอเทม → มอนที่ดรอป
  for (const [mid, m] of Object.entries(MOBS)) for (const [iid, r] of m.drops || []) (dropsBy[iid] = dropsBy[iid] || []).push([mid, r]);
  for (const [mid, cid] of Object.entries(D.MOB_CHIP || {})) (dropsBy[cid] = dropsBy[cid] || []).push([mid, null]);
  const mobMaps = {};
  for (const [mk, md] of Object.entries(MAPS)) for (const [mid] of md.spawns || []) (mobMaps[mid] = mobMaps[mid] || []).push(md.name);
  for (const [mk, md] of Object.entries(MAPS)) if (md.mvp) (mobMaps[md.mvp] = mobMaps[md.mvp] || []).push(md.name + ' (MVP)');
  const firsts = Object.keys(D.SECOND_JOBS), seconds = firsts.flatMap(k => D.SECOND_JOBS[k]);
  const thirds = seconds.filter(s => X.third[s] && JOBS[X.third[s]]).map(s => X.third[s]);
  const items = t => Object.values(ITEMS).filter(i => i.type === t);
  const owner = {};
  for (const [jid, j] of Object.entries(JOBS)) for (const k of j.skills || []) owner[k] = jid;
  const runesOf = sk => X.runes.filter(r => r.skill === sk);
  const ultOf = job => X.ults.find(u => u.job === job);
  const tierTxt = id => JOBS[id].tier === 3 ? 'Class 3' : JOBS[id].tier === 2 ? 'Class 2' : id === 'novice' ? 'Novice' : 'Class แรก';
  const vz = id => { const z = X.zeny[id]; return z ? (z[0] === z[1] ? num(z[0]) : `${num(z[0])}~${num(z[1])}`) : ''; };

  // ---------------- หัวเอกสาร ----------------
  const TOC = ['ภาพรวม', 'ปรัชญาการออกแบบ Class', 'Class', 'Class 3', 'สกิลทั้งหมด', 'Rune Paths (Skill Rune และ Oath)', 'Hunt Rune', 'ไม้ตาย (ULT)', 'Passive (ต้นไม้พาสซีฟ)',
    'กลไกต่อสู้', 'การควบคุม', 'หน้าต่างและ UI', 'แผนที่', 'มอนสเตอร์', 'ท่าบอสและลูกสมุน', 'อาวุธ', 'ชุดเกราะและเครื่องแต่งกาย', 'ชิป (การ์ด)', 'เซ็ตไอเทม', 'ไอเทมใช้งาน', 'วัตถุดิบ', 'ร้านค้า',
    'เควสต์เนื้อเรื่อง', 'เควสต์เสริม', 'จุดตำนาน (Lore)', 'ภารกิจประจำวัน', 'World Boss', "กาชา Norn's Wheel"];
  const anchor = t => t.toLowerCase().replace(/[()'’]/g, '').replace(/\s+/g, '-');
  w('# IRON VALHALLA — เอกสารเกม (Game Reference)', '',
    `> สร้างอัตโนมัติจากข้อมูลจริงในเกมด้วย \`tools/make_reference.js\` • อัปเดต ${new Date().toISOString().slice(0, 10)}`,
    '> แก้ตัวเลขในไฟล์ `js/` แล้วรันสคริปต์ใหม่ เอกสารนี้จะตรงกับเกมเสมอ', '', '## สารบัญ', ...TOC.map((t, i) => `${i + 1}. [${t}](#${anchor(t)})`), '');

  // ---------------- ภาพรวม ----------------
  const cnt = t => items(t).length;
  w('## ภาพรวม', '', 'MMORPG บนเบราว์เซอร์สไตล์ Ragnarok Online — โลกตำนานนอร์ส ทุกตัวละครเป็นแอนดรอยด์ (หน้ากากโลหะ + วิซอร์เรืองแสง ไม่มีดวงตา)', '');
  head(['หมวด', 'จำนวน']);
  [['Class แรก', firsts.length], ['Class 2', seconds.length], ['Class 3', thirds.length], ['สกิล', Object.keys(SK).length], ['Skill Rune / Oath', X.runes.length], ['Hunt Rune', X.hunt ? X.hunt.list.length : 0],
    ['ไม้ตาย', X.ults.length], ['แผนที่', Object.keys(MAPS).length], ['มอนสเตอร์', Object.keys(MOBS).filter(k => !MOBS[k].dummy && !k.startsWith('wb_')).length],
    ['อาวุธ', cnt('weapon')], ['ชุดเกราะ/เครื่องแต่งกาย', cnt('armor')], ['ชิป (การ์ด)', cnt('card')], ['ไอเทมใช้งาน', cnt('use')], ['วัตถุดิบ', cnt('etc')], ['เซ็ตไอเทม', Object.keys(D.SETS).length],
    ['เควสต์เนื้อเรื่อง', D.QUESTS.length], ['เควสต์เสริม', (X.side || []).length], ['จุดตำนาน', (X.lore || []).length]].forEach(row);
  const R3 = X.thirdReq;
  w('', '**เส้นทางเติบโต:** Novice → (Job Lv ' + D.JOB_CHANGE_LV + ') Class แรก → (Base Lv ' + D.SECOND_JOB_REQ.base + ' + Job Lv ' + D.SECOND_JOB_REQ.job + ') Class 2'
    + (R3 ? ` → (Base Lv ${R3.base} + Job Lv ${R3.job} + จบเควสต์ "${X.thirdQuest ? X.thirdQuest.title : R3.quest}" + ผ่านเควสต์ทดสอบ) Class 3` : '') + ' • เปลี่ยน Class ที่ Mimir AI ในนีโอเอลด์ไฮม์', '');

  // ---------------- ปรัชญา ----------------
  w('## ปรัชญาการออกแบบ Class', '',
    '1. **ตำนานนอร์สก่อน แล้วแปลงเป็นหุ่นยนต์** — ทุก Class เริ่มจากบทบาทในตำนาน (ผู้ถูกเลือกแห่งวัลฮัลลา, หญิงพยากรณ์, นักรบหนังหมาป่า ...) แล้วตีความเป็นแอนดรอยด์ มีสีเรืองแสงประจำ Class ให้จำได้ทันที',
    '2. **หนึ่ง Class = หนึ่งตัวตน + หนึ่งราคาที่ต้องจ่าย** — อธิบายได้ในประโยคเดียว และมีจุดอ่อนชัด ไม่มี Class ไหนเก่งทุกอย่าง',
    '3. **Class 2 แตกเป็นทางแยกตรงข้ามกัน** — ตั้งรับ/บุก, ระเบิดทันที/ค่อยกัด, กว้าง/แม่น, ซัพพอร์ต/บู๊, ฆ่าเอง/ช่วยทีม, ฝูง/บอส',
    '4. **Class 3 ต่อยอดสายเดียวต่อ Class 2** — 6 สกิลใหม่ + Oath 2 แบบ (รูนของสกิลติดตัว เลือกแนวฝูง/เป้าเดี่ยว) + รูน ★ ของสกิลประจำตัว + ไม้ตายตัวเลือกที่ 4 ของ Class นั้น',
    '5. **โครงสกิลเหมือนกันทุก Class** — Class แรก 6 สกิล (พาสซีฟหลัก, เป้าเดียว, วงกว้าง, ยูทิลิตี้/บัฟ, ดึง/ยิงไกล, พาสซีฟเสริม) • Class 2 เพิ่ม 5 สกิล • Class 3 เพิ่ม 6 สกิล • แต้มไม่พอเก็บทุกสกิล ต้องเลือก • สกิลที่ใช้บ่อยเก่งขึ้นเอง (ความชำนาญ)',
    '6. **สเตตัสอิสระแบบ RO แต่ทุก Class มี 2 สเตตัสหลัก** — ทั้ง 6 สเตตัสมีเจ้าของ (LUK = สายคริติคอล)',
    '7. **เติบโตชัด เล่นคนเดียวได้** — Class 2 แรงกว่า Class แรกอย่างน้อย ~41% • เล่นปาร์ตี้ดีกว่าแต่ไม่บังคับ', '');
  head(['Class แรก', 'ทาง A', 'ทาง B']);
  for (const f of firsts) row([`${jname(f)} — ${JOBS[f].role}`, ...D.SECOND_JOBS[f].map(s => `**${jname(s)}** — ${JOBS[s].role}` + (X.third[s] && JOBS[X.third[s]] ? ` → Class 3 **${jname(X.third[s])}**` : ''))]);
  w('');

  // ---------------- Class ----------------
  w('## Class', '', '### Class แรก', '');
  head(['Class', 'ชื่อไทย', 'บทบาท', 'สเตตัสหลัก', 'HP ×', 'SP ×', 'ความเร็วตี (ms)', 'Job สูงสุด', 'อาวุธ', 'ความยาก']);
  for (const f of firsts) { const j = JOBS[f], c = D.CLASSBOOK[f] || {}; row([j.name, j.thai, j.role, j.stats, j.hp, j.sp, j.aspd, j.jobMax, c.weapon || '', c.diff ? '★'.repeat(c.diff) : '']); }
  w('', '### Class 2', '');
  head(['Class', 'ชื่อไทย', 'มาจาก', 'บทบาท', 'สเตตัสหลัก', 'HP ×', 'SP ×', 'ความเร็วตี (ms)', 'โบนัส Class']);
  for (const s of seconds) { const j = JOBS[s]; row([j.name, j.thai, jname(j.parent), j.role, j.stats, j.hp, j.sp, j.aspd, bonus(j.bonus)]); }
  w('', '> Class 3 อยู่ในหัวข้อ [Class 3](#class-3) ถัดไป', '');
  const classBlock = id => {
    const j = JOBS[id], c = D.CLASSBOOK[id] || {};
    w(`### ${j.name} (${j.thai})`, '', `*${j.desc || ''}*`, '');
    if (j.tier === 3) w(`- **${tierTxt(id)}** ต่อจาก ${jname(j.parent)} • บทบาท: ${j.role} • สเตตัสหลัก: ${j.stats} • HP ×${j.hp} SP ×${j.sp} • ตีทุก ${j.aspd} ms • Job สูงสุด ${j.jobMax} • โบนัส Class: ${bonus(j.bonus)}`);
    if (c.play) w(`- **วิธีเล่น:** ${c.play}`);
    if (c.pros) w(`- **จุดเด่น:** ${c.pros}`);
    if (c.cons) w(`- **จุดอ่อน:** ${c.cons}`);
    if (c.stats) w(`- **สเตตัสแนะนำ:** ${c.stats.map(([k, v]) => `${k.toUpperCase()} ${v}%`).join(' / ')}`);
    if (c.build) w(`- **ลำดับอัปสกิล:** ${c.build.map(([k, v]) => `${SK[k] ? SK[k].name : k} ${v}`).join(' → ')}`);
    if (c.tips) w(`- **เคล็ดลับ:** ${c.tips}`);
    w('');
    if (j.skills && j.skills.length) { head(['สกิล', 'ชนิด', 'เลเวลสูงสุด', 'คูลดาวน์', 'คำอธิบาย']); for (const k of j.skills) { const s = SK[k]; if (s) row([s.name, s.type === 'passive' ? 'ติดตัว' : 'กดใช้', s.max, s.cd ? s.cd + ' วิ' : '-', s.desc]); } w(''); }
  };
  for (const id of ['novice', ...firsts, ...seconds]) classBlock(id);

  // ---------------- Class 3 ----------------
  w('## Class 3', '');
  if (R3) w(`**ปลด:** เป็น Class 2 ที่มี Class 3 + Base Lv ${R3.base} + Job Lv ${R3.job} + จบเควสต์เนื้อเรื่อง "${X.thirdQuest ? X.thirdQuest.title : R3.quest}"${X.thirdQuest && X.thirdQuest.ch ? ` (บทที่ ${X.thirdQuest.ch})` : ''} → คุยกับ Mimir AI → เควสต์ทดสอบ "ความคิดสุดท้าย" (ไปหา NPC ตามตาราง) → ดวล "เงาแม่พิมพ์" (ร่างเงาของ Class 2 ตัวเอง) → กลับไปหา Mimir เพื่อยกระดับ`, '');
  w(`**Oath** = รูนของสกิลติดตัว (เลือก 1 ใน 2 เปลี่ยนแนวการเล่นทั้ง Class) • อีกสกิลหนึ่งมีรูน ★ 2 แบบ • ปลดที่ Skill Lv ${X.runeUnlock} เหมือน Rune Paths • เปลี่ยนฟรีนอกการต่อสู้ • ไม้ตายตัวเลือกที่ 4 ใช้ได้เฉพาะ Class นั้น`, '');
  head(['Class 3', 'ชื่อไทย', 'ต่อจาก', 'บทบาท', 'สเตตัสหลัก', 'HP ×', 'SP ×', 'ตีทุก (ms)', 'Job สูงสุด', 'ไม้ตาย', 'เควสต์ทดสอบ']);
  for (const id of thirds) {
    const j = JOBS[id], u = ultOf(id), t = X.trials[id];
    row([j.name, j.thai, jname(j.parent), j.role, j.stats, j.hp, j.sp, j.aspd, j.jobMax, u ? u.name : '', t ? `${t.who} @ ${t.place}` : '']);
  }
  w('');
  for (const id of thirds) {
    classBlock(id);
    const u = ultOf(id), t = X.trials[id];
    const rs = (JOBS[id].skills || []).filter(k => runesOf(k).length);
    if (rs.length) {
      head(['สกิล', 'รูน', 'ชนิด', 'แนว', 'สรุป', 'รายละเอียด']);
      for (const k of rs) for (const r of runesOf(k)) row([SK[k] ? SK[k].name : k, r.name, r.oath ? 'Oath' : 'รูน ★', r.intentTh, r.short, r.desc]);
      w('');
    }
    if (u) w(`- **ไม้ตาย ${u.name}** (${u.th}): ${u.desc}`);
    if (t) w(`- **เควสต์ทดสอบ:** ${t.who} ที่ ${t.place} — ${t.thought}`);
    w('');
  }

  // ---------------- สกิลทั้งหมด ----------------
  w('## สกิลทั้งหมด', '');
  head(['สกิล', 'Class', 'ขั้น', 'ชนิด', 'Lv สูงสุด', 'ต้องการ']);
  for (const s of Object.values(SK)) row([s.name, owner[s.id] ? jname(owner[s.id]) : '-', owner[s.id] ? tierTxt(owner[s.id]) : '', s.type === 'passive' ? 'ติดตัว' : 'กดใช้', s.max, s.req ? Object.entries(s.req).map(([k, v]) => `${SK[k] ? SK[k].name : k} ${v}`).join(', ') : '']);
  w('');

  // ---------------- Rune Paths ----------------
  w('## Rune Paths (Skill Rune และ Oath)', '', `สกิลที่มีรูน: ปลดเมื่อ Skill Lv ${X.runeUnlock} • เลือก 0 หรือ 1 จาก 2 แบบต่อสกิล • เปลี่ยนฟรีทุกที่ ยกเว้นระหว่างต่อสู้ • จัดการในหน้าต่าง **Runes (Shift+R)** แท็บ Skill Runes • "แนว" = รูนเก่งกับเป้าเดี่ยว / ฝูง / รอบด้าน (ไอคอนรูนมีจุดเรืองใต้อักษร 1 / 3 / 2 จุดตามแนว) • ตัวเลขในตารางดึงจากค่าในเกม (Runes.K / Class3.K)`, '');
  const runeJobs = [...new Set(X.runes.map(r => owner[r.skill]).filter(Boolean))];
  for (const jid of runeJobs) {
    w(`### ${jname(jid)} (${tierTxt(jid)})`, '');
    head(['สกิล', 'รูน', 'แนว', 'สรุป 1 บรรทัด', 'รายละเอียด']);
    for (const r of X.runes.filter(x => owner[x.skill] === jid)) row([SK[r.skill] ? SK[r.skill].name : r.skill, (r.oath ? 'Oath: ' : '') + r.name, r.intentTh, r.short, r.desc]);
    w('');
  }

  // ---------------- Hunt Rune ----------------
  if (X.hunt) {
    const H = X.hunt;
    w('## Hunt Rune', '', `รูนตีแรงแบบมีเงื่อนไขแนว RO • ${H.unlock.length} ช่อง (ช่อง ${H.unlock.map((v, i) => `${['I', 'II', 'III'][i]} = Base Lv ${v}`).join(', ')}) • ซื้อครั้งเดียวที่ Brokk Forge-Bot (แท็บ Hunt Rune) แล้วใส่ในหน้าต่าง Runes (Shift+R) แท็บ Hunt Runes • สลับฟรีนอกการต่อสู้ • เพดานรวม +${Math.round(H.cap * 100)}% ต่อครั้ง • Build Code รุ่น 2 จำ Hunt Rune ด้วย`, '');
    head(['รูน', 'ชนิด', 'สรุป', 'รายละเอียด', 'ราคา (Volt)']);
    for (const r of H.list) row([r.name, H.kinds[r.kind] || r.kind, r.short, r.desc, num(r.price)]);
    w('');
  }

  // ---------------- ไม้ตาย ----------------
  w('## ไม้ตาย (ULT)', '', 'เกจไม้ตายเต็มแล้วกด **T** หรือปุ่ม ULT • คลิกขวา/กดค้างปุ่ม ULT (หรือกดตอนเกจยังไม่เต็ม) = เลือกไม้ตาย • ใช้ในลานประลองไม่ได้ • แบบกลางใช้ได้ทุก Class ส่วนตัวที่ผูก Class ใช้ได้เฉพาะ Class 3 นั้น', '');
  head(['ไม้ตาย', 'ชื่อไทย', 'ใช้ได้', 'ผล']);
  for (const u of X.ults) row([u.name, u.th, u.job ? jname(u.job) : 'ทุก Class', u.desc]);
  w('');

  // ---------------- Passive ----------------
  if (X.passive) {
    const P = X.passive;
    w('## Passive (ต้นไม้พาสซีฟ)', '', 'ได้ 1 แต้มต่อ 1 Base Level • เริ่มจากแกนกลางแล้วเปิดจุดที่ติดกัน • 6 แฉกตามสาย Class (Class ไหนก็เดินไปแฉกไหนก็ได้) • จุดเล็ก = สเตตัสเล็ก ๆ • Notable / Keystone = ลูกเล่นมีเงื่อนไข • เซฟก่อนต้นไม้รุ่นปัจจุบันได้รีเซ็ตฟรี 1 ครั้ง', '',
      '### เพดานรวมจากต้นไม้', '', 'นับเฉพาะส่วนที่มาจากต้นไม้ (ของสวม/Class/สกิล/บัฟ ไม่ถูกตัด) • ผลมีเงื่อนไขด้านดาเมจ/ASPD/ฮีลนับรวมใต้เพดานเดียวกัน • หน้าต่าง Passive มีเมเตอร์บอกว่าใช้ไปเท่าไร', '');
    head(['ค่า', 'เพดาน']);
    for (const [k, v] of Object.entries(P.cap)) row([P.capLabel[k] || k, v < 0 ? `ลดได้ไม่เกิน ${-v}` : v]);
    if (P.capFx && P.capFx.taken) row(['ดาเมจที่โดนลดลง (รวมผลมีเงื่อนไข)', `${P.capFx.taken}%`]);
    w('');
    for (const s of P.sects) {
      w(`### แฉก ${s.name} (${s.th}) — สาย ${jname(s.job)}`, '', `${s.tag} • สเตตัสหลัก ${s.main.toUpperCase()}`, '');
      head(['จุด', 'ชนิด', 'โบนัสคงที่', 'ผลมีเงื่อนไข / กติกา']);
      for (const n of s.notables) row([n.name, 'Notable', n.b, n.fx]);
      row([s.key.name, 'Keystone', s.key.b, s.key.fx]);
      w('');
    }
  }

  // ---------------- กลไกต่อสู้ ----------------
  w('## กลไกต่อสู้', '');
  if (X.flinch) w(`- **กระตุก (ผู้เล่น):** โดนตีระหว่างเดินมีโอกาส ${Math.round(X.flinch.chance * 100)}% หยุดเดิน ${X.flinch.dur} วิ แล้วเดินต่อทางเดิม • คูลดาวน์ ${X.flinch.cd} วิ (ฝ่าดงมอนได้) • ดาเมจต่ำกว่า 1% MaxHP ไม่กระตุก • พิษ/ไหม้ไม่ทำให้กระตุก • กระตุกหยุดแค่การเดิน (ตี/ร่าย/สกิลได้ปกติ)`);
  if (X.mobFlinch) w(`- **กระตุก (มอน):** โอกาส ${Math.round(X.mobFlinch.chance * 100)}% หยุด ${X.mobFlinch.dur} วิ คูลดาวน์ ${X.mobFlinch.cd} วิ • บอส/MVP/Ancient ไม่กระตุก`);
  if (X.lvChance) w(`- **จำกัดตามเลเวล (มึน/ช้า/กระตุก ทั้งเราใส่มอนและมอนใส่เรา):** ผู้ทำเลเวลต่ำกว่าเป้าหมาย โอกาสลด ${X.lvChance.perLv}%/เลเวล (ต่ำสุด ×${X.lvChance.floor})${X.flinch ? ` • ต่ำกว่าเกิน ${X.flinch.lvGap} เลเวล = กระตุกไม่ได้` : ''} • สูงกว่าไม่ได้เพิ่ม • ผู้เล่นต้านมึนด้วย VIT / ต้านมึน`);
  w('- **ธาตุแพ้/ต้าน:** ตีโดนธาตุที่แพ้ = สัญลักษณ์ ▲ สีธาตุติดมุมเลขดาเมจ • ธาตุที่ต้าน = ▼ สีเทา (มอนตัวเดียวกันแสดงทุก 0.3 วิ)', '');
  if (Object.keys(X.elemTable).length) {
    w('### ตารางธาตุ (ธาตุที่ตี → ตัวคูณต่อธาตุของเป้า)', '');
    head(['ธาตุที่ตี', 'แรงขึ้นใส่', 'เบาลงใส่']);
    const f = (row0, good) => Object.entries(row0).filter(([, v]) => good ? v > 1 : v < 1).map(([k, v]) => `${ELE[k] || k} ×${v}`).join(', ') || '-';
    for (const [el, r] of Object.entries(X.elemTable)) row([ELE[el] || el, f(r, true), f(r, false)]);
    w('');
  }

  // ---------------- การควบคุม ----------------
  w('## การควบคุม', '', '(ข้อความจากหน้าต่าง How to Play — กด H ในเกม)', '');
  for (const h of X.help || []) { w(`### ${h.title}`, ''); for (const it of h.items) w(`- ${it}`); w(''); }
  w('### คำสั่งแชต', '');
  head(['คำสั่ง', 'ผล']);
  [['/nc หรือ /noctrl', 'สลับ: เปิด (ค่าเริ่ม) = คลิกมอนแล้วตีต่อเนื่อง + ใช้สกิลแล้วตีต่อ • ปิด = คลิก/ปุ่มตีบนมือถือ ตี 1 ที (Ctrl+คลิก = ต่อเนื่อง)'],
    ['/ns หรือ /noshift', 'สลับ: เปิด = มีเป้าอยู่แล้ว กดสกิลยิงใส่เป้าทันทีไม่ต้องคลิกเล็ง • ปิด = กดสกิลแล้วคลิกเลือกเป้า'],
    ['/sit', 'นั่งพัก'], ['/where', 'บอกตำแหน่งปัจจุบัน'], ['/save', 'บันทึกเกม'], ['/autoloot', 'สลับเก็บของอัตโนมัติ'], ['/e หรือ /emote', 'อีโมต'], ['/help', 'เปิดหน้าต่างวิธีเล่น'],
    ['/p ข้อความ', 'แชตปาร์ตี้'], ['/invite ชื่อ', 'ชวนเข้าปาร์ตี้']].forEach(row);
  w('', '/nc และ /ns สลับได้ในหน้าตั้งค่า (การเล่น) ด้วย', '');

  // ---------------- หน้าต่างและ UI ----------------
  w('## หน้าต่างและ UI', '', 'UI วาดด้วยโค้ด + วัสดุที่เรนเดอร์จาก Blender (assets/ui3d_*) — ภาพหน้าจอจริงดูแท็บ "ภาพเกม" ใน Valhalla Codex', '',
    '- **ธีม:** กระดาษครีมในกรอบไม้โอ๊ค + มุมทองเหลืองลายถักนอร์ส • แผง HUD เป็นกระจกควันอำพัน (กราฟิก "ประหยัด" = ทึบ) • แสงเดียวจากซ้ายบนทั้งชุด • หน้าแรก/ล็อกอิน/เลือก-สร้างตัวละครใช้ชุดเดียวกัน (โลโก้ทอง)',
    '- **ปุ่ม/แท็บ:** แบบ A "แผ่นทองมุมมน" ~7px (ไม่มีทรงแคปซูลทั้งเกม) • เลือก/หลัก = ทอง • รอง = ครีม • อันตราย = ครีมตัวแดง • ใช้ไม่ได้ = ครีมหม่น • ปุ่มปิดหน้าต่าง = กระดุมทองเหลืองกลม',
    '- **ความหายาก:** ช่องไอเทมเรืองสีจากข้างใน • Epic/Legendary มีแสงกวาด + ไอคอนเรืองหายใจ • ชื่อไอเทมสีตามความหายาก (ไม่มีป้าย Common/Rare)',
    '- **กระเป๋า/คลัง/ขายของ:** ตารางช่องแบบ RO (6 คอลัมน์บนคอม, 5 บนมือถือ) แสดงจำนวน/ตีบวก • ดับเบิลคลิก = ใช้/สวม • ลากไปแถบลัดได้ • มือถือแตะช่อง = แผ่นรายละเอียดเลื่อนขึ้น',
    '- **รายละเอียดไอเทม/รูนแบบ minimal:** ซุ้มโชว์ภาพใหญ่ + ชื่อ + ค่าหลัก 1 แถว + บรรทัดแดงถ้า Class/เลเวลไม่ถึง • คำบรรยาย/แหล่งดรอป/ราคาขายอยู่ใน "Details ▾" • รายละเอียดไอเทมและรูนเป็นภาษาอังกฤษเสมอ • การ์ดรูนโชว์สรุป 1 บรรทัด (short)',
    '- **ป้ายชื่อแบบ RO (ไม่มีกล่อง):** ตัวเรา = ขาวเรืองทอง + โล่สี Class • ผู้เล่นอื่น = ครีม • ปาร์ตี้ = มิ้นต์ • NPC = ทองอุ่น • มอน = ชื่อ + Lv สีตามความยาก (เทา/เขียว/ขาว/ส้ม/แดง) • MVP = ทองมงกุฎ • มอนมีเส้นขอบเข้มและชื่อบาง ๆ ใต้ตัว',
    '- **การ์ดยูนิต:** คลิกขวา (คอม) / แตะค้าง 0.5 วิ (มือถือ) ที่มอน/ผู้เล่น/NPC — มอนบอก Lv เผ่า ธาตุ แพ้-ต้านธาตุ Hunt Rune ที่ช่วย ดรอป+โอกาส • ผู้เล่นบอกของที่สวม + ปุ่มชวนปาร์ตี้/แลกเปลี่ยน/อีโมต',
    '- **มือถือแนวตั้ง:** การ์ดเควสต์ย่อเป็นปุ่ม Quest ใต้การ์ดตัวละคร (ตัวเลข = Daily ที่เหลือ, ! = ส่งได้) แตะเปิดสมุดเควสต์เต็มจอ • หน้าต่างเป็นสมุดหน้าเดียว + ปุ่มกลับ',
    '- **แอนิเมชันตกแต่ง:** เปิดหน้าต่าง/สลับแท็บ/กดปุ่ม/เงินเพิ่ม/เลเวลอัป/QUEST COMPLETE 120–300ms • กราฟิก "ประหยัด" หรือระบบตั้งลดการเคลื่อนไหว = ปิดทั้งหมด', '');
  if (X.windows && X.windows.length) {
    head(['เมนู', 'ปุ่มลัด', 'หน้าต่าง']);
    for (const wd of X.windows) row([wd.label, wd.key, wd.title]);
    row(['Runes', 'Shift+R', 'Skill Runes + Hunt Runes ในหน้าต่างเดียว (R เฉย ๆ = กาชา)']);
    w('');
  }

  // ---------------- แผนที่ ----------------
  w('## แผนที่', '');
  head(['แผนที่', 'ชื่อไทย', 'ประเภท', 'เลเวล', 'ขนาด', 'มอนสเตอร์ (จำนวนเกิด)', 'MVP', 'World Boss', 'จุดตำนาน', 'ทางเชื่อม']);
  const KIND = { town: 'เมือง', field: 'ทุ่ง', cave: 'ถ้ำ/ดันเจี้ยน' };
  const loreN = mk => (X.lore || []).filter(l => l.map === mk).length;
  for (const [mk, m] of Object.entries(MAPS)) row([m.name, m.thai || '', KIND[m.kind] || m.kind, m.level || (m.kind === 'town' ? 'เมือง' : ''), m.w && m.h ? `${m.w}×${m.h}` : '', (m.spawns || []).map(([id, n]) => `${mname(id)} ×${n}`).join(', '), m.mvp ? mname(m.mvp) : '', D.WB.MAPS[mk] ? 'Ancient ' + mname(D.WB.MAPS[mk].mvp) : '', loreN(mk) || '', Object.entries(m.links || {}).map(([d, t]) => `${d}→${MAPS[t] ? MAPS[t].name : t}`).join(', ')]);
  w('', '### จุดสังเกตและบรรยากาศ', '', GATES, '');
  for (const [mk, m] of Object.entries(MAPS)) if (LANDMARKS[mk]) w(`- **${m.name}:** ${LANDMARKS[mk]}`);
  w('', '### NPC', '');
  head(['แผนที่', 'NPC']);
  for (const m of Object.values(MAPS)) if (m.npcs && m.npcs.length) row([m.name, m.npcs.map(n => n.name).join(', ')]);
  w('');

  // ---------------- มอนสเตอร์ ----------------
  const chipTxt = X.chip && X.chip.drop != null ? `ชิปดรอปสุ่ม: มอนทั่วไป ${pct(X.chip.drop)} • MVP ${pct(X.chip.boss)} ต่อการฆ่า 1 ตัว (ดรอปซ้ำได้)` : 'ชิปของแต่ละมอนดรอปแยกต่างหาก';
  w('## มอนสเตอร์', '', `อัตราดรอปเป็นค่าพื้นฐานต่อการฆ่า 1 ตัว (ก่อนโบนัส LUK/ปาร์ตี้) • ${chipTxt} • Volt = เงินที่ได้ทันทีต่อตัว (เงินหลักมาจากขายของแบบ RO) • ลูกสมุนบอสไม่มี EXP/Volt/ดรอป`, '');
  head(['มอน', 'Lv', 'HP', 'ATK', 'DEF/MDEF', 'ธาตุ', 'เผ่า', 'ดุ', 'EXP / JEXP', 'Volt', 'พบที่']);
  const mobs = Object.values(MOBS).filter(m => !m.dummy && !m.id.startsWith('wb_') && !m.minion && !/^c3_/.test(m.id)).sort((a, b) => a.lv - b.lv);
  for (const m of mobs) row([m.name + (m.boss || m.mvp ? ' 👑' : '') + (m.elite ? ' (Elite)' : ''), m.lv, num(m.hp), (m.atk || []).join('~'), `${m.def || 0}/${m.mdef || 0}`, ELE[m.element] || m.element, RACE[m.race] || m.race, m.aggro ? 'ใช่' : '-', `${num(m.exp)} / ${num(m.jexp)}`, vz(m.id), (mobMaps[m.id] || []).join(', ')]);
  if (X.elites && X.elites.length) w('', `**Elite หายาก** (${X.elites.map(e => e.name).join(', ')}) เกิดนาน ๆ ครั้งในแมพของมอนต้นแบบ — HP/EXP สูงกว่าหลายเท่า มีของเฉพาะตัว`);
  w('', '### ดรอปของมอนแต่ละตัว', '');
  for (const m of mobs) {
    if (!(m.drops || []).length) continue;
    w(`- **${m.name}** (Lv ${m.lv}): ` + m.drops.map(([id, r]) => `${iname(id)} ${pct(r)}`).join(' • ') + (D.MOB_CHIP[m.id] ? ` • ชิป: ${iname(D.MOB_CHIP[m.id])}` : ''));
  }
  w('');

  // ---------------- ท่าบอส ----------------
  const kits = Object.entries(X.bossKits).filter(([id]) => Object.values(MAPS).some(m => m.mvp === id));
  if (kits.length) {
    w('## ท่าบอสและลูกสมุน', '', 'ทุกท่ามีป้ายแดงเตือนก่อนอย่างน้อย 1 วิ หลบได้ทุกท่า ท่าเดียวไม่เกิน 60% MaxHP • MVP เรียกลูกสมุนทีละ 2 (และทันทีเมื่อเลือดผ่าน 75/50/25%) • ระดับ Ancient (World Boss) ใช้ชุดท่าของตัวเอง คลั่งที่ 50% และ 20% (ลูกสมุนชั้นยอด + ไม้ตายทันที) • บอสตาย/รีเซ็ต = ลูกสมุนสลาย', '');
    head(['บอส', 'ท่า MVP', 'ท่า Ancient', 'ไม้ตาย Ancient', 'ลูกสมุน', 'ชั้นยอด']);
    for (const [id, k] of kits) row([mname(id), k.rot.map(m => m.name).join(', '), k.wbRot.map(m => m.name).join(', '), k.ult ? k.ult.name : '', k.minions.join(', '), k.elite || '']);
    const hints = [];
    for (const [id, k] of kits) for (const m of [...k.rot, ...k.wbRot]) if (m.hint && !hints.some(h => h[0] === id && h[1] === m.name)) hints.push([id, m.name, m.hint]);
    if (hints.length) { w('', '**วิธีหลบ (คำเตือนในเกม):**', ''); for (const [id, n, h] of hints) w(`- ${mname(id)} — ${n}: ${h}`); }
    w('');
  }

  // ---------------- อาวุธ ----------------
  const src = id => (dropsBy[id] || []).filter(([, r]) => r !== null).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m, r]) => `${mname(m)} ${pct(r)}`).join(', ');
  const shopSet = new Set(Object.values(D.SHOPS).flat());
  w('## อาวุธ', '');
  const WT = [...new Set(items('weapon').map(i => i.wtype))];
  for (const t of WT) {
    w(`### ${WTN[t] || t}`, '');
    head(['อาวุธ', 'ATK', 'MATK', 'Lv', 'ช่องชิป', 'Class', 'ความหายาก', 'ราคา', 'หาได้จาก']);
    for (const i of items('weapon').filter(i => i.wtype === t).sort((a, b) => (a.lv || 0) - (b.lv || 0) || a.atk - b.atk)) row([i.name, i.atk || '', i.matk || '', i.lv || 1, i.slots || 0, jobsTxt(i.jobs), RAR[i.rarity] || i.rarity, num(i.price), [shopSet.has(i.id) ? 'ร้านค้า' : '', src(i.id)].filter(Boolean).join(' • ')]);
    w('');
  }

  // ---------------- เกราะ ----------------
  w('## ชุดเกราะและเครื่องแต่งกาย', '');
  const SL = [...new Set(items('armor').map(i => i.slot))];
  for (const s of SL) {
    w(`### ${SLOT[s] || s}`, '');
    head(['ไอเทม', 'DEF', 'MDEF', 'โบนัส', 'Lv', 'ช่องชิป', 'Class', 'ความหายาก', 'ราคา', 'หาได้จาก']);
    for (const i of items('armor').filter(i => i.slot === s).sort((a, b) => (a.lv || 0) - (b.lv || 0) || (a.def || 0) - (b.def || 0))) row([i.name, i.def || '', i.mdef || '', bonus(i.b), i.lv || 1, i.slots || 0, jobsTxt(i.jobs), RAR[i.rarity] || i.rarity, num(i.price), [shopSet.has(i.id) ? 'ร้านค้า' : '', src(i.id)].filter(Boolean).join(' • ')]);
    w('');
  }

  // ---------------- ชิป ----------------
  w('## ชิป (การ์ด)', '', `ใส่ในช่องชิปของอุปกรณ์ตามตำแหน่ง • ${chipTxt} • ถอดชิปฟรีที่เตาของ Brokk (แท็บ Chips)`, '');
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
  w('## ร้านค้า', '', 'ตีบวก/ถอดชิป/Hunt Rune อยู่ในหน้าต่างเตาของ Brokk Forge-Bot (แท็บ Refine / Chips / Hunt Rune) ไม่ใช่เมนูบทสนทนา', '');
  head(['ร้าน', 'สินค้า']);
  for (const [k, list] of Object.entries(D.SHOPS)) row([k, list.map(iname).join(', ')]);
  w('');

  // ---------------- เควสต์ ----------------
  w('## เควสต์เนื้อเรื่อง', '');
  head(['บท', 'เควสต์', 'ทำอะไร', 'รางวัล']);
  const npcName = {}; for (const m of Object.values(MAPS)) for (const n of m.npcs || []) npcName[n.id] = n.name;
  const objTxt = o => !o ? '' : o.type === 'hit' ? `ตีหุ่นฝึก ×${o.n || ''}` : o.type === 'event' ? ({ save: 'บันทึกจุดเซฟที่ Bifrost', refine: 'ตีบวกอุปกรณ์ที่ Brokk' }[o.ev] || o.ev) : o.type === 'job' ? 'เปลี่ยนเป็น Class แรกที่ Mimir' : o.type === 'skill' ? 'อัปสกิลแรก' : o.type === 'useskill' ? `ใช้สกิล ×${o.n || ''}` : o.type === 'baseLv' ? `Base Lv ${o.lv || o.n}` : o.type === 'jobLv' ? `Job Lv ${o.lv || o.n}` : o.type === 'talk' ? `คุยกับ ${npcName[o.npc] || o.npc}` : o.type === 'kill' ? `ล่า ${mname(o.mob)} ×${o.n}` : o.type === 'collect' ? `เก็บ ${iname(o.item)} ×${o.n}${o.mob ? ' จาก ' + mname(o.mob) : ''}` : o.type === 'map' || o.type === 'visit' ? `ไปที่ ${MAPS[o.map] ? MAPS[o.map].name : o.map}` : o.type === 'level' ? `Base Lv ${o.lv}` : o.type;
  const rwTxt = r => !r ? '' : [r.zeny ? num(r.zeny) + ' Volt' : '', r.bexp ? num(r.bexp) + ' BEXP' : '', r.jexp ? num(r.jexp) + ' JEXP' : '', ...(r.items || []).map(([id, n]) => `${iname(id)} ×${n}`)].filter(Boolean).join(', ');
  for (const q of D.QUESTS) row([q.ch || 6, q.title, objTxt(q.obj), rwTxt(q.reward)]);
  w('');

  // ---------------- เควสต์เสริม ----------------
  if (X.side && X.side.length) {
    const ST = { kill: 'ล่า', collect: 'เก็บ', talk: 'คุยกับ', visit: 'ไปที่', lore: 'อ่านจุดตำนาน', mvp: 'ล้ม MVP' };
    const stTxt = s => s.type === 'kill' ? `ล่า ${s.mob} ×${s.n}` : s.type === 'collect' ? `เก็บ ${s.item} ×${s.n}${s.mob ? ' จาก ' + s.mob : ''}` : s.type === 'talk' ? `คุยกับ ${s.to}` : s.type === 'visit' ? `ไปที่ ${s.to || (MAPS[s.map] ? MAPS[s.map].name : s.map || '')}` : `${ST[s.type] || s.type}${s.to ? ' ' + s.to : ''}${s.mob ? ' ' + s.mob : ''}`;
    w('## เควสต์เสริม', '', 'รับ-ส่งกับ NPC (ปุ่ม ! เหนือหัว) • แสดงเป็นการ์ดในหน้าต่างเควสต์ (J) • ทำเมื่อไหร่ก็ได้หลังปลดเงื่อนไข', '');
    head(['เควสต์', 'ผู้ให้', 'ขั้นตอน', 'รางวัล']);
    for (const q of X.side) row([q.title, q.giver, q.steps.map(stTxt).join(' → '), rwTxt(q.reward)]);
    w('');
  }

  // ---------------- จุดตำนาน ----------------
  if (X.lore && X.lore.length) {
    w('## จุดตำนาน (Lore)', '', `${X.lore.length} จุดทั่วโลก — เดินไปตรวจดูเพื่อปลดเรื่องเล่า (ได้ EXP ครั้งแรก) • อ่านซ้ำได้ในแท็บ **Lore (Valhalla Codex)** ของสมุดเควสต์`, '');
    head(['แผนที่', 'จุด']);
    const by = {}; for (const l of X.lore) (by[l.map] = by[l.map] || []).push(`${l.name} — ${l.title}`);
    for (const [mk, ls] of Object.entries(by)) row([MAPS[mk] ? MAPS[mk].name : mk, ls.join(' • ')]);
    if (X.newNpcs && X.newNpcs.length) w('', `**NPC จาก World Pack:** ${X.newNpcs.map(n => `${n.name} (${MAPS[n.map] ? MAPS[n.map].name : n.map})`).join(', ')}`);
    w('');
  }

  // ---------------- ประจำวัน ----------------
  w('## ภารกิจประจำวัน', '', 'ได้ 3 ภารกิจต่อวัน สุ่มตามเลเวล ทำครบเปิดหีบรางวัล และนับวันต่อเนื่อง (streak)', '');
  head(['ชนิด', 'น้ำหนักการสุ่ม', 'ปลดล็อก']);
  const DN = { hunt: 'ล่ามอน', map: 'สำรวจแผนที่', skill: 'ใช้สกิล', loot: 'เก็บของ', sell: 'ขายของ', refine: 'ตีบวก', mvp: 'ล่า MVP' };
  for (const [k, v] of Object.entries(D.DAILY)) row([`${v.ic} ${DN[k] || k}`, v.w, v.minLv ? 'Base Lv ' + v.minLv : 'ตั้งแต่เริ่ม']);
  w('');

  // ---------------- World Boss ----------------
  w('## World Boss', '', `ระดับ 2 ของ MVP (Ancient) • เลือด/แรงตั้งต่อบอส (ตารางล่าง — จูนให้ปาร์ตี้ 5 คนตามเลเวลล้มได้ราว 10–15 นาที) • เกิดทุก ${D.WB.PERIOD / 60000} นาที อยู่ ${D.WB.WINDOW / 60000} นาที • เลือดใช้ร่วมกันทั้งแผนที่ ไม่ฟื้นเมื่อผู้เล่นตาย • มีตารางอันดับดาเมจ • ป้ายใต้มินิแมพบอกสถานะ Ancient ทุกแผนที่ (แตะ = นำทาง) + ประกาศตอนตื่น/เตือนก่อน 2 นาที`, '');
  head(['แผนที่', 'บอส', 'เลือด × ของ MVP', 'แรง × ของ MVP', 'เกิดนาทีที่']);
  for (const [mk, v] of Object.entries(D.WB.MAPS)) { const t = X.wbTune[mk] || {}; row([MAPS[mk].name, 'Ancient ' + mname(v.mvp), '×' + (t.hp || D.WB.MULT), '×' + (t.atk || 3), ':' + String(v.off).padStart(2, '0')]); }
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
