-- ============================================================
--  ระยะ 2 — EXP/ดรอปจากมอนเป็นของเซิร์ฟเวอร์ + บันทึกการเล่นแบบโซ่แฮช (event chain)
--  เกมเก็บเหตุการณ์การเล่นทุกอย่าง (ฆ่ามอน ฯลฯ) ต่อกันเป็นโซ่: entry = { seq, prev, t, k, a } · h = SHA-256(seq|prev|t|k|a...)
--  ทุก ~30 วิ / 10 ตัว / ฆ่าบอส เกมส่งชุดเหตุการณ์ → submit_events:
--    1) โซ่ต้องต่อจากหมุด (anchor) ล่าสุดที่เซิร์ฟเวอร์ออกให้ (seq ต่อเนื่อง · prev ตรง · แฮชคำนวณซ้ำตรง) ไม่งั้นปฏิเสธทั้งชุด + ธง chain_break
--    2) ตรวจความเป็นไปได้: มอนต้องเกิดในแผนที่นั้น · จำนวนฆ่าต่อแผนที่ไม่เกินจำนวนที่เกิดได้ · รวมไม่เกิน kps_max ตัว/วิ · บอสมีคูลดาวน์
--    3) เซิร์ฟเวอร์ "ทอยเอง" ด้วย random() ของฐานข้อมูล: EXP (สูตรเดียวกับเกม) Volt ของดรอป ชิป ตรากาชา → ใส่ลง characters.data
--       (ผ่าน ec_commit ของระยะ 1 — เซฟที่ตามไม่ทันถูกเติมเหมือนกัน) แล้วคืนผลให้เกมแสดง
--    4) ออกหมุดใหม่ = HMAC-SHA256(ความลับฝั่งเซิร์ฟเวอร์, user|ตัวละคร|seq|head) เก็บใน event_anchors — ชุดถัดไปต้องต่อจากหมุดนี้
--  เหตุการณ์ที่ส่งไปแล้วแก้ย้อนหลังไม่ได้: แก้ 1 รายการ = แฮชทุกตัวหลังจากนั้นเปลี่ยน และไม่ตรงหมุดที่เซิร์ฟเวอร์เก็บไว้
--  ความลับ (chain_secret) สร้างตอนรัน migration ในฐานข้อมูลเอง — ไม่อยู่ใน repo/เกม • ย้ายเข้า Supabase Vault ได้ (docs/SAVE_VERIFY.md)
--  ข้อมูลมอน/แผนที่: 20261012002100_event_chain_data.sql (tools/gen_item_ids.js) • ต้องรันหลังระยะ 0 และ 1 • รันซ้ำได้
--  ปิด: update save_verify_config set chain = false → chain_head ตอบ chain_off → เกมกลับไปทอยดรอปเอง (ระยะ 0/1 คุมต่อ)
-- ============================================================

alter table public.save_verify_config add column if not exists chain boolean not null default true;

create table if not exists public.sv_mobs (
  id         text primary key,
  lv         int not null,
  exp        int not null default 0,
  jexp       int not null default 0,
  zmin       int not null default 0,
  zmax       int not null default 0,
  boss       boolean not null default false,
  wb         boolean not null default false,
  elite      boolean not null default false,
  respawn_ms int not null default 0,
  drops      jsonb not null default '[]'::jsonb, -- [[id, โอกาส], ...]
  chip       text
);
alter table public.sv_mobs enable row level security;

create table if not exists public.sv_map_mobs (
  map  text not null,
  mob  text not null,
  n    int not null, -- จำนวนที่เกิดพร้อมกัน (บอส = 1)
  primary key (map, mob)
);
alter table public.sv_map_mobs enable row level security;

