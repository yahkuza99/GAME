# NEO MIDGARD — Visual Plan / แผนความสวยงาม

> Companion to `docs/ART_REQUESTS.md` (what to generate). This file covers **how the game should look and feel**, which
> code work goes with each art batch, and the order to do it in. Story and tone source: `docs/STORY.md`.

## 0. สรุป / TL;DR
- **Biggest visible gaps:** (1) all 12 second classes are tinted copies of their parent (portrait, emblem, 60 skill icons) and are drawn by code on the map; (2) Chapter 6 monsters, Garmr and the world bosses are palette swaps; (3) hits, kills and level-ups have little weight ("juice").
- **Plan:** ship P1 art first. In parallel, add the code-only juice (hit-stop, number styles, loot beams), which needs no art. Then do P2 together with a tiny `Art` fix so new monster sprites actually show in the field.
- **Rule of thumb:** each art batch ships with its small code companion (§5), so new art is visible and celebrated the day it lands.

---

## 1. เสาหลักทิศทางศิลป์ / Art Direction Pillars

| # | Pillar | Means | Avoid |
|---|---|---|---|
| 1 | **เช้าหลังพายุ / Morning after the storm** | Warm, hopeful light even in dark maps: a rim of gold or cyan always finds the hero. Melancholy, never despair. | Grimdark, gore, horror lighting, pitch-black screens |
| 2 | **วิเซอร์คือหัวใจ / The visor is the soul** | No eyes, ever. The visor's color and brightness *is* the expression (`STORY.md` §9: bright = joy, dim = sadness, flicker = shock, dark = fallen). Use visor light for emotion in art, FX and UI. | Eyes, mouths, human skin, expressionless "blank robot" faces |
| 3 | **นอร์สเทคที่สง่า / Elegant tech-Norse** | Painterly anime-fantasy: graceful androids with visible joints, engraved knotwork and runes, warm gold trim, soft cyan glow, cloth and fur mixed with plate. | Boxy mecha, gritty sci-fi, chrome overload, sexualized designs |
| 4 | **อ่านออกในขนาดเกม / Readable at game scale** | Silhouette first: 64 px sprites, 40 px icons, 16:7 boss cards. One bold idea per icon. Each class keeps one color family (§2.2). | Busy detail that turns to mush when small; similar silhouettes across classes |
| 5 | **ครอบครัวเดียวกัน / One family, many variants** | RO-style lineage: Ch-6 monsters keep their base silhouette and add a motif (rust). Second classes keep the parent's weapon and silhouette and gain a tier-2 accent (gold filigree). | Redesigning from scratch, so players can't tell what evolved from what |
| 6 | **สไตล์คงที่ / Consistency over spectacle** | One preamble per asset type, one chat per batch, QA checklist (`ART_REQUESTS.md` §8). | Mixing tools or styles mid-batch; accepting "almost right" eyes or text |

**Light recipe (all art):** key light from the top-left, soft painterly gradients, strong rim light in the subject's glow color, and a cyan or gold secondary accent. Dark scenes are lit from inside: crystals, sap, sparks, visors.

---

## 2. พาเลตต์ / Palettes

### 2.1 ตามภูมิภาค / Per region
`ATMOS` grade is the current screen tint in `js/render.js` / `js/content_ch6.js`. Keep new art in the same family.

