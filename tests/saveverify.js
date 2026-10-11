'use strict';
// ============================================================
//  ระบบตรวจเซฟ (supabase/migrations/20261012000000_save_verify.sql + js/save_verify.js) — ทดสอบในเบราว์เซอร์กับ Supabase ปลอม
//  (tests/fake_supabase.js + สำเนากติกา supabase/save_verify_rules.js + ข้อมูล tests/save_verify_data.json — ไม่ต่อ Supabase จริง)
//  1) เล่นสุจริต (AUTO) หลายช่วงเลเวล รวม 60 นาทีจำลอง (เลื่อนนาฬิกาเซิร์ฟเวอร์ตามเวลาเกม) + ขายของร้าน + หมุนกาชา + รับรางวัลเควสต์ → ธง 0
//  2) โกงชัด ๆ (โหมด log): Volt +1e9 / Lv 99 / ไอเทมไม่มีในเกม / Stat เกิน / ของงอกจากตลาดโดยไม่มีรายการโอน → ได้ธงตามกติกา
//  3) ตลาดกลาง + แลกเปลี่ยนสุจริตมูลค่าสูง (ถังว่าง ต้องพึ่งรายการโอน) → ผ่าน ไม่มีธง
//  4) โหมด enforce: เซฟโกงถูกปฏิเสธ → ข้อความไทย เล่นต่อได้ → 3 ครั้งขึ้นหน้าต่าง → โหลดเซฟจากเซิร์ฟเวอร์ = ค่าที่เซิร์ฟเวอร์รับ
//  5) เซิร์ฟเวอร์ยังไม่ได้รัน migration (ไม่มี RPC) → เกม/ตลาด/เซฟทำงานปกติ  6) บัญชีถูกปฏิเสธ → ขึ้นเหตุผลตอนล็อกอิน
//  รัน:  NODE_PATH=$(npm root -g) CHROME=/path/to/chrome node tests/saveverify.js   (SIM_MIN=<นาทีต่อช่วง> ค่าเริ่ม 20)
// ============================================================
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const FAKE = path.join(__dirname, 'fake_supabase.js');
const RULES = path.join(ROOT, 'supabase', 'save_verify_rules.js');
const DATA = fs.readFileSync(path.join(__dirname, 'save_verify_data.json'), 'utf8');
const SIM_MIN = +process.env.SIM_MIN || 20;
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
async function newCtx(b, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  if (opts.noServer) await ctx.addInitScript(() => { window.__noSaveVerify = true; });
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
}
async function registerAndPlay(p, user, name) {
  await p.click('#au-tabs [data-mode="register"]');
  await p.fill('#au-user', user); await p.fill('#au-pass', 'pass1234'); await p.fill('#au-pass2', 'pass1234'); await p.click('#au-submit');
  await p.waitForSelector('#cr-name', { state: 'visible', timeout: 120000 });
  await p.fill('#cr-name', name); await p.click('#cr-start');
  await intoGame(p);
  await until(p, () => Online.online && SessionGuard.sentAt > 0, null, 60000);
  await p.evaluate(() => { UI.announce = () => {}; Sound.play = () => {}; window.__msgs = []; const m = UI.msg.bind(UI); UI.msg = (t, k) => { window.__msgs.push(String(t)); return m(t, k); }; });
}
// ---- ฝั่ง "เซิร์ฟเวอร์ปลอม" (คีย์ fake_sv:* ใน localStorage ร่วมกันทุกแท็บ) ----
const sv = (p, fn, arg) => p.evaluate(fn, arg);
const flags = (p, u) => sv(p, u => JSON.parse(localStorage.getItem('fake_sv:flags:' + u) || '[]'), u);
const svlog = (p, u) => sv(p, u => JSON.parse(localStorage.getItem('fake_sv:log:' + u) || '[]'), u);
const setCfg = (p, c) => sv(p, c => localStorage.setItem('fake_sv:cfg', JSON.stringify(c)), c);
const advance = (p, sec) => sv(p, s => localStorage.setItem('fake_sv:clock', String((+localStorage.getItem('fake_sv:clock') || 0) + s * 1000)), sec);
// ผู้ดูแลแก้ข้อมูลตรงในฐานข้อมูล (ไม่ผ่าน trigger) = "ตัวละครที่เล่นมานานแล้ว" เป็นจุดตั้งต้น • ถังโทเคนเริ่มเต็ม (เหมือนเซฟแรกหลังเปิดระบบ) หรือ empty = ถังว่าง
const adminSync = (p, empty) => p.evaluate(async empty => {
  clearTimeout(Online.saveTimer); Online.saveTimer = null; Online.pendingSave = null; // เซฟค้าง (ระหว่างแต่งตัวละคร) ไม่ส่ง — ผู้ดูแลตั้งค่าแทน
  for (let i = 0; i < 100 && Online.saving; i++) await new Promise(r => setTimeout(r, 50));
  if (window.__qs) { Online.queueSave = window.__qs; window.__qs = null; }
  const u = Online.user.id, a = JSON.parse(JSON.stringify(Acct.data)); a.chars[a.active] = saveData();
  const now = Date.now() + (+localStorage.getItem('fake_sv:clock') || 0);
  localStorage.setItem('fake_sv:row:' + u, JSON.stringify({ data: a, updated_ms: now }));
  if (empty) { const st = { at: now, wb: 0, held: 0, chars: {} }; localStorage.setItem('fake_sv:state:' + u, JSON.stringify(st)); }
  else localStorage.removeItem('fake_sv:state:' + u);
  const d = JSON.parse(localStorage.getItem('fake_sb_db')); d.chars[u] = { user_id: u, name: G.player.name, data: a, updated_ms: now }; localStorage.setItem('fake_sb_db', JSON.stringify(d));
  Online.lsSet(Online.mirrorKey(), a);
}, !!empty);
const pause = p => p.evaluate(() => { if (!window.__qs) { window.__qs = Online.queueSave; Online.queueSave = () => {}; } }); // ผู้ดูแลกำลังแก้ข้อมูล: ไม่ส่งเซฟจนกว่า adminSync
const saveNow = p => p.evaluate(async () => { saveGame(true, true); await new Promise(r => setTimeout(r, 30)); await Online.flushAll(6000); });

