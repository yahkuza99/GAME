# ภาพ Class 2 แบบถืออาวุธในภาพ — 12 แชต แชตละ 1 Class ได้ 6 ภาพ

แต่ละแชต แนบ 3 ไฟล์: `template_tpl_walk.png`, `<n>_<class>_m.png`, `<n>_<class>_f.png` แล้ววาง prompt
(รูป Class 2 เป็นภาพตัวสูงสมจริง → prompt สั่งให้แปลงเป็นตัวจิบิแบบเดียวกับ Class 1 และใช้อาวุธตามรูป)
ได้ 6 ภาพ: 1 ชาย-เดิน, 2 หญิง-เดิน, 3 ชาย-ตี, 4 หญิง-ตี, 5 ชาย-สกิล, 6 หญิง-สกิล • ไม่ครบ พิมพ์ `now draw IMAGE 2` (3–6)
ถ้าตัวไม่เป็นจิบิ: `Redraw as a cute chibi sprite, head about 1/3 of the body height, like the Class 1 sprites`
ถ้าอาวุธเพี้ยน: `Redraw: the weapon must look exactly like in the attached character image, same size, in every frame`

ติดตั้ง (ผมทำ): `sprite_std.py install <png> <class>_<m|f> walk|attack|cast --grid 4x5 --dirs S,SW,W,NW,N`

## 7. Valkyrie Knight (สาย einherjar)

แนบ: `template_tpl_walk.png`, `7_valkyrie_m.png`, `7_valkyrie_f.png` • ติดตั้ง: ภาพ 1-2 = `walk`, 3-4 = `attack`, 5-6 = `cast`

```
Create 6 SEPARATE images (do not merge them). Attached: a blank sheet template and two character designs (male and female) of the Valkyrie Knight class.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Convert the attached tall character designs into CHIBI proportions: head about 1/3 of the body height, short limbs, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Keep the exact colors, armor, hair and accessories of the attached designs.
WEAPON: a golden longsword in the RIGHT hand and a round golden sun shield on the LEFT arm (from the attached image). Keep the weapon the SAME size and design in every frame of every image. The hand grips it firmly; the weapon is correctly in front of or behind the body depending on the pose and direction.
Each image is drawn into the attached template: 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK), the action aimed toward the facing direction of that row. Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines. NO magic effects, NO slash trails, NO particles, NO motion lines (the game adds effects).
WALK: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Free arm swings opposite to the legs; sword carried low at the side, shield held in front of the body.
ATTACK: sword slash with shield guard: 1 shield forward, sword pulled back; 2 diagonal slash forward and down; 3 follow-through; 4 recover behind the shield.
SKILL: holy lance strike: 1 shield raised, sword pointed up to the sky; 2 step in; 3 powerful forward thrust; 4 recover.
IMAGE 1 — male WALK: Valkyrie Knight (male): white and gold winged armor, winged helmet, gold visor.
IMAGE 2 — female WALK: Valkyrie Knight (female): white and gold winged armor, long blonde hair plates, winged helmet, gold visor.
IMAGE 3 — male ATTACK: Valkyrie Knight (male): white and gold winged armor, winged helmet, gold visor.
IMAGE 4 — female ATTACK: Valkyrie Knight (female): white and gold winged armor, long blonde hair plates, winged helmet, gold visor.
IMAGE 5 — male SKILL: Valkyrie Knight (male): white and gold winged armor, winged helmet, gold visor.
IMAGE 6 — female SKILL: Valkyrie Knight (female): white and gold winged armor, long blonde hair plates, winged helmet, gold visor.
```

## 8. Hersir Vanguard (สาย einherjar)

แนบ: `template_tpl_walk.png`, `8_hersir_m.png`, `8_hersir_f.png` • ติดตั้ง: ภาพ 1-2 = `walk`, 3-4 = `attack`, 5-6 = `cast`

