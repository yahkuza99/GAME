'use strict';
// ============================================================
//  ทดสอบวงล้อนอร์น (กาชา): ตาราง % รายชิ้น / สุ่มตรงสัดส่วน / การันตี ×10 / pity / ตราจากบอส / เซฟ-โหลด / ภาษาอังกฤษ
//  รัน:  NODE_PATH=$(npm root -g) node tests/gacha.js   (เปิดเซิร์ฟเวอร์เอง หรือตั้ง BASE=http://localhost:พอร์ต/index.html)
//  SHOTS=โฟลเดอร์  → บันทึกภาพหน้าจอ (เครื่อง / ผล ×10 / อัตรารางวัล) ทั้งจอคอมและมือถือ ไทย + อังกฤษ
// ============================================================
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
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

const checks = [];
const ok = (name, cond, info = '') => checks.push([name, !!cond, info]);
const THAI = /[฀-๿]/;
const SHOTS = process.env.SHOTS || '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

async function start(p, url, name) {
  await p.goto(url); await p.waitForTimeout(1200);
  await p.click('#au-offline'); await p.click('#btn-new');
  await p.fill('#cr-name', name); await p.click('#cr-start'); await p.waitForTimeout(1500);
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 8000, polling: 250 }).catch(() => {});
  await p.waitForTimeout(500);
  await p.click('#w-help .win-x').catch(() => {});
}
// ให้แอนิเมชันจบเร็ว: แตะข้ามจนเสร็จ
async function rollUi(p, multi) {
  await p.click(`#w-gacha .gc-main > .gc-btns [data-roll="${multi ? 'multi' : 'one'}"]`);
  for (let i = 0; i < 40; i++) {
    if (await p.evaluate(() => !Gacha.anim)) break;
    await p.evaluate(() => Gacha.fastForward()); await p.waitForTimeout(150);
  }
}

