// ทดสอบการแลกเปลี่ยนไอเทมระหว่างผู้เล่น (2 แท็บ + Supabase ปลอม)
// ขอแลก/ตอบรับ • ใส่ของ+Volt ทั้งสองฝั่ง • ล็อก → ตกลง → ของ/Volt ย้ายถูกต้อง (อาวุธตีบวก+ชิปติดไปด้วย)
// เปลี่ยนข้อเสนอหลังล็อก = ปลดล็อก • ยกเลิก/ปฏิเสธ/ปิดหน้าต่าง • ห่างเกิน 8 ช่อง • หมดเวลา • ของหายตอนนับถอยหลัง • ออฟไลน์
// ใช้: (python3 -m http.server 8797 &) ; BASE=http://localhost:8797/index.html NODE_PATH=$(npm root -g) node tests/mp_trade.js
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:8790/index.html';
const FAKE = path.join(__dirname, 'fake_supabase.js');
let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) { pass++; console.log('✔', name, info ? ` (${info})` : ''); } else { fail++; console.log('✘', name, info ? ` (${info})` : ''); } };

async function player(ctx, user, opts = {}) {
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.stack.split('\n').slice(0, 3).join(' | ')));
  p.on('console', m => { if (/^trade /.test(m.text())) p.errs.push(m.text()); }); // ข้อผิดพลาดที่ Trade.tick/onMsg จับไว้
  await p.goto(BASE);
  await p.waitForFunction(() => typeof Online !== 'undefined' && !document.querySelector('#auth').classList.contains('hidden'), null, { timeout: 20000 });
  await p.click('#au-tabs [data-mode="register"]');
  await p.fill('#au-user', user); await p.fill('#au-pass', 'pass1234'); await p.fill('#au-pass2', 'pass1234'); await p.click('#au-submit');
  await p.waitForSelector('#cr-name', { state: 'visible', timeout: 10000 });
  await p.fill('#cr-name', opts.name || user); await p.click('#cr-start');
  await p.waitForFunction(() => G.started, null, { timeout: 15000 });
  await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {});
  await p.evaluate(() => document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden')));
  return p;
}
const until = (P, fn, arg, timeout = 5000) => P.waitForFunction(fn, arg, { timeout, polling: 50 }).then(() => true, () => false);
const state = P => P.evaluate(() => (Trade.t ? Trade.t.state : null));
const log = P => P.evaluate(() => [...document.querySelectorAll('#chat-log .cl')].map(e => e.textContent).join('\n'));
const bag = P => P.evaluate(() => ({
  zeny: G.player.zeny, red: countItem('red_potion'), apple: countItem('apple'),
  cutters: G.player.inventory.filter(e => e.id === 'cutter').map(e => ({ uid: e.uid, refine: e.refine, cards: e.cards })),
}));
// A ขอแลกด้วย /trade → B กดยอมรับ → ทั้งคู่อยู่ในหน้าต่างแลกเปลี่ยน
async function open(A, B, how = 'chat') {
  if (how === 'chat') await A.evaluate(() => UI.chat('/trade Bobby'));
  const inc = await until(B, () => Trade.t && Trade.t.state === 'inc' && !!document.querySelector('#w-trade:not(.hidden) .tr-accept'));
  if (inc) await B.click('#w-trade .tr-accept');
  const both = await until(A, () => Trade.t && Trade.t.state === 'open' && !!document.querySelector('#w-trade:not(.hidden) .tr-cols'))
    && await until(B, () => Trade.t && Trade.t.state === 'open' && !!document.querySelector('#w-trade:not(.hidden) .tr-cols'));
  return inc && both;
}
const closedBoth = async (A, B, t = 5000) => (await until(A, () => !Trade.t && document.querySelector('#w-trade').classList.contains('hidden'), null, t))
  && (await until(B, () => !Trade.t && document.querySelector('#w-trade').classList.contains('hidden'), null, t));
