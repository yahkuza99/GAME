# IRON VALHALLA — UI Art Sheets (1 prompt = 1 ภาพ = 5 ชิ้น) • โทน Earth tone Valhalla (สว่าง อบอุ่น)

> ⚠ **เลิกใช้แล้ว (2026-10-03):** เจ้าของไม่เอาภาพ UI ชุดนี้ทั้งชุด → UI วาดด้วยโค้ด (css/tokens.css, css/theme*.css) + วัสดุเรนเดอร์ Blender (tools/uiwood3d.py → assets/ui3d_*) • เก็บไฟล์นี้ไว้เป็นประวัติเท่านั้น

> โทน: **ไม้โอ๊กสีอ่อน หนัง บรอนซ์เก่า กระดาษ/ผ้าลินินครีม กระดูก/เขาสัตว์ รูนสลักเรืองอำพัน** — แบบบ้านยาวไวกิ้ง/หินรูน ไม่ใช่ไซไฟ (ฉบับเหล็กดำ+ฟ้าเก่าอยู่ในประวัติ git)
> คุ้มสุด: 10 prompt → 50 ชิ้น ครอบคลุม UI ทั้งเกม • แต่ละ prompt **ก๊อปทั้งบล็อกไปวางได้เลย** (มีสไตล์อยู่ในตัวครบ)
> ตั้งค่าใน ChatGPT: ขนาด **1536×1024 (แนวนอน)** • ขอ **พื้นหลังโปร่งใส** (ถ้าไม่ได้ ใช้พื้นดำสนิทก็ได้ — Claude ตัดเอง)
> ส่งภาพมาในแชต → Claude ตัดแยกชิ้นอัตโนมัติ + ทำ 9 ส่วน + ติดตั้งเข้าเกม (ขนาดพิกเซลไม่ต้องเป๊ะ)
> **เคล็ดลับให้ทุกแผ่นเป็นชุดเดียวกัน:** แผ่นที่ 2 เป็นต้นไป แนบภาพแผ่นที่ 1 ไปด้วยทุกครั้ง แล้วต่อท้าย prompt ว่า
> `Match the exact materials, wood and bronze colors, line weight and lighting of the attached sheet.`

ลำดับเจน: **1 → 2 → 3 → 4 → 5** (เปลี่ยนหน้าตาเกมมากสุด) แล้วค่อย 6–10

---

## แผ่น 1 — ชุดหน้าต่าง (สำคัญสุด)
```
A professional game UI asset sheet for a premium AAA fantasy MMORPG called IRON VALHALLA
(Norse mythology meets androids). Quality bar: Diablo IV, Lost Ark, Genshin Impact UI craftsmanship.

ART DIRECTION (applies to every piece): warm, light EARTH-TONE Valhalla style — like a Viking
longhouse and a runestone, not sci-fi. Materials: weathered light oak wood with visible grain
(#8B6B4A, #A8865F, #C9A979), hand-tooled saddle-brown leather (#6B4A2F), hammered aged bronze and
dark iron rivets (#7A5A2E, #B08A4A, highlight #E2C788), warm cream parchment/linen panels
(#EFE3C8, #E3D2AE), carved bone/antler accents (#E8DCC2), small touches of fur trim.
Runes are CARVED and lightly inlaid with warm amber light (#F2B45A, subtle glow, never neon);
a tiny hint of muted teal (#5FA8A0) only on gemstones. Elegant Urnes-style Norse knotwork carved
into wood and embossed in bronze, clean and not cluttered. Light, sunny, inviting overall value
(not dark, not grimy). Light comes from the top-left. Perfectly flat front view, no perspective,
symmetrical, crisp edges, painterly hand-crafted look with real material detail, AAA quality
(Diablo IV / Lost Ark / Genshin UI craftsmanship). NO text, NO letters, NO numbers, NO watermark.

LAYOUT: exactly 5 separate UI pieces on one sheet, arranged in a clean grid with wide empty gaps
between them (nothing touches, nothing overlaps, generous margin around every piece).
Background: fully transparent (or pure flat black #000000 if transparency is impossible).

THE 5 PIECES:
1. (largest, left half) A square WINDOW FRAME. Border of equal thickness on all four sides
   (about 1/10 of the width), uniform along the middle of every edge so it can be 9-slice stretched.
   Four ornate corners: bronze knotwork wrapped around a carved wooden boss holding one amber-glowing rune.
   Edges: carved oak rail between two thin bronze bands, small iron rivets. Center: plain warm parchment/linen
   panel, slightly translucent cream, completely empty.
2. A long thin horizontal TITLE BAR: both ends decorated with gold knotwork ending in a stylized
   wolf head facing outward; middle is a plain uniform oak plank band with bronze strips top and bottom.
3. A round CLOSE BUTTON: round wooden shield-boss button, bronze rim, an X made of two crossed axe hafts.
4. A compact TOOLTIP PANEL: slimmer, lighter version of the window frame, thin bronze border,
   tiny corner knots, plain cream parchment center.
5. Two TABS side by side (active and inactive): short banner shape; active has bright bronze trim
   and a glowing amber rune line underneath, inactive is plain darker wood with no glow.
```

