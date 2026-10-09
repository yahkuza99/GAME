'use strict';
// ============================================================
//  หาปาร์ตี้อัตโนมัติ (js/matchmaking.js) — 5 ผู้เล่น + 1 ออฟไลน์ ใน browser context เดียว
//  ใช้ Supabase ปลอม (tests/fake_supabase.js: BroadcastChannel ระหว่างแท็บ = ฮับ broadcast ในหน่วยความจำ) — ไม่ต่อ Supabase จริง
//  ครอบคลุม: 3 คนเข้าคิวบอสเดียวกัน → ปาร์ตี้ 3 คน หัวหน้า = คนแรก · คนที่ 4 ยังรอในคิว · ปฏิเสธแล้วเติมจากคิว
//            ช่วงเลเวลกันคนเลเวลห่าง · ออกจากคิวแล้วหายจากคิว · ทีมเข้าคิวนับสมาชิก + เติมคนเดี่ยว หัวหน้าเดิมอยู่
//            ทีม "ไปทั้งทีมนี้" ไม่รับใคร · ปิดรับคนนอก · ปุ่มในหน้าต่างนำทาง/โทสต์ Ancient · โหมดออฟไลน์
//  รัน:  NODE_PATH=$(npm root -g) CHROME=/path/to/chrome node tests/matchmaking.js
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

let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) { pass++; console.log('✔', name, info ? ` (${info})` : ''); } else { fail++; console.log('✘', name, info ? ` (${info})` : ''); } };
const until = async (page, fn, arg, ms = 30000) => { try { await page.waitForFunction(fn, arg, { timeout: ms, polling: 150 }); return true; } catch (e) { return false; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
// กดปุ่มจริง (ตัวจัดการ onclick เดิม) โดยไม่รอเฟรม — แท็บหลังไม่มี rAF ทำให้ page.click() รอ "นิ่ง" ไม่จบเมื่อเครื่องโหลดหนัก
const tap = async (p, sel) => { await until(p, s => { const e = document.querySelector(s); return !!e && !!e.offsetParent; }, sel); return p.evaluate(s => document.querySelector(s).click(), sel); };

let BASE;
async function player(ctx, user, name) {
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.stack.split('\n').slice(0, 3).join(' | ')));
  await p.goto(BASE);
  await p.waitForFunction(() => typeof Online !== 'undefined' && !document.querySelector('#auth').classList.contains('hidden'), null, { timeout: 30000 });
  await p.click('#au-tabs [data-mode="register"]');
  await p.fill('#au-user', user); await p.fill('#au-pass', 'pass1234'); await p.fill('#au-pass2', 'pass1234'); await p.click('#au-submit');
  await p.waitForSelector('#cr-name', { state: 'visible', timeout: 15000 });
  await p.fill('#cr-name', name); await p.click('#cr-start');
  await p.waitForFunction(() => G.started, null, { timeout: 20000 });
  await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {});
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 8000, polling: 250 }).catch(() => {});
  await p.evaluate(() => document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden')));
  p.uid = await p.evaluate(() => Online.user.id);
  p.nm = name;
  return p;
}
const setLv = (p, lv) => p.evaluate(l => { G.player.baseLv = l; recalc(); }, lv);
const queue = (p, t, g) => p.evaluate(([t, g]) => MM.queue(t, g), [t, !!g]);
const autoYes = (p, on) => p.evaluate(on => { clearInterval(window.__ay); if (on) window.__ay = setInterval(() => { if (MM.offer && !MM.offer.acc) MM.accept(); }, 200); }, on);
const pid = p => p.evaluate(() => Party.party ? Party.party.id : null);
const chatLog = p => p.evaluate(() => document.querySelector('#chat-log').textContent);
async function reset(all) {
  for (const p of all) await p.evaluate(() => { clearInterval(window.__ay); MM.leave(true); if (Party.party) Party.leave(true); Nav.cancel(true); MM.navT = null; window.__nOff = 0; });
  await sleep(2500);
}
async function party2(A, B) { // ปาร์ตี้ทำเอง (js/party.js) A หัวหน้า + B
  await A.evaluate(() => Party.create('Premade'));
  await A.evaluate(([id, name]) => Party.sendInvite({ id, name }), [B.uid, B.nm]);
  await until(B, () => !!Party.invite);
  await B.evaluate(() => Party.accept());
  return until(A, () => Party.party && Party.roster().length === 2 && Party.isLeader());
}

