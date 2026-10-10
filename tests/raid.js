'use strict';
// ============================================================
//  รุมบอส (js/raid.js) — 4 ผู้เล่นใน browser context เดียว ผ่าน Supabase ปลอม (tests/fake_supabase.js) — ไม่ต่อ Supabase จริง
//  ครอบคลุม: MVP ตัวเดียวกันทั้งแผนที่ (รวม sid) · เลือดตรงกันทุกเครื่อง · นับผู้ช่วย + โบนัสดาเมจ · ความแค้นสลับ · ยืนเบียดโดนแรงขึ้น
//            รวมพลข้ามแผนที่ + แตะนำทาง · รางวัลทุกคนที่ถึงเกณฑ์ (ไม่ถึง = ไม่ได้) · ของเพิ่มอันดับ 1 · การ์ดสรุป
//            เข้าไปช่วยตอน MVP ของตัวเองติดคูลดาวน์ (ได้ EXP ไม่รีเซ็ตคูลดาวน์) · Ancient ใช้เกณฑ์ + ผู้ช่วยเดียวกัน · คิว Ancient รับถึง 6
//  รัน:  NODE_PATH=$(npm root -g) CHROME=/path/to/chrome node tests/raid.js   (SHOTS=<โฟลเดอร์> = เก็บภาพหน้าจอ)
// ============================================================
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const FAKE = path.join(__dirname, 'fake_supabase.js');
const SHOTS = process.env.SHOTS || '';
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
const until = async (page, fn, arg, ms = 45000) => { try { await page.waitForFunction(fn, arg, { timeout: ms, polling: 150 }); return true; } catch (e) { return false; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tap = async (p, sel) => { await until(p, s => { const e = document.querySelector(s); return !!e && !!e.offsetParent; }, sel); return p.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, sel); };
const shot = async (p, name, vp) => {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  if (vp) await p.setViewportSize(vp);
  await p.bringToFront(); await sleep(700);
  await p.screenshot({ path: path.join(SHOTS, name + '.png') });
};

let BASE;
async function player(ctx, user, name) {
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.stack.split('\n').slice(0, 3).join(' | ')));
  p.setDefaultTimeout(120000);
  await p.goto(BASE, { timeout: 180000 });
  await p.waitForFunction(() => typeof Online !== 'undefined' && !document.querySelector('#auth').classList.contains('hidden'), null, { timeout: 120000 });
  await p.click('#au-tabs [data-mode="register"]');
  await p.fill('#au-user', user); await p.fill('#au-pass', 'pass1234'); await p.fill('#au-pass2', 'pass1234'); await p.click('#au-submit');
  await p.waitForSelector('#cr-name', { state: 'visible', timeout: 60000 });
  await p.fill('#cr-name', name); await p.click('#cr-start');
  await p.waitForFunction(() => G.started, null, { timeout: 60000 });
  await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {});
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 8000, polling: 250 }).catch(() => {});
  await p.evaluate(() => document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden')));
  // ทดสอบระบบรุม ไม่ใช่ฝีมือ: เลือดเต็มตลอด ไม่ตีกลับอัตโนมัติ (ไม่ให้ดาเมจนอกแผนเข้าตาราง)
  await p.evaluate(() => {
    G.player.baseLv = 30; recalc(); G.player.options.autoCounter = false;
    window.__god = setInterval(() => { const pl = G.player; if (pl.dead) { pl.dead = false; } pl.hp = pl.d.maxHp; pl.target = null; }, 100);
  });
  await until(p, () => Online.online && !!Online.mapChannel, null, 90000); // เครื่องโหลดหนัก: รอต่อช่องให้ครบก่อน
  p.uid = await p.evaluate(() => Online.user.id);
  p.nm = name;
  return p;
}
const goMap = (p, map) => p.evaluate(async m => { changeMap(m, 20, 20); await new Promise(r => setTimeout(r, 400)); }, map);
const mvp = p => p.evaluate(() => { const m = Raid.mvpLive(); return m ? { sid: m.raidSid, hp: Math.round(m.hp), max: m.maxHp, guest: !!m.raidGuest, cd: !!m.raidCd } : null; });
const xp = p => p.evaluate(() => G.player.baseExp + G.player.baseLv * 1e9 + G.player.jobExp * 1e-6);

