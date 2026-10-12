'use strict';
// ============================================================
//  HUD แบบ C "จอโล่ง" (js/hud-c.js + css/hud-c.css) — มือถือแนวตั้ง 390×844
//  ตรวจ: ปุ่มบนจอไม่ทับกัน (กรอบสี่เหลี่ยม) • ทุกปุ่ม ≥ 44px • อยู่ในจอทั้งหมด • ทุกปุ่มในแผ่นเมนูเปิดหน้าต่าง/สลับของมันได้
//        ชื่อแผนที่ไม่ถูกตัด • สกิลครบ 8 ช่องด้วยปุ่มสลับหน้า • ไม่ได้สู้ 5 วิ = สกิลจาง • ข้อความระบบหายเองใน ~3 วิ
//        ตัวหนังสือ ≥ 14px / มุม ≤ 8px / ไม่ถ่างตัวอักษรไทย • คอม 1600×900 และมือถือแนวนอน: ตำแหน่งเดิมทุกชิ้น (เทียบค่าก่อนแก้ 6acf378) • ไม่มี error
//  รัน:  NODE_PATH=$(npm root -g) node tests/hudc.js   (CHROME=/path/to/chrome ได้ • SHOTS=โฟลเดอร์ภาพหน้าจอ)
// ============================================================
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SHOTS = process.env.SHOTS || path.join(os.tmpdir(), 'iv_hudc');
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
const ok = (name, cond, info = '') => checks.push([name, !!cond, typeof info === 'string' ? info : JSON.stringify(info)]);

// ตำแหน่งชิ้น HUD ก่อนแก้ (commit 6acf378) — คอมและมือถือแนวนอนต้องเหมือนเดิมทุกพิกเซล
const BASE = {
  pc: { 'basic-info': [12, 12, 260, 136], minimap: [1416, 12, 172, 236], menubar: [1402, 176, 30, 30], chat: [0, 728, 340, 172], 'chat-btn': [0, 0, 0, 0], dock: [784, 818, 808, 74], hotbar: [918, 831, 442, 50], potbar: [1368, 833, 210, 46], 'auto-btn': [798, 830, 52, 52], 'ult-btn': [858, 830, 52, 52], 'quest-track': [12, 156, 260, 101], 'qt-btn': [0, 0, 0, 0], 'hud-toggle': [280, 12, 26, 26], 'fly-btn': [792, 786, 64, 26], 'pad-atk': [0, 0, 0, 0], 'joy-zone': [0, 0, 0, 0], 'combat-toggle': [0, 0, 0, 0], 'map-open': [1404, 142, 30, 30] },
  land: { 'basic-info': [8, 8, 208, 118], minimap: [736, 8, 100, 137], menubar: [664, 8, 44, 44], chat: [0, 354, 360, 36], 'chat-btn': [326, 302, 44, 44], potbar: [124, 298, 194, 44], 'auto-btn': [706, 330, 44, 44], 'ult-btn': [656, 330, 44, 44], 'quest-track': [8, 134, 208, 56], 'qt-btn': [0, 0, 0, 0], 'hud-toggle': [222, 8, 26, 26], 'fly-btn': [696, 298, 64, 26], 'pad-atk': [764, 310, 64, 64], 'joy-zone': [0, 240, 118, 150], 'combat-toggle': [0, 0, 0, 0], 'map-open': [726, 72, 26, 26] },
};

