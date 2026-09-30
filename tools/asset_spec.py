# -*- coding: utf-8 -*-
"""สเปกชีตภาพ (ไอคอนสกิล/ไอเทม/ตราคลาส/หน้ามอนสเตอร์) — ใช้ทั้งสร้าง prompt และตัดชีต
แต่ละชีต: file, cols, rows, mode ('alpha' = พื้นโปร่งใส ครอปตามขอบวัตถุ, 'tile' = ภาพเต็มช่อง), cells = [(key, คำบรรยายภาษาอังกฤษ)]"""

SKILL_STYLE = ("Game skill icon sheet for an anime sci-fi Norse RPG called NEO MIDGARD (android heroes). "
 "Each icon is a square painted tile that fills its whole cell edge to edge with its own dark atmospheric background and a bold, glowing, easy-to-read central symbol or action; "
 "cel-shaded, crisp lineart, strong rim light, high contrast so it reads at 40 pixels. No characters' faces, no text, no numbers, no letters, no frames or borders. "
 "Separate the tiles with thin straight black gutters so the grid is perfectly even.")
ITEM_STYLE = ("Game inventory item icon sheet for an anime sci-fi Norse RPG called NEO MIDGARD (a world of androids and robots, items are tech parts). "
 "Each item is a single object centered in its own equal cell with generous empty space around it, on a FULLY TRANSPARENT background (PNG), "
 "cel-shaded, crisp dark outline, soft glow accents, readable at 32 pixels, three-quarter view, consistent lighting from the top-left. "
 "No text, no numbers, no letters, no grid lines, no frames, no shadows on the ground, objects must not touch or overlap each other.")
EMBLEM_STYLE = ("Class emblem icon sheet for an anime sci-fi Norse RPG called NEO MIDGARD. Each emblem is a metallic badge (silver steel with a glowing colored core and Norse rune accents), "
 "centered in its own equal cell with empty space around it, on a FULLY TRANSPARENT background (PNG), same size and same style for all. No text, no letters, no grid lines.")
MOB_STYLE = ("Monster portrait sheet for an anime sci-fi Norse RPG called NEO MIDGARD where every monster is a humanoid ANDROID robot (no animals, no humans). "
 "FACE RULE: every head has a smooth metal faceplate with a glowing visor strip — NO eyes, NO pupils, NO mouth. Hostile units have red or colored glowing visors. "
 "Each cell is a square bust portrait (head and shoulders, facing slightly left) that fills its whole cell with a dark moody background tinted in the monster's glow color, "
 "cel-shaded anime gacha style, crisp lineart, rim light. Separate the tiles with thin straight black gutters so the grid is perfectly even. No text, no letters, no frames.")

SPRITE_STYLE = ("In-game monster sprite sheet for a cute classic 2000s Korean MMORPG style game (chibi, round, readable silhouettes, like classic isometric MMO field monsters), "
 "but every monster is a ROBOT / mechanical version of the creature: glossy painted metal shell, visible bolts and panel lines, small glowing core lights, antennas, tiny thrusters. "
 "Each monster is a single full-body creature in its own equal cell, 3/4 view FACING LEFT, standing on the ground, centered with empty space around it, "
 "on a FULLY TRANSPARENT background (PNG). Cel-shaded anime game art, crisp dark outline, soft glossy highlights, readable at 64 pixels tall. "
 "No text, no grid lines, no frames, no ground shadow, creatures must not touch each other.")
