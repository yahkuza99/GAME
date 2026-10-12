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

# ระยะ 1 — เศรษฐกิจฝั่งเซิร์ฟเวอร์ (Volt/ของ ย้ายที่ฐานข้อมูล)

> ไฟล์: `supabase/migrations/20261012001000_economy.sql` + `20261012001100_economy_data.sql` (ราคาร้าน/สูตรตีบวก — สร้างอัตโนมัติ) · ฝั่งเกม: `js/econ.js`

## เปลี่ยนอะไร

ระยะ 0 "ตรวจ" เซฟที่เครื่องผู้เล่นส่งมา · ระยะ 1 ให้ **เซิร์ฟเวอร์เป็นคนย้ายเงิน/ของเอง** สำหรับงานที่เกี่ยวกับเงินโดยตรง:

| งาน | เดิม (เครื่องผู้เล่นทำ) | ตอนนี้ (เซิร์ฟเวอร์ทำ) |
|---|---|---|
| ซื้อของร้าน NPC | เกมหักเงินเอง | `econ_shop_buy` — ราคาจากตารางเซิร์ฟเวอร์ ร้านต้องขายของชิ้นนั้นจริง |
| ขายของให้ร้าน NPC | เกมบวกเงินเอง | `econ_shop_sell` — ราคาขาย = ราคา ÷ 2 จากตารางเซิร์ฟเวอร์ ของต้องมีในเซฟบนเซิร์ฟเวอร์ |
| ตีบวก | เกมสุ่มเอง | `econ_refine` — **เซิร์ฟเวอร์สุ่ม** (แก้โอกาสในเครื่องไม่มีผล) หักค่าบริการ/แร่ |
| ตลาด: วางขาย/แก้ราคา/ยกเลิก | เกมย้ายของเข้า-ออกเอง | `econ_market_list/price/cancel` — รายการขาย (p.vend) เป็นของเซิร์ฟเวอร์ |
| ตลาด: ซื้อ | ผู้ซื้อ-ผู้ขายคุยกันเอง (ต้องออนไลน์ทั้งคู่ ต่างคนต่างย้าย) | `econ_market_buy` — ผู้ซื้อเรียกครั้งเดียว: หักเงิน + โอนของ + จ่ายผู้ขาย **ในทรานแซกชันเดียว** (ล็อกแถวทั้งคู่) |
| แลกเปลี่ยน | ต่างคนต่างส่งของ | `econ_trade` — ฝ่ายที่สองที่ยืนยันข้อเสนอตรงกัน = เซิร์ฟเวอร์สลับของทั้งคู่ทีเดียว |

- อุปกรณ์ที่เซิร์ฟเวอร์สร้าง/โอนได้ **uid ใหม่จากเซิร์ฟเวอร์** (≥ 1,000,000,000,000) — ไม่ชนกับ uid ที่เกมสร้าง
- อุปกรณ์ที่ออกจากตัวละครไปแล้ว (ขาย/วางตลาด/แลก) แต่โผล่กลับมาในเซฟ = **ของปั๊ม** → ธง `dup_item` (โหมด enforce: ตัดทิ้งก่อนบันทึก)
- ทุกการเปลี่ยนแปลงจดใน `econ_events` + เลขลำดับ `econSeq` ในเซฟตัวละคร
- **เซฟชนกันไม่ทำให้เงินหาย**: ถ้าเกมส่งเซฟที่ยังไม่รู้รายการล่าสุด (econSeq ต่ำกว่า) เซิร์ฟเวอร์เติมรายการที่ขาดให้ก่อนบันทึก (trigger `characters_econ_merge`)
- ผู้ขายในตลาด: ขายได้ทันทีที่ผู้ซื้อกด (เซิร์ฟเวอร์จ่ายให้) — เกมผู้ขายดึงรายการ (`econ_pull`) เมื่อได้ยินว่าขายได้ หรือทุก 15 วินาที

