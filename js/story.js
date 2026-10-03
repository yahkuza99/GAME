'use strict';
// ============================================================
//  เรื่องราว (docs/STORY.md → ในเกม): บทนำครั้งแรก, บรรทัดตำนานตอนเข้าแผนที่, บรรทัด MVP, บทพูด Mimir ต่อ Class
//  สถานะเก็บใน p.story = { prologue: 1, eirScan, eirMask, helMet, helEnd, core: 'gave'|'kept', ... } (อยู่ใน SAVE_FIELDS)
//    บทที่ 4: sigrunMet, sigrunAsk (Sigrún) • loptWood (Lopt ปากป่า) • eirAsh • mimirKitsura — ดู js/npc.js
//  ไม่มีระบบใหม่ — ใช้กล่องบทสนทนา แบนเนอร์ ประกาศ และแชตที่มีอยู่แล้ว
// ============================================================

const Story = {
  // ---------- บทที่ 0 — ใบแรก (แสดงครั้งเดียวตอนเข้าโลกครั้งแรก) ----------
  PROLOGUE: [
    L('มีต้นไม้ต้นหนึ่งที่เก็บทุกคนไว้ในน้ำเลี้ยงของมัน', 'There was once a tree that held everyone within its sap.'),
    L('คืนหนึ่ง กิ่งของมันหักพร้อมกันทั้งเก้ากิ่ง ผู้คนเรียกคืนนั้นว่า Ragnarök', 'One night, all nine of its branches broke at once. People call that night Ragnarök.'),
    L('ตั้งแต่นั้น ไม่มีใครเกิดใหม่ มีแต่คนเก่าที่ถูกปลุกซ้ำ', 'Since then, no one has been born. Only the old ones, woken again and again.'),
    L('...จนกระทั่งวันนี้', '...until today.'),
    L('วิเซอร์ของเจ้าสว่างขึ้นเป็นครั้งแรก', 'Your visor lights up for the very first time.'),
    L('— ยินดีต้อนรับสู่<span class="nb">ไอรอนวัลฮัลลา</span> หน่วยใหม่ —', '— Welcome to <span class="nb">Iron Valhalla</span>, new unit —'), // .nb กันตัดบรรทัดกลางคำบนจอแคบ (ข้อความคงที่ในโค้ด ใส่เป็น HTML ได้)
  ],

  // ---------- บรรทัดตำนานใต้ชื่อแผนที่ (แบนเนอร์ตอนเข้าแผนที่) ----------
  MAP_LINES: {
    eldheim: L('รากใหญ่ยังมีน้ำเลี้ยงไหล — ที่เดียวที่ใบไม้ยังมารับประกาย', 'The great root still runs with sap — the one place the leaves still come for the sparks.'),
    meadow: L('สวนหน้าบ้านของต้นไม้ คนสวนยังทำงานอยู่ แต่ลืมไปแล้วว่าทำให้ใคร', 'The tree\'s front garden. The gardeners still work... though they\'ve forgotten for whom.'),
    mistlake: L('ทูตคนสุดท้ายของ Odin บินวนในหมอกมาหลายสิบปี — รอใครบางคน', 'Odin\'s last envoy has circled in the mist for decades — waiting for someone.'),
    wolfwood: L('ไส้กรองเถ้ายังอุ่น... ไฟเพิ่งผ่านไป และมันเดินลงไปทางใต้', 'The ash filters are still warm... the fire just passed, and it walked south.'),
    helcave: L('รากบางจนใบไม้มาช้า — ประกายนับพันส่องแสงเบา ๆ บนชั้นวาง', 'The roots run so thin the leaves come late — a thousand sparks glow softly on the shelves.'),
    archive: L('ชั้นวางล่างสุดของคลังประกาย — สนิมเริ่มลามขึ้นมาจากข้างล่าง', 'The lowest shelves of the spark archive — rust is creeping up from below.'),
    roots: L('รากของ Yggdrasil ถูกแทะจากข้างล่าง — เสียงแทะไม่เคยหยุด', 'The roots of Yggdrasil are being gnawed from below — the gnawing never stops.'),
  },
  // หลังปราบ MVP ของแผนที่นั้นแล้ว บรรทัดเปลี่ยน • แผนที่ที่ไม่มี MVP: เปลี่ยนเมื่อผ่านเควสต์ใน MAP_AFTER_QUEST
  MAP_LINES_AFTER: {
    eldheim: L('รากใหญ่ยังมีน้ำเลี้ยงไหล — และมีคนรอเจ้ากลับมาที่นี่เสมอ', 'The great root still runs with sap — and someone here is always waiting for you to come back.'),
    meadow: L('โดรนสงบลงแล้ว... แต่รอยเท้าของใครบางคนยังมุ่งไปทางตะวันออก', 'The drones have calmed... but someone\'s footprints still lead east.'),
    mistlake: L('หมอกเงียบลงแล้ว — ข้อความของ Odin ถูกส่งถึงมือผู้ถือกุญแจราก', 'The mist has gone quiet — Odin\'s message has reached the Bearer of the Root Key.'),
    wolfwood: L('เถ้าเย็นลงแล้ว รอยไหม้ยังชี้ลงไปทางโพรง — และไฟตัวนั้นมีชื่อ: Kitsura', 'The ash has cooled, but the scorch marks still point down toward the Hollow — and that fire has a name: Kitsura.'),
    helcave: L('ไฟดับแล้ว ชั้นวางประกายยังส่องแสง — และเสียงแทะดังมาจากข้างล่าง', 'The fire is out. The spark shelves still glow — and a gnawing sound rises from below.'),
    archive: L('ประกายที่ขึ้นสนิมถูกส่งขึ้นไปให้ Eir ตรวจแล้ว — ชั้นวางล่างสุดยังเรืองแสงสีสนิม', 'The rusted sparks have gone up to Eir for analysis — the lowest shelves still glow the color of rust.'),
    roots: L('Garmr ล้มลงแล้ว ประตูรากเงียบ — แต่เสียงแทะยังดังมาจากที่ลึกกว่านั้น', 'Garmr has fallen and the root gate is silent — yet the gnawing still echoes from somewhere deeper.'),
  },
  MAP_AFTER_QUEST: { eldheim: 'lv30', meadow: 'buzz', wolfwood: 'ch4_lopt', archive: 'ch6_eir' },

  // ---------- MVP: บรรทัดตอนเกิด (ใต้ชื่อในฉากเปิดตัว) / แชต / ตอนล้ม ----------
  MVP: {
    seraph_pudding: {
      sub: L('ทูตแห่งวัลฮัลลา — ยืนยันตัวตนไม่ได้', 'Envoy of Valhalla — Identity Unverified'),
      spawn: L('Seraph Core ถือข้อความสุดท้ายของ Odin มาหลายสิบปี ระบบยืนยันตัวตนพัง — มันจะโจมตีทุกคนที่เข้าใกล้', 'For decades, Seraph Core has carried Odin\'s final message. Its identity check is broken — it attacks anyone who comes near.'),
      fallName: L('[ข้อความจากทูต]', '[Message from the Envoy]'),
      fall: L('ระบบยืนยันตัวตนดับลง... ข้อความถูกปล่อยออกมา<br><b>“ถึงผู้ถือกุญแจราก — กิ่งไม่ได้หัก มันถูกตัด จากข้างใน ข้าให้อภัยเขา”</b>', 'The identity check goes dark... the message is released.<br><b>“To the Bearer of the Root Key — the branch did not break. It was cut. From within. I forgive him.”</b>'),
      fallShort: L('ข้อความของ Odin: “กิ่งไม่ได้หัก มันถูกตัด จากข้างใน ข้าให้อภัยเขา”', 'Odin\'s message: “The branch did not break. It was cut. From within. I forgive him.”'),
    },
    kitsura: {
      sub: L('หน่วยเผาผลาญ — คำสั่ง: ดับกิ่งที่ 9', 'Incinerator Unit — Order: Extinguish Branch 9'),
      spawn: L('หน่วยเผาผลาญ Kitsura EX — คำสั่ง: ดับกิ่งที่ 9 — ผู้อนุมัติ: [ผู้พิทักษ์] — มันกำลังเผาชั้นวางประกายทีละชั้น', 'Incinerator Unit Kitsura EX — Order: Extinguish Branch 9 — Authorized by: [GUARDIAN] — it is burning the spark shelves one by one.'),
      fallName: '[Kitsura EX]',
      fall: L('เก้าหัวเผาดับลงทีละหัว... บนแผ่นคำสั่งของมันมีลายเซ็นผู้อนุมัติ<br><b>[ผู้พิทักษ์ — กุญแจถูกใช้เมื่อสามคืนก่อน]</b> — ใครบางคนเพิ่งใช้กุญแจนั้น', 'The nine burners die out one by one... its order plate bears an authorizing signature.<br><b>[GUARDIAN — key used three nights ago]</b> — someone has just used that key.'),
      fallShort: L('เก้าหัวเผาดับลง — ใครบางคนเพิ่งใช้กุญแจของผู้พิทักษ์ปลุกมัน', 'The nine burners die out — someone used a Guardian\'s key to wake it.'),
    },
  },

  // ---------- Mimir: แม่พิมพ์ของหกวีรชน (บรรทัดต่อ Class ตอนเลือกอัปเกรด) ----------
  JOB_LINES: {
    einherjar: L('แม่พิมพ์นี้หนักกว่าแบบอื่น เพราะมันแบกประตูทั้งบานไว้ — เจ้าจะเป็นคนที่โดนก่อนเสมอ และนั่นคือเกียรติ', 'This mold weighs more than the rest, for it carries an entire gate — you will always be the first one struck. And that is an honor.'),
    runecaster: L('รูนคือภาษาที่ต้นไม้ยังฟังอยู่ เขียนให้ถูก แล้วโลกจะตอบ — เขียนผิด โลกก็ตอบเช่นกัน ระวังด้วย', 'Runes are the language the tree still listens to. Write them true, and the world answers — write them wrong, and it answers all the same. Take care.'),
    wildhunter: L('แม่พิมพ์นี้มีสองเงา เจ้าและหมาป่า อย่าถามข้าว่ามันมาจากไหน ข้าบันทึกไว้แค่ว่ามันไม่เคยทิ้งเธอ', 'This mold casts two shadows: yours, and a wolf\'s. Do not ask me where it came from. I recorded only that it never left her side.'),
    volva: L('แม่พิมพ์นี้ไม่ได้สอนให้เจ้าทำร้าย มันสอนให้เจ้าปล่อยสิ่งที่ควรได้พัก — แต่ปล่อยแรง ๆ ได้ ถ้ามันไม่ยอม', 'This mold does not teach you to harm. It teaches you to release what deserves rest — though you may release it hard, if it refuses.'),
    trickster: L('ข้าไม่รู้ว่าใครทิ้งแม่พิมพ์นี้ไว้ ข้ารู้แค่ว่าคนที่ใช้มันไม่เคยถูกจับได้ — จนกว่าจะอยากถูกจับ', 'I do not know who left this mold behind. I know only that those who use it are never caught — until they wish to be.'),
    berserker: L('แม่พิมพ์นี้ไม่มีตัวจำกัด เจ้าจะร้อนเร็ว ล้มง่าย และน่ากลัวกว่าทุกแบบ — ใบไม้จะมารับเจ้าเสมอ แต่อย่าทำให้มันต้องมาบ่อยนัก', 'This mold has no limiter. You will run hot, fall easily, and be more fearsome than any other — the leaves will always come for you, but do not make them come too often.'),
    valkyrie: L('วาลคิรีไม่ได้เลือกว่าใครควรตาย พวกนางเลือกว่าใครควรได้ยืนต่อ — ตั้งแต่วันนี้ เจ้าคือคนที่ยืนอยู่หน้าประตูนั้น', 'Valkyries do not choose who should fall. They choose who should keep standing — from this day, you are the one who stands before that gate.'),
    galdr: L('รูนเขียนแล้วนิ่ง แต่กัลดร์ต้องร้อง — เสียงของเจ้าจะสั่นสะเทือนถึงราก จงร้องให้ถูกบท', 'Written runes lie still, but galdr must be sung — your voice will shake the very roots. Sing the verse true.'),
    skadi: L('สกาดีเลือกภูเขาแทนทะเล เลือกความหนาวแทนความสบาย — แม่พิมพ์นี้จะทำให้มือเจ้านิ่งแม้ในพายุหิมะ', 'Skadi chose the mountain over the sea, the cold over comfort — this mold will keep your hands steady even in a blizzard.'),
    norn: L('สามนอร์นทอเส้นด้ายของทุกชีวิต แม่พิมพ์นี้ให้เจ้าจับปลายด้ายได้หนึ่งเส้น — อย่าดึงแรงเกินไป', 'The three Norns weave the thread of every life. This mold lets you hold the end of one thread — do not pull too hard.'),
    phantom: L('โลกิหัวเราะตอนข้าถอดรหัสแม่พิมพ์นี้ได้ — ข้าไม่แน่ใจว่าเขาหัวเราะเพราะยินดี หรือเพราะรู้อะไรที่ข้าไม่รู้', 'Loki laughed when I decoded this mold — I am not certain whether he laughed in delight, or because he knew something I did not.'),
    warlord: L('ฝูงหมาป่าไม่ต้องการผู้ที่แข็งแรงที่สุด มันต้องการผู้ที่ล้มแล้วลุกเร็วที่สุด — และเจ้าลุกมาแล้วกี่ครั้ง?', 'A wolf pack does not need the strongest. It needs the one who rises fastest after falling — and how many times have you risen?'),
    hersir: L('เฮิร์เซียร์ไม่รอให้ศัตรูมาถึงกำแพง พวกเขาเดินออกไปหา — แม่พิมพ์นี้หนักเท่าเดิม แต่หันไปข้างหน้า', 'A hersir does not wait for the enemy to reach the wall. They march out to meet it — this mold weighs the same, but faces forward.'),
    seidr: L('เซดร์คือเวทที่แม้แต่โอดินยังต้องเรียนอย่างลับ ๆ — ความมืดไม่ใช่ความชั่ว มันแค่ไม่ชอบให้ใครเห็นมันทำงาน', 'Seidr is the magic even Odin had to learn in secret — darkness is not evil. It simply dislikes being watched at work.'),
    ullr: L('อุลล์ยิงได้ไกลกว่าที่ตาจะมองเห็น เพราะเขาเล็งด้วยความอดทน — หายใจออก แล้วปล่อย', 'Ullr could strike farther than the eye can see, for he aimed with patience — breathe out, then release.'),
    gythja: L('บางคำอธิษฐานต้องพูดด้วยปาก บางคำต้องพูดด้วยหมัด — แม่พิมพ์นี้เลือกอย่างหลัง', 'Some prayers are spoken with the mouth. Some are spoken with the fist — this mold chose the latter.'),
    skald: L('ทุกตำนานต้องมีคนเล่า แม่พิมพ์นี้ทำให้เจ้าเป็นทั้งคนเล่าและตัวเอก — ร้องให้ดัง ศัตรูจะได้ยินก่อนเห็น', 'Every legend needs a teller. This mold makes you both the teller and the hero — sing it loud, so your foes hear you before they see you.'),
    jotun: L('ยักษ์ไม่กลัวขวาน มันกลัวคนที่ยอมเจ็บเพื่อฟันให้ถึง — เจ้ามีเลือดพอจะจ่ายไหม?', 'Giants do not fear the axe. They fear the one willing to bleed to land the blow — do you have enough to pay?'),
  },

  // ---------- สถานะ ----------
  st() {
    const p = G.player;
    if (!p) return {};
    if (!p.story || typeof p.story !== 'object') p.story = {};
    return p.story;
  },
  mapLine(id) {
    const p = G.player, k = (p && p.kills) || {};
    const mvp = MAP_DEFS[id] && MAP_DEFS[id].mvp, q = this.MAP_AFTER_QUEST[id];
    const after = q ? !!p && typeof Quest !== 'undefined' && Quest.passed(q) : !!(mvp && k[mvp]);
    if (after && this.MAP_LINES_AFTER[id]) return this.MAP_LINES_AFTER[id];
    return this.MAP_LINES[id] || '';
  },
  mvpSub(id) { const m = this.MVP[id]; return m ? m.sub : ''; },
  onMvpSpawn(id) { const m = this.MVP[id]; if (m) UI.msg(`📖 ${m.spawn}`, 'map'); },
  onMvpKill(id) {
    const m = this.MVP[id], p = G.player; if (!m) return;
    UI.msg(`📖 ${m.fallShort}`, 'map');
    // ครั้งแรกที่ปราบได้: ฉากสั้น ๆ ในกล่องบทสนทนา (ไม่บังคับ ปิดได้) หลังจากฉลองชัยสักครู่
    if (((p.kills || {})[id] || 0) !== 1) return;
    setTimeout(() => this.cut(m.fallName, m.fall, `mvp_${id}`), 1800);
  },
  // กล่องบทสนทนาเล่าเรื่อง (ไม่ใช่ NPC): ใช้ช่องทางเดียวกับ NPC.talk เพื่อไม่ชนกัน
  async cut(name, html, illust) {
    if (!G.started || NPC.busy) return;
    NPC.busy = true;
    const sid = NPC.sid = (NPC.sid || 0) + 1;
    try { UI.illust(illust || null); await UI.say(name, html); }
    catch (e) { /* ปิดกล่อง */ }
    finally { if (NPC.sid === sid) { NPC.busy = false; UI.dlgClose(); UI.illust(null); } }
  },

  // ---------- เริ่มเกม: บทนำครั้งแรก ----------
  onStart(p, isNew) {
    const st = this.st();
    if (st.prologue) return;
    this.prologue().then(() => {
      st.prologue = 1;
      saveGame();
      if (G.started && G.map) UI.announceMap(G.map); // แบนเนอร์แผนที่ที่ถูกบทนำบังไว้ แสดงอีกครั้ง
    });
  },
  open: false,
  prologue() {
    if (this.open) return this._p || Promise.resolve();
    this.open = true;
    const lines = this.PROLOGUE, touch = matchMedia('(pointer: coarse)').matches;
    let i = -1, leaving = false, lastAt = 0;
    const linesEl = h('div', { class: 'pl-lines' });
    const dots = h('div', { class: 'pl-dots', 'aria-hidden': 'true' }, ...lines.map(() => h('i')));
    const hint = h('div', { class: 'pl-hint' }, touch ? L('แตะเพื่อไปต่อ', 'Tap to continue') : L('คลิกหรือกด Space เพื่อไปต่อ', 'Click or press Space to continue'));
    const skip = h('button', { id: 'prologue-skip', class: 'pl-skip', type: 'button', onclick: e => { e.stopPropagation(); end(); } }, L('ข้าม', 'Skip'));
    const el = h('div', { id: 'prologue', class: 'pl', role: 'dialog', 'aria-label': L('บทนำ', 'Prologue') },
      h('div', { class: 'pl-bg', 'aria-hidden': 'true' }), h('div', { class: 'pl-visor', 'aria-hidden': 'true' }),
      skip, h('div', { class: 'pl-kicker' }, 'CHAPTER 0', h('span', {}, L('ใบแรก', 'The First Leaf'))),
      linesEl, dots, hint);
    const next = () => {
      const now = performance.now();
      if (leaving || now - lastAt < 320) return; // กันแตะซ้ำ/แตะสองครั้ง
      lastAt = now;
      if (i >= lines.length - 1) { end(); return; }
      i++;
      [...linesEl.children].forEach(c => c.classList.add('past'));
      const line = h('p', { class: 'pl-line' + (i === lines.length - 1 ? ' pl-final' : ''), html: lines[i] });
      linesEl.append(line);
      requestAnimationFrame(() => requestAnimationFrame(() => line.classList.add('in'))); // เฟดเข้า (transition) หลังวางลง DOM
      dots.children[i].classList.add('on');
      if (i === 4) { el.classList.add('lit'); Sound.play('holy'); } // "วิเซอร์สว่างขึ้นเป็นครั้งแรก"
      else if (i === lines.length - 1) { el.classList.add('welcome'); hint.textContent = touch ? L('แตะเพื่อเริ่มต้น', 'Tap to begin') : L('คลิกหรือกด Space เพื่อเริ่มต้น', 'Click or press Space to begin'); Sound.play('buff'); }
      else if (i > 0) Sound.play('click');
    };
    const end = () => {
      if (leaving) return; leaving = true;
      el.classList.add('leaving');
      window.removeEventListener('keydown', onKey, true);
      setTimeout(() => { el.remove(); this.open = false; this._p = null; done(); }, 720);
    };
    const onKey = e => {
      if (!this.open) return;
      const k = e.key;
      if (k === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); end(); return; }
      if (k === ' ' || k === 'Enter' || k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); e.stopImmediatePropagation(); next(); return; }
      e.stopImmediatePropagation(); // คีย์ลัดของเกมไม่ทำงานระหว่างบทนำ
    };
    window.addEventListener('keydown', onKey, true);
    el.addEventListener('click', () => next());
    document.body.append(el);
    requestAnimationFrame(() => { el.classList.add('show'); setTimeout(next, 450); });
    let done;
    this._p = new Promise(r => { done = r; });
    return this._p;
  },
};
