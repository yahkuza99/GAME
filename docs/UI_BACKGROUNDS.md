# ภาพพื้นหลัง UI ที่เจ้าของทำให้ได้ (ChatGPT) — 2026-10-03

เจ้าของ: "แบ็กกราวนด์บอกผมได้ เดี๋ยวทำให้" • กรอบ/ปุ่ม/แท็บ Claude ทำเอง (Blender + โค้ด) — ภาพในรายการนี้เป็น **พื้นหลังล้วน**

**กติการวมทุกภาพ**
- ไม่มีตัวอักษร/โลโก้/ลายน้ำ • ไม่มีกรอบหรือปุ่ม UI ในภาพ • ไม่มีตัวละคร (ตัวละครเกมวาดทับเอง)
- สไตล์: premium 3D painterly กลิ่น Ragnarok • โลก Norse + แอนดรอยด์ (IRON VALHALLA) • แสงหลักอุ่นจาก **ซ้ายบน**
- ภาพที่มีข้อความทับ (หน้าต่าง) ต้อง **คอนทราสต์ต่ำ** ตรงกลางเรียบ
- ส่งในแชต หรือวางที่ `art/ui_bg/<ชื่อไฟล์>.png` แล้ว push → Claude ครอป/บีบไฟล์/ติดตั้งเอง (ใส่ทีละภาพได้ ไม่ต้องครบ)

## ลำดับแนะนำ

| # | ไฟล์ | ใช้ที่ | ขนาด | ความสำคัญ |
|---|---|---|---|---|
| 1 | `ui_bg_title` | หน้าล็อกอิน/หน้าแรก (ตอนนี้วาดด้วยโค้ด) | 1920×1080 | ★★★ |
| 2 | `ui_bg_charsel` | เลือก/สร้างตัวละคร | 1920×1080 | ★★★ |
| 3 | `map_arena`, `map_archive`, `map_roots`, `map_abyss` | ป้ายชื่อแผนที่ตอนเข้าแมพ (มีแล้ว 5 แมพ ขาด 4) | 1536×1024 | ★★★ |
| 4 | `ui_bg_parchment` | พื้นกระดาษในหน้าต่างทุกบาน | 1024×1024 ต่อกันไร้รอย | ★★ |
| 5 | `ui_bg_leather` | ปกสมุด (กระเป๋า/อุปกรณ์/ร้าน/คลัง/เตาตีบวก) | 1024×1024 ต่อกันไร้รอย | ★★ |
| 6 | `ui_bg_wood` | แผงไม้ HUD / ตัวกรอบหน้าต่าง | 1024×512 ต่อกันไร้รอย | ★★ |
| 7 | `ui_bg_equip_stage` | เวทีตัวละครในหน้าอุปกรณ์ | 512×768 | ★★ |
| 8 | `ui_bg_tree` | หน้าต่าง Passive | 2048×2048 | ★★ |
| 9 | `ui_bg_runes` | หน้าต่าง Runes | 1600×900 | ★ |
| 10 | `ui_bg_dialog` | กล่องคุยกับ NPC | 1600×400 | ★ |

## Prompt (คัดลอกไปใช้ได้เลย — 1 แชตต่อ 1 ภาพ)

**1. ui_bg_title** — 16:9
```
Epic fantasy game title-screen background, no text, no logo, no characters. Twilight sky over Valhalla: the giant world tree Yggdrasil on the right, a shimmering Bifrost rainbow bridge arcing across, a Norse city with soft cyan android-tech lights (Neo Eldheim) far below in the valley. Warm golden key light from the upper left, god rays through clouds, light mist, floating light particles. Premium painterly 3D style like Ragnarok Online key art. Keep the lower-center area calm and slightly darker (a login panel sits there). Important subjects must stay inside the central 56% width so the image also works cropped to portrait.
```

**2. ui_bg_charsel** — 16:9
```
Game character-select background, no text, no characters. Interior of a grand Norse mead hall turned android forge: carved wooden pillars, shields on the walls, a big hearth glowing on the left, tall windows with light shafts and dust motes, a stone floor with a softly glowing rune circle on the left third (the player character will stand there). Warm light, deep shadows, slightly soft focus in the background. Premium painterly 3D, Ragnarok Online flavour.
```

**3. map_<id>** — 3:2 (ภาพทิวทัศน์ของแมพ เหมือน map_meadow ที่มีแล้ว)
- `map_arena` — Colosseum of the Einherjar: round stone arena, broken arches on the south side, banners, torches, sunset light
- `map_archive` — Archive Depths: an underground library carved into rock, endless shelves of rune tablets, a sealed vault door, blue crystal light
- `map_roots` — Gnawed Roots: giant gnawed tree roots arching over a cave path, a root gate, eerie green light, rot
- `map_abyss` — Nidhogg's Hollow: an abyss under Yggdrasil, rusted roots, a dragon silhouette deep in the dark, red-amber glow
```
Wide fantasy landscape illustration for a map title card, no text, no characters. <ใส่คำอธิบายแมพด้านบน>. Premium painterly 3D, Ragnarok Online flavour, warm key light from the upper left, atmospheric depth.
```

**4. ui_bg_parchment** — สี่เหลี่ยมจัตุรัส
```
Seamless tileable texture, 1024x1024: warm cream aged parchment paper, subtle fibers and faint stains, very low contrast and even brightness (text will be printed on it), no folds, no burnt edges, no vignette, no text.
```

**5. ui_bg_leather**
```
Seamless tileable texture, 1024x1024: dark brown tooled leather book cover with very faint embossed Norse knotwork, soft sheen, even lighting, low contrast, no vignette, no text.
```

**6. ui_bg_wood**
```
Seamless tileable texture, 1024x512: dark aged oak planks with rich grain, subtle wear, even lighting, low contrast, no nails, no vignette, no text.
```

**7. ui_bg_equip_stage** — แนวตั้ง 2:3
```
Small stage backdrop for a character equipment screen, no characters, no text: a carved stone alcove with a golden arch, a softly glowing rune circle on the floor, a spotlight from above, dark warm background. Premium painterly 3D.
```

**8. ui_bg_tree** — จัตุรัส
```
Dark background for a skill-tree screen, no text: deep night sky with a faint silhouette of the world tree Yggdrasil, subtle nebula and star dust, constellation-like faint lines. Very dark and calm in the center so glowing nodes on top stay readable.
```

**9. ui_bg_runes** — 16:9
```
Subdued background for a rune-crafting screen, no text, no characters: the stone wall and workbench of a Norse rune carver's workshop, candle light from the left, carved rune stones on shelves, deep shadows, low contrast, slightly blurred.
```

**10. ui_bg_dialog** — แถบกว้าง 4:1
```
Wide subtle backdrop band for a dialogue box, no text, no characters: soft warm parchment glow fading into misty Norse scenery at the edges, very low contrast in the middle.
```
