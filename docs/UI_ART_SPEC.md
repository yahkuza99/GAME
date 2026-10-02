# IRON VALHALLA — UI Art Kit (ระดับโลก) สเปกภาพสำหรับเจนด้วย ChatGPT

> แทนที่ `docs/UI_FRAME_PROMPTS.md` (ฉบับย่อเดิม) • เจนทีละภาพตามลำดับความสำคัญ • ส่งภาพมาในแชต แล้ว Claude ตัด/ติดตั้งให้เอง
> เป้าหมาย: UI ทุกชิ้นเป็น "ชุดเดียวกัน" แบบเกมใหญ่ (ภาษาภาพเดียว วัสดุเดียว แสงทิศเดียว) — ไม่ใช่กรอบสวยแยกชิ้น

---

## 0. Style Bible (ทุก prompt ต้องตรงกับข้อนี้)

**แนวคิด:** "เหล็กวัลฮัลลา" — นอร์สโบราณ × หุ่นแอนดรอยด์ • ของจริงที่ช่างตีเหล็กทำ ไม่ใช่ไซไฟพลาสติก

| ส่วน | ข้อกำหนด |
|---|---|
| วัสดุหลัก | เหล็กดำอมน้ำเงิน (blued iron) ผิวด้าน มีรอยขีดข่วนบาง ๆ + กระจกออบซิเดียนเข้มโปร่งแสง (แผงกลาง) |
| ขอบ/ประดับ | ทองเก่า/บรอนซ์ (aged gold) ลายถักนอร์ส (knotwork) แบบ Urnes เส้นเรียบ ไม่รก |
| แสงพลัง | อักษรรูน Elder Futhark สลักเรืองฟ้า **จาง ๆ** (ไม่ใช่นีออน) |
| สีเน้น | แดงเลือดหมูเฉพาะจุดอันตราย/บอส |
| แสง | มาจาก **ซ้ายบน** เสมอ (ตรงกับฉากในเกม) |
| มุม | หน้าตรง แบน ไม่มีมุมเอียง ไม่มี perspective |
| ห้าม | ตัวหนังสือ/ตัวเลขในภาพ, ลายน้ำ, เงาตกนอกกรอบเกิน 24px, พื้นหลังลายตาราง (checkerboard) ปลอม |
| พื้นหลัง | **PNG โปร่งใสจริง** (ถ้าทำไม่ได้: พื้นดำสนิท #000 ล้วน) |

**จานสี (hex)** — ใช้คำเหล่านี้ใน prompt
- เหล็ก/แผง: `#0B1220` `#16233A` `#22324D`
- ทอง: `#8A6A2A` (เงา) `#C9A24E` (หลัก) `#F0D58A` (ไฮไลต์)
- รูนเรือง: `#6FF3FF` (ตรงกับ UI ปัจจุบัน)
- แดงอันตราย: `#B8382A`
- HP `#FF6B7D` • SP `#6FF3FF` • EXP `#FFE08A` • Job EXP `#C9B0FF` (สีหลอดเลือด/มานา/ประสบการณ์ในเกม)

**ข้อความหัว prompt (แปะหน้าทุกภาพ):**
```
Game UI asset for a premium fantasy MMORPG called IRON VALHALLA (Norse mythology meets androids).
Material language: dark blued iron (#0B1220–#22324D) with fine scratches, aged gold Urnes-style
Norse knotwork trim (#8A6A2A / #C9A24E / #F0D58A highlights), faint cyan glowing Elder Futhark rune
inlays (#6FF3FF, subtle, not neon). Light comes from the top-left. Front view, perfectly flat,
no perspective, symmetrical, crisp clean edges, high detail, AAA game UI quality (like Diablo IV /
Lost Ark / Genshin UI craftsmanship). No text, no numbers, no watermark.
Transparent PNG background.
```

---

## 1. ลำดับความสำคัญ + ขนาด

| # | ภาพ | ขนาด (px) | ใช้ทำอะไรในเกม | วิธีใช้ |
|---|---|---|---|---|
| 1 | กรอบหน้าต่าง | 1024×1024 | ทุกหน้าต่าง (Status/Items/Equip/Skills/…) | 9 ส่วน: ขอบหนา **96px** ทุกด้าน |
| 2 | แถบหัวหน้าต่าง | 1536×128 | หัวทุกหน้าต่าง (ชื่อหน้าต่างวางกลาง) | 3 ส่วน: ปลายซ้าย/ขวา **256px** |
| 3 | ปุ่มปิด ×3 สถานะ | 128×128 ×3 | ปุ่ม ✕ มุมหน้าต่าง | ปกติ / ชี้ / กด |
| 4 | ปุ่มหลัก ×4 สถานะ | 768×192 ×4 | ทุกปุ่ม (ซื้อ/ขาย/ยืนยัน) | 9 ส่วน: ขอบ **64px** • ปกติ/ชี้/กด/ปิดใช้ |
| 5 | ช่องไอเทม | 256×256 | กระเป๋า/Equipment/ฮอตบาร์/ร้านค้า | ภาพเดียว ย่อได้ |
| 6 | วงแหวนความหายาก ×5 | 256×256 ×5 | ซ้อนบนช่องไอเทม | Common/Uncommon/Rare/Epic/Legendary |
| 7 | แท็บ ×2 | 512×128 ×2 | แท็บในหน้าต่าง (เช่น Items/Chips) | ใช้งานอยู่ / ไม่ใช้ |
| 8 | กล่องคำแนะนำ (tooltip) | 512×256 | ตอนชี้ไอเทม/สกิล | 9 ส่วน: ขอบ **40px** (บางกว่ากรอบหน้าต่าง) |
| 9 | กล่องบทสนทนา NPC | 1536×448 | หน้าต่างคุยกับ NPC | 9 ส่วน: ขอบ **96px** |
| 10 | ป้ายชื่อ NPC | 640×128 | เหนือกล่องบทสนทนา | 3 ส่วน |
| 11 | กรอบรูปผู้เล่น (HUD) | 512×512 | วงรอบรูปตัวละครมุมซ้ายบน | วงกลมโปร่งกลาง |
| 12 | กรอบมินิแมพ | 512×512 | มินิแมพมุมขวาบน | สี่เหลี่ยมมุมมน โปร่งกลาง |
| 13 | ฐานแถบลัด (hotbar) | 1024×192 | หลังช่องสกิล 8 ช่อง | 9 ส่วน: ขอบ **72px** |
| 14 | กรอบหลอด + เนื้อหลอด | 2048×64 + 512×32 ×4 | HP/SP/EXP/Job EXP | กรอบ 3 ส่วน • เนื้อหลอดต่อกันได้ (tileable) |
| 15 | ไอคอนเมนู 18 ชิ้น | 1536×768 (6×3 ช่อง ช่องละ 256) | ปุ่มเมนูขวา | ตัดเป็นชิ้น |
| 16 | แถบเลื่อน | 64×512 + 64×128 | scrollbar ทุกหน้าต่าง | ราง + ปุ่มจับ |

---

## 2. Prompt ทีละภาพ (แปะ "ข้อความหัว prompt" ข้อ 0 ก่อนเสมอ)

### 1 — กรอบหน้าต่าง (สำคัญสุด)
```
A square window frame, 1024x1024. Frame border exactly 96 pixels thick on all four sides,
uniform along each edge (so the middle of each edge can be stretched). Four ornate corners:
gold knotwork interlaced around a small iron boss with a single glowing rune. Edges: blued iron
rail with a thin gold inner line and a thin gold outer line, small rivets every ~80px.
The center (inside the border) is dark smoked obsidian glass, 70% opaque, very subtle vertical
gradient, completely plain (text will be placed on it). Soft inner shadow under the border.
```

### 2 — แถบหัวหน้าต่าง
```
A long horizontal title bar, 1536x128. Left and right ends (256px each) are decorated:
gold knotwork ending in a stylized wolf head facing outward. The middle section is a plain
blued-iron band with a thin gold line top and bottom and a faint row of runes, uniform so it
can be stretched. Slight bevel, lit from the top-left.
```

### 3 — ปุ่มปิด (เจน 3 ภาพ หรือ 1 ภาพแถวละ 3)
```
A small round close button, 128x128: blued iron disc with gold rim and a gold rune-shaped X
(two crossed axe hafts). Make 3 versions side by side on a 384x128 canvas:
normal, hover (cyan rune glow brighter, rim brighter), pressed (darker, inset).
```

### 4 — ปุ่มหลัก (4 สถานะ)
```
A wide game button, 768x192, border exactly 64px for 9-slice stretching. Blued iron face with a
gentle bevel, gold trim, small knotwork caps on the left and right ends, plain center (no text).
Make 4 versions stacked vertically on a 768x768 canvas: normal, hover (thin cyan glow along the
inner edge), pressed (inset, darker), disabled (desaturated grey iron, dull gold).
```

### 5 — ช่องไอเทม
```
A square item slot, 256x256: recessed dark iron socket, thin gold rim, tiny rune engraved in
each corner, empty dark center with a soft inner shadow. Must read clearly at 48x48 pixels.
```

### 6 — วงแหวนความหายาก (5 ภาพ)
```
A square ornamental ring overlay for an item slot, 256x256, transparent center (only the rim).
Make 5 versions side by side on a 1280x256 canvas, same shape, different material and glow:
Common = plain iron; Uncommon = green-tinted iron with faint green glow (#7DFF9A);
Rare = blue steel with blue glow (#6CC8FF); Epic = purple runes glowing (#C98AFF);
Legendary = bright gold with warm glow and tiny sparks (#FFCF4A).
```

### 7 — แท็บ
```
A tab shaped like a short banner, 512x128, plain center. Two versions stacked on 512x256:
active (gold trim bright, cyan rune line underneath glowing) and inactive (dim iron, no glow).
```

### 8 — Tooltip
```
A compact tooltip panel, 512x256, border exactly 40px for 9-slice. Thinner, lighter version of
the window frame: slim gold line border, small corner knots, dark glass center, plain.
```

### 9 — กล่องบทสนทนา NPC
```
A wide dialogue box, 1536x448, border exactly 96px for 9-slice. Like the window frame but wider,
with a small raven emblem at the bottom-center of the border. Dark glass center, plain.
```

### 10 — ป้ายชื่อ NPC
```
A small name plate, 640x128, sits on top of the dialogue box. Gold-trimmed iron plaque,
pointed ends with knotwork, plain center for a name.
```

### 11 — กรอบรูปผู้เล่น
```
A circular portrait frame, 512x512, transparent circular hole in the center (diameter 300px).
Thick blued-iron ring with gold knotwork, 24 small rune ticks around it, a small Valknut emblem
at the bottom. Leave a thin empty groove just outside the hole (HP/SP arcs will be drawn there).
```

### 12 — กรอบมินิแมพ
```
A square minimap frame with rounded corners, 512x512, transparent center (inner area 400x400).
Iron frame with gold trim, compass letters replaced by rune marks at N/E/S/W (no latin text),
a small gold arrow at the top.
```

### 13 — ฐานแถบลัด
```
A long low hotbar backplate, 1024x192, border exactly 72px for 9-slice. Iron plate with a gold
top edge, knotwork on both ends, plain dark center where 8 skill slots will sit.
```

### 14 — หลอดค่าพลัง
```
(a) A long thin bar frame, 2048x64, ends 128px decorated with tiny knotwork, middle uniform,
transparent inside channel.
(b) Four tileable bar fill textures, 512x32 each, stacked on 512x128: red liquid (#FF6B7D),
cyan energy (#6FF3FF), gold light (#FFE08A), violet light (#C9B0FF). Subtle flowing pattern,
seamless left-to-right.
```

### 15 — ไอคอนเมนู 18 ชิ้น
```
A sheet of 18 menu icons, 6 columns x 3 rows, each 256x256, transparent background, same style
(gold engraved symbol on a small round iron medallion, faint cyan rune glow):
Row 1: Status (helmet), Items (leather pouch), Equip (sword and shield), Skills (lightning rune),
Passive (Yggdrasil tree), Map (unrolled map).
Row 2: Quests (scroll with seal), Party (three linked rings), Emote (smiling mask), Trade (two hands
exchanging a coin), Navi (compass), Bot (small android head).
Row 3: Settings (gear), Help (rune question mark), Class (crossed axes crest), Gacha (Norns wheel),
Sit (campfire), World map (globe of Yggdrasil branches).
```

### 16 — แถบเลื่อน
```
(a) A vertical scrollbar track, 64x512, thin iron groove with gold edges, uniform middle.
(b) A scrollbar thumb, 64x128, small gold-capped iron grip with a rune.
```

---

## 3. ตรวจก่อนส่ง (เช็กลิสต์)
- [ ] พื้นหลังโปร่งใสจริง (ไม่ใช่ลายตารางที่วาดเป็นภาพ)
- [ ] ขนาดตรงตาราง (ถ้าไม่ตรง Claude ปรับให้ได้ แต่ขอบ 9 ส่วนต้อง "สม่ำเสมอ" กลางขอบ)
- [ ] ไม่มีตัวหนังสือ
- [ ] แสงมาจากซ้ายบนทุกภาพ / ทองโทนเดียวกันทุกภาพ (ถ้าต่างกัน เจนใหม่โดยแนบภาพที่ 1 ไปด้วยแล้วบอกว่า "match this exact style")

**เคล็ดลับให้ทุกภาพเป็นชุดเดียวกัน:** เจนภาพที่ 1 ให้ได้ที่ชอบก่อน แล้วทุกภาพถัดไปแนบภาพที่ 1 ไปด้วยพร้อมประโยค
`Match the exact materials, colors, line weight and lighting of the attached frame.`

## 4. หลังได้ภาพ (Claude ทำ)
ตัด 9 ส่วน → `border-image` ทุกหน้าต่าง/ปุ่ม/tooltip • ไอคอนเมนูแทน SVG เส้นเดิม • กรอบ HUD/มินิแมพ/หลอด • ทดสอบมือถือ+เดสก์ท็อป • ภาพไหนยังไม่มีใช้ UI ปัจจุบันต่อ (ทยอยเปลี่ยนได้)
