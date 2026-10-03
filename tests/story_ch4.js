'use strict';
// ============================================================
//  บทที่ 4 "เสียงหอนในป่า" + เควสต์เสริม (js/quest.js, js/npc.js, js/story.js) — Playwright
//  รัน:  NODE_PATH=$(npm root -g) node tests/story_ch4.js
//  ตรวจ: ลำดับเควสต์ (บท 3 → บท 4 → บท 5) • ทำทั้งสายจนจบได้ด้วยการล่า/คุย/เก็บของจำลอง • ไม่มีทางตัน (มอน/ไอเทม/NPC มีจริงทุกเควสต์)
//        เควสต์เสริมรับ/ส่ง/ได้รางวัลครบทุกอัน • เซฟเก่า (ดัชนีลำดับเดิม) ต่อได้ถูกที่ — จบบท 3 ยังไม่ถึงบท 5 = เริ่มสายบท 4
//        Sigrún / Lopt วางบนช่องเดินได้ ไม่ทำให้ภาพอบ 3D ของ Wolfwood (ต้นหมาป่าเก่า + สันหิน) / Mistlake hash ไม่ตรง
//        บทพูดเปลี่ยนตามบท • บรรทัดตำนานแผนที่หลังผ่านเควสต์ • ภาพหน้าจอ Sigrún + กล่องคุย → $SHOTS
// ============================================================
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SHOTS = process.env.SHOTS || path.join(require('os').tmpdir(), 'iron-valhalla-story-ch4');
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
const ok = (name, cond, info = '') => { checks.push([name, !!cond, info]); };

