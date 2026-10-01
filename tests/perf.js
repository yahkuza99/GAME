'use strict';
// ============================================================
//  วัดประสิทธิภาพการเรนเดอร์ (Playwright + CDP)
//  รัน:  NODE_PATH=$(npm root -g) node tests/perf.js [label]
//    PERF_SEC=10         วินาทีที่วัดฉากเล่นจริงต่อแผนที่ (ค่าเริ่มต้น 10)
//    PERF_PORT=8803      พอร์ตเซิร์ฟเวอร์ไฟล์นิ่ง (เปิดเองที่โฟลเดอร์เกมนี้)
//    PERF_OUT=dir        ที่เก็บผล JSON + ภาพฉากคงที่ (ค่าเริ่มต้น: <tmp>/neo-perf)
//    PERF_CMP=label      เทียบภาพฉากคงที่กับผลรอบก่อนชื่อนี้ใน PERF_OUT (pixel diff)
//    PERF_PROFILE=0      ไม่ต้องโปรไฟล์ CPU
//  วัด 3 แบบ:
//   1) live  — เกมออฟไลน์ ป่าหมาป่า/โพรงเฮล + มอนเพิ่ม + บอทล่าเอง: FPS จริง (ช่วงห่าง rAF), เวลา frame()/R.render
//              และเวลา CPU ของเธรดหลักต่อเฟรม (ThreadTime รวมการ raster แคนวาสแบบซอฟต์แวร์)
//              ที่ 1280x720 และ 390x844 (dpr 3 → เกมใช้ 2) + CPU ช้าลง 4 เท่า
//   2) bench — ฉากคงที่ (สุ่มแบบมีเมล็ด เวลาเดินทีละ 1/60) วาด R.render + flush ซ้ำ ๆ แล้ววัด ThreadTime ต่อเฟรม
//              ไม่ขึ้นกับเครื่องที่โหลดหนัก (ค่ามัธยฐานหลายชุด) — 'fight' = มีมอนกะพริบโดนตี + ผู้เล่นโดนตี, 'calm' = ไม่มี
//   3) still — ภาพแคนวาสของฉากคงที่ไว้เทียบก่อน/หลัง (pixel diff)
//  หมายเหตุ: Chromium แบบ headless วาดแคนวาสด้วยซอฟต์แวร์ ตัวเลขจึงเทียบกันเองได้ แต่ไม่ใช่ค่าจริงของมือถือที่มี GPU
// ============================================================
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SEC = +(process.env.PERF_SEC || 10);
const PORT = +(process.env.PERF_PORT || 8803);
const LABEL = process.argv[2] || 'run';
const OUT = process.env.PERF_OUT || path.join(os.tmpdir(), 'neo-perf');
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    });
    srv.once('error', () => srv.listen(0, () => res(srv))); // พอร์ตถูกใช้อยู่ → ใช้พอร์ตว่าง
    srv.listen(PORT, () => res(srv));
  });
}

// Math.random แบบมีเมล็ด: บอท/มอน/อนุภาคทำงานเหมือนกันทุกรอบ ผลเทียบกันได้
const SEED_SCRIPT = `(() => {
  let s = 1234567;
  window.__seed = v => { s = v >>> 0; };
  Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
})();`;

async function startGame(p, url) {
  await p.goto(url); await p.waitForTimeout(1200);
  await p.click('#au-offline'); await p.click('#btn-new');
  await p.fill('#cr-name', 'Perf'); await p.click('#cr-start'); await p.waitForTimeout(1500);
  await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {});
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 8000, polling: 250 }).catch(() => {});
  await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden')));
}

