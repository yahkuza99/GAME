# ภาพ Class 1 แบบถืออาวุธในภาพ (ฉบับจบ) — แชตละ 4 ภาพ


รวม 9 แชต


**แชตละ 4 ภาพ (เจ้าของเลือก):** ชุด A = Class เดียว เดิน+ตี (ชาย/หญิง) • ชุด B = สกิลของ 2 Class (ชาย/หญิง × 2)
ถ้าได้ไม่ครบ พิมพ์ `now draw IMAGE 2` (3, 4) • ส่งภาพกลับมาตอนที่ Claude ตอบเสร็จแล้ว ทีละ 2–4 ภาพ
ท่าเดินเพี้ยน/ก้าวถอยหลัง: `Redraw the WALK image frame by frame copying the mannequin in walk_rig.png (blue = LEFT leg, orange = RIGHT leg), walking forward in every row`
อาวุธเพี้ยน: `Redraw: the weapon must look exactly like the attached reference, same size, in every frame`

## 1. Einherjar — ชุด A: เดิน + ตี

> ท่าตี (ภาพ 3-4) ได้แล้ว ✓ — สั่งแค่ภาพ 1-2 (เดิน) ใหม่ก็พอ: วาง prompt แล้วต่อท้ายว่า `Only draw IMAGE 1 and IMAGE 2.`

แนบ: `template_tpl_walk.png`, `walk_rig.png`, `1_einherjar_m.png`, `1_einherjar_f.png`, `1_einherjar_weapon.png` • ติดตั้ง: ภาพ 1-2 = `walk`, 3-4 = `attack`

```
Create 4 SEPARATE images (do not merge them). Attached: a blank sheet template, a WALK RIG reference sheet (walk_rig.png: a simple mannequin whose LEFT leg is BLUE and RIGHT leg is ORANGE, laid out exactly like the template; copy its leg and arm positions frame by frame in every direction), two character designs (male Type-B and female Type-A) and the character's signature WEAPON.
PURPOSE: this is a frame-by-frame animation sprite sheet for a 2D action RPG game. The game plays the 4 frames of each row in order from left to right (WALK loops 1-2-3-4-1-2... so frame 4 must flow smoothly back into frame 1; ATTACK plays once 1-2-3-4). Every frame must be a clearly different pose, consistent with the frames before and after it, like a professional game animation.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair).
WEAPON: the red energy longsword with gold crossguard from the attached weapon image, held in the RIGHT hand; NO shield. Copy the weapon EXACTLY from the attached weapon image (same shape, colors and glow) and keep it the SAME size and design in every frame of every image. The fist wraps the handle firmly; the weapon is correctly in front of or behind the body depending on the pose and direction (hidden behind the body/cape where it would be).
Each image is drawn into the attached template: 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK), the action aimed toward the facing direction of that row. Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines. NO magic effects, NO slash trails, NO particles, NO motion lines (the game adds effects).
WALK (copy the leg positions of the attached walk_rig.png mannequin frame by frame: BLUE = the character's LEFT leg, ORANGE = RIGHT leg), legs named from the CHARACTER's own left/right: FRAME 1 = LEFT foot far FORWARD with the heel down, RIGHT foot far BACK on its toes, RIGHT arm swings forward, LEFT arm back; FRAME 2 = RIGHT leg swinging FORWARD past the body with the knee lifted, LEFT leg straight under the body carrying the weight, arms at the sides; FRAME 3 = RIGHT foot far FORWARD with the heel down, LEFT foot far BACK on its toes, LEFT arm swings forward, RIGHT arm back; FRAME 4 = LEFT leg swinging FORWARD past the body with the knee lifted, RIGHT leg straight under the body, arms at the sides. Same leg order in EVERY direction row. The character always walks FORWARD toward the facing direction of the row, never backward; the head stays level and the body the same height in all frames. The hand holding the weapon keeps it in every frame (the weapon arm still swings naturally); carry the sword low at the side, blade pointing down and slightly forward.
ATTACK (plays once, frame by frame): one-handed sword slash: 1 wind-up, sword pulled back over the shoulder; 2 big diagonal slash forward and down, body leaning in; 3 follow-through, sword low across the body; 4 recover to guard stance.
IMAGE 1 — male WALK: Einherjar Type-B: bulkier steel plate armor with red trim, crimson cape, horned helmet, red visor.
IMAGE 2 — female WALK: Einherjar Type-A: heavy steel plate armor with red trim, crimson cape, horned helmet, red visor.
IMAGE 3 — male ATTACK: Einherjar Type-B: bulkier steel plate armor with red trim, crimson cape, horned helmet, red visor.
IMAGE 4 — female ATTACK: Einherjar Type-A: heavy steel plate armor with red trim, crimson cape, horned helmet, red visor.
```