(async () => {
  const srv = await serve();
  BASE = `http://localhost:${srv.address().port}/index.html`;
  const opts = { headless: true, args: ['--disable-features=IntensiveWakeUpThrottling'] };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  else if (fs.existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium';
  const b = await chromium.launch(opts);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  await ctx.addInitScript({ path: FAKE });
  // ห้ามออกเน็ตจริง: ทุก https ถูกตัด (นับคำขอไป *.supabase.co แยก) · ตอบ settings ของโดเมนปลอม · สคริปต์ CDN ของ supabase = ว่าง
  let real = 0;
  await ctx.route(/^https:\/\//, r => {
    const u = r.request().url();
    if (/supabase\.co\b/.test(u)) { real++; return r.abort(); }
    if (/fake\.supabase\.test\/auth\/v1\/settings/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: '{"mailer_autoconfirm":true}' });
    if (/cdn\.jsdelivr\.net\/npm\/@supabase/.test(u)) return r.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    return r.abort();
  });

  const sfx = Date.now().toString(36).slice(-4);
  const P = [];
  for (const n of ['Alice', 'Bobby', 'Carol', 'Dave']) P.push(await player(ctx, n.toLowerCase() + '_' + sfx, n));
  const [A, B, C, D] = P;
  ok('ออนไลน์ครบ 4 คน', (await Promise.all(P.map(p => p.evaluate(() => Online.online)))).every(Boolean), JSON.stringify(await Promise.all(P.map(p => p.evaluate(() => [Online.online, !!Online.mapChannel, !!Online.user, G.map && G.map.id, document.querySelector('#net') && document.querySelector('#net').className])))));
  // ส่วนแรกทดสอบ MVP: ปิด Ancient ไว้ก่อน · หน้าต่างนับผู้ช่วย 10 วิ → 1 ชม.ในเทสต์ / การ์ดสรุปไม่ปิดเอง (เครื่องโหลดหนัก ขั้นตอนเทสต์ห่างกันเกิน 10 วิได้ — ตรรกะเดิม)
  for (const p of P) await p.evaluate(() => { WB.WINDOW = 1; WB.st = {}; G.player.mvpAt = {}; Raid.HELP_SEC = 3600; Raid.RESULT_SEC = 900; Raid.CALL_SEC = 900; });

  // ---- 1) MVP ตัวเดียวกันทั้งแผนที่ ----
  for (const p of [A, B, C]) { await goMap(p, 'mistlake'); await sleep(300); }
  const sameSid = async ps => { const v = await Promise.all(ps.map(mvp)); return v.every(x => x && x.sid === v[0].sid && x.hp === v[0].hp) ? v[0] : null; };
  let conv = null;
  for (let i = 0; i < 40 && !conv; i++) { await sleep(250); conv = await sameSid([A, B, C]); }
  ok('3 คนเห็น MVP ตัวเดียวกัน (sid/เลือดตรงกัน)', !!conv, JSON.stringify(await Promise.all([A, B, C].map(mvp))));
  const MAX = conv ? conv.max : 0;

  // ---- 2) เลือดร่วม + ผู้ช่วย + โบนัส ----
  await A.evaluate(() => damageMob(Raid.mvpLive(), 400));
  ok('A ตี 400 → ทุกเครื่องเลือดลด 400 (ตีคนเดียว ไม่มีโบนัส)', (await Promise.all([B, C].map(p => until(p, h => Raid.mvpLive() && Math.round(Raid.mvpLive().hp) === h, MAX - 400, 30000)))).every(Boolean));
  await B.evaluate(() => damageMob(Raid.mvpLive(), 300));
  const want2 = MAX - 400 - 330; // B เห็น A ตีมาใน 10 วิ → ผู้ช่วย 2 คน → +10%
  ok('B ตี 300 → +10% (ผู้ช่วย 2) = 330 ทุกเครื่อง', (await Promise.all([A, C].map(p => until(p, h => Raid.mvpLive() && Math.round(Raid.mvpLive().hp) === h, want2, 30000)))).every(Boolean),
    String(await A.evaluate(() => Math.round(Raid.mvpLive().hp))) + ' / ' + want2);
  const hA0 = await A.evaluate(() => Raid.mvpLive().hp);
  await C.evaluate(() => damageMob(Raid.mvpLive(), 1000));
  ok('C ตี 1000 → ผู้ช่วย 3 คน +20% = 1200', await until(A, h => Math.round(h - Raid.mvpLive().hp) === 1200, hA0, 30000), String(await A.evaluate(h => Math.round(h - Raid.mvpLive().hp), hA0)));
  ok('ทุกเครื่องนับผู้ช่วย = 3', (await Promise.all([A, B, C].map(p => p.evaluate(() => Raid.helpers(Raid.mvpLive()))))).every(n => n === 3));
  await C.evaluate(() => Raid.bar(true));
  ok('แถบบอสโชว์ผู้ช่วยเป็นตัวเลข 3 + โบนัส +20%', await until(C, () => { const e = document.querySelector('#raid-bar'); return !!e && !e.hidden && e.querySelector('.rb-h b').textContent === '3' && /\+20%/.test(e.querySelector('.rb-bonus').textContent); }),
    await C.evaluate(() => (document.querySelector('#raid-bar') || {}).textContent));
  ok('แถบบอสไม่มีหลอด/แคปซูล (border-radius ≤ 8px ทุกชิ้น)', await C.evaluate(() => [...document.querySelectorAll('#raid-bar, #raid-bar *')].every(e => (parseFloat(getComputedStyle(e).borderTopLeftRadius) || 0) <= 8)));
  await shot(C, 'raid-bar-1600');

  // ---- 3) ความแค้นสลับ + ยืนเบียด ----
  for (const p of [A, B, C]) await p.evaluate(() => Online.sendPos(true));
  await sleep(600);
  let hs = null;
  for (let i = 0; i < 3; i++) {
    hs = await Promise.all([A, B, C].map(p => p.evaluate(() => { Raid.tick(); const m = Raid.mvpLive(); return { h: Raid.holder(m), f: m.focus ? m.focus.id : null, me: Raid.myId() }; })));
    if (hs.every(x => x.h === hs[0].h)) break;
  }
  ok('ทุกเครื่องเห็นบอสเล็งคนเดียวกัน', !!hs[0].h && hs.every(x => x.h === hs[0].h), JSON.stringify(hs));
  ok('คนที่ไม่ได้ถือความแค้น: บอสหันไปหาคนนั้น (focus)', hs.some(x => x.me !== x.h) && hs.filter(x => x.me !== x.h).every(x => x.f === x.h) && hs.filter(x => x.me === x.h).every(x => !x.f));
  const other = [A, B, C].find((p, i) => hs[i].me !== hs[i].h);
  ok('บอสตีปกติใส่คนอื่น = เราไม่เสียเลือด', !!other && await other.evaluate(() => { clearInterval(window.__god); const pl = G.player, h0 = pl.hp, m = Raid.mvpLive(); if (!m.focus) { window.__god = setInterval(() => { G.player.hp = G.player.d.maxHp; }, 100); return false; } mobAttack(m, m.focus); const r = pl.hp === h0; window.__god = setInterval(() => { G.player.hp = G.player.d.maxHp; }, 100); return r; }));
  const at = await A.evaluate(() => ({ x: G.player.x, y: G.player.y }));
  for (const p of [B, C]) await p.evaluate(a => { teleportPlayer(a.x + 0.3, a.y); Online.sendPos(true); }, at);
  ok('A เห็นเพื่อน 2 คนยืนติด → ท่าป้ายแดงแรงขึ้น ×1.5', await until(A, () => Raid.stackMul() === 1.5, null, 30000), String(await A.evaluate(() => Raid.stackMul())));
  ok('ดาเมจท่าป้ายแดงตอนเบียด 100 → 150', await A.evaluate(() => { clearInterval(window.__god); const pl = G.player; pl.hp = pl.d.maxHp; const h0 = pl.hp; Raid.teleBoss = Raid.mvpLive(); damagePlayer(100); Raid.teleBoss = null; const d = h0 - pl.hp; window.__god = setInterval(() => { G.player.hp = G.player.d.maxHp; }, 100); return d === 150; }));
  for (const p of [B, C]) await p.evaluate(() => { teleportPlayer(20, 24); Online.sendPos(true); });

  // ---- 4) รวมพลข้ามแผนที่ ----
  await goMap(D, 'eldheim');
  await sleep(500);
  await tap(A, '#raid-bar .rb-call');
  ok('Dave (อีกแผนที่) ได้โทสต์รวมพล', await until(D, () => { const e = document.querySelector('#raid-call'); return !!e && !e.hidden && /Seraph/.test(e.textContent) && /Alice/.test(e.textContent); }), await D.evaluate(() => JSON.stringify({ t: (document.querySelector('#raid-call') || {}).textContent, call: Raid.call, rch: !!Raid.rch, on: Online.online, map: G.map.id, log: document.querySelector('#chat-log').textContent.slice(-150) })));
  ok('Bobby (แผนที่เดียวกัน) ไม่เด้งโทสต์ แต่มีในแชต', await until(B, () => /\[รวมพล\] Alice/.test(document.querySelector('#chat-log').textContent)) && await B.evaluate(() => { const e = document.querySelector('#raid-call'); return !e || e.hidden; }));
  ok('ปุ่มรวมพลติดคูลดาวน์ (ตัวเลขวินาที)', await A.evaluate(() => { Raid.bar(true); const b = document.querySelector('#raid-bar .rb-call'); return b.disabled && /\d+/.test(b.textContent) && Raid.rally() === false; }), await A.evaluate(() => JSON.stringify({ left: Raid.rallyLeft(), on: Raid.on(), boss: !!Raid.boss(), btn: (document.querySelector('#raid-bar .rb-call') || {}).outerHTML })));
  await shot(D, 'rally-toast-1600');
  await shot(D, 'rally-toast-390', { width: 390, height: 844 });
  await D.setViewportSize({ width: 1600, height: 900 });
  await tap(D, '#raid-call .rc-go').catch(() => {});
  ok('แตะ "ไปช่วย" → นำทางไปที่ MVP', await D.evaluate(() => MM.navT === 'mvp:seraph_pudding' && !!Nav.target), await D.evaluate(() => JSON.stringify({ navT: MM.navT, t: Nav.target && Nav.target.name, call: !!Raid.call, log: document.querySelector('#chat-log').textContent.slice(-200) })));
  await D.evaluate(() => Nav.cancel(true));

  // ---- 5) Dave กลับมา (MVP ของตัวเองเกิด → รวมเป็นตัวเดียวกัน) แล้วตีนิดเดียว (ไม่ถึงเกณฑ์ 1%) ----
  await goMap(D, 'mistlake');
  conv = null;
  for (let i = 0; i < 40 && !conv; i++) { await sleep(250); conv = await sameSid([A, B, C, D]); }
  ok('Dave เข้าแผนที่ → MVP ของเขารวมกับตัวที่ทุกคนตีอยู่', !!conv && conv.hp < MAX - 1900, JSON.stringify(await Promise.all([A, D].map(mvp))));
  await D.evaluate(() => damageMob(Raid.mvpLive(), 1));
  await sleep(600);
  await shot(B, 'raid-bar-390', { width: 390, height: 844 });
  await B.setViewportSize({ width: 1600, height: 900 });

  // ---- 6) ปราบ: ทุกคนที่ถึงเกณฑ์ได้รางวัล ----
  for (const p of P) await p.evaluate(() => { (G.player.kills || (G.player.kills = {})).seraph_pudding = 3; }); // ไม่ใช่ปราบครั้งแรก = ไม่มีฉากเล่าเรื่องบังการ์ด (ภาพหน้าจอ)
  const x0 = await Promise.all(P.map(xp));
  const pot0 = await A.evaluate(() => countItem('white_potion') + countItem('blue_potion') * 100);
  await A.evaluate(() => damageMob(Raid.mvpLive(), 1e9));
  ok('ทุกเครื่องเห็น MVP ตาย', (await Promise.all(P.map(p => until(p, () => !Raid.mvpLive(), null, 30000)))).every(Boolean));
  await sleep(1500);
  const x1 = await Promise.all(P.map(xp));
  ok('Alice/Bobby/Carol ได้ EXP (ถึงเกณฑ์)', [0, 1, 2].every(i => x1[i] > x0[i]), x0.map((v, i) => Math.round(x1[i] - v)).join(','));
  ok('Dave (ดาเมจ 1 ต่ำกว่า 1%) ไม่ได้ EXP', x1[3] === x0[3]);
  const rA = await A.evaluate(() => Raid.res['mvp:mistlake']);
  ok('Alice อันดับ 1 ได้ของเพิ่ม + โบนัส EXP ตามผู้ช่วย', rA && rA.rank === 1 && rA.extra.length === 2 && rA.bonus >= 0.2, JSON.stringify(rA));
  ok('ของเพิ่มเข้ากระเป๋าจริง', (await A.evaluate(() => countItem('white_potion') + countItem('blue_potion') * 100)) >= pot0 + 102);
  ok('การ์ดสรุป (Bobby) มีผู้ช่วย/รางวัล/อันดับ', await until(B, () => { const e = document.querySelector('#raid-result'); return !!e && !e.hidden && /ผู้ช่วย/.test(e.textContent) && /ได้รางวัลเต็ม/.test(e.textContent) && /Alice/.test(e.textContent); }),
    await B.evaluate(() => (document.querySelector('#raid-result') || {}).textContent));
  ok('การ์ดสรุป (Dave) บอกว่าไม่ถึงเกณฑ์', await until(D, () => { const e = document.querySelector('#raid-result'); return !!e && !e.hidden && /ไม่ได้รางวัล/.test(e.textContent); }));
  ok('การ์ดสรุปมุมมน ≤ 8px', await B.evaluate(() => [...document.querySelectorAll('#raid-result .rr-card, #raid-result .rr-card *')].every(e => (parseFloat(getComputedStyle(e).borderTopLeftRadius) || 0) <= 8)));
  await shot(B, 'result-1600');
  await shot(B, 'result-390', { width: 390, height: 844 });
  await B.setViewportSize({ width: 1600, height: 900 });
  for (const p of P) await p.evaluate(() => Raid.closeResult());

  // ---- 7) ช่วยตอน MVP ของตัวเองติดคูลดาวน์ ----
  const cdA = await A.evaluate(() => G.player.mvpAt.mistlake);
  ok('Alice ติดคูลดาวน์ MVP แล้ว', cdA > Date.now());
  await goMap(D, 'eldheim'); await goMap(D, 'mistlake'); // Dave ไม่ได้ปราบ → MVP ของเขาเกิดใหม่
  ok('Alice เห็น MVP ของ Dave (เข้าไปช่วยได้ ระหว่างคูลดาวน์)', await until(A, () => { const m = Raid.mvpLive(); return !!m && m.raidGuest && m.raidCd; }, null, 30000), JSON.stringify(await A.evaluate(() => { const m = Raid.mvpLive(); return m && { g: m.raidGuest, cd: m.raidCd }; })));
  const sidAD = await Promise.all([A, D].map(mvp));
  ok('ตัวเดียวกับของ Dave', sidAD[0] && sidAD[1] && sidAD[0].sid === sidAD[1].sid);
  const xa0 = await xp(A), potA0 = await A.evaluate(() => countItem('white_potion') + countItem('blue_potion') + countItem('yellow_potion'));
  await A.evaluate(() => damageMob(Raid.mvpLive(), 200));
  await until(D, h => Raid.mvpLive() && Raid.mvpLive().hp <= h, MAX - 200, 30000);
  await D.evaluate(() => damageMob(Raid.mvpLive(), 1e9));
  ok('Alice: MVP ตาย', await until(A, () => !Raid.mvpLive(), null, 30000));
  await sleep(1200);
  ok('Alice ได้ EXP แต่คูลดาวน์ไม่รีเซ็ต + ไม่ได้โบนัส MVP', (await xp(A)) > xa0 && (await A.evaluate(c => G.player.mvpAt.mistlake === c, cdA)) &&
    (await A.evaluate(() => countItem('white_potion') + countItem('blue_potion') + countItem('yellow_potion'))) === potA0, JSON.stringify(await A.evaluate(() => Raid.res['mvp:mistlake'])));

  // ---- 8) Ancient: ผู้ช่วย + เกณฑ์ 0.5% ----
  for (const p of P) await p.evaluate(async () => { WB.WINDOW = WB.PERIOD; WB.st = {}; try { localStorage.removeItem('nm_wb'); } catch (e) {} WB.tick(); await new Promise(r => setTimeout(r, 200)); });
  ok('Ancient เกิดทุกเครื่อง', (await Promise.all(P.map(p => until(p, () => !!WB.live(), null, 30000)))).every(Boolean));
  const need = await A.evaluate(() => Raid.need(WB.live()));
  await A.evaluate(n => damageMob(WB.live(), n * 2), need);
  await B.evaluate(n => damageMob(WB.live(), n * 2), need);
  ok('ผู้ช่วย Ancient นับจาก hit ของ WB (Carol เห็น 2)', await until(C, () => Raid.helpers(WB.live()) === 2, null, 30000), String(await C.evaluate(() => Raid.helpers(WB.live()))));
  await C.evaluate(() => damageMob(WB.live(), 5));
  await sleep(500);
  const w0 = await Promise.all(P.map(xp));
  await A.evaluate(() => damageMob(WB.live(), 1e10));
  ok('Ancient ตายทุกเครื่อง', (await Promise.all(P.map(p => until(p, () => !WB.live(), null, 30000)))).every(Boolean));
  await sleep(1500);
  const w1 = await Promise.all(P.map(xp));
  ok('Alice/Bobby ได้ EXP · Carol (ดาเมจ 5) ไม่ได้', w1[0] > w0[0] && w1[1] > w0[1] && w1[2] === w0[2], w0.map((v, i) => Math.round(w1[i] - v)).join(','));
  ok('การ์ด Ancient ของ Carol มีบรรทัดรุมบอส "ไม่ได้รางวัล"', await until(C, () => { const e = document.querySelector('#wb-result'); return !!e && !e.hidden && /ไม่ได้รางวัล/.test(e.textContent) && /ผู้ช่วย/.test(e.textContent); }),
    await C.evaluate(() => (document.querySelector('#wb-result') || {}).textContent));

  // ---- 9) คิว Ancient รับถึง 6 · MVP ยัง 3 ----
  const plan = await A.evaluate(() => {
    const mk = (i, t) => ({ id: 'q' + i, name: 'Q' + i, lv: 30, t, since: 1000 + i, n: 1, g: 0, o: '' });
    const wb = 'wb:' + Object.keys(WB.MAPS)[0];
    return { wb: MM.plan([0, 1, 2, 3, 4, 5, 6].map(i => mk(i, wb))).map(x => 1 + x.fill.length), mvp: MM.plan([0, 1, 2, 3, 4].map(i => mk(i, 'mvp:seraph_pudding'))).map(x => 1 + x.fill.length) };
  });
  ok('คิว Ancient 7 คน → ปาร์ตี้ 6 (คนที่ 7 รอ) · คิว MVP 5 คน → 3', JSON.stringify(plan.wb) === '[6]' && JSON.stringify(plan.mvp) === '[3]', JSON.stringify(plan));

  ok('ไม่มี error ในหน้าเกม', P.every(p => !p.errs.length), P.map(p => p.errs.join(' || ')).filter(Boolean).join(' ## '));
  ok('ไม่มีคำขอไป Supabase จริง', real === 0, String(real));
  await b.close(); srv.close();
  console.log(fail ? `${fail} FAILED, ${pass} passed` : `ALL ${pass} PASSED`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
