'use strict';
// ============================================================
//  Rune Paths ชั้น III — จำลอง DPS ของ Oath (รูนสกิลติดตัว) + รูนสกิลประจำตัว ★ ของ Class 3 ทั้ง 12 (48 ตัวเลือก)
//  รัน:  NODE_PATH=$(npm root -g) node tests/runes_c3.js [วินาทีต่อรอบ=80] [job,job]
//        NSEEDS=<จำนวนเมล็ด 1–16, ค่าเริ่ม 12>  CHROME=<chrome.exe>  RUNE_OUT=<โฟลเดอร์> (rune_c3_dps.json)
//
//  วิธีจำลอง = แบบเดียวกับ tests/runes.js (Class 1) ปรับให้เป็นตัวละคร Class 3:
//  • ตัวละคร Base Lv 70, Class 1+2 เต็ม, Class 3 Job 26 ทุกสกิล Lv 5, สเตตัสหลัก 90 / รอง 60 / VIT 30 (ตาม JOBS[job].stats), อาวุธเริ่มต้นของสาย
//  • หมุนสกิลทั้งสาย (Class 1 → 2 → 3): สกิลเสริม (บัฟ/เรียก/หลบ/กับดัก/ฮีลทุก 8 วิ) ก่อน → สกิลโจมตีที่พร้อม (ตัวที่ใช้ล่าสุดนานสุดก่อน) → ตีปกติระหว่างรอ
//    SP ไม่จำกัด (เทียบเฉพาะดาเมจ) • HP ตรึงที่ 60% (แถว @40% = ตรึงที่ 40% ทั้งแถวและฐาน) • ความชำนาญไม่ขึ้นระหว่างจำลอง
//  • ฉาก: เดี่ยว = มอน 1 ตัว • ฝูง = มอน 5 ตัวรุมรอบตัว • ตายแล้วเกิดตัวใหม่ 1 วิถัดไป (ดาเมจเกินเลือดไม่นับ) • มอน FLEE 0 (ไม่มี Miss)
//  • สุ่มแบบมีเมล็ด (เมล็ดเดียวกันทุกตัวเลือก) • โอกาสต่าง ๆ ใช้ตัวสะสมแทนการทอยลูกเต๋า • ช่วงดาเมจใช้ค่ากลาง • เลือดมอน ±10% ต่อตัว
//  เกณฑ์ (เหมือน Class 1):
//  • ตัวเลือกห่างจาก "ไม่มีรูน/ไม่มี Oath" ไม่เกิน ±12% ในฉากที่ตั้งใจ (intent) และไม่เกิน +15% ในทุกฉาก
//  • ค่าเฉลี่ย (เดี่ยว+ฝูง)/2 ของแต่ละตัวเลือกไม่เกิน +7% (ไม่มีตัวเลือกที่ดีกว่าทุกฉาก)
//  • ค่าเฉลี่ยทั้ง Class (4 ตัวเลือก) — แสดงเฉย ๆ ไม่ตัดสิน (ตัวเลือกน้อย + มี Oath แลกของ)
//  • แถว @40%HP (Oath of the Lost Hand: ×K เมื่อ HP < 50% แต่ห้ามยา) วัดในเงื่อนไขของมันเอง → ใช้เกณฑ์ ±12% / +15% แต่ไม่ใช้เกณฑ์เฉลี่ย +7%
//  ข้อยกเว้น (EXEMPT ข้างล่าง): ตัวเลือกที่ "จ่ายด้วยดาเมจ" เพื่อได้อย่างอื่นที่ดาเมจวัดไม่ได้ (ฮีล/ออร่าปาร์ตี้/ล็อกเป้า/HP)
//    → ยังห้ามเกินเพดานบน (ฉากใดก็ตาม ≤ +15% / ฉากที่ตั้งใจ ≤ +12%) แต่ด้านล่างใช้พื้นที่ระบุแทน −12%
//  ตัวเลือกที่ไม่แตะดาเมจ (Bridge/Horn/Raid/Release/Open Hand/Twin/Taut Thread) ได้ 0.0% พอดี = ตัวตรวจว่าการจำลองไม่รั่วข้ามรอบ
//  (หน้าเกมใหม่ทุก Class • หยุดลูป rAF • ล้างสถานะ c3*/พลังประจำสาย • อุ่นเครื่อง 1 รอบ — ก่อนแก้ ตัวเลือกเดียวกันแกว่ง ±3~8% ตามลำดับที่รัน)
//  ตัวเลขอยู่ใน Class3.K (js/class3.js + js/class3_wave2..6.js) — ปรับแล้วรันไฟล์นี้ซ้ำ
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

