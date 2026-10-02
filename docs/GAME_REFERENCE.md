# NEO MIDGARD — เอกสารเกม (Game Reference)

> สร้างอัตโนมัติจากข้อมูลจริงในเกมด้วย `tools/make_reference.js` • อัปเดต 2026-10-02
> แก้ตัวเลขในไฟล์ `js/` แล้วรันสคริปต์ใหม่ เอกสารนี้จะตรงกับเกมเสมอ

## สารบัญ
1. [ภาพรวม](#ภาพรวม)
2. [ปรัชญาการออกแบบคลาส](#ปรัชญาการออกแบบคลาส)
3. [อาชีพ](#อาชีพ)
4. [สกิลทั้งหมด](#สกิลทั้งหมด)
5. [แผนที่](#แผนที่)
6. [มอนสเตอร์](#มอนสเตอร์)
7. [อาวุธ](#อาวุธ)
8. [ชุดเกราะและเครื่องแต่งกาย](#ชุดเกราะและเครื่องแต่งกาย)
9. [ชิป (การ์ด)](#ชิป-การ์ด)
10. [เซ็ตไอเทม](#เซ็ตไอเทม)
11. [ไอเทมใช้งาน](#ไอเทมใช้งาน)
12. [วัตถุดิบ](#วัตถุดิบ)
13. [ร้านค้า](#ร้านค้า)
14. [เควสต์เนื้อเรื่อง](#เควสต์เนื้อเรื่อง)
15. [ภารกิจประจำวัน](#ภารกิจประจำวัน)
16. [World Boss](#world-boss)
17. [กาชา Norn's Wheel](#กาชา-norns-wheel)

## ภาพรวม

MMORPG บนเบราว์เซอร์สไตล์ Ragnarok Online — โลกตำนานนอร์ส ทุกตัวละครเป็นแอนดรอยด์ (หน้ากากโลหะ + วิซอร์เรืองแสง ไม่มีดวงตา)

| หมวด | จำนวน |
|---|---|
| อาชีพคลาสแรก | 6 |
| อาชีพคลาส 2 | 12 |
| สกิล | 98 |
| แผนที่ | 8 |
| มอนสเตอร์ | 29 |
| อาวุธ | 75 |
| ชุดเกราะ/เครื่องแต่งกาย | 82 |
| ชิป (การ์ด) | 29 |
| ไอเทมใช้งาน | 14 |
| วัตถุดิบ | 40 |
| เซ็ตไอเทม | 6 |
| เควสต์เนื้อเรื่อง | 32 |

**เส้นทางเติบโต:** Novice → (Job Lv 10) คลาสแรก → (Base Lv 30 + Job Lv 21) คลาส 2 • เปลี่ยนอาชีพที่ Mimir AI ในนีโอเอลด์ไฮม์

## ปรัชญาการออกแบบคลาส

1. **ตำนานนอร์สก่อน แล้วแปลงเป็นหุ่นยนต์** — ทุกคลาสเริ่มจากบทบาทในตำนาน (ผู้ถูกเลือกแห่งวัลฮัลลา, หญิงพยากรณ์, นักรบหนังหมาป่า ...) แล้วตีความเป็นแอนดรอยด์ มีสีเรืองแสงประจำคลาสให้จำได้ทันที
2. **หนึ่งคลาส = หนึ่งตัวตน + หนึ่งราคาที่ต้องจ่าย** — อธิบายได้ในประโยคเดียว และมีจุดอ่อนชัด ไม่มีคลาสไหนเก่งทุกอย่าง
3. **คลาส 2 แตกเป็นทางแยกตรงข้ามกัน** — ตั้งรับ/บุก, ระเบิดทันที/ค่อยกัด, กว้าง/แม่น, ซัพพอร์ต/บู๊, ฆ่าเอง/ช่วยทีม, ฝูง/บอส
4. **โครงสกิลเหมือนกันทุกคลาส** — คลาสแรก 6 สกิล (พาสซีฟหลัก, เป้าเดียว, วงกว้าง, ยูทิลิตี้/บัฟ, ดึง/ยิงไกล, พาสซีฟเสริม) • คลาส 2 เพิ่ม 5 สกิล • แต้มไม่พอเก็บทุกสกิล ต้องเลือก • สกิลที่ใช้บ่อยเก่งขึ้นเอง (ความชำนาญ)
5. **สเตตัสอิสระแบบ RO แต่ทุกคลาสมี 2 สเตตัสหลัก** — ทั้ง 6 สเตตัสมีเจ้าของ (LUK = สายคริติคอล)
6. **เติบโตชัด เล่นคนเดียวได้** — คลาส 2 แรงกว่าคลาสแรกอย่างน้อย ~41% • เล่นปาร์ตี้ดีกว่าแต่ไม่บังคับ

| คลาสแรก | ทาง A | ทาง B |
|---|---|---|
| Einherjar — แทงค์ แนวหน้า | **Valkyrie Knight** — แทงค์ศักดิ์สิทธิ์ ปกป้องและลงทัณฑ์ | **Hersir Vanguard** — นักรบบุกทะลวง ดาเมจแรงแต่ยังทน |
| Rune Caster — เวทธาตุระยะไกล | **Galdr Sage** — เวทวงกว้าง ฝนอุกกาบาตและน้ำแข็ง | **Seidr Witch** — เวทมืด คำสาป พิษ |
| Wildhunter — ธนูระยะไกล + สัตว์คู่ใจ | **Skadi Ranger** — ธนูน้ำแข็ง ห่าธนูวงกว้าง | **Ullr Sniper** — ยิงไกล เป้าเดียวแรงที่สุด |
| Völva — ฮีล บัฟ ปราบอมตะ | **Norn Oracle** — ฮีลใหญ่ บัฟชะตา แสงพิพากษา | **Gythja Monk** — นักบวชสายบู๊ หมัดศักดิ์สิทธิ์ระยะประชิด |
| Loki's Trickster — ว่องไว คริติคอล ลอบโจมตี | **Loki's Phantom** — คริติคอลรุนแรง ฟันเงาซ้อน | **Skald Bard** — บทเพลงบัฟ คลื่นเสียงระยะกลาง |
| Berserker — แลก HP เป็นพลังโจมตี | **Ulfhednar Warlord** — ฟันวงกว้าง ยิ่งเจ็บยิ่งไม่ตาย | **Jotun Breaker** — ทุบเป้าเดียวแรงที่สุด แลกเลือด |

## อาชีพ

### คลาสแรก

| อาชีพ | ชื่อไทย | บทบาท | สเตตัสหลัก | HP × | SP × | ความเร็วตี (ms) | Job สูงสุด | อาวุธ | ความยาก |
|---|---|---|---|---|---|---|---|---|---|
| Einherjar | นักรบวิญญาณ | แทงค์ แนวหน้า | STR / VIT | 1.8 | 0.9 | 1200 | 26 | ดาบ + โล่ | ★ |
| Rune Caster | นักเวทรูน | เวทธาตุระยะไกล | INT / DEX | 0.8 | 2 | 1500 | 26 | คทา | ★★ |
| Wildhunter | นักล่าแห่งป่า | ธนูระยะไกล + สัตว์คู่ใจ | DEX / AGI | 1.1 | 1.2 | 1400 | 26 | ธนู | ★★ |
| Völva | นักพยากรณ์แห่งแสง | ฮีล บัฟ ปราบอมตะ | INT / VIT | 1.3 | 1.6 | 1400 | 26 | กระบอง | ★★ |
| Loki's Trickster | นักลวงแห่งโลกิ | ว่องไว คริติคอล ลอบโจมตี | AGI / LUK | 1.3 | 1 | 1200 | 26 | มีดสั้น | ★★★ |
| Berserker | นักรบคลั่ง | แลก HP เป็นพลังโจมตี | STR / AGI | 1.6 | 0.7 | 1250 | 26 | ขวาน | ★★ |

### คลาส 2

| อาชีพ | ชื่อไทย | มาจาก | บทบาท | สเตตัสหลัก | HP × | SP × | ความเร็วตี (ms) | โบนัสคลาส |
|---|---|---|---|---|---|---|---|---|
| Valkyrie Knight | อัศวินวาลคิรี | Einherjar | แทงค์ศักดิ์สิทธิ์ ปกป้องและลงทัณฑ์ | STR / VIT | 2.1 | 1 | 1150 | ATK% +15, MATK% +10, HIT +10, HP% +10 |
| Hersir Vanguard | แนวหน้าเฮิร์เซียร์ | Einherjar | นักรบบุกทะลวง ดาเมจแรงแต่ยังทน | STR / VIT | 1.9 | 0.95 | 1100 | ATK% +10, MATK% +10, HIT +10, HP% +10 |
| Galdr Sage | ปราชญ์กัลดร์ | Rune Caster | เวทวงกว้าง ฝนอุกกาบาตและน้ำแข็ง | INT / DEX | 0.95 | 2.4 | 1450 | ATK% +10, MATK% +10, HIT +10, HP% +10 |
| Seidr Witch | แม่มดเซดร์ | Rune Caster | เวทมืด คำสาป พิษ | INT / DEX | 1 | 2.3 | 1450 | ATK% +10, MATK% +10, HIT +10, HP% +10 |
| Skadi Ranger | เรนเจอร์แห่งสกาดี | Wildhunter | ธนูน้ำแข็ง ห่าธนูวงกว้าง | DEX / AGI | 1.25 | 1.5 | 1200 | ATK% +20, MATK% +10, HIT +10, HP% +10 |
| Ullr Sniper | สไนเปอร์แห่งอุลล์ | Wildhunter | ยิงไกล เป้าเดียวแรงที่สุด | DEX / LUK | 1.2 | 1.45 | 1200 | ATK% +25, MATK% +10, HIT +10, HP% +10 |
| Norn Oracle | นอร์นผู้ทอชะตา | Völva | ฮีลใหญ่ บัฟชะตา แสงพิพากษา | INT / VIT | 1.45 | 1.9 | 1350 | ATK% +10, MATK% +15, HIT +10, HP% +10 |
| Gythja Monk | นักบวชหมัดเทพ | Völva | นักบวชสายบู๊ หมัดศักดิ์สิทธิ์ระยะประชิด | STR / VIT | 1.6 | 1.4 | 1100 | ATK% +15, MATK% +10, HIT +10, HP% +10 |
| Loki's Phantom | ภูตลวงแห่งโลกิ | Loki's Trickster | คริติคอลรุนแรง ฟันเงาซ้อน | AGI / LUK | 1.45 | 1.1 | 1100 | ATK% +10, MATK% +10, HIT +10, HP% +10 |
| Skald Bard | สคาลด์ กวีสงคราม | Loki's Trickster | บทเพลงบัฟ คลื่นเสียงระยะกลาง | AGI / DEX | 1.35 | 1.25 | 1150 | ATK% +10, MATK% +10, HIT +10, HP% +10 |
| Ulfhednar Warlord | จอมทัพอุลฟ์เฮดนาร์ | Berserker | ฟันวงกว้าง ยิ่งเจ็บยิ่งไม่ตาย | STR / AGI | 1.85 | 0.8 | 1250 | ATK% +5, MATK% +10, HIT +10, HP% +10 |
| Jotun Breaker | ผู้พิฆาตโยตุน | Berserker | ทุบเป้าเดียวแรงที่สุด แลกเลือด | STR / VIT | 1.8 | 0.75 | 1300 | ATK% +10, MATK% +10, HIT +10, HP% +10 |

### Novice (ผู้เริ่มต้น)

**

- **วิธีเล่น:** ช่วงฝึกพื้นฐาน ตีมอนในทุ่งหญ้ามรกตจนได้ Job Lv 10 แล้วไปหา Mimir AI เพื่อเลือกคลาสแรก
- **จุดเด่น:** ไม่ต้องคิดมาก ตายไม่เสีย EXP
- **จุดอ่อน:** ยังไม่มีสกิลโจมตี
- **สเตตัสแนะนำ:** STR 40% / AGI 30% / VIT 30%
- **ลำดับอัปสกิล:** Basic Training 9
- **เคล็ดลับ:** แต้มสเตตัสที่ใส่ตอนนี้ใช้ต่อได้ แนะนำใส่ตามคลาสที่ตั้งใจจะเป็น (รีเซ็ตได้ที่ Mimir)

| สกิล | ชนิด | เลเวลสูงสุด | คูลดาวน์ | คำอธิบาย |
|---|---|---|---|---|
| First Aid | กดใช้ | 1 | 4 วิ | ปฐมพยาบาล ฟื้นฟู HP 8 หน่วย |
| Basic Training | ติดตัว | 9 | - | ฝึกฝนพื้นฐาน ATK +2 และ MaxHP +2% ต่อเลเวล |

### Einherjar (นักรบวิญญาณ)

*นักรบผู้ถูกเลือกจากวัลฮัลลา ยืนแนวหน้า ทนทานที่สุด ดึงศัตรูเข้าหาตัวและฟาดด้วยโล่*

- **วิธีเล่น:** ยืนแนวหน้า ดึงมอนด้วย War Cry / Shield Throw แล้วฟาด Shield Slam ให้มึน ฝูงใหญ่ใช้ Whirlwind
- **จุดเด่น:** ทนที่สุด ตายยาก เหมาะมือใหม่
- **จุดอ่อน:** ฆ่าช้ากว่าสายดาเมจ SP น้อย
- **สเตตัสแนะนำ:** VIT 50% / STR 40% / DEX 10%
- **ลำดับอัปสกิล:** Iron Body 5 → Shield Slam 5 → Whirlwind 5 → Valhalla's Oath 5 → War Cry 3 → Shield Throw 2
- **เคล็ดลับ:** VIT ช่วยแรงตีด้วย (เฉพาะสายนี้) • Valhalla's Oath ลด SP ที่ใช้ ช่วยให้กดสกิลได้นานขึ้น

| สกิล | ชนิด | เลเวลสูงสุด | คูลดาวน์ | คำอธิบาย |
|---|---|---|---|---|
| Iron Body | ติดตัว | 5 | - | ร่างเหล็ก MaxHP +5%, DEF +1, ATK +5 และ HIT +2 ต่อเลเวล (Einherjar: VIT ช่วยเพิ่มแรงตีด้วย) |
| Shield Slam | กดใช้ | 5 | 2 วิ | ฟาดโล่ใส่ศัตรู 240~400% โอกาสทำให้มึน 2 วินาที |
| War Cry | กดใช้ | 5 | 12 วิ | คำรามท้าทาย ดึงมอนสเตอร์รอบตัว 6 ช่องเข้าหา และเพิ่ม DEF +4×Lv |
| Whirlwind | กดใช้ | 5 | 5 วิ | หมุนตัวฟันทุกตัวรอบกาย 2 ช่อง 170~290% และผลักถอย |
| Shield Throw | กดใช้ | 5 | 3 วิ | ขว้างโล่ใส่ศัตรูระยะ 6 ช่อง 190~310% ทำให้ช้าลง (ดึงมอนจากไกลได้) |
| Valhalla's Oath | ติดตัว | 5 | - | คำสาบานแห่งวัลฮัลลา สกิลใช้ SP น้อยลง 4%×Lv, ต้านมึน +8%×Lv และ MaxSP +4×Lv |

### Rune Caster (นักเวทรูน)

*ผู้จารึกอักษรรูนโบราณเพื่อเรียกพลังธาตุ ไฟ น้ำแข็ง และสายฟ้า โจมตีแรงแต่ตัวบาง*

- **วิธีเล่น:** ยิงเวทจากระยะไกล Ice Rune ทำให้ช้าก่อนเข้าถึงตัว Fire Rune เผาต่อเนื่อง ฝูงใหญ่ใช้ Thunder Rune
- **จุดเด่น:** ดาเมจสูงสุด ฆ่าเร็วที่สุด
- **จุดอ่อน:** ตัวบาง ใช้ยาเยอะ ร่ายนาน
- **สเตตัสแนะนำ:** INT 60% / DEX 30% / VIT 10%
- **ลำดับอัปสกิล:** Rune Mastery 5 → Fire Rune 5 → Thunder Rune 5 → Runic Ward 5 → Ice Rune 3 → Earth Rune 2
- **เคล็ดลับ:** DEX ลดเวลาร่าย • Runic Ward เพิ่ม HP/MDEF ช่วยให้รอดง่ายขึ้นมาก

| สกิล | ชนิด | เลเวลสูงสุด | คูลดาวน์ | คำอธิบาย |
|---|---|---|---|---|
| Rune Mastery | ติดตัว | 5 | - | ชำนาญรูน MATK +5% และลดเวลาร่าย 6% ต่อเลเวล |
| Fire Rune | กดใช้ | 5 | 2.5 วิ | รูนเพลิง 160~280% MATK ธาตุไฟ และเผาไหม้ต่อเนื่อง |
| Ice Rune | กดใช้ | 5 | 2 วิ | หอกน้ำแข็ง 135~235% MATK ธาตุน้ำ และทำให้ศัตรูช้าลงครึ่งหนึ่ง |
| Thunder Rune | กดใช้ | 5 | 8 วิ | สายฟ้าแห่งธอร์ ฟาดทุกตัวในรัศมี 2 ช่องรอบเป้าหมาย 110~190% ธาตุลม |
| Earth Rune | กดใช้ | 5 | 4 วิ | รูนแผ่นดินยกหินขึ้นรอบเป้า 1.5 ช่อง 145~245% ธาตุดิน อาจทำให้มึน |
| Runic Ward | ติดตัว | 5 | - | เกราะรูนรอบกาย MaxHP +4%×Lv, MaxSP +4%×Lv และ MDEF +2×Lv (ตัวบางน้อยลง) |

### Wildhunter (นักล่าแห่งป่า)

*นักล่าผู้เติบโตในป่าลึก ยิงธนูทะลุแนวศัตรู วางกับดัก และมีหมาป่าคู่ใจช่วยสู้*

- **วิธีเล่น:** ยิงจากระยะไกล Piercing Arrow ทะลุแนว มอนเข้าใกล้ใช้ Charge Arrow ผลักออก หมาป่าช่วยรับดาเมจ
- **จุดเด่น:** ปลอดภัย ระยะยิงไกล มีสัตว์คู่ใจ
- **จุดอ่อน:** ดาเมจต่อเป้าปานกลาง
- **สเตตัสแนะนำ:** DEX 60% / AGI 30% / LUK 10%
- **ลำดับอัปสกิล:** Eagle Eye 5 → Piercing Arrow 5 → Hunter's Rhythm 5 → Blast Trap 4 → Wolf Companion 3 → Charge Arrow 3
- **เคล็ดลับ:** DEX = แรงยิง + แม่นยำ • AGI = ยิงเร็ว

| สกิล | ชนิด | เลเวลสูงสุด | คูลดาวน์ | คำอธิบาย |
|---|---|---|---|---|
| Eagle Eye | ติดตัว | 5 | - | ตาเหยี่ยว ระยะธนู +1 ช่อง, HIT +3, DEX +1 ต่อเลเวล |
| Piercing Arrow | กดใช้ | 5 | 1.5 วิ | ยิงธนูทะลุทุกตัวในแนวเส้นตรง 140~220% (ต้องใช้ธนู) |
| Wolf Companion | กดใช้ | 5 | 20 วิ | เรียกหมาป่าคู่ใจมาช่วยสู้ 30~70 วินาที ความแรงตามเลเวลสกิลและ ATK |
| Blast Trap | กดใช้ | 5 | 4 วิ | วางกับดักระเบิดที่เท้า (สูงสุด 3 อัน) ระเบิดไฟรัศมี 1.5 ช่อง แรงตาม DEX |
| Charge Arrow | กดใช้ | 5 | 3 วิ | ลูกธนูอัดแรง 180~300% ผลักศัตรูถอย 3 ช่อง (เว้นระยะ) |
| Hunter's Rhythm | ติดตัว | 5 | - | จังหวะนักล่า ความเร็วโจมตี +2%×Lv และแรงคริติคอล +4%×Lv |

### Völva (นักพยากรณ์แห่งแสง)

*ผู้หยั่งรู้ที่ได้รับพรจากเทพี ฟื้นฟูตนเอง อวยพรพลัง และแทงหอกแสงใส่ปีศาจ*

- **วิธีเล่น:** ฮีลตัวเองด้วย Light of Freyja บัฟด้วย Blessing of Odin แล้วแทง Holy Spear แรงมากกับอมตะ/ปีศาจ
- **จุดเด่น:** ยืนระยะยาว แทบไม่ต้องใช้ยา
- **จุดอ่อน:** ฆ่าช้ากับมอนธาตุศักดิ์สิทธิ์
- **สเตตัสแนะนำ:** INT 50% / VIT 40% / DEX 10%
- **ลำดับอัปสกิล:** Sanctuary 5 → Light of Freyja 5 → Holy Spear 5 → Blessing of Odin 5 → Freyja's Grace 3 → Divine Shield 2
- **เคล็ดลับ:** ไปล่าในโพรงเฮล (อมตะเยอะ) จะคุ้มที่สุด

| สกิล | ชนิด | เลเวลสูงสุด | คูลดาวน์ | คำอธิบาย |
|---|---|---|---|---|
| Sanctuary | ติดตัว | 5 | - | แสงคุ้มครอง ฟื้นฟู HP เพิ่ม 1.5~3.5% ของ MaxHP ทุกรอบ, MDEF +1 ต่อเลเวล |
| Light of Freyja | กดใช้ | 5 | 3 วิ | แสงของเทพีเฟรยา ฟื้นฟู HP ตาม Base Lv และ INT (คลิกมอนสเตอร์อมตะเพื่อทำร้าย) |
| Blessing of Odin | กดใช้ | 5 | 15 วิ | พรแห่งโอดิน STR, INT, DEX +2×Lv นาน 90~210 วินาที |
| Holy Spear | กดใช้ | 5 | 2 วิ | หอกแสงศักดิ์สิทธิ์ 160~280% MATK รุนแรงมากกับอมตะ |
| Divine Shield | กดใช้ | 5 | 30 วิ | โล่ศักดิ์สิทธิ์ DEF +4×Lv และ MDEF +4×Lv |
| Freyja's Grace | ติดตัว | 5 | - | พรแห่งเฟรยา ฮีลแรงขึ้น 6%×Lv, MaxSP +4%×Lv และ MDEF +1×Lv |

### Loki's Trickster (นักลวงแห่งโลกิ)

*สาวกของโลกิ เทพแห่งกลลวง หายตัวในควัน แทงข้างหลัง และอาบพิษบนใบมีด*

- **วิธีเล่น:** หายตัวด้วย Smoke Veil แล้ว Backstab เปิดดาเมจ อาบพิษด้วย Venom Blade ตีเร็วคริบ่อย
- **จุดเด่น:** หลบเก่ง ตีเร็ว คริแรง
- **จุดอ่อน:** ต้องเล่นเป็นจังหวะ พลาดแล้วเจ็บ
- **สเตตัสแนะนำ:** AGI 50% / STR 30% / LUK 20%
- **ลำดับอัปสกิล:** Shadow Step 5 → Backstab 5 → Venom Blade 5 → Loki's Gambit 5 → Throwing Knife 3 → Smoke Veil 2
- **เคล็ดลับ:** มีดสั้นได้แรงตีจาก AGI ด้วย • LUK เพิ่มคริติคอล

| สกิล | ชนิด | เลเวลสูงสุด | คูลดาวน์ | คำอธิบาย |
|---|---|---|---|---|
| Shadow Step | ติดตัว | 5 | - | ก้าวเงา FLEE +5, CRIT +2 และ ATK +4 ต่อเลเวล |
| Backstab | กดใช้ | 5 | 2.5 วิ | แทงข้างหลัง 250~450% ถ้าศัตรูยังไม่ได้สู้กับคุณ (ถ้ากำลังสู้อยู่ 190~310%) ไม่มีพลาด |
| Smoke Veil | กดใช้ | 5 | 15 วิ | หายตัวในม่านควัน 4~8 วินาที มอนสเตอร์ลืมคุณ และการโจมตีแรกจะคริติคอลแน่นอน |
| Venom Blade | กดใช้ | 5 | 15 วิ | อาบพิษบนอาวุธ ATK +8×Lv และโอกาสทำให้ติดพิษทุกครั้งที่โจมตี |
| Throwing Knife | กดใช้ | 5 | 1.5 วิ | ปามีดระยะ 6 ช่อง 170~290% มีโอกาสติดพิษ |
| Loki's Gambit | ติดตัว | 5 | - | เล่ห์กลของโลกิ แรงคริติคอล +6%×Lv, CRIT +1×Lv และเดินเร็วขึ้น 2%×Lv |

### Berserker (นักรบคลั่ง)

*นักรบหนังหมาป่า (Úlfhéðnar) ยิ่งบาดเจ็บยิ่งดุร้าย ใช้เลือดตัวเองแลกพลังทำลายล้าง*

- **วิธีเล่น:** ยิ่ง HP น้อยยิ่งแรง แลกเลือดด้วย Rage Strike / Blood Frenzy แล้วดูดเลือดคืนด้วย Bloodthirst
- **จุดเด่น:** ดาเมจกายภาพสูง ฟาร์มเร็ว
- **จุดอ่อน:** เสี่ยงตายถ้าประมาท ใช้ยาแดงเยอะ
- **สเตตัสแนะนำ:** STR 50% / AGI 35% / VIT 15%
- **ลำดับอัปสกิล:** Wolf Blood 5 → Rage Strike 5 → Blood Frenzy 5 → Bloodthirst 5 → Axe Throw 3 → Howl 2
- **เคล็ดลับ:** ตั้งปั๊มยา HP ไว้ราว 40% จะเล่นสบายขึ้น

| สกิล | ชนิด | เลเวลสูงสุด | คูลดาวน์ | คำอธิบาย |
|---|---|---|---|---|
| Wolf Blood | ติดตัว | 5 | - | เลือดหมาป่า ยิ่ง HP น้อยยิ่งตีแรง (สูงสุด +10%×Lv เมื่อใกล้ตาย), MaxHP +2%×Lv |
| Rage Strike | กดใช้ | 5 | 1.5 วิ | ฟาดสุดแรง 190~310% โดยแลกกับ HP 5% ของ HP ปัจจุบัน |
| Blood Frenzy | กดใช้ | 5 | 25 วิ | คลั่งเลือด เสีย HP 10% แลกกับความเร็วโจมตี +8~20% และ ATK +5×Lv |
| Howl | กดใช้ | 5 | 10 วิ | หอนสะท้านป่า ทำร้ายรอบตัว 2.5 ช่อง 115~175% และทำให้ศัตรูหวาดกลัว (มึน) |
| Axe Throw | กดใช้ | 5 | 3 วิ | ขว้างขวานระยะ 5 ช่อง 215~355% เสีย HP 3% |
| Bloodthirst | ติดตัว | 5 | - | กระหายเลือด ดาเมจกายภาพดูดกลับเป็น HP 0.6%×Lv และดาเมจกายภาพ +2%×Lv |

### Valkyrie Knight (อัศวินวาลคิรี)

*ผู้เลือกวิญญาณแห่งสมรภูมิ ถือโล่ทองและหอกแสง ยืนรับแทนทุกคนแล้วฟาดคืนเป็นแผ่นดินไหว*

- **วิธีเล่น:** แทงค์ที่ฮีลตัวเองได้ ดึงฝูงด้วย Einherjar Guard แล้วกระแทก Judgment Quake ใส่ทั้งวง
- **จุดเด่น:** ทนที่สุดในเกม ฮีลตัวเองได้
- **จุดอ่อน:** ดาเมจไม่สูง
- **สเตตัสแนะนำ:** VIT 50% / STR 40% / DEX 10%
- **ลำดับอัปสกิล:** Aegis Wall 5 → Spear of Valhalla 5 → Judgment Quake 5 → Einherjar Guard 5 → Valhalla's Call 5
- **เคล็ดลับ:** เหมาะเป็นแทงค์ตอนตี World Boss กับเพื่อน

| สกิล | ชนิด | เลเวลสูงสุด | คูลดาวน์ | คำอธิบาย |
|---|---|---|---|---|
| Aegis Wall | ติดตัว | 5 | - | กำแพงอีจิส DEF +3×Lv, MDEF +2×Lv และ MaxHP +4%×Lv |
| Spear of Valhalla | กดใช้ | 5 | 2 วิ | พุ่งหอกแสงทะลุแนวศัตรูระยะ 4 ช่อง 330~530% ธาตุศักดิ์สิทธิ์ |
| Einherjar Guard | กดใช้ | 5 | 20 วิ | ตั้งการ์ดวิญญาณนักรบ ดึงศัตรูรอบ 7 ช่อง DEF +5×Lv, MDEF +3×Lv และต้านมึน +10%×Lv |
| Judgment Quake | กดใช้ | 5 | 7 วิ | กระแทกโล่ลงดิน แผ่นดินไหวรอบตัว 3 ช่อง 205~345% อาจทำให้มึน |
| Valhalla's Call | กดใช้ | 5 | 12 วิ | เสียงเรียกจากวัลฮัลลา ฟื้นฟู HP 11~23% ของ MaxHP |

### Hersir Vanguard (แนวหน้าเฮิร์เซียร์)

*ขุนศึกผู้นำทัพบุกก่อนใคร พุ่งชาร์จเข้าใส่และหมุนหอกเจาะแนว ไม่ได้ยืนรับ แต่บุกไปจบเอง*

- **วิธีเล่น:** บุกก่อน: Charge Strike พุ่งเข้าหา Spiral Pierce เจาะแนว แล้วปิดด้วย Ragnar's Fury รอบตัว
- **จุดเด่น:** ดาเมจสูงแต่ยังทน
- **จุดอ่อน:** ป้องกันน้อยกว่าวาลคิรี
- **สเตตัสแนะนำ:** STR 55% / VIT 35% / DEX 10%
- **ลำดับอัปสกิล:** Hersir Might 5 → Charge Strike 5 → Spiral Pierce 5 → Battle Aura 5 → Ragnar's Fury 5
- **เคล็ดลับ:** อัป STR มากกว่าสายแรก เพราะสกิลเน้นตี

| สกิล | ชนิด | เลเวลสูงสุด | คูลดาวน์ | คำอธิบาย |
|---|---|---|---|---|
| Hersir Might | ติดตัว | 5 | - | พลังขุนศึก ดาเมจกายภาพ +3%×Lv, STR +1×Lv และ HIT +2×Lv |
| Charge Strike | กดใช้ | 5 | 3 วิ | พุ่งชาร์จใส่ศัตรูระยะ 5 ช่อง 285~465% ผลักถอยและอาจทำให้มึน |
| Spiral Pierce | กดใช้ | 5 | 3 วิ | หมุนหอกเจาะทะลุแนว 3 ช่อง 2 ครั้ง ครั้งละ 215~355% |
| Battle Aura | กดใช้ | 5 | 30 วิ | ออร่าสงคราม ATK +6×Lv, ความเร็วโจมตี +2%×Lv และ HIT +3×Lv |
| Ragnar's Fury | กดใช้ | 5 | 6 วิ | ฟาดรอบตัวด้วยโทสะของรักนาร์ 2 ช่อง 240~400% |

### Galdr Sage (ปราชญ์กัลดร์)

*ผู้ขับขานบทกัลดร์ เสียงร้องของเขาเปลี่ยนรูนให้เป็นพายุ ทำลายทั้งฝูงในคราวเดียว*

- **วิธีเล่น:** รวมมอนแล้ว Meteor Rune / Frost Nova ล้างทั้งฝูง มอนเข้าใกล้ Frost Nova ทำให้ช้าแล้วถอย
- **จุดเด่น:** เวทวงกว้างแรงที่สุด
- **จุดอ่อน:** ตัวบาง ร่ายนาน
- **สเตตัสแนะนำ:** INT 60% / DEX 30% / VIT 10%
- **ลำดับอัปสกิล:** Galdr Focus 5 → Meteor Rune 5 → Frost Nova 5 → Rune Barrier 5 → Chain Lightning 5
- **เคล็ดลับ:** เปิด Rune Barrier ไว้ตลอด จะรอดง่ายขึ้นมาก

| สกิล | ชนิด | เลเวลสูงสุด | คูลดาวน์ | คำอธิบาย |
|---|---|---|---|---|
| Galdr Focus | ติดตัว | 5 | - | สมาธิแห่งบทขับ MATK +4%×Lv, MaxSP +4%×Lv และร่ายเร็วขึ้น 3%×Lv |
| Meteor Rune | กดใช้ | 5 | 6 วิ | เรียกอุกกาบาตรูนตกใส่ รัศมี 2.5 ช่อง 185~325% ธาตุไฟ อาจติดไฟ |
| Frost Nova | กดใช้ | 5 | 8 วิ | ระเบิดน้ำแข็งรอบตัว 3 ช่อง 145~245% และทำให้ศัตรูช้าลง |
| Chain Lightning | กดใช้ | 5 | 3 วิ | สายฟ้าฟาดซ้ำ 3 ครั้ง ครั้งละ 80~140% ธาตุลม |
| Rune Barrier | กดใช้ | 5 | 30 วิ | ม่านรูนป้องกัน MDEF +4×Lv, DEF +3×Lv และ MaxHP +3%×Lv |

### Seidr Witch (แม่มดเซดร์)

*ผู้ฝึกเวทเซดร์ต้องห้ามของวานาเฮล์ม ดึงพลังจากความมืดใต้ราก สาปศัตรูให้เปื่อยช้า ๆ แล้วแทงด้วยหอกความว่างเปล่า*

- **วิธีเล่น:** สาปด้วย Hex of Hel ให้ติดพิษ แล้วยิง Soul Drain รัว ๆ ปิดเป้าแข็งด้วย Void Lance
- **จุดเด่น:** ร่ายไวที่สุด ดาเมจต่อเนื่อง
- **จุดอ่อน:** แรงน้อยกับมอนธาตุมืด/อมตะ
- **สเตตัสแนะนำ:** INT 60% / DEX 25% / VIT 15%
- **ลำดับอัปสกิล:** Seidr Lore 5 → Soul Drain 5 → Hex of Hel 5 → Void Lance 5 → Dark Nova 5
- **เคล็ดลับ:** ธาตุมืดแรงกับมอนศักดิ์สิทธิ์ (เช่น Seraph Core)

| สกิล | ชนิด | เลเวลสูงสุด | คูลดาวน์ | คำอธิบาย |
|---|---|---|---|---|
| Seidr Lore | ติดตัว | 5 | - | ตำราเซดร์ MATK +3%×Lv, ร่ายเร็วขึ้น 4%×Lv และ MaxSP +6×Lv |
| Soul Drain | กดใช้ | 5 | 1.5 วิ | ดูดวิญญาณศัตรู 195~335% ธาตุมืด |
| Hex of Hel | กดใช้ | 5 | 5 วิ | คำสาปของเฮล รัศมี 1.5 ช่อง 120~200% และทำให้ติดพิษ 7~11 วินาที |
| Dark Nova | กดใช้ | 5 | 8 วิ | ระเบิดความมืดรอบตัว 3 ช่อง 170~290% และทำให้ช้าลง |
| Void Lance | กดใช้ | 5 | 4 วิ | หอกความว่างเปล่า เป้าเดียว 315~535% ธาตุวิญญาณ ไม่พลาด |

### Skadi Ranger (เรนเจอร์แห่งสกาดี)

*นักล่าแห่งยอดเขาหิมะ สาวกของเทพีสกาดี ลูกธนูของเธอแช่แข็งเหยื่อก่อนจะร่วงลงมาเป็นห่าฝน*

- **วิธีเล่น:** Frost Arrow ทำให้ช้า แล้วยิงห่า Arrow Storm ใส่ฝูง เป้าเดียวใช้ Focused Volley
- **จุดเด่น:** ดาเมจต่อเป้าสูงมาก ควบคุมฝูงได้
- **จุดอ่อน:** SP หมดไวถ้ากดทุกสกิล
- **สเตตัสแนะนำ:** DEX 60% / AGI 30% / LUK 10%
- **ลำดับอัปสกิล:** Skadi's Mark 5 → Frost Arrow 5 → Arrow Storm 5 → Winter Hunt 5 → Focused Volley 5
- **เคล็ดลับ:** Winter Hunt + ตีปกติก็แรงมากแล้ว เก็บ SP ไว้ใช้ Arrow Storm

| สกิล | ชนิด | เลเวลสูงสุด | คูลดาวน์ | คำอธิบาย |
|---|---|---|---|---|
| Skadi's Mark | ติดตัว | 5 | - | ตราแห่งสกาดี CRIT +3×Lv, แรงคริติคอล +5%×Lv, HIT +3×Lv และความเร็วโจมตี +3%×Lv |
| Arrow Storm | กดใช้ | 5 | 3 วิ | ยิงห่าธนูลงพื้นที่ รัศมี 2 ช่อง 215~355% |
| Frost Arrow | กดใช้ | 5 | 2 วิ | ลูกธนูน้ำแข็ง 290~490% ทำให้ช้าลง 3 วินาที |
| Focused Volley | กดใช้ | 5 | 5 วิ | ยิงรัว 3 ดอกไม่พลาด ดอกละ 100~160% |
| Winter Hunt | กดใช้ | 5 | 30 วิ | จังหวะล่าแห่งฤดูหนาว ความเร็วโจมตี +7~19% และ DEX +2×Lv |

### Ullr Sniper (สไนเปอร์แห่งอุลล์)

*ศิษย์ของอุลล์เทพแห่งธนูและสกี มองเห็นไกลกว่าใคร ยิงนัดเดียวจบก่อนเหยื่อจะเข้าใกล้*

- **วิธีเล่น:** ยิงจากไกลสุดด้วย Snipe นัดเดียวจบ มอนรวมกันใช้ Sharp Shot ทะลุแนว
- **จุดเด่น:** ระยะไกลที่สุด เป้าเดียวแรงสุด
- **จุดอ่อน:** ฝูงใหญ่จัดการยาก
- **สเตตัสแนะนำ:** DEX 60% / LUK 25% / AGI 15%
- **ลำดับอัปสกิล:** Ullr Focus 5 → Sharp Shot 5 → Snipe 5 → Twin Shot 5 → Wind Walk 5
- **เคล็ดลับ:** LUK เพิ่มคริ — Snipe ที่คริแรงมาก

| สกิล | ชนิด | เลเวลสูงสุด | คูลดาวน์ | คำอธิบาย |
|---|---|---|---|---|
| Ullr Focus | ติดตัว | 5 | - | สมาธิแห่งอุลล์ ระยะธนู +1~3, CRIT +2×Lv และ DEX +2×Lv |
| Sharp Shot | กดใช้ | 5 | 2 วิ | ลูกธนูคมกริบทะลุแนว 290~490% |
| Snipe | กดใช้ | 5 | 5 วิ | เล็งแล้วยิงนัดเดียว 430~710% ไม่พลาด (ร่าย 1.2 วินาที) |
| Wind Walk | กดใช้ | 5 | 30 วิ | เดินตามลม เดินเร็วขึ้น 4%×Lv, FLEE +4×Lv และความเร็วโจมตี +2%×Lv |
| Twin Shot | กดใช้ | 5 | 1.5 วิ | ยิงคู่ 2 ดอกติด ดอกละ 160~280% |

### Norn Oracle (นอร์นผู้ทอชะตา)

*ผู้ทอเส้นด้ายแห่งชะตาร่วมกับสามนอร์นใต้รากต้นไม้ เยียวยาได้แม้ร่างใกล้ดับ และตัดสินศัตรูด้วยแสง*

- **วิธีเล่น:** ฮีลใหญ่ด้วย Great Restoration บัฟ Fate Weave แล้วพิพากษาด้วย Skuld's Judgment / Ragnarok Light
- **จุดเด่น:** ยืนระยะยาวที่สุด ปลอดภัย
- **จุดอ่อน:** ฆ่าช้ากับมอนศักดิ์สิทธิ์
- **สเตตัสแนะนำ:** INT 55% / VIT 35% / DEX 10%
- **ลำดับอัปสกิล:** Wyrd Thread 5 → Great Restoration 5 → Skuld's Judgment 5 → Ragnarok Light 5 → Fate Weave 5
- **เคล็ดลับ:** ซัพพอร์ตปาร์ตี้ตอนตี World Boss ได้ดีมาก

| สกิล | ชนิด | เลเวลสูงสุด | คูลดาวน์ | คำอธิบาย |
|---|---|---|---|---|
| Wyrd Thread | ติดตัว | 5 | - | เส้นด้ายแห่งเวิร์ด ฮีลแรงขึ้น 5%×Lv, INT +2×Lv และ MDEF +1×Lv |
| Great Restoration | กดใช้ | 5 | 5 วิ | ฟื้นฟูครั้งใหญ่ HP มากกว่า Light of Freyja ราว 1.5 เท่า (ขึ้นกับ INT) |
| Fate Weave | กดใช้ | 5 | 30 วิ | ทอชะตาให้ตนเอง AGI, VIT, LUK +2×Lv และ FLEE +2×Lv (ซ้อนกับ Blessing of Odin ได้) |
| Ragnarok Light | กดใช้ | 5 | 5 วิ | แสงแห่งวันสิ้นโลกตกลงพื้นที่ รัศมี 2 ช่อง 160~280% ธาตุศักดิ์สิทธิ์ |
| Skuld's Judgment | กดใช้ | 5 | 4 วิ | คำพิพากษาของสคูลด์ เป้าเดียว 290~490% ธาตุศักดิ์สิทธิ์ ไม่พลาด |

### Gythja Monk (นักบวชหมัดเทพ)

*นักบวชที่เลือกต่อยแทนการอธิษฐาน หมัดของเธออาบแสงศักดิ์สิทธิ์ ปีศาจและอมตะกลัวที่สุด*

- **วิธีเล่น:** สายบู๊ประชิด: Holy Fist + Triple Palm รัว ๆ ปิดเป้าด้วย Divine Burst
- **จุดเด่น:** ตีแรง ทน ฮีลตัวเองได้จากสายแรก
- **จุดอ่อน:** ต้องรีเซ็ตสเตตัสมาเป็น STR
- **สเตตัสแนะนำ:** STR 50% / VIT 40% / DEX 10%
- **ลำดับอัปสกิล:** Iron Faith 5 → Holy Fist 5 → Triple Palm 5 → Zen Body 5 → Divine Burst 5
- **เคล็ดลับ:** รีเซ็ตสเตตัสที่ Mimir แล้วอัป STR/VIT • หาอาวุธกระบองที่แรงขึ้น

| สกิล | ชนิด | เลเวลสูงสุด | คูลดาวน์ | คำอธิบาย |
|---|---|---|---|---|
| Iron Faith | ติดตัว | 5 | - | ศรัทธาเหล็ก DEF +2×Lv, ดาเมจกายภาพ +4%×Lv, MaxHP +3%×Lv และความเร็วโจมตี +2%×Lv |
| Holy Fist | กดใช้ | 5 | 1.5 วิ | หมัดศักดิ์สิทธิ์ 240~400% ธาตุศักดิ์สิทธิ์ (แรงมากกับอมตะ/ปีศาจ) |
| Triple Palm | กดใช้ | 5 | 3 วิ | ฝ่ามือสามจังหวะ 3 ครั้ง ครั้งละ 110~190% ไม่พลาด |
| Divine Burst | กดใช้ | 5 | 10 วิ | ระเบิดพลังศรัทธาทั้งหมดใส่เป้าเดียว 480~800% ธาตุศักดิ์สิทธิ์ ไม่พลาด |
| Zen Body | กดใช้ | 5 | 30 วิ | กายสงบ DEF +3×Lv, MaxHP +3%×Lv และฟื้น HP ต่อรอบ +1%×Lv |

### Loki's Phantom (ภูตลวงแห่งโลกิ)

*เงาที่โลกิทิ้งไว้ในโลกกลาง หายตัวกลางคมมีด ฟันซ้ำสองครั้งก่อนเหยื่อจะรู้ตัว*

- **วิธีเล่น:** Mirror Strike ฟันซ้อนไม่พลาด เปิด Fang of Fenrir ให้ติดพิษ หลายตัวใช้ Smoke Cyclone
- **จุดเด่น:** คริแรงที่สุด ตีเร็วที่สุด
- **จุดอ่อน:** ตัวบางกว่าสายแทงค์
- **สเตตัสแนะนำ:** AGI 50% / STR 30% / LUK 20%
- **ลำดับอัปสกิล:** Phantom Edge 5 → Mirror Strike 5 → Fang of Fenrir 5 → Trickster Haste 5 → Smoke Cyclone 5
- **เคล็ดลับ:** Trickster Haste เพิ่ม FLEE มาก — หลบได้แทบทุกตี

| สกิล | ชนิด | เลเวลสูงสุด | คูลดาวน์ | คำอธิบาย |
|---|---|---|---|---|
| Phantom Edge | ติดตัว | 5 | - | คมเงา แรงคริติคอล +5%×Lv, AGI +2×Lv และความเร็วโจมตี +2%×Lv |
| Mirror Strike | กดใช้ | 5 | 2 วิ | ร่างเงาฟันซ้อน 2 ครั้ง ครั้งละ 180~300% ไม่พลาด |
| Fang of Fenrir | กดใช้ | 5 | 6 วิ | แทงด้วยเขี้ยวเฟนเรียร์ 360~600% มีโอกาสติดพิษ |
| Smoke Cyclone | กดใช้ | 5 | 8 วิ | หมุนตัวในพายุควัน รอบตัว 2.5 ช่อง 145~245% อาจทำให้มึน |
| Trickster Haste | กดใช้ | 5 | 30 วิ | ความเร็วแห่งนักลวง FLEE +5×Lv, เดินเร็วขึ้น 4%×Lv และ CRIT +2×Lv |

### Skald Bard (สคาลด์ กวีสงคราม)

*กวีผู้ขับขานตำนานกลางสนามรบ เสียงกลองทำให้ศัตรูมึน บทเพลงทำให้ตัวเองเร็วและแรงขึ้น*

- **วิธีเล่น:** เปิดบทเพลง Song of Battle + Hymn of Loki แล้วยิง Sonic Strike ระยะกลาง โดนรุมใช้ War Drum ให้มึน
- **จุดเด่น:** บัฟยาว ตีระยะกลางได้
- **จุดอ่อน:** ดาเมจขึ้นกับบัฟ
- **สเตตัสแนะนำ:** AGI 45% / DEX 35% / LUK 20%
- **ลำดับอัปสกิล:** Skald Verse 5 → Sonic Strike 5 → Song of Battle 5 → War Drum 5 → Hymn of Loki 5
- **เคล็ดลับ:** DEX ทำให้ Sonic Strike แม่น • เหมาะเล่นปาร์ตี้

| สกิล | ชนิด | เลเวลสูงสุด | คูลดาวน์ | คำอธิบาย |
|---|---|---|---|---|
| Skald Verse | ติดตัว | 5 | - | บทกวีสคาลด์ ความเร็วโจมตี +2%×Lv, LUK +2×Lv และ CRIT +1×Lv |
| Sonic Strike | กดใช้ | 5 | 1.5 วิ | คลื่นเสียงตัดอากาศระยะ 5 ช่อง 215~355% ธาตุลม |
| War Drum | กดใช้ | 5 | 8 วิ | ตีกลองศึก ทำร้ายรอบตัว 3 ช่อง 130~210% และอาจทำให้มึน |
| Song of Battle | กดใช้ | 5 | 30 วิ | บทเพลงแห่งศึก ATK +6×Lv, ความเร็วโจมตี +3%×Lv และ HIT +3×Lv |
| Hymn of Loki | กดใช้ | 5 | 30 วิ | บทสวดของโลกิ FLEE +5×Lv และแรงคริติคอล +5%×Lv |

### Ulfhednar Warlord (จอมทัพอุลฟ์เฮดนาร์)

*จ่าฝูงแห่งนักรบหนังหมาป่า เลือดของเขาเดือดจนความตายต้องถอยให้ ฟันขวานทีเดียวกวาดทั้งแนว*

- **วิธีเล่น:** ลุยกลางฝูง Ragnarok Cleave กวาดรอบตัว Fenrir Bite ปิดเป้า เลือดน้อยเปิด Undying Rage ดูดเลือดคืน
- **จุดเด่น:** ฟาร์มฝูงเร็วที่สุด ดูดเลือดได้
- **จุดอ่อน:** ใช้ HP เป็นค่าสกิล
- **สเตตัสแนะนำ:** STR 50% / AGI 35% / VIT 15%
- **ลำดับอัปสกิล:** Berserk Soul 5 → Fenrir Bite 5 → Ragnarok Cleave 5 → War Howl 5 → Undying Rage 5
- **เคล็ดลับ:** ปั๊มยา HP ราว 35–40% + Undying Rage = แทบไม่ตาย

| สกิล | ชนิด | เลเวลสูงสุด | คูลดาวน์ | คำอธิบาย |
|---|---|---|---|---|
| Berserk Soul | ติดตัว | 5 | - | วิญญาณคลั่ง ดาเมจกายภาพ +2%×Lv, MaxHP +2%×Lv และยิ่ง HP น้อยยิ่งแรงขึ้นอีก +4%×Lv |
| Fenrir Bite | กดใช้ | 5 | 2 วิ | กัดฉีกแบบหมาป่าเฟนเรียร์ 260~420% เสีย HP 4% |
| Ragnarok Cleave | กดใช้ | 5 | 6 วิ | ฟันขวานกวาดรอบตัว 2.5 ช่อง 215~355% เสีย HP 6% |
| War Howl | กดใช้ | 5 | 30 วิ | หอนปลุกฝูง ATK +8×Lv, ความเร็วโจมตี +3%×Lv และต้านมึน +8%×Lv |
| Undying Rage | กดใช้ | 5 | 45 วิ | ความแค้นที่ไม่ยอมตาย ดูดเลือด +(1+Lv)% และ DEF +4×Lv ชั่วคราว |

### Jotun Breaker (ผู้พิฆาตโยตุน)

*ผู้ล่ายักษ์น้ำแข็งด้วยมือเปล่าและขวานหนัก ทุบทีเดียวพื้นแยก แต่ทุกทีต้องจ่ายด้วยเลือด*

- **วิธีเล่น:** เปิด Giant's Wrath แล้วทุบ Titan Smash ทีละตัว แนวยาวใช้ Earth Splitter เลือดน้อยใช้ Mountain Heart
- **จุดเด่น:** ทุบเป้าเดียวแรงที่สุด ฮีลตัวเองได้
- **จุดอ่อน:** ตีช้า ทุกสกิลเสียเลือด
- **สเตตัสแนะนำ:** STR 55% / VIT 35% / AGI 10%
- **ลำดับอัปสกิล:** Jotun Blood 5 → Titan Smash 5 → Earth Splitter 5 → Giant's Wrath 5 → Mountain Heart 5
- **เคล็ดลับ:** เหมาะตีบอส/MVP — VIT ช่วยให้จ่ายเลือดได้มากขึ้น

| สกิล | ชนิด | เลเวลสูงสุด | คูลดาวน์ | คำอธิบาย |
|---|---|---|---|---|
| Jotun Blood | ติดตัว | 5 | - | เลือดยักษ์ STR +2×Lv, ดาเมจกายภาพ +3%×Lv และ MaxHP +3%×Lv |
| Titan Smash | กดใช้ | 5 | 3 วิ | ทุบแบบไททัน 410~690% อาจทำให้มึน เสีย HP 8% |
| Earth Splitter | กดใช้ | 5 | 3 วิ | ฟาดพื้นแยกเป็นแนว 4 ช่อง 240~400% ธาตุดิน เสีย HP 5% |
| Giant's Wrath | กดใช้ | 5 | 30 วิ | โทสะยักษ์ STR +3×Lv และดาเมจกายภาพ +4%×Lv เสีย HP 10% |
| Mountain Heart | กดใช้ | 5 | 15 วิ | หัวใจภูผา ฟื้นฟู HP 13~25% ของ MaxHP |

## สกิลทั้งหมด

| สกิล | อาชีพ | ชนิด | Lv สูงสุด | ต้องการ |
|---|---|---|---|---|
| First Aid | Novice | กดใช้ | 1 |  |
| Basic Training | Novice | ติดตัว | 9 |  |
| Iron Body | Einherjar | ติดตัว | 5 |  |
| Shield Slam | Einherjar | กดใช้ | 5 |  |
| War Cry | Einherjar | กดใช้ | 5 |  |
| Whirlwind | Einherjar | กดใช้ | 5 |  |
| Rune Mastery | Rune Caster | ติดตัว | 5 |  |
| Fire Rune | Rune Caster | กดใช้ | 5 |  |
| Ice Rune | Rune Caster | กดใช้ | 5 |  |
| Thunder Rune | Rune Caster | กดใช้ | 5 |  |
| Eagle Eye | Wildhunter | ติดตัว | 5 |  |
| Piercing Arrow | Wildhunter | กดใช้ | 5 |  |
| Wolf Companion | Wildhunter | กดใช้ | 5 |  |
| Blast Trap | Wildhunter | กดใช้ | 5 |  |
| Sanctuary | Völva | ติดตัว | 5 |  |
| Light of Freyja | Völva | กดใช้ | 5 |  |
| Blessing of Odin | Völva | กดใช้ | 5 |  |
| Holy Spear | Völva | กดใช้ | 5 |  |
| Shadow Step | Loki's Trickster | ติดตัว | 5 |  |
| Backstab | Loki's Trickster | กดใช้ | 5 |  |
| Smoke Veil | Loki's Trickster | กดใช้ | 5 |  |
| Venom Blade | Loki's Trickster | กดใช้ | 5 |  |
| Wolf Blood | Berserker | ติดตัว | 5 |  |
| Rage Strike | Berserker | กดใช้ | 5 |  |
| Blood Frenzy | Berserker | กดใช้ | 5 |  |
| Howl | Berserker | กดใช้ | 5 |  |
| Valhalla's Oath | Einherjar | ติดตัว | 5 | Iron Body 3 |
| Runic Ward | Rune Caster | ติดตัว | 5 | Rune Mastery 3 |
| Hunter's Rhythm | Wildhunter | ติดตัว | 5 | Eagle Eye 3 |
| Freyja's Grace | Völva | ติดตัว | 5 | Sanctuary 3 |
| Loki's Gambit | Loki's Trickster | ติดตัว | 5 | Shadow Step 3 |
| Bloodthirst | Berserker | ติดตัว | 5 | Wolf Blood 3 |
| Shield Throw | Einherjar | กดใช้ | 5 | Shield Slam 1 |
| Earth Rune | Rune Caster | กดใช้ | 5 | Fire Rune 1 |
| Charge Arrow | Wildhunter | กดใช้ | 5 | Piercing Arrow 1 |
| Divine Shield | Völva | กดใช้ | 5 | Light of Freyja 1 |
| Throwing Knife | Loki's Trickster | กดใช้ | 5 | Backstab 1 |
| Axe Throw | Berserker | กดใช้ | 5 | Rage Strike 1 |
| Aegis Wall | Valkyrie Knight | ติดตัว | 5 |  |
| Spear of Valhalla | Valkyrie Knight | กดใช้ | 5 | Aegis Wall 1 |
| Einherjar Guard | Valkyrie Knight | กดใช้ | 5 | Aegis Wall 3 |
| Judgment Quake | Valkyrie Knight | กดใช้ | 5 | Spear of Valhalla 3 |
| Valhalla's Call | Valkyrie Knight | กดใช้ | 5 | Einherjar Guard 2 |
| Galdr Focus | Galdr Sage | ติดตัว | 5 |  |
| Meteor Rune | Galdr Sage | กดใช้ | 5 | Galdr Focus 1 |
| Frost Nova | Galdr Sage | กดใช้ | 5 | Galdr Focus 2 |
| Chain Lightning | Galdr Sage | กดใช้ | 5 | Meteor Rune 2 |
| Rune Barrier | Galdr Sage | กดใช้ | 5 | Galdr Focus 3 |
| Skadi's Mark | Skadi Ranger | ติดตัว | 5 |  |
| Arrow Storm | Skadi Ranger | กดใช้ | 5 | Skadi's Mark 1 |
| Frost Arrow | Skadi Ranger | กดใช้ | 5 | Skadi's Mark 2 |
| Focused Volley | Skadi Ranger | กดใช้ | 5 | Arrow Storm 2 |
| Winter Hunt | Skadi Ranger | กดใช้ | 5 | Skadi's Mark 3 |
| Wyrd Thread | Norn Oracle | ติดตัว | 5 |  |
| Great Restoration | Norn Oracle | กดใช้ | 5 | Wyrd Thread 1 |
| Fate Weave | Norn Oracle | กดใช้ | 5 | Wyrd Thread 2 |
| Ragnarok Light | Norn Oracle | กดใช้ | 5 | Wyrd Thread 3 |
| Skuld's Judgment | Norn Oracle | กดใช้ | 5 | Ragnarok Light 2 |
| Phantom Edge | Loki's Phantom | ติดตัว | 5 |  |
| Mirror Strike | Loki's Phantom | กดใช้ | 5 | Phantom Edge 1 |
| Fang of Fenrir | Loki's Phantom | กดใช้ | 5 | Mirror Strike 2 |
| Smoke Cyclone | Loki's Phantom | กดใช้ | 5 | Phantom Edge 2 |
| Trickster Haste | Loki's Phantom | กดใช้ | 5 | Phantom Edge 3 |
| Berserk Soul | Ulfhednar Warlord | ติดตัว | 5 |  |
| Fenrir Bite | Ulfhednar Warlord | กดใช้ | 5 | Berserk Soul 1 |
| Ragnarok Cleave | Ulfhednar Warlord | กดใช้ | 5 | Fenrir Bite 2 |
| War Howl | Ulfhednar Warlord | กดใช้ | 5 | Berserk Soul 2 |
| Undying Rage | Ulfhednar Warlord | กดใช้ | 5 | Berserk Soul 3 |
| Hersir Might | Hersir Vanguard | ติดตัว | 5 |  |
| Charge Strike | Hersir Vanguard | กดใช้ | 5 | Hersir Might 1 |
| Spiral Pierce | Hersir Vanguard | กดใช้ | 5 | Charge Strike 2 |
| Battle Aura | Hersir Vanguard | กดใช้ | 5 | Hersir Might 3 |
| Ragnar's Fury | Hersir Vanguard | กดใช้ | 5 | Spiral Pierce 2 |
| Seidr Lore | Seidr Witch | ติดตัว | 5 |  |
| Soul Drain | Seidr Witch | กดใช้ | 5 | Seidr Lore 1 |
| Hex of Hel | Seidr Witch | กดใช้ | 5 | Seidr Lore 2 |
| Dark Nova | Seidr Witch | กดใช้ | 5 | Soul Drain 2 |
| Void Lance | Seidr Witch | กดใช้ | 5 | Hex of Hel 2 |
| Ullr Focus | Ullr Sniper | ติดตัว | 5 |  |
| Sharp Shot | Ullr Sniper | กดใช้ | 5 | Ullr Focus 1 |
| Snipe | Ullr Sniper | กดใช้ | 5 | Sharp Shot 2 |
| Wind Walk | Ullr Sniper | กดใช้ | 5 | Ullr Focus 2 |
| Twin Shot | Ullr Sniper | กดใช้ | 5 | Ullr Focus 3 |
| Iron Faith | Gythja Monk | ติดตัว | 5 |  |
| Holy Fist | Gythja Monk | กดใช้ | 5 | Iron Faith 1 |
| Triple Palm | Gythja Monk | กดใช้ | 5 | Holy Fist 2 |
| Divine Burst | Gythja Monk | กดใช้ | 5 | Triple Palm 2 |
| Zen Body | Gythja Monk | กดใช้ | 5 | Iron Faith 3 |
| Skald Verse | Skald Bard | ติดตัว | 5 |  |
| Sonic Strike | Skald Bard | กดใช้ | 5 | Skald Verse 1 |
| War Drum | Skald Bard | กดใช้ | 5 | Sonic Strike 2 |
| Song of Battle | Skald Bard | กดใช้ | 5 | Skald Verse 2 |
| Hymn of Loki | Skald Bard | กดใช้ | 5 | Skald Verse 3 |
| Jotun Blood | Jotun Breaker | ติดตัว | 5 |  |
| Titan Smash | Jotun Breaker | กดใช้ | 5 | Jotun Blood 1 |
| Earth Splitter | Jotun Breaker | กดใช้ | 5 | Titan Smash 2 |
| Giant's Wrath | Jotun Breaker | กดใช้ | 5 | Jotun Blood 3 |
| Mountain Heart | Jotun Breaker | กดใช้ | 5 | Jotun Blood 2 |

## แผนที่

| แผนที่ | ชื่อไทย | ประเภท | เลเวล | มอนสเตอร์ (จำนวนเกิด) | MVP | World Boss | ทางเชื่อม |
|---|---|---|---|---|---|---|---|
| Neo Eldheim | นครนีโอเอลด์ไฮม์ ฐานที่มั่นแห่งแอนดรอยด์ | เมือง | เมือง |  |  |  | E→Emerald Meadow, S→Wolfwood Forest |
| Emerald Meadow | ทุ่งหญ้ามรกต | ทุ่ง | 1-6 | Gel Unit ×14, Crawler Unit ×8, Bunny Unit ×8, Ember Unit ×6, Buzz Unit ×5 |  |  | W→Neo Eldheim, E→Mistlake Plains |
| Mistlake Plains | ที่ราบทะเลสาบหมอก | ทุ่ง | 8-16 (MVP: Seraph Core) | Hopper Unit ×10, Rust Sentry ×8, Mine Unit ×8, Moss Unit ×8 | Seraph Core | Ancient Seraph Core | W→Emerald Meadow |
| Wolfwood Forest | ป่าหมาป่า | ทุ่ง | 18-30 | Ash Stalker ×10, Fenrir Unit ×8, Iron Brute ×6, Tusk Trooper ×6 |  |  | N→Neo Eldheim, S→Hel's Hollow |
| Valhalla Arena | ลานประลองวัลฮัลลา (PvP) | ทุ่ง | PvP |  |  |  | S→Neo Eldheim |
| Hel's Hollow | โพรงถ้ำแห่งเฮล | ถ้ำ/ดันเจี้ยน | 17-45 (MVP: Kitsura EX) | Draugr Husk ×10, Frame Warden ×8, Hel Maiden Unit ×7, Hel Guard Unit ×6 | Kitsura EX | Ancient Kitsura EX | N→Wolfwood Forest, S→Archive Depths |
| Archive Depths | คลังประกายชั้นล่าง ใต้โพรงแห่งเฮล | ถ้ำ/ดันเจี้ยน | 33-45 | Rust Sap Unit ×10, Archive Warden ×7, Rust Mine Unit ×8, Archive Maiden ×7, Rust Husk ×6 |  |  | N→Hel's Hollow, E→Gnawed Roots |
| Gnawed Roots | รากที่ถูกแทะ ใต้คลังของเฮล | ถ้ำ/ดันเจี้ยน | 45-60 (MVP: Garmr) | Root Crawler Unit ×10, Gnawed Sentry ×8, Gnawed Brute ×7, Root Gnawer ×6 | Garmr | Ancient Garmr | W→Archive Depths |

### NPC

| แผนที่ | NPC |
|---|---|
| Neo Eldheim | Bifrost Keeper, Mimir AI, Tool Dealer, Weapon Dealer, Armor Dealer, Brokk Forge-Bot, Eir Repair Unit, Guard Unit Rolf, Storage Unit Kaia, Norn's Wheel |
| Hel's Hollow | Hel |

## มอนสเตอร์

อัตราดรอปเป็นค่าพื้นฐานต่อการฆ่า 1 ตัว (ก่อนโบนัส LUK/ปาร์ตี้) • ชิปของแต่ละมอนดรอปแยกต่างหาก

| มอน | Lv | HP | ATK | DEF/MDEF | ธาตุ | เผ่า | ดุ | EXP / JEXP | พบที่ |
|---|---|---|---|---|---|---|---|---|---|
| Gel Unit | 1 | 50 | 7~10 | 0/5 | น้ำ | พืช | - | 18 / 12 | Emerald Meadow |
| Crawler Unit | 2 | 63 | 8~11 | 0/0 | ดิน | แมลง | - | 22 / 15 | Emerald Meadow |
| Bunny Unit | 3 | 60 | 9~12 | 0/20 | ไร้ธาตุ | สัตว์ | - | 26 / 18 | Emerald Meadow |
| Ember Unit | 3 | 72 | 10~13 | 0/0 | ไฟ | พืช | - | 30 / 20 | Emerald Meadow |
| Buzz Unit | 4 | 67 | 10~13 | 10/0 | ลม | แมลง | ใช่ | 35 / 24 | Emerald Meadow |
| Rust Sentry | 8 | 170 | 18~22 | 35/5 | ดิน | พืช | - | 80 / 55 | Mistlake Plains |
| Hopper Unit | 9 | 198 | 24~29 | 5/10 | ดิน | แมลง | - | 90 / 60 | Mistlake Plains |
| Mine Unit | 12 | 280 | 28~34 | 10/10 | น้ำ | พืช | - | 130 / 90 | Mistlake Plains |
| Moss Unit | 14 | 330 | 32~40 | 10/10 | ดิน | พืช | - | 160 / 110 | Mistlake Plains |
| Draugr Husk | 17 | 700 | 45~60 | 5/10 | อมตะ | อมตะ | ใช่ | 330 / 220 | Hel's Hollow |
| Ash Stalker | 18 | 600 | 45~58 | 10/5 | ดิน | สัตว์ | - | 300 / 210 | Wolfwood Forest |
| Frame Warden | 24 | 1,000 | 70~90 | 20/10 | อมตะ | อมตะ | ใช่ | 520 / 360 | Hel's Hollow |
| Seraph Core 👑 | 25 | 5,500 | 90~120 | 30/50 | ศักดิ์สิทธิ์ | เทวดา | ใช่ | 3,500 / 2,400 | Mistlake Plains (MVP) |
| Fenrir Unit | 25 | 900 | 60~78 | 15/0 | ดิน | สัตว์ | - | 460 / 320 | Wolfwood Forest |
| Iron Brute | 26 | 1,150 | 65~82 | 25/5 | ดิน | สัตว์ | - | 520 / 350 | Wolfwood Forest |
| Tusk Trooper | 28 | 1,400 | 80~100 | 30/5 | ดิน | สัตว์ | ใช่ | 640 / 450 | Wolfwood Forest |
| Hel Maiden Unit | 30 | 1,950 | 90~115 | 30/30 | อมตะ | อมตะ | - | 720 / 500 | Hel's Hollow |
| Hel Guard Unit | 32 | 2,210 | 100~125 | 30/20 | อมตะ | อมตะ | ใช่ | 800 / 560 | Hel's Hollow |
| Rust Sap Unit | 33 | 2,080 | 100~124 | 15/30 | พิษ | พืช | - | 880 / 620 | Archive Depths |
| Archive Warden | 36 | 2,340 | 118~146 | 28/15 | อมตะ | อมตะ | ใช่ | 1,140 / 800 | Archive Depths |
| Rust Mine Unit | 38 | 2,535 | 124~152 | 25/30 | ไฟ | พืช | - | 1,260 / 880 | Archive Depths |
| Archive Maiden | 41 | 2,730 | 130~162 | 20/45 | มืด | อมตะ | - | 1,520 / 1,060 | Archive Depths |
| Rust Husk | 44 | 3,250 | 150~186 | 25/25 | อมตะ | อมตะ | ใช่ | 1,860 / 1,300 | Archive Depths |
| Kitsura EX 👑 | 45 | 28,600 | 180~240 | 40/50 | ไฟ | ปีศาจ | ใช่ | 16,000 / 11,000 | Hel's Hollow (MVP) |
| Root Crawler Unit | 46 | 3,380 | 154~190 | 25/35 | พิษ | แมลง | - | 2,010 / 1,410 | Gnawed Roots |
| Gnawed Sentry | 49 | 3,900 | 164~200 | 35/40 | ดิน | พืช | - | 2,350 / 1,650 | Gnawed Roots |
| Gnawed Brute | 53 | 4,550 | 182~226 | 30/25 | ดิน | สัตว์ | - | 2,840 / 1,990 | Gnawed Roots |
| Root Gnawer | 57 | 4,940 | 200~250 | 28/30 | พิษ | สัตว์ | ใช่ | 3,460 / 2,420 | Gnawed Roots |
| Garmr 👑 | 60 | 59,800 | 255~330 | 38/45 | มืด | สัตว์ | ใช่ | 40,000 / 28,000 | Gnawed Roots (MVP) |

### ดรอปของมอนแต่ละตัว

- **Gel Unit** (Lv 1): Gel Cell 70% • Scrap Gear 30% • Oil Can 15% • Repair Kit S 4% • Gel Shiv 0.2% • Gel-Lined Vest 0.15% • Knife 0.25% • Gelheart Mail 0.03% • ชิป: Gel Unit Chip
- **Crawler Unit** (Lv 2): Copper Wire 65% • Scrap Gear 30% • Antivirus Patch 20% • Micro Chip 10% • Wirecutter Saber 0.2% • Crawler Treads 0.15% • Sproutcircuit Staff 0.04% • ชิป: Crawler Chip
- **Bunny Unit** (Lv 3): Silver Mesh 60% • Coolant 30% • Micro Chip 20% • Silvermoon Hatchet 0.2% • Bunny-Ear Visor 0.15% • Scrap Buckler 0.1% • Moonlit Kris 0.04% • ชิป: Bunny Unit Chip
- **Ember Unit** (Lv 3): Heat Sink 50% • Scrap Gear 30% • Patch Tape 20% • Repair Kit M 4% • Ember Wand 0.2% • Ember Coil Ring 0.15% • Tinker's Mallet 0.1% • Hearthcore Earring 0.04% • ชิป: Ember Unit Chip
- **Buzz Unit** (Lv 4): Rotor Blade 55% • Gel Cell 30% • Blink Chip 5% • Rotorstring Bow 0.2% • Rotor-Fin Cape 0.15% • Stiletto 0.04% • Meadow Charm 0.04% • ชิป: Buzz Unit Chip
- **Rust Sentry** (Lv 8): Scrap Plate 60% • Copper Wire 30% • Repair Kit M 6% • Sentry Saber 0.2% • Sentry Plating 0.12% • Barkplate Shield 0.1% • Mistlake Mantle 0.1% • Sentinel Core 0.04% • ชิป: Rust Sentry Chip
- **Hopper Unit** (Lv 9): Spring Coil 55% • Frayed Cable 35% • Antivirus Patch 20% • Springsteel Kris 0.2% • Spring-Heel Greaves 0.12% • Coilspring Band 0.08% • Grip Glove 0.03% • Mistfang 0.04% • ชิป: Hopper Unit Chip
- **Mine Unit** (Lv 12): Detonator 60% • Frayed Cable 30% • Patch Tape 30% • Minebreaker Axe 0.2% • Blastcap Helm 0.12% • Mistlake Longbow 0.1% • Battle Axe 0.06% • Tidecaller Rod 0.05% • ชิป: Mine Unit Chip
- **Moss Unit** (Lv 14): Bio Gel 50% • Antivirus Patch 30% • Charge Chip 6% • Mossglow Scepter 0.2% • Mistweave Robe 0.12% • Runebound Mallet 0.1% • Rune Staff 0.06% • Verdant Circlet 0.04% • ชิป: Moss Unit Chip
- **Draugr Husk** (Lv 17): Rust Dust 60% • Bio Gel 30% • Volt Ore 1.5% • Barrow Axe 0.2% • Gravecloth Mail 0.12% • Energy Buckler 0.06% • Flail 0.06% • Husk Signet 0.05% • ชิป: Draugr Husk Chip
- **Ash Stalker** (Lv 18): Ash Filter 50% • Silver Mesh 30% • Volt Ore 1.5% • Ashtail Wrap 0.2% • Ashen Hood 0.12% • Cable Scarf 0.08% • Great Bow 0.06% • Cindertail Cloak 0.04% • ชิป: Ash Stalker Chip
- **Frame Warden** (Lv 24): Old Frame 50% • Rune Shard 35% • Repair Kit L 5% • Rune Alloy 2% • Wardenbone Sword 0.2% • Bonewall Shield 0.12% • Morning Star 0.08% • Barrow-King's Blade 0.03% • ชิป: Frame Warden Chip
- **Seraph Core** (Lv 25): Seraph Wings 3.6% • Seraph Down Mantle 1.8% • Seraphic Edge 1.4% • Choir of Seraphs 1.4% • Aureole of Baldr 0.025% • Valkyrie Plume Circuit 50% • Rune Alloy 50% • Yggdrasil Core 10% • ชิป: Seraph Core Chip
- **Fenrir Unit** (Lv 25): Fenrir Fang 60% • Nano Paste 30% • Rune Alloy 2% • Fenrir Clawblade 0.2% • Wolfpelt Cloak 0.12% • Wolfpath Boots 0.1% • Úlfr Axe 0.06% • Gleipnir Link 0.04% • ชิป: Fenrir Unit Chip
- **Iron Brute** (Lv 26): Plated Hide 50% • Cracked Visor Lens 35% • Overclock Brew 8% • Volt Ore 2% • Ironhide Maul 0.2% • Ironhide Plating 0.12% • Mesh Armor 0.06% • Bearheart Band 0.05% • ชิป: Iron Brute Chip
- **Tusk Trooper** (Lv 28): Iron Tusk 60% • Nano Paste 30% • Rune Alloy 2% • Tuskbreaker Axe 0.2% • Tusked Helm 0.12% • Huntsman's Recurve 0.1% • Power Ring 0.04% • Charger Greaves 0.04% • ชิป: Tusk Trooper Chip
- **Hel Maiden Unit** (Lv 30): Soul Lantern 40% • Helfire Ember 35% • Energy Cell 3% • Soulwick Staff 0.2% • Lantern Veil 0.12% • Seer's Staff 0.12% • Signal Earring 0.04% • Helwick Robe 0.04% • ชิป: Hel Maiden Chip
- **Hel Guard Unit** (Lv 32): Cursed Chip 40% • Rune Shard 30% • Volt Ore 2.5% • Helgate Axe 0.2% • Helgate Plating 0.12% • Iron Helm 0.1% • Loki's Fang 0.08% • Aegis of Hel 0.04% • ชิป: Hel Guard Chip
- **Rust Sap Unit** (Lv 33): Rust Sap 55% • Gel Cell 30% • Repair Kit L 5% • Volt Ore 3% • Sapdrinker Dirk 0.2% • Rustbloom Staff 0.12% • Mag Boots 0.06% • Rustbloom Talisman 0.05% • ชิป: Rust Sap Chip
- **Archive Warden** (Lv 36): Archive Seal 50% • Archive Data Crystal 30% • Tarnished Einherjar Medal 3% • Rune Alloy 3% • Archivist's Greatsword 0.2% • Archive Warden Helm 0.12% • Titan Plate 0.08% • Ullr's Bow 0.08% • ชิป: Archive Warden Chip
- **Rust Mine Unit** (Lv 38): Rust Fuse 50% • Detonator 30% • Repair Kit XL 3% • Volt Ore 3% • Fusebreaker 0.2% • Blastproof Greaves 0.12% • Vaultkeeper's Cloak 0.1% • Detonator Longbow 0.05% • ชิป: Rust Mine Chip
- **Archive Maiden** (Lv 41): Rusted Spark 50% • Archive Data Crystal 30% • Energy Cell 3% • Rune Alloy 3% • Sparkscript Staff 0.2% • Archive Maiden's Shroud 0.12% • Rune Charm 0.04% • Yggdrasil Branch 0.05% • ชิป: Archive Maiden Chip
- **Rust Husk** (Lv 44): Corroded Core 45% • Rust Dust 30% • Tarnished Einherjar Medal 4% • Volt Ore 3.5% • Rusthusk Greatsword 0.2% • Rusthusk Plating 0.12% • Valhalla Blade 0.06% • Crown of the Rust King 0.05% • ชิป: Rust Husk Chip
- **Kitsura EX** (Lv 45): Emberfang 3.6% • Nine-Ember Tail 1.4% • Foxfire Bow 1.4% • Kitsura Faceplate 1.4% • Ember of Ragnarök 0.025% • Valkyrie Plume Circuit 60% • Volt Ore 60% • Yggdrasil Core 15% • ชิป: Kitsura EX Chip
- **Root Crawler Unit** (Lv 46): Root Fiber 50% • Copper Wire 30% • Repair Kit XL 4% • Rune Alloy 3.5% • Rootfang Dagger 0.2% • Rootstring Bow 0.12% • Rootguard Shield 0.08% • Rootrunner Boots 0.05% • ชิป: Root Crawler Chip
- **Gnawed Sentry** (Lv 49): Gnawed Bark 45% • Yggdrasil Sap 25% • Volt Ore 4% • Rootwarden Maul 0.2% • Heartwood Buckler 0.12% • Ironheart Cleaver 0.1% • Yggdrasil Branch 0.08% • Sigil of Yggdrasil 0.04% • ชิป: Gnawed Sentry Chip
- **Gnawed Brute** (Lv 53): Rusted Plate 45% • Yggdrasil Sap 30% • Volt Ore 4.5% • Rootsplitter Greataxe 0.2% • Gnawed Bulwark 0.12% • Gnawhide Boots 0.1% • Rootbark Plating 0.16% • Jötunn Knuckle 0.04% • ชิป: Gnawed Brute Chip
- **Root Gnawer** (Lv 57): Gnawer Tusk 45% • Iron Tusk 30% • Rune Alloy 4.5% • Gnawtooth Saber 0.2% • Gnawer Hide Hood 0.12% • Gnawroot Warbow 0.1% • Rootweave Cloak 0.16% • Rootheart Scepter 0.04% • ชิป: Root Gnawer Chip
- **Garmr** (Lv 60): Garmr Collar 2.7% • Hellhound's Fang 1.4% • Mantle of the Gatehound 1.4% • Gnipahellir Cleaver 1.4% • Hand of Týr 0.025% • Mímir's Wellspring 0.025% • Rune Alloy 70% • Yggdrasil Core 20% • ชิป: Garmr Chip

## อาวุธ

### มีดสั้น

| อาวุธ | ATK | MATK | Lv | ช่องชิป | อาชีพ | ความหายาก | ราคา | หาได้จาก |
|---|---|---|---|---|---|---|---|---|
| Knife | 17 |  | 1 | 3 | 6 อาชีพ | ธรรมดา | 50 | ร้านค้า • Gel Unit 0.25% |
| Cutter | 30 |  | 1 | 3 | 6 อาชีพ | ธรรมดา | 1,250 | ร้านค้า |
| Main Gauche | 43 |  | 1 | 3 | 6 อาชีพ | ธรรมดา | 2,400 | ร้านค้า |
| Gel Shiv | 50 |  | 5 | 1 | 6 อาชีพ | ดี | 650 | Gel Unit 0.2% |
| Moonlit Kris | 60 |  | 8 | 2 | 6 อาชีพ | หายาก | 4,200 | Bunny Unit 0.04% |
| Stiletto | 60 |  | 12 | 2 | 6 อาชีพ | ดี | 7,500 | Buzz Unit 0.04% |
| Springsteel Kris | 66 |  | 12 | 1 | 6 อาชีพ | ดี | 1,350 | Hopper Unit 0.2% |
| Mistfang | 76 |  | 16 | 2 | 6 อาชีพ | หายาก | 7,400 | Hopper Unit 0.04% |
| Emberfang | 70 | 40 | 25 | 0 | 6 อาชีพ | มหากาพย์ | 60,000 | Kitsura EX 3.6%, Ancient Kitsura EX 2.5% |
| Fenrir Clawblade | 90 |  | 25 | 1 | 6 อาชีพ | ดี | 2,650 | Fenrir Unit 0.2% |
| Loki's Fang | 105 |  | 30 | 1 | Loki's Trickster | หายาก | 26,000 | Hel Guard Unit 0.08% |
| Sapdrinker Dirk | 102 |  | 33 | 1 | 6 อาชีพ | ดี | 3,450 | Rust Sap Unit 0.2% |
| Rootfang Dagger | 130 |  | 46 | 1 | 6 อาชีพ | ดี | 4,750 | Root Crawler Unit 0.2% |
| Hellhound's Fang | 162 |  | 55 | 1 | 6 อาชีพ | มหากาพย์ | 74,000 | Garmr 1.4%, Ancient Garmr 1% |

### ดาบ

| อาวุธ | ATK | MATK | Lv | ช่องชิป | อาชีพ | ความหายาก | ราคา | หาได้จาก |
|---|---|---|---|---|---|---|---|---|
| Sword | 25 |  | 1 | 3 | Novice, Einherjar, Loki's Trickster, Berserker | ธรรมดา | 100 | ร้านค้า |
| Falchion | 49 |  | 1 | 3 | Novice, Einherjar, Loki's Trickster, Berserker | ธรรมดา | 1,500 | ร้านค้า |
| Broadsword | 62 |  | 1 | 3 | Novice, Einherjar, Loki's Trickster, Berserker | ธรรมดา | 3,200 | ร้านค้า |
| Wirecutter Saber | 68 |  | 6 | 1 | Novice, Einherjar, Loki's Trickster, Berserker | ดี | 750 | Crawler Unit 0.2% |
| Sentry Saber | 82 |  | 12 | 1 | Novice, Einherjar, Loki's Trickster, Berserker | ดี | 1,350 | Rust Sentry 0.2% |
| Seraphic Edge | 115 | 20 | 22 | 1 | Novice, Einherjar, Loki's Trickster, Berserker | มหากาพย์ | 34,400 | Seraph Core 1.4%, Ancient Seraph Core 1% |
| Wardenbone Sword | 104 |  | 24 | 1 | Novice, Einherjar, Loki's Trickster, Berserker | ดี | 2,550 | Frame Warden 0.2% |
| Barrow-King's Blade | 126 |  | 28 | 2 | Novice, Einherjar, Loki's Trickster, Berserker | หายาก | 12,200 | Frame Warden 0.03% |
| Valhalla Blade | 130 |  | 30 | 1 | Einherjar | หายาก | 32,000 | Rust Husk 0.06% |
| Archivist's Greatsword | 142 |  | 36 | 1 | Novice, Einherjar, Loki's Trickster, Berserker | ดี | 3,750 | Archive Warden 0.2% |
| Rusthusk Greatsword | 158 |  | 44 | 1 | Novice, Einherjar, Loki's Trickster, Berserker | ดี | 4,550 | Rust Husk 0.2% |
| Gnawtooth Saber | 184 |  | 57 | 1 | Novice, Einherjar, Loki's Trickster, Berserker | ดี | 5,850 | Root Gnawer 0.2% |
| Hand of Týr | 232 |  | 60 | 1 | Novice, Einherjar, Loki's Trickster, Berserker | ตำนาน | 150,000 | Ancient Garmr 1%, Garmr 0.025% |

### ขวาน

| อาวุธ | ATK | MATK | Lv | ช่องชิป | อาชีพ | ความหายาก | ราคา | หาได้จาก |
|---|---|---|---|---|---|---|---|---|
| Hand Axe | 32 |  | 1 | 3 | Novice, Einherjar, Berserker | ธรรมดา | 300 | ร้านค้า |
| Cleaver Axe | 50 |  | 1 | 3 | Novice, Einherjar, Berserker | ธรรมดา | 1,800 | ร้านค้า |
| Silvermoon Hatchet | 70 |  | 6 | 1 | Novice, Einherjar, Berserker | ดี | 750 | Bunny Unit 0.2% |
| Minebreaker Axe | 90 |  | 14 | 1 | Novice, Einherjar, Berserker | ดี | 1,550 | Mine Unit 0.2% |
| Battle Axe | 72 |  | 15 | 2 | Novice, Einherjar, Berserker | ดี | 5,500 | Mine Unit 0.06% |
| Barrow Axe | 98 |  | 18 | 1 | Novice, Einherjar, Berserker | ดี | 1,950 | Draugr Husk 0.2% |
| Tuskbreaker Axe | 122 |  | 28 | 1 | Novice, Einherjar, Berserker | ดี | 2,950 | Tusk Trooper 0.2% |
| Úlfr Axe | 145 |  | 30 | 1 | Berserker | หายาก | 34,000 | Fenrir Unit 0.06% |
| Helgate Axe | 134 |  | 32 | 1 | Novice, Einherjar, Berserker | ดี | 3,350 | Hel Guard Unit 0.2% |
| Ironheart Cleaver | 165 |  | 49 | 1 | Novice, Einherjar, Berserker | ดี | 5,050 | Gnawed Sentry 0.1% |
| Rootsplitter Greataxe | 180 |  | 53 | 1 | Novice, Einherjar, Berserker | ดี | 5,450 | Gnawed Brute 0.2% |
| Gnipahellir Cleaver | 208 |  | 58 | 1 | Novice, Einherjar, Berserker | มหากาพย์ | 77,600 | Garmr 1.4%, Ancient Garmr 1% |

### คทา

| อาวุธ | ATK | MATK | Lv | ช่องชิป | อาชีพ | ความหายาก | ราคา | หาได้จาก |
|---|---|---|---|---|---|---|---|---|
| Energy Rod | 15 | 15 | 1 | 3 | Novice, Rune Caster, Völva | ธรรมดา | 50 | ร้านค้า |
| Arc Wand | 20 | 26 | 1 | 3 | Novice, Rune Caster, Völva | ธรรมดา | 900 | ร้านค้า |
| Ember Wand | 22 | 36 | 5 | 1 | Novice, Rune Caster, Völva | ดี | 650 | Ember Unit 0.2% |
| Sproutcircuit Staff | 26 | 46 | 8 | 2 | Novice, Rune Caster, Völva | หายาก | 4,200 | Crawler Unit 0.04% |
| Rune Staff | 25 | 40 | 12 | 2 | Novice, Rune Caster, Völva | ดี | 2,500 | Moss Unit 0.06% |
| Mossglow Scepter | 28 | 50 | 14 | 1 | Novice, Rune Caster, Völva | ดี | 1,550 | Moss Unit 0.2% |
| Tidecaller Rod | 30 | 62 | 16 | 2 | Novice, Rune Caster, Völva | หายาก | 7,400 | Mine Unit 0.05% |
| Choir of Seraphs | 45 | 90 | 22 | 1 | Novice, Rune Caster, Völva | มหากาพย์ | 34,400 | Seraph Core 1.4%, Ancient Seraph Core 1% |
| Seer's Staff | 60 | 80 | 24 | 1 | Rune Caster, Völva | หายาก | 14,000 | Hel Maiden Unit 0.12% |
| Soulwick Staff | 50 | 84 | 30 | 1 | Novice, Rune Caster, Völva | ดี | 3,150 | Hel Maiden Unit 0.2% |
| Rustbloom Staff | 55 | 92 | 34 | 1 | Novice, Rune Caster, Völva | ดี | 3,550 | Rust Sap Unit 0.12% |
| Sparkscript Staff | 62 | 106 | 41 | 1 | Novice, Rune Caster, Völva | ดี | 4,250 | Archive Maiden 0.2% |
| Yggdrasil Branch | 70 | 115 | 45 | 1 | Rune Caster, Völva | หายาก | 52,000 | Gnawed Sentry 0.08%, Archive Maiden 0.05% |
| Rootheart Scepter | 78 | 142 | 57 | 2 | Novice, Rune Caster, Völva | หายาก | 23,800 | Root Gnawer 0.04% |
| Mímir's Wellspring | 85 | 172 | 60 | 1 | Novice, Rune Caster, Völva | ตำนาน | 150,000 | Ancient Garmr 1%, Garmr 0.025% |

### ธนู

| อาวุธ | ATK | MATK | Lv | ช่องชิป | อาชีพ | ความหายาก | ราคา | หาได้จาก |
|---|---|---|---|---|---|---|---|---|
| Bow | 15 |  | 1 | 3 | Wildhunter, Loki's Trickster | ธรรมดา | 1,000 | ร้านค้า |
| Composite Bow | 32 |  | 1 | 3 | Wildhunter, Loki's Trickster | ธรรมดา | 2,500 | ร้านค้า |
| Rotorstring Bow | 46 |  | 6 | 1 | Wildhunter, Loki's Trickster | ดี | 750 | Buzz Unit 0.2% |
| Mistlake Longbow | 60 |  | 13 | 1 | Wildhunter, Loki's Trickster | ดี | 1,450 | Mine Unit 0.1% |
| Great Bow | 55 |  | 18 | 2 | Wildhunter | ดี | 10,000 | Ash Stalker 0.06% |
| Huntsman's Recurve | 92 |  | 24 | 1 | Wildhunter, Loki's Trickster | ดี | 2,550 | Tusk Trooper 0.1% |
| Ullr's Bow | 125 |  | 30 | 1 | Wildhunter | หายาก | 34,000 | Archive Warden 0.08% |
| Detonator Longbow | 134 |  | 38 | 2 | Wildhunter, Loki's Trickster | หายาก | 16,200 | Rust Mine Unit 0.05% |
| Foxfire Bow | 168 |  | 42 | 1 | Wildhunter, Loki's Trickster | มหากาพย์ | 58,400 | Kitsura EX 1.4%, Ancient Kitsura EX 1% |
| Rootstring Bow | 150 |  | 46 | 1 | Wildhunter, Loki's Trickster | ดี | 4,750 | Root Crawler Unit 0.12% |
| Gnawroot Warbow | 174 |  | 55 | 1 | Wildhunter, Loki's Trickster | ดี | 5,650 | Root Gnawer 0.1% |

### กระบอง

| อาวุธ | ATK | MATK | Lv | ช่องชิป | อาชีพ | ความหายาก | ราคา | หาได้จาก |
|---|---|---|---|---|---|---|---|---|
| Club | 23 |  | 1 | 3 | Novice, Einherjar, Völva, Berserker | ธรรมดา | 60 | ร้านค้า |
| Mace | 40 |  | 1 | 3 | Novice, Einherjar, Völva, Berserker | ธรรมดา | 800 | ร้านค้า |
| Tinker's Mallet | 54 |  | 5 | 1 | Novice, Einherjar, Völva, Berserker | ดี | 650 | Ember Unit 0.1% |
| Flail | 60 |  | 12 | 2 | Novice, Einherjar, Völva, Berserker | ดี | 4,000 | Draugr Husk 0.06% |
| Runebound Mallet | 74 |  | 15 | 1 | Novice, Einherjar, Völva, Berserker | ดี | 1,650 | Moss Unit 0.1% |
| Morning Star | 90 |  | 20 | 1 | Novice, Einherjar, Völva, Berserker | ดี | 12,000 | Frame Warden 0.08% |
| Ironhide Maul | 104 |  | 26 | 1 | Novice, Einherjar, Völva, Berserker | ดี | 2,750 | Iron Brute 0.2% |
| Fusebreaker | 130 |  | 38 | 1 | Novice, Einherjar, Völva, Berserker | ดี | 3,950 | Rust Mine Unit 0.2% |
| Rootwarden Maul | 152 |  | 49 | 1 | Novice, Einherjar, Völva, Berserker | ดี | 5,050 | Gnawed Sentry 0.2% |
| Jötunn Knuckle | 175 |  | 55 | 2 | Novice, Einherjar, Völva, Berserker | หายาก | 23,000 | Gnawed Brute 0.04% |

## ชุดเกราะและเครื่องแต่งกาย

### ชุดเกราะ

| ไอเทม | DEF | MDEF | โบนัส | Lv | ช่องชิป | อาชีพ | ความหายาก | ราคา | หาได้จาก |
|---|---|---|---|---|---|---|---|---|---|
| Basic Plating | 1 |  |  | 1 | 1 | ทุกอาชีพ | ธรรมดา | 10 | ร้านค้า |
| Padded Plating | 2 |  |  | 1 | 1 | ทุกอาชีพ | ธรรมดา | 400 | ร้านค้า |
| Nano Robe | 3 | 10 | INT +1 | 1 | 1 | ทุกอาชีพ | ธรรมดา | 3,000 | ร้านค้า |
| Light Plating | 4 |  |  | 1 | 1 | 6 อาชีพ | ธรรมดา | 1,500 | ร้านค้า |
| Gel-Lined Vest | 3 | 2 | HP +30 | 4 | 1 | ทุกอาชีพ | ดี | 550 | Gel Unit 0.15% |
| Gelheart Mail | 4 | 4 | VIT +1, HP +60 | 8 | 2 | ทุกอาชีพ | หายาก | 4,200 | Gel Unit 0.03% |
| Mistweave Robe | 3 | 12 | INT +2 | 12 | 1 | ทุกอาชีพ | ดี | 1,350 | Moss Unit 0.12% |
| Sentry Plating | 6 |  | VIT +1 | 12 | 1 | Einherjar, Berserker, Völva | ดี | 1,350 | Rust Sentry 0.12% |
| Gravecloth Mail | 6 | 3 | HP +100 | 18 | 1 | 6 อาชีพ | ดี | 1,950 | Draugr Husk 0.12% |
| Mesh Armor | 8 |  |  | 20 | 1 | Einherjar, Berserker, Völva | ดี | 9,000 | Iron Brute 0.06% |
| Ironhide Plating | 8 |  | VIT +1, HP +120 | 26 | 1 | Einherjar, Berserker, Völva | ดี | 2,750 | Iron Brute 0.12% |
| Helwick Robe | 4 | 14 | INT +3, castPct +6 | 30 | 2 | ทุกอาชีพ | หายาก | 13,000 | Hel Maiden Unit 0.04% |
| Helgate Plating | 9 |  | VIT +2 | 32 | 1 | Einherjar, Berserker, Völva | ดี | 3,350 | Hel Guard Unit 0.12% |
| Titan Plate | 12 |  |  | 35 | 1 | Einherjar | หายาก | 30,000 | Archive Warden 0.08% |
| Rootbark Plating | 9 | 4 | HP +150 | 42 | 1 | 6 อาชีพ | หายาก | 38,000 | Gnawed Brute 0.16% |
| Rusthusk Plating | 11 |  | VIT +2, HP +200 | 44 | 1 | Einherjar, Berserker, Völva | ดี | 4,550 | Rust Husk 0.12% |
| Gnawed Bulwark | 13 |  | VIT +3, HP +250 | 53 | 1 | Einherjar, Berserker, Völva | ดี | 5,450 | Gnawed Brute 0.12% |

### หมวก

| ไอเทม | DEF | MDEF | โบนัส | Lv | ช่องชิป | อาชีพ | ความหายาก | ราคา | หาได้จาก |
|---|---|---|---|---|---|---|---|---|---|
| Signal Ribbon | 1 | 3 | INT +1 | 1 | 0 | ทุกอาชีพ | ธรรมดา | 800 | ร้านค้า |
| Sensor Cap | 2 |  |  | 1 | 0 | ทุกอาชีพ | ธรรมดา | 1,000 | ร้านค้า |
| Seraph Wings | 3 | 5 | INT +2, LUK +2, AGI +1 | 1 | 0 | ทุกอาชีพ | มหากาพย์ | 50,000 | Seraph Core 3.6%, Ancient Seraph Core 2.5% |
| Bunny-Ear Visor | 2 |  | LUK +1, CRIT +2 | 3 | 0 | ทุกอาชีพ | ดี | 450 | Bunny Unit 0.15% |
| Iron Helm | 4 |  |  | 12 | 1 | 6 อาชีพ | ดี | 6,000 | Hel Guard Unit 0.1% |
| Blastcap Helm | 4 |  | VIT +1 | 13 | 1 | ทุกอาชีพ | ดี | 1,450 | Mine Unit 0.12% |
| Verdant Circlet | 2 | 4 | INT +2, SP +30, ฮีล% +6 | 14 | 1 | ทุกอาชีพ | หายาก | 6,600 | Moss Unit 0.04% |
| Ashen Hood | 3 |  | AGI +1, FLEE +2 | 18 | 1 | ทุกอาชีพ | ดี | 1,950 | Ash Stalker 0.12% |
| Tusked Helm | 5 |  | STR +1 | 27 | 1 | ทุกอาชีพ | ดี | 2,850 | Tusk Trooper 0.12% |
| Lantern Veil | 3 | 8 | INT +2, SP +30 | 30 | 0 | ทุกอาชีพ | ดี | 3,150 | Hel Maiden Unit 0.12% |
| Aureole of Baldr | 5 | 8 | INT +3, LUK +3, AGI +2, HP% +5, ฮีล% +8 | 30 | 1 | ทุกอาชีพ | ตำนาน | 150,000 | Ancient Seraph Core 1%, Seraph Core 0.025% |
| Archive Warden Helm | 6 |  | VIT +2 | 36 | 1 | ทุกอาชีพ | ดี | 3,750 | Archive Warden 0.12% |
| Kitsura Faceplate | 5 | 6 | LUK +3, CRIT +5, MATK% +5 | 42 | 1 | ทุกอาชีพ | มหากาพย์ | 58,400 | Kitsura EX 1.4%, Ancient Kitsura EX 1% |
| Crown of the Rust King | 6 | 4 | STR +2, VIT +2 | 44 | 1 | ทุกอาชีพ | หายาก | 18,600 | Rust Husk 0.05% |
| Gnawer Hide Hood | 7 |  | AGI +2, FLEE +4 | 57 | 1 | ทุกอาชีพ | ดี | 5,850 | Root Gnawer 0.12% |

### โล่

| ไอเทม | DEF | MDEF | โบนัส | Lv | ช่องชิป | อาชีพ | ความหายาก | ราคา | หาได้จาก |
|---|---|---|---|---|---|---|---|---|---|
| Guard | 3 |  |  | 1 | 1 | ทุกอาชีพ | ธรรมดา | 500 | ร้านค้า |
| Scrap Buckler | 4 |  | HP +40 | 6 | 1 | ทุกอาชีพ | ดี | 750 | Bunny Unit 0.1% |
| Barkplate Shield | 5 |  | HP +80 | 12 | 1 | ทุกอาชีพ | ดี | 1,350 | Rust Sentry 0.1% |
| Energy Buckler | 5 |  |  | 14 | 1 | Einherjar, Berserker, Völva | ดี | 6,000 | Draugr Husk 0.06% |
| Bonewall Shield | 6 |  | VIT +1, HP +100 | 24 | 1 | Einherjar, Berserker, Völva | ดี | 2,550 | Frame Warden 0.12% |
| Aegis of Hel | 8 | 3 | VIT +2, stunRes +10 | 34 | 1 | ทุกอาชีพ | หายาก | 14,600 | Hel Guard Unit 0.04% |
| Heartwood Buckler | 8 | 2 | HP +250 | 49 | 1 | ทุกอาชีพ | ดี | 5,050 | Gnawed Sentry 0.12% |
| Rootguard Shield | 9 | 2 | VIT +2, HP +200 | 52 | 1 | Einherjar, Berserker, Völva | ดี | 5,350 | Root Crawler Unit 0.08% |

### ผ้าคลุม

| ไอเทม | DEF | MDEF | โบนัส | Lv | ช่องชิป | อาชีพ | ความหายาก | ราคา | หาได้จาก |
|---|---|---|---|---|---|---|---|---|---|
| Hood | 1 |  |  | 1 | 1 | ทุกอาชีพ | ธรรมดา | 120 | ร้านค้า |
| Thermal Cloak | 1 |  | FLEE +3 | 1 | 1 | ทุกอาชีพ | ธรรมดา | 1,200 | ร้านค้า |
| Cable Scarf | 2 |  |  | 1 | 1 | ทุกอาชีพ | ดี | 5,000 | Ash Stalker 0.08% |
| Rotor-Fin Cape | 1 |  | AGI +1, FLEE +4 | 5 | 1 | ทุกอาชีพ | ดี | 650 | Buzz Unit 0.15% |
| Mistlake Mantle | 2 | 2 | INT +1, FLEE +3 | 14 | 1 | ทุกอาชีพ | ดี | 1,550 | Rust Sentry 0.1% |
| Ashtail Wrap | 2 |  | AGI +2, FLEE +5 | 18 | 1 | ทุกอาชีพ | ดี | 1,950 | Ash Stalker 0.2% |
| Cindertail Cloak | 3 |  | AGI +2, FLEE +6, CRIT +3 | 20 | 1 | ทุกอาชีพ | หายาก | 9,000 | Ash Stalker 0.04% |
| Seraph Down Mantle | 3 | 6 | LUK +2, FLEE +6, HP% +3 | 20 | 1 | ทุกอาชีพ | มหากาพย์ | 32,000 | Seraph Core 1.8%, Ancient Seraph Core 1.3% |
| Wolfpelt Cloak | 2 |  | AGI +1, FLEE +4 | 24 | 1 | ทุกอาชีพ | ดี | 2,550 | Fenrir Unit 0.12% |
| Vaultkeeper's Cloak | 3 | 3 | INT +1, FLEE +5 | 36 | 1 | ทุกอาชีพ | ดี | 3,750 | Rust Mine Unit 0.1% |
| Rootweave Cloak | 3 | 3 | FLEE +4 | 40 | 1 | ทุกอาชีพ | หายาก | 22,000 | Root Gnawer 0.16% |
| Nine-Ember Tail | 4 | 4 | AGI +3, INT +3, FLEE +8, castPct +5 | 40 | 1 | ทุกอาชีพ | มหากาพย์ | 56,000 | Kitsura EX 1.4%, Ancient Kitsura EX 1% |
| Archive Maiden's Shroud | 3 | 6 | INT +2, FLEE +3 | 41 | 1 | ทุกอาชีพ | ดี | 4,250 | Archive Maiden 0.12% |
| Mantle of the Gatehound | 5 | 5 | VIT +3, FLEE +6, HP% +8 | 55 | 1 | ทุกอาชีพ | มหากาพย์ | 74,000 | Garmr 1.4%, Ancient Garmr 1% |

### รองเท้า

| ไอเทม | DEF | MDEF | โบนัส | Lv | ช่องชิป | อาชีพ | ความหายาก | ราคา | หาได้จาก |
|---|---|---|---|---|---|---|---|---|---|
| Hover Pads | 1 |  |  | 1 | 1 | ทุกอาชีพ | ธรรมดา | 400 | ร้านค้า |
| Servo Boots | 2 |  |  | 1 | 1 | ทุกอาชีพ | ธรรมดา | 3,500 | ร้านค้า |
| Crawler Treads | 2 |  | HP +40 | 4 | 1 | ทุกอาชีพ | ดี | 550 | Crawler Unit 0.15% |
| Spring-Heel Greaves | 2 |  | AGI +1, FLEE +3 | 12 | 1 | ทุกอาชีพ | ดี | 1,350 | Hopper Unit 0.12% |
| Mag Boots | 4 |  |  | 20 | 1 | ทุกอาชีพ | ดี | 18,000 | Rust Sap Unit 0.06% |
| Wolfpath Boots | 3 |  | AGI +1, วิ่ง% +5 | 24 | 1 | ทุกอาชีพ | ดี | 2,550 | Fenrir Unit 0.1% |
| Charger Greaves | 4 |  | STR +1, วิ่ง% +6, HP +80 | 28 | 1 | ทุกอาชีพ | หายาก | 12,200 | Tusk Trooper 0.04% |
| Blastproof Greaves | 4 |  | VIT +1, HP +150 | 38 | 1 | ทุกอาชีพ | ดี | 3,950 | Rust Mine Unit 0.12% |
| Rootrunner Boots | 5 |  | AGI +3, FLEE +4, วิ่ง% +8 | 46 | 1 | ทุกอาชีพ | หายาก | 19,400 | Root Crawler Unit 0.05% |
| Gnawhide Boots | 5 |  | VIT +1, AGI +2, HP +120 | 53 | 1 | ทุกอาชีพ | ดี | 5,450 | Gnawed Brute 0.1% |

### เครื่องประดับ

| ไอเทม | DEF | MDEF | โบนัส | Lv | ช่องชิป | อาชีพ | ความหายาก | ราคา | หาได้จาก |
|---|---|---|---|---|---|---|---|---|---|
| Clip |  |  | SP +10 | 1 | 1 | ทุกอาชีพ | ธรรมดา | 5,000 | ร้านค้า |
| Data Band |  |  | VIT +1, HP +40 | 1 | 0 | ทุกอาชีพ | ธรรมดา | 1,500 | ร้านค้า |
| Power Ring |  |  | STR +2 | 1 | 0 | ทุกอาชีพ | ดี | 20,000 | Tusk Trooper 0.04% |
| Signal Earring |  |  | INT +2 | 1 | 0 | ทุกอาชีพ | ดี | 20,000 | Hel Maiden Unit 0.04% |
| Grip Glove |  |  | DEX +2 | 1 | 0 | ทุกอาชีพ | ดี | 20,000 | Hopper Unit 0.03% |
| Rune Charm |  |  | LUK +2, MDEF +3 | 1 | 0 | ทุกอาชีพ | ดี | 20,000 | Archive Maiden 0.04% |
| Garmr Collar |  |  | STR +2, AGI +2, VIT +2, HP +200 | 1 | 0 | ทุกอาชีพ | มหากาพย์ | 70,000 | Garmr 2.7%, Ancient Garmr 1.9% |
| Meadow Charm |  |  | LUK +2, HP +50, SP +10 | 1 | 1 | ทุกอาชีพ | หายาก | 1,400 | Buzz Unit 0.04% |
| Ember Coil Ring |  |  | DEX +1, HIT +4 | 5 | 0 | ทุกอาชีพ | ดี | 650 | Ember Unit 0.15% |
| Hearthcore Earring |  |  | INT +1, DEX +1, MATK +8 | 6 | 1 | ทุกอาชีพ | หายาก | 3,400 | Ember Unit 0.04% |
| Sentinel Core |  |  | VIT +2, DEF +1, HP +80 | 10 | 1 | ทุกอาชีพ | หายาก | 5,000 | Rust Sentry 0.04% |
| Coilspring Band |  |  | AGI +2 | 15 | 0 | ทุกอาชีพ | ดี | 1,650 | Hopper Unit 0.08% |
| Husk Signet |  |  | VIT +2, HP +100 | 17 | 1 | ทุกอาชีพ | หายาก | 7,800 | Draugr Husk 0.05% |
| Gleipnir Link |  |  | STR +2, AGI +2 | 25 | 1 | ทุกอาชีพ | หายาก | 11,000 | Fenrir Unit 0.04% |
| Bearheart Band |  |  | VIT +3, HP% +4 | 26 | 1 | ทุกอาชีพ | หายาก | 11,400 | Iron Brute 0.05% |
| Rustbloom Talisman |  |  | INT +2, SP +60, spCostPct -5 | 33 | 1 | ทุกอาชีพ | หายาก | 14,200 | Rust Sap Unit 0.05% |
| Ember of Ragnarök |  |  | STR +3, INT +3, DEX +3, ATK% +5, MATK% +5 | 45 | 1 | ทุกอาชีพ | ตำนาน | 150,000 | Ancient Kitsura EX 1%, Kitsura EX 0.025% |
| Sigil of Yggdrasil |  |  | VIT +2, INT +2, HP% +5, SP% +5 | 52 | 1 | ทุกอาชีพ | หายาก | 21,800 | Gnawed Sentry 0.04% |

## ชิป (การ์ด)

ใส่ในช่องชิปของอุปกรณ์ตามตำแหน่ง

| ชิป | ใส่ใน | ผล | ได้จาก |
|---|---|---|---|
| Gel Unit Chip | ชุดเกราะ | LUK +2, FLEE +1 | Gel Unit |
| Crawler Chip | ชุดเกราะ | VIT +1, HP +100 | Crawler Unit |
| Bunny Unit Chip | ผ้าคลุม | LUK +1, CRIT +1 | Bunny Unit |
| Ember Unit Chip | เครื่องประดับ | DEX +1, HIT +3 | Ember Unit |
| Buzz Unit Chip | ผ้าคลุม | AGI +1, FLEE +2 | Buzz Unit |
| Hopper Unit Chip | เครื่องประดับ | DEX +1, ATK +5 | Hopper Unit |
| Rust Sentry Chip | ชุดเกราะ | SP +80 | Rust Sentry |
| Mine Unit Chip | หมวก | VIT +2 | Mine Unit |
| Moss Unit Chip | อาวุธ | ATK +10, LUK +1 | Moss Unit |
| Ash Stalker Chip | ผ้าคลุม | AGI +2, FLEE +3 | Ash Stalker |
| Fenrir Unit Chip | อาวุธ | CRIT +8 | Fenrir Unit |
| Iron Brute Chip | โล่ | VIT +1, DEF +2 | Iron Brute |
| Tusk Trooper Chip | ชุดเกราะ | VIT +3 | Tusk Trooper |
| Draugr Husk Chip | โล่ | HP +200 | Draugr Husk |
| Frame Warden Chip | อาวุธ | ATK +10, CRIT +2 | Frame Warden |
| Hel Maiden Chip | หมวก | INT +1, MDEF +5 | Hel Maiden Unit |
| Hel Guard Chip | รองเท้า | VIT +1, HP +150 | Hel Guard Unit |
| Seraph Core Chip | ชุดเกราะ | STR +2, AGI +2, VIT +2, INT +2, DEX +2, LUK +2 | Seraph Core |
| Kitsura EX Chip | รองเท้า | AGI +3, SP +50, FLEE +5 | Kitsura EX |
| Rust Sap Chip | ชุดเกราะ | HP +300, LUK +1 | Rust Sap Unit |
| Archive Warden Chip | อาวุธ | ATK +15, HIT +5 | Archive Warden |
| Rust Mine Chip | หมวก | VIT +2, DEF +1 | Rust Mine Unit |
| Archive Maiden Chip | ผ้าคลุม | INT +2, MDEF +3 | Archive Maiden |
| Rust Husk Chip | โล่ | HP +300, DEF +1 | Rust Husk |
| Root Crawler Chip | รองเท้า | AGI +2, FLEE +3 | Root Crawler Unit |
| Gnawed Sentry Chip | ชุดเกราะ | SP +120, INT +1 | Gnawed Sentry |
| Gnawed Brute Chip | โล่ | VIT +2, DEF +2 | Gnawed Brute |
| Root Gnawer Chip | เครื่องประดับ | STR +2, ATK +8 | Root Gnawer |
| Garmr Chip | อาวุธ | STR +2, ATK +20, CRIT +5 | Garmr |

## เซ็ตไอเทม

| เซ็ต | ชิ้นส่วน | โบนัส |
|---|---|---|
| Meadow Scout | Gel-Lined Vest, Bunny-Ear Visor, Crawler Treads | 2 ชิ้น: LUK +2, HP +40 • 3 ชิ้น: FLEE +5, วิ่ง% +5 |
| Mistlake Mystic | Mistweave Robe, Verdant Circlet, Mistlake Mantle | 2 ชิ้น: INT +2, SP +40 • 3 ชิ้น: castPct +8, ฮีล% +8 |
| Wolfwood Hunter | Huntsman's Recurve, Wolfpelt Cloak, Wolfpath Boots | 2 ชิ้น: AGI +2, FLEE +5 • 3 ชิ้น: CRIT +5, aspdPct +5 |
| Hel's Warden | Wardenbone Sword, Bonewall Shield, Helgate Plating | 2 ชิ้น: VIT +2, DEF +2 • 3 ชิ้น: HP% +8, stunRes +15 |
| Regalia of the Rust King | Rusthusk Greatsword, Crown of the Rust King, Rusthusk Plating | 2 ชิ้น: STR +2, ATK +10 • 3 ชิ้น: ATK% +6, leech +2 |
| Gatehound | Hellhound's Fang, Mantle of the Gatehound, Garmr Collar | 2 ชิ้น: AGI +3, CRIT +5 • 3 ชิ้น: critDmgPct +15, aspdPct +6 |

## ไอเทมใช้งาน

| ไอเทม | ผล | ราคา |
|---|---|---|
| Repair Kit S | ชุดซ่อมขนาดเล็ก ฟื้นฟู HP 45~65 | 50 |
| Repair Kit M | ชุดซ่อมขนาดกลาง ฟื้นฟู HP 105~145 | 200 |
| Repair Kit L | ชุดซ่อมขนาดใหญ่ ฟื้นฟู HP 175~235 | 550 |
| Repair Kit XL | ชุดซ่อมพิเศษ ฟื้นฟู HP 325~405 | 1,200 |
| Energy Cell | เซลล์พลังงาน ฟื้นฟู SP 40~60 | 2,500 |
| Oil Can | น้ำมันหล่อลื่นข้อต่อ ฟื้นฟู HP 16~22 | 15 |
| Coolant | น้ำยาหล่อเย็น ฟื้นฟู HP 18~24 | 15 |
| Nano Paste | นาโนเพสต์ซ่อมโครงสร้าง ฟื้นฟู HP 70~100 | 50 |
| Charge Chip | ชิปชาร์จไฟ ฟื้นฟู SP 10~15 | 200 |
| Antivirus Patch | แพตช์แอนตี้ไวรัส ฟื้นฟู HP 12~18 และล้างไวรัส (พิษ) | 10 |
| Patch Tape | เทปซ่อมด่วน ฟื้นฟู HP 18~28 | 18 |
| Overclock Brew | สารโอเวอร์คล็อก ฟื้นฟู HP 70~100 และ SP 20~40 | 500 |
| Blink Chip | ชิปวาร์ป เคลื่อนย้ายไปจุดสุ่มในแผนที่ปัจจุบัน | 60 |
| Return Beacon | บีคอนกลับฐาน วาร์ปกลับจุดเซฟ | 300 |

## วัตถุดิบ

| วัตถุดิบ | คำอธิบาย | ราคาขาย | ได้จาก |
|---|---|---|---|
| Gel Cell | เซลล์เจลจากโดรน | 6 | Gel Unit 70%, Buzz Unit 30%, Rust Sap Unit 30% |
| Copper Wire | ขดลวดทองแดง | 8 | Crawler Unit 65%, Rust Sentry 30%, Root Crawler Unit 30% |
| Micro Chip | ไมโครชิปขนาดจิ๋ว | 6 | Bunny Unit 20%, Crawler Unit 10% |
| Silver Mesh | ตาข่ายเงินจากหุ่นกระต่าย | 8 | Bunny Unit 60%, Ash Stalker 30% |
| Rotor Blade | ใบพัดโดรน | 14 | Buzz Unit 55% |
| Heat Sink | แผ่นระบายความร้อน | 10 | Ember Unit 50% |
| Bio Gel | เจลชีวภาพเหนียว ๆ | 16 | Moss Unit 50%, Draugr Husk 30% |
| Spring Coil | สปริงขาหุ่นตั๊กแตน | 24 | Hopper Unit 55% |
| Scrap Plate | แผ่นเหล็กขึ้นสนิม | 12 | Rust Sentry 60% |
| Detonator | ตัวจุดระเบิด | 16 | Mine Unit 60%, Rust Mine Unit 30% |
| Ash Filter | ไส้กรองเถ้า | 44 | Ash Stalker 50% |
| Fenrir Fang | เขี้ยวโลหะของหน่วยเฟนริร์ | 60 | Fenrir Unit 60% |
| Plated Hide | เกราะแผ่นของหมีเหล็ก | 180 | Iron Brute 50% |
| Iron Tusk | งาเหล็กของรถถังหมูป่า | 70 | Tusk Trooper 60%, Root Gnawer 30% |
| Rust Dust | ผงสนิมจากเดรากร์ | 24 | Draugr Husk 60%, Rust Husk 30% |
| Old Frame | โครงเหล็กเก่า | 72 | Frame Warden 50% |
| Soul Lantern | ตะเกียงวิญญาณดิจิทัล | 180 | Hel Maiden Unit 40% |
| Cursed Chip | ชิปต้องคำสาป | 240 | Hel Guard Unit 40% |
| Yggdrasil Core | แกนพลังงานต้นไม้โลก ล้ำค่าที่สุดในนีโอมิดการ์ด | 20,000 | Ancient Seraph Core 50%, Ancient Kitsura EX 50%, Ancient Garmr 50% |
| Rust Sap | น้ำเลี้ยงที่ขึ้นสนิม ข้นและอุ่นผิดปกติ | 170 | Rust Sap Unit 55% |
| Archive Seal | ตราประทับประจำชั้นวางในคลังประกาย | 220 | Archive Warden 50% |
| Rust Fuse | ชนวนทุ่นกั้นสนิม — สนิมกินจนจุดเองได้ | 240 | Rust Mine Unit 50% |
| Rusted Spark | ประกายที่สนิมเกาะ ยังอุ่นอยู่ในมือ | 280 | Archive Maiden 50% |
| Corroded Core | แกนร่างเศษเหล็กที่ผุจนเป็นรู | 320 | Rust Husk 45% |
| Root Fiber | เส้นใยรากของ Yggdrasil ที่ถูกแทะขาด | 340 | Root Crawler Unit 50% |
| Gnawed Bark | เปลือกรากที่มีรอยฟันนับร้อย | 380 | Gnawed Sentry 45% |
| Rusted Plate | แผ่นเกราะหนาที่สนิมกินเป็นลายราก | 420 | Gnawed Brute 45% |
| Gnawer Tusk | งาที่สึกเพราะแทะรากมาทั้งชีวิต | 500 | Root Gnawer 45% |
| Scrap Gear | เฟืองเศษเหล็ก ร้านรับซื้อเป็นกิโล | 12 | Gel Unit 30%, Crawler Unit 30%, Ember Unit 30% |
| Frayed Cable | สายเคเบิลลุ่ย ทองแดงข้างในยังขายได้ | 30 | Hopper Unit 35%, Mine Unit 30% |
| Cracked Visor Lens | เลนส์ไวเซอร์ร้าว แต่ยังสะท้อนแสงได้สวย | 60 | Iron Brute 35% |
| Rune Shard | เศษหินรูนที่พลังยังจางไม่หมด | 110 | Frame Warden 35%, Hel Guard Unit 30% |
| Helfire Ember | ถ่านไฟสีเขียวจากเตาของเฮล จับแล้วกลับเย็น | 200 | Hel Maiden Unit 35% |
| Archive Data Crystal | ผลึกข้อมูลจากคลังประกาย ข้างในมีบันทึกที่ยังไม่มีใครอ่าน | 360 | Archive Warden 30%, Archive Maiden 30% |
| Yggdrasil Sap | น้ำเลี้ยงสีทองของต้นไม้โลก หอมหวานและอุ่น | 520 | Gnawed Brute 30%, Gnawed Sentry 25% |
| Tarnished Einherjar Medal | เหรียญกล้าหาญของนักรบวัลฮัลลาที่หมองไปตามกาลเวลา | 1,400 | Rust Husk 4%, Archive Warden 3% |
| Valkyrie Plume Circuit | วงจรขนนกของวาลคิรี นักสะสมยอมจ่ายแพงมาก | 6,000 | Ancient Seraph Core 100%, Ancient Kitsura EX 100%, Kitsura EX 60% |
| Rune Alloy | โลหะผสมจารึกรูน Brokk ต้องใช้ตีบวกอาวุธตั้งแต่ +5 ขึ้นไป (ครั้งละ 1 ชิ้น) | 900 | Ancient Seraph Core 100%, Ancient Seraph Core 100%, Ancient Kitsura EX 100% |
| Volt Ore | แร่ที่มีกระแสไฟวิ่งอยู่ข้างใน Brokk ต้องใช้ตีบวกชุดเกราะตั้งแต่ +5 ขึ้นไป (ครั้งละ 1 ชิ้น) | 700 | Ancient Seraph Core 100%, Ancient Kitsura EX 100%, Ancient Kitsura EX 100% |
| Valhalla Sigil | ตราวัลฮัลลา ฉีกออกมาจากแกนของบอสที่ล้มลง — ปราบ MVP ได้ 1 อัน, ร่วมตี World Boss ได้ 3 อัน นำไปหมุนวงล้อนอร์น (Norn's Wheel) ที่นีโอเอลด์ไฮม์ | 100 |  |

## ร้านค้า

| ร้าน | สินค้า |
|---|---|
| tool | Repair Kit S, Repair Kit M, Repair Kit L, Repair Kit XL, Energy Cell, Oil Can, Nano Paste, Charge Chip, Overclock Brew, Blink Chip, Return Beacon |
| weapon | Knife, Cutter, Main Gauche, Sword, Falchion, Broadsword, Hand Axe, Cleaver Axe, Energy Rod, Arc Wand, Bow, Composite Bow, Club, Mace |
| armor | Basic Plating, Padded Plating, Light Plating, Nano Robe, Sensor Cap, Signal Ribbon, Guard, Hood, Thermal Cloak, Hover Pads, Servo Boots, Data Band, Clip |

## เควสต์เนื้อเรื่อง

| บท | เควสต์ | ทำอะไร | รางวัล |
|---|---|---|---|
| 1 | หน่วยใหม่รายงานตัว | คุยกับ Guard Unit Rolf | 10 BEXP, 5 JEXP, Repair Kit S ×5 |
| 1 | ตรวจร่างกับ Eir | คุยกับ Eir Repair Unit | 100 Volt, 20 BEXP, 10 JEXP |
| 1 | ฝึกท่าแรก | ตีหุ่นฝึก ×10 | 20 BEXP, 15 JEXP, Oil Can ×5 |
| 1 | คนสวนที่ลืมหน้าที่ | ล่า Gel Unit ×5 | 60 BEXP, 40 JEXP, Repair Kit S ×5 |
| 1 | น้ำเลี้ยงยังสะอาดไหม | เก็บ Gel Cell ×3 จาก Gel Unit | 300 Volt, 50 BEXP, 30 JEXP |
| 1 | ให้ Bifrost จดจำเจ้า | บันทึกจุดเซฟที่ Bifrost | Blink Chip ×3 |
| 1 | ร่างเริ่มปรับตัว | Base Lv 5 | 300 Volt, Hood ×1 |
| 1 | โดรนที่ดุผิดปกติ | ล่า Buzz Unit ×3 | 150 BEXP, 100 JEXP, Repair Kit M ×3 |
| 2 | ข้อมูลการต่อสู้ครบถ้วน | Job Lv 10 | Hover Pads ×1 |
| 2 | รับแม่พิมพ์ของวีรชน | เปลี่ยนเป็นคลาสแรกที่ Mimir | 1,000 Volt, Repair Kit L ×3 |
| 2 | ติดตั้งท่าแรกของแม่พิมพ์ | อัปสกิลแรก | 300 BEXP, 200 JEXP, Repair Kit M ×5 |
| 2 | สานต่อท่าของเขา | ใช้สกิล ×10 | 400 BEXP, 300 JEXP, Charge Chip ×3 |
| 3 | สนิมยังลามอยู่ | ล่า Rust Sentry ×10 | 800 BEXP, 500 JEXP, Guard ×1 |
| 3 | ทุ่นที่ไม่ควรเดิน | ล่า Mine Unit ×8 | 1,000 BEXP, 700 JEXP, Repair Kit L ×3 |
| 3 | โล่ของทูตหนาเกินไป | ตีบวกอุปกรณ์ที่ Brokk | 1,500 Volt |
| 3 | ร่างที่หมอกไม่กล้าแตะ | Base Lv 20 | 1,000 Volt, Servo Boots ×1 |
| 3 | ไฟเพิ่งผ่านไป | ล่า Ash Stalker ×10 | 2,500 BEXP, 1,600 JEXP, Repair Kit L ×5 |
| 3 | ข้อความในหมอก | ล่า Seraph Core ×1 | 5,000 Volt, Clip ×1, Repair Kit XL ×3 |
| 4 | เสียงหอนในป่า | Base Lv 30 | 3,000 Volt, Repair Kit XL ×5 |
| 5 | ประกายในร่างผิด | ล่า Draugr Husk ×10 | 4,000 BEXP, 2,600 JEXP, Repair Kit XL ×3 |
| 5 | ตะเกียงบนชั้นวาง | เก็บ Soul Lantern ×5 จาก Hel Maiden Unit | 4,000 Volt, 5,000 BEXP, 3,200 JEXP |
| 5 | ราชินีแห่งโพรง | คุยกับ Hel | 3,000 BEXP, 2,000 JEXP, Energy Cell ×3 |
| 5 | หน้ากากของไฟ | ล่า Kitsura EX ×1 | 10,000 Volt, Repair Kit XL ×5, Energy Cell ×5 |
| 5 | ใบแรก | คุยกับ Hel | 5,000 Volt, 8,000 BEXP, 5,000 JEXP, Repair Kit XL ×5 |
| 6 | เสียงแทะใต้โพรง | คุยกับ Bifrost Keeper | 3,000 BEXP, 2,000 JEXP, Repair Kit XL ×3 |
| 6 | น้ำเลี้ยงสีสนิม | ล่า Rust Sap Unit ×15 | 9,000 BEXP, 6,000 JEXP, Repair Kit XL ×3 |
| 6 | ประกายที่ขึ้นสนิม | เก็บ Rusted Spark ×6 จาก Archive Maiden | 8,000 Volt, 14,000 BEXP, 9,000 JEXP |
| 6 | ผลตรวจของ Eir | คุยกับ Eir Repair Unit | 6,000 BEXP, 4,000 JEXP, Repair Kit XL ×5, Energy Cell ×2 |
| 6 | ร่างที่ทนสนิม | Base Lv 45 | 5,000 Volt, Rootweave Cloak ×1 |
| 6 | รากที่ถูกแทะ | ล่า Root Crawler Unit ×20 | 30,000 BEXP, 20,000 JEXP, Repair Kit XL ×5 |
| 6 | ล่า MVP: Garmr | ล่า Garmr ×1 | 20,000 Volt, Yggdrasil Core ×1, Repair Kit XL ×5 |
| 6 | ชื่อของสนิม | คุยกับ Mimir AI | 40,000 BEXP, 25,000 JEXP, Repair Kit XL ×5, Energy Cell ×3 |

## ภารกิจประจำวัน

ได้ 3 ภารกิจต่อวัน สุ่มตามเลเวล ทำครบเปิดหีบรางวัล และนับวันต่อเนื่อง (streak)

| ชนิด | น้ำหนักการสุ่ม | ปลดล็อก |
|---|---|---|
| ⚔ ล่ามอน | 3 | ตั้งแต่เริ่ม |
| 🗺 สำรวจแผนที่ | 3 | ตั้งแต่เริ่ม |
| ✦ ใช้สกิล | 3 | ตั้งแต่เริ่ม |
| ◈ เก็บของ | 3 | ตั้งแต่เริ่ม |
| ◎ ขายของ | 2 | Base Lv 8 |
| ⚒ ตีบวก | 1.5 | Base Lv 14 |
| ♛ ล่า MVP | 1.2 | Base Lv 24 |

## World Boss

แข็งกว่า MVP 5 เท่า • เกิดทุก 60 นาที อยู่ 40 นาที • เลือดใช้ร่วมกันทั้งแผนที่ ไม่ฟื้นเมื่อผู้เล่นตาย • มีตารางอันดับดาเมจ

| แผนที่ | บอส | เกิดนาทีที่ |
|---|---|---|
| Mistlake Plains | Ancient Seraph Core | :00 |
| Hel's Hollow | Ancient Kitsura EX | :20 |
| Gnawed Roots | Ancient Garmr | :40 |

## กาชา Norn's Wheel

ใช้ Valhalla Sigil 1 อัน/ครั้ง • ได้จาก MVP 1 อัน, World Boss 3 อัน • หมุน 10 ครั้ง (10 อัน) การันตีหายากขึ้นไป • การันตีมหากาพย์ ทุก 50 ครั้ง • NPC อยู่ที่นีโอเอลด์ไฮม์

| รางวัล | จำนวน | โอกาส |
|---|---|---|
| Repair Kit XL | 5 | 14% |
| Repair Kit L | 10 | 12% |
| Energy Cell | 3 | 11% |
| Overclock Brew | 5 | 8% |
| Return Beacon | 3 | 6% |
| Volt | 5,000 | 9% |
| Rune Alloy | 2 | 9% |
| Volt Ore | 2 | 9% |
| Tarnished Einherjar Medal | 1 | 5% |
| Volt | 25,000 | 3% |
| Valkyrie Plume Circuit | 1 | 3% |
| Meadow Charm | 1 | 2.5% |
| Husk Signet | 1 | 2.5% |
| Yggdrasil Core | 1 | 2.8% |
| Seraph Down Mantle | 1 | 1.2% |
| Nine-Ember Tail | 1 | 0.8% |
| Garmr Collar | 1 | 0.6% |
| Seraph Core Chip | 1 | 0.5% |
| Aureole of Baldr | 1 | 0.05% |
| Ember of Ragnarök | 1 | 0.05% |

รวม 100.0%
