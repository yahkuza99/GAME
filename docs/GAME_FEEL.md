# IRON VALHALLA — Game Feel / ปรัชญาความสะใจ

> วิเคราะห์จากโค้ดจริง (juice.js, game.js, loot.js, ui.js, sound.js, fx2.js, gacha.js, npc.js ฯลฯ) • ข้อเสนอทั้งหมด **ไม่แตะค่า balance ของ Class** • แก้เอกสารนี้เป็นแนวทาง ไม่ใช่ spec ตายตัว

## 1. ปรัชญาความสะใจ (Philosophy)

ความสะใจ = ความรู้สึก "เมื่อกี้ฟินมาก" ที่เกิดจาก **การกระทำเล็ก ๆ ได้ผลตอบกลับที่ใหญ่กว่าที่คาด** ในเวลาที่เร็วพอ

1. **Anticipation → Impact → Release** — ง้าง (ช้า) → กระแทก (เร็วมาก) → ตามแรงค้าง (นุ่ม) ทุกเหตุการณ์สำคัญต้องมีสามช่วงนี้ เพราะสมองจำ "ช่วงกระแทก" ได้ดีก็ต่อเมื่อมีช่วงเงียบ/ช้าก่อนหน้าให้เทียบ (Swink, *Game Feel*; ท่าฟัน snap() ของเกมทำถูกแล้ว)
2. **ทุก input ได้คำตอบทันที เห็นได้และได้ยินได้** — ภายใน 1 เฟรม (<=16ms) ต้องมีอย่างน้อยหนึ่งอย่างขยับ + หนึ่งเสียง เพราะ latency ของ feedback = ความรู้สึกว่า "ตัวละครเชื่อฟัง" (Vlambeer: "juice it or lose it")
3. **ตัวเลขขึ้นแล้วต้องเห็นมันขึ้น** — EXP, Zeny, ดาเมจ, เลเวล ต้องมีภาพที่ไหลไปหา HUD หรือนับเลขขึ้น ไม่ใช่แค่บรรทัดแชต เพราะความก้าวหน้าที่มองไม่เห็นไม่ให้ dopamine (Hades/Vampire Survivors: เลข+ของลอยพรั่งพรูตลอด)
4. **ความแรงต้องไต่ระดับ (Escalation / Hierarchy of Juice)** — ปกติ < คริ < สกิลแรง < ฆ่าหลายตัว < ของหายาก < บอส ทุกขั้นต้องต่างกัน "ชัดจนไม่ต้องดูเลข" และของที่เกิดถี่ต้องเบา ไม่งั้นของใหญ่ไม่ใหญ่จริง (Nijman, *Art of Screenshake*: ปรับทีละอย่างแล้วเทียบ)
5. **เสี่ยง แล้วโล่ง (Risk → Relief)** — ตีบวก, gacha, HP ต่ำแล้วฮีลทัน, บอสใกล้ตาย ต้องมีช่วง "ลุ้น" (เงียบ/ช้า/เสียงถี่ขึ้น) แล้วค่อยปล่อย เพราะความโล่งที่ได้มาหลังความตึงให้ความสุขมากกว่าเจอของดีเฉย ๆ (Diablo/RO loot feel: เห็นสีลำแสงก่อนรู้ว่าเป็นอะไร)
6. **ฝีมือต้องมองเห็น (Mastery made visible)** — chain, multi-kill, crit streak, ยิ่งเก่ง ยิ่งมีเสียง/ภาพสะสม (pitch ไต่ขึ้น, ตัวนับเด้ง) ให้ผู้เล่นรู้ว่า "ฉันกำลังเล่นดีอยู่" ไม่ต้องรอให้เกมบอก
7. **จังหวะและสะสม (Rhythm & Stacking)** — เสียง/ภาพที่ต่อกันเป็นลำดับ (ตี-ตี-ตี-ฆ่า) ต้องรู้สึกเป็นดนตรี ไม่ใช่เสียงซ้ำจนชา (pitch ±4% มีแล้ว → เพิ่มการไต่ระดับตาม combo)
8. **ลดการรอ เพิ่มการทำ (Less waiting, more doing)** — ทุกวินาทีที่ผู้เล่นเดินหาเป้า/ดูแชตเปล่า ๆ คือความสะใจที่รั่ว: ให้เป้าถัดไปอยู่ใกล้ + ของตกบินเข้าหาเอง
9. **เคารพเวลาผู้เล่น** — เอฟเฟกต์ยาว ต้องข้ามได้/ไม่บล็อก input; slow-mo สั้น (<=0.4 วิ) และมีงบ (J.dilate มีงบ 0.2 วิ/วินาทีแล้ว); `prefers-reduced-motion` และ `R.quality==='low'` ต้องเบาลงทุกอย่างใหม่
10. **ข้างหลังเป็นกติกาเดียวกันเสมอ** — ภาพ/เสียงใหม่ทั้งหมดเป็น "ผิวหน้า" เท่านั้น (ไม่เปลี่ยน damage, drop rate, EXP, seed ของ sim) เพื่อให้บอท/เทสต์/เซฟเหมือนเดิม

