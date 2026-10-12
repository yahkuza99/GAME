'use strict';
// ============================================================
//  ป้องกันล็อกอินซ้ำ (js/session_guard.js) — ใหม่ล่าสุดชนะ · หน้าเก่าหยุดเซฟทันที + ขึ้นหน้าต่าง + ตัดช่องเรียลไทม์
//  ส่วน 1 ออนไลน์ (Supabase ปลอม tests/fake_supabase.js — ไม่ต่อ Supabase จริง): B ล็อกอินทับ A · A ไม่เขียนเซฟอีกเลย · B ไม่กระทบ
//          ล็อกอินคนเดียวไม่โดนเตะมั่ว · ออก+เข้าใหม่เครื่องเดิมไม่โดนเตะ · A กลับหน้าล็อกอินแล้วไม่แย่งคืนเอง · A ล็อกอินใหม่ = B โดนเตะ
//  ส่วน 2 ในเครื่อง (?local-test=1): สองแท็บบัญชีเดียวกัน · คนละบัญชีไม่เตะกัน
//  ส่วน 3 ตรรกะเทียบ claim/hb โดยตรง (ชนกันพร้อมกัน · นาฬิกาเหลื่อม · hb ปลุก)
//  รัน:  NODE_PATH=$(npm root -g) CHROME=/path/to/chrome node tests/duplogin.js   (SHOTS=<โฟลเดอร์> = เก็บภาพหน้าต่างที่ 390x844 และ 1600x900)
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
const until = async (page, fn, arg, ms = 45000) => { try { await page.waitForFunction(fn, arg, { timeout: ms, polling: 100 }); return true; } catch (e) { return false; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = async (p, name, vp) => {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await p.setViewportSize(vp); await p.bringToFront(); await sleep(500);
  await p.screenshot({ path: path.join(SHOTS, name + '.png') });
};

let BASE, ctx;
async function open(url, restored) {
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.stack.split('\n').slice(0, 3).join(' | ')));
  p.setDefaultTimeout(120000);
  await p.goto(url, { timeout: 180000 });
  // restored = มีเซสชันค้างในเครื่อง → ระบบกู้เซสชันเองแล้วเข้าหน้าเลือกตัวละคร (ไม่ผ่านหน้าล็อกอิน)
  if (restored) await p.waitForSelector('#btn-continue', { state: 'visible', timeout: 120000 });
  else await p.waitForFunction(() => typeof Online !== 'undefined' && !document.querySelector('#auth').classList.contains('hidden'), null, { timeout: 120000 });
  return p;
}
async function intoGame(p) {
  await p.waitForFunction(() => G.started, null, { timeout: 60000 });
  await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {});
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 8000, polling: 250 }).catch(() => {});
  await p.evaluate(() => document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden')));
}
// สมัคร + สร้างตัวละคร + เข้าเกม
async function registerAndPlay(p, user, name) {
  await p.click('#au-tabs [data-mode="register"]');
  await p.fill('#au-user', user); await p.fill('#au-pass', 'pass1234'); await p.fill('#au-pass2', 'pass1234'); await p.click('#au-submit');
  await p.waitForSelector('#cr-name', { state: 'visible', timeout: 120000 });
  await p.fill('#cr-name', name); await p.click('#cr-start');
  await intoGame(p);
}
// ล็อกอินบัญชีเดิม (หน้าใหม่) → เลือกตัวละคร → เข้าเกม • คืนเวลาที่รอจนเห็นปุ่มเข้าเกม (ms)
async function loginAndPlay(p, user) {
  await p.click('#au-tabs [data-mode="login"]');
  await p.fill('#au-user', user); await p.fill('#au-pass', 'pass1234');
  const t0 = Date.now();
  await p.click('#au-submit');
  await p.waitForSelector('#btn-continue', { state: 'visible', timeout: 120000 });
  const dt = Date.now() - t0;
  await p.click('#btn-continue');
  await intoGame(p);
  return dt;
}
// นับการเขียนเซฟทุกทาง (localStorage ของเซฟ/สำเนา/บัญชีในเครื่อง + upsert ตาราง characters)
const instrument = p => p.evaluate(() => {
  window.__w = { ls: 0, up: 0 };
  const o = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k) { if (this === localStorage && /^(nm_cloud_mirror_|nm_char_|ragnarok_web_save)/.test(k)) window.__w.ls++; return o.apply(this, arguments); };
  if (Online.sb) {
    const f = Online.sb.from;
    Online.sb.from = t => { const q = f(t); if (t === 'characters') { const u = q.upsert; q.upsert = function (r) { window.__w.up++; return u.call(q, r); }; } return q; };
  }
});
const writes = p => p.evaluate(() => ({ ...window.__w }));
const kicked = p => p.evaluate(() => !!(SessionGuard.kicked && Online.kicked && document.getElementById('dup-kick')));
const notKickedFor = async (p, ms) => { await sleep(ms); return p.evaluate(() => !SessionGuard.kicked && !Online.kicked && !document.getElementById('dup-kick')); };
const dbZeny = (p, uid) => p.evaluate(u => { const d = JSON.parse(localStorage.getItem('fake_sb_db')); const r = d.chars[u]; return r ? r.data.chars[r.data.active].zeny : null; }, uid);
const mirrorHas = (p, uid, z) => p.evaluate(([u, z]) => (localStorage.getItem('nm_cloud_mirror_' + u) || '').includes('"zeny":' + z), [uid, z]);

