'use strict';
// ============================================================
//  เศรษฐกิจฝั่งเซิร์ฟเวอร์ (ระยะ 1 — js/econ.js + supabase/migrations/20261012001000_economy.sql) ในเกมจริง กับ Supabase ปลอม
//  (tests/fake_supabase.js · window.__fakeEcon = เปิด RPC econ_* · สำเนากติกาตรวจเซฟเปิดด้วย — ไม่ต่อ Supabase จริง)
//  ร้าน NPC ซื้อ/ขาย (ขายรัวหลายชิ้น = คำขอเดียว) · ตีบวก (เซิร์ฟเวอร์สุ่ม) · ตลาด วาง/ซื้อ (ผู้ขายไม่ต้องทำอะไร เงินเข้าเอง) / แก้ราคา / ยกเลิก
//  แลกเปลี่ยน (เซิร์ฟเวอร์สลับทีเดียว) · เซฟที่ตามไม่ทันถูกเติม · ของปั๊มถูกจับ · ปิดระบบกลางเกม = กลับไปวิธีเดิม · ไม่มีธงตรวจเซฟจากการเล่นสุจริต
//  รัน:  NODE_PATH=$(npm root -g) CHROME=/path/to/chrome node tests/economy.js
// ============================================================
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const FAKE = path.join(__dirname, 'fake_supabase.js');
const RULES = path.join(ROOT, 'supabase', 'save_verify_rules.js');
const DATA = fs.readFileSync(path.join(__dirname, 'save_verify_data.json'), 'utf8');
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
let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) { pass++; console.log('✔', name, info ? ` (${info})` : ''); } else { fail++; console.log('✘', name, info ? ` (${info})` : ''); } };
const until = async (page, fn, arg, ms = 30000) => { try { await page.waitForFunction(fn, arg, { timeout: ms, polling: 100 }); return true; } catch (e) { return false; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
let BASE;

async function open(ctx) {
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.stack.split('\n').slice(0, 3).join(' | ')));
  p.setDefaultTimeout(120000);
  await p.goto(BASE, { timeout: 180000 });
  await p.waitForFunction(() => typeof Online !== 'undefined' && !document.querySelector('#auth').classList.contains('hidden'), null, { timeout: 120000 });
  return p;
}
async function play(p, user, name) {
  await p.click('#au-tabs [data-mode="register"]');
  await p.fill('#au-user', user); await p.fill('#au-pass', 'pass1234'); await p.fill('#au-pass2', 'pass1234'); await p.click('#au-submit');
  await p.waitForSelector('#cr-name', { state: 'visible', timeout: 120000 });
  await p.fill('#cr-name', name); await p.click('#cr-start');
  await p.waitForFunction(() => G.started, null, { timeout: 60000 });
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 8000, polling: 250 }).catch(() => {});
  await p.evaluate(() => document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden')));
  await until(p, () => Online.online && SessionGuard.sentAt > 0, null, 60000);
  await p.evaluate(() => { UI.announce = () => {}; window.__msgs = []; const m = UI.msg.bind(UI); UI.msg = (t, k) => { window.__msgs.push(String(t)); return m(t, k); }; });
}
// ผู้ดูแลตั้งค่าตัวละครตรงในฐานข้อมูล (ไม่ผ่าน trigger) — ใช้เป็นจุดตั้งต้น
const admin = (p, fn) => p.evaluate(async fn => {
  clearTimeout(Online.saveTimer); Online.saveTimer = null; Online.pendingSave = null;
  for (let i = 0; i < 100 && Online.saving; i++) await new Promise(r => setTimeout(r, 50));
  (0, eval)('(' + fn + ')')();
  const u = Online.user.id, a = JSON.parse(JSON.stringify(Acct.data)); a.chars[a.active] = saveData();
  window.__FAKE_CH.put(u, { user_id: u, name: G.player.name, data: a, updated_ms: Date.now() });
  localStorage.removeItem('fake_sv:state:' + u);
  Online.lsSet(Online.mirrorKey(), a);
}, fn.toString());
const server = (p, u) => p.evaluate(u => { const r = window.__FAKE_CH.get(u); return r.data.chars[r.data.active]; }, u);
const flags = (p, u) => p.evaluate(u => JSON.parse(localStorage.getItem('fake_sv:flags:' + u) || '[]').map(f => f.rule), u);
const ecCalls = p => p.evaluate(() => window.__ecCalls || 0);
const saveNow = p => p.evaluate(async () => { saveGame(true, true); await new Promise(r => setTimeout(r, 30)); await Online.flushAll(6000); });
const count = (c, id) => (c.inventory || []).filter(e => e.id === id).reduce((s, e) => s + e.qty, 0);