ACTOR_SHEETS = [
 ("sheet_npcs_1.png", [
  ("npcsprite_bifrost", "Bifrost Keeper: calm feminine android, long lavender hair plates, navy robe with gold trim, a small rainbow ring floating behind her head"),
  ("npcsprite_jobmaster", "Mimir AI: ancient sage android, white hood over navy robe, silver plate-beard, holding a glowing rune tablet staff"),
  ("npcsprite_tool", "Tool Dealer: cheerful merchant android, silver hair, red bandana, khaki apron full of pockets, holding a repair kit"),
  ("npcsprite_weapon", "Weapon Dealer: gruff bulky smith android, spiky black hair plates, grey armor, soot-stained apron, holding up a glowing sword"),
 ]),
 ("sheet_npcs_2.png", [
  ("npcsprite_armor", "Armor Dealer: friendly feminine android, mint twin-tail hair plates, cream and green robe, showing a shiny chest plate"),
  ("npcsprite_refine", "Brokk Forge-Bot: stocky bronze dwarf robot, bronze helmet, red plate-beard, glowing orange furnace in chest, huge forge hammer"),
  ("npcsprite_nurse", "Eir Repair Unit: kind nurse android, long pink hair plates, white and pink medical outfit, nurse cap with a cross, holding a glowing repair tool"),
  ("npcsprite_guide", "Guard Unit Rolf: city guard android, silver-white armor, horned viking helmet, red cape, tall energy spear, saluting"),
 ]),
 ("sheet_heroes_1.png", [
  ("hero_novice_f", "Novice Type-A (slim feminine frame): white and graphite body, khaki utility jacket, silver-white long hair plates, cyan visor, small knife"),
  ("hero_novice_m", "Novice Type-B (sturdy masculine frame): white and graphite body, khaki utility jacket, short silver hair plates, cyan visor, small knife"),
  ("hero_einherjar_f", "Einherjar Type-A: heavy steel plate armor with red trim, crimson cape, horned helmet, energy sword and round shield, red visor"),
  ("hero_einherjar_m", "Einherjar Type-B: bulkier steel plate armor with red trim, crimson cape, horned helmet, energy sword and shield, red visor"),
 ]),
 ("sheet_heroes_2.png", [
  ("hero_runecaster_f", "Rune Caster Type-A: navy hooded coat with glowing blue runes, long deep blue hair plates, staff with floating cyan orb, light-blue visor"),
  ("hero_runecaster_m", "Rune Caster Type-B: navy hooded coat with glowing runes, short blue hair plates, rune staff, light-blue visor"),
  ("hero_wildhunter_f", "Wildhunter Type-A: forest green hooded cloak, gold braid hair plates, energy longbow and quiver, green visor"),
  ("hero_wildhunter_m", "Wildhunter Type-B: forest green hooded cloak, short gold hair plates, energy longbow and quiver, green visor"),
 ]),
 ("sheet_heroes_3.png", [
  ("hero_volva_f", "Völva Type-A: white and gold flowing robe, very long black hair plates, gold circlet with blue gem, golden scepter-mace, gold visor"),
  ("hero_volva_m", "Völva Type-B: white and gold robe with gold armor pieces, shoulder-length black hair plates, gold circlet, golden scepter, gold visor"),
  ("hero_trickster_f", "Loki's Trickster Type-A: sleek dark purple stealth armor, crimson ponytail of cable hair, twin violet daggers, violet visor"),
  ("hero_trickster_m", "Loki's Trickster Type-B: dark purple stealth armor, short spiky crimson hair plates, twin violet daggers, violet visor"),
 ]),
 ("sheet_heroes_4.png", [
  ("hero_berserker_f", "Berserker Type-A: bronze and brown rugged armor, metal wolf-head hood, long wild silver hair plates, huge two-handed orange energy axe, orange visor"),
  ("hero_berserker_m", "Berserker Type-B: bulky bronze and brown armor, metal wolf-head hood, short spiky silver hair plates, huge orange energy axe, orange visor"),
  ("hero_blank1", "a spare: a small hovering delivery drone"),
  ("hero_blank2", "a spare: a small repair bot on wheels"),
 ]),
]
PROP_STYLE = ("Environment prop sprite sheet for a cute classic 2000s Korean MMORPG style isometric game, sci-fi Norse android world. Each prop is a single object in 3/4 top-down view (camera looking down at about 45 degrees) "
 "centered in its own equal cell with empty space around it, on a FULLY TRANSPARENT background (PNG). Painterly cel-shaded game art, crisp outline, consistent lighting from top-left. "
 "No text, no grid lines, no frames, no ground shadow, objects must not touch.")
