// ทดสอบหลายผู้เล่น (2 แท็บ) ด้วย Supabase ปลอม: เห็นกัน แชทสด PvP ปาร์ตี้
// ใช้: (python3 -m http.server 8790 &) ; NODE_PATH=$(npm root -g) node tests/multiplayer.js
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:8790/index.html';
const FAKE = path.join(__dirname, 'fake_supabase.js');
let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) { pass++; console.log('✔', name, info ? ` (${info})` : ''); } else { fail++; console.log('✘', name, info ? ` (${info})` : ''); } };

async function player(ctx, user, opts = {}) {
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.stack.split('\n').slice(0, 3).join(' | ')));
  await p.goto(BASE);
  await p.waitForFunction(() => typeof Online !== 'undefined' && !document.querySelector('#auth').classList.contains('hidden'), null, { timeout: 20000 });
  await p.click('#au-tabs [data-mode="register"]');
  await p.fill('#au-user', user); await p.fill('#au-pass', 'pass1234'); await p.fill('#au-pass2', 'pass1234'); await p.click('#au-submit');
  await p.waitForSelector('#cr-name', { state: 'visible', timeout: 10000 });
  await p.fill('#cr-name', opts.name || user); await p.click('#cr-start');
  await p.waitForFunction(() => G.started, null, { timeout: 15000 });
  await p.evaluate(() => document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden')));
  return p;
}

(async () => {
  // ปิดการลดความเร็วแท็บพื้นหลัง: ทั้งสองผู้เล่นต้องวิ่งพร้อมกันจริง
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  const ctx = await b.newContext({ viewport: { width: 1100, height: 680 } });
  await ctx.addInitScript({ path: FAKE });
  await ctx.route(/fake\.supabase\.test\/auth\/v1\/settings/, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"mailer_autoconfirm":true}' }));
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));

  const A = await player(ctx, 'alice_' + Date.now().toString(36).slice(-3), { name: 'Alice' });
  const B = await player(ctx, 'bob_' + Date.now().toString(36).slice(-3), { name: 'Bobby' });
  ok('ออนไลน์ทั้งคู่ (ผ่าน Supabase ปลอม)', await A.evaluate(() => Online.online) && await B.evaluate(() => Online.online));

  // เห็นกันในเมือง
  await A.waitForFunction(() => Online.others.size > 0, null, { timeout: 20000 }).catch(() => {});
  await B.waitForFunction(() => Online.others.size > 0, null, { timeout: 20000 }).catch(() => {});
  const seeA = await A.evaluate(() => [...Online.others.values()].map(o => o.name));
  const seeB = await B.evaluate(() => [...Online.others.values()].map(o => o.name));
  ok('A เห็น B', seeA.includes('Bobby'), JSON.stringify(seeA));
  ok('B เห็น A', seeB.includes('Alice'), JSON.stringify(seeB));

  // แชทสด
  await B.evaluate(() => Online.sendChat('สวัสดี Alice'));
  await A.waitForFunction(() => /สวัสดี Alice/.test(document.querySelector('#chat-log').textContent), null, { timeout: 10000 }).catch(() => {});
  const log = await A.evaluate(() => [...document.querySelectorAll('#chat-log .cl')].map(e => e.textContent).join('\n'));
  ok('แชทจาก B ถึง A', /สวัสดี Alice/.test(log));

  if (globalThis.EXTRA) await globalThis.EXTRA(A, B, ok);
  for (const [n, p] of [['A', A], ['B', B]]) ok(`ไม่มี error ใน ${n}`, !p.errs.length, p.errs.join(' || '));
  await b.close();
  console.log(fail ? `${fail} FAILED, ${pass} passed` : `ALL ${pass} PASSED`);
  process.exit(fail ? 1 : 0);
})();
