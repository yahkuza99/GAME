# ท่าโดนตี + ท่าตาย Class 1 — 6 แชต แชตละ 3 ภาพ (ตายแบบเดียว)

ตอนนี้ตัวละคร Class ยังไม่มีภาพท่าโดนตี/ล้ม → **ตายแล้วยืนนิ่ง ไม่ล้ม** • ชุดนี้แก้ตรงนั้น
**ตายแบบเดียว (เจ้าของ 2026-10-02):** ท่าตายวาดทิศเดียว (มองด้านข้าง หันซ้าย) แถวเดียว 4 เฟรม — เกมกลับด้านเองเมื่อหันขวา
ชาย+หญิงอยู่ภาพเดียวกัน (แถวบนชาย แถวล่างหญิง) ใช้แม่แบบ `anim_template_4x2.png`

แต่ละแชต แนบ: `template_tpl_walk.png`, `anim_template_4x2.png`, `<n>_<class>_m.png`, `<n>_<class>_f.png`, `<n>_<class>_weapon.png`
ได้ 3 ภาพ: 1 ชาย-โดนตี (5 ทิศ), 2 หญิง-โดนตี (5 ทิศ), 3 ชาย+หญิง-ตาย (ทิศเดียว) • ไม่ครบ พิมพ์ `now draw IMAGE 2` (3)

ติดตั้ง (ผมทำ): โดนตี `install_armed.py <png> <class>_<m|f> hurt` • ตาย ตัดแถวบน/ล่าง แล้วติดตั้งเป็นแถวเดียว (dirs 1) ให้เอง

## 1. Einherjar

แนบ: `template_tpl_walk.png`, `anim_template_4x2.png`, `1_einherjar_m.png`, `1_einherjar_f.png`, `1_einherjar_weapon.png`

```
Create 3 SEPARATE images (do not merge them). Attached: two blank sheet templates (a 4x5 one and a 4x2 one), two character designs (male and female) and the character's signature WEAPON.
PURPOSE: frame-by-frame animation sprite sheets for a 2D action RPG game; the game plays the 4 frames of each row once, left to right.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair).
WEAPON: the red energy longsword with gold crossguard from the attached weapon image, held in the RIGHT hand; NO shield. Copy the weapon EXACTLY from the attached weapon image (same shape, colors and glow) and keep it the SAME size and design in every frame of every image. The fist wraps the handle firmly; the weapon is correctly in front of or behind the body depending on the pose and direction (hidden behind the body/cape where it would be).
IMAGES 1-2 use the 4x5 template: 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK). IMAGE 3 uses the 4x2 template: 2 rows of 4 frames, ALL frames seen from the SIDE, facing LEFT; top row = male, bottom row = female.
Same character size in every frame, feet on the guide line (lying poses rest on the guide line). Flat white background, do NOT draw the labels, grid or guide lines. NO effects, NO blood, NO particles.
HURT (plays once): 1 ready stance; 2 hit — body jolts backward, head snaps back, arms flung slightly, knees bend; 3 staggers one small step back; 4 recovering to the ready stance. The weapon stays in the same hand.
DEATH (plays once, ends lying, ONE direction only — side view facing LEFT): 1 staggers backward, knees buckle; 2 falls to the knees, weapon slipping from the hand; 3 collapses backward toward the ground; 4 lying flat and still on the back/side with the head to the RIGHT, the visor light dim, the weapon lying beside the body. Keep the lying body inside its cell.
IMAGE 1 — male HURT: Einherjar Type-B: bulkier steel plate armor with red trim, crimson cape, horned helmet, red visor.
IMAGE 2 — female HURT: Einherjar Type-A: heavy steel plate armor with red trim, crimson cape, horned helmet, red visor.
IMAGE 3 — DEATH, top row male: Einherjar Type-B: bulkier steel plate armor with red trim, crimson cape, horned helmet, red visor. Bottom row female: Einherjar Type-A: heavy steel plate armor with red trim, crimson cape, horned helmet, red visor.
```

## 2. Runecaster

