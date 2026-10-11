'use strict';
// ============================================================
//  ทดสอบตลาดกลาง (js/market.js): 3 แท็บคุยกันผ่าน Supabase ปลอม (tests/fake_supabase.js — BroadcastChannel ในเครื่อง)
//  ไม่แตะ Supabase จริง (คำขอไป *.supabase.co / .in ถูกบล็อกและนับ — ต้องเป็น 0)
//  ครอบคลุม: วางขายจากแผนที่นอกเมืองระหว่างเดิน + AUTO (ไม่นั่ง ไม่มีป้าย) • ของเข้า escrow + เซฟทันที
//  • ผู้ซื้ออยู่อีกแผนที่ เห็นของ + สถานะออนไลน์ + ค้น/กรอง/เรียง • ซื้อผ่านกล่องยืนยัน (ราคารวม / Volt หลังซื้อ)
//  • ผู้ขายได้แจ้งเตือน (toast + แชท) + ประวัติการขาย • tid ซ้ำไม่ขายซ้ำ • Volt ไม่พอ • ผู้ซื้อ 2 คนแย่งชิ้นสุดท้าย (ยอดรวม Volt/ของคงที่)
//  • แก้ราคา = คำขอราคาเก่าถูกปฏิเสธ คืนเงิน • ผู้ขายหายกลางการซื้อ = คืนเงิน แล้วคำตอบ ok ที่มาช้าส่งของ+หักเงินครั้งเดียว
//  • ยกเลิก = ของคืน (อาวุธตีบวก+ชิป uid เดิม) • ออกจากเกม = หายจากตลาด ของยังพักในเซฟ → ล็อกอินใหม่กลับมาขายต่อ
//  • เซฟแผงขายแบบเก่า (p.vend มี title/map/x/y + นั่งอยู่) ย้ายเป็นรายการตลาดกลางเอง
//  • กติกาหน้าตา จอมือถือ 390×844 + PC 1600×900: ไม่ล้นแนวนอน ตัวหนังสือ ≥ 13px ปุ่ม ≥ 40px มุมมน ≤ 8px ไม่ถ่างตัวอักษร
//  • ผู้ขายปิดแท็บ = หายจากตลาดทันที • โหมดออฟไลน์ = ข้อความ "ต้องออนไลน์"
//  รัน:  NODE_PATH=$(npm root -g) node tests/market.js   (CHROME=/path/to/chrome ได้ • SHOTS=โฟลเดอร์ = เก็บภาพ)
// ============================================================
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const FAKE = path.join(__dirname, 'fake_supabase.js');
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

