'use strict';
// ============================================================
//  ภาคที่ 2 — บทที่ 8 กิ่งที่ขาด (js/content_ch8.js) + บทที่ 9 ท้องของหมาป่า (js/content_ch9.js) • Lv 71–99
//  • แผนที่ Severed Bough / Belly of the Wolf: อยู่บนผืนโลกไม่ซ้อนใคร • ประตูด้านในริมเหนือของ Mistlake ไม่เปลี่ยนผังน้ำ (ซาก 3D ในบ่อยังวาง)
//    เดินเข้า-ออกได้จริงทั้งสองทาง • NPC / รัง MVP เดินถึงได้ • ระบบนำทางพาเดินจาก Mistlake ถึงแมพใหม่ได้เอง
//  • มอนเกิดครบทุกชนิด ข้อมูลครบ (ตำนาน/ชิป/ดรอป) เส้น EXP/HP ต่อจากบทที่ 7 • อุปกรณ์ใหม่ทุกชิ้นดรอปในช่วงเลเวลของมอน (LOOT.dropBand)
//  • MVP Hræsvelgr / Fenrir: เกิดที่รัง ชุดท่าของตัวเอง ทุกท่ามีป้ายแดง ≥ 1 วิ ยืนนิ่งโดน เดินหลบพ้น • ลูกสมุนไม่มีรางวัล • Ancient มีในบอสโลก
//  • เควสต์ ch8_* / ch9_* ทำจบได้ (ฆ่า/เก็บ/คุยจำลอง) ทั้งสามทางเลือก Core • เซฟที่จบภาค 1 แล้วต่อที่ ch8_howl • ไม่มี error
//  รัน:  CHROME=<chrome> NODE_PATH=$(npm root -g) node tests/ch8.js   (BASE=http://localhost:พอร์ต/index.html • SHOTS=โฟลเดอร์ = เก็บภาพแต่ละแมพ/MVP)
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

let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) { pass++; console.log('✔', name, info ? ` (${info})` : ''); } else { fail++; console.log('✘', name, info ? ` (${info})` : ''); } };
const CH8 = ['frostbud', 'rime_moth', 'gjallar_sentinel', 'hrimhusk', 'frostmane'], CH9 = ['bile_unit', 'gleipnir_coil', 'fangborn', 'einherjar_remnant', 'rustfang_wyrm'];