(async () => {
  const srv = await serve();
  BASE = `http://localhost:${srv.address().port}/index.html`;
  const opts = { headless: true, args: ['--disable-features=IntensiveWakeUpThrottling'] };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  else if (fs.existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium';
  const b = await chromium.launch(opts);
  let real = 0;
  const block = async c => c.route(/^https:\/\//, r => {
    const u = r.request().url();
    if (/supabase\.co\b/.test(u)) { real++; return r.abort(); }
    if (/fake\.supabase\.test\/auth\/v1\/settings/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: '{"mailer_autoconfirm":true}' });
    if (/cdn\.jsdelivr\.net\/npm\/@supabase/.test(u)) return r.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    return r.abort();
  });
  const errs = [];

  // ================= ส่วน 1: ออนไลน์ =================
  ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  await ctx.addInitScript({ path: FAKE });
  await block(ctx);
  const sfx = Date.now().toString(36).slice(-4), user = 'dup_' + sfx;

  const A = await open(BASE);
  await registerAndPlay(A, user, 'Aria');
  await until(A, () => Online.online && SessionGuard.sentAt > 0, null, 60000);
  const uid = await A.evaluate(() => Online.user.id);
  ok('A ออนไลน์ + ประกาศตัวแล้ว · ยังไม่โดนเตะ', await A.evaluate(() => Online.online && SessionGuard.uid === Online.user.id && !SessionGuard.kicked));
  ok('ล็อกอินคนเดียว ไม่โดนเตะมั่ว (รอเกิน settle + heartbeat)', await notKickedFor(A, 2500));
  await instrument(A);
  await A.evaluate(() => { G.player.zeny = 111; saveGame(true, true); });
  await until(A, () => window.__w.up > 0, null, 15000);
  ok('A เซฟก่อนโดนเตะได้ปกติ (กล้องนับเห็นการเขียน)', (await writes(A)).up > 0 && (await writes(A)).ls > 0, JSON.stringify(await writes(A)));
  // A มีเซฟค้างรอ (หน่วง 4 วิ) ตอน B เข้ามา
  await A.evaluate(() => { G.player.zeny = 222; saveGame(true, false); });

  const B = await open(BASE);
  await B.evaluate(() => { const s0 = SessionGuard.settle.bind(SessionGuard); SessionGuard.settle = async () => { await s0(); window.__sinceClaim = performance.now() - SessionGuard.sentAt; }; });
  await loginAndPlay(B, user);
  const dt = Math.round(await B.evaluate(() => window.__sinceClaim));
  ok('B ล็อกอินทับ → A โดนเตะ (หน้าต่างขึ้น + Online.kicked)', await until(A, () => SessionGuard.kicked && Online.kicked && !!document.getElementById('dup-kick'), null, 8000));
  ok('B อ่านเซฟหลังประกาศตัวแล้วอย่างน้อย ~1.2 วิ (settle)', dt >= 1150, dt + 'ms');
  ok('B ไม่ถูกเตะ + ออนไลน์ปกติ', await B.evaluate(() => Online.online && !SessionGuard.kicked && !document.getElementById('dup-kick')));
  ok('หน้าต่างบนหน้า A: ข้อความไทย + ปุ่มเดียวกลับหน้าล็อกอิน', await A.evaluate(() => {
    const e = document.getElementById('dup-kick'); return !!e && /บัญชีนี้เข้าเล่นจากเครื่อง\/แท็บอื่นแล้ว/.test(e.textContent) && e.querySelectorAll('button').length === 1 && /กลับหน้าล็อกอิน/.test(e.textContent);
  }));
  ok('A ตัดช่องเรียลไทม์ทั้งหมด (sb/แมป/แชต เป็นว่าง)', await A.evaluate(() => Online.sb === null && Online.mapChannel === null && Online.chatChannel === null && !Online.online));
  ok('เซฟค้างของ A ถูกทิ้ง (ไม่มี timer/pending)', await A.evaluate(() => Online.saveTimer === null && Online.pendingSave === null));

  // B เปลี่ยนค่าแล้วเซฟ → ขึ้นคลาวด์ • A ที่โดนเตะพยายามเซฟทุกทาง
  await B.evaluate(() => { G.player.zeny = 424242; saveGame(true, true); });
  ok('B เซฟขึ้นคลาวด์ได้ (zeny 424242)', await until(B, u => { const d = JSON.parse(localStorage.getItem('fake_sb_db')); const r = d.chars[u]; return !!r && r.data.chars[r.data.active].zeny === 424242; }, uid, 15000));
  const w0 = await writes(A);
  await A.evaluate(() => {
    G.player.zeny = 999999;
    saveGame(true, true); saveGame(true, false); Acct.persist(true); Acct.persist(false, true);
    window.dispatchEvent(new Event('beforeunload')); Online.queueSave({ v: 2, active: 0, chars: [], savedAt: Date.now() }, true);
  });
  await sleep(5200);
  const w1 = await writes(A);
  ok('A หลังโดนเตะ: เขียนเซฟ 0 ครั้ง (localStorage + upsert)', w1.ls === w0.ls && w1.up === w0.up, JSON.stringify([w0, w1]));
  ok('คลาวด์ยังเป็นค่าของ B (ไม่โดน A ทับ)', (await dbZeny(B, uid)) === 424242, String(await dbZeny(B, uid)));
  ok('สำเนาในเครื่องไม่มีค่าของ A หลังโดนเตะ', !(await mirrorHas(B, uid, 999999)));
  await B.evaluate(() => { G.player.zeny = 515151; saveGame(true, true); });
  ok('B ยังเซฟต่อได้ตามปกติหลัง A โดนเตะ', await until(B, u => { const d = JSON.parse(localStorage.getItem('fake_sb_db')); const r = d.chars[u]; return !!r && r.data.chars[r.data.active].zeny === 515151; }, uid, 15000));
  ok('B ไม่โดนเตะระหว่างที่ A พยายามเซฟ', await notKickedFor(B, 200));

  await shot(A, 'dup-kick-390x844', { width: 390, height: 844 });
  await shot(A, 'dup-kick-1600x900', { width: 1600, height: 900 });
  await A.setViewportSize({ width: 1600, height: 900 });

  // A กดปุ่ม → โหลดใหม่ → หน้าล็อกอิน ไม่กู้เซสชันเอง (ไม่แย่ง B คืน)
  await A.click('#dup-kick-btn');
  ok('A กลับหน้าล็อกอิน ไม่กู้เซสชันอัตโนมัติ', await until(A, () => typeof Online !== 'undefined' && !document.querySelector('#auth').classList.contains('hidden') && !Online.user && !document.getElementById('dup-kick'), null, 60000));
  ok('B ยังไม่โดนเตะหลัง A กลับหน้าล็อกอิน', await notKickedFor(B, 2500));

  // ออก + เข้าใหม่ในเครื่องเดิม (B) ไม่โดนเตะ
  await B.evaluate(async (u) => { await Online.logout(); await Online.login(u, 'pass1234'); }, user);
  ok('B ออก+เข้าใหม่เครื่องเดิม ไม่โดนเตะ', await notKickedFor(B, 2500) && await B.evaluate(() => SessionGuard.uid === Online.user.id));

  // A ล็อกอินใหม่ → B (เล่นอยู่นานกว่า) โดนเตะ = ใหม่ล่าสุดชนะสองทิศ
  await loginAndPlay(A, user);
  ok('A ล็อกอินใหม่ → B โดนเตะ (ใหม่ล่าสุดชนะ)', await until(B, () => SessionGuard.kicked && Online.kicked && !!document.getElementById('dup-kick'), null, 8000));
  ok('A ใหม่ไม่โดนเตะ', await notKickedFor(A, 1500));

  // ---- ฝั่งเซิร์ฟเวอร์: ไคลเอนต์ที่ถูกแก้ (ไม่ฟังช่องเตะ) ก็เซฟทับไม่ได้ ----
  ok('เซิร์ฟเวอร์รับ claim ของ A แล้ว (เซฟแนบ sid)', await A.evaluate(() => SessionGuard.server === true));
  // จำลองคนแก้โค้ด: ปิดตัวฟังการเตะ • ปิดเซฟอัตโนมัติทุก 30 วิของ A ด้วย — ไม่งั้นถ้ามันบังเอิญเซฟระหว่าง H ล็อกอิน (~12–14 วิ)
  // เซิร์ฟเวอร์จะปฏิเสธ stale_session แล้ว A โดนเตะ "ถูกต้อง" ก่อนข้อตรวจถัดไป = เทสต์ตกตามจังหวะ (วัดแล้ว 4/7 รอบ) • ขั้นถัดไปเซฟตรงผ่าน __sb
  await A.evaluate(() => { SessionGuard.recv = () => {}; window.__sb = Online.sb; window.__qs = Online.queueSave; Online.queueSave = () => {}; });
  const H = await open(BASE);
  await loginAndPlay(H, user);
  await H.evaluate(() => { G.player.zeny = 616161; saveGame(true, true); });
  ok('H (เครื่องใหม่) เซฟได้', await until(H, u => { const d = JSON.parse(localStorage.getItem('fake_sb_db')); const r = d.chars[u]; return !!r && r.data.chars[r.data.active].zeny === 616161; }, uid, 15000));
  ok('A ที่ถูกแก้ไม่ได้ยินการเตะ (ยังไม่โดนเตะ)', await A.evaluate(() => !SessionGuard.kicked));
  const raw = await A.evaluate(async u => {
    const a = await window.__sb.from('characters').upsert({ user_id: u, name: 'Aria', data: { v: 2, active: 0, chars: [] } });
    const b2 = await window.__sb.from('characters').upsert({ user_id: u, name: 'Aria', data: { v: 2, active: 0, chars: [] }, sid: SessionGuard.sid });
    return [a.error && a.error.message, b2.error && b2.error.message];
  }, uid);
  ok('ฐานข้อมูลปฏิเสธเซฟจากเครื่องเก่า ทั้งไม่แนบ sid และแนบ sid เก่า', raw[0] === 'stale_session' && raw[1] === 'stale_session', JSON.stringify(raw));
  await A.evaluate(() => { Online.queueSave = window.__qs; G.player.zeny = 777777; saveGame(true, true); }); // เปิดเซฟคืนแล้วลองเซฟผ่านเกม
  ok('A เซฟผ่านเกมโดนปฏิเสธ → เด้งออกเอง', await until(A, () => SessionGuard.kicked && !!document.getElementById('dup-kick'), null, 15000));
  ok('คลาวด์ยังเป็นค่าของ H', (await dbZeny(H, uid)) === 616161, String(await dbZeny(H, uid)));
  ok('ไม่มี error ในหน้าเกม (ออนไลน์)', [A, B, H].every(p => !p.errs.length), [A, B, H].map(p => p.errs.join(' || ')).filter(Boolean).join(' ## '));
  ok('ไม่มีคำขอไป Supabase จริง', real === 0, String(real));
  await ctx.close();

  // ================= ส่วน 2: ในเครื่อง (localStorage) =================
  ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  await block(ctx);
  const LU = BASE + '?local-test=1', lname = 'loc_' + sfx;
  const L1 = await open(LU);
  await registerAndPlay(L1, lname, 'Lola');
  ok('โหมดในเครื่อง: L1 ประกาศตัวแล้ว ไม่โดนเตะ', await L1.evaluate(() => Online.local && Online.loggedIn && SessionGuard.uid === Online.user.id && !SessionGuard.kicked) && await notKickedFor(L1, 1200));
  await instrument(L1);
  const L2 = await open(LU, true); // เซสชันค้างในเครื่อง → กู้เองแล้วเข้าเกม = ทางกู้เซสชันก็ประกาศตัวเหมือนกัน
  await L2.click('#btn-continue'); await intoGame(L2);
  ok('แท็บ 2 ล็อกอินบัญชีเดียวกัน → แท็บ 1 โดนเตะ', await until(L1, () => SessionGuard.kicked && Online.kicked && !!document.getElementById('dup-kick'), null, 8000));
  ok('แท็บ 2 ไม่โดนเตะ', await notKickedFor(L2, 1500));
  const key = 'nm_char_' + lname;
  const before = await L2.evaluate(k => localStorage.getItem(k), key);
  const lw0 = await writes(L1);
  await L1.evaluate(() => { G.player.zeny = 777777; saveGame(true, true); Acct.persist(true); window.dispatchEvent(new Event('beforeunload')); });
  await sleep(1500);
  ok('แท็บ 1 หลังโดนเตะ: เขียนเซฟ 0 ครั้ง · ค่าในเครื่องไม่เปลี่ยน', (await writes(L1)).ls === lw0.ls && (await L2.evaluate(k => localStorage.getItem(k), key)) === before && !before.includes('"zeny":777777'));
  await L2.evaluate(() => { G.player.zeny = 888888; saveGame(true, true); });
  ok('แท็บ 2 เซฟต่อได้', await until(L2, k => (localStorage.getItem(k) || '').includes('"zeny":888888'), key, 8000));
  // คนละบัญชีในเบราว์เซอร์เดียวกัน ไม่เตะกัน
  await L2.evaluate(() => localStorage.removeItem('nm_session'));
  const L3 = await open(LU);
  await registerAndPlay(L3, 'oth_' + sfx, 'Otto');
  ok('คนละบัญชีไม่เตะกัน', await notKickedFor(L2, 1500) && await notKickedFor(L3, 100));
  ok('ไม่มี error ในหน้าเกม (ในเครื่อง)', [L1, L2, L3].every(p => !p.errs.length), [L1, L2, L3].map(p => p.errs.join(' || ')).filter(Boolean).join(' ## '));

  // ================= ส่วน 3: ตรรกะเทียบ claim/hb โดยตรง (ไม่มีเครือข่าย) =================
  const logic = await L3.evaluate(() => {
    const r = {}, G0 = SessionGuard;
    const reset = (age) => { G0.kicked = false; Online.kicked = false; G0.t = 1000; G0.since = performance.now() - age; G0.lastDefend = 0; G0.hbTimer = G0.hbTimer; };
    const sent = []; const send0 = G0.send, kick0 = G0.kick;
    G0.send = m => sent.push(m); let kicks = 0; G0.kick = function () { kicks++; this.kicked = true; Online.kicked = true; };
    const msg = (k, t, sid) => G0.recv({ k, sid: sid || 'zzzz', t });
    reset(100); msg('claim', 2000); r.youngNewer = kicks === 1;                            // เพิ่งเริ่ม + อีกฝั่งใหม่กว่า → ยอม
    kicks = 0; sent.length = 0; reset(100); msg('claim', 500); r.youngOlder = kicks === 0 && sent.length === 1 && sent[0].k === 'claim' && sent[0].t === 1000; // อีกฝั่งเก่ากว่า → ประกาศซ้ำให้มันหยุด
    kicks = 0; reset(100); msg('claim', 1000, 'zzzz'); r.tieBySid = kicks === (G0.sid < 'zzzz' ? 1 : 0); // เสมอ → เทียบ sid
    kicks = 0; reset(60000); msg('claim', 500); r.oldYieldsToAnyClaim = kicks === 1;     // เล่นมานานแล้ว (นาฬิกาเหลื่อม t เก่ากว่า) → ยอมตามลำดับที่มาถึง
    kicks = 0; reset(60000); msg('hb', 2000); r.hbNewer = kicks === 1;                  // หน้าเก่าหลับแล้วตื่นมาเจอ hb ของหน้าใหม่ → ยอม
    kicks = 0; sent.length = 0; reset(60000); msg('hb', 500); r.hbOlderDefends = kicks === 0 && sent.length === 1; // hb ของหน้าที่หลับ → ประกาศซ้ำปลุกให้มันหยุด
    kicks = 0; sent.length = 0; reset(100); G0.recv({ k: 'claim', sid: G0.sid, t: 9999 }); r.ignoreSelf = kicks === 0 && sent.length === 0;
    G0.recv({ k: 'claim', t: 9999 }); G0.recv(null); G0.recv({ k: 'claim', sid: 'q', t: 'x' }); r.ignoreJunk = kicks === 0;
    G0.send = send0; G0.kick = kick0; reset(0);
    return r;
  });
  for (const [k, v] of Object.entries(logic)) ok('ตรรกะ ' + k, v === true);

  ok('ไม่มีคำขอไป Supabase จริง (ทั้งรอบ)', real === 0, String(real));
  await b.close(); srv.close();
  console.log(fail ? `${fail} FAILED, ${pass} passed` : `ALL ${pass} PASSED`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
