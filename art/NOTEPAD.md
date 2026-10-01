# 📝 Prompt Notepad — ภาพที่ยังขาดทั้งหมด

สร้างอัตโนมัติด้วย `python3 tools/make_notepad.py` (ดูว่าอะไรมีแล้วจาก assets) • ✅ = ติดตั้งแล้ว • ⬜ = ยังขาด

**ยังขาด: ตัวละคร 78 ภาพ • มอนสเตอร์ 6 ภาพ • NPC 1 ภาพ**

## วิธีใช้

1. ตัวละคร 1 ตัว = แชต ChatGPT 1 ห้อง สั่ง **ภาพเดินก่อนเสมอ** (แนบรูปอ้างอิงในตาราง + เทมเพลต)
2. ภาพต่อ ๆ ไป แนบ **ภาพเดินที่ได้** + เทมเพลตของท่านั้น แล้ววาง prompt
3. มอนสเตอร์ 1 ตัว = 1 ภาพ แนบรูปมอนเดิม (`assets/mobsprite_*.webp`) + `art/tpl_mob.png`
4. ส่งภาพมาได้เลย ผมวัดขนาด ตัดเฟรม ทำทิศขวา และติดตั้งให้เอง

## แบบแชต (วางครั้งเดียวต่อแชต แล้วพิมพ์ next)

### Novice ชาย (Type-B) — 6 ภาพ

แชตใหม่ • แนบ hero_novice_m.webp + tpl_walk.png • จากนั้นพิมพ์ next + แนบเทมเพลตของภาพถัดไป (tpl_idle.png, tpl_attack.png, tpl_cast.png, tpl_sit_hurt.png, tpl_dead.png)

```
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Every character is an ANDROID: smooth white faceplate with ONE glowing visor strip, NO eyes, NO mouth. Chibi proportions (head about 1/3 of the body height), thick dark outline, 2-tone cel shading, modest outfit.
Character: male android NOVICE: spiky silver hair plates, cyan visor, olive field jacket with a red cross shoulder patch, brown belt with pouches, white armored legs, short cyan energy dagger in the right hand.

RULES FOR EVERY IMAGE: follow the template I attach with each image (rows = directions FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK; columns = frames). Standing poses: top of the head on the blue line, feet on the red line. Same character, same size, same colors in every image — after IMAGE 1, the walk sheet you drew is the reference. Leave clear space between characters so they never touch. Draw the character ONLY: no effects, no glow auras, no slash arcs, no motion lines (the game adds effects). Flat white background. Do NOT draw the labels, grid or guide lines.

I will ask for ONE image at a time and attach its template. After each image, wait until I type "next".

IMAGE 1 — WALK (template tpl_walk.png): 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK).
IMAGE 2 — IDLE (template tpl_idle.png): IDLE standing pose, 4 frames per direction. Stands still with BOTH FEET TOGETHER side by side, both soles flat on the red line, legs straight, knees together, weapon held relaxed. Frames: 1 neutral, 2 breathe in (shoulders a tiny bit higher), 3 neutral, 4 breathe out. The legs and feet must NOT move between frames. Each row is a direction as labelled.
IMAGE 3 — ATTACK (template tpl_attack.png): ATTACK, 6 frames per direction: 1 ready, 2 pull back (dagger arm drawn far back), 3 lunge forward, 4 full SLASH, arm fully extended, 5 follow-through, 6 back to ready. Draw the character ONLY: no slash arcs, no motion lines, no effects (the game adds them). Each row is a direction as labelled.
IMAGE 4 — SKILL POSE (template tpl_cast.png): SKILL pose (one pose used for every skill), 4 frames per direction: 1 ready, 2 gathering power, 3 release, 4 hold the final pose. The pose: free hand raised forward, palm open. Draw the character ONLY: no magic circles, no glow, no aura, no smoke, no effects (the game adds skill effects separately). Each row is a direction as labelled.
IMAGE 5 — SIT + HURT (template tpl_sit_hurt.png): Columns 1-2 SIT: sitting on the ground with legs folded, resting, bottom on the red line (the head is naturally BELOW the blue line when sitting). The 2 sit frames are almost identical (calm breathing only).
Columns 3-4 HURT (standing): 3 knocked back, body leaning away, visor flickers bright; 4 recovering back into stance. Hurt frames: top of the head on the blue line, feet on the red line.
Each row is a direction as labelled. Same character size as the walk sheet.
IMAGE 6 — DEAD (template tpl_dead.png): DEAD, 4 frames per direction: 1 knees buckle, 2 falling to the ground, 3 lying FLAT on the ground (whole body resting on the red line, seen from the game's high 3/4 camera), 4 lying still with the visor dark (turned off). Only frame 1 reaches up toward the blue line; frames 2-4 are low on the red line. Each row is a direction as labelled. Same character size as the walk sheet.

Start now with IMAGE 1.
```

### Einherjar หญิง (นักรบวิญญาณ) — 6 ภาพ

แชตใหม่ • แนบ hero_einherjar_f.webp + tpl_walk.png • จากนั้นพิมพ์ next + แนบเทมเพลตของภาพถัดไป (tpl_idle.png, tpl_attack.png, tpl_cast.png, tpl_sit_hurt.png, tpl_dead.png)

```
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Every character is an ANDROID: smooth white faceplate with ONE glowing visor strip, NO eyes, NO mouth. Chibi proportions (head about 1/3 of the body height), thick dark outline, 2-tone cel shading, modest outfit.
Character: female android EINHERJAR knight: long silver-white hair, small silver winged helmet, red visor, silver plate armor with red trim, red cape, round silver shield with a gold star on the left arm, glowing red longsword in the right hand.

RULES FOR EVERY IMAGE: follow the template I attach with each image (rows = directions FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK; columns = frames). Standing poses: top of the head on the blue line, feet on the red line. Same character, same size, same colors in every image — after IMAGE 1, the walk sheet you drew is the reference. Leave clear space between characters so they never touch. Draw the character ONLY: no effects, no glow auras, no slash arcs, no motion lines (the game adds effects). Flat white background. Do NOT draw the labels, grid or guide lines.

I will ask for ONE image at a time and attach its template. After each image, wait until I type "next".

IMAGE 1 — WALK (template tpl_walk.png): 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK).
IMAGE 2 — IDLE (template tpl_idle.png): IDLE standing pose, 4 frames per direction. Stands still with BOTH FEET TOGETHER side by side, both soles flat on the red line, legs straight, knees together, weapon held relaxed. Frames: 1 neutral, 2 breathe in (shoulders a tiny bit higher), 3 neutral, 4 breathe out. The legs and feet must NOT move between frames. Each row is a direction as labelled.
IMAGE 3 — ATTACK (template tpl_attack.png): ATTACK, 6 frames per direction: 1 ready behind the shield, 2 pull back with the sword raised high, 3 step in, 4 full overhead SLASH, sword low in front, 5 follow-through low, 6 back to ready. Draw the character ONLY: no slash arcs, no motion lines, no effects (the game adds them). Each row is a direction as labelled.
IMAGE 4 — SKILL POSE (template tpl_cast.png): SKILL pose (one pose used for every skill), 4 frames per direction: 1 ready, 2 gathering power, 3 release, 4 hold the final pose. The pose: shield raised and sword held up to the sky. Draw the character ONLY: no magic circles, no glow, no aura, no smoke, no effects (the game adds skill effects separately). Each row is a direction as labelled.
IMAGE 5 — SIT + HURT (template tpl_sit_hurt.png): Columns 1-2 SIT: sitting on the ground with legs folded, resting, bottom on the red line (the head is naturally BELOW the blue line when sitting). The 2 sit frames are almost identical (calm breathing only).
Columns 3-4 HURT (standing): 3 knocked back, body leaning away, visor flickers bright; 4 recovering back into stance. Hurt frames: top of the head on the blue line, feet on the red line.
Each row is a direction as labelled. Same character size as the walk sheet.
IMAGE 6 — DEAD (template tpl_dead.png): DEAD, 4 frames per direction: 1 knees buckle, 2 falling to the ground, 3 lying FLAT on the ground (whole body resting on the red line, seen from the game's high 3/4 camera), 4 lying still with the visor dark (turned off). Only frame 1 reaches up toward the blue line; frames 2-4 are low on the red line. Each row is a direction as labelled. Same character size as the walk sheet.

Start now with IMAGE 1.
```

### Einherjar ชาย (นักรบวิญญาณ) — 6 ภาพ

แชตใหม่ • แนบ hero_einherjar_m.webp + tpl_walk.png • จากนั้นพิมพ์ next + แนบเทมเพลตของภาพถัดไป (tpl_idle.png, tpl_attack.png, tpl_cast.png, tpl_sit_hurt.png, tpl_dead.png)

```
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Every character is an ANDROID: smooth white faceplate with ONE glowing visor strip, NO eyes, NO mouth. Chibi proportions (head about 1/3 of the body height), thick dark outline, 2-tone cel shading, modest outfit.
Character: male android EINHERJAR knight: full helm with curved horns, red visor, bulky silver plate armor with red trim, red cape, round silver shield with a gold star, glowing red longsword.

RULES FOR EVERY IMAGE: follow the template I attach with each image (rows = directions FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK; columns = frames). Standing poses: top of the head on the blue line, feet on the red line. Same character, same size, same colors in every image — after IMAGE 1, the walk sheet you drew is the reference. Leave clear space between characters so they never touch. Draw the character ONLY: no effects, no glow auras, no slash arcs, no motion lines (the game adds effects). Flat white background. Do NOT draw the labels, grid or guide lines.

I will ask for ONE image at a time and attach its template. After each image, wait until I type "next".

IMAGE 1 — WALK (template tpl_walk.png): 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK).
IMAGE 2 — IDLE (template tpl_idle.png): IDLE standing pose, 4 frames per direction. Stands still with BOTH FEET TOGETHER side by side, both soles flat on the red line, legs straight, knees together, weapon held relaxed. Frames: 1 neutral, 2 breathe in (shoulders a tiny bit higher), 3 neutral, 4 breathe out. The legs and feet must NOT move between frames. Each row is a direction as labelled.
IMAGE 3 — ATTACK (template tpl_attack.png): ATTACK, 6 frames per direction: 1 ready behind the shield, 2 pull back with the sword raised high, 3 step in, 4 full overhead SLASH, sword low in front, 5 follow-through low, 6 back to ready. Draw the character ONLY: no slash arcs, no motion lines, no effects (the game adds them). Each row is a direction as labelled.
IMAGE 4 — SKILL POSE (template tpl_cast.png): SKILL pose (one pose used for every skill), 4 frames per direction: 1 ready, 2 gathering power, 3 release, 4 hold the final pose. The pose: shield raised and sword held up to the sky. Draw the character ONLY: no magic circles, no glow, no aura, no smoke, no effects (the game adds skill effects separately). Each row is a direction as labelled.
IMAGE 5 — SIT + HURT (template tpl_sit_hurt.png): Columns 1-2 SIT: sitting on the ground with legs folded, resting, bottom on the red line (the head is naturally BELOW the blue line when sitting). The 2 sit frames are almost identical (calm breathing only).
Columns 3-4 HURT (standing): 3 knocked back, body leaning away, visor flickers bright; 4 recovering back into stance. Hurt frames: top of the head on the blue line, feet on the red line.
Each row is a direction as labelled. Same character size as the walk sheet.
IMAGE 6 — DEAD (template tpl_dead.png): DEAD, 4 frames per direction: 1 knees buckle, 2 falling to the ground, 3 lying FLAT on the ground (whole body resting on the red line, seen from the game's high 3/4 camera), 4 lying still with the visor dark (turned off). Only frame 1 reaches up toward the blue line; frames 2-4 are low on the red line. Each row is a direction as labelled. Same character size as the walk sheet.

Start now with IMAGE 1.
```