-- ความลับสำหรับ HMAC ของหมุด — อ่านได้เฉพาะฟังก์ชันฝั่งเซิร์ฟเวอร์ (ไม่มี policy + revoke ทุก role ของผู้เล่น)
create table if not exists public.chain_secret (
  id     int primary key default 1 check (id = 1),
  secret text not null
);
alter table public.chain_secret enable row level security;
revoke all on public.chain_secret from public, anon, authenticated;
insert into public.chain_secret (id, secret)
  values (1, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')) on conflict (id) do nothing;

create table if not exists public.event_anchors (
  id       bigint generated always as identity primary key,
  user_id  uuid not null references auth.users (id) on delete cascade,
  char_key text not null,
  seq      int not null,
  head     text not null,
  mac      text not null,
  n        int not null default 0,
  at       timestamptz not null default now()
);
create index if not exists event_anchors_last_idx on public.event_anchors (user_id, char_key, id desc);
alter table public.event_anchors enable row level security;

-- รายการดิบเก็บเป็นชุด (1 แถว/ชุด — ประหยัดพื้นที่ free tier) ไว้ตรวจย้อนหลัง N วัน (chain_trim)
create table if not exists public.event_log (
  id        bigint generated always as identity primary key,
  user_id   uuid not null references auth.users (id) on delete cascade,
  char_key  text not null,
  anchor_id bigint,
  from_seq  int not null,
  to_seq    int not null,
  entries   jsonb not null,
  status    text not null default 'ok',
  at        timestamptz not null default now()
);
create index if not exists event_log_user_idx on public.event_log (user_id, char_key, id desc);
alter table public.event_log enable row level security;

create table if not exists public.boss_kills (
  user_id  uuid not null references auth.users (id) on delete cascade,
  char_key text not null,
  mob      text not null,
  at       timestamptz not null default now()
);
create index if not exists boss_kills_idx on public.boss_kills (user_id, char_key, mob, at desc);
alter table public.boss_kills enable row level security;

-- ---------- แฮช / HMAC (sha256 มีในตัว Postgres 11+ • ไม่ต้องพึ่ง pgcrypto) ----------
create or replace function public.ch_sha(t text) returns text language sql immutable as $$ select encode(sha256(convert_to(t, 'UTF8')), 'hex') $$;
create or replace function public.ch_hmac(k text, m text) returns text
language plpgsql immutable as $$
declare kb bytea := convert_to(k, 'UTF8'); ip bytea; op bytea; i int;
begin
  if length(kb) > 64 then kb := sha256(kb); end if;
  kb := kb || decode(repeat('00', 64 - length(kb)), 'hex');
  ip := kb; op := kb;
  for i in 0..63 loop
    ip := set_byte(ip, i, get_byte(kb, i) # 54);
    op := set_byte(op, i, get_byte(kb, i) # 92);
  end loop;
  return encode(sha256(op || sha256(ip || convert_to(m, 'UTF8'))), 'hex');
end $$;
-- ข้อความที่ใช้แฮช: seq|prev|t|k|a0|a1|... (a = อาร์เรย์ของข้อความ/จำนวนเต็ม) — ตรงกับ Chain.canon ใน js/chain.js
create or replace function public.ch_canon(e jsonb) returns text language sql immutable as $$
  select concat_ws('|', e ->> 'seq', e ->> 'prev', e ->> 't', e ->> 'k',
    coalesce((select string_agg(x #>> '{}', '|' order by o) from jsonb_array_elements(case when jsonb_typeof(e -> 'a') = 'array' then e -> 'a' else '[]'::jsonb end) with ordinality q(x, o)), ''))
$$;
create or replace function public.ch_secret() returns text
language plpgsql stable security definer set search_path = public as $$
declare s text;
begin
  begin -- Supabase Vault (ถ้าย้ายความลับไปไว้ที่นั่น)
    execute $q$select decrypted_secret from vault.decrypted_secrets where name = 'iv_chain_secret' limit 1$q$ into s;
  exception when others then s := null; end;
  if s is null then select secret into s from public.chain_secret where id = 1; end if;
  return s;
end $$;
revoke all on function public.ch_secret() from public, anon, authenticated;

-- EXP ตามส่วนต่างเลเวล (expLevelMul ใน js/game.js)
create or replace function public.ch_exp_mul(mob_lv int, my_lv int) returns numeric language sql immutable as $$
  select case when d >= 16 then 0.4 when d >= 10 then 1.4 - (d - 10) * 0.05 when d >= 3 then 1 + (d - 2) * 0.05 when d >= -5 then 1
    when d >= -10 then 0.95 when d >= -15 then 0.9 when d >= -20 then 0.85 when d >= -25 then 0.6 when d >= -30 then 0.35 else 0.1 end
  from (select mob_lv - my_lv as d) s
$$;

-- ---------- ec_apply ฉบับมี EXP (แทนของระยะ 1): delta.exp = { b, j, jmax } → ขึ้นเลเวลแบบเดียวกับ gainExp ใน js/game.js ----------
create or replace function public.ec_exp(c jsonb, b numeric, j numeric, jmax int) returns jsonb
language plpgsql stable set search_path = public as $$
declare lv int := greatest(1, coalesce(trunc(public.sv_num(c -> 'baseLv')), 1))::int; ex numeric := public.sv_num(c -> 'baseExp') + greatest(0, b);
  sp numeric := public.sv_num(c -> 'statPoints'); jl int := greatest(1, coalesce(trunc(public.sv_num(c -> 'jobLv')), 1))::int; jx numeric := public.sv_num(c -> 'jobExp') + greatest(0, j);
  sk numeric := public.sv_num(c -> 'skillPoints');
  jt int := case when c ->> 'job' = 'novice' then 0 else coalesce((select t2.tier from public.save_verify_jobs t2 where t2.id = c ->> 'job'), 1) end;
begin
  while lv < 99 and ex >= public.sv_need_base(lv) loop ex := ex - public.sv_need_base(lv); lv := lv + 1; sp := sp + (lv / 5 + 3); end loop;
  if lv >= 99 then ex := 0; end if;
  if jmax is not null and jmax > 0 then
    while jl < jmax and jx >= public.sv_need_job(jt, jl) loop
      jx := jx - public.sv_need_job(jt, jl); jl := jl + 1; sk := sk + 1;
    end loop;
    if jl >= jmax then jx := 0; end if;
  end if;
  return c || jsonb_build_object('baseLv', lv, 'baseExp', ex::bigint, 'statPoints', sp::bigint, 'jobLv', jl, 'jobExp', jx::bigint, 'skillPoints', sk::bigint);
end $$;

create or replace function public.ec_apply(c jsonb, delta jsonb, strict boolean) returns jsonb
language plpgsql stable set search_path = public as $$
declare
  inv jsonb := case when jsonb_typeof(c -> 'inventory') = 'array' then c -> 'inventory' else '[]'::jsonb end;
  z numeric := public.sv_num(c -> 'zeny') + public.sv_num(delta -> 'zeny');
  r jsonb; a jsonb; e jsonb; arr jsonb; need numeric; k numeric; i int; merged boolean; sl text; ms jsonb;
begin
  if strict and z < 0 then raise exception 'econ_no_zeny' using errcode = 'P0001'; end if;
  c := jsonb_set(c, '{zeny}', to_jsonb(greatest(0, z)::bigint));
  for r in select x from jsonb_array_elements(case when jsonb_typeof(delta -> 'remove') = 'array' then delta -> 'remove' else '[]'::jsonb end) x loop
    if r ? 'uid' then
      select (o - 1)::int into i from jsonb_array_elements(inv) with ordinality t(x, o) where x ->> 'uid' = r ->> 'uid' limit 1;
      if i is null then
        if strict then raise exception 'econ_missing_item' using errcode = 'P0001'; end if;
        continue;
      end if;
      inv := inv - i;
    else
      need := public.sv_num(r -> 'qty'); arr := '[]'::jsonb;
      for e in select x from jsonb_array_elements(inv) x loop
        if need > 0 and e ->> 'id' = r ->> 'id' and not (e ? 'uid') then
          k := least(need, public.sv_num(e -> 'qty')); need := need - k;
          if public.sv_num(e -> 'qty') - k > 0 then arr := arr || jsonb_build_array(jsonb_set(e, '{qty}', to_jsonb((public.sv_num(e -> 'qty') - k)::bigint))); end if;
        else arr := arr || jsonb_build_array(e); end if;
      end loop;
      if strict and need > 0 then raise exception 'econ_missing_item' using errcode = 'P0001'; end if;
      inv := arr;
    end if;
  end loop;
  for a in select x from jsonb_array_elements(case when jsonb_typeof(delta -> 'add') = 'array' then delta -> 'add' else '[]'::jsonb end) x loop
    if a ? 'uid' then inv := inv || jsonb_build_array(a);
    else
      merged := false; arr := '[]'::jsonb;
      for e in select x from jsonb_array_elements(inv) x loop
        if not merged and e ->> 'id' = a ->> 'id' and not (e ? 'uid') then
          arr := arr || jsonb_build_array(jsonb_set(e, '{qty}', to_jsonb((public.sv_num(e -> 'qty') + public.sv_num(a -> 'qty'))::bigint))); merged := true;
        else arr := arr || jsonb_build_array(e); end if;
      end loop;
      if not merged then arr := arr || jsonb_build_array(jsonb_build_object('id', a ->> 'id', 'qty', public.sv_num(a -> 'qty')::bigint)); end if;
      inv := arr;
    end if;
  end loop;
  c := jsonb_set(c, '{inventory}', inv);
  if delta ? 'vend' then c := c || jsonb_build_object('vend', delta -> 'vend'); end if;
  if delta ? 'sale' then
    ms := jsonb_build_array(delta -> 'sale') || case when jsonb_typeof(c -> 'mkSales') = 'array' then c -> 'mkSales' else '[]'::jsonb end;
    c := c || jsonb_build_object('mkSales', coalesce((select jsonb_agg(x order by o) from jsonb_array_elements(ms) with ordinality t(x, o) where o <= 20), '[]'::jsonb));
  end if;
  if delta ? 'refine' then
    sl := delta -> 'refine' ->> 'slot';
    if jsonb_typeof(c -> 'equip' -> sl) = 'object' then c := jsonb_set(c, array['equip', sl, 'refine'], delta -> 'refine' -> 'to');
    elsif strict then raise exception 'econ_missing_item' using errcode = 'P0001'; end if;
  end if;
  if jsonb_typeof(delta -> 'exp') = 'object' then
    c := public.ec_exp(c, public.sv_num(delta -> 'exp' -> 'b'), public.sv_num(delta -> 'exp' -> 'j'), coalesce((delta -> 'exp' ->> 'jmax')::int, 0));
  end if;
  if jsonb_typeof(delta -> 'chips') = 'array' then -- สมุดมอน: มอนที่เคยได้ชิป
    c := c || jsonb_build_object('chips', (select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from jsonb_array_elements(coalesce(case when jsonb_typeof(c -> 'chips') = 'array' then c -> 'chips' end, '[]'::jsonb) || (delta -> 'chips')) x));
  end if;
  return c;
end $$;

-- ---------- หมุดล่าสุด (สร้างหมุดเริ่มต้นถ้ายังไม่มี) ----------
create or replace function public.ch_last(u uuid, k text) returns public.event_anchors
language plpgsql security definer set search_path = public as $$
declare a public.event_anchors; h text;
begin
  select * into a from public.event_anchors where user_id = u and char_key = k order by id desc limit 1;
  if a.id is null then
    h := public.ch_hmac(public.ch_secret(), concat_ws('|', 'genesis', u, k));
    insert into public.event_anchors (user_id, char_key, seq, head, mac) values (u, k, 0, h, public.ch_hmac(public.ch_secret(), concat_ws('|', u, k, 0, h)))
    returning * into a;
  end if;
  return a;
end $$;
revoke all on function public.ch_last(uuid, text) from public, anon, authenticated;

create or replace function public.ch_anchor_json(a public.event_anchors) returns jsonb language sql immutable as $$
  select jsonb_build_object('id', a.id, 'seq', a.seq, 'head', a.head, 'mac', a.mac)
$$;

-- เกมขอจุดเริ่มโซ่ (ตอนเข้าเกม / หลังถูกปฏิเสธ = เริ่มใหม่จากหมุดล่าสุด)
create or replace function public.chain_head(ch text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); k text := public.ec_key(ch);
begin
  if u is null then raise exception 'not signed in'; end if;
  if not coalesce((select chain from public.save_verify_config where id = 1), true) then raise exception 'chain_off' using errcode = 'P0001'; end if;
  perform public.ec_begin(k);
  return public.ch_anchor_json(public.ch_last(u, k));
end $$;

create or replace function public.ch_flag(u uuid, rule text, detail jsonb) returns void
language sql security definer set search_path = public as $$
  insert into public.cheat_flags (user_id, rule, detail, mode)
  select u, rule, detail, coalesce((select mode from public.save_verify_config where id = 1), 'log')
  where not exists (select 1 from public.cheat_flags where user_id = u and cheat_flags.rule = ch_flag.rule and at > now() - interval '2 minutes')
$$;
revoke all on function public.ch_flag(uuid, text, jsonb) from public, anon, authenticated;

-- ---------- ส่งชุดเหตุการณ์ ----------
-- คืน { status:'ok', anchor, seq, delta, got:[...] } | { status:'dup', anchor } (ส่งซ้ำชุดเดิม) | { status:'rejected', rule, anchor }
create or replace function public.submit_events(ch text, prev_anchor bigint, entries jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  u uuid := auth.uid(); k text := public.ec_key(ch); c jsonb; a public.event_anchors; P jsonb; mode text;
  e jsonb; prev text; s int; lastt numeric := 0; bn int; firstt numeric; spant numeric; elapsed numeric; nk int := 0;
  m public.sv_mobs; lv int; bexp numeric := 0; jexp numeric := 0; zeny bigint := 0; add jsonb := '[]'::jsonb; chips jsonb := '[]'::jsonb; got jsonb := '[]'::jsonb;
  dr jsonb; party int; em numeric; kf numeric; jmax int; bad text; badd jsonb; cnt record; seq int; na public.event_anchors; delta jsonb; lid bigint;
  g jsonb; chance numeric; gap int; sigw int := 0;
begin
  if u is null then raise exception 'not signed in'; end if;
  if not coalesce((select chain from public.save_verify_config where id = 1), true) then raise exception 'chain_off' using errcode = 'P0001'; end if;
  c := public.ec_begin(k); -- ล็อกแถวตัวละคร + ตรวจแบน
  P := public.sv_defaults() || jsonb_build_object('kps_max', 3, 'batch_max', 200, 'clock_skew', 600)
       || coalesce((select derived from public.save_verify_config where id = 1), '{}'::jsonb) || coalesce((select params from public.save_verify_config where id = 1), '{}'::jsonb);
  mode := coalesce((select save_verify_config.mode from public.save_verify_config where id = 1), 'log');
  a := public.ch_last(u, k);
  bn := case when jsonb_typeof(entries) = 'array' then jsonb_array_length(entries) else 0 end;
  if bn < 1 or bn > (P ->> 'batch_max')::int then return jsonb_build_object('status', 'rejected', 'rule', 'bad_batch', 'anchor', public.ch_anchor_json(a)); end if;

  -- 1) โซ่ต้องต่อจากหมุดล่าสุด
  if prev_anchor is distinct from a.id then
    -- ส่งซ้ำชุดที่รับไปแล้ว (เน็ตหลุดตอนรอคำตอบ) = ตอบหมุดล่าสุด ไม่ทำซ้ำ
    if exists (select 1 from public.event_log l where l.user_id = u and l.char_key = k and l.status = 'ok' and l.to_seq = (submit_events.entries -> (bn - 1) ->> 'seq')::int
               and l.entries -> -1 ->> 'h' = submit_events.entries -> (bn - 1) ->> 'h') then
      return jsonb_build_object('status', 'dup', 'anchor', public.ch_anchor_json(a));
    end if;
    perform public.ch_flag(u, 'chain_break', jsonb_build_object('why', 'stale_anchor', 'sent', prev_anchor, 'have', a.id));
    insert into public.event_log (user_id, char_key, anchor_id, from_seq, to_seq, entries, status) values (u, k, a.id, coalesce((entries -> 0 ->> 'seq')::int, 0), coalesce((entries -> (bn - 1) ->> 'seq')::int, 0), entries, 'chain_break');
    return jsonb_build_object('status', 'rejected', 'rule', 'chain_break', 'anchor', public.ch_anchor_json(a));
  end if;
  prev := a.head; s := a.seq;
  for e in select x from jsonb_array_elements(entries) x loop
    if (e ->> 'seq')::int is distinct from s + 1 or e ->> 'prev' is distinct from prev or e ->> 'h' is distinct from public.ch_sha(public.ch_canon(e))
       or public.sv_num(e -> 't') < lastt then
      perform public.ch_flag(u, 'chain_break', jsonb_build_object('why', 'link', 'at', s + 1, 'entry', e - 'a'));
      insert into public.event_log (user_id, char_key, anchor_id, from_seq, to_seq, entries, status) values (u, k, a.id, s + 1, s + bn, entries, 'chain_break');
      return jsonb_build_object('status', 'rejected', 'rule', 'chain_break', 'anchor', public.ch_anchor_json(a));
    end if;
    prev := e ->> 'h'; s := s + 1; lastt := public.sv_num(e -> 't');
  end loop;

  -- 2) ความเป็นไปได้ของการฆ่า
  firstt := public.sv_num(entries -> 0 -> 't');
  spant := greatest(0, (lastt - firstt) / 1000);
  elapsed := extract(epoch from now() - a.at);
  select count(*) into nk from jsonb_array_elements(entries) x where x ->> 'k' = 'kill';
  bad := null; badd := null;
  -- เวลาที่ใช้เทียบ = เวลาจริงตั้งแต่หมุดก่อน (นาฬิกาเซิร์ฟเวอร์) — แท็บที่ถูกซ่อนจำลองย้อนหลังทีเดียวหลายนาทีก็ยังผ่าน (ฆ่าได้ไม่เกินเวลาจริง)
  if nk > (P ->> 'kps_max')::numeric * (least(elapsed, (P ->> 'max_elapsed')::numeric) + 30) then
    bad := 'kill_rate'; badd := jsonb_build_object('kills', nk, 'span', round(spant), 'since_anchor', round(elapsed));
  end if;
  if bad is null then
    for cnt in
      select x -> 'a' ->> 0 as mob, x -> 'a' ->> 1 as map, count(*) as kills from jsonb_array_elements(entries) x where x ->> 'k' = 'kill' group by 1, 2
    loop
      select * into m from public.sv_mobs where id = cnt.mob;
      if m.id is null or not exists (select 1 from public.sv_map_mobs mm where mm.map = cnt.map and mm.mob = cnt.mob) then
        bad := 'kill_map'; badd := jsonb_build_object('mob', cnt.mob, 'map', cnt.map); exit;
      end if;
      if m.boss then
        if cnt.kills > 1 or exists (select 1 from public.boss_kills b where b.user_id = u and b.char_key = k and b.mob = cnt.mob and b.at > now() - make_interval(secs => greatest(60, m.respawn_ms / 1000.0 * 0.8))) then
          bad := 'boss_cooldown'; badd := jsonb_build_object('mob', cnt.mob, 'kills', cnt.kills); exit;
        end if;
      elsif cnt.kills > (select mm.n * (1 + greatest(spant, least(elapsed, (P ->> 'max_elapsed')::numeric)) / 4.0) * 1.5 + 2 from public.sv_map_mobs mm where mm.map = cnt.map and mm.mob = cnt.mob) then
        bad := 'kill_rate'; badd := jsonb_build_object('mob', cnt.mob, 'map', cnt.map, 'kills', cnt.kills, 'span', round(spant)); exit;
      end if;
    end loop;
  end if;
  if bad is not null then
    perform public.ch_flag(u, bad, badd);
    if mode = 'enforce' then
      insert into public.event_log (user_id, char_key, anchor_id, from_seq, to_seq, entries, status) values (u, k, a.id, a.seq + 1, s, entries, bad);
      return jsonb_build_object('status', 'rejected', 'rule', bad, 'anchor', public.ch_anchor_json(a));
    end if;
  end if;

  -- 3) เซิร์ฟเวอร์ทอยรางวัลเอง (ตามลำดับเหตุการณ์ — เลเวลเปลี่ยนระหว่างทางได้)
  lv := greatest(1, coalesce(trunc(public.sv_num(c -> 'baseLv')), 1))::int;
  g := coalesce((select derived -> 'gacha' from public.save_verify_config where id = 1), '{}'::jsonb);
  for e in select x from jsonb_array_elements(entries) x where x ->> 'k' = 'kill' loop
    select * into m from public.sv_mobs where id = e -> 'a' ->> 0;
    if m.id is null then continue; end if;
    party := least(5, greatest(0, coalesce(trunc(public.sv_num(e -> 'a' -> 3)), 0)))::int;
    kf := (1 + 0.15 * party) / (party + 1);
    em := public.ch_exp_mul(m.lv, lv);
    bexp := bexp + round(greatest(1, round(m.exp * em)) * kf);
    jexp := jexp + round(greatest(1, round(m.jexp * em)) * kf);
    if m.zmax > 0 then zeny := zeny + m.zmin + floor(random() * (m.zmax - m.zmin + 1))::bigint; end if;
    for dr in select x from jsonb_array_elements(m.drops) x loop
      if random() < (dr ->> 1)::numeric then
        if exists (select 1 from public.save_verify_items where id = dr ->> 0 and equip) then
          add := add || jsonb_build_array(jsonb_build_object('id', dr ->> 0, 'qty', 1, 'uid', public.ec_uid(), 'refine', 0, 'cards', '[]'::jsonb));
        else add := add || jsonb_build_array(jsonb_build_object('id', dr ->> 0, 'qty', 1)); end if;
        got := got || jsonb_build_array(jsonb_build_object('id', dr ->> 0, 'mob', m.id));
      end if;
    end loop;
    if m.chip is not null and random() < (case when m.boss then coalesce((P ->> 'chip_boss')::numeric, 0.02) else coalesce((P ->> 'chip_drop')::numeric, 0.002) end) then
      add := add || jsonb_build_array(jsonb_build_object('id', m.chip, 'qty', 1)); chips := chips || to_jsonb(m.id);
      got := got || jsonb_build_array(jsonb_build_object('id', m.chip, 'mob', m.id, 'chip', true));
    end if;
    -- ตรากาชา (Gacha.mobChance / onBossKill ใน js/gacha.js)
    if g ? 'token' then
      if m.boss or m.wb then
        sigw := case when m.wb then coalesce((g ->> 'wb')::int, 3) else coalesce((g ->> 'mvp')::int, 1) end;
        if sigw > 0 then add := add || jsonb_build_array(jsonb_build_object('id', g ->> 'token', 'qty', sigw)); got := got || jsonb_build_array(jsonb_build_object('id', g ->> 'token', 'qty', sigw, 'mob', m.id)); end if;
      elsif m.exp > 0 then
        gap := abs(lv - m.lv);
        chance := coalesce((g ->> 'base')::numeric, 0.003)
          * (case when gap <= coalesce((g ->> 'fullGap')::int, 5) then 1 else greatest(0, 1 - (gap - coalesce((g ->> 'fullGap')::int, 5))::numeric / greatest(1, coalesce((g ->> 'zeroGap')::int, 20) - coalesce((g ->> 'fullGap')::int, 5))) end)
          * (case when m.elite then coalesce((g ->> 'eliteMul')::numeric, 3) else 1 end);
        if random() < chance then add := add || jsonb_build_array(jsonb_build_object('id', g ->> 'token', 'qty', 1)); got := got || jsonb_build_array(jsonb_build_object('id', g ->> 'token', 'mob', m.id)); end if;
      end if;
    end if;
    -- รางวัล MVP: ยา 3 ขวด (สุ่ม 1 ชนิดจาก white/blue/yellow — killMob ใน js/game.js)
    if m.boss and not m.wb then
      add := add || jsonb_build_array(jsonb_build_object('id', (array['white_potion', 'blue_potion', 'yellow_potion'])[1 + floor(random() * 3)::int], 'qty', 3));
      insert into public.boss_kills (user_id, char_key, mob) values (u, k, m.id);
    elsif m.wb then insert into public.boss_kills (user_id, char_key, mob) values (u, k, m.id);
    end if;
    -- เลเวลระหว่างชุด (ประมาณจาก EXP ที่ได้ — ให้ตัวคูณส่วนต่างเลเวลถูกต้องในชุดยาว)
    lv := (public.ec_exp(c, bexp, 0, 0) ->> 'baseLv')::int;
  end loop;
  select job_max into jmax from public.save_verify_jobs where id = c ->> 'job';
  delta := jsonb_build_object('zeny', zeny, 'add', add, 'exp', jsonb_build_object('b', bexp, 'j', jexp, 'jmax', coalesce(jmax, 0)), 'chips', chips, 'kills', nk);

  -- 4) บันทึก + หมุดใหม่
  insert into public.event_log (user_id, char_key, anchor_id, from_seq, to_seq, entries, status) values (u, k, a.id, a.seq + 1, s, entries, 'ok') returning id into lid; -- โหมด log: รับไว้แม้มีธง
  insert into public.event_anchors (user_id, char_key, seq, head, mac, n)
    values (u, k, s, prev, public.ch_hmac(public.ch_secret(), concat_ws('|', u, k, s, prev)), bn) returning * into na;
  seq := public.ec_commit(u, k, delta, 'kills', na.id::text);
  return jsonb_build_object('status', 'ok', 'anchor', public.ch_anchor_json(na), 'seq', seq, 'delta', delta, 'got', got);
end $$;

do $$
declare f text;
begin
  foreach f in array array['chain_head(text)', 'submit_events(text, bigint, jsonb)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- เก็บกวาด: รายการดิบเก่ากว่า keep_days วัน (ค่าเริ่ม 3 — ประหยัดพื้นที่) • หมุดเก็บตัวล่าสุดของทุกตัวละครเสมอ
create or replace function public.chain_trim(keep_days int default 3) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from public.event_log where at < now() - make_interval(days => keep_days);
  get diagnostics n = row_count;
  delete from public.event_anchors a where a.at < now() - make_interval(days => keep_days)
    and a.id <> (select max(id) from public.event_anchors b where b.user_id = a.user_id and b.char_key = a.char_key);
  delete from public.boss_kills where at < now() - interval '2 days';
  return n;
end $$;
revoke all on function public.chain_trim(int) from public, anon, authenticated;
