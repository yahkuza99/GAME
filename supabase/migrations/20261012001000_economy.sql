-- ============================================================
--  เศรษฐกิจฝั่งเซิร์ฟเวอร์ (ระยะ 1) — Volt/ของที่ย้ายระหว่างผู้เล่นหรือกับร้าน NPC เปลี่ยนที่ฐานข้อมูลเท่านั้น
--  RPC (security definer) แก้ characters.data ในทรานแซกชันเดียว (ล็อกแถว FOR UPDATE) แล้วคืน "ส่วนต่าง" (delta) ให้เกมนำไปใช้:
--    ร้าน NPC: econ_shop_buy / econ_shop_sell (ราคาจากตารางฝั่งเซิร์ฟเวอร์)
--    ตีบวก: econ_refine (สุ่มด้วย random() ของเซิร์ฟเวอร์ — เกมแก้โอกาสไม่ได้)
--    ตลาดกลาง: econ_market_list / econ_market_cancel / econ_market_price (รายการขาย p.vend เป็นของเซิร์ฟเวอร์)
--              econ_market_buy (ผู้ซื้อเรียก — หักเงิน/โอนของ/จ่ายผู้ขายพร้อมกัน ไม่ต้องรอเครื่องผู้ขาย)
--    แลกเปลี่ยน: econ_trade (ฝ่ายที่สองที่ยืนยันข้อเสนอตรงกัน = เซิร์ฟเวอร์สลับของทั้งคู่ทีเดียว) / econ_trade_cancel
--    econ_pull: ดึงรายการเปลี่ยนแปลงที่เซิร์ฟเวอร์ทำกับตัวละครเรา (เช่น ขายได้ตอนเราไม่ได้ดู)
--  ทุกการเปลี่ยนแปลงจดใน econ_events (ต่อตัวละคร มีเลขลำดับ econSeq เก็บในเซฟตัวละครด้วย)
--  trigger characters_econ_merge (ทำงานก่อนตรวจเซฟ): เซฟจากเกมที่ยังไม่ได้รับรายการล่าสุด (econSeq ต่ำกว่า)
--    → เซิร์ฟเวอร์ใส่รายการที่ขาดให้ก่อนบันทึก (ไม่มีเงิน/ของหายเพราะเซฟชนกัน) • p.vend ใช้ของเซิร์ฟเวอร์เสมอ
--    • อุปกรณ์ (uid) ที่ออกจากตัวละครไปทางเซิร์ฟเวอร์แล้วโผล่กลับมาในเซฟ = ของปั๊ม → ธง dup_item (โหมด enforce: ตัดทิ้ง)
--  uid อุปกรณ์ที่เซิร์ฟเวอร์สร้างมาจาก sequence (≥ 1,000,000,000,000) ไม่ชนกับ uid ที่เกมสร้างเอง
--  ปิดทั้งระบบได้: update save_verify_config set econ = false → RPC ตอบ econ_off → เกมกลับไปใช้แบบเดิม (บันทึกการโอนของระยะ 0)
--  ต้องรันหลัง 20261012000000_save_verify.sql (+ _data) • รันซ้ำได้ • ข้อมูลร้าน/ตีบวก: 20261012000100_save_verify_data.sql
-- ============================================================

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
