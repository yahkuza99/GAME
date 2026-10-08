'use strict';
// ============================================================
//  Class 3 (js/class3_data.js + js/class3.js) — Playwright
//  • ข้อมูล: tier 3 / parent / Job 26 / 6 สกิล / bonus = Class 2 + 5 / EXP Job 100·jl² / ไอคอน+ภาพย้อม
//  • ปลด: Base 70 + Job 26 + จบภาค 1 (ch7_home) • Mimir → เควสต์ทดสอบ → ดวลเงาแม่พิมพ์ → ยกระดับ (job2Lv เซฟ + แต้มยกมา)
//  • สกิลทุกตัวใช้ได้ (SP/คูลดาวน์/ผล) • วงรูนระเบิดซ้ำ • เงาหมาป่า • Oath สลับนอกการต่อสู้ • ไม้ตายตัวเลือกที่ 4
//  • เซฟเก่าโหลดได้ • IV-BUILD ไป-กลับ • บอท AUTO ใช้สกิลใหม่ • Battle Script • หน้าต่าง Skills/Status/Runes/Class Book
//  รัน:  NODE_PATH=$(npm root -g) node tests/class3.js
//        SHOTS=<โฟลเดอร์> = เซฟภาพ (หน้าต่างสกิล / วงรูน+Verse / เงาหมาป่า / ฉากยกระดับ)
//        SIM=1 [SIMSEC=60] = จำลอง DPS รูน/Oath Class 3 เทียบ "ไม่มีรูน" (เกณฑ์ ±12% ฉากที่ตั้งใจ, ≤ +15% ทุกฉาก)
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
const SHOTS = process.env.SHOTS || '';

