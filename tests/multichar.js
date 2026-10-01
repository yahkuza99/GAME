// ทดสอบหลายตัวละครต่อบัญชี (สูงสุด 5 ช่อง): หน้าเลือกตัวละคร สลับตัว ลบตัว ย้ายเซฟรุ่นเก่า และโหมดออนไลน์ (Supabase ปลอม)
// ใช้: (python3 -m http.server 8790 &) ; BASE=http://localhost:8790/index.html NODE_PATH=$(npm root -g) node tests/multichar.js
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:8790/index.html';
const FAKE = path.join(__dirname, 'fake_supabase.js');
let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) { pass++; console.log('✔', name, info ? ` (${info})` : ''); } else { fail++; console.log('✘', name, info ? ` (${info})` : ''); } };

// เข้าเกมแล้ว: ปิดบทนำ/หน้าต่างที่เด้งขึ้น
async function settle(p) {
  await p.waitForFunction(() => G.started, null, { timeout: 15000 });
  await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {});
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 8000, polling: 250 }).catch(() => {});
  await p.evaluate(() => document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden')));
}
async function create(p, name) {
  await p.click('#btn-new');
  await p.waitForSelector('#cr-name', { state: 'visible' });
  await p.fill('#cr-name', name); await p.click('#cr-start');
  await settle(p);
}
// ตั้งค่า → เปลี่ยนตัวละคร (บันทึก แล้วรีโหลดเข้าหน้าเลือกตัวละคร)
async function toSelect(p) {
  await p.evaluate(() => UI.open('w-options'));
  await Promise.all([p.waitForNavigation({ timeout: 15000 }), p.click('#opt-charsel')]);
  await p.waitForSelector('#charsel:not(.hidden) .cs-slot', { timeout: 15000 });
  await p.waitForFunction(() => !document.querySelector('#charsel').classList.contains('loading'), null, { timeout: 15000 });
}
const listed = p => p.evaluate(() => [...document.querySelectorAll('#cs-list .cs-slot[data-i] .cs-main b')].map(e => e.textContent));
async function pick(p, name) {
  const i = await p.evaluate(n => Acct.chars.findIndex(c => c.name === n), name);
  await p.click(`#cs-list .cs-slot[data-i="${i}"]`);
  await p.click('#btn-continue');
  await settle(p);
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];

  // ================= 1) ออฟไลน์ (ไม่ล็อกอิน) =================
  const off = await b.newContext({ viewport: { width: 1280, height: 720 } });
  await off.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  const P = await off.newPage();
  P.on('pageerror', e => errs.push('offline: ' + e.message));
  await P.goto(BASE);
  await P.waitForSelector('#au-offline', { state: 'visible', timeout: 20000 });
  await P.click('#au-offline');
  ok('ออฟไลน์: หน้าเลือกตัวละคร (ว่าง 5 ช่อง)', await P.evaluate(() => !document.querySelector('#charsel').classList.contains('hidden') && document.querySelectorAll('#cs-list .cs-slot.empty').length === 5));
  await create(P, 'Alpha');
  await P.evaluate(() => { const p = G.player; p.baseLv = 20; p.jobLv = 9; p.zeny = 1234; addItem('cutter', 1, true); recalc(); saveGame(true, true); });
  await toSelect(P);
  ok('เปลี่ยนตัวละคร → กลับหน้าเลือกตัวละคร', JSON.stringify(await listed(P)) === '["Alpha"]', JSON.stringify(await listed(P)));
  // ชื่อซ้ำกับช่องอื่นในบัญชีเดียวกันไม่ได้ (ไม่สนตัวพิมพ์)
  await P.click('#btn-new'); await P.fill('#cr-name', 'alpha'); await P.click('#cr-start'); await P.waitForTimeout(300);
  ok('ชื่อซ้ำในบัญชีเดียวกัน → ไม่ให้สร้าง', await P.evaluate(() => !G.started && /ชื่อนี้|already/.test(document.querySelector('#cr-err').textContent)));
  await P.click('#cr-back');
  await create(P, 'Beta');
  const beta = await P.evaluate(() => ({ lv: G.player.baseLv, zeny: G.player.zeny, cutter: countItem('cutter'), slots: Acct.chars.length, active: Acct.data.active }));
  ok('ตัวที่ 2 เริ่มใหม่ (เลเวล/ไอเทมแยกกัน)', beta.lv === 1 && beta.zeny === 500 && beta.cutter === 0 && beta.slots === 2 && beta.active === 1, JSON.stringify(beta));
  await P.evaluate(() => { G.player.baseLv = 5; addItem('apple', 7, true); G.player.zeny = 77; saveGame(true, true); });
  await toSelect(P);
  ok('รายการมี 2 ตัว', JSON.stringify(await listed(P)) === '["Alpha","Beta"]', JSON.stringify(await listed(P)));
  ok('เลือกตัวที่เล่นล่าสุดไว้ก่อน', await P.evaluate(() => document.querySelector('#cs-list .cs-slot.on .cs-main b').textContent === 'Beta'));
  await pick(P, 'Alpha');
  const alpha = await P.evaluate(() => ({ name: G.player.name, lv: G.player.baseLv, jlv: G.player.jobLv, zeny: G.player.zeny, cutter: countItem('cutter'), apple: countItem('apple') }));
  ok('สลับกลับ Alpha: เลเวล/ไอเทม/เงินของตัวเอง', alpha.name === 'Alpha' && alpha.lv === 20 && alpha.jlv === 9 && alpha.zeny === 1234 && alpha.cutter === 1, JSON.stringify(alpha));
  await toSelect(P);
  await pick(P, 'Beta');
  const beta2 = await P.evaluate(() => ({ name: G.player.name, lv: G.player.baseLv, zeny: G.player.zeny, cutter: countItem('cutter'), apple: countItem('apple') }));
  ok('สลับไป Beta: ค่าของ Beta ไม่ถูก Alpha ทับ', beta2.name === 'Beta' && beta2.lv === 5 && beta2.zeny === 77 && beta2.cutter === 0 && beta2.apple >= 7, JSON.stringify(beta2));
  await toSelect(P);
  // ลบ Beta: ต้องพิมพ์ชื่อให้ตรงก่อน
  await P.click(`#cs-list .cs-slot[data-i="1"]`);
  await P.click('#cs-delete');
  const delBtn = '#cs-confirm .tbtn.danger';
  ok('ลบ: ปุ่มลบปิดไว้จนพิมพ์ชื่อ', await P.isDisabled(delBtn));
  await P.fill('#cs-confirm input', 'Bet'); ok('ลบ: พิมพ์ชื่อไม่ครบยังลบไม่ได้', await P.isDisabled(delBtn));
  await P.fill('#cs-confirm input', 'Beta'); await P.click(delBtn);
  ok('ลบ Beta แล้วเหลือ Alpha', JSON.stringify(await listed(P)) === '["Alpha"]', JSON.stringify(await listed(P)));
  await P.reload();
  await P.waitForSelector('#au-offline', { state: 'visible', timeout: 20000 }); await P.click('#au-offline');
  ok('รีโหลดแล้วยังมี Alpha ตัวเดียว', JSON.stringify(await listed(P)) === '["Alpha"]', JSON.stringify(await listed(P)));
  await P.click('#btn-continue'); await settle(P);
  ok('เล่น Alpha ต่อได้', await P.evaluate(() => G.player.name === 'Alpha' && G.player.baseLv === 20 && countItem('cutter') === 1));
  const stored = await P.evaluate(() => { const d = JSON.parse(localStorage.getItem(SAVE_KEY)); return { v: d.v, n: d.chars.length, active: d.active, name: d.chars[d.active].name }; });
  ok('เซฟในเครื่องเป็นก้อนบัญชี v2', stored.v === 2 && stored.n === 1 && stored.name === 'Alpha', JSON.stringify(stored));

  // ---- เต็ม 5 ช่อง: ปุ่มสร้างหาย ----
  await P.evaluate(() => { const base = saveData(); for (const n of ['C3', 'C4', 'C5', 'C6']) if (Acct.chars.length < Acct.MAX) Acct.data.chars.push(Object.assign(JSON.parse(JSON.stringify(base)), { name: n })); Acct.persist(true, true); });
  await toSelect(P);
  ok('ครบ 5 ช่อง: ไม่มีปุ่มสร้าง/ช่องว่าง', await P.evaluate(() => Acct.chars.length === 5 && document.querySelector('#btn-new').classList.contains('hidden') && !document.querySelector('#cs-list .cs-slot.empty')));

  // ---- สองแท็บเล่นคนละตัวในบัญชีเดียวกัน: เซฟไม่ทับช่องของกันและกัน ----
  const P2 = await off.newPage();
  P2.on('pageerror', e => errs.push('offline tab2: ' + e.message));
  await P2.goto(BASE);
  await P2.waitForSelector('#au-offline', { state: 'visible', timeout: 20000 }); await P2.click('#au-offline');
  await pick(P2, 'C3');
  await pick(P, 'Alpha');
  await P.evaluate(() => { G.player.zeny = 999; saveGame(true, true); });
  await P2.evaluate(() => { G.player.zeny = 888; saveGame(true, true); });
  // Chromium ส่งค่า localStorage ข้ามแท็บแบบ async: รอให้แท็บแรกเห็นเซฟของแท็บสองก่อน (ผู้เล่นจริงไม่เซฟสองแท็บในมิลลิวินาทีเดียวกัน)
  await P.waitForFunction(() => Acct.wrap(JSON.parse(localStorage.getItem(SAVE_KEY))).chars.some(c => c.name === 'C3' && c.zeny === 888), null, { timeout: 5000 }).catch(() => {});
  await P.evaluate(() => { G.player.zeny = 997; saveGame(true, true); });
  const tabs = await P.evaluate(() => { const d = Acct.wrap(JSON.parse(localStorage.getItem(SAVE_KEY))); return d.chars.map(c => `${c.name}:${c.zeny}`).join(','); });
  ok('สองแท็บคนละตัว: ทั้งสองตัวเก็บค่าของตัวเอง', /Alpha:997/.test(tabs) && /C3:888/.test(tabs) && tabs.split(',').length === 5, tabs);
  await P2.evaluate(() => { G.started = false; }); await P2.close();

  // ================= 2) เซฟรุ่นเก่า (ตัวละครเดียว) → ย้ายเป็นช่องแรก =================
  await P.evaluate(() => { G.started = false; localStorage.setItem(SAVE_KEY, JSON.stringify({ name: 'Oldie', gender: 'm', hair: '#ccc', job: 'runecaster', baseLv: 15, jobLv: 12, baseExp: 0, jobExp: 0,
    stats: { str: 1, agi: 1, vit: 10, int: 30, dex: 20, luk: 1 }, statPoints: 0, skillPoints: 2, skills: { first_aid: 1, fire_rune: 3 }, zeny: 4321,
    inventory: [{ id: 'red_potion', qty: 5, uid: 1, refine: 0, cards: [] }], equip: { weapon: { id: 'rod', qty: 1, uid: 3, refine: 2, cards: [] } },
    hotbar: [{ t: 'skill', id: 'fire_rune' }], map: 'meadow', x: 28.5, y: 28.5, save: { map: 'eldheim', x: 20.5, y: 24.5 }, hp: 100, sp: 50, options: { sound: false }, uidSeq: 10, savedAt: 1000 })); });
  await P.reload();
  await P.waitForSelector('#au-offline', { state: 'visible', timeout: 20000 }); await P.click('#au-offline');
  ok('เซฟเก่า: แสดงเป็นช่องแรก', JSON.stringify(await listed(P)) === '["Oldie"]', JSON.stringify(await listed(P)));
  await P.click('#btn-continue'); await settle(P);
  const old = await P.evaluate(() => { const pl = G.player, m = spawnMob('pudding', { x: pl.x + 1, y: pl.y }); pl.sp = 999; executeSkill('fire_rune', skillLv('fire_rune'), m); killMob(m); saveGame(true, true);
    const d = JSON.parse(localStorage.getItem(SAVE_KEY)); return { name: pl.name, job: pl.job, zeny: pl.zeny >= 4321, v: d.v, n: d.chars.length, sname: d.chars[0].name }; });
  ok('เซฟเก่า: เล่นได้และถูกเก็บเป็น v2', old.name === 'Oldie' && old.job === 'runecaster' && old.zeny && old.v === 2 && old.n === 1 && old.sname === 'Oldie', JSON.stringify(old));
  // Acct.merge: เซฟเก่าในสำเนาเครื่อง + ก้อน v2 บนคลาวด์ → รวมตามชื่อ ไม่ทิ้งช่องอื่น
  const mg = await P.evaluate(() => {
    const cloud = { v: 2, active: 1, savedAt: 500, chars: [{ name: 'A', baseLv: 3, savedAt: 100 }, { name: 'B', baseLv: 9, savedAt: 500 }] };
    const r1 = Acct.merge(cloud, { name: 'A', baseLv: 4, savedAt: 900 });
    const r2 = Acct.merge(cloud, { name: 'A', baseLv: 2, savedAt: 50 });
    const r3 = Acct.merge({ name: 'A', baseLv: 7, savedAt: 1000 }, { v: 2, active: 0, savedAt: 800, chars: [{ name: 'A', baseLv: 5, savedAt: 800 }, { name: 'Z', baseLv: 1, savedAt: 700 }] });
    const r4 = Acct.merge({ v: 2, active: 0, savedAt: 300, chars: [{ name: 'A', savedAt: 300 }] }, { v: 2, active: 0, savedAt: 400, chars: [{ name: 'A', savedAt: 400 }, { name: 'N', savedAt: 400 }] });
    return [r1.acct.chars.map(c => c.name + c.baseLv).join(), r1.push, r2.acct.chars[0].baseLv, r2.push, r3.acct.chars.map(c => c.name + c.baseLv).join(), r3.push, r4.acct.chars.length, r4.push];
  });
  ok('รวมคลาวด์กับสำเนาในเครื่อง (เซฟเก่า/ใหม่)', JSON.stringify(mg) === JSON.stringify(['A4,B9', true, 3, false, 'A7,Z1', true, 2, true]), JSON.stringify(mg));

  // ================= 3) บัญชีในเครื่อง: ย้ายตัวละครแบบไม่ล็อกอินเข้าบัญชี =================
  await P.evaluate(() => { saveGame = () => {}; G.started = false; });
  await P.reload();
  await P.waitForSelector('#au-offline', { state: 'visible', timeout: 20000 });
  await P.click('#au-tabs [data-mode="register"]');
  await P.fill('#au-user', 'localguy'); await P.fill('#au-pass', 'pass1234'); await P.fill('#au-pass2', 'pass1234'); await P.click('#au-submit');
  await P.waitForSelector('#cs-import:not(.hidden)', { timeout: 10000 });
  await P.click('#cs-import');
  ok('บัญชีในเครื่อง: ย้ายตัวละคร Oldie เข้าบัญชี', JSON.stringify(await listed(P)) === '["Oldie"]' && await P.evaluate(() => Acct.wrap(Online.lsGet(Online.LS.char('localguy'))).chars.length === 1), JSON.stringify(await listed(P)));
  await off.close();

  // ================= 4) ออนไลน์ (Supabase ปลอม) =================
  const ctx = await b.newContext({ viewport: { width: 1100, height: 680 } });
  await ctx.addInitScript({ path: FAKE });
  await ctx.route(/fake\.supabase\.test\/auth\/v1\/settings/, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"mailer_autoconfirm":true}' }));
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  const O = await ctx.newPage();
  O.on('pageerror', e => errs.push('online: ' + e.message));
  await O.goto(BASE);
  await O.waitForFunction(() => typeof Online !== 'undefined' && !document.querySelector('#auth').classList.contains('hidden'), null, { timeout: 20000 });
  const user = 'mc_' + Date.now().toString(36).slice(-5);
  await O.click('#au-tabs [data-mode="register"]');
  await O.fill('#au-user', user); await O.fill('#au-pass', 'pass1234'); await O.fill('#au-pass2', 'pass1234'); await O.click('#au-submit');
  await O.waitForSelector('#cr-name', { state: 'visible', timeout: 10000 });
  ok('ออนไลน์: บัญชีใหม่ไปหน้าสร้างตัวละครเลย', await O.isVisible('#cr-name'));
  await O.fill('#cr-name', 'Uno'); await O.click('#cr-start'); await settle(O);
  await O.evaluate(() => { G.player.baseLv = 12; saveGame(true, true); });
  await toSelect(O);
  await create(O, 'Dos');
  ok('ออนไลน์: เล่น Dos (ตัวที่ 2)', await O.evaluate(() => Online.online && G.player.name === 'Dos' && Acct.data.active === 1));
  await toSelect(O);
  await O.reload();
  await O.waitForSelector('#charsel:not(.hidden) .cs-slot[data-i]', { timeout: 15000 });
  ok('ออนไลน์: รีโหลดแล้วเห็นทั้ง 2 ตัว', JSON.stringify(await listed(O)) === '["Uno","Dos"]', JSON.stringify(await listed(O)));
  const row = await O.evaluate(() => { const d = JSON.parse(localStorage.getItem('fake_sb_db')), r = d.chars[Online.user.id]; return { name: r.name, v: r.data.v, n: r.data.chars.length, lv: r.data.chars[0].baseLv }; });
  ok('ออนไลน์: แถวเดียวต่อบัญชี name = ตัวที่เล่นอยู่', row.name === 'Dos' && row.v === 2 && row.n === 2 && row.lv === 12, JSON.stringify(row));
  await pick(O, 'Uno');
  ok('ออนไลน์: สลับไป Uno (เลเวลเดิม)', await O.evaluate(() => G.player.name === 'Uno' && G.player.baseLv === 12));
  await O.waitForFunction(() => { const d = JSON.parse(localStorage.getItem('fake_sb_db')); return d.chars[Online.user.id].name === 'Uno'; }, null, { timeout: 8000 }).catch(() => {});
  ok('ออนไลน์: คอลัมน์ name เปลี่ยนตามตัวที่เล่น', await O.evaluate(() => JSON.parse(localStorage.getItem('fake_sb_db')).chars[Online.user.id].name === 'Uno'));
  // บัญชีอื่นตั้งชื่อซ้ำกับตัวที่ไม่ได้เล่นอยู่ (Dos) ไม่ได้
  const O2 = await ctx.newPage();
  O2.on('pageerror', e => errs.push('online2: ' + e.message));
  await O2.goto(BASE);
  await O2.waitForFunction(() => typeof Online !== 'undefined' && !document.querySelector('#auth').classList.contains('hidden'), null, { timeout: 20000 });
  await O2.click('#au-tabs [data-mode="register"]');
  await O2.fill('#au-user', user + 'b'); await O2.fill('#au-pass', 'pass1234'); await O2.fill('#au-pass2', 'pass1234'); await O2.click('#au-submit');
  await O2.waitForSelector('#cr-name', { state: 'visible', timeout: 10000 });
  await O2.fill('#cr-name', 'dos'); await O2.click('#cr-start');
  await O2.waitForFunction(() => /มีคนใช้แล้ว|already taken/.test(document.querySelector('#cr-err').textContent), null, { timeout: 5000 }).catch(() => {});
  ok('ออนไลน์: ชื่อซ้ำกับช่องอื่นของผู้เล่นอื่นไม่ได้', await O2.evaluate(() => !G.started && /มีคนใช้แล้ว|already taken/.test(document.querySelector('#cr-err').textContent)));
  await O2.fill('#cr-name', 'Tres'); await O2.click('#cr-start'); await settle(O2);
  ok('ออนไลน์: บัญชีที่ 2 สร้างชื่อไม่ซ้ำได้', await O2.evaluate(() => G.player.name === 'Tres'));
  // เห็นกันในแผนที่ด้วยชื่อของตัวที่เล่นอยู่
  await O.waitForFunction(() => [...Online.others.values()].some(o => o.name === 'Tres'), null, { timeout: 15000 }).catch(() => {});
  ok('ออนไลน์: ผู้เล่นอื่นเห็นชื่อตัวที่เล่นอยู่', await O.evaluate(() => [...Online.others.values()].some(o => o.name === 'Tres')) && await O2.evaluate(() => [...Online.others.values()].some(o => o.name === 'Uno')));

  ok('ไม่มี error', !errs.length, errs.join(' || '));
  await b.close();
  console.log(fail ? `${fail} FAILED, ${pass} passed` : `ALL ${pass} PASSED`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