## 2. Runecaster — ชุด A: เดิน + ตี

แนบ: `template_tpl_walk.png`, `walk_rig.png`, `2_runecaster_m.png`, `2_runecaster_f.png`, `2_runecaster_weapon.png` • ติดตั้ง: ภาพ 1-2 = `walk`, 3-4 = `attack`

```
Create 4 SEPARATE images (do not merge them). Attached: a blank sheet template, a WALK RIG reference sheet (walk_rig.png: a simple mannequin whose LEFT leg is BLUE and RIGHT leg is ORANGE, laid out exactly like the template; copy its leg and arm positions frame by frame in every direction), two character designs (male Type-B and female Type-A) and the character's signature WEAPON.
PURPOSE: this is a frame-by-frame animation sprite sheet for a 2D action RPG game. The game plays the 4 frames of each row in order from left to right (WALK loops 1-2-3-4-1-2... so frame 4 must flow smoothly back into frame 1; ATTACK plays once 1-2-3-4). Every frame must be a clearly different pose, consistent with the frames before and after it, like a professional game animation.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair).
WEAPON: the rune staff with the large glowing blue orb from the attached weapon image, held in the RIGHT hand. Copy the weapon EXACTLY from the attached weapon image (same shape, colors and glow) and keep it the SAME size and design in every frame of every image. The fist wraps the handle firmly; the weapon is correctly in front of or behind the body depending on the pose and direction (hidden behind the body/cape where it would be).
Each image is drawn into the attached template: 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK), the action aimed toward the facing direction of that row. Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines. NO magic effects, NO slash trails, NO particles, NO motion lines (the game adds effects).
WALK (copy the leg positions of the attached walk_rig.png mannequin frame by frame: BLUE = the character's LEFT leg, ORANGE = RIGHT leg), legs named from the CHARACTER's own left/right: FRAME 1 = LEFT foot far FORWARD with the heel down, RIGHT foot far BACK on its toes, RIGHT arm swings forward, LEFT arm back; FRAME 2 = RIGHT leg swinging FORWARD past the body with the knee lifted, LEFT leg straight under the body carrying the weight, arms at the sides; FRAME 3 = RIGHT foot far FORWARD with the heel down, LEFT foot far BACK on its toes, LEFT arm swings forward, RIGHT arm back; FRAME 4 = LEFT leg swinging FORWARD past the body with the knee lifted, RIGHT leg straight under the body, arms at the sides. Same leg order in EVERY direction row. The character always walks FORWARD toward the facing direction of the row, never backward; the head stays level and the body the same height in all frames. The hand holding the weapon keeps it in every frame (the weapon arm still swings naturally); carry the staff upright like a walking stick, orb at shoulder height, lower end near the ground.
ATTACK (plays once, frame by frame): staff strike: 1 staff drawn back; 2 quick forward thrust of the orb toward the facing direction; 3 arm extended, body leaning forward; 4 recover.
IMAGE 1 — male WALK: Rune Caster Type-B: navy hooded coat with glowing runes, short blue hair plates, light-blue visor.
IMAGE 2 — female WALK: Rune Caster Type-A: navy hooded coat with glowing blue runes, long deep blue hair plates, light-blue visor.
IMAGE 3 — male ATTACK: Rune Caster Type-B: navy hooded coat with glowing runes, short blue hair plates, light-blue visor.
IMAGE 4 — female ATTACK: Rune Caster Type-A: navy hooded coat with glowing blue runes, long deep blue hair plates, light-blue visor.
```

