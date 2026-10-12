# ระบบตรวจเซฟฝั่งเซิร์ฟเวอร์ (Save Verify)

> ที่มา: เจ้าของ "คนที่แก้โค้ดในเครื่องตัวเองยังโกงได้ … เราต้องมีระบบยืนยันของเราดิ แบบถ้าข้อมูลไม่ตรง"
> ไฟล์: `supabase/migrations/20261012000000_save_verify.sql` (ตัวระบบ) + `20261012000100_save_verify_data.sql` (รายการไอเทม/Class — สร้างอัตโนมัติ)
> ฝั่งเกม: `js/save_verify.js` · สำเนากติกาแบบ JavaScript (ใช้ในเทสต์): `supabase/save_verify_rules.js`

## หลักการสั้น ๆ

ทุกครั้งที่เกมเซฟขึ้นเซิร์ฟเวอร์ ฐานข้อมูลเอา **เซฟใหม่** มาเทียบกับ **เซฟเดิม** และ **เวลาที่ผ่านไปจริง (นาฬิกาเซิร์ฟเวอร์)**
ถ้าค่าเป็นไปไม่ได้ หรือเพิ่มเร็วกว่าที่คนเล่นจริงทำได้ → จดธงไว้ให้เจ้าของดู (โหมด log) หรือไม่รับเซฟนั้น (โหมด enforce)

เริ่มต้นที่โหมด **log** = ผู้เล่นไม่รู้สึกอะไร เซฟผ่านทุกครั้ง แค่มีบันทึก

## ตรวจอะไรบ้าง

### 1. ค่าที่เป็นไปไม่ได้ (ไม่ขึ้นกับเวลา)

| กติกา | ตรวจ |
|---|---|
| `level_cap` | Base Lv ต้อง 1–99 (Job1Lv/Job2Lv ที่จดไว้ 1–99) |
| `job_level_cap` | Job Lv ไม่เกิน Job สูงสุดของ Class นั้น (Novice 10 · Class 1 = 26 · Class 2 = 50 · Class 3 = 60) |
| `stat_cap` | Stat ทุกตัว 1–99 |
| `stat_points` | แต้มที่ลง Stat ไปแล้ว + แต้มที่เหลือ ต้องไม่เกินแต้มที่เลเวลนี้ให้ (48 + ทุกเลเวลได้ ⌊Lv/5⌋+3) |
| `exp_range` | EXP ติดลบ หรือเกิน 2 เท่าของ EXP ที่ต้องใช้ขึ้นเลเวล |
| `zeny_range` | Volt ติดลบ / ไม่ใช่จำนวนเต็ม / เกิน 1 ล้านล้าน |
| `qty_range` | จำนวนของติดลบ/เป็น 0 (ยกเว้นรายการตลาดที่ขายหมด) / อุปกรณ์มีมากกว่า 1 ชิ้นต่อช่อง / กองเกิน 1,000,000 |
| `refine_cap` | ตีบวกเกิน +10 |
| `card_range` | ใส่ชิปเกิน 4 ช่อง หรือใส่ของที่ไม่ใช่ชิป |
| `job_path` | เปลี่ยน Class ข้ามสาย / ข้ามขั้นในเซฟเดียว · ตัวละครใหม่เกิดมาเป็น Class 2–3 เลย |
| `unknown_item` * | id ไอเทมที่ไม่มีในเกม |
| `unknown_job` * | Class ที่ไม่มีในเกม |
| `dup_uid` * | อุปกรณ์ชิ้นเดียวกัน (uid ซ้ำ) อยู่ 2 ที่ในตัวละครเดียว = สัญญาณของปั๊ม |
| `import_offline` * | ตัวละครที่นำเข้าจากเซฟออฟไลน์ (มี `importedOffline`) — **จดไว้ ไม่ปฏิเสธเสมอ** และไม่ตรวจอัตรากับตัวนั้นในเซฟที่นำเข้า |

\* = กติกา "อ่อน" (`soft_rules`) — จดธงอย่างเดียวแม้อยู่ในโหมด enforce (ของที่เกมกรองทิ้งเองตอนโหลดอยู่แล้ว ไม่ได้ประโยชน์อะไร)

