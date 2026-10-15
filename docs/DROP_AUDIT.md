# DROP_AUDIT — ไล่ระดับอุปกรณ์ที่ดรอป (รอบ 38 + เติมช่องว่างรอบ 42)

สร้างจากเกมจริง (`LOOT.gearLv` + ตารางดรอปหลัง balance.js) — ตรวจโดย `tests/droplevel.js` (`PROG=1` พิมพ์รายการอาวุธ • `GAPS=1` พิมพ์เลเวลของแต่ละสาย)

## กติกา

- ของสวมใส่ที่มอนดรอปต้องมี Lv อยู่ใน `LOOT.dropBand(มอน)` = Lv มอน −8 … +3 (MVP ถึง +10 • World Boss ใช้ MVP ต้นแบบ)
- รอบ 42: ทุกประเภทอาวุธและทุกช่องเกราะ × ทุก Job ต้องมีของอัปเกรด **ห่างกันไม่เกิน 8 เลเวล** ตั้งแต่ชิ้นแรกถึง Lv 70 — อาวุธนับเฉพาะของที่ทุก Class ของประเภทนั้นใช้ได้ (สาย uncommon เดี่ยว ๆ และสาย common+uncommon+rare รวม) • เกราะนับ uncommon+rare
- ของใหม่ 56 ชิ้นอยู่ใน `js/content_gaps.js` (ทำเครื่องหมาย **ใหม่** ในตารางข้างล่าง) • ดรอปชิ้นละ 1 มอนปกติ • ตารางอุปกรณ์ของมอนนั้นถูกย่อให้ผลรวมถ่วงน้ำหนักเท่าเดิม → อุปกรณ์/ชม. ต่อแมพคงเดิม (meadow 2.703 · mistlake 3.143 · wolfwood 2.877 · helcave 2.966→2.971 · archive 2.712→2.711 · roots 3.126→3.127 · abyss 2.397→2.399)
- **ข้อจำกัดที่รู้**: มอนปกติสูงสุด Lv 70 (World Boss ต้นแบบ Lv 70 → ถึง 80) จึงยังไม่มีของดรอป Lv 74–99 • ชั้น common มีแต่ของร้าน Lv 1 • สาย rare ห่างกัน 10–16 เลเวลโดยตั้งใจ

## มีดสั้น (dagger)