(async () => {
  let srv = null, url = process.env.BASE;
  if (!url) { srv = await serve(); url = `http://localhost:${srv.address().port}/index.html`; }
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  else if (fs.existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(opts);
  const errors = [];

  // ================= 1) ภาษาไทย จอคอม: ระบบหลัก =================
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push('th: ' + e.message));
    await start(p, url, 'Gacha');
    ok('game started', await p.evaluate(() => G.started && typeof Gacha !== 'undefined'));

    // ---- ตาราง ----
    const tbl = await p.evaluate(() => ({
      n: Gacha.rows.length, raw: GACHA_CONFIG.table.reduce((a, r) => a + r.pct, 0), norm: Gacha.rows.reduce((a, r) => a + r.w, 0),
      bad: GACHA_CONFIG.table.filter(r => r.volt == null && !ITEMS[r.id]).map(r => r.id), token: ITEMS[GACHA_CONFIG.token],
      tiers: [...new Set(Gacha.rows.map(r => r.rar))].join(','),
    }));
    ok('table has 15–20 prizes, all real items', tbl.n >= 15 && tbl.n <= 20 && !tbl.bad.length, `${tbl.n} ${tbl.bad.join(',')}`);
    ok('configured percentages add up to 100', Math.abs(tbl.raw - 100) <= 0.001, tbl.raw);
    ok('normalized weights add up to 100', Math.abs(tbl.norm - 100) < 1e-9, tbl.norm);
    ok('token item exists (etc, rare, procedural icon)', tbl.token && tbl.token.type === 'etc' && tbl.token.rarity === 'rare' && tbl.token.icon.s === 'sigil');
    ok('prizes span every rarity tier', ['common', 'uncommon', 'rare', 'epic', 'legend'].every(k => tbl.tiers.includes(k)), tbl.tiers);
    // ตารางผิด: เตือนใน Console และปรับสัดส่วนเอง (ผู้เล่นไม่เห็น)
    const warn = await p.evaluate(() => {
      const keep = GACHA_CONFIG.table, warns = [], w0 = console.warn; console.warn = m => warns.push(String(m));
      GACHA_CONFIG.table = [{ id: 'red_potion', qty: 1, pct: 30 }, { id: 'no_such_item', pct: 10 }, { volt: 100, pct: 30, rarity: 'rare' }];
      Gacha.validate(); const r = { warns, sum: Gacha.rows.reduce((a, x) => a + x.w, 0), n: Gacha.rows.length, chat: document.querySelector('#chat-log').textContent.includes('normaliz') };
      console.warn = w0; GACHA_CONFIG.table = keep; Gacha.validate(); return r;
    });
    ok('bad table → console warning + normalized to 100, not shown to players', warn.warns.some(w => /add up to 60/.test(w)) && warn.warns.some(w => /no_such_item/.test(w)) && Math.abs(warn.sum - 100) < 1e-9 && warn.n === 2 && !warn.chat, JSON.stringify(warn));

    // ---- 100k สุ่ม: ตรงกับ % ที่ตั้ง ----
    const sim = await p.evaluate(N => {
      const cnt = new Map(Gacha.rows.map(r => [r, 0]));
      for (let i = 0; i < N; i++) { const r = Gacha.pick(); cnt.set(r, cnt.get(r) + 1); }
      let worst = 0, worstId = '';
      const rows = Gacha.rows.map(r => {
        const pr = r.w / 100, obs = cnt.get(r), exp = N * pr, sd = Math.sqrt(N * pr * (1 - pr)), z = Math.abs(obs - exp) / sd;
        if (z > worst) { worst = z; worstId = r.id || r.volt; }
        return `${r.id || r.volt + 'V'}:${(obs / N * 100).toFixed(3)}/${r.w}`;
      });
      // การันตี/pity: สุ่มใหม่ในกลุ่มที่เข้าเงื่อนไข ตามสัดส่วน pct เดิม
      const E = Gacha.rows.filter(r => r.rank >= 3), Et = E.reduce((a, r) => a + r.w, 0), ec = new Map(E.map(r => [r, 0])), M = 50000;
      for (let i = 0; i < M; i++) { const r = Gacha.pick(3); ec.set(r, (ec.get(r) || 0) + 1); }
      let ez = 0, outside = 0;
      for (const [r, c] of ec) { if (r.rank < 3) { outside += c; continue; } const pr = r.w / Et, z = Math.abs(c - M * pr) / Math.sqrt(M * pr * (1 - pr)); ez = Math.max(ez, z); }
      return { worst: +worst.toFixed(2), worstId, rows, ez: +ez.toFixed(2), outside };
    }, 100000);
    ok('100k rolls match every configured % (all within 4.5σ)', sim.worst < 4.5, `worst z=${sim.worst} (${sim.worstId})`);
    console.log('  observed/configured %:', sim.rows.join(' '));
    ok('eligible-subset re-roll keeps configured proportions (epic+)', sim.ez < 4.5 && sim.outside === 0, `z=${sim.ez} outside=${sim.outside}`);

    // ---- pity / การันตี ×10 ในการจำลองยาว ----
    const pity = await p.evaluate(() => {
      const st = { pity: 0 }, every = GACHA_CONFIG.pity.every; let dry = 0, maxDry = 0, epic = 0, n = 0;
      for (let i = 0; i < 20000; i++) for (const r of Gacha.rollRows(1, st, false)) { n++; if (r.rank >= 3) { epic++; maxDry = Math.max(maxDry, dry + 1); dry = 0; } else dry++; }
      let tenFail = 0;
      for (let i = 0; i < 5000; i++) { const s = { pity: 0 }; if (!Gacha.rollRows(10, s, true).some(r => r.rank >= 2)) tenFail++; }
      return { every, maxDry, rate: epic / n, tenFail };
    });
    ok(`pity: never more than ${pity.every} rolls without Epic+`, pity.maxDry <= pity.every, `longest wait ${pity.maxDry}`);
    ok('×10 always contains at least one Rare+ (5000 bulk rolls)', pity.tenFail === 0, pity.tenFail);

    // ---- หมุนจริง (Math.random = 0 → ของแถวแรกเสมอ: ทดสอบการันตีแบบกำหนดได้) ----
    const det = await p.evaluate(() => {
      const pl = G.player, rnd = Math.random; Math.random = () => 0;
      pl.inventory = pl.inventory.filter(e => e.id !== Gacha.TOKEN); addItem(Gacha.TOKEN, 11, true);
      Gacha.st().pity = 0;
      const wp0 = (pl.inventory.find(e => e.id === 'white_potion') || { qty: 0 }).qty;
      const ten = Gacha.roll(true); Gacha.anim = null;
      const afterTen = { tokens: Gacha.tokens(), pity: Gacha.st().pity, ranks: ten.map(r => r.rank), wp: (pl.inventory.find(e => e.id === 'white_potion') || { qty: 0 }).qty - wp0 };
      Gacha.st().pity = GACHA_CONFIG.pity.every - 1;
      const one = Gacha.roll(false); Gacha.anim = null;
      const afterPity = { rank: one[0].rank, pity: Gacha.st().pity, tokens: Gacha.tokens() };
      Math.random = rnd;
      return { afterTen, afterPity, total: Gacha.st().total, hist: Gacha.st().hist.length };
    });
    ok('×10 guarantee: 9 commons then the 10th re-rolled to Rare+', det.afterTen.ranks.slice(0, 9).every(r => r === 0) && det.afterTen.ranks[9] >= 2, det.afterTen.ranks.join(','));
    ok('×10 costs 10 Sigils and grants the prizes', det.afterTen.tokens === 1 && det.afterTen.wp === 9 * 5, JSON.stringify(det.afterTen));
    ok('pity counter counts non-Epic rolls', det.afterTen.pity === 10, det.afterTen.pity);
    ok(`pity: roll #${50} is guaranteed Epic+ and the counter resets`, det.afterPity.rank >= 3 && det.afterPity.pity === 0 && det.afterPity.tokens === 0, JSON.stringify(det.afterPity));
    ok('total rolls + history recorded', det.total === 11 && det.hist === 11, `${det.total} / ${det.hist}`);

    // ---- ไม่มีตรา หมุนไม่ได้ ----
    const none = await p.evaluate(() => {
      const pl = G.player, inv = JSON.stringify(pl.inventory), pity = Gacha.st().pity, z = pl.zeny;
      const r1 = Gacha.roll(false), r10 = Gacha.roll(true);
      UI.open('w-gacha');
      const btns = [...document.querySelectorAll('#w-gacha [data-roll]')].map(b => b.disabled);
      return { r1, r10, same: inv === JSON.stringify(pl.inventory) && pity === Gacha.st().pity && z === pl.zeny, btns };
    });
    ok("can't roll without Sigils (state unchanged, buttons disabled)", none.r1 === null && none.r10 === null && none.same && none.btns.length === 2 && none.btns.every(Boolean), JSON.stringify(none));
    const nine = await p.evaluate(() => { addItem(Gacha.TOKEN, 9, true); UI.renderWindows(true); const b = [...document.querySelectorAll('#w-gacha .gc-main > .gc-btns [data-roll]')].map(x => x.disabled); return { b, r: Gacha.canRoll(true) }; });
    ok('9 Sigils: ×1 enabled, ×10 disabled', !nine.b[0] && nine.b[1] && !nine.r, JSON.stringify(nine));

    // ---- หน้าต่าง: ตาราง Rates แสดงทุกชิ้นพร้อม % ----
    const rates = await p.evaluate(() => {
      Gacha.tab = 'rates'; Gacha.render();
      const rows = [...document.querySelectorAll('#w-gacha .gc-rrow')];
      const want = Gacha.rows.map(r => Gacha.fmtPct(r.w)).sort().join('|'), got = rows.map(r => r.querySelector('.gc-rp').textContent).sort().join('|');
      const ranks = rows.map(r => Gacha.rows.find(x => Gacha.rowFull(x) === r.querySelector('.gc-rn b').textContent).rank);
      const sorted = ranks.every((v, i) => !i || ranks[i - 1] >= v);
      const pityTxt = document.querySelector('#w-gacha .gc-rpity').textContent;
      Gacha.tab = 'wheel'; Gacha.render();
      return { n: rows.length, same: want === got, sorted, pityTxt };
    });
    ok('rates tab lists every prize with its exact %, sorted by rarity', rates.n === tbl.n && rates.same && rates.sorted, JSON.stringify(rates));
    ok('rates tab shows the pity counter', /\d+\/50/.test(rates.pityTxt), rates.pityTxt);

    // ---- แอนิเมชันผ่าน UI: ×10 → การ์ด 10 ใบ เปิดครบ / ประกาศในแชตหลังเปิด ----
    await p.evaluate(() => { addItem(Gacha.TOKEN, 20, true); UI.renderWindows(true); });
    await p.click('#w-gacha .gc-main > .gc-btns [data-roll="multi"]');
    await p.waitForTimeout(400);
    const mid = await p.evaluate(() => ({ busy: !!Gacha.anim, cards: document.querySelectorAll('#w-gacha .gc-card').length }));
    for (let i = 0; i < 40 && await p.evaluate(() => !!Gacha.anim); i++) { await p.evaluate(() => Gacha.fastForward()); await p.waitForTimeout(150); }
    const fin = await p.evaluate(() => ({ cards: document.querySelectorAll('#w-gacha .gc-card').length, on: document.querySelectorAll('#w-gacha .gc-card.on').length, foot: !!document.querySelector('#w-gacha .gc-rfoot'),
      chat: [...document.querySelectorAll('#chat-log .cl')].map(e => e.textContent).filter(t => /วงล้อนอร์น/.test(t)).length }));
    ok('×10 animation runs (spin first, cards after) and is skippable', mid.busy && mid.cards === 0 && fin.cards === 10 && fin.on === 10 && fin.foot, JSON.stringify([mid, fin]));
    ok('results posted to chat after the reveal', fin.chat >= 1, fin.chat);
    // ปิดหน้าต่างกลางแอนิเมชัน: ของได้ครบแล้ว ไม่ค้าง
    const closeMid = await p.evaluate(async () => {
      const t0 = Gacha.tokens(); const res = Gacha.roll(false); Gacha.play(res, false);
      await new Promise(r => setTimeout(r, 200)); UI.close('w-gacha');
      return { anim: !!Gacha.anim, used: t0 - Gacha.tokens() };
    });
    ok('closing mid-animation finishes cleanly (prize already granted)', !closeMid.anim && closeMid.used === 1, JSON.stringify(closeMid));
    // กราฟิกประหยัด (หรือ prefers-reduced-motion): แอนิเมชันแบบเรียบ จบเร็ว ไม่มีหมุน/พลิก
    const low = await p.evaluate(async () => {
      const q = R.quality; R.quality = 'low'; addItem(Gacha.TOKEN, 10, true); UI.open('w-gacha'); Gacha.go(true);
      const simple = !!document.querySelector('#w-gacha .gc-main.gc-simple');
      await new Promise(r => setTimeout(r, 1200)); R.quality = q;
      return { simple, done: !Gacha.anim, on: document.querySelectorAll('#w-gacha .gc-card.on').length };
    });
    ok('low graphics: simple animation, finishes within ~1s', low.simple && low.done && low.on === 10, JSON.stringify(low));
    // epic: ประกาศ ★ … from Norn's Wheel
    const ann = await p.evaluate(() => {
      const rnd = Math.random; Math.random = () => 0; Gacha.st().pity = GACHA_CONFIG.pity.every - 1;
      const res = Gacha.roll(false); Math.random = rnd; Gacha.anim = null; Gacha.report(res, false);
      return { rank: res[0].rank, text: document.querySelector('#announce').textContent };
    });
    ok('Epic+ prize is announced ("★ … from Norn\'s Wheel")', ann.rank >= 3 && /★/.test(ann.text) && /วงล้อนอร์น/.test(ann.text), ann.text);

    // ---- ตราจากบอส ----
    const boss = await p.evaluate(() => {
      const pl = G.player, tk = () => Gacha.tokens(), out = {};
      pl.kills = Object.assign(pl.kills || {}, { seraph_pudding: 5, kitsura: 5, garmr: 5 }); // ไม่ใช่ครั้งแรก (ไม่มีฉากเล่าเรื่อง)
      let t0 = tk(); const mob = spawnMob('pudding', { x: pl.x + 1, y: pl.y }); killMob(mob); out.normal = tk() - t0;
      t0 = tk(); const mvp = spawnMob('seraph_pudding', { x: pl.x + 1, y: pl.y }); mvp.isMvp = true; killMob(mvp); out.mvp = tk() - t0;
      t0 = tk(); killMob(mvp); out.again = tk() - t0; // ตายแล้วไม่ได้ซ้ำ
      const src = UI.dropSources(Gacha.TOKEN); out.src = src ? src.textContent : '';
      UI.showMob('seraph_pudding'); out.mobWin = !!document.querySelector('#w-mob .gc-mbtok'); UI.close('w-mob');
      out.cfg = GACHA_CONFIG.drop;
      return out;
    });
    ok('normal monsters give no Sigils', boss.normal === 0, boss.normal);
    ok('MVP kill gives the killer 1 Sigil (once)', boss.mvp === boss.cfg.mvp && boss.again === 0, JSON.stringify(boss));
    ok('"Dropped by" lists MVPs and World Bosses', /Seraph/.test(boss.src) && /Kitsura/i.test(boss.src) && /World Boss/.test(boss.src) && /100%/.test(boss.src), boss.src);
    ok('monster info window shows the Sigil drop for bosses', boss.mobWin);
    // World Boss: ผู้ปิดฉาก + ผู้ร่วมตี (remoteKill) ได้ 3 • ไม่ได้ร่วมตีไม่ได้
    const wb = await p.evaluate(async () => {
      const out = {}, tk = () => Gacha.tokens();
      WB.WINDOW = WB.PERIOD; WB.st = {}; try { localStorage.removeItem('nm_wb'); } catch (e) { /* */ }
      const pl = G.player; pl.job = 'einherjar'; pl.baseLv = 60; pl.stats.vit = 99; recalc(); pl.hp = pl.d.maxHp;
      changeMap('mistlake', 20, 20);
      const live = async () => { for (let i = 0; i < 60 && !WB.live(); i++) { WB.tick(); await new Promise(r => setTimeout(r, 100)); } return WB.live(); };
      let m = await live(); out.spawned = !!m;
      let t0 = tk(); damageMob(m, 1e12); out.killer = tk() - t0;
      // ผู้ร่วมตี (อีกเครื่องปิดฉาก)
      WB.st = {}; G.mobs = G.mobs.filter(x => !x.isWB); m = await live();
      m.wbMine = 500; t0 = tk(); WB.remoteKill(m); out.helper = tk() - t0;
      // ไม่ได้ร่วมตี
      WB.st = {}; G.mobs = G.mobs.filter(x => !x.isWB); m = await live();
      m.wbMine = 0; t0 = tk(); WB.remoteKill(m); out.idle = tk() - t0;
      WB.closeResult(); changeMap('eldheim', 20.5, 24.5);
      out.n = GACHA_CONFIG.drop.worldBoss;
      return out;
    });
    ok('World Boss: the killer gets 3 Sigils', wb.spawned && wb.killer === wb.n, JSON.stringify(wb));
    ok('World Boss: every participant (remote kill) gets 3 Sigils', wb.helper === wb.n, JSON.stringify(wb));
    ok('World Boss: players who never hit it get none', wb.idle === 0, JSON.stringify(wb));

    // ---- NPC ในเมือง ----
    await p.waitForTimeout(400);
    const npc = await p.evaluate(async () => {
      const d = MAP_DEFS.eldheim.npcs.find(n => n.id === 'norn'), n = G.npcs.find(x => x.id === 'norn');
      if (!n) return { d: !!d };
      const near = [[0, 1], [1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => G.map.walkable(n.x + dx, n.y + dy));
      NPC.busy = false; NPC.talk(n); await new Promise(r => setTimeout(r, 250));
      const dlg = document.querySelector('#w-dialog .dlg-text') ? document.querySelector('#w-dialog .dlg-text').textContent : '';
      document.querySelectorAll('#w-dialog .dlg-opt')[1].click(); await new Promise(r => setTimeout(r, 250));
      return { d: !!d, near, dlg: dlg.slice(0, 60), open: UI.isOpen('w-gacha'), tab: Gacha.tab };
    });
    ok("Norn's Wheel NPC stands in Neo Eldheim and is reachable", npc.d && npc.near, JSON.stringify(npc));
    ok('talking to it opens the Gacha window (rates option)', npc.open && npc.tab === 'rates', JSON.stringify(npc));
    await p.evaluate(() => { UI.close('w-gacha'); Gacha.tab = 'wheel'; });

    // ---- เซฟ/โหลด: pity + ผลที่สุ่มแล้ว (รีเฟรชแล้วสุ่มใหม่ไม่ได้) ----
    const before = await p.evaluate(() => {
      const st = Gacha.st(); st.pity = 17; st.total = 123;
      addItem(Gacha.TOKEN, 5, true); saveGame(true, true);
      const res = Gacha.roll(false); // เซฟทันทีในตัว
      Gacha.anim = null;
      return { pity: Gacha.st().pity, total: Gacha.st().total, tokens: Gacha.tokens(), hist: Gacha.st().hist.length, got: res[0].id || res[0].volt };
    });
    await p.evaluate(() => { G.started = false; }); // ไม่ให้เซฟอัตโนมัติก่อนรีโหลด
    await p.reload(); await p.waitForTimeout(1500);
    await p.click('#au-offline'); await p.click('#btn-continue'); await p.waitForTimeout(1500);
    const after = await p.evaluate(() => ({ pity: Gacha.st().pity, total: Gacha.st().total, tokens: Gacha.tokens(), hist: Gacha.st().hist.length }));
    ok('save/load keeps pity, total and history; a roll is saved immediately', after.pity === before.pity && after.total === before.total && after.tokens === before.tokens && after.hist === before.hist && before.total === 124,
      `${JSON.stringify(before)} → ${JSON.stringify(after)}`);
    // เซฟเก่าไม่มี gacha → เริ่มนับใหม่ เล่นได้ปกติ
    const old = await p.evaluate(() => {
      const d = JSON.parse(JSON.stringify(saveData())); delete d.gacha;
      const pl = loadGameFrom(d); return { g: pl.gacha === undefined, st: JSON.stringify(Gacha.st(pl)) };
    });
    ok('old saves without gacha data still load (fresh counters)', old.g && old.st === '{"pity":0,"total":0,"hist":[]}', JSON.stringify(old));
    await ctx.close();
  }

  // ================= 2) ภาษาอังกฤษ: ไม่มีภาษาไทยใน UI กาชา =================
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await ctx.addInitScript(() => { try { localStorage.setItem('nm_lang', 'en'); } catch (e) { /* */ } });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push('en: ' + e.message));
    await start(p, url, 'Skuld');
    await p.evaluate(() => { addItem(Gacha.TOKEN, 30, true); Gacha.st().hist = []; UI.open('w-gacha'); });
    const texts = [];
    const grab = async label => texts.push([label, await p.evaluate(() => document.querySelector('#w-gacha').innerText + ' ' + [...document.querySelectorAll('#w-gacha [title]')].map(e => e.title).join(' '))]);
    await grab('wheel');
    await rollUi(p, true); await grab('x10 results');
    await p.evaluate(() => { const rnd = Math.random; Math.random = () => 0; Gacha.st().pity = 49; Gacha.go(false); Math.random = rnd; });
    for (let i = 0; i < 40 && await p.evaluate(() => !!Gacha.anim); i++) { await p.evaluate(() => Gacha.fastForward()); await p.waitForTimeout(150); }
    await grab('x1 epic');
    for (const t of ['rates', 'hist']) { await p.evaluate(tab => { Gacha.tab = tab; Gacha.render(); }, t); await grab(t); }
    const extra = await p.evaluate(async () => {
      const out = [ITEMS[Gacha.TOKEN].desc, UI.dropSources(Gacha.TOKEN).textContent, document.querySelector('#announce').textContent,
        ...[...document.querySelectorAll('#chat-log .cl')].map(e => e.textContent).filter(t => /Norn|Sigil/.test(t))];
      UI.close('w-gacha');
      const n = G.npcs.find(x => x.id === 'norn'); NPC.busy = false; NPC.talk(n); await new Promise(r => setTimeout(r, 250));
      out.push(document.querySelector('#w-dialog').innerText);
      document.querySelectorAll('#w-dialog .dlg-opt')[2].click(); await new Promise(r => setTimeout(r, 250));
      out.push(document.querySelector('#w-dialog').innerText);
      UI.close('w-dialog');
      const mb = document.querySelector('#menubar [data-win="w-gacha"]'); out.push(mb ? mb.title + ' ' + mb.textContent : 'NO MENU BUTTON');
      // ตราจากบอส (ข้อความในแชต)
      G.player.kills.seraph_pudding = 3; const m = spawnMob('seraph_pudding', { x: G.player.x + 1, y: G.player.y }); m.isMvp = true; killMob(m);
      out.push([...document.querySelectorAll('#chat-log .cl')].map(e => e.textContent).filter(t => /Sigil/.test(t)).pop() || 'NO SIGIL MSG');
      return out;
    });
    const thai = [...texts, ...extra.map((t, i) => ['extra' + i, t])].filter(([, t]) => THAI.test(t)).map(([k, t]) => `${k}: ${(t.match(/.{0,20}[฀-๿]+.{0,20}/) || [''])[0]}`);
    ok('English mode: no Thai anywhere in the gacha UI, NPC, chat, tooltip', !thai.length, thai.slice(0, 4).join(' | '));
    ok('English mode: menu button + key hint', /Gacha/.test(extra[extra.length - 2]) && /\(R\)/.test(extra[extra.length - 2]), extra[extra.length - 2]);
    ok('English mode: Sigil reward message after MVP kill', /Obtained Valhalla Sigil ×1/.test(extra[extra.length - 1]), extra[extra.length - 1]);
    await ctx.close();
  }

  // ================= 3) ภาพหน้าจอ (ตั้ง SHOTS) =================
  if (SHOTS) {
    for (const lang of ['th', 'en']) for (const [w, hh, view, mob] of [[1280, 720, 'desktop', false], [390, 844, 'phone', true]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: hh }, isMobile: mob, hasTouch: mob, deviceScaleFactor: mob ? 2 : 1 });
      await ctx.addInitScript(l => { try { localStorage.setItem('nm_lang', l); } catch (e) { /* */ } }, lang);
      const p = await ctx.newPage();
      p.on('pageerror', e => errors.push(`shot ${lang}/${view}: ${e.message}`));
      await start(p, url, lang === 'th' ? 'Verdandi' : 'Urd');
      await p.evaluate(() => { const pl = G.player; pl.x = 14.5; pl.y = 23.5; pl.path = []; addItem(Gacha.TOKEN, 42, true); Object.assign(Gacha.st(), { pity: 31, total: 88 }); });
      await p.waitForTimeout(3500);
      const tag = `${SHOTS}/${lang}_${view}`;
      await p.screenshot({ path: `${tag}_town.png` });
      await p.evaluate(() => UI.open('w-gacha')); await p.waitForTimeout(500);
      await p.screenshot({ path: `${tag}_machine.png` });
      // ×10 ตัวอย่างที่มี Epic + Legendary (บังคับผลเพื่อโชว์แอนิเมชัน)
      await p.evaluate(() => {
        const rows = Gacha.rows, pick0 = Gacha.pick.bind(Gacha); let i = 0;
        const plan = [0, 6, 1, 13, 2, 7, 3, 18, 5, 11].map(k => rows[Math.min(k, rows.length - 1)]);
        Gacha.pick = () => plan[i++] || pick0(); Gacha.go(true); Gacha.pick = pick0;
      });
      await p.waitForTimeout(1300); await p.screenshot({ path: `${tag}_spin.png` });
      await p.waitForTimeout(2600); await p.screenshot({ path: `${tag}_reveal.png` });
      for (let i = 0; i < 40 && await p.evaluate(() => !!Gacha.anim); i++) await p.waitForTimeout(200);
      await p.waitForTimeout(600);
      await p.screenshot({ path: `${tag}_x10.png` });
      await p.evaluate(() => { Gacha.tab = 'rates'; Gacha.render(); }); await p.waitForTimeout(300);
      await p.screenshot({ path: `${tag}_rates.png` });
      await ctx.close();
    }
    console.log('screenshots →', SHOTS);
  }

  await browser.close(); if (srv) srv.close();
  for (const e of errors) ok('page error', false, e);
  let fail = 0;
  for (const [n, pass, info] of checks) { if (!pass) fail++; console.log(`${pass ? '✔' : '✘'} ${n}${info !== '' ? `  (${info})` : ''}`); }
  console.log(fail ? `\n${fail} FAILED` : `\nALL ${checks.length} PASSED`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