### 2. เร็วเกินไป (เทียบกับเวลาจริงที่ผ่านไป)

ใช้แบบ **ถังโทเคน**: ถังเติมตามเวลาที่ผ่านไป จุได้ไม่เกินเพดาน — ของที่ได้ในเซฟนั้นต้องไม่เกินที่มีในถัง
(เซฟถี่ ๆ ไม่ได้เพดานเพิ่ม · หายไปนานก็จุได้ไม่เกินเพดาน · นับเวลาสูงสุด 6 ชม. ต่อครั้ง)

| กติกา | ต่อ | เติม | เพดาน (ได้ครั้งเดียวทันที) |
|---|---|---|---|
| `exp_rate` | ตัวละคร | **40,866 Base EXP/วินาที** | 1,627,500 + 10% ของ EXP ที่เลเวลนั้นต้องใช้ |
| `jexp_rate` | ตัวละคร | **28,592 Job EXP/วินาที** | 1,139,250 + 10% ของ Job EXP ที่ต้องใช้ |
| `level_rate` | ตัวละคร | **15 เลเวล/นาที** | 30 เลเวล |
| `worth_rate` | ทั้งบัญชี | **1,164 มูลค่า/วินาที** (~4.2 ล้าน/ชม.) | 3,000,000 |

**มูลค่า (worth)** = Volt + ของทุกชิ้น (กระเป๋า + คลัง + ที่สวม + ของที่วางขายในตลาด + ชิปในอุปกรณ์) คิดตาม **ราคาขายร้าน NPC** (= ราคา ÷ 2)
→ ขายของให้ร้านไม่ทำให้มูลค่าเพิ่ม ไม่ถูกจับ · ตรากาชา (Valhalla Sigil) คิดเท่าค่าเฉลี่ยของการหมุน 1 ครั้ง (3,855) → หมุนกาชาไม่กระโดด

**ที่มาของตัวเลข** (คำนวณจากข้อมูลเกมจริงด้วย `tools/gen_item_ids.js` แล้วคูณเผื่อ):
- EXP ต่อตัวสูงสุดในเกม = Rot Colossus 5,560 × 1.4 (โบนัสมอนเลเวลสูงกว่า) = 7,784
- × 1 ตัว/วินาที (ล่าเร็วสุดที่สมเหตุผล) × 1.75 (ปาร์ตี้ 6 คนได้ EXP รวม +75% จากทุกคนที่ตี) × **3 (ความปลอดภัย)**
- ไม่ผูกกับเลเวลผู้เล่น เพราะ "ลากเลเวล" (ปาร์ตี้กับคนเลเวลสูง) เป็นการเล่นสุจริตที่ได้ EXP เร็วมาก
- เพดาน = บอสใหญ่สุด (World Boss Nidhogg 310,000 EXP) × ปาร์ตี้ × 3 — ครอบรางวัลเควสต์ (สูงสุด 70,000) / หีบรายวัน / ฆ่า MVP
- มูลค่าต่อตัวสูงสุด = เงิน + ค่าคาดหมายของดรอป (Rot Colossus 388) × 1 ตัว/วิ × 3 · เพดาน 3 ล้านครอบดรอปหายาก (ของแพงสุดขายได้ 75,000) / กาชาโชคดี / รางวัลเควสต์

**ผลวัดจริง** (`tests/saveverify.js` — บอท AUTO หลายช่วงเลเวล): EXP ที่ได้จริงใช้ถังแค่ **0.1–1.5%** ของอัตราที่ยอม
(Lv 64 ที่ Abyss ≈ 615 EXP/วินาที เทียบที่ยอม 40,866) → คนเล่นสุจริตห่างเพดานมาก

### 3. ซื้อขาย/แลกเปลี่ยนระหว่างผู้เล่น (รายการโอน)