async function boot(browser, url, w, h, mobile, errors, tag) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(`${tag}: ${e.message}`));
  await p.goto(url, { timeout: 120000 });
  await p.waitForSelector('#auth', { state: 'visible', timeout: 60000 });
  await p.click('#au-offline'); await p.click('#btn-new');
  await p.fill('#cr-name', 'HudC'); await p.click('#cr-start');
  await p.waitForFunction(() => G.started, null, { timeout: 30000 });
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 15000, polling: 250 }).catch(() => {});
  await p.waitForTimeout(800);
  await p.evaluate(() => { document.querySelectorAll('.win:not(.hidden)').forEach(x => UI.close(x.id)); changeJob('wildhunter'); G.player.baseLv = 27; G.player.statPoints = 16; recalc(); changeMap('meadow', 28.5, 28.5); });
  await p.waitForTimeout(5500); // ป้ายชื่อแผนที่/ประกาศเปลี่ยน Class หายก่อน
  return { ctx, p };
}

// ปุ่มบนจอที่ต้องไม่ทับกัน / ≥ 44px / อยู่ในจอ
const CONTROLS = () => {
  const vis = e => e && !e.hidden && e.getClientRects().length && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden' && +getComputedStyle(e).opacity > 0;
  const sel = ['#basic-info', '#hc-qline', '#party-hud .ph-row', '#qt-btn', '#hc-map', '#menubar .menu-fold', '#hc-mvp', '#hc-wb', '#raid-bar', '#nav-pill', '#skill-aim',
    '#potbar .hb', '#chat-btn', '#joy-zone', '#pad-atk', '#hotbar .hb', '#hc-page', '#auto-btn', '#ult-btn'];
  const out = [];
  for (const s of sel) for (const e of document.querySelectorAll(s)) if (vis(e)) { const b = e.getBoundingClientRect(); out.push({ n: s + (e.dataset.i ? '#' + e.dataset.i : '') + (e.dataset.id ? ':' + e.dataset.id : ''), x: b.x, y: b.y, w: b.width, h: b.height }); }
  // ปุ่มย่อยในกล่อง (ต้อง ≥ 44px ด้วย)
  const subs = [];
  for (const s of ['#raid-bar .rb-fold', '#raid-bar .rb-call', '#nav-cancel', '#sa-x']) for (const e of document.querySelectorAll(s)) if (vis(e)) { const b = e.getBoundingClientRect(); subs.push({ n: s, w: b.width, h: b.height }); }
  return { out, subs, W: innerWidth, H: innerHeight };
};
function layoutChecks(name, L) {
  const ov = [];
  for (let i = 0; i < L.out.length; i++) for (let j = i + 1; j < L.out.length; j++) {
    const a = L.out[i], b = L.out[j];
    if (a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5) ov.push(`${a.n} × ${b.n}`);
  }
  ok(`${name}: no two HUD controls overlap (${L.out.length} controls)`, !ov.length, ov.join(' | '));
  // รอบ 30b เจ้าของ "อ้วนไป": ปุ่มบนจอ ≥ 40px · ปุ่มย่อยในแถบ (พับ/รวมพล/✕) ≥ 30px
  const small = L.out.filter(c => !/joy-zone|raid-bar|nav-pill|skill-aim|hc-mvp|hc-wb|hc-qline|ph-row/.test(c.n) && (c.w < 40 || c.h < 40)).concat(L.subs.filter(c => c.w < 30 || c.h < 30));
  ok(`${name}: every control ≥ 40px (sub-buttons ≥ 30px)`, !small.length, small.map(c => `${c.n} ${Math.round(c.w)}×${Math.round(c.h)}`).join(' | '));
  const out = L.out.filter(c => c.x < -0.5 || c.y < -0.5 || c.x + c.w > L.W + 0.5 || c.y + c.h > L.H + 0.5);
  ok(`${name}: nothing outside the viewport`, !out.length, out.map(c => `${c.n} ${Math.round(c.x)},${Math.round(c.y)} ${Math.round(c.w)}×${Math.round(c.h)}`).join(' | '));
}
// ตัวหนังสือ ≥ 14px • มุม ≤ 8px • ไม่ถ่างตัวอักษรไทย (ในชิ้นของ HUD C)
const STYLE = () => {
  const roots = ['#basic-info', '#hc-qline', '#party-hud', '#qt-btn', '#hc-map', '#menubar', '#hc-mvp', '#hc-wb', '#raid-bar', '#nav-pill', '#skill-aim', '#hc-tag', '#hc-page', '#auto-btn', '#ult-btn', '#chat-log'];
  const vis = e => e.getClientRects().length && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden';
  const small = [], round = [], spaced = [];
  for (const r of roots) for (const e of [document.querySelector(r), ...document.querySelectorAll(r + ' *')]) {
    if (!e || !vis(e)) continue;
    const cs = getComputedStyle(e), txt = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (txt && parseFloat(cs.fontSize) < 13 && !e.closest('#bi-lvbadge')) small.push(`${r} ${e.tagName}.${e.className}:${cs.fontSize}`);
    const rad = cs.borderTopLeftRadius; if (!e.closest('#joy-zone') && !e.classList.contains('hc-net') && (/%/.test(rad) ? parseFloat(rad) >= 50 : parseFloat(rad) > 8)) round.push(`${r} ${e.tagName}.${e.className}:${rad}`);
    if (txt && /[฀-๿]/.test(e.textContent) && parseFloat(cs.letterSpacing) > 0) spaced.push(`${r} ${e.className}`);
  }
  return { small: small.slice(0, 12), round: round.slice(0, 12), spaced: spaced.slice(0, 12) };
};