```
Create 6 SEPARATE images (do not merge them). Attached: a blank sheet template and two character designs (male and female) of the Hersir Vanguard class.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Convert the attached tall character designs into CHIBI proportions: head about 1/3 of the body height, short limbs, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Keep the exact colors, armor, hair and accessories of the attached designs.
WEAPON: a huge red glowing two-handed greatsword held with BOTH hands (from the attached image). Keep the weapon the SAME size and design in every frame of every image. The hand grips it firmly; the weapon is correctly in front of or behind the body depending on the pose and direction.
Each image is drawn into the attached template: 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK), the action aimed toward the facing direction of that row. Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines. NO magic effects, NO slash trails, NO particles, NO motion lines (the game adds effects).
WALK: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Free arm swings opposite to the legs; greatsword resting on the shoulder, blade behind the head.
ATTACK: heavy two-handed greatsword cleave: 1 sword raised high over the head; 2 huge downward cleave in front; 3 sword low near the ground; 4 heave back to stance.
SKILL: vanguard charge: 1 crouch with sword held back low; 2 dash forward; 3 wide horizontal sweep; 4 recover.
IMAGE 1 — male WALK: Hersir Vanguard (male): dark red heavy armor, torn crimson cape, red visor.
IMAGE 2 — female WALK: Hersir Vanguard (female): dark red heavy armor, crimson ponytail, torn crimson cape, red visor.
IMAGE 3 — male ATTACK: Hersir Vanguard (male): dark red heavy armor, torn crimson cape, red visor.
IMAGE 4 — female ATTACK: Hersir Vanguard (female): dark red heavy armor, crimson ponytail, torn crimson cape, red visor.
IMAGE 5 — male SKILL: Hersir Vanguard (male): dark red heavy armor, torn crimson cape, red visor.
IMAGE 6 — female SKILL: Hersir Vanguard (female): dark red heavy armor, crimson ponytail, torn crimson cape, red visor.
```

## 9. Galdr Sage (สาย runecaster)

แนบ: `template_tpl_walk.png`, `9_galdr_m.png`, `9_galdr_f.png` • ติดตั้ง: ภาพ 1-2 = `walk`, 3-4 = `attack`, 5-6 = `cast`

```
Create 6 SEPARATE images (do not merge them). Attached: a blank sheet template and two character designs (male and female) of the Galdr Sage class.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Convert the attached tall character designs into CHIBI proportions: head about 1/3 of the body height, short limbs, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Keep the exact colors, armor, hair and accessories of the attached designs.
WEAPON: a tall ice-crystal staff in the RIGHT hand (from the attached image). Keep the weapon the SAME size and design in every frame of every image. The hand grips it firmly; the weapon is correctly in front of or behind the body depending on the pose and direction.
Each image is drawn into the attached template: 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK), the action aimed toward the facing direction of that row. Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines. NO magic effects, NO slash trails, NO particles, NO motion lines (the game adds effects).
WALK: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Free arm swings opposite to the legs; staff carried upright like a walking stick.
ATTACK: staff strike: 1 staff drawn back; 2 quick forward thrust of the crystal head; 3 arm extended; 4 recover.
SKILL: rune chanting: 1 staff upright in front, free hand drawing a rune; 2 staff raised high; 3 both arms pushed forward; 4 recover.
IMAGE 1 — male WALK: Galdr Sage (male): light-blue and white rune robes, blue hair plates, blue visor.
IMAGE 2 — female WALK: Galdr Sage (female): light-blue and white rune robes, long blue hair plates, blue visor.
IMAGE 3 — male ATTACK: Galdr Sage (male): light-blue and white rune robes, blue hair plates, blue visor.
IMAGE 4 — female ATTACK: Galdr Sage (female): light-blue and white rune robes, long blue hair plates, blue visor.
IMAGE 5 — male SKILL: Galdr Sage (male): light-blue and white rune robes, blue hair plates, blue visor.
IMAGE 6 — female SKILL: Galdr Sage (female): light-blue and white rune robes, long blue hair plates, blue visor.
```

