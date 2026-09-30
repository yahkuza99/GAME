# รายการภาพเคลื่อนไหวที่ต้องสั่ง (มาตรฐาน NMS-1)

ส่งภาพมาได้เลย ไม่ต้องวัดเอง ผมติดตั้งให้ (วัดขนาด ตัดเฟรม ปรับขนาด กลับด้านทิศขวา)

## สถานะ

**หลักใหม่: ท่าสกิลมีแค่ 1 ท่าต่ออาชีพ** — ทุกสกิลใช้ท่าเดียวกัน ความต่างของแต่ละสกิลไปอยู่ที่ "เอฟเฟกต์" (เกมวาดเอง) ตัวละครจึงทำง่าย อาชีพละ 6 ภาพ:
เดิน • ยืนขาคู่ • โจมตี • สกิล (1 ท่า) • นั่ง+โดนตี • ล้ม

| ตัวละคร | เดิน | ยืน | โจมตี | สกิล | นั่ง+โดนตี | ล้ม |
|---|---|---|---|---|---|---|
| Novice หญิง (Type-A) | ✅ 8 ทิศ | ✅ 8 ทิศ ขาคู่ | ✅ 8 ทิศ | ✅ 8 ทิศ | ✅ 8 ทิศ | ⏳ ดีไซน์เก่า |
| Novice ชาย (Type-B) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| มอนแผนที่แรก (5 ตัว) | ❌ ภาพนิ่ง | | ❌ | | | |
| NPC Kaia (คลังของ) | ❌ วาดด้วยโค้ด (ภาพนิ่งพอ) | | | | | |

## วิธีสั่ง (ทุกภาพใช้หลักเดียวกัน)

- แนบ **ภาพอ้างอิงตัวละคร** (ภาพเดินล่าสุด) + **เทมเพลตของท่านั้น** (`art/tpl_*.png`)
- 1 ภาพ = 1 ท่า • แถว = ทิศ (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK) • คอลัมน์ = เฟรม
- ข้อความคงที่ท้ายทุก prompt:

```
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different.
Same character height in every cell. Leave clear space between characters.
Output: flat white background, do NOT draw the labels, grid or guide lines.
```

---

## A. Novice หญิง — ที่เหลือ (แนบภาพเดินล่าสุดเป็นแบบ)

**A0 ยืนขาคู่ (ทำก่อน)** — แนบ `tpl_idle.png`
```
Draw this exact character (attached walk sheet) into the attached template: IDLE standing pose, 4 frames per direction.
She stands still with BOTH FEET TOGETHER side by side, both soles flat on the red line, legs straight, knees together, weight even. Dagger held relaxed at her side.
Frames: 1 neutral, 2 breathe in (shoulders a tiny bit higher, hair sways slightly), 3 neutral, 4 breathe out (hair settles). The legs and feet must NOT move between frames.
Each row is a direction as labelled.
```

**A1 ท่าสกิล** — ✅ ติดตั้งแล้ว (ใช้กับทุกสกิลของ Novice)

**A2 นั่ง + โดนตี** — แนบ `tpl_sit_hurt.png`
```
Draw this exact character (attached walk sheet) into the attached template.
Columns 1-2 SIT: sitting on the ground with legs folded, resting, calm breathing (2 almost identical frames), bottom on the red line.
Columns 3-4 HURT: 3 knocked back, body leaning away, visor flickers bright; 4 recovering, stepping back into stance.
Each row is a direction as labelled.
```

**A3 ล้ม** — แนบ `tpl_dead.png`
```
Draw this exact character (attached walk sheet) into the attached template: DEAD, 4 frames per direction.
1 knees buckle, 2 falling to the ground, 3 lying FLAT on the ground (whole body on the red line, seen from the game's high 3/4 camera), 4 lying still with the visor dark (turned off).
Each row is a direction as labelled.
```

## B. Novice ชาย (Type-B แกร่ง) — แชตใหม่ แนบภาพ `hero_novice_m` + เทมเพลต

**B1 เดิน (ทำก่อน = ภาพต้นแบบของตัวนี้)** — แนบ `tpl_walk.png`
```
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall.
Character: male android NOVICE (use the attached image for design): spiky silver hair plates, smooth white faceplate with ONE glowing cyan visor strip, NO eyes, olive field jacket with a red cross patch, brown belt with pouches, white armored legs, short cyan energy dagger in the right hand.
Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading.
Draw a WALK cycle into the attached template, 4 frames per direction, legs clearly alternating:
1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs.
Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK).
```
จากนั้นใช้ภาพเดินที่ได้เป็นแบบ สั่งต่อด้วย prompt เดียวกับ A0, A2, A3 + ท่าสกิล (`tpl_cast.png`: ยกมือ → ชาร์จ → ปล่อย → เอฟเฟกต์เต็ม) และท่าโจมตี (`tpl_attack.png`):
```
Draw this exact character (attached walk sheet) into the attached template: ATTACK with the dagger, 6 frames per direction.
1 ready, 2 wind-up (dagger arm pulled far back), 3 lunge forward, 4 full SLASH with a short cyan slash arc, 5 follow-through, 6 back to ready.
```

