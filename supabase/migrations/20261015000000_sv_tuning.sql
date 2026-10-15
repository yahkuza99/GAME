-- ============================================================
--  จูนตัวตรวจกันโกง (รอบ 41) — แก้ธงผิดตัว (false positive) ที่เจอจากข้อมูลจริงโหมด log (ทุกธงเป็นตัวละครของเจ้าของเกมเอง)
--    1) dup_uid: จดครั้งเดียวต่อ (ผู้เล่น, ตัวละคร, uid) จนกว่าจะเปลี่ยน — เดิมจดซ้ำทุก 10 นาทีตลอดไป (×266) · save_verify_state.chars.<ตัว>.du
--       (ต้นเหตุ uid ซ้ำอยู่ที่เกม: แตะ/คลิกแถวเดิมซ้ำก่อนหน้าต่างวาดใหม่ → ชิ้นเดียวอยู่ 2 ช่องแหวน — แก้ js/game.js equipItem + ซ่อมในเครื่อง SaveVerify.fixDups)
--    2) stat_points: แต้มที่มีได้ = statTotal(เลเวลสูงสุดที่ตัวละครเคยมี) — เซฟเดิม / ml ใน save_verify_state / หมุดโซ่ (บวกได้ไม่เกิน anchor_lv_slack ขั้น)
--       เดิมใช้เลเวลในเซฟที่มาช้า (เลเวลเก่าแต่ Stat ใหม่) → ธงผิด · ถัง EXP / Job EXP / เลเวลเทียบกับ "สูงสุดที่เคยเห็น" (hb / hj / ml) — เซฟมาช้าแล้วกลับมาที่เดิม ไม่นับซ้ำ
--    3) kill_rate (submit_events): ช่วงเวลาที่เทียบต่อมอนมีขั้นต่ำ = จำนวนฆ่าทั้งชุด ÷ kps_max (ไม่เกิน kill_burst_s = 30 วิ เท่าที่เพดานรวมให้อยู่แล้ว)
--       ฆ่าหมู่ / แท็บซ่อนจำลองทีเดียว (span 0) ไม่ติดธง · เพดานรวม kps_max × (elapsed + 30) ไม่เปลี่ยน → อ้าง 200 ตัวใน 0 วิ ยังติด kill_rate
--    4) kill_map: มอน Elite / ลูกสมุนบอส (รุ่น Ancient / ชั้นยอด) อยู่ในตาราง sv_map_mobs แล้ว — 20261012002100_event_chain_data.sql (tools/gen_item_ids.js)
--  แทน save_verify_eval / submit_events ของ 20261012002000_event_chain.sql (ฉบับเต็ม + ส่วนที่แก้) • ไม่แตะเซฟ/ไม่สร้างตาราง • รันซ้ำได้
--  ลำดับบน Supabase: รันไฟล์นี้หลัง 20261012002000_event_chain.sql แล้วรัน 20261012002100_event_chain_data.sql (ฉบับใหม่) ซ้ำ
--  สำเนา JavaScript: supabase/save_verify_rules.js (ข้อ 1–2) · tests/fake_supabase.js (ข้อ 3) — แก้ที่หนึ่งต้องแก้อีกที่
--  ถอย: รัน 20261012002000_event_chain.sql ซ้ำ (ได้สองฟังก์ชันเดิมกลับมา — คีย์ใหม่ใน save_verify_state ไม่มีผลกับฉบับเดิม)
-- ============================================================

--  ค่าปรับได้ (save_verify_config.params): kill_burst_s (ค่าเริ่ม 30) · anchor_lv_slack (ค่าเริ่ม 3)

