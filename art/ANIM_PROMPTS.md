# แอนิเมชันตัวละครแบบวาดทีละเฟรม (มาตรฐาน NMS-1)

> **รูปแบบหลักตอนนี้: ชีตหลายทิศแบบ RO** (ได้ผลดีกับท่าเดินของ Novice หญิง)
> ภาพ 1 แผ่น = 1 ท่า • แถวละ 1 ทิศ • คอลัมน์ = เฟรม • พื้นโปร่งใสหรือขาวเรียบ
> ทิศขั้นต่ำ 5 แถว: หน้า (S), หน้าเฉียงซ้าย (SW), ซ้าย (W), หลังเฉียงซ้าย (NW), หลัง (N)
> ทิศขวาทั้งหมดเกมกลับด้านเอง ติดตั้ง: `install <ภาพ> novice_f <ท่า> --grid <คอลัมน์>x<แถว> --dirs S,SW,W,NW,N`
> ติดตั้งแล้ว: `novice_f walk` (4 เฟรม × 7 ทิศ + NE กลับด้านจาก NW)

ตัวนำร่อง: **Novice หญิง** (ถ้าผ่าน ใช้รูปแบบเดียวกันกับทุกอาชีพ)

## ขั้นตอน
1. เปิดแชต ChatGPT ใหม่ แนบ 2 ภาพ: `art/anim_template_4x2.png` (เทมเพลต) และภาพ Novice ตัวปัจจุบัน
2. วาง **ข้อความตั้งต้น** แล้วส่ง
3. ได้ภาพแล้วพิมพ์ `next` เพื่อสั่งภาพถัดไป (ทั้งหมด 5 ภาพ)
4. เอาแต่ละภาพไปตรวจใน **Sprite Ruler** (ผลต้องเป็นสีเขียวหรือเหลือง ถ้าแดงให้สั่งภาพนั้นใหม่)
5. ส่งภาพที่ผ่านมาให้ติดตั้ง

## ข้อความตั้งต้น (วางครั้งเดียว)

```
You are my sprite artist for a 2D fantasy MMORPG in the style of Ragnarok Online character sprites: bright, cute, clean anime chibi that stays readable when shown only ~70 px tall.

WORLD: every character is an android. No humans and NO EYES: the face is a smooth white metal faceplate with ONE glowing cyan visor strip across it. Nothing else on the face.

CHARACTER: NOVICE, female android (use the attached character image for identity, but redraw it cleaner and cuter):
- long silver-white hair, a small cyan ear-fin on each side of the head
- white ceramic armor body with dark grey joints, modest and non-revealing
- short tan field jacket, brown belt with 2 pouches, short cyan energy dagger in her right hand
- chibi proportions: 3.5 heads tall. The head (with hair) is 28% of the total height.
- thick dark outline, 2-tone cel shading, big clear shapes, very few tiny details

RULES FOR EVERY IMAGE:
1. Size 1536x1024. Follow the attached template exactly: 4 columns x 2 rows = 8 cells, 384x512 px each.
2. One full-body pose per cell, centered on the cell's vertical center line.
3. Standing poses: soles of the feet exactly on the red line, top of the head exactly on the blue line. Nothing may cross into another cell.
4. 3/4 view facing LEFT (toward the left edge of the image) in every frame.
5. Same character, same size, same colors and same lighting in every frame. Only the pose changes.
6. Background pure flat white #FFFFFF. Do NOT draw the guide lines, grid, numbers, text, shadows or ground.

I will ask for one image at a time. After each image, wait until I type "next". Start now with IMAGE 1.

IMAGE 1 — MASTER DESIGN (4x2 grid, all 8 cells show the SAME calm standing pose, identical, like a stamp; this is the reference for all later images).
IMAGE 2 — WALK, 8 frames in reading order (left to right, top row then bottom row), a smooth looping walk cycle in place:
 1 contact: left leg forward (heel down), right leg back, arms swing opposite
 2 down: weight on the front leg, body slightly lower
 3 passing: right leg passes under the body, body highest
 4 up: right leg moving forward
 5 contact: right leg forward (heel down), left leg back (mirror of frame 1)
 6 down (mirror of 2)
 7 passing (mirror of 3)
 8 up (mirror of 4)
 Hair and jacket sway a little with each step. Feet always on the red line.
IMAGE 3 — top row IDLE 4 frames (breathing loop: shoulders rise very slightly, hair sways gently; almost identical frames). Bottom row CAST 4 frames (casting a spell: free hand raised forward, a cyan rune circle glows and grows in front of her hand, frames 5 to 8).
IMAGE 4 — cells 1-6 ATTACK with the dagger: 1 ready stance, 2 wind-up (dagger pulled back), 3 lunge forward, 4 full slash with a short cyan slash arc, 5 follow-through, 6 back to ready. Cells 7-8 HURT: 7 knocked back, leaning backward, visor flickers; 8 recovering.
IMAGE 5 — cells 1-2 SIT: sitting on the ground, legs folded, calm breathing (2 almost identical frames), body resting on the red line. Cells 3-6 DEAD: 3 knees buckle, 4 falling backward, 5 lying on the ground, 6 lying still with the visor dimmed. Cells 7-8 leave EMPTY white.
```

## ติดตั้ง (ฝั่งผม)

| ภาพ | คำสั่ง |
|---|---|
| 1 master | ใช้เป็นแบบอ้างอิงเท่านั้น (ไม่ติดตั้ง) |
| 2 walk | `python3 tools/sprite_std.py install 2.png novice_f walk` |
| 3 idle + cast | `install 3.png novice_f idle --order 1,2,3,4` แล้ว `install 3.png novice_f cast --order 5,6,7,8` |
| 4 attack + hurt | `install 4.png novice_f attack --order 1,2,3,4,5,6` แล้ว `install 4.png novice_f hurt --order 7,8` |
| 5 sit + dead | `install 5.png novice_f sit --order 1,2` แล้ว `install 5.png novice_f dead --order 3,4,5,6` |

ติดตั้ง walk ก่อนเสมอ ท่าที่ไม่ใช่ท่ายืน (attack/hurt/sit/dead) ใช้สเกลเดียวกับ walk ตัวละครจึงไม่ใหญ่หรือเล็กสลับกัน
