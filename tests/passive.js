'use strict';
// ============================================================
//  ต้นไม้ Passive (แบบ D: ตัวเลขเล็ก + เพดานรวม + โหนดใหญ่เป็นลูกเล่นมีเงื่อนไข)
//  รัน:  NODE_PATH=$(npm root -g) node tests/passive.js [วินาทีต่อรอบ=60] [job,job | none = ข้ามการจำลอง ตรวจแต่ระบบ]
//        SYS=0 = จำลองอย่างเดียว (ใช้วัดโค้ดรุ่นเก่าได้) • LV=60 = เลเวลที่เทียบเส้นทาง • C1=1 = เฉพาะ Class 1
//
//  วิธีจำลอง DPS (แบบเดียวกับ tests/runes.js — วัด "ทั้ง Class"):
//  • ตัวละครเลเวล LV (แต้ม Passive = LV−1), สกิลทุกตัวของสาย Class เต็ม, สเตตัสตามแต้มจริง (หลัก/รองสลับ + VIT ทุก 5),
//    ของสวม common/uncommon ที่ดีที่สุดต่อช่อง ≤ LV (เหมือน tests/balance_sim.js CURVE=1)
//  • มอนจำลอง = มอนจริงเลเวลใกล้สุด (HP/DEF/FLEE/HIT จริง ตีเบา 1) ธาตุสลับตาม seed (neutral/fire/water/wind/earth)
//  • HP เป็นฟันเลื่อย 100% → 40% ทุก 12 วิ (เงื่อนไข HP สูง/ต่ำ ได้ทำงานตามสัดส่วนเวลาจริงของการสู้) • SP ไม่จำกัด
//  • ฉาก: เดี่ยว (1 ตัว) + ฝูง (5 ตัวรอบตัว) → ใช้ค่าเฉลี่ยสองฉาก
//  • เส้นทาง: none (ไม่มี Passive) • home (แฉก Class ตัวเอง แล้วเติมจุดใกล้แกน) • K0–K5 (เดินไป Keystone แฉกนั้น
//    + แฉกตัวเอง + เติมแฉกของ Keystone ก่อน แล้วใกล้แกน)
//  เป้า (เจ้าของ "อย่าให้โกงเกินไป"): เส้นทางดีสุดเหนือค่ากลาง (median) ของ Class เดียวกัน ~+10% (ดูเกณฑ์จริงที่ SPREAD_* ข้างล่าง)
//    และ Passive รวมให้ DPS ที่ Lv 99 (98 แต้ม) ราว +25–40% (ก่อนแบบ D: +131%) • ตรวจระบบ/เซฟเก่า/หน้าต่าง Passive ต่อท้าย
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

const SECS = +process.argv[2] || 60;
const ONLY = (process.argv[3] || '').split(',').filter(Boolean);
const SKIP_SIM = ONLY.includes('none');
const SEEDS = [11, 23, 37, 41, 53];
const LV = +process.env.LV || 60, MAXLV = 99;
// เกณฑ์: ค่าเฉลี่ยทุก Class — เส้นทางที่ดีที่สุด ≤ median +12% และ Passive รวมที่ Lv 99 = +25–40%
//        รายตัว (กันหลุด) — ไม่มี Class ไหนเส้นทางเดียวเกิน median +25% • รวมที่ Lv 99 อยู่ใน +10–60%
//        (เดิมก่อนแบบ D: เฉลี่ย +46% สูงสุด +83% • รวม Lv 99 +131%)
const SPREAD_AVG = 12, SPREAD_MAX = 25, TOTAL_AVG = [25, 40], TOTAL_ONE = [10, 60];
const C1 = ['einherjar', 'runecaster', 'wildhunter', 'volva', 'trickster', 'berserker'];
const C2 = ['valkyrie', 'hersir', 'galdr', 'seidr', 'skadi', 'ullr', 'norn', 'gythja', 'phantom', 'skald', 'warlord', 'jotun'];

const checks = [];
const ok = (name, cond, info = '') => checks.push([name, !!cond, typeof info === 'string' ? info : JSON.stringify(info)]);

