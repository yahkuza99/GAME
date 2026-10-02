# Grok วิดีโอรวมหลายท่าใน 1 คลิป (กำหนดวินาที) — เร็วกว่าแยกท่า

แต่ละ **ตัวละคร × ทิศ** ทำ **2 วิดีโอ ยาว 6 วินาที** (คลิปสั้นคุมเวลาได้แม่นกว่า):
- **วิดีโอ A** = ยืน 0–1.5s → เดินอยู่กับที่ 1.5–4.5s → ตี 5–6s
- **วิดีโอ B** = สกิล 0.4–2s → โดนตี 2–2.8s → ล้ม 3.2–6s

ต่อตัวละคร: 5 ทิศ × 2 = 10 วิดีโอ (12 ตัว = 120 วิดีโอ จากเดิม 420) • โดนตี/ล้ม ใช้แค่ทิศ W ก็พอ → วิดีโอ B ทำแค่ W ก็ได้ (ตัวละละ 6 วิดีโอ)
ถ้า Grok ทำได้ 10 วิ: วางทั้ง A แล้วต่อ B โดยบวก 6 วินาทีให้เวลาของ B

แนบภาพเริ่มต้นจาก `video_start.zip` (`<class>_<m|f>_<ทิศ>.png`) • ส่งวิดีโอกลับพร้อมพิมพ์ เช่น `einherjar_m A W`
Grok อาจไม่ตรงวินาทีเป๊ะ — ผมดูภาพรวมเฟรม (`tools/video_contact.py`) แล้วตัดช่วงของแต่ละท่าเอง (`video_to_sheet.py --t`)

แทน `{DIR}`: S → FRONT (facing the viewer) • SW → FRONT-LEFT (3/4 view facing down-left) • W → LEFT (side view facing screen-left) • NW → BACK-LEFT (3/4 back view facing up-left) • N → BACK (back to the viewer)

---

## Einherjar

**วิดีโอ A** (ยืน → เดิน → ตี)
```
2D game sprite animation reference video of the character in the attached image, for a frame-by-frame RPG game. Keep the EXACT same character design, colors, proportions and chibi anime art style. Pure flat WHITE background the whole time, no floor, no ground shadow. Camera LOCKED (no pan, no zoom, no cuts). Whole body always visible, same size, centered. The character keeps facing {DIR} the whole time and never turns around. Holds the red energy longsword in the right hand in every second. Clear, distinct poses, game-animation timing. No text, no effects, no particles.
TIMELINE (follow the seconds exactly, each action clearly separated):
0.0–1.5s IDLE: stands in a relaxed ready stance, gentle breathing.
1.5–4.5s WALK IN PLACE (treadmill, does not move across the frame): about 2 full steps, legs clearly alternating, knee lifts on the passing step, free arm swings.
4.5–5.0s stops in the ready stance.
5.0–6.0s ATTACK: raises the sword over the shoulder and slashes diagonally down, follow-through, then back to the ready stance.
```

**วิดีโอ B** (สกิล → โดนตี → ล้ม)
```
2D game sprite animation reference video of the character in the attached image, for a frame-by-frame RPG game. Keep the EXACT same character design, colors, proportions and chibi anime art style. Pure flat WHITE background the whole time, no floor, no ground shadow. Camera LOCKED (no pan, no zoom, no cuts). Whole body always visible, same size, centered. The character keeps facing {DIR} the whole time and never turns around. Holds the red energy longsword in the right hand in every second. Clear, distinct poses, game-animation timing. No text, no effects, no particles.
TIMELINE (follow the seconds exactly, each action clearly separated):
0.0–0.4s ready stance.
0.4–2.0s SKILL: crouches, raises the sword high with both hands and smashes it down hard, then back to the ready stance.
2.0–2.8s HURT: flinches backward from a hit, head jerks back, recovers.
2.8–3.2s ready stance.
3.2–6.0s KNOCKED DOWN: staggers, knees buckle, collapses and ends lying still on the ground until the end.
```