แนบ: `template_tpl_walk.png`, `anim_template_4x2.png`, `2_runecaster_m.png`, `2_runecaster_f.png`, `2_runecaster_weapon.png`

```
Create 3 SEPARATE images (do not merge them). Attached: two blank sheet templates (a 4x5 one and a 4x2 one), two character designs (male and female) and the character's signature WEAPON.
PURPOSE: frame-by-frame animation sprite sheets for a 2D action RPG game; the game plays the 4 frames of each row once, left to right.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair).
WEAPON: the rune staff with the large glowing blue orb from the attached weapon image, held in the RIGHT hand. Copy the weapon EXACTLY from the attached weapon image (same shape, colors and glow) and keep it the SAME size and design in every frame of every image. The fist wraps the handle firmly; the weapon is correctly in front of or behind the body depending on the pose and direction (hidden behind the body/cape where it would be).
IMAGES 1-2 use the 4x5 template: 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK). IMAGE 3 uses the 4x2 template: 2 rows of 4 frames, ALL frames seen from the SIDE, facing LEFT; top row = male, bottom row = female.
Same character size in every frame, feet on the guide line (lying poses rest on the guide line). Flat white background, do NOT draw the labels, grid or guide lines. NO effects, NO blood, NO particles.
HURT (plays once): 1 ready stance; 2 hit — body jolts backward, head snaps back, arms flung slightly, knees bend; 3 staggers one small step back; 4 recovering to the ready stance. The weapon stays in the same hand.
DEATH (plays once, ends lying, ONE direction only — side view facing LEFT): 1 staggers backward, knees buckle; 2 falls to the knees, weapon slipping from the hand; 3 collapses backward toward the ground; 4 lying flat and still on the back/side with the head to the RIGHT, the visor light dim, the weapon lying beside the body. Keep the lying body inside its cell.
IMAGE 1 — male HURT: Rune Caster Type-B: navy hooded coat with glowing runes, short blue hair plates, light-blue visor.
IMAGE 2 — female HURT: Rune Caster Type-A: navy hooded coat with glowing blue runes, long deep blue hair plates, light-blue visor.
IMAGE 3 — DEATH, top row male: Rune Caster Type-B: navy hooded coat with glowing runes, short blue hair plates, light-blue visor. Bottom row female: Rune Caster Type-A: navy hooded coat with glowing blue runes, long deep blue hair plates, light-blue visor.
```

## 3. Wildhunter

แนบ: `template_tpl_walk.png`, `anim_template_4x2.png`, `3_wildhunter_m.png`, `3_wildhunter_f.png`, `3_wildhunter_weapon.png`

```
Create 3 SEPARATE images (do not merge them). Attached: two blank sheet templates (a 4x5 one and a 4x2 one), two character designs (male and female) and the character's signature WEAPON.
PURPOSE: frame-by-frame animation sprite sheets for a 2D action RPG game; the game plays the 4 frames of each row once, left to right.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair).
WEAPON: the green-crystal recurve bow from the attached weapon image, held by the middle of the grip in the LEFT hand, string visible; quiver on the back. Copy the weapon EXACTLY from the attached weapon image (same shape, colors and glow) and keep it the SAME size and design in every frame of every image. The fist wraps the handle firmly; the weapon is correctly in front of or behind the body depending on the pose and direction (hidden behind the body/cape where it would be).
IMAGES 1-2 use the 4x5 template: 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK). IMAGE 3 uses the 4x2 template: 2 rows of 4 frames, ALL frames seen from the SIDE, facing LEFT; top row = male, bottom row = female.
Same character size in every frame, feet on the guide line (lying poses rest on the guide line). Flat white background, do NOT draw the labels, grid or guide lines. NO effects, NO blood, NO particles.
HURT (plays once): 1 ready stance; 2 hit — body jolts backward, head snaps back, arms flung slightly, knees bend; 3 staggers one small step back; 4 recovering to the ready stance. The weapon stays in the same hand.
DEATH (plays once, ends lying, ONE direction only — side view facing LEFT): 1 staggers backward, knees buckle; 2 falls to the knees, weapon slipping from the hand; 3 collapses backward toward the ground; 4 lying flat and still on the back/side with the head to the RIGHT, the visor light dim, the weapon lying beside the body. Keep the lying body inside its cell.
IMAGE 1 — male HURT: Wildhunter Type-B: forest green hooded cloak, short gold hair plates, quiver on the back, green visor.
IMAGE 2 — female HURT: Wildhunter Type-A: forest green hooded cloak, gold braid hair plates, quiver on the back, green visor.
IMAGE 3 — DEATH, top row male: Wildhunter Type-B: forest green hooded cloak, short gold hair plates, quiver on the back, green visor. Bottom row female: Wildhunter Type-A: forest green hooded cloak, gold braid hair plates, quiver on the back, green visor.
```

