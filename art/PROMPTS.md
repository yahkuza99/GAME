# NEO MIDGARD — ชุด prompt สำหรับสร้างภาพด้วย ChatGPT

วิธีใช้:
1. เปิดแชทใหม่ใน ChatGPT แล้ววาง prompt ทีละอัน (แชทเดียวกันทั้งหมด ภาพจะออกมาสไตล์เดียวกัน)
2. ถ้าภาพไหนไม่ถูกใจ พิมพ์ต่อว่า "same style, regenerate" หรือบอกสิ่งที่อยากแก้
3. ดาวน์โหลดภาพเป็น PNG แล้ว **ตั้งชื่อไฟล์ตามที่ระบุ** ใส่ในโฟลเดอร์ `assets/` (หรือส่งภาพมาในแชทให้ Claude ใส่ให้)
4. เกมจะใช้ภาพอัตโนมัติ ภาพไหนยังไม่มีจะใช้ภาพวาดด้วยโค้ดแทน

| ไฟล์ | ใช้ที่ไหนในเกม |
|---|---|
| `keyart.png`, `logo.png` | หน้าไตเติล |
| `job_<อาชีพ>_f.png` / `_m.png` | รูปโปรไฟล์ในแผงสถานะ + ตอนเลือกอาชีพกับ Mimir AI |
| `npc_<id>.png` | ภาพตัวละครข้างกล่องบทสนทนา |
| `mvp_<id>.png` | ฉากเปิดตัวบอสเต็มจอ |

## ภาพหน้าปก

### `keyart.png` — แนวนอน 3:2 (1536x1024) • พื้นหลัง: มีฉากหลัง

```
Anime gacha game character art, polished cel shading with soft gradient lighting, crisp clean lineart, highly detailed, sci-fi Norse mythology fusion world called NEO MIDGARD. Android design: smooth synthetic porcelain skin with very subtle thin panel seam lines on the cheeks and neck, mechanical ear headset pieces with a small glowing core and short antenna fins, visible mechanical joints at the elbows and knees, thin glowing circuit lines on the armor. Tasteful, full-coverage outfit, confident heroic pose, not sexualized. No text, no watermark, no logo. Key visual: six android heroes (a red-caped knight, a blue rune mage, a green-hooded ranger, a white-and-gold priestess, a purple stealth rogue, and a bronze wolf-hooded berserker) standing together on a cliff at twilight, looking over a futuristic city with metal buildings, neon lights and a giant glowing cyan energy core tower; a shimmering rainbow light bridge (Bifrost) arcs across the sky; aurora and stars. Epic cinematic composition, leave clear empty sky in the upper center for a title logo. Horizontal 3:2 image (1536x1024).
```

### `logo.png` — แนวนอน 3:2 (1536x1024) • พื้นหลัง: โปร่งใส

```
Game title logo that reads exactly "NEO MIDGARD" in bold futuristic letters, chrome steel metal with a glowing cyan neon edge, small Norse rune accents and a subtle circuit-line pattern, a thin horizontal energy line under the text. Centered, transparent background (PNG), no other text. Horizontal 3:2 image (1536x1024).
```

## ตัวละครอาชีพ (หญิง)

### `job_novice_f.png` — แนวตั้ง 2:3 (1024x1536) • พื้นหลัง: โปร่งใส

```
Anime gacha game character art, polished cel shading with soft gradient lighting, crisp clean lineart, highly detailed, sci-fi Norse mythology fusion world called NEO MIDGARD. Android design: smooth synthetic porcelain skin with very subtle thin panel seam lines on the cheeks and neck, mechanical ear headset pieces with a small glowing core and short antenna fins, visible mechanical joints at the elbows and knees, thin glowing circuit lines on the armor. Tasteful, full-coverage outfit, confident heroic pose, not sexualized. No text, no watermark, no logo. Character: a rookie android, an anime android girl, long golden-blonde hair, glowing cyan irises, light khaki utility jacket over a white and graphite bodysuit, fingerless gloves, small combat knife at the hip. Full body, head to toe fully visible, standing in a 3/4 view facing the viewer, centered with a little empty space around the figure, transparent background (PNG), vertical 2:3 image (1024x1536).
```

