'use strict';
// ============================================================
//  ตรวจไฟล์ SQL ของระบบตรวจเซฟ (supabase/migrations/20261012000000_save_verify.sql + _data.sql) บน Postgres จริงในเครื่อง
//  (PGlite = Postgres แบบ WebAssembly — ไม่ต่อ Supabase จริง) แล้วเทียบผลกับสำเนา JavaScript (supabase/save_verify_rules.js)
//  ทุกกรณี: ชุดธงต้องตรงกันทั้งสองฝั่ง
//  รัน:  PGLITE=<โฟลเดอร์ node_modules ที่มี @electric-sql/pglite> node tests/saveverify_sql.js
//        (ไม่มี PGlite = ข้ามพร้อมบอก — ติดตั้ง: npm install @electric-sql/pglite ในโฟลเดอร์ชั่วคราว)
// ============================================================
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
let PGlite;
try { PGlite = require(process.env.PGLITE ? path.join(process.env.PGLITE, '@electric-sql/pglite') : '@electric-sql/pglite').PGlite; }
catch (e) { console.log('SKIP: ไม่พบ @electric-sql/pglite (ตั้ง PGLITE=<node_modules>)'); process.exit(0); }
const R = require('../supabase/save_verify_rules.js');
const DATA = require('./save_verify_data.json');

let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) { pass++; console.log('✔', name, info ? ` (${info})` : ''); } else { fail++; console.log('✘', name, info ? ` (${info})` : ''); } };
const MIG = f => fs.readFileSync(path.join(ROOT, 'supabase', 'migrations', f), 'utf8');

const U1 = '11111111-1111-1111-1111-111111111111', U2 = '22222222-2222-2222-2222-222222222222', U3 = '33333333-3333-3333-3333-333333333333';
const ch = o => Object.assign({ name: 'Aria', job: 'novice', baseLv: 1, jobLv: 1, baseExp: 0, jobExp: 0, stats: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 }, statPoints: 48, zeny: 500,
  inventory: [{ id: 'red_potion', qty: 15 }, { id: 'knife', qty: 1, uid: 3, refine: 0, cards: [] }], equip: { weapon: { id: 'cotton_shirt', qty: 1, uid: 4, refine: 0, cards: [] } }, storage: [] }, o);
const acct = (...c) => ({ v: 2, active: 0, chars: c });