### Rune Caster หญิง (นักเวทรูน) — 6 ภาพ

แชตใหม่ • แนบ hero_runecaster_f.webp + tpl_walk.png • จากนั้นพิมพ์ next + แนบเทมเพลตของภาพถัดไป (tpl_idle.png, tpl_attack.png, tpl_cast.png, tpl_sit_hurt.png, tpl_dead.png)

```
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Every character is an ANDROID: smooth white faceplate with ONE glowing visor strip, NO eyes, NO mouth. Chibi proportions (head about 1/3 of the body height), thick dark outline, 2-tone cel shading, modest outfit.
Character: female android RUNE CASTER mage: long deep-blue hair, deep blue hooded robe with glowing cyan rune patterns, cyan visor, white armored body under the robe, tall staff topped with a glowing blue orb and floating crystals.

RULES FOR EVERY IMAGE: follow the template I attach with each image (rows = directions FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK; columns = frames). Standing poses: top of the head on the blue line, feet on the red line. Same character, same size, same colors in every image — after IMAGE 1, the walk sheet you drew is the reference. Leave clear space between characters so they never touch. Draw the character ONLY: no effects, no glow auras, no slash arcs, no motion lines (the game adds effects). Flat white background. Do NOT draw the labels, grid or guide lines.

I will ask for ONE image at a time and attach its template. After each image, wait until I type "next".

IMAGE 1 — WALK (template tpl_walk.png): 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK).
IMAGE 2 — IDLE (template tpl_idle.png): IDLE standing pose, 4 frames per direction. Stands still with BOTH FEET TOGETHER side by side, both soles flat on the red line, legs straight, knees together, weapon held relaxed. Frames: 1 neutral, 2 breathe in (shoulders a tiny bit higher), 3 neutral, 4 breathe out. The legs and feet must NOT move between frames. Each row is a direction as labelled.
IMAGE 3 — ATTACK (template tpl_attack.png): ATTACK, 6 frames per direction: 1 ready holding the staff, 2 staff pulled back, 3 step in swinging, 4 staff HIT, arms fully extended, 5 follow-through, 6 back to ready. Draw the character ONLY: no slash arcs, no motion lines, no effects (the game adds them). Each row is a direction as labelled.
IMAGE 4 — SKILL POSE (template tpl_cast.png): SKILL pose (one pose used for every skill), 4 frames per direction: 1 ready, 2 gathering power, 3 release, 4 hold the final pose. The pose: staff thrust forward with both hands. Draw the character ONLY: no magic circles, no glow, no aura, no smoke, no effects (the game adds skill effects separately). Each row is a direction as labelled.
IMAGE 5 — SIT + HURT (template tpl_sit_hurt.png): Columns 1-2 SIT: sitting on the ground with legs folded, resting, bottom on the red line (the head is naturally BELOW the blue line when sitting). The 2 sit frames are almost identical (calm breathing only).
Columns 3-4 HURT (standing): 3 knocked back, body leaning away, visor flickers bright; 4 recovering back into stance. Hurt frames: top of the head on the blue line, feet on the red line.
Each row is a direction as labelled. Same character size as the walk sheet.
IMAGE 6 — DEAD (template tpl_dead.png): DEAD, 4 frames per direction: 1 knees buckle, 2 falling to the ground, 3 lying FLAT on the ground (whole body resting on the red line, seen from the game's high 3/4 camera), 4 lying still with the visor dark (turned off). Only frame 1 reaches up toward the blue line; frames 2-4 are low on the red line. Each row is a direction as labelled. Same character size as the walk sheet.

Start now with IMAGE 1.
```

### Rune Caster ชาย (นักเวทรูน) — 6 ภาพ

แชตใหม่ • แนบ hero_runecaster_m.webp + tpl_walk.png • จากนั้นพิมพ์ next + แนบเทมเพลตของภาพถัดไป (tpl_idle.png, tpl_attack.png, tpl_cast.png, tpl_sit_hurt.png, tpl_dead.png)

```
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Every character is an ANDROID: smooth white faceplate with ONE glowing visor strip, NO eyes, NO mouth. Chibi proportions (head about 1/3 of the body height), thick dark outline, 2-tone cel shading, modest outfit.
Character: male android RUNE CASTER mage: short blue hair under a deep blue hooded robe with glowing cyan rune patterns, cyan visor, tall staff topped with a glowing blue orb.

RULES FOR EVERY IMAGE: follow the template I attach with each image (rows = directions FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK; columns = frames). Standing poses: top of the head on the blue line, feet on the red line. Same character, same size, same colors in every image — after IMAGE 1, the walk sheet you drew is the reference. Leave clear space between characters so they never touch. Draw the character ONLY: no effects, no glow auras, no slash arcs, no motion lines (the game adds effects). Flat white background. Do NOT draw the labels, grid or guide lines.

I will ask for ONE image at a time and attach its template. After each image, wait until I type "next".

IMAGE 1 — WALK (template tpl_walk.png): 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK).
IMAGE 2 — IDLE (template tpl_idle.png): IDLE standing pose, 4 frames per direction. Stands still with BOTH FEET TOGETHER side by side, both soles flat on the red line, legs straight, knees together, weapon held relaxed. Frames: 1 neutral, 2 breathe in (shoulders a tiny bit higher), 3 neutral, 4 breathe out. The legs and feet must NOT move between frames. Each row is a direction as labelled.
IMAGE 3 — ATTACK (template tpl_attack.png): ATTACK, 6 frames per direction: 1 ready holding the staff, 2 staff pulled back, 3 step in swinging, 4 staff HIT, arms fully extended, 5 follow-through, 6 back to ready. Draw the character ONLY: no slash arcs, no motion lines, no effects (the game adds them). Each row is a direction as labelled.
IMAGE 4 — SKILL POSE (template tpl_cast.png): SKILL pose (one pose used for every skill), 4 frames per direction: 1 ready, 2 gathering power, 3 release, 4 hold the final pose. The pose: staff thrust forward with both hands. Draw the character ONLY: no magic circles, no glow, no aura, no smoke, no effects (the game adds skill effects separately). Each row is a direction as labelled.
IMAGE 5 — SIT + HURT (template tpl_sit_hurt.png): Columns 1-2 SIT: sitting on the ground with legs folded, resting, bottom on the red line (the head is naturally BELOW the blue line when sitting). The 2 sit frames are almost identical (calm breathing only).
Columns 3-4 HURT (standing): 3 knocked back, body leaning away, visor flickers bright; 4 recovering back into stance. Hurt frames: top of the head on the blue line, feet on the red line.
Each row is a direction as labelled. Same character size as the walk sheet.
IMAGE 6 — DEAD (template tpl_dead.png): DEAD, 4 frames per direction: 1 knees buckle, 2 falling to the ground, 3 lying FLAT on the ground (whole body resting on the red line, seen from the game's high 3/4 camera), 4 lying still with the visor dark (turned off). Only frame 1 reaches up toward the blue line; frames 2-4 are low on the red line. Each row is a direction as labelled. Same character size as the walk sheet.

Start now with IMAGE 1.
```

### Wildhunter หญิง (นักล่า) — 6 ภาพ

แชตใหม่ • แนบ hero_wildhunter_f.webp + tpl_walk.png • จากนั้นพิมพ์ next + แนบเทมเพลตของภาพถัดไป (tpl_idle.png, tpl_attack.png, tpl_cast.png, tpl_sit_hurt.png, tpl_dead.png)

```
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Every character is an ANDROID: smooth white faceplate with ONE glowing visor strip, NO eyes, NO mouth. Chibi proportions (head about 1/3 of the body height), thick dark outline, 2-tone cel shading, modest outfit.
Character: female android WILDHUNTER archer: long blonde braid, green hooded cloak, green visor, white armor with brown leather straps, quiver of green-fletched arrows on the back, curved wood-and-gold recurve bow with a glowing green string.

RULES FOR EVERY IMAGE: follow the template I attach with each image (rows = directions FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK; columns = frames). Standing poses: top of the head on the blue line, feet on the red line. Same character, same size, same colors in every image — after IMAGE 1, the walk sheet you drew is the reference. Leave clear space between characters so they never touch. Draw the character ONLY: no effects, no glow auras, no slash arcs, no motion lines (the game adds effects). Flat white background. Do NOT draw the labels, grid or guide lines.

I will ask for ONE image at a time and attach its template. After each image, wait until I type "next".

IMAGE 1 — WALK (template tpl_walk.png): 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK).
IMAGE 2 — IDLE (template tpl_idle.png): IDLE standing pose, 4 frames per direction. Stands still with BOTH FEET TOGETHER side by side, both soles flat on the red line, legs straight, knees together, weapon held relaxed. Frames: 1 neutral, 2 breathe in (shoulders a tiny bit higher), 3 neutral, 4 breathe out. The legs and feet must NOT move between frames. Each row is a direction as labelled.
IMAGE 3 — ATTACK (template tpl_attack.png): ATTACK, 6 frames per direction: 1 ready with the bow lowered, 2 nock an arrow, 3 full draw aimed ahead, 4 RELEASE, string snapping forward (no arrow in flight), 5 bow recoil, 6 back to ready. Draw the character ONLY: no slash arcs, no motion lines, no effects (the game adds them). Each row is a direction as labelled.
IMAGE 4 — SKILL POSE (template tpl_cast.png): SKILL pose (one pose used for every skill), 4 frames per direction: 1 ready, 2 gathering power, 3 release, 4 hold the final pose. The pose: kneels slightly and draws the bow at full stretch, aiming ahead. Draw the character ONLY: no magic circles, no glow, no aura, no smoke, no effects (the game adds skill effects separately). Each row is a direction as labelled.
IMAGE 5 — SIT + HURT (template tpl_sit_hurt.png): Columns 1-2 SIT: sitting on the ground with legs folded, resting, bottom on the red line (the head is naturally BELOW the blue line when sitting). The 2 sit frames are almost identical (calm breathing only).
Columns 3-4 HURT (standing): 3 knocked back, body leaning away, visor flickers bright; 4 recovering back into stance. Hurt frames: top of the head on the blue line, feet on the red line.
Each row is a direction as labelled. Same character size as the walk sheet.
IMAGE 6 — DEAD (template tpl_dead.png): DEAD, 4 frames per direction: 1 knees buckle, 2 falling to the ground, 3 lying FLAT on the ground (whole body resting on the red line, seen from the game's high 3/4 camera), 4 lying still with the visor dark (turned off). Only frame 1 reaches up toward the blue line; frames 2-4 are low on the red line. Each row is a direction as labelled. Same character size as the walk sheet.

Start now with IMAGE 1.
```

### Wildhunter ชาย (นักล่า) — 6 ภาพ

แชตใหม่ • แนบ hero_wildhunter_m.webp + tpl_walk.png • จากนั้นพิมพ์ next + แนบเทมเพลตของภาพถัดไป (tpl_idle.png, tpl_attack.png, tpl_cast.png, tpl_sit_hurt.png, tpl_dead.png)