## Runecaster

**วิดีโอ A** (ยืน → เดิน → ตี)
```
2D game sprite animation reference video of the character in the attached image, for a frame-by-frame RPG game. Keep the EXACT same character design, colors, proportions and chibi anime art style. Pure flat WHITE background the whole time, no floor, no ground shadow. Camera LOCKED (no pan, no zoom, no cuts). Whole body always visible, same size, centered. The character keeps facing {DIR} the whole time and never turns around. Holds the rune staff with a glowing blue orb in the right hand in every second. Clear, distinct poses, game-animation timing. No text, no effects, no particles.
TIMELINE (follow the seconds exactly, each action clearly separated):
0.0–1.5s IDLE: stands in a relaxed ready stance, gentle breathing.
1.5–4.5s WALK IN PLACE (treadmill, does not move across the frame): about 2 full steps, legs clearly alternating, knee lifts on the passing step, free arm swings.
4.5–5.0s stops in the ready stance.
5.0–6.0s ATTACK: draws the staff back and thrusts the orb forward, then back to the ready stance.
```

**วิดีโอ B** (สกิล → โดนตี → ล้ม)
```
2D game sprite animation reference video of the character in the attached image, for a frame-by-frame RPG game. Keep the EXACT same character design, colors, proportions and chibi anime art style. Pure flat WHITE background the whole time, no floor, no ground shadow. Camera LOCKED (no pan, no zoom, no cuts). Whole body always visible, same size, centered. The character keeps facing {DIR} the whole time and never turns around. Holds the rune staff with a glowing blue orb in the right hand in every second. Clear, distinct poses, game-animation timing. No text, no effects, no particles.
TIMELINE (follow the seconds exactly, each action clearly separated):
0.0–0.4s ready stance.
0.4–2.0s SKILL: raises the staff high, free hand draws a rune, pushes both arms forward, then back to the ready stance.
2.0–2.8s HURT: flinches backward from a hit, head jerks back, recovers.
2.8–3.2s ready stance.
3.2–6.0s KNOCKED DOWN: staggers, knees buckle, collapses and ends lying still on the ground until the end.
```

## Wildhunter

**วิดีโอ A** (ยืน → เดิน → ตี)
```
2D game sprite animation reference video of the character in the attached image, for a frame-by-frame RPG game. Keep the EXACT same character design, colors, proportions and chibi anime art style. Pure flat WHITE background the whole time, no floor, no ground shadow. Camera LOCKED (no pan, no zoom, no cuts). Whole body always visible, same size, centered. The character keeps facing {DIR} the whole time and never turns around. Holds the green crystal bow in the left hand, quiver on the back in every second. Clear, distinct poses, game-animation timing. No text, no effects, no particles.
TIMELINE (follow the seconds exactly, each action clearly separated):
0.0–1.5s IDLE: stands in a relaxed ready stance, gentle breathing.
1.5–4.5s WALK IN PLACE (treadmill, does not move across the frame): about 2 full steps, legs clearly alternating, knee lifts on the passing step, free arm swings.
4.5–5.0s stops in the ready stance.
5.0–6.0s ATTACK: raises the bow, draws the string to the chin, releases the arrow, small recoil, then back to the ready stance.
```

**วิดีโอ B** (สกิล → โดนตี → ล้ม)
```
2D game sprite animation reference video of the character in the attached image, for a frame-by-frame RPG game. Keep the EXACT same character design, colors, proportions and chibi anime art style. Pure flat WHITE background the whole time, no floor, no ground shadow. Camera LOCKED (no pan, no zoom, no cuts). Whole body always visible, same size, centered. The character keeps facing {DIR} the whole time and never turns around. Holds the green crystal bow in the left hand, quiver on the back in every second. Clear, distinct poses, game-animation timing. No text, no effects, no particles.
TIMELINE (follow the seconds exactly, each action clearly separated):
0.0–0.4s ready stance.
0.4–2.0s SKILL: low crouch, deep full draw leaning back, releases with a strong step forward, then back to the ready stance.
2.0–2.8s HURT: flinches backward from a hit, head jerks back, recovers.
2.8–3.2s ready stance.
3.2–6.0s KNOCKED DOWN: staggers, knees buckle, collapses and ends lying still on the ground until the end.
```

