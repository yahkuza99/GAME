'use strict';
// ============================================================
//  ทดสอบ: มอนทุกตัวดรอป Valhalla Sigil (โอกาสน้อย ลดตามเลเวลห่าง) — js/gacha.js GACHA_CONFIG.mobDrop
//  รัน:  CHROME=... NODE_PATH=$(npm root -g) node tests/sigildrop.js   (หรือตั้ง BASE=http://localhost:พอร์ต/index.html)
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
const ok = (name, cond, info = '') => checks.push([name, !!cond, info]);

(async () => {
  let srv = null, url = process.env.BASE;
  if (!url) { srv = await serve(); url = `http://localhost:${srv.address().port}/index.html`; }
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  const browser = await chromium.launch(opts);
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(url); await p.waitForTimeout(1200);
  await p.click('#au-offline'); await p.click('#btn-new');
  await p.fill('#cr-name', 'Sigil'); await p.click('#cr-start'); await p.waitForTimeout(1500);
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 8000, polling: 250 }).catch(() => {});
  await p.waitForTimeout(500);

  const r = await p.evaluate(() => {
    const out = {}, C = GACHA_CONFIG.mobDrop, pl = G.player;
    const normal = Object.values(MOBS).find(m => !m.dummy && !m.boss && !m.worldBoss && m.exp > 0 && m.lv >= 30 && m.lv <= 60);
    const fake = (def, extra) => Object.assign({ def, x: pl.x, y: pl.y }, extra);
    const mid = { ...normal, lv: 50 };
    const at = gap => Gacha.mobChance(fake(mid), 50 + gap);
    out.cfg = C;
    out.curve = [0, 5, 10, 20, 30].map(at);
    out.curveNeg = [-5, -10, -20].map(at);
    out.dummy = Gacha.mobChance(fake({ ...mid, dummy: true }), 50);
    out.minion = Gacha.mobChance(fake(mid, { minion: true }), 50);
    out.noExp = Gacha.mobChance(fake({ ...mid, exp: 0 }), 50);
    out.mvp = Gacha.mobChance(fake({ ...mid, boss: true }), 50);
    out.wb = Gacha.mobChance(fake(mid, { isWB: true }), 50);
    out.player = Gacha.mobChance(fake(mid, { isPlayer: true }), 50);
    out.elite = Gacha.mobChance(fake({ ...mid, elite: true }), 50);
    out.mvpTokens = Gacha.bossTokens({ def: { boss: true } }); out.wbTokens = Gacha.bossTokens({ def: {}, isWB: true });

    // ---- kill จริงผ่าน killMob (บังคับ RNG) ----
    const tok = () => Gacha.tokens() + G.drops.filter(d => d.id === Gacha.TOKEN).reduce((a, d) => a + d.qty, 0);
    const spawn = (id) => spawnMob(id, { x: Math.floor(pl.x) + 2, y: Math.floor(pl.y) });
    const killWith = (m, rnd) => { const r0 = Math.random; Math.random = () => rnd; try { m.hp = 0; killMob(m); } finally { Math.random = r0; } };
    const chat = () => document.querySelector('#chat-log').textContent.split('Sigil!').length;
    const kill = (auto, rnd) => {
      pl.options.autoLoot = auto; const m = spawn(normal.id); pl.baseLv = m.def.lv;
      const b = tok(), c0 = chat(); killWith(m, rnd);
      return { gained: tok() - b, inInv: Gacha.tokens(), msgs: chat() - c0 };
    };
    out.killAuto = kill(true, 0.0001);
    out.killGround = kill(false, 0.0001);
    out.groundHasToken = G.drops.some(d => d.id === Gacha.TOKEN);
    out.killLose = kill(true, 0.9);
    pl.options.autoLoot = true;
    { const m = spawn(normal.id); pl.baseLv = m.def.lv + 30; const b = tok(); killWith(m, 0.0001); out.killFar = tok() - b; }
    pl.baseLv = normal.lv;
    { const m = spawn(normal.id); m.minion = true; const b = tok(); killWith(m, 0.0001); out.killMinion = tok() - b; }
    { const mv = Object.values(MOBS).find(m => m.boss && !m.worldBoss && !m.dummy && !/^wb_/.test(m.id)); pl.baseLv = mv.lv; const m = spawn(mv.id); const b = tok(); killWith(m, 0.0001); out.killMvp = tok() - b; out.mvpDrop = GACHA_CONFIG.drop.mvp; }

    // ---- สถิติ: gap 0 ผ่าน onMobKill จริง (จับการเรียก dropItemOnGround) ----
    pl.baseLv = normal.lv; pl.options.autoLoot = true;
    const N = 400000, pr = Gacha.mobChance(fake(normal), normal.lv); let hit = 0;
    const msg0 = UI.msg, fl0 = addFloater, dI = dropItemOnGround;
    UI.msg = () => {}; addFloater = () => {}; dropItemOnGround = id => { if (id === Gacha.TOKEN) hit++; };
    try { for (let i = 0; i < N; i++) Gacha.onMobKill(fake(normal)); } finally { dropItemOnGround = dI; UI.msg = msg0; addFloater = fl0; }
    out.stat = { N, pr, hit, z: (hit - N * pr) / Math.sqrt(N * pr * (1 - pr)) };
    return out;
  });
  const C = r.cfg;
  ok('config mobDrop = base .003 / full 5 / zero 20', C.base === 0.003 && C.fullGap === 5 && C.zeroGap === 20, JSON.stringify(C));
  ok('gap 0 and 5 = full base', r.curve[0] === 0.003 && r.curve[1] === 0.003, r.curve.join(','));
  ok('gap 10 = base x 2/3', Math.abs(r.curve[2] - 0.002) < 1e-12, r.curve[2]);
  ok('gap 20 and 30 = 0', r.curve[3] === 0 && r.curve[4] === 0, r.curve.join(','));
  ok('symmetric for mobs above the player', r.curveNeg[0] === 0.003 && Math.abs(r.curveNeg[1] - 0.002) < 1e-12 && r.curveNeg[2] === 0, r.curveNeg.join(','));
  const zero = [r.dummy, r.minion, r.noExp, r.mvp, r.wb, r.player];
  ok('dummy / minion / no-EXP / MVP / World Boss / player = 0', zero.every(v => v === 0), zero.join(','));
  ok('elite x3', Math.abs(r.elite - 0.009) < 1e-12, r.elite);
  ok('boss rewards unchanged (MVP 1 / WB 3)', r.mvpTokens === 1 && r.wbTokens === 3, `${r.mvpTokens}/${r.wbTokens}`);
  ok('forced-RNG kill, autoLoot -> sigil in inventory, one gold message', r.killAuto.gained === 1 && r.killAuto.inInv >= 1 && r.killAuto.msgs === 1, JSON.stringify(r.killAuto));
  ok('forced-RNG kill, autoLoot off -> sigil on the ground', r.killGround.gained === 1 && r.groundHasToken, JSON.stringify(r.killGround));
  ok('losing roll -> nothing, no message', r.killLose.gained === 0 && r.killLose.msgs === 0, JSON.stringify(r.killLose));
  ok('level gap 30 -> nothing even with winning RNG', r.killFar === 0, r.killFar);
  ok('boss minion kill -> nothing', r.killMinion === 0, r.killMinion);
  ok('MVP kill gives exactly drop.mvp (no double)', r.killMvp === r.mvpDrop, `${r.killMvp}/${r.mvpDrop}`);
  ok(`${r.stat.N} simulated rolls at gap 0 within 4.5 sigma of 0.3%`, Math.abs(r.stat.z) < 4.5, `hit=${r.stat.hit} exp=${(r.stat.N * r.stat.pr).toFixed(0)} z=${r.stat.z.toFixed(2)}`);
  ok('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  let bad = 0;
  for (const [n, c, i] of checks) { if (!c) bad++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${c && !i ? '' : '  [' + i + ']'}`); }
  console.log(`\n${checks.length - bad}/${checks.length} passed`);
  await browser.close(); if (srv) srv.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
