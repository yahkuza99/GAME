'use strict';
// ============================================================
//  ทดสอบหน้าต่าง Runes (js/runebook.js) ด้วย Playwright:
//  ทางเข้า (เมนู / Shift+R / การ์ด Status / แท็บ Runes ในกระเป๋า / ลิงก์ในหน้าต่าง Skills / #w-hrunes เดิม)
//  • เลือก Skill Rune ที่นี่ = ผลเดียวกับหน้าต่าง Skills (Runes.set) • ใส่/ถอด Hunt Rune • ล็อกระหว่างต่อสู้ • สถานะล็อก (Skill Lv 4 / Base Lv 15·35)
//  • ยังไม่มีรูน = ปุ่มไป Brokk (ไม่มีปุ่มซื้อในหน้าต่างนี้) • ประกาศปลดล็อกพูดถึง Runes • มือถือ: รายการ → รายละเอียด → กลับ
//  รัน:  NODE_PATH=$(npm root -g) node tests/runebook.js   (เปิดเซิร์ฟเวอร์เอง)
//  ภาพหน้าจอ: SHOTS=<โฟลเดอร์> NODE_PATH=$(npm root -g) node tests/runebook.js
// ============================================================
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SHOTS = process.env.SHOTS || '';
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
  await p.click('#au-offline'); await p.click('#btn-new'); await p.fill('#cr-name', 'Runer'); await p.click('#cr-start'); await p.waitForTimeout(1500);
  await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {});
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 8000, polling: 250 }).catch(() => {});
  await p.waitForTimeout(500);
  // ตัวละคร Einherjar Lv 20: Whirlwind Lv 5 (ปลดรูน) • Iron Body Lv 4 • Shield Slam Lv 2 (ยังล็อก) • ไม่อยู่ในการต่อสู้
  await p.evaluate(() => {
    document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden'));
    Bot.toggle(false);
    const pl = G.player; pl.job = 'einherjar'; pl.jobLv = 10; pl.baseLv = 20; pl.zeny = 1e6; pl.combatAt = -99; pl.runes = {}; pl.hrunes = [null, null]; pl.hrunesOwn = [];
    Object.assign(pl.skills, { whirlwind: 5, iron_body: 4, shield_slam: 2 });
    recalc();
  });
  return p;
}

