-- ============================================================
--  Ragnarok Web Adventure — ฐานข้อมูลสำหรับโหมดออนไลน์ (Supabase)
--  วิธีใช้: Supabase Dashboard → SQL Editor → วางไฟล์นี้ทั้งหมด → Run
--  รันซ้ำได้ (idempotent)
-- ============================================================

-- ---------- ตัวละคร (1 บัญชี = 1 แถว) ----------
-- data = ก้อนบัญชี { v: 2, active, chars: [ตัวละคร 1..5] } (เซฟรุ่นเก่าเป็นตัวละครเดียว — เกมห่อให้อัตโนมัติ)
-- name = ชื่อตัวละครที่เล่นอยู่ (ใช้ในแชท)
create table if not exists public.characters (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 16),
  data       jsonb not null,
  base_lv    int generated always as ((data->>'baseLv')::int) stored,
  job        text generated always as (data->>'job') stored,
  updated_at timestamptz not null default now()
);
create unique index if not exists characters_name_lower_idx on public.characters (lower(name));

alter table public.characters enable row level security;

drop policy if exists "read own character" on public.characters;
create policy "read own character" on public.characters
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "create own character" on public.characters;
create policy "create own character" on public.characters
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "update own character" on public.characters;
create policy "update own character" on public.characters
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ตรวจว่าชื่อตัวละครยังว่างอยู่ (โดยไม่เปิดให้อ่านข้อมูลตัวละครของคนอื่น) — เช็กทุกช่องตัวละครใน data.chars ด้วย
create or replace function public.name_available(n text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from public.characters c
    where c.user_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
      and (lower(c.name) = lower(trim(n))
        or exists (
          select 1 from jsonb_array_elements(case when jsonb_typeof(c.data->'chars') = 'array' then c.data->'chars' else '[]'::jsonb end) e
          where lower(e->>'name') = lower(trim(n))
        ))
  );
$$;
grant execute on function public.name_available(text) to authenticated;

