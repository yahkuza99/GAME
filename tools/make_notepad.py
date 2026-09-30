# -*- coding: utf-8 -*-
"""สร้าง art/NOTEPAD.md + art/notepad.json: prompt ทุกภาพที่ยังขาด (ทุกอาชีพ ทุกเพศ มอนสเตอร์ NPC)
สถานะ "มีแล้ว" ดูจาก assets/manifest.json (anim_<key>_<ท่า>) — รันใหม่หลังติดตั้งภาพเพื่ออัปเดต
ใช้:  python3 tools/make_notepad.py"""
import json, os

ROOT = os.path.join(os.path.dirname(__file__), '..')
M = json.load(open(os.path.join(ROOT, 'assets', 'manifest.json')))
HAVE = {os.path.splitext(f)[0] for f in (M['files'] if isinstance(M, dict) else M)}

TAIL = ("Top of the head on the blue line, feet on the red line, one pose per cell, every frame clearly different. "
        "Same character height in every cell. Leave clear space between characters so they never touch. "
        "Output: flat white background, do NOT draw the labels, grid or guide lines.")
STYLE = ("2D MMORPG sprite in a cute, clean anime chibi style like Ragnarok Online, readable at 70 px tall. "
         "Every character is an ANDROID: smooth white faceplate with ONE glowing visor strip, NO eyes, NO mouth. "
         "Chibi proportions (head about 1/3 of the body height), thick dark outline, 2-tone cel shading, modest outfit.")