## 2. ตรวจของที่มีอยู่แล้ว (Audit)

เกมมี juice ค่อนข้างหนาแน่นแล้ว (juice.js 686 บรรทัด) — **อย่าทำซ้ำ**: hit-stop, ยุบ-ยืด, slash mark RO, damage number 7 สไตล์, shatter, pillar บอส, ขอบจอแดง, trail อาวุธ, motion blur ghost, FX สกิล ~50 ตัว

| ช่วงเวลา | มีอยู่แล้ว | ช่องว่าง (Gap) |
|---|---|---|
| ตีปกติ (melee) | freeze 35ms, sparks 5, shake 1.1/60ms, slash mark สลับทิศ, recoil, flash ขาว, sfx slash/smash (ไฟล์จริง), weapon trail | pitch ไม่ไต่ตาม combo • ธนู/เวทไม่มี freeze |
| คริติคอล | freeze 70ms, dilate 0.25x/45ms, sparks 14, shake 3 (+3.2), ตัวเลขทอง+ดาวแตก+CRITICAL, sfx crit | ไม่มีแฟลชขอบจอ/zoom punch • ฟังเหมือนกันทุกคริ |
| สกิลแรง (>=20% maxHp) | freeze 80ms, dilate 0.2x/60ms, sparks ตามธาตุ, tint ธาตุ | ไม่มีระดับ "ท่าไม้ตาย" แยกจากสกิลธรรมดา |
| ฆ่ามอน | shatter 22 ชิ้น+วงแหวน, dilate 0.3x/50ms, sfx kill (ตูม) | เศษกระจายรอบทิศ ไม่ตามทิศที่ตี • เสียงเหมือนกันทุกขนาด • EXP/Zeny ไม่ไหลเข้า HUD (EXP มีแค่แชต) |
| Multi-kill / Combo | **ไม่มีเลย** (combo ใน daily.js คือ streak รายวัน, `s.chain` คือสกิลต่อเนื่อง) | ไม่มีตัวนับ, ไม่มีรางวัลทางภาพ/เสียงเมื่อฆ่ารัว |
| Level up | pillar 2.2s, floater LEVEL UP!, sfx levelup ~1s, แชต, ฟื้นเต็ม | ไม่มีแฟลชจอ/เลขใหญ่/HUD pop • EXP bar ไม่มีจังหวะเต็ม→ล้างใหม่ |
| EXP bar | `.gauge .fill` transition .18s, visor `#exp-line` .3s | ไม่มี pulse ตอนได้ EXP, ไม่มีสัญญาณ "ใกล้เลเวลแล้ว" |
| Stat / Skill / Job Lv | stat และ learnSkill = 'click' เท่านั้น • Job Lv มี floater + sfx | ไม่มีเลขเด้ง/ไฮไลต์ช่องที่เปลี่ยน |
| Loot ตกพื้น | pop arc 0.35s, ลำแสงตั้ง rank>=2 (loot.js), rank>=3 เสียง 'mvp' + announce, การ์ด = beam + announce, Epic+ ประกาศแชตออนไลน์ | Auto Loot = ของหายเข้ากระเป๋าเงียบ ๆ ไม่มีภาพบิน • uncommon ไม่มี cue • Epic/Legend ต่างกันแค่ขนาดลำแสง |
| เก็บของ | 'pickup' chime + บรรทัดแชต | pitch เท่ากันทุก rarity |
| ตีบวก (Brokk) | รอ 380–400ms → floater +N!/พลาด + fx levelup + sfx refine_ok/fail | ไม่มีจังหวะค้อน/เงียบก่อนผล • +10 ไม่พิเศษ • พลาดเบาเกินไป |
| Gacha | หมุน ease + แสงไล่สี + tease 480/700ms + flash Epic+ + พลิกการ์ด + ข้ามได้ | ไม่มีเสียงติ๊กวงล้อชะลอ/ความเงียบก่อนเฉลย |
| สกิล | FX2 ~50 ตัว + kick 3–6, castcircle ตอนร่าย, sfx ตามธาตุ | ช่วงร่ายไม่มีเสียงไต่ขึ้น • ไม่มีแฟลช/zoom ตอนปล่อยไม้ตาย |
| บอส / MVP | splash card + announce ตอนเกิด, telegraph พื้นแดง, ตาย: 150ms→0.35x 0.4s + pillar + shake 10 + แฟลชทอง + แตร | ตอนเกิดไม่มีเสียง stinger • ไม่มีเหตุการณ์ที่ HP 50%/25% • ของดรอปไม่พุ่งกระจาย |
| Class upgrade / Quest / Daily | upgrade fx 3.2s+splash+sfx • quest fanfare + BOUNTY CLEAR! • daily chest reveal | ครบพอแล้ว — ไม่ต้องแตะ |
| ผู้เล่นโดน / HP ต่ำ | ขอบแดงเมื่อ >=8% maxHp, shake เมื่อ >=15%, ring HP pulse เมื่อ <25% | ไม่มีเสียงหัวใจ • ฮีลตอน HP ต่ำไม่มี "โล่งอก" |
| Hotbar | กดแล้วย่อ .93, overlay cooldown + ตัวเลข | cooldown หมดแล้วไม่มีสัญญาณ "พร้อมใช้" |
| เสียง | synth 30+ cue, compressor, reverb, pitch ±4%, rate-limit 45ms/ชื่อ | ไม่มี BGM ducking, ไม่มี pitch ตามขนาดมอน, AoE ฆ่า 10 ตัว = ได้ยิน 1 เสียง |
| Atmosphere / Pacing | sky, fog, หิ่งห้อย, grade สีต่อแมพ, low-quality ตัดทอนแล้ว • respawn 4–10s, autoCounter, บอท | ไม่มีตัวชี้วัดกิล/นาที (kills per minute) |