-- ---------- ส่งชุดเหตุการณ์ (ฉบับรอบ 41: ข้อ 3) ----------
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
  P := public.sv_defaults() || jsonb_build_object('kps_max', 3, 'batch_max', 200, 'clock_skew', 600, 'kill_burst_s', 30)
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
      -- ช่วงเวลาที่เทียบ = มากสุดของ: ช่วงในชุด / เวลาจริงตั้งแต่หมุดก่อน / เวลาขั้นต่ำที่การฆ่าทั้งชุดต้องใช้ตามเพดานรวม (nk ÷ kps_max ไม่เกิน kill_burst_s)
      -- ฆ่าหมู่ (AoE) / แท็บที่ถูกซ่อนจำลองย้อนหลังทีเดียว = หลายตัวเวลาเดียวกัน + ชุดตามหลังชุดก่อนเสี้ยววิ → เดิม span 0 · elapsed ~0 = ติดธงทั้งที่เล่นจริง (RT: root_gnawer 26 ตัว)
      -- คนโกงไม่ได้ประโยชน์เพิ่ม: เพดานรวมข้างบน kps_max × (elapsed + 30) เท่าเดิม — 200 ตัวในชุดเดียวที่ 0 วิ = kill_rate เหมือนเดิม
      elsif cnt.kills > (select mm.n * (1 + greatest(spant, least(elapsed, (P ->> 'max_elapsed')::numeric), least(nk / greatest(0.1, (P ->> 'kps_max')::numeric), (P ->> 'kill_burst_s')::numeric)) / 4.0) * 1.5 + 2
                         from public.sv_map_mobs mm where mm.map = cnt.map and mm.mob = cnt.mob) then
        bad := 'kill_rate'; badd := jsonb_build_object('mob', cnt.mob, 'map', cnt.map, 'kills', cnt.kills, 'span', round(spant), 'since_anchor', round(elapsed), 'batch', nk); exit;
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
  foreach f in array array['submit_events(text, bigint, jsonb)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ---------- ตรวจเซฟ (ฉบับรอบ 41: ข้อ 1–2) ----------
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
  ml int; alv int; mlv int; nf int; lvbad boolean; cumO numeric; cumN numeric; hb numeric; hj numeric; jcN numeric; du text;
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
    k := lower(trim(c ->> 'name')); nm := left(c ->> 'name', 24); nf := jsonb_array_length(fl);
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
    -- เลเวลสูงสุดที่ตัวละครนี้เคยมี (เซฟเดิมบนเซิร์ฟเวอร์ / ml ที่จำไว้จากเซฟที่ผ่านการตรวจ) — เซฟที่มาช้า (เลเวลเก่า แต่ Stat ใหม่กว่า) ไม่ถูกจับผิด
    -- เลเวลที่โซ่อ้าง (event_anchors.lv) นับเพิ่มได้ไม่เกิน anchor_lv_slack ขั้น (โซ่อ้างเลเวลเองได้ — ไม่ให้เป็นทางปั๊มแต้ม Stat)
    ol := case when o is not null and public.sv_is_int(o -> 'baseLv') then greatest(1, least((P ->> 'max_base_lv')::int, greatest(-1, least(100000, (o ->> 'baseLv')::numeric))::int)) else 1 end;
    prev := case when st.user_id is not null then st.chars -> k else null end;
    ml := case when o is not null then greatest(ol, coalesce(trunc(public.sv_num(prev -> 'ml')), 0)::int) else 0 end; -- ตัวละครใหม่ชื่อซ้ำตัวที่ลบไป = ไม่ใช้ประวัติเก่า
    alv := coalesce((select a2.lv from public.event_anchors a2 where a2.user_id = u and a2.char_key = k order by a2.id desc limit 1), 0);
    mlv := greatest(L, ml);
    mlv := least((P ->> 'max_base_lv')::int, greatest(mlv, least(alv, mlv + coalesce((P ->> 'anchor_lv_slack')::int, 3))));
    spent := public.sv_stat_spent(case when jsonb_typeof(c -> 'stats') = 'object' then c -> 'stats' else '{}'::jsonb end);
    pts := public.sv_num(c -> 'statPoints'); have := public.sv_stat_total(mlv);
    if pts < 0 or spent + pts > have + (P ->> 'stat_slack')::numeric then
      fl := public.sv_flag(fl, 'stat_points', slot, jsonb_build_object('name', nm, 'spent', spent, 'points', pts, 'allowed', have, 'lv', L, 'max_lv', mlv), soft); end if;
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
    -- uid ซ้ำตัวเดิม (ยังไม่ได้แก้) = จดครั้งเดียวต่อ uid (เดิมจดทุก 10 นาทีตลอดไป — RT ×266) • หายแล้วกลับมา / uid อื่น = จดใหม่
    du := case when dupu is not null then dupu ->> 'uid' end;
    if dupu is not null and (prev ->> 'du') is distinct from du then fl := public.sv_flag(fl, 'dup_uid', slot, jsonb_build_object('name', nm) || dupu, soft); end if;
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
        'jb', round(3 * (P ->> 'boss_exp')::numeric * 0.7 * (P ->> 'party_mul')::numeric), 'lb', (P ->> 'lv_cap')::numeric, 'ml', greatest(ml, L), 'du', du));
      continue;
    end if;
    select * into ojb from public.save_verify_jobs where o is not null and id = o ->> 'job';
    capE := 3 * (P ->> 'boss_exp')::numeric * (P ->> 'party_mul')::numeric + (P ->> 'need_frac')::numeric * public.sv_need_base(ol);
    capJ := 3 * (P ->> 'boss_exp')::numeric * 0.7 * (P ->> 'party_mul')::numeric
            + case when ojb.id is not null then (P ->> 'need_frac')::numeric * public.sv_need_job(ojb.tier, greatest(1, least(100000, trunc(public.sv_num(o -> 'jobLv'))))::int) else 0 end;
    -- เทียบกับ "สูงสุดที่เคยเห็น" (hb) ไม่ใช่แค่เซฟเดิม: เซฟที่มาช้า (EXP ต่ำกว่า) แล้วเซฟถัดไปกลับมาที่เดิม = ไม่นับ EXP ช่วงเดิมซ้ำสองรอบ
    cumN := public.sv_cum_base(L, public.sv_num(c -> 'baseExp'));
    cumO := case when o is not null then public.sv_cum_base(ol, public.sv_num(o -> 'baseExp')) else 0 end;
    hb := case when o is not null then greatest(cumO, coalesce((prev ->> 'hb')::numeric, 0)) else 0 end;
    dE := cumN - hb;
    -- EXP จากการฆ่าที่ submit_events ตรวจแล้ว (vb) ใช้ก่อน ไม่กินถังอัตรา
    vb := coalesce((prev ->> 'vb')::numeric, 0); uv := least(vb, greatest(0, dE)); vb := vb - uv;
    eb := least(capE, coalesce((prev ->> 'eb')::numeric, capE) + exp_rate * t) - (greatest(0, dE) - uv);
    if eb < 0 then
      fl := public.sv_flag(fl, 'exp_rate', slot, jsonb_build_object('name', nm, 'gained', round(dE), 'allowed', round(eb + greatest(0, dE)), 'seconds', round(t)), soft); eb := 0; end if;
    dJ := 0; jcN := 0; hj := 0;
    if jb_row.id is not null then
      jcN := public.sv_cum_job(jb_row.tier, jl, public.sv_num(c -> 'jobExp'));
      if o is not null and (o ->> 'job') = (c ->> 'job') and ojb.id is not null then
        hj := greatest(public.sv_cum_job(ojb.tier, greatest(1, least(100000, trunc(public.sv_num(o -> 'jobLv'))))::int, public.sv_num(o -> 'jobExp')),
                       case when (prev ->> 'hjj') = (c ->> 'job') then coalesce((prev ->> 'hj')::numeric, 0) else 0 end);
        dJ := jcN - hj;
      else hj := 0; dJ := jcN; end if;
    end if;
    vj := coalesce((prev ->> 'vj')::numeric, 0); uv := least(vj, greatest(0, dJ)); vj := vj - uv;
    jbk := least(capJ, coalesce((prev ->> 'jb')::numeric, capJ) + jexp_rate * t) - (greatest(0, dJ) - uv);
    if jbk < 0 then
      fl := public.sv_flag(fl, 'jexp_rate', slot, jsonb_build_object('name', nm, 'gained', round(dJ), 'allowed', round(jbk + greatest(0, dJ)), 'seconds', round(t)), soft); jbk := 0; end if;
    dL := L - greatest(ol, ml);
    lb := least((P ->> 'lv_cap')::numeric, coalesce((prev ->> 'lb')::numeric, (P ->> 'lv_cap')::numeric) + (P ->> 'lv_per_min')::numeric * t / 60) - greatest(0, dL);
    if lb < 0 then
      fl := public.sv_flag(fl, 'level_rate', slot, jsonb_build_object('name', nm, 'from', ol, 'to', L, 'seconds', round(t)), soft); lb := 0; end if;
    -- ml = เลเวลสูงสุดที่เชื่อได้ (เซฟนี้นับเมื่อไม่ติดธงเลเวล/EXP) · hb/hj = EXP สะสมสูงสุดที่เคยเห็น (hj ผูกกับ Class hjj) · du = uid ซ้ำที่จดธงแล้ว
    lvbad := exists (select 1 from jsonb_array_elements(fl) with ordinality fq(fx, o2) where o2 > nf and fx ->> 'rule' in ('level_cap', 'level_rate', 'exp_rate', 'exp_range'));
    schars := schars || jsonb_build_object(k, jsonb_build_object('eb', round(eb), 'jb', round(jbk), 'lb', round(lb, 2), 'vb', round(vb), 'vj', round(vj),
      'ml', greatest(ml, case when lvbad then 0 else L end), 'hb', round(greatest(hb, cumN)), 'hj', round(greatest(hj, jcN)), 'hjj', c ->> 'job', 'du', du));
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
