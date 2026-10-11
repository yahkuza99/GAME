'use strict';
// ============================================================
//  ทดสอบ "รูนต้องซื้อก่อนใช้ + ซื้อทางไกลแพงกว่า" (รอบ 31 — เจ้าของ 2026-10-11:
//  "แก้ไขรูน ตอนนี้มันกดใส่ได้เลย ทั้งๆ ที่ยังไม่ได้ซื้อ เสนอให้ซื้อทางไกลได้ แต่ค่าใช้จ่ายแพง" — ทั้ง Skill Rune และ Hunt Rune)
//  • Skill Rune ที่ยังไม่ซื้อใส่ไม่ได้ (Runes.set ปฏิเสธ + ข้อความบอกราคา) • ราคาตาม Class ของสกิล 1,500 / 3,000 / 6,000
//  • ใกล้ Brokk (ระยะคุย) = ราคาปกติ • ที่อื่น = ×1.5 (ค่าส่งทางไกล) — ทั้ง Skill Rune และ Hunt Rune
//  • หน้าต่างยืนยัน: ราคา / ค่าส่งทางไกล / ราคาที่ Brokk / เหลือหลังซื้อ หรือ ขาดอีกเท่าไร • ปุ่ม "ไปซื้อที่ Brokk" นำทางไปหา NPC
//  • เซฟเก่า: รูนที่เลือกใช้อยู่ (+ ในชุด Builds) ได้เป็นของตัวเอง • ชุด Builds ข้ามรูนที่ยังไม่ซื้อ • แท็บ Skill Rune ในเตาของ Brokk
//  • ภาพ: มือถือ 390×844 + PC ของแถวรูนในหน้าต่าง Skills และหน้าต่างยืนยัน → %TEMP%/iv_runebuy
//  รัน:  CHROME=<chrome-headless-shell> NODE_PATH=<โฟลเดอร์ที่มี playwright> node tests/runebuy.js
// ============================================================
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(os.tmpdir(), 'iv_runebuy');
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
// ภาพเฉพาะส่วน: หน้าต่าง Skills วาดใหม่เป็นระยะ (element ถูกแทนที่) → ใช้กรอบจากตำแหน่งตอนนั้นแทน locator
async function shot(page, sel, file) {
  const b = await page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; }, sel);
  if (!b || b.width < 1) return;
  const vp = page.viewportSize(), x = Math.max(0, b.x - 6), y = Math.max(0, b.y - 6);
  await page.screenshot({ path: file, clip: { x, y, width: Math.min(vp.width - x, b.width + 12), height: Math.min(vp.height - y, b.height + 12) } });
}
async function start(browser, port, vp, mobile) {
  const ctx = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile });
  const p = await ctx.newPage();
  p.setDefaultTimeout(60000);
  p._errors = [];
  p.on('pageerror', e => p._errors.push(e.message));
  await p.goto(`http://localhost:${port}/index.html`, { timeout: 90000 }); await p.waitForTimeout(1500);
  await p.click('#au-offline'); await p.click('#btn-new'); await p.fill('#cr-name', 'Buyer'); await p.click('#cr-start'); await p.waitForTimeout(1500);
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 10000, polling: 250 }).catch(() => {});
  await p.waitForTimeout(500);
  // Einherjar Lv 20: Whirlwind Lv 5 / Iron Body Lv 4 (ปลดรูน) • ยังไม่มีรูนเลย • อยู่ Neo Eldheim จุดเกิด (ห่าง Brokk ~13 ช่อง = ซื้อทางไกล)
  await p.evaluate(() => {
    document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden'));
    Bot.toggle(false);
    const pl = G.player; pl.job = 'einherjar'; pl.jobLv = 10; pl.baseLv = 20; pl.zeny = 1e6; pl.combatAt = -99;
    pl.runes = {}; pl.runesOwn = []; pl.hrunes = [null, null]; pl.hrunesOwn = [];
    Object.assign(pl.skills, { whirlwind: 5, iron_body: 4 });
    recalc(); UI.skTab = 'einherjar';
  });
  return p;
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const srv = await serve();
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  const browser = await chromium.launch(opts);
  const port = srv.address().port;
  const out = [];
  const ok = (name, cond, info = '') => out.push([name, !!cond, typeof info === 'string' ? info : JSON.stringify(info)]);
  const p = await start(browser, port, { width: 1600, height: 900 }, false);

  // ---------- 1) ราคา: ตารางเดียว ตาม Class ของสกิล • ตัวคูณทางไกล ----------
  const pr = await p.evaluate(() => {
    // Class 2 ยังไม่มีรูน (มีแค่ Class 1 + Class 3 Oath) → ตรวจราคาจากตาราง/ชั้นของสกิล Class 2 ตัวแรก (พร้อมเมื่อมีรูน Class 2)
    const c2 = Object.keys(JOBS).filter(j => JOBS[j].tier === 2).flatMap(j => JOBS[j].skills)[0], c2runes = Object.values(Runes.BY_ID).filter(r => RuneShop.tierOf(r.skill) === 2).length;
    const c3 = Object.keys(JOBS).filter(j => JOBS[j].tier === 3).flatMap(j => JOBS[j].skills).find(id => Runes.list(id).length >= 2);
    const all = Object.values(Runes.BY_ID), bad = all.filter(r => ![1500, 3000, 6000].includes(RuneShop.basePrice('skill', r.id))).map(r => r.id);
    return { mul: RS_REMOTE_MUL, t: RS_SKILL_PRICE, c1: RuneShop.basePrice('skill', 'whirlwind.vortex'), c2, p2: RS_SKILL_PRICE[RuneShop.tierOf(c2)], c2runes, c3, p3: RuneShop.basePrice('skill', Runes.list(c3)[0].id), n: all.length, bad };
  });
  ok('price table: Class 1 = 1,500 • Class 2 = 3,000 • Class 3 = 6,000 (tier from the skill\'s Class) • REMOTE_MUL = 1.5', pr.mul === 1.5 && pr.c1 === 1500 && pr.p2 === 3000 && pr.p3 === 6000 && !pr.bad.length, pr);

  // ---------- 2) ยังไม่ซื้อ = ใส่ไม่ได้ (ทั้ง Skill Rune และ Hunt Rune) ----------
  const guard = await p.evaluate(() => {
    const pl = G.player, msgs = [], m0 = UI.msg; UI.msg = function (t, c) { msgs.push(String(t)); return m0.call(this, t, c); };
    const r = {};
    r.near = RuneShop.near();
    r.skill = Runes.set('whirlwind', 'whirlwind.vortex') === false && !pl.runes.whirlwind && !Runes.chosen('whirlwind');
    r.skillMsg = msgs.slice(-1)[0] || '';
    pl.baseLv = 20;
    r.hunt = HuntRunes.set(0, 'hr_pack') === false && pl.hrunes[0] === null;
    r.huntMsg = msgs.slice(-1)[0] || '';
    UI.msg = m0;
    return r;
  });
  ok('skill rune not bought → Runes.set refuses, nothing equipped, message gives both prices', !guard.near && guard.skill && /ยังไม่ได้ซื้อ/.test(guard.skillMsg) && /2,250/.test(guard.skillMsg) && /1,500/.test(guard.skillMsg), guard);
  ok('hunt rune not bought → HuntRunes.set refuses with the remote / Brokk prices', guard.hunt && /ยังไม่ได้ซื้อ/.test(guard.huntMsg) && /Brokk/.test(guard.huntMsg), guard);

  // ---------- 3) หน้าต่าง Skills ไกล Brokk: ปุ่ม "ซื้อ 2,250" → หน้าต่างยืนยัน → ซื้อ + ใส่เลย ----------
  const sk = await p.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms)), pl = G.player, r = {};
    UI.open('w-skills'); await wait(80);
    const row = document.querySelector('#w-skills .rn-row[data-skill="whirlwind"]');
    row.scrollIntoView({ block: 'center' });
    const b = row.querySelector('.rn-opt[data-rune="whirlwind.vortex"]');
    r.act = b.querySelector('.rn-act').textContent; r.price = (b.querySelector('.rn-price') || {}).textContent || '';
    r.own = b.dataset.own; r.go = !!row.querySelector('.rn-gobrokk');
    r.states = [...document.querySelectorAll('#w-skills .rn-opt')].map(x => x.querySelector('.rn-act').textContent);
    return r;
  });
  ok('Skills window (remote): unbought rune button says "ซื้อ 2,250", price line "ซื้อทางไกล 2,250 (ที่ Brokk 1,500)" + "ไปซื้อที่ Brokk" button', sk.act === 'ซื้อ 2,250' && /ซื้อทางไกล 2,250 \(ที่ Brokk 1,500\)/.test(sk.price) && sk.own === '0' && sk.go, sk);
  await shot(p, '#w-skills .rn-row[data-skill="whirlwind"]', path.join(SHOTS, 'pc_skillrow_remote.png'));
  await p.click('#w-skills .rn-row[data-skill="whirlwind"] .rn-opt[data-rune="whirlwind.vortex"]'); await p.waitForTimeout(80);
  const ask = await p.evaluate(() => {
    const a = document.querySelector('#w-confirm .rs-ask'), pl = G.player;
    return { open: !!a && !document.getElementById('w-confirm').classList.contains('hidden'), text: a ? a.textContent : '', price: a && a.dataset.price, near: a && a.dataset.near,
      go: !!(a && a.querySelector('.rs-go')), staged: pl.zeny === 1e6 && !RuneShop.ownsSkill('whirlwind.vortex') };
  });
  ok('confirm dialog (remote): price 2,250 + remote fee +750 + at Brokk 1,500 + Volt left 997,750; nothing paid yet', ask.open && ask.price === '2250' && ask.near === '0' && /\+750/.test(ask.text) && /1,500/.test(ask.text) && /997,750/.test(ask.text) && ask.go && ask.staged, ask);
  await shot(p, '#w-confirm', path.join(SHOTS, 'pc_confirm_remote.png'));
  await p.click('#w-confirm .rs-ok'); await p.waitForTimeout(80);
  const bought = await p.evaluate(() => {
    const pl = G.player, b = document.querySelector('#w-skills .rn-opt[data-rune="whirlwind.vortex"]'), o = document.querySelector('#w-skills .rn-opt[data-rune="whirlwind.bladestorm"]');
    return { zeny: pl.zeny, own: RuneShop.ownsSkill('whirlwind.vortex'), eq: pl.runes.whirlwind, act: b && b.querySelector('.rn-act').textContent, other: o && o.querySelector('.rn-act').textContent,
      closed: document.getElementById('w-confirm').classList.contains('hidden') };
  });
  ok('buy remote = 1.5× (2,250 paid) → owned forever + equipped right away ("ใช้อยู่ ✓")', bought.zeny === 1e6 - 2250 && bought.own && bought.eq === 'whirlwind.vortex' && bought.act === 'ใช้อยู่ ✓' && bought.closed, bought);
  // ถอดแล้วใส่ใหม่ฟรี (ซื้อแล้ว = "เลือก")
  const swap = await p.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms)), pl = G.player, z = pl.zeny;
    document.querySelector('#w-skills .rn-opt[data-rune="whirlwind.vortex"]').click(); await wait(40);
    const off = !pl.runes.whirlwind, act = document.querySelector('#w-skills .rn-opt[data-rune="whirlwind.vortex"] .rn-act').textContent;
    document.querySelector('#w-skills .rn-opt[data-rune="whirlwind.vortex"]').click(); await wait(40);
    return { off, act, on: pl.runes.whirlwind === 'whirlwind.vortex', free: pl.zeny === z };
  });
  ok('owned rune: label "เลือก", remove/re-equip is free', swap.off && swap.act === 'เลือก' && swap.on && swap.free, swap);

  // ---------- 4) ยืนใกล้ Brokk = ราคาปกติ (Skill Rune + Hunt Rune) ----------
  const near = await p.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms)), pl = G.player, r = {};
    const brokk = G.npcs.find(n => n.id === 'refine');
    teleportPlayer(brokk.x + 0.5, brokk.y + 2.5); await wait(60);
    r.near = RuneShop.near(); r.dist = Math.round(NPC.distance(brokk) * 10) / 10;
    UI.renderSkills(); await wait(40);
    const b = document.querySelector('#w-skills .rn-opt[data-rune="whirlwind.bladestorm"]');
    r.act = b.querySelector('.rn-act').textContent; r.go = !!document.querySelector('#w-skills .rn-row[data-skill="whirlwind"] .rn-gobrokk');
    b.click(); await wait(40);
    const a = document.querySelector('#w-confirm .rs-ask');
    r.price = a && a.dataset.price; r.text = a ? a.textContent : ''; r.noGo = !(a && a.querySelector('.rs-go'));
    const z = pl.zeny; document.querySelector('#w-confirm .rs-ok').click(); await wait(40);
    r.paid = z - pl.zeny; r.eq = pl.runes.whirlwind;
    // Hunt Rune: ใกล้ Brokk ซื้อจากหน้าต่าง Runes (หรือเรียกตรง) = ราคาปกติ
    const z2 = pl.zeny; r.hb = HuntRunes.buy('hr_giant'); r.hpaid = z2 - pl.zeny; r.hbase = HuntRunes.def('hr_giant').price;
    UI.close('w-skills');
    return r;
  });
  ok('near Brokk (talk range): skill rune = base 1,500, no fee line, no "go to Brokk" button', near.near && near.act === 'ซื้อ 1,500' && !near.go && near.price === '1500' && !/ค่าส่ง/.test(near.text) && near.noGo && near.paid === 1500 && near.eq === 'whirlwind.bladestorm', near);
  ok('near Brokk: hunt rune = base price (Giant Slayer 12,000)', near.hb && near.hpaid === near.hbase && near.hbase === 12000, near);

  // ---------- 5) Hunt Rune ทางไกล = ×1.5 (หน้าต่าง Runes) ----------
  const hr = await p.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms)), pl = G.player, r = {}, W = () => document.getElementById('w-runes');
    teleportPlayer(20.5, 24.5); await wait(60);
    r.far = !RuneShop.near();
    Runebook.open('hunt', 'hr_exec'); await wait(60);
    const b = W().querySelector('.rb-buy'); r.btn = b && b.textContent; r.go = !!W().querySelector('.rb-gobrokk');
    b.click(); await wait(40);
    r.confirm = (W().querySelector('.rb-confirm') || {}).textContent || '';
    const z = pl.zeny; W().querySelector('.rb-buy-ok').click(); await wait(40);
    r.paid = z - pl.zeny; r.base = HuntRunes.def('hr_exec').price; r.own = HuntRunes.owns('hr_exec');
    UI.close('w-runes');
    return r;
  });
  ok('hunt rune remote (Runes window) = 1.5×: Executioner 18,000 (at Brokk 12,000), fee +6,000 in confirm, "go to Brokk" offered', hr.far && /18,000/.test(hr.btn) && /12,000/.test(hr.btn) && hr.go && /\+6,000/.test(hr.confirm) && hr.paid === hr.base * 1.5 && hr.own, hr);

  // ---------- 6) หน้าต่าง Runes แท็บ Skill: การ์ดยังไม่ซื้อมีป้ายราคา • Choose = ซื้อ ----------
  const rb = await p.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms)), pl = G.player, r = {}, W = () => document.getElementById('w-runes');
    Runebook.open('skill', 'iron_body'); await wait(60);
    const id = Runes.list('iron_body')[0].id;
    r.tag = (W().querySelector(`.rb-card[data-rune="${id}"] .rb-price`) || {}).textContent || '';
    W().querySelector(`.rb-card[data-rune="${id}"]`).click(); await wait(40);
    const ch = W().querySelector('.rb-choose'); r.choose = ch.textContent; r.go = !!W().querySelector('.rb-gobrokk');
    ch.click(); await wait(40);
    r.ask = !!document.querySelector('#w-confirm .rs-ask:not(.x)') && !document.getElementById('w-confirm').classList.contains('hidden');
    document.querySelector('#w-confirm .rs-no').click(); await wait(30);
    r.cancel = !RuneShop.ownsSkill(id) && !pl.runes.iron_body;
    W().querySelector(`.rb-card[data-rune="${id}"]`).click(); await wait(40);
    return r;
  });
  await shot(p, '#w-runes', path.join(SHOTS, 'pc_runes_skilltab.png'));
  await p.evaluate(() => UI.close('w-runes'));
  ok('Runes window: unbought card shows price, Choose becomes "ซื้อทางไกล 2,250 (ที่ Brokk 1,500)" → confirm; Cancel spends nothing', /2,250/.test(rb.tag) && /ซื้อทางไกล 2,250 \(ที่ Brokk 1,500\)/.test(rb.choose) && rb.go && rb.ask && rb.cancel, rb);

  // ---------- 7) เงินไม่พอ: บอกว่าขาดเท่าไร ----------
  const poor = await p.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms)), pl = G.player, r = {}, msgs = [];
    pl.zeny = 1000;
    const id = Runes.list('iron_body')[1].id;
    RuneShop.ask('skill', id); await wait(30);
    const a = document.querySelector('#w-confirm .rs-ask');
    r.miss = (a.querySelector('.rs-miss') || {}).textContent || ''; r.okDis = a.querySelector('.rs-ok').disabled; r.okText = a.querySelector('.rs-ok').textContent;
    RuneShop.close();
    const m0 = UI.msg; UI.msg = function (t, c) { msgs.push(String(t)); return m0.call(this, t, c); };
    r.refused = !RuneShop.buy('skill', id) && pl.zeny === 1000 && !RuneShop.ownsSkill(id);
    UI.msg = m0; r.msg = msgs.join(' | ');
    pl.zeny = 1e6;
    return r;
  });
  ok('not enough Volt: confirm shows "ขาดอีก 1,250" (2,250 − 1,000), buy disabled; direct buy refused with the missing amount', /1,250/.test(poor.miss) && poor.okDis && /1,250/.test(poor.okText) && poor.refused && /ขาดอีก 1,250/.test(poor.msg), poor);

  // ---------- 8) ปุ่ม "ไปซื้อที่ Brokk" = นำทางไปหา NPC ----------
  const nav = await p.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    RuneShop.ask('skill', Runes.list('iron_body')[1].id); await wait(30);
    document.querySelector('#w-confirm .rs-go').click(); await wait(30);
    const t = Nav.target; const r = { npc: t && t.npcId, kind: t && t.kind, closed: document.getElementById('w-confirm').classList.contains('hidden') };
    Nav.cancel(true); return r;
  });
  ok('"ไปซื้อที่ Brokk" starts navigation to Brokk Forge-Bot', nav.kind === 'npc' && nav.npc === 'refine' && nav.closed, nav);

  // ---------- 9) เซฟเก่า: รูนที่ใช้อยู่ (+ ในชุด Builds) ได้เป็นของตัวเอง • เซฟใหม่ที่ถูกแก้ = ตัดรูนที่ไม่ได้ซื้อ ----------
  const sv = await p.evaluate(() => {
    const pl = G.player, base = { gender: 'm', hair: '#ccc', job: 'einherjar', baseLv: 20, jobLv: 20, stats: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 }, skills: { whirlwind: 5, iron_body: 5, shield_slam: 5 } };
    const lo = { cur: -1, slots: [{ name: 'A', at: 1, job: 'einherjar', passives: [], runes: { shield_slam: 'shield_slam.charge' }, equip: {}, hotbar: [], potbar: [], bot: { adv: false, text: '1:', preset: -1 } }, null, null] };
    const old = loadGameFrom(Object.assign({ name: 'OldRunes', runes: { whirlwind: 'whirlwind.vortex', iron_body: 'iron_body.retaliate' }, loadouts: lo }, base));
    const r = { runes: JSON.stringify(old.runes), own: JSON.stringify(old.runesOwn.slice().sort()) };
    const tam = loadGameFrom(Object.assign({ name: 'Tampered', runes: { whirlwind: 'whirlwind.vortex' }, runesOwn: [] }, base));
    r.tam = JSON.stringify(tam.runes);
    const rt = loadGameFrom(JSON.parse(JSON.stringify(saveData()))); // เซฟ Tampered ที่โหลดอยู่ → เซฟ → โหลดกลับ
    r.rt = JSON.stringify(rt.runesOwn);
    G.player.runesOwn = ['whirlwind.vortex', 'whirlwind.bladestorm'];
    r.rt2 = JSON.stringify(loadGameFrom(JSON.parse(JSON.stringify(saveData()))).runesOwn);
    G.player = pl; recalc();
    r.field = SAVE_FIELDS.includes('runesOwn') && SAVE_KEY === 'ragnarok_web_save_v2';
    return r;
  });
  ok('old save (no runesOwn): chosen runes kept + owned, runes saved in Builds owned too', sv.runes === '{"whirlwind":"whirlwind.vortex","iron_body":"iron_body.retaliate"}' && sv.own === '["iron_body.retaliate","shield_slam.charge","whirlwind.vortex"]', sv);
  ok('new save: runesOwn round-trips; a chosen rune that was never bought is dropped; SAVE_KEY unchanged', sv.rt === '[]' && sv.rt2 === '["whirlwind.vortex","whirlwind.bladestorm"]' && sv.tam === '{}' && sv.field, sv);

  // ---------- 10) Builds: ข้ามรูนที่ยังไม่ซื้อ ----------
  const lo = await p.evaluate(() => {
    const pl = G.player, own0 = pl.runesOwn.slice();
    pl.runesOwn = Object.keys(Runes.BY_ID); pl.combatAt = -99;
    pl.runes = { whirlwind: 'whirlwind.vortex', iron_body: 'iron_body.retaliate' }; Loadouts.save(0, 'T');
    pl.runesOwn = ['whirlwind.vortex']; pl.runes = {};
    const r = Loadouts.apply(0);
    const out = { ok: r.ok, skip: r.runeSkip, runes: JSON.stringify(pl.runes) };
    // Build Code: นำเข้าแล้วรูนที่ไม่ได้ซื้อถูกข้าม (นับใน skipped)
    pl.runes = {};
    const d = Loadouts.decode(Loadouts.exportCode(Loadouts.st().slots[0]));
    const c = Loadouts.check(d.build), a = Loadouts.applyBuild(d.build, { runes: true });
    Object.assign(out, { runeOk: c.runeOk, runeAll: c.runeAll, bSkip: a.skipped, bRunes: JSON.stringify(pl.runes) });
    pl.runesOwn = own0; Loadouts.clear(0);
    return out;
  });
  ok('Builds: switching skips a rune that is not bought (only owned ones equipped, skip counted)', lo.ok && lo.skip === 1 && lo.runes === '{"whirlwind":"whirlwind.vortex"}', lo);
  ok('Build Code: preview counts only owned runes; apply skips the unbought one', lo.runeOk === 1 && lo.runeAll === 2 && lo.bSkip === 1 && lo.bRunes === '{"whirlwind":"whirlwind.vortex"}', lo);

  // ---------- 11) เตาของ Brokk: แท็บ Skill Rune (ราคาปกติ) ----------
  const fg = await p.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms)), pl = G.player, r = {};
    const brokk = G.npcs.find(n => n.id === 'refine');
    teleportPlayer(brokk.x + 0.5, brokk.y + 1.5); await wait(40);
    UI.openForge(brokk); UI.forge.tab = 'srune'; UI.renderForge(); await wait(50);
    const body = document.querySelector('#w-forge .win-body');
    r.tab = !!body.querySelector('.pill.on') && /Skill Rune/.test(body.querySelector('.pill.on').textContent);
    r.rows = body.querySelectorAll('.rs-row').length;
    const id = Runes.list('iron_body')[1].id;
    body.querySelector(`.rs-row[data-rune="${id}"]`).click(); await wait(40);
    const b = document.querySelector('#w-forge .rs-buy'); r.btn = b && b.textContent;
    b.click(); await wait(40);
    const a = document.querySelector('#w-confirm .rs-ask'); r.price = a && a.dataset.price;
    const z = pl.zeny; document.querySelector('#w-confirm .rs-ok').click(); await wait(40);
    r.paid = z - pl.zeny; r.own = RuneShop.ownsSkill(id); r.eqFree = !pl.runes.iron_body; // ซื้อที่เตา = ได้ของ (เลือกใช้เองทีหลัง)
    r.ownedRow = /มีแล้ว/.test((document.querySelector(`#w-forge .rs-row[data-rune="${id}"]`) || {}).textContent || '');
    UI.forge.ssel = Runes.list('shield_slam')[0].id; UI.renderForge(); await wait(40); // ภาพ: รูนที่ยังไม่ซื้อ (ปุ่มซื้อราคาปกติ)
    return r;
  });
  ok('Brokk\'s forge has a "Skill Rune" tab: lists the line\'s runes, buys at base price (1,500)', fg.tab && fg.rows >= 12 && /1,500/.test(fg.btn) && fg.price === '1500' && fg.paid === 1500 && fg.own && fg.ownedRow, fg);
  await shot(p, '#w-forge', path.join(SHOTS, 'pc_forge_skillrune.png'));
  await p.evaluate(() => UI.close('w-forge'));

  // ---------- 12) มือถือ 390×844: แถวรูน + หน้าต่างยืนยัน • กติกาหน้าตา ----------
  const m = await start(browser, port, { width: 390, height: 844 }, true);
  const ui = await m.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms)), r = { bad: [] };
    const thai = s => /[฀-๿]/.test(s);
    const check = (root, tag) => {
      for (const e of root.querySelectorAll('*')) {
        if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') continue;
        const cs = getComputedStyle(e), own = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
        const rad = cs.borderTopLeftRadius;
        if (/%/.test(rad) ? parseFloat(rad) > 0 : parseFloat(rad) > 8) r.bad.push(`${tag} radius ${rad} ${e.className}`);
        if (own && thai(own) && parseFloat(cs.letterSpacing) > 0) r.bad.push(`${tag} letter-spacing ${e.className}`);
        if (own && parseFloat(cs.fontSize) < 14) r.bad.push(`${tag} font ${cs.fontSize} ${e.className} "${own.slice(0, 20)}"`);
        if (e.tagName === 'BUTTON' && e.getBoundingClientRect().height < 44) r.bad.push(`${tag} button h ${Math.round(e.getBoundingClientRect().height)} ${e.className}`);
        if (e.tagName === 'PROGRESS' || e.tagName === 'METER') r.bad.push(`${tag} bar ${e.tagName}`);
      }
    };
    UI.open('w-skills'); await wait(80);
    const row = document.querySelector('#w-skills .rn-row[data-skill="whirlwind"]'); row.scrollIntoView({ block: 'start' }); await wait(30);
    check(row, 'row');
    r.fits = document.getElementById('w-skills').getBoundingClientRect().right <= 390.5;
    return r;
  });
  await shot(m, '#w-skills .rn-row[data-skill="whirlwind"]', path.join(SHOTS, 'phone_skillrow_remote.png'));
  await m.click('#w-skills .rn-row[data-skill="whirlwind"] .rn-opt[data-rune="whirlwind.vortex"]'); await m.waitForTimeout(80);
  const ui2 = await m.evaluate(() => {
    const r = { bad: [] }, a = document.querySelector('#w-confirm .rs-ask'), w = document.getElementById('w-confirm').getBoundingClientRect();
    for (const e of a.querySelectorAll('*')) {
      const cs = getComputedStyle(e), own = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
      if (parseFloat(cs.borderTopLeftRadius) > 8) r.bad.push(`radius ${e.className}`);
      if (own && /[฀-๿]/.test(own) && parseFloat(cs.letterSpacing) > 0) r.bad.push(`letter-spacing ${e.className}`);
      if (own && parseFloat(cs.fontSize) < 14) r.bad.push(`font ${cs.fontSize} ${e.className} "${own.slice(0, 20)}"`);
      if (e.tagName === 'BUTTON' && e.getBoundingClientRect().height < 44) r.bad.push(`button h ${Math.round(e.getBoundingClientRect().height)} ${e.className}`);
    }
    r.inView = w.left >= 0 && w.right <= 390.5 && w.top >= 0 && w.bottom <= 844.5;
    return r;
  });
  await shot(m, '#w-confirm', path.join(SHOTS, 'phone_confirm_remote.png'));
  ok('phone 390×844: rune row + confirm dialog follow owner UI rules (radius ≤ 8, no Thai letter-spacing, text ≥ 14px, buttons ≥ 44px, no bars), fit the screen', !ui.bad.length && ui.fits && !ui2.bad.length && ui2.inView, [...ui.bad, ...ui2.bad].slice(0, 6).concat([ui.fits, ui2.inView]));
  ok('no page errors', !p._errors.length && !m._errors.length, [...p._errors, ...m._errors].slice(0, 3).join(' | '));

  await browser.close(); srv.close();
  let fail = 0;
  for (const [n, pass, info] of out) { console.log(`${pass ? '✔' : '✘'} ${n}${pass ? '' : '  → ' + info}`); if (!pass) fail++; }
  console.log(`\nshots: ${SHOTS}`);
  console.log(fail ? `\n${fail} FAILED of ${out.length}` : `\nALL ${out.length} PASSED`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