PROP_SHEETS = [
 ("sheet_props_1.png", [("prop_tree_round", "a round leafy green tree with a brown trunk, slightly stylized"), ("prop_tree_pine", "a tall dark green pine tree"), ("prop_bush", "a small round green bush with tiny flowers"), ("prop_rock", "a grey mossy boulder")]),
 ("sheet_props_2.png", [("prop_pylon", "a slim metal energy pylon with a glowing cyan tip"), ("prop_crate", "a stack of two metal cargo crates with warning stripes"), ("prop_scrap", "a small pile of rusted scrap robot parts"), ("prop_crystal", "a cluster of glowing purple crystals")]),
 ("sheet_props_3.png", [("prop_mushroom", "a cluster of glowing green mushrooms"), ("prop_lamp", "a sci-fi street lamp post with a cyan light"), ("prop_fountain", "a round plaza fountain with a glowing blue energy core column in the middle"), ("prop_sign", "a holographic neon shop sign on a pole")]),
 ("sheet_buildings.png", [("prop_bld_shop", "a small sci-fi Norse shop building with a curved metal roof and a neon sign, front entrance facing down-left"), ("prop_bld_forge", "a forge workshop building with a chimney glowing orange and an anvil sign"), ("prop_bld_house", "a two-story metal-and-wood longhouse with rune carvings and cyan light strips"), ("prop_bld_tower", "a tall tech tower with a glowing rune ring near the top")]),
]
# ---------------- สไปรต์ NPC / ผู้เล่น / ฉาก (ตัวจริงในเกม) ----------------
ACTOR_STYLE = ("In-game character sprite sheet for a cute classic 2000s Korean MMORPG style game (chibi proportions: big head, about 2.5 heads tall, round readable silhouette, like classic isometric MMO player sprites), "
 "sci-fi Norse world where every character is a humanoid ANDROID. FACE RULE: smooth glossy metal faceplate with ONE glowing visor strip — NO eyes, NO mouth. "
 "'Hair' is layered synthetic metal plates. Each character is a single full-body figure standing in 3/4 view FACING LEFT, centered in its own equal cell with empty space around it, "
 "on a FULLY TRANSPARENT background (PNG). Cel-shaded anime game art, crisp dark outline, glossy highlights, readable at 64 pixels tall. No text, no grid lines, no frames, no ground shadow, figures must not touch.")
