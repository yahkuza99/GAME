// จำลองบอทล่ามอน (เร่งเวลา) ทุกอาชีพ × ทุก Keystone ที่ Lv 30 ใน Wolfwood เพื่อดูสมดุล
// ใช้: python3 -m http.server 8790 แล้ว NODE_PATH=$(npm root -g) node tests/balance_sim.js . <วินาที> [อาชีพ,อาชีพ]
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8790/index.html'); await p.waitForTimeout(1000);
  await p.click('#au-offline'); await p.click('#btn-new'); await p.fill('#cr-name', 'Sim'); await p.click('#cr-start'); await p.waitForTimeout(1500);
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
        for (const k in st) delete st[k]; let deaths = 0, t = 0, dmgTaken = 0; const pots0 = countItem('orange_potion'), hp0 = pl.d.maxHp;
        G.fastSim = true;
        while (t < SECS) {
          const hpBefore = pl.hp; updateGame(1 / 15); t += 1 / 15;
          if (pl.hp < hpBefore) dmgTaken += hpBefore - pl.hp;
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
  console.log(errs.slice(0, 5)); await b.close();
})();