ได้ของ/Volt จากผู้เล่นคนอื่น "ทีละมาก ๆ" เป็นเรื่องปกติ จึงต้องมีหลักฐาน:
- **ตลาดกลาง**: ผู้ซื้อเรียก `market_record` ตอนกดซื้อ (ก่อนกันเงิน) · ผู้ขายเรียกด้วยค่าเดียวกันตอนขาย
- **แลกเปลี่ยน**: ทั้งสองฝ่ายเรียก `trade_record` ตอนกดยืนยันสุดท้าย (ก่อนส่ง commit)
- เซิร์ฟเวอร์นับเป็นเครดิต **เฉพาะเมื่อสองฝ่ายบันทึกตรงกัน** (ลายเซ็นเดียวกัน) — บันทึกฝ่ายเดียว (ปลอม) ไม่นับ และหมดอายุใน 2 นาที
- เครดิต = (Volt ที่ได้ + มูลค่าของที่ได้) − (Volt ที่จ่าย + มูลค่าของที่ให้) — **ติดลบได้**: ผู้ซื้อที่แก้เกมให้ "ได้ของแต่ไม่หักเงิน" จะถูกจับ
- เซฟที่เกิดตอนกันเงินไว้แล้วแต่อีกฝ่ายยังไม่ยืนยัน: เซิร์ฟเวอร์ "พัก" ส่วนที่ลดลงไว้ (held) ไม่ให้หายไปกับเพดาน
- เกมรอให้รายการโอนของตัวเองถึงเซิร์ฟเวอร์ก่อนส่งเซฟเสมอ

### 4. บัญชีที่ถูกปฏิเสธ (player_bans)

เจ้าของใส่แถวในตาราง `player_bans` → บัญชีนั้นเซฟไม่ได้ บันทึกรายการโอนไม่ได้ และตอนล็อกอินขึ้นหน้าต่าง
"บัญชีถูกระงับ" พร้อมเหตุผล (ภาษาไทย) — ถอนแบน = ลบแถว

## ยังกันไม่ได้ (ข้อจำกัดตรง ๆ)

1. **โกงทีละน้อยใต้เพดาน** — ใครเพิ่ม Volt/EXP ให้ตัวเองช้ากว่าอัตราที่ยอม จะไม่ถูกจับ
   (เช่นเสก Volt ไม่เกิน ~4 ล้าน/ชม. หรือ EXP ไม่เกิน ~40,000/วินาที) — ตั้งเผื่อไว้กว้างเพื่อไม่ให้คนเล่นจริงโดนปฏิเสธ
   ดูความเร็วเลเวลผิดปกติได้จากมุมมอง `cheat_flags_summary` + ข้อมูลในตาราง `characters`
2. **ไม่ได้ตรวจว่า "ทำจริงไหม"** เช่น ฆ่ามอนจริง/ดรอปจริง — เซิร์ฟเวอร์ไม่ได้จำลองเกม (ระยะถัดไป: เซิร์ฟเวอร์สุ่มดรอป/EXP เอง)
3. **ของถูก ๆ ที่ปั๊ม** (มูลค่าต่ำ) — จับได้เฉพาะเมื่อรวมมูลค่าเกินเพดาน หรือ uid อุปกรณ์ซ้ำ
4. **สองบัญชีสมรู้ร่วมคิด** โยน Volt ไปมา — มูลค่ารวมของทั้งคู่ไม่เพิ่ม จึงไม่ใช่การเสกของ (แต่ถ้าฝ่ายจ่ายไม่หักเงินจริง → จับได้)
5. ตั้งค่า Stat/สกิล/Passive/รูน ภายในแต้มที่มี — ไม่ได้ตรวจทุกระบบย่อย (ตรวจเฉพาะ Stat)
6. **ไอเทม/Class ใหม่** ที่ยังไม่ได้รันไฟล์ data ใหม่ = ขึ้น `unknown_item` (อ่อน — ไม่ปฏิเสธ) และมูลค่าเป็น 0
   → ทุกครั้งที่เพิ่มไอเทม/Class/มอน: รัน `tools/gen_item_ids.js` แล้วรันไฟล์ `20261012000100_save_verify_data.sql` ใหม่
