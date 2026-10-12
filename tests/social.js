'use strict';
// ============================================================
//  ทดสอบรอบ 36: ออนไลน์อย่างเดียว + นำตัวละครออฟไลน์เข้าบัญชี + ผู้เล่นออนไลน์ + เพื่อน + "ไปหา" (js/social.js, js/main.js, js/nav.js)
//  ไม่แตะ Supabase จริง (คำขอไป *.supabase.co / .in ถูกบล็อกและนับ — ต้องเป็น 0) • ใช้ tests/fake_supabase.js
//  ครอบคลุม:
//   1) เว็บจริง (จำลองด้วย window.__IV_PROD_HOST = true): ไม่มีปุ่ม "เล่นแบบไม่ล็อกอิน" • เข้าโหมดออฟไลน์ไม่ได้ • ข้อความบอกว่าเกมออนไลน์
//      เซิร์ฟเวอร์ล่ม = ขึ้น "เชื่อมต่อไม่ได้" ไม่ถอยไปบัญชีในเครื่อง • localhost ยังมีปุ่มเดิม (เทสต์เก่าใช้ได้)
//   2) ตัวละครออฟไลน์ (เล่นไม่ล็อกอิน + บัญชีในเครื่อง) นำเข้าบัญชีออนไลน์ได้ครั้งเดียว + ติด importedOffline • บัญชีที่สองไม่ถูกเสนอซ้ำ
//   3) presence: รายชื่อผู้เล่นออนไลน์ + แผนที่ + ค้น/กรอง • ซ่อนตำแหน่ง (ไม่ใช่เพื่อนเห็นแค่ชื่อ/Class/Lv — เพื่อนยังไปหาได้)
//   4) เพื่อน: ขอ → อีกฝ่ายได้แจ้งเตือน → ตอบรับ → เพื่อนออนไลน์แจ้งเตือน → เชิญปาร์ตี้ → ลบ (RPC ปลอม)
//   5) ไปหา: ข้ามแผนที่ แล้วเดินตามตำแหน่งที่ขยับ หยุดเมื่อห่าง ≤ 2 ช่อง • ปลายทาง PvP ต้องยืนยัน
//   6) เซิร์ฟเวอร์ยังไม่มีตาราง/ฟังก์ชันเพื่อน → ซ่อนแท็บเพื่อน + ข้อความ • การ์ดผู้เล่นมีปุ่ม เพิ่มเพื่อน/ไปหา
//   7) กติกาหน้าตา 390×844 + 1600×900 • ไม่มี page error
//  รัน:  NODE_PATH=$(npm root -g) node tests/social.js   (CHROME=/path/to/chrome ได้ • SHOTS=โฟลเดอร์ = เก็บภาพ)
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
const shot = async (P, name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await P.screenshot({ path: path.join(SHOTS, name + '.png'), timeout: 60000 }).catch(e => console.log('  (ภาพ ' + name + ' ไม่สำเร็จ: ' + e.message.split('\n')[0] + ')')); } };
let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) pass++; else fail++; console.log(cond ? '✔' : '✘', name, info !== undefined ? ` (${typeof info === 'string' ? info : JSON.stringify(info)})` : ''); };
const tap = (P, sel) => P.evaluate(s => { const el = document.querySelector(s); if (!el) throw new Error('no ' + s); el.click(); }, sel);
const until = (P, fn, arg, timeout = 15000) => P.waitForFunction(fn, arg, { timeout, polling: 100 }).then(() => true, () => false);
const log = P => P.evaluate(() => [...document.querySelectorAll('#chat-log .cl')].map(e => e.textContent).join('\n'));
let realHits = 0;
async function newCtx(b, init) {
  const ctx = await b.newContext({ viewport: { width: 1100, height: 700 } });
  if (init) await ctx.addInitScript(init);
  await ctx.addInitScript({ path: FAKE });
  await ctx.route(/supabase\.(co|in)\b/, r => { realHits++; r.abort(); });
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await ctx.route(/fake\.supabase\.test\/auth\/v1\/settings/, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"mailer_autoconfirm":true}' }));
  return ctx;
}
function watch(p) {
  p.errs = [];
  p.on('pageerror', e => p.errs.push(e.stack.split('\n').slice(0, 3).join(' | ')));
  p.on('console', m => { if (/^social /.test(m.text())) p.errs.push(m.text()); });
}
async function intoGame(p) {
  await p.waitForFunction(() => G.started, null, { timeout: 90000 });
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 10000, polling: 250 }).catch(() => {});
  await p.evaluate(() => document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden')));
  await p.evaluate(() => { if (G.map.id !== HOME_MAP) changeMap(HOME_MAP, 20.5, 24.5, { quiet: true }); });
}
async function openTitle(ctx, base, viewport) {
  const p = await ctx.newPage(); watch(p);
  if (viewport) await p.setViewportSize(viewport);
  await p.goto(base, { timeout: 120000 });
  await p.waitForFunction(() => typeof Online !== 'undefined' && !document.querySelector('#auth').classList.contains('hidden'), null, { timeout: 90000 });
  return p;
}
async function register(p, user) {
  await p.click('#au-tabs [data-mode="register"]');
  await p.fill('#au-user', user); await p.fill('#au-pass', 'pass1234'); await p.fill('#au-pass2', 'pass1234'); await p.click('#au-submit');
}
async function player(ctx, base, user, name, viewport) {
  const p = await openTitle(ctx, base, viewport);
  await register(p, user);
  await p.waitForSelector('#cr-name', { state: 'visible', timeout: 60000 });
  await p.fill('#cr-name', name); await p.click('#cr-start');
  await intoGame(p);
  return p;
}
// กติกาหน้าตาของเจ้าของ (วัดจากของที่มองเห็นจริงในกล่อง sel)
const uiRules = (P, sel) => P.waitForTimeout(600).then(() => P.evaluate(sel => {
  const w = document.querySelector(sel), r = w.getBoundingClientRect(), body0 = w.querySelector('.win-body') || w;
  const vis = el => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const all = [...body0.querySelectorAll('*')].filter(vis); // เนื้อหาในหน้าต่าง (หัวหน้าต่าง/ปุ่มปิดเป็นของกลางทุกหน้าต่าง)
  const small = [], short = [], round = [], spaced = [];
  for (const el of all) {
    const cs = getComputedStyle(el);
    const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (hasText && parseFloat(cs.fontSize) < 13) small.push(`${el.className || el.tagName}:${cs.fontSize}`);
    if (/^(BUTTON|INPUT|SELECT)$/.test(el.tagName) && el.getBoundingClientRect().height < 39.5) short.push(`${el.className || el.tagName}:${Math.round(el.getBoundingClientRect().height)}`);
    for (const k of ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius']) if (parseFloat(cs[k]) > 8) { round.push(`${el.className || el.tagName}:${cs[k]}`); break; }
    if (hasText && cs.letterSpacing !== 'normal' && parseFloat(cs.letterSpacing) !== 0) spaced.push(`${el.className || el.tagName}:${cs.letterSpacing}`);
  }
  const body = w.querySelector('.win-body') || w;
  return { l: Math.round(r.left), r: Math.round(r.right), vw: innerWidth, sw: body.scrollWidth, cw: body.clientWidth, doc: document.documentElement.scrollWidth,
    small: [...new Set(small)].slice(0, 6), short: [...new Set(short)].slice(0, 6), round: [...new Set(round)].slice(0, 6), spaced: [...new Set(spaced)].slice(0, 6), n: all.length };
}, sel)); // รอแอนิเมชันเปิดหน้าต่าง (ขยายจาก 95%) จบก่อนวัด
const rulesOk = u => u.l >= 0 && u.r <= u.vw + 0.5 && u.sw <= u.cw + 1 && u.doc <= u.vw && !u.small.length && !u.short.length && !u.round.length && !u.spaced.length;
const GUEST = { name: 'Guesty', gender: 'm', hair: '#ccc', job: 'novice', baseLv: 9, jobLv: 7, baseExp: 0, jobExp: 0, stats: { str: 5, agi: 5, vit: 5, int: 1, dex: 5, luk: 1 }, statPoints: 0, skillPoints: 0, skills: {},
  zeny: 777, inventory: [{ id: 'red_potion', qty: 3, uid: 1, refine: 0, cards: [] }], equip: {}, map: 'eldheim', x: 20.5, y: 24.5, save: { map: 'eldheim', x: 20.5, y: 24.5 }, hp: 50, sp: 10, options: {}, uidSeq: 5, savedAt: 1000 };

(async () => {
  const srv = await serve();
  const BASE = `http://localhost:${srv.address().port}/index.html`;
  const opts = { headless: true, args: ['--disable-features=IntensiveWakeUpThrottling', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  const b = await chromium.launch(opts);
  const pages = [];
  const sfx = Date.now().toString(36).slice(-4);
  try {
    // ================= 1) เว็บจริง vs localhost =================
    const ctxLocal = await newCtx(b);
    const L0 = await openTitle(ctxLocal, BASE); pages.push(L0);
    ok('localhost: ปุ่ม "เล่นแบบไม่ล็อกอิน" ยังอยู่ (เทสต์เดิมใช้ได้)', await L0.isVisible('#au-offline') && await L0.evaluate(() => Online.offlineAllowed()));
    await L0.close();

    const ctxProd = await newCtx(b, () => { window.__IV_PROD_HOST = true; });
    const P0 = await openTitle(ctxProd, BASE); pages.push(P0);
    await until(P0, () => !!Online.sb || Online.down || Online.local, null, 15000);
    const prod = await P0.evaluate(() => ({ allowed: Online.offlineAllowed(), btn: !!document.querySelector('#au-offline').offsetParent, note: document.querySelector('#au-note').textContent, kicker: document.querySelector('#au-kicker').textContent, local: Online.local }));
    ok('เว็บจริง: ไม่มีปุ่มเล่นออฟไลน์ + บอกว่าเป็นเกมออนไลน์', !prod.allowed && !prod.btn && /เกมออนไลน์/.test(prod.note) && /ออนไลน์/.test(prod.kicker) && !prod.local, prod);
    await P0.evaluate(() => enterOffline());
    ok('เว็บจริง: เรียกโหมดออฟไลน์ตรง ๆ ก็ถูกพากลับหน้าล็อกอิน', await P0.evaluate(() => !document.querySelector('#auth').classList.contains('hidden') && document.querySelector('#charsel').classList.contains('hidden')));
    await shot(P0, 'social-01-prod-login');

    // เว็บจริง + เซิร์ฟเวอร์ใช้ไม่ได้ (โหลดสคริปต์ Supabase ไม่ได้) → ไม่ถอยไปบัญชีในเครื่อง
    const ctxDown = await b.newContext({ viewport: { width: 1100, height: 700 } });
    await ctxDown.addInitScript(() => { window.__IV_PROD_HOST = true; });
    await ctxDown.route(/supabase\.(co|in)\b/, r => { realHits++; r.abort(); });
    await ctxDown.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    const D0 = await openTitle(ctxDown, BASE); pages.push(D0);
    await register(D0, 'down_' + sfx);
    await until(D0, () => /เชื่อมต่อเซิร์ฟเวอร์เกมไม่ได้/.test(document.querySelector('#au-err').textContent), null, 15000);
    const down = await D0.evaluate(() => ({ err: document.querySelector('#au-err').textContent, local: Online.local, down: Online.down, user: !!Online.user, btn: !!document.querySelector('#au-offline').offsetParent, note: document.querySelector('#au-note').textContent }));
    ok('เว็บจริง + เซิร์ฟเวอร์ล่ม: แจ้งเชื่อมต่อไม่ได้ ไม่สร้างบัญชีในเครื่อง', /เชื่อมต่อเซิร์ฟเวอร์เกมไม่ได้/.test(down.err) && !down.local && !!down.down && !down.user && !down.btn && /เชื่อมต่อเซิร์ฟเวอร์เกมไม่ได้/.test(down.note), down);
    await shot(D0, 'social-02-prod-down');
    await ctxDown.close();

    // ================= 2) นำตัวละครออฟไลน์เข้าบัญชีออนไลน์ (ครั้งเดียว) =================
    await P0.evaluate(g => {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 2, active: 0, chars: [g], savedAt: 1000 }));
      localStorage.setItem('nm_accounts', JSON.stringify({ oldacc: { name: 'oldacc', salt: 'x', hash: 'y', created: 1 } }));
      localStorage.setItem('nm_char_oldacc', JSON.stringify({ v: 2, active: 0, chars: [Object.assign({}, g, { name: 'Legacyo', baseLv: 14, zeny: 55 })], savedAt: 1000 }));
    }, GUEST);
    await P0.setViewportSize({ width: 390, height: 844 });
    await register(P0, 'imp_' + sfx);
    await P0.waitForSelector('#cs-import:not(.hidden)', { timeout: 30000 });
    ok('หลังล็อกอิน: เสนอให้นำตัวละครออฟไลน์เข้า (ทั้งเล่นไม่ล็อกอิน + บัญชีในเครื่อง)', /Guesty/.test(await P0.textContent('#cs-import')) && /Legacyo/.test(await P0.textContent('#cs-import')), await P0.textContent('#cs-import'));
    await tap(P0, '#cs-import');
    await P0.waitForSelector('#cs-confirm.imp:not(.hidden) .cs-imp-pick', { timeout: 5000 });
    const picks = await P0.$$eval('.cs-imp-pick', els => els.map(e => [e.dataset.key, e.getAttribute('aria-pressed')]));
    ok('กล่องนำเข้า: เลือกได้ทีละตัว (เลือกไว้ให้ทั้งคู่)', picks.length === 2 && picks.every(x => x[1] === 'true'), picks);
    const ru = await uiRules(P0, '#cs-confirm');
    ok('กล่องนำเข้า 390×844: ตามกติกาหน้าตา', rulesOk(ru), ru);
    await shot(P0, 'social-03-import-ask-390');
    await tap(P0, '#cs-imp-go');
    await until(P0, () => Acct.chars.length === 2, null, 15000);
    await P0.waitForFunction(() => { const d = JSON.parse(localStorage.getItem('fake_sb_db')), r = d.chars[Online.user.id]; return r && r.data.chars.length === 2; }, null, { timeout: 15000 }).catch(() => {});
    const imp = await P0.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('fake_sb_db')), r = d.chars[Online.user.id];
      return { names: Acct.chars.map(c => c.name), flags: r ? r.data.chars.map(c => [c.name, typeof c.importedOffline === 'number' && c.importedOffline > 0, c.importedFrom]) : null,
        mark: Object.keys(JSON.parse(localStorage.getItem('iv_offline_imported')) || {}), err: document.querySelector('#cs-err').textContent, offerAgain: !document.querySelector('#cs-import').classList.contains('hidden') };
    });
    ok('นำเข้าแล้ว 2 ตัว + เซฟขึ้นเซิร์ฟเวอร์พร้อม importedOffline', JSON.stringify(imp.names) === '["Guesty","Legacyo"]' && imp.flags && imp.flags.every(f => f[1]) && imp.flags[0][2] === 'guest' && imp.flags[1][2] === 'local' && /นำเข้าแล้ว/.test(imp.err) && !imp.offerAgain, imp);
    ok('จดว่านำเข้าแล้วใน localStorage', imp.mark.length === 2 && imp.mark.includes('guest|guesty') && imp.mark.includes('local:oldacc|legacyo'), imp.mark);
    await shot(P0, 'social-04-import-done-390');
    // บัญชีที่สองในเครื่องเดียวกัน: ไม่ถูกเสนอซ้ำ (นำเข้าได้ครั้งเดียว) → ไปหน้าสร้างตัวละครเลย
    await tap(P0, '#acct-logout');
    await P0.waitForSelector('#auth:not(.hidden)', { timeout: 15000 });
    await register(P0, 'imp2_' + sfx);
    await P0.waitForSelector('#cr-name', { state: 'visible', timeout: 30000 });
    ok('บัญชีที่สอง: ไม่เสนอนำเข้าซ้ำ', await P0.evaluate(() => csImportable().length === 0 && document.querySelector('#cs-import').classList.contains('hidden')));
    // บัญชีที่ช่องเต็ม: ไม่เสนอ (ปุ่มซ่อน)
    const full = await P0.evaluate(g => {
      localStorage.removeItem('iv_offline_imported');
      Acct.data = { v: 2, active: 0, chars: [1, 2, 3, 4, 5].map(i => Object.assign({}, g, { name: 'Full' + i })) };
      showCharSel(); return { hidden: document.querySelector('#cs-import').classList.contains('hidden'), n: csImportable().length };
    }, GUEST);
    ok('บัญชีช่องเต็ม 5/5: ไม่มีปุ่มนำเข้า', full.hidden && full.n === 2, full);
    await P0.evaluate(() => localStorage.setItem('iv_offline_imported', JSON.stringify({ 'guest|guesty': { at: 1 }, 'local:oldacc|legacyo': { at: 1 } })));
    await P0.close();

    // ================= 3) presence + เพื่อน + ไปหา (3 ผู้เล่น) =================
    const ctx = await newCtx(b);
    const A = await player(ctx, BASE, 'alice_' + sfx, 'Alice', { width: 1600, height: 900 }); pages.push(A);
    const B = await player(ctx, BASE, 'bob_' + sfx, 'Bobby'); pages.push(B);
    const C = await player(ctx, BASE, 'carol_' + sfx, 'Carol', { width: 390, height: 844 }); pages.push(C);
    const ids = {}; for (const [k, P] of Object.entries({ A, B, C })) ids[k] = await P.evaluate(() => Online.user.id);
    ok('ออนไลน์ทั้ง 3 คน (Supabase ปลอม)', (await Promise.all([A, B, C].map(P => P.evaluate(() => Online.online && window.__FAKE_SUPABASE__)))).every(Boolean));
    ok('มีปุ่มเมนู "เพื่อน/ออนไลน์"', await A.evaluate(() => !!document.querySelector('#menubar [data-win="w-social"]') && /เพื่อน/.test(document.querySelector('#menubar [data-win="w-social"]').textContent)));
    const all3 = await until(B, n => Social.players.size >= n, 3, 20000);
    ok('presence: ทุกคนเห็นกันครบ 3 คน', all3 && (await Promise.all([A, C].map(P => until(P, () => Social.players.size >= 3, null, 10000)))).every(Boolean), await B.evaluate(() => [...Social.players.values()].map(p => p.name + '@' + p.map)));
    // A ย้ายไปแผนที่ข้างเคียง (ไม่ใช่ PvP)
    const side = await A.evaluate(() => { const m = Object.values(MAP_DEFS[HOME_MAP].links).find(id => !MAP_DEFS[id].pvp); const g = getMap(m); const s = g.nearestWalkable(Math.floor(g.w / 2), Math.floor(g.h / 2)); changeMap(m, s.x + 0.5, s.y + 0.5); return m; });
    const seeMap = await until(B, ([id, m]) => { const p = Social.players.get(id); return p && p.map === m; }, [ids.A, side], 15000);
    ok('presence: เปลี่ยนแผนที่แล้วคนอื่นเห็นทันที (ไม่ต้องรอ 5 วิ)', seeMap, side);
    // หน้าต่างผู้เล่นออนไลน์บน B: รายชื่อ + แผนที่ + กรอง
    await B.evaluate(() => Social.show('online'));
    await until(B, () => document.querySelectorAll('#w-social .so-row').length >= 3, null, 5000);
    const list = await B.evaluate(() => ({ rows: [...document.querySelectorAll('#w-social .so-row')].map(r => r.dataset.name + '|' + r.querySelector('small').textContent), count: document.querySelector('#w-social .so-count').textContent, tab: document.querySelector('#w-social .so-tab.on').textContent }));
    const sideName = await B.evaluate(m => MAP_DEFS[m].name, side);
    ok('หน้าต่างออนไลน์: 3 แถว มี Class/Lv/แผนที่ + จำนวน', list.rows.length === 3 && list.rows.some(r => r.startsWith('Alice|') && r.includes(sideName) && /Lv \d/.test(r)) && /3/.test(list.count) && /ออนไลน์ 3/.test(list.tab), list);
    await B.evaluate(m => { Social.mapF = m; Social.refresh(true); }, side);
    ok('กรองตามแผนที่: เหลือ Alice คนเดียว', JSON.stringify(await B.$$eval('#w-social .so-row', els => els.map(e => e.dataset.name))) === '["Alice"]');
    await B.evaluate(() => { Social.mapF = 'all'; Social.q = 'car'; Social.refresh(true); });
    ok('ค้นชื่อ: "car" เหลือ Carol', JSON.stringify(await B.$$eval('#w-social .so-row', els => els.map(e => e.dataset.name))) === '["Carol"]');
    await B.evaluate(() => { Social.q = ''; Social.refresh(true); });

    // ---- เพื่อน: B ขอ A ผ่านช่องพิมพ์ชื่อ ----
    await until(B, () => Social.server === true, null, 10000);
    await B.evaluate(() => Social.show('friends'));
    await B.evaluate(() => { const i = document.querySelector('#w-social .so-add-in'); i.focus(); i.value = 'alice'; i.dispatchEvent(new Event('input', { bubbles: true })); });
    await tap(B, '#w-social [data-act="request"]');
    await until(B, id => Social.friends.get(id) && Social.friends.get(id).dir === 'out', ids.A, 10000);
    ok('ส่งคำขอ: B เห็นคำขอที่ส่งไป', await B.evaluate(() => /ส่งคำขอถึง Alice/.test(document.querySelector('#w-social .so-msg').textContent) && !!document.querySelector('#w-social [data-act="cancel"]')));
    const gotReq = await until(A, id => Social.friends.get(id) && Social.friends.get(id).dir === 'in', ids.B, 10000);
    ok('A ได้รับคำขอทันที + แจ้งเตือน', gotReq && /ขอเป็นเพื่อนกับคุณ/.test(await log(A)) && await A.evaluate(() => /Bobby/.test(document.querySelector('#so-toast').textContent)));
    await A.evaluate(() => Social.show('friends'));
    await until(A, () => !!document.querySelector('#w-social [data-act="accept"]'), null, 5000);
    ok('A แท็บเพื่อนมีป้ายจำนวนคำขอ', await A.evaluate(() => document.querySelector('#w-social .so-tab[data-tab="friends"] .so-badge').textContent === '1'));
    await shot(A, 'social-05-request-1600');
    await tap(A, '#w-social [data-act="accept"]');
    const acc = await until(B, id => Social.isFriend(id), ids.A, 10000) && await until(A, id => Social.isFriend(id), ids.B, 5000);
    ok('ตอบรับ: เป็นเพื่อนกันทั้งสองฝั่ง', acc);
    // รอหน้าต่างวาดใหม่หลังตอบรับ (เดิมเช็กทันที = ตกบ้างตามจังหวะ ทั้งก่อนและหลังรอบนี้)
    ok('แท็บเพื่อน (B): Alice ออนไลน์ + แผนที่ + ปุ่ม ไปหา/เชิญเข้าปาร์ตี้/ลบ', await until(B, id => { const r = document.querySelector(`#w-social .so-row[data-id="${id}"]`); return !!r && /ออนไลน์/.test(r.textContent) && !!r.querySelector('[data-act="goto"]:not([disabled])') && !!r.querySelector('[data-act="party"]:not([disabled])') && !!r.querySelector('[data-act="remove"]'); }, ids.A, 8000));
    await shot(B, 'social-06-friends-1100');

    // ---- ซ่อนตำแหน่ง: A ซ่อน → C (ไม่ใช่เพื่อน) ไม่เห็นแผนที่/ไปหาไม่ได้ • B (เพื่อน) ยังไปหาได้ ----
    await A.evaluate(() => Social.setHide(true));
    await until(C, id => { const p = Social.players.get(id); return p && p.hide && !p.map; }, ids.A, 10000);
    await C.evaluate(() => Social.show('online'));
    const hid = await C.evaluate(id => { const r = document.querySelector(`#w-social .so-row[data-id="${id}"]`); return { txt: r && r.textContent, goto: r && r.querySelector('[data-act="goto"]').disabled, pos: Social.pos(id) }; }, ids.A);
    ok('ซ่อนตำแหน่ง: คนที่ไม่ใช่เพื่อนเห็นแค่ชื่อ/Class/Lv (ไปหาไม่ได้)', /ซ่อนตำแหน่ง/.test(hid.txt || '') && hid.goto === true && hid.pos === null, hid);
    const fpos = await until(B, id => !!Social.pos(id), ids.A, 12000);
    ok('ซ่อนตำแหน่ง: เพื่อนยังรู้ตำแหน่ง (ส่งแยกถึงเพื่อน)', fpos, await B.evaluate(id => Social.pos(id), ids.A));
    const ru2 = await uiRules(C, '#w-social');
    ok('หน้าต่างออนไลน์ 390×844: ตามกติกาหน้าตา', rulesOk(ru2), ru2);
    await shot(C, 'social-07-online-390');
    await C.evaluate(() => UI.close('w-social'));

    // ---- ไปหา: B (เมืองหลวง) → A (อีกแผนที่) แล้ว A ขยับระหว่างทาง ----
    await B.evaluate(() => UI.close('w-social'));
    await B.evaluate(id => Social.goTo(id), ids.A);
    ok('ไปหา: ตั้งเป้านำทางชนิด player', await B.evaluate(id => !!Nav.target && Nav.target.kind === 'player' && Nav.target.uid === id, ids.A));
    const crossed = await until(B, m => G.map.id === m, side, 120000);
    ok('ไปหา: เดินข้ามประตูไปแผนที่ของเพื่อน', crossed, await B.evaluate(() => G.map.id));
    // A ขยับไปจุดใหม่ (ห่างเดิม ~8 ช่อง) ระหว่างที่ B ยังเดินอยู่
    const moved = await A.evaluate(() => { const p = G.player, g = G.map; let s = null; for (let r = 8; r < 20 && !s; r++) for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r]]) { const x = Math.floor(p.x) + dx, y = Math.floor(p.y) + dy; if (g.walkable(x, y)) { s = { x, y }; break; } } teleportPlayer(s.x + 0.5, s.y + 0.5); Social.track(true); return s; });
    const arrived = await until(B, id => !Nav.target && Social.pos(id) && U.dist(G.player.x, G.player.y, Social.pos(id).x, Social.pos(id).y) <= 2.6, ids.A, 120000);
    const fin = await B.evaluate(id => ({ map: G.map.id, d: Social.pos(id) && +U.dist(G.player.x, G.player.y, Social.pos(id).x, Social.pos(id).y).toFixed(2), nav: !!Nav.target, a: Social.pos(id) }), ids.A);
    ok('ไปหา: ตามไปจุดใหม่ และหยุดเมื่อห่าง ≤ 2 ช่อง', arrived && fin.a && Math.abs(fin.a.x - (moved.x + 0.5)) < 1.5 && Math.abs(fin.a.y - (moved.y + 0.5)) < 1.5, { fin, moved });
    ok('ไปหา: แจ้ง "ถึงตัว Alice แล้ว"', /ถึงตัว Alice แล้ว/.test(await log(B)));
    await shot(B, 'social-08-arrived');
    // การ์ดผู้เล่น (แตะตัว A ในแผนที่เดียวกัน): มีปุ่ม ไปหา (เป็นเพื่อนแล้ว → ไม่มีเพิ่มเพื่อน)
    const card = await B.evaluate(id => { const o = Online.others.get(id); UnitCard.open({ kind: 'player', ref: o }, 400, 300); const el = UnitCard.el; const r = { goto: !!el.querySelector('[data-act="goto"]'), friend: !!el.querySelector('[data-act="friend"]') }; UnitCard.close(); return r; }, ids.A);
    ok('การ์ดผู้เล่น (เพื่อน): มีปุ่มไปหา ไม่มีเพิ่มเพื่อน', card.goto && !card.friend, card);

    // ---- ปลายทางเดินไปไม่ได้ (ลานประลองเข้าทาง NPC เท่านั้น) → แจ้ง ไม่นำทาง ----
    await A.evaluate(() => { Social.setHide(false); changeMap('arena', 17.5, 20.5); });
    await until(B, id => { const p = Social.players.get(id); return p && p.map === 'arena'; }, ids.A, 15000);
    await B.evaluate(id => Social.goTo(id), ids.A);
    ok('ไปหา: แผนที่ที่ไม่มีทางเดินไป → แจ้ง ไม่นำทาง', await B.evaluate(() => !Nav.target) && /ไม่มีทางเดินไป/.test(await log(B)));
    // ---- ปลายทาง PvP: ต้องยืนยัน — ยกเลิกแล้วไม่นำทาง (จำลองแผนที่ข้างเคียงเป็น PvP เฉพาะในแท็บ B) ----
    await A.evaluate(m => { const g = getMap(m), s = g.nearestWalkable(Math.floor(g.w / 2), Math.floor(g.h / 2)); changeMap(m, s.x + 0.5, s.y + 0.5); }, side);
    await B.evaluate(() => changeMap(HOME_MAP, 20.5, 24.5));
    await until(B, ([id, m]) => { const p = Social.players.get(id); return p && p.map === m; }, [ids.A, side], 15000);
    await B.evaluate(m => { MAP_DEFS[m].pvp = true; }, side);
    await B.evaluate(id => { Social.goTo(id); }, ids.A);
    const asked = await until(B, () => !document.querySelector('#w-confirm').classList.contains('hidden') && /PvP/.test(document.querySelector('#w-confirm').textContent), null, 5000);
    await B.evaluate(() => { const b = [...document.querySelectorAll('#w-confirm .cf-btns button')][1]; if (b) b.click(); }); // Cancel
    await B.waitForTimeout(300);
    ok('ไปหาแผนที่ PvP: ถามยืนยันก่อน และยกเลิกได้', asked && await B.evaluate(() => !Nav.target));
    await B.evaluate(m => { delete MAP_DEFS[m].pvp; }, side);
    await A.evaluate(() => changeMap(HOME_MAP, 20.5, 24.5));

    // ---- เพื่อนออนไลน์ → แจ้งเตือน • เชิญปาร์ตี้จากรายชื่อเพื่อน • ลบเพื่อน ----
    const cReq = await C.evaluate(async () => { const r = await Social.request('Bobby'); return { r, msg: Social.addMsg, server: Social.server }; });
    const bIn = await until(B, id => Social.friends.get(id) && Social.friends.get(id).dir === 'in', ids.C, 10000);
    await B.evaluate(id => Social.accept(id), ids.C);
    const cB = await until(C, id => Social.isFriend(id), ids.B, 10000);
    ok('C ขอ B → B ตอบรับ → เป็นเพื่อนกัน', cReq.r && bIn && cB, { cReq, bIn, cB });
    await C.evaluate(() => Social.leave()); // หลุด/ปิดแอปแล้วกลับมา (tick เข้าช่องใหม่เอง)
    const toastOn = await until(B, () => /เพื่อน Carol ออนไลน์แล้ว/.test([...document.querySelectorAll('#chat-log .cl')].map(e => e.textContent).join('\n')), null, 15000);
    if (!toastOn) console.log('  debug:', await B.evaluate(id => JSON.stringify({ players: [...Social.players.keys()], seen: Social.seenIds && [...Social.seenIds], fr: Social.isFriend(id), log: [...document.querySelectorAll('#chat-log .cl')].slice(-4).map(e => e.textContent) }), ids.C), await C.evaluate(() => JSON.stringify({ ch: !!Social.ch, joined: Social.joined, on: Online.online, st: Social.ch && Object.keys(Social.ch.presenceState()) })));
    ok('เพื่อนกลับมาออนไลน์: มีแจ้งเตือน', toastOn);
    await B.evaluate(() => Social.show('friends'));
    await until(B, id => !!document.querySelector(`#w-social .so-row[data-id="${id}"] [data-act="party"]:not([disabled])`), ids.C, 8000);
    await tap(B, `#w-social .so-row[data-id="${ids.C}"] [data-act="party"]`);
    const inv = await until(C, () => !!Party.invite, null, 10000);
    ok('เชิญเข้าปาร์ตี้จากรายชื่อเพื่อน (ใช้ Party เดิม)', inv && await C.evaluate(() => Party.invite.fromName === 'Bobby'));
    await C.evaluate(() => Party.decline());
    const ru3 = await uiRules(B, '#w-social');
    ok('แท็บเพื่อน 1100×700: ตามกติกาหน้าตา', rulesOk(ru3), ru3);
    await A.evaluate(() => Social.show('friends'));
    const ru4 = await uiRules(A, '#w-social');
    ok('แท็บเพื่อน 1600×900: ตามกติกาหน้าตา', rulesOk(ru4), ru4);
    await shot(A, 'social-09-friends-1600');
    await A.evaluate(() => UI.close('w-social'));
    await C.evaluate(() => Social.show('friends'));
    await until(C, () => document.querySelectorAll('#w-social .so-row').length >= 1, null, 5000);
    const ru5 = await uiRules(C, '#w-social');
    ok('แท็บเพื่อน 390×844: ตามกติกาหน้าตา', rulesOk(ru5), ru5);
    await shot(C, 'social-10-friends-390');
    // ลบเพื่อน (B ลบ C) → ยืนยัน → ทั้งสองฝั่งหาย
    await B.evaluate(id => { Social.remove(id, 'unfriend'); }, ids.C);
    await until(B, () => !document.querySelector('#w-confirm').classList.contains('hidden'), null, 5000);
    await B.evaluate(() => [...document.querySelectorAll('#w-confirm .cf-btns button')][0].click()); // OK
    const gone = await until(B, id => !Social.friends.has(id), ids.C, 10000) && await until(C, id => !Social.friends.has(id), ids.B, 10000);
    ok('ลบเพื่อน: หายทั้งสองฝั่ง', gone);
    // เมนูมือถือ (แผ่นเมนู hud-c): มีช่อง เพื่อน/ออนไลน์
    const sheet = await C.evaluate(() => { const b = document.querySelector('#menubar [data-win="w-social"]'); return !!b && document.body.classList.contains('hudc') ? !!b.closest('.menu-grid') : !!b; });
    ok('มือถือ: ช่อง เพื่อน/ออนไลน์ ในแผ่นเมนู', sheet);
    await C.evaluate(() => UI.close('w-social'));
    await C.evaluate(() => { const m = document.querySelector('#menubar'); UI.setFold(m, false); });
    await C.waitForTimeout(400);
    await shot(C, 'social-11-sheet-390');
    await C.evaluate(() => { const m = document.querySelector('#menubar'); UI.setFold(m, true); });

    // ================= 6) เซิร์ฟเวอร์ยังไม่มีระบบเพื่อน =================
    const ctxNo = await newCtx(b, () => { window.__noFriendsServer = true; });
    const N = await player(ctxNo, BASE, 'nof_' + sfx, 'Nofri', { width: 390, height: 844 }); pages.push(N);
    await until(N, () => Social.server === false, null, 15000);
    await N.evaluate(() => Social.show('friends'));
    const no = await N.evaluate(() => ({ server: Social.server, tabs: !!document.querySelector('#w-social .so-tabs'), note: (document.querySelector('#w-social [data-note="no-friends"]') || {}).textContent || '', rows: document.querySelectorAll('#w-social .so-row').length, add: !!document.querySelector('#w-social [data-act="add"]') }));
    ok('ไม่มีตารางเพื่อนบนเซิร์ฟเวอร์: ซ่อนแท็บเพื่อน + ข้อความ + ยังเห็นผู้เล่นออนไลน์', no.server === false && !no.tabs && /ระบบเพื่อนยังไม่เปิดบนเซิร์ฟเวอร์/.test(no.note) && no.rows >= 1 && !no.add, no);
    await shot(N, 'social-12-nofriends-390');
    const card2 = await N.evaluate(() => { const r = Social.cardButtons({ id: 'u_other', name: 'X' }, () => {}); return r.map(b => b.dataset.act); });
    ok('ไม่มีระบบเพื่อน: การ์ดผู้เล่นมีแค่ ไปหา', JSON.stringify(card2) === '["goto"]', card2);
    await ctxNo.close();

    // ================= 7) สรุป =================
    const errs = []; for (const P of pages) if (P.errs) errs.push(...P.errs);
    ok('ไม่มี page error', !errs.length, errs.slice(0, 5));
    ok('ไม่แตะ Supabase จริง', realHits === 0, realHits);
  } catch (e) { fail++; console.log('✘ เทสต์ล้ม:', e.stack.split('\n').slice(0, 4).join(' | ')); }
  await b.close(); srv.close();
  console.log(`\n${pass} ผ่าน • ${fail} ไม่ผ่าน`);
  process.exit(fail ? 1 : 0);
})();
