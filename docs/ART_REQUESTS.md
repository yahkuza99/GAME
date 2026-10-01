# NEO MIDGARD — Art Requests / รายการภาพที่ต้องสร้าง

> Production list for the AI image tool. Everything here is **missing real art**. The game currently shows a tinted, flipped
> stand-in made by `Art.alias(...)` in `js/art.js` / `js/content_ch6.js`, or a code-drawn figure.
> When a real file with the exact name lands in `assets/` and is listed in `assets/manifest.json`, it replaces the stand-in automatically.
> No game code has to change for P1–P4. (P2 has one known catch, see **P2 · Note on field animation**.)
>
> รายการนี้คือภาพที่ "ยังไม่มีของจริง" ทั้งหมด ตอนนี้เกมใช้ภาพย้อมสี/กลับด้านจากภาพเดิมแทนไปก่อน
> วางไฟล์ชื่อตรงตามนี้ใน `assets/` + อัปเดต manifest แล้วเกมจะใช้ภาพจริงทันที

---

## 0. วิธีใช้ / How to use

1. **One chat per batch.** Start a new chat in the image tool for each batch (for example "P1 Valkyrie + Hersir"). Paste the **style preamble** for that asset type once, then the per-image prompt. Keeping one chat per batch keeps the style consistent.
   แต่ละชุดเปิดแชตใหม่ วาง **บล็อกสไตล์ (preamble)** ก่อน แล้วตามด้วย prompt ของภาพนั้น
2. **Prompt = PREAMBLE + subject.** Each request below gives only the subject part. Always send `[preamble block] + [subject block]` together in one message.
3. **Generate big, ship small.** Generate at the "Generate" size. The pipeline converts to WebP and resizes to the "Final" size.
4. **Install.** Send the images to Claude in chat, or run the existing tools:
   - single image: `python3 tools/slice_sheet.py --add <image.png> <key>` (converts to `.webp`, updates `assets/manifest.json`)
   - mob animation sheet: Claude installs it with `tools/sprite_std.py` (cuts it into `anim_mob_<id>_walk` / `_attack`)
   - icons (skill / item / emblem) must end up at **128×128**. If you generate them one by one at 1024², ask Claude to resize them on install.
   The game only loads files listed in `assets/manifest.json`, so always run the install step. Dropping a file into the folder is not enough.
5. **Reject and regenerate** whenever any of the golden rules below is broken. The most common failure is eyes appearing on a face.
6. Tick the **Checklist** at the end (section 9) as you go.

### Golden rules (ทุกภาพ)

| Rule | English | ไทย |
|---|---|---|
| Visor, no eyes | Every android has a smooth faceplate + ONE glowing visor strip. No eyes, pupils, nose, mouth or human skin. If eyes appear, reply: *"remove the eyes, use only a glowing visor strip"* | ทุกตัวไม่มีลูกตา ใบหน้าเรียบ + แถบวิเซอร์เรืองแสง |
| Elegant, not boxy | Graceful anime-fantasy androids with visible joints and seam lines. Not boxy mecha, not a human in a costume. | สง่า ไม่แข็งทื่อแบบหุ่นกล่อง |
| Tasteful | Full-coverage outfits, heroic poses, never sexualized. | แต่งกายมิดชิด ไม่ยั่วยุ |
| No text | No letters, numbers, logos or watermarks. Norse **rune shapes** are allowed as decoration. | ห้ามมีตัวอักษร (ลายรูนได้) |
| House style | Painterly anime-fantasy, soft lighting, rim light, glowing **cyan / gold** accents, engraved Norse knotwork. | สไตล์ภาพวาดอนิเมะแฟนตาซี แสงนุ่ม ขอบเรืองฟ้า/ทอง |
| Tone | "Morning after the storm": warm, adventurous, slightly melancholic, never grimdark or gory. | อุ่น ผจญภัย เศร้านิด ๆ ไม่มืดหม่น ไม่โหด |

### Delivery specs by asset type (สเปกไฟล์)

| Type | File pattern | Generate | Final in `assets/` | Background | Used in game |
|---|---|---|---|---|---|
| Job portrait | `job_<class>_<f\|m>.webp` | 1024×1536 (2:3) | 1024×1536 | **transparent** | class guide, class-change splash, HUD face crop |
| Class emblem | `emblem_<class>.webp` | 1024×1024 | 128×128 | **transparent** | unit card, class guide |
| Hero field sprite | `hero_<class>_<f\|m>.webp` | 1024² sheet 2×2 | ≤320 px | **transparent** | the player character on the map |
| Mob portrait | `mob_<id>.webp` | 1024×1024 | 160×160 | full-bleed (opaque) | monster chip cards, monster info |
| Mob body sprite | `mobsprite_<id>.webp` | 1024×1024 | ≤320 px longest side | **transparent** | target frame, field (no anim) |
| Mob anim sheet | `anim_mob_<id>_walk/_attack.webp` | 1536×1024 on `art/tpl_mob.png` | 960×240 each (4×240) | white → keyed | the monster moving in the field |
| Boss splash | `mvp_<id>.webp` | 1536×1024 (3:2) | 1536×1024 | full-bleed | boss reveal card (cropped to **16:7**) |
| Map banner | `map_<id>.webp` | 1536×1024 (3:2) | 1536×1024 | full-bleed | map-enter banner, world-map card |
| Skill icon | `skill_<id>.webp` | 1024×1024 | 128×128 | full-bleed tile | hotbar, skill window, hover cards |
| Item icon | `item_<id>.webp` | 1024×1024 | 128×128 | **transparent** | inventory, shop, drops |
| NPC illustration | `npc_<id>.webp` | 1024×1536 | 1024×1536 | **transparent** | dialogue illustration |

### Counts / จำนวนภาพ

| Priority | Batch | Images to generate | Files produced |
|---|---|---|---|
| **P1** | 12 second-class portraits (f + m) | 24 | 24 |
| **P1** | 12 second-class emblems | 12 | 12 |
| P1+ *(recommended)* | Second-class field sprites `hero_*` (6 sheets × 4) | 6 | 24 |
| **P2** | Chapter-6 mob portraits `mob_*` | 10 | 10 |
| **P2** | Chapter-6 mob body sprites `mobsprite_*` | 10 | 10 |
| **P2** | Chapter-6 mob anim sheets (move + attack) | 8 | 16 |
| **P2** | MVP Garmr splash `mvp_garmr` | 1 | 1 |
| **P2** | World-boss splash variants `mvp_wb_*` | 3 | 3 |
| P2+ *(recommended)* | Hel NPC (illustration + field sprite) | 2 | 2 |
| **P3** | Second-class skill icons | 60 | 60 |
| **P3** | First-class 6th-skill icons | 6 | 6 |
| **P3** | First-class 2nd-set passive icons (also tinted stand-ins) | 6 | 6 |
| **P4** | Map banners `map_archive`, `map_roots` | 2 | 2 |
| P4+ *(needs a small code hook)* | Per-map ground tiles + cave props | 5 | 5 |
| **P5** | Missing item icons (weapons, armor, Ch-6 drops) | 19 | 19 |
| P5+ *(needs code first)* | Worn-headgear overlays | 4 | 4 |
| | **Core total (P1–P5, bold rows)** | **161** | **169** |
| | **Everything incl. optional** | **178** | **204** |

---

## 1. Style preambles / บล็อกสไตล์ (paste before every prompt)

#### [A] PORTRAIT: job portraits and NPC illustrations
```
Anime gacha game character art, polished cel shading with soft painterly gradient lighting and rim light, crisp clean lineart, highly detailed, production-quality, sci-fi Norse mythology fusion world called NEO MIDGARD where every character is a humanoid android (there are no humans at all). FACE RULE: the head is a sleek android head with a smooth glossy metal faceplate and ONE glowing visor strip across where the eyes would be. NO eyes, NO pupils, NO irises, NO eyelashes, NO nose, NO mouth, NO human skin. The 'hair' is layered synthetic metal plates and cable strands shaped like a hairstyle, with a soft metallic sheen. Body: elegant armored android body with visible mechanical joints at the shoulders, elbows and knees, fine panel seam lines, ear-mounted headset pieces with small antenna fins, and thin glowing circuit lines; graceful and heroic, not boxy or bulky-robotic. Accents: engraved Norse knotwork and rune details, warm gold trim, soft cyan inner glow. Tasteful full-coverage outfit, confident heroic pose, not sexualized. No text, no watermark, no logo, no signature. Full body, head to toe fully visible, standing in a 3/4 view facing the viewer, centered with a little empty space around the figure. Nothing (weapon, wings, staff, banner) rises above the top of the head in the middle third of the image width; tall items go to the left or right side. Transparent background (PNG). Vertical 2:3 image (1024x1536).
```
*Why the "nothing above the head" line:* the HUD crops the face by finding the topmost solid pixel in the centre of the image (`Art.faceRect`). A spear tip above the head would become the "face".

#### [B] EMBLEM: second-class emblems
```
Class emblem icon for an anime sci-fi Norse RPG called NEO MIDGARD. A single metallic badge: polished silver steel with engraved Norse knotwork, a glowing colored gem core, and, because this is an ADVANCED second-tier class, an extra outer ring of fine gold filigree with two small gold blade-wings at the sides. Painterly cel shading, crisp outline, soft rim light, readable at 48 pixels. Centered, filling about 80% of the canvas, front-facing and symmetrical. FULLY TRANSPARENT background (PNG). No text, no letters, no numbers, no frame, no drop shadow. Square 1:1 image (1024x1024).
```

#### [C] SKILL ICON
```
Game skill icon for an anime sci-fi Norse RPG called NEO MIDGARD (android heroes). One square painted tile that fills the whole canvas edge to edge with its own dark atmospheric background and ONE bold, glowing, easy-to-read central symbol or action; painterly cel shading, crisp lineart, strong rim light, high contrast so it reads at 40 pixels. Norse rune shapes are allowed as decoration. No faces, no eyes, no text, no Latin letters, no numbers, no frame or border, no rounded corners. Square 1:1 image (1024x1024).
```

#### [D] MOB PORTRAIT (bust)
```
Monster bust portrait for an anime sci-fi Norse RPG called NEO MIDGARD where every monster is a humanoid ANDROID personification of a machine (no animals, no humans). FACE RULE: the head has a smooth metal faceplate with a glowing visor strip: NO eyes, NO pupils, NO mouth. Hostile units have red or colored glowing visors. A square bust portrait (head and shoulders, facing slightly left) that fills the whole canvas with a dark moody background tinted in the monster's glow color, painterly cel-shaded anime gacha style, crisp lineart, rim light. No text, no letters, no frame. Square 1:1 image (1024x1024).
```

#### [E] MOB BODY SPRITE
```
In-game monster sprite for a cute classic 2000s Korean MMORPG style game (chibi, round, readable silhouette, like classic isometric MMO field monsters), but the monster is a ROBOT / mechanical version of the creature: painted metal shell, visible bolts and panel lines, small glowing core lights, antennas. Machines have sensor lights or a visor slit, never organic eyes. ONE single full-body creature, 3/4 view FACING LEFT, standing on the ground, centered with generous empty space around it, on a FULLY TRANSPARENT background (PNG). Cel-shaded anime game art, crisp dark outline, soft glossy highlights, readable at 64 pixels tall. No text, no frame, no ground shadow, no effects. Square 1:1 image (1024x1024).
```

#### [F] MOB ANIMATION SHEET: attach `mobsprite_<id>` (the one you just made) + `art/tpl_mob.png`
```
Use the attached monster as the exact design (same colors, same size, same art style: cute chibi robot for a 2000s Korean MMORPG). Draw it into the attached 4x2 template, facing LEFT (3/4 view), bottom of the monster on the red line in every cell (even for jumps: the game adds the jump height itself). Top row = MOVE loop, 4 frames. Bottom row = ATTACK, 4 frames. Every frame clearly different. Draw the monster ONLY: no effects, no motion lines, no impact bursts. Leave clear space between cells. Flat white background, do NOT draw the labels, grid or guide lines.
```

#### [G] BOSS SPLASH
```
Epic boss splash art for an anime gacha game, painterly cel shading, dramatic cinematic lighting with strong rim light, highly detailed, sci-fi Norse mythology world called NEO MIDGARD where everyone is an android or a machine. FACE RULE: no organic eyes anywhere: androids have one glowing visor strip, beasts and machines have a glowing visor slit or sensor lights. Menacing but not gory. No text, no logo, no UI. COMPOSITION: the game crops this image to a wide 16:7 card, so keep the boss's head and chest inside the middle 60% of the width and between 12% and 75% of the height; nothing important in the top 10% or the bottom quarter. Full-bleed background. Horizontal 3:2 image (1536x1024).
```

#### [H] MAP BANNER
```
Anime game background art, painterly cel-shaded scenery, rich lighting and atmosphere, sci-fi Norse mythology world of androids called NEO MIDGARD, wide establishing shot from a slightly high angle, no characters, no text, no logo. Keep the lower-middle third calmer and darker (the game prints the map name there). Horizontal 3:2 image (1536x1024).
```

#### [I] ITEM ICON
```
Game inventory item icon for an anime sci-fi Norse RPG called NEO MIDGARD (a world of androids and robots, items are tech parts). ONE single object centered with generous empty space around it, on a FULLY TRANSPARENT background (PNG), cel-shaded, crisp dark outline, soft glow accents, readable at 32 pixels, three-quarter view, consistent lighting from the top-left. No text, no numbers, no letters, no frame, no ground shadow. Square 1:1 image (1024x1024).
```

#### [J] HERO FIELD SPRITE SHEET (2×2, same pipeline as `sheet_heroes_1..4`)
```
In-game character sprite sheet for a cute classic 2000s Korean MMORPG style game (chibi proportions: big head, about 2.5 heads tall, round readable silhouette, like classic isometric MMO player sprites), sci-fi Norse world where every character is a humanoid ANDROID. FACE RULE: smooth glossy metal faceplate with ONE glowing visor strip: NO eyes, NO mouth. 'Hair' is layered synthetic metal plates. Each character is a single full-body figure standing in 3/4 view FACING LEFT, centered in its own equal cell with empty space around it, on a FULLY TRANSPARENT background (PNG). Cel-shaded anime game art, crisp dark outline, glossy highlights, readable at 64 pixels tall. No text, no grid lines, no frames, no ground shadow, figures must not touch. Layout: exactly 2 columns x 2 rows = 4 equal cells, Square 1:1 image (1024x1024). Cells in reading order (left to right, top to bottom):
```

---

## 2. P1: Second-class portraits + emblems (36 images)

Spec for every portrait: **1024×1536 (2:3) · transparent PNG · full body, 3/4 view, nothing above the head in the centre column** · preamble **[A]**.
Spec for every emblem: **generate 1024×1024 → final 128×128 · transparent · centred badge ~80% fill** · preamble **[B]**.
Type-A = `_f` (slim feminine frame), Type-B = `_m` (sturdy masculine frame, broader shoulders, heavier armor). Both genders share the palette, weapon and silhouette motif, so the pair reads as one class.