## 4. Völva

แนบ: `template_tpl_walk.png`, `anim_template_4x2.png`, `4_volva_m.png`, `4_volva_f.png`, `4_volva_weapon.png`

```
Create 3 SEPARATE images (do not merge them). Attached: two blank sheet templates (a 4x5 one and a 4x2 one), two character designs (male and female) and the character's signature WEAPON.
PURPOSE: frame-by-frame animation sprite sheets for a 2D action RPG game; the game plays the 4 frames of each row once, left to right.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair).
WEAPON: the golden scepter with the large blue gem head from the attached weapon image, held in the RIGHT hand. Copy the weapon EXACTLY from the attached weapon image (same shape, colors and glow) and keep it the SAME size and design in every frame of every image. The fist wraps the handle firmly; the weapon is correctly in front of or behind the body depending on the pose and direction (hidden behind the body/cape where it would be).
IMAGES 1-2 use the 4x5 template: 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK). IMAGE 3 uses the 4x2 template: 2 rows of 4 frames, ALL frames seen from the SIDE, facing LEFT; top row = male, bottom row = female.
Same character size in every frame, feet on the guide line (lying poses rest on the guide line). Flat white background, do NOT draw the labels, grid or guide lines. NO effects, NO blood, NO particles.
HURT (plays once): 1 ready stance; 2 hit — body jolts backward, head snaps back, arms flung slightly, knees bend; 3 staggers one small step back; 4 recovering to the ready stance. The weapon stays in the same hand.
DEATH (plays once, ends lying, ONE direction only — side view facing LEFT): 1 staggers backward, knees buckle; 2 falls to the knees, weapon slipping from the hand; 3 collapses backward toward the ground; 4 lying flat and still on the back/side with the head to the RIGHT, the visor light dim, the weapon lying beside the body. Keep the lying body inside its cell.
IMAGE 1 — male HURT: Völva Type-B: white and gold robe with gold armor pieces, shoulder-length black hair plates, gold circlet, gold visor.
IMAGE 2 — female HURT: Völva Type-A: white and gold flowing robe, very long black hair plates, gold circlet with blue gem, gold visor.
IMAGE 3 — DEATH, top row male: Völva Type-B: white and gold robe with gold armor pieces, shoulder-length black hair plates, gold circlet, gold visor. Bottom row female: Völva Type-A: white and gold flowing robe, very long black hair plates, gold circlet with blue gem, gold visor.
```

## 5. Trickster

แนบ: `template_tpl_walk.png`, `anim_template_4x2.png`, `5_trickster_m.png`, `5_trickster_f.png`, `5_trickster_weapon.png`