| Region (map id) | Lv | Base | Accent | Glow / light | `ATMOS` today | Mood (EN / TH) |
|---|---|---|---|---|---|---|
| Neo Eldheim (`eldheim`) | town | steel white `#e6e9ef`, slate `#2a3446` | warm lamp gold `#ffd05a` | cyan core `#62e3ff` | petals, `rgba(255,236,190,.06)` | safe, lively hub / อบอุ่น ปลอดภัย |
| Emerald Meadow (`meadow`) | 1–7 | grass `#6fbf4a`, sky `#9fd8ff` | wildflower pink `#ffd6e6` | pylon cyan | petals, warm grade | first morning / เช้าแรก สดใส |
| Mistlake Plains (`mistlake`) | 8–16 | misty teal `#8fc7c9`, reed olive `#7a8a4a` | dawn peach `#ffd2a8` | firefly gold `#ffe9a8` | fireflies + fog | quiet wonder / สงบ ลึกลับ |
| Wolfwood (`wolfwood`) | 18–30 | deep pine `#1f3a2a`, moss `#5a7a3a` | burnt ember `#d98a2b` | moonlight `#b8c8ff`, mushroom `#7aff9a` | leaves + light rays | wild, recently burned / ป่าที่เพิ่งถูกเผา |
| Hel's Hollow (`helcave`) | 30–45 | obsidian `#141a2a` | warning red `#ff3048` | crystal violet `#9a5aff`, teal fog `#4ad8c8` | dust, violet grade | sorrowful vault / โศกเศร้า |
| Archive Depths (`archive`) | 33–45 | archive teal `#3aa0b0`, brass `#b08a4a` | rust `#b0602a` | spark amber `#ffcf7a` | gold dust `rgba(150,120,40,.10)` | sacred, decaying / ศักดิ์สิทธิ์แต่ผุพัง |
| Gnawed Roots (`roots`) | 45–60 | root bronze `#8a6a44`, dark earth `#2a1a14` | rust red `#8a1a10` | sap green-gold `#9ae07a`, ember `#ff7a3a` | red-brown dust `rgba(130,45,20,.14)` | primal dread, last hope / น่ากลัว แต่ยังมีหวัง |

Progression rule: saturation and warmth **drop as you go deeper**, but each map keeps **one living light**: crystals in Hel's Hollow, sparks in the Archive, sap in the Roots. That light is the visual promise that "the tree still grows".

### 2.2 สีประจำคลาส / Class identity colors (from `JOBS[].glow`)
| Line | 1st class | 2nd class A | 2nd class B |
|---|---|---|---|
| Einherjar | `#ff6a4a` red | Valkyrie `#ffd27a` gold | Hersir `#ff8060` crimson-orange |
| Rune Caster | `#6ae0ff` cyan | Galdr `#9ad8ff` ice blue | Seidr `#c07aff` violet |
| Wildhunter | `#8cff7a` green | Skadi `#b8f0ff` ice cyan | Ullr `#d0ff8a` lime |
| Völva | `#ffe27a` gold | Norn `#fff0a8` pale gold (+ lavender) | Gythja `#ffc070` amber |
| Trickster | `#c07aff` violet | Phantom `#e08aff` magenta | Skald `#7ad0ff` sky blue |
| Berserker | `#ff8a2a` orange | Warlord `#ff6a3a` ember | Jotun `#c0a080` tan |

Use these for visor color, skill-icon family, cast circles, the class-change cinematic and nameplate accents. Watch-outs: Seidr (`#c07aff`) is the same hex as the Trickster, and Galdr sits close to the Rune Caster. Separate them with the **secondary** color: Seidr = violet + toxic green, Galdr = ice blue + white.

### 2.3 UI semantic colors (keep as they are)
HP `--hp-a #ff3d62`, SP `--sp-a #2f8bff`, EXP `--exp #ffd05a`, Job EXP `--jexp #b58cff`, ok `#5af0a0`, warn `#ffbf4d`, bad `#ff5a6a`, cyan line `--cy #62e3ff` (`css/style.css` `:root`). New UI work uses these tokens. No new hard-coded colors.

---

## 3. งานขัดเกลา UI / UI Polish Backlog
Effort: S ≈ under half a day, M ≈ 1–2 days, L ≈ 3+ days. "Art dep" = waits for that batch.