## Völva

**วิดีโอ A** (ยืน → เดิน → ตี)
```
2D game sprite animation reference video of the character in the attached image, for a frame-by-frame RPG game. Keep the EXACT same character design, colors, proportions and chibi anime art style. Pure flat WHITE background the whole time, no floor, no ground shadow. Camera LOCKED (no pan, no zoom, no cuts). Whole body always visible, same size, centered. The character keeps facing {DIR} the whole time and never turns around. Holds the golden scepter with a blue gem in the right hand in every second. Clear, distinct poses, game-animation timing. No text, no effects, no particles.
TIMELINE (follow the seconds exactly, each action clearly separated):
0.0–1.5s IDLE: stands in a relaxed ready stance, gentle breathing.
1.5–4.5s WALK IN PLACE (treadmill, does not move across the frame): about 2 full steps, legs clearly alternating, knee lifts on the passing step, free arm swings.
4.5–5.0s stops in the ready stance.
5.0–6.0s ATTACK: lifts the scepter beside the head and smashes it down in front, then back to the ready stance.
```

**วิดีโอ B** (สกิล → โดนตี → ล้ม)
```
2D game sprite animation reference video of the character in the attached image, for a frame-by-frame RPG game. Keep the EXACT same character design, colors, proportions and chibi anime art style. Pure flat WHITE background the whole time, no floor, no ground shadow. Camera LOCKED (no pan, no zoom, no cuts). Whole body always visible, same size, centered. The character keeps facing {DIR} the whole time and never turns around. Holds the golden scepter with a blue gem in the right hand in every second. Clear, distinct poses, game-animation timing. No text, no effects, no particles.
TIMELINE (follow the seconds exactly, each action clearly separated):
0.0–0.4s ready stance.
0.4–2.0s SKILL: raises the scepter high above the head, spreads both arms open, then back to the ready stance.
2.0–2.8s HURT: flinches backward from a hit, head jerks back, recovers.
2.8–3.2s ready stance.
3.2–6.0s KNOCKED DOWN: staggers, knees buckle, collapses and ends lying still on the ground until the end.
```

## Trickster

**วิดีโอ A** (ยืน → เดิน → ตี)
```
2D game sprite animation reference video of the character in the attached image, for a frame-by-frame RPG game. Keep the EXACT same character design, colors, proportions and chibi anime art style. Pure flat WHITE background the whole time, no floor, no ground shadow. Camera LOCKED (no pan, no zoom, no cuts). Whole body always visible, same size, centered. The character keeps facing {DIR} the whole time and never turns around. Holds the violet crystal dagger in the right hand in every second. Clear, distinct poses, game-animation timing. No text, no effects, no particles.
TIMELINE (follow the seconds exactly, each action clearly separated):
0.0–1.5s IDLE: stands in a relaxed ready stance, gentle breathing.
1.5–4.5s WALK IN PLACE (treadmill, does not move across the frame): about 2 full steps, legs clearly alternating, knee lifts on the passing step, free arm swings.
4.5–5.0s stops in the ready stance.
5.0–6.0s ATTACK: crouches and lunges with a fast dagger stab forward, hops back, then back to the ready stance.
```

