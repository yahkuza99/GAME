'use strict';
// ============================================================
//  ทดสอบคลังไอเทม (js/itemindex.js + css/itemindex.css) ด้วย Playwright
//  • ไอเทมทุกชิ้นใน ITEMS อยู่ในหมวดเดียวพอดี (นับทั้งจากข้อมูลและจากแถวที่วาดจริง) • ทุกหมวดเปิดได้ไม่มี error
//  • "Where to get": มอน + % + แผนที่ (ดรอปจริง/ชิป) • ร้าน • กาชา • เควสต์ • Hunt Rune • ปุ่ม "ไป" นำทางจริง
//  • ตัวกรอง "ใช้ได้กับ Class ฉัน" ซ่อนของที่ Class ใช้ไม่ได้ • ระดับ/เลเวล • ป้าย "มีแล้ว"
//  • เปิดจากเมนูคอม / แผ่นเมนูมือถือ (HUD C) / Shift+I (ไม่เปิดกระเป๋าซ้อน)
//  • กติกาหน้าตา: มุม ≤ 8px (ไม่มีแคปซูล) • ไม่ถ่างตัวอักษรไทย • มือถือ: ตัวหนังสือ ≥ 13px ปุ่ม ≥ 40px • ไม่ล้นจอ
//  รัน:  CHROME=<chrome> NODE_PATH=$(npm root -g) node tests/itemindex.js   • SHOTS=<โฟลเดอร์> = เก็บภาพ (ค่าเริ่มต้น tests/shots_itemindex)
// ============================================================
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS || path.join(require('os').tmpdir(), 'iv_itemindex_shots');
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

