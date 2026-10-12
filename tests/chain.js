'use strict';
// ============================================================
//  โซ่บันทึกการเล่น + EXP/ดรอปจากเซิร์ฟเวอร์ (ระยะ 2 — js/chain.js) ในเกมจริง กับ Supabase ปลอม
//  (tests/fake_supabase.js · window.__fakeEcon + __fakeChain · กติกาตรวจเซฟเปิดด้วย — ไม่ต่อ Supabase จริง)
//  เล่นสุจริต (AUTO) ต่อเนื่อง = รางวัลมาจากเซิร์ฟเวอร์ ไม่มีของตกพื้น ไม่มีธง · แก้รายการกลางโซ่ / สลับลำดับ = ถูกปฏิเสธ เริ่มต่อใหม่
//  ส่งชุดซ้ำ = dup (ไม่ได้รางวัลซ้ำ) · เน็ตหลุด = เก็บคิว ส่งตามลำดับ (รีโหลดหน้าก็ไม่หาย) · เซิร์ฟเวอร์ไม่มีระบบ = เกมให้รางวัลเองแบบเดิม
//  รัน:  NODE_PATH=$(npm root -g) CHROME=/path/to/chrome node tests/chain.js   (SIM_MIN=<นาทีที่เล่นสุจริต> ค่าเริ่ม 15)
// ============================================================
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const FAKE = path.join(__dirname, 'fake_supabase.js');
const RULES = path.join(ROOT, 'supabase', 'save_verify_rules.js');
const DATA = fs.readFileSync(path.join(__dirname, 'save_verify_data.json'), 'utf8');
const SIM_MIN = +process.env.SIM_MIN || 15;
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
let BASE;