## ยังกันไม่ได้ในระยะ 1

- ของ/Volt ที่ได้จากการเล่น (ดรอปมอน เงินจากมอน รางวัลเควสต์ กาชา) ยังเกิดในเครื่องผู้เล่น → คุมด้วยกติกาของระยะ 0 (`worth_rate`) จนกว่าจะถึงระยะ 2
- ของกอง (ไม่มี uid) ที่ขายไปแล้วแต่เกมที่ถูกแก้ไม่ลบ — จับได้เมื่อมูลค่าเกินถัง (ระยะ 2 ปิดช่องนี้: ของกองเพิ่มได้จากเซิร์ฟเวอร์เท่านั้น)

## ปิด/เปิด

```sql
update public.save_verify_config set econ = false;  -- RPC ตอบ econ_off → เกมกลับไปใช้วิธีเดิม (ระยะ 0)
update public.save_verify_config set econ = true;
select public.econ_trim(30);                          -- เก็บกวาดรายการเก่ากว่า 30 วัน (ตั้ง pg_cron วันละครั้งได้)
```

# ระยะ 2 — EXP/ดรอปจากเซิร์ฟเวอร์ + บันทึกการเล่นแบบโซ่แฮช

> ไฟล์: `supabase/migrations/20261012002000_event_chain.sql` + `20261012002100_event_chain_data.sql` (มอน/แผนที่ — สร้างอัตโนมัติ) · ฝั่งเกม: `js/chain.js`

## ทำงานยังไง

1. ฆ่ามอนแล้ว **EXP ขึ้นทันทีในเครื่องเหมือนเดิม** (เลเวลอัป/ส่วนแบ่งปาร์ตี้ไม่หน่วง — เจ้าของสั่ง) แต่ **Volt/ของ เกมไม่ให้เอง** — จดเหตุการณ์ `{ seq, prev, t, k:'kill', a:[มอน, แผนที่, เลเวลตอนฆ่า, จำนวนเพื่อนปาร์ตี้, บอส?, Base EXP ที่ได้, Job EXP ที่ได้] }` ต่อกันเป็นโซ่
   แต่ละรายการมี `h = SHA-256(seq|prev|t|k|a…)` และ `prev` = แฮชของรายการก่อนหน้า (แก้ 1 รายการ = แฮชทุกตัวหลังจากนั้นเปลี่ยน)
2. ทุก 10 ตัว / 60 วินาที / ฆ่าบอสทันที เกมส่งชุดไป `submit_events` พร้อมเลขหมุด (anchor) ล่าสุดที่เซิร์ฟเวอร์ให้ไว้ (ของ/Volt มาช้าสุด ~1 นาที)
3. เซิร์ฟเวอร์ตรวจ:
   - **โซ่**: ต้องต่อจากหมุดล่าสุดจริง (seq ต่อเนื่อง · prev ตรง · คำนวณแฮชซ้ำตรง · เวลาไม่ย้อน) — ไม่ตรง = ปฏิเสธทั้งชุด + ธง `chain_break`
   - **ความเป็นไปได้**: มอนต้องเกิดในแผนที่นั้น (`kill_map`) · จำนวนฆ่าต่อแผนที่ไม่เกินจำนวนที่เกิดได้ตามเวลาจริงตั้งแต่หมุดก่อน และรวมไม่เกิน 3 ตัว/วินาที (`kill_rate`) · MVP/World Boss ฆ่าซ้ำในคูลดาวน์ไม่ได้ (`boss_cooldown`)
     — โหมด log: จดธงแต่รับ · โหมด enforce: ปฏิเสธชุดนั้น (ไม่ได้รางวัล)
