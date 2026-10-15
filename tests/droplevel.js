'use strict';
// ============================================================
//  ตรวจ "เลเวลของดรอป" (รอบ 38): ของสวมใส่ที่มอนดรอป ต้องเลเวลเหมาะกับมอนตัวนั้น
//  • ทุกช่องดรอปที่เป็นอาวุธ/ชุดเกราะ: Lv ของของ อยู่ใน LOOT.dropBand(มอน) = [Lv มอน −8, Lv มอน +3] (MVP ถึง +10, World Boss ใช้ MVP ต้นแบบ)
//    ของเดิมที่ไม่มี Lv ใช้ LOOT.LV_PROXY (js/loot.js)
//  • อุปกรณ์ทุกชิ้นที่ไม่ได้ขายในร้าน/ไม่ใช่รางวัลเควสต์ ยังมีมอนดรอป (ไม่ใช่แค่ World Boss)
//  • อาวุธทุกประเภท (มีดสั้น ดาบ ขวาน คทา ธนู กระบอง) มีของดรอปในทุกช่วง 10 เลเวล (1–70)
//  • คลังไอเทม (js/itemindex.js) อ่านแหล่งดรอปใหม่ถูก: Emberfang มาจาก Hel Maiden ไม่ใช่ Kitsura • แหวนจาก Elite แสดงแผนที่
//  พิมพ์รายการไล่ระดับอาวุธ (Lv → ไอเทม → มาจากไหน) ไว้ทำ docs/DROP_AUDIT.md
//  รัน:  CHROME=<chrome> NODE_PATH=$(npm root -g) node tests/droplevel.js   (หรือตั้ง BASE=http://localhost:พอร์ต/index.html)
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
const ok = (name, cond, info = '') => checks.push([name, !!cond, typeof info === 'string' ? info : JSON.stringify(info)]);

