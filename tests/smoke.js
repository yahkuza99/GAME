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

(async () => {
  const srv = await serve();
  const url = `http://localhost:${srv.address().port}/index.html`;
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  else if (fs.existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium';
  let browser;
  try { browser = await chromium.launch(opts); } catch (e) { browser = await chromium.launch({ headless: true }); }
  const errors = [];
  for (const [w, h, name, mobile] of [[1280, 720, 'desktop', false], [390, 844, 'phone', true]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(`${name}: ${e.message}`));
    await p.goto(url); await p.waitForTimeout(1500);
    ok(`${name}: login card on entry`, await p.isVisible('#auth'));
    await p.click('#au-offline'); await p.click('#btn-new');
    await p.fill('#cr-name', 'Smoke'); await p.click('#cr-start'); await p.waitForTimeout(1500);
    await p.click('#w-help .win-x').catch(() => {});
    ok(`${name}: game started`, await p.evaluate(() => G.started && G.map.id === HOME_MAP));
    ok(`${name}: art loaded`, await p.evaluate(() => Object.keys(Art.imgs).length > 100), await p.evaluate(() => Object.keys(Art.imgs).length));
    ok(`${name}: novice_f animated`, await p.evaluate(() => Anim.has('novice_f')));
    ok(`${name}: quest tracker`, await p.evaluate(() => Quest.current() && Quest.current().id === 'welcome' && !document.querySelector('#quest-track').hidden));
    // training dummy: attack it for a while
    const hits = await p.evaluate(async () => {
      const d = G.mobs.find(m => m.def.dummy); G.player.target = d;
      await new Promise(r => setTimeout(r, 4000));
      return (d.dmgLog || []).length;
    });
    ok(`${name}: attack dummy`, hits > 0, `${hits} hits`);
    // walk to the field
    await p.evaluate(() => changeMap('meadow', 28.5, 28.5)); await p.waitForTimeout(800);
    ok(`${name}: field has monsters`, await p.evaluate(() => G.mobs.length > 20));
    const moved = await p.evaluate(async () => {
      const pl = G.player, x0 = pl.x; pl.path = findPath(G.map, Math.floor(pl.x), Math.floor(pl.y), Math.floor(pl.x) + 5, Math.floor(pl.y), 2000);
      await new Promise(r => setTimeout(r, 1500)); return pl.x - x0;
    });
    ok(`${name}: walking`, moved > 1, moved.toFixed(2));
    // windows open without errors
    for (const wnd of ['w-status', 'w-inv', 'w-equip', 'w-skills', 'w-tree', 'w-quest', 'w-nav', 'w-emote', 'w-options']) {
      await p.evaluate(id => UI.open(id), wnd); await p.waitForTimeout(80);
      ok(`${name}: open ${wnd}`, await p.evaluate(id => UI.isOpen(id) && document.querySelector('#' + id + ' .win-body').childElementCount > 0, wnd));
      await p.evaluate(id => UI.close(id), wnd);
    }
    // zeny on kill
    const zg = await p.evaluate(() => { const pl = G.player, z0 = pl.zeny, m = spawnMob('pudding', { x: pl.x + 1, y: pl.y }); killMob(m); return pl.zeny - z0; });
    ok(`${name}: zeny on kill`, zg >= 3 && zg <= 6, zg);
    // every job: change job, learn and use each active skill on a monster, no errors
    const jobs = await p.evaluate(async () => {
      const out = [];
      for (const job of Object.keys(JOBS).filter(j => j !== 'novice')) {
        const pl = G.player; pl.dead = false; changeJob(job); pl.skillPoints = 30; pl.baseLv = Math.max(pl.baseLv, 20); recalc();
        let used = 0;
        for (const id of JOBS[job].skills) {
          const sk = SKILLS[id]; if (!sk || sk.noLearn) continue;
          while (canLearn(id)) learnSkill(id);
          if (sk.type !== 'active') continue;
          const m = spawnMob('pudding', { x: pl.x + 1, y: pl.y }); m.hp = m.maxHp = 1e6;
          pl.sp = pl.d.maxSp; pl.hp = pl.d.maxHp; pl.cast = null; pl.skillReadyAt = 0;
          if (sk.bow && weaponType() !== 'bow') continue;
          executeSkill(id, skillLv(id), sk.target === 'enemy' || sk.dmg ? m : null); used++;
          m.dead = true; G.mobs = G.mobs.filter(x => x !== m);
        }
        out.push(job + ':' + used);
      }
      await new Promise(r => setTimeout(r, 600));
      return out.join(' ');
    });
    ok(`${name}: job change + skills`, !/:0/.test(jobs), jobs);
    // chip at 50 kills (no random card drops)
    const ch = await p.evaluate(() => { const pl = G.player, has = () => countItem('pudding_card');
      const noDrop = Object.values(MOBS).every(m => !m.drops.some(([id]) => ITEMS[id].type === 'card'));
      pl.kills.pudding = 48; pl.chips = []; killMob(spawnMob('pudding', { x: pl.x + 2, y: pl.y })); const before = has();
      killMob(spawnMob('pudding', { x: pl.x + 2, y: pl.y })); return { noDrop, before, after: has() }; });
    ok(`${name}: chip at 50 kills`, ch.noDrop && ch.after === ch.before + 1, JSON.stringify(ch));
    // daily bounty: 3 jobs, kills count, claim pays
    const bt = await p.evaluate(() => { const pl = G.player; pl.baseLv = Math.max(pl.baseLv, 12); pl.bounty = null; const s = Bounty.state(), b0 = s.list[0], z0 = pl.zeny;
      for (let i = 0; i < b0.n; i++) killMob(spawnMob(b0.mob, { x: pl.x + 2, y: pl.y })); const kz = pl.zeny - z0; Bounty.claim(b0);
      return { n: s.list.length, claimed: b0.claimed, paid: pl.zeny - z0 - kz === b0.zeny }; });
    ok(`${name}: daily bounty`, bt.n === 3 && bt.claimed && bt.paid, JSON.stringify(bt));
    // passive tree: allocate a path, stats change, cannot skip ahead
    const pt = await p.evaluate(() => {
      const pl = G.player; pl.baseLv = 10; recalc(); const s0 = pl.d.str;
      const jump = Passive.alloc(pl, '1e'); ['1a', '1b', '1c', '1e'].forEach(id => Passive.alloc(pl, id));
      return { jump, n: pl.passives.length, gain: pl.d.str - s0, free: Passive.free(pl) };
    });
    ok(`${name}: passive tree`, !pt.jump && pt.n === 4 && pt.gain === 14 && pt.free === 5, JSON.stringify(pt));
    // save/continue
    await p.evaluate(() => saveGame(true, true)); await p.reload(); await p.waitForTimeout(1500);
    await p.click('#au-offline'); await p.click('#btn-continue'); await p.waitForTimeout(1200);
    ok(`${name}: continue save`, await p.evaluate(() => G.started && G.player.name === 'Smoke' && G.player.passives.length === 4));
    await ctx.close();
  }
  await browser.close(); srv.close();
  for (const e of errors) ok('page error', false, e);
  let fail = 0;
  for (const [n, pass, info] of checks) { if (!pass) fail++; console.log(`${pass ? '✔' : '✘'} ${n}${info !== '' ? `  (${info})` : ''}`); }
  console.log(fail ? `\n${fail} FAILED` : `\nALL ${checks.length} PASSED`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
