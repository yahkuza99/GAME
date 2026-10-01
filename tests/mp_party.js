// ทดสอบระบบปาร์ตี้ 2 ผู้เล่น (Supabase ปลอม): สร้าง/เชิญ/รับ, เห็นกันในหน้าต่างปาร์ตี้พร้อม HP, แชท /p,
// แบ่ง EXP (Even Share) + ระยะ 25 ช่อง, เตะ, /invite ตามชื่อ, หัวหน้าออกแล้วคนถัดไปเป็นแทน, ออกจากปาร์ตี้, โหมดออฟไลน์
// ใช้: (python3 -m http.server 8790 &) ; NODE_PATH=$(npm root -g) node tests/mp_party.js   (พอร์ตอื่น: BASE=http://localhost:PORT/index.html)
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:8790/index.html';
const FAKE = path.join(__dirname, 'fake_supabase.js');
let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) { pass++; console.log('✔', name, info ? ` (${info})` : ''); } else { fail++; console.log('✘', name, info ? ` (${info})` : ''); } };
const until = async (page, fn, arg, ms = 6000) => { try { await page.waitForFunction(fn, arg, { timeout: ms }); return true; } catch (e) { return false; } };

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
const say = async (p, text) => { await p.fill('#chat-input', text); await p.press('#chat-input', 'Enter'); };
const chatLog = p => p.evaluate(() => [...document.querySelectorAll('#chat-log .cl')].map(e => e.className + '|' + e.textContent).join('\n'));

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 1100, height: 680 } });
  await ctx.addInitScript({ path: FAKE });
  await ctx.route(/fake\.supabase\.test\/auth\/v1\/settings/, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"mailer_autoconfirm":true}' }));
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));

  const sfx = Date.now().toString(36).slice(-3);
  const A = await player(ctx, 'alice_' + sfx, { name: 'Alice' });
  const B = await player(ctx, 'bob_' + sfx, { name: 'Bobby' });
  ok('ออนไลน์ทั้งคู่', await A.evaluate(() => Online.online) && await B.evaluate(() => Online.online));
  ok('A เห็น B ในแผนที่', await until(A, () => [...Online.others.values()].some(o => o.name === 'Bobby')));

  // ---- สร้างปาร์ตี้ด้วยคำสั่งแชท ----
  await say(A, '/party create ทีมทดสอบ');
  ok('/party create ตั้งปาร์ตี้', await A.evaluate(() => Party.party && Party.party.name === 'ทีมทดสอบ' && Party.isLeader()));
  ok('แถบปาร์ตี้บน HUD แสดง', await until(A, () => !document.querySelector('#party-hud').hidden && /ทีมทดสอบ/.test(document.querySelector('#party-hud').textContent)));

  // ---- เชิญจากหน้าต่างปาร์ตี้ (Y) → B กดรับในโทสต์ ----
  await A.keyboard.press('y');
  ok('กด Y เปิดหน้าต่างปาร์ตี้', await A.evaluate(() => UI.isOpen('w-party')));
  ok('รายชื่อผู้เล่นใกล้ ๆ มีปุ่มเชิญ Bobby', await until(A, () => [...document.querySelectorAll('#w-party .py-nrow')].some(r => /Bobby/.test(r.textContent) && r.querySelector('.py-inv'))));
  await A.click('#w-party .py-nrow .py-inv');
  ok('B ได้รับโทสต์คำเชิญ', await until(B, () => { const t = document.querySelector('#party-invite'); return t && !t.hidden && /Alice/.test(t.textContent) && /ทีมทดสอบ/.test(t.textContent); }));
  await B.click('#party-invite .pinv-yes');
  ok('B เข้าปาร์ตี้แล้ว', await until(B, () => Party.party && Party.party.name === 'ทีมทดสอบ'));
  ok('A เห็น B เป็นสมาชิก', await until(A, () => [...Party.party.members.values()].some(m => m.name === 'Bobby')));
  ok('B เห็น A เป็นหัวหน้า', await until(B, () => { const m = [...Party.party.members.values()].find(m => m.name === 'Alice'); return m && Party.leaderId() === m.id && !Party.isLeader(); }));

  // ---- หน้าต่างปาร์ตี้ของทั้งคู่: สมาชิก 2 คน พร้อม HP ----
  await B.keyboard.press('y');
  for (const [n, p, other] of [['A', A, 'Bobby'], ['B', B, 'Alice']]) {
    const good = await until(p, o => {
      const rows = [...document.querySelectorAll('#w-party .py-row')];
      const r = rows.find(x => x.querySelector('.py-n b').textContent === o);
      return rows.length === 2 && r && /^\d+\/\d+$/.test(r.querySelector('.py-bar.hp em').textContent) && parseFloat(r.querySelector('.py-bar.hp b').style.width) > 0;
    }, other);
    ok(`หน้าต่างปาร์ตี้ ${n}: เห็น ${other} พร้อมหลอด HP`, good, await p.evaluate(() => [...document.querySelectorAll('#w-party .py-row')].map(r => r.textContent).join(' / ')));
    ok(`แถบ HUD ${n}: แถว ${other} มีหลอด HP`, await until(p, o => [...document.querySelectorAll('#party-hud .ph-row')].some(r => r.textContent.includes(o) && parseFloat(r.querySelector('.hp b').style.width) > 0), other));
  }
  ok('หัวหน้ามีปุ่มเตะ ลูกทีมไม่มี', await A.evaluate(() => !!document.querySelector('#w-party .py-kick')) && await B.evaluate(() => !document.querySelector('#w-party .py-kick')));
  ok('ป้ายชื่อเพื่อนร่วมปาร์ตี้เป็นสีปาร์ตี้', await A.evaluate(() => { const o = [...Online.others.values()].find(o => o.name === 'Bobby'); return !!(o && Party.member(o.id)); }));

  // ---- แชทปาร์ตี้ ----
  await say(B, '/p สวัสดีทีม');
  ok('/p ถึง A (สีปาร์ตี้)', await until(A, () => [...document.querySelectorAll('#chat-log .cl.party')].some(e => /\[ปาร์ตี้\] Bobby : สวัสดีทีม/.test(e.textContent))), (await chatLog(A)).split('\n').slice(-3).join(' || '));
  ok('/p แสดงในแชทของ B เอง', /\[ปาร์ตี้\] Bobby : สวัสดีทีม/.test(await chatLog(B)));

  // ---- แบ่ง EXP: แผนที่เดียวกัน ใกล้กัน ----
  await A.evaluate(() => changeMap('meadow', 28.5, 28.5));
  await B.evaluate(() => changeMap('meadow', 30.5, 28.5));
  ok('ทั้งคู่อยู่ meadow', await until(A, () => { const m = [...Party.party.members.values()][0]; return m && m.map === 'meadow' && G.map.id === 'meadow'; }));
  await A.waitForTimeout(400);
  const before = await B.evaluate(() => ({ e: G.player.baseExp, lv: G.player.baseLv, je: G.player.jobExp }));
  const kill = await A.evaluate(() => {
    const p = G.player, e0 = p.baseExp, lv0 = p.baseLv, m = spawnMob('pudding', { x: Math.floor(p.x) + 1, y: Math.floor(p.y) });
    killMob(m);
    return { exp: m.def.exp, jexp: m.def.jexp, gain: p.baseLv === lv0 ? p.baseExp - e0 : null, elig: Party.eligible().length };
  });
  const share = Math.round(kill.exp * 1.15 / 2);
  ok('A ได้ส่วนแบ่งของตัวเอง', kill.gain === share, `ได้ ${kill.gain} คาด ${share} (มอน ${kill.exp} EXP, ร่วมแบ่ง ${kill.elig + 1} คน)`);
  ok('B ได้ EXP จากปาร์ตี้', await until(B, b0 => G.player.baseLv > b0.lv || G.player.baseExp > b0.e, before));
  const after = await B.evaluate(() => ({ e: G.player.baseExp, lv: G.player.baseLv }));
  ok('B ได้เท่ากับส่วนแบ่ง', after.lv > before.lv || after.e - before.e === share, `+${after.e - before.e} คาด ${share}`);

  // ---- ไกลเกิน 25 ช่อง: ไม่แบ่ง ----
  await B.evaluate(() => { const m = G.map; let best = null; for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) if (m.walkable(x, y) && U.dist(x, y, 28, 28) > 34 && (!best || U.dist(x, y, 28, 28) > U.dist(best.x, best.y, 28, 28))) best = { x, y }; teleportPlayer(best.x + 0.5, best.y + 0.5); Party.heartbeat(true); Online.sendPos(true); });
  ok('A เห็น B อยู่ไกล', await until(A, () => Party.eligible().length === 0), await A.evaluate(() => JSON.stringify([...Party.party.members.values()].map(m => [m.x, m.y]))));
  const far0 = await B.evaluate(() => G.player.baseExp);
  const solo = await A.evaluate(() => { const p = G.player, e0 = p.baseExp, lv0 = p.baseLv, m = spawnMob('pudding', { x: Math.floor(p.x) + 1, y: Math.floor(p.y) }); killMob(m); return p.baseLv === lv0 ? p.baseExp - e0 : null; });
  ok('ไกลเกิน: A ได้ EXP เต็ม', solo === kill.exp, `${solo}`);
  await B.waitForTimeout(700);
  ok('ไกลเกิน: B ไม่ได้ EXP', await B.evaluate(e => G.player.baseExp === e, far0));

  // ---- เตะ (หัวหน้า) → ยืนยัน ----
  await A.evaluate(() => UI.open('w-party'));
  await until(A, () => !!document.querySelector('#w-party .py-kick'));
  await A.click('#w-party .py-kick');
  await A.click('#w-confirm .cf-btns .btn:first-child');
  ok('เตะ: B ออกจากปาร์ตี้', await until(B, () => !Party.party));
  ok('เตะ: A เหลือคนเดียว', await until(A, () => Party.party && Party.party.members.size === 0));
  ok('เตะ: B ได้ข้อความแจ้ง', /ถูกเตะออกจากปาร์ตี้/.test(await chatLog(B)));

  // ---- /invite ตามชื่อ (คนละที่ในแผนที่) → รับ → หัวหน้าออก → ลูกทีมเป็นหัวหน้าแทน ----
  await say(A, '/invite bobby');
  ok('/invite ตามชื่อ: B ได้คำเชิญ', await until(B, () => !document.querySelector('#party-invite').hidden));
  await B.click('#party-invite .pinv-yes');
  ok('รับคำเชิญรอบสอง', await until(A, () => Party.party.members.size === 1) && await until(B, () => Party.party && Party.party.members.size === 1));
  await say(A, '/leave');
  ok('/leave: A ออกจากปาร์ตี้', await A.evaluate(() => !Party.party && document.querySelector('#party-hud').hidden));
  ok('หัวหน้าออก → B เป็นหัวหน้าใหม่', await until(B, () => Party.party && Party.party.members.size === 0 && Party.isLeader()));
  ok('B ได้ข้อความหัวหน้าใหม่', /คุณเป็นหัวหน้าปาร์ตี้คนใหม่/.test(await chatLog(B)));
  await say(B, '/leave');
  ok('/leave: B ออกจากปาร์ตี้', await B.evaluate(() => !Party.party && document.querySelector('#party-hud').hidden));
  await say(B, '/p ยังอยู่ไหม');
  ok('/p ตอนไม่มีปาร์ตี้ = แจ้งเตือน', /ยังไม่ได้อยู่ในปาร์ตี้/.test(await chatLog(B)));

  // ---- ปฏิเสธคำเชิญ ----
  await A.evaluate(() => Party.create());
  await A.evaluate(() => { const o = [...Online.others.values()].find(o => o.name === 'Bobby'); Party.sendInvite(o ? { id: o.id, name: o.name } : { name: 'Bobby' }); });
  ok('ปฏิเสธ: B ได้คำเชิญ', await until(B, () => !document.querySelector('#party-invite').hidden));
  await B.click('#party-invite .pinv-no');
  ok('ปฏิเสธ: A ได้ข้อความ', await until(A, () => /Bobby ปฏิเสธคำเชิญ/.test(document.querySelector('#chat-log').textContent)));
  await A.evaluate(() => Party.leave(true));

  for (const [n, p] of [['A', A], ['B', B]]) ok(`ไม่มี error ใน ${n}`, !p.errs.length, p.errs.join(' || '));

  // ---- โหมดออฟไลน์: หน้าต่างแจ้งว่าต้องออนไลน์ ----
  const off = await b.newContext({ viewport: { width: 1100, height: 680 } });
  await off.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  const C = await off.newPage(); C.errs = [];
  C.on('pageerror', e => C.errs.push(e.message));
  await C.goto(BASE);
  await C.waitForSelector('#au-offline', { state: 'visible', timeout: 20000 });
  await C.click('#au-offline'); await C.click('#btn-new'); await C.fill('#cr-name', 'Solo'); await C.click('#cr-start');
  await C.waitForFunction(() => G.started, null, { timeout: 15000 });
  await C.keyboard.press('y');
  ok('ออฟไลน์: หน้าต่างปาร์ตี้บอกให้เล่นออนไลน์', await until(C, () => /โหมดออนไลน์/.test(document.querySelector('#w-party .win-body').textContent)));
  await C.evaluate(() => UI.chat('/party create'));
  ok('ออฟไลน์: /party create แจ้งว่าใช้ไม่ได้', await C.evaluate(() => !Party.party && /เฉพาะโหมดออนไลน์/.test(document.querySelector('#chat-log').textContent)));
  const solo2 = await C.evaluate(() => { const p = G.player, e0 = p.baseExp, m = spawnMob('pudding', { x: Math.floor(p.x) + 1, y: Math.floor(p.y) }); killMob(m); return p.baseExp - e0 === m.def.exp; });
  ok('ออฟไลน์: ฆ่ามอนได้ EXP ปกติ', solo2);
  ok('ไม่มี error ในโหมดออฟไลน์', !C.errs.length, C.errs.join(' || '));

  await b.close();
  console.log(fail ? `${fail} FAILED, ${pass} passed` : `ALL ${pass} PASSED`);
  process.exit(fail ? 1 : 0);
})();
