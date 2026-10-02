# Grok Imagine — วิดีโอท่าทางตัวละคร (image-to-video)

แต่ละวิดีโอ = **ตัวละคร 1 ตัว × 1 ท่า × 1 ทิศ** • แนบ **ภาพเริ่มต้น** จาก `video_start.zip` (ชื่อไฟล์ `<class>_<m|f>_<ทิศ>.png`) แล้ววาง prompt
ทิศขวาเกมกลับด้านให้เอง → ต่อท่าทำ 5 ทิศ: S (หน้า), SW (หน้าซ้าย), W (ซ้าย), NW (หลังซ้าย), N (หลัง)

**Wildhunter:** ยังไม่มีภาพเริ่มต้น (รอภาพเดินชุดใหม่) — ทำตัวอื่นก่อน

**ส่งกลับ:** ไฟล์วิดีโอ (mp4) พิมพ์บอกในข้อความว่า `einherjar_m walk W` เป็นต้น (ส่งหลายไฟล์พร้อมกันได้ เรียงตามลำดับที่พิมพ์)
ผมแปลงด้วย `tools/video_to_sheet.py` → เลือกเฟรม ล็อกตำแหน่งเท้า ลบพื้นขาว ติดตั้งเข้าเกม

**ลำดับที่แนะนำ** (วิดีโอเยอะมาก ทำทีละขั้น):
1. **ทดลอง 1 วิดีโอก่อน:** `einherjar_m walk W` — ดูว่า Grok คุมพื้นขาว/กล้องนิ่ง/เดินอยู่กับที่ได้ไหม
2. ถ้าผ่าน: **เดิน 5 ทิศ** ของแต่ละตัว (เดินเห็นบ่อยสุด ได้ 8 เฟรมลื่นกว่าภาพเดิม 4 เฟรม)
3. **ยืน (idle) 5 ทิศ**
4. **โดนตี / ล้ม / นั่ง** ทำแค่ทิศ W ก็พอ (เกมกลับด้านซ้าย-ขวาให้ ทิศอื่นใช้ภาพซ้าย/ขวา)
5. ตี/สกิล มีภาพแล้ว — ทำวิดีโอเฉพาะตัวที่อยากให้ลื่นขึ้น

**ถ้าวิดีโอเพี้ยน** พิมพ์ต่อท้าย prompt: `Static camera. White background only. The character stays in the center and does not move across the frame.`

---

## WALK (`walk`)

แทน `{DIR}` ด้วยทิศของภาพเริ่มต้น • แทน `{CLASS}` ด้วยบล็อก Class ด้านล่าง

```
2D game sprite animation of the character in the attached image. Keep the EXACT same character design, colors, proportions and art style (cute chibi anime game sprite, thick dark outline, cel shading). Pure flat WHITE background for the whole video, no floor, no shadow on the ground, no scenery. Camera completely LOCKED: no pan, no zoom, no rotation, no cuts. Whole body always fully visible in frame, same size for the whole video. The character keeps facing {DIR} the whole time. No text, no particles, no magic effects, no motion blur trails.
The character walks IN PLACE (like on a treadmill, does not move across the frame): natural steady walk cycle, legs clearly alternating with wide steps, knee lifts on the passing step, free arm swinging opposite to the legs, the {WEAPON} stays in the same hand. Smooth looping walk, 2-3 full steps.
```

## IDLE (`idle`)

แทน `{DIR}` ด้วยทิศของภาพเริ่มต้น • แทน `{CLASS}` ด้วยบล็อก Class ด้านล่าง

```
2D game sprite animation of the character in the attached image. Keep the EXACT same character design, colors, proportions and art style (cute chibi anime game sprite, thick dark outline, cel shading). Pure flat WHITE background for the whole video, no floor, no shadow on the ground, no scenery. Camera completely LOCKED: no pan, no zoom, no rotation, no cuts. Whole body always fully visible in frame, same size for the whole video. The character keeps facing {DIR} the whole time. No text, no particles, no magic effects, no motion blur trails.
The character stands still in a relaxed ready stance holding the {WEAPON}: gentle breathing, slight body sway, hair and cloth moving softly. Subtle looping motion, feet do not move.
```