SPRITE_SHEETS = [
 ("sheet_monsters_1.png", [
  ("mobsprite_pudding", "a small bouncy PINK jelly-slime robot: round gummy dome body of glossy pink translucent gel over a metal core, tiny antenna with a light, happy expression made of two small glowing dots"),
  ("mobsprite_leafworm", "a chubby GREEN caterpillar robot: segmented rounded metal body sections, stubby little legs, leaf-shaped antenna, cute"),
  ("mobsprite_moonbun", "a fluffy WHITE rabbit robot: round white metal body, very tall floppy metal ears with pink inner panels, tiny carrot-orange nose light"),
  ("mobsprite_ember_pudding", "a small bouncy ORANGE jelly-slime robot with a tiny flame flickering on its antenna, warm glowing core"),
 ]),
 ("sheet_monsters_2.png", [
  ("mobsprite_buzzfly", "a round black-and-yellow striped robot bee drone with transparent buzzing wings, a small stinger and a big single sensor light"),
  ("mobsprite_stumpling", "a walking rusty TREE-STUMP robot: bark made of rusted metal plates, root-like mechanical legs, a few leaves and wires on top, grumpy"),
  ("mobsprite_fiddlehopper", "a green GRASSHOPPER robot standing upright on its back legs holding a tiny violin, spring-loaded legs"),
  ("mobsprite_capshroom", "a walking MUSHROOM robot: big red cap with white spots made of metal, stubby legs, a small red warning light like a mine"),
 ]),
 ("sheet_monsters_3.png", [
  ("mobsprite_moss_pudding", "a small bouncy GREEN jelly-slime robot with moss and a tiny four-leaf clover growing on top"),
  ("mobsprite_seraph_pudding", "BOSS: a large bouncy golden-white jelly-slime robot with small mechanical angel wings, a golden halo floating above, regal and cute"),
  ("mobsprite_ashtail", "a sly grey RACCOON / fox robot on four legs with a big fluffy striped metal tail"),
  ("mobsprite_fenrir_pup", "a silver WOLF robot on four legs, sharp metal fur plates, glowing cyan eyes-light, snarling"),
 ]),
 ("sheet_monsters_4.png", [
  ("mobsprite_mossback", "a big heavy BEAR robot on four legs with mossy bronze armor plates and plants growing on its back"),
  ("mobsprite_tuskboar", "an armored WILD BOAR robot on four legs with big iron tusks and a dark brown plated hide"),
  ("mobsprite_draugr", "a shambling ZOMBIE-like rusted humanoid robot wearing a battered horned viking helmet, torn cloth, holding a rusty axe, one red visor light"),
  ("mobsprite_bone_warden", "a SKELETON robot: white bone-like metal frame with exposed ribs, holding a sword and small round shield, red visor light"),
 ]),
 ("sheet_monsters_5.png", [
  ("mobsprite_hel_maiden", "a floating GHOST-like robot: a hooded navy cloak with no legs, pale metal face mask with a teal visor light, holding a lantern"),
  ("mobsprite_hel_guard", "a hulking dark ARMOR KNIGHT robot with horned helmet, dark red cape and a big axe, red visor light"),
  ("mobsprite_kitsura", "BOSS: an elegant fox-eared android lady with long orange metal hair and NINE long mechanical fox tails fanned out behind her, orange V visor, graceful pose"),
  ("mobsprite_blank", "a small pile of scrap metal parts (spare)"),
 ]),
]
SHEETS = [
 dict(file="sheet_skills_0.png", cols=2, rows=1, mode="tile", style=SKILL_STYLE, group="ไอคอนสกิล", cells=[
  ("skill_first_aid", "First Aid: a white repair kit case with a glowing green cross and a small wrench"),
  ("skill_basic_training", "Basic Training: a clenched mechanical fist with a cyan upward arrow of power"),
 ]),
 dict(file="sheet_skills_1.png", cols=4, rows=2, mode="tile", style=SKILL_STYLE, group="ไอคอนสกิล", cells=[
  ("skill_iron_body", "Iron Body: a steel android chest armor glowing with orange-red reinforcement plates and a shield aura"),
  ("skill_shield_slam", "Shield Slam: a round tech shield smashing forward with a red impact shockwave and stars of stun"),
  ("skill_war_cry", "War Cry: a horned Viking tech helmet with red sound waves blasting outward"),
  ("skill_whirlwind", "Whirlwind: a glowing red energy sword spinning in a circular slash vortex"),
  ("skill_rune_mastery", "Rune Mastery: an open glowing blue rune tablet with floating Norse runes orbiting it"),
  ("skill_fire_rune", "Fire Rune: a Norse fire rune carved in blazing orange flame with embers"),
  ("skill_ice_rune", "Ice Rune: a sharp ice lance crystal with a blue frost rune and snow sparkles"),
  ("skill_thunder_rune", "Thunder Rune: Thor's lightning striking down from a yellow-white rune with electric arcs"),
 ]),
 dict(file="sheet_skills_2.png", cols=4, rows=2, mode="tile", style=SKILL_STYLE, group="ไอคอนสกิล", cells=[
  ("skill_eagle_eye", "Eagle Eye: a metal eagle head with a green targeting reticle and scope lines"),
  ("skill_piercing_arrow", "Piercing Arrow: a green energy arrow shooting straight through three targets in a line with speed streaks"),
  ("skill_wolf_companion", "Wolf Companion: a howling robot wolf head made of metal plates with green glowing lines"),
  ("skill_blast_trap", "Blast Trap: a small spiked mine device on the ground mid-explosion with orange fire"),
  ("skill_sanctuary", "Sanctuary: a soft golden holy dome of light with a green plus sign glowing inside"),
  ("skill_light_of_freyja", "Light of Freyja: a golden flower-shaped burst of healing light with sparkles descending"),
  ("skill_blessing_of_odin", "Blessing of Odin: a golden valknut triangle symbol with rising gold light and an upward arrow"),
  ("skill_holy_spear", "Holy Spear: a radiant white-gold spear of light plunging downward with holy rays"),
 ]),
 dict(file="sheet_skills_3.png", cols=4, rows=2, mode="tile", style=SKILL_STYLE, group="ไอคอนสกิล", cells=[
  ("skill_shadow_step", "Shadow Step: a violet afterimage silhouette of a dashing foot/boot leaving purple shadow trails"),
  ("skill_backstab", "Backstab: a violet energy dagger stabbing from behind with a critical slash flash"),
  ("skill_smoke_veil", "Smoke Veil: swirling dark purple smoke cloud hiding a faint figure outline"),
  ("skill_venom_blade", "Venom Blade: a dagger dripping glowing green poison with toxic bubbles"),
  ("skill_wolf_blood", "Wolf Blood: a red glowing drop of energy blood in front of a snarling metal wolf silhouette"),
  ("skill_rage_strike", "Rage Strike: a huge orange energy axe crashing down with a cracked-ground red shockwave"),
  ("skill_blood_frenzy", "Blood Frenzy: a burning red heart-shaped power core with speed lines and orange flames"),
  ("skill_howl", "Howl: a metal wolf head howling upward with circular orange-red sound waves"),
 ]),
 dict(file="sheet_items_1.png", cols=4, rows=4, mode="alpha", style=ITEM_STYLE, group="ไอคอนไอเทม", cells=[
  ("item_red_potion", "a small red repair kit: compact red medical canister with a white cross"),
  ("item_orange_potion", "a medium orange repair kit canister with a white cross"),
  ("item_yellow_potion", "a large yellow repair kit canister with a white cross"),
  ("item_white_potion", "an extra-large white-and-silver repair kit case with a glowing cross"),
  ("item_blue_potion", "a blue glowing energy cell battery"),
  ("item_apple", "a small oil can with a spout, amber oil drop"),
  ("item_carrot", "a bottle of glowing cyan coolant liquid"),
  ("item_meat", "a tube of silver nano repair paste"),
  ("item_grape", "a small purple charge chip with glowing contacts"),
  ("item_green_herb", "a green antivirus patch sticker with a shield symbol"),
  ("item_red_herb", "a roll of red repair tape"),
  ("item_mead", "a glass flask of fizzing golden overclock brew with lightning sparks"),
  ("item_blink_feather", "a teal warp chip with a swirling portal glow"),
  ("item_hearth_rune", "a small homing beacon device with a blue light and a Norse rune"),
  ("item_card", "a rectangular data chip card with gold contacts and a glowing circuit pattern"),
  ("item_zeny", "a small stack of silver credit coins with cyan edges"),
 ]),
 dict(file="sheet_items_2.png", cols=4, rows=4, mode="alpha", style=ITEM_STYLE, group="ไอคอนไอเทม", cells=[
  ("item_jelly_drop", "a pink glowing gel cell capsule"),
  ("item_leaf_silk", "a coil of copper wire"),
  ("item_clover", "a tiny green micro chip"),
  ("item_moon_fur", "a folded piece of silver metal mesh"),
  ("item_buzz_wing", "a black-and-yellow drone rotor blade"),
  ("item_ember_jelly", "an orange finned heat sink"),
  ("item_moss_gel", "a green blob of sticky bio gel in a small dish"),
  ("item_hopper_leg", "a green metal spring coil leg part"),
  ("item_living_bark", "a rusty scrap metal plate with bolts"),
  ("item_cap_spore", "a red detonator device with a small antenna"),
  ("item_ash_tail", "a grey cylindrical ash filter"),
  ("item_fenrir_fang", "a silver metal wolf fang with a cyan edge"),
  ("item_moss_hide", "a heavy armored hide plate, bronze and mossy green"),
  ("item_iron_tusk", "a curved iron tusk"),
  ("item_grave_dust", "a small pouch spilling brown rust dust"),
  ("item_old_bone", "an old white metal frame bone strut"),
 ]),
 dict(file="sheet_items_3.png", cols=4, rows=4, mode="alpha", style=ITEM_STYLE, group="ไอคอนไอเทม", cells=[
  ("item_hel_lantern", "a small lantern containing a teal digital soul flame"),
  ("item_cursed_seal", "a black chip with a glowing red cursed rune"),
  ("item_yggdrasil_shard", "a glowing golden-green crystal energy core shaped like a tree seed, very precious"),
  ("item_knife", "a plain short knife with a cyan energy edge"),
  ("item_cutter", "a sharp box-cutter style blade with a glowing edge"),
  ("item_main_gauche", "a parrying dagger with a hand guard"),
  ("item_stiletto", "a long thin stiletto dagger"),
  ("item_loki_fang", "a violet curved dagger shaped like a fang with green glow"),
  ("item_sword", "a basic one-handed sword with a cyan energy edge"),
  ("item_falchion", "a curved falchion sword"),
  ("item_broadsword", "a wide broadsword"),
  ("item_valhalla_blade", "an ornate golden-red knight sword with wings on the guard"),
  ("item_hand_axe", "a one-handed hand axe with an orange energy edge"),
  ("item_battle_axe", "a large double-bladed battle axe"),
  ("item_ulfr_axe", "a bronze wolf-head axe with a glowing orange edge"),
  ("item_rod", "a simple energy rod topped with a small cyan orb"),
 ]),
 dict(file="sheet_items_4.png", cols=4, rows=4, mode="alpha", style=ITEM_STYLE, group="ไอคอนไอเทม", cells=[
  ("item_rune_staff", "a staff engraved with glowing blue runes"),
  ("item_seer_staff", "a white-and-gold seer staff with a floating crystal"),
  ("item_bow", "a simple bow with a glowing green string"),
  ("item_composite_bow", "a recurve composite bow of metal and wood"),
  ("item_great_bow", "a large heavy tech longbow"),
  ("item_ullr_bow", "an elegant silver-green bow with rune carvings and leaf motifs"),
  ("item_club", "a simple metal club"),
  ("item_mace", "an iron flanged mace"),
  ("item_morning_star", "a spiked morning star mace with a glowing core"),
  ("item_emberfang", "a legendary fiery orange dagger shaped like a fox fang with flames"),
  ("item_cotton_shirt", "a basic white chest plating armor piece"),
  ("item_leather_vest", "a light brown-and-grey chest plating vest"),
  ("item_silk_robe", "a folded navy nano robe with glowing lines"),
  ("item_chain_mail", "a metal mesh chain armor"),
  ("item_plate_armor", "a heavy titanium plate chest armor with red trim"),
  ("item_hat", "a small sensor cap with an antenna"),
 ]),
 dict(file="sheet_items_5.png", cols=4, rows=4, mode="alpha", style=ITEM_STYLE, group="ไอคอนไอเทม", cells=[
  ("item_ribbon", "a signal ribbon hair accessory with a glowing node"),
  ("item_iron_helm", "an iron helmet"),
  ("item_seraph_wings", "a pair of small white-gold mechanical angel wing head ornaments"),
  ("item_guard", "a small round wooden-and-metal shield"),
  ("item_round_shield", "a round energy buckler with a cyan hexagon shield field"),
  ("item_hood", "a folded dark hood"),
  ("item_muffler", "a cable scarf made of braided wires"),
  ("item_sandals", "a pair of hover pads (flat glowing foot pads)"),
  ("item_shoes", "a pair of servo boots"),
  ("item_boots", "a pair of heavy magnetic boots"),
  ("item_clip", "a small hair clip with a data slot"),
  ("item_ring", "a power ring with a red gem"),
  ("item_earring", "a signal earring with a blue antenna crystal"),
  ("item_glove", "a mechanical grip glove"),
  ("item_rune_charm", "a rune charm pendant with a glowing rune stone"),
  ("item_gift", "a small wrapped supply crate with a cyan ribbon"),
 ]),
 dict(file="sheet_emblems.png", cols=4, rows=2, mode="alpha", style=EMBLEM_STYLE, group="ตราคลาส", cells=[
  ("emblem_novice", "Novice: a simple silver hexagon badge with a cyan core"),
  ("emblem_einherjar", "Einherjar: a shield with a crossed sword and horned helmet, red core"),
  ("emblem_runecaster", "Rune Caster: a circle of Norse runes around a staff, blue core"),
  ("emblem_wildhunter", "Wildhunter: a bow and arrow over a wolf paw, green core"),
  ("emblem_volva", "Völva: a golden sun with a staff and wings, gold core"),
  ("emblem_trickster", "Loki's Trickster: two crossed daggers with a serpent, violet core"),
  ("emblem_berserker", "Berserker: a wolf head over a two-handed axe, orange core"),
  ("emblem_neo", "NEO MIDGARD crest: a stylized Yggdrasil tree inside a circuit ring, cyan core"),
 ]),
 dict(file="sheet_mobs_1.png", cols=4, rows=3, mode="tile", style=MOB_STYLE, group="หน้ามอนสเตอร์ (กรอบเป้าหมาย)", cells=[
  ("mob_pudding", "Gel Unit: tiny cute pink android with a pink bob of hair plates and a pink band visor"),
  ("mob_leafworm", "Crawler Unit: small green android with short green hair plates and a slit visor"),
  ("mob_moonbun", "Bunny Unit: small white android with tall metal bunny ears and a pink visor"),
  ("mob_ember_pudding", "Ember Unit: small orange android with an orange bob and warm orange visor"),
  ("mob_buzzfly", "Buzz Unit: black-and-yellow android with spiky yellow hair plates, bee wings and a V visor"),
  ("mob_stumpling", "Rust Sentry: stocky rusty brown android with a helmet and slit visor"),
  ("mob_fiddlehopper", "Hopper Unit: lean green android with spiky green hair plates and a V visor"),
  ("mob_capshroom", "Mine Unit: android wearing a red mushroom-dome helmet with a red slit visor"),
  ("mob_moss_pudding", "Moss Unit: small mint-green android with a bob and green band visor"),
  ("mob_ashtail", "Ash Stalker: grey wolf-eared android with a grey cape and V visor"),
  ("mob_fenrir_pup", "Fenrir Unit: silver wolf-eared android with spiky silver hair plates and cyan V visor"),
  ("mob_mossback", "Iron Brute: huge bulky bronze-and-moss android with a heavy helmet and slit visor"),
 ]),
 dict(file="sheet_mobs_2.png", cols=4, rows=2, mode="tile", style=MOB_STYLE, group="หน้ามอนสเตอร์ (กรอบเป้าหมาย)", cells=[
  ("mob_tuskboar", "Tusk Trooper: dark brown armored android with a horned Viking helmet and orange slit visor"),
  ("mob_draugr", "Draugr Husk: rusted old android with a battered Viking helmet and red slit visor"),
  ("mob_bone_warden", "Frame Warden: skeletal white-frame android with exposed ribs and red slit visor"),
  ("mob_hel_maiden", "Hel Maiden Unit: hooded navy-robed android with long white hair plates and teal band visor"),
  ("mob_hel_guard", "Hel Guard Unit: dark armored android with a horned helmet, dark red cape and red V visor"),
  ("mob_seraph_pudding", "Seraph Core (boss): angelic pearl-and-gold android with a halo, wings and golden visor"),
  ("mob_kitsura", "Kitsura EX (boss): orange fox-eared android with long orange hair plates and orange V visor"),
  ("mob_blank", "an empty dark tile with a faint red hexagon pattern"),
 ]),
]

