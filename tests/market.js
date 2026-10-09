'use strict';
// ============================================================
//  ทดสอบตลาดผู้เล่น (js/market.js): 3 แท็บคุยกันผ่าน Supabase ปลอม (tests/fake_supabase.js — BroadcastChannel ในเครื่อง)
//  ไม่แตะ Supabase จริง (คำขอไป *.supabase.co / .in ถูกบล็อกและนับ — ต้องเป็น 0)
//  ครอบคลุม: เปิดร้าน (ของเข้า escrow) • บอร์ดเห็นร้าน + ค้นหา/กรอง/เรียง • คลิกป้ายเปิดหน้าร้าน • ซื้อสำเร็จ ของ/Volt ย้ายครั้งเดียว
//  (ส่งคำขอซ้ำ tid เดิมไม่ขายซ้ำ) • Volt ไม่พอ = ไม่ส่งคำขอ • ผู้ซื้อ 2 คนแย่งชิ้นสุดท้าย → ได้คนเดียว • ผู้ขายไม่ตอบ = คืนเงิน
//  • ปิดร้าน = ของคืน (อาวุธตีบวก+ชิปครบ) • ร้านค้างจากปิดเกมกลางคัน = คืนของ + หายจากบอร์ดเมื่อเงียบ • ผู้ขายปิดแท็บ = ร้านหายทันที
//  • จอมือถือ 390px ไม่ล้นแนวนอน • โหมดออฟไลน์ = ข้อความ "ต้องออนไลน์"
//  รัน:  NODE_PATH=$(npm root -g) node tests/market.js   (CHROME=/path/to/chrome ได้)
// ============================================================
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const FAKE = path.join(__dirname, 'fake_supabase.js');
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

// SHOTS=โฟลเดอร์ → เก็บภาพหน้าจอไว้ตรวจด้วยตา (ป้ายร้าน / บอร์ด / หน้าร้าน / จอมือถือ)
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
// คำขอไป Supabase จริง (ต้องไม่มีเลย)
let realHits = 0;
async function guard(ctx) {
  await ctx.route(/supabase\.(co|in)\b/, r => { realHits++; r.abort(); });
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
}

async function player(ctx, base, user, name, viewport) {
  const p = await ctx.newPage(); p.errs = [];
  if (viewport) await p.setViewportSize(viewport);
  p.on('pageerror', e => p.errs.push(e.stack.split('\n').slice(0, 3).join(' | ')));
  p.on('console', m => { if (/^market /.test(m.text())) p.errs.push(m.text()); }); // ข้อผิดพลาดที่ Market.tick/onMsg จับไว้
  await p.goto(base);
  await p.waitForFunction(() => typeof Online !== 'undefined' && !document.querySelector('#auth').classList.contains('hidden'), null, { timeout: 30000 });
  await p.click('#au-tabs [data-mode="register"]');
  await p.fill('#au-user', user); await p.fill('#au-pass', 'pass1234'); await p.fill('#au-pass2', 'pass1234'); await p.click('#au-submit');
  await p.waitForSelector('#cr-name', { state: 'visible', timeout: 15000 });
  await p.fill('#cr-name', name); await p.click('#cr-start');
  await p.waitForFunction(() => G.started, null, { timeout: 20000 });
  await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {});
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 8000, polling: 250 }).catch(() => {});
  await p.evaluate(() => document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden')));
  // บันทึกการเซฟทันที (imm) ที่ส่งเข้าคิวคลาวด์ — ดูว่าซื้อขายแล้วเซฟทันที
  await p.evaluate(() => {
    window.__cz = d => (d && Array.isArray(d.chars) ? (d.chars[d.active] || {}).zeny : d && d.zeny);
    window.__saves = []; const q = Online.queueSave.bind(Online); Online.queueSave = (d, imm) => { window.__saves.push({ zeny: __cz(d), imm: !!imm }); return q(d, imm); };
  });
  return p;
}

