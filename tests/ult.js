'use strict';
// ============================================================
//  ไม้ตาย (ULT) รอบ 26: การฟื้นฟู x0.25 (Feel.ULT_HEAL) + บอทกดอัตโนมัติ (Bot.tryUlt, ใช้ร่วมกับ FlyPilot)
//  รัน:  NODE_PATH=$(npm root -g) node tests/ult.js
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
(async () => {
  const srv = await serve();
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  const browser = await chromium.launch(opts);
  const p = await (await browser.newContext({ viewport: { width: 1100, height: 680 } })).newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(`http://localhost:${srv.address().port}/index.html`); await p.waitForTimeout(1200);
  await p.click('#au-offline'); await p.click('#btn-new'); await p.fill('#cr-name', 'UltT'); await p.click('#cr-start'); await p.waitForTimeout(1500);
  await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {});

  const checks = await p.evaluate(() => {
    const out = [], ok = (n, c, i = '') => out.push([n, !!c, i]);
    const pl = G.player, near = (a, b) => Math.abs(a - b) < 1e-6;
    document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden'));
    pl.job = 'einherjar'; pl.baseLv = 30; recalc(); pl.dead = false;
    ok('ULT_HEAL = 0.25', Feel.ULT_HEAL === 0.25, Feel.ULT_HEAL);

    // 1) FURY / WAR CRY = ค่าเดิม 100% (เจ้าของ: ลดเฉพาะการฟื้นฟู) — ไม่ขยับตาม ULT_HEAL
    const buff = pw => {
      Feel.ULT_HEAL = pw; pl.ultBuffUntil = 0; recalc(); const b = { a: pl.d.atkPct, dl: pl.d.aspdDelay };
      pl.ultBuffUntil = G.time + 10; recalc(); const r = { da: pl.d.atkPct - b.a, dd: b.dl - pl.d.aspdDelay };
      pl.ultBuffUntil = 0; recalc(); return r;
    };
    const f1 = buff(1), fq = buff(0.25); Feel.ULT_HEAL = 0.25;
    ok('fury ATK% +25 at full strength', near(fq.da, 25) && near(f1.da, 25), fq.da);
    ok('fury attack-delay cut unchanged by ULT_HEAL', fq.dd === f1.dd && fq.dd > 0, `${fq.dd}`);
    pl.warcryUntil = 0; recalc(); const sp0 = pl.d.speed, ak0 = pl.d.atkPct; pl.warcryUntil = G.time + 10; recalc();
    ok('war cry +15 ATK%, x1.25 speed (full)', near(pl.d.atkPct - ak0, 15) && near(pl.d.speed / sp0, 1.25), `${pl.d.atkPct - ak0} ${pl.d.speed / sp0}`);
    pl.warcryUntil = 0; recalc();

    // 2) AEGIS: ฟื้น HP/SP = 25% ของสูงสุด (เดิมเต็ม) • อมตะ 4 วิ
    const aeg = pw => { Feel.ULT_HEAL = pw; pl.ultKind = 'aegis'; pl.ult = 100; pl.hp = 1; pl.sp = 1; pl.invulnUntil = 0; Feel.ultFire(); return pl.hp - 1; };
    const aFull = aeg(1), aQ = aeg(0.25); Feel.ULT_HEAL = 0.25;
    ok('aegis heal after = 25% of before', Math.abs(aQ - (pl.d.maxHp - 1) * 0.25) <= 1 && aFull === pl.d.maxHp - 1, `${aQ} vs ${aFull}`);
    ok('aegis invulnerable 4s', near(pl.invulnUntil - G.time, 4));

    // 4) ค่าคงที่ Class 3 ที่คูณแล้ว
    const K = Class3.K;
    ok('Class 3: leech x0.25, damage ULT constants unchanged', near(K.ult_leech, 2) && near(K.ult_gate_k, 1.5) && near(K.ult_ymir_k, 1.5) && near(K.o5_ult_k, 1.2) && near(K.s6_ult_k, 0.5), JSON.stringify([K.ult_leech, K.ult_gate_k, K.ult_ymir_k, K.o5_ult_k, K.s6_ult_k]));

    // 5) บอท AUTO
    const setup = (mapId = 'wolfwood') => {
      Bot.toggle(false); pl.dead = false; pl.job = 'einherjar'; pl.stunUntil = 0; pl.cast = null; pl.atkAnim = 0; pl.buffs = {};
      changeMap(mapId, 28.5, 28.5); G.mobs = []; G.drops = []; G.allies = []; G.traps = []; G.respawns = [];
      recalc(); pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp; pl.ultKind = 'fury'; pl.ult = 100; pl.ultBuffUntil = 0;
      const c = Bot.cfg(); c.style = 'skills'; c.leash = false; c.useUlt = true; c.useBuffs = false;
      Bot.toggle(true);
    };
    const mob = (id, dx, dy, chase) => { const m = spawnMob(id, { x: Math.floor(pl.x) + dx, y: Math.floor(pl.y) + dy }); m.nextWander = 1e9; if (chase) { m.state = 'chase'; m.nextAtk = G.time + 99; } return m; };
    const think = () => { Bot.nextThink = 0; Bot.update(); };

    setup(); mob('seraph_pudding', 2, 0, true); think();
    ok('AUTO fires ULT vs boss', pl.ult === 0 && pl.ultBuffUntil > G.time, `ult ${pl.ult}`);

    setup(); think();
    ok('AUTO no ULT with no target', pl.ult === 100 && !(pl.ultBuffUntil > G.time));

    setup(); mob('fenrir_pup', 2, 0, true); think();
    ok('AUTO fires ULT even vs a lone weak mob (owner 2026-10-11: use whenever full)', pl.ult === 0);

    setup(); mob('fenrir_pup', 2, 0, true); mob('fenrir_pup', -2, 0, true); mob('fenrir_pup', 0, 2, true); think();
    ok('AUTO fires ULT vs 3+ mobs', pl.ult === 0);

    setup(); mob('seraph_pudding', 2, 0, true); pl.ult = 99; think();
    ok('AUTO waits for full gauge', pl.ult === 99);

    setup(); mob('seraph_pudding', 2, 0, true); pl.atkAnim = 1; think();
    ok('AUTO respects swing lock (atkAnim>0)', pl.ult === 100);

    setup(); mob('seraph_pudding', 2, 0, true); Bot.cfg().useUlt = false; think();
    ok('AUTO useUlt=false', pl.ult === 100);

    setup(); mob('fenrir_pup', 2, 0, true); pl.ultKind = 'aegis'; pl.hp = Math.floor(pl.d.maxHp * 0.3); const h0 = pl.hp; think();
    ok('AUTO uses heal ULT at low HP', pl.ult === 0 && pl.hp > h0, `${pl.hp} vs ${h0}`);

    setup(); mob('seraph_pudding', 2, 0, true); pl.ultKind = 'aegis'; think();
    ok('AUTO holds heal ULT at full HP (owner 2026-10-12: recovery ULT only when HP ≤ 40%)', pl.ult === 100);
    setup(); mob('seraph_pudding', 2, 0, true); pl.ultKind = 'aegis'; pl.sp = Math.floor(pl.d.maxSp * 0.2); think();
    ok('AUTO uses AEGIS when SP ≤ 30% even at full HP (owner 2026-10-12)', pl.ult === 0);

    setup('eldheim'); G.mobs = []; pl.ult = 100; think();
    ok('AUTO no ULT in town', pl.ult === 100);
    Bot.toggle(false);

    // FlyPilot เรียกกฎเดียวกันผ่าน Bot.tryUlt (flypilot.js act() ขั้น 3)
    setup(); Bot.toggle(false); const b = mob('seraph_pudding', 2, 0, true);
    ok('FlyPilot path: Bot.tryUlt fires', Bot.tryUlt(b, [b], 100) === true && pl.ult === 0);
    return out;
  });
  await browser.close(); srv.close();
  for (const e of errors) checks.push(['page error', false, e]);
  let fail = 0;
  for (const [n, pass, info] of checks) { if (!pass) fail++; console.log(`${pass ? '✔' : '✘'} ${n}${info !== '' ? `  (${info})` : ''}`); }
  console.log(fail ? `\n${fail} FAILED` : `\nALL ${checks.length} PASSED`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