```
Create 3 SEPARATE images (do not merge them). Attached: two blank sheet templates (a 4x5 one and a 4x2 one), two character designs (male and female) and the character's signature WEAPON.
PURPOSE: frame-by-frame animation sprite sheets for a 2D action RPG game; the game plays the 4 frames of each row once, left to right.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair).
WEAPON: the violet crystal dagger from the attached weapon image, held in the RIGHT hand (forearm length). Copy the weapon EXACTLY from the attached weapon image (same shape, colors and glow) and keep it the SAME size and design in every frame of every image. The fist wraps the handle firmly; the weapon is correctly in front of or behind the body depending on the pose and direction (hidden behind the body/cape where it would be).
IMAGES 1-2 use the 4x5 template: 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK). IMAGE 3 uses the 4x2 template: 2 rows of 4 frames, ALL frames seen from the SIDE, facing LEFT; top row = male, bottom row = female.
Same character size in every frame, feet on the guide line (lying poses rest on the guide line). Flat white background, do NOT draw the labels, grid or guide lines. NO effects, NO blood, NO particles.
HURT (plays once): 1 ready stance; 2 hit — body jolts backward, head snaps back, arms flung slightly, knees bend; 3 staggers one small step back; 4 recovering to the ready stance. The weapon stays in the same hand.
DEATH (plays once, ends lying, ONE direction only — side view facing LEFT): 1 staggers backward, knees buckle; 2 falls to the knees, weapon slipping from the hand; 3 collapses backward toward the ground; 4 lying flat and still on the back/side with the head to the RIGHT, the visor light dim, the weapon lying beside the body. Keep the lying body inside its cell.
IMAGE 1 — male HURT: Loki's Trickster Type-B: dark purple stealth armor, short spiky crimson hair plates, violet visor.
IMAGE 2 — female HURT: Loki's Trickster Type-A: sleek dark purple stealth armor, crimson ponytail of cable hair, violet visor.
IMAGE 3 — DEATH, top row male: Loki's Trickster Type-B: dark purple stealth armor, short spiky crimson hair plates, violet visor. Bottom row female: Loki's Trickster Type-A: sleek dark purple stealth armor, crimson ponytail of cable hair, violet visor.
```

## 6. Berserker

แนบ: `template_tpl_walk.png`, `anim_template_4x2.png`, `6_berserker_m.png`, `6_berserker_f.png`, `6_berserker_weapon.png`

```
Create 3 SEPARATE images (do not merge them). Attached: two blank sheet templates (a 4x5 one and a 4x2 one), two character designs (male and female) and the character's signature WEAPON.
PURPOSE: frame-by-frame animation sprite sheets for a 2D action RPG game; the game plays the 4 frames of each row once, left to right.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair).
WEAPON: the huge orange energy battle axe from the attached weapon image, held with BOTH hands on the long handle. Copy the weapon EXACTLY from the attached weapon image (same shape, colors and glow) and keep it the SAME size and design in every frame of every image. The fist wraps the handle firmly; the weapon is correctly in front of or behind the body depending on the pose and direction (hidden behind the body/cape where it would be).
IMAGES 1-2 use the 4x5 template: 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK). IMAGE 3 uses the 4x2 template: 2 rows of 4 frames, ALL frames seen from the SIDE, facing LEFT; top row = male, bottom row = female.
Same character size in every frame, feet on the guide line (lying poses rest on the guide line). Flat white background, do NOT draw the labels, grid or guide lines. NO effects, NO blood, NO particles.
HURT (plays once): 1 ready stance; 2 hit — body jolts backward, head snaps back, arms flung slightly, knees bend; 3 staggers one small step back; 4 recovering to the ready stance. The weapon stays in the same hand.
DEATH (plays once, ends lying, ONE direction only — side view facing LEFT): 1 staggers backward, knees buckle; 2 falls to the knees, weapon slipping from the hand; 3 collapses backward toward the ground; 4 lying flat and still on the back/side with the head to the RIGHT, the visor light dim, the weapon lying beside the body. Keep the lying body inside its cell.
IMAGE 1 — male HURT: Berserker Type-B: bulky bronze and brown armor, metal wolf-head hood, short spiky silver hair plates, orange visor.
IMAGE 2 — female HURT: Berserker Type-A: bronze and brown rugged armor, metal wolf-head hood, long wild silver hair plates, orange visor.
IMAGE 3 — DEATH, top row male: Berserker Type-B: bulky bronze and brown armor, metal wolf-head hood, short spiky silver hair plates, orange visor. Bottom row female: Berserker Type-A: bronze and brown rugged armor, metal wolf-head hood, long wild silver hair plates, orange visor.
```