(async () => {
  const srv = await serve();
  BASE = `http://localhost:${srv.address().port}/index.html`;
  const opts = { headless: true, args: ['--disable-features=IntensiveWakeUpThrottling'] };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  else if (fs.existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium';
  const b = await chromium.launch(opts);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  await ctx.addInitScript(() => { window.__fakeEcon = true; });
  await ctx.addInitScript({ path: RULES });
  await ctx.addInitScript({ content: `window.__SV_DATA = ${DATA};` });
  await ctx.addInitScript({ path: FAKE });
  await ctx.route(/^https:\/\//, r => {
    const u = r.request().url();
    if (/fake\.supabase\.test\/auth\/v1\/settings/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: '{"mailer_autoconfirm":true}' });
    if (/cdn\.jsdelivr\.net\/npm\/@supabase/.test(u)) return r.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    return r.abort();
  });
  const sfx = Date.now().toString(36).slice(-4);
  const A = await open(ctx), B = await open(ctx);
  await play(A, 'eca_' + sfx, 'Aria'); await play(B, 'ecb_' + sfx, 'Bryn');
  const ua = await A.evaluate(() => Online.user.id), ub = await B.evaluate(() => Online.user.id);
  for (const P of [A, B]) await admin(P, () => { const p = G.player; p.zeny = 2000000; changeMap(HOME_MAP, 20.5 + Math.random(), 24.5); });
  ok('ระบบเศรษฐกิจเซิร์ฟเวอร์เปิด (probe)', await until(A, () => Econ.probe().then(() => Econ.server === true), null, 15000));

  // ---------- ร้าน NPC ----------
  const z0 = await A.evaluate(() => G.player.zeny);
  await A.evaluate(() => UI.buy('knife', 2));
  ok('ซื้อ Knife ×2 ผ่านเซิร์ฟเวอร์: uid จากเซิร์ฟเวอร์ (≥ 1e12) + หัก 100', await until(A, z => G.player.inventory.filter(e => e.id === 'knife' && e.uid >= 1e12).length === 2 && G.player.zeny === z - 100, z0, 15000));
  let sa = await server(A, ua);
  ok('เซฟบนเซิร์ฟเวอร์ตรงกับเกม (Volt + econSeq)', sa.zeny === z0 - 100 && sa.econSeq === (await A.evaluate(() => G.player.econSeq)), `${sa.zeny} seq ${sa.econSeq}`);
  await A.evaluate(() => { addItem('jelly_drop', 7, true); addItem('ash_tail', 3, true); });
  const c0 = await ecCalls(A), z1 = await A.evaluate(() => G.player.zeny);
  await A.evaluate(() => { for (const x of G.player.inventory.filter(y => y.id === 'jelly_drop' || y.id === 'ash_tail')) UI.sell(x, x.qty, true); });
  const gain = await A.evaluate(() => Math.floor(ITEMS.jelly_drop.price / 2) * 7 + Math.floor(ITEMS.ash_tail.price / 2) * 3);
  ok('ขายรัว 2 ชนิด = คำขอเดียว ได้ Volt ตามราคาเซิร์ฟเวอร์ ของออก', await until(A, ([z, g]) => G.player.zeny === z + g && !G.player.inventory.some(e => e.id === 'jelly_drop' || e.id === 'ash_tail'), [z1, gain], 15000)
    && (await ecCalls(A)) - c0 <= 2, `calls ${(await ecCalls(A)) - c0} · Δ ${(await A.evaluate(() => G.player.zeny)) - z1} vs ${gain} · left ${await A.evaluate(() => JSON.stringify(G.player.inventory.filter(e => e.id === 'jelly_drop' || e.id === 'ash_tail')))}`);

  // ---------- ตีบวก ----------
  await A.evaluate(() => { window.__fakeRefineRate = 1; const k = G.player.inventory.find(e => e.id === 'knife'); equipItem(k, true); });
  await saveNow(A);
  const r1 = await A.evaluate(async () => { const z = G.player.zeny; const r = await NPC.refineRun('weapon', 3, true); return { r: !!r && r.done, lv: G.player.equip.weapon.refine, paid: z - G.player.zeny }; });
  ok('ตีบวก +0→+3 (เซิร์ฟเวอร์สุ่ม): สำเร็จ ค่าบริการ 250+500+750', r1.r && r1.lv === 3 && r1.paid === 1500, JSON.stringify(r1));
  await A.evaluate(() => { window.__fakeRefineRate = 0; });
  const r2 = await A.evaluate(async () => { const r = await NPC.refineRun('weapon', 4, false); return { tries: r && r.tries, fails: r && r.fails, lv: G.player.equip.weapon.refine }; });
  ok('โอกาส 0% = พลาด ของไม่แตก ขั้นเดิม', r2.tries === 1 && r2.fails === 1 && r2.lv === 3, JSON.stringify(r2));
  sa = await server(A, ua);
  ok('ค่าตีบวกบนเซิร์ฟเวอร์ตรง (+3)', sa.equip.weapon.refine === 3);
  // แก้โอกาสในเครื่อง = ไม่มีผล (เซิร์ฟเวอร์สุ่ม)
  await A.evaluate(() => { NPC.REFINE_RATE = NPC.REFINE_RATE.map(() => 1); U.chance = () => true; });
  const r3 = await A.evaluate(async () => { const r = await NPC.refineRun('weapon', 4, false); return { lv: G.player.equip.weapon.refine, fails: r && r.fails }; });
  ok('แก้โอกาสในเครื่องเป็น 100% ก็ยังพลาดตามเซิร์ฟเวอร์', r3.lv === 3 && r3.fails === 1, JSON.stringify(r3));

  // ---------- ตลาด ----------
  const lu = await A.evaluate(() => { const k = G.player.inventory.find(e => e.id === 'knife' && e.uid >= 1e12); Market.list(k, 1, 300000); return k.uid; });
  ok('วางขาย Knife ผ่านเซิร์ฟเวอร์: ออกจากกระเป๋า เข้า vend', await until(A, u => !G.player.inventory.some(e => e.uid === u) && Market.mine && Market.mine.items.some(x => x.uid === u && x.qty === 1), lu, 15000));
  const kuid = await A.evaluate(() => Market.mine.items.find(x => x.id === 'knife').uid);
  ok('ผู้ซื้อเห็นรายการ', await until(B, aid => { const s = Market.stalls.get(aid); return !!(s && s.items.some(x => x.id === 'knife')); }, ua, 20000));
  const zA = await A.evaluate(() => G.player.zeny), zB = await B.evaluate(() => G.player.zeny);
  const ik = await B.evaluate(aid => Market.stalls.get(aid).items.find(x => x.id === 'knife').i, ua);
  await B.evaluate(([aid, i]) => Market.buy(aid, i, 1), [ua, ik]);
  ok('ผู้ซื้อได้ Knife (uid ใหม่จากเซิร์ฟเวอร์) จ่าย 300,000', await until(B, ([z, u]) => G.player.zeny === z - 300000 && G.player.inventory.some(e => e.id === 'knife' && e.uid >= 1e12 && e.uid !== u), [zB, kuid], 20000));
  ok('ผู้ขายได้เงินเอง (เซิร์ฟเวอร์จ่าย → ดึงรายการ) + toast + รายการหมด', await until(A, z => G.player.zeny === z + 300000 && !Market.live() && window.__msgs.some(t => /ขาย .*Knife.* ให้ Bryn/.test(t)), zA, 20000));
  await A.evaluate(() => { addItem('apple', 10, true); }); await saveNow(A);
  await A.evaluate(() => { const e = G.player.inventory.find(x => x.id === 'apple'); Market.list(e, 10, 50); });
  await until(A, () => Market.live(), null, 15000);
  await A.evaluate(() => { const x = Market.mine.items.find(y => y.id === 'apple'); Market.setPrice(x.i, 70); });
  ok('แก้ราคาผ่านเซิร์ฟเวอร์', await until(A, () => Market.mine && Market.mine.items.find(y => y.id === 'apple').price === 70, null, 15000));
  await A.evaluate(() => { const x = Market.mine.items.find(y => y.id === 'apple'); Market.cancel(x.i); });
  ok('ยกเลิก: ของคืนกระเป๋า', await until(A, () => !Market.live() && G.player.inventory.some(e => e.id === 'apple' && e.qty >= 10), null, 15000));

  // ---------- ของปั๊ม: ผู้ขายแก้เกมให้ Knife ที่ขายไปกลับมา ----------
  await A.evaluate(u => { G.player.inventory.push({ id: 'knife', qty: 1, uid: u, refine: 0, cards: [] }); }, kuid);
  await saveNow(A);
  ok('Knife ที่ขายไปแล้วโผล่กลับในเซฟ → ธง dup_item', (await flags(A, ua)).includes('dup_item'), (await flags(A, ua)).join());
  await A.evaluate(u => { G.player.inventory = G.player.inventory.filter(e => e.uid !== u); }, kuid);

  // ---------- เซฟที่ตามไม่ทัน ----------
  await A.evaluate(() => { addItem('mead', 1, true); });
  await saveNow(A);
  const seq = await A.evaluate(() => G.player.econSeq);
  await B.evaluate(() => UI.buy('red_potion', 1)); // อีกฝ่ายทำอะไรก็ได้ (ไม่เกี่ยว)
  await A.evaluate(() => UI.buy('apple', 4));
  await until(A, s => G.player.econSeq > s, seq, 15000);
  const stale = await A.evaluate(() => { const p = G.player; p.econSeq -= 1; p.zeny += 4 * ITEMS.apple.price; p.inventory.find(e => e.id === 'apple').qty -= 4; return p.zeny; }); // เกมที่ "ยังไม่ได้รับ" ผลการซื้อ
  await saveNow(A);
  sa = await server(A, ua);
  ok('เซฟที่ยังไม่รู้ผลการซื้อ → เซิร์ฟเวอร์เติมให้ (หัก Volt + ได้ของ + econSeq ล่าสุด)', sa.zeny === stale - (await A.evaluate(() => 4 * ITEMS.apple.price)) && sa.econSeq === seq + 1 && count(sa, 'apple') === (await A.evaluate(() => countItem('apple'))) + 4, `${sa.zeny} vs ${stale}`);
  await A.evaluate(() => { G.player.econSeq += 1; }); // เกมรับผลตามปกติ

  // ---------- แลกเปลี่ยน ----------
  await A.evaluate(() => { addItem('cutter', 1, true); });
  await saveNow(A); await saveNow(B);
  const a0 = await A.evaluate(() => ({ zeny: G.player.zeny, cut: G.player.inventory.find(e => e.id === 'cutter').uid })), b0 = await B.evaluate(() => G.player.zeny);
  await A.evaluate(() => UI.chat('/trade Bryn'));
  ok('B ได้คำขอแลกเปลี่ยน', await until(B, () => Trade.t && Trade.t.state === 'inc' && !!document.querySelector('#w-trade:not(.hidden) .tr-accept'), null, 15000));
  await B.click('#w-trade .tr-accept');
  await until(A, () => Trade.t && Trade.t.state === 'open', null, 10000);
  await A.click('#w-trade .tr-icell[data-id="cutter"]');
  await B.fill('#w-trade .tr-zeny', '123456'); await B.press('#w-trade .tr-zeny', 'Enter');
  await until(A, () => Trade.t.their.zeny === 123456, null, 10000);
  await A.click('#w-trade .tr-lock'); await until(B, () => Trade.t.their.locked, null, 10000);
  await B.click('#w-trade .tr-lock'); await until(A, () => Trade.t.their.locked, null, 10000);
  await A.click('#w-trade .tr-ok'); await until(B, () => Trade.t.their.confirmed, null, 10000);
  await B.click('#w-trade .tr-ok');
  ok('แลกเสร็จทั้งคู่ (เซิร์ฟเวอร์สลับ)', await until(A, () => !Trade.t, null, 20000) && await until(B, () => !Trade.t, null, 20000));
  const a1 = await A.evaluate(() => ({ zeny: G.player.zeny, cut: G.player.inventory.some(e => e.id === 'cutter') })), b1 = await B.evaluate(() => ({ zeny: G.player.zeny, cut: G.player.inventory.find(e => e.id === 'cutter') }));
  ok('A: +123,456 Volt ไม่มี Cutter · B: −123,456 ได้ Cutter uid ใหม่', a1.zeny === a0.zeny + 123456 && !a1.cut && b1.zeny === b0 - 123456 && b1.cut && b1.cut.uid !== a0.cut && b1.cut.uid >= 1e12, JSON.stringify([a1, b1.zeny]));
  sa = await server(A, ua); const sb = await server(B, ub);
  ok('เซิร์ฟเวอร์ตรงกับเกมทั้งสองฝ่าย', sa.zeny === a1.zeny && sb.zeny === b1.zeny && !sa.inventory.some(e => e.id === 'cutter'));

  // ---------- ไม่มีธงตรวจเซฟจากการเล่นสุจริต ----------
  await saveNow(A); await saveNow(B);
  const fa = (await flags(A, ua)).filter(r => r !== 'dup_item'), fb = await flags(B, ub);
  ok('ทั้งหมดข้างบน (ยกเว้นของปั๊มที่ตั้งใจ) ไม่มีธงตรวจเซฟ', fa.length === 0 && fb.length === 0, fa.concat(fb).join());

  // ---------- ปิดระบบกลางเกม → กลับไปวิธีเดิม ----------
  await B.evaluate(() => { window.__fakeEconOff = true; });
  const zb = await B.evaluate(() => G.player.zeny);
  await B.evaluate(() => UI.buy('apple', 1));
  ok('econ_off → ซื้อแบบเดิมในเครื่องได้ทันที (Econ.server = false)', await until(B, z => G.player.zeny === z - ITEMS.apple.price && Econ.server === false, zb, 15000));

  const errs = [...A.errs, ...B.errs];
  ok('ไม่มี error ในหน้าเกม', errs.length === 0, errs.slice(0, 3).join(' || '));
  await b.close(); srv.close();
  console.log(`\n${pass} ผ่าน / ${fail} ไม่ผ่าน`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