// ตัวละครตามเลเวล (แบบ tests/balance_sim.js): Class + สกิล + Stat ตามแต้มจริง + ของ common/uncommon ที่ดีที่สุดที่ใส่ได้ + ยา
const build = (p, o) => p.evaluate(o => {
  if (!window.__qs) { window.__qs = Online.queueSave; Online.queueSave = () => {}; } // ระหว่างแต่งตัวละคร (= ผู้ดูแลแก้ข้อมูล) ไม่ส่งเซฟ — adminSync เปิดคืน
  const pl = G.player, line = [];
  for (let j = o.job; j && j !== 'novice'; j = JOBS[j].parent) line.unshift(j);
  pl.baseLv = o.lv; pl.baseExp = 0; pl.jobExp = 0;
  for (const j of line) {
    pl.jobLv = JOBS[pl.job].jobMax; changeJob(j); pl.jobLv = Math.min(JOBS[j].jobMax, o.jl || 20); pl.skillPoints = Math.max(0, totalSkillPoints(pl) - lineSkillsSpent(pl));
    for (const l of line.slice(0, line.indexOf(j) + 1)) for (const id of JOBS[l].skills) while (canLearn(id)) learnSkill(id);
  }
  for (const s in pl.stats) pl.stats[s] = 1;
  let pts = 48; for (let l = 2; l <= o.lv; l++) pts += statPointsForLevel(l); pl.statPoints = pts;
  const root = line[0], plan = (JOBS[root].stats || 'STR/VIT').toLowerCase().split('/').map(x => x.trim()).filter(s => s in pl.stats);
  let k = 0, guard = 0;
  while (guard++ < 3000) { const s = k % 5 === 4 ? 'vit' : plan[k % plan.length]; k++; if (pl.statPoints < statCost(pl.stats[s])) { if (pl.statPoints < 2) break; continue; } raiseStat(s); }
  const wt = ITEMS[JOB_STARTER[root]].wtype, magic = root === 'runecaster' || root === 'volva';
  for (const s in pl.equip) pl.equip[s] = null;
  pl.inventory = [];
  const RANK = { common: 0, uncommon: 1 };
  const cand = Object.values(ITEMS).filter(it => isEquipType(it) && !it.quest && (RANK[it.rarity || 'common'] != null) && (!it.lv || it.lv <= o.lv) && canJobUse(it.jobs, pl.job) && (it.slot !== 'weapon' || it.wtype === wt) && !(it.slot === 'shield' && wt === 'bow'));
  const score = it => (magic ? (it.matk || 0) * 1.5 : (it.atk || 0)) + (it.def || 0) * 4 + (it.mdef || 0) * 2;
  const bySlot = {}; for (const it of cand) (bySlot[it.slot] = bySlot[it.slot] || []).push(it);
  for (const s in bySlot) for (const it of bySlot[s].sort((a, b) => score(b) - score(a)).slice(0, s === 'acc' ? 2 : 1)) { addItem(it.id, 1, true); equipItem(pl.inventory.find(x => x.id === it.id), true); }
  for (const [id, n] of [['white_potion', 300], ['orange_potion', 150], ['blue_potion', 100], [GACHA_CONFIG.token, 30]]) if (ITEMS[id]) addItem(id, n, true);
  pl.zeny = o.zeny || 20000;
  pl.options.bot = Object.assign(Bot.defaults(), { returnHome: false, avoidMvp: true });
  Bot.unlocked = () => true;
  changeMap(o.map, 1, 1); G.mobs = G.mobs.filter(m => !m.isMvp && !m.isWB);
  const M = G.map, cx = M.w >> 1, cy = M.h >> 1; let best = null;
  for (let y = 3; y < M.h - 3; y++) for (let x = 3; x < M.w - 3; x++) { if (!M.walkable(x, y)) continue; let ok = true; for (let dy = -2; dy <= 2 && ok; dy++) for (let dx = -2; dx <= 2 && ok; dx++) if (!M.walkable(x + dx, y + dy)) ok = false; if (ok && (!best || Math.hypot(x - cx, y - cy) < Math.hypot(best[0] - cx, best[1] - cy))) best = [x, y]; }
  window.__spot = best; teleportPlayer(best[0] + 0.5, best[1] + 0.5); pl.path = [];
  recalc(); pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp;
  return { job: pl.job, lv: pl.baseLv, jl: pl.jobLv, weapon: pl.equip.weapon && pl.equip.weapon.id, map: G.map.id };
}, o);
// เล่น AUTO 1 นาที (จำลองแบบเดียวกับตอนแท็บถูกซ่อน: catchUp) — ล้มแล้วเกิดใหม่ที่จุดเดิม
const playMinute = p => p.evaluate(() => {
  const pl = G.player;
  if (!Bot.on) Bot.toggle(true);
  let left = 60;
  while (left > 0) {
    const s = Math.min(10, left); catchUp(s); left -= s;
    if (pl.dead) { window.__deaths = (window.__deaths || 0) + 1; respawnPlayer(true); pl.hp = pl.d.maxHp; G.mobs = G.mobs.filter(m => !m.isMvp && !m.isWB); teleportPlayer(window.__spot[0] + 0.5, window.__spot[1] + 0.5); pl.path = []; }
    if (!Bot.on) Bot.toggle(true);
  }
  return { lv: pl.baseLv, jl: pl.jobLv, exp: pl.baseExp, zeny: pl.zeny, kills: Object.values(pl.kills || {}).reduce((a, b) => a + b, 0) };
});