// จำลองฉากสู้: MVP + แถบรุมบอส + ปาร์ตี้ 2 คน + เล็งสกิล
const COMBAT = async () => {
    const pl = G.player; changeMap('mistlake', 30.5, 30.5);
    await new Promise(r => setTimeout(r, 5200));
    const ids = JOBS[pl.job].skills.filter(id => SKILLS[id] && SKILLS[id].type === 'active');
    ids.forEach((id, i) => { pl.skills[id] = 1; if (i < 7) pl.hotbar[i + 1] = { t: 'skill', id }; });
    Raid.on = () => true; Raid.helpers = () => 3; if (!Online.mapChannel) Online.mapChannel = { send: () => Promise.resolve() }; // แถบรุมบอสต้องออนไลน์ — จำลองเฉพาะหน้าตา
    const m = spawnMob(G.map.def.mvp, { x: pl.x + 3, y: pl.y - 1 }); m.isMvp = true; pl.target = m;
    Party.party = { id: 'pt', name: 'Team', since: 1, members: new Map([
      ['a1', { id: 'a1', name: 'Mira', job: 'volva', lv: 28, hp: 88, maxHp: 100, sp: 50, maxSp: 50, map: G.map.id, x: pl.x - 2, y: pl.y + 1, dead: 0, since: 2, seen: performance.now() + 1e9 }],
      ['a2', { id: 'a2', name: 'Odd', job: 'berserker', lv: 27, hp: 34, maxHp: 100, sp: 50, maxSp: 50, map: G.map.id, x: pl.x - 3, y: pl.y + 2, dead: 0, since: 3, seen: performance.now() + 1e9 }]]) };
    Party.refresh(); Raid.bar(true);
    G.pendingSkill = ids.find(id => SKILLS[id].target === 'enemy') || ids[0];
    UI.dirty();
  };

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const srv = await serve();
  const url = `http://localhost:${srv.address().port}/index.html`;
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  const browser = await chromium.launch(opts);
  const errors = [];

  // ================= มือถือแนวตั้ง 390×844 =================
  {
    const { ctx, p } = await boot(browser, url, 390, 844, true, errors, 'phone');
    ok('phone: HUD C on (body.hudc)', await p.evaluate(() => document.body.classList.contains('hudc') && document.body.classList.contains('pad-mode')));
    const gone = await p.evaluate(() => ['minimap', 'target', 'combat-toggle', 'exp-line', 'fly-btn'].filter(id => { const e = document.getElementById(id); return e && e.getClientRects().length && getComputedStyle(e).display !== 'none'; }));
    ok('phone: always-on minimap, #target card, combat-toggle, EXP strip, floating fly button removed', !gone.length, gone.join(','));
    // ---- สำรวจ ----
    layoutChecks('phone explore', await p.evaluate(CONTROLS));
    const st = await p.evaluate(STYLE);
    ok('phone explore: text ≥ 13px (Lv badge excepted), radius ≤ 8px, no Thai letter-spacing', !st.small.length && !st.round.length && !st.spaced.length, st);
    const chip = await p.evaluate(() => { const b = document.getElementById('basic-info'), r = b.getBoundingClientRect(); return { hp: document.getElementById('bi-hp-t').textContent, fs: parseFloat(getComputedStyle(document.getElementById('bi-hp-t')).fontSize), lv: document.getElementById('bi-lvbadge').textContent, pts: (document.querySelector('#basic-info .hc-pts') || {}).textContent, x: r.x, y: r.y }; });
    ok('phone: character chip top-left shows HP numbers ≥ 13px, Lv badge, unspent points', chip.x <= 12 && chip.y <= 12 && /\d+ \/ \d+/.test(chip.hp) && chip.fs >= 13 && chip.lv === '27' && /^\+\d+$/.test(chip.pts || ''), chip);
    await p.click('#basic-info');
    ok('phone: tap chip → Status', await p.evaluate(() => UI.isOpen('w-status')));
    await p.evaluate(() => UI.close('w-status'));
    const top3 = await p.evaluate(() => ['qt-btn', 'hc-map', 'menubar'].map(id => { const r = document.getElementById(id).getBoundingClientRect(); return [Math.round(r.right), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; }));
    ok('phone: Quest / แผนที่ / เมนู = three 42px buttons top-right', top3.every(r => r[2] === 42 && r[3] === 42 && r[1] <= 12) && top3[2][0] >= 330 && top3[0][0] < top3[1][0] && top3[1][0] < top3[2][0], top3);
    await p.click('#qt-btn'); await p.waitForTimeout(300);
    ok('phone: Quest button → quest book', await p.evaluate(() => UI.isOpen('w-quest') || UI.isOpen('w-dialog')));
    await p.evaluate(() => { UI.close('w-quest'); UI.close('w-dialog'); });
    await p.click('#hc-map'); await p.waitForTimeout(400);
    const mp = await p.evaluate(() => { const n = document.querySelector('#w-map .hc-mapname'); return { open: UI.isOpen('w-map'), txt: n && n.textContent, cut: n ? n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1 : true, fs: n && parseFloat(getComputedStyle(n).fontSize), name: G.map.def.name, world: !!document.querySelector('#w-map [data-open="w-world"]'), zin: !!document.querySelector('#w-map [data-hc="zin"]') }; });
    ok('phone: แผนที่ → big map with map name (not clipped, ≥ 14px), World Map + zoom buttons', mp.open && mp.txt && mp.txt.includes(mp.name) && !mp.cut && mp.fs >= 14 && mp.world && mp.zin, mp);
    const z = await p.evaluate(() => { const z0 = R.zoom; document.querySelector('#w-map [data-hc="zin"]').click(); const z1 = R.zoom; document.querySelector('#w-map [data-hc="zout"]').click(); return { z0, z1, z2: R.zoom }; });
    ok('phone: map zoom +/− change the camera zoom', z.z1 > z.z0 && z.z2 < z.z1, z);
    await p.screenshot({ path: path.join(SHOTS, 'hudc_map_390.png') });
    await p.evaluate(() => UI.close('w-map'));
    // quest line
    const ql = await p.evaluate(() => { const e = document.getElementById('hc-qline'); return { shown: !e.hidden && e.getClientRects().length > 0, txt: e.textContent }; });
    ok('phone: quest line under the chip', ql.shown && /เควสต์/.test(ql.txt), ql);
    const qg = await p.evaluate(() => { let n = 0; const g0 = Quest.go; Quest.go = function () { n++; }; document.getElementById('hc-qline').click(); Quest.go = g0; return n; });
    ok('phone: tap quest line → Quest.go (navigate/hunt)', qg === 1);
    // สลับหน้าสกิล: 8 ช่องครบ
    const pg = await p.evaluate(async () => {
      const vis = () => [...document.querySelectorAll('#hotbar .hb')].filter(e => e.getClientRects().length && getComputedStyle(e).display !== 'none').map(e => +e.dataset.i);
      HudC.setPage(0); const a = vis(); document.getElementById('hc-page').click(); const b = vis(); const t = document.getElementById('hc-page').textContent; HudC.setPage(0);
      return { a, b, t };
    });
    ok('phone: page switch reaches all 8 skill slots (1–4 ↔ 5–8)', pg.a.join() === '0,1,2,3' && pg.b.join() === '4,5,6,7' && pg.t === '2/2', pg);
    // สงบ 5 วิ = สกิลจาง (ยังกดได้)
    const calm = await p.evaluate(async () => { const pl = G.player; pl.target = null; pl.skillTarget = null; G.pendingSkill = null; HudC.calmAt = 0; HudC.tick(); await new Promise(r => setTimeout(r, 700));
      const o = +getComputedStyle(document.querySelector('#hotbar .hb')).opacity, pe = getComputedStyle(document.querySelector('#hotbar .hb')).pointerEvents;
      const m = G.mobs.find(x => !x.dead && !x.def.dummy); pl.target = m; HudC.tick(); await new Promise(r => setTimeout(r, 700));
      const o2 = +getComputedStyle(document.querySelector('#hotbar .hb')).opacity; pl.target = null; return { o, pe, o2 }; });
    ok('phone: out of combat → skills fade to ~40% (still tappable), in combat → full', calm.o <= 0.45 && calm.pe !== 'none' && calm.o2 >= 0.95, calm);
    // ข้อความระบบหายเอง
    const fade = await p.evaluate(async () => { UI.msg('ทดสอบข้อความระบบ', 'sys'); const l = document.querySelector('#chat-log').lastElementChild; await new Promise(r => setTimeout(r, 300)); const a = +getComputedStyle(l).opacity; await new Promise(r => setTimeout(r, 3600)); return { a, b: +getComputedStyle(l).opacity }; });
    ok('phone: system log line shows, then auto-hides after ~3 s', fade.a > 0.9 && fade.b < 0.05, fade);
    // กดค้าง AUTO = แมลงวัน / ตั้งค่าบอท
    const alt = await p.evaluate(async () => { UI.autoAlt(); await new Promise(r => setTimeout(r, 300)); const opts = [...document.querySelectorAll('#w-dialog .dlg-opt')].map(b => b.textContent); const f0 = FlyPilot.on; document.querySelectorAll('#w-dialog .dlg-opt')[0].click(); await new Promise(r => setTimeout(r, 300)); const f1 = FlyPilot.on; FlyPilot.toggle(false); return { opts, f0, f1, dlg: UI.isOpen('w-dialog') }; });
    ok('phone: long-press AUTO → choose Fly mode / Bot settings (Fly toggles)', alt.opts.length === 3 && /แมลงวัน/.test(alt.opts[0]) && /บอท/.test(alt.opts[1]) && !alt.f0 && alt.f1 && !alt.dlg, alt);
    await p.evaluate(() => UI.dlgClose());
    await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(SHOTS, 'hudc_explore_390.png') });

    // ---- แผ่นเมนู: ทุกปุ่มทำงาน ----
    await p.click('#menubar .menu-fold'); await p.waitForTimeout(300);
    const sheet = await p.evaluate(() => { const pn = document.getElementById('menu-panel'), r = pn.getBoundingClientRect(), g = pn.querySelector('.menu-grid');
      const btns = [...pn.querySelectorAll('.menu-grid > button, .hc-sheet-row button')].filter(b => b.getClientRects().length && getComputedStyle(b).display !== 'none');
      return { x: r.x, b: Math.round(r.bottom), w: r.width, cols: getComputedStyle(g).gridTemplateColumns.split(' ').length, n: btns.length, labels: btns.map(b => b.textContent.trim()), small: btns.filter(b => b.offsetHeight < 44 || b.offsetWidth < 44).map(b => b.textContent), head: pn.querySelector('.hc-sheet-head').textContent }; });
    ok('phone: menu = bottom sheet, 4 columns, full width', sheet.x === 0 && sheet.b === 844 && sheet.w === 390 && sheet.cols === 4, sheet);
    ok('phone: sheet lists every function (20 + action row) with ≥ 44px buttons, header shows Lv/EXP/Job', sheet.n >= 23 && !sheet.small.length && /Lv 27/.test(sheet.head) && /EXP/.test(sheet.head), sheet);
    await p.screenshot({ path: path.join(SHOTS, 'hudc_menu_390.png') });
    const items = await p.evaluate(() => [...document.querySelectorAll('#menu-panel .menu-grid > button, #menu-panel .hc-sheet-row button')].filter(b => b.getClientRects().length && getComputedStyle(b).display !== 'none').map(b => ({ win: b.dataset.win || '', hc: b.dataset.hc || '', t: b.textContent.trim() })));
    const bad = [];
    for (const it of items) {
      await p.evaluate(() => { document.querySelectorAll('.win:not(.hidden)').forEach(x => UI.close(x.id)); const m = document.getElementById('menubar'); if (m.classList.contains('folded')) document.querySelector('#menubar .menu-fold').click(); });
      await p.waitForTimeout(120);
      const sel = it.win ? `#menu-panel [data-win="${it.win}"]` : `#menu-panel [data-hc="${it.hc}"]`;
      const before = await p.evaluate(() => ({ sit: G.player.sitting, hud: document.getElementById('hud').classList.contains('hud-min'), fly: FlyPilot.on, saver: !!G.player.options.saver }));
      await p.evaluate(() => { window.__fs = 0; document.documentElement.requestFullscreen = () => { window.__fs++; return Promise.resolve(); }; });
      await p.click(sel, { timeout: 3000 }).catch(e => bad.push(`${it.t}: click ${e.message.split('\n')[0]}`));
      await p.waitForTimeout(250);
      const r = await p.evaluate(({ it, before }) => {
        const open = id => { const w = document.getElementById(id); return !!w && !w.classList.contains('hidden'); };
        const folded = document.getElementById('menubar').classList.contains('folded');
        let okk;
        if (it.win) okk = open(it.win) || (it.win === 'w-trade' || it.win === 'w-market') && /ออนไลน์|online|เปิดร้าน|market|ตลาด|แลก/i.test(document.querySelector('#chat-log').textContent.slice(-300));
        else okk = { quests: open('w-quest'), mm: open('w-mm'), emote: open('w-emote'), fly: FlyPilot.on !== before.fly, saver: !!G.player.options.saver !== before.saver, hide: document.getElementById('hud').classList.contains('hud-min') !== before.hud,
          chat: document.getElementById('chat').classList.contains('typing'), sit: G.player.sitting !== before.sit, fs: window.__fs === 1 }[it.hc];
        return { okk, folded };
      }, { it, before });
      if (!r.okk || !r.folded) bad.push(`${it.t}(${it.win || it.hc}) ok=${r.okk} folded=${r.folded}`);
      await p.evaluate(({ hc }) => { if (hc === 'hide') UI.toggleHud(); if (hc === 'fly' && FlyPilot.on) FlyPilot.toggle(false); if (hc === 'saver') Battery.set(false); if (hc === 'sit') G.player.sitting = false; if (hc === 'chat') { document.getElementById('chat').classList.remove('typing'); document.getElementById('chat-input').blur(); } }, it);
    }
    ok(`phone: every menu-sheet button opens its window / toggles (${items.length})`, items.length >= 23 && !bad.length, bad.join(' | '));
    await p.evaluate(() => { document.querySelectorAll('.win:not(.hidden)').forEach(x => UI.close(x.id)); UI.dlgClose(); });
    // ซ่อน HUD → ปุ่ม "แสดงปุ่ม"
    const hm = await p.evaluate(async () => { UI.toggleHud(); await new Promise(r => setTimeout(r, 200)); const t = document.getElementById('hud-toggle'), r = t.getBoundingClientRect(), q = document.getElementById('qt-btn');
      const res = { shown: r.width >= 44 && r.height >= 44 && r.right > 300, qt: getComputedStyle(q).display }; t.click(); res.back = !document.getElementById('hud').classList.contains('hud-min'); return res; });
    ok('phone: hide HUD → "แสดงปุ่ม" top-right brings it back', hm.shown && hm.qt === 'none' && hm.back, hm);

    // ---- สู้: MVP + แถบรุมบอส + ปาร์ตี้ + เล็งสกิล ----
    await p.evaluate(COMBAT);
    await p.waitForTimeout(4200); // ฉากเปิดตัว MVP หายก่อน
    await p.evaluate(() => { G.pendingSkill = G.pendingSkill || JOBS[G.player.job].skills.find(id => SKILLS[id] && SKILLS[id].target === 'enemy'); HudC.tick(); });
    await p.waitForTimeout(400);
    const cb = await p.evaluate(() => { const g = id => { const e = document.getElementById(id); return !!e && !e.hidden && e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none'; };
      return { raid: g('raid-bar'), call: !!document.querySelector('#raid-bar .rb-call'), party: document.querySelectorAll('#party-hud .ph-row .hc-hp').length, pct: [...document.querySelectorAll('#party-hud .hc-hp')].map(e => e.textContent), aim: g('skill-aim'), tag: g('hc-tag'), tagT: document.getElementById('hc-tag').textContent, mvp: g('hc-mvp'), mvpT: document.getElementById('hc-mvp').textContent, target: g('target') }; });
    ok('phone combat: raid bar (rally in party), party rows with HP%, skill-aim banner, MVP chip hidden while raid bar shows (รอบ 30b)', cb.raid && cb.call && cb.party === 2 && cb.pct.join() === '88%,34%' && cb.aim && !cb.mvp, cb);
    ok('phone combat: target name/%/element as a tag under the monster (no #target card)', cb.tag && /%/.test(cb.tagT) && !cb.target, cb);
    layoutChecks('phone combat', await p.evaluate(CONTROLS));
    const st2 = await p.evaluate(STYLE);
    ok('phone combat: text/radius/letter-spacing rules', !st2.small.length && !st2.round.length && !st2.spaced.length, st2);
    await p.screenshot({ path: path.join(SHOTS, 'hudc_combat_390.png') });
    const nv = await p.evaluate(async () => { G.pendingSkill = null; G.player.target = null; await new Promise(r => setTimeout(r, 300));
      let call = null; const g0 = Nav.goTo; Nav.goTo = function (t) { call = t; return g0.apply(this, arguments); };
      document.getElementById('hc-mvp').click(); Nav.goTo = g0; Nav.cancel(true);
      Nav.goTo({ kind: 'map', map: HOME_MAP, name: MAP_DEFS[HOME_MAP].name }); await new Promise(r => setTimeout(r, 400)); HudC.tick();
      const pill = document.getElementById('nav-pill'), tx = document.getElementById('nav-text');
      return { t: call && call.kind, mob: !!call && call.mobId === G.map.def.mvp, pill: !pill.hidden, fs: parseFloat(getComputedStyle(tx).fontSize), cut: tx.scrollWidth > tx.clientWidth + 1 }; });
    ok('phone combat: tap MVP chip → navigate to the MVP • nav pill ≥ 14px, not clipped, with ✕', nv.t === 'mob' && nv.mob && nv.pill && nv.fs >= 14 && !nv.cut, nv);
    layoutChecks('phone nav', await p.evaluate(CONTROLS));
    await p.screenshot({ path: path.join(SHOTS, 'hudc_nav_390.png') });
    await p.click('#nav-cancel', { timeout: 5000 }).catch(e => ok('phone: nav ✕ clickable', false, e.message.split('\n')[0]));
    ok('phone: ✕ on nav pill cancels', await p.evaluate(() => !Nav.target));
    const loopErr = await p.evaluate(() => [...document.querySelectorAll('#chat-log .cl')].map(e => e.textContent).filter(t => /เกิดข้อผิดพลาด|error/i.test(t)));
    ok('phone: no errors caught by the game loop (chat log)', !loopErr.length, loopErr.join(' | '));
    await ctx.close();
  }

  // ================= มือถือเล็ก 360×740: ไม่ทับกันเหมือนกัน =================
  {
    const { ctx, p } = await boot(browser, url, 360, 740, true, errors, 'small');
    layoutChecks('small 360×740 explore', await p.evaluate(CONTROLS));
    await p.evaluate(COMBAT); await p.waitForTimeout(4200);
    await p.evaluate(() => { G.pendingSkill = G.pendingSkill || JOBS[G.player.job].skills.find(id => SKILLS[id] && SKILLS[id].target === 'enemy'); HudC.tick(); });
    await p.waitForTimeout(400);
    layoutChecks('small 360×740 combat', await p.evaluate(CONTROLS));
    await p.screenshot({ path: path.join(SHOTS, 'hudc_combat_360.png') });
    await ctx.close();
  }

  // ================= คอม 1600×900 / มือถือแนวนอน 844×390: ไม่เปลี่ยน =================
  for (const [w, h, mobile, key] of [[1600, 900, false, 'pc'], [844, 390, true, 'land']]) {
    const { ctx, p } = await boot(browser, url, w, h, mobile, errors, key);
    const r = await p.evaluate(ids => { const out = {}; for (const id of ids) { const e = document.getElementById(id); const b = e.getBoundingClientRect(); out[id] = [b.x, b.y, b.width, b.height].map(Math.round); } return { out, hudc: document.body.classList.contains('hudc'), extra: [...document.querySelectorAll('.hc-only, #hc-map, #hc-page, #hc-qline')].filter(e => e.getClientRects().length).length }; }, Object.keys(BASE[key]));
    const same = (id, x, y) => id === 'minimap' ? x.slice(0, 3).join() === y.slice(0, 3).join() : x.join() === y.join(); // ความสูงมินิแมพขึ้นกับป้าย Ancient (ตามรอบเวลา) — เทียบ x/y/กว้าง
    const diff = Object.keys(BASE[key]).filter(id => !same(id, r.out[id], BASE[key][id])).map(id => `${id} ${r.out[id]} (was ${BASE[key][id]})`);
    ok(`${key}: HUD C off, no new controls, layout identical to before`, !r.hudc && !r.extra && !diff.length, diff.join(' | ') || r);
    if (key === 'pc') await p.screenshot({ path: path.join(SHOTS, 'hudc_pc_1600.png') });
    await ctx.close();
  }

  await browser.close(); srv.close();
  for (const e of errors) ok('page error', false, e);
  let fail = 0;
  for (const [n, pass, info] of checks) { if (!pass) fail++; console.log(`${pass ? '✔' : '✘'} ${n}${!pass && info ? `  (${info})` : ''}`); }
  console.log(`shots: ${SHOTS}`);
  console.log(fail ? `\n${fail} FAILED` : `\nALL ${checks.length} PASSED`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