# ---------------- ตัวละคร ----------------
CHARS = [
    # key, ชื่อไทย, รูปอ้างอิง, คำบรรยาย, ประเภทอาวุธ, ท่าสกิล
    ('novice_f', 'Novice หญิง (Type-A)', 'ภาพเดินล่าสุดของ Novice หญิง', 'female android NOVICE (already designed — follow the attached walk sheet exactly)', 'dagger',
     'free hand raised forward, a small cyan repair glow forms in the palm'),
    ('novice_m', 'Novice ชาย (Type-B)', 'hero_novice_m.webp',
     'male android NOVICE: spiky silver hair plates, cyan visor, olive field jacket with a red cross shoulder patch, brown belt with pouches, white armored legs, short cyan energy dagger in the right hand',
     'dagger', 'free hand raised forward, a small cyan repair glow forms in the palm'),
    ('einherjar_f', 'Einherjar หญิง (นักรบวิญญาณ)', 'hero_einherjar_f.webp',
     'female android EINHERJAR knight: long silver-white hair, small silver winged helmet, red visor, silver plate armor with red trim, red cape, round silver shield with a gold star on the left arm, glowing red longsword in the right hand',
     'sword', 'shield raised and sword held up to the sky, a red-gold battle aura flares around the body'),
    ('einherjar_m', 'Einherjar ชาย (นักรบวิญญาณ)', 'hero_einherjar_m.webp',
     'male android EINHERJAR knight: full helm with curved horns, red visor, bulky silver plate armor with red trim, red cape, round silver shield with a gold star, glowing red longsword',
     'sword', 'shield raised and sword held up to the sky, a red-gold battle aura flares around the body'),
    ('runecaster_f', 'Rune Caster หญิง (นักเวทรูน)', 'hero_runecaster_f.webp',
     'female android RUNE CASTER mage: long deep-blue hair, deep blue hooded robe with glowing cyan rune patterns, cyan visor, white armored body under the robe, tall staff topped with a glowing blue orb and floating crystals',
     'staff', 'staff raised forward, a glowing cyan rune circle forms in front of the staff with runes orbiting'),
    ('runecaster_m', 'Rune Caster ชาย (นักเวทรูน)', 'hero_runecaster_m.webp',
     'male android RUNE CASTER mage: short blue hair under a deep blue hooded robe with glowing cyan rune patterns, cyan visor, tall staff topped with a glowing blue orb',
     'staff', 'staff raised forward, a glowing cyan rune circle forms in front of the staff with runes orbiting'),
    ('wildhunter_f', 'Wildhunter หญิง (นักล่า)', 'hero_wildhunter_f.webp',
     'female android WILDHUNTER archer: long blonde braid, green hooded cloak, green visor, white armor with brown leather straps, quiver of green-fletched arrows on the back, curved wood-and-gold recurve bow with a glowing green string',
     'bow', 'kneels slightly and draws a glowing green charged arrow, energy spiralling around the arrow tip'),
    ('wildhunter_m', 'Wildhunter ชาย (นักล่า)', 'hero_wildhunter_m.webp',
     'male android WILDHUNTER archer: short messy blond hair, green hooded cloak, green visor, white armor with leather straps, quiver of green arrows, curved wood-and-gold recurve bow with a glowing green string',
     'bow', 'kneels slightly and draws a glowing green charged arrow, energy spiralling around the arrow tip'),
    ('volva_f', 'Völva หญิง (นักพยากรณ์แห่งแสง)', 'hero_volva_f.webp',
     'female android VÖLVA priestess: long black hair with a gold circlet, flowing white-and-gold robe with Norse knot patterns, gold visor, golden staff with a sun-ring top and a cyan gem',
     'staff', 'golden staff raised overhead, warm golden light rays and a halo ring shine down around her'),
    ('volva_m', 'Völva ชาย (นักพยากรณ์แห่งแสง)', 'hero_volva_m.webp',
     'male android VÖLVA priest: shoulder-length black hair with a gold headband, white-and-gold robe with Norse knot patterns, gold visor, golden staff with a sun-ring top',
     'staff', 'golden staff raised overhead, warm golden light rays and a halo ring shine down around him'),
    ('trickster_f', "Loki's Trickster หญิง (นักลวง)", 'hero_trickster_f.webp',
     "female android LOKI'S TRICKSTER rogue: long crimson hair plates in a high ponytail, purple visor, dark purple-black stealth suit with a ragged purple scarf and small green glowing accents, glowing violet dagger",
     'dagger', 'crouches low with the dagger reversed, purple shadow smoke swirls up around her body'),
    ('trickster_m', "Loki's Trickster ชาย (นักลวง)", 'hero_trickster_m.webp',
     "male android LOKI'S TRICKSTER rogue: spiky crimson hair plates, purple visor, dark purple-black stealth suit with a ragged purple scarf and green glowing accents, glowing violet dagger",
     'dagger', 'crouches low with the dagger reversed, purple shadow smoke swirls up around his body'),
    ('berserker_f', 'Berserker หญิง (นักรบคลั่ง)', 'hero_berserker_f.webp',
     'female android BERSERKER: wolf-head pelt hood over long silver hair, orange visor, bronze-brown heavy armor trimmed with fur, huge glowing orange battle axe',
     'axe', 'roars with the axe raised high, a red-orange rage aura of flames bursts around the body'),
    ('berserker_m', 'Berserker ชาย (นักรบคลั่ง)', 'hero_berserker_m.webp',
     'male android BERSERKER: wolf-head pelt hood, orange visor, very bulky bronze-brown heavy armor trimmed with fur, huge glowing orange battle axe',
     'axe', 'roars with the axe raised high, a red-orange rage aura of flames bursts around the body'),
]
ATTACK = {
    'dagger': '1 ready, 2 pull back (dagger arm drawn far back), 3 lunge forward, 4 full SLASH with a short glowing slash arc, 5 follow-through, 6 back to ready',
    'sword': '1 ready behind the shield, 2 pull back with the sword raised high, 3 step in, 4 full overhead SLASH with a red slash arc, 5 follow-through low, 6 back to ready',
    'staff': '1 ready holding the staff, 2 staff pulled back, 3 step in swinging, 4 staff HIT with a small bright spark, 5 follow-through, 6 back to ready',
    'bow': '1 ready with the bow lowered, 2 nock an arrow, 3 full draw aimed ahead, 4 RELEASE with the arrow flying off and a green streak, 5 bow recoil, 6 back to ready',
    'axe': '1 ready, 2 axe raised overhead with both hands, 3 lunge forward, 4 heavy CHOP with an orange arc, 5 follow-through low to the ground, 6 back to ready',
}
SHEETS = [  # ท่า, เทมเพลต, ตาราง, คำอธิบายไทย
    ('walk', 'tpl_walk.png', '4×5', 'เดิน (ภาพแรกของตัวละคร = แบบอ้างอิง)'),
    ('idle', 'tpl_idle.png', '4×5', 'ยืนขาคู่'),
    ('attack', 'tpl_attack.png', '6×5', 'โจมตี'),
    ('cast', 'tpl_cast.png', '4×5', 'ท่าสกิล (1 ท่าใช้กับทุกสกิล)'),
    ('sit_hurt', 'tpl_sit_hurt.png', '4×5', 'นั่ง + โดนตี'),
    ('dead', 'tpl_dead.png', '4×5', 'ล้ม'),
]


