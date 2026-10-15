'use strict';
// ============================================================
//  อุปกรณ์ uid ซ้ำ (dup_uid ของ RT 12/10/2026 — Lorekeeper's Quill +5 uid 5359 อยู่ทั้งในกระเป๋าและช่องแหวน) ด้วย Playwright (มือถือ 390×844)
//  1) ต้นเหตุ: แตะแถวของในหน้าต่างอุปกรณ์ซ้ำก่อนหน้าต่างวาดใหม่ (หลังแตะ หน้าต่างรอ 800 ms — UI.scrollBusy)
//     → เดิม equipItem สวมชิ้นที่สวมอยู่แล้วลงช่องแหวนที่ 2 = อ็อบเจกต์เดียวอยู่ 2 ช่อง → ถอดช่องหนึ่ง = ของงอกในกระเป๋า uid เดิม
//  2) ซ่อมในเครื่อง (SaveVerify.fixDups): ชิ้นเดียวอยู่ 2 ที่ / สำเนาเหมือนกันทุกอย่าง / uid ชนแต่ของต่างกัน — ตอนโหลด · หลังรายการเศรษฐกิจ · ก่อนเซฟ + ธง dup_repaired
//  3) สายสะดุด (js/guard.js): ใส่อุปกรณ์ uid ที่มีอยู่แล้วลงกระเป๋า/ช่องสวม → ธง dup_push + stack ไปกับเซฟ · การเล่นปกติไม่ขึ้นธง
//  รัน:  NODE_PATH=$(npm root -g) node tests/dupitems.js   (เปิดเซิร์ฟเวอร์เอง · CHROME=<path> ได้)
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
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(`http://localhost:${srv.address().port}/index.html`); await p.waitForTimeout(1200);
  await p.click('#au-offline'); await p.click('#btn-new'); await p.fill('#cr-name', 'Dupe'); await p.click('#cr-start'); await p.waitForTimeout(1500);
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 8000, polling: 250 }).catch(() => {});
  await p.waitForTimeout(500);

  const checks = await p.evaluate(async () => {
    const out = [];
    const ok = (name, cond, info = '') => out.push([name, !!cond, typeof info === 'string' ? info : JSON.stringify(info)]);
    const wait = ms => new Promise(r => setTimeout(r, ms));
    let pl = G.player; const GT = window.__guardTest;
    document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden'));
    Bot.toggle(false);
    const Q = 'lorekeeper_quill';
    const quills = () => [...EQUIP_SLOTS.map(s => pl.equip[s]), ...pl.inventory, ...pl.storage].filter(e => e && e.id === Q);
    const uids = d => { const all = [...Object.values(d.equip || {}), ...(d.inventory || []), ...(d.storage || [])].filter(e => e && e.uid != null).map(e => e.uid); return all.length - new Set(all).size; };
    const pushes = () => GT.flags().filter(f => f.rule === 'dup_push');
    const repairs = () => GT.flags().filter(f => f.rule === 'dup_repaired');
    const tap = el => { window.dispatchEvent(new Event('touchstart')); window.dispatchEvent(new Event('touchend')); el.click(); };
    for (const s of ['acc', 'acc2']) if (pl.equip[s]) unequip(s, true);
    GT.clear();

    // ---------- 1) ต้นเหตุ: แตะแถวเดิมซ้ำใน 800 ms (หน้าต่างยังไม่วาดใหม่) ----------
    addItem(Q, 1, true);
    UI.eqSel = 'acc'; UI.eqDet = true; UI.open('w-equip'); UI.renderWindows(true);
    const row = document.querySelector('#w-equip .irow');
    ok('หน้าต่างอุปกรณ์มีแถว Quill ให้แตะ', !!row && /Quill/.test(row.textContent), row ? row.textContent.slice(0, 40) : 'none');
    tap(row); await wait(250);
    const stale = row.isConnected;
    tap(row); await wait(1000);
    ok('แตะครั้งที่ 2 โดนแถวเดิม (หน้าต่างรอวาดใหม่ — สภาพเดียวกับมือถือจริง)', stale);
    ok('แตะซ้ำ: Quill อยู่ช่องเดียว (ไม่อยู่ทั้ง acc และ acc2)', pl.equip.acc && pl.equip.acc.id === Q && pl.equip.acc2 !== pl.equip.acc && quills().length === 1, { acc: pl.equip.acc && pl.equip.acc.uid, acc2: pl.equip.acc2 && pl.equip.acc2.uid, n: quills().length });
    const e0 = pl.equip.acc; useItem(e0); useItem(e0); // เรียกตรงซ้ำ (ปุ่ม Equip/ดับเบิลคลิกค้าง) ก็ต้องไม่ซ้ำ
    ok('สวมชิ้นที่สวมอยู่แล้วซ้ำ (useItem ×2) = ไม่มีผล', pl.equip.acc === e0 && !pl.equip.acc2 && !pl.inventory.includes(e0));
    unequip('acc', true);
    ok('ถอดแล้วมี Quill ชิ้นเดียว · เซฟไม่มี uid ซ้ำ', quills().length === 1 && uids(saveData()) === 0, quills().length);
    ok('เล่นปกติ (สวม/ถอด) ไม่มีธงสายสะดุด', pushes().length === 0, pushes().map(f => f.detail.slice(0, 80)));
    UI.close('w-equip');

    // ---------- 2) สายสะดุด: สร้างสภาพบั๊กเดิมตรง ๆ ----------
    GT.clear();
    const q1 = pl.inventory.find(e => e.id === Q);
    equipItem(q1, true);
    pl.equip.acc2 = pl.equip.acc; // แบบที่ equipItem เดิมทำ (อ็อบเจกต์เดียว 2 ช่อง)
    let ps = pushes();
    ok('ช่องสวม: ใส่ชิ้นที่อยู่อีกช่อง → ธง dup_push', ps.length >= 1 && /equip\.acc2/.test(ps[0].detail) && /same-object@acc/.test(ps[0].detail), ps.map(f => f.detail.slice(0, 120)));
    ok('dup_push มี stack (ชี้ไฟล์ที่ทำ)', ps.length && ps[0].detail.split(' | ').length >= 2, ps.length ? ps[0].detail.slice(0, 300) : '');
    GT.clear();
    pl.inventory.push(pl.equip.acc); // ถอดช่องหนึ่งแบบเดิม = ของงอกในกระเป๋า
    ps = pushes();
    ok('กระเป๋า: push ชิ้นที่ยังสวมอยู่ → ธง dup_push', ps.length >= 1 && /inventory\.push/.test(ps[0].detail), ps.map(f => f.detail.slice(0, 120)));
    const d1 = saveData();
    ok('ธง dup_push ไปกับเซฟ (data.guardFlags)', Array.isArray(d1.guardFlags) && d1.guardFlags.some(f => f.rule === 'dup_push'));

    // ---------- 3) ซ่อมในเครื่อง ----------
    ok('ก่อนเซฟ: ชิ้นเดียวอยู่ 2 ช่อง + กระเป๋า → เหลือที่ช่อง acc ชิ้นเดียว · เซฟไม่มี uid ซ้ำ', uids(d1) === 0 && pl.equip.acc && pl.equip.acc.id === Q && !pl.equip.acc2 && quills().length === 1, { n: quills().length, acc2: !!pl.equip.acc2 });
    ok('ซ่อมแล้วจดธง dup_repaired (ไปกับเซฟถัดไป)', repairs().length >= 1 && /alias/.test(repairs()[0].detail) && d1.guardFlags.some(f => f.rule === 'dup_repaired'), repairs().map(f => f.detail));
    // สำเนาเหมือนกันทุกอย่าง (หลังโหลดเซฟ อ็อบเจกต์แยกกันแล้ว) — แบบในเซฟของ RT
    GT.clear();
    const qa = pl.equip.acc; qa.refine = 5;
    pl.inventory.splice(pl.inventory.length, 0, Object.assign({}, qa, { cards: [] }));
    SaveVerify.fixDups(pl, 'test');
    ok('สำเนาเหมือนกัน (id+uid+ตีบวก+ชิป) ในกระเป๋า → ทิ้งสำเนา เก็บชิ้นที่สวม', quills().length === 1 && pl.equip.acc === qa && qa.refine === 5, quills().length);
    // uid ชนแต่ของต่างกัน = ของจริงสองชิ้น → ชิ้นในกระเป๋าได้ uid ใหม่
    const other = pl.inventory.find(e => e.id === 'knife') || (addItem('knife', 1, true), pl.inventory.find(e => e.id === 'knife'));
    const oldUid = other.uid; other.uid = qa.uid;
    const n0 = SaveVerify.fixDups(pl, 'test');
    ok('uid ชน แต่ของต่างกัน → ชิ้นในกระเป๋าได้ uid ใหม่ (ไม่มีของหาย)', n0 === 1 && other.uid !== qa.uid && other.uid > 0 && pl.inventory.includes(other) && uids(saveData()) === 0, { oldUid, now: other.uid, q: qa.uid });
    // ตอนโหลด: เซฟที่มีของซ้ำอยู่แล้ว (เหมือนเซฟของ RT บนเซิร์ฟเวอร์)
    const raw = JSON.parse(JSON.stringify(saveData()));
    raw.inventory.push(JSON.parse(JSON.stringify(raw.equip.acc)));
    ok('เตรียมเซฟเสีย: uid ซ้ำ 1 คู่', uids(raw) === 1);
    const lp = loadGameFrom(raw); pl = G.player; // newPlayer ตั้ง G.player เป็นตัวที่โหลด
    ok('โหลดเซฟที่มี uid ซ้ำ → ซ่อมตอนโหลด (เหลือชิ้นที่สวม)', lp && uids({ equip: lp.equip, inventory: lp.inventory, storage: lp.storage }) === 0 && lp.equip.acc && lp.equip.acc.id === Q && lp.inventory.filter(e => e.id === Q).length === 0);
    // หลังรายการจากเซิร์ฟเวอร์: delta เพิ่มอุปกรณ์ uid ที่มีอยู่แล้ว (เช่นรายการเดียวกันถูกใส่สองรอบ)
    GT.clear();
    const eu = pl.equip.acc.uid;
    Econ.applyDelta(pl, { add: [{ id: Q, qty: 1, uid: eu, refine: pl.equip.acc.refine || 0, cards: [] }] });
    ok('Econ.applyDelta เพิ่ม uid ที่มีอยู่ → สายสะดุดจด + ซ่อมทันที', quills().length === 1 && pushes().length >= 1 && repairs().some(f => /econ/.test(f.detail)), { n: quills().length, push: pushes().length });

    // ---------- 4) การเล่นปกติไม่ขึ้นธง ----------
    GT.clear();
    for (const s of ['acc', 'acc2']) if (pl.equip[s]) unequip(s, true);
    addItem('ring', 1, true);
    const ring = pl.inventory.find(e => e.id === 'ring'), qq = pl.inventory.find(e => e.id === Q);
    equipItem(qq, true); equipItem(ring, true); unequip('acc', true); unequip('acc2', true);
    previewEquip(qq); previewEquip(ring);
    sortItems(pl.inventory);
    storeItem(qq, 1); takeItem(pl.storage.find(e => e.id === Q), 1);
    equipItem(pl.inventory.find(e => e.id === Q), true);
    const sd = saveData();
    ok('สวม/ถอด/เทียบค่า/จัดเรียง/ฝากคลัง: ไม่มี dup_push / dup_repaired', pushes().length === 0 && repairs().length === 0 && uids(sd) === 0, GT.flags().map(f => f.rule + ' ' + f.detail.slice(0, 60)));
    return out;
  });

  let pass = 0, fail = 0;
  for (const [name, good, info] of checks) { if (good) pass++; else fail++; console.log(good ? '✔' : '✘', name, info ? ` (${info})` : ''); }
  if (errors.length) { fail++; console.log('✘ page errors:', errors.slice(0, 3).join(' | ')); }
  console.log(`\n${pass} ผ่าน / ${fail} ไม่ผ่าน`);
  await browser.close(); srv.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
