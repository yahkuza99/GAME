# ท่าโจมตี + ท่าใช้สกิล Class 1 — 6 แชต (แชตละ 1 Class: ชาย/หญิง × โจมตี/สกิล = 4 ภาพ)

แต่ละแชต: แนบ `template_tpl_walk.png` + รูป Class นั้น 2 รูป (เช่น `1_einherjar_m.png`, `1_einherjar_f.png`) แล้ววาง prompt
ได้ 4 ภาพ: 1 ชาย-โจมตี, 2 หญิง-โจมตี, 3 ชาย-สกิล, 4 หญิง-สกิล • ถ้าได้มาไม่ครบ พิมพ์ `now draw IMAGE 2` (3, 4)

**อาวุธประจำ Class (เจ้าของเลือก 2026-10-02):** ภาพไม่มีอาวุธ มือกำ **แท่งสีชมพูบานเย็น** แทน เหมือนท่าเดิน
เกมวาดอาวุธประจำ Class ลงไปเอง ท่าเดิน/โจมตี/สกิลจึงเป็นอาวุธหน้าตาเดียวกันทุกท่า
ห้ามมีเอฟเฟกต์ (แสง/ประกาย/วงเวท) ในภาพ — เกมใส่เอฟเฟกต์ของสกิลเอง
ถ้า AI ใส่อาวุธหรือเอฟเฟกต์มา: `Redraw: no weapon, no effects, only the magenta stick`

ติดตั้ง (ผมทำ): `sprite_std.py install <png> <class>_<m|f> attack|cast --grid 4x5 --dirs S,SW,W,NW,N`
(Wildhunter: ท่าโจมตี = `shoot`) แล้ว `paperdoll.py --marker magenta [--center shoot,cast สำหรับ Wildhunter] ...`

## 1. Einherjar

แนบ: `template_tpl_walk.png`, `1_einherjar_m.png`, `1_einherjar_f.png` • ติดตั้งเป็น `einherjar_m/f` ท่า `attack` (ภาพ 1-2) และ `cast` (ภาพ 3-4)

```
Create 4 SEPARATE images (do not merge them). Attached: a blank sheet template and two character designs (male Type-B and female Type-A).
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair) but LEAVE OUT the weapon and the shield.
Draw each animation into the attached template, 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK), the action aimed toward the facing direction of that row. Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines.
NO weapon, NO shield, NO magic effects, NO glow, NO particles, NO motion lines. Instead of the weapon, the RIGHT fist grips a thin straight solid MAGENTA (#FF00FF) marker stick about as long as the forearm, held exactly like the weapon handle and pointing where the weapon would point. The same stick is in every frame of every direction (it only marks the weapon, the game draws the real weapon there).
ATTACK = one-handed slash (held like a sword): 1 wind-up, stick arm pulled back over the shoulder; 2 big diagonal slash forward and down, body leaning in; 3 follow-through, arm low across the body; 4 recover to guard stance.
SKILL = war cry power strike: 1 crouch and gather, stick raised behind; 2 stick held high overhead with both hands; 3 heavy downward smash, wide stance; 4 recover.
IMAGE 1 — male ATTACK: Einherjar Type-B: bulkier steel plate armor with red trim, crimson cape, horned helmet, red visor.
IMAGE 2 — female ATTACK: Einherjar Type-A: heavy steel plate armor with red trim, crimson cape, horned helmet, red visor.
IMAGE 3 — male SKILL: Einherjar Type-B: bulkier steel plate armor with red trim, crimson cape, horned helmet, red visor.
IMAGE 4 — female SKILL: Einherjar Type-A: heavy steel plate armor with red trim, crimson cape, horned helmet, red visor.
```

## 2. Runecaster

แนบ: `template_tpl_walk.png`, `2_runecaster_m.png`, `2_runecaster_f.png` • ติดตั้งเป็น `runecaster_m/f` ท่า `attack` (ภาพ 1-2) และ `cast` (ภาพ 3-4)