| # | Item | Why | Effort | Art dep |
|---|---|---|---|---|
| U1 | **Class-change splash 2.0**: job portrait slides in, emblem "stamps" on, class name in the display font, the visor flashes in the class color (builds on `UI.splash(..., 'upgrade')`) | The single most emotional moment in an RPG; today it shows a tinted image | M | P1 |
| U2 | **Class guide branch view**: parent → two second classes side by side with portraits, emblems and a role line (`js/classbook.js`) | Makes the choice at Job 21 exciting and informed | M | P1 |
| U3 | **Tier-2 emblem frame**: a thin gold filigree ring around second-class emblems on the unit card and nameplate | Status signal at a glance | S | P1 |
| U4 | **Skill icon frames by type**: passive = hexagon rim, active = round rim, buff = soft double ring; rim tinted in the class color | Hotbar readability; passives stop looking clickable | S | – |
| U5 | **Boss HP bar**: wide top bar with name plate, `mob_` portrait, 50% tick (Garmr heals below half), gold variant + "shared HP" label for world bosses | Boss fights read as events | M | P2 (portraits) |
| U6 | **Item rarity borders**: plain / slotted / Lv 30+ / MVP (gold pulse) / chip (card frame already exists) | Loot excitement in bags and shops | S | – |
| U7 | **Map-enter banner**: slow Ken-Burns pan on `map_` art + letterbox fade; story line already supported | Each new map feels like an arrival | S | P4 for Ch-6 |
| U8 | **World map cards**: pulse the MVP / world-boss tag while the boss is live (`WB.active`) | Drives social play | S | – |
| U9 | **Title screen**: two-layer parallax on `keyart` (foreground character / background) + logo shimmer sweep | First impression | M | optional keyart split |
| U10 | **Tooltip & hover cards**: one layout everywhere (48 px icon header, class-colored title, stat rows) | Polish and consistency | S | P3 nice-to-have |
| U11 | **Token hygiene**: move leftover hard-coded colors in `css/style.css` and `css/visor.css` to `:root` tokens; keep both HUD skins in sync | Cheaper future theming | M | – |
| U12 | **Comfort settings**: toggles for screen shake, hit-stop, flashes; honor `prefers-reduced-motion` | Accessibility; required before adding more juice | S | – |
| U13 | **Mobile touch targets**: at least 44 px for hotbar and window buttons, safe-area padding checked on notch phones | Most players are on phones | S | – |

---

## 4. ความมันมือ / FX & Feel Backlog ("juice")
These are code-only unless noted. Existing pieces to build on: `R.kick` screen shake (crits), RO-style bouncing numbers + crit starburst (`R.drawFloater`), card-drop `beam`, `levelup` and `upgrade` FX, `fx_<name>.webp` sprite support in `addFx`.

### 4.1 Hit-stop / หยุดเฟรมตอนโดน
| Trigger | Freeze | Extra |
|---|---|---|
| Normal hit | none | white flash (exists) + 2 px knock-nudge on the mob |
| Critical | 45 ms | existing `R.kick(4)` |
| Skill finisher (multi-hit last hit, `sureHit` nukes like Snipe / Divine Burst / Void Lance) | 70 ms | 1.02× zoom punch |
| Kill | 60 ms | mob dissolves into rising spark motes (§4.5) |
| MVP / world-boss kill | 150 ms + 0.4 s slow-mo at 0.3× | gold flash, "MVP" stamp |

Implementation: a global `G.timeScale` / `G.freezeUntil` read by the update loop; only the **local player's** hits trigger it; never in `G.fastSim` or bot mode; capped so it can't stack above about 150 ms per second.

### 4.2 Damage number styles / สไตล์ตัวเลขดาเมจ
| Kind | Look |
|---|---|
| Normal (dealt) | white, dark outline (current) |
| Critical | yellow + starburst (current), 1.15× |
| Skill damage | tinted in the **class color**, with a tiny element glyph |
| Weakness hit (element ×1.5+) | adds a small "WEAK" tag above, orange |
| Resisted (element <×1) | grey, 0.85×, no bounce |
| Miss / dodge | "MISS" pale blue-grey, drifts sideways |
| Damage taken (player) | red with a dark outline, falls downward |
| Heal / regen | green "+N", rises slowly; SP restore in blue |
| DoT (poison / burn ticks) | small purple / orange, no bounce, merged per second |
| Multi-hit (2–3 hits) | staggered stack, then a **total** pops bigger after the last hit |
| MVP / world boss | gold outline on numbers dealt to the boss |