The stand-ins today are tinted copies of the parent class (see `js/art.js`, second-class loop). Colors below come from `JOBS[...]` in `js/data.js` (glow / outfit / outfit2 / cape).

### 2.1 Valkyrie Knight (`valkyrie`), from Einherjar · glow `#ffd27a`
Holy tank: golden shield, spear of light, earthquake shield-slam, healing call. Weapon: sword + shield.

#### `job_valkyrie_f.webp`
Spec: 1024×1536 · transparent · full body
```
Character: Valkyrie Knight, a holy guardian knight android (tank class), a feminine slim android (Frame Type-A). Long platinum-blonde hair plates woven into one thick braid, a glowing warm-gold visor strip. Silver-white plate armor with polished gold trim and engraved knotwork, a cream-white cape with gold edging, a winged Viking-style helmet whose small metal feather-wings sweep backward (no horns). Folded mechanical feather-blade wings on her back, tucked low behind the shoulders. Holding a large round golden aegis shield with a radiant sun-core in her left hand and a slim energy sword with a white-gold edge in her right hand; a faint spear of golden light floats diagonally behind her at hip height. Calm, protective stance, warm golden rim light.
```
TH: อัศวินวาลคิรี หญิง ชุดเกราะเงินขาว-ทอง หมวกปีก โล่ทองกลม ดาบแสง หอกแสงลอยด้านหลัง

#### `job_valkyrie_m.webp`
Spec: 1024×1536 · transparent · full body
```
Character: Valkyrie Knight, a holy guardian knight android (tank class), a masculine sturdy android (Frame Type-B, broader shoulders and heavier armor). Short swept-back platinum-blonde hair plates, a glowing warm-gold visor strip. Heavy silver-white plate armor with polished gold trim and engraved knotwork, a cream-white cape with gold edging, a winged Viking-style helmet with backward-swept metal feather-wings (no horns). Folded mechanical feather-blade wings on his back. A large round golden aegis shield with a radiant sun-core held forward, and a broad energy sword with a white-gold edge lowered at his side; a faint spear of golden light floats diagonally behind him at hip height. Immovable guardian stance, warm golden rim light.
```
TH: อัศวินวาลคิรี ชาย เกราะหนักเงิน-ทอง โล่ทอง ยืนแบบกำแพง

#### `emblem_valkyrie.webp`
Spec: 1024² → 128² · transparent
```
Emblem: a winged helmet above a round shield, crossed vertically by a spear of light; warm gold gem core.
```
TH: ตราหมวกปีกเหนือโล่กลม หอกแสงพาดกลาง แกนสีทอง

### 2.2 Hersir Vanguard (`hersir`), from Einherjar · glow `#ff8060`
Assault war-chief: charges first, drills through lines. Weapon: sword (optionally sword + shield).

#### `job_hersir_f.webp`
Spec: 1024×1536 · transparent · full body
```
Character: Hersir Vanguard, an assault war-chief android (heavy warrior class), a feminine slim android (Frame Type-A). Long dark-gunmetal hair plates tied in a high warrior tail, a glowing crimson-orange visor strip. Dark gunmetal plate armor with crimson enamel panels and bronze rivets, a fur-trimmed dark-red war cloak, a rounded spangenhelm-style helmet with a short nose guard and a crimson crest plume. A small crimson war-banner pennant on a short pole strapped to her back, set to the side so it does not rise above her head. Holding a long heavy energy longsword with a glowing crimson edge, angled forward as if starting a charge; a round shield slung on her back. Forward-leaning charging stance, ember sparks around her feet.
```
TH: แนวหน้าเฮิร์เซียร์ หญิง เกราะเหล็กเข้ม-แดง ผ้าคลุมขนสัตว์ ดาบยาวพร้อมพุ่งชาร์จ ธงศึกเล็กที่หลัง

#### `job_hersir_m.webp`
Spec: 1024×1536 · transparent · full body
```
Character: Hersir Vanguard, an assault war-chief android (heavy warrior class), a masculine sturdy android (Frame Type-B, broader shoulders and heavier armor). Short dark-gunmetal hair plates with a braided side lock, a glowing crimson-orange visor strip. Heavy dark gunmetal plate armor with crimson enamel panels and bronze rivets, a thick fur-trimmed dark-red war cloak, a spangenhelm-style helmet with a nose guard and crimson crest plume. A small crimson war-banner pennant strapped to his back, kept to one side. A heavy energy longsword with a glowing crimson edge held low in both hands, ready to charge. Aggressive forward stance, ember sparks and dust kicked up at his boots.
```
TH: แนวหน้าเฮิร์เซียร์ ชาย ขุนศึกบุกทะลวง ดาบยาวสองมือ

#### `emblem_hersir.webp`
Spec: 1024² → 128² · transparent
```
Emblem: a sword and a spear crossed over a small swallow-tailed war banner, with a spiral motif around the spear tip; crimson-orange gem core.
```
TH: ตราดาบไขว้หอกบนธงศึก ลายเกลียว แกนแดงส้ม

### 2.3 Galdr Sage (`galdr`), from Rune Caster · glow `#9ad8ff`
A chanter whose voice turns runes into storms (meteors, frost, chain lightning). Weapon: rod.

#### `job_galdr_f.webp`
Spec: 1024×1536 · transparent · full body
```
Character: Galdr Sage, a rune-chanting mage android (wide-area magic class), a feminine slim android (Frame Type-A). Very long deep-navy hair plates with ice-blue tips, a glowing pale ice-blue visor strip. Layered long robes in deep navy and pale ice-blue with silver rune embroidery, a high collar with a small glowing speaker grille at the throat that emits faint rings of sound (she sings through it; there is still no mouth). A ring of floating carved rune-stones orbits her waist. Holding a tall slender staff topped with a tuning-fork-shaped crystal that hums with blue light, held to the side. One hand raised, palm open, conducting. Snowflakes and tiny embers mixed in the air, cool blue rim light.
```
TH: ปราชญ์กัลดร์ หญิง ชุดคลุมน้ำเงินเข้ม-ฟ้าน้ำแข็ง ปลอกคอลำโพงส่งคลื่นเสียง หินรูนลอยรอบเอว คทาส้อมเสียงคริสตัล

#### `job_galdr_m.webp`
Spec: 1024×1536 · transparent · full body
```
Character: Galdr Sage, a rune-chanting mage android (wide-area magic class), a masculine sturdy android (Frame Type-B, broader shoulders). Shoulder-length deep-navy hair plates with ice-blue tips, a glowing pale ice-blue visor strip. Long layered navy and ice-blue scholar robes with silver rune embroidery and a hooded mantle pushed back, a high collar with a glowing speaker grille at the throat emitting faint sound rings. A ring of floating rune-stones orbits him. A tall staff topped with a tuning-fork-shaped crystal held at his side, the other arm sweeping outward as if commanding a storm. Cool blue rim light, a few ice shards and sparks drifting.
```
TH: ปราชญ์กัลดร์ ชาย นักขับขานรูน ท่าบัญชาพายุ

#### `emblem_galdr.webp`
Spec: 1024² → 128² · transparent
```
Emblem: a rune staff in the center surrounded by three concentric sound-wave rings made of tiny runes; ice-blue gem core.
```
TH: ตราคทารูนกับวงคลื่นเสียงสามชั้น แกนฟ้าน้ำแข็ง

### 2.4 Seidr Witch (`seidr`), from Rune Caster · glow `#c07aff`
Forbidden seidr of Vanaheim: curses, poison, void. Darkness beneath the roots. Weapon: rod.

#### `job_seidr_f.webp`
Spec: 1024×1536 · transparent · full body
```
Character: Seidr Witch, a dark-magic seeress android (curse and poison mage class), a feminine slim android (Frame Type-A). Long wavy black-violet hair plates, a glowing violet visor strip. A deep-plum hooded robe with a wide hood shaped from overlapping metal plates, a veil of fine hanging chains and small carved wooden talisman beads at the hood's edge, violet circuit embroidery, layered skirt panels. Holding a staff of twisted dark root-wood bound with silver wire, topped with a small floating orb of void (black core, violet rim), held to the side. Faint green-violet hex wisps curl around her free hand. Mysterious, calm, not evil; soft violet rim light.
```
TH: แม่มดเซดร์ หญิง ฮู้ดแผ่นโลหะ ม่านโซ่ คทารากไม้บิด ลูกแก้วความว่างเปล่า ควันสาปเขียว-ม่วง

#### `job_seidr_m.webp`
Spec: 1024×1536 · transparent · full body
```
Character: Seidr Witch, a dark-magic seer android (curse and poison mage class), a masculine sturdy android (Frame Type-B, broader shoulders). Long straight black-violet hair plates, a glowing violet visor strip. A deep-plum hooded long coat with a plated hood, chain-and-talisman veil at the hood's edge, violet circuit embroidery and a mantle of layered dark cloth. A staff of twisted dark root-wood topped with a floating void orb (black core, violet rim) held to the side; green-violet hex wisps coil around his other hand. Composed, enigmatic stance, soft violet rim light.
```
TH: แม่มดเซดร์ ชาย เสื้อคลุมฮู้ดม่วงเข้ม คทารากไม้

#### `emblem_seidr.webp`
Spec: 1024² → 128² · transparent
```
Emblem: a crescent moon cradling a twisted root staff, with a small hex sigil circle behind it; violet gem core.
```
TH: ตราจันทร์เสี้ยวโอบคทาราก วงสาป แกนม่วง

### 2.5 Skadi Ranger (`skadi`), from Wildhunter · glow `#b8f0ff`
Hunter of the snowy peaks, follower of Skadi (goddess of winter and skiing). Frost arrows, arrow rain. Weapon: bow.

#### `job_skadi_f.webp`
Spec: 1024×1536 · transparent · full body
```
Character: Skadi Ranger, a winter huntress android (frost archer class), a feminine slim android (Frame Type-A). Long silver-white hair plates in a loose braid, a glowing ice-cyan visor strip. A snow-white hooded mantle with soft white fiber trim like frost fur, glacier-blue armor plates over a white bodysuit, sleek greaves shaped like short ski blades at the shins. Holding a longbow whose limbs are made of clear ice crystal with glowing cyan strings, held low to the side; a quiver of frost-tipped arrows on her back. Light snowfall around her, cold cyan rim light and a faint aurora tint.
```
TH: เรนเจอร์สกาดี หญิง ผ้าคลุมหิมะขาว เกราะฟ้าธารน้ำแข็ง สนับแข้งทรงสกี ธนูคริสตัลน้ำแข็ง

#### `job_skadi_m.webp`
Spec: 1024×1536 · transparent · full body
```
Character: Skadi Ranger, a winter hunter android (frost archer class), a masculine sturdy android (Frame Type-B, broader shoulders). Short silver-white hair plates, a glowing ice-cyan visor strip. A snow-white hooded mantle with frost-fiber trim, glacier-blue armor plates, ski-blade greaves at the shins, a short pair of tech skis strapped diagonally across his back (kept below head height). An ice-crystal longbow with glowing cyan strings held at his side, a quiver of frost arrows. Light snowfall, cold cyan rim light.
```
TH: เรนเจอร์สกาดี ชาย สกีคาดหลัง ธนูน้ำแข็ง

#### `emblem_skadi.webp`
Spec: 1024² → 128² · transparent
```
Emblem: a large six-pointed snowflake behind a drawn bow with a nocked arrow pointing up, small mountain peaks at the base; ice-cyan gem core.
```
TH: ตราเกล็ดหิมะหลังคันธนู ยอดเขาเล็ก แกนฟ้าน้ำแข็ง

### 2.6 Ullr Sniper (`ullr`), from Wildhunter · glow `#d0ff8a`
Disciple of Ullr (god of the bow and skis). Sees farther than anyone; one shot ends the hunt. Weapon: bow.

#### `job_ullr_f.webp`
Spec: 1024×1536 · transparent · full body
```
Character: Ullr Sniper, a long-range marksman android (sniper archer class), a feminine slim android (Frame Type-A). Shoulder-length khaki-gold hair plates, a glowing lime-green visor strip with a small flip-down scope lens module clipped over one side of the visor (a lens, not an eye). A layered forest-green camouflage cloak with leaf-shaped plates, khaki-gold armor accents, fingerless shooting gloves. Holding a very long recurve-and-compound hybrid bow with thin stabilizer rods and a small sight ring, held vertically to the side of her body (not above her head). A slim quiver at the hip. Still, focused stance, soft forest light with lime rim light.
```
TH: สไนเปอร์อุลล์ หญิง ผ้าคลุมพรางเขียว เลนส์สโคปติดวิเซอร์ (ไม่ใช่ตา) ธนูยาวมีกันสั่น

#### `job_ullr_m.webp`
Spec: 1024×1536 · transparent · full body
```
Character: Ullr Sniper, a long-range marksman android (sniper archer class), a masculine sturdy android (Frame Type-B, broader shoulders). Short khaki-gold hair plates, a glowing lime-green visor strip with a flip-down scope lens module on one side. A heavy forest-green camouflage cloak of leaf-shaped plates, khaki-gold armor, a bracer on the bow arm. A very long hybrid bow with stabilizer rods held vertically at his side, a quiver at the hip, kneeling on one knee in a ready-to-shoot pose. Soft forest light, lime rim light.
```
TH: สไนเปอร์อุลล์ ชาย ท่าคุกเข่าพร้อมยิง

#### `emblem_ullr.webp`
Spec: 1024² → 128² · transparent
```
Emblem: a single arrow piercing the center of a crosshair ring, with two small crossed skis behind; lime-green gem core.
```
TH: ตราลูกธนูทะลุวงเป้าเล็ง สกีไขว้ แกนเขียวมะนาว

### 2.7 Norn Oracle (`norn`), from Völva · glow `#fff0a8`
Weaver of fate with the three Norns beneath the World Tree. Greater heals, fate buffs, judgment light. Weapon: mace / scepter.

#### `job_norn_f.webp`
Spec: 1024×1536 · transparent · full body
```
Character: Norn Oracle, a fate-weaving priestess android (healer and support class), a feminine slim android (Frame Type-A). Very long silver-lavender hair plates flowing like threads, a glowing pale-gold visor strip. A flowing ivory gown-robe with lavender inner layers and gold thread embroidery, a delicate gold circlet with three small gems (gold, silver, lavender). Three glowing threads of light (gold, silver, lavender) weave between her fingers and drift around her. Holding a scepter shaped like an ornate golden spindle at her side. Serene, gentle stance, warm gold and lavender rim light, tiny light motes.
```
TH: นอร์นผู้ทอชะตา หญิง ชุดงาช้าง-ลาเวนเดอร์ เส้นด้ายแสงสามสี คทาทรงกระสวยทอง

#### `job_norn_m.webp`
Spec: 1024×1536 · transparent · full body
```
Character: Norn Oracle, a fate-weaving priest android (healer and support class), a masculine sturdy android (Frame Type-B, broader shoulders). Long straight silver-lavender hair plates, a glowing pale-gold visor strip. A long ivory priest coat with lavender inner layers, a gold-embroidered mantle and a gold circlet with three small gems. Three glowing threads of light (gold, silver, lavender) spiral from his open palm. A golden spindle-shaped scepter held at his side. Calm, dignified stance, warm gold and lavender rim light.
```
TH: นอร์นผู้ทอชะตา ชาย ด้ายแสงหมุนจากฝ่ามือ