const SECS = +process.argv[2] || 80;
const ONLY = (process.argv[3] || '').split(',').filter(Boolean);
const SEEDS = [11, 23, 37, 41, 53, 67, 71, 83, 97, 101, 113, 127, 131, 149, 157, 163].slice(0, Math.max(1, Math.min(16, +process.env.NSEEDS || 12)));
const BAND = 12, CAP = 15, MEAN = 7;
// ตัวเลือกที่ตั้งใจให้ "เสียดาเมจ" แลกกับอย่างอื่น: floor = ยอมให้ต่ำสุดเท่านี้ (%) ในฉากที่ตั้งใจ แทน −BAND • why = สิ่งที่ได้คืน (ดาเมจวัดไม่ได้)
const EXEMPT = {
  'ymirs_bones.mountain': { floor: -25, why: 'Oath of the Mountain: skills cost no HP (survival) for cooldowns x1.5 and no stored force — measured -18%/-23%' },
  'bifrost_line.prism_wall': { floor: -25, why: 'Prism Wall: the line deals no damage, it roots foes 3s instead (control) — measured -15%/-20%' },
  'well_of_urd.well': { floor: -20, why: 'Oath of the Well: heals x1.25 for skill damage x0.85 (party/ally healer path) — measured about -11%/-12%' },
  'kenning.chorus': { floor: -20, why: 'Oath of the Chorus: aura reaches 12 cells for a party, own skills x0.85 — measured -8%/-11%' },
};

