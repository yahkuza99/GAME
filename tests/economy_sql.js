'use strict';
// ============================================================
//  เศรษฐกิจฝั่งเซิร์ฟเวอร์ (supabase/migrations/20261012001000_economy.sql) บน Postgres จริงในเครื่อง (PGlite — ไม่ต่อ Supabase)
//  ร้าน NPC ซื้อ/ขาย · ตีบวก (สุ่มฝั่งเซิร์ฟเวอร์) · ตลาด วาง/แก้ราคา/ยกเลิก/ซื้อ (อะตอมมิก + tid ซ้ำไม่ซื้อซ้ำ) · แลกเปลี่ยนสลับทีเดียว
//  เซฟที่ตามไม่ทันถูกเติม · ของปั๊ม (uid ที่ออกไปแล้วโผล่กลับ) ถูกจับ/ตัด · ปิดระบบ (econ=false) · เข้ากับระบบตรวจเซฟ (ไม่มีธงเมื่อเล่นสุจริต)
//  รัน:  PGLITE=<โฟลเดอร์ node_modules ที่มี @electric-sql/pglite> node tests/economy_sql.js
// ============================================================
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
let PGlite;
try { PGlite = require(process.env.PGLITE ? path.join(process.env.PGLITE, '@electric-sql/pglite') : '@electric-sql/pglite').PGlite; }
catch (e) { console.log('SKIP: ไม่พบ @electric-sql/pglite (ตั้ง PGLITE=<node_modules>)'); process.exit(0); }

let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) { pass++; console.log('✔', name, info ? ` (${info})` : ''); } else { fail++; console.log('✘', name, info ? ` (${info})` : ''); } };
const MIG = f => fs.readFileSync(path.join(ROOT, 'supabase', 'migrations', f), 'utf8');
const U1 = '11111111-1111-1111-1111-111111111111', U2 = '22222222-2222-2222-2222-222222222222', U3 = '33333333-3333-3333-3333-333333333333';
const ch = o => Object.assign({ name: 'Aria', job: 'einherjar', baseLv: 40, jobLv: 20, baseExp: 0, jobExp: 0, stats: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 }, statPoints: 200, zeny: 100000,
  inventory: [{ id: 'red_potion', qty: 15 }, { id: 'apple', qty: 40 }, { id: 'cutter', qty: 1, uid: 3, refine: 2, cards: [] }, { id: 'rune_alloy', qty: 3 }],
  equip: { weapon: { id: 'sword', qty: 1, uid: 4, refine: 3, cards: [] }, armor: { id: 'cotton_shirt', qty: 1, uid: 5, refine: 0, cards: [] } }, storage: [] }, o);
const acct = (...c) => ({ v: 2, active: 0, chars: c });

