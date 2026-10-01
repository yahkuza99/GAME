'use strict';
// ============================================================
//  ตรวจระบบของดรอป (js/loot.js): ตารางดรอป / แหล่งที่มาของอุปกรณ์ / ความหายาก / ชุดเซ็ต / แร่ตีบวก / ข้อความสองภาษา
//  รัน:  NODE_PATH=$(npm root -g) node tests/loot_audit.js   (เปิดเซิร์ฟเวอร์เอง หรือตั้ง BASE=http://localhost:พอร์ต/index.html)
//  รายงาน: ของที่คาดว่าจะได้ต่อชั่วโมงในแต่ละแผนที่ แยกตามความหายาก (สมมติล่า 10 ตัว/นาที) + ผลจำลองฆ่าจริงด้วย killMob
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

const checks = [];
const ok = (name, cond, info = '') => checks.push([name, !!cond, info]);
const KILLS_PER_HOUR = 600;

(async () => {
  let srv = null, url = process.env.BASE;
  if (!url) { srv = await serve(); url = `http://localhost:${srv.address().port}/index.html`; }
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  else if (fs.existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(opts);
  const errors = [];

  // ---------- 1) ภาษาอังกฤษ: ข้อความทุกช่องของ ITEMS / MOBS / ชุดเซ็ต ไม่มีภาษาไทยหลงเหลือ ----------
  {
    const ctx = await browser.newContext();
    await ctx.addInitScript(() => { try { localStorage.setItem('nm_lang', 'en'); } catch (e) { /* */ } });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push('en: ' + e.message));
    await p.goto(url); await p.waitForTimeout(1200);
    const thai = await p.evaluate(() => {
      const bad = [], TH = /[฀-๿]/;
      const scan = (where, o, depth = 0) => {
        if (depth > 3 || !o) return;
        for (const k in o) {
          const v = o[k];
          if (typeof v === 'string' && TH.test(v)) bad.push(`${where}.${k}: ${v.slice(0, 40)}`);
          else if (v && typeof v === 'object' && !Array.isArray(v)) scan(`${where}.${k}`, v, depth + 1);
        }
      };
      for (const id in ITEMS) scan('ITEMS.' + id, ITEMS[id]);
      for (const id in MOBS) scan('MOBS.' + id, MOBS[id]);
      for (const id in LOOT.SETS) scan('SETS.' + id, LOOT.SETS[id]);
      scan('RARITY', RARITY);
      return bad;
    });
    ok('en: no Thai text in ITEMS / MOBS / sets / rarity labels', !thai.length, thai.slice(0, 5).join(' | '));
    await ctx.close();
  }

  // ---------- 2) ภาษาไทย: ตรวจข้อมูล + จำลองการล่า ----------
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 680 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push('th: ' + e.message));
  await p.goto(url); await p.waitForTimeout(1200);
  await p.click('#au-offline'); await p.click('#btn-new'); await p.fill('#cr-name', 'Loot'); await p.click('#cr-start'); await p.waitForTimeout(1500);
  await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {});
  await p.waitForTimeout(500);

  const data = await p.evaluate(() => {
    const out = { mobs: {}, noSource: [], items: {}, shop: [], shopBad: [], starterOk: true, rarityBad: [], dropBad: [] };
    const isEq = it => it.type === 'weapon' || it.type === 'armor';
    // แหล่งดรอปของทุกไอเทม (รวมบอสโลก)
    const src = {};
    for (const id in MOBS) for (const [iid, ch] of MOBS[id].drops || []) {
      if (!ITEMS[iid]) out.dropBad.push(`${id} → ${iid} (no such item)`);
      if (!(ch > 0 && ch <= 1)) out.dropBad.push(`${id} → ${iid} chance ${ch}`);
      (src[iid] = src[iid] || []).push(id);
    }
    for (const id in MOBS) { const m = MOBS[id]; if (!m.dummy) out.mobs[id] = { lv: m.lv, n: (m.drops || []).length, wb: !!m.worldBoss, boss: !!m.boss }; }
    const shop = new Set([...SHOPS.weapon, ...SHOPS.armor, ...SHOPS.tool]);
    for (const id in ITEMS) {
      const it = ITEMS[id];
      if (!RARITY[it.rarity]) out.rarityBad.push(id);
      if (!isEq(it)) continue;
      const basic = shop.has(id) || Object.values(JOB_STARTER).includes(id);
      if (!basic && !(src[id] || []).some(m => !MOBS[m].worldBoss)) out.noSource.push(id);
      if (shop.has(id) && (it.rarity !== 'common' || (it.lv || 0) > 10)) out.shopBad.push(id);
      out.items[id] = { slot: it.slot, wtype: it.wtype || '', lv: it.lv || 0, rarity: it.rarity, slots: it.slots || 0, isNew: !!LOOT.SETS && !!it.desc, basic };
    }
    out.starterOk = Object.values(JOB_STARTER).every(id => SHOPS.weapon.includes(id));
    out.shop = [...shop];
    return out;
  });
  ok('every drop entry points to a real item with 0 < chance ≤ 1', !data.dropBad.length, data.dropBad.slice(0, 5).join(' | '));
  const thin = Object.entries(data.mobs).filter(([, m]) => m.n < 6).map(([id, m]) => `${id}(${m.n})`);
  ok('every monster has at least 6 drops', !thin.length, thin.join(', '));
  const fat = Object.entries(data.mobs).filter(([, m]) => !m.wb && m.n > 8).map(([id, m]) => `${id}(${m.n})`);
  ok('normal monsters / MVPs have at most 8 drops', !fat.length, fat.join(', '));
  ok('every non-shop equipment item drops from at least one monster', !data.noSource.length, data.noSource.join(', '));
  ok('every item has a valid rarity', !data.rarityBad.length, data.rarityBad.join(', '));
  ok('shops only sell basic gear (common, Lv ≤ 10)', !data.shopBad.length, data.shopBad.join(', '));
  ok('starter weapons (JOB_STARTER) are still sold', data.starterOk);

  // นับไอเทมใหม่ (js/loot.js) ตามช่วงเลเวล / ช่อง / ความหายาก
  const counts = await p.evaluate(() => {
    const c = { total: 0, etc: 0, band: {}, slot: {}, rarity: {} };
    for (const id of LOOT.NEW) {
      const it = ITEMS[id];
      if (it.type !== 'weapon' && it.type !== 'armor') { c.etc++; continue; }
      c.total++;
      const b = `${Math.floor(((it.lv || 1) - 1) / 10) * 10 + 1}-${Math.floor(((it.lv || 1) - 1) / 10) * 10 + 10}`;
      const sl = it.type === 'weapon' ? it.wtype : it.slot;
      c.band[b] = (c.band[b] || 0) + 1; c.slot[sl] = (c.slot[sl] || 0) + 1; c.rarity[it.rarity] = (c.rarity[it.rarity] || 0) + 1;
    }
    // ทุกช่วง 10 เลเวลมีอาวุธครบทุกประเภท และเกราะครบทุกช่อง
    const miss = [];
    for (let b = 0; b < 6; b++) for (const k of ['dagger', 'sword', 'axe', 'rod', 'bow', 'mace', 'armor', 'head', 'shield', 'garment', 'shoes', 'acc']) {
      if (!LOOT.NEW.some(id => { const it = ITEMS[id]; return (it.wtype === k || (it.type === 'armor' && it.slot === k)) && (it.lv || 1) > b * 10 && (it.lv || 1) <= b * 10 + 10; })) miss.push(`${b * 10 + 1}-${b * 10 + 10}:${k}`);
    }
    c.miss = miss;
    return c;
  });
  console.log('New equipment:', counts.total, '| new etc/ores:', counts.etc);
  console.log('  by band  ', JSON.stringify(counts.band));
  console.log('  by slot  ', JSON.stringify(counts.slot));
  console.log('  by rarity', JSON.stringify(counts.rarity));
  ok('80+ new equipment items', counts.total >= 80, counts.total);
  ok('every 10-level band has every weapon type and armor slot', !counts.miss.length, counts.miss.join(', '));

  // ---------- 3) จำลองการล่า: เรียก killMob กับมอนที่เกิดจริงในแต่ละแผนที่ ----------
  const sim = await p.evaluate(async N => {
    const res = {}, R = Object.keys(RARITY);
    const pl = G.player;
    pl.options.autoLoot = false; pl.baseLv = 60;
    const saveG = typeof saveGame === 'function' ? saveGame : null;
    window.saveGame = () => {}; // ไม่ต้องเซฟระหว่างจำลอง
    const snd = Sound.play; Sound.play = () => {};
    const ann = UI.announce; UI.announce = () => {};
    for (const mapId of Object.keys(MAP_DEFS)) {
      const md = MAP_DEFS[mapId]; if (!md.spawns || !md.spawns.length) continue;
      changeMap(mapId, md.spawn ? md.spawn.x : 10, md.spawn ? md.spawn.y : 10, { quiet: true });
      await new Promise(r => setTimeout(r, 50));
      const row = { expected: {}, simulated: {}, kills: 0, mobs: md.spawns.map(s => s[0]), equipPerHour: 0, oresPerHour: 0, zenyFromSales: 0 };
      for (const k of R) { row.expected[k] = 0; row.simulated[k] = 0; }
      const total = md.spawns.reduce((a, s) => a + s[1], 0);
      for (const [mid, cnt] of md.spawns) {
        const d = MOBS[mid], w = cnt / total;
        for (const [iid, ch] of d.drops) {
          const r = ITEMS[iid].rarity, perHour = ch * w * 600;
          row.expected[r] += perHour;
          if (ITEMS[iid].type === 'weapon' || ITEMS[iid].type === 'armor') row.equipPerHour += perHour;
          if (iid === LOOT.ORE.weapon || iid === LOOT.ORE.armor) row.oresPerHour += perHour;
          row.zenyFromSales += perHour * Math.floor(ITEMS[iid].price / 2);
        }
        // ฆ่าจริง N×w ตัว (ใช้มอนที่เกิดอยู่ในแผนที่ ปลุกให้ตายซ้ำ)
        const live = G.mobs.find(m => m.def.id === mid && !m.isMvp);
        if (!live) continue;
        const n = Math.round(N * w);
        for (let i = 0; i < n; i++) {
          live.dead = false; live.hp = 1;
          G.drops.length = 0;
          killMob(live);
          for (const dr of G.drops) row.simulated[ITEMS[dr.id].rarity] += dr.qty;
          row.kills++;
        }
        G.respawns.length = 0;
      }
      for (const k of R) { row.expected[k] = +row.expected[k].toFixed(2); row.simulated[k] = +(row.simulated[k] / Math.max(1, row.kills) * 600).toFixed(2); }
      row.equipPerHour = +row.equipPerHour.toFixed(2); row.oresPerHour = +row.oresPerHour.toFixed(2); row.zenyFromSales = Math.round(row.zenyFromSales);
      res[mapId] = row;
    }
    // MVP / บอสโลก (คาดการณ์ต่อ 1 ตัว)
    const boss = {};
    for (const id in MOBS) {
      const m = MOBS[id]; if (!m.boss) continue;
      const e = {}; for (const k of R) e[k] = 0;
      for (const [iid, ch] of m.drops) e[ITEMS[iid].rarity] += ch;
      for (const k of R) e[k] = +e[k].toFixed(3);
      boss[id] = e;
    }
    Sound.play = snd; UI.announce = ann; if (saveG) window.saveGame = saveG;
    G.drops.length = 0;
    return { res, boss };
  }, 6000);

  console.log(`\nExpected drops per hour by rarity (≈${KILLS_PER_HOUR} kills/h, weighted by spawn counts) — expected / simulated with killMob:`);
  console.log('map'.padEnd(10), ...Object.keys(sim.res[Object.keys(sim.res)[0]].expected).map(k => k.padEnd(18)), 'equip/h  ores/h  sell value/h');
  for (const [m, r] of Object.entries(sim.res)) {
    console.log(m.padEnd(10), ...Object.keys(r.expected).map(k => `${r.expected[k]} / ${r.simulated[k]}`.padEnd(18)), String(r.equipPerHour).padEnd(8), String(r.oresPerHour).padEnd(7), r.zenyFromSales);
    const tot = Object.values(r.expected).reduce((a, b) => a + b, 0), totS = Object.values(r.simulated).reduce((a, b) => a + b, 0);
    ok(`${m}: simulated drops match the tables (±10%)`, Math.abs(totS - tot) / tot < 0.1, `${totS.toFixed(0)} vs ${tot.toFixed(0)}`);
    ok(`${m}: some equipment every hour of farming`, r.equipPerHour >= 2 && r.equipPerHour <= 8, r.equipPerHour); // แบบ RO: อุปกรณ์หายาก (ไม่แจกเยอะ)
  }
  console.log('\nExpected drops per MVP / world boss kill by rarity:');
  for (const [m, e] of Object.entries(sim.boss)) console.log(' ', m.padEnd(20), JSON.stringify(e));

  // ---------- 4) ชุดเซ็ต: ใส่ครบแล้วค่าขึ้นจริง และการ์ดไอเทมแสดงข้อมูลชุด ----------
  const setRes = await p.evaluate(() => {
    const pl = G.player; pl.job = 'einherjar'; pl.baseLv = 60;
    for (const s of EQUIP_SLOTS) if (pl.equip[s]) unequip(s, true);
    recalc(); const before = { hp: pl.d.maxHp, def: pl.d.def, str: pl.d.str, atk: pl.d.atkBonus };
    const set = LOOT.SETS.rust_king;
    const solo = {};
    for (const id of set.items) {
      addItem(id, 1, true); const e = pl.inventory.find(x => x.id === id && !x.refine); equipItem(e, true);
    }
    recalc();
    const after = { hp: pl.d.maxHp, def: pl.d.def, str: pl.d.str, atk: pl.d.atkBonus, atkPct: pl.d.atkPct, leech: pl.d.leech };
    const sb = LOOT.setBonus(pl);
    // การ์ดไอเทม
    const tip = UI.tipBody(pl.equip.head, true).map(n => n.textContent).join(' | ');
    const tipHead = UI.tipBody(pl.equip.head, true)[0].querySelector('b').className;
    for (const s of EQUIP_SLOTS) if (pl.equip[s]) unequip(s, true);
    return { before, after, sb, tip, tipHead };
  });
  ok('set bonus: wearing all 3 Rust King pieces applies the 2- and 3-piece bonuses', setRes.sb && setRes.sb.str === 2 && setRes.sb.atkPct === 6 && setRes.after.atkPct >= 6 && setRes.after.leech >= 2, JSON.stringify(setRes.sb));
  ok('tooltip shows set info and "Dropped by"', /Regalia of the Rust King/.test(setRes.tip) && /(ได้จาก|Dropped by)/.test(setRes.tip), setRes.tip.slice(0, 160));
  ok('tooltip item name is colored by rarity', /rar-rare/.test(setRes.tipHead), setRes.tipHead);

  // ---------- 5) Brokk: ตั้งแต่ +5 ต้องใช้แร่ • ตีอัตโนมัติหยุดเมื่อแร่หมด ----------
  const ref = await p.evaluate(async () => {
    const pl = G.player, out = {};
    pl.job = 'einherjar'; pl.zeny = 10000000;
    for (const s of EQUIP_SLOTS) if (pl.equip[s]) unequip(s, true);
    addItem('sword', 1, true); const w = pl.inventory.find(x => x.id === 'sword'); equipItem(w, true);
    w.refine = 4;
    pl.inventory = pl.inventory.filter(x => x.id !== 'rune_alloy');
    const say0 = UI.say, menu0 = UI.menu, dc0 = UI.dlgClose;
    const said = [];
    let script = [];
    UI.say = async (n, t) => { said.push(t); };
    UI.menu = async (n, t, opts) => { said.push(t); return script.length ? script.shift() : opts.length - 1; };
    UI.dlgClose = () => {};
    const run = async s => { script = s.slice(); await NPC.scripts.refine({ name: 'Brokk' }); };
    // ไม่มีแร่: ตี 1 ครั้งไม่ได้
    await run([0, 0, 0]); // เมนูหลัก: ตีบวก → เลือกอาวุธ (ช่องแรก) → ตี 1 ครั้ง
    out.noOre = w.refine; out.noOreMsg = said[said.length - 1];
    out.menuMentionsOre = said.some(t => /Rune Alloy/.test(t));
    // มีแร่ 3 ชิ้น ตีอัตโนมัติถึง +10: ต้องหยุดเมื่อแร่หมด
    addItem('rune_alloy', 3, true);
    const slotIdx = EQUIP_SLOTS.filter(s => pl.equip[s]).indexOf('weapon');
    await run([0, slotIdx, 1, 5]); // ตีบวก → อาวุธ → ตีต่อเนื่อง → +10 (ตัวเลือกที่ 6 นับจาก +5)
    const t0 = Date.now();
    while (Date.now() - t0 < 6000 && countItem('rune_alloy') > 0) await new Promise(r => setTimeout(r, 200));
    await new Promise(r => setTimeout(r, 800));
    out.oreLeft = countItem('rune_alloy'); out.after = w.refine; out.endMsg = said[said.length - 1];
    UI.say = say0; UI.menu = menu0; UI.dlgClose = dc0;
    return out;
  });
  ok('Brokk: +4 → +5 refuses without ore', ref.noOre === 4, ref.noOreMsg && ref.noOreMsg.slice(0, 80));
  ok('Brokk: refine menu shows the ore requirement', ref.menuMentionsOre);
  ok('Brokk: auto-refine consumes ore and stops when it runs out', ref.oreLeft === 0 && ref.after >= 5 && ref.after < 10, `refine +${ref.after}, ore left ${ref.oreLeft}`);

  await browser.close();
  if (srv) srv.close();
  ok('no page errors', !errors.length, errors.slice(0, 3).join(' | '));
  console.log('');
  let fail = 0;
  for (const [n, c, i] of checks) { if (!c) fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${i !== '' ? '  — ' + i : ''}`); }
  console.log(fail ? `\n${fail} FAILED` : `\nALL ${checks.length} PASSED`);
  process.exit(fail ? 1 : 0);
})();