## 3. Wildhunter — ชุด A: เดิน + ยิง

แนบ: `template_tpl_walk.png`, `walk_rig.png`, `3_wildhunter_m.png`, `3_wildhunter_f.png`, `3_wildhunter_weapon.png` • ติดตั้ง: ภาพ 1-2 = `walk`, 3-4 = `shoot`

```
Create 4 SEPARATE images (do not merge them). Attached: a blank sheet template, a WALK RIG reference sheet (walk_rig.png: a simple mannequin whose LEFT leg is BLUE and RIGHT leg is ORANGE, laid out exactly like the template; copy its leg and arm positions frame by frame in every direction), two character designs (male Type-B and female Type-A) and the character's signature WEAPON.
PURPOSE: this is a frame-by-frame animation sprite sheet for a 2D action RPG game. The game plays the 4 frames of each row in order from left to right (WALK loops 1-2-3-4-1-2... so frame 4 must flow smoothly back into frame 1; ATTACK plays once 1-2-3-4). Every frame must be a clearly different pose, consistent with the frames before and after it, like a professional game animation.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair).
WEAPON: the green-crystal recurve bow from the attached weapon image, held by the middle of the grip in the LEFT hand, string visible; quiver on the back. Copy the weapon EXACTLY from the attached weapon image (same shape, colors and glow) and keep it the SAME size and design in every frame of every image. The fist wraps the handle firmly; the weapon is correctly in front of or behind the body depending on the pose and direction (hidden behind the body/cape where it would be).
Each image is drawn into the attached template: 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK), the action aimed toward the facing direction of that row. Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines. NO magic effects, NO slash trails, NO particles, NO motion lines (the game adds effects).
WALK (copy the leg positions of the attached walk_rig.png mannequin frame by frame: BLUE = the character's LEFT leg, ORANGE = RIGHT leg), legs named from the CHARACTER's own left/right: FRAME 1 = LEFT foot far FORWARD with the heel down, RIGHT foot far BACK on its toes, RIGHT arm swings forward, LEFT arm back; FRAME 2 = RIGHT leg swinging FORWARD past the body with the knee lifted, LEFT leg straight under the body carrying the weight, arms at the sides; FRAME 3 = RIGHT foot far FORWARD with the heel down, LEFT foot far BACK on its toes, LEFT arm swings forward, RIGHT arm back; FRAME 4 = LEFT leg swinging FORWARD past the body with the knee lifted, RIGHT leg straight under the body, arms at the sides. Same leg order in EVERY direction row. The character always walks FORWARD toward the facing direction of the row, never backward; the head stays level and the body the same height in all frames. The hand holding the weapon keeps it in every frame (the weapon arm still swings naturally); carry the bow vertically at the side in the left hand.
ATTACK (plays once, frame by frame): BOW SHOT: 1 ready stance, bow arm starts rising; 2 bow arm fully stretched toward the facing direction, right hand nocks an arrow and pulls; 3 full draw, right hand at the chin, string pulled back; 4 release, right hand flies back open, arrow gone, small recoil.
IMAGE 1 — male WALK: Wildhunter Type-B: forest green hooded cloak, short gold hair plates, quiver on the back, green visor.
IMAGE 2 — female WALK: Wildhunter Type-A: forest green hooded cloak, gold braid hair plates, quiver on the back, green visor.
IMAGE 3 — male ATTACK: Wildhunter Type-B: forest green hooded cloak, short gold hair plates, quiver on the back, green visor.
IMAGE 4 — female ATTACK: Wildhunter Type-A: forest green hooded cloak, gold braid hair plates, quiver on the back, green visor.
```