## 10. Seidr Witch (สาย runecaster)

แนบ: `template_tpl_walk.png`, `10_seidr_m.png`, `10_seidr_f.png` • ติดตั้ง: ภาพ 1-2 = `walk`, 3-4 = `attack`, 5-6 = `cast`

```
Create 6 SEPARATE images (do not merge them). Attached: a blank sheet template and two character designs (male and female) of the Seidr Witch class.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Convert the attached tall character designs into CHIBI proportions: head about 1/3 of the body height, short limbs, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Keep the exact colors, armor, hair and accessories of the attached designs.
WEAPON: a dark staff with a glowing purple ring orb in the RIGHT hand (from the attached image). Keep the weapon the SAME size and design in every frame of every image. The hand grips it firmly; the weapon is correctly in front of or behind the body depending on the pose and direction.
Each image is drawn into the attached template: 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK), the action aimed toward the facing direction of that row. Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines. NO magic effects, NO slash trails, NO particles, NO motion lines (the game adds effects).
WALK: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Free arm swings opposite to the legs; staff carried upright like a walking stick.
ATTACK: staff strike: 1 staff drawn back; 2 quick forward thrust of the orb; 3 arm extended; 4 recover.
SKILL: dark spell: 1 staff upright, free hand cupped at the chest; 2 staff raised high, body leaning back; 3 free hand thrust forward; 4 recover.
IMAGE 1 — male WALK: Seidr Witch (male): hooded dark purple witch robes, purple visor.
IMAGE 2 — female WALK: Seidr Witch (female): hooded dark purple witch robes, long dark hair plates, purple visor.
IMAGE 3 — male ATTACK: Seidr Witch (male): hooded dark purple witch robes, purple visor.
IMAGE 4 — female ATTACK: Seidr Witch (female): hooded dark purple witch robes, long dark hair plates, purple visor.
IMAGE 5 — male SKILL: Seidr Witch (male): hooded dark purple witch robes, purple visor.
IMAGE 6 — female SKILL: Seidr Witch (female): hooded dark purple witch robes, long dark hair plates, purple visor.
```

## 11. Skadi Ranger (สาย wildhunter)

แนบ: `template_tpl_walk.png`, `11_skadi_m.png`, `11_skadi_f.png` • ติดตั้ง: ภาพ 1-2 = `walk`, 3-4 = `shoot`, 5-6 = `cast`

```
Create 6 SEPARATE images (do not merge them). Attached: a blank sheet template and two character designs (male and female) of the Skadi Ranger class.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Convert the attached tall character designs into CHIBI proportions: head about 1/3 of the body height, short limbs, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Keep the exact colors, armor, hair and accessories of the attached designs.
WEAPON: an icy white-blue crystal bow held by the middle in the LEFT hand, quiver on the back (from the attached image). Keep the weapon the SAME size and design in every frame of every image. The hand grips it firmly; the weapon is correctly in front of or behind the body depending on the pose and direction.
Each image is drawn into the attached template: 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK), the action aimed toward the facing direction of that row. Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines. NO magic effects, NO slash trails, NO particles, NO motion lines (the game adds effects).
WALK: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Free arm swings opposite to the legs; bow carried vertically at the side in the left hand.
ATTACK: BOW SHOT: 1 ready, bow arm rising; 2 bow arm stretched toward the facing direction, right hand nocks and pulls; 3 full draw at the chin; 4 release, right hand flies back open, arrow gone.
SKILL: frost volley: 1 low crouch, bow forward; 2 bow aimed up high, full draw; 3 release upward; 4 recover.
IMAGE 1 — male WALK: Skadi Ranger (male): white and ice-blue hooded ranger armor, ice-blue visor.
IMAGE 2 — female WALK: Skadi Ranger (female): white and ice-blue hooded ranger armor, long white hair plates, ice-blue visor.
IMAGE 3 — male ATTACK: Skadi Ranger (male): white and ice-blue hooded ranger armor, ice-blue visor.
IMAGE 4 — female ATTACK: Skadi Ranger (female): white and ice-blue hooded ranger armor, long white hair plates, ice-blue visor.
IMAGE 5 — male SKILL: Skadi Ranger (male): white and ice-blue hooded ranger armor, ice-blue visor.
IMAGE 6 — female SKILL: Skadi Ranger (female): white and ice-blue hooded ranger armor, long white hair plates, ice-blue visor.
```