## แผ่น 2 — ปุ่ม 4 สถานะ + แถบเลื่อน
```
ART DIRECTION (applies to every piece): warm, light EARTH-TONE Valhalla style — like a Viking
longhouse and a runestone, not sci-fi. Materials: weathered light oak wood with visible grain
(#8B6B4A, #A8865F, #C9A979), hand-tooled saddle-brown leather (#6B4A2F), hammered aged bronze and
dark iron rivets (#7A5A2E, #B08A4A, highlight #E2C788), warm cream parchment/linen panels
(#EFE3C8, #E3D2AE), carved bone/antler accents (#E8DCC2), small touches of fur trim.
Runes are CARVED and lightly inlaid with warm amber light (#F2B45A, subtle glow, never neon);
a tiny hint of muted teal (#5FA8A0) only on gemstones. Elegant Urnes-style Norse knotwork carved
into wood and embossed in bronze, clean and not cluttered. Light, sunny, inviting overall value
(not dark, not grimy). Light comes from the top-left. Perfectly flat front view, no perspective,
symmetrical, crisp edges, painterly hand-crafted look with real material detail, AAA quality
(Diablo IV / Lost Ark / Genshin UI craftsmanship). NO text, NO letters, NO numbers, NO watermark.
Game UI asset sheet, IRON VALHALLA, AAA quality. Exactly 5 separate pieces in a clean grid with
wide empty gaps, transparent background (or pure black). No text.
1. Wide MAIN BUTTON — NORMAL: light oak plank face, gentle bevel, bronze trim, small knotwork caps on
   both ends, plain empty center. Border uniform so it can be 9-slice stretched.
2. The same button — HOVER: identical shape, thin warm amber glow along the inner edge, bronze brighter.
3. The same button — PRESSED: identical shape, inset, darker face, shadow inside the top edge.
4. The same button — DISABLED: identical shape, faded grey weathered wood, dull bronze, no glow.
5. A vertical SCROLLBAR: a thin carved wooden groove with bronze edges, and next to it a separate small
   bronze-capped wooden grip with one rune.
All four buttons must be exactly the same size and shape.
```