4. **EXP ที่เกมอ้าง** ต้องตรงสูตรเดียวกับเกม (ส่วนต่างเลเวล + ส่วนแบ่งปาร์ตี้ คำนวณซ้ำจากตารางมอนของเซิร์ฟเวอร์ คลาดได้ ±1) และเลเวลที่อ้างลดลงไม่ได้ (ไม่ต่ำกว่าเลเวลสูงสุดที่โซ่อ้างแล้ว — หมุดเก็บไว้ · หมุดแรก = เลเวลในเซฟ) — ไม่ตรง = ธง `exp_mismatch` (enforce = ปฏิเสธชุด)
   EXP ที่ตรวจผ่าน (ไม่เกินที่สูตรให้) เป็น **เครดิต** ของตัวตรวจเซฟ (`save_verify_state.chars.<ตัว>.vb / vj`): เซฟที่ EXP เพิ่มตามการฆ่าที่ตรวจแล้วไม่กินถังอัตรา · ส่วนที่เกินยังโดน `exp_rate` — **เซิร์ฟเวอร์ไม่บวก EXP ให้อีก (ไม่ซ้ำ)**
   เซิร์ฟเวอร์ **ทอย Volt/ของเอง** ด้วย `random()` ของฐานข้อมูล: Volt · ของดรอปตามตาราง · ชิป · ตรากาชา · ยาโบนัส MVP
   → ใส่ลงเซฟในฐานข้อมูล (ขึ้นเลเวล/แต้ม Stat/แต้มสกิล แบบเดียวกับเกม) แล้วคืนผลให้เกมแสดง
5. ออกหมุดใหม่ = `HMAC-SHA256(ความลับ, user|ตัวละคร|seq|head)` ชุดถัดไปต้องต่อจากหมุดนี้ · ส่งชุดเดิมซ้ำ (คำตอบหาย) = `dup` ไม่ให้รางวัลซ้ำ
6. เน็ตหลุด/ปิดเกม: คิวเก็บในเครื่อง (สูงสุด 1,000 รายการ) ส่งตามลำดับเมื่อกลับมา · ถูกปฏิเสธ = ทิ้งชุดนั้น เริ่มต่อจากหมุดล่าสุดของเซิร์ฟเวอร์
7. เพื่อนปาร์ตี้ได้ส่วนแบ่ง EXP แบบเดิม (ผ่านช่องปาร์ตี้ — เครื่องผู้รับบวกเอง ไม่อยู่ในโซ่ของผู้รับ คุมด้วยถังอัตราของระยะ 0)

**ความลับ (secret)**: สร้างตอนรัน migration ในตาราง `chain_secret` (ผู้เล่นอ่านไม่ได้ ไม่อยู่ใน repo/เกม)
ย้ายเข้า Supabase Vault ได้ (แนะนำ): `select vault.create_secret((select secret from public.chain_secret), 'iv_chain_secret');` แล้ว `update public.chain_secret set secret = 'moved-to-vault';` —
ฟังก์ชัน `ch_secret()` อ่าน Vault ก่อนเสมอ · **ห้ามเปลี่ยนความลับระหว่างมีผู้เล่นออนไลน์** (หมุดเก่าตรวจไม่ผ่าน — ผู้เล่นแค่เริ่มโซ่ใหม่ ไม่เสียของ)

**พื้นที่ฐานข้อมูล (free tier)**: เก็บรายการดิบ 1 แถวต่อชุด (~2–6 KB) — ผู้เล่นล่าทั้งวัน ~1,000 ชุด/วัน · `select public.chain_trim(3);` เก็บ 3 วันล่าสุด
(ตั้ง pg_cron วันละครั้ง: `select cron.schedule('chain-trim', '0 4 * * *', 'select public.chain_trim(3); select public.econ_trim(30);');`)

## หลังเปิดระยะ 2 ให้ทุกคนแล้ว (ปิดช่องที่เหลือของระยะ 0)

Volt/ของจากมอนไม่ได้มาจากเซฟของเกมอีกต่อไป และ EXP จากการฆ่าของตัวเองมีเครดิตที่ตรวจแล้ว → ลดเพดานที่ยอมให้เซฟเพิ่มเองได้มาก (เหลือรางวัลเควสต์/รายวัน/กาชา/ส่วนแบ่งปาร์ตี้):