def char_prompt(c, sheet):
    key, _, _, desc, wt, skill = c
    ref = 'this exact character (the attached walk sheet — same design, same colors, same size)'
    if sheet == 'walk':
        return (f"{STYLE}\nCharacter: {desc}. Use the attached character image for the design.\n"
                "Draw a WALK cycle into the attached template, 4 frames per direction, legs clearly alternating: "
                "1 LEFT leg far forward, RIGHT leg back (wide stride); 2 legs together, RIGHT knee lifted; "
                "3 RIGHT leg far forward, LEFT leg back; 4 legs together, LEFT knee lifted. Arms swing opposite to the legs. "
                "Each row is a direction as labelled (FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK).\n" + TAIL)
    if sheet == 'idle':
        return (f"Draw {ref} into the attached template: IDLE standing pose, 4 frames per direction. "
                "Stands still with BOTH FEET TOGETHER side by side, both soles flat on the red line, legs straight, knees together, weapon held relaxed. "
                "Frames: 1 neutral, 2 breathe in (shoulders a tiny bit higher), 3 neutral, 4 breathe out. The legs and feet must NOT move between frames. "
                "Each row is a direction as labelled.\n" + TAIL.replace(', every frame clearly different', ''))
    if sheet == 'attack':
        return f"Draw {ref} into the attached template: ATTACK, 6 frames per direction: {ATTACK[wt]}. Each row is a direction as labelled.\n" + TAIL
    if sheet == 'cast':
        return (f"Draw {ref} into the attached template: SKILL pose (one pose used for every skill), 4 frames per direction: "
                f"1 ready, 2 charging, 3 release, 4 effect at full size. The pose: {skill}. Each row is a direction as labelled.\n" + TAIL)
    if sheet == 'sit_hurt':
        return (f"Draw {ref} into the attached template.\n"
                "Columns 1-2 SIT: sitting on the ground with legs folded, resting, bottom on the red line (the head is naturally BELOW the blue line when sitting). The 2 sit frames are almost identical (calm breathing only).\n"
                "Columns 3-4 HURT (standing): 3 knocked back, body leaning away, visor flickers bright; 4 recovering back into stance. Hurt frames: top of the head on the blue line, feet on the red line.\n"
                "Each row is a direction as labelled. Same character size as the walk sheet. Leave clear space between characters so they never touch. "
                "Output: flat white background, do NOT draw the labels, grid or guide lines.")
    return (f"Draw {ref} into the attached template: DEAD, 4 frames per direction: 1 knees buckle, 2 falling to the ground, "
            "3 lying FLAT on the ground (whole body resting on the red line, seen from the game's high 3/4 camera), 4 lying still with the visor dark (turned off). "
            "Only frame 1 reaches up toward the blue line; frames 2-4 are low on the red line. Each row is a direction as labelled. Same character size as the walk sheet. "
            "Leave clear space between characters so they never touch. Output: flat white background, do NOT draw the labels, grid or guide lines.")


