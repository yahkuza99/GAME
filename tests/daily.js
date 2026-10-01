'use strict';
// ============================================================
//  Daily Ops + Streak (js/daily.js) — Playwright
//  รัน:  NODE_PATH=$(npm root -g) node tests/daily.js
//  ตรวจ: วันเดียวกันได้ภารกิจชุดเดิม • นับความคืบหน้า/เปิดหีบ • สตรีคข้ามวัน (นาฬิกาจำลอง) • ขาดวัน (ลดสตรีค)
//        เซฟ/โหลด • โหมดอังกฤษไม่มีภาษาไทยใน UI ประจำวัน • ภาพหน้าจอ (desktop/phone × th/en) → $SHOTS (ค่าเริ่มต้น: โฟลเดอร์ temp)
// ============================================================
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SHOTS = process.env.SHOTS || path.join(require('os').tmpdir(), 'neo-midgard-daily-shots');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    }).listen(+process.env.PORT || 0, () => res(srv));
  });
}

const checks = [];
const ok = (name, cond, info = '') => { checks.push([name, !!cond, info]); };
const THAI = /[฀-๿]/;
// 10 มี.ค. 2026 เที่ยงวัน (เวลาท้องถิ่น) + n วัน
const DAY0 = new Date(2026, 2, 10, 12, 0, 0).getTime();
const at = n => DAY0 + n * 864e5;