```
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Every character is an ANDROID: smooth white faceplate with ONE glowing visor strip, NO eyes, NO mouth. Chibi proportions (head about 1/3 of the body height), thick dark outline, 2-tone cel shading, modest outfit.
Character: male android WILDHUNTER archer: short messy blond hair, green hooded cloak, green visor, white armor with leather straps, quiver of green arrows, curved wood-and-gold recurve bow with a glowing green string.

RULES FOR EVERY IMAGE: follow the template I attach with each image (rows = directions FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK; columns = frames). Standing poses: top of the head on the blue line, feet on the red line. Same character, same size, same colors in every image — after IMAGE 1, the walk sheet you drew is the reference. Leave clear space between characters so they never touch. Draw the character ONLY: no effects, no glow auras, no slash arcs, no motion lines (the game adds effects). Flat white background. Do NOT draw the labels, grid or guide lines.

I will ask for ONE image at a time and attach its template. After each image, wait until I type "next".

IMAGE 1 — WALK (template tpl_walk.png): 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK).
IMAGE 2 — IDLE (template tpl_idle.png): IDLE standing pose, 4 frames per direction. Stands still with BOTH FEET TOGETHER side by side, both soles flat on the red line, legs straight, knees together, weapon held relaxed. Frames: 1 neutral, 2 breathe in (shoulders a tiny bit higher), 3 neutral, 4 breathe out. The legs and feet must NOT move between frames. Each row is a direction as labelled.
IMAGE 3 — ATTACK (template tpl_attack.png): ATTACK, 6 frames per direction: 1 ready with the bow lowered, 2 nock an arrow, 3 full draw aimed ahead, 4 RELEASE, string snapping forward (no arrow in flight), 5 bow recoil, 6 back to ready. Draw the character ONLY: no slash arcs, no motion lines, no effects (the game adds them). Each row is a direction as labelled.
IMAGE 4 — SKILL POSE (template tpl_cast.png): SKILL pose (one pose used for every skill), 4 frames per direction: 1 ready, 2 gathering power, 3 release, 4 hold the final pose. The pose: kneels slightly and draws the bow at full stretch, aiming ahead. Draw the character ONLY: no magic circles, no glow, no aura, no smoke, no effects (the game adds skill effects separately). Each row is a direction as labelled.
IMAGE 5 — SIT + HURT (template tpl_sit_hurt.png): Columns 1-2 SIT: sitting on the ground with legs folded, resting, bottom on the red line (the head is naturally BELOW the blue line when sitting). The 2 sit frames are almost identical (calm breathing only).
Columns 3-4 HURT (standing): 3 knocked back, body leaning away, visor flickers bright; 4 recovering back into stance. Hurt frames: top of the head on the blue line, feet on the red line.
Each row is a direction as labelled. Same character size as the walk sheet.
IMAGE 6 — DEAD (template tpl_dead.png): DEAD, 4 frames per direction: 1 knees buckle, 2 falling to the ground, 3 lying FLAT on the ground (whole body resting on the red line, seen from the game's high 3/4 camera), 4 lying still with the visor dark (turned off). Only frame 1 reaches up toward the blue line; frames 2-4 are low on the red line. Each row is a direction as labelled. Same character size as the walk sheet.

Start now with IMAGE 1.
```

### Völva หญิง (นักพยากรณ์แห่งแสง) — 6 ภาพ

แชตใหม่ • แนบ hero_volva_f.webp + tpl_walk.png • จากนั้นพิมพ์ next + แนบเทมเพลตของภาพถัดไป (tpl_idle.png, tpl_attack.png, tpl_cast.png, tpl_sit_hurt.png, tpl_dead.png)

```
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Every character is an ANDROID: smooth white faceplate with ONE glowing visor strip, NO eyes, NO mouth. Chibi proportions (head about 1/3 of the body height), thick dark outline, 2-tone cel shading, modest outfit.
Character: female android VÖLVA priestess: long black hair with a gold circlet, flowing white-and-gold robe with Norse knot patterns, gold visor, golden staff with a sun-ring top and a cyan gem.

RULES FOR EVERY IMAGE: follow the template I attach with each image (rows = directions FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK; columns = frames). Standing poses: top of the head on the blue line, feet on the red line. Same character, same size, same colors in every image — after IMAGE 1, the walk sheet you drew is the reference. Leave clear space between characters so they never touch. Draw the character ONLY: no effects, no glow auras, no slash arcs, no motion lines (the game adds effects). Flat white background. Do NOT draw the labels, grid or guide lines.

I will ask for ONE image at a time and attach its template. After each image, wait until I type "next".

IMAGE 1 — WALK (template tpl_walk.png): 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK).
IMAGE 2 — IDLE (template tpl_idle.png): IDLE standing pose, 4 frames per direction. Stands still with BOTH FEET TOGETHER side by side, both soles flat on the red line, legs straight, knees together, weapon held relaxed. Frames: 1 neutral, 2 breathe in (shoulders a tiny bit higher), 3 neutral, 4 breathe out. The legs and feet must NOT move between frames. Each row is a direction as labelled.
IMAGE 3 — ATTACK (template tpl_attack.png): ATTACK, 6 frames per direction: 1 ready holding the staff, 2 staff pulled back, 3 step in swinging, 4 staff HIT, arms fully extended, 5 follow-through, 6 back to ready. Draw the character ONLY: no slash arcs, no motion lines, no effects (the game adds them). Each row is a direction as labelled.
IMAGE 4 — SKILL POSE (template tpl_cast.png): SKILL pose (one pose used for every skill), 4 frames per direction: 1 ready, 2 gathering power, 3 release, 4 hold the final pose. The pose: golden staff raised overhead with both hands. Draw the character ONLY: no magic circles, no glow, no aura, no smoke, no effects (the game adds skill effects separately). Each row is a direction as labelled.
IMAGE 5 — SIT + HURT (template tpl_sit_hurt.png): Columns 1-2 SIT: sitting on the ground with legs folded, resting, bottom on the red line (the head is naturally BELOW the blue line when sitting). The 2 sit frames are almost identical (calm breathing only).
Columns 3-4 HURT (standing): 3 knocked back, body leaning away, visor flickers bright; 4 recovering back into stance. Hurt frames: top of the head on the blue line, feet on the red line.
Each row is a direction as labelled. Same character size as the walk sheet.
IMAGE 6 — DEAD (template tpl_dead.png): DEAD, 4 frames per direction: 1 knees buckle, 2 falling to the ground, 3 lying FLAT on the ground (whole body resting on the red line, seen from the game's high 3/4 camera), 4 lying still with the visor dark (turned off). Only frame 1 reaches up toward the blue line; frames 2-4 are low on the red line. Each row is a direction as labelled. Same character size as the walk sheet.

Start now with IMAGE 1.
```

### Völva ชาย (นักพยากรณ์แห่งแสง) — 6 ภาพ

แชตใหม่ • แนบ hero_volva_m.webp + tpl_walk.png • จากนั้นพิมพ์ next + แนบเทมเพลตของภาพถัดไป (tpl_idle.png, tpl_attack.png, tpl_cast.png, tpl_sit_hurt.png, tpl_dead.png)

```
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Every character is an ANDROID: smooth white faceplate with ONE glowing visor strip, NO eyes, NO mouth. Chibi proportions (head about 1/3 of the body height), thick dark outline, 2-tone cel shading, modest outfit.
Character: male android VÖLVA priest: shoulder-length black hair with a gold headband, white-and-gold robe with Norse knot patterns, gold visor, golden staff with a sun-ring top.

RULES FOR EVERY IMAGE: follow the template I attach with each image (rows = directions FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK; columns = frames). Standing poses: top of the head on the blue line, feet on the red line. Same character, same size, same colors in every image — after IMAGE 1, the walk sheet you drew is the reference. Leave clear space between characters so they never touch. Draw the character ONLY: no effects, no glow auras, no slash arcs, no motion lines (the game adds effects). Flat white background. Do NOT draw the labels, grid or guide lines.

I will ask for ONE image at a time and attach its template. After each image, wait until I type "next".

IMAGE 1 — WALK (template tpl_walk.png): 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK).
IMAGE 2 — IDLE (template tpl_idle.png): IDLE standing pose, 4 frames per direction. Stands still with BOTH FEET TOGETHER side by side, both soles flat on the red line, legs straight, knees together, weapon held relaxed. Frames: 1 neutral, 2 breathe in (shoulders a tiny bit higher), 3 neutral, 4 breathe out. The legs and feet must NOT move between frames. Each row is a direction as labelled.
IMAGE 3 — ATTACK (template tpl_attack.png): ATTACK, 6 frames per direction: 1 ready holding the staff, 2 staff pulled back, 3 step in swinging, 4 staff HIT, arms fully extended, 5 follow-through, 6 back to ready. Draw the character ONLY: no slash arcs, no motion lines, no effects (the game adds them). Each row is a direction as labelled.
IMAGE 4 — SKILL POSE (template tpl_cast.png): SKILL pose (one pose used for every skill), 4 frames per direction: 1 ready, 2 gathering power, 3 release, 4 hold the final pose. The pose: golden staff raised overhead with both hands. Draw the character ONLY: no magic circles, no glow, no aura, no smoke, no effects (the game adds skill effects separately). Each row is a direction as labelled.
IMAGE 5 — SIT + HURT (template tpl_sit_hurt.png): Columns 1-2 SIT: sitting on the ground with legs folded, resting, bottom on the red line (the head is naturally BELOW the blue line when sitting). The 2 sit frames are almost identical (calm breathing only).
Columns 3-4 HURT (standing): 3 knocked back, body leaning away, visor flickers bright; 4 recovering back into stance. Hurt frames: top of the head on the blue line, feet on the red line.
Each row is a direction as labelled. Same character size as the walk sheet.
IMAGE 6 — DEAD (template tpl_dead.png): DEAD, 4 frames per direction: 1 knees buckle, 2 falling to the ground, 3 lying FLAT on the ground (whole body resting on the red line, seen from the game's high 3/4 camera), 4 lying still with the visor dark (turned off). Only frame 1 reaches up toward the blue line; frames 2-4 are low on the red line. Each row is a direction as labelled. Same character size as the walk sheet.

Start now with IMAGE 1.
```

### Loki's Trickster หญิง (นักลวง) — 6 ภาพ

แชตใหม่ • แนบ hero_trickster_f.webp + tpl_walk.png • จากนั้นพิมพ์ next + แนบเทมเพลตของภาพถัดไป (tpl_idle.png, tpl_attack.png, tpl_cast.png, tpl_sit_hurt.png, tpl_dead.png)

```
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Every character is an ANDROID: smooth white faceplate with ONE glowing visor strip, NO eyes, NO mouth. Chibi proportions (head about 1/3 of the body height), thick dark outline, 2-tone cel shading, modest outfit.
Character: female android LOKI'S TRICKSTER rogue: long crimson hair plates in a high ponytail, purple visor, dark purple-black stealth suit with a ragged purple scarf and small green glowing accents, glowing violet dagger.

RULES FOR EVERY IMAGE: follow the template I attach with each image (rows = directions FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK; columns = frames). Standing poses: top of the head on the blue line, feet on the red line. Same character, same size, same colors in every image — after IMAGE 1, the walk sheet you drew is the reference. Leave clear space between characters so they never touch. Draw the character ONLY: no effects, no glow auras, no slash arcs, no motion lines (the game adds effects). Flat white background. Do NOT draw the labels, grid or guide lines.

I will ask for ONE image at a time and attach its template. After each image, wait until I type "next".

IMAGE 1 — WALK (template tpl_walk.png): 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK).
IMAGE 2 — IDLE (template tpl_idle.png): IDLE standing pose, 4 frames per direction. Stands still with BOTH FEET TOGETHER side by side, both soles flat on the red line, legs straight, knees together, weapon held relaxed. Frames: 1 neutral, 2 breathe in (shoulders a tiny bit higher), 3 neutral, 4 breathe out. The legs and feet must NOT move between frames. Each row is a direction as labelled.
IMAGE 3 — ATTACK (template tpl_attack.png): ATTACK, 6 frames per direction: 1 ready, 2 pull back (dagger arm drawn far back), 3 lunge forward, 4 full SLASH, arm fully extended, 5 follow-through, 6 back to ready. Draw the character ONLY: no slash arcs, no motion lines, no effects (the game adds them). Each row is a direction as labelled.
IMAGE 4 — SKILL POSE (template tpl_cast.png): SKILL pose (one pose used for every skill), 4 frames per direction: 1 ready, 2 gathering power, 3 release, 4 hold the final pose. The pose: crouches low with the dagger held in reverse grip. Draw the character ONLY: no magic circles, no glow, no aura, no smoke, no effects (the game adds skill effects separately). Each row is a direction as labelled.
IMAGE 5 — SIT + HURT (template tpl_sit_hurt.png): Columns 1-2 SIT: sitting on the ground with legs folded, resting, bottom on the red line (the head is naturally BELOW the blue line when sitting). The 2 sit frames are almost identical (calm breathing only).
Columns 3-4 HURT (standing): 3 knocked back, body leaning away, visor flickers bright; 4 recovering back into stance. Hurt frames: top of the head on the blue line, feet on the red line.
Each row is a direction as labelled. Same character size as the walk sheet.
IMAGE 6 — DEAD (template tpl_dead.png): DEAD, 4 frames per direction: 1 knees buckle, 2 falling to the ground, 3 lying FLAT on the ground (whole body resting on the red line, seen from the game's high 3/4 camera), 4 lying still with the visor dark (turned off). Only frame 1 reaches up toward the blue line; frames 2-4 are low on the red line. Each row is a direction as labelled. Same character size as the walk sheet.

Start now with IMAGE 1.
```

