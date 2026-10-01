'use strict';
// ============================================================
//  คู่มืออาชีพ (Class Guide) — สารบัญอาชีพทั้งหมด + คำแนะนำสเตตัส / ลำดับอัปสกิล / อาวุธ / วิธีเล่น
//  เปิดได้จากเมนู (ไอคอนหนังสือ) หรือกด L • สกิลในแต่ละอาชีพดึงจาก SKILLS จริง (ชื่อ/คำอธิบายตรงกับเกมเสมอ)
// ============================================================
const CLASSBOOK = {
  novice: {
    diff: 1, weapon: L('อะไรก็ได้ (มีด/ดาบ)', 'Anything (dagger/sword)'),
    stats: [['str', 40], ['agi', 30], ['vit', 30]],
    build: [['basic_training', 9]],
    play: L('ช่วงฝึกพื้นฐาน ตีมอนในทุ่งหญ้ามรกตจนได้ Job Lv 10 แล้วไปหา Mimir AI เพื่อเลือกคลาสแรก', 'Your training phase. Hunt in Emerald Meadow until Job Lv 10, then visit Mimir AI to choose your first class.'),
    pros: L('ไม่ต้องคิดมาก ตายไม่เสีย EXP', 'Simple; no EXP loss on death'), cons: L('ยังไม่มีสกิลโจมตี', 'No attack skills yet'),
    tips: L('แต้มสเตตัสที่ใส่ตอนนี้ใช้ต่อได้ แนะนำใส่ตามคลาสที่ตั้งใจจะเป็น (รีเซ็ตได้ที่ Mimir)', 'Stat points carry over — invest toward the class you plan to take (Mimir can reset them).'),
  },
  // ---------------- คลาสแรก ----------------
  einherjar: {
    diff: 1, weapon: L('ดาบ + โล่', 'Sword + shield'),
    stats: [['vit', 50], ['str', 40], ['dex', 10]],
    build: [['iron_body', 5], ['shield_slam', 5], ['whirlwind', 5], ['valhalla_oath', 5], ['war_cry', 3], ['shield_throw', 2]],
    play: L('ยืนแนวหน้า ดึงมอนด้วย War Cry / Shield Throw แล้วฟาด Shield Slam ให้มึน ฝูงใหญ่ใช้ Whirlwind', 'Hold the front line: pull with War Cry / Shield Throw, stun with Shield Slam, and clear packs with Whirlwind.'),
    pros: L('ทนที่สุด ตายยาก เหมาะมือใหม่', 'Toughest class, hard to kill — great for beginners'), cons: L('ฆ่าช้ากว่าสายดาเมจ SP น้อย', 'Slower kills, small SP pool'),
    tips: L('VIT ช่วยแรงตีด้วย (เฉพาะสายนี้) • Valhalla\'s Oath ลด SP ที่ใช้ ช่วยให้กดสกิลได้นานขึ้น', 'VIT also adds attack for this line • Valhalla\'s Oath cuts SP costs so you can keep casting.'),
  },
  runecaster: {
    diff: 2, weapon: L('คทา', 'Rod'),
    stats: [['int', 60], ['dex', 30], ['vit', 10]],
    build: [['rune_mastery', 5], ['fire_rune', 5], ['thunder_rune', 5], ['runic_ward', 5], ['ice_rune', 3], ['earth_rune', 2]],
    play: L('ยิงเวทจากระยะไกล Ice Rune ทำให้ช้าก่อนเข้าถึงตัว Fire Rune เผาต่อเนื่อง ฝูงใหญ่ใช้ Thunder Rune', 'Nuke from range: slow with Ice Rune, burn with Fire Rune, and blast groups with Thunder Rune.'),
    pros: L('ดาเมจสูงสุด ฆ่าเร็วที่สุด', 'Highest damage, fastest kills'), cons: L('ตัวบาง ใช้ยาเยอะ ร่ายนาน', 'Fragile, potion-hungry, long casts'),
    tips: L('DEX ลดเวลาร่าย • Runic Ward เพิ่ม HP/MDEF ช่วยให้รอดง่ายขึ้นมาก', 'DEX shortens cast time • Runic Ward adds HP/MDEF and makes survival much easier.'),
  },
  wildhunter: {
    diff: 2, weapon: L('ธนู', 'Bow'),
    stats: [['dex', 60], ['agi', 30], ['luk', 10]],
    build: [['eagle_eye', 5], ['piercing_arrow', 5], ['hunters_rhythm', 5], ['blast_trap', 4], ['wolf_companion', 3], ['charge_arrow', 3]],
    play: L('ยิงจากระยะไกล Piercing Arrow ทะลุแนว มอนเข้าใกล้ใช้ Charge Arrow ผลักออก หมาป่าช่วยรับดาเมจ', 'Shoot from range; Piercing Arrow hits the whole line. Knock close enemies away with Charge Arrow while your wolf tanks.'),
    pros: L('ปลอดภัย ระยะยิงไกล มีสัตว์คู่ใจ', 'Safe, long range, has a companion'), cons: L('ดาเมจต่อเป้าปานกลาง', 'Moderate single-target damage'),
    tips: L('DEX = แรงยิง + แม่นยำ • AGI = ยิงเร็ว', 'DEX = arrow damage + accuracy • AGI = attack speed.'),
  },
  volva: {
    diff: 2, weapon: L('กระบอง', 'Club / mace'),
    stats: [['int', 50], ['vit', 40], ['dex', 10]],
    build: [['sanctuary', 5], ['light_of_freyja', 5], ['holy_spear', 5], ['blessing_of_odin', 5], ['freyjas_grace', 3], ['divine_shield', 2]],
    play: L('ฮีลตัวเองด้วย Light of Freyja บัฟด้วย Blessing of Odin แล้วแทง Holy Spear แรงมากกับอมตะ/ปีศาจ', 'Heal yourself with Light of Freyja, buff with Blessing of Odin, and strike with Holy Spear — devastating against undead and demons.'),
    pros: L('ยืนระยะยาว แทบไม่ต้องใช้ยา', 'Excellent sustain, barely needs potions'), cons: L('ฆ่าช้ากับมอนธาตุศักดิ์สิทธิ์', 'Slow against holy-element monsters'),
    tips: L('ไปล่าในโพรงเฮล (อมตะเยอะ) จะคุ้มที่สุด', 'Hel\'s Hollow (full of undead) is your best hunting ground.'),
  },
  trickster: {
    diff: 3, weapon: L('มีดสั้น', 'Dagger'),
    stats: [['agi', 50], ['str', 30], ['luk', 20]],
    build: [['shadow_step', 5], ['backstab', 5], ['venom_blade', 5], ['lokis_gambit', 5], ['throwing_knife', 3], ['smoke_veil', 2]],
    play: L('หายตัวด้วย Smoke Veil แล้ว Backstab เปิดดาเมจ อาบพิษด้วย Venom Blade ตีเร็วคริบ่อย', 'Vanish with Smoke Veil, open with Backstab, and coat your blade with Venom Blade for fast, crit-heavy hits.'),
    pros: L('หลบเก่ง ตีเร็ว คริแรง', 'High evasion, fast attacks, big crits'), cons: L('ต้องเล่นเป็นจังหวะ พลาดแล้วเจ็บ', 'Rhythm-heavy; mistakes hurt'),
    tips: L('มีดสั้นได้แรงตีจาก AGI ด้วย • LUK เพิ่มคริติคอล', 'Daggers gain attack from AGI • LUK raises crit rate.'),
  },
  berserker: {
    diff: 2, weapon: L('ขวาน', 'Axe'),
    stats: [['str', 50], ['agi', 35], ['vit', 15]],
    build: [['wolf_blood', 5], ['rage_strike', 5], ['blood_frenzy', 5], ['bloodthirst', 5], ['axe_throw', 3], ['howl', 2]],
    play: L('ยิ่ง HP น้อยยิ่งแรง แลกเลือดด้วย Rage Strike / Blood Frenzy แล้วดูดเลือดคืนด้วย Bloodthirst', 'The lower your HP, the harder you hit. Trade HP for power with Rage Strike / Blood Frenzy and drain it back with Bloodthirst.'),
    pros: L('ดาเมจกายภาพสูง ฟาร์มเร็ว', 'High physical damage, fast farming'), cons: L('เสี่ยงตายถ้าประมาท ใช้ยาแดงเยอะ', 'Risky if careless; uses many HP potions'),
    tips: L('ตั้งปั๊มยา HP ไว้ราว 40% จะเล่นสบายขึ้น', 'Set auto-potion HP to about 40% for a smoother run.'),
  },
  // ---------------- คลาสขั้น 2 ----------------
  valkyrie: {
    diff: 1, weapon: L('ดาบ + โล่', 'Sword + shield'),
    stats: [['vit', 50], ['str', 40], ['dex', 10]],
    build: [['aegis_wall', 5], ['spear_of_valhalla', 5], ['judgment_quake', 5], ['einherjar_guard', 5], ['valhallas_call', 5]],
    play: L('แทงค์ที่ฮีลตัวเองได้ ดึงฝูงด้วย Einherjar Guard แล้วกระแทก Judgment Quake ใส่ทั้งวง', 'A self-healing tank: gather the pack with Einherjar Guard, then slam them all with Judgment Quake.'),
    pros: L('ทนที่สุดในเกม ฮีลตัวเองได้', 'Toughest class in the game, self-heals'), cons: L('ดาเมจไม่สูง', 'Modest damage'),
    tips: L('เหมาะเป็นแทงค์ตอนตี World Boss กับเพื่อน', 'Perfect tank for World Boss fights with friends.'),
  },
  hersir: {
    diff: 2, weapon: L('ดาบ (หรือดาบ + โล่)', 'Sword (or sword + shield)'),
    stats: [['str', 55], ['vit', 35], ['dex', 10]],
    build: [['hersir_might', 5], ['charge_strike', 5], ['spiral_pierce', 5], ['battle_aura', 5], ['ragnars_fury', 5]],
    play: L('บุกก่อน: Charge Strike พุ่งเข้าหา Spiral Pierce เจาะแนว แล้วปิดด้วย Ragnar\'s Fury รอบตัว', 'Strike first: close in with Charge Strike, drill the line with Spiral Pierce, finish with Ragnar\'s Fury around you.'),
    pros: L('ดาเมจสูงแต่ยังทน', 'High damage while staying tough'), cons: L('ป้องกันน้อยกว่าวาลคิรี', 'Less defense than Valkyrie'),
    tips: L('อัป STR มากกว่าสายแรก เพราะสกิลเน้นตี', 'Lean harder into STR than your first class — the kit is offensive.'),
  },
  galdr: {
    diff: 2, weapon: L('คทา', 'Rod'),
    stats: [['int', 60], ['dex', 30], ['vit', 10]],
    build: [['galdr_focus', 5], ['meteor_rune', 5], ['frost_nova', 5], ['rune_barrier', 5], ['chain_lightning', 5]],
    play: L('รวมมอนแล้ว Meteor Rune / Frost Nova ล้างทั้งฝูง มอนเข้าใกล้ Frost Nova ทำให้ช้าแล้วถอย', 'Gather enemies and wipe them with Meteor Rune / Frost Nova; when they close in, slow them with Frost Nova and back off.'),
    pros: L('เวทวงกว้างแรงที่สุด', 'Strongest area magic'), cons: L('ตัวบาง ร่ายนาน', 'Fragile, long casts'),
    tips: L('เปิด Rune Barrier ไว้ตลอด จะรอดง่ายขึ้นมาก', 'Keep Rune Barrier up at all times — survival improves a lot.'),
  },
  seidr: {
    diff: 3, weapon: L('คทา', 'Rod'),
    stats: [['int', 60], ['dex', 25], ['vit', 15]],
    build: [['seidr_lore', 5], ['soul_drain', 5], ['hex_of_hel', 5], ['void_lance', 5], ['dark_nova', 5]],
    play: L('สาปด้วย Hex of Hel ให้ติดพิษ แล้วยิง Soul Drain รัว ๆ ปิดเป้าแข็งด้วย Void Lance', 'Curse with Hex of Hel to poison, spam Soul Drain, and finish tough targets with Void Lance.'),
    pros: L('ร่ายไวที่สุด ดาเมจต่อเนื่อง', 'Fastest casting, steady damage'), cons: L('แรงน้อยกับมอนธาตุมืด/อมตะ', 'Weak against shadow/undead monsters'),
    tips: L('ธาตุมืดแรงกับมอนศักดิ์สิทธิ์ (เช่น Seraph Core)', 'Shadow magic hits holy monsters (like Seraph Core) hard.'),
  },
  skadi: {
    diff: 2, weapon: L('ธนู', 'Bow'),
    stats: [['dex', 60], ['agi', 30], ['luk', 10]],
    build: [['skadis_mark', 5], ['frost_arrow', 5], ['arrow_storm', 5], ['winter_hunt', 5], ['focused_volley', 5]],
    play: L('Frost Arrow ทำให้ช้า แล้วยิงห่า Arrow Storm ใส่ฝูง เป้าเดียวใช้ Focused Volley', 'Slow with Frost Arrow, rain Arrow Storm on packs, and use Focused Volley on single targets.'),
    pros: L('ดาเมจต่อเป้าสูงมาก ควบคุมฝูงได้', 'Very high damage, good crowd control'), cons: L('SP หมดไวถ้ากดทุกสกิล', 'SP drains fast if you spam everything'),
    tips: L('Winter Hunt + ตีปกติก็แรงมากแล้ว เก็บ SP ไว้ใช้ Arrow Storm', 'Winter Hunt plus basic attacks is already strong — save SP for Arrow Storm.'),
  },
  ullr: {
    diff: 2, weapon: L('ธนู', 'Bow'),
    stats: [['dex', 60], ['luk', 25], ['agi', 15]],
    build: [['ullr_focus', 5], ['sharp_shot', 5], ['snipe', 5], ['twin_shot', 5], ['wind_walk', 5]],
    play: L('ยิงจากไกลสุดด้วย Snipe นัดเดียวจบ มอนรวมกันใช้ Sharp Shot ทะลุแนว', 'Open from max range with Snipe for one-shot kills; use Sharp Shot to pierce lined-up enemies.'),
    pros: L('ระยะไกลที่สุด เป้าเดียวแรงสุด', 'Longest range, top single-target burst'), cons: L('ฝูงใหญ่จัดการยาก', 'Struggles with big packs'),
    tips: L('LUK เพิ่มคริ — Snipe ที่คริแรงมาก', 'LUK raises crit — a critical Snipe is enormous.'),
  },
  norn: {
    diff: 1, weapon: L('กระบอง', 'Club / mace'),
    stats: [['int', 55], ['vit', 35], ['dex', 10]],
    build: [['wyrd_thread', 5], ['great_restoration', 5], ['skuld_judgment', 5], ['ragnarok_light', 5], ['fate_weave', 5]],
    play: L('ฮีลใหญ่ด้วย Great Restoration บัฟ Fate Weave แล้วพิพากษาด้วย Skuld\'s Judgment / Ragnarok Light', 'Big heals with Great Restoration, buff with Fate Weave, and judge foes with Skuld\'s Judgment / Ragnarok Light.'),
    pros: L('ยืนระยะยาวที่สุด ปลอดภัย', 'Best sustain, very safe'), cons: L('ฆ่าช้ากับมอนศักดิ์สิทธิ์', 'Slow against holy monsters'),
    tips: L('ซัพพอร์ตปาร์ตี้ตอนตี World Boss ได้ดีมาก', 'Excellent party support for World Boss fights.'),
  },
  gythja: {
    diff: 3, weapon: L('กระบอง (ระยะประชิด)', 'Club / mace (melee)'),
    stats: [['str', 50], ['vit', 40], ['dex', 10]],
    build: [['iron_faith', 5], ['holy_fist', 5], ['triple_palm', 5], ['zen_body', 5], ['divine_burst', 5]],
    play: L('สายบู๊ประชิด: Holy Fist + Triple Palm รัว ๆ ปิดเป้าด้วย Divine Burst', 'A melee brawler: chain Holy Fist and Triple Palm, then finish with Divine Burst.'),
    pros: L('ตีแรง ทน ฮีลตัวเองได้จากสายแรก', 'Hits hard, durable, keeps Völva\'s self-heal'), cons: L('ต้องรีเซ็ตสเตตัสมาเป็น STR', 'Needs a stat reset toward STR'),
    tips: L('รีเซ็ตสเตตัสที่ Mimir แล้วอัป STR/VIT • หาอาวุธกระบองที่แรงขึ้น', 'Reset stats at Mimir and go STR/VIT • upgrade to a stronger mace.'),
  },
  phantom: {
    diff: 3, weapon: L('มีดสั้น', 'Dagger'),
    stats: [['agi', 50], ['str', 30], ['luk', 20]],
    build: [['phantom_edge', 5], ['mirror_strike', 5], ['fang_of_fenrir', 5], ['trickster_haste', 5], ['smoke_cyclone', 5]],
    play: L('Mirror Strike ฟันซ้อนไม่พลาด เปิด Fang of Fenrir ให้ติดพิษ หลายตัวใช้ Smoke Cyclone', 'Mirror Strike never misses; open with Fang of Fenrir for poison and use Smoke Cyclone on groups.'),
    pros: L('คริแรงที่สุด ตีเร็วที่สุด', 'Biggest crits, fastest attacks'), cons: L('ตัวบางกว่าสายแทงค์', 'Squishier than tanks'),
    tips: L('Trickster Haste เพิ่ม FLEE มาก — หลบได้แทบทุกตี', 'Trickster Haste adds lots of FLEE — you dodge most hits.'),
  },
  skald: {
    diff: 2, weapon: L('มีดสั้น', 'Dagger'),
    stats: [['agi', 45], ['dex', 35], ['luk', 20]],
    build: [['skald_verse', 5], ['sonic_strike', 5], ['song_of_battle', 5], ['war_drum', 5], ['hymn_of_loki', 5]],
    play: L('เปิดบทเพลง Song of Battle + Hymn of Loki แล้วยิง Sonic Strike ระยะกลาง โดนรุมใช้ War Drum ให้มึน', 'Open with Song of Battle + Hymn of Loki, attack with mid-range Sonic Strike, and stun crowds with War Drum.'),
    pros: L('บัฟยาว ตีระยะกลางได้', 'Long buffs, mid-range attacks'), cons: L('ดาเมจขึ้นกับบัฟ', 'Damage depends on buffs'),
    tips: L('DEX ทำให้ Sonic Strike แม่น • เหมาะเล่นปาร์ตี้', 'DEX keeps Sonic Strike accurate • great in parties.'),
  },
  warlord: {
    diff: 2, weapon: L('ขวาน', 'Axe'),
    stats: [['str', 50], ['agi', 35], ['vit', 15]],
    build: [['berserk_soul', 5], ['fenrir_bite', 5], ['ragnarok_cleave', 5], ['war_howl', 5], ['undying_rage', 5]],
    play: L('ลุยกลางฝูง Ragnarok Cleave กวาดรอบตัว Fenrir Bite ปิดเป้า เลือดน้อยเปิด Undying Rage ดูดเลือดคืน', 'Dive into the pack: sweep with Ragnarok Cleave, finish with Fenrir Bite, and pop Undying Rage to drain HP when low.'),
    pros: L('ฟาร์มฝูงเร็วที่สุด ดูดเลือดได้', 'Fastest pack farming, lifesteal'), cons: L('ใช้ HP เป็นค่าสกิล', 'Skills cost HP'),
    tips: L('ปั๊มยา HP ราว 35–40% + Undying Rage = แทบไม่ตาย', 'Auto-potion at 35–40% HP plus Undying Rage = nearly unkillable.'),
  },
  jotun: {
    diff: 2, weapon: L('ขวาน', 'Axe'),
    stats: [['str', 55], ['vit', 35], ['agi', 10]],
    build: [['jotun_blood', 5], ['titan_smash', 5], ['earth_splitter', 5], ['giants_wrath', 5], ['mountain_heart', 5]],
    play: L('เปิด Giant\'s Wrath แล้วทุบ Titan Smash ทีละตัว แนวยาวใช้ Earth Splitter เลือดน้อยใช้ Mountain Heart', 'Pop Giant\'s Wrath and crush one enemy at a time with Titan Smash; use Earth Splitter on lines and Mountain Heart when low.'),
    pros: L('ทุบเป้าเดียวแรงที่สุด ฮีลตัวเองได้', 'Strongest single hits, can self-heal'), cons: L('ตีช้า ทุกสกิลเสียเลือด', 'Slow swings; skills cost HP'),
    tips: L('เหมาะตีบอส/MVP — VIT ช่วยให้จ่ายเลือดได้มากขึ้น', 'Ideal for bosses/MVPs — VIT lets you afford the HP costs.'),
  },
};

