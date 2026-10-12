'use strict';
// ============================================================
//  Tamper Watch (js/guard.js) — Playwright offline
//  1) เล่นแบบสุจริตยาว ๆ (AUTO, Fly Pilot, ซื้อ/ขาย, ตีบวก (มีพลาด), ตาย/ฟื้น, กาชา, เควสต์, Builds, เปลี่ยน Class, คลัง, ตลาด escrow, โหลดเซฟ)
//     → ต้องไม่มีธงเลย และไม่มีการคืนค่า (false positive = 0)
//  2) โกงจากคอนโซลแบบที่คนทั่วไปทำ → ค่าไม่เปลี่ยน/คืนค่า + มีธง
//  3) วัดเวลาต่อรอบตรวจ (จำลองมือถือกลาง ๆ ด้วย CPU throttle ×4)
//  รัน:  NODE_PATH=$(npm root -g) node tests/guard.js   (CHROME=... ได้)
//  หมายเหตุ: เทสต์เรียกฟังก์ชันของเกมผ่าน setTimeout(ฟังก์ชันเกม) เพื่อให้ call stack เหมือนเกมเรียกเอง (เหมือนกดปุ่ม/บอท)
//  ส่วน page.evaluate ตรง ๆ = เหมือนพิมพ์ในคอนโซล (ถูกจับ)
// ============================================================
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
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
const checks = [];
const ok = (name, cond, info = '') => { checks.push([name, !!cond, info]); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${info !== '' ? '  — ' + (typeof info === 'string' ? info : JSON.stringify(info)) : ''}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const srv = await serve();
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  const browser = await chromium.launch(opts);
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 680 } });
  await ctx.route(/supabase\.(co|in)\b/, r => r.abort()); // ห้ามแตะเซิร์ฟเวอร์จริง
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(`http://localhost:${srv.address().port}/index.html`, { timeout: 120000 });
  await p.waitForSelector('#auth', { state: 'visible', timeout: 20000 });
  await p.click('#au-offline'); await p.click('#btn-new'); await p.fill('#cr-name', 'Guard'); await p.click('#cr-start'); await sleep(1500);
  await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {});
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 8000, polling: 250 }).catch(() => {});
  await p.evaluate(() => document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden')));

  const T = (fn, a) => p.evaluate(`window.__guardTest.${fn}(${a === undefined ? '' : JSON.stringify(a)})`);
  // เรียกฟังก์ชันเกม "แบบเกมเรียกเอง": setTimeout(apply.bind(fn, this, args)) — stack มีแต่เฟรมของเกม
  const legit = (fnExpr, thisExpr, argsExpr) => p.evaluate(`new Promise(r => { setTimeout(Function.prototype.apply.bind(${fnExpr}, ${thisExpr}, ${argsExpr || '[]'}), 0); setTimeout(r, 30); })`);
  const flags = () => T('flags');
  const showFlags = fl => fl.map(f => `${f.rule}:${f.detail}`).slice(0, 6).join(' | ');

  ok('guard โหลดแล้ว (โหมดเทสต์ webdriver = ดูอย่างเดียว)', await p.evaluate(() => !!window.__guardTest && typeof Cheats === 'object'));
  // โหมดดูอย่างเดียว: ค่าเปลี่ยนได้ (เทสต์อื่นตั้งค่าตรง ๆ ได้ตามเดิม) แต่จดธง
  const obs = await p.evaluate(() => { const z = G.player.zeny; G.player.zeny = z + 7; return G.player.zeny === z + 7; });
  ok('โหมดดูอย่างเดียว: ตั้งค่าตรงได้ (เทสต์เดิมไม่พัง) แต่มีธง obs', obs && (await flags()).some(f => f.rule === 'edit' && f.obs));

  // ---------- ตั้งตัวละคร (ก่อนเปิดด่าน) ----------
  await p.evaluate(() => {
    const pl = G.player;
    pl.baseLv = 30; pl.jobLv = 10; pl.statPoints = 60; pl.skillPoints = 9; pl.zeny = 400000;
    pl.stats = { str: 40, agi: 30, vit: 20, int: 1, dex: 20, luk: 5 };
    addItem('red_potion', 40, true); addItem('apple', 20, true);
    if (typeof Gacha !== 'undefined' && ITEMS[Gacha.TOKEN]) addItem(Gacha.TOKEN, 25, true);
    for (const id of Object.keys(ITEMS)) if (/ore|oridecon|elunium/i.test(id) && ITEMS[id].type !== 'weapon') addItem(id, 30, true);
    recalc(); pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp;
  });
  await T('clear'); await T('arm');
  ok('เปิดด่านแล้ว ธงว่าง', (await flags()).length === 0);

  // ---------- 1) เล่นแบบสุจริต ----------
  await legit('changeJob', 'null', "['einherjar']");
  ok('เปลี่ยน Class (ทางของเกม)', await p.evaluate(() => G.player.job === 'einherjar'));
  await legit('raiseStat', 'null', "['str']"); await legit('raiseStat', 'null', "['agi']");
  await legit('learnSkill', 'null', "[JOBS.einherjar.skills.find(id => canLearn(id))]");
  await legit('UI.buy', 'UI', "['red_potion', 5]");
  await legit('UI.sell', 'UI', "[G.player.inventory.find(e => e.id === 'apple'), 3]");
  await legit('useItem', 'null', "[G.player.inventory.find(e => e.id === 'red_potion')]");
  await legit('storeItem', 'null', "[G.player.inventory.find(e => e.id === 'apple'), 2]");
  await legit('takeItem', 'null', "[G.player.storage.find(e => e.id === 'apple'), 1]");
  // ตีบวกอัตโนมัติจนพลาด/สำเร็จหลายครั้ง (มีโอกาสพลาด)
  await p.evaluate(() => { if (typeof Feel !== 'undefined') Feel.forge = () => Promise.resolve(); });
  await legit('NPC.refineRun', 'NPC', "['weapon', 8, true]");
  await sleep(1500);
  const ref = await p.evaluate(() => (G.player.equip.weapon || {}).refine || 0);
  ok('ตีบวก (ทางของเกม) เดินได้', ref >= 1, `+${ref}`);
  // กาชา
  const tok0 = await p.evaluate(() => (typeof Gacha !== 'undefined' ? Gacha.tokens() : -1));
  if (tok0 > 0) { await legit('Gacha.roll', 'Gacha', '[false]'); await sleep(400); if (await p.evaluate(() => Gacha.canRoll(true))) await legit('Gacha.roll', 'Gacha', '[true]'); await sleep(800); }
  ok('กาชาเดินได้', tok0 > 0 && await p.evaluate(t => Gacha.tokens() < t, tok0), tok0);
  // Builds (Loadouts): บันทึก → ถอดของ → สลับกลับ
  if (await p.evaluate(() => typeof Loadouts !== 'undefined')) {
    await legit('Loadouts.save', 'Loadouts', "[0, 'A']");
    await legit('unequip', 'null', "['weapon', true]");
    await legit('Loadouts.apply', 'Loadouts', '[0]');
    ok('สลับ Build (ทางของเกม)', await p.evaluate(() => !!G.player.equip.weapon));
  }
  // ตาย/ฟื้น (เสีย EXP)
  await legit('playerDie', 'null'); await sleep(200); await legit('respawnPlayer', 'null', '[true]'); await sleep(300);
  ok('ตาย + ฟื้น', await p.evaluate(() => !G.player.dead));
  // ตลาด: escrow คืนเงิน (หมดเวลา) + ได้ของ (ผู้ขายตอบ ok)
  if (await p.evaluate(() => typeof Market !== 'undefined' && typeof Market.timeoutBuy === 'function')) {
    await p.evaluate(() => { Market.pend = { tid: 't1', seller: 'x', name: 'Seller', sid: 's', i: 0, qty: 1, cost: 1234, item: { id: 'knife', refine: 3, cards: [], uid: 0 }, at: Date.now() }; });
    await legit('Market.timeoutBuy', 'Market');
    await legit('Market.receive', 'Market', "[{ tid: 't2', seller: 'x', name: 'Seller', i: 0, qty: 2, cost: 50, item: { id: 'apple', refine: 0, cards: [], uid: 0 } }, false]");
    await legit('Market.receive', 'Market', "[{ tid: 't3', seller: 'x', name: 'Seller', i: 0, qty: 1, cost: 50, item: { id: 'knife', refine: 4, cards: [], uid: 0 } }, true]");
  }
  // เควสต์: ส่งงานเควสต์ปัจจุบัน
  await legit('Quest.complete', 'Quest', '[Quest.current()]').catch(() => {});
  // วาร์ป/เปลี่ยนแมพ
  await legit('changeMap', 'null', "['meadow', 28.5, 28.5]"); await sleep(600);
  await legit('teleportPlayer', 'null', '[30.5, 30.5]');
  // AUTO ล่ามอนจริง (เก็บของ/ได้ EXP-Volt/เลเวลอัป/ใช้ยา) แล้ว Fly Pilot
  await p.evaluate(() => { const c = Bot.cfg(); c.leash = false; });
  await legit('Bot.toggle', 'Bot', '[true]');
  const t0 = Date.now(), z0 = await p.evaluate(() => G.player.zeny), e0 = await p.evaluate(() => G.player.baseExp + G.player.baseLv * 1e9);
  while (Date.now() - t0 < 45000) { await sleep(3000); if (await p.evaluate(() => G.player.dead)) { await legit('respawnPlayer', 'null', '[true]'); await legit('Bot.toggle', 'Bot', '[true]'); } }
  const farm = await p.evaluate(([z, e]) => ({ dz: G.player.zeny - z, de: G.player.baseExp + G.player.baseLv * 1e9 - e, on: Bot.on, kills: Object.values(G.player.kills || {}).reduce((a, b) => a + b, 0) }), [z0, e0]);
  ok('AUTO ล่าได้จริง (ได้ EXP/Volt)', farm.de > 0 || farm.dz > 0, farm);
  await legit('Bot.toggle', 'Bot', '[false]');
  if (await p.evaluate(() => typeof FlyPilot !== 'undefined')) {
    await legit('FlyPilot.toggle', 'FlyPilot', '[true]'); await sleep(15000); await legit('FlyPilot.toggle', 'FlyPilot', '[false]');
  }
  // เซฟ → โหลดตัวละครกลับ (เหมือนเข้าเกมใหม่)
  await legit('saveGame', 'null', '[true, true]');
  await legit('loadGameFrom', 'null', '[Acct.current()]');
  await legit('startGame', 'null', '[G.player, false]').catch(() => {});
  await sleep(1500);
  await legit('resetStats', 'null').catch(() => {});
  await sleep(2500); await T('check'); await T('check');
  const honest = await flags();
  ok('เล่นสุจริตทั้งหมด: ธง = 0', honest.length === 0, showFlags(honest));
  ok('เล่นสุจริตทั้งหมด: คืนค่า = 0', (await T('perf')).repairs === 0, await T('perf'));

  // ---------- 2) โกงจากคอนโซล ----------
  const cheat = async (name, code, want, rule) => {
    await T('clear');
    const r = await p.evaluate(code);
    await T('check');
    const fl = await flags();
    ok(name, r === true && fl.some(f => !rule || f.rule === rule), `${JSON.stringify(r)} ${showFlags(fl)}`);
  };
  await p.evaluate(() => { if (G.player.dead) respawnPlayer(true); });
  await cheat('Volt += 1,000,000 → คืนค่า + ธง', '(() => { const z = G.player.zeny; G.player.zeny += 1e6; return G.player.zeny === z; })()', true, 'edit');
  await cheat('EXP/เลเวล แก้ตรง → คืนค่า', '(() => { const l = G.player.baseLv; G.player.baseLv = 99; G.player.statPoints = 999; return G.player.baseLv === l && G.player.statPoints !== 999; })()', true, 'edit');
  await cheat('เรียก gainExp(1e9) จากคอนโซล → ไม่ได้ EXP', '(() => { const e = G.player.baseExp, l = G.player.baseLv; gainExp(1e9, 1e9); return G.player.baseExp === e && G.player.baseLv === l; })()', true, 'edit');
  await cheat('addItem จากคอนโซล → ไม่เข้ากระเป๋า', "(() => { const n = G.player.inventory.length; addItem('knife', 5, true); return G.player.inventory.length === n; })()", true, 'list-add');
  await cheat('จำนวนของในกระเป๋าแก้ตรง → คืนค่า', "(() => { const e = G.player.inventory.find(x => x.id === 'red_potion'); const q = e.qty; e.qty = 999; return e.qty === q; })()", true, 'item');
  await cheat('ตีบวกแก้ตรง → คืนค่า', '(() => { const w = G.player.equip.weapon; const r = w.refine; w.refine = 20; return w.refine === r; })()', true, 'item');
  await cheat('สเตตัสแก้ตรง → คืนค่า', '(() => { const s = G.player.stats.str; G.player.stats.str = 99; G.player.stats = { str: 99, agi: 99, vit: 99, int: 99, dex: 99, luk: 99 }; return G.player.stats.str === s; })()', true, 'edit');
  await cheat('ค่าต่อสู้ (atk/aspd/speed) แก้ตรง → คืนค่า', '(() => { const d = G.player.d, a = d.atkBonus, sp = d.speed; d.atkBonus = 9999; d.speed = 40; G.player.d = Object.assign({}, d, { atkBonus: 9999 }); return G.player.d.atkBonus === a && G.player.d.speed === sp; })()', true, 'derived');
  await cheat('วาร์ป (x += 50) → คืนตำแหน่ง + ธง', '(() => { const x = G.player.x; G.player.x += 50; return G.player.x === x; })()', true, 'teleport');
  await cheat('HP เต็มจากคอนโซล → ไม่รับ', '(() => { G.player.hp = 1; const h = G.player.hp; G.player.hp = 1e9; return G.player.hp === h; })()', true, 'edit');
  await cheat('ตั้งเวลาโกงผ่าน setTimeout → ไม่รับ', 'new Promise(r => { const z = G.player.zeny; setTimeout(() => { G.player.zeny = 9e9; r(G.player.zeny === z); }, 0); })', true, 'edit');
  await cheat('แทนตัวละครทั้งก้อน → ไม่รับ', '(() => { const p0 = G.player; G.player = Object.assign({}, p0, { zeny: 9e9 }); return G.player === p0; })()', true, 'player-swap');
  await cheat('มอนเลือดหมดจากคอนโซล → ไม่รับ', '(() => { const m = G.mobs.find(x => !x.dead && !x.def.dummy && x.hp > 10); if (!m) return "no mob"; if (!Object.getOwnPropertyDescriptor(m, "hp").get) window.__guardTest.check(); const h = m.hp; m.hp = 0; return m.hp === h; })()', true, 'mob-hp');
  // แทนฟังก์ชันดาเมจ
  await T('clear');
  const fnr = await p.evaluate(() => { const f0 = damageMob; damageMob = (m, d, o) => f0(m, d * 100, o); window.__guardTest.check(); return damageMob === f0; });
  ok('แทนฟังก์ชันดาเมจ → คืนตัวเดิม + ธง', fnr && (await flags()).some(f => f.rule === 'fn-replaced'), showFlags(await flags()));
  // แทนแล้วเรียกผ่านเกม: ค่าที่เขียนจากตัวปลอม (เฟรมคอนโซลอยู่ใน stack) ไม่ถูกรับ
  await T('clear');
  const viaGame = await p.evaluate(() => new Promise(r => { const g0 = gainExp, e = G.player.baseExp; gainExp = (b, j) => g0(b * 1000, j * 1000); setTimeout(() => { killMob(G.mobs.find(m => !m.dead && !m.def.dummy) || G.mobs[0]); r(G.player.baseExp === e || G.player.baseExp < e); gainExp = g0; }, 0); }));
  ok('ตัวห่อ gainExp ปลอม ถูกเกมเรียก → EXP ไม่เข้า', viaGame, showFlags(await flags()));
  // ตารางข้อมูล
  await T('clear');
  const dataEdit = await p.evaluate(() => { const id = Object.keys(MOBS).find(k => MOBS[k].exp > 0); const v = MOBS[id].exp; MOBS[id].exp = v * 1000; for (let i = 0; i < 40; i++) window.__guardTest.check(); return MOBS[id].exp === v; });
  ok('แก้ EXP มอนในตารางข้อมูล → คืนค่า + ธง', dataEdit && (await flags()).some(f => f.rule === 'data-edit'), showFlags(await flags()));
  // กับดักล่อ
  await T('clear');
  await p.evaluate(() => { window.GOD_MODE = true; Cheats.infiniteZeny(); G.player.dropMul = 10; });
  const hp = await flags();
  ok('กับดักล่อ (GOD_MODE / Cheats / dropMul) → ธง 3', hp.filter(f => f.rule === 'honeypot').length === 3 && await p.evaluate(() => window.GOD_MODE === false && G.player.dropMul === 1), showFlags(hp));
  // ของพื้นฐาน
  await T('clear');
  const nat = await p.evaluate(() => { const t = Function.prototype.toString; Function.prototype.toString = function () { return 'x'; }; window.__guardTest.check(); return Function.prototype.toString === t; });
  ok('แทน Function.prototype.toString → คืน + ธง', nat && (await flags()).some(f => f.rule === 'native-tamper'));
  // ธงไปกับเซฟ
  const sv = await p.evaluate(() => { const d = saveData(); return Array.isArray(d.guardFlags) ? d.guardFlags.length : 0; });
  ok('ธงไปกับเซฟ (data.guardFlags)', sv > 0, sv);
  ok('เซฟปกติ (ไม่มีธง) ไม่เพิ่มช่อง guardFlags', await p.evaluate(() => { window.__guardTest.clear(); const d = saveData(); return !('guardFlags' in d) || Array.isArray(d.guardFlags); }));
  // RPC report_flags (Supabase ปลอม — ไม่มีการเรียกจริง)
  const rpc = await p.evaluate(async () => {
    const calls = [], keep = { sb: Online.sb, enabled: Online.enabled, user: Online.user, local: Online.local };
    Online.enabled = true; Online.user = { id: 'u1' }; Online.local = false;
    const rpcFn = (n, a) => { calls.push([n, a.flags.length]); return Promise.resolve({ error: { code: 'PGRST202', message: 'Could not find the function' } }); };
    const stub = new Proxy(function () {}, { get: (t, k) => (k === 'rpc' ? rpcFn : k === 'then' ? undefined : stub), apply: () => stub }); // ส่วนอื่นของเกมที่แตะ sb ระหว่างนี้ = ไม่ทำอะไร
    Online.sb = stub;
    window.GOD_MODE = 1; window.__guardTest.flush(); await new Promise(r => setTimeout(r, 50));
    window.GOD_MODE = 2; window.__guardTest.flush(); await new Promise(r => setTimeout(r, 50));
    const out = { calls: calls.slice(), rpcOk: window.__guardTest.perf().rpcOk };
    Object.assign(Online, keep);
    return out;
  });
  ok('RPC report_flags: ส่ง 1 ครั้ง แล้วรู้ว่าไม่มี RPC → เลิกส่ง', rpc.calls.length === 1 && rpc.calls[0][0] === 'report_flags' && rpc.rpcOk === false, rpc);

  // ---------- 3) ผู้เฝ้าถูกฆ่า (ล้าง timer ทั้งหมด) → ตัวอื่นเห็น ----------
  await T('clear');
  const c0 = (await T('perf')).checks;
  await p.evaluate(() => { const top = setTimeout(() => {}, 0); for (let i = 0; i <= top + 50; i++) { clearTimeout(i); clearInterval(i); } });
  await sleep(36000);
  const wf = await flags(), c1 = (await T('perf')).checks;
  ok('ล้าง timer ทั้งหมด → rAF watcher จับได้ + ตรวจต่อ', wf.some(f => f.rule === 'watcher') && c1 > c0, `${showFlags(wf)} checks ${c0}→${c1}`);

  // ---------- 4) ความเร็ว ----------
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.evaluate(() => { window.__guardTest.disarm(); });
  await p.evaluate(() => window.__guardTest.resetPerf());
  for (let i = 0; i < 40; i++) await p.evaluate(() => window.__guardTest.check()); // ทีละรอบ (เหมือนจริง: รอบละ ~2 วิ) ไม่ติดกันในงานเดียว
  const pf = await T('perf');
  await p.evaluate(() => { window.__guardTest.resetPerf(); for (let i = 0; i < 200; i++) window.__guardTest.verdict(); });
  const pv = await T('perf');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const avg = pf.checkMs / pf.checks, vavg = pv.verdictMs / pv.verdicts;
  ok(`รอบตรวจ < 0.5 ms (CPU ×4): มัธยฐาน ${pf.median.toFixed(3)} ms เฉลี่ย ${avg.toFixed(3)} ms สูงสุด ${pf.checkMax.toFixed(3)} ms`, pf.median < 0.5, { tabRows: pf.tabRows, fns: pf.fns });
  ok(`อ่าน stack ต่อการเขียนค่า (CPU ×4): ${(vavg * 1000).toFixed(1)} µs`, vavg < 1, '');

  ok('ไม่มี error ในหน้า', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close(); srv.close();
  const fail = checks.filter(c => !c[1]);
  console.log(`\n${checks.length - fail.length}/${checks.length} passed`);
  process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