// ตัวละครคลาสสอง เลเวลกลาง ๆ ไปยืนกลางแผนที่ + มอนเพิ่มรอบตัว (ฉากวุ่นวาย)
function setupPlayer(mapId) {
  __seed(42);
  document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden'));
  const pl = G.player, job = 'valkyrie';
  pl.job = job; pl.baseLv = 60; pl.jobLv = 20;
  for (const j of [JOBS[job].parent, job]) for (const id of JOBS[j].skills) if (SKILLS[id] && !SKILLS[id].noLearn) pl.skills[id] = SKILLS[id].max;
  pl.stats = { str: 80, agi: 40, vit: 70, int: 10, dex: 40, luk: 10 };
  R.partMap = null; R.grassWind.map = null; R.shakeT = 0;
  changeMap(mapId, mapId === 'helcave' ? 25.5 : 28.5, mapId === 'helcave' ? 32.5 : 28.5, { quiet: true });
  recalc(); pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp; pl.hurtFlash = 0;
  const ids = G.map.def.spawns.map(s => s[0]);
  let k = 0;
  for (let r = 2; r < 9 && k < 16; r++) for (let a = 0; a < 8 && k < 16; a++) {
    const x = Math.floor(pl.x + Math.cos(a * 0.785 + r) * r), y = Math.floor(pl.y + Math.sin(a * 0.785 + r) * r * 0.8);
    if (G.map.walkable(x, y)) spawnMob(ids[k++ % ids.length], { x, y });
  }
}

async function setupLive(p, mapId) {
  await p.evaluate(`(${setupPlayer})(${JSON.stringify(mapId)})`);
  await p.evaluate(() => {
    window.__immortal = setInterval(() => { G.player.dead = false; G.player.hp = Math.max(G.player.hp, G.player.d.maxHp * 0.6); G.player.sp = G.player.d.maxSp; }, 200);
    Bot.toggle(true); Bot.nextThink = 0;
    document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden'));
  });
  await p.waitForTimeout(2500); // อุ่นเครื่อง (ถอดรหัสภาพ/แคชเฟรม)
}

const metrics = async cdp => { const { metrics: m } = await cdp.send('Performance.getMetrics'); const o = {}; for (const x of m) o[x.name] = x.value; return o; };

async function measureLive(p, cdp, sec) {
  await p.evaluate(() => {
    const P = window.__perf = { render: [], frame: [], raf: [] };
    if (!R.__r0) R.__r0 = R.render;
    R.render = function () { const a = performance.now(); R.__r0(); P.render.push(performance.now() - a); };
    if (!window.__f0) window.__f0 = window.frame;
    window.frame = function (ts) { const a = performance.now(); window.__f0(ts); P.frame.push(performance.now() - a); P.raf.push(ts); };
  });
  const m0 = await metrics(cdp);
  await p.waitForTimeout(sec * 1000);
  const m1 = await metrics(cdp);
  const r = await p.evaluate(() => {
    const P = window.__perf, avg = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
    const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * q))] || 0; };
    const span = (P.raf[P.raf.length - 1] - P.raf[0]) / 1000;
    window.frame = window.__f0; R.render = R.__r0;
    return {
      frames: P.frame.length, fps: +((P.raf.length - 1) / span).toFixed(1),
      render: +avg(P.render).toFixed(2), renderP95: +pct(P.render, 0.95).toFixed(2),
      frame: +avg(P.frame).toFixed(2), frameP95: +pct(P.frame, 0.95).toFixed(2), mobs: G.mobs.length, dpr: R.dpr,
    };
  });
  r.cpuPerFrame = +((m1.ThreadTime - m0.ThreadTime) * 1000 / Math.max(1, r.frames)).toFixed(2);
  r.cpuBusy = +((m1.ThreadTime - m0.ThreadTime) / sec * 100).toFixed(0); // % ของเวลาที่เธรดหลักทำงาน
  return r;
}

