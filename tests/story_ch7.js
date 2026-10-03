'use strict';
// ============================================================
//  บทที่ 7 — ผู้แทะราก (js/content_ch7.js) + ตะขอเรื่องราว (js/story_hooks.js)
//  • แผนที่ Nidhogg's Hollow: อยู่บนผืนโลกไม่ซ้อนใคร • ประตูรากใน Gnawed Roots ไม่เปลี่ยนผัง (ภาพอบ 3D ยังใช้ได้) • เดินเข้า-ออกประตูได้จริงทั้งสองทาง
//  • เควสต์ ch7_* ทำจบได้ด้วยการฆ่า/เก็บ/คุยจำลอง ทั้งสามทางเลือก Core (gave / kept / ไม่เคยเลือก) — บทพูดต่างกันตามทาง + การ์ดจบภาค
//  • Nidhogg เกิดเป็น MVP ที่รัง ใช้ชุดท่าของตัวเอง เรียกลูกสมุน (ไม่มีรางวัล) ล้มแล้วนับเควสต์ • Ancient Nidhogg มีในบอสโลก
//  • เซฟเก่าที่จบบท 6 แล้วโหลดได้ เควสต์ถัดไปคือ ch7_gate • ตำนานมอน/การ์ดยูนิต/Brokk/Mimir Class 2
//  รัน:  NODE_PATH=$(npm root -g) node tests/story_ch7.js   (หรือ BASE=http://localhost:พอร์ต/index.html)
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