```
Create 4 SEPARATE images (do not merge them). Attached: a blank sheet template and two character designs (male Type-B and female Type-A).
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair) but LEAVE OUT the weapon and the shield.
Draw each animation into the attached template, 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK), the action aimed toward the facing direction of that row. Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines.
NO weapon, NO shield, NO magic effects, NO glow, NO particles, NO motion lines. Instead of the weapon, the RIGHT fist grips a thin straight solid MAGENTA (#FF00FF) marker stick about as long as the forearm, held exactly like the weapon handle and pointing where the weapon would point. The same stick is in every frame of every direction (it only marks the weapon, the game draws the real weapon there).
ATTACK = short strike (held like a staff): 1 stick drawn back; 2 quick forward thrust of the stick toward the facing direction; 3 arm extended, body leaning forward; 4 recover.
SKILL = spell casting: 1 stick held in front, free hand at the chest; 2 stick raised high, free hand open toward the facing direction; 3 both arms pushed forward releasing the spell; 4 recover.
IMAGE 1 — male ATTACK: Rune Caster Type-B: navy hooded coat with glowing runes, short blue hair plates, light-blue visor.
IMAGE 2 — female ATTACK: Rune Caster Type-A: navy hooded coat with glowing blue runes, long deep blue hair plates, light-blue visor.
IMAGE 3 — male SKILL: Rune Caster Type-B: navy hooded coat with glowing runes, short blue hair plates, light-blue visor.
IMAGE 4 — female SKILL: Rune Caster Type-A: navy hooded coat with glowing blue runes, long deep blue hair plates, light-blue visor.
```

## 3. Wildhunter

แนบ: `template_tpl_walk.png`, `3_wildhunter_m.png`, `3_wildhunter_f.png` • ติดตั้งเป็น `wildhunter_m/f` ท่า `shoot` (ภาพ 1-2) และ `cast` (ภาพ 3-4)

```
Create 4 SEPARATE images (do not merge them). Attached: a blank sheet template and two character designs (male Type-B and female Type-A).
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair) but LEAVE OUT the weapon and the shield.
Draw each animation into the attached template, 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK), the action aimed toward the facing direction of that row. Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines.
NO weapon, NO shield, NO magic effects, NO glow, NO particles, NO motion lines. Instead of the bow, the LEFT fist grips a short straight solid MAGENTA (#FF00FF) marker stick held VERTICALLY where the bow grip would be; NO bow, NO arrow, NO string. The same stick is in every frame of every direction (it only marks the weapon, the game draws the real weapon there).
ATTACK = BOW SHOT: 1 ready stance, LEFT arm starts rising forward; 2 LEFT arm fully stretched toward the facing direction, RIGHT hand pulls back; 3 full draw, RIGHT hand at the chin, steady; 4 release, RIGHT hand flies back open, small recoil.
SKILL = POWER SHOT: 1 low crouch, LEFT arm forward; 2 deep full draw, body leaning back; 3 release with a strong step forward; 4 recover.
IMAGE 1 — male ATTACK: Wildhunter Type-B: forest green hooded cloak, short gold hair plates, quiver on the back, green visor.
IMAGE 2 — female ATTACK: Wildhunter Type-A: forest green hooded cloak, gold braid hair plates, quiver on the back, green visor.
IMAGE 3 — male SKILL: Wildhunter Type-B: forest green hooded cloak, short gold hair plates, quiver on the back, green visor.
IMAGE 4 — female SKILL: Wildhunter Type-A: forest green hooded cloak, gold braid hair plates, quiver on the back, green visor.
```

## 4. Volva

แนบ: `template_tpl_walk.png`, `4_volva_m.png`, `4_volva_f.png` • ติดตั้งเป็น `volva_m/f` ท่า `attack` (ภาพ 1-2) และ `cast` (ภาพ 3-4)

```
Create 4 SEPARATE images (do not merge them). Attached: a blank sheet template and two character designs (male Type-B and female Type-A).
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair) but LEAVE OUT the weapon and the shield.
Draw each animation into the attached template, 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK), the action aimed toward the facing direction of that row. Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines.
NO weapon, NO shield, NO magic effects, NO glow, NO particles, NO motion lines. Instead of the weapon, the RIGHT fist grips a thin straight solid MAGENTA (#FF00FF) marker stick about as long as the forearm, held exactly like the weapon handle and pointing where the weapon would point. The same stick is in every frame of every direction (it only marks the weapon, the game draws the real weapon there).
ATTACK = one-handed smash (held like a mace): 1 stick raised up beside the head; 2 strong downward smash in front; 3 follow-through low; 4 recover.
SKILL = holy prayer cast: 1 stick held upright in front of the chest; 2 stick raised high above the head, free hand on the chest; 3 both arms spread open, chest lifted; 4 recover.
IMAGE 1 — male ATTACK: Völva Type-B: white and gold robe with gold armor pieces, shoulder-length black hair plates, gold circlet, gold visor.
IMAGE 2 — female ATTACK: Völva Type-A: white and gold flowing robe, very long black hair plates, gold circlet with blue gem, gold visor.
IMAGE 3 — male SKILL: Völva Type-B: white and gold robe with gold armor pieces, shoulder-length black hair plates, gold circlet, gold visor.
IMAGE 4 — female SKILL: Völva Type-A: white and gold flowing robe, very long black hair plates, gold circlet with blue gem, gold visor.
```