#### `emblem_norn.webp`
Spec: 1024² → 128² · transparent
```
Emblem: three intertwined threads forming a triquetra knot around a small golden spindle; pale-gold gem core.
```
TH: ตราด้ายสามเส้นถักเป็นปมสามแฉกรอบกระสวย แกนทองอ่อน

### 2.8 Gythja Monk (`gythja`), from Völva · glow `#ffc070`
A priestess who chose fists over prayer: holy fist, triple palm, divine burst. Weapon: mace (melee).

#### `job_gythja_f.webp`
Spec: 1024×1536 · transparent · full body
```
Character: Gythja Monk, a battle-priestess android (holy martial artist class), a feminine slim android (Frame Type-A). Long dark-amber hair plates in a high ponytail, a glowing warm-amber visor strip, a thin gold circlet. Cream and amber martial priest robes with a wide sash, armored sleeves and shin guards, a long chain of small golden rune-beads draped over one shoulder. Large golden gauntlets glowing with holy light, one fist raised in a martial-arts guard; a short flanged mace hangs at her hip. Dynamic martial stance, warm amber rim light, soft light particles around the fists.
```
TH: นักบวชหมัดเทพ หญิง ชุดนักบวชครีม-อำพัน ถุงมือทองเรืองแสง ลูกประคำรูน กระบองเหน็บเอว

#### `job_gythja_m.webp`
Spec: 1024×1536 · transparent · full body
```
Character: Gythja Monk, a battle-priest android (holy martial artist class), a masculine sturdy android (Frame Type-B, broader shoulders and heavier frame). Short dark-amber hair plates, a glowing warm-amber visor strip, a gold circlet. Cream and amber martial priest robes with a wide sash, armored forearms and shin guards, a chain of golden rune-beads across the chest. Massive golden gauntlets glowing with holy light, one palm thrust forward, the other fist at the hip; a flanged mace at the belt. Grounded horse-stance, warm amber rim light.
```
TH: นักบวชหมัดเทพ ชาย ท่าตั้งม้า ฝ่ามือผลัก

#### `emblem_gythja.webp`
Spec: 1024² → 128² · transparent
```
Emblem: a gauntleted fist in front of a radiant sun disk, ringed by small rune beads; warm amber gem core.
```
TH: ตรากำปั้นถุงมือหน้าดวงอาทิตย์ ลูกประคำล้อม แกนอำพัน

### 2.9 Loki's Phantom (`phantom`), from Loki's Trickster · glow `#e08aff`
A shadow Loki left in Midgard: vanishes mid-swing and strikes twice. Weapon: dagger.

#### `job_phantom_f.webp`
Spec: 1024×1536 · transparent · full body
```
Character: Loki's Phantom, a shadow assassin android (critical dual-strike class), a feminine slim android (Frame Type-A). A long crimson-black ponytail of cable hair, a glowing magenta visor strip behind an elegant half-mask faceplate cover (theatrical Loki mask motif, one side darker). Sleek near-black violet stealth armor with magenta seam lights, a long tattered smoke-like scarf trailing behind. Twin curved daggers with magenta energy edges held in reverse grip. A translucent violet afterimage of herself is offset slightly behind her, mid-motion. Poised, agile stance, magenta rim light, wisps of violet smoke at her feet.
```
TH: ภูตลวงแห่งโลกิ หญิง ชุดลอบเร้นดำม่วง หน้ากากครึ่งซีก มีดคู่แสงชมพูม่วง เงาซ้อนด้านหลัง

#### `job_phantom_m.webp`
Spec: 1024×1536 · transparent · full body
```
Character: Loki's Phantom, a shadow assassin android (critical dual-strike class), a masculine sturdy android (Frame Type-B, broader shoulders). Short spiky crimson-black hair plates, a glowing magenta visor strip behind a half-mask faceplate cover with a Loki motif. Near-black violet stealth armor with magenta seam lights, a long tattered smoke scarf. Twin magenta-edged daggers, one held forward, one reversed. A translucent violet afterimage of himself offset behind. Low ready stance, magenta rim light, violet smoke wisps.
```
TH: ภูตลวงแห่งโลกิ ชาย มีดคู่ เงาร่างซ้อน

#### `emblem_phantom.webp`
Spec: 1024² → 128² · transparent
```
Emblem: a theatrical half-mask split into a light half and a dark half, with two daggers crossed behind it and a faint ghost outline of the mask offset to one side; magenta gem core.
```
TH: ตราหน้ากากครึ่งสว่างครึ่งมืด มีดไขว้ เงาซ้อน แกนชมพูม่วง

### 2.10 Skald Bard (`skald`), from Loki's Trickster · glow `#7ad0ff`
A poet who sings legends amid battle: war drum, sound waves, buff songs. Weapon: dagger.

#### `job_skald_f.webp`
Spec: 1024×1536 · transparent · full body
```
Character: Skald Bard, a war-poet android (song and sound-wave class), a feminine slim android (Frame Type-A). Wavy shoulder-length navy hair plates with gold clasps, a glowing sky-blue visor strip, headset fins shaped like small speaker horns. A navy traveling poet's coat with gold embroidery and a short blue cape, light armor plates, a small round Norse war drum at her hip. A compact tech lyre with glowing sky-blue light strings cradled in one arm; a slim dagger sheathed on her belt. Glowing musical sound rings drift from the lyre. Lively, mid-song pose, sky-blue and gold rim light.
```
TH: สคาลด์ กวีสงคราม หญิง โค้ตกวีน้ำเงิน-ทอง พิณเทคสายเรืองแสง กลองศึกเล็กที่เอว มีดสั้น

#### `job_skald_m.webp`
Spec: 1024×1536 · transparent · full body
```
Character: Skald Bard, a war-poet android (song and sound-wave class), a masculine sturdy android (Frame Type-B, broader shoulders). Short navy hair plates with a gold clasp braid, a glowing sky-blue visor strip, speaker-horn headset fins. A navy coat with gold embroidery, a short blue cape, a round war drum slung at his side with one drumstick in hand, and a compact glowing-string tech lyre on his back (kept below head height). A dagger on the belt. Sound-wave rings pulse from the drum. Confident performer's stance, sky-blue and gold rim light.
```
TH: สคาลด์ ชาย กลองศึก ไม้ตีกลอง พิณสะพายหลัง

#### `emblem_skald.webp`
Spec: 1024² → 128² · transparent
```
Emblem: a small lyre with a dagger crossing behind it, framed by sound-wave arcs on both sides; sky-blue gem core.
```
TH: ตราพิณกับมีดไขว้ คลื่นเสียงสองข้าง แกนฟ้า

### 2.11 Ulfhednar Warlord (`warlord`), from Berserker · glow `#ff6a3a`
Pack leader of the wolf-pelt warriors: wide cleaves, deathless rage. Weapon: axe.

#### `job_warlord_f.webp`
Spec: 1024×1536 · transparent · full body
```
Character: Ulfhednar Warlord, a wolf-pack leader warrior android (berserker axe class), a feminine slim android (Frame Type-A). Long wild ash-silver hair plates, a glowing ember-orange visor strip framed by a full black-iron wolf-head helm whose metal pelt flows down her back like a cloak of overlapping plates. Dark brown leather-like armor with glowing ember seams, a dark red sash, metal wolf-fang trophies on a cord. A huge double-bladed war axe with ember-glowing edges held low across her body (not above her head). Heat haze and drifting embers, fierce stance, ember-orange rim light.
```
TH: จอมทัพอุลฟ์เฮดนาร์ หญิง หมวกหัวหมาป่าเหล็กดำ หนังเกราะแผ่นคลุมหลัง ขวานสองคมไฟคุ

#### `job_warlord_m.webp`
Spec: 1024×1536 · transparent · full body
```
Character: Ulfhednar Warlord, a wolf-pack leader warrior android (berserker axe class), a masculine sturdy android (Frame Type-B, broader shoulders and heavier frame). Short wild ash-silver hair plates, a glowing ember-orange visor strip under a full black-iron wolf-head helm with a plated pelt cloak down his back. Heavy dark brown armor with glowing ember seams, a dark red sash, wolf-fang trophies. A massive double-bladed war axe resting on one shoulder, blade to the side of his head (not above it). Embers and heat haze, commanding stance, ember-orange rim light.
```
TH: จอมทัพอุลฟ์เฮดนาร์ ชาย ขวานใหญ่พาดบ่า

#### `emblem_warlord.webp`
Spec: 1024² → 128² · transparent
```
Emblem: a snarling wolf head crowned with a ring of metal fangs, over a double-bladed axe; ember-orange gem core.
```
TH: ตราหัวหมาป่ามงกุฎเขี้ยว เหนือขวานสองคม แกนส้มไฟ

### 2.12 Jotun Breaker (`jotun`), from Berserker · glow `#c0a080`
Hunter of frost giants with bare hands and a heavy axe: earth-splitting smashes paid in sap. Weapon: axe.

#### `job_jotun_f.webp`
Spec: 1024×1536 · transparent · full body
```
Character: Jotun Breaker, a giant-slayer warrior android (heavy smash class), a feminine slim but strong android (Frame Type-A). Short tousled stone-grey hair plates with frost-white streaks, a glowing tan-gold visor strip. Stone-grey and frost-rimed bronze armor with cracked rock-like plates and glowing amber veins, a heavy brown fur-fiber mantle. An oversized right gauntlet shaped like a boulder fist, and an enormous heavy maul-axe held low, its head resting on the ground beside her. A broken ice-crystal giant's horn hangs as a trophy at her belt. Grounded, powerful stance, frost particles and small rock chips in the air.
```
TH: ผู้พิฆาตโยตุน หญิง เกราะหิน-บรอนซ์มีน้ำแข็งเกาะ ถุงมือข้างขวาเป็นกำปั้นหิน ขวานค้อนยักษ์ เขาน้ำแข็งเป็นของรางวัล

#### `job_jotun_m.webp`
Spec: 1024×1536 · transparent · full body
```
Character: Jotun Breaker, a giant-slayer warrior android (heavy smash class), a masculine very sturdy android (Frame Type-B, massive shoulders and heavy frame). Short stone-grey hair plates with frost streaks, a glowing tan-gold visor strip. Stone-grey and frost-rimed bronze armor with cracked rock-like plates and glowing amber veins, a heavy fur-fiber mantle. A boulder-like oversized right gauntlet clenched, and an enormous maul-axe held at his side, head down. A broken ice-crystal giant's horn trophy at the belt. Unshakable stance like a mountain, frost particles and rock chips in the air.
```
TH: ผู้พิฆาตโยตุน ชาย ร่างใหญ่เหมือนภูเขา

#### `emblem_jotun.webp`
Spec: 1024² → 128² · transparent
```
Emblem: a mountain peak split down the middle by a heavy axe, with a small frost crystal shard at the top; tan-gold gem core.
```
TH: ตรายอดเขาถูกขวานผ่ากลาง ผลึกน้ำแข็ง แกนน้ำตาลทอง

### 2.13 P1+ (recommended): second-class field sprites `hero_<class>_<f|m>` (6 sheets → 24 files)

Why this matters: a second class has no `hero_` image and no `anim_` sheet today, so on the map it falls back to the **code-drawn figure** (`Sprites.human`). That is a visible step down from the first-class art. These six sheets use the same pipeline as `sheet_heroes_1..4`. Before slicing, add the six sheets to `ACTOR_SHEETS` in `tools/asset_spec.py`. That file is tooling, not game code.
Spec: **1024×1024 sheet, 2×2 cells, transparent, 3/4 view facing LEFT, chibi** · preamble **[J]** + cells below.
Note: the long-term goal in `ROADMAP.md` Phase 2 is full walk/attack animation sheets (`art/NOTEPAD.md`). These static sprites are the cheap interim step.

| Sheet | Cells (paste after preamble [J]) |
|---|---|
| `sheet_heroes_5.png` | `1) Valkyrie Knight Type-A (slim): silver-white and gold plate armor, cream cape, winged helmet, golden round shield and energy sword, gold visor, platinum braid. 2) Valkyrie Knight Type-B (sturdy): same armor heavier, short platinum hair, winged helmet, golden shield, sword, gold visor. 3) Hersir Vanguard Type-A: dark gunmetal and crimson armor, fur-trimmed dark red cloak, crest-plumed spangenhelm, long crimson-edged longsword, crimson visor. 4) Hersir Vanguard Type-B: heavier gunmetal and crimson armor, red war cloak, plumed helmet, longsword, crimson visor.` |
| `sheet_heroes_6.png` | `1) Galdr Sage Type-A: long navy and ice-blue robe, floating rune stones, tuning-fork crystal staff, long navy hair plates, ice-blue visor. 2) Galdr Sage Type-B: navy and ice-blue robe with mantle, rune stones, crystal staff, shoulder-length navy hair, ice-blue visor. 3) Seidr Witch Type-A: deep plum plated hood with chain veil, twisted root staff with a void orb, long black-violet hair, violet visor. 4) Seidr Witch Type-B: deep plum hooded coat, root staff with void orb, violet visor.` |
| `sheet_heroes_7.png` | `1) Skadi Ranger Type-A: snow-white hooded mantle, glacier-blue armor, ski-blade greaves, ice-crystal bow, silver braid, ice-cyan visor. 2) Skadi Ranger Type-B: snow-white mantle, glacier-blue armor, skis on back, ice bow, ice-cyan visor. 3) Ullr Sniper Type-A: forest-green leaf-plate camouflage cloak, khaki-gold armor, very long stabilized bow, scope lens on visor, lime visor. 4) Ullr Sniper Type-B: heavier green camouflage cloak, long stabilized bow, scope lens, lime visor.` |
| `sheet_heroes_8.png` | `1) Norn Oracle Type-A: ivory and lavender gown-robe, gold circlet with three gems, golden spindle scepter, three floating light threads, silver-lavender long hair, pale-gold visor. 2) Norn Oracle Type-B: ivory priest coat, lavender mantle, spindle scepter, light threads, pale-gold visor. 3) Gythja Monk Type-A: cream and amber martial priest robes, big golden glowing gauntlets, rune-bead chain, mace at hip, amber ponytail, amber visor. 4) Gythja Monk Type-B: cream and amber robes, massive golden gauntlets, bead chain, amber visor.` |
| `sheet_heroes_9.png` | `1) Loki's Phantom Type-A: near-black violet stealth armor, magenta seam lights, half-mask faceplate cover, tattered smoke scarf, twin magenta daggers, crimson-black ponytail, magenta visor. 2) Loki's Phantom Type-B: same stealth armor, spiky crimson-black hair, twin daggers, magenta visor. 3) Skald Bard Type-A: navy and gold poet coat, short blue cape, glowing-string tech lyre, small war drum at hip, navy wavy hair, sky-blue visor. 4) Skald Bard Type-B: navy and gold coat, war drum and drumstick, lyre on back, sky-blue visor.` |
| `sheet_heroes_10.png` | `1) Ulfhednar Warlord Type-A: black-iron wolf-head helm with plated pelt cloak, dark brown armor with ember seams, huge double-bladed axe, ash-silver wild hair, ember-orange visor. 2) Ulfhednar Warlord Type-B: heavier wolf-pelt armor, axe on shoulder, ember-orange visor. 3) Jotun Breaker Type-A: stone-grey and frost-rimed bronze armor, boulder-like right gauntlet, huge maul-axe, frost-streaked grey hair, tan-gold visor. 4) Jotun Breaker Type-B: massive stone and bronze armor, boulder gauntlet, maul-axe, tan-gold visor.` |