| Lv | ไอเทม | ความหายาก | ใช้ได้ | ค่า | ดรอปจาก |
|---|---|---|---|---|---|
| 1 | Knife `knife` | common | 6 Job | ATK 17 | Gel Unit Lv 1 (Emerald Meadow) |
| 5 | Gel Shiv `gel_shiv` | uncommon | 6 Job | ATK 50 | Crawler Unit Lv 2 (Emerald Meadow) |
| 8 | Moonlit Kris `moon_kris` | rare | 6 Job | ATK 60 | Rust Sentry Lv 8 (Mistlake Plains) |
| 12 | Springsteel Kris `hopper_kris` | uncommon | 6 Job | ATK 66 | Hopper Unit Lv 9 (Mistlake Plains) |
| 12 | Stiletto `stiletto` | uncommon | 6 Job | ATK 60 | Mine Unit Lv 12 (Mistlake Plains) |
| 16 | Mistfang `mistfang` | rare | 6 Job | ATK 76 | Frame Warden Lv 24 (Hel's Hollow) |
| 19 | **Ashtail Dirk** (ใหม่) `ashtail_dirk` | uncommon | 6 Job | ATK 78 | Fenrir Unit Lv 25 (Wolfwood Forest) |
| 25 | Emberfang `emberfang` | epic | 6 Job | ATK 70 / MATK 40 | Hel Maiden Unit Lv 30 (Hel's Hollow) |
| 25 | Fenrir Clawblade `fenrir_claw` | uncommon | 6 Job | ATK 90 | Fenrir Unit Lv 25 (Wolfwood Forest) |
| 30 | Loki's Fang `loki_fang` | rare | 1 Job | ATK 105 | Hel Guard Unit Lv 32 (Hel's Hollow) |
| 33 | Sapdrinker Dirk `sap_dirk` | uncommon | 6 Job | ATK 102 | Rust Sap Unit Lv 33 (Archive Depths) |
| 40 | **Archive Stylus** (ใหม่) `archive_stylus` | uncommon | 6 Job | ATK 117 | Rust Husk Lv 44 (Archive Depths) |
| 44 | **Veinbiter Kris** (ใหม่) `veinbiter_kris` | rare | 6 Job | ATK 124 | Gnawed Sentry Lv 49 (Gnawed Roots) |
| 46 | Rootfang Dagger `crawler_fang` | uncommon | 6 Job | ATK 130 | Root Crawler Unit Lv 46 (Gnawed Roots) |
| 52 | **Rootsplit Dirk** (ใหม่) `rootsplit_dirk` | uncommon | 6 Job | ATK 144 | Rust Bloom Lv 58 (Nidhogg's Hollow) |
| 55 | Hellhound's Fang `garmr_fang` | epic | 6 Job | ATK 162 | Garmr Lv 60 (Gnawed Roots) |
| 58 | **Bloomthorn Kris** (ใหม่) `bloomthorn_kris` | uncommon | 6 Job | ATK 157 | Nidhogg Spawn Lv 63 (Nidhogg's Hollow) |
| 61 | **Rotvein Kris** (ใหม่) `rotvein_kris` | rare | 6 Job | ATK 160 | Rot Colossus Lv 69 (Nidhogg's Hollow) |
| 63 | Wyrmfang Kris `wyrmfang_kris` | uncommon | 6 Job | ATK 170 | Nidhogg Spawn Lv 63 (Nidhogg's Hollow) |

## ดาบ (sword)

| Lv | ไอเทม | ความหายาก | ใช้ได้ | ค่า | ดรอปจาก |
|---|---|---|---|---|---|
| 6 | Wirecutter Saber `wire_saber` | uncommon | 4 Job | ATK 68 | Bunny Unit Lv 3 (Emerald Meadow) |
| 12 | Sentry Saber `sentry_saber` | uncommon | 4 Job | ATK 82 | Hopper Unit Lv 9 (Mistlake Plains) |
| 18 | **Ashforge Blade** (ใหม่) `ashforge_blade` | uncommon | 4 Job | ATK 93 | Frame Warden Lv 24 (Hel's Hollow) |
| 22 | Seraphic Edge `seraph_edge` | epic | 4 Job | ATK 115 / MATK 20 | Seraph Core Lv 25 (Mistlake Plains) |
| 24 | Wardenbone Sword `warden_blade` | uncommon | 4 Job | ATK 104 | Frame Warden Lv 24 (Hel's Hollow) |
| 28 | Barrow-King's Blade `barrowking_blade` | rare | 4 Job | ATK 126 | Tusk Trooper Lv 28 (Wolfwood Forest) |
| 30 | **Helwatch Sabre** (ใหม่) `helwatch_sabre` | uncommon | 4 Job | ATK 123 | Rust Sap Unit Lv 33 (Archive Depths) |
| 30 | Valhalla Blade `valhalla_blade` | rare | 1 Job | ATK 130 | Rust Sap Unit Lv 33 (Archive Depths) |
| 36 | Archivist's Greatsword `archive_greatsword` | uncommon | 4 Job | ATK 142 | Archive Warden Lv 36 (Archive Depths) |
| 42 | **Archivist's Claymore** (ใหม่) `archivist_claymore` | rare | 4 Job | ATK 152 | Root Crawler Unit Lv 46 (Gnawed Roots) |
| 44 | Rusthusk Greatsword `husk_greatsword` | uncommon | 4 Job | ATK 158 | Rust Husk Lv 44 (Archive Depths) |
| 50 | **Rootsworn Blade** (ใหม่) `rootsworn_blade` | uncommon | 4 Job | ATK 170 | Root Gnawer Lv 57 (Gnawed Roots) |
| 56 | **Verdigris Falchion** (ใหม่) `verdigris_falchion` | rare | 4 Job | ATK 188 | Hollow Shell Lv 61 (Nidhogg's Hollow) |
| 57 | Gnawtooth Saber `gnawer_saber` | uncommon | 4 Job | ATK 184 | Root Gnawer Lv 57 (Gnawed Roots) |
| 60 | Hand of Týr `tyr_hand` | legend | 4 Job | ATK 232 | Garmr Lv 60 (Gnawed Roots) |
| 61 | Hollowshell Greatsword `shell_greatsword` | uncommon | 4 Job | ATK 192 | Hollow Shell Lv 61 (Nidhogg's Hollow) |
| 66 | **Hollowguard Sword** (ใหม่) `hollowguard_sword` | uncommon | 4 Job | ATK 204 | Rot Colossus Lv 69 (Nidhogg's Hollow) |
| 68 | Fang of Nidhogg `nid_fang` | epic | 4 Job | ATK 226 | Nidhogg Lv 70 (Nidhogg's Hollow) |

## ขวาน (axe)

| Lv | ไอเทม | ความหายาก | ใช้ได้ | ค่า | ดรอปจาก |
|---|---|---|---|---|---|
| 6 | Silvermoon Hatchet `moon_hatchet` | uncommon | 3 Job | ATK 70 | Bunny Unit Lv 3 (Emerald Meadow) |
| 14 | Minebreaker Axe `mine_breaker` | uncommon | 3 Job | ATK 90 | Mine Unit Lv 12 (Mistlake Plains) |
| 15 | Battle Axe `battle_axe` | uncommon | 3 Job | ATK 72 | Mine Unit Lv 12 (Mistlake Plains) |
| 18 | Barrow Axe `barrow_axe` | uncommon | 3 Job | ATK 98 | Draugr Husk Lv 17 (Hel's Hollow) |
| 23 | **Wolfwood Hewer** (ใหม่) `wolfwood_hewer` | uncommon | 3 Job | ATK 110 | Hel Maiden Unit Lv 30 (Hel's Hollow) |
| 28 | Tuskbreaker Axe `tusk_axe` | uncommon | 3 Job | ATK 122 | Tusk Trooper Lv 28 (Wolfwood Forest) |
| 30 | Úlfr Axe `ulfr_axe` | rare | 1 Job | ATK 145 | Hel Guard Unit Lv 32 (Hel's Hollow) |
| 32 | Helgate Axe `hel_axe` | uncommon | 3 Job | ATK 134 | Hel Guard Unit Lv 32 (Hel's Hollow) |
| 38 | **Archive Hatchet** (ใหม่) `archive_hatchet` | uncommon | 3 Job | ATK 145 | Archive Maiden Lv 41 (Archive Depths) |
| 42 | **Rustbite Axe** (ใหม่) `rustbite_axe` | rare | 3 Job | ATK 158 | Gnawed Sentry Lv 49 (Gnawed Roots) |
| 44 | **Draugr Splitter** (ใหม่) `draugr_splitter` | uncommon | 3 Job | ATK 156 | Gnawed Sentry Lv 49 (Gnawed Roots) |
| 49 | Ironheart Cleaver `heartwood_cleaver` | uncommon | 3 Job | ATK 165 | Gnawed Sentry Lv 49 (Gnawed Roots) |
| 53 | Rootsplitter Greataxe `brute_greataxe` | uncommon | 3 Job | ATK 180 | Gnawed Brute Lv 53 (Gnawed Roots) |
| 58 | Gnipahellir Cleaver `gnipa_cleaver` | epic | 3 Job | ATK 208 | Garmr Lv 60 (Gnawed Roots) |
| 60 | **Gnarlroot Axe** (ใหม่) `gnarlroot_axe` | uncommon | 3 Job | ATK 194 | Nidhogg Spawn Lv 63 (Nidhogg's Hollow) |
| 62 | **Wyrmcleft Axe** (ใหม่) `wyrmcleft_axe` | rare | 3 Job | ATK 200 | Rootbound Guard Lv 66 (Nidhogg's Hollow) |
| 66 | Rootbound Axe `rootbound_axe` | uncommon | 3 Job | ATK 206 | Rootbound Guard Lv 66 (Nidhogg's Hollow) |

## คทา (rod)

| Lv | ไอเทม | ความหายาก | ใช้ได้ | ค่า | ดรอปจาก |
|---|---|---|---|---|---|
| 5 | Ember Wand `ember_wand` | uncommon | 3 Job | ATK 22 / MATK 36 | Ember Unit Lv 3 (Emerald Meadow) |
| 8 | Sproutcircuit Staff `sprout_staff` | rare | 3 Job | ATK 26 / MATK 46 | Rust Sentry Lv 8 (Mistlake Plains) |
| 12 | Rune Staff `rune_staff` | uncommon | 3 Job | ATK 25 / MATK 40 | Sentry Captain Lv 14 (Elite) |
| 14 | Mossglow Scepter `moss_scepter` | uncommon | 3 Job | ATK 28 / MATK 50 | Moss Unit Lv 14 (Mistlake Plains) |
| 16 | Tidecaller Rod `tidecaller_rod` | rare | 3 Job | ATK 30 / MATK 62 | Ash Stalker Lv 18 (Wolfwood Forest) |
| 22 | **Glowmoss Rod** (ใหม่) `glowmoss_rod` | uncommon | 3 Job | ATK 39 / MATK 70 | Tusk Trooper Lv 28 (Wolfwood Forest) |
| 22 | Choir of Seraphs `seraph_staff` | epic | 3 Job | ATK 45 / MATK 90 | Seraph Core Lv 25 (Mistlake Plains) |
| 24 | Seer's Staff `seer_staff` | rare | 2 Job | ATK 60 / MATK 80 | Hel Maiden Unit Lv 30 (Hel's Hollow) |
| 30 | Soulwick Staff `soulwick_staff` | uncommon | 3 Job | ATK 50 / MATK 84 | Hel Maiden Unit Lv 30 (Hel's Hollow) |
| 34 | Rustbloom Staff `rustbloom_staff` | uncommon | 3 Job | ATK 55 / MATK 92 | Archive Maiden Lv 41 (Archive Depths) |
| 36 | **Cinderglass Staff** (ใหม่) `cinderglass_staff` | rare | 3 Job | ATK 56 / MATK 100 | Archive Maiden Lv 41 (Archive Depths) |
| 41 | Sparkscript Staff `spark_staff` | uncommon | 3 Job | ATK 62 / MATK 106 | Archive Maiden Lv 41 (Archive Depths) |
| 45 | Yggdrasil Branch `yggdrasil_branch` | rare | 2 Job | ATK 70 / MATK 115 | Gnawed Sentry Lv 49 (Gnawed Roots) |
| 47 | **Cipher Staff** (ใหม่) `cipher_staff` | uncommon | 3 Job | ATK 65 / MATK 114 | Gnawed Brute Lv 53 (Gnawed Roots) |
| 53 | **Rootlight Staff** (ใหม่) `rootlight_staff` | uncommon | 3 Job | ATK 67 / MATK 122 | Hollow Shell Lv 61 (Nidhogg's Hollow) |
| 57 | Rootheart Scepter `rootheart_rod` | rare | 3 Job | ATK 78 / MATK 142 | Root Gnawer Lv 57 (Gnawed Roots) |
| 59 | Rotbloom Scepter `rotbloom_rod` | uncommon | 3 Job | ATK 70 / MATK 130 | Rust Bloom Lv 58 (Nidhogg's Hollow) |
| 60 | Mímir's Wellspring `mimir_well` | legend | 3 Job | ATK 85 / MATK 172 | Garmr Lv 60 (Gnawed Roots) |
| 64 | **Wyrmspine Rod** (ใหม่) `wyrmspine_rod` | rare | 3 Job | ATK 78 / MATK 150 | Rot Colossus Lv 69 (Nidhogg's Hollow) |
| 65 | **Hollowbloom Scepter** (ใหม่) `hollowbloom_scepter` | uncommon | 3 Job | ATK 74 / MATK 143 | Rot Colossus Lv 69 (Nidhogg's Hollow) |
| 68 | Rotroot of Nidhogg `nid_rotstaff` | epic | 3 Job | ATK 84 / MATK 160 | Rot Colossus Lv 69 (Nidhogg's Hollow) / Nidhogg Lv 70 (Nidhogg's Hollow) |

## ธนู (bow)

| Lv | ไอเทม | ความหายาก | ใช้ได้ | ค่า | ดรอปจาก |
|---|---|---|---|---|---|
| 6 | Rotorstring Bow `rotor_bow` | uncommon | 2 Job | ATK 46 | Buzz Unit Lv 4 (Emerald Meadow) |
| 13 | Mistlake Longbow `mist_longbow` | uncommon | 2 Job | ATK 60 | Mine Unit Lv 12 (Mistlake Plains) |
| 18 | Great Bow `great_bow` | uncommon | 1 Job | ATK 55 | Ash Stalker Lv 18 (Wolfwood Forest) |
| 19 | **Wolfsinew Bow** (ใหม่) `wolfsinew_bow` | uncommon | 2 Job | ATK 76 | Iron Brute Lv 26 (Wolfwood Forest) |
| 24 | Huntsman's Recurve `huntsman_bow` | uncommon | 2 Job | ATK 92 | Tusk Trooper Lv 28 (Wolfwood Forest) |
| 28 | **Ironwood Skybow** (ใหม่) `ironwood_skybow` | rare | 2 Job | ATK 108 | Hel Guard Unit Lv 32 (Hel's Hollow) |
| 30 | Ullr's Bow `ullr_bow` | rare | 1 Job | ATK 125 | Hel Guard Unit Lv 32 (Hel's Hollow) / Archive Warden Lv 36 (Archive Depths) |
| 32 | **Helgate Recurve** (ใหม่) `helgate_recurve` | uncommon | 2 Job | ATK 113 | Archive Warden Lv 36 (Archive Depths) |
| 38 | Detonator Longbow `detonator_bow` | rare | 2 Job | ATK 134 | Rust Mine Unit Lv 38 (Archive Depths) |
| 40 | **Cipherstring Bow** (ใหม่) `cipherstring_bow` | uncommon | 2 Job | ATK 129 | Root Crawler Unit Lv 46 (Gnawed Roots) |
| 42 | Foxfire Bow `foxfire_bow` | epic | 2 Job | ATK 168 | Kitsura EX Lv 45 (Hel's Hollow) |
| 46 | Rootstring Bow `root_bow` | uncommon | 2 Job | ATK 150 | Root Crawler Unit Lv 46 (Gnawed Roots) |
| 50 | **Rootwhisper Bow** (ใหม่) `rootwhisper_bow` | uncommon | 2 Job | ATK 161 | Rust Bloom Lv 58 (Nidhogg's Hollow) |
| 52 | **Verdigris Longbow** (ใหม่) `verdigris_longbow` | rare | 2 Job | ATK 164 | Root Gnawer Lv 57 (Gnawed Roots) |
| 55 | Gnawroot Warbow `gnawroot_bow` | uncommon | 2 Job | ATK 174 | Root Gnawer Lv 57 (Gnawed Roots) |
| 60 | **Gnarlwood Warbow** (ใหม่) `gnarlwood_warbow` | uncommon | 2 Job | ATK 185 | Rootbound Guard Lv 66 (Nidhogg's Hollow) |
| 66 | Rotroot Longbow `rotroot_bow` | uncommon | 2 Job | ATK 196 | Nidhogg Spawn Lv 63 (Nidhogg's Hollow) / Rot Colossus Lv 69 (Nidhogg's Hollow) |

## กระบอง (mace)

| Lv | ไอเทม | ความหายาก | ใช้ได้ | ค่า | ดรอปจาก |
|---|---|---|---|---|---|
| 5 | Tinker's Mallet `tinker_mallet` | uncommon | 4 Job | ATK 54 | Ember Unit Lv 3 (Emerald Meadow) |
| 12 | Flail `flail` | uncommon | 4 Job | ATK 60 | Draugr Husk Lv 17 (Hel's Hollow) |
| 15 | Runebound Mallet `rune_mallet` | uncommon | 4 Job | ATK 74 | Moss Unit Lv 14 (Mistlake Plains) |
| 20 | Morning Star `morning_star` | uncommon | 4 Job | ATK 90 | Frame Warden Lv 24 (Hel's Hollow) |
| 26 | Ironhide Maul `ironhide_maul` | uncommon | 4 Job | ATK 104 | Iron Brute Lv 26 (Wolfwood Forest) |
| 28 | **Anvilhide Mace** (ใหม่) `anvilhide_mace` | rare | 4 Job | ATK 114 | Rust Sap Unit Lv 33 (Archive Depths) |
| 32 | **Gatepost Mace** (ใหม่) `gatepost_mace` | uncommon | 4 Job | ATK 117 | Rust Mine Unit Lv 38 (Archive Depths) |
| 38 | Fusebreaker `fuse_mace` | uncommon | 4 Job | ATK 130 | Rust Mine Unit Lv 38 (Archive Depths) |
| 44 | **Vaultbreaker Mace** (ใหม่) `vaultbreaker_mace` | uncommon | 4 Job | ATK 143 | Rust Husk Lv 44 (Archive Depths) |
| 49 | Rootwarden Maul `sentinel_maul` | uncommon | 4 Job | ATK 152 | Gnawed Sentry Lv 49 (Gnawed Roots) |
| 55 | Jötunn Knuckle `jotun_knuckle` | rare | 4 Job | ATK 175 | Gnawed Brute Lv 53 (Gnawed Roots) |
| 57 | **Rootknot Maul** (ใหม่) `rootknot_maul` | uncommon | 4 Job | ATK 170 | Nidhogg Spawn Lv 63 (Nidhogg's Hollow) |
| 62 | **Rotbark Warhammer** (ใหม่) `rotbark_warhammer` | rare | 4 Job | ATK 188 | Nidhogg Spawn Lv 63 (Nidhogg's Hollow) |
| 65 | **Shellsplitter Mace** (ใหม่) `shellsplitter_mace` | uncommon | 4 Job | ATK 184 | Rot Colossus Lv 69 (Nidhogg's Hollow) |
| 69 | Colossus Maul `colossus_maul` | uncommon | 4 Job | ATK 196 | Rot Colossus Lv 69 (Nidhogg's Hollow) |

## เกราะตัว (armor)

| Lv | ไอเทม | ความหายาก | ใช้ได้ | ค่า | ดรอปจาก |
|---|---|---|---|---|---|
| 4 | Gel-Lined Vest `gel_vest` | uncommon | ทุก Job | DEF 3 · MDEF 2 | Gel Unit Lv 1 (Emerald Meadow) |
| 8 | Gelheart Mail `gelheart_mail` | rare | ทุก Job | DEF 4 · MDEF 4 | Rust Sentry Lv 8 (Mistlake Plains) |
| 12 | Mistweave Robe `mist_robe` | uncommon | ทุก Job | DEF 3 · MDEF 12 | Moss Unit Lv 14 (Mistlake Plains) |
| 12 | Sentry Plating `sentry_plate` | uncommon | 3 Job | DEF 6 | Hopper Unit Lv 9 (Mistlake Plains) |
| 18 | Gravecloth Mail `grave_mail` | uncommon | 6 Job | DEF 6 · MDEF 3 | Draugr Husk Lv 17 (Hel's Hollow) |
| 20 | Mesh Armor `chain_mail` | uncommon | 3 Job | DEF 8 | Iron Brute Lv 26 (Wolfwood Forest) |
| 20 | **Hearthglass Robe** (ใหม่) `hearthglass_robe` | uncommon | ทุก Job | DEF 4 · MDEF 13 | Frame Warden Lv 24 (Hel's Hollow) |
| 26 | Ironhide Plating `ironhide_plate` | uncommon | 3 Job | DEF 8 | Iron Brute Lv 26 (Wolfwood Forest) |
| 27 | **Packhide Jerkin** (ใหม่) `packhide_jerkin` | uncommon | ทุก Job | DEF 6 · MDEF 4 | Hel Guard Unit Lv 32 (Hel's Hollow) |
| 30 | Helwick Robe `helwick_robe` | rare | ทุก Job | DEF 4 · MDEF 14 | Hel Maiden Unit Lv 30 (Hel's Hollow) |
| 32 | Helgate Plating `helgate_plate` | uncommon | 3 Job | DEF 9 | Hel Guard Unit Lv 32 (Hel's Hollow) |
| 35 | Titan Plate `plate_armor` | rare | 1 Job | DEF 12 | Archive Warden Lv 36 (Archive Depths) |
| 38 | **Vaultguard Coat** (ใหม่) `vaultguard_coat` | uncommon | ทุก Job | DEF 8 · MDEF 4 | Archive Maiden Lv 41 (Archive Depths) |
| 42 | Rootbark Plating `rootbark_plate` | rare | 6 Job | DEF 9 · MDEF 4 | Rust Husk Lv 44 (Archive Depths) |
| 44 | Rusthusk Plating `husk_plate` | uncommon | 3 Job | DEF 11 | Rust Husk Lv 44 (Archive Depths) |
| 46 | **Cipherweave Robe** (ใหม่) `cipherweave_robe` | uncommon | ทุก Job | DEF 5 · MDEF 14 | Gnawed Brute Lv 53 (Gnawed Roots) |
| 53 | Gnawed Bulwark `brute_plate` | uncommon | 3 Job | DEF 13 | Gnawed Brute Lv 53 (Gnawed Roots) |
| 54 | **Rootsage Robe** (ใหม่) `rootsage_robe` | rare | ทุก Job | DEF 5 · MDEF 14 | Rust Bloom Lv 58 (Nidhogg's Hollow) |
| 62 | **Hollowhide Vest** (ใหม่) `hollowhide_vest` | uncommon | ทุก Job | DEF 11 · MDEF 6 | Rootbound Guard Lv 66 (Nidhogg's Hollow) |
| 64 | Abyssal Robe `abyssal_robe` | rare | ทุก Job | DEF 5 · MDEF 15 | Hollow Shell Lv 61 (Nidhogg's Hollow) / Rootbound Guard Lv 66 (Nidhogg's Hollow) |
| 69 | Colossus Plating `colossus_plate` | uncommon | 3 Job | DEF 15 | Rot Colossus Lv 69 (Nidhogg's Hollow) |

## หมวก (head)

| Lv | ไอเทม | ความหายาก | ใช้ได้ | ค่า | ดรอปจาก |
|---|---|---|---|---|---|
| 3 | Bunny-Ear Visor `bunny_visor` | uncommon | ทุก Job | DEF 2 | Bunny Unit Lv 3 (Emerald Meadow) |
| 5 | Moonlit Ears `moonlit_ears` | uncommon | ทุก Job | DEF 2 | Moonlit Bunny Unit Lv 7 (Elite) |
| 12 | Iron Helm `iron_helm` | uncommon | 6 Job | DEF 4 | Sentry Captain Lv 14 (Elite) |
| 13 | Blastcap Helm `blastcap_helm` | uncommon | ทุก Job | DEF 4 | Mine Unit Lv 12 (Mistlake Plains) |
| 14 | Verdant Circlet `verdant_circlet` | rare | ทุก Job | DEF 2 · MDEF 4 | Moss Unit Lv 14 (Mistlake Plains) |
| 18 | Ashen Hood `ash_hood` | uncommon | ทุก Job | DEF 3 | Ash Stalker Lv 18 (Wolfwood Forest) |
| 22 | **Emberscout Cap** (ใหม่) `emberscout_cap` | uncommon | ทุก Job | DEF 4 | Iron Brute Lv 26 (Wolfwood Forest) |
| 22 | Seraph Wings `seraph_wings` | epic | ทุก Job | DEF 3 · MDEF 5 | Seraph Core Lv 25 (Mistlake Plains) |
| 27 | Tusked Helm `tusk_helm` | uncommon | ทุก Job | DEF 5 | Tusk Trooper Lv 28 (Wolfwood Forest) |
| 30 | Aureole of Baldr `aureole` | legend | ทุก Job | DEF 5 · MDEF 8 | Seraph Core Lv 25 (Mistlake Plains) |
| 30 | Lantern Veil `lantern_veil` | uncommon | ทุก Job | DEF 3 · MDEF 8 | Hel Maiden Unit Lv 30 (Hel's Hollow) |
| 36 | Archive Warden Helm `warden_helm` | uncommon | ทุก Job | DEF 6 | Archive Warden Lv 36 (Archive Depths) |
| 42 | Kitsura Faceplate `kitsura_visor` | epic | ทุก Job | DEF 5 · MDEF 6 | Kitsura EX Lv 45 (Hel's Hollow) |
| 44 | Crown of the Rust King `rustking_crown` | rare | ทุก Job | DEF 6 · MDEF 4 | Rust Husk Lv 44 (Archive Depths) |
| 50 | **Rootseer Circlet** (ใหม่) `rootseer_circlet` | rare | ทุก Job | DEF 6 · MDEF 6 | Root Gnawer Lv 57 (Gnawed Roots) |
| 57 | Gnawer Hide Hood `gnawer_hood` | uncommon | ทุก Job | DEF 7 | Root Gnawer Lv 57 (Gnawed Roots) |
| 61 | Hollowshell Helm `shell_helm` | uncommon | ทุก Job | DEF 8 | Hollow Shell Lv 61 (Nidhogg's Hollow) |
| 66 | **Hollowplate Helm** (ใหม่) `hollowplate_helm` | uncommon | ทุก Job | DEF 9 | Rootbound Guard Lv 66 (Nidhogg's Hollow) |

## โล่ (shield)

| Lv | ไอเทม | ความหายาก | ใช้ได้ | ค่า | ดรอปจาก |
|---|---|---|---|---|---|
| 6 | Scrap Buckler `scrap_buckler` | uncommon | ทุก Job | DEF 4 | Bunny Unit Lv 3 (Emerald Meadow) |
| 12 | Barkplate Shield `bark_shield` | uncommon | ทุก Job | DEF 5 | Hopper Unit Lv 9 (Mistlake Plains) |
| 14 | Energy Buckler `round_shield` | uncommon | 3 Job | DEF 5 | Draugr Husk Lv 17 (Hel's Hollow) |
| 20 | **Ember Kite Shield** (ใหม่) `ember_kite` | uncommon | ทุก Job | DEF 5 | Fenrir Unit Lv 25 (Wolfwood Forest) |
| 24 | Bonewall Shield `bonewall_shield` | uncommon | 3 Job | DEF 6 | Frame Warden Lv 24 (Hel's Hollow) |
| 27 | **Packhide Buckler** (ใหม่) `packhide_buckler` | uncommon | ทุก Job | DEF 6 | Hel Maiden Unit Lv 30 (Hel's Hollow) |
| 34 | Aegis of Hel `hel_aegis` | rare | ทุก Job | DEF 8 · MDEF 3 | Archive Maiden Lv 41 (Archive Depths) |
| 41 | **Vault Door Shield** (ใหม่) `vault_door_shield` | uncommon | ทุก Job | DEF 8 · MDEF 2 | Rust Husk Lv 44 (Archive Depths) |
| 49 | Heartwood Buckler `stump_buckler` | uncommon | ทุก Job | DEF 8 · MDEF 2 | Gnawed Sentry Lv 49 (Gnawed Roots) |
| 52 | Rootguard Shield `rootguard_shield` | uncommon | 3 Job | DEF 9 · MDEF 2 | Gnawed Brute Lv 53 (Gnawed Roots) |
| 57 | **Rootwall Buckler** (ใหม่) `rootwall_buckler` | uncommon | ทุก Job | DEF 9 · MDEF 3 | Hollow Shell Lv 61 (Nidhogg's Hollow) |
| 65 | **Shellback Shield** (ใหม่) `shellback_shield` | uncommon | ทุก Job | DEF 10 · MDEF 3 | Rootbound Guard Lv 66 (Nidhogg's Hollow) |
| 66 | Rootbound Shield `rootbound_shield` | uncommon | 3 Job | DEF 10 · MDEF 3 | Rootbound Guard Lv 66 (Nidhogg's Hollow) |
| 68 | Scale of Nidhogg `nid_scale` | epic | 3 Job | DEF 12 · MDEF 6 | Nidhogg Lv 70 (Nidhogg's Hollow) |

## ผ้าคลุม (garment)

| Lv | ไอเทม | ความหายาก | ใช้ได้ | ค่า | ดรอปจาก |
|---|---|---|---|---|---|
| 5 | Rotor-Fin Cape `rotor_cape` | uncommon | ทุก Job | DEF 1 | Buzz Unit Lv 4 (Emerald Meadow) |
| 10 | Cable Scarf `muffler` | uncommon | ทุก Job | DEF 2 | Rust Sentry Lv 8 (Mistlake Plains) |
| 14 | Mistlake Mantle `mist_mantle` | uncommon | ทุก Job | DEF 2 · MDEF 2 | Moss Unit Lv 14 (Mistlake Plains) |
| 18 | Ashtail Wrap `ashtail_wrap` | uncommon | ทุก Job | DEF 2 | Ash Stalker Lv 18 (Wolfwood Forest) |
| 20 | Cindertail Cloak `cinder_cloak` | rare | ทุก Job | DEF 3 | Ash Stalker Lv 18 (Wolfwood Forest) |
| 20 | Seraph Down Mantle `seraph_mantle` | epic | ทุก Job | DEF 3 · MDEF 6 | Seraph Core Lv 25 (Mistlake Plains) |
| 24 | Wolfpelt Cloak `wolfpelt_cloak` | uncommon | ทุก Job | DEF 2 | Fenrir Unit Lv 25 (Wolfwood Forest) |
| 28 | Alpha Pelt Mantle `alpha_mantle` | uncommon | ทุก Job | DEF 2 | Fenrir Alpha Unit Lv 30 (Elite) |
| 36 | Vaultkeeper's Cloak `vault_cloak` | uncommon | ทุก Job | DEF 3 · MDEF 3 | Rust Mine Unit Lv 38 (Archive Depths) |
| 40 | Nine-Ember Tail `kitsune_tail` | epic | ทุก Job | DEF 4 · MDEF 4 | Kitsura EX Lv 45 (Hel's Hollow) |
| 40 | Rootweave Cloak `root_cloak` | rare | ทุก Job | DEF 3 · MDEF 3 | Root Crawler Unit Lv 46 (Gnawed Roots) |
| 41 | Archive Maiden's Shroud `maiden_shroud` | uncommon | ทุก Job | DEF 3 · MDEF 6 | Archive Maiden Lv 41 (Archive Depths) |
| 48 | **Rootmoth Mantle** (ใหม่) `rootmoth_mantle` | uncommon | ทุก Job | DEF 3 · MDEF 4 | Gnawed Brute Lv 53 (Gnawed Roots) |
| 55 | Mantle of the Gatehound `garmr_mantle` | epic | ทุก Job | DEF 5 · MDEF 5 | Garmr Lv 60 (Gnawed Roots) |
| 56 | **Verdigris Cape** (ใหม่) `verdigris_cape` | rare | ทุก Job | DEF 4 · MDEF 4 | Hollow Shell Lv 61 (Nidhogg's Hollow) |
| 64 | **Hollowshade Cloak** (ใหม่) `hollowshade_cloak` | uncommon | ทุก Job | DEF 5 · MDEF 5 | Nidhogg Spawn Lv 63 (Nidhogg's Hollow) |
| 66 | Wings of Nidhogg `nid_wings` | epic | ทุก Job | DEF 6 · MDEF 6 | Nidhogg Lv 70 (Nidhogg's Hollow) |

## รองเท้า (shoes)

| Lv | ไอเทม | ความหายาก | ใช้ได้ | ค่า | ดรอปจาก |
|---|---|---|---|---|---|
| 4 | Crawler Treads `crawler_treads` | uncommon | ทุก Job | DEF 2 | Crawler Unit Lv 2 (Emerald Meadow) |
| 12 | Spring-Heel Greaves `spring_greaves` | uncommon | ทุก Job | DEF 2 | Hopper Unit Lv 9 (Mistlake Plains) |
| 20 | Mag Boots `boots` | uncommon | ทุก Job | DEF 4 | Fenrir Unit Lv 25 (Wolfwood Forest) |
| 24 | Wolfpath Boots `wolfpath_boots` | uncommon | ทุก Job | DEF 3 | Fenrir Unit Lv 25 (Wolfwood Forest) |
| 28 | Charger Greaves `charger_greaves` | rare | ทุก Job | DEF 4 | Tusk Trooper Lv 28 (Wolfwood Forest) |
| 33 | **Vaultstep Greaves** (ใหม่) `vaultstep_greaves` | uncommon | ทุก Job | DEF 4 | Archive Warden Lv 36 (Archive Depths) |
| 38 | Blastproof Greaves `blast_greaves` | uncommon | ทุก Job | DEF 4 | Rust Mine Unit Lv 38 (Archive Depths) |
| 46 | Rootrunner Boots `rootrunner_boots` | rare | ทุก Job | DEF 5 | Root Crawler Unit Lv 46 (Gnawed Roots) |
| 53 | Gnawhide Boots `gnawhide_boots` | uncommon | ทุก Job | DEF 5 | Gnawed Brute Lv 53 (Gnawed Roots) |
| 58 | **Rootwalker Boots** (ใหม่) `rootwalker_boots` | uncommon | ทุก Job | DEF 5 | Hollow Shell Lv 61 (Nidhogg's Hollow) |
| 63 | Wyrmhide Boots `wyrmhide_boots` | uncommon | ทุก Job | DEF 6 | Nidhogg Spawn Lv 63 (Nidhogg's Hollow) |

## เครื่องประดับ (acc)

| Lv | ไอเทม | ความหายาก | ใช้ได้ | ค่า | ดรอปจาก |
|---|---|---|---|---|---|
| 1 | Meadow Charm `meadow_charm` | rare | ทุก Job |  | Buzz Unit Lv 4 (Emerald Meadow) |
| 5 | Ember Coil Ring `ember_coil` | uncommon | ทุก Job |  | Ember Unit Lv 3 (Emerald Meadow) |
| 6 | Hearthcore Earring `hearth_coil` | rare | ทุก Job |  | Ember Unit Lv 3 (Emerald Meadow) |
| 10 | Sentinel Core `sentinel_core` | rare | ทุก Job |  | Rust Sentry Lv 8 (Mistlake Plains) |
| 14 | Sentry Captain Crest `captain_crest` | uncommon | ทุก Job |  | Sentry Captain Lv 14 (Elite) |
| 15 | Coilspring Band `spring_band` | uncommon | ทุก Job |  | Sentry Captain Lv 14 (Elite) |
| 17 | Husk Signet `husk_signet` | rare | ทุก Job |  | Draugr Husk Lv 17 (Hel's Hollow) |
| 24 | Signal Earring `earring` | uncommon | ทุก Job |  | Fenrir Alpha Unit Lv 30 (Elite) |
| 24 | Grip Glove `glove` | uncommon | ทุก Job |  | Fenrir Alpha Unit Lv 30 (Elite) |
| 24 | Power Ring `ring` | uncommon | ทุก Job |  | Fenrir Alpha Unit Lv 30 (Elite) |
| 25 | Gleipnir Link `gleipnir_link` | rare | ทุก Job |  | Fenrir Unit Lv 25 (Wolfwood Forest) |
| 26 | Bearheart Band `bearheart_band` | rare | ทุก Job |  | Iron Brute Lv 26 (Wolfwood Forest) |
| 28 | Rune Charm `rune_charm` | uncommon | ทุก Job |  | Rust Sap Unit Lv 33 (Archive Depths) |
| 33 | Rustbloom Talisman `rustbloom_talisman` | rare | ทุก Job |  | Rust Sap Unit Lv 33 (Archive Depths) |
| 45 | Ember of Ragnarök `ragnarok_ember` | legend | ทุก Job |  | Kitsura EX Lv 45 (Hel's Hollow) |
| 52 | Sigil of Yggdrasil `yggdrasil_sigil` | rare | ทุก Job |  | Gnawed Sentry Lv 49 (Gnawed Roots) |
| 55 | Garmr Collar `garmr_collar` | epic | ทุก Job |  | Garmr Lv 60 (Gnawed Roots) |
| 58 | Bloomheart Charm `bloomheart_charm` | rare | ทุก Job |  | Rust Bloom Lv 58 (Nidhogg's Hollow) / Rootbound Guard Lv 66 (Nidhogg's Hollow) |
| 63 | Venomcoil Band `venomcoil_band` | rare | ทุก Job |  | Hollow Shell Lv 61 (Nidhogg's Hollow) / Nidhogg Spawn Lv 63 (Nidhogg's Hollow) |
| 70 | Heart of the Gnawer `nid_heart` | legend | ทุก Job |  | Nidhogg Lv 70 (Nidhogg's Hollow) |