### `job_einherjar_f.png` — แนวตั้ง 2:3 (1024x1536) • พื้นหลัง: โปร่งใส

```
Anime gacha game character art, polished cel shading with soft gradient lighting, crisp clean lineart, highly detailed, sci-fi Norse mythology fusion world called NEO MIDGARD. Android design: smooth synthetic porcelain skin with very subtle thin panel seam lines on the cheeks and neck, mechanical ear headset pieces with a small glowing core and short antenna fins, visible mechanical joints at the elbows and knees, thin glowing circuit lines on the armor. Tasteful, full-coverage outfit, confident heroic pose, not sexualized. No text, no watermark, no logo. Character: an armored knight android (tank class), an anime android girl, long dark brown hair, glowing red irises, heavy steel plate armor with red trim, a flowing crimson cape, horned Viking-style steel helmet, a broad energy sword with a glowing red edge and a round tech shield. Full body, head to toe fully visible, standing in a 3/4 view facing the viewer, centered with a little empty space around the figure, transparent background (PNG), vertical 2:3 image (1024x1536).
```

### `job_runecaster_f.png` — แนวตั้ง 2:3 (1024x1536) • พื้นหลัง: โปร่งใส

```
Anime gacha game character art, polished cel shading with soft gradient lighting, crisp clean lineart, highly detailed, sci-fi Norse mythology fusion world called NEO MIDGARD. Android design: smooth synthetic porcelain skin with very subtle thin panel seam lines on the cheeks and neck, mechanical ear headset pieces with a small glowing core and short antenna fins, visible mechanical joints at the elbows and knees, thin glowing circuit lines on the armor. Tasteful, full-coverage outfit, confident heroic pose, not sexualized. No text, no watermark, no logo. Character: a rune mage android, an anime android girl, long deep blue hair, glowing light blue irises, deep navy blue hooded long coat covered in glowing blue Norse rune glyphs, holding a tall staff topped with a floating cyan energy orb, small runes orbiting her hand. Full body, head to toe fully visible, standing in a 3/4 view facing the viewer, centered with a little empty space around the figure, transparent background (PNG), vertical 2:3 image (1024x1536).
```

### `job_wildhunter_f.png` — แนวตั้ง 2:3 (1024x1536) • พื้นหลัง: โปร่งใส

```
Anime gacha game character art, polished cel shading with soft gradient lighting, crisp clean lineart, highly detailed, sci-fi Norse mythology fusion world called NEO MIDGARD. Android design: smooth synthetic porcelain skin with very subtle thin panel seam lines on the cheeks and neck, mechanical ear headset pieces with a small glowing core and short antenna fins, visible mechanical joints at the elbows and knees, thin glowing circuit lines on the armor. Tasteful, full-coverage outfit, confident heroic pose, not sexualized. No text, no watermark, no logo. Character: a ranger android, an anime android girl, long blonde hair in a side braid, glowing green irises, forest green hooded cloak over light armor with tan leather straps, an energy longbow with a glowing green bowstring, a quiver of light arrows. Full body, head to toe fully visible, standing in a 3/4 view facing the viewer, centered with a little empty space around the figure, transparent background (PNG), vertical 2:3 image (1024x1536).
```

### `job_volva_f.png` — แนวตั้ง 2:3 (1024x1536) • พื้นหลัง: โปร่งใส

```
Anime gacha game character art, polished cel shading with soft gradient lighting, crisp clean lineart, highly detailed, sci-fi Norse mythology fusion world called NEO MIDGARD. Android design: smooth synthetic porcelain skin with very subtle thin panel seam lines on the cheeks and neck, mechanical ear headset pieces with a small glowing core and short antenna fins, visible mechanical joints at the elbows and knees, thin glowing circuit lines on the armor. Tasteful, full-coverage outfit, confident heroic pose, not sexualized. No text, no watermark, no logo. Character: a seer priestess android (healer class), an anime android girl, very long straight black hair, glowing golden irises, white and gold flowing robe with gold filigree armor pieces, a gold circlet with a glowing blue gem, holding a short golden scepter-mace, soft golden holy light particles. Full body, head to toe fully visible, standing in a 3/4 view facing the viewer, centered with a little empty space around the figure, transparent background (PNG), vertical 2:3 image (1024x1536).
```