Output files (cells 1→4): `hero_valkyrie_f`, `hero_valkyrie_m`, `hero_hersir_f`, `hero_hersir_m` · `hero_galdr_f/m`, `hero_seidr_f/m` · `hero_skadi_f/m`, `hero_ullr_f/m` · `hero_norn_f/m`, `hero_gythja_f/m` · `hero_phantom_f/m`, `hero_skald_f/m` · `hero_warlord_f/m`, `hero_jotun_f/m`.
TH: สไปรต์ตัวละครในฉาก (ชิบิ) ของคลาสขั้น 2 ตอนนี้เป็นตัววาดด้วยโค้ด ดูด้อยกว่าคลาสแรกชัดเจน

---

## 3. P2: Chapter 6 monsters, MVP Garmr, world-boss splashes

Chapter 6 "The Gnawed Roots" (`js/content_ch6.js`): **Archive Depths** (Lv 33–45, the lower spark archive under Hel's Hollow, where rust is creeping up) → **Gnawed Roots** (Lv 45–60, Yggdrasil's roots chewed from below, MVP **Garmr**).
Every Ch-6 monster is currently a palette-swap of an older monster (`variant(base, {hue, sat, bri, tint})`). The real designs below keep the **base silhouette** so the family resemblance stays (RO-style "Poring → Drops"). The rust motif is new.

**Shared motif for Ch-6: rust.** Orange-brown corrosion that spreads like *root patterns*, flaking paint, faint warm glow inside the cracks (rust "is alive"). Archive mobs get **teal archive light + amber rust**. Roots mobs get **bronze root-wood + blood-red rust + gnaw marks**.

### P2 · Note on field animation (read first)
For 8 of the 10 Ch-6 mobs the base monster has animation sheets (`anim_mob_<base>_walk/attack`). The game **derives tinted animation strips from the base and prefers them over `mobsprite_`** (`Sprites.drawMob` → `Anim.has('mob_<id>')`). So a new `mobsprite_<id>` alone will show in the **target frame and chip card but not in the field**.
Two fixes, pick one:
- **Art fix:** also deliver the move + attack sheet (`[F]`, listed per mob below), or
- **Code fix (small):** in `Art.variantSource`, skip deriving `anim_mob_<id>_*` when a real `mobsprite_<id>` is loaded. See `docs/VISUAL_PLAN.md` §5.
`rust_sap` (base `pudding`) and `rust_mine` (base `capshroom`) have no base animation, so their `mobsprite_` shows in the field right away.

Per-mob specs:
- `mob_<id>`: **1024² → 160² · full-bleed tile · bust facing slightly left** · preamble **[D]**
- `mobsprite_<id>`: **1024² → ≤320 px · transparent · full body 3/4 facing LEFT** · preamble **[E]**
- anim sheet: **1536×1024 on `art/tpl_mob.png`, white bg → `anim_mob_<id>_walk` + `anim_mob_<id>_attack` (960×240 each)** · preamble **[F]** + attach the new `mobsprite_<id>` and `art/tpl_mob.png`

### 3.1 Rust Sap Unit (`rust_sap`) · Lv 33 · base Gel Unit (`pudding`) · Archive Depths · passive
Lore: a walking sac of sap that trickled down the wrong way; the sap inside has turned the color of rust.

#### `mob_rust_sap.webp`
Spec: 1024² → 160² · full-bleed
```
Rust Sap Unit: a small cute android with a bob of translucent rust-orange gel hair plates, murky amber sap visibly sloshing inside, a cracked copper band visor glowing dull orange, droplets of rusty sap on the shoulders. Background: dim teal archive shelves tinted amber.
```
TH: หน้ามอน หน่วยถุงน้ำเลี้ยงขึ้นสนิม เจลสีส้มสนิมขุ่น

#### `mobsprite_rust_sap.webp`
Spec: 1024² → ≤320 px · transparent
```
A small bouncy jelly-slime robot: round gummy dome of murky translucent rust-orange gel over a corroded copper core, flakes of rust floating inside the gel, a bent little antenna with a dim amber light, a few thick sap drips at the base, sluggish droopy shape. Two small glowing dots as its face lights.
```
TH: สไลม์เจลสีสนิม แกนทองแดงผุ หยดน้ำเลี้ยงเยิ้ม

*(no anim sheet needed: base has none)*

### 3.2 Archive Warden (`archive_warden`) · Lv 36 · base Frame Warden (`bone_warden`) · Archive Depths · aggressive
Lore: a frame that guards the lowest shelves; anyone who passes without a seal is treated as a thief.

#### `mob_archive_warden.webp`
Spec: 1024² → 160² · full-bleed
```
Archive Warden: a gaunt skeletal android with a bone-white and teal metal skull-like helmet faceplate, a narrow teal slit visor, a ring of brass shelf-keys and paper-thin metal ledger tags hanging at the collar, faint amber rust creeping up one shoulder. Background: deep teal archive glow.
```
TH: หน้ามอน ผู้เฝ้าคลัง โครงกระดูกเหล็กขาว-เขียวน้ำทะเล พวงกุญแจชั้นวาง

#### `mobsprite_archive_warden.webp`
Spec: 1024² → ≤320 px · transparent
```
A SKELETON robot guard: white bone-like metal frame with exposed ribs tinted pale teal, a teal visor light, holding a straight sword and a small round shield stamped with a glowing teal archive seal (a circle with a rune), a ring of brass keys and dangling metal ledger tags at the hip, amber rust spreading in root-like lines over the legs.
```
TH: โครงกระดูกหุ่นถือดาบ โล่ตราประทับคลังเรืองแสง สนิมลามลายราก

#### Anim `anim_mob_archive_warden_walk` + `_attack` (one sheet)
Spec: 1536×1024 on `art/tpl_mob.png` · white bg
```
This is Archive Warden. Top row = MOVE loop: stiff patrol march, keys swinging, shield held forward. Bottom row = ATTACK: raise sword, step in, straight downward slash, return to guard.
```
TH: ชีตเดิน+โจมตี เดินลาดตระเวนแข็งทื่อ ฟันดาบลง

### 3.3 Rust Mine Unit (`rust_mine`) · Lv 38 · base Mine Unit (`capshroom`) · Archive Depths · passive
Lore: the last line of rust-barrier mines, planted deepest; the first the rust ate through until they detonated on their own.

#### `mob_rust_mine.webp`
Spec: 1024² → 160² · full-bleed
```
Rust Mine Unit: an android wearing a corroded rust-brown mushroom-dome helmet with flaking paint and glowing ember-orange spots, a red-orange slit visor, a short sparking fuse cord on top. Background: smoky amber.
```
TH: หน้ามอน ทุ่นระเบิดหมวกเห็ดขึ้นสนิม ชนวนมีประกายไฟ

#### `mobsprite_rust_mine.webp`
Spec: 1024² → ≤320 px · transparent
```
A walking MUSHROOM-MINE robot: big corroded rust-brown metal cap with flaking paint, the old white spots now glowing ember-orange like hot fuses, stubby little legs in scuffed boots, a short fuse on top throwing tiny sparks, a cracked red warning light on the front.
```
TH: หุ่นเห็ดระเบิดสนิม จุดบนหมวกเรืองส้มเหมือนชนวน

*(no anim sheet needed: base has none)*

### 3.4 Archive Maiden (`archive_maiden`) · Lv 41 · base Hel Maiden Unit (`hel_maiden`) · Archive Depths · passive
Lore: keeper of the lowest shelves; she hoards rusted sparks in her lantern and will not discard even one. (Gentle, does not attack first.)

#### `mob_archive_maiden.webp`
Spec: 1024² → 160² · full-bleed
```
Archive Maiden: a gentle hooded android with a pale porcelain faceplate and a soft green-teal visor, a deep moss-green and teal hood with frayed edges, holding up a lantern crowded with many small warm rust-orange sparks, a dusting cloth over one arm. Sad, tender mood. Background: dim teal and amber.
```
TH: หน้ามอน ผู้ดูแลชั้นวาง อ่อนโยน ตะเกียงเต็มไปด้วยประกายสนิม

#### `mobsprite_archive_maiden.webp`
Spec: 1024² → ≤320 px · transparent
```
A floating GHOST-like keeper robot: a hooded moss-green and teal cloak with no legs and a frayed hem, a pale metal face mask with a soft green-teal visor light, holding a lantern stuffed with many tiny rust-orange glowing sparks, a dust cloth draped over one arm. Gentle, not scary.
```
TH: ผีผู้ดูแลลอยได้ ฮู้ดเขียวมอส ตะเกียงประกายสนิม

#### Anim `anim_mob_archive_maiden_walk` + `_attack`
Spec: 1536×1024 on `art/tpl_mob.png` · white bg
```
This is Archive Maiden. Top row = MOVE loop: drifting float, cloak hem swaying, lantern swinging gently. Bottom row = ATTACK: pull lantern back, sparks flare, swing lantern forward, settle.
```
TH: ลอยไปมา ตะเกียงแกว่ง โจมตีด้วยการเหวี่ยงตะเกียง

### 3.5 Rust Husk (`rust_draugr`) · Lv 44 · base Draugr Husk (`draugr`) · Archive Depths · aggressive
Lore: a Draugr harvested on the wrong floor; rust has eaten its scrap-metal body until nothing remains but rage.

#### `mob_rust_draugr.webp`
Spec: 1024² → 160² · full-bleed
```
Rust Husk: a battered android in a dented horned viking helmet, almost entirely corroded orange-brown, rust cracks glowing hot orange from inside, a single red visor slit, torn cloth over the shoulders. Angry, hunched. Background: burnt orange haze.
```
TH: หน้ามอน ดรากร์ที่สนิมกินทั้งตัว รอยแตกเรืองส้ม

#### `mobsprite_rust_draugr.webp`
Spec: 1024² → ≤320 px · transparent
```
A shambling rusted humanoid robot in a battered horned viking helmet: body almost entirely corroded orange-brown with root-patterned rust, cracks glowing hot orange from inside, torn cloth, one red visor light, dragging a heavy rust-eaten axe. Bulkier and angrier than a normal Draugr.
```
TH: หุ่นดรากร์สนิมเต็มตัว ลากขวานผุ

#### Anim `anim_mob_rust_draugr_walk` + `_attack`
Spec: 1536×1024 on `art/tpl_mob.png` · white bg
```
This is Rust Husk. Top row = MOVE loop: heavy shambling walk dragging the axe, rust flakes falling. Bottom row = ATTACK: raise axe overhead with both hands, lurch forward, heavy CHOP, stagger back.
```
TH: เดินลากขวาน โจมตีสับหนัก

### 3.6 Root Crawler Unit (`root_crawler`) · Lv 46 · base Crawler Unit (`leafworm`) · Gnawed Roots · passive
Lore: a root-inspection unit that crawled down to find the source of the cracks, and never climbed back up.

#### `mob_root_crawler.webp`
Spec: 1024² → 160² · full-bleed
```
Root Crawler Unit: a small android with short dark-bronze segmented hair plates, a dim amber slit visor, a tiny drill-tipped antenna, tangled root fibers caught around the neck, a cracked inspection lamp on the shoulder. Background: dark bronze roots in red-brown gloom.
```
TH: หน้ามอน หน่วยตรวจรากที่ไม่ได้กลับขึ้นไป

#### `mobsprite_root_crawler.webp`
Spec: 1024² → ≤320 px · transparent
```
A chubby CATERPILLAR robot in dark bronze and soot-brown: segmented rounded metal body sections, stubby little legs, a drill-tipped antenna instead of a leaf, a small cracked inspection headlamp, tangled root fibers dragged along its back, dim amber sensor lights.
```
TH: หุ่นหนอนผีเสื้อสีบรอนซ์เข้ม หนวดสว่าน เศษรากพันตัว

#### Anim `anim_mob_root_crawler_walk` + `_attack`
Spec: 1536×1024 on `art/tpl_mob.png` · white bg
```
This is Root Crawler Unit. Top row = MOVE loop: inching crawl, segments bunching and stretching, headlamp bobbing. Bottom row = ATTACK: rear up, drill antenna spins, head-butt forward, curl back.
```
TH: คลานยืดหด โจมตีด้วยหนวดสว่าน

### 3.7 Gnawed Sentry (`gnawed_stump`) · Lv 49 · base Rust Sentry (`stumpling`) · Gnawed Roots · passive
Lore: a stump sentry that has guarded the roots so long it has been gnawed half away, and still will not retreat.

#### `mob_gnawed_stump.webp`
Spec: 1024² → 160² · full-bleed
```
Gnawed Sentry: a stocky old guard android with a faded grey-violet bark-textured helmet, a big chunk bitten out of one side, a steady pale violet slit visor, a tiny guard lantern clipped to the collar. Stubborn, dignified. Background: grey-violet dusk in the roots.
```
TH: หน้ามอน ยามตอไม้ถูกแทะไปครึ่งซีก ยังยืนเฝ้า

#### `mobsprite_gnawed_stump.webp`
Spec: 1024² → ≤320 px · transparent
```
A walking TREE-STUMP robot: bark made of faded grey-violet metal plates, a huge semicircular bite taken out of one side showing gears inside, many small tooth-mark grooves, root-like mechanical legs, a tiny guard lantern hanging from a branch stub, grumpy but standing firm.
```
TH: หุ่นตอไม้สีเทาม่วงซีด แหว่งรอยกัดเห็นเฟือง

#### Anim `anim_mob_gnawed_stump_walk` + `_attack`
Spec: 1536×1024 on `art/tpl_mob.png` · white bg
```
This is Gnawed Sentry. Top row = MOVE loop: slow heavy root-leg shuffle, lantern swinging. Bottom row = ATTACK: lean back, swing a thick root-arm, SLAM forward, settle.
```
TH: เดินเชื่องช้า ฟาดด้วยแขนราก

### 3.8 Gnawed Brute (`gnawed_brute`) · Lv 53 · base Iron Brute (`mossback`) · Gnawed Roots · passive
Lore: an iron bear that carries broken roots back to their place every day, gnawed until its armor faded to ash-gray.

