'use strict';
// ============================================================
//  จำลองบอทล่ามอน (เร่งเวลา) เพื่อดูสมดุล — เปิดเซิร์ฟเวอร์เอง (หรือ BASE=http://localhost:พอร์ต/index.html)
//
//  โหมดเดิม (Keystone): ทุก Class × ทุก Keystone ที่ Lv 30 ใน Wolfwood
//    NODE_PATH=$(npm root -g) node tests/balance_sim.js . <วินาที> [Class,Class]
//
//  โหมดเส้นเลเวล (CURVE=1): ทุก Class 1 (C2=1 = Class 2 ด้วย) ที่หลายเลเวล ใส่ของ "ตามเลเวล"
//    (ดีที่สุดต่อช่องจากของ common/uncommon ที่ Lv ≤ เรา, อาวุธตามสาย Class, +0) สเตตัสตามแต้มจริงถึงเลเวลนั้น
//    1) ดวล: มอนทีละตัว (เลือดเต็มทุกตัว) → เวลาฆ่า (TTK) • ดาเมจที่โดน %MaxHP ต่อนาทีที่สู้ • ตีโดน%
//       – เส้นมอน "เลเวลเท่าเรา" ทุกแมพ Lv 36–69 + มอน Nidhogg's Hollow ทั้ง 5 ที่ Lv 58/64/70
//    2) ฟาร์ม: บอทล่าในแมพ (ตามตาราง FARM) → EXP/ชม. • ชม./เลเวล • Zeny/ชม. (เงินจากมอน + ราคาขายครึ่งหนึ่งของของที่เก็บได้)
//    CURVE=1 [FARM=วินาที] [DUEL=ตัวต่อมอน] [ONLY=duel|farm] NODE_PATH=$(npm root -g) node tests/balance_sim.js . 0 [Class,Class]
//
//  โหมด Class 3 (C3=1): Class 3 เทียบ Class 2 ต้นสาย ที่เลเวล/ของ/สเตตัสเท่ากัน (Job 26 ทั้งคู่ • Class 3 ลงแต้ม 25 ตาม Class Book)
//    ดวลเดี่ยวมอนบทที่ 7 (เลือด ×HPX=4 ให้ไฟต์ยาวพอวัด) + ฝูง 4 ตัวพร้อมกัน (×HPX/2) ที่ Lv 70/80/90 → เวลาฆ่า (เป้า: Class 3 เร็วขึ้น 15–25% — docs/CLASS3_DESIGN.md §4)
//    C3=1 [DUEL=ตัวต่อมอน] [C3LV=70,80,90] NODE_PATH=$(npm root -g) node tests/balance_sim.js
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
  const srv = process.env.BASE ? null : await serve();
  const url = process.env.BASE || `http://localhost:${srv.address().port}/index.html`;
  const b = await chromium.launch({ channel: process.platform === 'win32' ? 'chrome' : undefined, executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://**/*', r => r.abort());
  await p.goto(url); await p.waitForTimeout(1000);
  await p.click('#au-offline'); await p.click('#btn-new'); await p.fill('#cr-name', 'Sim'); await p.click('#cr-start');
  await p.waitForFunction(() => G.started, null, { timeout: 15000 }); await p.waitForTimeout(500);
  if (process.env.BALANCE) await balance(p); else if (process.env.C3) await c3mode(p); else if (process.env.CURVE) await curve(p); else await keystones(p);
  console.log('errors:', errs.slice(0, 5)); await b.close(); if (srv) srv.close();
})();

// Reproducible production-point audit: same Base level, 25 points per tier,
// level-appropriate +0 common/uncommon gear, no potions, no GM bonuses.
async function balance(p) {
  if(process.env.BASELINE) await p.evaluate(()=>{
    ClassTraits.enabled=false;
    SKILLS.spear_of_valhalla.dmg.mult=lv=>2.8+.5*lv;
    SKILLS.judgment_quake.dmg.mult=lv=>1.7+.35*lv;
    SKILLS.arrow_storm.dmg.mult=lv=>1.8+.35*lv;SKILLS.arrow_storm.dmg.area=2;
    SKILLS.frost_arrow.dmg.mult=lv=>2.4+.5*lv;
  });
  const jobs = process.argv[4] ? process.argv[4].split(',') : await p.evaluate(() => Object.keys(JOBS).filter(j => j !== 'novice'));
  const cfg = {AUDIT:1, C3:1, DUEL_N:6, ONLY:'duel', HPX:1, CURVE_MOBS:[],
    CH7_LVS:[70], CH7_MOBS:['nid_spawn','nidhogg'], PACK:['rust_bloom'], PACK_N:5, FARM:[]};
  const out=[];
  for (const job of jobs) {const r=await p.evaluate(simCurve,{job,cfg});out.push(r);printJob(r);}
  if(process.env.JSON) fs.writeFileSync(process.env.JSON,JSON.stringify(out,null,2));
}

