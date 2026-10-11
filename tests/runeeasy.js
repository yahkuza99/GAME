'use strict';
// ============================================================
//  ทดสอบ "รูนง่ายขึ้น + ซื้อสะดวก" (รอบ 28 — เจ้าของ 2026-10-11 "Skill rune ทำให้ง่ายด้วย เพิ่มราคารูนอีก" / "เพิ่มความสะดวกในการซื้อ")
//  • หน้าต่าง Skills: รูน 2 แบบ = ปุ่มใหญ่ ผลภาษาไทย 1 บรรทัด ป้าย เลือก/ใช้อยู่ • ใช้/ถอดใน 1 แตะ • ล็อกบอก "อีก N Lv" • ระหว่างต่อสู้บอกอีกกี่วิ • "!" เมื่อปลดแล้วยังไม่เลือก
//  • คำไทยครบทุกรูน (เลขมาจาก r.short จริง) • Hunt Rune ราคา ×2 (HR_PRICE_MUL)
//  • ซื้อ Hunt Rune จากหน้าต่าง Runes ได้ทุกที่ (ไกล Brokk): ยืนยันก่อน หักเงินพอดี + "ซื้อแล้วใส่ช่องเลย" • เงินไม่พอบอกว่าขาดเท่าไร
//  • เซฟเก่า (p.runes / p.hrunes / p.hrunesOwn) โหลดได้เหมือนเดิม • กติกาหน้าตา: มุม ≤ 8px, ไม่ถ่างตัวอักษรไทย, มือถือตัว ≥ 14px ปุ่ม ≥ 44px, ไม่มีแถบสัดส่วน
//  รัน:  CHROME=<chrome-headless-shell> NODE_PATH=<โฟลเดอร์ที่มี playwright> node tests/runeeasy.js   (เปิดเซิร์ฟเวอร์เอง)
// ============================================================
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png' };
function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const f = path.resolve(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    }).listen(0, () => res(srv));
  });
}
async function start(browser, port, vp, mobile) {
  const ctx = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile });
  const p = await ctx.newPage();
  p.setDefaultTimeout(60000);
  p._errors = [];
  p.on('pageerror', e => p._errors.push(e.message));
  await p.goto(`http://localhost:${port}/index.html`, { timeout: 90000 }); await p.waitForTimeout(1500);
  await p.click('#au-offline'); await p.click('#btn-new'); await p.fill('#cr-name', 'Easy'); await p.click('#cr-start'); await p.waitForTimeout(1500);
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 10000, polling: 250 }).catch(() => {});
  await p.waitForTimeout(500);
  // Einherjar Lv 20: Whirlwind Lv 5 (ปลดรูน ยังไม่เลือก) • Iron Body Lv 4 • Shield Slam Lv 2 (อีก 2 Lv) • War Cry 0 (อีก 4 Lv)
  await p.evaluate(() => {
    document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden'));
    Bot.toggle(false);
    try { for (const k of Object.keys(localStorage)) if (k.startsWith('iv_rune_new_ack:')) localStorage.removeItem(k); } catch (e) { /* */ }
    Runebook._ack = null;
    const pl = G.player; pl.job = 'einherjar'; pl.jobLv = 10; pl.baseLv = 20; pl.zeny = 1e6; pl.combatAt = -99; pl.runes = {}; pl.hrunes = [null, null]; pl.hrunesOwn = [];
    Object.assign(pl.skills, { whirlwind: 5, iron_body: 4, shield_slam: 2 }); delete pl.skills.war_cry;
    recalc(); UI.skTab = 'einherjar';
  });
  return p;
}