#### `mob_gnawed_brute.webp`
Spec: 1024² → 160² · full-bleed
```
Gnawed Brute: a huge bulky android with an ash-grey bear-eared heavy helmet covered in tooth marks, a dull orange slit visor, a broken root bundle strapped over one shoulder like a load. Weary but strong. Background: ash grey with rust-red undertone.
```
TH: หน้ามอน หมีเหล็กสีเถ้า แบกรากหัก

#### `mobsprite_gnawed_brute.webp`
Spec: 1024² → ≤320 px · transparent
```
A big heavy BEAR robot on four legs: armor plates faded to ash-grey with deep gnaw marks and rust-red edges, a broken bronze root strapped across its back like cargo, a few dry dead vines where moss used to grow, a dull orange visor light.
```
TH: หุ่นหมีสี่ขา เกราะซีดเถ้า แบกรากหักบนหลัง

#### Anim `anim_mob_gnawed_brute_walk` + `_attack`
Spec: 1536×1024 on `art/tpl_mob.png` · white bg
```
This is Gnawed Brute. Top row = MOVE loop: heavy four-legged lumber, the root load rocking on its back. Bottom row = ATTACK: rear up on hind legs, both paws high, crash down, recover.
```
TH: เดินสี่ขาหนัก ยืนสองขาแล้วตะปบลง

### 3.9 Root Gnawer (`root_gnawer`) · Lv 57 · base Tusk Trooper (`tuskboar`) · Gnawed Roots · aggressive
Lore: once a tilling unit; now it tills into the roots, gnawing through everything in its path.

#### `mob_root_gnawer.webp`
Spec: 1024² → 160² · full-bleed
```
Root Gnawer: a fierce android with a boar-snout helmet in blood-red rusted plating, two huge worn grinding tusks curving up from the jaw guard, a blazing red slit visor, root splinters caught in the plates. Background: deep crimson.
```
TH: หน้ามอน ผู้แทะราก หมวกจมูกหมูป่า เขี้ยวบดใหญ่

#### `mobsprite_root_gnawer.webp`
Spec: 1024² → ≤320 px · transparent
```
An armored WILD BOAR robot on four legs: blood-red rusted plate hide, enormous worn grinding tusks with drill-like ridges, a snout like a tilling blade, bronze root splinters stuck in its back plates, red visor light, charging posture.
```
TH: หุ่นหมูป่าสนิมแดง เขี้ยวบดสันเกลียว

#### Anim `anim_mob_root_gnawer_walk` + `_attack`
Spec: 1536×1024 on `art/tpl_mob.png` · white bg
```
This is Root Gnawer. Top row = MOVE loop: fast aggressive trot, head low, dust kicked up. Bottom row = ATTACK: paw the ground, lunge forward, upward tusk GORE, skid back.
```
TH: วิ่งเหยาะดุดัน โจมตีเสยเขี้ยว

### 3.10 MVP Garmr (`garmr`) · Lv 60 · base Fenrir Unit (`fenrir_pup`) · Gnawed Roots
Lore: Hel chained it at the root gate to hold back the rust. It gnawed the rust for thirty years, until the rust gnawed back. Myth note: Garmr is the blood-breasted hound of Hel's gate. Show that as **rust-red chest plating**, not blood.

#### `mvp_garmr.webp` (boss reveal splash)
Spec: 1536×1024 (3:2) · full-bleed · boss head/chest in centre 60% width, 12–75% height (16:7 crop)
Preamble **[G]**, then:
```
Boss splash art: GARMR, the hound of the root gate, a colossal four-legged mechanical war-hound the size of a house, built like a giant robot wolf: blackened iron plate fur, a broad chest of rust-red corroded plating with root-shaped rust veins glowing faintly orange, a heavy spiked collar with a snapped chain hanging from it, iron fangs with ember glow in the jaw, and a single deep-crimson V-shaped visor slit across the muzzle instead of eyes. Thick bronze roots of a giant mechanical tree coil around its forelegs. Behind it, a colossal round gate carved from roots and runes, half broken. Setting: a dark cavern of gnawed bronze roots with deep tooth marks, rust-red veins and thin streams of green-gold sap light; embers and rust dust drift in the air. Low camera, Garmr lunging toward the viewer, dramatic epic boss reveal.
```
TH: ฉากเปิดตัว MVP การ์มร์ สุนัขเฝ้าประตูราก ตัวใหญ่เท่าบ้าน อกเกราะสนิมแดง ปลอกคอโซ่ขาด วิเซอร์รูปตัว V สีแดงเข้ม

#### `mob_garmr.webp`
Spec: 1024² → 160² · full-bleed
```
Garmr: a menacing tall android with a black-iron wolf-hound helmet with tall pointed ears, a deep-crimson V visor, a rust-red corroded chest plate with glowing orange root-like veins, a spiked collar with a broken chain link. Background: deep crimson and ember.
```
TH: หน้ามอน การ์มร์ (ใช้บนการ์ดชิป MVP กรอบทอง)

#### `mobsprite_garmr.webp`
Spec: 1024² → ≤320 px · transparent
```
A huge WOLF-HOUND robot on four legs (boss, heavier and broader than a normal robot wolf): blackened iron plate fur with sharp layered plates, rust-red corroded chest armor with glowing orange root-like veins, a spiked collar with a snapped chain hanging down, bronze root tendrils wrapped around one foreleg, a crimson V-shaped visor slit, iron fangs with ember glow, snarling.
```
TH: สไปรต์การ์มร์ หมาป่าเหล็กดำใหญ่ อกสนิมแดง โซ่ขาด

#### Anim `anim_mob_garmr_walk` + `_attack`
Spec: 1536×1024 on `art/tpl_mob.png` · white bg
```
This is Garmr, a boss. Top row = MOVE loop: heavy prowling stalk, head low, the broken chain swinging. Bottom row = ATTACK: crouch, lunge forward with jaws wide, BITE, pull back shaking its head.
```
TH: ย่องล่า โซ่แกว่ง โจมตีด้วยการกระโจนกัด

### 3.11 World-boss splash variants (`js/worldboss.js`)
World bosses are the "Ancient" versions of the three MVPs (5× HP), spawned on a real-clock cycle. Their splash key is `mvp_wb_<mvp>`, and today it is the MVP splash tinted gold (hue 35, tint `#ffcf4a`). The real art should read as the **same boss, ancient and ascended**: gilded, scarred plating, more ornate, a bigger aura, and a crowd-scale threat.
Spec for all three: **1536×1024 (3:2) · full-bleed · 16:7 safe band** · preamble **[G]**.

#### `mvp_wb_seraph_pudding.webp`
```
Boss splash art: ANCIENT SERAPH CORE, a world boss. A gigantic regal jelly-slime machine of translucent golden-white gel over an ornate gilded core, its gel crackled like old amber, with six large mechanical angel wings of gold feather-blades spread wide, three stacked golden halos above, ancient Norse rune rings orbiting it, and a single radiant sensor light inside the core. It hovers over Mistlake Plains at dawn: misty lakes, tall reeds, ancient tech ruins, shafts of gold light through fog. Overwhelming holy scale, soft yet ominous.
```
TH: ฉากบอสโลก Seraph Core โบราณ ปีกหกปีก วงแหวนรัศมีสามชั้น เหนือทะเลสาบหมอก

#### `mvp_wb_kitsura.webp`
```
Boss splash art: ANCIENT KITSURA EX, a world boss. A towering feminine fox-type android boss with long flowing gold-orange hair plates, tall gilded fox ears, a blazing golden V-shaped visor, ornate gold and ivory armor engraved with fire runes and old scars, NINE enormous metallic fox tails fanned out behind her, each tipped with white-gold flame. A giant ring of golden fire behind her like a sun. Setting: the depths of Hel's Hollow, purple crystal cave and circuit-lined stone, now lit gold by her fire. Majestic and terrifying, graceful pose.
```
TH: ฉากบอสโลก Kitsura EX โบราณ เก้าหางไฟทอง วงไฟใหญ่ด้านหลัง ในโพรงเฮล

#### `mvp_wb_garmr.webp`
```
Boss splash art: ANCIENT GARMR, a world boss. The colossal mechanical hound of the root gate in its ancient form: blackened iron plates edged with tarnished gold, a chest of molten-gold and rust-red corroded plating with glowing veins, several snapped chains trailing from a massive gilded spiked collar, a blazing gold-crimson V-shaped visor slit, ember breath. It stands on top of the broken root gate, huge bronze Yggdrasil roots cracking around it, gold-ember light from below. Setting: the Gnawed Roots cavern, tooth-marked roots, rust dust and sparks. Primal, unstoppable.
```
TH: ฉากบอสโลก Garmr โบราณ ยืนบนประตูรากที่พัง โซ่ขาดหลายเส้น แสงทอง-ถ่านไฟ

### 3.12 P2+ (recommended): Hel NPC
Hel already exists as an NPC in Hel's Hollow (`js/maps.js`, look `hel`) but has no art. Story (`docs/STORY.md` §3): **half of her mask is lit and half is dark**, she speaks softly, and she is "a grieving nurse, not a villain".

#### `npc_hel.webp`
Spec: 1024×1536 · transparent · full body · preamble **[A]**
```
Character: Hel, guardian of the spark archive, a feminine slim android queen of the underground. Very long white hair plates falling to the floor, a faceplate split down the middle: the left half porcelain-white with a soft teal visor glow, the right half dark graphite with the visor unlit. A layered midnight-navy gown and long hooded mantle with pale teal trim, a delicate crown of thin silver roots, small glowing spark-capsules hanging from her sleeves like jewels. Holding a slender lantern-staff with a single soft teal spark. Gentle, sorrowful, dignified; soft teal rim light.
```
TH: ภาพประกอบบทสนทนาของเฮล หน้ากากสว่างครึ่งมืดครึ่ง ชุดน้ำเงินเข้ม-เขียวน้ำทะเล มงกุฎราก

#### `npcsprite_hel.webp`
Spec: 1024² → ≤320 px · transparent · chibi · preamble **[J]** but with **1 column × 1 row = 1 cell, Square 1:1 image (1024x1024)**
```
1) Hel: a calm feminine android queen, very long white hair plates, faceplate half lit (teal visor) and half dark, midnight-navy gown with a hood and pale teal trim, thin silver root crown, holding a lantern-staff with one teal spark.
```
TH: สไปรต์ชิบิของเฮลในฉาก

---

## 4. P3: Skill icons (72): every one is a tinted stand-in today

Source: `js/art.js`. There are three alias blocks: the second-class block (60, `SRC`/`HUE` map), the 6th-skill block (6), and the "second-set passive" block (6).
Spec for every row: **generate 1024×1024 → final 128×128 · full-bleed painted tile (opaque) · one bold central symbol** · preamble **[C]**, then `Icon: <prompt>`.
Batching tip: you can also generate 8 per image in the old sheet style (`sheet_skills_*.png`, 4×2, 1536×1024, using `SKILL_STYLE` from `tools/asset_spec.py`). Each new sheet then needs an entry in `SHEETS` before slicing. Generating one icon per image gives the most accurate results.

Class color = the `glow` of the class. Keep each class's five icons in one color family so the hotbar reads by class at a glance.