## 3. ข้อเสนอเรียงตามผลต่อความสะใจ / แรงงาน

กฎร่วมของทุกข้อ (ทำตามที่ juice.js ทำอยู่แล้ว): ภาพทั้งหมดเช็ค `vis()` (= `!G.fastSim`) • ห้ามใช้ `Math.random` ของเกม ใช้ `rand()`/`rnd()` ใน Juice • สโลว์/zoom/แฟลชผ่าน `J.dilate`/`J.flash` (ถูกตัดเมื่อ `Bot.on` ยกเว้น force) • `low()` → อนุภาค/ชิ้นส่วนครึ่งเดียว, ไม่ใช้ filter • `J.rm` → ปิด dilate/zoom, แฟลชเหลือ 0.6x • DOM overlay ขับด้วย rAF (ไม่ใช้ WAAPI — ตามที่ comment ใน J.flash เตือนไว้) • ทุกข้อ "ไม่ต้องมีงานศิลป์ใหม่" ยกเว้นที่ระบุ

### ระดับ A — คุ้มที่สุด

**1. Chain / Combo counter + เสียงไต่ระดับ** (M • โค้ดล้วน)
- รู้สึก: ฆ่ารัว ๆ แล้วมีเลข `×12 CHAIN` ที่เด้งทุกครั้งที่ฆ่า เสียงสูงขึ้นทีละ semitone รู้ว่ากำลัง "ติดมือ"
- ทำ: `juice.js` เพิ่ม `J.chain = {n, t}`; ใน `J.onKill` ถ้า `G.time - t < 3.0` → `n++` ไม่งั้น `n=1`; รีเซ็ตเมื่อ `changeMap`/ตาย. วาดเป็น DOM ขวาบนใต้มินิแมพ (ตัวเลขใหญ่ 28px, scale 1→1.45→1 ใน 140ms ด้วย rAF) + แถบ decay 3 วิใต้เลข. Milestone 5/10/25/50/100 → floater `×10!` สีทอง + `J.flash('gold', 0.25)` + `Sound.chime(880*2^(n/12), 0, .05)` (cap +12 semitone). ต่อ `Sound.play('hit')` ด้วย `Sound.pitchMul` (+1 semitone ต่อ hit ภายใน 0.8 วิ, สูงสุด +7, ใช้กับ `synth` ที่มี `j` อยู่แล้ว)
- ระวัง: ไม่ให้รางวัลเชิงเลข (ไม่เพิ่ม EXP) — ผิวหน้าล้วน; บอทเล่นก็เห็นได้ (ดีสำหรับ AFK ดูตอนกลับมา)

