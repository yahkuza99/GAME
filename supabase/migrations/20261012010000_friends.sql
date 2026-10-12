-- ============================================================
--  ระบบเพื่อน (รอบ 36) — ตาราง friends + RLS + ฟังก์ชัน friend_request / friend_accept / friend_remove / friend_list
--  1 แถว = คำขอจาก user_id → friend_id • status 'pending' (รอตอบ) | 'accepted' (เป็นเพื่อนกันแล้ว)
--  เพิ่มเพื่อนด้วย "ชื่อตัวละคร" (คอลัมน์ characters.name หรือชื่อในช่องใดก็ได้ของ data.chars) — ไม่เปิดให้อ่านข้อมูลตัวละครของคนอื่น:
--  ฟังก์ชันคืนแค่ id บัญชี + ชื่อที่ค้นหา • friend_list คืนชื่อเฉพาะคนที่มีความสัมพันธ์กับเราอยู่แล้ว
--  เกมเช็กว่ามีฟังก์ชันนี้หรือยัง (friend_list) — ยังไม่รัน migration = ซ่อนแท็บเพื่อน ("ระบบเพื่อนยังไม่เปิดบนเซิร์ฟเวอร์")
--  ไม่แตะตาราง/ข้อมูลเดิม • รันซ้ำได้ (idempotent)
-- ============================================================
create table if not exists public.friends (
  user_id    uuid not null references auth.users (id) on delete cascade,
  friend_id  uuid not null references auth.users (id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
create index if not exists friends_friend_id_idx on public.friends (friend_id);

alter table public.friends enable row level security;

-- อ่าน: เห็นเฉพาะแถวที่ตัวเองเป็นฝ่ายใดฝ่ายหนึ่ง
drop policy if exists "friends read own" on public.friends;
create policy "friends read own" on public.friends
  for select to authenticated using (auth.uid() = user_id or auth.uid() = friend_id);

-- ส่งคำขอ: ในนามตัวเองเท่านั้น และต้องเริ่มที่ 'pending'
drop policy if exists "friends request as self" on public.friends;
create policy "friends request as self" on public.friends
  for insert to authenticated with check (user_id = auth.uid() and status = 'pending');

-- ตอบรับ: เฉพาะฝ่ายที่ถูกขอ (friend_id) และเปลี่ยนได้แค่เป็น 'accepted'
drop policy if exists "friends accept by target" on public.friends;
create policy "friends accept by target" on public.friends
  for update to authenticated using (friend_id = auth.uid()) with check (friend_id = auth.uid() and status = 'accepted');
-- แก้ได้เฉพาะคอลัมน์ status (กันย้ายแถวไปเป็นของคนอื่น)
revoke update on public.friends from authenticated;
grant update (status) on public.friends to authenticated;

-- ลบ (ยกเลิกคำขอ / ปฏิเสธ / เลิกเป็นเพื่อน): ฝ่ายไหนก็ได้
drop policy if exists "friends delete either" on public.friends;
create policy "friends delete either" on public.friends
  for delete to authenticated using (auth.uid() = user_id or auth.uid() = friend_id);

grant select, insert, delete on public.friends to authenticated;

-- ---------- ส่งคำขอด้วยชื่อตัวละคร ----------
-- คืน json { ok, id, name, status } หรือ { ok:false, why: 'not_found'|'self'|'exists'|'limit'|'bad_name' }
-- อีกฝ่ายเคยขอเรามาก่อน (pending) = ยอมรับให้ทันที (status 'accepted')
create or replace function public.friend_request(n text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  q text := lower(trim(coalesce(n, '')));
  other uuid;
  shown text;
  rel public.friends%rowtype;
  total int;
begin
  if me is null then raise exception 'not signed in'; end if;
  if char_length(q) not between 1 and 24 then return json_build_object('ok', false, 'why', 'bad_name'); end if;
  -- ชื่อตรงกับคอลัมน์ name (ตัวที่เล่นอยู่) หรือช่องใดก็ได้ใน data.chars • shown = ตัวสะกดจริงของชื่อนั้น
  select c.user_id,
         coalesce((select e->>'name' from jsonb_array_elements(case when jsonb_typeof(c.data->'chars') = 'array' then c.data->'chars' else '[]'::jsonb end) e
                    where lower(e->>'name') = q limit 1), c.name)
    into other, shown
    from public.characters c
   where lower(c.name) = q
      or exists (select 1 from jsonb_array_elements(case when jsonb_typeof(c.data->'chars') = 'array' then c.data->'chars' else '[]'::jsonb end) e
                 where lower(e->>'name') = q)
   limit 1;
  if other is null then return json_build_object('ok', false, 'why', 'not_found'); end if;
  if other = me then return json_build_object('ok', false, 'why', 'self'); end if;
  -- มีความสัมพันธ์อยู่แล้ว?
  select * into rel from public.friends where user_id = other and friend_id = me;
  if found then
    if rel.status = 'pending' then
      update public.friends set status = 'accepted' where user_id = other and friend_id = me;
      return json_build_object('ok', true, 'id', other, 'name', shown, 'status', 'accepted');
    end if;
    return json_build_object('ok', false, 'why', 'exists', 'id', other, 'status', rel.status);
  end if;
  select * into rel from public.friends where user_id = me and friend_id = other;
  if found then return json_build_object('ok', false, 'why', 'exists', 'id', other, 'status', rel.status); end if;
  -- กันสแปม: คำขอค้าง (ส่งออก) ไม่เกิน 50 • ความสัมพันธ์ทั้งหมดไม่เกิน 200
  select count(*) into total from public.friends where user_id = me and status = 'pending';
  if total >= 50 then return json_build_object('ok', false, 'why', 'limit'); end if;
  select count(*) into total from public.friends where user_id = me or friend_id = me;
  if total >= 200 then return json_build_object('ok', false, 'why', 'limit'); end if;
  insert into public.friends (user_id, friend_id, status) values (me, other, 'pending');
  return json_build_object('ok', true, 'id', other, 'name', shown, 'status', 'pending');
end $$;
revoke all on function public.friend_request(text) from public;
grant execute on function public.friend_request(text) to authenticated;

-- ---------- ตอบรับ (id = บัญชีของคนที่ขอมา) ----------
create or replace function public.friend_accept(id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  update public.friends set status = 'accepted' where user_id = friend_accept.id and friend_id = auth.uid() and status = 'pending';
  return found;
end $$;
revoke all on function public.friend_accept(uuid) from public;
grant execute on function public.friend_accept(uuid) to authenticated;

-- ---------- ลบ (ยกเลิกคำขอที่ส่ง / ปฏิเสธคำขอที่ได้รับ / เลิกเป็นเพื่อน) ----------
create or replace function public.friend_remove(id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from public.friends
   where (user_id = auth.uid() and friend_id = friend_remove.id) or (user_id = friend_remove.id and friend_id = auth.uid());
  return found;
end $$;
revoke all on function public.friend_remove(uuid) from public;
grant execute on function public.friend_remove(uuid) to authenticated;

-- ---------- รายชื่อของฉัน: id อีกฝ่าย + ชื่อตัวละครที่เล่นล่าสุด (characters.name) + สถานะ + ทิศทาง ----------
create or replace function public.friend_list()
returns table (id uuid, name text, status text, dir text, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select case when f.user_id = auth.uid() then f.friend_id else f.user_id end as id,
         c.name,
         f.status,
         case when f.status = 'accepted' then 'both' when f.user_id = auth.uid() then 'out' else 'in' end as dir,
         f.created_at
    from public.friends f
    left join public.characters c on c.user_id = case when f.user_id = auth.uid() then f.friend_id else f.user_id end
   where auth.uid() is not null and (f.user_id = auth.uid() or f.friend_id = auth.uid())
   order by f.created_at;
$$;
revoke all on function public.friend_list() from public;
grant execute on function public.friend_list() to authenticated;
