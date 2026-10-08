'use strict';
// ============================================================
//  จำลองการสู้บอส (เร่งเวลา) — บอสระดับ 1 (MVP) เทียบระดับ 2 (Ancient) + EXP/ชม. เทียบฟาร์มปกติ
//  ผู้เล่น = บอทของเกม (ตี/ใช้สกิล/กินยาเอง) + "ตัวหลบ" ง่าย ๆ: ยืนในป้ายแดงเมื่อไหร่ เดินออกไปช่องปลอดภัยใกล้สุด (เหมือนผู้เล่นที่ตั้งใจเล่น)
//  ปาร์ตี้ N คน (เฉพาะ Ancient ที่เลือดใช้ร่วมกัน): เพื่อนตีแรงเท่าเรา → ดาเมจของเรา × N • บอสในเครื่องเราตีแต่เรา (เหมือนเกมจริง: มอนจำลองในเครื่องใครเครื่องมัน)
//  ตาย = ฟื้นตรงนั้นหลังรอ 15 วิ (เดินกลับมา) นับจำนวนตาย
//  รัน:  NODE_PATH=$(npm root -g) node tests/boss_sim.js [Class,Class] [วิเฉพาะฟาร์ม]   • MVPONLY=1 = เฉพาะระดับ 1 • NOKIT=1 = เทียบของเดิม (ไม่มีชุดท่า/ลูกสมุน)
//        BOSSES=garmr,nidhogg = เลือกบอส • GEAR=lv = ใส่ของดรอปตามเลเวล (common/uncommon Lv ≤ เรา, อาวุธตามสาย — เหมือน CURVE=1 ใน balance_sim) แทนของร้าน
//        MVP ปาร์ตี้ 3 (เพื่อนตีแรงเท่าเรา) แสดงด้วยทุกครั้ง
//        ANC=1 = เฉพาะ Ancient (ข้าม MVP/ฟาร์ม/ตารางท่า) • PARTY=5 = ขนาดปาร์ตี้ที่จำลอง (ค่าเริ่ม 1,3,5) • HI=0 = ไม่จำลองปาร์ตี้ 5 ที่ Lv+10
//        ท้ายรายงาน: "ปาร์ตี้ 5 คนคละ Class" ต่อบอส = เวลาปาร์ตี้ 5 แต่ละ Class รวมแบบ harmonic (ดาเมจรวมของ 5 Class ต่างกัน)
//          ล้มไม่ทันเวลา → ประมาณเวลาจากเลือดที่หักได้ (sec × 100 / %ที่หักได้)
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
  }).listen(0, () => res(srv));
});