## แผ่น 3 — ช่องไอเทม + ความหายาก
```
ART DIRECTION (applies to every piece): warm, light EARTH-TONE Valhalla style — like a Viking
longhouse and a runestone, not sci-fi. Materials: weathered light oak wood with visible grain
(#8B6B4A, #A8865F, #C9A979), hand-tooled saddle-brown leather (#6B4A2F), hammered aged bronze and
dark iron rivets (#7A5A2E, #B08A4A, highlight #E2C788), warm cream parchment/linen panels
(#EFE3C8, #E3D2AE), carved bone/antler accents (#E8DCC2), small touches of fur trim.
Runes are CARVED and lightly inlaid with warm amber light (#F2B45A, subtle glow, never neon);
a tiny hint of muted teal (#5FA8A0) only on gemstones. Elegant Urnes-style Norse knotwork carved
into wood and embossed in bronze, clean and not cluttered. Light, sunny, inviting overall value
(not dark, not grimy). Light comes from the top-left. Perfectly flat front view, no perspective,
symmetrical, crisp edges, painterly hand-crafted look with real material detail, AAA quality
(Diablo IV / Lost Ark / Genshin UI craftsmanship). NO text, NO letters, NO numbers, NO watermark.
Game UI asset sheet, IRON VALHALLA, AAA quality. Exactly 5 square ITEM SLOTS in one row, all the
same size and shape, wide gaps between them, transparent background (or pure black). No text.
Each slot: recessed leather-lined socket in a carved oak frame with a soft inner shadow, ornate square rim, tiny rune in each
corner, completely empty center. Must still read clearly when shrunk to 48x48 pixels.
The 5 differ only by rarity rim and glow:
1. COMMON — plain oak rim, no glow.
2. UNCOMMON — moss-green stained wood rim, faint green glow (#7DFF9A).
3. RARE — blue-grey slate rim, cool blue glow (#6CC8FF).
4. EPIC — violet-stained runes on the rim, purple glow (#C98AFF).
5. LEGENDARY — bright polished bronze-gold rim with warm radiant glow and a few tiny sparks (#FFCF4A).
```

## แผ่น 4 — HUD
```
ART DIRECTION (applies to every piece): warm, light EARTH-TONE Valhalla style — like a Viking
longhouse and a runestone, not sci-fi. Materials: weathered light oak wood with visible grain
(#8B6B4A, #A8865F, #C9A979), hand-tooled saddle-brown leather (#6B4A2F), hammered aged bronze and
dark iron rivets (#7A5A2E, #B08A4A, highlight #E2C788), warm cream parchment/linen panels
(#EFE3C8, #E3D2AE), carved bone/antler accents (#E8DCC2), small touches of fur trim.
Runes are CARVED and lightly inlaid with warm amber light (#F2B45A, subtle glow, never neon);
a tiny hint of muted teal (#5FA8A0) only on gemstones. Elegant Urnes-style Norse knotwork carved
into wood and embossed in bronze, clean and not cluttered. Light, sunny, inviting overall value
(not dark, not grimy). Light comes from the top-left. Perfectly flat front view, no perspective,
symmetrical, crisp edges, painterly hand-crafted look with real material detail, AAA quality
(Diablo IV / Lost Ark / Genshin UI craftsmanship). NO text, NO letters, NO numbers, NO watermark.
Game UI asset sheet, IRON VALHALLA, AAA quality. Exactly 5 separate HUD pieces in a clean grid
with wide gaps, transparent background (or pure black). No text, no latin letters.
1. CIRCULAR PORTRAIT FRAME: thick carved oak ring with bronze knotwork, 24 small rune ticks around it,
   a small Valknut emblem at the bottom, an EMPTY transparent circular hole in the middle, and a thin
   empty groove just outside the hole (health arcs will be drawn there).
2. SQUARE MINIMAP FRAME with rounded corners: carved oak with bronze trim, rune marks at north/east/south/west
   instead of letters, a small bronze arrow at the top, EMPTY transparent center.
3. HOTBAR BACKPLATE: long, low oak plank with a bronze top edge and knotwork on both ends, plain light
   leather center where 8 skill slots will sit; uniform middle so it can be stretched.
4. A long thin RESOURCE BAR FRAME: ends decorated with tiny knotwork, uniform middle, empty channel inside.
5. Four BAR FILL strips stacked: red liquid (#FF6B7D), teal-blue water energy (#6FC7D8), gold light (#FFE08A),
   violet light (#C9B0FF) — each a seamless horizontally tileable texture with a subtle flowing pattern.
```

