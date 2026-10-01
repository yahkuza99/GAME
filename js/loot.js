'use strict';
// ============================================================
//  ระบบของดรอปแบบ RO (Loot) — ของเยอะ เน้นฟาร์ม (Lv 1–60)
//  • อุปกรณ์ใหม่ ~100 ชิ้น ทุกช่วง 10 เลเวล ทุกประเภทอาวุธ/ทุกช่องเกราะ — ได้จากมอนเท่านั้น
//  • ความหายาก (rarity): common / uncommon / rare / epic / legend (ขาว/เขียว/น้ำเงิน/ม่วง/ทอง)
//  • ตารางดรอปใหม่ทุกตัว (6–8 อย่าง): ของขาย 30–60% • ยา/วัตถุดิบ/แร่ 2–20% • อุปกรณ์ประจำตัว 0.5–2% • ของหายากมีช่อง 0.1–0.5%
//  • ร้านค้าเหลือแค่ของพื้นฐาน • ชุดเซ็ต (Set bonus) • แร่ตีบวก (Rune Alloy / Volt Ore) ใช้ที่ Brokk ตั้งแต่ +5
//  • ลำแสงบนพื้นเมื่อของ rare ขึ้นไปดรอป • epic/legend ประกาศในแชต
//  โหลดหลัง js/content_ch6.js และก่อน js/balance.js — ไม่แก้ game.js: ห่อ recalc / dropItemOnGround / pickUp จากไฟล์นี้
// ============================================================
const RARITY = {
  common:   { rank: 0, color: '#e8eef6', label: L('ธรรมดา', 'Common') },
  uncommon: { rank: 1, color: '#62e27e', label: L('ดี', 'Uncommon') },
  rare:     { rank: 2, color: '#4fa8ff', label: L('หายาก', 'Rare') },
  epic:     { rank: 3, color: '#c27bff', label: L('มหากาพย์', 'Epic') },
  legend:   { rank: 4, color: '#ffb52e', label: L('ตำนาน', 'Legendary') },
};

const LOOT = {
  ORE: { weapon: 'rune_alloy', armor: 'volt_ore' },
  ORE_FROM: 4, // ตีบวกจาก +4 → +5 ขึ้นไป ใช้แร่ 1 ชิ้นต่อครั้ง
  oreFor(slot) { return slot === 'weapon' ? this.ORE.weapon : this.ORE.armor; },
  rarityOf(id) { const it = ITEMS[id]; return (it && RARITY[it.rarity]) ? it.rarity : 'common'; },
  rank(id) { return RARITY[this.rarityOf(id)].rank; },
  color(id) { return RARITY[this.rarityOf(id)].color; },
  label(id) { return RARITY[this.rarityOf(id)].label; },
  cls(id) { return 'rar-' + this.rarityOf(id); },
  labelColor(id) { return this.rank(id) ? this.color(id) : '#fff6c0'; },
  SETS: {},
  NEW: [], // ไอเทมที่ไฟล์นี้เพิ่ม
  setOf(id) { for (const k in this.SETS) if (this.SETS[k].items.includes(id)) return this.SETS[k]; return null; },
};