def char_done(key, sheet):
    if sheet == 'sit_hurt': return f'anim_{key}_sit' in HAVE and f'anim_{key}_hurt' in HAVE and key != 'novice_f'
    if sheet == 'dead' and key == 'novice_f': return False  # ภาพเดิมเป็นดีไซน์เก่า
    if sheet == 'idle' and key == 'novice_f': return False  # ยังไม่ขาคู่
    return f'anim_{key}_{sheet}' in HAVE


# ---------------- มอนสเตอร์ (1 ภาพต่อตัว: แถวบนเคลื่อนที่ แถวล่างโจมตี หันซ้าย) ----------------
MOBS = [
    ('pudding', 'Gel Unit', 'Emerald Meadow', 'squash down, stretch up jumping, in the air, landing squash', 'squash low, lunge forward stretched, SPLAT hit, bounce back'),
    ('leafworm', 'Crawler Unit', 'Emerald Meadow', 'body segments wave forward like a caterpillar (4 steps of a crawl)', 'rear up, head lunges forward biting, hit, pull back'),
    ('moonbun', 'Bunny Unit', 'Emerald Meadow', 'crouch, hop up, in the air with ears back, land', 'crouch, jump kick forward, hit, land'),
    ('ember_pudding', 'Ember Unit', 'Emerald Meadow', 'squash and jump like a slime, the antenna flame flickers', 'squash low, lunge forward, fiery SPLAT hit with a burst of flame, bounce back'),
    ('buzzfly', 'Buzz Unit', 'Emerald Meadow', 'hovering, wings blur up and down, body bobbing', 'pull back, dive forward stinger first, STING, fly back'),
    ('stumpling', 'Rust Sentry', 'Mistlake Plains', 'root legs shuffle forward one side then the other (a heavy waddle)', 'lean back, swing a wooden root arm, SMASH hit with wood chips, recover'),
    ('fiddlehopper', 'Hopper Unit', 'Mistlake Plains', 'crouch, big grasshopper hop, in the air, land (keep the violin)', 'crouch, leap forward, kick with the long hind legs, land'),
    ('capshroom', 'Mine Unit', 'Mistlake Plains', 'waddles on its little red boots, the siren light blinks', 'cap puffs up, siren flashes red, small BOOM burst in front, deflate'),
    ('moss_pudding', 'Moss Unit', 'Mistlake Plains', 'squash and jump like a slime, the clover leaf bounces', 'squash low, lunge forward, mossy SPLAT hit with leaves, bounce back'),
    ('seraph_pudding', 'Seraph Core (MVP)', 'Mistlake Plains', 'hovers with the wings flapping, halo glowing, gentle bob', 'rise up, golden light charge, holy SLAM down with a flash, float back'),
    ('ashtail', 'Ash Stalker', 'Wolfwood Forest', 'four-legged trot cycle (legs alternate diagonally), striped tail swishing', 'crouch, pounce forward, claw SWIPE, land'),
    ('fenrir_pup', 'Fenrir Unit', 'Wolfwood Forest', 'four-legged run cycle (gallop), glowing cyan fins trail', 'lower head and snarl, lunge, BITE with a cyan flash, pull back'),
    ('mossback', 'Iron Brute', 'Wolfwood Forest', 'heavy four-legged bear walk, moss sways', 'rear up on hind legs, both paws raised, heavy SLAM down with dust, back to four legs'),
    ('tuskboar', 'Tusk Trooper', 'Wolfwood Forest', 'four-legged trot, head bobbing', 'paw the ground, head down, CHARGE with the tusks forward, skid stop'),
    ('draugr', 'Draugr Husk', "Hel's Hollow", 'shambling undead walk, torn cloak swaying, axe dragging', 'raise the rusty axe, lurch forward, CHOP, stagger back'),
    ('bone_warden', 'Frame Warden', "Hel's Hollow", 'stiff skeleton march with the shield up', 'shield up, raise the sword, SLASH, back behind the shield'),
    ('hel_maiden', 'Hel Maiden Unit', "Hel's Hollow", 'floats forward, the ragged robe trailing, lantern swinging', 'lantern raised, cyan soul flame charges, FIRE a ghost flame, float back'),
    ('hel_guard', 'Hel Guard Unit', "Hel's Hollow", 'heavy armored march, cape swaying, halberd upright', 'halberd raised overhead, step in, heavy CLEAVE, recover'),
    ('kitsura', 'Kitsura EX (MVP)', "Hel's Hollow", 'graceful floating walk, nine tails fanning and waving', 'tails fan out, fox-fire charges in the palm, CAST a burst of orange fox fire, tails settle'),
]