// ฉากคงที่: หยุดลูปเกม, มอนรอบตัว (บางตัวไล่ล่า/โดนตี/มึน/ติดไฟ), เอฟเฟกต์ + ตัวเลขดาเมจ
function buildStill([mapId, fight]) {
  window.frame = () => {};
  if (Bot.on) Bot.toggle(false);
  clearInterval(window.__immortal);
  (0, eval)('(' + window.__setupPlayer + ')')(mapId);
  __seed(7);
  const pl = G.player;
  // สถานะผู้เล่นที่ค้างจากบอท (ทิศ ท่าโจมตี บัฟ ฯลฯ) ต้องรีเซ็ต ไม่งั้นภาพนิ่งเทียบกันไม่ได้
  Object.assign(pl, { dir: 3, facing: -1, atkAnim: 0, moving: false, sitting: false, cast: null, skillPose: null, buffs: {}, stunUntil: 0, emote: null, dead: false, stealthUntil: 0 });
  G.allies = []; G.traps = [];
  const near = G.mobs.filter(m => Math.abs(m.x - pl.x) < 10 && Math.abs(m.y - pl.y) < 12);
  near.forEach((m, i) => { m.path = []; if (i % 3 === 0) m.state = 'chase'; if (i % 2) m.hp = m.maxHp * 0.6; m.moving = i % 4 === 1; });
  if (near[2]) near[2].stunUntil = 1e9; if (near[3]) near[3].burnUntil = 1e9;
  if (fight) { if (near[1]) near[1].hitFlash = 1e9; pl.hurtFlash = 1e9; }
  pl.target = near[0] || null; pl.path = []; pl.speech = null;
  G.time = 100; R.lastT = G.time; R.mouse.x = -1; G.hover = null;
  for (const [i, m] of near.slice(0, 6).entries()) {
    addFx({ type: ['hit', 'crit', 'firebolt', 'lightning', 'heal', 'ring'][i], ref: m, x: m.x, y: m.y, dur: 0.5, r: 2 }); G.fx[G.fx.length - 1].t = 0.25;
    addFloater(m.x, m.y, String(100 + i * 37), i % 2 ? '#ffffff' : '#ffe060', i === 1);
    const f = G.floaters[G.floaters.length - 1]; f.t = 0.2; if (i === 1) f.crit = true;
  }
}

async function bench(p, cdp, n = 20, batches = 7) {
  await p.evaluate(() => { const g = R.g; window.__one = () => { G.time += 1 / 60; R.render(); g.getImageData(0, 0, 1, 1); }; for (let i = 0; i < 12; i++) __one(); });
  const thr = [];
  for (let b = 0; b < batches; b++) {
    const a = await metrics(cdp);
    await p.evaluate(n => { for (let i = 0; i < n; i++) __one(); }, n);
    const z = await metrics(cdp);
    thr.push((z.ThreadTime - a.ThreadTime) * 1000 / n);
  }
  thr.sort((x, y) => x - y);
  return { med: +thr[thr.length >> 1].toFixed(2), min: +thr[0].toFixed(2) };
}

async function still(p, file) {
  const data = await p.evaluate(() => { G.time = 100; R.lastT = 100; R.partMap = null; __seed(9); R.grassWind.at = -1; R.render(); R.render(); return R.cv.toDataURL('image/png'); });
  fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
  return data;
}

async function diff(p, a, b) {
  return p.evaluate(async ([a, b]) => {
    const load = src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = src; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return { sizeMismatch: true };
    const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height; const g = c.getContext('2d');
    g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, c.width, c.height).data;
    g.clearRect(0, 0, c.width, c.height); g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, c.width, c.height).data;
    let n = 0, n8 = 0, n32 = 0, max = 0, sum = 0;
    for (let i = 0; i < da.length; i += 4) {
      const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
      sum += d; if (d > 0) n++; if (d > 8) n8++; if (d > 32) n32++; if (d > max) max = d;
    }
    const tot = da.length / 4;
    return { pctAny: +(n / tot * 100).toFixed(3), pctGt8: +(n8 / tot * 100).toFixed(3), pctGt32: +(n32 / tot * 100).toFixed(3), meanDiff: +(sum / tot).toFixed(3), max };
  }, [a, b]);
}

// โปรไฟล์ CPU: รวมเวลา self ต่อฟังก์ชัน ("(program)" = งานนอก JS เช่น raster แคนวาส + เวลาว่าง)
async function profile(cdp, p, sec) {
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await cdp.send('Profiler.start');
  await p.waitForTimeout(sec * 1000);
  const { profile: pr } = await cdp.send('Profiler.stop');
  const byId = new Map(pr.nodes.map(n => [n.id, n]));
  const self = new Map();
  let total = 0;
  for (let i = 0; i < pr.samples.length; i++) {
    const n = byId.get(pr.samples[i]), dt = (pr.timeDeltas[i] || 0) / 1000; total += dt;
    const cf = n.callFrame, key = `${cf.functionName || '(anon)'} ${(cf.url || '').split('/').pop().split('?')[0]}:${cf.lineNumber + 1}`;
    self.set(key, (self.get(key) || 0) + dt);
  }
  return [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k, v]) => ({ fn: k, ms: +v.toFixed(1), pct: +(v / total * 100).toFixed(1) }));
}