| # | File | Skill · class · type | Prompt (after `Icon:`) | TH |
|---|---|---|---|---|
| 1 | `skill_aegis_wall.webp` | Aegis Wall · Valkyrie · passive | a wall of overlapping golden hexagonal shield panels glowing with holy light, one large round aegis in front; warm gold `#ffd27a` | กำแพงโล่ทองหกเหลี่ยม |
| 2 | `skill_spear_of_valhalla.webp` | Spear of Valhalla · Valkyrie · line attack | a radiant white-gold spear of light thrusting diagonally forward, shattering dark shards along its path; warm gold | หอกแสงพุ่งทะลุแนว |
| 3 | `skill_einherjar_guard.webp` | Einherjar Guard · Valkyrie · taunt buff | a raised round shield with three ghostly golden warrior-spirit shields stacked behind it, taunting pulse rings; gold | โล่พร้อมโล่วิญญาณซ้อน |
| 4 | `skill_judgment_quake.webp` | Judgment Quake · Valkyrie · AoE stun | a golden shield slammed into cracked ground, shockwave rings and flying rock chunks, light in the cracks; gold | โล่กระแทกพื้นแผ่นดินไหว |
| 5 | `skill_valhallas_call.webp` | Valhalla's Call · Valkyrie · self heal | a golden war horn with small wings blowing soft rays of light, green-gold healing motes rising; gold | เขาสัตว์ปีกทองเป่าแสงฟื้นฟู |
| 6 | `skill_galdr_focus.webp` | Galdr Focus · Galdr · passive | concentric rings of small blue runes orbiting a glowing tuning-fork crystal, sound waves rippling; ice blue `#9ad8ff` | วงรูนรอบคริสตัลส้อมเสียง |
| 7 | `skill_meteor_rune.webp` | Meteor Rune · Galdr · fire AoE | a blazing meteor carved with a glowing rune streaking diagonally down with a long fire trail; orange core, ice-blue rim | อุกกาบาตรูนลุกไฟ |
| 8 | `skill_frost_nova.webp` | Frost Nova · Galdr · water AoE | a ring of ice shards exploding outward from the center, frost mist and snow sparkles; ice blue | วงน้ำแข็งระเบิดรอบตัว |
| 9 | `skill_chain_lightning.webp` | Chain Lightning · Galdr · 3 hits | a jagged lightning bolt jumping in a zigzag between three glowing nodes; yellow-white with blue glow | สายฟ้ากระโดดสามจุด |
| 10 | `skill_rune_barrier.webp` | Rune Barrier · Galdr · buff | a diamond-shaped barrier of interlocking blue rune hexagons, shimmering; ice blue | ม่านรูนหกเหลี่ยม |
| 11 | `skill_skadis_mark.webp` | Skadi's Mark · Skadi · passive | a snowflake-shaped crosshair mark glowing over dark ice, small mountain peaks below; ice cyan `#b8f0ff` | เป้าเล็งรูปเกล็ดหิมะ |
| 12 | `skill_arrow_storm.webp` | Arrow Storm · Skadi · AoE | dozens of glowing arrows raining down from a stormy sky into a target circle on the ground; pale gold and ice cyan | ห่าธนูตกใส่วงเป้า |
| 13 | `skill_frost_arrow.webp` | Frost Arrow · Skadi · slow | an ice-crystal arrow trailing frost mist and snowflakes; ice cyan | ลูกธนูน้ำแข็ง |
| 14 | `skill_focused_volley.webp` | Focused Volley · Skadi · 3 sure hits | three arrows flying in tight parallel formation with speed streaks into a bullseye; pale gold | ธนูสามดอกเข้าเป้า |
| 15 | `skill_winter_hunt.webp` | Winter Hunt · Skadi · buff | a frost bow in front of a pair of crossed tech skis under a green aurora, blizzard swirl; ice cyan | ธนูน้ำแข็ง สกีไขว้ แสงเหนือ |
| 16 | `skill_wyrd_thread.webp` | Wyrd Thread · Norn · passive | three glowing threads (gold, silver, lavender) braiding into one around a small spindle; pale gold `#fff0a8` | ด้ายสามสีถักเป็นหนึ่ง |
| 17 | `skill_great_restoration.webp` | Great Restoration · Norn · big heal | a large blooming flower of green-gold light with a plus-shaped glowing core, motes rising; pale gold and green | ดอกไม้แสงฟื้นฟูใหญ่ |
| 18 | `skill_fate_weave.webp` | Fate Weave · Norn · stat buff | a wheel-shaped web of golden threads woven like a loom, lavender sparkles; pale gold and lavender | วงล้อด้ายทอชะตา |
| 19 | `skill_ragnarok_light.webp` | Ragnarok Light · Norn · holy AoE | a pillar of white-gold light crashing down from a dark sky, a sunburst ring blooming on the ground; white-gold | เสาแสงวันสิ้นโลก |
| 20 | `skill_skuld_judgment.webp` | Skuld's Judgment · Norn · holy single | golden scales of judgment radiating light, one pan tipped, a sharp ray of light striking down; white-gold | ตาชั่งพิพากษา |
| 21 | `skill_phantom_edge.webp` | Phantom Edge · Phantom · passive | a dagger edge glowing magenta with a translucent afterimage blade echoing behind it; magenta `#e08aff` | คมมีดพร้อมเงาซ้อน |
| 22 | `skill_mirror_strike.webp` | Mirror Strike · Phantom · 2 hits | two crossed daggers, one solid and one translucent mirror-image, forming an X slash; magenta | มีดจริงไขว้มีดเงา |
| 23 | `skill_fang_of_fenrir.webp` | Fang of Fenrir · Phantom · poison | a curved wolf-fang-shaped dagger dripping green venom, magenta glow; magenta and toxic green | มีดเขี้ยวหมาป่าอาบพิษ |
| 24 | `skill_smoke_cyclone.webp` | Smoke Cyclone · Phantom · AoE | a swirling violet smoke tornado with dagger glints spinning inside; violet | พายุควันหมุนมีดวาบ |
| 25 | `skill_trickster_haste.webp` | Trickster Haste · Phantom · speed buff | a winged boot made of violet smoke with green and magenta speed streaks; light green and magenta | รองเท้าปีกควันเร็ว |
| 26 | `skill_berserk_soul.webp` | Berserk Soul · Warlord · passive | a snarling wolf-head emblem formed from burning embers, red-orange aura; ember `#ff6a3a` | หัวหมาป่าถ่านไฟ |
| 27 | `skill_fenrir_bite.webp` | Fenrir Bite · Warlord · melee | giant iron wolf jaws snapping shut with sparks and ember fragments; ember orange | ขากรรไกรหมาป่างับ |
| 28 | `skill_ragnarok_cleave.webp` | Ragnarok Cleave · Warlord · AoE | a double-bladed war axe sweeping in a full fiery circular arc; ember orange | ขวานกวาดวงไฟ |
| 29 | `skill_war_howl.webp` | War Howl · Warlord · buff | a howling wolf-head silhouette with orange sound waves bursting outward; ember and tan | หมาป่าหอนคลื่นเสียง |
| 30 | `skill_undying_rage.webp` | Undying Rage · Warlord · lifesteal buff | a cracked mechanical heart-core burning bright red, cracks held together by molten light; crimson | แกนหัวใจร้าวที่ไม่ยอมแตก |
| 31 | `skill_hersir_might.webp` | Hersir Might · Hersir · passive | a plumed spangenhelm war helmet over two crossed longswords, crimson glow; crimson `#ff8060` | หมวกขุนศึกเหนือดาบไขว้ |
| 32 | `skill_charge_strike.webp` | Charge Strike · Hersir · dash stun | a sword point driving forward with a crimson comet trail and an impact burst ahead; crimson-orange | ดาบพุ่งชาร์จหางดาวหาง |
| 33 | `skill_spiral_pierce.webp` | Spiral Pierce · Hersir · line 2 hits | a blade drilling forward inside a spinning spiral vortex of crimson light; silver and crimson | ใบมีดหมุนเกลียวเจาะ |
| 34 | `skill_battle_aura.webp` | Battle Aura · Hersir · buff | a swallow-tailed war banner with a crimson flame aura rising from it; orange-crimson | ธงศึกออร่าเพลิง |
| 35 | `skill_ragnars_fury.webp` | Ragnar's Fury · Hersir · AoE | a ring of crimson sword slashes exploding outward from the center; deep crimson | วงคมดาบระเบิดรอบตัว |
| 36 | `skill_seidr_lore.webp` | Seidr Lore · Seidr · passive | an open dark rune tablet-book with violet sigils and green wisps curling off its pages; violet `#c07aff` | ตำราเซดร์มืด |
| 37 | `skill_soul_drain.webp` | Soul Drain · Seidr · shadow | a violet spiral pulling small glowing sparks inward into a dark orb; violet | เกลียวดูดประกายเข้าลูกแก้วมืด |
| 38 | `skill_hex_of_hel.webp` | Hex of Hel · Seidr · poison AoE | a circular hex sigil half lit and half dark, green-violet poison mist and drops around it; toxic green and violet | วงสาปครึ่งสว่างครึ่งมืด หมอกพิษ |
| 39 | `skill_dark_nova.webp` | Dark Nova · Seidr · AoE slow | a black-violet sphere exploding outward with dark rays and violet sparks; deep violet | ระเบิดความมืด |
| 40 | `skill_void_lance.webp` | Void Lance · Seidr · ghost single | a lance of pure void (black core, violet edges) piercing through a glowing rune ring; deep indigo | หอกความว่างเปล่าทะลุวงรูน |
| 41 | `skill_ullr_focus.webp` | Ullr Focus · Ullr · passive | a scope-style crosshair ring with range tick marks over a distant tiny target; lime `#d0ff8a` | วงเล็งพร้อมขีดระยะ |
| 42 | `skill_sharp_shot.webp` | Sharp Shot · Ullr · line | a razor-thin arrow with a long piercing white streak; pale gold and lime | ลูกธนูคมกริบทะลุแนว |
| 43 | `skill_snipe.webp` | Snipe · Ullr · sure-hit nuke | a longbow drawn to full tension, a crosshair at the arrowhead, a single bright beam ahead; gold and lime | ง้างธนูเต็มแรง เป้าเล็ง |
| 44 | `skill_wind_walk.webp` | Wind Walk · Ullr · speed buff | green wind swirls with leaves wrapped around a stylized boot; mint green | ลมเขียวหมุนรอบรองเท้า |
| 45 | `skill_twin_shot.webp` | Twin Shot · Ullr · 2 hits | two arrows flying side by side in parallel with motion streaks; khaki gold | ธนูคู่คู่ขนาน |
| 46 | `skill_iron_faith.webp` | Iron Faith · Gythja · passive | a golden gauntleted fist wrapped in a chain of rune beads, steady glow; amber `#ffc070` | กำปั้นทองพันลูกประคำ |
| 47 | `skill_holy_fist.webp` | Holy Fist · Gythja · holy melee | a golden fist punching forward with a radiant holy burst; pale gold | หมัดศักดิ์สิทธิ์ระเบิดแสง |
| 48 | `skill_triple_palm.webp` | Triple Palm · Gythja · 3 hits | three palm-strike impact rings in a row, each brighter than the last; amber | ฝ่ามือสามจังหวะ |
| 49 | `skill_divine_burst.webp` | Divine Burst · Gythja · big holy single | a fist releasing a huge white-gold explosion of light; white-gold | ระเบิดพลังศรัทธา |
| 50 | `skill_zen_body.webp` | Zen Body · Gythja · regen buff | a lotus of amber light inside a calm brush-stroke circle, floating rune beads; mint and amber | ดอกบัวแสงในวงสงบ |
| 51 | `skill_skald_verse.webp` | Skald Verse · Skald · passive | a glowing music note formed from rune strokes over an old scroll; sky blue `#7ad0ff` | โน้ตดนตรีจากลายรูน |
| 52 | `skill_sonic_strike.webp` | Sonic Strike · Skald · wind | a crescent sonic wave cutting through the air with ripple lines; pale sky blue | คลื่นเสียงตัดอากาศ |
| 53 | `skill_war_drum.webp` | War Drum · Skald · AoE stun | a round Norse war drum being struck, shockwave rings bursting outward; bronze and sky blue | กลองศึกแผ่คลื่น |
| 54 | `skill_song_of_battle.webp` | Song of Battle · Skald · buff | a tech lyre with glowing strings in front of an upright sword, golden notes rising; gold and blue | พิณหน้าดาบ โน้ตทอง |
| 55 | `skill_hymn_of_loki.webp` | Hymn of Loki · Skald · buff | a green-violet serpent coiling around a glowing music note; violet and green | งูโลกิพันโน้ตดนตรี |
| 56 | `skill_jotun_blood.webp` | Jotun Blood · Jotun · passive | a massive stone fist with frost cracks and glowing amber veins; tan `#c0a080` | กำปั้นหินเส้นอำพัน |
| 57 | `skill_titan_smash.webp` | Titan Smash · Jotun · stun | a giant boulder fist smashing straight down, stone debris and a dust ring; tan and orange | กำปั้นยักษ์ทุบลง |
| 58 | `skill_earth_splitter.webp` | Earth Splitter · Jotun · earth line | the ground splitting in a straight glowing fissure toward the viewer, rocks lifting; earth brown and orange | พื้นแยกเป็นแนว |
| 59 | `skill_giants_wrath.webp` | Giant's Wrath · Jotun · buff | a horned frost-giant helm with burning orange runes, steam rising; orange and frost blue | หมวกยักษ์รูนลุกไฟ |
| 60 | `skill_mountain_heart.webp` | Mountain Heart · Jotun · self heal | a mountain peak with a glowing green heart-shaped core inside the rock; sage green and stone | ภูเขามีแกนหัวใจเขียว |
| 61 | `skill_shield_throw.webp` | Shield Throw · Einherjar · 6th skill | a round tech shield spinning through the air with a circular red motion trail; steel and red `#ff6a4a` | โล่หมุนลอยไป |
| 62 | `skill_earth_rune.webp` | Earth Rune · Rune Caster · 6th skill | a brown earth rune carved on a stone pillar erupting from the ground, rock shards flying; earth brown | รูนดินบนเสาหินผุดขึ้น |
| 63 | `skill_charge_arrow.webp` | Charge Arrow · Wildhunter · 6th skill | a glowing arrow with charged energy rings around its tip and a knockback shockwave ahead; green `#8cff7a` and gold | ลูกธนูอัดพลังผลักถอย |
| 64 | `skill_divine_shield.webp` | Divine Shield · Völva · 6th skill | a bright kite shield of pale blue-white light with a golden star-cross; pale blue and gold | โล่แสงศักดิ์สิทธิ์ |
| 65 | `skill_throwing_knife.webp` | Throwing Knife · Trickster · 6th skill | three throwing knives fanned out in flight with motion streaks, one tip dripping green poison; silver and violet | มีดบินสามเล่ม |
| 66 | `skill_axe_throw.webp` | Axe Throw · Berserker · 6th skill | a hand axe spinning through the air inside an orange circular blur; orange `#ff8a2a` | ขวานหมุนลอยไป |
| 67 | `skill_valhalla_oath.webp` | Valhalla's Oath · Einherjar · passive | a golden othala rune engraved on a raised sword hilt, oath light glowing; gold and red | รูนโอทาลาบนด้ามดาบ |
| 68 | `skill_runic_ward.webp` | Runic Ward · Rune Caster · passive | a protective circle built around a glowing blue algiz rune, ward light shimmering; blue `#7ab0ff` | วงป้องกันรูนอัลกิซ |
| 69 | `skill_hunters_rhythm.webp` | Hunter's Rhythm · Wildhunter · passive | a green sowilo rune with pulse lines like a heartbeat and a small arrow riding the pulse; green | รูนโซวิโลกับเส้นจังหวะ |
| 70 | `skill_freyjas_grace.webp` | Freyja's Grace · Völva · passive | a golden falcon-feather cloak spread like wings with soft light and a small berkano rune; soft gold `#ffe8a0` | ผ้าคลุมขนเหยี่ยวของเฟรยา |
| 71 | `skill_lokis_gambit.webp` | Loki's Gambit · Trickster · passive | a two-faced coin flipping in the air, one side a serpent and one side a mask, violet sparks; violet `#b07ae0` | เหรียญสองหน้าของโลกิ |
| 72 | `skill_bloodthirst.webp` | Bloodthirst · Berserker · passive | a crimson fang with a single glowing red drop of sap, dark red aura; dark crimson | เขี้ยวแดงกับหยดน้ำเลี้ยง |

---

## 5. P4: Map art for the Chapter-6 maps

Today both banners are `map_helcave` hue-rotated (`content_ch6.js`). The map atmosphere tints are in `ATMOS` (`archive`: gold dust `rgba(150,120,40,.10)`, `roots`: red-brown dust `rgba(130,45,20,.14)`). Match the banners to them.
Spec: **1536×1024 (3:2) · full-bleed · no characters · lower-middle third calmer** · preamble **[H]**.

#### `map_archive.webp`
```
Location: Archive Depths, the lower spark archive beneath Hel's Hollow. An immense underground library-vault: towering stone-and-brass shelves receding into darkness, each shelf holding rows of small glass capsules with tiny warm spark-lights inside, like stored stars. Narrow brass catwalks and hanging chains, glowing teal seal-runes on the shelf ends, a few toppled shelves. Creeping up from below, orange-brown rust spreads over the lower shelves in root-like patterns, some capsules dimmed and crusted. Soft teal archive light above, warm amber rust glow below, golden dust motes in the air. Quiet, sacred, melancholic.
```
TH: คลังประกายชั้นล่าง ชั้นวางสูงลิ่ว แคปซูลแก้วมีประกายดวงเล็ก สนิมลามจากด้านล่าง แสงเขียวน้ำทะเลด้านบน แสงอำพันด้านล่าง

#### `map_roots.webp`
```
Location: Gnawed Roots, deep beneath Hel's archive. Colossal mechanical roots of the world tree Yggdrasil, bark made of bronze plates and thick cables, with sap channels glowing green-gold inside. The roots are gnawed: enormous tooth marks and splintered gouges, rust-red corrosion veins spreading from the wounds. In the distance a huge round gate carved into the roots, its chains broken. Far below, in the darkness, only the faint suggestion of a vast coiled shape (barely visible, a hint not a monster). Deep crimson and ember gloom, red-brown dust in the air, thin green-gold sap light as the only hope.
```
TH: รากที่ถูกแทะ รากจักรกลยักษ์มีรอยฟัน สนิมแดงลาม ประตูรากโซ่ขาดไกล ๆ เงามหึมาขดอยู่ลึกข้างล่าง (แค่ใบ้)

### 5.1 P4+ (optional; needs a small code hook first, see VISUAL_PLAN §5)
Ground tiles are picked by map **kind** today (`TEX` in `js/maps.js`: cave → `ground_cave`), so both Ch-6 maps share Hel's Hollow's floor. Props come from `PROP_ART`.

