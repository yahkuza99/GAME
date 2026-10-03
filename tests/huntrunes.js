'use strict';
// ============================================================
//  ทดสอบ Hunt Rune (js/huntrunes.js) ด้วย Playwright:
//  เงื่อนไขแต่ละรูน (ทำงานเฉพาะตอนเข้าเงื่อนไข) • เพดาน +45% • ธาตุ Endow = ELEM_TABLE • Lv ปลดช่อง • ล็อกระหว่างต่อสู้
//  • เซฟ/โหลด (เซฟเก่า/เซฟเสีย) • Build Code + Loadouts ไป-กลับ • Human Slayer ทำงานเฉพาะลานประลอง • บอท/Battle Script • UI (คอม + มือถือ)
//  รัน:  NODE_PATH=$(npm root -g) node tests/huntrunes.js   (เปิดเซิร์ฟเวอร์เอง)
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
async function start(browser, port, vp, mobile) {
  const ctx = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile });
  const p = await ctx.newPage();
  p._errors = [];
  p.on('pageerror', e => p._errors.push(e.message));
  await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(1200);
  await p.click('#au-offline'); await p.click('#btn-new'); await p.fill('#cr-name', 'Hunter'); await p.click('#cr-start'); await p.waitForTimeout(1500);
  await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {});
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 8000, polling: 250 }).catch(() => {});
  await p.waitForTimeout(500);
  return p;
}