// ใส่ของกองตามจำนวน (แตะไอคอนในกระเป๋า → ตั้งจำนวน → ใส่)
async function offerStack(P, id, n) {
  await P.click(`#w-trade .tr-icell[data-id="${id}"]`);
  await P.fill('#w-trade .tr-qn', String(n));
  await P.click('#w-trade .tr-add');
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 1100, height: 680 } });
  await ctx.addInitScript({ path: FAKE });
  await ctx.route(/fake\.supabase\.test\/auth\/v1\/settings/, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"mailer_autoconfirm":true}' }));
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));

  const A = await player(ctx, 'alice_' + Date.now().toString(36).slice(-3), { name: 'Alice' });
  const B = await player(ctx, 'bob_' + Date.now().toString(36).slice(-3), { name: 'Bobby' });
  ok('ออนไลน์ทั้งคู่', await A.evaluate(() => Online.online) && await B.evaluate(() => Online.online));
  ok('เห็นกันในแผนที่', await until(A, () => [...Online.others.values()].some(o => o.name === 'Bobby'), null, 8000)
    && await until(B, () => [...Online.others.values()].some(o => o.name === 'Alice'), null, 8000));
  ok('มีปุ่มแลกเปลี่ยนในเมนู', await A.evaluate(() => !!document.querySelector('#menubar [data-win="w-trade"]')));

  // ของตั้งต้น: A มี Cutter +7 ใส่ชิป 1 อัน • Volt 5000 / B Volt 3000 + Oil Can 10
  await A.evaluate(() => {
    const p = G.player; p.zeny = 5000;
    addItem('cutter', 1, true);
    const c = p.inventory.find(e => e.id === 'cutter'); c.refine = 7; c.cards = ['mosspud_card'];
    window.__saves = []; const q = Online.queueSave.bind(Online); Online.queueSave = (d, imm) => { window.__saves.push({ zeny: d.zeny, imm: !!imm }); return q(d, imm); };
    window.__ups = []; const f = Online.sb.from; Online.sb.from = t => { const x = f(t), u = x.upsert; x.upsert = row => { window.__ups.push(row.data && row.data.zeny); return u(row); }; return x; };
  });
  await B.evaluate(() => {
    G.player.zeny = 3000; addItem('apple', 5, true);
    window.__saves = []; const q = Online.queueSave.bind(Online); Online.queueSave = (d, imm) => { window.__saves.push({ zeny: d.zeny, imm: !!imm }); return q(d, imm); };
    window.__ups = []; const f = Online.sb.from; Online.sb.from = t => { const x = f(t), u = x.upsert; x.upsert = row => { window.__ups.push(row.data && row.data.zeny); return u(row); }; return x; };
  });
  const a0 = await bag(A), b0 = await bag(B);
  const cutUid = a0.cutters[0].uid;

  // ---------- 1) เริ่มด้วย /trade + ตอบรับ ----------
  await A.evaluate(() => UI.chat('/trade Bobby'));
  ok('A ส่งคำขอ (/trade Bobby)', await until(A, () => Trade.t && Trade.t.state === 'req' && !!document.querySelector('#w-trade:not(.hidden) .tr-wait')));
  ok('B เห็นป๊อปอัปยอมรับ/ปฏิเสธ', await until(B, () => !!document.querySelector('#w-trade:not(.hidden) .tr-accept') && !!document.querySelector('#w-trade .tr-decline')));
  ok('เริ่มแลกเปลี่ยน (สองคอลัมน์)', await open(A, B, 'none'),
    await B.evaluate(() => [...document.querySelectorAll('#w-trade .tr-col-t')].map(e => e.textContent).join(' | ')));
  ok('หัวคอลัมน์ "ของคุณ" / "ของ Bobby"', await A.evaluate(() => [...document.querySelectorAll('#w-trade .tr-col-t')].map(e => e.textContent).join('|') === 'ของคุณ|ของ Bobby'));

  // ---------- 2) ใส่ของ + Volt ทั้งสองฝั่ง ----------
  await A.click('#w-trade .tr-icell[data-id="cutter"]');
  await offerStack(A, 'red_potion', 4);
  await A.fill('#w-trade .tr-zeny', '1200'); await A.press('#w-trade .tr-zeny', 'Enter');
  await offerStack(B, 'apple', 3);
  await B.fill('#w-trade .tr-zeny', '700'); await B.press('#w-trade .tr-zeny', 'Enter');
  ok('B เห็นข้อเสนอของ A (Cutter +7 [3], Repair Kit ×4, 1200 Volt)', await until(B, () => {
    const th = Trade.t.their; const c = th.items.find(x => x.id === 'cutter'), r = th.items.find(x => x.id === 'red_potion');
    return c && c.refine === 7 && c.cards.length === 1 && r && r.qty === 4 && th.zeny === 1200
      && /\+7/.test((document.querySelector('#w-trade .tr-col.their .tr-slot[data-id="cutter"] .rf') || {}).textContent || '')
      && document.querySelectorAll('#w-trade .tr-col.their .tr-slot[data-id="cutter"] .tr-holes i').length === 3;
  }));
  ok('A เห็นข้อเสนอของ B (Oil Can ×3, 700 Volt)', await until(A, () => { const th = Trade.t.their; return th.items.length === 1 && th.items[0].id === 'apple' && th.items[0].qty === 3 && th.zeny === 700; }));
  ok('ของที่สวมอยู่ไม่อยู่ในรายการให้เลือก', await A.evaluate(() => { const k = G.player.equip.weapon; return !!k && !document.querySelector(`#w-trade .tr-icell[data-id="${k.id}"]`); }));
  await A.click('#w-trade .tr-icell[data-id="cutter"]').catch(() => {});
  ok('อาวุธชิ้นเดิมใส่ซ้ำไม่ได้', await A.evaluate(() => Trade.t.my.items.filter(x => x.id === 'cutter').length === 1));

  // ---------- 3) ล็อก → เปลี่ยนข้อเสนอ = ปลดล็อกทั้งคู่ ----------
  await A.click('#w-trade .tr-lock');
  ok('B เห็น A ล็อก', await until(B, () => Trade.t.their.locked && !!document.querySelector('#w-trade .tr-col.their.lock')));
  await B.click('#w-trade .tr-lock');
  ok('ล็อกทั้งคู่ → ปุ่มตกลงกดได้', await until(A, () => Trade.t.my.locked && Trade.t.their.locked && !document.querySelector('#w-trade .tr-ok').disabled));
  await offerStack(B, 'apple', 1);
  ok('B เปลี่ยนข้อเสนอหลังล็อก → ปลดล็อกทั้งสองฝั่ง', await until(A, () => !Trade.t.my.locked && !Trade.t.their.locked && Trade.t.their.items[0].qty === 4)
    && await B.evaluate(() => !Trade.t.my.locked && !Trade.t.their.locked));
  // พิมพ์ Volt แล้วกดล็อกทันที (ไม่กด Enter) ต้องได้ค่าล่าสุด
  await A.fill('#w-trade .tr-zeny', '1500');
  await A.click('#w-trade .tr-lock');
  ok('พิมพ์ Volt แล้วกดล็อกทันที ใช้ค่าล่าสุด', await until(A, () => Trade.t.my.locked && Trade.t.my.zeny === 1500)
    && await until(B, () => Trade.t.their.locked && Trade.t.their.zeny === 1500));
  await B.click('#w-trade .tr-lock');
  await until(A, () => Trade.t.their.locked);

  // ---------- 4) ตกลงทั้งคู่ → นับถอยหลัง → สลับของ ----------
  await A.click('#w-trade .tr-ok');
  ok('A ตกลง → B เห็นสถานะตกลง', await until(B, () => Trade.t.their.confirmed && !!document.querySelector('#w-trade .tr-col.their.ok')));
  await B.click('#w-trade .tr-ok');
  ok('นับถอยหลัง 1.5 วินาที', await until(A, () => Trade.t && Trade.t.state === 'count' && /แลกเปลี่ยนใน/.test(document.querySelector('#w-trade .tr-count').textContent)));
  const t0 = Date.now();
  ok('แลกเปลี่ยนเสร็จ ปิดหน้าต่างทั้งสองฝั่ง', await closedBoth(A, B), `${Date.now() - t0}ms`);
  ok('ไม่สลับก่อนครบเวลานับถอยหลัง', Date.now() - t0 >= 1200, `${Date.now() - t0}ms`);
  const a1 = await bag(A), b1 = await bag(B);
  ok('A: Volt 5000 − 1500 + 700 = 4200', a1.zeny === a0.zeny - 1500 + 700, a1.zeny);
  ok('B: Volt 3000 − 700 + 1500 = 3800', b1.zeny === b0.zeny - 700 + 1500, b1.zeny);
  ok('A: Cutter ออกจากกระเป๋า', !a1.cutters.some(c => c.uid === cutUid), JSON.stringify(a1.cutters));
  const bc = b1.cutters.find(c => c.refine === 7);
  ok('B: ได้ Cutter +7 พร้อมชิป (ค่าตีบวกไม่หาย)', b1.cutters.length === b0.cutters.length + 1 && !!bc && bc.cards.join() === 'mosspud_card' && bc.uid > 0, JSON.stringify(b1.cutters));
  ok('Repair Kit: A −4 / B +4', a1.red === a0.red - 4 && b1.red === b0.red + 4, `${a1.red} / ${b1.red}`);
  ok('Oil Can: A +4 / B −4', a1.apple === a0.apple + 4 && b1.apple === b0.apple - 4, `${a1.apple} / ${b1.apple}`);
  ok('บันทึกทันทีหลังแลก (ทั้งคู่)', await A.evaluate(z => window.__saves.some(s => s.imm && s.zeny === z), a1.zeny) && await B.evaluate(z => window.__saves.some(s => s.imm && s.zeny === z), b1.zeny));
  // (ไม่อ่านจาก localStorage ของ DB ปลอมตรง ๆ เพราะสองแท็บเขียนทับกันได้ — ดูคำสั่ง upsert ที่ส่งไปเซิร์ฟเวอร์แทน)
  ok('ส่งเซฟขึ้นเซิร์ฟเวอร์ (upsert) ด้วยค่าหลังแลก', await until(A, z => window.__ups.includes(z), a1.zeny, 3000) && await until(B, z => window.__ups.includes(z), b1.zeny, 3000));
  ok('แชทบันทึกผลการแลกเปลี่ยน', /แลกเปลี่ยนกับ Bobby สำเร็จ.*Cutter/.test(await log(A)) && /แลกเปลี่ยนกับ Alice สำเร็จ.*\+7 Cutter/.test(await log(B)));

  // ---------- 5) ยกเลิก (เริ่มจากปุ่มในรายชื่อผู้เล่น) ----------
  await A.click('#menubar [data-win="w-trade"]');
  ok('รายชื่อผู้เล่นใกล้ ๆ มีปุ่ม "แลกเปลี่ยน"', await until(A, () => { const b = document.querySelector('#w-trade .tr-go'); return b && !b.disabled && b.textContent === 'แลกเปลี่ยน'; }));
  await A.click('#w-trade .tr-go');
  ok('เริ่มจากปุ่มในรายชื่อ', await open(A, B, 'none'));
  await offerStack(A, 'red_potion', 2);
  await A.fill('#w-trade .tr-zeny', '100'); await A.press('#w-trade .tr-zeny', 'Enter');
  await until(B, () => Trade.t.their.items.length === 1);
  await B.click('#w-trade .tr-cancel');
  ok('B กดยกเลิก → ปิดทั้งสองฝั่ง', await closedBoth(A, B));
  const a2 = await bag(A);
  ok('ยกเลิกแล้วของไม่ย้าย', a2.zeny === a1.zeny && a2.red === a1.red, JSON.stringify(a2));
  ok('แชทแจ้งการยกเลิก', /ถูกยกเลิก: Bobby ยกเลิก/.test(await log(A)) && /ถูกยกเลิก: คุณยกเลิก/.test(await log(B)));

  // ---------- 6) ปฏิเสธคำขอ ----------
  await A.evaluate(() => UI.chat('/trade bob'));
  await until(B, () => !!document.querySelector('#w-trade:not(.hidden) .tr-decline'));
  await B.click('#w-trade .tr-decline');
  ok('B ปฏิเสธ → A ได้รับแจ้ง', await until(A, () => !Trade.t && /Bobby ปฏิเสธการแลกเปลี่ยน/.test(document.querySelector('#chat-log').textContent)));
  await A.evaluate(() => UI.close('w-trade'));

  // ---------- 7) ปิดหน้าต่าง (Esc) = ยกเลิก ----------
  ok('เปิดอีกรอบ', await open(A, B));
  await B.evaluate(() => document.activeElement && document.activeElement.blur());
  await B.keyboard.press('Escape');
  ok('Esc ปิดหน้าต่าง = ยกเลิกทั้งสองฝั่ง', await closedBoth(A, B));

  // ---------- 8) ห่างกันเกิน 8 ช่อง ----------
  ok('เปิดอีกรอบ', await open(A, B));
  await B.evaluate(() => { G.player.x += 12; Online.sendPos(true); });
  ok('เดินห่างเกิน 8 ช่อง → ยกเลิก', await closedBoth(A, B) && /ห่างกันเกิน 8 ช่อง/.test(await log(A)));
  await B.evaluate(() => { G.player.x -= 12; Online.sendPos(true); });
  await until(A, () => { const o = [...Online.others.values()].find(x => x.name === 'Bobby'); return o && Math.hypot(o.tx - G.player.x, o.ty - G.player.y) < 2; });

  // ---------- 9) หมดเวลา 2 นาที ----------
  ok('เปิดอีกรอบ', await open(A, B));
  await A.evaluate(() => { Trade.t.at -= 121000; });
  ok('ครบ 2 นาที → ยกเลิก', await closedBoth(A, B) && /หมดเวลา/.test(await log(B)));

  // ---------- 10) ของหายระหว่างนับถอยหลัง → ยกเลิก คืนของที่พักไว้ ----------
  ok('เปิดอีกรอบ', await open(A, B));
  const a3 = await bag(A), b3 = await bag(B);
  await offerStack(A, 'red_potion', 2);
  await B.fill('#w-trade .tr-zeny', '50'); await B.press('#w-trade .tr-zeny', 'Enter');
  await until(A, () => Trade.t.their.zeny === 50);
  await A.click('#w-trade .tr-lock'); await until(B, () => Trade.t.their.locked);
  await B.click('#w-trade .tr-lock'); await until(A, () => Trade.t.their.locked);
  await A.click('#w-trade .tr-ok'); await until(B, () => Trade.t.their.confirmed);
  await B.click('#w-trade .tr-ok');
  await until(A, () => Trade.t && Trade.t.state === 'count');
  await A.evaluate(() => { for (const e of G.player.inventory.filter(x => x.id === 'red_potion')) removeEntry(e, e.qty); });
  ok('ของไม่ครบตอนสลับ → ยกเลิกทั้งคู่', await closedBoth(A, B) && /ไม่ครบ/.test(await log(B)));
  const a4 = await bag(A), b4 = await bag(B);
  ok('ไม่มีใครได้/เสียของ (B ได้ Volt ที่พักไว้คืน)', b4.zeny === b3.zeny && b4.red === b3.red && a4.zeny === a3.zeny, `B ${b3.zeny}→${b4.zeny} A ${a3.zeny}→${a4.zeny}`);

  for (const [n, p] of [['A', A], ['B', B]]) ok(`ไม่มี error ใน ${n}`, !p.errs.length, p.errs.join(' || '));

  // ---------- 11) ออฟไลน์ / บัญชีในเครื่อง ----------
  const ctx2 = await b.newContext({ viewport: { width: 1100, height: 680 } });
  await ctx2.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  const C = await player(ctx2, 'carol_' + Date.now().toString(36).slice(-3), { name: 'Carol' });
  ok('โหมดบัญชีในเครื่อง (ไม่ออนไลน์)', await C.evaluate(() => Online.loggedIn && !Online.online));
  await C.evaluate(() => UI.chat('/trade Bobby'));
  ok('ออฟไลน์: /trade แจ้ง "ต้องออนไลน์"', /ต้องออนไลน์/.test(await log(C)));
  ok('ออฟไลน์: หน้าต่างแสดง "ต้องออนไลน์"', await until(C, () => /ต้องออนไลน์/.test((document.querySelector('#w-trade:not(.hidden) .tr-empty') || {}).textContent || '')));
  ok('ไม่มี error ใน C (ออฟไลน์)', !C.errs.length, C.errs.join(' || '));

  await b.close();
  console.log(fail ? `${fail} FAILED, ${pass} passed` : `ALL ${pass} PASSED`);
  process.exit(fail ? 1 : 0);
})();