```sql
update public.save_verify_config set params = params || '{"kps": 0.2, "worth_cap": 1500000}'::jsonb;
```

ดูธงสัก 2–3 วันในโหมด log ก่อน ถ้าคนเล่นจริงไม่โดน ค่อยเปิด enforce

## ยังกันไม่ได้ในระยะ 2 (ตรง ๆ)

- เกมที่ถูกแก้ "อ้างว่าฆ่า" มอนที่มีอยู่จริงในแผนที่ ในอัตราที่เป็นไปได้ ได้ — เซิร์ฟเวอร์ไม่ได้จำลองการต่อสู้ (ได้เท่าคนเล่นจริงที่เก่งที่สุด ไม่ใช่ไม่จำกัด)
- โซ่แฮชพิสูจน์ "ลำดับและการไม่แก้ย้อนหลัง" ของสิ่งที่ส่งไปแล้ว — ไม่ได้พิสูจน์ว่าเหตุการณ์เกิดจริง (เครื่องผู้เล่นสร้างโซ่เองได้ก่อนส่ง)
- ส่วนแบ่ง EXP ที่ได้จากเพื่อนปาร์ตี้ / รางวัลเควสต์ / หีบรายวัน / กาชา ยังบวกในเครื่อง → คุมด้วยกติกาของระยะ 0
- EXP ที่เกมบวกทันทีถูกตรวจทีหลัง (ช้าสุด ~1 นาที) — เกมที่ถูกแก้ให้ EXP เกินจะถูกจับตอนส่งชุด/ตอนเซฟ ไม่ได้ถูกกันก่อนเกิด

# ลำดับเปิดใช้บนเซิร์ฟเวอร์จริง (ทั้ง 3 ระยะ)

> ระยะ 0 เปิดแล้ว (โหมด log) — ทำต่อจากข้อ 1 · ทุกไฟล์รันซ้ำได้ · ทำใน Supabase Dashboard → SQL Editor ทีละไฟล์

1. `20261012000100_save_verify_data.sql` **รันซ้ำ** (ตารางดรอปเปลี่ยนในรอบ 38 → ค่าฐาน `worth_per_kill` 388 → 573)
2. `20261012001000_economy.sql` → `20261012001100_economy_data.sql`
3. `20261012002000_event_chain.sql` → `20261012002100_event_chain_data.sql` (ไฟล์นี้แทนที่ `save_verify_eval` ของระยะ 0 ด้วยฉบับที่ใช้เครดิต EXP ที่ตรวจแล้ว — ถ้าเคยรันไฟล์รุ่นก่อนรอบ 40b ให้รันซ้ำทั้งไฟล์)
4. ตรวจ: `select econ, chain, mode from save_verify_config;` = `true, true, log` · `select count(*) from sv_mobs;` > 0 · `select count(*) from save_verify_items where shop;` > 0
5. ขึ้นเว็บเกมรุ่นนี้ (มี `js/econ.js` `js/chain.js`) — เกมรุ่นเก่าที่เปิดค้างยังเล่นได้ (ไม่เรียก RPC ใหม่) แต่ซื้อตลาดจากผู้ขายที่ใช้รุ่นใหม่ไม่ได้จนกว่าจะโหลดหน้าใหม่
6. ดูธง 2–3 วัน (`cheat_flags_summary`) → ลด params ตามหัวข้อด้านบน → ค่อย enforce
7. (ถ้ามี pg_cron) ตั้งงานเก็บกวาด `chain_trim` / `econ_trim`

ถ้าต้องเปิดทีละระยะ: ข้อ 2 อย่างเดียวได้ (ระยะ 1) · ระยะ 2 ต้องมีระยะ 1 ก่อน (ใช้ `ec_commit`/`econ_uid_seq`)

## ถอดระยะ 1–2 (rollback)