**2. Reward orbs: EXP/Zeny/ของ ลอยบินเข้าหาตัวผู้เล่น** (M • โค้ดล้วน)
- รู้สึก: ฆ่าแล้วมีลูกแสงเด้งออกจากศพแล้วดูดเข้าตัว/แถบ EXP — "ได้ของ" จับต้องได้ แทนที่ของหายเงียบ ๆ (Auto Loot ตอนนี้ `addItem` ทันที ไม่มีภาพ)
- ทำ: `juice.js` `J.orb(x, y, kind, icon)` สร้าง fx `jk:'orb'`: เด้งโค้งขึ้น 14px ใน 0.3s (สูตรเดียวกับ pop ของ drop ใน render.js) → รอ 0.1s → บินเข้าหา `p.x,p.y` ด้วย ease-in cubic 0.35s + หาง 3 จุด (ปิดหางเมื่อ low). ไอคอนใช้ `itemIconCanvas`. ตรรกะของ (addItem/EXP) **ไม่เปลี่ยน** ยังทันทีเหมือนเดิม. เรียกจาก wrapper `dropItemOnGround` (ตรงที่ `looted===true`) และ `killMob` (EXP: 2–3 ลูกฟ้า, บอส 10 ลูก; Zeny: 1–3 เหรียญ). เมื่อถึงตัวเล่น `Sound.chime` pitch ตาม rarity (common G6, uncommon B6, rare D7, epic G7). จำกัดสูงสุด 12 ลูกพร้อมกัน (low = 5)
- ต่อ HUD: ตอนลูกฟ้าถึง → เพิ่ม class `.gain` บน `#bi-bexp`/`#exp-line-fill` 250ms (brightness 1.6 + glow) — CSS ล้วน

**3. Level-up fanfare ให้สมกับเป็นช่วงที่ฟินที่สุดของ RPG** (S • โค้ดล้วน)
- รู้สึก: เลเวลอัป = "โลกหยุดหนึ่งจังหวะ" ไม่ใช่แค่ตัวหนังสือลอย
- ทำ: ใน `gainExp` (ผ่าน wrapper ใน juice.js ครอบ `addFloater` เมื่อ text==='LEVEL UP!' หรือครอบ `gainExp` ตรวจ `baseLv` เปลี่ยน) → `J.dilate(0.25, 0.18, true)` + `J.flash('gold', 0.55)` + วงแหวนทองกวาดพื้น r=0→6 tile ใน 0.5s (ใช้ pushFx ใหม่ `jk:'nova'`) + เลข `LV 24` ใหญ่ 56px กลางจอบน (DOM, scale 2.2→1 ใน 220ms, ค้าง 1.2s, fade) + `#bi-lvbadge` CSS keyframe pop 1→1.5→1 (400ms) + ฟื้น HP/SP แล้ว `J.flash('heal')` เขียวฟ้าจาง ๆ. Job Lv: ทำเฉพาะเลข+วงแหวนฟ้า (เบากว่า)
- EXP bar: เมื่อ levelup ให้ bar วิ่งไป 100% (200ms) → วาบขาว → ตั้งกลับ 0 โดยปิด transition 1 เฟรม → ไต่ไปค่าใหม่ (ตอนนี้กระโดดถอยหลัง — ui.js `refresh` เส้นที่เซ็ต `#bi-bexp`/`#exp-line-fill`)

