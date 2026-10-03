'use strict';
// ============================================================
//  Rune Paths (ชั้น I) — จำลอง DPS ทุกรูนของ Class 1 ทั้ง 6 + ตรวจระบบ (เซฟ/เปลี่ยนรูน/บอท/PvP/หน้าต่างสกิล)
//  รัน:  NODE_PATH=$(npm root -g) node tests/runes.js [วินาทีต่อรอบ=100] [job,job | none = ข้ามการจำลอง ตรวจแต่ระบบ]
//
//  วิธีจำลอง (แบบเดียวกับ keystone balance ใน tests/balance_sim.js คือวัด "ทั้ง Class" ไม่ใช่สกิลเดียว):
//  • ตัวละคร Base Lv 30, Job เต็ม, ทุกสกิลของ Class Lv 5, สเตตัสตามแนะนำ (หลัก 55 / รอง 30), อาวุธเริ่มต้น
//  • หมุนสกิลครบชุด: บัฟ/เรียกหมา/หายตัว/กับดัก/ฮีล(ทุก 8 วิ) เมื่อหมด → สกิลโจมตีที่พร้อม (ตัวที่ไม่ได้ใช้นานสุดก่อน) → ตีปกติระหว่างรอ
//    SP ไม่จำกัด (เทียบเฉพาะดาเมจ) • HP ตรึงที่ 60% (Wolf Blood/รูนที่อิง HP คงที่) • ความชำนาญไม่ขึ้นระหว่างจำลอง
//  • ฉาก: เดี่ยว = มอน 1 ตัว • ฝูง = มอน 5 ตัวรุมรอบตัว • ตายแล้วเกิดตัวใหม่ 1 วิถัดไป (ดาเมจเกินเลือดไม่นับ)
//  • สุ่มแบบมีเมล็ด (16 เมล็ด × 100 วิ เหมือนกันทุกตัวเลือก) • โอกาสต่าง ๆ ใช้ตัวสะสมแทนการทอยลูกเต๋า (ได้ค่าคาดหมาย ไม่ใช่ดวง)
//    • มอนเกิดรอบจุดกลางลาน และตัวเราไม่ไหลออกจากลาน (ผลไม่แกว่งตามเส้นทางที่เดิน)
//  ตัวเลขรูนทั้งหมดอยู่ใน Runes.K (js/runes.js) — ปรับแล้วรันไฟล์นี้ซ้ำ
//  เกณฑ์: ทุกรูนต้องห่างจาก "ไม่มีรูน" ไม่เกิน ±5% ในฉากที่ตั้งใจ (intent) และไม่เกิน +15% ในทุกฉาก
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

const SECS = +process.argv[2] || 100;
const ONLY = (process.argv[3] || '').split(',').filter(Boolean);
const SEEDS = [11, 23, 37, 41, 53, 67, 71, 83, 97, 101, 113, 127, 131, 149, 157, 163];
const BAND = 5, CAP = 15;