## แผ่น 5 — บทสนทนา NPC + เควสต์
```
ART DIRECTION (applies to every piece): warm, light EARTH-TONE Valhalla style — like a Viking
longhouse and a runestone, not sci-fi. Materials: weathered light oak wood with visible grain
(#8B6B4A, #A8865F, #C9A979), hand-tooled saddle-brown leather (#6B4A2F), hammered aged bronze and
dark iron rivets (#7A5A2E, #B08A4A, highlight #E2C788), warm cream parchment/linen panels
(#EFE3C8, #E3D2AE), carved bone/antler accents (#E8DCC2), small touches of fur trim.
Runes are CARVED and lightly inlaid with warm amber light (#F2B45A, subtle glow, never neon);
a tiny hint of muted teal (#5FA8A0) only on gemstones. Elegant Urnes-style Norse knotwork carved
into wood and embossed in bronze, clean and not cluttered. Light, sunny, inviting overall value
(not dark, not grimy). Light comes from the top-left. Perfectly flat front view, no perspective,
symmetrical, crisp edges, painterly hand-crafted look with real material detail, AAA quality
(Diablo IV / Lost Ark / Genshin UI craftsmanship). NO text, NO letters, NO numbers, NO watermark.
Game UI asset sheet, IRON VALHALLA, AAA quality. Exactly 5 separate pieces in a clean grid with wide
gaps, transparent background (or pure black). No text.
1. Wide DIALOGUE BOX: like a window frame but wide and short, a small raven emblem at the bottom-center
   of the border, plain cream parchment center, uniform edges for 9-slice stretching.
2. NPC NAME PLATE: small bronze-trimmed carved wooden plaque with pointed knotwork ends, plain center.
3. DIALOGUE CHOICE ROW: a slim selectable option bar, oak and leather with a bronze left marker shaped like a rune,
   plain center.
4. QUEST TRACKER PANEL: a slim vertical parchment scroll panel, warm parchment inside, carved wooden
   roller caps top and bottom, a wax seal with a rune at the top.
5. NPC PORTRAIT FRAME: tall rectangular frame with arched top, carved oak and bronze, empty transparent center.
```

## แผ่น 6 — ไอคอนเมนู ชุด A (5)
```
ART DIRECTION (applies to every piece): warm, light EARTH-TONE Valhalla style — like a Viking
longhouse and a runestone, not sci-fi. Materials: weathered light oak wood with visible grain
(#8B6B4A, #A8865F, #C9A979), hand-tooled saddle-brown leather (#6B4A2F), hammered aged bronze and
dark iron rivets (#7A5A2E, #B08A4A, highlight #E2C788), warm cream parchment/linen panels
(#EFE3C8, #E3D2AE), carved bone/antler accents (#E8DCC2), small touches of fur trim.
Runes are CARVED and lightly inlaid with warm amber light (#F2B45A, subtle glow, never neon);
a tiny hint of muted teal (#5FA8A0) only on gemstones. Elegant Urnes-style Norse knotwork carved
into wood and embossed in bronze, clean and not cluttered. Light, sunny, inviting overall value
(not dark, not grimy). Light comes from the top-left. Perfectly flat front view, no perspective,
symmetrical, crisp edges, painterly hand-crafted look with real material detail, AAA quality
(Diablo IV / Lost Ark / Genshin UI craftsmanship). NO text, NO letters, NO numbers, NO watermark.
Game UI icon sheet, IRON VALHALLA, AAA quality. Exactly 5 menu icons in one row, all the same size,
wide gaps, transparent background (or pure black). No text.
Every icon uses the same frame: a small round carved-oak medallion with a bronze rim, and a burned/engraved
symbol in the center with a faint warm amber rune glow. Symbols must read clearly at 32x32 pixels.
1. STATUS — a Viking helmet.  2. ITEMS — a leather pouch with a drawstring.  3. EQUIP — a sword
crossed over a round shield.  4. SKILLS — a lightning-bolt rune.  5. PASSIVE — Yggdrasil, the world tree.
```