async function newCtx(b, flags) {
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  await ctx.addInitScript(f => { Object.assign(window, f); }, flags);
  await ctx.addInitScript({ path: RULES });
  await ctx.addInitScript({ content: `window.__SV_DATA = ${DATA};` });
  await ctx.addInitScript({ path: FAKE });
  await ctx.route(/^https:\/\//, r => {
    const u = r.request().url();
    if (/fake\.supabase\.test\/auth\/v1\/settings/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: '{"mailer_autoconfirm":true}' });
    if (/cdn\.jsdelivr\.net\/npm\/@supabase/.test(u)) return r.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    return r.abort();
  });
  return ctx;
}
async function open(ctx, restored) {
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.stack.split('\n').slice(0, 3).join(' | ')));
  p.setDefaultTimeout(120000);
  await p.goto(BASE, { timeout: 180000 });
  if (restored) await p.waitForSelector('#btn-continue', { state: 'visible', timeout: 120000 });
  else await p.waitForFunction(() => typeof Online !== 'undefined' && !document.querySelector('#auth').classList.contains('hidden'), null, { timeout: 120000 });
  return p;
}
async function intoGame(p) {
  await p.waitForFunction(() => G.started, null, { timeout: 60000 });
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 8000, polling: 250 }).catch(() => {});
  await p.evaluate(() => document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden')));
  await until(p, () => Online.online && SessionGuard.sentAt > 0, null, 60000);
  await p.evaluate(() => { UI.announce = () => {}; window.__msgs = []; const m = UI.msg.bind(UI); UI.msg = (t, k) => { window.__msgs.push(String(t)); return m(t, k); }; });
}
async function play(p, user, name) {
  await p.click('#au-tabs [data-mode="register"]');
  await p.fill('#au-user', user); await p.fill('#au-pass', 'pass1234'); await p.fill('#au-pass2', 'pass1234'); await p.click('#au-submit');
  await p.waitForSelector('#cr-name', { state: 'visible', timeout: 120000 });
  await p.fill('#cr-name', name); await p.click('#cr-start');
  await intoGame(p);
}
// ตัวละครเลเวลกลาง (ผู้ดูแลตั้งตรงในฐานข้อมูล) ล่าใน Mistlake
const setup = p => p.evaluate(async () => {
  clearTimeout(Online.saveTimer); Online.saveTimer = null; Online.pendingSave = null;
  const pl = G.player;
  pl.baseLv = 18; pl.jobLv = 10; changeJob('einherjar'); pl.jobLv = 15; pl.skillPoints = Math.max(0, totalSkillPoints(pl) - lineSkillsSpent(pl));
  for (const id of JOBS.einherjar.skills) while (canLearn(id)) learnSkill(id);
  for (const s in pl.stats) pl.stats[s] = 1;
  let pts = 48; for (let l = 2; l <= 18; l++) pts += statPointsForLevel(l); pl.statPoints = pts;
  let k = 0, g = 0; while (g++ < 2000) { const s = ['str', 'vit', 'str', 'agi', 'vit'][k++ % 5]; if (pl.statPoints < statCost(pl.stats[s])) { if (pl.statPoints < 2) break; continue; } raiseStat(s); }
  addItem('sword', 1, true); equipItem(pl.inventory.find(e => e.id === 'sword'), true);
  addItem('orange_potion', 300, true);
  pl.options.bot = Object.assign(Bot.defaults(), { returnHome: false, avoidMvp: true }); Bot.unlocked = () => true;
  changeMap('mistlake', 1, 1); G.mobs = G.mobs.filter(m => !m.isMvp && !m.isWB);
  const M = G.map, cx = M.w >> 1, cy = M.h >> 1; let best = null;
  for (let y = 3; y < M.h - 3; y++) for (let x = 3; x < M.w - 3; x++) { if (!M.walkable(x, y)) continue; let okk = true; for (let dy = -2; dy <= 2 && okk; dy++) for (let dx = -2; dx <= 2 && okk; dx++) if (!M.walkable(x + dx, y + dy)) okk = false; if (okk && (!best || Math.hypot(x - cx, y - cy) < Math.hypot(best[0] - cx, best[1] - cy))) best = [x, y]; }
  window.__spot = best; teleportPlayer(best[0] + 0.5, best[1] + 0.5);
  recalc(); pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp;
  const u = Online.user.id, a = JSON.parse(JSON.stringify(Acct.data)); a.chars[a.active] = saveData();
  window.__FAKE_CH.put(u, { user_id: u, name: pl.name, data: a, updated_ms: Date.now() + (+localStorage.getItem('fake_sv:clock') || 0) });
  localStorage.removeItem('fake_sv:state:' + u); Online.lsSet(Online.mirrorKey(), a);
});
// เวลาเซิร์ฟเวอร์เดินหน้า (ตรวจเซฟ + โซ่ ใช้นาฬิกาเดียวกัน)
const advance = (p, sec) => p.evaluate(s => {
  for (const k of ['fake_sv:clock', 'fake_ec:ch:skew']) localStorage.setItem(k, String((+localStorage.getItem(k) || 0) + s * 1000));
}, sec);
const minute = p => p.evaluate(async () => {
  const pl = G.player; if (!Bot.on) Bot.toggle(true);
  let left = 60;
  while (left > 0) { const s = Math.min(10, left); catchUp(s); left -= s; if (pl.dead) { respawnPlayer(true); pl.hp = pl.d.maxHp; G.mobs = G.mobs.filter(m => !m.isMvp && !m.isWB); teleportPlayer(window.__spot[0] + 0.5, window.__spot[1] + 0.5); } if (!Bot.on) Bot.toggle(true); }
  Bot.toggle(false); // หยุดบอทก่อนส่ง/วัด (ไม่งั้นเกมยังล่าต่อแบบเวลาจริงระหว่างรอ)
  for (let i = 0; i < 40 && (Chain.queue.length || Chain.busy); i++) { await Chain.p; await Chain.flush(true); await new Promise(r => setTimeout(r, 50)); }
  saveGame(true, true); await Online.flushAll(5000);
  return { lv: pl.baseLv, exp: pl.baseExp, zeny: pl.zeny, q: Chain.queue.length, drops: G.drops.length };
});
const flags = (p, u) => p.evaluate(u => JSON.parse(localStorage.getItem('fake_sv:flags:' + u) || '[]').map(f => f.rule), u);

