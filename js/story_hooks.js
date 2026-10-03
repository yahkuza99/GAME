'use strict';
// ============================================================
//  ตะขอเรื่องราวสำหรับระบบใหม่ (docs/STORY.md) — ไม่มีระบบใหม่ ใช้กล่องบทสนทนา/แชต/ประกาศ/การ์ดยูนิตที่มีอยู่
//  • Garmr ออกจากประตูราก: บรรทัดตำนาน + เสียงตะโกน • บรรทัดแผนที่ Archive / Gnawed Roots • ฉาก MVP ของ Garmr
//  • Ancient (บอสระดับ 2): ตำนาน 1 บรรทัดตอนตื่น (ทุกตัว)
//  • เตาของ Brokk แท็บ Hunt Rune: Brokk เล่าว่ารูนตัดจากเปลือกของ Yggdrasil
//  • Mimir: บรรทัดหลังปลุกแม่พิมพ์ชั้นที่สอง (Class 2 ทั้ง 12)
//  • การ์ดยูนิต / สมุดมอนสเตอร์: บรรทัดตำนาน (lore) ของมอนทุกตัว (§7) + ลูกสมุนบอส
//  โหลดท้ายสุด (หลัง js/unitcard.js ก่อน js/main.js) — ห่อฟังก์ชันเดิม ไม่แก้ไฟล์ระบบ • ทุกอย่างกันพลาดด้วย typeof (ไม่มีระบบนั้น = ข้าม)
// ============================================================
const StoryHooks = (() => {
  const H = {};
  const vis = () => typeof G !== 'undefined' && !G.fastSim && typeof document !== 'undefined';

  // ---------- ตำนานมอนสเตอร์ (STORY.md §7) — เติมเฉพาะตัวที่ยังไม่มี ----------
  H.LORE = {
    training_dummy: L('หุ่นฝึกของกองยามเมือง โดนตีมาแล้วนับล้านครั้ง ไม่เคยบ่นสักคำ', 'The city guard\'s training dummy. Struck a million times; never once complained.'),
    pudding: L('ถุงน้ำเลี้ยงเดินได้ ลืมเส้นทางไปนานแล้ว แต่ยังเดินอยู่', 'A walking sac of sap. It forgot its route long ago, but it keeps on walking.'),
    ember_pudding: L('ถุงน้ำเลี้ยงที่ร้อนเกิน — ลืมเส้นทางเหมือนพี่น้อง แต่เดินเร็วกว่าเพราะพื้นร้อนเท้า', 'A sap sac running too hot — as lost as its siblings, only faster, because the ground burns its feet.'),
    leafworm: L('คลานตามรากเพื่อหารอยร้าว ตอนนี้คลานหาอะไรก็ไม่รู้', 'It crawls the roots in search of cracks. Now it crawls in search of who-knows-what.'),
    moonbun: L('ตาข่ายเงินไว้เก็บเมล็ด กระโดดหนีเพราะคิดว่าเจ้าคือวัชพืช', 'Silver mesh for gathering seeds. It hops away because it thinks you are a weed.'),
    buzzfly: L('โดรนผสมเกสร ปกป้องทุ่งเหมือนรังของตัวเอง ใครเข้าใกล้ถือว่ารุกราน', 'A pollinator drone that guards the meadow like its own hive. Anyone who comes near is an intruder.'),
    stumpling: L('ยังเดินยามอยู่ ทั้งที่สนิมกินถึงข้อต่อ — สนิมยังไม่ตาย', 'Still walking its rounds, though rust has eaten into its joints — the Rust is not dead.'),
    fiddlehopper: L('สปริงขาแรงพอกระโดดข้ามทะเลสาบ หว่านเมล็ดที่ไม่งอกมาสามสิบปี', 'Springs strong enough to leap the lake. It has sown seeds that never sprouted for thirty years.'),
    capshroom: L('ผู้พิทักษ์วางไว้กั้นสนิมในคืนนั้น มันเดินได้แล้ว และกั้นทุกคน', 'A Guardian planted it to hold back the Rust that night. Now it walks — and holds back everyone.'),
    moss_pudding: L('เจลชีวภาพเติบโตทับโครงเหล็กจนแยกไม่ออกว่าอะไรเป็นเครื่อง อะไรเป็นมอส', 'Bio-gel grown over a steel frame until no one can tell machine from moss.'),
    seraph_pudding: L('ถือข้อความสุดท้ายของ Odin บินวนมาหลายสิบปี รอผู้ที่ยืนยันตัวตนได้ — ไม่มีใครผ่าน', "It carries Odin's final message and has circled for decades, waiting for someone who can be verified. No one has passed."),
    ashtail: L('หน่วยดูแลป่าที่ถูกเผา ไส้กรองเถ้ายังอุ่น ไฟเพิ่งผ่านไปไม่นาน', 'A forest-keeper of the burned wood. Its ash filters are still warm; the fire passed only recently.'),
    fenrir_pup: L('Fenrir แตกเป็นร้อยตัวหลังกลืน Odin ยังล่าทุกอย่างที่มีกลิ่นสนิม — ไม่ใช่เจ้า จึงไม่ไล่ก่อน', 'Fenrir shattered into a hundred pieces after swallowing Odin. They hunt anything that smells of rust — not you, so they do not chase first.'),
    mossback: L('หมีเหล็กที่เคยแบกท่อนไม้ ตอนนี้แบกความโกรธที่ไม่มีไม้ให้แบก', 'An iron bear that once hauled logs. Now it hauls only anger, with no logs left to carry.'),
    tuskboar: L('รถถังหมูป่าหน่วยไถดิน ไถทุกอย่างในเส้นทางรวมถึงเจ้า', 'A boar-shaped tilling tank. It plows everything in its path — you included.'),
    draugr: L('Hel เก็บเกี่ยวประกายที่ล้มลงแล้วยัดลงเศษเหล็ก ไม่พอดี เจ็บ และสับสน — แสงศักดิ์สิทธิ์คือการปลด', 'Hel harvested fallen sparks and crammed them into scrap. It does not fit; it hurts; it is lost — holy light is a release.'),
    bone_warden: L('โครงร่างเปล่าที่ Hel เตรียมไว้ให้ประกาย ยังไม่มีใครอยู่ข้างใน แต่เดินเฝ้าได้', 'An empty frame Hel prepared for a spark. No one lives inside it yet, but it can stand guard.'),
    hel_maiden: L('ผู้ดูแลชั้นวางประกาย อ่อนโยน ไม่โจมตีก่อน ปัดฝุ่นชั้นวางที่ไม่มีใครมาเยี่ยม', 'Keeper of the spark shelves. Gentle, never strikes first; she dusts shelves no one visits.'),
    hel_guard: L('สู้กับไฟมาสามคืน เห็นเจ้าแล้วแยกไม่ออกว่าใครคือไฟ', 'It has fought the fire for three nights. Seeing you, it can no longer tell who is the fire.'),
    kitsura: L('เก้าหาง เก้าหัวเผา สร้างไว้ดับกิ่งที่รักษาไม่ได้ ถูกปลุกด้วยกุญแจของผู้พิทักษ์ — ใครบางคนเพิ่งใช้กุญแจนั้น', "Nine tails, nine burners — built to extinguish branches beyond saving. Woken only by a Guardian's key, and someone has just used it."),
    // ลูกสมุนบอส (BossKit)
    mn_cherub: L('เจลเทวดาที่ Seraph Core เลี้ยงไว้ในหมอก ร้องเพลงของ Odin ผิดคีย์', 'Angel-gels Seraph Core raised in the mist. They sing Odin\'s hymns off-key.'),
    mn_halo: L('วงแหวนแสงที่หลุดจากรัศมีของทูต บินวนตามเจ้าของเหมือนลูกนก', "Rings of light shed from the envoy's halo, circling their master like chicks."),
    mn_foxfire: L('ไฟจิ้งจอกที่หลุดจากหางของ Kitsura เผาเสร็จแล้วก็ดับเอง', "Foxfire shed from Kitsura's tails. It burns, and then it goes out on its own."),
    mn_handmaiden: L('สาวใช้ของ Hel ที่ไฟเผาจนตะเกียงกลายเป็นคบเพลิง', "Hel's handmaidens, burned until their lanterns became torches."),
    mn_whelp: L('ลูกของ Garmr ที่โตใต้ประตูราก ไม่เคยเห็นผิวดิน', 'Whelps of Garmr raised beneath the root gate. They have never seen the surface.'),
    mn_chained: L('Draugr ที่ Garmr ลากโซ่มาด้วย ยังไม่รู้ว่าตัวเองหลุดจากโซ่แล้ว', 'Draugr Garmr drags along on its chains. They do not know they are already free.'),
    mn_wyrmling: L('เกล็ดที่เพิ่งหลุดจากตัว Nidhogg ยังไม่ทันโต แต่หิวแล้ว', "A scale freshly shed from Nidhogg. Not yet grown — but already hungry."),
    mn_rotbud: L('ดอกสนิมอ่อนที่ Nidhogg พ่นออกมา โตเร็วถ้ามีประกายอยู่ใกล้', 'A young rust-bloom Nidhogg spits out. It grows fast with a spark nearby.'),
  };
  // มอนที่มีบรรทัดตำนาน: ตัวเอง → ตัวต้นแบบของบอสโลก (wb_) → ต้นแบบของลูกสมุนรุ่น Ancient/ชั้นยอด (_a/_e)
  H.lore = d => {
    if (!d) return '';
    if (d.lore) return d.lore;
    if (d.worldBoss && MOBS[d.base] && MOBS[d.base].lore) return MOBS[d.base].lore;
    const m = /^(mn_.+?)_[ae]$/.exec(d.id || ''); if (m && MOBS[m[1]] && MOBS[m[1]].lore) return MOBS[m[1]].lore;
    return '';
  };
  for (const id in H.LORE) if (MOBS[id] && !MOBS[id].lore) MOBS[id].lore = H.LORE[id];
  for (const id in MOBS) { const d = MOBS[id]; if (!d.lore) { const l = H.lore(d); if (l) d.lore = l; } }

  // ---------- บรรทัดแผนที่ บทที่ 6 + ฉาก MVP ของ Garmr (เติมเฉพาะที่ยังไม่มี) ----------
  if (typeof Story !== 'undefined') {
    const ML = Story.MAP_LINES, MA = Story.MAP_LINES_AFTER;
    if (!ML.archive) ML.archive = L('ชั้นวางล่างสุดของคลังประกาย — ที่ที่สนิมเริ่มลามขึ้นมาหาผิวดิน', 'The lowest shelves of the spark archive — where the Rust began creeping up toward the surface.');
    if (!ML.roots) ML.roots = L('รากของต้นไม้ถูกแทะจากข้างล่าง — ทางตะวันออก มีสุนัขเฝ้าประตูรากอยู่', "The Tree's roots, gnawed from below — and to the east, a hound guards the root gate.");
    if (!MA.roots) MA.roots = L('ประตูรากไร้ผู้เฝ้า... ข้างหลังซุ้มนั้น ทางลงมืดสนิท และมีเสียงแทะดังขึ้นมา', 'The root gate stands unguarded... beyond the arch, the way down is pitch dark, and a gnawing rises from it.');
    if (!Story.MVP.garmr) Story.MVP.garmr = {
      sub: L('สุนัขเฝ้าประตูราก — โซ่ของ Hel', "Hound of the Root Gate — Hel's Chain"),
      spawn: L('Garmr พังโซ่ออกมาจากประตูราก — Hel ล่ามมันไว้กันสนิมมาสามสิบปี จนสนิมแทะมันกลับ', 'Garmr breaks its chains and bursts from the root gate — Hel chained it there to hold back the Rust for thirty years, until the Rust gnawed back.'),
      fallName: '[Garmr]',
      fall: L('ปลอกคอของ Garmr หลุดลงกับพื้น... ประตูรากข้างหลังมันเปิดค้างไว้<br>ลมเย็นพัดขึ้นมาจากข้างล่าง <b>พร้อมเสียงแทะที่ไม่ยอมหลับ</b>', "Garmr's collar falls to the ground... and the root gate behind it hangs open.<br>A cold wind rises from below, <b>carrying a gnawing that will not sleep.</b>"),
      fallShort: L('Garmr ล้มลง — ประตูรากข้างหลังมันเปิดค้างไว้ และมีเสียงแทะดังขึ้นมา', 'Garmr falls — the root gate behind it hangs open, and a gnawing rises from below.'),
    };
  }

  // ---------- Garmr ออกจากประตูราก (BossKit.onSpawn: บอสที่มี mvpGate) ----------
  H.GARMR_SHOUT = [L('...โซ่...ของ...เฮล...', "...Hel's...chain..."), L('ประตู... ไม่ให้... ผ่าน...', 'The gate... none... pass...'), L('กลิ่น... สนิม...', 'Smell... of rust...')];
  if (typeof BossKit !== 'undefined' && BossKit.onSpawn) {
    const on0 = BossKit.onSpawn;
    BossKit.onSpawn = m => {
      on0(m);
      const id = m && m.def && m.def.id;
      if ((id !== 'garmr' && id !== 'wb_garmr') || !G.map || !G.map.def.mvpGate) return;
      m.speech = { text: H.GARMR_SHOUT[Math.floor(Math.random() * H.GARMR_SHOUT.length)], until: G.time + 3 };
      UI.msg(L('📖 Hel ล่าม Garmr ไว้ที่ประตูรากเพื่อกั้นเสียงแทะข้างล่าง — มันยังเฝ้าประตูนั้นอยู่ แม้โซ่จะขาดแล้ว', '📖 Hel chained Garmr at the root gate to hold back the gnawing below — it still guards that gate, even with its chains broken.'), 'map');
    };
  }

  // ---------- Ancient (บอสระดับ 2): ตำนานตอนตื่น ----------
  H.ANCIENT = {
    seraph_pudding: L('ทูตรุ่นแรกของ Odin บินวนนานกว่าตัวที่เจ้าเคยปราบ — ข้อความในตัวมันยาวกว่า และยังไม่มีใครฟังจบ', "Odin's first envoy, circling longer than the one you felled — its message is longer, and no one has ever heard it to the end."),
    kitsura: L('ต้นแบบหน่วยเผาผลาญรุ่นที่ Odin สั่งปิด เพราะมันไม่รู้จักคำว่า "ดับ"', 'The prototype incinerator Odin ordered shut down — because it never learned the word "extinguish."'),
    garmr: L('สุนัขตัวแรกที่ Hel ล่ามไว้ที่ประตูราก ก่อนจะมี Garmr ตัวไหน ๆ — โซ่ของมันหนากว่า และมันจำได้ว่าเฝ้าอะไร', 'The first hound Hel ever chained at the root gate, before any other Garmr — its chain is thicker, and it remembers what it guards.'),
    nidhogg: L('สนิมทุกเม็ดที่ยังไม่ถูกแทะออกจากราก รวมตัวกันขึ้นมาเป็นร่างเดียว — ไม่มีหัว แต่ไม่เคยลืมว่าหิว', 'Every grain of rust not yet gnawed from the roots, gathered into a single body — headless, but it never forgets its hunger.'),
  };
  H.ancientLine = map => { const w = typeof WB !== 'undefined' && WB.MAPS[map]; return w ? H.ANCIENT[w.mvp] || '' : ''; };
  if (typeof WB !== 'undefined') {
    const sp0 = WB.spawn.bind(WB);
    WB.spawn = map => {
      const fresh = WB.state(map).hp >= MOBS[WB.id(map)].hp;
      sp0(map);
      const t = H.ancientLine(map);
      if (fresh && t) UI.msg(`📖 ${t}`, 'map');
    };
    const he0 = WB.herald.bind(WB);
    WB.herald = () => {
      const before = Object.assign({}, WB.seen || {});
      he0();
      const seen = WB.seen || {};
      for (const map in seen) if (seen[map] !== before[map] && /^on/.test(seen[map]) && !(G.map && G.map.id === map)) {
        const t = H.ancientLine(map); if (t) UI.msg(`📖 ${t}`, 'map');
      }
    };
  }

  // ---------- Brokk: ที่มาของ Hunt Rune (แท็บ Hunt Rune ในเตา) ----------
  H.BROKK = [
    L('ฮ่าฮ่า! รูนพวกนี้ข้าไม่ได้หล่อจากเหล็กหรอกเจ้าหนู — ข้าตัดจาก<b>เปลือกของ Yggdrasil</b> เฉพาะเปลือกที่ร่วงจากรากเอง ข้าไม่เคยลอกจากต้น', "Ha-ha! I don't cast these runes from iron, kid — I cut them from <b>Yggdrasil's own bark</b>. Only bark the roots shed themselves; I never strip it from the Tree."),
    L('เปลือกต้นไม้จำทุกอย่างที่มันเคยสู้ด้วย — สนิม ไฟ หมาป่า... ข้าแค่สลักให้มันจำได้ชัดขึ้น นั่นแหละ Slayer', 'Bark remembers everything the Tree ever fought — rust, fire, wolves... I just carve the memory sharper. That is a Slayer rune.'),
    L('Endow คือเปลือกที่ข้าแช่ในน้ำเลี้ยงตามธาตุ แช่ไฟเจ็ดคืน แช่น้ำเจ็ดคืน... ใจเย็น ๆ ของดีต้องรอ ฮ่าฮ่า!', 'An Endow rune is bark I steep in sap of an element — seven nights in fire, seven in water... patience, kid. Good things take time. Ha-ha!'),
    L('โซ่ Gleipnir ข้าก็ตีจากเปลือกแบบนี้แหละ... ไม่ต้องห่วง รูนพวกนี้ไม่ล่ามใคร มันแค่ชี้ว่าควรตีตรงไหน', "I forged Gleipnir from bark like this too... Don't worry — these runes bind no one. They only show you where to strike."),
  ];
  H.brokkI = 0;
  if (typeof HuntRunes !== 'undefined' && HuntRunes.forgeTab) {
    const ft0 = HuntRunes.forgeTab.bind(HuntRunes);
    HuntRunes.forgeTab = (f, tabs, foot, back) => {
      const r = ft0(f, tabs, foot, back);
      try {
        if (f._brokkLine == null) f._brokkLine = H.brokkI++ % H.BROKK.length; // หนึ่งบรรทัดต่อการเปิดเตาครั้งหนึ่ง (เปิดใหม่ = บรรทัดถัดไป)
        const el = h('p', { class: 'hr-lore', html: `🔨 <b>Brokk:</b> “${H.BROKK[f._brokkLine]}”` });
        if (Array.isArray(r.left)) r.left.splice(1, 0, el);
      } catch (e) { /* ไม่มีหน้าตาเตา = ข้าม */ }
      return r;
    };
  }

  // ---------- Mimir: บรรทัดหลังปลุกแม่พิมพ์ชั้นที่สอง (Class 2) ----------
  // แม่พิมพ์ชั้นสองคือ "ท่าที่ซ่อนอยู่" ของหกวีรชนที่รักษากำแพงในคืนที่กิ่งหัก (STORY.md §6)
  H.JOB2 = {
    valkyrie: L('ผู้แบกประตูไม่ได้ล้มเพราะอ่อนแรง เขาล้มเพราะหันไปรับคนที่ล้มก่อน — ท่านั้นข้าเก็บไว้ไม่ให้ใครเห็นมาสามสิบปี จนวันนี้', 'The gate-bearer did not fall from weakness — he fell turning to catch the one who fell first. I have kept that stance hidden for thirty years. Until today.'),
    hersir: L('คืนนั้นมีอยู่ช่วงหนึ่งที่ผู้แบกประตูก้าวออกไปข้างหน้าแทนที่จะรอ — กำแพงอยู่ได้อีกชั่วโมงเพราะก้าวนั้น ตอนนี้ก้าวนั้นเป็นของเจ้า', 'There was a moment that night when the gate-bearer stepped forward instead of waiting — the wall stood an hour longer for that step. Now that step is yours.'),
    galdr: L('นักจารึกไม่ได้เขียนรูนอย่างเดียวในคืนนั้น นางร้องมันออกมาด้วย — และต้นไม้ร้องตาม ข้าบันทึกเสียงนั้นได้แค่ท่อนเดียว เจ้าคือท่อนที่สอง', 'The scribe did not only write her runes that night — she sang them, and the Tree sang back. I recorded one verse. You are the second.'),
    seidr: L('ในคืนนั้น นักจารึกเขียนรูนบางตัวด้วยมือซ้าย ในที่มืดที่สุดของกำแพง — Odin สั่งให้ข้าลบทิ้ง ข้าไม่ได้ลบ', 'That night the scribe wrote certain runes left-handed, in the darkest stretch of the wall — Odin told me to erase them. I did not.'),
    skadi: L('นักล่าคนนั้นยิงหิมะให้หยุดตกได้หนึ่งนาที เพื่อให้หมาป่าของนางมองเห็นทาง — ลมหายใจนั้นตอนนี้อยู่ในอกเจ้า', 'That huntress shot the snow still for one minute, so her wolf could see the way — that breath now lives in your chest.'),
    ullr: L('ลูกธนูดอกสุดท้ายของนางยังไม่ตกถึงพื้น ข้าวัดได้ว่ามันยังลอยอยู่ที่ไหนสักแห่งทางเหนือ — เจ้าคือคนที่จะยิงดอกต่อไป', 'Her last arrow has yet to land. By my reckoning it is still in flight, somewhere to the north — you are the one who looses the next.'),
    norn: L('ผู้ดูแลแสงได้ยินเสียง Odin เป็นคนสุดท้าย และนางได้ยินมากกว่าที่บอกใคร — เส้นด้ายที่นางจับไว้ ข้าส่งต่อให้เจ้าแล้ว', "The keeper of light was the last to hear Odin's voice — and she heard more than she ever told. The thread she held, I have now passed to you."),
    gythja: L('เมื่อแสงของนางหมด ผู้ดูแลแสงไม่ได้ถอย นางกำหมัดแล้วอธิษฐานต่อด้วยมือเปล่า — ข้าไม่เคยเห็นแม่พิมพ์ไหนร้อนเท่านี้', 'When her light ran out, the keeper did not retreat — she closed her fists and kept praying with bare hands. I have never seen a mold burn so hot.'),
    phantom: L('ข้าพบชั้นที่สองของแม่พิมพ์ที่ไม่มีใครฝาก... ลายเซ็นข้างในกะพริบเขียวเสี้ยววินาที — ข้าคิดว่าข้ารู้แล้วว่าใครฝากไว้', 'I found the second tier of the mold no one admits to leaving... the signature inside flickers green for a split second. I believe I now know who left it.'),
    skald: L('ผู้ที่เดินเข้าออกกำแพงคืนนั้นร้องเพลงตลอดทาง เพื่อให้คนข้างในรู้ว่ายังมีคนอยู่ข้างนอก — จงร้องให้ดัง ผิวดินยังฟังอยู่', 'The one who slipped through the wall that night sang the whole way, so those inside would know someone was still out there — sing loud. The surface is still listening.'),
    warlord: L('ผู้ที่ถอดตัวจำกัดล้มลงเจ็ดครั้งในคืนนั้น และลุกขึ้นเจ็ดครั้ง — ครั้งที่แปด หมาป่าทั้งฝูงลุกตามเขา', 'The one who tore out his limiter fell seven times that night, and rose seven times — on the eighth, the whole pack rose with him.'),
    jotun: L('ชั่วโมงสุดท้ายของกำแพง เขาไม่ได้สู้กับสนิม เขาสู้กับยักษ์เหล็กที่สนิมขี่มา — แม่พิมพ์นี้จำน้ำหนักของมันได้ทุกกิโล', "In the wall's last hour he fought not the Rust, but the iron giant the Rust rode in on — this mold remembers every ounce of its weight."),
  };
  if (typeof NPC !== 'undefined' && NPC.scripts.jobmaster) {
    const mim0 = NPC.scripts.jobmaster;
    NPC.scripts.jobmaster = async n => {
      const p = G.player, j0 = p && p.job;
      await mim0(n);
      const j = p && p.job, J = j && JOBS[j];
      if (j && j !== j0 && J && J.tier === 2 && H.JOB2[j]) await UI.say(`[${n.name}]`, `“${H.JOB2[j]}”`);
    };
  }

  // ---------- การ์ดยูนิต / สมุดมอนสเตอร์: บรรทัดตำนาน ----------
  if (typeof UnitCard !== 'undefined') {
    UnitCard.NPC_ROLE.loki = L('ผู้พิทักษ์ความแปรผัน • เนื้อเรื่อง', 'Guardian of Variation • Story');
    if (UnitCard.mobBody) {
      const mb0 = UnitCard.mobBody.bind(UnitCard);
      UnitCard.mobBody = m => {
        const out = mb0(m), t = H.lore(m && m.def);
        if (t && Array.isArray(out)) out.splice(1, 0, h('p', { class: 'uc-lore' }, `“${t}”`));
        return out;
      };
    }
  }
  if (typeof UI !== 'undefined' && UI.renderMob) {
    const rm0 = UI.renderMob; // ห่อหลัง UnitCard.extendMobBook (ตอน UnitCard.init) ก็ได้ ทำงานตามลำดับเดียวกัน
    UI.renderMob = function () {
      rm0.apply(this, arguments);
      const d = MOBS[UI.mobInfo], body = document.querySelector('#w-mob .win-body'), t = H.lore(d);
      if (!t || !body || body.querySelector('.mb-lore')) return;
      const head = body.querySelector('.mb-head');
      const el = h('p', { class: 'mb-lore' }, `“${t}”`);
      if (head) head.after(el); else body.prepend(el);
    };
  }
  // หน้าตา (เล็กมาก ไม่แยกไฟล์ css)
  if (typeof document !== 'undefined') {
    const st = document.createElement('style'); st.id = 'story-hooks-css';
    st.textContent = '#unit-card .uc-lore,#w-mob .mb-lore{margin:4px 0 8px;font-style:italic;font-size:12.5px;line-height:1.45;color:var(--ink-dim,#b9c4d6);opacity:.92}'
      + '.hr-lore{margin:4px 0 8px;font-size:12.5px;line-height:1.45;color:var(--ink-dim,#c9c0a8);background:rgba(255,200,120,.06);border-left:3px solid rgba(255,190,110,.55);padding:6px 9px;border-radius:6px}';
    document.head.append(st);
  }
  return H;
})();