(() => {
  // ---------- ตัวช่วยสร้างอุปกรณ์ ----------
  const ICON_OF = { armor: 'armor', head: 'hat', shield: 'shield', garment: 'cloth', shoes: 'shoes', acc: 'ring' };
  const WTYPES = ['dagger', 'sword', 'axe', 'rod', 'bow', 'mace'];
  const PRICE = { common: lv => 200 + lv * 100, uncommon: lv => 150 + lv * 100, rare: lv => 1000 + lv * 400, epic: lv => 8000 + lv * 1200, legend: () => 150000 }; // ขายได้ครึ่งราคา
  const statText = b => (b && typeof PSTAT_FMT === 'function') ? Object.entries(b).filter(([k]) => PSTAT[k]).map(([k, v]) => PSTAT_FMT(k, v)).join(' ') : '';
  const ART = {}; // id ไอเทม → ภาพต้นแบบ (ย้อมสีจากภาพของไอเทมเดิม)
  // kind = ประเภทอาวุธ (dagger…mace) หรือช่องเกราะ (armor head shield garment shoes acc)
  const eq = (id, name, kind, lv, rarity, s, th, en) => {
    const weapon = WTYPES.includes(kind), b = s.b || null;
    const it = {
      id, name, type: weapon ? 'weapon' : 'armor', slot: weapon ? 'weapon' : kind, rarity, lv,
      price: s.price || PRICE[rarity](lv), slots: s.slots || 0,
      jobs: s.jobs || (weapon ? J[kind] : 'all'),
      icon: { s: s.icon || (weapon ? kind : ICON_OF[kind]), c: s.c },
    };
    if (weapon) { it.wtype = kind; it.atk = s.atk || 0; if (s.matk) it.matk = s.matk; }
    else { if (s.def) it.def = s.def; if (s.mdef) it.mdef = s.mdef; }
    if (b) it.b = b;
    const st = statText(b);
    it.desc = L(th, en) + (st ? ' ' + st : '');
    if (s.art) ART[id] = { from: s.art, c: s.c, hue: s.hue, k: s.tk };
    ITEMS[id] = it; LOOT.NEW.push(id);
  };

  // ===================== อุปกรณ์ใหม่ =====================
  // ---------- Lv 1–10: Meadow ----------
  eq('gel_shiv', 'Gel Shiv', 'dagger', 5, 'uncommon', { atk: 50, slots: 1, b: { agi: 1 }, c: '#f28fb4', art: 'knife' },
    'มีดสั้นใบบางชุบเจลกันสนิม คมกว่าที่คิด', 'A thin blade sealed in anti-rust gel. Sharper than it looks.');
  eq('moon_kris', 'Moonlit Kris', 'dagger', 8, 'rare', { atk: 60, slots: 2, b: { luk: 2, crit: 3 }, c: '#dfe6ff', art: 'stiletto' },
    'กริชโค้งดั่งจันทร์เสี้ยว ส่องประกายเงินยามค่ำคืน', 'A crescent-curved kris that glints silver under the night sky.');
  eq('wire_saber', 'Wirecutter Saber', 'sword', 6, 'uncommon', { atk: 68, slots: 1, b: { dex: 1 }, c: '#9ad86a', art: 'falchion' },
    'ดาบที่หลอมจากกรามตัดสายไฟของหน่วยคลาน', "A saber forged from a crawler unit's wire-cutting mandible.");
  eq('moon_hatchet', 'Silvermoon Hatchet', 'axe', 6, 'uncommon', { atk: 70, slots: 1, b: { luk: 2 }, c: '#f0f0ff', art: 'hand_axe' },
    'ขวานเล็กด้ามเงิน พกไว้แล้วรู้สึกดวงดีขึ้นนิดหน่อย', 'A silver-hafted hatchet. Carrying it feels a little lucky.');
  eq('ember_wand', 'Ember Wand', 'rod', 5, 'uncommon', { atk: 22, matk: 36, slots: 1, b: { int: 1 }, c: '#f5a442', art: 'rod' },
    'คทาที่ปลายฝังแกนความร้อนของหน่วยถ่านซึ่งยังเรืองแสงอยู่', 'A wand capped with the still-glowing heat core of an Ember Unit.');
  eq('sprout_staff', 'Sproutcircuit Staff', 'rod', 8, 'rare', { atk: 26, matk: 46, slots: 2, b: { int: 2, sp: 25 }, c: '#8fd35a', art: 'rune_staff' },
    'ไม้เท้าที่วงจรงอกออกมาเป็นใบไม้ พลังเวทไหลลื่นเหมือนน้ำเลี้ยง', 'A staff whose circuits have sprouted leaves. Mana flows through it like sap.');
  eq('rotor_bow', 'Rotorstring Bow', 'bow', 6, 'uncommon', { atk: 46, slots: 1, b: { agi: 1 }, c: '#e0d040', art: 'bow' },
    'ธนูที่ใช้ใบพัดของหน่วยบินทำเป็นกิ่งคันธนู ง้างเบา ปล่อยไว', 'A bow with rotor blades for limbs. Light draw, quick release.');
  eq('tinker_mallet', "Tinker's Mallet", 'mace', 5, 'uncommon', { atk: 54, slots: 1, b: { vit: 1 }, c: '#d0a060', art: 'club' },
    'ค้อนของช่างซ่อม ทุบได้ทั้งน็อตหลวมและหัวมอนสเตอร์', "A tinkerer's mallet. Good for loose bolts and looser monsters.");
  eq('gel_vest', 'Gel-Lined Vest', 'armor', 4, 'uncommon', { def: 3, mdef: 2, slots: 1, b: { hp: 30 }, c: '#f28fb4', art: 'cotton_shirt' },
    'เสื้อเกราะบุเจลซับแรงกระแทก นุ่มแต่รับได้', 'Plating lined with shock-absorbing gel. Soft, but it holds.');
  eq('gelheart_mail', 'Gelheart Mail', 'armor', 8, 'rare', { def: 4, mdef: 4, slots: 2, b: { vit: 1, hp: 60 }, c: '#ff6aa8', art: 'leather_vest' },
    'เกราะที่สร้างรอบแกนเจลสีชมพู เต้นเป็นจังหวะเหมือนหัวใจ', 'Mail built around a pink gel core that pulses like a heartbeat.');
  eq('bunny_visor', 'Bunny-Ear Visor', 'head', 3, 'uncommon', { def: 2, b: { luk: 1, crit: 2 }, icon: 'ribbon', c: '#fafafa', art: 'ribbon', tk: 0.55 },
    'ไวเซอร์เสาอากาศหูกระต่ายคู่ รับสัญญาณโชคได้ชัดแจ๋ว', 'A visor with twin bunny-ear antennae. Picks up luck loud and clear.');
  eq('scrap_buckler', 'Scrap Buckler', 'shield', 6, 'uncommon', { def: 4, slots: 1, b: { hp: 40 }, c: '#a8b0b8', art: 'guard' },
    'โล่เล็กที่ย้ำหมุดจากเศษเหล็ก', 'A small buckler riveted together from scrap.');
  eq('rotor_cape', 'Rotor-Fin Cape', 'garment', 5, 'uncommon', { def: 1, slots: 1, b: { agi: 1, flee: 4 }, c: '#e0d040', art: 'hood' },
    'ผ้าคลุมติดใบพัดจิ๋ว คอยดันตัวให้พ้นอันตราย', 'A cape fitted with tiny rotors that nudge you out of harm.');
  eq('crawler_treads', 'Crawler Treads', 'shoes', 4, 'uncommon', { def: 2, slots: 1, b: { hp: 40 }, c: '#8fd35a', art: 'sandals' },
    'รองเท้าดอกยางแบบตีนตะขาบ เหยียบอะไรก็ไม่ลื่น', 'Caterpillar-tread boots. They grip anything.');
  eq('ember_coil', 'Ember Coil Ring', 'acc', 5, 'uncommon', { b: { dex: 1, hit: 4 }, c: '#f5a442', art: 'ring' },
    'แหวนขดลวดความร้อน นิ้วอุ่น มือนิ่ง', 'A heated coil ring. Keeps your fingers warm and your aim steady.');
  eq('hearth_coil', 'Hearthcore Earring', 'acc', 6, 'rare', { slots: 1, b: { int: 1, dex: 1, matk: 8 }, c: '#ff8040', art: 'earring' },
    'ต่างหูที่บรรจุแกนเตาผิงซึ่งไม่เคยมอดดับ', 'An earring holding a hearth-core that never goes out.');
  eq('meadow_charm', 'Meadow Charm', 'acc', 1, 'rare', { slots: 1, b: { luk: 2, hp: 50, sp: 10 }, c: '#90e070', art: 'rune_charm' },
    'เครื่องรางแห่งทุ่งหญ้า สลักรูนแห่งการเริ่มต้น', 'A meadow charm carved with the rune of beginnings.');

  // ---------- Lv 11–20: Mistlake / Wolfwood ขอบป่า / Hel's Hollow ปากถ้ำ ----------
  eq('sentry_saber', 'Sentry Saber', 'sword', 12, 'uncommon', { atk: 82, slots: 1, b: { vit: 1 }, c: '#b07840', art: 'broadsword' },
    'ดาบประจำการของหน่วยยามสนิม ที่ด้ามยังมีเลขทะเบียน', "A Rust Sentry's service saber. The serial number is still on the grip.");
  eq('sentry_plate', 'Sentry Plating', 'armor', 12, 'uncommon', { def: 6, slots: 1, b: { vit: 1 }, jobs: J.heavy, c: '#b07840', art: 'chain_mail' },
    'แผ่นเกราะหนาของหน่วยยาม สนิมนิดหน่อย แต่เหล็กล้วน ๆ', 'Heavy sentry plating. A little rust, a lot of steel.');
  eq('bark_shield', 'Barkplate Shield', 'shield', 12, 'uncommon', { def: 5, slots: 1, b: { hp: 80 }, c: '#8a6038', art: 'guard' },
    'โล่แผ่นเหล็กลายเปลือกไม้', 'A shield of bark-patterned plate.');
  eq('mist_mantle', 'Mistlake Mantle', 'garment', 14, 'uncommon', { def: 2, mdef: 2, slots: 1, b: { int: 1, flee: 3 }, c: '#90c8e0', art: 'muffler' },
    'ผ้าคลุมไหล่สีหมอกจากริมทะเลสาบ', 'A mist-grey mantle from the lakeshore.');
  eq('sentinel_core', 'Sentinel Core', 'acc', 10, 'rare', { slots: 1, b: { vit: 2, def: 1, hp: 80 }, c: '#e09040', art: 'clip' },
    'แกนกลางของหน่วยยามที่ยังยืนเฝ้า แม้ร่างจะพังไปนานแล้ว', 'The core of a sentry that kept its post long after its body fell.');
  eq('hopper_kris', 'Springsteel Kris', 'dagger', 12, 'uncommon', { atk: 66, slots: 1, b: { agi: 2 }, c: '#80c040', art: 'cutter' },
    'กริชเหล็กสปริง แทงทีไรเด้งกลับเข้ามือเอง', 'A springsteel kris that snaps back to your hand after every thrust.');
  eq('spring_greaves', 'Spring-Heel Greaves', 'shoes', 12, 'uncommon', { def: 2, slots: 1, b: { agi: 1, flee: 3 }, c: '#80c040', art: 'shoes' },
    'สนับแข้งติดสปริง หลบแต่ละทีไปได้ไกลขึ้น', 'Spring-loaded greaves. Every dodge goes a little farther.');
  eq('spring_band', 'Coilspring Band', 'acc', 15, 'uncommon', { b: { agi: 2 }, c: '#a0e060', art: 'ring' },
    'กำไลขดสปริงที่ทำให้ข้อมือไวขึ้น', 'A coiled spring band that quickens the wrist.');
  eq('mistfang', 'Mistfang', 'dagger', 16, 'rare', { atk: 76, slots: 2, b: { agi: 2, crit: 4 }, c: '#90d0f0', art: 'stiletto' },
    'มีดเขี้ยวที่ชุบในหมอกทะเลสาบ มองแทบไม่เห็นคม', 'A fang-blade tempered in lake mist. You can barely see the edge.');
  eq('mine_breaker', 'Minebreaker Axe', 'axe', 14, 'uncommon', { atk: 90, slots: 1, b: { str: 1 }, c: '#d8433a', art: 'battle_axe' },
    'ขวานรื้อทุ่นระเบิด หัวหนัก แต่ฟาดทีเหมือนระเบิดลง', 'A mine-clearing axe. Top-heavy, and it hits like a blast.');
  eq('blastcap_helm', 'Blastcap Helm', 'head', 13, 'uncommon', { def: 4, slots: 1, b: { vit: 1 }, c: '#d8433a', art: 'iron_helm' },
    'หมวกเหล็กทรงดอกเห็ด ออกแบบมาให้รับแรงระเบิด', 'A mushroom-domed helm built to shrug off blasts.');
  eq('mist_longbow', 'Mistlake Longbow', 'bow', 13, 'uncommon', { atk: 60, slots: 1, b: { dex: 1 }, c: '#70b0d8', art: 'composite_bow' },
    'ธนูยาวจากริมทะเลสาบหมอก สายไม่หย่อนแม้อากาศชื้น', "A longbow from the misty shore. Its string won't slacken in the damp.");
  eq('tidecaller_rod', 'Tidecaller Rod', 'rod', 16, 'rare', { atk: 30, matk: 62, slots: 2, b: { int: 2, castPct: 5 }, c: '#3a9ae0', art: 'rune_staff' },
    'คทาเรียกกระแสน้ำ ถือแล้วได้ยินเสียงคลื่นในหัว', 'A tidecaller rod. You can hear waves in your head when you hold it.');
  eq('moss_scepter', 'Mossglow Scepter', 'rod', 14, 'uncommon', { atk: 28, matk: 50, slots: 1, b: { int: 1, healPct: 5 }, c: '#7fcf6f', art: 'rod' },
    'คทามอสเรืองแสง พลังรักษาไหลผ่านได้ง่าย', 'A glowing moss scepter. Healing magic runs through it easily.');
  eq('mist_robe', 'Mistweave Robe', 'armor', 12, 'uncommon', { def: 3, mdef: 12, slots: 1, b: { int: 2 }, c: '#9ad0e0', art: 'silk_robe' },
    'เสื้อคลุมทอจากหมอกควบแน่น เบาราวกับไม่ได้สวม', 'A robe woven from condensed mist. Like wearing nothing at all.');
  eq('verdant_circlet', 'Verdant Circlet', 'head', 14, 'rare', { def: 2, mdef: 4, slots: 1, b: { int: 2, sp: 30, healPct: 6 }, icon: 'ribbon', c: '#60d070', art: 'ribbon', tk: 0.55 },
    'มงกุฎเถาวัลย์เขียวชอุ่ม ช่วยให้ใจสงบนิ่ง', 'A circlet of evergreen vine that steadies the mind.');
  eq('rune_mallet', 'Runebound Mallet', 'mace', 15, 'uncommon', { atk: 74, slots: 1, b: { int: 1, vit: 1 }, c: '#60a0d0', art: 'mace' },
    'ค้อนสลักรูน ฟาดลงทีไรประกายเวทแตกกระจาย', 'A rune-etched mallet that sparks with magic on impact.');
  eq('barrow_axe', 'Barrow Axe', 'axe', 18, 'uncommon', { atk: 98, slots: 1, b: { str: 2 }, c: '#709070', art: 'battle_axe' },
    'ขวานจากเนินฝังศพ ผ่านไปพันปีคมก็ยังไม่ทื่อ', "An axe from the barrow mounds. A thousand years, and the edge hasn't dulled.");
  eq('grave_mail', 'Gravecloth Mail', 'armor', 18, 'uncommon', { def: 6, mdef: 3, slots: 1, b: { hp: 100 }, jobs: J.light, c: '#709070', art: 'leather_vest' },
    'ผ้าห่อศพเสริมแผ่นเหล็ก', 'Gravecloth wrappings reinforced with iron plates.');
  eq('husk_signet', 'Husk Signet', 'acc', 17, 'rare', { slots: 1, b: { vit: 2, hp: 100 }, c: '#5a9a5a', art: 'ring' },
    'แหวนตราของนักรบที่ร่างยังเดินอยู่', 'The signet of a warrior whose body still walks.');
  eq('ashtail_wrap', 'Ashtail Wrap', 'garment', 18, 'uncommon', { def: 2, slots: 1, b: { agi: 2, flee: 5 }, c: '#9a9a9a', art: 'hood' },
    'ผ้าพันคอจากหางกรองเถ้า กันควันได้ยอดเยี่ยม', 'A wrap made from ash-filter tails. Superb against smoke.');
  eq('ash_hood', 'Ashen Hood', 'head', 18, 'uncommon', { def: 3, slots: 1, b: { agi: 1, flee: 2 }, c: '#808080', art: 'hat' },
    'ฮู้ดสีเถ้าที่กลืนไปกับป่า', 'An ash-grey hood that melts into the forest.');
  eq('cinder_cloak', 'Cindertail Cloak', 'garment', 20, 'rare', { def: 3, slots: 1, b: { agi: 2, flee: 6, crit: 3 }, c: '#ff7040', art: 'muffler' },
    'ผ้าคลุมชายคุไฟ ทิ้งรอยถ่านไว้ทุกก้าว', 'A cloak with smoldering hems. It leaves embers in its wake.');

  // ---------- MVP: Seraph Core (Mistlake) ----------
  eq('seraph_edge', 'Seraphic Edge', 'sword', 22, 'epic', { atk: 115, matk: 20, slots: 1, b: { int: 2, luk: 2 }, c: '#fff0a0', art: 'valhalla_blade' },
    'ดาบของเทวทูต ฟันทีไรขนนกแสงร่วงโปรย', "A seraph's blade. Feathers of light fall with every swing.");
  eq('seraph_staff', 'Choir of Seraphs', 'rod', 22, 'epic', { atk: 45, matk: 90, slots: 1, b: { int: 3, healPct: 10 }, c: '#fff6c0', art: 'seer_staff' },
    'คทาคณะประสานเสียงเทวดา บทสวดดังขึ้นเองทุกครั้งที่ร่ายเวท', 'A choir-staff. Hymns rise on their own whenever you cast.');
  eq('seraph_mantle', 'Seraph Down Mantle', 'garment', 20, 'epic', { def: 3, mdef: 6, slots: 1, b: { luk: 2, flee: 6, hpPct: 3 }, c: '#ffffff', art: 'muffler', tk: 0.6 },
    'ผ้าคลุมขนอ่อนของเทวทูต อุ่นเหมือนแสงยามเช้า', 'A mantle of seraph down, warm as morning light.');
  eq('aureole', 'Aureole of Baldr', 'head', 30, 'legend', { def: 5, mdef: 8, slots: 1, b: { int: 3, luk: 3, agi: 2, hpPct: 5, healPct: 8 }, icon: 'wing', c: '#ffd040', art: 'seraph_wings' },
    'รัศมีของบัลเดอร์ เทพแห่งแสงที่ถูกลืม ส่องสว่างได้แม้ในรากที่มืดที่สุด', 'The halo of Baldr, the forgotten god of light. It shines even in the darkest roots.');

  // ---------- Lv 21–30: Wolfwood / Hel's Hollow ----------
  eq('fenrir_claw', 'Fenrir Clawblade', 'dagger', 25, 'uncommon', { atk: 90, slots: 1, b: { agi: 2, crit: 3 }, c: '#c0c8d8', art: 'cutter' },
    'กรงเล็บของหน่วยเฟนรีร์ ดัดแปลงเป็นมีดต่อสู้', "A Fenrir Unit's claw, refitted as a fighting knife.");
  eq('wolfpelt_cloak', 'Wolfpelt Cloak', 'garment', 24, 'uncommon', { def: 2, slots: 1, b: { agi: 1, flee: 4 }, c: '#b8c0cc', art: 'hood' },
    'ผ้าคลุมขนหมาป่าสังเคราะห์ สวมแล้วเคลื่อนไหวไร้เสียง', 'A cloak of synthetic wolf pelt. You move without a sound.');
  eq('wolfpath_boots', 'Wolfpath Boots', 'shoes', 24, 'uncommon', { def: 3, slots: 1, b: { agi: 1, speedPct: 5 }, c: '#8090a0', art: 'boots' },
    'รองเท้าที่เดินตามรอยหมาป่า เข้าป่าเมื่อไรก็ไม่หลง', 'Boots that follow the wolf-path. You never lose your way in the woods.');
  eq('gleipnir_link', 'Gleipnir Link', 'acc', 25, 'rare', { slots: 1, b: { str: 2, agi: 2 }, c: '#e0e0ff', art: 'clip' },
    'ข้อโซ่ที่ขาดของเกลปเนียร์ — Brokk เห็นแวบเดียวก็จำได้', 'A broken link of Gleipnir. Brokk would know it anywhere.');
  eq('ironhide_maul', 'Ironhide Maul', 'mace', 26, 'uncommon', { atk: 104, slots: 1, b: { vit: 2 }, c: '#8a7456', art: 'morning_star' },
    'กระบองหุ้มหนังเหล็กของหน่วยหมี', "An Iron Brute's hide-wrapped maul.");
  eq('ironhide_plate', 'Ironhide Plating', 'armor', 26, 'uncommon', { def: 8, slots: 1, b: { vit: 1, hp: 120 }, jobs: J.heavy, c: '#6a7a4a', art: 'chain_mail' },
    'เกราะหนังเหล็กหนาเตอะ ซับแรงทุกหมัด', 'Thick iron-hide plating that soaks up every blow.');
  eq('bearheart_band', 'Bearheart Band', 'acc', 26, 'rare', { slots: 1, b: { vit: 3, hpPct: 4 }, c: '#c08050', art: 'glove' },
    'สายรัดข้อมือที่แกนหัวใจของหน่วยหมียังเต้นอยู่ข้างใน', "A wristband with an Iron Brute's heart-core still beating inside.");
  eq('tusk_axe', 'Tuskbreaker Axe', 'axe', 28, 'uncommon', { atk: 122, slots: 1, b: { str: 2 }, c: '#d0d0d8', art: 'battle_axe' },
    'ขวานที่หัวขวานตีขึ้นจากงาเหล็ก', 'An axe whose head is a forged iron tusk.');
  eq('tusk_helm', 'Tusked Helm', 'head', 27, 'uncommon', { def: 5, slots: 1, b: { str: 1 }, c: '#8e7a68', art: 'iron_helm' },
    'หมวกเหล็กประดับงา ใส่แล้วอยากพุ่งชน', 'A tusk-crested helm. Wearing it makes you want to charge.');
  eq('huntsman_bow', "Huntsman's Recurve", 'bow', 24, 'uncommon', { atk: 92, slots: 1, b: { dex: 2, agi: 1 }, c: '#8a6a44', art: 'great_bow' },
    'ธนูโค้งกลับของนายพรานแห่งป่าหมาป่า', 'The recurve bow of a Wolfwood huntsman.');
  eq('charger_greaves', 'Charger Greaves', 'shoes', 28, 'rare', { def: 4, slots: 1, b: { str: 1, speedPct: 6, hp: 80 }, c: '#c06030', art: 'boots' },
    'สนับแข้งของหน่วยจู่โจม พุ่งชนได้ไม่หยุด', 'Shock-trooper greaves made for relentless charges.');
  eq('warden_blade', 'Wardenbone Sword', 'sword', 24, 'uncommon', { atk: 104, slots: 1, b: { str: 1, hit: 5 }, c: '#f0ecd8', art: 'broadsword' },
    'ดาบของผู้คุม แกนดาบเป็นเหล็กรูปกระดูกสันหลัง', "A warden's sword with a skeletal steel spine.");
  eq('bonewall_shield', 'Bonewall Shield', 'shield', 24, 'uncommon', { def: 6, slots: 1, b: { vit: 1, hp: 100 }, jobs: J.heavy, c: '#f0ecd8', art: 'round_shield' },
    'โล่กำแพงกระดูก หนัก แต่นิ่งสนิท', 'A bonewall shield. Heavy, and utterly steady.');
  eq('barrowking_blade', "Barrow-King's Blade", 'sword', 28, 'rare', { atk: 126, slots: 2, b: { str: 2, leech: 2 }, c: '#80b080', art: 'valhalla_blade' },
    'ดาบของราชาแห่งเนินฝังศพ ดื่มพลังชีวิตของทุกสิ่งที่มันฟัน', 'The blade of a barrow-king. It drinks the life of whatever it cuts.');
  eq('soulwick_staff', 'Soulwick Staff', 'rod', 30, 'uncommon', { atk: 50, matk: 84, slots: 1, b: { int: 2, sp: 40 }, c: '#60c0a0', art: 'seer_staff' },
    'คทาไส้ตะเกียงวิญญาณ เปลวไฟสีเขียวไม่เคยดับ', 'A soulwick staff. Its green flame has never gone out.');
  eq('lantern_veil', 'Lantern Veil', 'head', 30, 'uncommon', { def: 3, mdef: 8, b: { int: 2, sp: 30 }, icon: 'ribbon', c: '#5060c0', art: 'ribbon', tk: 0.55 },
    'ผ้าคลุมหน้าของสาวใช้แห่งเฮล มองทะลุความมืดได้', "A Hel Maiden's veil. It lets you see through the dark.");
  eq('helwick_robe', 'Helwick Robe', 'armor', 30, 'rare', { def: 4, mdef: 14, slots: 2, b: { int: 3, castPct: 6 }, c: '#3a4a9a', art: 'silk_robe' },
    'เสื้อคลุมที่เย็บด้วยไส้ตะเกียงของเฮลเอง', "A robe stitched with wicks from Hel's own lanterns.");

  // ---------- Lv 31–40: Hel's Hollow ลึก / Archive Depths ----------
  eq('hel_axe', 'Helgate Axe', 'axe', 32, 'uncommon', { atk: 134, slots: 1, b: { str: 2, vit: 1 }, c: '#505080', art: 'ulfr_axe' },
    'ขวานประตูเฮล ทหารยามถือไว้ไม่ให้ใครผ่าน', 'A Helgate axe, carried by guards who let no one pass.');
  eq('helgate_plate', 'Helgate Plating', 'armor', 32, 'uncommon', { def: 9, slots: 1, b: { vit: 2 }, jobs: J.heavy, c: '#404070', art: 'plate_armor' },
    'เกราะประตูเฮล ดำสนิทและเย็นเฉียบ', 'Helgate plating — pitch black and ice cold.');
  eq('hel_aegis', 'Aegis of Hel', 'shield', 34, 'rare', { def: 8, mdef: 3, slots: 1, b: { vit: 2, stunRes: 10 }, c: '#6060c0', art: 'round_shield' },
    'โล่ของเฮลเอง ผู้ที่ถือจะไม่ล้มลงง่าย ๆ', "Hel's own aegis. Whoever holds it does not fall easily.");
  eq('sap_dirk', 'Sapdrinker Dirk', 'dagger', 33, 'uncommon', { atk: 102, slots: 1, b: { agi: 2, venom: 5 }, c: '#b0602a', art: 'main_gauche' },
    'มีดสั้นที่ดื่มน้ำเลี้ยงสนิม แผลจากมันจะติดพิษ', 'A dirk that drinks rusted sap. Its cuts fester with poison.');
  eq('rustbloom_staff', 'Rustbloom Staff', 'rod', 34, 'uncommon', { atk: 55, matk: 92, slots: 1, b: { int: 2, matkPct: 3 }, c: '#c07030', art: 'rune_staff' },
    'คทาที่สนิมผลิดอกกลายเป็นลวดลายรูน', 'A staff where rust has bloomed into runic patterns.');
  eq('rustbloom_talisman', 'Rustbloom Talisman', 'acc', 33, 'rare', { slots: 1, b: { int: 2, sp: 60, spCostPct: -5 }, c: '#d08040', art: 'rune_charm' },
    'เครื่องรางดอกสนิม ช่วยแบ่งเบาพลังงานที่ใช้ร่ายเวท', 'A rustbloom talisman that eases the drain of spellcasting.');
  eq('archive_greatsword', "Archivist's Greatsword", 'sword', 36, 'uncommon', { atk: 142, slots: 1, b: { str: 2, dex: 1 }, c: '#5ac8d0', art: 'broadsword' },
    'ดาบใหญ่ของผู้พิทักษ์คลัง ใบดาบสลักรหัสดัชนีไว้เต็ม', "An archivist's greatsword, its blade etched with index codes.");
  eq('warden_helm', 'Archive Warden Helm', 'head', 36, 'uncommon', { def: 6, slots: 1, b: { vit: 2 }, c: '#5ac8d0', art: 'iron_helm' },
    'หมวกเหล็กของผู้คุมคลังประกาย', "A spark-archive warden's steel helm.");
  eq('fuse_mace', 'Fusebreaker', 'mace', 38, 'uncommon', { atk: 130, slots: 1, b: { str: 1, int: 1, atkPct: 3 }, c: '#d07a30', art: 'morning_star' },
    'กระบองชนวน ฟาดแรงจนประกายไฟกระเด็น', 'A fuse-mace. It hits hard enough to throw sparks.');
  eq('blast_greaves', 'Blastproof Greaves', 'shoes', 38, 'uncommon', { def: 4, slots: 1, b: { vit: 1, hp: 150 }, c: '#d07a30', art: 'boots' },
    'สนับแข้งกันระเบิด เหยียบทุ่นแล้วยังเดินต่อได้', 'Blastproof greaves. Step on a mine and keep walking.');
  eq('vault_cloak', "Vaultkeeper's Cloak", 'garment', 36, 'uncommon', { def: 3, mdef: 3, slots: 1, b: { int: 1, flee: 5 }, c: '#4a9aa0', art: 'muffler' },
    'ผ้าคลุมของผู้เฝ้าห้องนิรภัยใต้คลัง', 'The cloak of a vaultkeeper from the archive depths.');
  eq('detonator_bow', 'Detonator Longbow', 'bow', 38, 'rare', { atk: 134, slots: 2, b: { dex: 3, crit: 3 }, c: '#ff8030', art: 'ullr_bow' },
    'ธนูยาวที่ลูกศรระเบิดทันทีที่ปักเป้า', 'A longbow whose arrows detonate on impact.');

  // ---------- Lv 41–50: Archive Depths ลึก / Gnawed Roots ต้นทาง ----------
  eq('spark_staff', 'Sparkscript Staff', 'rod', 41, 'uncommon', { atk: 62, matk: 106, slots: 1, b: { int: 3, castPct: 5 }, c: '#a070e0', art: 'seer_staff' },
    'คทาจารึกประกาย ร่ายเวทได้เร็วเหมือนพลิกหน้ากระดาษ', 'A sparkscript staff. Spells come as fast as turning a page.');
  eq('maiden_shroud', "Archive Maiden's Shroud", 'garment', 41, 'uncommon', { def: 3, mdef: 6, slots: 1, b: { int: 2, flee: 3 }, c: '#9a60d0', art: 'hood' },
    'ผ้าคลุมของสาวใช้แห่งคลัง มีกลิ่นกระดาษเก่าจาง ๆ', "An archive maiden's shroud. It smells faintly of old paper.");
  eq('husk_greatsword', 'Rusthusk Greatsword', 'sword', 44, 'uncommon', { atk: 158, slots: 1, b: { str: 2, vit: 1 }, c: '#c06a20', art: 'valhalla_blade' },
    'ดาบใหญ่ที่สนิมกัดกินจนเป็นลายเปลวไฟ', 'A greatsword eaten by rust into flame-like patterns.');
  eq('husk_plate', 'Rusthusk Plating', 'armor', 44, 'uncommon', { def: 11, slots: 1, b: { vit: 2, hp: 200 }, jobs: J.heavy, c: '#c06a20', art: 'plate_armor' },
    'เกราะร่างสนิม หนัก แต่แทบเจาะไม่เข้า', 'Rusthusk plating. Heavy, and nearly impenetrable.');
  eq('rustking_crown', 'Crown of the Rust King', 'head', 44, 'rare', { def: 6, mdef: 4, slots: 1, b: { str: 2, vit: 2 }, c: '#e09040', art: 'hat' },
    'มงกุฎของราชาสนิม ผู้ปกครองคลังที่กำลังผุพัง', 'The crown of the Rust King, ruler of a rotting archive.');
  eq('crawler_fang', 'Rootfang Dagger', 'dagger', 46, 'uncommon', { atk: 130, slots: 1, b: { agi: 3, crit: 4 }, c: '#9a7a50', art: 'stiletto' },
    'มีดเขี้ยวรากที่แทะทะลุเปลือกต้นไม้โลกได้', "A rootfang dagger that can gnaw through the World Tree's bark.");
  eq('root_bow', 'Rootstring Bow', 'bow', 46, 'uncommon', { atk: 150, slots: 1, b: { dex: 3 }, c: '#8a6a40', art: 'great_bow' },
    'ธนูขึ้นสายด้วยใยราก ง้างแล้วสั่นครางเหมือนต้นไม้หายใจ', 'A bow strung with root fiber. It hums like a breathing tree.');
  eq('rootrunner_boots', 'Rootrunner Boots', 'shoes', 46, 'rare', { def: 5, slots: 1, b: { agi: 3, flee: 4, speedPct: 8 }, c: '#60b050', art: 'boots' },
    'รองเท้าวิ่งไต่ราก ว่องไวราวกับกระรอกราตาทอสก์', 'Root-running boots, swift as Ratatoskr himself.');
  eq('rootguard_shield', 'Rootguard Shield', 'shield', 52, 'uncommon', { def: 9, mdef: 2, slots: 1, b: { vit: 2, hp: 200 }, jobs: J.heavy, c: '#6a8a44', art: 'round_shield' },
    'โล่จากเปลือกรากชั้นนอกสุด รอยฟันยังอยู่ครบ', 'A shield of outermost root bark, tooth marks and all.');
  eq('sentinel_maul', 'Rootwarden Maul', 'mace', 49, 'uncommon', { atk: 152, slots: 1, b: { str: 1, vit: 2 }, c: '#8a7a9a', art: 'morning_star' },
    'กระบองตอไม้ของหน่วยยามราก', "A root-sentry's stump maul.");
  eq('stump_buckler', 'Heartwood Buckler', 'shield', 49, 'uncommon', { def: 8, mdef: 2, slots: 1, b: { hp: 250 }, c: '#8a7a9a', art: 'guard' },
    'โล่ไม้แก่นที่ถูกแทะจนกลมดิก', 'A heartwood buckler gnawed perfectly round.');
  eq('heartwood_cleaver', 'Ironheart Cleaver', 'axe', 49, 'uncommon', { atk: 165, slots: 1, b: { str: 2, hit: 5 }, c: '#a08050', art: 'hand_axe' },
    'ขวานแก่นเหล็ก ฟันรากทั้งวันก็ไม่บิ่น', 'An ironheart cleaver that never chips, even on roots.');
  eq('yggdrasil_sigil', 'Sigil of Yggdrasil', 'acc', 52, 'rare', { slots: 1, b: { vit: 2, int: 2, hpPct: 5, spPct: 5 }, c: '#60f0a0', art: 'rune_charm' },
    'ตราแห่งต้นไม้โลก อบอุ่นเหมือนสิ่งมีชีวิต', 'A sigil of the World Tree, warm as a living thing.');

  // ---------- MVP: Kitsura EX (Hel's Hollow) ----------
  eq('kitsune_tail', 'Nine-Ember Tail', 'garment', 40, 'epic', { def: 4, mdef: 4, slots: 1, b: { agi: 3, int: 3, flee: 8, castPct: 5 }, c: '#f0c050', art: 'muffler' },
    'หางไฟเก้าหาง แต่ละหางเก็บความทรงจำของจิ้งจอกคนละตัว', 'A nine-ember tail. Each tail holds the memory of a different fox.');
  eq('foxfire_bow', 'Foxfire Bow', 'bow', 42, 'epic', { atk: 168, slots: 1, b: { dex: 3, agi: 2, crit: 5 }, c: '#ff9a30', art: 'ullr_bow' },
    'ธนูไฟจิ้งจอก ลูกศรเลี้ยวตามเหยื่อราวกับวิญญาณ', 'A foxfire bow. Its arrows curve after their quarry like spirits.');
  eq('kitsura_visor', 'Kitsura Faceplate', 'head', 42, 'epic', { def: 5, mdef: 6, slots: 1, b: { luk: 3, crit: 5, matkPct: 5 }, c: '#ff7040', art: 'hat' },
    'แผ่นหน้ากากไวเซอร์ของคิทสึระ ยิ้มอยู่ตลอดเวลา', "Kitsura's visor faceplate. It is always smiling.");
  eq('ragnarok_ember', 'Ember of Ragnarök', 'acc', 45, 'legend', { slots: 1, b: { str: 3, int: 3, dex: 3, atkPct: 5, matkPct: 5 }, c: '#ff5020', art: 'earring' },
    'ถ่านไฟจากวันสิ้นโลกที่ยังมาไม่ถึง', 'An ember from an end of the world that has not yet come.');

  // ---------- Lv 51–60: Gnawed Roots ----------
  eq('brute_greataxe', 'Rootsplitter Greataxe', 'axe', 53, 'uncommon', { atk: 180, slots: 1, b: { str: 3 }, c: '#b05a2a', art: 'ulfr_axe' },
    'ขวานใหญ่ผ่าราก หนักจนคนธรรมดายกไม่ขึ้น', 'A rootsplitting greataxe, too heavy for ordinary hands.');
  eq('brute_plate', 'Gnawed Bulwark', 'armor', 53, 'uncommon', { def: 13, slots: 1, b: { vit: 3, hp: 250 }, jobs: J.heavy, c: '#9a4a1a', art: 'plate_armor' },
    'เกราะปราการ ถูกแทะมานับครั้งไม่ถ้วนแต่ไม่เคยแตก', 'Bulwark plating — gnawed on countless times, never broken.');
  eq('gnawhide_boots', 'Gnawhide Boots', 'shoes', 53, 'uncommon', { def: 5, slots: 1, b: { vit: 1, agi: 2, hp: 120 }, c: '#7a5030', art: 'boots' },
    'รองเท้าหนังเจ้าแทะราก ทั้งทนทานและเงียบเชียบ', 'Boots of gnawer hide — tough and quiet.');
  eq('jotun_knuckle', 'Jötunn Knuckle', 'mace', 55, 'rare', { atk: 175, slots: 2, b: { str: 3, vit: 2, atkPct: 4 }, c: '#c0a080', art: 'morning_star' },
    'สนับมือยักษ์โยตุน หมัดเดียวสะเทือนถึงราก', 'A jötunn knuckle. One blow shakes the roots.');
  eq('gnawer_saber', 'Gnawtooth Saber', 'sword', 57, 'uncommon', { atk: 184, slots: 1, b: { str: 2, agi: 2 }, c: '#b03a2a', art: 'falchion' },
    'ดาบโค้งฟันแทะ ฟันแล้วฉีกขาดเหมือนโดนกัด', 'A gnawtooth saber that tears like a bite.');
  eq('gnawer_hood', 'Gnawer Hide Hood', 'head', 57, 'uncommon', { def: 7, slots: 1, b: { agi: 2, flee: 4 }, c: '#a03020', art: 'hat' },
    'ฮู้ดหนังเจ้าแทะราก ประดับด้วยเขี้ยว', 'A hood of gnawer hide, trimmed with fangs.');
  eq('gnawroot_bow', 'Gnawroot Warbow', 'bow', 55, 'uncommon', { atk: 174, slots: 1, b: { dex: 3, agi: 1 }, c: '#8a4028', art: 'great_bow' },
    'ธนูศึกที่แกะจากรากถูกแทะ ง้างสายทีไรรากสั่นสะท้าน', 'A warbow carved from gnawed root. The roots tremble when it is drawn.');
  eq('rootheart_rod', 'Rootheart Scepter', 'rod', 57, 'rare', { atk: 78, matk: 142, slots: 2, b: { int: 4, matkPct: 5 }, c: '#60e0a0', art: 'seer_staff' },
    'คทาแก่นราก พลังของ Yggdrasil ไหลผ่านมาโดยตรง', "A rootheart scepter. Yggdrasil's power flows straight through it.");

  // ---------- MVP: Garmr (Gnawed Roots) ----------
  eq('garmr_fang', "Hellhound's Fang", 'dagger', 55, 'epic', { atk: 162, slots: 1, b: { agi: 3, crit: 8, critDmgPct: 10 }, c: '#e04040', art: 'loki_fang' },
    'เขี้ยวของการ์มร์ สุนัขเฝ้าประตูแห่งเฮล งับแล้วไม่เคยปล่อย', 'A fang of Garmr, the hound at the gate of Hel. It never lets go.');
  eq('garmr_mantle', 'Mantle of the Gatehound', 'garment', 55, 'epic', { def: 5, mdef: 5, slots: 1, b: { vit: 3, flee: 6, hpPct: 8 }, c: '#a02020', art: 'muffler' },
    'ผ้าคลุมขนสุนัขเฝ้าประตู เปื้อนเลือดผู้บุกรุกทุกคน', "The Gatehound's mantle, stained by every trespasser.");
  eq('gnipa_cleaver', 'Gnipahellir Cleaver', 'axe', 58, 'epic', { atk: 208, slots: 1, b: { str: 4, leech: 3 }, c: '#c01818', art: 'ulfr_axe' },
    'ขวานจากถ้ำนิปาเฮลลีร์ รังของการ์มร์', "A cleaver from Gnipahellir, Garmr's own cave.");
  eq('tyr_hand', 'Hand of Týr', 'sword', 60, 'legend', { atk: 232, slots: 1, b: { str: 4, dex: 3, hit: 15, atkPct: 8 }, c: '#ffd040', art: 'valhalla_blade' },
    'ดาบของเทพทีร์ ผู้ยอมสละมือให้เฟนรีร์เพื่อพันธนาการมันไว้', 'The sword of Týr, who gave his hand to bind Fenrir.');
  eq('mimir_well', "Mímir's Wellspring", 'rod', 60, 'legend', { atk: 85, matk: 172, slots: 1, b: { int: 5, matkPct: 8, castPct: 8 }, c: '#60d0ff', art: 'seer_staff' },
    'คทาจากบ่อปัญญาของมีเมียร์ รู้ทุกสิ่ง — ยกเว้นราคาที่เจ้าต้องจ่าย', "A staff drawn from Mímir's well. It knows everything — except the price you'll pay.");

  // ===================== ของดรอปขายได้ + แร่ตีบวก =====================
  const etc = (id, name, price, rarity, icon, th, en, extra) => {
    ITEMS[id] = Object.assign({ id, name, type: 'etc', price, rarity, icon, desc: L(th, en) }, extra || {}); LOOT.NEW.push(id);
  };
  etc('scrap_gear', 'Scrap Gear', 12, 'common', { s: 'ring', c: '#a8a8b0' }, 'เฟืองเศษเหล็ก ร้านรับซื้อเป็นกิโล', 'A scrap gear. Shops buy these by the kilo.');
  etc('frayed_cable', 'Frayed Cable', 30, 'common', { s: 'feather', c: '#d08a50' }, 'สายเคเบิลลุ่ย ทองแดงข้างในยังขายได้', 'A frayed cable. The copper inside still sells.');
  etc('cracked_lens', 'Cracked Visor Lens', 60, 'common', { s: 'gem', c: '#9ad8ff' }, 'เลนส์ไวเซอร์ร้าว แต่ยังสะท้อนแสงได้สวย', 'A cracked visor lens. Still catches the light beautifully.');
  etc('rune_shard', 'Rune Shard', 110, 'common', { s: 'gem', c: '#8a9ab0' }, 'เศษหินรูนที่พลังยังจางไม่หมด', 'A fragment of runestone, its power not quite faded.');
  etc('hel_ember', 'Helfire Ember', 200, 'common', { s: 'blob', c: '#60e0a0' }, 'ถ่านไฟสีเขียวจากเตาของเฮล จับแล้วกลับเย็น', "A green ember from Hel's hearth. Cold to the touch.");
  etc('data_crystal', 'Archive Data Crystal', 360, 'common', { s: 'gem', c: '#5ac8d0' }, 'ผลึกข้อมูลจากคลังประกาย ข้างในมีบันทึกที่ยังไม่มีใครอ่าน', 'A data crystal from the spark archive, full of records no one has read.');
  etc('yggdrasil_sap', 'Yggdrasil Sap', 520, 'common', { s: 'jar', c: '#f0c050' }, 'น้ำเลี้ยงสีทองของต้นไม้โลก หอมหวานและอุ่น', 'Golden sap of the World Tree — sweet, fragrant, and warm.');
  etc('einherjar_medal', 'Tarnished Einherjar Medal', 1400, 'uncommon', { s: 'ring', c: '#d0a050' }, 'เหรียญกล้าหาญของนักรบวัลฮัลลาที่หมองไปตามกาลเวลา', 'A Valhalla medal of valor, tarnished by the ages.');
  etc('valkyrie_plume', 'Valkyrie Plume Circuit', 6000, 'rare', { s: 'feather', c: '#fff0b0' }, 'วงจรขนนกของวาลคิรี นักสะสมยอมจ่ายแพงมาก', "A Valkyrie's plume circuit. Collectors pay handsomely for these.");
  etc('rune_alloy', 'Rune Alloy', 900, 'uncommon', { s: 'gem', c: '#7ad8ff' },
    'โลหะผสมจารึกรูน Brokk ต้องใช้ตีบวกอาวุธตั้งแต่ +5 ขึ้นไป (ครั้งละ 1 ชิ้น)', 'Rune-etched alloy. Brokk needs one per strike to refine weapons from +5 upward.', { keep: true });
  etc('volt_ore', 'Volt Ore', 700, 'uncommon', { s: 'gem', c: '#ffe060' },
    'แร่ที่มีกระแสไฟวิ่งอยู่ข้างใน Brokk ต้องใช้ตีบวกชุดเกราะตั้งแต่ +5 ขึ้นไป (ครั้งละ 1 ชิ้น)', 'Ore with a live current inside. Brokk needs one per strike to refine armor from +5 upward.', { keep: true });
  Object.assign(ART, {
    rune_alloy: { from: 'yggdrasil_shard', c: '#3aa8ff', hue: 170 }, volt_ore: { from: 'yggdrasil_shard', c: '#ffd030', hue: -90 },
    data_crystal: { from: 'yggdrasil_shard', c: '#5ac8d0', hue: 60 }, einherjar_medal: { from: 'clip', c: '#e0b050' },
    valkyrie_plume: { from: 'blink_feather', c: '#fff0b0', k: 0.35 }, yggdrasil_sap: { from: 'mead', c: '#f0c050', k: 0.3 },
    hel_ember: { from: 'hel_lantern', c: '#60e0a0', k: 0.3 },
    // ของเดิมที่ยังไม่มีภาพ: ย้อมจากภาพที่ใกล้เคียง
    cleaver: { from: 'hand_axe', c: '#c8b8a8' }, flail: { from: 'morning_star', c: '#b8b8c8', k: 0.2 }, arc_wand: { from: 'rod', c: '#70b0d8' },
    padded_plate: { from: 'cotton_shirt', c: '#c8c0a8', k: 0.25 }, thermal_cloak: { from: 'hood', c: '#5a7a9a' }, data_band: { from: 'clip', c: '#60c0e0' },
    root_cloak: { from: 'muffler', c: '#7a5a34' }, rootbark_plate: { from: 'leather_vest', c: '#8a6a44' },
    yggdrasil_branch: { from: 'seer_staff', c: '#60e0a0' }, garmr_collar: { from: 'rune_charm', c: '#d03030', k: 0.5 },
  });
  for (const id in ITEMS) ITEMS[id].id = id;

  // ===================== ความหายากของไอเทมเดิม =====================
  const setR = (r, ids) => ids.forEach(id => { if (ITEMS[id]) ITEMS[id].rarity = r; });
  setR('uncommon', ['stiletto', 'battle_axe', 'rune_staff', 'great_bow', 'flail', 'morning_star', 'chain_mail', 'iron_helm', 'round_shield', 'muffler', 'boots',
    'ring', 'earring', 'glove', 'rune_charm']);
  setR('rare', ['loki_fang', 'valhalla_blade', 'ulfr_axe', 'seer_staff', 'ullr_bow', 'plate_armor', 'rootbark_plate', 'root_cloak', 'yggdrasil_branch']);
  setR('epic', ['seraph_wings', 'emberfang', 'garmr_collar', 'yggdrasil_shard']);
  for (const id in ITEMS) {
    const it = ITEMS[id];
    if (it.type === 'card') it.rarity = /^\[MVP\]/.test(it.desc || '') || ['seraph_card', 'kitsura_card', 'garmr_card'].includes(id) ? 'epic' : 'rare';
    if (!it.rarity) it.rarity = 'common';
  }

  // ===================== ตารางดรอป =====================
  // [ไอเทม, โอกาส] — ของขาย 30–60% • ยา/วัตถุดิบ/แร่ 2–20% • อุปกรณ์ประจำตัว 0.5–2% • ของหายากมีช่อง 0.1–0.5%
  const DROPS = {
    // Meadow (Lv 1–6)
    pudding:       [['jelly_drop', 0.7], ['scrap_gear', 0.3], ['apple', 0.15], ['red_potion', 0.04], ['gel_shiv', 0.02], ['gel_vest', 0.015], ['knife', 0.01], ['gelheart_mail', 0.0015]],
    leafworm:      [['leaf_silk', 0.65], ['scrap_gear', 0.3], ['green_herb', 0.2], ['clover', 0.1], ['wire_saber', 0.02], ['crawler_treads', 0.015], ['sprout_staff', 0.002]],
    moonbun:       [['moon_fur', 0.6], ['carrot', 0.3], ['clover', 0.2], ['moon_hatchet', 0.02], ['bunny_visor', 0.015], ['scrap_buckler', 0.01], ['moon_kris', 0.002]],
    ember_pudding: [['ember_jelly', 0.5], ['scrap_gear', 0.3], ['red_herb', 0.2], ['orange_potion', 0.04], ['ember_wand', 0.02], ['ember_coil', 0.015], ['tinker_mallet', 0.01], ['hearth_coil', 0.002]],
    buzzfly:       [['buzz_wing', 0.55], ['jelly_drop', 0.3], ['blink_feather', 0.05], ['rotor_bow', 0.02], ['rotor_cape', 0.015], ['stiletto', 0.004], ['meadow_charm', 0.002]],
    // Mistlake (Lv 8–16)
    stumpling:     [['living_bark', 0.6], ['leaf_silk', 0.3], ['orange_potion', 0.06], ['sentry_saber', 0.02], ['sentry_plate', 0.012], ['bark_shield', 0.01], ['mist_mantle', 0.01], ['sentinel_core', 0.002]],
    fiddlehopper:  [['hopper_leg', 0.55], ['frayed_cable', 0.35], ['green_herb', 0.2], ['hopper_kris', 0.02], ['spring_greaves', 0.012], ['spring_band', 0.008], ['glove', 0.003], ['mistfang', 0.002]],
    capshroom:     [['cap_spore', 0.6], ['frayed_cable', 0.3], ['red_herb', 0.3], ['mine_breaker', 0.02], ['blastcap_helm', 0.012], ['mist_longbow', 0.01], ['battle_axe', 0.006], ['tidecaller_rod', 0.0025]],
    moss_pudding:  [['moss_gel', 0.5], ['green_herb', 0.3], ['grape', 0.06], ['moss_scepter', 0.02], ['mist_robe', 0.012], ['rune_mallet', 0.01], ['rune_staff', 0.006], ['verdant_circlet', 0.002]],
    // Wolfwood (Lv 18–30)
    ashtail:       [['ash_tail', 0.5], ['moon_fur', 0.3], ['volt_ore', 0.015], ['ashtail_wrap', 0.02], ['ash_hood', 0.012], ['muffler', 0.008], ['great_bow', 0.006], ['cinder_cloak', 0.002]],
    fenrir_pup:    [['fenrir_fang', 0.6], ['meat', 0.3], ['rune_alloy', 0.02], ['fenrir_claw', 0.02], ['wolfpelt_cloak', 0.012], ['wolfpath_boots', 0.01], ['ulfr_axe', 0.003], ['gleipnir_link', 0.002]],
    mossback:      [['moss_hide', 0.5], ['cracked_lens', 0.35], ['mead', 0.08], ['volt_ore', 0.02], ['ironhide_maul', 0.02], ['ironhide_plate', 0.012], ['chain_mail', 0.006], ['bearheart_band', 0.0025]],
    tuskboar:      [['iron_tusk', 0.6], ['meat', 0.3], ['rune_alloy', 0.02], ['tusk_axe', 0.02], ['tusk_helm', 0.012], ['huntsman_bow', 0.01], ['ring', 0.004], ['charger_greaves', 0.002]],
    // Hel's Hollow (Lv 17–45)
    draugr:        [['grave_dust', 0.6], ['moss_gel', 0.3], ['volt_ore', 0.015], ['barrow_axe', 0.02], ['grave_mail', 0.012], ['round_shield', 0.006], ['flail', 0.006], ['husk_signet', 0.0025]],
    bone_warden:   [['old_bone', 0.5], ['rune_shard', 0.35], ['yellow_potion', 0.05], ['rune_alloy', 0.02], ['warden_blade', 0.02], ['bonewall_shield', 0.012], ['morning_star', 0.008], ['barrowking_blade', 0.0015]],
    hel_maiden:    [['hel_lantern', 0.4], ['hel_ember', 0.35], ['blue_potion', 0.03], ['soulwick_staff', 0.02], ['lantern_veil', 0.012], ['seer_staff', 0.006], ['earring', 0.004], ['helwick_robe', 0.002]],
    hel_guard:     [['cursed_seal', 0.4], ['rune_shard', 0.3], ['volt_ore', 0.025], ['hel_axe', 0.02], ['helgate_plate', 0.012], ['iron_helm', 0.01], ['loki_fang', 0.004], ['hel_aegis', 0.002]],
    // Archive Depths (Lv 33–45)
    rust_sap:      [['rusty_sap', 0.55], ['jelly_drop', 0.3], ['yellow_potion', 0.05], ['volt_ore', 0.03], ['sap_dirk', 0.02], ['rustbloom_staff', 0.012], ['boots', 0.006], ['rustbloom_talisman', 0.0025]],
    archive_warden:[['archive_seal', 0.5], ['data_crystal', 0.3], ['einherjar_medal', 0.03], ['rune_alloy', 0.03], ['archive_greatsword', 0.02], ['warden_helm', 0.012], ['plate_armor', 0.004], ['ullr_bow', 0.004]],
    rust_mine:     [['rust_fuse', 0.5], ['cap_spore', 0.3], ['white_potion', 0.03], ['volt_ore', 0.03], ['fuse_mace', 0.02], ['blast_greaves', 0.012], ['vault_cloak', 0.01], ['detonator_bow', 0.0025]],
    archive_maiden:[['rusted_spark', 0.5], ['data_crystal', 0.3], ['blue_potion', 0.03], ['rune_alloy', 0.03], ['spark_staff', 0.02], ['maiden_shroud', 0.012], ['rune_charm', 0.004], ['yggdrasil_branch', 0.0025]],
    rust_draugr:   [['corroded_core', 0.45], ['grave_dust', 0.3], ['einherjar_medal', 0.04], ['volt_ore', 0.035], ['husk_greatsword', 0.02], ['husk_plate', 0.012], ['valhalla_blade', 0.003], ['rustking_crown', 0.0025]],
    // Gnawed Roots (Lv 45–60)
    root_crawler:  [['root_fiber', 0.5], ['leaf_silk', 0.3], ['white_potion', 0.04], ['rune_alloy', 0.035], ['crawler_fang', 0.02], ['root_bow', 0.012], ['rootguard_shield', 0.008], ['rootrunner_boots', 0.0025]],
    gnawed_stump:  [['gnawed_bark', 0.45], ['yggdrasil_sap', 0.25], ['volt_ore', 0.04], ['sentinel_maul', 0.02], ['stump_buckler', 0.012], ['heartwood_cleaver', 0.01], ['yggdrasil_branch', 0.004], ['yggdrasil_sigil', 0.002]],
    gnawed_brute:  [['rust_plate', 0.45], ['yggdrasil_sap', 0.3], ['volt_ore', 0.045], ['brute_greataxe', 0.02], ['brute_plate', 0.012], ['gnawhide_boots', 0.01], ['rootbark_plate', 0.008], ['jotun_knuckle', 0.002]],
    root_gnawer:   [['gnawer_tusk', 0.45], ['iron_tusk', 0.3], ['rune_alloy', 0.045], ['gnawer_saber', 0.02], ['gnawer_hood', 0.012], ['gnawroot_bow', 0.01], ['root_cloak', 0.008], ['rootheart_rod', 0.002]],
    // MVP (ตำนาน 0.05% — บอสโลกได้มากกว่ามาก ดู patchWorldBoss)
    seraph_pudding:[['seraph_wings', 0.2], ['seraph_mantle', 0.1], ['seraph_edge', 0.08], ['seraph_staff', 0.08], ['aureole', 0.0005], ['valkyrie_plume', 0.5], ['rune_alloy', 0.5], ['yggdrasil_shard', 0.1]],
    kitsura:       [['emberfang', 0.2], ['kitsune_tail', 0.08], ['foxfire_bow', 0.08], ['kitsura_visor', 0.08], ['ragnarok_ember', 0.0005], ['valkyrie_plume', 0.6], ['volt_ore', 0.6], ['yggdrasil_shard', 0.15]],
    garmr:         [['garmr_collar', 0.15], ['garmr_fang', 0.08], ['garmr_mantle', 0.08], ['gnipa_cleaver', 0.08], ['tyr_hand', 0.0005], ['mimir_well', 0.0005], ['rune_alloy', 0.7], ['yggdrasil_shard', 0.2]],
  };
  for (const id in DROPS) if (MOBS[id]) MOBS[id].drops = DROPS[id];
  LOOT.WB_EXTRA = { seraph_pudding: ['aureole'], kitsura: ['ragnarok_ember'], garmr: ['tyr_hand', 'mimir_well'] };

  // ===================== ร้านค้า: เหลือแค่ของพื้นฐาน =====================
  // ของดี ๆ ต้องล่าเอง • อาวุธเริ่มต้นของทุกอาชีพ (JOB_STARTER) ยังซื้อได้เสมอ
  const BASIC_WEAPON = ['knife', 'cutter', 'main_gauche', 'sword', 'falchion', 'broadsword', 'hand_axe', 'cleaver', 'rod', 'arc_wand', 'bow', 'composite_bow', 'club', 'mace'];
  const BASIC_ARMOR = ['cotton_shirt', 'padded_plate', 'leather_vest', 'silk_robe', 'hat', 'ribbon', 'guard', 'hood', 'thermal_cloak', 'sandals', 'shoes', 'data_band', 'clip'];
  for (const id of Object.values(JOB_STARTER)) if (!BASIC_WEAPON.includes(id)) BASIC_WEAPON.push(id);
  const keepOrder = (list, ids) => ids.filter(id => ITEMS[id]).sort((a, b) => WTYPES.indexOf(ITEMS[a].wtype) - WTYPES.indexOf(ITEMS[b].wtype) || ITEMS[a].price - ITEMS[b].price);
  SHOPS.weapon.splice(0, SHOPS.weapon.length, ...keepOrder(SHOPS.weapon, BASIC_WEAPON));
  SHOPS.armor.splice(0, SHOPS.armor.length, ...BASIC_ARMOR.filter(id => ITEMS[id]));
  LOOT.SHOP_BASIC = new Set([...BASIC_WEAPON, ...BASIC_ARMOR]);

  // ===================== ชุดเซ็ต =====================
  // สวมครบ n ชิ้นได้โบนัสของขั้นนั้น (ซ้อนกับขั้นที่ต่ำกว่า)
  LOOT.SETS = {
    meadow_scout:   { name: 'Meadow Scout', items: ['gel_vest', 'bunny_visor', 'crawler_treads'], bonus: { 2: { luk: 2, hp: 40 }, 3: { flee: 5, speedPct: 5 } } },
    mistlake_mystic:{ name: 'Mistlake Mystic', items: ['mist_robe', 'verdant_circlet', 'mist_mantle'], bonus: { 2: { int: 2, sp: 40 }, 3: { castPct: 8, healPct: 8 } } },
    wolfwood_hunter:{ name: 'Wolfwood Hunter', items: ['huntsman_bow', 'wolfpelt_cloak', 'wolfpath_boots'], bonus: { 2: { agi: 2, flee: 5 }, 3: { crit: 5, aspdPct: 5 } } },
    hel_warden:     { name: "Hel's Warden", items: ['warden_blade', 'bonewall_shield', 'helgate_plate'], bonus: { 2: { vit: 2, def: 2 }, 3: { hpPct: 8, stunRes: 15 } } },
    rust_king:      { name: 'Regalia of the Rust King', items: ['husk_greatsword', 'rustking_crown', 'husk_plate'], bonus: { 2: { str: 2, atk: 10 }, 3: { atkPct: 6, leech: 2 } } },
    gatehound:      { name: 'Gatehound', items: ['garmr_fang', 'garmr_mantle', 'garmr_collar'], bonus: { 2: { agi: 3, crit: 5 }, 3: { critDmgPct: 15, aspdPct: 6 } } },
  };
  for (const k in LOOT.SETS) LOOT.SETS[k].id = k;

  // ===================== ภาพไอคอนย้อมสี =====================
  // ใช้ระบบภาพย้อมสีของ Art (alias) — ถ้าภาพต้นแบบยังโหลดไม่เสร็จ ใช้ไอคอนวาดด้วยโค้ดไปก่อน
  if (typeof Art !== 'undefined') {
    for (const id in ART) {
      const a = ART[id];
      Art.alias('item_' + id, 'item_' + a.from, { hue: a.hue || 0, sat: 1.1, tint: [a.c, a.k != null ? a.k : 0.42] });
    }
    const key0 = Art.itemKey.bind(Art);
    Art.itemKey = id => key0(id) || (Art.aliases['item_' + id] && Art.get('item_' + id) ? 'item_' + id : null);
  }
})();