(async () => {
  const srv = await serve();
  const BASE = `http://localhost:${srv.address().port}/index.html`;
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  else if (fs.existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium';
  let b;
  try { b = await chromium.launch(opts); } catch (e) { b = await chromium.launch({ headless: true }); }
  const ctx = await b.newContext({ viewport: { width: 1100, height: 700 } });
  await ctx.addInitScript({ path: FAKE });
  await guard(ctx);
  await ctx.route(/fake\.supabase\.test\/auth\/v1\/settings/, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"mailer_autoconfirm":true}' }));

  const sfx = Date.now().toString(36).slice(-4);
  const A = await player(ctx, BASE, 'alice_' + sfx, 'Alice');
  const B = await player(ctx, BASE, 'bob_' + sfx, 'Bobby');
  const C = await player(ctx, BASE, 'carol_' + sfx, 'Carol', { width: 390, height: 844 });
  const P3 = [A, B, C];
  ok('ออนไลน์ทั้ง 3 คน (Supabase ปลอม)', (await Promise.all(P3.map(P => P.evaluate(() => Online.online && window.__FAKE_SUPABASE__)))).every(Boolean));
  ok('อยู่ในเมือง (เปิดร้านได้)', (await Promise.all(P3.map(P => P.evaluate(() => Market.inTown())))).every(Boolean));
  ok('มีปุ่มตลาดในเมนู', await A.evaluate(() => !!document.querySelector('#menubar [data-win="w-market"]')));
  ok('เซฟมีช่อง vend', await A.evaluate(() => SAVE_FIELDS.includes('vend')));
  const aId = await A.evaluate(() => Online.user.id);

  // ของตั้งต้น: A มี Repair Kit 10, Oil Can 5, Cutter +7 ใส่ชิป • B/C มี Volt 5000
  await A.evaluate(() => {
    const p = G.player; p.zeny = 1000; p.inventory = p.inventory.filter(e => !['red_potion', 'apple', 'cutter'].includes(e.id));
    addItem('red_potion', 10, true); addItem('apple', 5, true); addItem('cutter', 1, true);
    const c = p.inventory.find(e => e.id === 'cutter'); c.refine = 7; c.cards = ['mosspud_card'];
  });
  for (const P of [B, C]) await P.evaluate(() => { const p = G.player; p.zeny = 5000; p.inventory = p.inventory.filter(e => !['red_potion', 'apple', 'cutter'].includes(e.id)); });
  const a0 = await bag(A), cutUid = a0.cutters[0].uid;

  // ---------- 1) เปิดร้านผ่านหน้าต่าง ----------
  await tap(A, '#menubar [data-win="w-market"]');
  await until(A, () => !document.querySelector('#w-market').classList.contains('hidden'));
  await tap(A, '#w-market .mk-tab[data-tab="mine"]');
  await fillIn(A, '#w-market .mk-title', 'Alice Mart');
  const addLine = async (id, qty, price) => {
    await tap(A, `#w-market .mk-icell[data-id="${id}"]`);
    if (qty != null) await fillIn(A, '#w-market .mk-pq', String(qty));
    await fillIn(A, '#w-market .mk-pp', String(price));
    await tap(A, '#w-market .mk-add');
  };
  await addLine('red_potion', 5, 100);
  await addLine('cutter', null, 2000);
  await addLine('apple', 1, 50);
  ok('ร่างร้าน 3 ช่อง', await A.evaluate(() => Market.draft && Market.draft.lines.length === 3 && Market.draft.title === 'Alice Mart'), await A.evaluate(() => Market.draft));
  await shot(A, 'a_mine_draft');
  await tap(A, '#w-market .mk-open');
  ok('เปิดร้านแล้ว', await until(A, () => !!Market.mine && G.player.sitting && !!G.player.vend));
  const a1 = await bag(A);
  ok('ของย้ายเข้า escrow (Repair Kit −5, Oil Can −1, Cutter ออกจากกระเป๋า)', a1.red === a0.red - 5 && a1.apple === a0.apple - 1 && a1.cutters.length === 0, a1);
  ok('escrow อยู่ในเซฟ (saveData().vend) + เซฟทันที', await A.evaluate(() => { const v = saveData().vend; return !!v && v.items.length === 3 && v.items.find(x => x.id === 'cutter').refine === 7 && window.__saves.some(s => s.imm); }));
  ok('ป้ายร้านของตัวเอง', await A.evaluate(() => Market.signFor(Online.user.id) === 'Alice Mart'));

  // ---------- 2) บอร์ดตลาดของ B ----------
  ok('B เห็นร้านของ A บนบอร์ด', await until(B, id => { const s = Market.stalls.get(id); return s && s.items.length === 3 && s.title === 'Alice Mart'; }, aId));
  ok('B เห็นป้ายเหนือหัว A', await B.evaluate(id => Market.signFor(id) === 'Alice Mart', aId));
  await B.evaluate(() => Market.show('board'));
  ok('บอร์ดแสดง 3 รายการ พร้อมชื่อผู้ขาย/แผนที่/ราคา', await until(B, () => {
    const rows = [...document.querySelectorAll('#w-market .mk-row')];
    return rows.length === 3 && rows.every(r => /Alice/.test(r.textContent) && r.textContent.includes(MAP_DEFS.eldheim.name)) && /2,000|2000/.test(rows.map(r => r.textContent).join(' '));
  }), await B.evaluate(() => [...document.querySelectorAll('#w-market .mk-row')].map(r => r.textContent).join(' | ')));
  ok('เรียงราคาต่ำ → สูง', await B.evaluate(() => [...document.querySelectorAll('#w-market .mk-row')].map(r => r.dataset.id).join() === 'apple,red_potion,cutter'));
  await shot(B, 'b_board');
  await fillIn(B, '#w-market .mk-sort', 'price_desc');
  ok('เรียงราคาสูง → ต่ำ', await until(B, () => [...document.querySelectorAll('#w-market .mk-row')].map(r => r.dataset.id).join() === 'cutter,red_potion,apple'),
    await B.evaluate(() => ({ open: UI.isOpen('w-market'), view: Market.view, sort: Market.sort, rows: [...document.querySelectorAll('#w-market .mk-row')].map(r => r.dataset.id).join() })));
  await fillIn(B, '#w-market .mk-q', 'cutt');
  ok('ค้นหาชื่อไอเทม', await until(B, () => { const r = [...document.querySelectorAll('#w-market .mk-row')]; return r.length === 1 && r[0].dataset.id === 'cutter'; }));
  await fillIn(B, '#w-market .mk-q', '');
  await fillIn(B, '#w-market .mk-type', 'use');
  ok('กรองชนิด (ของใช้)', await until(B, () => { const r = [...document.querySelectorAll('#w-market .mk-row')].map(x => x.dataset.id); return r.length >= 1 && !r.includes('cutter'); }));
  await fillIn(B, '#w-market .mk-type', 'all');
  ok('ปุ่มนำทางไปร้าน', await B.evaluate(() => !!document.querySelector('#w-market .mk-row .mk-go')));
  await B.evaluate(() => UI.close('w-market'));
  await B.waitForTimeout(300); await shot(B, 'b_sign');

  // ---------- 3) คลิกป้ายร้านในฉาก → หน้าร้าน ----------
  const clicked = await B.evaluate(id => {
    const s = Market.stalls.get(id), o = Online.others.get(id), x = o ? o.x : s.x, y = o ? o.y : s.y;
    const wx = x * TILE, wy = (y - 2.5) * TILE; // ระดับป้าย
    R.mouse.x = (wx - R.camX) * R.zoom; R.mouse.y = (wy * R.K - R.camY) * R.zoom;
    handleClick({});
    return Market.view === 'shop' && Market.shop === id && UI.isOpen('w-market');
  }, aId);
  ok('คลิกป้ายร้าน = เปิดหน้าร้าน', clicked);
  await B.waitForTimeout(200); await shot(B, 'b_shop');

  // ---------- 4) ซื้อผ่านหน้าร้าน (ยืนยัน) ----------
  const b0 = await bag(B), az0 = (await bag(A)).zeny;
  await fillIn(B, '#w-market .mk-row[data-id="red_potion"] .mk-n', '3');
  await tap(B, '#w-market .mk-row[data-id="red_potion"] .mk-buy');
  ok('ถามยืนยันก่อนซื้อ', await until(B, () => !document.querySelector('#w-confirm').classList.contains('hidden') && /300/.test(document.querySelector('#w-confirm').textContent)));
  await tap(B, '#w-confirm .cf-btns .btn');
  ok('ซื้อสำเร็จ', await until(B, () => !Market.pend && countItem('red_potion') === 3, null, 8000));
  await B.waitForTimeout(800); // เผื่อข้อความซ้ำ/มาช้า
  const b1 = await bag(B), a2 = await bag(A);
  ok('B: Volt −300 / Repair Kit +3', b1.zeny === b0.zeny - 300 && b1.red === b0.red + 3, { b0, b1 });
  ok('A: Volt +300 (ภาษี 0) / ในร้านเหลือ 2', a2.zeny === az0 + 300 && await A.evaluate(() => Market.mine.items.find(x => x.id === 'red_potion').qty === 2), a2.zeny);
  ok('ทั้งคู่เซฟทันทีหลังซื้อขาย', await A.evaluate(z => window.__saves.some(s => s.imm && s.zeny === z), a2.zeny) && await B.evaluate(z => window.__saves.some(s => s.imm && s.zeny === z), b1.zeny));
  ok('บอร์ดของ B อัปเดตจำนวนคงเหลือ', await until(B, id => Market.stalls.get(id).items.find(x => x.id === 'red_potion').qty === 2, aId));
  ok('แชทแจ้งทั้งสองฝั่ง', /ซื้อ Repair Kit[^×]* ×3 จาก Alice สำเร็จ/.test(await log(B)) && /ขาย Repair Kit[^×]* ×3 ให้ Bobby/.test(await log(A)), (await log(B)).split('\n').slice(-2).join(' / '));

  // ส่งคำขอซื้อซ้ำด้วย tid เดิม (เล่นซ้ำ/เน็ตส่งซ้ำ) → ผู้ขายตอบเหมือนเดิม ไม่หักของ/ไม่รับเงินซ้ำ
  const replay = await B.evaluate(id => {
    const s = Market.stalls.get(id), x = s.items.find(y => y.id === 'red_potion');
    const tid = 'replay' + Date.now();
    const pk = { k: 'buy', to: id, tid, sid: s.sid, i: x.i, qty: 1, price: x.price, hash: Market.lineHash(s.sid, x), name: G.player.name };
    Market.send(pk); Market.send(pk); Market.send(pk);
    return tid;
  }, aId);
  await A.waitForTimeout(1200);
  ok('คำขอ tid เดิม 3 ครั้ง ขายครั้งเดียว', await A.evaluate(() => Market.mine.items.find(x => x.id === 'red_potion').qty === 1 && Market.done.size >= 2), replay);
  ok('ผู้ซื้อไม่ได้ของ/ไม่เสียเงินจากคำตอบที่ไม่ได้รอ', (await bag(B)).red === b1.red && (await bag(B)).zeny === b1.zeny);
  const a3 = await bag(A);
  ok('ผู้ขายรับเงินจากคำขอเล่นซ้ำครั้งเดียว (+100)', a3.zeny === a2.zeny + 100, a3.zeny);

  // ---------- 5) Volt ไม่พอ ----------
  await C.evaluate(() => { G.player.zeny = 100; });
  ok('C เห็นร้าน A', await until(C, id => !!Market.stalls.get(id), aId));
  const poor = await C.evaluate(id => { const s = Market.stalls.get(id), x = s.items.find(y => y.id === 'cutter'); const r = Market.buy(id, x.i, 1); return { r, pend: !!Market.pend, zeny: G.player.zeny }; }, aId);
  ok('Volt ไม่พอ → ไม่ส่งคำขอ ไม่หักเงิน', poor.r === false && !poor.pend && poor.zeny === 100, poor);
  ok('แจ้ง Volt ไม่พอ', /Volt ไม่พอ/.test(await log(C)));
  await A.waitForTimeout(400);
  ok('Cutter ยังอยู่ในร้าน', await A.evaluate(() => Market.mine.items.find(x => x.id === 'cutter').qty === 1));

  // ---------- 6) แย่งชิ้นสุดท้าย (Oil Can ×1) ----------
  await C.evaluate(() => { G.player.zeny = 5000; });
  await C.evaluate(() => UI.open('w-market'));
  const bz = (await bag(B)).zeny, cz = (await bag(C)).zeny, az = (await bag(A)).zeny;
  const iApple = await A.evaluate(() => Market.mine.items.find(x => x.id === 'apple').i);
  const [rb, rc] = await Promise.all([B.evaluate(([id, i]) => Market.buy(id, i, 1), [aId, iApple]), C.evaluate(([id, i]) => Market.buy(id, i, 1), [aId, iApple])]);
  ok('ทั้งสองส่งคำขอได้ (กันเงินไว้)', rb && rc);
  await until(B, () => !Market.pend, null, 9000); await until(C, () => !Market.pend, null, 9000);
  await B.waitForTimeout(600);
  const rB = await bag(B), rC = await bag(C), rA = await bag(A);
  const winners = [rB.apple === 1, rC.apple === 1].filter(Boolean).length;
  ok('ได้ของคนเดียว', winners === 1, { B: rB.apple, C: rC.apple });
  ok('คนชนะเสีย 50 / คนแพ้ได้เงินคืนครบ', (rB.apple === 1 ? rB.zeny === bz - 50 && rC.zeny === cz : rC.zeny === cz - 50 && rB.zeny === bz), { bz, cz, b: rB.zeny, c: rC.zeny });
  ok('ผู้ขายรับเงินครั้งเดียว (+50) Oil Can เหลือ 0', rA.zeny === az + 50 && await A.evaluate(() => Market.mine.items.find(x => x.id === 'apple').qty === 0), rA.zeny - az);
  const loser = rB.apple === 1 ? C : B;
  ok('คนแพ้ได้ข้อความ "หมดแล้ว"', /ของหมดแล้ว/.test(await log(loser)));

  // ---------- 7) ผู้ขายไม่ตอบ → คืนเงินเมื่อหมดเวลา ----------
  await A.evaluate(() => { window.__ob = Market.onBuy; Market.onBuy = () => {}; });
  await B.evaluate(() => { MARKET_CFG.buyWait = 1500; });
  const bz2 = (await bag(B)).zeny;
  await B.evaluate(id => { const s = Market.stalls.get(id), x = s.items.find(y => y.id === 'red_potion'); Market.buy(id, x.i, 1); }, aId);
  ok('กันเงินระหว่างรอ', (await bag(B)).zeny === bz2 - 100);
  ok('ไม่ตอบ 1.5 วิ → คืนเงิน', await until(B, z => !Market.pend && G.player.zeny === z, bz2, 5000) && /ไม่ตอบ/.test(await log(B)));
  await A.evaluate(() => { Market.onBuy = window.__ob; });
  await B.evaluate(() => { MARKET_CFG.buyWait = 8000; });

  // ---------- 8) ปิดร้าน → ของคืน ----------
  await A.evaluate(() => Market.show('mine'));
  await tap(A, '#w-market .mk-close');
  ok('ปิดร้านแล้ว (p.vend ว่าง)', await until(A, () => !Market.mine && !G.player.vend));
  const a4 = await bag(A);
  const back = a4.cutters.find(c => c.uid === cutUid);
  ok('คืนของ: Repair Kit 1 + Cutter +7 พร้อมชิป (uid เดิม)', a4.red === a1.red + 1 && !!back && back.refine === 7 && back.cards.join() === 'mosspud_card', a4);
  ok('ร้านหายจากบอร์ดของ B/C ทันที', await until(B, id => !Market.stalls.has(id), aId, 3000) && await until(C, id => !Market.stalls.has(id), aId, 3000));
  ok('ร้านปิดแล้วซื้อไม่ได้', await B.evaluate(id => Market.buy(id, 0, 1) === false && !Market.pend, aId));

  // ---------- 9) ปิดเกมกลางคัน: ของคืนเมื่อเข้าใหม่ + ร้านหายจากบอร์ดเมื่อเงียบ ----------
  await A.evaluate(() => { Market.draft = { title: 'Crash Shop', lines: [{ id: 'red_potion', qty: 1, price: 10 }] }; Market.open(); });
  ok('B เห็นร้านใหม่', await until(B, id => (Market.stalls.get(id) || {}).title === 'Crash Shop', aId));
  await B.evaluate(() => { MARKET_CFG.expire = 2500; });
  const redBefore = (await bag(A)).red;
  // แท็บค้าง: ร้านถูกทิ้งโดยไม่ปิด (ไม่ส่ง off, ไม่คืนของ) — เหลือแค่ p.vend ในเซฟ
  await A.evaluate(() => { Market.mine = null; Market.owner = null; });
  ok('เข้าเกมใหม่ = คืนของจาก p.vend', await until(A, n => !G.player.vend && countItem('red_potion') === n + 1, redBefore));
  ok('ร้านที่เงียบหายจากบอร์ดเอง (heartbeat หมดอายุ)', await until(B, id => !Market.stalls.has(id), aId, 6000));
  await B.evaluate(() => { MARKET_CFG.expire = 12000; });

  // ---------- 10) จอมือถือ + ผู้ขายปิดแท็บ ----------
  const cId = await C.evaluate(() => Online.user.id);
  await C.evaluate(() => { addItem('apple', 2, true); Market.draft = { title: 'Carol Corner', lines: [{ id: 'apple', qty: 2, price: 40 }] }; Market.open(); Market.show('board'); });
  ok('B เห็นร้านของ C', await until(B, id => !!Market.stalls.get(id), cId));
  await C.evaluate(() => { Market.show('board'); });
  const fit = await C.evaluate(() => { const w = document.querySelector('#w-market'), r = w.getBoundingClientRect(), bd = w.querySelector('.win-body'); return { l: r.left, r: r.right, vw: innerWidth, sw: bd.scrollWidth, cw: bd.clientWidth, doc: document.documentElement.scrollWidth }; });
  await shot(C, 'c_phone_board');
  ok('จอ 390px: หน้าต่างอยู่ในจอ ไม่ล้นแนวนอน', fit.l >= 0 && fit.r <= fit.vw + 0.5 && fit.sw <= fit.cw + 1 && fit.doc <= fit.vw, fit);
  await C.evaluate(() => Market.show('mine'));
  const fit2 = await C.evaluate(() => { const bd = document.querySelector('#w-market .win-body'); return { sw: bd.scrollWidth, cw: bd.clientWidth }; });
  await shot(C, 'c_phone_mine');
  ok('จอ 390px: หน้าร้านของฉันไม่ล้นแนวนอน', fit2.sw <= fit2.cw + 1, fit2);
  await C.close({ runBeforeUnload: true });
  ok('ผู้ขายปิดแท็บ → ร้านหายจากบอร์ด (ไม่ต้องรอหมดอายุ)', await until(B, id => !Market.stalls.has(id), cId, 3000));

  // ---------- 11) โหมดออฟไลน์ ----------
  const ctx2 = await b.newContext({ viewport: { width: 1000, height: 680 } });
  await guard(ctx2);
  const O = await ctx2.newPage(); O.errs = [];
  O.on('pageerror', e => O.errs.push(e.message));
  await O.goto(BASE);
  await O.waitForSelector('#auth', { state: 'visible', timeout: 30000 });
  await O.click('#au-offline'); await O.click('#btn-new');
  await O.fill('#cr-name', 'Solo'); await O.click('#cr-start');
  await O.waitForFunction(() => G.started, null, { timeout: 20000 });
  await O.click('#prologue-skip', { timeout: 3000 }).catch(() => {});
  await O.evaluate(() => { document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden')); UI.chat('/market'); });
  ok('ออฟไลน์: /market เปิดหน้าต่างพร้อมข้อความ "ต้องออนไลน์"', await until(O, () => UI.isOpen('w-market') && /ตลาดต้องออนไลน์/.test(document.querySelector('#w-market .mk-empty').textContent)));
  await shot(O, 'o_offline');
  ok('ออฟไลน์: เปิดร้านไม่ได้', await O.evaluate(() => { Market.draft = { title: 'x', lines: [{ id: 'red_potion', qty: 1, price: 1 }] }; return Market.open() === false && !G.player.vend; }));

  const errs = [...A.errs, ...B.errs, ...O.errs];
  ok('ไม่มี error ในหน้าเกม', !errs.length, errs.slice(0, 5).join(' || '));
  ok('ไม่มีคำขอไป Supabase จริง', realHits === 0, realHits);

  await b.close(); srv.close();
  console.log(fail ? `\n${fail} FAILED / ${pass} passed` : `\nALL ${pass} PASSED`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