7. ในโหมด enforce ธงของเซฟที่ถูกปฏิเสธหายไปพร้อมการยกเลิก (ข้อจำกัดของ Postgres) — เกมของผู้เล่นสุจริตส่ง `rejected:<กติกา>` มาบอกแทน
   (เกมที่ถูกแก้อาจไม่ส่ง แต่เซฟก็ยังถูกปฏิเสธ)
8. เกมรุ่นเก่าที่ยังเปิดค้าง (ก่อนอัปเดต) ไม่บันทึกรายการโอน → คนที่ขายของให้เขาอาจขึ้นธง `worth_rate` ในช่วงเปลี่ยนผ่าน
   → **เปิดโหมด log ไว้อย่างน้อย 2–3 วัน** ก่อน enforce

## เปิดใช้บนเซิร์ฟเวอร์จริง (ทำเองใน Supabase Dashboard → SQL Editor)

1. รัน `supabase/migrations/20261012000000_save_verify.sql` ทั้งไฟล์ → Run
2. รัน `supabase/migrations/20261012000100_save_verify_data.sql` ทั้งไฟล์ → Run
3. ขึ้นเว็บเวอร์ชันเกมที่มี `js/save_verify.js` (ก่อนหรือหลังข้อ 1–2 ก็ได้ — เกมรองรับทั้งเซิร์ฟเวอร์เก่าและใหม่)
4. ตรวจ: `select mode from save_verify_config;` ต้องได้ `log`

## เปลี่ยนโหมด

```sql
update public.save_verify_config set mode = 'enforce', updated_at = now();  -- ปฏิเสธเซฟที่ผิดกติกา (ไม่ใช่กติกาอ่อน)
update public.save_verify_config set mode = 'log', updated_at = now();      -- จดธงอย่างเดียว (ค่าเริ่มต้น)
update public.save_verify_config set mode = 'off', updated_at = now();      -- ปิดการตรวจ
```

ก่อนเปลี่ยนเป็น enforce: ดูธงช่วงโหมด log ว่า **ไม่มีคนเล่นจริงโดน** (ดูข้างล่าง) ถ้ามี ให้ปรับค่าคงที่ก่อน

ปรับค่าคงที่ (เช่นลดเพดานมูลค่า) โดยไม่แก้โค้ด:

```sql
update public.save_verify_config set params = params || '{"worth_cap": 1500000, "safety": 4}'::jsonb;
update public.save_verify_config set soft_rules = soft_rules || '{stat_points}';  -- ให้กติกาไหน "จดอย่างเดียว"
```

ค่าที่ปรับได้: `kps` `safety` `worth_cap` `lv_cap` `lv_per_min` `max_elapsed` `new_char_worth` `pair_wait` `stat_slack` `need_frac` `stack_max` `zeny_max` `refine_max` `cards_max`

## อ่านธง

```sql
-- สรุปรายคน (ใครโดนบ่อย โดนกติกาไหน)
select * from public.cheat_flags_summary order by flags_24h desc, last_at desc;

-- รายละเอียดของคนหนึ่ง
select at, slot, rule, detail, mode, rejected from public.cheat_flags where user_id = '<uuid>' order by at desc limit 50;

-- กติกาไหนโดนบ่อยสุด 7 วัน (ถ้ากติกาหนึ่งโดนหลายคนพร้อมกัน = อาจตั้งแคบไป ไม่ใช่ทุกคนโกง)
select rule, count(*), count(distinct user_id) from public.cheat_flags where at > now() - interval '7 days' group by rule order by 2 desc;
```

`detail` บอกตัวเลข เช่น `worth_rate`: `gained` (มูลค่าที่เพิ่ม) `credit` (จากรายการโอน) `allowed` (ที่ถังมี) `seconds`
ธงซ้ำ (คนเดิม กติกาเดิม ช่องเดิม) ภายใน 10 นาทีจดครั้งเดียว — กันตารางบวม

ปฏิเสธผู้เล่น / ถอน:

```sql
insert into public.player_bans (user_id, reason) values ('<uuid>', 'ข้อมูลตัวละครไม่ตรงกับการเล่นจริง');
delete from public.player_bans where user_id = '<uuid>';
```