// ============================================================
//  เกี่ยวเข้ากับระบบหลัก (ไม่แก้ game.js)
// ============================================================
// ---------- โบนัสชุดเซ็ต ----------
LOOT.setCount = (p, set) => set.items.filter(id => EQUIP_SLOTS.some(s => p.equip[s] && p.equip[s].id === id)).length;
LOOT.setBonus = p => {
  let out = null;
  for (const k in LOOT.SETS) {
    const set = LOOT.SETS[k], n = LOOT.setCount(p, set);
    for (const tier in set.bonus) if (n >= +tier) { out = out || {}; for (const s in set.bonus[tier]) out[s] = (out[s] || 0) + set.bonus[tier][s]; }
  }
  return out;
};
{
  // recalc() บวกโบนัสต้นไม้พาสซีฟจาก Passive.bonus(p) — ระหว่าง recalc เท่านั้น ให้มันคืนโบนัสชุดเซ็ตรวมไปด้วย
  const recalc0 = recalc;
  recalc = function () {
    const p = G.player, sb = p && p.equip ? LOOT.setBonus(p) : null;
    if (!sb || typeof Passive === 'undefined') return recalc0.apply(this, arguments);
    const pb = Passive.bonus;
    Passive.bonus = q => { const o = Object.assign({}, pb.call(Passive, q)); for (const k in sb) o[k] = (o[k] || 0) + sb[k]; return o; };
    try { return recalc0.apply(this, arguments); } finally { Passive.bonus = pb; }
  };
}

