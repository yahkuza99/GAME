'use strict';
// ============================================================
//  สร้างข้อมูลฝั่งเซิร์ฟเวอร์สำหรับระบบตรวจเซฟ (supabase/migrations/20261012000000_save_verify.sql)
//  อ่านจากหน้าเกมที่รันจริง (ITEMS / JOBS / MOBS / GACHA_CONFIG หลังโหลดทุกไฟล์ — รวมของที่ไฟล์เสริมเพิ่มทีหลัง) แล้วเขียน
//    supabase/migrations/20261012000100_save_verify_data.sql — ตาราง id ไอเทม (+มูลค่า) / Class (+Job สูงสุด, Class แม่) / ค่าฐานของอัตรา
//    tests/save_verify_data.json                             — ข้อมูลชุดเดียวกัน ให้ตัวจำลองกติกา (supabase/save_verify_rules.js) ใช้ในเทสต์
//  รันใหม่ทุกครั้งที่เพิ่ม/แก้ไอเทม มอน Class แล้วรันไฟล์ SQL ที่ได้ใน Supabase SQL Editor (รันซ้ำได้ — upsert ไม่ลบ id เก่า)
//  ใช้: NODE_PATH=$(npm root -g) node tools/gen_item_ids.js   (CHROME=/path/to/chrome ได้ • BASE=<url> ถ้ามีเซิร์ฟเวอร์อยู่แล้ว)
// ============================================================
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const { launchOpts, gameUrl } = require('./ref_extract');

const ROOT = path.join(__dirname, '..');
const OUT_SQL = path.join(ROOT, 'supabase', 'migrations', '20261012000100_save_verify_data.sql');
const OUT_JSON = path.join(ROOT, 'tests', 'save_verify_data.json');
const OUT_ECON = path.join(ROOT, 'supabase', 'migrations', '20261012001100_economy_data.sql');
const OUT_CHAIN = path.join(ROOT, 'supabase', 'migrations', '20261012002100_event_chain_data.sql');