-- ---------- แชทรวม ----------
create table if not exists public.chat_messages (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null default '',
  map        text not null default '',
  text       text not null check (char_length(text) between 1 and 120),
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_created_idx on public.chat_messages (created_at desc);

alter table public.chat_messages enable row level security;

drop policy if exists "read chat" on public.chat_messages;
create policy "read chat" on public.chat_messages
  for select to authenticated using (true);

drop policy if exists "send chat as self" on public.chat_messages;
create policy "send chat as self" on public.chat_messages
  for insert to authenticated with check (user_id = auth.uid());

-- ชื่อผู้ส่งมาจากตัวละครจริงเสมอ (กันปลอมชื่อ) + จำกัด 1 ข้อความต่อวินาที
create or replace function public.chat_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  select c.name into new.name from public.characters c where c.user_id = auth.uid();
  if new.name is null then
    raise exception 'สร้างตัวละครก่อนจึงจะแชทได้';
  end if;
  if exists (
    select 1 from public.chat_messages m
    where m.user_id = auth.uid() and m.created_at > now() - interval '1 second'
  ) then
    raise exception 'ส่งข้อความเร็วเกินไป';
  end if;
  return new;
end;
$$;

drop trigger if exists chat_before_insert on public.chat_messages;
create trigger chat_before_insert before insert on public.chat_messages
  for each row execute function public.chat_before_insert();

-- เปิด Realtime ให้ตารางแชท
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;

-- ---------- ป้องกันล็อกอินซ้ำฝั่งเซิร์ฟเวอร์ (เหมือน migrations/20261011000000_single_session.sql) ----------
create table if not exists public.account_sessions (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  sid        text not null check (char_length(sid) between 8 and 64),
  claimed_at timestamptz not null default now()
);
alter table public.account_sessions enable row level security; -- ไม่มี policy: เข้าถึงผ่านฟังก์ชันข้างล่างเท่านั้น

alter table public.characters add column if not exists sid text;

create or replace function public.claim_session(s text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if s is null or char_length(s) not between 8 and 64 then raise exception 'bad session id'; end if;
  insert into public.account_sessions (user_id, sid, claimed_at) values (auth.uid(), s, now())
  on conflict (user_id) do update set sid = excluded.sid, claimed_at = now();
end $$;
revoke all on function public.claim_session(text) from public;
grant execute on function public.claim_session(text) to authenticated;

-- sid ปัจจุบันของบัญชีตัวเองเท่านั้น (อ่านของคนอื่นไม่ได้)
create or replace function public.my_session_sid(u uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select sid from public.account_sessions where user_id = u and u = auth.uid();
$$;
revoke all on function public.my_session_sid(uuid) from public;
grant execute on function public.my_session_sid(uuid) to authenticated;

create or replace function public.characters_session_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare cur text;
begin
  if current_user <> 'authenticated' then return new; end if;
  cur := public.my_session_sid(new.user_id);
  if cur is not null and new.sid is distinct from cur then
    raise exception 'stale_session' using errcode = 'P0001', hint = 'This account is now playing on another device.';
  end if;
  return new;
end $$;

drop trigger if exists characters_session_guard on public.characters;
create trigger characters_session_guard before insert or update on public.characters
  for each row execute function public.characters_session_guard();

-- ---------- ระบบตรวจเซฟฝั่งเซิร์ฟเวอร์ (เหมือน migrations/20261012000000_save_verify.sql) ----------
-- หลังรันไฟล์นี้ ให้รัน migrations/20261012000100_save_verify_data.sql (รายการไอเทม/Class — สร้างด้วย tools/gen_item_ids.js) ต่อทันที
-- ---------- ตั้งค่า ----------
create table if not exists public.save_verify_config (
  id         int primary key default 1 check (id = 1),
  mode       text not null default 'log' check (mode in ('off', 'log', 'enforce')),
  soft_rules text[] not null default '{unknown_item,unknown_job,dup_uid,import_offline}',
  params     jsonb not null default '{}'::jsonb,  -- เจ้าของปรับค่าคงที่ได้ที่นี่ (ทับค่าเริ่มต้นและ derived)
  derived    jsonb not null default '{}'::jsonb,  -- ค่าฐานจากข้อมูลเกม (tools/gen_item_ids.js เขียนให้)
  updated_at timestamptz not null default now()
);
insert into public.save_verify_config (id) values (1) on conflict (id) do nothing;
alter table public.save_verify_config enable row level security; -- ไม่มี policy: ผู้เล่นอ่าน/แก้ไม่ได้

create table if not exists public.save_verify_items (
  id    text primary key,
  worth bigint not null default 0,      -- ราคาขายร้าน NPC (= price / 2) • ตรากาชา = ค่าคาดหมายของการหมุน
  equip boolean not null default false, -- อุปกรณ์ (ไม่ซ้อนกอง จำนวน = 1)
  card  boolean not null default false  -- ชิป (ใส่ช่องอุปกรณ์ได้)
);
alter table public.save_verify_items enable row level security;

create table if not exists public.save_verify_jobs (
  id      text primary key,
  job_max int not null,
  tier    int not null,
  parent  text
);
alter table public.save_verify_jobs enable row level security;

-- ถังโทเคนต่อบัญชี (wb/held = มูลค่า) และต่อตัวละคร (chars: { ชื่อตัวเล็ก: { eb, jb, lb } })
create table if not exists public.save_verify_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  at      timestamptz not null default now(),
  wb      numeric not null default 0,
  held    numeric not null default 0,
  chars   jsonb not null default '{}'::jsonb
);
alter table public.save_verify_state enable row level security;

create table if not exists public.cheat_flags (
  id       bigint generated always as identity primary key,
  user_id  uuid not null references auth.users (id) on delete cascade,
  slot     int,
  rule     text not null,
  detail   jsonb not null default '{}'::jsonb,
  mode     text not null default 'log',
  rejected boolean not null default false,
  at       timestamptz not null default now()
);
create index if not exists cheat_flags_user_at_idx on public.cheat_flags (user_id, at desc);
create index if not exists cheat_flags_rule_idx on public.cheat_flags (rule, at desc);
alter table public.cheat_flags enable row level security; -- ไม่มี policy: ดูผ่าน Studio / service role เท่านั้น

-- รายการโอนระหว่างผู้เล่น: แต่ละฝ่ายบันทึกฝั่งของตัวเอง (user_id = ผู้บันทึก) • นับเป็นเครดิตเมื่ออีกฝ่ายบันทึกตรงกัน (sig เดียวกัน)
create table if not exists public.transfer_ledger (
  id          bigint generated always as identity primary key,
  kind        text not null check (kind in ('market', 'trade')),
  tid         text not null check (char_length(tid) between 4 and 64),
  user_id     uuid not null references auth.users (id) on delete cascade,
  peer_id     uuid not null references auth.users (id) on delete cascade,
  zin         bigint not null default 0,
  zout        bigint not null default 0,
  win         bigint not null default 0,
  wout        bigint not null default 0,
  sig         text not null,
  detail      jsonb not null default '{}'::jsonb,
  at          timestamptz not null default now(),
  consumed_at timestamptz,
  unique (kind, tid, user_id)
);
create index if not exists transfer_ledger_open_idx on public.transfer_ledger (user_id) where consumed_at is null;
alter table public.transfer_ledger enable row level security;

-- ผู้เล่นที่เจ้าของปฏิเสธ (ใส่/ลบแถวใน Studio) — เซฟไม่ได้ บันทึกรายการโอนไม่ได้ เกมขึ้นข้อความตอนล็อกอิน
create table if not exists public.player_bans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  reason  text not null default '',
  by      text not null default 'owner',
  at      timestamptz not null default now()
);
alter table public.player_bans enable row level security;

-- ---------- ตัวช่วย ----------
create or replace function public.sv_num(x jsonb) returns numeric
language sql immutable as $$ select case when jsonb_typeof(x) = 'number' then (x #>> '{}')::numeric else 0 end $$;

create or replace function public.sv_is_int(x jsonb) returns boolean
language sql immutable as $$ select jsonb_typeof(x) = 'number' and (x #>> '{}')::numeric = trunc((x #>> '{}')::numeric) $$;

create or replace function public.sv_defaults() returns jsonb
language sql immutable as $$ select '{"kps":1,"safety":3,"exp_per_kill":7784,"jexp_per_kill":5446,"worth_per_kill":388,"boss_exp":310000,"party_mul":1.75,"max_base_lv":99,
  "stat_max":99,"refine_max":10,"cards_max":4,"stack_max":1000000,"zeny_max":1000000000000,"max_elapsed":21600,
  "worth_cap":3000000,"lv_cap":30,"lv_per_min":15,"new_char_worth":20000,"pair_wait":120,"stat_slack":0,"need_frac":0.1}'::jsonb $$;

-- รายชื่อตัวละครในก้อนบัญชี ({ v:2, chars:[...] } หรือเซฟรุ่นเก่าตัวเดียว)
create or replace function public.sv_chars(d jsonb) returns jsonb
language sql immutable as $$
  select case
    when d is null or jsonb_typeof(d) <> 'object' then '[]'::jsonb
    when jsonb_typeof(d -> 'chars') = 'array' then coalesce((
      select jsonb_agg(x order by i) from jsonb_array_elements(d -> 'chars') with ordinality a(x, i)
      where jsonb_typeof(x) = 'object' and coalesce(x ->> 'name', '') <> ''), '[]'::jsonb)
    when coalesce(d ->> 'name', '') <> '' then jsonb_build_array(d)
    else '[]'::jsonb end
$$;

-- ของทุกชิ้นของตัวละคร: กระเป๋า / คลัง / ที่สวม / ของที่วางขายในตลาด (escrow)
create or replace function public.sv_entries(c jsonb) returns table (w text, e jsonb)
language sql immutable as $$
  select 'inventory', x from jsonb_array_elements(case when jsonb_typeof(c -> 'inventory') = 'array' then c -> 'inventory' else '[]'::jsonb end) x
  union all
  select 'storage', x from jsonb_array_elements(case when jsonb_typeof(c -> 'storage') = 'array' then c -> 'storage' else '[]'::jsonb end) x
  union all
  select 'equip', v from jsonb_each(case when jsonb_typeof(c -> 'equip') = 'object' then c -> 'equip' else '{}'::jsonb end) kv(k, v)
    where jsonb_typeof(v) not in ('null') and v <> 'false'::jsonb and v <> '0'::jsonb and v <> '""'::jsonb
  union all
  select 'vend', x from jsonb_array_elements(case when jsonb_typeof(c #> '{vend,items}') = 'array' then c #> '{vend,items}' else '[]'::jsonb end) x
$$;

create or replace function public.sv_char_worth(c jsonb) returns numeric
language sql stable set search_path = public as $$
  select greatest(0, public.sv_num(c -> 'zeny')) + coalesce((
    select sum(coalesce((select i.worth from public.save_verify_items i where i.id = en.e ->> 'id'), 0) * greatest(0, public.sv_num(en.e -> 'qty'))
      + coalesce((select sum(coalesce((select i2.worth from public.save_verify_items i2 where i2.id = cd), 0))
                  from jsonb_array_elements_text(case when jsonb_typeof(en.e -> 'cards') = 'array' then en.e -> 'cards' else '[]'::jsonb end) cd), 0))
    from public.sv_entries(c) en where jsonb_typeof(en.e) = 'object'), 0)
$$;

-- มูลค่าของในรายการโอน [{ id, qty, cards }]
create or replace function public.sv_items_worth(a jsonb) returns bigint
language sql stable set search_path = public as $$
  select coalesce(sum(coalesce((select i.worth from public.save_verify_items i where i.id = x ->> 'id'), 0) * greatest(0, least(1000000, public.sv_num(x -> 'qty')))
    + coalesce((select sum(coalesce((select i2.worth from public.save_verify_items i2 where i2.id = cd), 0))
                from jsonb_array_elements_text(case when jsonb_typeof(x -> 'cards') = 'array' then x -> 'cards' else '[]'::jsonb end) cd), 0)), 0)::bigint
  from jsonb_array_elements(case when jsonb_typeof(a) = 'array' then a else '[]'::jsonb end) x where jsonb_typeof(x) = 'object'
$$;

-- EXP สะสม (ตรงกับ baseExpNeed / jobExpNeed ใน js/data.js)
create or replace function public.sv_need_base(lv int) returns numeric
language sql immutable as $$ select 3 * lv::numeric * lv * lv + 40 $$;
create or replace function public.sv_cum_base(lv int, ex numeric) returns numeric
language sql immutable as $$ select 3 * power(((lv - 1)::numeric * lv / 2), 2) + 40 * (lv - 1) + greatest(0, ex) $$;
create or replace function public.sv_need_job(tier int, jl int) returns numeric
language sql immutable as $$
  select case when tier = 0 then floor(5 * power(jl::float8, 1.5))::numeric + 5
              else (case tier when 2 then 70 when 3 then 100 else 40 end) * jl::numeric * jl end
$$;
create or replace function public.sv_cum_job(tier int, jl int, ex numeric) returns numeric
language sql immutable as $$
  select case when tier = 0 then coalesce((select sum(floor(5 * power(j::float8, 1.5))::numeric + 5) from generate_series(1, greatest(0, least(jl, 200) - 1)) j), 0)
              else (case tier when 2 then 70 when 3 then 100 else 40 end) * (greatest(0, least(jl, 200) - 1))::numeric * greatest(1, least(jl, 200)) * (2 * greatest(0, least(jl, 200) - 1) + 1) / 6 end
         + greatest(0, ex)
$$;
create or replace function public.sv_stat_total(lv int) returns int
language sql immutable as $$ select 48 + coalesce((select sum(l / 5 + 3) from generate_series(2, lv) l), 0)::int $$;
create or replace function public.sv_stat_spent(st jsonb) returns int
language sql immutable as $$
  select coalesce(sum((v - 1) / 10 + 2), 0)::int
  from unnest(array['str','agi','vit','int','dex','luk']) s,
       generate_series(1, least(1000, greatest(0, coalesce(floor(public.sv_num(st -> s)), 0)))::int - 1) v
$$;
create or replace function public.sv_descends(f text, t text) returns boolean
language plpgsql stable set search_path = public as $$
declare j text := t; n int := 0;
begin
  while j is not null and n < 10 loop
    if j = f then return true; end if;
    select parent into j from public.save_verify_jobs where id = j; n := n + 1;
  end loop;
  return false;
end $$;
create or replace function public.sv_flag(fl jsonb, rule text, slot int, detail jsonb, soft text[]) returns jsonb
language sql immutable as $$
  select fl || jsonb_build_array(jsonb_build_object('rule', rule, 'slot', slot, 'detail', detail, 'soft', rule = any(soft) or rule = 'import_offline'))
$$;

-- ---------- ตัวตรวจ (สำเนาเดียวกับ evaluate() ใน supabase/save_verify_rules.js) ----------
-- คืนชื่อกติกาที่ต้องปฏิเสธ (โหมด enforce) หรือ null • จดธง/อัปเดตถัง/ใช้รายการโอน ในทรานแซกชันเดียวกับการเซฟ
create or replace function public.save_verify_eval(u uuid, od jsonb, nd jsonb, old_at timestamptz)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg public.save_verify_config; st public.save_verify_state; P jsonb; soft text[]; mode text;
  nowt timestamptz := now(); t numeric; fl jsonb := '[]'::jsonb;
  nc jsonb := public.sv_chars(nd); oc jsonb := public.sv_chars(od);
  c jsonb; o jsonb; k text; nm text; slot int := -1; jb_row public.save_verify_jobs; ojb public.save_verify_jobs;
  lv int; ol int; jl int; L int; pts numeric; spent int; have int;
  en record; it public.save_verify_items; unk jsonb; qbad jsonb; rbad jsonb; cbad jsonb; dupu jsonb; uids bigint[]; q numeric; cd text;
  exp_rate numeric; jexp_rate numeric; worth_rate numeric; capE numeric; capJ numeric;
  prev jsonb; eb numeric; jbk numeric; lb numeric; dE numeric; dJ numeric; dL int; schars jsonb := '{}'::jsonb;
  fresh int := 0; impw numeric := 0; acct_imp boolean; imported boolean;
  w0 numeric := 0; w1 numeric := 0; dW numeric; credit numeric := 0; pend numeric := 0; consume bigint[] := '{}';
  r record; bucket numeric; total numeric; use_ numeric; held numeric; wb numeric; f jsonb; hard text;
begin
  -- เรียกได้จาก trigger บนตาราง characters เท่านั้น (ไม่ใช่ RPC ตรง) และเฉพาะบัญชีของตัวเอง
  if pg_trigger_depth() < 1 then raise exception 'save_verify_eval is internal'; end if;
  if auth.uid() is not null and u is distinct from auth.uid() then raise exception 'not your account'; end if;
  select * into cfg from public.save_verify_config where id = 1;
  mode := coalesce(cfg.mode, 'log');
  if mode = 'off' then return null; end if;
  soft := coalesce(cfg.soft_rules, '{unknown_item,unknown_job,dup_uid,import_offline}');
  P := public.sv_defaults() || coalesce(cfg.derived, '{}'::jsonb) || coalesce(cfg.params, '{}'::jsonb);
  select * into st from public.save_verify_state where user_id = u for update;
  t := least((P ->> 'max_elapsed')::numeric, greatest(0, extract(epoch from nowt - coalesce(st.at, old_at, nowt))));
  exp_rate := (P ->> 'exp_per_kill')::numeric * (P ->> 'kps')::numeric * (P ->> 'party_mul')::numeric * (P ->> 'safety')::numeric;
  jexp_rate := (P ->> 'jexp_per_kill')::numeric * (P ->> 'kps')::numeric * (P ->> 'party_mul')::numeric * (P ->> 'safety')::numeric;
  worth_rate := (P ->> 'worth_per_kill')::numeric * (P ->> 'kps')::numeric * (P ->> 'safety')::numeric;
  acct_imp := coalesce(nd ->> 'importedOffline', '') <> '' and (od is null or (od ->> 'importedOffline') is distinct from (nd ->> 'importedOffline'));

  for c in select x from jsonb_array_elements(nc) x loop
    slot := slot + 1;
    k := lower(trim(c ->> 'name')); nm := left(c ->> 'name', 24);
    select x into o from jsonb_array_elements(oc) x where lower(trim(x ->> 'name')) = k limit 1;
    imported := (coalesce(c ->> 'importedOffline', '') <> '' and (o is null or (o ->> 'importedOffline') is distinct from (c ->> 'importedOffline'))) or (acct_imp and o is null);
    if o is null and not imported then fresh := fresh + 1; end if;
    if imported then
      fl := public.sv_flag(fl, 'import_offline', slot, jsonb_build_object('name', nm, 'at', coalesce(c -> 'importedOffline', nd -> 'importedOffline'), 'baseLv', c -> 'baseLv', 'job', c -> 'job', 'zeny', c -> 'zeny'), soft);
      impw := impw + public.sv_char_worth(c) - coalesce(public.sv_char_worth(o), 0);
    end if;

    -- ค่าที่เป็นไปไม่ได้
    lv := case when public.sv_is_int(c -> 'baseLv') then least(100000, greatest(-1, (c ->> 'baseLv')::numeric))::int else null end;
    if lv is null or lv < 1 or lv > (P ->> 'max_base_lv')::int then fl := public.sv_flag(fl, 'level_cap', slot, jsonb_build_object('name', nm, 'baseLv', c -> 'baseLv'), soft); end if;
    if (c -> 'job1Lv') is not null and jsonb_typeof(c -> 'job1Lv') <> 'null' and (not public.sv_is_int(c -> 'job1Lv') or public.sv_num(c -> 'job1Lv') < 1 or public.sv_num(c -> 'job1Lv') > 99) then
      fl := public.sv_flag(fl, 'level_cap', slot, jsonb_build_object('name', nm, 'job1Lv', c -> 'job1Lv'), soft); end if;
    if (c -> 'job2Lv') is not null and jsonb_typeof(c -> 'job2Lv') <> 'null' and (not public.sv_is_int(c -> 'job2Lv') or public.sv_num(c -> 'job2Lv') < 1 or public.sv_num(c -> 'job2Lv') > 99) then
      fl := public.sv_flag(fl, 'level_cap', slot, jsonb_build_object('name', nm, 'job2Lv', c -> 'job2Lv'), soft); end if;
    select * into jb_row from public.save_verify_jobs where id = c ->> 'job';
    jl := greatest(1, least(100000, trunc(public.sv_num(c -> 'jobLv'))))::int;
    if jb_row.id is null then fl := public.sv_flag(fl, 'unknown_job', slot, jsonb_build_object('name', nm, 'job', c -> 'job'), soft);
    elsif not public.sv_is_int(c -> 'jobLv') or public.sv_num(c -> 'jobLv') < 1 or public.sv_num(c -> 'jobLv') > jb_row.job_max then
      fl := public.sv_flag(fl, 'job_level_cap', slot, jsonb_build_object('name', nm, 'job', c -> 'job', 'jobLv', c -> 'jobLv', 'max', jb_row.job_max), soft); end if;
    L := case when lv is null then 1 else greatest(1, least((P ->> 'max_base_lv')::int, lv)) end;
    if public.sv_num(c -> 'baseExp') < 0 or (L < (P ->> 'max_base_lv')::int and public.sv_num(c -> 'baseExp') >= 2 * public.sv_need_base(L)) then
      fl := public.sv_flag(fl, 'exp_range', slot, jsonb_build_object('name', nm, 'baseExp', c -> 'baseExp'), soft); end if;
    if jb_row.id is not null and (public.sv_num(c -> 'jobExp') < 0 or public.sv_num(c -> 'jobExp') >= 2 * public.sv_need_job(jb_row.tier, jl)) then
      fl := public.sv_flag(fl, 'exp_range', slot, jsonb_build_object('name', nm, 'jobExp', c -> 'jobExp'), soft); end if;
    if exists (select 1 from unnest(array['str','agi','vit','int','dex','luk']) s
               where not coalesce(public.sv_is_int(c -> 'stats' -> s), false) or public.sv_num(c -> 'stats' -> s) < 1 or public.sv_num(c -> 'stats' -> s) > (P ->> 'stat_max')::numeric) then
      fl := public.sv_flag(fl, 'stat_cap', slot, jsonb_build_object('name', nm, 'stats', c -> 'stats'), soft); end if;
    spent := public.sv_stat_spent(case when jsonb_typeof(c -> 'stats') = 'object' then c -> 'stats' else '{}'::jsonb end);
    pts := public.sv_num(c -> 'statPoints'); have := public.sv_stat_total(L);
    if pts < 0 or spent + pts > have + (P ->> 'stat_slack')::numeric then
      fl := public.sv_flag(fl, 'stat_points', slot, jsonb_build_object('name', nm, 'spent', spent, 'points', pts, 'allowed', have), soft); end if;
    if (c -> 'zeny') is not null and jsonb_typeof(c -> 'zeny') <> 'null' and (not public.sv_is_int(c -> 'zeny') or public.sv_num(c -> 'zeny') < 0 or public.sv_num(c -> 'zeny') > (P ->> 'zeny_max')::numeric) then
      fl := public.sv_flag(fl, 'zeny_range', slot, jsonb_build_object('name', nm, 'zeny', c -> 'zeny'), soft); end if;
    unk := null; qbad := null; rbad := null; cbad := null; dupu := null; uids := '{}';
    for en in select * from public.sv_entries(c) loop
      if jsonb_typeof(en.e) <> 'object' then qbad := coalesce(qbad, jsonb_build_object('where', en.w)); continue; end if;
      select * into it from public.save_verify_items where id = en.e ->> 'id';
      if it.id is null then unk := coalesce(unk, jsonb_build_object('where', en.w, 'id', left(coalesce(en.e ->> 'id', ''), 40))); continue; end if;
      q := public.sv_num(en.e -> 'qty');
      if not public.sv_is_int(en.e -> 'qty') or q < (case when en.w = 'vend' then 0 else 1 end) or q > (case when it.equip then 1 else (P ->> 'stack_max')::numeric end) then
        qbad := coalesce(qbad, jsonb_build_object('where', en.w, 'id', it.id, 'qty', en.e -> 'qty')); end if;
      if (en.e -> 'refine') is not null and jsonb_typeof(en.e -> 'refine') <> 'null' and (not public.sv_is_int(en.e -> 'refine') or public.sv_num(en.e -> 'refine') < 0 or public.sv_num(en.e -> 'refine') > (P ->> 'refine_max')::numeric) then
        rbad := coalesce(rbad, jsonb_build_object('where', en.w, 'id', it.id, 'refine', en.e -> 'refine')); end if;
      if (en.e -> 'cards') is not null and jsonb_typeof(en.e -> 'cards') <> 'null' then
        if jsonb_typeof(en.e -> 'cards') <> 'array' or jsonb_array_length(en.e -> 'cards') > (P ->> 'cards_max')::int then
          cbad := coalesce(cbad, jsonb_build_object('where', en.w, 'id', it.id));
        else
          for cd in select jsonb_array_elements(en.e -> 'cards') #>> '{}' loop
            if not exists (select 1 from public.save_verify_items where id = cd) then unk := coalesce(unk, jsonb_build_object('where', en.w, 'id', left(coalesce(cd, ''), 40)));
            elsif not exists (select 1 from public.save_verify_items where id = cd and card) then cbad := coalesce(cbad, jsonb_build_object('where', en.w, 'id', it.id, 'card', cd)); end if;
          end loop;
        end if;
      end if;
      if it.equip and public.sv_is_int(en.e -> 'uid') and public.sv_num(en.e -> 'uid') > 0 and en.w <> 'vend' and public.sv_num(en.e -> 'uid') < 9e18 then
        if (en.e ->> 'uid')::numeric::bigint = any(uids) then dupu := coalesce(dupu, jsonb_build_object('where', en.w, 'id', it.id, 'uid', en.e -> 'uid')); end if;
        uids := uids || (en.e ->> 'uid')::numeric::bigint;
      end if;
    end loop;
    if unk is not null then fl := public.sv_flag(fl, 'unknown_item', slot, jsonb_build_object('name', nm) || unk, soft); end if;
    if qbad is not null then fl := public.sv_flag(fl, 'qty_range', slot, jsonb_build_object('name', nm) || qbad, soft); end if;
    if rbad is not null then fl := public.sv_flag(fl, 'refine_cap', slot, jsonb_build_object('name', nm) || rbad, soft); end if;
    if cbad is not null then fl := public.sv_flag(fl, 'card_range', slot, jsonb_build_object('name', nm) || cbad, soft); end if;
    if dupu is not null then fl := public.sv_flag(fl, 'dup_uid', slot, jsonb_build_object('name', nm) || dupu, soft); end if;
    -- เปลี่ยน Class ได้ทีละขั้นตามสาย • ตัวละครใหม่เริ่มที่ Novice (เผื่อ Class 1 ก่อนเซฟแรก)
    if jb_row.id is not null and o is not null and (o ->> 'job') is distinct from (c ->> 'job')
       and (not public.sv_descends(o ->> 'job', c ->> 'job')
            or jb_row.tier - coalesce((select tier from public.save_verify_jobs where id = o ->> 'job'), jb_row.tier) > 1) then
      fl := public.sv_flag(fl, 'job_path', slot, jsonb_build_object('name', nm, 'from', o -> 'job', 'to', c -> 'job'), soft); end if;
    if jb_row.id is not null and o is null and not imported and jb_row.tier > 1 then
      fl := public.sv_flag(fl, 'job_path', slot, jsonb_build_object('name', nm, 'from', null, 'to', c -> 'job'), soft); end if;

    -- อัตราเทียบเวลา (ถังโทเคน)
    if imported then
      schars := schars || jsonb_build_object(k, jsonb_build_object('eb', round(3 * (P ->> 'boss_exp')::numeric * (P ->> 'party_mul')::numeric),
        'jb', round(3 * (P ->> 'boss_exp')::numeric * 0.7 * (P ->> 'party_mul')::numeric), 'lb', (P ->> 'lv_cap')::numeric));
      continue;
    end if;
    ol := case when o is not null and public.sv_is_int(o -> 'baseLv') then greatest(1, least((P ->> 'max_base_lv')::int, greatest(-1, least(100000, (o ->> 'baseLv')::numeric))::int)) else 1 end;
    prev := case when st.user_id is not null then st.chars -> k else null end;
    select * into ojb from public.save_verify_jobs where o is not null and id = o ->> 'job';
    capE := 3 * (P ->> 'boss_exp')::numeric * (P ->> 'party_mul')::numeric + (P ->> 'need_frac')::numeric * public.sv_need_base(ol);
    capJ := 3 * (P ->> 'boss_exp')::numeric * 0.7 * (P ->> 'party_mul')::numeric
            + case when ojb.id is not null then (P ->> 'need_frac')::numeric * public.sv_need_job(ojb.tier, greatest(1, least(100000, trunc(public.sv_num(o -> 'jobLv'))))::int) else 0 end;
    dE := public.sv_cum_base(L, public.sv_num(c -> 'baseExp')) - case when o is not null then public.sv_cum_base(ol, public.sv_num(o -> 'baseExp')) else 0 end;
    eb := least(capE, coalesce((prev ->> 'eb')::numeric, capE) + exp_rate * t) - greatest(0, dE);
    if eb < 0 then
      fl := public.sv_flag(fl, 'exp_rate', slot, jsonb_build_object('name', nm, 'gained', round(dE), 'allowed', round(eb + greatest(0, dE)), 'seconds', round(t)), soft); eb := 0; end if;
    dJ := 0;
    if jb_row.id is not null then
      if o is not null and (o ->> 'job') = (c ->> 'job') and ojb.id is not null then
        dJ := public.sv_cum_job(jb_row.tier, jl, public.sv_num(c -> 'jobExp')) - public.sv_cum_job(ojb.tier, greatest(1, least(100000, trunc(public.sv_num(o -> 'jobLv'))))::int, public.sv_num(o -> 'jobExp'));
      else dJ := public.sv_cum_job(jb_row.tier, jl, public.sv_num(c -> 'jobExp')); end if;
    end if;
    jbk := least(capJ, coalesce((prev ->> 'jb')::numeric, capJ) + jexp_rate * t) - greatest(0, dJ);
    if jbk < 0 then
      fl := public.sv_flag(fl, 'jexp_rate', slot, jsonb_build_object('name', nm, 'gained', round(dJ), 'allowed', round(jbk + greatest(0, dJ)), 'seconds', round(t)), soft); jbk := 0; end if;
    dL := L - ol;
    lb := least((P ->> 'lv_cap')::numeric, coalesce((prev ->> 'lb')::numeric, (P ->> 'lv_cap')::numeric) + (P ->> 'lv_per_min')::numeric * t / 60) - greatest(0, dL);
    if lb < 0 then
      fl := public.sv_flag(fl, 'level_rate', slot, jsonb_build_object('name', nm, 'from', ol, 'to', L, 'seconds', round(t)), soft); lb := 0; end if;
    schars := schars || jsonb_build_object(k, jsonb_build_object('eb', round(eb), 'jb', round(jbk), 'lb', round(lb, 2)));
  end loop;

  -- มูลค่ารวมทั้งบัญชี
  select coalesce(sum(public.sv_char_worth(x)), 0) into w0 from jsonb_array_elements(oc) x;
  select coalesce(sum(public.sv_char_worth(x)), 0) into w1 from jsonb_array_elements(nc) x;
  dW := w1 - w0 - (P ->> 'new_char_worth')::numeric * fresh - impw;
  for r in
    select l.id, l.at, l.zin, l.zout, l.win, l.wout,
           exists (select 1 from public.transfer_ledger pl where pl.kind = l.kind and pl.tid = l.tid and pl.user_id = l.peer_id and pl.peer_id = l.user_id and pl.sig = l.sig) as paired
    from public.transfer_ledger l where l.user_id = u and l.consumed_at is null order by l.id
  loop
    if r.paired then credit := credit + r.zin + r.win - r.zout - r.wout; consume := consume || r.id;
    elsif extract(epoch from nowt - r.at) > (P ->> 'pair_wait')::numeric then consume := consume || r.id;
    else pend := pend + r.zout + r.wout; end if;
  end loop;
  bucket := least((P ->> 'worth_cap')::numeric, coalesce(st.wb, (P ->> 'worth_cap')::numeric) + worth_rate * t);
  use_ := dW - credit;
  total := bucket + coalesce(st.held, 0) - use_;
  if total < 0 then
    fl := public.sv_flag(fl, 'worth_rate', case when jsonb_array_length(nc) = 0 then 0 else greatest(0, least(jsonb_array_length(nc) - 1, coalesce(trunc(public.sv_num(nd -> 'active')), 0)::int)) end,
      jsonb_build_object('gained', round(dW), 'credit', round(credit), 'allowed', round(total + use_), 'seconds', round(t)), soft);
    total := 0;
  end if;
  held := round(least(pend, total));
  wb := round(least((P ->> 'worth_cap')::numeric, total - held));

  select f2 ->> 'rule' into hard from jsonb_array_elements(fl) f2 where not (f2 ->> 'soft')::boolean limit 1;
  if mode = 'enforce' and hard is not null then return hard; end if; -- ทรานแซกชันถูกยกเลิกทั้งก้อน (ไม่อัปเดตถัง/รายการโอน)

  insert into public.save_verify_state (user_id, at, wb, held, chars) values (u, nowt, wb, held, schars)
  on conflict (user_id) do update set at = excluded.at, wb = excluded.wb, held = excluded.held, chars = excluded.chars;
  if array_length(consume, 1) > 0 then update public.transfer_ledger set consumed_at = nowt where id = any(consume); end if;
  for f in select x from jsonb_array_elements(fl) x loop
    -- ธงเดิมซ้ำภายใน 10 นาที (กติกาเดียวกัน ช่องเดียวกัน) ไม่จดซ้ำ — กันตารางบวมจากเซฟทุก 4 วิ
    if not exists (select 1 from public.cheat_flags cf where cf.user_id = u and cf.rule = f ->> 'rule' and cf.slot is not distinct from (f ->> 'slot')::int and cf.at > nowt - interval '10 minutes') then
      insert into public.cheat_flags (user_id, slot, rule, detail, mode) values (u, (f ->> 'slot')::int, f ->> 'rule', coalesce(f -> 'detail', '{}'::jsonb), mode);
    end if;
  end loop;
  return null;
end $$;
revoke all on function public.save_verify_eval(uuid, jsonb, jsonb, timestamptz) from public, anon;
grant execute on function public.save_verify_eval(uuid, jsonb, jsonb, timestamptz) to authenticated; -- trigger ทำงานในสิทธิ์ผู้เล่น (ฟังก์ชันกันเรียกตรงเอง)

-- ---------- trigger บนตาราง characters (ชื่อขึ้นต้น characters_v → ทำงานหลัง characters_session_guard) ----------
create or replace function public.is_banned(u uuid) returns text
language sql security definer set search_path = public stable as $$
  select coalesce(nullif(reason, ''), 'banned') from public.player_bans
  where user_id = u and (auth.uid() is null or u = auth.uid()) -- ผู้เล่นดูได้เฉพาะของตัวเอง
$$;
revoke all on function public.is_banned(uuid) from public, anon;
grant execute on function public.is_banned(uuid) to authenticated;

create or replace function public.characters_verify_save()
returns trigger
language plpgsql
set search_path = public
as $$
declare r text;
begin
  if current_user <> 'authenticated' then return new; end if;
  -- upsert = INSERT ... ON CONFLICT: trigger ฝั่ง INSERT ทำงานก่อนเสมอ → ถ้ามีแถวอยู่แล้ว ปล่อยให้ฝั่ง UPDATE ตรวจ (เทียบกับเซฟเดิมจริง)
  if tg_op = 'INSERT' and exists (select 1 from public.characters where user_id = new.user_id) then return new; end if;
  if public.is_banned(new.user_id) is not null then
    raise exception 'banned' using errcode = 'P0001', hint = 'This account has been blocked by the game owner.';
  end if;
  new.updated_at := now(); -- เวลาเซฟจากนาฬิกาเซิร์ฟเวอร์ (ไม่เชื่อเวลาจากเครื่องผู้เล่น)
  r := public.save_verify_eval(new.user_id, case when tg_op = 'UPDATE' then old.data else null end, new.data,
                               case when tg_op = 'UPDATE' then old.updated_at else null end);
  if r is not null then
    raise exception 'save_rejected:%', r using errcode = 'P0001', hint = 'The server rejected this save (see docs/SAVE_VERIFY.md).';
  end if;
  return new;
end $$;

drop trigger if exists characters_verify_save on public.characters;
create trigger characters_verify_save before insert or update on public.characters
  for each row execute function public.characters_verify_save();

-- ---------- บันทึกการโอน (เรียกจากเกม ทั้งสองฝ่าย) ----------
create or replace function public.sv_ledger_guard(u uuid, peer uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if u is null then raise exception 'not signed in'; end if;
  if peer is null or peer = u then raise exception 'bad peer'; end if;
  if public.is_banned(u) is not null then raise exception 'banned' using errcode = 'P0001'; end if;
  if (select count(*) from public.transfer_ledger where user_id = u and at > now() - interval '10 minutes') >= 120 then
    raise exception 'ledger_rate' using errcode = 'P0001';
  end if;
end $$;
revoke all on function public.sv_ledger_guard(uuid, uuid) from public, anon, authenticated;

-- ตลาดกลาง: ผู้ขายและผู้ซื้อเรียกด้วยค่าชุดเดียวกัน (price = ราคาต่อชิ้น) — เซิร์ฟเวอร์ดูว่าผู้เรียกเป็นฝ่ายไหน
create or replace function public.market_record(tid text, seller uuid, buyer uuid, item text, qty int, price bigint, cards text[] default '{}')
returns boolean
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_variable
declare u uuid := auth.uid(); peer uuid; w bigint; cost bigint; s text;
begin
  if u is distinct from seller and u is distinct from buyer then raise exception 'not a party to this sale'; end if;
  peer := case when u = seller then buyer else seller end;
  perform public.sv_ledger_guard(u, peer);
  if qty is null or qty < 1 or qty > 1000000 or price is null or price < 0 or price > 1000000000 then raise exception 'bad sale'; end if;
  if char_length(coalesce(item, '')) > 64 or coalesce(array_length(cards, 1), 0) > 4 then raise exception 'bad item'; end if;
  w := public.sv_items_worth(jsonb_build_array(jsonb_build_object('id', item, 'qty', qty, 'cards', to_jsonb(coalesce(cards, '{}'::text[])))));
  cost := price * qty;
  s := md5(concat_ws('|', 'market', seller, buyer, item, qty, price, array_to_string(coalesce(cards, '{}'), ',')));
  insert into public.transfer_ledger (kind, tid, user_id, peer_id, zin, zout, win, wout, sig, detail)
  values ('market', market_record.tid, u, peer,
          case when u = seller then cost else 0 end, case when u = buyer then cost else 0 end,
          case when u = buyer then w else 0 end, case when u = seller then w else 0 end, s,
          jsonb_build_object('item', item, 'qty', qty, 'price', price, 'role', case when u = seller then 'seller' else 'buyer' end))
  on conflict on constraint transfer_ledger_kind_tid_user_id_key do nothing;
  return exists (select 1 from public.transfer_ledger l where l.kind = 'market' and l.tid = market_record.tid and l.user_id = peer and l.peer_id = u and l.sig = s);
end $$;
revoke all on function public.market_record(text, uuid, uuid, text, int, bigint, text[]) from public, anon;
grant execute on function public.market_record(text, uuid, uuid, text, int, bigint, text[]) to authenticated;

-- แลกเปลี่ยน: gave / got = { zeny, items:[{ id, qty, cards }] } มุมมองของผู้เรียก • จับคู่ด้วยมูลค่า+Volt ของทั้งสองฝั่ง
create or replace function public.trade_record(tid text, peer uuid, gave jsonb, got jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_variable
declare u uuid := auth.uid(); zg bigint; zr bigint; wg bigint; wr bigint; s text;
begin
  perform public.sv_ledger_guard(u, peer);
  zg := greatest(0, least(1000000000000, coalesce(trunc(public.sv_num(gave -> 'zeny')), 0)))::bigint;
  zr := greatest(0, least(1000000000000, coalesce(trunc(public.sv_num(got -> 'zeny')), 0)))::bigint;
  if jsonb_array_length(case when jsonb_typeof(gave -> 'items') = 'array' then gave -> 'items' else '[]'::jsonb end) > 10
     or jsonb_array_length(case when jsonb_typeof(got -> 'items') = 'array' then got -> 'items' else '[]'::jsonb end) > 10 then raise exception 'bad trade'; end if;
  wg := public.sv_items_worth(gave -> 'items'); wr := public.sv_items_worth(got -> 'items');
  s := md5(case when u::text < peer::text then concat_ws('|', 'trade', u, zg, wg, peer, zr, wr) else concat_ws('|', 'trade', peer, zr, wr, u, zg, wg) end);
  insert into public.transfer_ledger (kind, tid, user_id, peer_id, zin, zout, win, wout, sig, detail)
  values ('trade', trade_record.tid, u, peer, zr, zg, wr, wg, s, jsonb_build_object('gave', gave, 'got', got))
  on conflict on constraint transfer_ledger_kind_tid_user_id_key do nothing;
  return exists (select 1 from public.transfer_ledger l where l.kind = 'trade' and l.tid = trade_record.tid and l.user_id = peer and l.peer_id = u and l.sig = s);
end $$;
revoke all on function public.trade_record(text, uuid, jsonb, jsonb) from public, anon;
grant execute on function public.trade_record(text, uuid, jsonb, jsonb) to authenticated;

-- เกมแจ้งว่าเซฟถูกปฏิเสธ (โหมด enforce ธงในทรานแซกชันที่ถูกยกเลิกหายไปด้วย — แถวนี้ทำให้เจ้าของเห็น) • จำกัด 1 ครั้ง/30 วิ
create or replace function public.save_verify_report(rule text, detail jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare u uuid := auth.uid();
begin
  if u is null then return; end if;
  if exists (select 1 from public.cheat_flags where user_id = u and cheat_flags.rule like 'rejected:%' and at > now() - interval '30 seconds') then return; end if;
  insert into public.cheat_flags (user_id, slot, rule, detail, mode, rejected)
  values (u, null, 'rejected:' || left(coalesce(rule, '?'), 40), coalesce(detail, '{}'::jsonb) - 'data', 'enforce', true);
end $$;
revoke all on function public.save_verify_report(text, jsonb) from public, anon;
grant execute on function public.save_verify_report(text, jsonb) to authenticated;

-- เหตุผลที่บัญชีตัวเองถูกปฏิเสธ (null = เล่นได้) — เกมเรียกตอนล็อกอินเพื่อขึ้นข้อความ
create or replace function public.my_ban()
returns text
language sql
security definer
set search_path = public
stable
as $$ select public.is_banned(auth.uid()) $$;
revoke all on function public.my_ban() from public, anon;
grant execute on function public.my_ban() to authenticated;

-- ---------- มุมมองสำหรับเจ้าของ (Studio / service role เท่านั้น) ----------
create or replace view public.cheat_flags_summary as
  select f.user_id, c.name, c.base_lv, c.job,
         count(*) as flags,
         count(*) filter (where f.at > now() - interval '24 hours') as flags_24h,
         count(*) filter (where f.rejected) as rejected,
         array_agg(distinct f.rule) as rules,
         min(f.at) as first_at, max(f.at) as last_at,
         exists (select 1 from public.player_bans b where b.user_id = f.user_id) as banned
  from public.cheat_flags f left join public.characters c on c.user_id = f.user_id
  group by f.user_id, c.name, c.base_lv, c.job;
revoke all on public.cheat_flags_summary from public, anon, authenticated;

-- ---------- เศรษฐกิจฝั่งเซิร์ฟเวอร์ (เหมือน migrations/20261012001000_economy.sql) — ต่อด้วย 20261012001100_economy_data.sql ----------
alter table public.save_verify_config add column if not exists econ boolean not null default true;
alter table public.save_verify_items add column if not exists price bigint not null default 0;
alter table public.save_verify_items add column if not exists shop boolean not null default false; -- ร้าน NPC ขาย

create sequence if not exists public.econ_uid_seq start with 1000000000000;
revoke all on sequence public.econ_uid_seq from public, anon, authenticated;

create table if not exists public.econ_events (
  id       bigint generated always as identity primary key,
  user_id  uuid not null references auth.users (id) on delete cascade,
  char_key text not null,
  seq      int not null,
  kind     text not null,
  delta    jsonb not null,
  ref      text,
  at       timestamptz not null default now(),
  unique (user_id, char_key, seq)
);
create index if not exists econ_events_ref_idx on public.econ_events (ref);
alter table public.econ_events enable row level security; -- อ่านผ่าน econ_pull เท่านั้น

create table if not exists public.econ_market_buys (
  tid        text primary key check (char_length(tid) between 4 and 64),
  buyer      uuid not null references auth.users (id) on delete cascade,
  seller     uuid not null references auth.users (id) on delete cascade,
  result     jsonb not null,
  at         timestamptz not null default now()
);
alter table public.econ_market_buys enable row level security;

create table if not exists public.econ_trades (
  tid        text primary key check (char_length(tid) between 4 and 64),
  a          uuid not null references auth.users (id) on delete cascade,
  b          uuid not null references auth.users (id) on delete cascade,
  a_char     text not null,
  b_char     text,
  a_gave     jsonb not null,
  a_got      jsonb not null,
  status     text not null default 'pending' check (status in ('pending', 'done', 'cancelled')),
  a_seq      int,
  b_seq      int,
  created_at timestamptz not null default now()
);
alter table public.econ_trades enable row level security;

-- ---------- ตัวช่วย ----------
create or replace function public.ec_key(n text) returns text language sql immutable as $$ select lower(trim(coalesce(n, ''))) $$;

-- ตำแหน่งตัวละครในก้อนบัญชี (0-based) หรือ null
create or replace function public.ec_idx(d jsonb, k text) returns int
language sql immutable as $$
  select (o - 1)::int from jsonb_array_elements(case when jsonb_typeof(d -> 'chars') = 'array' then d -> 'chars' else '[]'::jsonb end) with ordinality t(x, o)
  where public.ec_key(x ->> 'name') = k limit 1
$$;

-- ใส่ delta ให้ตัวละคร c • strict = ตรวจว่ามีเงิน/ของพอ (RPC) — ไม่ strict = ใส่เท่าที่ทำได้ (เติมให้เซฟที่ตามไม่ทัน)
--   delta = { zeny:+/-n, remove:[{uid}|{id,qty}], add:[อุปกรณ์ {id,qty:1,uid,refine,cards} | ของกอง {id,qty}], vend:<ทั้งก้อน|null>,
--             sale:{...} (ประวัติขาย), refine:{ slot, to } }
create or replace function public.ec_apply(c jsonb, delta jsonb, strict boolean) returns jsonb
language plpgsql immutable as $$
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
  return c;
end $$;

-- เขียน delta ลงตัวละครของผู้เล่น u (ต้องล็อกแถวแล้ว) + จดเหตุการณ์ • คืนเลขลำดับใหม่
create or replace function public.ec_commit(u uuid, k text, delta jsonb, kind text, ref text) returns int
language plpgsql security definer set search_path = public as $$
declare d jsonb; i int; c jsonb; s int;
begin
  select data into d from public.characters where user_id = u;
  i := public.ec_idx(d, k);
  if i is null then raise exception 'econ_no_char' using errcode = 'P0001'; end if;
  c := public.ec_apply(d -> 'chars' -> i, delta, true);
  s := coalesce(public.sv_num(c -> 'econSeq'), 0)::int + 1;
  c := jsonb_set(c, '{econSeq}', to_jsonb(s));
  update public.characters set data = jsonb_set(data, array['chars', i::text], c) where user_id = u;
  insert into public.econ_events (user_id, char_key, seq, kind, delta, ref) values (u, k, s, kind, delta, ref);
  return s;
end $$;
revoke all on function public.ec_commit(uuid, text, jsonb, text, text) from public, anon, authenticated;

-- เริ่ม RPC: ผู้เรียก / เปิดระบบอยู่ / ไม่ถูกแบน / ล็อกแถว + คืนตัวละคร
create or replace function public.ec_begin(k text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); d jsonb; i int;
begin
  if u is null then raise exception 'not signed in'; end if;
  if not coalesce((select econ from public.save_verify_config where id = 1), true) then raise exception 'econ_off' using errcode = 'P0001'; end if;
  if public.is_banned(u) is not null then raise exception 'banned' using errcode = 'P0001'; end if;
  select data into d from public.characters where user_id = u for update;
  i := public.ec_idx(d, k);
  if i is null then raise exception 'econ_no_char' using errcode = 'P0001'; end if;
  return d -> 'chars' -> i;
end $$;
revoke all on function public.ec_begin(text) from public, anon, authenticated;

create or replace function public.ec_uid() returns bigint language sql security definer set search_path = public as $$ select nextval('public.econ_uid_seq') $$;
revoke all on function public.ec_uid() from public, anon, authenticated;

create or replace function public.ec_result(s int, delta jsonb) returns jsonb language sql immutable as $$ select jsonb_build_object('seq', s, 'delta', delta) $$;

-- ---------- ร้าน NPC ----------
create or replace function public.econ_shop_buy(ch text, item text, qty int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text := public.ec_key(ch); c jsonb; it public.save_verify_items; add jsonb := '[]'::jsonb; d jsonb;
begin
  c := public.ec_begin(k);
  select * into it from public.save_verify_items where id = item and shop;
  if it.id is null then raise exception 'econ_not_sold' using errcode = 'P0001'; end if;
  if qty is null or qty < 1 or qty > (case when it.equip then 20 else 10000 end) then raise exception 'econ_bad_qty' using errcode = 'P0001'; end if;
  if it.equip then for n in 1..qty loop add := add || jsonb_build_array(jsonb_build_object('id', it.id, 'qty', 1, 'uid', public.ec_uid(), 'refine', 0, 'cards', '[]'::jsonb)); end loop;
  else add := jsonb_build_array(jsonb_build_object('id', it.id, 'qty', qty)); end if;
  d := jsonb_build_object('zeny', -(it.price * qty), 'add', add);
  return public.ec_result(public.ec_commit(auth.uid(), k, d, 'shop_buy', item), d);
end $$;

-- lines = [{ uid }] (อุปกรณ์) หรือ [{ id, qty }] (ของกอง) จากกระเป๋า • ราคาขาย = ราคา ÷ 2 (ปัดลง)
create or replace function public.econ_shop_sell(ch text, lines jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text := public.ec_key(ch); c jsonb; x jsonb; e jsonb; gain bigint := 0; rem jsonb := '[]'::jsonb; w bigint; d jsonb;
begin
  c := public.ec_begin(k);
  if jsonb_typeof(lines) <> 'array' or jsonb_array_length(lines) < 1 or jsonb_array_length(lines) > 200 then raise exception 'econ_bad_qty' using errcode = 'P0001'; end if;
  for x in select v from jsonb_array_elements(lines) v loop
    if x ? 'uid' then
      select v into e from jsonb_array_elements(case when jsonb_typeof(c -> 'inventory') = 'array' then c -> 'inventory' else '[]'::jsonb end) v where v ->> 'uid' = x ->> 'uid' limit 1;
      if e is null then raise exception 'econ_missing_item' using errcode = 'P0001'; end if;
      select coalesce(price, 0) / 2 into w from public.save_verify_items where id = e ->> 'id';
      gain := gain + coalesce(w, 0); rem := rem || jsonb_build_array(jsonb_build_object('uid', x -> 'uid'));
    else
      if public.sv_num(x -> 'qty') < 1 then raise exception 'econ_bad_qty' using errcode = 'P0001'; end if;
      select coalesce(price, 0) / 2 into w from public.save_verify_items where id = x ->> 'id';
      gain := gain + coalesce(w, 0) * trunc(public.sv_num(x -> 'qty'))::bigint;
      rem := rem || jsonb_build_array(jsonb_build_object('id', x ->> 'id', 'qty', trunc(public.sv_num(x -> 'qty'))));
    end if;
  end loop;
  d := jsonb_build_object('zeny', gain, 'remove', rem);
  return public.ec_result(public.ec_commit(auth.uid(), k, d, 'shop_sell', null), d);
end $$;

-- ---------- ตีบวก (ของที่สวมในช่อง slot) — สูตรเดียวกับ NPC.refineCalc / refineRun ใน js/npc.js ----------
create or replace function public.econ_refine(ch text, slot text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text := public.ec_key(ch); c jsonb; e jsonb; lv int; R jsonb; rate numeric; fee bigint; ore text; d jsonb; okk boolean;
begin
  c := public.ec_begin(k);
  if slot not in ('head', 'weapon', 'shield', 'armor', 'garment', 'shoes', 'acc', 'acc2') then raise exception 'econ_bad_slot' using errcode = 'P0001'; end if;
  e := c -> 'equip' -> slot;
  if jsonb_typeof(e) <> 'object' then raise exception 'econ_missing_item' using errcode = 'P0001'; end if;
  R := coalesce((select derived -> 'refine' from public.save_verify_config where id = 1), '{}'::jsonb);
  lv := coalesce(trunc(public.sv_num(e -> 'refine')), 0)::int;
  if lv >= 10 then raise exception 'econ_maxed' using errcode = 'P0001'; end if;
  rate := coalesce((R -> 'rate' ->> lv)::numeric, (array[1, 1, 1, 1, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1])[lv + 1]);
  fee := (case when slot = 'weapon' then coalesce((R ->> 'weapon_fee')::bigint, 250) else coalesce((R ->> 'armor_fee')::bigint, 400) end) * (lv + 1);
  ore := case when lv >= coalesce((R ->> 'ore_from')::int, 4) then (case when slot = 'weapon' then coalesce(R -> 'ore' ->> 'weapon', 'rune_alloy') else coalesce(R -> 'ore' ->> 'armor', 'volt_ore') end) end;
  okk := random() < rate;
  d := jsonb_build_object('zeny', -fee, 'remove', case when ore is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object('id', ore, 'qty', 1)) end, 'ok', okk);
  if okk then d := d || jsonb_build_object('refine', jsonb_build_object('slot', slot, 'to', lv + 1)); end if;
  return public.ec_result(public.ec_commit(auth.uid(), k, d, 'refine', slot), d);
end $$;

-- ---------- ตลาดกลาง ----------
create or replace function public.ec_vend(c jsonb) returns jsonb language sql immutable as $$
  select case when jsonb_typeof(c -> 'vend') = 'object' and jsonb_typeof(c -> 'vend' -> 'items') = 'array' then c -> 'vend'
              else jsonb_build_object('v', 2, 'sid', md5(random()::text), 'items', '[]'::jsonb, 'earned', 0, 'at', (extract(epoch from now()) * 1000)::bigint) end
$$;

-- วางขาย: line = { uid } (อุปกรณ์) หรือ { id, qty } • ราคาเท่ากันชนิดเดียวกัน = รวมรายการ • สูงสุด 12 รายการ
create or replace function public.econ_market_list(ch text, line jsonb, price bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text := public.ec_key(ch); c jsonb; v jsonb; e jsonb; items jsonb; ni jsonb; slot int; same int; qty bigint; d jsonb;
begin
  c := public.ec_begin(k);
  if price is null or price < 1 or price > 1000000000 then raise exception 'econ_bad_price' using errcode = 'P0001'; end if;
  v := public.ec_vend(c);
  items := coalesce((select jsonb_agg(x order by o) from jsonb_array_elements(v -> 'items') with ordinality t(x, o) where public.sv_num(x -> 'qty') > 0), '[]'::jsonb);
  if line ? 'uid' then
    select x into e from jsonb_array_elements(case when jsonb_typeof(c -> 'inventory') = 'array' then c -> 'inventory' else '[]'::jsonb end) x where x ->> 'uid' = line ->> 'uid' limit 1;
    if e is null then raise exception 'econ_missing_item' using errcode = 'P0001'; end if;
    qty := 1;
  else
    qty := trunc(public.sv_num(line -> 'qty'));
    if qty < 1 or not exists (select 1 from public.save_verify_items where id = line ->> 'id') then raise exception 'econ_bad_qty' using errcode = 'P0001'; end if;
    select (o - 1)::int into same from jsonb_array_elements(items) with ordinality t(x, o) where x ->> 'id' = line ->> 'id' and not (x ? 'uid') and (x ->> 'price')::bigint = price limit 1;
  end if;
  if same is not null then
    items := jsonb_set(items, array[same::text, 'qty'], to_jsonb(public.sv_num(items -> same -> 'qty')::bigint + qty));
  else
    if jsonb_array_length(items) >= 12 then raise exception 'econ_market_full' using errcode = 'P0001'; end if;
    select min(s) into slot from generate_series(0, 11) s where not exists (select 1 from jsonb_array_elements(items) x where (x ->> 'i')::int = s);
    ni := case when line ? 'uid' then jsonb_build_object('i', slot, 'id', e ->> 'id', 'qty', 1, 'price', price, 'uid', e -> 'uid', 'refine', coalesce(e -> 'refine', '0'::jsonb), 'cards', coalesce(e -> 'cards', '[]'::jsonb))
               else jsonb_build_object('i', slot, 'id', line ->> 'id', 'qty', qty, 'price', price) end;
    items := items || jsonb_build_array(ni);
  end if;
  v := jsonb_set(v, '{items}', items);
  d := jsonb_build_object('remove', jsonb_build_array(case when line ? 'uid' then jsonb_build_object('uid', line -> 'uid') else jsonb_build_object('id', line ->> 'id', 'qty', qty) end), 'vend', v);
  return public.ec_result(public.ec_commit(auth.uid(), k, d, 'market_list', null), d);
end $$;

create or replace function public.econ_market_cancel(ch text, i int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text := public.ec_key(ch); c jsonb; v jsonb; x jsonb; rest jsonb; d jsonb;
begin
  c := public.ec_begin(k);
  v := public.ec_vend(c);
  select y into x from jsonb_array_elements(v -> 'items') y where (y ->> 'i')::int = i and public.sv_num(y -> 'qty') > 0 limit 1;
  if x is null then raise exception 'econ_no_listing' using errcode = 'P0001'; end if;
  rest := coalesce((select jsonb_agg(y order by o) from jsonb_array_elements(v -> 'items') with ordinality t(y, o) where (y ->> 'i')::int <> i), '[]'::jsonb);
  d := jsonb_build_object('add', jsonb_build_array(case when x ? 'uid' then jsonb_build_object('id', x ->> 'id', 'qty', 1, 'uid', x -> 'uid', 'refine', coalesce(x -> 'refine', '0'::jsonb), 'cards', coalesce(x -> 'cards', '[]'::jsonb))
                                                   else jsonb_build_object('id', x ->> 'id', 'qty', x -> 'qty') end),
                          'vend', case when exists (select 1 from jsonb_array_elements(rest) y where public.sv_num(y -> 'qty') > 0) then jsonb_set(v, '{items}', rest) else 'null'::jsonb end);
  return public.ec_result(public.ec_commit(auth.uid(), k, d, 'market_cancel', null), d);
end $$;

create or replace function public.econ_market_price(ch text, i int, price bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text := public.ec_key(ch); c jsonb; v jsonb; n int; d jsonb;
begin
  c := public.ec_begin(k);
  if price is null or price < 1 or price > 1000000000 then raise exception 'econ_bad_price' using errcode = 'P0001'; end if;
  v := public.ec_vend(c);
  select (o - 1)::int into n from jsonb_array_elements(v -> 'items') with ordinality t(y, o) where (y ->> 'i')::int = i and public.sv_num(y -> 'qty') > 0 limit 1;
  if n is null then raise exception 'econ_no_listing' using errcode = 'P0001'; end if;
  v := jsonb_set(v, array['items', n::text, 'price'], to_jsonb(price));
  d := jsonb_build_object('vend', v);
  return public.ec_result(public.ec_commit(auth.uid(), k, d, 'market_price', null), d);
end $$;

-- ซื้อ: ผู้ซื้อเรียก • ตรวจรายการในเซฟผู้ขายบนเซิร์ฟเวอร์ (ราคา/จำนวน) → หักเงินผู้ซื้อ + โอนของ (uid ใหม่) + จ่ายผู้ขาย ในทรานแซกชันเดียว
-- tid ซ้ำ = คืนผลเดิม (กดซ้ำ/เน็ตสะดุด ไม่ซื้อซ้ำ)
create or replace function public.econ_market_buy(tid text, seller uuid, seller_char text, i int, qty int, price bigint, buyer_char text) returns jsonb
language plpgsql security definer set search_path = public as $$
#variable_conflict use_variable
declare u uuid := auth.uid(); bk text := public.ec_key(buyer_char); sk text := public.ec_key(seller_char);
  prev jsonb; sd jsonb; si int; sc jsonb; v jsonb; n int; x jsonb; cost bigint; gain bigint; bd jsonb; sdl jsonb; bs int; ss int; res jsonb; bname text;
begin
  select result into prev from public.econ_market_buys b where b.tid = econ_market_buy.tid and b.buyer = u;
  if prev is not null then return prev; end if;
  if seller is null or seller = u then raise exception 'econ_bad_peer' using errcode = 'P0001'; end if;
  if qty is null or qty < 1 then raise exception 'econ_bad_qty' using errcode = 'P0001'; end if;
  -- ล็อกสองแถวเรียงตาม user_id (กัน deadlock)
  perform 1 from public.characters where user_id in (u, seller) order by user_id for update;
  bname := (public.ec_begin(bk)) ->> 'name';
  if public.is_banned(seller) is not null then raise exception 'econ_seller_banned' using errcode = 'P0001'; end if;
  select data into sd from public.characters where user_id = seller;
  si := public.ec_idx(sd, sk);
  if si is null then raise exception 'econ_no_listing' using errcode = 'P0001'; end if;
  sc := sd -> 'chars' -> si; v := public.ec_vend(sc);
  select (o - 1)::int, y into n, x from jsonb_array_elements(v -> 'items') with ordinality t(y, o) where (y ->> 'i')::int = i limit 1;
  if x is null or public.sv_num(x -> 'qty') <= 0 then raise exception 'econ_soldout' using errcode = 'P0001'; end if;
  if (x ->> 'price')::bigint <> price then raise exception 'econ_changed' using errcode = 'P0001'; end if;
  if public.sv_num(x -> 'qty') < qty or (x ? 'uid' and qty <> 1) then raise exception 'econ_stock' using errcode = 'P0001'; end if;
  cost := price * qty; gain := cost; -- ภาษีตลาด = 0 (MARKET_TAX ใน js/market.js)
  v := jsonb_set(v, array['items', n::text, 'qty'], to_jsonb(public.sv_num(x -> 'qty')::bigint - qty));
  if public.sv_num(x -> 'qty') - qty <= 0 then v := jsonb_set(v, array['items', n::text, 'soldAt'], to_jsonb((extract(epoch from now()) * 1000)::bigint)); end if;
  v := jsonb_set(v, '{earned}', to_jsonb(coalesce(public.sv_num(v -> 'earned'), 0)::bigint + gain));
  bd := jsonb_build_object('zeny', -cost, 'add', jsonb_build_array(case when x ? 'uid'
          then jsonb_build_object('id', x ->> 'id', 'qty', 1, 'uid', public.ec_uid(), 'refine', coalesce(x -> 'refine', '0'::jsonb), 'cards', coalesce(x -> 'cards', '[]'::jsonb))
          else jsonb_build_object('id', x ->> 'id', 'qty', qty) end));
  bs := public.ec_commit(u, bk, bd, 'market_buy', tid); -- เงินไม่พอ = ยกเลิกทั้งหมด
  sdl := jsonb_build_object('zeny', gain, 'vend', v, 'sale', jsonb_build_object('who', left(coalesce(bname, '?'), 24), 'id', x ->> 'id', 'qty', qty, 'gain', gain, 'refine', coalesce(x -> 'refine', '0'::jsonb), 'at', (extract(epoch from now()) * 1000)::bigint, 'i', i));
  ss := public.ec_commit(seller, sk, sdl, 'market_sale', tid);
  res := public.ec_result(bs, bd) || jsonb_build_object('seller_seq', ss);
  insert into public.econ_market_buys (tid, buyer, seller, result) values (tid, u, seller, res);
  return res;
end $$;

-- ---------- แลกเปลี่ยน ----------
-- ข้อเสนอ { zeny, items:[{ uid } | { id, qty }] } → รูปมาตรฐาน (เรียง) ไว้เทียบสองฝั่ง
create or replace function public.ec_canon(o jsonb) returns jsonb language sql immutable as $$
  select jsonb_build_object('zeny', greatest(0, trunc(public.sv_num(o -> 'zeny')))::bigint,
    'items', coalesce((select jsonb_agg(case when x ? 'uid' then jsonb_build_object('uid', public.sv_num(x -> 'uid')) else jsonb_build_object('id', x ->> 'id', 'qty', trunc(public.sv_num(x -> 'qty'))) end
                        order by coalesce(x ->> 'uid', ''), x ->> 'id', public.sv_num(x -> 'qty'))
                       from jsonb_array_elements(case when jsonb_typeof(o -> 'items') = 'array' then o -> 'items' else '[]'::jsonb end) x where jsonb_typeof(x) = 'object'), '[]'::jsonb))
$$;
-- ของที่ตัวละคร c ให้ไปตามข้อเสนอ → (remove ของผู้ให้, add ของผู้รับ — อุปกรณ์ได้ uid ใหม่ ค่าตีบวก/ชิปตามของจริงบนเซิร์ฟเวอร์)
create or replace function public.ec_give(c jsonb, offer jsonb, out rem jsonb, out addl jsonb)
language plpgsql security definer set search_path = public as $$
declare x jsonb; e jsonb;
begin
  rem := '[]'::jsonb; addl := '[]'::jsonb;
  for x in select v from jsonb_array_elements(offer -> 'items') v loop
    if x ? 'uid' then
      select v into e from jsonb_array_elements(case when jsonb_typeof(c -> 'inventory') = 'array' then c -> 'inventory' else '[]'::jsonb end) v where public.sv_num(v -> 'uid') = public.sv_num(x -> 'uid') limit 1;
      if e is null then raise exception 'econ_missing_item' using errcode = 'P0001'; end if;
      rem := rem || jsonb_build_array(jsonb_build_object('uid', e -> 'uid'));
      addl := addl || jsonb_build_array(jsonb_build_object('id', e ->> 'id', 'qty', 1, 'uid', public.ec_uid(), 'refine', coalesce(e -> 'refine', '0'::jsonb), 'cards', coalesce(e -> 'cards', '[]'::jsonb)));
    else
      if public.sv_num(x -> 'qty') < 1 then raise exception 'econ_bad_qty' using errcode = 'P0001'; end if;
      rem := rem || jsonb_build_array(x); addl := addl || jsonb_build_array(x);
    end if;
  end loop;
end $$;
revoke all on function public.ec_give(jsonb, jsonb) from public, anon, authenticated;

-- ทั้งสองฝ่ายเรียกด้วย tid เดียวกัน (gave/got มุมมองของผู้เรียก) • ฝ่ายแรก = รอ • ฝ่ายที่สอง (ข้อเสนอตรงกัน) = สลับของทันที
-- ฝ่ายแรกเรียกซ้ำ/econ_pull ภายหลังเพื่อรับผล • ไม่ตรงกัน/หมดเวลา 2 นาที = ยกเลิก
create or replace function public.econ_trade(tid text, peer uuid, my_char text, gave jsonb, got jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
#variable_conflict use_variable
declare u uuid := auth.uid(); k text := public.ec_key(my_char); t public.econ_trades; ca jsonb; cb jsonb; ga record; gb record; da jsonb; db jsonb; sa int; sb int;
begin
  if peer is null or peer = u then raise exception 'econ_bad_peer' using errcode = 'P0001'; end if;
  perform public.ec_begin(k); -- ตรวจผู้เรียก/แบน/ตัวละคร
  gave := public.ec_canon(gave); got := public.ec_canon(got);
  if jsonb_array_length(gave -> 'items') > 10 or jsonb_array_length(got -> 'items') > 10 then raise exception 'econ_bad_qty' using errcode = 'P0001'; end if;
  select * into t from public.econ_trades x where x.tid = econ_trade.tid for update;
  if t.tid is null then
    insert into public.econ_trades (tid, a, b, a_char, a_gave, a_got) values (tid, u, peer, k, gave, got);
    return jsonb_build_object('status', 'pending');
  end if;
  if t.status = 'done' then
    if u = t.a then return jsonb_build_object('status', 'done') || public.ec_result(t.a_seq, (select delta from public.econ_events where user_id = u and char_key = t.a_char and seq = t.a_seq));
    elsif u = t.b then return jsonb_build_object('status', 'done') || public.ec_result(t.b_seq, (select delta from public.econ_events where user_id = u and char_key = t.b_char and seq = t.b_seq)); end if;
  end if;
  if t.status = 'cancelled' then return jsonb_build_object('status', 'cancelled'); end if;
  if u = t.a then return jsonb_build_object('status', 'pending'); end if;
  if u <> t.b or peer <> t.a then raise exception 'econ_bad_peer' using errcode = 'P0001'; end if;
  if t.created_at < now() - interval '2 minutes' or gave <> t.a_got or got <> t.a_gave then
    update public.econ_trades x set status = 'cancelled' where x.tid = t.tid;
    return jsonb_build_object('status', 'cancelled', 'why', case when t.created_at < now() - interval '2 minutes' then 'timeout' else 'mismatch' end);
  end if;
  perform 1 from public.characters where user_id in (t.a, t.b) order by user_id for update;
  select d -> 'chars' -> public.ec_idx(d, t.a_char) into ca from (select data as d from public.characters where user_id = t.a) s;
  select d -> 'chars' -> public.ec_idx(d, k) into cb from (select data as d from public.characters where user_id = u) s;
  if ca is null or cb is null then raise exception 'econ_no_char' using errcode = 'P0001'; end if;
  select * into ga from public.ec_give(ca, t.a_gave);
  select * into gb from public.ec_give(cb, gave);
  da := jsonb_build_object('zeny', public.sv_num(gave -> 'zeny') - public.sv_num(t.a_gave -> 'zeny'), 'remove', ga.rem, 'add', gb.addl);
  db := jsonb_build_object('zeny', public.sv_num(t.a_gave -> 'zeny') - public.sv_num(gave -> 'zeny'), 'remove', gb.rem, 'add', ga.addl);
  -- Volt ต้องพอทั้งสองฝ่าย (ตรวจก่อนหักสุทธิ — กันการให้ Volt เกินที่มีแล้วได้คืนจากอีกฝ่าย)
  if public.sv_num(ca -> 'zeny') < public.sv_num(t.a_gave -> 'zeny') or public.sv_num(cb -> 'zeny') < public.sv_num(gave -> 'zeny') then raise exception 'econ_no_zeny' using errcode = 'P0001'; end if;
  sa := public.ec_commit(t.a, t.a_char, da, 'trade', tid);
  sb := public.ec_commit(u, k, db, 'trade', tid);
  update public.econ_trades x set status = 'done', b_char = k, a_seq = sa, b_seq = sb where x.tid = t.tid;
  return jsonb_build_object('status', 'done') || public.ec_result(sb, db);
end $$;

create or replace function public.econ_trade_cancel(tid text) returns void
language plpgsql security definer set search_path = public as $$
#variable_conflict use_variable
begin
  update public.econ_trades x set status = 'cancelled' where x.tid = econ_trade_cancel.tid and x.status = 'pending' and auth.uid() in (x.a, x.b);
end $$;

-- รายการที่เซิร์ฟเวอร์ทำกับตัวละครเรา หลังลำดับ since (สูงสุด 200)
create or replace function public.econ_pull(ch text, since int) returns jsonb
language sql security definer set search_path = public stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('seq', seq, 'kind', kind, 'delta', delta, 'ref', ref) order by seq), '[]'::jsonb)
  from (select * from public.econ_events where user_id = auth.uid() and char_key = public.ec_key(ch) and seq > coalesce(since, 0) order by seq limit 200) e
$$;

do $$
declare f text;
begin
  foreach f in array array['econ_shop_buy(text, text, int)', 'econ_shop_sell(text, jsonb)', 'econ_refine(text, text)', 'econ_market_list(text, jsonb, bigint)',
    'econ_market_cancel(text, int)', 'econ_market_price(text, int, bigint)', 'econ_market_buy(text, uuid, text, int, int, bigint, text)',
    'econ_trade(text, uuid, text, jsonb, jsonb)', 'econ_trade_cancel(text)', 'econ_pull(text, int)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  foreach f in array array['ec_begin(text)', 'ec_vend(jsonb)', 'ec_canon(jsonb)', 'ec_apply(jsonb, jsonb, boolean)', 'ec_idx(jsonb, text)', 'ec_result(int, jsonb)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;

-- ---------- เซฟจากเกมที่ยังตามรายการเซิร์ฟเวอร์ไม่ทัน → เติมให้ก่อนบันทึก (trigger ทำงานก่อน session guard / ตรวจเซฟ) ----------
create or replace function public.econ_merge_save(u uuid, od jsonb, nd jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  oc jsonb; c jsonb; o jsonb; k text; idx int := -1; sv int; cv int; ev record; gone jsonb; dup jsonb; mode text; e jsonb; where_ text; arr jsonb;
begin
  if pg_trigger_depth() < 1 then raise exception 'econ_merge_save is internal'; end if;
  if auth.uid() is not null and u is distinct from auth.uid() then raise exception 'not your account'; end if;
  if jsonb_typeof(nd -> 'chars') <> 'array' then return nd; end if;
  oc := public.sv_chars(od);
  mode := coalesce((select save_verify_config.mode from public.save_verify_config where id = 1), 'log');
  for c in select x from jsonb_array_elements(nd -> 'chars') x loop
    idx := idx + 1;
    if jsonb_typeof(c) <> 'object' then continue; end if;
    k := public.ec_key(c ->> 'name');
    select x into o from jsonb_array_elements(oc) x where public.ec_key(x ->> 'name') = k limit 1;
    if o is null or (o -> 'econSeq') is null then continue; end if; -- ตัวละครที่ยังไม่เคยใช้ระบบเศรษฐกิจเซิร์ฟเวอร์
    sv := trunc(public.sv_num(o -> 'econSeq'))::int; cv := trunc(public.sv_num(c -> 'econSeq'))::int;
    if cv > sv then cv := sv; end if; -- เลขที่เกมอ้างเกินของจริง = ไม่เชื่อ
    for ev in select delta from public.econ_events where user_id = u and char_key = k and seq > cv and seq <= sv order by seq loop
      c := public.ec_apply(c, ev.delta, false);
    end loop;
    c := jsonb_set(c, '{econSeq}', to_jsonb(sv));
    c := c || jsonb_build_object('vend', coalesce(o -> 'vend', 'null'::jsonb)); -- รายการขายเป็นของเซิร์ฟเวอร์
    -- อุปกรณ์ที่ออกไปทางเซิร์ฟเวอร์ (ขาย/วางตลาด/แลก) และไม่ได้กลับมา แต่ยังอยู่ในเซฟ = ของปั๊ม
    select coalesce(jsonb_agg(distinct r -> 'uid'), '[]'::jsonb) into gone
    from public.econ_events e, jsonb_array_elements(case when jsonb_typeof(e.delta -> 'remove') = 'array' then e.delta -> 'remove' else '[]'::jsonb end) r
    where e.user_id = u and e.char_key = k and r ? 'uid'
      and not exists (select 1 from public.econ_events e2, jsonb_array_elements(case when jsonb_typeof(e2.delta -> 'add') = 'array' then e2.delta -> 'add' else '[]'::jsonb end) a
                      where e2.user_id = u and e2.char_key = k and e2.seq > e.seq and a -> 'uid' = r -> 'uid')
      and not exists (select 1 from jsonb_array_elements(case when jsonb_typeof(o -> 'vend' -> 'items') = 'array' then o -> 'vend' -> 'items' else '[]'::jsonb end) vi
                      where vi -> 'uid' = r -> 'uid' and public.sv_num(vi -> 'qty') > 0);
    select coalesce(jsonb_agg(en.e -> 'uid'), '[]'::jsonb) into dup from public.sv_entries(c) en where en.w <> 'vend' and en.e -> 'uid' is not null and gone @> jsonb_build_array(en.e -> 'uid');
    if jsonb_array_length(dup) > 0 then
      if not exists (select 1 from public.cheat_flags cf where cf.user_id = u and cf.rule = 'dup_item' and cf.at > now() - interval '10 minutes') then
        insert into public.cheat_flags (user_id, slot, rule, detail, mode) values (u, idx, 'dup_item', jsonb_build_object('name', left(c ->> 'name', 24), 'uids', dup), mode);
      end if;
      if mode = 'enforce' then -- ตัดของปั๊มออกจากกระเป๋า/คลัง/ที่สวม
        foreach where_ in array array['inventory', 'storage'] loop
          if jsonb_typeof(c -> where_) = 'array' then
            select coalesce(jsonb_agg(x order by ord), '[]'::jsonb) into arr from jsonb_array_elements(c -> where_) with ordinality t(x, ord) where not (dup @> jsonb_build_array(x -> 'uid'));
            c := jsonb_set(c, array[where_], arr);
          end if;
        end loop;
        if jsonb_typeof(c -> 'equip') = 'object' then
          for e in select jsonb_build_object('k', key, 'v', value) from jsonb_each(c -> 'equip') loop
            if dup @> jsonb_build_array(e -> 'v' -> 'uid') then c := jsonb_set(c, array['equip', e ->> 'k'], 'null'::jsonb); end if;
          end loop;
        end if;
      end if;
    end if;
    nd := jsonb_set(nd, array['chars', idx::text], c);
  end loop;
  return nd;
end $$;
revoke all on function public.econ_merge_save(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.econ_merge_save(uuid, jsonb, jsonb) to authenticated; -- trigger ทำงานในสิทธิ์ผู้เล่น (ฟังก์ชันกันเรียกตรงเอง)

create or replace function public.characters_econ_merge()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user <> 'authenticated' or tg_op <> 'UPDATE' then return new; end if;
  new.data := public.econ_merge_save(new.user_id, old.data, new.data);
  return new;
end $$;

drop trigger if exists characters_econ_merge on public.characters;
create trigger characters_econ_merge before update on public.characters
  for each row execute function public.characters_econ_merge();

-- ---------- เก็บกวาด (เรียกเองใน Studio หรือตั้ง pg_cron วันละครั้ง) — เก็บ 30 วันล่าสุด แต่ไม่ลบ 50 รายการท้ายของแต่ละตัวละคร ----------
create or replace function public.econ_trim(keep_days int default 30) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from public.econ_events e where e.at < now() - make_interval(days => keep_days)
    and e.seq <= (select max(seq) - 50 from public.econ_events e2 where e2.user_id = e.user_id and e2.char_key = e.char_key);
  get diagnostics n = row_count;
  delete from public.econ_trades where created_at < now() - make_interval(days => keep_days);
  delete from public.econ_market_buys where at < now() - make_interval(days => keep_days);
  return n;
end $$;
revoke all on function public.econ_trim(int) from public, anon, authenticated;

-- ---------- โซ่บันทึกการเล่น + ดรอป/EXP ฝั่งเซิร์ฟเวอร์ (เหมือน migrations/20261012002000_event_chain.sql) — ต่อด้วย 20261012002100_event_chain_data.sql ----------
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
-- lv = เลเวลสูงสุดที่โซ่อ้างถึงแล้ว (หมุดเริ่มต้น = เลเวลในเซฟตอนเริ่ม) — เลเวลในเกมไม่มีวันลด การฆ่าถัดไปจึงอ้างต่ำกว่านี้ไม่ได้
alter table public.event_anchors add column if not exists lv int not null default 0;
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
    insert into public.event_anchors (user_id, char_key, seq, head, mac, lv) values (u, k, 0, h, public.ch_hmac(public.ch_secret(), concat_ws('|', u, k, 0, h)),
      coalesce((select greatest(1, trunc(public.sv_num(d -> 'chars' -> public.ec_idx(d, k) -> 'baseLv')))::int from (select data as d from public.characters where user_id = u) s), 1))
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
  g jsonb; chance numeric; gap int; sigw int := 0; slv int; cl int; flv int; mlv int; eb_ numeric; ej_ numeric; vb numeric := 0; vj numeric := 0; mm int := 0; mmd jsonb := null;
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
  -- 2b) EXP ที่เกมบวกเองตอนฆ่า (a[5] base, a[6] job) ต้องตรงกับสูตรของเซิร์ฟเวอร์
  --     เลเวลที่อ้าง (a[2]) ไม่ลดลง: ไม่ต่ำกว่าเลเวลสูงสุดที่โซ่อ้างแล้ว (หมุด) และไม่ลดภายในชุด
  --     (ไม่เทียบกับเลเวลในเซฟตรง ๆ — เซฟหลังเลเวลอัปอาจถึงก่อนชุดที่มีการฆ่าก่อนเลเวลอัป)
  slv := greatest(1, coalesce(trunc(public.sv_num(c -> 'baseLv')), 1))::int;
  flv := coalesce(a.lv, 0); mlv := flv;
  for e in select x from jsonb_array_elements(entries) x where x ->> 'k' = 'kill' loop
    select * into m from public.sv_mobs where id = e -> 'a' ->> 0;
    if m.id is null then continue; end if;
    cl := greatest(1, least(99, coalesce(trunc(public.sv_num(e -> 'a' -> 2)), 1)))::int;
    party := least(5, greatest(0, coalesce(trunc(public.sv_num(e -> 'a' -> 3)), 0)))::int;
    kf := (1 + 0.15 * party) / (party + 1);
    em := public.ch_exp_mul(m.lv, cl);
    eb_ := round(greatest(1, round(m.exp * em)) * kf); ej_ := round(greatest(1, round(m.jexp * em)) * kf);
    if cl < mlv or abs(public.sv_num(e -> 'a' -> 5) - eb_) > 1 or abs(public.sv_num(e -> 'a' -> 6) - ej_) > 1 then
      mm := mm + 1;
      if mmd is null then mmd := jsonb_build_object('mob', m.id, 'lv', cl, 'saved_lv', slv, 'claimed', jsonb_build_array(e -> 'a' -> 5, e -> 'a' -> 6), 'expected', jsonb_build_array(eb_, ej_), 'floor_lv', mlv); end if;
    end if;
    mlv := greatest(mlv, cl);
    -- เครดิตเฉพาะส่วนที่ตรวจได้ (ไม่เกินที่สูตรให้) → ตรวจเซฟใช้ก่อนถังอัตรา
    vb := vb + least(greatest(0, public.sv_num(e -> 'a' -> 5)), eb_); vj := vj + least(greatest(0, public.sv_num(e -> 'a' -> 6)), ej_);
  end loop;
  if mm > 0 then
    perform public.ch_flag(u, 'exp_mismatch', mmd || jsonb_build_object('count', mm));
    if bad is null then bad := 'exp_mismatch'; badd := mmd; end if;
  end if;
  if bad is not null then
    perform public.ch_flag(u, bad, badd);
    if mode = 'enforce' then
      insert into public.event_log (user_id, char_key, anchor_id, from_seq, to_seq, entries, status) values (u, k, a.id, a.seq + 1, s, entries, bad);
      return jsonb_build_object('status', 'rejected', 'rule', bad, 'anchor', public.ch_anchor_json(a));
    end if;
  end if;

  -- 3) เซิร์ฟเวอร์ทอยของ/Volt เอง (EXP เกมบวกเองตอนฆ่าแล้ว — ไม่ให้ซ้ำ)
  g := coalesce((select derived -> 'gacha' from public.save_verify_config where id = 1), '{}'::jsonb);
  for e in select x from jsonb_array_elements(entries) x where x ->> 'k' = 'kill' loop
    select * into m from public.sv_mobs where id = e -> 'a' ->> 0;
    if m.id is null then continue; end if;
    lv := greatest(1, least(99, coalesce(trunc(public.sv_num(e -> 'a' -> 2)), 1)))::int; -- เลเวลตอนฆ่า (ตรวจแล้วข้างบน) — ใช้คิดโอกาสตรากาชา
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
  end loop;
  delta := jsonb_build_object('zeny', zeny, 'add', add, 'chips', chips, 'kills', nk, 'verified', jsonb_build_object('b', vb, 'j', vj));
  -- เครดิต EXP ที่ตรวจแล้วให้ตัวตรวจเซฟ (save_verify_state.chars.<ตัว>.vb / vj)
  insert into public.save_verify_state (user_id, at, wb, held, chars)
    values (u, coalesce((select updated_at from public.characters where user_id = u), now()), (P ->> 'worth_cap')::numeric, 0, jsonb_build_object(k, jsonb_build_object('vb', vb, 'vj', vj)))
  on conflict (user_id) do update set chars = public.save_verify_state.chars || jsonb_build_object(k, coalesce(public.save_verify_state.chars -> k, '{}'::jsonb)
    || jsonb_build_object('vb', coalesce((public.save_verify_state.chars -> k ->> 'vb')::numeric, 0) + vb, 'vj', coalesce((public.save_verify_state.chars -> k ->> 'vj')::numeric, 0) + vj));

  -- 4) บันทึก + หมุดใหม่
  insert into public.event_log (user_id, char_key, anchor_id, from_seq, to_seq, entries, status) values (u, k, a.id, a.seq + 1, s, entries, 'ok') returning id into lid; -- โหมด log: รับไว้แม้มีธง
  insert into public.event_anchors (user_id, char_key, seq, head, mac, n, lv)
    values (u, k, s, prev, public.ch_hmac(public.ch_secret(), concat_ws('|', u, k, s, prev)), bn, greatest(mlv, flv)) returning * into na;
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

-- ---------- ตรวจเซฟ (แทนฉบับระยะ 0): EXP ที่ submit_events ตรวจกับการฆ่าแล้ว (chars.<ตัว>.vb / vj) ใช้ก่อนถังอัตรา ----------
-- ระยะ 2: เกมบวก EXP เองทันทีตอนฆ่า (ไม่หน่วง) แต่ทุกการฆ่าในโซ่บอก EXP ที่ได้ → เซิร์ฟเวอร์คำนวณซ้ำ ตรงกัน = เครดิต vb/vj
-- เซฟที่ EXP เพิ่มตามการฆ่าที่ตรวจแล้วจึงไม่กินถัง · ส่วนที่เกิน (เควสต์/รายวัน/ส่วนแบ่งปาร์ตี้) ยังคุมด้วยถังอัตราเดิม
create or replace function public.save_verify_eval(u uuid, od jsonb, nd jsonb, old_at timestamptz)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg public.save_verify_config; st public.save_verify_state; P jsonb; soft text[]; mode text;
  nowt timestamptz := now(); t numeric; fl jsonb := '[]'::jsonb;
  nc jsonb := public.sv_chars(nd); oc jsonb := public.sv_chars(od);
  c jsonb; o jsonb; k text; nm text; slot int := -1; jb_row public.save_verify_jobs; ojb public.save_verify_jobs;
  lv int; ol int; jl int; L int; pts numeric; spent int; have int;
  en record; it public.save_verify_items; unk jsonb; qbad jsonb; rbad jsonb; cbad jsonb; dupu jsonb; uids bigint[]; q numeric; cd text;
  exp_rate numeric; jexp_rate numeric; worth_rate numeric; capE numeric; capJ numeric;
  prev jsonb; eb numeric; jbk numeric; vb numeric; vj numeric; uv numeric; lb numeric; dE numeric; dJ numeric; dL int; schars jsonb := '{}'::jsonb;
  fresh int := 0; impw numeric := 0; acct_imp boolean; imported boolean;
  w0 numeric := 0; w1 numeric := 0; dW numeric; credit numeric := 0; pend numeric := 0; consume bigint[] := '{}';
  r record; bucket numeric; total numeric; use_ numeric; held numeric; wb numeric; f jsonb; hard text;
begin
  -- เรียกได้จาก trigger บนตาราง characters เท่านั้น (ไม่ใช่ RPC ตรง) และเฉพาะบัญชีของตัวเอง
  if pg_trigger_depth() < 1 then raise exception 'save_verify_eval is internal'; end if;
  if auth.uid() is not null and u is distinct from auth.uid() then raise exception 'not your account'; end if;
  select * into cfg from public.save_verify_config where id = 1;
  mode := coalesce(cfg.mode, 'log');
  if mode = 'off' then return null; end if;
  soft := coalesce(cfg.soft_rules, '{unknown_item,unknown_job,dup_uid,import_offline}');
  P := public.sv_defaults() || coalesce(cfg.derived, '{}'::jsonb) || coalesce(cfg.params, '{}'::jsonb);
  select * into st from public.save_verify_state where user_id = u for update;
  t := least((P ->> 'max_elapsed')::numeric, greatest(0, extract(epoch from nowt - coalesce(st.at, old_at, nowt))));
  exp_rate := (P ->> 'exp_per_kill')::numeric * (P ->> 'kps')::numeric * (P ->> 'party_mul')::numeric * (P ->> 'safety')::numeric;
  jexp_rate := (P ->> 'jexp_per_kill')::numeric * (P ->> 'kps')::numeric * (P ->> 'party_mul')::numeric * (P ->> 'safety')::numeric;
  worth_rate := (P ->> 'worth_per_kill')::numeric * (P ->> 'kps')::numeric * (P ->> 'safety')::numeric;
  acct_imp := coalesce(nd ->> 'importedOffline', '') <> '' and (od is null or (od ->> 'importedOffline') is distinct from (nd ->> 'importedOffline'));

  for c in select x from jsonb_array_elements(nc) x loop
    slot := slot + 1;
    k := lower(trim(c ->> 'name')); nm := left(c ->> 'name', 24);
    select x into o from jsonb_array_elements(oc) x where lower(trim(x ->> 'name')) = k limit 1;
    imported := (coalesce(c ->> 'importedOffline', '') <> '' and (o is null or (o ->> 'importedOffline') is distinct from (c ->> 'importedOffline'))) or (acct_imp and o is null);
    if o is null and not imported then fresh := fresh + 1; end if;
    if imported then
      fl := public.sv_flag(fl, 'import_offline', slot, jsonb_build_object('name', nm, 'at', coalesce(c -> 'importedOffline', nd -> 'importedOffline'), 'baseLv', c -> 'baseLv', 'job', c -> 'job', 'zeny', c -> 'zeny'), soft);
      impw := impw + public.sv_char_worth(c) - coalesce(public.sv_char_worth(o), 0);
    end if;

    -- ค่าที่เป็นไปไม่ได้
    lv := case when public.sv_is_int(c -> 'baseLv') then least(100000, greatest(-1, (c ->> 'baseLv')::numeric))::int else null end;
    if lv is null or lv < 1 or lv > (P ->> 'max_base_lv')::int then fl := public.sv_flag(fl, 'level_cap', slot, jsonb_build_object('name', nm, 'baseLv', c -> 'baseLv'), soft); end if;
    if (c -> 'job1Lv') is not null and jsonb_typeof(c -> 'job1Lv') <> 'null' and (not public.sv_is_int(c -> 'job1Lv') or public.sv_num(c -> 'job1Lv') < 1 or public.sv_num(c -> 'job1Lv') > 99) then
      fl := public.sv_flag(fl, 'level_cap', slot, jsonb_build_object('name', nm, 'job1Lv', c -> 'job1Lv'), soft); end if;
    if (c -> 'job2Lv') is not null and jsonb_typeof(c -> 'job2Lv') <> 'null' and (not public.sv_is_int(c -> 'job2Lv') or public.sv_num(c -> 'job2Lv') < 1 or public.sv_num(c -> 'job2Lv') > 99) then
      fl := public.sv_flag(fl, 'level_cap', slot, jsonb_build_object('name', nm, 'job2Lv', c -> 'job2Lv'), soft); end if;
    select * into jb_row from public.save_verify_jobs where id = c ->> 'job';
    jl := greatest(1, least(100000, trunc(public.sv_num(c -> 'jobLv'))))::int;
    if jb_row.id is null then fl := public.sv_flag(fl, 'unknown_job', slot, jsonb_build_object('name', nm, 'job', c -> 'job'), soft);
    elsif not public.sv_is_int(c -> 'jobLv') or public.sv_num(c -> 'jobLv') < 1 or public.sv_num(c -> 'jobLv') > jb_row.job_max then
      fl := public.sv_flag(fl, 'job_level_cap', slot, jsonb_build_object('name', nm, 'job', c -> 'job', 'jobLv', c -> 'jobLv', 'max', jb_row.job_max), soft); end if;
    L := case when lv is null then 1 else greatest(1, least((P ->> 'max_base_lv')::int, lv)) end;
    if public.sv_num(c -> 'baseExp') < 0 or (L < (P ->> 'max_base_lv')::int and public.sv_num(c -> 'baseExp') >= 2 * public.sv_need_base(L)) then
      fl := public.sv_flag(fl, 'exp_range', slot, jsonb_build_object('name', nm, 'baseExp', c -> 'baseExp'), soft); end if;
    if jb_row.id is not null and (public.sv_num(c -> 'jobExp') < 0 or public.sv_num(c -> 'jobExp') >= 2 * public.sv_need_job(jb_row.tier, jl)) then
      fl := public.sv_flag(fl, 'exp_range', slot, jsonb_build_object('name', nm, 'jobExp', c -> 'jobExp'), soft); end if;
    if exists (select 1 from unnest(array['str','agi','vit','int','dex','luk']) s
               where not coalesce(public.sv_is_int(c -> 'stats' -> s), false) or public.sv_num(c -> 'stats' -> s) < 1 or public.sv_num(c -> 'stats' -> s) > (P ->> 'stat_max')::numeric) then
      fl := public.sv_flag(fl, 'stat_cap', slot, jsonb_build_object('name', nm, 'stats', c -> 'stats'), soft); end if;
    spent := public.sv_stat_spent(case when jsonb_typeof(c -> 'stats') = 'object' then c -> 'stats' else '{}'::jsonb end);
    pts := public.sv_num(c -> 'statPoints'); have := public.sv_stat_total(L);
    if pts < 0 or spent + pts > have + (P ->> 'stat_slack')::numeric then
      fl := public.sv_flag(fl, 'stat_points', slot, jsonb_build_object('name', nm, 'spent', spent, 'points', pts, 'allowed', have), soft); end if;
    if (c -> 'zeny') is not null and jsonb_typeof(c -> 'zeny') <> 'null' and (not public.sv_is_int(c -> 'zeny') or public.sv_num(c -> 'zeny') < 0 or public.sv_num(c -> 'zeny') > (P ->> 'zeny_max')::numeric) then
      fl := public.sv_flag(fl, 'zeny_range', slot, jsonb_build_object('name', nm, 'zeny', c -> 'zeny'), soft); end if;
    unk := null; qbad := null; rbad := null; cbad := null; dupu := null; uids := '{}';
    for en in select * from public.sv_entries(c) loop
      if jsonb_typeof(en.e) <> 'object' then qbad := coalesce(qbad, jsonb_build_object('where', en.w)); continue; end if;
      select * into it from public.save_verify_items where id = en.e ->> 'id';
      if it.id is null then unk := coalesce(unk, jsonb_build_object('where', en.w, 'id', left(coalesce(en.e ->> 'id', ''), 40))); continue; end if;
      q := public.sv_num(en.e -> 'qty');
      if not public.sv_is_int(en.e -> 'qty') or q < (case when en.w = 'vend' then 0 else 1 end) or q > (case when it.equip then 1 else (P ->> 'stack_max')::numeric end) then
        qbad := coalesce(qbad, jsonb_build_object('where', en.w, 'id', it.id, 'qty', en.e -> 'qty')); end if;
      if (en.e -> 'refine') is not null and jsonb_typeof(en.e -> 'refine') <> 'null' and (not public.sv_is_int(en.e -> 'refine') or public.sv_num(en.e -> 'refine') < 0 or public.sv_num(en.e -> 'refine') > (P ->> 'refine_max')::numeric) then
        rbad := coalesce(rbad, jsonb_build_object('where', en.w, 'id', it.id, 'refine', en.e -> 'refine')); end if;
      if (en.e -> 'cards') is not null and jsonb_typeof(en.e -> 'cards') <> 'null' then
        if jsonb_typeof(en.e -> 'cards') <> 'array' or jsonb_array_length(en.e -> 'cards') > (P ->> 'cards_max')::int then
          cbad := coalesce(cbad, jsonb_build_object('where', en.w, 'id', it.id));
        else
          for cd in select jsonb_array_elements(en.e -> 'cards') #>> '{}' loop
            if not exists (select 1 from public.save_verify_items where id = cd) then unk := coalesce(unk, jsonb_build_object('where', en.w, 'id', left(coalesce(cd, ''), 40)));
            elsif not exists (select 1 from public.save_verify_items where id = cd and card) then cbad := coalesce(cbad, jsonb_build_object('where', en.w, 'id', it.id, 'card', cd)); end if;
          end loop;
        end if;
      end if;
      if it.equip and public.sv_is_int(en.e -> 'uid') and public.sv_num(en.e -> 'uid') > 0 and en.w <> 'vend' and public.sv_num(en.e -> 'uid') < 9e18 then
        if (en.e ->> 'uid')::numeric::bigint = any(uids) then dupu := coalesce(dupu, jsonb_build_object('where', en.w, 'id', it.id, 'uid', en.e -> 'uid')); end if;
        uids := uids || (en.e ->> 'uid')::numeric::bigint;
      end if;
    end loop;
    if unk is not null then fl := public.sv_flag(fl, 'unknown_item', slot, jsonb_build_object('name', nm) || unk, soft); end if;
    if qbad is not null then fl := public.sv_flag(fl, 'qty_range', slot, jsonb_build_object('name', nm) || qbad, soft); end if;
    if rbad is not null then fl := public.sv_flag(fl, 'refine_cap', slot, jsonb_build_object('name', nm) || rbad, soft); end if;
    if cbad is not null then fl := public.sv_flag(fl, 'card_range', slot, jsonb_build_object('name', nm) || cbad, soft); end if;
    if dupu is not null then fl := public.sv_flag(fl, 'dup_uid', slot, jsonb_build_object('name', nm) || dupu, soft); end if;
    -- เปลี่ยน Class ได้ทีละขั้นตามสาย • ตัวละครใหม่เริ่มที่ Novice (เผื่อ Class 1 ก่อนเซฟแรก)
    if jb_row.id is not null and o is not null and (o ->> 'job') is distinct from (c ->> 'job')
       and (not public.sv_descends(o ->> 'job', c ->> 'job')
            or jb_row.tier - coalesce((select tier from public.save_verify_jobs where id = o ->> 'job'), jb_row.tier) > 1) then
      fl := public.sv_flag(fl, 'job_path', slot, jsonb_build_object('name', nm, 'from', o -> 'job', 'to', c -> 'job'), soft); end if;
    if jb_row.id is not null and o is null and not imported and jb_row.tier > 1 then
      fl := public.sv_flag(fl, 'job_path', slot, jsonb_build_object('name', nm, 'from', null, 'to', c -> 'job'), soft); end if;

    -- อัตราเทียบเวลา (ถังโทเคน)
    if imported then
      schars := schars || jsonb_build_object(k, jsonb_build_object('eb', round(3 * (P ->> 'boss_exp')::numeric * (P ->> 'party_mul')::numeric),
        'jb', round(3 * (P ->> 'boss_exp')::numeric * 0.7 * (P ->> 'party_mul')::numeric), 'lb', (P ->> 'lv_cap')::numeric));
      continue;
    end if;
    ol := case when o is not null and public.sv_is_int(o -> 'baseLv') then greatest(1, least((P ->> 'max_base_lv')::int, greatest(-1, least(100000, (o ->> 'baseLv')::numeric))::int)) else 1 end;
    prev := case when st.user_id is not null then st.chars -> k else null end;
    select * into ojb from public.save_verify_jobs where o is not null and id = o ->> 'job';
    capE := 3 * (P ->> 'boss_exp')::numeric * (P ->> 'party_mul')::numeric + (P ->> 'need_frac')::numeric * public.sv_need_base(ol);
    capJ := 3 * (P ->> 'boss_exp')::numeric * 0.7 * (P ->> 'party_mul')::numeric
            + case when ojb.id is not null then (P ->> 'need_frac')::numeric * public.sv_need_job(ojb.tier, greatest(1, least(100000, trunc(public.sv_num(o -> 'jobLv'))))::int) else 0 end;
    dE := public.sv_cum_base(L, public.sv_num(c -> 'baseExp')) - case when o is not null then public.sv_cum_base(ol, public.sv_num(o -> 'baseExp')) else 0 end;
    -- EXP จากการฆ่าที่ submit_events ตรวจแล้ว (vb) ใช้ก่อน ไม่กินถังอัตรา
    vb := coalesce((prev ->> 'vb')::numeric, 0); uv := least(vb, greatest(0, dE)); vb := vb - uv;
    eb := least(capE, coalesce((prev ->> 'eb')::numeric, capE) + exp_rate * t) - (greatest(0, dE) - uv);
    if eb < 0 then
      fl := public.sv_flag(fl, 'exp_rate', slot, jsonb_build_object('name', nm, 'gained', round(dE), 'allowed', round(eb + greatest(0, dE)), 'seconds', round(t)), soft); eb := 0; end if;
    dJ := 0;
    if jb_row.id is not null then
      if o is not null and (o ->> 'job') = (c ->> 'job') and ojb.id is not null then
        dJ := public.sv_cum_job(jb_row.tier, jl, public.sv_num(c -> 'jobExp')) - public.sv_cum_job(ojb.tier, greatest(1, least(100000, trunc(public.sv_num(o -> 'jobLv'))))::int, public.sv_num(o -> 'jobExp'));
      else dJ := public.sv_cum_job(jb_row.tier, jl, public.sv_num(c -> 'jobExp')); end if;
    end if;
    vj := coalesce((prev ->> 'vj')::numeric, 0); uv := least(vj, greatest(0, dJ)); vj := vj - uv;
    jbk := least(capJ, coalesce((prev ->> 'jb')::numeric, capJ) + jexp_rate * t) - (greatest(0, dJ) - uv);
    if jbk < 0 then
      fl := public.sv_flag(fl, 'jexp_rate', slot, jsonb_build_object('name', nm, 'gained', round(dJ), 'allowed', round(jbk + greatest(0, dJ)), 'seconds', round(t)), soft); jbk := 0; end if;
    dL := L - ol;
    lb := least((P ->> 'lv_cap')::numeric, coalesce((prev ->> 'lb')::numeric, (P ->> 'lv_cap')::numeric) + (P ->> 'lv_per_min')::numeric * t / 60) - greatest(0, dL);
    if lb < 0 then
      fl := public.sv_flag(fl, 'level_rate', slot, jsonb_build_object('name', nm, 'from', ol, 'to', L, 'seconds', round(t)), soft); lb := 0; end if;
    schars := schars || jsonb_build_object(k, jsonb_build_object('eb', round(eb), 'jb', round(jbk), 'lb', round(lb, 2), 'vb', round(vb), 'vj', round(vj)));
  end loop;

  -- มูลค่ารวมทั้งบัญชี
  select coalesce(sum(public.sv_char_worth(x)), 0) into w0 from jsonb_array_elements(oc) x;
  select coalesce(sum(public.sv_char_worth(x)), 0) into w1 from jsonb_array_elements(nc) x;
  dW := w1 - w0 - (P ->> 'new_char_worth')::numeric * fresh - impw;
  for r in
    select l.id, l.at, l.zin, l.zout, l.win, l.wout,
           exists (select 1 from public.transfer_ledger pl where pl.kind = l.kind and pl.tid = l.tid and pl.user_id = l.peer_id and pl.peer_id = l.user_id and pl.sig = l.sig) as paired
    from public.transfer_ledger l where l.user_id = u and l.consumed_at is null order by l.id
  loop
    if r.paired then credit := credit + r.zin + r.win - r.zout - r.wout; consume := consume || r.id;
    elsif extract(epoch from nowt - r.at) > (P ->> 'pair_wait')::numeric then consume := consume || r.id;
    else pend := pend + r.zout + r.wout; end if;
  end loop;
  bucket := least((P ->> 'worth_cap')::numeric, coalesce(st.wb, (P ->> 'worth_cap')::numeric) + worth_rate * t);
  use_ := dW - credit;
  total := bucket + coalesce(st.held, 0) - use_;
  if total < 0 then
    fl := public.sv_flag(fl, 'worth_rate', case when jsonb_array_length(nc) = 0 then 0 else greatest(0, least(jsonb_array_length(nc) - 1, coalesce(trunc(public.sv_num(nd -> 'active')), 0)::int)) end,
      jsonb_build_object('gained', round(dW), 'credit', round(credit), 'allowed', round(total + use_), 'seconds', round(t)), soft);
    total := 0;
  end if;
  held := round(least(pend, total));
  wb := round(least((P ->> 'worth_cap')::numeric, total - held));

  select f2 ->> 'rule' into hard from jsonb_array_elements(fl) f2 where not (f2 ->> 'soft')::boolean limit 1;
  if mode = 'enforce' and hard is not null then return hard; end if; -- ทรานแซกชันถูกยกเลิกทั้งก้อน (ไม่อัปเดตถัง/รายการโอน)

  insert into public.save_verify_state (user_id, at, wb, held, chars) values (u, nowt, wb, held, schars)
  on conflict (user_id) do update set at = excluded.at, wb = excluded.wb, held = excluded.held, chars = excluded.chars;
  if array_length(consume, 1) > 0 then update public.transfer_ledger set consumed_at = nowt where id = any(consume); end if;
  for f in select x from jsonb_array_elements(fl) x loop
    -- ธงเดิมซ้ำภายใน 10 นาที (กติกาเดียวกัน ช่องเดียวกัน) ไม่จดซ้ำ — กันตารางบวมจากเซฟทุก 4 วิ
    if not exists (select 1 from public.cheat_flags cf where cf.user_id = u and cf.rule = f ->> 'rule' and cf.slot is not distinct from (f ->> 'slot')::int and cf.at > nowt - interval '10 minutes') then
      insert into public.cheat_flags (user_id, slot, rule, detail, mode) values (u, (f ->> 'slot')::int, f ->> 'rule', coalesce(f -> 'detail', '{}'::jsonb), mode);
    end if;
  end loop;
  return null;
end $$;
revoke all on function public.save_verify_eval(uuid, jsonb, jsonb, timestamptz) from public, anon;
grant execute on function public.save_verify_eval(uuid, jsonb, jsonb, timestamptz) to authenticated; -- trigger ทำงานในสิทธิ์ผู้เล่น (ฟังก์ชันกันเรียกตรงเอง)

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