### `job_trickster_f.png` — แนวตั้ง 2:3 (1024x1536) • พื้นหลัง: โปร่งใส

```
Anime gacha game character art, polished cel shading with soft gradient lighting, crisp clean lineart, highly detailed, sci-fi Norse mythology fusion world called NEO MIDGARD. Android design: smooth synthetic porcelain skin with very subtle thin panel seam lines on the cheeks and neck, mechanical ear headset pieces with a small glowing core and short antenna fins, visible mechanical joints at the elbows and knees, thin glowing circuit lines on the armor. Tasteful, full-coverage outfit, confident heroic pose, not sexualized. No text, no watermark, no logo. Character: a stealth rogue android, an anime android girl, long crimson red hair in a high ponytail, glowing violet irises, sleek dark purple stealth suit with a half-face mask visor over the lower face, twin daggers with violet energy edges, green accent lights on the suit. Full body, head to toe fully visible, standing in a 3/4 view facing the viewer, centered with a little empty space around the figure, transparent background (PNG), vertical 2:3 image (1024x1536).
```

### `job_berserker_f.png` — แนวตั้ง 2:3 (1024x1536) • พื้นหลัง: โปร่งใส

```
Anime gacha game character art, polished cel shading with soft gradient lighting, crisp clean lineart, highly detailed, sci-fi Norse mythology fusion world called NEO MIDGARD. Android design: smooth synthetic porcelain skin with very subtle thin panel seam lines on the cheeks and neck, mechanical ear headset pieces with a small glowing core and short antenna fins, visible mechanical joints at the elbows and knees, thin glowing circuit lines on the armor. Tasteful, full-coverage outfit, confident heroic pose, not sexualized. No text, no watermark, no logo. Character: a berserker warrior android, an anime android girl, long wild silver hair, glowing orange irises, rugged bronze and brown armor, a hood shaped like a wolf head made of metal plates, a huge two-handed energy axe with a glowing orange edge, sparks and embers. Full body, head to toe fully visible, standing in a 3/4 view facing the viewer, centered with a little empty space around the figure, transparent background (PNG), vertical 2:3 image (1024x1536).
```

## ตัวละครอาชีพ (ชาย)

### `job_novice_m.png` — แนวตั้ง 2:3 (1024x1536) • พื้นหลัง: โปร่งใส

```
Anime gacha game character art, polished cel shading with soft gradient lighting, crisp clean lineart, highly detailed, sci-fi Norse mythology fusion world called NEO MIDGARD. Android design: smooth synthetic porcelain skin with very subtle thin panel seam lines on the cheeks and neck, mechanical ear headset pieces with a small glowing core and short antenna fins, visible mechanical joints at the elbows and knees, thin glowing circuit lines on the armor. Tasteful, full-coverage outfit, confident heroic pose, not sexualized. No text, no watermark, no logo. Character: a rookie android, an anime android young man, short tousled golden-blonde hair, glowing cyan irises, light khaki utility jacket over a white and graphite bodysuit, fingerless gloves, small combat knife at the hip. Full body, head to toe fully visible, standing in a 3/4 view facing the viewer, centered with a little empty space around the figure, transparent background (PNG), vertical 2:3 image (1024x1536).
```

### `job_einherjar_m.png` — แนวตั้ง 2:3 (1024x1536) • พื้นหลัง: โปร่งใส

