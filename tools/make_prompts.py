import json, html, os, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from asset_spec import SHEETS, MAPS
STYLE = ("Anime gacha game character art, polished cel shading with soft gradient lighting and rim light, crisp clean lineart, highly detailed, production-quality, "
 "sci-fi Norse mythology fusion world called IRON VALHALLA where every character is a humanoid android robot (there are no humans at all). "
 "FACE RULE: the head is a sleek robot head with a smooth glossy metal faceplate and ONE glowing visor strip across where the eyes would be. "
 "NO eyes, NO pupils, NO irises, NO eyelashes, NO nose, NO mouth, NO human skin. "
 "The 'hair' is made of layered synthetic metal plates and cable strands shaped like a hairstyle, with a soft metallic sheen. "
 "Body: white-and-graphite armored robot body with visible mechanical joints at the shoulders, elbows and knees, panel seam lines, "
 "ear-mounted headset pieces with small antenna fins, and thin glowing circuit lines. "
 "Tasteful full-coverage armor, heroic confident pose, not sexualized. No text, no watermark, no logo.")
PORTRAIT = ("Full body, head to toe fully visible, standing in a 3/4 view facing the viewer, centered with a little empty space around the figure, "
 "transparent background (PNG), vertical 2:3 image (1024x1536).")
SHEET = ("Character design reference sheet on a plain light-grey studio background with a subtle grid, even flat lighting, "
 "clean orthographic views, all figures the same height and aligned on one ground line, no text labels. Horizontal 3:2 image (1536x1024).")
jobs = [
 ("novice", "a rookie android", "light khaki utility jacket over the white and graphite robot body, fingerless mechanical gloves, small energy knife at the hip", "cyan", "long silver-white hair plates", "short tousled silver-white hair plates"),
 ("einherjar", "an armored knight android (tank class)", "heavy steel plate armor with red trim, a flowing crimson cape, horned Viking-style steel helmet, a broad energy sword with a glowing red edge and a round tech shield", "red", "long gunmetal hair plates", "short gunmetal hair plates"),
 ("runecaster", "a rune mage android", "deep navy blue hooded long coat covered in glowing blue Norse rune glyphs, holding a tall staff topped with a floating cyan energy orb, small runes orbiting her hand", "light blue", "long deep blue hair plates", "short deep blue hair plates"),
 ("wildhunter", "a ranger android", "forest green hooded cloak over light armor with tan leather straps, an energy longbow with a glowing green bowstring, a quiver of light arrows", "green", "long gold hair plates in a side braid of cables", "short gold hair plates"),
 ("volva", "a seer priestess android (healer class)", "white and gold flowing robe with gold filigree armor pieces, a gold circlet with a glowing blue gem, holding a short golden scepter-mace, soft golden holy light particles", "golden", "very long straight black hair plates", "shoulder-length black hair plates"),
 ("trickster", "a stealth rogue android", "sleek dark purple stealth armor with a pointed lower-face guard plate, twin daggers with violet energy edges, green accent lights on the suit", "violet", "long crimson hair plates in a high ponytail of cables", "short spiky crimson hair plates"),
 ("berserker", "a berserker warrior android", "rugged bronze and brown armor, a hood shaped like a wolf head made of metal plates, a huge two-handed energy axe with a glowing orange edge, sparks and embers", "orange", "long wild silver hair plates", "short spiky silver hair plates"),
]
items = []
items.append(dict(group="ภาพหน้าปก", file="keyart.png", size="แนวนอน 3:2 (1536x1024)", bg="มีฉากหลัง",
 prompt=f"{STYLE} Key visual: six android heroes (a red-caped knight, a blue rune mage, a green-hooded ranger, a white-and-gold priestess, a purple stealth rogue, and a bronze wolf-hooded berserker) standing together on a cliff at twilight, "
 "looking over a futuristic city with metal buildings, neon lights and a giant glowing cyan energy core tower; a shimmering rainbow light bridge (Bifrost) arcs across the sky; aurora and stars. "
 "Epic cinematic composition, leave clear empty sky in the upper center for a title logo. Horizontal 3:2 image (1536x1024)."))