const SHOTS = process.env.SHOTS;
const shot = async (P, name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await P.screenshot({ path: path.join(SHOTS, name + '.png'), timeout: 60000 }).catch(e => console.log('  (ภาพ ' + name + ' ไม่สำเร็จ: ' + e.message.split(String.fromCharCode(10))[0] + ')')); } };
let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) { pass++; console.log('✔', name, info !== undefined ? ` (${typeof info === 'string' ? info : JSON.stringify(info)})` : ''); } else { fail++; console.log('✘', name, info !== undefined ? ` (${typeof info === 'string' ? info : JSON.stringify(info)})` : ''); } };
// คลิก/พิมพ์ผ่าน DOM ตรง ๆ (3 แท็บรันเกมพร้อมกัน — คลิกแบบ Playwright รอเฟรมจนหมดเวลาบนเครื่องที่โหลดหนัก)
const tap = (P, sel) => P.evaluate(s => { const el = document.querySelector(s); if (!el) throw new Error('no ' + s); el.click(); }, sel);
const fillIn = (P, sel, v) => P.evaluate(([s, v]) => { const el = document.querySelector(s); if (!el) throw new Error('no ' + s); el.focus(); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, [sel, v]);
const until = (P, fn, arg, timeout = 15000) => P.waitForFunction(fn, arg, { timeout, polling: 50 }).then(() => true, () => false);
const log = P => P.evaluate(() => [...document.querySelectorAll('#chat-log .cl')].map(e => e.textContent).join('\n'));
const bag = P => P.evaluate(() => ({
  zeny: G.player.zeny, red: countItem('red_potion'), apple: countItem('apple'),
  cutters: G.player.inventory.filter(e => e.id === 'cutter').map(e => ({ uid: e.uid, refine: e.refine, cards: e.cards })),
}));
const listed = (P, id) => P.evaluate(id => (G.player.vend ? G.player.vend.items.filter(x => x.qty > 0 && (!id || x.id === id)).reduce((a, x) => a + x.qty, 0) : 0), id);
let realHits = 0;
async function guard(ctx) {
  await ctx.route(/supabase\.(co|in)\b/, r => { realHits++; r.abort(); });
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
}
async function intoGame(p) {
  await p.waitForFunction(() => G.started, null, { timeout: 60000 });
  await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {});
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 8000, polling: 250 }).catch(() => {});
  await p.evaluate(() => document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden')));
  await p.evaluate(() => {
    window.__cz = d => (d && Array.isArray(d.chars) ? (d.chars[d.active] || {}).zeny : d && d.zeny);
    window.__saves = []; const q = Online.queueSave.bind(Online); Online.queueSave = (d, imm) => { window.__saves.push({ zeny: __cz(d), imm: !!imm }); return q(d, imm); };
  });
}
function watch(p) {
  p.errs = [];
  p.on('pageerror', e => p.errs.push(e.stack.split('\n').slice(0, 3).join(' | ')));
  p.on('console', m => { if (/^market /.test(m.text())) p.errs.push(m.text()); }); // ข้อผิดพลาดที่ Market.tick/onMsg จับไว้
}
async function player(ctx, base, user, name, viewport) {
  const p = await ctx.newPage(); watch(p);
  if (viewport) await p.setViewportSize(viewport);
  await p.goto(base);
  await p.waitForFunction(() => typeof Online !== 'undefined' && !document.querySelector('#auth').classList.contains('hidden'), null, { timeout: 60000 });
  await p.click('#au-tabs [data-mode="register"]');
  await p.fill('#au-user', user); await p.fill('#au-pass', 'pass1234'); await p.fill('#au-pass2', 'pass1234'); await p.click('#au-submit');
  await p.waitForSelector('#cr-name', { state: 'visible', timeout: 30000 });
  await p.fill('#cr-name', name); await p.click('#cr-start');
  await intoGame(p);
  return p;
}
// ล็อกอินบัญชีเดิมในแท็บใหม่ (= ผู้เล่นกลับเข้าเกมภายหลัง)
async function relogin(ctx, base, user, viewport) {
  const p = await ctx.newPage(); watch(p);
  if (viewport) await p.setViewportSize(viewport);
  await p.goto(base);
  await p.waitForFunction(() => typeof Online !== 'undefined' && !document.querySelector('#auth').classList.contains('hidden'), null, { timeout: 60000 });
  await p.click('#au-tabs [data-mode="login"]');
  await p.fill('#au-user', user); await p.fill('#au-pass', 'pass1234'); await p.click('#au-submit');
  await p.waitForSelector('#btn-continue', { state: 'visible', timeout: 120000 });
  await p.click('#btn-continue');
  await intoGame(p);
  return p;
}
// กติกาหน้าตาของเจ้าของ: วัดจากหน้าจอจริง (เฉพาะสิ่งที่มองเห็นในหน้าต่างตลาด)
const uiRules = P => P.evaluate(() => {
  const w = document.querySelector('#w-market'), body = w.querySelector('.win-body'), r = w.getBoundingClientRect();
  const vis = el => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const all = [...w.querySelectorAll('.win-body *')].filter(vis);
  const small = [], short = [], round = [], spaced = [];
  for (const el of all) {
    const cs = getComputedStyle(el);
    const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (hasText && parseFloat(cs.fontSize) < 13) small.push(`${el.className || el.tagName}:${cs.fontSize}`);
    if (/^(BUTTON|INPUT|SELECT)$/.test(el.tagName) && !el.classList.contains('mk-icell') && el.getBoundingClientRect().height < 39.5) short.push(`${el.className || el.tagName}:${Math.round(el.getBoundingClientRect().height)}`);
    if (el.classList.contains('mk-icell') && el.getBoundingClientRect().height < 39.5) short.push(`icell:${Math.round(el.getBoundingClientRect().height)}`);
    for (const k of ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius']) if (parseFloat(cs[k]) > 8) { round.push(`${el.className || el.tagName}:${cs[k]}`); break; }
    if (hasText && cs.letterSpacing !== 'normal' && parseFloat(cs.letterSpacing) !== 0) spaced.push(`${el.className || el.tagName}:${cs.letterSpacing}`);
  }
  return { l: Math.round(r.left), r: Math.round(r.right), vw: innerWidth, sw: body.scrollWidth, cw: body.clientWidth, doc: document.documentElement.scrollWidth,
    small: [...new Set(small)].slice(0, 6), short: [...new Set(short)].slice(0, 6), round: [...new Set(round)].slice(0, 6), spaced: [...new Set(spaced)].slice(0, 6), n: all.length };
});
const rulesOk = u => u.l >= 0 && u.r <= u.vw + 0.5 && u.sw <= u.cw + 1 && u.doc <= u.vw && !u.small.length && !u.short.length && !u.round.length && !u.spaced.length;

(async () => {
  const srv = await serve();
  const BASE = `http://localhost:${srv.address().port}/index.html`;
  const opts = { headless: true, args: ['--disable-features=IntensiveWakeUpThrottling'] };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  else if (fs.existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium';
  let b;
  try { b = await chromium.launch(opts); } catch (e) { b = await chromium.launch({ headless: true }); }
  const ctx = await b.newContext({ viewport: { width: 1100, height: 700 } });
  await ctx.addInitScript({ path: FAKE });
  await guard(ctx);
  await ctx.route(/fake\.supabase\.test\/auth\/v1\/settings/, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"mailer_autoconfirm":true}' }));

  const sfx = Date.now().toString(36).slice(-4), aUser = 'alice_' + sfx;
  let A = await player(ctx, BASE, aUser, 'Alice');
  const B = await player(ctx, BASE, 'bob_' + sfx, 'Bobby');
  const C = await player(ctx, BASE, 'carol_' + sfx, 'Carol', { width: 390, height: 844 });
  ok('ออนไลน์ทั้ง 3 คน (Supabase ปลอม)', (await Promise.all([A, B, C].map(P => P.evaluate(() => Online.online && window.__FAKE_SUPABASE__)))).every(Boolean));
  ok('มีปุ่มตลาดในเมนู + หัวหน้าต่าง "ตลาดกลาง"', await A.evaluate(() => !!document.querySelector('#menubar [data-win="w-market"]') && /ตลาดกลาง/.test(document.querySelector('#w-market .win-title').textContent)));
  ok('เซฟมีช่อง vend + mkSales', await A.evaluate(() => SAVE_FIELDS.includes('vend') && SAVE_FIELDS.includes('mkSales')));
  ok('ระบบแผงขายแบบเก่าถูกถอด (ไม่มีป้าย/คลิกแผง/เงื่อนไขในเมือง)', await A.evaluate(() => typeof Market.drawSign === 'undefined' && typeof Market.signFor === 'undefined' && typeof Market.onClick === 'undefined' && typeof Market.inTown === 'undefined' && MARKET_CFG.moveLimit === undefined));
  const aId = await A.evaluate(() => Online.user.id);

  // ของตั้งต้น: A มี Repair Kit 10, Oil Can 5, Cutter +7 ใส่ชิป • B/C มี Volt 5000
  await A.evaluate(() => {
    const p = G.player; p.zeny = 1000; p.inventory = p.inventory.filter(e => !['red_potion', 'apple', 'cutter'].includes(e.id));
    addItem('red_potion', 10, true); addItem('apple', 5, true); addItem('cutter', 1, true);
    const c = p.inventory.find(e => e.id === 'cutter'); c.refine = 7; c.cards = ['mosspud_card'];
  });
  for (const P of [B, C]) await P.evaluate(() => { const p = G.player; p.zeny = 5000; p.inventory = p.inventory.filter(e => !['red_potion', 'apple', 'cutter'].includes(e.id)); });
  const a0 = await bag(A), cutUid = a0.cutters[0].uid;

  // ---------- 1) วางขายจากแผนที่นอกเมือง ระหว่างเดิน + AUTO ----------
  await A.evaluate(() => { changeMap('meadow', 30.5, 30.5, { quiet: true }); });
  ok('A อยู่ทุ่งหญ้า (ไม่ใช่เมือง)', await A.evaluate(() => G.map.id === 'meadow' && G.map.def.kind !== 'town'));
  await A.evaluate(() => { const p = G.player, t = G.map.nearestWalkable(p.x + 25, p.y + 6); playerWalkTo(Math.floor(t.x), Math.floor(t.y)); window.__x0 = p.x; });
  ok('A กำลังเดิน', await until(A, () => G.player.path.length > 0 && Math.abs(G.player.x - window.__x0) > 0.3, null, 8000));
  await tap(A, '#menubar [data-win="w-market"]');
  await until(A, () => !document.querySelector('#w-market').classList.contains('hidden'));
  await tap(A, '#w-market .mk-tab[data-tab="sell"]');
  ok('แท็บขาย: บอก "ขายได้ขณะคุณออนไลน์"', await until(A, () => /ขายได้ขณะคุณออนไลน์/.test(document.querySelector('#w-market .mk-state').textContent)));
  const addLine = async (id, qty, price) => {
    await tap(A, `#w-market .mk-icell[data-id="${id}"]`);
    if (qty != null) await fillIn(A, '#w-market .mk-pq', String(qty));
    await fillIn(A, '#w-market .mk-pp', String(price));
    await tap(A, '#w-market .mk-add');
  };
  await addLine('red_potion', 5, 100);
  const walking = await A.evaluate(() => ({ path: G.player.path.length, sit: G.player.sitting, map: G.map.id }));
  ok('วางขายระหว่างเดิน: ยังเดินต่อ ไม่นั่ง อยู่แผนที่เดิม', walking.path > 0 && !walking.sit && walking.map === 'meadow', walking);
  await A.evaluate(() => { Bot.unlocked = () => true; G.player.hp = G.player.d.maxHp; G.player.sp = G.player.d.maxSp; Bot.toggle(true); });
  ok('เปิด AUTO แล้ว', await A.evaluate(() => Bot.on));
  await addLine('cutter', null, 2000);
  await addLine('apple', 1, 50);
  ok('วางขายระหว่าง AUTO: AUTO ยังเปิดอยู่ ไม่ถูกสั่งนั่ง', await A.evaluate(() => Bot.on && (!G.player.sitting || Bot.resting)), await A.evaluate(() => ({ on: Bot.on, sit: G.player.sitting, rest: Bot.resting })));
  await A.evaluate(() => Bot.toggle(false));
  ok('วางขาย 3 รายการ', await A.evaluate(() => Market.mine && Market.mine.items.filter(x => x.qty > 0).length === 3), await A.evaluate(() => Market.mine && Market.mine.items));
  const a1 = await bag(A);
  ok('ของย้ายเข้า escrow (Repair Kit −5, Oil Can −1, Cutter ออกจากกระเป๋า)', a1.red === a0.red - 5 && a1.apple === a0.apple - 1 && a1.cutters.length === 0, a1);
  ok('escrow อยู่ในเซฟ (saveData().vend) + เซฟทันที', await A.evaluate(() => { const v = saveData().vend; return !!v && v.items.length === 3 && v.items.find(x => x.id === 'cutter').refine === 7 && window.__saves.some(s => s.imm); }));
  ok('วางชนิดเดิมราคาเดิมซ้ำ = รวมเป็นรายการเดียว', await A.evaluate(() => { const e = G.player.inventory.find(y => y.id === 'red_potion'); Market.list(e, 1, 100); Market.list(e, 1, 100); const r = Market.mine.items.filter(x => x.id === 'red_potion'); return r.length === 1 && r[0].qty === 7; }));
  await A.evaluate(() => { const x = Market.mine.items.find(y => y.id === 'red_potion'); x.qty -= 2; addItem('red_potion', 2, true); Market.announce(true); }); // คืนสภาพ 5 ชิ้นเพื่อขั้นต่อไป
  ok('วางขายเกิน 12 รายการไม่ได้', await A.evaluate(() => { const old = MARKET_CFG.slots; MARKET_CFG.slots = 3; const e = G.player.inventory.find(y => y.id === 'apple'); const r = Market.list(e, 1, 77); MARKET_CFG.slots = old; return r === false && Market.mine.items.length === 3; }));
  await shot(A, 'a_sell_1100');

  // ---------- 2) ผู้ซื้ออยู่อีกแผนที่ เห็นของทั้งหมด ----------
  await B.evaluate(() => { changeMap('mistlake', 30.5, 30.5, { quiet: true }); });
  ok('B เห็นรายการของ A (คนละแผนที่)', await until(B, id => { const s = Market.stalls.get(id); return s && s.items.length === 3 && s.map === 'meadow'; }, aId), await B.evaluate(id => Market.stalls.get(id), aId));
  await B.evaluate(() => Market.show('buy'));
  ok('แท็บซื้อ 3 แถว: ชื่อผู้ขาย + ออนไลน์ + แผนที่ + ราคา', await until(B, () => {
    const rows = [...document.querySelectorAll('#w-market .mk-pickrow')];
    return rows.length === 3 && rows.every(r => /Alice/.test(r.textContent) && /ออนไลน์/.test(r.textContent) && r.textContent.includes(MAP_DEFS.meadow.name)) && /2,000|2000/.test(rows.map(r => r.textContent).join(' '));
  }), await B.evaluate(() => [...document.querySelectorAll('#w-market .mk-row')].map(r => r.textContent).join(' | ')));
  const order = () => B.evaluate(() => [...document.querySelectorAll('#w-market .mk-pickrow')].map(r => r.dataset.id).join());
  ok('เรียงราคาต่ำ → สูง', (await order()) === 'apple,red_potion,cutter', await order());
  await fillIn(B, '#w-market .mk-sort', 'price_desc');
  ok('เรียงราคาสูง → ต่ำ', await until(B, () => [...document.querySelectorAll('#w-market .mk-pickrow')].map(r => r.dataset.id).join() === 'cutter,red_potion,apple'));
  await fillIn(B, '#w-market .mk-sort', 'name');
  ok('เรียงตามชื่อไอเทม', await until(B, () => { const n = [...document.querySelectorAll('#w-market .mk-pickrow')].map(r => ITEMS[r.dataset.id].name); return n.length === 3 && n.join() === n.slice().sort((a, b) => a.localeCompare(b)).join(); }));
  await fillIn(B, '#w-market .mk-sort', 'price');
  await fillIn(B, '#w-market .mk-q', 'cutt');
  ok('ค้นหาชื่อไอเทม', await until(B, () => { const r = [...document.querySelectorAll('#w-market .mk-pickrow')]; return r.length === 1 && r[0].dataset.id === 'cutter'; }));
  await fillIn(B, '#w-market .mk-q', 'alice');
  ok('ค้นหาชื่อผู้ขาย', await until(B, () => document.querySelectorAll('#w-market .mk-pickrow').length === 3));
  await fillIn(B, '#w-market .mk-q', '');
  await fillIn(B, '#w-market .mk-type', 'use');
  ok('กรองชนิด (ของใช้)', await until(B, () => { const r = [...document.querySelectorAll('#w-market .mk-pickrow')].map(x => x.dataset.id); return r.length >= 1 && !r.includes('cutter'); }));
  await fillIn(B, '#w-market .mk-type', 'all');
  ok('ไม่มีปุ่ม "ไปที่ร้าน" (ไม่ต้องเดินไปหา)', await B.evaluate(() => !document.querySelector('#w-market .mk-go')));

  // ---------- 3) ซื้อ: แตะ → กล่องยืนยัน (ราคารวม / Volt หลังซื้อ) → ยืนยัน ----------
  const b0 = await bag(B), az0 = (await bag(A)).zeny;
  await tap(B, '#w-market .mk-pickrow[data-id="red_potion"]');
  ok('แตะแถว = กล่องยืนยันซื้อ', await until(B, () => !!document.querySelector('#w-market .mk-buybox .mk-buy')));
  await fillIn(B, '#w-market .mk-buybox .mk-n', '3');
  const box = await B.evaluate(() => ({ total: document.querySelector('.mk-bb-total').textContent, after: document.querySelector('.mk-bb-after').textContent }));
  ok('กล่องยืนยัน: ราคารวม 300 + Volt หลังซื้อ 4,700', /300/.test(box.total) && /4,700|4700/.test(box.after), box);
  await shot(B, 'b_buy_confirm');
  await tap(B, '#w-market .mk-buybox .mk-buy');
  ok('ซื้อสำเร็จ', await until(B, () => !Market.pend && countItem('red_potion') === 3, null, 9000));
  await B.waitForTimeout(800);
  const b1 = await bag(B), a2 = await bag(A);
  ok('B: Volt −300 / Repair Kit +3', b1.zeny === b0.zeny - 300 && b1.red === b0.red + 3, { b0, b1 });
  ok('A: Volt +300 (ภาษี 0) / เหลือขาย 2', a2.zeny === az0 + 300 && await listed(A, 'red_potion') === 2, a2.zeny);
  ok('ทั้งคู่เซฟทันทีหลังซื้อขาย', await A.evaluate(z => window.__saves.some(s => s.imm && s.zeny === z), a2.zeny) && await B.evaluate(z => window.__saves.some(s => s.imm && s.zeny === z), b1.zeny));
  ok('ตลาดของ B อัปเดตจำนวนคงเหลือ', await until(B, id => Market.stalls.get(id).items.find(x => x.id === 'red_potion').qty === 2, aId));
  ok('แชทแจ้งทั้งสองฝั่ง', /ซื้อ Repair Kit[^×]* ×3 จาก Alice สำเร็จ/.test(await log(B)) && /ขาย Repair Kit[^×]* ×3 ให้ Bobby/.test(await log(A)), (await log(B)).split('\n').slice(-2).join(' / '));
  ok('ผู้ขายได้ toast แจ้งขาย', await A.evaluate(() => { const t = document.querySelector('#mk-toast'); return !!t && t.classList.contains('show') && /Bobby/.test(t.textContent); }));
  await shot(A, 'a_toast');
  ok('ประวัติการขายในเซฟ + แท็บขาย', await A.evaluate(() => { const s = saveData().mkSales; Market.show('sell'); return s.length === 1 && s[0].who === 'Bobby' && s[0].qty === 3 && s[0].gain === 300 && /Bobby ซื้อ Repair Kit/.test(document.querySelector('#w-market .mk-log').textContent); }));

  // ส่งคำขอซื้อซ้ำด้วย tid เดิม → ผู้ขายตอบเหมือนเดิม ไม่หักของ/ไม่รับเงินซ้ำ
  const replay = await B.evaluate(id => {
    const s = Market.stalls.get(id), x = s.items.find(y => y.id === 'red_potion'), tid = 'replay' + Date.now();
    const pk = { k: 'buy', to: id, tid, sid: s.sid, i: x.i, qty: 1, price: x.price, hash: Market.lineHash(s.sid, x), name: G.player.name };
    Market.send(pk); Market.send(pk); Market.send(pk);
    return tid;
  }, aId);
  await A.waitForTimeout(1200);
  ok('คำขอ tid เดิม 3 ครั้ง ขายครั้งเดียว', await listed(A, 'red_potion') === 1, replay);
  ok('ผู้ซื้อไม่ได้ของ/ไม่เสียเงินจากคำตอบที่ไม่ได้รอ', (await bag(B)).red === b1.red && (await bag(B)).zeny === b1.zeny);
  const a3 = await bag(A);
  ok('ผู้ขายรับเงินจากคำขอเล่นซ้ำครั้งเดียว (+100)', a3.zeny === a2.zeny + 100, a3.zeny);
  ok('ประวัติการขายเก็บสูงสุด 20', await A.evaluate(() => { const keep = G.player.mkSales; G.player.mkSales = Array.from({ length: 25 }, () => ({ who: 'x', id: 'apple', qty: 1, gain: 1, at: 0 }));
      const x = Market.mine.items.find(y => y.id === 'red_potion'); x.qty += 1; Market.onBuy({ from: 'zz', tid: 'cap2' + Date.now(), sid: Market.mine.sid, i: x.i, qty: 1, price: x.price, hash: Market.lineHash(Market.mine.sid, x), name: 'Cap' });
      const n = G.player.mkSales.length, top = G.player.mkSales[0].who; G.player.zeny -= x.price; G.player.mkSales = keep; return n === 20 && top === 'Cap'; }));

  // ---------- 4) Volt ไม่พอ ----------
  await C.evaluate(() => { G.player.zeny = 100; });
  ok('C เห็นรายการของ A', await until(C, id => !!Market.stalls.get(id), aId));
  await C.evaluate(() => Market.show('buy'));
  await until(C, () => !!document.querySelector('#w-market .mk-pickrow[data-id="cutter"]'));
  await tap(C, '#w-market .mk-pickrow[data-id="cutter"]');
  ok('Volt ไม่พอ: ปุ่มยืนยันปิด + บอกยอดที่ขาด', await until(C, () => { const b = document.querySelector('#w-market .mk-buybox .mk-buy'); return b && b.disabled && /ไม่พอ/.test(document.querySelector('.mk-bb-after').textContent); }));
  const poor = await C.evaluate(id => { const s = Market.stalls.get(id), x = s.items.find(y => y.id === 'cutter'); const r = Market.buy(id, x.i, 1); return { r, pend: !!Market.pend, zeny: G.player.zeny }; }, aId);
  ok('Volt ไม่พอ → ไม่ส่งคำขอ ไม่หักเงิน', poor.r === false && !poor.pend && poor.zeny === 100, poor);
  await shot(C, 'c_buy_poor_390');

  // ---------- 5) ผู้ซื้อ 2 คนแย่งชิ้นสุดท้าย — ยอดรวม Volt/ของต้องคงที่ ----------
  await C.evaluate(() => { G.player.zeny = 5000; });
  const tot = async () => { const [x, y, z] = await Promise.all([bag(A), bag(B), bag(C)]); return { zeny: x.zeny + y.zeny + z.zeny, apple: x.apple + y.apple + z.apple + await listed(A, 'apple') }; };
  const t0 = await tot();
  const bz = (await bag(B)).zeny, cz = (await bag(C)).zeny, az = (await bag(A)).zeny;
  const iApple = await A.evaluate(() => Market.mine.items.find(x => x.id === 'apple').i);
  const [rb, rc] = await Promise.all([B.evaluate(([id, i]) => Market.buy(id, i, 1), [aId, iApple]), C.evaluate(([id, i]) => Market.buy(id, i, 1), [aId, iApple])]);
  ok('ทั้งสองส่งคำขอได้ (กันเงินไว้)', rb && rc);
  await until(B, () => !Market.pend, null, 10000); await until(C, () => !Market.pend, null, 10000);
  await B.waitForTimeout(600);
  const rB = await bag(B), rC = await bag(C), rA = await bag(A);
  ok('ได้ของคนเดียว', [rB.apple === 1, rC.apple === 1].filter(Boolean).length === 1, { B: rB.apple, C: rC.apple });
  ok('คนชนะเสีย 50 / คนแพ้ได้เงินคืนครบ', (rB.apple === 1 ? rB.zeny === bz - 50 && rC.zeny === cz : rC.zeny === cz - 50 && rB.zeny === bz), { bz, cz, b: rB.zeny, c: rC.zeny });
  ok('ผู้ขายรับเงินครั้งเดียว (+50) Oil Can หมด', rA.zeny === az + 50 && await listed(A, 'apple') === 0, rA.zeny - az);
  const t1 = await tot();
  ok('ยอดรวม Volt และ Oil Can ทั้ง 3 คนเท่าเดิม (ไม่มีของ/เงินงอก)', t1.zeny === t0.zeny && t1.apple === t0.apple, { t0, t1 });
  ok('คนแพ้ได้ข้อความ "หมดแล้ว"', /ของหมดแล้ว/.test(await log(rB.apple === 1 ? C : B)));

  // ---------- 6) แก้ราคา: คำขอที่เห็นราคาเก่าถูกปฏิเสธ + คืนเงิน ----------
  await B.evaluate(() => { window.__onAd = Market.onAd; Market.onAd = () => {}; }); // B ยังเห็นราคาเก่า
  await A.evaluate(() => Market.show('sell'));
  const iRed = await A.evaluate(() => Market.mine.items.find(x => x.id === 'red_potion' && x.qty > 0).i);
  await fillIn(A, `#w-market .mk-lrow[data-i="${iRed}"] .mk-price`, '120');
  await tap(A, `#w-market .mk-lrow[data-i="${iRed}"] .mk-setp`);
  ok('แก้ราคาจากแท็บขาย', await A.evaluate(i => Market.mine.items.find(x => x.i === i).price === 120, iRed));
  const bz3 = (await bag(B)).zeny;
  await B.evaluate(([id, i]) => Market.buy(id, i, 1), [aId, iRed]);
  ok('ราคาเก่า → "เปลี่ยนราคา" คืนเงินครบ ไม่ได้ของ', await until(B, z => !Market.pend && G.player.zeny === z, bz3, 9000) && /เปลี่ยนราคา/.test(await log(B)) && await listed(A, 'red_potion') === 1);
  await B.evaluate(() => { Market.onAd = window.__onAd; });
  ok('B เห็นราคาใหม่', await until(B, ([id, i]) => (Market.stalls.get(id).items.find(x => x.i === i) || {}).price === 120, [aId, iRed]));

  // ---------- 7) ผู้ขายหายกลางการซื้อ → คืนเงิน • คำตอบ ok มาช้า → ส่งของ + หักเงินครั้งเดียว ----------
  await A.evaluate(() => { window.__ob = Market.onBuy; window.__held = null; Market.onBuy = m => { window.__held = m; }; });
  await B.evaluate(() => { MARKET_CFG.buyWait = 1500; });
  const bz4 = (await bag(B)).zeny, az4 = (await bag(A)).zeny, br4 = (await bag(B)).red;
  await B.evaluate(([id, i]) => Market.buy(id, i, 1), [aId, iRed]);
  ok('กันเงินระหว่างรอ (−120)', (await bag(B)).zeny === bz4 - 120);
  ok('ผู้ขายไม่ตอบ 1.5 วิ → คืนเงิน', await until(B, z => !Market.pend && G.player.zeny === z, bz4, 6000) && /ไม่ตอบ/.test(await log(B)));
  ok('ผู้ขายยังไม่ได้เงิน ของยังอยู่', (await bag(A)).zeny === az4 && await listed(A, 'red_potion') === 1);
  await A.evaluate(() => { Market.onBuy = window.__ob; Market.onBuy(window.__held); }); // ผู้ขายกลับมาตอบช้า
  ok('คำตอบ ok มาช้า: B ได้ของ + เสียเงินครั้งเดียว', await until(B, ([z, r]) => countItem('red_potion') === r + 1 && G.player.zeny === z - 120, [bz4, br4], 6000));
  await B.waitForTimeout(600);
  ok('ยอดตรง: A +120 / B −120 / ของย้าย 1 ชิ้น', (await bag(A)).zeny === az4 + 120 && (await bag(B)).zeny === bz4 - 120 && (await bag(B)).red === br4 + 1 && await listed(A, 'red_potion') === 0);
  await B.evaluate(() => { MARKET_CFG.buyWait = 8000; });

  // ---------- 8) ยกเลิกรายการ → ของคืน ----------
  await A.evaluate(() => Market.show('sell'));
  const iCut = await A.evaluate(() => Market.mine.items.find(x => x.id === 'cutter').i);
  await tap(A, `#w-market .mk-lrow[data-i="${iCut}"] .mk-cancel`);
  const a4 = await bag(A), back = a4.cutters.find(c => c.uid === cutUid);
  ok('ยกเลิก: Cutter +7 พร้อมชิป (uid เดิม) กลับเข้ากระเป๋า', !!back && back.refine === 7 && back.cards.join() === 'mosspud_card', a4);
  ok('ยกเลิกหมดแล้ว p.vend ว่าง + เซฟ', await A.evaluate(() => !Market.live() && !(saveData().vend && saveData().vend.items.some(x => x.qty > 0))));
  ok('รายการหายจากตลาดของ B/C ทันที', await until(B, id => !Market.stalls.has(id), aId, 4000) && await until(C, id => !Market.stalls.has(id), aId, 4000));
  ok('ผู้ขายเลิกแล้วซื้อไม่ได้', await B.evaluate(id => Market.buy(id, 0, 1) === false && !Market.pend, aId));

  // ---------- 9) ออกจากเกม: หายจากตลาด ของยังพักในเซฟ → ล็อกอินใหม่ขายต่อ ----------
  await A.evaluate(() => { const e = G.player.inventory.find(y => y.id === 'red_potion'); Market.list(e, 2, 90); });
  ok('B เห็นรายการใหม่', await until(B, id => (Market.stalls.get(id) || { items: [] }).items.some(x => x.price === 90), aId));
  const redA = (await bag(A)).red;
  ok('escrow อยู่ในเซฟบนเซิร์ฟเวอร์ (ฐานข้อมูลปลอม)', await until(A, u => { const d = JSON.parse(localStorage.getItem('fake_sb_db')), r = d.chars[u]; const c = r && r.data.chars[r.data.active]; return !!(c && c.vend && c.vend.items.some(x => x.price === 90 && x.qty === 2)); }, aId, 8000));
  await A.close({ runBeforeUnload: true });
  ok('ผู้ขายออกจากเกม → หายจากตลาดทันที', await until(B, id => !Market.stalls.has(id), aId, 4000));
  A = await relogin(ctx, BASE, aUser, { width: 1600, height: 900 });
  ok('ล็อกอินใหม่: ของยังวางขายอยู่ ไม่เด้งเข้ากระเป๋า', await until(A, n => !!Market.mine && Market.mine.items.some(x => x.price === 90 && x.qty === 2) && countItem('red_potion') === n, redA, 10000), await A.evaluate(() => ({ v: G.player.vend, red: countItem('red_potion') })));
  ok('ล็อกอินใหม่: ผู้อื่นเห็นรายการกลับมา', await until(B, id => (Market.stalls.get(id) || { items: [] }).items.some(x => x.price === 90), aId, 10000));
  ok('ล็อกอินใหม่: ประวัติการขายยังอยู่', await A.evaluate(() => Array.isArray(G.player.mkSales) && G.player.mkSales.some(s => s.who === 'Bobby')));

  // ---------- 10) เซฟแผงขายแบบเก่า → ย้ายเข้าตลาดกลาง ----------
  const cId = await C.evaluate(() => Online.user.id);
  const mig = await C.evaluate(() => {
    const p = G.player;
    p.inventory = p.inventory.filter(e => !['apple', 'cutter'].includes(e.id));
    const old = { sid: 'oldsid123', title: "Carol's Shop", map: 'eldheim', x: 20.5, y: 24.5, earned: 40, at: Date.now() - 3600e3,
      items: [{ i: 0, id: 'apple', qty: 2, price: 40 }, { i: 0, id: 'cutter', qty: 1, price: 999, uid: 777, refine: 4, cards: [] }, { i: 5, id: 'red_potion', qty: 0, price: 9 }] };
    // ผ่านเส้นทางโหลดเซฟจริง: JSON → loadGameFrom → p.vend
    const loaded = loadGameFrom(JSON.parse(JSON.stringify(Object.assign(saveData(), { vend: old }))));
    p.vend = loaded.vend; p.sitting = true;
    Market.owner = null; // = ตัวละครเพิ่งเข้าเกม
    return { loaded: !!(loaded.vend && loaded.vend.title) };
  });
  ok('เซฟเก่าโหลดได้ (p.vend แบบมีชื่อร้าน)', mig.loaded);
  const mv = await (async () => { await until(C, () => Market.owner === G.player, null, 4000); return C.evaluate(() => ({ v: G.player.vend, sit: G.player.sitting, apple: countItem('apple'), cut: G.player.inventory.filter(e => e.id === 'cutter').length })); })();
  ok('ย้ายเป็นรายการตลาดกลาง: 2 รายการ ช่องไม่ซ้ำ ไม่เด้งเข้ากระเป๋า เลิกนั่ง', mv.v && mv.v.v === 2 && mv.v.items.length === 2 && new Set(mv.v.items.map(x => x.i)).size === 2 && mv.v.sid === 'oldsid123' && mv.v.items.find(x => x.id === 'cutter').uid === 777 && !mv.sit && mv.apple === 0 && mv.cut === 0, mv);
  ok('แจ้งผู้เล่นว่าร้านเดิมย้ายเข้าตลาดกลาง', /ย้ายเข้าตลาดกลาง/.test(await log(C)));
  ok('B เห็นของจากเซฟเก่า', await until(B, id => { const s = Market.stalls.get(id); return s && s.items.length === 2; }, cId));

  // ---------- 11) กติกาหน้าตา: มือถือ 390×844 + PC 1600×900 + ภาพ ----------
  await B.evaluate(() => { G.player.zeny = 5000; });
  await C.evaluate(() => { addItem('red_potion', 4, true); addItem('cutter', 1, true); Market.who = null; Market.show('buy'); });
  await until(C, () => document.querySelectorAll('#w-market .mk-pickrow').length >= 3);
  await C.evaluate(() => { const r = document.querySelector('#w-market .mk-pickrow:not(.mine)'); if (r) r.click(); });
  await C.waitForTimeout(300);
  const ub = await uiRules(C);
  await shot(C, 'market_buy_390');
  ok('มือถือ แท็บซื้อ: ไม่ล้น / ตัวหนังสือ ≥ 13px / ปุ่ม ≥ 40px / มุม ≤ 8px / ไม่ถ่างตัวอักษร', rulesOk(ub), ub);
  await C.evaluate(() => { Market.show('sell'); Market.pick = G.player.inventory.find(e => e.id === 'red_potion'); Market.refresh(true); });
  await C.waitForTimeout(300);
  const us = await uiRules(C);
  await shot(C, 'market_sell_390');
  ok('มือถือ แท็บขาย: ไม่ล้น / ตัวหนังสือ ≥ 13px / ปุ่ม ≥ 40px / มุม ≤ 8px / ไม่ถ่างตัวอักษร', rulesOk(us), us);
  await A.evaluate(() => { G.player.zeny = 3000; Market.show('buy'); });
  await until(A, () => document.querySelectorAll('#w-market .mk-pickrow').length >= 2);
  await A.evaluate(() => { const r = document.querySelector('#w-market .mk-pickrow:not(.mine)'); if (r) r.click(); });
  await A.waitForTimeout(300);
  const pb = await uiRules(A);
  await shot(A, 'market_buy_1600');
  ok('PC แท็บซื้อ: กติกาหน้าตาผ่าน', rulesOk(pb), pb);
  await A.evaluate(() => { Market.show('sell'); Market.pick = G.player.inventory.find(e => e.id === 'red_potion') || null; Market.refresh(true); });
  await A.waitForTimeout(300);
  const ps = await uiRules(A);
  await shot(A, 'market_sell_1600');
  ok('PC แท็บขาย: กติกาหน้าตาผ่าน', rulesOk(ps), ps);
  ok('เปิดจากการ์ดผู้เล่น = แท็บซื้อเฉพาะของคนนั้น', await B.evaluate(id => { Market.openShop(id); const r = [...document.querySelectorAll('#w-market .mk-pickrow')]; return Market.view === 'buy' && Market.who === id && r.length === 2 && r.every(x => x.dataset.seller === id) && !!document.querySelector('#w-market .mk-who'); }, cId));
  ok('/vend เปิดแท็บขาย', await B.evaluate(() => { UI.chat('/vend'); return Market.view === 'sell' && UI.isOpen('w-market'); }));

  // ---------- 12) ผู้ขายปิดแท็บ ----------
  await C.close({ runBeforeUnload: true });
  ok('ผู้ขายปิดแท็บ → รายการหายจากตลาด (ไม่ต้องรอหมดอายุ)', await until(B, id => !Market.stalls.has(id), cId, 4000));

  // ---------- 13) โหมดออฟไลน์ ----------
  const ctx2 = await b.newContext({ viewport: { width: 1000, height: 680 } });
  await guard(ctx2);
  const O = await ctx2.newPage(); O.errs = [];
  O.on('pageerror', e => O.errs.push(e.message));
  await O.goto(BASE);
  await O.waitForSelector('#auth', { state: 'visible', timeout: 60000 });
  await O.click('#au-offline'); await O.click('#btn-new');
  await O.fill('#cr-name', 'Solo'); await O.click('#cr-start');
  await O.waitForFunction(() => G.started, null, { timeout: 30000 });
  await O.click('#prologue-skip', { timeout: 3000 }).catch(() => {});
  await O.evaluate(() => { document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden')); UI.chat('/market'); });
  ok('ออฟไลน์: /market เปิดหน้าต่างพร้อมข้อความ "ต้องออนไลน์"', await until(O, () => UI.isOpen('w-market') && /ตลาดต้องออนไลน์/.test(document.querySelector('#w-market .mk-empty').textContent)));
  ok('ออฟไลน์: วางขายไม่ได้', await O.evaluate(() => { const e = G.player.inventory[0]; return Market.list(e, 1, 1) === false && !G.player.vend; }));

  const errs = [...A.errs, ...B.errs, ...O.errs];
  ok('ไม่มี error ในหน้าเกม', !errs.length, errs.slice(0, 5).join(' || '));
  ok('ไม่มีคำขอไป Supabase จริง', realHits === 0, realHits);

  await b.close(); srv.close();
  console.log(fail ? `\n${fail} FAILED / ${pass} passed` : `\nALL ${pass} PASSED`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