def mob_prompt(m):
    _, name, _, move, atk = m
    return ("Use the attached monster as the exact design (same colors, same size, same art style: cute chibi robot for a 2000s Korean MMORPG). "
            f"This is {name}.\nDraw it into the attached 4x2 template, facing LEFT (3/4 view), bottom on the red line in every cell (even for jumps: the game adds the jump height itself).\n"
            f"Top row = MOVE loop, 4 frames: {move}.\nBottom row = ATTACK, 4 frames: {atk}.\n"
            "Every frame clearly different. Leave clear space between cells. Flat white background, do NOT draw the labels, grid or guide lines.")


KAIA = ("In-game character sprite for a cute classic 2000s Korean MMORPG (chibi, about 2.5 heads tall), same art style as the attached NPC.\n"
        "Storage Unit Kaia: friendly feminine android warehouse clerk. Smooth white faceplate with ONE glowing teal visor strip, NO eyes, NO mouth.\n"
        "Dark navy hair plates in a low ponytail, small red ribbon, navy-and-cream clerk uniform with a short cape, a floating holographic crate icon beside her hand, a little cargo drone on her shoulder.\n"
        "Single full-body figure, 3/4 view FACING LEFT, standing, centered. Fully transparent background, cel-shaded, crisp dark outline, readable at 64 px. No text, no shadow.")


