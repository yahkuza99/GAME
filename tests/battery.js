'use strict';
// ============================================================
//  โหมดประหยัดแบต (js/battery.js) — Playwright 390x844 dpr 3
//  รัน: CHROME=/path/to/chrome NODE_PATH=$(npm root -g) node tests/battery.js
//    BAT_MEASURE=30   วัด ก่อน/หลัง ฉาก AUTO ล่ามอน N วินาที (frames/วิ, เธรดหลักทำงานกี่ ms ต่อวินาที) แล้วพิมพ์ตาราง
// ============================================================
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
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
const MEASURE = +(process.env.BAT_MEASURE || 0);

(async () => {
  const srv = await serve();
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  const browser = await chromium.launch(opts);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => { navigator.getBattery = () => Promise.resolve({ level: 0.1, charging: false }); }); // แบตต่ำ (ทดสอบชวนเปิด)
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p); await cdp.send('Performance.enable');
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.route('https://**/*', r => r.abort());
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`, { timeout: 120000 });
  await p.waitForSelector('#auth', { state: 'visible', timeout: 30000 });
  await p.click('#au-offline'); await p.click('#btn-new');
  await p.fill('#cr-name', 'BatT'); await p.click('#cr-start');
  await p.waitForFunction(() => G.started, null, { timeout: 30000 });
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 10000, polling: 250 }).catch(() => {});
  await p.waitForTimeout(800);
  await p.evaluate(() => document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden')));

  // ---- นับเฟรมที่ frame() ทำงานจริง ----
  await p.evaluate(() => { window.__fc = 0; const f0 = window.frame; window.frame = function (ts) { window.__fc++; return f0(ts); }; });
  const fps = async ms => { const a = await p.evaluate(() => window.__fc); await p.waitForTimeout(ms); const b = await p.evaluate(() => window.__fc); return (b - a) / (ms / 1000); };
  const metrics = async () => { const { metrics: m } = await cdp.send('Performance.getMetrics'); const o = {}; for (const x of m) o[x.name] = x.value; return o; };

  // ---- ชวนเปิดตอนแบตต่ำ: ครั้งเดียวต่อเซสชัน ----
  await p.waitForTimeout(500);
  ok('low-battery suggest toast shown once at start', await p.evaluate(() => document.querySelectorAll('#bat-toast').length) === 1);
  const bh = await p.$$eval('#bat-toast button', bs => bs.map(b => Math.round(b.getBoundingClientRect().height)));
  ok('toast buttons >= 40px', bh.length === 2 && bh.every(x => x >= 40), bh.join(','));
  ok('toast radius <= 8px, text >= 13px', await p.evaluate(() => { const t = document.getElementById('bat-toast'), b = t.querySelector('button'); return parseFloat(getComputedStyle(t).borderRadius) <= 8 && parseFloat(getComputedStyle(b).borderRadius) <= 8 && parseFloat(getComputedStyle(t).fontSize) >= 13 && parseFloat(getComputedStyle(b).fontSize) >= 13; }));
  await p.click('#bat-toast .bat-no');
  await p.evaluate(() => Battery.suggest());
  await p.waitForTimeout(300);
  ok('not suggested again this session', await p.evaluate(() => document.querySelectorAll('#bat-toast').length) === 0);
  ok('saver still off after "not now"', await p.evaluate(() => !G.player.options.saver && !Battery.on()));

  // ปลดล็อก AUTO (Class แรก) เหมือน tests/perf.js
  await p.evaluate(() => { const pl = G.player, job = 'valkyrie'; pl.job = job; pl.baseLv = 40; pl.jobLv = 20; for (const j of [JOBS[job].parent, job]) for (const id of JOBS[j].skills) if (SKILLS[id] && !SKILLS[id].noLearn) pl.skills[id] = SKILLS[id].max; recalc(); pl.hp = pl.d.maxHp; });
  ok('AUTO can be enabled', await p.evaluate(() => { Bot.toggle(true); const r = Bot.on; Bot.toggle(false); return r; }));
  // ---- baseline (ปิด) ----
  const off = await fps(3000);
  ok('saver off: no cap applied', await p.evaluate(() => Battery.fps() === 0 && Battery.n > 0), 'measured ' + off.toFixed(1) + ' fps (software canvas)');
  ok('saver off: dpr 2 (cap) / quality high', await p.evaluate(() => R.dpr === 2 && R.quality === 'high'));

  // ---- เปิดจากหน้า Settings ----
  await p.evaluate(() => UI.open('w-options')); await p.waitForTimeout(400);
  ok('Settings has battery saver checkbox', !!(await p.$('#opt-saver')));
  await p.evaluate(() => document.getElementById('opt-saver').click()); await p.waitForTimeout(500);
  ok('toggle sets options.saver', await p.evaluate(() => G.player.options.saver === true));
  await p.evaluate(() => saveGame(true, true));
  ok('persisted in saved character', await p.evaluate(() => Object.keys(localStorage).some(k => /"saver":true/.test(localStorage.getItem(k) || ''))));
  ok('checkbox stays checked after re-render', await p.evaluate(() => document.getElementById('opt-saver').checked));
  await p.evaluate(() => document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden')));

  // ---- DPR 1 + กราฟิกต่ำ ----
  ok('dpr forced to 1 (device dpr 3)', await p.evaluate(() => R.dpr === 1 && R.cv.width === Math.floor(R.W)), await p.evaluate(() => `dpr ${R.dpr} cv ${R.cv.width}x${R.cv.height}`));
  ok('low quality applied (R.quality + body.fx-low)', await p.evaluate(() => R.quality === 'low' && document.body.classList.contains('fx-low')));
  ok('user gfx choice untouched (still high)', await p.evaluate(() => (G.player.options.gfx || 'high') === 'high'));
  ok('GPU glow released', await p.evaluate(() => !GpuFX.active));

  // ---- 30 fps (มีการแตะล่าสุด) ----
  await p.evaluate(() => Battery.poke());
  const on30 = await fps(3000);
  ok('capped near 30 fps with input', on30 >= 22 && on30 <= 33, on30.toFixed(1));

  // ---- AUTO + ไม่แตะ 10 วิ → 15 fps แล้วแตะ → 30 ----
  await p.evaluate(() => { Bot.toggle(true); Battery.lastInput = performance.now() - 11000; });
  await p.waitForTimeout(500);
  const idle = await fps(4000);
  ok('AUTO idle > 10 s: ~15 fps', idle >= 10 && idle <= 17.5, idle.toFixed(1));
  await p.touchscreen.tap(195, 300); await p.waitForTimeout(300);
  const back = await fps(3000);
  ok('input resumes ~30 fps', back >= 22 && back <= 33, back.toFixed(1));
  await p.evaluate(() => Bot.toggle(false));
  // AUTO ปิด + ไม่แตะ → ยังคง 30 (ลด 15 เฉพาะตอน AUTO / Fly)
  await p.evaluate(() => { Battery.lastInput = performance.now() - 20000; });
  const idleNoAuto = await fps(3000);
  ok('idle without AUTO stays 30 fps', idleNoAuto >= 22, idleNoAuto.toFixed(1));

  // ---- แท็บซ่อน: ไม่วาด แต่จำลองต่อ ----
  const sim = await p.evaluate(async () => {
    Bot.toggle(true); Battery.poke();
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    const f0 = window.__fc, t0 = G.time;
    await new Promise(r => setTimeout(r, 2500));
    const r = { frames: window.__fc - f0, dt: G.time - t0 };
    delete document.hidden; // คืนค่าเดิม (getter ของ prototype)
    return r;
  });
  ok('hidden tab: no frames rendered', sim.frames === 0, sim.frames);
  ok('hidden tab: simulation still advances (AUTO keeps running)', sim.dt > 1.5, sim.dt.toFixed(2));
  await p.waitForTimeout(500);
  ok('visible again: rendering resumes', (await fps(1500)) > 10);
  await p.evaluate(() => Bot.toggle(false));

  // ---- ปุ่มลัดในเมนูมือถือ ----
  ok('phone menu tile exists', await p.evaluate(() => !!document.querySelector('#menubar [data-hc="saver"]')));
  await p.evaluate(() => document.querySelector('#menubar [data-hc="saver"]').click()); await p.waitForTimeout(300);
  ok('menu tile toggles OFF', await p.evaluate(() => !G.player.options.saver && R.quality === 'high' && R.dpr === 2));
  await p.evaluate(() => document.querySelector('#menubar [data-hc="saver"]').click()); await p.waitForTimeout(300);
  ok('menu tile toggles ON', await p.evaluate(() => G.player.options.saver === true && R.quality === 'low'));
  const tb = await p.evaluate(() => { const b = document.querySelector('#menubar [data-hc="saver"]'); return { br: parseFloat(getComputedStyle(b).borderRadius), ls: getComputedStyle(b).letterSpacing }; });
  ok('menu tile radius <= 8px, no letter-spacing', tb.br <= 8 && (tb.ls === 'normal' || parseFloat(tb.ls) === 0), JSON.stringify(tb));

  // ---- วัดก่อน/หลัง (ตัวเลือก) ----
  if (MEASURE) {
    await p.evaluate(() => {
      document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden'));
      const pl = G.player; pl.hp = pl.d.maxHp;
      changeMap('wolfwood', 28.5, 28.5, { quiet: true });
      const ids = (G.map.def.spawns || []).map(s => s[0]); let k = 0;
      for (let r = 2; r < 9 && k < 16; r++) for (let a = 0; a < 8 && k < 16; a++) {
        const x = Math.floor(pl.x + Math.cos(a * 0.785 + r) * r), y = Math.floor(pl.y + Math.sin(a * 0.785 + r) * r * 0.8);
        if (G.map.walkable(x, y)) spawnMob(ids[k++ % ids.length], { x, y });
      }
      window.__imm = setInterval(() => { G.player.dead = false; G.player.hp = Math.max(G.player.hp, G.player.d.maxHp * 0.6); G.player.sp = G.player.d.maxSp; }, 200);
      Bot.toggle(true);
    });
    const run = async (label, setup) => {
      await p.evaluate(setup); await p.waitForTimeout(3000);
      const f0 = await p.evaluate(() => window.__fc), m0 = await metrics(), t0 = Date.now();
      await p.waitForTimeout(MEASURE * 1000);
      const m1 = await metrics(), f1 = await p.evaluate(() => window.__fc), s = (Date.now() - t0) / 1000;
      const r = { label, fps: +((f1 - f0) / s).toFixed(1), busyMsPerSec: +((m1.ThreadTime - m0.ThreadTime) * 1000 / s).toFixed(0), scriptMsPerSec: +((m1.ScriptDuration - m0.ScriptDuration) * 1000 / s).toFixed(0), taskMsPerSec: +((m1.TaskDuration - m0.TaskDuration) * 1000 / s).toFixed(0), dpr: await p.evaluate(() => R.dpr) };
      console.log('MEASURE', JSON.stringify(r)); return r;
    };
    await run('saver OFF (AUTO hunting)', () => { Battery.set(false); Battery.poke(); });
    await run('saver ON, touching', () => { Battery.set(true); Battery.poke(); window.__poke = setInterval(() => Battery.poke(), 3000); });
    await run('saver ON, AUTO idle >10s', () => { clearInterval(window.__poke); Battery.lastInput = performance.now() - 11000; });
  }

  ok('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  for (const [n, c, i] of checks) console.log(`${c ? 'PASS' : 'FAIL'} ${n}${i !== '' ? ' — ' + i : ''}`);
  const fails = checks.filter(c => !c[1]).length;
  console.log(fails ? `FAILED ${fails}/${checks.length}` : `ALL ${checks.length} PASSED`);
  process.exitCode = fails ? 1 : 0;
  await browser.close(); srv.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
