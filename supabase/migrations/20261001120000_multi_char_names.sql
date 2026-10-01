-- ============================================================
--  หลายตัวละครต่อบัญชี (สูงสุด 5 ช่อง) — ไม่เปลี่ยนโครงตาราง
--  characters.data เป็นก้อนบัญชี { v: 2, active, chars: [...] } • characters.name = ตัวที่เล่นอยู่
--  อัปเดต name_available ให้กันชื่อซ้ำกับ "ทุกช่อง" ของผู้เล่นอื่น (ไม่ใช่แค่ตัวที่เล่นอยู่)
--  รันซ้ำได้ (idempotent)
-- ============================================================
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
