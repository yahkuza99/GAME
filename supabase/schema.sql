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