```
Anime gacha game character art, polished cel shading with soft gradient lighting, crisp clean lineart, highly detailed, sci-fi Norse mythology fusion world called NEO MIDGARD. Android design: smooth synthetic porcelain skin with very subtle thin panel seam lines on the cheeks and neck, mechanical ear headset pieces with a small glowing core and short antenna fins, visible mechanical joints at the elbows and knees, thin glowing circuit lines on the armor. Tasteful, full-coverage outfit, confident heroic pose, not sexualized. No text, no watermark, no logo. Character: an armored knight android (tank class), an anime android young man, short dark brown hair, glowing red irises, heavy steel plate armor with red trim, a flowing crimson cape, horned Viking-style steel helmet, a broad energy sword with a glowing red edge and a round tech shield. Full body, head to toe fully visible, standing in a 3/4 view facing the viewer, centered with a little empty space around the figure, transparent background (PNG), vertical 2:3 image (1024x1536).
```

### `job_runecaster_m.png` — แนวตั้ง 2:3 (1024x1536) • พื้นหลัง: โปร่งใส

```
Anime gacha game character art, polished cel shading with soft gradient lighting, crisp clean lineart, highly detailed, sci-fi Norse mythology fusion world called NEO MIDGARD. Android design: smooth synthetic porcelain skin with very subtle thin panel seam lines on the cheeks and neck, mechanical ear headset pieces with a small glowing core and short antenna fins, visible mechanical joints at the elbows and knees, thin glowing circuit lines on the armor. Tasteful, full-coverage outfit, confident heroic pose, not sexualized. No text, no watermark, no logo. Character: a rune mage android, an anime android young man, short deep blue hair, glowing light blue irises, deep navy blue hooded long coat covered in glowing blue Norse rune glyphs, holding a tall staff topped with a floating cyan energy orb, small runes orbiting her hand. Full body, head to toe fully visible, standing in a 3/4 view facing the viewer, centered with a little empty space around the figure, transparent background (PNG), vertical 2:3 image (1024x1536).
```

### `job_wildhunter_m.png` — แนวตั้ง 2:3 (1024x1536) • พื้นหลัง: โปร่งใส

```
Anime gacha game character art, polished cel shading with soft gradient lighting, crisp clean lineart, highly detailed, sci-fi Norse mythology fusion world called NEO MIDGARD. Android design: smooth synthetic porcelain skin with very subtle thin panel seam lines on the cheeks and neck, mechanical ear headset pieces with a small glowing core and short antenna fins, visible mechanical joints at the elbows and knees, thin glowing circuit lines on the armor. Tasteful, full-coverage outfit, confident heroic pose, not sexualized. No text, no watermark, no logo. Character: a ranger android, an anime android young man, short blonde hair, glowing green irises, forest green hooded cloak over light armor with tan leather straps, an energy longbow with a glowing green bowstring, a quiver of light arrows. Full body, head to toe fully visible, standing in a 3/4 view facing the viewer, centered with a little empty space around the figure, transparent background (PNG), vertical 2:3 image (1024x1536).
```

### `job_volva_m.png` — แนวตั้ง 2:3 (1024x1536) • พื้นหลัง: โปร่งใส

```
Anime gacha game character art, polished cel shading with soft gradient lighting, crisp clean lineart, highly detailed, sci-fi Norse mythology fusion world called NEO MIDGARD. Android design: smooth synthetic porcelain skin with very subtle thin panel seam lines on the cheeks and neck, mechanical ear headset pieces with a small glowing core and short antenna fins, visible mechanical joints at the elbows and knees, thin glowing circuit lines on the armor. Tasteful, full-coverage outfit, confident heroic pose, not sexualized. No text, no watermark, no logo. Character: a seer priestess android (healer class), an anime android young man, shoulder-length black hair, glowing golden irises, white and gold flowing robe with gold filigree armor pieces, a gold circlet with a glowing blue gem, holding a short golden scepter-mace, soft golden holy light particles. Full body, head to toe fully visible, standing in a 3/4 view facing the viewer, centered with a little empty space around the figure, transparent background (PNG), vertical 2:3 image (1024x1536).
```

### `job_trickster_m.png` — แนวตั้ง 2:3 (1024x1536) • พื้นหลัง: โปร่งใส