// ---------- ของดรอป: ลำแสง / เสียง / ประกาศ ----------
LOOT.lastShout = 0;
LOOT.announce = id => {
  const p = G.player, it = ITEMS[id];
  UI.announce(L(`★ ${p.name} ได้รับ ${it.name}! ★`, `★ ${p.name} obtained ${it.name}! ★`));
  UI.msg(L(`★ ${p.name} ได้รับ ${it.name}! (${LOOT.label(id)})`, `★ ${p.name} obtained ${it.name}! (${LOOT.label(id)})`), 'mvp');
  // ออนไลน์: บอกคนอื่นในแผนที่ด้วย (ไม่เกิน 1 ครั้งต่อ 30 วินาที)
  if (typeof Online !== 'undefined' && Online.online && typeof Online.sendChat === 'function' && performance.now() - LOOT.lastShout > 30000) {
    LOOT.lastShout = performance.now();
    try { Online.sendChat(L(`★ ได้รับ ${it.name}! (${LOOT.label(id)})`, `★ Obtained ${it.name}! (${LOOT.label(id)})`)); } catch (e) { /* ไม่เป็นไร */ }
  }
};
{
  const drop0 = dropItemOnGround, pick0 = pickUp;
  dropItemOnGround = function (id, x, y, qty = 1) {
    const it = ITEMS[id], r = it && it.type !== 'card' ? LOOT.rank(id) : 0;
    const n0 = G.drops.length;
    drop0(id, x, y, qty);
    if (r < 2) return;
    const looted = G.drops.length === n0; // Auto Loot เก็บเข้ากระเป๋าทันที
    if (looted) addFx({ type: 'beam', x, y, dur: 2.2 });
    Sound.play(r >= 3 ? 'mvp' : 'refine_ok');
    if (r >= 3) { if (looted) LOOT.announce(id); else UI.msg(L(`✦ ${it.name} (${LOOT.label(id)}) ดรอปลงพื้น!`, `✦ ${it.name} (${LOOT.label(id)}) dropped!`), 'mvp'); }
    else UI.msg(L(`✦ ของหายากดรอป: ${it.name}`, `✦ Rare drop: ${it.name}`), 'lvl');
  };
  pickUp = function (drop) {
    const had = G.drops.includes(drop);
    pick0(drop);
    if (had && !G.drops.includes(drop) && ITEMS[drop.id] && ITEMS[drop.id].type !== 'card' && LOOT.rank(drop.id) >= 3) LOOT.announce(drop.id);
  };
}
// ลำแสงตั้งตรงบนพื้นใต้ของ rare ขึ้นไป (เรียกจาก render.js ในพิกัดโลก ก่อนวาดไอคอน)
LOOT.drawDrop = (g, d, x, y, t) => {
  const r = LOOT.rank(d.id);
  if (r < 2 || (ITEMS[d.id] && ITEMS[d.id].type === 'card')) return;
  const col = LOOT.color(d.id), n = parseInt(col.slice(1), 16), rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  const age = G.time - d.born, grow = Math.min(1, age / 0.5), pulse = 0.75 + Math.sin(t * 4 + d.uid) * 0.25;
  const H = (r >= 4 ? 240 : r >= 3 ? 200 : 160) * grow, w = (r >= 4 ? 22 : r >= 3 ? 18 : 14) + Math.sin(t * 7 + d.uid) * 1.5;
  g.save();
  // แกนลำแสง: ผสมแบบปกติก่อน (ให้เห็นสีบนพื้นสว่าง) แล้วเติมแสงแบบ lighter
  const body = g.createLinearGradient(x, y - H, x, y);
  body.addColorStop(0, `rgba(${rgb},0)`); body.addColorStop(0.55, `rgba(${rgb},${0.3 * pulse})`); body.addColorStop(1, `rgba(${rgb},${0.7 * pulse})`);
  g.fillStyle = body; g.fillRect(x - w / 2, y - H, w, H);
  g.globalCompositeOperation = 'lighter';
  const core = g.createLinearGradient(x, y - H, x, y);
  core.addColorStop(0, `rgba(${rgb},0)`); core.addColorStop(0.5, `rgba(${rgb},${0.25 * pulse})`); core.addColorStop(1, `rgba(${rgb},${0.6 * pulse})`);
  g.fillStyle = core; g.fillRect(x - w / 4, y - H, w / 2, H);
  g.fillStyle = `rgba(255,255,255,${0.3 * pulse})`; g.fillRect(x - 1.2, y - H * 0.8, 2.4, H * 0.8);
  const rg = g.createRadialGradient(x, y + 4, 2, x, y + 4, 32);
  rg.addColorStop(0, `rgba(${rgb},${0.8 * pulse})`); rg.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = rg; g.beginPath(); g.ellipse(x, y + 4, 32, 11, 0, 0, 7); g.fill();
  for (let i = 0; i < (r >= 3 ? 8 : 4); i++) { const k = (t * 0.6 + i / 8) % 1; g.fillStyle = `rgba(${rgb},${(1 - k)})`; g.fillRect(x + Math.sin(i * 2.3 + t) * w * 0.6, y - k * H * 0.9, 2.6, 2.6); }
  g.restore();
};