**4. ลำดับชั้นเสียง/แสงของไอเทมหายาก (Rarity cue ladder)** (S • โค้ดล้วน + sound สังเคราะห์)
- รู้สึก: ได้ยินก่อนเห็นว่า "เฮ้ย ของดี" แยก Epic กับ Legendary ออกจริง
- ทำ: `loot.js` ตรง `dropItemOnGround` wrapper เรียก `Juice.lootCue(rank, x, y)` (ใหม่ใน juice.js): rank1 uncommon = ring เขียว 0.25s + chime G6 เบา ๆ (ตอนนี้ไม่มี cue) • rank2 rare = beam 160px (มีแล้ว) + ring ฟ้า + `Sound 'holy'` สั้น • rank3 Epic = เพิ่ม `J.dilate(0.4, 0.12)` + shake 2/0.15 + แฟลชพื้นม่วง 120ms + **เปลี่ยนเสียงจาก 'mvp' (แตร 1 วิ) เป็น cue ใหม่ 'drop_epic'** (FM bell 3 ตัว 0.5s) • rank4 Legend = ทั้งหมด + `J.flash('gold', 0.6)` + `J.dilate(0.15, 0.3, true)` + 'mvp' เต็ม. Epic ใช้ `Sound.synth` เคส 'drop_epic', 'drop_legend' เพิ่ม 2 case
- เสริม (ถ้าต้องการลุ้น): rank>=3 ให้ของบนพื้นเป็น "ลูกแสงสี rarity" 0.5s ก่อนเผยไอคอน (render.js วาด drop: `age<0.5` วาดวงกลมสีแทน `drawImage`)

**5. Refine (ตีบวก) ให้เป็นพิธีกรรม ไม่ใช่การรอ** (M • โค้ดล้วน)
- รู้สึก: ค้อน 3 ที — ตึง — ผลออก; สำเร็จ = ระเบิดทอง, พลาด = ร้าว (แต่ของไม่แตก ไม่โหด)
- ทำ: `npc.js` ลูป refine แทน `await setTimeout(400)` ด้วย `await Juice.forge(level, win)` ที่ 3 beat × 110ms (`Sound.synth('equip')` pitch +0, +2, +4 semitone + `J.shake(1.2→2.4, .08)` + sparks ที่เท้าผู้เล่น) → เงียบ 220ms (BGM duck, ดูข้อ 17) → ผล. สำเร็จ: เดิม + แฟลชทอง + `J.dilate(0.3,.12)`; **+7 ขึ้นไป** ไล่ระดับ (+7 pillar สั้น, +10 `UI.announce` + splash + 'mvp'). พลาด: floater `CRACK…` เทา + shards 10 ชิ้น + ตุ้บต่ำ + ข้อความ "ของยังอยู่ครบ" (เดิมมี). โหมด auto-strike ย่อเป็น 1 beat (~380ms เท่าเดิม) เคารพเวลาผู้เล่น; ไม่เปลี่ยน RATE/cost

### ระดับ B — ผลดี แรงงานน้อย

**6. Overkill / Finisher: เศษพุ่งตามทิศที่ตี** (S)
- ทำ: wrapper `damageMob` เก็บ `over = dmg - hp0` ลง `m._over`; `J.shatter(m, big)` รับ bias: มุมเศษ `a = atan2(z.ry,z.rx) + rnd(-0.9,0.9)` 60% ของชิ้น, `v *= 1.5` ถ้า `over >= maxHp` (ตายด้วยดาเมจเกิน 2 เท่า) + ตัวหนัง `OVERKILL` เล็ก ๆ (floater, 40% โอกาสหรือเฉพาะ over>=3x กันรก). ปัจจุบันรัศมีรอบทิศ ไม่รู้สึกว่า "ตีกระเด็น"

**7. Multi-kill burst** (S)
- ทำ: `J.onKill` นับ kill ภายใน 250ms (`J.mk`); ถึง 3 ตัว → วงช็อกเวฟที่จุดกึ่งกลาง + `J.shake(4,.2)` + floater `TRIPLE!` (3), `MULTI!` (5+), ครั้งเดียวต่อ burst; `J.dilate` ขอได้แค่ 1 ครั้ง/burst (งบ 0.2 วิ/วินาทีป้องกันซ้อนอยู่แล้ว). เหมาะกับสกิลพื้นที่ (Meteor, Earth Splitter, Arrow Storm)