(async () => {
  const srv = await gameUrl();
  const b = await chromium.launch(launchOpts());
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/^https:\/\//, r => r.abort());
  await p.goto(srv.url, { timeout: 180000 });
  await p.waitForFunction(() => typeof ITEMS !== 'undefined' && typeof MOBS !== 'undefined' && typeof JOBS !== 'undefined' && typeof Gacha !== 'undefined', null, { timeout: 180000 });
  await p.waitForTimeout(2500); // ไฟล์เสริม (Class 3 / content_world) เพิ่มข้อมูลตอนโหลด
  const D = await p.evaluate(() => {
    const worth = id => Math.floor((ITEMS[id] && ITEMS[id].price || 0) / 2); // = ราคาขายร้าน NPC (ขายของ = มูลค่ารวมไม่เปลี่ยน)
    const items = {};
    const shop = new Set(Object.values(SHOPS).flat());
    for (const [id, it] of Object.entries(ITEMS)) items[id] = { w: worth(id), eq: it.type === 'weapon' || it.type === 'armor' ? 1 : 0, card: it.type === 'card' ? 1 : 0, p: it.price || 0, shop: shop.has(id) ? 1 : 0 };
    // ตรากาชา: มูลค่า = ค่าคาดหมายของการหมุน 1 ครั้ง (หมุนแล้วมูลค่ารวมไม่กระโดด)
    const C = GACHA_CONFIG, tot = C.table.reduce((s, r) => s + (r.pct || 0), 0);
    const ev = C.table.reduce((s, r) => s + (r.pct || 0) * (r.volt ? r.volt : (r.qty || 1) * worth(r.id)), 0) / Math.max(1, tot) / Math.max(1, C.cost);
    if (items[C.token]) items[C.token].w = Math.max(items[C.token].w, Math.ceil(ev));
    const jobs = {};
    for (const [id, j] of Object.entries(JOBS)) jobs[id] = { max: j.jobMax, tier: id === 'novice' ? 0 : (j.tier || 1), parent: j.parent || (id === 'novice' ? null : 'novice') };
    // ต่อการฆ่า 1 ตัว (มอนธรรมดา ไม่นับบอส/ลูกสมุน) — ค่าสูงสุดในเกม
    let exp = 0, jexp = 0, val = 0, valMob = '', expMob = '';
    for (const [id, m] of Object.entries(MOBS)) {
      if (m.boss || m.dummy || !(m.exp > 0)) continue;
      if (m.exp > exp) { exp = m.exp; expMob = id; }
      jexp = Math.max(jexp, m.jexp || 0);
      const z = mobZeny(m)[1];
      const drops = (m.drops || []).reduce((s, [d, ch]) => s + ch * worth(d), 0);
      if (z + drops > val) { val = z + drops; valMob = id; }
    }
    let boss = 0;
    for (const m of Object.values(MOBS)) if (m.boss) boss = Math.max(boss, m.exp || 0);
    // ระยะ 2 (เซิร์ฟเวอร์ทอยดรอป/EXP): ตารางมอน + มอนที่เกิดในแต่ละแผนที่ + ค่าตรากาชา/ชิป
    const mobs = {};
    for (const [id, m] of Object.entries(MOBS)) {
      const z = m.dummy ? [0, 0] : mobZeny(m);
      mobs[id] = { lv: m.lv | 0, exp: m.exp | 0, jexp: m.jexp | 0, zmin: z[0] | 0, zmax: z[1] | 0, boss: m.boss ? 1 : 0, wb: (m.worldBoss || /^wb_/.test(id)) ? 1 : 0, elite: m.elite ? 1 : 0,
        respawn: m.respawn | 0, drops: (m.drops || []).filter(([d]) => ITEMS[d]).map(([d, ch]) => [d, ch]), chip: (typeof MOB_CHIP !== 'undefined' && MOB_CHIP[id] && ITEMS[MOB_CHIP[id]]) ? MOB_CHIP[id] : null };
    }
    const spawns = [];
    for (const [mid, md] of Object.entries(MAP_DEFS)) {
      for (const sp of md.spawns || []) if (MOBS[sp[0]]) spawns.push([mid, sp[0], Math.max(1, sp[1] | 0)]);
      if (md.mvp && MOBS[md.mvp]) spawns.push([mid, md.mvp, 1]);
    }
    if (typeof WB !== 'undefined' && WB.MAPS) for (const [mid, w] of Object.entries(WB.MAPS)) { const wid = 'wb_' + w.mvp; if (MOBS[wid] && MAP_DEFS[mid]) spawns.push([mid, wid, 1]); }
    const gacha = { token: C.token, base: C.mobDrop.base, fullGap: C.mobDrop.fullGap, zeroGap: C.mobDrop.zeroGap, eliteMul: C.mobDrop.eliteMul, mvp: C.drop.mvp, wb: C.drop.worldBoss };
    return {
      mobs, spawns, gacha, chip: { drop: CHIP_DROP, boss: CHIP_DROP_BOSS },
      items, jobs,
      derived: {
        exp_per_kill: Math.ceil(exp * 1.4), jexp_per_kill: Math.ceil(jexp * 1.4), worth_per_kill: Math.ceil(val), boss_exp: boss,
        party_mul: Math.round((1 + PARTY_BONUS * (PARTY_MAX - 1)) * 100) / 100, max_base_lv: MAX_BASE_LV, sigil_worth: items[C.token] ? items[C.token].w : 0,
        src: { exp: expMob, worth: valMob },
      },
      // ตีบวก (js/npc.js NPC.refineCalc / js/loot.js LOOT): โอกาสต่อขั้น · ค่าบริการ = fee × (ขั้น+1) · แร่ตั้งแต่ ore_from
      refine: { rate: NPC.REFINE_RATE.slice(), weapon_fee: 250, armor_fee: 400, // ค่าบริการ = costAt ใน NPC.refineCalc (อาวุธ 250 · อื่น 400) × (ขั้น+1)
        ore: { weapon: LOOT.ORE.weapon, armor: LOOT.ORE.armor }, ore_from: LOOT.ORE_FROM },
    };
  });
  await b.close(); srv.close();
  if (errs.length) console.warn('หน้าเกมมี error:', errs.slice(0, 3).join(' | '));

  const ids = Object.keys(D.items).sort();
  const q = s => "'" + String(s).replace(/'/g, "''") + "'";
  const L = [];
  L.push('-- ============================================================');
  L.push('--  ข้อมูลสำหรับระบบตรวจเซฟ — สร้างอัตโนมัติด้วย tools/gen_item_ids.js (ห้ามแก้มือ)');
  L.push(`--  ไอเทม ${ids.length} ชิ้น · Class ${Object.keys(D.jobs).length} · ค่าฐานอัตรา: ${JSON.stringify(D.derived)}`);
  L.push('--  รันหลัง 20261012000000_save_verify.sql • รันซ้ำได้ (upsert — ไม่ลบ id เก่า เซฟเก่าที่ยังมีของเลิกขายจะไม่ถูกตีว่าไอเทมปลอม)');
  L.push('-- ============================================================');
  L.push('insert into public.save_verify_items (id, worth, equip, card) values');
  L.push(ids.map(id => `  (${q(id)}, ${D.items[id].w}, ${D.items[id].eq ? 'true' : 'false'}, ${D.items[id].card ? 'true' : 'false'})`).join(',\n'));
  L.push('on conflict (id) do update set worth = excluded.worth, equip = excluded.equip, card = excluded.card;');
  L.push('');
  const jids = Object.keys(D.jobs).sort();
  L.push('insert into public.save_verify_jobs (id, job_max, tier, parent) values');
  L.push(jids.map(id => { const j = D.jobs[id]; return `  (${q(id)}, ${j.max}, ${j.tier}, ${j.parent ? q(j.parent) : 'null'})`; }).join(',\n'));
  L.push('on conflict (id) do update set job_max = excluded.job_max, tier = excluded.tier, parent = excluded.parent;');
  L.push('');
  const der = Object.assign({}, D.derived); delete der.src;
  L.push(`update public.save_verify_config set derived = derived || ${q(JSON.stringify(der))}::jsonb, updated_at = now() where id = 1;`);
  L.push('');
  fs.writeFileSync(OUT_SQL, L.join('\n'));
  fs.writeFileSync(OUT_JSON, JSON.stringify({ items: D.items, jobs: D.jobs, derived: der, refine: D.refine, mobs: D.mobs, spawns: D.spawns, gacha: D.gacha, chip: D.chip }) + '\n');
  // ระยะ 1 (เศรษฐกิจฝั่งเซิร์ฟเวอร์ — 20261012001000_economy.sql): ราคาร้าน / ของที่ร้าน NPC ขาย / สูตรตีบวก
  const E = [];
  E.push('-- ============================================================');
  E.push('--  ข้อมูลร้าน NPC + ตีบวก สำหรับเศรษฐกิจฝั่งเซิร์ฟเวอร์ — สร้างอัตโนมัติด้วย tools/gen_item_ids.js (ห้ามแก้มือ)');
  E.push('--  รันหลัง 20261012001000_economy.sql (และ 20261012000100_save_verify_data.sql) • รันซ้ำได้');
  E.push('-- ============================================================');
  E.push('update public.save_verify_items i set price = v.price, shop = v.shop from (values');
  E.push(ids.map(id => `  (${q(id)}, ${D.items[id].p}, ${D.items[id].shop ? 'true' : 'false'})`).join(',\n'));
  E.push(') as v(id, price, shop) where i.id = v.id;');
  E.push(`update public.save_verify_config set derived = derived || jsonb_build_object('refine', ${q(JSON.stringify(D.refine))}::jsonb), updated_at = now() where id = 1;`);
  E.push('');
  const has = f => fs.existsSync(path.join(ROOT, 'supabase', 'migrations', f)); // เขียนไฟล์ข้อมูลเฉพาะระยะที่มี migration แล้ว
  if (has('20261012001000_economy.sql')) fs.writeFileSync(OUT_ECON, E.join('\n'));
  // ระยะ 2 (20261012002000_event_chain.sql): มอน / มอนในแต่ละแผนที่ / ตรากาชา / ชิป
  const C2 = [], seen = new Set();
  C2.push('-- ============================================================');
  C2.push('--  ข้อมูลมอน/แผนที่สำหรับเซิร์ฟเวอร์ทอยดรอป-EXP — สร้างอัตโนมัติด้วย tools/gen_item_ids.js (ห้ามแก้มือ)');
  C2.push('--  รันหลัง 20261012002000_event_chain.sql • รันซ้ำได้ (upsert)');
  C2.push('-- ============================================================');
  const mids = Object.keys(D.mobs).sort();
  C2.push('insert into public.sv_mobs (id, lv, exp, jexp, zmin, zmax, boss, wb, elite, respawn_ms, drops, chip) values');
  C2.push(mids.map(id => { const m = D.mobs[id]; return `  (${q(id)}, ${m.lv}, ${m.exp}, ${m.jexp}, ${m.zmin}, ${m.zmax}, ${!!m.boss}, ${!!m.wb}, ${!!m.elite}, ${m.respawn}, ${q(JSON.stringify(m.drops))}::jsonb, ${m.chip ? q(m.chip) : 'null'})`; }).join(',\n'));
  C2.push('on conflict (id) do update set lv = excluded.lv, exp = excluded.exp, jexp = excluded.jexp, zmin = excluded.zmin, zmax = excluded.zmax, boss = excluded.boss, wb = excluded.wb,');
  C2.push('  elite = excluded.elite, respawn_ms = excluded.respawn_ms, drops = excluded.drops, chip = excluded.chip;');
  C2.push('');
  const sp = D.spawns.filter(([m, b]) => { const k = m + '|' + b; if (seen.has(k)) return false; seen.add(k); return true; });
  C2.push('insert into public.sv_map_mobs (map, mob, n) values');
  C2.push(sp.map(([m, b, n]) => `  (${q(m)}, ${q(b)}, ${n})`).join(',\n'));
  C2.push('on conflict (map, mob) do update set n = excluded.n;');
  C2.push('');
  C2.push(`update public.save_verify_config set derived = derived || jsonb_build_object('gacha', ${q(JSON.stringify(D.gacha))}::jsonb, 'chip_drop', ${D.chip.drop}, 'chip_boss', ${D.chip.boss}), updated_at = now() where id = 1;`);
  C2.push('');
  if (has('20261012002000_event_chain.sql')) fs.writeFileSync(OUT_CHAIN, C2.join('\n'));
  console.log(`items ${ids.length} · jobs ${jids.length} · mobs ${mids.length} · spawns ${sp.length} · derived ${JSON.stringify(D.derived)}`);
  console.log('wrote', [OUT_SQL, OUT_ECON, OUT_CHAIN, OUT_JSON].map(f => path.relative(ROOT, f)).join(' + '));
})().catch(e => { console.error(e); process.exit(1); });
