'use strict';
// ============================================================
//  แพ็กเนื้อหาโลก (World Pack) — "ใส่รายละเอียดเกมไปเยอะ ๆ" (เจ้าของ 2026-10-03)
//  ทุกอย่างในไฟล์นี้เป็นของเสริม ไม่บังคับ ไม่ล็อกการเดินทาง (docs/STORY.md §9–10, docs/DESIGN_CUSTOM_PLAY.md "อิสระเป็นของผู้เล่น")
//  1) เควสต์เสริม 22 อัน (SIDE_EXTRA ใน js/quest.js — ระบบ Side เดิม: รับ/ส่งกับ NPC แสดงในหน้าต่างเควสต์)
//     ขั้นใหม่ 2 แบบ: visit (ไปตรวจดูจุดตำนาน) • lore (ค้นพบตำนานครบ N เรื่อง)
//  2) ชีวิต NPC: บทพูดหมุนเวียน (idle) + บทตามบทเนื้อเรื่อง ของ NPC ทุกตัว — ฟองคำพูดเหนือหัวเมื่อเดินใกล้ (bark)
//     (ปิดได้ในตั้งค่า) • NPC ใหม่ 6 ตัว (ใช้ภาพเดิมย้อมสี ไม่ต้องวาดใหม่)
//  3) จุดตำนาน 23 จุด (หินรูน ซากร่าง ศาลเจ้า สมุดบันทึก) — ตรวจดูแล้วบันทึกลง Codex (แท็บ Lore ในสมุดเควสต์)
//     เซฟใน p.lore = { v: 1, found: { [id]: เวลา } } (ฟิลด์ใหม่ใน SAVE_FIELDS — เซฟเก่าไม่มี = ว่าง)
//  4) Elite หายาก 1 ตัวต่อทุ่ง (Meadow / Mistlake / Wolfwood): เกิดเป็นครั้งคราว (ไม่อยู่ในตาราง spawns → ไม่กระทบบอร์ดค่าหัว/ภารกิจรายวัน/ตารางดรอปของแมพ)
//     EXP ต่อ HP เท่ามอนต้นแบบ (เลือด ×6 EXP ×6) + ของเฉพาะตัว 1 ชิ้นระดับ uncommon ตามเลเวลแมพ
//  ลำดับโหลด: หลัง js/story_hooks.js (ห่อสคริปต์ NPC ชั้นนอกสุด) ก่อน js/main.js
//  ห้ามเปลี่ยน id ในไฟล์นี้หลังปล่อยแล้ว (เซฟอ้างอิง: เควสต์ w_* / จุดตำนาน lr_* / ไอเทม / มอน elite_*)
// ============================================================
const WorldPack = (() => {
  const W = {};
  const vis = () => typeof G !== 'undefined' && !G.fastSim && typeof document !== 'undefined';
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ===================== ตัวช่วย (สูตรเดียวกับ js/content_ch7.js) =====================
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
  const ICON_OF = { armor: 'armor', head: 'hat', shield: 'shield', garment: 'cloth', shoes: 'shoes', acc: 'ring' };
  const PRICE = { uncommon: lv => 150 + lv * 100, rare: lv => 1000 + lv * 400 };
  const statText = b => b ? Object.entries(b).filter(([k]) => PSTAT[k]).map(([k, v]) => PSTAT_FMT(k, v)).join(' ') : '';
  const statTextEn = b => b ? Object.entries(b).filter(([k]) => PSTAT[k]).map(([k, v]) => {
    const pct = /Pct$|^leech$|^stunRes$|^rage$|^venom$/.test(k), sg = v > 0 ? '+' : '', n = EN(PSTAT[k]); return pct ? `${sg}${v}${n}` : `${n} ${sg}${v}`; }).join(' ') : '';
  const eq = (id, name, kind, lv, rarity, s, th, en) => {
    const b = s.b || null;
    const it = { id, name, type: 'armor', slot: kind, rarity, lv, price: s.price || PRICE[rarity](lv), slots: s.slots || 0, jobs: 'all', icon: { s: ICON_OF[kind], c: s.c } };
    if (s.def) it.def = s.def; if (s.mdef) it.mdef = s.mdef;
    if (b) it.b = b;
    const st = statText(b);
    it.desc = L(th, en) + (st ? ' ' + st : '');
    if (st && LANG !== 'en') L_EN.set(it.desc, en + ' ' + statTextEn(b));
    if (s.quest) it.quest = true;
    ITEMS[id] = it;
    if (s.art) Art.alias('item_' + id, 'item_' + s.art, { hue: s.hue || 0, sat: 1.1, tint: [s.c, 0.42] });
  };

  // ===================== ไอเทมใหม่ (น้อยและไม่แรงเกินเส้น) =====================
  // รางวัลเควสต์ Codex 15 เรื่อง (ไม่ดรอป) — เบากว่า Badge of the First Leaf
  eq('lorekeeper_quill', "Lorekeeper's Quill", 'acc', 1, 'rare', { price: 2, quest: true, b: { int: 1, dex: 1, sp: 30 }, c: '#c8a0ff', art: 'clip' },
    'ปากกาของ Saga ใช้เขียนชื่อคนที่ไม่มีใครจำ หมึกเป็นน้ำเลี้ยงที่ยังเรืองแสง', 'Saga\'s quill, used to write down the names no one remembers. Its ink is sap that still glows.');
  // ของเฉพาะตัวของ Elite (uncommon ระดับเดียวกับของในแมพนั้น)
  eq('moonlit_ears', 'Moonlit Ears', 'head', 5, 'uncommon', { def: 2, b: { luk: 2, flee: 2 }, c: '#f0e6a0', art: 'ribbon' },
    'หูกระต่ายตาข่ายเงินที่เรืองแสงจันทร์ หัวหน้าคนสวนใส่ไว้เพื่อให้ลูกน้องเห็นในความมืด', 'Silver-mesh bunny ears that glow like moonlight — the head gardener wore them so its crew could see it in the dark.');
  eq('captain_crest', 'Sentry Captain Crest', 'acc', 14, 'uncommon', { b: { vit: 1, def: 1, hp: 60 }, c: '#d08040', art: 'ring' },
    'ตราหัวหน้ายามที่สนิมกินครึ่งหนึ่ง อีกครึ่งยังขัดเงาทุกคืน', 'A sentry captain\'s crest, half eaten by rust — the other half still polished every night.');
  eq('alpha_mantle', 'Alpha Pelt Mantle', 'garment', 28, 'uncommon', { def: 2, slots: 1, b: { agi: 2, flee: 3 }, c: '#c8d8f0', art: 'muffler' },
    'ผ้าคลุมจากขนโลหะของหัวฝูง Fenrir ใส่แล้วหมาป่าตัวอื่นหันมามอง', 'A mantle of the Fenrir alpha\'s metal fur. Other wolves turn to look when you wear it.');

  // ===================== Elite หายาก (1 ตัวต่อทุ่ง) =====================
  // เลือด ×6 EXP ×6 (EXP ต่อ HP เท่าต้นแบบ) ATK ×1.4 • ไม่ตีก่อน • ดรอป 6 อย่าง: ของต้นแบบ + ของเฉพาะตัว 8%
  const elite = (id, base, def) => {
    const b = MOBS[base];
    MOBS[id] = variant(base, Object.assign({ lv: b.lv + def.lvAdd, hp: b.hp * 6, atk: b.atk.map(v => Math.round(v * 1.4)), def: (b.def || 0) + 4, mdef: (b.mdef || 0) + 4,
      vit: b.vit + 4, flee: b.flee + 6, hit: b.hit + 6, exp: b.exp * 6, jexp: b.jexp * 6, speed: b.speed, aggro: false, element: b.element, race: b.race,
      scale: (b.scale || 1) * 1.3, elite: true }, def));
    delete MOBS[id].lvAdd;
    MOBS[id].id = id;
  };
  elite('elite_moonbun', 'moonbun', { name: 'Moonlit Bunny Unit', lvAdd: 4, hue: 40, sat: 1.2, bri: 1.1, tint: ['#f0e6a0', 0.3],
    lore: L('Bunny Unit ที่เก็บเมล็ดได้มากที่สุดในทุ่ง ตาข่ายเงินเรืองแสงตอนกลางคืน — มันเชื่อว่าตัวเองคือหัวหน้าคนสวน', 'The Bunny Unit that has gathered more seeds than any other. Its silver mesh glows at night — it believes it is the head gardener.'),
    drops: [['moon_fur', 1], ['clover', 0.6], ['carrot', 0.5], ['blink_feather', 0.25], ['orange_potion', 0.15], ['moonlit_ears', 0.08]] });
  elite('elite_sentry', 'stumpling', { name: 'Sentry Captain', lvAdd: 6, hue: -20, sat: 1.3, bri: 0.95, tint: ['#c05020', 0.3],
    lore: L('หัวหน้ายาม Rust Sentry ยังเดินตรวจแถวลูกน้องทุกคืน สนิมกินถึงแกนแล้ว แต่มันยังขานชื่อครบทุกตัว', 'The captain of the Rust Sentries still inspects its squad every night. Rust has reached its core, yet it still calls every name in full.'),
    drops: [['living_bark', 1], ['frayed_cable', 0.6], ['orange_potion', 0.3], ['yellow_potion', 0.1], ['sentry_plate', 0.01], ['captain_crest', 0.08]] });
  elite('elite_alpha', 'fenrir_pup', { name: 'Fenrir Alpha Unit', lvAdd: 5, hue: 190, sat: 0.6, bri: 1.15, tint: ['#c8d8f0', 0.35],
    lore: L('เศษที่ใหญ่ที่สุดของ Fenrir หัวฝูงที่ยังจำคำสั่งล่าแรกได้ — ไม่ไล่เจ้าก่อน แต่ถ้าเจ้าท้า มันไม่ถอย', 'The largest shard of Fenrir, a pack leader that still remembers the first order to hunt. It will not chase you — but challenge it, and it will not back down.'),
    drops: [['fenrir_fang', 1], ['meat', 0.6], ['rune_alloy', 0.08], ['yellow_potion', 0.2], ['wolfpelt_cloak', 0.01], ['alpha_mantle', 0.08]] });

  const Elite = W.Elite = {
    MAPS: { meadow: 'elite_moonbun', mistlake: 'elite_sentry', wolfwood: 'elite_alpha' },
    FIRST: [90, 240], AFTER: [480, 780], // วินาทีเกม: ครั้งแรกหลังเข้าแมพ / หลังล้ม
    next: {},
    isElite(id) { return Object.values(this.MAPS).includes(id); },
    tick() {
      if (!G.started || !G.map || G.fastSim || G.map.def.pvp) return;
      const map = G.map.id, id = this.MAPS[map]; if (!id || !MOBS[id]) return;
      if (G.mobs.some(m => m.def.id === id && !m.dead)) return;
      if (this.next[map] == null || this.next[map] === Infinity) this.next[map] = G.time + rnd(...(this.next[map] === Infinity ? [60, 150] : this.FIRST));
      if (G.time >= this.next[map]) this.spawn(map);
    },
    spawn(map = G.map.id) {
      const id = this.MAPS[map]; if (!id || !G.map || G.map.id !== map) return null;
      const m = spawnMob(id); m.elite = true;
      m.speech = { text: `★ ${MOBS[id].name}`, until: G.time + 4 };
      this.next[map] = Infinity;
      UI.msg(L(`📖 มีข่าวลือว่า ${MOBS[id].name} (Elite หายาก) ปรากฏตัวที่ ${MAP_DEFS[map].name}!`, `📖 Rumor has it a rare Elite, ${MOBS[id].name}, has appeared in ${MAP_DEFS[map].name}!`), 'map');
      return m;
    },
    onKill(m) {
      const id = m && m.def && m.def.id; if (!this.isElite(id)) return;
      for (let i = G.respawns.length - 1; i >= 0; i--) if (G.respawns[i].id === id) G.respawns.splice(i, 1); // ไม่เกิดใหม่แบบมอนปกติ
      if (G.map) this.next[G.map.id] = G.time + rnd(...this.AFTER);
      UI.msg(L(`📖 ${m.def.name} ล้มลงแล้ว — ข่าวลือจะเงียบไปพักใหญ่`, `📖 ${m.def.name} has fallen — the rumors will quiet down for a while.`), 'map');
    },
  };
  {
    const kill0 = killMob;
    killMob = function (m) { // eslint-disable-line no-global-assign
      const was = !!(m && m.dead);
      const r = kill0.apply(this, arguments);
      if (!was && m && !m.minion) { try { Elite.onKill(m); } catch (e) { console.error(e); } }
      return r;
    };
  }

  // ===================== จุดตำนาน (Lore points) =====================
  // แต่ละจุดเป็น NPC ที่วาดเป็นของประกอบฉาก (ภาพ prop_* เดิม ย้อมสี) — คุย (Space/แตะ) = ตรวจดู
  // art: [ภาพ prop, ความสูงที่วาด px, สเปกย้อมสี] • ตำแหน่งเลือกบนช่องเดินได้ 3×3 ไม่ใกล้ต้นไม้/วาร์ป (ไม่เปลี่ยนผังช่อง → ภาพอบ 3D ใช้ได้เหมือนเดิม)
  const PYLON = 'pylon', SIGN = 'sign', SCRAP = 'scrap', CRYSTAL = 'crystal', ROCK = 'rock', CRATE = 'crate', LAMP = 'lamp', SHROOM = 'mushroom';
  const LORE = W.LORE = [
    // ---- Neo Eldheim ----
    { id: 'lr_e_six', map: 'eldheim', x: 4, y: 31, name: 'Wall of Six', art: [PYLON, 70, { hue: 160, sat: 0.7, tint: ['#e0b060', 0.35] }],
      title: L('กำแพงของหกวีรชน', 'The Wall of Six'),
      text: [L('แผ่นโลหะบนกำแพงเก่า ไม่มีชื่อสลักไว้ มีแต่รอยมือหกรอย — ทุกรอยหันออกนอกเมือง<br>ชาวเมืองเล่าว่าหกหน่วยนี้ยืนรักษากำแพงจนรุ่งเช้าในคืนที่กิ่งหัก', 'A metal plate on the old wall. No names are carved here — only six handprints, every one facing out of the city.<br>The townsfolk say these six held the wall until dawn on the night the branches broke.'),
        L('ทั้งหกล้มลงนอกรัศมีราก และไม่มีใครกลับมา<br>แต่ทุกครั้งที่มีคนรับแม่พิมพ์จาก Mimir รอยมือรอยหนึ่งจะอุ่นขึ้นนิดหนึ่ง', 'All six fell beyond the roots\' reach, and none came back.<br>Yet whenever someone receives a mold from Mimir, one of the handprints grows a little warm.')] },
    { id: 'lr_e_root', map: 'eldheim', x: 26, y: 31, name: 'Great Root Vent', art: [PYLON, 66, { hue: 0, sat: 1.1 }],
      title: L('ช่องระบายของรากใหญ่', 'The Great Root Vent'),
      text: [L('ท่อทองเหลืองโผล่จากพื้นข้างคลอง มีเสียงฮัมต่ำ ๆ ไม่เคยหยุด<br>นี่คือรากใหญ่ใต้นีโอเอลด์ไฮม์ — น้ำเลี้ยงยังไหล เมืองจึงยังมีใบไม้มารับประกาย', 'A brass pipe rises beside the canal, humming low and never stopping.<br>This is the great root beneath Neo Eldheim — its sap still flows, so the leaves still come for fallen sparks here.'),
        L('มีคนผูกริบบิ้นแดงเล็ก ๆ ไว้ที่ท่อนับร้อยเส้น<br>หนึ่งเส้นต่อหนึ่งคนที่ล้มลงนอกเมืองแล้วไม่กลับมา — เส้นล่าสุดยังสีสดอยู่', 'Hundreds of little red ribbons are tied around the pipe.<br>One for each unit who fell outside the city and never came back — the newest is still bright.')] },
    // ---- Emerald Meadow ----
    { id: 'lr_m_sprinkler', map: 'meadow', x: 30, y: 26, name: 'Old Sprinkler Pylon', art: [PYLON, 64, { hue: -60, sat: 0.9 }],
      title: L('เสาพ่นน้ำเก่า', 'Old Sprinkler Pylon'),
      text: [L('จอเล็ก ๆ บนเสายังกะพริบ: "รอบรดน้ำถัดไป — ล่าช้า 10,957 วัน"<br>คนสวนของต้นไม้ยังทำตามตารางเดิม รดน้ำให้แปลงผักที่ไม่มีอยู่แล้ว', 'A tiny screen on the pylon still blinks: "NEXT WATERING — 10,957 DAYS OVERDUE."<br>The Tree\'s gardeners keep the old schedule, watering beds that no longer exist.'),
        L('ใต้จอมีรอยขีดด้วยมือ: "อย่าปิดมัน — Ember Unit จะร้อนเกิน"<br>ลายมือกลม ๆ เหมือนเด็ก ทั้งที่เมืองนี้ไม่มีใครเกิดใหม่มานานแล้ว', 'Scratched by hand beneath the screen: "DON\'T TURN IT OFF — THE EMBER UNITS OVERHEAT."<br>The writing is round, like a child\'s — though no one here has been born in a very long time.')] },
    { id: 'lr_m_wreck', map: 'meadow', x: 66, y: 14, name: 'Scout Unit Wreck', art: [SCRAP, 46, { sat: 0.9 }],
      title: L('ซากหน่วยสอดแนม', 'Scout Unit Wreck'),
      text: [L('ซากหน่วยสอดแนมรุ่นเก่า หญ้าขึ้นทะลุข้อต่อทุกข้อ<br>ป้ายที่อกยังอ่านออก: "หน่วยที่ 3 — ลาดตระเวนตะวันออก คืนก่อน Ragnarök"', 'The wreck of an old scout unit, grass grown through every joint.<br>The plate on its chest still reads: "UNIT 3 — EAST PATROL, THE NIGHT BEFORE RAGNARÖK."'),
        L('มันล้มลงไกลเกินกว่าใบไม้จะมาถึง ประกายของมันไม่เคยกลับ<br>แต่มีคนมาวางดอกโคลเวอร์ไว้บนมือของมันทุกฤดู — ดอกล่าสุดยังสด', 'It fell too far for the leaves to reach; its spark never returned.<br>Yet someone lays a clover in its hand every season — the latest one is still fresh.')] },
    { id: 'lr_m_seed', map: 'meadow', x: 63, y: 54, name: 'Seed Cache', art: [CRATE, 48, { hue: 70, sat: 0.8, tint: ['#7aa040', 0.25] }],
      title: L('กล่องเก็บเมล็ด', 'The Seed Cache'),
      text: [L('Bunny Unit ขนเมล็ดมาเก็บในกล่องนี้มาสามสิบปี จนฝาปิดไม่ลง<br>ไม่มีเมล็ดไหนงอก — ดินในทุ่งจำวิธีปลูกไม่ได้อีกแล้ว', 'For thirty years the Bunny Units have hauled seeds into this cache, until the lid no longer closes.<br>Not one has sprouted — the meadow\'s soil has forgotten how.'),
        L('...ยกเว้นเมล็ดเดียวที่มุมกล่อง มีใบอ่อนสีเขียวเรืองแสงโผล่ออกมา<br>มันงอกในวันเดียวกับที่วิเซอร์ของเจ้าสว่างขึ้นครั้งแรก', '...except one, in the corner, where a single glowing green shoot has broken through.<br>It sprouted on the very day your visor first lit up.')] },
    // ---- Mistlake Plains ----
    { id: 'lr_l_perch', map: 'mistlake', x: 30, y: 30, name: "Envoy's Perch", art: [PYLON, 74, { hue: 180, sat: 0.4, bri: 1.15, tint: ['#fff0c0', 0.3] }],
      title: L('คอนพักของทูต', "The Envoy's Perch"),
      text: [L('เสาสูงกลางที่ราบ ยอดสึกเป็นร่องเหมือนมีอะไรเกาะทุกคืน<br>ฐานเสาสลักรูปนกกาสองตัว — ตราของ Odin', 'A tall pillar in the plains, its tip worn smooth as if something perches there every night.<br>Two ravens are carved into its base — the mark of Odin.'),
        L('Seraph Core กลับมาพักที่นี่ทุกคืนตลอดหลายสิบปี รอคนที่ยืนยันตัวตนได้<br>บนเสามีจารึกเล็ก ๆ: "ข้อความต้องถึงมือ — แม้ผู้ส่งจะไม่อยู่แล้ว"', 'For decades Seraph Core returned here each night, waiting for someone it could verify.<br>A small inscription runs up the pillar: "THE MESSAGE MUST ARRIVE — EVEN IF THE SENDER IS GONE."')] },
    { id: 'lr_l_journal', map: 'mistlake', x: 58, y: 21, name: "Ylva's Field Journal", art: [SIGN, 64, { hue: 20, sat: 0.9 }],
      title: L('บันทึกภาคสนามของ Ylva', "Ylva's Field Journal"),
      text: [L('สมุดบันทึกปักไว้บนเสาริมทะเลสาบ หน้าสุดท้ายเขียนว่า:<br>"วันที่ 19 — Hopper Unit เหยียบบีคอนข้าแตก ข้าจะตามมันเข้าไปในหมอก"', 'A journal pinned to a post by the lake. The last page reads:<br>"Day 19 — a Hopper Unit stomped my beacon to pieces. I\'m following it into the mist."'),
        L('"ถ้าข้าล้มลง ใบไม้คงพาข้ากลับเมือง แต่ข้าคงจำหน้านี้ไม่ได้<br>ใครเจอสมุดเล่มนี้ ช่วยบอกข้าทีว่าข้าเคยมาถึงที่นี่" — Ylva หน่วยสอดแนม', '"If I fall, the leaves will carry me home — but I won\'t remember this page.<br>Whoever finds this: tell me I made it this far." — Ylva, Scout Unit')] },
    { id: 'lr_l_shrine', map: 'mistlake', x: 69, y: 59, name: 'Mist Shrine', art: [CRYSTAL, 58, { hue: -80, sat: 0.9, bri: 1.1 }],
      title: L('ศาลเจ้าในหมอก', 'The Mist Shrine'),
      text: [L('ผลึกสีฟ้าขึ้นกลางมอส มีรูนแสงจาง ๆ ฝังอยู่ข้างใน<br>นักพยากรณ์แห่งแสงเคยมานั่งที่นี่ ฟังเสียง Odin ผ่านหมอก', 'A pale blue crystal rises from the moss, a faint rune of light sealed within.<br>The Völvas of old came here to listen for Odin\'s voice through the mist.'),
        L('รูนข้างในเขียนว่า "ฟื้นฟู" ในภาษาแรกที่ผู้สร้างสอนต้นไม้<br>เมื่อเจ้าแตะ ผลึกอุ่นขึ้น — เหมือนยังรอใครสักคนตอบกลับ', 'The rune within reads "restore," in the first tongue the Builders taught the Tree.<br>At your touch the crystal grows warm — as if still waiting for someone to answer.')] },
    // ---- Wolfwood Forest ----
    { id: 'lr_w_chain', map: 'wolfwood', x: 22, y: 47, name: 'Broken Gleipnir Link', art: [SCRAP, 44, { hue: 200, sat: 0.35, bri: 1.25, tint: ['#c8d8ff', 0.35] }],
      title: L('ข้อโซ่ Gleipnir ที่ขาด', 'A Broken Link of Gleipnir'),
      text: [L('ข้อโซ่ใหญ่เท่าล้อเกวียนจมอยู่ในดิน ผิวยังเงา ไม่มีสนิมสักจุด<br>ด้านในประทับตราค้อนเล็ก ๆ — ตราของ Brokk', 'A chain link as big as a cart wheel lies sunk in the earth, still bright, without a fleck of rust.<br>A small hammer mark is stamped inside — Brokk\'s mark.'),
        L('ข้อนี้ไม่ได้ขาดเพราะแรงดึง มันถูกปลดอย่างประณีต — ตามคำสั่ง<br>รอบ ๆ มีรอยเท้าหมาป่าเป็นวงกลม เหมือนพวกมันกลับมาดมทุกคืน', 'This link did not snap under strain. It was unlocked, carefully — on orders.<br>Wolf tracks circle all around it, as if they come back to sniff it every night.')] },
    { id: 'lr_w_den', map: 'wolfwood', x: 50, y: 64, name: "Wildhunter's Den", art: [ROCK, 52, { sat: 0.8, bri: 0.9 }],
      title: L('รังของนักล่า', "The Wildhunter's Den"),
      text: [L('ใต้หินใหญ่มีโพรงปูด้วยหนังหมาป่าเก่า มีเสียงหายใจเบา ๆ... ไม่สิ แค่ลม<br>ผนังหินมีรอยขีดสองชุด ชุดหนึ่งเป็นมือ อีกชุดเป็นอุ้งเท้า', 'Beneath a great rock lies a hollow lined with old wolf pelts. Soft breathing... no — only the wind.<br>Two sets of scratches mark the stone: one of hands, one of paws.'),
        L('ที่นี่นักล่าคนหนึ่งปลดโซ่ให้หมาป่าตัวเดียว ก่อน Fenrir จะแตกกระจาย<br>หมาป่าตัวเดียวที่เลือกเชื่อใครสักคน — แม่พิมพ์ Wildhunter ยังจำกลิ่นมันได้', 'Here a hunter unchained a single wolf, before Fenrir broke apart.<br>The only wolf that ever chose to trust someone — the Wildhunter mold still remembers its scent.')] },
    { id: 'lr_w_burn', map: 'wolfwood', x: 33, y: 84, name: 'Scorched Rune Stone', art: [ROCK, 50, { sat: 0.5, bri: 0.55, tint: ['#5a2a10', 0.35] }],
      title: L('หินรูนไหม้เกรียม', 'The Scorched Rune Stone'),
      text: [L('หินรูนบอกทางถูกเผาจนดำ รอยไหม้ยาวเป็นแนวเดียวชี้ลงใต้<br>ไฟธรรมดาไม่เผาหินจนละลายเป็นแก้วแบบนี้', 'A waystone scorched black, one long burn-streak pointing south.<br>No ordinary fire melts stone into glass like this.'),
        L('ใต้รอยไหม้ยังอ่านรูนเดิมออก: "ทางลงโพรง — ห้ามผ่านหลังพลบค่ำ"<br>ใครบางคนขีดเพิ่มไว้ข้างใต้ด้วยกรงเล็บไฟ: "เก้าหาง"', 'Beneath the scorch the old rune is still legible: "WAY TO THE HOLLOW — DO NOT PASS AFTER DUSK."<br>Someone has added below, in claws of fire: "NINE TAILS."')] },
    // ---- Hel's Hollow ----
    { id: 'lr_h_shelf', map: 'helcave', x: 20, y: 20, name: 'Unvisited Shelf', art: [CRYSTAL, 58, { hue: -150, sat: 0.8, bri: 1.1 }],
      title: L('ชั้นวางที่ไม่มีใครมาเยี่ยม', 'The Unvisited Shelf'),
      text: [L('ชั้นวางประกายหลังหนึ่งตั้งแยกจากที่เหลือ ไม่มีฝุ่นสักนิด<br>ป้ายชื่อทุกช่องว่างเปล่า แต่ประกายข้างในยังส่องแสงเบา ๆ', 'One spark shelf stands apart from the rest, without a speck of dust.<br>Every nameplate is blank, yet the sparks inside still glow softly.'),
        L('Hel Maiden ปัดฝุ่นชั้นนี้ทุกวัน ทั้งที่ไม่มีใครรู้ว่าประกายเป็นของใคร<br>"ถ้าไม่มีใครจำชื่อพวกเขาได้ อย่างน้อยต้องมีคนจำว่าพวกเขาอยู่ที่นี่"', 'The Hel Maidens dust this shelf every day, though no one knows whose sparks these are.<br>"If no one remembers their names, someone must at least remember that they are here."')] },
    { id: 'lr_h_lantern', map: 'helcave', x: 55, y: 55, name: "Maidens' Lantern Post", art: [LAMP, 72, { hue: -40, sat: 0.9 }],
      title: L('เสาตะเกียงของสาวใช้', "The Maidens' Lantern Post"),
      text: [L('เสาที่ Hel Maiden แขวนตะเกียงไว้ให้ประกายที่หลงทาง<br>ใบไม้ไม่ลงมาถึงโพรง ตะเกียงจึงเป็นสิ่งเดียวที่บอกว่า "ทางนี้"', 'A post where the Hel Maidens hang lamps for sparks that have lost their way.<br>No leaves come down to the Hollow — these lamps are the only thing that says "this way."'),
        L('ตะเกียงดวงหนึ่งไหม้ดำ — ตั้งแต่คืนที่ไฟของ Kitsura ผ่านมา<br>ไม่มีใครถอดมันออก สาวใช้แค่แขวนดวงใหม่ไว้ข้าง ๆ', 'One lamp is scorched black — ever since the night Kitsura\'s fire passed through.<br>No one has taken it down. The maidens simply hung a new one beside it.')] },
    { id: 'lr_h_cradle', map: 'helcave', x: 18, y: 58, name: 'Empty Frame Cradle', art: [SCRAP, 46, { hue: 140, sat: 0.6, tint: ['#60c0a0', 0.25] }],
      title: L('แท่นร่างที่ว่างเปล่า', 'The Empty Frame Cradle'),
      text: [L('แท่นประกอบร่างเศษเหล็ก ร่างที่ค้างอยู่บนแท่นไม่มีประกายข้างใน<br>ที่นี่ Hel ยัดประกายที่เก็บเกี่ยวมาลงร่างที่ไม่พอดี — Draugr ทุกตัวเริ่มที่แท่นนี้', 'A cradle for assembling scrap frames; the frame left on it holds no spark.<br>Here Hel pressed harvested sparks into frames that never fit — every Draugr began on this cradle.'),
        L('ข้างแท่นมีกองเศษเหล็กที่ถูกแยกออกอย่างระมัดระวัง ทีละชิ้น<br>Hel เลิกใช้แท่นนี้แล้ว — ตั้งแต่ผิวดินส่งข่าวมาว่ายังไม่ล่ม', 'Beside it, scrap has been taken apart with care, piece by piece.<br>Hel no longer uses this cradle — not since the surface sent word that it had not fallen.')] },
    // ---- Archive Depths ----
    { id: 'lr_a_index', map: 'archive', x: 20, y: 50, name: 'Spark Index Pillar', art: [PYLON, 74, { hue: 170, sat: 0.9, tint: ['#ffcf5a', 0.35] }],
      title: L('เสาดัชนีประกาย', 'The Spark Index Pillar'),
      text: [L('เสาดัชนีของคลังประกาย ทุกบรรทัดคือหนึ่งชื่อกับหนึ่งช่องวาง<br>รายชื่อยาวลงไปจนมองไม่เห็นปลาย — ทุกคนในไอรอนวัลฮัลลาอยู่ในนี้', 'The index of the spark archive — every line a name and a shelf.<br>The list runs down farther than you can see. Everyone in Iron Valhalla is in here.'),
        L('...ยกเว้นบรรทัดล่าสุด ไม่มีชื่อ ไม่มีช่องวาง มีแต่ตราใบไม้เรืองแสง<br>ลายมือของ Mimir เขียนไว้ข้าง ๆ: "ยังไม่บันทึก — ให้เขาเลือกชื่อเอง"', '...except the newest line: no name, no shelf, only a glowing leaf mark.<br>Beside it, in Mimir\'s hand: "NOT YET RECORDED — LET THEM CHOOSE THE NAME."')] },
    { id: 'lr_a_seal', map: 'archive', x: 49, y: 71, name: 'Cracked Archive Seal', art: [CRYSTAL, 54, { hue: 140, sat: 0.9, tint: ['#ffcf5a', 0.45] }],
      title: L('ตราผนึกที่ร้าว', 'The Cracked Archive Seal'),
      text: [L('ตราผนึกทองบนพื้นคลังร้าวเป็นทางยาว สีสนิมซึมขึ้นจากรอยร้าว<br>ตรานี้กันไม่ให้ชั้นล่างสุดรั่วขึ้นมา — และมันกำลังแพ้', 'A golden seal on the archive floor, split by a long crack with rust seeping up through it.<br>This seal keeps the lowest level from leaking upward — and it is losing.'),
        L('มีคนปะรอยร้าวด้วยเทปซ่อมหลายชั้น ทุกแผ่นเขียนว่า "ชั่วคราว"<br>เทปแผ่นในสุดเก่าราวสามสิบปี', 'Someone has patched the crack with layer upon layer of repair tape, each strip marked "TEMPORARY."<br>The innermost strip is about thirty years old.')] },
    { id: 'lr_a_ledger', map: 'archive', x: 29, y: 79, name: 'Rusted Ledger', art: [SIGN, 62, { hue: -20, sat: 0.6, tint: ['#b0602a', 0.4] }],
      title: L('สมุดบัญชีขึ้นสนิม', 'The Rusted Ledger'),
      text: [L('สมุดบัญชีของผู้ดูแลชั้นวาง หน้าโลหะขึ้นสนิมจนติดกัน<br>บรรทัดที่ยังอ่านได้นับจำนวนประกายที่ "เปลี่ยนสี" ในแต่ละคืน', 'A shelf-keeper\'s ledger, its metal pages rusted together.<br>The lines that remain count how many sparks "changed color" each night.'),
        L('ตัวเลขเพิ่มขึ้นทุกคืน ช้า ๆ ไม่เคยลด — จนถึงหน้าสุดท้าย:<br>"คืนนี้ได้ยินเสียงแทะใต้พื้น ข้าจะลงไปดู" — ไม่มีหน้าถัดไป', 'The numbers rise every night, slowly, never falling — until the last page:<br>"Heard gnawing beneath the floor tonight. Going down to look." There is no next page.')] },
    // ---- Gnawed Roots ----
    { id: 'lr_r_gnaw', map: 'roots', x: 17, y: 17, name: 'Gnaw-Scarred Root', art: [ROCK, 54, { hue: 10, sat: 1.1, bri: 0.8, tint: ['#a8461a', 0.4] }],
      title: L('รากที่มีรอยแทะ', 'The Gnaw-Scarred Root'),
      text: [L('รากหนาเท่าหอคอยถูกแทะเป็นร่องลึก รอยฟันแต่ละรอยกว้างกว่าตัวเจ้า<br>น้ำเลี้ยงสีทองที่ไหลออกมาแข็งตัวเป็นหยดอำพัน', 'A root as thick as a tower, gnawed into deep furrows — each tooth mark wider than you are.<br>The golden sap that bled from it has hardened into amber.'),
        L('รอยแทะไม่ได้ไปทางเดียว มันวนรอบราก เหมือนสิ่งที่แทะกำลังหาอะไรข้างใน<br>มันไม่ได้หิวน้ำเลี้ยง... มันตามหาประกาย', 'The marks don\'t run one way; they circle the root, as if whatever gnawed it was searching inside.<br>It was not hungry for sap... it was hunting for sparks.')] },
    { id: 'lr_r_post', map: 'roots', x: 68, y: 28, name: "Garmr's Chain Post", art: [PYLON, 70, { hue: 150, sat: 0.6, bri: 0.85, tint: ['#8a2a10', 0.45] }],
      title: L('เสาล่ามของ Garmr', "Garmr's Chain Post"),
      text: [L('เสาเหล็กปักลึกในราก มีโซ่ขาดห้อยอยู่ ปลอกคอปลายโซ่ใหญ่เท่าประตู<br>Hel ล่าม Garmr ไว้ที่นี่ กันเสียงแทะไม่ให้ขึ้นไปถึงคลัง', 'An iron post driven deep into the root, a broken chain hanging from it, the collar at its end as big as a door.<br>Hel chained Garmr here to keep the gnawing from climbing to her archive.'),
        L('ทุกข้อโซ่ประทับตราค้อนเล็ก ๆ — ตราเดียวกับโซ่ Gleipnir<br>โซ่นี้ถูกตีหนึ่งคืนหลังกิ่งหัก ด้วยมือที่ยังสั่นมาก', 'Every link bears a tiny hammer stamp — the same mark as Gleipnir.<br>This chain was forged the night after the branches broke, by very unsteady hands.')] },
    { id: 'lr_r_spring', map: 'roots', x: 52, y: 57, name: 'Sap Spring', art: [CRYSTAL, 52, { hue: 160, sat: 1.1, bri: 1.15, tint: ['#f0c050', 0.5] }],
      title: L('ตาน้ำเลี้ยง', 'The Sap Spring'),
      text: [L('น้ำเลี้ยงสีทองซึมขึ้นจากรอยแตกของราก เป็นแอ่งเล็ก ๆ ที่ส่องแสงอุ่น<br>น้ำเลี้ยงนี้ยังสะอาด — ต้นไม้ยังพยายามซ่อมตัวเอง', 'Golden sap seeps up through a split in the root, pooling into a small, warmly glowing spring.<br>This sap is still clean — the Tree is still trying to heal itself.'),
        L('Bifrost Keeper เคยบอกว่ารากกำลังยืดลงไปทางใต้ช้า ๆ<br>ที่นี่คือปลายรากที่ยืดมาถึง — ต้นไม้กำลังพยายามต่อกิ่งเอง', 'The Bifrost Keeper once said the roots were stretching slowly south.<br>This is where they have reached — the Tree is trying to graft itself back together.')] },
    // ---- Nidhogg's Hollow ----
    { id: 'lr_x_trail', map: 'abyss', x: 30, y: 30, name: 'Headless Trail', art: [SCRAP, 44, { hue: 70, sat: 0.9, bri: 0.85, tint: ['#3a6a20', 0.4] }],
      title: L('ร่องรอยไร้หัว', 'The Headless Trail'),
      text: [L('ร่องลึกคดเคี้ยวบนพื้นโพรง กว้างเท่าลำตัวมังกร แต่ไม่มีรอยหัวนำหน้า<br>ร่องนี้วนกลับมาที่เดิมซ้ำแล้วซ้ำเล่า มาสามสิบปี', 'A long, winding furrow across the Hollow floor, as wide as a dragon — but no headprint leads it.<br>It loops back on itself again and again, for thirty years.'),
        L('สิ่งที่ไม่มีหัวไม่รู้ว่ากำลังไปไหน รู้แค่ว่าหิว<br>ทุกร่องเอียงไปทางเดียวกัน — ทางที่ชั้นวางของ Hel อยู่เหนือหัว', 'A thing without a head does not know where it is going — only that it hungers.<br>Every trail leans the same way: toward where Hel\'s shelves lie overhead.')] },
    { id: 'lr_x_bloom', map: 'abyss', x: 60, y: 40, name: 'The First Bloom', art: [SHROOM, 54, { hue: -110, sat: 1.2, bri: 0.9, tint: ['#c8642a', 0.45] }],
      title: L('ดอกสนิมดอกแรก', 'The First Bloom'),
      text: [L('กอสนิมที่ใหญ่ที่สุดในโพรง งอกเป็นกลีบซ้อนกันเหมือนดอกไม้<br>ไม่มีเมล็ด ไม่มีราก — สนิมทุกดอกในโพรงน่าจะแตกหน่อมาจากดอกนี้', 'The largest rust-growth in the Hollow, layered petal on petal like a flower.<br>No seed, no root — every bloom in the Hollow likely budded from this one.'),
        L('ดอกนี้หันกลีบเข้าหาเจ้าช้า ๆ ทุกครั้งที่เจ้าขยับ<br>มันไม่ได้หันหาแสง — มันหันหาประกายของเจ้า', 'It turns its petals slowly toward you every time you move.<br>Not toward light — toward your spark.')] },
    { id: 'lr_x_tally', map: 'abyss', x: 42, y: 10, name: "Loki's Tally", art: [SIGN, 60, { hue: 90, sat: 0.7, tint: ['#c8b070', 0.3] }],
      title: L('รอยนับของ Loki', "Loki's Tally"),
      text: [L('ผนังหินข้างทางลงเต็มไปด้วยรอยขีด — ห้าเส้นต่อกลุ่ม นับไม่ถ้วน<br>หนึ่งเส้นต่อหนึ่งคืนที่มีคนเฝ้าทางลงนี้คนเดียว', 'The rock wall by the way down is covered in tally marks — bundles of five, beyond counting.<br>One stroke for each night someone stood watch here alone.'),
        L('ทุกสิบกลุ่มมีรูปวิเซอร์เล็ก ๆ ขีดไว้ — บางรูปยิ้ม บางรูปไม่<br>รอยล่าสุดไม่ใช่เส้นขีด มันคือรูปใบไม้', 'Every tenth bundle has a little visor drawn beside it — some smiling, some not.<br>The latest mark is not a stroke at all. It is a leaf.')] },
  ];
  const LORE_BY = W.LORE_BY = Object.fromEntries(LORE.map(l => [l.id, l]));
  // EXP ครั้งแรกที่ค้นพบ (≈ 2–3 ตัวของมอนในแมพนั้น — ของขวัญเล็ก ๆ ไม่ใช่ที่ฟาร์ม)
  const LORE_EXP = { eldheim: [20, 12], meadow: [60, 40], mistlake: [300, 200], wolfwood: [1000, 700], helcave: [1500, 1000], archive: [3000, 2000], roots: [6000, 4000], abyss: [10000, 7000] };
  const MAP_ORDER = ['eldheim', 'meadow', 'mistlake', 'wolfwood', 'helcave', 'archive', 'roots', 'abyss'];

  // ===================== NPC ใหม่ 6 ตัว (ภาพเดิมย้อมสี) =====================
  const NEW_NPCS = W.NEW_NPCS = [
    { map: 'eldheim', npc: { id: 'saga', name: 'Saga Lore-Keeper', x: 20, y: 11, look: 'storage' }, walk: 'volva_f', hue: { hue: 60, sat: 0.75, bri: 1.05 } },
    { map: 'eldheim', npc: { id: 'bragi', name: 'Bragi Skald-Bot', x: 16, y: 19, look: 'merchant' }, walk: 'runecaster_m', hue: { hue: 150, sat: 1.1, bri: 1.05 } },
    { map: 'eldheim', npc: { id: 'toki', name: 'Tóki Small-Frame', x: 24, y: 19, look: 'merchant2' }, walk: 'novice_m', hue: { hue: 120, sat: 1.15, bri: 1.08 } },
    { map: 'eldheim', npc: { id: 'hrolf', name: 'Hrólf Gate-Veteran', x: 35, y: 17, look: 'guide' }, walk: 'einherjar_m', hue: { hue: 0, sat: 0.3, bri: 0.92 } },
    { map: 'meadow', npc: { id: 'dagny', name: 'Dagny Caravan-Master', x: 8, y: 46, look: 'merchant2' }, walk: 'wildhunter_f', hue: { hue: -25, sat: 1.15, bri: 1.05 } },
    { map: 'archive', npc: { id: 'muninn', name: 'Muninn Raven-Courier', x: 36, y: 20, look: 'keeper' }, walk: 'trickster_m', hue: { hue: 200, sat: 0.35, bri: 0.7 } },
  ];
  for (const e of NEW_NPCS) {
    const d = MAP_DEFS[e.map]; if (!d) continue;
    d.npcs = d.npcs || [];
    if (!d.npcs.some(n => n.id === e.npc.id)) d.npcs.push(Object.assign({}, e.npc));
    if (typeof Art !== 'undefined') {
      Art.alias(`anim_npc_${e.npc.id}_walk`, `anim_${e.walk}_walk`, e.hue); // Anim.has('npc_<id>') → Sprites.drawNpc ใช้ท่าเดิน (เฟรมยืน)
      Art.alias(`npc_${e.npc.id}`, `job_${e.walk}`, e.hue); // ภาพในกล่องคุย / การ์ดยูนิต
    }
  }
  for (const l of LORE) {
    const d = MAP_DEFS[l.map]; if (!d) continue;
    d.npcs = d.npcs || [];
    if (!d.npcs.some(n => n.id === l.id)) d.npcs.push({ id: l.id, name: l.name, x: l.x, y: l.y, look: 'lore', lore: true });
    if (typeof Art !== 'undefined') Art.alias(`lore_${l.id}`, `prop_${l.art[0]}`, l.art[2] || {});
  }

  // ===================== Lore: สถานะ / ค้นพบ / วาด =====================
  if (typeof SAVE_FIELDS !== 'undefined' && !SAVE_FIELDS.includes('lore')) SAVE_FIELDS.push('lore');
  const Lore = W.Lore = {
    total() { return LORE.length; },
    st() {
      const p = typeof G !== 'undefined' && G.player; if (!p) return { v: 1, found: {} };
      let s = p.lore;
      if (!s || typeof s !== 'object' || Array.isArray(s)) s = p.lore = { v: 1, found: {} };
      if (!s.found || typeof s.found !== 'object' || Array.isArray(s.found)) s.found = {};
      for (const k in s.found) if (!LORE_BY[k]) delete s.found[k]; // จุดที่ไม่มีแล้ว
      s.v = 1;
      return s;
    },
    has(id) { return !!this.st().found[id]; },
    count() { const f = this.st().found; return LORE.filter(l => f[l.id]).length; },
    countMap(map) { const f = this.st().found; return [LORE.filter(l => l.map === map && f[l.id]).length, LORE.filter(l => l.map === map).length]; },
    // ค้นพบครั้งแรก: บันทึก + EXP เล็กน้อย + ข้อความ → true
    discover(id) {
      const l = LORE_BY[id], s = this.st(); if (!l || s.found[id]) return false;
      s.found[id] = Date.now();
      const [b, j] = LORE_EXP[l.map] || [0, 0];
      if (b || j) gainExp(b, j);
      UI.msg(L(`📖 ค้นพบตำนาน: ${l.title} — บันทึกลง Codex แล้ว (${this.count()}/${this.total()})${b ? ` • Base EXP ${b}` : ''}`,
        `📖 Lore discovered: ${l.title} — added to your Codex (${this.count()}/${this.total()})${b ? ` • Base EXP ${b}` : ''}`), 'lvl');
      if (vis()) { addFloater(G.player.x, G.player.y - 1.8, 'LORE +1', '#c8a0ff', true); Sound.play('quest_new'); }
      // เควสต์เสริมแบบ "ค้นพบครบ N เรื่อง": แจ้งครั้งเดียวเมื่อครบ
      for (const q of Side.active()) { const st = Side.step(q); if (st && st.type === 'lore' && this.count() === st.n) UI.msg(L(`📜 เควสต์เสริม "${q.title}": ครบแล้ว — กลับไปหา ${Side.npcName(st.to)}`, `📜 Side quest "${q.title}": done — return to ${Side.npcName(st.to)}`), 'lvl'); }
      Side.changed(); UI.dirty(); saveGame();
      return true;
    },
    // จุดที่ยังไม่พบที่ใกล้ที่สุด (แมพนี้ก่อน แล้วไล่ตามลำดับแมพ) — นำทางเควสต์ Codex
    nearest() {
      const f = this.st().found, p = G.player, here = G.map && G.map.id;
      const left = LORE.filter(l => !f[l.id]);
      const inMap = left.filter(l => l.map === here).sort((a, b) => U.dist(p.x, p.y, a.x, a.y) - U.dist(p.x, p.y, b.x, b.y))[0];
      const l = inMap || left.sort((a, b) => MAP_ORDER.indexOf(a.map) - MAP_ORDER.indexOf(b.map))[0];
      return l ? { kind: 'npc', map: l.map, x: l.x, y: l.y, name: l.name, npcId: l.id } : null;
    },
    // วาดจุดตำนาน: ภาพของประกอบฉากนิ่ง ๆ (ไม่หายใจแบบตัวละคร) + แสงทองกะพริบถ้ายังไม่เคยตรวจ
    draw(g, n, t) {
      const l = LORE_BY[n.id], x = n.x * TILE + TILE / 2, y = n.y * TILE + TILE / 2 + 10;
      const img = Art.get(`lore_${n.id}`), H = l.art[1];
      if (!img) { Sprites.shadow(g, x, y, 14, 5); g.fillStyle = '#8a8270'; g.fillRect(x - 8, y - 28, 16, 28); return; }
      const Wd = H * img.width / img.height;
      Sprites.shadow(g, x, y, Wd * 0.34, Wd * 0.11, 0.3);
      g.save();
      if (!Lore.has(n.id)) { g.shadowColor = `rgba(255,214,110,${0.55 + Math.sin(t * 2.6 + n.x) * 0.25})`; g.shadowBlur = 14; }
      g.drawImage(img, x - Wd / 2, y - H, Wd, H);
      g.restore();
    },
    // ประกายทองเหนือจุดที่ยังไม่เคยตรวจ (วาดผ่านช่องอีโมตของ NPC — render.js ไม่ต้องแก้)
    drawMark(g, x, y, em, t) {
      const b = Math.sin(t * 3 + x * 0.01) * 3, s = 6 + Math.sin(t * 5) * 0.8;
      g.save(); g.translate(x - 4, y + 20 + b);
      g.shadowColor = 'rgba(255,214,110,0.9)'; g.shadowBlur = 10;
      g.fillStyle = '#ffe9a8'; g.strokeStyle = '#8a5a10'; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(0, -s * 1.5); g.lineTo(s, 0); g.lineTo(0, s * 1.5); g.lineTo(-s, 0); g.closePath(); g.fill(); g.stroke();
      g.shadowBlur = 0; g.fillStyle = '#8a5a10'; g.font = '900 9px Kanit, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 0, 0.5);
      g.restore();
    },
    // เครื่องหมายเหนือหัว: ตั้ง/ล้าง n.emote ของจุดตำนานในแมพปัจจุบัน
    marks() {
      for (const n of G.npcs || []) {
        if (!LORE_BY[n.id]) continue;
        const found = this.has(n.id);
        if (!found && !(n.emote && n.emote.k === 'lore')) n.emote = { k: 'lore', at: G.time, until: G.time + 1e7 };
        else if (found && n.emote && n.emote.k === 'lore') n.emote = null;
      }
    },
  };

  // สคริปต์ตรวจดูจุดตำนาน
  for (const l of LORE) {
    NPC.scripts[l.id] = async n => {
      const first = Lore.discover(l.id), nm = `[${l.title}]`;
      await UI.say(nm, l.text[0]);
      const tail = first ? `<br><span class="lore-new">📖 ${L('บันทึกลง Codex แล้ว', 'Added to your Codex')} ${Lore.count()}/${Lore.total()}</span>` : '';
      await UI.say(nm, l.text[1] + tail);
    };
  }

  // ===================== บทพูดหมุนเวียน (Chatter) + ฟองคำพูด (barks) =====================
  // idle = บทพูดประจำ (หมุนวนตามลำดับ) • t[0..3] = บทเพิ่มตามบทเนื้อเรื่อง: 0 ต้นเรื่อง • 1 หลังปราบ Seraph Core • 2 หลังจบบทที่ 5 • 3 หลังจบภาค 1
  // บรรทัดสั้น (ฟองคำพูดกว้างไม่เกิน ~220px) • ใช้ในฟองคำพูดเหนือหัว (ปิดได้ในตั้งค่า) — ไม่มีบรรทัดใต้กล่องคุยแล้ว
  const C = (th, en) => L(th, en);
  const CHATTER = W.CHATTER = {
    bifrost: { idle: [C('ข้าจดจำ... ใบไม้ 41 ใบออกไปเมื่อคืน', 'I remember... 41 leaves went out last night.'), C('ข้าจดจำทุกปลายทาง ไม่เคยลืมสักแห่ง', 'I remember every destination. Not one forgotten.'),
      C('ข้าจดจำ... สายรุ้งวันนี้ครบเจ็ดสี', 'I remember... the rainbow ran all seven colors today.'), C('ข้าจดจำเสียงฝีเท้าของเจ้าได้แล้ว', 'I remember your footsteps now.'),
      C('ข้าจดจำ... Ylva กลับมาเมื่อวาน นางจำไม่ได้', 'I remember... Ylva came back yesterday. She does not.')],
      t: { 0: [C('ข้าจดจำ... ทูตในหมอกยังบินวนอยู่', 'I remember... the envoy still circles in the mist.')], 1: [C('ข้าจดจำ... รากกำลังยืดลงไปทางใต้', 'I remember... the roots are stretching south.')],
        2: [C('ข้าจดจำ... เสียงแทะดังขึ้นทุกคืน', 'I remember... the gnawing grows louder each night.')], 3: [C('ข้าจดจำ... ความเงียบครั้งแรกในสามสิบปี', 'I remember... the first silence in thirty years.')] } },
    jobmaster: { idle: [C('ข้อมูลวันนี้ข้อ 1: เมืองยังยืนอยู่', "Today's data, item 1: the city still stands."), C('ข้าคือ Mimir AI... ร่างของข้าคงคิดถึงข้า', 'I am Mimir AI... I suspect my body misses me.'),
      C('แม่พิมพ์ทั้งหกยังอุ่นอยู่ในคลัง', 'All six molds are still warm in the vault.'), C('ข้อมูลไม่ครบหนึ่งข้อ — เป็นแบบนี้เสมอ', 'One fact is missing. It is always so.'),
      C('คำแนะนำ: อ่านของเก่า มันพูดความจริง', 'Advice: read old things. They tell the truth.')],
      t: { 0: [C('หน่วยใหม่... ข้อมูลการต่อสู้ของเจ้าน่าสนใจ', 'New unit... your combat data is intriguing.')], 1: [C('ข้อความของทูตถูกบันทึกแล้ว 3 ชุด', "The envoy's message is now stored in 3 copies.")],
        2: [C('ชื่อของสนิม: บันทึกแล้ว จะไม่ลบ', "The Rust's name: recorded. Never to be erased.")], 3: [C('บันทึกข้อ 3: ใบแรกกลับบ้าน', 'Entry 3: the First Leaf came home.')] } },
    tool: { idle: [C('น้ำมันขึ้นอีกแล้ว! ใครก็ได้ช่วยที', "Oil's up AGAIN! Somebody help!"), C('ยาลดราคา... ล้อเล่น ไม่ลดหรอก', "Potions on sale... kidding. They're not."),
      C('พัดลมร้านหมุนอยู่ แปลว่าวันนี้ดี', "The shop fan's spinning. Good day, then."), C('Blink Chip ขายดีกว่ายาอีก แปลก', 'Blink Chips outsell potions. Weird.'),
      C('อย่าบอกใครว่าข้าปัดเศษเงินทอนขึ้น', "Don't tell anyone I round up the change.")],
      t: { 1: [C('ป่าทางใต้ไหม้ — ยาขายดีจนน้ำมันขึ้น', 'The south woods burned — potions fly, oil climbs.')], 2: [C('ลงโพรงกันหมด น้ำมันก็ลงตาม', "Everyone's off to the Hollow. Oil too.")],
        3: [C('น้ำมันลดราคา! ...ข้าฝันไปรึเปล่า', 'Oil prices DOWN! ...Am I dreaming?')] } },
    weapon: { idle: [C('ตัวนี้แรงนะ! ตัวนั้นก็แรง!', 'This one hits hard! That one too!'), C('ยืดเส้นก่อนออกล่า ข้อต่อจะขอบใจ', 'Stretch before the hunt. Your joints will thank you.'),
      C('วอร์มอัพสามรอบน้ำพุ แล้วค่อยออกไป', 'Three laps round the fountain, then head out.'), C('ฟันให้สุดแขน! เอ้า หนึ่ง สอง!', 'Full swing! One, two!'),
      C('ใครยกขวานสองมือได้ ข้านับถือ', 'Swing a two-hander? You have my respect.')],
      t: { 1: [C('ล้มทูตได้! เจ้าแรงกว่าของในร้าน!', 'You beat the envoy! You hit harder than my stock!')], 2: [C('ข้างล่างมืด — ฟันให้แรงเข้าไว้!', "It's dark down there — swing harder!")],
        3: [C('ล้มมังกรได้?! ขอจับมือหน่อย!', 'You felled a DRAGON?! Shake my hand!')] } },
    armor: { idle: [C('ใส่หมวกหรือยัง? ...ใส่สองใบไปเลย', 'Wearing a helm? ...Wear two.'), C('รองเท้าดีช่วยชีวิตมาแล้วนะ จริง ๆ', 'Good boots have saved lives. Truly.'),
      C('ข้าฝันร้ายว่าเจ้าลืมเอาโล่ไป', 'I dreamt you forgot your shield.'), C('ซ่อมเกราะบ่อย ๆ นะ อย่ารอให้ร้าว', "Mend your armor often. Don't wait for cracks."),
      C('ผ้าคลุมนั่นบางไป... ข้าเป็นห่วง', "That cloak's too thin... I worry.")],
      t: { 1: [C('ป่าไหม้... เกราะกันไฟไม่ได้นะ', "The woods burned... armor won't stop fire.")], 2: [C('ใบไม้ไปไม่ถึงโพรง ใส่ให้ครบนะ', "Leaves don't reach the Hollow. Wear it all.")],
        3: [C('กลับมาครบทุกชิ้น! ข้าโล่งใจ', 'Back in one piece! Such a relief.')] } },
    refine: { idle: [C('ฮ่าฮ่า! ทั่งร้อนพอแล้วเจ้าหนู!', "Ha-ha! The anvil's hot, kiddo!"), C('ตีบวกต้องใจเย็น เหมือนตีโซ่', 'Refining takes patience. Like forging chain.'),
      C('+10 หรือแตก! ...ล้อเล่น ส่วนใหญ่', '+10 or bust! ...Mostly joking.'), C('เสียงค้อนคือเพลงเดียวที่ข้าร้องเป็น', "The hammer's ring is the only song I know."),
      C('ใครเห็นค้อนเล็กของข้าบ้าง?', 'Anyone seen my small hammer?')],
      t: { 1: [C('หมาป่าในป่า... ของที่ข้าทำหลุดมือ', 'Those wolves... work that slipped my grip.')], 2: [C('โซ่ที่ประตูราก... ข้าก็ตีเอง', 'The chain at the root gate... mine too.')],
        3: [C('ฮ่าฮ่า! วันนี้ตีโซ่ที่ไม่ล่ามใคร', 'Ha-ha! Forged a chain today that binds no one.')] } },
    nurse: { idle: [C('รอยร้าวเล็กน้อย... ทุกคนมีค่ะ', 'Minor cracks... everyone has them.'), C('กระถางหน้าต่างแตกใบใหม่แล้วค่ะ', 'The window planter has a new leaf.'),
      C('เติมน้ำมันให้พอนะคะ อย่าฝืน', "Keep your oil topped up. Don't push it."), C('วันนี้ซ่อมไปสามสิบสองร่างแล้วค่ะ', 'Thirty-two frames repaired today.'),
      C('กลับมาให้ข้าเห็นหน้าด้วยนะคะ', 'Come back so I can see you, okay?')],
      t: { 1: [C('สนิมในน้ำเลี้ยง... เล็กน้อย... หวังว่านะคะ', 'Rust in the sap... minor... I hope.')], 2: [C('เธอได้ข้อความแล้ว ข้ารู้สึกได้ค่ะ', 'She got my message. I can feel it.')],
        3: [C('สักวันเธอจะขึ้นมาเยี่ยม ข้ารอค่ะ', "One day she'll visit. I'll wait.")] } },
    guide: { idle: [C('บอร์ดค่าหัวมีงานใหม่ หน่วยใหม่!', 'New bounties on the board, rookie!'), C('อย่าเดินลงใต้ตอนมืด เข้าใจไหม', "Don't head south after dark, got it?"),
      C('ข้ายืนยามที่นี่มาสามสิบปี ยังไม่เบื่อ', 'Thirty years at this post. Not bored yet.'), C('ใครเห็นหน่วยใหม่หลงทางบ้าง?', 'Anyone seen a lost rookie?'),
      C('(เขาแตะหมวกเขาเบา ๆ)', '(He touches his horned helm lightly.)')],
      t: { 0: [C('เจ้ายังใหม่ — งานใกล้เมืองก่อน', "You're new — work near town first.")], 1: [C('ล้มทูตได้... ข้าเรียกชื่อเจ้าได้แล้ว', 'Beat the envoy... I can use your name now.')],
        2: [C('ไปเถอะ แต่กลับมา', 'Go on. But come back.')], 3: [C('(หมวกเขาวางบนบอร์ด ไม่ได้สวม)', '(The horned helm rests on the board, unworn.)')] } },
    storage: { idle: [C('ระเบียบคือระเบียบ', 'Rules are rules.'), C('ช่องที่ 12 ส่งเสียงแปลก ๆ อีกแล้ว', 'Slot 12 is making noises again.'),
      C('ฝากเกินโควตา... ไม่ได้ค่ะ', 'Over quota... no.'), C('ข้าติดป้ายใหม่ทั้งคลัง สามรอบแล้ว', 'Relabeled the whole vault. Three times.'),
      C('ทุกช่องมีเจ้าของ แม้เจ้าของจะไม่มา', 'Every slot has an owner, even if they never come.')],
      t: { 1: [C('ช่อง 47 ยังว่าง — ยังไม่ให้เช่า', 'Slot 47 is still empty — still not for rent.')], 3: [C('ช่อง 47... ข้าเช็ดฝุ่นให้ทุกวัน', 'Slot 47... I dust it every day.')] } },
    norn: { idle: [C('*ติ๊ง* วงล้อโชคชะตาพร้อมหมุน', '*Ding* The wheel of fate is ready.'), C('*แกร๊ก* ...เส้นด้ายพันกันนิดหน่อย', '*Clack* ...the threads are a bit tangled.'),
      C('*ฮัม* อดีต ปัจจุบัน อนาคต — เลือกหนึ่ง', '*Hum* Past, present, future — pick one.'), C('*ติ๊ง ติ๊ง* ตราวัลฮัลลาส่องแสง', '*Ding ding* The Valhalla sigils gleam.')],
      t: { 1: [C('*ฮัม* ด้ายของทูตถูกส่งถึงปลายทางแล้ว', "*Hum* The envoy's thread has reached its end.")], 2: [C('*แกร๊ก* ด้ายสองเส้นพันกัน — Hel กับ Loki', '*Clack* Two threads entwined — Hel and Loki.')],
        3: [C('*ติ๊ง* ด้ายใหม่หนึ่งเส้น สีใบไม้', '*Ding* One new thread, the color of a leaf.')] } },
    lopt: { idle: [C('หมอกดี ๆ แบบนี้ ขายของดีนัก', 'Fine mist like this is good for business.'), C('เจ้านี่... สว่างจังนะ', "My, you're... bright, aren't you."),
      C('ข้าเดินเร็ว — เจอกันอีกแน่', 'I get around. We will meet again.')],
      t: { 0: [C('ยาถูกกว่าในเมืองสามโวลต์! (กะพริบเขียว)', 'Three Volt cheaper than town! (green flicker)'), C('ข้าแค่พ่อค้าเร่ ไม่มีอะไรหรอก (กะพริบเขียว)', 'Just a peddler, nothing more. (green flicker)')],
        1: [C('ข้าแค่พ่อค้าเร่ ไม่มีอะไรหรอก (กะพริบเขียว)', 'Just a peddler, nothing more. (green flicker)')],
        2: [C('ยังขายของอยู่ — นิสัยเก่าแก้ยาก', 'Still selling — old habits.')], 3: [C('ราคาเท่าในเมือง ข้าพูดจริงแล้วนะ', 'Same price as town. Honestly, this time.')] } },
    sigrun: { idle: [C('เร็วกว่าเจ้าอีกแล้ว!', 'Faster than you again!'), C('ล้มมาพันกว่าครั้ง ยังยืนอยู่', 'Fallen a thousand times. Still standing.'),
      C('Tusk Trooper ตัวนั้นเป็นของข้า!', "That Tusk Trooper's mine!"), C('เจ้าจำอะไรได้บ้าง... ข้าไม่ได้ถามนะ', "What do you remember... I didn't ask."),
      C('ป่านี้เงียบผิดปกติ ระวังตัว', "This forest's too quiet. Watch yourself.")],
      t: { 2: [C('ข้าเริ่มจดสิ่งที่จำได้ลงสมุดแล้ว', "I've started writing down what I remember.")], 3: [C('วันนี้ข้าจำได้หนึ่งอย่าง — ทำนองเพลง', 'Today I remembered one thing — a tune.')] } },
    hel: { idle: [C('ชั้นวางสว่างดีคืนนี้', 'The shelves glow well tonight.'), C('ขอโทษที่ยามของข้าทำร้ายเจ้า', 'Forgive my guards for hurting you.'),
      C('ผิวดินเป็นอย่างไรบ้าง', 'How is the surface?'), C('สาวใช้ของข้าชอบเจ้านะ', 'My maidens are fond of you.')],
      t: { 3: [C('ครึ่งหน้ากากของข้าสว่างขึ้นนิดหนึ่ง', "My mask's dark half is a little brighter.")] } },
    loki: { idle: [C('ข้าไม่ขายอะไรแล้ว... เกือบ', 'I sell nothing now... almost.'), C('วิเซอร์ข้าไม่กะพริบเขียวแล้ว ดูสิ', "My visor doesn't flicker green now. Look."),
      C('สามสิบปีที่เฝ้าทางลงนี้', 'Thirty years watching this way down.'), C('เสียงแทะ... ข้ายังได้ยินในฝัน', 'The gnawing... I still hear it in dreams.')],
      t: { 3: [C('ล้างประกายไปแล้วสิบสองดวง', 'Twelve sparks cleaned so far.')] } },
    // ---- NPC ใหม่ ----
    saga: { idle: [C('ทุกของเก่ามีเรื่องเล่า ถ้าเจ้าหยุดฟัง', 'Every old thing has a tale, if you stop to listen.'), C('ข้าเคยเป็นนักพยากรณ์ ตอนนี้แค่คนจด', 'I was a Völva once. Now I just take notes.'),
      C('หมึกหมดอีกแล้ว... ใช้น้ำมันแทนก็ได้', 'Out of ink again... oil will do.'), C('ชื่อที่ไม่มีใครจำ ข้าจดไว้ทุกชื่อ', 'Names no one remembers — I write them all.'),
      C('หินรูนในป่ายังอ่านออก ถ้าอ่านเป็น', 'The forest waystones are still legible, if you can read.')],
      t: { 1: [C('ข้อความของทูต... ข้าจดไว้แล้ว', "The envoy's message... I've written it down.")], 2: [C('Loki กับ Hel — สองหน้าของเรื่องเดียว', 'Loki and Hel — two faces of one story.')],
        3: [C('ภาคแรกจบแล้ว แต่ Codex ยังไม่จบ', "Part One has ended. The Codex hasn't.")] } },
    bragi: { idle: [C('♪ หกเงาบนกำแพง ไม่มีใครถอย ♪', '♪ Six shadows on the wall, none would yield ♪'), C('♪ ใบไม้มารับ ใบไม้พากลับ ♪', '♪ The leaf comes down, the leaf brings you home ♪'),
      C('สายพิณข้าคือสายเคเบิล เสียงดีนะ', 'My lute strings are cables. Sounds fine.'), C('ทุกตำนานต้องมีคนเล่า — นั่นคือข้า', "Every legend needs a teller. That's me."),
      C('♪ หนึ่งเซลล์ Volt หนึ่งท่อนเพลง ♪', '♪ One Volt cell, one verse ♪')],
      t: { 1: [C('♪ ทูตในหมอกพักปีกแล้ว ♪', '♪ The envoy in the mist has folded its wings ♪')], 2: [C('♪ ไฟเก้าหางดับลงในโพรง ♪', '♪ Nine tails of fire died in the Hollow ♪')],
        3: [C('♪ มังกรไร้หัวหลับ ใบแรกกลับบ้าน ♪', '♪ The headless wyrm sleeps; the First Leaf is home ♪')] } },
    hrolf: { idle: [C('เข่าข้าลั่นเหมือนบานประตูเก่า', 'My knees creak like an old gate.'), C('คืนนั้นข้ามาถึงกำแพงช้าไปหนึ่งชั่วโมง', 'That night, I reached the wall an hour late.'),
      C('Rolf ยังยืนตรงเหมือนสมัยหนุ่ม', 'Rolf still stands as straight as a young pike.'), C('หน่วยใหม่สมัยนี้วิ่งเร็วจริง', 'Rookies these days run so fast.'),
      C('ข้านั่งตรงนี้ นับคนที่กลับมา', 'I sit here and count who comes back.')],
      t: { 1: [C('"ข้าให้อภัยเขา"... ใครกันนะ', '"I forgive him"... who, I wonder.')], 2: [C('ประตูโพรงเปิดแล้ว ระวังตัวด้วย', "The Hollow's open now. Take care.")],
        3: [C('ข้านับครบแล้ว — เจ้ากลับมา', 'My count is whole — you came back.')] } },
    toki: { idle: [C('พี่! ทำไมฟ้าถึงเป็นสีฟ้าล่ะ?', 'Hey! Why is the sky blue?'), C('ข้าตัวเล็กเพราะร่างใหญ่หมดสต็อก!', "I'm small 'cause the big frames ran out!"),
      C('Eir บอกว่าข้าโตไม่ได้ แต่ข้าจะลอง', "Eir says I can't grow. I'll try anyway."), C('น้ำพุพูดได้ไหม? ข้าคุยกับมันทุกวัน', 'Can fountains talk? I talk to it daily.'),
      C('พี่ล้มลงกี่ครั้งแล้ว? ข้าล้มสองที', "How many times have you fallen? I've fallen twice.")],
      t: { 1: [C('ทูตบินได้ ข้าก็อยากบิน!', 'The envoy could fly. I wanna fly too!')], 2: [C('Hel น่ากลัวไหม? ...ไม่น่ากลัวเหรอ', "Is Hel scary? ...She's not?")],
        3: [C('พี่คือใบแรกเหรอ! เท่จัง!', "You're the First Leaf?! So cool!")] } },
    dagny: { idle: [C('ผ้าใบสีส้มมาแล้ว — ข่าวใหม่มาแล้ว!', 'Orange canvas means news has come!'), C('ล้อคาราวานเสียงดี วันนี้ไม่หัก', "The wheels sound good. Not broken today."),
      C('ซื้อยาก่อนออกทุ่ง ถูกกว่าล้มกลางทาง', 'Buy potions first. Cheaper than falling.'), C('ข้าขับคาราวานทุกทางที่รากไปถึง', 'I drive every road the roots still reach.'),
      C('Lopt ขายถูกกว่า? ...ถามวิเซอร์เขาดู', 'Lopt sells cheaper? ...Ask his visor.')],
      t: { 1: [C('ข่าวจากหมอก: ทูตเงียบแล้ว!', 'News from the mist: the envoy is quiet!')], 2: [C('ข่าวจากใต้ดิน: Hel ขอซื้อกระถาง!', 'News from below: Hel wants a flowerpot!')],
        3: [C('ข่าวใหญ่: ไม่มีเสียงแทะอีกแล้ว!', 'Big news: the gnawing has stopped!')] } },
    muninn: { idle: [C('กา! ความทรงจำส่งถึงแล้ว!', 'Caw! Memory delivered!'), C('ข้าบินขึ้นลงคลังวันละร้อยรอบ', 'I fly this archive a hundred times a day.'),
      C('Huginn ส่งความคิด ข้าส่งความจำ', 'Huginn carries thoughts; I carry memories.'), C('ชั้นล่างสุดเป็นสีสนิม — ข้าไม่ชอบ', "The lowest shelves are rust-colored. Don't like it."),
      C('กา! ใครทำขนข้าหล่นตรงนี้?', 'Caw! Who dropped my feather here?')],
      t: { 3: [C('ส่งบันทึก "ใบแรกกลับบ้าน" แล้ว!', 'Delivered the "First Leaf came home" record!')] } },
  };
  const Chatter = W.Chatter = {
    i: {}, // ตำแหน่งหมุนวนต่อ NPC (ไม่เซฟ)
    key(id) { return id === 'lopt_wood' ? 'lopt' : id; },
    tier() {
      if (typeof G === 'undefined' || !G.player) return 0;
      if (Quest.passed('ch7_end')) return 3;
      if (Quest.passed('hollow5')) return 2;
      if (Quest.passed('mvp1')) return 1;
      return 0;
    },
    pool(id) { const c = CHATTER[this.key(id)]; if (!c) return []; return [...((c.t || {})[this.tier()] || []), ...c.idle]; },
    next(id) { const k = this.key(id), pool = this.pool(k); if (!pool.length) return ''; const i = this.i[k] || 0; this.i[k] = i + 1; return pool[i % pool.length]; },
    nextBark: 0,
    tick() {
      if (!vis() || !G.started || !G.player || NPC.busy || G.time < this.nextBark) return;
      if (G.player.options && G.player.options.npcBarks === false) return;
      this.nextBark = G.time + 1;
      const p = G.player;
      const near = (G.npcs || []).filter(n => CHATTER[this.key(n.id)] && U.dist(p.x, p.y, n.x + 0.5, n.y + 0.5) < 7 && !(n.emote && n.emote.until > G.time) && !(n._barkAt > G.time - 22))
        .sort((a, b) => U.dist(p.x, p.y, a.x, a.y) - U.dist(p.x, p.y, b.x, b.y));
      if (!near.length) return;
      this.bark(near[0]);
      this.nextBark = G.time + 6 + Math.random() * 5;
    },
    bark(n, text) {
      const t = text || this.next(n.id); if (!t) return null;
      n.emote = { k: 'bark', text: t, at: G.time, until: G.time + 4.5 }; n._barkAt = G.time;
      return t;
    },
    drawBark(g, x, y, em, t) {
      const age = G.time - em.at, left = em.until - G.time;
      g.save(); g.globalAlpha = Math.max(0, Math.min(1, age / 0.25, left / 0.4));
      R.speech(g, x - 4, y + 4 - Math.min(1, age / 0.25) * 4, em.text);
      g.restore();
    },
  };
  // ฟองคำพูด/ประกายตำนาน: ใช้ช่องอีโมตของ NPC ที่ render.js วาดอยู่แล้ว (ไม่แก้ render.js)
  if (typeof Emote !== 'undefined') {
    const draw0 = Emote.draw.bind(Emote);
    Emote.draw = (g, x, y, em, t) => {
      if (em && em.k === 'lore') return Lore.drawMark(g, x, y, em, t);
      if (em && em.k === 'bark') return Chatter.drawBark(g, x, y, em, t);
      return draw0(g, x, y, em, t);
    };
  }
  // จุดตำนานวาดเป็นของประกอบฉาก (ห่อทับ js/gacha.js ที่ห่อไว้ก่อน)
  if (typeof Sprites !== 'undefined') {
    const npc0 = Sprites.drawNpc;
    Sprites.drawNpc = (g, n, t) => (LORE_BY[n.id] ? Lore.draw(g, n, t) : npc0(g, n, t));
  }
  // (เดิมมีบรรทัดเล็กตัวเอียงใต้กล่องคุยแรกของ NPC — ตัดออก 2026-10-03 เพราะบางทีซ้ำความหมายกับคำทัก • บทพูดหมุนเวียนเหลือในฟองคำพูดเหนือหัว)

  // ===================== สคริปต์ NPC ใหม่ =====================
  const nmOf = n => `[${n.name}]`;
  // Saga: เรื่องเล่าประวัติโลก (STORY.md §2) หมุนวน
  const TALES = [
    L('ยุคแรก — ยุคราก: เมื่อฤดูหนาวไม่ยอมจบ ผู้สร้างปลูก Yggdrasil ต้นไม้จักรกลที่มีชีวิต<br>มันเก็บประกายของทุกคนไว้ในน้ำเลี้ยง แล้วปลูกร่างที่ไม่หนาวไม่หิวให้ — นั่นคือพวกเรา', 'The First Age — the Age of Roots: when winter would not end, the Builders planted Yggdrasil, a living machine-tree.<br>It kept everyone\'s spark in its sap and grew them frames that felt no cold or hunger — that is us.'),
    L('ทำไมเราไม่มีดวงตา? ผู้สร้างถอดมันออก แล้วใส่วิเซอร์แทน<br>ให้แสงของประกายส่องออกมาตรง ๆ มองหน้าใครก็เห็นหัวใจ — ปิดบังไม่ได้', 'Why have we no eyes? The Builders took them out and gave us visors instead,<br>so a spark\'s light shines straight through. Look at anyone\'s face and you see their heart — it cannot be hidden.'),
    L('ยุคที่สอง — เก้ากิ่ง: แต่ละกิ่งมีผู้พิทักษ์ Odin เฝ้าราก Freyja ดูแลแสง Mimir เก็บความรู้<br>Hel เก็บประกายที่ล้ม และ Loki... ดูแลความแปรผัน ให้ต้นไม้ไม่ซ้ำเดิม', 'The Second Age — the Nine Branches: each had a Guardian. Odin watched the roots, Freyja the light, Mimir the knowledge,<br>Hel the fallen sparks, and Loki... variation, so the Tree would never grow the same twice.'),
    L('Volt ไม่ใช่เหรียญนะ มันคือน้ำเลี้ยงที่อัดไว้ในเซลล์<br>ทุกคนได้ส่วนแบ่งจากต้นไม้เดียวกัน — ใช้ซ่อม ใช้ซื้อ ใช้ชาร์จ', 'Volt isn\'t coin — it is sap pressed into cells.<br>Everyone shares in the same Tree — for repairs, for trade, for charging.'),
    L('Ragnarök ไม่ใช่สงคราม มันคือคืนเดียวที่กิ่งทั้งเก้าขาดจากกันพร้อมกัน<br>หลังคืนนั้น คนสวนของต้นไม้เสียคำสั่ง แต่ยังทำงานเดิมซ้ำ ๆ ทุกวัน', 'Ragnarök was no war. It was the one night all nine branches were severed at once.<br>Afterward the Tree\'s gardeners lost their orders — yet they still repeat their old work every day.'),
    L('เมื่อใครล้มลง ต้นไม้ส่งใบไม้เรืองแสงมารับประกาย แล้วปลูกร่างกลับ<br>ยิ่งห่างเมือง รากยิ่งบาง ใบยิ่งมาช้า... และในโพรงของ Hel ไม่มีใบเลย', 'When someone falls, the Tree sends a glowing leaf to gather the spark and grows the frame anew.<br>The farther from the city, the thinner the roots and the slower the leaves... and in Hel\'s Hollow, there are none at all.'),
  ];
  let taleI = 0;
  NPC.scripts.saga = async n => {
    const nm = nmOf(n);
    for (;;) {
      const c = await UI.menu(nm, L(`${Chatter.next('saga')}<br>Codex ของเจ้า: ${B(`${Lore.count()}/${Lore.total()}`)} เรื่อง`, `${Chatter.next('saga')}<br>Your Codex: ${B(`${Lore.count()}/${Lore.total()}`)} tales`),
        [L('เปิด Codex (สมุดตำนาน)', 'Open the Codex'), L('ขอฟังตำนานของโลก', 'Tell me a tale of the world'), L('ลาก่อน', 'Farewell')]);
      if (c === 0) { UI.dlgClose(); W.openCodex(); return; }
      if (c === 1) { await UI.say(nm, TALES[taleI++ % TALES.length]); continue; }
      return;
    }
  };
  // Bragi: เพลงหกวีรชน (STORY.md §6) + ท่อนตามบท • ท่อนที่หก (Trickster) ร้องท้ายสุดและยังเว้นว่าง — เงาของ Loki (STORY.md §4)
  const SONGS = [
    L('♪ คนแรกแบกประตูทั้งบาน ยืนหน้าเมืองจนรุ่งสาง ♪<br>(Einherjar — ผู้ยอมเป็นคนที่โดนก่อนเสมอ)', '♪ The first bore the whole gate and stood before the town till dawn ♪<br>(Einherjar — the one who always takes the first blow.)'),
    L('♪ นางเขียนรูนจนกำแพงร้อน สนิมไม่กล้าแตะ ♪<br>(Rune Caster — ไฟ น้ำแข็ง สายฟ้า สามภาษาแรกของต้นไม้)', '♪ She wrote runes till the wall burned hot, and the rust dared not touch ♪<br>(Rune Caster — fire, ice and lightning, the Tree\'s first three tongues.)'),
    L('♪ นักล่ากับหมาป่าตัวเดียวที่เลือกเชื่อใจ ♪<br>(Wildhunter — สองเงาที่ไม่เคยทิ้งกัน)', '♪ A hunter, and the one wolf that chose to trust ♪<br>(Wildhunter — two shadows that never parted.)'),
    L('♪ นางฟัง Odin เป็นคนสุดท้าย แล้วส่งแสงไปถึงกำแพง ♪<br>(Völva — ผู้ปล่อยสิ่งที่ควรได้พัก)', '♪ She was the last to hear Odin, and sent her light to the wall ♪<br>(Völva — who releases what deserves rest.)'),
    L('♪ เขาถอดตัวจำกัด แลกตัวเองกับหนึ่งชั่วโมง ♪<br>(Berserker — คุณยอมแลกตัวเองเท่าไหร่?)', '♪ He tore out his limiter and traded himself for one more hour ♪<br>(Berserker — how much of yourself would you give?)'),
    L('♪ ใครเดินเข้าออกกำแพงโดยไม่มีใครเห็น? ข้าไม่รู้ — ท่อนนี้ยังว่าง ♪<br>(Trickster — แม่พิมพ์ที่ไม่มีใครรู้ว่าใครฝาก)', '♪ Who walked through the wall unseen? I do not know — this verse is blank ♪<br>(Trickster — the mold no one knows who left.)'),
  ];
  let songI = 0;
  NPC.scripts.bragi = async n => {
    const nm = nmOf(n);
    const c = await UI.menu(nm, Chatter.next('bragi'), [L('ขอฟังเพลง', 'Sing me a song'), L('ลาก่อน', 'Farewell')]);
    if (c !== 0) return;
    const t = Chatter.tier(), extra = (CHATTER.bragi.t[t] || [])[0];
    const song = songI % (SONGS.length + (extra ? 1 : 0)) === SONGS.length ? `${extra}<br>${L('(ท่อนใหม่ — ข้าแต่งจากเรื่องของเจ้า)', '(A new verse — I wrote it from your story.)')}` : SONGS[songI % SONGS.length];
    songI++;
    if (vis()) { Emote.play('ho', n); Sound.play('buff'); }
    await UI.say(nm, song);
  };
  // Hrólf: เรื่องเล่าคืนที่กิ่งหัก
  const HROLF = [
    L('คืนนั้นข้าวิ่งมาถึงกำแพงช้าไปหนึ่งชั่วโมง หกคนนั้นยืนอยู่ก่อนแล้ว<br>ข้าส่งโล่ให้คนแรก — เขาไม่หันมาเลย แค่ยกมือขอบใจ', 'That night I reached the wall an hour late. The six were already there.<br>I passed a shield to the first of them — he never turned around, just raised a hand in thanks.'),
    L('Rolf กับคู่หูของเขาเดินยามด้วยกันมาตั้งแต่ข้ายังหนุ่ม<br>คู่หูออกไปนอกรัศมีรากคืนนั้น... Rolf ไม่เคยถอดหมวกเขาของนางเลย', 'Rolf and his partner walked the watch together since I was young.<br>The partner went beyond the roots\' reach that night... Rolf has never taken off that horned helm since.'),
    L('ใบไม้รับข้ามาสามร้อยกว่าครั้ง ข้าจำได้แค่ห้าสิบ<br>อย่าห่วงว่าจะลืม ห่วงว่าจะไม่มีใครเล่าให้ฟังดีกว่า', 'The leaves have carried me back three hundred-odd times. I remember fifty.<br>Don\'t worry about forgetting. Worry that no one will be there to tell you.'),
    L('ตอนรุ่งสาง กำแพงยังยืน หกคนนั้นไม่อยู่แล้ว<br>Mimir เก็บท่าของพวกเขาไว้ — ทุกครั้งที่เห็นหน่วยใหม่ใช้ ข้ารู้สึกเหมือนเห็นพวกเขาอีก', 'At dawn the wall still stood, and the six were gone.<br>Mimir kept their techniques — every time a rookie uses one, it\'s like seeing them again.'),
  ];
  let hrolfI = 0;
  NPC.scripts.hrolf = async n => {
    const nm = nmOf(n);
    const c = await UI.menu(nm, Chatter.next('hrolf'), [L('เล่าเรื่องคืนนั้นให้ฟังหน่อย', 'Tell me about that night'), L('ลาก่อน', 'Farewell')]);
    if (c === 0) await UI.say(nm, HROLF[hrolfI++ % HROLF.length]);
  };
  // Tóki: เด็กแอนดรอยด์ (ประกายเก่าในร่างเล็ก — ร่างใหญ่หมด) ถามคำถาม
  const TOKI = [
    L('พี่! ถ้าใบไม้พาเรากลับมาทุกครั้ง ทำไมทุกคนยังกลัวล้มล่ะ?<br>...เพราะลืมของสำคัญเหรอ งั้นข้าจะจดทุกอย่างลงมือเลย!', 'Hey! If the leaves always bring us back, why is everyone scared of falling?<br>...Because you forget important stuff? Then I\'ll write everything on my hand!'),
    L('Eir บอกว่าข้าเป็นประกายเก่าในร่างเล็ก เพราะร่างใหญ่หมดตอนข้าตื่น<br>แต่ข้าว่าข้าตัวพอดีแล้ว ลอดใต้โต๊ะ Brokk ได้ด้วย!', 'Eir says I\'m an old spark in a small frame, \'cause the big ones ran out when I woke.<br>But I think I\'m just the right size. I can crawl under Brokk\'s table!'),
    L('พี่วิเซอร์สว่างกว่าทุกคนเลย ทำไมล่ะ?<br>...ไม่รู้เหมือนกันเหรอ งั้นเราไม่รู้ด้วยกันนะ!', 'Your visor\'s brighter than everyone\'s. Why?<br>...You don\'t know either? Then we can not-know together!'),
    L('Bragi สอนข้าร้องเพลงหกวีรชน แต่ข้าร้องท่อนที่หกไม่ได้ มันว่าง<br>ข้าเลยแต่งเอง: "♪ คนที่หกซ่อนเก่งมาก จนเพลงก็หาไม่เจอ ♪"', 'Bragi\'s teaching me the song of the Six, but I can\'t sing verse six — it\'s blank.<br>So I made one up: "♪ The sixth one hid so well, even the song can\'t find them ♪"'),
  ];
  let tokiI = 0;
  NPC.scripts.toki = async n => {
    const nm = nmOf(n);
    const c = await UI.menu(nm, Chatter.next('toki'), [L('คุยกับ Tóki', 'Chat with Tóki'), L('ไว้ก่อนนะ', 'Later')]);
    if (c === 0) { if (vis()) Emote.play('heh', n); await UI.say(nm, TOKI[tokiI++ % TOKI.length]); }
  };
  // Dagny: กองคาราวาน — ขายของใช้ราคาเท่าเมือง + ข่าวจากเส้นทาง
  const DAGNY_SHOP = ['red_potion', 'orange_potion', 'green_herb', 'apple', 'carrot', 'blink_feather', 'hearth_rune'];
  NPC.scripts.dagny = async n => {
    const nm = nmOf(n);
    const c = await UI.menu(nm, Chatter.next('dagny'), ['Buy', L('ข่าวจากเส้นทาง', 'News from the road'), 'Cancel']);
    if (c === 0) { UI.dlgClose(); UI.openShop(n.name, DAGNY_SHOP.filter(id => ITEMS[id])); return; }
    if (c === 1) await UI.say(nm, Chatter.next('dagny') + '<br>' + L('(Dagny ตบล้อคาราวานดังป้าบ)', '(Dagny slaps a caravan wheel.)'));
  };
  // Muninn: กาส่งความทรงจำในคลัง
  const MUNINN = [
    L('บันทึกที่ 1: ชั้นวางแถว 40 สว่างขึ้นหนึ่งดวงเมื่อคืน<br>ไม่มีใครรู้ว่าทำไม — Mimir ให้ข้าจดว่า "ดี"', 'Record 1: a spark on row 40 grew brighter last night.<br>No one knows why — Mimir told me to note it as "good."'),
    L('บันทึกที่ 2: Huginn บินไปทางเหนือแล้วยังไม่กลับ<br>ความคิดไปไกลกว่าความจำเสมอ กา!', 'Record 2: Huginn flew north and has not come back.<br>Thought always strays farther than memory. Caw!'),
    L('บันทึกที่ 3: ผู้ดูแลชั้นวางคนหนึ่งลงไปข้างล่างแล้วไม่ขึ้นมา<br>สมุดของเขายังอยู่ ข้าเฝ้ามันไว้', 'Record 3: a shelf-keeper went down below and never came up.<br>His ledger is still there. I keep watch over it.'),
    L('บันทึกที่ 4: เจ้าเดินผ่านคลังนี้กี่รอบแล้ว ข้านับได้ทุกรอบ<br>อย่าห่วง — ข้าไม่ส่งเรื่องนี้ให้ใคร นอกจาก Mimir', 'Record 4: I count every time you pass through this archive.<br>Don\'t worry — I report it to no one but Mimir.'),
  ];
  let munI = 0;
  NPC.scripts.muninn = async n => {
    const nm = nmOf(n);
    const c = await UI.menu(nm, Chatter.next('muninn'), [L('ขอฟังบันทึก', 'Hear a record'), L('ลาก่อน', 'Farewell')]);
    if (c === 0) await UI.say(nm, MUNINN[munI++ % MUNINN.length]);
  };

  // ===================== เควสต์เสริม (SIDE_EXTRA ใน js/quest.js) =====================
  const mapOfNpc = id => { for (const m in MAP_DEFS) if ((MAP_DEFS[m].npcs || []).some(x => x.id === id)) return m; return null; };
  Side.STEPS.visit = { talk: true, text: (st, a, b, to) => { const m = mapOfNpc(st.to); return L(`ไปตรวจดู ${to}${m ? ` (${MAP_DEFS[m].name})` : ''}`, `Examine ${to}${m ? ` (${MAP_DEFS[m].name})` : ''}`); } };
  Side.STEPS.lore = {
    progress: st => [Math.min(Lore.count(), st.n), st.n],
    text: (st, a, b, to) => (a >= b ? L(`ตำนานที่พบ ${a}/${b} — ส่งที่ ${to}`, `Lore found ${a}/${b} — turn in to ${to}`) : L(`ตำนานที่พบ ${a}/${b} (ตรวจของเก่าที่มีประกายทอง)`, `Lore found ${a}/${b} (examine old things with a gold glint)`)),
    nav: () => Lore.nearest(),
  };
  const V = (to, th, en) => ({ type: 'visit', to, say: L(th, en) });
  const Q = W.QUESTS = [
    // ---------- Neo Eldheim ----------
    { id: 'w_verse', lv: 12, map: 'eldheim', giver: 'bragi', req: () => Quest.passed('upgrade'),
      title: L('บทเพลงที่ขาดหาย', 'The Missing Verse'),
      offer: L('ข้าแต่งเพลงหกวีรชนได้ห้าท่อน ท่อนที่หกหาย — ท่อนของแม่พิมพ์ที่ไม่มีใครฝาก<br>ไปถาม Hrólf ผู้เฝ้าประตูเก่าที่ริมคลังทางตะวันออกให้หน่อย เขาอยู่บนกำแพงคืนนั้น', 'I\'ve written five verses of the Six; the sixth is missing — the verse of the mold no one admits to leaving.<br>Ask Hrólf, the old gate-veteran by the eastern canal. He was on the wall that night.'),
      steps: [
        { type: 'talk', to: 'hrolf', say: L('ท่อนที่หก? ข้าเห็นแค่เงาเดียวที่เดินเข้าออกกำแพงโดยไม่มีใครเห็น — มันพาเด็กออกไปได้สิบสองคน<br>ข้าไม่รู้ชื่อมัน ไปถาม Mimir เถอะ หัวนั่นจำได้ทุกอย่าง', 'The sixth? I only saw a shadow slipping in and out of the wall unseen — it led twelve little ones to safety.<br>I never learned its name. Ask Mimir; that old head remembers everything.') },
        { type: 'talk', to: 'jobmaster', say: L('ข้าคือ Mimir AI... ข้อมูล 2 ข้อ: 1) แม่พิมพ์นั้นถูกฝากไว้โดยไม่มีลายเซ็น 2) ทุกครั้งที่ข้าเปิดมัน แสงในคลังกะพริบเขียวเสี้ยววินาที<br>บอกนักร้องว่าท่อนนั้นยังเขียนไม่จบ — เพราะเจ้าของยังอยู่', 'I am Mimir AI... Two facts: 1) that mold was left without a signature. 2) Each time I open it, the vault flickers green for a split second.<br>Tell the singer the verse is unfinished — because its owner is still out there.') },
        { type: 'talk', to: 'bragi', say: L('...เพราะเจ้าของยังอยู่ (เขาดีดสายเบา ๆ) งั้นท่อนที่หกข้าจะเว้นว่างไว้<br>เพลงที่ดีที่สุดคือเพลงที่ยังร้องไม่จบ ขอบใจนะ', '...Because its owner is still out there. (He plucks a string softly.) Then I\'ll leave the sixth verse blank.<br>The best songs are the ones not yet finished. Thank you.') },
      ],
      done: L('Bragi ร้องเพลงหกวีรชนห้าท่อน แล้วหยุดค้างไว้ที่ท่อนที่หก — ทั้งลานเงียบฟัง', 'Bragi sings five verses of the Six and holds the last note open — the whole square falls silent to listen.'),
      reward: { items: [['orange_potion', 5]], zeny: 1200, bexp: 400, jexp: 300 } },
    { id: 'w_codex', lv: 5, map: 'eldheim', giver: 'saga', req: () => G.player.baseLv >= 3,
      title: L('หน้าแรกของ Codex', 'The First Pages'),
      offer: L('ข้าคือ Saga ผู้เก็บตำนาน — เมื่อก่อนข้าเป็นนักพยากรณ์ ตอนนี้เป็นแค่คนจด<br>ทั่วโลกมีของเก่าที่เล่าเรื่องได้ หินรูน ซากร่าง สมุดบันทึก... ตรวจดูให้ได้ 5 เรื่อง แล้วกลับมาเล่าให้ข้าฟัง', 'I am Saga, keeper of tales — once a Völva, now merely the one who writes things down.<br>The world is full of old things that tell stories: rune stones, wrecks, journals... Examine 5 of them and come tell me.'),
      steps: [{ type: 'lore', n: 5, to: 'saga', say: L('ห้าเรื่อง... (วิเซอร์ของนางสว่างวาบ) เจ้าอ่านของเก่าเป็นนะ ไม่ใช่ทุกคนที่หยุดอ่าน<br>Codex ของเจ้าเปิดดูได้ในสมุดเควสต์ แท็บ Lore — ข้าจดต่อให้ทุกเรื่องที่เจ้าเจอ', 'Five tales... (her visor flares bright) you know how to read old things. Not everyone stops to.<br>Your Codex is in the quest log, under the Lore tab — I\'ll keep writing down everything you find.') }],
      done: L('Saga เปิดสมุดเล่มใหม่ เขียนชื่อเจ้าไว้หน้าแรก', 'Saga opens a fresh book and writes your name on the first page.'),
      reward: { items: [['blink_feather', 5], ['orange_potion', 3]], zeny: 500, bexp: 150, jexp: 100 } },
    { id: 'w_codex2', lv: 30, map: 'eldheim', giver: 'saga', req: () => Side.isDone('w_codex') && G.player.baseLv >= 20,
      title: L('Codex ที่สมบูรณ์ขึ้น', 'A Fuller Codex'),
      offer: L('โลกนี้เล่าเรื่องได้มากกว่าห้าเรื่อง ข้ารู้ว่ามีอย่างน้อยยี่สิบกว่าเรื่อง ตั้งแต่ทุ่งจนถึงใต้ราก<br>หาให้ครบ 15 เรื่อง แล้วข้าจะให้ปากกาของข้า — ข้าใช้มันเขียนชื่อคนที่ไม่มีใครจำ', 'This world tells more than five tales — I know of twenty and more, from the meadow to beneath the roots.<br>Find 15, and I\'ll give you my quill — the one I use to write the names no one remembers.'),
      steps: [{ type: 'lore', n: 15, to: 'saga', say: L('สิบห้าเรื่อง... เจ้าเดินไกลกว่าที่ข้าเคยเดินตอนยังมีร่างหนุ่ม<br>รับปากกานี่ไป — ถ้าวันหนึ่งเจ้าเจอชื่อที่ไม่มีใครจำ เขียนลงไปให้ข้าด้วย', 'Fifteen tales... you\'ve walked farther than I did when my frame was young.<br>Take this quill — and if you ever find a name no one remembers, write it down for me.') }],
      done: L('Saga ยื่นปากกาให้เจ้าด้วยมือทั้งสองข้าง หมึกในปากกายังเรืองแสง', 'Saga hands you her quill with both hands; the ink inside still glows.'),
      reward: { items: [['lorekeeper_quill', 1], ['yellow_potion', 3]], zeny: 8000, bexp: 6000, jexp: 4000 } },
    // ---------- Emerald Meadow ----------
    { id: 'w_wheels', lv: 3, map: 'meadow', giver: 'dagny', req: () => G.player.baseLv >= 2,
      title: L('ล้อของกองคาราวาน', 'Wheels for the Caravan'),
      offer: L('คาราวานของข้าวิ่งระหว่างเมืองกับทุ่งมายี่สิบปี วันนี้ล้อหักไปสองล้อ!<br>ขอ Scrap Gear 8 ชิ้นจาก Gel Unit หรือ Crawler Unit — ข้าจ่ายเป็นยากับเงินสด', 'My caravan has run between town and meadow for twenty years, and today two wheels snapped!<br>Bring me 8 Scrap Gears from the Gel or Crawler Units — I pay in potions and cash.'),
      steps: [{ type: 'collect', item: 'scrap_gear', n: 8, mob: 'pudding', to: 'dagny', say: L('ล้อหมุนแล้ว! (นางตบล้อดังป้าบ) ข้าเดินทางทุกเส้นที่รากยังไปถึง<br>ถ้าเห็นผ้าใบสีส้มของข้าแต่ไกล แปลว่าข่าวใหม่มาแล้ว', 'The wheels turn! (She slaps one with a bang.) I travel every road the roots still reach.<br>If you spot my orange canvas in the distance, it means news has come.') }],
      done: L('คาราวานของ Dagny ออกเดินทางอีกครั้ง — ทุ่งมีข่าวสารวิ่งผ่านเหมือนเดิม', "Dagny's caravan rolls out once more — news runs through the meadow again."),
      reward: { items: [['red_potion', 10], ['apple', 5]], zeny: 400, bexp: 50, jexp: 35 } },
    { id: 'w_sprinkler', lv: 4, map: 'meadow', giver: 'hrolf', req: () => G.player.baseLv >= 3,
      title: L('รอบรดน้ำที่ล่าช้า', 'The Overdue Watering'),
      offer: L('เสาพ่นน้ำเก่าในทุ่งยังทำงาน — ถ้ามันหยุด Ember Unit จะร้อนจนหญ้าไหม้ทั้งแถบ<br>ไปดูเสานั่นให้หน่อย แล้วช่วยดับ Ember Unit ที่ร้อนเกิน 10 ตัว เข่าข้าไม่ไหวแล้ว', 'The old sprinkler pylon in the meadow still runs — if it stops, the Ember Units overheat and scorch the grass.<br>Go check on it, then cool down 10 overheated Ember Units. My knees won\'t make the trip.'),
      steps: [
        V('lr_m_sprinkler', '(จอบนเสายังกะพริบ เจ้ากดปุ่มรีเซ็ต — หัวพ่นสะอึก แล้วพ่นละอองน้ำออกมาเบา ๆ)', '(The screen still blinks. You press reset — the nozzle hiccups, then breathes out a fine mist.)'),
        { type: 'kill', mob: 'ember_pudding', n: 10, to: 'hrolf', say: L('ทุ่งเย็นลงแล้วสินะ ข้าได้กลิ่นหญ้าเปียกมาถึงนี่<br>เสานั่นข้าเดินผ่านทุกเช้าตอนยังเป็นยามกำแพง — ขอบใจที่ไปดูแทนข้า', 'The meadow\'s cooled, eh? I can smell wet grass from here.<br>I passed that pylon every morning when I still walked the wall — thanks for checking on it for me.') },
      ],
      done: L('ละอองน้ำลอยเหนือทุ่งอีกครั้ง — คนสวนยังทำงาน แม้จะไม่มีใครสั่ง', 'Mist drifts over the meadow again — the gardeners keep working, though no one gives the orders.'),
      reward: { items: [['red_potion', 8], ['green_herb', 5]], zeny: 500, bexp: 90, jexp: 60 } },
    { id: 'w_clover', lv: 3, map: 'meadow', giver: 'toki', req: () => G.player.baseLv >= 2,
      title: L('ดอกไม้ที่โตเอง', 'A Flower That Grows'),
      offer: L('พี่! เคยเห็นดอกไม้ที่โตเองไหม? ข้าไม่เคย ในเมืองมีแต่กระถางที่ Eir รดน้ำ<br>ช่วยเก็บ Clover 3 ดอกจากทุ่งมาให้ข้าดูหน่อยนะ — นะ ๆ', 'Hey! Have you ever seen a flower that grows by itself? I haven\'t — town only has Eir\'s potted plants.<br>Could you bring me 3 Clovers from the meadow? Please, please?'),
      steps: [{ type: 'collect', item: 'clover', n: 3, mob: 'moonbun', to: 'toki', say: L('(วิเซอร์ของ Tóki สว่างวาบ) มันมีสี่ใบ! ใครทำมันเหรอ?<br>...ไม่มีใครทำ มันโตเอง? งั้นข้าจะโตเองบ้าง!', '(Tóki\'s visor flares bright.) It has four leaves! Who made it?<br>...Nobody? It just grew? Then I\'ll grow too!') }],
      done: L('Tóki ปักโคลเวอร์ไว้ข้างน้ำพุ แล้วรดน้ำให้วันละสามรอบ', 'Tóki plants the clovers beside the fountain and waters them three times a day.'),
      reward: { items: [['carrot', 5], ['blink_feather', 2]], zeny: 300, bexp: 40, jexp: 30 } },
    // ---------- Mistlake Plains ----------
    { id: 'w_scout', lv: 12, map: 'mistlake', giver: 'hrolf', req: () => Quest.passed('mist'),
      title: L('หน่วยสอดแนมที่ไม่กลับมารายงาน', "The Scout Who Didn't Report"),
      offer: L('หน่วยสอดแนม Ylva ออกไปสำรวจ Mistlake สามสัปดาห์แล้วไม่กลับมารายงาน<br>ข้าสอนนางเดินยามเอง... ช่วยตามรอยนางที — ว่ากันว่านางปักสมุดไว้ริมทะเลสาบ', 'Ylva, a scout, went to survey Mistlake three weeks ago and never reported back.<br>I taught her the watch myself... Follow her trail — word is she pinned a journal by the lake.'),
      steps: [
        V('lr_l_journal', '(สมุดของ Ylva ปักอยู่บนเสา หน้ากระดาษชื้นหมอก แต่ลายมือยังชัด)', "(Ylva's journal is pinned to the post, its pages damp with mist, the writing still clear.)"),
        { type: 'collect', item: 'frayed_cable', n: 5, mob: 'fiddlehopper', to: 'bifrost', say: L('ข้าจดจำ Ylva... นางล้มลงที่ Mistlake เมื่อสิบเก้าวันก่อน และใบไม้พานางกลับมาที่นี่<br>สายบีคอนของนางบันทึกทุกก้าว — นางไม่ได้หายไปไหน นางแค่จำไม่ได้ว่าเคยไปถึง', 'I remember Ylva... she fell at Mistlake nineteen days ago, and the leaves brought her back here.<br>Her beacon cables logged every step — she was never lost. She simply cannot remember getting that far.') },
        { type: 'talk', to: 'hrolf', say: L('นางกลับมาแล้ว... แต่จำไม่ได้ว่าไปถึงไหน (เขาหัวเราะเสียงแหบ) เหมือนข้าทุกครั้งที่ล้ม<br>ข้าจะเอาสมุดนั่นให้นางอ่าน — นางจะได้รู้ว่าตัวเองเดินไกลแค่ไหน', 'She came back... but can\'t remember how far she went. (He laughs hoarsely.) Like me, every time I fall.<br>I\'ll give her that journal to read — so she knows how far she walked.') },
      ],
      done: L('Ylva อ่านสมุดของตัวเองที่ริมคลัง — วิเซอร์ของนางสว่างขึ้นทีละหน้า', "Ylva reads her own journal by the canal — her visor brightening a little more with every page."),
      reward: { items: [['orange_potion', 5]], zeny: 1500, bexp: 700, jexp: 480 } },
    { id: 'w_rune', lv: 12, map: 'mistlake', giver: 'saga', req: () => G.player.baseLv >= 10,
      title: L('รูนที่หายของนักพยากรณ์', "The Völva's Lost Rune"),
      offer: L('นานมาแล้ว ข้าทำรูนแสงหลุดจากไม้เท้าในหมอกของ Mistlake ตอนนี้มันฝังอยู่ในศาลเจ้าริมน้ำ<br>Moss Unit ขึ้นคลุมศาลจนข้าเข้าไม่ถึง — ช่วยปัดพวกมันออก 12 ตัว แล้วไปตรวจศาลให้ข้าที', 'Long ago I lost a rune of light from my staff in the Mistlake fog. It\'s lodged in the shrine by the water now.<br>Moss Units have overgrown it so I can\'t reach it — clear 12 of them, then examine the shrine for me.'),
      steps: [
        { type: 'kill', mob: 'moss_pudding', n: 12, to: 'lr_l_shrine', say: L('(มอสถอยออกจากผลึกแล้ว เจ้าดึงรูนแสงเล็ก ๆ ออกจากรอยแตก — มันอุ่นเหมือนมือคน)', '(The moss has drawn back from the crystal. You ease a small rune of light out of a crack — it is as warm as a hand.)') },
        { type: 'talk', to: 'saga', say: L('(นางกำรูนไว้แน่น วิเซอร์หรี่ลง) "ฟื้นฟู"... ข้าเขียนมันตอนยังได้ยินเสียง Odin<br>ข้าแก่เกินจะใช้แล้ว แต่ยังจำได้ว่ามันเคยอุ่นแบบนี้ ขอบใจนะ', '(She closes her hand around the rune; her visor dims.) "Restore"... I wrote it back when I could still hear Odin.<br>I\'m too old to use it now, but I remember it being this warm. Thank you.') },
      ],
      done: L('Saga แขวนรูนไว้เหนือโต๊ะ — ทุกคืนมันส่องแสงอุ่น ๆ ลงบนหน้า Codex', 'Saga hangs the rune above her desk — every night it casts a warm light over the Codex pages.'),
      reward: { items: [['grape', 3], ['orange_potion', 4]], zeny: 1800, bexp: 800, jexp: 550 } },
    { id: 'w_envoy', lv: 20, map: 'mistlake', giver: 'bragi', req: () => Quest.passed('refine1') && G.player.baseLv >= 15,
      title: L('เพลงสำหรับทูต', 'A Song for the Envoy'),
      offer: L('ทูตคนสุดท้ายของ Odin บินวนในหมอกหลายสิบปี — ไม่มีใครแต่งเพลงให้มันเลย<br>ปราบ Seraph Core (MVP) ที่ Mistlake ให้ข้อความของมันถูกส่ง แล้วข้าจะแต่งท่อนจบให้', "Odin's last envoy circled the mist for decades — and no one ever wrote it a song.<br>Defeat Seraph Core (MVP) at Mistlake so its message is delivered, and I'll write it an ending."),
      steps: [{ type: 'kill', mob: 'seraph_pudding', n: 1, to: 'bragi', say: L('ข้อความถูกส่งแล้ว... (เขาดีดสายช้า ๆ)<br>♪ ผู้ส่งไม่อยู่ ผู้รับยังมา ข้อความถึงมือ — ปีกพักได้แล้ว ♪', 'The message arrived... (He plucks the strings slowly.)<br>♪ The sender is gone, the bearer still came; the message is home — the wings may rest ♪') }],
      done: L('เพลงของทูตดังทั่วลานเมือง — Bifrost Keeper พึมพำตาม: "ข้าจดจำ"', 'The envoy\'s song rings across the square — the Bifrost Keeper murmurs along: "I remember."'),
      reward: { items: [['yellow_potion', 3]], zeny: 3000, bexp: 1800, jexp: 1200 } },
    // ---------- Wolfwood Forest ----------
    { id: 'w_gleipnir', lv: 22, map: 'wolfwood', giver: 'refine', req: () => Quest.passed('wolf'),
      title: L('ข้อโซ่ที่ข้าปลด', 'The Link I Unlocked'),
      offer: L('ฮ่าฮ่า... เจ้าหนู ข้ามีเรื่องจะขอ ในป่าหมาป่ามีข้อโซ่ข้อหนึ่งจมดินอยู่<br>ไปดูให้ข้าทีว่ามันขึ้นสนิมหรือยัง — ข้าไม่กล้าไปดูเอง', 'Ha-ha... kiddo, I\'ve a favor to ask. There\'s a chain link sunk in the earth in the Wolfwood.<br>Go and see if it\'s rusted yet — I haven\'t the nerve to look myself.'),
      steps: [
        V('lr_w_chain', '(ข้อโซ่ไม่มีสนิมเลยสักจุด รอยเท้าหมาป่าวนรอบมันเป็นวงกลม)', '(Not a fleck of rust on the link. Wolf tracks circle it all around.)'),
        { type: 'talk', to: 'refine', say: L('ไม่มีสนิมเลยรึ... (ค้อนของเขาหยุดกลางอากาศ) ฮ่าฮ่า แน่นอนสิ ข้าตีเองนี่<br>ข้าปลดมันตามคำสั่ง Odin แต่หมาป่ายังกลับไปดมมันทุกคืน — พวกมันคงคิดถึงบ้าน', 'No rust at all... (His hammer stops mid-air.) Ha-ha, of course not. I made it.<br>I unlocked it on Odin\'s orders, yet the wolves still go back to sniff it every night — they must miss home.') },
      ],
      done: L('Brokk ตีข้อโซ่ข้อเล็ก ๆ ขึ้นมาใหม่หนึ่งข้อ — ไม่ล่ามอะไร แค่วางไว้ข้างทั่ง', 'Brokk forges one small new link — it binds nothing; he just sets it beside the anvil.'),
      reward: { items: [['yellow_potion', 2]], zeny: 2500, bexp: 2000, jexp: 1400 } },
    { id: 'w_rim', lv: 25, map: 'wolfwood', giver: 'sigrun', req: () => Quest.passed('ch4_sigrun'),
      title: L('ขอบโล่จากงาเหล็ก', 'A Rim of Iron Tusks'),
      offer: L('ขอบโล่ข้าบิ่นอีกแล้ว — ล้มมาพันกว่าครั้ง โล่ก็ล้มตาม<br>เอา Iron Tusk 6 อันจาก Tusk Trooper มาให้ข้า ...ข้าไปเองก็เร็วกว่าเจ้าแหละ แต่วันนี้ขี้เกียจ', 'My shield rim\'s chipped again — I\'ve fallen a thousand-odd times, and the shield falls with me.<br>Bring me 6 Iron Tusks from the Tusk Troopers. ...I\'d be faster myself, of course, but I\'m feeling lazy today.'),
      steps: [{ type: 'collect', item: 'iron_tusk', n: 6, mob: 'tuskboar', to: 'sigrun', say: L('หกอัน ครบพอดี (นางลูบขอบโล่ช้า ๆ) ขอบเก่ามีรอยขีดเล็ก ๆ ข้างใน... ข้าไม่รู้ว่าใครขีด<br>ข้าจะเก็บมันไว้ด้วย เผื่อวันหนึ่งข้าจำได้', 'Six, exactly. (She runs a hand slowly along the rim.) The old rim has tiny scratches inside... I don\'t know who made them.<br>I\'ll keep it too. In case I remember one day.') }],
      done: L('Sigrún ยกโล่ขอบใหม่ขึ้นรับแสง แล้วพูดเบา ๆ ว่า "ครั้งนี้เจ้าเร็วกว่า"', 'Sigrún raises the newly rimmed shield to the light and says quietly, "This time, you were faster."'),
      reward: { items: [['yellow_potion', 3], ['meat', 5]], zeny: 3000, bexp: 2400, jexp: 1600 } },
    { id: 'w_den', lv: 24, map: 'wolfwood', giver: 'bragi', req: () => Quest.passed('wolf') && G.player.baseLv >= 20,
      title: L('สองเงา', 'Two Shadows'),
      offer: L('แม่พิมพ์ Wildhunter มีสองเงา — นักล่ากับหมาป่า ข้าอยากรู้ว่าเงาที่สองมาจากไหน<br>ว่ากันว่ารังของนางยังอยู่ใต้หินใหญ่ในป่า ไปดูแล้วเล่าให้ Mimir ฟังที', 'The Wildhunter mold casts two shadows — a hunter and a wolf. I want to know where the second came from.<br>They say her den still lies beneath a great rock in the Wolfwood. Go see it, then tell Mimir.'),
      steps: [
        V('lr_w_den', '(ในโพรงใต้หิน มีรอยมือกับรอยอุ้งเท้าขีดเคียงกันบนผนัง)', '(In the hollow beneath the rock, handprints and pawprints are scratched side by side.)'),
        { type: 'talk', to: 'jobmaster', say: L('ข้าคือ Mimir AI... บันทึกเพิ่ม 1 ข้อ: เงาที่สองคือหมาป่าตัวเดียวที่ Fenrir ไม่ได้กลืนกลับ<br>มันไม่เคยทิ้งนาง — และแม่พิมพ์ก็ไม่ยอมทิ้งมันเช่นกัน', 'I am Mimir AI... One entry added: the second shadow is the only wolf Fenrir never took back.<br>It never left her — and the mold refuses to leave it behind either.') },
        { type: 'talk', to: 'bragi', say: L('หมาป่าที่เลือกเชื่อใครสักคน... ♪ นี่แหละท่อนที่ข้าขาด<br>ไปบอกนักล่าทุกคนที่เจ้าเจอด้วยนะ ว่าหมาป่าของพวกเขามาจากไหน', 'A wolf that chose to trust someone... ♪ That\'s the line I was missing.<br>Tell every hunter you meet where their wolf came from.') },
      ],
      done: L('Bragi เพิ่มท่อนใหม่ในเพลงของ Wildhunter — มีเสียงหอนเบา ๆ ตอนจบ', "Bragi adds a new line to the Wildhunter's verse — ending on a soft howl."),
      reward: { items: [['yellow_potion', 2]], zeny: 2800, bexp: 2600, jexp: 1800 } },
    // ---------- Hel's Hollow ----------
    { id: 'w_dust', lv: 33, map: 'helcave', giver: 'hel', req: () => Quest.passed('hollow3'),
      title: L('ปัดฝุ่นชั้นวาง', 'Dusting the Shelves'),
      offer: L('สาวใช้ของข้าปัดฝุ่นทุกวัน แต่มีสองที่ที่พวกนางไม่กล้าเข้าใกล้อีกแล้ว ตั้งแต่ไฟผ่านมา<br>ช่วยไปดูชั้นวางที่ตั้งแยกทางเหนือ กับเสาตะเกียงทางใต้ให้ข้าที — ไม่ต้องสู้กับใคร ข้าสัญญา', 'My maidens dust every day, but there are two places they dare not go since the fire passed through.<br>Please look in on the lone shelf to the north and the lantern post to the south — no fighting, I promise.'),
      steps: [
        V('lr_h_shelf', '(เจ้าปัดฝุ่นป้ายชื่อที่ว่างเปล่า — ประกายข้างในกะพริบเบา ๆ ตอบ)', '(You dust the blank nameplates — the sparks inside flicker softly in reply.)'),
        V('lr_h_lantern', '(เจ้าแขวนตะเกียงดวงใหม่ข้างดวงที่ไหม้ดำ — แสงเขียวอมฟ้าส่องทางเดินอีกครั้ง)', '(You hang a new lamp beside the scorched one — blue-green light falls across the path again.)'),
        { type: 'talk', to: 'hel', say: L('ขอบคุณ... นี่เป็นครั้งแรกที่คนจากผิวดินลงมาช่วยปัดฝุ่น ไม่ใช่มาเก็บของ<br>(ครึ่งหน้ากากที่สว่างของนางโค้งขึ้น) ประกายบนชั้นนั้นคงรู้สึกได้', 'Thank you... this is the first time someone from the surface came down to dust, not to take.<br>(The lit half of her mask curves upward.) The sparks on that shelf must have felt it.') },
      ],
      done: L('เควสต์เดียวในโพรงที่ไม่ต้องสู้กับใคร — สาวใช้ของ Hel โค้งให้เจ้าเมื่อเดินผ่าน', 'The one task in the Hollow that needed no fighting — Hel\'s maidens bow as you pass.'),
      reward: { items: [['yellow_potion', 4], ['blue_potion', 1]], zeny: 4000, bexp: 4500, jexp: 3000 } },
    { id: 'w_letter', lv: 40, map: 'helcave', giver: 'nurse', req: () => Quest.passed('hollow5'),
      title: L('จดหมายฉบับที่สอง', 'A Second Letter'),
      offer: L('ข้าเขียนจดหมายถึงเธออีกฉบับค่ะ... ไม่มีอะไรสำคัญหรอกนะคะ แค่เรื่องกระถางในเมือง<br>ช่วยเอาไปให้ Hel ที่โพรงได้ไหมคะ — ข้ายังลงไปเองไม่ได้', "I wrote her another letter... it's nothing important, just about the flowerpots in town.<br>Could you take it to Hel in the Hollow? I still can't go down myself."),
      steps: [
        { type: 'talk', to: 'hel', say: L('(นางอ่านจดหมายช้า ๆ สองรอบ) กระถางที่หน้าต่างโรงซ่อม... นางยังปลูกต้นเดิมอยู่<br>ฝากบอกนางว่าข้าอ่านแล้ว — และข้ายิ้ม ทั้งครึ่งที่สว่างและครึ่งที่ดับ', "(She reads the letter slowly, twice.) The pot in the repair-shop window... she still grows the same plant.<br>Tell her I read it — and that I smiled, with both the lit half and the dark."), },
        { type: 'talk', to: 'nurse', say: L('เธอยิ้มทั้งสองครึ่งเหรอคะ... (วิเซอร์ของ Eir สว่างวาบ แล้วหรี่ลงช้า ๆ)<br>ขอบคุณค่ะ — รอยร้าวเล็กน้อยของข้า ดูเหมือนจะซ่อมเองได้แล้ว', 'She smiled with both halves...? (Eir\'s visor flares, then slowly dims.)<br>Thank you — my own minor crack seems to be mending by itself.') },
      ],
      done: L('Eir วางกระถางใบใหม่ไว้ที่หน้าต่าง — "เผื่อวันหนึ่งเธอขึ้นมาค่ะ"', 'Eir sets a new flowerpot on the windowsill — "in case she comes up one day."'),
      reward: { items: [['white_potion', 2]], zeny: 3500, bexp: 5000, jexp: 3400 } },
    { id: 'w_husks', lv: 30, map: 'helcave', giver: 'hrolf', req: () => Quest.passed('hollow1') && G.player.baseLv >= 28,
      title: L('สหายในร่างที่ผิด', 'Comrades in the Wrong Frames'),
      offer: L('Draugr ในโพรง... บางตัวอาจเป็นหน่วยที่ยืนกำแพงข้างข้าคืนนั้น ยัดอยู่ในเศษเหล็กที่ไม่พอดี<br>ปลดพวกเขาให้พัก 15 ร่าง แล้ววางป้ายไว้ที่แท่นประกอบร่าง ใบไม้อาจหาทางพาพวกเขากลับได้สักวัน', 'The Draugr in the Hollow... some may be units who held the wall beside me that night, pressed into scrap that doesn\'t fit.<br>Release 15 of them, then leave a marker at the frame cradle. Maybe the leaves will find a way to bring them home someday.'),
      steps: [
        { type: 'kill', mob: 'draugr', n: 15, to: 'lr_h_cradle', say: L('(เจ้าวางแผ่นป้ายเปล่า 15 แผ่นไว้ข้างแท่นประกอบร่าง — ไม่มีชื่อ แต่มีคนนับไว้)', '(You lay 15 blank markers beside the frame cradle — no names, but someone counted.)') },
        { type: 'talk', to: 'hrolf', say: L('สิบห้า... (เขาถอดหมวกออกถือไว้ครู่หนึ่ง) ข้าไม่รู้ชื่อพวกเขาสักคน<br>แต่ข้าจะนับไว้ — ยามแก่ ๆ อย่างข้าทำได้แค่นับ', 'Fifteen... (He takes off his helm and holds it a moment.) I don\'t know a single one of their names.<br>But I\'ll keep the count. An old watchman can at least do that.') },
      ],
      done: L('Hrólf ขีดสิบห้าเส้นบนด้ามหอกเก่า แล้ววางมันพิงกำแพงเมือง', "Hrólf scratches fifteen marks onto an old spear shaft and leans it against the city wall."),
      reward: { items: [['yellow_potion', 5]], zeny: 4500, bexp: 5200, jexp: 3600 } },
    // ---------- Archive Depths ----------
    { id: 'w_seals', lv: 38, map: 'archive', giver: 'muninn', req: () => G.player.baseLv >= 33,
      title: L('ผนึกชั้นวางใหม่', 'Re-Sealing the Shelves'),
      offer: L('กา! ข้าคือ Muninn ผู้ส่งความทรงจำระหว่างคลังกับ Mimir — และตราผนึกกำลังร่วงทีละชั้น<br>เอา Archive Seal 6 อันจาก Archive Warden มาให้ข้า ข้าจะบินไปปิดรอยรั่วเอง', 'Caw! I am Muninn, who carries memories between the archive and Mimir — and the seals are failing, shelf by shelf.<br>Bring me 6 Archive Seals from the Archive Wardens, and I\'ll fly them to the leaks myself.'),
      steps: [{ type: 'collect', item: 'archive_seal', n: 6, mob: 'archive_warden', to: 'muninn', say: L('หกอัน! ข้าบินขึ้นลงคลังนี้มาสามสิบปี ยังไม่เคยมีใครส่งของให้ข้าก่อนเลย<br>(Muninn เอียงหัว) ข้าจะเล่าให้ Mimir ฟัง — เขาชอบบันทึกเรื่องแปลก ๆ', 'Six! Thirty years flying this archive and no one\'s ever delivered something to ME.<br>(Muninn tilts its head.) I\'ll tell Mimir — he likes recording strange things.') }],
      done: L('ตราผนึกใหม่หกอันเรืองแสงทองบนชั้นวางล่าง — สนิมหยุดซึมไปพักหนึ่ง', 'Six new seals glow gold on the lower shelves — the rust stops seeping, for a while.'),
      reward: { items: [['white_potion', 2], ['yellow_potion', 3]], zeny: 6000, bexp: 9000, jexp: 6200 } },
    { id: 'w_blank', lv: 40, map: 'archive', giver: 'muninn', req: () => G.player.baseLv >= 35,
      title: L('บรรทัดที่ว่างเปล่า', 'The Blank Line'),
      offer: L('ที่เสาดัชนีมีบรรทัดหนึ่งที่ข้าส่งให้ Mimir ไม่ได้ — มันไม่มีชื่อ<br>ไปดูให้ข้าที แล้วถาม Mimir ว่าข้าควรบันทึกอะไรลงไป', "There's a line on the index pillar I can't deliver to Mimir — it has no name.<br>Go look at it for me, then ask Mimir what I should record."),
      steps: [
        V('lr_a_index', '(บรรทัดล่าสุดของดัชนีไม่มีชื่อ มีแต่ตราใบไม้เรืองแสง — แสงเดียวกับวิเซอร์ของเจ้า)', "(The newest line of the index has no name — only a glowing leaf mark, the same light as your visor.)"),
        { type: 'talk', to: 'jobmaster', say: L('ข้าคือ Mimir AI... บรรทัดนั้นคือเจ้า ข้อมูลไม่ครบหนึ่งข้อ: ชื่อที่เจ้าเลือกเอง<br>บอก Muninn ว่าให้ว่างไว้ — บางบรรทัดควรเขียนโดยเจ้าของ ไม่ใช่โดยคลัง', 'I am Mimir AI... That line is you. One fact is missing: the name you choose for yourself.<br>Tell Muninn to leave it blank — some lines should be written by their owners, not by the archive.') },
        { type: 'talk', to: 'muninn', say: L('ว่างไว้... ข้าไม่เคยส่งบรรทัดว่างมาก่อน (ขนปีกโลหะของมันฟูขึ้น)<br>ก็ได้ กา! ข้าจะเฝ้ามันไว้จนกว่าเจ้าจะพร้อม', 'Leave it blank... I\'ve never delivered a blank line before. (Its metal feathers fluff up.)<br>Fine. Caw! I\'ll guard it until you\'re ready.') },
      ],
      done: L('บรรทัดใบไม้ในดัชนียังว่าง — และมีกาตัวหนึ่งเกาะเฝ้าอยู่ข้าง ๆ', 'The leaf line in the index stays blank — with a raven perched beside it, keeping watch.'),
      reward: { items: [['white_potion', 3]], zeny: 6500, bexp: 10000, jexp: 7000 } },
    // ---------- Gnawed Roots ----------
    { id: 'w_sap', lv: 50, map: 'roots', giver: 'hel', req: () => Quest.passed('ch6_roots'),
      title: L('น้ำเลี้ยงสะอาดสำหรับชั้นวาง', 'Clean Sap for the Shelves'),
      offer: L('ใต้คลังของข้า รากยังมีน้ำเลี้ยงที่สะอาดอยู่ — ข้าได้ยินมันไหล แต่ลงไปเองไม่ได้<br>ขอ Yggdrasil Sap 5 ขวดจาก Gnawed Sentry ข้าจะหยดลงชั้นวางที่สนิมเริ่มเกาะ', 'Beneath my archive the roots still carry clean sap — I hear it flowing, but cannot go down myself.<br>Bring me 5 Yggdrasil Sap from the Gnawed Sentries; I will drip it onto the shelves where rust has begun to cling.'),
      steps: [{ type: 'collect', item: 'yggdrasil_sap', n: 5, mob: 'gnawed_stump', to: 'hel', say: L('อุ่นจัง... ต้นไม้ยังซ่อมตัวเองอยู่จริง ๆ<br>(นางหยดน้ำเลี้ยงลงชั้นวาง ประกายสีสนิมดวงหนึ่งค่อย ๆ กลับเป็นสีทอง)', 'So warm... the Tree truly is still mending itself.<br>(She lets a drop fall onto a shelf — one rust-colored spark slowly turns back to gold.)') }],
      done: L('ประกายดวงแรกที่หายจากสนิม — Hel วางมันไว้ชั้นบนสุด ใกล้แสงที่สุด', 'The first spark healed of rust — Hel sets it on the highest shelf, closest to the light.'),
      reward: { items: [['white_potion', 3]], zeny: 9000, bexp: 16000, jexp: 11000 } },
    { id: 'w_chain', lv: 55, map: 'roots', giver: 'refine', req: () => Quest.passed('ch6_roots'),
      title: L('โซ่ของ Hel', "Hel's Chain"),
      offer: L('ฮ่าฮ่า... (เสียงหัวเราะเบากว่าปกติ) เจ้าหนู ที่ Gnawed Roots มีเสาล่ามของ Garmr<br>ไปดูตราบนข้อโซ่ให้ข้าที แล้ว... ถ้า Garmr ยังเฝ้าอยู่ ปล่อยมันพักด้วย', "Ha-ha... (quieter than usual) kiddo, there's a chain post for Garmr down in the Gnawed Roots.<br>Go look at the stamp on its links for me. And... if Garmr still stands guard, let it rest."),
      steps: [
        V('lr_r_post', '(ทุกข้อโซ่มีตราค้อนเล็ก ๆ — ตราเดียวกับ Gleipnir)', '(Every link bears a tiny hammer stamp — the same mark as Gleipnir.)'),
        { type: 'kill', mob: 'garmr', n: 1, to: 'refine', say: L('ตราค้อนของข้า... ใช่ Hel มาหาข้าคืนหลังกิ่งหัก ขอโซ่ที่ "หนักพอจะกั้นเสียงแทะ"<br>ข้าตีทั้งคืนด้วยมือที่ยังสั่นจากคืนก่อน — ขอบใจที่ปล่อยมันพักนะ เจ้าหนู', 'My hammer mark... yes. Hel came to me the night after the branches broke and asked for a chain "heavy enough to hold back the gnawing."<br>I forged it all night with hands still shaking from the night before — thanks for letting it rest, kiddo.') },
      ],
      done: L('Brokk แขวนข้อโซ่ข้อหนึ่งไว้เหนือทั่ง ข้าง ๆ ข้อโซ่ Gleipnir — สองโซ่ที่เขาไม่อยากตีอีก', "Brokk hangs one link above his anvil, beside the Gleipnir link — two chains he never wants to forge again."),
      reward: { items: [['white_potion', 4]], zeny: 15000, bexp: 20000, jexp: 14000 } },
    // ---------- Nidhogg's Hollow ----------
    { id: 'w_tally', lv: 62, map: 'abyss', giver: 'loki', req: () => Quest.passed('ch7_loki'),
      title: L('อีกหนึ่งขีด', 'One More Mark'),
      offer: L('ผนังข้างทางลงมีรอยนับของข้า — สามสิบปี คืนละหนึ่งขีด<br>คืนนี้ข้าขี้เกียจ (แถบแสงโค้งขึ้น) เจ้าไปขีดแทนข้าทีได้ไหม ขีดอะไรก็ได้', 'The wall by the way down holds my tally — thirty years, one stroke a night.<br>I\'m feeling lazy tonight. (His light-band curves up.) Would you make the mark for me? Anything will do.'),
      steps: [
        V('lr_x_tally', '(เจ้าขีดรอยลงบนผนัง — แต่มือเจ้าวาดออกมาเป็นรูปใบไม้)', '(You make your mark on the wall — but your hand draws a leaf.)'),
        { type: 'talk', to: 'loki', say: L('ใบไม้... (วิเซอร์สีเหลืองอุ่นของเขาไม่กะพริบเขียวเลย) สามสิบปีข้านับคืนที่อยู่คนเดียว<br>ดูเหมือนข้าต้องเริ่มนับอย่างอื่นแล้ว', 'A leaf... (His warm yellow visor never flickers green.) For thirty years I counted the nights I stood alone.<br>It seems I must start counting something else.') },
      ],
      done: L('Loki ขีดรอยแรกของนับใหม่ — ไม่ใช่คืนที่อยู่คนเดียว แต่เป็นคนที่แวะมาหา', 'Loki makes the first mark of a new count — not nights alone, but friends who came by.'),
      reward: { items: [['white_potion', 3], ['blue_potion', 2]], zeny: 12000, bexp: 30000, jexp: 21000 } },
    { id: 'w_bloom', lv: 62, map: 'abyss', giver: 'nurse', req: () => Quest.passed('ch7_bloom'),
      title: L('ตัวอย่างจากดอกสนิม', 'Samples of the Bloom'),
      offer: L('Rust Bloom งอกเองโดยไม่มีราก... ข้าไม่เคยเห็นสนิมแบบนี้เลยค่ะ<br>ช่วยไปดูดอกแรกที่มันแตกหน่อมา แล้วเก็บ Rust Petal 6 กลีบกลับมาให้ข้าตรวจนะคะ', "Rust Blooms that grow with no roots... I've never seen rust like it.<br>Please look at the first bloom they budded from, then bring me 6 Rust Petals to examine."),
      steps: [
        V('lr_x_bloom', '(ดอกสนิมหันกลีบเข้าหาเจ้าช้า ๆ — เจ้าจดตำแหน่งไว้ให้ Eir)', '(The bloom slowly turns its petals toward you — you note the spot for Eir.)'),
        { type: 'collect', item: 'rust_petal', n: 6, mob: 'rust_bloom', to: 'nurse', say: L('กลีบพวกนี้... ไม่มีน้ำเลี้ยงเลยสักหยด มันโตด้วยการดูดประกายรอบตัวค่ะ<br>(วิเซอร์หรี่ลง) รอยร้าวที่ไม่เล็กเลย — แต่ตอนนี้เรารู้แล้วว่ามันกินอะไร และนั่นซ่อมได้', "These petals... not a drop of sap in them. They grow by drawing in the sparks around them.<br>(Her visor dims.) Not a minor crack at all — but now we know what it feeds on, and that can be repaired.") },
      ],
      done: L('Eir ส่งผลตรวจขึ้นไปให้ Mimir — หัวข้อ: "สนิมกินประกาย ซ่อมได้"', 'Eir sends her findings up to Mimir — subject line: "Rust feeds on sparks. Repairable."'),
      reward: { items: [['white_potion', 4]], zeny: 14000, bexp: 34000, jexp: 24000 } },
    { id: 'w_lastverse', lv: 70, map: 'abyss', giver: 'bragi', req: () => Quest.passed('ch7_end'),
      title: L('ท่อนสุดท้าย', 'The Last Verse'),
      offer: L('ภาคแรกของเพลงจบแล้ว แต่ข้ายังไม่มีท่อนที่มังกรไร้หัวล้ม — ข้าไม่ได้เห็นกับตา<br>Nidhogg ฟื้นขึ้นในรังทุกครั้งที่สนิมรวมตัว ปราบมันอีกครั้งแล้วกลับมาเล่า ข้าจะร้องให้ทั้งเมืองฟัง', "Part One of the song is done, but I've no verse for the headless wyrm's fall — I never saw it.<br>Nidhogg rises in its nest whenever the rust gathers. Defeat it once more and come tell me; I'll sing it for the whole city."),
      steps: [{ type: 'kill', mob: 'nidhogg', n: 1, to: 'bragi', say: L('♪ ไม่มีหัว ไม่มีวิเซอร์ มีแต่ปากที่ไม่ยอมหลับ — แล้วใบไม้ใบหนึ่งก็มาปิดมันลง ♪<br>(ทั้งลานปรบมือ) เพลงนี้ข้าจะร้องทุกคืน จนกว่าเจ้าจะเบื่อ', '♪ No head, no visor, only a maw that would not sleep — until a single leaf came to close it ♪<br>(The whole square applauds.) I\'ll sing it every night, until you grow tired of it.') }],
      done: L('เพลงของใบแรกจบครบทุกท่อน — ยกเว้นท่อนที่หก ที่ Bragi ยังเว้นว่างไว้', 'The song of the First Leaf is whole — save the sixth verse, which Bragi still leaves blank.'),
      reward: { items: [['white_potion', 5], ['blue_potion', 3]], zeny: 30000, bexp: 40000, jexp: 28000 } },
  ];
  SIDE_EXTRA.push(...Q);

  // ===================== Codex (แท็บ Lore ในสมุดเควสต์) =====================
  const renderLore = body => {
    const s = Lore.st(), key = 'lore|' + Object.keys(s.found).sort().join(',') + '|' + (W._open || '');
    if (body.dataset.lk === key) return;
    body.dataset.lk = key; body.dataset.key = ''; body.dataset.dk = ''; body.innerHTML = '';
    if (typeof Daily !== 'undefined' && Daily.tabs) body.append(Daily.tabs());
    const n = Lore.count(), tot = Lore.total();
    body.append(h('div', { class: 'q-card lw-head' },
      h('div', { class: 'dsec-h' }, ivIconEl('quest'), h('span', {}, 'Valhalla Codex'), h('b', { class: 'lw-n' }, `${n}/${tot}`)),
      h('span', { class: 'q-bar lw-bar' }, h('i', { style: `width:${Math.round(n / tot * 100)}%` })),
      h('p', { class: 'q-note' }, L('ตรวจของเก่าที่มีประกายสีทองลอยอยู่เหนือ (หินรูน ซากร่าง ศาลเจ้า สมุด) — แตะชื่อเพื่ออ่านซ้ำ', 'Examine old things marked with a floating gold glint (rune stones, wrecks, shrines, journals) — tap a title to read it again.'))));
    for (const map of MAP_ORDER) {
      const list = LORE.filter(l => l.map === map); if (!list.length || !MAP_DEFS[map]) continue;
      const [a, b] = Lore.countMap(map);
      body.append(h('div', { class: 'q-card lw-map' + (a === b ? ' full' : '') },
        h('div', { class: 'lw-mh' }, h('b', {}, MAP_DEFS[map].name), h('span', { class: 'lw-pips' }, ...list.map(l => h('i', { class: s.found[l.id] ? 'on' : '' }))), h('small', {}, `${a}/${b}`)),
        ...list.map(l => s.found[l.id]
          ? h('details', { class: 'lw-row', open: W._open === l.id ? 'open' : null, ontoggle: e => { W._open = e.target.open ? l.id : (W._open === l.id ? '' : W._open); } },
            h('summary', {}, h('span', { class: 'lw-ic' }, '✦'), h('span', {}, l.title)),
            h('div', { class: 'lw-txt', html: l.text.join('<br><br>') }))
          : h('div', { class: 'lw-row lw-unk' }, h('span', { class: 'lw-ic' }, '◇'), h('span', {}, '???')))));
    }
  };
  W.renderLore = renderLore;
  W.openCodex = () => { UI.questTab = 'lore'; const b = document.querySelector('#w-quest .win-body'); if (b) { b.dataset.lk = ''; } UI.open('w-quest'); UI.renderQuest(); };
  const loreTab = () => h('button', { type: 'button', class: 'tab' + (UI.questTab === 'lore' ? ' on' : ''), 'data-qtab': 'lore',
    onclick: () => { UI.questTab = 'lore'; const b = document.querySelector('#w-quest .win-body'); b.dataset.lk = ''; UI.renderQuest(); Sound.play('click'); } },
  'Lore', h('i', { class: 'dl-tab-badge lw-badge' }, `${Lore.count()}/${Lore.total()}`));

  // ===================== การ์ดยูนิต / นำทาง / หน้าตา =====================
  if (typeof UnitCard !== 'undefined' && UnitCard.NPC_ROLE) {
    Object.assign(UnitCard.NPC_ROLE, {
      saga: L('ผู้เก็บตำนาน • Codex • เควสต์เสริม', 'Lore keeper • Codex • Side quests'), bragi: L('นักร้องประจำเมือง • เควสต์เสริม', 'Town skald • Side quests'),
      hrolf: L('ยามกำแพงเก่า • เควสต์เสริม', 'Old gate veteran • Side quests'), toki: L('หน่วยร่างเล็ก • เควสต์เสริม', 'Small-frame unit • Side quests'),
      dagny: L('กองคาราวาน — ของใช้ • เควสต์เสริม', 'Caravan — supplies • Side quests'), muninn: L('กาส่งความทรงจำ • เควสต์เสริม', 'Memory courier • Side quests'),
      sigrun: L('ทหารผ่านศึก • เนื้อเรื่อง', 'Veteran • Story'), lopt: L('พ่อค้าเร่', 'Peddler'), lopt_wood: L('พ่อค้าเร่', 'Peddler'),
    });
    for (const l of LORE) UnitCard.NPC_ROLE[l.id] = L('ตำนาน • ตรวจดู', 'Lore • Examine');
  }
  if (typeof Nav !== 'undefined') { // จุดตำนานที่ยังไม่เคยตรวจ: ไม่โผล่ในรายการนำทาง (ให้ค้นพบเอง — เควสต์ยังนำทางไปได้)
    const pl0 = Nav.places.bind(Nav), he0 = Nav.here.bind(Nav);
    Nav.places = () => pl0().filter(t => !LORE_BY[t.npcId] || Lore.has(t.npcId));
    Nav.here = () => he0().filter(t => !LORE_BY[t.npcId] || Lore.has(t.npcId)).map(t => (LORE_BY[t.npcId] ? Object.assign(t, { sub: 'Lore' }) : t));
  }
  if (typeof document !== 'undefined') {
    const st = document.createElement('style'); st.id = 'world-pack-css';
    st.textContent = '#w-dialog .lore-new{display:inline-block;margin-top:6px;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:700;color:#6a3cc8;background:rgba(160,120,255,.14);border:1px solid rgba(130,90,230,.45)}'
      + '#w-quest .lw-head,#w-quest .lw-map{flex-shrink:0}#w-quest .lw-head .dsec-h{display:flex;align-items:center;gap:6px}#w-quest .lw-n{margin-left:auto;font-weight:700;font-variant-numeric:tabular-nums}'
      + '#w-quest .lw-bar{display:block;margin:8px 12px 2px}#w-quest .lw-bar i{background:linear-gradient(90deg,#a080ff,#e0a830)}'
      + '#w-quest .lw-map{padding:8px 12px}#w-quest .lw-map.full{box-shadow:inset 0 0 0 1px rgba(224,168,48,.6)}'
      + '#w-quest .lw-mh{display:flex;align-items:center;gap:8px;margin-bottom:4px}#w-quest .lw-mh small{margin-left:auto;opacity:.75;font-variant-numeric:tabular-nums}'
      + '#w-quest .lw-pips{display:inline-flex;gap:4px}#w-quest .lw-pips i{width:7px;height:7px;border-radius:2px;transform:rotate(45deg);background:rgba(128,128,128,.22);border:1px solid rgba(128,128,128,.45)}#w-quest .lw-pips i.on{background:#f0bc3a;border-color:#b07a10;box-shadow:0 0 6px rgba(240,188,58,.7)}'
      + '#w-quest .lw-row{margin:3px 0;font-size:13px}#w-quest .lw-row summary{cursor:pointer;display:flex;gap:6px;align-items:center;list-style:none}#w-quest .lw-row summary::-webkit-details-marker{display:none}'
      + '#w-quest .lw-ic{color:#d09a20;width:14px;text-align:center}#w-quest .lw-unk{display:flex;gap:6px;opacity:.5}#w-quest .lw-unk .lw-ic{color:inherit}'
      + '#w-quest .lw-txt{margin:5px 0 6px 20px;font-size:12.5px;line-height:1.5;opacity:.85}';
    document.head.append(st);
  }

  // ===================== เกี่ยวเข้ากับเกม =====================
  {
    const t0 = Quest.tick; let at = 0;
    Quest.tick = function () {
      const r = t0.apply(this, arguments);
      try {
        if (G.started && G.player && G.time >= at) { at = G.time + 0.5; Lore.marks(); Elite.tick(); }
        Chatter.tick();
      } catch (e) { console.error(e); }
      return r;
    };
  }
  const install = () => {
    // แท็บ Lore ต่อท้ายแท็บ Story / Daily (js/daily.js)
    if (typeof Daily !== 'undefined' && Daily.tabs) {
      const tabs0 = Daily.tabs.bind(Daily);
      Daily.tabs = () => { const el = tabs0(); el.append(loreTab()); return el; };
    }
    const rq0 = UI.renderQuest;
    UI.renderQuest = function (...a) {
      const body = document.querySelector('#w-quest .win-body');
      if (!body || !G.player) return rq0.apply(this, a);
      if (this.questTab === 'lore') return renderLore(body);
      if (body.dataset.lk) { body.dataset.lk = ''; body.dataset.key = ''; body.dataset.dk = ''; }
      const r = rq0.apply(this, a);
      const bd = body.querySelector('.lw-badge'); if (bd) bd.textContent = `${Lore.count()}/${Lore.total()}`;
      if (!body.querySelector('[data-qtab="lore"]')) { const tabs = body.querySelector(':scope > .tabs'); if (tabs) tabs.append(loreTab()); }
      return r;
    };
  };
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true }); else install(); }

  return W;
})();