(async () => {
  const db = new PGlite();
  const q = (s, p) => db.query(s, p);
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon; grant execute on function auth.uid() to authenticated, anon;
    grant usage on schema public to authenticated, anon;
    alter default privileges in schema public grant all on tables to anon, authenticated;
  `);
  for (const f of ['20261001000000_online_init.sql', '20261001120000_multi_char_names.sql', '20261011000000_single_session.sql', '20261012000000_save_verify.sql',
    '20261012000100_save_verify_data.sql', '20261012001000_economy.sql', '20261012001100_economy_data.sql', '20261012002000_event_chain.sql', '20261012002100_event_chain_data.sql']) {
    try { await db.exec(MIG(f).replace(/-- เปิด Realtime[\s\S]*?end \$\$;/g, '')); ok('รัน ' + f, true); } catch (e) { ok('รัน ' + f, false, e.message); throw e; }
  }
  try { await db.exec(MIG('20261012001000_economy.sql')); await db.exec(MIG('20261012001100_economy_data.sql')); ok('รันซ้ำได้ (idempotent)', true); } catch (e) { ok('รันซ้ำได้', false, e.message); }
  await db.exec(`insert into auth.users values ('${U1}'), ('${U2}'), ('${U3}');`);
  for (const [u, n] of [[U1, 'Aria'], [U2, 'Bryn'], [U3, 'Cato']]) await q(`insert into public.characters (user_id, name, data) values ($1, $2, $3)`, [u, n, JSON.stringify(acct(ch({ name: n })))]);

  const asUser = async (u, fn) => {
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${u}', false);`);
    try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
  };
  const rpc = (u, sql, p) => asUser(u, async () => { try { return { r: (await q(sql, p)).rows[0] }; } catch (e) { return { err: e.message }; } });
  const C = async u => (await q(`select data from public.characters where user_id = $1`, [u])).rows[0].data.chars[0];
  const count = (c, id) => (c.inventory || []).filter(e => e.id === id).reduce((s, e) => s + e.qty, 0);
  const save = (u, data) => asUser(u, async () => { try { await q(`update public.characters set data = $2 where user_id = $1`, [u, JSON.stringify(data)]); return null; } catch (e) { return e.message; } });
  const flags = async u => (await q(`select rule from public.cheat_flags where user_id = $1 order by id`, [u])).rows.map(r => r.rule);
  const price = async id => +(await q(`select price from public.save_verify_items where id = $1`, [id])).rows[0].price;
  const ago = async (u, s) => { await q(`update public.characters set updated_at = now() - make_interval(secs => $2) where user_id = $1`, [u, s]); await q(`update public.save_verify_state set at = now() - make_interval(secs => $2) where user_id = $1`, [u, s]); };

  // ---------- ร้าน NPC ----------
  ok('ข้อมูลร้าน: knife ร้านขาย / ราคาตรงเกม', (await q(`select shop, price from public.save_verify_items where id = 'knife'`)).rows[0].shop === true && await price('knife') === 50);
  let a = await rpc(U1, `select public.econ_shop_buy('Aria', 'knife', 2) as r`);
  let c = await C(U1);
  const kn = c.inventory.filter(e => e.id === 'knife');
  ok('ซื้อ Knife ×2: หัก 100 Volt + ได้ 2 ชิ้น uid จากเซิร์ฟเวอร์ (≥ 1e12)', !a.err && c.zeny === 99900 && kn.length === 2 && kn.every(e => e.uid >= 1e12) && c.econSeq === 1, a.err || JSON.stringify(kn));
  ok('ผลคืน delta + seq', a.r && a.r.r.seq === 1 && a.r.r.delta.zeny === -100 && a.r.r.delta.add.length === 2);
  a = await rpc(U1, `select public.econ_shop_buy('Aria', 'red_potion', 10000) as r`);
  ok('ซื้อเกินเงิน → econ_no_zeny + ไม่มีอะไรเปลี่ยน', /econ_no_zeny/.test(a.err || '') && (await C(U1)).zeny === 99900 && (await C(U1)).econSeq === 1, a.err);
  a = await rpc(U1, `select public.econ_shop_buy('Aria', 'jelly_drop', 1) as r`);
  ok('ซื้อของที่ร้านไม่ขาย → econ_not_sold', /econ_not_sold/.test(a.err || ''), a.err);
  a = await rpc(U1, `select public.econ_shop_sell('Aria', $1) as r`, [JSON.stringify([{ id: 'apple', qty: 10 }, { uid: 3 }])]);
  c = await C(U1);
  const sellGain = Math.floor(await price('apple') / 2) * 10 + Math.floor(await price('cutter') / 2);
  ok('ขาย Oil Can ×10 + Cutter: ได้ราคาขายจากตารางเซิร์ฟเวอร์ + ของออก', !a.err && c.zeny === 99900 + sellGain && count(c, 'apple') === 30 && !c.inventory.some(e => e.uid === 3), a.err || `${c.zeny} vs ${99900 + sellGain}`);
  a = await rpc(U1, `select public.econ_shop_sell('Aria', $1) as r`, [JSON.stringify([{ id: 'apple', qty: 999 }])]);
  ok('ขายเกินที่มี → econ_missing_item', /econ_missing_item/.test(a.err || ''), a.err);

  // ---------- ตีบวก ----------
  await q(`update public.save_verify_config set derived = jsonb_set(derived, '{refine,rate}', '[1,1,1,1,1,1,1,1,1,1]')`);
  const z0 = (await C(U1)).zeny;
  a = await rpc(U1, `select public.econ_refine('Aria', 'weapon') as r`);
  c = await C(U1);
  ok('ตีบวกดาบ +3→+4 (โอกาส 100%): ค่าบริการ 250×4 + ไม่ใช้แร่', !a.err && c.equip.weapon.refine === 4 && c.zeny === z0 - 1000 && count(c, 'rune_alloy') === 3 && a.r.r.delta.ok === true, a.err);
  a = await rpc(U1, `select public.econ_refine('Aria', 'weapon') as r`);
  c = await C(U1);
  ok('+4→+5 ใช้แร่ Rune Alloy 1 ชิ้น', !a.err && c.equip.weapon.refine === 5 && count(c, 'rune_alloy') === 2, a.err);
  await q(`update public.save_verify_config set derived = jsonb_set(derived, '{refine,rate}', '[0,0,0,0,0,0,0,0,0,0]')`);
  a = await rpc(U1, `select public.econ_refine('Aria', 'weapon') as r`);
  c = await C(U1);
  ok('พลาด (โอกาส 0%): เสียค่าบริการ+แร่ ของไม่แตก ขั้นเดิม', !a.err && c.equip.weapon.refine === 5 && a.r.r.delta.ok === false && count(c, 'rune_alloy') === 1, a.err);
  await db.exec(MIG('20261012001100_economy_data.sql')); // คืนโอกาสจริง

  // ---------- ตลาด ----------
  a = await rpc(U1, `select public.econ_market_list('Aria', $1, 3000) as r`, [JSON.stringify({ id: 'apple', qty: 20 })]);
  const kuid = (await C(U1)).inventory.find(e => e.id === 'knife').uid;
  const b = await rpc(U1, `select public.econ_market_list('Aria', $1, 500000) as r`, [JSON.stringify({ uid: kuid })]);
  c = await C(U1);
  ok('วางขาย Oil Can ×20 + Knife: ของออกจากกระเป๋าเข้า vend', !a.err && !b.err && count(c, 'apple') === 10 && !c.inventory.some(e => e.uid === kuid) && c.vend.items.length === 2, a.err || b.err);
  a = await rpc(U1, `select public.econ_market_list('Aria', $1, 3000) as r`, [JSON.stringify({ id: 'apple', qty: 5 })]);
  c = await C(U1);
  ok('ชนิดเดิมราคาเดิม = รวมรายการ (25)', !a.err && c.vend.items.length === 2 && c.vend.items.find(x => x.id === 'apple').qty === 25);
  const iApple = c.vend.items.find(x => x.id === 'apple').i, iKnife = c.vend.items.find(x => x.id === 'knife').i;
  await rpc(U1, `select public.econ_market_price('Aria', $1, 400000) as r`, [iKnife]);
  ok('แก้ราคา Knife เป็น 400,000', (await C(U1)).vend.items.find(x => x.id === 'knife').price === 400000);
  // ผู้ซื้อ U2
  const s0 = (await C(U1)).zeny, b0 = (await C(U2)).zeny;
  a = await rpc(U2, `select public.econ_market_buy('tid-0001', $1, 'Aria', $2, 1, 500000, 'Bryn') as r`, [U1, iKnife]);
  ok('ซื้อด้วยราคาเก่า → econ_changed', /econ_changed/.test(a.err || ''), a.err);
  await q(`update public.characters set data = jsonb_set(data, '{chars,0,zeny}', '1000000') where user_id = $1`, [U2]);
  a = await rpc(U2, `select public.econ_market_buy('tid-0002', $1, 'Aria', $2, 1, 400000, 'Bryn') as r`, [U1, iKnife]);
  const cs = await C(U1), cb = await C(U2);
  const got = cb.inventory.find(e => e.id === 'knife');
  ok('ซื้อ Knife 400,000: ผู้ซื้อ −400,000 ได้ของ uid ใหม่ · ผู้ขาย +400,000 · รายการหมด', !a.err && cb.zeny === 600000 && got && got.uid >= 1e12 && got.uid !== kuid && cs.zeny === s0 + 400000 && cs.vend.items.find(x => x.i === iKnife).qty === 0 && cs.mkSales[0].who === 'Bryn', a.err);
  const again = await rpc(U2, `select public.econ_market_buy('tid-0002', $1, 'Aria', $2, 1, 400000, 'Bryn') as r`, [U1, iKnife]);
  ok('tid ซ้ำ = ผลเดิม ไม่ซื้อซ้ำ', !again.err && (await C(U2)).zeny === 600000 && (await C(U2)).inventory.filter(e => e.id === 'knife').length === 1);
  a = await rpc(U3, `select public.econ_market_buy('tid-0003', $1, 'Aria', $2, 1, 400000, 'Cato') as r`, [U1, iKnife]);
  ok('ขายหมดแล้ว → econ_soldout', /econ_soldout/.test(a.err || ''), a.err);
  a = await rpc(U3, `select public.econ_market_buy('tid-0004', $1, 'Aria', $2, 30, 3000, 'Cato') as r`, [U1, iApple]);
  ok('ซื้อเกินจำนวน → econ_stock', /econ_stock/.test(a.err || ''), a.err);
  a = await rpc(U3, `select public.econ_market_buy('tid-0005', $1, 'Aria', $2, 25, 3000, 'Cato') as r`, [U1, iApple]);
  ok('ซื้อ Oil Can ×25 (75,000) ได้', !a.err, a.err);
  a = await rpc(U3, `select public.econ_market_buy('tid-0006', $1, 'Cato', 0, 1, 1, 'Cato') as r`, [U3]);
  ok('ซื้อของตัวเองไม่ได้', /econ_bad_peer/.test(a.err || ''), a.err);
  // ยกเลิก
  await rpc(U1, `select public.econ_market_list('Aria', $1, 777) as r`, [JSON.stringify({ id: 'red_potion', qty: 5 })]);
  const iRed = (await C(U1)).vend.items.find(x => x.id === 'red_potion').i;
  a = await rpc(U1, `select public.econ_market_cancel('Aria', $1) as r`, [iRed]);
  ok('ยกเลิกรายการ: ของคืนกระเป๋า', !a.err && count(await C(U1), 'red_potion') === 15, a.err);

  // ---------- เซฟที่ตามไม่ทัน: เติมให้ / vend ของเซิร์ฟเวอร์ / ของปั๊ม ----------
  await q(`delete from public.cheat_flags`);
  const stale = acct(ch({ name: 'Aria', zeny: 99999, econSeq: 1, vend: { v: 2, sid: 'x', items: [{ i: 0, id: 'apple', qty: 999, price: 1 }] } })); // เกมที่ยังไม่รู้ว่ามีอะไรเกิดขึ้น
  const srvBefore = await C(U1);
  await ago(U1, 30);
  ok('เซฟเก่า (econSeq 1) บันทึกได้', (await save(U1, stale)) === null);
  c = await C(U1);
  ok('เซิร์ฟเวอร์เติมรายการที่ขาด: econSeq ล่าสุด + Volt จากการขาย + vend ของเซิร์ฟเวอร์', c.econSeq === srvBefore.econSeq && c.zeny > 99999 + 400000 && JSON.stringify(c.vend) === JSON.stringify(srvBefore.vend), `${c.econSeq} ${c.zeny}`);
  ok('ไม่ได้ของซ้ำจากการเติม (Knife ที่ขายไปไม่กลับมา)', !c.inventory.some(e => e.uid === kuid));
  // ของปั๊ม: เกมอ้าง econSeq ล่าสุดแต่ยังมี Knife ที่ขายไปแล้ว
  const dup = JSON.parse(JSON.stringify(c)); dup.inventory.push({ id: 'knife', qty: 1, uid: kuid, refine: 0, cards: [] });
  await ago(U1, 30);
  await save(U1, acct(dup));
  ok('ของที่ขายไปแล้วโผล่กลับ → ธง dup_item (โหมด log ยังเก็บไว้)', (await flags(U1)).includes('dup_item') && (await C(U1)).inventory.some(e => e.uid === kuid), (await flags(U1)).join());
  await q(`update public.save_verify_config set mode = 'enforce'`);
  await ago(U1, 30);
  const e2 = await save(U1, acct(dup));
  ok('โหมด enforce: ของปั๊มถูกตัดออก (เซฟยังผ่าน)', e2 === null && !(await C(U1)).inventory.some(e => e.uid === kuid), e2);
  await q(`update public.save_verify_config set mode = 'log'`);
  ok('เล่นสุจริตผ่านระบบเศรษฐกิจ: ไม่มีธงตรวจเซฟอื่น (worth_rate ฯลฯ)', (await flags(U1)).every(r => r === 'dup_item') && (await flags(U2)).length === 0, (await flags(U1)).concat(await flags(U2)).join());

  // ---------- แลกเปลี่ยน ----------
  await q(`update public.characters set data = jsonb_set(data, '{chars,0,zeny}', '50000') where user_id = $1`, [U3]);
  const cuid = (await C(U2)).inventory.find(e => e.id === 'knife').uid;
  const g2 = { zeny: 0, items: [{ uid: cuid }, { id: 'red_potion', qty: 5 }] }, g3 = { zeny: 30000, items: [] };
  a = await rpc(U2, `select public.econ_trade('tr-0001', $1, 'Bryn', $2, $3) as r`, [U3, JSON.stringify(g2), JSON.stringify(g3)]);
  ok('แลก: ฝ่ายแรก = รอ', a.r && a.r.r.status === 'pending', a.err);
  a = await rpc(U3, `select public.econ_trade('tr-0001', $1, 'Cato', $2, $3) as r`, [U2, JSON.stringify({ zeny: 30000, items: [] }), JSON.stringify({ zeny: 0, items: [{ id: 'red_potion', qty: 5 }] })]);
  ok('ข้อเสนอไม่ตรงกัน → ยกเลิก (ไม่ย้ายอะไร)', a.r && a.r.r.status === 'cancelled' && (await C(U2)).inventory.some(e => e.uid === cuid), JSON.stringify(a.r || a.err));
  await rpc(U2, `select public.econ_trade('tr-0002', $1, 'Bryn', $2, $3) as r`, [U3, JSON.stringify(g2), JSON.stringify(g3)]);
  a = await rpc(U3, `select public.econ_trade('tr-0002', $1, 'Cato', $2, $3) as r`, [U2, JSON.stringify(g3), JSON.stringify(g2)]);
  const c2 = await C(U2), c3 = await C(U3);
  const k3 = c3.inventory.find(e => e.id === 'knife');
  ok('แลกสำเร็จ: Bryn ได้ 30,000 ให้ Knife + Repair Kit ×5 · Cato ได้ Knife (uid ใหม่) + 5', a.r && a.r.r.status === 'done' && c2.zeny === 630000 && !c2.inventory.some(e => e.uid === cuid) && k3 && k3.uid !== cuid && c3.zeny === 20000 && count(c3, 'red_potion') === 20, JSON.stringify(a.r || a.err).slice(0, 120));
  a = await rpc(U2, `select public.econ_trade('tr-0002', $1, 'Bryn', $2, $3) as r`, [U3, JSON.stringify(g2), JSON.stringify(g3)]);
  ok('ฝ่ายแรกเรียกซ้ำ = done + delta ของตัวเอง', a.r && a.r.r.status === 'done' && a.r.r.delta.zeny === 30000, JSON.stringify(a.r || a.err).slice(0, 120));
  await rpc(U2, `select public.econ_trade('tr-0003', $1, 'Bryn', $2, $3) as r`, [U3, JSON.stringify({ zeny: 0, items: [] }), JSON.stringify({ zeny: 9e9, items: [] })]);
  a = await rpc(U3, `select public.econ_trade('tr-0003', $1, 'Cato', $2, $3) as r`, [U2, JSON.stringify({ zeny: 9e9, items: [] }), JSON.stringify({ zeny: 0, items: [] })]);
  ok('ให้ Volt เกินที่มี → econ_no_zeny', /econ_no_zeny/.test(a.err || ''), a.err);
  a = await rpc(U3, `select public.econ_pull('Cato', 0) as r`);
  ok('econ_pull: รายการของตัวเอง (ซื้อ + แลก)', a.r && a.r.r.length >= 2 && a.r.r.every(x => x.seq > 0), JSON.stringify(a.r || a.err).slice(0, 100));
  let peek = null; try { await asUser(U3, () => q(`select * from public.econ_events`)).then(r => { peek = r.rows.length; }); } catch (e) { peek = e.message; }
  ok('ผู้เล่นอ่าน econ_events ตรงไม่ได้ (RLS)', peek === 0, String(peek));
  let direct = null; try { await asUser(U3, () => q(`select public.ec_commit($1, 'cato', '{"zeny":999999}'::jsonb, 'x', null)`, [U3])); } catch (e) { direct = e.message; }
  ok('เรียก ec_commit ตรงไม่ได้', /permission denied/.test(direct || ''), direct);
  // ปิดระบบ
  await q(`update public.save_verify_config set econ = false`);
  a = await rpc(U1, `select public.econ_shop_buy('Aria', 'knife', 1) as r`);
  ok('ปิดระบบ (econ=false) → econ_off', /econ_off/.test(a.err || ''), a.err);
  await q(`update public.save_verify_config set econ = true`);
  await q(`insert into public.player_bans (user_id) values ($1)`, [U3]);
  a = await rpc(U3, `select public.econ_shop_buy('Cato', 'knife', 1) as r`);
  ok('ผู้เล่นถูกปฏิเสธใช้ RPC ไม่ได้', /banned/.test(a.err || ''), a.err);

  console.log(`\n${pass} ผ่าน / ${fail} ไม่ผ่าน`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
