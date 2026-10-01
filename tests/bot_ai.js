'use strict';
// ============================================================
//  ทดสอบสมองบอท (Playwright): เลือกเป้า / ข้ามตัวที่ไปไม่ถึง / สกิลวงกว้าง / ต่อบัฟ / ถอยหนี / ติด / นั่งพัก / เก็บของ
//  รัน:  NODE_PATH=$(npm root -g) node tests/bot_ai.js   (เปิดเซิร์ฟเวอร์เอง)
//  วัดผลการล่าจริงทุกอาชีพดู tests/job_audit.js
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
  await p.click('#au-offline'); await p.click('#btn-new'); await p.fill('#cr-name', 'BotAI'); await p.click('#cr-start'); await p.waitForTimeout(1500);
  await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {});

  const checks = await p.evaluate(() => {
    const out = [];
    const ok = (name, cond, info = '') => out.push([name, !!cond, info]);
    const pl = G.player;
    // ตั้งอาชีพเต็มสกิล + สเตตัสแบบผู้เล่นทั่วไป แล้วไปยืนกลางที่โล่งของ Wolfwood โดยไม่มีมอนอื่น
    const setup = (job, plan) => {
      document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden'));
      Bot.toggle(false);
      pl.dead = false; pl.job = job; pl.baseLv = 25; pl.jobLv = JOBS[job].jobMax; pl.skills = {}; pl.buffs = {}; pl.cds = {}; pl.skillReadyAt = 0; pl.cast = null; pl.stunUntil = 0;
      for (const id of JOBS[job].skills) if (SKILLS[id] && !SKILLS[id].noLearn) pl.skills[id] = SKILLS[id].max;
      const st = { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 }; st[plan[0]] = 55; st[plan[1]] = 30; pl.stats = st;
      unequipInvalid(); if (!pl.inventory.find(e => e.id === JOB_STARTER[job])) addItem(JOB_STARTER[job], 1, true);
      equipItem(pl.inventory.find(e => e.id === JOB_STARTER[job]), true);
      changeMap('wolfwood', 28.5, 28.5);
      // หาช่องที่รอบตัว 6 ช่องเดินได้หมด
      let spot = null;
      for (let r = 0; r < 20 && !spot; r++) for (let y = 28 - r; y <= 28 + r && !spot; y++) for (let x = 28 - r; x <= 28 + r && !spot; x++) {
        let open = true;
        for (let dy = -6; dy <= 6 && open; dy++) for (let dx = -6; dx <= 6 && open; dx++) if (!G.map.walkable(x + dx, y + dy)) open = false;
        if (open && !G.map.portals.some(q => U.dist(q.x, q.y, x, y) < 12)) spot = { x, y };
      }
      teleportPlayer(spot.x + 0.5, spot.y + 0.5);
      G.mobs = []; G.drops = []; G.allies = []; G.traps = []; G.respawns = [];
      recalc(); pl.hp = pl.d.maxHp; pl.sp = pl.d.maxSp;
      const c = Bot.cfg(); c.style = 'skills'; c.leash = false; c.skills = {}; c.skillHp = {}; c.skipMobs = {}; c.rest = true; c.useBuffs = true;
      Bot.toggle(true); Bot.nextThink = 0;
      return spot;
    };
    const mob = (id, dx, dy, chase) => { const m = spawnMob(id, { x: Math.floor(pl.x) + dx, y: Math.floor(pl.y) + dy }); m.nextWander = 1e9; if (chase) { m.state = 'chase'; m.nextAtk = G.time + 99; } return m; };
    const think = () => { Bot.nextThink = 0; Bot.update(); };
    const run = sec => { for (let i = 0; i < sec * 15; i++) updateGame(1 / 15); };

    // 1) ตัวที่กำลังตีเราได้ก่อน แม้ตัวเฉย ๆ จะใกล้กว่า
    setup('einherjar', ['str', 'vit']);
    const idle = mob('ashtail', 2, 0), att = mob('fenrir_pup', -5, 0, true);
    think();
    ok('threat first', Bot.tgt === att, Bot.tgt && Bot.tgt.def.id);

    // 2) ตัวที่เดินไปไม่ถึง → ข้าม (blacklist) แล้วเลือกตัวถัดไป
    setup('einherjar', ['str', 'vit']);
    const far = mob('ashtail', 6, 0), near = mob('ashtail', 3, 0);
    const fp = window.findPath;
    window.findPath = (map, sx, sy, tx, ty, n) => (tx === Math.floor(near.x) && ty === Math.floor(near.y)) ? [] : fp(map, sx, sy, tx, ty, n);
    think();
    window.findPath = fp;
    ok('skip unreachable', Bot.tgt === far && Bot.blacklist.has(near), Bot.tgt && U.dist(Bot.tgt.x, Bot.tgt.y, pl.x, pl.y).toFixed(1));

    // 3) ติด: ไม่ขยับและเป้าเลือดไม่ลด ~3 วิ → ข้ามตัวนั้น
    setup('einherjar', ['str', 'vit']);
    const stuckM = mob('ashtail', 5, 0);
    think();
    window.findPath = () => [];
    run(4);
    window.findPath = fp;
    ok('stuck target blacklisted', Bot.blacklist.has(stuckM) && Bot.tgt !== stuckM);

    // 4) สกิลวงกว้างเมื่อรุม ≥2 ตัว • ตัวเดียวใช้สกิลเดี่ยว • ตีปกติก็ตายแล้วไม่เปลือง SP
    setup('berserker', ['str', 'agi']);
    const a1 = mob('ashtail', 1, 0, true);
    { const k = Bot.pickSkill(a1, [a1], 100, 100), D = k && SKILLS[k].dmg; ok('single target → single skill', !!D && !D.area, k); }
    const a2 = mob('ashtail', 0, 1, true);
    ok('2 adjacent → aoe', Bot.pickSkill(a1, [a1, a2], 100, 100) === 'howl', Bot.pickSkill(a1, [a1, a2], 100, 100));
    a2.state = 'idle';
    ok('aoe not used if it pulls an idle mob', Bot.pickSkill(a1, [a1], 100, 100) !== 'howl');
    a1.hp = 1; pl.nextAttack = 0;
    ok('no skill on a mob a basic hit finishes', Bot.pickSkill(a1, [a1], 100, 100) === null);

    // 5) ต่อบัฟเมื่อเหลือ < 5 วิ (ไม่ต่อถ้ายังเหลือเยอะ)
    setup('berserker', ['str', 'agi']);
    pl.buffs.blood_frenzy = { lv: 5, until: G.time + 30 }; recalc();
    think();
    const kept = pl.buffs.blood_frenzy.until - G.time > 25 && !pl.cds.blood_frenzy;
    pl.buffs.blood_frenzy.until = G.time + 3; pl.skillReadyAt = 0;
    think();
    ok('buff refreshed only when < 5s left', kept && pl.buffs.blood_frenzy.until - G.time > 30);

    // 6) สกิลใหม่ที่เพิ่มด้วยฟิลด์เดิม (buff ใส่ตัวเอง / ดาเมจวงรอบเป้า) ใช้ได้ทันที
    setup('runecaster', ['int', 'dex']);
    SKILLS.test_nova = { name: 'Test Nova', max: 1, type: 'active', target: 'enemy', range: 9, sp: () => 10, delay: 500, dmg: { type: 'magic', element: 'fire', mult: () => 3, area: 2, at: 'target' } };
    SKILLS.test_aura = { name: 'Test Aura', max: 1, type: 'active', target: 'self', sp: () => 5, delay: 300, buff: { dur: () => 60, stats: () => ({ int: 5 }) } };
    pl.skills.test_nova = 1; pl.skills.test_aura = 1;
    const n1 = mob('ashtail', 6, 0, true), n2 = mob('ashtail', 6, 1, true);
    ok('new skill roles', Bot.role('test_aura') === 'buff' && Bot.role('test_nova') === 'attack');
    ok('new area skill picked for a cluster', Bot.pickSkill(n1, [n1, n2], 100, 100) === 'test_nova', Bot.pickSkill(n1, [n1, n2], 100, 100));
    think();
    ok('new self buff cast', !!pl.buffs.test_aura);
    delete pl.skills.test_nova; delete pl.skills.test_aura; delete SKILLS.test_nova; delete SKILLS.test_aura;

    // 7) สายธนู: มอนช้าประชิด → ถอยไปที่โล่ง แล้วกลับมายิงต่อ
    setup('wildhunter', ['dex', 'agi']);
    const slow = mob('mossback', 1, 0, true); slow.x = pl.x + 1; slow.y = pl.y;
    Bot.setTgt(slow); G.allies = [{ until: G.time + 99 }]; // มีหมาป่าอยู่แล้ว (ไม่ต้องเรียก)
    pl.buffs = {};
    for (let i = 0; i < 3 && !(Bot.kiteUntil > G.time); i++) { pl.skillReadyAt = G.time + 5; think(); }
    const d0 = U.dist(pl.x, pl.y, slow.x, slow.y);
    G.allies = [];
    ok('bow kites from adjacent slow melee', Bot.kiteUntil > G.time && pl.path.length > 0 && !pl.target, `path ${pl.path.length}`);
    for (let i = 0; i < 12; i++) { slow.stunUntil = G.time + 1; updateGame(1 / 15); }
    ok('kite gains distance', U.dist(pl.x, pl.y, slow.x, slow.y) > d0 + 1.5, U.dist(pl.x, pl.y, slow.x, slow.y).toFixed(1));

    // 8) นั่งพัก: สายเวท SP หมด → ถ้ามีมอนตีก่อนอยู่ใกล้ ย้ายออกห่างก่อนนั่ง
    setup('runecaster', ['int', 'dex']);
    pl.inventory = pl.inventory.filter(e => !SP_POTS.includes(e.id));
    const tusk = mob('tuskboar', 5, 0); pl.sp = 1;
    think();
    ok('rest: move away from aggressive mob first', Bot.resting && pl.path.length > 0 && !pl.sitting);
    run(4);
    ok('rest: then sit far from it', Bot.resting && pl.sitting && U.dist(pl.x, pl.y, tusk.x, tusk.y) >= 6, U.dist(pl.x, pl.y, tusk.x, tusk.y).toFixed(1));
    tusk.state = 'chase'; tusk.nextAtk = G.time + 99; think();
    ok('rest: stand up when attacked', !Bot.resting && !pl.sitting && Bot.tgt === tusk);

    // 9) สายตีปกติแรง (มีด) SP หมด → ไม่นั่งรอ SP
    setup('trickster', ['agi', 'str']);
    pl.inventory = pl.inventory.filter(e => !SP_POTS.includes(e.id));
    mob('ashtail', 6, 0); pl.sp = 0;
    think();
    ok('melee keeps fighting with no SP', !Bot.resting && !!Bot.tgt);

    // 10) เก็บของก่อนหาเป้าใหม่ (ไม่มีใครตี) • มีตัวตีอยู่ → สู้ก่อน
    setup('einherjar', ['str', 'vit']);
    pl.options.autoLoot = false;
    dropItemOnGround('moon_fur', pl.x + 3, pl.y);
    mob('ashtail', 6, 0);
    think();
    ok('loot drop when safe', !!pl.pickTarget);
    const at2 = mob('ashtail', 2, 2, true);
    think();
    ok('fight attacker before looting', !pl.pickTarget && Bot.tgt === at2);
    pl.options.autoLoot = true;

    // 11) เปิดบอทล่าจริง 60 วิ ไม่มี error
    setup('volva', ['int', 'vit']);
    changeMap('wolfwood', 28.5, 28.5); Bot.toggle(true);
    run(60);
    ok('hunts for 60s', Bot.stats.kills > 0, `kills ${Bot.stats.kills}`);
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
