# ท่าเดิน Class 1 — 6 แชต (แชตละ 1 Class ทั้งชายและหญิง)

แต่ละแชต: แนบ `template_tpl_walk.png` + รูป Class นั้น 2 รูป (เช่น `1_einherjar_m.png` และ `1_einherjar_f.png`) แล้ววาง prompt • ได้ 2 ภาพ (ชาย, หญิง)
ถ้าได้มาภาพเดียว พิมพ์ `now draw IMAGE 2`

**วาดมือเปล่า (เจ้าของเลือก 2026-10-02):** ไม่มีอาวุธ/โล่ในภาพ — เกมวาดอาวุธที่สวมจริงให้ (ดู docs/PAPERDOLL.md)
มือขวากำ **แท่งสีชมพูบานเย็น (magenta)** ไว้เป็นตัวบอกตำแหน่ง/มุมมือ เครื่องมือจะลบแท่งนี้ออกเองตอนติดตั้ง
ถ้าภาพที่ได้ยังติดอาวุธมา หรือแท่งหายไปบางเฟรม ให้ตอบในแชตเดิมว่า
`Redraw: no weapon at all, only the magenta stick in the right hand in every frame`

ติดตั้ง: `python3 tools/sprite_std.py install <png> <class>_<m|f> walk --grid 4x5 --dirs S,SW,W,NW,N`
แล้ว `python3 tools/paperdoll.py --marker magenta <class>_m <class>_f`

## 1. Einherjar

แนบ: `template_tpl_walk.png`, `1_einherjar_m.png`, `1_einherjar_f.png`

```
Create 2 SEPARATE images (do not merge them). Attached: a blank walk-sheet template and two character designs (male Type-B and female Type-A).
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair) but LEAVE OUT the weapon and the shield.
Draw a WALK cycle into the attached template, 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. NO weapon, NO shield, NO bow: the RIGHT hand is a loose fist gripping a thin straight solid MAGENTA (#FF00FF) marker stick about as long as the forearm, pointing down and slightly forward like a carried sword; the same stick stays in the same hand in every frame and every direction (it only marks the hand position, the game draws the real weapon there). The LEFT hand is empty. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK). Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines.
IMAGE 1 — male: Einherjar Type-B: bulkier steel plate armor with red trim, crimson cape, horned helmet, red visor.
IMAGE 2 — female: Einherjar Type-A: heavy steel plate armor with red trim, crimson cape, horned helmet, red visor.
```

## 2. Runecaster

แนบ: `template_tpl_walk.png`, `2_runecaster_m.png`, `2_runecaster_f.png`

```
Create 2 SEPARATE images (do not merge them). Attached: a blank walk-sheet template and two character designs (male Type-B and female Type-A).
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair) but LEAVE OUT the weapon and the shield.
Draw a WALK cycle into the attached template, 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. NO weapon, NO shield, NO bow: the RIGHT hand is a loose fist gripping a thin straight solid MAGENTA (#FF00FF) marker stick about as long as the forearm, pointing down and slightly forward like a carried sword; the same stick stays in the same hand in every frame and every direction (it only marks the hand position, the game draws the real weapon there). The LEFT hand is empty. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK). Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines.
IMAGE 1 — male: Rune Caster Type-B: navy hooded coat with glowing runes, short blue hair plates, light-blue visor.
IMAGE 2 — female: Rune Caster Type-A: navy hooded coat with glowing blue runes, long deep blue hair plates, light-blue visor.
```

## 3. Wildhunter

แนบ: `template_tpl_walk.png`, `3_wildhunter_m.png`, `3_wildhunter_f.png`

```
Create 2 SEPARATE images (do not merge them). Attached: a blank walk-sheet template and two character designs (male Type-B and female Type-A).
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair) but LEAVE OUT the weapon and the shield.
Draw a WALK cycle into the attached template, 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. NO weapon, NO shield, NO bow: the RIGHT hand is a loose fist gripping a thin straight solid MAGENTA (#FF00FF) marker stick about as long as the forearm, pointing down and slightly forward like a carried sword; the same stick stays in the same hand in every frame and every direction (it only marks the hand position, the game draws the real weapon there). The LEFT hand is empty. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK). Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines.
IMAGE 1 — male: Wildhunter Type-B: forest green hooded cloak, short gold hair plates, quiver on the back, green visor.
IMAGE 2 — female: Wildhunter Type-A: forest green hooded cloak, gold braid hair plates, quiver on the back, green visor.
```

## 4. Volva

แนบ: `template_tpl_walk.png`, `4_volva_m.png`, `4_volva_f.png`

