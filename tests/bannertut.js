'use strict';
// ============================================================
//  รอบ 32: ป้ายชื่อแผนที่เล็ก/ไม่มีแผ่น/อยู่สูง/สั้น 2 วิ + ป้ายสอนคุย NPC ไม่ขึ้นตอนทำเควสต์ และขึ้นแค่ครั้งเดียวต่อตัวละคร
//  รัน:  NODE_PATH=$(npm root -g) node tests/bannertut.js   (CHROME=/path/to/chrome ได้ • SHOTS=โฟลเดอร์ภาพหน้าจอ)
// ============================================================
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS || path.join(os.tmpdir(), 'iv_bannertut');
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
  await p.fill('#cr-name', 'BanTut'); await p.click('#cr-start');
  await p.waitForFunction(() => G.started, null, { timeout: 30000 });
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 15000, polling: 250 }).catch(() => {});
  await p.waitForTimeout(800);
  await p.evaluate(() => document.querySelectorAll('.win:not(.hidden)').forEach(x => UI.close(x.id)));
  await p.waitForTimeout(3500); // ป้ายชื่อแผนที่ตอนเข้าเกมหายก่อน
  return { ctx, p };
}

// ป้ายชื่อแผนที่: วัดค่าจริงหลังเปลี่ยนแผนที่
const BANNER = () => {
  const b = document.getElementById('map-banner'), en = b.querySelector('.mb-en'), th = b.querySelector('.mb-th');
  const cs = getComputedStyle(b), r = b.getBoundingClientRect();
  return { en: parseFloat(getComputedStyle(en).fontSize), th: parseFloat(getComputedStyle(th).fontSize), top: r.top, bottom: r.bottom, w: r.width, h: r.height,
    bgImg: cs.backgroundImage, bgCol: cs.backgroundColor, shadow: cs.boxShadow, border: cs.borderTopWidth, pe: cs.pointerEvents, anim: cs.animationDuration,
    ls: [en, th].map(e => getComputedStyle(e).letterSpacing), lh: parseFloat(getComputedStyle(th).lineHeight) / parseFloat(getComputedStyle(th).fontSize),
    until: UI._bannerUntil - performance.now(), W: innerWidth, H: innerHeight, txt: en.textContent };
};

async function bannerSuite(browser, url, errors, tag, w, h, mobile) {
  const { ctx, p } = await boot(browser, url, w, h, mobile, errors, tag);
  await p.evaluate(() => { const t = G.player.map === 'meadow' ? 'mistlake' : 'meadow'; changeMap(t, 28.5, 28.5); });
  await p.waitForTimeout(500);
  const b = await p.evaluate(BANNER);
  const phone = w < 761;
  ok(`${tag}: ชื่อแผนที่ขึ้นแล้ว`, b.txt.length > 0, b.txt);
  ok(`${tag}: ฟอนต์ชื่อ ${phone ? '17-20px' : '17-30px'}`, b.en <= (phone ? 20 : 30) && b.en >= 17, b);
  ok(`${tag}: บรรทัดไทย >= 13px / line-height >= 1.5`, b.th >= 13 && b.lh >= 1.5, { th: b.th, lh: b.lh });
  ok(`${tag}: ไม่มีแผ่นป้าย (ไม่มีพื้น/ภาพ/เงากรอบ/ขอบ)`, b.bgImg === 'none' && /rgba\(0, 0, 0, 0\)|transparent/.test(b.bgCol) && b.shadow === 'none' && b.border === '0px', b);
  ok(`${tag}: ไม่ถ่างตัวอักษร`, b.ls.every(x => x === 'normal' || parseFloat(x) === 0), b.ls.join(','));
  ok(`${tag}: pointer-events none`, b.pe === 'none');
  ok(`${tag}: เล็กและอยู่สูง (สูง <= 80px มือถือ / 110px คอม, ขอบบน <= 25% ของจอ)`, b.h <= (phone ? 80 : 110) && b.top <= b.H * 0.25 && b.bottom < b.H * 0.35 && b.w <= b.W * 0.9, { top: b.top, h: b.h, w: b.w });
  ok(`${tag}: ระยะเวลา <= 2.5 วิ (animation ${b.anim}, _bannerUntil เหลือ ${Math.round(b.until)}ms)`, parseFloat(b.anim) <= 2.9 && b.until <= 2600);
  // ประกาศที่มาตอนป้ายยังอยู่ -> ต้องรอแล้วขึ้นทีหลัง (ไม่หาย)
  await p.evaluate(() => { UI.announceMap(G.map); UI.announce('QUEUED-ANN'); });
  const early = await p.evaluate(() => document.getElementById('announce').textContent);
  ok(`${tag}: ประกาศที่มาตอนป้ายอยู่ ยังไม่ขึ้นทับ`, early !== 'QUEUED-ANN', early);
  const shown = await p.waitForFunction(() => document.getElementById('announce').textContent === 'QUEUED-ANN' && document.getElementById('announce').classList.contains('show'), null, { timeout: 5000 }).then(() => true).catch(() => false);
  ok(`${tag}: ประกาศที่รอคิวขึ้นหลังป้ายหาย (ภายใน 5 วิ)`, shown);
  await p.evaluate(() => { document.getElementById('announce').classList.remove('show'); UI.announceMap(G.map); });
  await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(SHOTS, `${tag}.png`) });
  await ctx.close();
}

