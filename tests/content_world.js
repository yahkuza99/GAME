'use strict';
// ============================================================
//  แพ็กเนื้อหาโลก (js/content_world.js)
//  • เควสต์เสริม 22 อันลงทะเบียนในระบบ Side (SIDE_EXTRA) — ครบทุกแมพ ทำจบได้ทุกอัน (kill / collect / talk / visit / lore / MVP) รางวัลอยู่ในเส้นเดิม
//  • ชุดเดิม SIDE_QUESTS (STORY §8) ไม่ถูกแตะ • หน้าต่างเควสต์แสดงการ์ดเควสต์เสริมรวมของใหม่
//  • บทพูด NPC หมุนเวียน + เปลี่ยนตามบท • ฟองคำพูด (bark) • บรรทัดเล็กใต้กล่องคุยแรก • NPC ใหม่ 6 ตัว (ภาพย้อมสี)
//  • จุดตำนาน 23 จุด: วางบนช่องเดินได้ ไม่เปลี่ยนผัง (ภาพอบ 3D ยังใช้ได้) • ตรวจแล้วบันทึก Codex • เซฟแล้วรีโหลดยังอยู่
//  • เซฟเก่า (ไม่มีฟิลด์ lore) โหลดได้ • แท็บ Lore ในสมุดเควสต์ • Elite หายากไม่อยู่ในตาราง spawns
//  รัน:  NODE_PATH=$(npm root -g) node tests/content_world.js   (SHOTS=โฟลเดอร์ภาพ ถ้าต้องการ)
// ============================================================
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SHOTS = process.env.SHOTS || path.join(os.tmpdir(), 'iv_content_world');
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
async function settle(p) {
  await p.waitForFunction(() => G.started, null, { timeout: 15000 });
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 8000, polling: 250 }).catch(() => {});
  await p.evaluate(() => document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden')));
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const srv = process.env.BASE ? null : await serve();
  const url = process.env.BASE || `http://localhost:${srv.address().port}/index.html`;
  const b = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 760 } })).newPage();
  const errs = [], warns = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'warning' && /bake|Bake|hash/.test(m.text())) warns.push(m.text()); });
  await p.goto(url); await p.waitForTimeout(1500);
  await p.click('#au-offline'); await p.click('#btn-new');
  await p.fill('#cr-name', 'Saga'); await p.click('#cr-start');
  await settle(p);

  // ---------- 1) ข้อมูล: เควสต์ / NPC / จุดตำนาน / ภาพ ----------
  const data = await p.evaluate(() => {
    const W = WorldPack, bad = [], maps = ['eldheim', 'meadow', 'mistlake', 'wolfwood', 'helcave', 'archive', 'roots', 'abyss'];
    const npcAt = id => { for (const m in MAP_DEFS) { const n = (MAP_DEFS[m].npcs || []).find(x => x.id === id); if (n) return { m, n }; } return null; };
    const inMap = id => Object.values(MAP_DEFS).some(m => (m.spawns || []).some(s => s[0] === id) || m.mvp === id);
    const perMap = {}, types = new Set();
    for (const q of SIDE_EXTRA) {
      perMap[q.map] = (perMap[q.map] || 0) + 1;
      if (!npcAt(q.giver) || !NPC.scripts[q.giver]) bad.push(`${q.id}: giver ${q.giver}`);
      if (!q.title || !q.offer || !q.done || !q.lv) bad.push(`${q.id}: text/lv`);
      q.steps.forEach((s, i) => {
        types.add(s.type);
        if (!npcAt(s.to) || !NPC.scripts[s.to]) bad.push(`${q.id}#${i}: to ${s.to}`);
        if (s.type === 'kill' && (!MOBS[s.mob] || !inMap(s.mob))) bad.push(`${q.id}#${i}: mob ${s.mob}`);
        if (s.type === 'collect' && (!ITEMS[s.item] || !MOBS[s.mob] || !inMap(s.mob) || !MOBS[s.mob].drops.some(d => d[0] === s.item))) bad.push(`${q.id}#${i}: collect ${s.item}/${s.mob}`);
        if (s.type === 'visit' && !W.LORE_BY[s.to]) bad.push(`${q.id}#${i}: visit ${s.to}`);
        if (s.type === 'lore' && !(s.n > 0 && s.n <= W.LORE.length)) bad.push(`${q.id}#${i}: lore n`);
        if (!s.say) bad.push(`${q.id}#${i}: say`);
        if (!Quest.navTarget && !Side.navTarget) bad.push('nav');
      });
      for (const [id] of q.reward.items || []) if (!ITEMS[id]) bad.push(`${q.id}: reward ${id}`);
    }
    const reqIds = ['upgrade', 'mist', 'refine1', 'wolf', 'ch4_sigrun', 'hollow1', 'hollow3', 'hollow5', 'ch6_roots', 'ch7_loki', 'ch7_bloom', 'ch7_end'].filter(id => !QUESTS.some(q => q.id === id));
    const ids = Side.all().map(q => q.id);
    const lorePer = {}; for (const l of W.LORE) lorePer[l.map] = (lorePer[l.map] || 0) + 1;
    // จุดตำนาน + NPC ใหม่: อยู่บนช่องเดินได้ มีช่องหน้าเดินได้ เดินถึงจากประตูได้
    const geo = [];
    for (const id of maps) {
      const m = new GameMap(id), seen = new Uint8Array(m.w * m.h), st = m.portals.map(q => [q.ax, q.ay]);
      for (const s of st) seen[m.idx(...s)] = 1;
      while (st.length) { const [x, y] = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (m.inb(nx, ny) && !seen[m.idx(nx, ny)] && m.walkable(nx, ny)) { seen[m.idx(nx, ny)] = 1; st.push([nx, ny]); } } }
      for (const n of MAP_DEFS[id].npcs || []) {
        if (!W.LORE_BY[n.id] && !W.NEW_NPCS.some(e => e.npc.id === n.id)) continue;
        if (SOLID.has(m.tile(n.x, n.y)) || !seen[m.idx(n.x, n.y + 1)]) geo.push(`${id}:${n.id}@${n.x},${n.y}`);
      }
    }
    const bakes = { town: !!new GameMap('eldheim').townBake(), helcave: !!new GameMap('helcave').caveBake(), archive: !!new GameMap('archive').caveBake(), roots: !!new GameMap('roots').caveBake() };
    const newNpc = W.NEW_NPCS.map(e => ({ id: e.npc.id, script: !!NPC.scripts[e.npc.id], anim: Anim.has('npc_' + e.npc.id), pic: !!Art.get('npc_' + e.npc.id), chatter: W.Chatter.pool(e.npc.id).length }));
    const loreArt = W.LORE.filter(l => !Art.get('lore_' + l.id)).map(l => l.id);
    return { bad, n: SIDE_EXTRA.length, orig: SIDE_QUESTS.length, all: ids.length, dupIds: ids.length !== new Set(ids).size, perMap, types: [...types], reqIds, lorePer, nLore: W.LORE.length, geo, bakes, newNpc, loreArt,
      saveField: SAVE_FIELDS.includes('lore') };
  });
  ok('22 side quests registered in SIDE_EXTRA (Side.all), STORY §8 set untouched (6)', data.n >= 18 && data.n <= 24 && data.orig === 6 && data.all === data.n + 6 && !data.dupIds, `${data.n} + ${data.orig}`);
  ok('2–3 side quests on each of the 8 maps', ['eldheim', 'meadow', 'mistlake', 'wolfwood', 'helcave', 'archive', 'roots', 'abyss'].every(m => data.perMap[m] >= 2 && data.perMap[m] <= 3), JSON.stringify(data.perMap));
  ok('objective mix: kill, collect, talk, visit, lore', ['kill', 'collect', 'talk', 'visit', 'lore'].every(t => data.types.includes(t)), data.types.join(','));
  ok('no dead ends: givers / turn-in NPCs / mobs / drops / rewards all exist', !data.bad.length, data.bad.join('; '));
  ok('quest requirements reference real main-quest ids', !data.reqIds.length, data.reqIds.join(','));
  ok('23 lore points, 2–4 per map', data.nLore === 23 && Object.values(data.lorePer).every(n => n >= 2 && n <= 4) && Object.keys(data.lorePer).length === 8, JSON.stringify(data.lorePer));
  ok('lore points + new NPCs stand on open tiles with a reachable front tile', !data.geo.length, data.geo.join(' '));
  ok('map layouts unchanged: town / cave 3D bakes still match', Object.values(data.bakes).every(Boolean) && !warns.length, JSON.stringify(data.bakes) + warns.join('|'));
  ok('6 new NPCs: script + recolored walk sprite + portrait + chatter', data.newNpc.length === 6 && data.newNpc.every(n => n.script && n.anim && n.pic && n.chatter >= 4), JSON.stringify(data.newNpc));
  ok('every lore point has a prop image', !data.loreArt.length, data.loreArt.join(','));
  ok('save field "lore" registered', data.saveField);

  // ---------- 2) รางวัลอยู่ในเส้น + ของใหม่ไม่แรงเกิน ----------
  const curve = await p.evaluate(() => {
    const rows = SIDE_EXTRA.map(q => ({ id: q.id, r: q.reward.bexp / baseExpNeed(q.lv), z: q.reward.zeny || 0, lv: q.lv }));
    const maxMain = QUESTS.reduce((a, q) => Math.max(a, q.reward.bexp || 0), 0);
    const late = rows.filter(r => r.lv >= 10);
    const items = ['lorekeeper_quill', 'moonlit_ears', 'captain_crest', 'alpha_mantle'].map(id => ITEMS[id]);
    const firstLeaf = ITEMS.first_leaf;
    const sum = o => Object.values(o.b || {}).reduce((a, v) => a + (v < 20 ? v : 0), 0);
    return { worst: late.sort((a, b) => b.r - a.r)[0], maxSide: Math.max(...SIDE_EXTRA.map(q => q.reward.bexp)), maxMain,
      itemsOk: items.every(it => it && (it.rarity === 'uncommon' || it.rarity === 'rare') && it.lv <= 28),
      quill: sum(ITEMS.lorekeeper_quill) < sum(firstLeaf) && ITEMS.lorekeeper_quill.quest,
      newItems: ['lorekeeper_quill', 'moonlit_ears', 'captain_crest', 'alpha_mantle'].filter(id => ITEMS[id]).length };
  });
  ok('side quest EXP ≤ 22% of a level at its level (Lv 10+) and below the biggest main-quest reward', curve.worst.r <= 0.22 && curve.maxSide < curve.maxMain, `${curve.worst.id} ${(curve.worst.r * 100).toFixed(1)}% • max ${curve.maxSide} < ${curve.maxMain}`);
  ok('only 4 new gear items, all uncommon/rare ≤ Lv 28; quest quill weaker than Badge of the First Leaf', curve.newItems === 4 && curve.itemsOk && curve.quill);

  // ---------- 3) ทำเควสต์เสริมใหม่ครบทุกอัน (บทสนทนาจำลอง) ----------
  await p.evaluate(() => {
    const orig = { say: UI.say, menu: UI.menu, forge: UI.openForge, shop: UI.openShop, splash: UI.splash };
    window.ST = {
      log: [], want: null, orig,
      stub() { UI.say = async (nm, t) => { ST.log.push(`${nm} ${t}`); }; UI.menu = async (nm, t, o) => { ST.log.push(`${nm} ${t}`); return /📜/.test(t) ? (!ST.want || t.includes(ST.want) ? 0 : 1) : o.length - 1; }; UI.openForge = () => {}; UI.openShop = () => {}; UI.splash = () => {}; },
      unstub() { Object.assign(UI, { say: orig.say, menu: orig.menu, openForge: orig.forge, openShop: orig.shop, splash: orig.splash }); },
      npc(id) { for (const m in MAP_DEFS) { const n = (MAP_DEFS[m].npcs || []).find(x => x.id === id); if (n) return Object.assign({}, n); } return null; },
      async talk(id) { ST.log = []; NPC.busy = false; await NPC.talk(ST.npc(id)); return ST.log.join(' | '); },
    };
  });
  const run = await p.evaluate(async () => {
    ST.stub();
    const pl = G.player, out = [];
    changeJob('einherjar'); pl.baseLv = 70; pl.jobLv = 1; recalc();
    pl.quests = { i: QUESTS.length, n: 0, done: QUESTS.map(q => q.id), v: 2, id: null, side: Object.fromEntries(SIDE_QUESTS.map(q => [q.id, { done: 1 }])) };
    Object.assign(Story.st(), { prologue: 1, eirScan: 1, eirJelly: 1, eirMask: 1, eirAfter: 1, c7gate: 1, c7end: 1, c7loki: 1, c7home: 1, mimirTruth: 1, mimirKitsura: 1, brokkWolf: 1, helMet: 1, helEnd: 1, core: 'gave', sigrunMet: 1, sigrunAsk: 1, loptWood: 1 });
    pl.lore = { v: 1, found: {} };
    const W = WorldPack;
    // ขั้นผิดคน: ส่งของที่ NPC อื่นไม่ได้
    for (const q of SIDE_EXTRA) {
      const r = { id: q.id };
      r.avail = Side.available(q);
      ST.want = q.title;
      for (let k = 0; k < 8 && !Side.isActive(q.id); k++) { Side.snooze = {}; await ST.talk(q.giver); }
      r.accepted = Side.isActive(q.id);
      const z0 = pl.zeny, items0 = (q.reward.items || []).map(([id]) => countItem(id));
      for (const s of q.steps) {
        if (s.type === 'kill') {
          for (let i = 0; i < s.n - 1; i++) Quest.onKill(s.mob);
          r.early = r.early || (await ST.talk(s.to), Side.rec(q.id).k || 0) - q.steps.indexOf(s);
          Quest.onKill(s.mob);
        }
        if (s.type === 'collect') addItem(s.item, s.n, true);
        if (s.type === 'lore') for (const l of W.LORE) { if (W.Lore.count() >= s.n) break; W.Lore.discover(l.id); }
        if (q.id === 'w_scout' && s.to === 'bifrost') { await ST.talk('hrolf'); r.wrongNpc = Side.rec(q.id).k; }
        r.text = (r.text || []).concat(Side.objText(q));
        r.nav = (r.nav || []).concat(!!Side.navTarget(q));
        await ST.talk(s.to);
        if (s.type === 'collect') r.left = (r.left || 0) + countItem(s.item);
      }
      r.done = Side.isDone(q.id); r.zeny = pl.zeny - z0 === (q.reward.zeny || 0);
      r.items = (q.reward.items || []).every(([id, n], i) => countItem(id) - items0[i] >= (ITEMS[id].type === 'armor' ? 1 : n));
      r.again = Side.available(q);
      out.push(r);
    }
    ST.want = null;
    // หน้าต่างเควสต์: การ์ดเควสต์เสริมนับรวมของใหม่
    UI.questTab = 'story'; const body = document.querySelector('#w-quest .win-body'); body.dataset.key = ''; body.dataset.dk = ''; body.dataset.sk = '';
    UI.open('w-quest'); UI.renderQuest();
    const card = document.querySelector('#w-quest .q-side'), cardText = card ? card.textContent : '';
    UI.close('w-quest');
    return { out, cardText };
  });
  const bad = run.out.filter(r => !(r.avail && r.accepted && r.done && r.zeny && r.items && !r.again && !r.left && !r.early && r.nav.every(Boolean)));
  ok(`all ${run.out.length} new side quests: offered → accepted → every step → reward → no repeat`, run.out.length === data.n && !bad.length, JSON.stringify(bad.slice(0, 3)));
  ok('kill steps need the full count before turn-in', run.out.every(r => !r.early));
  ok('turn-in only at the named NPC (w_scout: Hrólf cannot accept the Bifrost step)', run.out.find(r => r.id === 'w_scout').wrongNpc === 1);
  ok('visit / lore objective text reads naturally', run.out.some(r => r.text.some(t => /Examine|ตรวจดู/.test(t))) && run.out.some(r => r.text.some(t => /Lore found|ตำนานที่พบ/.test(t))), run.out.find(r => r.id === 'w_codex').text.join(' / '));
  ok('quest window side card counts all side quests', /28/.test(run.cardText), run.cardText.slice(0, 120));

  // ---------- 4) บทพูด NPC หมุนเวียน + ตามบท + ฟองคำพูด ----------
  const talk = await p.evaluate(async () => {
    const W = WorldPack, C = W.Chatter, out = {};
    const town = ['bifrost', 'jobmaster', 'tool', 'weapon', 'armor', 'refine', 'nurse', 'guide', 'storage', 'norn'];
    out.counts = town.map(id => ({ id, idle: W.CHATTER[id].idle.length, tiers: Object.keys(W.CHATTER[id].t || {}).length }));
    out.field = ['lopt', 'sigrun', 'hel', 'loki'].every(id => W.CHATTER[id] && W.CHATTER[id].idle.length >= 3);
    C.i = {};
    out.rot = [C.next('guide'), C.next('guide'), C.next('guide'), C.next('guide')];
    const pl = G.player, q0 = JSON.parse(JSON.stringify(pl.quests));
    const at = id => { const k = QUESTS.findIndex(q => q.id === id); pl.quests = { i: k, n: 0, done: QUESTS.slice(0, k).map(q => q.id), v: 2, id, side: q0.side }; };
    const tiers = {};
    for (const [t, id] of [[0, 'welcome'], [1, 'hollow1'], [2, 'ch6_listen'], [3, null]]) { if (id) at(id); else pl.quests = q0; tiers[t] = { tier: C.tier(), first: C.pool('guide')[0], bragi: C.pool('bragi')[0] }; }
    out.tiers = tiers;
    pl.quests = q0;
    // ฟองคำพูดเมื่อเดินใกล้ (Chatter.tick) + วาดได้ไม่พัง
    changeMap('eldheim', 24.5, 23.5, { quiet: true }); NPC.busy = false; C.nextBark = 0;
    for (const n of G.npcs) { n.emote = null; n._barkAt = -99; }
    C.tick();
    const barked = G.npcs.find(n => n.emote && n.emote.k === 'bark');
    out.bark = barked && { id: barked.id, text: barked.emote.text };
    const cv = document.createElement('canvas').getContext('2d');
    try { Emote.draw(cv, 100, 100, barked.emote, G.time + 1); Emote.draw(cv, 100, 100, { k: 'lore', at: 0, until: 9e9 }, 1); out.drawOk = true; } catch (e) { out.drawOk = e.message; }
    // จุดตำนานมีประกายทองเหนือหัวจนกว่าจะตรวจ
    WorldPack.Lore.st().found = {}; WorldPack.Lore.marks();
    out.marks = G.npcs.filter(n => WorldPack.LORE_BY[n.id]).every(n => n.emote && n.emote.k === 'lore');
    out.navHidden = !Nav.places().some(t => WorldPack.LORE_BY[t.npcId]);
    return out;
  });
  ok('every existing town NPC: 4–8 idle lines + chapter lines', talk.counts.every(c => c.idle >= 4 && c.idle <= 8 && c.tiers >= 2), JSON.stringify(talk.counts));
  ok('field NPCs (Lopt, Sigrún, Hel, Loki) also chatter', talk.field);
  ok('dialogue rotates (4 different lines in a row)', new Set(talk.rot).size === 4, talk.rot.join(' / '));
  ok('chapter progress changes the lines (tiers 0→3)', [0, 1, 2, 3].every(t => talk.tiers[t].tier === t) && new Set([0, 1, 2, 3].map(t => talk.tiers[t].first)).size === 4 && new Set([1, 2, 3].map(t => talk.tiers[t].bragi)).size === 3, JSON.stringify(talk.tiers));
  ok('ambient bark: a nearby NPC speaks a speech bubble', !!talk.bark && !!talk.bark.text && talk.drawOk === true, JSON.stringify(talk.bark) + ' ' + talk.drawOk);
  ok('undiscovered lore points show a gold marker and stay out of the Navi list', talk.marks && talk.navHidden);

  // กล่องคุยแรก (หน้าต่างจริง): ไม่มีบรรทัดเล็กใต้กล่องแล้ว (PENDING ข้อ 17 — ซ้ำกับคำทัก) • บทพูดหมุนเวียนอยู่ในฟองคำพูดเหนือหัวเท่านั้น
  await p.evaluate(() => ST.unstub());
  const asides = [];
  for (let k = 0; k < 2; k++) {
    await p.evaluate(() => { UI.dlgClose(); NPC.busy = false; const n = G.npcs.find(n => n.id === 'guide'); NPC.talk(n); });
    await p.waitForTimeout(400);
    asides.push(await p.evaluate(() => ({ open: !!document.querySelector('#w-dialog .dlg-text'), aside: !!document.querySelector('#w-dialog .dlg-aside') })));
    if (k === 0) await p.screenshot({ path: path.join(SHOTS, 'npc_dialogue_rolf.png') });
  }
  ok('first dialog box has no aside line under it (chatter stays in over-head bubbles)', asides.every(a => a.open && !a.aside), JSON.stringify(asides));
  await p.evaluate(() => { UI.dlgClose(); NPC.busy = false; const n = G.npcs.find(n => n.id === 'saga'); NPC.talk(n); });
  await p.waitForTimeout(500);
  const sagaTxt = await p.evaluate(() => document.querySelector('#w-dialog .dlg-text').innerHTML);
  ok('new NPC Saga greets with a chatter line + Codex count', /Codex/.test(sagaTxt), sagaTxt.slice(0, 120));
  await p.screenshot({ path: path.join(SHOTS, 'npc_dialogue_saga.png') });
  await p.evaluate(() => { UI.dlgClose(); NPC.busy = false; });

  // ---------- 5) จุดตำนาน: ตรวจดู → Codex → เซฟ/รีโหลด ----------
  await p.evaluate(() => { WorldPack.Lore.st().found = {}; G.player.baseLv = 40; G.player.baseExp = 0; recalc(); changeMap('mistlake', 58.5, 23.5, { quiet: true }); G.mobs.length = 0; });
  await p.waitForTimeout(1200);
  const b0 = await p.evaluate(() => { const pl = G.player; return { b: pl.baseExp, lv: pl.baseLv }; });
  await p.evaluate(() => { NPC.busy = false; NPC.talk(G.npcs.find(n => n.id === 'lr_l_journal')); });
  await p.waitForTimeout(500);
  const lore1 = await p.evaluate(() => ({ title: document.querySelector('#w-dialog .win-title span').textContent, text: document.querySelector('#w-dialog .dlg-text').textContent, found: WorldPack.Lore.has('lr_l_journal'), n: WorldPack.Lore.count() }));
  await p.screenshot({ path: path.join(SHOTS, 'lore_examine_journal.png') });
  await p.click('#w-dialog .dlg-btns .btn'); await p.waitForTimeout(300);
  const lore2 = await p.evaluate(() => ({ badge: !!document.querySelector('#w-dialog .lore-new'), exp: G.player.baseExp }));
  await p.evaluate(() => { UI.dlgClose(); NPC.busy = false; NPC.talk(G.npcs.find(n => n.id === 'lr_l_journal')); });
  await p.waitForTimeout(300);
  await p.click('#w-dialog .dlg-btns .btn'); await p.waitForTimeout(300);
  const lore3 = await p.evaluate(() => ({ badge: !!document.querySelector('#w-dialog .lore-new'), n: WorldPack.Lore.count() }));
  await p.evaluate(() => { UI.dlgClose(); NPC.busy = false; });
  ok('examining a lore point opens its tale and records it', /Ylva/.test(lore1.title) && /Hopper/.test(lore1.text) && lore1.found && lore1.n === 1, JSON.stringify(lore1));
  ok('first discovery: Codex badge + small EXP; reading again gives nothing new', lore2.badge && lore2.exp > b0.b && !lore3.badge && lore3.n === 1, JSON.stringify({ lore2, lore3, b0 }));
  // Codex (แท็บ Lore)
  await p.evaluate(() => { WorldPack.Lore.discover('lr_l_perch'); WorldPack.Lore.discover('lr_w_den'); WorldPack.openCodex(); });
  await p.waitForTimeout(400);
  await p.evaluate(() => { const d = document.querySelector('#w-quest details.lw-row'); if (d) d.open = true; });
  await p.waitForTimeout(300);
  const codex = await p.evaluate(() => ({ tab: !!document.querySelector('#w-quest [data-qtab="lore"].on'), maps: document.querySelectorAll('#w-quest .lw-map').length, found: document.querySelectorAll('#w-quest details.lw-row').length, unk: document.querySelectorAll('#w-quest .lw-unk').length, head: document.querySelector('#w-quest .lw-n').textContent }));
  ok('Codex tab lists 8 maps, 3 found entries, the rest as ???', codex.tab && codex.maps === 8 && codex.found === 3 && codex.unk === 20 && codex.head === '3/23', JSON.stringify(codex));
  await p.screenshot({ path: path.join(SHOTS, 'codex_lore_tab.png') });
  // กลับแท็บ Story: แท็บ Lore ยังอยู่ ไม่ทับการ์ดเควสต์
  await p.evaluate(() => { document.querySelector('#w-quest [data-qtab="story"]').click(); });
  await p.waitForTimeout(300);
  const back = await p.evaluate(() => ({ main: !!document.querySelector('#w-quest .q-main'), lore: !!document.querySelector('#w-quest [data-qtab="lore"]'), list: !!document.querySelector('#w-quest .lw-map') }));
  ok('switching back to Story renders the quest log with the Lore tab still present', back.main && back.lore && !back.list, JSON.stringify(back));
  // ภาพหน้าต่างเควสต์ที่มีเควสต์เสริมใหม่กำลังทำ
  await p.evaluate(() => {
    const pl = G.player; pl.quests.side = Object.assign({}, pl.quests.side);
    for (const id of ['w_codex', 'w_wheels', 'w_scout', 'w_rune', 'w_gleipnir']) delete pl.quests.side[id];
    for (const id of ['w_codex', 'w_wheels', 'w_scout', 'w_gleipnir']) Side.accept(Side.def(id));
    addItem('scrap_gear', 5, true);
    UI.questTab = 'story'; const body = document.querySelector('#w-quest .win-body'); body.dataset.key = ''; body.dataset.sk = ''; UI.renderQuest();
    const s = document.querySelector('#w-quest .q-side'); if (s) s.scrollIntoView();
  });
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(SHOTS, 'quest_window_side_quests.png') });
  await p.evaluate(() => UI.close('w-quest'));

  // เซฟ → รีโหลด → เล่นต่อ: ตำนานยังอยู่
  const before = await p.evaluate(() => { saveGame(true, true); return Object.keys(G.player.lore.found).sort(); });
  await p.reload(); await p.waitForSelector('#au-offline', { state: 'visible', timeout: 20000 }); await p.click('#au-offline');
  await p.click('#btn-continue'); await settle(p);
  const after = await p.evaluate(() => ({ found: Object.keys(WorldPack.Lore.st().found).sort(), side: Side.isDone('w_verse') && Side.isActive('w_scout') }));
  ok('lore discoveries + new side-quest progress persist across save/reload', JSON.stringify(after.found) === JSON.stringify(before) && before.length === 3 && after.side, JSON.stringify({ before, after }));

  // ---------- 6) เซฟเก่า (ก่อนมีแพ็กนี้: ไม่มี lore / ไม่มีเควสต์ w_*) ----------
  await p.evaluate(() => {
    const d = saveData(); delete d.lore; d.name = 'Oldie';
    d.quests = { i: 12, n: 0, done: QUEST_ORDER_V1.slice(0, 12) }; // เซฟรุ่นแรก (ไม่มี v/id/side)
    G.started = false; // กันเซฟตอนออกจากหน้า (beforeunload) ทับเซฟเก่าที่เพิ่งเขียน
    localStorage.setItem(SAVE_KEY, JSON.stringify(d)); // เซฟตัวละครเดียวแบบเก่า (ก่อนก้อนบัญชี v2)
  });
  await p.reload(); await p.waitForSelector('#au-offline', { state: 'visible', timeout: 20000 }); await p.click('#au-offline');
  await p.click('#btn-continue'); await settle(p);
  const old = await p.evaluate(() => {
    const L0 = WorldPack.Lore, pl = G.player;
    const r = { name: pl.name, lore: L0.count(), st: JSON.stringify(L0.st()), active: Side.active().length, avail: SIDE_EXTRA.filter(q => Side.available(q)).map(q => q.id) };
    saveGame(true, true);
    const d = JSON.parse(localStorage.getItem(SAVE_KEY)); r.saved = d.chars ? !!d.chars[d.active].lore : !!d.lore;
    UI.open('w-quest'); UI.renderQuest(); r.qwin = !!document.querySelector('#w-quest .q-main'); UI.close('w-quest');
    return r;
  });
  ok('old save (no lore field, v1 quest log) loads: empty Codex, side quests offered by level', old.name === 'Oldie' && old.lore === 0 && /"found":\{\}/.test(old.st) && old.active === 0 && old.avail.length > 0 && old.qwin, JSON.stringify(old));
  ok('old save gets the new field on the next save', old.saved);

  // ---------- 7) Elite หายาก ----------
  const el = await p.evaluate(() => {
    const E = WorldPack.Elite, out = { defs: [] };
    for (const [map, id] of Object.entries(E.MAPS)) {
      const d = MOBS[id], b = MOBS[d.base];
      out.defs.push({ id, drops: d.drops.length, ratio: +(d.exp / d.hp / (b.exp / b.hp)).toFixed(2), inSpawns: Object.values(MAP_DEFS).some(m => (m.spawns || []).some(s => s[0] === id)), lore: !!d.lore, unique: d.drops.some(([i]) => ['moonlit_ears', 'captain_crest', 'alpha_mantle'].includes(i)) });
    }
    const pl = G.player; pl.baseLv = 70; recalc();
    changeMap('meadow', 30.5, 30.5, { quiet: true });
    const m = E.spawn('meadow'); out.spawned = !!m && m.def.id === 'elite_moonbun' && m.elite;
    m.hp = 1; killMob(m);
    out.noRespawn = !G.respawns.some(r => r.id === 'elite_moonbun');
    out.later = E.next.meadow - G.time > 400;
    E.tick(); out.noInstant = !G.mobs.some(x => x.def.id === 'elite_moonbun' && !x.dead);
    out.bounty = !Bounty.roll(Object.assign({}, pl, { baseLv: 6 }), '2026-10-03').some(x => x.mob.startsWith('elite_'));
    return out;
  });
  ok('3 field elites: 6–8 drops incl. a unique item, EXP per HP same as base, lore, not in spawn tables', el.defs.length === 3 && el.defs.every(d => d.drops >= 6 && d.drops <= 8 && d.ratio === 1 && !d.inSpawns && d.lore && d.unique), JSON.stringify(el.defs));
  ok('elite spawns, does not respawn on the 4–10 s timer, comes back minutes later', el.spawned && el.noRespawn && el.later && el.noInstant, JSON.stringify(el));
  ok('elites never show up on the bounty board', el.bounty);

  ok('no page errors', !errs.length, errs.slice(0, 3).join(' | '));
  console.log(`\n${pass} passed, ${fail} failed — screenshots: ${SHOTS}`);
  await b.close(); if (srv) srv.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
