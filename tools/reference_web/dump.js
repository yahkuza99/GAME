// ดึงข้อมูลเกมจริงจากหน้าเกม → JSON สำหรับหน้าเว็บเอกสาร (tools/reference_web/build.py)
// เปิดเซิร์ฟเวอร์ไฟล์ในตัวเอง (หรือ BASE=<url>) • CHROME=/path/to/chrome ได้ (ไม่ตั้ง = /opt/pw-browsers/chromium ถ้ามี ไม่งั้น Chromium ของ Playwright)
// ส่วนเสริม (Class 3 / รูน / Hunt Rune / ไม้ตาย / Passive / ท่าบอส / เควสต์เสริม ฯลฯ) มาจาก tools/ref_extract.js — ใช้ร่วมกับ make_reference.js
const { chromium } = require('playwright');
const fs = require('fs');
const { extract, launchOpts, gameUrl, LANDMARKS, GATES } = require('../ref_extract');
(async () => {
  const srv = await gameUrl(), BASE = srv.url;
  const b = await chromium.launch(launchOpts());
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE); await p.waitForTimeout(1500);
  const D = await p.evaluate(() => {
    const strip = o => JSON.parse(JSON.stringify(o, (k, v) => typeof v === 'function' ? undefined : v));
    const owner = {};
    for (const [jid, j] of Object.entries(JOBS)) for (const k of j.skills || []) owner[k] = jid;
    const skills = Object.values(SKILLS).map(s => {
      let sp1 = null, spMax = null; try { if (s.sp) { sp1 = s.sp(1); spMax = s.sp(s.max); } } catch (e) {}
      return { id: s.id, name: s.name, type: s.type, max: s.max, desc: s.desc, cd: s.cd || 0, job: owner[s.id] || null,
        req: s.req || null, sp1, spMax, el: s.dmg && s.dmg.element || null, area: !!(s.dmg && s.dmg.area), melee: !!s.melee };
    });
    const mobMaps = {};
    for (const [mk, md] of Object.entries(MAP_DEFS)) { for (const [mid, n] of md.spawns || []) (mobMaps[mid] = mobMaps[mid] || []).push(mk); if (md.mvp) (mobMaps[md.mvp] = mobMaps[md.mvp] || []).push(mk); }
    const mobs = Object.values(MOBS).filter(m => !m.dummy && !m.id.startsWith('wb_') && !m.minion && !/^c3_/.test(m.id)).map(m => ({ id: m.id, name: m.name, lv: m.lv, hp: m.hp, atk: m.atk, def: m.def || 0, mdef: m.mdef || 0,
      el: m.element, race: m.race, aggro: !!m.aggro, exp: m.exp, jexp: m.jexp, drops: m.drops || [], chip: MOB_CHIP[m.id] || null, maps: mobMaps[m.id] || [],
      mvp: Object.values(MAP_DEFS).some(d => d.mvp === m.id), elite: !!m.elite, zeny: typeof mobZeny === 'function' ? mobZeny(m) : null }));
    const items = Object.values(ITEMS).map(i => ({ id: i.id, name: i.name, type: i.type, slot: i.slot || null, wtype: i.wtype || null, atk: i.atk || 0, matk: i.matk || 0, def: i.def || 0, mdef: i.mdef || 0,
      b: i.b || null, lv: i.lv || 1, slots: i.slots || 0, jobs: i.jobs || 'all', rarity: i.rarity, price: i.price || 0, desc: i.desc || '' }));
    const jobs = Object.fromEntries(Object.entries(JOBS).map(([k, j]) => [k, { id: k, name: j.name, thai: j.thai, role: j.role, stats: j.stats, hp: j.hp, sp: j.sp, aspd: j.aspd, jobMax: j.jobMax,
      parent: j.parent || null, tier: j.tier || (k === 'novice' ? 0 : 1), bonus: j.bonus || null, glow: j.glow, desc: j.desc, skills: j.skills || [], guide: strip(CLASSBOOK[k] || {}) }]));
    const maps = Object.entries(MAP_DEFS).map(([k, m]) => ({ id: k, name: m.name, thai: m.thai || '', kind: m.kind, level: m.level || '', spawns: m.spawns || [], mvp: m.mvp || null,
      wb: WB.MAPS[k] ? 'wb_' + WB.MAPS[k].mvp : null, links: m.links || {}, npcs: (m.npcs || []).map(n => n.name), w: m.w || null, h: m.h || null }));
    const shopOf = {}; for (const [k, l] of Object.entries(SHOPS)) for (const id of l) shopOf[id] = k;
    // Build Code (หน้า Build): จุด Passive ทุกจุด + ช่องอุปกรณ์ตามลำดับในโค้ด
    const ptree = Object.fromEntries(Object.values(PTREE).map(n => [n.id, { name: n.name, kind: n.kind, b: Object.entries(n.b || {}).map(([k, v]) => PSTAT_FMT(k, v)).join(', '), fx: n.fdesc || '' }]));
    return { jobs, second: SECOND_JOBS, req: SECOND_JOB_REQ, jobChange: JOB_CHANGE_LV, skills, mobs, items, maps, sets: strip(LOOT.SETS), quests: strip(QUESTS), shops: SHOPS, shopOf,
      gacha: strip(GACHA_CONFIG), wb: { MULT: WB.MULT, PERIOD: WB.PERIOD, WINDOW: WB.WINDOW, MAPS: WB.MAPS }, daily: strip(Daily.KINDS), wtype: strip(WTYPE_THAI), elem: typeof ELEM_THAI !== 'undefined' ? strip(ELEM_THAI) : {},
      ptree, equipSlots: typeof EQUIP_SLOTS !== 'undefined' ? EQUIP_SLOTS.slice() : [], buildPrefix: typeof LO_PREFIX !== 'undefined' ? LO_PREFIX : 'IV-BUILD:' };
  });
  Object.assign(D, await p.evaluate(extract), { landmarks: LANDMARKS, gates: GATES });
  // ไอคอนย้อมสี (Art.alias — สกิล/ตรา Class ที่ยังไม่มีไฟล์ภาพของตัวเอง เช่น Class 3): ให้เกมย้อมเองแล้วเก็บเป็นภาพ
  D.aliasIcons = await p.evaluate(async () => {
    const keys = [...Object.keys(SKILLS).map(id => 'skill_' + id), ...Object.keys(JOBS).flatMap(j => ['emblem_' + j, 'job_' + j + '_m', 'job_' + j + '_f'])].filter(k => Art.aliases[k]);
    const out = {}, sleep = ms => new Promise(r => setTimeout(r, ms));
    for (let t = 0; t < 60 && Object.keys(out).length < keys.length; t++) {
      for (const k of keys) {
        if (out[k]) continue;
        const im = Art.get(k); if (!im || !(im.width || im.naturalWidth)) continue;
        const Z = k.startsWith('job_') ? 240 : 56, c = document.createElement('canvas'); c.width = c.height = Z; // ภาพ Class ใหญ่กว่าไอคอน
        const g = c.getContext('2d'), W = im.width || im.naturalWidth, H = im.height || im.naturalHeight, s = Math.min(Z / W, Z / H);
        g.drawImage(im, (Z - W * s) / 2, (Z - H * s) / 2, W * s, H * s);
        out[k] = c.toDataURL('image/webp', 0.82);
      }
      await sleep(200);
    }
    return out;
  });
  await b.close(); srv.close();
  if (errs.length) console.warn('หน้าเกมมี error:', errs.join(' | '));
  fs.writeFileSync(process.argv[2] || 'ref_data.json', JSON.stringify(D));
  console.log('ok', Object.keys(D).map(k => k + ':' + (Array.isArray(D[k]) ? D[k].length : D[k] && typeof D[k] === 'object' ? Object.keys(D[k]).length : typeof D[k])).join(' '));
})();
