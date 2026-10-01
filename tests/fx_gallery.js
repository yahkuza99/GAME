// แกลเลอรีเอฟเฟกต์สกิล (js/fx2.js): ทุกคลาสขั้น 2 + สกิลที่ 6 ของคลาสแรก ใช้สกิลใส่มอนที่ยืนนิ่ง แล้วแคปภาพกลางเอฟเฟกต์
// ใช้: NODE_PATH=$(npm root -g) node tests/fx_gallery.js   (ต้องมีเซิร์ฟเวอร์ — BASE=http://localhost:8804/index.html)
//      OUT=โฟลเดอร์ผลลัพธ์ (ค่าเริ่มต้น /tmp/fx_gallery)   GFX=low เพื่อดูโหมดประหยัด   MAP=meadow
// ผลลัพธ์: <job>_<skill>.png (ภาพกลางเอฟเฟกต์) + sheet_<job>.png (ทุกสกิล: ช่วงต้น / ช่วงกลาง / ออร่าบัฟหรือชาร์จร่าย)
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const OUT = process.env.OUT || '/tmp/fx_gallery';
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 680 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.stack.split('\n').slice(0, 2).join(' | ')));
  await p.goto(process.env.BASE || 'http://localhost:8804/index.html'); await p.waitForTimeout(1200);
  await p.click('#au-offline'); await p.click('#btn-new'); await p.fill('#cr-name', 'Gallery'); await p.click('#cr-start'); await p.waitForTimeout(1500);
  await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {});
  await p.waitForTimeout(500);
  const jobs = (process.env.JOBS || 'first,valkyrie,hersir,galdr,seidr,skadi,ullr,norn,gythja,phantom,skald,warlord,jotun').split(',');
  for (const job of jobs) {
    const res = await p.evaluate(async ({ job, gfx, mapId }) => {
      window.frame = () => {}; // หยุดลูปจริง → เดินเวลาเอง
      document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden'));
      if (gfx) R.setQuality(gfx);
      const pl = G.player, out = { shots: [], sheet: null };
      const list = job === 'first'
        ? FIRST_JOBS.map(j => [j, JOBS[j].skills[4]])
        : JOBS[job].skills.filter(id => SKILLS[id].type === 'active').map(id => [job, id]);
      const setup = j => {
        pl.job = j; pl.baseLv = 60; pl.jobLv = JOBS[j].jobMax; pl.job1Lv = 26; pl.skills = {}; pl.buffs = {}; pl.cds = {}; pl.skillReadyAt = 0; pl.cast = null;
        for (const id of jobLine(j).flatMap(x => JOBS[x].skills)) if (SKILLS[id] && !SKILLS[id].noLearn) pl.skills[id] = SKILLS[id].max;
        pl.stats = { str: 60, agi: 40, vit: 40, int: 60, dex: 60, luk: 10 };
        unequipInvalid(); addItem(JOB_STARTER[jobRoot(j)], 1, true); equipItem(pl.inventory.find(e => e.id === JOB_STARTER[jobRoot(j)]), true);
        recalc(); pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp;
      };
      setup(list[0][0]);
      if (G.map.id !== mapId) changeMap(mapId, 0, 0);
      // จุดโล่งกลางแผนที่
      const M = G.map, cx = M.w >> 1, cy = M.h >> 1; let best = null;
      const open = (x, y) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 5; dx++) if (!M.walkable(x + dx, y + dy)) return false; return true; };
      for (let y = 3; y < M.h - 3; y++) for (let x = 3; x < M.w - 6; x++) if (open(x, y) && (!best || Math.hypot(x - cx, y - cy) < Math.hypot(best[0] - cx, best[1] - cy))) best = [x, y];
      const PX = best[0] + 0.5, PY = best[1] + 0.5;
      G.npcs = [];
      const step = (sec, mobs, spots) => {
        const n = Math.max(1, Math.round(sec * 60));
        for (let i = 0; i < n; i++) {
          updateGame(1 / 60);
          pl.x = PX; pl.y = PY; pl.path = []; pl.target = null; pl.moving = false; pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp;
          mobs.forEach((m, j) => { if (!spots[j]) return; m.x = spots[j][0]; m.y = spots[j][1]; m.path = []; m.state = 'idle'; m.hp = m.maxHp; m.dead = false; m.moving = false; m.nextAtk = G.time + 99; });
        }
      };
      const W = 480, Hh = 330;
      const crop = () => {
        R.render();
        const sx = (pl.x * TILE - R.camX) * R.zoom * R.dpr, sy = (pl.y * TILE * R.K - R.camY) * R.zoom * R.dpr;
        const c = document.createElement('canvas'); c.width = W; c.height = Hh;
        c.getContext('2d').drawImage(R.cv, sx - W / 2 + 60 * R.dpr, sy - Hh / 2 - 60 * R.dpr, W, Hh, 0, 0, W, Hh);
        return c;
      };
      const rows = [];
      for (const [j, id] of list) {
        setup(j);
        const s = SKILLS[id], v = s.vfx, sp = FX2.SPEC[v] || {};
        G.fx = []; G.timers = []; G.floaters = [];
        const mobs = G.mobs.filter(m => !m.isMvp && !m.def.dummy).slice(0, 3);
        const melee = s.melee || sp.hit === 'melee', d = melee ? 1.3 : sp.cast === 'self' ? 1.7 : 3;
        const spots = [[PX + d, PY], [PX + d + 0.7, PY + 1.0], [PX + d - 0.3, PY - 1.0]];
        if (!(s.dmg && (s.dmg.area || s.dmg.line))) { spots[1] = [PX + d + 6, PY + 6]; spots[2] = [PX + d + 7, PY - 6]; }
        mobs.forEach((m, k) => { m.x = spots[k][0]; m.y = spots[k][1]; });
        pl.facing = 1; G.time += 2; step(0.05, mobs, spots);
        const tgt = s.target === 'enemy' ? mobs[0] : null;
        const row = { id, frames: [] };
        // ภาพชาร์จร่าย (ถ้ามีเวลาร่าย)
        if (s.cast) {
          beginSkill(id, s.max, tgt);
          if (pl.cast) { const T = pl.cast.end - pl.cast.start; step(T * 0.65, mobs, spots); row.charge = crop(); step(T * 0.35 + 0.02, mobs, spots); }
        } else executeSkill(id, s.max, tgt);
        // เวลาที่แคป (หลังเริ่มเอฟเฟกต์)
        let t1 = 0.1, t2 = 0.3;
        const dist = 3;
        if (sp.hit === 'proj') { t1 = dist / sp.speed * 0.5; t2 = dist / sp.speed + 0.07; }
        else if (sp.hit === 'melee') { t1 = 0.06; t2 = 0.18; }
        else if (sp.hit === 'strike') { t1 = 0.2; t2 = 0.4; }
        else if (sp.hit === 'chain') { t1 = 0.05; t2 = 0.34; }
        else if (sp.hit === 'snipe') { t1 = 0.06; t2 = 0.18; }
        else if (sp.cast === 'area') { t1 = sp.impact * 0.6; t2 = sp.impact + 0.15; }
        else if (sp.cast === 'self') { t1 = 0.12; t2 = 0.36; }
        else if (sp.cast === 'line') { t1 = sp.travel * 0.7; t2 = sp.travel + 0.12; }
        else if (sp.cast) { t1 = 0.25; t2 = 0.55; }
        step(t1, mobs, spots); row.frames.push(crop());
        step(t2 - t1, mobs, spots); row.frames.push(crop());
        out.shots.push({ name: `${j}_${id}`, url: row.frames[1].toDataURL('image/png') });
        if (s.buff) { step(3, mobs, spots); row.aura = crop(); }
        rows.push(row);
        pl.buffs = {}; recalc();
      }
      // ชีตรวม
      const S = 0.75, tw = W * S, th = Hh * S, sheet = document.createElement('canvas');
      sheet.width = tw * 3; sheet.height = th * rows.length;
      const g = sheet.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, sheet.width, sheet.height);
      g.font = 'bold 15px sans-serif'; g.textBaseline = 'top';
      rows.forEach((r, i) => {
        const cells = [r.frames[0], r.frames[1], r.aura || r.charge].filter(Boolean);
        cells.forEach((c, k) => g.drawImage(c, k * tw, i * th, tw, th));
        const lab = `${r.id} (${SKILLS[r.id].vfx})`;
        g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, i * th, g.measureText(lab).width + 12, 22);
        g.fillStyle = '#fff'; g.fillText(lab, 6, i * th + 4);
        if (r.aura || r.charge) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(2 * tw, i * th, 70, 22); g.fillStyle = '#ffd56a'; g.fillText(r.aura ? 'aura' : 'charge', 2 * tw + 6, i * th + 4); }
        g.strokeStyle = '#444'; g.strokeRect(0, i * th, sheet.width, th);
      });
      out.sheet = sheet.toDataURL('image/png');
      return out;
    }, { job, gfx: process.env.GFX || '', mapId: process.env.MAP || 'meadow' });
    for (const s of res.shots) fs.writeFileSync(path.join(OUT, s.name + '.png'), Buffer.from(s.url.split(',')[1], 'base64'));
    fs.writeFileSync(path.join(OUT, `sheet_${job}.png`), Buffer.from(res.sheet.split(',')[1], 'base64'));
    console.log('saved', job, res.shots.length, 'skills');
  }
  console.log('out', OUT);
  console.log('errors', errs);
  await b.close();
})();