(async () => {
  let srv = null, url = process.env.BASE;
  if (!url) { srv = await serve(); url = `http://localhost:${srv.address().port}/index.html`; }
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  const browser = await chromium.launch(opts);
  const errors = [];
  const p = await browser.newPage();
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(url, { timeout: 180000 });
  await p.waitForFunction(() => typeof LOOT !== 'undefined' && MOBS.wb_kitsura && MOBS.wb_kitsura.wbTuned, null, { timeout: 120000 });

  const r = await p.evaluate(() => {
    const out = { api: typeof LOOT.dropBand === 'function' && typeof LOOT.gearLv === 'function', bad: [], n: 0, proxyBad: [], noSource: [], bandMiss: [], prog: {}, idx: {}, gaps: [], gapLines: {} };
    const isEq = id => ITEMS[id] && (ITEMS[id].type === 'weapon' || ITEMS[id].type === 'armor');
    for (const id in LOOT.LV_PROXY) if (!ITEMS[id] || ITEMS[id].lv) out.proxyBad.push(id); // proxy ใช้เฉพาะของที่ไม่มี Lv จริง
    const src = {};
    for (const mid in MOBS) {
      const m = MOBS[mid]; if (m.dummy || m.minion) continue;
      const [lo, hi] = LOOT.dropBand(mid);
      for (const [iid] of m.drops || []) {
        if (!isEq(iid)) continue;
        out.n++;
        const lv = LOOT.gearLv(iid);
        if (lv < lo || lv > hi) out.bad.push(`${mid}(Lv ${m.lv}) → ${iid} Lv ${lv} (band ${lo}–${hi})`);
        if (!m.worldBoss && !/^wb_/.test(mid)) (src[iid] = src[iid] || []).push(mid);
      }
    }
    const shop = new Set([...SHOPS.weapon, ...SHOPS.armor, ...SHOPS.tool]);
    for (const id in ITEMS) {
      const it = ITEMS[id]; if (!isEq(id)) continue;
      if (shop.has(id) || Object.values(JOB_STARTER).includes(id) || it.quest) continue;
      if (!src[id]) out.noSource.push(id);
    }
    // ไล่ระดับอาวุธ: ทุกประเภทต้องมีของดรอปในทุกช่วง 10 เลเวล (นับ MVP / Elite ด้วย)
    const mapOf = mid => { for (const k in MAP_DEFS) { const d = MAP_DEFS[k]; if ((d.spawns || []).some(s => s[0] === mid) || d.mvp === mid) return d.name; }
      const E = typeof WorldPack !== 'undefined' && WorldPack.Elite; const em = E && Object.keys(E.MAPS).find(k => E.MAPS[k] === mid); return em ? MAP_DEFS[em].name + ' (Elite)' : ''; };
    for (const w of ['dagger', 'sword', 'axe', 'rod', 'bow', 'mace']) {
      const list = Object.keys(src).filter(id => ITEMS[id].type === 'weapon' && ITEMS[id].wtype === w).sort((a, b) => LOOT.gearLv(a) - LOOT.gearLv(b));
      out.prog[w] = list.map(id => ({ id, lv: LOOT.gearLv(id), r: ITEMS[id].rarity, from: src[id].map(m => `${MOBS[m].name} Lv ${MOBS[m].lv}${MOBS[m].boss ? ' MVP' : ''} · ${mapOf(m)}`) }));
      for (let b = 0; b < 7; b++) if (!list.some(id => { const l = LOOT.gearLv(id); return l > b * 10 && l <= b * 10 + 10; })) out.bandMiss.push(`${w} ${b * 10 + 1}-${b * 10 + 10}`);
    }
    // ช่องว่างเลเวล (รอบ 42): ของอัปเกรดที่ "ทุก Class ของประเภทนั้นใช้ได้" ต้องห่างกันไม่เกิน 8 เลเวลตั้งแต่ชิ้นแรกจนถึง Lv 70
    //   อาวุธ: สายสีเขียว (uncommon) เดี่ยว ๆ และสาย common+uncommon+rare รวม • เกราะ: ทุกช่อง × ทุก Job (uncommon+rare)
    const dropped = id => !!src[id], MAXGAP = 8, END = 70;
    const gapOf = (name, ids) => {
      const lvs = ids.map(id => LOOT.gearLv(id)).sort((a, b) => a - b); out.gapLines[name] = lvs;
      for (let i = 1; i < lvs.length; i++) if (lvs[i] - lvs[i - 1] > MAXGAP) out.gaps.push(`${name}: Lv ${lvs[i - 1]} → ${lvs[i]}`);
      if (lvs.length && END - lvs[lvs.length - 1] > MAXGAP) out.gaps.push(`${name}: Lv ${lvs[lvs.length - 1]} → ${END}`);
      if (!lvs.length) out.gaps.push(name + ': none');
    };
    const allJobs = (it, n) => it.jobs === 'all' || it.jobs.length === n;
    for (const w of ['dagger', 'sword', 'axe', 'rod', 'bow', 'mace']) {
      const base = Object.keys(ITEMS).filter(id => ITEMS[id].type === 'weapon' && ITEMS[id].wtype === w && dropped(id) && allJobs(ITEMS[id], J[w].length));
      gapOf(w + ' uncommon', base.filter(id => ITEMS[id].rarity === 'uncommon'));
      gapOf(w + ' common+uncommon+rare', base.filter(id => ['common', 'uncommon', 'rare'].includes(ITEMS[id].rarity)));
    }
    const JOBS7 = ['novice', 'einherjar', 'runecaster', 'wildhunter', 'volva', 'trickster', 'berserker'];
    for (const s of ['armor', 'head', 'shield', 'garment', 'shoes']) for (const j of JOBS7) {
      gapOf(`${s} [${j}] uncommon+rare`, Object.keys(ITEMS).filter(id => ITEMS[id].type === 'armor' && ITEMS[id].slot === s && dropped(id) && ['uncommon', 'rare'].includes(ITEMS[id].rarity) && (ITEMS[id].jobs === 'all' || ITEMS[id].jobs.includes(j))));
    }
    // คลังไอเทมอ่านแหล่งดรอปจาก MOBS สด ๆ
    ItemIndex._src = null;
    const S = ItemIndex.sources();
    const mobsOf = id => (S[id] || []).filter(s => s.k === 'mob').map(s => `${s.mid}@${s.map}`);
    out.idx = { emberfang: mobsOf('emberfang'), ring: mobsOf('ring'), stiletto: mobsOf('stiletto') };
    return out;
  });

  ok('LOOT.dropBand / LOOT.gearLv exist', r.api);
  ok('LV_PROXY only covers real items that have no Lv', !r.proxyBad.length, r.proxyBad.join(', '));
  ok(`every equipment drop is inside its monster's level band (${r.n} entries)`, r.n > 150 && !r.bad.length, r.bad.slice(0, 8).join(' | '));
  ok('every non-shop equipment item still drops from a monster (not only World Bosses)', !r.noSource.length, r.noSource.join(', '));
  ok('every weapon type has a drop in every 10-level band (1–70)', !r.bandMiss.length, r.bandMiss.join(', '));
  ok('no upgrade gap > 8 levels: every weapon type (uncommon line, and common+uncommon+rare) and every armor slot per Job, up to Lv 70', !r.gaps.length, r.gaps.slice(0, 10).join(' | '));
  ok('Item Index: Emberfang now comes from Hel Maiden (helcave), not Kitsura', r.idx.emberfang.some(s => s === 'hel_maiden@helcave') && !r.idx.emberfang.some(s => /kitsura/.test(s)), r.idx.emberfang.join(' '));
  ok('Item Index: Power Ring source is the Wolfwood Elite with its map', r.idx.ring.includes('elite_alpha@wolfwood'), r.idx.ring.join(' '));
  ok('Item Index: Stiletto (Lv 12) comes from Capshroom, not Buzzfly (Lv 4)', r.idx.stiletto.includes('capshroom@mistlake') && !r.idx.stiletto.some(s => /buzzfly/.test(s)), r.idx.stiletto.join(' '));

  if (process.env.GAPS) for (const [k, v] of Object.entries(r.gapLines)) console.log(k.padEnd(40), v.join(','));
  if (process.env.PROG) {
    for (const [w, list] of Object.entries(r.prog)) {
      console.log(`\n== ${w}`);
      for (const e of list) console.log(`  Lv ${String(e.lv).padStart(2)}  ${e.id.padEnd(20)} ${e.r.padEnd(9)} ${e.from.join(' / ')}`);
    }
  }

  await browser.close();
  if (srv) srv.close();
  ok('no page errors', !errors.length, errors.slice(0, 3).join(' | '));
  console.log('');
  let fail = 0;
  for (const [n, c, i] of checks) { if (!c) fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${i !== '' ? '  — ' + i : ''}`); }
  console.log(fail ? `\n${fail} FAILED` : `\nALL ${checks.length} PASSED`);
  process.exit(fail ? 1 : 0);
})();
