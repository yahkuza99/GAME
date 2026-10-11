'use strict';
// ============================================================
//  นำทางเควสต์ + ล่าตามเควสต์ (js/questhunt.js, js/nav.js, Side.navTarget/card ใน js/quest.js) — Playwright
//  รัน:  CHROME=<chrome-headless-shell> NODE_PATH=$(npm root -g) node tests/questnav.js
//  ตรวจ: 1) Novice (AUTO ยังล็อก): นำทางไปเควสต์ล่า → ถึงแล้วตีเฉพาะมอนเควสต์จนครบ (ตัวอื่นไม่ตี เว้นตัวที่ไล่ตีเรา) → หยุด + ประกาศ
//        2) เดินเอง (จอย) ระหว่างล่า = หยุด • 3) มี Class: ใช้บอท AUTO + สกิลที่ตั้งไว้ จำกัดเป้าที่มอนเควสต์ → ครบแล้วปลดข้อจำกัด
//           คืนสถานะบอท (ปิดอยู่ก่อน = ปิดกลับ / เปิดอยู่ก่อน = เปิดค้าง) + นำทางกลับไปส่งเควสต์เสริมที่ NPC
//        4) ทุกขั้นของทุกเควสต์เสริมมีจุดนำทาง (ล่า/เก็บ = โหมดล่า) • ค่าหัว "ไปเลย" = โหมดล่า
//        5) หน้าต่างเควสต์: งานเสริมที่รอรับเป็นปุ่มนำทาง (ไกล = นำทาง, ใกล้ = เปิดบทสนทนา) • ปุ่ม ≥ 44px มุม ≤ 8px ตัว ≥ 14px (มือถือ) ไม่ถ่างตัวอักษร
//        6) แถบติดตามบนจอ (คอม): แตะบรรทัดเควสต์เสริม = นำทาง • 7) ไม่มี page error • ภาพหน้าจอ → $SHOTS
// ============================================================
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS || path.join(require('os').tmpdir(), 'iv-questnav-shots');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const f = path.resolve(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    }).listen(+process.env.PORT || 0, () => res(srv));
  });
}

const checks = [];
const ok = (name, cond, info = '') => { checks.push([name, !!cond, info]); };

async function startChar(p, name) {
  await p.click('#au-offline', { timeout: 60000 }); await p.click('#btn-new');
  await p.fill('#cr-name', name); await p.click('#cr-start', { noWaitAfter: true, timeout: 60000 }); await p.waitForTimeout(1500);
  await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {});
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 8000, polling: 250 }).catch(() => {});
  await p.waitForTimeout(600);
  await p.click('#w-help .win-x').catch(() => {});
  await p.evaluate(() => { $$('.win:not(.hidden)').forEach(w => UI.close(w.id)); });
}

