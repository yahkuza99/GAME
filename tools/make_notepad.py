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
     'free hand raised forward, palm open'),
    ('novice_m', 'Novice ชาย (Type-B)', 'hero_novice_m.webp',
     'male android NOVICE: spiky silver hair plates, cyan visor, olive field jacket with a red cross shoulder patch, brown belt with pouches, white armored legs, short cyan energy dagger in the right hand',
     'dagger', 'free hand raised forward, palm open'),
    ('einherjar_f', 'Einherjar หญิง (นักรบวิญญาณ)', 'hero_einherjar_f.webp',
     'female android EINHERJAR knight: long silver-white hair, small silver winged helmet, red visor, silver plate armor with red trim, red cape, round silver shield with a gold star on the left arm, glowing red longsword in the right hand',
     'sword', 'shield raised and sword held up to the sky'),
    ('einherjar_m', 'Einherjar ชาย (นักรบวิญญาณ)', 'hero_einherjar_m.webp',
     'male android EINHERJAR knight: full helm with curved horns, red visor, bulky silver plate armor with red trim, red cape, round silver shield with a gold star, glowing red longsword',
     'sword', 'shield raised and sword held up to the sky'),
    ('runecaster_f', 'Rune Caster หญิง (นักเวทรูน)', 'hero_runecaster_f.webp',
     'female android RUNE CASTER mage: long deep-blue hair, deep blue hooded robe with glowing cyan rune patterns, cyan visor, white armored body under the robe, tall staff topped with a glowing blue orb and floating crystals',
     'staff', 'staff thrust forward with both hands'),
    ('runecaster_m', 'Rune Caster ชาย (นักเวทรูน)', 'hero_runecaster_m.webp',
     'male android RUNE CASTER mage: short blue hair under a deep blue hooded robe with glowing cyan rune patterns, cyan visor, tall staff topped with a glowing blue orb',
     'staff', 'staff thrust forward with both hands'),
    ('wildhunter_f', 'Wildhunter หญิง (นักล่า)', 'hero_wildhunter_f.webp',
     'female android WILDHUNTER archer: long blonde braid, green hooded cloak, green visor, white armor with brown leather straps, quiver of green-fletched arrows on the back, curved wood-and-gold recurve bow with a glowing green string',
     'bow', 'kneels slightly and draws the bow at full stretch, aiming ahead'),
    ('wildhunter_m', 'Wildhunter ชาย (นักล่า)', 'hero_wildhunter_m.webp',
     'male android WILDHUNTER archer: short messy blond hair, green hooded cloak, green visor, white armor with leather straps, quiver of green arrows, curved wood-and-gold recurve bow with a glowing green string',
     'bow', 'kneels slightly and draws the bow at full stretch, aiming ahead'),
    ('volva_f', 'Völva หญิง (นักพยากรณ์แห่งแสง)', 'hero_volva_f.webp',
     'female android VÖLVA priestess: long black hair with a gold circlet, flowing white-and-gold robe with Norse knot patterns, gold visor, golden staff with a sun-ring top and a cyan gem',
     'staff', 'golden staff raised overhead with both hands'),
    ('volva_m', 'Völva ชาย (นักพยากรณ์แห่งแสง)', 'hero_volva_m.webp',
     'male android VÖLVA priest: shoulder-length black hair with a gold headband, white-and-gold robe with Norse knot patterns, gold visor, golden staff with a sun-ring top',
     'staff', 'golden staff raised overhead with both hands'),
    ('trickster_f', "Loki's Trickster หญิง (นักลวง)", 'hero_trickster_f.webp',
     "female android LOKI'S TRICKSTER rogue: long crimson hair plates in a high ponytail, purple visor, dark purple-black stealth suit with a ragged purple scarf and small green glowing accents, glowing violet dagger",
     'dagger', 'crouches low with the dagger held in reverse grip'),
    ('trickster_m', "Loki's Trickster ชาย (นักลวง)", 'hero_trickster_m.webp',
     "male android LOKI'S TRICKSTER rogue: spiky crimson hair plates, purple visor, dark purple-black stealth suit with a ragged purple scarf and green glowing accents, glowing violet dagger",
     'dagger', 'crouches low with the dagger held in reverse grip'),
    ('berserker_f', 'Berserker หญิง (นักรบคลั่ง)', 'hero_berserker_f.webp',
     'female android BERSERKER: wolf-head pelt hood over long silver hair, orange visor, bronze-brown heavy armor trimmed with fur, huge glowing orange battle axe',
     'axe', 'roars with the axe raised high over the head'),
    ('berserker_m', 'Berserker ชาย (นักรบคลั่ง)', 'hero_berserker_m.webp',
     'male android BERSERKER: wolf-head pelt hood, orange visor, very bulky bronze-brown heavy armor trimmed with fur, huge glowing orange battle axe',
     'axe', 'roars with the axe raised high over the head'),
]
ATTACK = {
    'dagger': '1 ready, 2 pull back (dagger arm drawn far back), 3 lunge forward, 4 full SLASH, arm fully extended, 5 follow-through, 6 back to ready',
    'sword': '1 ready behind the shield, 2 pull back with the sword raised high, 3 step in, 4 full overhead SLASH, sword low in front, 5 follow-through low, 6 back to ready',
    'staff': '1 ready holding the staff, 2 staff pulled back, 3 step in swinging, 4 staff HIT, arms fully extended, 5 follow-through, 6 back to ready',
    'bow': '1 ready with the bow lowered, 2 nock an arrow, 3 full draw aimed ahead, 4 RELEASE, string snapping forward (no arrow in flight), 5 bow recoil, 6 back to ready',
    'axe': '1 ready, 2 axe raised overhead with both hands, 3 lunge forward, 4 heavy CHOP, axe head low in front, 5 follow-through low to the ground, 6 back to ready',
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
        return f"Draw {ref} into the attached template: ATTACK, 6 frames per direction: {ATTACK[wt]}. Draw the character ONLY: no slash arcs, no motion lines, no effects (the game adds them). Each row is a direction as labelled.\n" + TAIL
    if sheet == 'cast':
        return (f"Draw {ref} into the attached template: SKILL pose (one pose used for every skill), 4 frames per direction: "
                f"1 ready, 2 gathering power, 3 release, 4 hold the final pose. The pose: {skill}. Draw the character ONLY: no magic circles, no glow, no aura, no smoke, no effects (the game adds skill effects separately). Each row is a direction as labelled.\n" + TAIL)
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
    if sheet == 'sit_hurt': return f'anim_{key}_sit' in HAVE and f'anim_{key}_hurt' in HAVE
    return f'anim_{key}_{sheet}' in HAVE


# ---------------- มอนสเตอร์ (1 ภาพต่อตัว: แถวบนเคลื่อนที่ แถวล่างโจมตี หันซ้าย) ----------------
MOBS = [
    ('pudding', 'Gel Unit', 'Emerald Meadow', 'squash down, stretch up jumping, in the air, landing squash', 'squash low, lunge forward stretched, SPLAT hit, bounce back'),
    ('leafworm', 'Crawler Unit', 'Emerald Meadow', 'body segments wave forward like a caterpillar (4 steps of a crawl)', 'rear up, head lunges forward biting, hit, pull back'),
    ('moonbun', 'Bunny Unit', 'Emerald Meadow', 'crouch, hop up, in the air with ears back, land', 'crouch, jump kick forward, hit, land'),
    ('ember_pudding', 'Ember Unit', 'Emerald Meadow', 'squash and jump like a slime, the antenna flame flickers', 'squash low, lunge forward, SPLAT hit, bounce back'),
    ('buzzfly', 'Buzz Unit', 'Emerald Meadow', 'hovering, wings blur up and down, body bobbing', 'pull back, dive forward stinger first, STING, fly back'),
    ('stumpling', 'Rust Sentry', 'Mistlake Plains', 'root legs shuffle forward one side then the other (a heavy waddle)', 'lean back, swing a wooden root arm, SMASH hit, recover'),
    ('fiddlehopper', 'Hopper Unit', 'Mistlake Plains', 'crouch, big grasshopper hop, in the air, land (keep the violin)', 'crouch, leap forward, kick with the long hind legs, land'),
    ('capshroom', 'Mine Unit', 'Mistlake Plains', 'waddles on its little red boots, the siren light blinks', 'cap puffs up big, siren light turns red, cap slams forward, deflate'),
    ('moss_pudding', 'Moss Unit', 'Mistlake Plains', 'squash and jump like a slime, the clover leaf bounces', 'squash low, lunge forward, SPLAT hit, bounce back'),
    ('seraph_pudding', 'Seraph Core (MVP)', 'Mistlake Plains', 'hovers with the wings flapping, halo glowing, gentle bob', 'rise up, wings spread wide, SLAM down, float back'),
    ('ashtail', 'Ash Stalker', 'Wolfwood Forest', 'four-legged trot cycle (legs alternate diagonally), striped tail swishing', 'crouch, pounce forward, claw SWIPE, land'),
    ('fenrir_pup', 'Fenrir Unit', 'Wolfwood Forest', 'four-legged run cycle (gallop), cyan fins stay the same', 'lower head and snarl, lunge, BITE, pull back'),
    ('mossback', 'Iron Brute', 'Wolfwood Forest', 'heavy four-legged bear walk, moss sways', 'rear up on hind legs, both paws raised, heavy SLAM down, back to four legs'),
    ('tuskboar', 'Tusk Trooper', 'Wolfwood Forest', 'four-legged trot, head bobbing', 'paw the ground, head down, CHARGE with the tusks forward, skid stop'),
    ('draugr', 'Draugr Husk', "Hel's Hollow", 'shambling undead walk, torn cloak swaying, axe dragging', 'raise the rusty axe, lurch forward, CHOP, stagger back'),
    ('bone_warden', 'Frame Warden', "Hel's Hollow", 'stiff skeleton march with the shield up', 'shield up, raise the sword, SLASH, back behind the shield'),
    ('hel_maiden', 'Hel Maiden Unit', "Hel's Hollow", 'floats forward, the ragged robe trailing, lantern swinging', 'lantern raised high, lean back, thrust the lantern forward, float back'),
    ('hel_guard', 'Hel Guard Unit', "Hel's Hollow", 'heavy armored march, cape swaying, halberd upright', 'halberd raised overhead, step in, heavy CLEAVE, recover'),
    ('kitsura', 'Kitsura EX (MVP)', "Hel's Hollow", 'graceful floating walk, nine tails fanning and waving', 'tails fan out, palm raised, thrust the palm forward, tails settle'),
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


# ---------------- แบบแชต: 1 ข้อความเริ่มต้นต่อตัวละคร แล้วพิมพ์ next ----------------
SHEET_NAME = {'walk': 'WALK', 'idle': 'IDLE', 'attack': 'ATTACK', 'cast': 'SKILL POSE', 'sit_hurt': 'SIT + HURT', 'dead': 'DEAD'}
TPL = {k: t for k, t, _, _ in SHEETS}


def body_of(c, sheet):
    """เนื้อหาเฉพาะของภาพนั้น (ตัดส่วนหัว/ท้ายที่ซ้ำ ใช้ในข้อความเริ่มต้นแบบแชต)"""
    p = char_prompt(c, sheet)
    for cut in ('into the attached template: ', 'into the attached template.\n'):
        if cut in p: p = p.split(cut, 1)[1]; break
    else:
        p = p.split('Draw a WALK cycle into the attached template, ', 1)[1] if 'Draw a WALK' in p else p
    for tail in (TAIL, TAIL.replace(', every frame clearly different', '')):
        p = p.replace('\n' + tail, '')
    p = p.split(' Leave clear space between characters')[0]
    return p.strip()


def chat_starter(c, sheets):
    key, th, ref, desc, wt, skill = c
    L = [STYLE, f"Character: {desc}.", '',
         'RULES FOR EVERY IMAGE: follow the template I attach with each image (rows = directions FRONT, FRONT-LEFT, LEFT, BACK-LEFT, BACK; columns = frames). '
         'Standing poses: top of the head on the blue line, feet on the red line. Same character, same size, same colors in every image — after IMAGE 1, the walk sheet you drew is the reference. '
         'Leave clear space between characters so they never touch. Draw the character ONLY: no effects, no glow auras, no slash arcs, no motion lines (the game adds effects). '
         'Flat white background. Do NOT draw the labels, grid or guide lines.', '',
         'I will ask for ONE image at a time and attach its template. After each image, wait until I type "next".', '']
    for i, sh in enumerate(sheets, 1):
        L.append(f"IMAGE {i} — {SHEET_NAME[sh]} (template {TPL[sh]}): {body_of(c, sh)}")
    L += ['', 'Start now with IMAGE 1.']
    return '\n'.join(L)


def mob_starter(mobs):
    L = ['You are my monster sprite artist for a cute 2000s Korean MMORPG (Ragnarok Online style) where every monster is a cute chibi ROBOT version of a classic monster.',
         'For each image I attach: (1) the monster design, (2) the 4x2 template. Draw that exact monster (same colors, same size, same art style) into the template, facing LEFT (3/4 view).',
         'Top row = MOVE loop (4 frames). Bottom row = ATTACK (4 frames). Bottom of the monster on the red line in every cell, even for jumps (the game adds the jump height). '
         'Every frame clearly different. Draw the monster ONLY: no effects, no motion lines, no impact bursts (the game adds them). Leave clear space between cells. Flat white background. Do NOT draw the labels, grid or guide lines.',
         'I will ask for ONE monster at a time. After each image, wait until I type "next".', '']
    for i, m in enumerate(mobs, 1):
        L.append(f"IMAGE {i} — {m[1]}: MOVE = {m[3]}. ATTACK = {m[4]}.")
    L += ['', 'Start now with IMAGE 1.']
    return '\n'.join(L)


# ---------------- เอฟเฟกต์สกิล (แบบ RO: ภาพแยก เล่นทับเป้าหมาย พื้นดำ เกมผสมแบบบวกแสง) ----------------
FX_STYLE = ("2D MMORPG skill effect animation in the style of Ragnarok Online spell effects: bright glowing magic, crisp shapes, "
            "on a PURE BLACK background (the game blends black as transparent). Draw 8 frames into the attached 4x2 template, "
            "left to right then top to bottom. The gray outline is the target character: keep the effect centered on it, "
            "ground on the red line, the effect can extend above the head. Draw ONLY the effect, no character, no text, "
            "do NOT draw the grid, numbers, gray outline or red line. ")
EFFECTS = [
    # ชื่อไฟล์ (fx_<ชื่อ>), ไทย, ใช้กับ, เฟรม
    ('slash', 'ฟันคม', 'Backstab, ตีคริติคอลของสกิล', '1 thin bright white-cyan slash line appears diagonally across the body, 2-3 the slash widens into a crescent arc with sparks, 4-5 a second crossing slash forms an X, 6-8 the X fades into small sparkles'),
    ('bash', 'ทุบหนัก', 'Shield Slam, Rage Strike', '1 small orange flash at the chest, 2-3 a star-shaped impact burst grows with flying debris, 4-5 shockwave ring expands on the ground, 6-8 dust puffs and fading sparks'),
    ('firebolt', 'ลูกไฟ', 'Fire Rune', '1-3 a flaming bolt falls from above onto the target, 4 it explodes at the body in a fireball, 5-6 flames burst upward, 7-8 embers and smoke fade'),
    ('coldbolt', 'ลูกน้ำแข็ง', 'Ice Rune', '1-3 sharp ice shards fall from above, 4 they shatter on the target, 5-6 an ice crystal cluster forms around the feet, 7-8 frost mist and glitter fade'),
    ('lightning', 'สายฟ้า', 'Thunder Rune', '1 dark cloud spark above the head, 2-3 a jagged yellow-white lightning bolt strikes down onto the target, 4-5 electric arcs crawl around the body, 6-8 small sparks fade'),
    ('holy', 'แสงศักดิ์สิทธิ์', 'Holy Spear, Light of Freyja (โจมตี)', '1 a thin golden ray from above, 2-3 a bright pillar of light with a cross-shaped flare hits the target, 4-5 feathers of light scatter, 6-8 golden sparkles drift up and fade'),
    ('heal', 'ฮีล', 'First Aid, Light of Freyja', '1 a soft green circle on the ground, 2-4 green plus-shaped sparkles and light rise around the body, 5-6 a bright soft glow at the chest, 7-8 sparkles float up and fade'),
    ('buff', 'บัฟ', 'War Cry, Blessing of Odin, Blood Frenzy', '1 a golden rune circle on the ground, 2-4 golden light spirals up around the body, 5-6 a flash of runes above the head, 7-8 glitter fades'),
    ('whirl', 'หมุนรอบตัว', 'Whirlwind', '1-6 a wide circular blade-wind ring spins around the character at waist height, getting bigger, with cut lines and leaves, 7-8 it fades'),
    ('howl', 'คำราม', 'Howl', '1-5 red-orange sound wave rings burst outward from the character, 6-8 rings fade with a few cracks on the ground'),
    ('shout', 'ตะโกนเรียก', 'War Cry (ยั่วมอน)', '1-4 red jagged shout lines burst out from the head, 5-8 they fade outward'),
    ('arrow', 'ลูกธนูโดน', 'Piercing Arrow (ตอนโดน)', '1 a small bright impact point at the chest, 2-3 a piercing streak of light shoots through the body, 4-5 sparks and splinters, 6-8 fade'),
    ('hit', 'ตีโดน (ปกติ)', 'การโจมตีปกติ', '1-2 a small white impact star at the chest, 3-4 it pops into tiny sparks, 5-8 sparks fade (very short and small)'),
    ('crit', 'ตีคริติคอล', 'การโจมตีปกติที่ติดคริ', '1-2 a big yellow-red impact star with a burst, 3-4 sharp light rays shoot out, 5-8 sparks and fade'),
]


# ---------------- เสียง (ไม่บังคับ: เกมมีเสียงสังเคราะห์ใช้อยู่แล้ว ไฟล์จริงจะใช้แทนเมื่อติดตั้ง) ----------------
SFX_STYLE = "Retro 2000s Korean MMORPG game sound effect, clean, punchy, no music, no voice, mono, "
SOUNDS = [
    # ชื่อ, ไทย, prompt (ElevenLabs Sound Effects), วินาที
    ('hit', 'ฟันโดนมอน', 'short dagger slash hitting a small robot, crisp metallic impact with a soft thump', 0.5),
    ('crit', 'คริติคอล', 'heavy critical sword strike on metal armor, loud clang with a short ring', 0.8),
    ('swing', 'ฟันลม (พลาด)', 'quick light dagger swoosh through the air', 0.4),
    ('bow', 'ยิงธนู', 'bow string release and arrow whoosh', 0.5),
    ('hurt', 'ผู้เล่นโดนตี', 'dull punch impact on a small android body, short servo whine', 0.5),
    ('stun', 'โดนมึน', 'cartoon dizzy stun hit, thud followed by little birds chirping', 1.0),
    ('kill', 'มอนพัง', 'small robot breaking apart, pop and scattered metal bits', 0.8),
    ('die', 'ผู้เล่นตาย', 'android powering down, descending electronic whine fading out', 1.5),
    ('skill', 'เริ่มใช้สกิล', 'short magical cast start, rising shimmer', 0.5),
    ('magic', 'ลูกพลังงาน', 'energy orb launched, glowing magic whoosh', 0.7),
    ('fire', 'สกิลไฟ', 'fire bolt spell, whoosh of flame and a small burst', 0.8),
    ('ice', 'สกิลน้ำแข็ง', 'ice spell, crystals forming and shattering glassy chime', 0.8),
    ('zap', 'สกิลสายฟ้า', 'lightning bolt spell, sharp electric crack', 0.8),
    ('holy', 'สกิลแสง', 'holy light spell, bright bell chime with sparkle', 1.0),
    ('heal', 'ฮีล', 'healing spell, gentle rising chimes and sparkles', 1.2),
    ('buff', 'บัฟ', 'power up buff, rising whoosh ending with a chime', 1.0),
    ('warp', 'วาร์ป/ปีก', 'teleport warp, swirling magical sweep upward', 1.0),
    ('potion', 'ดื่มยา', 'drinking a potion, two quick gulps and a small sparkle', 0.8),
    ('pickup', 'เก็บของ', 'item pickup, two short bright blips', 0.4),
    ('buy', 'ซื้อ/ขาย', 'coins jingling, short shop purchase', 0.6),
    ('equip', 'สวมอุปกรณ์', 'equipping metal armor piece, short clink', 0.5),
    ('click', 'ปุ่ม', 'soft UI button click', 0.2),
    ('storage', 'เปิดคลัง', 'opening a small metal storage crate', 0.5),
    ('emote', 'อีโมต', 'cute pop sound for a speech bubble', 0.3),
    ('refine_ok', 'ตีบวกสำเร็จ', 'hammer on anvil followed by a bright success jingle', 1.5),
    ('refine_fail', 'ตีบวกพัง', 'metal cracking and breaking, failure', 1.2),
    ('levelup', 'เลเวลอัป', 'level up fanfare, short bright ascending arpeggio with sparkles', 2.0),
    ('mvp', 'ล้ม MVP', 'boss defeated victory fanfare, short brass and chimes', 3.0),
    ('quest', 'เควสต์สำเร็จ', 'quest complete jingle, short and cheerful', 1.5),
    ('quest_new', 'ได้เควสต์ใหม่', 'new quest notification, two soft chimes', 0.6),
]
BGM_STYLE = ("Instrumental background music for a cute 2000s Korean fantasy MMORPG like Ragnarok Online, "
             "seamless loop, no vocals, 2 to 3 minutes. ")
BGMS = [
    ('town', 'เมือง Neo Eldheim', 'Peaceful high-tech Norse city: warm accordion and flute melody, light strings, gentle percussion, cheerful and cozy, 104 BPM, major key.'),
    ('field', 'ทุ่งหญ้ามรกต', 'Adventure on a sunny meadow: bright flute lead, plucked strings, light marching drums, hopeful, 116 BPM, major key.'),
    ('lake', 'ทะเลสาบหมอก', 'Calm misty lake: soft piano, harp arpeggios, airy pads, slow and dreamy, 78 BPM.'),
    ('forest', 'ป่าหมาป่า', 'Mysterious forest: wooden flute, dulcimer, soft hand drums, slightly mysterious dorian mood, 94 BPM.'),
    ('cave', 'ถ้ำเฮล', 'Dark underground cave: low drones, bell melody, deep slow drums, eerie but not scary, 68 BPM, minor key.'),
]


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
    chats = []
    for c in CHARS:
        miss = [sh for sh, *_ in SHEETS if not char_done(c[0], sh)]
        if not miss: continue
        if len(miss) == 1:
            txt = char_prompt(c, miss[0]); how = f"แนบ ภาพเดินของตัวนี้ + {TPL[miss[0]]}"
        else:
            txt = chat_starter(c, miss); how = f"แชตใหม่ • แนบ {c[2]} + {TPL[miss[0]]} • จากนั้นพิมพ์ next + แนบเทมเพลตของภาพถัดไป ({', '.join(TPL[m] for m in miss[1:])})"
        chats.append((c[1], how, txt, len(miss), c[2], [TPL[m] for m in miss]))
    mobs_left = [m for m in MOBS if f'anim_mob_{m[0]}_walk' not in HAVE]
    if mobs_left:
        chats.append(('มอนสเตอร์ทั้งหมด', f'แชตใหม่ • แนบ mobsprite ของตัวที่ 1 ({mobs_left[0][1]}) + tpl_mob.png • จากนั้นพิมพ์ next + แนบ mobsprite ตัวถัดไป + tpl_mob.png', mob_starter(mobs_left), len(mobs_left), f'mobsprite_{mobs_left[0][0]}.webp', ['tpl_mob.png']))
    L += ['## แบบแชต (วางครั้งเดียวต่อแชต แล้วพิมพ์ next)', '']
    for th, how, txt, n, ref, tpls in chats:
        L += [f'### {th} — {n} ภาพ', '', how, '', '```', txt, '```', '']
        items.append({'group': 'แชตสั่งภาพ (แบบ next)', 'key': 'chat_' + th, 'sheet': 'chat', 'title': f'{th} — {n} ภาพ', 'attach': [ref] + tpls, 'done': False, 'prompt': txt, 'how': how})
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
    L += ['## เอฟเฟกต์สกิล (แบบ RO)', '',
          'แต่ละเอฟเฟกต์ = 1 ภาพ 8 เฟรม แนบ `tpl_fx.png` (พื้นดำ) • ไม่มีภาพเกมใช้เอฟเฟกต์ที่วาดด้วยโค้ดแทน • ติดตั้ง: `python3 tools/sprite_std.py fx <ภาพ> <ชื่อ>`', '']
    for name, th, used, frames in EFFECTS:
        done = 'fx_' + name in HAVE
        txt = FX_STYLE + 'Effect: ' + frames + '.'
        L += [f"{'✅' if done else '⬜'} **{th}** (`fx_{name}`) — ใช้กับ {used}", '']
        if not done: L += ['```', txt, '```', '']
        items.append({'group': 'เอฟเฟกต์สกิล (แบบ RO)', 'key': 'fx_' + name, 'sheet': 'fx', 'title': f'{th} • fx_{name}', 'attach': ['tpl_fx.png'], 'done': done, 'prompt': txt, 'how': f'ใช้กับ {used}'})
    L += ['## เสียง (ไม่บังคับ)', '',
          'เกมมีเสียงที่สร้างด้วยโค้ดใช้อยู่แล้ว ไฟล์เสียงจริงที่ส่งมาจะใช้แทนทีละเสียง',
          'เสียงเอฟเฟกต์: ElevenLabs → Sound Effects (ตั้งความยาวตามที่บอก) • เพลง: Suno (เลือก Instrumental)', '']
    for name, th, prm, sec in SOUNDS:
        done = 'sfx_' + name in HAVE
        txt = SFX_STYLE + prm + '.'
        L += [f"{'✅' if done else '⬜'} **{th}** → ตั้งชื่อไฟล์ `sfx_{name}.mp3` • ยาว {sec} วินาที", '']
        if not done: L += ['```', txt, '```', '']
        items.append({'group': 'เสียงเอฟเฟกต์ (ElevenLabs)', 'key': 'sfx_' + name, 'sheet': 'sfx', 'title': f'{th} • sfx_{name} • {sec} วิ', 'attach': [], 'done': done, 'prompt': txt})
    for name, th, prm in BGMS:
        done = 'bgm_' + name in HAVE
        txt = BGM_STYLE + prm
        L += [f"{'✅' if done else '⬜'} **เพลง{th}** → ตั้งชื่อไฟล์ `bgm_{name}.mp3`", '']
        if not done: L += ['```', txt, '```', '']
        items.append({'group': 'เพลงประกอบ (Suno)', 'key': 'bgm_' + name, 'sheet': 'bgm', 'title': f'{th} • bgm_{name}', 'attach': [], 'done': done, 'prompt': txt})
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
let filter = 'chat';
const store = { get(k) { try { return JSON.parse(localStorage.getItem('pn_sent') || '{}')[k]; } catch (e) { return false; } },
  set(k, v) { try { const o = JSON.parse(localStorage.getItem('pn_sent') || '{}'); o[k] = v; localStorage.setItem('pn_sent', JSON.stringify(o)); } catch (e) {} } };
function el(t, a = {}, ...kids) { const e = document.createElement(t); for (const k in a) { if (k === 'class') e.className = a[k]; else if (k.startsWith('on')) e.addEventListener(k.slice(2), a[k]); else e.setAttribute(k, a[k]); } for (const c of kids.flat()) if (c != null) e.append(c); return e; }
function copy(txt, btn) {
  const done = () => { btn.textContent = 'คัดลอกแล้ว ✓'; setTimeout(() => btn.textContent = 'คัดลอก prompt', 1400); };
  const fb = () => { const pre = btn.closest('.card').querySelector('pre'); const r = document.createRange(); r.selectNodeContents(pre); const s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = 'เลือกข้อความแล้ว — กดคัดลอก'; };
  try { navigator.clipboard.writeText(txt).then(done, fb); } catch (e) { fb(); }
}
function render() {
  const todo = DATA.filter(d => !d.done && !['chat', 'sfx', 'bgm'].includes(d.sheet)).length, sent = DATA.filter(d => !d.done && store.get(d.key + ':' + d.sheet)).length;
  $('#sum').innerHTML = `ยังขาด <b>${todo}</b> ภาพ • ส่งไปแล้ว (ในเครื่องนี้) ${sent} • ติดตั้งแล้ว ${DATA.filter(d => d.done).length}`;
  const bar = $('#bar'); bar.innerHTML = '';
  for (const [k, l] of [['chat', 'แบบแชต (next)'], ['todo', 'ที่ยังขาด'], ['all', 'ทั้งหมด'], ['char', 'ตัวละคร'], ['mob', 'มอนสเตอร์'], ['npc', 'NPC'], ['fx', 'เอฟเฟกต์'], ['snd', 'เสียง']]) bar.append(el('button', { class: filter === k ? 'on' : '', onclick: () => { filter = k; render(); } }, l));
  const list = $('#list'); list.innerHTML = '';
  const groups = {};
  for (const d of DATA) {
    const kind = d.sheet === 'chat' ? 'chat' : d.sheet === 'mob' ? 'mob' : d.sheet === 'npc' ? 'npc' : d.sheet === 'sfx' || d.sheet === 'bgm' ? 'snd' : d.sheet === 'fx' ? 'fx' : 'char';
    if (filter === 'todo' && d.done) continue;
    if (['char', 'mob', 'npc', 'chat', 'snd', 'fx'].includes(filter) && kind !== filter) continue;
    if (filter === 'todo' && (kind === 'chat' || kind === 'snd')) continue;
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
      const att = !d.attach.length ? null : el('div', { class: 'att' }, 'แนบ:', ...d.attach.map(a => IMG[a] ? el('figure', {}, el('img', { src: IMG[a], alt: a, class: a.startsWith('tpl_') ? '' : 'ref', loading: 'lazy' }), el('span', {}, a)) : el('span', { class: 'txt' }, a)));
      const cb = el('input', { type: 'checkbox' }); cb.checked = !!sent; cb.addEventListener('change', () => { store.set(id, cb.checked); render(); });
      cards.append(el('div', { class: 'card' + (d.done ? ' done' : '') },
        el('div', { class: 'hd' }, el('b', {}, d.title), el('span', { class: 'chip ' + (d.done ? 'ok' : 'todo') }, d.done ? 'ติดตั้งแล้ว' : sent ? 'ส่งแล้ว รอติดตั้ง' : 'ยังขาด')),
        d.how ? el('div', { class: 'hint' }, d.how) : null, att, el('pre', {}, d.prompt),
        el('div', { class: 'acts' }, el('button', { onclick: e => copy(d.prompt, e.target) }, 'คัดลอก prompt'), d.done ? null : el('label', {}, cb, d.sheet === 'sfx' || d.sheet === 'bgm' ? 'สร้างแล้ว' : 'ส่งให้ ChatGPT แล้ว'))));
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