ปิดเฉย ๆ (แนะนำ — เกมกลับไปทำแบบเดิมเองทันที ไม่ต้องขึ้นเว็บใหม่):

```sql
update public.save_verify_config set chain = false;  -- เกมกลับไปทอยดรอป/EXP เอง
update public.save_verify_config set econ = false;   -- ร้าน/ตีบวก/ตลาด/แลกเปลี่ยน กลับไปทำในเครื่อง (+ บันทึกการโอนของระยะ 0)
```

ถอดทั้งหมด (หลังปิดแล้ว):

```sql
drop function if exists public.submit_events(text, bigint, jsonb), public.chain_head(text), public.chain_trim(int), public.ch_flag(uuid, text, jsonb),
  public.ch_anchor_json(public.event_anchors), public.ch_last(uuid, text), public.ch_exp_mul(int, int), public.ch_secret(), public.ch_canon(jsonb),
  public.ch_hmac(text, text), public.ch_sha(text), public.ec_exp(jsonb, numeric, numeric, int);
drop table if exists public.boss_kills, public.event_log, public.event_anchors, public.chain_secret, public.sv_map_mobs, public.sv_mobs;
drop trigger if exists characters_econ_merge on public.characters;
drop function if exists public.characters_econ_merge(), public.econ_merge_save(uuid, jsonb, jsonb), public.econ_trim(int), public.econ_pull(text, int),
  public.econ_trade_cancel(text), public.econ_trade(text, uuid, text, jsonb, jsonb), public.ec_give(jsonb, jsonb), public.ec_canon(jsonb),
  public.econ_market_buy(text, uuid, text, int, int, bigint, text), public.econ_market_price(text, int, bigint), public.econ_market_cancel(text, int),
  public.econ_market_list(text, jsonb, bigint), public.ec_vend(jsonb), public.econ_refine(text, text), public.econ_shop_sell(text, jsonb),
  public.econ_shop_buy(text, text, int), public.ec_result(int, jsonb), public.ec_uid(), public.ec_begin(text), public.ec_commit(uuid, text, jsonb, text, text),
  public.ec_apply(jsonb, jsonb, boolean), public.ec_idx(jsonb, text), public.ec_key(text);
drop table if exists public.econ_trades, public.econ_market_buys, public.econ_events;
drop sequence if exists public.econ_uid_seq;
alter table public.save_verify_config drop column if exists chain, drop column if exists econ;
alter table public.save_verify_items drop column if exists shop, drop column if exists price;
```

เซฟผู้เล่นไม่ถูกลบ (มีช่อง `econSeq` / uid เลขใหญ่ค้างอยู่ — เกมไม่ใช้ก็ไม่เป็นไร)

## ทดสอบ

- `tests/saveverify_sql.js` — รัน SQL จริงบน Postgres ในเครื่อง (PGlite) แล้วเทียบผลทุกกรณีกับสำเนา JavaScript (46 ข้อ)
  `PGLITE=<โฟลเดอร์ node_modules ที่มี @electric-sql/pglite> node tests/saveverify_sql.js`
- `tests/saveverify.js` — เกมจริงในเบราว์เซอร์ + Supabase ปลอม: เล่นสุจริต / โกง / ตลาด / แลกเปลี่ยน / enforce / เซิร์ฟเวอร์เก่า / แบน
- แก้กติกา = แก้ทั้ง `save_verify_eval` ใน SQL และ `supabase/save_verify_rules.js` ให้ตรงกัน แล้วรันทั้งสองเทสต์
- `tests/economy_sql.js` (ระยะ 1, PGlite 47 ข้อ) · `tests/economy.js` (ระยะ 1, เบราว์เซอร์ 23 ข้อ)
- `tests/chain_sql.js` (ระยะ 2, PGlite 32 ข้อ) · `tests/chain.js` (ระยะ 2, เบราว์เซอร์ 15 ข้อ)