async function boot(browser, url, w, h, mobile, errors, tag) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(`${tag}: ${e.message}`));
  await p.goto(url, { timeout: 120000 });
  await p.waitForSelector('#auth', { state: 'visible', timeout: 60000 });
  await p.click('#au-offline'); await p.click('#btn-new');
  await p.fill('#cr-name', 'Indexer'); await p.click('#cr-start');
  await p.waitForFunction(() => G.started, null, { timeout: 30000 });
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 15000, polling: 250 }).catch(() => {});
  await p.waitForTimeout(800);
  await p.evaluate(() => { document.querySelectorAll('.win:not(.hidden)').forEach(x => UI.close(x.id)); changeJob('runecaster'); G.player.baseLv = 27; recalc(); });
  await p.waitForTimeout(3500); // ป้ายเปลี่ยน Class/ชื่อแผนที่หายก่อน
  return { ctx, p };
}
const isOpen = () => !document.getElementById('w-itemidx').classList.contains('hidden');
// กติกาหน้าตาในหน้าต่าง (ทุกชิ้นที่มองเห็น)
const STYLE = phone => {
  const w = document.getElementById('w-itemidx'), vis = e => e.getClientRects().length && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden';
  const small = [], round = [], spaced = [], tiny = [], out = [];
  for (const e of w.querySelectorAll('.win-body *')) {
    if (!vis(e)) continue;
    const cs = getComputedStyle(e), txt = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (phone && txt && parseFloat(cs.fontSize) < 13 && !e.closest('.rgem, .det-hero')) small.push(`${e.tagName}.${e.className}:${cs.fontSize}:${e.textContent.trim().slice(0, 16)}`);
    const rad = cs.borderTopLeftRadius;
    if (!e.closest('.det-hero') && (/%/.test(rad) ? parseFloat(rad) >= 50 && e.offsetWidth !== e.offsetHeight : parseFloat(rad) > 8)) round.push(`${e.tagName}.${e.className}:${rad}`);
    if (txt && /[฀-๿]/.test(e.textContent) && parseFloat(cs.letterSpacing) > 0) spaced.push(`${e.className}:${cs.letterSpacing}`);
    if (phone && (e.tagName === 'BUTTON' || e.tagName === 'SELECT' || e.getAttribute('role') === 'button') && e.closest('.book-page') && (e.offsetHeight < 40 || e.offsetWidth < 40)) tiny.push(`${e.tagName}.${e.className} ${e.offsetWidth}×${e.offsetHeight}`);
  }
  const r = w.getBoundingClientRect(); if (r.left < -0.5 || r.top < -0.5 || r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5) out.push(`${r.left},${r.top},${r.right},${r.bottom}`);
  const hs = document.documentElement.scrollWidth > innerWidth + 1;
  return { small: small.slice(0, 10), round: round.slice(0, 10), spaced: spaced.slice(0, 10), tiny: tiny.slice(0, 10), out, hs };
};

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const srv = await serve();
  const url = `http://localhost:${srv.address().port}/index.html`;
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  const browser = await chromium.launch(opts);
  const errors = [];

  // ================= คอม 1600×900 =================
  {
    const { ctx, p } = await boot(browser, url, 1600, 900, false, errors, 'pc');
    // เปิดจากเมนูคอม
    await p.evaluate(() => { const m = document.getElementById('menubar'); if (m.classList.contains('folded')) UI.setFold(m, false); });
    await p.waitForTimeout(200);
    await p.click('#menubar [data-win="w-itemidx"]', { timeout: 5000 }).catch(e => errors.push('pc menu click: ' + e.message.split('\n')[0]));
    await p.waitForTimeout(400);
    ok('pc: menu button opens the Item Index', await p.evaluate(isOpen));
    await p.evaluate(() => UI.close('w-itemidx'));
    // Shift+I เปิด/ปิด และไม่เปิดกระเป๋า
    await p.keyboard.press('Shift+I'); await p.waitForTimeout(300);
    const k1 = await p.evaluate(() => ({ open: !document.getElementById('w-itemidx').classList.contains('hidden'), inv: UI.isOpen('w-inv') }));
    await p.keyboard.press('Shift+I'); await p.waitForTimeout(300);
    const k2 = await p.evaluate(() => ({ open: !document.getElementById('w-itemidx').classList.contains('hidden'), inv: UI.isOpen('w-inv') }));
    ok('pc: Shift+I toggles the index (bag stays closed)', k1.open && !k1.inv && !k2.open && !k2.inv, { k1, k2 });
    await p.keyboard.press('i'); await p.waitForTimeout(250);
    ok('pc: plain I still opens the bag', await p.evaluate(() => UI.isOpen('w-inv')));
    await p.evaluate(() => { UI.close('w-inv'); UI.open('w-itemidx'); });
    await p.waitForTimeout(300);

    // ทุกไอเทมอยู่ในหมวดเดียวพอดี (ข้อมูล)
    const cnt = await p.evaluate(() => {
      const cats = ItemIndex.cats().filter(c => !c.ref).map(c => c.k), seen = {};
      for (const c of cats) for (const id of ItemIndex.ids(c)) seen[id] = (seen[id] || 0) + 1;
      const all = Object.keys(ITEMS), dup = all.filter(id => seen[id] > 1), miss = all.filter(id => !seen[id]);
      return { n: all.length, sum: Object.values(seen).reduce((a, b) => a + b, 0), dup, miss, per: Object.fromEntries(cats.map(c => [c, ItemIndex.ids(c).length])) };
    });
    ok(`data: every ITEMS entry is in exactly one category (${cnt.n} items: ${JSON.stringify(cnt.per)})`, cnt.sum === cnt.n && !cnt.dup.length && !cnt.miss.length, cnt);
    // ทุกหมวดวาดได้ + นับแถวที่วาดจริง
    const tabs = await p.evaluate(async () => {
      const out = {}, drawn = {};
      for (const c of ItemIndex.cats()) {
        document.querySelector(`#w-itemidx .ix-cat[data-cat="${c.k}"]`).click();
        await new Promise(r => setTimeout(r, 60));
        // หมวดที่เกิน 1 หน้า (ItemIndex.PAGE = 120 — อาวุธ/เกราะหลังภาค 2): กด "แสดงเพิ่ม" จนครบ
        for (let g = 0; g < 10 && document.querySelector('#w-itemidx .ix-showmore'); g++) { document.querySelector('#w-itemidx .ix-showmore').click(); await new Promise(r => setTimeout(r, 60)); }
        const rows = [...document.querySelectorAll('#w-itemidx .ix-rows > .irow')];
        out[c.k] = { rows: rows.length, on: document.querySelector('#w-itemidx .ix-cat.on').dataset.cat, right: !!document.querySelector('#w-itemidx .book-r .det-top, #w-itemidx .book-r .ix-sethead') };
        if (!c.ref) for (const r of rows) drawn[r.dataset.id] = (drawn[r.dataset.id] || 0) + 1;
      }
      const all = Object.keys(ITEMS);
      return { out, drawnN: Object.keys(drawn).length, dup: Object.keys(drawn).filter(k => drawn[k] > 1), miss: all.filter(id => !drawn[id]).slice(0, 10), n: all.length,
        gacha: Gacha.rows.length, sets: Object.keys(LOOT.SETS).length };
    });
    const tabBad = Object.entries(tabs.out).filter(([k, v]) => v.on !== k || !v.rows || !v.right).map(([k]) => k);
    ok('ui: all 9 tabs render rows + a detail page', Object.keys(tabs.out).length === 9 && !tabBad.length, tabs.out);
    ok(`ui: rendered rows cover every item exactly once (${tabs.drawnN}/${tabs.n})`, tabs.drawnN === tabs.n && !tabs.dup.length, tabs);
    ok('ui: Gacha tab lists every wheel prize, Sets tab every set', tabs.out.gacha.rows === tabs.gacha && tabs.out.sets.rows === tabs.sets && tabs.sets >= 6, tabs);
    await p.evaluate(() => ItemIndex.go('weapon')); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(SHOTS, 'itemindex_weapon_1600.png') });

    // แหล่งที่มา: ดรอปจากมอนที่รู้จัก
    const src = await p.evaluate(() => {
      const mid = 'pudding', id = MOBS[mid].drops[0][0], c = MOBS[mid].drops[0][1];
      ItemIndex.jump(id);
      const row = document.querySelector(`#w-itemidx .ix-where .ix-src[data-mob="${mid}"]`);
      const want = c >= 0.1 ? `${Math.round(c * 100)}%` : `${+(c * 100).toFixed(2)}%`;
      const r = { id, cat: ItemIndex.cat, sel: ItemIndex.sel, txt: row && row.textContent, want, map: row && /Emerald Meadow|Meadow/.test(row.textContent), go: !!(row && row.querySelector('.ix-go')) };
      const chip = MOB_CHIP[mid]; ItemIndex.jump(chip);
      r.chip = !!document.querySelector(`#w-itemidx .ix-where .ix-src[data-mob="${mid}"]`) && /Fits/.test(document.querySelector('#w-itemidx .book-r').textContent);
      ItemIndex.jump('red_potion'); r.shop = [...document.querySelectorAll('#w-itemidx .ix-src[data-src="shop"]')].map(e => e.textContent);
      const gid = Gacha.rows.find(x => x.id && !MOBS[mid].drops.some(d => d[0] === x.id)).id; ItemIndex.jump(gid);
      r.gacha = !!document.querySelector('#w-itemidx .ix-src[data-src="gacha"]');
      const qid = QUESTS.find(q => q.reward && q.reward.items && q.reward.items.length).reward.items[0][0]; ItemIndex.jump(qid);
      r.quest = !!document.querySelector('#w-itemidx .ix-src[data-src="quest"]');
      ItemIndex.jump(HuntRunes.LIST[0].id); r.hrune = { cat: ItemIndex.cat, src: !!document.querySelector('#w-itemidx .ix-src[data-src="rune"]') };
      return r;
    });
    ok(`source: ${src.id} lists Gel Unit (pudding) with ${src.want}, its map and a Go button`, src.cat !== 'gacha' && src.txt && src.txt.includes(src.want) && src.map && src.go, src);
    ok('source: monster chip lists its monster; chip shows the slot it fits', src.chip, src);
    ok('source: shop / gacha / quest / Hunt Rune sources shown', src.shop.some(t => /Tool Dealer/.test(t)) && src.gacha && src.quest && src.hrune.cat === 'hrune' && src.hrune.src, src);
    // แตะชื่อมอน = สมุดมอน
    await p.evaluate(() => ItemIndex.jump(MOBS.pudding.drops[0][0])); await p.waitForTimeout(150);
    await p.click('#w-itemidx .ix-src[data-mob="pudding"] .ix-mob');
    await p.waitForTimeout(250);
    ok('source: tapping the monster opens its monster info', await p.evaluate(() => UI.isOpen('w-mob') && UI.mobInfo === 'pudding'));
    await p.evaluate(() => UI.close('w-mob'));
    await p.screenshot({ path: path.join(SHOTS, 'itemindex_detail_1600.png') });
    // ปุ่ม "ไป" = นำทางจริง (ปิดหน้าต่าง)
    await p.click('#w-itemidx .ix-src[data-mob="pudding"] .ix-go');
    await p.waitForTimeout(300);
    const nav = await p.evaluate(() => ({ t: Nav.target && { kind: Nav.target.kind, mob: Nav.target.mobId, map: Nav.target.map }, open: !document.getElementById('w-itemidx').classList.contains('hidden') }));
    ok('source: Go button navigates to the monster and closes the index', nav.t && nav.t.kind === 'mob' && nav.t.mob === 'pudding' && !nav.open, nav);
    await p.evaluate(() => Nav.cancel(true));

    // ตัวกรอง Class
    const cls = await p.evaluate(async () => {
      UI.open('w-itemidx'); ItemIndex.classOnly = false; ItemIndex.go('weapon');
      const all = [...document.querySelectorAll('#w-itemidx .ix-rows > .irow')].map(r => r.dataset.id);
      document.querySelector('#w-itemidx .ix-tog[data-f="classOnly"]').click();
      await new Promise(r => setTimeout(r, 50));
      const mine = [...document.querySelectorAll('#w-itemidx .ix-rows > .irow')].map(r => r.dataset.id);
      const bad = mine.filter(id => !canJobUse(ITEMS[id].jobs, G.player.job));
      const hiddenOk = all.filter(id => !mine.includes(id)).every(id => !canJobUse(ITEMS[id].jobs, G.player.job));
      const sword = mine.some(id => ITEMS[id].wtype === 'sword'), rod = mine.some(id => ITEMS[id].wtype === 'rod');
      const pressed = document.querySelector('#w-itemidx .ix-tog[data-f="classOnly"]').getAttribute('aria-pressed');
      // ชิป/ของใช้ไม่ถูกซ่อน
      ItemIndex.go('card'); const chips = document.querySelectorAll('#w-itemidx .ix-rows > .irow').length;
      ItemIndex.classOnly = false; ItemIndex.go('weapon');
      return { all: all.length, mine: mine.length, bad, hiddenOk, sword, rod, pressed, chips, chipN: ItemIndex.ids('card').length, job: G.player.job };
    });
    ok(`filter: "My Class only" (${cls.job}) hides unusable weapons (${cls.all} → ${cls.mine}), keeps rods, hides swords`, cls.mine > 0 && cls.mine < cls.all && !cls.bad.length && cls.hiddenOk && cls.rod && !cls.sword && cls.pressed === 'true', cls);
    ok('filter: Class filter does not hide chips', cls.chips === cls.chipN, cls);
    const rf = await p.evaluate(async () => {
      ItemIndex.go('armor');
      const set = async (k, v) => { const s = document.querySelector(`#w-itemidx select[data-f="${k}"]`); s.value = v; s.dispatchEvent(new Event('change')); await new Promise(r => setTimeout(r, 40)); };
      await set('rar', 'rare');
      const rare = [...document.querySelectorAll('#w-itemidx .ix-rows > .irow')].map(r => r.dataset.id);
      await set('rar', 'all'); await set('lv', '21');
      const lv = [...document.querySelectorAll('#w-itemidx .ix-rows > .irow')].map(r => ITEMS[r.dataset.id].lv || 1);
      await set('lv', 'all'); await set('sort', 'lvd');
      const sorted = [...document.querySelectorAll('#w-itemidx .ix-rows > .irow')].map(r => ITEMS[r.dataset.id].lv || 0);
      await set('sort', 'lv');
      return { rare: rare.length, rareOk: rare.every(id => LOOT.rarityOf(id) === 'rare'), lv: lv.length, lvOk: lv.every(v => v >= 21 && v <= 30), desc: sorted.every((v, i) => !i || sorted[i - 1] >= v) };
    });
    ok('filter: rarity, level range and sort work', rf.rare > 0 && rf.rareOk && rf.lv > 0 && rf.lvOk && rf.desc, rf);
    // มีแล้ว
    const own = await p.evaluate(() => {
      const id = ItemIndex.ids('armor').find(i => !ItemIndex.owned().has(i)); addItem(id, 1, true); ItemIndex.go('armor');
      const row = document.querySelector(`#w-itemidx .ix-rows > .irow[data-id="${id}"]`);
      return { id, mark: !!(row && row.querySelector('.ix-own')) };
    });
    ok('owned: an item in the bag shows the "Owned" marker', own.mark, own);
    // เซ็ต: ชิ้นส่วนกดแล้วไปที่ไอเทม
    const st = await p.evaluate(() => {
      ItemIndex.go('sets'); const s = Object.values(LOOT.SETS)[0];
      const bonus = document.querySelector('#w-itemidx .book-r').textContent;
      document.querySelector(`#w-itemidx .ix-pieces .irow[data-id="${s.items[1]}"]`).click();
      return { cat: ItemIndex.cat, sel: ItemIndex.sel, want: s.items[1], bonus: /2 pcs/.test(bonus) && /3 pcs/.test(bonus), setTip: !!document.querySelector('#w-itemidx .book-r .tip-set') };
    });
    ok('sets: set page shows tier bonuses; tapping a piece opens that item (with its set box)', st.bonus && st.sel === st.want && st.cat !== 'sets' && st.setTip, st);
    await p.evaluate(() => ItemIndex.go('sets')); await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(SHOTS, 'itemindex_sets_1600.png') });
    const sp = await p.evaluate(STYLE, false);
    ok('pc: no capsules (radius ≤ 8px), no Thai letter-spacing, window inside the screen', !sp.round.length && !sp.spaced.length && !sp.out.length && !sp.hs, sp);
    await ctx.close();
  }

  // ================= มือถือแนวตั้ง 390×844 (HUD C) =================
  {
    const { ctx, p } = await boot(browser, url, 390, 844, true, errors, 'phone');
    ok('phone: HUD C active', await p.evaluate(() => document.body.classList.contains('hudc')));
    await p.click('#menubar .menu-fold'); await p.waitForTimeout(300);
    const btn = await p.evaluate(() => { const b = document.querySelector('#menu-panel [data-win="w-itemidx"]'); if (!b) return null; const r = b.getBoundingClientRect(); return { w: r.width, h: r.height, vis: !!b.getClientRects().length, t: b.textContent.trim() }; });
    ok('phone: menu sheet has the Item Index button (≥ 44px)', btn && btn.vis && btn.w >= 44 && btn.h >= 44, btn);
    await p.screenshot({ path: path.join(SHOTS, 'itemindex_sheet_390.png') });
    await p.click('#menu-panel [data-win="w-itemidx"]'); await p.waitForTimeout(400);
    const o = await p.evaluate(() => ({ open: !document.getElementById('w-itemidx').classList.contains('hidden'), folded: document.getElementById('menubar').classList.contains('folded') }));
    ok('phone: tapping it opens the index and closes the sheet', o.open && o.folded, o);
    await p.screenshot({ path: path.join(SHOTS, 'itemindex_weapon_390.png') });
    const s1 = await p.evaluate(STYLE, true);
    ok('phone list: text ≥ 13px, buttons ≥ 40px, no capsules, no Thai letter-spacing, fits the screen', !s1.small.length && !s1.tiny.length && !s1.round.length && !s1.spaced.length && !s1.out.length && !s1.hs, s1);
    // แตะแถว = หน้ารายละเอียด (หน้าเดียว) → กลับ
    const first = await p.evaluate(() => document.querySelector('#w-itemidx .ix-rows > .irow').dataset.id);
    await p.click('#w-itemidx .ix-rows > .irow'); await p.waitForTimeout(300);
    const d = await p.evaluate(() => { const l = document.querySelector('#w-itemidx .book-l'), r = document.querySelector('#w-itemidx .book-r'); return { l: getComputedStyle(l).display, r: getComputedStyle(r).display, back: !!document.querySelector('#w-itemidx .book-back'), sel: ItemIndex.sel, where: !!document.querySelector('#w-itemidx .ix-where') }; });
    ok('phone: tapping a row shows only the detail page (Back + Where to get)', d.l === 'none' && d.r !== 'none' && d.back && d.sel === first && d.where, d);
    const s2 = await p.evaluate(STYLE, true);
    ok('phone detail: text ≥ 13px, buttons ≥ 40px, no capsules', !s2.small.length && !s2.tiny.length && !s2.round.length && !s2.spaced.length && !s2.hs, s2);
    await p.evaluate(() => ItemIndex.jump(MOBS.pudding.drops[0][0])); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(SHOTS, 'itemindex_detail_390.png') });
    await p.click('#w-itemidx .book-back'); await p.waitForTimeout(250);
    ok('phone: Back returns to the list', await p.evaluate(() => getComputedStyle(document.querySelector('#w-itemidx .book-l')).display !== 'none' && !ItemIndex.det));
    await p.evaluate(() => ItemIndex.go('card')); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(SHOTS, 'itemindex_chips_390.png') });
    const s3 = await p.evaluate(STYLE, true);
    ok('phone chips tab: UI rules hold', !s3.small.length && !s3.tiny.length && !s3.round.length && !s3.spaced.length, s3);
    await p.evaluate(() => ItemIndex.go('sets')); await p.waitForTimeout(250);
    const s4 = await p.evaluate(STYLE, true);
    ok('phone sets tab: UI rules hold', !s4.small.length && !s4.tiny.length && !s4.round.length && !s4.spaced.length, s4);
    await p.screenshot({ path: path.join(SHOTS, 'itemindex_sets_390.png') });
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
