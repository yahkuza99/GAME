'use strict';
// ============================================================
//  ป้ายเตือนท่าบอส (telegraph): ยืนนิ่งในพื้นที่แดง = โดน • เดินออกทัน = ไม่โดน
//  ขับเวลาเกมเอง (updateGame ทีละ 0.05 วิ) จึงผลเหมือนกันทุกเครื่อง ไม่ขึ้นกับ FPS ของเบราว์เซอร์
//  รัน:  NODE_PATH=$(npm root -g) node tests/boss_telegraph.js   (หรือ BASE=http://localhost:8801/index.html)
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

let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) { pass++; console.log('✔', name, info ? ` (${info})` : ''); } else { fail++; console.log('✘', name, info ? ` (${info})` : ''); } };

(async () => {
  const srv = process.env.BASE ? null : await serve();
  const url = process.env.BASE || `http://localhost:${srv.address().port}/index.html`;
  const b = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 680 } })).newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(url); await p.waitForTimeout(1500);
  await p.click('#au-offline'); await p.click('#btn-new');
  await p.fill('#cr-name', 'Dodger'); await p.click('#cr-start');
  await p.waitForFunction(() => G.started, null, { timeout: 15000 });
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 8000, polling: 250 }).catch(() => {});

  // เตรียมสนาม: ลานโล่ง 24×24 ช่องใน Wolfwood, บอสยืนนิ่ง (มึนค้าง) ไม่ตีปกติ, นับดาเมจที่โดนแทนการหักเลือดจริง
  await p.evaluate(() => {
    WB.active = () => false;
    const pl = G.player; pl.job = 'einherjar'; pl.baseLv = 50; recalc(); pl.hp = pl.d.maxHp;
    changeMap('wolfwood', 28.5, 28.5, { quiet: true });
    for (let y = 16; y < 40; y++) for (let x = 16; x < 40; x++) { const i = G.map.idx(x, y); G.map.tiles[i] = T.GRASS; G.map.block[i] = 0; }
    window.__hits = [];
    damagePlayer = (dmg, color) => { window.__hits.push({ dmg, t: G.time }); };
    stunPlayer = () => {};
    window.__run = (mobId, skill, px, py, plan) => {
      G.mobs = []; G.respawns = []; G.fx = []; G.timers = []; window.__hits = [];
      const pl = G.player; teleportPlayer(px, py); pl.dead = false; pl.stunUntil = 0;
      const m = spawnMob(mobId, { x: 25, y: 28 }); // บอสยืนกลางช่อง (25.5, 28.5)
      if (MOBS[mobId].worldBoss) { m.isWB = true; m.maxHp = MOBS[mobId].hp; m.hp = m.maxHp; } else m.isMvp = true;
      m.stunUntil = 1e12; m.nextBossSkill = 1e12; BossKit.init(m); // Ancient: ป้ายใหญ่ขึ้น/เร็วขึ้นตั้งแต่ท่าแรก
      if (skill === 'rootquake') { m.hp = m.maxHp; } // ไม่ให้สุ่มไปท่าฟื้นเลือด
      const t0 = G.time;
      if (BOSS_SKILLS[skill]) BOSS_SKILLS[skill](m); else { m.bossSeq = 0; bossSkill(m); }
      const tele = G.fx.filter(f => f.type === 'tele').map(f => ({ shape: f.shape, dur: f.dur }));
      let i = 0;
      for (const [at, tx, ty] of plan) { // เดินไปยังจุดหมายเมื่อเวลาเกมผ่านไป at วินาที
        while (G.time - t0 < at) { updateGame(0.05); i++; }
        pl.path = findPath(G.map, Math.floor(pl.x), Math.floor(pl.y), tx, ty, 2000);
      }
      while (G.time - t0 < 4 && i++ < 500) updateGame(0.05);
      return { tele, hits: window.__hits.length, dmg: window.__hits.reduce((a, h) => a + h.dmg, 0), left: G.fx.filter(f => f.type === 'tele' && f.t < f.dur).length, end: [+pl.x.toFixed(2), +pl.y.toFixed(2)] };
    };
  });

  const cases = [
    // [ชื่อ, มอน, ท่า, ตำแหน่งผู้เล่น, แผนหลบ]
    ['ทุบแนวตรง (slam)', 'garmr', 'slam', [29.5, 28.5], [[0.15, 29, 31]]],             // แนวตรงไปทางขวา → ก้าวลงข้างล่าง 2.5 ช่อง
    ['คลื่นกระแทก 3 วง (shockwave)', 'seraph_pudding', 'shockwave', [26.5, 28.5], [[0.15, 33, 28]]], // อยู่วงใน → วิ่งออกนอกวงนอกสุด (> 6.2)
    ['รากทะลวงใต้เท้า (rootquake)', 'garmr', 'rootquake', [28.5, 28.5], [[0.15, 28, 32]]],       // วงรัศมี 2 ใต้เท้า → ก้าวออก 3.5 ช่อง
    ['เวทไฟรอบตัวบอส (firestorm)', 'kitsura', 'firestorm', [26.5, 28.5], [[0.15, 30, 28]]],      // วงรัศมี 3 รอบบอส → ถอยออก
    // ชุดท่าใหม่ (js/bosskit.js)
    ['กากบาทแสง (holycross)', 'seraph_pudding', 'holycross', [29.5, 28.5], [[0.15, 28, 31]]],        // ลำแสง 4 ทิศ → ยืนช่องเฉียง
    ['วงแสงตามรอยเท้า (halodrops)', 'seraph_pudding', 'halodrops', [28.5, 28.5], [[0.1, 38, 28]]],    // เดินไม่หยุด
    ['กรวยพัดไฟ (foxfan)', 'kitsura', 'foxfan', [28.5, 28.5], [[0.15, 31, 28]]],                       // ถอยออกนอกระยะกรวย
    ['ไฟจิ้งจอกตามรอยเท้า (foxfire)', 'kitsura', 'foxfire', [28.5, 28.5], [[0.1, 38, 28]]],
    ['ตะครุบ (pounce)', 'garmr', 'pounce', [28.5, 28.5], [[0.15, 29, 32]]],                             // ก้าวออกจากวง
    ['งับกรวย (maw)', 'garmr', 'maw', [28.5, 28.5], [[0.15, 31, 28]]],
    // Ancient (ระดับ 2): ป้ายใหญ่ขึ้น 25%
    ['Ancient พิพากษา (judgment)', 'wb_seraph_pudding', 'judgment', [31.5, 28.5], [[0.15, 26, 29]]],   // วิ่งเข้าวงในชิดบอส
    ['Ancient กังหันไฟ (pinwheel)', 'wb_kitsura', 'pinwheel', [28.5, 28.5], [[0.15, 36, 28]]],          // ช่องว่างระลอกแรก แล้ววิ่งออกนอกระยะ
    ['Ancient ล่าของเฮล (hunt)', 'wb_garmr', 'hunt', [28.5, 28.5], [[0.1, 38, 28], [1.6, 38, 38]]],      // ตะครุบไล่ 3 ครั้ง → วิ่งไม่หยุด
    ['Ancient ทุบแนวตรง (slam ใหญ่ขึ้น)', 'wb_garmr', 'slam', [29.5, 28.5], [[0.15, 29, 32]]],
  ];
  for (const [name, mob, sk, [px, py], plan] of cases) {
    const still = await p.evaluate(([mob, sk, px, py]) => __run(mob, sk, px, py, []), [mob, sk, px, py]);
    ok(`${name}: มีป้ายแดงก่อนดาเมจ ≥ 1 วิ`, still.tele.length > 0 && still.tele.every(t => t.dur >= 1 && t.dur <= 2.2), JSON.stringify(still.tele));
    ok(`${name}: ยืนนิ่ง = โดน`, still.hits >= 1 && still.dmg > 0, `hits ${still.hits}, dmg ${still.dmg}`);
    const dodge = await p.evaluate(([mob, sk, px, py, plan]) => __run(mob, sk, px, py, plan), [mob, sk, px, py, plan]);
    ok(`${name}: เดินออกจากพื้นที่ = ไม่โดน`, dodge.hits === 0, `hits ${dodge.hits}, end ${dodge.end}`);
  }
  // คลื่นกระแทก: ก้าวเข้าวงในที่ระเบิดไปแล้วก็หลบได้ (ยืนวงกลาง 3.2 ช่อง → หลังวงในระเบิดค่อยก้าวเข้าไปชิดบอส)
  const inward = await p.evaluate(() => __run('seraph_pudding', 'shockwave', 28.7, 28.5, [[1.15, 26, 28]]));
  ok('คลื่นกระแทก: ก้าวเข้าวงที่ระเบิดแล้ว = ไม่โดน', inward.hits === 0, `hits ${inward.hits}, end ${inward.end}`);
  // บอสตายระหว่างร่าย = ยกเลิก ไม่มีดาเมจ
  const cancel = await p.evaluate(() => {
    G.mobs = []; G.fx = []; window.__hits = [];
    teleportPlayer(29.5, 28.5);
    const m = spawnMob('garmr', { x: 25, y: 28 }); m.stunUntil = 1e12; m.nextBossSkill = 1e12;
    BOSS_SKILLS.slam(m); updateGame(0.05); m.dead = true;
    for (let i = 0; i < 40; i++) updateGame(0.05);
    return window.__hits.length;
  });
  ok('บอสตายระหว่างร่าย = ไม่มีดาเมจ', cancel === 0, String(cancel));
  // MVP สลับท่าตามลำดับ (ท่าใหม่ถูกใช้จริง)
  const rot = await p.evaluate(() => {
    const seen = {};
    for (const id of ['seraph_pudding', 'kitsura', 'garmr']) {
      G.mobs = []; G.fx = [];
      const m = spawnMob(id, { x: 25, y: 28 }); m.stunUntil = 1e12; const out = [];
      for (let i = 0; i < 3; i++) { const n0 = G.fx.length; bossSkill(m); out.push(G.fx.slice(n0).filter(f => f.type === 'tele').map(f => f.shape).join('+') || 'heal'); }
      seen[id] = out.join(' > ');
    }
    return seen;
  });
  // ---------- ชุดท่าบอสทุกตัว + ลูกสมุน + Ancient ----------
  const kits = await p.evaluate(() => Object.values(MOBS).filter(d => d.boss && !d.dummy).map(d => {
    const m = { def: d, isWB: !!d.worldBoss }, rot = BossKit.rotation(m), k = BossKit.kit(m);
    return { id: d.id, n: rot.length, ok: rot.every(s => BOSS_SKILLS[s] || s === 'heal' || s === 'firestorm'), tele: rot.filter(s => s !== 'heal').length, minions: k.minions.length, ult: !d.worldBoss || !!BOSS_SKILLS[k.ult] };
  }));
  ok('บอสทุกตัว (MVP + Ancient) มีท่าเตือน ≥ 3 ท่า + ลูกสมุน', kits.length >= 6 && kits.every(k => k.ok && k.tele >= 3 && k.minions >= 1 && k.ult), JSON.stringify(kits.map(k => `${k.id}:${k.tele}/${k.minions}`)));
  const minion = await p.evaluate(() => {
    G.mobs = []; G.fx = []; G.timers = []; window.__hits = [];
    const pl = G.player; teleportPlayer(31.5, 28.5); pl.dead = false;
    const m = spawnMob('garmr', { x: 25, y: 28 }); m.isMvp = true; m.stunUntil = 1e12; m.nextBossSkill = 1e12; m.state = 'chase'; m.engaged = true; m.nextSummon = 1e12;
    for (let i = 0; i < 5; i++) { BossKit.summon(m); for (let j = 0; j < 25; j++) updateGame(0.05); }
    const mins = G.mobs.filter(x => x.minion && !x.dead), n = mins.length;
    const exp0 = pl.baseExp, z0 = pl.zeny, k0 = (pl.kills || {})[mins[0].def.id] || 0, ult0 = pl.ult || 0;
    damageMob(mins[0], 1e9);
    const r = { n, exp: pl.baseExp - exp0, zeny: pl.zeny - z0, kills: ((pl.kills || {})[mins[0].def.id] || 0) - k0, drops: G.drops.length, ult: (pl.ult || 0) - ult0, ids: [...new Set(mins.map(x => x.def.id))] };
    killMob(m); updateGame(0.05);
    r.left = G.mobs.filter(x => x.minion && !x.dead).length;
    return r;
  });
  ok('ลูกสมุน: ค้างพร้อมกันไม่เกิน 4 ตัว (MVP)', minion.n >= 2 && minion.n <= 4, JSON.stringify(minion));
  ok('ลูกสมุน: ไม่มี EXP / Zeny / ดรอป / ไม่นับชิป / ไม่เติมเกจไม้ตาย', minion.exp === 0 && minion.zeny === 0 && minion.drops === 0 && minion.kills === 0 && minion.ult === 0, JSON.stringify(minion));
  ok('บอสตาย = ลูกสมุนสลายทันที', minion.left === 0, String(minion.left));
  const anc = await p.evaluate(() => {
    G.mobs = []; G.fx = []; G.timers = []; window.__hits = [];
    const pl = G.player; teleportPlayer(31.5, 28.5); pl.dead = false;
    const m = spawnMob('wb_kitsura', { x: 25, y: 28 }); m.isWB = true; m.maxHp = MOBS.wb_kitsura.hp; m.hp = m.maxHp; BossKit.onSpawn(m);
    m.stunUntil = 1e12; m.nextBossSkill = 1e12; m.state = 'chase'; m.nextSummon = 1e12;
    const r = { p0: m.phase, cast0: m.castMul, sc: m.teleScale };
    m.hp = m.maxHp * 0.45; for (let j = 0; j < 30; j++) updateGame(0.05);
    r.p1 = m.phase; r.dmg1 = m.dmgMul; r.elite1 = G.mobs.filter(x => x.minion && x.def.elite && !x.dead).length;
    m.hp = m.maxHp * 0.15; for (let j = 0; j < 30; j++) updateGame(0.05);
    r.p2 = m.phase; r.dmg2 = m.dmgMul; r.cast2 = m.castMul; r.elite2 = G.mobs.filter(x => x.minion && x.def.elite && !x.dead).length;
    // ป้องกันฆ่าในทีเดียว: ท่าแรงสุด × คลั่งสุด ไม่เกิน 60% MaxHP
    let mx = 0; for (let i = 0; i < 200; i++) mx = Math.max(mx, bossDmg(m, 2.0));
    r.cap = +(mx / pl.d.maxHp).toFixed(2);
    // เข้ามากลางศึก (เลือดเหลือ 30%) = ช่วงคลั่ง 1 ทันที แบบเงียบ (ไม่มีชั้นยอดเกิดซ้ำ)
    G.mobs = []; const m2 = spawnMob('wb_kitsura', { x: 25, y: 28 }); m2.isWB = true; m2.maxHp = MOBS.wb_kitsura.hp; m2.hp = m2.maxHp * 0.3; BossKit.onSpawn(m2);
    m2.stunUntil = 1e12; m2.state = 'chase'; for (let j = 0; j < 30; j++) updateGame(0.05);
    r.join = m2.phase; r.joinElite = G.mobs.filter(x => x.minion && x.def.elite).length;
    return r;
  });
  ok('Ancient: ป้ายใหญ่ขึ้น + ร่ายถี่กว่า MVP', anc.p0 === 0 && anc.sc > 1 && anc.cast0 < 1, JSON.stringify(anc));
  ok('Ancient: เลือด 50% = คลั่ง 1 (ดาเมจ ×1.2 + ชั้นยอด 2)', anc.p1 === 1 && anc.dmg1 === 1.2 && anc.elite1 === 2, JSON.stringify(anc));
  ok('Ancient: เลือด 20% = คลั่ง 2 (ดาเมจ ×1.35 + ชั้นยอดอีก 3)', anc.p2 === 2 && anc.dmg2 === 1.35 && anc.elite2 === 5, JSON.stringify(anc));
  ok('ท่าบอสแรงสุดไม่เกิน 60% MaxHP (ไม่มีฆ่าในทีเดียว)', anc.cap <= 0.6, String(anc.cap));
  ok('เข้ามากลางศึก: เข้าช่วงคลั่งที่ถูกต้องเงียบ ๆ', anc.join === 1 && anc.joinElite === 0, JSON.stringify(anc));
  ok('MVP ใช้ท่าใหม่ (slam/shockwave) สลับกับท่าเดิม', /line/.test(rot.kitsura) && /ring/.test(rot.kitsura) && /line/.test(rot.garmr) && /ring/.test(rot.seraph_pudding), JSON.stringify(rot));
  ok('ไม่มี error', !errs.length, errs.join(' | '));
  await b.close(); if (srv) srv.close();
  console.log(fail ? `${fail} FAILED, ${pass} passed` : `ALL ${pass} PASSED`);
  process.exit(fail ? 1 : 0);
})();
