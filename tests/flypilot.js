'use strict';
// ============================================================
//  Fly Pilot (js/flypilot.js): เปิดโหมดแมลงวันแล้วต้อง เดิน · ตี · ใช้สกิล · ดื่มยา ได้เองภายในเวลาเกมที่กำหนด
//  ตัวละครออฟไลน์ · ตัดทุกคำขอ https · นับคำขอออกนอกเครื่องหลังเปิดโหมด (ต้อง 0) · ตำแหน่งผู้เล่นห้ามถูกเขียนจากโค้ดแมลงวันตรง ๆ
//  รัน: CHROME=/path/to/chrome NODE_PATH=$(npm root -g) node tests/flypilot.js
// ============================================================
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png' };
const serve = () => new Promise(res => {
  const srv = http.createServer((req, rsp) => {
    const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
    rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(rsp);
  }).listen(0, '127.0.0.1', () => res(srv));
});
const checks = [];
const ok = (name, cond, info = '') => checks.push([name, !!cond, info]);

(async () => {
  const srv = await serve();
  const opts = { headless: true, args: ['--flybrain-run'] };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  const browser = await chromium.launch(opts);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage();
  const errors = [], external = [];
  let flyOn = false;
  p.on('pageerror', e => errors.push(e.message));
  p.on('request', r => { const u = r.url(); if (/^(https?|wss?):/.test(u) && !/^(http|ws):\/\/(127\.0\.0\.1|localhost)/.test(u) && flyOn) external.push(u.slice(0, 80)); });
  await p.route('https://**/*', r => r.abort());
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`, { timeout: 120000 });
  await p.waitForSelector('#auth', { state: 'visible', timeout: 30000 });
  await p.click('#au-offline'); await p.click('#btn-new');
  await p.fill('#cr-name', 'FlyT'); await p.click('#cr-start');
  await p.waitForFunction(() => G.started, null, { timeout: 30000 });
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 10000, polling: 250 }).catch(() => {});
  await p.click('#w-help .win-x').catch(() => {});
  await p.waitForTimeout(800);

  ok('tables loaded', await p.evaluate(() => !!(window.FLY_TABLES && FLY_TABLES.steer && FLY_TABLES.loom && FLY_TABLES.taste)));
  ok('button visible next to AUTO', await p.evaluate(() => { const b = document.getElementById('fly-btn'), a = document.getElementById('auto-btn'); if (!b || b.hidden) return false; const r = b.getBoundingClientRect(), q = a.getBoundingClientRect(); return r.width > 0 && Math.abs((r.left + r.width / 2) - (q.left + q.width / 2)) < 40 && r.bottom <= q.top + 1; }));
  ok('button: square corners <= 8px', await p.evaluate(() => parseFloat(getComputedStyle(document.getElementById('fly-btn')).borderTopLeftRadius) <= 8));
  ok('Thai tooltip mentions recorded copy + FlyWire 138,639', await p.evaluate(() => { const t = document.getElementById('fly-btn').title; return /FlyWire 138,639/.test(t) && /(สำเนา|recorded copy)/.test(t); }));
  // Novice: locked like AUTO
  await p.click('#fly-btn');
  ok('locked before first class (like AUTO)', await p.evaluate(() => !FlyPilot.on && document.getElementById('fly-btn').classList.contains('locked')));

  // setup (same as the flybrain runs): first class, field map, low HP so the feeding circuit has something to do
  await p.evaluate(() => { changeJob('einherjar'); UI.dlgClose && UI.dlgClose(); changeMap('meadow'); });
  await p.waitForTimeout(1200);
  await p.evaluate(() => {
    const pl = G.player;
    pl.options.sound = false;
    pl.skillPoints = Math.max(pl.skillPoints, 1); learnSkill('shield_slam'); // a player's first skill point (Fly mode never spends points)
    // instrumentation: x/y written while the Fly code runs (outside item use / the game's own update) = violation
    window.__fly = { viol: 0, inThink: 0, allow: 0, moved: 0, attacks: 0, casts: 0, pots: 0, sits: 0, swingMoves: 0, path0: null };
    const T = window.__fly;
    for (const k of ['x', 'y']) {
      let v = pl[k];
      Object.defineProperty(pl, k, { configurable: true, enumerable: true, get() { return v; }, set(n) { if (n !== v && T.inThink && !T.allow) T.viol++; v = n; } });
    }
    const th = FlyPilot.think.bind(FlyPilot); FlyPilot.think = function () { T.inThink++; try { return th(); } finally { T.inThink--; } };
    const ui = useItem; useItem = function (e) { const id = e && e.id, q0 = id ? countItem(id) : 0; T.allow++; try { return ui.apply(this, arguments); } finally { T.allow--; if (id && HP_POTS.concat(SP_POTS).includes(id) && countItem(id) < q0) T.pots++; } };
    const pa = playerAttack; playerAttack = function () { T.attacks++; return pa.apply(this, arguments); };
    const ex = executeSkill; executeSkill = function (id) { const rd = G.player.skillReadyAt, r = ex.apply(this, arguments); if (G.player.skillReadyAt !== rd) T.casts++; return r; };
  });
  flyOn = true;
  await p.click('#fly-btn');
  ok('toggle on (button click)', await p.evaluate(() => FlyPilot.on && document.getElementById('fly-btn').classList.contains('on')));
  ok('AUTO stays off', await p.evaluate(() => !Bot.on));

  // play: drive the game clock (0.05 s steps) up to 300 game-seconds, stop early once everything was seen
  const r = await p.evaluate(async () => {
    const T = window.__fly, pl = G.player, t0 = G.time;
    let lx = pl.x, ly = pl.y, hpDropped = false;
    while (G.time - t0 < 300) {
      for (let i = 0; i < 20; i++) {
        const ax = pl.x, ay = pl.y, swing = pl.atkAnim > 0.05;
        updateGame(0.05);
        if (swing && Math.hypot(pl.x - ax, pl.y - ay) > 0.001) T.swingMoves++;
        if (pl.sitting && !T.wasSit) T.sits++;
        T.wasSit = pl.sitting;
        if (pl.dead) respawnPlayer(true);
        if (!FlyPilot.on && !pl.dead) FlyPilot.toggle(true);
      }
      T.moved += Math.hypot(pl.x - lx, pl.y - ly); lx = pl.x; ly = pl.y;
      // feeding test: once a mob is chasing us, drop HP to 30% (hunger in a fight -> MN9 -> drink)
      if (!hpDropped && !T.pots && FlyPilot.threats(6).length) { hpDropped = true; T.allow++; pl.hp = Math.round(pl.d.maxHp * 0.3); T.allow--; }
      if (T.moved > 5 && T.attacks && T.casts && T.pots) break;
      await new Promise(r => setTimeout(r, 0));
    }
    return { gameSec: +(G.time - t0).toFixed(1), moved: +T.moved.toFixed(1), attacks: T.attacks, casts: T.casts, pots: T.pots, sits: T.sits, viol: T.viol, swingMoves: T.swingMoves, last: FlyPilot.last };
  });
  console.log('play', JSON.stringify(r));
  ok('walks on its own', r.moved > 5, r.moved + ' tiles');
  ok('attacks', r.attacks > 0, r.attacks);
  ok('casts a skill', r.casts > 0, r.casts);
  ok('drinks a potion', r.pots > 0, r.pots);
  ok('no x/y writes from Fly code', r.viol === 0, r.viol);
  ok('swing lock respected (no movement while swinging)', r.swingMoves === 0, r.swingMoves);
  ok('overlay shows numbers', await p.evaluate(() => { const o = document.getElementById('fly-ov'); return !o.hidden && /GF \d+ Hz/.test(o.textContent) && /MN9 \d+ Hz/.test(o.textContent); }));
  ok('overlay toggle (right-click) hides it', await p.evaluate(async () => { document.getElementById('fly-btn').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })); FlyPilot.drawOv(); const h = document.getElementById('fly-ov').hidden; FlyPilot.setOv(true); return h; }));
  ok('AUTO on turns Fly off', await p.evaluate(() => { Bot.toggle(true); const a = !FlyPilot.on && Bot.on; Bot.toggle(false); return a; }));
  ok('no external requests after Fly on', external.length === 0, external.join(' '));
  ok('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  for (const [n, c, i] of checks) console.log(`${c ? 'PASS' : 'FAIL'} ${n}${i !== '' ? ' — ' + i : ''}`);
  const fails = checks.filter(c => !c[1]).length;
  console.log(fails ? `FAILED ${fails}/${checks.length}` : `ALL ${checks.length} PASSED`);
  process.exitCode = fails ? 1 : 0;
  await browser.close(); srv.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