**8. ท่าไม้ตาย: แฟลช + zoom punch + เสียงไต่ขึ้นตอนร่าย** (M)
- ทำ: wrap `beginSkill`/`executeSkill` ใน juice.js; นิยาม "ไม้ตาย" แบบไม่แก้ data: `s.cd >= 15` หรือ `s.cast(lv) >= 1500ms` หรือ `FX2.SKILL[id]` ที่มี `kick[0] >= 5`. ตอน `p.cast` เริ่ม: `Sound 'charge'` (osc sine 180→900Hz ตลอด castMs + hiss สูงขึ้น, vol เบา) → ตอน execute: `J.flash` สีธาตุ 90ms alpha 0.3 + zoom punch (`#cv` CSS scale 1→1.03→1 ใน 160ms ผ่าน rAF; ไม่แตะ `R.zoom` เพราะ `R.pick` ใช้) + `J.dilate(0.15, 0.08)`. ปิด zoom เมื่อ `J.rm`

**9. Boss: stinger ตอนเกิด + milestone HP 50%/25% + ของพุ่งกระจาย + zoom ตอนจบ** (S–M)
- เกิด: `spawnMvp`/`WB.spawn` ตอนนี้มี splash แต่ไม่มีเสียง → `Sound 'boss_intro'` (FM 55→40Hz 1.2s + hiss ต่ำ) + `J.shake(6,.5)` + `J.flash('hurt', .35)` (แดงอ่อน)
- Milestone: ใน wrapper `damageMob` ตรวจ `m.hp/m.maxHp` ข้าม 0.5, 0.25 (เก็บ `m._ms`) → `J.dilate(.3,.1)` + วงแดง + floater `HALF!` / `ใกล้แล้ว!` (เป็น feedback ความก้าวหน้า **ไม่ใช่** โหมด enrage ไม่เปลี่ยนพฤติกรรมบอส). แถบ HP ของบอส (`UI.updateTarget`) ขีดแบ่ง 50/25% + สะเก็ดตกเมื่อข้าม
- ตาย: ของดรอปไม่ได้ลดความเร็ว แต่ใช้ orb (ข้อ 2) ปล่อยแบบเหลื่อม 60ms/ชิ้นเป็นน้ำพุ (ภาพล้วน; `addItem` ยังทันที) + zoom punch 1.04 + `UI.splash` ตัว `VICTORY`/ปราบสำเร็จ (ใช้ splash เดิม cls ใหม่)

**10. Crit ให้ "เจ็บถึงใจ" ยิ่งขึ้น** (S)
- ทำ: ใน `J.onMobHit` เมื่อ crit → `J.flash('crit', 0.18)` (overlay ขาวอมทอง 60ms — เพิ่ม kind ใน J.flash) + zoom punch 1.012 100ms + sfx crit layered สองชั้น: ไฟล์จริง `sfx_crit.ogg` + synth sub 'thump' 50Hz 90ms (ให้เบสหนักขึ้นบนมือถือลำโพงเล็ก). ดาเมจเลขของ crit streak ติดกัน (2+) ขยาย scale 1.85→2.1

**11. ตัวเลขดาเมจเทียบกับ "ปกติของฉัน"** (S)
- ทำ: `J.styleFloater` เก็บค่ามัธยฐานของ 20 ฮิตล่าสุด (`J.med`); ถ้า `dmg >= 2×med` → ฟอนต์ +20% + มี glow เหมือน skill, `>= 4×med` → +40% + สั่น 3px 0.2s. ทำให้ "ตีโดนกว่าปกติ" สะใจแม้ไม่ crit (เช่น ฟาดโดนจุดอ่อนธาตุ) • ไม่เปลี่ยนค่าดาเมจ

**12. Hotbar: สกิลพร้อมใช้ (Ready flash)** (S • CSS+ui.js)
- ทำ: ใน `ui.js` บล็อกที่ตั้ง `.cd` (บรรทัด ~294–306) จำสถานะ `left>0` → เมื่อเป็น 0 และสกิลมี `cd >= 5` → เติม class `.ready` 300ms (วงสว่างขยายออก scale 1→1.35 alpha 1→0) + `Sound 'click'` pitch สูง ๆ เบา ๆ; เฉพาะ `p.options.sound`. ผู้เล่นรู้ทันทีว่าไม้ตายกลับมา (anticipation ของการกดครั้งถัดไป)