## 12. Ullr Sniper (สาย wildhunter)

แนบ: `template_tpl_walk.png`, `12_ullr_m.png`, `12_ullr_f.png` • ติดตั้ง: ภาพ 1-2 = `walk`, 3-4 = `shoot`, 5-6 = `cast`

```
Create 6 SEPARATE images (do not merge them). Attached: a blank sheet template and two character designs (male and female) of the Ullr Sniper class.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Convert the attached tall character designs into CHIBI proportions: head about 1/3 of the body height, short limbs, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Keep the exact colors, armor, hair and accessories of the attached designs.
WEAPON: a tall wooden longbow held by the middle in the LEFT hand, quiver on the back (from the attached image). Keep the weapon the SAME size and design in every frame of every image. The hand grips it firmly; the weapon is correctly in front of or behind the body depending on the pose and direction.
Each image is drawn into the attached template: 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK), the action aimed toward the facing direction of that row. Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines. NO magic effects, NO slash trails, NO particles, NO motion lines (the game adds effects).
WALK: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Free arm swings opposite to the legs; longbow carried vertically at the side in the left hand.
ATTACK: BOW SHOT: 1 ready, bow arm rising; 2 bow arm stretched toward the facing direction, right hand nocks and pulls; 3 full draw at the chin; 4 release, right hand flies back open, arrow gone.
SKILL: sniper shot: 1 kneel on one knee; 2 slow full draw, steady aim; 3 release; 4 stand up.
IMAGE 1 — male WALK: Ullr Sniper (male): green leafy ghillie cloak over light armor, green visor.
IMAGE 2 — female WALK: Ullr Sniper (female): green leafy ghillie cloak over light armor, green visor.
IMAGE 3 — male ATTACK: Ullr Sniper (male): green leafy ghillie cloak over light armor, green visor.
IMAGE 4 — female ATTACK: Ullr Sniper (female): green leafy ghillie cloak over light armor, green visor.
IMAGE 5 — male SKILL: Ullr Sniper (male): green leafy ghillie cloak over light armor, green visor.
IMAGE 6 — female SKILL: Ullr Sniper (female): green leafy ghillie cloak over light armor, green visor.
```

## 13. Norn Oracle (สาย volva)

แนบ: `template_tpl_walk.png`, `13_norn_m.png`, `13_norn_f.png` • ติดตั้ง: ภาพ 1-2 = `walk`, 3-4 = `attack`, 5-6 = `cast`

```
Create 6 SEPARATE images (do not merge them). Attached: a blank sheet template and two character designs (male and female) of the Norn Oracle class.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Convert the attached tall character designs into CHIBI proportions: head about 1/3 of the body height, short limbs, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Keep the exact colors, armor, hair and accessories of the attached designs.
WEAPON: a tall golden scepter-staff in the RIGHT hand (from the attached image). Keep the weapon the SAME size and design in every frame of every image. The hand grips it firmly; the weapon is correctly in front of or behind the body depending on the pose and direction.
Each image is drawn into the attached template: 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK), the action aimed toward the facing direction of that row. Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines. NO magic effects, NO slash trails, NO particles, NO motion lines (the game adds effects).
WALK: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Free arm swings opposite to the legs; staff carried upright like a walking stick.
ATTACK: staff smash: 1 staff raised beside the head; 2 downward smash in front; 3 follow-through low; 4 recover.
SKILL: fate weaving: 1 staff upright, free hand weaving in the air; 2 staff raised high; 3 arms spread open; 4 recover.
IMAGE 1 — male WALK: Norn Oracle (male): flowing white and lilac oracle robes, gold accents, gold visor.
IMAGE 2 — female WALK: Norn Oracle (female): flowing white and lilac oracle robes, very long silver hair plates, gold visor.
IMAGE 3 — male ATTACK: Norn Oracle (male): flowing white and lilac oracle robes, gold accents, gold visor.
IMAGE 4 — female ATTACK: Norn Oracle (female): flowing white and lilac oracle robes, very long silver hair plates, gold visor.
IMAGE 5 — male SKILL: Norn Oracle (male): flowing white and lilac oracle robes, gold accents, gold visor.
IMAGE 6 — female SKILL: Norn Oracle (female): flowing white and lilac oracle robes, very long silver hair plates, gold visor.
```