## แผ่น 7 — ไอคอนเมนู ชุด B (5)
```
ART DIRECTION (applies to every piece): warm, light EARTH-TONE Valhalla style — like a Viking
longhouse and a runestone, not sci-fi. Materials: weathered light oak wood with visible grain
(#8B6B4A, #A8865F, #C9A979), hand-tooled saddle-brown leather (#6B4A2F), hammered aged bronze and
dark iron rivets (#7A5A2E, #B08A4A, highlight #E2C788), warm cream parchment/linen panels
(#EFE3C8, #E3D2AE), carved bone/antler accents (#E8DCC2), small touches of fur trim.
Runes are CARVED and lightly inlaid with warm amber light (#F2B45A, subtle glow, never neon);
a tiny hint of muted teal (#5FA8A0) only on gemstones. Elegant Urnes-style Norse knotwork carved
into wood and embossed in bronze, clean and not cluttered. Light, sunny, inviting overall value
(not dark, not grimy). Light comes from the top-left. Perfectly flat front view, no perspective,
symmetrical, crisp edges, painterly hand-crafted look with real material detail, AAA quality
(Diablo IV / Lost Ark / Genshin UI craftsmanship). NO text, NO letters, NO numbers, NO watermark.
Match the attached icon sheet exactly (same medallion, same bronze, same lighting).
Game UI icon sheet, IRON VALHALLA. Same medallion style as before, exactly 5 icons in one row,
wide gaps, transparent background. No text.
1. MAP — an unrolled map.  2. QUESTS — a scroll with a wax seal.  3. PARTY — three interlinked rings.
4. EMOTE — a smiling theatre mask.  5. TRADE — two hands exchanging a coin.
```

## แผ่น 8 — ไอคอนเมนู ชุด C (5)
```
ART DIRECTION (applies to every piece): warm, light EARTH-TONE Valhalla style — like a Viking
longhouse and a runestone, not sci-fi. Materials: weathered light oak wood with visible grain
(#8B6B4A, #A8865F, #C9A979), hand-tooled saddle-brown leather (#6B4A2F), hammered aged bronze and
dark iron rivets (#7A5A2E, #B08A4A, highlight #E2C788), warm cream parchment/linen panels
(#EFE3C8, #E3D2AE), carved bone/antler accents (#E8DCC2), small touches of fur trim.
Runes are CARVED and lightly inlaid with warm amber light (#F2B45A, subtle glow, never neon);
a tiny hint of muted teal (#5FA8A0) only on gemstones. Elegant Urnes-style Norse knotwork carved
into wood and embossed in bronze, clean and not cluttered. Light, sunny, inviting overall value
(not dark, not grimy). Light comes from the top-left. Perfectly flat front view, no perspective,
symmetrical, crisp edges, painterly hand-crafted look with real material detail, AAA quality
(Diablo IV / Lost Ark / Genshin UI craftsmanship). NO text, NO letters, NO numbers, NO watermark.
Match the attached icon sheet exactly (same medallion, same bronze, same lighting).
Game UI icon sheet, IRON VALHALLA. Same medallion style, exactly 5 icons in one row, wide gaps,
transparent background. No text.
1. NAVI — a compass rose.  2. BOT — a small android head with glowing eyes.  3. SETTINGS — a gear.
4. HELP — a rune shaped like a question mark.  5. CLASS — a crest of two crossed axes.
```