// ป้ายสอนคุย NPC: ดักการเรียก R.name(kind='hint') ที่ข้อความเป็นป้ายคุย
const SPY = () => {
  window.__hints = 0;
  if (!R.__spied) { R.__spied = 1; const o = R.name; R.name = function (g, x, y, text, kind, op) { if (kind === 'hint' && /คุย|talk/i.test(text)) window.__hints++; return o.apply(this, arguments); }; }
};
async function hintAt(p, n, ms = 500) {
  await p.evaluate(({ x, y }) => { window.__hints = 0; G.player.x = x; G.player.y = y; G.player.dead = 0; }, { x: n.x + 0.5, y: n.y + 1.6 });
  await p.waitForTimeout(ms);
  return p.evaluate(() => window.__hints);
}

async function tutSuite(browser, url, errors) {
  const { ctx, p } = await boot(browser, url, 390, 844, true, errors, 'tut');
  await p.evaluate(SPY);
  const info = await p.evaluate(() => {
    const q = Quest.current(), qn = q && q.obj && (q.obj.type === 'talk' || q.obj.type === 'event' || q.obj.type === 'job') ? q.obj.npc : null;
    return { map: G.map.id, qn, npcs: G.npcs.map(n => ({ id: n.id, x: n.x, y: n.y })) };
  });
  const plain = info.npcs.find(n => n.id !== info.qn);
  const quest = info.npcs.find(n => n.id === info.qn);
  ok('tut: เจอ NPC ธรรมดาในแมพเริ่ม', !!plain, info);
  if (!plain) { await ctx.close(); return; }
  // 1) ตัวละครใหม่ ยังไม่เคยคุย -> ป้ายขึ้นที่ NPC ธรรมดา
  const h1 = await hintAt(p, plain);
  ok('tut: ตัวละครใหม่ ยังไม่เคยคุย -> ป้ายสอนขึ้นที่ NPC ธรรมดา', h1 > 0, { h1, npc: plain.id });
  // 2) NPC ของเควสต์ -> ไม่ขึ้น
  if (quest) {
    await p.evaluate(() => { delete G.player.options.npcHintSeen; delete G.player.options.npcTalked; R._hintAcc = 0; });
    const hq = await hintAt(p, quest);
    ok('tut: ที่ NPC ของเควสต์ -> ไม่ขึ้นป้ายสอนทั่วไป', hq === 0, { hq, npc: quest.id });
    // 3) กำลังคุยเควสต์ (กล่องบทสนทนาเปิด) -> ไม่ขึ้น และไม่มีข้อความสอนในกล่อง
    await p.evaluate(() => { const n = G.npcs.find(x => x.id === Quest.current().obj.npc); window.__hints = 0; NPC.talk(n); });
    await p.waitForTimeout(700);
    const dlg = await p.evaluate(() => ({ open: UI.isOpen('w-dialog'), hints: window.__hints, txt: (document.getElementById('w-dialog') || {}).innerText || '' }));
    ok('tut: ระหว่างคุยเควสต์ ไม่มีป้ายสอนกดคุย และกล่องไม่มีข้อความสอน', dlg.hints === 0 && !/แตะปุ่มโจมตีเพื่อคุย|Space · คุย/.test(dlg.txt), { open: dlg.open, hints: dlg.hints });
    await p.evaluate(() => { NPC.busy = false; UI.dlgClose(); UI.close('w-dialog'); UI.illust(null); });
  }
  // 4) คุยสำเร็จแล้ว -> ไม่ขึ้นอีกที่ NPC ธรรมดา
  if (!(await p.evaluate(() => !!G.player.options.npcTalked))) {
    await p.evaluate(id => { const n = G.npcs.find(x => x.id === id); NPC.talk(n); }, plain.id);
    await p.waitForTimeout(300);
  }
  await p.evaluate(() => { NPC.busy = false; UI.dlgClose(); UI.close('w-dialog'); UI.illust(null); });
  ok('tut: คุย NPC แล้ว -> options.npcTalked ถูกตั้ง (เก็บในเซฟ)', await p.evaluate(() => G.player.options.npcTalked === 1));
  const h2 = await hintAt(p, plain, 600);
  ok('tut: เคยคุยแล้ว -> ป้ายสอนไม่ขึ้นอีก', h2 === 0, { h2 });
  // 5) ตัวละครใหม่อีกตัว: โชว์สะสมเกินโควตา 6 วิ -> ตั้ง npcHintSeen แล้วไม่ขึ้นอีก (ครั้งเดียวต่อตัวละคร)
  await p.evaluate(() => { delete G.player.options.npcTalked; delete G.player.options.npcHintSeen; R._hintAcc = 5800; R._hintLast = 0; });
  const h3 = await hintAt(p, plain, 900);
  const seen = await p.evaluate(() => G.player.options.npcHintSeen);
  ok('tut: โชว์เกินโควตา 6 วิ -> ตั้ง npcHintSeen และหยุดขึ้น', seen === 1, { h3, seen });
  const h4 = await hintAt(p, plain, 500);
  ok('tut: หลัง npcHintSeen -> ไม่ขึ้นอีก', h4 === 0, { h4 });
  await ctx.close();
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const srv = await serve();
  const url = `http://localhost:${srv.address().port}/index.html`;
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  const browser = await chromium.launch(opts);
  const errors = [];
  await bannerSuite(browser, url, errors, 'phone-390x844', 390, 844, true);
  await bannerSuite(browser, url, errors, 'pc-1600x900', 1600, 900, false);
  await bannerSuite(browser, url, errors, 'land-844x390', 844, 390, true);
  await tutSuite(browser, url, errors);
  ok('ไม่มี JS error', !errors.length, errors.join(' | '));
  await browser.close(); srv.close();
  let bad = 0;
  for (const [n, c, i] of checks) { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '   ' + i}`); if (!c) bad++; }
  console.log(`\n${checks.length - bad}/${checks.length} passed  (screenshots: ${SHOTS})`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