(async () => {
  const srv = await serve();
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  const browser = await chromium.launch(opts);
  const port = srv.address().port;
  const out = [];
  const ok = (name, cond, info = '') => out.push([name, !!cond, typeof info === 'string' ? info : JSON.stringify(info)]);
  const p = await start(browser, port, { width: 1600, height: 900 }, false);

  // ---------- 1) คำไทยครบทุกรูน ----------
  const th = await p.evaluate(() => {
    const bad = [], all = Object.values(Runes.BY_ID);
    for (const r of all) {
      const t = RUNE_TH[r.id], n = Runes.shortNums(r);
      if (!t) { bad.push(r.id + ': no Thai'); continue; }
      const idx = (t.match(/\{(\d+)\}/g) || []).map(x => +x.slice(1, -1));
      if (idx.some(i => i >= n.length)) bad.push(r.id + ': {n} > numbers');
      const s = Runes.thOf(r);
      if (/\{\d+\}/.test(s) || !/[฀-๿]/.test(s)) bad.push(r.id + ': ' + s);
      if (/คลาส|อาชีพ/.test(s)) bad.push(r.id + ': uses คลาส/อาชีพ');
    }
    return { n: all.length, bad, sample: Runes.thOf(Runes.BY_ID['whirlwind.bladestorm']) };
  });
  ok(`Thai: all ${th.n} runes have a one-line Thai effect, numbers filled from the live short text`, th.n >= 120 && !th.bad.length, th.bad.length ? th.bad.slice(0, 5) : th.sample);

  // ---------- 2) หน้าต่าง Skills: เลือก/ถอดใน 1 แตะ • ล็อก • "!" ----------
  const sk = await p.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms)), pl = G.player, r = {};
    const W = () => document.getElementById('w-skills');
    Runebook.markMenu();
    const mb = () => document.querySelector('#menubar [data-win="w-skills"]');
    r.menuBang = mb().classList.contains('rn-new');
    UI.skTab = 'einherjar'; UI.open('w-skills'); await wait(60);
    const row = id => W().querySelector(`.rn-row[data-skill="${id}"]`);
    const ww = row('whirlwind');
    const cards = [...ww.querySelectorAll('.rn-opt')];
    r.cards = cards.map(c => c.dataset.rune);
    r.cardText = cards.map(c => c.querySelector('.rn-d').textContent);
    r.thai = r.cardText.every(t => /[฀-๿]/.test(t));
    r.pickLabel = cards.every(c => c.querySelector('.rn-act').textContent === 'เลือก');
    r.rowBang = !!ww.previousElementSibling.querySelector('.sk-name .rn-bang');
    r.newState = /ปลดรูนแล้ว/.test(ww.querySelector('.rn-state').textContent);
    r.tabBang = !![...W().querySelectorAll('.sk-tabs .tab')].find(t => t.classList.contains('on') && t.querySelector('.rn-bang'));
    // แตะ 1 ครั้ง = ใช้
    W().querySelector('.rn-opt[data-rune="whirlwind.vortex"]').click(); await wait(40);
    r.chose = pl.runes.whirlwind === 'whirlwind.vortex' && Runes.chosen('whirlwind') && Runes.chosen('whirlwind').id === 'whirlwind.vortex';
    const on = W().querySelector('.rn-opt.on[data-rune="whirlwind.vortex"]');
    r.useLabel = !!on && /ใช้อยู่/.test(on.querySelector('.rn-act').textContent) && /ใช้อยู่: Vortex/.test(row('whirlwind').querySelector('.rn-state').textContent);
    r.bangGone = !row('whirlwind').previousElementSibling.querySelector('.rn-bang');
    // แตะอีกแบบ = สลับ (1 แตะ) • แตะอันที่ใช้อยู่ = ถอด (1 แตะ)
    W().querySelector('.rn-opt[data-rune="whirlwind.bladestorm"]').click(); await wait(40);
    r.swapped = pl.runes.whirlwind === 'whirlwind.bladestorm';
    W().querySelector('.rn-opt[data-rune="whirlwind.bladestorm"]').click(); await wait(40);
    r.removed = !pl.runes.whirlwind && !W().querySelector('.rn-row[data-skill="whirlwind"] .rn-opt.on');
    // ล็อก: บอกว่าขาดอีกกี่ Lv
    r.lock2 = row('shield_slam').querySelector('.rn-state').textContent;
    r.lock4 = row('war_cry').querySelector('.rn-state').textContent;
    r.lockedOff = [...row('shield_slam').querySelectorAll('.rn-opt')].every(b => b.disabled);
    // เปิด Skills แล้ว = "!" ที่เมนูหาย (รับทราบ)
    Runebook.markMenu();
    r.menuAck = !mb().classList.contains('rn-new');
    UI.close('w-skills');
    return r;
  });
  ok('skills: each skill shows its 2 runes as tap targets with a Thai effect line and "เลือก"', JSON.stringify(sk.cards) === '["whirlwind.vortex","whirlwind.bladestorm"]' && sk.thai && sk.pickLabel, sk.cardText);
  ok('skills: newly unlocked + none chosen → "!" on the skill row, its Class tab and the Skills menu', sk.rowBang && sk.newState && sk.tabBang && sk.menuBang, sk);
  ok('skills: 1 tap equips (label "ใช้อยู่"), "!" goes away', sk.chose && sk.useLabel && sk.bangGone, sk);
  ok('skills: 1 tap swaps to the other rune, 1 tap on the active rune removes it', sk.swapped && sk.removed, sk);
  ok('skills: locked rune says exactly what is needed ("Skill Lv 4 — อีก 2 Lv" / "อีก 4 Lv")', /Skill Lv 4/.test(sk.lock2) && /อีก 2 Lv/.test(sk.lock2) && /อีก 4 Lv/.test(sk.lock4) && sk.lockedOff, [sk.lock2, sk.lock4]);
  ok('skills: opening the Skills window acknowledges the "!" on the menu', sk.menuAck);

  // ---------- 3) ระหว่างต่อสู้ ----------
  const cb = await p.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms)), pl = G.player, r = {}, msgs = [];
    const m0 = UI.msg; UI.msg = function (t, c) { msgs.push(String(t)); return m0.call(this, t, c); };
    pl.combatAt = G.time; UI.skTab = 'einherjar'; UI.open('w-skills'); await wait(60);
    const W = document.getElementById('w-skills'), row = W.querySelector('.rn-row[data-skill="whirlwind"]');
    r.note = (row.querySelector('.rn-busy') || {}).textContent || '';
    row.querySelector('.rn-opt[data-rune="whirlwind.vortex"]').click(); await wait(40);
    r.kept = !pl.runes.whirlwind;
    r.msg = msgs.find(t => /ระหว่างต่อสู้/.test(t)) || '';
    pl.combatAt = -99; Runes.watchCombat(); UI.renderSkills(); await wait(40);
    r.cleared = !document.querySelector('#w-skills .rn-busy');
    UI.msg = m0; UI.close('w-skills');
    return r;
  });
  ok('combat: rune row says when swapping will be allowed ("อีก N วิ"); a tap is refused with a message', /กำลังต่อสู้/.test(cb.note) && /อีก \d+ วิ/.test(cb.note) && cb.kept && /\d+ วิ/.test(cb.msg) && cb.cleared, cb);

  // ---------- 4) ราคา Hunt Rune ×2 ----------
  const OLD = { hr_slay_brute: 1500, hr_slay_plant: 1500, hr_slay_insect: 1500, hr_slay_formless: 1500, hr_slay_undead: 2500, hr_slay_demon: 4000, hr_slay_angel: 4000, hr_slay_human: 2500,
    hr_endow_fire: 2500, hr_endow_water: 1500, hr_endow_wind: 1500, hr_endow_earth: 1500, hr_endow_holy: 4000, hr_endow_shadow: 4000, hr_giant: 6000, hr_exec: 6000, hr_ambush: 6000, hr_pack: 6000 };
  const pr = await p.evaluate(old => {
    const bad = [];
    for (const d of HuntRunes.LIST) if (d.price !== old[d.id] * 2 || ITEMS[d.id].price !== d.price) bad.push(`${d.id}:${d.price}`);
    return { n: HuntRunes.LIST.length, mul: HR_PRICE_MUL, bad };
  }, OLD);
  ok('price: every Hunt Rune costs exactly 2× its old price (HR_PRICE_MUL = 2, item data follows)', pr.mul === 2 && pr.n === Object.keys(OLD).length && !pr.bad.length, pr);

  // ---------- 5) ซื้อจากหน้าต่าง Runes ไกล Brokk ----------
  const buy = await p.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms)), pl = G.player, HR = HuntRunes, r = {};
    const W = () => document.getElementById('w-runes');
    changeMap('meadow', 28.5, 28.5); await wait(200);
    const brokk = (G.npcs || []).find(n => n.id === 'refine');
    r.far = !brokk || U.dist(pl.x, pl.y, brokk.x, brokk.y) > 20;
    pl.combatAt = -99; pl.zeny = 20000; pl.baseLv = 20; pl.hrunes = [null, null]; pl.hrunesOwn = [];
    Runebook.open('hunt', 'hr_exec'); await wait(50);
    const b = W().querySelector('.rb-buy');
    r.btn = b && b.textContent;
    b.click(); await wait(30); // แตะ 1: เปิดกล่องยืนยัน (ยังไม่หักเงิน)
    r.staged = pl.zeny === 20000 && !HR.owns('hr_exec') && !!W().querySelector('.rb-confirm');
    r.confirmText = W().querySelector('.rb-confirm').textContent;
    const auto = W().querySelector('.rb-auto');
    r.autoDefault = !!auto && auto.getAttribute('aria-checked') === 'true' && auto.dataset.slot === '0';
    W().querySelector('.rb-buy-ok').click(); await wait(40); // แตะ 2: ยืนยัน
    r.paid = pl.zeny === 20000 - HR.def('hr_exec').price;
    r.owned = HR.owns('hr_exec') && pl.hrunes[0] === 'hr_exec' && HR.active().some(d => d.id === 'hr_exec');
    // ไม่ติ๊ก "ใส่ช่องเลย" = ซื้ออย่างเดียว
    pl.baseLv = 35; pl.zeny = 10000;
    Runebook.open('hunt', 'hr_slay_brute'); await wait(40);
    W().querySelector('.rb-buy').click(); await wait(30);
    W().querySelector('.rb-auto').click(); await wait(30);
    r.unticked = W().querySelector('.rb-auto').getAttribute('aria-checked') === 'false';
    W().querySelector('.rb-buy-ok').click(); await wait(40);
    r.noSocket = HR.owns('hr_slay_brute') && pl.hrunes[1] === null && pl.zeny === 10000 - HR.def('hr_slay_brute').price;
    Runebook.buyAuto = true;
    // ยกเลิก = ไม่เสียเงิน
    const z = pl.zeny;
    Runebook.open('hunt', 'hr_endow_water'); await wait(40);
    W().querySelector('.rb-buy').click(); await wait(30); W().querySelector('.rb-buy-no').click(); await wait(30);
    r.cancel = pl.zeny === z && !HR.owns('hr_endow_water');
    return r;
  });
  ok('buy: Runes window sells Hunt Runes far from Brokk — Buy (price) → confirm (price + left after)', buy.far && /12,000/.test(buy.btn) && buy.staged && /12,000/.test(buy.confirmText) && /8,000/.test(buy.confirmText), buy);
  ok('buy: confirming deducts the exact price and "ซื้อแล้วใส่ช่อง I เลย" (on by default) sockets it', buy.autoDefault && buy.paid && buy.owned, buy);
  ok('buy: unticking "ใส่ช่องเลย" only buys; Cancel spends nothing', buy.unticked && buy.noSocket && buy.cancel, buy);

  // ---------- 6) เงินไม่พอ ----------
  const poor = await p.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms)), pl = G.player, HR = HuntRunes, r = {}, msgs = [];
    pl.zeny = 1000;
    Runebook.open('hunt', 'hr_giant'); await wait(40);
    const b = document.querySelector('#w-runes .rb-buy');
    r.disabled = !!b && b.disabled && b.classList.contains('poor');
    r.miss = b && b.dataset.miss; r.text = b && b.textContent; r.have = (document.querySelector('#w-runes .rb-buy-have') || {}).textContent || '';
    const m0 = UI.msg; UI.msg = function (t, c) { msgs.push(String(t)); return m0.call(this, t, c); };
    r.refused = !HR.buy('hr_giant') && pl.zeny === 1000;
    r.msg = msgs.join(' | ');
    UI.msg = m0; UI.close('w-runes');
    return r;
  });
  ok('not enough Volt: button shows how much is missing (11,000), purchase refused with the missing amount', poor.disabled && poor.miss === '11000' && /ขาดอีก 11,000/.test(poor.text) && /12,000/.test(poor.have) && poor.refused && /11,000/.test(poor.msg), poor);

  // ---------- 7) เซฟเก่าโหลดเหมือนเดิม ----------
  const sv = await p.evaluate(() => {
    const pl = G.player;
    pl.runes = { whirlwind: 'whirlwind.vortex', iron_body: 'iron_body.retaliate' }; pl.hrunes = ['hr_exec', 'hr_slay_brute']; pl.hrunesOwn = ['hr_exec', 'hr_slay_brute'];
    const data = JSON.parse(JSON.stringify(saveData()));
    const keys = Object.keys(data).sort().join(',');
    const q = loadGameFrom(data);
    return { keys, runes: JSON.stringify(q.runes), hr: JSON.stringify(q.hrunes), own: JSON.stringify(q.hrunesOwn), saveKey: SAVE_KEY };
  });
  ok('old save: p.runes / p.hrunes / p.hrunesOwn load unchanged; SAVE_KEY unchanged; no new save fields', sv.runes === '{"whirlwind":"whirlwind.vortex","iron_body":"iron_body.retaliate"}' && sv.hr === '["hr_exec","hr_slay_brute"]'
    && sv.own === '["hr_exec","hr_slay_brute"]' && sv.saveKey === 'ragnarok_web_save_v2' && !/rune(Ack|New|Seen)/i.test(sv.keys), sv);

  // ---------- 8) มือถือ 390×844 + กติกาหน้าตา ----------
  const m = await start(browser, port, { width: 390, height: 844 }, true);
  const ui = await m.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms)), pl = G.player, r = { bad: [] };
    const thai = s => /[฀-๿]/.test(s);
    const check = (root, tag) => {
      for (const e of root.querySelectorAll('*')) {
        if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') continue;
        const cs = getComputedStyle(e), own = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
        const rad = cs.borderTopLeftRadius;
        if (/%/.test(rad) ? parseFloat(rad) > 0 : parseFloat(rad) > 8) r.bad.push(`${tag} radius ${rad} ${e.className}`);
        if (own && thai(own) && parseFloat(cs.letterSpacing) > 0) r.bad.push(`${tag} letter-spacing ${e.className}`);
        if (own && parseFloat(cs.fontSize) < 14) r.bad.push(`${tag} font ${cs.fontSize} ${e.className} "${own.slice(0, 20)}"`);
        if ((e.tagName === 'BUTTON') && e.getBoundingClientRect().height < 44) r.bad.push(`${tag} button h ${Math.round(e.getBoundingClientRect().height)} ${e.className}`);
        if (e.tagName === 'PROGRESS' || e.tagName === 'METER') r.bad.push(`${tag} bar ${e.tagName}`);
      }
    };
    UI.skTab = 'einherjar'; UI.open('w-skills'); await wait(80);
    const rows = [...document.querySelectorAll('#w-skills .rn-row')];
    r.rows = rows.length;
    rows.forEach(x => check(x, 'skills'));
    check(document.querySelector('#w-skills .rn-help'), 'help');
    // 1 แตะบนมือถือ
    const opt = document.querySelector('#w-skills .rn-opt[data-rune="whirlwind.vortex"]');
    opt.scrollIntoView(); r.optH = Math.round(opt.getBoundingClientRect().height);
    opt.click(); await wait(40);
    r.tap = pl.runes.whirlwind === 'whirlwind.vortex';
    r.fits = document.getElementById('w-skills').getBoundingClientRect().right <= 390 + 0.5;
    UI.close('w-skills');
    pl.zeny = 50000; pl.combatAt = -99;
    Runebook.open('hunt', 'hr_exec'); await wait(60);
    document.querySelector('#w-runes .rb-buy').click(); await wait(40);
    check(document.querySelector('#w-runes .rb-confirm'), 'confirm');
    pl.zeny = 100; Runebook.render(true); await wait(30);
    // (เปลี่ยนเงินแล้ว กล่องยืนยันกลายเป็น "ขาดอีก")
    const wrap = document.querySelector('#w-runes .rb-buy-wrap'); if (wrap) check(wrap, 'poor');
    r.poorShown = !!wrap;
    UI.close('w-runes');
    return r;
  });
  ok('phone: Skills rune rows/confirm box follow owner UI rules (radius ≤ 8, no Thai letter-spacing, text ≥ 14px, buttons ≥ 44px, no bars)', ui.rows >= 6 && !ui.bad.length, ui.bad.slice(0, 6));
  ok('phone: 1 tap equips from the Skills window; rune button ≥ 44px; window fits 390px', ui.tap && ui.optH >= 44 && ui.fits && ui.poorShown, ui);
  ok('no page errors', !p._errors.length && !m._errors.length, [...p._errors, ...m._errors].slice(0, 3).join(' | '));

  await browser.close(); srv.close();
  let fail = 0;
  for (const [n, pass, info] of out) { console.log(`${pass ? '✔' : '✘'} ${n}${pass ? '' : '  → ' + info}`); if (!pass) fail++; }
  console.log(fail ? `\n${fail} FAILED` : `\nALL ${out.length} PASSED`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