Rule: cap on-screen numbers (merge same-target hits within 80 ms) so AoE stays readable.

### 4.3 Loot beams / ลำแสงของดรอป
| Tier | Beam |
|---|---|
| Common etc. drop | none, small pop arc onto the ground |
| Equipment | soft white pillar, 1.2 s |
| Lv 30+ equipment or slotted gear | blue pillar + sparkle |
| Chip (card) | gold beam + announce (exists) |
| MVP drop (e.g. `garmr_collar`, `seraph_wings`) | gold beam with rotating rune ring, lasts until picked up |
| Yggdrasil Core / Branch | green-gold leaf spiral rising (ties to the "tree still grows" theme) |
Auto-loot: items fly to the player in an arc with a tiny chime, instead of vanishing.

### 4.4 Level-up & class-change cinematic / ฉากเลเวลอัป
- **Base level up:** 0.25 s slow-mo → gold ring burst from the feet (existing `levelup` FX) → top banner "LEVEL UP · Lv N" with a count-up → small toast "+3 Status Points" with a button to open stats → visor flashes bright (pillar 2).
- **Job level up:** the same in blue (`--jexp`), smaller, no slow-mo.
- **Class change (first or second):** screen dims → existing hex-cage `upgrade` FX builds around the player → the job portrait wipes in from the side with the emblem stamp and class name (U1) → the visor lights in the new class color → the burst returns to gameplay. Total under 3 s, skippable by tap.
- **First MVP kill per boss:** "MVP" stamp + the boss portrait greys out into the bestiary (if that UI is added).

### 4.5 Other feel items / อื่น ๆ
- **Falling, not dying (lore-true):** mobs break into rising spark motes in their glow color instead of fading. When the player falls, the visor flickers and goes dark (`STORY.md` §9).
- **Boss entrance:** letterbox bars + camera eases to the boss for 0.6 s + ground tremor + existing splash card. World bosses use a gold variant.
- **Telegraphs:** Garmr's `rootquake` red circle → upgrade to a cracking-ground decal with root tips poking through before the eruption (optional `fx_rootquake.webp`).
- **Cast circles in the class color** (`castcircle` FX); skill FX sprites per `art/NOTEPAD.md`.
- **Low HP:** red vignette pulse below 30% HP, heartbeat SFX below 20%, visor dims slightly.
- **Footsteps:** small dust puffs on dirt and cave floors, ripples on water tiles.
- **Map ambience (Ch-6):** Archive = slow **upward** amber spark motes; Roots = **falling** rust flakes + rare distant rumble shake (0.5 px).
- **Camera:** slight lead in the movement direction; 1.02× zoom punch on finishers.
- **Weapon feel (instead of weapon sprites):** refine level → glow on attack trails (+5 soft, +7 class color, +9 animated); trail shape per weapon type (dagger = thin double flick, sword = arc, axe = heavy wedge, mace = round impact ring, bow = string snap + arrow streak, rod = rune sparkle).

---

## 5. งานโค้ดคู่กับภาพแต่ละชุด / Code Companions per Art Batch