## 4. Völva — ชุด A: เดิน + ตี

แนบ: `template_tpl_walk.png`, `walk_rig.png`, `4_volva_m.png`, `4_volva_f.png`, `4_volva_weapon.png` • ติดตั้ง: ภาพ 1-2 = `walk`, 3-4 = `attack`

```
Create 4 SEPARATE images (do not merge them). Attached: a blank sheet template, a WALK RIG reference sheet (walk_rig.png: a simple mannequin whose LEFT leg is BLUE and RIGHT leg is ORANGE, laid out exactly like the template; copy its leg and arm positions frame by frame in every direction), two character designs (male Type-B and female Type-A) and the character's signature WEAPON.
PURPOSE: this is a frame-by-frame animation sprite sheet for a 2D action RPG game. The game plays the 4 frames of each row in order from left to right (WALK loops 1-2-3-4-1-2... so frame 4 must flow smoothly back into frame 1; ATTACK plays once 1-2-3-4). Every frame must be a clearly different pose, consistent with the frames before and after it, like a professional game animation.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair).
WEAPON: the golden scepter with the large blue gem head from the attached weapon image, held in the RIGHT hand. Copy the weapon EXACTLY from the attached weapon image (same shape, colors and glow) and keep it the SAME size and design in every frame of every image. The fist wraps the handle firmly; the weapon is correctly in front of or behind the body depending on the pose and direction (hidden behind the body/cape where it would be).
Each image is drawn into the attached template: 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK), the action aimed toward the facing direction of that row. Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines. NO magic effects, NO slash trails, NO particles, NO motion lines (the game adds effects).
WALK (copy the leg positions of the attached walk_rig.png mannequin frame by frame: BLUE = the character's LEFT leg, ORANGE = RIGHT leg), legs named from the CHARACTER's own left/right: FRAME 1 = LEFT foot far FORWARD with the heel down, RIGHT foot far BACK on its toes, RIGHT arm swings forward, LEFT arm back; FRAME 2 = RIGHT leg swinging FORWARD past the body with the knee lifted, LEFT leg straight under the body carrying the weight, arms at the sides; FRAME 3 = RIGHT foot far FORWARD with the heel down, LEFT foot far BACK on its toes, LEFT arm swings forward, RIGHT arm back; FRAME 4 = LEFT leg swinging FORWARD past the body with the knee lifted, RIGHT leg straight under the body, arms at the sides. Same leg order in EVERY direction row. The character always walks FORWARD toward the facing direction of the row, never backward; the head stays level and the body the same height in all frames. The hand holding the weapon keeps it in every frame (the weapon arm still swings naturally); carry the scepter upright like a walking stick, gem head at shoulder height.
ATTACK (plays once, frame by frame): scepter smash: 1 scepter raised up beside the head; 2 strong downward smash in front; 3 follow-through low; 4 recover.
IMAGE 1 — male WALK: Völva Type-B: white and gold robe with gold armor pieces, shoulder-length black hair plates, gold circlet, gold visor.
IMAGE 2 — female WALK: Völva Type-A: white and gold flowing robe, very long black hair plates, gold circlet with blue gem, gold visor.
IMAGE 3 — male ATTACK: Völva Type-B: white and gold robe with gold armor pieces, shoulder-length black hair plates, gold circlet, gold visor.
IMAGE 4 — female ATTACK: Völva Type-A: white and gold flowing robe, very long black hair plates, gold circlet with blue gem, gold visor.
```

## 5. Trickster — ชุด A: เดิน + ตี