async function startChar(p, name) {
  await p.click('#au-offline'); await p.click('#btn-new');
  await p.fill('#cr-name', name); await p.click('#cr-start'); await p.waitForTimeout(1500);
  await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {});
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 8000, polling: 250 }).catch(() => {});
  await p.waitForTimeout(600);
  await p.click('#w-help .win-x').catch(() => {});
  await p.evaluate(() => { $$('.win:not(.hidden)').forEach(w => UI.close(w.id)); });
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const srv = await serve();
  const url = `http://localhost:${srv.address().port}/index.html`;
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  else if (fs.existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(opts);
  const errors = [], warns = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'warning' && /Bake|hash/.test(m.text())) warns.push(m.text()); });
  await p.goto(url); await p.waitForTimeout(1200);
  await startChar(p, 'Sigtest');

  // ตัวช่วยในหน้า: กล่องคุยแบบไม่ต้องคลิก (จดข้อความไว้) • คุยกับ NPC ตาม id • ตั้งความคืบหน้าให้อยู่ที่เควสต์ id
  await p.evaluate(() => {
    const orig = { say: UI.say, menu: UI.menu, forge: UI.openForge };
    window.ST = {
      log: [], pick: 0,
      // เมนูเสนอเควสต์เสริม (มี 📜) เลือก ST.pick • เมนูอื่นของ NPC เลือกตัวเลือกสุดท้าย (ยกเลิก/ขอบคุณ — ออกจากลูปเมนู Rolf)
      stub() { UI.say = async (nm, t) => { ST.log.push(`${nm} ${t}`); }; UI.menu = async (nm, t, o) => { ST.log.push(`${nm} ${t}`); return /📜/.test(t) ? (!ST.want || t.includes(ST.want) ? Math.min(ST.pick, o.length - 1) : 1) : o.length - 1; }; UI.openForge = () => {}; },
      unstub() { UI.say = orig.say; UI.menu = orig.menu; UI.openForge = orig.forge; },
      npc(id) { for (const m in MAP_DEFS) { const n = (MAP_DEFS[m].npcs || []).find(x => x.id === id); if (n) return Object.assign({}, n); } return null; },
      async talk(id) { ST.log = []; NPC.busy = false; await NPC.talk(ST.npc(id)); return ST.log.join(' | '); },
      at(id) { const k = QUESTS.findIndex(q => q.id === id); G.player.quests = { i: k, n: 0, done: QUESTS.slice(0, k).map(q => q.id), v: 2, id }; },
    };
    ST.stub();
  });

  // ---------- 1) ลำดับเควสต์ ----------
  const order = await p.evaluate(() => {
    const ids = QUESTS.map(q => q.id), ch4 = QUESTS.filter(q => q.ch === 4).map(q => q.id);
    return { ids, ch4, dup: ids.length !== new Set(ids).size, mvp1: ids.indexOf('mvp1'), first4: ids.indexOf(ch4[0]), lv30: ids.indexOf('lv30'), hollow1: ids.indexOf('hollow1') };
  });
  ok('chapter 4 has 5–6 quests, ends with [lv30]', order.ch4.length >= 5 && order.ch4.length <= 6 && order.ch4[order.ch4.length - 1] === 'lv30', order.ch4.join(','));
  ok('chapter 4 sits between [mvp1] (ch 3) and [hollow1] (ch 5)', order.first4 === order.mvp1 + 1 && order.lv30 === order.hollow1 - 1);
  ok('quest ids unique', !order.dup);

  // ---------- 2) ไม่มีทางตัน: ทุกเควสต์อ้างของที่มีจริง ----------
  const dead = await p.evaluate(() => {
    const bad = [], inMap = id => Object.values(MAP_DEFS).some(m => (m.spawns || []).some(s => s[0] === id) || m.mvp === id);
    const npcOk = id => !!ST.npc(id) && !!NPC.scripts[id];
    const chk = (tag, o) => {
      if (o.type === 'kill' && (!MOBS[o.mob] || !inMap(o.mob))) bad.push(`${tag}: mob ${o.mob}`);
      if (o.type === 'collect' && (!ITEMS[o.item] || !MOBS[o.mob] || !inMap(o.mob) || !(MOBS[o.mob].drops || []).some(d => d[0] === o.item))) bad.push(`${tag}: collect ${o.item} from ${o.mob}`);
      if ((o.type === 'talk' || o.type === 'event' || o.type === 'job') && !npcOk(o.npc || 'jobmaster')) bad.push(`${tag}: npc ${o.npc}`);
    };
    for (const q of QUESTS) {
      chk(q.id, q.obj);
      for (const [id] of (q.reward.items || [])) if (!ITEMS[id]) bad.push(`${q.id}: reward ${id}`);
      if (!q.title || !q.desc) bad.push(`${q.id}: text`);
      if (['kill', 'collect', 'talk'].includes(q.obj.type) && !Quest.navTarget(q)) bad.push(`${q.id}: no nav target`);
    }
    for (const q of SIDE_QUESTS) {
      if (!npcOk(q.giver)) bad.push(`${q.id}: giver ${q.giver}`);
      q.steps.forEach((s, i) => { chk(`${q.id}#${i}`, s.type === 'talk' ? { type: 'talk', npc: s.to } : s); if (!npcOk(s.to)) bad.push(`${q.id}#${i}: to ${s.to}`); });
      for (const [id] of (q.reward.items || [])) if (!ITEMS[id]) bad.push(`${q.id}: reward ${id}`);
    }
    return bad;
  });
  ok('no dead ends: every mob/item/NPC/reward exists, collect items drop from the named mob', !dead.length, dead.join('; '));

  // ---------- 3) รางวัลอยู่ในสเกลเดิม (ไม่กระโดด) ----------
  const rw = await p.evaluate(() => {
    const R = id => QUESTS.find(q => q.id === id).reward;
    const ch4 = QUESTS.filter(q => q.ch === 4 && q.id !== 'lv30');
    const maxB = Math.max(...ch4.map(q => q.reward.bexp || 0)), sum = ch4.reduce((a, q) => a + (q.reward.bexp || 0), 0);
    let need = 0; for (let lv = 25; lv < 30; lv++) need += baseExpNeed(lv);
    return { maxB, wolf: R('wolf').bexp, hollow1: R('hollow1').bexp, sum, need, zeny: Math.max(...ch4.map(q => q.reward.zeny || 0)), mvp1z: R('mvp1').zeny };
  });
  ok('ch 4 EXP between ch 3 [wolf] and ch 5 [hollow1]', rw.maxB >= rw.wolf * 0.5 && rw.maxB <= rw.hollow1, JSON.stringify(rw));
  ok('ch 4 total quest EXP < 6% of Lv 25→30', rw.sum < rw.need * 0.06, `${rw.sum} / ${rw.need}`);
  ok('ch 4 zeny ≤ Seraph MVP quest', rw.zeny <= rw.mvp1z);

  // ---------- 4) ทำทั้งสาย: ปราบ Seraph → บทที่ 4 ทุกเควสต์ → เข้าบทที่ 5 ----------
  const chain = await p.evaluate(async () => {
    const pl = G.player, out = { steps: [], lines: {} };
    changeJob('einherjar'); Object.assign(Story.st(), { eirScan: 1, eirJelly: 1 });
    ST.at('mvp1'); pl.baseLv = 25; recalc();
    const cur = () => (Quest.current() || {}).id;
    const z0 = pl.zeny, b0 = pl.baseExp;
    out.lines.before = await ST.talk('sigrun');
    Quest.onKill('seraph_pudding'); out.steps.push(cur());
    out.lines.sig1 = await ST.talk('sigrun'); out.steps.push(cur());     // ch4_sigrun สำเร็จตอนคุย + ฉากพบครั้งแรก
    out.lines.sig1b = await ST.talk('sigrun');
    addItem('ash_tail', 7); Quest.check(); out.filterLeft = countItem('ash_tail'); out.steps.push(cur());
    out.lines.eir = await ST.talk('nurse');
    out.lines.sig2 = await ST.talk('sigrun');
    for (let i = 0; i < 9; i++) Quest.onKill('fenrir_pup'); out.fenrir9 = cur(); Quest.onKill('fenrir_pup'); out.steps.push(cur());
    out.lines.sig3 = await ST.talk('sigrun');
    out.lines.bif = await ST.talk('bifrost');
    for (let i = 0; i < 5; i++) Quest.onKill('tuskboar'); out.steps.push(cur());
    out.lines.sig4 = await ST.talk('sigrun'); out.lines.sig4b = await ST.talk('sigrun');
    out.wrongNpc = (await ST.talk('lopt'), cur()); // Lopt ที่ Mistlake ไม่ใช่ตัวที่ต้องคุย
    out.lines.lopt = await ST.talk('lopt_wood'); out.steps.push(cur());
    out.lines.mimir = await ST.talk('jobmaster');
    out.lineWood = Story.mapLine('wolfwood');
    pl.baseLv = 30; recalc(); Quest.check(); out.steps.push(cur());
    out.lines.sig5 = await ST.talk('sigrun');
    out.lines.eir2 = await ST.talk('nurse');
    out.zeny = pl.zeny - z0; out.done = Quest.state().done.slice(-7);
    return out;
  });
  ok('chain: Seraph → ch4_sigrun → ch4_filter → ch4_fenrir → ch4_tusk → ch4_lopt → lv30 → hollow1',
    chain.steps.join(',') === 'ch4_sigrun,ch4_filter,ch4_fenrir,ch4_tusk,ch4_lopt,lv30,hollow1', chain.steps.join(','));
  ok('collect quest consumes exactly 6 Ash Filters', chain.filterLeft === 1, chain.filterLeft);
  ok('kill counter needs all 10 Fenrir Units', chain.fenrir9 === 'ch4_fenrir');
  ok('Mistlake Lopt does not complete the Wolfwood talk quest', chain.wrongNpc === 'ch4_lopt');
  ok('all chapter 4 quests in done list', ['mvp1', 'ch4_sigrun', 'ch4_filter', 'ch4_fenrir', 'ch4_tusk', 'ch4_lopt', 'lv30'].every(id => chain.done.includes(id)), chain.done.join(','));
  const L = chain.lines, distinct = new Set([L.before, L.sig1, L.sig1b, L.sig2, L.sig3, L.sig4, L.sig4b, L.sig5]);
  ok('Sigrún dialogue changes with progress (8 stages → 8 different lines)', distinct.size === 8, [...distinct].map(s => s.slice(0, 40)).join(' || '));
  ok('Sigrún asks "what do you remember" after the race', /จำอะไรได้บ้าง|What do you remember/.test(L.sig4));
  ok('Bifrost tells Sigrún\'s fall count in chapter 4', /1,204/.test(L.bif));
  ok('Lopt names Kitsura with a green flicker', /Kitsura/.test(L.lopt) && /เขียว|green/.test(L.lopt));
  ok('Mimir reacts to the name Kitsura', /Kitsura EX/.test(L.mimir));
  ok('Eir comments on the warm filters', /ไส้กรองเถ้า|ash filters/i.test(L.eir));
  ok('Eir hands over the mask at Lv 30 (end of chapter 4)', /เศษหน้ากาก|half of a broken mask/.test(L.eir2));
  ok('Wolfwood map line changes after chapter 4', /Kitsura/.test(chain.lineWood));

  // ---------- 5) เควสต์เสริม ----------
  const side = await p.evaluate(async () => {
    const pl = G.player, out = [];
    ST.at('hollow1'); pl.baseLv = 30; Story.st().brokkWolf = 1; pl.quests.side = {};
    for (const q of SIDE_QUESTS) {
      const r = { id: q.id }; ST.want = q.title;
      r.avail = Side.available(q);
      ST.pick = 1; await ST.talk(q.giver); r.snoozed = !Side.isActive(q.id);       // "ไว้ก่อน" = ไม่รับ
      Side.snooze = {}; ST.pick = 0; await ST.talk(q.giver); r.accepted = Side.isActive(q.id);
      const z0 = pl.zeny;
      for (const s of q.steps) {
        if (s.type === 'kill') { for (let i = 0; i < s.n - 1; i++) Quest.onKill(s.mob); r.early = (await ST.talk(s.to), Side.rec(q.id).k || 0); Quest.onKill(s.mob); }
        if (s.type === 'collect') { addItem(s.item, s.n); }
        r.text = Side.objText(q);
        await ST.talk(s.to);
        if (s.type === 'collect') r.left = countItem(s.item);
      }
      r.done = Side.isDone(q.id); r.zeny = pl.zeny - z0; r.again = Side.available(q);
      out.push(r);
    }
    ST.pick = 0; ST.want = null;
    // หน้าต่างเควสต์แสดงการ์ดเควสต์เสริม
    UI.open('w-quest'); UI.renderQuest(); const card = !!document.querySelector('#w-quest .q-side'); UI.close('w-quest');
    return { out, card };
  });
  for (const r of side.out) ok(`side quest ${r.id}: offered, "not now" declines, accepts, completes, no repeat`, r.avail && r.snoozed && r.accepted && r.done && !r.again && (r.left === undefined || r.left === 0) && (r.early === undefined || r.early === 0), JSON.stringify(r));
  ok('4–6 side quests', side.out.length >= 4 && side.out.length <= 6, side.out.length);
  ok('quest window shows the side-quest card', side.card);
  await p.evaluate(() => { ST.at('ch4_fenrir'); G.player.quests.side = { s_sentry: { k: 0, n: 7 }, s_slot47: { done: 1 } }; Story.st().brokkWolf = 1; UI.open('w-quest'); UI.renderQuest(); });
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(SHOTS, 'quest_window_side.png') });
  await p.evaluate(() => UI.close('w-quest'));
  const sideGate = await p.evaluate(() => { const pl = G.player; ST.at('welcome'); pl.baseLv = 1; pl.quests.side = {}; return SIDE_QUESTS.filter(q => Side.available(q)).map(q => q.id); });
  ok('side quests locked for a brand-new character', !sideGate.length, sideGate.join(','));

  // ---------- 6) เซฟเก่า (ดัชนีตามลำดับเดิม ไม่มี v/id) ----------
  const old = await p.evaluate(() => {
    const pl = G.player, V1 = QUEST_ORDER_V1, res = {};
    const load = (i, n) => { pl.quests = JSON.parse(JSON.stringify({ i, n, done: V1.slice(0, i) })); const c = Quest.current(); return { id: c && c.id, n: Quest.state().n, v: Quest.state().v }; };
    res.lv30 = load(V1.indexOf('lv30'), 0);              // จบบท 3 (ปราบ Seraph แล้ว) ยังไม่เริ่มบท 5
    res.mvp1 = load(V1.indexOf('mvp1'), 0);
    res.wolf = load(V1.indexOf('wolf'), 4);
    res.hollow3 = load(V1.indexOf('hollow3'), 0);
    res.passed = Quest.passed('ch4_tusk') && !Quest.isDone('ch4_tusk');
    res.sigLine = Quest.passed('lv30');
    res.roots = load(V1.indexOf('ch6_roots'), 7);
    res.end = load(V1.length, 0); res.endDone = Quest.state().done.length === V1.length;
    res.start = load(0, 0);
    // บันทึก→โหลด (JSON เหมือนเซฟจริง) หลังแปลงแล้วยังอยู่ที่เดิม
    load(V1.indexOf('lv30'), 0); const saved = JSON.stringify(pl.quests); pl.quests = JSON.parse(saved); res.reload = Quest.current().id;
    // แทรกเควสต์กลางสายภายหลัง: เซฟ v2 หาดัชนีใหม่จาก id
    const k = QUESTS.findIndex(q => q.id === 'ch4_fenrir'); ST.at('ch4_fenrir'); Quest.state().n = 3;
    QUESTS.splice(k - 1, 0, { id: '__tmp', ch: 4, title: 'x', desc: 'x', obj: { type: 'baseLv', n: 1 }, reward: {} });
    res.insert = { id: Quest.current().id, n: Quest.state().n };
    QUESTS.splice(k - 1, 1); res.after = Quest.current().id;
    return res;
  });
  ok('old save at [lv30] (ch 3 done, ch 5 not started) → starts chapter 4 chain', old.lv30.id === 'ch4_sigrun' && old.lv30.v === 2, JSON.stringify(old.lv30));
  ok('old save at [mvp1] stays on Seraph', old.mvp1.id === 'mvp1');
  ok('old save mid-[wolf] keeps its kill count', old.wolf.id === 'wolf' && old.wolf.n === 4, JSON.stringify(old.wolf));
  ok('old save in ch 5 stays in ch 5 (new ch 4 quests count as passed)', old.hollow3.id === 'hollow3' && old.passed && old.sigLine, JSON.stringify(old.hollow3));
  ok('old save in ch 6 keeps quest + count', old.roots.id === 'ch6_roots' && old.roots.n === 7, JSON.stringify(old.roots));
  ok('old save that finished everything stays finished', old.endDone && (old.end.id === null || !['welcome', 'ch4_sigrun'].includes(old.end.id)), JSON.stringify(old.end));
  ok('old save at start → welcome', old.start.id === 'welcome');
  ok('migrated save survives save/load', old.reload === 'ch4_sigrun');
  ok('v2 save follows quest id when quests are inserted later', old.insert.id === 'ch4_fenrir' && old.insert.n === 3 && old.after === 'ch4_fenrir', JSON.stringify(old.insert));

  // ---------- 7) NPC บนแผนที่ + ภาพอบ 3D ไม่เสีย ----------
  const geo = await p.evaluate(() => {
    const res = {};
    for (const id of ['wolfwood', 'mistlake']) {
      const m = new GameMap(id);
      res[id] = { bake: Bake.data(m) ? m._bakeOk : 'none', skip: [...(m.bakeSkip || [])], ridge: id === 'wolfwood' ? !!m.ridgeBake() : true,
        npcs: (m.def.npcs || []).map(n => ({ id: n.id, walk: SOLID.has(m.tile(n.x, n.y)) ? 'solid' : 'ok', front: m.walkable(n.x, n.y + 1) })) };
    }
    return res;
  });
  ok('Wolfwood: old wolf tree bake hash still matches (no pieces skipped)', geo.wolfwood.bake === true && !geo.wolfwood.skip.length, JSON.stringify(geo.wolfwood));
  ok('Wolfwood: ridge bake hash still matches', geo.wolfwood.ridge);
  ok('Mistlake: lake bake hash still matches', geo.mistlake.bake === true && !geo.mistlake.skip.length, JSON.stringify(geo.mistlake));
  ok('Sigrún + Lopt stand on open tiles with a walkable tile in front', ['wolfwood', 'mistlake'].every(k => geo[k].npcs.length && geo[k].npcs.every(n => n.walk === 'ok' && n.front)), JSON.stringify([geo.wolfwood.npcs, geo.mistlake.npcs]));

  // ---------- 8) ภาพหน้าจอ: Sigrún ในป่า + กล่องคุยจริง ----------
  await p.evaluate(() => { ST.unstub(); ST.at('ch4_sigrun'); G.player.baseLv = 26; recalc(); changeMap('wolfwood', 36.5, 23.5); G.player.facing = 1; });
  await p.waitForFunction(() => Art.has('anim_npc_sigrun_walk') && Art.has('npc_sigrun'), null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(2500);
  await p.evaluate(() => { $$('.win:not(.hidden)').forEach(w => UI.close(w.id)); });
  const art = await p.evaluate(() => ({ anim: Anim.has('npc_sigrun'), portrait: Art.has('npc_sigrun'), lopt: Art.has('npcsprite_lopt_wood') }));
  ok('Sigrún uses existing Einherjar art (dyed), Lopt uses dyed Tool Dealer art', art.anim && art.portrait && art.lopt, JSON.stringify(art));
  await p.screenshot({ path: path.join(SHOTS, 'sigrun_wolfwood.png') });
  await p.evaluate(() => { Story.st().sigrunMet = 0; const n = G.npcs.find(x => x.id === 'sigrun'); NPC.busy = false; NPC.talk(n); }); // ฉากพบครั้งแรก
  await p.waitForTimeout(1200);
  await p.screenshot({ path: path.join(SHOTS, 'sigrun_dialogue.png') });
  ok('real dialogue box opens for Sigrún', await p.evaluate(() => UI.isOpen('w-dialog') && /Sigrún/.test(document.querySelector('#w-dialog').innerText)));
  await p.evaluate(() => { UI.dlgClose(); NPC.busy = false; changeMap('wolfwood', 36.5, 87.5); });
  await p.waitForTimeout(2000);
  await p.screenshot({ path: path.join(SHOTS, 'lopt_wolfwood.png') });
  await p.evaluate(() => { ST.at('ch4_lopt'); Story.st().loptWood = 0; const n = G.npcs.find(x => x.id === 'lopt_wood'); NPC.busy = false; NPC.talk(n); });
  await p.waitForTimeout(1200);
  await p.click('#w-dialog .dlg-btns .btn').catch(() => {}); await p.waitForTimeout(700); // บรรทัดที่ 2: ชื่อ Kitsura + วิเซอร์กะพริบเขียว
  await p.screenshot({ path: path.join(SHOTS, 'lopt_dialogue.png') });
  await p.evaluate(() => { UI.dlgClose(); NPC.busy = false; });

  await browser.close(); srv.close();
  ok('no page errors', !errors.length, errors.slice(0, 5).join(' | '));
  ok('no bake/hash warnings in console', !warns.length, warns.slice(0, 3).join(' | '));
  let fail = 0;
  for (const [n, pass, info] of checks) { if (!pass) fail++; console.log(`${pass ? '✔' : '✘'} ${n}${info !== '' ? `  (${info})` : ''}`); }
  console.log(fail ? `\n${fail} FAILED` : `\nALL ${checks.length} PASSED`);
  console.log(`screenshots: ${SHOTS}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