| Batch | Shows automatically? | Code to ship with it | Size |
|---|---|---|---|
| **P1 portraits + emblems** | Yes. The real `job_*` / `emblem_*` override the aliases in `js/art.js`. | U1 class-change splash, U2 classbook branch view, U3 tier-2 frame. Check the HUD face crop (`Art.faceRect`) on all 24 portraits. Optionally delete the second-class alias loop once all 36 files exist (the fallback is harmless if kept). | M |
| **P1+ hero sheets** | Yes, after slicing | Add `sheet_heroes_5..10` to `ACTOR_SHEETS` in `tools/asset_spec.py`. Confirm `Sprites.drawPlayer` picks `hero_<class>_<g>` for the new classes (it does, via `Art.get('hero_' + gk)`). | S |
| **P2 Ch-6 monsters** | Portrait, target frame and chip: yes. **Field: no** for 8 of 10, because tinted base animations win (`Anim.has` → derived `anim_mob_<id>_*`). | **Fix in `Art.variantSource`:** for `anim_mob_<id>_*`, return `null` when a *real* `mobsprite_<id>` is loaded (an `Image`, not a derived canvas with `variantOf`). In `Art.onLoad('mobsprite_<id>')`, clear `_vs` and the derived `imgs` entries for `anim_mob_<id>_*`. After the fix, a monster with a real body sprite but no anim sheet uses the static `mobImage` path. U5 boss HP bar. Optional `fx_rootquake`. | S |
| **P2 world-boss splashes** | Yes (`mvp_wb_<id>` exact key beats the derived tint) | none. `mobsprite_wb_*` stays a gold tint of the real MVP sprite, which is intended. | – |
| **P2+ Hel** | Yes (`npc_hel` via `UI.illust`; `npcsprite_hel` via `Sprites.drawNpc`) | Add `'npc_hel'` to `ART_KEYS` (only matters for `file://` play). | S |
| **P3 skill icons** | Yes | U4 icon frames by type. Optional: delete the three skill-alias blocks in `js/art.js` once all 72 exist. | S |
| **P4 map banners** | Yes (`announceMap`, world map) | U7 Ken-Burns banner. Ch-6 ambience particles (§4.5). | S |
| **P4+ ground / props** | **No hook yet** | `js/maps.js`: ground lookup `Art.get('ground_' + mapId) ?? TEX[kind]`; add `shelf` / `root` / `rustvent` to `PROP_ART` and scatter them in `archive` / `roots` generation (seeded). | M |
| **P5 item icons** | Yes (`Art.itemKey`) | U6 rarity borders. | S |
| **P5+ headgear overlays** | **No hook yet** | Head anchor per animation frame: compute the top-of-alpha in the central columns at install time in `tools/sprite_std.py` (same idea as `Art.faceRect`) and store it in `art/anim_sizes.json`. Draw `gear_head_<id>` after the body in `Anim.draw` (players only); use `faceRect` for static `hero_` images. Keep it behind a setting until every class has animations. | L |

Definition of done for every batch: files are in `assets/` **and** `manifest.json`; no tinted stand-in is visible anywhere for that batch (class guide, HUD, target frame, chip card, field, splash); the `ART_REQUESTS.md` checklist is ticked.

---

## 6. ลำดับงาน / Order of Work

| Step | Art (owner) | Code (Claude) | Player-visible result |
|---|---|---|---|
| 1 | **P1**: 12 portrait pairs + 12 emblems, one chat per parent class (6 chats) | U12 comfort toggles; §4.1 hit-stop; §4.2 number styles; §4.3 loot beams | Combat feels punchier right away; second classes look real |
| 2 | P1 QA + install | U1 class-change splash, U2 branch view, U3 frame | Class change becomes a moment |
| 3 | **P2 Garmr set first** (splash, sprite, anim, portrait) | §5 P2 `variantSource` fix; U5 boss bar; boss entrance (§4.5) | The Ch-6 climax looks finished |
| 4 | P2 other 9 monsters, then 3 world-boss splashes | "Falling into sparks" death FX; Ch-6 ambience | The whole of Chapter 6 is real art |
| 5 | **P3** skill icons, class by class (most-played class first) | U4 icon frames; class-color cast circles | The hotbar reads by class |
| 6 | **P4** two map banners (+ P4+ if wanted) | U7 banner; P4+ ground/prop hook | Arriving in Ch-6 maps feels new |
| 7 | P1+ hero sheets, **or** jump straight to walk sheets (ROADMAP Phase 2) | — | No more code-drawn figures on the map |
| 8 | **P5** item icons | U6 rarity borders; level-up cinematic (§4.4) | Loot and progression shine |
| 9 | P5+ headgear (only if wanted) | Head-anchor system | Hats visible on characters |

Parallel track: steps 1–4 of the code column need no art and can start immediately.
Budget: about 160 core images. At roughly 25 good images per session, that is about 7 art sessions (P1 = 2, P2 = 2, P3 = 3), plus about 1 session for P4 and P5.