items.append(dict(group="ภาพหน้าปก", file="logo.png", size="แนวนอน 3:2 (1536x1024)", bg="โปร่งใส",
 prompt="Game title logo that reads exactly \"IRON VALHALLA\" in bold futuristic letters, chrome steel metal with a glowing cyan neon edge, small Norse rune accents and a subtle circuit-line pattern, "
 "a thin horizontal energy line under the text. Centered, transparent background (PNG), no other text. Horizontal 3:2 image (1536x1024)."))
for (j, role, gear, glow, hair_f, hair_m) in jobs:
    items.append(dict(group="คลาสอัปเกรด — Frame Type-A (เพรียว)", file=f"job_{j}_f.png", size="แนวตั้ง 2:3 (1024x1536)", bg="โปร่งใส",
      prompt=f"{STYLE} Character: {role}, a feminine slim android (Frame Type-A), {hair_f}, a glowing {glow} visor strip, {gear}. {PORTRAIT}"))
for (j, role, gear, glow, hair_f, hair_m) in jobs:
    items.append(dict(group="คลาสอัปเกรด — Frame Type-B (แกร่ง)", file=f"job_{j}_m.png", size="แนวตั้ง 2:3 (1024x1536)", bg="โปร่งใส",
      prompt=f"{STYLE} Character: {role}, a masculine sturdy android (Frame Type-B, broader shoulders and heavier armor), {hair_m}, a glowing {glow} visor strip, {gear}. {PORTRAIT}"))
npcs = [
 ("bifrost", "Bifrost Keeper, a calm feminine android who operates the teleport network: long lavender hair plates, navy robe with gold trim, a rainbow-striped headband, a holographic rainbow ring floating behind her, a violet glowing visor"),
 ("jobmaster", "Mimir AI, an ancient wise android sage: grey hooded navy robe with glowing blue rune lines, a beard-shaped silver speaker grille on the chin, floating holographic rune tablets around him, a cyan glowing visor"),
 ("tool", "a cheerful supply shop android merchant: red bandana, brown work jacket with a canvas apron full of pockets, holding a repair kit in one hand and a glowing blue energy cell in the other, an amber glowing visor"),
 ("weapon", "a gruff masculine weaponsmith android: spiky dark hair plates, grey work armor with a soot-stained apron, holding up a freshly forged energy sword, an orange glowing visor"),
 ("armor", "a friendly feminine armor shop android: green twin-tail hair plates, green and cream robe, showing off a shiny armor chest plate, a green glowing visor"),
 ("refine", "Brokk Forge-Bot, a stocky dwarf-like forge robot with a bronze metal body, a rust-red beard made of metal plates, a glowing orange furnace in his chest, carrying a huge forge hammer"),
 ("nurse", "Eir Repair Unit, a kind nurse android: long pink hair plates, white and pink medical outfit with a small nurse cap marked with a cross, holding glowing repair tools, a pink glowing visor"),
 ("guide", "Guard Unit Rolf, a loyal city guard android: silver-grey hair plates, horned Viking-style steel helmet, steel armor with a red cape, holding a tall energy spear, a red glowing visor, friendly salute"),
]
for (k, desc) in npcs:
    items.append(dict(group="NPC", file=f"npc_{k}.png", size="แนวตั้ง 2:3 (1024x1536)", bg="โปร่งใส",
      prompt=f"{STYLE} Character: {desc}. {PORTRAIT}"))
# ---------------- หน้าสร้างตัวละคร (ภาพอ้างอิงดีไซน์) ----------------
CR = "Base model with no class gear: plain white and graphite armored robot body, cyan glow lines, holding nothing."
items.append(dict(group="หน้าสร้างตัวละคร (แบบอ้างอิง)", file="create_frame_a.png", size="แนวนอน 3:2 (1536x1024)", bg="พื้นเทาเรียบ",
 prompt=f"{STYLE} Turnaround sheet of Frame Type-A, a slim graceful feminine android: front view, 3/4 view, side view and back view. Long silver-white hair plates, cyan band visor. {CR} {SHEET}"))
items.append(dict(group="หน้าสร้างตัวละคร (แบบอ้างอิง)", file="create_frame_b.png", size="แนวนอน 3:2 (1536x1024)", bg="พื้นเทาเรียบ",
 prompt=f"{STYLE} Turnaround sheet of Frame Type-B, a sturdy masculine android with broader shoulders, thicker forearms and heavier leg armor: front view, 3/4 view, side view and back view. Short spiky silver-white hair plates, cyan band visor. {CR} {SHEET}"))
