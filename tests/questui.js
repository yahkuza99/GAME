'use strict';
// ============================================================
//  หน้าต่างเควสต์ + ป้าย "เควสต์สำเร็จ!" (js/questui.js) — Playwright
//  รัน:  CHROME=<chrome-headless-shell> NODE_PATH=$(npm root -g) node tests/questui.js
//  ตรวจ (มือถือ 390×844 + คอม 1600×900): ไม่มีส่วนไหนถูกตัด (scrollHeight ≤ clientHeight ทุกการ์ด) • ไม่มีแถบสัดส่วน • มุม ≤ 8px
//        ตัวเล็กสุด 14px บนมือถือ • ไม่ถ่างตัวอักษร • ลำดับ: รับรางวัล → เควสต์หลัก → เสริม → ค่าหัว • ปุ่มรับรางวัล ≥ 44px
//        ค่าหัวครบ → ป้ายขึ้น 1 ครั้ง (ไม่ซ้ำ) + ปุ่ม Quest เรือง • กดรับรางวัลใกล้ Rolf → บอร์ดค่าหัว → รับได้จริง → ป้ายบนปุ่มหาย
//        เควสต์หลักสำเร็จ → ป้ายใหญ่ 1 ครั้ง • ภาพหน้าจอ → $SHOTS
// ============================================================
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS || path.join(require('os').tmpdir(), 'iv-questui-shots');
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

// สถานะแบบภาพของเจ้าของ: บทที่ 3 "Base Lv 20" (Lv 18) • เควสต์เสริมล่า 4/12 + อีกอันล่าครบ • ค่าหัว 3 งาน
const SETUP = () => {
  const pl = G.player;
  pl.baseLv = 18; recalc();
  const k = QUESTS.findIndex(q => q.obj.type === 'baseLv' && q.obj.n === 20);
  pl.quests = { i: k, n: 0, done: QUESTS.slice(0, k).map(q => q.id), v: 2, id: QUESTS[k].id, side: {} };
  const kills = Side.all().filter(q => q.steps[0].type === 'kill');
  pl.quests.side[kills[0].id] = { k: 0, n: 4 };
  pl.quests.side[kills[1].id] = { k: 0, n: kills[1].steps[0].n };
  pl.bounty = null; Bounty.state();
  QuestUI._p = null; QuestUI.watch(); // เข้าเกม: ของที่ครบอยู่แล้วไม่ประกาศ
  return { k, side: [kills[0].id, kills[1].id] };
};

