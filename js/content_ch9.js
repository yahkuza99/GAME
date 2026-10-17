'use strict';
// ============================================================
//  ภาคที่ 2 — กิ่งที่เหลือ • บทที่ 9 — ท้องของหมาป่า (Lv 85–99) • บทสุดท้ายของภาคที่ 2 (docs/STORY.md §5)
//  หัวของ Nidhogg ในท้อง Fenrir ยังไม่ดับ — มันกลืนประกายดวงใหม่ที่ปลายกิ่งไป (จบบทที่ 8)
//  แผนที่ใหม่: Belly of the Wolf (Lv 85–98, MVP Fenrir Lv 99) — ทางเข้าคือขากรรไกรที่ขอบเหนือของ Severed Bough
//  ไฟล์นี้เพิ่ม: มอน 5 ชนิด + MVP (ชุดท่าใน BossKit + Ancient ใน worldboss.js) • ไอเทม/อุปกรณ์ Lv 85–99 + ของตำนาน • ชิป • เควสต์ ch9_* 8 อัน
//  NPC: Loki ในท้องหมาป่า (loki_maw) • ฉากจบภาค 2 ที่ Mimir • บทพูดแยกตามทางเลือก Core ของบทที่ 5
//
//  ลำดับโหลด: หลัง js/content_ch8.js (ใช้ window.Part2Kit) และก่อน js/balance.js / js/worldboss.js
//  ห้ามเปลี่ยน id ในไฟล์นี้หลังปล่อยแล้ว (เซฟอ้างอิง: เควสต์ ch9_* / ไอเทม / มอน / แผนที่ wolfbelly / flag c9* ใน p.story)
// ============================================================
(() => {
  const { variant, eq, etc, chip, toP, cue, ancient, kick, by, NARR } = window.Part2Kit;

  // ===================== ไอเทม =====================
  etc('wolf_bile', 'Wolf Bile', 1480, { s: 'potion', c: '#9ad070' }, ['moss_gel', -40, 0.5], 'น้ำย่อยของหมาป่าเหล็ก ย่อยสนิมได้ — ย่อยถุงมือก็ได้ ระวังด้วย', "The iron wolf's digestive fluid. It dissolves rust — and gloves, so be careful.");
  etc('gleipnir_strand', 'Gleipnir Strand', 1570, { s: 'feather', c: '#d8d8f0' }, ['root_fiber', 150, 0.55], 'เส้นโซ่ที่บางกว่าเส้นไหม ดึงสุดแรงก็ไม่ขาด', 'A strand of chain thinner than silk. Pull with all your strength, and it still will not break.');
  etc('moon_fang', 'Moon Fang', 1660, { s: 'shell', c: '#e0e4f0' }, ['fenrir_fang', 0, 0.45], 'เขี้ยวที่ Fenrir ผลัดในท้องตัวเอง สีขาวเหมือนเดือนที่มันไม่เคยได้กิน', 'A fang Fenrir shed inside itself, white as the moon it never got to swallow.');
  etc('einherjar_rune', 'Einherjar Rune', 1760, { s: 'gem', c: '#f0d080' }, ['yggdrasil_shard', 40, 0.55], 'รูนประจำตัวยามเกียรติยศของ Odin สลักชื่อไว้ทั้งด้านหน้าและด้านหลัง', "The service rune of one of Odin's honor guard, a name engraved on both its faces.");
  etc('rustfang_scale', 'Rustfang Scale', 1860, { s: 'shell', c: '#5ad070' }, ['fenrir_fang', 100, 0.55], 'เกล็ดสนิมที่ยังมีแสงเขียวเต้นเป็นจังหวะเดียวกับหัวของ Nidhogg', 'A rust scale whose green light still pulses in time with the head of Nidhogg.');

  // ---------- อุปกรณ์ Lv 85–99 (ต่อจาก js/content_ch8.js) ----------
  // ---- Bile Unit (Lv 86) ----
  eq('bilecrest_circlet', 'Bilecrest Circlet', 'head', 85, 'rare', { def: 7, mdef: 7, b: { int: 3, vit: 2, sp: 80 }, c: '#b8e090', art: 'ribbon' },
    'มงกุฎบางที่มอสย่อยสนิมไม่ยอมแตะ ใส่แล้วความคิดใสขึ้น', 'A thin circlet the rust-moss will not touch. Wear it and your thoughts run clear.');
  eq('gullet_kris', 'Gullet Kris', 'dagger', 87, 'uncommon', { atk: 216, b: { agi: 3, crit: 5, luk: 2 }, c: '#9ad070', art: 'stiletto' },
    'กริชที่ผ่านน้ำย่อยหมาป่ามาแล้วไม่ละลาย คมขึ้นเสียด้วย', 'A kris that went through the wolf\'s bile without dissolving — and came out sharper.');
  eq('wolfgut_coat', 'Wolfgut Coat', 'armor', 87, 'uncommon', { def: 14, mdef: 9, b: { vit: 2, agi: 1, hp: 340 }, c: '#7a9a60', art: 'leather_vest' },
    'เสื้อหนังเคลือบมอสที่ย่อยสนิม สนิมเกาะไม่ติด', 'A coat glazed with rust-eating moss. No rust will cling to it.');
  eq('bilewalker_boots', 'Bilewalker Boots', 'shoes', 87, 'uncommon', { def: 7, b: { agi: 2, vit: 2, speedPct: 3, hp: 210 }, c: '#8ab070', art: 'boots' },
    'รองเท้าพื้นหนาเดินในน้ำย่อยได้ทั้งวัน', 'Thick-soled boots that can wade through bile all day.');
  eq('bilelight_staff', 'Bilelight Staff', 'rod', 88, 'uncommon', { atk: 86, matk: 192, b: { int: 4, castPct: 5 }, c: '#b0f080', art: 'rune_staff' },
    'คทาที่ปลายเป็นแอ่งแสงเขียวอ่อน ส่องทางในท้องหมาป่าได้', 'A staff tipped with a soft green pool of light, enough to see by inside the wolf.');
  eq('gutwall_shield', 'Gutwall Shield', 'shield', 88, 'uncommon', { def: 13, mdef: 4, b: { vit: 2, hp: 410 }, c: '#6a8a58', art: 'round_shield' },
    'โล่ที่ตัดจากผนังท้องเหล็ก หนาและยืดหยุ่นจนแรงกระแทกเด้งกลับ', 'A shield cut from the iron gut wall, thick and springy enough to bounce a blow back.');
  eq('bilemist_shroud', 'Bilemist Shroud', 'garment', 88, 'uncommon', { def: 6, mdef: 6, b: { agi: 2, flee: 8, hp: 240 }, c: '#a8d090', art: 'muffler' },
    'ผ้าคลุมที่ซึมไอน้ำย่อย ศัตรูเห็นเจ้าเลือนเหมือนอยู่ในหมอก', 'A shroud steeped in bile-mist. Foes see you blurred, as if through fog.');
  // ---- Gleipnir Coil (Lv 89) ----
  eq('chainbite_axe', 'Chainbite Axe', 'axe', 89, 'uncommon', { atk: 258, b: { str: 3, vit: 2 }, c: '#c8c8e0', art: 'battle_axe' },
    'ขวานที่สันพันด้วยเส้น Gleipnir ฟันแล้วโซ่ดึงกลับเข้ามือเอง', 'An axe whose spine is wrapped in Gleipnir strands. After every swing the chain pulls it back into your hand.');
  eq('chainlink_helm', 'Chainlink Helm', 'head', 89, 'uncommon', { def: 12, b: { vit: 2, str: 1, hp: 180 }, c: '#b0b0d0', art: 'iron_helm' },
    'หมวกถักจากข้อโซ่บาง ๆ เบาเหมือนผ้า แข็งเหมือนเหล็ก', 'A helm knitted from thin chain links — light as cloth, hard as iron.');
  eq('silkchain_ring', 'Silkchain Ring', 'acc', 89, 'uncommon', { b: { str: 2, agi: 2, dex: 2, hp: 120 }, c: '#e0e0f8', art: 'ring' },
    'แหวนข้อโซ่ Gleipnir ข้อเล็กที่สุด สวมแล้วไม่มีอะไรมัดเจ้าได้', 'A ring made from the smallest link of Gleipnir. Wear it, and nothing can bind you.');
  eq('gleipnir_edge', 'Gleipnir Edge', 'sword', 90, 'uncommon', { atk: 260, b: { str: 3, dex: 2 }, c: '#d0d0f0', art: 'broadsword' },
    'ดาบที่คมทำจากเส้นโซ่ดึงตึง บางจนมองไม่เห็นคม', 'A sword whose edge is a strand of chain drawn taut — so thin the edge cannot be seen.');
  eq('chainstring_bow', 'Chainstring Bow', 'bow', 90, 'uncommon', { atk: 245, b: { dex: 3, agi: 2 }, c: '#c0c0e8', art: 'great_bow' },
    'ธนูสายโซ่ Gleipnir ดึงแล้วไม่มีวันขาด ลูกศรพุ่งไกลกว่าตามองเห็น', 'A bow strung with Gleipnir. The string will never snap, and its arrows fly farther than sight.');
  eq('coilbound_plate', 'Coilbound Plate', 'armor', 90, 'uncommon', { def: 19, b: { vit: 3, hp: 440 }, jobs: J.heavy, c: '#a0a0c0', art: 'plate_armor' },
    'เกราะหนักที่มีโซ่ขดพันรอบตัว รับแรงกระแทกแล้วกระจายไปตามข้อโซ่', 'Heavy plate wrapped in coiled chain. A blow is spread out along every link.');
  eq('linkbreaker_mace', 'Linkbreaker Mace', 'mace', 91, 'uncommon', { atk: 245, b: { str: 3, vit: 2 }, c: '#b8b8d8', art: 'morning_star' },
    'กระบองที่ Brokk ตีไว้ทุบข้อโซ่ที่ไม่ยอมคลาย — ยังไม่เคยทุบ Gleipnir ขาด', 'A mace Brokk forged to break stubborn links. It has never broken Gleipnir.');
  eq('coilfang_kris', 'Coilfang Kris', 'dagger', 91, 'rare', { atk: 222, b: { agi: 5, crit: 8, luk: 4 }, c: '#e8e8ff', art: 'stiletto' },
    'กริชคดเหมือนโซ่ที่ขด แทงแล้วบิดตามแผลเอง', 'A kris coiled like chain. It twists along the wound on its own.');
  // ---- Fangborn Unit (Lv 92) ----
  eq('moonfang_rod', 'Moonfang Rod', 'rod', 92, 'rare', { atk: 88, matk: 200, b: { int: 5, matkPct: 7, castPct: 5 }, c: '#e8ecff', art: 'seer_staff' },
    'คทาจากเขี้ยวขาวที่ Fenrir ผลัด เวทออกมาเย็นและสว่างเหมือนแสงเดือน', 'A rod of a white fang Fenrir shed. Its spells come out cold and bright as moonlight.');
  eq('fangborn_charm', 'Fangborn Charm', 'acc', 92, 'rare', { b: { str: 3, agi: 3, crit: 3, hp: 250 }, c: '#f0f0ff', art: 'earring' },
    'ต่างหูเขี้ยวเล็กของลูกหมาป่าในท้อง ได้ยินเสียงหอนที่คนอื่นไม่ได้ยิน', 'An earring of a belly-born wolf\'s little fang. You hear howls no one else can.');
  eq('moonbite_axe', 'Moonbite Axe', 'axe', 93, 'rare', { atk: 266, b: { str: 4, vit: 2, leech: 3 }, c: '#d8dcf0', art: 'battle_axe' },
    'ขวานคมโค้งเหมือนเดือนเสี้ยว ฟันแล้วแรงไหลกลับเข้าร่าง', 'An axe curved like a crescent moon. Every cut draws strength back into your frame.');
  eq('fangsplit_blade', 'Fangsplit Blade', 'sword', 94, 'rare', { atk: 265, b: { str: 4, dex: 2, leech: 3 }, c: '#e0e4f8', art: 'valhalla_blade' },
    'ดาบที่ผ่าเขี้ยวหมาป่าได้ตามยาว ไม่เคยบิ่นสักครั้ง', 'A blade that can split a wolf fang lengthwise, and has never once chipped.');
  eq('howlstring_bow', 'Howlstring Bow', 'bow', 94, 'rare', { atk: 250, b: { dex: 5, agi: 2, crit: 6 }, c: '#d0d8f0', art: 'composite_bow' },
    'ธนูที่สายสั่นเป็นเสียงหอนทุกครั้งที่ปล่อย ศัตรูหันมองก่อนรู้ตัวว่าโดน', 'A bow whose string howls on release. Foes turn to look before they know they are hit.');
  // ---- Einherjar Remnant (Lv 95) ----
  eq('remnant_dirk', 'Remnant Dirk', 'dagger', 95, 'uncommon', { atk: 235, b: { agi: 4, crit: 5, luk: 2 }, c: '#e0c880', art: 'knife' },
    'มีดสั้นประจำยามเกียรติยศ ตราของ Odin ที่ด้ามสึกจนเกือบเรียบ', 'The dirk of an honor guard. The mark of Odin on its grip is worn almost smooth.');
  eq('remnant_hauberk', 'Remnant Hauberk', 'armor', 95, 'uncommon', { def: 15, mdef: 10, b: { vit: 3, agi: 1, hp: 380 }, c: '#c8b070', art: 'padded_plate' },
    'เสื้อเกราะของ Einherjar ที่ยืนเฝ้ามาสามสิบปี ไม่เคยถอดออกสักคืน', 'The hauberk of an Einherjar who stood watch for thirty years without taking it off a single night.');
  eq('remnant_greaves', 'Remnant Greaves', 'shoes', 95, 'uncommon', { def: 8, b: { agi: 2, vit: 2, speedPct: 3, hp: 230 }, c: '#b8a068', art: 'boots' },
    'สนับแข้งของยามที่ไม่เคยถอยแม้แต่ก้าวเดียว', 'The greaves of a guard who never once took a step back.');
  eq('valkyrie_rod', 'Valkyrie Rod', 'rod', 96, 'uncommon', { atk: 90, matk: 209, b: { int: 5, castPct: 5 }, c: '#f0e0b0', art: 'rune_staff' },
    'คทาของผู้เลือกวีรชน ปลายคทาชี้ไปหาคนที่ยังสู้ได้เสมอ', 'The rod of a chooser of heroes. Its tip always points at whoever can still fight.');
  eq('remnant_aegis', 'Remnant Aegis', 'shield', 96, 'uncommon', { def: 14, mdef: 5, b: { vit: 3, hp: 450 }, c: '#d0b878', art: 'guard' },
    'โล่ทรงกลมที่ล้อมประกายของ Odin มาสามสิบปี รอยตีด้านนอกนับไม่ถ้วน', 'A round shield that ringed Odin\'s spark for thirty years. The dents on its face are past counting.');
  eq('remnant_cape', 'Remnant Cape', 'garment', 96, 'uncommon', { def: 7, mdef: 7, b: { agi: 2, flee: 8, hp: 260 }, c: '#a89058', art: 'muffler' },
    'ผ้าคลุมยามสีทองหม่นที่ขาดเป็นริ้ว ยังพลิ้วเหมือนมีลมจากวัลฮัลลา', 'A tattered cape of faded gold that still sways as if in a wind from Valhalla.');
  eq('einherjar_hammer', 'Einherjar Hammer', 'mace', 95, 'rare', { atk: 252, b: { str: 4, vit: 3, atkPct: 4 }, c: '#e0c070', art: 'morning_star' },
    'ค้อนที่ Einherjar ใช้ตีกลองเรียกพวก ตีแล้วทุกคนข้าง ๆ ยืนตรงขึ้น', 'The hammer an Einherjar beat the muster-drum with. Strike, and everyone beside you stands taller.');
  // ---- Rustfang Wyrm (Lv 98) ----
  eq('wyrmjaw_axe', 'Wyrmjaw Axe', 'axe', 97, 'uncommon', { atk: 276, b: { str: 4, vit: 1 }, c: '#5ac070', art: 'battle_axe' },
    'ขวานที่หัวเป็นกรามมังกรสนิม ยังงับได้อยู่ถ้าเผลอ', 'An axe headed with a rust-wyrm\'s jaw. It can still bite, if you are careless.');
  eq('wyrmscale_helm', 'Wyrmscale Helm', 'head', 97, 'uncommon', { def: 13, b: { vit: 3, str: 1, hp: 200 }, c: '#4aa060', art: 'iron_helm' },
    'หมวกเกล็ดมังกรสนิมที่ล้างแสงเขียวออกแล้ว — เกือบหมด', 'A helm of rust-wyrm scale with the green light scrubbed out — almost all of it.');
  eq('nightmoon_robe', 'Nightmoon Robe', 'armor', 97, 'rare', { def: 7, mdef: 19, b: { int: 5, sp: 120, castPct: 6 }, c: '#c8d0f0', art: 'silk_robe' },
    'ชุดคลุมสีเดือนค่ำที่ทอในท้องหมาป่า ที่ซึ่งไม่เคยมีเดือน', 'A robe the color of a night moon, woven inside the wolf — where there has never been a moon.');
  eq('wyrmspine_sword', 'Wyrmspine Sword', 'sword', 98, 'uncommon', { atk: 279, b: { str: 3, dex: 2, vit: 1 }, c: '#60c078', art: 'broadsword' },
    'ดาบยาวจากกระดูกสันหลังมังกรสนิม ยืดหยุ่นแต่ไม่เคยหัก', 'A longsword from a rust-wyrm\'s spine. It flexes, but never breaks.');
  eq('wyrmgut_bow', 'Wyrmgut Bow', 'bow', 98, 'uncommon', { atk: 262, b: { dex: 4, agi: 2 }, c: '#58b068', art: 'great_bow' },
    'ธนูที่สายเป็นเอ็นมังกรสนิม ดีดแล้วมีเสียงคำรามต่ำ ๆ', 'A bow strung with rust-wyrm sinew. It growls low on every shot.');
  eq('wyrmskull_maul', 'Wyrmskull Maul', 'mace', 98, 'uncommon', { atk: 260, b: { str: 3, vit: 3 }, c: '#4a9a58', art: 'morning_star' },
    'ค้อนหัวกะโหลกมังกรสนิม ตีลงพื้นแล้วสนิมรอบตัวสั่นกลัว', 'A maul headed with a rust-wyrm skull. Strike the ground and the rust around you trembles.');
  // ---- MVP: Fenrir (Lv 99) — ชุดเซ็ต Fenrisúlfr + ของตำนาน 2 ชิ้น ----
  eq('fen_jaw', 'Jaw of Fenrir', 'axe', 97, 'epic', { atk: 290, b: { str: 5, vit: 2, atkPct: 6 }, c: '#d8dcf0', art: 'battle_axe' },
    'กรามของหมาป่าที่กลืนเทพได้ ตอนนี้กัดเฉพาะสิ่งที่เจ้าชี้', 'The jaw of the wolf that swallowed a god. Now it bites only what you point at.');
  eq('fen_moonrod', 'Moonhowl of Fenrir', 'rod', 97, 'epic', { atk: 96, matk: 228, b: { int: 6, matkPct: 7 }, c: '#e8ecff', art: 'seer_staff' },
    'คทาที่เก็บเสียงหอนสุดท้ายของ Fenrir ไว้ เวทออกมาพร้อมเสียงหอนไกล ๆ', "A staff that holds Fenrir's last howl. Every spell carries a distant howl with it.");
  eq('fen_pelt', 'Pelt of Fenrir', 'armor', 96, 'epic', { def: 16, mdef: 11, b: { vit: 4, hpPct: 8, stunRes: 15 }, c: '#c0c4d8', art: 'leather_vest' },
    'แผ่นเกราะหลังของ Fenrir ที่ไม่มีโซ่ไหนรัดได้แน่น', "Fenrir's back plating, which no chain ever held tight.");
  eq('fen_stride', 'Stride of Fenrir', 'shoes', 95, 'epic', { def: 9, b: { agi: 4, speedPct: 8, flee: 8 }, c: '#b8bcd0', art: 'boots' },
    'รองเท้าที่ก้าวไกลเท่าหมาป่าวิ่งไล่เดือน', 'Boots whose every stride is as long as a wolf chasing the moon.');
  eq('gungnir', 'Gungnir', 'sword', 99, 'legend', { atk: 312, b: { str: 6, dex: 4, atkPct: 8, crit: 5 }, c: '#ffe0a0', art: 'valhalla_blade' },
    'อาวุธของ Odin ที่ถูกกลืนไปพร้อมเจ้าของ ไม่เคยพลาดเป้าที่ตั้งใจ', 'The weapon of Odin, swallowed along with its master. It has never missed what it was meant for.');
  eq('draupnir', 'Draupnir', 'acc', 99, 'legend', { b: { str: 5, agi: 5, vit: 5, int: 5, dex: 5, luk: 5, hpPct: 7, spPct: 7 }, c: '#ffd870', art: 'ring' },
    'แหวนของ Odin ทุกคืนที่เก้ามันหยดแหวนวงใหม่ออกมาแปดวง — สามสิบปีในท้องหมาป่า มันหยดแต่สนิม', 'The ring of Odin. Every ninth night it drips eight new rings — for thirty years in the wolf, it dripped only rust.');
  // รางวัลเรื่องราว (จบภาค 2) — ไม่ดรอปจากมอน (quest: true)
  eq('second_spark', 'Badge of the Second Spark', 'acc', 1, 'rare', { price: 2, quest: true, b: { str: 2, agi: 2, vit: 2, int: 2, dex: 2, luk: 2, hp: 200 }, c: '#9affd8', art: 'clip', tk: 0.55 },
    'ประกายเล็ก ๆ ที่ใบที่สองฝากไว้กับเจ้า — หลักฐานว่าเจ้าไม่ได้เป็นใบเดียวอีกแล้ว', 'A small spark the second leaf left with you — proof that you are not the only leaf anymore.');

  // ---------- ชิป ----------
  chip('bile_card', 'Bile Unit Chip', 'head', { vit: 2, mdef: 4 }, '#9ad070', 'ชิปเสริม — ใส่หมวก: VIT +2, MDEF +4', 'Augment chip — Headgear slot: VIT +2, MDEF +4');
  chip('coil_card', 'Gleipnir Coil Chip', 'weapon', { atk: 22, crit: 4 }, '#d8d8f0', 'ชิปเสริม — ใส่อาวุธ: ATK +22, CRIT +4', 'Augment chip — Weapon slot: ATK +22, CRIT +4');
  chip('fangborn_card', 'Fangborn Chip', 'armor', { hp: 600, def: 2 }, '#e0e4f0', 'ชิปเสริม — ใส่ชุดเกราะ: MaxHP +600, DEF +2', 'Augment chip — Armor slot: MaxHP +600, DEF +2');
  chip('remnant_card', 'Einherjar Remnant Chip', 'garment', { str: 2, vit: 2, mdef: 3 }, '#f0d080', 'ชิปเสริม — ใส่ผ้าคลุม: STR +2, VIT +2, MDEF +3', 'Augment chip — Garment slot: STR +2, VIT +2, MDEF +3');
  chip('rustwyrm_card', 'Rustfang Wyrm Chip', 'shield', { vit: 3, hp: 400, def: 2 }, '#5ad070', 'ชิปเสริม — ใส่โล่: VIT +3, MaxHP +400, DEF +2', 'Augment chip — Shield slot: VIT +3, MaxHP +400, DEF +2');
  chip('fenrir_mvp_card', 'Fenrir Chip', 'weapon', { atkPct: 8, critDmgPct: 10 }, '#d8dcf0', '[MVP] ใส่อาวุธ: ดาเมจกายภาพ +8%, แรงคริติคอล +10%', '[MVP] Weapon slot: +8% Physical DMG, +10% Crit DMG', true);

  // ===================== มอนสเตอร์ (Lv 86–98) =====================
  // เส้นเดียวกับบทที่ 8 (exp ≈ 3460 × (lv/57)^2.5 • HP ≈ 4000 × (lv/58)^1.9 • ATK ≈ 206 × (lv/58)^1.25)
  // เผ่า: พืช 1 • ไร้รูป 1 • สัตว์กลไก 1 + MVP • อมตะ 1 • มังกร 1 • ตีก่อน 2 จาก 5 ชนิด
  Object.assign(MOBS, {
    bile_unit: variant('moss_pudding', { ownArt: true, motion: 'walk', name: 'Bile Unit', lv: 86, hp: 8450, atk: [337, 421], def: 25, mdef: 45, vit: 86, flee: 78, hit: 202, exp: 9680, jexp: 6780, speed: 1.3,
      aggro: false, element: 'poison', race: 'plant', scale: 1.15, hue: 40, sat: 1.1, bri: 0.85, tint: ['#7aa850', 0.4],
      lore: L('มอสย่อยสนิมที่ Odin ปลูกไว้ในท้องหมาป่า ให้ Fenrir กลืนสนิมได้โดยไม่ป่วย — มันย่อยทุกอย่าง ไม่เลือก', 'Rust-digesting moss Odin planted in the wolf\'s belly so Fenrir could swallow the Rust without falling ill. It digests everything — it does not choose.'),
      drops: [['wolf_bile', 0.5], ['moss_gel', 0.3], ['white_potion', 0.05], ['rune_alloy', 0.055],
        ['gullet_kris', 0.0065], ['wolfgut_coat', 0.0065], ['bilewalker_boots', 0.0065], ['bilelight_staff', 0.0065], ['gutwall_shield', 0.0065], ['bilemist_shroud', 0.0065], ['bilecrest_circlet', 0.0025]] }),
    gleipnir_coil: variant('leafworm', { ownArt: true, motion: 'walk', name: 'Gleipnir Coil', lv: 89, hp: 8700, atk: [352, 440], def: 35, mdef: 40, vit: 88, flee: 84, hit: 209, exp: 10540, jexp: 7380, speed: 1.3,
      aggro: false, stun: [10, 2], element: 'shadow', race: 'formless', scale: 1.3, hue: 150, sat: 0.2, bri: 1.25, tint: ['#d8d8f0', 0.5],
      lore: L('ข้อโซ่ Gleipnir ที่ Brokk ปลดในคืนนั้น หลุดออกมาแล้วยังคลานหาสิ่งที่จะล่าม', 'Links of Gleipnir that Brokk loosed that night. Freed, they still crawl in search of something to bind.'),
      drops: [['gleipnir_strand', 0.45], ['root_fiber', 0.3], ['white_potion', 0.05], ['volt_ore', 0.055],
        ['chainbite_axe', 0.0065], ['chainlink_helm', 0.0065], ['silkchain_ring', 0.0065], ['gleipnir_edge', 0.0065], ['chainstring_bow', 0.0065], ['coilbound_plate', 0.0065], ['linkbreaker_mace', 0.0065], ['coilfang_kris', 0.0025]] }),
    fangborn: variant('fenrir_pup', { ownArt: true, motion: 'walk', name: 'Fangborn Unit', lv: 92, hp: 9300, atk: [367, 458], def: 35, mdef: 30, vit: 92, flee: 100, hit: 216, exp: 11450, jexp: 8020, speed: 2.4,
      aggro: true, element: 'earth', race: 'brute', sat: 0.3, bri: 1.2, tint: ['#e8ecff', 0.35],
      lore: L('เขี้ยวที่ Fenrir ผลัดในท้องตัวเอง งอกขาออกมาเป็นหมาป่าตัวเล็ก — พี่น้องของ Fenrir Unit ในป่า ที่ไม่เคยเห็นแสงเดือน', 'Teeth Fenrir shed inside itself grew legs and became little wolves — siblings of the Fenrir Units in the wood, who have never seen moonlight.'),
      drops: [['moon_fang', 0.45], ['fenrir_fang', 0.3], ['white_potion', 0.05], ['rune_alloy', 0.06],
        ['moonfang_rod', 0.004], ['fangborn_charm', 0.004], ['moonbite_axe', 0.004], ['fangsplit_blade', 0.004], ['howlstring_bow', 0.004]] }),
    einherjar_remnant: variant('hel_guard', { ownArt: true, motion: 'walk', name: 'Einherjar Remnant', lv: 95, hp: 9900, atk: [382, 477], def: 45, mdef: 35, vit: 96, flee: 82, hit: 223, exp: 12410, jexp: 8690, speed: 1.4,
      aggro: false, stun: [12, 2], element: 'neutral', race: 'undead', hue: 15, sat: 0.8, bri: 1.05, tint: ['#e0c070', 0.4],
      lore: L('ยามเกียรติยศของ Odin ที่ถูกกลืนไปพร้อมเขา สามสิบปีที่ยืนล้อมประกายที่หรี่ลงทุกคืน ไม่ยอมให้ใครเข้าใกล้', "Odin's honor guard, swallowed along with him. For thirty years they have stood around a spark that dims each night, letting no one near."),
      drops: [['einherjar_rune', 0.45], ['einherjar_medal', 0.3], ['white_potion', 0.05], ['volt_ore', 0.06],
        ['remnant_dirk', 0.0065], ['remnant_hauberk', 0.0065], ['remnant_greaves', 0.0065], ['valkyrie_rod', 0.0065], ['remnant_aegis', 0.0065], ['remnant_cape', 0.0065], ['einherjar_hammer', 0.003]] }),
    rustfang_wyrm: variant('nid_spawn', { ownArt: true, motion: 'walk', name: 'Rustfang Wyrm', lv: 98, hp: 10500, atk: [397, 496], def: 40, mdef: 40, vit: 98, flee: 94, hit: 230, exp: 13410, jexp: 9390, speed: 2.1,
      aggro: true, element: 'poison', race: 'dragon', scale: 1.35, sat: 1.3, bri: 0.75, tint: ['#1a6a2a', 0.45],
      lore: L('สนิมที่หัวของ Nidhogg พ่นลงท้องหมาป่า โตเป็นมังกรเล็กที่มีวิเซอร์สีเขียวแบบเดียวกับหัวนั้น', 'Rust the head of Nidhogg spat into the wolf\'s belly, grown into small dragons with the same green visor as the head.'),
      drops: [['rustfang_scale', 0.45], ['wyrm_scale', 0.3], ['white_potion', 0.05], ['rune_alloy', 0.06],
        ['wyrmjaw_axe', 0.0075], ['wyrmscale_helm', 0.0075], ['wyrmspine_sword', 0.0075], ['wyrmgut_bow', 0.0075], ['wyrmskull_maul', 0.0075], ['nightmoon_robe', 0.0025], ['fen_moonrod', 0.0015]] }),

    // --- MVP: Fenrir (Lv 99) — หมาป่าที่ถูกล่าม ตอนนี้หัวของ Nidhogg เป็นคนบังคับร่าง ---
    fenrir: variant('garmr', { ownArt: true, motion: 'walk', name: 'Fenrir', lv: 99, hp: 150000, atk: [450, 570], def: 55, mdef: 55, vit: 99, flee: 150, hit: 250, exp: 150000, jexp: 105000, speed: 2.2,
      aggro: true, stun: [14, 2], element: 'shadow', race: 'brute', scale: 3.0, boss: true, respawn: 1200000, bossSkill: 'gleipnir',
      hue: 180, sat: 0.35, bri: 1.25, tint: ['#7ad890', 0.25],
      lore: L('โปรแกรมล่าที่แยกสนิมกับชีวิตไม่ออก มันกลืนหัวของ Nidhogg และ Odin ไปในคืนเดียว — สามสิบปีต่อมา หัวที่อยู่ข้างในเป็นคนบังคับร่าง', 'A hunting program that could never tell rust from life. It swallowed Nidhogg\'s head and Odin in a single night — and thirty years later, the head inside is the one wearing the body.'),
      drops: [['fen_jaw', 0.08], ['fen_moonrod', 0.08], ['fen_pelt', 0.08], ['fen_stride', 0.08], ['gungnir', 0.0005], ['draupnir', 0.0005], ['rustfang_scale', 0.8], ['rune_alloy', 0.8], ['yggdrasil_shard', 0.3]] }),
  });
  for (const id of ['bile_unit', 'gleipnir_coil', 'fangborn', 'einherjar_remnant', 'rustfang_wyrm', 'fenrir']) MOBS[id].id = id;
  Object.assign(MOB_CHIP, { bile_unit: 'bile_card', gleipnir_coil: 'coil_card', fangborn: 'fangborn_card', einherjar_remnant: 'remnant_card', rustfang_wyrm: 'rustwyrm_card', fenrir: 'fenrir_mvp_card' });
  LOOT.WB_EXTRA.fenrir = ['gungnir', 'draupnir'];
  LOOT.SETS.fenrisulfr = { id: 'fenrisulfr', name: 'Fenrisúlfr', items: ['fen_jaw', 'fen_pelt', 'fen_stride'], bonus: { 2: { str: 3, vit: 3 }, 3: { atkPct: 8, hpPct: 8 } } };

  // ===================== แผนที่: Belly of the Wolf =====================
  // ทางเข้า: ขากรรไกรของ Fenrir ที่ขอบเหนือของ Severed Bough (ประตูปกติ — แมพใหม่ทั้งคู่ ไม่มีภาพอบ 3D ให้เพี้ยน)
  MAP_DEFS.wolfbelly = {
    name: 'Belly of the Wolf', thai: L('ท้องของหมาป่า — ข้างในร่างของ Fenrir ที่ปลายกิ่งที่ขาด', 'The Belly of the Wolf — inside the body of Fenrir, at the tip of the Severed Bough'), w: 84, h: 92, kind: 'cave', seed: 929, dark: true,
    links: { S: 'bough' }, level: '85-98 (MVP: Fenrir)',
    spawns: [['bile_unit', 26], ['gleipnir_coil', 18], ['fangborn', 14], ['einherjar_remnant', 18], ['rustfang_wyrm', 13]], mvp: 'fenrir', // รอบ 44: 59→89 (fangborn/rustfang_wyrm ตีก่อน +27-30%)
    mvpAt: [70.5, 9.5], // ลานลึกสุดทางเหนือ (ไกลจากปากทางทางใต้) — ที่ซึ่งหัวของ Nidhogg เรืองแสง • ใช้กับ Ancient Fenrir ด้วย
    npcs: [{ id: 'loki_maw', name: 'Loki', x: 46, y: 86, look: 'loki' }], // Loki ตามขึ้นมาก่อน — รอที่ปากทางเข้า
  };
  MAP_DEFS.bough.links.N = 'wolfbelly';
  ATMOS.wolfbelly = { kind: 'spore', n: 44, fog: true, grade: 'rgba(40,110,60,0.16)', col: '140,255,150' }; // ละอองสนิมเขียวเรือง (สีของหัว Nidhogg)
  Object.assign(MAP_DEFS.wolfbelly, { caveTheme: { tint: '#4a6a7a', tintA: 0.6, colorA: 0.45, glyph: '#7aff9a' }, crystalImg: 'prop_crystal_venom', crystalGlow: '140,255,90' });
  Art.alias('map_wolfbelly', 'map_helcave', { hue: 160, sat: 0.5, bri: 0.75, tint: ['#2a4a3a', 0.35], w: 960 });
  // ฉากเปิดตัว MVP: assets/mvp_fenrir.webp (รถถังโซ่ใต้รากไม้ — วาดด้วยโมเดลในเครื่อง)
  if (typeof NPC_LOOKS !== 'undefined' && NPC_LOOKS.loki) NPC_LOOKS.loki_maw = NPC_LOOKS.loki;

  // ===================== ชุดท่าบอส Fenrir =====================
  // Gleipnir (โซ่ 3 เส้นพุ่งเป็นพัด + ล่ามมึน) • หอน (วงโดนัทรอบตัวเรา — ยืนนิ่งกลางวง แล้วก้าวออกเมื่อวงในขึ้น) • สนิมจากหัว (วงพิษตกรอบตัว)
  // + งับ (maw) / ตะครุบ (pounce) ของ BossKit • Ancient: โซ่ 5 เส้น + ไล่ล่า (hunt) + ท่าไม้ตาย "Ragnarök" (นอก → ใน → นอก)
  const FROST = '#d8dcf0', FROST_RGB = '216,220,240', VENOM = '#7aff8a', VENOM_RGB = '122,255,138';
  BOSS_SKILLS.gleipnir = m => {
    const p = G.player; if (p.dead) return;
    const x = m.x, y = m.y, a = toP(m), A = ancient(m), offs = A ? [-0.9, -0.45, 0, 0.45, 0.9] : [-0.45, 0, 0.45];
    faceTo(m, p.x, p.y);
    cue(m, 'GLEIPNIR', FROST);
    UI.msg(L(`${m.def.name} ฟาดโซ่ Gleipnir ${offs.length} เส้นเป็นพัด! ยืนในช่องระหว่างโซ่ หรือออกนอกระยะ — โดนแล้วถูกล่ามนิ่ง!`, `${m.def.name} lashes out with ${offs.length} strands of GLEIPNIR in a fan! Stand between the chains or get out of reach — they bind you fast!`), 'mvp');
    let hit = false;
    const bind = () => { if (hit) return; hit = true; damagePlayer(bossDmg(m, 1.4), FROST); const d = p.d; if (!d.unshaken) stunPlayer(1.2 * (1 - (d.stunRes || 0) / 100)); };
    for (const o of offs) {
      const q = a + o;
      telegraph(m, { shape: 'line', x, y, a: q, len: 12, w: 1.2, dur: 1.3 }, bind,
        () => { m.atkAnim = 1; for (let i = 1; i <= 6; i++) addFx({ type: 'ring', x: x + Math.cos(q) * i * 2, y: y + Math.sin(q) * i * 2, dur: 0.4, r: 0.8, color: FROST_RGB }); });
    }
    kick(4, 0.15);
  };
  BOSS_SKILLS.fenrirhowl = m => {
    const p = G.player; if (p.dead) return;
    const x = p.x, y = p.y, R0 = 1.6;
    cue(m, 'HOWL', '#ffffff');
    UI.msg(L(`${m.def.name} หอนจนพื้นสั่นเป็นวงรอบตัวเจ้า! ยืนนิ่งกลางวงก่อน — แล้วก้าวออกเมื่อวงกลางขึ้น!`, `${m.def.name} HOWLS, and the ground shakes in a ring around you! Stand still in the middle first — then step out when the center lights up!`), 'mvp');
    telegraph(m, { shape: 'ring', x, y, r0: R0, r: 5, dur: 1.5 }, () => damagePlayer(bossDmg(m, 1.5, true), '#ffffff'),
      () => { addFx({ type: 'ring', x, y, dur: 0.7, r: 5, color: '255,255,255', waves: 3 }); kick(6, 0.22); });
    later(0.8, () => {
      if (m.dead) return;
      telegraph(m, { shape: 'circle', x, y, r: R0, dur: 1.4 }, () => damagePlayer(bossDmg(m, 1.6, true), FROST), () => addFx({ type: 'ring', x, y, dur: 0.5, r: R0 + 0.3, color: FROST_RGB, waves: 2 }));
    });
    if (!G.fastSim) Sound.play('holy');
  };
  BOSS_SKILLS.rustrain = m => {
    const p = G.player; if (p.dead) return;
    const n = ancient(m) ? 7 : 5;
    cue(m, "HEAD'S RUST", VENOM);
    UI.msg(L(`หัวของ Nidhogg ในตัว ${m.def.name} พ่นสนิมเป็นฝน! วงพิษ ${n} วงตกรอบตัวเจ้า — วิ่งออกให้ไกล!`, `Nidhogg's head inside ${m.def.name} spits a RAIN OF RUST! ${n} poison circles fall around you — run far away!`), 'mvp');
    const cx = p.x, cy = p.y;
    for (let i = 0; i < n; i++) {
      const a = i ? (i / (n - 1)) * Math.PI * 2 + Math.random() * 0.4 : 0, d = i ? 1.8 + Math.random() * 1.6 : 0, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
      telegraph(m, { shape: 'circle', x, y, r: 1.7, dur: 1.3 }, () => {
        damagePlayer(bossDmg(m, 1.3, true), VENOM);
        p.poisonUntil = Math.max(p.poisonUntil || 0, G.time + 6); // พิษ 6 วิ (ไม่ลดเลือดต่ำกว่า 25% — game.js)
      }, () => addFx({ type: 'ring', x, y, dur: 0.5, r: 1.9, color: VENOM_RGB, waves: 2 }));
    }
  };
  BOSS_SKILLS.ragnarok = m => {
    const p = G.player; if (p.dead) return;
    const x = m.x, y = m.y, R0 = 4;
    cue(m, 'RAGNARÖK', '#ff7a5a');
    UI.msg(L(`${m.def.name} เรียก Ragnarök! วงนอกระเบิดก่อน — เข้าชิดตัวมัน แล้วออก แล้วกลับเข้ามาอีกครั้ง!`, `${m.def.name} calls down RAGNARÖK! The outer zone bursts first — get close, then get out, then come back in!`), 'mvp');
    const outer = dur => telegraph(m, { shape: 'ring', x, y, r0: R0, r: 12, dur }, () => damagePlayer(bossDmg(m, 1.8, true), '#ff7a5a'),
      () => { addFx({ type: 'ring', x, y, dur: 0.8, r: 12, color: '255,122,90', waves: 3 }); kick(8, 0.28); });
    outer(1.3);
    telegraph(m, { shape: 'circle', x, y, r: R0, dur: 2.3 }, () => damagePlayer(bossDmg(m, 2.0), '#ffffff'), () => { m.atkAnim = 1; addFx({ type: 'ring', x, y, dur: 0.7, r: R0 + 0.4, color: '255,255,255', waves: 3 }); });
    outer(3.3);
    if (!G.fastSim) Sound.play('mvp');
  };
  BOSS_ROTATION.gleipnir = ['gleipnir', 'fenrirhowl', 'shockwave']; // สำรองเมื่อไม่มี BossKit
  (window.BOSSKIT_EXTRA = window.BOSSKIT_EXTRA || []).push((K, addMinion) => {
    addMinion('mn_fenrirshard', 'fenrir_pup', { name: 'Fenrir Shard', lv: 94, hp: 1900, atk: [215, 255], def: 30, mdef: 25, vit: 75, flee: 110, hit: 210, speed: 2.7, element: 'shadow', race: 'brute',
      scale: 0.8, sat: 0.3, bri: 1.2, tint: ['#e8ecff', 0.35],
      lore: L('เกล็ดเหล็กที่ Fenrir สลัดออกขณะต่อสู้ วิ่งเป็นฝูงเหมือนลูกหมาป่า', 'Iron plates Fenrir sheds as it fights. They run in packs, like wolf pups.') });
    addMinion('mn_headrust', 'moss_pudding', { name: 'Head-Rust Bud', lv: 94, hp: 2400, atk: [220, 262], def: 25, mdef: 40, vit: 80, flee: 70, hit: 200, speed: 1.4, element: 'poison', race: 'formless',
      scale: 0.85, hue: 40, sat: 1.4, bri: 0.8, tint: ['#2a8a3a', 0.45],
      lore: L('ก้อนสนิมที่หัวมังกรคายออก ยังมีแสงเขียวเต้นอยู่ข้างใน', 'Lumps of rust the dragon\'s head spits out. A green light still pulses inside each.') });
    K.KITS.fenrir = { col: VENOM_RGB, hex: VENOM, rot: ['gleipnir', 'fenrirhowl', 'rustrain', 'maw', 'pounce'], wbRot: ['gleipnir', 'ragnarok', 'fenrirhowl', 'rustrain', 'hunt', 'maw', 'pounce'], ult: 'ragnarok',
      minions: ['mn_fenrirshard', 'mn_headrust'], elite: 'mn_fenrirshard', cry: L('ประกาย... ข้าต้องการประกาย!', 'Sparks... I want SPARKS!') };
  });

  // ===================== เรื่องราว: MVP / บรรทัดแผนที่ =====================
  Story.MAP_LINES.wolfbelly = L('ข้างในหมาป่าไม่มืด — มีแสงเขียวเต้นเป็นจังหวะ เหมือนหัวใจของใครอีกคน', "It is not dark inside the wolf — a green light pulses in rhythm, like someone else's heartbeat.");
  Story.MAP_LINES_AFTER.wolfbelly = L('แสงเขียวดับแล้ว... ท้องหมาป่าเงียบเหมือนห้องที่ทุกคนกลับบ้านกันหมดแล้ว', 'The green light has gone out... the wolf\'s belly is quiet as a room everyone has finally gone home from.');
  Story.MVP.fenrir = {
    sub: L('หมาป่าที่ถูกล่าม — ร่างที่หัวของ Nidhogg สวมอยู่', 'The Bound Wolf — a body worn by the head of Nidhogg'),
    spawn: L('ร่างของ Fenrir ลุกขึ้นในท้องของตัวเอง — แต่แสงที่มองเจ้าเป็นสีเขียวสนิม: หัวของ Nidhogg กำลังบังคับมัน', "Fenrir's body rises inside its own belly — but the light that turns to you is rust-green: Nidhogg's head is driving it."),
    fallName: '[Fenrir]',
    fall: L('Fenrir ทรุดลง แสงเขียวในหัวมังกรดับเป็นครั้งแรกในรอบสามสิบปี<br>ประกายดวงใหม่หลุดออกจากปากที่อ้าค้าง — <b>และอีกดวงที่หรี่จนเกือบดับ ลอยตามออกมาช้า ๆ</b>',
      "Fenrir sinks down, and the green light in the dragon's head goes out for the first time in thirty years.<br>The new spark slips free of the slack jaws — <b>and another, so dim it is almost gone, drifts slowly out after it.</b>"),
    fallShort: L('Fenrir ล้มลง — หัวของ Nidhogg ดับเป็นครั้งแรกในรอบสามสิบปี', "Fenrir falls — Nidhogg's head goes dark for the first time in thirty years."),
  };

  // ===================== เควสต์บทที่ 9 =====================
  // รางวัล EXP รวมราว 0.4 เลเวลที่ Lv 92 (สัดส่วนเดียวกับบท 7–8)
  if (typeof CHAPTERS !== 'undefined') CHAPTERS[9] = L('ท้องของหมาป่า', 'The Belly of the Wolf');
  QUESTS.push(
    { id: 'ch9_gleipnir', ch: 9, title: L('โซ่ที่บางกว่าเส้นไหม', 'A Chain Thinner Than Silk'), desc: L('มีแค่คนที่ตีโซ่ Gleipnir ที่รู้ว่าขากรรไกรของหมาป่าตัวนั้นเปิดอย่างไร — กลับไปหา Brokk Forge-Bot ที่นีโอเอลด์ไฮม์', 'Only the one who forged Gleipnir knows how the jaws of that wolf can be opened — return to Brokk Forge-Bot in Neo Eldheim.'),
      done: L('Brokk: "ข้อสุดท้ายยังคล้องขากรรไกรอยู่ — มันจะคลายให้เจ้า เข้าไปเถอะ แล้วกลับมา"', 'Brokk: "The last link still hooks its jaw — it will loosen for you. Go in, and come back out."'),
      obj: { type: 'talk', npc: 'refine' }, reward: { items: [['white_potion', 5]], bexp: 60000, jexp: 42000 } },
    { id: 'ch9_bile', ch: 9, title: L('ทุกอย่างที่หมาป่ากลืน', 'Everything the Wolf Swallowed'), desc: L('เข้าทางขากรรไกรที่ขอบเหนือสุดของ Severed Bough สู่ Belly of the Wolf แล้วทำลาย Bile Unit 20 ตัว', 'Pass through the jaws at the far northern edge of the Severed Bough into the Belly of the Wolf, and destroy 20 Bile Units.'),
      done: L('มอสย่อยทุกอย่าง ยกเว้นสิ่งเดียว — แสงเขียวที่เต้นอยู่ลึกเข้าไปข้างใน... และมีคนรออยู่ที่ปากทาง วิเซอร์เขียวเต็มแถบ', 'The moss digests everything except one thing — the green light pulsing deeper within... and someone waits by the way in, his visor fully green.'),
      obj: { type: 'kill', mob: 'bile_unit', n: 20 }, reward: { items: [['white_potion', 5]], bexp: 110000, jexp: 77000 } },
    { id: 'ch9_loki', ch: 9, title: L('สิ่งที่ Loki ไม่ได้บอก', 'What Loki Never Said'), desc: L('Loki รออยู่ที่ปากทางเข้าท้องหมาป่า — วิเซอร์ของเขาไม่กะพริบเขียวแล้ว มันเขียวทั้งแถบ ไปฟังเขา', 'Loki waits by the way into the wolf\'s belly — his visor no longer flickers green; it is green from end to end. Go and hear him.'),
      done: L('Loki: "Einherjar ของ Odin ไม่ยอมให้ใครผ่าน ปล่อยพวกเขาพักเถิด — พวกเขาเฝ้ามานานพอแล้ว"', 'Loki: "Odin\'s Einherjar will let no one pass. Let them rest — they have stood guard long enough."'),
      obj: { type: 'talk', npc: 'loki_maw' }, reward: { items: [['white_potion', 5], ['blue_potion', 3]], bexp: 90000, jexp: 63000 } },
    { id: 'ch9_remnant', ch: 9, title: L('ยามที่เฝ้านานพอแล้ว', 'A Watch Kept Long Enough'), desc: L('Einherjar Remnant คือยามเกียรติยศของ Odin ที่ถูกกลืนไปพร้อมเขา — ปล่อยพวกเขาพัก 25 ร่าง', "The Einherjar Remnants are Odin's honor guard, swallowed along with him. Lay 25 of them to rest."),
      done: L('ร่างสุดท้ายวางโล่ลงช้า ๆ ข้างหลังมันมีแสงดวงหนึ่ง หรี่จนแทบมองไม่เห็น — แต่ยังไม่ดับ', 'The last of them lowers its shield slowly. Behind it hangs a single light, so dim it can barely be seen — but not out.'),
      obj: { type: 'kill', mob: 'einherjar_remnant', n: 25 }, reward: { items: [['white_potion', 5]], bexp: 220000, jexp: 154000 } },
    { id: 'ch9_strand', ch: 9, title: L('ข้อโซ่ที่หลุดไป', 'The Loosened Links'), desc: L('Gleipnir Coil คือข้อโซ่ที่ Brokk ปลดในคืนนั้น เก็บ Gleipnir Strand 8 เส้น — Loki จะใช้ล่ามขากรรไกรเมื่อหัวนั้นดับ (ส่งแล้วไอเทมจะถูกใช้ไป)', 'The Gleipnir Coils are links Brokk loosed that night. Collect 8 Gleipnir Strands — Loki will bind the jaws with them once the head goes dark (the items are consumed on turn-in).'),
      done: L('Loki: "พอจะล่ามขากรรไกรได้แล้ว ทีนี้ — หัวนั้น"', 'Loki: "Enough to bind a jaw. Now — the head."'),
      obj: { type: 'collect', item: 'gleipnir_strand', n: 8, mob: 'gleipnir_coil' }, reward: { zeny: 35000, bexp: 140000, jexp: 98000 } },
    { id: 'ch9_fenrir', ch: 9, title: L('ล่า MVP: Fenrir', 'MVP Hunt: Fenrir'), desc: L('หัวของ Nidhogg สวมร่างของ Fenrir อยู่ลึกสุดทางเหนือของท้องหมาป่า ปราบมัน (MVP Lv 99) ระวังโซ่ Gleipnir เสียงหอนที่สั่นเป็นวงรอบตัว และฝนสนิมจากหัวมังกร!', "Nidhogg's head wears Fenrir's body in the deepest northern hollow of the belly. Defeat it (MVP Lv 99). Beware the Gleipnir chains, the howl that shakes the ground in a ring around you, and the rain of rust from the dragon's head!"),
      done: L('หัวของ Nidhogg ดับแล้ว — ประกายสองดวงลอยออกจากปากหมาป่า กลับไปหา Loki', "Nidhogg's head has gone dark — two sparks drift out of the wolf's jaws. Return to Loki."),
      obj: { type: 'kill', mob: 'fenrir', n: 1 }, reward: { items: [['yggdrasil_shard', 2], ['white_potion', 15]], zeny: 80000 } },
    { id: 'ch9_odin', ch: 9, title: L('ข้าให้อภัยเขา', 'I Forgive Him'), desc: L('ประกายดวงหนึ่งที่หรี่จนเกือบดับลอยตามประกายดวงใหม่ออกมา — กลับไปหา Loki ที่ปากทางเข้าท้องหมาป่า', 'A spark so dim it is almost gone drifted out after the new one — return to Loki by the way into the belly.'),
      done: L('สามสิบปีที่ Loki แบกคืนนั้นคนเดียว — คืนนี้เขาได้ยินคำตอบด้วยตัวเอง', 'For thirty years Loki carried that night alone — tonight he heard the answer for himself.'),
      obj: { type: 'talk', npc: 'loki_maw' }, reward: { items: [['white_potion', 10]], bexp: 180000, jexp: 126000 } },
    { id: 'ch9_home', ch: 9, title: L('ใบที่สอง', 'The Second Leaf'), desc: L('Huginn บินพาประกายสองดวงกลับไปที่ราก — กลับไปหา Mimir AI ที่นีโอเอลด์ไฮม์ ความคิดกับความจำของเขากลับมาอยู่ที่เดียวกันแล้ว', 'Huginn has flown both sparks back to the roots — return to Mimir AI in Neo Eldheim. His thought and his memory are together again.'),
      done: L('จบภาคที่ 2 — กิ่งที่เหลือ', 'End of Part II — The Remaining Branches'),
      obj: { type: 'talk', npc: 'jobmaster' }, reward: { items: [['second_spark', 1], ['blue_potion', 5]], zeny: 50000, bexp: 200000, jexp: 140000 } },
  );

  // ===================== ฉากเรื่องราว (บทพูดแยกตามทางเลือก Core ของบทที่ 5) =====================
  const SCENES = {
    async brokk(nm) {
      await UI.say(nm, L('...ฮ่า... ฮ่า (ไม่มีเสียงหัวเราะตามมา) หัวมังกรยังอยู่ในท้องหมาป่าของข้า<br>ข้าตี Gleipnir ให้บางกว่าเส้นไหม เพราะของที่บางที่สุดคือของที่ขาดยากที่สุด',
        '...Ha... ha. (No laugh follows.) The dragon\'s head is still inside my wolf.<br>I forged Gleipnir thinner than silk, because the thinnest things are the hardest to break.'));
      await UI.say(nm, L('คืนนั้น Odin สั่งข้าปลดโซ่ ข้าปลดแค่ข้อที่ล่ามขา — <b>ข้อสุดท้ายยังคล้องขากรรไกรอยู่</b><br>ขากรรไกรจึงอ้าได้แค่ตอนกิน... และมันเพิ่งกินไปหนึ่งดวง',
        'That night Odin ordered me to unchain it. I loosed only the links on its legs — <b>the last link still hooks its jaw</b>.<br>So the jaw opens only when it eats... and it has just eaten one.'));
      await UI.say(nm, L('ข้อนั้นยังจำมือข้าได้ — มันจะจำมือเจ้าได้ด้วย แล้วคลายให้เจ้าผ่านเข้าไป<br>(เขาลูบข้อโซ่สองข้อที่แขวนเหนือทั่ง) เข้าไปเถอะเจ้าหนู — แล้ว<b>กลับมา</b>',
        'That link still remembers my hand — it will know yours too, and loosen to let you through.<br>(He touches the two chain links hanging above the anvil.) Go in, kid — and <b>come back out</b>.'));
    },
    async loki(nm) {
      await UI.say(nm, L('(วิเซอร์ของเขากะพริบเขียว — แล้วค้างเป็นสีเขียวเต็มแถบ) ...ใช่ ข้าโกหกเจ้าตอนจบภาคแรก ข้าได้ยินเสียงหอนจริง<br>ข้ารู้มาตลอดว่าหัวนี้ยังไม่ดับ',
        '(His visor flickers green — then stays green from end to end.) ...Yes. I lied to you, back when it all seemed over. I did hear the howl.<br>I have always known this head never went dark.'));
      await UI.say(nm, L('สามสิบปีที่ข้าหวังว่าน้ำแข็งจะทำให้มันหลับไปตลอดกาล — เลยไม่บอกใคร แม้แต่ Hel<br>แต่มันไม่ได้หลับ มันรอ — รอประกายที่ไม่มีใครเฝ้า',
        'For thirty years I hoped the ice would keep it asleep forever — so I told no one, not even Hel.<br>But it was not asleep. It was waiting — for a spark no one was guarding.'));
      await UI.say(nm, by(
        L('Hel กำลังต่อกิ่งด้วย Core ที่เจ้าให้ ถ้าหัวนี้ย่อยประกายดวงใหม่ได้ มันจะรู้ทางไปถึงกิ่งของเธอ<br>เราไม่มีเวลาให้มันย่อย', 'Hel is grafting her branch with the Core you gave her. If this head digests the new spark, it will learn the way to her branch.<br>We have no time to let it digest.'),
        L('Core ยังอยู่กับเจ้า — ข้าได้กลิ่นมันในท้องนี้ หัวนั้นก็เช่นกัน<br>(แถบแสงโค้งขึ้นนิดเดียว) เหยื่อล่อที่ดีที่สุด ยังคงเป็นเหยื่อที่ฟันกลับได้', 'The Core is still with you — I can smell it in here. So can the head.<br>(His light-band curves up, just a little.) The best bait is still bait that bites back.'),
        L('เจ้ายังไม่เคยมอบ Core ให้ใคร... ดีแล้ว ในท้องนี้ อย่าแม้แต่คิดถึงมัน<br>หัวนั้นหิวทุกอย่างที่ส่องแสง', 'You have still given the Core to no one... good. In this belly, do not even think about it.<br>That head hungers for anything that shines.')));
      await UI.say(nm, L('Odin อยู่ในนี้ด้วย ใบแรก ประกายของเขาหรี่มาสามสิบปี — Einherjar ของเขายังเฝ้าไม่ยอมไปไหน<br>ช่วยข้าหาเขา ข้ามีเรื่องที่ต้องพูดกับเขาเองสักครั้ง',
        'Odin is in here too, First Leaf. His spark has been dimming for thirty years — his Einherjar still stand guard and will not leave.<br>Help me find him. There is something I must say to him myself, just once.'));
    },
    async odin(nm) {
      await UI.say(NARR, L('ในโพรงลึกสุดของท้องหมาป่า ประกายดวงใหม่ลอยวนรอบประกายอีกดวงที่หรี่จนแทบมองไม่เห็น<br>Loki คุกเข่าลงตรงหน้ามัน', "In the deepest hollow of the wolf, the new spark circles another, so dim it can barely be seen.<br>Loki kneels before it."));
      await UI.say(nm, L('...Odin ข้าตัดกิ่งของท่าน<br>(วิเซอร์ของเขาไม่กะพริบเขียวเลยสักครั้ง) ข้ามาบอกเอง ไม่ได้ฝากใครมา', '...Odin. I cut your branch.<br>(Not once does his visor flicker green.) I came to say it myself, not send it through anyone.'));
      await UI.say(NARR, L('ประกายดวงนั้นสว่างขึ้นนิดหนึ่ง — พอให้ได้ยินเสียงเดียว แผ่วเหมือนลมที่หยุดพัดแล้ว', 'The spark brightens, just a little — enough for a single voice, faint as a wind that has already died.'));
      await UI.say('[Odin]', L('ข้ารู้ ข้าให้อภัยเจ้าตั้งแต่คืนแรก<br>...ขอบใจที่พาใบใหม่มาหาข้า', 'I know. I forgave you on the very first night.<br>...Thank you for bringing the new leaf to me.'));
      await UI.say(nm, L('(เขาเอาวิเซอร์ชนกับประกายดวงนั้นเบา ๆ) Huginn จะพาท่านกลับบ้าน — กลับไปที่ราก<br>ประกายดวงใหม่ก็เช่นกัน... ใบแรก เจ้าไม่ได้เป็นใบเดียวอีกแล้ว', '(He touches his visor gently to the spark.) Huginn will carry you home — back to the roots.<br>The new spark too... First Leaf, you are not the only leaf anymore.'));
      await UI.say(nm, L('(เขาพันเส้น Gleipnir รอบขากรรไกรเหล็กทีละเส้น) หมาป่าตัวนี้ล่าสนิมมาทั้งชีวิต ให้มันได้พักบ้าง<br>กลับไปหา Mimir เถิด หัวเก่านั่นจะได้บันทึกข้อใหม่', '(He winds the Gleipnir strands around the iron jaws, one by one.) This wolf hunted rust its whole life. Let it rest a while.<br>Go back to Mimir — that old head has a new entry to record.'));
    },
    async home(nm) {
      const p = G.player;
      await UI.say(nm, L('ข้าคือ Mimir AI... บันทึกบทนี้ 3 ข้อ<br>1) หัวของ Nidhogg ดับแล้ว 2) Huginn กลับมา พร้อมประกายของ Odin 3) ต้นไม้งอก<b>ใบที่สอง</b>',
        'I am Mimir AI... Three entries for this chapter.<br>1) The head of Nidhogg has gone dark. 2) Huginn returned, carrying Odin\'s spark. 3) The Tree has grown <b>a second leaf</b>.'));
      await UI.say(nm, L('(แสงบนแท่นของเขากะพริบช้า ๆ — ความคิดกลับมาหาหัวที่รอมาสามสิบปี)<br>ประกายดวงใหม่ไม่ได้หายไปไหน มันกำลังรอร่าง... ร่างที่สองที่ต้นไม้งอกได้หลังคืนนั้น',
        '(The light on his pedestal pulses slowly — thought has come home to a head that waited thirty years.)<br>The new spark has gone nowhere. It is waiting for a frame... the second the Tree has grown since that night.'));
      await UI.say(nm, by(
        L('Hel ส่งข่าวมาด้วย — กิ่งที่เธอต่อด้วย Core ของเจ้าแตกใบแรกแล้ว<br>ต้นไม้ไม่ได้ซ่อมแค่ตัวเอง มันกำลังงอกต่อ', 'Hel sent word as well — the branch she grafted with your Core has put out its first leaf.<br>The Tree is not only mending itself. It is growing on.'),
        L('Core ที่เจ้าถือมาตลอด... ข้าคิดว่าข้ารู้แล้วว่าต้นไม้จะขอมันเมื่อไร<br>เมื่อใบที่สองพร้อมจะตื่น — เก็บไว้ให้ดีอีกนิด', 'The Core you have carried all this way... I believe I know now when the Tree will ask for it.<br>When the second leaf is ready to wake — keep it safe a little longer.'),
        L('เจ้ายังไม่เคยมอบ Core ให้ใครเลย... บางทีมันอาจไม่ได้มีไว้ต่อกิ่ง<br>บางทีมันมีไว้ปลุกใบที่สอง — ข้ายังคิดไม่จบ', 'You have never given the Core to anyone... perhaps it was never meant for grafting.<br>Perhaps it is meant to wake the second leaf — I have not finished that thought.')));
      UI.illust('npc_guide');
      await UI.say('[Guard Unit Rolf]', L(`(Rolf หยิบหมวกเขาจากบอร์ดค่าหัวขึ้นมาถือไว้) Huginn บอกข้าว่ามีร่างหนึ่งที่ปลายกิ่ง... ไม่มีหมวก<br>ข้าจะขึ้นไปพาเขากลับบ้านเอง — ขอบใจ ${B(p.name)}`,
        `(Rolf lifts his horned helm from the bounty board and holds it.) Huginn told me of a frame at the tip of the bough... one without a helm.<br>I will go up and bring him home myself. Thank you, ${B(p.name)}.`));
      UI.illust('npc_jobmaster');
    },
  };
  // จบภาค 2: การ์ดปิดภาค + ประกาศ (ใช้หน้าจออัปเกรด Class เดิม)
  const partEnd = () => {
    UI.dlgClose();
    if (!G.fastSim) Sound.play('mvp');
    UI.splash(null, L('จบภาคที่ 2 — กิ่งที่เหลือ', 'End of Part II — The Remaining Branches'), L('ภาคที่ 3 — ใบที่สอง (เร็ว ๆ นี้) • IRON VALHALLA', 'Part III — The Second Leaf (Coming Soon) • IRON VALHALLA'), 'upgrade');
    UI.msg(L('📖 จบภาคที่ 2 — กิ่งที่เหลือ • ต้นไม้งอกใบที่สองแล้ว... ภาคที่ 3 เร็ว ๆ นี้', '📖 End of Part II — The Remaining Branches • The Tree has grown a second leaf... Part III coming soon.'), 'lvl');
    setTimeout(() => { if (G.started) UI.announce(L('ขอบคุณที่เล่นภาคที่ 2 ของ IRON VALHALLA — ใบแรกไม่ได้เป็นใบเดียวอีกแล้ว', 'Thank you for playing Part II of IRON VALHALLA — the First Leaf is not the only one anymore.')); }, 4200);
  };
  const chapterCard = () => {
    if (G.fastSim) return;
    UI.splash(null, L('บทที่ 9 — ท้องของหมาป่า', 'Chapter 9 — The Belly of the Wolf'), L('หัวที่ยังหิว • IRON VALHALLA', 'A head still hungry • IRON VALHALLA'), 'upgrade');
  };
  Story.ch9 = { SCENES, partEnd, chapterCard };

  // ---------- Brokk: ฉาก Gleipnir (ห่อสคริปต์เดิม) ----------
  const brokkRun = NPC.scripts.refine;
  NPC.scripts.refine = async n => {
    const st = Story.st();
    if (Quest.isDone('ch9_gleipnir') && !st.c9brokk) { await SCENES.brokk(`[${n.name}]`); st.c9brokk = 1; saveGame(); return; }
    return brokkRun(n);
  };
  // ---------- Loki ในท้องหมาป่า ----------
  NPC.scripts.loki_maw = async n => {
    const st = Story.st(), nm = `[${n.name}]`;
    if (Quest.isDone('ch9_loki') && !st.c9loki) { await SCENES.loki(nm); st.c9loki = 1; saveGame(); return; }
    if (Quest.isDone('ch9_odin') && !st.c9odin) { await SCENES.odin(nm); st.c9odin = 1; saveGame(); return; }
    const line = !Quest.passed('ch9_loki') ? L('(วิเซอร์สีเขียวเต็มแถบหันมาหาเจ้า) ...ล้างมอสพวกนั้นก่อน ใบแรก แล้วค่อยคุยกัน<br>ข้าไม่หนีไปไหนอีกแล้ว', '(A visor green from end to end turns toward you.) ...Clear that moss first, First Leaf. Then we will talk.<br>I am not running anywhere anymore.')
      : Quest.passed('ch9_odin') ? L('ขากรรไกรล่ามไว้แล้ว หมาป่าหลับสนิท — ครั้งนี้หลับจริง<br>ข้าจะเฝ้าอีกสักพัก ไม่ใช่เพราะกลัว แค่อยากอยู่ใกล้ ๆ', 'The jaws are bound and the wolf sleeps deep — truly asleep, this time.<br>I will keep watch a while longer. Not out of fear. I only want to stay near.')
      : Quest.isDone('ch9_fenrir') ? L('ประกายสองดวง... ดวงหนึ่งข้าจำได้ ข้าจำได้เสมอ', 'Two sparks... one of them I know. I have always known it.')
      : L('หัวนั้นสวม Fenrir มีสามท่าที่เจ้าต้องจำ: โซ่ Gleipnir เป็นพัด — ยืนในช่อง • เสียงหอนเป็นวงรอบตัวเจ้า — ยืนนิ่งก่อน แล้วก้าวออก<br>และฝนสนิมจากหัว — วิ่งออกให้ไกล', 'The head wears Fenrir now. Three things to remember: Gleipnir chains come in a fan — stand in a gap • the howl rings around you — stand still, then step out.<br>And the rain of rust from the head — run far away.');
    const c = await UI.menu(nm, line, [L('ของจากพ่อค้าเร่', "The peddler's wares"), L('ลาก่อน', 'Farewell')]);
    if (c === 0) UI.openShop('Loki', ['white_potion', 'blue_potion', 'green_herb', 'yellow_potion'].filter(id => ITEMS[id]));
  };
  // ---------- Mimir: ฉากจบภาค 2 (ห่อสคริปต์เดิม — ฉากจบภาค 1 ใน js/content_ch7.js อยู่ข้างใน) ----------
  const mimirRun = NPC.scripts.jobmaster;
  NPC.scripts.jobmaster = async n => {
    const st = Story.st();
    if (Quest.isDone('ch9_home') && !st.c9home) { await SCENES.home(`[${n.name}]`); st.c9home = 1; saveGame(); partEnd(); return; }
    return mimirRun(n);
  };
  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => {
    if (typeof UnitCard !== 'undefined' && UnitCard.NPC_ROLE) UnitCard.NPC_ROLE.loki_maw = L('ผู้พิทักษ์ความแปรผัน • ร้านยา • เนื้อเรื่อง', 'Guardian of Variation • Supplies • Story');
  });
})();