(async () => {
  const srv = await serve();
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  else if (fs.existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(opts);
  const p = await (await browser.newContext({ viewport: { width: 1100, height: 680 } })).newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message));
  await p.goto(`http://localhost:${srv.address().port}/index.html`); await p.waitForTimeout(1200);
  await p.click('#au-offline'); await p.click('#btn-new'); await p.fill('#cr-name', 'RuneSim'); await p.click('#cr-start'); await p.waitForTimeout(1500);
  await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {});
  await p.waitForTimeout(500);

  // ---------- ตัวจำลอง (ในหน้าเกม) ----------
  await p.evaluate(() => {
    const PLAN = { einherjar: ['str', 'vit'], runecaster: ['int', 'dex'], wildhunter: ['dex', 'agi'], volva: ['int', 'vit'], trickster: ['agi', 'str'], berserker: ['str', 'agi'] };
    MOBS.rune_sim = { id: 'rune_sim', name: 'Rune Sim', lv: 28, hp: 2600, atk: [1, 1], def: 25, mdef: 15, vit: 25, flee: 45, hit: 1, exp: 0, jexp: 0, zeny: [0, 0], speed: 1.6, aggro: true,
      element: 'neutral', race: 'brute', sprite: 'boar', color: '#a08060', drops: [], range: 1, atkDelay: 1.7 };
    const mul32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const R0 = Math.random;
    let spot = null;
    window.RSETUP = job => {
      const pl = G.player;
      document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden'));
      Bot.toggle(false);
      pl.rc = {}; pl.ricd = {};
      pl.dead = false; pl.job = job; pl.baseLv = 30; pl.baseExp = 0; pl.jobLv = JOBS[job].jobMax; pl.skills = {}; pl.buffs = {}; pl.rb = {}; pl.cds = {}; pl.skillReadyAt = 0; pl.cast = null; pl.stunUntil = 0; pl.passives = [];
      for (const id of JOBS[job].skills) pl.skills[id] = SKILLS[id].max;
      const st = { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 }; st[PLAN[job][0]] = 55; st[PLAN[job][1]] = 30; pl.stats = st;
      unequipInvalid(); if (!pl.inventory.find(e => e.id === JOB_STARTER[job])) addItem(JOB_STARTER[job], 1, true);
      equipItem(pl.inventory.find(e => e.id === JOB_STARTER[job]), true);
      if (G.map.id !== 'wolfwood') changeMap('wolfwood', 28.5, 28.5);
      if (!spot) for (let r = 0; r < 20 && !spot; r++) for (let y = 28 - r; y <= 28 + r && !spot; y++) for (let x = 28 - r; x <= 28 + r && !spot; x++) {
        let open = true;
        for (let dy = -7; dy <= 7 && open; dy++) for (let dx = -7; dx <= 7 && open; dx++) if (!G.map.walkable(x + dx, y + dy)) open = false;
        if (open && !G.map.portals.some(q => U.dist(q.x, q.y, x, y) < 12)) spot = { x, y };
      }
    };
    // หนึ่งรอบจำลอง → { dmg ต่อวินาที, แยกตามที่มา, จำนวนร่าย }
    window.RSIM = (job, runes, n, secs, seed) => {
      const pl = G.player;
      Math.random = mul32(seed);
      RSETUP(job);
      pl.runes = Object.assign({}, runes);
      // เริ่มทุกรอบจากเวลา/สถานะเดียวกัน → ผลซ้ำได้ทุกครั้งไม่ว่าจะรันลำดับไหน
      G.time = 1000; pl.nextAttack = 0; pl.stealthUntil = 0; pl.poisonUntil = 0; pl.skillIntent = null; pl.target = null; Runes._crit = false;
      teleportPlayer(spot.x + 0.5, spot.y + 0.5);
      G.mobs = []; G.drops = []; G.allies = []; G.traps = []; G.respawns = []; G.zones = []; G.timers = []; G.fx = [];
      recalc(); pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp; pl.combatAt = -99;
      const order = JOBS[job].skills.filter(id => SKILLS[id].type === 'active');
      const by = {}, casts = {};
      let total = 0;
      G.onDmg = (m, dmg, o) => { if (m.def.id !== 'rune_sim') return; const v = Math.max(0, Math.min(dmg, o.src === 'poison' ? dmg : m.hp)); total += v; const k = o.src || 'other'; by[k] = (by[k] || 0) + v; };
      const ex0 = window.executeSkill; window.executeSkill = (id, ...a) => { casts[id] = (casts[id] || 0) + 1; return ex0(id, ...a); };
      const am0 = window.addMastery; window.addMastery = () => {};
      // ลดความแกว่งของการสุ่ม (variance reduction): โอกาส (ตีโดน/คริ/สถานะ/รูน) ใช้ตัวสะสมแยกตามค่าโอกาส → ได้สัดส่วนตรงค่าคาดหมาย
      // ช่วงสุ่มดาเมจใช้ค่ากลาง • ตำแหน่งเกิดมอนยังสุ่มตาม seed — ทำให้ต่างกันจริงระหว่างรูน ไม่ใช่ดวง
      const U0 = { chance: U.chance, rand: U.rand, randi: U.randi }, acc = new Map();
      // ตัวสะสมแยกตาม "ที่มา" (ตำแหน่งที่เรียก 4 ชั้นใน stack) + ค่าโอกาส → ตีปกติกับสกิลไม่แย่งรอบ Miss กัน
      U.chance = q => {
        if (!(q > 0)) return false; if (q >= 1) return true;
        const k = Math.round(q * 1e4) + '|' + (new Error().stack || '').split('\n').slice(2, 6).join('|');
        let a = acc.has(k) ? acc.get(k) : 0.5; a += q; const y = a >= 1; if (y) a -= 1; acc.set(k, a); return y;
      };
      U.rand = (a, b) => (a + b) / 2; U.randi = (a, b) => Math.floor((a + b + 1) / 2);
      // มอนเกิดรอบ "จุดกลางลาน" (ไม่ใช่รอบตัวเรา) และดึงตัวเรากลับถ้าไหลออกไปไกล → ไม่ลอยไปติดต้นไม้/ขอบแมพ (ผลไม่แกว่งตามเส้นทาง)
      const cx = spot.x + 0.5, cy = spot.y + 0.5;
      const spawn = () => { const a = Math.random() * Math.PI * 2, r = 2.5 + Math.random(); const m = spawnMob('rune_sim', { x: Math.floor(cx + Math.cos(a) * r), y: Math.floor(cy + Math.sin(a) * r) }); m.nextWander = 1e9; return m; };
      for (let i = 0; i < n; i++) spawn();
      const pend = [];
      let tgt = null, nextHeal = 1004, holdUntil = 0; const lastUse = {};
      const act = () => {
        if (G.time < holdUntil && pl.path.length) return; // กำลังถอยหลังวางกับดัก
        const alive = G.mobs.filter(m => !m.dead && m.def.id === 'rune_sim');
        if (!tgt || tgt.dead || !G.mobs.includes(tgt)) { tgt = null; let bd = 1e9; for (const m of alive) { const d = U.dist(m.x, m.y, pl.x, pl.y); if (d < bd) { bd = d; tgt = m; } } }
        if (!tgt) return;
        if (!pl.cast && !pl.skillIntent && pl.target !== tgt) { pl.target = tgt; pl.repathAt = 0; }
        if (pl.cast || G.time < pl.skillReadyAt || isStunned()) return;
        // ลำดับ: สกิลเสริม (บัฟ/เรียกหมา/หายตัว/กับดัก/ฮีล) ตามลำดับเดิมก่อน → สกิลโจมตีที่พร้อม เลือกตัวที่ใช้ล่าสุดนานที่สุด (หมุนครบทุกสกิล ไม่มีตัวไหนถูกลืม)
        const isAtk = id => ['attack', 'aoe', 'other'].includes(Bot.role(id));
        const pri = order.filter(id => !isAtk(id)).concat(order.filter(isAtk).sort((a, b) => (lastUse[a] || 0) - (lastUse[b] || 0)));
        for (const id of pri) {
          const s = skillDef(id), lv = skillLv(id), role = Bot.role(id);
          if (skillCdLeft(id) > 0) continue;
          if (role === 'heal' && G.time < nextHeal) continue; // ฮีลทุก ~8 วิ (เหมือนผู้เล่นที่โดนตีเรื่อย ๆ)
          if (role === 'buff' && pl.buffs[id] && pl.buffs[id].until - G.time > 1) continue;
          if (role === 'summon' && G.allies.length) continue;
          if (role === 'opener' && pl.stealthUntil > G.time) continue;
          if (role === 'trap' && (G.traps.length >= 3 || U.dist(tgt.x, tgt.y, pl.x, pl.y) > 2.5)) continue;
          beginSkill(id, lv, s.target === 'enemy' ? tgt : null);
          lastUse[id] = G.time;
          if (role === 'heal') nextHeal = G.time + 8;
          // กับดัก: วางแล้วถอยออก 2.5 ช่อง ให้มอนเดินตามมาเหยียบ (วิธีใช้กับดักจริง)
          if (role === 'trap' && s.special === 'trap') {
            let best = null, bs = -1e9; // ถอยห่างเป้า แต่ไม่ไหลออกจากลานโล่ง (ห่างจุดกลางไม่เกิน ~3 ช่อง)
            for (let i = 0; i < 16; i++) {
              const a = i / 16 * Math.PI * 2, tx = Math.floor(pl.x + Math.cos(a) * 2.5), ty = Math.floor(pl.y + Math.sin(a) * 2.5);
              if (!G.map.walkable(tx, ty)) continue;
              const sc = U.dist(tx + 0.5, ty + 0.5, tgt.x, tgt.y) - 2 * Math.max(0, U.dist(tx + 0.5, ty + 0.5, spot.x + 0.5, spot.y + 0.5) - 3);
              if (sc > bs) { bs = sc; best = [tx, ty]; }
            }
            if (best) { pl.target = null; pl.path = findPath(G.map, Math.floor(pl.x), Math.floor(pl.y), best[0], best[1], 200); holdUntil = G.time + 0.9; }
          }
          return;
        }
      };
      const dt = 1 / 15, steps = Math.round(secs / dt), t0 = G.time;
      try {
        for (let i = 0; i < steps; i++) {
          act();
          pl.sp = pl.d.maxSp; pl.hp = Math.round(pl.d.maxHp * 0.6); pl.dead = false;
          if (!pl.cast && U.dist(pl.x, pl.y, cx, cy) > 3.5) { pl.x = cx; pl.y = cy; pl.path = []; }
          G.respawns = [];
          const alive = G.mobs.filter(m => !m.dead && m.def.id === 'rune_sim').length;
          while (alive + pend.length < n) pend.push(G.time + 1);
          for (let j = pend.length - 1; j >= 0; j--) if (pend[j] <= G.time) { pend.splice(j, 1); spawn(); }
          updateGame(dt);
        }
      } finally { window.executeSkill = ex0; window.addMastery = am0; G.onDmg = null; Math.random = R0; Object.assign(U, U0); }
      const sec = G.time - t0;
      for (const k in by) by[k] = Math.round(by[k] / sec);
      return { dps: total / sec, by, casts };
    };
    G.player.options.sound = false; UI.msg = () => {}; UI.announce = () => {}; UI.splash = () => {}; window.saveGame = () => {};
    G.fastSim = true;
  });

  // ---------- จำลองทุกรูน ----------
  const tree = await p.evaluate(() => Object.fromEntries(FIRST_JOBS.map(j => [j, JOBS[j].skills.map(id => ({ id, runes: Runes.list(id).map(r => ({ id: r.id, name: r.name, intent: r.intent })) }))])));
  const rows = [], checks = [];
  const ok = (name, cond, info = '') => checks.push([name, !!cond, info]);
  const sim = async (job, runes, n) => {
    let s = 0; const by = {};
    for (const seed of SEEDS) {
      const r = await p.evaluate(([j, ru, nn, ss, sd]) => RSIM(j, ru, nn, ss, sd), [job, runes, n, SECS, seed]);
      s += r.dps; for (const k in r.by) by[k] = (by[k] || 0) + r.by[k] / SEEDS.length;
    }
    return { dps: s / SEEDS.length, by };
  };
  const t0 = Date.now();
  for (const job of FIRST_JOBS_ORDER(tree)) {
    if (ONLY.length && !ONLY.includes(job)) continue;
    const b1 = await sim(job, {}, 1), b5 = await sim(job, {}, 5);
    console.log(`\n== ${job}  baseline  single ${b1.dps.toFixed(1)}  pack ${b5.dps.toFixed(1)}`);
    console.log('   single by source', JSON.stringify(Object.fromEntries(Object.entries(b1.by).map(([k, v]) => [k, Math.round(v)]))));
    console.log('   pack   by source', JSON.stringify(Object.fromEntries(Object.entries(b5.by).map(([k, v]) => [k, Math.round(v)]))));
    for (const sk of tree[job]) for (const r of sk.runes) {
      const s1 = await sim(job, { [sk.id]: r.id }, 1), s5 = await sim(job, { [sk.id]: r.id }, 5);
      const d1 = (s1.dps / b1.dps - 1) * 100, d5 = (s5.dps / b5.dps - 1) * 100;
      const inten = r.intent === 'single' ? [d1] : r.intent === 'pack' ? [d5] : [d1, d5];
      const pass = inten.every(d => Math.abs(d) <= BAND) && d1 <= CAP && d5 <= CAP;
      rows.push({ job, skill: sk.id, rune: r.id, name: r.name, intent: r.intent, s1: s1.dps, s5: s5.dps, d1, d5, pass });
      console.log(`   ${pass ? '✔' : '✘'} ${sk.id.padEnd(16)} ${r.name.padEnd(16)} ${r.intent.padEnd(6)} single ${s1.dps.toFixed(1).padStart(7)} (${(d1 >= 0 ? '+' : '') + d1.toFixed(1)}%)  pack ${s5.dps.toFixed(1).padStart(7)} (${(d5 >= 0 ? '+' : '') + d5.toFixed(1)}%)`);
      ok(`balance ${job}/${r.id}`, pass, `${r.intent} single ${d1.toFixed(1)}% pack ${d5.toFixed(1)}%`);
    }
  }
  console.log(`\n(sim ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  fs.writeFileSync(path.join(process.env.RUNE_OUT || '/tmp', 'rune_dps.json'), JSON.stringify(rows, null, 1));

  // ---------- ตรวจระบบ (ไม่ใช่ตัวเลข) ----------
  const sys = await p.evaluate(async () => {
    const out = [];
    const ok = (name, cond, info = '') => out.push([name, !!cond, typeof info === 'string' ? info : JSON.stringify(info)]);
    const pl = G.player, wait = ms => new Promise(r => setTimeout(r, ms));
    // 1) ข้อมูล: 72 รูน • ทุกสกิลของ Class 1 มี 2 • id ไม่ซ้ำ • ชื่ออังกฤษสั้น + คำอธิบาย L(ไทย, อังกฤษ)
    let n = 0; const bad = [];
    for (const j of FIRST_JOBS) for (const id of JOBS[j].skills) {
      const l = Runes.list(id); n += l.length;
      if (l.length !== 2) bad.push(id + ':' + l.length);
      for (const r of l) {
        if (!/^[A-Za-z' &]{3,18}$/.test(r.name) && !/Huginn/.test(r.name)) bad.push('name ' + r.id);
        // คำอธิบายต้องเป็น L(ไทย, อังกฤษ): อาร์กิวเมนต์แรกมีอักษรไทย อาร์กิวเมนต์ที่สองไม่มี
        const mm = /L\(\s*(['`])([\s\S]*?)\1\s*,\s*(['`])([\s\S]*?)\3\s*\)/.exec(r.desc.toString());
        if (!mm || !/[฀-๿]/.test(mm[2]) || /[฀-๿]/.test(mm[4]) || mm[4].length < 20) bad.push('desc ' + r.id);
        if (!['single', 'pack', 'both'].includes(r.intent)) bad.push('intent ' + r.id);
      }
    }
    ok('data: 72 runes, 2 per Class 1 skill, Thai+English text', n === 72 && Object.keys(Runes.BY_ID).length === 72 && !bad.length, bad.join(' '));
    // 2) เซฟ/โหลด: เซฟเก่าไม่มี runes = ว่าง • ค่าเสียถูกตัด • ไม่แตะ SAVE_KEY
    ok('save: runes in persisted fields', SAVE_FIELDS.includes('runes') && SAVE_KEY === 'ragnarok_web_save_v2');
    const old = loadGameFrom({ name: 'Old', gender: 'm', hair: '#ccc', job: 'einherjar', baseLv: 20, jobLv: 20, skills: { shield_slam: 5 }, stats: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 } });
    ok('save: old save loads with no runes', old && JSON.stringify(old.runes) === '{}', old && old.runes);
    const dirty = loadGameFrom({ name: 'Dirty', gender: 'm', hair: '#ccc', job: 'einherjar', baseLv: 20, jobLv: 20, skills: { shield_slam: 5, whirlwind: 5 }, stats: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 },
      runes: { shield_slam: 'shield_slam.charge', whirlwind: 'fire_rune.split', gone_skill: 'x', war_cry: 'no.such' } });
    ok('save: invalid rune entries dropped', JSON.stringify(dirty.runes) === '{"shield_slam":"shield_slam.charge"}', dirty.runes);
    // กลับมาใช้ตัวละครเดิม
    G.player = pl; recalc();
    RSETUP('einherjar'); pl.runes = {}; pl.combatAt = -99; recalc();
    const z0 = pl.zeny;
    ok('set rune (free, anywhere)', Runes.set('shield_slam', 'shield_slam.charge') && pl.runes.shield_slam === 'shield_slam.charge' && pl.zeny === z0 && G.map.def.kind !== 'town');
    const data = saveData();
    const back = loadGameFrom(JSON.parse(JSON.stringify(data)));
    ok('save: runes round-trip', back.runes.shield_slam === 'shield_slam.charge', back.runes);
    G.player = pl; recalc();
    ok('rune changes the skill (range 5, no stun)', skillDef('shield_slam').range === 5 && !skillDef('shield_slam').dmg.status && SKILLS.shield_slam.melee && !SKILLS.shield_slam.range);
    ok('base skill numbers untouched', SKILLS.shield_slam.dmg.mult(5) === 4 && SKILLS.shield_slam.dmg.status.kind === 'stun');
    // 3) ปลดที่ Lv 4 • ต่ำกว่า 4 รูนไม่ทำงาน
    pl.skills.whirlwind = 3;
    ok('locked below skill Lv 4', !Runes.set('whirlwind', 'whirlwind.vortex') && !pl.runes.whirlwind);
    pl.skills.whirlwind = 4;
    ok('unlocks at skill Lv 4', Runes.set('whirlwind', 'whirlwind.vortex') && skillDef('whirlwind').rune);
    pl.skills.whirlwind = 3;
    ok('rune dormant if skill drops below Lv 4', skillDef('whirlwind') === SKILLS.whirlwind && pl.runes.whirlwind === 'whirlwind.vortex');
    pl.skills.whirlwind = 5;
    // 4) ระหว่างต่อสู้เปลี่ยนไม่ได้ (ตี/โดนตีภายใน 5 วิ)
    const m = spawnMob('rune_sim', { x: Math.floor(pl.x) + 1, y: Math.floor(pl.y) }); m.hp = m.maxHp = 1e6;
    pl.combatAt = -99; damageMob(m, 5);
    ok('dealing damage = in combat', !Runes.canChange() && !Runes.set('shield_slam', null) && pl.runes.shield_slam === 'shield_slam.charge');
    G.time += 5.1;
    ok('5s after combat = free to change', Runes.canChange() && Runes.set('shield_slam', null) && !pl.runes.shield_slam);
    pl.combatAt = -99; damagePlayer(1);
    ok('taking damage = in combat', !Runes.canChange());
    G.time += 5.1; pl.hp = pl.d.maxHp;
    // 5) หน้าต่างสกิล: ปุ่มรูน 2 ปุ่มต่อสกิล กดใส่/กดซ้ำถอด
    G.mobs = [];
    UI.skTab = 'einherjar'; UI.open('w-skills'); await wait(50);
    const rows = document.querySelectorAll('#w-skills .rn-row').length, opts = document.querySelectorAll('#w-skills .rn-opt').length;
    const btn = document.querySelector('#w-skills .rn-row[data-skill="whirlwind"] .rn-opt[data-rune="whirlwind.bladestorm"]');
    btn.click(); await wait(30);
    const picked = pl.runes.whirlwind === 'whirlwind.bladestorm' && !!document.querySelector('#w-skills .rn-opt.on[data-rune="whirlwind.bladestorm"]');
    document.querySelector('#w-skills .rn-opt[data-rune="whirlwind.bladestorm"]').click(); await wait(30);
    ok('skill window: 6 rune rows × 2 buttons, click to socket/unsocket', rows === 6 && opts === 12 && picked && !pl.runes.whirlwind, { rows, opts, picked });
    ok('skill window: text uses "Class", not คลาส/อาชีพ', !/คลาส|อาชีพ/.test(document.querySelector('#w-skills').textContent));
    UI.close('w-skills');
    // 6) บอทเข้าใจสกิลที่ถูกรูนเปลี่ยน: เป้าวงกว้าง/บทบาท/ระยะ
    pl.runes = { shield_slam: 'shield_slam.shockwave' }; recalc();
    const c0 = spawnMob('rune_sim', { x: Math.floor(pl.x) + 1, y: Math.floor(pl.y) }), c1 = spawnMob('rune_sim', { x: Math.floor(pl.x) + 2, y: Math.floor(pl.y) });
    c0.state = c1.state = 'chase';
    ok('bot: shockwave victims include the splash', Bot.victims(skillDef('shield_slam'), c0).length === 2);
    pl.runes = { shield_slam: 'shield_slam.charge' }; recalc();
    ok('bot: charge uses 5-cell range', skillRange(skillDef('shield_slam')) === 5);
    RSETUP('trickster'); pl.runes = { smoke_veil: 'smoke_veil.bomb' }; recalc();
    ok('bot: smoke bomb is dropped like a trap', Bot.role('smoke_veil') === 'trap');
    G.mobs = [];
    // 7) PvP: เป้าที่เป็นผู้เล่น (isPlayer) → ดาเมจรูนส่งผ่าน Online.sendHit • ไม่ถูกดึง/ผลัก/ติดสถานะ
    const sent = []; const sh0 = Online.sendHit; Online.sendHit = (mm, d) => sent.push(d);
    const foe = { uid: G.uid++, isPlayer: true, ref: { id: 'x' }, state: 'idle', path: [], facing: 1, hitFlash: 0, atkAnim: 0, nextAtk: 0, x: pl.x + 3, y: pl.y, hp: 500, maxHp: 500,
      def: { id: 'pvp_x', name: 'Foe', lv: 30, def: 10, mdef: 10, flee: 0, vit: 10, element: 'neutral', race: 'human', scale: 1, exp: 0, jexp: 0, drops: [] } };
    G.mobs.push(foe);
    RSETUP('einherjar'); pl.runes = { shield_throw: 'shield_throw.boomerang', war_cry: 'war_cry.gather' }; recalc(); pl.sp = pl.d.maxSp;
    const fx0 = foe.x; executeSkill('war_cry', 5, null); pl.skillReadyAt = 0;
    executeSkill('shield_throw', 5, foe);
    for (let i = 0; i < 30; i++) updateGame(1 / 15);
    ok('pvp: rune hits go through sendHit, players are not pulled', sent.length >= 2 && foe.x === fx0 && !(foe.slowUntil > G.time), { sent: sent.length, moved: foe.x - fx0 });
    RSETUP('volva'); pl.runes = { divine_shield: 'divine_shield.retribution' }; recalc(); pl.buffs.divine_shield = { lv: 5, until: G.time + 30 }; recalc();
    const n0 = sent.length; Runes.onHurt(foe, 200);
    ok('pvp: retribution reflects onto the attacking player', sent.length === n0 + 1);
    Online.sendHit = sh0; G.mobs = G.mobs.filter(x => x !== foe);
    pl.buffs = {}; recalc();
    return out;
  });
  checks.push(...sys);
  for (const [n2, pass, info] of sys) console.log(`${pass ? '✔' : '✘'} ${n2}${info ? `  (${info})` : ''}`);

  // ---------- ทุกรูนใช้จริงพร้อมภาพ (ไม่ fastSim) + บอทล่าจริงกับรูน ----------
  const vis = await p.evaluate(async () => {
    const pl = G.player, wait = ms => new Promise(r => setTimeout(r, ms)), errs = [];
    G.fastSim = false;
    const ex = [];
    for (const job of FIRST_JOBS) for (const id of JOBS[job].skills) for (const r of Runes.list(id)) {
      try {
        RSETUP(job); pl.runes = { [id]: r.id }; recalc(); pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp; pl.combatAt = -99;
        G.mobs = []; G.allies = []; G.traps = []; G.zones = [];
        for (let i = 0; i < 4; i++) { const m = spawnMob('rune_sim', { x: Math.floor(pl.x) + 1 + (i % 2), y: Math.floor(pl.y) + (i >> 1) }); m.state = 'chase'; m.nextAtk = G.time + 0.3; }
        const t = G.mobs[0]; pl.target = t;
        const s = skillDef(id);
        if (s.type === 'active') { pl.skillReadyAt = 0; pl.cds = {}; beginSkill(id, 5, s.target === 'enemy' ? t : null); }
        else for (const k of JOBS[job].skills) if (SKILLS[k].type === 'active' && SKILLS[k].target === 'enemy') { pl.skillReadyAt = 0; pl.cds = {}; pl.cast = null; beginSkill(k, 5, t); break; }
        for (let i = 0; i < 90; i++) { pl.sp = pl.d.maxSp; updateGame(1 / 30); }
        await wait(16);
        ex.push(r.id);
      } catch (e) { errs.push(r.id + ': ' + e.message); }
    }
    // บอทล่าจริง 40 วิ ต่อ Class โดยใส่รูน A ทุกสกิล แล้วอีกรอบรูน B
    const hunts = [];
    G.fastSim = true;
    for (const pick of [0, 1]) for (const job of FIRST_JOBS) {
      try {
        RSETUP(job); pl.runes = {}; for (const id of JOBS[job].skills) pl.runes[id] = Runes.list(id)[pick].id;
        changeMap('wolfwood', 28.5, 28.5); recalc(); pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp;
        addItem('white_potion', 30, true); addItem('blue_potion', 10, true);
        const c = Bot.cfg(); c.style = 'skills'; c.leash = false; c.skills = {}; c.skillHp = {}; c.skipMobs = {};
        const casts = {}; const ex0 = window.executeSkill; window.executeSkill = (id, ...a) => { casts[id] = (casts[id] || 0) + 1; return ex0(id, ...a); };
        Bot.toggle(true);
        for (let i = 0; i < 40 * 15; i++) { updateGame(1 / 15); if (pl.dead) { respawnPlayer(true); Bot.toggle(true); } }
        hunts.push({ job, pick, kills: Bot.stats.kills, casts: Object.keys(casts).length });
        Bot.toggle(false); window.executeSkill = ex0;
      } catch (e) { errs.push('bot ' + job + ': ' + e.message); }
    }
    G.fastSim = false;
    return { ran: ex.length, errs, hunts };
  });
  ok('every rune runs with visuals (no errors)', vis.ran === 72 && !vis.errs.length, `${vis.ran} ran ${vis.errs.join(' | ')}`);
  ok('bot hunts with runes on every skill (all 6 Class, both picks)', vis.hunts.length === 12 && vis.hunts.every(h => h.kills > 0 && h.casts >= 2), JSON.stringify(vis.hunts));
  console.log(`${vis.ran === 72 && !vis.errs.length ? '✔' : '✘'} every rune runs with visuals  (${vis.ran})`);
  console.log(`bot hunts: ${vis.hunts.map(h => `${h.job}/${'AB'[h.pick]} kills ${h.kills} skills ${h.casts}`).join(' • ')}`);

  await browser.close(); srv.close();
  for (const e of errors) ok('page error', false, e);
  let fail = 0;
  for (const [n, pass, info] of checks) { if (!pass) { fail++; console.log(`✘ ${n}${info !== '' ? `  (${info})` : ''}`); } }
  console.log(fail ? `\n${fail} FAILED of ${checks.length}` : `\nALL ${checks.length} PASSED`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

function FIRST_JOBS_ORDER(tree) { return Object.keys(tree); }
