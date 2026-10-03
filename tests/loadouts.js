'use strict';
// ============================================================
//  ทดสอบ Loadouts + Build Code (js/loadouts.js) ด้วย Playwright:
//  บันทึก/สลับไป-กลับ (ค่าสถานะเท่าเดิมทุกตัว A→B→A) • ล็อกระหว่างต่อสู้ • ของที่ไม่มีแล้ว • เซฟเก่า/เซฟเสีย
//  • Build Code ไป-กลับ • ปฏิเสธโค้ดอันตราย (ไม่ eval / ไม่แตะ prototype) • คนละ Class = ดูอย่างเดียว • หน้าต่างบนมือถือ 390×844
//  รัน:  NODE_PATH=$(npm root -g) node tests/loadouts.js   (เปิดเซิร์ฟเวอร์เอง)
// ============================================================
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png' };
function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    }).listen(0, () => res(srv));
  });
}

async function start(browser, port, vp, mobile) {
  const ctx = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile });
  const p = await ctx.newPage();
  p._errors = [];
  p.on('pageerror', e => p._errors.push(e.message));
  await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(1200);
  await p.click('#au-offline'); await p.click('#btn-new'); await p.fill('#cr-name', 'Loadout'); await p.click('#cr-start'); await p.waitForTimeout(1500);
  await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {});
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 8000, polling: 250 }).catch(() => {});
  await p.waitForTimeout(500);
  return p;
}