```
Anime gacha game character art, polished cel shading with soft gradient lighting, crisp clean lineart, highly detailed, sci-fi Norse mythology fusion world called NEO MIDGARD. Android design: smooth synthetic porcelain skin with very subtle thin panel seam lines on the cheeks and neck, mechanical ear headset pieces with a small glowing core and short antenna fins, visible mechanical joints at the elbows and knees, thin glowing circuit lines on the armor. Tasteful, full-coverage outfit, confident heroic pose, not sexualized. No text, no watermark, no logo. Character: a stealth rogue android, an anime android young man, short messy crimson red hair, glowing violet irises, sleek dark purple stealth suit with a half-face mask visor over the lower face, twin daggers with violet energy edges, green accent lights on the suit. Full body, head to toe fully visible, standing in a 3/4 view facing the viewer, centered with a little empty space around the figure, transparent background (PNG), vertical 2:3 image (1024x1536).
```

### `job_berserker_m.png` — แนวตั้ง 2:3 (1024x1536) • พื้นหลัง: โปร่งใส

```
Anime gacha game character art, polished cel shading with soft gradient lighting, crisp clean lineart, highly detailed, sci-fi Norse mythology fusion world called NEO MIDGARD. Android design: smooth synthetic porcelain skin with very subtle thin panel seam lines on the cheeks and neck, mechanical ear headset pieces with a small glowing core and short antenna fins, visible mechanical joints at the elbows and knees, thin glowing circuit lines on the armor. Tasteful, full-coverage outfit, confident heroic pose, not sexualized. No text, no watermark, no logo. Character: a berserker warrior android, an anime android young man, short spiky silver hair, glowing orange irises, rugged bronze and brown armor, a hood shaped like a wolf head made of metal plates, a huge two-handed energy axe with a glowing orange edge, sparks and embers. Full body, head to toe fully visible, standing in a 3/4 view facing the viewer, centered with a little empty space around the figure, transparent background (PNG), vertical 2:3 image (1024x1536).
```

## NPC

### `npc_bifrost.png` — แนวตั้ง 2:3 (1024x1536) • พื้นหลัง: โปร่งใส

```
Anime gacha game character art, polished cel shading with soft gradient lighting, crisp clean lineart, highly detailed, sci-fi Norse mythology fusion world called NEO MIDGARD. Android design: smooth synthetic porcelain skin with very subtle thin panel seam lines on the cheeks and neck, mechanical ear headset pieces with a small glowing core and short antenna fins, visible mechanical joints at the elbows and knees, thin glowing circuit lines on the armor. Tasteful, full-coverage outfit, confident heroic pose, not sexualized. No text, no watermark, no logo. Character: Bifrost Keeper, a calm android woman who operates the teleport network: long lavender hair, navy robe with gold trim, a rainbow-striped headband, a holographic rainbow ring floating behind her, violet glowing eyes. Full body, head to toe fully visible, standing in a 3/4 view facing the viewer, centered with a little empty space around the figure, transparent background (PNG), vertical 2:3 image (1024x1536).
```

### `npc_jobmaster.png` — แนวตั้ง 2:3 (1024x1536) • พื้นหลัง: โปร่งใส

```
Anime gacha game character art, polished cel shading with soft gradient lighting, crisp clean lineart, highly detailed, sci-fi Norse mythology fusion world called NEO MIDGARD. Android design: smooth synthetic porcelain skin with very subtle thin panel seam lines on the cheeks and neck, mechanical ear headset pieces with a small glowing core and short antenna fins, visible mechanical joints at the elbows and knees, thin glowing circuit lines on the armor. Tasteful, full-coverage outfit, confident heroic pose, not sexualized. No text, no watermark, no logo. Character: Mimir AI, an elderly wise android sage: grey hooded navy robe with glowing blue rune lines, a beard-shaped silver speaker grille on the chin, floating holographic rune tablets around him, cyan glowing eyes. Full body, head to toe fully visible, standing in a 3/4 view facing the viewer, centered with a little empty space around the figure, transparent background (PNG), vertical 2:3 image (1024x1536).
```