(async () => {
  const srv = await serve();
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  else if (fs.existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(opts);
  const port = srv.address().port;
  const out = [];
  const ok = (name, cond, info = '') => out.push([name, !!cond, typeof info === 'string' ? info : JSON.stringify(info)]);
  const p = await start(browser, port, { width: 1280, height: 720 }, false);
  const isOpen = id => p.evaluate(i => UI.isOpen(i), id);
  const closeAll = () => p.evaluate(() => document.querySelectorAll('.win:not(.hidden)').forEach(w => UI.close(w.id)));
  await p.waitForTimeout(300);

  // ---------- 1) ทางเข้า ----------
  const menu = await p.evaluate(() => { const b = document.querySelector('#menubar [data-win="w-runes"]'); return { has: !!b, afterSkills: !!b && b.previousElementSibling && b.previousElementSibling.dataset.win === 'w-skills', label: b && b.textContent }; });
  await p.evaluate(() => { const m = document.getElementById('menubar'); if (m.classList.contains('folded')) UI.toggleMenu(); });
  await p.click('#menubar [data-win="w-runes"]');
  ok('menu: "Runes" button (next to Skills) opens the window', menu.has && menu.afterSkills && /Runes/.test(menu.label) && await isOpen('w-runes'), menu);
  await closeAll();
  await p.keyboard.press('Shift+KeyR'); await p.waitForTimeout(80);
  const hk = { runes: await isOpen('w-runes'), gacha: await isOpen('w-gacha') };
  await closeAll();
  await p.keyboard.press('KeyR'); await p.waitForTimeout(80);
  const hk2 = { runes: await isOpen('w-runes'), gacha: await isOpen('w-gacha') };
  await closeAll();
  ok('hotkey: Shift+R opens Runes (plain R still opens Gacha)', hk.runes && !hk.gacha && !hk2.runes && hk2.gacha, { hk, hk2 });

  const entry = await p.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms)), r = {};
    const st = () => ({ open: UI.isOpen('w-runes'), tab: Runebook.tab, old: UI.isOpen('w-hrunes') });
    // การ์ด Hunt Rune ในหน้าต่าง Status
    Runebook.tab = 'skill';
    UI.open('w-status'); await wait(50);
    document.querySelector('#w-status .hr-st [data-open="w-hrunes"]').click(); await wait(50);
    r.status = st(); UI.close('w-runes'); UI.close('w-status');
    // id เดิม #w-hrunes (UI.open / UI.toggle) → หน้าต่างนี้ แท็บ Hunt
    Runebook.tab = 'skill'; UI.open('w-hrunes'); await wait(30); r.openOld = st(); UI.close('w-runes');
    Runebook.tab = 'skill'; UI.toggle('w-hrunes'); await wait(30); r.toggleOld = st(); UI.close('w-runes');
    // แท็บ Runes ในกระเป๋า: ลิงก์มาหน้าต่างนี้ (เลือกรูนที่ดูอยู่ให้เลย)
    G.player.hrunesOwn = ['hr_exec'];
    UI.invTab = 'hrune'; UI.open('w-inv'); await wait(50);
    const link = document.querySelector('#w-inv .book-l .rb-link');
    r.invLink = !!link && /Runes/.test(link.textContent);
    if (link) link.click(); await wait(50);
    r.inv = Object.assign(st(), { sel: Runebook.hrSel });
    UI.close('w-runes');
    const openBtn = [...document.querySelectorAll('#w-inv .book-r .btn')].find(b => /Open in Runes/.test(b.textContent));
    if (openBtn) { Runebook.hrSel = null; openBtn.click(); await wait(50); }
    r.invDetail = !!openBtn && UI.isOpen('w-runes') && Runebook.tab === 'hunt' && Runebook.hrSel === 'hr_exec';
    UI.close('w-runes'); UI.close('w-inv'); UI.invTab = 'use';
    G.player.hrunesOwn = [];
    // หน้าต่าง Skills: ลิงก์ "Manage in Runes"
    Runebook.tab = 'hunt'; UI.skTab = 'einherjar'; UI.open('w-skills'); await wait(50);
    const mg = document.querySelector('#w-skills .rn-manage');
    r.skillsRows = document.querySelectorAll('#w-skills .rn-row').length;
    if (mg) mg.click(); await wait(50);
    r.skills = Object.assign(st(), { has: !!mg });
    UI.close('w-runes'); UI.close('w-skills');
    return r;
  });
  ok('entry: Status Hunt Rune card opens Runes on the Hunt tab', entry.status.open && entry.status.tab === 'hunt' && !entry.status.old, entry.status);
  ok('entry: old #w-hrunes id (UI.open / UI.toggle) redirects to Runes → Hunt', entry.openOld.open && entry.openOld.tab === 'hunt' && !entry.openOld.old && entry.toggleOld.open && entry.toggleOld.tab === 'hunt', entry);
  ok('entry: inventory "Runes" tab links here (banner + "Open in Runes" on the rune)', entry.invLink && entry.inv.open && entry.inv.tab === 'hunt' && entry.invDetail, entry);
  ok('entry: Skills window keeps its rune rows + "Manage in Runes" link → Skill tab', entry.skillsRows === 6 && entry.skills.has && entry.skills.open && entry.skills.tab === 'skill', entry.skills);

  // ---------- 2) Skill Runes ----------
  const sk = await p.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms)), pl = G.player, r = {};
    const W = () => document.querySelector('#w-runes');
    pl.combatAt = -99; pl.runes = {};
    Runebook.open('skill'); await wait(50);
    r.rows = [...W().querySelectorAll('.rb-row')].map(x => x.dataset.skill);
    r.lockedRow = W().querySelector('.rb-row[data-skill="shield_slam"]');
    r.locked = !!r.lockedRow && r.lockedRow.classList.contains('locked') && /Skill Lv 4/.test(r.lockedRow.textContent); delete r.lockedRow;
    r.steps = W().querySelectorAll('.rb-steps .rb-step').length;
    r.dot = !!W().querySelector('.rb-tab[data-tab="skill"] .rb-dot'); // ปลดแล้วยังไม่เลือก = จุดแจ้งเตือน
    // ผ่านหน้าต่าง Skills (ทางเดิม)
    UI.skTab = 'einherjar'; UI.open('w-skills'); await wait(30);
    pl.buffs.whirlwind = { until: G.time + 99 };
    document.querySelector('#w-skills .rn-opt[data-rune="whirlwind.vortex"]').click(); await wait(30);
    r.viaSkills = JSON.stringify(pl.runes); r.buffSkills = !pl.buffs.whirlwind;
    UI.close('w-skills');
    pl.runes = {}; recalc();
    // ผ่านหน้าต่าง Runes: เลือกสกิล → แตะการ์ด → Choose
    Runebook.open('skill'); await wait(30);
    W().querySelector('.rb-row[data-skill="whirlwind"]').click(); await wait(30);
    r.cards = [...W().querySelectorAll('.rb-card')].map(c => c.dataset.rune);
    pl.buffs.whirlwind = { until: G.time + 99 };
    W().querySelector('.rb-card[data-rune="whirlwind.vortex"]').click(); await wait(30);
    r.stagedOnly = !pl.runes.whirlwind; // แตะการ์ดยังไม่เปลี่ยน (ต้องกด Choose)
    W().querySelector('.rb-choose').click(); await wait(30);
    r.viaBook = JSON.stringify(pl.runes); r.buffBook = !pl.buffs.whirlwind;
    r.def = skillDef('whirlwind').rune && skillDef('whirlwind').rune.id;
    r.curCard = !!W().querySelector('.rb-card.cur[data-rune="whirlwind.vortex"]') && W().querySelector('.rb-choose').disabled;
    r.rowShows = /Vortex/.test(W().querySelector('.rb-row[data-skill="whirlwind"]').textContent);
    // None = ถอด
    W().querySelector('.rb-card[data-rune=""]').click(); await wait(30);
    W().querySelector('.rb-choose').click(); await wait(30);
    r.none = !('whirlwind' in pl.runes) && skillDef('whirlwind') === SKILLS.whirlwind;
    // สกิลที่ยังล็อก: การ์ดดูได้ แต่ Choose ใช้ไม่ได้ • Runes.set ไม่ถูกเรียก
    W().querySelector('.rb-row[data-skill="shield_slam"]').click(); await wait(30);
    const ch = W().querySelector('.rb-choose');
    W().querySelector('.rb-card[data-rune="' + Runes.list('shield_slam')[0].id + '"]').click(); await wait(30);
    r.lockDetail = ch.disabled && /Skill Lv 4/.test(ch.textContent) && !!W().querySelector('.rb-cards.off') && !!W().querySelector('.rb-goskills') && !pl.runes.shield_slam;
    // ล็อกระหว่างต่อสู้
    W().querySelector('.rb-row[data-skill="whirlwind"]').click(); await wait(30);
    pl.combatAt = G.time; Runebook.render(true);
    W().querySelector('.rb-card[data-rune="whirlwind.bladestorm"]').click(); await wait(30);
    const ch2 = W().querySelector('.rb-choose');
    r.busyBtn = ch2.disabled; ch2.click(); await wait(30);
    r.busyNote = !!W().querySelector('.rb-busy') && /ต่อสู้|combat/i.test(W().querySelector('.rb-busy').textContent);
    r.busyKept = !pl.runes.whirlwind && Runes.set('whirlwind', 'whirlwind.bladestorm') === false;
    pl.combatAt = -99; Runebook.render(true);
    r.afterBusy = !W().querySelector('.rb-choose').disabled;
    r.noKlass = !/คลาส|อาชีพ/.test(W().textContent);
    UI.close('w-runes');
    return r;
  });
  ok('skill tab: lists the Class skills that have runes, steps strip, "to do" dot', sk.rows.length === 6 && sk.rows.includes('whirlwind') && sk.steps === 3 && sk.dot, sk.rows);
  ok('skill tab: locked skill shows "Skill Lv 4"', sk.locked);
  ok('skill tab: None + 2 rune cards; tapping a card only stages it', JSON.stringify(sk.cards) === '["","whirlwind.vortex","whirlwind.bladestorm"]' && sk.stagedOnly, sk.cards);
  ok('skill tab: Choose changes p.runes exactly like the Skills window (incl. buff reset)', sk.viaBook === sk.viaSkills && sk.viaBook === '{"whirlwind":"whirlwind.vortex"}' && sk.buffBook === sk.buffSkills && sk.def === 'whirlwind.vortex', sk);
  ok('skill tab: chosen rune marked Current + shown in the list; None removes it', sk.curCard && sk.rowShows && sk.none, sk);
  ok('skill tab: locked skill — preview only, Choose disabled, "Open Skills" offered', sk.lockDetail);
  ok('skill tab: combat lock — Choose disabled + notice, p.runes unchanged, unlocks after', sk.busyBtn && sk.busyNote && sk.busyKept && sk.afterBusy, sk);
  ok('skill tab: text uses "Class", not คลาส/อาชีพ', sk.noKlass);

  // ---------- 3) Hunt Runes ----------
  const hr = await p.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms)), pl = G.player, HR = HuntRunes, r = {};
    const W = () => document.querySelector('#w-runes');
    pl.combatAt = -99; pl.baseLv = 20; pl.hrunes = [null, null]; pl.hrunesOwn = []; pl.zeny = 1e6;
    HR.buy('hr_exec'); HR.buy('hr_slay_brute');
    const z0 = pl.zeny;
    Runebook.filter = 'all';
    Runebook.open('hunt'); await wait(50);
    r.rows = W().querySelectorAll('.irow[data-hr]').length;
    r.ownedFirst = [...W().querySelectorAll('.irow[data-hr]')].slice(0, 2).map(x => x.dataset.hr).sort().join();
    r.sockets = W().querySelectorAll('.rb-sock').length;
    r.lock2 = W().querySelector('.rb-sock[data-slot="1"]').classList.contains('lock') && /Base Lv 35/.test(W().querySelector('.rb-sock[data-slot="1"]').textContent);
    r.open1 = !W().querySelector('.rb-sock[data-slot="0"]').classList.contains('lock');
    // ใส่ช่อง I
    W().querySelector('.irow[data-hr="hr_exec"]').click(); await wait(30);
    r.english = /Executioner Rune/.test(W().querySelector('.book-r .dname').textContent) && /Conditional/.test(W().querySelector('.book-r').textContent);
    const b1 = W().querySelector('.rb-sock-btn[data-slot="1"]');
    r.slot2Btn = !!b1 && b1.disabled && /Lv 35/.test(b1.textContent);
    W().querySelector('.rb-sock-btn[data-slot="0"]').click(); await wait(30);
    r.socketed = pl.hrunes[0] === 'hr_exec' && /Executioner/.test(W().querySelector('.rb-sock[data-slot="0"]').textContent) && /✓ I/.test(W().querySelector('.irow[data-hr="hr_exec"]').textContent);
    r.active = HR.active().map(d => d.id).join();
    // อีกตัวลงช่องเดียวกัน = แทนที่
    W().querySelector('.irow[data-hr="hr_slay_brute"]').click(); await wait(30);
    W().querySelector('.rb-sock-btn[data-slot="0"]').click(); await wait(30);
    r.replaced = pl.hrunes[0] === 'hr_slay_brute';
    // ปลดช่อง II ที่ Lv 35 → ใส่ได้
    pl.baseLv = 35; Runebook.render(true);
    W().querySelector('.irow[data-hr="hr_exec"]').click(); await wait(30);
    W().querySelector('.rb-sock-btn[data-slot="1"]').click(); await wait(30);
    r.two = JSON.stringify(pl.hrunes);
    // ล็อกระหว่างต่อสู้: ปุ่มใส่/ถอดใช้ไม่ได้ ช่องไม่เปลี่ยน
    pl.combatAt = G.time; Runebook.render(true);
    const rm = W().querySelector('.rb-sock[data-slot="0"] .rb-rm'), sb = W().querySelector('.rb-sock-btn[data-slot="1"]');
    r.busyBtns = rm.disabled && sb.disabled && !!W().querySelector('.rb-busy');
    rm.click(); sb.click(); await wait(30);
    r.busyKept = JSON.stringify(pl.hrunes) === r.two && HR.set(0, null, true) === false;
    pl.combatAt = -99; Runebook.render(true);
    // ถอดจากการ์ดช่อง
    W().querySelector('.rb-sock[data-slot="0"] .rb-rm').click(); await wait(30);
    r.removed = pl.hrunes[0] === null && pl.hrunes[1] === 'hr_exec';
    // Base Lv 10: ทั้งสองช่องล็อก
    pl.baseLv = 10; Runebook.render(true);
    r.allLocked = W().querySelectorAll('.rb-sock.lock').length === 2 && [...W().querySelectorAll('.rb-sock-btn')].every(b => b.disabled) && /Base Lv 15/.test(W().querySelector('.rb-sock[data-slot="0"]').textContent);
    pl.baseLv = 35;
    // ตัวกรอง
    W().querySelector('.rb-filter .pill[data-f="endow"]').click(); await wait(30);
    r.endow = [...W().querySelectorAll('.irow[data-hr]')].every(x => HR.def(x.dataset.hr).kind === 'endow') && W().querySelectorAll('.irow[data-hr]').length === 6;
    W().querySelector('.rb-filter .pill[data-f="all"]').click(); await wait(30);
    // ยังไม่มี: ไม่มีปุ่มซื้อ/ใส่ • ปุ่มไป Brokk (ไกล = นำทาง)
    changeMap('meadow', 28.5, 28.5); await wait(200);
    Runebook.open('hunt', 'hr_giant'); await wait(50);
    const go = W().querySelector('.rb-brokk');
    r.notOwned = !W().querySelector('.rb-sock-btn') && !!go && go.dataset.go === 'nav' && /Brokk/.test(W().querySelector('.det-note').textContent) && !/Forge ·/.test(W().textContent);
    go.click(); await wait(30);
    r.nav = !!Nav.target && Nav.target.npcId === 'refine' && !UI.isOpen('w-runes');
    Nav.cancel(true);
    r.zenyKept = pl.zeny === z0 && !HR.owns('hr_giant');
    // ใกล้ Brokk = เปิดเตาของเขาที่แท็บ Hunt Rune (รูนนี้)
    changeMap(HOME_MAP, 20.5, 24.5); await wait(200);
    const brokk = G.npcs.find(n => n.id === 'refine'); pl.x = brokk.x + 0.5; pl.y = brokk.y + 1.5; pl.path = [];
    Runebook.open('hunt', 'hr_giant'); await wait(50);
    const go2 = W().querySelector('.rb-brokk');
    r.nearBtn = !!go2 && go2.dataset.go === 'forge';
    go2.click(); await wait(50);
    r.forge = UI.isOpen('w-forge') && UI.forge && UI.forge.tab === 'hrune' && UI.forge.hsel === 'hr_giant';
    UI.close('w-forge'); UI.close('w-runes');
    return r;
  });
  ok('hunt tab: every rune listed (owned first), 2 sockets, slot II locked at Base Lv 20', hr.rows === 18 && hr.ownedFirst === 'hr_exec,hr_slay_brute' && hr.sockets === 2 && hr.lock2 && hr.open1 && hr.slot2Btn, hr);
  ok('hunt tab: English rune details; Socket in I puts it in p.hrunes[0] and it is active', hr.english && hr.socketed && hr.active === 'hr_exec', hr);
  ok('hunt tab: socketing another rune into the same slot replaces it; slot II after Base Lv 35', hr.replaced && hr.two === '["hr_slay_brute","hr_exec"]', hr.two);
  ok('hunt tab: Remove on the socket card empties it', hr.removed);
  ok('hunt tab: combat lock — socket/remove disabled + notice, slots unchanged', hr.busyBtns && hr.busyKept, hr);
  ok('hunt tab: Base Lv 10 → both sockets locked ("Base Lv 15")', hr.allLocked);
  ok('hunt tab: Slayer / Endow / Conditional filter', hr.endow);
  ok('hunt tab: not owned → no buy here, "Navigate to Brokk" uses Navi', hr.notOwned && hr.nav && hr.zenyKept, hr);
  ok('hunt tab: next to Brokk → opens his forge on the Hunt Rune tab with that rune', hr.nearBtn && hr.forge, hr);

  // ---------- 4) ข้อความปลดล็อก + Novice ----------
  const misc = await p.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms)), pl = G.player, msgs = [], r = {};
    const m0 = UI.msg; UI.msg = function (t, c) { msgs.push(String(t)); return m0.call(this, t, c); };
    pl.skillPoints = 5; pl.skills.war_cry = 3; learnSkill('war_cry');
    r.learn = msgs.some(t => /Runes \(Shift\+R\)/.test(t) && /Skill Rune/.test(t));
    pl.baseLv = 14; pl.baseExp = 0; gainExp(baseExpNeed(14) + 1, 0); await wait(2100);
    r.level = pl.baseLv === 15 && msgs.some(t => /Runes \(Shift\+R\)/.test(t) && /Hunt Rune/.test(t));
    UI.msg = m0;
    const job = pl.job; pl.job = 'novice';
    Runebook.open('skill'); await wait(50);
    r.novice = !!document.querySelector('#w-runes .book-l .es') && !document.querySelector('#w-runes .rb-row') && /Mimir/.test(document.querySelector('#w-runes').textContent);
    UI.close('w-runes'); pl.job = job;
    r.help = /Shift\+R/.test(document.querySelector('#w-help').innerHTML);
    return r;
  });
  ok('announce: learning a skill to Lv 4 points to "Runes (Shift+R)"', misc.learn);
  ok('announce: Base Lv 15 Hunt Rune socket message points to "Runes (Shift+R)"', misc.level);
  ok('Novice: Skill tab explains Skill Runes come with a Class', misc.novice);
  ok('Help window lists Shift+R Runes', misc.help);

  if (SHOTS) {
    await p.evaluate(() => { const pl = G.player; pl.baseLv = 20; pl.combatAt = -99; pl.runes = { whirlwind: 'whirlwind.bladestorm' }; pl.hrunes = ['hr_slay_brute', null]; Runebook.skSel = 'iron_body'; Runebook.hrSel = 'hr_exec'; });
    for (const t of ['skill', 'hunt']) { await p.evaluate(x => { Runebook.open(x, x === 'skill' ? 'iron_body' : 'hr_exec'); }, t); await p.waitForTimeout(250); await p.screenshot({ path: path.join(SHOTS, `desktop_${t}.png`) }); }
    await p.evaluate(() => UI.close('w-runes'));
  }

  // ---------- 5) มือถือแนวตั้ง: หน้าเดียว รายการ → รายละเอียด → กลับ ----------
  const m = await start(browser, port, { width: 390, height: 844 }, true);
  const mob = await m.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms)), pl = G.player, r = {};
    const W = () => document.querySelector('#w-runes'), vis = el => !!el && el.offsetParent !== null && getComputedStyle(el).display !== 'none';
    pl.runes = { whirlwind: 'whirlwind.bladestorm' }; HuntRunes.buy('hr_slay_brute'); HuntRunes.buy('hr_exec'); HuntRunes.set(0, 'hr_slay_brute', true);
    const fits = () => { const b = W().getBoundingClientRect(); return b.left >= -1 && b.right <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1; };
    // Skill
    UI.open('w-runes'); Runebook.setTab('skill'); await wait(60);
    r.sList = !W().querySelector('.book.det') && vis(W().querySelector('.book-l')) && !vis(W().querySelector('.book-r')) && vis(W().querySelector('.rb-steps')) && fits();
    W().querySelector('.rb-row[data-skill="iron_body"]').click(); await wait(60);
    r.sDet = !!W().querySelector('.book.det') && vis(W().querySelector('.book-r')) && !vis(W().querySelector('.book-l')) && vis(W().querySelector('.book-back')) && !vis(W().querySelector('.rb-steps'))
      && W().querySelectorAll('.rb-card').length === 3 && fits();
    W().querySelector('.rb-card[data-rune="' + Runes.list('iron_body')[1].id + '"]').click(); await wait(30);
    W().querySelector('.rb-choose').click(); await wait(30);
    r.sChose = pl.runes.iron_body === Runes.list('iron_body')[1].id;
    W().querySelector('.book-back').click(); await wait(60);
    r.sBack = !W().querySelector('.book.det') && vis(W().querySelector('.book-l'));
    // Hunt
    W().querySelector('.rb-tab[data-tab="hunt"]').click(); await wait(60);
    r.hList = Runebook.tab === 'hunt' && !W().querySelector('.book.det') && W().querySelectorAll('.irow[data-hr]').length === 18 && fits();
    W().querySelector('.irow[data-hr="hr_exec"]').click(); await wait(60);
    r.hDet = !!W().querySelector('.book.det') && vis(W().querySelector('.rb-socks')) && W().querySelectorAll('.rb-sock-btn').length === 2 && fits();
    W().querySelector('.rb-sock-btn[data-slot="0"]').click(); await wait(30);
    r.hSock = pl.hrunes[0] === 'hr_exec';
    W().querySelector('.book-back').click(); await wait(60);
    r.hBack = !W().querySelector('.book.det');
    // เปิดใหม่ = หน้ารายการเสมอ
    W().querySelector('.irow[data-hr="hr_exec"]').click(); await wait(30); UI.close('w-runes'); UI.open('w-runes'); await wait(40);
    r.reopenList = !W().querySelector('.book.det');
    UI.close('w-runes');
    return r;
  });
  if (SHOTS) {
    for (const t of ['skill', 'hunt']) {
      await m.evaluate(x => { Runebook.open(x); }, t); await m.waitForTimeout(250); await m.screenshot({ path: path.join(SHOTS, `phone_${t}_list.png`) });
      await m.evaluate(x => { Runebook.open(x, x === 'skill' ? 'whirlwind' : 'hr_exec'); }, t); await m.waitForTimeout(250); await m.screenshot({ path: path.join(SHOTS, `phone_${t}_detail.png`) });
    }
  }
  ok('phone: Skill tab list → detail (back button, steps hidden) → Choose → back', mob.sList && mob.sDet && mob.sChose && mob.sBack, mob);
  ok('phone: Hunt tab list → detail (sockets) → Socket → back', mob.hList && mob.hDet && mob.hSock && mob.hBack, mob);
  ok('phone: reopening starts on the list; window fits 390 px', mob.reopenList);
  ok('no page errors', !p._errors.length && !m._errors.length, [...p._errors, ...m._errors].slice(0, 3).join(' | '));

  let fail = 0;
  for (const [n, c, info] of out) { console.log(`${c ? '✔' : '✘'} ${n}${info && !c ? '  ' + info : ''}`); if (!c) fail++; }
  console.log(fail ? `\n${fail} FAILED` : `\nALL ${out.length} PASSED`);
  await browser.close(); srv.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
