# Prompt ที่ยังรอภาพ (2026-10-03) — 3 แชต

| # | งาน | แนบ | ได้ |
|---|---|---|---|
| 1 | ท่าตาย ผู้หญิง 6 Class | `art/death_ref_12.png` + `art/anim_template_4x6.png` | 1 ภาพ |
| 2 | ท่าโดนตี ทุก Class (ชาย+หญิง) | `art/death_ref_12.png` + `art/anim_template_4x6.png` | 2 ภาพ |
| 3 | สกิล Wildhunter ชาย/หญิง | `template_tpl_walk.png`, `3_wildhunter_m.png`, `3_wildhunter_f.png`, `3_wildhunter_weapon.png` | 2 ภาพ |

ไม่ครบ พิมพ์ `now draw IMAGE 2` • ติดตั้ง (ผมทำ): 1–2 ตัดแถวตาม Class ติดตั้งแถวเดียว (เกมกลับด้านเอง) • 3 = `install_armed.py <png> wildhunter_<m|f> cast`

## 1. ท่าตาย ผู้หญิง (แชตเดิมของท่าตายผู้ชาย พิมพ์ `now draw IMAGE 2` ก็ได้)
```
Create 1 image. Attached: a CHARACTER REFERENCE sheet with 12 characters (6 classes, male row on top, female row below, numbered 1-6, each holding its own weapon) and a blank 4x6 sheet template.
PURPOSE: frame-by-frame DEATH animation sprite sheet for a 2D action RPG game; the game plays the 4 frames of each row once, left to right, and the last frame stays on screen.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Copy each character EXACTLY from the reference (same colors, armor, hair, cape and the SAME weapon, same size).
LAYOUT: draw into the attached 4x6 template — row 1 = character 1 … row 6 = character 6, using the 6 FEMALE characters (bottom row of the reference): 1 Einherjar, 2 Rune Caster, 3 Wildhunter, 4 Völva, 5 Trickster, 6 Berserker. 4 frames per row. ALL frames are seen from the SIDE, the character facing LEFT. Same character size in every frame; standing feet and the lying body rest on the red ground line; keep everything inside its own cell. Flat white background, do NOT draw the cell numbers, grid or lines. NO effects, NO blood, NO particles.
DEATH (one direction only): 1 hit hard — staggers backward, knees buckle; 2 falls to the knees, the weapon slipping from the hand; 3 collapses backward toward the ground; 4 lying flat and still on the back/side with the head to the RIGHT, the visor light dim, the weapon lying on the ground beside the body.
```

## 2. ท่าโดนตี ทุก Class — 1 prompt ได้ 2 ภาพ (ทิศเดียว หันหน้าเฉียงซ้าย)
```
Create 2 SEPARATE images (do not merge them). Attached: a CHARACTER REFERENCE sheet with 12 characters (6 classes, male row on top, female row below, numbered 1-6, each holding its own weapon) and a blank 4x6 sheet template.
PURPOSE: frame-by-frame HURT (got hit) animation sprite sheets for a 2D action RPG game; the game plays the 4 frames of each row once, quickly, left to right, then returns to the normal pose.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Copy each character EXACTLY from the reference (same colors, armor, hair, cape and the SAME weapon held the same way, same size).
LAYOUT: draw into the attached 4x6 template — row 1 = character 1 … row 6 = character 6 (same order as the reference). 4 frames per row. ALL frames seen in a 3/4 view facing FRONT-LEFT (like the reference). Same character size in every frame, feet on the red ground line, keep everything inside its own cell. Flat white background, do NOT draw the cell numbers, grid or lines. NO effects, NO blood, NO particles, NO motion lines.
HURT (plays once): 1 ready stance holding the weapon; 2 hit — body jolts backward, head snaps back, free arm flung out, knees bend; 3 staggers one small step back, still holding the weapon; 4 recovering back toward the ready stance. The weapon stays in the same hand in every frame.
IMAGE 1 — the 6 MALE characters (top row of the reference): 1 Einherjar, 2 Rune Caster, 3 Wildhunter, 4 Völva, 5 Trickster, 6 Berserker.
IMAGE 2 — the 6 FEMALE characters (bottom row of the reference): 1 Einherjar, 2 Rune Caster, 3 Wildhunter, 4 Völva, 5 Trickster, 6 Berserker.
```

## 3. สกิล Wildhunter (POWER SHOT) ชาย/หญิง — 5 ทิศ
```
Create 2 SEPARATE images (do not merge them). Attached: a blank sheet template, the male and female character designs and the character's signature WEAPON image.
PURPOSE: frame-by-frame SKILL animation sprite sheets for a 2D action RPG game. The game plays the 4 frames of each row once, left to right (1-2-3-4). Every frame must be a clearly different pose, flowing from the frame before, like a professional game animation.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair).
Each image is drawn into the attached template: 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK), the action aimed toward the facing direction of that row. Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines. NO magic effects, NO slash trails, NO particles, NO motion lines (the game adds effects).
WEAPON: the green-crystal recurve bow from the attached weapon image, held by the middle of the grip in the LEFT hand, string visible; quiver on the back. Copy the weapon EXACTLY from the attached weapon image (same shape, colors and glow) and keep it the SAME size and design in every frame of every image. The fist wraps the handle firmly; the weapon is correctly in front of or behind the body depending on the pose and direction (hidden behind the body/cape where it would be).
SKILL (plays once, frame by frame): POWER SHOT: 1 low crouch, bow forward; 2 deep full draw, body leaning back, glowing arrow on the string; 3 release with a strong step forward; 4 recover.
IMAGE 1 — male SKILL: Wildhunter Type-B: forest green hooded cloak, short gold hair plates, quiver on the back, green visor.
IMAGE 2 — female SKILL: Wildhunter Type-A: forest green hooded cloak, gold braid hair plates, quiver on the back, green visor.
```