(async () => {
  const srv = await serve();
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  else if (fs.existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(opts);
  const port = srv.address().port;
  const p = await start(browser, port, { width: 1100, height: 720 }, false);

  const checks = await p.evaluate(async () => {
    const out = [];
    const ok = (name, cond, info = '') => out.push([name, !!cond, typeof info === 'string' ? info : JSON.stringify(info)]);
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const LO = Loadouts, BS = BotScript, pl = G.player;
    const msgs = []; const msg0 = UI.msg.bind(UI); UI.msg = (t, c) => { msgs.push(String(t)); return msg0(t, c); };
    const confirm0 = UI.confirm; UI.confirm = async () => true;
    document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden'));

    // ---------- ตัวละครทดสอบ: Einherjar Lv 40 สกิลเต็ม ----------
    const setup = (job, lv = 40) => {
      Bot.toggle(false);
      pl.dead = false; pl.job = job; pl.baseLv = lv; pl.jobLv = JOBS[job].jobMax; pl.skills = {}; pl.buffs = {}; pl.passives = []; pl.runes = {};
      for (let j = job; j; j = JOBS[j].parent) for (const id of JOBS[j].skills) if (SKILLS[id] && !SKILLS[id].noLearn) pl.skills[id] = SKILLS[id].max;
      pl.stats = { str: 50, agi: 20, vit: 40, int: 5, dex: 20, luk: 5 };
      unequipInvalid(); recalc(); pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp; pl.combatAt = -99;
      const c = Bot.cfg(); c.adv = false; BS.setRules(c, []); c.presets = [null, null, null]; BS.normalize(c);
    };
    setup('einherjar');
    const pick = (slot, n) => Object.keys(ITEMS).filter(id => { const it = ITEMS[id]; return isEquipType(it) && it.slot === slot && canJobUse(it.jobs, pl.job) && !(it.lv > pl.baseLv) && it.wtype !== 'bow'; }).slice(0, n);
    const gear = {};
    for (const s of ['weapon', 'shield', 'armor', 'head', 'garment', 'shoes']) gear[s] = pick(s, 2);
    gear.acc = pick('acc', 4);
    for (const s in gear) for (const id of gear[s]) addItem(id, 1, true);
    const inv = id => pl.inventory.find(e => e.id === id && !Object.values(pl.equip).includes(e));
    const wear = ids => { for (const s of EQUIP_SLOTS) if (pl.equip[s]) unequip(s, true); for (const id of ids) { const e = inv(id); if (e) equipItem(e, true); } recalc(); };
    const grow = (n, pre) => { const outN = [], has = new Set(['core']); while (outN.length < n) { const cand = Object.keys(PTREE).filter(id => !has.has(id) && PTREE[id].links.some(l => has.has(l))).sort(); const id = cand.find(x => x.startsWith(pre)) || cand[0]; has.add(id); outN.push(id); } return outN; };
    const rskills = Object.keys(Runes.TREE).filter(k => JOBS.einherjar.skills.includes(k));
    const stat = () => JSON.stringify(pl.d);
    const rj = o => JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]]));

    // ---------- ชุด A ----------
    const A = { gear: [gear.weapon[0], gear.shield[0], gear.armor[0], gear.head[0], gear.garment[0], gear.shoes[0], gear.acc[0], gear.acc[1]].filter(Boolean),
      pas: grow(20, '0'), runes: { [rskills[0]]: Runes.TREE[rskills[0]][0].id, [rskills[1]]: Runes.TREE[rskills[1]][0].id } };
    wear(A.gear);
    const wA = pl.equip.weapon; wA.refine = 7; wA.cards = ['fenrir_card']; // ตีบวก + ชิป ต้องติดไปกับชิ้นนี้
    pl.passives = A.pas.slice(); pl.runes = Object.assign({}, A.runes);
    pl.hotbar = [{ t: 'skill', id: rskills[0] }, null, null, null, null, null, null, null]; pl.potbar = [{ t: 'item', id: 'red_potion' }, null, null, null];
    const c = Bot.cfg(); c.adv = true; BS.setRules(c, [{ on: true, c: [{ t: 'hp', op: '<', v: 30 }], a: { t: 'pot', v: 'hp' } }, { on: true, c: [{ t: 'always' }], a: { t: 'basic' } }]);
    c.presets[0] = BS.toText(c.script);
    recalc();
    const sA = stat(), uidA = EQUIP_SLOTS.map(s => pl.equip[s] && pl.equip[s].uid);
    ok('save slot A', LO.save(0, 'Tank A') && LO.st().slots[0].name === 'Tank A' && LO.st().slots[0].bot.preset === 0 && LO.st().cur === 0);

    // ---------- ชุด B ----------
    const B = { gear: [gear.weapon[1], gear.armor[1], gear.head[1], gear.acc[2]].filter(Boolean), pas: grow(25, '1'), runes: { [rskills[0]]: Runes.TREE[rskills[0]][1].id, [rskills[2]]: Runes.TREE[rskills[2]][1].id } };
    wear(B.gear);
    pl.passives = B.pas.slice(); pl.runes = Object.assign({}, B.runes);
    pl.hotbar = [null, { t: 'skill', id: rskills[1] }, null, null, null, null, null, null]; pl.potbar = [null, { t: 'item', id: 'apple' }, null, null];
    c.adv = false; BS.setRules(c, []);
    recalc();
    const sB = stat(), uidB = EQUIP_SLOTS.map(s => pl.equip[s] && pl.equip[s].uid);
    ok('save slot B', LO.save(1, 'Fury B') && LO.st().cur === 1);
    ok('A and B really differ', sA !== sB && JSON.stringify(uidA) !== JSON.stringify(uidB));

    // ---------- 1) สลับไป-กลับ A→B→A ค่าเท่าเดิมทุกตัว ----------
    let r = LO.apply(0);
    const backA = stat() === sA && JSON.stringify(EQUIP_SLOTS.map(s => pl.equip[s] && pl.equip[s].uid)) === JSON.stringify(uidA);
    ok('switch to A: stats + gear identical', r.ok && backA && !r.missing.length && !r.failed.length, r);
    ok('switch to A: refine + chip stayed on the weapon', pl.equip.weapon === wA && wA.refine === 7 && wA.cards[0] === 'fenrir_card');
    ok('switch to A: passives, runes, hotbars', JSON.stringify(pl.passives) === JSON.stringify(A.pas) && rj(pl.runes) === rj(A.runes)
      && pl.hotbar[0] && pl.hotbar[0].id === rskills[0] && pl.potbar[0] && pl.potbar[0].id === 'red_potion' && !pl.potbar[1]);
    ok('switch to A: Battle Script preset restored', c.adv === true && c.script.length === 2 && BS.toText(c.script) === c.presets[0]);
    r = LO.apply(1);
    ok('switch to B: stats + gear identical', r.ok && stat() === sB && JSON.stringify(EQUIP_SLOTS.map(s => pl.equip[s] && pl.equip[s].uid)) === JSON.stringify(uidB) && c.adv === false && !c.script.length);
    ok('weapon from A went back to the bag with refine/chip', pl.inventory.includes(wA) && wA.refine === 7 && wA.cards.length === 1);
    r = LO.apply(0);
    ok('A→B→A round trip: stats identical', r.ok && stat() === sA, { same: stat() === sA });
    ok('slot matches current state', LO.matches(0) && !LO.matches(1));
    // Battle Script ชุดที่ใช้อยู่ถูกแก้ภายหลัง → สลับกลับได้ชุดล่าสุด (จำ "ชุดไหน" ไม่ใช่แค่สำเนา)
    c.presets[0] = '1:A=N'; LO.apply(1); LO.apply(0);
    ok('active Battle Script preset follows the preset slot', BS.toText(c.script) === '1:A=N' && c.adv === true);
    c.presets[0] = BS.toText([{ on: true, c: [{ t: 'hp', op: '<', v: 30 }], a: { t: 'pot', v: 'hp' } }, { on: true, c: [{ t: 'always' }], a: { t: 'basic' } }]); LO.apply(1); LO.apply(0);

    // ---------- 2) ล็อกระหว่างต่อสู้ (กติกาเดียวกับรูน) ----------
    const m = spawnMob('pudding', { x: Math.floor(pl.x) + 1, y: Math.floor(pl.y) }); m.hp = m.maxHp = 1e6; m.nextWander = 1e9;
    pl.combatAt = -99; damageMob(m, 5);
    r = LO.apply(1);
    ok('combat lock: dealing damage blocks switching', !r.ok && /ต่อสู้|combat/.test(r.err) && stat() === sA && !LO.canSwitch());
    G.time += 5.1;
    ok('combat lock: free again after 5 s', LO.canSwitch() === Runes.canChange() && LO.apply(1).ok && stat() === sB);
    pl.combatAt = -99; damagePlayer(1);
    r = LO.apply(0);
    ok('combat lock: taking damage blocks switching', !r.ok && stat() === sB);
    G.time += 5.1; pl.hp = pl.d.maxHp; G.mobs = G.mobs.filter(x => x !== m);
    // ปุ่มในหน้าต่างก็ล็อก
    UI.open('w-builds'); await wait(30);
    pl.combatAt = G.time; LO.render();
    const goBusy = document.querySelector('#w-builds .lo-card[data-slot="0"] .lo-go');
    ok('combat lock: switch button disabled + banner', goBusy && goBusy.disabled && !!document.querySelector('#w-builds .lo-busy'));
    pl.combatAt = -99; LO.render();
    document.querySelector('#w-builds .lo-card[data-slot="0"] .lo-go').click(); await wait(30);
    ok('UI: switch button works out of combat', stat() === sA && LO.st().cur === 0 && /Tank A/.test(msgs.join('|')));

    // ---------- 3) ของที่ไม่มีแล้ว: ข้าม + บอกชัดเจน ----------
    const goneE = pl.inventory.find(e => e.uid === LO.st().slots[1].equip.weapon.uid);
    const storE = pl.inventory.find(e => e.uid === LO.st().slots[1].equip.armor.uid);
    pl.inventory.splice(pl.inventory.indexOf(goneE), 1);                      // ขายไปแล้ว
    pl.inventory.splice(pl.inventory.indexOf(storE), 1); pl.storage.push(storE); // ฝากคลัง
    msgs.length = 0;
    r = LO.switchTo(1);
    const miss = r.missing.map(x => x.slot + ':' + x.where).sort().join(',');
    ok('missing items: skipped, rest still switched', r.ok && miss === 'armor:storage,weapon:gone' && pl.equip.head && pl.equip.head.uid === LO.st().slots[1].equip.head.uid
      && JSON.stringify(pl.passives) === JSON.stringify(B.pas), miss);
    ok('missing items: kept the current weapon/armor instead of going naked', pl.equip.weapon === wA && !!pl.equip.armor);
    ok('missing items: clear message names them', msgs.some(t => t.includes(ITEMS[goneE.id].name) && t.includes(ITEMS[storE.id].name) && /คลัง|Storage/.test(t)), msgs);
    LO.render();
    ok('missing items: slot card warns before switching', /ไม่มีในกระเป๋า|Missing/.test(document.querySelector('#w-builds .lo-card[data-slot="1"]').textContent));
    pl.inventory.push(goneE); pl.storage.splice(pl.storage.indexOf(storE), 1); pl.inventory.push(storE);
    r = LO.apply(1);
    ok('items back → full switch again', r.ok && !r.missing.length && stat() === sB);

    // ---------- 4) Passive ต้องไม่เกินแต้มทั้งหมด ----------
    LO.apply(0);
    const lv0 = pl.baseLv; pl.baseLv = 15; recalc(); // มี 14 แต้ม แต่ชุด B ใช้ 25
    const pasBefore = JSON.stringify(pl.passives);
    r = LO.apply(1);
    ok('passives over total points are refused (rest still applies)', r.ok && r.passErr && JSON.stringify(pl.passives) === pasBefore && pl.equip.weapon.uid === LO.st().slots[1].equip.weapon.uid, r.passErr);
    pl.baseLv = lv0; recalc(); LO.apply(0);
    ok('free passive swap: zeny unchanged', (() => { const z = pl.zeny; LO.apply(1); LO.apply(0); return pl.zeny === z; })());

    // ---------- 5) เซฟ: persisted • เซฟเก่าโหลดได้ • เซฟเสียถูกตัด ----------
    ok('save: loadouts in SAVE_FIELDS, SAVE_KEY unchanged', SAVE_FIELDS.includes('loadouts') && SAVE_KEY === 'ragnarok_web_save_v2');
    const data = JSON.parse(JSON.stringify(saveData()));
    const back = loadGameFrom(data);
    ok('save: round trip keeps 3 slots', back.loadouts.slots[0].name === 'Tank A' && back.loadouts.slots[1].passives.length === 25 && back.loadouts.slots[2] === null && back.loadouts.cur === 0
      && JSON.stringify(back.loadouts.slots[0].equip) === JSON.stringify(LO.st(pl).slots[0].equip));
    const old = loadGameFrom({ name: 'Old', gender: 'm', hair: '#ccc', job: 'einherjar', baseLv: 20, jobLv: 20, skills: { shield_slam: 5 }, stats: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 } });
    ok('save: old save (no loadouts) loads with 3 empty slots', old && old.loadouts.cur === -1 && old.loadouts.slots.length === 3 && old.loadouts.slots.every(x => x === null));
    const junk = loadGameFrom(Object.assign({}, data, { loadouts: JSON.parse('{"cur":7,"__proto__":{"polluted":1},"slots":[{"name":"<img src=x onerror=alert(1)>very long name indeed","at":"x","job":"__proto__","passives":["__proto__","core","0a","0a","nope"],'
      + '"runes":{"__proto__":"x","shield_slam":"fire_rune.split","whirlwind":"whirlwind.vortex"},"equip":{"weapon":{"uid":"1e400","id":"knife"},"head":{"uid":5,"id":"red_potion"},"__proto__":{"uid":1,"id":"knife"}},'
      + '"hotbar":[{"t":"skill","id":"constructor"},{"t":"item","id":"red_potion"}],"potbar":"zz","bot":{"adv":"yes","text":"eval(1)","preset":9}},"x",null,{"name":"extra"}]}') }));
    const j0 = junk.loadouts.slots[0];
    ok('save: corrupt loadouts sanitized', junk.loadouts.cur === -1 && junk.loadouts.slots.length === 3 && junk.loadouts.slots[1] === null && !/[<>]/.test(j0.name) && j0.name.length <= 16
      && j0.job === null && JSON.stringify(j0.passives) === '["0a"]' && JSON.stringify(j0.runes) === '{"whirlwind":"whirlwind.vortex"}' && !j0.equip.weapon && !j0.equip.head
      && j0.hotbar.every(x => x === null) && j0.potbar.length === 4 && j0.bot.adv === false && j0.bot.text === '1:' && j0.bot.preset === -1 && ({}).polluted === undefined, j0);
    G.player = pl; recalc();

    // ---------- 6) Build Code ไป-กลับ ----------
    LO.apply(0);
    const code = LO.exportCode(null, true), dec = LO.decode(code);
    const raw = atob(code.slice(9).replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (code.length - 9) % 4) % 4));
    ok('build code: IV-BUILD:<base64url>', /^IV-BUILD:[A-Za-z0-9_-]+$/.test(code) && code.length < 3600, code.length);
    const b = dec.build;
    ok('build code: decodes Class, runes, passives, gear ids, script', b && b.job === 'einherjar' && JSON.stringify(b.runes) === JSON.stringify(Object.values(A.runes).sort())
      && JSON.stringify(b.passives) === JSON.stringify(A.pas) && b.equip[1] === wA.id && b.script && b.script.text === BS.toText(c.script), dec.err || '');
    const fields = raw.split('|');
    ok('build code: no uids / name / refine inside', !raw.includes(pl.name) && fields[4].split(',').every(x => !x || ITEMS[x]) && !/refine|uid|\d{3,}/.test(fields.slice(1, 5).join('|')), raw.slice(0, 120));
    ok('build code: without Battle Script', LO.decode(LO.exportCode(null, false)).build.script === null);
    ok('build code: slot export works too', LO.decode(LO.exportCode(LO.st().slots[1], true)).build.passives.length === 25);
    // ใช้กับตัวละคร Class เดียวกัน (สภาพว่าง) → ได้ค่ารูน/Passive/สคริปต์เท่าเดิม
    pl.passives = []; pl.runes = {}; BS.setRules(c, []); c.adv = false; recalc();
    const chk = LO.check(b);
    ok('build code: same Class → applicable', chk.classOk && chk.passOk && chk.runeOk === 2 && chk.scriptOk);
    r = LO.applyBuild(b, { runes: true, passives: true, script: true });
    ok('build code: apply runes + passives + script = same build', r.ok && JSON.stringify(pl.passives) === JSON.stringify(A.pas) && rj(pl.runes) === rj(A.runes)
      && c.adv && BS.toText(c.script) === b.script.text && stat() === sA, r);
    // แต้มไม่พอ / สกิลไม่ถึง Lv ปลดรูน
    pl.baseLv = 10; recalc(); pl.skills[rskills[1]] = 3;
    const chk2 = LO.check(b);
    ok('build code: not enough points / skill levels → those parts unavailable', chk2.classOk && !chk2.passOk && chk2.runeOk === 1);
    r = LO.applyBuild(b, { runes: true, passives: false, script: false });
    ok('build code: runes for locked skills skipped', r.ok && r.skipped === 1 && !pl.runes[rskills[1]] && pl.runes[rskills[0]] === A.runes[rskills[0]]);
    ok('build code: passives refused when over points', !LO.applyBuild(b, { passives: true }).ok);
    pl.baseLv = 40; pl.skills[rskills[1]] = SKILLS[rskills[1]].max; recalc();
    pl.combatAt = G.time;
    ok('build code: apply blocked in combat', !LO.applyBuild(b, { runes: true }).ok);
    pl.combatAt = -99;

    // ---------- 7) โค้ดอันตราย/เสีย ต้องถูกปฏิเสธ ----------
    const enc = t => 'IV-BUILD:' + btoa(t).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const E8 = ',,,,,,,', good = (raw.split('|'));
    const evil = [
      ['no prefix', 'IV-SCRIPT:' + code.slice(9)], ['bad base64', 'IV-BUILD:ab$cd'], ['length%4==1', 'IV-BUILD:abcde'], ['too long', 'IV-BUILD:' + 'A'.repeat(5000)], ['not a string', { toString: () => code }],
      ['non-ascii', enc('1|einherjar||||') .replace(/.$/, '') + 'ก'], ['binary', 'IV-BUILD:' + btoa('\x00\x01\x02').replace(/=+$/, '')],
      ['wrong field count', enc('1|einherjar|||' + E8)], ['version 2', enc('2|einherjar|||' + E8 + '|')],
      ['job __proto__', enc('1|__proto__|||' + E8 + '|')], ['job constructor', enc('1|constructor|||' + E8 + '|')], ['job toString', enc('1|toString|||' + E8 + '|')], ['unknown job', enc('1|admin|||' + E8 + '|')],
      ['rune __proto__', enc('1|einherjar|__proto__||' + E8 + '|')], ['rune of other Class', enc('1|einherjar|fire_rune.split||' + E8 + '|')],
      ['two runes on one skill', enc(`1|einherjar|${Runes.TREE[rskills[0]][0].id},${Runes.TREE[rskills[0]][1].id}||${E8}|`)],
      ['passive __proto__', enc('1|einherjar||__proto__|' + E8 + '|')], ['passive core', enc('1|einherjar||core|' + E8 + '|')], ['passive disconnected', enc('1|einherjar||0o|' + E8 + '|')],
      ['passive duplicate', enc('1|einherjar||0a,0a|' + E8 + '|')], ['passive constructor', enc('1|einherjar||constructor|' + E8 + '|')],
      ['item __proto__', enc('1|einherjar|||__proto__,,,,,,,|')], ['item not equipment', enc('1|einherjar|||red_potion,,,,,,,|')], ['item wrong slot', enc(`1|einherjar|||,${gear.armor[0]},,,,,,|`)],
      ['script eval', enc('1|einherjar|||' + E8 + '|eval(alert(1))')], ['script junk', enc('1|einherjar|||' + E8 + '|1:A=N;<script>')], ['script too many conds', enc('1|einherjar|||' + E8 + '|1:A&A&A=N')],
      ['html in field', enc('1|<img src=x>|||' + E8 + '|')], ['pipe smuggling', enc(good.join('|') + '|extra')],
    ];
    const badIds = [...Object.keys(JOBS).filter(x => !LO_RX.job.test(x)), ...Object.keys(Runes.BY_ID).filter(x => !LO_RX.rune.test(x)),
      ...Object.keys(PTREE).filter(x => x !== 'core' && !LO_RX.node.test(x)), ...Object.keys(ITEMS).filter(x => isEquipType(ITEMS[x]) && !LO_RX.item.test(x))];
    ok('whitelist regexes accept every real Class/rune/node/item id', !badIds.length, badIds);
    ok('control: minimal valid code accepted', !LO.decode(enc('1|einherjar|||' + E8 + '|')).err);
    const accepted = evil.filter(([, s]) => !LO.decode(s).err).map(([n]) => n);
    ok('malicious codes rejected (' + evil.length + ' cases)', !accepted.length, accepted);
    ok('no prototype pollution', ({}).polluted === undefined && Object.prototype.toString === Object.prototype.toString && typeof Object.prototype.__lookupGetter__ === 'function' && !('polluted' in Object.prototype));
    ok('numbers in script are clamped', (() => { const d = LO.decode(enc('1|einherjar|||' + E8 + '|1:h<999=ph;m999.999=K')); return d.build && d.build.script.rules[0].c[0].v === 100 && d.build.script.rules[1].c[0].n === 15 && d.build.script.rules[1].c[0].k === 20; })());
    ok('unknown skills in script are dropped, not fatal', (() => { const d = LO.decode(enc('1|einherjar|||' + E8 + '|1:A=snosuchskill;A=N')); return d.build && d.build.script.rules.length === 1 && d.build.script.dropped === 1; })());

    // ---------- 8) คนละ Class = ดูอย่างเดียว ----------
    const codeE = LO.exportCode(null, true);
    const keep = { pas: JSON.stringify(pl.passives), runes: rj(pl.runes) };
    setup('runecaster');
    const bx = LO.decode(codeE).build, cx = LO.check(bx);
    const before = JSON.stringify([pl.passives, pl.runes, c.script]);
    r = LO.applyBuild(bx, { runes: true, passives: true, script: true });
    ok('cross-Class: decodes but read-only, nothing applied', bx && !cx.classOk && !cx.passOk && !cx.runeOk && !cx.scriptOk && !r.ok && JSON.stringify([pl.passives, pl.runes, c.script]) === before, r.err);
    LO.draft = codeE; LO.preview = null; UI.open('w-builds'); LO.render(); await wait(20);
    document.querySelector('#w-builds .lo-view').click(); await wait(20);
    const pv = document.querySelector('#w-builds .lo-pv');
    ok('cross-Class: preview shown read-only (no apply button)', pv && pv.classList.contains('ro') && !pv.querySelector('.lo-apply') && /Einherjar/.test(pv.textContent));
    setup('valkyrie'); // Class 2 ของ Einherjar → ใช้ build ของ Class แม่ได้
    ok('Class 2 can use its Class 1 build', LO.check(LO.decode(codeE).build).classOk);
    setup('einherjar');
    LO.draft = codeE; LO.preview = null; LO.render(); document.querySelector('#w-builds .lo-view').click(); await wait(20);
    const pv2 = document.querySelector('#w-builds .lo-pv');
    ok('same Class: preview has apply checkboxes', pv2 && !pv2.classList.contains('ro') && pv2.querySelectorAll('.lo-opts input[type=checkbox]').length === 3 && !!pv2.querySelector('.lo-apply'));
    pv2.querySelector('.lo-apply').click(); await wait(60);
    ok('same Class: apply from preview', JSON.stringify(pl.passives) === keep.pas && rj(pl.runes) === keep.runes, { p: pl.passives.length });

    // ---------- 9) หน้าต่าง / ข้อความ ----------
    LO.render();
    const win = document.querySelector('#w-builds');
    ok('UI: 3 slot cards', win.querySelectorAll('.lo-card').length === 3 && win.querySelectorAll('.lo-card.empty').length === 1);
    ok('UI: text uses "Class", no คลาส/อาชีพ', !/คลาส|อาชีพ/.test(win.textContent));
    ok('UI: menu entry', !!document.querySelector('#menubar [data-win="w-builds"]'));
    UI.open('w-status'); await wait(20);
    const se = document.querySelector('#w-status .lo-st [data-open="w-builds"]');
    ok('UI: entry inside the Status window', !!se);
    UI.close('w-builds'); se.click(); await wait(20);
    ok('UI: Status entry opens Builds', UI.isOpen('w-builds'));
    // ตั้งชื่อใหม่
    const nm = document.querySelector('#w-builds .lo-card[data-slot="0"] .lo-name');
    nm.value = 'Renamed<script>'; nm.dispatchEvent(new Event('change'));
    ok('UI: rename (cleaned)', LO.st().slots[0].name === 'Renamedscript');
    UI.msg = msg0; UI.confirm = confirm0;
    return out;
  });

  // ---------- มือถือ 390×844: หน้าต่างไม่ล้นจอ ----------
  const ph = await start(browser, port, { width: 390, height: 844 }, true);
  const phone = await ph.evaluate(async () => {
    Loadouts.save(0, 'Phone'); UI.open('w-builds'); await new Promise(r => setTimeout(r, 50));
    const w = document.querySelector('#w-builds'), r = w.getBoundingClientRect(), body = w.querySelector('.win-body');
    const btn = w.querySelector('.lo-go').getBoundingClientRect();
    return { left: r.left, right: r.right, vw: innerWidth, sx: body.scrollWidth - body.clientWidth, docX: document.documentElement.scrollWidth - innerWidth, btnH: btn.height };
  });
  // แตะจริง (ระหว่างเกมวิ่งและหน้าต่างวาดใหม่เรื่อย ๆ): บันทึกชุด 2 → แตะสลับกลับชุด 1 • พิมพ์โค้ดแล้วแตะดูตัวอย่าง
  await ph.evaluate(() => { G.player.potbar = [null, null, null, null]; Loadouts.save(1, 'Phone B'); Loadouts.render(); });
  await ph.tap('#w-builds .lo-card[data-slot="0"] .lo-go'); await ph.waitForTimeout(150);
  const tapped = await ph.evaluate(() => Loadouts.st().cur === 0 && !!G.player.potbar[0]);
  const code = await ph.evaluate(() => Loadouts.exportCode(null, true));
  await ph.fill('#w-builds .lo-paste', code); await ph.tap('#w-builds .lo-view'); await ph.waitForTimeout(150);
  const pvOk = await ph.evaluate(() => !!document.querySelector('#w-builds .lo-pv .lo-apply'));
  const out = checks.concat([['phone 390×844: Builds window fits, no horizontal scroll', phone.left >= 0 && phone.right <= phone.vw && phone.sx <= 1 && phone.docX <= 0 && phone.btnH >= 36, JSON.stringify(phone)],
    ['phone: real tap switches build', tapped], ['phone: type code + tap Preview', pvOk]]);
  for (const e of p._errors.concat(ph._errors)) out.push(['page error', false, e]);
  await browser.close(); srv.close();
  let fail = 0;
  for (const [n, pass, info] of out) { if (!pass) fail++; console.log(`${pass ? '✔' : '✘'} ${n}${info !== '' && !pass ? `  (${info})` : ''}`); }
  console.log(fail ? `\n${fail} FAILED` : `\nALL ${out.length} PASSED`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