(async () => {
  const srv = await serve();
  const url = `http://localhost:${srv.address().port}/index.html`;
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  else if (fs.existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(opts);
  const results = { label: LABEL, live: [], bench: [], profile: null, diffs: {} };
  const scenarios = [
    { name: 'desktop 1280x720', tag: 'desktop', w: 1280, h: 720, dsf: 1, mobile: false, throttle: 1 },
    { name: 'phone 390x844 cpu/4', tag: 'phone', w: 390, h: 844, dsf: 3, mobile: true, throttle: 4, profile: 'wolfwood' },
  ];
  const errors = [];
  for (const sc of scenarios) {
    const ctx = await browser.newContext({ viewport: { width: sc.w, height: sc.h }, deviceScaleFactor: sc.dsf, isMobile: sc.mobile, hasTouch: sc.mobile });
    await ctx.addInitScript(SEED_SCRIPT);
    await ctx.addInitScript(`window.__setupPlayer = ${JSON.stringify(String(setupPlayer))};`);
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(`${sc.name}: ${e.message}`));
    await startGame(p, url);
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Performance.enable');
    // 1) เล่นจริง + บอท
    if (sc.throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: sc.throttle });
    for (const mapId of ['wolfwood', 'helcave']) {
      await setupLive(p, mapId);
      const r = await measureLive(p, cdp, SEC);
      Object.assign(r, { scenario: sc.name, map: mapId });
      results.live.push(r);
      console.log(`live  ${sc.name.padEnd(20)} ${mapId.padEnd(9)} fps ${String(r.fps).padStart(5)}  cpu/frame ${String(r.cpuPerFrame).padStart(6)}ms (busy ${r.cpuBusy}%)  frame() ${r.frame}ms p95 ${r.frameP95}  R.render ${r.render}ms p95 ${r.renderP95}  dpr ${r.dpr}`);
      if (sc.profile === mapId && process.env.PERF_PROFILE !== '0') {
        results.profile = await profile(cdp, p, Math.min(8, SEC));
        console.log('  top self-time (CDP Profiler, live phone wolfwood):');
        for (const f of results.profile) console.log(`   ${String(f.pct).padStart(5)}%  ${String(f.ms).padStart(7)}ms  ${f.fn}`);
      }
      await p.evaluate(() => { Bot.toggle(false); clearInterval(window.__immortal); });
    }
    if (sc.throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    // 2) + 3) ฉากคงที่
    for (const mapId of ['wolfwood', 'helcave']) {
      for (const fight of [true, false]) {
        await p.evaluate(buildStill, [mapId, fight]);
        const r = await bench(p, cdp);
        const kind = fight ? 'fight' : 'calm';
        Object.assign(r, { scenario: sc.name, map: mapId, kind });
        results.bench.push(r);
        console.log(`bench ${sc.name.padEnd(20)} ${mapId.padEnd(9)} ${kind.padEnd(5)} cpu/frame med ${String(r.med).padStart(6)}ms  min ${r.min}ms`);
        if (fight) {
          const tag = `${sc.tag}_${mapId}`;
          const data = await still(p, path.join(OUT, `${LABEL}_${tag}.png`));
          const ref = process.env.PERF_CMP && path.join(OUT, `${process.env.PERF_CMP}_${tag}.png`);
          if (ref && fs.existsSync(ref)) {
            const d = await diff(p, 'data:image/png;base64,' + fs.readFileSync(ref).toString('base64'), data);
            results.diffs[tag] = d;
            console.log(`  still ${tag}: pixel diff vs ${process.env.PERF_CMP}: ${JSON.stringify(d)}`);
          }
        }
      }
    }
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, `${LABEL}.json`), JSON.stringify(results, null, 2));
  console.log(`results → ${path.join(OUT, LABEL + '.json')}`);
  if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'));
  await browser.close(); srv.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