// ------------------------------------------------------------
//  โหมดเดิม: Keystone ที่ Lv 30 (Wolfwood)
// ------------------------------------------------------------
async function keystones(p) {
  const SECS = +process.argv[3] || 240;
  await p.evaluate(j => { window.SIM_JOBS = j ? j.split(',') : null; window.SIM_KEYS = j ? [null] : null; }, process.argv[4] || '');
  const res = await p.evaluate(async SECS => {
    G.player.options.sound = false; UI.msg = () => {}; UI.announce = () => {}; UI.splash = () => {}; saveGame = () => {};
    const jobs = (window.SIM_JOBS || Object.keys(JOBS).filter(j => j !== 'novice'));
    const keys = window.SIM_KEYS || [null, ...PSECT.map((S, i) => i)];
    const st = {}; const ah = applyHit; applyHit = (m, r, o) => { st.hits = (st.hits || 0) + (r.miss ? 0 : 1); st.miss = (st.miss || 0) + (r.miss ? 1 : 0); st.dmg = (st.dmg || 0) + (r.dmg || 0); return ah(m, r, o); };
    const es = executeSkill; executeSkill = (id, lv, t) => { st.casts = (st.casts || 0) + 1; return es(id, lv, t); };
    const out = [];
    const pathTo = (pl, id) => { const pr = { [id]: null }, q = [id]; while (q.length) { const c = q.shift(); if (Passive.has(pl, c)) { const o = []; for (let x = pr[c]; x; x = pr[x]) o.push(x); return o; } for (const l of PTREE[c].links) if (!(l in pr)) { pr[l] = c; q.push(l); } } return []; };
    for (const job of jobs) {
      const home = PSECT.findIndex(S => S.job === job);
      for (const ks of keys) {
        const pl = newPlayer('Sim', 'f', '#ccc'); pl.options.sound = false; G.player = pl;
        pl.baseLv = 30; pl.jobLv = 10; changeJob(job); pl.jobLv = 30; pl.skillPoints = 40;
        for (const id of JOBS[job].skills) while (canLearn(id)) learnSkill(id);
        // สเตตัสตามแนะนำ (2 ค่าหลักสลับกัน แล้ว VIT นิดหน่อย)
        const main = JOBS[job].stats.toLowerCase().split('/').map(x => x.trim());
        pl.statPoints = 400; let k = 0, guard = 0;
        while (guard++ < 500) { const s = k % 5 === 4 ? 'vit' : main[k % 2]; k++; if (pl.statPoints < statCost(pl.stats[s])) break; raiseStat(s); }
        // พาสซีฟ: ไป keystone ที่เลือก แล้วใช้แต้มที่เหลือในแฉกของอาชีพตัวเอง (ใกล้แกนก่อน)
        pl.passives = [];
        if (ks != null) for (const id of pathTo(pl, `${ks}o`)) Passive.alloc(pl, id);
        const own = Object.values(PTREE).filter(n => n.sect === home && n.kind !== 'key').sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
        for (const n of own) { if (Passive.free(pl) <= 0) break; for (const id of pathTo(pl, n.id)) Passive.alloc(pl, id); }
        for (const e of [['padded_plate', 1], ['red_potion', 0], ['orange_potion', 40], ['blue_potion', 15]]) if (e[1]) addItem(e[0], e[1], true);
        const pa = pl.inventory.find(x => x.id === 'padded_plate'); if (pa) equipItem(pa, true);
        recalc(); pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp;
        pl.options.bot = Object.assign(Bot.defaults(), { returnHome: false });
        changeMap('wolfwood', 28.5, 28.5);
        Bot.toggle(true);
        for (const k in st) delete st[k]; let deaths = 0, t = 0; const pots0 = countItem('orange_potion');
        G.fastSim = true;
        while (t < SECS) {
          updateGame(1 / 15); t += 1 / 15;
          if (pl.dead) { deaths++; respawnPlayer(true); pl.hp = pl.d.maxHp; pl.x = 28.5; pl.y = 28.5; Bot.toggle(true); }
        }
        G.fastSim = false; Bot.toggle(false);
        const s = Bot.stats;
        out.push({ hits: st.hits || 0, miss: st.miss || 0, dmg: st.dmg || 0, casts: st.casts || 0, hit: pl.d.hit, aspd: pl.d.aspdDelay, atk: pl.d.statusAtk + pl.d.weaponAtk, str: pl.d.str, agi: pl.d.agi, job, ks: ks == null ? '-' : PSECT[ks].key[0], kills: s.kills, deaths, pots: pots0 - countItem('orange_potion'), maxHp: pl.d.maxHp, atkPct: pl.d.atkPct, flee: pl.d.flee, def: pl.d.def });
      }
    }
    return out;
  }, SECS);
  const byJob = {};
  for (const r of res) (byJob[r.job] = byJob[r.job] || []).push(r);
  for (const [job, rows] of Object.entries(byJob)) {
    console.log('\n' + job);
    for (const r of rows) { console.log(`  hits ${r.hits} miss ${r.miss} dmg/hit ${Math.round(r.dmg/Math.max(1,r.hits))} casts ${r.casts} HIT ${r.hit} aspd ${r.aspd} ATK ${r.atk} STR ${r.str} AGI ${r.agi}`); console.log(`  ${r.ks.padEnd(17)} kills ${String(r.kills).padStart(3)}  deaths ${r.deaths}  pots ${String(r.pots).padStart(2)}  HP ${r.maxHp}  FLEE ${r.flee}  DEF ${r.def}  ATK% ${r.atkPct}`); }
  }
}