async function startChar(p, name) {
  await p.click('#au-offline'); await p.click('#btn-new');
  await p.fill('#cr-name', name); await p.click('#cr-start'); await p.waitForTimeout(1500);
  await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {});
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 8000, polling: 250 }).catch(() => {});
  await p.waitForTimeout(600);
  await p.click('#w-help .win-x').catch(() => {});
  await p.evaluate(() => { $$('.win:not(.hidden)').forEach(w => UI.close(w.id)); });
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const srv = await serve();
  const url = `http://localhost:${srv.address().port}/index.html`;
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  else if (fs.existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(opts);
  const errors = [];

  // ================= ตรรกะหลัก (desktop, ไทย) =================
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(`logic: ${e.message}`));
    await p.goto(url); await p.waitForTimeout(1200);
    await startChar(p, 'Dailytest');

    ok('script loaded + save field', await p.evaluate(() => typeof Daily === 'object' && SAVE_FIELDS.includes('daily')));
    ok('locked below Lv 5', await p.evaluate(D0 => { Daily.now = () => D0; return G.player.baseLv < 5 && Daily.state() === null && Daily.badgeText() === ''; }, at(0)));

    // ---- วันเดียวกัน = ชุดเดิม ----
    const det = await p.evaluate(D0 => {
      const pl = G.player; pl.baseLv = 20; recalc(); Daily.now = () => D0;
      pl.daily = undefined; const a = JSON.stringify(Daily.state().tasks);
      pl.daily = undefined; Daily.now = () => D0 + 5 * 3600e3; const b = JSON.stringify(Daily.state().tasks); // คนละชั่วโมง วันเดียวกัน
      pl.daily = undefined; pl.baseLv = 22; const c = JSON.stringify(Daily.state().tasks); pl.baseLv = 20; // ช่วงเลเวลเดียวกัน (20–24)
      const days = new Set(); for (let i = 0; i < 8; i++) days.add(JSON.stringify(Daily.roll(Daily.dayKey(D0 + i * 864e5), pl.name, 4)));
      const other = JSON.stringify(Daily.roll(Daily.dayKey(D0), 'Someone', 4));
      Daily.now = () => D0; pl.daily = undefined; Daily.state();
      return { same: a === b && a === c, variety: days.size, otherChar: other !== a, n: JSON.parse(a).length, a };
    }, at(0));
    ok('same date → same 3 tasks (reload/hour/level-in-band)', det.same && det.n === 3, det.a);
    ok('different dates / characters → different tasks', det.variety >= 5 && det.otherChar, `distinct=${det.variety}`);

    // ---- คลังภารกิจตามช่วงเลเวล ----
    const bands = await p.evaluate(() => {
      const out = [];
      for (const lv of [5, 9, 12, 18, 25, 33, 45, 60]) for (let i = 0; i < 20; i++) {
        const day = Daily.dayKey(Date.UTC(2026, 0, 1 + i)), ts = Daily.roll(day, 'X' + i, Daily.band(lv)), kinds = ts.map(t => t.t);
        const bad = ts.length !== 3 || new Set(kinds).size !== 3 || !['hunt', 'map'].includes(kinds[0])
          || ts.some(t => Daily.KINDS[t.t].minLv > Daily.band(lv) * 5 + 2 || !(t.n > 0) || t.got !== 0)
          || ts.some(t => t.t === 'hunt' && Math.abs(MOBS[t.mob].lv - lv) > 20) || !Daily.validTasks(ts);
        if (bad) out.push(`${lv}:${JSON.stringify(ts)}`);
      }
      return out;
    });
    ok('level-band pools: valid, 3 distinct kinds, gated by level', !bands.length, bands.slice(0, 2).join(' | '));

    // ---- ความคืบหน้าผ่านเหตุการณ์จริงของเกม ----
    const prog = await p.evaluate(D0 => {
      const pl = G.player; Daily.now = () => D0; pl.daily = undefined;
      const s = Daily.state(), mob = Object.values(MOBS).find(m => !m.boss && !m.dummy && Daily.mapOf(m.id));
      s.tasks = [{ t: 'hunt', mob: mob.id, n: 4, got: 0 }, { t: 'skill', n: 2, got: 0 }, { t: 'sell', n: 10, got: 0 }];
      const r = {};
      Quest.onKill(mob.id); r.k1 = s.tasks[0].got;
      Party.party = { id: 'x', members: new Map([['m1', {}]]) }; Quest.onKill(mob.id); Party.party = null; r.k2 = s.tasks[0].got; // ปาร์ตี้ ×2
      Quest.onKill(mob.id); r.k3 = s.tasks[0].got;
      Quest.onSkillUse(); Quest.onSkillUse(); Quest.onSkillUse(); r.sk = s.tasks[1].got;
      r.claimEarly = Daily.claim() === null && !Daily.canClaim();
      r.badge = Daily.badgeText();
      addItem('fenrir_fang', 1, true); const e = pl.inventory.find(x => x.id === 'fenrir_fang'); UI.sell(e, 1); r.sell = s.tasks[2].got;
      r.badgeReady = Daily.badgeText();
      // ชนิดอื่น: map / loot (เก็บเอง + auto loot) / refine / mvp
      s.tasks = [{ t: 'map', map: G.map.id, n: 1, got: 0 }, { t: 'loot', n: 3, got: 0 }, { t: 'refine', n: 1, got: 0 }];
      Quest.onKill(mob.id); r.map = s.tasks[0].got;
      const d = { uid: G.uid++, id: 'jelly_drop', qty: 1, x: pl.x, y: pl.y, born: G.time, pop: 0 }; G.drops.push(d); pickUp(d); r.loot1 = s.tasks[1].got;
      const al = pl.options.autoLoot; pl.options.autoLoot = true; dropItemOnGround('jelly_drop', pl.x, pl.y); pl.options.autoLoot = al; r.loot2 = s.tasks[1].got;
      Quest.onEvent('refine'); r.refine = s.tasks[2].got;
      s.tasks[2] = { t: 'mvp', n: 1, got: 0 }; Quest.onKill('seraph_pudding'); r.mvp = s.tasks[2].got;
      return r;
    }, at(0));
    ok('kill counts (party kills ×2)', prog.k1 === 1 && prog.k2 === 3 && prog.k3 === 4, JSON.stringify(prog));
    ok('skill uses count (capped)', prog.sk === 2);
    ok('cannot claim before all 3 are done', prog.claimEarly && prog.badge === '1');
    ok('selling counts Volt earned', prog.sell === 10 && prog.badgeReady === '!');
    ok('map / loot (pickup + auto loot) / refine / MVP count', prog.map === 1 && prog.loot1 === 1 && prog.loot2 === 2 && prog.refine === 1 && prog.mvp === 1, JSON.stringify(prog));

    // ---- เปิดหีบ + สตรีคข้ามวัน ----
    const run = await p.evaluate(D0 => {
      const pl = G.player, out = [];
      const finish = () => { const s = Daily.state(); for (const t of s.tasks) t.got = t.n; return s; };
      pl.daily = undefined;
      for (let i = 0; i < 8; i++) {
        Daily.now = () => D0 + i * 864e5;
        finish();
        const z0 = pl.zeny, ygg0 = countItem('yggdrasil_shard');
        const r = Daily.claim();
        out.push({ day: Daily.state().day, streak: r.streak, ladder: r.day, rare: r.rare, gotZeny: pl.zeny - z0 === r.zeny, ygg: countItem('yggdrasil_shard') - ygg0, zeny: r.zeny, again: Daily.claim() === null });
      }
      return out;
    }, at(1));
    ok('claim pays once per day', run.every(x => x.gotZeny && x.again), JSON.stringify(run.map(x => x.zeny)));
    ok('streak 1→8 across consecutive days', run.map(x => x.streak).join() === '1,2,3,4,5,6,7,8', run.map(x => x.streak).join());
    ok('day 7 = rare cache (Yggdrasil Core); day 8 restarts ladder', run[6].rare && run[6].ygg === 1 && run[6].ladder === 7 && run[7].ladder === 1 && !run[7].rare);
    ok('rewards climb through the week, week 2 has +10% Volt', run[1].zeny > run[0].zeny && run[6].zeny > run[5].zeny && run[7].zeny > run[0].zeny, run.map(x => x.zeny).join());

    // ---- ขาดวัน: ลด 2 ต่อวันที่ขาด ----
    const miss = await p.evaluate(D0 => {
      const pl = G.player, r = {};
      const finish = () => { const s = Daily.state(); for (const t of s.tasks) t.got = t.n; };
      pl.daily = { v: 1, streak: 5, last: Daily.dayKey(D0), best: 5, total: 5, day: Daily.dayKey(D0), claimed: true };
      Daily.now = () => D0 + 864e5; r.next1 = Daily.liveStreak(); r.missed1 = Daily.missed(); // วันถัดไป: ไม่ขาด
      Daily.now = () => D0 + 2 * 864e5; r.live2 = Daily.liveStreak(); r.missed2 = Daily.missed(); finish(); r.after2 = Daily.claim().streak; // ขาด 1 วัน
      Daily.now = () => D0 + 9 * 864e5; r.live9 = Daily.liveStreak(); finish(); r.after9 = Daily.claim().streak; // ขาด 6 วัน → รีเซ็ต
      r.best = Daily.state().best;
      return r;
    }, at(20));
    ok('no missed day → streak kept', miss.next1 === 5 && miss.missed1 === 0, JSON.stringify(miss));
    ok('1 missed day → streak eased by 2 (5→3, claim → 4)', miss.live2 === 3 && miss.missed2 === 1 && miss.after2 === 4);
    ok('long break → back to day 1; best kept', miss.live9 === 0 && miss.after9 === 1 && miss.best === 5);

    // ---- เซฟ/โหลด ----
    const rt = await p.evaluate(D0 => {
      const pl = G.player; Daily.now = () => D0; pl.daily = undefined;
      const s = Daily.state(); s.streak = 3; s.last = Daily.dayKey(D0 - 864e5); s.best = 6; s.total = 9; s.tasks[0].got = 2;
      const data = JSON.parse(JSON.stringify(saveData()));
      const p2 = loadGameFrom(data);
      const old = loadGameFrom(Object.assign({}, data, { daily: undefined }));
      const junk = loadGameFrom(Object.assign({}, data, { daily: 'garbage' }));
      G.player = old; const oldOk = Daily.state() && Daily.state().tasks.length === 3 && Daily.state().streak === 0;
      G.player = junk; const junkOk = Daily.state() && Daily.state().tasks.length === 3;
      G.player = pl;
      return { eq: JSON.stringify(p2.daily) === JSON.stringify(pl.daily), oldOk, junkOk, tasks: JSON.stringify(pl.daily.tasks) };
    }, at(30));
    ok('save/load roundtrip keeps daily state', rt.eq);
    ok('old saves (no daily / junk) still work', rt.oldOk && rt.junkOk);
    await p.evaluate(() => saveGame(true, true)); await p.reload(); await p.waitForTimeout(1300);
    await p.evaluate(D0 => { Daily.now = () => D0; }, at(30));
    await p.click('#au-offline'); await p.click('#btn-continue'); await p.waitForTimeout(1300);
    const after = await p.evaluate(() => ({ started: G.started, tasks: JSON.stringify(Daily.state().tasks), streak: Daily.state().streak, best: Daily.state().best }));
    ok('page reload → same tasks + progress (no reroll)', after.started && after.tasks === rt.tasks && after.streak === 3 && after.best === 6, after.tasks);

    // ---- UI: แท็บ / ป้าย / ปุ่มเปิดหีบ / ฉากเปิดหีบ ----
    const ui = await p.evaluate(() => {
      const s = Daily.state(); s.claimed = false; for (const t of s.tasks) t.got = 0; Daily.changed(); Daily._tickAt = 0; Daily.tick(); Quest.dirty = true; Quest.tick();
      const r = {};
      r.badge = (document.querySelector('#menubar button[data-win="w-quest"] .dl-badge') || {}).textContent;
      r.chip = !!document.querySelector('#quest-track .dl-chip');
      document.querySelector('#quest-track .dl-chip').click();
      r.open = UI.isOpen('w-quest') && UI.questTab === 'daily';
      r.rows = $$('#w-quest .dl-task').length; r.disabled = document.querySelector('#w-quest .dl-claim').disabled;
      r.go = $$('#w-quest .dl-go').length;
      for (const t of s.tasks) t.got = t.n; Daily.changed(); UI.renderQuest();
      r.enabled = !document.querySelector('#w-quest .dl-claim').disabled;
      r.badge2 = document.querySelector('#menubar button[data-win="w-quest"] .dl-badge').textContent;
      // แท็บเนื้อเรื่องยังทำงาน
      document.querySelector('#w-quest [data-qtab="story"]').click(); r.story = !!document.querySelector('#w-quest .q-card h4') && !!document.querySelector('#w-quest .dl-tabs');
      document.querySelector('#w-quest [data-qtab="daily"]').click(); r.back = $$('#w-quest .dl-task').length === 3;
      return r;
    });
    ok('menu badge + tracker chip', ui.badge === '3' && ui.chip, JSON.stringify(ui));
    ok('chip opens Daily tab with 3 tasks, claim disabled until done', ui.open && ui.rows === 3 && ui.disabled && ui.go >= 1);
    ok('claim enabled when done; badge shows "!"', ui.enabled && ui.badge2 === '!');
    ok('Story/Daily tabs switch', ui.story && ui.back);
    await p.click('#w-quest .dl-claim'); await p.waitForTimeout(1600);
    const rv = await p.evaluate(() => ({ shown: !!document.querySelector('#dl-reveal'), items: $$('#dl-reveal .dl-rv-it').length, claimed: Daily.state().claimed, badge: document.querySelector('#menubar button[data-win="w-quest"] .dl-badge').hidden }));
    ok('claim button → reward reveal', rv.shown && rv.items >= 3 && rv.claimed && rv.badge, JSON.stringify(rv));
    await p.click('#dl-reveal .btn'); await p.waitForTimeout(400);
    ok('reveal closes', await p.evaluate(() => !document.querySelector('#dl-reveal')));
    await ctx.close();
  }

  // ================= UI + ภาพหน้าจอ (desktop/phone × th/en) =================
  for (const lang of ['th', 'en']) for (const [w, hgt, name, mobile] of [[1280, 720, 'desktop', false], [390, 844, 'phone', true]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: hgt }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
    await ctx.addInitScript(l => { try { localStorage.setItem('nm_lang', l); } catch (e) { /* */ } }, lang);
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(`${lang}/${name}: ${e.message}`));
    await p.goto(url); await p.waitForTimeout(1200);
    await startChar(p, lang === 'en' ? 'Astrid' : 'Sigrun');
    await p.evaluate(D0 => {
      Daily.now = () => D0;
      const pl = G.player; pl.baseLv = 18; recalc();
      pl.daily = { v: 1, streak: 3, last: Daily.dayKey(D0 - 864e5), best: 5, total: 7 };
      const s = Daily.state(); s.tasks[0].got = s.tasks[0].n; s.tasks[1].got = Math.floor(s.tasks[1].n / 2);
      Daily.changed(); Daily._tickAt = 0; Daily.tick(); Quest.dirty = true; Quest.tick();
    }, at(40));
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(SHOTS, `daily_hud_${name}_${lang}.png`) });
    await p.evaluate(() => Daily.openTab()); await p.waitForTimeout(500);
    await p.screenshot({ path: path.join(SHOTS, `daily_tab_${name}_${lang}.png`) });
    const vis = await p.evaluate(() => { const r = document.querySelector('#w-quest').getBoundingClientRect(); return { l: r.left, r: r.right, w: innerWidth, sw: document.documentElement.scrollWidth }; });
    ok(`${lang}/${name}: daily window fits screen`, vis.l >= -1 && vis.r <= vis.w + 1 && vis.sw <= vis.w + 1, JSON.stringify(vis));
    // ทำครบ → เปิดหีบวันที่ 7 (ของหายาก)
    await p.evaluate(D0 => { const s = Daily.state(); s.streak = 6; s.last = Daily.dayKey(D0 - 864e5); for (const t of s.tasks) t.got = t.n; Daily.changed(); UI.renderQuest(); }, at(40));
    await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(SHOTS, `daily_ready_${name}_${lang}.png`) });
    await p.click('#w-quest .dl-claim'); await p.waitForTimeout(1900);
    await p.screenshot({ path: path.join(SHOTS, `daily_reveal_${name}_${lang}.png`) });
    const txt = await p.evaluate(() => ({ rv: document.querySelector('#dl-reveal').innerText, rare: document.querySelector('#dl-reveal').classList.contains('rare') }));
    ok(`${lang}/${name}: day-7 rare reveal`, txt.rare && /Yggdrasil Core/.test(txt.rv), txt.rv.replace(/\n/g, ' '));
    await p.click('#dl-reveal .btn'); await p.waitForTimeout(350);
    if (lang === 'en') {
      const en = await p.evaluate(() => {
        const out = [];
        const chk = (k, t) => { if (/[฀-๿]/.test(t || '')) out.push(`${k}: ${t.replace(/\s+/g, ' ').slice(0, 160)}`); };
        chk('tab', document.querySelector('#w-quest .win-body').innerText);
        chk('chip', (document.querySelector('.dl-chip') || {}).innerText);
        chk('chip-title', (document.querySelector('.dl-chip') || {}).title);
        // ทุกชนิดภารกิจ + ข้อความที่สร้าง
        for (const k of Object.keys(Daily.KINDS)) {
          const mob = Object.values(MOBS).find(m => !m.boss && !m.dummy && Daily.mapOf(m.id));
          const t = { t: k, n: 5, got: 1, mob: mob.id, map: Daily.mapOf(mob.id) };
          chk(k, Daily.title(t) + ' ' + Daily.sub(t));
        }
        Daily.state().claimed = false; Daily.state().tasks.forEach(t => { t.got = 0; }); Daily.state().streak = 9; Daily.state().last = Daily.dayKey(Daily.now() - 3 * 864e5);
        UI.questTab = 'daily'; document.querySelector('#w-quest .win-body').dataset.dk = ''; UI.renderQuest();
        chk('tab-missed', document.querySelector('#w-quest .win-body').innerText);
        Daily._greeted = false; Daily._tickAt = 0; Daily.tick();
        chk('chat', $$('#chat-log .cl').slice(-30).map(e => e.textContent).filter(t => /daily|cache|streak|☀/i.test(t)).join(' / '));
        UI.questTab = 'story'; document.querySelector('#w-quest .win-body').dataset.key = ''; UI.renderQuest();
        chk('tabs', document.querySelector('#w-quest .dl-tabs').innerText);
        return out;
      });
      ok(`en/${name}: no Thai in daily UI`, !en.length, en.join(' | '));
    }
    await ctx.close();
  }

  await browser.close(); srv.close();
  ok('no page errors', !errors.length, errors.slice(0, 5).join(' | '));
  let fail = 0;
  for (const [n, pass, info] of checks) { if (!pass) fail++; console.log(`${pass ? '✔' : '✘'} ${n}${info !== '' ? `  (${info})` : ''}`); }
  console.log(fail ? `\n${fail} FAILED` : `\nALL ${checks.length} PASSED`);
  console.log(`screenshots: ${SHOTS}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