items.append(dict(group="หน้าสร้างตัวละคร (แบบอ้างอิง)", file="create_heads.png", size="แนวนอน 3:2 (1536x1024)", bg="พื้นเทาเรียบ",
 prompt=f"{STYLE} Head design sheet: six android heads in a 3x2 grid, bust view (head and shoulders), all with the same white faceplate and cyan band visor, each with a different synthetic hair-plate style: "
 "1) long straight hair plates reaching the back, 2) twin tails made of cable bundles, 3) short rounded bob, 4) short neat crop, 5) spiky swept-back plates, 6) a single tall crest fin like a helmet ridge. {SHEET}"))
items.append(dict(group="หน้าสร้างตัวละคร (แบบอ้างอิง)", file="create_visors.png", size="แนวนอน 3:2 (1536x1024)", bg="พื้นเทาเรียบ",
 prompt=f"{STYLE} Visor design sheet: three close-up front views of the same android head (short silver hair plates), side by side, each with a different visor: "
 "1) one straight horizontal glowing band across the face, 2) a sharp V-shaped glowing visor, 3) two short separate glowing slits. Cyan glow, strong bloom, still no eyes and no mouth. {SHEET}"))
items.append(dict(group="หน้าสร้างตัวละคร (แบบอ้างอิง)", file="create_colors.png", size="แนวนอน 3:2 (1536x1024)", bg="พื้นเทาเรียบ",
 prompt=f"{STYLE} Color variation lineup: six copies of the same slim android in front view standing in a row, same pose, each a different paint scheme with matching glow color: "
 "pearl white with cyan glow, light silver with green glow, steel grey with yellow glow, dark graphite with orange glow, ivory with red glow, soft pink-white with violet glow. {SHEET}"))
items.append(dict(group="หน้าสร้างตัวละคร (แบบอ้างอิง)", file="create_upgrade.png", size="แนวนอน 3:2 (1536x1024)", bg="พื้นเทาเรียบ",
 prompt=f"{STYLE} Upgrade progression sheet: the same slim android shown three times left to right: 1) plain base body (Novice), 2) mid-upgrade with glowing hexagon scan rings around her and armor pieces assembling in mid-air, "
 "3) fully upgraded into a red-caped knight class with horned helmet and energy sword. Arrows made of light between the stages. {SHEET}"))

# ---------------- มอนสเตอร์ (แอนดรอยด์ทั้งหมด) ----------------
MOBS1 = ("small cute chibi android units, each about half the height of a normal android: a pink hovering gel unit with a bob of pink hair plates and a thruster glow, "
 "a green crawler unit with short green hair plates holding a tiny dagger, a white bunny unit with tall metal bunny ears, an orange hovering ember unit, "
 "a black-and-yellow buzz unit with transparent bee wings and a V visor, a green hopper unit with a small energy bow, "
 "a mine unit wearing a red mushroom-dome helmet, a green hovering moss unit")
MOBS2 = ("full-size hostile android units: a grey wolf-eared ash stalker with a dagger and grey cape, a silver wolf-eared fenrir unit with a sword, "
 "a huge bulky bronze iron brute with a helmet and mace, a horned tusk trooper with an axe, a rusty draugr husk with a Viking helmet and axe, "
 "a skeletal frame warden with exposed bone-like white frame and a sword, a hooded hel maiden unit with a staff and teal glow, a dark horned hel guard unit with an axe and dark red cape; hostile units have red-glowing visors")
items.append(dict(group="มอนสเตอร์ (แบบอ้างอิง)", file="monsters_field.png", size="แนวนอน 3:2 (1536x1024)", bg="พื้นเทาเรียบ",
 prompt=f"{STYLE} Monster lineup sheet of {MOBS1}. Every monster is a humanoid android with the same no-eyes visor faceplate rule. {SHEET}"))
items.append(dict(group="มอนสเตอร์ (แบบอ้างอิง)", file="monsters_dungeon.png", size="แนวนอน 3:2 (1536x1024)", bg="พื้นเทาเรียบ",
 prompt=f"{STYLE} Monster lineup sheet of {MOBS2}. Every monster is a humanoid android with the same no-eyes visor faceplate rule. {SHEET}"))