(async () => {
  const srv = await serve();
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  else if (fs.existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(opts);
  const p = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message));
  await p.goto(`http://localhost:${srv.address().port}/index.html`); await p.waitForTimeout(1200);
  await p.click('#au-offline'); await p.click('#btn-new'); await p.fill('#cr-name', 'Ascend'); await p.click('#cr-start'); await p.waitForTimeout(1500);
  await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {});
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 8000, polling: 250 }).catch(() => {});
  await p.waitForTimeout(400);
  const checks = [];
  const ok = (name, cond, info = '') => checks.push([name, !!cond, typeof info === 'string' ? info : JSON.stringify(info)]);
  const shot = async (name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, name) }); } };

  // ---------- ตัวช่วยในหน้าเกม ----------
  await p.evaluate(() => {
    window.C3 = {
      plan: { runelord: ['int', 'dex', 'rod'], packlord: ['str', 'agi', 'battle_axe'], galdr: ['int', 'dex', 'rod'], warlord: ['str', 'agi', 'battle_axe'] },
      // Class 2 Lv 70 Job ตามเกณฑ์ปลด (THIRD_JOB_REQ.job — js/job-progression.js ตั้ง 50) สกิลเต็ม (ยังไม่ Class 3)
      second(job2, lv = 70) {
        const pl = G.player; document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden'));
        Bot.toggle(false);
        pl.dead = false; pl.baseLv = lv; pl.job = 'novice'; pl.jobLv = 10; pl.skills = { first_aid: 1 }; pl.buffs = {}; pl.runes = {}; pl.rb = {}; pl.cds = {}; pl.c3 = {}; delete pl.job1Lv; delete pl.job2Lv;
        changeJob(jobRoot(job2)); pl.jobLv = JOBS[jobRoot(job2)].jobMax; pl.skillPoints = JOBS[jobRoot(job2)].jobMax - 1; for (const id of JOBS[jobRoot(job2)].skills) while (canLearn(id)) learnSkill(id);
        changeJob(job2); pl.jobLv = THIRD_JOB_REQ.job; pl.skillPoints = Math.max(0, totalSkillPoints(pl) - lineSkillsSpent(pl)); for (const id of JOBS[job2].skills) while (canLearn(id)) learnSkill(id);
        const [a, b] = C3.plan[job2] || ['str', 'agi']; const st = { str: 1, agi: 1, vit: 30, int: 1, dex: 1, luk: 1 }; st[a] = 90; st[b] = 60; pl.stats = st;
        recalc(); pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp;
        return pl;
      },
      third(job3) {
        const pl = C3.second(JOBS[job3].parent);
        Class3.st(pl).trial = { job: job3, stage: 'ascend' }; Class3.ascend(job3);
        pl.jobLv = 26; // Class 3 Job 26 (เพดาน 60 — ทดสอบที่จุดเดิม) pl.skillPoints = Math.max(0, totalSkillPoints(pl) - lineSkillsSpent(pl));
        for (const id of JOBS[job3].skills) if (!SKILLS[id].exp) pl.skills[id] = SKILLS[id].max; // ทดสอบ: ทุกสกิล Lv 5 (เกมจริงเลือกได้ 25 จาก 30)
        recalc(); pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp;
        return pl;
      },
      partOne(on) { const q = Quest.state(); q.done = q.done.filter(x => x !== 'ch7_home'); if (on) q.done.push('ch7_home'); },
      arena(map = 'roots') {
        changeMap(map, 1, 1); G.mobs = []; G.respawns = []; G.drops = []; G.allies = []; G.zones = []; G.fx = [];
        const M = G.map, cx = M.w >> 1, cy = M.h >> 1; let best = null;
        for (let y = 4; y < M.h - 4; y++) for (let x = 4; x < M.w - 4; x++) { let open = true; for (let dy = -3; dy <= 3 && open; dy++) for (let dx = -3; dx <= 3 && open; dx++) if (!M.walkable(x + dx, y + dy)) open = false; if (open && !M.portals.some(q => U.dist(q.x, q.y, x, y) < 8) && (!best || Math.hypot(x - cx, y - cy) < Math.hypot(best[0] - cx, best[1] - cy))) best = [x, y]; }
        teleportPlayer(best[0] + 0.5, best[1] + 0.5); return best;
      },
      dummy(x, y, hp = 1e6, id) { const base = id || Object.keys(MOBS).find(k => MOBS[k].lv >= 55 && !MOBS[k].boss && !MOBS[k].dummy && !MOBS[k].minion) || 'pudding'; const m = spawnMob(base, { x: Math.floor(x), y: Math.floor(y) }); m.hp = m.maxHp = hp; m.state = 'idle'; m.nextWander = 1e9; m.nextAtk = 1e9; return m; },
      run(sec) { for (let i = 0; i < Math.round(sec * 15); i++) { for (const m of G.mobs) if (!m.c3shadow) m.nextAtk = G.time + 1; updateGame(1 / 15); } },
    };
    G.player.options.sound = false; UI.msg = () => {}; UI.announce = () => {};
  });

  // ============== 1) ข้อมูล ==============
  const data = await p.evaluate(() => {
    const o = {}, bad = [];
    for (const [c2, c3] of Object.entries(THIRD_JOBS)) {
      const J = JOBS[c3], P2 = JOBS[c2];
      const core = J.skills.filter(id => !SKILLS[id].exp); // สกิลขยาย (exp) มาจาก js/class-expansion-data.js — ภาพ/รูนของมันเอง
      if (J.tier !== 3 || J.parent !== c2 || J.jobMax < THIRD_JOB_REQ.job || core.length !== 6) bad.push('job ' + c3);
      for (const k of ['atkPct', 'matkPct', 'hit', 'hpPct']) if (J.bonus[k] !== P2.bonus[k] + 5) bad.push('bonus ' + c3 + ' ' + k);
      if (Math.abs(J.hp - P2.hp) > 0.1 + 1e-9 || Math.abs(J.sp - P2.sp) > 0.1 + 1e-9 || Math.abs(J.aspd - P2.aspd) > 50) bad.push('mult ' + c3);
      if (core.filter(id => SKILLS[id].type === 'passive').length !== 1) bad.push('passive ' + c3);
      for (const id of core) {
        const s = SKILLS[id];
        if (!s || s.id !== id || !s.desc || !s.name) { bad.push('skill ' + id); continue; }
        const mm = /L\(\s*(['`])([\s\S]*?)\1\s*,\s*(['`"])([\s\S]*?)\3\s*\)/.exec(s.desc + '') ; void mm;
        if (s.type === 'active' && !(typeof s.cd === 'number' && s.cd > 0)) bad.push('cd ' + id);
        if (!Art.aliases['skill_' + id]) bad.push('icon ' + id);
        if (s.type === 'passive' && s.passive) { const pv = s.passive(5); if ((pv.atkPct || 0) > 10 || (pv.matkPct || 0) > 10) bad.push('passive cap ' + id); }
      }
      if (!Art.aliases[`job_${c3}_f`] || !Art.aliases[`emblem_${c3}`]) bad.push('art ' + c3);
      if (Runes.list(J.skills[0]).length !== 2 || Runes.list(J.skills[1]).length !== 2 && Runes.list(J.skills.find(id => Runes.list(id).length && SKILLS[id].type === 'active')).length !== 2) bad.push('runes ' + c3);
    }
    o.bad = bad;
    o.exp = jobExpNeed('runelord', 10) === 10000 && jobExpNeed('galdr', 10) === 7000;
    o.ids = [...Object.keys(JOBS).filter(x => !LO_RX.job.test(x)), ...Object.keys(Runes.BY_ID).filter(x => !LO_RX.rune.test(x))];
    o.save = SAVE_FIELDS.includes('job2Lv') && SAVE_FIELDS.includes('c3') && SAVE_KEY === 'ragnarok_web_save_v2';
    o.cc = Class3.K.sg_root_boss <= 1;
    return o;
  });
  ok('data: tier 3, parent = Class 2, Job 26, 6 skills, bonus = Class 2 + 5, passive ≤ +10%, icons/art aliases, 2 runes on passive + ★', !data.bad.length, data.bad.join(' '));
  ok('data: Job EXP 100·jl² for Class 3', data.exp);
  ok('data: every new id passes the IV-BUILD whitelist', !data.ids.length, data.ids);
  ok('save: job2Lv + c3 persisted, SAVE_KEY unchanged', data.save);
  ok('balance: CC on bosses/players ≤ 1s', data.cc);

  // ============== 2) ปลด + เควสต์ทดสอบ + ยกระดับ ==============
  const flow = await p.evaluate(async () => {
    const o = { req: THIRD_JOB_REQ.job }, pl = C3.second('galdr', 69);
    C3.partOne(true);
    o.lv69 = Class3.req().ok;
    pl.baseLv = 70; pl.jobLv = THIRD_JOB_REQ.job - 1; o.job25 = Class3.req().ok;
    pl.jobLv = THIRD_JOB_REQ.job; C3.partOne(false); o.noStory = Class3.req().ok;
    C3.partOne(true); o.okAll = Class3.req().ok;
    const p1 = C3.second('valkyrie'); C3.partOne(true); o.noThird = Class3.req().next === null && !Class3.req().ok;
    C3.second('galdr'); C3.partOne(true);
    // บทพูด: เมนูเลือกตัวแรกเสมอ
    const menu0 = UI.menu, say0 = UI.say; UI.menu = async () => 0; UI.say = async () => {};
    const sp0 = totalSkillPoints(G.player) - lineSkillsSpent(G.player);
    await NPC.scripts.jobmaster({ id: 'jobmaster', name: 'Mimir AI' });
    o.trial = JSON.stringify(Class3.trial());
    { const q = Quest.state(), q0 = JSON.stringify(q); q.i = QUESTS.length; q.id = null; // จบสายเควสต์หลักแล้ว (ภาค 1 จบ) → ตัวติดตามแสดงเควสต์ทดสอบ
      Quest.renderTracker(); o.tracker = (document.getElementById('quest-track') || {}).textContent || ''; Object.assign(q, JSON.parse(q0)); }
    C3.arena('archive');
    await NPC.scripts.muninn({ id: 'muninn', name: 'Muninn Raven-Courier' });
    const sh = G.mobs.find(m => m.c3shadow);
    o.shadow = !!sh && sh.def.boss && sh.def.shadowJob === 'galdr' && !MOBS.c3_shadow && Class3.trial().stage === 'duel';
    if (sh) {
      G.fastSim = false; for (let i = 0; i < 20; i++) { updateGame(1 / 30); R.frame ? R.frame() : null; } // วาดเงา (ไม่มี error)
      for (let i = 0; i < 300 && !sh.dead; i++) { if (G.time >= pl.skillReadyAt && !pl.cast) beginSkill('chain_lightning', 5, sh); pl.sp = pl.d.maxSp; pl.hp = pl.d.maxHp; updateGame(1 / 15); }
      if (!sh.dead) { sh.hp = 1; damageMob(sh, 99, {}); }
    }
    o.kills = (G.player.kills || {}).c3_shadow || 0;
    o.stage = Class3.trial() && Class3.trial().stage;
    await NPC.scripts.jobmaster({ id: 'jobmaster', name: 'Mimir AI' });
    o.job = G.player.job; o.job2Lv = G.player.job2Lv; o.done = G.player.c3.done.slice(); o.trialAfter = Class3.trial();
    o.spCarry = G.player.skillPoints === sp0 && totalSkillPoints(G.player) === (JOBS.runecaster.jobMax - 1) + (THIRD_JOB_REQ.job - 1) + (G.player.jobLv - 1);
    UI.menu = menu0; UI.say = say0;
    // เซฟ/โหลด
    const data = saveData(), back = loadGameFrom(JSON.parse(JSON.stringify(data)));
    o.saved = data.job2Lv === THIRD_JOB_REQ.job && back.job2Lv === THIRD_JOB_REQ.job && back.job === 'runelord' && back.c3.done.includes('runelord');
    // เซฟเก่า (ก่อนมี Class 3): ไม่มี job2Lv / c3 → โหลดได้ ค่าว่าง
    const old = loadGameFrom({ name: 'Old', gender: 'm', hair: '#ccc', job: 'galdr', baseLv: 72, jobLv: 26, job1Lv: 26, skills: { galdr_focus: 5 }, stats: { str: 1, agi: 1, vit: 1, int: 50, dex: 1, luk: 1 } });
    o.old = !!old && old.job === 'galdr' && old.c3 && Array.isArray(old.c3.done) && old.c3.trial === null && old.job2Lv === undefined;
    const old3 = loadGameFrom({ name: 'Old3', gender: 'f', hair: '#ccc', job: 'packlord', baseLv: 80, jobLv: 5, skills: {}, c3: { trial: { job: 'nope', stage: 'x' }, done: ['packlord', 'bad'] }, job2Lv: 'oops', stats: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 } });
    o.old3pts = [totalSkillPoints(old3), JOBS.berserker.jobMax, JOBS.warlord.jobMax, old3.job1Lv, old3.job2Lv]; o.old3 = !!old3 && old3.job2Lv === 26 && old3.c3.trial === null && old3.c3.done.join() === 'packlord' && totalSkillPoints(old3) === 4 + (JOBS.berserker.jobMax - 1) + 25; // ebf7aef: job2Lv เสียของ Class 3 = 26 (ยุคเดิม Class 2 ตัน 26 — game.js loadGame)
    G.player = pl; G.player = back; recalc();
    return o;
  });
  ok('unlock: Base 69 → locked', !flow.lv69);
  ok('unlock: Class 2 Job below requirement → locked', !flow.job25);
  ok('unlock: Part 1 not finished (ch7_home) → locked', !flow.noStory);
  ok('unlock: Base 70 + Job requirement + ch7_home → open', flow.okAll);
  ok('unlock: Class 2 without a pilot Class 3 (Valkyrie) → none', flow.noThird);
  ok('Mimir starts the trial (talk to Muninn) + quest tracker shows it', /"stage":"seek"/.test(flow.trial) && /Muninn/.test(flow.tracker), flow.trial + ' | ' + flow.tracker);
  ok('trial NPC raises the Mould Shadow (boss, shadow of Galdr, not in MOBS)', flow.shadow);
  ok('defeating the shadow → stage "ascend" (no bestiary entry)', flow.stage === 'ascend' && flow.kills === 0, flow);
  ok('Mimir ascends: job runelord, job2Lv 26, trial cleared, skill points carried', flow.job === 'runelord' && flow.job2Lv === flow.req && flow.done.includes('runelord') && !flow.trialAfter && flow.spCarry, flow);
  ok('save → load keeps job2Lv / c3', flow.saved);
  ok('old save (no job2Lv/c3) loads clean', flow.old);
  ok('broken c3/job2Lv in a save is sanitized (job2Lv → 26, the old Class 2 cap)', flow.old3, flow.old3pts);

  // ============== 3) ทุกสกิลใช้ได้ ==============
  const skills = await p.evaluate(async () => {
    const out = {};
    for (const job of Object.values(THIRD_JOBS)) {
      const pl = C3.third(job), spot = C3.arena('roots');
      for (const id of JOBS[job].skills) {
        const s = SKILLS[id]; if (s.type !== 'active') { out[id] = 'passive'; continue; }
        G.mobs = []; G.allies = G.allies.filter(a => a.kind !== 'c3wolf'); G.zones = [];
        teleportPlayer(spot[0] + 0.5, spot[1] + 0.5);
        const m = C3.dummy(pl.x + 1.2, pl.y, 1e6), m2 = C3.dummy(pl.x - 1.2, pl.y + 0.5, 1e6); m.state = m2.state = 'chase'; pl.target = m;
        pl.skillReadyAt = 0; pl.cds = {}; pl.cast = null; pl.sp = pl.d.maxSp; pl.hp = pl.d.maxHp; pl.stunUntil = 0; pl.buffs = {};
        const sp0 = pl.sp, x0 = pl.x, y0 = pl.y, hp0 = m.hp + m2.hp; let cd = false, spMin = pl.sp;
        try {
          beginSkill(id, s.max, s.target === 'enemy' ? m : null);
          for (let i = 0; i < 75; i++) { for (const o of G.mobs) o.nextAtk = G.time + 1; updateGame(1 / 15); if (skillCdLeft(id) > 0) cd = true; spMin = Math.min(spMin, pl.sp); }
          const eff = (m.hp + m2.hp < hp0) || !!pl.buffs[id] || G.allies.some(a => a.kind === 'c3wolf') || Class3.circles().length > 0 || (m.c3mark && m.c3mark.until > G.time) || U.dist(x0, y0, pl.x, pl.y) > 1 || (pl.rb && pl.rb.c3_lone);
          out[id] = (spMin < sp0 ? '' : 'NO-SP ') + (cd ? '' : 'NO-CD ') + (eff ? 'ok' : 'NO-EFFECT');
        } catch (e) { out[id] = 'ERROR ' + e.message; }
      }
    }
    return out;
  });
  const badSk = Object.entries(skills).filter(([, v]) => !/^(ok|passive)$/.test(v));
  ok('every Class 3 skill casts (SP, cooldown, effect)', !badSk.length, badSk);

  // ============== 4) กลไก: วงรูนระเบิดซ้ำ / Odin ในวง / Resonance / Sap Ward / เงาหมาป่า / Oath / ไม้ตาย ==============
  const mech = await p.evaluate(async () => {
    const o = {};
    let pl = C3.third('runelord'); const spot = C3.arena('roots');
    const by = {}; G.onDmg = (m, d, op) => { by[op.src || '?'] = (by[op.src || '?'] || 0) + d; };
    const m = C3.dummy(pl.x + 4, pl.y, 1e7); m.state = 'chase';
    pl.cds = {}; pl.skillReadyAt = 0; beginSkill('rune_circle', 5, m); C3.run(1);
    o.circle = Class3.circles().length === 1 && !!Class3.circleAt(m);
    pl.cds = {}; pl.skillReadyAt = 0; pl.cast = null; beginSkill('fire_rune', 5, m); C3.run(2);
    o.echo = (by.rune_circle || 0) > 0 && (by.rune_circle || 0) < (by.fire_rune || 0);
    // วงที่ 3 แทนวงเก่าสุด (มีได้ 2)
    for (let i = 0; i < 2; i++) { pl.cds = {}; pl.skillReadyAt = 0; pl.cast = null; beginSkill('rune_circle', 5, m); C3.run(0.8); }
    o.max2 = Class3.circles().length === 2;
    // Odin ×1.3 ในวง
    const sOdin = skillDef('odins_spear_rune');
    o.odin = Math.abs(Runes.hitMul(sOdin, 5, m) / (() => { const z = G.zones; G.zones = []; const k = Runes.hitMul(sOdin, 5, m); G.zones = z; return k; })() - 1.2) < 0.01;
    // Resonance: ไฟ → น้ำ = +15%
    pl.c3el = 'fire'; Runes.preCast(skillDef('ice_rune'), 5, m); o.res = Math.abs(pl.c3cast.ice_rune.k - (1 + SKILLS.root_script.c3res(5))) < 1e-6;
    pl.c3el = 'water'; Runes.preCast(skillDef('ice_rune'), 5, m); o.resSame = pl.c3cast.ice_rune.k === 1;
    // Sap Ward: ดูดซับ แล้วแตก = ระเบิดน้ำแข็ง
    G.zones = []; pl.cds = {}; pl.skillReadyAt = 0; pl.cast = null; beginSkill('sap_ward', 5, null); C3.run(0.2);
    const w = pl.c3ward && pl.c3ward.hp; const hp0 = pl.hp; damagePlayer(Math.floor(w / 2)); o.wardAbsorb = pl.hp === hp0 && pl.c3ward.hp < w;
    const b0 = by.sap_ward || 0; damagePlayer(pl.c3ward.hp + 5); C3.run(0.3); o.wardBreak = !pl.c3ward && (by.sap_ward || 0) > b0;
    pl.hp = pl.d.maxHp;
    // Oath swap: นอกการต่อสู้ได้ • ระหว่างต่อสู้ไม่ได้
    pl.combatAt = -99; o.oathSet = Runes.set('root_script', 'root_script.three_tongues') && Runes.chosen('root_script').oath === 'three';
    pl.combatAt = G.time; o.oathBusy = !Runes.set('root_script', 'root_script.fire_tongue') && Runes.chosen('root_script').oath === 'three';
    pl.combatAt = -99; Runes.set('root_script', 'root_script.fire_tongue');
    o.fire = Math.abs(Runes.hitMul(skillDef('ice_rune'), 5, m) / Runes.hitMul(skillDef('fire_rune'), 5, m) - 1) < 0.25; // ทั้งคู่เป็นไฟแล้ว (ต่างกันแค่ Resonance/วง)
    pl.combatAt = -99; Runes.set('root_script', null);
    // ไม้ตาย TREE'S COMMAND
    o.ultKeysGaldr = (() => { const j = pl.job; pl.job = 'galdr'; const k = Feel.ultKeys(); pl.job = j; return k; })();
    o.ultKeys = Feel.ultKeys();
    pl.ultKind = 'tree'; pl.ult = 100; Feel.ultFire();
    o.tree = Class3.ultOn('tree') && skillCost('meteor_rune', 5) === 0 && Runes.castMul('meteor_rune') === 0;
    pl.c3ult = null;
    // ---------- Packlord ----------
    pl = C3.third('packlord'); C3.arena('roots');
    const t = C3.dummy(pl.x + 1, pl.y, 1e7); t.state = 'chase';
    for (let i = 0; i < 4; i++) { const e = C3.dummy(pl.x + (i % 2 ? -1 : 1) * 1.5, pl.y + (i < 2 ? 1 : -1), 1e7); e.state = 'chase'; }
    o.pack = Math.abs(Class3.packMul() - 1.15) < 1e-6;
    pl.cds = {}; pl.skillReadyAt = 0; pl.buffs = {}; beginSkill('howl_of_the_pack', 5, null); C3.run(0.5);
    o.wolves = G.allies.filter(a => a.kind === 'c3wolf').length;
    const w0 = by.wolf_companion || 0; C3.run(4); o.wolfBite = (by.wolf_companion || 0) > w0;
    pl.skills.pack_blood = 5; pl.combatAt = -99; Runes.set('pack_blood', 'pack_blood.pack'); G.allies = []; pl.cds = {}; pl.skillReadyAt = 0; beginSkill('howl_of_the_pack', 5, null); C3.run(0.3);
    o.wolvesPack = G.allies.filter(a => a.kind === 'c3wolf').length;
    pl.combatAt = -99; Runes.set('pack_blood', 'pack_blood.lone_wolf'); G.allies = []; pl.cds = {}; pl.skillReadyAt = 0; beginSkill('howl_of_the_pack', 5, null); C3.run(0.3);
    o.lone = G.allies.filter(a => a.kind === 'c3wolf').length === 0 && !!(pl.rb && pl.rb.c3_lone);
    pl.combatAt = -99; Runes.set('pack_blood', null); Runes.set('howl_of_the_pack', 'howl_of_the_pack.single_alpha'); G.allies = []; pl.cds = {}; pl.skillReadyAt = 0; beginSkill('howl_of_the_pack', 5, null); C3.run(0.3);
    o.alpha = G.allies.filter(a => a.kind === 'c3wolf').length === 1 && G.allies.find(a => a.kind === 'c3wolf').alpha;
    pl.combatAt = -99; Runes.set('howl_of_the_pack', 'howl_of_the_pack.ember_pack'); G.allies = []; pl.cds = {}; pl.skillReadyAt = 0; beginSkill('howl_of_the_pack', 5, null);
    const e0 = by.howl_of_the_pack || 0; C3.run(11); o.ember = (by.howl_of_the_pack || 0) > e0;
    pl.combatAt = -99; Runes.set('howl_of_the_pack', null);
    // Alpha's Mark +15%
    pl.cds = {}; pl.skillReadyAt = 0; beginSkill('alphas_mark', 5, t); C3.run(0.3);
    o.mark = t.c3mark && Math.abs(t.c3mark.k - 0.15) < 1e-6;
    // Unchained: ล้างมึน + กันมึน + ไม่ล้ม 2 วิ
    pl.stunUntil = G.time + 5; pl.stunAt = G.time; pl.cds = {}; pl.skillReadyAt = 0; executeSkill('unchained', 5, null);
    o.unstun = pl.stunUntil <= G.time; stunPlayer(3); o.stunImm = pl.stunUntil <= G.time;
    pl.hp = 50; damagePlayer(99999); o.floor = pl.hp === 1 && !pl.dead; pl.hp = pl.d.maxHp;
    // ไม้ตาย RAGNARÖK HOWL
    pl.buffs = {}; G.allies = []; pl.ultKind = 'howl'; pl.ult = 100; const l0 = pl.d.leech; Feel.ultFire();
    o.howlUlt = G.allies.filter(a => a.kind === 'c3wolf').length === 2 && pl.d.leech === l0 + Class3.K.ult_leech && (stunPlayer(2), pl.stunUntil <= G.time);
    pl.c3ult = null; recalc();
    G.onDmg = null;
    return o;
  });
  ok('Rune Circle: placed under the target, spells echo (< the spell itself), max 2 circles', mech.circle && mech.echo && mech.max2, mech);
  ok("Odin's Spear Rune ×1.2 inside a circle", mech.odin);
  ok('Root Script Resonance: new element +2%×Lv, same element +0%', mech.res && mech.resSame);
  ok('Sap Ward absorbs, then bursts into ice', mech.wardAbsorb && mech.wardBreak, mech);
  ok('Oath swaps out of combat, refused in combat', mech.oathSet && mech.oathBusy);
  ok('Oath of Fire-Tongue turns spells to fire', mech.fire);
  ok('ULT: 4th option only for its Class (Galdr has 3)', mech.ultKeys.includes('tree') && !mech.ultKeys.includes('howl') && mech.ultKeysGaldr.length === 3, mech.ultKeys);
  ok("ULT TREE'S COMMAND: no cast, no SP", mech.tree);
  ok('Pack Blood: 5 foes around = +15%', mech.pack);
  ok('Howl: 3 shadow wolves that bite • Oath of the Pack 5 • Lone Wolf 0 (+ lone howl buff)', mech.wolves === 3 && mech.wolfBite && mech.wolvesPack === 5 && mech.lone, mech);
  ok('Howl runes: Single Alpha = 1 big wolf, Ember Pack explodes on expiry', mech.alpha && mech.ember, mech);
  ok("Alpha's Mark +15% at Lv 5", mech.mark);
  ok('Unchained: clears stun, blocks stun, HP floor 1', mech.unstun && mech.stunImm && mech.floor, mech);
  ok('ULT RAGNARÖK HOWL: +2 wolves, lifesteal, stun immunity', mech.howlUlt);

  // ============== 5) IV-BUILD / Battle Script / UI ==============
  const ui = await p.evaluate(async () => {
    const o = {}, pl = C3.third('runelord');
    pl.combatAt = -99; Runes.set('root_script', 'root_script.three_tongues'); Runes.set('rune_circle', 'rune_circle.leyline'); Runes.set('fire_rune', 'fire_rune.split');
    const code = Loadouts.exportCode(null, false), dec = Loadouts.decode(code);
    o.code = code.slice(0, 40);
    o.round = !dec.err && dec.build.job === 'runelord' && ['root_script.three_tongues', 'rune_circle.leyline', 'fire_rune.split'].every(r => dec.build.runes.includes(r));
    Runes.set('root_script', null); Runes.set('rune_circle', null);
    const ap = Loadouts.applyBuild(dec.build, { runes: true });
    o.apply = ap.ok && Runes.chosen('root_script') && Runes.chosen('root_script').id === 'root_script.three_tongues';
    // Class 2 ใช้ Build ของ Class 3 ไม่ได้ (ดูอย่างเดียว) • Class 3 ใช้ Build ของ Class 2 ได้
    o.check = Loadouts.check(dec.build).classOk && Loadouts.check(Object.assign({}, dec.build, { job: 'galdr' })).classOk;
    // Battle Script
    o.bsList = ['rune_circle', 'odins_spear_rune', 'ragnarok_verse', 'meteor_rune', 'fire_rune'].every(id => BotScript.skillList('active').includes(id));
    const bs = BotScript.parseText('1:A=srune_circle'); o.bsParse = !bs.err && bs.rules[0].a.v === 'rune_circle';
    // หน้าต่าง Skills: แท็บ Class 3 + แถวรูน (Oath) + ป้าย III
    UI.skTab = 'runelord'; UI.open('w-skills'); UI.renderSkills();
    const w = document.querySelector('#w-skills');
    o.tabs = [...w.querySelectorAll('.sk-tabs .tab small')].map(x => x.textContent);
    o.runeRow = !!w.querySelector('.rn-row[data-skill="root_script"]') && !!w.querySelector('.rn-row[data-skill="rune_circle"]');
    o.badge = w.querySelectorAll('.sicon.sk-c3').length >= 6 && !!w.querySelector('.c3-hint');
    UI.close('w-skills');
    UI.open('w-status'); UI.renderStatus(); o.status = /CLASS III/.test((document.querySelector('#w-status .c3-status') || {}).textContent || ''); UI.close('w-status');
    // หน้าต่าง Runes: สกิลติดตัว Class 3 อยู่ในรายการ
    o.book = typeof Runebook !== 'undefined' && Runebook.skillIds ? Runebook.skillIds().includes('root_script') && Runebook.skillIds().includes('howl_of_the_pack') === false : null;
    // Class Book: Runelord อยู่ใต้ Galdr
    const tr = ClassBook.tree().find(x => x[0] === 'runecaster'); o.cb = tr[1].indexOf('runelord') === tr[1].indexOf('galdr') + 1;
    o.anim = Anim.playerKey('runelord', 'f'); o.pd = Paperdoll.baseJob('runelord');
    return o;
  });
  ok('IV-BUILD round trip (Class 3 + Oath + rune) and apply', ui.round && ui.apply, ui);
  ok('Builds: Class 3 can use its own and Class 2 builds', ui.check);
  ok('Battle Script lists/parses the new skills', ui.bsList && ui.bsParse);
  ok('Skills window: Class 1/2/3 tabs, Oath + ★ rune rows, III badge, hint', ui.tabs.join() === 'NOVICE,Class 1,Class 2,Class 3' || ui.tabs.join() === 'NOVICE,CLASS 1,CLASS 2,CLASS 3', ui.tabs);
  ok('Skills window: rune rows + badges', ui.runeRow && ui.badge, ui);
  ok('Status shows the Class III card', ui.status);
  if (ui.book !== null) ok('Runes window lists the Class 3 passive (Oath)', ui.book);
  ok('Class Book lists Runelord under Galdr', ui.cb);
  ok('art falls back to the parent line (anim + Class weapon)', /^(galdr|runecaster)_f$/.test(ui.anim) && ui.pd === 'runecaster', ui);

  // ============== 6) บอท AUTO ล่าจริงด้วยสกิลใหม่ ==============
  const bot = await p.evaluate(async () => {
    const out = {};
    for (const job of Object.values(THIRD_JOBS)) {
      const pl = C3.third(job);
      pl.skills[JOBS[job].skills[5]] = 1; pl.skills[JOBS[job].skills[4]] = 4; // 25 แต้มแบบผู้เล่นจริง
      for (const [id, n] of [['white_potion', 60], ['blue_potion', 40]]) addItem(id, n, true);
      changeMap('abyss', 1, 1);
      const M = G.map; let sp = null; for (let r = 0; r < 40 && !sp; r++) for (let y = (M.h >> 1) - r; y <= (M.h >> 1) + r && !sp; y++) for (let x = (M.w >> 1) - r; x <= (M.w >> 1) + r && !sp; x++) if (M.walkable(x, y)) sp = [x, y];
      teleportPlayer(sp[0] + 0.5, sp[1] + 0.5);
      G.mobs = G.mobs.filter(m => !m.isMvp && !m.isWB);
      const c = Bot.cfg(); c.style = 'skills'; c.leash = false; c.skills = {}; c.skillHp = {}; c.skipMobs = {};
      const cast = {}; const ex = window.executeSkill; window.executeSkill = (id, ...a) => { cast[id] = (cast[id] || 0) + 1; return ex(id, ...a); };
      Bot.toggle(true); G.fastSim = true; let deaths = 0;
      for (let i = 0; i < 90 * 15; i++) { updateGame(1 / 15); if (pl.dead) { deaths++; respawnPlayer(true); teleportPlayer(sp[0] + 0.5, sp[1] + 0.5); Bot.toggle(true); } }
      G.fastSim = false; out[job] = { kills: Bot.stats.kills, deaths, cast }; Bot.toggle(false); window.executeSkill = ex;
    }
    return out;
  });
  const used = (j, ids) => ids.filter(id => (bot[j].cast[id] || 0) > 0);
  ok('bot: Runelord hunts and uses Class 3 skills', bot.runelord.kills > 0 && used('runelord', ['rune_circle', 'odins_spear_rune', 'ragnarok_verse', 'sap_ward']).length >= 2, bot.runelord);
  ok('bot: Packlord hunts and uses Class 3 skills', bot.packlord.kills > 0 && used('packlord', ['howl_of_the_pack', 'jaws_of_fenrir', 'wolfstorm_cleave', 'alphas_mark']).length >= 3, bot.packlord);

  // ============== 7) ภาพ (เซฟไว้ให้เจ้าของดู) ==============
  if (SHOTS) {
    // หน้าต่างสกิล Runelord
    const unsplash = () => p.evaluate(() => { const s = document.getElementById('splash'); if (s) s.classList.remove('show'); const b = document.querySelector('.map-banner, #map-banner'); if (b) b.classList.remove('show'); });
    await p.evaluate(() => { const pl = C3.third('runelord'); pl.combatAt = -99; Runes.set('root_script', 'root_script.three_tongues'); C3.arena('abyss'); G.mobs = G.mobs.filter(m => !m.isMvp && !m.isWB); UI.skTab = 'runelord'; UI.open('w-skills'); UI.renderSkills(); });
    await unsplash(); await p.waitForTimeout(600); await unsplash(); await shot('class3_skills_runelord.png');
    // วงรูน + Ragnarök Verse
    await p.evaluate(() => {
      UI.close('w-skills'); const pl = G.player; G.fastSim = false; G.mobs = [];
      for (let i = 0; i < 5; i++) { const m = C3.dummy(pl.x + 3.5 + (i % 3) * 0.9, pl.y - 1 + (i >> 1) * 0.9, 1e6, 'nid_spawn'); m.state = 'idle'; }
      G.floaters = []; const t = G.mobs[2]; pl.target = t; pl.cds = {}; pl.skillReadyAt = 0; beginSkill('rune_circle', 5, t); C3.run(0.6);
      pl.cds = {}; pl.skillReadyAt = 0; pl.cast = null; pl.c3el = 'wind'; executeSkill('ragnarok_verse', 5, t); C3.run(0.35);
    });
    await unsplash(); await p.waitForTimeout(250); await shot('class3_rune_circle_verse.png');
    await p.evaluate(() => C3.run(0.6)); await p.waitForTimeout(100); await shot('class3_rune_circle_verse2.png');
    // เงาหมาป่า
    await p.evaluate(() => {
      const pl = C3.third('packlord'); C3.arena('abyss'); G.fastSim = false; G.mobs = [];
      for (let i = 0; i < 3; i++) { const m = C3.dummy(pl.x + 4.5 + (i % 2) * 1.2, pl.y - 1 + i * 1.1, 1e6, 'rust_bloom'); m.state = 'chase'; m.def = Object.assign({}, m.def, { speed: 0.01 }); }
      pl.target = G.mobs[1]; pl.cds = {}; pl.skillReadyAt = 0; beginSkill('alphas_mark', 5, G.mobs[1]); C3.run(0.3);
      pl.cds = {}; pl.skillReadyAt = 0; beginSkill('howl_of_the_pack', 5, null); C3.run(0.9); G.floaters = [];
    });
    await unsplash(); await p.waitForTimeout(250); await shot('class3_howl_wolves.png');
    // ฉากยกระดับ (เงาแม่พิมพ์ + Mimir)
    await p.evaluate(async () => {
      const pl = C3.second('warlord'); G.allies = []; C3.partOne(true); Class3.st(pl).trial = { job: 'packlord', stage: 'seek' };
      changeMap('wolfwood', 36, 24); G.fastSim = false; await new Promise(r => setTimeout(r, 400)); Class3.spawnShadow(); C3.run(0.6);
    });
    await unsplash(); await p.waitForTimeout(400); await shot('class3_mould_shadow.png');
    await p.evaluate(async () => {
      const sh = G.mobs.find(m => m.c3shadow); if (sh) { sh.hp = 1; damageMob(sh, 99, {}); }
      changeMap(HOME_MAP, 20.5, 24.5); await new Promise(r => setTimeout(r, 400));
      const n = G.npcs.find(x => x.id === 'jobmaster'); if (n) teleportPlayer(n.x + 0.5, n.y + 2.2);
      NPC.talk(n || { id: 'jobmaster', name: 'Mimir AI' }); // เมนูจริง: "รับความคิด!" (ยังไม่กด)
    });
    await unsplash(); await p.waitForTimeout(900); await shot('class3_job_change_mimir.png');
    await p.evaluate(() => { UI.dlgClose && UI.dlgClose(); NPC.busy = false; Class3.ascend('packlord'); });
    await p.waitForTimeout(900); await shot('class3_job_change_splash.png');
  }

  // ============== 8) จำลองสมดุลรูน/Oath (SIM=1) ==============
  if (process.env.SIM) {
    const SEC = +process.env.SIMSEC || 60, SEEDS = [11, 23, 37, 41, 53, 67];
    await p.evaluate(() => {
      UI.menu = async () => 1; G.fastSim = true;
      const mul32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
      MOBS.c3_sim = { id: 'c3_sim', name: 'C3 Sim', lv: 68, hp: 9000, atk: [1, 1], def: 35, mdef: 30, vit: 60, flee: 80, hit: 1, exp: 0, jexp: 0, zeny: [0, 0], speed: 1.6, aggro: true, element: 'neutral', race: 'brute', sprite: 'boar', color: '#a08060', drops: [], range: 1, atkDelay: 1.7 };
      window.C3SIM = (job, runes, n, secs, seed) => {
        const R0 = Math.random; Math.random = mul32(seed);
        const pl = C3.third(job); pl.skills[JOBS[job].skills[5]] = 1; pl.skills[JOBS[job].skills[4]] = 4;
        const spot = C3.arena('roots'); pl.runes = Object.assign({}, runes); recalc(); pl.combatAt = -99;
        pl.nextAttack = 0; pl.target = null; pl.skillReadyAt = 0; pl.cds = {}; G.timers = []; Bot.nextThink = 0; Bot.pauseUntil = 0;
        let total = 0; G.onDmg = (m, d, o) => { if (m.def.id !== 'c3_sim') return; total += Math.max(0, Math.min(d, m.hp)); };
        const am0 = window.addMastery; window.addMastery = () => {};
        const cx = spot[0] + 0.5, cy = spot[1] + 0.5;
        const spawn = () => { const a = Math.random() * 6.283, r = 2 + Math.random(); const m = spawnMob('c3_sim', { x: Math.floor(cx + Math.cos(a) * r), y: Math.floor(cy + Math.sin(a) * r) }); m.nextWander = 1e9; m.state = 'chase'; return m; };
        for (let i = 0; i < n; i++) spawn();
        const c = Bot.cfg(); c.style = 'skills'; c.leash = false; c.skills = {}; c.skillHp = {}; c.skipMobs = {}; c.rest = false;
        Bot.toggle(true); const pend = [];
        try {
          for (let i = 0; i < Math.round(secs * 15); i++) {
            pl.sp = pl.d.maxSp; pl.hp = Math.round(pl.d.maxHp * 0.6); pl.dead = false;
            if (!pl.cast && U.dist(pl.x, pl.y, cx, cy) > 3.5) { pl.x = cx; pl.y = cy; pl.path = []; }
            G.respawns = [];
            const alive = G.mobs.filter(m => !m.dead && m.def.id === 'c3_sim').length;
            while (alive + pend.length < n) pend.push(G.time + 1);
            for (let j = pend.length - 1; j >= 0; j--) if (pend[j] <= G.time) { pend.splice(j, 1); spawn(); }
            if (!Bot.on) Bot.toggle(true);
            updateGame(1 / 15);
          }
        } finally { Bot.toggle(false); window.addMastery = am0; G.onDmg = null; Math.random = R0; }
        return total / secs;
      };
    });
    const SETS = {
      runelord: [['root_script', 'root_script.fire_tongue', 'pack'], ['root_script', 'root_script.three_tongues', 'single'], ['rune_circle', 'rune_circle.snare_glyph', 'both'], ['rune_circle', 'rune_circle.leyline', 'both']],
      packlord: [['pack_blood', 'pack_blood.pack', 'pack'], ['pack_blood', 'pack_blood.lone_wolf', 'single'], ['howl_of_the_pack', 'howl_of_the_pack.single_alpha', 'single'], ['howl_of_the_pack', 'howl_of_the_pack.ember_pack', 'pack']],
    };
    const sim = async (job, runes, n) => { let s = 0; for (const seed of SEEDS) s += await p.evaluate(([j, r, nn, ss, sd]) => C3SIM(j, r, nn, ss, sd), [job, runes, n, SEC, seed]); return s / SEEDS.length; };
    for (const job of Object.keys(SETS)) {
      const b1 = await sim(job, {}, 1), b5 = await sim(job, {}, 5);
      console.log(`\n== ${job} baseline single ${b1.toFixed(0)} pack ${b5.toFixed(0)}`);
      for (const [sk, rid, intent] of SETS[job]) {
        const s1 = await sim(job, { [sk]: rid }, 1), s5 = await sim(job, { [sk]: rid }, 5);
        const d1 = (s1 / b1 - 1) * 100, d5 = (s5 / b5 - 1) * 100, inten = intent === 'single' ? [d1] : intent === 'pack' ? [d5] : [d1, d5];
        const pass = inten.every(d => Math.abs(d) <= 12) && d1 <= 15 && d5 <= 15;
        console.log(`   ${pass ? '✔' : '✘'} ${rid.padEnd(34)} ${intent.padEnd(6)} single ${(d1 >= 0 ? '+' : '') + d1.toFixed(1)}%  pack ${(d5 >= 0 ? '+' : '') + d5.toFixed(1)}%`);
        ok(`balance ${rid} (±12% intent, ≤+15%)`, pass, `single ${d1.toFixed(1)}% pack ${d5.toFixed(1)}%`);
      }
    }
  }

  await browser.close(); srv.close();
  for (const e of errors) ok('page error', false, e);
  let fail = 0;
  for (const [n, pass, info] of checks) { console.log(`${pass ? '✔' : '✘'} ${n}${!pass && info !== '' ? `  (${info})` : ''}`); if (!pass) fail++; }
  console.log(fail ? `\n${fail} FAILED of ${checks.length}` : `\nALL ${checks.length} PASSED`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