## แผ่น 9 — ไอคอนเมนู ชุด D (5)
```
ART DIRECTION (applies to every piece): warm, light EARTH-TONE Valhalla style — like a Viking
longhouse and a runestone, not sci-fi. Materials: weathered light oak wood with visible grain
(#8B6B4A, #A8865F, #C9A979), hand-tooled saddle-brown leather (#6B4A2F), hammered aged bronze and
dark iron rivets (#7A5A2E, #B08A4A, highlight #E2C788), warm cream parchment/linen panels
(#EFE3C8, #E3D2AE), carved bone/antler accents (#E8DCC2), small touches of fur trim.
Runes are CARVED and lightly inlaid with warm amber light (#F2B45A, subtle glow, never neon);
a tiny hint of muted teal (#5FA8A0) only on gemstones. Elegant Urnes-style Norse knotwork carved
into wood and embossed in bronze, clean and not cluttered. Light, sunny, inviting overall value
(not dark, not grimy). Light comes from the top-left. Perfectly flat front view, no perspective,
symmetrical, crisp edges, painterly hand-crafted look with real material detail, AAA quality
(Diablo IV / Lost Ark / Genshin UI craftsmanship). NO text, NO letters, NO numbers, NO watermark.
Match the attached icon sheet exactly (same medallion, same bronze, same lighting).
Game UI icon sheet, IRON VALHALLA. Same medallion style, exactly 5 icons in one row, wide gaps,
transparent background. No text.
1. GACHA — the wheel of the three Norns.  2. SIT / REST — a small campfire.  3. WORLD MAP — a globe
wrapped in Yggdrasil branches.  4. STORAGE — an iron-bound chest.  5. CHAT — a speech bubble with a rune.
```

## แผ่น 10 — ป้ายประกาศสำคัญ (ความฟิน)
```
ART DIRECTION (applies to every piece): warm, light EARTH-TONE Valhalla style — like a Viking
longhouse and a runestone, not sci-fi. Materials: weathered light oak wood with visible grain
(#8B6B4A, #A8865F, #C9A979), hand-tooled saddle-brown leather (#6B4A2F), hammered aged bronze and
dark iron rivets (#7A5A2E, #B08A4A, highlight #E2C788), warm cream parchment/linen panels
(#EFE3C8, #E3D2AE), carved bone/antler accents (#E8DCC2), small touches of fur trim.
Runes are CARVED and lightly inlaid with warm amber light (#F2B45A, subtle glow, never neon);
a tiny hint of muted teal (#5FA8A0) only on gemstones. Elegant Urnes-style Norse knotwork carved
into wood and embossed in bronze, clean and not cluttered. Light, sunny, inviting overall value
(not dark, not grimy). Light comes from the top-left. Perfectly flat front view, no perspective,
symmetrical, crisp edges, painterly hand-crafted look with real material detail, AAA quality
(Diablo IV / Lost Ark / Genshin UI craftsmanship). NO text, NO letters, NO numbers, NO watermark.
Game UI asset sheet, IRON VALHALLA, AAA quality. Exactly 5 separate banner pieces in a clean grid
with wide gaps, transparent background (or pure black). No text, no letters — empty space where
the game will write words.
1. BOSS WARNING BAR: wide, slim, blood-red stained leather and dark oak (#9A3A26 accents), cracked edges, a horned skull
   emblem on the left, plain center.
2. LEVEL UP BANNER: wide ribbon of radiant bronze-gold with wings spreading from both ends and soft light rays.
3. LOOT TOAST: small horizontal notification plate, oak and bronze, a square space on the left for an
   item icon, plain center.
4. CHAPTER TITLE CARD: tall ornate carved-oak-and-bronze frame with a Valknut at the top, plain cream parchment center.
5. QUEST COMPLETE SEAL: a round bronze medallion with a laurel of knotwork and a large central rune of victory.
```

---

## Claude ทำอะไรต่อเมื่อได้ภาพ
1. ตัดแยกชิ้นอัตโนมัติจากช่องว่าง (ไม่ต้องตัดเอง) → ลบพื้นดำถ้าไม่โปร่งใส
2. กรอบ/ปุ่ม/แท็บ/tooltip/กล่องคุย → `border-image` 9 ส่วน ทุกหน้าต่าง
3. ช่องไอเทม 5 ระดับ → กระเป๋า / Equipment / ร้านค้า / ฮอตบาร์ ตามความหายาก
4. HUD / มินิแมพ / หลอดค่าพลัง / ไอคอนเมนู 20 ชิ้น → แทนของเดิม
5. ป้ายประกาศ → คำเตือนบอส / เลเวลอัป / ได้ของ / บทใหม่ / เควสต์สำเร็จ
6. ทดสอบมือถือ + เดสก์ท็อป • แผ่นไหนยังไม่มา ใช้ UI ปัจจุบันไปก่อน