## 5. Trickster

แนบ: `template_tpl_walk.png`, `5_trickster_m.png`, `5_trickster_f.png` • ติดตั้งเป็น `trickster_m/f` ท่า `attack` (ภาพ 1-2) และ `cast` (ภาพ 3-4)

```
Create 4 SEPARATE images (do not merge them). Attached: a blank sheet template and two character designs (male Type-B and female Type-A).
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair) but LEAVE OUT the weapon and the shield.
Draw each animation into the attached template, 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK), the action aimed toward the facing direction of that row. Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines.
NO weapon, NO shield, NO magic effects, NO glow, NO particles, NO motion lines. Instead of the weapon, the RIGHT fist grips a thin straight solid MAGENTA (#FF00FF) marker stick about as long as the forearm, held exactly like the weapon handle and pointing where the weapon would point. The same stick is in every frame of every direction (it only marks the weapon, the game draws the real weapon there).
ATTACK = quick stab (held like a dagger): 1 low crouch, stick pulled back at the hip; 2 fast forward stab toward the facing direction; 3 arm fully extended, body low and leaning in; 4 hop back to stance.
SKILL = spinning slash: 1 crouch and twist; 2 spin halfway, stick swung wide; 3 finish the spin with the stick slashing forward; 4 recover.
IMAGE 1 — male ATTACK: Loki's Trickster Type-B: dark purple stealth armor, short spiky crimson hair plates, violet visor.
IMAGE 2 — female ATTACK: Loki's Trickster Type-A: sleek dark purple stealth armor, crimson ponytail of cable hair, violet visor.
IMAGE 3 — male SKILL: Loki's Trickster Type-B: dark purple stealth armor, short spiky crimson hair plates, violet visor.
IMAGE 4 — female SKILL: Loki's Trickster Type-A: sleek dark purple stealth armor, crimson ponytail of cable hair, violet visor.
```

## 6. Berserker

แนบ: `template_tpl_walk.png`, `6_berserker_m.png`, `6_berserker_f.png` • ติดตั้งเป็น `berserker_m/f` ท่า `attack` (ภาพ 1-2) และ `cast` (ภาพ 3-4)

```
Create 4 SEPARATE images (do not merge them). Attached: a blank sheet template and two character designs (male Type-B and female Type-A).
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair) but LEAVE OUT the weapon and the shield.
Draw each animation into the attached template, 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK), the action aimed toward the facing direction of that row. Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines.
NO weapon, NO shield, NO magic effects, NO glow, NO particles, NO motion lines. Instead of the axe, BOTH fists grip a thin straight solid MAGENTA (#FF00FF) marker stick about as long as the forearm, held exactly like the axe handle and pointing where the axe head would point. The same stick is in every frame of every direction (it only marks the weapon, the game draws the real weapon there).
ATTACK = heavy TWO-HANDED chop (held like a big axe): 1 stick raised high over the head with BOTH hands; 2 huge downward chop in front; 3 stick low near the ground, body bent forward; 4 heave back up to stance.
SKILL = rage whirlwind: 1 wide stance, stick held back with both hands; 2 big horizontal swing; 3 swing continues around, body twisting; 4 recover.
IMAGE 1 — male ATTACK: Berserker Type-B: bulky bronze and brown armor, metal wolf-head hood, short spiky silver hair plates, orange visor.
IMAGE 2 — female ATTACK: Berserker Type-A: bronze and brown rugged armor, metal wolf-head hood, long wild silver hair plates, orange visor.
IMAGE 3 — male SKILL: Berserker Type-B: bulky bronze and brown armor, metal wolf-head hood, short spiky silver hair plates, orange visor.
IMAGE 4 — female SKILL: Berserker Type-A: bronze and brown rugged armor, metal wolf-head hood, long wild silver hair plates, orange visor.
```