แนบ: `template_tpl_walk.png`, `walk_rig.png`, `5_trickster_m.png`, `5_trickster_f.png`, `5_trickster_weapon.png` • ติดตั้ง: ภาพ 1-2 = `walk`, 3-4 = `attack`

```
Create 4 SEPARATE images (do not merge them). Attached: a blank sheet template, a WALK RIG reference sheet (walk_rig.png: a simple mannequin whose LEFT leg is BLUE and RIGHT leg is ORANGE, laid out exactly like the template; copy its leg and arm positions frame by frame in every direction), two character designs (male Type-B and female Type-A) and the character's signature WEAPON.
PURPOSE: this is a frame-by-frame animation sprite sheet for a 2D action RPG game. The game plays the 4 frames of each row in order from left to right (WALK loops 1-2-3-4-1-2... so frame 4 must flow smoothly back into frame 1; ATTACK plays once 1-2-3-4). Every frame must be a clearly different pose, consistent with the frames before and after it, like a professional game animation.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair).
WEAPON: the violet crystal dagger from the attached weapon image, held in the RIGHT hand (forearm length). Copy the weapon EXACTLY from the attached weapon image (same shape, colors and glow) and keep it the SAME size and design in every frame of every image. The fist wraps the handle firmly; the weapon is correctly in front of or behind the body depending on the pose and direction (hidden behind the body/cape where it would be).
Each image is drawn into the attached template: 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK), the action aimed toward the facing direction of that row. Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines. NO magic effects, NO slash trails, NO particles, NO motion lines (the game adds effects).
WALK (copy the leg positions of the attached walk_rig.png mannequin frame by frame: BLUE = the character's LEFT leg, ORANGE = RIGHT leg), legs named from the CHARACTER's own left/right: FRAME 1 = LEFT foot far FORWARD with the heel down, RIGHT foot far BACK on its toes, RIGHT arm swings forward, LEFT arm back; FRAME 2 = RIGHT leg swinging FORWARD past the body with the knee lifted, LEFT leg straight under the body carrying the weight, arms at the sides; FRAME 3 = RIGHT foot far FORWARD with the heel down, LEFT foot far BACK on its toes, LEFT arm swings forward, RIGHT arm back; FRAME 4 = LEFT leg swinging FORWARD past the body with the knee lifted, RIGHT leg straight under the body, arms at the sides. Same leg order in EVERY direction row. The character always walks FORWARD toward the facing direction of the row, never backward; the head stays level and the body the same height in all frames. The hand holding the weapon keeps it in every frame (the weapon arm still swings naturally); carry the dagger low, blade pointing down and forward, ready to strike.
ATTACK (plays once, frame by frame): quick dagger stab: 1 low crouch, dagger pulled back at the hip; 2 fast forward stab toward the facing direction; 3 arm fully extended, body low and leaning in; 4 hop back to stance.
IMAGE 1 — male WALK: Loki's Trickster Type-B: dark purple stealth armor, short spiky crimson hair plates, violet visor.
IMAGE 2 — female WALK: Loki's Trickster Type-A: sleek dark purple stealth armor, crimson ponytail of cable hair, violet visor.
IMAGE 3 — male ATTACK: Loki's Trickster Type-B: dark purple stealth armor, short spiky crimson hair plates, violet visor.
IMAGE 4 — female ATTACK: Loki's Trickster Type-A: sleek dark purple stealth armor, crimson ponytail of cable hair, violet visor.
```

## 6. Berserker — ชุด A: เดิน + ตี

แนบ: `template_tpl_walk.png`, `walk_rig.png`, `6_berserker_m.png`, `6_berserker_f.png`, `6_berserker_weapon.png` • ติดตั้ง: ภาพ 1-2 = `walk`, 3-4 = `attack`