items.append(dict(group="บอส MVP", file="mvp_seraph_pudding.png", size="แนวนอน 3:2 (1536x1024)", bg="มีฉากหลัง",
 prompt=f"{STYLE} Boss splash art: SERAPH CORE, a giant angelic humanoid android goddess in pearl-white and gold armor with a long flowing armored robe, long cream-gold hair plates, a golden glowing visor strip, "
 "huge mechanical angel wings made of white metal feather plates with gold edges, a golden halo ring above her head, holding a tall golden staff, hovering with thruster glow under her feet, floating above misty lakes and green plains, dramatic light rays from the clouds, epic boss reveal. Horizontal 3:2 image (1536x1024)."))
items.append(dict(group="บอส MVP", file="mvp_kitsura.png", size="แนวนอน 3:2 (1536x1024)", bg="มีฉากหลัง",
 prompt=f"{STYLE} Boss splash art: KITSURA EX, a feminine fox-type android boss with long orange hair plates, tall metal fox ears, an orange glowing V-shaped visor, sleek orange and white armor, nine long metallic fox tails with glowing orange lines, "
 "surrounded by swirling fire, dramatic battle pose, inside a dark cave with glowing purple crystals and circuit lines on the floor, epic boss reveal. Horizontal 3:2 image (1536x1024)."))


# ---------------- ชีตไอคอน / ภาพแผนที่ (ตัดเป็นชิ้นด้วย tools/slice_sheet.py) ----------------
def sheet_size(c, r):
    return ("สี่เหลี่ยมจัตุรัส 1:1 (1024x1024)", "Square 1:1 image (1024x1024)") if c == r else ("แนวนอน 3:2 (1536x1024)", "Horizontal 3:2 image (1536x1024)")
for sh in SHEETS:
    th, en = sheet_size(sh['cols'], sh['rows'])
    n = len(sh['cells'])
    order = ' '.join(f"{i + 1}) {d}." for i, (_, d) in enumerate(sh['cells']))
    items.append(dict(group=sh['group'], file=sh['file'], size=f"{th} • ชีต {sh['cols']}×{sh['rows']}", bg="โปร่งใส" if sh['mode'] == 'alpha' else "เต็มช่อง",
      keys=[k for k, _ in sh['cells'] if not k.endswith('_blank') and '_blank' not in k],
      prompt=f"{sh['style']} Layout: exactly {sh['cols']} columns x {sh['rows']} rows = {n} equal cells, {en}. "
             f"Cells in reading order (left to right, top to bottom): {order}"))
MAP_STYLE = ("Anime game background art, painterly cel-shaded scenery, rich lighting and atmosphere, sci-fi Norse mythology world of androids called IRON VALHALLA, "
 "wide establishing shot from a slightly high angle, no characters, no text, no logo. Horizontal 3:2 image (1536x1024).")
for k, d in MAPS:
    items.append(dict(group="ภาพแผนที่ (แบนเนอร์ตอนเข้าแมพ)", file=f"{k}.png", size="แนวนอน 3:2 (1536x1024)", bg="มีฉากหลัง", prompt=f"{MAP_STYLE} Location: {d}."))

# เรียงตามความสำคัญ (เห็นบ่อยที่สุดก่อน) + ทำเครื่องหมายภาพที่ได้รับแล้ว
ORDER = ["ชิ้นส่วนกระดูก (animation)", "สไปรต์ NPC / ผู้เล่น ในเกม (ชิบิ)", "ฉาก: ต้นไม้ / ของประดับ / อาคาร", "สไปรต์มอนสเตอร์ในเกม (สไตล์ RO หุ่นยนต์)", "ไอคอนสกิล", "ไอคอนไอเทม", "คลาสอัปเกรด — Frame Type-A (เพรียว)", "คลาสอัปเกรด — Frame Type-B (แกร่ง)", "NPC",
 "หน้ามอนสเตอร์ (กรอบเป้าหมาย)", "ตราคลาส", "ภาพแผนที่ (แบนเนอร์ตอนเข้าแมพ)", "บอส MVP", "ภาพหน้าปก", "หน้าสร้างตัวละคร (แบบอ้างอิง)", "มอนสเตอร์ (แบบอ้างอิง)"]