## ATTACK (`attack`)

แทน `{DIR}` ด้วยทิศของภาพเริ่มต้น • แทน `{CLASS}` ด้วยบล็อก Class ด้านล่าง

```
2D game sprite animation of the character in the attached image. Keep the EXACT same character design, colors, proportions and art style (cute chibi anime game sprite, thick dark outline, cel shading). Pure flat WHITE background for the whole video, no floor, no shadow on the ground, no scenery. Camera completely LOCKED: no pan, no zoom, no rotation, no cuts. Whole body always fully visible in frame, same size for the whole video. The character keeps facing {DIR} the whole time. No text, no particles, no magic effects, no motion blur trails.
The character performs ONE {ATTACK}. Clear anticipation, fast strike, follow-through and return to the starting stance. Holds the {WEAPON}.
```

## SKILL (`cast`)

แทน `{DIR}` ด้วยทิศของภาพเริ่มต้น • แทน `{CLASS}` ด้วยบล็อก Class ด้านล่าง

```
2D game sprite animation of the character in the attached image. Keep the EXACT same character design, colors, proportions and art style (cute chibi anime game sprite, thick dark outline, cel shading). Pure flat WHITE background for the whole video, no floor, no shadow on the ground, no scenery. Camera completely LOCKED: no pan, no zoom, no rotation, no cuts. Whole body always fully visible in frame, same size for the whole video. The character keeps facing {DIR} the whole time. No text, no particles, no magic effects, no motion blur trails.
The character performs ONE {SKILL}. Clear and readable poses. Holds the {WEAPON}.
```

## HURT (`hurt`)

แทน `{DIR}` ด้วยทิศของภาพเริ่มต้น • แทน `{CLASS}` ด้วยบล็อก Class ด้านล่าง

```
2D game sprite animation of the character in the attached image. Keep the EXACT same character design, colors, proportions and art style (cute chibi anime game sprite, thick dark outline, cel shading). Pure flat WHITE background for the whole video, no floor, no shadow on the ground, no scenery. Camera completely LOCKED: no pan, no zoom, no rotation, no cuts. Whole body always fully visible in frame, same size for the whole video. The character keeps facing {DIR} the whole time. No text, no particles, no magic effects, no motion blur trails.
The character gets hit: flinches backward once, body recoils and head jerks back, then recovers to the ready stance. Keeps holding the {WEAPON}.
```

## KNOCKED DOWN (`dead`)

แทน `{DIR}` ด้วยทิศของภาพเริ่มต้น • แทน `{CLASS}` ด้วยบล็อก Class ด้านล่าง

```
2D game sprite animation of the character in the attached image. Keep the EXACT same character design, colors, proportions and art style (cute chibi anime game sprite, thick dark outline, cel shading). Pure flat WHITE background for the whole video, no floor, no shadow on the ground, no scenery. Camera completely LOCKED: no pan, no zoom, no rotation, no cuts. Whole body always fully visible in frame, same size for the whole video. The character keeps facing {DIR} the whole time. No text, no particles, no magic effects, no motion blur trails.
The character is defeated: staggers, knees buckle, collapses to the ground and ends lying still on the floor (lying on the side or back), the visor light fades. Keeps holding or drops the {WEAPON} beside the body.
```

## SIT (`sit`)

แทน `{DIR}` ด้วยทิศของภาพเริ่มต้น • แทน `{CLASS}` ด้วยบล็อก Class ด้านล่าง

```
2D game sprite animation of the character in the attached image. Keep the EXACT same character design, colors, proportions and art style (cute chibi anime game sprite, thick dark outline, cel shading). Pure flat WHITE background for the whole video, no floor, no shadow on the ground, no scenery. Camera completely LOCKED: no pan, no zoom, no rotation, no cuts. Whole body always fully visible in frame, same size for the whole video. The character keeps facing {DIR} the whole time. No text, no particles, no magic effects, no motion blur trails.
The character sits down on the ground cross-legged and then stays sitting, resting calmly with gentle breathing, the {WEAPON} laid beside them.
```

## ค่าแทนที่

**{DIR}** — ใช้ตามชื่อไฟล์ภาพเริ่มต้น:

- `_S.png` → `FRONT (facing the viewer)`
- `_SW.png` → `FRONT-LEFT (3/4 view, facing down-left)`
- `_W.png` → `LEFT (side view, facing screen-left)`
- `_NW.png` → `BACK-LEFT (3/4 back view, facing up-left)`
- `_N.png` → `BACK (back to the viewer)`

**{WEAPON} / {ATTACK} / {SKILL}** ต่อ Class:

### Einherjar
- WEAPON: `red energy longsword in the right hand`
- ATTACK: `one-handed sword slash: raises the sword over the shoulder, slashes diagonally forward and down with a step in, follow-through, returns to guard stance`
- SKILL: `power strike: crouches and gathers strength, raises the sword high with both hands, smashes it down hard in front with a wide stance, recovers`

### Runecaster
- WEAPON: `rune staff with a glowing blue orb in the right hand`
- ATTACK: `staff strike: draws the staff back, thrusts the orb quickly forward, arm fully extended, recovers`
- SKILL: `spell casting: holds the staff upright, free hand draws a glowing rune in the air, raises the staff high, pushes both arms forward releasing the spell, recovers`

### Wildhunter
- WEAPON: `green crystal recurve bow held by the middle in the left hand, quiver on the back`
- ATTACK: `bow shot: raises the bow toward the facing direction, nocks an arrow, draws the string to the chin, holds, releases (the arrow flies off screen), small recoil, lowers the bow`
- SKILL: `power shot: drops into a low crouch, deep full draw leaning back, releases with a strong step forward, recovers`

### Völva
- WEAPON: `golden scepter with a large blue gem in the right hand`
- ATTACK: `scepter smash: lifts the scepter beside the head, smashes it down to the ground in front, follow-through, recovers`
- SKILL: `holy prayer: holds the scepter upright in front of the chest, raises it high above the head, spreads both arms open with chest lifted, recovers`

### Trickster
- WEAPON: `violet crystal dagger in the right hand`
- ATTACK: `quick dagger stab: crouches low with the dagger at the hip, lunges and stabs fast toward the facing direction, arm fully extended, hops back to stance`
- SKILL: `spinning slash: crouches and twists, spins once with the dagger swung wide, finishes slashing forward, recovers`

### Berserker
- WEAPON: `huge orange energy battle axe held with both hands`
- ATTACK: `heavy two-handed chop: raises the axe high over the head, chops it down hard in front, axe head near the ground, heaves it back up to the shoulder`
- SKILL: `rage whirlwind: wide stance with the axe held back, swings it in a big horizontal circle while the body twists, recovers`


---

## prompt สำเร็จรูป (คัดลอกได้เลย) — ทดลอง: Einherjar ชาย เดิน ทิศซ้าย

แนบ `einherjar_m_W.png`

```
2D game sprite animation of the character in the attached image. Keep the EXACT same character design, colors, proportions and art style (cute chibi anime game sprite, thick dark outline, cel shading). Pure flat WHITE background for the whole video, no floor, no shadow on the ground, no scenery. Camera completely LOCKED: no pan, no zoom, no rotation, no cuts. Whole body always fully visible in frame, same size for the whole video. The character keeps facing LEFT (side view, facing screen-left) the whole time. No text, no particles, no magic effects, no motion blur trails.
The character walks IN PLACE (like on a treadmill, does not move across the frame): natural steady walk cycle, legs clearly alternating with wide steps, knee lifts on the passing step, free arm swinging opposite to the legs, the red energy longsword in the right hand stays in the same hand. Smooth looping walk, 2-3 full steps.
```


## ผมติดตั้งยังไง (บันทึก)

`python3 tools/video_to_sheet.py <class>_<m|f> <ท่า> S=a.mp4 SW=b.mp4 W=c.mp4 NW=d.mp4 N=e.mp4 [--loop] [--range a,b] [--preview x.gif]`
เดิน/ยืน/นั่ง = loop (หา 1 รอบอัตโนมัติ, 8 เฟรม) • ตี/สกิล/โดนตี/ล้ม = เล่นครั้งเดียว (6 เฟรม) • นั่ง ใช้ครึ่งหลังของวิดีโอ (`--range 0.5,1`)
