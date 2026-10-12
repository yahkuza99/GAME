'use strict';
// ============================================================
//  โซ่บันทึกการเล่น + EXP/ดรอปฝั่งเซิร์ฟเวอร์ (supabase/migrations/20261012002000_event_chain.sql) บน Postgres จริงในเครื่อง (PGlite)
//  แฮช/ข้อความมาตรฐานคำนวณแบบเดียวกับ js/chain.js (Node crypto) → ส่ง submit_events แบบผู้เล่นจริง
//  ต่อโซ่ถูก = รับ + ได้รางวัล · แก้รายการกลางชุด / สลับลำดับ / ส่งชุดซ้ำ / หมุดเก่า = ปฏิเสธ (+ ธง chain_break) · ส่งซ้ำหลังเน็ตหลุด = dup
//  มอนไม่อยู่ในแผนที่ / ฆ่าเร็วเกิน / บอสซ้ำในคูลดาวน์ = ธง (enforce = ปฏิเสธ) · เล่นสุจริตยาว ๆ = ไม่มีธง · HMAC หมุดตรวจได้ · ความลับอ่านไม่ได้
//  รัน:  PGLITE=<โฟลเดอร์ node_modules ที่มี @electric-sql/pglite> node tests/chain_sql.js
// ============================================================
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
let PGlite;
try { PGlite = require(process.env.PGLITE ? path.join(process.env.PGLITE, '@electric-sql/pglite') : '@electric-sql/pglite').PGlite; }
catch (e) { console.log('SKIP: ไม่พบ @electric-sql/pglite (ตั้ง PGLITE=<node_modules>)'); process.exit(0); }
let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) { pass++; console.log('✔', name, info ? ` (${info})` : ''); } else { fail++; console.log('✘', name, info ? ` (${info})` : ''); } };
const MIG = f => fs.readFileSync(path.join(ROOT, 'supabase', 'migrations', f), 'utf8');
const U1 = '11111111-1111-1111-1111-111111111111', U2 = '22222222-2222-2222-2222-222222222222';
// เหมือน Chain.canon / Chain.sha ใน js/chain.js
const canon = e => [e.seq, e.prev, e.t, e.k, e.a.join('|')].join('|');
const sha = s => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const hmac = (k, m) => crypto.createHmac('sha256', k).update(m, 'utf8').digest('hex');
const mk = (head, list, t0) => { let h = head.head, s = head.seq, t = t0; const out = []; for (const [k, a, dt] of list) { t += dt || 1500; const e = { seq: ++s, prev: h, t, k, a }; e.h = sha(canon(e)); out.push(e); h = e.h; } return out; };

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
  try { await db.exec(MIG('20261012002000_event_chain.sql')); await db.exec(MIG('20261012002100_event_chain_data.sql')); ok('รันซ้ำได้ (idempotent)', true); } catch (e) { ok('รันซ้ำได้', false, e.message); }
  await db.exec(`insert into auth.users values ('${U1}'), ('${U2}');`);
  const ch = (name, o) => ({ v: 2, active: 0, chars: [Object.assign({ name, job: 'einherjar', baseLv: 20, jobLv: 10, baseExp: 0, jobExp: 0, statPoints: 0, skillPoints: 0, zeny: 1000,
    stats: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 }, inventory: [], equip: {}, storage: [] }, o || {})] });
  await q(`insert into public.characters (user_id, name, data) values ($1, 'Aria', $2), ($3, 'Bryn', $4)`, [U1, JSON.stringify(ch('Aria')), U2, JSON.stringify(ch('Bryn'))]);
  const asUser = async (u, fn) => {
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${u}', false);`);
    try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
  };
  const rpc = (u, sql, p) => asUser(u, async () => { try { return { r: (await q(sql, p)).rows[0].r }; } catch (e) { return { err: e.message }; } });
  const head = async u => (await rpc(u, `select public.chain_head('Aria') as r`)).r;
  const submit = (u, a, entries, name = 'Aria') => rpc(u, `select public.submit_events($1, $2, $3) as r`, [name, a.id, JSON.stringify(entries)]);
  const C = async u => (await q(`select data from public.characters where user_id = $1`, [u])).rows[0].data.chars[0];
  const flags = async u => (await q(`select rule from public.cheat_flags where user_id = $1 order by id`, [u])).rows.map(r => r.rule);
  const back = async (u, sec) => q(`update public.event_anchors set at = at - make_interval(secs => $2) where user_id = $1`, [u, sec]); // แทนการรอจริง
  // EXP ที่เกมบวกเองตอนฆ่า (สูตรเดียวกับ js/game.js expLevelMul + ส่วนแบ่งปาร์ตี้) → ใส่ใน a[5], a[6]
  const MOBS = Object.fromEntries((await q(`select id, lv, exp, jexp from public.sv_mobs`)).rows.map(r => [r.id, r]));
  const mul = (ml, l) => { const d = ml - l; return d >= 16 ? 0.4 : d >= 10 ? 1.4 - (d - 10) * 0.05 : d >= 3 ? 1 + (d - 2) * 0.05 : d >= -5 ? 1 : d >= -10 ? 0.95 : d >= -15 ? 0.9 : d >= -20 ? 0.85 : d >= -25 ? 0.6 : d >= -30 ? 0.35 : 0.1; };
  const K = (mob, map, lv, party, boss) => { const m = MOBS[mob], kf = (1 + 0.15 * party) / (party + 1), em = mul(m.lv, lv);
    return [mob, map, lv, party, boss, Math.round(Math.max(1, Math.round(m.exp * em)) * kf), Math.round(Math.max(1, Math.round(m.jexp * em)) * kf)]; };
  const state = async (u, k) => ((await q(`select chars from public.save_verify_state where user_id = $1`, [u])).rows[0] || { chars: {} }).chars[k] || {};
  const meadow = (await q(`select map, mob from public.sv_map_mobs m join public.sv_mobs s on s.id = m.mob where not s.boss and not s.wb and s.exp > 0 order by s.lv limit 1`)).rows[0];

  // ---------- หมุดเริ่มต้น ----------
  let a = await head(U1);
  const secret = (await q(`select secret from public.chain_secret`)).rows[0].secret;
  ok('หมุดเริ่มต้น: seq 0 + HMAC ตรวจด้วยความลับได้', a && a.seq === 0 && a.mac === hmac(secret, [U1, 'aria', 0, a.head].join('|')), JSON.stringify(a).slice(0, 80));
  let peek = null; try { await asUser(U1, () => q(`select * from public.chain_secret`)).then(r => { peek = r.rows.length; }); } catch (e) { peek = e.message; }
  ok('ผู้เล่นอ่านความลับไม่ได้', /permission denied/.test(String(peek)), String(peek));
  ok('HMAC ของ Postgres = มาตรฐาน (เทียบ Node)', (await q(`select public.ch_hmac('key', 'The quick brown fox jumps over the lazy dog') as h`)).rows[0].h === hmac('key', 'The quick brown fox jumps over the lazy dog'));

  // ---------- ชุดแรก: ฆ่ามอน 10 ตัว ----------
  await back(U1, 60);
  const c0 = await C(U1);
  let b1 = mk(a, Array.from({ length: 10 }, () => ['kill', K(meadow.mob, meadow.map, 20, 0, 0), 3000]), Date.now() - 40000);
  let r = await submit(U1, a, b1);
  let c1 = await C(U1);
  ok('ชุด 10 ตัว: รับ + Volt จากเซิร์ฟเวอร์ + หมุดใหม่ seq 10', r.r && r.r.status === 'ok' && r.r.anchor.seq === 10 && c1.zeny > c0.zeny, JSON.stringify(r.r || r.err).slice(0, 160));
  const r1 = r;
  const expect10 = b1.reduce((x, e) => x + e.a[5], 0);
  ok('ไม่ให้ EXP ซ้ำ: เซิร์ฟเวอร์ไม่บวก EXP (เกมบวกเองตอนฆ่าแล้ว) · ไม่มี delta.exp', c1.baseExp === c0.baseExp && c1.baseLv === c0.baseLv && r.r && !r.r.delta.exp);
  ok('EXP ที่ตรวจแล้วเป็นเครดิตให้ตัวตรวจเซฟ (vb)', (await state(U1, 'aria')).vb === expect10 && r.r.delta.verified.b === expect10, `${(await state(U1, 'aria')).vb} vs ${expect10}`);
  // เซฟของเกมที่ EXP เพิ่มตามการฆ่าที่ตรวจแล้ว ไม่กินถังอัตรา (ตั้งอัตราเกือบศูนย์ให้เห็นชัด)
  await q(`update public.save_verify_config set params = '{"kps": 0.0001, "boss_exp": 1, "need_frac": 0}'::jsonb`);
  await q(`update public.save_verify_state set chars = jsonb_set(chars, '{aria,eb}', '0') where user_id = $1`, [U1]);
  const cs = JSON.parse(JSON.stringify(c1)); cs.baseExp += expect10;
  await asUser(U1, () => q(`update public.characters set data = $2 where user_id = $1`, [U1, JSON.stringify({ v: 2, active: 0, chars: [cs] })]));
  ok('เซฟ EXP +ตามการฆ่าที่ตรวจแล้ว (ถังว่าง อัตรา ~0) → ไม่มีธง exp_rate + ใช้เครดิตหมด', !(await flags(U1)).includes('exp_rate') && (await state(U1, 'aria')).vb === 0, (await flags(U1)).join());
  const cs2 = JSON.parse(JSON.stringify(cs)); cs2.baseExp += 500;
  await asUser(U1, () => q(`update public.characters set data = $2 where user_id = $1`, [U1, JSON.stringify({ v: 2, active: 0, chars: [cs2] })]));
  ok('เซฟ EXP เกินการฆ่าที่ตรวจได้ → ธง exp_rate', (await flags(U1)).includes('exp_rate'));
  await q(`update public.save_verify_config set params = '{}'::jsonb`); await q(`delete from public.cheat_flags`);
  a = r.r.anchor;
  // EXP ที่อ้างผิด / อ้างเลเวลต่ำกว่าเซฟ (ได้ตัวคูณมากขึ้น)
  await back(U1, 60);
  const bx = mk(a, [['kill', K(meadow.mob, meadow.map, 20, 0, 0)], ['kill', K(meadow.mob, meadow.map, 20, 0, 0).map((x, i) => (i === 5 ? x * 50 : x))]], Date.now() - 5000);
  r = await submit(U1, a, bx);
  ok('EXP ที่อ้างเกินสูตร (×50) → ธง exp_mismatch (log = รับไว้ เครดิตแค่ที่สูตรให้)', (await flags(U1)).includes('exp_mismatch') && r.r && r.r.status === 'ok' && r.r.delta.verified.b === 2 * K(meadow.mob, meadow.map, 20, 0, 0)[5], JSON.stringify(r.r || r.err).slice(0, 120));
  a = r.r.anchor;
  await q(`update public.save_verify_config set mode = 'enforce'`); await q(`delete from public.cheat_flags`);
  await back(U1, 60);
  r = await submit(U1, a, mk(a, [['kill', K(meadow.mob, meadow.map, 5, 0, 0)]], Date.now() - 3000));
  ok('อ้างเลเวลต่ำกว่าที่โซ่อ้างไปแล้ว (enforce) → ปฏิเสธ exp_mismatch', r.r && r.r.status === 'rejected' && r.r.rule === 'exp_mismatch', JSON.stringify(r.r || r.err).slice(0, 120));
  await q(`update public.save_verify_config set mode = 'log'`); await q(`delete from public.cheat_flags`);
  r = { r: { anchor: a } };
  ok('หมุดใหม่ = HMAC(ความลับ, user|ตัวละคร|seq|head)', r1.r && r1.r.anchor.mac === hmac(secret, [U1, 'aria', 10, b1[9].h].join('|')) && r1.r.anchor.head === b1[9].h);
  ok('econSeq เดินตาม (เซฟที่ตามไม่ทันจะถูกเติม)', c1.econSeq === r1.r.seq);
  a = r.r.anchor;
  // ส่งชุดแรกซ้ำ (คำตอบหายระหว่างทาง) → dup ไม่ให้รางวัลซ้ำ
  r = await rpc(U1, `select public.submit_events('Aria', $1, $2) as r`, [a.id - 2, JSON.stringify(b1)]);
  ok('ส่งชุดเดิมซ้ำ = dup (ไม่ให้รางวัลซ้ำ)', r.r && r.r.status === 'dup', JSON.stringify(r.r || r.err).slice(0, 100));

  // ---------- แก้กลางชุด / สลับลำดับ / ชุดซ้ำในหมุดใหม่ / หมุดเก่า ----------
  await back(U1, 60);
  const b2 = mk(a, Array.from({ length: 6 }, () => ['kill', K(meadow.mob, meadow.map, 20, 0, 0), 2000]), Date.now() - 20000);
  const tam = JSON.parse(JSON.stringify(b2)); tam[3].a[0] = 'rot_colossus'; // แก้มอนกลางชุด (แฮชเดิม)
  r = await submit(U1, a, tam);
  ok('แก้รายการกลางชุด (แฮชไม่ตรง) → ปฏิเสธ chain_break', r.r && r.r.status === 'rejected' && r.r.rule === 'chain_break' && r.r.anchor.id === a.id, JSON.stringify(r.r || r.err).slice(0, 100));
  const tam2 = JSON.parse(JSON.stringify(b2)); tam2[3].a[0] = 'rot_colossus'; for (let i = 3; i < tam2.length; i++) { if (i > 3) tam2[i].prev = tam2[i - 1].h; tam2[i].h = sha(canon(tam2[i])); }
  r = await submit(U1, a, tam2);
  // แก้แล้วคำนวณแฮชใหม่ทั้งหาง = โซ่ต่อกันได้ แต่ Rot Colossus ไม่อยู่ในแผนที่นี้ → ธง kill_map (log = รับไว้ / enforce = ปฏิเสธ)
  ok('แก้แล้วคำนวณแฮชใหม่ทั้งหาง: มอนผิดแผนที่ → ธง kill_map', (await flags(U1)).includes('kill_map'), JSON.stringify(r.r || r.err).slice(0, 100));
  if (r.r && r.r.status === 'ok') a = r.r.anchor;
  await back(U1, 60);
  const b3 = mk(a, Array.from({ length: 4 }, () => ['kill', K(meadow.mob, meadow.map, 20, 0, 0), 2000]), Date.now() - 10000);
  const swap = [b3[0], b3[2], b3[1], b3[3]];
  r = await submit(U1, a, swap);
  ok('สลับลำดับในชุด → ปฏิเสธ chain_break', r.r && r.r.status === 'rejected' && r.r.rule === 'chain_break');
  r = await submit(U1, a, b3);
  ok('ชุดถูกต้องหลังโดนปฏิเสธ = รับ (ต่อจากหมุดเดิม)', r.r && r.r.status === 'ok', JSON.stringify(r.r || r.err).slice(0, 100));
  const aOld = a; a = r.r.anchor;
  r = await submit(U1, aOld, mk(aOld, [['kill', K(meadow.mob, meadow.map, 20, 0, 0)]], Date.now()));
  ok('ส่งต่อจากหมุดเก่า (แตกกิ่ง) → ปฏิเสธ chain_break', r.r && r.r.status === 'rejected' && r.r.rule === 'chain_break');
  r = await submit(U1, a, b3.map(e => Object.assign({}, e)));
  ok('ส่งชุดเดิมซ้ำบนหมุดใหม่ (replay) → ปฏิเสธ', r.r && r.r.status === 'rejected');
  ok('ธง chain_break ถูกจด', (await flags(U1)).includes('chain_break'));

  // ---------- ความเป็นไปได้ ----------
  await q(`update public.save_verify_config set mode = 'enforce'`);
  await back(U1, 5);
  const many = mk(a, Array.from({ length: 150 }, () => ['kill', K(meadow.mob, meadow.map, 20, 0, 0), 20]), Date.now() - 4000);
  const z = (await C(U1)).zeny;
  r = await submit(U1, a, many);
  ok('150 ตัวใน 3 วินาที (enforce) → ปฏิเสธ kill_rate ไม่ได้รางวัล', r.r && r.r.status === 'rejected' && r.r.rule === 'kill_rate' && (await C(U1)).zeny === z, JSON.stringify(r.r || r.err).slice(0, 100));
  const boss = (await q(`select m.map, m.mob from public.sv_map_mobs m join public.sv_mobs s on s.id = m.mob where s.boss and not s.wb limit 1`)).rows[0];
  await back(U1, 120);
  r = await submit(U1, a, mk(a, [['kill', K(boss.mob, boss.map, 30, 0, 1)]], Date.now() - 1000));
  ok('ฆ่า MVP: รับ + ได้ตรากาชา/ยาโบนัส', r.r && r.r.status === 'ok' && r.r.delta.add.some(x => /sigil/.test(x.id)), JSON.stringify(r.r || r.err).slice(0, 160));
  a = r.r.anchor;
  await back(U1, 30);
  r = await submit(U1, a, mk(a, [['kill', K(boss.mob, boss.map, 30, 0, 1)]], Date.now() - 1000));
  ok('MVP ตัวเดิมซ้ำในคูลดาวน์ (enforce) → ปฏิเสธ boss_cooldown', r.r && r.r.status === 'rejected' && r.r.rule === 'boss_cooldown');
  await q(`update public.save_verify_config set mode = 'log'`);

  // ---------- เล่นสุจริตยาว ๆ (ผู้เล่นที่ 2): 60 ชุด × 10 ตัว ทุก ~30 วิ ----------
  let a2 = await rpc(U2, `select public.chain_head('Bryn') as r`).then(x => x.r);
  const zz = (await C(U2)).zeny; let okAll = true, kills = 0, t = Date.now() - 3600 * 1000;
  for (let i = 0; i < 60; i++) {
    await back(U2, 35);
    const b = mk(a2, Array.from({ length: 10 }, () => ['kill', K(meadow.mob, meadow.map, 20, 0, 0), 3000]), t); t += 30000;
    const x = await submit(U2, a2, b, 'Bryn');
    if (!x.r || x.r.status !== 'ok') { okAll = false; console.log('  ', i, JSON.stringify(x.r || x.err).slice(0, 120)); break; }
    a2 = x.r.anchor; kills += 10;
  }
  const c2 = await C(U2);
  ok(`เล่นสุจริต 60 ชุด (${kills} ตัว ~30 นาที): ทุกชุดรับ + ไม่มีธง + เลเวล/เงินขึ้น`, okAll && (await flags(U2)).length === 0 && c2.zeny > zz && (await state(U2, 'bryn')).vb > 5000, `vb ${(await state(U2, 'bryn')).vb} zeny +${c2.zeny - zz} flags ${(await flags(U2)).join()}`);
  // เซฟของเกม (ที่ได้ EXP ตามผลเซิร์ฟเวอร์) ไม่ถูกตรวจเซฟจับ
  await asUser(U2, () => q(`update public.characters set data = data where user_id = $1`, [U2]));
  ok('เซฟหลังได้รางวัลจากเซิร์ฟเวอร์: ตรวจเซฟไม่ขึ้นธง', (await flags(U2)).length === 0, (await flags(U2)).join());
  const logRows = (await q(`select count(*)::int n from public.event_log where user_id = $1`, [U2])).rows[0].n;
  ok('เก็บรายการดิบเป็นชุด (1 แถว/ชุด)', logRows === 60, String(logRows));
  ok('chain_trim เก็บกวาดได้', (await q(`select public.chain_trim(0) as n`)).rows[0].n >= 60 && (await q(`select count(*)::int n from public.event_anchors where user_id = $1`, [U2])).rows[0].n === 1);
  await q(`update public.save_verify_config set chain = false`);
  r = await rpc(U2, `select public.chain_head('Bryn') as r`);
  ok('ปิดระบบ (chain=false) → chain_off', /chain_off/.test(r.err || ''), r.err);

  console.log(`\n${pass} ผ่าน / ${fail} ไม่ผ่าน`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