(async () => {
  const srv = await serve();
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  else if (fs.existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(opts);
  const port = srv.address().port;
  const p = await start(browser, port, { width: 1100, height: 720 }, false);

  const checks = await p.evaluate(async () => {
    const out = [];
    const ok = (name, cond, info = '') => out.push([name, !!cond, typeof info === 'string' ? info : JSON.stringify(info)]);
    const HR = HuntRunes, LO = Loadouts, pl = G.player;
    const msgs = []; const msg0 = UI.msg.bind(UI); UI.msg = (t, c) => { msgs.push(String(t)); return msg0(t, c); };
    UI.confirm = async () => true;
    document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden'));
    Bot.toggle(false);
    pl.job = 'einherjar'; pl.baseLv = 40; pl.jobLv = 10; pl.stats = { str: 50, agi: 20, vit: 40, int: 30, dex: 20, luk: 5 }; pl.combatAt = -99; pl.zeny = 1e6;
    recalc();
    const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
    // มอนจำลอง: DEF/VIT/MDEF/Lv = 0 → ดาเมจเป็นสัดส่วนตรงกับตัวคูณ (เทียบได้แม่นยำ)
    const fake = (race, element, o = {}) => Object.assign({ uid: -1, x: pl.x + 1, y: pl.y, hp: 1000, maxHp: 1000, dead: false, state: 'idle', path: [],
      def: { id: 'fake', name: 'Fake', lv: 0, def: 0, mdef: 0, vit: 0, flee: 0, race, element, boss: !!o.boss } }, o.m || {});
    const rnd0 = { rand: U.rand, randi: U.randi, chance: U.chance };
    U.rand = (a, b) => (a + b) / 2; U.randi = a => a; U.chance = () => true;
    const phys = (m, el) => physHit(m, 1000, { skill: true, sureHit: true, element: el }).dmg; // ไม่คริ (skill) ไม่พลาด (sureHit) • ×1000 = ปัดเศษไม่มีผล
    const mag = (m, el) => magicHit(m, 1000, el).dmg;
    const clear = () => { pl.hrunes = [null, null]; };
    const eq = (a, b) => { clear(); pl.hrunes = [a || null, b || null]; };
    const base = (m, el) => { const s = pl.hrunes; pl.hrunes = [null, null]; const r = [phys(m, el), mag(m, el)]; pl.hrunes = s; return r; };
    const ratio = (m, el) => { const b = base(m, el); return [phys(m, el) / b[0], mag(m, el) / b[1]]; };

    // ---------- 0) ข้อมูล + ร้าน ----------
    const ids = HR.LIST.map(d => d.id);
    ok('catalogue: 8 Slayer (7 races + Human) + 6 Endow + 4 Conditional', HR.LIST.filter(d => d.kind === 'slayer').length === 8 && HR.LIST.filter(d => d.kind === 'endow').length === 6 && HR.LIST.filter(d => d.kind === 'cond').length === 4, ids);
    ok('items: new ids, type hrune, English only, valid rarity', ids.every(id => ITEMS[id] && ITEMS[id].type === 'hrune' && !/[฀-๿]/.test(ITEMS[id].name + ITEMS[id].desc) && RARITY[ITEMS[id].rarity]));
    ok('prices: Slayer/Endow 1500–4000, Conditional 6000', HR.LIST.every(d => d.kind === 'cond' ? d.price === 6000 : d.price >= 1500 && d.price <= 4000), HR.LIST.map(d => d.id + ':' + d.price));
    pl.hrunesOwn = []; pl.zeny = 1000;
    ok('buy: not enough Volt refused', !HR.buy('hr_slay_brute') && !HR.owns('hr_slay_brute') && pl.zeny === 1000);
    pl.zeny = 1e6;
    for (const id of ids) HR.buy(id);
    const spent = 1e6 - pl.zeny, total = HR.LIST.reduce((s, d) => s + d.price, 0);
    ok('buy: every rune once, Volt deducted exactly', HR.own().length === ids.length && spent === total, { spent, total });
    ok('buy: owning twice is refused (no double charge)', !HR.buy('hr_slay_brute') && pl.zeny === 1e6 - total);
    ok('runes are not inventory items (cannot be sold/dropped/traded)', !pl.inventory.some(e => ITEMS[e.id].type === 'hrune'));

    // ---------- 1) แต่ละรูนทำงานเฉพาะตอนเข้าเงื่อนไข ----------
    const races = ['brute', 'plant', 'insect', 'undead', 'demon', 'angel', 'formless'];
    const slayBad = [];
    for (const r of races) {
      eq('hr_slay_' + r);
      for (const r2 of [...races, 'human']) {
        const m = fake(r2, 'neutral'), [kp, km] = ratio(m), want = r === r2 ? 1.2 : 1, h = HR.hit(m);
        if (!near(kp, want, 0.002) || !near(km, want, 0.002) || (want > 1) !== !!h.tags) slayBad.push(`${r} vs ${r2}: ${kp.toFixed(3)}/${km.toFixed(3)}`);
      }
    }
    ok('Slayer: +20% phys AND magic only vs its own race (7 races × 8 targets)', !slayBad.length, slayBad.slice(0, 6));
    eq('hr_giant');
    const boss = fake('brute', 'neutral', { boss: true }), mvp = fake('brute', 'neutral', { m: { isMvp: true } }), wb = fake('brute', 'neutral', { m: { isWB: true } }), norm = fake('brute', 'neutral');
    ok('Giant Slayer: +25% vs boss / MVP / Ancient', [boss, mvp, wb].every(m => near(ratio(m)[0], 1.25, 0.002) && near(ratio(m)[1], 1.25, 0.002)));
    ok('Giant Slayer: −10% vs normal monsters (no glyph)', near(ratio(norm)[0], 0.9, 0.002) && !HR.hit(norm).tags);
    eq('hr_exec');
    const low = fake('plant', 'neutral', { m: { hp: 290 } }), mid = fake('plant', 'neutral', { m: { hp: 310 } });
    ok('Executioner: +30% under 30% HP, nothing at 31%', near(ratio(low)[0], 1.3, 0.002) && near(ratio(mid)[0], 1, 1e-9) && !HR.hit(mid).tags);
    eq('hr_ambush');
    const full = fake('plant', 'neutral'), hurt = fake('plant', 'neutral', { m: { hp: 999 } });
    ok('Ambusher: +25% vs full-HP target only', near(ratio(full)[0], 1.25, 0.002) && near(ratio(hurt)[0], 1, 1e-9));
    const real = spawnMob('leafworm', { x: Math.floor(pl.x) + 2, y: Math.floor(pl.y) }); real.hp = real.maxHp = 1e7;
    const r1 = physHit(real, 1, { skill: true, sureHit: true }); applyHit(real, r1, { src: 'test' });
    const r2 = physHit(real, 1, { skill: true, sureHit: true });
    ok('Ambusher: first hit only (second hit on the same target gets nothing)', !!r1.hr && !r2.hr, { first: !!r1.hr, second: !!r2.hr });
    real.dead = true; G.mobs = G.mobs.filter(m => m !== real);
    eq('hr_pack');
    const keep = G.mobs.slice(), at = (dx, dy) => fake('plant', 'neutral', { m: { x: pl.x + dx, y: pl.y + dy } });
    G.mobs = [...keep.filter(m => m.def.dummy || m.isPlayer), at(1, 0), at(0, 2)];
    const t2 = near(ratio(full)[0], 1, 1e-9);
    G.mobs.push(at(4, 0)); const t2b = near(ratio(full)[0], 1, 1e-9);
    G.mobs.push(at(-2, -2)); const t3 = near(ratio(full)[0], 1.15, 0.002);
    G.mobs = keep;
    ok('Pack Breaker: +15% only with 3+ enemies within 3 cells', t2 && t2b && t3, { t2, t2b, t3 });

    // ---------- 2) เพดาน +45% และการซ้อน ----------
    eq('hr_slay_brute', 'hr_giant');
    const bossLow = fake('brute', 'neutral', { boss: true, m: { hp: 100 } });
    const capR = ratio(boss);
    ok('cap: Slayer ×1.2 × Giant ×1.25 = 1.5 → capped at +45%', near(capR[0], 1.45, 0.002) && near(capR[1], 1.45, 0.002) && HR.hit(boss).tags.length === 2, capR);
    eq('hr_exec', 'hr_giant');
    ok('cap: Executioner × Giant on a low-HP boss also capped at 1.45', near(HR.hit(bossLow).k, 1.45, 1e-9));
    eq('hr_slay_plant', 'hr_exec');
    ok('stacking is multiplicative below the cap (1.2 × 1.3 = 1.56 → 1.45; 1.2 alone = 1.2)', near(HR.hit(fake('plant', 'neutral', { m: { hp: 100 } })).k, 1.45, 1e-9) && near(HR.hit(fake('plant', 'neutral')).k, 1.2, 1e-9));
    eq('hr_slay_plant', 'hr_ambush');
    ok('stacking: Slayer 1.2 × Ambusher 1.25 = 1.5 → 1.45', near(HR.hit(fake('plant', 'neutral')).k, 1.45, 1e-9));
    clear(); pl.combatAt = -99;
    HR.set(0, 'hr_slay_brute', true); const dupOk = HR.set(1, 'hr_slay_brute', true);
    ok('same rune cannot sit in both slots (moves instead of stacking)', dupOk && pl.hrunes[1] === 'hr_slay_brute' && pl.hrunes[0] === null);

    // ---------- 3) Endow = ELEM_TABLE ----------
    const els = Object.keys(ELEM_THAI), endBad = [];
    for (const d of HR.LIST.filter(x => x.kind === 'endow')) {
      eq(d.id);
      for (const de of els) {
        const m = fake('plant', de), want = elemMod(d.elem, de);
        const bp = (() => { const s = pl.hrunes; pl.hrunes = [null, null]; const v = phys(m); pl.hrunes = s; return v; })();
        const got = phys(m), gotM = mag(m, null), bm = (() => { const s = pl.hrunes; pl.hrunes = [null, null]; const v = mag(m, null); pl.hrunes = s; return v; })();
        const okP = want === 0 ? got === 0 : near(got / (bp / elemMod('neutral', de)), want, 0.003);
        const okM = want === 0 ? gotM === 0 : near(gotM / (bm / elemMod('neutral', de)), want, 0.003);
        if (!okP || !okM) endBad.push(`${d.elem}→${de}: ${got}/${bp} ${gotM}/${bm} want ${want}`);
      }
    }
    ok('Endow: basic/no-element damage × ELEM_TABLE for every element pair (6 × ' + els.length + ')', !endBad.length, endBad.slice(0, 5));
    eq('hr_endow_fire');
    ok('Endow: fire vs earth ×1.5, fire vs water ×0.75 (real trade-off)', near(ratio(fake('plant', 'earth'))[0], 1.5, 0.003) && near(ratio(fake('plant', 'water'))[0], 0.75, 0.003));
    ok('Endow: skills with their own element keep it', HR.hit(fake('plant', 'earth'), 'water').el === 'water' && near(phys(fake('plant', 'fire'), 'water') / base(fake('plant', 'fire'), 'water')[0], 1, 1e-9));
    const wolf = Object.assign(fake('brute', 'earth'), { def: Object.assign({}, MOBS.ashtail) });
    ok('bot estimate follows Endow element', near(Bot.physEst(wolf, 100) / (() => { const s = pl.hrunes; pl.hrunes = [null, null]; const v = Bot.physEst(wolf, 100); pl.hrunes = s; return v; })(), 1.5, 0.05));
    clear(); pl.combatAt = -99;
    HR.set(0, 'hr_endow_fire', true);
    ok('only one Endow can be active', !HR.set(1, 'hr_endow_water', true) && pl.hrunes[1] === null);

    // ---------- 4) Lv ปลดช่อง ----------
    clear(); pl.baseLv = 14; recalc();
    const l14 = HR.set(0, 'hr_slay_brute', true);
    pl.baseLv = 15; recalc();
    const l15 = HR.set(0, 'hr_slay_brute', true), l15b = HR.set(1, 'hr_exec', true);
    pl.baseLv = 34; recalc(); const l34 = HR.set(1, 'hr_exec', true);
    pl.baseLv = 35; recalc(); const l35 = HR.set(1, 'hr_exec', true);
    ok('unlock: slot I at Base Lv 15, slot II at Base Lv 35', !l14 && l15 && !l15b && !l34 && l35, { l14, l15, l15b, l34, l35 });
    pl.hrunes = ['hr_slay_brute', 'hr_exec']; pl.baseLv = 20;
    ok('a locked slot never applies (even if a save holds a rune there)', HR.active().length === 1 && near(HR.hit(fake('plant', 'neutral', { m: { hp: 10 } })).k, 1, 1e-9));
    pl.baseLv = 40; recalc();

    // ---------- 5) ล็อกระหว่างต่อสู้ ----------
    clear();
    pl.combatAt = G.time; msgs.length = 0;
    const inFight = HR.set(0, 'hr_slay_plant');
    ok('combat lock: cannot swap within 5 s of combat (same rule as Runes)', !inFight && pl.hrunes[0] === null && msgs.some(t => /combat|ต่อสู้/.test(t)) && HR.combatLeft() === Runes.combatLeft());
    pl.combatAt = G.time - 5.1;
    ok('combat lock: free again after 5 s', HR.set(0, 'hr_slay_plant'));
    const dm = G.mobs.find(m => m.def.dummy); pl.combatAt = -99; damageMob(dm, 1);
    ok('combat lock: hitting something starts the lock', !HR.canChange() && !HR.set(0, null, true));
    pl.combatAt = -99;

    // ---------- 6) เซฟ / โหลด ----------
    clear(); HR.set(0, 'hr_endow_holy', true); HR.set(1, 'hr_giant', true);
    const data = JSON.parse(JSON.stringify(saveData()));
    ok('save: hrunes + hrunesOwn persisted', JSON.stringify(data.hrunes) === '["hr_endow_holy","hr_giant"]' && data.hrunesOwn.length === ids.length && SAVE_FIELDS.includes('hrunes'));
    const keepP = G.player;
    const back = loadGameFrom(data);
    const rt = JSON.stringify(back.hrunes) === '["hr_endow_holy","hr_giant"]' && back.hrunesOwn.length === ids.length;
    const old = Object.assign({}, data); delete old.hrunes; delete old.hrunesOwn;
    const oldP = loadGameFrom(old);
    const oldOk = JSON.stringify(oldP.hrunes) === '[null,null]' && Array.isArray(oldP.hrunesOwn) && !oldP.hrunesOwn.length;
    const bad = loadGameFrom(Object.assign({}, data, { hrunes: ['__proto__', 'hr_endow_fire', 'x'], hrunesOwn: ['hr_endow_fire', 'hr_endow_water', 'nope', 'hr_endow_fire', { a: 1 }] }));
    const bad2 = loadGameFrom(Object.assign({}, data, { hrunes: ['hr_endow_fire', 'hr_endow_water'], hrunesOwn: ['hr_endow_fire', 'hr_endow_water'] }));
    const bad3 = loadGameFrom(Object.assign({}, data, { hrunes: ['hr_slay_brute', null], hrunesOwn: [] }));
    const bad4 = loadGameFrom(Object.assign({}, data, { hrunes: 'junk', hrunesOwn: { length: 3 } }));
    G.player = keepP;
    ok('save: round trip', rt);
    ok('save: old saves without Hunt Runes load (empty)', oldOk, { h: oldP.hrunes, o: oldP.hrunesOwn });
    ok('save: corrupt data sanitized (unknown ids, duplicates, 2 Endows, not owned, wrong types)',
      JSON.stringify(bad.hrunes) === '[null,"hr_endow_fire"]' && JSON.stringify(bad.hrunesOwn) === '["hr_endow_fire","hr_endow_water"]'
      && JSON.stringify(bad2.hrunes) === '["hr_endow_fire",null]' && JSON.stringify(bad3.hrunes) === '[null,null]' && JSON.stringify(bad4.hrunes) === '[null,null]' && JSON.stringify(bad4.hrunesOwn) === '[]',
      [bad.hrunes, bad.hrunesOwn, bad2.hrunes, bad3.hrunes, bad4.hrunes]);

    // ---------- 7) Build Code + Loadouts ----------
    for (let j = 'einherjar'; j; j = JOBS[j].parent) for (const id of JOBS[j].skills) if (SKILLS[id] && !SKILLS[id].noLearn) pl.skills[id] = SKILLS[id].max;
    recalc(); pl.combatAt = -99;
    clear();
    const codeV1 = LO.exportCode(null, false);
    const raw1 = atob(codeV1.slice(9).replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (codeV1.length - 9) % 4) % 4));
    ok('build code: no Hunt Runes → still version 1 (old format unchanged)', raw1.split('|')[0] === '1' && raw1.split('|').length === 6 && JSON.stringify(LO.decode(codeV1).build.hrunes) === '[null,null]');
    HR.set(0, 'hr_slay_undead', true); HR.set(1, 'hr_endow_fire', true);
    const code = LO.exportCode(null, true), dec = LO.decode(code);
    const raw = atob(code.slice(9).replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (code.length - 9) % 4) % 4));
    ok('build code: version 2 carries hunt rune ids', raw.split('|')[0] === '2' && raw.split('|')[5] === 'hr_slay_undead,hr_endow_fire' && JSON.stringify(dec.build && dec.build.hrunes) === '["hr_slay_undead","hr_endow_fire"]', raw.slice(0, 80));
    clear();
    const ck = LO.check(dec.build);
    let ar = LO.applyBuild(dec.build, { hrunes: true });
    ok('build code: round trip restores the same hunt runes', ck.hrOk === 2 && ar.ok && JSON.stringify(pl.hrunes) === '["hr_slay_undead","hr_endow_fire"]', ar);
    const enc = t => 'IV-BUILD:' + btoa(t).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const f = raw.split('|'), mk = hs => enc([...f.slice(0, 5), hs, f[6]].join('|'));
    const evil = [['unknown id', mk('hr_nope')], ['__proto__', mk('__proto__')], ['two endows', mk('hr_endow_fire,hr_endow_water')], ['duplicate', mk('hr_giant,hr_giant')],
      ['three slots', mk('hr_giant,hr_exec,hr_pack')], ['skill rune id', mk('fire_rune.split')], ['html', mk('<img>')], ['v2 with 6 fields', enc(f.filter((_, i) => i !== 5).join('|').replace(/^1/, '2'))]];
    const acc = evil.filter(([, s]) => !LO.decode(s).err).map(([n]) => n);
    ok('build code: bad hunt rune fields rejected (' + evil.length + ' cases)', !acc.length, acc);
    ok('build code: v2 with one empty slot accepted', JSON.stringify((LO.decode(mk(',hr_pack')).build || {}).hrunes) === '[null,"hr_pack"]');
    const own0 = pl.hrunesOwn; pl.hrunesOwn = ['hr_slay_undead']; clear();
    ar = LO.applyBuild(dec.build, { hrunes: true });
    ok('build code: runes you do not own are skipped', ar.ok && ar.hrSkipped === 1 && JSON.stringify(pl.hrunes) === '["hr_slay_undead",null]', ar);
    pl.hrunesOwn = own0;
    // Loadouts
    clear(); HR.set(0, 'hr_pack', true); HR.set(1, 'hr_endow_water', true);
    LO.save(0, 'HuntA');
    clear(); HR.set(0, 'hr_exec', true);
    LO.save(1, 'HuntB');
    let rr = LO.apply(0);
    const a1 = JSON.stringify(pl.hrunes);
    rr = LO.apply(1);
    const b1 = JSON.stringify(pl.hrunes);
    rr = LO.apply(0);
    ok('loadouts: hunt runes saved per build and restored A→B→A', a1 === '["hr_pack","hr_endow_water"]' && b1 === '["hr_exec",null]' && JSON.stringify(pl.hrunes) === a1 && LO.matches(0), { a1, b1 });
    const st = LO.st(); st.slots[2] = LO.cleanSlot(Object.assign({}, st.slots[0], { hrunes: undefined }), 2);
    rr = LO.apply(2);
    ok('loadouts: old builds without hunt runes leave yours untouched', st.slots[2].hrunes === null && JSON.stringify(pl.hrunes) === a1 && LO.matches(2));
    pl.combatAt = G.time;
    ok('loadouts: switching blocked in combat', !LO.apply(1).ok && JSON.stringify(pl.hrunes) === a1);
    pl.combatAt = -99;
    LO.clear(0); LO.clear(1); LO.clear(2);

    // ---------- 8) PvP: Human Slayer เฉพาะลานประลอง ----------
    pl.combatAt = -99; clear(); HR.set(0, 'hr_slay_human', true); HR.set(1, 'hr_slay_brute', true);
    const foe = fake('human', 'neutral', { m: { isPlayer: true, ref: { id: 'x' } } }), npcHuman = fake('human', 'neutral');
    const townK = HR.hit(foe).k, townN = HR.hit(npcHuman).k;
    const home = { map: G.map.id, x: pl.x, y: pl.y };
    changeMap('arena', 17.5, 17.5, { quiet: true });
    const inArena = !!G.map.def.pvp, arenaK = HR.hit(foe).k, arenaR = ratio(foe);
    clear(); HR.set(0, 'hr_slay_brute', true); HR.set(1, 'hr_giant', true);
    const otherK = HR.hit(foe).k;
    clear(); HR.set(0, 'hr_exec', true); HR.set(1, 'hr_endow_fire', true);
    const condK = HR.hit(Object.assign(foe, { hp: 10 })).k, endEl = elemMod(HR.hit(foe).el, foe.def.element);
    changeMap(home.map, home.x, home.y, { quiet: true });
    ok('PvP: Human Slayer +20% (same as other Slayers) vs players in the Arena', inArena && near(arenaK, 1.2, 1e-9) && near(arenaR[0], 1.2, 0.003) && townK === 1 && townN === 1, { inArena, arenaK, townK, townN });
    ok('PvP: one rule everywhere — race Slayers miss players, Giant Slayer −10% vs players, Executioner works on low-HP players, Endow vs neutral armor = ×1', near(otherK, 0.9, 1e-9) && near(condK, 1.3, 1e-9) && endEl === 1, { otherK, condK, endEl });

    // ---------- 9) เอฟเฟกต์ตีโดน + Battle Script ----------
    pl.combatAt = -99; clear(); HR.set(0, 'hr_slay_insect', true); HR.set(1, 'hr_endow_fire', true);
    U.rand = rnd0.rand; U.randi = rnd0.randi; U.chance = rnd0.chance;
    const bug = spawnMob('leafworm', { x: Math.floor(pl.x) + 2, y: Math.floor(pl.y) }); bug.hp = bug.maxHp = 1e7;
    G.floaters.length = 0; const fx0 = G.fx.length;
    const rb = physHit(bug, 1, { skill: true, sureHit: true }); applyHit(bug, rb, { src: 'test' });
    ok('feedback: rune glyph flash + "Weak!" on a fire-endowed hit vs Earth insect', G.fx.slice(fx0).some(f => f.hrune && f.ids.includes('hr_slay_insect') && f.ids.includes('hr_endow_fire')) && G.floaters.some(f => f.text === 'Weak!'), G.floaters.map(f => f.text));
    pl.combatAt = -99; clear(); HR.set(0, 'hr_endow_earth', true); bug.hp = bug.maxHp; bug._hrEm = 0; G.floaters.length = 0;
    const rr2 = physHit(bug, 1, { skill: true, sureHit: true }); applyHit(bug, rr2, { src: 'test' });
    ok('feedback: "Resist" when the element is resisted (earth vs earth ×0.25)', G.floaters.some(f => f.text === 'Resist'), G.floaters.map(f => f.text));
    const cIns = BotScript.cleanCond({ t: 'race', v: 'insect' }), cEarth = BotScript.cleanCond({ t: 'elem', v: 'earth' }), cFire = BotScript.cleanCond({ t: 'elem', v: 'fire' });
    ok('Battle Script: target race / element conditions see the same race + element', BotScript.cond(cIns, bug) && BotScript.cond(cEarth, bug) && !BotScript.cond(cFire, bug));
    // แถบเป้าหมาย: ธาตุ + เผ่า
    pl.target = bug; UI.updateTarget();
    const tg = document.querySelector('#tg-er').textContent;
    ok('target bar shows element + race', /Earth|ดิน/.test(tg) && /Insect|แมลง/.test(tg) && document.querySelector('#tg-er').dataset.el === 'earth', tg);
    pl.target = null; bug.dead = true; G.mobs = G.mobs.filter(m => m !== bug);

    // ---------- 10) UI ----------
    pl.combatAt = -99; clear(); HR.set(0, 'hr_slay_plant', true);
    UI.open('w-status'); await new Promise(r => setTimeout(r, 50));
    const stOk = !!document.querySelector('#w-status .hr-st') && /Plant/.test(document.querySelector('#w-status .hr-st').textContent);
    UI.close('w-status');
    UI.open('w-hrunes'); await new Promise(r => setTimeout(r, 50));
    const w = document.querySelector('#w-hrunes');
    const winOk = w.querySelectorAll('.hr-sock-card').length === 2 && w.querySelectorAll('.hr-tile').length === ids.length;
    w.querySelector('.hr-tile[data-hr="hr_pack"]').click(); await new Promise(r => setTimeout(r, 30));
    w.querySelector('.hr-det .hr-sock[data-slot="1"]').click(); await new Promise(r => setTimeout(r, 30));
    const clickOk = pl.hrunes[1] === 'hr_pack';
    UI.close('w-hrunes');
    ok('UI: Status card + Hunt Rune window (2 sockets, owned grid, click to socket)', stOk && winOk && clickOk, { stOk, winOk, clickOk });
    UI.invTab = 'hrune'; UI.open('w-inv'); await new Promise(r => setTimeout(r, 50));
    const inv = document.querySelector('#w-inv');
    const invOk = inv.querySelectorAll('.irow').length === ids.length && /Hunt Rune/.test(inv.querySelector('.book-r').textContent) && !/Sell price|Drop/.test(inv.querySelector('.book-r').textContent);
    UI.close('w-inv'); UI.invTab = 'use';
    ok('UI: inventory "Runes" tab lists owned runes with English details (no sell / drop)', invOk);
    const brokk = G.npcs.find(n => n.id === 'refine');
    pl.x = brokk.x + 0.5; pl.y = brokk.y + 1.5;
    UI.openForge(brokk); UI.forge.tab = 'hrune'; UI.renderForge(); await new Promise(r => setTimeout(r, 50));
    const fg = document.querySelector('#w-forge');
    const fgOk = fg.querySelectorAll('.irow[data-hr]').length === ids.length && !!fg.querySelector('.pill .ivi') && /Hunt Rune/.test(fg.textContent);
    UI.close('w-forge');
    ok('UI: Brokk forge has a Hunt Rune tab listing every rune', fgOk);
    return out;
  });

  // ---------- มือถือ: หน้าต่างไม่ล้นจอ ----------
  const m = await start(browser, port, { width: 390, height: 844 }, true);
  const mob = await m.evaluate(async () => {
    const pl = G.player; pl.baseLv = 40; pl.zeny = 1e5; recalc();
    for (const id of ['hr_slay_brute', 'hr_endow_fire', 'hr_giant']) HuntRunes.buy(id);
    HuntRunes.set(0, 'hr_slay_brute', true);
    UI.open('w-hrunes'); await new Promise(r => setTimeout(r, 80));
    const w = document.querySelector('#w-hrunes'), r = w.getBoundingClientRect();
    return { fits: r.left >= -1 && r.right <= innerWidth + 1, scrollX: document.documentElement.scrollWidth <= innerWidth + 1, socks: w.querySelectorAll('.hr-sock-card').length };
  });
  const all = [...checks, ['phone: Hunt Rune window fits 390 px', mob.fits && mob.scrollX && mob.socks === 2, JSON.stringify(mob)],
    ['no page errors', !p._errors.length && !m._errors.length, [...p._errors, ...m._errors].slice(0, 3).join(' | ')]];
  let fail = 0;
  for (const [n, c, info] of all) { console.log(`${c ? '✔' : '✘'} ${n}${info && !c ? '  ' + info : info && c ? '  (' + String(info).slice(0, 90) + ')' : ''}`); if (!c) fail++; }
  console.log(fail ? `\n${fail} FAILED` : `\nALL ${all.length} PASSED`);
  await browser.close(); srv.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