## 14. Gythja Monk (สาย volva)

แนบ: `template_tpl_walk.png`, `14_gythja_m.png`, `14_gythja_f.png` • ติดตั้ง: ภาพ 1-2 = `walk`, 3-4 = `attack`, 5-6 = `cast`

```
Create 6 SEPARATE images (do not merge them). Attached: a blank sheet template and two character designs (male and female) of the Gythja Monk class.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Convert the attached tall character designs into CHIBI proportions: head about 1/3 of the body height, short limbs, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Keep the exact colors, armor, hair and accessories of the attached designs.
WEAPON: big golden glowing gauntlet fists on BOTH hands (no held weapon, from the attached image). Keep the weapon the SAME size and design in every frame of every image. The hand grips it firmly; the weapon is correctly in front of or behind the body depending on the pose and direction.
Each image is drawn into the attached template: 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK), the action aimed toward the facing direction of that row. Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines. NO magic effects, NO slash trails, NO particles, NO motion lines (the game adds effects).
WALK: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Free arm swings opposite to the legs; fists clenched, arms swinging.
ATTACK: one-two punch combo: 1 fighting stance, fists up; 2 fast right straight punch toward the facing direction; 3 left hook; 4 back to stance.
SKILL: holy palm strike: 1 deep stance, both fists pulled to the hip; 2 step forward; 3 both palms thrust forward together; 4 recover.
IMAGE 1 — male WALK: Gythja Monk (male): golden monk robes with sash, gold visor.
IMAGE 2 — female WALK: Gythja Monk (female): golden monk robes with sash, long brown braid hair plates, gold visor.
IMAGE 3 — male ATTACK: Gythja Monk (male): golden monk robes with sash, gold visor.
IMAGE 4 — female ATTACK: Gythja Monk (female): golden monk robes with sash, long brown braid hair plates, gold visor.
IMAGE 5 — male SKILL: Gythja Monk (male): golden monk robes with sash, gold visor.
IMAGE 6 — female SKILL: Gythja Monk (female): golden monk robes with sash, long brown braid hair plates, gold visor.
```

## 15. Loki's Phantom (สาย trickster)

แนบ: `template_tpl_walk.png`, `15_phantom_m.png`, `15_phantom_f.png` • ติดตั้ง: ภาพ 1-2 = `walk`, 3-4 = `attack`, 5-6 = `cast`