**13. "ใกล้เลเวลแล้ว" (Almost-there tension)** (S • CSS ล้วน)
- ทำ: `ui.js` `refresh`: ถ้า `bk >= 0.9` → toggle class `.near` บน `#bi-bexp`, `#exp-line-fill` = แสงกวาด (gradient ขาว 20% เคลื่อนซ้าย→ขวา 1.2s วน); `bk >= 0.97` → เพิ่ม pulse ที่ `#bi-lvbadge`. ปิดเมื่อ `prefers-reduced-motion`. มีผลทางจิตวิทยา "อีกตัวเดียว" ให้เล่นต่อ — ไม่เปลี่ยนจำนวน EXP

**14. Stat / Skill learn / HUD tick-up** (S • โค้ดล้วน)
- `raiseStat`: เลข stat เด้ง (CSS `.bump` scale 1→1.35→1 180ms) + `Sound 'click'` pitch ไต่ตามจำนวนกดต่อเนื่องภายใน 1 วิ (+1 semitone/ครั้ง) + แถวค่ารองที่เปลี่ยน (ATK, MaxHP ใน renderStatus) กะพริบเขียว 400ms
- `learnSkill`: เล่น 'buff' แทน 'click' + ถ้าถูกใส่ช่อง hotbar อัตโนมัติ → ช่องนั้นเรืองสีสกิล 1.2s (บอกว่าไปอยู่ตรงไหน)
- Zeny/EXP% บน HUD: นับขึ้น (tween 250ms) แทนเปลี่ยนทันที ใน `ui.js` ที่เขียน `#bi-zeny` (ตอนนี้เทียบ innerHTML แล้วเขียนทันที) + flash เหลืองเมื่อเพิ่ม; ลดเมื่อ prefers-reduced-motion เป็นเปลี่ยนทันที

**15. เสียงเสริม: ขนาด/AoE stack/ducking** (S–M • synth ล้วน)
- 'kill' pitch ตามขนาด: `Sound.play('kill', {size})` → `f = 180 / sqrt(scale*size)` (มอนเล็กแหลมกรอบ, บอสทุ้มลึก) • รวม AoE: นับ kill ใน 120ms ถ้า >=3 เติมชั้น sub 'boom' + vol ×1.3 (เดิม rate-limit 45ms ทิ้งเสียงที่เหลือหมด)
- BGM ducking: `Sound.duck(db, ms)` ลด `Music` gain -6dB 300–500ms ตอน levelup/boss kill/ตีบวกเงียบ/gacha เฉลย แล้วค่อยเด้งกลับ — ทำให้เสียงฉลองเด่นโดยไม่ต้องดังขึ้น
- ควรมีไฟล์ `sfx_kill.ogg` / `sfx_levelup.ogg` ภายหลังถ้าอยากได้คุณภาพกว่า synth (ระบบรองรับอยู่แล้วผ่าน manifest — นี่คือข้อเดียวที่ต้องการ sound ใหม่ และเป็นทางเลือก)

### ระดับ C — เติมความมีชีวิต

**16. Risk → Relief: HP ต่ำ + ฮีลทัน** (S)
- ทำ: `J.onPlayerHurt` เมื่อ HP < 25% เริ่ม heartbeat (Sound osc 55Hz 80ms สองตุบ/วินาที, vol เบามาก, หยุดเมื่อ HP > 35% หรือตาย) + vignette แดงค้างจาง ๆ (J.flash 'hurt' alpha 0.18 วนช้า). `healPlayer` เมื่อ HP ก่อนฮีล < 25% และฮีลแล้ว > 40% → `J.flash('heal')` + chime ขึ้น + floater `SAVED!` สั้น ๆ (ครั้งละไม่เกิน 1/5 วิ)

**17. Gacha: เสียงติ๊กวงล้อ + ความเงียบก่อนเฉลย** (S–M)
- ทำ: `gacha.js` `spin()` ตอนนี้ไม่มีเสียงต่อเนื่อง → ตั้ง tick ด้วย setTimeout ช่วงห่างขยายตาม ease (40ms→260ms) เล่น 'click' pitch ลง; ถ้า `best>=3` เสียง rumble 55Hz tremolo ในช่วง 30% สุดท้าย แล้ว **ตัดเงียบ 150ms** + `Sound.duck` ก่อน `flash()`; เหลือโค้ดส่วน flip/tease เดิม. ปรับให้ข้ามได้เหมือนเดิม (`A.ff`)

