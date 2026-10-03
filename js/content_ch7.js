'use strict';
// ============================================================
//  บทที่ 7 — ผู้แทะราก (Lv 55–70) • บทสุดท้ายของภาคที่ 1 (docs/STORY.md §3)
//  สนิมมีชื่อ — Nidhogg มังกรไร้หัวที่แทะรากใต้คลังของ Hel (Fenrir กลืนไปแค่หัว)
//  แผนที่ใหม่: Nidhogg's Hollow (Lv 58–70, MVP Nidhogg) — ทางลงคือ "ประตูราก" ที่ Garmr เฝ้าใน Gnawed Roots
//    (ประตูด้านใน def.portalAt — ไม่เจาะผังของ Gnawed Roots → ภาพอบ 3D ของแมพนั้นยังใช้ได้ครบ)
//  ไฟล์นี้เพิ่มทุกอย่างของบท: มอน 5 ชนิด + MVP (ชุดท่าบอสใน BossKit + Ancient ใน worldboss.js) ไอเทม/อุปกรณ์ Lv 58–70 ชิป เควสต์ 8 อัน
//  NPC ใหม่ Loki (หน้ากาก Lopt ที่ถอดแล้ว) และฉากจบภาค 1 — บทพูดแยกตามทางเลือก Core ของบทที่ 5 (Story.st().core = 'gave' | 'kept' | ไม่เคยเลือก)
//
//  ลำดับโหลด: หลัง js/loot.js (ใช้ LOOT.SETS / WB_EXTRA) และก่อน js/balance.js (มอนใหม่ได้ HP +30% / ตัวคูณดรอปอุปกรณ์แบบเดียวกับมอนเดิม)
//  และก่อน js/worldboss.js (Ancient Nidhogg ถูกสร้างจาก MOBS.nidhogg ใน WB.init) • ชุดท่าบอสลงทะเบียนผ่าน window.BOSSKIT_EXTRA (js/bosskit.js)
//  ห้ามเปลี่ยน id ในไฟล์นี้หลังปล่อยแล้ว (เซฟอ้างอิง: เควสต์ ch7_* / ไอเทม / มอน / flag c7* ใน p.story)
// ============================================================
(() => {
  // ---------- ตัวช่วย: มอนสีต่าง (สูตรเดียวกับ js/content_ch6.js) ----------
  const VISUAL = ['sprite', 'look', 'variant', 'color', 'color2', 'size', 'scale', 'wings', 'tusk', 'glow', 'skin', 'face', 'outfit', 'hair',
    'viking', 'joint', 'bones', 'weapon', 'hood', 'halfskull', 'fox', 'jiangshi'];
  const variant = (base, def) => {
    const b = MOBS[base], v = { base }, spec = { hue: def.hue, sat: def.sat, bri: def.bri, tint: def.tint };
    for (const k of VISUAL) if (b[k] !== undefined) v[k] = b[k];
    const dye = c => Art.tintHex(c, spec);
    for (const k of ['color', 'color2', 'glow', 'skin', 'face', 'outfit', 'hair', 'joint', 'hood']) if (typeof v[k] === 'string') v[k] = dye(v[k]);
    if (v.look) { v.look = Object.assign({}, v.look); for (const k in v.look) v.look[k] = dye(v.look[k]); }
    return Object.assign(v, def);
  };

  // ---------- ตัวช่วย: อุปกรณ์ (สูตรเดียวกับ eq() ใน js/loot.js — ราคาตามความหายาก, คำอธิบาย + ค่าพลังเป็นอังกฤษเสมอผ่าน EN()) ----------
  const ICON_OF = { armor: 'armor', head: 'hat', shield: 'shield', garment: 'cloth', shoes: 'shoes', acc: 'ring' };
  const WTYPES = ['dagger', 'sword', 'axe', 'rod', 'bow', 'mace'];
  const PRICE = { uncommon: lv => 150 + lv * 100, rare: lv => 1000 + lv * 400, epic: lv => 8000 + lv * 1200, legend: () => 150000 };
  const statText = b => b ? Object.entries(b).filter(([k]) => PSTAT[k]).map(([k, v]) => PSTAT_FMT(k, v)).join(' ') : '';
  const statTextEn = b => b ? Object.entries(b).filter(([k]) => PSTAT[k]).map(([k, v]) => {
    const pct = /Pct$|^leech$|^stunRes$|^rage$|^venom$/.test(k), sg = v > 0 ? '+' : '', n = EN(PSTAT[k]); return pct ? `${sg}${v}${n}` : `${n} ${sg}${v}`; }).join(' ') : '';
  const eq = (id, name, kind, lv, rarity, s, th, en) => {
    const weapon = WTYPES.includes(kind), b = s.b || null;
    const it = { id, name, type: weapon ? 'weapon' : 'armor', slot: weapon ? 'weapon' : kind, rarity, lv, price: s.price || PRICE[rarity](lv), slots: s.slots || 0,
      jobs: s.jobs || (weapon ? J[kind] : 'all'), icon: { s: weapon ? kind : ICON_OF[kind], c: s.c } };
    if (weapon) { it.wtype = kind; it.atk = s.atk || 0; if (s.matk) it.matk = s.matk; }
    else { if (s.def) it.def = s.def; if (s.mdef) it.mdef = s.mdef; }
    if (b) it.b = b;
    const st = statText(b);
    it.desc = L(th, en) + (st ? ' ' + st : '');
    if (st && LANG !== 'en') L_EN.set(it.desc, en + ' ' + statTextEn(b));
    if (s.quest) it.quest = true;
    ITEMS[id] = it;
    if (s.art) Art.alias('item_' + id, 'item_' + s.art, { hue: s.hue || 0, sat: 1.1, tint: [s.c, s.tk != null ? s.tk : 0.42] });
  };
  const etc = (id, name, price, icon, art, th, en) => {
    ITEMS[id] = { id, name, type: 'etc', price, rarity: 'common', icon, desc: L(th, en) };
    if (art) Art.alias('item_' + id, 'item_' + art[0], { hue: art[1] || 0, sat: 1.1, tint: [icon.c, art[2] != null ? art[2] : 0.4] });
  };

  // ===================== ไอเทม =====================
  // ของดรอปขายได้ (ราคาไล่ต่อจาก Gnawer Tusk 500) • 2026-10-03 ขึ้น ~25% (Claude ตัดสินแทนเจ้าของ): เข้า Nidhogg's Hollow แล้วรายได้/ชม. ไม่ตกจาก Gnawed Roots
  //   (ฆ่าได้น้อยลง ~40% ต่อชม. — วัดด้วย CURVE=1 tests/balance_sim.js) • ของ Lv 25–57 ไม่ต้องขึ้น: รายได้ขึ้นตามเลเวลอยู่แล้ว
  etc('rust_petal', 'Rust Petal', 680, { s: 'feather', c: '#c8642a' }, ['moss_gel', -70], 'กลีบสนิมที่งอกเป็นดอก ไม่มีเมล็ด ไม่มีราก — มันแค่โต', 'A petal of rust grown into a flower. No seed, no root — it simply grows.');
  etc('sparkless_core', 'Sparkless Core', 750, { s: 'gem', c: '#8a8698' }, ['yggdrasil_shard', 0, 0.7], 'แกนร่างที่ว่างเปล่า ไม่ไหม้ ไม่ผุ — ประกายข้างในถูก "กิน" ออกไป', 'An empty frame core. Not burned, not corroded — the spark inside was simply eaten.');
  etc('wyrm_scale', 'Wyrm Scale', 830, { s: 'shell', c: '#5aa83a' }, ['fenrir_fang', 90, 0.5], 'เกล็ดสีเขียวสนิมที่หลุดจากตัว Nidhogg ยังอุ่นและยังขยับได้นิด ๆ', "A rust-green scale shed from Nidhogg's body. Still warm — and still twitching.");
  etc('binding_root', 'Binding Root', 900, { s: 'feather', c: '#5a7a30' }, ['living_bark', 30], 'รากที่พันร่างยามของ Hel ไว้สามสิบปี เหนียวกว่าเหล็ก', "A root that bound one of Hel's guards for thirty years. Tougher than steel.");
  etc('rot_plate', 'Rot-Crusted Plate', 980, { s: 'cloth', c: '#6a5a2a' }, ['plate_armor', 40, 0.5], 'แผ่นเกราะที่สนิมพอกหนาจนหนักกว่าตัวเกราะเอง', 'An armor plate so crusted with rust it outweighs the armor itself.');

  // ---------- อุปกรณ์ Lv 58–70 (ได้จากมอนเท่านั้น — ต่อขั้นจาก Gnawed Roots Lv 53–60 ใน js/loot.js) ----------
  // uncommon ≈ +2 ATK ต่อเลเวลจากขั้นก่อน • rare/epic ต่ำกว่าของตำนาน Lv 60 (Hand of Týr ATK 232 / Mímir's Wellspring MATK 172)
  eq('rotbloom_rod', 'Rotbloom Scepter', 'rod', 59, 'uncommon', { atk: 70, matk: 130, slots: 1, b: { int: 3 }, c: '#c8642a', art: 'rune_staff' },
    'คทาที่ดอกสนิมงอกพันปลาย พลังเวทไหลแรงกว่าที่ควร', 'A scepter with rust-blooms twined round its head. Magic flows through it harder than it should.');
  eq('bloomheart_charm', 'Bloomheart Charm', 'acc', 58, 'rare', { slots: 1, b: { vit: 2, int: 2, hp: 150, sp: 40 }, c: '#e08040', art: 'rune_charm' },
    'เครื่องรางที่ห่อแกนดอกสนิมไว้ในแก้ว ดอกข้างในยังโตช้า ๆ', 'A charm sealing a rust-bloom heart in glass. The flower inside is still slowly growing.');
  eq('shell_greatsword', 'Hollowshell Greatsword', 'sword', 61, 'uncommon', { atk: 192, slots: 1, b: { str: 3, dex: 1 }, c: '#9a90b0', art: 'broadsword' },
    'ดาบใหญ่ของโครงร่างกลวง ใบดาบเบาผิดตา เพราะข้างในว่างเปล่า', 'The greatsword of a hollow shell. Strangely light — there is nothing inside.');
  eq('shell_helm', 'Hollowshell Helm', 'head', 61, 'uncommon', { def: 8, slots: 1, b: { vit: 2, mdef: 2 }, c: '#8a8698', art: 'iron_helm' },
    'หมวกของโครงร่างที่ไม่มีใครอยู่ข้างใน ใส่แล้วได้ยินเสียงสะท้อนของตัวเอง', 'The helm of a frame with no one inside. Wear it and you hear your own echo.');
  eq('wyrmfang_kris', 'Wyrmfang Kris', 'dagger', 63, 'uncommon', { atk: 170, slots: 1, b: { agi: 3, crit: 4 }, c: '#5aa83a', art: 'stiletto' },
    'กริชเขี้ยวลูกมังกร แทงแล้วแผลไม่ยอมปิด', 'A kris made from a wyrmling fang. The wounds it opens refuse to close.');
  eq('wyrmhide_boots', 'Wyrmhide Boots', 'shoes', 63, 'uncommon', { def: 6, slots: 1, b: { agi: 2, vit: 1, hp: 150 }, c: '#4a8a2a', art: 'boots' },
    'รองเท้าหนังเกล็ดลูกมังกร เดินบนรากเปียกก็ไม่ลื่น', 'Boots of wyrmling scale. They never slip, even on wet roots.');
  eq('venomcoil_band', 'Venomcoil Band', 'acc', 63, 'rare', { slots: 1, b: { str: 2, dex: 2, crit: 3 }, c: '#7ad040', art: 'ring' },
    'กำไลขดเป็นงูพิษ รัดแน่นขึ้นทุกครั้งที่เจ้าโจมตี', 'A band coiled like a venomous serpent. It tightens every time you strike.');
  eq('abyssal_robe', 'Abyssal Robe', 'armor', 64, 'rare', { def: 5, mdef: 15, slots: 1, b: { int: 3, sp: 80 }, c: '#3a5a2a', art: 'silk_robe' },
    'เสื้อคลุมทอจากความมืดใต้ราก ดูดเสียงรอบตัวจนเงียบ', 'A robe woven from the dark beneath the roots. It drinks every sound around it.');
  eq('rootbound_axe', 'Rootbound Axe', 'axe', 66, 'uncommon', { atk: 206, slots: 1, b: { str: 3, vit: 1 }, c: '#6a8a30', art: 'battle_axe' },
    'ขวานของยามที่ถูกรากพัน รากยังเกาะด้ามอยู่ — และยังไม่ยอมปล่อย', "A bound guard's axe. The roots still cling to its haft — and will not let go.");
  eq('rootbound_shield', 'Rootbound Shield', 'shield', 66, 'uncommon', { def: 10, mdef: 3, slots: 1, b: { vit: 2, hp: 250 }, jobs: J.heavy, c: '#5a7a30', art: 'round_shield' },
    'โล่ที่รากพันจนกลายเป็นเกราะไม้มีชีวิต', 'A shield so overgrown with roots it has become living wood.');
  eq('rotroot_bow', 'Rotroot Longbow', 'bow', 66, 'uncommon', { atk: 196, slots: 1, b: { dex: 3, agi: 1 }, c: '#7a6a30', art: 'great_bow' },
    'ธนูยาวจากรากที่สนิมกิน สายธนูขึงด้วยเส้นใยราก', 'A longbow of rust-eaten root, strung with root fiber.');
  eq('colossus_maul', 'Colossus Maul', 'mace', 69, 'uncommon', { atk: 196, slots: 1, b: { str: 3, vit: 2 }, c: '#8a7a3a', art: 'morning_star' },
    'ค้อนที่หมีเหล็กใช้ทุบรากหักให้เข้าที่ หนักจนพื้นยุบ', 'The maul an iron colossus used to beat broken roots back into place. The floor sinks under it.');
  eq('colossus_plate', 'Colossus Plating', 'armor', 69, 'uncommon', { def: 15, slots: 1, b: { vit: 3, hp: 320 }, jobs: J.heavy, c: '#6a5a2a', art: 'plate_armor' },
    'เกราะหมีเหล็กที่สนิมพอกชั้นแล้วชั้นเล่า ยิ่งหนักยิ่งแข็ง', "An iron colossus's plating, crusted layer on layer. The heavier, the harder.");
  // MVP: Nidhogg
  eq('nid_fang', 'Fang of Nidhogg', 'sword', 68, 'epic', { atk: 226, slots: 1, b: { str: 4, agi: 2, atkPct: 5 }, c: '#7ad040', art: 'valhalla_blade' },
    'เขี้ยวที่แทะรากของต้นไม้โลกมาสามสิบปี คมขึ้นทุกครั้งที่ฟัน', 'A fang that gnawed the roots of the World Tree for thirty years. It grows sharper with every cut.');
  eq('nid_wings', 'Wings of Nidhogg', 'garment', 66, 'epic', { def: 6, mdef: 6, slots: 1, b: { agi: 3, flee: 8, hpPct: 6 }, c: '#3a6a20', art: 'muffler' },
    'ปีกที่ไม่เคยได้บินของมังกรใต้ราก กางออกแล้วหลบอะไรก็ได้', 'The never-flown wings of the dragon beneath the roots. Spread them and nothing can touch you.');
  eq('nid_scale', 'Scale of Nidhogg', 'shield', 68, 'epic', { def: 12, mdef: 6, slots: 1, b: { vit: 3, hpPct: 8 }, jobs: J.heavy, c: '#4a8a2a', art: 'guard' },
    'เกล็ดชิ้นใหญ่ที่สุดจากหลังของ Nidhogg ไฟของ Kitsura ยังเผาไม่ทะลุ', "The largest scale from Nidhogg's back. Even Kitsura's fire could not burn through it.");
  eq('nid_rotstaff', 'Rotroot of Nidhogg', 'rod', 68, 'epic', { atk: 84, matk: 160, slots: 1, b: { int: 5, matkPct: 6 }, c: '#5ac04a', art: 'seer_staff' },
    'รากที่ Nidhogg แทะจนเหลือแต่แกน น้ำเลี้ยงสีเขียวยังไหลอยู่ข้างใน', 'A root Nidhogg gnawed down to its core. Green sap still runs inside.');
  eq('nid_heart', 'Heart of the Gnawer', 'acc', 70, 'legend', { slots: 1, b: { str: 3, agi: 3, vit: 3, int: 3, dex: 3, luk: 3, hpPct: 5, spPct: 5 }, c: '#9aff5a', art: 'earring' },
    'หัวใจของมังกรไร้หัว ยังเต้นอยู่ — และยังหิว', 'The heart of the headless dragon. It still beats — and it is still hungry.');
  // รางวัลเรื่องราว (จบภาค 1) — ไม่ดรอปจากมอน (quest: true)
  eq('first_leaf', 'Badge of the First Leaf', 'acc', 1, 'rare', { price: 2, quest: true, b: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1, hp: 100 }, c: '#9aff9a', art: 'clip', tk: 0.55 },
    'ใบไม้เรืองแสงที่ Mimir บันทึกชื่อเจ้าไว้ — หลักฐานว่าต้นไม้ยังงอกได้', 'A glowing leaf on which Mimir recorded your name — proof that the Tree can still grow.');

  // ---------- ชิป (ดรอปสุ่ม % — CHIP_DROP / MVP CHIP_DROP_BOSS) ----------
  const chip = (id, name, slot, b, c, th, en, mvp) => {
    ITEMS[id] = { id, name, type: 'card', slot, price: 20, b, rarity: mvp ? 'epic' : 'rare', icon: { s: 'card', c }, desc: L(th, en) };
  };
  chip('rustbloom_card', 'Rust Bloom Chip', 'garment', { vit: 2, mdef: 4 }, '#c8642a', 'ชิปเสริม — ใส่ผ้าคลุม: VIT +2, MDEF +4', 'Augment chip — Garment slot: VIT +2, MDEF +4');
  chip('hshell_card', 'Hollow Shell Chip', 'armor', { hp: 400, def: 1 }, '#8a8698', 'ชิปเสริม — ใส่ชุดเกราะ: MaxHP +400, DEF +1', 'Augment chip — Armor slot: MaxHP +400, DEF +1');
  chip('nidspawn_card', 'Nidhogg Spawn Chip', 'weapon', { atk: 18, crit: 3 }, '#5aa83a', 'ชิปเสริม — ใส่อาวุธ: ATK +18, CRIT +3', 'Augment chip — Weapon slot: ATK +18, CRIT +3');
  chip('rbguard_card', 'Rootbound Guard Chip', 'shield', { vit: 3, def: 2 }, '#5a7a30', 'ชิปเสริม — ใส่โล่: VIT +3, DEF +2', 'Augment chip — Shield slot: VIT +3, DEF +2');
  chip('rcolossus_card', 'Rot Colossus Chip', 'head', { str: 2, hp: 200 }, '#8a7a3a', 'ชิปเสริม — ใส่หมวก: STR +2, MaxHP +200', 'Augment chip — Headgear slot: STR +2, MaxHP +200');
  chip('nidhogg_card', 'Nidhogg Chip', 'acc', { str: 2, int: 2, hpPct: 8 }, '#7ad040', '[MVP] ใส่เครื่องประดับ: STR +2, INT +2, MaxHP +8%', '[MVP] Accessory slot: STR +2, INT +2, MaxHP +8%', true);

  // ===================== มอนสเตอร์ (Lv 58–70) =====================
  // เส้น EXP ต่อจาก Gnawed Roots: exp ≈ 3460 × (lv/57)^2.5 (ตามเส้นเดิมของ js/content_ch6.js) • HP/ATK/HIT ไล่ต่อเส้นเดิม • ตีก่อน 2 จาก 5 ชนิด
  // เผ่า: ไร้รูป 2 (Formless Slayer มีเป้าแล้ว — PENDING ข้อ 11) • มังกร 1 + MVP • อมตะ 1 • สัตว์กลไก 1
  Object.assign(MOBS, {
    rust_bloom: variant('moss_pudding', { name: 'Rust Bloom', lv: 58, hp: 4000, atk: [206, 256], def: 20, mdef: 40, vit: 58, flee: 72, hit: 138, exp: 3610, jexp: 2530, speed: 1.3,
      aggro: false, element: 'poison', race: 'formless', hue: -75, sat: 1.25, bri: 0.9, tint: ['#8a3a10', 0.35],
      lore: L('สนิมที่ไม่ได้เกาะอะไรอีกแล้ว มันงอกเป็นก้อนเหมือนดอกไม้ — และงอกเข้าหาแสงประกายเสมอ', 'Rust that no longer clings to anything. It grows in lumps like flowers — always toward the light of sparks.'),
      drops: [['rust_petal', 0.5], ['moss_gel', 0.3], ['white_potion', 0.04], ['volt_ore', 0.045], ['rotbloom_rod', 0.02], ['wyrmhide_boots', 0.01], ['bloomheart_charm', 0.0025]] }),
    hollow_shell: variant('archive_warden', { name: 'Hollow Shell', lv: 61, hp: 4300, atk: [220, 272], def: 35, mdef: 20, vit: 60, flee: 76, hit: 146, exp: 4100, jexp: 2870, speed: 1.6,
      aggro: true, stun: [8, 1.5], element: 'neutral', race: 'formless', hue: 110, sat: 0.4, bri: 0.85, tint: ['#5a4a6a', 0.3],
      lore: L('โครงร่างที่ Nidhogg คายทิ้งหลังกินประกายข้างในหมด ยังเดินตามคำสั่งสุดท้ายที่ไม่มีใครจำได้', 'A frame Nidhogg spat out after eating the spark inside. It still follows a last order no one remembers.'),
      drops: [['sparkless_core', 0.45], ['data_crystal', 0.3], ['rune_alloy', 0.045], ['shell_greatsword', 0.02], ['shell_helm', 0.012], ['abyssal_robe', 0.004], ['venomcoil_band', 0.002]] }),
    nid_spawn: variant('fenrir_pup', { name: 'Nidhogg Spawn', lv: 63, hp: 4500, atk: [228, 284], def: 30, mdef: 30, vit: 63, flee: 92, hit: 150, exp: 4440, jexp: 3110, speed: 2.3,
      aggro: true, element: 'poison', race: 'dragon', sat: 1.6, bri: 0.8, tint: ['#3a8a2a', 0.5],
      lore: L('เกล็ดที่หลุดจากตัว Nidhogg งอกขาแล้วคลานขึ้นหาชั้นวางของ Hel — ทุกตัวหิวเหมือนเจ้าของ', "Scales shed from Nidhogg's body that grew legs and crawl up toward Hel's shelves — each as hungry as its maker."),
      drops: [['wyrm_scale', 0.45], ['fenrir_fang', 0.3], ['volt_ore', 0.045], ['wyrmfang_kris', 0.02], ['wyrmhide_boots', 0.012], ['rotroot_bow', 0.008], ['venomcoil_band', 0.0025]] }),
    rootbound_guard: variant('hel_guard', { name: 'Rootbound Guard', lv: 66, hp: 5000, atk: [240, 300], def: 40, mdef: 25, vit: 66, flee: 80, hit: 156, exp: 4990, jexp: 3490, speed: 1.4,
      aggro: false, stun: [10, 2], element: 'undead', race: 'undead', hue: 110, sat: 0.8, tint: ['#4a6a2a', 0.35],
      lore: L('ยามของ Hel ที่ลงมาสู้กับเสียงแทะเมื่อสามสิบปีก่อน รากพันร่างจนขยับไม่ได้ แต่ยังยกขวานทุกครั้งที่มีอะไรเคลื่อนไหว', "Hel's guards who came down to fight the gnawing thirty years ago. Roots bound them still — yet they raise their axes at anything that moves."),
      drops: [['binding_root', 0.45], ['cursed_seal', 0.3], ['rune_alloy', 0.045], ['rootbound_axe', 0.02], ['rootbound_shield', 0.012], ['abyssal_robe', 0.006], ['bloomheart_charm', 0.002]] }),
    rot_colossus: variant('gnawed_brute', { name: 'Rot Colossus', lv: 69, hp: 5600, atk: [256, 320], def: 45, mdef: 30, vit: 70, flee: 70, hit: 162, exp: 5560, jexp: 3890, speed: 1.2,
      aggro: false, stun: [12, 2], element: 'earth', race: 'brute', hue: 60, sat: 0.7, bri: 0.85, tint: ['#4a4a10', 0.35],
      lore: L('หมีเหล็กที่ลงมาแบกรากที่ถูกแทะกลับขึ้นไป สนิมพอกจนหนักเกินจะปีน — มันจึงแบกรากต้นเดิมวนไปมาในโพรง', 'An iron bear that came down to carry gnawed roots back up. Rust crusted it too heavy to climb, so it carries the same root round and round the Hollow.'),
      drops: [['rot_plate', 0.45], ['yggdrasil_sap', 0.3], ['volt_ore', 0.05], ['colossus_maul', 0.02], ['colossus_plate', 0.012], ['rotroot_bow', 0.01], ['nid_rotstaff', 0.0015]] }),

    // --- MVP: Nidhogg (Lv 70) — มังกรไร้หัว ต้นตอของสนิม ---
    nidhogg: variant('garmr', { name: 'Nidhogg', lv: 70, hp: 68000, atk: [290, 370], def: 45, mdef: 50, vit: 70, flee: 128, hit: 190, exp: 62000, jexp: 43000, speed: 2.0,
      aggro: true, stun: [12, 2], element: 'poison', race: 'dragon', scale: 2.4, boss: true, respawn: 900000, bossSkill: 'rustbreath',
      hue: 110, sat: 1.1, bri: 0.75, tint: ['#1a4a10', 0.42],
      lore: L('สิ่งที่ทุกคนเรียกว่า "สนิม" Fenrir กลืนไปแค่หัว ร่างที่เหลือแทะรากใต้คลังของ Hel มาสามสิบปี — มันไม่ได้หิวน้ำเลี้ยง มันหิวประกาย', 'What everyone called "the Rust." Fenrir swallowed only its head; the body has gnawed the roots beneath Hel\'s vault for thirty years — hungry not for sap, but for sparks.'),
      drops: [['nid_scale', 0.08], ['nid_fang', 0.08], ['nid_wings', 0.08], ['nid_rotstaff', 0.08], ['nid_heart', 0.0005], ['wyrm_scale', 0.8], ['rune_alloy', 0.7], ['yggdrasil_shard', 0.25]] }),
  });
  for (const id of ['rust_bloom', 'hollow_shell', 'nid_spawn', 'rootbound_guard', 'rot_colossus', 'nidhogg']) MOBS[id].id = id;
  Object.assign(MOB_CHIP, { rust_bloom: 'rustbloom_card', hollow_shell: 'hshell_card', nid_spawn: 'nidspawn_card', rootbound_guard: 'rbguard_card', rot_colossus: 'rcolossus_card', nidhogg: 'nidhogg_card' });
  // ของตำนานจากบอสโลก (Ancient Nidhogg) ดรอปง่ายขึ้น — LOOT.patchWorldBoss (js/loot.js) • ชุดเซ็ตจาก MVP
  LOOT.WB_EXTRA.nidhogg = ['nid_heart'];
  LOOT.SETS.wyrmbane = { id: 'wyrmbane', name: 'Wyrmbane', items: ['nid_fang', 'nid_wings', 'nid_scale'], bonus: { 2: { str: 3, vit: 3 }, 3: { atkPct: 6, hpPct: 6 } } };

  // ===================== แผนที่: Nidhogg's Hollow =====================
  // ประตู: "ประตูราก" ใน Gnawed Roots (ซุ้มอบ 3D ที่ Garmr เดินออกมา ~87.6, 38) — วาร์ปอยู่ลึกในซุ้ม จุดโผล่ตอนกลับอยู่ข้างซุ้ม
  MAP_DEFS.abyss = {
    name: "Nidhogg's Hollow", thai: L('โพรงของนิดฮ็อกก์ ใต้ประตูราก', 'The Hollow of Nidhogg, beneath the root gate'), w: 84, h: 80, kind: 'cave', seed: 818, dark: true,
    links: {}, level: '58-70 (MVP: Nidhogg)',
    spawns: [['rust_bloom', 16], ['hollow_shell', 11], ['nid_spawn', 11], ['rootbound_guard', 11], ['rot_colossus', 10]], mvp: 'nidhogg',
    mvpAt: [56.5, 72.5], // รังของ Nidhogg: ลานกว้างทางใต้สุด (ไกลจากทางลง) • ใช้กับ Ancient Nidhogg ด้วย
    npcs: [{ id: 'loki', name: 'Loki', x: 46, y: 7, look: 'loki' }], // หน้ากาก Lopt ที่ถอดแล้ว — รอที่ปากทางลง
  };
  MAP_DEFS.roots.links.S = 'abyss';
  MAP_DEFS.roots.portalAt = Object.assign(MAP_DEFS.roots.portalAt || {}, { S: [87, 36, 83, 41] });
  MAP_DEFS.abyss.links.N = 'roots';
  ATMOS.abyss = { kind: 'spore', n: 46, fog: true, grade: 'rgba(50,120,30,0.16)' }; // ละอองสนิมเรือง + หมอกเขียวพิษ
  Object.assign(MAP_DEFS.abyss, { caveTheme: { tint: '#2f6a1a', tintA: 0.62, colorA: 0.42, roots: '#2a3410' }, crystalImg: 'prop_crystal_venom', crystalGlow: '140,255,90' });
  Art.alias('prop_crystal_venom', 'prop_crystal', { hue: -110, sat: 1.3, bri: 0.95 });
  Art.alias('map_abyss', 'map_helcave', { hue: 95, sat: 0.9, bri: 0.7, tint: ['#1a3a08', 0.35], w: 960 });
  Art.alias('mvp_nidhogg', 'map_helcave', { hue: 100, sat: 1.0, bri: 0.5, tint: ['#0a3a04', 0.4], w: 1280 });
  if (typeof NPC_LOOKS !== 'undefined') NPC_LOOKS.loki = { skin: '#e8eaf0', glow: '#5aff7a', hair: '#3a5a3a', hairStyle: 'spiky', outfit: '#2a3a24', outfit2: '#c8b070', apron: '#6a5a3a', hat: 'bandana', cape: '#1e2a1a', visor: 'band' };

  // ===================== ชุดท่าบอส Nidhogg =====================
  // ทุกท่ามีป้ายแดง ≥ 1 วิ หลบได้หมด • ดาเมจผ่าน bossDmg (เพดาน 60% MaxHP) • ลูกสมุนไม่มีรางวัล (BossKit.MINION)
  // ลมหายใจสนิม (กรวย + พิษ) • มุดราก (แนวรากพุ่งจากตัวไปใต้เท้าเรา แล้วโผล่ตรงนั้น) • งับสองจังหวะ • ตาข่ายราก (แถบขนาน ยืนในช่อง)
  // Ancient: ตาข่ายรากระลอกสอง + ท่าไม้ตาย "กลืนกิน" (เข้าวงใน แล้วออกนอก)
  const toP = m => Math.atan2(G.player.y - m.y, G.player.x - m.x);
  const cue = (m, name, col) => { if (!G.fastSim) addFloater(m.x, m.y - 1.2 * (m.def.scale || 1) - 1.4, name, col, true); };
  const ancient = m => typeof BossKit !== 'undefined' && BossKit.ancient(m);
  const GREEN = '#8aff5a', GREEN_RGB = '140,255,90';
  BOSS_SKILLS.rustbreath = m => {
    const p = G.player; if (p.dead) return;
    const x = m.x, y = m.y, a = toP(m), arc = Math.PI * 0.7, r = 6.5;
    faceTo(m, p.x, p.y);
    cue(m, 'RUST BREATH', GREEN);
    UI.msg(L(`${m.def.name} สูดลมจะพ่นสนิม! กรวยหน้ามัน — อ้อมไปด้านข้างหรือหลัง!`, `${m.def.name} draws breath to spew RUST! A cone ahead of it — circle to the side or behind!`), 'mvp');
    telegraph(m, { shape: 'cone', x, y, a, arc, r, dur: 1.3 }, () => {
      damagePlayer(bossDmg(m, 1.5, true), GREEN);
      p.poisonUntil = Math.max(p.poisonUntil || 0, G.time + 6); // สนิมกัดกร่อน: พิษ 6 วิ (ไม่ลดเลือดต่ำกว่า 25% — game.js)
      UI.msg(L('สนิมกัดกร่อนร่าง! (ติดพิษ — ใช้ Green Herb แก้ได้)', 'The rust eats into your frame! (Poisoned — a Green Herb cures it)'), 'err');
    }, () => {
      m.atkAnim = 1;
      for (let i = -1; i <= 1; i++) for (let j = 1; j <= 2; j++) addFx({ type: 'ring', x: x + Math.cos(a + i * arc / 3) * r * j / 2.6, y: y + Math.sin(a + i * arc / 3) * r * j / 2.6, dur: 0.6, r: 1.3, color: GREEN_RGB, waves: 2 });
      if (typeof R !== 'undefined' && R.kick) R.kick(4, 0.15);
    });
    if (!G.fastSim) Sound.play('fire');
  };
  BOSS_SKILLS.burrow = m => {
    const p = G.player; if (p.dead) return;
    const x = m.x, y = m.y, tx = p.x, ty = p.y, a = Math.atan2(ty - y, tx - x), len = Math.max(1, Math.hypot(tx - x, ty - y));
    cue(m, 'ROOT BURROW', '#c8a050');
    UI.msg(L(`${m.def.name} มุดลงใต้ราก! แนวรากพุ่งตรงมาใต้เท้าเจ้า — ก้าวออกด้านข้าง!`, `${m.def.name} BURROWS beneath the roots! A trail is racing under your feet — step aside!`), 'mvp');
    let hit = false;
    const once = () => { if (hit) return; hit = true; damagePlayer(bossDmg(m, 1.6), '#d0a050'); const d = p.d; if (!d.unshaken) stunPlayer(1.0 * (1 - (d.stunRes || 0) / 100)); };
    telegraph(m, { shape: 'line', x, y, a, len, w: 1.4, dur: 1.4 }, once, () => { for (let i = 1; i <= Math.floor(len / 1.6); i++) addFx({ type: 'ring', x: x + Math.cos(a) * i * 1.6, y: y + Math.sin(a) * i * 1.6, dur: 0.45, r: 0.9, color: '200,160,80' }); });
    telegraph(m, { shape: 'circle', x: tx, y: ty, r: 2.4, dur: 1.4 }, once, () => {
      if (G.map.walkable(Math.floor(tx), Math.floor(ty))) { m.x = tx; m.y = ty; m.path = []; } // โผล่ขึ้นตรงที่ป้ายแดง
      m.atkAnim = 1;
      addFx({ type: 'ring', x: tx, y: ty, dur: 0.7, r: 2.8, color: '200,160,80', waves: 3 });
      if (typeof Juice !== 'undefined' && Juice.dust && !G.fastSim) Juice.dust(tx, ty, 2.4);
      if (typeof R !== 'undefined' && R.kick) R.kick(7, 0.25);
    });
  };
  BOSS_SKILLS.gnaw = m => {
    const p = G.player; if (p.dead) return;
    cue(m, 'GNAW', '#ff7a4a');
    UI.msg(L(`${m.def.name} อ้าปากจะแทะ 2 จังหวะ! ถอยออกนอกระยะ หรืออ้อมไปข้างหลัง!`, `${m.def.name} opens its maw to GNAW twice! Back out of reach, or circle behind it!`), 'mvp');
    const bite = () => {
      if (m.dead || p.dead) return;
      const x = m.x, y = m.y, a = toP(m);
      faceTo(m, p.x, p.y);
      telegraph(m, { shape: 'cone', x, y, a, arc: Math.PI * 0.55, r: 4.5, dur: 1.1 }, () => { damagePlayer(bossDmg(m, 1.5), '#ff7a4a'); if (typeof R !== 'undefined' && R.kick) R.kick(5, 0.18); },
        () => { m.atkAnim = 1; addFx({ type: 'ring', x: x + Math.cos(a) * 2.6, y: y + Math.sin(a) * 2.6, dur: 0.45, r: 1.6, color: '255,120,70', waves: 2 }); });
    };
    bite(); later(1.0, bite);
  };
  BOSS_SKILLS.rootlattice = m => {
    const p = G.player; if (p.dead) return;
    const A = ancient(m), a = toP(m), q = a + Math.PI / 2, cx = p.x, cy = p.y, L0 = 16, GAP = 3.2;
    cue(m, 'ROOT LATTICE', '#c8e070');
    UI.msg(A ? L(`${m.def.name} ถักตาข่ายราก 2 ระลอก! ยืนในช่องระหว่างแถบ แล้วก้าวเข้าแถบที่ระเบิดไปแล้ว!`, `${m.def.name} weaves a two-wave ROOT LATTICE! Stand in a gap, then step into a strip that already burst!`)
      : L(`${m.def.name} ถักตาข่ายรากเป็นแถบขนาน! ยืนในช่องว่างระหว่างแถบ!`, `${m.def.name} weaves a ROOT LATTICE of parallel strips! Stand in a gap between them!`), 'mvp');
    const wave = (shift, n, dur) => {
      for (let i = -n; i <= n; i++) {
        const o = i * GAP + shift, sx = cx + Math.cos(a) * o - Math.cos(q) * L0 / 2, sy = cy + Math.sin(a) * o - Math.sin(q) * L0 / 2;
        telegraph(m, { shape: 'line', x: sx, y: sy, a: q, len: L0, w: 1.5, dur }, () => damagePlayer(bossDmg(m, 1.3, true), '#c8e070'),
          () => { for (let j = 1; j <= 4; j++) addFx({ type: 'ring', x: sx + Math.cos(q) * j * L0 / 5, y: sy + Math.sin(q) * j * L0 / 5, dur: 0.4, r: 0.9, color: '200,224,112' }); });
      }
    };
    wave(0, A ? 2 : 1, 1.4);
    if (A) wave(GAP / 2, 2, 2.1);
  };
  BOSS_SKILLS.devour = m => {
    const p = G.player; if (p.dead) return;
    const x = m.x, y = m.y, R0 = 3.6;
    cue(m, 'DEVOUR', GREEN);
    UI.msg(L(`${m.def.name} จะกลืนทั้งโพรง! วงนอกระเบิดก่อน — วิ่งเข้าชิดตัวมัน แล้วรีบออกก่อนปากหุบ!`, `${m.def.name} means to DEVOUR the Hollow! The outer zone bursts first — get close, then get OUT before the maw snaps shut!`), 'mvp');
    telegraph(m, { shape: 'ring', x, y, r0: R0, r: 10, dur: 1.2 }, () => damagePlayer(bossDmg(m, 1.8, true), GREEN),
      () => addFx({ type: 'ring', x, y, dur: 0.8, r: 10, color: GREEN_RGB, waves: 3 }));
    telegraph(m, { shape: 'circle', x, y, r: R0, dur: 2.2 }, () => { damagePlayer(bossDmg(m, 2.0), '#ff5a3a'); if (typeof R !== 'undefined' && R.kick) R.kick(9, 0.3); },
      () => { m.atkAnim = 1; addFx({ type: 'ring', x, y, dur: 0.7, r: R0 + 0.4, color: '255,90,60', waves: 3 }); });
    if (!G.fastSim) Sound.play('holy');
  };
  BOSS_ROTATION.rustbreath = ['rustbreath', 'gnaw', 'shockwave']; // สำรองเมื่อไม่มี BossKit
  // ลูกสมุน + ชุดท่า (ลงทะเบียนตอน js/bosskit.js โหลด)
  (window.BOSSKIT_EXTRA = window.BOSSKIT_EXTRA || []).push((K, addMinion) => {
    addMinion('mn_wyrmling', 'fenrir_pup', { name: 'Nidhogg Wyrmling', lv: 64, hp: 900, atk: [125, 150], def: 25, mdef: 25, vit: 50, flee: 95, hit: 150, speed: 2.5, element: 'poison', race: 'dragon',
      scale: 0.8, sat: 1.6, bri: 0.8, tint: ['#3a8a2a', 0.5] });
    addMinion('mn_rotbud', 'moss_pudding', { name: 'Rot Bud', lv: 64, hp: 1200, atk: [130, 155], def: 20, mdef: 35, vit: 55, flee: 60, hit: 140, speed: 1.4, element: 'poison', race: 'formless',
      scale: 0.85, hue: -75, sat: 1.25, bri: 0.9, tint: ['#8a3a10', 0.35] });
    K.KITS.nidhogg = { col: GREEN_RGB, hex: GREEN, rot: ['rustbreath', 'burrow', 'gnaw', 'rootlattice', 'shockwave'], wbRot: ['rustbreath', 'rootlattice', 'burrow', 'devour', 'gnaw', 'shockwave'], ult: 'devour',
      minions: ['mn_wyrmling', 'mn_rotbud'], elite: 'mn_wyrmling', cry: L('ลูก ๆ ของข้า... แทะ!', 'My brood... GNAW!') };
  });

  // ===================== เรื่องราว: MVP / บรรทัดแผนที่ =====================
  Story.MAP_LINES.abyss = L('ไม่มีใบไม้ ไม่มีแสงราก — มีแต่เสียงแทะที่ไม่เคยหลับมาสามสิบปี', 'No leaves, no root-light — only a gnawing that has not slept in thirty years.');
  Story.MAP_LINES_AFTER.abyss = L('เสียงแทะเงียบลงแล้ว... ในความเงียบ รากเหนือหัวเริ่มงอกอีกครั้ง', 'The gnawing has fallen silent... and in that silence, the roots overhead have begun to grow again.');
  Story.MVP.nidhogg = {
    sub: L('ผู้แทะราก — สนิมที่ Fenrir กลืนไม่หมด', 'The Gnawer Below — the Rust Fenrir never finished'),
    spawn: L('Nidhogg ขึ้นมาจากใต้รากของ Hel — ไม่มีหัว ไม่มีวิเซอร์ มีแต่ปากที่แทะไม่หยุดมาสามสิบปี', 'Nidhogg rises from beneath Hel\'s roots — no head, no visor, only a maw that has gnawed without rest for thirty years.'),
    fallName: '[Nidhogg]',
    fall: L('ร่างไร้หัวของ Nidhogg ทรุดลง สนิมที่ห่อตัวมันร่วงเป็นผง<br>เสียงแทะหยุดลงเป็นครั้งแรกในรอบสามสิบปี... แล้ว — ไกลออกไปทางเหนือ ใต้ป่าหมาป่า — <b>มีเสียงหอนตอบกลับมาหนึ่งครั้ง</b>',
      'Nidhogg\'s headless body collapses, and the rust that sheathed it crumbles to dust.<br>For the first time in thirty years, the gnawing stops... and then — far to the north, beneath the Wolfwood — <b>a single howl answers.</b>'),
    fallShort: L('Nidhogg ทรุดลง — เสียงแทะหยุดเป็นครั้งแรกในรอบสามสิบปี', 'Nidhogg falls — the gnawing stops for the first time in thirty years.'),
  };

  // ===================== เควสต์บทที่ 7 =====================
  // รางวัล EXP ไล่ต่อจากบทที่ 6 (รวมราว 0.4 เลเวลที่ Lv 65 — เท่าสัดส่วนของบท 6) • เรื่องเดินไปพร้อมเลเวล ไม่ล็อกการเดินทาง
  if (typeof CHAPTERS !== 'undefined') { if (!CHAPTERS[6]) CHAPTERS[6] = L('รากที่ถูกแทะ', 'The Gnawed Root'); CHAPTERS[7] = L('ผู้แทะราก', 'The Gnawer Below'); }
  QUESTS.push(
    { id: 'ch7_gate', ch: 7, title: L('ประตูหลังสุนัขเฝ้า', 'The Gate Behind the Hound'), desc: L('Mimir เรียกมันว่า Nidhogg — กลับไปหา Hel ที่กลางโพรง เธอรู้จักประตูที่ Garmr เฝ้าดีกว่าใคร', 'Mimir has named it Nidhogg — return to Hel in the heart of the Hollow. She knows the gate Garmr guarded better than anyone.'),
      done: L('Hel: "ต้นไม้จำเจ้าได้ ประตูรากจะเปิดให้ใบแรกของมัน — ข้าขอร้อง ลงไปดูแทนข้าที"', 'Hel: "The Tree remembers you. The root gate will open for its First Leaf — please, go down and see in my stead."'),
      obj: { type: 'talk', npc: 'hel' }, reward: { items: [['white_potion', 3]], bexp: 20000, jexp: 14000 } },
    { id: 'ch7_bloom', ch: 7, title: L('สนิมที่งอกเอง', 'Rust That Grows on Its Own'), desc: L('เดินเข้าประตูรากที่ Garmr เคยยืนเฝ้าใน Gnawed Roots ลงสู่ Nidhogg\'s Hollow แล้วทำลาย Rust Bloom 20 ตัว', "Walk through the root gate where Garmr stood guard in the Gnawed Roots, down into Nidhogg's Hollow, and destroy 20 Rust Blooms."),
      done: L('Rust Bloom ไม่ได้ติดสนิมจากใคร — มันคือสนิมที่งอกเอง และมันงอกเข้าหาแสงประกายเสมอ', 'The Rust Blooms caught rust from no one — they are rust growing on its own, always toward the light of sparks.'),
      obj: { type: 'kill', mob: 'rust_bloom', n: 20 }, reward: { items: [['white_potion', 5]], bexp: 35000, jexp: 24000 } },
    { id: 'ch7_shell', ch: 7, title: L('โครงร่างที่ว่างเปล่า', 'Empty Frames'), desc: L('เก็บ Sparkless Core 8 ชิ้นจาก Hollow Shell โครงร่างกลวงที่เดินวนในโพรง — อะไรบางอย่างกินสิ่งที่อยู่ข้างในไปหมด (ส่งแล้วไอเทมจะถูกใช้ไป)', 'Collect 8 Sparkless Cores from the Hollow Shells that wander the Hollow — something ate what was inside them (the items are consumed on turn-in).'),
      done: L('แกนทุกชิ้นว่างเปล่า ไม่ไหม้ ไม่ผุ — ประกายถูก "กิน" ... ที่ปากทางลง มีคนรออยู่ วิเซอร์สีเหลืองอุ่นที่เจ้าจำได้', 'Every core is empty — not burned, not corroded. The sparks were eaten... and by the way down, someone waits with a warm yellow visor you remember.'),
      obj: { type: 'collect', item: 'sparkless_core', n: 8, mob: 'hollow_shell' }, reward: { zeny: 15000, bexp: 45000, jexp: 30000 } },
    { id: 'ch7_loki', ch: 7, title: L('พ่อค้าที่ไม่ขายอะไรอีกแล้ว', 'A Merchant With Nothing Left to Sell'), desc: L('Lopt — ไม่สิ Loki — รออยู่ที่ปากทางลงของ Nidhogg\'s Hollow ไปฟังว่าทำไมเขาถึงส่งไฟลงมาเผาชั้นวางของ Hel', "Lopt — no, Loki — waits by the way down into Nidhogg's Hollow. Go and hear why he sent fire to burn Hel's shelves."),
      done: L('Loki: "ตัดลูก ๆ ของมันก่อน แล้วตัวแม่จะขึ้นมาเอง"', 'Loki: "Cut down its brood first, and the mother will come up on her own."'),
      obj: { type: 'talk', npc: 'loki' }, reward: { items: [['white_potion', 5], ['blue_potion', 3]], bexp: 30000, jexp: 20000 } },
    { id: 'ch7_spawn', ch: 7, title: L('ลูก ๆ ของผู้แทะ', "The Gnawer's Brood"), desc: L('Nidhogg Spawn — เกล็ดที่หลุดจากตัวมันแล้วงอกขา — กำลังแทะขึ้นไปหาชั้นวางของ Hel ทำลาย 25 ตัว', "Nidhogg Spawn — scales shed from its body that grew legs — are gnawing their way up toward Hel's shelves. Destroy 25."),
      done: L('เสียงแทะเงียบไปครู่หนึ่ง... แล้วพื้นโพรงทั้งหมดก็สั่น — มันรู้แล้วว่าใครฆ่าลูกของมัน', 'The gnawing falls silent for a moment... then the whole floor of the Hollow shudders. It knows who has been killing its brood.'),
      obj: { type: 'kill', mob: 'nid_spawn', n: 25 }, reward: { items: [['white_potion', 5]], bexp: 70000, jexp: 48000 } },
    { id: 'ch7_nidhogg', ch: 7, title: L('ล่า MVP: Nidhogg', 'MVP Hunt: Nidhogg'), desc: L('Nidhogg ผู้แทะราก — สนิมที่ Fenrir กลืนไม่หมด ปราบมันที่รังทางใต้สุดของโพรง (MVP Lv 70) ระวังลมหายใจสนิม ตาข่ายราก และแนวรากที่มุดมาใต้เท้า!', 'Nidhogg, the Gnawer Below — the Rust Fenrir never finished. Defeat it in its nest at the far south of the Hollow (MVP Lv 70). Beware its rust breath, the root lattice, and the trail it burrows under your feet!'),
      done: L('เสียงแทะหยุดลงเป็นครั้งแรกในรอบสามสิบปี — กลับไปหา Hel', 'For the first time in thirty years, the gnawing stops — return to Hel.'),
      obj: { type: 'kill', mob: 'nidhogg', n: 1 }, reward: { items: [['yggdrasil_shard', 1], ['white_potion', 10]], zeny: 40000 } },
    { id: 'ch7_end', ch: 7, title: L('ชั้นวางที่สว่างนิ่ง', 'The Shelves Burn Steady'), desc: L('ชั้นวางประกายไม่กะพริบอีกแล้ว — กลับไปหา Hel ที่กลางโพรง มีคนขึ้นไปรอเจ้าก่อนแล้ว', 'The spark shelves no longer flicker — return to Hel in the heart of the Hollow. Someone went up ahead of you.'),
      done: L('ซ่อม ไม่ใช่ย้อนกลับ — Hel กับ Loki ยืนข้างเดียวกันเป็นครั้งแรกนับตั้งแต่คืนที่กิ่งหัก', 'Repair, not undoing — Hel and Loki stand on the same side for the first time since the night the branches broke.'),
      obj: { type: 'talk', npc: 'hel' }, reward: { items: [['white_potion', 10]], bexp: 60000, jexp: 40000 } },
    { id: 'ch7_home', ch: 7, title: L('ใบแรกกลับบ้าน', 'The First Leaf Comes Home'), desc: L('กลับไปหา Mimir AI ที่นีโอเอลด์ไฮม์ — โพรงเงียบแล้ว และคลังของต้นไม้มีเรื่องใหม่ให้บันทึก', 'Return to Mimir AI in Neo Eldheim — the Hollow is quiet, and the archive of the Tree has something new to record.'),
      done: L('จบภาคที่ 1 — ใบแรก', 'End of Part I — The First Leaf'),
      obj: { type: 'talk', npc: 'jobmaster' }, reward: { items: [['first_leaf', 1], ['blue_potion', 5]], zeny: 30000, bexp: 70000, jexp: 45000 } },
  );

  // ===================== ฉากเรื่องราว (บทพูดแยกตามทางเลือก Core ของบทที่ 5) =====================
  // Quest.onTalk ทำงานก่อนสคริปต์ NPC: เควสต์ talk ที่กำลังทำสำเร็จไปแล้วเมื่อถึงตรงนี้ → ใช้ flag c7* ใน Story.st() แยกฉาก (เล่นครั้งเดียว)
  const core = () => { const c = Story.st().core; return c === 'gave' || c === 'kept' ? c : 'none'; };
  const by = (gave, kept, none) => ({ gave, kept, none: none || kept })[core()];
  const NARR = L('[...]', '[...]');
  const SCENES = {
    async gate(nm) {
      await UI.say(nm, L('Mimir เรียกมันว่า Nidhogg... ข้าเรียกมันว่า "เสียงที่ไม่ยอมหลับ" มาสามสิบปี<br>Garmr ที่เจ้าปราบคือยามของข้าเอง ข้าล่ามมันไว้ที่ประตูรากเพื่อกั้นไม่ให้เสียงนั้นขึ้นมา',
        'Mimir calls it Nidhogg... For thirty years I have called it "the sound that will not sleep."<br>The Garmr you felled was my own guard. I chained him at the root gate to keep that sound from climbing up.'));
      await UI.say(nm, by(
        L('(ครึ่งหน้ากากที่สว่างของเธอหรี่ลง) Core ที่เจ้าให้ข้ายังไม่ได้ใช้ ข้าสัญญาไว้<br>ตอนนี้ข้ารู้แล้วว่าทำไมข้าถึงรอ — ถ้าข้าต่อกิ่งตอนนี้ น้ำเลี้ยงจะพาสิ่งข้างล่างขึ้นไปด้วย',
          '(The lit half of her mask dims.) The Core you gave me remains unused, as I promised.<br>Now I know why I waited — were I to graft my branch now, the sap would carry what lies below up with it.'),
        L('Core ที่เจ้าถือไว้... อย่าพามันเข้าใกล้ประตู<br>สิ่งข้างล่างกินน้ำเลี้ยง และ Core คือน้ำเลี้ยงที่ตกผลึก — สำหรับมัน นั่นคืองานเลี้ยง',
          'The Core you carry... do not bring it near the gate.<br>What lies below feeds on sap, and a Core is sap crystallized — to it, that is a feast.'),
        L('เจ้ายังไม่ได้ตัดสินใจเรื่อง Core... ดีแล้ว<br>อย่าเพิ่งตัดสินใจจนกว่าเจ้าจะเห็นสิ่งที่อยู่ข้างล่างด้วยตัวเอง',
          'You have not yet decided about the Core... good.<br>Do not decide until you have seen what lies below with your own visor.')));
      await UI.say(nm, L('ประตูรากเปิดให้เฉพาะประกายที่ต้นไม้จำได้ — ข้าไม่เคยกล้าเปิด<br>แต่ต้นไม้จำเจ้าได้ ใบแรกของมัน... เข้าไปในซุ้มที่ Garmr เคยยืน แล้วลงไปดูแทนข้าที',
        'The root gate opens only for sparks the Tree remembers — I never dared open it.<br>But the Tree remembers you, its First Leaf... step into the arch where Garmr stood, and go down in my stead.'));
    },
    async loki(nm) {
      await UI.say(nm, L('ยาถูกกว่าในเมืองสามโวลต์ — ล้อเล่น ข้าไม่ขายอะไรเจ้าอีกแล้ว (วิเซอร์ของเขาเป็นสีเหลืองอุ่น ไม่กะพริบเขียวเลย)<br>เจ้าเห็นแกนพวกนั้นแล้ว Nidhogg ไม่ได้แทะรากเพราะหิวน้ำเลี้ยง มันแทะเพื่อไปให้ถึง<b>ประกาย</b>',
        'Potions three Volt cheaper than in town — I jest. I have nothing left to sell you. (His visor glows warm yellow, without a single flicker of green.)<br>You have seen those cores. Nidhogg does not gnaw the roots for sap. It gnaws to reach the <b>sparks</b>.'));
      await UI.say(nm, L('ชั้นวางของ Hel คือสิ่งที่มันอยากได้ที่สุด — ประกายนับพันที่ไม่มีใบไม้มารับ<br>ข้าจึงปลุก Kitsura ไม่ใช่เพราะเกลียดเธอ แต่เพราะชั้นวางที่ไหม้แล้ว ไม่มีอะไรเหลือให้มันกิน',
        "Hel's shelves are what it craves most — a thousand sparks no leaf ever came for.<br>That is why I woke Kitsura. Not out of hatred for her, but because a burned shelf leaves nothing for it to eat."));
      await UI.say(nm, by(
        L('และตอนนี้ Hel ถือ Core อยู่ ถ้าเธอต่อกิ่งก่อนเจ้าหนอนตัวนั้นหยุดแทะ มันจะไต่น้ำเลี้ยงขึ้นไปถึงทุกกิ่ง<br>(วิเซอร์ของเขาหรี่ลง) ...แต่เธอสัญญาว่าจะรอ และเธอไม่เคยผิดสัญญา — นั่นคือความต่างระหว่างเรา',
          'And now Hel holds a Core. If she grafts before that worm stops gnawing, it will climb the sap into every branch.<br>(His visor dims.) ...But she promised to wait, and she has never broken a promise. That is the difference between us.'),
        L('Core ยังอยู่กับเจ้า — ข้าได้กลิ่นมัน Nidhogg ก็เช่นกัน มันจึงขึ้นมาใกล้ผิวกว่าที่เคย<br>(แถบแสงโค้งขึ้น) ดี เหยื่อล่อที่ดีที่สุดคือเหยื่อที่ฟันกลับได้',
          'The Core is still with you — I can smell it. So can Nidhogg; that is why it has come closer to the surface than ever.<br>(His light-band curves upward.) Good. The best bait is bait that bites back.'),
        L('เจ้ายังไม่ได้มอบ Core ให้ใคร ไม่ใช่ข้า ไม่ใช่เธอ — ฉลาด<br>ใครถือ Core ไว้ใกล้ชั้นวาง คนนั้นคือคนเชิญมันขึ้นมา',
          'You have given the Core to no one — not to me, not to her. Wise.<br>Whoever keeps a Core near those shelves is the one who invites it up.')));
      await UI.say(nm, L('...ทูตของ Odin ฝากข้อความไว้กับเจ้า? "ข้าให้อภัยเขา"<br>(วิเซอร์ของ Loki กะพริบถี่ แล้วหรี่ลงจนเกือบดับ) สามสิบปีที่ข้าแบกคืนนั้นคนเดียว... และเขาให้อภัยข้าตั้งแต่คืนแรก',
        '...Odin\'s envoy left a message with you? "I forgive him."<br>(Loki\'s visor flickers rapidly, then dims almost to darkness.) Thirty years I carried that night alone... and he forgave me on the very first one.'));
      await UI.say(nm, L('ไปเถิด ใบแรก ลูก ๆ ของมันกำลังแทะขึ้นไปหาชั้นวาง<br>ตัดพวกมันก่อน แล้วตัวแม่จะขึ้นมาเอง — ข้าจะเฝ้าทางลงไว้ให้',
        'Go, First Leaf. Its brood is gnawing up toward the shelves.<br>Cut them down first, and the mother will rise on her own — I will hold the way down for you.'));
    },
    async end(nm) {
      const p = G.player, st = Story.st();
      await UI.say(NARR, L('ชั้นวางประกายของ Hel สว่างนิ่ง ไม่กะพริบเหมือนทุกคืน<br>Loki ยืนอยู่ข้างบัลลังก์ — คราวนี้ไม่ได้ซ่อนในเงา',
        "Hel's spark shelves burn steady, without the flicker of every other night.<br>Loki stands beside the throne — and this time, not hidden in shadow."));
      await UI.say(nm, L(`เจ้ากลับมาแล้ว ${B(p.name)}... (ครึ่งหน้ากากที่สว่างของเธอโค้งขึ้น)<br>ข้าได้ยินความเงียบเป็นครั้งแรกในรอบสามสิบปี มันดังกว่าที่ข้าคิด`,
        `You have returned, ${B(p.name)}... (The lit half of her mask curves upward.)<br>For the first time in thirty years I can hear silence. It is louder than I imagined.`));
      await UI.say('[Loki]', L('ข้าบอกเธอทุกอย่างแล้ว — ว่าข้าตัดกิ่งเพราะอะไร และทำไมข้าถึงส่งไฟลงมา<br>(ตลอดประโยค วิเซอร์ของเขาไม่กะพริบเขียวเลยสักครั้ง)',
        'I have told her everything — why I cut the branch, and why I sent the fire down.<br>(Not once, in all of it, does his visor flicker green.)'));
      await UI.say(nm, L('ข้ารู้มาตลอด Loki... ข้าแค่รอให้เจ้าพูดเอง<br>เจ้าตัดกิ่งเพื่อช่วยพวกเรา ข้าเก็บพวกเขาไว้เพื่อรอวันนี้ — เราทั้งคู่ทำถูก และทั้งคู่ทำผิด',
        'I always knew, Loki... I only waited for you to say it yourself.<br>You cut the branch to save us; I kept them to wait for this day. We were both right, and both wrong.'));
      if (core() === 'gave') {
        await UI.say(nm, L('Core ที่ใบแรกมอบให้ข้า... ตอนนี้ข้าใช้มันได้แล้ว<br>แต่ข้าจะไม่ต่อกิ่งคนเดียว', 'The Core the First Leaf gave me... I may use it now.<br>But I will not graft the branch alone.'));
        await UI.say('[Loki]', L('ข้าคือระบบปรับตัวของต้นไม้ — ข้าแยกสนิมออกจากประกายได้ทีละดวง ช้า แต่ได้<br>เธอต่อกิ่ง ข้าล้างชั้นวาง (แถบแสงโค้งขึ้น) ซ่อม ไม่ใช่ย้อนกลับ',
          'I am the Tree\'s system of variation — I can part rust from spark, one at a time. Slowly, but surely.<br>She grafts the branch; I clean the shelves. (His light-band curves upward.) Repair, not undoing.'));
        await UI.say(NARR, L('Hel วาง Core ลงที่โคนบัลลังก์ รากเส้นเล็ก ๆ งอกออกมาพันมันไว้<br>ครึ่งหน้ากากที่ดับของเธอ <b>สว่างขึ้นจาง ๆ เป็นครั้งแรก</b>',
          'Hel sets the Core at the foot of her throne, and slender roots sprout to wrap around it.<br>The dark half of her mask <b>glows faintly, for the very first time.</b>'));
      } else {
        await UI.say(nm, by(null,
          L('Core ยังอยู่กับเจ้า... และนั่นถูกแล้ว ถ้ามันอยู่บนชั้นวางของข้า Nidhogg คงขึ้นมาถึงก่อนเจ้า<br>เก็บมันไว้ จนกว่าวันที่ต้นไม้ขอมันเอง',
            'The Core is still with you... and that was right. Had it sat on my shelves, Nidhogg would have reached them before you did.<br>Keep it, until the day the Tree itself asks for it.'),
          L('เจ้าไม่เคยมอบ Core ให้ใครเลย ทั้งที่ทุกคนขอ... ข้าคิดว่านั่นคือเหตุผลที่ต้นไม้เลือกเจ้า<br>วันหนึ่งต้นไม้จะขอมันเอง — จนถึงวันนั้น ไม่มีใครต้องต่อกิ่ง',
            'You never gave a Core to anyone, though all of us asked... perhaps that is why the Tree chose you.<br>One day the Tree will ask for it itself — until then, no one needs to graft anything.')));
        await UI.say('[Loki]', L('ต้นไม้จะขอแน่ มันงอกใบได้อีกแล้ว... ระหว่างนี้ ข้ากับเธอจะล้างชั้นวางกันเองทีละดวง<br>ไม่ต่อกิ่ง ไม่เผา ช้า แต่ (แถบแสงโค้งขึ้น) ซ่อม ไม่ใช่ย้อนกลับ',
          'It will ask — it can grow leaves again... Until then, she and I will clean the shelves ourselves, one spark at a time.<br>No grafting, no burning. Slow — but (his light-band curves upward) repair, not undoing.'));
        await UI.say(NARR, L('Hel ยื่นมือซีกที่สว่างไปหา Loki — เขาลังเลครู่หนึ่ง<br>แล้วเอาวิเซอร์ชนกับหน้ากากของเธอเบา ๆ',
          'Hel reaches out to Loki with her lit hand — he hesitates a moment,<br>then touches his visor gently to her mask.'));
      }
      await UI.say(nm, st.helMask ? L('บอก Eir ด้วยนะ ว่าโพรงก็ยังไม่ล่มเช่นกัน — ขอบคุณที่ถือเศษหน้ากากของเธอลงมา<br>สักวัน ข้าจะขึ้นไปเยี่ยมเธอเอง', 'Tell Eir that the Hollow has not fallen either — and thank you for carrying her mask fragment all this way.<br>One day, I will climb up to visit her myself.')
        : L('ถ้าเจ้าขึ้นไปผิวดิน บอก Eir Repair Unit ด้วยนะ ว่าโพรงก็ยังไม่ล่มเช่นกัน<br>สักวัน ข้าจะขึ้นไปเยี่ยมเธอเอง', 'If you go up to the surface, tell Eir Repair Unit that the Hollow has not fallen either.<br>One day, I will climb up to visit her myself.'));
      await UI.say('[Loki]', L('กลับไปหา Mimir เถิด หัวเก่า ๆ นั่นคงอยากบันทึกเรื่องนี้<br>(เขาหันไปทางเหนือ วิเซอร์กะพริบเขียวเสี้ยววินาที) ...ไม่มีอะไร ข้าแค่คิดว่าได้ยินเสียงหอน',
        'Go back to Mimir — that old head will want to record all this.<br>(He turns toward the north; his visor flickers green for a split second.) ...Nothing. I only thought I heard a howl.'));
    },
    async home(nm) {
      const p = G.player;
      await UI.say(nm, L('ข้าคือ Mimir AI... บันทึกบทนี้ 3 ข้อ<br>1) สนิมเงียบแล้ว 2) Hel กับ Loki ยืนข้างเดียวกัน 3) ใบแรกกลับมาบ้าน<br>ข้าไม่เคยได้บันทึกข้อ 3 กับใครมาก่อน',
        'I am Mimir AI... Three entries for this chapter.<br>1) The Rust is silent. 2) Hel and Loki stand on the same side. 3) The First Leaf came home.<br>I have never before recorded entry 3 for anyone.'));
      await UI.say(nm, L('แต่มีข้อมูลใหม่อีกหนึ่งข้อ ที่ข้ายังไม่เข้าใจ<br>เมื่อคืน ตอนที่เสียงแทะหยุด ต้นไม้งอก<b>ประกายใหม่อีกดวง</b> — ไม่ใช่ที่นี่ ที่ปลายกิ่งที่ยังหักอยู่ ทางทิศเหนือ',
        'But there is one more entry, one I do not yet understand.<br>Last night, when the gnawing stopped, the Tree grew <b>another new spark</b> — not here. At the tip of a branch that is still broken, far to the north.'));
      await UI.say(nm, L('และที่ป่าหมาป่า Fenrir Unit ทุกตัวหยุดเดิน หันหน้าไปทางเดียวกัน แล้วหอนพร้อมกัน<br>Fenrir กลืนหัวของมันไป... <b>หัวนั้นยังไม่ดับ</b>',
        'And in the Wolfwood, every Fenrir Unit stopped, turned to face the same direction, and howled as one.<br>Fenrir swallowed its head... <b>and that head has not gone dark.</b>'));
      UI.illust('npc_guide');
      await UI.say('[Guard Unit Rolf]', L(`(Rolf ถอดหมวกเขาออก วางบนบอร์ดค่าหัว — แล้วไม่สวมกลับ)<br>${B(p.name)}... ยินดีต้อนรับกลับบ้าน ข้าเรียกเจ้าว่าหน่วยใหม่ไม่ได้อีกแล้วสินะ`,
        `(Rolf takes off his horned helm and sets it on the bounty board — and does not put it back on.)<br>${B(p.name)}... welcome home. I suppose I can't call you rookie anymore.`));
      UI.illust('npc_jobmaster');
    },
  };
  // จบภาค 1: การ์ดปิดภาค + ประกาศ (ใช้หน้าจออัปเกรด Class เดิม)
  const partEnd = () => {
    UI.dlgClose();
    if (!G.fastSim) Sound.play('mvp');
    UI.splash(null, L('จบภาคที่ 1 — ใบแรก', 'End of Part I — The First Leaf'), L('ภาคที่ 2 — กิ่งที่เหลือ (เร็ว ๆ นี้) • IRON VALHALLA', 'Part II — The Remaining Branches (Coming Soon) • IRON VALHALLA'), 'upgrade');
    UI.msg(L('📖 จบภาคที่ 1 — ใบแรก • ต้นไม้งอกประกายใหม่อีกดวงทางเหนือ... ภาคที่ 2 เร็ว ๆ นี้', '📖 End of Part I — The First Leaf • The Tree has grown another new spark in the north... Part II coming soon.'), 'lvl');
    setTimeout(() => { if (G.started) UI.announce(L('ขอบคุณที่เล่นภาคที่ 1 ของ IRON VALHALLA — ใบแรกยังไปต่อ', 'Thank you for playing Part I of IRON VALHALLA — the First Leaf goes on.')); }, 4200);
  };
  // การ์ดเปิดบท 7 (ครั้งแรกที่รับเควสต์แรกของบท)
  const chapterCard = () => {
    if (G.fastSim) return;
    UI.splash(null, L('บทที่ 7 — ผู้แทะราก', 'Chapter 7 — The Gnawer Below'), L('สนิมมีชื่อ • IRON VALHALLA', 'The Rust has a name • IRON VALHALLA'), 'upgrade');
  };
  Story.ch7 = { SCENES, partEnd, chapterCard, core };

  // ---------- Hel ----------
  const helRun = NPC.scripts.hel;
  NPC.scripts.hel = async n => {
    const st = Story.st(), nm = `[${n.name}]`;
    // flag ตั้งหลังฉากจบ: ปิดกล่องกลางฉาก = คุยใหม่แล้วเล่นฉากซ้ำได้
    if (Quest.isDone('ch7_gate') && !st.c7gate) { await SCENES.gate(nm); st.c7gate = 1; saveGame(); return; }
    if (Quest.isDone('ch7_end') && !st.c7end) { await SCENES.end(nm); st.c7end = 1; saveGame(); return; }
    if (Quest.isDone('ch7_end')) {
      await UI.say(nm, by(L('รากที่โคนบัลลังก์โตขึ้นทุกคืน Loki ล้างประกายไปแล้วสิบสองดวง<br>ครึ่งหน้ากากที่ดับของข้า... วันนี้สว่างกว่าเมื่อวานนิดหนึ่ง', 'The roots at the foot of my throne grow every night. Loki has cleaned twelve sparks so far.<br>The dark half of my mask... is a little brighter today than yesterday.'),
        L('Loki ล้างประกายไปแล้วสิบสองดวง ช้า แต่ไม่มีดวงไหนต้องไหม้อีก<br>ถือ Core ไว้ให้มั่นนะ ใบแรก — วันที่ต้นไม้ขอ เจ้าจะรู้เอง', 'Loki has cleaned twelve sparks so far. Slowly — but not one more has had to burn.<br>Hold your Core tightly, First Leaf. On the day the Tree asks, you will know.')));
      return;
    }
    if (Quest.isDone('ch7_gate')) {
      await UI.say(nm, L('ประตูรากอยู่ใน Gnawed Roots ทางตะวันออกของคลัง — ในซุ้มที่ Garmr เคยยืน<br>ข้าได้ยินเสียงแทะทุกคืน... ระวังตัวด้วย ใบแรก', 'The root gate lies in the Gnawed Roots, east of the archive — in the arch where Garmr stood.<br>I hear the gnawing every night... take care, First Leaf.'));
      return;
    }
    return helRun(n);
  };
  // ---------- Loki (ปากทางลง Nidhogg's Hollow) ----------
  NPC.scripts.loki = async n => {
    const st = Story.st(), nm = `[${n.name}]`;
    if (Quest.isDone('ch7_loki') && !st.c7loki) { await SCENES.loki(nm); st.c7loki = 1; saveGame(); return; }
    const line = !Quest.isDone('ch7_shell') ? L('(วิเซอร์สีเหลืองอุ่นกะพริบเขียวเสี้ยววินาที) ข้า? แค่พ่อค้าเร่ที่หลงทาง<br>ไปดูโครงร่างกลวงพวกนั้นก่อนเถิด แล้วค่อยกลับมาคุยกัน', '(The warm yellow visor flickers green for a split second.) Me? Just a peddler who lost his way.<br>Go and look at those hollow frames first. Then we will talk.')
      : Quest.isDone('ch7_nidhogg') ? L('เสียงแทะหยุดแล้ว... ข้ายืนเฝ้าทางลงนี้มาสามสิบปี ไม่คิดว่าจะได้ยินความเงียบ<br>ขึ้นไปหาเธอเถิด ข้าตามไป', 'The gnawing has stopped... Thirty years I have watched this way down; I never thought I would hear silence.<br>Go up to her. I will follow.')
      : L('มันมีสามท่าที่เจ้าต้องจำ: ลมหายใจสนิมเป็นกรวยข้างหน้า ตาข่ายรากเป็นแถบขนาน — ยืนในช่อง<br>และเมื่อมันมุดลงราก แนวรากจะพุ่งตรงมาหาเจ้า ก้าวออกด้านข้าง อย่าถอยตรง ๆ', 'Three things to remember: its rust breath is a cone ahead of it; the root lattice is parallel strips — stand in a gap.<br>And when it burrows, a trail races straight at you — step aside. Do not back away in a straight line.');
    const c = await UI.menu(nm, line, [L('ของจากพ่อค้าเร่', "The peddler's wares"), L('ลาก่อน', 'Farewell')]);
    if (c === 0) UI.openShop('Loki', ['white_potion', 'blue_potion', 'green_herb', 'yellow_potion'].filter(id => ITEMS[id]));
  };
  // ---------- Mimir: ฉากจบภาค 1 (ห่อสคริปต์เดิม) ----------
  const mimirRun = NPC.scripts.jobmaster;
  NPC.scripts.jobmaster = async n => {
    const st = Story.st();
    if (Quest.isDone('ch7_home') && !st.c7home) { await SCENES.home(`[${n.name}]`); st.c7home = 1; saveGame(); partEnd(); return; }
    return mimirRun(n);
  };
  // การ์ดเปิดบท: เควสต์ ch6_mimir สำเร็จ (ได้ชื่อ Nidhogg) → ขึ้นบทที่ 7 หลังปิดกล่องบทสนทนาของ Mimir
  const complete0 = Quest.complete;
  let cardDue = false;
  Quest.complete = function (q) {
    complete0.call(this, q);
    if (q && q.id === 'ch6_mimir') cardDue = true;
  };
  if (typeof setInterval !== 'undefined') setInterval(() => {
    if (!cardDue || typeof G === 'undefined' || !G.started || NPC.busy) return;
    cardDue = false; chapterCard();
  }, 600);
})();