| File | Spec | Prompt (no preamble; self-contained) | TH |
|---|---|---|---|
| `ground_archive.webp` | 512×512 · **seamless tileable** · opaque · top-down | `Seamless tileable top-down game ground texture, painterly hand-painted style: worn dark stone floor tiles of an underground archive with thin brass inlay lines and faint teal rune grooves, scattered dust, a few orange rust stains. Even lighting, no perspective, no objects, no shadows, edges must tile perfectly. Square 512x512.` | พื้นหินคลังมีเส้นทองเหลือง ต่อกันไร้รอย |
| `ground_roots.webp` | 512×512 · **seamless tileable** · opaque · top-down | `Seamless tileable top-down game ground texture, painterly hand-painted style: packed dark red-brown earth crossed by thin bronze root fibers and cable strands, tooth-mark gouges, rust flakes, tiny green-gold sap glints. Even lighting, no perspective, no objects, no shadows, edges must tile perfectly. Square 512x512.` | พื้นดินแดงเข้มมีใยรากบรอนซ์ |
| `prop_shelf.webp` | 1024² → ≤320 px · transparent · 3/4 top-down | `Environment prop for a cute classic 2000s Korean MMORPG style isometric game, sci-fi Norse android world: a tall stone-and-brass archive shelf holding rows of small glass capsules with warm spark lights, the lower shelf crusted with orange rust. 3/4 top-down view (camera about 45 degrees), centered, FULLY TRANSPARENT background, painterly cel-shaded, crisp outline, lighting from top-left, no text, no ground shadow. Square 1024x1024.` | ชั้นวางแคปซูลประกาย |
| `prop_root.webp` | 1024² → ≤420 px · transparent · 3/4 top-down | `Environment prop for a cute classic 2000s Korean MMORPG style isometric game, sci-fi Norse android world: a large arching mechanical tree root of bronze plates and cables bursting out of the ground, deep tooth marks and rust-red corrosion, a thin green-gold sap glow in a cable channel. 3/4 top-down view, centered, FULLY TRANSPARENT background, painterly cel-shaded, crisp outline, lighting from top-left, no text, no ground shadow. Square 1024x1024.` | รากจักรกลโผล่จากพื้น มีรอยกัด |
| `prop_rustvent.webp` | 1024² → ≤320 px · transparent · 3/4 top-down | `Environment prop for a cute classic 2000s Korean MMORPG style isometric game, sci-fi Norse android world: a cracked floor vent oozing slow orange rust-sap, glowing warm from inside, small root fibers around it. 3/4 top-down view, centered, FULLY TRANSPARENT background, painterly cel-shaded, crisp outline, no text, no ground shadow. Square 1024x1024.` | ช่องพื้นแตกมีน้ำเลี้ยงสนิมไหล |

---

## 6. P5: Headgear and weapon visuals

### 6.1 Missing item icons (19): the game draws these with code today
Spec for every row: **generate 1024×1024 → final 128×128 · transparent · single object, 3/4 view, top-left light** · preamble **[I]**, then `Item: <prompt>`.
The color in each prompt comes from the item's `icon.c` in `js/data.js` / `js/content_ch6.js`.

| # | File | Item (slot / type) | Prompt (after `Item:`) | TH |
|---|---|---|---|---|
| 1 | `item_cleaver.webp` | Cleaver Axe (axe) | a broad heavy cleaver-style axe with a squared steel blade, worn bronze-brown grip wrap, a small cyan power cell in the haft | ขวานอีโต้ใบเหลี่ยม |
| 2 | `item_arc_wand.webp` | Arc Wand (rod) | a short slim wand of steel-blue metal with a small crackling electric arc between two prongs at the tip | คทาสั้นมีประกายไฟฟ้าที่ปลาย |
| 3 | `item_flail.webp` | Flail (mace) | a steel flail: short handle, chain, a spiked silver ball with thin glowing cyan seams | กระบองลูกตุ้มโซ่ |
| 4 | `item_padded_plate.webp` | Padded Plating (armor) | a beige quilted padded chest plating with light metal plates sewn on, simple and sturdy | เกราะบุนวมสีเบจ |
| 5 | `item_thermal_cloak.webp` | Thermal Cloak (garment) | a slate-blue hooded cloak with a quilted thermal lining and small orange heating coils glowing at the hem | ผ้าคลุมกันหนาวมีขดลวดอุ่น |
| 6 | `item_data_band.webp` | Data Band (accessory) | a sleek wrist band with a thin cyan holographic data display strip | สายรัดข้อมือแสดงข้อมูล |
| 7 | `item_rusty_sap.webp` | Rust Sap (drop) | a small glass vial of thick murky rust-orange sap, warm glow inside, a drip running down the side | ขวดน้ำเลี้ยงสนิม |
| 8 | `item_archive_seal.webp` | Archive Seal (drop) | a round brass shelf-seal disc stamped with a glowing teal rune circle, a short broken chain | ตราประทับชั้นวางสีทองเหลือง |
| 9 | `item_rust_fuse.webp` | Rust Fuse (drop) | a corroded orange-brown cylindrical mine fuse with a frayed wick throwing tiny sparks | ชนวนสนิมมีประกายไฟ |
| 10 | `item_rusted_spark.webp` | Rusted Spark (drop) | a small glowing spark-crystal crusted with orange rust flakes, warm light leaking through the cracks | ประกายเคลือบสนิม |
| 11 | `item_corroded_core.webp` | Corroded Core (drop) | a round mechanical core module eaten through with rust holes, faint orange light inside | แกนร่างผุเป็นรู |
| 12 | `item_root_fiber.webp` | Root Fiber (drop) | a coiled bundle of bronze-brown root fibers and thin cables, one end gnawed clean through | ใยรากขาด |
| 13 | `item_gnawed_bark.webp` | Gnawed Bark (drop) | a curved slab of grey-violet metal root bark covered in many small tooth marks | เปลือกรากรอยฟัน |
| 14 | `item_rust_plate.webp` | Rusted Plate (drop) | a thick armor plate with rust eaten into branching root-like patterns, rivets popping | แผ่นเกราะสนิมลายราก |
| 15 | `item_gnawer_tusk.webp` | Gnawer Tusk (drop) | a large curved ivory-tan metal tusk with flat worn grinding ridges | เขี้ยวบดสึก |
| 16 | `item_root_cloak.webp` | Rootweave Cloak (garment, Lv 40) | a brown cloak woven from root fibers and bronze threads, leaf-shaped clasp with a tiny green sap gem | ผ้าคลุมทอใยราก |
| 17 | `item_rootbark_plate.webp` | Rootbark Plating (armor, Lv 42) | a chest armor made of layered bronze root-bark plates with thin green-gold sap lines | เกราะเปลือกราก |
| 18 | `item_yggdrasil_branch.webp` | Yggdrasil Branch (rod, Lv 45) | a living staff: a branch of the mechanical world tree with bronze bark plates, green-gold sap glowing through cable veins, two tiny metal leaves at the tip | กิ่งต้นไม้โลก (คทา) |
| 19 | `item_garmr_collar.webp` | Garmr Collar (MVP accessory) | a heavy black-iron spiked hound collar with one snapped chain link and a small crimson gem | ปลอกคอการ์มร์ (ของ MVP) |

### 6.2 Worn-headgear overlays (4): generate only after the code hook exists
Today a worn hat only shows on the **code-drawn** fallback figure (`hatMap` in `Sprites.drawPlayer`: hat, iron_helm, ribbon, seraph_wings). The image-based paths (`anim_*` for Novice, `hero_*` for first classes) show **no headgear**. Overlays need an anchor (head position per frame); see VISUAL_PLAN §5 before ordering these.
Spec: **1024×1024 → 240×240 cell · transparent · drawn on an invisible head of the NMS-1 standard (head top at y≈70, centre x=120 of the 240 cell), facing LEFT 3/4**.

| # | File | Item | Prompt (self-contained) | TH |
|---|---|---|---|---|
| 1 | `gear_head_hat.webp` | Sensor Cap | `Game headgear overlay sprite, cute 2000s Korean MMORPG chibi style, cel-shaded, crisp dark outline: ONLY a brown tech baseball cap with a small round cyan sensor lens on the side, drawn as if worn on an invisible chibi head in 3/4 view facing LEFT, no head, no face, no hair. FULLY TRANSPARENT background. Square 1024x1024, cap centered in the upper half.` | หมวกแก๊ปเซนเซอร์ (สวมบนหัว) |
| 2 | `gear_head_iron_helm.webp` | Iron Helm | `Game headgear overlay sprite, cute 2000s Korean MMORPG chibi style, cel-shaded, crisp dark outline: ONLY a rounded steel-blue iron helmet with a short brim and a thin glowing seam, worn on an invisible chibi head in 3/4 view facing LEFT, no head, no face. FULLY TRANSPARENT background. Square 1024x1024, helmet centered in the upper half.` | หมวกเหล็ก |
| 3 | `gear_head_ribbon.webp` | Signal Ribbon | `Game headgear overlay sprite, cute 2000s Korean MMORPG chibi style, cel-shaded, crisp dark outline: ONLY a big pink-magenta ribbon bow with a tiny antenna light in the knot, placed on the top-left of an invisible chibi head in 3/4 view facing LEFT, no head, no hair. FULLY TRANSPARENT background. Square 1024x1024.` | โบว์สัญญาณ |
| 4 | `gear_head_seraph_wings.webp` | Seraph Wings | `Game headgear overlay sprite, cute 2000s Korean MMORPG chibi style, cel-shaded, crisp dark outline: ONLY a pair of small white mechanical angel wings with gold feather-blade edges, attached at the sides of an invisible chibi head in 3/4 view facing LEFT, soft glow, no head, no hair. FULLY TRANSPARENT background. Square 1024x1024.` | ปีกเซราฟ (ของ MVP) |

### 6.3 Weapon visuals: recommendation (no images to order yet)
Per-weapon sprites on frame-by-frame animation would need a hand anchor per frame for every class, every action and every direction, which costs too much. Use **code-side weapon feel** instead: refine glow, trails per weapon type and element tint (VISUAL_PLAN §4). The item icons above cover the inventory. Re-evaluate only if the game moves to the `rig_` paper-doll system for all classes (`rig_novice_f_weapon` already shows the pattern).

---

## 7. Already covered elsewhere (do not duplicate)
- **Player animation sheets** (`anim_<class>_<f|m>_<action>`, all 12 + 12 classes): `art/ANIM_PROMPTS.md`, `art/NOTEPAD.md`, ROADMAP Phase 2.
- **Skill FX sprites** (`fx_<name>.webp`, 240-px frames on black, additive blend; supported by `addFx`): `art/NOTEPAD.md` (slash, bash, firebolt, coldbolt, lightning, holy, heal/buff, whirl, howl, …).
- **Base monster animations still missing** (Gel, Ember, Hopper, Mine, Moss, Hel Guard): `art/NOTEPAD.md`.

## 8. QA before install / ตรวจก่อนติดตั้ง
- [ ] No eyes, no mouth, one visor strip, on every android and every portrait.
- [ ] Transparent where the spec says transparent (no checkerboard baked into the pixels, no white halo).
- [ ] Portraits: full body, feet visible, nothing above the head in the centre column.
- [ ] Splash: boss head/chest inside the 16:7 band (preview by cropping to 1536×672 at 30% from top).
- [ ] Icons: still readable when shrunk to 40 px; class color family respected.
- [ ] Male/female pair of a class read as the same class side by side.
- [ ] File name exactly as listed (lowercase, underscores), then run the install step so `manifest.json` is updated.

## 9. Checklist / เช็กลิสต์

Change ⬜ to ✅ when the file is installed (in `assets/` **and** in `manifest.json`). `P1+`, `P2+`, `P4+`, `P5+` rows are optional / recommended.

Rows per priority: P1 = 36, P1+ = 6, P2 = 32, P2+ = 2, P3 = 72, P4 = 2, P4+ = 5, P5 = 19, P5+ = 4 (total 178 rows; anim and hero-sheet rows each produce several files).