### Loki's Trickster ชาย (นักลวง) — 6 ภาพ

แชตใหม่ • แนบ hero_trickster_m.webp + tpl_walk.png • จากนั้นพิมพ์ next + แนบเทมเพลตของภาพถัดไป (tpl_idle.png, tpl_attack.png, tpl_cast.png, tpl_sit_hurt.png, tpl_dead.png)

```
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Every character is an ANDROID: smooth white faceplate with ONE glowing visor strip, NO eyes, NO mouth. Chibi proportions (head about 1/3 of the body height), thick dark outline, 2-tone cel shading, modest outfit.
Character: male android LOKI'S TRICKSTER rogue: spiky crimson hair plates, purple visor, dark purple-black stealth suit with a ragged purple scarf and green glowing accents, glowing violet dagger.

RULES FOR EVERY IMAGE: follow the template I attach with each image (rows = directions FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK; columns = frames). Standing poses: top of the head on the blue line, feet on the red line. Same character, same size, same colors in every image — after IMAGE 1, the walk sheet you drew is the reference. Leave clear space between characters so they never touch. Draw the character ONLY: no effects, no glow auras, no slash arcs, no motion lines (the game adds effects). Flat white background. Do NOT draw the labels, grid or guide lines.

I will ask for ONE image at a time and attach its template. After each image, wait until I type "next".

IMAGE 1 — WALK (template tpl_walk.png): 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK).
IMAGE 2 — IDLE (template tpl_idle.png): IDLE standing pose, 4 frames per direction. Stands still with BOTH FEET TOGETHER side by side, both soles flat on the red line, legs straight, knees together, weapon held relaxed. Frames: 1 neutral, 2 breathe in (shoulders a tiny bit higher), 3 neutral, 4 breathe out. The legs and feet must NOT move between frames. Each row is a direction as labelled.
IMAGE 3 — ATTACK (template tpl_attack.png): ATTACK, 6 frames per direction: 1 ready, 2 pull back (dagger arm drawn far back), 3 lunge forward, 4 full SLASH, arm fully extended, 5 follow-through, 6 back to ready. Draw the character ONLY: no slash arcs, no motion lines, no effects (the game adds them). Each row is a direction as labelled.
IMAGE 4 — SKILL POSE (template tpl_cast.png): SKILL pose (one pose used for every skill), 4 frames per direction: 1 ready, 2 gathering power, 3 release, 4 hold the final pose. The pose: crouches low with the dagger held in reverse grip. Draw the character ONLY: no magic circles, no glow, no aura, no smoke, no effects (the game adds skill effects separately). Each row is a direction as labelled.
IMAGE 5 — SIT + HURT (template tpl_sit_hurt.png): Columns 1-2 SIT: sitting on the ground with legs folded, resting, bottom on the red line (the head is naturally BELOW the blue line when sitting). The 2 sit frames are almost identical (calm breathing only).
Columns 3-4 HURT (standing): 3 knocked back, body leaning away, visor flickers bright; 4 recovering back into stance. Hurt frames: top of the head on the blue line, feet on the red line.
Each row is a direction as labelled. Same character size as the walk sheet.
IMAGE 6 — DEAD (template tpl_dead.png): DEAD, 4 frames per direction: 1 knees buckle, 2 falling to the ground, 3 lying FLAT on the ground (whole body resting on the red line, seen from the game's high 3/4 camera), 4 lying still with the visor dark (turned off). Only frame 1 reaches up toward the blue line; frames 2-4 are low on the red line. Each row is a direction as labelled. Same character size as the walk sheet.

Start now with IMAGE 1.
```

### Berserker หญิง (นักรบคลั่ง) — 6 ภาพ

แชตใหม่ • แนบ hero_berserker_f.webp + tpl_walk.png • จากนั้นพิมพ์ next + แนบเทมเพลตของภาพถัดไป (tpl_idle.png, tpl_attack.png, tpl_cast.png, tpl_sit_hurt.png, tpl_dead.png)

```
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Every character is an ANDROID: smooth white faceplate with ONE glowing visor strip, NO eyes, NO mouth. Chibi proportions (head about 1/3 of the body height), thick dark outline, 2-tone cel shading, modest outfit.
Character: female android BERSERKER: wolf-head pelt hood over long silver hair, orange visor, bronze-brown heavy armor trimmed with fur, huge glowing orange battle axe.

RULES FOR EVERY IMAGE: follow the template I attach with each image (rows = directions FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK; columns = frames). Standing poses: top of the head on the blue line, feet on the red line. Same character, same size, same colors in every image — after IMAGE 1, the walk sheet you drew is the reference. Leave clear space between characters so they never touch. Draw the character ONLY: no effects, no glow auras, no slash arcs, no motion lines (the game adds effects). Flat white background. Do NOT draw the labels, grid or guide lines.

I will ask for ONE image at a time and attach its template. After each image, wait until I type "next".

IMAGE 1 — WALK (template tpl_walk.png): 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK).
IMAGE 2 — IDLE (template tpl_idle.png): IDLE standing pose, 4 frames per direction. Stands still with BOTH FEET TOGETHER side by side, both soles flat on the red line, legs straight, knees together, weapon held relaxed. Frames: 1 neutral, 2 breathe in (shoulders a tiny bit higher), 3 neutral, 4 breathe out. The legs and feet must NOT move between frames. Each row is a direction as labelled.
IMAGE 3 — ATTACK (template tpl_attack.png): ATTACK, 6 frames per direction: 1 ready, 2 axe raised overhead with both hands, 3 lunge forward, 4 heavy CHOP, axe head low in front, 5 follow-through low to the ground, 6 back to ready. Draw the character ONLY: no slash arcs, no motion lines, no effects (the game adds them). Each row is a direction as labelled.
IMAGE 4 — SKILL POSE (template tpl_cast.png): SKILL pose (one pose used for every skill), 4 frames per direction: 1 ready, 2 gathering power, 3 release, 4 hold the final pose. The pose: roars with the axe raised high over the head. Draw the character ONLY: no magic circles, no glow, no aura, no smoke, no effects (the game adds skill effects separately). Each row is a direction as labelled.
IMAGE 5 — SIT + HURT (template tpl_sit_hurt.png): Columns 1-2 SIT: sitting on the ground with legs folded, resting, bottom on the red line (the head is naturally BELOW the blue line when sitting). The 2 sit frames are almost identical (calm breathing only).
Columns 3-4 HURT (standing): 3 knocked back, body leaning away, visor flickers bright; 4 recovering back into stance. Hurt frames: top of the head on the blue line, feet on the red line.
Each row is a direction as labelled. Same character size as the walk sheet.
IMAGE 6 — DEAD (template tpl_dead.png): DEAD, 4 frames per direction: 1 knees buckle, 2 falling to the ground, 3 lying FLAT on the ground (whole body resting on the red line, seen from the game's high 3/4 camera), 4 lying still with the visor dark (turned off). Only frame 1 reaches up toward the blue line; frames 2-4 are low on the red line. Each row is a direction as labelled. Same character size as the walk sheet.

Start now with IMAGE 1.
```

### Berserker ชาย (นักรบคลั่ง) — 6 ภาพ

แชตใหม่ • แนบ hero_berserker_m.webp + tpl_walk.png • จากนั้นพิมพ์ next + แนบเทมเพลตของภาพถัดไป (tpl_idle.png, tpl_attack.png, tpl_cast.png, tpl_sit_hurt.png, tpl_dead.png)

```
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Every character is an ANDROID: smooth white faceplate with ONE glowing visor strip, NO eyes, NO mouth. Chibi proportions (head about 1/3 of the body height), thick dark outline, 2-tone cel shading, modest outfit.
Character: male android BERSERKER: wolf-head pelt hood, orange visor, very bulky bronze-brown heavy armor trimmed with fur, huge glowing orange battle axe.

RULES FOR EVERY IMAGE: follow the template I attach with each image (rows = directions FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK; columns = frames). Standing poses: top of the head on the blue line, feet on the red line. Same character, same size, same colors in every image — after IMAGE 1, the walk sheet you drew is the reference. Leave clear space between characters so they never touch. Draw the character ONLY: no effects, no glow auras, no slash arcs, no motion lines (the game adds effects). Flat white background. Do NOT draw the labels, grid or guide lines.

I will ask for ONE image at a time and attach its template. After each image, wait until I type "next".

IMAGE 1 — WALK (template tpl_walk.png): 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK).
IMAGE 2 — IDLE (template tpl_idle.png): IDLE standing pose, 4 frames per direction. Stands still with BOTH FEET TOGETHER side by side, both soles flat on the red line, legs straight, knees together, weapon held relaxed. Frames: 1 neutral, 2 breathe in (shoulders a tiny bit higher), 3 neutral, 4 breathe out. The legs and feet must NOT move between frames. Each row is a direction as labelled.
IMAGE 3 — ATTACK (template tpl_attack.png): ATTACK, 6 frames per direction: 1 ready, 2 axe raised overhead with both hands, 3 lunge forward, 4 heavy CHOP, axe head low in front, 5 follow-through low to the ground, 6 back to ready. Draw the character ONLY: no slash arcs, no motion lines, no effects (the game adds them). Each row is a direction as labelled.
IMAGE 4 — SKILL POSE (template tpl_cast.png): SKILL pose (one pose used for every skill), 4 frames per direction: 1 ready, 2 gathering power, 3 release, 4 hold the final pose. The pose: roars with the axe raised high over the head. Draw the character ONLY: no magic circles, no glow, no aura, no smoke, no effects (the game adds skill effects separately). Each row is a direction as labelled.
IMAGE 5 — SIT + HURT (template tpl_sit_hurt.png): Columns 1-2 SIT: sitting on the ground with legs folded, resting, bottom on the red line (the head is naturally BELOW the blue line when sitting). The 2 sit frames are almost identical (calm breathing only).
Columns 3-4 HURT (standing): 3 knocked back, body leaning away, visor flickers bright; 4 recovering back into stance. Hurt frames: top of the head on the blue line, feet on the red line.
Each row is a direction as labelled. Same character size as the walk sheet.
IMAGE 6 — DEAD (template tpl_dead.png): DEAD, 4 frames per direction: 1 knees buckle, 2 falling to the ground, 3 lying FLAT on the ground (whole body resting on the red line, seen from the game's high 3/4 camera), 4 lying still with the visor dark (turned off). Only frame 1 reaches up toward the blue line; frames 2-4 are low on the red line. Each row is a direction as labelled. Same character size as the walk sheet.

Start now with IMAGE 1.
```

### มอนสเตอร์ทั้งหมด — 6 ภาพ

แชตใหม่ • แนบ mobsprite ของตัวที่ 1 (Gel Unit) + tpl_mob.png • จากนั้นพิมพ์ next + แนบ mobsprite ตัวถัดไป + tpl_mob.png

