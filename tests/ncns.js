'use strict';
// ============================================================
//  Smoke test (Playwright): เปิดเกม → เล่นแบบไม่ล็อกอิน → สร้างตัวละคร → ระบบหลักทำงาน ไม่มี error
//  รัน:  NODE_PATH=$(npm root -g) node tests/smoke.js
//  (ใช้ Chromium ของ Playwright; ตั้ง CHROME=/path/to/chrome ได้ถ้าหาเองไม่เจอ)
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

const checks = [];
const ok = (name, cond, info = '') => { checks.push([name, !!cond, info]); };
// /nc (/noctrl) + /ns (/noshift) แบบ RO ดัดแปลง — รัน: NODE_PATH=$(npm root -g) node tests/ncns.js
(async () => {
  const srv = await serve();
  const url = `http://localhost:${srv.address().port}/index.html`;
  const opts = { headless: true };
  if (fs.existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(opts);
  const errors = [];
  const p = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(url); await p.waitForTimeout(1500);
  await p.click('#au-offline'); await p.click('#btn-new'); await p.fill('#cr-name', 'Ncns'); await p.click('#cr-start'); await p.waitForTimeout(1500);
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 8000, polling: 250 }).catch(() => {});
  await p.waitForTimeout(600); await p.click('#w-help .win-x').catch(() => {});
  await p.evaluate(() => { window.updateHover = () => {}; }); // คลิกจำลอง: ใช้ G.hover ที่ตั้งเอง
  ok('default /nc on', await p.evaluate(() => G.player.options.noCtrl !== false));
  ok('/nc toggles off', await p.evaluate(() => { UI.chat('/nc'); return G.player.options.noCtrl === false; }));
  // /nc ปิด: คลิกมอน = ตี 1 ที แล้วเป้าหายไป
  const one = await p.evaluate(async () => {
    const P = G.player, d = G.mobs.find(m => m.def.dummy); P.options.autoCounter = false; P.x = d.x - 1; P.y = d.y; P.path = [];
    G.hover = { kind: 'mob', ref: d }; R.mouse.wx = d.x * TILE; R.mouse.wy = d.y * TILE; handleClick({ ctrlKey: false });
    const n0 = (d.dmgLog || []).length, t0 = G.time, w0 = Date.now();
    while (P.target && G.time - t0 < 6 && Date.now() - w0 < 20000) await new Promise(r => setTimeout(r, 50));
    const n1 = (d.dmgLog || []).length; await new Promise(r => setTimeout(r, 2500));
    return { cleared: !P.target, swings: n1 - n0, after: (d.dmgLog || []).length - n1 };
  });
  ok('/nc off: one swing then stop', one.cleared && one.after === 0, JSON.stringify(one));
  const keep = await p.evaluate(async () => {
    const P = G.player, d = G.mobs.find(m => m.def.dummy);
    G.hover = { kind: 'mob', ref: d }; handleClick({ ctrlKey: true }); await new Promise(r => setTimeout(r, 2500));
    const still = P.target === d; P.target = null; return still;
  });
  ok('/nc off + Ctrl+click: keeps attacking', keep);
  ok('/nc toggles back on', await p.evaluate(() => { UI.chat('/noctrl'); return G.player.options.noCtrl === true; }));
  const cont = await p.evaluate(async () => {
    const P = G.player, d = G.mobs.find(m => m.def.dummy);
    G.hover = { kind: 'mob', ref: d }; handleClick({ ctrlKey: false }); await new Promise(r => setTimeout(r, 2500));
    const still = P.target === d; P.target = null; return still;
  });
  await p.evaluate(() => { G.player.options.autoCounter = true; });
  ok('/nc on: click keeps attacking', cont);
  // /ns: มีเป้า → สกิลยิงทันที ไม่เข้าโหมดเล็ง
  const ns = await p.evaluate(async () => {
    const P = G.player, d = G.mobs.find(m => m.def.dummy);
    P.job = 'einherjar'; P.skills.shield_slam = 3; P.sp = P.maxSp = 999; recalc(); P.sp = 999;
    P.target = null; G.hover = null; useSkill('shield_slam'); const aimNoTarget = G.pendingSkill === 'shield_slam'; G.pendingSkill = null;
    P.target = d; P.skillReadyAt = 0; useSkill('shield_slam'); const aimOff = G.pendingSkill === 'shield_slam'; G.pendingSkill = null;
    UI.chat('/ns'); const on = !!P.options.noShift;
    await new Promise(r => setTimeout(r, 1200));
    P.target = d; P.skillReadyAt = 0; P.skillCd = {}; const sp0 = P.sp; useSkill('shield_slam');
    const fired = G.pendingSkill !== 'shield_slam' && (P.sp < sp0 || !!P.cast || !!P.skillIntent);
    UI.chat('/ns'); return { aimNoTarget, aimOff, on, fired, off: !P.options.noShift };
  });
  ok('/ns off: skill enters aim mode', ns.aimNoTarget && ns.aimOff, JSON.stringify(ns));
  ok('/ns on: skill fires at current target', ns.on && ns.fired, JSON.stringify(ns));
  ok('/ns toggles back off', ns.off);
  ok('options window shows /nc /ns', await p.evaluate(() => { UI.open('w-options'); const t = document.querySelector('#w-options').textContent; return t.includes('/nc') && t.includes('/ns'); }));
  ok('no page errors', !errors.length, errors.join(' | '));
  await browser.close(); srv.close();
  const bad = checks.filter(c => !c[1]);
  for (const [n, g, i] of checks) console.log(`${g ? '✓' : '✗'} ${n}${i ? '  — ' + i : ''}`);
  console.log(bad.length ? `${bad.length} FAILED` : `ALL ${checks.length} PASSED`);
  process.exit(bad.length ? 1 : 0);
})();