### `npc_tool.png` — แนวตั้ง 2:3 (1024x1536) • พื้นหลัง: โปร่งใส

```
Anime gacha game character art, polished cel shading with soft gradient lighting, crisp clean lineart, highly detailed, sci-fi Norse mythology fusion world called NEO MIDGARD. Android design: smooth synthetic porcelain skin with very subtle thin panel seam lines on the cheeks and neck, mechanical ear headset pieces with a small glowing core and short antenna fins, visible mechanical joints at the elbows and knees, thin glowing circuit lines on the armor. Tasteful, full-coverage outfit, confident heroic pose, not sexualized. No text, no watermark, no logo. Character: a cheerful supply shop android merchant: red bandana, brown work jacket with a canvas apron full of pockets, holding a repair kit in one hand and a glowing blue energy cell in the other, amber glowing eyes. Full body, head to toe fully visible, standing in a 3/4 view facing the viewer, centered with a little empty space around the figure, transparent background (PNG), vertical 2:3 image (1024x1536).
```

### `npc_weapon.png` — แนวตั้ง 2:3 (1024x1536) • พื้นหลัง: โปร่งใส

```
Anime gacha game character art, polished cel shading with soft gradient lighting, crisp clean lineart, highly detailed, sci-fi Norse mythology fusion world called NEO MIDGARD. Android design: smooth synthetic porcelain skin with very subtle thin panel seam lines on the cheeks and neck, mechanical ear headset pieces with a small glowing core and short antenna fins, visible mechanical joints at the elbows and knees, thin glowing circuit lines on the armor. Tasteful, full-coverage outfit, confident heroic pose, not sexualized. No text, no watermark, no logo. Character: a gruff weaponsmith android: spiky dark hair, grey work armor with a soot-stained apron, holding up a freshly forged energy sword, orange glowing eyes. Full body, head to toe fully visible, standing in a 3/4 view facing the viewer, centered with a little empty space around the figure, transparent background (PNG), vertical 2:3 image (1024x1536).
```

### `npc_armor.png` — แนวตั้ง 2:3 (1024x1536) • พื้นหลัง: โปร่งใส

```
Anime gacha game character art, polished cel shading with soft gradient lighting, crisp clean lineart, highly detailed, sci-fi Norse mythology fusion world called NEO MIDGARD. Android design: smooth synthetic porcelain skin with very subtle thin panel seam lines on the cheeks and neck, mechanical ear headset pieces with a small glowing core and short antenna fins, visible mechanical joints at the elbows and knees, thin glowing circuit lines on the armor. Tasteful, full-coverage outfit, confident heroic pose, not sexualized. No text, no watermark, no logo. Character: a friendly armor shop android girl: green twin-tail hair, green and cream robe, showing off a shiny armor chest plate, green glowing eyes. Full body, head to toe fully visible, standing in a 3/4 view facing the viewer, centered with a little empty space around the figure, transparent background (PNG), vertical 2:3 image (1024x1536).
```

### `npc_refine.png` — แนวตั้ง 2:3 (1024x1536) • พื้นหลัง: โปร่งใส

```
Anime gacha game character art, polished cel shading with soft gradient lighting, crisp clean lineart, highly detailed, sci-fi Norse mythology fusion world called NEO MIDGARD. Android design: smooth synthetic porcelain skin with very subtle thin panel seam lines on the cheeks and neck, mechanical ear headset pieces with a small glowing core and short antenna fins, visible mechanical joints at the elbows and knees, thin glowing circuit lines on the armor. Tasteful, full-coverage outfit, confident heroic pose, not sexualized. No text, no watermark, no logo. Character: Brokk Forge-Bot, a stocky dwarf-like forge robot with a bronze metal body, a rust-red beard made of metal plates, a glowing orange furnace in his chest, carrying a huge forge hammer. Full body, head to toe fully visible, standing in a 3/4 view facing the viewer, centered with a little empty space around the figure, transparent background (PNG), vertical 2:3 image (1024x1536).
```

### `npc_nurse.png` — แนวตั้ง 2:3 (1024x1536) • พื้นหลัง: โปร่งใส

