// ถ่ายภาพหน้าจอเกมจริงสำหรับแท็บ "ภาพเกม" ใน Valhalla Codex (ทุกแมพ + หน้าต่างหลัก + หน้าแรก/เลือกตัวละคร + มือถือ)
// ใช้:  NODE_PATH=$(npm root -g) node tools/reference_web/shots.js <โฟลเดอร์ผลลัพธ์>
//       python3 tools/reference_web/build.py data.json out.html <โฟลเดอร์ผลลัพธ์>
// เล่นแบบไม่ล็อกอิน (ตัวละครทิ้งในโปรไฟล์เบราว์เซอร์ชั่วคราว ไม่แตะเซฟจริง/ออนไลน์) • ตั้ง Class 3 Lv สูงให้หน้าต่างมีของให้ดู
// CHROME=/path/to/chrome ได้ • ภาพ = JPEG ในโฟลเดอร์ + manifest.json (build.py ย่อเป็น webp แล้วฝังในหน้า)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const { launchOpts, gameUrl } = require('../ref_extract');
const OUT = path.resolve(process.argv[2] || 'codex_shots');
const JOB = process.env.SHOT_JOB || 'runelord';

const SHOTS = []; // { key, title, desc }
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await gameUrl(), BASE = srv.url;
  const b = await chromium.launch(launchOpts());
  const errs = [];
  const snap = async (p, key, title, desc) => { await p.screenshot({ path: path.join(OUT, key + '.jpg'), type: 'jpeg', quality: 80 }); SHOTS.push({ key, title, desc }); console.log('shot', key); };

  // ---------- คอม 1366×768 ----------
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE);
  await p.waitForSelector('#auth', { state: 'visible', timeout: 20000 });
  await p.waitForTimeout(1200);
  await snap(p, 'title', 'หน้าแรก / ล็อกอิน', 'กระดาษในกรอบไม้โอ๊ค ลายถักทองที่มุม ปุ่มแผ่นทองมุมมน โลโก้ทอง');
  await p.click('#au-offline'); await p.waitForTimeout(900);
  await snap(p, 'select', 'เลือกตัวละคร', 'หน้าเลือก/สร้างตัวละครธีมทองเข้าชุดกับหน้าแรก');
  await p.click('#btn-new'); await p.fill('#cr-name', 'Codex'); await p.click('#cr-start'); await p.waitForTimeout(1500);
  await p.waitForFunction(() => { const x = document.querySelector('#prologue-skip'); if (x && x.offsetParent) x.click(); return !x || !x.offsetParent; }, null, { timeout: 10000, polling: 250 }).catch(() => {});
  await p.waitForTimeout(800);
  await p.click('#w-help .win-x').catch(() => {});

  // ตัวละครตัวอย่าง: Class 3 Lv 99 สกิลครบ รูนเลือกแบบแรก อุปกรณ์ตามเลเวล Passive บางส่วน Hunt Rune 1 อัน
  await p.evaluate(job => {
    window.__closeAll = () => document.querySelectorAll('.win:not(.hidden)').forEach(w => { try { UI.close(w.id); } catch (e) {} });
    const pl = G.player;
    for (const j of [...jobLine(job)].reverse()) if (j !== 'novice') changeJob(j);
    pl.baseLv = 99; pl.jobLv = JOBS[job].jobMax; pl.skillPoints = 200; recalc();
    for (const j of jobLine(job)) for (const id of JOBS[j].skills || []) { while (typeof canLearn === 'function' && canLearn(id)) learnSkill(id); }
    pl.runes = pl.runes || {};
    for (const [sk, list] of Object.entries(Runes.TREE)) if ((pl.skills[sk] || 0) >= Runes.UNLOCK) pl.runes[sk] = list[0].id;
    const want = { weapon: 1, armor: 1, head: 1, shield: 1, garment: 1, shoes: 1, acc: 2 };
    const line = new Set(jobLine(job));
    const ok = it => it.jobs === 'all' || !it.jobs || it.jobs.some(x => line.has(x));
    for (const slot in want) {
      const pick = Object.values(ITEMS).filter(it => it.slot === slot && isEquipType(it) && ok(it) && (it.lv || 1) <= pl.baseLv).sort((a, c) => (c.lv || 0) - (a.lv || 0)).slice(0, want[slot]);
      for (const it of pick) { addItem(it.id, 1, true); const e = pl.inventory.filter(x => x.id === it.id).pop(); equipItem(e, true); }
    }
    for (const id of ['red_potion', 'orange_potion', 'blue_potion', 'moon_fur', 'clover', 'living_bark', 'rune_alloy']) if (ITEMS[id]) addItem(id, 7, true);
    if (typeof HuntRunes !== 'undefined') { const hr = HuntRunes.LIST[0]; (pl.hrunesOwn = pl.hrunesOwn || []).push(hr.id); pl.hrunes = [hr.id, null]; }
    if (typeof Passive !== 'undefined') for (const id of ['0a', '0b', '0c', '0d', '0e', '0f', '0g', '0h', '1a', '1b']) try { Passive.alloc(pl, id); } catch (e) {}
    pl.zeny = 123456; recalc(); if (typeof UI !== 'undefined') UI.dirty();
  }, JOB);
  await p.waitForTimeout(600);

  // ---------- แมพ ----------
  const MAPS = [['eldheim', 20, 24, 'Neo Eldheim', 'เมือง: พื้นหินอ่อน 3D คลอง น้ำพุคริสตัล แท่น Bifrost + Norn\'s Wheel ชาวเมืองเดินเล่น'],
    ['eldheim', 20, 12, 'Neo Eldheim — หอคอยและร้านค้า', 'อาคาร 3D v2: หอคอย CENTRAL CORE + ร้าน SUPPLY / ARMORY ป้ายแผ่นไม้ขอบทอง', 'map_eldheim_core'],
    ['eldheim', 27, 22, 'Neo Eldheim — ร้านฝั่งตะวันออก', 'ARMORY บ้านยาวนอร์ส + FORGE โรงตีเหล็ก (Brokk) คลองและสะพาน', 'map_eldheim_shops'],
    ['meadow', 40, 30, 'Emerald Meadow', 'ทุ่งหญ้า: ลายพื้นแบบภาพวาด ผีเสื้อ นก ใบไม้ร่วง มอนเส้นขอบเข้ม + ชื่อใต้ตัว'],
    ['mistlake', 48, 40, 'Mistlake Plains', 'ที่ราบทะเลสาบ: ซากโบราณในบ่อน้ำ + เงาสะท้อน'],
    ['wolfwood', 31, 57, 'Wolfwood Forest', 'ป่ากลางคืน: ต้นหมาป่าเก่า (ต้นไม้ยักษ์) โทเท็มหัวหมาป่า เห็ดเรือง'],
    ['helcave', 37, 44, "Hel's Hollow", 'ถ้ำ: บัลลังก์ Hel + แท่นออบซิเดียน + ชั้นวางประกาย ผนังหน้าผา 3D'],
    ['archive', 36, 46, 'Archive Depths', 'ถ้ำ: ชั้นวางสลักผนัง ประตูห้องนิรภัย ตู้กลางห้องโถง'],
    ['roots', 84, 38, 'Gnawed Roots', 'ถ้ำ: รากยักษ์โค้งข้ามทาง ประตูรากของ Garmr (จุดเกิด MVP)'],
    ['abyss', 42, 40, "Nidhogg's Hollow", 'บทที่ 7: รังของ Nidhogg (Lv 58–70)'],
    ['arena', 17, 17, 'Arena (PvP)', 'โคลอสเซียม v2: อัฒจันทร์ ผู้ชม คบเพลิง กำแพงซุ้มโค้ง ฝั่งใต้เป็นซากพัง']];
  for (const [id, x, y, title, desc, key] of MAPS) {
    const ok = await p.evaluate(([id, x, y]) => {
      if (!MAP_DEFS[id]) return false;
      changeMap(id, x + 0.5, y + 0.5);
      const pl = G.player, m = G.map;
      if (m.walkable && !m.walkable(Math.floor(pl.x), Math.floor(pl.y))) { // จุดที่ขอเดินไม่ได้ → หาช่องเดินได้ใกล้สุด
        let best = null;
        for (let r = 1; r < 20 && !best; r++) for (let dx = -r; dx <= r && !best; dx++) for (let dy = -r; dy <= r && !best; dy++) if (m.inb(x + dx, y + dy) && m.walkable(x + dx, y + dy)) best = [x + dx, y + dy];
        if (best) { pl.x = best[0] + 0.5; pl.y = best[1] + 0.5; }
      }
      window.__closeAll();
      return true;
    }, [id, x, y]);
    if (!ok) continue;
    await p.waitForTimeout(6000); // ภาพ 3D ของแมพโหลดเมื่อเข้าแมพ + รอป้ายชื่อแมพ/ตัวเลขลอยจางก่อน
    await snap(p, key || 'map_' + id, title, desc);
  }

  // ---------- หน้าต่าง (ที่เมือง) ----------
  await p.evaluate(() => { changeMap('eldheim', 20.5, 24.5); }); await p.waitForTimeout(2500);
  const WIN = [
    ['status', () => UI.open('w-status'), 'Status', 'สองคอลัมน์ ค่าพื้นฐาน | โจมตี+ป้องกัน • แจกแต้มแบบ −/+ แล้วยืนยัน • การ์ด Hunt Rune'],
    ['inv', () => UI.open('w-inv'), 'กระเป๋า', 'ตารางช่องแบบ RO • ดับเบิลคลิกใช้/สวม • ลากไปแถบลัด'],
    ['equip', () => UI.open('w-equip'), 'อุปกรณ์', 'ช่องสวมใส่ซ้าย/ขวา ตัวละครยืนกลาง (Paperdoll) เครื่องประดับ 2 ช่อง'],
    ['skills', () => UI.open('w-skills'), 'Skills', 'แท็บตามขั้น Class • ความชำนาญ • แถวรูนใต้สกิล'],
    ['runes_skill', () => Runebook.open('skill'), 'Runes — Skill Runes', 'Shift+R • การ์ด None + รูน 2 แบบต่อสกิล (Class 3: Oath / รูน ★)'],
    ['runes_hunt', () => Runebook.open('hunt'), 'Runes — Hunt Runes', 'ช่อง I/II (Base Lv 15/35) • ซื้อที่ Brokk แล้วใส่ที่นี่'],
    ['passive', () => UI.open('w-tree'), 'Passive', 'ต้นไม้ 6 แฉก • เมเตอร์เพดาน • Notable/Keystone มีเงื่อนไข'],
    ['builds', () => UI.open('w-builds'), 'Builds', 'ตัวละครละ 3 ชุด • Build Code IV-BUILD: (ดูได้ในแท็บ Build Code ของหน้านี้)'],
    ['quest', () => UI.open('w-quest'), 'สมุดเควสต์', 'เควสต์หลัก/เสริม/Daily + แท็บ Lore (Valhalla Codex)'],
    ['bot', () => UI.open('w-bot'), 'บอท (AUTO)', 'การ์ดตามหมวด + Battle Script (โหมดขั้นสูง)'],
    ['world', () => UI.open('w-world'), 'แผนที่โลก (W)', 'แผนที่ภาพวาดบนกระดาษเก่า บนดิน/ใต้ดิน'],
    ['areamap', () => UI.open('w-map'), 'แผนที่พื้นที่ (M)', 'แผนที่ภาพวาดของแมพปัจจุบัน ประตู NPC บอส'],
    ['forge', () => { const n = Object.values(MAP_DEFS).flatMap(d => d.npcs || []).find(x => /brokk/i.test(x.name)); G.player.x = n.x + 0.5; G.player.y = n.y + 1.5; G.player.path = []; UI.openForge(n); }, 'เตาของ Brokk', 'แท็บ Refine / Chips / Hunt Rune — สมุดเปิด ไม่ใช่เมนูบทสนทนา'],
    ['options', () => UI.open('w-options'), 'ตั้งค่า', 'การ์ดตามหมวด สวิตช์ /nc /ns ฟองคำพูด NPC'],
    ['help', () => UI.open('w-help'), 'วิธีเล่น (H)', 'การควบคุมทั้งหมด รวม Shift+R และคลิกขวา/แตะค้างดูการ์ดยูนิต'],
  ];
  for (const [key, fn, title, desc] of WIN) {
    const ok = await p.evaluate(src => { try { window.__closeAll(); (0, eval)('(' + src + ')')(); return true; } catch (e) { return String(e); } }, fn.toString());
    if (ok !== true) { console.warn('skip', key, ok); continue; }
    await p.waitForTimeout(900);
    await snap(p, 'win_' + key, title, desc);
  }
  await p.evaluate(() => { window.__closeAll(); });
  // การ์ดยูนิต (คลิกขวาที่มอน)
  await p.evaluate(() => { changeMap('meadow', 40.5, 30.5); }); await p.waitForTimeout(2500);
  const uc = await p.evaluate(() => { const pl = G.player, m = G.mobs.filter(x => !x.dead).sort((a, b) => Math.hypot(a.x - pl.x, a.y - pl.y) - Math.hypot(b.x - pl.x, b.y - pl.y))[0]; if (!m || typeof UnitCard === 'undefined') return false; UnitCard.open({ kind: 'mob', ref: m }, 900, 260); return true; });
  if (uc) { await p.waitForTimeout(600); await snap(p, 'unitcard', 'การ์ดยูนิต', 'คลิกขวา (คอม) / แตะค้าง 0.5 วิ (มือถือ): Lv เผ่า ธาตุ แพ้-ต้านธาตุ Hunt Rune ที่ช่วย ดรอป+โอกาส'); }
  // ป้ายชื่อ + การต่อสู้ (ตีมอนใกล้ตัว)
  await p.evaluate(() => { if (typeof UnitCard !== 'undefined') UnitCard.close(); const pl = G.player, m = G.mobs.filter(x => !x.dead).sort((a, b) => Math.hypot(a.x - pl.x, a.y - pl.y) - Math.hypot(b.x - pl.x, b.y - pl.y))[0]; if (m) pl.target = m; });
  await p.waitForTimeout(2500);
  await snap(p, 'combat', 'การต่อสู้', 'ป้ายชื่อแบบ RO สี Lv ตามความยาก • เลขดาเมจ + ▲/▼ แพ้/ต้านธาตุ • ปุ่ม AUTO / ULT');
  await ctx.close();

  // ---------- มือถือแนวตั้ง 390×844 ----------
  const mctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const m = await mctx.newPage();
  m.on('pageerror', e => errs.push('phone: ' + e.message));
  await m.goto(BASE); await m.waitForSelector('#auth', { state: 'visible', timeout: 20000 }); await m.waitForTimeout(800);
  await m.click('#au-offline'); await m.click('#btn-new'); await m.fill('#cr-name', 'Codex'); await m.click('#cr-start'); await m.waitForTimeout(1500);
  await m.waitForFunction(() => { const x = document.querySelector('#prologue-skip'); if (x && x.offsetParent) x.click(); return !x || !x.offsetParent; }, null, { timeout: 10000, polling: 250 }).catch(() => {});
  await m.waitForTimeout(800); await m.click('#w-help .win-x').catch(() => {});
  await m.evaluate(() => { changeMap('meadow', 40.5, 30.5); }); await m.waitForTimeout(6000);
  await m.screenshot({ path: path.join(OUT, 'phone_hud.jpg'), type: 'jpeg', quality: 80 }); SHOTS.push({ key: 'phone_hud', title: 'มือถือแนวตั้ง', desc: 'ปุ่ม Quest ใต้การ์ดตัวละคร (ตัวเลข = Daily ที่เหลือ) จอยซ้าย ปุ่มโจมตีขวา', phone: true });
  await m.evaluate(() => UI.open('w-inv')); await m.waitForTimeout(800);
  await m.screenshot({ path: path.join(OUT, 'phone_inv.jpg'), type: 'jpeg', quality: 80 }); SHOTS.push({ key: 'phone_inv', title: 'มือถือ — กระเป๋า', desc: 'ตาราง 5 คอลัมน์ แตะช่อง = แผ่นรายละเอียดเลื่อนขึ้น', phone: true });
  await mctx.close();
  await b.close(); srv.close();
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ when: new Date().toISOString(), job: JOB, shots: SHOTS }, null, 1));
  if (errs.length) console.warn('หน้าเกมมี error:', errs);
  console.log('ok', SHOTS.length, 'ภาพ →', OUT);
})();
