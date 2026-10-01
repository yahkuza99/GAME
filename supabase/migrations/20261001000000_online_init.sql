-- ============================================================
--  Ragnarok Web Adventure — ฐานข้อมูลสำหรับโหมดออนไลน์ (Supabase)
--  วิธีใช้: Supabase Dashboard → SQL Editor → วางไฟล์นี้ทั้งหมด → Run
--  รันซ้ำได้ (idempotent)
-- ============================================================

-- ---------- ตัวละคร (1 บัญชี = 1 ตัวละคร) ----------
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

-- ตรวจว่าชื่อตัวละครยังว่างอยู่ (โดยไม่เปิดให้อ่านข้อมูลตัวละครของคนอื่น)
create or replace function public.name_available(n text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from public.characters
    where lower(name) = lower(trim(n)) and user_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
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