```
Create 6 SEPARATE images (do not merge them). Attached: a blank sheet template and two character designs (male and female) of the Loki's Phantom class.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Convert the attached tall character designs into CHIBI proportions: head about 1/3 of the body height, short limbs, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Keep the exact colors, armor, hair and accessories of the attached designs.
WEAPON: twin glowing magenta claw-blades, one in EACH hand (from the attached image). Keep the weapon the SAME size and design in every frame of every image. The hand grips it firmly; the weapon is correctly in front of or behind the body depending on the pose and direction.
Each image is drawn into the attached template: 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK), the action aimed toward the facing direction of that row. Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines. NO magic effects, NO slash trails, NO particles, NO motion lines (the game adds effects).
WALK: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Free arm swings opposite to the legs; blades held low in both hands, ready to strike.
ATTACK: twin blade flurry: 1 crouch, blades crossed; 2 right blade slash forward; 3 left blade slash forward; 4 hop back.
SKILL: shadow strike: 1 low crouch; 2 lunge far forward; 3 X-cross slash with both blades; 4 recover.
IMAGE 1 — male WALK: Loki's Phantom (male): dark crimson-purple stealth armor with flowing purple scarf, magenta visor.
IMAGE 2 — female WALK: Loki's Phantom (female): dark crimson-purple stealth armor, long crimson ponytail, magenta visor.
IMAGE 3 — male ATTACK: Loki's Phantom (male): dark crimson-purple stealth armor with flowing purple scarf, magenta visor.
IMAGE 4 — female ATTACK: Loki's Phantom (female): dark crimson-purple stealth armor, long crimson ponytail, magenta visor.
IMAGE 5 — male SKILL: Loki's Phantom (male): dark crimson-purple stealth armor with flowing purple scarf, magenta visor.
IMAGE 6 — female SKILL: Loki's Phantom (female): dark crimson-purple stealth armor, long crimson ponytail, magenta visor.
```

## 16. Skald Bard (สาย trickster)

แนบ: `template_tpl_walk.png`, `16_skald_m.png`, `16_skald_f.png` • ติดตั้ง: ภาพ 1-2 = `walk`, 3-4 = `attack`, 5-6 = `cast`

```
Create 6 SEPARATE images (do not merge them). Attached: a blank sheet template and two character designs (male and female) of the Skald Bard class.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Convert the attached tall character designs into CHIBI proportions: head about 1/3 of the body height, short limbs, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Keep the exact colors, armor, hair and accessories of the attached designs.
WEAPON: a blue-gold harp / lyre in the LEFT hand (from the attached image). Keep the weapon the SAME size and design in every frame of every image. The hand grips it firmly; the weapon is correctly in front of or behind the body depending on the pose and direction.
Each image is drawn into the attached template: 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK), the action aimed toward the facing direction of that row. Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines. NO magic effects, NO slash trails, NO particles, NO motion lines (the game adds effects).
WALK: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Free arm swings opposite to the legs; harp held at the side, right hand free.
ATTACK: harp bash: 1 harp swung back; 2 quick swing of the harp toward the facing direction; 3 follow-through; 4 recover.
SKILL: war song: 1 harp held up in front, right hand on the strings; 2 strumming, body swaying; 3 harp raised high, chest lifted; 4 recover.
IMAGE 1 — male WALK: Skald Bard (male): blue and silver bard armor, blue visor.
IMAGE 2 — female WALK: Skald Bard (female): blue and silver bard armor, long blue hair plates, blue visor.
IMAGE 3 — male ATTACK: Skald Bard (male): blue and silver bard armor, blue visor.
IMAGE 4 — female ATTACK: Skald Bard (female): blue and silver bard armor, long blue hair plates, blue visor.
IMAGE 5 — male SKILL: Skald Bard (male): blue and silver bard armor, blue visor.
IMAGE 6 — female SKILL: Skald Bard (female): blue and silver bard armor, long blue hair plates, blue visor.
```

## 17. Ulfhednar Warlord (สาย berserker)

แนบ: `template_tpl_walk.png`, `17_warlord_m.png`, `17_warlord_f.png` • ติดตั้ง: ภาพ 1-2 = `walk`, 3-4 = `attack`, 5-6 = `cast`