```
You are my monster sprite artist for a cute 2000s Korean MMORPG (Ragnarok Online style) where every monster is a cute chibi ROBOT version of a classic monster.
For each image I attach: (1) the monster design, (2) the 4x2 template. Draw that exact monster (same colors, same size, same art style) into the template, facing LEFT (3/4 view).
Top row = MOVE loop (4 frames). Bottom row = ATTACK (4 frames). Bottom of the monster on the red line in every cell, even for jumps (the game adds the jump height). Every frame clearly different. Draw the monster ONLY: no effects, no motion lines, no impact bursts (the game adds them). Leave clear space between cells. Flat white background. Do NOT draw the labels, grid or guide lines.
I will ask for ONE monster at a time. After each image, wait until I type "next".

IMAGE 1 — Gel Unit: MOVE = squash down, stretch up jumping, in the air, landing squash. ATTACK = squash low, lunge forward stretched, SPLAT hit, bounce back.
IMAGE 2 — Ember Unit: MOVE = squash and jump like a slime, the antenna flame flickers. ATTACK = squash low, lunge forward, SPLAT hit, bounce back.
IMAGE 3 — Hopper Unit: MOVE = crouch, big grasshopper hop, in the air, land (keep the violin). ATTACK = crouch, leap forward, kick with the long hind legs, land.
IMAGE 4 — Mine Unit: MOVE = waddles on its little red boots, the siren light blinks. ATTACK = cap puffs up big, siren light turns red, cap slams forward, deflate.
IMAGE 5 — Moss Unit: MOVE = squash and jump like a slime, the clover leaf bounces. ATTACK = squash low, lunge forward, SPLAT hit, bounce back.
IMAGE 6 — Hel Guard Unit: MOVE = heavy armored march, cape swaying, halberd upright. ATTACK = halberd raised overhead, step in, heavy CLEAVE, recover.

Start now with IMAGE 1.
```

## ตัวละคร (อาชีพละ 6 ภาพ)

### Novice หญิง (Type-A) — `novice_f`

รูปอ้างอิงสำหรับภาพเดิน: `ภาพเดินล่าสุดของ Novice หญิง`

✅ **เดิน (ภาพแรกของตัวละคร = แบบอ้างอิง)** — แนบ `tpl_walk.png` (4×5)

✅ **ยืนขาคู่** — แนบ `tpl_idle.png` (4×5)

✅ **โจมตี** — แนบ `tpl_attack.png` (6×5)

✅ **ท่าสกิล (1 ท่าใช้กับทุกสกิล)** — แนบ `tpl_cast.png` (4×5)

✅ **นั่ง + โดนตี** — แนบ `tpl_sit_hurt.png` (4×5)

✅ **ล้ม** — แนบ `tpl_dead.png` (4×5)

### Novice ชาย (Type-B) — `novice_m`

รูปอ้างอิงสำหรับภาพเดิน: `hero_novice_m.webp`

⬜ **เดิน (ภาพแรกของตัวละคร = แบบอ้างอิง)** — แนบ `tpl_walk.png` (4×5)