// วัดหน้าต่างเควสต์
const MEASURE = () => {
  const body = document.querySelector('#w-quest .win-body');
  const kids = [...body.children];
  const clipped = [...body.querySelectorAll(':scope > *, .q-card, .q-blist, .q-clist, .q-crow, .q-bnt, .q-obj, .q-rw, .opt-btns, .q-note')]
    .filter(e => e.offsetParent && e.scrollHeight > e.clientHeight + 1).map(e => `${e.className}:${e.scrollHeight}>${e.clientHeight}`);
  const nested = [...body.querySelectorAll('*')].filter(e => e.offsetParent).filter(e => { const s = getComputedStyle(e); return /(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 1; }).map(e => e.className);
  const vis = e => e.offsetParent && e.getBoundingClientRect().height > 0;
  const bars = [...document.querySelectorAll('#w-quest .q-bar, #w-quest .q-dbar, #w-quest .dl-bar, #w-quest .lw-bar')].filter(vis).length;
  const els = [...document.querySelectorAll('#w-quest *')].filter(vis);
  const round = els.filter(e => !e.closest('.win-x, .orn-k')).filter(e => { const r = getComputedStyle(e).borderTopLeftRadius; return /%/.test(r) ? parseFloat(r) > 0 : parseFloat(r) > 8; })
    .map(e => `${e.tagName}.${e.className}:${getComputedStyle(e).borderTopLeftRadius}`);
  const THAI = /[฀-๿]/;
  const textEls = els.filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
  const small = textEls.filter(e => parseFloat(getComputedStyle(e).fontSize) < 14).map(e => `${e.className || e.tagName}:${getComputedStyle(e).fontSize}:${e.textContent.trim().slice(0, 20)}`);
  const spaced = textEls.filter(e => THAI.test(e.textContent) && parseFloat(getComputedStyle(e).letterSpacing) > 0).map(e => `${e.className}:${getComputedStyle(e).letterSpacing}`);
  const order = kids.map(e => ['dl-tabs', 'q-claim', 'q-main', 'q-side', 'q-bounty', 'q-done'].find(c => e.classList.contains(c)) || '?');
  const btns = [...body.querySelectorAll('.q-claim-btn')].map(b => Math.round(b.getBoundingClientRect().height));
  const go = [...body.querySelectorAll('.q-go, .q-main-go')].filter(vis).map(b => Math.round(b.getBoundingClientRect().height));
  return { clipped, nested, bars, round, small, spaced, order, btns, go, bodyScroll: body.scrollHeight > body.clientHeight, text: body.textContent };
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

  for (const [w, hh, name, mobile] of [[390, 844, 'phone', true], [1600, 900, 'pc', false]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: hh }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
    await ctx.route(/^https:\/\//, r => r.abort());
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(`${name}: ${e.message}`));
    p.on('crash', () => console.log('PAGE CRASH ' + name)); p.on('console', m => { if (m.type() === 'error') console.log('console.error: ' + m.text()); });
    await p.goto(url, { timeout: 120000 }); await p.waitForTimeout(1200);
    await startChar(p, 'Questui' + name);
    if (mobile) ok(`${name}: phone (pad) mode`, await p.evaluate(() => document.body.classList.contains('pad-mode')));

    const set = await p.evaluate(SETUP);
    ok(`${name}: setup at the Base Lv 20 story quest`, set.k > 0, JSON.stringify(set));

    // ---- ค่าหัวครบ → ป้ายขึ้นครั้งเดียว ----
    await p.evaluate(() => {
      window.__qd = []; const b0 = QuestUI.banner.bind(QuestUI);
      QuestUI.banner = o => { window.__qd.push(o.key); return b0(o); };
      const pl = G.player, b = Bounty.state().list[0];
      for (let i = 0; i < b.n; i++) killMob(spawnMob(b.mob, { x: pl.x + 2, y: pl.y }));
    });
    await p.waitForFunction(() => { const el = document.getElementById('qd-banner'); return el && el.classList.contains('show'); }, null, { timeout: 15000 }).catch(() => {});
    const bn = await p.evaluate(() => {
      const el = document.getElementById('qd-banner'), b = Bounty.state().list[0];
      const shown = !!el && el.classList.contains('show'), txt = el ? el.textContent : '';
      const box = el ? el.getBoundingClientRect() : null;
      return { calls: window.__qd.slice(), shown, txt, mob: MOBS[b.mob].name, box: box && { x: box.x, y: box.y, w: box.width, h: box.height } };
    });
    ok(`${name}: bounty complete → centered banner "เควสต์สำเร็จ!" with name + tap hint`, bn.shown && bn.txt.includes('เควสต์สำเร็จ') && bn.txt.includes(bn.mob) && bn.txt.includes('แตะเพื่อรับรางวัล'), JSON.stringify(bn));
    ok(`${name}: banner fits the screen`, bn.box && bn.box.x >= 8 && bn.box.x + bn.box.w <= w - 8 && bn.box.h >= 56, JSON.stringify(bn.box));
    await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(SHOTS, `banner_${name}.png`) });
    const once = await p.evaluate(async () => { await new Promise(r => setTimeout(r, 4500)); const el = document.getElementById('qd-banner'); return { shown: el.classList.contains('show') }; });
    ok(`${name}: banner hides after ~3.5 s`, !once.shown);
    await p.evaluate(() => { const pl = G.player, b = Bounty.state().list[0]; killMob(spawnMob(b.mob, { x: pl.x + 2, y: pl.y })); return new Promise(r => setTimeout(r, 1200)); }); // ล่าเกินอีกตัว: ไม่ประกาศซ้ำ
    const bcount = await p.evaluate(() => { const k = [...QuestUI.seen].filter(x => x.startsWith('b:')); return k.length; });
    const again = await p.evaluate(() => document.getElementById('qd-banner').classList.contains('show'));
    const allCalls = await p.evaluate(() => window.__qd.filter(k => k.startsWith('b:')));
    ok(`${name}: one banner per quest (no repeat)`, allCalls.length === 1 && bcount === 1 && !again, JSON.stringify({ calls: allCalls, bcount }));
    const badge = await p.evaluate(() => { const q = document.getElementById('qt-btn'), t = document.getElementById('quest-track'), c = t && t.querySelector('.qd-chip');
      return { qt: !!q && q.classList.contains('qd-ready'), bt: (q && q.querySelector('.qt-badge') || {}).textContent, track: !!t && t.classList.contains('qd-ready'), chip: c ? c.textContent : '' }; });
    ok(`${name}: Quest button highlighted with "!" while a reward waits`, mobile ? badge.qt && badge.bt === '!' : badge.track && /รับรางวัลได้ 2 งาน/.test(badge.chip), JSON.stringify(badge));
    if (!mobile) await p.screenshot({ path: path.join(SHOTS, `track_${name}.png`) });

    // ---- หน้าต่างเควสต์ ----
    await p.evaluate(() => { const pl = G.player; pl.dead = false; QuestUI.openBook(); });
    await p.waitForTimeout(500);
    const m = await p.evaluate(MEASURE);
    ok(`${name}: nothing clipped inside the quest window`, !m.clipped.length, m.clipped.join(' | '));
    ok(`${name}: one scroll for the whole window (no nested scroll boxes)`, !m.nested.length, m.nested.join(','));
    ok(`${name}: order = tabs → claim → story → side → bounty → completed`, m.order.join(',') === 'dl-tabs,q-claim,q-main,q-side,q-bounty,q-done', m.order.join(','));
    ok(`${name}: big "รับรางวัล" button for each completed quest (≥ 44px)`, m.btns.length === 2 && m.btns.every(x => x >= 44) && m.text.includes('รับรางวัล'), JSON.stringify(m.btns));
    ok(`${name}: go/navigate buttons ≥ 44px`, m.go.length >= 3 && m.go.every(x => x >= 44), JSON.stringify(m.go));
    ok(`${name}: no proportion bars`, m.bars === 0, m.bars);
    ok(`${name}: no capsule shapes (radius ≤ 8px)`, !m.round.length, m.round.slice(0, 6).join(' | '));
    ok(`${name}: no letter-spacing on Thai text`, !m.spaced.length, m.spaced.slice(0, 6).join(' | '));
    if (mobile) ok(`${name}: smallest text ≥ 14px`, !m.small.length, m.small.slice(0, 8).join(' | '));
    ok(`${name}: progress shown as numbers`, /Base Lv 18\/20/.test(m.text) && /\d+\/\d+/.test(m.text));
    await p.screenshot({ path: path.join(SHOTS, `quest_${name}.png`) });
    if (mobile) { // เลื่อนลงดูส่วนล่าง
      await p.evaluate(() => { const b = document.querySelector('#w-quest .win-body'); b.scrollTop = b.scrollHeight; });
      await p.waitForTimeout(200);
      await p.screenshot({ path: path.join(SHOTS, `quest_${name}_bottom.png`) });
    }
    for (const tab of ['daily', 'lore']) {
      await p.evaluate(t => document.querySelector(`#w-quest [data-qtab="${t}"]`).click(), tab);
      await p.waitForTimeout(300);
      const mt = await p.evaluate(MEASURE);
      ok(`${name}: ${tab} tab — no bars, nothing clipped`, mt.bars === 0 && !mt.clipped.length, JSON.stringify({ b: mt.bars, c: mt.clipped }));
      await p.screenshot({ path: path.join(SHOTS, `quest_${name}_${tab}.png`) });
    }
    await p.evaluate(() => document.querySelector('#w-quest [data-qtab="story"]').click());

    // ---- กด "รับรางวัล" ค่าหัว ใกล้ Rolf → บอร์ดค่าหัวเปิดทันที → รับได้จริง ----
    const cl = await p.evaluate(async () => {
      const pl = G.player;
      if (G.map.id !== HOME_MAP) changeMap(HOME_MAP);
      const rolf = G.npcs.find(n => n.id === 'guide'); pl.x = rolf.x + 0.5; pl.y = rolf.y + 2.5; pl.path = [];
      const b = Bounty.state().list[0], z0 = pl.zeny;
      QuestUI.refresh();
      const btn = [...document.querySelectorAll('#w-quest .q-crow')].find(r => r.dataset.qkey.startsWith('b:')).querySelector('.q-claim-btn');
      btn.click();
      await new Promise(r => setTimeout(r, 600));
      const dlg = document.querySelector('#w-dialog'), dtxt = dlg ? dlg.textContent : '';
      const opt = [...document.querySelectorAll('#w-dialog .dlg-opt, #w-dialog button')].find(x => /รับรางวัล/.test(x.textContent));
      if (opt) opt.click();
      await new Promise(r => setTimeout(r, 600));
      const closed = !UI.isOpen('w-quest');
      for (let i = 0; i < 4 && UI.isOpen('w-dialog'); i++) { UI.dlgClose(); await new Promise(r => setTimeout(r, 200)); }
      await new Promise(r => setTimeout(r, 1200));
      const m = document.querySelector('#menubar button[data-win="w-quest"]');
      return { board: /งานล่าค่าหัววันนี้/.test(dtxt), opt: !!opt, claimed: b.claimed, paid: pl.zeny - z0 === b.zeny, closed, left: QuestUI.list().filter(x => x.kind === 'bounty').length, glow: [document.getElementById('quest-track'), document.getElementById('qt-btn')].some(x => x && x.classList.contains('qd-ready')) };
    });
    ok(`${name}: claim near Rolf opens the bounty board directly and pays out`, cl.board && cl.opt && cl.claimed && cl.paid && cl.closed && cl.left === 0, JSON.stringify(cl));
    ok(`${name}: Quest button still glows for the remaining side quest`, cl.glow);
    // ไกลจาก NPC → นำทางไปหา
    const far = await p.evaluate(() => { const r = QuestUI.list().find(x => x.kind === 'side'); const pl = G.player; pl.x = 5; pl.y = 5; QuestUI.claim(r); const t = Nav.target; Nav.cancel(true); return { kind: t && t.kind, npc: t && t.npcId, want: r.npc }; });
    ok(`${name}: claim far from the NPC navigates there`, far.kind === 'npc' && far.npc === far.want, JSON.stringify(far));

    // ---- เควสต์หลักสำเร็จ → ป้ายใหญ่ครั้งเดียว ----
    const st = await p.evaluate(async () => {
      const calls = []; const b0 = QuestUI.banner; QuestUI.banner = function (o) { calls.push(o.key); return b0.call(this, o); };
      const q = Quest.current(); G.player.baseLv = 20; recalc(); Quest.check(); Quest.check();
      for (let i = 0; i < 40 && !document.getElementById('qd-banner').classList.contains('show'); i++) await new Promise(r => setTimeout(r, 150));
      const el = document.getElementById('qd-banner');
      return { calls, shown: el.classList.contains('show'), txt: el.textContent, title: q.title, next: Quest.current() && Quest.current().id !== q.id };
    });
    ok(`${name}: story quest complete → big banner once`, st.shown && st.calls.length === 1 && st.txt.includes(st.title) && st.next, JSON.stringify(st));
    await p.screenshot({ path: path.join(SHOTS, `banner_story_${name}.png`) });
    // แตะป้าย → เปิดหน้าต่างเควสต์
    await p.evaluate(() => document.getElementById('qd-banner').click());
    await p.waitForTimeout(300);
    ok(`${name}: tapping the banner opens the quest window`, await p.evaluate(() => UI.isOpen('w-quest') && UI.questTab === 'story'));
    await ctx.close();
  }

  await browser.close(); srv.close();
  ok('no page errors', !errors.length, errors.slice(0, 5).join(' | '));
  let fail = 0;
  for (const [n, c, info] of checks) { if (!c) fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${!c && info ? `  — ${info}` : ''}`); }
  console.log(`\n${checks.length - fail}/${checks.length} passed • shots: ${SHOTS}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