// ตัวช่วยในหน้า: วางสนาม (แมพของมอนเควสต์, ล้างมอน, หาช่องโล่ง) + เดินเกมแบบซิงก์ (เหมือน frame(): updateGame → Nav.update → Quest.tick)
const HELPERS = () => {
  window.__qn = {
    field(mapId) {
      Bot.toggle(false); Nav.cancel(true); QuestHunt.stop(null, true);
      $$('.win:not(.hidden)').forEach(w => UI.close(w.id));
      if (G.map.id !== mapId) changeMap(mapId);
      let spot = null;
      const cx = Math.floor(G.map.w / 2), cy = Math.floor(G.map.h / 2);
      for (let r = 0; r < 40 && !spot; r++) for (let y = cy - r; y <= cy + r && !spot; y++) for (let x = cx - r; x <= cx + r && !spot; x++) {
        let open = true;
        for (let dy = -7; dy <= 7 && open; dy++) for (let dx = -9; dx <= 9 && open; dx++) if (!G.map.walkable(x + dx, y + dy)) open = false;
        if (open && !G.map.portals.some(q => U.dist(q.x, q.y, x, y) < 12)) spot = { x, y };
      }
      teleportPlayer(spot.x + 0.5, spot.y + 0.5);
      G.mobs = []; G.drops = []; G.allies = []; G.traps = []; G.respawns = [];
      const pl = G.player; pl.dead = false; recalc(); pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp;
      return spot;
    },
    mob(id, dx, dy) { const pl = G.player; const m = spawnMob(id, { x: Math.floor(pl.x) + dx, y: Math.floor(pl.y) + dy }, false); m.nextWander = 1e9; return m; },
    step(sec, until) {
      for (let i = 0; i < sec * 30; i++) {
        updateGame(1 / 30); Nav.update(); Quest.tick();
        if (window.__qn.rec) window.__qn.rec();
        if (until && until()) return true;
      }
      return until ? !!until() : true;
    },
  };
};

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const srv = await serve();
  const url = `http://localhost:${srv.address().port}/index.html`;
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  else if (fs.existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(opts);
  const errors = [];

  for (const [w, hh, name, mobile] of [[1600, 900, 'pc', false], [390, 844, 'phone', true]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: hh }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
    await ctx.route(/^https:\/\//, r => r.abort());
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(`${name}: ${e.message}`));
    p.on('console', m => { if (m.type() === 'error') console.log(`console.error (${name}): ${m.text()}`); });
    await p.goto(url, { timeout: 120000 }); await p.waitForTimeout(1200);
    await startChar(p, 'Questnav' + name);
    await p.evaluate(HELPERS);

    if (!mobile) {
      // ---------- 1) Novice: เควสต์หลัก "ล่า" → ตีเฉพาะมอนเควสต์จนครบ ----------
      const r1 = await p.evaluate(() => {
        const pl = G.player, k = QUESTS.findIndex(q => q.obj.type === 'kill');
        const q = QUESTS[k];
        pl.quests = { i: k, n: q.obj.n - 2, done: QUESTS.slice(0, k).map(x => x.id), v: 2, id: q.id, side: {} };
        pl.job = 'novice'; pl.stats = { str: 60, agi: 30, vit: 30, int: 1, dex: 40, luk: 1 }; pl.baseLv = 10;
        const t0 = Quest.navTarget();
        __qn.field(t0.map);
        const other = (MAP_DEFS[t0.map].spawns || []).map(s => s[0]).find(id => id !== q.obj.mob && !MOBS[id].boss);
        const qa = __qn.mob(q.obj.mob, 2, 0), qb = __qn.mob(q.obj.mob, -3, 2), qc = __qn.mob(q.obj.mob, 4, -3);
        const idle = __qn.mob(other, -6, -5);       // อยู่เฉย ๆ — ห้ามตี
        const chaser = __qn.mob(other, 0, 3);        // ไล่ตีเรา — สู้กลับได้
        chaser.state = 'chase'; chaser.nextAtk = G.time + 0.5;
        const hits = []; const pa = window.playerAttack;
        window.playerAttack = function (m) { hits.push(m.def.id + (m === chaser ? '*' : '') + (m === idle ? '!' : '')); return pa.apply(this, arguments); };
        const t = Quest.navTarget();
        const hasHunt = !!(t && t.hunt);
        Nav.goTo(t);
        const pills = [];
        __qn.rec = () => { if (QuestHunt.cur && pills.length < 1 && !document.getElementById('nav-pill').hidden) pills.push(document.getElementById('nav-text').textContent); };
        const started = __qn.step(3, () => !!QuestHunt.cur);
        const mode = QuestHunt.cur ? (QuestHunt.cur.bot ? 'bot' : 'manual') : 'none';
        const pillNow = document.getElementById('nav-text').textContent, pillShown = !document.getElementById('nav-pill').hidden;
        const fin = __qn.step(60, () => !QuestHunt.cur);
        window.playerAttack = pa; __qn.rec = null;
        const log = [...document.querySelectorAll('#chat-log > *')].slice(-8).map(e => e.textContent).join(' | ');
        return { hasHunt, started, mode, pillNow, pillShown, pills, fin, curId: Quest.current() && Quest.current().id, qid: q.id, mob: q.obj.mob, other,
          hits: [...new Set(hits)], idleHp: idle.hp === idle.maxHp && !idle.dead, chaserHit: hits.some(x => x.endsWith('*')), idleHit: hits.some(x => x.endsWith('!')),
          botOn: Bot.on, cur: !!QuestHunt.cur, navT: Nav.target && Nav.target.kind, log, leftQuest: [qa, qb, qc].filter(m => !m.dead).length };
      });
      ok('pc: story kill quest nav target carries quest-hunt mode', r1.hasHunt, JSON.stringify(r1));
      ok('pc: on arrival the hunt starts (Novice → manual mode, AUTO stays off)', r1.started && r1.mode === 'manual' && !r1.botOn, r1.mode);
      ok('pc: hunt pill reads "ล่า <mob> a/b · แตะเพื่อหยุด"', r1.pillShown && /^ล่า .+ \d+\/\d+ · แตะเพื่อหยุด$/.test(r1.pillNow), r1.pillNow);
      ok('pc: hunts until the count is done, then stops', r1.fin && !r1.cur && r1.curId !== r1.qid, JSON.stringify({ fin: r1.fin, cur: r1.cur, curId: r1.curId }));
      ok('pc: only the quest mob is sought; a mob attacking us is fought back; idle other mob untouched', r1.hits.some(x => x.startsWith(r1.mob)) && r1.chaserHit && !r1.idleHit && r1.idleHp, JSON.stringify(r1.hits));
      ok('pc: completion announced', /ครบแล้ว/.test(r1.log), r1.log);

      // ---------- 2) เดินเอง (จอย) ระหว่างล่า = หยุด ----------
      const r2 = await p.evaluate(() => {
        const pl = G.player, sq = Side.all().find(q => q.steps[0].type === 'kill');
        pl.quests.side[sq.id] = { k: 0, n: 0 };
        const t = Side.navTarget(sq);
        __qn.field(t.map);
        __qn.mob(sq.steps[0].mob, 2, 0); __qn.mob(sq.steps[0].mob, 3, 2);
        Nav.goTo(t);
        const started = __qn.step(3, () => !!QuestHunt.cur);
        __qn.step(0.5);
        pl.kbAt = 0; stepMove(-1, 0);
        const stopped = !QuestHunt.cur, pill = document.getElementById('nav-pill').hidden;
        // แตะป้ายก็หยุดได้
        Nav.goTo(Side.navTarget(sq));
        const again = __qn.step(3, () => !!QuestHunt.cur);
        document.getElementById('nav-pill').click();
        const tapStop = !QuestHunt.cur;
        delete pl.quests.side[sq.id];
        return { hasHunt: !!t.hunt, started, stopped, pill, again, tapStop };
      });
      ok('pc: side kill step nav carries hunt mode', r2.hasHunt);
      ok('pc: manual move (joystick) cancels the quest hunt', r2.started && r2.stopped && r2.pill, JSON.stringify(r2));
      ok('pc: tapping the hunt pill stops it', r2.again && r2.tapStop, JSON.stringify(r2));

      // ---------- 3) มี Class: บอท AUTO + สกิลที่ตั้งไว้ จำกัดเป้าที่มอนเควสต์ ----------
      const r3 = await p.evaluate(() => {
        const pl = G.player, sq = Side.all().find(q => q.steps[0].type === 'kill'), st = sq.steps[0];
        pl.job = 'einherjar'; pl.baseLv = 30; pl.jobLv = JOBS.einherjar.jobMax; pl.skills = {}; pl.buffs = {}; pl.cds = {}; pl.skillReadyAt = 0;
        for (const id of JOBS.einherjar.skills) if (SKILLS[id] && !SKILLS[id].noLearn) pl.skills[id] = SKILLS[id].max;
        pl.stats = { str: 60, agi: 30, vit: 30, int: 20, dex: 30, luk: 1 };
        unequipInvalid(); if (!pl.inventory.find(e => e.id === JOB_STARTER.einherjar)) addItem(JOB_STARTER.einherjar, 1, true);
        equipItem(pl.inventory.find(e => e.id === JOB_STARTER.einherjar), true);
        const c = Bot.cfg(); c.style = 'skills'; c.leash = false; c.skillHp = {}; c.skipMobs = {}; c.useBuffs = false; c.skills = {};
        for (const id in pl.skills) c.skills[id] = id === 'shield_slam'; // ผู้เล่นตั้งให้ใช้แค่ Shield Slam
        c.skipMobs[st.mob] = true; // แม้ผู้เล่นตั้งข้ามมอนนี้ไว้ ล่าตามเควสต์ก็ยังล่า
        pl.quests.side[sq.id] = { k: 0, n: st.n - 2 };
        const t = Side.navTarget(sq);
        __qn.field(t.map);
        const other = (MAP_DEFS[t.map].spawns || []).map(s => s[0]).find(id => id !== st.mob && !MOBS[id].boss && !MOBS[id].aggro);
        __qn.mob(st.mob, 3, 0); __qn.mob(st.mob, -4, 2); __qn.mob(st.mob, 5, 4);
        const idle = other ? __qn.mob(other, 1, -3) : null; // ใกล้กว่ามอนเควสต์บางตัว — บอทปกติจะเลือก แต่ห้ามแตะ
        pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp;
        const used = [], tg = new Set(); const bs = window.beginSkill, us = window.useSkill;
        window.beginSkill = function (id, lv, tgt) { used.push(id + ':' + (tgt && tgt.def ? tgt.def.id : '?')); return bs.apply(this, arguments); };
        window.useSkill = function (id) { used.push(id + ':self'); return us.apply(this, arguments); };
        __qn.rec = () => { if (pl.target && pl.target.def) tg.add(pl.target.def.id); };
        const wasOn = Bot.on;
        Nav.goTo(t);
        const started = __qn.step(3, () => !!QuestHunt.cur);
        const mode = QuestHunt.cur && QuestHunt.cur.bot, onlyDuring = Bot.only, onDuring = Bot.on, pill = document.getElementById('nav-text').textContent;
        const fin = __qn.step(90, () => !QuestHunt.cur);
        window.beginSkill = bs; window.useSkill = us; __qn.rec = null;
        const after = { only: Bot.only, on: Bot.on, nav: Nav.target && Nav.target.kind, npc: Nav.target && Nav.target.npcId, to: st.to, ready: Side.ready(sq) };
        Nav.cancel(true);
        // บอทเปิดอยู่ก่อน → ครบแล้วยังเปิดค้าง
        pl.quests.side[sq.id] = { k: 0, n: st.n - 1 };
        __qn.field(t.map); __qn.mob(st.mob, 3, 0); __qn.mob(st.mob, 4, 3);
        Bot.toggle(true);
        Nav.goTo(Side.navTarget(sq));
        const s2 = __qn.step(3, () => !!QuestHunt.cur);
        const f2 = __qn.step(60, () => !QuestHunt.cur);
        const keep = { on: Bot.on, only: Bot.only };
        Bot.toggle(false); Nav.cancel(true); delete pl.quests.side[sq.id];
        return { wasOn, started, mode, onlyDuring, onDuring, pill, fin, used: [...new Set(used)], tg: [...tg], other, idleHp: idle ? idle.hp === idle.maxHp && !idle.dead : true, mob: st.mob, after, s2, f2, keep };
      });
      ok('pc: with a Class the hunt runs the AUTO bot restricted to the quest mob', r3.started && r3.mode && r3.onlyDuring === r3.mob && r3.onDuring && !r3.wasOn && /\(AUTO\)/.test(r3.pill), JSON.stringify(r3));
      ok('pc: bot uses the configured skill (Shield Slam) on the quest mob and no disabled skill', r3.used.includes('shield_slam:' + r3.mob) && r3.used.every(x => x.startsWith('shield_slam:')), JSON.stringify(r3.used));
      ok('pc: bot never targets the other mob type (even though nearer)', r3.tg.every(x => x === r3.mob) && r3.idleHp, JSON.stringify({ tg: r3.tg, other: r3.other }));
      ok('pc: count done → restriction lifted, AUTO turned back off (was off)', r3.fin && r3.after.only === null && !r3.after.on, JSON.stringify(r3.after));
      ok('pc: then navigates to the turn-in NPC', r3.after.ready && r3.after.nav === 'npc' && r3.after.npc === r3.after.to, JSON.stringify(r3.after));
      ok('pc: AUTO that was already on stays on after the hunt', r3.s2 && r3.f2 && r3.keep.on && r3.keep.only === null, JSON.stringify(r3.keep));
    }

    // ---------- 4) ทุกขั้นของทุกเควสต์เสริมมีจุดนำทาง ----------
    const r4 = await p.evaluate(() => {
      const pl = G.player, bad = [], hunts = [];
      const save = JSON.stringify(pl.quests.side || {});
      for (const q of Side.all()) q.steps.forEach((st, k) => {
        pl.quests.side = { [q.id]: { k, n: 0 } };
        const t = Side.navTarget(q);
        if (!t) bad.push(`${q.id}#${k}:${st.type}`);
        if ((st.type === 'kill' || st.type === 'collect') && !Side.ready(q)) { if (!t || !t.hunt) bad.push(`${q.id}#${k}:nohunt`); else hunts.push(st.type); }
        if (st.type === 'kill') { pl.quests.side[q.id].n = st.n; const t2 = Side.navTarget(q); if (!t2 || t2.kind !== 'npc' || t2.npcId !== st.to) bad.push(`${q.id}#${k}:turnin`); }
      });
      pl.quests.side = JSON.parse(save);
      pl.baseLv = Math.max(pl.baseLv, 10); recalc(); pl.bounty = null;
      const bs = Bounty.state(), bt = bs && Bounty.navTarget(bs.list[0]);
      return { bad, n: Side.all().reduce((a, q) => a + q.steps.length, 0), hunts: hunts.length, bounty: !!(bt && bt.hunt) };
    });
    ok(`${name}: every side-quest step (${r4.n}) has a navTarget; hunt/collect steps use hunt mode; done kill steps navigate to the turn-in NPC`, !r4.bad.length && r4.hunts > 0, r4.bad.slice(0, 8).join(', '));
    ok(`${name}: bounty "Go" uses hunt mode`, r4.bounty);

    // ---------- 5) หน้าต่างเควสต์: งานเสริมที่รอรับ = ปุ่มนำทาง ----------
    await p.evaluate(() => {
      const pl = G.player; pl.job = 'novice'; pl.baseLv = 18; pl.dead = false; recalc();
      const k = QUESTS.findIndex(q => q.obj.type === 'baseLv' && q.obj.n === 20);
      pl.quests = { i: k, n: 0, done: QUESTS.slice(0, k).map(q => q.id), v: 2, id: QUESTS[k].id, side: {} };
      const kills = Side.all().filter(q => q.steps[0].type === 'kill');
      pl.quests.side[kills[0].id] = { k: 0, n: 4 };
      Bot.toggle(false); Nav.cancel(true);
      if (G.map.id !== HOME_MAP) changeMap(HOME_MAP);
      teleportPlayer(5.5, 5.5);
      QuestUI._p = null; QuestUI.watch(); QuestUI.openBook();
    });
    await p.waitForTimeout(500);
    const r5 = await p.evaluate(() => {
      const card = document.querySelector('#w-quest .q-side'); if (!card) return { card: false };
      card.scrollIntoView({ block: 'start' });
      const vis = e => e.offsetParent && e.getBoundingClientRect().height > 0;
      const rows = [...card.querySelectorAll('.q-avail')].filter(vis);
      const btns = [...card.querySelectorAll('.q-go')].filter(vis).map(b => b.offsetHeight); // ขนาดจริงในเลย์เอาต์ (ไม่นับ transform ตอนหน้าต่างกำลังเปิด)
      const els = [...card.querySelectorAll('*')].filter(vis);
      const round = els.filter(e => { const r = getComputedStyle(e).borderTopLeftRadius; return /%/.test(r) ? parseFloat(r) > 0 : parseFloat(r) > 8; }).map(e => `${e.tagName}.${e.className}:${getComputedStyle(e).borderTopLeftRadius}`);
      const textEls = els.filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
      const small = textEls.filter(e => parseFloat(getComputedStyle(e).fontSize) < 14).map(e => `${e.className || e.tagName}:${getComputedStyle(e).fontSize}`);
      const spaced = textEls.filter(e => /[฀-๿]/.test(e.textContent) && parseFloat(getComputedStyle(e).letterSpacing) > 0).map(e => e.className);
      const plain = /มีงานเสริมรออยู่ที่:/.test(card.textContent);
      return { card: true, rows: rows.length, npcs: rows.map(r => r.dataset.npc), btns, round, small, spaced, plain };
    });
    ok(`${name}: side-quest card lists waiting NPCs as rows with Go buttons (not plain text)`, r5.card && r5.rows > 0 && !r5.plain, JSON.stringify(r5));
    ok(`${name}: side-quest buttons ≥ 44px tall`, r5.btns && r5.btns.length && r5.btns.every(x => x >= 44), JSON.stringify(r5.btns));
    ok(`${name}: side-quest card — radius ≤ 8px, no Thai letter-spacing`, r5.round && !r5.round.length && !r5.spaced.length, JSON.stringify({ r: r5.round, s: r5.spaced }));
    if (mobile) ok(`${name}: side-quest card text ≥ 14px`, r5.small && !r5.small.length, JSON.stringify(r5.small));
    await p.screenshot({ path: path.join(SHOTS, `side_${name}.png`) });
    // ไกล → นำทางไปหา NPC • ใกล้ → เปิดบทสนทนา
    const r5b = await p.evaluate(async () => {
      const row = document.querySelector('#w-quest .q-avail'), id = row.dataset.npc;
      row.querySelector('.q-avail-go').click();
      const t = Nav.target, far = { kind: t && t.kind, npc: t && t.npcId, closed: !UI.isOpen('w-quest') };
      // เดินตามนำทางจนถึง → บทสนทนาเปิดเอง
      const arrived = __qn.step(90, () => !Nav.target);
      for (let i = 0; i < 20 && !UI.isOpen('w-dialog'); i++) { await new Promise(r => setTimeout(r, 100)); __qn.step(0.1); }
      const reached = arrived && UI.isOpen('w-dialog');
      const dlg = document.querySelector('#w-dialog'), txt = dlg ? dlg.textContent : '';
      for (let i = 0; i < 4 && UI.isOpen('w-dialog'); i++) { UI.dlgClose(); await new Promise(r => setTimeout(r, 150)); }
      // อยู่ใกล้แล้วกดอีกครั้ง = เปิดบทสนทนาเลย
      await new Promise(r => setTimeout(r, 300));
      QuestUI.openBook(); await new Promise(r => setTimeout(r, 300));
      const row2 = document.querySelector(`#w-quest .q-avail[data-npc="${id}"]`);
      if (row2) row2.querySelector('.q-avail-go').click();
      await new Promise(r => setTimeout(r, 600));
      const near = UI.isOpen('w-dialog') && !Nav.target;
      for (let i = 0; i < 4 && UI.isOpen('w-dialog'); i++) { UI.dlgClose(); await new Promise(r => setTimeout(r, 150)); }
      return { id, far, reached, offer: /เควสต์เสริม|Side quest/.test(txt), near, row2: !!row2 };
    });
    ok(`${name}: tapping a waiting NPC navigates there`, r5b.far.kind === 'npc' && r5b.far.npc === r5b.id && r5b.far.closed, JSON.stringify(r5b));
    ok(`${name}: on arrival the NPC dialog opens with the side-quest offer`, r5b.reached && r5b.offer, JSON.stringify(r5b));
    ok(`${name}: when already near, tapping opens the dialog directly`, r5b.near || !r5b.row2, JSON.stringify(r5b));

    // ---------- ป้ายล่า (ภาพหน้าจอ) ----------
    await p.evaluate(() => {
      const pl = G.player, sq = Side.all().find(q => q.steps[0].type === 'kill'), st = sq.steps[0];
      pl.quests.side[sq.id] = { k: 0, n: 4 };
      const t = Side.navTarget(sq); __qn.field(t.map);
      __qn.mob(st.mob, 2, 0); __qn.mob(st.mob, 4, 2); __qn.mob(st.mob, -3, 3);
      Nav.goTo(t); __qn.step(3, () => !!QuestHunt.cur); __qn.step(0.4);
    });
    await p.waitForTimeout(4500); // ป้ายชื่อแผนที่/MVP กลางจอบนหายก่อน (ป้ายนำทางอยู่ตำแหน่งใกล้กัน)
    const pill = await p.evaluate(() => { const el = document.getElementById('nav-pill'), b = el.getBoundingClientRect(), tx = document.getElementById('nav-text');
      return { shown: !el.hidden, txt: tx.textContent, fs: parseFloat(getComputedStyle(tx).fontSize), h: b.height, x: b.x, w: b.width, cut: tx.scrollWidth > tx.clientWidth + 1 }; });
    ok(`${name}: hunt pill visible, ≥ 14px, fits the screen`, pill.shown && /ล่า .+ \d+\/\d+ · แตะเพื่อหยุด/.test(pill.txt) && pill.fs >= 14 && pill.x >= 0 && pill.x + pill.w <= w, JSON.stringify(pill));
    await p.screenshot({ path: path.join(SHOTS, `huntpill_${name}.png`) });
    await p.evaluate(() => { Nav.cancel(true); });

    // ---------- 6) แถบติดตาม (คอม): แตะบรรทัดเควสต์เสริม = นำทาง ----------
    if (!mobile) {
      const r6 = await p.evaluate(() => {
        Quest.dirty = true; Quest.tick(); UIKit.paintQt(true);
        const b = document.querySelector('#quest-track .qt-side'); if (!b) return { line: false };
        const vis = !!b.offsetParent;
        b.click();
        const t = Nav.target; const r = { line: true, vis, kind: t && t.kind, hunt: !!(t && t.hunt) };
        Nav.cancel(true);
        return r;
      });
      ok('pc: HUD tracker shows the side quest line and tapping it navigates (hunt mode)', r6.line && r6.vis && r6.kind === 'mob' && r6.hunt, JSON.stringify(r6));
      await p.screenshot({ path: path.join(SHOTS, `tracker_${name}.png`), clip: { x: 0, y: 100, width: 420, height: 360 } });
    }
    await ctx.close();
  }

  await browser.close(); srv.close();
  ok('no page errors', !errors.length, errors.slice(0, 5).join(' | '));
  let fail = 0;
  for (const [n, c, info] of checks) { if (!c) fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${!c && info ? `  — ${info}` : ''}`); }
  console.log(`\n${checks.length - fail}/${checks.length} passed • shots: ${SHOTS}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