// ------------------------------------------------------------
//  โหมดเส้นเลเวล (CURVE=1)
// ------------------------------------------------------------
async function curve(p) {
  const C1 = ['einherjar', 'runecaster', 'wildhunter', 'volva', 'trickster', 'berserker'];
  const jobs = process.argv[4] ? process.argv[4].split(',') : process.env.C2 ? C1.concat(['valkyrie', 'hersir', 'galdr', 'seidr', 'skadi', 'ullr', 'norn', 'gythja', 'phantom', 'skald', 'warlord', 'jotun']) : C1;
  const cfg = {
    FARM_SECS: +process.env.FARM || 600, DUEL_N: +process.env.DUEL || 4, ONLY: process.env.ONLY || '',
    // ฟาร์ม: [เลเวลเรา, แผนที่]
    FARM: (process.env.FARMPTS || '15:mistlake,30:wolfwood,45:helcave,45:archive,50:roots,55:roots,58:roots,58:abyss,64:abyss,70:abyss').split(',').map(s => { const [l, m] = s.split(':'); return [+l, m]; }),
    // ดวลมอนเลเวลเท่าเรา (เส้นเดิม → บทที่ 7)
    CURVE_MOBS: ['archive_warden', 'archive_maiden', 'rust_draugr', 'root_crawler', 'gnawed_stump', 'gnawed_brute', 'root_gnawer', 'rust_bloom', 'hollow_shell', 'nid_spawn', 'rootbound_guard', 'rot_colossus'],
    CH7_LVS: [58, 64, 70], CH7_MOBS: ['rust_bloom', 'hollow_shell', 'nid_spawn', 'rootbound_guard', 'rot_colossus'],
  };
  const out = [];
  for (const job of jobs) {
    const r = await p.evaluate(simCurve, { job, cfg });
    out.push(r);
    printJob(r);
  }
  // สรุปรวมทุก Class (ค่าเฉลี่ย)
  console.log('\n===== เฉลี่ยทุก Class =====');
  const avg = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  console.log('ดวลมอนเลเวลเท่าเรา:  mob(Lv)            TTK(s)  dmg%HP/min  hit%  dmg%HP/kill');
  for (const k of Object.keys(out[0].duelCurve)) {
    const rows = out.map(r => r.duelCurve[k]).filter(Boolean);
    console.log(`  ${k.padEnd(28)} ${avg(rows.map(x => x.ttk)).toFixed(1).padStart(6)} ${avg(rows.map(x => x.dmgPctMin)).toFixed(0).padStart(10)} ${avg(rows.map(x => x.hitPct)).toFixed(0).padStart(5)} ${avg(rows.map(x => x.dmgPctKill)).toFixed(0).padStart(11)}`);
  }
  console.log('ดวลมอนบทที่ 7:');
  for (const k of Object.keys(out[0].duelCh7)) {
    const rows = out.map(r => r.duelCh7[k]).filter(Boolean);
    console.log(`  ${k.padEnd(28)} ${avg(rows.map(x => x.ttk)).toFixed(1).padStart(6)} ${avg(rows.map(x => x.dmgPctMin)).toFixed(0).padStart(10)} ${avg(rows.map(x => x.hitPct)).toFixed(0).padStart(5)} ${avg(rows.map(x => x.dmgPctKill)).toFixed(0).padStart(11)}`);
  }
  console.log('ฟาร์ม:  Lv map        EXP/h      h/level  kills/h  deaths/h  zeny/h(kill+sell)  etc-only  pots/h');
  for (const k of Object.keys(out[0].farm)) {
    const rows = out.map(r => r.farm[k]).filter(Boolean);
    console.log(`  ${k.padEnd(12)} ${Math.round(avg(rows.map(x => x.expH))).toString().padStart(9)} ${avg(rows.map(x => x.hPerLv)).toFixed(2).padStart(9)} ${Math.round(avg(rows.map(x => x.killsH))).toString().padStart(8)} ${avg(rows.map(x => x.deathsH)).toFixed(1).padStart(8)} ${Math.round(avg(rows.map(x => x.zenyH))).toString().padStart(18)} ${Math.round(avg(rows.map(x => x.zenyEtcH))).toString().padStart(9)} ${Math.round(avg(rows.map(x => x.potsH))).toString().padStart(7)}`);
  }
  if (process.env.JSON) fs.writeFileSync(process.env.JSON, JSON.stringify(out, null, 1));
}
// ------------------------------------------------------------
//  โหมด Class 3 (C3=1)
// ------------------------------------------------------------
async function c3mode(p) {
  const pairs = (process.env.C3PAIRS || 'galdr:runelord,warlord:packlord').split(',').map(x => x.split(':'));
  const lvs = (process.env.C3LV || '70,80,90').split(',').map(Number);
  const cfg = { FARM_SECS: 0, DUEL_N: +process.env.DUEL || 4, ONLY: 'duel', C3: 1, HPX: +process.env.HPX || 4, C3LVS: lvs, CURVE_MOBS: [], CH7_LVS: lvs, CH7_MOBS: ['rust_bloom', 'nid_spawn', 'rootbound_guard', 'rot_colossus'], PACK: ['nid_spawn', 'rust_bloom'], FARM: [] };
  const res = {};
  for (const [c2, c3] of pairs) for (const job of [c2, c3]) { res[job] = await p.evaluate(simCurve, { job, cfg }); printJob(res[job]); }
  const avg = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  console.log('\n===== Class 3 vs Class 2 (Lv/ของ/สเตตัสเท่ากัน • Job 26 ทั้งคู่) — เวลาฆ่า (วินาที) ยิ่งน้อยยิ่งดี =====');
  for (const [c2, c3] of pairs) {
    console.log(`\n${c2} → ${c3}`);
    for (const lv of lvs) {
      const pick = (r, pre) => Object.entries(r).filter(([k]) => k.startsWith(`Lv${lv} `) && k.includes(pre)).map(([, v]) => v);
      const s2 = pick(res[c2].duelCh7, 'vs'), s3 = pick(res[c3].duelCh7, 'vs'), k2 = pick(res[c2].duelPack, 'pack'), k3 = pick(res[c3].duelPack, 'pack');
      const t2 = avg(s2.map(x => x.ttk)), t3 = avg(s3.map(x => x.ttk)), q2 = avg(k2.map(x => x.ttk)), q3 = avg(k3.map(x => x.ttk));
      const d2 = avg(s2.map(x => x.dmgPctKill)), d3 = avg(s3.map(x => x.dmgPctKill));
      console.log(`  Lv${lv}  single TTK ${t2.toFixed(1)}s → ${t3.toFixed(1)}s (${((t3 / t2 - 1) * 100).toFixed(0)}%)   pack(4) clear ${q2.toFixed(1)}s → ${q3.toFixed(1)}s (${((q3 / q2 - 1) * 100).toFixed(0)}%)   dmg taken/kill ${d2.toFixed(0)}% → ${d3.toFixed(0)}% HP`);
    }
  }
  if (process.env.JSON) fs.writeFileSync(process.env.JSON, JSON.stringify(res, null, 1));
}
function printJob(r) {
  console.log(`\n=== ${r.job} ===`);
  const line = (k, x) => console.log(`  ${k.padEnd(28)} TTK ${(x.ttk == null ? 'FAIL' : x.ttk.toFixed(1)).padStart(5)}s  dmg ${String(x.dmgPctMin).padStart(4)}%HP/min  ${String(x.dmgPctKill).padStart(3)}%HP/kill  hit ${x.hitPct}%  deaths ${x.deaths}  (HP ${x.maxHp} ATK ${x.atk} MATK ${x.matk} DEF ${x.def} FLEE ${x.flee})`);
  for (const k in r.duelCurve) line(k, r.duelCurve[k]);
  for (const k in r.duelCh7) line(k, r.duelCh7[k]);
  for (const k in r.duelPack || {}) line(k, r.duelPack[k]);
  if (process.env.SRC && r.src) { const tot = Object.values(r.src).reduce((x, y) => x + y, 0) || 1; console.log('  dmg by source: ' + Object.entries(r.src).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k} ${(v / tot * 100).toFixed(0)}%`).join(' · ')); }
  for (const k in r.farm) { const x = r.farm[k]; console.log(`  farm ${k.padEnd(12)} EXP/h ${String(x.expH).padStart(8)}  ${x.hPerLv.toFixed(2)} h/lv  kills/h ${x.killsH}  deaths/h ${x.deathsH.toFixed(1)}  zeny/h ${x.zenyH} (etc ${x.zenyEtcH}, gear ${x.zenyGearH}, kill ${x.zenyKillH})  pots/h ${x.potsH}  dmgTaken ${x.dmgPctMin}%HP/min`); }
}

// รันในหน้าเกม: Class เดียว ทุกจุดเลเวล
async function simCurve({ job, cfg }) {
  G.player.options.sound = false; UI.msg = () => {}; UI.announce = () => {}; UI.splash = () => {}; saveGame = () => {};
  if (typeof WB !== 'undefined') WB.tick = () => {};
  const root = jobRoot(job), tier = JOBS[job].tier || 1, c2 = tier === 3 ? JOBS[job].parent : tier === 2 ? job : null, tier2 = !!c2;
  const pathTo = (pl, id) => { const pr = { [id]: null }, q = [id]; while (q.length) { const c = q.shift(); if (Passive.has(pl, c)) { const o = []; for (let x = pr[c]; x; x = pr[x]) o.push(x); return o; } for (const l of PTREE[c].links) if (!(l in pr)) { pr[l] = c; q.push(l); } } return []; };
  // สเตตัส/อาวุธตามสาย (สาย Class 2 ที่สไตล์ต่างจาก Class แรกตาม tests/job2_audit.js)
  const PLAN = { einherjar: ['str', 'vit'], runecaster: ['int', 'dex'], wildhunter: ['dex', 'agi'], volva: ['int', 'vit'], trickster: ['agi', 'str'], berserker: ['str', 'agi'], gythja: ['str', 'vit'], ullr: ['dex', 'luk'], skald: ['agi', 'dex'], jotun: ['str', 'vit'] };
  const plan = PLAN[job] || PLAN[c2] || PLAN[root];
  const WT = { einherjar: 'sword', runecaster: 'rod', wildhunter: 'bow', volva: 'rod', trickster: 'dagger', berserker: 'axe', gythja: 'mace' };
  const wtype = WT[job] || WT[c2] || WT[root], magic = plan[0] === 'int';
  const RANK = { common: 0, uncommon: 1, rare: 2, epic: 3, legend: 4 };
  const bScore = b => Object.entries(b || {}).reduce((a, [k, v]) => a + (+v || 0) * (/^(hp|sp)$/.test(k) ? 0.04 : /Pct$/.test(k) ? 3 : 1.5), 0);
  const score = it => (magic ? (it.matk || 0) * 1.5 + (it.atk || 0) * 0.2 : (it.atk || 0)) + (it.def || 0) * 4 + (it.mdef || 0) * 2 + bScore(it.b);
  const statPts = lv => { let s = 48; for (let l = 2; l <= lv; l++) s += statPointsForLevel(l); return s; };
  const j2lv = lv => Math.max(1, Math.min(26, Math.round((lv - 30) * 0.6)));

  const build = lv => {
    const pl = newPlayer('Sim', 'f', '#ccc'); pl.options.sound = false; G.player = pl;
    pl.baseLv = lv; pl.jobLv = 10; pl.skillPoints = 0; changeJob(root); pl.jobLv = 26; pl.skillPoints = 25;
    for (const id of JOBS[root].skills) while (canLearn(id)) learnSkill(id);
    if (tier2) {
      changeJob(c2); pl.jobLv = cfg.C3 ? 26 : j2lv(lv); pl.skillPoints = Math.max(0, totalSkillPoints(pl) - lineSkillsSpent(pl));
      for (const id of JOBS[c2].skills) while (canLearn(id)) learnSkill(id);
      for (const id of JOBS[root].skills) while (canLearn(id)) learnSkill(id);
    }
    if (tier === 3) { // Class 3: Job 26 = 25 แต้มสำหรับ 6 สกิล — ลงตามลำดับใน Class Book (ต้องเลือก ไม่ได้ครบทุกตัว)
      changeJob(job); pl.jobLv = 26; pl.skillPoints = Math.max(0, totalSkillPoints(pl) - lineSkillsSpent(pl));
      const order = (typeof CLASSBOOK !== 'undefined' && CLASSBOOK[job] && CLASSBOOK[job].build) || JOBS[job].skills.map(id => [id, 5]);
      for (const [id, n] of order) while (canLearn(id) && (pl.skills[id] || 0) < n) learnSkill(id);
      for (const id of JOBS[job].skills) while (canLearn(id)) learnSkill(id);
    }
    pl.statPoints = statPts(lv); let k = 0, guard = 0;
    while (guard++ < 3000) { const s = k % 5 === 4 ? 'vit' : plan[k % 2]; k++; if (pl.statPoints < statCost(pl.stats[s])) { if (pl.statPoints < 2) break; continue; } raiseStat(s); }
    pl.passives = [];
    const home = PSECT.findIndex(S => S.job === root);
    const own = Object.values(PTREE).filter(n => n.sect === home && n.kind !== 'key').sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
    for (const n of own) { if (Passive.free(pl) <= 0) break; for (const id of pathTo(pl, n.id)) Passive.alloc(pl, id); }
    // ของตามเลเวล: common/uncommon ที่ Lv ≤ เรา ดีที่สุดต่อช่อง (อาวุธตามสาย) • +0 ไม่มีชิป
    for (const s in pl.equip) pl.equip[s] = null;
    pl.inventory = [];
    const cand = Object.values(ITEMS).filter(it => isEquipType(it) && !it.quest && (RANK[it.rarity || 'common'] || 0) <= 1 && (!it.lv || it.lv <= lv) && canJobUse(it.jobs, pl.job)
      && (it.slot !== 'weapon' || it.wtype === wtype) && !(it.slot === 'shield' && wtype === 'bow'));
    const bySlot = {};
    for (const it of cand) (bySlot[it.slot] = bySlot[it.slot] || []).push(it);
    const gear = [];
    for (const s in bySlot) {
      const best = bySlot[s].sort((a, b) => score(b) - score(a)).slice(0, s === 'acc' ? 2 : 1);
      for (const it of best) { addItem(it.id, 1, true); equipItem(pl.inventory.find(x => x.id === it.id), true); gear.push(it.id); }
    }
    for (const e of cfg.AUDIT ? [] : [['white_potion', 400], ['orange_potion', 200], ['blue_potion', 200], ['green_herb', 50]]) if (ITEMS[e[0]]) addItem(e[0], e[1], true);
    recalc(); pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp;
    pl.options.bot = Object.assign(Bot.defaults(), { returnHome: false, avoidMvp: !cfg.AUDIT, rest: !cfg.AUDIT });
    pl._gear = gear;
    return pl;
  };
  const potsOf = () => countItem('white_potion') + countItem('orange_potion');
  const spotOf = () => { const M = G.map, cx = M.w >> 1, cy = M.h >> 1; let best = null; for (let y = 3; y < M.h - 3; y++) for (let x = 3; x < M.w - 3; x++) { if (!M.walkable(x, y)) continue; let ok = true; for (let dy = -2; dy <= 2 && ok; dy++) for (let dx = -2; dx <= 2 && ok; dx++) if (!M.walkable(x + dx, y + dy)) ok = false; if (ok && (!best || Math.hypot(x - cx, y - cy) < Math.hypot(best[0] - cx, best[1] - cy))) best = [x, y]; } return best; };
  const mapOfMob = id => Object.keys(MAP_DEFS).find(k => MAP_DEFS[k].mvp === id || (MAP_DEFS[k].spawns || []).some(s => s[0] === id));

  // ตัวนับ (ห่อฟังก์ชันเกมครั้งเดียว)
  const T = { exp: 0, loot: 0, lootEtc: 0, lootGear: 0, dmg: 0, hits: 0, miss: 0, on: false, ttk: {}, src: {} };
  const ge = gainExp; gainExp = function (b0) { if (T.on) T.exp += b0; if(cfg.AUDIT)return; return ge.apply(this, arguments); };
  const ps=paySkill;paySkill=function(cost){if(T.on)T.spUsed=(T.spUsed||0)+cost;return ps.apply(this,arguments);};
  const rng=Math.random;
  const seed = n => {let v=n;Math.random=()=>{v=(Math.imul(v,1664525)+1013904223)>>>0;return v/4294967296;};};
  const ai = addItem; addItem = function (id, qty = 1) { if (T.on && ITEMS[id]) { const v = Math.floor(ITEMS[id].price / 2) * qty; T.loot += v; if (isEquipType(ITEMS[id])) T.lootGear += v; else if (ITEMS[id].type === 'etc') T.lootEtc += v; } return ai.apply(this, arguments); };
  const dp = damagePlayer; damagePlayer = function (dmg) { if (T.on && !G.player.dead && dmg > 0) T.dmg += dmg; return dp.apply(this, arguments); };
  const ah = applyHit; applyHit = function (m, r) { if (T.on && r) { if (r.miss) T.miss++; else T.hits++; } return ah.apply(this, arguments); };
  const dmf = damageMob; damageMob = function (m, dmg, opts) { if (T.on && m && !m._t0) m._t0 = G.time; if (T.on && !m.isPlayer) { const k = (opts && opts.src) || '?'; T.src[k] = (T.src[k] || 0) + (+dmg || 0); } return dmf.apply(this, arguments); }; // SRC=1: ดาเมจแยกตามแหล่ง
  const km = killMob; killMob = function (m) { if (T.on && m._t0) (T.ttk[m.def.id] = T.ttk[m.def.id] || []).push(G.time - m._t0); return km.apply(this, arguments); };

  // ดวล: มอนทีละตัว เลือดเต็มทุกรอบ
  const duel = (lv, mobId) => {
    let pl = build(lv); const map = mapOfMob(mobId);
    changeMap(map, 1, 1); G.mobs = []; G.respawns = []; G.drops = [];
    const sp = spotOf(); teleportPlayer(sp[0] + 0.5, sp[1] + 0.5);
    let time = 0, dmg = 0, deaths = 0, kills = 0, remaining = 0, spLeft = 0; T.hits = 0; T.miss = 0; T.spUsed=0;
    for (let i = 0; i < cfg.DUEL_N; i++) {
      if(cfg.AUDIT){G.time=1000;Bot.nextThink=0;seed(1040+i);pl=build(lv);G.fx=[];G.timers=[];G.allies=[];G.zones=[];G.traps=[];}
      G.mobs = []; G.respawns = []; pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp; pl.poisonUntil = 0; pl.buffs = pl.buffs || {};
      teleportPlayer(sp[0] + 0.5, sp[1] + 0.5);
      const m = spawnMob(mobId, { x: sp[0] + 3.5, y: sp[1] + 0.5 }); m.state = 'chase'; if (cfg.HPX) m.hp = m.maxHp = Math.round(m.maxHp * cfg.HPX); // C3: เลือดหนาขึ้น (ไฟต์ยาวพอวัด)
      Bot.toggle(true); T.on = true; T.dmg = 0;
      let t = 0; G.fastSim = true;
      while (t < 90 && !m.dead) {
        updateGame(1 / 15); t += 1 / 15; G.respawns = [];
        if (pl.dead) { deaths++; break; }
        if (!Bot.on) Bot.toggle(true);
      }
      G.fastSim = false; T.on = false; Bot.toggle(false);
      remaining += Math.max(0,m.hp)/m.maxHp*100;spLeft+=pl.sp/pl.d.maxSp*100;
      if (pl.dead) { respawnPlayer(true); pl.hp = pl.d.maxHp; }
      if (m.dead) kills++;
      time += t; dmg += T.dmg;
    }
    const d = pl.d;
    return { ttk: kills === cfg.DUEL_N ? time / kills : null, duration:time/cfg.DUEL_N, trials:cfg.DUEL_N, dmgPctMin: Math.round(dmg / d.maxHp * 100 / Math.max(1, time) * 60), dmgPctKill: Math.round(dmg / d.maxHp * 100 / cfg.DUEL_N), hitPct: Math.round(T.hits / Math.max(1, T.hits + T.miss) * 100), deaths, kills,
      remainingPct:remaining/cfg.DUEL_N, spLeftPct:spLeft/cfg.DUEL_N, spUsed:T.spUsed/cfg.DUEL_N,
      maxHp: d.maxHp, atk: d.statusAtk + d.weaponAtk, matk: d.matkMax, def: d.def, flee: d.flee, gear: pl._gear.join(' ') };
  };
  // ฟาร์ม: บอทล่าในแผนที่ (ไม่เอา MVP)
  const farm = (lv, map, secs) => {
    const pl = build(lv);
    changeMap(map, 1, 1); G.mobs = G.mobs.filter(m => !m.isMvp && !m.isWB);
    const sp = spotOf(); const place = () => { teleportPlayer(sp[0] + 0.5, sp[1] + 0.5); pl.path = []; };
    place();
    const z0 = pl.zeny, p0 = potsOf(); let t = 0, deaths = 0;
    Object.assign(T, { exp: 0, loot: 0, lootEtc: 0, lootGear: 0, dmg: 0, on: true });
    Bot.toggle(true); G.fastSim = true;
    const kills0 = Object.values(pl.kills || {}).reduce((a, b) => a + b, 0);
    while (t < secs) {
      updateGame(1 / 15); t += 1 / 15;
      if (pl.dead) { deaths++; respawnPlayer(true); pl.hp = pl.d.maxHp; G.mobs = G.mobs.filter(m => !m.isMvp && !m.isWB); place(); Bot.toggle(true); }
      else if (!Bot.on) Bot.toggle(true);
    }
    G.fastSim = false; T.on = false; Bot.toggle(false);
    const h = secs / 3600, kills = Object.values(pl.kills || {}).reduce((a, b) => a + b, 0) - kills0;
    const expH = Math.round(T.exp / h);
    // เงินจากมอน = zeny ที่เพิ่ม (ไม่ได้ซื้อ/ขายระหว่างจำลอง)
    const zk = pl.zeny - z0;
    return { expH, hPerLv: baseExpNeed(lv) / Math.max(1, expH), killsH: Math.round(kills / h), deathsH: deaths / h, zenyH: Math.round((zk + T.loot) / h), zenyEtcH: Math.round((zk + T.lootEtc) / h),
      zenyGearH: Math.round(T.lootGear / h), zenyKillH: Math.round(zk / h), potsH: Math.round((p0 - potsOf()) / h), dmgPctMin: Math.round(T.dmg / pl.d.maxHp * 100 / secs * 60) };
  };

  // ฝูง: มอน n ตัวพร้อมกันรอบตัว → เวลาล้างทั้งฝูง
  const duelPack = (lv, mobId, n) => {
    let pl = build(lv);const map = mapOfMob(mobId);
    changeMap(map, 1, 1); G.mobs = []; G.respawns = []; G.drops = [];
    const sp = spotOf(); let time = 0, dmg = 0, deaths = 0, kills = 0;
    for (let k = 0; k < Math.max(1, cfg.DUEL_N >> 1); k++) {
      if(cfg.AUDIT){G.time=1000;Bot.nextThink=0;seed(2040+k);pl=build(lv);G.fx=[];G.timers=[];G.traps=[];}
      G.mobs = []; G.respawns = []; G.allies = []; G.zones = []; pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp; pl.poisonUntil = 0; pl.cds = {}; pl.buffs = {};
      teleportPlayer(sp[0] + 0.5, sp[1] + 0.5);
      const ms = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const m = spawnMob(mobId, { x: Math.floor(sp[0] + 0.5 + Math.cos(a) * 2.5), y: Math.floor(sp[1] + 0.5 + Math.sin(a) * 2.5) }); m.state = 'chase'; if (cfg.HPX) m.hp = m.maxHp = Math.round(m.maxHp * cfg.HPX * 0.5); ms.push(m); }
      Bot.toggle(true); T.on = true; T.dmg = 0;
      let t = 0; G.fastSim = true;
      while (t < 150 && ms.some(m => !m.dead)) { updateGame(1 / 15); t += 1 / 15; G.respawns = []; if (pl.dead) { deaths++; break; } if (!Bot.on) Bot.toggle(true); }
      G.fastSim = false; T.on = false; Bot.toggle(false);
      if (pl.dead) { respawnPlayer(true); pl.hp = pl.d.maxHp; }
      kills += ms.filter(m => m.dead).length; time += t; dmg += T.dmg;
    }
    const d = pl.d, runs = Math.max(1, cfg.DUEL_N >> 1);
    return { ttk: kills===runs*n ? time/runs : null, duration:time/runs, trials:runs, dmgPctMin: Math.round(dmg / d.maxHp * 100 / Math.max(1, time) * 60), dmgPctKill: Math.round(dmg / d.maxHp * 100 / Math.max(1, kills)), hitPct: Math.round(T.hits / Math.max(1, T.hits + T.miss) * 100), deaths, kills,
      maxHp: d.maxHp, atk: d.statusAtk + d.weaponAtk, matk: d.matkMax, def: d.def, flee: d.flee, gear: pl._gear.join(' ') };
  };
  const res = { job, duelCurve: {}, duelCh7: {}, duelPack: {}, farm: {} };
  if (cfg.ONLY !== 'farm') {
    for (const id of cfg.CURVE_MOBS) { const lv = MOBS[id].lv; res.duelCurve[`Lv${lv} vs ${id}`] = duel(lv, id); }
    for (const lv of cfg.CH7_LVS) for (const id of cfg.CH7_MOBS) res.duelCh7[`Lv${lv} vs ${id}(${MOBS[id].lv})`] = duel(lv, id);
    for (const lv of cfg.PACK ? cfg.CH7_LVS : []) for (const id of cfg.PACK) res.duelPack[`Lv${lv} pack${cfg.PACK_N||4} ${id}(${MOBS[id].lv})`] = duelPack(lv, id, cfg.PACK_N||4);
  }
  if (cfg.ONLY !== 'duel') for (const [lv, map] of cfg.FARM) res.farm[`Lv${lv} ${map}`] = farm(lv, map, cfg.FARM_SECS);
  // คืนฟังก์ชันเดิม (รัน Class ถัดไปในหน้าเดียวกันจะห่อซ้ำ)
  gainExp = ge; addItem = ai; damagePlayer = dp; applyHit = ah; damageMob = dmf; killMob = km;
  paySkill=ps;Math.random=rng;
  res.src = T.src;
  return res;
}