```
Create 2 SEPARATE images (do not merge them). Attached: a blank walk-sheet template and two character designs (male Type-B and female Type-A).
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair) but LEAVE OUT the weapon and the shield.
Draw a WALK cycle into the attached template, 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. NO weapon, NO shield, NO bow: the RIGHT hand is a loose fist gripping a thin straight solid MAGENTA (#FF00FF) marker stick about as long as the forearm, pointing down and slightly forward like a carried sword; the same stick stays in the same hand in every frame and every direction (it only marks the hand position, the game draws the real weapon there). The LEFT hand is empty. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK). Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines.
IMAGE 1 — male: Völva Type-B: white and gold robe with gold armor pieces, shoulder-length black hair plates, gold circlet, gold visor.
IMAGE 2 — female: Völva Type-A: white and gold flowing robe, very long black hair plates, gold circlet with blue gem, gold visor.
```

## 5. Trickster

แนบ: `template_tpl_walk.png`, `5_trickster_m.png`, `5_trickster_f.png`

```
Create 2 SEPARATE images (do not merge them). Attached: a blank walk-sheet template and two character designs (male Type-B and female Type-A).
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair) but LEAVE OUT the weapon and the shield.
Draw a WALK cycle into the attached template, 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. NO weapon, NO shield, NO bow: the RIGHT hand is a loose fist gripping a thin straight solid MAGENTA (#FF00FF) marker stick about as long as the forearm, pointing down and slightly forward like a carried sword; the same stick stays in the same hand in every frame and every direction (it only marks the hand position, the game draws the real weapon there). The LEFT hand is empty. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK). Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines.
IMAGE 1 — male: Loki's Trickster Type-B: dark purple stealth armor, short spiky crimson hair plates, violet visor.
IMAGE 2 — female: Loki's Trickster Type-A: sleek dark purple stealth armor, crimson ponytail of cable hair, violet visor.
```

## 6. Berserker

แนบ: `template_tpl_walk.png`, `6_berserker_m.png`, `6_berserker_f.png`

```
Create 2 SEPARATE images (do not merge them). Attached: a blank walk-sheet template and two character designs (male Type-B and female Type-A).
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair) but LEAVE OUT the weapon and the shield.
Draw a WALK cycle into the attached template, 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. NO weapon, NO shield, NO bow: the RIGHT hand is a loose fist gripping a thin straight solid MAGENTA (#FF00FF) marker stick about as long as the forearm, pointing down and slightly forward like a carried sword; the same stick stays in the same hand in every frame and every direction (it only marks the hand position, the game draws the real weapon there). The LEFT hand is empty. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK). Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines.
IMAGE 1 — male: Berserker Type-B: bulky bronze and brown armor, metal wolf-head hood, short spiky silver hair plates, orange visor.
IMAGE 2 — female: Berserker Type-A: bronze and brown rugged armor, metal wolf-head hood, long wild silver hair plates, orange visor.
```

## 7. Wildhunter — ท่ายิงธนู (ทีหลังได้ ใช้ตอนทำท่าโจมตี)

แนบ: `template_tpl_walk.png`, `3_wildhunter_m.png`, `3_wildhunter_f.png`

```
Create 2 SEPARATE images (do not merge them). Attached: a blank sheet template and two character designs (male Type-B and female Type-A).
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Chibi proportions, head about 1/3 of the body height, thick dark outline, 2-tone cel shading. Android characters: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Use the attached character images as the exact design (same colors, armor, hair) but LEAVE OUT the bow.
Draw a BOW SHOOTING animation into the attached template, 4 frames per direction: 1 ready stance, LEFT arm starts rising forward; 2 LEFT arm fully stretched toward the facing direction, RIGHT hand pulls back; 3 full draw: RIGHT hand at the chin, body turned sideways, steady; 4 release: RIGHT hand flies back open, small recoil. NO bow, NO arrow, NO string: instead the LEFT fist grips a short straight solid MAGENTA (#FF00FF) marker stick held VERTICALLY (where the bow grip would be), same stick in every frame. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK). Same character size in every frame, feet on the guide line. Flat white background, do NOT draw the labels, grid or guide lines.
IMAGE 1 — male: Wildhunter Type-B: forest green hooded cloak, short gold hair plates, quiver on the back, green visor.
IMAGE 2 — female: Wildhunter Type-A: forest green hooded cloak, gold braid hair plates, quiver on the back, green visor.
```

ติดตั้ง: `python3 tools/sprite_std.py install <png> wildhunter_<m|f> shoot --grid 4x5 --dirs S,SW,W,NW,N`
(Trickster ใช้ธนูได้ด้วย — ทำท่ายิงแบบเดียวกันทีหลังได้ ระหว่างนี้ยืนถือธนูนิ่ง ๆ ตอนยิง)