## เมื่อเซฟถูกปฏิเสธ ผู้เล่นเห็นอะไร

- ข้อความในแชท: "เซิร์ฟเวอร์ไม่รับเซฟล่าสุด (…) — เล่นต่อได้ตามปกติ ความคืบหน้ายังเก็บไว้ในเครื่องนี้"
- เกมลองส่งใหม่ห่างขึ้นเรื่อย ๆ (8 วิ → 20 วิ → 1 นาที)
- ปฏิเสธติดกัน 3 ครั้ง → หน้าต่างให้เลือก "เล่นต่อ" หรือ "โหลดเซฟจากเซิร์ฟเวอร์" — ก่อนโหลด เกมเก็บสำรองความคืบหน้าในเครื่องไว้ (`nm_rejected_backup_*`) ไม่ทิ้งเงียบ ๆ
- หน้าตั้งค่ามีบรรทัด "ตรวจเซฟล่าสุด: ผ่าน/ไม่ผ่าน · เวลา"

## ถอดระบบ (rollback)

ปิดเฉย ๆ (แนะนำ — ข้อมูลอยู่ครบ เปิดกลับได้): `update public.save_verify_config set mode = 'off';`

ถอดทั้งหมด:

```sql
drop trigger if exists characters_verify_save on public.characters;
drop function if exists public.characters_verify_save();
drop view if exists public.cheat_flags_summary;
drop function if exists public.market_record(text, uuid, uuid, text, int, bigint, text[]);
drop function if exists public.trade_record(text, uuid, jsonb, jsonb);
drop function if exists public.save_verify_report(text, jsonb);
drop function if exists public.my_ban();
drop function if exists public.save_verify_eval(uuid, jsonb, jsonb, timestamptz);
drop function if exists public.sv_ledger_guard(uuid, uuid);
drop function if exists public.is_banned(uuid);
drop function if exists public.sv_flag(jsonb, text, int, jsonb, text[]);
drop function if exists public.sv_descends(text, text);
drop function if exists public.sv_stat_spent(jsonb);
drop function if exists public.sv_stat_total(int);
drop function if exists public.sv_cum_job(int, int, numeric);
drop function if exists public.sv_need_job(int, int);
drop function if exists public.sv_cum_base(int, numeric);
drop function if exists public.sv_need_base(int);
drop function if exists public.sv_items_worth(jsonb);
drop function if exists public.sv_char_worth(jsonb);
drop function if exists public.sv_entries(jsonb);
drop function if exists public.sv_chars(jsonb);
drop function if exists public.sv_defaults();
drop function if exists public.sv_is_int(jsonb);
drop function if exists public.sv_num(jsonb);
drop table if exists public.transfer_ledger, public.cheat_flags, public.save_verify_state, public.player_bans,
  public.save_verify_jobs, public.save_verify_items, public.save_verify_config;
```

เกมที่มี `js/save_verify.js` ยังทำงานได้หลังถอด (เห็นว่าไม่มีฟังก์ชัน → ข้าม) · ข้อมูลเซฟผู้เล่นไม่ถูกแตะ
(ข้อสังเกต: trigger ทำให้ `updated_at` เป็นเวลาเซิร์ฟเวอร์ — หลังถอดจะกลับไปใช้เวลาจากเครื่องผู้เล่นตามเดิม)

## ทดสอบ

- `tests/saveverify_sql.js` — รัน SQL จริงบน Postgres ในเครื่อง (PGlite) แล้วเทียบผลทุกกรณีกับสำเนา JavaScript (46 ข้อ)
  `PGLITE=<โฟลเดอร์ node_modules ที่มี @electric-sql/pglite> node tests/saveverify_sql.js`
- `tests/saveverify.js` — เกมจริงในเบราว์เซอร์ + Supabase ปลอม: เล่นสุจริต / โกง / ตลาด / แลกเปลี่ยน / enforce / เซิร์ฟเวอร์เก่า / แบน
- แก้กติกา = แก้ทั้ง `save_verify_eval` ใน SQL และ `supabase/save_verify_rules.js` ให้ตรงกัน แล้วรันทั้งสองเทสต์