**18. มอนเกิดมีตัวตน (Spawn-in puff)** (S)
- ทำ: wrapper `spawnMob` ใน juice.js: `pushFx` ฝุ่น `J.dust` + ให้มอน scale 0.6→1 + alpha 0→1 ใน 250ms (เก็บใน `st(m).bornAt`, ใช้ใน `J.drawMob`). ตอนนี้มอนโผล่พรวดในกรอบการมองเห็นดูแข็ง. ไม่เปลี่ยนตำแหน่ง/เวลาเกิด. ปิดเมื่อ `G.fastSim` (โหลดแมพครั้งแรกที่เกิดทีเดียว 100 ตัว → ข้ามถ้า `G.time < 1` ในแมพ)

**19. (ต้องให้เจ้าของตัดสินใจ) Pacing: ให้ "เป้าถัดไป" อยู่ใกล้ตลอด** (S • แตะ pacing/ฟาร์ม)
- ตอนนี้ `spawnMob` ใช้ `randomWalkable([player], 7)` + respawn `U.rand(4,10)` วิ. เสนอ **ไม่เปลี่ยนจำนวนหรือเวลาเกิด** (จะกระทบ EXP/ชั่วโมง = เศรษฐกิจ) แต่ให้ตำแหน่งเกิดเอนมาอยู่ระยะ 7–11 tile รอบผู้เล่น (ไม่ไกลกว่านี้) เพื่อลดเวลาเดินหาเป้า. วัดผลด้วยสคริปต์ใน `tests/` (kills/นาที ก่อน-หลัง ตอน Bot.on) ก่อนตัดสิน
- ตัวเลือกที่ไม่แตะ pacing เลย: ลูกศร/วงนำทางไปมอนที่ใกล้สุดเมื่อไม่มีเป้า >2 วิ (ดู Nav) — ลด "เวลาเปล่า" ให้ผู้เล่นมือถือ

## 4. Top 5 แนะนำทำก่อน (value ÷ effort)

1. **ข้อ 4 Rarity cue ladder (S)** — แก้ช่องว่างที่ชัดที่สุด: uncommon เงียบ, Epic/Legend ไม่ต่างกัน, Epic ใช้แตรบอส 1 วิ ลงทุนน้อยสุดแต่ทุกดรอปให้ฟินทันที
2. **ข้อ 3 Level-up fanfare + EXP bar wrap (S)** — เหตุการณ์ฟินที่สุดของ RPG ตอนนี้เบากว่ากิจกรรมอื่น (แค่ pillar+ตัวหนังสือ) ใช้ `J.flash/J.dilate/pushFx` ที่มีอยู่
3. **ข้อ 1 Chain counter + pitch ladder (M)** — ระบบเดียวที่ทำให้ "ฆ่ารัว" รู้สึกเป็นฝีมือ (เกมยังไม่มีเลย) ใช้ได้กับทุก Class และบอท
4. **ข้อ 2 Reward orbs (M)** — ทำให้ EXP/Zeny/ของ "จับต้องได้" แก้ปัญหา Auto Loot ที่ของหายเงียบ ๆ และเป็นฐานให้ boss loot fountain (ข้อ 9) ใช้ต่อ
5. **ข้อ 5 Refine ritual (M)** — จุดที่ผู้เล่นใช้เงินและลุ้นหนักที่สุด ตอนนี้รอ 400ms เฉย ๆ; เพิ่มจังหวะ+เงียบ+ระเบิดโดยไม่แตะ RATE/cost

ทำต่อได้เร็ว (S, ครึ่งวัน): ข้อ 6 (เศษพุ่งตามทิศ), 7 (multi-kill), 10 (crit flash), 12 (hotbar ready), 13 (ใกล้เลเวล)

**หมายเหตุสุดท้าย:** ทำทีละข้อ → เทียบกับตอนก่อนทำ (แบบ Nijman) • อย่าเปิดทุกอย่างพร้อมกัน — ต้องเก็บ "ของใหญ่" ไว้ให้ใหญ่จริง (หลักข้อ 4) • เพิ่มตัวเลือกใน Settings: "เอฟเฟกต์ฉลอง (เต็ม/ลด/ปิด)" ต่อจาก "จอสั่น" ที่มีอยู่แล้ว