(async () => {
  const srv = await serve();
  BASE = `http://localhost:${srv.address().port}/index.html`;
  const opts = { headless: true, args: ['--disable-features=IntensiveWakeUpThrottling'] };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  else if (fs.existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium';
  const b = await chromium.launch(opts);
  const sfx = Date.now().toString(36).slice(-4);
  const errs = [];

  // ================= เปิดระบบ =================
  const ctx = await newCtx(b, { __fakeEcon: true, __fakeChain: true });
  const A = await open(ctx);
  await play(A, 'cha_' + sfx, 'Aria');
  const ua = await A.evaluate(() => Online.user.id);
  await setup(A);
  await A.evaluate(() => Chain.start());
  await A.evaluate(() => { const k0 = killMob; killMob = function (m) { if (!m.minion && !m.dead && !Chain.on()) window.__off = (window.__off || 0) + 1; return k0.apply(this, arguments); }; });
  ok('ได้หมุดเริ่มต้นจากเซิร์ฟเวอร์ → โหมดโซ่เปิด', await until(A, () => Chain.on() && Chain.anchor && Chain.anchor.seq >= 0, null, 20000));

  // ---------- เล่นสุจริต ----------
  const s0 = await A.evaluate(() => ({ lv: G.player.baseLv, cum: SaveVerifyRules.cumBase(G.player.baseLv, G.player.baseExp), zeny: G.player.zeny, inv: G.player.inventory.reduce((s, e) => s + e.qty, 0), kills: Object.values(G.player.kills || {}).reduce((a, c) => a + c, 0) }));
  let last = null, maxDrops = 0;
  for (let m = 0; m < SIM_MIN; m++) { await advance(A, 60); last = await minute(A); maxDrops = Math.max(maxDrops, last.drops); }
  const s1 = await A.evaluate(() => ({ cum: SaveVerifyRules.cumBase(G.player.baseLv, G.player.baseExp), zeny: G.player.zeny, inv: G.player.inventory.reduce((s, e) => s + e.qty, 0), kills: Object.values(G.player.kills || {}).reduce((a, c) => a + c, 0), seq: Chain.anchor.seq }));
  const both = await A.evaluate(u => { const r = window.__FAKE_CH.get(u), p = G.player; return { srv: r.data.chars[r.data.active], cli: { lv: p.baseLv, exp: p.baseExp, zeny: p.zeny } }; }, ua);
  const srvC = both.srv; last = Object.assign({}, last, both.cli);
  ok(`AUTO ${SIM_MIN} นาที: ฆ่า ${s1.kills - s0.kills} ตัว ทุกตัวอยู่ในโซ่ + คิวว่าง`, s1.kills > s0.kills && s1.seq >= s1.kills - s0.kills && await until(A, () => { if (Chain.queue.length && !Chain.busy) Chain.flush(true); return !Chain.queue.length && !Chain.busy; }, null, 15000), `seq ${s1.seq} q ${last.q} นอกโซ่ ${await A.evaluate(() => window.__off || 0)}`);
  ok('EXP/Volt/ของ มาจากเซิร์ฟเวอร์ (เพิ่มขึ้น) · ไม่มีของตกพื้น', s1.cum > s0.cum && s1.zeny > s0.zeny && s1.inv > s0.inv && maxDrops === 0, `exp +${Math.round(s1.cum - s0.cum)} zeny +${s1.zeny - s0.zeny} items +${s1.inv - s0.inv}`);
  ok('เซฟบนเซิร์ฟเวอร์ตรงกับเกม (เลเวล/EXP/Volt)', srvC.baseLv === last.lv && srvC.baseExp === last.exp && srvC.zeny === last.zeny, `${srvC.baseLv}/${srvC.baseExp}/${srvC.zeny} vs ${last.lv}/${last.exp}/${last.zeny}`);
  ok('เล่นสุจริต: ไม่มีธงเลย (โซ่ + ตรวจเซฟ)', (await flags(A, ua)).length === 0, (await flags(A, ua)).join());

  // ---------- แก้กลางโซ่ ----------
  const map = await A.evaluate(() => G.map.id);
  const kill = async n => A.evaluate(([n, map]) => { for (let i = 0; i < n; i++) Chain.append('kill', ['moss_pudding', map, G.player.baseLv, 0, 0]); return Chain.p; }, [n, map]);
  await advance(A, 30);
  await kill(5);
  const z0 = await A.evaluate(() => G.player.zeny);
  await A.evaluate(() => { Chain.queue[2].a[0] = 'rot_colossus'; }); // แก้ในเครื่อง (แฮชเดิม)
  await A.evaluate(() => Chain.flush(true));
  ok('แก้รายการกลางโซ่ → ปฏิเสธ chain_break + ทิ้งชุด + ข้อความไทย + ไม่ได้รางวัล', await A.evaluate(z => Chain.queue.length === 0 && Chain.head.seq === Chain.anchor.seq && window.__msgs.some(t => /ไม่รับบันทึกการเล่นชุดล่าสุด \(chain_break\)/.test(t)) && G.player.zeny === z, z0)
    && (await flags(A, ua)).includes('chain_break'));
  await advance(A, 30); await kill(4);
  await A.evaluate(() => { const q = Chain.queue; [q[1], q[2]] = [q[2], q[1]]; });
  await A.evaluate(() => Chain.flush(true));
  ok('สลับลำดับ → ปฏิเสธ แล้วเริ่มต่อจากหมุดล่าสุด', await A.evaluate(() => Chain.queue.length === 0 && Chain.head.seq === Chain.anchor.seq));
  await advance(A, 30); await kill(3);
  const before = await A.evaluate(() => ({ a: Chain.anchor, batch: Chain.queue.slice() }));
  await A.evaluate(() => Chain.flush(true));
  ok('หลังโดนปฏิเสธ ชุดใหม่ถูกต้อง = รับ', await A.evaluate(s => Chain.anchor.seq === s + 3 && Chain.queue.length === 0, before.a.seq));
  const dup = await A.evaluate(async ([a, batch]) => (await Online.sb.rpc('submit_events', { ch: G.player.name, prev_anchor: a.id, entries: batch })).data, [before.a, before.batch]);
  ok('ส่งชุดเดิมซ้ำ (คำตอบหาย) = dup ไม่ได้รางวัลซ้ำ', dup && dup.status === 'dup', JSON.stringify(dup).slice(0, 80));

  // ---------- เน็ตหลุด: เก็บคิว → ส่งตามลำดับ (รีโหลดหน้าก็ไม่หาย) ----------
  await A.evaluate(() => { window.__rpc0 = Online.sb.rpc; Online.sb.rpc = (fn, a) => (fn === 'submit_events' ? Promise.reject(new Error('net down')) : window.__rpc0(fn, a)); });
  await advance(A, 60); await kill(12);
  await A.evaluate(() => Chain.flush(true));
  ok('เน็ตหลุด: คิวค้าง 12 รายการ เก็บในเครื่อง', await A.evaluate(() => Chain.queue.length === 12 && JSON.parse(localStorage.getItem(Chain.key)).queue.length === 12));
  await A.evaluate(() => { saveGame(true, true); return Online.flushAll(4000); });
  await A.reload({ timeout: 180000 });
  await A.waitForSelector('#btn-continue', { state: 'visible', timeout: 120000 });
  await A.click('#btn-continue'); await intoGame(A);
  ok('รีโหลดหน้า: คิวเดิมกลับมา แล้วส่งต่อจนหมด', await until(A, () => Chain.on() && Chain.queue.length === 0 && Chain.anchor.seq === Chain.head.seq, null, 30000), await A.evaluate(() => `${Chain.queue.length} ${Chain.anchor && Chain.anchor.seq}/${Chain.head && Chain.head.seq}`));
  ok('ทั้งหมดนี้ ธงมีแค่ chain_break ที่ตั้งใจ', (await flags(A, ua)).every(r => r === 'chain_break'), (await flags(A, ua)).join());
  errs.push(...A.errs);
  await ctx.close();

  // ================= เซิร์ฟเวอร์ยังไม่มีระบบโซ่ =================
  const ctx2 = await newCtx(b, { __fakeEcon: true });
  const C = await open(ctx2);
  await play(C, 'chc_' + sfx, 'Cato');
  await C.evaluate(() => Chain.start());
  ok('ไม่มี RPC โซ่: Chain.server = false', await until(C, () => Chain.server === false, null, 15000));
  const lc = await C.evaluate(() => { const z = G.player.zeny, k = Object.values(G.player.kills || {}).reduce((a, c) => a + c, 0); const m = spawnMob('pudding', { x: Math.floor(G.player.x) + 1, y: Math.floor(G.player.y) }); killMob(m); return { dz: G.player.zeny - z, dk: Object.values(G.player.kills).reduce((a, c) => a + c, 0) - k, q: Chain.queue.length }; });
  ok('ฆ่ามอน = เกมให้รางวัลเองแบบเดิม (Volt เพิ่มทันที ไม่เข้าโซ่)', lc.dz > 0 && lc.dk === 1 && lc.q === 0, JSON.stringify(lc));
  errs.push(...C.errs);
  await ctx2.close();

  ok('ไม่มี error ในหน้าเกม', errs.length === 0, errs.slice(0, 3).join(' || '));
  await b.close(); srv.close();
  console.log(`\n${pass} ผ่าน / ${fail} ไม่ผ่าน`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
