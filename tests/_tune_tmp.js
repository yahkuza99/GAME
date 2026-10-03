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
      return { dps: total / sec, by, casts, st: { cast: pl.d.castMul, dex: pl.d.dex, int: pl.d.int, matk: pl.d.matkMin, wpn: pl.equip.weapon && pl.equip.weapon.id, sp: pl.d.maxSp } };
    };
    G.player.options.sound = false; UI.msg = () => {}; UI.announce = () => {}; UI.splash = () => {}; window.saveGame = () => {};
    G.fastSim = true;
  });

  // ---------- TUNER (scratch) ----------
  const SPEC = {
    'iron_body.retaliate': [['ib_ret', 'pack', 1.5]], 'iron_body.juggernaut': [['ib_jug', 'single', 1.5]],
    'shield_slam.shockwave': [['ss_shock', 'pack', 1.5]], 'shield_slam.charge': [['ss_charge', 'single', 1.5]],
    'war_cry.challenge': [['cry_mark', 'avg', 1]],
    'whirlwind.vortex': [['ww_vortex', 'pack', 1]], 'whirlwind.bladestorm': [['ww_storm_tick', 'avg', 1]],
    'shield_throw.ricochet': [['st_bounce', 'pack', 1.5]], 'shield_throw.boomerang': [['st_boom', 'single', 1.5]],
    'valhalla_oath.echo': [['vo_echo', 'avg', 1]], 'valhalla_oath.resolve': [['vo_res', 'avg', 1]],
    'rune_mastery.overcharge': [['rm_echo', 'single', 1.5]], 'rune_mastery.leyline': [['rm_ley', 'avg', 1]],
    'fire_rune.split': [['fr_shard', 'pack', 1.5]], 'fire_rune.kindle': [['fr_mark', 'single', 1.5]],
    'ice_rune.lance': [['ir_lance', 'pack', 1.5]], 'ice_rune.shatter': [['ir_shat', 'single', 1.5]],
    'thunder_rune.storm': [['tr_storm', 'pack', 1.5]], 'thunder_rune.focus': [['tr_focus', 'single', 1.5]],
    'earth_rune.fissure': [['er_fis', 'pack', 1.5]], 'earth_rune.boulder': [['er_boulder', 'single', 1.5]],
    'runic_ward.feedback': [['rw_fb', 'avg', 1]],
    'eagle_eye.focus': [['ee_focus', 'single', 1.5]], 'eagle_eye.scatter': [['ee_scatter', 'pack', 1.5]],
    'piercing_arrow.volley': [['pa_vol', 'single', 1.5]], 'piercing_arrow.fan': [['pa_fan', 'pack', 1.5]],
    'wolf_companion.twins': [['wc_twin', 'pack', 1.5]], 'wolf_companion.alpha': [['wc_mark', 'single', 1.5]],
    'blast_trap.shrapnel': [['bt_sh', 'pack', 1.5]], 'blast_trap.hurl': [['bt_hurl', 'single', 1.5]],
    'charge_arrow.harpoon': [['ca_harp', 'single', 1.5]], 'charge_arrow.concussion': [['ca_conc', 'pack', 1.5]],
    'hunters_rhythm.flurry': [['hr_fl', 'single', 1.5]], 'hunters_rhythm.momentum': [['hr_mom', 'avg', 1]],
    'sanctuary.radiance': [['sa_rad', 'single', 1.5]],
    'light_of_freyja.favor': [['lf_fav', 'single', 1.5]],
    'blessing_of_odin.ravens': [['bo_raven', 'single', 1.5]], 'blessing_of_odin.gungnir': [['bo_storm', 'pack', 1.5]],
    'holy_spear.lance': [['hs_lance', 'pack', 1.5]], 'holy_spear.judgment': [['hs_judg', 'single', 1.5]],
    
    'freyjas_grace.smite': [['fg_smite', 'single', 1.5]],
    'shadow_step.afterimage': [['ss_after', 'pack', 1.5]], 'shadow_step.rhythm': [['ss_rhythm', 'single', 1.5]],
    'backstab.leap': [['bs_leap', 'single', 1.5]], 'backstab.arc': [['bs_arc', 'pack', 1.5]],
    'smoke_veil.bomb': [['sv_bomb', 'pack', 1.5]], 'smoke_veil.dance': [['sv_dance', 'single', 1.5]],
    'venom_blade.envenom': [['vb_env', 'single', 1.5]],
    'throwing_knife.fan': [['tk_fan', 'pack', 1.5]], 'throwing_knife.expose': [['tk_mark', 'single', 1.5]],
    'lokis_gambit.double': [['lg_dbl', 'single', 1.5]], 'lokis_gambit.mirage': [['lg_mir', 'pack', 1.5]],
    'wolf_blood.price': [['wb_price', 'avg', 1]], 'wolf_blood.feral': [['wb_feral', 'pack', 1.5]],
    'rage_strike.cleave': [['rs_cleave', 'pack', 1.5]], 'rage_strike.execute': [['rs_exe_hi', 'single', 1.5]],
    'blood_frenzy.bloodlust': [['bf_lust', 'single', 1.5]], 'blood_frenzy.rampage': [['bf_ramp', 'pack', 1.5]],
    'howl.rend': [['hw_tick', 'pack', 1.5]], 'howl.challenge': [['hw_mark', 'single', 1.5]],
    'axe_throw.boomerang': [['ax_boom', 'pack', 1.5]], 'axe_throw.leap': [['ax_leap', 'single', 1.5]],
    'bloodthirst.hemorrhage': [['bt_hem', 'single', 1.5]], 'bloodthirst.spray': [['bt_spray', 'pack', 1.5]],
  };
  const tree = await p.evaluate(() => Object.fromEntries(FIRST_JOBS.map(j => [j, JOBS[j].skills.map(id => ({ id, runes: Runes.list(id).map(r => ({ id: r.id, name: r.name, intent: r.intent })) }))])));
  const sim = async (job, runes, n) => {
    let s = 0;
    for (const seed of SEEDS) s += await p.evaluate(([j, ru, nn, ss, sd]) => RSIM(j, ru, nn, ss, sd).dps, [job, runes, n, SECS, seed]);
    return s / SEEDS.length;
  };
  const getK = k => p.evaluate(k => Runes.K[k], k), setK = (k, v) => p.evaluate(([k, v]) => { Runes.K[k] = v; }, [k, v]);
  const out = {};
  for (const job of Object.keys(tree)) {
    if (ONLY.length && !ONLY.includes(job)) continue;
    const b1 = await sim(job, {}, 1), b5 = await sim(job, {}, 5);
    console.log(`== ${job} base ${b1.toFixed(1)} / ${b5.toFixed(1)}`);
    for (const sk of tree[job]) for (const r of sk.runes) {
      const ONLY_R = (process.argv[4] || '').split(',').filter(Boolean); if (ONLY_R.length && !ONLY_R.includes(r.id)) continue;
      const stages = SPEC[r.id]; if (!stages) { console.log('  (no knob)', r.id); continue; }
      for (const [key, scen, tgt] of stages) {
        const f = async () => {
          const ru = { [sk.id]: r.id };
          if (scen === 'single') return ((await sim(job, ru, 1)) / b1 - 1) * 100;
          if (scen === 'pack') return ((await sim(job, ru, 5)) / b5 - 1) * 100;
          return (((await sim(job, ru, 1)) / b1 - 1) * 100 + ((await sim(job, ru, 5)) / b5 - 1) * 100) / 2;
        };
        // ค้นหาแบบมีขอบเขต (สมมติยิ่ง K มากยิ่งแรง): ขยายจนคร่อมเป้า แล้วแบ่งช่วงแบบ regula falsi
        const pts = []; const ev = async k => { k = +k.toPrecision(3); await setK(key, k); const v = await f(); pts.push([k, v]); return v; };
        let k0 = await getK(key), f0 = await ev(k0);
        let lo = null, hi = null; // [k, f] ที่ f < tgt / f > tgt
        const upd = (k, v) => { if (v < tgt && (!lo || k > lo[0])) lo = [k, v]; if (v >= tgt && (!hi || k < hi[0])) hi = [k, v]; };
        upd(k0, f0);
        for (let it = 0; it < 6 && !(lo && hi) && Math.abs(f0 - tgt) > 0.8; it++) { k0 = hi ? k0 * 0.55 : k0 * 1.7; if (k0 < 0.002 || k0 > 60) break; f0 = await ev(k0); upd(k0, f0); }
        for (let it = 0; it < 7 && lo && hi; it++) {
          const best = pts.reduce((a, b) => (Math.abs(b[1] - tgt) < Math.abs(a[1] - tgt) ? b : a));
          if (Math.abs(best[1] - tgt) <= 0.8 || hi[0] - lo[0] < Math.max(0.003, lo[0] * 0.01)) break;
          let k = lo[0] + (tgt - lo[1]) * (hi[0] - lo[0]) / Math.max(1e-6, hi[1] - lo[1]);
          k = Math.min(hi[0] - (hi[0] - lo[0]) * 0.1, Math.max(lo[0] + (hi[0] - lo[0]) * 0.1, k));
          const v = await ev(k); upd(k, v);
        }
        const best = pts.reduce((a, b) => (Math.abs(b[1] - tgt) < Math.abs(a[1] - tgt) ? b : a));
        let k1 = best[0], f1 = best[1];
        out[key] = +k1.toPrecision(3); await setK(key, out[key]);
        console.log(`  ${r.id.padEnd(28)} ${key.padEnd(12)} ${scen.padEnd(6)} → ${out[key]}  (${f1.toFixed(1)}%)`);
      }
    }
  }
  fs.writeFileSync(path.join(process.env.RUNE_OUT || '/tmp', 'tuned_' + (ONLY.join('_') || 'all') + '.json'), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out));
  await browser.close(); srv.close();
  if (errors.length) console.log('ERRORS', errors.slice(0, 5));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