```
Create 4 SEPARATE images (do not merge them). Attached: a blank sheet template, a WALK RIG reference sheet (walk_rig.png: a simple mannequin whose LEFT leg is BLUE and RIGHT leg is ORANGE, laid out exactly like the template; copy its leg and arm positions frame by frame in every direction), two character designs (male Type-B and female Type-A) and the character's signature WEAPON.
PURPOSE: this is a frame-by-frame animation sprite sheet for a 2D action RPG game. The game plays the 4 frames of each row in order from left to right (WALK loops 1-2-3-4-1-2... so frame 4 must flow smoothly back into frame 1; ATTACK plays once 1-2-3-4). Every frame must be a clearly different pose, consistent with the frames before and after it, like a professional game animation.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair).
WEAPON: the huge orange energy battle axe from the attached weapon image, held with BOTH hands on the long handle. Copy the weapon EXACTLY from the attached weapon image (same shape, colors and glow) and keep it the SAME size and design in every frame of every image. The fist wraps the handle firmly; the weapon is correctly in front of or behind the body depending on the pose and direction (hidden behind the body/cape where it would be).
Each image is drawn into the attached template: 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK), the action aimed toward the facing direction of that row. Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines. NO magic effects, NO slash trails, NO particles, NO motion lines (the game adds effects).
WALK (copy the leg positions of the attached walk_rig.png mannequin frame by frame: BLUE = the character's LEFT leg, ORANGE = RIGHT leg), legs named from the CHARACTER's own left/right: FRAME 1 = LEFT foot far FORWARD with the heel down, RIGHT foot far BACK on its toes, RIGHT arm swings forward, LEFT arm back; FRAME 2 = RIGHT leg swinging FORWARD past the body with the knee lifted, LEFT leg straight under the body carrying the weight, arms at the sides; FRAME 3 = RIGHT foot far FORWARD with the heel down, LEFT foot far BACK on its toes, LEFT arm swings forward, RIGHT arm back; FRAME 4 = LEFT leg swinging FORWARD past the body with the knee lifted, RIGHT leg straight under the body, arms at the sides. Same leg order in EVERY direction row. The character always walks FORWARD toward the facing direction of the row, never backward; the head stays level and the body the same height in all frames. The hand holding the weapon keeps it in every frame (the weapon arm still swings naturally); carry the axe resting on the shoulder, blade behind the head, never dragging on the ground.
ATTACK (plays once, frame by frame): heavy two-handed chop: 1 axe raised high over the head with both hands; 2 huge downward chop in front; 3 axe low near the ground, body bent forward; 4 heave back up to stance.
IMAGE 1 — male WALK: Berserker Type-B: bulky bronze and brown armor, metal wolf-head hood, short spiky silver hair plates, orange visor.
IMAGE 2 — female WALK: Berserker Type-A: bronze and brown rugged armor, metal wolf-head hood, long wild silver hair plates, orange visor.
IMAGE 3 — male ATTACK: Berserker Type-B: bulky bronze and brown armor, metal wolf-head hood, short spiky silver hair plates, orange visor.
IMAGE 4 — female ATTACK: Berserker Type-A: bronze and brown rugged armor, metal wolf-head hood, long wild silver hair plates, orange visor.
```

## 7. ชุด B: สกิล Einherjar + Runecaster

แนบ: `template_tpl_walk.png`, `1_einherjar_m.png`, `1_einherjar_f.png`, `1_einherjar_weapon.png`, `2_runecaster_m.png`, `2_runecaster_f.png`, `2_runecaster_weapon.png` • ติดตั้ง: ภาพ 1-2 = `einherjar` `cast`, ภาพ 3-4 = `runecaster` `cast`