(async () => {
  const srv = await serve();
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  else if (fs.existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(opts);
  const errors = [];
  const base = `http://localhost:${srv.address().port}/index.html`;
  const start = async (vw, vh, mobile) => {
    const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, isMobile: !!mobile, hasTouch: !!mobile });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message));
    await p.goto(base); await p.waitForTimeout(1200);
    await p.click('#au-offline'); await p.click('#btn-new'); await p.fill('#cr-name', 'TreeSim'); await p.click('#cr-start'); await p.waitForTimeout(1500);
    await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {});
    await p.waitForTimeout(400);
    return { p, ctx };
  };

  if (!SKIP_SIM) {
    const { p, ctx } = await start(1100, 680);
    await p.evaluate(installSim);
    const jobs = ONLY.length ? ONLY : process.env.C1 ? C1 : C1.concat(C2);
    const sim = async (job, lv, build, n) => {
      let s = 0;
      for (const seed of SEEDS) s += await p.evaluate(a => PSIM(...a), [job, lv, build, n, SECS, seed]);
      return s / SEEDS.length;
    };
    const t0 = Date.now(), rows = [];
    const BUILDS = ['none', 'home', 'K0', 'K1', 'K2', 'K3', 'K4', 'K5'];
    console.log(`Passive DPS (Lv ${LV}, ${SEEDS.length} seeds × ${SECS}s, avg of single + pack-of-5)`);
    console.log('job          none    ' + BUILDS.slice(1).map(b => b.padStart(13)).join('') + '   | median  max/med  | Lv99 best');
    for (const job of jobs) {
      const r = { job, lv: LV, dps: {}, s1: {}, s5: {} };
      for (const b of BUILDS) { r.s1[b] = await sim(job, LV, b, 1); r.s5[b] = await sim(job, LV, b, 5); r.dps[b] = (r.s1[b] + r.s5[b]) / 2; }
      const paths = BUILDS.slice(1).map(b => r.dps[b]).sort((a, b) => a - b), med = (paths[3] + paths[4]) / 2;
      r.median = med; r.maxOverMed = (paths[paths.length - 1] / med - 1) * 100;
      r.best = BUILDS.slice(1).reduce((a, b) => (r.dps[b] > r.dps[a] ? b : a), 'home');
      // Lv 99: แต้มเต็ม 98 แต้ม — เส้นทางที่ดีที่สุดที่ Lv 60 (ไปต่อจนแต้มหมด) เทียบกับไม่มี Passive
      const n99 = ((await sim(job, MAXLV, 'none', 1)) + (await sim(job, MAXLV, 'none', 5))) / 2;
      const b99 = ((await sim(job, MAXLV, r.best, 1)) + (await sim(job, MAXLV, r.best, 5))) / 2;
      r.total99 = (b99 / n99 - 1) * 100; r.total = (r.dps[r.best] / r.dps.none - 1) * 100;
      rows.push(r);
      const pc = b => `${r.dps[b].toFixed(0)}(${((r.dps[b] / r.dps.none - 1) * 100 >= 0 ? '+' : '')}${((r.dps[b] / r.dps.none - 1) * 100).toFixed(0)}%)`;
      console.log(`${job.padEnd(11)} ${r.dps.none.toFixed(0).padStart(5)}  ${BUILDS.slice(1).map(b => pc(b).padStart(13)).join('')}   | ${med.toFixed(0).padStart(6)}  ${(r.maxOverMed >= 0 ? '+' : '') + r.maxOverMed.toFixed(1)}% ${r.best.padEnd(4)} | +${r.total99.toFixed(0)}%`);
      // เส้นทางสายตี (ไม่นับแฉกป้องกัน/ฮีล Bulwark/Seer ที่แลก DPS กับความอึด) — ดูว่าทางเลือกสายตีเป็น sidegrade กันไหม
      const off = ['home', 'K1', 'K2', 'K3', 'K4'].map(b => r.dps[b]).sort((a, b) => a - b);
      r.offMaxOverMed = (off[off.length - 1] / off[2] - 1) * 100;
      console.log(`${''.padEnd(11)} offense paths (home,K1–K4): max/median +${r.offMaxOverMed.toFixed(1)}%`);
      ok(`spread ${job}: best path ≤ median +${SPREAD_MAX}%`, r.maxOverMed <= SPREAD_MAX, `${r.best} +${r.maxOverMed.toFixed(1)}%`);
      ok(`total ${job}: passives at Lv 99 = +${TOTAL_ONE[0]}…${TOTAL_ONE[1]}% DPS`, r.total99 >= TOTAL_ONE[0] && r.total99 <= TOTAL_ONE[1], `+${r.total99.toFixed(1)}% (Lv ${LV}: +${r.total.toFixed(1)}%)`);
    }
    // ค่ากลางทุก Class (ค่าเฉลี่ยเส้นทาง Lv LV เทียบระหว่าง Class)
    const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
    const meds = rows.map(r => r.median), mm = avg(meds);
    console.log(`\nclass spread at Lv ${LV} (median path DPS / mean): ` + rows.map(r => `${r.job} ${((r.median / mm - 1) * 100).toFixed(0)}%`).join(' • '));
    console.log(`avg passive contribution: Lv ${LV} best +${avg(rows.map(r => r.total)).toFixed(1)}% • Lv 99 best +${avg(rows.map(r => r.total99)).toFixed(1)}% • avg max/median +${avg(rows.map(r => r.maxOverMed)).toFixed(1)}% (offense paths +${avg(rows.map(r => r.offMaxOverMed)).toFixed(1)}%)`);
    if (rows.length >= 6) {
      const sa = avg(rows.map(r => r.maxOverMed)), ta = avg(rows.map(r => r.total99));
      ok(`spread (avg of ${rows.length} Class): best path ≤ median +${SPREAD_AVG}%`, sa <= SPREAD_AVG, `+${sa.toFixed(1)}%`);
      ok(`total (avg of ${rows.length} Class): passives at Lv 99 = +${TOTAL_AVG[0]}…${TOTAL_AVG[1]}% DPS`, ta >= TOTAL_AVG[0] && ta <= TOTAL_AVG[1], `+${ta.toFixed(1)}%`);
    }
    console.log(`(sim ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    if (process.env.JSON) fs.writeFileSync(process.env.JSON, JSON.stringify(rows, null, 1));
    await ctx.close();
  }

  if (process.env.SYS !== '0') {
    const { p, ctx } = await start(1280, 720);
    const sys = await p.evaluate(systemChecks);
    checks.push(...sys);
    // หน้าต่าง Passive: เมเตอร์เพดาน + ภาพหน้าจอ (คอม + มือถือ)
    const shots = process.env.SHOTS;
    const ui = await p.evaluate(uiChecks);
    checks.push(...ui);
    if (shots) { fs.mkdirSync(shots, { recursive: true }); await p.screenshot({ path: path.join(shots, 'passive_1280x720.png') }); }
    await ctx.close();
    const m = await start(390, 844, true);
    const ui2 = await m.p.evaluate(uiChecks);
    checks.push(...ui2.map(([n, c, i]) => ['phone: ' + n, c, i]));
    if (shots) await m.p.screenshot({ path: path.join(shots, 'passive_390x844.png') });
    await m.ctx.close();
  }
  await browser.close(); srv.close();
  for (const e of errors) ok('page error', false, e);
  let fail = 0;
  for (const [n, pass, info] of checks) { if (!pass) fail++; console.log(`${pass ? '✔' : '✘'} ${n}${info ? `  (${info})` : ''}`); }
  console.log(fail ? `\n${fail} FAILED of ${checks.length}` : `\nALL ${checks.length} PASSED`);
  process.exit(fail ? 1 : 0);
})();

// ------------------------------------------------------------
//  ตัวจำลอง (รันในหน้าเกม)
// ------------------------------------------------------------
function installSim() {
  const PLAN = { einherjar: ['str', 'vit'], runecaster: ['int', 'dex'], wildhunter: ['dex', 'agi'], volva: ['int', 'vit'], trickster: ['agi', 'str'], berserker: ['str', 'agi'], gythja: ['str', 'vit'], ullr: ['dex', 'luk'], skald: ['agi', 'dex'], jotun: ['str', 'vit'] };
  const WT = { einherjar: 'sword', runecaster: 'rod', wildhunter: 'bow', volva: 'rod', trickster: 'dagger', berserker: 'axe', gythja: 'mace' };
  const RANK = { common: 0, uncommon: 1, rare: 2, epic: 3, legend: 4 };
  const ELEMS = ['neutral', 'fire', 'water', 'wind', 'earth'];
  const mul32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const R0 = Math.random;
  const pathTo = (pl, id) => { const pr = { [id]: null }, q = [id]; while (q.length) { const c = q.shift(); if (Passive.has(pl, c)) { const o = []; for (let x = pr[c]; x; x = pr[x]) o.push(x); return o; } for (const l of PTREE[c].links) if (!(l in pr)) { pr[l] = c; q.push(l); } } return []; };
  const near = n => Math.hypot(n.x, n.y);
  // จัดแต้ม Passive ตามเส้นทาง
  window.PBUILD = (pl, job, build) => {
    pl.passives = [];
    if (build === 'none') return;
    const home = PSECT.findIndex(S => S.job === jobRoot(job));
    const take = id => { for (const x of pathTo(pl, id)) { if (Passive.free(pl) <= 0) return; Passive.alloc(pl, x); } };
    const ks = build[0] === 'K' ? +build[1] : -1;
    if (ks >= 0) take(`${ks}o`);
    const sect = s => Object.values(PTREE).filter(n => n.sect === s && n.kind !== 'key').sort((a, b) => near(a) - near(b) || (a.id < b.id ? -1 : 1));
    for (const n of sect(home)) { if (Passive.free(pl) <= 0) break; take(n.id); }
    if (ks >= 0) for (const n of sect(ks)) { if (Passive.free(pl) <= 0) break; take(n.id); }
    while (Passive.free(pl) > 0) {
      const c = Object.values(PTREE).filter(n => n.kind !== 'key' && Passive.canAlloc(pl, n.id)).sort((a, b) => near(a) - near(b) || (a.id < b.id ? -1 : 1))[0];
      if (!c) break; Passive.alloc(pl, c.id);
    }
  };
  const statPts = lv => { let s = 48; for (let l = 2; l <= lv; l++) s += statPointsForLevel(l); return s; };
  let spot = null;
  window.PSETUP = (job, lv, build) => {
    const pl = G.player, root = jobRoot(job), plan = PLAN[job] || PLAN[root], wtype = WT[job] || WT[root], magic = plan[0] === 'int';
    document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden'));
    Bot.toggle(false);
    pl.rc = {}; pl.ricd = {}; pl.runes = {}; pl.hrunes = [null, null];
    pl.dead = false; pl.job = job; pl.baseLv = lv; pl.baseExp = 0; pl.jobLv = JOBS[job].jobMax; pl.skills = {}; pl.buffs = {}; pl.rb = {}; pl.cds = {}; pl.skillReadyAt = 0; pl.cast = null; pl.stunUntil = 0; pl.passives = [];
    for (const j of jobLine(job)) for (const id of JOBS[j].skills) pl.skills[id] = SKILLS[id].max;
    // สเตตัสตามแต้มจริง
    pl.stats = { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 }; pl.statPoints = statPts(lv);
    let k = 0, guard = 0;
    while (guard++ < 3000) { const s = k % 5 === 4 ? 'vit' : plan[k % 2]; k++; const c = statCost(pl.stats[s]); if (pl.statPoints < c || pl.stats[s] >= 99) { if (pl.statPoints < 2) break; continue; } pl.statPoints -= c; pl.stats[s]++; }
    // ของตามเลเวล (เหมือน balance_sim CURVE)
    for (const s in pl.equip) pl.equip[s] = null;
    pl.inventory = [];
    const bScore = b => Object.entries(b || {}).reduce((a, [kk, v]) => a + (+v || 0) * (/^(hp|sp)$/.test(kk) ? 0.04 : /Pct$/.test(kk) ? 3 : 1.5), 0);
    const score = it => (magic ? (it.matk || 0) * 1.5 + (it.atk || 0) * 0.2 : (it.atk || 0)) + (it.def || 0) * 4 + (it.mdef || 0) * 2 + bScore(it.b);
    const cand = Object.values(ITEMS).filter(it => isEquipType(it) && !it.quest && (RANK[it.rarity || 'common'] || 0) <= 1 && (!it.lv || it.lv <= lv) && canJobUse(it.jobs, job)
      && (it.slot !== 'weapon' || it.wtype === wtype) && !(it.slot === 'shield' && wtype === 'bow'));
    const bySlot = {};
    for (const it of cand) (bySlot[it.slot] = bySlot[it.slot] || []).push(it);
    for (const s in bySlot) for (const it of bySlot[s].sort((a, b) => score(b) - score(a) || (a.id < b.id ? -1 : 1)).slice(0, s === 'acc' ? 2 : 1)) { addItem(it.id, 1, true); equipItem(pl.inventory.find(x => x.id === it.id && !Object.values(pl.equip).includes(x)), true); }
    recalc();
    PBUILD(pl, job, build);
    if (G.map.id !== 'wolfwood') changeMap('wolfwood', 28.5, 28.5);
    if (!spot) for (let r = 0; r < 20 && !spot; r++) for (let y = 28 - r; y <= 28 + r && !spot; y++) for (let x = 28 - r; x <= 28 + r && !spot; x++) {
      let open = true;
      for (let dy = -7; dy <= 7 && open; dy++) for (let dx = -7; dx <= 7 && open; dx++) if (!G.map.walkable(x + dx, y + dy)) open = false;
      if (open && !G.map.portals.some(q => U.dist(q.x, q.y, x, y) < 12)) spot = { x, y };
    }
  };
  // มอนจำลอง: มอนจริงเลเวลใกล้สุด (ไม่ใช่บอส) แต่ตีเบา
  const simMob = (lv, el) => {
    const src = Object.values(MOBS).filter(m => !m.boss && !m.dummy && m.hp && m.lv && !m.minion && m.id !== 'psim').sort((a, b) => Math.abs(a.lv - lv) - Math.abs(b.lv - lv) || (a.id < b.id ? -1 : 1))[0];
    MOBS.psim = Object.assign({}, src, { id: 'psim', name: 'Passive Sim', atk: [1, 1], exp: 0, jexp: 0, zeny: [0, 0], drops: [], element: el, stun: null, aggro: true, speed: 1.6 });
  };
  window.PSIM = (job, lv, build, n, secs, seed) => {
    const pl = G.player;
    Math.random = mul32(seed);
    simMob(lv, ELEMS[seed % ELEMS.length]);
    PSETUP(job, lv, build);
    G.time = 1000; pl.nextAttack = 0; pl.stealthUntil = 0; pl.poisonUntil = 0; pl.skillIntent = null; pl.target = null; if (typeof Runes !== 'undefined') Runes._crit = false;
    for (const k of Object.keys(pl)) if (/^pv_/.test(k)) delete pl[k]; // สถานะชั่วคราวของ Passive แบบมีเงื่อนไข
    teleportPlayer(spot.x + 0.5, spot.y + 0.5);
    G.mobs = []; G.drops = []; G.allies = []; G.traps = []; G.respawns = []; G.zones = []; G.timers = []; G.fx = [];
    recalc(); pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp; pl.combatAt = -99;
    const order = jobLine(job).flatMap(j => JOBS[j].skills).filter(id => SKILLS[id].type === 'active');
    let total = 0;
    G.onDmg = (m, dmg, o) => { if (m.def.id !== 'psim') return; total += Math.max(0, Math.min(dmg, o.src === 'poison' ? dmg : m.hp)); };
    const am0 = window.addMastery; window.addMastery = () => {};
    const U0 = { chance: U.chance, rand: U.rand, randi: U.randi }, acc = new Map();
    U.chance = q => {
      if (!(q > 0)) return false; if (q >= 1) return true;
      const k = Math.round(q * 1e4) + '|' + (new Error().stack || '').split('\n').slice(2, 6).join('|');
      let a = acc.has(k) ? acc.get(k) : 0.5; a += q; const y = a >= 1; if (y) a -= 1; acc.set(k, a); return y;
    };
    U.rand = (a, b) => (a + b) / 2; U.randi = (a, b) => Math.floor((a + b + 1) / 2);
    const cx = spot.x + 0.5, cy = spot.y + 0.5;
    const spawn = () => { const a = Math.random() * Math.PI * 2, r = 2.5 + Math.random(); const m = spawnMob('psim', { x: Math.floor(cx + Math.cos(a) * r), y: Math.floor(cy + Math.sin(a) * r) }); m.nextWander = 1e9; m.state = 'chase'; return m; };
    for (let i = 0; i < n; i++) spawn();
    const pend = [];
    let tgt = null, nextHeal = 1004, holdUntil = 0; const lastUse = {};
    const act = () => {
      if (G.time < holdUntil && pl.path.length) return;
      const alive = G.mobs.filter(m => !m.dead && m.def.id === 'psim');
      if (!tgt || tgt.dead || !G.mobs.includes(tgt)) { tgt = null; let bd = 1e9; for (const m of alive) { const d = U.dist(m.x, m.y, pl.x, pl.y); if (d < bd) { bd = d; tgt = m; } } }
      if (!tgt) return;
      if (!pl.cast && !pl.skillIntent && pl.target !== tgt) { pl.target = tgt; pl.repathAt = 0; }
      if (pl.cast || G.time < pl.skillReadyAt || isStunned()) return;
      const isAtk = id => ['attack', 'aoe', 'other'].includes(Bot.role(id));
      const pri = order.filter(id => !isAtk(id)).concat(order.filter(isAtk).sort((a, b) => (lastUse[a] || 0) - (lastUse[b] || 0)));
      for (const id of pri) {
        const s = skillDef(id), slv = skillLv(id), role = Bot.role(id);
        if (skillCdLeft(id) > 0) continue;
        if (role === 'heal' && G.time < nextHeal) continue;
        if (role === 'buff' && pl.buffs[id] && pl.buffs[id].until - G.time > 1) continue;
        if (role === 'summon' && G.allies.length) continue;
        if (role === 'opener' && pl.stealthUntil > G.time) continue;
        if (role === 'trap') continue; // กับดักต้องถอยวาง — ข้าม (เทียบเส้นทาง Passive ไม่ใช่การใช้กับดัก)
        if (s.weapon && weaponType() !== s.weapon) continue;
        beginSkill(id, slv, s.target === 'enemy' ? tgt : null);
        lastUse[id] = G.time;
        if (role === 'heal') nextHeal = G.time + 8;
        return;
      }
    };
    const dt = 1 / 15, steps = Math.round(secs / dt), t0 = G.time;
    try {
      for (let i = 0; i < steps; i++) {
        act();
        const ph = ((G.time - t0) % 12) / 12; // HP ฟันเลื่อย 100% → 40%
        pl.sp = pl.d.maxSp; pl.hp = Math.max(1, Math.round(pl.d.maxHp * (1 - 0.6 * ph))); pl.dead = false;
        if (!pl.cast && U.dist(pl.x, pl.y, cx, cy) > 3.5) { pl.x = cx; pl.y = cy; pl.path = []; }
        G.respawns = [];
        const alive = G.mobs.filter(m => !m.dead && m.def.id === 'psim').length;
        while (alive + pend.length < n) pend.push(G.time + 1);
        for (let j = pend.length - 1; j >= 0; j--) if (pend[j] <= G.time) { pend.splice(j, 1); spawn(); }
        updateGame(dt);
      }
    } finally { window.addMastery = am0; G.onDmg = null; Math.random = R0; Object.assign(U, U0); }
    return total / (G.time - t0);
  };
  G.player.options.sound = false; UI.msg = () => {}; UI.announce = () => {}; UI.splash = () => {}; window.saveGame = () => {};
  G.fastSim = true;
}

// ------------------------------------------------------------
//  ตรวจระบบ: ข้อมูล / เพดาน / ผลมีเงื่อนไข / เซฟเก่า / PvP
// ------------------------------------------------------------
function systemChecks() {
  const out = [], ok = (name, cond, info = '') => out.push([name, !!cond, typeof info === 'string' ? info : JSON.stringify(info)]);
  const pl = G.player; window.saveGame = () => {}; UI.msg = () => {};
  const S0 = JSON.parse(JSON.stringify(saveData()));
  // 1) ข้อมูล: id เดิมครบทุกจุด (157) • Keystone/Notable มีคำอธิบาย L(ไทย, อังกฤษ) สั้น
  const ids = Object.keys(PTREE);
  const want = ['core']; for (let s = 0; s < 6; s++) for (const k of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'm', 'm2', 'n', 'n2', 'o', 'p', 'p2', 'q', 'q1', 'r', 'r2', 't', 't1']) want.push(s + k);
  for (let s = 0; s < 6; s++) want.push('in' + s, 'out' + s);
  ok('data: all 157 node ids kept (old saves map 1:1)', ids.length === 157 && want.every(id => PTREE[id]), ids.length);
  const cond = Object.values(PTREE).filter(n => n.fx);
  const keys = Object.values(PTREE).filter(n => n.kind === 'key');
  const badText = cond.filter(n => !n.fdesc || /[฀-๿]/.test(Passive.fxText(n, 'en')) || !/[฀-๿]/.test(Passive.fxText(n, 'th')) || pfxLines(n, 'en').some(t => t.length > 60) || /undefined|NaN/.test(Passive.fxText(n, 'en')));
  ok('data: every Keystone is conditional (6) + ≥ 2 conditional Notables per path', keys.length === 6 && keys.every(n => n.fx) && PSECT.every((S, i) => Object.values(PTREE).filter(n => n.sect === i && n.kind === 'notable' && n.fx).length >= 2), cond.length);
  ok('data: conditional text = short English lines (≤ 60 chars) + Thai', !badText.length, badText.map(n => n.id).join(' '));
  // 2) เพดาน: ค่ารวมจากต้นไม้ถูกตัดที่ PCAP (ATK%/MATK% 20) • ใช้กับ Passive เท่านั้น (ของสวม/Class ไม่ถูกตัด)
  pl.baseLv = 99; pl.passives = [];
  const all = Object.keys(PTREE).filter(id => id !== 'core');
  const raw = {}; for (const id of all) for (const k in PTREE[id].b) raw[k] = (raw[k] || 0) + PTREE[id].b[k];
  pl.passives = all.slice(); // ทุกจุด (เกินแต้มได้ในเทสต์) → ดูเพดาน
  const cap = Passive.bonus(pl);
  const over = Object.keys(PCAP).filter(k => (PCAP[k] < 0 ? (cap[k] || 0) < PCAP[k] : (cap[k] || 0) > PCAP[k]));
  const hit = Object.keys(PCAP).filter(k => Math.abs(raw[k] || 0) > Math.abs(PCAP[k]));
  ok('caps: every capped stat stays within its cap (and some really clip)', !over.length && cap.atkPct <= PCAP.atkPct && cap.matkPct <= PCAP.matkPct && hit.length >= 2, { over, hit, atkPct: [raw.atkPct, cap.atkPct], matkPct: [raw.matkPct, cap.matkPct] });
  ok('caps: ATK% / MATK% from passives ≤ 20 (static part leaves room for conditionals)', PCAP.atkPct === 20 && PCAP.matkPct === 20 && raw.atkPct < 20 && raw.matkPct < 20, [raw.atkPct, raw.matkPct]);
  const usage = Passive.capUse(pl);
  ok('caps: meter data (value/cap) for the window', usage[0].k === 'atkPct' && usage[0].v === raw.atkPct && usage[0].cap === PCAP.atkPct && usage.some(u => u.full), usage.slice(0, 3));
  // ของสวม ATK% ไม่ถูกตัด
  pl.passives = []; recalc(); const a0 = pl.d.atkPct;
  const job = pl.job; pl.job = 'skadi'; recalc(); const aj = pl.d.atkPct; pl.job = job; recalc();
  ok('caps: Class/gear ATK% not capped by the passive cap', aj - a0 === JOBS.skadi.bonus.atkPct, [a0, aj]);
  // 3) ผลมีเงื่อนไข (Keystone/Notable) — ใช้ตัวช่วยของ Passive โดยตรง
  pl.job = 'berserker'; pl.baseLv = 99; pl.passives = []; recalc();
  const route = id => { const pr = { [id]: null }, q = [id]; while (q.length) { const c = q.shift(); if (Passive.has(pl, c)) { const o = []; for (let x = pr[c]; x; x = pr[x]) o.push(x); return o; } for (const l of PTREE[c].links) if (!(l in pr)) { pr[l] = c; q.push(l); } } return []; };
  const give = id => { for (const x of route(id)) pl.passives.push(x); recalc(); };
  const m = spawnMob('pudding', { x: Math.floor(pl.x) + 1, y: Math.floor(pl.y) }); m.hp = m.maxHp = 1000;
  // Overclock: HP < 50% เท่านั้น
  give('1o'); pl.hp = pl.d.maxHp; const hi = Passive.dmgMul(m, 'phys'); pl.hp = Math.floor(pl.d.maxHp * 0.3); const lo = Passive.dmgMul(m, 'phys');
  ok('Overclock: bonus only below 50% HP', hi < lo && lo > 1, [hi, lo]);
  // Resolute Aim: ไม่มีศัตรูในระยะ 2 ช่อง = ตีโดนทุกครั้ง + ดาเมจ (คริไม่ได้เสมอ)
  pl.passives = []; give('3o'); pl.hp = pl.d.maxHp; G.mobs = []; const r1 = Passive.dmgMul(null, 'phys'); G.mobs = [m]; const r2 = Passive.dmgMul(m, 'phys');
  ok('Resolute Aim: bonus only with no enemy within 2 cells', r1 > 1 && r2 === 1 && pl.d.resolute, [r1, r2]);
  const ev = spawnMob('pudding', { x: Math.floor(pl.x) + 4, y: Math.floor(pl.y) }); ev.def = Object.assign({}, ev.def, { flee: 9999 });
  G.mobs = [ev]; let sure = 0; for (let i = 0; i < 20; i++) if (!physHit(ev, 1).miss) sure++;
  ev.x = pl.x + 1; ev.y = pl.y; let near = 0; for (let i = 0; i < 20; i++) if (!physHit(ev, 1).miss) near++;
  ok('Resolute Aim: always hits from range, misses normally up close, never crits', sure === 20 && near <= 3 && !physHit(ev, 1, { forceCrit: true }).crit, [sure, near]);
  G.mobs = [m];
  // Hunter Mark: เป้าเลือดเต็ม (ตีแรกเท่านั้น)
  pl.passives = []; give('3q'); pl.hp = pl.d.maxHp; m.hp = m.maxHp; const f1 = Passive.dmgMul(m, 'phys'); m.hp = m.maxHp - 1; const f2 = Passive.dmgMul(m, 'phys');
  ok('Hunter Mark: first hit on a full-HP target only', f1 > 1 && f2 === 1, [f1, f2]);
  // Heavy Hitter: ต่อศัตรูรอบตัว (สูงสุด 4)
  pl.passives = []; give('1t'); G.mobs = G.mobs.filter(x => x === m); const c1 = Passive.dmgMul(m, 'phys');
  for (let i = 0; i < 6; i++) { const e = spawnMob('pudding', { x: Math.floor(pl.x) + (i % 3) - 1, y: Math.floor(pl.y) + 1 }); e.state = 'chase'; }
  m.state = 'chase'; const c6 = Passive.dmgMul(m, 'phys');
  ok('Heavy Hitter: +damage per nearby enemy, capped at 4', c6 > c1 && Math.abs(c6 - c1 - PTREE['1t'].fx.crowdDmg / 100 * 3) < 1e-9, [c1, c6]);
  G.mobs = [m];
  // เพดานรวม: ATK% คงที่ + มีเงื่อนไข ≤ PCAP.atkPct
  pl.passives = all.slice(); recalc(); pl.hp = Math.floor(pl.d.maxHp * 0.3);
  for (let i = 0; i < 4; i++) { const e = spawnMob('pudding', { x: Math.floor(pl.x) + (i % 2), y: Math.floor(pl.y) + 1 }); e.state = 'chase'; }
  const capped = Passive.dmgMul(m, 'phys');
  ok('combined cap: static + conditional damage ≤ +20% total', pl.d.pAtkPct > 0 && Math.abs(capped - (1 + (PCAP.atkPct - pl.d.pAtkPct) / 100)) < 1e-9, [pl.d.pAtkPct, capped]);
  G.mobs = [m];
  // Frenzy Drive: ฆ่าแล้ว ASPD เร็วขึ้นชั่วคราว
  pl.passives = []; give('1k'); const ad0 = pl.d.aspdDelay;
  const k1 = spawnMob('pudding', { x: Math.floor(pl.x) + 1, y: Math.floor(pl.y) }); killMob(k1); updateGame(1 / 30);
  const ad1 = pl.d.aspdDelay; G.time += 6; updateGame(1 / 30); const ad2 = pl.d.aspdDelay;
  ok('Frenzy Drive: faster attacks for a few seconds after a kill', ad1 < ad0 && ad2 === ad0, [ad0, ad1, ad2]);
  // Repair Protocol: ฆ่าแล้วฟื้น HP
  pl.job = 'einherjar'; pl.passives = []; give('0t'); pl.hp = Math.floor(pl.d.maxHp / 2); const hp0 = pl.hp;
  killMob(spawnMob('pudding', { x: Math.floor(pl.x) + 1, y: Math.floor(pl.y) }));
  ok('Repair Protocol: heals on kill', pl.hp > hp0, [hp0, pl.hp]);
  // Shield Wall: ยืนนิ่ง ≥ 1 วิ ดาเมจที่โดนลดลง
  pl.passives = []; give('0j'); pl.path = []; pl.pv_still = G.time - 5; const tw = Passive.takenMul(); pl.pv_still = G.time; const tw2 = Passive.takenMul();
  ok('Shield Wall: less damage taken while standing still', tw < 1 && tw2 === 1, [tw, tw2]);
  // Bulwark Frame: ไม่มึน, FLEE 0, ยิ่งมอนรุมยิ่งโดนเบา
  pl.passives = []; give('0o'); G.mobs = [];
  const t0b = Passive.takenMul();
  for (let i = 0; i < 4; i++) { const e = spawnMob('pudding', { x: Math.floor(pl.x) + (i % 2), y: Math.floor(pl.y) + 1 }); e.state = 'chase'; }
  const t4b = Passive.takenMul();
  ok('Bulwark Frame: never stunned, FLEE 0, takes less damage when swarmed', pl.d.unshaken && pl.d.flee === 0 && t0b === 1 && t4b < 1, [t0b, t4b]);
  G.mobs = [];
  // Phantom Code: ฆ่าแล้วตีปกติครั้งถัดไปคริแน่นอน (ครั้งเดียว)
  pl.job = 'trickster'; pl.passives = []; give('2o');
  killMob(spawnMob('pudding', { x: Math.floor(pl.x) + 1, y: Math.floor(pl.y) }));
  const pc1 = Passive.takeCrit(), pc2 = Passive.takeCrit();
  ok('Phantom Code: sure crit once after a kill, DEF halved', pc1 && !pc2 && pl.d.phantom, [pc1, pc2]);
  // Ghost Protocol: หลบได้ → ตีถัดไปแรงขึ้น
  pl.passives = []; give('2j'); const g0 = Passive.dmgMul(m, 'phys'); Passive.onDodge(); const g1 = Passive.dmgMul(m, 'phys'); Passive.consumeHit(); const g2 = Passive.dmgMul(m, 'phys');
  ok('Ghost Protocol: next hit after a dodge is stronger (once)', g1 > g0 && g2 === g0, [g0, g1, g2]);
  // Elemental Focus: ธาตุชนะเท่านั้น
  pl.job = 'runecaster'; pl.passives = []; give('4q'); m.hp = 10;
  const e1 = Passive.dmgMul(m, 'magic', 1.5), e2 = Passive.dmgMul(m, 'magic', 1);
  ok('Elemental Focus: only vs a weak element', e1 > 1 && e2 === 1, [e1, e2]);
  // Blood Circuit: HP < 50% = เวทแรงขึ้น • ใช้ HP แทน SP (×2) ไม่แตะ SP
  pl.passives = []; give('4o'); pl.hp = Math.floor(pl.d.maxHp * 0.3); const b1 = Passive.dmgMul(m, 'magic', 1); pl.hp = pl.d.maxHp; const b2 = Passive.dmgMul(m, 'magic', 1);
  const sp0 = pl.sp, hp0b = pl.hp; paySkill(10);
  ok('Blood Circuit: skills cost HP (same % of max, no SP), spells stronger below 50% HP', pl.d.bloodmagic && b1 > 1 && b2 === 1 && pl.sp === sp0 && hp0b - pl.hp === bloodCost(10) && bloodCost(10) === Math.max(1, Math.ceil(10 * pl.d.maxHp / pl.d.maxSp * PTREE['4o'].fx.hpCost)), [b1, b2, hp0b - pl.hp]);
  // Quick Glyph: ฆ่าแล้วร่ายครั้งถัดไปเร็วขึ้น (ครั้งเดียว)
  pl.job = 'runecaster'; pl.passives = []; give('4j'); killMob(spawnMob('pudding', { x: Math.floor(pl.x) + 1, y: Math.floor(pl.y) }));
  const q1 = Passive.castMul(), q2 = Passive.castMul();
  ok('Quick Glyph: next cast after a kill is faster (once)', q1 < 1 && q2 === 1, [q1, q2]);
  // Healing Light / Mind over Matter: ฮีลแรงขึ้นตามเงื่อนไข
  pl.job = 'volva'; pl.passives = []; give('5j'); pl.hp = pl.d.maxHp; updateGame(1 / 30); const h1 = pl.d.healPct; pl.hp = Math.floor(pl.d.maxHp * 0.3); updateGame(1 / 30); const h2 = pl.d.healPct;
  ok('Healing Light: stronger heals below 50% HP', h2 > h1, [h1, h2]);
  // 4) เซฟเก่า: id เดิมโหลดได้ครบ แต้มไม่หาย + ได้รีเซ็ตฟรี 1 ครั้ง • ข้อมูลเสียถูกตัด
  const oldIds = ['1a', '1b', '1c', '1e', '1g', '1i', '1k', '1m2', '1n', '1n2', '1o', 'in0', '0a', '0b', 'out1'];
  const old = Object.assign({}, S0, { name: 'OldTree', job: 'berserker', baseLv: 40, passives: oldIds.concat(['gone_node', '__proto__', 7]), ptV: undefined, ptReset: undefined });
  delete old.ptV; delete old.ptReset;
  const L1 = loadGameFrom(JSON.parse(JSON.stringify(old)));
  ok('old save: allocated node ids load unchanged, junk dropped', L1 && JSON.stringify(L1.passives) === JSON.stringify(oldIds), L1 && L1.passives);
  ok('old save: no points lost (free = total − kept)', Passive.free(L1) === Passive.total(L1) - oldIds.length && Passive.total(L1) === 39, Passive.free(L1));
  ok('old save: one free full reset granted (rework)', L1.ptV === PASSIVE_VER && L1.ptReset === 1);
  const z0 = L1.zeny; Passive.resetAll(L1);
  ok('free reset: refunds every point, costs nothing, used once', L1.passives.length === 0 && Passive.free(L1) === 39 && L1.zeny === z0 && L1.ptReset === 0);
  const back = loadGameFrom(JSON.parse(JSON.stringify(saveData())));
  ok('save round-trip: version + reset flag persist (no second free reset)', back.ptV === PASSIVE_VER && back.ptReset === 0);
  const fresh = loadGameFrom(Object.assign({}, S0, { name: 'NewTree', passives: [] }));
  ok('new/empty save: no free reset needed', fresh.ptReset === 0 || fresh.ptReset === undefined);
  // แต้มเกิน (เซฟแปลก ๆ) → ไม่ตัดทิ้ง แต่ต่อแกนไม่ได้ = ตัดเฉพาะจุดที่ลอย (คืนแต้ม)
  const floating = loadGameFrom(Object.assign({}, S0, { name: 'Float', baseLv: 20, passives: ['1a', '1b', '3o'] }));
  ok('old save: disconnected nodes refunded, connected kept', JSON.stringify(floating.passives) === '["1a","1b"]', floating.passives);
  ok('SAVE_KEY untouched', SAVE_KEY === 'ragnarok_web_save_v2' && SAVE_FIELDS.includes('passives'));
  // 5) PvP กติกาเดียว: เป้าที่เป็นผู้เล่นก็นับเงื่อนไขเหมือนมอน
  G.player = pl;
  pl.job = 'wildhunter'; pl.passives = []; give('3q'); recalc();
  const foe = { isPlayer: true, hp: 500, maxHp: 500, x: pl.x + 2, y: pl.y, def: { id: 'pvp_x', lv: 30, element: 'neutral' } };
  ok('PvP: same rule (first hit on a full-HP player counts)', Passive.dmgMul(foe, 'phys') > 1);
  // คืนตัวละครเดิม
  G.player = loadGameFrom(JSON.parse(JSON.stringify(S0))); G.mobs = []; recalc();
  return out;
}

// หน้าต่าง Passive: เมเตอร์เพดานแบบ minimal + ปุ่มแบบ A (theme7) + ข้อความ "Class"
async function uiChecks() {
  const out = [], ok = (name, cond, info = '') => out.push([name, !!cond, typeof info === 'string' ? info : JSON.stringify(info)]);
  const pl = G.player, wait = ms => new Promise(r => setTimeout(r, ms));
  window.saveGame = () => {};
  pl.job = 'berserker'; pl.baseLv = 45; pl.passives = [];
  const route = id => { const pr = { [id]: null }, q = [id]; while (q.length) { const c = q.shift(); if (Passive.has(pl, c)) { const o = []; for (let x = pr[c]; x; x = pr[x]) o.push(x); return o; } for (const l of PTREE[c].links) if (!(l in pr)) { pr[l] = c; q.push(l); } } return []; };
  for (const id of ['1o', '1q', '1t', '1k']) for (const x of route(id)) if (Passive.free(pl) > 0) pl.passives.push(x);
  pl.ptReset = 1; recalc();
  document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden'));
  UI.tree.sel = '1o'; UI.open('w-tree'); await wait(400);
  const w = document.querySelector('#w-tree');
  const meters = [...w.querySelectorAll('.pt-cap')];
  const atk = meters.find(x => x.dataset.k === 'atkPct');
  ok('window: cap meters shown (ATK% n/20)', meters.length >= 3 && atk && /\d+\/20/.test(atk.textContent), meters.map(x => x.textContent).join(' | '));
  const r = w.getBoundingClientRect();
  ok('window: fits the screen', r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0, [r.left, r.right, innerWidth]);
  ok('window: keystone detail shows its condition', /below 50% HP|HP < 50%|ต่ำกว่า 50%/.test(w.querySelector('#pt-info').textContent), w.querySelector('#pt-info').textContent.slice(0, 120));
  const rb = w.querySelector('.pt-reset');
  ok('window: one-time free reset button (button style A)', rb && getComputedStyle(rb).borderRadius !== '0px', rb && getComputedStyle(rb).borderRadius);
  ok('window: no คลาส/อาชีพ wording', !/คลาส|อาชีพ/.test(w.textContent));
  return out;
}