**วิดีโอ B** (สกิล → โดนตี → ล้ม)
```
2D game sprite animation reference video of the character in the attached image, for a frame-by-frame RPG game. Keep the EXACT same character design, colors, proportions and chibi anime art style. Pure flat WHITE background the whole time, no floor, no ground shadow. Camera LOCKED (no pan, no zoom, no cuts). Whole body always visible, same size, centered. The character keeps facing {DIR} the whole time and never turns around. Holds the violet crystal dagger in the right hand in every second. Clear, distinct poses, game-animation timing. No text, no effects, no particles.
TIMELINE (follow the seconds exactly, each action clearly separated):
0.0–0.4s ready stance.
0.4–2.0s SKILL: spins once with the dagger swung wide and finishes with a forward slash, then back to the ready stance.
2.0–2.8s HURT: flinches backward from a hit, head jerks back, recovers.
2.8–3.2s ready stance.
3.2–6.0s KNOCKED DOWN: staggers, knees buckle, collapses and ends lying still on the ground until the end.
```

## Berserker

**วิดีโอ A** (ยืน → เดิน → ตี)
```
2D game sprite animation reference video of the character in the attached image, for a frame-by-frame RPG game. Keep the EXACT same character design, colors, proportions and chibi anime art style. Pure flat WHITE background the whole time, no floor, no ground shadow. Camera LOCKED (no pan, no zoom, no cuts). Whole body always visible, same size, centered. The character keeps facing {DIR} the whole time and never turns around. Holds the huge orange battle axe held with both hands in every second. Clear, distinct poses, game-animation timing. No text, no effects, no particles.
TIMELINE (follow the seconds exactly, each action clearly separated):
0.0–1.5s IDLE: stands in a relaxed ready stance, gentle breathing.
1.5–4.5s WALK IN PLACE (treadmill, does not move across the frame): about 2 full steps, legs clearly alternating, knee lifts on the passing step, free arm swings.
4.5–5.0s stops in the ready stance.
5.0–6.0s ATTACK: raises the axe over the head and chops it down hard in front, then back to the ready stance.
```

**วิดีโอ B** (สกิล → โดนตี → ล้ม)
```
2D game sprite animation reference video of the character in the attached image, for a frame-by-frame RPG game. Keep the EXACT same character design, colors, proportions and chibi anime art style. Pure flat WHITE background the whole time, no floor, no ground shadow. Camera LOCKED (no pan, no zoom, no cuts). Whole body always visible, same size, centered. The character keeps facing {DIR} the whole time and never turns around. Holds the huge orange battle axe held with both hands in every second. Clear, distinct poses, game-animation timing. No text, no effects, no particles.
TIMELINE (follow the seconds exactly, each action clearly separated):
0.0–0.4s ready stance.
0.4–2.0s SKILL: wide stance, swings the axe in a big horizontal circle, body twisting, then back to the ready stance.
2.0–2.8s HURT: flinches backward from a hit, head jerks back, recovers.
2.8–3.2s ready stance.
3.2–6.0s KNOCKED DOWN: staggers, knees buckle, collapses and ends lying still on the ground until the end.
```


---
## สำเร็จรูป: ทดลอง Einherjar ชาย ทิศซ้าย วิดีโอ A (แนบ `einherjar_m_W.png`)
```
2D game sprite animation reference video of the character in the attached image, for a frame-by-frame RPG game. Keep the EXACT same character design, colors, proportions and chibi anime art style. Pure flat WHITE background the whole time, no floor, no ground shadow. Camera LOCKED (no pan, no zoom, no cuts). Whole body always visible, same size, centered. The character keeps facing LEFT (side view facing screen-left) the whole time and never turns around. Holds the red energy longsword in the right hand in every second. Clear, distinct poses, game-animation timing. No text, no effects, no particles.
TIMELINE (follow the seconds exactly, each action clearly separated):
0.0–1.5s IDLE: stands in a relaxed ready stance, gentle breathing.
1.5–4.5s WALK IN PLACE (treadmill, does not move across the frame): about 2 full steps, legs clearly alternating, knee lifts on the passing step, free arm swings.
4.5–5.0s stops in the ready stance.
5.0–6.0s ATTACK: raises the sword over the shoulder and slashes diagonally down, follow-through, then back to the ready stance.
```