```
Create 4 SEPARATE images (do not merge them). Attached: a blank sheet template and, for each class below, its male and female character designs and its signature WEAPON image.
PURPOSE: frame-by-frame SKILL animation sprite sheets for a 2D action RPG game. The game plays the 4 frames of each row once, left to right (1-2-3-4). Every frame must be a clearly different pose, flowing from the frame before, like a professional game animation.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair).
Each image is drawn into the attached template: 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK), the action aimed toward the facing direction of that row. Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines. NO magic effects, NO slash trails, NO particles, NO motion lines (the game adds effects).
CLASS EINHERJAR — WEAPON: the red energy longsword with gold crossguard from the attached weapon image, held in the RIGHT hand; NO shield. Copy the weapon EXACTLY from the attached weapon image (same shape, colors and glow) and keep it the SAME size and design in every frame of every image. The fist wraps the handle firmly; the weapon is correctly in front of or behind the body depending on the pose and direction (hidden behind the body/cape where it would be).
CLASS EINHERJAR — SKILL (plays once, frame by frame): power strike: 1 crouch and gather, sword raised behind; 2 sword held high overhead with both hands; 3 heavy downward smash, wide stance; 4 recover.
CLASS RUNECASTER — WEAPON: the rune staff with the large glowing blue orb from the attached weapon image, held in the RIGHT hand. Copy the weapon EXACTLY from the attached weapon image (same shape, colors and glow) and keep it the SAME size and design in every frame of every image. The fist wraps the handle firmly; the weapon is correctly in front of or behind the body depending on the pose and direction (hidden behind the body/cape where it would be).
CLASS RUNECASTER — SKILL (plays once, frame by frame): spell casting: 1 staff held upright in front, free hand at the chest; 2 staff raised high, free hand open toward the facing direction; 3 both arms pushed forward releasing the spell; 4 recover.
IMAGE 1 — male SKILL: Einherjar Type-B: bulkier steel plate armor with red trim, crimson cape, horned helmet, red visor.
IMAGE 2 — female SKILL: Einherjar Type-A: heavy steel plate armor with red trim, crimson cape, horned helmet, red visor.
IMAGE 3 — male SKILL: Rune Caster Type-B: navy hooded coat with glowing runes, short blue hair plates, light-blue visor.
IMAGE 4 — female SKILL: Rune Caster Type-A: navy hooded coat with glowing blue runes, long deep blue hair plates, light-blue visor.
```

## 8. ชุด B: สกิล Wildhunter + Völva

แนบ: `template_tpl_walk.png`, `3_wildhunter_m.png`, `3_wildhunter_f.png`, `3_wildhunter_weapon.png`, `4_volva_m.png`, `4_volva_f.png`, `4_volva_weapon.png` • ติดตั้ง: ภาพ 1-2 = `wildhunter` `cast`, ภาพ 3-4 = `volva` `cast`

```
Create 4 SEPARATE images (do not merge them). Attached: a blank sheet template and, for each class below, its male and female character designs and its signature WEAPON image.
PURPOSE: frame-by-frame SKILL animation sprite sheets for a 2D action RPG game. The game plays the 4 frames of each row once, left to right (1-2-3-4). Every frame must be a clearly different pose, flowing from the frame before, like a professional game animation.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair).
Each image is drawn into the attached template: 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK), the action aimed toward the facing direction of that row. Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines. NO magic effects, NO slash trails, NO particles, NO motion lines (the game adds effects).
CLASS WILDHUNTER — WEAPON: the green-crystal recurve bow from the attached weapon image, held by the middle of the grip in the LEFT hand, string visible; quiver on the back. Copy the weapon EXACTLY from the attached weapon image (same shape, colors and glow) and keep it the SAME size and design in every frame of every image. The fist wraps the handle firmly; the weapon is correctly in front of or behind the body depending on the pose and direction (hidden behind the body/cape where it would be).
CLASS WILDHUNTER — SKILL (plays once, frame by frame): POWER SHOT: 1 low crouch, bow forward; 2 deep full draw, body leaning back, glowing arrow on the string; 3 release with a strong step forward; 4 recover.
CLASS VÖLVA — WEAPON: the golden scepter with the large blue gem head from the attached weapon image, held in the RIGHT hand. Copy the weapon EXACTLY from the attached weapon image (same shape, colors and glow) and keep it the SAME size and design in every frame of every image. The fist wraps the handle firmly; the weapon is correctly in front of or behind the body depending on the pose and direction (hidden behind the body/cape where it would be).
CLASS VÖLVA — SKILL (plays once, frame by frame): holy prayer: 1 scepter held upright in front of the chest; 2 scepter raised high above the head, free hand on the chest; 3 both arms spread open, chest lifted; 4 recover.
IMAGE 1 — male SKILL: Wildhunter Type-B: forest green hooded cloak, short gold hair plates, quiver on the back, green visor.
IMAGE 2 — female SKILL: Wildhunter Type-A: forest green hooded cloak, gold braid hair plates, quiver on the back, green visor.
IMAGE 3 — male SKILL: Völva Type-B: white and gold robe with gold armor pieces, shoulder-length black hair plates, gold circlet, gold visor.
IMAGE 4 — female SKILL: Völva Type-A: white and gold flowing robe, very long black hair plates, gold circlet with blue gem, gold visor.
```