(async () => {
  const srv = await serve();
  const b = await chromium.launch({ channel: process.platform === 'win32' ? 'chrome' : undefined, executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${srv.address().port}/index.html`); await p.waitForTimeout(1200);
  await p.click('#au-offline'); await p.click('#btn-new'); await p.fill('#cr-name', 'Sim'); await p.click('#cr-start');
  await p.waitForFunction(() => G.started, null, { timeout: 15000 });
  const jobs = (process.argv[2] || 'einherjar,runecaster,wildhunter').split(',');
  const FARM = +process.argv[3] || 300;
  const res = await p.evaluate(async ({ jobs, FARM, NOKIT, MVPONLY, BOSSES, GEAR, ANC, PARTY, HI }) => {
    if (NOKIT) { BossKit.summon = () => false; BossKit.rotation = () => null; BossKit.enrage = () => {}; } // เทียบกับของเดิม (ก่อนมีชุดท่า/ลูกสมุน)
    G.player.options.sound = false; UI.msg = () => {}; UI.announce = () => {}; UI.splash = () => {}; saveGame = () => {}; WB.tick = () => {};
    const pathTo = (pl, id) => { const pr = { [id]: null }, q = [id]; while (q.length) { const c = q.shift(); if (Passive.has(pl, c)) { const o = []; for (let x = pr[c]; x; x = pr[x]) o.push(x); return o; } for (const l of PTREE[c].links) if (!(l in pr)) { pr[l] = c; q.push(l); } } return []; };
    const score = it => (it.atk || 0) + (it.matk || 0) + (it.def || 0) * 4 + (it.mdef || 0) * 2 + Object.values(it.b || {}).reduce((a, v) => a + (+v || 0), 0);
    let expSum = 0; const ge = gainExp; gainExp = function (b0, j0) { expSum += b0; return ge.apply(this, arguments); };
    const build = (job, lv) => {
      const pl = newPlayer('Sim', 'f', '#ccc'); pl.options.sound = false; G.player = pl;
      pl.baseLv = lv; pl.jobLv = 10; changeJob(job); pl.jobLv = Math.min(50, lv); pl.skillPoints = 60;
      for (const id of JOBS[job].skills) while (canLearn(id)) learnSkill(id);
      const main = JOBS[job].stats.toLowerCase().split('/').map(x => x.trim());
      pl.statPoints = 40 + lv * 9; let k = 0, guard = 0; // ราว ๆ แต้มที่ได้จริงถึงเลเวลนั้น
      while (guard++ < 2000) { const s = k % 5 === 4 ? 'vit' : main[k % 2]; k++; if (pl.statPoints < statCost(pl.stats[s])) break; raiseStat(s); }
      pl.passives = [];
      const home = PSECT.findIndex(S => S.job === job);
      const own = Object.values(PTREE).filter(n => n.sect === home && n.kind !== 'key').sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
      for (const n of own) { if (Passive.free(pl) <= 0) break; for (const id of pathTo(pl, n.id)) Passive.alloc(pl, id); }
      // ของจากร้าน (ดีที่สุดที่ใส่ได้ในแต่ละช่อง) • GEAR=lv: ของดรอป common/uncommon ที่ Lv ≤ เรา อาวุธตามสาย Class
      if (GEAR === 'lv') {
        for (const s in pl.equip) pl.equip[s] = null; pl.inventory = [];
        const wt = { einherjar: 'sword', runecaster: 'rod', wildhunter: 'bow', volva: 'rod', trickster: 'dagger', berserker: 'axe' }[jobRoot(job)], magic = main[0] === 'int';
        const sc = it => (magic ? (it.matk || 0) * 1.5 + (it.atk || 0) * 0.2 : (it.atk || 0)) + (it.def || 0) * 4 + (it.mdef || 0) * 2 + Object.entries(it.b || {}).reduce((a, [k, v]) => a + (+v || 0) * (/^(hp|sp)$/.test(k) ? 0.04 : /Pct$/.test(k) ? 3 : 1.5), 0);
        const by = {};
        for (const it of Object.values(ITEMS)) if (isEquipType(it) && !it.quest && ['common', 'uncommon', undefined].includes(it.rarity) && (!it.lv || it.lv <= lv) && canJobUse(it.jobs, pl.job) && (it.slot !== 'weapon' || it.wtype === wt) && !(it.slot === 'shield' && wt === 'bow')) (by[it.slot] = by[it.slot] || []).push(it);
        for (const s in by) for (const it of by[s].sort((a, b) => sc(b) - sc(a)).slice(0, s === 'acc' ? 2 : 1)) { addItem(it.id, 1, true); equipItem(pl.inventory.find(x => x.id === it.id), true); }
      } else {
        const best = {};
        for (const id of [...SHOPS.weapon, ...SHOPS.armor]) { const it = ITEMS[id]; if (!it || !canEquip(it)) continue; const s = it.slot; if (!best[s] || score(it) > score(ITEMS[best[s]])) best[s] = id; }
        for (const s in best) { addItem(best[s], 1, true); equipItem(pl.inventory.find(x => x.id === best[s]), true); }
      }
      for (const e of [['white_potion', 60], ['orange_potion', 60], ['blue_potion', 30]]) addItem(e[0], e[1], true);
      recalc(); pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp;
      pl.options.bot = Object.assign(Bot.defaults(), { returnHome: false, avoidMvp: false, rest: false });
      return pl;
    };
    // ตัวหลบ: อยู่ในป้ายแดงที่ยังไม่ระเบิด → เดินไปช่องที่ปลอดภัยใกล้สุด
    const dodge = () => {
      const pl = G.player; if (pl.dead || isStunned()) return;
      const live = G.fx.filter(f => f.type === 'tele' && f.t < f.dur);
      if (!live.some(f => teleInside(f, pl.x, pl.y))) return;
      let bestP = null, bd = 1e9;
      for (const r of [1.5, 2.5, 3.5, 5, 7]) for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2, x = pl.x + Math.cos(a) * r, y = pl.y + Math.sin(a) * r;
        if (!G.map.walkable(Math.floor(x), Math.floor(y)) || live.some(f => teleInside(f, x, y))) continue;
        if (r < bd) { bd = r; bestP = { x, y }; }
      }
      if (bestP) { pl.target = null; pl.skillIntent = null; pl.cast = null; pl.path = findPath(G.map, Math.floor(pl.x), Math.floor(pl.y), Math.floor(bestP.x), Math.floor(bestP.y), 400); Bot.pauseUntil = G.time + 0.5; }
    };
    const fight = (bossId, party, cap, wantDodge) => {
      const d = MOBS[bossId], base = d.worldBoss ? d.base : d.id, map = Object.keys(MAP_DEFS).find(k => MAP_DEFS[k].mvp === base);
      changeMap(map, 20.5, 20.5);
      G.mobs = []; G.respawns = []; G.fx = []; G.timers = [];
      const pl = G.player;
      // ลานโล่ง
      let spot = null; const M = G.map;
      for (let R = 6; R >= 3 && !spot; R--) for (let y = 9; y < M.h - 9 && !spot; y += 2) for (let x = 9; x < M.w - 9 && !spot; x += 2) { let ok = !M.portals.some(q => Math.hypot(q.x - x, q.y - y) < 12); for (let dy = -R; dy <= R && ok; dy++) for (let dx = -R; dx <= R && ok; dx++) if (!M.walkable(x + dx, y + dy)) ok = false; if (ok) spot = { x, y }; }
      teleportPlayer(spot.x + 0.5, spot.y + 0.5);
      const m = spawnMob(bossId, { x: spot.x - 3, y: spot.y });
      if (d.worldBoss) { m.isWB = true; m.maxHp = d.hp; m.hp = d.hp; } else m.isMvp = true;
      BossKit.onSpawn(m);
      G.respawns = [];
      Bot.toggle(true);
      let t = 0, deaths = 0, dmgTaken = 0, pots = 0, minions = 0, maxHit = 0, phaseAt = {};
      const potsOf = () => countItem('white_potion') + countItem('orange_potion');
      const p0 = potsOf();
      const dm = damageMob; damageMob = function (mm, dmg, o) { const r = dm.apply(this, arguments); if (mm === m && party > 1 && !mm.dead) dm(mm, dmg * (party - 1), Object.assign({}, o, { _mate: 1 })); return r; };
      const sp = spawnMob; spawnMob = function (id, pos) { const r = sp.apply(this, arguments); if (MOBS[id].minion) minions++; return r; };
      G.fastSim = true;
      while (t < cap && !m.dead) {
        const hp0 = pl.hp;
        if (wantDodge) dodge();
        updateGame(1 / 15); t += 1 / 15;
        if (pl.hp < hp0) { dmgTaken += hp0 - pl.hp; maxHit = Math.max(maxHit, (hp0 - pl.hp) / pl.d.maxHp); }
        if (m.phase && !phaseAt[m.phase]) phaseAt[m.phase] = Math.round(t);
        if (pl.dead) { // ตาย: เสียเวลา 15 วิ (ฟื้น+เดินกลับ) แล้วกลับมาสู้ต่อเลือดเต็ม (บอสไม่ฟื้นเลือด)
          deaths++; t += 15; UI.hideDeath(); pl.dead = false; pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp; pl.stunUntil = 0;
          for (const x of G.mobs) if (x.minion) BossKit.poof(x);
          teleportPlayer(m.x + 3, m.y); Bot.toggle(true);
        }
        // ห่างเกิน (บอทเดินไกล): พากลับ
        if (U.dist(pl.x, pl.y, m.x, m.y) > 9 && !m.dead) { teleportPlayer(m.x + 2, m.y); }
        if (m.state !== 'chase' && !m.dead) { m.state = 'chase'; }
        if (!Bot.on && !pl.dead) Bot.toggle(true);
      }
      G.fastSim = false; Bot.toggle(false); damageMob = dm; spawnMob = sp;
      pots = p0 - potsOf();
      return { boss: bossId, lv: pl.baseLv, party, dodge: wantDodge, killed: m.dead, sec: Math.round(t), hpLeft: m.dead ? 0 : Math.round(m.hp / m.maxHp * 100), deaths, pots, dmgTakenPerMin: Math.round(dmgTaken / Math.max(1, t) * 60), maxHitPct: Math.round(maxHit * 100), minions, phaseAt, maxHp: pl.d.maxHp };
    };
    const farm = (map, secs) => {
      changeMap(map, 20.5, 20.5);
      G.mobs = G.mobs.filter(m => !m.isMvp && !m.isWB);
      const pl = G.player; Bot.toggle(true); expSum = 0; let t = 0, deaths = 0;
      G.fastSim = true;
      while (t < secs) { updateGame(1 / 15); t += 1 / 15; if (pl.dead) { deaths++; respawnPlayer(true); pl.hp = pl.d.maxHp; changeMap(map, 20.5, 20.5); G.mobs = G.mobs.filter(m => !m.isMvp && !m.isWB); Bot.toggle(true); } }
      G.fastSim = false; Bot.toggle(false);
      return { map, expPerHour: Math.round(expSum / secs * 3600), deaths };
    };
    // ท่าบอสถ้า "ยืนนิ่งไม่หลบ" (เราอยู่ห่างบอส 2 ช่อง ตรงจุดที่ท่าเล็ง): ดาเมจต่อท่าเป็น % MaxHP (เฉลี่ย/สูงสุด) + มึนกี่วิ
    // ป้ายที่ไม่ทับตัวเรา (วงนอกของคลื่นกระแทก / แถบข้าง ๆ ของตาข่าย) ไม่นับ — ตรวจด้วย teleInside เหมือนเกมจริง • ตีปกติ = ดาเมจตีธรรมดา 1 ครั้ง
    const skillHits = bossId => {
      const d = MOBS[bossId], base = d.worldBoss ? d.base : d.id, map = Object.keys(MAP_DEFS).find(k => MAP_DEFS[k].mvp === base);
      changeMap(map, 20.5, 20.5); G.mobs = []; G.respawns = []; G.fx = []; G.timers = [];
      const pl = G.player, m = spawnMob(bossId, { x: pl.x - 2, y: pl.y });
      if (d.worldBoss) { m.isWB = true; m.maxHp = d.hp; m.hp = d.hp; } else m.isMvp = true;
      BossKit.onSpawn(m); m.x = pl.x - 2; m.y = pl.y;
      const k = BossKit.kit(m), list = [...new Set(d.worldBoss ? k.wbRot : k.rot)];
      const tg = telegraph, lt = later, sp = stunPlayer, mx0 = m.x, my0 = m.y, px = pl.x, py = pl.y;
      let stun = 0;
      telegraph = (mm, shape, onHit, boom) => { const f = Object.assign({ type: 'tele' }, shape), sc = mm.teleScale || 1; for (const q of ['r', 'r0', 'len', 'w']) if (f[q] != null) f[q] *= sc; if (teleInside(f, pl.x, pl.y)) onHit(); return f; };
      later = (t, fn) => fn(); stunPlayer = t => { stun = Math.max(stun, t); };
      const row = {};
      const one = fn => { let sum = 0, mx = 0; stun = 0; for (let i = 0; i < 40; i++) { m.x = mx0; m.y = my0; m.hp = m.maxHp; pl.x = px; pl.y = py; pl.dead = false; pl.poisonUntil = 0; const big = pl.d.maxHp * 100; pl.hp = big; fn(); const dmg = (big - pl.hp) / pl.d.maxHp * 100; sum += dmg; mx = Math.max(mx, dmg); } return { avg: Math.round(sum / 40), max: Math.round(mx), stun: +stun.toFixed(1) }; };
      try {
        row.attack = one(() => { const md = m.def, dd = pl.d; let dmg = U.randi(md.atk[0], md.atk[1]); dmg = Math.max(1, Math.round(dmg * (1 - dd.def / 100) - dd.softDef * U.rand(0.7, 1))); dmg = Math.min(dmg, Math.round(dd.maxHp * BOSS_HIT_CAP)); damagePlayer(dmg); });
        for (const id of list) if (BOSS_SKILLS[id]) row[id] = one(() => BOSS_SKILLS[id](m));
      } finally { telegraph = tg; later = lt; stunPlayer = sp; G.mobs = []; G.fx = []; G.timers = []; }
      pl.hp = pl.d.maxHp; pl.dead = false;
      return row;
    };
    const out = [];
    const PLAN = [['seraph_pudding', 27, 'mistlake'], ['kitsura', 47, 'helcave'], ['garmr', 60, 'roots'], ['nidhogg', 70, 'abyss']].filter(x => !BOSSES || BOSSES.includes(x[0]));
    for (const job of jobs) for (const [boss, lv, map] of PLAN) {
      const row = { job, boss, lv };
      if (!ANC) {
      build(job, lv); row.hitsT1 = skillHits(boss); row.hitsT2 = skillHits('wb_' + boss);
      build(job, lv); row.mvp = fight(boss, 1, 900, true);
      build(job, lv); row.mvpNoDodge = fight(boss, 1, 900, false);
      build(job, lv); row.mvp3 = fight(boss, 3, 900, true);
      build(job, lv); expSum = 0; row.farm = farm(map, FARM);
      }
      // ระดับ 2 ที่เลเวลเดียวกัน (ปาร์ตี้ 1 / 3 / 5) และที่เลเวลของ Ancient (+10)
      if (!MVPONLY) {
        for (const n of PARTY) { build(job, lv); row['wb' + n] = fight('wb_' + boss, n, 1800, true); }
        if (HI) { build(job, Math.min(99, lv + 10)); row.wb5hi = fight('wb_' + boss, 5, 1800, true); }
      }
      if (!ANC) {
      // EXP/ชม. จากบอส (สูงสุดที่เป็นไปได้): MVP ถูกจำกัดด้วยเวลาเกิดใหม่ส่วนตัว (mvpAt) • Ancient = 1 ตัว/ชม./แผนที่
      const em = (id, plv) => Math.round(MOBS[id].exp * expLevelMul(MOBS[id].lv, plv));
      row.mvpExpH = Math.round(em(boss, lv) * 3600 / Math.max(MOBS[boss].respawn / 1000, row.mvp.sec));
      row.ancExpH = em('wb_' + boss, lv);
      }
      out.push(row);
    }
    return out;
  }, { jobs, FARM, NOKIT: !!process.env.NOKIT, MVPONLY: !!process.env.MVPONLY, BOSSES: process.env.BOSSES ? process.env.BOSSES.split(',') : null, GEAR: process.env.GEAR || '', ANC: !!process.env.ANC,
    PARTY: (process.env.PARTY || '1,3,5').split(',').map(Number), HI: process.env.HI !== '0' });
  for (const r of res) {
    console.log(`\n=== ${r.job} Lv${r.lv} vs ${r.boss} ===`);
    const f = x => `${x.killed ? 'KILL' : 'fail'} ${String(x.sec).padStart(4)}s${x.killed ? '' : ` (HP left ${x.hpLeft}%)`} deaths ${x.deaths} pots ${x.pots} dmgTaken/min ${x.dmgTakenPerMin} (maxHP ${x.maxHp}) maxHit ${x.maxHitPct}% minions ${x.minions}${Object.keys(x.phaseAt).length ? ' phases@' + JSON.stringify(x.phaseAt) : ''}`;
    const hf = h => Object.entries(h).map(([k, v]) => `${k} ${v.avg}%${v.max > v.avg + 5 ? `(max ${v.max})` : ''}${v.stun ? ` stun ${v.stun}s` : ''}`).join(' • ');
    if (r.hitsT1) {
    console.log('  ยืนรับท่า T1 (%MaxHP):', hf(r.hitsT1));
    if (r.hitsT2) console.log('  ยืนรับท่า T2 (%MaxHP):', hf(r.hitsT2));
    console.log('  T1 MVP   solo dodge  ', f(r.mvp));
    console.log('  T1 MVP   solo no-dodge', f(r.mvpNoDodge));
    console.log('  T1 MVP   party3 dodge', f(r.mvp3));
    }
    for (const n of [1, 3, 5]) if (r['wb' + n]) console.log(`  T2 Anc   party${n} dodge`, f(r['wb' + n]));
    if (r.wb5hi) console.log(`  T2 Anc   party5 @Lv${r.lv + 10}`, f(r.wb5hi));
    if (r.farm) console.log(`  farm ${r.farm.map}: EXP/h ${r.farm.expPerHour} deaths ${r.farm.deaths} • boss EXP/h max: MVP ${r.mvpExpH} (${(r.mvpExpH / r.farm.expPerHour).toFixed(2)}× farm) • Ancient ${r.ancExpH} (${(r.ancExpH / r.farm.expPerHour).toFixed(2)}×)`);
  }
  // ปาร์ตี้ 5 คนคละ Class: ดาเมจรวม = ผลรวมดาเมจต่อวิของแต่ละ Class → เวลา = 1 / เฉลี่ย(1/เวลาของแต่ละ Class) (ประมาณ ไม่รวมการตายที่ต่างกัน)
  const est = x => x.killed ? x.sec : x.hpLeft >= 100 ? Infinity : x.sec * 100 / (100 - x.hpLeft);
  const mins = s => isFinite(s) ? (s / 60).toFixed(1) + ' min' : '∞';
  for (const key of ['wb5', 'wb5hi']) {
    const by = {};
    for (const r of res) if (r[key]) (by[r.boss] = by[r.boss] || []).push(r);
    for (const boss in by) {
      const rows = by[boss], inv = rows.reduce((a, r) => a + 1 / est(r[key]), 0) / rows.length;
      console.log(`\n[สรุป] Ancient ${boss} ปาร์ตี้ 5 คละ Class${key === 'wb5hi' ? ' @Lv+10' : ''}: ≈ ${mins(1 / inv)} • ` + rows.map(r => `${r.job} ${r[key].killed ? mins(r[key].sec) : `fail(${r[key].hpLeft}%)≈${mins(est(r[key]))}`} d${r[key].deaths}`).join(' • '));
    }
  }
  console.log('errors:', errs.slice(0, 5));
  await b.close(); srv.close();
})();
