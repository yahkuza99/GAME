// ดึงข้อมูลเกมจริงจากหน้าเกม → JSON สำหรับหน้าเว็บเอกสาร (tools/reference_web/build.py)
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:8790/index.html';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage();
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
    const mobs = Object.values(MOBS).filter(m => !m.dummy && !m.id.startsWith('wb_')).map(m => ({ id: m.id, name: m.name, lv: m.lv, hp: m.hp, atk: m.atk, def: m.def || 0, mdef: m.mdef || 0,
      el: m.element, race: m.race, aggro: !!m.aggro, exp: m.exp, jexp: m.jexp, drops: m.drops || [], chip: MOB_CHIP[m.id] || null, maps: mobMaps[m.id] || [],
      mvp: Object.values(MAP_DEFS).some(d => d.mvp === m.id) }));
    const items = Object.values(ITEMS).map(i => ({ id: i.id, name: i.name, type: i.type, slot: i.slot || null, wtype: i.wtype || null, atk: i.atk || 0, matk: i.matk || 0, def: i.def || 0, mdef: i.mdef || 0,
      b: i.b || null, lv: i.lv || 1, slots: i.slots || 0, jobs: i.jobs || 'all', rarity: i.rarity, price: i.price || 0, desc: i.desc || '' }));
    const jobs = Object.fromEntries(Object.entries(JOBS).map(([k, j]) => [k, { id: k, name: j.name, thai: j.thai, role: j.role, stats: j.stats, hp: j.hp, sp: j.sp, aspd: j.aspd, jobMax: j.jobMax,
      parent: j.parent || null, tier: j.tier || (k === 'novice' ? 0 : 1), bonus: j.bonus || null, glow: j.glow, desc: j.desc, skills: j.skills || [], guide: strip(CLASSBOOK[k] || {}) }]));
    const maps = Object.entries(MAP_DEFS).map(([k, m]) => ({ id: k, name: m.name, thai: m.thai || '', kind: m.kind, level: m.level || '', spawns: m.spawns || [], mvp: m.mvp || null,
      wb: WB.MAPS[k] ? 'wb_' + WB.MAPS[k].mvp : null, links: m.links || {}, npcs: (m.npcs || []).map(n => n.name) }));
    const shopOf = {}; for (const [k, l] of Object.entries(SHOPS)) for (const id of l) shopOf[id] = k;
    return { jobs, second: SECOND_JOBS, req: SECOND_JOB_REQ, jobChange: JOB_CHANGE_LV, skills, mobs, items, maps, sets: strip(LOOT.SETS), quests: strip(QUESTS), shops: SHOPS, shopOf,
      gacha: strip(GACHA_CONFIG), wb: { MULT: WB.MULT, PERIOD: WB.PERIOD, WINDOW: WB.WINDOW, MAPS: WB.MAPS }, daily: strip(Daily.KINDS), wtype: strip(WTYPE_THAI), elem: typeof ELEM_THAI !== 'undefined' ? strip(ELEM_THAI) : {} };
  });
  await b.close();
  fs.writeFileSync(process.argv[2] || 'ref_data.json', JSON.stringify(D));
  console.log('ok', Object.keys(D).map(k => k + ':' + (Array.isArray(D[k]) ? D[k].length : typeof D[k])).join(' '));
})();