MAPS = [
 ("map_eldheim", "Neo Eldheim, the android capital city: plaza of metal floor tiles with cyan light strips around a glowing blue energy-core fountain, sci-fi Norse buildings with neon signs, green lawns and trees, daytime"),
 ("map_meadow", "Emerald Meadow: rolling green grass fields with wildflowers, metal pylons with glowing tips, a steel road crossing the field, small lakes, bright sunny sky"),
 ("map_mistlake", "Mistlake Plains: calm misty lakes with soft fog, tall reeds, floating light particles, distant ancient tech ruins, dawn light"),
 ("map_wolfwood", "Wolfwood: a dark pine forest with glowing green mushrooms and fireflies, mossy rocks, abandoned robot parts, moonlight through the trees"),
 ("map_helcave", "Hel's Hollow: a dark cave with glowing purple crystals, circuit lines on the rock floor, red warning lights, eerie teal fog"),
]
RIG_STYLE = ("Character CUTOUT PARTS sheet for 2D skeletal animation (like Spine / paper-doll rigs) for a cute classic 2000s Korean MMORPG style game. "
 "It is ONE chibi android character (big head, about 2.5 heads tall) broken apart into separate body parts, each part drawn as its own clean piece, "
 "ALL parts at exactly the SAME SCALE as if the character were assembled, from the same 3/4 view FACING LEFT, neutral straight pose. "
 "Joint ends are rounded and slightly extended (shoulder, hip, neck) so the parts overlap cleanly when rotated. Arms are fully straight hanging down, legs fully straight. "
 "FACE RULE: smooth metal faceplate with ONE glowing visor strip, NO eyes, NO mouth. "
 "FULLY TRANSPARENT background (PNG), parts must NOT touch each other, empty space between parts. Cel-shaded anime game art, crisp dark outline. "
 "No text, no labels, no grid lines, no frames, no shadows. Square 1024x1024, exactly 4 columns x 2 rows = 8 equal cells, one part centered in each cell.")