def build():
    items = []  # สำหรับหน้าเว็บ
    L = ['# 📝 Prompt Notepad — ภาพที่ยังขาดทั้งหมด', '',
         'สร้างอัตโนมัติด้วย `python3 tools/make_notepad.py` (ดูว่าอะไรมีแล้วจาก assets) • ✅ = ติดตั้งแล้ว • ⬜ = ยังขาด', '',
         '## วิธีใช้', '',
         '1. ตัวละคร 1 ตัว = แชต ChatGPT 1 ห้อง สั่ง **ภาพเดินก่อนเสมอ** (แนบรูปอ้างอิงในตาราง + เทมเพลต)',
         '2. ภาพต่อ ๆ ไป แนบ **ภาพเดินที่ได้** + เทมเพลตของท่านั้น แล้ววาง prompt',
         '3. มอนสเตอร์ 1 ตัว = 1 ภาพ แนบรูปมอนเดิม (`assets/mobsprite_*.webp`) + `art/tpl_mob.png`',
         '4. ส่งภาพมาได้เลย ผมวัดขนาด ตัดเฟรม ทำทิศขวา และติดตั้งให้เอง', '']
    todo_c = todo_m = 0
    L += ['## ตัวละคร (อาชีพละ 6 ภาพ)', '']
    for c in CHARS:
        key, th, ref = c[0], c[1], c[2]
        L += [f'### {th} — `{key}`', '', f'รูปอ้างอิงสำหรับภาพเดิน: `{ref}`', '']
        for sheet, tpl, grid, thsheet in SHEETS:
            done = char_done(key, sheet)
            if not done: todo_c += 1
            p = char_prompt(c, sheet)
            L += [f"{'✅' if done else '⬜'} **{thsheet}** — แนบ `{tpl}` ({grid})", '']
            if not done: L += ['```', p, '```', '']
            items.append({'group': th, 'key': key, 'sheet': sheet, 'title': thsheet, 'attach': ([ref] if sheet == 'walk' else ['ภาพเดินของตัวนี้']) + [tpl], 'done': done, 'prompt': p})
    L += ['## มอนสเตอร์ (ตัวละ 1 ภาพ)', '']
    for m in MOBS:
        done = f'anim_mob_{m[0]}_walk' in HAVE
        if not done: todo_m += 1
        p = mob_prompt(m)
        L += [f"{'✅' if done else '⬜'} **{m[1]}** ({m[2]}) — แนบ `mobsprite_{m[0]}.webp` + `tpl_mob.png`", '']
        if not done: L += ['```', p, '```', '']
        items.append({'group': 'มอนสเตอร์', 'key': 'mob_' + m[0], 'sheet': 'mob', 'title': f'{m[1]} • {m[2]}', 'attach': [f'mobsprite_{m[0]}.webp', 'tpl_mob.png'], 'done': done, 'prompt': p})
    kdone = 'npcsprite_storage' in HAVE
    L += ['## NPC', '', f"{'✅' if kdone else '⬜'} **Storage Unit Kaia** — แนบรูป NPC ตัวไหนก็ได้ 1 รูปเป็นแบบสไตล์", '']
    if not kdone: L += ['```', KAIA, '```', '']
    items.append({'group': 'NPC', 'key': 'npcsprite_storage', 'sheet': 'npc', 'title': 'Storage Unit Kaia', 'attach': ['npcsprite_nurse.webp (แบบสไตล์)'], 'done': kdone, 'prompt': KAIA})
    L.insert(4, f'**ยังขาด: ตัวละคร {todo_c} ภาพ • มอนสเตอร์ {todo_m} ภาพ • NPC {0 if kdone else 1} ภาพ**\n')
    open(os.path.join(ROOT, 'art', 'NOTEPAD.md'), 'w').write('\n'.join(L))
    json.dump(items, open(os.path.join(ROOT, 'art', 'notepad.json'), 'w'), ensure_ascii=False, indent=0)
    print(f'NOTEPAD: characters {todo_c}, monsters {todo_m}, npc {0 if kdone else 1}')


if __name__ == '__main__':
    build()


