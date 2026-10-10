# Valkyrie F — actual renderer review

This evidence runs the actual Character Lab game, Sprites.drawPlayer, Anim.pick/draw and UnitPreview.draw. Candidate images are loaded into a fresh browser's Art map only. They are not installed in the game's asset manifest, and this does not certify the full class set.

- QA.json: all 208 unique native action/frame/direction combinations reached through normal actor timestamps, ten own action sheets, eight own idle Unit Preview headings, no fallback or flip, persistent save sentinels unchanged.
- candidate-lab.mp4: 48 actual Lab pose/direction segments plus a native Shield Slam activation. CLIP-QA.json gives the pose timeline and identifies this as candidate staging.
- unit-preview.mp4: all eight headings drawn using the actual UnitPreview.draw API.
- Every action has a native contact board; lab-landscape.png and lab-portrait.png record responsive UI evidence.

## Visual findings

- First Aid NW now preserves the back-left helmet yaw when both knees compress. Sword remains in the anatomical right hand and shield in the left; the other seven action rows are retained.
- Shield Throw S originally drifted toward SE. The replacement keeps the symmetrical front visor and foreshortens the left release toward the viewer. The shield is absent after release so the game can draw the projectile; sword ownership stays on the right.
- Idle, walk, attack, shield, First Aid, buff, shield throw, hurt, sit and death contact boards were visually inspected at native renderer scale. Direction routing and frame existence are proven. Final loop/proportion acceptance remains separate: SE/E stepping, transitions through independently generated SW/NW replacements, NE shield-arm origin, and N prone perspective still require focused motion review.
- Death, seated and equipped poses preserve the android identity; no anatomical eyes, mouth or skin were introduced. No damage, mana, cooldown, targeting, save or job progression values were changed to obtain these frames.

Full goal still includes all Rune options and passive signals, all 54 advanced active identities, 28 own class/gender motion sets, installation and final game/preview/performance acceptance. This evidence advances one candidate set only.

## Installed acceptance — 2026-10-06

The earlier staging findings above are historical. All ten reviewed female sheets are now installed as versioned anim_valkyrie_f_<action>_v1.webp files. INSTALLATION.json records hashes and the accepted scope: this one gender's own motion set, not the full artwork goal.

- Fixed E walk, NE shield middle poses (actual far left forearm, near right shoulder retained), and final N prone death. Native boards were inspected again after manifest installation. The walk uses groundedStride metadata, so runtime does not lift support boots a second time.
- QA.json now covers actual installed asset routing: 208 native frame/direction/action combinations, eight UnitPreview headings, no fallback/flip, isolated persistent saves, portrait/landscape and both economy screenshots.
- installed-lab.mp4 records 48 native pose/direction segments and every one of the 13 learned active skills. INSTALLED-CLIP-QA.json maps each cast to its own installed semantic sheet. Video seek offsets use wall time and are approximate; capture-stream timing can drift. The labelled skill-<id>-native.png images are captured directly after each real cast and provide exact scene evidence. The older video-contact montage is superseded by installed-skills-native-contact.png.
- unit-preview.mp4 records all eight real UnitPreview.draw headings. The installed scene still, native contact boards and 13 skill captures were visually inspected.
- PERFORMANCE.json measures 180 actual R.render CPU submissions per quality on this local headless Chrome machine: high median 0.20 ms / p95 0.60 ms; low median 0.10 ms / p95 0.50 ms. These are studio CPU costs, not a weak-device FPS guarantee or global multi-effect stress result.
- No damage, mana, cooldown, targeting, progression or persistent-save behavior was changed to obtain acceptance. Unlimited resources/no cooldown are the already authorized Lab options, not new gameplay balance changes.

Valkyrie male remains staged: eight own idle views and one partial four-frame south walk. Its gait contact/passing poses have authored alternating legs, but independently generated head/body scale and loop continuity still require correction. Seven walk directions and eight other required actions remain missing. Other 26 advanced gender sets and the global 80 Rune / 54 advanced-active / Passive visual audit are still outstanding; the full goal remains active.

Male continuation: south and north cycles are now assembled from explicit selected contact/passing frames in valkyrie-m-walk-sn-v4, with a generated north left-passing pose. E/W sources and correction pairs are archived but not selected: near/far-leg phase identity remains unresolved. The male review page shows six missing walk directions explicitly empty, not replaced by idle/fallback. Cross-source head/body scale and native motion acceptance remain pending; no male assets are installed.