(async () => {
  const srv = process.env.BASE ? null : await serve();
  const url = process.env.BASE || `http://localhost:${srv.address().port}/index.html`;
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  const b = await chromium.launch(opts);
  const p = await (await b.newContext({ viewport: { width: 1100, height: 680 } })).newPage();
  const errs = [], warns = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'warning' && /bake|Bake/.test(m.text())) warns.push(m.text()); });
  await p.route(/^https:\/\//, r => r.abort()); // ไม่แตะ Supabase จริง
  await p.goto(url, { timeout: 180000 }); await p.waitForTimeout(1500);
  await p.click('#au-offline'); await p.click('#btn-new');
  await p.fill('#cr-name', 'Leaf'); await p.click('#cr-start');
  await p.waitForFunction(() => G.started, null, { timeout: 30000 });
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 8000, polling: 250 }).catch(() => {});

  // ---------- 1) แผนที่: ที่ตั้งบนโลก / ประตู / เดินถึงได้ ----------
  const geo = await p.evaluate(() => {
    const L0 = WORLD.layout(), ml = new GameMap('mistlake'), bo = new GameMap('bough'), wb = new GameMap('wolfbelly');
    const reach = (m, from, pts) => { const seen = new Uint8Array(m.w * m.h), st = [from]; seen[m.idx(...from)] = 1;
      while (st.length) { const [x, y] = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (m.inb(nx, ny) && !seen[m.idx(nx, ny)] && (m.walkable(nx, ny) || m.block[m.idx(nx, ny)])) { seen[m.idx(nx, ny)] = 1; st.push([nx, ny]); } } }
      return pts.every(q => seen[m.idx(...q)]); };
    const gate = ml.portals.find(q => q.to === 'bough'), bS = bo.portals.find(q => q.to === 'mistlake'), bN = bo.portals.find(q => q.to === 'wolfbelly'), wS = wb.portals.find(q => q.to === 'bough');
    const hg = MAP_DEFS.bough.npcs.find(n => n.id === 'huginn'), lk = MAP_DEFS.wolfbelly.npcs.find(n => n.id === 'loki_maw'), n1 = mvpSpawnPos(bo), n2 = mvpSpawnPos(wb);
    const A = WORLD.art(), north = (A.caveIcons || []).find(c => c.ids[0] === 'bough');
    return { placed: !!(L0.bough && L0.wolfbelly), overlaps: WORLD.overlaps(), above: L0.bough.y + MAP_DEFS.bough.h <= L0.mistlake.y && L0.wolfbelly.y + MAP_DEFS.wolfbelly.h <= L0.bough.y,
      bake: typeof Bake !== 'undefined' && Bake.data ? !!Bake.data(ml) : null,
      gate: gate && { x: gate.x, y: gate.y, inner: gate.inner, side: WORLD.sideOf(ml, gate) }, gateReach: reach(ml, [ml.portals[0].ax, ml.portals[0].ay], [[gate.x, gate.y], [gate.ax, gate.ay]]),
      boughReach: reach(bo, [bS.ax, bS.ay], [[bN.x, bN.y], [hg.x, hg.y + 1], [n1.x, n1.y]]), bellyReach: reach(wb, [wS.ax, wS.ay], [[lk.x, lk.y + 1], [n2.x, n2.y]]),
      nestFar: [Math.hypot(n1.x - bS.x, n1.y - bS.y), Math.hypot(n2.x - wS.x, n2.y - wS.y)].map(v => +v.toFixed(1)),
      route: (Nav.route('eldheim', 'wolfbelly') || []).map(s => s.from + ':' + s.side).join(' > '),
      worldIcon: north ? north.ids.join(',') : null, mainIcon: A.caveIcon ? A.caveIcon.ids.join(',') : null };
  });
  ok('Severed Bough + Belly of the Wolf อยู่บนผืนโลก ไม่ซ้อนแมพอื่น (ทางเหนือของ Mistlake)', geo.placed && !geo.overlaps.length && geo.above, JSON.stringify(geo.overlaps));
  ok('Mistlake: ผังน้ำเดิม (ซาก 3D ในบ่อยังวาง) • ประตูขึ้นเหนือเป็นประตูด้านใน เดินถึงได้', geo.bake !== false && !warns.some(w => /mistlake/.test(w)) && geo.gate && geo.gate.inner && geo.gate.side === 'N' && geo.gateReach, JSON.stringify({ gate: geo.gate, bake: geo.bake, warns }));
  ok('ใน Severed Bough: ขากรรไกร (ประตูเหนือ) Huginn และรัง Hræsvelgr เดินถึงได้ • ใน Belly: Loki และรัง Fenrir เดินถึงได้', geo.boughReach && geo.bellyReach && geo.nestFar.every(d => d > 50), JSON.stringify(geo.nestFar));
  ok('เส้นทางนำทาง: นีโอเอลด์ไฮม์ → Meadow → Mistlake → Severed Bough → Belly of the Wolf', geo.route === 'eldheim:E > meadow:E > mistlake:N > bough:N', geo.route);
  ok('แผนที่โลก: ปากถ้ำที่สองริมเหนือของ Mistlake (กลุ่มของตัวเอง) — ปากเดิมยังเป็นสายใต้ Hel\'s Hollow', geo.worldIcon === 'bough,wolfbelly' && geo.mainIcon === 'helcave,archive,roots,abyss', `${geo.worldIcon} | ${geo.mainIcon}`);
  // แผนที่โลก (W): แตะปากถ้ำริมเหนือ = เมนูเลือกชั้นของกลุ่มนั้น (Severed Bough / Belly of the Wolf)
  const wmap = await p.evaluate(async () => {
    UI.open('w-world'); await new Promise(r => setTimeout(r, 400));
    const A = WORLD.art(), cv = document.querySelector('#worldmap-cv'), ic = (A.caveIcons || []).find(c => c.ids[0] === 'bough');
    if (!cv || !ic) return { open: !!cv, ic: !!ic };
    const m0 = UI.menu; let got = null; UI.menu = async (t, s, o) => { got = o; return -1; };
    const r = cv.getBoundingClientRect();
    cv.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + ic.x / A.c.width * r.width, clientY: r.top + ic.y / A.c.height * r.height }));
    await new Promise(r => setTimeout(r, 50)); UI.menu = m0; UI.close('w-world');
    return { open: true, ic: true, menu: got };
  });
  ok('แผนที่โลก: แตะปากถ้ำริมเหนือ → เลือก Severed Bough / Belly of the Wolf', wmap.menu && /Severed Bough/.test(wmap.menu[0]) && /Belly of the Wolf/.test(wmap.menu[1]) && wmap.menu.length === 3, JSON.stringify(wmap));
  const walk = await p.evaluate(async () => {
    const pl = G.player; pl.baseLv = 80; pl.job = 'einherjar'; recalc(); pl.hp = pl.d.maxHp; pl.mvpAt = { bough: Date.now() + 9e8, wolfbelly: Date.now() + 9e8 }; WB.active = () => false;
    const step = n => { for (let i = 0; i < n; i++) updateGame(0.05); };
    const at = () => [G.map.id, +G.player.x.toFixed(1), +G.player.y.toFixed(1)];
    const out = [];
    changeMap('mistlake', 48.5, 5.5, { quiet: true });
    let g = G.map.portals.find(q => q.to === 'bough'); teleportPlayer(g.x + 0.5, g.y + 0.5); step(6); out.push(at());
    g = G.map.portals.find(q => q.to === 'wolfbelly'); teleportPlayer(g.x + 0.5, g.y + 0.5); step(6); out.push(at());
    g = G.map.portals.find(q => q.to === 'bough'); teleportPlayer(g.x + 0.5, g.y + 0.5); step(6); out.push(at());
    g = G.map.portals.find(q => q.to === 'mistlake'); teleportPlayer(g.x + 0.5, g.y + 0.5); step(6); out.push(at());
    // ระบบนำทาง: จากประตูตะวันตกของ Mistlake เดินเองจนถึง Severed Bough (เวลาเกม ≤ 90 วิ)
    changeMap('mistlake', 4.5, 40.5, { quiet: true }); G.mobs = [];
    Nav.goTo({ kind: 'map', map: 'bough', name: 'Severed Bough' });
    let t = 0; while (G.map.id !== 'bough' && t < 90) { Nav.update(); updateGame(0.05); t += 0.05; G.mobs = []; } // Nav.update เรียกจากลูปหลัก (js/main.js) — ขับเองที่นี่
    out.push([G.map.id, +t.toFixed(1)]); Nav.cancel && Nav.cancel(true);
    return out;
  });
  ok('เดินเข้าประตูเหนือของ Mistlake → Severed Bough (โผล่ทางใต้) → ขากรรไกร → Belly of the Wolf (โผล่ทางใต้)', walk[0][0] === 'bough' && walk[0][2] > 70 && walk[1][0] === 'wolfbelly' && walk[1][2] > 80, JSON.stringify(walk));
  ok('เดินกลับ → Severed Bough (ขอบเหนือ) → Mistlake ข้างประตูริมเหนือ', walk[2][0] === 'bough' && walk[2][2] < 8 && walk[3][0] === 'mistlake' && Math.abs(walk[3][1] - 48.5) < 1.5 && walk[3][2] < 8, JSON.stringify(walk));
  ok('ระบบนำทางพาเดินจาก Mistlake ถึง Severed Bough เอง', walk[4][0] === 'bough', JSON.stringify(walk[4]));

  // ---------- 2) มอนเกิด / ข้อมูลบท / ความสมดุล ----------
  const data = await p.evaluate(([CH8, CH9]) => {
    const out = { bad: [], spawned: {} };
    for (const map of ['bough', 'wolfbelly']) {
      changeMap(map, MAP_DEFS[map].w >> 1, MAP_DEFS[map].h - 4, { quiet: true });
      const ids = {}; for (const m of G.mobs) if (!m.dead && !m.isMvp && !m.isWB) ids[m.def.id] = (ids[m.def.id] || 0) + 1;
      out.spawned[map] = ids;
    }
    for (const id of [...CH8, ...CH9, 'hraesvelgr', 'fenrir']) {
      const d = MOBS[id];
      if (!d || !d.base || !d.lore || !MOB_CHIP[id] || !ITEMS[MOB_CHIP[id]]) out.bad.push(id + ' missing data');
      for (const [it] of d.drops) if (!ITEMS[it]) out.bad.push(`${id} drop ${it}`);
      if (d.drops.some(([it]) => ITEMS[it].type === 'card')) out.bad.push(id + ' card in drops');
      if (!d.hpBoosted || !d.dropsTuned) out.bad.push(id + ' not tuned by balance.js');
      if (!StoryHooks.lore(d)) out.bad.push(id + ' no lore');
    }
    const line = [...CH8, ...CH9];
    out.lv = line.map(id => MOBS[id].lv);
    const mono = k => line.every((id, i) => !i || MOBS[id][k] >= MOBS[line[i - 1]][k]); out.mono = mono('exp') && mono('hp') && mono('lv') && mono('hit');
    out.expRatio = +(MOBS.frostbud.exp / MOBS.rot_colossus.exp).toFixed(3); out.hpRatio = +(MOBS.frostbud.hp / MOBS.rot_colossus.hp).toFixed(3);
    // EXP ต่อเส้นเดียวกับบท 6–7: exp ≈ 3460 × (lv/57)^2.5 (คลาดไม่เกิน 3%)
    out.curve = line.map(id => +(MOBS[id].exp / (3460 * Math.pow(MOBS[id].lv / 57, 2.5))).toFixed(3));
    out.aggro = [CH8.filter(id => MOBS[id].aggro).length, CH9.filter(id => MOBS[id].aggro).length];
    out.races = new Set(line.map(id => MOBS[id].race)).size;
    // อุปกรณ์ใหม่ทุกชิ้น (Lv 71–99 ไม่ใช่รางวัลเควสต์): ดรอปจากมอนปกติ/MVP อย่างน้อย 1 ตัว และอยู่ในช่วงเลเวลของมอนนั้น
    const isEq = it => it.type === 'weapon' || it.type === 'armor';
    const fresh = Object.values(ITEMS).filter(it => isEq(it) && it.lv >= 71 && !it.quest).map(it => it.id);
    out.nItems = fresh.length; out.noDrop = []; out.outBand = [];
    for (const id of fresh) {
      const src = Object.keys(MOBS).filter(mid => !/^wb_/.test(mid) && !MOBS[mid].minion && (MOBS[mid].drops || []).some(([i]) => i === id));
      if (!src.length) out.noDrop.push(id);
      for (const mid of src) { const [lo, hi] = LOOT.dropBand(mid); if (ITEMS[id].lv < lo || ITEMS[id].lv > hi) out.outBand.push(`${id}@${mid}`); }
    }
    out.rarity = {}; for (const id of fresh) out.rarity[ITEMS[id].rarity] = (out.rarity[ITEMS[id].rarity] || 0) + 1;
    out.slots = [...new Set(fresh.map(id => ITEMS[id].wtype || ITEMS[id].slot))].sort().join(',');
    // เส้นพลัง: ของตำนาน Lv 99 แรงสุดในประเภท • Epic ต่ำกว่าตำนาน • ของใหม่แรงกว่าของบท 7
    const swords = Object.values(ITEMS).filter(it => it.wtype === 'sword');
    out.gear = { gungnirTop: swords.every(it => it.id === 'gungnir' || it.atk < ITEMS.gungnir.atk), epicBelow: ITEMS.fen_jaw.atk < ITEMS.gungnir.atk + 20 && ITEMS.hrae_talon.atk < ITEMS.wyrmgut_bow.atk,
      up: ITEMS.frostwing_saber.atk > ITEMS.hollowguard_sword.atk && ITEMS.wyrmspine_sword.atk > ITEMS.maneglass_sword.atk && ITEMS.valkyrie_rod.matk > ITEMS.frostbud_wand.matk };
    out.sets = ['hrae_talon', 'fen_jaw'].map(id => LOOT.setOf(id) && LOOT.setOf(id).id);
    out.wb = ['hraesvelgr', 'fenrir'].map(id => { const w = MOBS['wb_' + id], map = id === 'fenrir' ? 'wolfbelly' : 'bough', leg = LOOT.WB_EXTRA[id];
      return !!w && WB.MAPS[map] && WB.MAPS[map].mvp === id && w.hp === Math.round(MOBS[id].hp * WB.hpMul(map)) && leg.every(l => w.drops.some(([i, c]) => i === l && c >= 0.01) && MOBS[id].drops.some(([i, c]) => i === l && c < 0.001)) && !!StoryHooks.ancientLine(map); });
    ItemIndex._src = null; const S = ItemIndex.sources();
    out.index = ['gungnir', 'rimeleaf_dirk', 'wyrmskull_maul'].map(id => (S[id] || []).filter(s => s.k === 'mob').map(s => `${s.mid}@${s.map}`).join(' '));
    out.navMobs = Nav.mobs().filter(t => [...CH8, ...CH9, 'hraesvelgr', 'fenrir'].includes(t.mobId)).length;
    return out;
  }, [CH8, CH9]);
  ok('มอนบท 8–9 เกิดครบทุกชนิดในแมพของตัวเอง', CH8.every(id => data.spawned.bough[id] > 0) && CH9.every(id => data.spawned.wolfbelly[id] > 0), JSON.stringify(data.spawned));
  ok('มอนบท 8–9: ข้อมูลครบ (ต้นแบบ/ตำนาน/ชิป/ดรอปมีจริง) ปรับสมดุลแบบเดียวกับมอนเดิม', !data.bad.length, data.bad.join(', '));
  ok('มอนบท 8–9: Lv 72–98 ไล่ขึ้น, EXP ต่อเส้นเดิม (±3%), HP/EXP ไม่กระโดดจาก Rot Colossus, ตีก่อน 2 จาก 5 ต่อแมพ, 5 เผ่าขึ้นไป',
    data.mono && data.lv[0] >= 71 && data.lv[9] <= 99 && data.curve.every(r => Math.abs(r - 1) <= 0.03) && data.expRatio > 1 && data.expRatio < 1.2 && data.hpRatio < 1.2 && data.aggro.every(n => n === 2) && data.races >= 5, JSON.stringify(data));
  ok(`อุปกรณ์ใหม่ Lv 71–99 (${data.nItems} ชิ้น) ทุกชิ้นดรอปจากมอน และอยู่ในช่วงเลเวลของมอน (dropBand)`, data.nItems >= 70 && !data.noDrop.length && !data.outBand.length, JSON.stringify({ noDrop: data.noDrop, outBand: data.outBand, rarity: data.rarity }));
  ok('อุปกรณ์ใหม่ครบทุกประเภทอาวุธ + ทุกช่องเกราะ', data.slots === 'acc,armor,axe,bow,dagger,garment,head,mace,rod,shield,shoes,sword', data.slots);
  ok('เส้นพลังอุปกรณ์: ของใหม่แรงกว่าบท 7 • Gungnir แรงสุดในดาบ • ชุดเซ็ต Stormwing / Fenrisúlfr', data.gear.gungnirTop && data.gear.epicBelow && data.gear.up && data.sets.join() === 'stormwing,fenrisulfr', JSON.stringify(data.gear) + data.sets);
  ok('Ancient Hræsvelgr / Ancient Fenrir: บอสโลก HP ×WB.TUNE + ของตำนาน 1% (MVP 0.05%) + ตำนานตอนตื่น', data.wb.every(Boolean), JSON.stringify(data.wb));
  ok('คลังไอเทม + ระบบนำทาง เห็นของ/มอนใหม่ (Gungnir จาก Fenrir • Rimeleaf Dirk จาก Frostbud)', /fenrir@wolfbelly/.test(data.index[0]) && /frostbud@bough/.test(data.index[1]) && /rustfang_wyrm@wolfbelly/.test(data.index[2]) && data.navMobs === 12, JSON.stringify(data.index) + ' nav ' + data.navMobs);

  // ---------- 3) MVP: เกิด / ชุดท่า / ลูกสมุน / ล้ม ----------
  for (const [mvp, map, mine, mins] of [['hraesvelgr', 'bough', ['galeburst', 'featherfall', 'stormeye'], /^mn_(galechick|rimeling)$/], ['fenrir', 'wolfbelly', ['gleipnir', 'fenrirhowl', 'rustrain'], /^mn_(fenrirshard|headrust)$/]]) {
    const boss = await p.evaluate(([mvp, map]) => {
      const pl = G.player; pl.mvpAt = {}; pl.hp = pl.d.maxHp; pl.dead = false;
      changeMap(map, MAP_DEFS[map].w >> 1, MAP_DEFS[map].h - 5, { quiet: true });
      const m = G.mobs.find(x => x.def.id === mvp), k = BossKit.kit(m);
      const r = { spawned: !!m && m.isMvp, at: m && [Math.floor(m.x), Math.floor(m.y)], kit: k === BossKit.KITS[mvp], rot: BossKit.rotation(m), wbRot: k.wbRot, ult: k.ult, sub: Story.mvpSub(mvp), art: !!Art.variantSource('mvp_' + mvp) || !!Art.aliases['mvp_' + mvp] };
      teleportPlayer(m.x + 3, m.y); m.state = 'chase'; m.engaged = true; m.nextSummon = 1e12; m.stunUntil = 1e12; m.nextBossSkill = 1e12;
      for (let i = 0; i < 3; i++) { BossKit.summon(m); for (let j = 0; j < 25; j++) updateGame(0.05); }
      const ms = G.mobs.filter(x => x.minion && !x.dead); r.minions = ms.length; r.minIds = [...new Set(ms.map(x => x.def.id))];
      const exp0 = pl.baseExp + pl.baseLv * 1e9, z0 = pl.zeny, d0 = G.drops.length;
      if (ms[0]) damageMob(ms[0], 1e9);
      r.minReward = { exp: pl.baseExp + pl.baseLv * 1e9 - exp0, zeny: pl.zeny - z0, drops: G.drops.length - d0 };
      let mx = 0; for (let i = 0; i < 200; i++) mx = Math.max(mx, bossDmg(m, 2.0)); r.cap = +(mx / pl.d.maxHp).toFixed(2);
      const kills0 = (pl.kills || {})[mvp] || 0; killMob(m); updateGame(0.05);
      r.killed = ((pl.kills || {})[mvp] || 0) - kills0; r.left = G.mobs.filter(x => x.minion && !x.dead).length;
      r.mapLine = Story.mapLine(map) === Story.MAP_LINES_AFTER[map];
      return r;
    }, [mvp, map]);
    ok(`${mvp}: เกิดเป็น MVP ที่รังทางเหนือ + ป้ายชื่อเรื่องราว + ภาพเปิดตัว`, boss.spawned && boss.at[1] < 15 && !!boss.sub && boss.art, JSON.stringify(boss.at));
    ok(`${mvp}: ชุดท่าของตัวเอง (${mine.join('/')}) + ท่า Ancient`, boss.kit && mine.every(s => boss.rot.includes(s)) && boss.wbRot.includes(boss.ult), JSON.stringify(boss.rot) + ' ult ' + boss.ult);
    ok(`${mvp}: ลูกสมุนค้างไม่เกิน 3 ไม่มีรางวัล • ท่าแรงสุดไม่เกิน 60% MaxHP`, boss.minions >= 1 && boss.minions <= 3 && boss.minIds.every(i => mins.test(i)) && !boss.minReward.exp && !boss.minReward.zeny && !boss.minReward.drops && boss.cap <= 0.6, JSON.stringify(boss));
    ok(`${mvp}: ล้ม = นับฆ่า + ลูกสมุนสลาย + บรรทัดแผนที่เปลี่ยน`, boss.killed === 1 && boss.left === 0 && boss.mapLine, JSON.stringify({ killed: boss.killed, left: boss.left, line: boss.mapLine }));
  }

  // ---------- 4) ท่าบอสใหม่: ป้ายแดง ≥ 1 วิ • ยืนนิ่ง = โดน • เดินหลบ = ไม่โดน ----------
  await p.evaluate(() => {
    WB.active = () => false;
    const pl = G.player; pl.job = 'einherjar'; pl.baseLv = 90; recalc(); pl.hp = pl.d.maxHp;
    changeMap('wolfwood', 28.5, 28.5, { quiet: true });
    for (let y = 12; y < 44; y++) for (let x = 12; x < 44; x++) { const i = G.map.idx(x, y); G.map.tiles[i] = T.GRASS; G.map.block[i] = 0; }
    window.__dp = damagePlayer; window.__sp = stunPlayer;
    window.__hits = []; damagePlayer = dmg => { window.__hits.push(dmg); }; stunPlayer = () => {};
    window.__run = (mobId, skill, px, py, plan) => {
      G.mobs = []; G.respawns = []; G.fx = []; G.timers = []; window.__hits = [];
      const pl = G.player; teleportPlayer(px, py); pl.dead = false; pl.stunUntil = 0; pl.poisonUntil = 0;
      const m = spawnMob(mobId, { x: 25, y: 28 });
      if (MOBS[mobId].worldBoss) { m.isWB = true; m.maxHp = MOBS[mobId].hp; m.hp = m.maxHp; } else m.isMvp = true;
      m.stunUntil = 1e12; m.nextBossSkill = 1e12; BossKit.init(m);
      const t0 = G.time; Math.random = (s => () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; })(77);
      BOSS_SKILLS[skill](m);
      const tele = []; let i = 0;
      const grab = () => { for (const f of G.fx) if (f.type === 'tele' && !f._seen) { f._seen = 1; tele.push(+f.dur.toFixed(2)); } };
      grab();
      for (const [at, tx, ty] of plan) { while (G.time - t0 < at) { updateGame(0.05); grab(); i++; } pl.path = findPath(G.map, Math.floor(pl.x), Math.floor(pl.y), tx, ty, 2000); }
      while (G.time - t0 < 5 && i++ < 500) { updateGame(0.05); grab(); }
      return { tele, hits: window.__hits.length };
    };
  });
  const cases = [
    // [ชื่อ, มอน, ท่า, ตำแหน่งผู้เล่น, แผนหลบ [[เวลา, x, y]]] — บอสยืนที่ (25.5, 28.5)
    ['ลมพัด (galeburst)', 'hraesvelgr', 'galeburst', [30.5, 28.5], [[0.15, 30, 32]]],                     // แนวลมไปทางขวา → ก้าวลงข้างล่าง
    ['ขนน้ำแข็งตามรอยเท้า (featherfall)', 'hraesvelgr', 'featherfall', [28.5, 28.5], [[0.1, 40, 28]]],     // เดินไม่หยุด
    ['ตาพายุ (stormeye)', 'hraesvelgr', 'stormeye', [30.5, 28.5], [[0.15, 26, 29]]],                      // เข้าชิดตัวมัน
    ['Ancient ลมพัด 3 แนว (galeburst)', 'wb_hraesvelgr', 'galeburst', [30.5, 28.5], [[0.15, 26, 38]]],      // วิ่งออกกว้างพ้นทั้งพัด
    ['Ancient ตาพายุปิด (stormeye)', 'wb_hraesvelgr', 'stormeye', [30.5, 28.5], [[0.15, 26, 29], [1.25, 37, 29]]], // เข้าตาพายุ แล้วออกก่อนตาปิด
    ['Ancient ฉีกฟ้า (skytear)', 'wb_hraesvelgr', 'skytear', [30.5, 28.5], [[0.1, 30, 30]]],              // ยืนระหว่างแฉก (มุม ~22°)
    ['โซ่ Gleipnir (gleipnir)', 'fenrir', 'gleipnir', [30.5, 28.5], [[0.15, 25, 36]]],                       // ออกนอกพัดโซ่
    ['หอน (fenrirhowl)', 'fenrir', 'fenrirhowl', [30.5, 28.5], [[1.55, 33, 28]]],                           // ยืนนิ่งกลางวง แล้วก้าวออก
    ['ฝนสนิม (rustrain)', 'fenrir', 'rustrain', [30.5, 28.5], [[0.1, 40, 28]]],                            // วิ่งออกให้ไกล
    ['Ancient โซ่ 5 เส้น (gleipnir)', 'wb_fenrir', 'gleipnir', [30.5, 28.5], [[0.15, 30, 29]]],              // ก้าวเข้าช่องระหว่างโซ่ (มุม ~11°)
    ['Ancient Ragnarök (ragnarok)', 'wb_fenrir', 'ragnarok', [31.5, 28.5], [[0.1, 27, 28], [1.35, 34, 28], [2.4, 27, 28]]], // เข้า → ออก → เข้า
  ];
  for (const [name, mob, sk, [px, py], plan] of cases) {
    const still = await p.evaluate(([mob, sk, px, py]) => __run(mob, sk, px, py, []), [mob, sk, px, py]);
    const dodge = await p.evaluate(([mob, sk, px, py, plan]) => __run(mob, sk, px, py, plan), [mob, sk, px, py, plan]);
    ok(`${name}: ป้ายแดง ≥ 1 วิ • ยืนนิ่งโดน • เดินหลบไม่โดน`, still.tele.length > 0 && still.tele.every(d => d >= 1 && d <= 3.4) && still.hits >= 1 && dodge.hits === 0, `tele ${still.tele.join(',')} • still ${still.hits} • dodge ${dodge.hits}`);
  }
  const kits = await p.evaluate(() => ['hraesvelgr', 'fenrir', 'wb_hraesvelgr', 'wb_fenrir'].map(id => { const d = MOBS[id], m = { def: d, isWB: !!d.worldBoss }, rot = BossKit.rotation(m), k = BossKit.kit(m);
    return { id, ok: rot.every(s => BOSS_SKILLS[s]), n: rot.length, minions: k.minions.length }; }));
  ok('ชุดท่า MVP + Ancient ใหม่: ทุกท่ามีจริง ≥ 5 ท่า + ลูกสมุน 2 ชนิด', kits.every(k => k.ok && k.n >= 5 && k.minions === 2), JSON.stringify(kits));
  await p.evaluate(() => { damagePlayer = window.__dp; stunPlayer = window.__sp; });

  // ---------- 5) เควสต์บทที่ 8–9 ทั้งสายตามทางเลือก Core ----------
  await p.evaluate(() => {
    window.__log = []; window.__splash = [];
    UI.say = async (n, t) => { __log.push(n + ' ' + t); };
    UI.menu = async (n, t, o) => { __log.push(n + ' ' + t); return o.length - 1; };
    UI.splash = (k, t) => { __splash.push(t); };
    window.__chain = async coreChoice => {
      const pl = G.player; __log.length = 0; __splash.length = 0;
      pl.story = { prologue: 1, helMet: 1, helEnd: 1, c7gate: 1, c7loki: 1, c7end: 1, c7home: 1 }; if (coreChoice) pl.story.core = coreChoice;
      const i0 = QUESTS.findIndex(q => q.id === 'ch7_home');
      pl.quests = { v: 2, id: null, i: i0 + 1, n: 0, done: QUESTS.slice(0, i0 + 1).map(q => q.id) }; // จบภาค 1 แล้ว (id ว่าง = จบสาย) — Quest.state ต่อท้ายให้เอง
      const first = Quest.current() && Quest.current().id;
      const npc = id => { for (const m in MAP_DEFS) { const n = (MAP_DEFS[m].npcs || []).find(x => x.id === id); if (n) return n; } return null; };
      const talk = async id => { NPC.busy = false; await NPC.talk(Object.assign({}, npc(id))); };
      const steps = [], navs = [], e0 = pl.baseExp + pl.baseLv * 1e9;
      for (let guard = 0; guard < 20 && Quest.current() && /^ch[89]_/.test(Quest.current().id); guard++) {
        const q = Quest.current(), o = q.obj; steps.push(q.id);
        const nt = Quest.navTarget(q); navs.push(nt ? nt.map : '-');
        if (o.type === 'talk') await talk(o.npc);
        else if (o.type === 'kill') for (let i = 0; i < o.n; i++) killMob(spawnMob(o.mob, { x: Math.floor(pl.x) + 2, y: Math.floor(pl.y) }));
        else if (o.type === 'collect') { addItem(o.item, o.n, true); Quest.check(); }
        if (Quest.current() === q) return { stuck: q.id, steps };
      }
      await talk('huginn'); await talk('loki_maw'); // หลังจบ: บทพูดหลังภาค (ไม่เล่นฉากซ้ำ)
      const bif = []; let mi = 0; UI.menu = async (n, t, o) => { if (mi++ % 2 === 0) return 1; bif.push(o.join('|')); return o.length - 1; }; // เมนูแรก = ข้ามสะพานสายรุ้ง • เมนูปลายทาง = จดรายการแล้วยกเลิก
      await talk('bifrost'); await talk('bifrost');
      UI.menu = async (n, t, o) => { __log.push(n + ' ' + t); return o.length - 1; };
      return { first, steps, navs, done: Quest.isDone('ch9_home'), after: Quest.current(), st: Object.assign({}, pl.story), log: __log.join('\n'), splash: __splash.slice(), bif: bif.join(' / '),
        badge: countItem('second_spark'), gainedExp: pl.baseExp + pl.baseLv * 1e9 - e0, lv: pl.baseLv };
    };
  });
  const runs = {};
  for (const c of ['gave', 'kept', null]) {
    runs[c] = await p.evaluate(async c => {
      const pl = G.player; pl.baseLv = 85; pl.baseExp = 0; pl.inventory = pl.inventory.filter(e => e.id !== 'second_spark'); recalc();
      changeMap('bough', 44.5, 76.5, { quiet: true }); G.mobs = G.mobs.filter(m => !m.def.boss);
      return __chain(c);
    }, c);
  }
  const R0 = runs.gave, R1 = runs.kept, R2 = runs.null;
  ok('จบภาค 1 แล้ว → เควสต์ถัดไปคือ ch8_howl ทันที', R0.first === 'ch8_howl', String(R0.first));
  ok('เควสต์บท 8 (7 อัน) + บท 9 (8 อัน) ทำจบได้ทั้งสาย (ฆ่า/เก็บ/คุย) ทั้ง 3 ทางเลือก Core', [R0, R1, R2].every(R => R.done && !R.stuck && R.steps.length === 15 && R.after === null), JSON.stringify(R0.steps || R0));
  ok('ระบบนำทางของเควสต์ชี้แมพถูก (Eldheim / Severed Bough / Belly of the Wolf)', R0.navs.join(',') === 'eldheim,bough,bough,bough,bough,bough,bough,eldheim,wolfbelly,wolfbelly,wolfbelly,wolfbelly,wolfbelly,wolfbelly,eldheim', R0.navs.join(','));
  ok('ฉากเล่นครบทุกฉาก (c8howl/c8huginn/c8tip/c9brokk/c9loki/c9odin/c9home)', ['c8howl', 'c8huginn', 'c8tip', 'c9brokk', 'c9loki', 'c9odin', 'c9home'].every(k => R0.st[k] && R1.st[k] && R2.st[k]), JSON.stringify(R0.st));
  ok('ตะขอภาค 2: เสียงหอนชี้ทางเหนือ + หัวของ Nidhogg ในท้อง Fenrir + Loki ยอมรับว่าโกหก + "ข้าให้อภัยเจ้า"', /สี่สิบเอ็ดเสียง/.test(R0.log) && /หัวของ Nidhogg/.test(R0.log) && /ข้าโกหกเจ้า/.test(R0.log) && /ข้าให้อภัยเจ้าตั้งแต่คืนแรก/.test(R0.log));
  ok('บทพูดแยกตามทางเลือก Core (gave / kept / ไม่เคยเลือก)', /Core ที่เจ้าให้/.test(R0.log) && /Core ยังอยู่กับเจ้า/.test(R1.log) && /ยังไม่เคยมอบ Core ให้ใคร/.test(R2.log) && !/Core ยังอยู่กับเจ้า/.test(R0.log));
  ok('การ์ดบท 8 / บท 9 / จบภาค 2 + Rolf + ได้ Badge of the Second Spark', ['บทที่ 8', 'บทที่ 9', 'จบภาคที่ 2'].every(k => R0.splash.some(t => t.includes(k))) && /Leaf<\/b>/.test(R0.log) && R0.badge === 1, JSON.stringify(R0.splash));
  ok('หลังจบ: Huginn / Loki ไม่เล่นฉากซ้ำ • Bifrost พาไป Severed Bough ได้หลังลมหยุด', (R0.log.match(/ลมหยุดพัดเป็นครั้งแรกในรอบสามสิบปี น้ำแข็ง/g) || []).length === 1 && (R0.log.match(/Odin ข้าตัดกิ่งของท่าน/g) || []).length === 1 && /Severed Bough/.test(R0.bif), R0.bif);
  ok('รางวัล EXP ของสองบทอยู่ในเส้นเดิม (< 1 เลเวลที่ Lv 85)', R0.gainedExp > 0 && R0.lv <= 86, `exp ${R0.gainedExp}, Lv ${R0.lv}`);

  // ---------- 6) เซฟเก่าที่จบภาค 1 แล้ว (ก่อนมีภาค 2) โหลดได้ → ต่อที่ ch8_howl ----------
  await p.evaluate(() => { saveGame = () => {}; G.started = false; const i = QUESTS.findIndex(q => q.id === 'ch7_home');
    localStorage.setItem(SAVE_KEY, JSON.stringify({ name: 'Leafer', gender: 'f', hair: '#ccc', job: 'einherjar', baseLv: 77, jobLv: 40, baseExp: 0, jobExp: 0,
      stats: { str: 60, agi: 30, vit: 40, int: 1, dex: 30, luk: 1 }, statPoints: 0, skillPoints: 0, skills: {}, zeny: 1000, inventory: [], equip: {}, hotbar: [],
      map: 'abyss', x: 42.5, y: 5.5, save: { map: 'eldheim', x: 20.5, y: 24.5 }, hp: 100, sp: 50, options: { sound: false }, uidSeq: 10,
      quests: { v: 2, id: null, i: i + 1, n: 0, done: QUESTS.slice(0, i + 1).map(q => q.id) }, story: { prologue: 1, helMet: 1, helEnd: 1, core: 'kept', c7home: 1 } })); });
  await p.reload(); await p.waitForTimeout(1500);
  await p.click('#au-offline'); await p.click('#btn-continue'); await p.waitForTimeout(1500);
  const old = await p.evaluate(() => ({ ok: G.started && G.player.name === 'Leafer', q: Quest.current() && Quest.current().id, ch: Quest.chapterText(), nav: (Quest.navTarget() || {}).npcId }));
  ok('เซฟที่จบภาค 1 (ก่อนมีภาค 2) โหลดได้ → เควสต์ถัดไป ch8_howl (บทที่ 8) นำทางไปหา Bifrost Keeper', old.ok && old.q === 'ch8_howl' && /8/.test(old.ch) && old.nav === 'bifrost', JSON.stringify(old));

  // ---------- 7) ภาพ (SHOTS=โฟลเดอร์): แต่ละแมพพร้อมมอน + MVP ----------
  if (process.env.SHOTS) {
    fs.mkdirSync(process.env.SHOTS, { recursive: true });
    for (const [map, x, y, tag] of [['bough', 30.5, 47.5, 'bough'], ['wolfbelly', 40.5, 45.5, 'wolfbelly'], ['bough', 72.5, 10.5, 'mvp_hraesvelgr'], ['wolfbelly', 67.5, 12.5, 'mvp_fenrir'], ['mistlake', 48.5, 6.5, 'mistlake_gate']]) {
      await p.evaluate(([map, x, y, tag]) => {
        const pl = G.player; pl.dead = false; pl.hp = pl.d.maxHp; pl.mvpAt = {}; WB.active = () => false; UI.closeAll && UI.closeAll();
        changeMap(map, x, y, { quiet: true });
        if (/^mvp_/.test(tag)) { const m = G.mobs.find(q => q.isMvp); if (m) { m.x = x + 2.5; m.y = y - 1; m.stunUntil = 1e12; m.nextBossSkill = 1e12; } }
        else { let k = 0; for (const m of G.mobs) if (!m.isMvp && k < 6) { m.x = x - 4 + (k % 3) * 4; m.y = y - 3 + Math.floor(k / 3) * 5; m.stunUntil = 1e12; k++; } }
      }, [map, x, y, tag]);
      await p.waitForTimeout(3500);
      await p.screenshot({ path: path.join(process.env.SHOTS, tag + '.png') });
    }
    console.log('shots →', process.env.SHOTS);
  }

  ok('ไม่มี error', !errs.length, errs.slice(0, 5).join(' | '));
  await b.close(); if (srv) srv.close();
  console.log(fail ? `${fail} FAILED, ${pass} passed` : `ALL ${pass} PASSED`);
  process.exit(fail ? 1 : 0);
})();