(async () => {
  const srv = await serve();
  BASE = `http://localhost:${srv.address().port}/index.html`;
  // หลายแท็บพร้อมกัน: แท็บที่ไม่อยู่หน้าโดน Chrome หน่วงตัวจับเวลาหนัก (ซ่อนเกิน 5 นาที = นาทีละครั้ง) → heartbeat ขาด — ปิดเฉพาะขั้นนั้น
  //   (ปิดการหน่วงทั้งหมดไม่ได้: เกม 5 แท็บวาดเต็ม 60 fps พร้อมกัน เครื่องค้าง)
  const opts = { headless: true, args: ['--disable-features=IntensiveWakeUpThrottling'] };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  else if (fs.existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium';
  const b = await chromium.launch(opts);
  const ctx = await b.newContext({ viewport: { width: 1100, height: 680 } });
  await ctx.addInitScript({ path: FAKE });
  // ห้ามแตะ Supabase จริงเด็ดขาด: ตัดทุกคำขอไป *.supabase.co + ตอบ settings ของโดเมนปลอม + ปิดสคริปต์ CDN
  let real = 0;
  await ctx.route(/supabase\.co\b/, r => { real++; r.abort(); });
  await ctx.route(/fake\.supabase\.test\/auth\/v1\/settings/, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"mailer_autoconfirm":true}' }));
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));

  const sfx = Date.now().toString(36).slice(-4);
  const P = [];
  for (const n of ['Alice', 'Bobby', 'Carol', 'Dave', 'Eve']) P.push(await player(ctx, n.toLowerCase() + '_' + sfx, n));
  const [pa, pb, pc, pd, pe] = P;
  const trail = async () => (await Promise.all(P.map(async p => p.nm + ': ' + (await p.evaluate(() => MM.trail.join(' | ')))))).join(' ## ');
  ok('ออนไลน์ครบ 5 คน', (await Promise.all(P.map(p => p.evaluate(() => Online.online)))).every(Boolean));
  for (const p of P) await setLv(p, 30);
  // แท็บหลังโดนหน่วงตัวจับเวลา + เครื่องโหลดหนัก: heartbeat มาช้าได้หลายวินาที → ยืดเวลาถือว่าหลุดในเทสต์ (ออกจากคิวยังใช้ 'bye' ทันทีเหมือนเดิม)
  for (const p of P) await p.evaluate(() => { MM.TIMEOUT_MS = 30000; MM.ACCEPT_SEC = 60; });
  const T = await pa.evaluate(() => 'mvp:' + MM.mvps()[0].mobId);
  const WBT = await pa.evaluate(() => 'wb:' + Object.keys(WB.MAPS)[0]);

  // ---- 1) 3 คนเข้าคิวบอสเดียวกัน → ปาร์ตี้ 3 คน หัวหน้า = คนแรก · คนที่ 4 ยังอยู่ในคิว ----
  for (const p of [pa, pb, pc, pd]) { ok(`${p.nm} เข้าคิว ${T}`, await queue(p, T)); await sleep(350); }
  ok('จำนวนในคิวแสดงสด (Eve ที่ไม่ได้เข้าคิวเห็น 4)', await pe.evaluate(() => MM.open()).then(() => until(pe, t => MM.count(t) === 4 && /4/.test(document.querySelector(`#w-mm .mm-row[data-t="${t}"] .mm-n b`).textContent), T)),
    await pe.evaluate(t => MM.count(t), T));
  ok('Bobby ได้คำชวน (โทสต์ + นับถอยหลัง)', await until(pb, () => { const t = document.querySelector('#mm-offer'), n = t && t.querySelector('.mm-sec'); return !!t && !t.hidden && !!n && /^\d+$/.test(n.textContent); }));
  ok('Carol ได้คำชวน', await until(pc, () => !!MM.offer), await trail());
  ok('คำชวนมาจาก Alice (คนแรก)', await pb.evaluate(id => MM.offer.from === id, pa.uid));
  await tap(pb, '#mm-offer .mm-yes'); await tap(pc, '#mm-offer .mm-yes');
  ok('ตั้งปาร์ตี้ 3 คน', await until(pa, () => Party.party && Party.roster().length === 3, null, 60000), await pa.evaluate(() => Party.party && Party.roster().map(m => m.name).join(',')));
  const id1 = await pid(pa);
  ok('Bobby/Carol อยู่ปาร์ตี้เดียวกับ Alice', id1 && (await pid(pb)) === id1 && (await pid(pc)) === id1);
  ok('หัวหน้า = Alice (เข้าคิวก่อนสุด)', await pa.evaluate(() => Party.isLeader()) && await until(pb, id => Party.leaderId() === id, pa.uid) && await until(pc, id => Party.leaderId() === id, pa.uid));
  ok('Dave (คนที่ 4) ยังอยู่ในคิว ไม่ได้คำชวน', await pd.evaluate(() => !!MM.me && !MM.offer && !Party.party));
  ok('ทุกคนในปาร์ตี้ถูกนำทางไปที่บอส', (await Promise.all([pa, pb, pc].map(p => until(p, t => MM.navT === t, T)))).every(Boolean));
  ok('ทักทายในแชทปาร์ตี้', await until(pb, () => /\[ปาร์ตี้\] Alice : สวัสดีทีม/.test(document.querySelector('#chat-log').textContent)), (await chatLog(pb)).slice(-160));
  ok('คิวว่างจาก A/B/C แล้ว (เหลือ Dave)', await until(pe, t => MM.count(t) === 1, T), await pe.evaluate(t => MM.count(t), T));

  // ---- 2) ปฏิเสธ → เติมจากคิว ----
  for (const p of [pa, pb, pc]) await p.evaluate(() => { Party.leave(true); Nav.cancel(true); MM.navT = null; });
  await sleep(600);
  await autoYes(pb, true); await autoYes(pc, true);
  for (const p of [pa, pb, pc]) { await queue(p, T); await sleep(350); }
  ok('Alice ได้คำชวนจาก Dave', await until(pa, id => MM.offer && MM.offer.from === id, pd.uid), await trail());
  await tap(pa, '#mm-offer .mm-no');
  ok('Alice ปฏิเสธ → หลุดจากคิว', await pa.evaluate(() => !MM.me && !MM.offer));
  ok('ปาร์ตี้ Dave + Bobby + Carol (เติม Carol แทน)', await until(pd, ids => Party.party && Party.roster().length === 3 && ids.every(id => Party.has(id)), [pb.uid, pc.uid]),
    (await pd.evaluate(() => Party.party && Party.roster().map(m => m.name).join(','))) + ' ' + (await trail()));
  ok('หัวหน้า = Dave', await pd.evaluate(() => Party.isLeader()));
  ok('Alice ไม่ได้อยู่ในปาร์ตี้', await pa.evaluate(() => !Party.party));

  // ---- 3) ช่วงเลเวล: Lv 90 ไม่ถูกจับกับ Lv 30 · ออกจากคิวแล้วหายจากคิว ----
  await reset(P);
  await setLv(pe, 90);
  await pe.evaluate(() => { const f = MM.onOffer.bind(MM); MM.onOffer = v => { window.__nOff = (window.__nOff || 0) + 1; f(v); }; });
  await queue(pe, T); await sleep(350);
  await autoYes(pb, true); await autoYes(pc, true);
  for (const p of [pa, pb, pc]) { await queue(p, T); await sleep(350); }
  const dbg = p => p.evaluate(() => JSON.stringify({ me: MM.me, prop: MM.prop && [...MM.prop.mem.entries()], offer: MM.offer, party: Party.party && Party.roster().map(m => m.name), q: MM.list().map(e => [e.name, e.lv, e.t, e.o, e.since]) }));
  ok('Lv 30 สามคนได้ปาร์ตี้ (ข้าม Eve Lv 90 ที่มาก่อน)', await until(pa, ids => Party.party && Party.roster().length === 3 && ids.every(id => Party.has(id)), [pb.uid, pc.uid]), (await dbg(pa)) + ' B:' + (await dbg(pb)));
  ok('หัวหน้า = Alice (คนแรกในช่วงเลเวล)', await pa.evaluate(() => Party.isLeader()));
  ok('Eve ไม่ได้คำชวนเลย ยังอยู่ในคิว', await pe.evaluate(() => !window.__nOff && !!MM.me && !Party.party), await pe.evaluate(() => window.__nOff));
  ok('Dave เห็น Eve ในคิว', await pd.evaluate(() => MM.join()).then(() => until(pd, id => MM.entries.has(id), pe.uid)));
  await pe.evaluate(() => MM.leave());
  ok('Eve ออกจากคิว → หายจากคิวของคนอื่น', await until(pd, ([id, t]) => !MM.entries.has(id) && MM.count(t) === 0, [pe.uid, T]));
  await setLv(pe, 30);

  // ---- 4) ทีมเข้าคิว "เติมที่ว่าง": นับสมาชิก + คนเดี่ยวเติม หัวหน้าเดิมอยู่ ----
  await reset(P);
  ok('ตั้งปาร์ตี้ทำเอง Alice + Bobby', await party2(pa, pb));
  await pa.evaluate(() => MM.setAutofill(true));
  ok('หัวหน้าพาทีมเข้าคิว (เติมที่ว่าง)', await queue(pa, T, true));
  ok('คิวนับสมาชิกทีม = 2', await until(pd, t => MM.count(t) === 2, T), await pd.evaluate(t => MM.count(t), T));
  await autoYes(pc, true);
  await queue(pc, T);
  ok('Carol เติมเข้าทีม → 3 คน', await until(pa, id => Party.party && Party.roster().length === 3 && Party.has(id), pc.uid));
  ok('หัวหน้าเดิม (Alice) ยังเป็นหัวหน้า', await pa.evaluate(() => Party.isLeader()) && await until(pc, id => Party.leaderId() === id, pa.uid));
  ok('Bobby (สมาชิกเดิม) ถูกนำทางไปบอสด้วย', await until(pb, t => MM.navT === t, T));

  // ---- 5) ทีม "ไปทั้งทีมนี้" ไม่รับคนนอก · ปิดรับคนนอก ----
  await reset(P);
  ok('ตั้งปาร์ตี้ทำเองใหม่', await party2(pa, pb));
  ok('ไปทั้งทีมนี้', await pa.evaluate(t => MM.goAsIs(t), T));
  ok('Bobby ถูกนำทางตามหัวหน้า', await until(pb, t => MM.navT === t, T));
  await autoYes(pd, true);
  await queue(pd, T);
  await sleep(5000);
  ok('ทีมไปทั้งทีมนี้ไม่ได้รับใคร (ยัง 2 คน) · Dave ยังรอ', await pa.evaluate(() => Party.roster().length === 2 && !MM.me) && await pd.evaluate(() => !Party.party && !!MM.me && !MM.offer));
  await pa.evaluate(() => MM.setAutofill(false));
  ok('ปิด "รับคนนอกเติมทีม" → เข้าคิวเติมไม่ได้', !(await queue(pa, T, true)));
  await pa.evaluate(() => MM.setAutofill(true));
  ok('สมาชิกที่ไม่ใช่หัวหน้าเข้าคิวไม่ได้', !(await queue(pb, T, true)) && !(await queue(pb, T)));

  // ---- 6) ทางเข้า UI: ปุ่มหาปาร์ตี้ในแถว MVP (หน้าต่างนำทาง) + โทสต์ Ancient ตื่น ----
  await reset(P);
  await pc.evaluate(() => { UI.navTab = 'mob'; UI.open('w-nav'); });
  ok('แถว MVP มีปุ่มหาปาร์ตี้', await until(pc, () => !!document.querySelector('#w-nav .hunt-row.mvp .hunt-mm')));
  await tap(pc, '#w-nav .hunt-row.mvp .hunt-mm');
  ok('กดแล้วเปิดหน้าต่างหาปาร์ตี้ เลือกบอสนั้น', await until(pc, () => UI.isOpen('w-mm') && /^mvp:/.test(MM.sel) && !!document.querySelector('#w-mm .mm-row.on')));
  await tap(pc, '#w-mm .mm-go');
  ok('ปุ่มเข้าคิวในหน้าต่างใช้ได้', await pc.evaluate(() => !!MM.me && /^mvp:/.test(MM.me.t)));
  await pc.evaluate(() => MM.leave(true));
  await pd.evaluate(m => MM.offerQueue(m.split(':')[1]), WBT);
  ok('Ancient ตื่น: โทสต์มีปุ่มเข้าคิวบอส', await until(pd, () => !document.querySelector('#mm-call').hidden && !!document.querySelector('#mm-call .mm-cq')));
  await tap(pd, '#mm-call .mm-cq');
  ok('แตะเดียวเข้าคิว World Boss', await pd.evaluate(t => !!MM.me && MM.me.t === t, WBT));
  ok('หน้าต่างปาร์ตี้ (Y) มีปุ่มหาปาร์ตี้อัตโนมัติ', await pe.evaluate(() => UI.open('w-party')).then(() => until(pe, () => !!document.querySelector('#w-party .mm-entry'))));
  await reset(P);

  // ---- 7) ออฟไลน์ ----
  const O = await ctx.newPage(); O.errs = [];
  O.on('pageerror', e => O.errs.push(e.message));
  await O.goto(BASE);
  await O.waitForSelector('#au-offline', { state: 'visible', timeout: 30000 });
  await O.click('#au-offline'); await O.click('#btn-new'); await O.fill('#cr-name', 'Solo'); await O.click('#cr-start');
  await O.waitForFunction(() => G.started, null, { timeout: 20000 });
  await O.click('#prologue-skip', { timeout: 3000 }).catch(() => {});
  await O.evaluate(() => UI.chat('/lfg'));
  ok('ออฟไลน์: /lfg เปิดหน้าต่างที่บอกว่าต้องออนไลน์', await until(O, () => UI.isOpen('w-mm') && /โหมดออนไลน์/.test(document.querySelector('#w-mm .win-body').textContent)));
  ok('ออฟไลน์: เข้าคิวไม่ได้ + ข้อความชัด', !(await O.evaluate(() => MM.queue('any'))) && /หาปาร์ตี้ใช้ได้เฉพาะโหมดออนไลน์/.test(await chatLog(O)));

  ok('ไม่มี error ในหน้าเกม', [...P, O].every(p => !p.errs.length), [...P, O].map(p => p.errs.join(' || ')).filter(Boolean).join(' ## '));
  ok('ไม่มีคำขอไป Supabase จริง', real === 0, String(real));
  await b.close(); srv.close();
  console.log(fail ? `${fail} FAILED, ${pass} passed` : `ALL ${pass} PASSED`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