(async () => {
  const srv = process.env.BASE ? null : await serve();
  const url = process.env.BASE || `http://localhost:${srv.address().port}/index.html`;
  const b = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 680 } })).newPage();
  const errs = [], warns = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'warning' && /bake|Bake/.test(m.text())) warns.push(m.text()); });
  await p.goto(url); await p.waitForTimeout(1500);
  await p.click('#au-offline'); await p.click('#btn-new');
  await p.fill('#cr-name', 'Leaf'); await p.click('#cr-start');
  await p.waitForFunction(() => G.started, null, { timeout: 15000 });
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 8000, polling: 250 }).catch(() => {});

  // ---------- 1) แผนที่ + ประตูราก ----------
  const geo = await p.evaluate(() => {
    const L0 = WORLD.layout(), r = new GameMap('roots'), a = new GameMap('abyss');
    r.caveBake(); // ผังช่องของ Gnawed Roots ต้องตรงกับภาพอบ 3D เดิม (ประตูด้านในไม่เจาะทาง)
    const gate = r.portals.find(q => q.to === 'abyss'), back = a.portals.find(q => q.to === 'roots');
    // เดินถึงได้: จากประตูตะวันตกของ roots ไปถึงประตูราก • จากประตูเหนือของ abyss ไปถึง Loki และรัง Nidhogg
    const reach = (m, from, pts) => { const seen = new Uint8Array(m.w * m.h), st = [from]; seen[m.idx(...from)] = 1;
      while (st.length) { const [x, y] = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (m.inb(nx, ny) && !seen[m.idx(nx, ny)] && (m.walkable(nx, ny) || m.block[m.idx(nx, ny)])) { seen[m.idx(nx, ny)] = 1; st.push([nx, ny]); } } }
      return pts.every(q => seen[m.idx(...q)]); };
    const lk = MAP_DEFS.abyss.npcs.find(n => n.id === 'loki'), nest = mvpSpawnPos(a);
    return { placed: !!L0.abyss, overlaps: WORLD.overlaps(), caveOk: r._caveOk, gate: gate && { x: gate.x, y: gate.y, inner: gate.inner, side: WORLD.sideOf(r, gate) },
      rootsReach: reach(r, [r.portals[0].ax, r.portals[0].ay], [[gate.x, gate.y], [gate.ax, gate.ay]]),
      abyssReach: reach(a, [back.ax, back.ay], [[lk.x, lk.y + 1], [nest.x, nest.y]]),
      nestFar: Math.hypot(nest.x - back.x, nest.y - back.y) };
  });
  ok('Nidhogg\'s Hollow อยู่บนผืนโลก ไม่ซ้อนแมพอื่น', geo.placed && !geo.overlaps.length, JSON.stringify(geo.overlaps));
  ok('Gnawed Roots: ผังเดิม ภาพอบผนัง 3D ยังใช้ได้ (ประตูรากไม่เจาะทาง)', geo.caveOk === true && !warns.some(w => /roots/.test(w)), warns.join(' | '));
  ok('ประตูรากอยู่ในซุ้มของ Garmr และเดินถึงได้', geo.gate && geo.gate.inner && geo.gate.side === 'S' && geo.rootsReach, JSON.stringify(geo.gate));
  ok('ใน Hollow: Loki และรัง Nidhogg เดินถึงได้ รังอยู่ไกลจากทางลง', geo.abyssReach && geo.nestFar > 50, `nest ${geo.nestFar.toFixed(1)}`);
  const walk = await p.evaluate(async () => {
    const pl = G.player; pl.baseLv = 65; pl.job = 'einherjar'; recalc(); pl.hp = pl.d.maxHp; G.player.mvpAt = { roots: Date.now() + 9e8, abyss: Date.now() + 9e8 }; WB.active = () => false;
    changeMap('roots', 83.5, 41.5, { quiet: true });
    const g = G.map.portals.find(q => q.to === 'abyss'); teleportPlayer(g.x + 0.5, g.y + 0.5);
    for (let i = 0; i < 6; i++) updateGame(0.05);
    const in1 = G.map.id, at1 = [G.player.x, G.player.y].map(v => +v.toFixed(1));
    const bk = G.map.portals.find(q => q.to === 'roots'); teleportPlayer(bk.x + 0.5, bk.y + 0.5);
    for (let i = 0; i < 6; i++) updateGame(0.05);
    return { in1, at1, in2: G.map.id, at2: [G.player.x, G.player.y].map(v => +v.toFixed(1)) };
  });
  ok('เดินเข้าประตูราก → Nidhogg\'s Hollow (โผล่ปากทางเหนือ)', walk.in1 === 'abyss' && walk.at1[1] < 6, JSON.stringify(walk));
  ok('เดินกลับ → Gnawed Roots ข้างซุ้มประตูราก', walk.in2 === 'roots' && Math.abs(walk.at2[0] - 83.5) < 1.5 && Math.abs(walk.at2[1] - 41.5) < 1.5, JSON.stringify(walk));

  // ---------- 2) ข้อมูลบท: มอน / ไอเทม / ชิป / เผ่า / ความสมดุล ----------
  const data = await p.evaluate(() => {
    const ids = ['rust_bloom', 'hollow_shell', 'nid_spawn', 'rootbound_guard', 'rot_colossus'], out = { bad: [] };
    for (const id of [...ids, 'nidhogg']) {
      const d = MOBS[id];
      if (!d || !d.base || !d.lore || !MOB_CHIP[id] || !ITEMS[MOB_CHIP[id]]) out.bad.push(id + ' missing data');
      for (const [it] of d.drops) if (!ITEMS[it]) out.bad.push(`${id} drop ${it}`);
      if (d.drops.some(([it]) => ITEMS[it].type === 'card')) out.bad.push(id + ' card in drops');
      if (!d.hpBoosted || !d.dropsTuned) out.bad.push(id + ' not tuned by balance.js');
    }
    out.lv = ids.map(id => MOBS[id].lv); out.races = ids.map(id => MOBS[id].race);
    out.aggro = ids.filter(id => MOBS[id].aggro).length;
    // เส้น EXP: ต่อจาก Root Gnawer (Lv 57) แบบไม่กระโดด — EXP/HP ต่อเลเวลเพิ่มขึ้นทีละน้อย
    const prev = MOBS.root_gnawer; out.expRatio = +(MOBS.rust_bloom.exp / prev.exp).toFixed(2); out.hpRatio = +(MOBS.rust_bloom.hp / prev.hp).toFixed(2);
    const mono = k => ids.every((id, i) => !i || MOBS[id][k] >= MOBS[ids[i - 1]][k]); out.mono = mono('exp') && mono('hp') && mono('lv');
    // อุปกรณ์: ต่ำกว่าของตำนาน Lv 60 เดิม (ไม่มีพลังกระโดด)
    out.gear = ['nid_fang', 'nid_rotstaff'].map(id => [id, ITEMS[id].atk, ITEMS[id].matk || 0]);
    out.gearOk = ITEMS.nid_fang.atk < ITEMS.tyr_hand.atk && ITEMS.nid_rotstaff.matk < ITEMS.mimir_well.matk && ITEMS.shell_greatsword.atk > ITEMS.gnawer_saber.atk;
    out.wb = !!MOBS.wb_nidhogg && WB.MAPS.abyss && WB.MAPS.abyss.mvp === 'nidhogg' && MOBS.wb_nidhogg.hp === MOBS.nidhogg.hp * 5 && MOBS.wb_nidhogg.drops.some(([i, c]) => i === 'nid_heart' && c >= 0.01) && MOBS.nidhogg.drops.some(([i, c]) => i === 'nid_heart' && c < 0.001); // ตำนาน: MVP 0.05% • Ancient 1% (เพดานใน balance.js)
    out.slayFormless = Object.values(MOBS).filter(m => m.race === 'formless' && !m.dummy && !m.minion).map(m => m.id);
    out.set = LOOT.setOf('nid_fang') && LOOT.setOf('nid_fang').id;
    return out;
  });
  ok('มอนบท 7: ข้อมูลครบ (ต้นแบบ/ตำนาน/ชิป %/ดรอปมีจริง) ปรับสมดุลแบบเดียวกับมอนเดิม', !data.bad.length, data.bad.join(', '));
  ok('มอนบท 7: Lv 58–69 ไล่ขึ้น, EXP/HP ต่อเส้นเดิม, ตีก่อน 2 จาก 5', data.mono && data.lv[0] >= 58 && data.lv[4] <= 70 && data.expRatio > 1 && data.expRatio < 1.15 && data.hpRatio < 1.15 && data.aggro === 2, JSON.stringify(data));
  ok('Formless Slayer มีเป้าแล้ว (มอนไร้รูปจริง)', data.slayFormless.length >= 2, data.slayFormless.join(','));
  ok('อุปกรณ์ Lv 58–70: แรงกว่าขั้นก่อน แต่ไม่เกินของตำนาน Lv 60', data.gearOk, JSON.stringify(data.gear));
  ok('Ancient Nidhogg: บอสโลก HP ×5 + ของตำนานดรอปง่ายขึ้น + ชุดเซ็ต Wyrmbane', data.wb && data.set === 'wyrmbane', JSON.stringify({ wb: data.wb, set: data.set }));

  // ---------- 3) Nidhogg: เกิด / ชุดท่า / ลูกสมุน / ล้ม ----------
  const boss = await p.evaluate(() => {
    const pl = G.player; delete pl.mvpAt.abyss; pl.mvpAt = {}; pl.hp = pl.d.maxHp; pl.dead = false;
    changeMap('abyss', 42.5, 3.5, { quiet: true });
    const m = G.mobs.find(x => x.def.id === 'nidhogg'), k = BossKit.kit(m);
    const r = { spawned: !!m && m.isMvp, at: m && [Math.floor(m.x), Math.floor(m.y)], kit: k === BossKit.KITS.nidhogg, rot: BossKit.rotation(m), ult: k.ult, sub: Story.mvpSub('nidhogg') };
    // ลูกสมุน: เรียก 2 ครั้ง ค้างไม่เกิน 3 • ตายไม่ให้ EXP/Zeny/ของ/นับฆ่า
    teleportPlayer(m.x + 3, m.y); m.state = 'chase'; m.engaged = true; m.nextSummon = 1e12; m.stunUntil = 1e12; m.nextBossSkill = 1e12;
    for (let i = 0; i < 3; i++) { BossKit.summon(m); for (let j = 0; j < 25; j++) updateGame(0.05); }
    const mins = G.mobs.filter(x => x.minion && !x.dead); r.minions = mins.length; r.minIds = [...new Set(mins.map(x => x.def.id))];
    const exp0 = pl.baseExp + pl.baseLv * 1e9, z0 = pl.zeny, d0 = G.drops.length, k0 = (pl.kills || {})[mins[0].def.id] || 0;
    damageMob(mins[0], 1e9);
    r.minReward = { exp: pl.baseExp + pl.baseLv * 1e9 - exp0, zeny: pl.zeny - z0, drops: G.drops.length - d0, kills: ((pl.kills || {})[mins[0].def.id] || 0) - k0 };
    // ท่าแรงสุดไม่เกิน 60% MaxHP (Ancient คลั่งสุดเช่นกัน — ทดสอบใน boss_telegraph)
    let mx = 0; for (let i = 0; i < 200; i++) mx = Math.max(mx, bossDmg(m, 2.0)); r.cap = +(mx / pl.d.maxHp).toFixed(2);
    // ล้ม: นับเควสต์/ฆ่า + ลูกสมุนสลาย
    const kills0 = (pl.kills || {}).nidhogg || 0; killMob(m); updateGame(0.05);
    r.killed = ((pl.kills || {}).nidhogg || 0) - kills0; r.left = G.mobs.filter(x => x.minion && !x.dead).length;
    r.mapLine = Story.mapLine('abyss') === Story.MAP_LINES_AFTER.abyss;
    return r;
  });
  ok('Nidhogg เกิดเป็น MVP ที่รังทางใต้ + ป้ายชื่อเรื่องราว', boss.spawned && boss.at[1] > 60 && !!boss.sub, JSON.stringify(boss.at));
  ok('Nidhogg ใช้ชุดท่าของตัวเอง (ลมหายใจสนิม/มุดราก/แทะ/ตาข่ายราก) + ท่า Ancient', boss.kit && ['rustbreath', 'burrow', 'gnaw', 'rootlattice'].every(s => boss.rot.includes(s)) && boss.ult === 'devour', JSON.stringify(boss.rot));
  ok('ลูกสมุน Nidhogg: ค้างไม่เกิน 3 ไม่มีรางวัลใด ๆ', boss.minions >= 2 && boss.minions <= 3 && boss.minIds.every(i => /^mn_(wyrmling|rotbud)$/.test(i)) && !boss.minReward.exp && !boss.minReward.zeny && !boss.minReward.drops && !boss.minReward.kills, JSON.stringify(boss));
  ok('ท่า Nidhogg แรงสุดไม่เกิน 60% MaxHP', boss.cap <= 0.6, String(boss.cap));
  ok('Nidhogg ล้ม = นับฆ่า + ลูกสมุนสลาย + บรรทัดแผนที่เปลี่ยน', boss.killed === 1 && boss.left === 0 && boss.mapLine, JSON.stringify(boss));

  // ---------- 4) เควสต์บทที่ 7 ทั้งสายตามทางเลือก Core ----------
  await p.evaluate(() => {
    window.__log = []; window.__splash = [];
    UI.say = async (n, t) => { __log.push(n + ' ' + t); };
    UI.menu = async (n, t, o) => { __log.push(n + ' ' + t); return o.length - 1; }; // เลือกตัวเลือกสุดท้าย (ออก/ไว้ก่อน)
    UI.splash = (k, t, s, c) => { __splash.push(t); };
    window.__chain = async coreChoice => {
      const pl = G.player; __log.length = 0; __splash.length = 0;
      pl.story = { prologue: 1, helMet: 1, helEnd: 1, helMask: coreChoice === 'gave' ? 1 : 0 }; if (coreChoice) pl.story.core = coreChoice;
      const i0 = QUESTS.findIndex(q => q.id === 'ch7_gate');
      pl.quests = { i: i0, n: 0, done: QUESTS.slice(0, i0).map(q => q.id) };
      const npc = id => { for (const m in MAP_DEFS) { const n = (MAP_DEFS[m].npcs || []).find(x => x.id === id); if (n) return n; } return null; };
      const talk = async id => { NPC.busy = false; await NPC.talk(Object.assign({}, npc(id))); };
      const got = { exp: 0, zeny: pl.zeny, items: {} }, steps = [];
      const e0 = pl.baseExp + pl.baseLv * 1e9;
      for (let guard = 0; guard < 12 && Quest.current() && /^ch7_/.test(Quest.current().id); guard++) {
        const q = Quest.current(), o = q.obj; steps.push(q.id);
        if (o.type === 'talk') await talk(o.npc);
        else if (o.type === 'kill') for (let i = 0; i < o.n; i++) killMob(spawnMob(o.mob, { x: Math.floor(pl.x) + 2, y: Math.floor(pl.y) }));
        else if (o.type === 'collect') { addItem(o.item, o.n, true); Quest.check(); }
        if (Quest.current() === q) return { stuck: q.id, steps };
      }
      await talk('hel'); // หลังจบ: บทพูดหลังภาค (ไม่เล่นฉากซ้ำ)
      return { steps, done: Quest.isDone('ch7_home'), st: Object.assign({}, pl.story), log: __log.join('\n'), splash: __splash.slice(),
        badge: countItem('first_leaf'), gainedExp: pl.baseExp + pl.baseLv * 1e9 - e0, lv: pl.baseLv };
    };
  });
  const runs = {};
  for (const c of ['gave', 'kept', null]) {
    runs[c] = await p.evaluate(async c => {
      const pl = G.player; pl.baseLv = 62; pl.baseExp = 0; pl.zeny = 0; pl.inventory = pl.inventory.filter(e => e.id !== 'first_leaf'); recalc();
      changeMap('abyss', 42.5, 3.5, { quiet: true }); G.mobs = G.mobs.filter(m => !m.def.boss);
      return __chain(c);
    }, c);
  }
  const R0 = runs.gave, R1 = runs.kept, R2 = runs.null;
  ok('เควสต์บท 7 มี 6–8 อัน ทำจบได้ทั้งสาย (ฆ่า/เก็บ/คุย)', R0.done && !R0.stuck && R0.steps.length >= 6 && R0.steps.length <= 8, JSON.stringify(R0.steps || R0));
  ok('ฉากเล่นครบทุกฉาก (flag c7gate/c7loki/c7end/c7home)', ['c7gate', 'c7loki', 'c7end', 'c7home'].every(k => R0.st[k] && R1.st[k] && R2.st[k]), JSON.stringify(R0.st));
  ok('ทางเลือก gave: Hel ยังไม่ใช้ Core + ตอนจบวาง Core ที่บัลลังก์', /ยังไม่ได้ใช้/.test(R0.log) && /วาง Core ลงที่โคนบัลลังก์/.test(R0.log) && !/Core ยังอยู่กับเจ้า/.test(R0.log));
  ok('ทางเลือก kept: Core ยังอยู่กับผู้เล่น + ตอนจบไม่ต่อกิ่ง', /Core ยังอยู่กับเจ้า/.test(R1.log) && /ไม่ต่อกิ่ง ไม่เผา/.test(R1.log) && !/วาง Core ลงที่โคนบัลลังก์/.test(R1.log));
  ok('ไม่เคยเลือก: บทพูดของตัวเอง (ไม่พังเมื่อไม่มี flag)', /ยังไม่ได้ตัดสินใจเรื่อง Core/.test(R2.log) && /ไม่เคยมอบ Core ให้ใครเลย/.test(R2.log));
  ok('Loki: ข้อความของ Odin "ข้าให้อภัยเขา" + คำใบ้ภาค 2 (เสียงหอน/ประกายใหม่ทางเหนือ)', /ข้าให้อภัยเขา/.test(R0.log) && /เสียงหอน/.test(R0.log) && /ประกายใหม่อีกดวง/.test(R0.log));
  ok('จบภาค 1: การ์ดปิดภาค + Rolf เรียกชื่อผู้เล่น + ได้ Badge of the First Leaf', R0.splash.some(t => /ภาคที่ 1/.test(t)) && /Leaf<\/b>\.\.\. ยินดีต้อนรับกลับบ้าน/.test(R0.log) && R0.badge === 1, JSON.stringify(R0.splash));
  ok('หลังจบ: คุย Hel ไม่เล่นฉากจบซ้ำ', (R0.log.match(/ชั้นวางประกายของ Hel สว่างนิ่ง/g) || []).length === 1);
  ok('รางวัล EXP ของบทอยู่ในเส้นเดิม (< 1 เลเวลที่ Lv 62)', R0.gainedExp > 0 && R0.lv <= 64, `exp ${R0.gainedExp}, Lv ${R0.lv}`);

  // ---------- 5) เซฟเก่า (จบบท 6 แล้ว ไม่มี flag ใหม่) โหลดได้ เควสต์ถัดไป = ch7_gate ----------
  await p.evaluate(() => { saveGame = () => {}; G.started = false; const i = QUESTS.findIndex(q => q.id === 'ch7_gate');
    localStorage.setItem(SAVE_KEY, JSON.stringify({ name: 'Rooted', gender: 'f', hair: '#ccc', job: 'volva', baseLv: 60, jobLv: 20, baseExp: 0, jobExp: 0,
      stats: { str: 1, agi: 1, vit: 40, int: 60, dex: 20, luk: 1 }, statPoints: 0, skillPoints: 0, skills: {}, zeny: 1000, inventory: [], equip: {}, hotbar: [],
      map: 'roots', x: 83.5, y: 41.5, save: { map: 'eldheim', x: 20.5, y: 24.5 }, hp: 100, sp: 50, options: { sound: false }, uidSeq: 10,
      quests: { i, n: 0, done: QUESTS.slice(0, i).map(q => q.id) }, story: { prologue: 1, helMet: 1, helEnd: 1, core: 'kept' } })); });
  await p.reload(); await p.waitForTimeout(1500);
  await p.click('#au-offline'); await p.click('#btn-continue'); await p.waitForTimeout(1500);
  const old = await p.evaluate(() => ({ ok: G.started && G.player.name === 'Rooted', q: Quest.current() && Quest.current().id, ch: Quest.chapterText(), map: G.map.id,
    nav: (Quest.navTarget() || {}).npcId }));
  ok('เซฟเก่าที่จบบท 6 โหลดได้ → เควสต์ถัดไป ch7_gate (บทที่ 7) นำทางไปหา Hel', old.ok && old.q === 'ch7_gate' && /7/.test(old.ch) && old.nav === 'hel', JSON.stringify(old));

  // ---------- 6) ตะขอเรื่องราว: ตำนานมอน / การ์ดยูนิต / Brokk / Mimir Class 2 / Ancient ----------
  const hooks = await p.evaluate(async () => {
    const r = {};
    const ch6 = ['rust_sap', 'archive_warden', 'rust_mine', 'archive_maiden', 'rust_draugr', 'root_crawler', 'gnawed_stump', 'gnawed_brute', 'root_gnawer', 'garmr'];
    const ch7 = ['rust_bloom', 'hollow_shell', 'nid_spawn', 'rootbound_guard', 'rot_colossus', 'nidhogg'];
    r.noLore = Object.values(MOBS).filter(d => !d.dummy && !StoryHooks.lore(d)).map(d => d.id);
    r.ch67 = [...ch6, ...ch7].every(id => MOBS[id].lore);
    // การ์ดยูนิต: มีบรรทัดตำนาน
    changeMap('abyss', 42.5, 3.5, { quiet: true });
    const m = G.mobs.find(x => x.def.id === 'nid_spawn'); UnitCard.open({ kind: 'mob', ref: m }, 300, 300);
    r.card = !!document.querySelector('#unit-card .uc-lore') && /เกล็ด/.test(document.querySelector('#unit-card .uc-lore').textContent); UnitCard.close();
    UI.showMob('rot_colossus'); r.book = !!document.querySelector('#w-mob .mb-lore'); UI.close('w-mob');
    r.lokiRole = !!UnitCard.NPC_ROLE.loki;
    // Brokk: แท็บ Hunt Rune มีบรรทัดตำนาน
    const ft = HuntRunes.forgeTab({}, h('div'), t => h('div', {}, t), h('div'));
    r.brokk = ft.left.some(el => el && el.classList && el.classList.contains('hr-lore') && /Yggdrasil/.test(el.textContent));
    // Mimir: ปลุกแม่พิมพ์ชั้นสอง → บรรทัดของ Class นั้น (ครบ 12)
    r.job2 = Object.keys(JOBS).filter(j => JOBS[j].tier === 2 && !StoryHooks.JOB2[j]);
    const pl = G.player, log = [];
    UI.say = async (n, t) => { log.push(t); }; let pick = 0;
    UI.menu = async (n, t, o) => { log.push(t); return pick++ === 0 ? 0 : 0; };
    pl.job = 'volva'; pl.baseLv = 60; pl.jobLv = 26; pl.quests.done.push('mvp1'); Story.st().mimirTruth = 1;
    NPC.busy = false; await NPC.talk({ id: 'jobmaster', name: 'Mimir AI', x: 17, y: 15 });
    r.job2Now = pl.job; r.job2Tier = JOBS[pl.job].tier; r.job2Line = log.some(t => t.includes(StoryHooks.JOB2[pl.job] || '@@'));
    r.ancient = ['mistlake', 'helcave', 'roots', 'abyss'].every(mp => StoryHooks.ancientLine(mp));
    r.garmrMvp = !!(Story.MVP.garmr && Story.MAP_LINES.roots && Story.MAP_LINES.archive);
    return r;
  });
  ok('ตำนานมอน: มอนบท 6/7 มีครบ และมอนทุกตัว (รวมลูกสมุน/Ancient) มีบรรทัดตำนาน', hooks.ch67 && !hooks.noLore.length, hooks.noLore.join(','));
  ok('การ์ดยูนิต + สมุดมอนสเตอร์ แสดงบรรทัดตำนาน', hooks.card && hooks.book && hooks.lokiRole, JSON.stringify(hooks));
  ok('เตาของ Brokk แท็บ Hunt Rune: เล่าว่ารูนตัดจากเปลือก Yggdrasil', hooks.brokk);
  ok('Mimir: บรรทัดหลังปลุก Class 2 ครบ 12 Class และขึ้นจริงตอนอัปเกรด', !hooks.job2.length && hooks.job2Tier === 2 && hooks.job2Line, JSON.stringify({ missing: hooks.job2, now: hooks.job2Now }));
  ok('Ancient ทุกตัวมีตำนานตอนตื่น + ฉาก MVP Garmr/บรรทัดแผนที่บท 6', hooks.ancient && hooks.garmrMvp);
  ok('ไม่มี error', !errs.length, errs.join(' | '));
  await b.close(); if (srv) srv.close();
  console.log(fail ? `${fail} FAILED, ${pass} passed` : `ALL ${pass} PASSED`);
  process.exit(fail ? 1 : 0);
})();