# ---------------- หน้าเว็บ (คัดลอกง่ายบนมือถือ + รูปอ้างอิงให้กดค้างบันทึก) ----------------
PAGE = r'''<title>Prompt Notepad</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<style>
  :root { --bg:#0b1119; --panel:#131c27; --panel2:#1a2532; --line:#27364a; --fg:#e2ebf4; --dim:#8ea0b4; --cy:#5fe0ff; --ok:#72dd8e; --warn:#ffcf5c; color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body { background: var(--bg); color: var(--fg); }
  body { margin: 0; font: 15px/1.55 Kanit, "Noto Sans Thai", system-ui, sans-serif; padding-inline: 16px; padding-block: 16px 60px; }
  .wrap { max-width: 900px; margin: 0 auto; display: grid; gap: 14px; }
  h1 { margin: 0; font-size: 24px; font-weight: 600; } h1 b { color: var(--cy); font-weight: 600; }
  .sum { color: var(--dim); font-size: 14px; }
  .sum b { color: var(--warn); font-weight: 500; }
  .bar { display: flex; flex-wrap: wrap; gap: 8px; position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; background: var(--bg); padding-block: 8px; }
  .bar button { font: inherit; font-size: 14px; color: var(--fg); background: var(--panel2); border: 1px solid var(--line); border-radius: 999px; padding: 5px 14px; cursor: pointer; }
  .bar button.on { border-color: var(--cy); color: var(--cy); }
  details.grp { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; }
  details.grp > summary { list-style: none; cursor: pointer; padding: 12px 14px; display: flex; justify-content: space-between; gap: 10px; font-weight: 500; }
  details.grp > summary::-webkit-details-marker { display: none; }
  summary small { color: var(--dim); font-weight: 400; white-space: nowrap; }
  .cards { display: grid; gap: 10px; padding: 0 12px 12px; }
  .card { background: var(--panel2); border: 1px solid var(--line); border-radius: 10px; padding: 12px; display: grid; gap: 8px; min-width: 0; }
  .card.done { opacity: .55; }
  .hd { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .hd b { font-weight: 500; }
  .chip { font-size: 12px; padding: 1px 9px; border-radius: 999px; border: 1px solid var(--line); color: var(--dim); }
  .chip.ok { color: var(--ok); border-color: rgba(114,221,142,.4); } .chip.todo { color: var(--warn); border-color: rgba(255,207,92,.35); }
  .att { display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-end; font-size: 12.5px; color: var(--dim); }
  .att figure { margin: 0; display: grid; gap: 2px; justify-items: center; }
  .att img { height: 84px; max-width: 130px; object-fit: contain; background: #fff; border-radius: 6px; border: 1px solid var(--line); }
  .att img.ref { background: #2b3a2c; }
  .att .txt { padding: 4px 8px; border: 1px dashed var(--line); border-radius: 6px; }
  pre { margin: 0; white-space: pre-wrap; word-break: break-word; font: 12.5px/1.5 "JetBrains Mono", ui-monospace, monospace; background: #0a0f16; border: 1px solid var(--line); border-radius: 8px; padding: 10px; max-height: 160px; overflow: auto; }
  .acts { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .acts button { font: inherit; font-size: 14px; border-radius: 8px; padding: 6px 14px; cursor: pointer; border: 1px solid var(--cy); background: rgba(95,224,255,.12); color: var(--cy); }
  .acts label { font-size: 13.5px; color: var(--dim); display: flex; gap: 6px; align-items: center; cursor: pointer; }
  .hint { color: var(--dim); font-size: 13px; }
</style>
<div class="wrap">
  <header><h1>Prompt <b>Notepad</b></h1><div class="sum" id="sum"></div></header>
  <div class="hint">1 ตัวละคร = แชต ChatGPT 1 ห้อง • สั่ง "เดิน" ก่อนเสมอ แล้วใช้ภาพเดินที่ได้เป็นแบบของภาพถัดไป • กดค้างที่รูปเพื่อบันทึกแล้วแนบ • ส่งภาพที่ได้มาให้ติดตั้ง</div>
  <div class="bar" id="bar"></div>
  <div id="list" class="wrap"></div>
</div>
<script>
const DATA = __DATA__;
const IMG = __IMG__;
const $ = s => document.querySelector(s);
let filter = 'todo';
const store = { get(k) { try { return JSON.parse(localStorage.getItem('pn_sent') || '{}')[k]; } catch (e) { return false; } },
  set(k, v) { try { const o = JSON.parse(localStorage.getItem('pn_sent') || '{}'); o[k] = v; localStorage.setItem('pn_sent', JSON.stringify(o)); } catch (e) {} } };
function el(t, a = {}, ...kids) { const e = document.createElement(t); for (const k in a) { if (k === 'class') e.className = a[k]; else if (k.startsWith('on')) e.addEventListener(k.slice(2), a[k]); else e.setAttribute(k, a[k]); } for (const c of kids.flat()) if (c != null) e.append(c); return e; }
function copy(txt, btn) {
  const done = () => { btn.textContent = 'คัดลอกแล้ว ✓'; setTimeout(() => btn.textContent = 'คัดลอก prompt', 1400); };
  const fb = () => { const pre = btn.closest('.card').querySelector('pre'); const r = document.createRange(); r.selectNodeContents(pre); const s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = 'เลือกข้อความแล้ว — กดคัดลอก'; };
  try { navigator.clipboard.writeText(txt).then(done, fb); } catch (e) { fb(); }
}
function render() {
  const todo = DATA.filter(d => !d.done).length, sent = DATA.filter(d => !d.done && store.get(d.key + ':' + d.sheet)).length;
  $('#sum').innerHTML = `ยังขาด <b>${todo}</b> ภาพ • ส่งไปแล้ว (ในเครื่องนี้) ${sent} • ติดตั้งแล้ว ${DATA.length - todo}`;
  const bar = $('#bar'); bar.innerHTML = '';
  for (const [k, l] of [['todo', 'ที่ยังขาด'], ['all', 'ทั้งหมด'], ['char', 'ตัวละคร'], ['mob', 'มอนสเตอร์'], ['npc', 'NPC']]) bar.append(el('button', { class: filter === k ? 'on' : '', onclick: () => { filter = k; render(); } }, l));
  const list = $('#list'); list.innerHTML = '';
  const groups = {};
  for (const d of DATA) {
    const kind = d.sheet === 'mob' ? 'mob' : d.sheet === 'npc' ? 'npc' : 'char';
    if (filter === 'todo' && d.done) continue;
    if (['char', 'mob', 'npc'].includes(filter) && kind !== filter) continue;
    (groups[d.group] = groups[d.group] || []).push(d);
  }
  let first = true;
  for (const [g, items] of Object.entries(groups)) {
    const left = items.filter(d => !d.done).length;
    const det = el('details', { class: 'grp' }, el('summary', {}, el('span', {}, g), el('small', {}, left ? `ขาด ${left}/${items.length}` : 'ครบ ✓')));
    if (first) { det.open = true; first = false; }
    const cards = el('div', { class: 'cards' });
    for (const d of items) {
      const id = d.key + ':' + d.sheet, sent = store.get(id);
      const att = el('div', { class: 'att' }, 'แนบ:', ...d.attach.map(a => IMG[a] ? el('figure', {}, el('img', { src: IMG[a], alt: a, class: a.startsWith('tpl_') ? '' : 'ref', loading: 'lazy' }), el('span', {}, a)) : el('span', { class: 'txt' }, a)));
      const cb = el('input', { type: 'checkbox' }); cb.checked = !!sent; cb.addEventListener('change', () => { store.set(id, cb.checked); render(); });
      cards.append(el('div', { class: 'card' + (d.done ? ' done' : '') },
        el('div', { class: 'hd' }, el('b', {}, d.title), el('span', { class: 'chip ' + (d.done ? 'ok' : 'todo') }, d.done ? 'ติดตั้งแล้ว' : sent ? 'ส่งแล้ว รอติดตั้ง' : 'ยังขาด')),
        att, el('pre', {}, d.prompt),
        el('div', { class: 'acts' }, el('button', { onclick: e => copy(d.prompt, e.target) }, 'คัดลอก prompt'), d.done ? null : el('label', {}, cb, 'ส่งให้ ChatGPT แล้ว'))));
    }
    det.append(cards); list.append(det);
  }
  if (!list.children.length) list.append(el('div', { class: 'hint' }, 'ไม่มีรายการในหมวดนี้'));
}
render();
</script>
'''


def build_page():
    items = json.load(open(os.path.join(ROOT, 'art', 'notepad.json')))
    img, files = {}, {}
    for it in items:
        for a in it['attach']:
            name = a.split(' ')[0]
            for src in (os.path.join('art', name), os.path.join('assets', name)):
                if os.path.exists(os.path.join(ROOT, src)):
                    img[a] = 'img/' + name; files['img/' + name] = src
    html = PAGE.replace('__DATA__', json.dumps(items, ensure_ascii=False)).replace('__IMG__', json.dumps(img, ensure_ascii=False))
    open(os.path.join(ROOT, 'art', 'notepad.html'), 'w').write(html)
    json.dump(files, open(os.path.join(ROOT, 'art', 'notepad_files.json'), 'w'), indent=0)
    print('page: art/notepad.html,', len(files), 'images')


if __name__ == '__main__':
    build_page()