```
Anime gacha game character art, polished cel shading with soft gradient lighting, crisp clean lineart, highly detailed, sci-fi Norse mythology fusion world called NEO MIDGARD. Android design: smooth synthetic porcelain skin with very subtle thin panel seam lines on the cheeks and neck, mechanical ear headset pieces with a small glowing core and short antenna fins, visible mechanical joints at the elbows and knees, thin glowing circuit lines on the armor. Tasteful, full-coverage outfit, confident heroic pose, not sexualized. No text, no watermark, no logo. Character: Eir Repair Unit, a kind nurse android: long pink hair, white and pink medical outfit with a small nurse cap marked with a cross, holding glowing repair tools, pink glowing eyes. Full body, head to toe fully visible, standing in a 3/4 view facing the viewer, centered with a little empty space around the figure, transparent background (PNG), vertical 2:3 image (1024x1536).
```

### `npc_guide.png` — แนวตั้ง 2:3 (1024x1536) • พื้นหลัง: โปร่งใส

```
Anime gacha game character art, polished cel shading with soft gradient lighting, crisp clean lineart, highly detailed, sci-fi Norse mythology fusion world called NEO MIDGARD. Android design: smooth synthetic porcelain skin with very subtle thin panel seam lines on the cheeks and neck, mechanical ear headset pieces with a small glowing core and short antenna fins, visible mechanical joints at the elbows and knees, thin glowing circuit lines on the armor. Tasteful, full-coverage outfit, confident heroic pose, not sexualized. No text, no watermark, no logo. Character: Guard Unit Rolf, a loyal city guard android: silver-grey hair, horned Viking-style steel helmet, steel armor with a red cape, holding a tall energy spear, red glowing eyes, friendly salute. Full body, head to toe fully visible, standing in a 3/4 view facing the viewer, centered with a little empty space around the figure, transparent background (PNG), vertical 2:3 image (1024x1536).
```

## บอส MVP

### `mvp_seraph_pudding.png` — แนวนอน 3:2 (1536x1024) • พื้นหลัง: มีฉากหลัง

```
Anime gacha game character art, polished cel shading with soft gradient lighting, crisp clean lineart, highly detailed, sci-fi Norse mythology fusion world called NEO MIDGARD. Android design: smooth synthetic porcelain skin with very subtle thin panel seam lines on the cheeks and neck, mechanical ear headset pieces with a small glowing core and short antenna fins, visible mechanical joints at the elbows and knees, thin glowing circuit lines on the armor. Tasteful, full-coverage outfit, confident heroic pose, not sexualized. No text, no watermark, no logo. Boss splash art: SERAPH CORE, a giant angelic hovering robot drone shaped like a smooth pearl-white dome with a glowing cyan sensor band across its front, huge mechanical angel wings made of white metal feather plates with gold edges, a golden halo ring above it, floating above misty lakes and green plains, dramatic light rays from the clouds, epic boss reveal. Horizontal 3:2 image (1536x1024).
```

### `mvp_kitsura.png` — แนวนอน 3:2 (1536x1024) • พื้นหลัง: มีฉากหลัง

```
Anime gacha game character art, polished cel shading with soft gradient lighting, crisp clean lineart, highly detailed, sci-fi Norse mythology fusion world called NEO MIDGARD. Android design: smooth synthetic porcelain skin with very subtle thin panel seam lines on the cheeks and neck, mechanical ear headset pieces with a small glowing core and short antenna fins, visible mechanical joints at the elbows and knees, thin glowing circuit lines on the armor. Tasteful, full-coverage outfit, confident heroic pose, not sexualized. No text, no watermark, no logo. Boss splash art: KITSURA EX, a fox-girl android boss with orange hair, metal fox ears, sleek orange and white armor, nine long metallic fox tails with glowing orange lines, surrounded by swirling fire, dramatic battle pose, inside a dark cave with glowing purple crystals and circuit lines on the floor, epic boss reveal. Horizontal 3:2 image (1536x1024).
```