| ✓ | # | Pri | File | Final spec |
|---|---|---|---|---|
| ✅ | 1 | P1 | `job_valkyrie_f.webp` | 1024×1536 · transparent |
| ✅ | 2 | P1 | `job_valkyrie_m.webp` | 1024×1536 · transparent |
| ✅ | 3 | P1 | `emblem_valkyrie.webp` | 128² · transparent |
| ✅ | 4 | P1 | `job_hersir_f.webp` | 1024×1536 · transparent |
| ✅ | 5 | P1 | `job_hersir_m.webp` | 1024×1536 · transparent |
| ✅ | 6 | P1 | `emblem_hersir.webp` | 128² · transparent |
| ✅ | 7 | P1 | `job_galdr_f.webp` | 1024×1536 · transparent |
| ✅ | 8 | P1 | `job_galdr_m.webp` | 1024×1536 · transparent |
| ✅ | 9 | P1 | `emblem_galdr.webp` | 128² · transparent |
| ⬜ | 10 | P1 | `job_seidr_f.webp` | 1024×1536 · transparent |
| ⬜ | 11 | P1 | `job_seidr_m.webp` | 1024×1536 · transparent |
| ⬜ | 12 | P1 | `emblem_seidr.webp` | 128² · transparent |
| ⬜ | 13 | P1 | `job_skadi_f.webp` | 1024×1536 · transparent |
| ⬜ | 14 | P1 | `job_skadi_m.webp` | 1024×1536 · transparent |
| ⬜ | 15 | P1 | `emblem_skadi.webp` | 128² · transparent |
| ⬜ | 16 | P1 | `job_ullr_f.webp` | 1024×1536 · transparent |
| ⬜ | 17 | P1 | `job_ullr_m.webp` | 1024×1536 · transparent |
| ⬜ | 18 | P1 | `emblem_ullr.webp` | 128² · transparent |
| ✅ | 19 | P1 | `job_norn_f.webp` | 1024×1536 · transparent |
| ✅ | 20 | P1 | `job_norn_m.webp` | 1024×1536 · transparent |
| ✅ | 21 | P1 | `emblem_norn.webp` | 128² · transparent |
| ✅ | 22 | P1 | `job_gythja_f.webp` | 1024×1536 · transparent |
| ✅ | 23 | P1 | `job_gythja_m.webp` | 1024×1536 · transparent |
| ✅ | 24 | P1 | `emblem_gythja.webp` | 128² · transparent |
| ✅ | 25 | P1 | `job_phantom_f.webp` | 1024×1536 · transparent |
| ✅ | 26 | P1 | `job_phantom_m.webp` | 1024×1536 · transparent |
| ✅ | 27 | P1 | `emblem_phantom.webp` | 128² · transparent |
| ✅ | 28 | P1 | `job_skald_f.webp` | 1024×1536 · transparent |
| ✅ | 29 | P1 | `job_skald_m.webp` | 1024×1536 · transparent |
| ✅ | 30 | P1 | `emblem_skald.webp` | 128² · transparent |
| ✅ | 31 | P1 | `job_warlord_f.webp` | 1024×1536 · transparent |
| ✅ | 32 | P1 | `job_warlord_m.webp` | 1024×1536 · transparent |
| ✅ | 33 | P1 | `emblem_warlord.webp` | 128² · transparent |
| ✅ | 34 | P1 | `job_jotun_f.webp` | 1024×1536 · transparent |
| ✅ | 35 | P1 | `job_jotun_m.webp` | 1024×1536 · transparent |
| ✅ | 36 | P1 | `emblem_jotun.webp` | 128² · transparent |
| ⬜ | 37 | P1+ | `sheet_heroes_5.png` → 4× `hero_*` | 1024² 2×2 sheet · transparent |
| ⬜ | 38 | P1+ | `sheet_heroes_6.png` → 4× `hero_*` | 1024² 2×2 sheet · transparent |
| ⬜ | 39 | P1+ | `sheet_heroes_7.png` → 4× `hero_*` | 1024² 2×2 sheet · transparent |
| ⬜ | 40 | P1+ | `sheet_heroes_8.png` → 4× `hero_*` | 1024² 2×2 sheet · transparent |
| ⬜ | 41 | P1+ | `sheet_heroes_9.png` → 4× `hero_*` | 1024² 2×2 sheet · transparent |
| ⬜ | 42 | P1+ | `sheet_heroes_10.png` → 4× `hero_*` | 1024² 2×2 sheet · transparent |
| ✅ | 43 | P2 | `mob_rust_sap.webp` | 160² · tile |
| ✅ | 44 | P2 | `mobsprite_rust_sap.webp` | ≤320 · transparent |
| ✅ | 45 | P2 | `mob_archive_warden.webp` | 160² · tile |
| ✅ | 46 | P2 | `mobsprite_archive_warden.webp` | ≤320 · transparent |
| ✅ | 47 | P2 | `anim_mob_archive_warden_walk.webp` + `anim_mob_archive_warden_attack.webp` (1 sheet) | 1536×1024 sheet → 2× 960×240 |
| ✅ | 48 | P2 | `mob_rust_mine.webp` | 160² · tile |
| ✅ | 49 | P2 | `mobsprite_rust_mine.webp` | ≤320 · transparent |
| ⬜ | 50 | P2 | `mob_archive_maiden.webp` | 160² · tile |
| ⬜ | 51 | P2 | `mobsprite_archive_maiden.webp` | ≤320 · transparent |
| ⬜ | 52 | P2 | `anim_mob_archive_maiden_walk.webp` + `anim_mob_archive_maiden_attack.webp` (1 sheet) | 1536×1024 sheet → 2× 960×240 |
| ⬜ | 53 | P2 | `mob_rust_draugr.webp` | 160² · tile |
| ⬜ | 54 | P2 | `mobsprite_rust_draugr.webp` | ≤320 · transparent |
| ⬜ | 55 | P2 | `anim_mob_rust_draugr_walk.webp` + `anim_mob_rust_draugr_attack.webp` (1 sheet) | 1536×1024 sheet → 2× 960×240 |
| ⬜ | 56 | P2 | `mob_root_crawler.webp` | 160² · tile |
| ⬜ | 57 | P2 | `mobsprite_root_crawler.webp` | ≤320 · transparent |
| ⬜ | 58 | P2 | `anim_mob_root_crawler_walk.webp` + `anim_mob_root_crawler_attack.webp` (1 sheet) | 1536×1024 sheet → 2× 960×240 |
| ⬜ | 59 | P2 | `mob_gnawed_stump.webp` | 160² · tile |
| ⬜ | 60 | P2 | `mobsprite_gnawed_stump.webp` | ≤320 · transparent |
| ⬜ | 61 | P2 | `anim_mob_gnawed_stump_walk.webp` + `anim_mob_gnawed_stump_attack.webp` (1 sheet) | 1536×1024 sheet → 2× 960×240 |
| ⬜ | 62 | P2 | `mob_gnawed_brute.webp` | 160² · tile |
| ⬜ | 63 | P2 | `mobsprite_gnawed_brute.webp` | ≤320 · transparent |
| ⬜ | 64 | P2 | `anim_mob_gnawed_brute_walk.webp` + `anim_mob_gnawed_brute_attack.webp` (1 sheet) | 1536×1024 sheet → 2× 960×240 |
| ⬜ | 65 | P2 | `mob_root_gnawer.webp` | 160² · tile |
| ⬜ | 66 | P2 | `mobsprite_root_gnawer.webp` | ≤320 · transparent |
| ⬜ | 67 | P2 | `anim_mob_root_gnawer_walk.webp` + `anim_mob_root_gnawer_attack.webp` (1 sheet) | 1536×1024 sheet → 2× 960×240 |
| ⬜ | 68 | P2 | `mvp_garmr.webp` | 1536×1024 · full-bleed |
| ⬜ | 69 | P2 | `mob_garmr.webp` | 160² · tile |
| ⬜ | 70 | P2 | `mobsprite_garmr.webp` | ≤320 · transparent |
| ⬜ | 71 | P2 | `anim_mob_garmr_walk.webp` + `anim_mob_garmr_attack.webp` (1 sheet) | 1536×1024 sheet → 2× 960×240 |
| ⬜ | 72 | P2 | `mvp_wb_seraph_pudding.webp` | 1536×1024 · full-bleed |
| ⬜ | 73 | P2 | `mvp_wb_kitsura.webp` | 1536×1024 · full-bleed |
| ⬜ | 74 | P2 | `mvp_wb_garmr.webp` | 1536×1024 · full-bleed |
| ⬜ | 75 | P2+ | `npc_hel.webp` | 1024×1536 · transparent |
| ⬜ | 76 | P2+ | `npcsprite_hel.webp` | ≤320 · transparent |
| ⬜ | 77 | P3 | `skill_aegis_wall.webp` | 128² · tile |
| ⬜ | 78 | P3 | `skill_spear_of_valhalla.webp` | 128² · tile |
| ⬜ | 79 | P3 | `skill_einherjar_guard.webp` | 128² · tile |
| ⬜ | 80 | P3 | `skill_judgment_quake.webp` | 128² · tile |
| ⬜ | 81 | P3 | `skill_valhallas_call.webp` | 128² · tile |
| ⬜ | 82 | P3 | `skill_galdr_focus.webp` | 128² · tile |
| ⬜ | 83 | P3 | `skill_meteor_rune.webp` | 128² · tile |
| ⬜ | 84 | P3 | `skill_frost_nova.webp` | 128² · tile |
| ⬜ | 85 | P3 | `skill_chain_lightning.webp` | 128² · tile |
| ⬜ | 86 | P3 | `skill_rune_barrier.webp` | 128² · tile |
| ⬜ | 87 | P3 | `skill_skadis_mark.webp` | 128² · tile |
| ⬜ | 88 | P3 | `skill_arrow_storm.webp` | 128² · tile |
| ⬜ | 89 | P3 | `skill_frost_arrow.webp` | 128² · tile |
| ⬜ | 90 | P3 | `skill_focused_volley.webp` | 128² · tile |
| ⬜ | 91 | P3 | `skill_winter_hunt.webp` | 128² · tile |
| ⬜ | 92 | P3 | `skill_wyrd_thread.webp` | 128² · tile |
| ⬜ | 93 | P3 | `skill_great_restoration.webp` | 128² · tile |
| ⬜ | 94 | P3 | `skill_fate_weave.webp` | 128² · tile |
| ⬜ | 95 | P3 | `skill_ragnarok_light.webp` | 128² · tile |
| ⬜ | 96 | P3 | `skill_skuld_judgment.webp` | 128² · tile |
| ⬜ | 97 | P3 | `skill_phantom_edge.webp` | 128² · tile |
| ⬜ | 98 | P3 | `skill_mirror_strike.webp` | 128² · tile |
| ⬜ | 99 | P3 | `skill_fang_of_fenrir.webp` | 128² · tile |
| ⬜ | 100 | P3 | `skill_smoke_cyclone.webp` | 128² · tile |
| ⬜ | 101 | P3 | `skill_trickster_haste.webp` | 128² · tile |
| ⬜ | 102 | P3 | `skill_berserk_soul.webp` | 128² · tile |
| ⬜ | 103 | P3 | `skill_fenrir_bite.webp` | 128² · tile |
| ⬜ | 104 | P3 | `skill_ragnarok_cleave.webp` | 128² · tile |
| ⬜ | 105 | P3 | `skill_war_howl.webp` | 128² · tile |
| ⬜ | 106 | P3 | `skill_undying_rage.webp` | 128² · tile |
| ⬜ | 107 | P3 | `skill_hersir_might.webp` | 128² · tile |
| ⬜ | 108 | P3 | `skill_charge_strike.webp` | 128² · tile |
| ⬜ | 109 | P3 | `skill_spiral_pierce.webp` | 128² · tile |
| ⬜ | 110 | P3 | `skill_battle_aura.webp` | 128² · tile |
| ⬜ | 111 | P3 | `skill_ragnars_fury.webp` | 128² · tile |
| ⬜ | 112 | P3 | `skill_seidr_lore.webp` | 128² · tile |
| ⬜ | 113 | P3 | `skill_soul_drain.webp` | 128² · tile |
| ⬜ | 114 | P3 | `skill_hex_of_hel.webp` | 128² · tile |
| ⬜ | 115 | P3 | `skill_dark_nova.webp` | 128² · tile |
| ⬜ | 116 | P3 | `skill_void_lance.webp` | 128² · tile |
| ⬜ | 117 | P3 | `skill_ullr_focus.webp` | 128² · tile |
| ⬜ | 118 | P3 | `skill_sharp_shot.webp` | 128² · tile |
| ⬜ | 119 | P3 | `skill_snipe.webp` | 128² · tile |
| ⬜ | 120 | P3 | `skill_wind_walk.webp` | 128² · tile |
| ⬜ | 121 | P3 | `skill_twin_shot.webp` | 128² · tile |
| ⬜ | 122 | P3 | `skill_iron_faith.webp` | 128² · tile |
| ⬜ | 123 | P3 | `skill_holy_fist.webp` | 128² · tile |
| ⬜ | 124 | P3 | `skill_triple_palm.webp` | 128² · tile |
| ⬜ | 125 | P3 | `skill_divine_burst.webp` | 128² · tile |
| ⬜ | 126 | P3 | `skill_zen_body.webp` | 128² · tile |
| ⬜ | 127 | P3 | `skill_skald_verse.webp` | 128² · tile |
| ⬜ | 128 | P3 | `skill_sonic_strike.webp` | 128² · tile |
| ⬜ | 129 | P3 | `skill_war_drum.webp` | 128² · tile |
| ⬜ | 130 | P3 | `skill_song_of_battle.webp` | 128² · tile |
| ⬜ | 131 | P3 | `skill_hymn_of_loki.webp` | 128² · tile |
| ⬜ | 132 | P3 | `skill_jotun_blood.webp` | 128² · tile |
| ⬜ | 133 | P3 | `skill_titan_smash.webp` | 128² · tile |
| ⬜ | 134 | P3 | `skill_earth_splitter.webp` | 128² · tile |
| ⬜ | 135 | P3 | `skill_giants_wrath.webp` | 128² · tile |
| ⬜ | 136 | P3 | `skill_mountain_heart.webp` | 128² · tile |
| ⬜ | 137 | P3 | `skill_shield_throw.webp` | 128² · tile |
| ⬜ | 138 | P3 | `skill_earth_rune.webp` | 128² · tile |
| ⬜ | 139 | P3 | `skill_charge_arrow.webp` | 128² · tile |
| ⬜ | 140 | P3 | `skill_divine_shield.webp` | 128² · tile |
| ⬜ | 141 | P3 | `skill_throwing_knife.webp` | 128² · tile |
| ⬜ | 142 | P3 | `skill_axe_throw.webp` | 128² · tile |
| ⬜ | 143 | P3 | `skill_valhalla_oath.webp` | 128² · tile |
| ⬜ | 144 | P3 | `skill_runic_ward.webp` | 128² · tile |
| ⬜ | 145 | P3 | `skill_hunters_rhythm.webp` | 128² · tile |
| ⬜ | 146 | P3 | `skill_freyjas_grace.webp` | 128² · tile |
| ⬜ | 147 | P3 | `skill_lokis_gambit.webp` | 128² · tile |
| ⬜ | 148 | P3 | `skill_bloodthirst.webp` | 128² · tile |
| ⬜ | 149 | P4 | `map_archive.webp` | 1536×1024 · full-bleed |
| ⬜ | 150 | P4 | `map_roots.webp` | 1536×1024 · full-bleed |
| ⬜ | 151 | P4+ | `ground_archive.webp` | 512² · seamless |
| ⬜ | 152 | P4+ | `ground_roots.webp` | 512² · seamless |
| ⬜ | 153 | P4+ | `prop_shelf.webp` | ≤320 · transparent |
| ⬜ | 154 | P4+ | `prop_root.webp` | ≤320 · transparent |
| ⬜ | 155 | P4+ | `prop_rustvent.webp` | ≤320 · transparent |
| ⬜ | 156 | P5 | `item_cleaver.webp` | 128² · transparent |
| ⬜ | 157 | P5 | `item_arc_wand.webp` | 128² · transparent |
| ⬜ | 158 | P5 | `item_flail.webp` | 128² · transparent |
| ⬜ | 159 | P5 | `item_padded_plate.webp` | 128² · transparent |
| ⬜ | 160 | P5 | `item_thermal_cloak.webp` | 128² · transparent |
| ⬜ | 161 | P5 | `item_data_band.webp` | 128² · transparent |
| ⬜ | 162 | P5 | `item_rusty_sap.webp` | 128² · transparent |
| ⬜ | 163 | P5 | `item_archive_seal.webp` | 128² · transparent |
| ⬜ | 164 | P5 | `item_rust_fuse.webp` | 128² · transparent |
| ⬜ | 165 | P5 | `item_rusted_spark.webp` | 128² · transparent |
| ⬜ | 166 | P5 | `item_corroded_core.webp` | 128² · transparent |
| ⬜ | 167 | P5 | `item_root_fiber.webp` | 128² · transparent |
| ⬜ | 168 | P5 | `item_gnawed_bark.webp` | 128² · transparent |
| ⬜ | 169 | P5 | `item_rust_plate.webp` | 128² · transparent |
| ⬜ | 170 | P5 | `item_gnawer_tusk.webp` | 128² · transparent |
| ⬜ | 171 | P5 | `item_root_cloak.webp` | 128² · transparent |
| ⬜ | 172 | P5 | `item_rootbark_plate.webp` | 128² · transparent |
| ⬜ | 173 | P5 | `item_yggdrasil_branch.webp` | 128² · transparent |
| ⬜ | 174 | P5 | `item_garmr_collar.webp` | 128² · transparent |
| ⬜ | 175 | P5+ | `gear_head_hat.webp` | 240² cell · transparent |
| ⬜ | 176 | P5+ | `gear_head_iron_helm.webp` | 240² cell · transparent |
| ⬜ | 177 | P5+ | `gear_head_ribbon.webp` | 240² cell · transparent |
| ⬜ | 178 | P5+ | `gear_head_seraph_wings.webp` | 240² cell · transparent |