## C. มอนสเตอร์แผนที่แรก — ตัวละ 1 ภาพ แนบภาพมอนเดิม (`mobsprite_*.webp`) + `anim_template_4x2.png`

มอนใช้ 1 ทิศ (หันซ้าย เกมกลับด้านให้) • แถวบน = เดิน 4 เฟรม • แถวล่าง = โจมตี 4 เฟรม

```
Use the attached monster as the exact design (same colors, same size, same art style: cute chibi robot, 2000s Korean MMORPG).
Draw it into the attached 4x2 template, facing LEFT (3/4 view), bottom on the red line in every cell (even for jumps: the game adds the jump height itself).
Top row = MOVE loop, 4 frames: {MOVE}
Bottom row = ATTACK, 4 frames: {ATTACK}
Every frame clearly different. Flat white background, do NOT draw the labels, grid or guide lines.
```

| มอน | ไฟล์อ้างอิง | {MOVE} | {ATTACK} |
|---|---|---|---|
| Gel Unit | `mobsprite_pudding` | squash down, stretch up jumping, in the air, landing squash | squash low, lunge forward stretched, splat hit, bounce back |
| Crawler Unit | `mobsprite_leafworm` | body segments wave forward like a caterpillar, 4 steps | rear back, head lunge forward biting, hit, pull back |
| Bunny Unit | `mobsprite_moonbun` | crouch, hop up, in the air ears back, land | crouch, jump kick forward, hit, land |
| Ember Unit | `mobsprite_ember_pudding` | same as Gel Unit, flame on the antenna flickers | same as Gel Unit, flame bursts bigger on hit |
| Buzz Unit | `mobsprite_buzzfly` | hovering, wings up / down blur, body bobbing | pull back, dive forward stinger first, sting, fly back |

## D. NPC ใหม่: Storage Unit Kaia (คลังเก็บของ) — ภาพนิ่ง 1 ภาพ

ตอนนี้ Kaia ยังเป็นหุ่นวาดด้วยโค้ด (ดูไม่เข้ากับ NPC ตัวอื่น) สั่งภาพเดียวพอ แนบภาพ NPC เดิม 1 ตัวเป็นแบบสไตล์:
```
In-game character sprite for a cute classic 2000s Korean MMORPG (chibi, about 2.5 heads tall), same art style as the attached NPC.
Storage Unit Kaia: friendly feminine android warehouse clerk. Smooth white faceplate with ONE glowing teal visor strip, NO eyes, NO mouth.
Dark navy hair plates in a low ponytail, small red ribbon, navy-and-cream clerk uniform with a short cape, a floating holographic crate icon beside her hand, a little cargo drone on her shoulder.
Single full-body figure, 3/4 view FACING LEFT, standing, centered. Fully transparent background, cel-shaded, crisp dark outline, readable at 64 px. No text, no shadow.
```
ติดตั้ง: `python3 tools/slice_sheet.py --add kaia.png npcsprite_storage`

## ติดตั้ง (ฝั่งผม)

```
python3 tools/sprite_std.py install idle.png      novice_f idle   --grid 4x5 --dirs S,SW,W,NW,N
python3 tools/sprite_std.py install cast.png      novice_f cast   --grid 4x5 --dirs S,SW,W,NW,N --ref-frames 1 --nofit
python3 tools/sprite_std.py install sithurt.png   novice_f sit    --grid 4x5 --dirs S,SW,W,NW,N --take-cols 1,2
python3 tools/sprite_std.py install sithurt.png   novice_f hurt   --grid 4x5 --dirs S,SW,W,NW,N --take-cols 3,4
python3 tools/sprite_std.py install dead.png      novice_f dead   --grid 4x5 --dirs S,SW,W,NW,N
python3 tools/sprite_std.py install walk.png      novice_m walk   --grid 4x5 --dirs S,SW,W,NW,N
python3 tools/sprite_std.py install walk.png      novice_m idle   --grid 4x5 --dirs S,SW,W,NW,N --still
python3 tools/sprite_std.py install attack.png    novice_m attack --grid 6x5 --dirs S,SW,W,NW,N --ref-frames 1,6
python3 tools/sprite_std.py install gel.png       mob_pudding walk   --grid 4x2 --order 1,2,3,4
python3 tools/sprite_std.py install gel.png       mob_pudding attack --grid 4x2 --order 5,6,7,8
```