items.sort(key=lambda it: ORDER.index(it['group']))
NUM = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯"
for it in items: it['group'] = f"{NUM[ORDER.index(it['group'])]} {it['group']}"
try:
    _m = json.load(open(os.path.join(ROOT, 'assets', 'manifest.json')))
    have = {os.path.splitext(f)[0] for f in (_m['files'] if isinstance(_m, dict) else _m)}
except Exception: have = set()
for it in items:
    keys = it.get('keys') or [it['file'][:-4]]
    it['done'] = all(k in have for k in keys)
if len(sys.argv) > 1: json.dump(items, open(sys.argv[1], 'w'), ensure_ascii=False, indent=1)

# Markdown
md = ["# IRON VALHALLA — ชุด prompt สำหรับสร้างภาพด้วย ChatGPT", "",
 "วิธีใช้:", "1. เปิดแชทใหม่ใน ChatGPT แล้ววาง prompt ทีละอัน (แชทเดียวกันทั้งหมด ภาพจะออกมาสไตล์เดียวกัน)",
 "2. ถ้าภาพไหนไม่ถูกใจ พิมพ์ต่อว่า \"same style, regenerate\" หรือบอกสิ่งที่อยากแก้",
 "3. ดาวน์โหลดภาพเป็น PNG แล้ว **ตั้งชื่อไฟล์ตามที่ระบุ** ใส่ในโฟลเดอร์ `assets/` (หรือส่งภาพมาในแชทให้ Claude ใส่ให้)",
 "4. เกมจะใช้ภาพอัตโนมัติ ภาพไหนยังไม่มีจะใช้ภาพวาดด้วยโค้ดแทน", "",
 "| ไฟล์ | ใช้ที่ไหนในเกม |", "|---|---|",
 "| `keyart.png`, `logo.png` | หน้าไตเติล |",
 "| `job_<คลาส>_f.png` (Type-A) / `_m.png` (Type-B) | รูปโปรไฟล์ในการ์ดยูนิต + ตอนอัปเกรดร่างกับ Mimir AI |",
 "| `npc_<id>.png` | ภาพตัวละครข้างกล่องบทสนทนา |",
 "| `mvp_<id>.png` | ฉากเปิดตัวบอสเต็มจอ |",
 "| `sheet_skills_*.png` | ไอคอนสกิลในแถบสกิลและหน้าต่างสกิล (Claude ตัดเป็นรายชิ้นให้) |",
 "| `sheet_items_*.png` | ไอคอนไอเทมในกระเป๋า ร้านค้า แถบไอเทม และของที่ตกพื้น |",
 "| `sheet_emblems.png` | ตราคลาสในการ์ดยูนิต |",
 "| `sheet_mobs_*.png` | หน้ามอนสเตอร์ในกรอบเป้าหมายด้านบนจอ |",
 "| `map_<id>.png` | แบนเนอร์ตอนเข้าแผนที่ |",
 "| `create_*.png`, `monsters_*.png` | ภาพอ้างอิงดีไซน์ — ส่งกลับมาให้ Claude เพื่อปรับโมเดลในเกมให้ตรงแบบ |", "",
 "**ชีตไอคอน:** ถ้า ChatGPT วาดจำนวนช่องไม่ครบหรือเรียงผิด ให้สั่ง regenerate — ช่องต้องเท่ากันและเรียงตามลำดับในคำสั่ง", "",
 "**กฎสำคัญ:** ทุกตัวเป็นหุ่นแอนดรอยด์ ไม่มีมนุษย์ และ **ไม่มีลูกตา** — ใบหน้าเป็นแผ่นเหล็กเรียบ + แถบไฟวิเซอร์ ถ้า ChatGPT ใส่ตามา ให้พิมพ์ต่อว่า \"remove the eyes, use only a glowing visor strip\"", ""]
last=None
for it in items:
    if it['group']!=last: md += [f"## {it['group']}", ""]; last=it['group']
    md += [f"### `{it['file']}` — {it['size']} • พื้นหลัง: {it['bg']}{' ✓ ได้รับแล้ว' if it.get('done') else ''}", "", "```", it['prompt'], "```", ""]
open(os.path.join(ROOT, 'art', 'PROMPTS.md'), 'w').write('\n'.join(md))
print(len(items))
