// ตรวจคลาสขั้น 2: สกิลทุกตัวใช้ได้ + บอทล่าจริง 180 วิ ที่ Archive Depths (Lv 33-45) เทียบกับคลาสแรกที่เลเวลเท่ากัน
// ใช้: NODE_PATH=$(npm root -g) node tests/job2_audit.js   (ต้องมีเซิร์ฟเวอร์ที่ localhost:8790)  • ONLY=skadi,ullr ตรวจเฉพาะบางอาชีพ
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 680 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.stack.split('\n').slice(0, 2).join(' | ')));
  await p.goto(process.env.BASE || 'http://localhost:8790/index.html'); await p.waitForTimeout(1200);
  await p.click('#au-offline'); await p.click('#btn-new'); await p.fill('#cr-name', 'Audit'); await p.click('#cr-start'); await p.waitForTimeout(1500);
  await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {});
  const res = await p.evaluate(async only => {
    const out = {};
    for (const job of FIRST_JOBS.flatMap(j => [j, ...SECOND_JOBS[j]]).filter(j => !only || only.includes(j))) {
      document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden'));
      const pl = G.player;
      pl.job = job; pl.baseLv = 40; pl.jobLv = JOBS[job].jobMax; pl.job1Lv = 26; pl.skills = {}; pl.buffs = {}; pl.cds = {}; pl.skillReadyAt = 0;
      for (const id of jobLine(job).flatMap(j => JOBS[j].skills)) if (SKILLS[id] && !SKILLS[id].noLearn) pl.skills[id] = SKILLS[id].max;
      // สเตตัสตามอาชีพ (แบบผู้เล่นทั่วไป)
      const st = { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 };
      const plan = { einherjar: ['str', 'vit'], runecaster: ['int', 'dex'], wildhunter: ['dex', 'agi'], volva: ['int', 'vit'], trickster: ['agi', 'str'], berserker: ['str', 'agi'], gythja: ['str', 'vit'], ullr: ['dex', 'luk'], skald: ['agi', 'dex'], jotun: ['str', 'vit'] }[JOBS[job].stats && ['gythja', 'ullr', 'skald', 'jotun'].includes(job) ? job : jobRoot(job)];
      st[plan[0]] = 70; st[plan[1]] = 42; pl.stats = st;
      // อาวุธ: อาวุธเริ่มต้นของคลาสแรก ยกเว้นสายที่สเตตัส/สไตล์ต่างจากคลาสแรก (Gythja ต่อยประชิดสาย STR → กระบอง ไม่ใช่ Club ของ Völva สาย INT)
      const wpn = { gythja: 'mace' }[job] || JOB_STARTER[jobRoot(job)];
      unequipInvalid(); addItem(wpn, 1, true); equipItem(pl.inventory.find(e => e.id === wpn), true);
      recalc(); pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp;
      // จุดยืนกลางแมพ (ใช้ซ้ำหลังฟื้น: จุดเกิดใหม่ "ในแมพเดิม" = จุดเข้าแมพ (0,0) ซึ่งเป็นกำแพง บอทจะติดอยู่ตรงนั้น)
      changeMap('archive', 0, 0); let spot; { const M = G.map, cx = M.w >> 1, cy = M.h >> 1; let best = null; for (let y = 2; y < M.h - 2; y++) for (let x = 2; x < M.w - 2; x++) if (M.walkable(x, y) && (!best || Math.hypot(x - cx, y - cy) < Math.hypot(best[0] - cx, best[1] - cy))) best = [x, y]; spot = best; }
      const place = () => { if (pl.dead) respawnPlayer(true); pl.x = spot[0] + 0.5; pl.y = spot[1] + 0.5; pl.path = []; };
      place(); await new Promise(r => setTimeout(r, 200));
      // 1) ทุกสกิลใช้ได้
      const skills = {};
      for (const id of Object.keys(pl.skills)) {
        const s = SKILLS[id]; if (s.type !== 'active') { skills[id] = 'passive'; continue; }
        if (pl.dead) place(); // ถูกรุมตายระหว่างทดสอบสกิล → ฟื้นที่เดิม (ไม่ให้ไปนับเป็นการตายตอนล่า)
        pl.skillReadyAt = 0; pl.cds = {}; pl.cast = null; pl.sp = pl.d.maxSp; pl.hp = pl.d.maxHp; G.pendingSkill = null; pl.stunUntil = 0;
        const m = G.mobs.filter(m => !m.dead && !m.isMvp)[0]; if (m) { m.x = pl.x + 1.2; m.y = pl.y; m.hp = m.maxHp; m.state = 'idle'; }
        if (s.bow && weaponType() !== 'bow') { skills[id] = 'needs bow (ok)'; continue; }
        const sp0 = pl.sp, hp0 = m ? m.hp : 0;
        try {
          // ตีพลาด (Miss) = สกิลทำงานแล้ว แค่ดวงไม่ดี → นับว่าใช้ได้
          let swung = false; const ah = window.applyHit; window.applyHit = (mm, r, o) => { if (mm === m) swung = true; return ah(mm, r, o); };
          if (s.target === 'enemy') beginSkill(id, s.max, m); else beginSkill(id, s.max, null);
          // คูลดาวน์: ตรวจทันทีหลังสกิลทำงาน (สกิลคูลดาวน์สั้น ≤ 2.5 วิ หมดก่อนจบลูป 40 เฟรม)
          let cdSeen = skillCdLeft(id) > 0;
          // ร่าย/โปรเจกไทล์ • มอนรอบตัวห้ามตีระหว่างทดสอบ (โดนตีมึน = การร่ายถูกยกเลิก → ขึ้น NO-SP ทั้งที่สกิลไม่ได้ผิด)
          for (let i = 0; i < 40; i++) { for (const o of G.mobs) o.nextAtk = G.time + 1; updateGame(1 / 15); if (skillCdLeft(id) > 0) cdSeen = true; }
          window.applyHit = ah;
          const usedSp = pl.sp < sp0 || (pl.d.bloodmagic && pl.hp < pl.d.maxHp);
          const cd = cdSeen || !s.cd;
          const effect = s.target === 'enemy' ? (m && (m.hp < hp0 || m.dead || swung)) : (!!pl.buffs[id] || s.heal || s.special || (s.dmg && s.dmg.at === 'self') || G.allies.length > 0 || G.traps.length > 0 || pl.stealthUntil > G.time);
          skills[id] = (usedSp ? '' : 'NO-SP ') + (cd ? '' : 'NO-CD ') + (effect ? 'ok' : 'NO-EFFECT');
        } catch (e) { skills[id] = 'ERROR ' + e.message; }
      }
      // 2) บอทล่าจริง 180 วิ
      place(); pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp; pl.cds = {}; pl.skillReadyAt = 0; pl.buffs = {}; G.allies = [];
      pl.inventory = pl.inventory.filter(e => !['white_potion', 'blue_potion', 'red_potion', 'orange_potion', 'yellow_potion'].includes(e.id));
      addItem('white_potion', 40, true); addItem('blue_potion', 15, true);
      let lowSp = 0; const minCost = Math.min(...Object.keys(pl.skills).filter(id => SKILLS[id].type === 'active').map(id => skillCost(id, pl.skills[id])));
      const c = Bot.cfg(); c.style = 'skills'; c.leash = false; c.skills = {}; c.skillHp = {}; c.skipMobs = {};
      const cast = {}; const ex = window.executeSkill; window.executeSkill = (id, ...a) => { cast[id] = (cast[id] || 0) + 1; return ex(id, ...a); };
      Bot.toggle(true); let deaths = 0, k0 = 0, e0 = 0; // Bot.toggle(true) ล้างสถิติ → เก็บยอดก่อนตายไว้
      for (let i = 0; i < 180 * 15; i++) { updateGame(1 / 15); if (pl.sp < minCost) lowSp++; if (pl.dead) { deaths++; k0 += Bot.stats.kills; e0 += Bot.stats.bexp; place(); Bot.toggle(true); } }
      const kills = k0 + Bot.stats.kills, bexp = e0 + Bot.stats.bexp; Bot.toggle(false); window.executeSkill = ex;
      out[job] = { skills, kills, killsPerMin: +(kills / 3).toFixed(1), expPerMin: Math.round(bexp / 3), deaths, cast, potsLeft: countItem('white_potion'), spLeft: countItem('blue_potion'), lowSpPct: Math.round(lowSp / (180 * 15) * 100), atk: pl.d.statusAtk + pl.d.weaponAtk + pl.d.atkBonus, aspd: pl.d.aspd };
    }
    return out;
  }, process.env.ONLY ? process.env.ONLY.split(',') : null); // ONLY=skadi,ullr → ตรวจเฉพาะบางอาชีพ
  for (const [j, r] of Object.entries(res)) console.log(j.padEnd(11), 'kills/min', String(r.killsPerMin).padEnd(5), 'exp/min', r.expPerMin, 'deaths', r.deaths, 'HP pots', 40 - r.potsLeft, 'SP pots', 15 - r.spLeft, 'SP-empty%', r.lowSpPct, 'ATK', r.atk, 'ASPD', r.aspd, '| casts', JSON.stringify(r.cast));
  for (const [j, r] of Object.entries(res)) { const bad = Object.entries(r.skills).filter(([, v]) => !/^(ok|passive|needs bow \(ok\))$/.test(v)); if (bad.length) console.log('SKILL ISSUE', j, JSON.stringify(bad)); }
  console.log('errors', errs);
  await b.close();
})();