```
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Every character is an ANDROID: smooth white faceplate with ONE glowing visor strip, NO eyes, NO mouth. Chibi proportions (head about 1/3 of the body height), thick dark outline, 2-tone cel shading, modest outfit.
Character: male android NOVICE: spiky silver hair plates, cyan visor, olive field jacket with a red cross shoulder patch, brown belt with pouches, white armored legs, short cyan energy dagger in the right hand. Use the attached character image for the design.
Draw a WALK cycle into the attached template, 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK).
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ยืนขาคู่** — แนบ `tpl_idle.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: IDLE standing pose, 4 frames per direction. Stands still with BOTH FEET TOGETHER side by side, both soles flat on the red line, legs straight, knees together, weapon held relaxed. Frames: 1 neutral, 2 breathe in (shoulders a tiny bit higher), 3 neutral, 4 breathe out. The legs and feet must NOT move between frames. Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **โจมตี** — แนบ `tpl_attack.png` (6×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: ATTACK, 6 frames per direction: 1 ready, 2 pull back (dagger arm drawn far back), 3 lunge forward, 4 full SLASH, arm fully extended, 5 follow-through, 6 back to ready. Draw the character ONLY: no slash arcs, no motion lines, no effects (the game adds them). Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ท่าสกิล (1 ท่าใช้กับทุกสกิล)** — แนบ `tpl_cast.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: SKILL pose (one pose used for every skill), 4 frames per direction: 1 ready, 2 gathering power, 3 release, 4 hold the final pose. The pose: free hand raised forward, palm open. Draw the character ONLY: no magic circles, no glow, no aura, no smoke, no effects (the game adds skill effects separately). Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **นั่ง + โดนตี** — แนบ `tpl_sit_hurt.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template.
Columns 1-2 SIT: sitting on the ground with legs folded, resting, bottom on the red line (the head is naturally BELOW the blue line when sitting). The 2 sit frames are almost identical (calm breathing only).
Columns 3-4 HURT (standing): 3 knocked back, body leaning away, visor flickers bright; 4 recovering back into stance. Hurt frames: top of the head on the blue line, feet on the red line.
Each row is a direction as labelled. Same character size as the walk sheet. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ล้ม** — แนบ `tpl_dead.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: DEAD, 4 frames per direction: 1 knees buckle, 2 falling to the ground, 3 lying FLAT on the ground (whole body resting on the red line, seen from the game's high 3/4 camera), 4 lying still with the visor dark (turned off). Only frame 1 reaches up toward the blue line; frames 2-4 are low on the red line. Each row is a direction as labelled. Same character size as the walk sheet. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

### Einherjar หญิง (นักรบวิญญาณ) — `einherjar_f`

รูปอ้างอิงสำหรับภาพเดิน: `hero_einherjar_f.webp`

⬜ **เดิน (ภาพแรกของตัวละคร = แบบอ้างอิง)** — แนบ `tpl_walk.png` (4×5)

```
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Every character is an ANDROID: smooth white faceplate with ONE glowing visor strip, NO eyes, NO mouth. Chibi proportions (head about 1/3 of the body height), thick dark outline, 2-tone cel shading, modest outfit.
Character: female android EINHERJAR knight: long silver-white hair, small silver winged helmet, red visor, silver plate armor with red trim, red cape, round silver shield with a gold star on the left arm, glowing red longsword in the right hand. Use the attached character image for the design.
Draw a WALK cycle into the attached template, 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK).
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ยืนขาคู่** — แนบ `tpl_idle.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: IDLE standing pose, 4 frames per direction. Stands still with BOTH FEET TOGETHER side by side, both soles flat on the red line, legs straight, knees together, weapon held relaxed. Frames: 1 neutral, 2 breathe in (shoulders a tiny bit higher), 3 neutral, 4 breathe out. The legs and feet must NOT move between frames. Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **โจมตี** — แนบ `tpl_attack.png` (6×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: ATTACK, 6 frames per direction: 1 ready behind the shield, 2 pull back with the sword raised high, 3 step in, 4 full overhead SLASH, sword low in front, 5 follow-through low, 6 back to ready. Draw the character ONLY: no slash arcs, no motion lines, no effects (the game adds them). Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ท่าสกิล (1 ท่าใช้กับทุกสกิล)** — แนบ `tpl_cast.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: SKILL pose (one pose used for every skill), 4 frames per direction: 1 ready, 2 gathering power, 3 release, 4 hold the final pose. The pose: shield raised and sword held up to the sky. Draw the character ONLY: no magic circles, no glow, no aura, no smoke, no effects (the game adds skill effects separately). Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **นั่ง + โดนตี** — แนบ `tpl_sit_hurt.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template.
Columns 1-2 SIT: sitting on the ground with legs folded, resting, bottom on the red line (the head is naturally BELOW the blue line when sitting). The 2 sit frames are almost identical (calm breathing only).
Columns 3-4 HURT (standing): 3 knocked back, body leaning away, visor flickers bright; 4 recovering back into stance. Hurt frames: top of the head on the blue line, feet on the red line.
Each row is a direction as labelled. Same character size as the walk sheet. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ล้ม** — แนบ `tpl_dead.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: DEAD, 4 frames per direction: 1 knees buckle, 2 falling to the ground, 3 lying FLAT on the ground (whole body resting on the red line, seen from the game's high 3/4 camera), 4 lying still with the visor dark (turned off). Only frame 1 reaches up toward the blue line; frames 2-4 are low on the red line. Each row is a direction as labelled. Same character size as the walk sheet. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

### Einherjar ชาย (นักรบวิญญาณ) — `einherjar_m`

รูปอ้างอิงสำหรับภาพเดิน: `hero_einherjar_m.webp`

⬜ **เดิน (ภาพแรกของตัวละคร = แบบอ้างอิง)** — แนบ `tpl_walk.png` (4×5)

```
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Every character is an ANDROID: smooth white faceplate with ONE glowing visor strip, NO eyes, NO mouth. Chibi proportions (head about 1/3 of the body height), thick dark outline, 2-tone cel shading, modest outfit.
Character: male android EINHERJAR knight: full helm with curved horns, red visor, bulky silver plate armor with red trim, red cape, round silver shield with a gold star, glowing red longsword. Use the attached character image for the design.
Draw a WALK cycle into the attached template, 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK).
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ยืนขาคู่** — แนบ `tpl_idle.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: IDLE standing pose, 4 frames per direction. Stands still with BOTH FEET TOGETHER side by side, both soles flat on the red line, legs straight, knees together, weapon held relaxed. Frames: 1 neutral, 2 breathe in (shoulders a tiny bit higher), 3 neutral, 4 breathe out. The legs and feet must NOT move between frames. Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **โจมตี** — แนบ `tpl_attack.png` (6×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: ATTACK, 6 frames per direction: 1 ready behind the shield, 2 pull back with the sword raised high, 3 step in, 4 full overhead SLASH, sword low in front, 5 follow-through low, 6 back to ready. Draw the character ONLY: no slash arcs, no motion lines, no effects (the game adds them). Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ท่าสกิล (1 ท่าใช้กับทุกสกิล)** — แนบ `tpl_cast.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: SKILL pose (one pose used for every skill), 4 frames per direction: 1 ready, 2 gathering power, 3 release, 4 hold the final pose. The pose: shield raised and sword held up to the sky. Draw the character ONLY: no magic circles, no glow, no aura, no smoke, no effects (the game adds skill effects separately). Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **นั่ง + โดนตี** — แนบ `tpl_sit_hurt.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template.
Columns 1-2 SIT: sitting on the ground with legs folded, resting, bottom on the red line (the head is naturally BELOW the blue line when sitting). The 2 sit frames are almost identical (calm breathing only).
Columns 3-4 HURT (standing): 3 knocked back, body leaning away, visor flickers bright; 4 recovering back into stance. Hurt frames: top of the head on the blue line, feet on the red line.
Each row is a direction as labelled. Same character size as the walk sheet. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ล้ม** — แนบ `tpl_dead.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: DEAD, 4 frames per direction: 1 knees buckle, 2 falling to the ground, 3 lying FLAT on the ground (whole body resting on the red line, seen from the game's high 3/4 camera), 4 lying still with the visor dark (turned off). Only frame 1 reaches up toward the blue line; frames 2-4 are low on the red line. Each row is a direction as labelled. Same character size as the walk sheet. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

### Rune Caster หญิง (นักเวทรูน) — `runecaster_f`

รูปอ้างอิงสำหรับภาพเดิน: `hero_runecaster_f.webp`

⬜ **เดิน (ภาพแรกของตัวละคร = แบบอ้างอิง)** — แนบ `tpl_walk.png` (4×5)

```
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Every character is an ANDROID: smooth white faceplate with ONE glowing visor strip, NO eyes, NO mouth. Chibi proportions (head about 1/3 of the body height), thick dark outline, 2-tone cel shading, modest outfit.
Character: female android RUNE CASTER mage: long deep-blue hair, deep blue hooded robe with glowing cyan rune patterns, cyan visor, white armored body under the robe, tall staff topped with a glowing blue orb and floating crystals. Use the attached character image for the design.
Draw a WALK cycle into the attached template, 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK).
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ยืนขาคู่** — แนบ `tpl_idle.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: IDLE standing pose, 4 frames per direction. Stands still with BOTH FEET TOGETHER side by side, both soles flat on the red line, legs straight, knees together, weapon held relaxed. Frames: 1 neutral, 2 breathe in (shoulders a tiny bit higher), 3 neutral, 4 breathe out. The legs and feet must NOT move between frames. Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **โจมตี** — แนบ `tpl_attack.png` (6×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: ATTACK, 6 frames per direction: 1 ready holding the staff, 2 staff pulled back, 3 step in swinging, 4 staff HIT, arms fully extended, 5 follow-through, 6 back to ready. Draw the character ONLY: no slash arcs, no motion lines, no effects (the game adds them). Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ท่าสกิล (1 ท่าใช้กับทุกสกิล)** — แนบ `tpl_cast.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: SKILL pose (one pose used for every skill), 4 frames per direction: 1 ready, 2 gathering power, 3 release, 4 hold the final pose. The pose: staff thrust forward with both hands. Draw the character ONLY: no magic circles, no glow, no aura, no smoke, no effects (the game adds skill effects separately). Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **นั่ง + โดนตี** — แนบ `tpl_sit_hurt.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template.
Columns 1-2 SIT: sitting on the ground with legs folded, resting, bottom on the red line (the head is naturally BELOW the blue line when sitting). The 2 sit frames are almost identical (calm breathing only).
Columns 3-4 HURT (standing): 3 knocked back, body leaning away, visor flickers bright; 4 recovering back into stance. Hurt frames: top of the head on the blue line, feet on the red line.
Each row is a direction as labelled. Same character size as the walk sheet. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ล้ม** — แนบ `tpl_dead.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: DEAD, 4 frames per direction: 1 knees buckle, 2 falling to the ground, 3 lying FLAT on the ground (whole body resting on the red line, seen from the game's high 3/4 camera), 4 lying still with the visor dark (turned off). Only frame 1 reaches up toward the blue line; frames 2-4 are low on the red line. Each row is a direction as labelled. Same character size as the walk sheet. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

### Rune Caster ชาย (นักเวทรูน) — `runecaster_m`

รูปอ้างอิงสำหรับภาพเดิน: `hero_runecaster_m.webp`

⬜ **เดิน (ภาพแรกของตัวละคร = แบบอ้างอิง)** — แนบ `tpl_walk.png` (4×5)

```
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Every character is an ANDROID: smooth white faceplate with ONE glowing visor strip, NO eyes, NO mouth. Chibi proportions (head about 1/3 of the body height), thick dark outline, 2-tone cel shading, modest outfit.
Character: male android RUNE CASTER mage: short blue hair under a deep blue hooded robe with glowing cyan rune patterns, cyan visor, tall staff topped with a glowing blue orb. Use the attached character image for the design.
Draw a WALK cycle into the attached template, 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK).
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ยืนขาคู่** — แนบ `tpl_idle.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: IDLE standing pose, 4 frames per direction. Stands still with BOTH FEET TOGETHER side by side, both soles flat on the red line, legs straight, knees together, weapon held relaxed. Frames: 1 neutral, 2 breathe in (shoulders a tiny bit higher), 3 neutral, 4 breathe out. The legs and feet must NOT move between frames. Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **โจมตี** — แนบ `tpl_attack.png` (6×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: ATTACK, 6 frames per direction: 1 ready holding the staff, 2 staff pulled back, 3 step in swinging, 4 staff HIT, arms fully extended, 5 follow-through, 6 back to ready. Draw the character ONLY: no slash arcs, no motion lines, no effects (the game adds them). Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ท่าสกิล (1 ท่าใช้กับทุกสกิล)** — แนบ `tpl_cast.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: SKILL pose (one pose used for every skill), 4 frames per direction: 1 ready, 2 gathering power, 3 release, 4 hold the final pose. The pose: staff thrust forward with both hands. Draw the character ONLY: no magic circles, no glow, no aura, no smoke, no effects (the game adds skill effects separately). Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **นั่ง + โดนตี** — แนบ `tpl_sit_hurt.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template.
Columns 1-2 SIT: sitting on the ground with legs folded, resting, bottom on the red line (the head is naturally BELOW the blue line when sitting). The 2 sit frames are almost identical (calm breathing only).
Columns 3-4 HURT (standing): 3 knocked back, body leaning away, visor flickers bright; 4 recovering back into stance. Hurt frames: top of the head on the blue line, feet on the red line.
Each row is a direction as labelled. Same character size as the walk sheet. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ล้ม** — แนบ `tpl_dead.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: DEAD, 4 frames per direction: 1 knees buckle, 2 falling to the ground, 3 lying FLAT on the ground (whole body resting on the red line, seen from the game's high 3/4 camera), 4 lying still with the visor dark (turned off). Only frame 1 reaches up toward the blue line; frames 2-4 are low on the red line. Each row is a direction as labelled. Same character size as the walk sheet. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

### Wildhunter หญิง (นักล่า) — `wildhunter_f`

รูปอ้างอิงสำหรับภาพเดิน: `hero_wildhunter_f.webp`

⬜ **เดิน (ภาพแรกของตัวละคร = แบบอ้างอิง)** — แนบ `tpl_walk.png` (4×5)

```
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Every character is an ANDROID: smooth white faceplate with ONE glowing visor strip, NO eyes, NO mouth. Chibi proportions (head about 1/3 of the body height), thick dark outline, 2-tone cel shading, modest outfit.
Character: female android WILDHUNTER archer: long blonde braid, green hooded cloak, green visor, white armor with brown leather straps, quiver of green-fletched arrows on the back, curved wood-and-gold recurve bow with a glowing green string. Use the attached character image for the design.
Draw a WALK cycle into the attached template, 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK).
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ยืนขาคู่** — แนบ `tpl_idle.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: IDLE standing pose, 4 frames per direction. Stands still with BOTH FEET TOGETHER side by side, both soles flat on the red line, legs straight, knees together, weapon held relaxed. Frames: 1 neutral, 2 breathe in (shoulders a tiny bit higher), 3 neutral, 4 breathe out. The legs and feet must NOT move between frames. Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **โจมตี** — แนบ `tpl_attack.png` (6×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: ATTACK, 6 frames per direction: 1 ready with the bow lowered, 2 nock an arrow, 3 full draw aimed ahead, 4 RELEASE, string snapping forward (no arrow in flight), 5 bow recoil, 6 back to ready. Draw the character ONLY: no slash arcs, no motion lines, no effects (the game adds them). Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ท่าสกิล (1 ท่าใช้กับทุกสกิล)** — แนบ `tpl_cast.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: SKILL pose (one pose used for every skill), 4 frames per direction: 1 ready, 2 gathering power, 3 release, 4 hold the final pose. The pose: kneels slightly and draws the bow at full stretch, aiming ahead. Draw the character ONLY: no magic circles, no glow, no aura, no smoke, no effects (the game adds skill effects separately). Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **นั่ง + โดนตี** — แนบ `tpl_sit_hurt.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template.
Columns 1-2 SIT: sitting on the ground with legs folded, resting, bottom on the red line (the head is naturally BELOW the blue line when sitting). The 2 sit frames are almost identical (calm breathing only).
Columns 3-4 HURT (standing): 3 knocked back, body leaning away, visor flickers bright; 4 recovering back into stance. Hurt frames: top of the head on the blue line, feet on the red line.
Each row is a direction as labelled. Same character size as the walk sheet. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ล้ม** — แนบ `tpl_dead.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: DEAD, 4 frames per direction: 1 knees buckle, 2 falling to the ground, 3 lying FLAT on the ground (whole body resting on the red line, seen from the game's high 3/4 camera), 4 lying still with the visor dark (turned off). Only frame 1 reaches up toward the blue line; frames 2-4 are low on the red line. Each row is a direction as labelled. Same character size as the walk sheet. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

### Wildhunter ชาย (นักล่า) — `wildhunter_m`

รูปอ้างอิงสำหรับภาพเดิน: `hero_wildhunter_m.webp`

⬜ **เดิน (ภาพแรกของตัวละคร = แบบอ้างอิง)** — แนบ `tpl_walk.png` (4×5)

```
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Every character is an ANDROID: smooth white faceplate with ONE glowing visor strip, NO eyes, NO mouth. Chibi proportions (head about 1/3 of the body height), thick dark outline, 2-tone cel shading, modest outfit.
Character: male android WILDHUNTER archer: short messy blond hair, green hooded cloak, green visor, white armor with leather straps, quiver of green arrows, curved wood-and-gold recurve bow with a glowing green string. Use the attached character image for the design.
Draw a WALK cycle into the attached template, 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK).
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ยืนขาคู่** — แนบ `tpl_idle.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: IDLE standing pose, 4 frames per direction. Stands still with BOTH FEET TOGETHER side by side, both soles flat on the red line, legs straight, knees together, weapon held relaxed. Frames: 1 neutral, 2 breathe in (shoulders a tiny bit higher), 3 neutral, 4 breathe out. The legs and feet must NOT move between frames. Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **โจมตี** — แนบ `tpl_attack.png` (6×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: ATTACK, 6 frames per direction: 1 ready with the bow lowered, 2 nock an arrow, 3 full draw aimed ahead, 4 RELEASE, string snapping forward (no arrow in flight), 5 bow recoil, 6 back to ready. Draw the character ONLY: no slash arcs, no motion lines, no effects (the game adds them). Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ท่าสกิล (1 ท่าใช้กับทุกสกิล)** — แนบ `tpl_cast.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: SKILL pose (one pose used for every skill), 4 frames per direction: 1 ready, 2 gathering power, 3 release, 4 hold the final pose. The pose: kneels slightly and draws the bow at full stretch, aiming ahead. Draw the character ONLY: no magic circles, no glow, no aura, no smoke, no effects (the game adds skill effects separately). Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **นั่ง + โดนตี** — แนบ `tpl_sit_hurt.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template.
Columns 1-2 SIT: sitting on the ground with legs folded, resting, bottom on the red line (the head is naturally BELOW the blue line when sitting). The 2 sit frames are almost identical (calm breathing only).
Columns 3-4 HURT (standing): 3 knocked back, body leaning away, visor flickers bright; 4 recovering back into stance. Hurt frames: top of the head on the blue line, feet on the red line.
Each row is a direction as labelled. Same character size as the walk sheet. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ล้ม** — แนบ `tpl_dead.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: DEAD, 4 frames per direction: 1 knees buckle, 2 falling to the ground, 3 lying FLAT on the ground (whole body resting on the red line, seen from the game's high 3/4 camera), 4 lying still with the visor dark (turned off). Only frame 1 reaches up toward the blue line; frames 2-4 are low on the red line. Each row is a direction as labelled. Same character size as the walk sheet. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

### Völva หญิง (นักพยากรณ์แห่งแสง) — `volva_f`

รูปอ้างอิงสำหรับภาพเดิน: `hero_volva_f.webp`

⬜ **เดิน (ภาพแรกของตัวละคร = แบบอ้างอิง)** — แนบ `tpl_walk.png` (4×5)

```
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Every character is an ANDROID: smooth white faceplate with ONE glowing visor strip, NO eyes, NO mouth. Chibi proportions (head about 1/3 of the body height), thick dark outline, 2-tone cel shading, modest outfit.
Character: female android VÖLVA priestess: long black hair with a gold circlet, flowing white-and-gold robe with Norse knot patterns, gold visor, golden staff with a sun-ring top and a cyan gem. Use the attached character image for the design.
Draw a WALK cycle into the attached template, 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK).
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ยืนขาคู่** — แนบ `tpl_idle.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: IDLE standing pose, 4 frames per direction. Stands still with BOTH FEET TOGETHER side by side, both soles flat on the red line, legs straight, knees together, weapon held relaxed. Frames: 1 neutral, 2 breathe in (shoulders a tiny bit higher), 3 neutral, 4 breathe out. The legs and feet must NOT move between frames. Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **โจมตี** — แนบ `tpl_attack.png` (6×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: ATTACK, 6 frames per direction: 1 ready holding the staff, 2 staff pulled back, 3 step in swinging, 4 staff HIT, arms fully extended, 5 follow-through, 6 back to ready. Draw the character ONLY: no slash arcs, no motion lines, no effects (the game adds them). Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ท่าสกิล (1 ท่าใช้กับทุกสกิล)** — แนบ `tpl_cast.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: SKILL pose (one pose used for every skill), 4 frames per direction: 1 ready, 2 gathering power, 3 release, 4 hold the final pose. The pose: golden staff raised overhead with both hands. Draw the character ONLY: no magic circles, no glow, no aura, no smoke, no effects (the game adds skill effects separately). Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **นั่ง + โดนตี** — แนบ `tpl_sit_hurt.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template.
Columns 1-2 SIT: sitting on the ground with legs folded, resting, bottom on the red line (the head is naturally BELOW the blue line when sitting). The 2 sit frames are almost identical (calm breathing only).
Columns 3-4 HURT (standing): 3 knocked back, body leaning away, visor flickers bright; 4 recovering back into stance. Hurt frames: top of the head on the blue line, feet on the red line.
Each row is a direction as labelled. Same character size as the walk sheet. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ล้ม** — แนบ `tpl_dead.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: DEAD, 4 frames per direction: 1 knees buckle, 2 falling to the ground, 3 lying FLAT on the ground (whole body resting on the red line, seen from the game's high 3/4 camera), 4 lying still with the visor dark (turned off). Only frame 1 reaches up toward the blue line; frames 2-4 are low on the red line. Each row is a direction as labelled. Same character size as the walk sheet. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

### Völva ชาย (นักพยากรณ์แห่งแสง) — `volva_m`

รูปอ้างอิงสำหรับภาพเดิน: `hero_volva_m.webp`

⬜ **เดิน (ภาพแรกของตัวละคร = แบบอ้างอิง)** — แนบ `tpl_walk.png` (4×5)

```
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Every character is an ANDROID: smooth white faceplate with ONE glowing visor strip, NO eyes, NO mouth. Chibi proportions (head about 1/3 of the body height), thick dark outline, 2-tone cel shading, modest outfit.
Character: male android VÖLVA priest: shoulder-length black hair with a gold headband, white-and-gold robe with Norse knot patterns, gold visor, golden staff with a sun-ring top. Use the attached character image for the design.
Draw a WALK cycle into the attached template, 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK).
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ยืนขาคู่** — แนบ `tpl_idle.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: IDLE standing pose, 4 frames per direction. Stands still with BOTH FEET TOGETHER side by side, both soles flat on the red line, legs straight, knees together, weapon held relaxed. Frames: 1 neutral, 2 breathe in (shoulders a tiny bit higher), 3 neutral, 4 breathe out. The legs and feet must NOT move between frames. Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **โจมตี** — แนบ `tpl_attack.png` (6×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: ATTACK, 6 frames per direction: 1 ready holding the staff, 2 staff pulled back, 3 step in swinging, 4 staff HIT, arms fully extended, 5 follow-through, 6 back to ready. Draw the character ONLY: no slash arcs, no motion lines, no effects (the game adds them). Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ท่าสกิล (1 ท่าใช้กับทุกสกิล)** — แนบ `tpl_cast.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: SKILL pose (one pose used for every skill), 4 frames per direction: 1 ready, 2 gathering power, 3 release, 4 hold the final pose. The pose: golden staff raised overhead with both hands. Draw the character ONLY: no magic circles, no glow, no aura, no smoke, no effects (the game adds skill effects separately). Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **นั่ง + โดนตี** — แนบ `tpl_sit_hurt.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template.
Columns 1-2 SIT: sitting on the ground with legs folded, resting, bottom on the red line (the head is naturally BELOW the blue line when sitting). The 2 sit frames are almost identical (calm breathing only).
Columns 3-4 HURT (standing): 3 knocked back, body leaning away, visor flickers bright; 4 recovering back into stance. Hurt frames: top of the head on the blue line, feet on the red line.
Each row is a direction as labelled. Same character size as the walk sheet. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ล้ม** — แนบ `tpl_dead.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: DEAD, 4 frames per direction: 1 knees buckle, 2 falling to the ground, 3 lying FLAT on the ground (whole body resting on the red line, seen from the game's high 3/4 camera), 4 lying still with the visor dark (turned off). Only frame 1 reaches up toward the blue line; frames 2-4 are low on the red line. Each row is a direction as labelled. Same character size as the walk sheet. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

### Loki's Trickster หญิง (นักลวง) — `trickster_f`

รูปอ้างอิงสำหรับภาพเดิน: `hero_trickster_f.webp`

⬜ **เดิน (ภาพแรกของตัวละคร = แบบอ้างอิง)** — แนบ `tpl_walk.png` (4×5)

```
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Every character is an ANDROID: smooth white faceplate with ONE glowing visor strip, NO eyes, NO mouth. Chibi proportions (head about 1/3 of the body height), thick dark outline, 2-tone cel shading, modest outfit.
Character: female android LOKI'S TRICKSTER rogue: long crimson hair plates in a high ponytail, purple visor, dark purple-black stealth suit with a ragged purple scarf and small green glowing accents, glowing violet dagger. Use the attached character image for the design.
Draw a WALK cycle into the attached template, 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK).
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ยืนขาคู่** — แนบ `tpl_idle.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: IDLE standing pose, 4 frames per direction. Stands still with BOTH FEET TOGETHER side by side, both soles flat on the red line, legs straight, knees together, weapon held relaxed. Frames: 1 neutral, 2 breathe in (shoulders a tiny bit higher), 3 neutral, 4 breathe out. The legs and feet must NOT move between frames. Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **โจมตี** — แนบ `tpl_attack.png` (6×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: ATTACK, 6 frames per direction: 1 ready, 2 pull back (dagger arm drawn far back), 3 lunge forward, 4 full SLASH, arm fully extended, 5 follow-through, 6 back to ready. Draw the character ONLY: no slash arcs, no motion lines, no effects (the game adds them). Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ท่าสกิล (1 ท่าใช้กับทุกสกิล)** — แนบ `tpl_cast.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: SKILL pose (one pose used for every skill), 4 frames per direction: 1 ready, 2 gathering power, 3 release, 4 hold the final pose. The pose: crouches low with the dagger held in reverse grip. Draw the character ONLY: no magic circles, no glow, no aura, no smoke, no effects (the game adds skill effects separately). Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **นั่ง + โดนตี** — แนบ `tpl_sit_hurt.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template.
Columns 1-2 SIT: sitting on the ground with legs folded, resting, bottom on the red line (the head is naturally BELOW the blue line when sitting). The 2 sit frames are almost identical (calm breathing only).
Columns 3-4 HURT (standing): 3 knocked back, body leaning away, visor flickers bright; 4 recovering back into stance. Hurt frames: top of the head on the blue line, feet on the red line.
Each row is a direction as labelled. Same character size as the walk sheet. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ล้ม** — แนบ `tpl_dead.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: DEAD, 4 frames per direction: 1 knees buckle, 2 falling to the ground, 3 lying FLAT on the ground (whole body resting on the red line, seen from the game's high 3/4 camera), 4 lying still with the visor dark (turned off). Only frame 1 reaches up toward the blue line; frames 2-4 are low on the red line. Each row is a direction as labelled. Same character size as the walk sheet. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

### Loki's Trickster ชาย (นักลวง) — `trickster_m`

รูปอ้างอิงสำหรับภาพเดิน: `hero_trickster_m.webp`

⬜ **เดิน (ภาพแรกของตัวละคร = แบบอ้างอิง)** — แนบ `tpl_walk.png` (4×5)

```
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Every character is an ANDROID: smooth white faceplate with ONE glowing visor strip, NO eyes, NO mouth. Chibi proportions (head about 1/3 of the body height), thick dark outline, 2-tone cel shading, modest outfit.
Character: male android LOKI'S TRICKSTER rogue: spiky crimson hair plates, purple visor, dark purple-black stealth suit with a ragged purple scarf and green glowing accents, glowing violet dagger. Use the attached character image for the design.
Draw a WALK cycle into the attached template, 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK).
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ยืนขาคู่** — แนบ `tpl_idle.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: IDLE standing pose, 4 frames per direction. Stands still with BOTH FEET TOGETHER side by side, both soles flat on the red line, legs straight, knees together, weapon held relaxed. Frames: 1 neutral, 2 breathe in (shoulders a tiny bit higher), 3 neutral, 4 breathe out. The legs and feet must NOT move between frames. Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **โจมตี** — แนบ `tpl_attack.png` (6×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: ATTACK, 6 frames per direction: 1 ready, 2 pull back (dagger arm drawn far back), 3 lunge forward, 4 full SLASH, arm fully extended, 5 follow-through, 6 back to ready. Draw the character ONLY: no slash arcs, no motion lines, no effects (the game adds them). Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ท่าสกิล (1 ท่าใช้กับทุกสกิล)** — แนบ `tpl_cast.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: SKILL pose (one pose used for every skill), 4 frames per direction: 1 ready, 2 gathering power, 3 release, 4 hold the final pose. The pose: crouches low with the dagger held in reverse grip. Draw the character ONLY: no magic circles, no glow, no aura, no smoke, no effects (the game adds skill effects separately). Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **นั่ง + โดนตี** — แนบ `tpl_sit_hurt.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template.
Columns 1-2 SIT: sitting on the ground with legs folded, resting, bottom on the red line (the head is naturally BELOW the blue line when sitting). The 2 sit frames are almost identical (calm breathing only).
Columns 3-4 HURT (standing): 3 knocked back, body leaning away, visor flickers bright; 4 recovering back into stance. Hurt frames: top of the head on the blue line, feet on the red line.
Each row is a direction as labelled. Same character size as the walk sheet. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ล้ม** — แนบ `tpl_dead.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: DEAD, 4 frames per direction: 1 knees buckle, 2 falling to the ground, 3 lying FLAT on the ground (whole body resting on the red line, seen from the game's high 3/4 camera), 4 lying still with the visor dark (turned off). Only frame 1 reaches up toward the blue line; frames 2-4 are low on the red line. Each row is a direction as labelled. Same character size as the walk sheet. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

### Berserker หญิง (นักรบคลั่ง) — `berserker_f`

รูปอ้างอิงสำหรับภาพเดิน: `hero_berserker_f.webp`

⬜ **เดิน (ภาพแรกของตัวละคร = แบบอ้างอิง)** — แนบ `tpl_walk.png` (4×5)

```
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Every character is an ANDROID: smooth white faceplate with ONE glowing visor strip, NO eyes, NO mouth. Chibi proportions (head about 1/3 of the body height), thick dark outline, 2-tone cel shading, modest outfit.
Character: female android BERSERKER: wolf-head pelt hood over long silver hair, orange visor, bronze-brown heavy armor trimmed with fur, huge glowing orange battle axe. Use the attached character image for the design.
Draw a WALK cycle into the attached template, 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK).
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ยืนขาคู่** — แนบ `tpl_idle.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: IDLE standing pose, 4 frames per direction. Stands still with BOTH FEET TOGETHER side by side, both soles flat on the red line, legs straight, knees together, weapon held relaxed. Frames: 1 neutral, 2 breathe in (shoulders a tiny bit higher), 3 neutral, 4 breathe out. The legs and feet must NOT move between frames. Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **โจมตี** — แนบ `tpl_attack.png` (6×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: ATTACK, 6 frames per direction: 1 ready, 2 axe raised overhead with both hands, 3 lunge forward, 4 heavy CHOP, axe head low in front, 5 follow-through low to the ground, 6 back to ready. Draw the character ONLY: no slash arcs, no motion lines, no effects (the game adds them). Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ท่าสกิล (1 ท่าใช้กับทุกสกิล)** — แนบ `tpl_cast.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: SKILL pose (one pose used for every skill), 4 frames per direction: 1 ready, 2 gathering power, 3 release, 4 hold the final pose. The pose: roars with the axe raised high over the head. Draw the character ONLY: no magic circles, no glow, no aura, no smoke, no effects (the game adds skill effects separately). Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **นั่ง + โดนตี** — แนบ `tpl_sit_hurt.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template.
Columns 1-2 SIT: sitting on the ground with legs folded, resting, bottom on the red line (the head is naturally BELOW the blue line when sitting). The 2 sit frames are almost identical (calm breathing only).
Columns 3-4 HURT (standing): 3 knocked back, body leaning away, visor flickers bright; 4 recovering back into stance. Hurt frames: top of the head on the blue line, feet on the red line.
Each row is a direction as labelled. Same character size as the walk sheet. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ล้ม** — แนบ `tpl_dead.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: DEAD, 4 frames per direction: 1 knees buckle, 2 falling to the ground, 3 lying FLAT on the ground (whole body resting on the red line, seen from the game's high 3/4 camera), 4 lying still with the visor dark (turned off). Only frame 1 reaches up toward the blue line; frames 2-4 are low on the red line. Each row is a direction as labelled. Same character size as the walk sheet. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

### Berserker ชาย (นักรบคลั่ง) — `berserker_m`

รูปอ้างอิงสำหรับภาพเดิน: `hero_berserker_m.webp`

⬜ **เดิน (ภาพแรกของตัวละคร = แบบอ้างอิง)** — แนบ `tpl_walk.png` (4×5)

```
2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. Every character is an ANDROID: smooth white faceplate with ONE glowing visor strip, NO eyes, NO mouth. Chibi proportions (head about 1/3 of the body height), thick dark outline, 2-tone cel shading, modest outfit.
Character: male android BERSERKER: wolf-head pelt hood, orange visor, very bulky bronze-brown heavy armor trimmed with fur, huge glowing orange battle axe. Use the attached character image for the design.
Draw a WALK cycle into the attached template, 4 frames per direction, legs clearly alternating: 1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; 3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK).
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ยืนขาคู่** — แนบ `tpl_idle.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: IDLE standing pose, 4 frames per direction. Stands still with BOTH FEET TOGETHER side by side, both soles flat on the red line, legs straight, knees together, weapon held relaxed. Frames: 1 neutral, 2 breathe in (shoulders a tiny bit higher), 3 neutral, 4 breathe out. The legs and feet must NOT move between frames. Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **โจมตี** — แนบ `tpl_attack.png` (6×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: ATTACK, 6 frames per direction: 1 ready, 2 axe raised overhead with both hands, 3 lunge forward, 4 heavy CHOP, axe head low in front, 5 follow-through low to the ground, 6 back to ready. Draw the character ONLY: no slash arcs, no motion lines, no effects (the game adds them). Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ท่าสกิล (1 ท่าใช้กับทุกสกิล)** — แนบ `tpl_cast.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: SKILL pose (one pose used for every skill), 4 frames per direction: 1 ready, 2 gathering power, 3 release, 4 hold the final pose. The pose: roars with the axe raised high over the head. Draw the character ONLY: no magic circles, no glow, no aura, no smoke, no effects (the game adds skill effects separately). Each row is a direction as labelled.
Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. Same character height in every cell. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **นั่ง + โดนตี** — แนบ `tpl_sit_hurt.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template.
Columns 1-2 SIT: sitting on the ground with legs folded, resting, bottom on the red line (the head is naturally BELOW the blue line when sitting). The 2 sit frames are almost identical (calm breathing only).
Columns 3-4 HURT (standing): 3 knocked back, body leaning away, visor flickers bright; 4 recovering back into stance. Hurt frames: top of the head on the blue line, feet on the red line.
Each row is a direction as labelled. Same character size as the walk sheet. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **ล้ม** — แนบ `tpl_dead.png` (4×5)

```
Draw this exact character (the attached walk sheet — same design, same colors, same size) into the attached template: DEAD, 4 frames per direction: 1 knees buckle, 2 falling to the ground, 3 lying FLAT on the ground (whole body resting on the red line, seen from the game's high 3/4 camera), 4 lying still with the visor dark (turned off). Only frame 1 reaches up toward the blue line; frames 2-4 are low on the red line. Each row is a direction as labelled. Same character size as the walk sheet. Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.
```

## มอนสเตอร์ (ตัวละ 1 ภาพ)

⬜ **Gel Unit** (Emerald Meadow) — แนบ `mobsprite_pudding.webp` + `tpl_mob.png`

```
Use the attached monster as the exact design (same colors, same size, same art style: cute chibi robot for a 2000s Korean MMORPG). This is Gel Unit.
Draw it into the attached 4x2 template, facing LEFT (3/4 view), bottom on the red line in every cell (even for jumps: the game adds the jump height itself).
Top row = MOVE loop, 4 frames: squash down, stretch up jumping, in the air, landing squash.
Bottom row = ATTACK, 4 frames: squash low, lunge forward stretched, SPLAT hit, bounce back.
Every frame clearly different. Leave clear space between cells. Flat white background, do NOT draw the labels, grid or guide lines.
```

✅ **Crawler Unit** (Emerald Meadow) — แนบ `mobsprite_leafworm.webp` + `tpl_mob.png`

✅ **Bunny Unit** (Emerald Meadow) — แนบ `mobsprite_moonbun.webp` + `tpl_mob.png`

⬜ **Ember Unit** (Emerald Meadow) — แนบ `mobsprite_ember_pudding.webp` + `tpl_mob.png`

```
Use the attached monster as the exact design (same colors, same size, same art style: cute chibi robot for a 2000s Korean MMORPG). This is Ember Unit.
Draw it into the attached 4x2 template, facing LEFT (3/4 view), bottom on the red line in every cell (even for jumps: the game adds the jump height itself).
Top row = MOVE loop, 4 frames: squash and jump like a slime, the antenna flame flickers.
Bottom row = ATTACK, 4 frames: squash low, lunge forward, SPLAT hit, bounce back.
Every frame clearly different. Leave clear space between cells. Flat white background, do NOT draw the labels, grid or guide lines.
```

✅ **Buzz Unit** (Emerald Meadow) — แนบ `mobsprite_buzzfly.webp` + `tpl_mob.png`

✅ **Rust Sentry** (Mistlake Plains) — แนบ `mobsprite_stumpling.webp` + `tpl_mob.png`

⬜ **Hopper Unit** (Mistlake Plains) — แนบ `mobsprite_fiddlehopper.webp` + `tpl_mob.png`

```
Use the attached monster as the exact design (same colors, same size, same art style: cute chibi robot for a 2000s Korean MMORPG). This is Hopper Unit.
Draw it into the attached 4x2 template, facing LEFT (3/4 view), bottom on the red line in every cell (even for jumps: the game adds the jump height itself).
Top row = MOVE loop, 4 frames: crouch, big grasshopper hop, in the air, land (keep the violin).
Bottom row = ATTACK, 4 frames: crouch, leap forward, kick with the long hind legs, land.
Every frame clearly different. Leave clear space between cells. Flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **Mine Unit** (Mistlake Plains) — แนบ `mobsprite_capshroom.webp` + `tpl_mob.png`

```
Use the attached monster as the exact design (same colors, same size, same art style: cute chibi robot for a 2000s Korean MMORPG). This is Mine Unit.
Draw it into the attached 4x2 template, facing LEFT (3/4 view), bottom on the red line in every cell (even for jumps: the game adds the jump height itself).
Top row = MOVE loop, 4 frames: waddles on its little red boots, the siren light blinks.
Bottom row = ATTACK, 4 frames: cap puffs up big, siren light turns red, cap slams forward, deflate.
Every frame clearly different. Leave clear space between cells. Flat white background, do NOT draw the labels, grid or guide lines.
```

⬜ **Moss Unit** (Mistlake Plains) — แนบ `mobsprite_moss_pudding.webp` + `tpl_mob.png`

```
Use the attached monster as the exact design (same colors, same size, same art style: cute chibi robot for a 2000s Korean MMORPG). This is Moss Unit.
Draw it into the attached 4x2 template, facing LEFT (3/4 view), bottom on the red line in every cell (even for jumps: the game adds the jump height itself).
Top row = MOVE loop, 4 frames: squash and jump like a slime, the clover leaf bounces.
Bottom row = ATTACK, 4 frames: squash low, lunge forward, SPLAT hit, bounce back.
Every frame clearly different. Leave clear space between cells. Flat white background, do NOT draw the labels, grid or guide lines.
```

✅ **Seraph Core (MVP)** (Mistlake Plains) — แนบ `mobsprite_seraph_pudding.webp` + `tpl_mob.png`

✅ **Ash Stalker** (Wolfwood Forest) — แนบ `mobsprite_ashtail.webp` + `tpl_mob.png`

✅ **Fenrir Unit** (Wolfwood Forest) — แนบ `mobsprite_fenrir_pup.webp` + `tpl_mob.png`

✅ **Iron Brute** (Wolfwood Forest) — แนบ `mobsprite_mossback.webp` + `tpl_mob.png`

✅ **Tusk Trooper** (Wolfwood Forest) — แนบ `mobsprite_tuskboar.webp` + `tpl_mob.png`

✅ **Draugr Husk** (Hel's Hollow) — แนบ `mobsprite_draugr.webp` + `tpl_mob.png`

✅ **Frame Warden** (Hel's Hollow) — แนบ `mobsprite_bone_warden.webp` + `tpl_mob.png`

✅ **Hel Maiden Unit** (Hel's Hollow) — แนบ `mobsprite_hel_maiden.webp` + `tpl_mob.png`

⬜ **Hel Guard Unit** (Hel's Hollow) — แนบ `mobsprite_hel_guard.webp` + `tpl_mob.png`

```
Use the attached monster as the exact design (same colors, same size, same art style: cute chibi robot for a 2000s Korean MMORPG). This is Hel Guard Unit.
Draw it into the attached 4x2 template, facing LEFT (3/4 view), bottom on the red line in every cell (even for jumps: the game adds the jump height itself).
Top row = MOVE loop, 4 frames: heavy armored march, cape swaying, halberd upright.
Bottom row = ATTACK, 4 frames: halberd raised overhead, step in, heavy CLEAVE, recover.
Every frame clearly different. Leave clear space between cells. Flat white background, do NOT draw the labels, grid or guide lines.
```

✅ **Kitsura EX (MVP)** (Hel's Hollow) — แนบ `mobsprite_kitsura.webp` + `tpl_mob.png`

## NPC

⬜ **Storage Unit Kaia** — แนบรูป NPC ตัวไหนก็ได้ 1 รูปเป็นแบบสไตล์

```
In-game character sprite for a cute classic 2000s Korean MMORPG (chibi, about 2.5 heads tall), same art style as the attached NPC.
Storage Unit Kaia: friendly feminine android warehouse clerk. Smooth white faceplate with ONE glowing teal visor strip, NO eyes, NO mouth.
Dark navy hair plates in a low ponytail, small red ribbon, navy-and-cream clerk uniform with a short cape, a floating holographic crate icon beside her hand, a little cargo drone on her shoulder.
Single full-body figure, 3/4 view FACING LEFT, standing, centered. Fully transparent background, cel-shaded, crisp dark outline, readable at 64 px. No text, no shadow.
```