## 9. ชุด B: สกิล Trickster + Berserker

แนบ: `template_tpl_walk.png`, `5_trickster_m.png`, `5_trickster_f.png`, `5_trickster_weapon.png`, `6_berserker_m.png`, `6_berserker_f.png`, `6_berserker_weapon.png` • ติดตั้ง: ภาพ 1-2 = `trickster` `cast`, ภาพ 3-4 = `berserker` `cast`

```
Create 4 SEPARATE images (do not merge them). Attached: a blank sheet template and, for each class below, its male and female character designs and its signature WEAPON image.
PURPOSE: frame-by-frame SKILL animation sprite sheets for a 2D action RPG game. The game plays the 4 frames of each row once, left to right (1-2-3-4). Every frame must be a clearly different pose, flowing from the frame before, like a professional game animation.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair).
Each image is drawn into the attached template: 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK), the action aimed toward the facing direction of that row. Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines. NO magic effects, NO slash trails, NO particles, NO motion lines (the game adds effects).
CLASS TRICKSTER — WEAPON: the violet crystal dagger from the attached weapon image, held in the RIGHT hand (forearm length). Copy the weapon EXACTLY from the attached weapon image (same shape, colors and glow) and keep it the SAME size and design in every frame of every image. The fist wraps the handle firmly; the weapon is correctly in front of or behind the body depending on the pose and direction (hidden behind the body/cape where it would be).
CLASS TRICKSTER — SKILL (plays once, frame by frame): spinning slash: 1 crouch and twist; 2 spin halfway, dagger swung wide; 3 finish the spin with the dagger slashing forward; 4 recover.
CLASS BERSERKER — WEAPON: the huge orange energy battle axe from the attached weapon image, held with BOTH hands on the long handle. Copy the weapon EXACTLY from the attached weapon image (same shape, colors and glow) and keep it the SAME size and design in every frame of every image. The fist wraps the handle firmly; the weapon is correctly in front of or behind the body depending on the pose and direction (hidden behind the body/cape where it would be).
CLASS BERSERKER — SKILL (plays once, frame by frame): rage whirlwind: 1 wide stance, axe held back with both hands; 2 big horizontal swing; 3 swing continues around, body twisting; 4 recover.
IMAGE 1 — male SKILL: Loki's Trickster Type-B: dark purple stealth armor, short spiky crimson hair plates, violet visor.
IMAGE 2 — female SKILL: Loki's Trickster Type-A: sleek dark purple stealth armor, crimson ponytail of cable hair, violet visor.
IMAGE 3 — male SKILL: Berserker Type-B: bulky bronze and brown armor, metal wolf-head hood, short spiky silver hair plates, orange visor.
IMAGE 4 — female SKILL: Berserker Type-A: bronze and brown rugged armor, metal wolf-head hood, long wild silver hair plates, orange visor.
```