// ---------- บอสโลก: ของระดับตำนานดรอปง่ายขึ้นมาก (บอสโลกถูกสร้างใน worldboss.js หลังไฟล์นี้) ----------
LOOT.patchWorldBoss = () => {
  for (const base in LOOT.WB_EXTRA) {
    const wb = MOBS['wb_' + base]; if (!wb || wb.lootPatched) continue;
    wb.lootPatched = true;
    for (const id of LOOT.WB_EXTRA[base]) { const e = wb.drops.find(d => d[0] === id); if (e) e[1] = 0.03; else wb.drops.push([id, 0.03]); }
    wb.drops.push([LOOT.ORE.weapon, 1], [LOOT.ORE.armor, 1]);
  }
};
document.addEventListener('DOMContentLoaded', () => LOOT.patchWorldBoss());

// ---------- การ์ดไอเทม: ข้อมูลชุดเซ็ต ----------
LOOT.setTip = id => {
  const set = LOOT.setOf(id);
  if (!set || typeof h !== 'function') return null;
  const p = G.player, n = p ? LOOT.setCount(p, set) : 0;
  const worn = sid => p && EQUIP_SLOTS.some(s => p.equip[s] && p.equip[s].id === sid);
  return h('div', { class: 'tip-set' },
    h('b', {}, L(`ชุด ${set.name} (${n}/${set.items.length})`, `${set.name} Set (${n}/${set.items.length})`)),
    h('div', { class: 'ts-items' }, ...set.items.map(sid => h('span', { class: (worn(sid) ? 'on ' : '') + LOOT.cls(sid) }, ITEMS[sid].name))),
    ...Object.entries(set.bonus).map(([tier, b]) => h('div', { class: 'ts-tier' + (n >= +tier ? ' on' : '') },
      L(`${tier} ชิ้น: `, `${tier} pcs: `), Object.entries(b).map(([k, v]) => PSTAT_FMT(k, v)).join(' · '))));
};