const ClassBook = {
  sel: null,
  STAT_COL: { str: '#ff7a6a', agi: '#7ae0a0', vit: '#ffc56a', int: '#8ab0ff', dex: '#f0e07a', luk: '#e08aff' },
  init() {
    const w = document.createElement('div');
    w.id = 'w-classbook'; w.className = 'win hidden center'; w.style.width = '720px';
    w.innerHTML = `<div class="win-title"><span>${L('คู่มืออาชีพ (Class Guide)', 'Class Guide')}</span></div><div class="win-body"></div>`;
    (document.getElementById('w-help') || document.body.lastElementChild).after(w);
    const open0 = UI.open.bind(UI);
    UI.open = id => { open0(id); if (id === 'w-classbook') this.render(); };
    window.addEventListener('load', () => setTimeout(() => this.menuButton(), 0));
    document.addEventListener('keydown', e => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || (e.key || '').toLowerCase() !== 'l') return;
      const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (typeof G === 'undefined' || !G.started) return;
      UI.toggle('w-classbook');
    });
  },
  menuButton() {
    const m = document.getElementById('menubar'); if (!m || m.querySelector('[data-win="w-classbook"]')) return;
    const b = document.createElement('button');
    b.dataset.win = 'w-classbook'; b.title = L('คู่มืออาชีพ (L)', 'Class Guide (L)');
    b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 8h7M9 11.5h5"/></svg><span>${L('อาชีพ', 'Classes')}</span><small>L</small>`;
    b.addEventListener('click', () => { UI.toggle('w-classbook'); if (typeof Pad !== 'undefined' && Pad.enabled() && UI.setFold) UI.setFold(m, true); });
    const sit = [...m.querySelectorAll('button')].find(x => (x.querySelector('small') || {}).textContent === 'X'); // ปุ่มนั่ง อยู่ท้ายสุดเสมอ
    m.insertBefore(b, sit || null);
  },

  tree() {
    return [['novice', []], ...FIRST_JOBS.map(j => [j, SECOND_JOBS[j] || []])];
  },
  stars(n) { return '★'.repeat(n) + '☆'.repeat(3 - n); },
  render() {
    const body = document.querySelector('#w-classbook .win-body'); if (!body) return;
    const p = G.player, cur = p ? p.job : 'novice';
    if (!this.sel || !JOBS[this.sel]) this.sel = cur;
    body.innerHTML = '';
    // ---- สารบัญ ----
    const toc = h('nav', { class: 'cb-toc', 'aria-label': L('สารบัญอาชีพ', 'Class index') });
    const item = (id, lvl) => h('button', { type: 'button', class: `cb-ti l${lvl}` + (id === this.sel ? ' on' : '') + (id === cur ? ' me' : ''), style: `--g:${JOBS[id].glow || '#7ad8ff'}`,
      onclick: () => { this.sel = id; this.render(); } },
      h('i', {}), h('span', {}, JOBS[id].name), id === cur ? h('em', {}, L('คุณ', 'You')) : null);
    toc.append(h('div', { class: 'cb-th' }, L('สารบัญ', 'Contents')));
    toc.append(h('div', { class: 'cb-tg' }, L('เริ่มต้น', 'Starter')), item('novice', 0));
    toc.append(h('div', { class: 'cb-tg' }, L('คลาสแรก → คลาสขั้น 2', 'First class → Second class')));
    for (const [j, kids] of this.tree().slice(1)) { toc.append(item(j, 1)); for (const k of kids) toc.append(item(k, 2)); }
    // ---- รายละเอียด ----
    const id = this.sel, J = JOBS[id], B = CLASSBOOK[id] || {};
    const det = h('article', { class: 'cb-det', style: `--g:${J.glow || '#7ad8ff'}` });
    const art = Art.jobKey(id, (p && p.gender) || 'f'), em = Art.get('emblem_' + id);
    const tierTxt = id === 'novice' ? L('ผู้เริ่มต้น', 'Starter') : J.tier === 2 ? L(`คลาสขั้น 2 · ต่อจาก ${JOBS[J.parent].name}`, `Second class · from ${JOBS[J.parent].name}`) : L('คลาสแรก', 'First class');
    det.append(h('header', { class: 'cb-hero' },
      art ? h('img', { class: 'cb-art', src: Art.get(art).src, alt: '' }) : null,
      h('div', { class: 'cb-hd' },
        h('small', {}, tierTxt),
        h('h3', {}, em ? h('img', { src: em.src, alt: '' }) : null, J.name),
        h('div', { class: 'cb-thai' }, J.thai || ''),
        h('div', { class: 'cb-chips' },
          J.role ? h('span', {}, J.role) : null,
          B.diff ? h('span', { title: L('ความยาก', 'Difficulty') }, `${L('ความยาก', 'Difficulty')} ${this.stars(B.diff)}`) : null,
          B.weapon ? h('span', {}, `${L('อาวุธ', 'Weapon')}: ${B.weapon}`) : null)),
    ));
    if (J.desc) det.append(h('p', { class: 'cb-desc' }, J.desc));
    // วิธีได้อาชีพนี้
    const how = id === 'novice' ? L('ตัวละครใหม่ทุกตัวเริ่มที่นี่', 'Every new character starts here.')
      : J.tier === 2 ? L(`เป็น ${JOBS[J.parent].name} แล้วมี Base Lv ${SECOND_JOB_REQ.base} + Job Lv ${SECOND_JOB_REQ.job} (แนะนำ Job ${JOBS[J.parent].jobMax} เพื่อได้แต้มครบ) แล้วคุยกับ Mimir AI ในนีโอเอลด์ไฮม์ — เลือกได้ 1 จาก 2 สาย`,
        `As a ${JOBS[J.parent].name}, reach Base Lv ${SECOND_JOB_REQ.base} + Job Lv ${SECOND_JOB_REQ.job} (Job ${JOBS[J.parent].jobMax} recommended for every point), then talk to Mimir AI in Neo Eldheim — pick 1 of 2 branches.`)
        : L(`Novice ที่มี Job Lv ${JOB_CHANGE_LV} คุยกับ Mimir AI ในนีโอเอลด์ไฮม์`, `As a Novice with Job Lv ${JOB_CHANGE_LV}, talk to Mimir AI in Neo Eldheim.`);
    det.append(this.sec(L('วิธีได้อาชีพนี้', 'How to unlock'), h('p', {}, how)));
    if (SECOND_JOBS[id]) det.append(this.sec(L('เส้นทางต่อไป', 'Next path'), h('div', { class: 'cb-next' }, ...SECOND_JOBS[id].map(k =>
      h('button', { type: 'button', style: `--g:${JOBS[k].glow}`, onclick: () => { this.sel = k; this.render(); } }, h('b', {}, JOBS[k].name), h('small', {}, JOBS[k].role || ''))))));
    // วิธีเล่น + ข้อดีข้อเสีย
    if (B.play) det.append(this.sec(L('วิธีเล่น', 'How to play'), h('p', {}, B.play),
      h('div', { class: 'cb-pc' }, h('div', { class: 'pro' }, h('b', {}, L('จุดเด่น', 'Strengths')), B.pros), h('div', { class: 'con' }, h('b', {}, L('จุดอ่อน', 'Weaknesses')), B.cons))));
    // สเตตัสแนะนำ
    if (B.stats) det.append(this.sec(L('สเตตัสแนะนำ (สัดส่วนแต้ม)', 'Recommended stats (point split)'),
      h('div', { class: 'cb-stats' }, ...B.stats.map(([k, v]) => h('div', { class: 'cb-st' }, h('span', {}, k.toUpperCase()), h('i', {}, h('b', { style: `width:${v}%;background:${this.STAT_COL[k]}` })), h('em', {}, v + '%'))))));
    // ลำดับอัปสกิล
    if (B.build) {
      const total = B.build.reduce((a, [, n]) => a + n, 0);
      const ol = h('ol', { class: 'cb-build' }, ...B.build.map(([sid, n]) => {
        const s = SKILLS[sid]; if (!s) return null;
        return h('li', {}, UI.skillIcon(sid), h('div', {}, h('b', {}, `${s.name} `, h('span', {}, `Lv ${n}${n < s.max ? '/' + s.max : ' (MAX)'}`), s.type === 'passive' ? h('em', {}, L('ติดตัว', 'Passive')) : null), h('small', {}, s.desc)));
      }).filter(Boolean));
      const note = J.tier === 2 ? L(`ใช้แต้มคลาสนี้ ${total} แต้ม (Job 1→${J.jobMax}) — แต้มคลาสแรกที่เหลือยกมาใช้ต่อได้`, `Uses ${total} points from this class (Job 1→${J.jobMax}) — leftover first-class points carry over.`)
        : id === 'novice' ? L(`${total} แต้ม (Job 1→${J.jobMax})`, `${total} points (Job 1→${J.jobMax})`)
        : L(`${total} แต้ม จากทั้งหมด ${J.skills.reduce((a, k) => a + (SKILLS[k] ? SKILLS[k].max : 0), 0)} ช่อง — ต้องเลือก ไม่ได้ครบทุกสกิล`, `${total} points for ${J.skills.reduce((a, k) => a + (SKILLS[k] ? SKILLS[k].max : 0), 0)} skill slots — you must choose; you can't max everything.`);
      det.append(this.sec(L('ลำดับอัปสกิลแนะนำ', 'Recommended skill order'), h('p', { class: 'cb-note' }, note), ol));
    }
    // สกิลทั้งหมดของอาชีพ
    det.append(this.sec(L(`สกิลทั้งหมด (${J.skills.length})`, `All skills (${J.skills.length})`), h('div', { class: 'cb-all' }, ...J.skills.filter(k => SKILLS[k]).map(k => {
      const s = SKILLS[k];
      return h('div', { class: 'cb-sk' }, UI.skillIcon(k), h('div', {}, h('b', {}, s.name, s.type === 'passive' ? h('em', {}, L('ติดตัว', 'Passive')) : null), h('small', {}, s.desc + (s.cd ? L(` [คูลดาวน์ ${s.cd} วิ]`, ` [Cooldown ${s.cd}s]`) : ''))));
    }))));
    if (B.tips) det.append(this.sec(L('เคล็ดลับ', 'Tips'), h('p', { class: 'cb-tip' }, '💡 ', B.tips)));
    body.append(h('div', { class: 'cb-wrap' }, toc, det));
    det.scrollTop = 0;
  },
  sec(title, ...kids) { return h('section', { class: 'cb-sec' }, h('h4', {}, title), ...kids); },
};
ClassBook.init();