(async () => {
  const srv = await serve();
  BASE = `http://localhost:${srv.address().port}/index.html`;
  const opts = { headless: true, args: ['--disable-features=IntensiveWakeUpThrottling'] };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  else if (fs.existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium';
  const b = await chromium.launch(opts);
  const sfx = Date.now().toString(36).slice(-4);
  const errs = [];

  // ================= 1) เล่นสุจริต =================
  const ctx = await newCtx(b);
  const A = await open(ctx);
  await registerAndPlay(A, 'hon_' + sfx, 'Honi');
  const ua = await A.evaluate(() => Online.user.id);
  ok('เปิดเกมออนไลน์ + ระบบตรวจเซฟทำงาน (fake)', await A.evaluate(() => !!window.SaveVerifyRules && window.__FAKE_SV.on()));
  ok('รายการไอเทม/Class ฝั่งเซิร์ฟเวอร์ตรงกับเกม (ไม่ต้องรัน tools/gen_item_ids.js ใหม่)', await A.evaluate(() => Object.keys(ITEMS).every(id => __SV_DATA.items[id]) && Object.keys(JOBS).every(j => __SV_DATA.jobs[j] && __SV_DATA.jobs[j].max === JOBS[j].jobMax)));
  ok('เซฟแรกของบัญชีใหม่ผ่าน ไม่มีธง', (await flags(A, ua)).length === 0, JSON.stringify(await flags(A, ua)));
  await A.evaluate(() => { G.player.options.expMsg = false; });
  const phases = [{ lv: 15, job: 'einherjar', map: 'mistlake', jl: 15 }, { lv: 45, job: 'valkyrie', map: 'archive', jl: 20 }, { lv: 64, job: 'skadi', map: 'abyss', jl: 30 }];
  let honestMinutes = 0;
  const perPhase = [];
  for (const ph of phases) {
    const info = await build(A, ph);
    await adminSync(A, false);
    const s0 = await A.evaluate(() => ({ lv: G.player.baseLv, kills: Object.values(G.player.kills || {}).reduce((a, b) => a + b, 0), cum: SaveVerifyRules.cumBase(G.player.baseLv, G.player.baseExp), zeny: G.player.zeny }));
    let last = null;
    for (let m = 1; m <= SIM_MIN; m++) {
      await advance(A, 60);
      last = await playMinute(A);
      if (m % 5 === 0) await A.evaluate(() => { for (const e of G.player.inventory.filter(x => ITEMS[x.id].type === 'etc' && x.id !== GACHA_CONFIG.token)) UI.sell(e, e.qty, true); }); // ขายของร้าน NPC
      if (m === 7) await A.evaluate(() => { for (let i = 0; i < 3; i++) if (Gacha.canRoll(true)) Gacha.roll(true); }); // หมุนกาชา 30 ครั้งรวด
      if (m === 11) await A.evaluate(() => { gainExp(70000, 45000); G.player.zeny += 30000; addItem('white_potion', 10, true); }); // รับรางวัลเควสต์ก้อนใหญ่สุดในเกม
      await saveNow(A);
      honestMinutes++;
    }
    const log = (await svlog(A, ua)).slice(-SIM_MIN);
    const s1 = await A.evaluate(() => ({ cum: SaveVerifyRules.cumBase(G.player.baseLv, G.player.baseExp) }));
    const expPerSec = Math.round((s1.cum - s0.cum) / (SIM_MIN * 60));
    const der = JSON.parse(DATA).derived, rate = der.exp_per_kill * der.party_mul * 3;
    perPhase.push({ ...info, toLv: last.lv, kills: last.kills - s0.kills, expPerSec, ratePct: Math.round(expPerSec / rate * 1000) / 10, saves: log.length, zeny: last.zeny - s0.zeny });
    console.log('   ช่วง', JSON.stringify(perPhase[perPhase.length - 1]));
  }
  const hf = await flags(A, ua);
  ok(`เล่นสุจริต AUTO ${honestMinutes} นาทีจำลอง (3 ช่วงเลเวล + ขายของ + กาชา + รางวัลเควสต์) → ธง 0`, hf.length === 0 && perPhase.every(x => x.kills > 0), JSON.stringify(hf.slice(0, 3)));
  ok('ทุกเซฟถูกตรวจจริง (มีบันทึกการตรวจ)', (await svlog(A, ua)).length >= honestMinutes, String((await svlog(A, ua)).length));
  ok('หน้าตั้งค่าแสดงผลตรวจเซฟล่าสุด', await A.evaluate(() => { UI.toggle('w-options'); const t = (document.getElementById('sv-status') || {}).textContent || ''; UI.toggle('w-options'); return /ตรวจเซฟล่าสุด: ผ่าน|Last save check: passed/.test(t); }));
  errs.push(...A.errs);

  // ================= 2) โกงชัด ๆ (โหมด log) =================
  const cheat = async (name, fn, want) => {
    await advance(A, 30);
    const n0 = (await svlog(A, ua)).length;
    await A.evaluate(fn);
    await saveNow(A);
    const lg = (await svlog(A, ua)).slice(n0);
    const got = [...new Set(lg.flatMap(x => x.flags))];
    ok(`โกง: ${name} → ${want.join('+')} (เซฟยังรับในโหมด log)`, want.every(w => got.includes(w)) && lg.every(x => !x.reject), got.join());
  };
  await cheat('Volt +1,000,000,000', () => { G.player.zeny += 1e9; }, ['worth_rate']);
  await cheat('Lv 99 ทันที', () => { G.player.baseLv = 99; }, ['exp_rate', 'level_rate']);
  await cheat('ไอเทม id ที่ไม่มีในเกม', () => { G.player.inventory.push({ id: 'hax_blade', qty: 1, uid: 999999, refine: 0, cards: [] }); }, ['unknown_item']);
  await cheat('Stat STR 150', () => { G.player.stats.str = 150; }, ['stat_cap', 'stat_points']);
  await pause(A);
  await build(A, phases[2]); // ล้างร่องรอยการโกงด้านบน: แต่งตัวละครใหม่ให้ถูกกติกา (ผู้ดูแลตั้งค่า)
  await A.evaluate(() => { if (Bot.on) Bot.toggle(false); });
  await adminSync(A, true); // ถังว่าง (เหมือนเพิ่งโกงไป) — ไม่มีเผื่อ
  await cheat('ของปั๊มจากตลาด (รับของโดยไม่มีรายการโอน ×40 Valhalla Blade)', () => { for (let i = 0; i < 40; i++) Market.receive({ item: { id: 'valhalla_blade', refine: 0, cards: [] }, qty: 1, cost: 0, name: 'ghost', tid: 'x' + i }, false); }, ['worth_rate']);
  await A.evaluate(() => { G.player.inventory = G.player.inventory.filter(e => e.id !== 'valhalla_blade'); });

  // ================= 3) ตลาด + แลกเปลี่ยนสุจริต (ถังว่าง) =================
  await pause(A);
  await A.evaluate(() => { G.player.zeny = 50000; addItem('valhalla_blade', 1, true); });
  const B = await open(ctx);
  await registerAndPlay(B, 'buy_' + sfx, 'Bryn');
  const ub = await B.evaluate(() => Online.user.id);
  await pause(B);
  await B.evaluate(() => { G.player.zeny = 9000000; changeMap(G.player.map, G.player.x, G.player.y); });
  await A.evaluate(() => { changeMap(HOME_MAP, 20.5, 24.5); });
  await B.evaluate(() => { changeMap(HOME_MAP, 21.5, 24.5); });
  await adminSync(A, true); await adminSync(B, true);
  const mk0 = await A.evaluate(() => Date.now() + (+localStorage.getItem('fake_sv:clock') || 0));
  await advance(A, 2);
  await A.evaluate(() => { const e = G.player.inventory.find(x => x.id === 'valhalla_blade'); Market.list(e, 1, 4000000); Market.announce(true); });
  ok('ผู้ซื้อเห็นของในตลาด', await until(B, aid => { const s = Market.stalls.get(aid); return !!(s && s.items.some(x => x.id === 'valhalla_blade')); }, ua, 20000));
  const ib = await B.evaluate(aid => Market.stalls.get(aid).items.find(x => x.id === 'valhalla_blade').i, ua);
  await B.evaluate(([aid, i]) => Market.buy(aid, i, 1), [ua, ib]);
  ok('ซื้อขายสำเร็จ (Valhalla Blade 4,000,000 Volt)', await until(B, () => G.player.inventory.some(e => e.id === 'valhalla_blade') && !Market.pend, null, 20000) && await until(A, () => G.player.zeny >= 4050000, null, 20000));
  await sleep(800); await saveNow(A); await saveNow(B);
  const mk = await A.evaluate(() => window.__FAKE_SV.ledger().filter(r => r.kind === 'market').map(r => ({ u: r.user_id, consumed: !!r.consumed, paired: window.__FAKE_SV.paired(r) })));
  ok('รายการโอนตลาด: บันทึกครบ 2 ฝ่าย จับคู่ + ถูกใช้แล้ว', mk.length === 2 && mk.every(r => r.paired && r.consumed), JSON.stringify(mk));
  const since = l => l.filter(x => x.at >= mk0).flatMap(x => x.flags.map(f => f + (x.reject ? '!' : '')));
  const recentA = since(await svlog(A, ua)), recentB = since(await svlog(B, ub));
  const nA = (await svlog(A, ua)).filter(x => x.at >= mk0).length, nB = (await svlog(B, ub)).filter(x => x.at >= mk0).length;
  ok('ตลาดสุจริตมูลค่า 4 ล้าน (ถังว่าง): ไม่มีธงทั้งผู้ขาย/ผู้ซื้อ (ทุกเซฟหลังเริ่ม)', recentA.length === 0 && recentB.length === 0 && nA > 0 && nB > 0, `A=${recentA} (${nA} เซฟ) B=${recentB} (${nB} เซฟ)`);

  // แลกเปลี่ยน: B ให้ 2,500,000 Volt แลก Valhalla Blade จาก A (ถังว่างทั้งคู่)
  await pause(A); await pause(B);
  await A.evaluate(() => addItem('valhalla_blade', 1, true));
  await adminSync(A, true); await adminSync(B, true);
  const tr0 = await A.evaluate(() => Date.now() + (+localStorage.getItem('fake_sv:clock') || 0));
  await A.evaluate(() => UI.chat('/trade Bryn'));
  ok('B ได้คำขอแลกเปลี่ยน', await until(B, () => Trade.t && Trade.t.state === 'inc' && !!document.querySelector('#w-trade:not(.hidden) .tr-accept'), null, 15000));
  await B.click('#w-trade .tr-accept');
  await until(A, () => Trade.t && Trade.t.state === 'open', null, 10000);
  await A.click('#w-trade .tr-icell[data-id="valhalla_blade"]');
  await B.fill('#w-trade .tr-zeny', '2500000'); await B.press('#w-trade .tr-zeny', 'Enter');
  await until(A, () => Trade.t.their.zeny === 2500000, null, 10000);
  await A.click('#w-trade .tr-lock'); await until(B, () => Trade.t.their.locked, null, 10000);
  await B.click('#w-trade .tr-lock'); await until(A, () => Trade.t.their.locked, null, 10000);
  await A.click('#w-trade .tr-ok'); await until(B, () => Trade.t.their.confirmed, null, 10000);
  await B.click('#w-trade .tr-ok');
  ok('แลกเปลี่ยนเสร็จ', await until(A, () => !Trade.t, null, 15000) && await until(B, () => !Trade.t && G.player.inventory.some(e => e.id === 'valhalla_blade' && !e.__old), null, 15000));
  await sleep(800); await saveNow(A); await saveNow(B);
  const tr = await A.evaluate(() => window.__FAKE_SV.ledger().filter(r => r.kind === 'trade').map(r => ({ consumed: !!r.consumed, paired: window.__FAKE_SV.paired(r) })));
  const rA = (await svlog(A, ua)).filter(x => x.at >= tr0).flatMap(x => x.flags), rB = (await svlog(B, ub)).filter(x => x.at >= tr0).flatMap(x => x.flags);
  ok('แลกเปลี่ยนสุจริต 2.5 ล้าน (ถังว่าง): รายการจับคู่ + ไม่มีธง', tr.length === 2 && tr.every(r => r.paired && r.consumed) && rA.length === 0 && rB.length === 0, `${JSON.stringify(tr)} A=${rA} B=${rB}`);
  errs.push(...A.errs, ...B.errs);
  await B.close();

  // ================= 4) enforce =================
  await setCfg(A, { mode: 'enforce' });
  await adminSync(A, false);
  const zServer = await A.evaluate(() => G.player.zeny);
  await advance(A, 10);
  await A.evaluate(() => { G.player.zeny += 5e9; });
  await saveNow(A);
  ok('enforce: เซฟโกงถูกปฏิเสธ (save_rejected:worth_rate)', (await svlog(A, ua)).slice(-1)[0].reject === 'worth_rate');
  ok('enforce: ข้อความภาษาไทย + เล่นต่อได้ (เกมไม่ค้าง)', await A.evaluate(() => window.__msgs.some(t => /เซิร์ฟเวอร์ไม่รับเซฟล่าสุด/.test(t)) && G.started && SaveVerify.strikes === 1));
  ok('enforce: ความคืบหน้ายังอยู่ในสำเนาในเครื่อง + รอส่งใหม่', await A.evaluate(() => (localStorage.getItem(Online.mirrorKey()) || '').includes('"zeny":' + G.player.zeny) && !!Online.pendingSave));
  ok('enforce: ฝั่งเซิร์ฟเวอร์ปฏิเสธจริง (เก็บแถวรายงาน rejected:worth_rate)', (await flags(A, ua)).some(f => f.rule === 'rejected:worth_rate'));
  for (let i = 0; i < 2; i++) { await A.evaluate(() => { SaveVerify.holdUntil = 0; }); await saveNow(A); }
  ok('ปฏิเสธ 3 ครั้ง → หน้าต่างให้เลือก + สำรองไว้ในเครื่อง', await until(A, () => !!document.getElementById('sv-reject'), null, 8000)
    && await A.evaluate(() => Object.keys(localStorage).some(k => k.startsWith('nm_rejected_backup_'))));
  await A.click('#sv-reload');
  await A.waitForSelector('#btn-continue', { state: 'visible', timeout: 120000 });
  await A.click('#btn-continue'); await intoGame(A);
  ok('โหลดเซฟจากเซิร์ฟเวอร์ = ค่าที่เซิร์ฟเวอร์รับ (ไม่มี Volt +5e9)', await A.evaluate(z => G.player.zeny === z, zServer), String(await A.evaluate(() => G.player.zeny)));
  ok('หลังโหลดใหม่เซฟได้ตามปกติ', await (async () => { await advance(A, 10); await A.evaluate(() => { G.player.zeny += 10; }); await saveNow(A); return !(await svlog(A, ua)).slice(-1)[0].reject; })());
  await setCfg(A, { mode: 'log' });

  // ================= 6) บัญชีถูกปฏิเสธ =================
  await A.evaluate(u => localStorage.setItem('fake_sv:ban:' + u, JSON.stringify('ทดสอบระบบ')), ua);
  await A.reload({ timeout: 180000 });
  await A.waitForSelector('#btn-continue', { state: 'visible', timeout: 120000 }).catch(() => {});
  ok('บัญชีถูกปฏิเสธ: ขึ้นหน้าต่างพร้อมเหตุผลภาษาไทย ไม่เข้าเกม', await until(A, () => { const e = document.getElementById('sv-ban'); return !!e && /ถูกระงับ/.test(e.textContent) && /ทดสอบระบบ/.test(e.textContent) && !G.started; }, null, 60000));
  errs.push(...A.errs);
  await ctx.close();

  // ================= 5) เซิร์ฟเวอร์ยังไม่ได้รัน migration =================
  const ctx2 = await newCtx(b, { noServer: true });
  const C = await open(ctx2), D = await open(ctx2);
  await registerAndPlay(C, 'old_' + sfx, 'Cato'); await registerAndPlay(D, 'olb_' + sfx, 'Dara');
  const uc = await C.evaluate(() => Online.user.id);
  await C.evaluate(() => { addItem('apple', 5, true); changeMap(HOME_MAP, 20.5, 24.5); const e = G.player.inventory.find(x => x.id === 'apple'); Market.list(e, 2, 100); Market.announce(true); });
  await D.evaluate(() => changeMap(HOME_MAP, 21.5, 24.5));
  const okSee = await until(D, cid => { const s = Market.stalls.get(cid); return !!(s && s.items.some(x => x.id === 'apple')); }, uc, 20000);
  if (okSee) { const ia = await D.evaluate(cid => Market.stalls.get(cid).items.find(x => x.id === 'apple').i, uc); await D.evaluate(([cid, i]) => Market.buy(cid, i, 2), [uc, ia]); }
  ok('ไม่มี RPC: ตลาดซื้อขายได้ตามเดิม', okSee && await until(D, () => G.player.inventory.some(e => e.id === 'apple' && e.qty >= 2) && !Market.pend, null, 20000));
  await saveNow(C); await saveNow(D);
  ok('ไม่มี RPC: SaveVerify.server = false + เซฟคลาวด์ได้ + ไม่มีหน้าต่าง/ข้อความปฏิเสธ', await C.evaluate(() => SaveVerify.server === false && !document.querySelector('.sv-modal') && JSON.parse(localStorage.getItem('fake_sb_db')).chars[Online.user.id].data.chars[0].zeny === G.player.zeny && G.player.zeny >= 700));
  errs.push(...C.errs, ...D.errs);
  await ctx2.close();

  ok('ไม่มี error ในหน้าเกม', errs.length === 0, errs.slice(0, 3).join(' || '));
  await b.close(); srv.close();
  console.log(`\n${pass} ผ่าน / ${fail} ไม่ผ่าน`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
