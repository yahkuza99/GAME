'use strict';
// ============================================================
//  ทดสอบ Battle Script (js/botscript.js) ด้วย Playwright:
//  ค่าเริ่มต้น = บอทเดิมทุกอย่าง • ทุกเงื่อนไข/การกระทำ • ส่งออก/นำเข้าโค้ด • ปฏิเสธโค้ดอันตราย
//  • สคริปต์ตัวอย่าง "AoE เมื่อรุม ≥3 / ฮีลเมื่อเพื่อน < 40% / บัฟเมื่อเจอบอส" ทำงานจริงในการจำลอง
//  รัน:  NODE_PATH=$(npm root -g) node tests/botscript.js   (เปิดเซิร์ฟเวอร์เอง)
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

(async () => {
  const srv = await serve();
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  else if (fs.existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(opts);
  const p = await (await browser.newContext({ viewport: { width: 1100, height: 680 } })).newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(`http://localhost:${srv.address().port}/index.html`); await p.waitForTimeout(1200);
  await p.click('#au-offline'); await p.click('#btn-new'); await p.fill('#cr-name', 'BotScript'); await p.click('#cr-start'); await p.waitForTimeout(1500);
  await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {});

  const checks = await p.evaluate(() => {
    const out = [];
    const ok = (name, cond, info = '') => out.push([name, !!cond, info]);
    const pl = G.player, BS = BotScript;
    // สุ่มแบบกำหนดเมล็ด (ใช้เทียบ "บอทเดิม" กับ "เปิดสคริปต์แต่ไม่มีกฎไหนทำงาน" ให้ได้ผลเหมือนกันทุกเฟรม)
    const realRandom = Math.random;
    const seed = s => { Math.random = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    const setup = (job, plan) => {
      document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden'));
      Bot.toggle(false);
      Party.party = null;
      const j1 = JOBS[job].parent || job;
      pl.dead = false; pl.job = job; pl.baseLv = 40; pl.jobLv = JOBS[job].jobMax; pl.skills = {}; pl.buffs = {}; pl.cds = {}; pl.skillReadyAt = 0; pl.cast = null; pl.stunUntil = 0;
      pl.skillIntent = null; pl.nextAttack = 0; pl.itemReadyAt = 0; pl.autoPotAt = 0; pl.hpTimer = 0; pl.spTimer = 0; pl.sitting = false; pl.path = []; pl.target = null; pl.pickTarget = null;
      for (let j = job; j; j = JOBS[j].parent) for (const id of JOBS[j].skills) if (SKILLS[id] && !SKILLS[id].noLearn) pl.skills[id] = SKILLS[id].max;
      const st = { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 }; st[plan[0]] = 55; st[plan[1]] = 30; pl.stats = st;
      unequipInvalid(); if (!pl.inventory.find(e => e.id === JOB_STARTER[j1])) addItem(JOB_STARTER[j1], 1, true);
      equipItem(pl.inventory.find(e => e.id === JOB_STARTER[j1]), true);
      changeMap('wolfwood', 28.5, 28.5);
      let spot = null;
      for (let r = 0; r < 20 && !spot; r++) for (let y = 28 - r; y <= 28 + r && !spot; y++) for (let x = 28 - r; x <= 28 + r && !spot; x++) {
        let open = true;
        for (let dy = -6; dy <= 6 && open; dy++) for (let dx = -6; dx <= 6 && open; dx++) if (!G.map.walkable(x + dx, y + dy)) open = false;
        if (open && !G.map.portals.some(q => U.dist(q.x, q.y, x, y) < 12)) spot = { x, y };
      }
      teleportPlayer(spot.x + 0.5, spot.y + 0.5);
      G.mobs = []; G.drops = []; G.allies = []; G.traps = []; G.respawns = []; G.timers = []; G.fx = [];
      recalc(); pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp;
      const c = Bot.cfg(); c.style = 'skills'; c.leash = false; c.skills = {}; c.skillHp = {}; c.skipMobs = {}; c.rest = true; c.useBuffs = true; c.healAt = 60; c.restHp = 35; c.restSp = 10; c.avoidMvp = true; c.radius = 14;
      c.adv = false; BS.setRules(c, []); BS.restIdx = -1;
      autoPotCfg().on = false; // ทดสอบยาด้วยกฎ ไม่ให้ระบบปั๊มยากินตัดหน้า
      Bot.toggle(true); Bot.nextThink = 0; Bot.wanderAt = 0; Bot.lastX = pl.x; Bot.lastY = pl.y;
      return c;
    };
    const mob = (id, dx, dy, chase) => { const m = spawnMob(id, { x: Math.floor(pl.x) + dx, y: Math.floor(pl.y) + dy }); m.nextWander = 1e9; if (chase) { m.state = 'chase'; m.nextAtk = G.time + 99; } return m; };
    const think = () => { Bot.nextThink = 0; Bot.update(); };
    const ready = () => { pl.skillReadyAt = 0; pl.cast = null; pl.skillIntent = null; };
    const run = sec => { for (let i = 0; i < sec * 15; i++) updateGame(1 / 15); };
    const R = (cs, a, on = true) => ({ on, c: cs, a });
    const b64 = s => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const ally = (hp, dx = 2, dy = 0) => {
      Party.party = { id: 'pt_test', name: 'Test', since: 1, members: new Map([['ally1', { id: 'ally1', name: 'Ally', job: 'volva', lv: 40, hp, maxHp: 100, sp: 50, maxSp: 50,
        map: G.map.id, x: pl.x + dx, y: pl.y + dy, dead: false, since: 2, seen: performance.now() }]]) };
      return Party.party.members.get('ally1');
    };

    // ---------------- 1) ค่าเริ่มต้น = บอทเดิม ----------------
    {
      const c = Bot.cfg();
      const old = { restHp: 35, restSp: 10, healAt: 60, style: 'skills', skills: {} }; // เซฟเก่า: ไม่มี adv/script/presets
      BS.normalize(old);
      ok('old save loads: adv off, empty script, 3 empty presets', old.adv === false && Array.isArray(old.script) && !old.script.length && old.presets.length === 3 && old.presets.every(x => x === null));
      const junk = { adv: 'yes', script: 'x', presets: [123, '1:A=N', { a: 1 }, '1:A=N'] };
      BS.normalize(junk);
      ok('corrupt save cleaned', junk.adv === false && Array.isArray(junk.script) && junk.presets.length === 3 && junk.presets[0] === null && junk.presets[1] === '1:A=N' && junk.presets[2] === null);
      ok('no script → inactive', !BS.active(c));
    }
    // จำลอง 20 วิ แล้วจดสถานะทุก 0.2 วิ — 3 แบบต้องได้ผลเท่ากันทุกเฟรม
    const SNAP = ['baseExp', 'jobExp', 'inventory', 'equip', 'kills', 'chips', 'mastery', 'bounty', 'daily', 'quests', 'zeny', 'passives', 'mvpAt', 'statPoints', 'skillPoints'];
    let snap = null;
    const trace = (job, plan, variant) => {
      // เวลาเกมและการสุ่มเริ่มเท่ากันทุกแบบ • fastSim = ปิดเอฟเฟกต์ภาพที่สุ่มตามเวลาจริง (แบบเดียวกับตอนบอทจำลองย้อนหลัง)
      G.time = 5000; seed(1234); G.fastSim = true;
      const c = setup(job, plan);
      // สถานะที่สะสมข้ามรอบ (ความชำนาญสกิล ชิป EXP ของที่เก็บได้) ต้องเริ่มเท่ากันทุกแบบ
      if (variant === 'off') snap = JSON.stringify(SNAP.map(k => pl[k]));
      else JSON.parse(snap).forEach((v, i) => { pl[SNAP[i]] = v; });
      recalc(); pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp;
      if (variant === 'empty') { c.adv = true; BS.setRules(c, []); }
      if (variant === 'idle') { // เปิดสคริปต์ มีกฎ แต่ไม่มีกฎไหนทำงาน (ไม่มีบอส / ปิดกฎ / สกิลที่ยังไม่เรียน)
        c.adv = true;
        BS.setRules(c, [R([{ t: 'boss' }], { t: 'skip' }), R([{ t: 'always' }], { t: 'basic' }, false), R([{ t: 'hp', op: '<', v: 1 }], { t: 'pot', v: 'hp' }), R([{ t: 'party', v: 99 }], { t: 'rest' }),
          R([{ t: 'always' }], { t: 'skill', v: Object.keys(SKILLS).find(id => BS.isActive(id) && !pl.skills[id]) })]); // ตรงเงื่อนไขแต่ทำไม่ได้ (ยังไม่เรียน)
      }
      seed(99); Bot.toggle(false); Bot.toggle(true); Bot.nextThink = 0;
      const ms = [mob('ashtail', 3, 0), mob('ashtail', -4, 2), mob('fenrir_pup', 0, -5, true), mob('ashtail', 6, 4)];
      const tr = [];
      for (let i = 0; i < 20 * 15; i++) {
        updateGame(1 / 15);
        if (i % 3 === 0) tr.push([pl.x.toFixed(3), pl.y.toFixed(3), Math.round(pl.hp), Math.round(pl.sp), ms.indexOf(Bot.tgt), Object.keys(pl.cds).sort().join(), Object.keys(pl.buffs).sort().join(), Bot.resting ? 1 : 0, ms.map(m => m.hp).join()].join('|'));
      }
      Math.random = realRandom; G.fastSim = false;
      return { tr, kills: Bot.stats.kills };
    };
    for (const [job, plan] of [['berserker', ['str', 'agi']], ['runecaster', ['int', 'dex']], ['volva', ['int', 'vit']]]) {
      const a = trace(job, plan, 'off'), a2 = trace(job, plan, 'again'), b = trace(job, plan, 'empty'), d = trace(job, plan, 'idle');
      { const i = a.tr.findIndex((v, k) => v !== a2.tr[k]); ok(`${job}: baseline sim is reproducible (old bot twice)`, i < 0, i >= 0 ? `frame ${i}: ${a.tr[i]} vs ${a2.tr[i]}` : ''); }
      const diff = (x, y) => { const i = x.tr.findIndex((v, k) => v !== y.tr[k]); return i < 0 ? -1 : i; };
      ok(`${job}: baseline sim fights`, a.tr.length === 100 && a.kills > 0, `kills ${a.kills}`);
      ok(`${job}: advanced mode with no rules = old bot`, diff(a, b) < 0, diff(a, b) >= 0 ? `frame ${diff(a, b)}: ${a.tr[diff(a, b)]} vs ${b.tr[diff(a, b)]}` : '');
      ok(`${job}: rules that never act = old bot (frame-exact)`, diff(a, d) < 0, diff(a, d) >= 0 ? `frame ${diff(a, d)}: ${a.tr[diff(a, d)]} vs ${d.tr[diff(a, d)]}` : '');
    }
    {
      const c = setup('volva', ['int', 'vit']);
      const t = BS.template(c);
      const has = (ct, at, v) => t.some(r => r.c[0].t === ct && r.a.t === at && (v == null || r.a.v === v));
      ok('template from settings: heal / rest / buff', has('hp', 'skill', 'light_of_freyja') && has('hp', 'rest') && has('nobuff', 'skill', 'blessing_of_odin') && t.every(r => BS.cleanRule(r)), t.map(r => BS.toText([r]).slice(2)).join(' '));
      c.style = 'basic';
      ok('template: basic style → "always → basic attack" last', BS.template(c).slice(-1)[0].a.t === 'basic');
    }

    // ---------------- 2) ทุกเงื่อนไข ----------------
    {
      setup('valkyrie', ['str', 'vit']);
      const m1 = mob('ashtail', 1, 0, true); mob('ashtail', 0, 1); mob('ashtail', 2, 2);
      const cd = (k, t, hp = 50, sp = 50) => BS.cond(BS.cleanCond(k), t, hp, sp);
      ok('cond always', cd({ t: 'always' }, null));
      ok('cond my HP below/above', cd({ t: 'hp', op: '<', v: 40 }, null, 30) && !cd({ t: 'hp', op: '<', v: 40 }, null, 50) && cd({ t: 'hp', op: '>', v: 40 }, null, 50) && !cd({ t: 'hp', op: '>', v: 40 }, null, 30));
      ok('cond my SP below/above', cd({ t: 'sp', op: '<', v: 20 }, null, 50, 10) && !cd({ t: 'sp', op: '<', v: 20 }, null, 50, 30) && cd({ t: 'sp', op: '>', v: 80 }, null, 50, 90));
      m1.isMvp = false;
      ok('cond target is boss/MVP', !cd({ t: 'boss' }, m1) && !cd({ t: 'boss' }, null) && (m1.isMvp = true, cd({ t: 'boss' }, m1)));
      m1.isMvp = false;
      m1.hp = m1.maxHp * 0.2;
      ok('cond target HP below', cd({ t: 'thp', v: 30 }, m1) && !cd({ t: 'thp', v: 10 }, m1) && !cd({ t: 'thp', v: 30 }, null));
      ok('cond mobs within N ≥ K', cd({ t: 'mobs', n: 3, k: 3 }, null) && !cd({ t: 'mobs', n: 3, k: 4 }, null) && cd({ t: 'mobs', n: 1.5, k: 2 }, null) && !cd({ t: 'mobs', n: 1, k: 3 }, null));
      ok('cond party member HP below (no party = false)', !cd({ t: 'party', v: 40 }, null));
      const al = ally(30);
      BS._pv = false;
      const p1 = cd({ t: 'party', v: 40 }, null); BS._pv = false;
      const p2 = cd({ t: 'party', v: 20 }, null); BS._pv = false;
      al.map = 'meadow'; const p3 = cd({ t: 'party', v: 40 }, null); BS._pv = false;
      al.map = G.map.id; al.dead = true; const p4 = cd({ t: 'party', v: 40 }, null); BS._pv = false;
      Party.party = null;
      ok('cond party member HP < X (same map, alive)', p1 && !p2 && !p3 && !p4, [p1, p2, p3, p4].join());
      pl.buffs = {};
      const b1 = cd({ t: 'nobuff', v: 'einherjar_guard' }, null);
      pl.buffs.einherjar_guard = { lv: 5, until: G.time + 30 }; const b2 = cd({ t: 'nobuff', v: 'einherjar_guard' }, null);
      pl.buffs.einherjar_guard.until = G.time + 3; const b3 = cd({ t: 'nobuff', v: 'einherjar_guard' }, null);
      pl.buffs = {};
      ok('cond buff X not active (or ≤5s left)', b1 && !b2 && b3);
      ok('cond target element', cd({ t: 'elem', v: m1.def.element }, m1) && !cd({ t: 'elem', v: m1.def.element === 'fire' ? 'water' : 'fire' }, m1) && !cd({ t: 'elem', v: 'fire' }, null), m1.def.element);
      ok('cond target race', cd({ t: 'race', v: m1.def.race }, m1) && !cd({ t: 'race', v: m1.def.race === 'undead' ? 'plant' : 'undead' }, m1), m1.def.race);
      ok('two conditions = AND', BS.match([BS.cleanCond({ t: 'always' }), BS.cleanCond({ t: 'hp', op: '<', v: 40 })], null, 30, 50) && !BS.match([BS.cleanCond({ t: 'always' }), BS.cleanCond({ t: 'hp', op: '<', v: 40 })], null, 60, 50));
    }

    // ---------------- 3) ทุกการกระทำ (ผ่าน Bot.update จริง) ----------------
    {
      // ใช้สกิล (บัฟใส่ตัว) — แม้ปิดสกิลนั้นในค่าตั้งแบบง่าย
      let c = setup('valkyrie', ['str', 'vit']);
      c.useBuffs = false; c.skills.einherjar_guard = false; c.adv = true;
      BS.setRules(c, [R([{ t: 'nobuff', v: 'einherjar_guard' }], { t: 'skill', v: 'einherjar_guard' })]);
      think();
      ok('action: use skill (self buff, even if unticked in simple settings)', !!pl.buffs.einherjar_guard);
      // ใช้สกิลใส่ศัตรู
      c = setup('valkyrie', ['str', 'vit']); c.adv = true;
      const e1 = mob('ashtail', 2, 0, true);
      BS.setRules(c, [R([{ t: 'always' }], { t: 'skill', v: 'shield_slam' })]);
      think();
      ok('action: use skill on enemy', (pl.cds.shield_slam > G.time || e1.hp < e1.maxHp || (pl.skillIntent && pl.skillIntent.id === 'shield_slam')) && Bot.tgt === e1);
      // สกิลยังไม่พร้อม → ข้ามไปกฎถัดไป
      c = setup('valkyrie', ['str', 'vit']); c.adv = true;
      const e2 = mob('ashtail', 4, 0);
      pl.cds.judgment_quake = G.time + 30;
      BS.setRules(c, [R([{ t: 'always' }], { t: 'skill', v: 'judgment_quake' }), R([{ t: 'always' }], { t: 'basic' })]);
      think();
      ok('skill on cooldown → falls through to next rule', BS.lastRule === 1 && pl.target === e2 && Bot.tgt === e2);
      // ดื่มยา HP / SP
      c = setup('valkyrie', ['str', 'vit']); c.adv = true;
      addItem('red_potion', 5, true); addItem('blue_potion', 5, true);
      BS.setRules(c, [R([{ t: 'hp', op: '<', v: 50 }], { t: 'pot', v: 'hp' }), R([{ t: 'sp', op: '<', v: 50 }], { t: 'pot', v: 'sp' })]);
      pl.hp = pl.d.maxHp * 0.3; pl.sp = pl.d.maxSp;
      const hpPots = () => HP_POTS.reduce((a, id) => a + countItem(id), 0);
      let n0 = hpPots(), h0 = pl.hp;
      think();
      ok('action: drink HP potion', hpPots() === n0 - 1 && pl.hp > h0, `${n0} → ${hpPots()}`);
      pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp * 0.2; pl.itemReadyAt = 0;
      const spPots = () => SP_POTS.reduce((a, id) => a + countItem(id), 0);
      n0 = spPots();
      think();
      ok('action: drink SP potion', spPots() === n0 - 1);
      // ถอยห่าง
      c = setup('valkyrie', ['str', 'vit']); c.adv = true;
      const k1 = mob('mossback', 1, 0, true); k1.x = pl.x + 1; k1.y = pl.y;
      BS.setRules(c, [R([{ t: 'always' }], { t: 'kite' })]);
      think();
      const d0 = U.dist(pl.x, pl.y, k1.x, k1.y);
      ok('action: retreat starts a path away', Bot.kiteUntil > G.time && pl.path.length > 0 && !pl.target, `kite ${(Bot.kiteUntil - G.time).toFixed(2)} path ${pl.path.length} tgt ${!!pl.target} rule ${BS.lastRule} kiteAt ${(Bot.kiteAt - G.time).toFixed(2)} thr ${G.mobs.filter(m => m.state === 'chase').length}`);
      for (let i = 0; i < 12; i++) { k1.stunUntil = G.time + 1; updateGame(1 / 15); }
      ok('action: retreat gains distance', U.dist(pl.x, pl.y, k1.x, k1.y) > d0 + 1.5, U.dist(pl.x, pl.y, k1.x, k1.y).toFixed(1));
      // เปลี่ยนเป้า: ใกล้สุด / HP ต่ำสุด / ตัวที่ประชิดเพื่อน
      c = setup('valkyrie', ['str', 'vit']); c.adv = true;
      const tFar = mob('ashtail', 6, 0), tNear = mob('ashtail', 2, 0), tLow = mob('ashtail', -5, 0), tAlly = mob('ashtail', 0, 7);
      tLow.hp = 5;
      Bot.setTgt(tFar);
      BS.setRules(c, [R([{ t: 'always' }], { t: 'target', v: 'near' })]);
      think();
      ok('action: switch target → nearest', Bot.tgt === tNear);
      BS.setRules(c, [R([{ t: 'always' }], { t: 'target', v: 'low' })]);
      think();
      ok('action: switch target → lowest HP', Bot.tgt === tLow);
      ally(80, 0, 8);
      BS.setRules(c, [R([{ t: 'always' }], { t: 'target', v: 'party' })]);
      think();
      ok('action: switch target → mob next to a party member', Bot.tgt === tAlly);
      // เป้าเดิมแล้ว = ไม่กินรอบคิด (ให้กฎถัดไปทำ)
      BS.setRules(c, [R([{ t: 'always' }], { t: 'target', v: 'party' }), R([{ t: 'always' }], { t: 'basic' })]);
      think();
      ok('switch target already on it → next rule acts', BS.lastRule === 1 && pl.target === tAlly);
      Party.party = null;
      // นั่งพัก: นั่งค้างจนฟื้น • กฎที่อยู่สูงกว่าขัดได้ • กฎที่ต่ำกว่าขัดไม่ได้ • โดนตีแล้วลุก
      c = setup('volva', ['int', 'vit']); c.adv = true; c.rest = false; c.healAt = 0;
      BS.setRules(c, [R([{ t: 'hp', op: '<', v: 10 }], { t: 'skill', v: 'light_of_freyja' }), R([{ t: 'hp', op: '<', v: 50 }], { t: 'rest' }), R([{ t: 'always' }], { t: 'basic' })]);
      mob('ashtail', 9, 0);
      pl.hp = pl.d.maxHp * 0.4;
      think();
      const sat = Bot.resting && pl.sitting && BS.restIdx === 1;
      pl.hp = pl.d.maxHp * 0.6; // เกินเงื่อนไขกฎพักแล้ว แต่ยังไม่ฟื้นพอ → นั่งต่อ (กฎ "ตีปกติ" ด้านล่างขัดไม่ได้)
      think();
      const stay = Bot.resting && pl.sitting && !pl.target;
      pl.hp = pl.d.maxHp * 0.05; ready();
      think();
      const healed = !!pl.cds.light_of_freyja || pl.cast || pl.hp > pl.d.maxHp * 0.05;
      ok('action: rest sits', sat);
      ok('rest continues until recovered (lower rules cannot interrupt)', stay);
      ok('higher rule interrupts rest', healed && BS.restIdx < 0 && !pl.sitting);
      pl.hp = pl.d.maxHp * 0.4; ready(); think();
      const re = Bot.resting;
      const at = mob('ashtail', 1, 1, true);
      think();
      ok('rest: stand up when attacked', re && !Bot.resting && !pl.sitting && BS.restIdx < 0 && Bot.tgt === at);
      // ข้ามเป้านี้
      c = setup('valkyrie', ['str', 'vit']); c.adv = true;
      const s1 = mob('ashtail', 3, 0); mob('ashtail', -4, 0);
      Bot.setTgt(s1);
      BS.setRules(c, [R([{ t: 'always' }], { t: 'skip' })]);
      think();
      ok('action: skip this target (blacklisted)', Bot.blacklist.has(s1) && Bot.tgt !== s1);
      // ตีปกติ: คุมเองทั้งหมด → ไม่ใช้สกิลเลย
      const basicInfo = [];
      let basicOk = true;
      for (const [dx, dy] of [[3, 0], [-3, 2], [0, -4]]) {
        c = setup('berserker', ['str', 'agi']); c.adv = true;
        BS.setRules(c, [R([{ t: 'always' }], { t: 'basic' })]);
        const b1 = mob('ashtail', dx, dy), b2 = mob('ashtail', dx + 1, dy + 1);
        b1.hp = b1.maxHp = 3000; b2.hp = b2.maxHp = 3000;
        run(6);
        const good = !Object.keys(pl.cds).length && !Object.keys(pl.buffs).length && (b1.hp < 3000 || b2.hp < 3000);
        basicOk = basicOk && good;
        basicInfo.push(`${b1.hp}/${b2.hp}${good ? '' : ` cds ${Object.keys(pl.cds)} buffs ${Object.keys(pl.buffs)}`}`);
      }
      ok('action: basic attack only (no skills, no buffs)', basicOk, basicInfo.join(' • '));
    }

    // ---------------- 4) ส่งออก / นำเข้า ----------------
    {
      const c = setup('valkyrie', ['str', 'vit']);
      const all = [
        R([{ t: 'mobs', n: 3, k: 3 }], { t: 'skill', v: 'judgment_quake' }),
        R([{ t: 'party', v: 40 }], { t: 'skill', v: 'valhallas_call' }),
        R([{ t: 'boss' }, { t: 'nobuff', v: 'einherjar_guard' }], { t: 'skill', v: 'einherjar_guard' }),
        R([{ t: 'hp', op: '<', v: 25 }], { t: 'pot', v: 'hp' }), R([{ t: 'sp', op: '>', v: 80 }, { t: 'thp', v: 30 }], { t: 'pot', v: 'sp' }, false),
        R([{ t: 'elem', v: 'fire' }], { t: 'kite' }), R([{ t: 'race', v: 'undead' }], { t: 'target', v: 'low' }), R([{ t: 'always' }], { t: 'target', v: 'party' }),
        R([{ t: 'hp', op: '>', v: 90 }], { t: 'target', v: 'near' }), R([{ t: 'sp', op: '<', v: 10 }], { t: 'rest' }), R([{ t: 'boss' }], { t: 'skip' }), R([{ t: 'always' }], { t: 'basic' }),
      ];
      BS.setRules(c, all);
      const code = BS.exportCode(c.script);
      const back = BS.importCode(code);
      ok('export: IV-SCRIPT:<base64url>', /^IV-SCRIPT:[A-Za-z0-9_-]+$/.test(code), `${code.length} chars`);
      ok('export → import round trip (12 rules, every type)', !back.err && back.dropped === 0 && JSON.stringify(back.rules) === JSON.stringify(c.script), back.err ? back.err + ' ' + BS.toText(c.script) : '');
      ok('round trip keeps disabled rules', back.rules && back.rules[4] && back.rules[4].on === false);
      ok('code is short', code.length < 300, code.length);
      // ชุดที่บันทึกไว้ + เซฟ/โหลด
      c.presets[1] = BS.toText(c.script);
      const saved = JSON.parse(JSON.stringify(c));
      BS.normalize(saved);
      ok('save/load keeps script & presets', JSON.stringify(saved.script) === JSON.stringify(c.script) && saved.presets[1] === c.presets[1] && saved.presets[0] === null);
      ok('preset parses back', JSON.stringify(BS.parseText(saved.presets[1]).rules) === JSON.stringify(c.script));
      // ขอบเขตตัวเลขถูกบีบ
      const cl = BS.importCode('IV-SCRIPT:' + b64('1:h<999&m99.99=N;t0=X'));
      ok('numbers clamped', !cl.err && cl.rules[0].c[0].v === 100 && cl.rules[0].c[1].n === 15 && cl.rules[0].c[1].k === 20 && cl.rules[1].c[0].v === 0, JSON.stringify(cl.rules || cl.err));
      // สกิลที่ไม่รู้จัก: ข้ามกฎนั้น ที่เหลือใช้ได้
      const unk = BS.importCode('IV-SCRIPT:' + b64('1:A=sno_such_skill;fnot_a_buff=N;A=N;eplasma=K'));
      ok('unknown skills/data ignored (rule dropped)', !unk.err && unk.rules.length === 1 && unk.dropped === 3, JSON.stringify(unk));
      const many = BS.importCode('IV-SCRIPT:' + b64('1:' + Array(20).fill('A=N').join(';')));
      ok('more than 12 rules → first 12 kept', !many.err && many.rules.length === 12 && many.dropped === 8);
    }

    // ---------------- 5) โค้ดอันตราย / ผิดรูปแบบ ----------------
    {
      const realEval = window.eval, RealFunction = window.Function;
      let evals = 0;
      window.eval = function () { evals++; return realEval.apply(this, arguments); };
      window.Function = function () { evals++; return RealFunction.apply(this, arguments); };
      const bad = {
        'wrong prefix': 'iv-script:' + b64('1:A=N'),
        'no prefix': b64('1:A=N'),
        'not base64': 'IV-SCRIPT:<script>alert(1)</script>',
        'json payload': 'IV-SCRIPT:' + b64(JSON.stringify([{ on: true, c: [{ t: 'always' }], a: { t: 'basic' } }])),
        'js payload': 'IV-SCRIPT:' + b64('1:A=N;alert(document.cookie)'),
        'eval-ish action': 'IV-SCRIPT:' + b64('1:A=seval(1)'),
        '__proto__ skill': 'IV-SCRIPT:' + b64('1:A=s__proto__'),
        'unknown condition type': 'IV-SCRIPT:' + b64('1:Z=N'),
        'unknown action type': 'IV-SCRIPT:' + b64('1:A=Q'),
        'three conditions': 'IV-SCRIPT:' + b64('1:A&B&A=N'),
        'wrong version': 'IV-SCRIPT:' + b64('9:A=N'),
        'non-ascii': 'IV-SCRIPT:' + b64(unescape(encodeURIComponent('1:A=N;ก=N'))),
        'control chars': 'IV-SCRIPT:' + b64('1:A=N\n;A=N'),
        'too long': 'IV-SCRIPT:' + 'A'.repeat(5000),
        'bad padding': 'IV-SCRIPT:A',
        'empty rule part': 'IV-SCRIPT:' + b64('1:A=N;;A=N'),
        'number too long': 'IV-SCRIPT:' + b64('1:h<99999=N'),
        'non-string': 12345,
      };
      const fails = [];
      for (const [k, v] of Object.entries(bad)) { const r = BS.importCode(v); if (!r.err) fails.push(k); }
      ok('malicious / malformed codes rejected', !fails.length, fails.join(', '));
      const proto = BS.importCode('IV-SCRIPT:' + b64('1:A=sconstructor;fconstructor=N;econstructor=K;rconstructor=X'));
      ok('prototype names never treated as skills', !proto.err && proto.rules.length === 0 && proto.dropped === 4 && ({}).polluted === undefined);
      ok('import never evals', evals === 0, evals);
      window.eval = realEval; window.Function = RealFunction;
      // ข้อมูลเสียในเซฟ (แก้มือ) ก็ถูกกรอง
      const c = Bot.cfg();
      c.adv = true; c.script = [{ on: true, c: [{ t: 'always' }], a: { t: 'skill', v: '__proto__' } }, { on: true, c: [{ t: 'eval', v: 'x' }], a: { t: 'basic' } }, { on: 1, c: [{ t: 'hp', op: '<', v: '40' }], a: { t: 'basic' } }];
      BS.active(c);
      ok('hand-edited save sanitized', c.script.length === 1 && c.script[0].c[0].v === 40 && c.script[0].on === true);
      c.adv = false; BS.setRules(c, []);
    }

    // ---------------- 6) สคริปต์ตัวอย่าง: AoE เมื่อรุม ≥3 • ฮีลเมื่อเพื่อน < 40% • บัฟเมื่อเจอบอส ----------------
    {
      const sample = [
        R([{ t: 'mobs', n: 3, k: 3 }], { t: 'skill', v: 'judgment_quake' }),
        R([{ t: 'party', v: 40 }], { t: 'skill', v: 'valhallas_call' }),
        R([{ t: 'boss' }, { t: 'nobuff', v: 'einherjar_guard' }], { t: 'skill', v: 'einherjar_guard' }),
      ];
      const fresh = () => {
        const c = setup('valkyrie', ['str', 'vit']);
        c.adv = true; c.useBuffs = false; c.healAt = 0; c.avoidMvp = false;
        // ปิดทั้ง 3 สกิลในค่าตั้งแบบง่าย → ถ้าใช้ แปลว่ามาจากกฎเท่านั้น
        c.skills.judgment_quake = false; c.skills.valhallas_call = false; c.skills.einherjar_guard = false;
        BS.setRules(c, sample);
        return c;
      };
      const used = {};
      const realExec = window.executeSkill;
      window.executeSkill = function (id) { used[id] = (used[id] || 0) + 1; return realExec.apply(this, arguments); };
      // AoE: 2 ตัวไม่ใช้ • 3 ตัวใช้
      fresh();
      mob('ashtail', 1, 0, true); mob('ashtail', 0, 1, true);
      for (let i = 0; i < 5; i++) { ready(); think(); }
      const noQuake2 = !used.judgment_quake;
      mob('ashtail', -1, 0, true);
      ready(); think();
      ok('sample: AoE not used with 2 mobs', noQuake2);
      ok('sample: AoE used when ≥3 mobs around', used.judgment_quake === 1, JSON.stringify(used));
      // ฮีล: เพื่อน 80% ไม่ใช้ • เพื่อน 30% ใช้
      fresh();
      const al = ally(80);
      for (let i = 0; i < 3; i++) { ready(); think(); }
      const noHeal = !used.valhallas_call;
      al.hp = 30; al.seen = performance.now(); ready(); think();
      ok('sample: no heal while party member is healthy', noHeal);
      ok('sample: heal when a party member < 40%', used.valhallas_call === 1, JSON.stringify(used));
      Party.party = null;
      // บัฟ: เป้าธรรมดาไม่ใช้ • เป้าเป็นบอสใช้ • มีบัฟแล้วไม่ใช้ซ้ำ
      fresh();
      const norm = mob('ashtail', 2, 0, true);
      for (let i = 0; i < 3; i++) { ready(); think(); }
      const noBuff = !pl.buffs.einherjar_guard;
      norm.dead = true; G.mobs = G.mobs.filter(m => m !== norm); Bot.tgt = null;
      const boss = mob('seraph_pudding', 3, 0, true); boss.isMvp = true;
      ready(); think();
      const buffed = !!pl.buffs.einherjar_guard;
      const g0 = used.einherjar_guard;
      for (let i = 0; i < 3; i++) { ready(); think(); }
      ok('sample: no boss buff on a normal mob', noBuff);
      ok('sample: buff cast when the target is a boss', buffed, JSON.stringify(used));
      ok('sample: buff not recast while active', used.einherjar_guard === g0);
      // จำลองรวม 30 วิ: บอส + ลูกน้อง 3 ตัว + เพื่อนเลือดน้อย → ทั้งสามกฎทำงานจริง
      for (const k in used) delete used[k];
      fresh();
      const al2 = ally(30, -2, 0);
      const bb = mob('seraph_pudding', 2, 0, true); bb.isMvp = true;
      for (const [dx, dy] of [[1, 1], [-1, 1], [0, -1]]) { const m = mob('ashtail', dx, dy, true); m.hp = m.maxHp = 4000; }
      let buffSeen = false;
      for (let i = 0; i < 30 * 15; i++) {
        for (const m of G.mobs) m.nextAtk = G.time + 99; // ไม่ให้ตาย (ทดสอบการตัดสินใจ ไม่ใช่ความทน)
        al2.seen = performance.now(); pl.sp = pl.d.maxSp; // SP ไม่จำกัด: ทดสอบการตัดสินใจ
        updateGame(1 / 15);
        if (pl.buffs.einherjar_guard) buffSeen = true;
      }
      Party.party = null;
      window.executeSkill = realExec;
      ok('sample sim (30s): AoE used repeatedly', (used.judgment_quake || 0) >= 2, JSON.stringify(used));
      ok('sample sim (30s): party heal used', (used.valhallas_call || 0) >= 1);
      ok('sample sim (30s): boss buff kept up', (used.einherjar_guard || 0) >= 1 && buffSeen);
      ok('sample sim: boss took damage', bb.hp < bb.maxHp, `${bb.hp}/${bb.maxHp}`);
    }

    // ---------------- 7) หน้าตั้งกฎ ----------------
    {
      const c = setup('valkyrie', ['str', 'vit']);
      Bot.toggle(false);
      c.adv = false;
      UI.open ? UI.open('w-bot') : document.getElementById('w-bot').classList.remove('hidden');
      UI.renderBot(true);
      const body = document.querySelector('#w-bot .win-body');
      const off = !!body.querySelector('.bs .bs-adv') && !body.querySelector('.bs-list');
      c.adv = true; BS.setRules(c, [R([{ t: 'boss' }, { t: 'nobuff', v: 'einherjar_guard' }], { t: 'skill', v: 'einherjar_guard' }), R([{ t: 'always' }], { t: 'basic' })]);
      UI.renderBot(true);
      const cards = body.querySelectorAll('.bs-rule');
      ok('editor: collapsed when off, rule cards when on', off && cards.length === 2);
      // ลำดับ: กด ▼ ที่กฎแรก
      const down = [...cards[0].querySelectorAll('.bs-ib')].find(b => b.textContent === '▼');
      down.click();
      ok('editor: move rule down', c.script[0].a.t === 'basic' && c.script[1].a.t === 'skill');
      body.querySelector('.bs-rule .bs-on').click();
      ok('editor: toggle rule off', c.script[0].on === false);
      const add = [...body.querySelectorAll('.bs-tools .btn')].find(b => /เพิ่มกฎ|Add rule/.test(b.textContent));
      for (let i = 0; i < 15; i++) { const b = [...document.querySelectorAll('#w-bot .bs-tools .btn')].find(x => /เพิ่มกฎ|Add rule|ครบ|max/.test(x.textContent)); b.click(); }
      ok('editor: max 12 rules', c.script.length === 12 && !!add);
      // เปลี่ยนชนิดเงื่อนไขผ่าน select
      const s0 = document.querySelector('#w-bot .bs-rule .bs-line select');
      s0.value = 'mobs'; s0.dispatchEvent(new Event('change'));
      ok('editor: change condition type via select', c.script[0].c[0].t === 'mobs' && c.script[0].c[0].n === 3);
      c.adv = false; BS.setRules(c, []);
      document.getElementById('w-bot').classList.add('hidden');
    }
    Bot.toggle(false);
    return out;
  });
  await browser.close(); srv.close();
  for (const e of errors) checks.push(['page error', false, e]);
  let fail = 0;
  for (const [n, pass, info] of checks) { if (!pass) fail++; console.log(`${pass ? '✔' : '✘'} ${n}${info !== '' ? `  (${info})` : ''}`); }
  console.log(fail ? `\n${fail} FAILED` : `\nALL ${checks.length} PASSED`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
