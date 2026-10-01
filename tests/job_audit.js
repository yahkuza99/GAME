// ตรวจทุกอาชีพ: สกิลทุกตัวใช้ได้จริง (SP/คูลดาวน์/ผล) + บอทล่าจริง 180 วิ ต่ออาชีพ
// ใช้: NODE_PATH=$(npm root -g) node tests/job_audit.js   (ต้องมีเซิร์ฟเวอร์ที่ localhost:8790)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 680 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.stack.split('\n').slice(0, 2).join(' | ')));
  await p.goto(process.env.BASE || 'http://localhost:8790/index.html'); await p.waitForTimeout(1200);
  await p.click('#au-offline'); await p.click('#btn-new'); await p.fill('#cr-name', 'Audit'); await p.click('#cr-start'); await p.waitForTimeout(1500);
  await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {});
  const res = await p.evaluate(async () => {
    const out = {};
    for (const job of FIRST_JOBS) {
      document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden'));
      const pl = G.player;
      pl.job = job; pl.baseLv = 25; pl.jobLv = JOBS[job].jobMax; pl.skills = {}; pl.buffs = {}; pl.cds = {}; pl.skillReadyAt = 0;
      for (const id of JOBS[job].skills) if (SKILLS[id] && !SKILLS[id].noLearn) pl.skills[id] = SKILLS[id].max;
      // สเตตัสตามอาชีพ (แบบผู้เล่นทั่วไป)
      const st = { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 };
      const plan = { einherjar: ['str', 'vit'], runecaster: ['int', 'dex'], wildhunter: ['dex', 'agi'], volva: ['int', 'vit'], trickster: ['agi', 'str'], berserker: ['str', 'agi'] }[job];
      st[plan[0]] = 55; st[plan[1]] = 30; pl.stats = st;
      unequipInvalid(); addItem(JOB_STARTER[job], 1, true); equipItem(pl.inventory.find(e => e.id === JOB_STARTER[job]), true);
      recalc(); pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp;
      changeMap('wolfwood', 28, 28); await new Promise(r => setTimeout(r, 200));
      // 1) ทุกสกิลใช้ได้
      const skills = {};
      for (const id of Object.keys(pl.skills)) {
        const s = SKILLS[id]; if (s.type !== 'active') { skills[id] = 'passive'; continue; }
        pl.skillReadyAt = 0; pl.cds = {}; pl.cast = null; pl.sp = pl.d.maxSp; pl.hp = pl.d.maxHp; G.pendingSkill = null; pl.stunUntil = 0;
        const m = G.mobs.filter(m => !m.dead && !m.isMvp)[0]; if (m) { m.x = pl.x + 1.2; m.y = pl.y; m.hp = m.maxHp; m.state = 'idle'; }
        if (s.bow && weaponType() !== 'bow') { skills[id] = 'needs bow (ok)'; continue; }
        const sp0 = pl.sp, hp0 = m ? m.hp : 0;
        try {
          if (s.target === 'enemy') beginSkill(id, s.max, m); else beginSkill(id, s.max, null);
          for (let i = 0; i < 40; i++) updateGame(1 / 15); // ร่าย/โปรเจกไทล์
          const usedSp = pl.sp < sp0 || (pl.d.bloodmagic && pl.hp < pl.d.maxHp);
          const cd = skillCdLeft(id) > 0 || !s.cd;
          const effect = s.target === 'enemy' ? (m && (m.hp < hp0 || m.dead)) : (!!pl.buffs[id] || s.heal || s.special || (s.dmg && s.dmg.at === 'self') || G.allies.length > 0 || G.traps.length > 0 || pl.stealthUntil > G.time);
          skills[id] = (usedSp ? '' : 'NO-SP ') + (cd ? '' : 'NO-CD ') + (effect ? 'ok' : 'NO-EFFECT');
        } catch (e) { skills[id] = 'ERROR ' + e.message; }
      }
      // 2) บอทล่าจริง 180 วิ
      pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp; pl.cds = {}; pl.skillReadyAt = 0; pl.buffs = {}; G.allies = [];
      pl.inventory = pl.inventory.filter(e => !['white_potion', 'blue_potion', 'red_potion', 'orange_potion', 'yellow_potion'].includes(e.id));
      addItem('white_potion', 40, true); addItem('blue_potion', 15, true);
      let lowSp = 0; const minCost = Math.min(...Object.keys(pl.skills).filter(id => SKILLS[id].type === 'active').map(id => skillCost(id, pl.skills[id])));
      const c = Bot.cfg(); c.style = 'skills'; c.leash = false; c.skills = {}; c.skillHp = {}; c.skipMobs = {};
      const cast = {}; const ex = window.executeSkill; window.executeSkill = (id, ...a) => { cast[id] = (cast[id] || 0) + 1; return ex(id, ...a); };
      Bot.toggle(true); let deaths = 0;
      for (let i = 0; i < 180 * 15; i++) { updateGame(1 / 15); if (pl.sp < minCost) lowSp++; if (pl.dead) { deaths++; respawnPlayer(true); Bot.toggle(true); } }
      const kills = Bot.stats.kills; Bot.toggle(false); window.executeSkill = ex;
      out[job] = { skills, kills, killsPerMin: +(kills / 3).toFixed(1), deaths, cast, potsLeft: countItem('white_potion'), spLeft: countItem('blue_potion'), lowSpPct: Math.round(lowSp / (180 * 15) * 100), atk: pl.d.statusAtk + pl.d.weaponAtk + pl.d.atkBonus, aspd: pl.d.aspd };
    }
    return out;
  });
  for (const [j, r] of Object.entries(res)) console.log(j.padEnd(11), 'kills/min', String(r.killsPerMin).padEnd(5), 'deaths', r.deaths, 'HP pots', 40 - r.potsLeft, 'SP pots', 15 - r.spLeft, 'SP-empty%', r.lowSpPct, 'ATK', r.atk, 'ASPD', r.aspd, '| casts', JSON.stringify(r.cast));
  console.log('errors', errs);
  await b.close();
})();