RIG_CELLS = lambda who: [
  (f"rig_{who}_head", "HEAD only: the head with hair plates, visor and ear headset, cut off at the neck, no neck"),
  (f"rig_{who}_torso", "TORSO only: chest, jacket and hips/belt down to the top of the thighs, NO head, NO arms, NO legs, short neck stub on top"),
  (f"rig_{who}_arm_front", "FRONT ARM (the arm nearer to the viewer): one whole straight arm from shoulder to hand, hanging down, hand slightly closed as if holding a handle"),
  (f"rig_{who}_arm_back", "BACK ARM (the arm farther from the viewer): one whole straight arm from shoulder to hand, hanging down, slightly darker shading"),
  (f"rig_{who}_leg_front", "FRONT LEG (nearer to the viewer): one whole straight leg from hip to boot, vertical"),
  (f"rig_{who}_leg_back", "BACK LEG (farther from the viewer): one whole straight leg from hip to boot, vertical, slightly darker shading"),
  (f"rig_{who}_hair_back", "BACK HAIR: only the long back part of the hair plates that hangs behind the body (if the hair is short, a small back tuft)"),
  (f"rig_{who}_weapon", "WEAPON only: the character's weapon drawn vertically, handle/grip at the BOTTOM, blade or tip pointing UP"),
]
RIG_SHEETS = [("sheet_rig_novice_f.png", "rig_novice_f", "Novice Type-A (slim feminine frame): white and graphite android body, khaki utility jacket, long silver-white hair plates, cyan visor, small energy knife")]
for f, who, desc in RIG_SHEETS:
    cells = RIG_CELLS(who.replace('rig_', ''))
    SHEETS.append(dict(file=f, cols=4, rows=2, mode="alpha", style=RIG_STYLE + " CHARACTER: " + desc + ".", group="ชิ้นส่วนกระดูก (animation)", cells=cells))
for f, cells in SPRITE_SHEETS:
    SHEETS.append(dict(file=f, cols=2, rows=2, mode="alpha", style=SPRITE_STYLE, group="สไปรต์มอนสเตอร์ในเกม (สไตล์ RO หุ่นยนต์)", cells=cells))
for f, cells in ACTOR_SHEETS:
    SHEETS.append(dict(file=f, cols=2, rows=2, mode="alpha", style=ACTOR_STYLE, group="สไปรต์ NPC / ผู้เล่น ในเกม (ชิบิ)", cells=cells))
for f, cells in PROP_SHEETS:
    SHEETS.append(dict(file=f, cols=2, rows=2, mode="alpha", style=PROP_STYLE, group="ฉาก: ต้นไม้ / ของประดับ / อาคาร", cells=cells))