```
Create 6 SEPARATE images (do not merge them). Attached: a blank sheet template and two character designs (male and female) of the Ulfhednar Warlord class.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Convert the attached tall character designs into CHIBI proportions: head about 1/3 of the body height, short limbs, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Keep the exact colors, armor, hair and accessories of the attached designs.
WEAPON: a huge two-handed fire axe held with BOTH hands on the long handle (from the attached image). Keep the weapon the SAME size and design in every frame of every image. The hand grips it firmly; the weapon is correctly in front of or behind the body depending on the pose and direction.
Each image is drawn into the attached template: 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK), the action aimed toward the facing direction of that row. Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines. NO magic effects, NO slash trails, NO particles, NO motion lines (the game adds effects).
WALK: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Free arm swings opposite to the legs; axe resting on the shoulder, blade behind the head, never dragging.
ATTACK: heavy two-handed chop: 1 axe raised high over the head; 2 huge downward chop in front; 3 axe low near the ground; 4 heave back up.
SKILL: war cry whirlwind: 1 wide stance, axe held back; 2 big horizontal swing; 3 swing continues around; 4 recover.
IMAGE 1 — male WALK: Ulfhednar Warlord (male): red-orange fur-trimmed wolf warlord armor, wolf hood, orange visor.
IMAGE 2 — female WALK: Ulfhednar Warlord (female): red-orange fur-trimmed wolf warlord armor, wolf hood, wild long hair plates, orange visor.
IMAGE 3 — male ATTACK: Ulfhednar Warlord (male): red-orange fur-trimmed wolf warlord armor, wolf hood, orange visor.
IMAGE 4 — female ATTACK: Ulfhednar Warlord (female): red-orange fur-trimmed wolf warlord armor, wolf hood, wild long hair plates, orange visor.
IMAGE 5 — male SKILL: Ulfhednar Warlord (male): red-orange fur-trimmed wolf warlord armor, wolf hood, orange visor.
IMAGE 6 — female SKILL: Ulfhednar Warlord (female): red-orange fur-trimmed wolf warlord armor, wolf hood, wild long hair plates, orange visor.
```

## 18. Jotun Breaker (สาย berserker)

แนบ: `template_tpl_walk.png`, `18_jotun_m.png`, `18_jotun_f.png` • ติดตั้ง: ภาพ 1-2 = `walk`, 3-4 = `attack`, 5-6 = `cast`

```
Create 6 SEPARATE images (do not merge them). Attached: a blank sheet template and two character designs (male and female) of the Jotun Breaker class.
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Convert the attached tall character designs into CHIBI proportions: head about 1/3 of the body height, short limbs, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Keep the exact colors, armor, hair and accessories of the attached designs.
WEAPON: a huge ice-grey war hammer held with BOTH hands, big gauntlets (from the attached image). Keep the weapon the SAME size and design in every frame of every image. The hand grips it firmly; the weapon is correctly in front of or behind the body depending on the pose and direction.
Each image is drawn into the attached template: 4 frames per direction, each row a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK), the action aimed toward the facing direction of that row. Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines. NO magic effects, NO slash trails, NO particles, NO motion lines (the game adds effects).
WALK: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Free arm swings opposite to the legs; hammer resting on the shoulder, head behind the shoulder, never dragging.
ATTACK: giant hammer smash: 1 hammer raised high over the head; 2 huge downward smash into the ground in front; 3 hammer head on the ground, body bent; 4 heave back up.
SKILL: ground quake: 1 hammer held high with both hands, wide stance; 2 jump slightly; 3 slam the hammer down; 4 recover.
IMAGE 1 — male WALK: Jotun Breaker (male): massive grey stone-and-steel giant armor, frost accents, ice-blue visor.
IMAGE 2 — female WALK: Jotun Breaker (female): massive grey stone-and-steel giant armor, frost accents, ice-blue visor.
IMAGE 3 — male ATTACK: Jotun Breaker (male): massive grey stone-and-steel giant armor, frost accents, ice-blue visor.
IMAGE 4 — female ATTACK: Jotun Breaker (female): massive grey stone-and-steel giant armor, frost accents, ice-blue visor.
IMAGE 5 — male SKILL: Jotun Breaker (male): massive grey stone-and-steel giant armor, frost accents, ice-blue visor.
IMAGE 6 — female SKILL: Jotun Breaker (female): massive grey stone-and-steel giant armor, frost accents, ice-blue visor.
```