(async () => {
  const srv = await serve();
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  else if (fs.existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(opts);
  const errors = [];
  let p = null, ctx = null; // หน้าเกมใหม่ทุก Class (context ใหม่) → ผลของ Class หนึ่งไม่ขึ้นกับว่ารันอะไรมาก่อน
  const boot = async () => {
    if (ctx) await ctx.close();
    ctx = await browser.newContext({ viewport: { width: 1100, height: 680 } }); p = await ctx.newPage(); p.setDefaultTimeout(90000);
    p.on('pageerror', e => errors.push(e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message));
    await p.goto(`http://localhost:${srv.address().port}/index.html`); await p.waitForTimeout(1200);
    await p.click('#au-offline'); await p.click('#btn-new'); await p.fill('#cr-name', 'RuneSimC3'); await p.click('#cr-start'); await p.waitForTimeout(1500);
    await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {});
    await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 8000, polling: 250 }).catch(() => {});
    await p.waitForTimeout(400);

    // ---------- ตัวจำลอง (ในหน้าเกม) ----------
    await p.evaluate(() => {
      MOBS.rune_c3_sim = { id: 'rune_c3_sim', name: 'Rune Sim III', lv: 68, hp: 9000, atk: [1, 1], def: 35, mdef: 30, vit: 60, flee: 0, hit: 1, exp: 0, jexp: 0, zeny: [0, 0], speed: 1.6, aggro: true,
        element: 'neutral', race: 'brute', sprite: 'boar', color: '#a08060', drops: [], range: 1, atkDelay: 1.7 };
      const mul32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
      const R0 = Math.random;
      UI.menu = async () => 1;
      let spot = null;
      // ตัวละคร Class 3: Class 1 + 2 เต็ม → ยกระดับ → Class 3 ทุกสกิล Lv 5
      window.C3SETUP = job => {
        const pl = G.player, root = jobRoot(job), j2 = JOBS[job].parent;
        document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden'));
        Bot.toggle(false);
        pl.dead = false; pl.baseLv = 70; pl.job = 'novice'; pl.jobLv = 10; pl.skills = { first_aid: 1 }; pl.buffs = {}; pl.runes = {}; pl.rb = {}; pl.cds = {}; pl.c3 = {}; pl.rc = {}; pl.ricd = {}; pl.passives = [];
        delete pl.job1Lv; delete pl.job2Lv; for (const k of Object.keys(pl)) if (/^c3./.test(k)) delete pl[k]; // สถานะกลไก Class 3 (c3bones/c3hold/c3combo/...) ไม่ข้ามรอบ
        changeJob(root); pl.jobLv = JOBS[root].jobMax; pl.skillPoints = JOBS[root].jobMax - 1; for (const id of JOBS[root].skills) while (canLearn(id)) learnSkill(id);
        changeJob(j2); pl.jobLv = THIRD_JOB_REQ.job; pl.skillPoints = Math.max(0, totalSkillPoints(pl) - lineSkillsSpent(pl)); for (const id of JOBS[j2].skills) while (canLearn(id)) learnSkill(id);
        const q = Quest.state(); if (!q.done.includes(THIRD_JOB_REQ.quest)) q.done.push(THIRD_JOB_REQ.quest); // ปลด = จบภาค 1
        Class3.st(pl).trial = { job, stage: 'ascend' }; Class3.ascend(job);
        if (pl.job !== job) throw new Error(`ascend to ${job} failed (still ${pl.job})`);
        pl.jobLv = 26;
        for (const id of JOBS[job].skills) if (!SKILLS[id].exp) pl.skills[id] = SKILLS[id].max;
        const [a, b] = JOBS[job].stats.toLowerCase().split('/').map(x => x.trim());
        const st = { str: 1, agi: 1, vit: 30, int: 1, dex: 1, luk: 1 }; st[a] = 90; st[b] = Math.max(st[b], 60); pl.stats = st;
        unequipInvalid(); const wid = JOB_STARTER[root];
        if (!pl.inventory.find(e => e.id === wid)) addItem(wid, 1, true);
        equipItem(pl.inventory.find(e => e.id === wid), true);
        if (G.map.id !== 'wolfwood') changeMap('wolfwood', 28.5, 28.5);
        if (!spot) for (let r = 0; r < 20 && !spot; r++) for (let y = 28 - r; y <= 28 + r && !spot; y++) for (let x = 28 - r; x <= 28 + r && !spot; x++) {
          let open = true;
          for (let dy = -7; dy <= 7 && open; dy++) for (let dx = -7; dx <= 7 && open; dx++) if (!G.map.walkable(x + dx, y + dy)) open = false;
          if (open && !G.map.portals.some(q => U.dist(q.x, q.y, x, y) < 12)) spot = { x, y };
        }
        return pl;
      };
      // หนึ่งรอบจำลอง → { dps, แยกตามที่มา, จำนวนร่าย }
      window.C3RSIM = (job, runes, n, secs, seed, hpPin) => {
        Math.random = mul32(seed);
        const pl = C3SETUP(job);
        pl.runes = Object.assign({}, runes);
        G.time = 1000; pl.nextAttack = 0; pl.stealthUntil = 0; pl.poisonUntil = 0; pl.skillIntent = null; pl.target = null; pl.skillReadyAt = 0; pl.cast = null; pl.stunUntil = 0; Runes._crit = false;
        teleportPlayer(spot.x + 0.5, spot.y + 0.5);
        G.mobs = []; G.drops = []; G.allies = []; G.traps = []; G.respawns = []; G.zones = []; G.timers = []; G.fx = [];
        // สถานะพลังประจำสาย/สกิลขยาย (WeakMap ต่อผู้เล่น มีเวลาประทับ) สร้างใหม่ทุกรอบ — G.time ย้อนกลับเป็น 1000 ทุกรอบ ถ้าไม่ล้าง สแต็ก/คูลดาวน์จากรอบก่อนติดมา
        pl.dead = true; if (typeof ClassTraits !== 'undefined') ClassTraits.state(); if (typeof ClassExpansion !== 'undefined') ClassExpansion.state(); pl.dead = false;
        recalc(); pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp; pl.combatAt = -99;
        const line = jobLine(job).flatMap(j => JOBS[j].skills);
        const order = [...new Set(line)].filter(id => SKILLS[id] && SKILLS[id].type === 'active' && skillLv(id) > 0);
        const by = {}, casts = {};
        let total = 0;
        G.onDmg = (m, dmg, o) => { if (m.def.id !== 'rune_c3_sim') return; const v = Math.max(0, Math.min(dmg, o && o.src === 'poison' ? dmg : m.hp)); total += v; const k = (o && o.src) || 'other'; by[k] = (by[k] || 0) + v; };
        const ex0 = window.executeSkill; window.executeSkill = (id, ...a) => { casts[id] = (casts[id] || 0) + 1; return ex0(id, ...a); };
        const am0 = window.addMastery; window.addMastery = () => {};
        const U0 = { chance: U.chance, rand: U.rand, randi: U.randi }, acc = new Map();
        U.chance = q => {
          if (!(q > 0)) return false; if (q >= 1) return true;
          const k = Math.round(q * 1e4) + '|' + (new Error().stack || '').split('\n').slice(2, 6).join('|');
          let a = acc.has(k) ? acc.get(k) : 0.5; a += q; const y = a >= 1; if (y) a -= 1; acc.set(k, a); return y;
        };
        U.rand = (a, b) => (a + b) / 2; U.randi = (a, b) => Math.floor((a + b + 1) / 2);
        const cx = spot.x + 0.5, cy = spot.y + 0.5;
        const spawn = () => { const a = Math.random() * Math.PI * 2, r = 2.5 + Math.random(); const m = spawnMob('rune_c3_sim', { x: Math.floor(cx + Math.cos(a) * r), y: Math.floor(cy + Math.sin(a) * r) }); m.def = Object.assign({}, m.def, { flee: 0 }); m.nextWander = 1e9; m.hp = m.maxHp = Math.round(m.maxHp * (0.9 + 0.2 * Math.random())); return m; };
        for (let i = 0; i < n; i++) spawn();
        const pend = [];
        let tgt = null, nextHeal = 1004, holdUntil = 0; const lastUse = {};
        const act = () => {
          if (G.time < holdUntil && pl.path.length) return;
          const alive = G.mobs.filter(m => !m.dead && m.def.id === 'rune_c3_sim');
          if (!tgt || tgt.dead || !G.mobs.includes(tgt)) { tgt = null; let bd = 1e9; for (const m of alive) { const d = U.dist(m.x, m.y, pl.x, pl.y); if (d < bd) { bd = d; tgt = m; } } }
          if (!tgt) return;
          if (!pl.cast && !pl.skillIntent && pl.target !== tgt) { pl.target = tgt; pl.repathAt = 0; }
          if (pl.cast || G.time < pl.skillReadyAt || isStunned()) return;
          const isAtk = id => ['attack', 'aoe', 'other'].includes(Bot.role(id));
          const pri = order.filter(id => !isAtk(id)).concat(order.filter(isAtk).sort((a, b) => (lastUse[a] || 0) - (lastUse[b] || 0)));
          for (const id of pri) {
            const s = skillDef(id), lv = skillLv(id), role = Bot.role(id);
            if (skillCdLeft(id) > 0) continue;
            if (role === 'heal' && G.time < nextHeal) continue;
            if (role === 'buff' && pl.buffs[id] && pl.buffs[id].until - G.time > 1) continue;
            if (role === 'summon' && G.allies.length) continue;
            if (role === 'opener' && pl.stealthUntil > G.time) continue;
            if (role === 'trap' && (G.traps.length >= 3 || U.dist(tgt.x, tgt.y, pl.x, pl.y) > 2.5)) continue;
            beginSkill(id, lv, s.target === 'enemy' ? tgt : null);
            lastUse[id] = G.time;
            if (role === 'heal') nextHeal = G.time + 8;
            if (role === 'trap' && s.special === 'trap') {
              let best = null, bs = -1e9;
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
            pl.sp = pl.d.maxSp; pl.hp = Math.round(pl.d.maxHp * hpPin); pl.dead = false;
            if (!pl.cast && U.dist(pl.x, pl.y, cx, cy) > 3.5) { pl.x = cx; pl.y = cy; pl.path = []; }
            G.respawns = [];
            const alive = G.mobs.filter(m => !m.dead && m.def.id === 'rune_c3_sim').length;
            while (alive + pend.length < n) pend.push(G.time + 1);
            for (let j = pend.length - 1; j >= 0; j--) if (pend[j] <= G.time) { pend.splice(j, 1); spawn(); }
            updateGame(dt);
          }
        } finally { window.executeSkill = ex0; window.addMastery = am0; G.onDmg = null; Math.random = R0; Object.assign(U, U0); }
        const sec = G.time - t0;
        for (const k in by) by[k] = Math.round(by[k] / sec);
        return { dps: total / sec, by, casts };
      };
      window.advanceSim = () => {}; // หยุดลูปเกมจริง (rAF) ระหว่างรอบจำลอง — ไม่งั้นเวลาจริงที่ไหลระหว่างรอบ (ขึ้นกับภาระเครื่อง) ทำให้ผลแกว่ง
      G.player.options.sound = false; UI.msg = () => {}; UI.announce = () => {}; UI.splash = () => {}; window.saveGame = () => {};
      G.fastSim = true;
    });
  };
  await boot();

  // ---------- รายการ: Class 3 ทุกตัว → สกิลที่มีรูน (Oath = สกิลติดตัว, ★ = สกิลประจำตัว) ----------
  const tree = await p.evaluate(() => Object.values(THIRD_JOBS).map(j => [j, JOBS[j].skills.filter(id => !SKILLS[id].exp && Runes.list(id).length)
    .map(id => ({ id, runes: Runes.list(id).map(r => ({ id: r.id, name: r.name, intent: r.intent, oath: !!r.oath })) }))]));
  const rows = [], checks = [];
  const ok = (name, cond, info = '') => checks.push([name, !!cond, info]);
  ok('data: 12 Class 3, each with an Oath (2) + a ★ rune skill (2)', tree.length === 12 && tree.every(([, sk]) => sk.length === 2 && sk.every(s => s.runes.length === 2) && sk[0].runes.every(r => r.oath)), JSON.stringify(tree.map(([j, sk]) => j + ':' + sk.map(s => s.runes.length).join('/'))));
  const sim = async (job, runes, n, hp) => {
    let s = 0; const by = {}, casts = {};
    for (const seed of SEEDS) {
      const r = await p.evaluate(([j, ru, nn, ss, sd, h]) => C3RSIM(j, ru, nn, ss, sd, h), [job, runes, n, SECS, seed, hp]);
      s += r.dps; for (const k in r.by) by[k] = (by[k] || 0) + r.by[k] / SEEDS.length; for (const k in r.casts) casts[k] = (casts[k] || 0) + r.casts[k] / SEEDS.length;
    }
    return { dps: s / SEEDS.length, by, casts };
  };
  const fmt = d => (d >= 0 ? '+' : '') + d.toFixed(1) + '%';
  const t0 = Date.now();
  // แถวพิเศษ: Oath ที่ทำงานเมื่อ HP ต่ำ → วัดซ้ำที่ HP 40% (ฐานก็ 40%)
  const LOWHP = { 'oath_of_tyr.lost': 0.4 };
  for (const [job, sks] of tree) {
    if (ONLY.length && !ONLY.includes(job)) continue;
    if (job !== tree.find(([j]) => !ONLY.length || ONLY.includes(j))[0]) await boot();
    await p.evaluate(j => { C3RSIM(j, {}, 5, 20, 1, 0.6); C3RSIM(j, {}, 1, 20, 2, 0.6); }, job); // อุ่นเครื่อง: รอบแรกหลังเปิดหน้าเพี้ยน (ของที่โหลด/แคชครั้งแรก) — ทิ้งผล
    const base = {};
    const baseAt = async hp => base[hp] || (base[hp] = { b1: await sim(job, {}, 1, hp), b5: await sim(job, {}, 5, hp) });
    const { b1, b5 } = await baseAt(0.6);
    console.log(`\n== ${job}  baseline  single ${b1.dps.toFixed(1)}  pack ${b5.dps.toFixed(1)}`);
    console.log('   single by source', JSON.stringify(Object.fromEntries(Object.entries(b1.by).map(([k, v]) => [k, Math.round(v)]))));
    console.log('   pack   by source', JSON.stringify(Object.fromEntries(Object.entries(b5.by).map(([k, v]) => [k, Math.round(v)]))));
    if (process.env.SRC) console.log('   casts (single/pack)', JSON.stringify(Object.fromEntries(Object.entries(b1.casts).map(([k, v]) => [k, Math.round(v) + '/' + Math.round(b5.casts[k] || 0)]))));
    for (const sk of sks) for (const r of sk.runes) {
      for (const hp of [0.6].concat(LOWHP[r.id] ? [LOWHP[r.id]] : [])) {
        const B = await baseAt(hp);
        const s1 = await sim(job, { [sk.id]: r.id }, 1, hp), s5 = await sim(job, { [sk.id]: r.id }, 5, hp);
        const d1 = (s1.dps / B.b1.dps - 1) * 100, d5 = (s5.dps / B.b5.dps - 1) * 100;
        const inten = r.intent === 'single' ? [d1] : r.intent === 'pack' ? [d5] : [d1, d5];
        const ex = EXEMPT[r.id], lo = ex ? ex.floor : -BAND;
        const pass = inten.every(d => d >= lo && d <= BAND) && d1 <= CAP && d5 <= CAP && (hp !== 0.6 || (d1 + d5) / 2 <= MEAN); // แถว HP ต่ำ: ดีกว่าทุกฉากโดยตั้งใจ (จ่ายด้วยห้ามยา + ต้องยืน HP < 50%) → ไม่ใช้เกณฑ์เฉลี่ย
        const tag = r.id + (hp !== 0.6 ? `@${Math.round(hp * 100)}%HP` : '');
        rows.push({ job, skill: sk.id, rune: tag, name: r.name, oath: r.oath, intent: r.intent, hp, s1: s1.dps, s5: s5.dps, d1, d5, pass, exempt: !!ex });
        console.log(`   ${pass ? '✔' : '✘'} ${(r.oath ? 'Oath ' : '★ ') + sk.id.padEnd(17)} ${(r.name + (hp !== 0.6 ? ' @' + Math.round(hp * 100) + '%HP' : '')).padEnd(24)} ${r.intent.padEnd(6)} single ${s1.dps.toFixed(1).padStart(7)} (${fmt(d1)})  pack ${s5.dps.toFixed(1).padStart(7)} (${fmt(d5)})${ex ? '  [exempt ≥ ' + ex.floor + '%]' : ''}`);
        if (process.env.SRC) for (const [nm, x] of [['single', s1], ['pack', s5]]) console.log(`      ${nm} by source ${JSON.stringify(Object.fromEntries(Object.entries(x.by).map(([k, v]) => [k, Math.round(v)])))}  casts ${JSON.stringify(Object.fromEntries(Object.entries(x.casts).map(([k, v]) => [k, Math.round(v)])))}`);
        ok(`balance ${job}/${tag}`, pass, `${r.intent} single ${d1.toFixed(1)}% pack ${d5.toFixed(1)}%${ex ? ' (exempt floor ' + ex.floor + '%)' : ''}`);
      }
    }
    const rs = rows.filter(x => x.job === job && x.hp === 0.6), m = rs.reduce((a, x) => a + (x.d1 + x.d5) / 2, 0) / rs.length;
    console.log(`   ${job} overall (single+pack)/2 avg ${fmt(m)}  (info only)`);
  }
  for (const [id, e] of Object.entries(EXEMPT)) console.log(`   exempt ${id}: ${e.why} (floor ${e.floor}%)`);
  console.log(`\n(sim ${((Date.now() - t0) / 1000).toFixed(0)}s, ${SEEDS.length} seeds × ${SECS}s)`);
  fs.writeFileSync(path.join(process.env.RUNE_OUT || require('os').tmpdir(), 'rune_c3_dps.json'), JSON.stringify(rows, null, 1));

  await browser.close(); srv.close();
  for (const e of errors) ok('page error', false, e);
  let fail = 0;
  for (const [n, pass, info] of checks) { if (!pass) { fail++; console.log(`✘ ${n}${info !== '' ? `  (${info})` : ''}`); } }
  console.log(fail ? `\n${fail} FAILED of ${checks.length}` : `\nALL ${checks.length} PASSED`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
