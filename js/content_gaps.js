'use strict';
// ============================================================
//  อุปกรณ์เติมช่องว่างเลเวล (รอบ 42) — ให้ทุก Class เจอของอัปเกรดอย่างน้อยทุก ~8 เลเวลจาก Lv 18 ถึง 66
//  ที่มา: docs/DROP_AUDIT.md (รอบ 38 ทิ้งช่องว่างไว้ เช่น ธนู uncommon ระหว่าง Lv 24–46 ไม่มีของเลย)
//  • 56 ชิ้นใหม่ (id ใหม่ล้วน — ไม่แตะ id/ค่าของเดิม) ค่าสถานะไล่ระหว่างของเก่าข้างเคียง ไม่เกินของ MVP ในช่วงเดียวกัน
//  • ดรอปจากมอนปกติช่วงเลเวลถูกต้อง (LOOT.dropBand: Lv ของ −8…+3) ชิ้นละ 1 มอน (เหมือนของเดิม) • ไม่ใส่ MVP / Elite / World Boss
//  • "อุปกรณ์ต่อชั่วโมง" ของแต่ละมอน (=แต่ละแมพ) คงเดิมเป๊ะ: ใส่ของใหม่ที่โอกาสเริ่มต้น แล้วย่อโอกาสอุปกรณ์ทั้งโต๊ะลงให้ผลรวมถ่วงน้ำหนักเท่าเดิม
//    (น้ำหนักตามตัวคูณใน js/balance.js: common 0.25 • uncommon 0.1 • rare 0.2 • epic 0.2 • legend 0.5)
//  ลำดับโหลด: หลัง js/content_ch7.js (ใช้มอน Nidhogg's Hollow) ก่อน js/balance.js (ตัวคูณดรอปอุปกรณ์) • ห้ามเปลี่ยน id หลังปล่อยแล้ว
// ============================================================
(() => {
  const WTYPES = ['dagger', 'sword', 'axe', 'rod', 'bow', 'mace'];
  const ICON_OF = { armor: 'armor', head: 'hat', shield: 'shield', garment: 'cloth', shoes: 'shoes', acc: 'ring' };
  const PRICE = { uncommon: lv => 150 + lv * 100, rare: lv => 1000 + lv * 400 };
  const statText = b => b ? Object.entries(b).filter(([k]) => PSTAT[k]).map(([k, v]) => PSTAT_FMT(k, v)).join(' ') : '';
  const statTextEn = b => b ? Object.entries(b).filter(([k]) => PSTAT[k]).map(([k, v]) => {
    const pct = /Pct$|^leech$|^stunRes$|^rage$|^venom$/.test(k), sg = v > 0 ? '+' : '', n = EN(PSTAT[k]); return pct ? `${sg}${v}${n}` : `${n} ${sg}${v}`; }).join(' ') : '';
  const eq = (id, name, kind, lv, rarity, s, th, en) => {
    if (ITEMS[id]) throw new Error('content_gaps: duplicate item id ' + id);
    const weapon = WTYPES.includes(kind), b = s.b || null;
    const it = { id, name, type: weapon ? 'weapon' : 'armor', slot: weapon ? 'weapon' : kind, rarity, lv, price: PRICE[rarity](lv), slots: rarity === 'rare' ? 2 : 1,
      jobs: weapon ? J[kind] : 'all', icon: { s: weapon ? kind : ICON_OF[kind], c: s.c } };
    if (weapon) { it.wtype = kind; it.atk = s.atk || 0; if (s.matk) it.matk = s.matk; }
    else { if (s.def) it.def = s.def; if (s.mdef) it.mdef = s.mdef; }
    if (b) it.b = b;
    const st = statText(b);
    it.desc = L(th, en) + (st ? ' ' + st : '');
    if (st && LANG !== 'en') L_EN.set(it.desc, en + ' ' + statTextEn(b));
    ITEMS[id] = it;
    if (s.art) Art.alias('item_' + id, 'item_' + s.art, { hue: 0, sat: 1.1, tint: [s.c, 0.42] });
  };

  // ---------- มีดสั้น (dagger) ----------
  eq('ashtail_dirk', 'Ashtail Dirk', 'dagger', 19, 'uncommon', { atk: 78, b: { agi: 2, crit: 2 }, c: '#b8a078', art: 'stiletto' },
    'กริชที่ตะไบจากกระดูกสันหลังของ Ash Stalker สะบัดแล้วเงียบเหมือนเงา', 'A dirk filed from an Ash Stalker\'s spine. It swings without a whisper.');
  eq('archive_stylus', 'Archive Stylus', 'dagger', 40, 'uncommon', { atk: 117, b: { agi: 2, crit: 3 }, c: '#7fa8d8', art: 'knife' },
    'ปากกาสลักของผู้จดบันทึกใน Archive ปลายแหลมพอจะสลักชื่อลงบนเหล็ก', 'A scribe stylus from the Archive, sharp enough to engrave a name into iron.');
  eq('veinbiter_kris', 'Veinbiter Kris', 'dagger', 44, 'rare', { atk: 124, b: { agi: 3, crit: 6, luk: 2 }, c: '#a03a5a', art: 'stiletto' },
    'กริชคลื่นเงาที่หาเส้นเลือดของโครงสร้างได้แม่นกว่าตาคน', 'A wavy kris that finds the weak seam of any frame better than an eye can.');
  eq('rootsplit_dirk', 'Rootsplit Dirk', 'dagger', 52, 'uncommon', { atk: 144, b: { agi: 3, crit: 4 }, c: '#8a6a3a', art: 'stiletto' },
    'กริชที่ใช้ผ่ารากแก่ใน Gnawed Roots เหนียวแต่ไม่เคยบิ่น', 'A dirk used to split old roots in the Gnawed Roots. Tough, and it has never chipped.');
  eq('bloomthorn_kris', 'Bloomthorn Kris', 'dagger', 58, 'uncommon', { atk: 157, b: { agi: 3, crit: 4, luk: 1 }, c: '#c8642a', art: 'stiletto' },
    'กริชหนามของ Rust Bloom แทงแล้วมีกลีบสนิมร่วงตามแผล', 'A thorn-kris of a Rust Bloom. Rust petals fall from every wound it makes.');
  eq('rotvein_kris', 'Rotvein Kris', 'dagger', 61, 'rare', { atk: 160, b: { agi: 3, crit: 6, luk: 3 }, c: '#6aa040', art: 'stiletto' },
    'กริชที่เส้นสนิมเขียวไหลตามใบ เจ้าของเก่าไม่เคยเห็นเลือดของเป้าหมาย', 'A kris with a green vein of rot running down its blade. Its last owner never saw a target bleed.');
  // ---------- ดาบ (sword) ----------
  eq('ashforge_blade', 'Ashforge Blade', 'sword', 18, 'uncommon', { atk: 93, b: { str: 1, dex: 1 }, c: '#c08a50', art: 'falchion' },
    'ดาบที่ตีจากเหล็กเถ้าถ่าน ด้ามยังอุ่นเหมือนเพิ่งออกจากเตา', 'A blade beaten from ash-iron. The hilt is still warm, as if fresh from the forge.');
  eq('helwatch_sabre', 'Helwatch Sabre', 'sword', 30, 'uncommon', { atk: 123, b: { str: 2, hit: 4 }, c: '#8aa0c8', art: 'broadsword' },
    'ดาบประจำยามเฝ้าประตูของ Hel ใบดาบตรงจนวัดเส้นไม้บรรทัดได้', 'A sabre of Hel\'s gate watch. The blade is so straight you could rule a line with it.');
  eq('archivist_claymore', 'Archivist\'s Claymore', 'sword', 42, 'rare', { atk: 152, b: { str: 3, leech: 3 }, c: '#5a78b0', art: 'broadsword' },
    'ดาบใหญ่ของบรรณารักษ์ที่ไม่ยอมให้ใครยืมหนังสือ ฟันแล้วดูดแรงกลับมาทุกครั้ง', 'The claymore of an archivist who never lent a book. Every cut draws a little strength back.');
  eq('rootsworn_blade', 'Rootsworn Blade', 'sword', 50, 'uncommon', { atk: 170, b: { str: 2, hit: 5 }, c: '#7a8a40', art: 'broadsword' },
    'ดาบที่มีรากเล็ก ๆ งอกพันด้าม ยิ่งกำนานยิ่งแน่นมือ', 'A blade with small roots sprouting around the hilt. The longer you hold it, the firmer the grip.');
  eq('verdigris_falchion', 'Verdigris Falchion', 'sword', 56, 'rare', { atk: 188, b: { str: 3, dex: 2, leech: 3 }, c: '#4aa088', art: 'falchion' },
    'ฟัลเชียนที่สนิมเขียวกินจนใบบางเป็นกระจก แต่ยังตัดเหล็กได้', 'A falchion eaten by verdigris until the blade is thin as glass. It still cuts iron.');
  eq('hollowguard_sword', 'Hollowguard Sword', 'sword', 66, 'uncommon', { atk: 204, b: { str: 3, dex: 1, vit: 1 }, c: '#8a7aa8', art: 'broadsword' },
    'ดาบของยามกลวงใน Hollow น้ำหนักพอดีมือจนเหมือนมันเลือกเจ้าของเอง', 'A hollow guard\'s sword from the Hollow. So well balanced it feels like it chose its own wielder.');
  // ---------- ขวาน (axe) ----------
  eq('wolfwood_hewer', 'Wolfwood Hewer', 'axe', 23, 'uncommon', { atk: 110, b: { str: 2 }, c: '#a08060', art: 'hand_axe' },
    'ขวานของนักตัดไม้แห่ง Wolfwood ด้ามเหนียวจากไม้ที่หมาป่าเคยกัด', 'A Wolfwood woodcutter\'s axe. The haft is tough wood that wolves once gnawed.');
  eq('archive_hatchet', 'Archive Hatchet', 'axe', 38, 'uncommon', { atk: 145, b: { str: 2, vit: 1 }, c: '#6a88b8', art: 'battle_axe' },
    'ขวานกู้ภัยจากคลังข้อมูล ใช้ตัดชั้นวางที่ถล่มทับทางออก', 'A rescue hatchet from the Archive, made for cutting through collapsed shelving.');
  eq('rustbite_axe', 'Rustbite Axe', 'axe', 42, 'rare', { atk: 158, b: { str: 3, leech: 2 }, c: '#c05a30', art: 'battle_axe' },
    'ขวานที่สนิมกัดจนคมแบบฟันเลื่อย แผลที่ได้ไม่ยอมหายง่าย ๆ', 'An axe the rust has bitten into a serrated edge. The wounds it leaves are slow to close.');
  eq('draugr_splitter', 'Draugr Splitter', 'axe', 44, 'uncommon', { atk: 156, b: { str: 2, hit: 4 }, c: '#8a7a6a', art: 'battle_axe' },
    'ขวานผ่าซากของยามเก่า หนักด้านหัวจนฟันครั้งเดียวก็เห็นผล', 'An axe for splitting old husks. Head-heavy — one swing is usually enough.');
  eq('gnarlroot_axe', 'Gnarlroot Axe', 'axe', 60, 'uncommon', { atk: 194, b: { str: 3 }, c: '#6a8a30', art: 'battle_axe' },
    'ขวานที่ด้ามเป็นรากขดเป็นปม จับแล้วรู้สึกว่ามันยังโตอยู่', 'An axe whose haft is a gnarled root. Hold it and you can feel it still growing.');
  eq('wyrmcleft_axe', 'Wyrmcleft Axe', 'axe', 62, 'rare', { atk: 200, b: { str: 3, vit: 2, leech: 2 }, c: '#4a8a2a', art: 'battle_axe' },
    'ขวานที่ตีจากเกล็ดลูกมังกร ฟันแล้วแผลมีกลิ่นป่าชื้น', 'An axe forged from wyrmling scale. Its wounds smell of damp forest.');
  // ---------- คทา (rod) ----------
  eq('glowmoss_rod', 'Glowmoss Rod', 'rod', 22, 'uncommon', { atk: 39, matk: 70, b: { int: 2, sp: 20 }, c: '#7fe0a0', art: 'rod' },
    'คทาที่มีมอสเรืองแสงพันปลาย ส่องทางในโพรงมืดได้พอดี', 'A rod wrapped in glowing moss — just enough light to see by in a dark hollow.');
  eq('cinderglass_staff', 'Cinderglass Staff', 'rod', 36, 'rare', { atk: 56, matk: 100, b: { int: 3, matkPct: 3, sp: 30 }, c: '#e07a3a', art: 'rune_staff' },
    'คทาแก้วหลอมจากเถ้าถ่านของโคมเก่า เวทที่ผ่านมันออกมาร้อนกว่าที่ร่ายเข้าไป', 'A staff of glass melted from old lantern cinders. Magic leaves it hotter than it went in.');
  eq('cipher_staff', 'Cipher Staff', 'rod', 47, 'uncommon', { atk: 65, matk: 114, b: { int: 3, castPct: 3 }, c: '#6a88e0', art: 'rune_staff' },
    'คทาที่สลักรหัสไว้ทั้งแท่ง อ่านออกแค่ตอนใช้เวทเท่านั้น', 'A staff engraved with cipher from end to end. It can only be read while casting.');
  eq('rootlight_staff', 'Rootlight Staff', 'rod', 53, 'uncommon', { atk: 67, matk: 122, b: { int: 3, sp: 40 }, c: '#a0d060', art: 'rune_staff' },
    'คทาที่ปลายมีแสงจากน้ำเลี้ยงใต้ราก อุ่นเหมือนมือคนที่ยังหายใจ', 'A staff tipped with sap-light from beneath the roots, warm as a hand that still breathes.');
  eq('wyrmspine_rod', 'Wyrmspine Rod', 'rod', 64, 'rare', { atk: 78, matk: 150, b: { int: 4, matkPct: 5, castPct: 4 }, c: '#5ac04a', art: 'seer_staff' },
    'คทาจากข้อกระดูกสันหลังลูกมังกร เวทไหลตามข้อทีละข้ออย่างเป็นจังหวะ', 'A rod from a wyrmling spine. Magic climbs it one vertebra at a time, in rhythm.');
  eq('hollowbloom_scepter', 'Hollowbloom Scepter', 'rod', 65, 'uncommon', { atk: 74, matk: 143, b: { int: 3, castPct: 4 }, c: '#c8642a', art: 'rune_staff' },
    'คทาดอกสนิมจากใจกลางโพรง กลีบหุบทุกครั้งที่เวทไหลผ่าน', 'A rust-bloom scepter from the heart of the Hollow. Its petals fold shut each time magic passes through.');
  // ---------- ธนู (bow) ----------
  eq('wolfsinew_bow', 'Wolfsinew Bow', 'bow', 19, 'uncommon', { atk: 76, b: { dex: 1, agi: 1 }, c: '#b09060', art: 'great_bow' },
    'ธนูสายเอ็นหมาป่า ดีดแล้วเสียงต่ำเหมือนหมาป่าขู่', 'A bow strung with wolf sinew. It twangs low, like a wolf\'s growl.');
  eq('ironwood_skybow', 'Ironwood Skybow', 'bow', 28, 'rare', { atk: 108, b: { dex: 3, agi: 1, crit: 3 }, c: '#7a9ab8', art: 'great_bow' },
    'ธนูไม้เหล็กที่ยิงได้ไกลจนลูกศรลับสายตา แรงดึงสม่ำเสมอไม่ล้า', 'An ironwood bow that shoots so far the arrow vanishes from sight. Its draw never tires.');
  eq('helgate_recurve', 'Helgate Recurve', 'bow', 32, 'uncommon', { atk: 113, b: { dex: 2, agi: 1 }, c: '#8a98b8', art: 'composite_bow' },
    'ธนูโค้งของพลธนูประตู Hel ปลายโค้งงอกลับดีดลูกศรได้แรงเกินขนาด', 'A recurve of Hel\'s gate archers. The curled tips throw an arrow harder than its size allows.');
  eq('cipherstring_bow', 'Cipherstring Bow', 'bow', 40, 'uncommon', { atk: 129, b: { dex: 2, agi: 2, crit: 2 }, c: '#6a88e0', art: 'composite_bow' },
    'ธนูสายเส้นใยข้อมูล ยิ่งยิงนานยิ่งจับจังหวะเป้าหมายได้แม่น', 'A bow strung with data fiber. The longer you shoot, the better it reads a target\'s rhythm.');
  eq('rootwhisper_bow', 'Rootwhisper Bow', 'bow', 50, 'uncommon', { atk: 161, b: { dex: 3, agi: 1 }, c: '#8a7a40', art: 'great_bow' },
    'ธนูที่กระซิบเบา ๆ ทุกครั้งที่น้าวสาย เหมือนรากกำลังบอกทิศทางลม', 'A bow that whispers when drawn, as if the roots were telling you the wind.');
  eq('verdigris_longbow', 'Verdigris Longbow', 'bow', 52, 'rare', { atk: 164, b: { dex: 3, agi: 2, crit: 4 }, c: '#4aa088', art: 'great_bow' },
    'ธนูยาวสนิมเขียวที่ยังดีดแน่นเหมือนวันแรก ลูกศรทุกดอกลงจุดเดียวกัน', 'A verdigris-green longbow that still snaps as tight as the first day. Every arrow lands in the same place.');
  eq('gnarlwood_warbow', 'Gnarlwood Warbow', 'bow', 60, 'uncommon', { atk: 185, b: { dex: 3, agi: 2 }, c: '#7a5a30', art: 'great_bow' },
    'ธนูศึกไม้ปมหนา ต้องใช้แรงสองคนน้าว แต่ลูกศรทะลุเกราะได้', 'A warbow of knotted wood. It takes two people to draw, and the arrow pierces armor.');
  // ---------- กระบอง (mace) ----------
  eq('anvilhide_mace', 'Anvilhide Mace', 'mace', 28, 'rare', { atk: 114, b: { str: 2, vit: 2, hp: 80 }, c: '#8a8a98', art: 'morning_star' },
    'กระบองหัวทั่งตีจากแผ่นหลังของ Iron Brute ตีแล้วเสียงก้องไปทั้งป่า', 'A mace headed with an anvil, cast from an Iron Brute\'s back plate. Each blow rings across the wood.');
  eq('gatepost_mace', 'Gatepost Mace', 'mace', 32, 'uncommon', { atk: 117, b: { str: 1, vit: 1 }, c: '#a0a0b0', art: 'morning_star' },
    'กระบองที่หักมาจากเสาประตู Hel ยังมีรอยสลักหมายเลขช่องทางอยู่', 'A mace snapped from a post of Hel\'s gate. The lane number is still engraved on it.');
  eq('vaultbreaker_mace', 'Vaultbreaker Mace', 'mace', 44, 'uncommon', { atk: 143, b: { str: 2, vit: 1 }, c: '#7a90b8', art: 'morning_star' },
    'กระบองของหน่วยกู้คลังข้อมูล ใช้ทุบประตูตู้นิรภัยที่ล็อกค้างมานาน', 'A mace of the Archive salvage crew, made for breaking vault doors that have stayed locked too long.');
  eq('rootknot_maul', 'Rootknot Maul', 'mace', 57, 'uncommon', { atk: 170, b: { str: 2, vit: 2 }, c: '#8a6a30', art: 'morning_star' },
    'ค้อนที่ปมรากเป็นหัว หนักและแน่นจนตีหินแตกได้ไม่สะท้านมือ', 'A maul with a root-knot for a head, heavy and dense enough to split stone without a tremor in the hand.');
  eq('rotbark_warhammer', 'Rotbark Warhammer', 'mace', 62, 'rare', { atk: 188, b: { str: 3, vit: 2, atkPct: 3 }, c: '#6a5a2a', art: 'morning_star' },
    'ค้อนศึกเปลือกไม้สนิม ผิวหยาบแต่แกนในแน่นจนไม่มีอะไรทำให้บุบได้', 'A warhammer faced in rotted bark. Rough on the outside, dense enough within that nothing dents it.');
  eq('shellsplitter_mace', 'Shellsplitter Mace', 'mace', 65, 'uncommon', { atk: 184, b: { str: 2, vit: 2, atkPct: 2 }, c: '#9a90b0', art: 'morning_star' },
    'กระบองสำหรับทุบโครงร่างกลวง เสียงที่ได้ตอนตีคือเสียงของความว่างเปล่า', 'A mace for cracking hollow shells. The sound it makes is the sound of nothing inside.');
  // ---------- เกราะ (armor) ----------
  eq('hearthglass_robe', 'Hearthglass Robe', 'armor', 20, 'uncommon', { def: 4, mdef: 13, b: { int: 2, sp: 30 }, c: '#7fb0e0', art: 'silk_robe' },
    'ชุดคลุมทอด้วยใยแก้วจากเตาผิง กันเวทได้ดีและอุ่นเสมอ', 'A robe woven of hearth-glass thread. It turns spells well and always stays warm.');
  eq('packhide_jerkin', 'Packhide Jerkin', 'armor', 27, 'uncommon', { def: 6, mdef: 4, b: { agi: 1, hp: 110 }, c: '#a08868', art: 'leather_vest' },
    'เสื้อหนังจากขนฝูง Fenrir เบาพอวิ่งได้ และหนาพอรับเขี้ยวได้', 'A jerkin of Fenrir pack hide — light enough to run in, thick enough to turn a fang.');
  eq('vaultguard_coat', 'Vaultguard Coat', 'armor', 38, 'uncommon', { def: 8, mdef: 4, b: { vit: 1, hp: 130 }, c: '#6a88b8', art: 'padded_plate' },
    'เสื้อคลุมเสริมแผ่นของยามเฝ้าคลังข้อมูล ปะซ่อมมาแล้วนับไม่ถ้วนแต่ยังใช้ได้', 'A padded coat of the Archive vault guards. Patched too many times to count, and still serviceable.');
  eq('cipherweave_robe', 'Cipherweave Robe', 'armor', 46, 'uncommon', { def: 5, mdef: 14, b: { int: 3, sp: 50 }, c: '#6a70e0', art: 'silk_robe' },
    'ชุดคลุมที่ทอรหัสไว้ในเนื้อผ้า เวทศัตรูที่เข้ามาจะอ่านไม่ออกและพลาดเป้า', 'A robe with cipher woven into the cloth. Enemy spells cannot read it, and miss.');
  eq('rootsage_robe', 'Rootsage Robe', 'armor', 54, 'rare', { def: 5, mdef: 14, b: { int: 3, sp: 60, castPct: 5 }, c: '#5a9a50', art: 'silk_robe' },
    'ชุดคลุมของผู้เฒ่าที่ฟังเสียงรากมานานปี ร่ายเวทเร็วขึ้นเพราะรู้จังหวะของน้ำเลี้ยง', 'The robe of an elder who listened to the roots for years. Spells come quicker, for it knows the sap\'s rhythm.');
  eq('hollowhide_vest', 'Hollowhide Vest', 'armor', 62, 'uncommon', { def: 11, mdef: 6, b: { vit: 2, agi: 1, hp: 220 }, c: '#7a6a4a', art: 'leather_vest' },
    'เสื้อกั๊กหนังหนาจากสัตว์ใน Hollow ไม่สวยแต่ตายยากกว่าคนใส่', 'A thick-hide vest from the Hollow\'s beasts. Not pretty, but harder to kill than the wearer.');
  // ---------- หมวก (head) ----------
  eq('emberscout_cap', 'Emberscout Cap', 'head', 22, 'uncommon', { def: 4, b: { vit: 1, flee: 2 }, c: '#e08a40', art: 'hat' },
    'หมวกนักสำรวจที่เคลือบกันความร้อน ใส่เดินผ่านเขตเถ้าถ่านได้สบาย', 'A scout cap with a heat-proof coat, comfortable even when walking through cinder country.');
  eq('rootseer_circlet', 'Rootseer Circlet', 'head', 50, 'rare', { def: 6, mdef: 6, b: { int: 2, vit: 1, sp: 40 }, c: '#8ac060', art: 'ribbon' },
    'มงกุฎเส้นรากบางที่ได้ยินเสียงใต้ดิน เตือนผู้สวมก่อนพื้นจะสั่น', 'A thin circlet of root that hears the underground. It warns the wearer before the ground shakes.');
  eq('hollowplate_helm', 'Hollowplate Helm', 'head', 66, 'uncommon', { def: 9, b: { vit: 2, str: 1, hp: 120 }, c: '#8a7aa8', art: 'iron_helm' },
    'หมวกเหล็กจากแผ่นเกราะกลวง ตีครั้งไหนก็ก้องจนศัตรูเสียจังหวะ', 'A helm cut from hollow plating. Every hit rings, and the ringing throws enemies off their rhythm.');
  // ---------- โล่ (shield) ----------
  eq('ember_kite', 'Ember Kite Shield', 'shield', 20, 'uncommon', { def: 5, b: { hp: 100 }, c: '#e08a40', art: 'guard' },
    'โล่ว่าวขอบเหล็กที่ผ่านไฟมาแล้วหลายรอบ สีแดงที่ขอบไม่ใช่สีทา', 'A kite shield with iron edges that has been through the fire many times. The red at its rim is not paint.');
  eq('packhide_buckler', 'Packhide Buckler', 'shield', 27, 'uncommon', { def: 6, b: { hp: 130 }, c: '#a08868', art: 'guard' },
    'โล่เล็กหุ้มหนังฝูงหมาป่า กระชับแขนจนเหมือนเป็นส่วนหนึ่งของร่าง', 'A small shield faced with pack hide, snug on the arm as if part of the body.');
  eq('vault_door_shield', 'Vault Door Shield', 'shield', 41, 'uncommon', { def: 8, mdef: 2, b: { vit: 1, hp: 190 }, c: '#6a88b8', art: 'round_shield' },
    'โล่ที่ตัดจากบานประตูตู้นิรภัยเก่า หนักแต่ไม่มีอะไรเจาะทะลุ', 'A shield cut from an old vault door. Heavy, but nothing pierces it.');
  eq('rootwall_buckler', 'Rootwall Buckler', 'shield', 57, 'uncommon', { def: 9, mdef: 3, b: { vit: 1, hp: 260 }, c: '#7a8a40', art: 'round_shield' },
    'โล่ที่รากเรียงซ้อนกันเป็นกำแพงเล็ก ๆ รับแรงกระแทกกระจายออกทุกทิศ', 'A shield of roots layered into a tiny wall, spreading each blow outward in every direction.');
  eq('shellback_shield', 'Shellback Shield', 'shield', 65, 'uncommon', { def: 10, mdef: 3, b: { vit: 2, hp: 300 }, c: '#9a90b0', art: 'round_shield' },
    'โล่จากกระดองของโครงร่างกลวง เบากว่าที่ควรเพราะข้างในไม่มีอะไร', 'A shield from a hollow shell\'s carapace. Lighter than it should be — there is nothing inside.');
  // ---------- ผ้าคลุม (garment) ----------
  eq('rootmoth_mantle', 'Rootmoth Mantle', 'garment', 48, 'uncommon', { def: 3, mdef: 4, b: { agi: 2, flee: 6 }, c: '#b0c8a0', art: 'muffler' },
    'ผ้าคลุมทอจากปีกผีเสื้อกลางคืนใต้ราก เบาจนลมยังไม่รู้ว่าเจ้าผ่านไป', 'A mantle woven from the wings of root-moths, so light the wind does not notice you pass.');
  eq('verdigris_cape', 'Verdigris Cape', 'garment', 56, 'rare', { def: 4, mdef: 4, b: { agi: 3, flee: 6, hp: 160 }, c: '#4aa088', art: 'muffler' },
    'ผ้าคลุมโลหะบางสีเขียวขึ้นสนิม โบกแล้วเสียงกังวานเหมือนระฆังเล็ก ๆ', 'A thin metal cape gone green with verdigris. It chimes like a small bell when it sways.');
  eq('hollowshade_cloak', 'Hollowshade Cloak', 'garment', 64, 'uncommon', { def: 5, mdef: 5, b: { agi: 2, flee: 6, hp: 180 }, c: '#3a6a50', art: 'muffler' },
    'ผ้าคลุมสีเงาของ Hollow ใส่แล้วเงาของเจ้าเบาบางกว่าปกติ', 'A cloak the color of the Hollow\'s shade. Wear it and your own shadow grows thin.');
  // ---------- รองเท้า (shoes) ----------
  eq('vaultstep_greaves', 'Vaultstep Greaves', 'shoes', 33, 'uncommon', { def: 4, b: { agi: 1, speedPct: 4, hp: 110 }, c: '#7a90b8', art: 'boots' },
    'รองเท้าพื้นยางของยามคลังข้อมูล เดินบนพื้นโลหะแล้วไม่มีเสียง', 'Rubber-soled greaves of the Archive guards. They make no sound on a metal floor.');
  eq('rootwalker_boots', 'Rootwalker Boots', 'shoes', 58, 'uncommon', { def: 5, b: { agi: 2, vit: 1, speedPct: 3, hp: 135 }, c: '#8a7a30', art: 'boots' },
    'รองเท้าที่พื้นเป็นเส้นรากสาน เกาะรากเปียกได้แน่นไม่ลื่น', 'Boots soled with woven root fiber. They grip wet roots and never slip.');

  // ===================== ตารางดรอป =====================
  // [มอน, [[ไอเทม, โอกาสเริ่มต้น]...]] — ใส่ต่อท้ายโต๊ะเดิม แล้วย่อทั้งโต๊ะให้ผลรวมถ่วงน้ำหนักของอุปกรณ์เท่าเดิม
  const GAP_DROPS = [
    ['bone_warden', [['ashforge_blade', 0.02], ['hearthglass_robe', 0.02]]],
    ['fenrir_pup', [['ashtail_dirk', 0.02], ['ember_kite', 0.02]]],
    ['mossback', [['wolfsinew_bow', 0.02], ['emberscout_cap', 0.02]]],
    ['tuskboar', [['glowmoss_rod', 0.02]]],
    ['hel_maiden', [['wolfwood_hewer', 0.02], ['packhide_buckler', 0.02]]],
    ['hel_guard', [['packhide_jerkin', 0.02], ['ironwood_skybow', 0.004]]],
    ['rust_sap', [['anvilhide_mace', 0.004], ['helwatch_sabre', 0.02]]],
    ['archive_warden', [['helgate_recurve', 0.02], ['vaultstep_greaves', 0.02]]],
    ['rust_mine', [['gatepost_mace', 0.02]]],
    ['archive_maiden', [['cinderglass_staff', 0.004], ['archive_hatchet', 0.02], ['vaultguard_coat', 0.02]]],
    ['rust_draugr', [['archive_stylus', 0.02], ['vault_door_shield', 0.02], ['vaultbreaker_mace', 0.02]]],
    ['root_crawler', [['cipherstring_bow', 0.02], ['archivist_claymore', 0.004]]],
    ['gnawed_stump', [['rustbite_axe', 0.004], ['veinbiter_kris', 0.004], ['draugr_splitter', 0.02]]],
    ['gnawed_brute', [['cipherweave_robe', 0.02], ['cipher_staff', 0.02], ['rootmoth_mantle', 0.02]]],
    ['root_gnawer', [['rootsworn_blade', 0.02], ['rootseer_circlet', 0.004], ['verdigris_longbow', 0.004]]],
    ['rust_bloom', [['rootwhisper_bow', 0.02], ['rootsplit_dirk', 0.02], ['rootsage_robe', 0.004]]],
    ['hollow_shell', [['rootlight_staff', 0.02], ['verdigris_falchion', 0.004], ['verdigris_cape', 0.004], ['rootwall_buckler', 0.02], ['rootwalker_boots', 0.02]]],
    ['nid_spawn', [['rootknot_maul', 0.02], ['bloomthorn_kris', 0.02], ['gnarlroot_axe', 0.02], ['rotbark_warhammer', 0.004], ['hollowshade_cloak', 0.02]]],
    ['rootbound_guard', [['gnarlwood_warbow', 0.02], ['wyrmcleft_axe', 0.004], ['hollowhide_vest', 0.02], ['shellback_shield', 0.02], ['hollowplate_helm', 0.02]]],
    ['rot_colossus', [['rotvein_kris', 0.004], ['wyrmspine_rod', 0.004], ['hollowbloom_scepter', 0.02], ['shellsplitter_mace', 0.02], ['hollowguard_sword', 0.02]]],
  ];
  const GEAR_W = { common: 0.25, uncommon: 0.1, rare: 0.2, epic: 0.2, legend: 0.5 }; // = MUL.mob ใน js/balance.js
  const isGear = id => ITEMS[id] && (ITEMS[id].type === 'weapon' || ITEMS[id].type === 'armor');
  const wOf = id => GEAR_W[ITEMS[id].rarity || 'common'];
  for (const [mid, add] of GAP_DROPS) {
    const m = MOBS[mid]; if (!m || !m.drops) continue;
    const have = new Set(m.drops.map(d => d[0]));
    const fresh = add.filter(([id]) => ITEMS[id] && !have.has(id));
    const before = m.drops.reduce((s, [id, c]) => s + (isGear(id) ? c * wOf(id) : 0), 0);
    const added = fresh.reduce((s, [id, c]) => s + c * wOf(id), 0);
    const k = before > 0 ? before / (before + added) : 1; // ย่อทั้งโต๊ะอุปกรณ์ ให้ผลรวมถ่วงน้ำหนักเท่าเดิม
    m.drops = m.drops.map(([id, c]) => [id, isGear(id) ? +(c * k).toFixed(5) : c]).concat(fresh.map(([id, c]) => [id, +(c * k).toFixed(5)]));
  }
})();
