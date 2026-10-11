-- ============================================================
--  ป้องกันล็อกอินซ้ำ ฝั่งเซิร์ฟเวอร์ (บังคับจริง — ไคลเอนต์ที่ถูกแก้ข้ามไม่ได้)
--  ทุกครั้งที่ล็อกอิน เกมเรียก claim_session(sid) → เครื่องล่าสุดเป็นเจ้าของบัญชี
--  เซฟ (upsert characters) ต้องแนบ sid ของเจ้าของปัจจุบัน ไม่งั้นฐานข้อมูลปฏิเสธ 'stale_session'
--  บัญชีที่ยังไม่เคย claim (เกมรุ่นเก่าที่ยังเปิดค้าง) เซฟได้ตามเดิม จนกว่าจะล็อกอินด้วยเกมรุ่นใหม่ครั้งแรก
--  ตรวจเฉพาะการเขียนตรงจากผู้เล่น (role authenticated) — ฟังก์ชันฝั่งเซิร์ฟเวอร์ (security definer) ไม่ถูกตรวจ
--  ไม่แตะข้อมูลเซฟเดิม: เพิ่มตาราง account_sessions + คอลัมน์ characters.sid (ว่างได้) • รันซ้ำได้ (idempotent)
-- ============================================================
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