// ---------- สีตามความหายาก ----------
(() => {
  // common ใช้สีเดิมของแต่ละหน้าต่าง — ใส่สีเฉพาะ uncommon ขึ้นไป
  const css = Object.entries(RARITY).filter(([, r]) => r.rank).map(([k, r]) => `.rar-${k}{color:${r.color}!important}` +
    `.inv-cell.rarc-${k}{box-shadow:inset 0 0 0 1px ${r.color}88,inset 0 -10px 14px -8px ${r.color}66}`).join('\n') + `
#item-tip .tip-head small .rar-tag{font-weight:700}
.tip-set{margin-top:7px;padding-top:6px;border-top:1px solid rgba(255,255,255,.08);display:grid;gap:2px}
.tip-set>b{font-size:11px;color:#9ff0c0;letter-spacing:.04em}
.tip-set .ts-items{display:flex;flex-wrap:wrap;gap:2px 8px;font-size:11.5px}
.tip-set .ts-items span{opacity:.5}
.tip-set .ts-items span.on{opacity:1}
.tip-set .ts-tier{color:#7d8a9c;font-size:11.5px}
.tip-set .ts-tier.on{color:#b8ffd0}
.inv-detail .tip-src{margin-top:6px;padding-top:5px;border-top:1px solid rgba(255,255,255,.08);display:grid;gap:1px;font-size:12px}
.inv-detail .tip-src b{font-size:11px;color:#ffd98a;letter-spacing:.04em}
.inv-detail .tip-src small{color:#9fb0c4}`;
  const el = document.createElement('style'); el.id = 'loot-css'; el.textContent = css;
  (document.head || document.documentElement).append(el);
})();