(async () => {
  const db = new PGlite();
  const q = (s, p) => db.query(s, p);
  // ---------- จำลองส่วนที่ Supabase มีให้ ----------
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon; grant execute on function auth.uid() to authenticated, anon;
    grant usage on schema public to authenticated, anon;
    alter default privileges in schema public grant all on tables to anon, authenticated; -- ค่าเริ่มต้นของ Supabase (RLS คุม)
  `);
  for (const f of ['20261001000000_online_init.sql', '20261001120000_multi_char_names.sql', '20261011000000_single_session.sql', '20261012000000_save_verify.sql', '20261012000100_save_verify_data.sql']) {
    let sql = MIG(f);
    sql = sql.replace(/-- เปิด Realtime[\s\S]*?end \$\$;/g, ''); // PGlite ไม่มี publication ของ Realtime
    try { await db.exec(sql); ok('รัน ' + f, true); } catch (e) { ok('รัน ' + f, false, e.message); throw e; }
  }
  // รันซ้ำได้ (idempotent)
  try { await db.exec(MIG('20261012000000_save_verify.sql')); await db.exec(MIG('20261012000100_save_verify_data.sql')); ok('รันซ้ำได้ (idempotent)', true); } catch (e) { ok('รันซ้ำได้', false, e.message); }
  await db.exec(`insert into auth.users values ('${U1}'), ('${U2}'), ('${U3}');`);

  const asUser = async (u, fn) => {
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${u}', false);`);
    try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
  };
  const save = (u, data) => asUser(u, async () => {
    try {
      await q(`insert into public.characters (user_id, name, data, updated_at) values ($1, $2, $3, '2000-01-01')
               on conflict (user_id) do update set name = excluded.name, data = excluded.data, updated_at = excluded.updated_at`, [u, (data.chars[data.active] || data.chars[0]).name, JSON.stringify(data)]);
      return null;
    } catch (e) { return e.message; }
  });
  const ago = async (u, sec) => { // ย้อนเวลาเซฟล่าสุด (แทนการรอจริง)
    await q(`update public.characters set updated_at = now() - make_interval(secs => $2) where user_id = $1`, [u, sec]);
    await q(`update public.save_verify_state set at = now() - make_interval(secs => $2) where user_id = $1`, [u, sec]);
  };
  const flagsOf = async u => (await q(`select rule from public.cheat_flags where user_id = $1 order by id`, [u])).rows.map(r => r.rule);
  const clear = () => q(`delete from public.cheat_flags`);
  const mode = m => q(`update public.save_verify_config set mode = $1`, [m]);
  const cfg = async () => { const r = (await q(`select mode, soft_rules, params, derived from public.save_verify_config`)).rows[0]; return r; };
  // ตัวเทียบ: ผลของสำเนา JS จาก state/แถวเดียวกัน
  const jsEval = async (u, oldData, newData, dtSec) => {
    const st = (await q(`select extract(epoch from at) * 1000 as at, wb::float8 as wb, held::float8 as held, chars from public.save_verify_state where user_id = $1`, [u])).rows[0];
    const state = st ? { at: Date.now() - dtSec * 1000, wb: st.wb, held: st.held, chars: st.chars } : null;
    return R.evaluate({ oldData, newData, oldAt: Date.now() - dtSec * 1000, now: Date.now(), state, rows: [], cfg: await cfg(), items: DATA.items, jobs: DATA.jobs });
  };
  const same = (a, b) => JSON.stringify([...new Set(a)].sort()) === JSON.stringify([...new Set(b)].sort());

  // ---------- 1) เซฟแรก + ปกติ ----------
  await mode('log');
  let a0 = acct(ch());
  ok('เซฟแรก (insert) ผ่าน ไม่มีธง', (await save(U1, a0)) === null && (await flagsOf(U1)).length === 0, (await flagsOf(U1)).join());
  let a1 = acct(ch({ zeny: 620, baseExp: 30, inventory: [{ id: 'red_potion', qty: 13 }, { id: 'knife', qty: 1, uid: 3, refine: 0, cards: [] }, { id: 'jelly_drop', qty: 2 }] }));
  await ago(U1, 30);
  let js = await jsEval(U1, a0, a1, 30);
  ok('เซฟปกติหลัง 30 วิ (upsert) ไม่มีธง', (await save(U1, a1)) === null && (await flagsOf(U1)).length === 0 && js.flags.length === 0, (await flagsOf(U1)).join());
  const st1 = (await q(`select * from public.save_verify_state where user_id = $1`, [U1])).rows[0];
  ok('มีแถวถังโทเคน + updated_at = เวลาเซิร์ฟเวอร์ (ไม่ใช่ 2000-01-01 จากไคลเอนต์)', st1 && (await q(`select updated_at > now() - interval '1 minute' as f from public.characters where user_id = $1`, [U1])).rows[0].f);

  // ---------- 2) โกง: แต่ละกรณีต้องได้ธงตรงกับสำเนา JS ----------
  const cases = [
    ['Volt +1e9', acct(ch({ zeny: 1e9 })), ['worth_rate']],
    ['Lv 99 ทันที', acct(ch({ baseLv: 99 })), ['exp_rate', 'level_rate']],
    ['ไอเทมไม่มีในเกม', acct(ch({ inventory: [{ id: 'god_sword', qty: 1 }] })), ['unknown_item']],
    ['Stat เกิน 99', acct(ch({ stats: { str: 150, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 } })), ['stat_cap', 'stat_points']],
    ['แต้ม Stat เกิน', acct(ch({ statPoints: 500 })), ['stat_points']],
    ['ตีบวก +15', acct(ch({ inventory: [{ id: 'knife', qty: 1, uid: 3, refine: 15, cards: [] }] })), ['refine_cap']],
    ['Volt ติดลบ', acct(ch({ zeny: -5 })), ['zeny_range']],
    ['จำนวนติดลบ', acct(ch({ inventory: [{ id: 'red_potion', qty: -3 }] })), ['qty_range']],
    ['Job เกิน', acct(ch({ jobLv: 40 })), ['job_level_cap']],
    ['Class ข้ามสาย', acct(ch({ job: 'runelord' })), ['job_path']],
    ['อุปกรณ์ uid ซ้ำ (ของปั๊ม)', acct(ch({ inventory: [{ id: 'knife', qty: 1, uid: 3, refine: 0, cards: [] }, { id: 'knife', qty: 1, uid: 3, refine: 0, cards: [] }] })), ['dup_uid']],
    ['ของแพงงอกจากตลาดโดยไม่มีรายการโอน', acct(ch({ inventory: Array.from({ length: 250 }, (_, i) => ({ id: 'valhalla_blade', qty: 1, uid: 100 + i, refine: 0, cards: [] })) })), ['worth_rate']],
  ];
  for (const [name, data, want] of cases) {
    await clear(); await q(`delete from public.save_verify_state where user_id = $1`, [U2]); await q(`delete from public.characters where user_id = $1`, [U2]);
    const base = acct(ch({ name: 'Bryn' }));
    await save(U2, base); await ago(U2, 20);
    const d = JSON.parse(JSON.stringify(data)); d.chars[0].name = 'Bryn';
    const j = await jsEval(U2, base, d, 20);
    const err = await save(U2, d);
    const got = await flagsOf(U2);
    ok(`โกง: ${name} → ${want.join('+')}`, err === null && same(got, want) && same(j.flags.map(f => f.rule), want), `sql=${got.join()} js=${j.flags.map(f => f.rule).join()}`);
  }

  // ---------- 3) enforce: ปฏิเสธ + ไม่เปลี่ยนเซฟ/ถัง ----------
  await clear(); await mode('enforce');
  const before = (await q(`select data from public.characters where user_id = $1`, [U2])).rows[0].data;
  const err = await save(U2, acct(ch({ name: 'Bryn', zeny: 5e9 })));
  ok('enforce: ปฏิเสธ save_rejected:worth_rate', /save_rejected:worth_rate/.test(err || ''), err);
  const after = (await q(`select data from public.characters where user_id = $1`, [U2])).rows[0].data;
  ok('enforce: เซฟบนเซิร์ฟเวอร์ไม่เปลี่ยน', JSON.stringify(before) === JSON.stringify(after));
  ok('enforce: ไอเทมไม่รู้จัก (soft) ยังเซฟได้ + จดธง', (await save(U2, acct(ch({ name: 'Bryn', inventory: [{ id: 'mystery', qty: 1 }] })))) === null && (await flagsOf(U2)).includes('unknown_item'));
  await asUser(U2, () => q(`select public.save_verify_report('worth_rate', '{"x":1}')`));
  ok('save_verify_report จดแถว rejected:worth_rate', (await flagsOf(U2)).includes('rejected:worth_rate'));
  let direct = null; try { await asUser(U2, () => q(`select public.save_verify_eval($1, null, '{}'::jsonb, now())`, [U2])); } catch (e) { direct = e.message; }
  ok('เรียก save_verify_eval ตรง ๆ ไม่ได้', /internal/.test(direct || ''), direct);
  let peek = null; try { await asUser(U2, () => q(`select * from public.cheat_flags`)).then(r => { peek = r.rows.length; }); } catch (e) { peek = e.message; }
  ok('ผู้เล่นอ่าน cheat_flags ไม่ได้ (RLS)', peek === 0, String(peek));
  await mode('log');

  // ---------- 4) ตลาด: รายการโอนที่สองฝ่ายยืนยัน = ผ่าน • ฝ่ายเดียว = ไม่นับ ----------
  await clear();
  for (const u of [U1, U3]) { await q(`delete from public.save_verify_state where user_id = $1`, [u]); await q(`delete from public.characters where user_id = $1`, [u]); }
  const sellerA = acct(ch({ name: 'Sela', zeny: 0, vend: { sid: 's1', items: [{ i: 0, id: 'valhalla_blade', qty: 1, price: 4e6, uid: 50, refine: 0, cards: [] }] } }));
  const buyerA = acct(ch({ name: 'Bayo', zeny: 5e6 }));
  // ตั้งต้น (เหมือนเล่นมานานแล้ว): ใส่ตรงในฐานข้อมูลแบบผู้ดูแล — trigger ไม่ตรวจ
  for (const [u, d] of [[U1, sellerA], [U3, buyerA]]) await q(`insert into public.characters (user_id, name, data) values ($1, $2, $3)`, [u, d.chars[0].name, JSON.stringify(d)]);
  for (const u of [U1, U3]) await q(`insert into public.save_verify_state (user_id, wb) values ($1, 0)`, [u]); // ถังว่าง: ต้องพึ่งรายการโอนล้วน ๆ
  await ago(U1, 1); await ago(U3, 1);
  const buyRec = await asUser(U3, () => q(`select public.market_record('tid-0001', $1, $2, 'valhalla_blade', 1, 4000000) as p`, [U1, U3]));
  // ผู้ซื้อเซฟระหว่างรอ (กันเงินไว้แล้ว −4,000,000) — รายการยังไม่จับคู่
  await save(U3, acct(ch({ name: 'Bayo', zeny: 1e6 })));
  const sellRec = await asUser(U1, () => q(`select public.market_record('tid-0001', $1, $2, 'valhalla_blade', 1, 4000000) as p`, [U1, U3]));
  ok('market_record: ฝั่งแรกยังไม่จับคู่ ฝั่งที่สองจับคู่แล้ว', buyRec.rows[0].p === false && sellRec.rows[0].p === true);
  await ago(U1, 1); await ago(U3, 1);
  ok('ผู้ขาย: Volt +4,000,000 ของออก → ผ่าน (มีรายการโอน)', (await save(U1, acct(ch({ name: 'Sela', zeny: 4e6, vend: { sid: 's1', items: [{ i: 0, id: 'valhalla_blade', qty: 0, price: 4e6, uid: 50, refine: 0, cards: [] }] } })))) === null);
  ok('ผู้ซื้อ: ได้ของ (เซฟแยกจากตอนกันเงิน) → ผ่าน', (await save(U3, acct(ch({ name: 'Bayo', zeny: 1e6, inventory: [{ id: 'valhalla_blade', qty: 1, uid: 7, refine: 0, cards: [] }] })))) === null);
  ok('ตลาดสุจริต: ไม่มีธงทั้งสองฝ่าย', (await flagsOf(U1)).length === 0 && (await flagsOf(U3)).length === 0, (await flagsOf(U1)).concat(await flagsOf(U3)).join());
  ok('รายการโอนถูกใช้แล้ว (consumed)', (await q(`select count(*)::int n from public.transfer_ledger where consumed_at is null`)).rows[0].n === 0);
  // ปลอมรายการฝ่ายเดียว: อ้างว่าขายได้ 9e8 แต่อีกฝ่ายไม่ได้บันทึก
  await asUser(U1, () => q(`select public.market_record('tid-fake', $1, $2, 'knife', 1, 900000000)`, [U1, U3]));
  await ago(U1, 1);
  await save(U1, acct(ch({ name: 'Sela', zeny: 9.04e8 })));
  ok('รายการโอนฝ่ายเดียว (ปลอม) ไม่นับ → worth_rate', (await flagsOf(U1)).includes('worth_rate'), (await flagsOf(U1)).join());
  // ผู้ซื้อโกง: ไม่จ่ายเงิน (สมรู้ร่วมคิด) — ทั้งสองฝ่ายบันทึก แต่ Volt ผู้ซื้อไม่ลด
  await clear(); await q(`update public.save_verify_state set wb = 0, held = 0`);
  await asUser(U3, () => q(`select public.market_record('tid-0002', $1, $2, 'apple', 1, 3000000)`, [U1, U3]));
  await asUser(U1, () => q(`select public.market_record('tid-0002', $1, $2, 'apple', 1, 3000000)`, [U1, U3]));
  await ago(U3, 1);
  await save(U3, acct(ch({ name: 'Bayo', zeny: 1e6, inventory: [{ id: 'valhalla_blade', qty: 1, uid: 7, refine: 0, cards: [] }, { id: 'apple', qty: 1 }] })));
  ok('ผู้ซื้อไม่จ่ายเงิน → worth_rate', (await flagsOf(U3)).includes('worth_rate'), (await flagsOf(U3)).join());
  let bad = null; try { await asUser(U3, () => q(`select public.market_record('tid-0003', $1, $1, 'apple', 1, 1)`, [U3])); } catch (e) { bad = e.message; }
  ok('market_record ซื้อขายกับตัวเองไม่ได้', !!bad, bad);
  bad = null; try { await asUser(U3, () => q(`select public.market_record('tid-0004', $1, $2, 'apple', 1, 1)`, [U1, U2])); } catch (e) { bad = e.message; }
  ok('market_record บันทึกแทนคนอื่นไม่ได้', /not a party/.test(bad || ''), bad);

  // ---------- 5) แลกเปลี่ยน ----------
  await clear(); await q(`update public.save_verify_state set wb = 0, held = 0`);
  const g1 = { zeny: 2000000, items: [] }, g3 = { zeny: 0, items: [{ id: 'valhalla_blade', qty: 1, cards: [] }] };
  await asUser(U1, () => q(`select public.trade_record('tr-0001', $1, $2, $3)`, [U3, JSON.stringify(g1), JSON.stringify(g3)]));
  const tp = await asUser(U3, () => q(`select public.trade_record('tr-0001', $1, $2, $3) as p`, [U1, JSON.stringify(g3), JSON.stringify(g1)]));
  ok('trade_record จับคู่ได้', tp.rows[0].p === true);
  const s3 = (await q(`select data from public.characters where user_id = $1`, [U3])).rows[0].data;
  s3.chars[0].zeny += 2000000; s3.chars[0].inventory = s3.chars[0].inventory.filter(e => e.id !== 'valhalla_blade');
  await ago(U3, 1);
  ok('แลกเปลี่ยนสุจริต: ได้ Volt +2,000,000 ให้ดาบ → ผ่าน', (await save(U3, s3)) === null && (await flagsOf(U3)).length === 0, (await flagsOf(U3)).join());

  // ---------- 6) นำเข้าตัวละครออฟไลน์ / ผู้เล่นถูกปฏิเสธ ----------
  await clear();
  const s1 = (await q(`select data from public.characters where user_id = $1`, [U1])).rows[0].data;
  s1.chars.push(ch({ name: 'Offy', baseLv: 60, job: 'einherjar', jobLv: 20, statPoints: 400, zeny: 2e6, importedOffline: 1760000000000 }));
  await ago(U1, 1);
  ok('นำเข้าตัวละครออฟไลน์ Lv 60: เซฟผ่าน + ธง import_offline อย่างเดียว', (await save(U1, s1)) === null && same(await flagsOf(U1), ['import_offline']), (await flagsOf(U1)).join());
  await mode('enforce');
  s1.chars.push(ch({ name: 'Offz', baseLv: 70, importedOffline: 1760000000001, statPoints: 500 }));
  ok('enforce: นำเข้าก็ไม่ถูกปฏิเสธ', (await save(U1, s1)) === null);
  await mode('log');
  await q(`insert into public.player_bans (user_id, reason) values ($1, 'ข้อมูลไม่ตรง')`, [U3]);
  ok('ผู้เล่นถูกปฏิเสธ: เซฟไม่ได้ (banned)', /banned/.test((await save(U3, s3)) || ''));
  const mb = await asUser(U3, () => q(`select public.my_ban() as r`));
  ok('my_ban() คืนเหตุผล', mb.rows[0].r === 'ข้อมูลไม่ตรง');
  const mb1 = await asUser(U1, () => q(`select public.my_ban() as r`));
  ok('my_ban() คนอื่นได้ null', mb1.rows[0].r === null);
  const sum = (await q(`select * from public.cheat_flags_summary`)).rows;
  ok('มุมมอง cheat_flags_summary ใช้ได้', Array.isArray(sum) && sum.length >= 1, JSON.stringify(sum[0] || {}).slice(0, 120));
  let vpeek = null; try { await asUser(U1, () => q(`select * from public.cheat_flags_summary`)); vpeek = 'readable'; } catch (e) { vpeek = e.message; }
  ok('ผู้เล่นอ่านมุมมองสรุปไม่ได้', /permission denied/.test(vpeek), vpeek);

  // ---------- 7) supabase/schema.sql (ติดตั้งใหม่ทั้งก้อน) ก็มีระบบตรวจเซฟครบ ----------
  const db2 = new PGlite();
  await db2.exec(`create role anon nologin; create role authenticated nologin; create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;`);
  try {
    await db2.exec(fs.readFileSync(path.join(ROOT, 'supabase', 'schema.sql'), 'utf8').replace(/-- เปิด Realtime[\s\S]*?end \$\$;/g, ''));
    for (const f of ['20261012000100_save_verify_data.sql', '20261012001100_economy_data.sql', '20261012002100_event_chain_data.sql']) await db2.exec(MIG(f));
    const r = await db2.query(`select (select count(*)::int from public.save_verify_items) as items, (select mode from public.save_verify_config) as mode,
      (select count(*)::int from pg_trigger where tgname in ('characters_verify_save', 'characters_econ_merge')) as trg,
      (select count(*)::int from pg_proc where proname in ('submit_events', 'econ_market_buy', 'chain_head')) as fns`);
    ok('schema.sql + data: ตาราง/trigger/โหมด log ครบ', r.rows[0].items === Object.keys(DATA.items).length && r.rows[0].mode === 'log' && r.rows[0].trg === 2 && r.rows[0].fns === 3, JSON.stringify(r.rows[0]));
  } catch (e) { ok('schema.sql + data รันได้', false, e.message); }

  console.log(`\n${pass} ผ่าน / ${fail} ไม่ผ่าน`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
