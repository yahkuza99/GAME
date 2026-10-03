'use strict';
// ============================================================
//  Smoke test (Playwright): เปิดเกม → เล่นแบบไม่ล็อกอิน → สร้างตัวละคร → ระบบหลักทำงาน ไม่มี error
//  รัน:  NODE_PATH=$(npm root -g) node tests/smoke.js
//  (ใช้ Chromium ของ Playwright; ตั้ง CHROME=/path/to/chrome ได้ถ้าหาเองไม่เจอ)
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

const checks = [];
const ok = (name, cond, info = '') => { checks.push([name, !!cond, info]); };

(async () => {
  const srv = await serve();
  const url = `http://localhost:${srv.address().port}/index.html`;
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  else if (fs.existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium';
  let browser;
  try { browser = await chromium.launch(opts); } catch (e) { browser = await chromium.launch({ headless: true }); }
  const errors = [];
  for (const [w, h, name, mobile] of [[1280, 720, 'desktop', false], [390, 844, 'phone', true]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(`${name}: ${e.message}`));
    await p.goto(url); await p.waitForTimeout(1500);
    ok(`${name}: login card on entry`, await p.isVisible('#auth'));
    await p.click('#au-offline'); await p.click('#btn-new');
    await p.fill('#cr-name', 'Smoke'); await p.click('#cr-start'); await p.waitForTimeout(1500);
    await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {}); // บทนำ (บทที่ 0) แสดงครั้งแรกเมื่อสร้างตัวละคร
    // บทนำอาจเริ่มช้า (โหลดเสียง/ภาพ) → ถ้ายังค้างอยู่ กดข้ามอีกรอบ
    await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 8000, polling: 250 }).catch(() => {});
    await p.waitForTimeout(800);
    await p.click('#w-help .win-x').catch(() => {});
    ok(`${name}: game started`, await p.evaluate(() => G.started && G.map.id === HOME_MAP));
    ok(`${name}: art loaded`, await p.evaluate(() => Object.keys(Art.imgs).length > 100), await p.evaluate(() => Object.keys(Art.imgs).length));
    ok(`${name}: novice_f animated`, await p.evaluate(() => Anim.has('novice_f')));
    ok(`${name}: quest tracker`, await p.evaluate(() => Quest.current() && Quest.current().id === 'welcome' && !document.querySelector('#quest-track').hidden));
    // training dummy: attack it for a while
    // วัดเป็น "เวลาในเกม" ไม่ใช่เวลาจริง: เฟรมช้า (headless/เครื่องโหลดหนัก) dt ถูกจำกัด 0.05 → 4 วิจริงอาจได้แค่ ~2 วิในเกม = ตีได้ 1 ที
    // และ Novice Lv 1 (HIT 2) ตีหุ่นโดน ~82% → เดิมพลาดครั้งเดียวก็ตก • รอจนตีโดน 1 ครั้ง (สูงสุด 10 วิในเกม ≈ 7 ครั้ง)
    const hits = await p.evaluate(async () => {
      const d = G.mobs.find(m => m.def.dummy), t0 = G.time, w0 = Date.now(); G.player.target = d;
      while (!(d.dmgLog || []).length && G.time - t0 < 10 && Date.now() - w0 < 30000) await new Promise(r => setTimeout(r, 100));
      const n = (d.dmgLog || []).length;
      return n ? `${n} hits` : 'NO HIT ' + JSON.stringify({ pro: !!(document.querySelector('#prologue-skip') || {}).offsetParent, tgt: !!G.player.target, dist: +Math.hypot(d.x - G.player.x, d.y - G.player.y).toFixed(2), path: G.player.path.length, dead: G.player.dead, dlg: !document.querySelector('#w-dialog').classList.contains('hidden'), busy: NPC.busy, gameSec: +(G.time - t0).toFixed(2) });
    });
    ok(`${name}: attack dummy`, /^\d+ hits$/.test(hits), hits);
    // walk to the field
    await p.evaluate(() => changeMap('meadow', 28.5, 28.5)); await p.waitForTimeout(800);
    ok(`${name}: field has monsters`, await p.evaluate(() => G.mobs.length > 20));
    if (!mobile) { // โลกเชื่อมกันทางกายภาพ (js/world.js): แมพไม่ซ้อนกัน + ทุกประตู/ NPC เดินถึงกันได้ในทุกแมพ
      const geo = await p.evaluate(() => {
        const bad = WORLD.overlaps().map(o => 'overlap ' + o);
        for (const id of Object.keys(MAP_DEFS)) {
          const m = new GameMap(id), seen = new Uint8Array(m.w * m.h), pts = m.portals.map(q => [q.ax, q.ay]).concat((m.def.npcs || []).map(n => [n.x, n.y + 1]));
          if (!pts.length) continue;
          const st = [pts[0]]; seen[m.idx(...pts[0])] = 1;
          while (st.length) { const [x, y] = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (m.inb(nx, ny) && !seen[m.idx(nx, ny)] && (m.walkable(nx, ny) || m.block[m.idx(nx, ny)])) { seen[m.idx(nx, ny)] = 1; st.push([nx, ny]); } } }
          for (const q of pts) if (!seen[m.idx(...q)]) bad.push(`${id} unreachable ${q}`);
        }
        return bad;
      });
      ok(`${name}: world geography`, !geo.length, geo.join('; '));
    }
    const moved = await p.evaluate(async () => {
      const pl = G.player, x0 = pl.x; pl.path = findPath(G.map, Math.floor(pl.x), Math.floor(pl.y), Math.floor(pl.x) + 5, Math.floor(pl.y), 2000);
      await new Promise(r => setTimeout(r, 1500)); return pl.x - x0;
    });
    ok(`${name}: walking`, moved > 1, moved.toFixed(2));
    // windows open without errors
    for (const wnd of ['w-status', 'w-inv', 'w-equip', 'w-skills', 'w-tree', 'w-quest', 'w-nav', 'w-emote', 'w-options']) {
      await p.evaluate(id => UI.open(id), wnd); await p.waitForTimeout(80);
      ok(`${name}: open ${wnd}`, await p.evaluate(id => UI.isOpen(id) && document.querySelector('#' + id + ' .win-body').childElementCount > 0, wnd));
      await p.evaluate(id => UI.close(id), wnd);
    }
    // AUTO bot is locked for Novices
    ok(`${name}: bot locked for novice`, await p.evaluate(() => { G.player.job = 'novice'; Bot.toggle(true); const on = Bot.on; Bot.toggle(false); return !on; }));
    // zeny on kill
    const zg = await p.evaluate(() => { const pl = G.player, z0 = pl.zeny, m = spawnMob('pudding', { x: pl.x + 1, y: pl.y }); killMob(m); const [lo, hi] = mobZeny(MOBS.pudding); return { z: pl.zeny - z0, lo, hi }; });
    ok(`${name}: zeny on kill`, zg.z >= zg.lo && zg.z <= zg.hi && zg.lo >= 1, zg);
    // every job: change job, learn and use each active skill on a monster, no errors
    const jobs = await p.evaluate(async () => {
      const out = [];
      for (const job of Object.keys(JOBS).filter(j => j !== 'novice')) {
        const pl = G.player; pl.dead = false; changeJob(job); pl.skillPoints = 30; pl.baseLv = Math.max(pl.baseLv, 20); recalc();
        let used = 0;
        for (const id of JOBS[job].skills) {
          const sk = SKILLS[id]; if (!sk || sk.noLearn) continue;
          while (canLearn(id)) learnSkill(id);
          if (sk.type !== 'active') continue;
          const m = spawnMob('pudding', { x: pl.x + 1, y: pl.y }); m.hp = m.maxHp = 1e6;
          pl.sp = pl.d.maxSp; pl.hp = pl.d.maxHp; pl.cast = null; pl.skillReadyAt = 0;
          if (sk.bow && weaponType() !== 'bow') continue;
          executeSkill(id, skillLv(id), sk.target === 'enemy' || sk.dmg ? m : null); used++;
          m.dead = true; G.mobs = G.mobs.filter(x => x !== m);
        }
        out.push(job + ':' + used);
      }
      await new Promise(r => setTimeout(r, 600));
      return out.join(' ');
    });
    ok(`${name}: job change + skills`, !/:0/.test(jobs), jobs);
    // chip = random % drop (owner 2026-10-03): 0.2% normal / 2% MVP, repeats allowed • not in the regular drop tables
    const ch = await p.evaluate(() => { const pl = G.player, has = () => countItem('pudding_card');
      const noDrop = Object.values(MOBS).every(m => !m.drops.some(([id]) => ITEMS[id].type === 'card'));
      const R0 = Math.random; pl.chips = []; const b0 = has();
      Math.random = () => 0.99; killMob(spawnMob('pudding', { x: pl.x + 2, y: pl.y })); const miss = has() - b0;
      Math.random = () => 0.0001; killMob(spawnMob('pudding', { x: pl.x + 2, y: pl.y })); killMob(spawnMob('pudding', { x: pl.x + 2, y: pl.y })); const hit = has() - b0;
      Math.random = R0; return { noDrop, miss, hit, rate: CHIP_DROP, boss: CHIP_DROP_BOSS, known: pl.chips.includes('pudding') }; });
    ok(`${name}: chip % drop (repeatable)`, ch.noDrop && ch.miss === 0 && ch.hit === 2 && ch.known && ch.rate === 0.002 && ch.boss === 0.02, JSON.stringify(ch));
    // mastery: uses level a skill up and raise its power
    const ms = await p.evaluate(() => { const pl = G.player; pl.mastery = { attack: 0 }; const before = masteryMul('attack');
      for (let i = 0; i < masteryNeed(1, 'attack'); i++) addMastery('attack'); return { lv: masteryLv('attack'), before, after: masteryMul('attack') }; });
    ok(`${name}: mastery`, ms.lv === 1 && ms.after > ms.before, JSON.stringify(ms));
    // daily bounty: 3 jobs, kills count, claim pays
    const bt = await p.evaluate(() => { const pl = G.player; pl.baseLv = Math.max(pl.baseLv, 12); pl.bounty = null; const s = Bounty.state(), b0 = s.list[0], z0 = pl.zeny;
      for (let i = 0; i < b0.n; i++) killMob(spawnMob(b0.mob, { x: pl.x + 2, y: pl.y })); const kz = pl.zeny - z0; Bounty.claim(b0);
      return { n: s.list.length, claimed: b0.claimed, paid: pl.zeny - z0 - kz === b0.zeny }; });
    ok(`${name}: daily bounty`, bt.n === 3 && bt.claimed && bt.paid, JSON.stringify(bt));
    // passive tree: allocate a path, stats change, cannot skip ahead
    const pt = await p.evaluate(() => {
      const pl = G.player; pl.baseLv = 10; recalc(); const s0 = pl.d.str;
      const jump = Passive.alloc(pl, '1e'); ['1a', '1b', '1c', '1e'].forEach(id => Passive.alloc(pl, id));
      return { jump, n: pl.passives.length, gain: pl.d.str - s0, free: Passive.free(pl) };
    });
    ok(`${name}: passive tree`, !pt.jump && pt.n === 4 && pt.gain === 14 && pt.free === 5, JSON.stringify(pt));
    // save/continue
    await p.evaluate(() => saveGame(true, true)); await p.reload(); await p.waitForTimeout(1500);
    await p.click('#au-offline'); await p.click('#btn-continue'); await p.waitForTimeout(1200);
    ok(`${name}: continue save`, await p.evaluate(() => G.started && G.player.name === 'Smoke' && G.player.passives.length === 4));
    // old save (before passives/mastery/bounty/chips/Volt) with stale ids still loads and plays
    await p.evaluate(() => { saveGame = () => {}; G.started = false; }); // กันเกมเซฟทับตอนรีโหลด
    await p.evaluate(() => localStorage.setItem(SAVE_KEY, JSON.stringify({ name: 'Oldie', gender: 'm', hair: '#ccc', job: 'runecaster', baseLv: 15, jobLv: 12, baseExp: 0, jobExp: 0,
      stats: { str: 1, agi: 1, vit: 10, int: 30, dex: 20, luk: 1 }, statPoints: 0, skillPoints: 2, skills: { first_aid: 1, fire_rune: 3, gone_skill: 2 }, zeny: 1234,
      inventory: [{ id: 'red_potion', qty: 5, uid: 1, refine: 0, cards: [] }, { id: 'no_such_item', qty: 1, uid: 2 }],
      equip: { weapon: { id: 'rod', qty: 1, uid: 3, refine: 2, cards: ['pudding_card', 'bogus_card'] } }, hotbar: [{ t: 'skill', id: 'fire_rune' }, { t: 'item', id: 'red_potion' }],
      map: 'meadow', x: 28.5, y: 28.5, save: { map: 'eldheim', x: 20.5, y: 24.5 }, hp: 100, sp: 50, options: { sound: false }, uidSeq: 10,
      bounty: { day: 'x', list: [{ mob: 'removed_mob', n: 5, got: 1 }] } })));
    await p.reload(); await p.waitForTimeout(1500);
    await p.click('#au-offline'); await p.click('#btn-continue'); await p.waitForTimeout(1500);
    const old = await p.evaluate(() => { const pl = G.player; for (const w of ['w-status', 'w-skills', 'w-tree', 'w-quest', 'w-inv', 'w-equip']) { UI.open(w); UI.close(w); }
      const m = spawnMob('pudding', { x: pl.x + 1, y: pl.y }); pl.sp = 999; executeSkill('fire_rune', skillLv('fire_rune'), m); killMob(m);
      return { ok: G.started && pl.name === 'Oldie', skills: Object.keys(pl.skills).join(','), cards: pl.equip.weapon.cards.join(','), free: Passive.free(pl), bounty: (Bounty.state() || { list: [] }).list.length }; });
    ok(`${name}: old save loads`, old.ok && !/gone_skill/.test(old.skills) && old.cards === 'pudding_card' && old.free === 14 && old.bounty === 3, JSON.stringify(old));
    await ctx.close();
  }
  await browser.close(); srv.close();
  for (const e of errors) ok('page error', false, e);
  let fail = 0;
  for (const [n, pass, info] of checks) { if (!pass) fail++; console.log(`${pass ? '✔' : '✘'} ${n}${info !== '' ? `  (${info})` : ''}`); }
  console.log(fail ? `\n${fail} FAILED` : `\nALL ${checks.length} PASSED`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
