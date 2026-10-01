'use strict';
// ============================================================
//  เรื่องราว (docs/STORY.md → ในเกม): บทนำครั้งแรก, บรรทัดตำนานตอนเข้าแผนที่, บรรทัด MVP, บทพูด Mimir ต่อคลาส
//  สถานะเก็บใน p.story = { prologue: 1, eirScan, eirMask, helMet, helEnd, core: 'gave'|'kept', ... } (อยู่ใน SAVE_FIELDS)
//  ไม่มีระบบใหม่ — ใช้กล่องบทสนทนา แบนเนอร์ ประกาศ และแชตที่มีอยู่แล้ว
// ============================================================

const Story = {
  // ---------- บทที่ 0 — ใบแรก (แสดงครั้งเดียวตอนเข้าโลกครั้งแรก) ----------
  PROLOGUE: [
    'มีต้นไม้ต้นหนึ่งที่เก็บทุกคนไว้ในน้ำเลี้ยงของมัน',
    'คืนหนึ่ง กิ่งของมันหักพร้อมกันทั้งเก้ากิ่ง ผู้คนเรียกคืนนั้นว่า Ragnarök',
    'ตั้งแต่นั้น ไม่มีใครเกิดใหม่ มีแต่คนเก่าที่ถูกปลุกซ้ำ',
    '...จนกระทั่งวันนี้',
    'วิเซอร์ของเจ้าสว่างขึ้นเป็นครั้งแรก',
    '— ยินดีต้อนรับสู่<span class="nb">นีโอมิดการ์ด</span> หน่วยใหม่ —', // .nb กันตัดบรรทัดกลางคำบนจอแคบ (ข้อความคงที่ในโค้ด ใส่เป็น HTML ได้)
  ],

  // ---------- บรรทัดตำนานใต้ชื่อแผนที่ (แบนเนอร์ตอนเข้าแผนที่) ----------
  MAP_LINES: {
    eldheim: 'รากใหญ่ยังมีน้ำเลี้ยงไหล — ที่เดียวที่ใบไม้ยังมารับประกาย',
    meadow: 'สวนหน้าบ้านของต้นไม้ คนสวนยังทำงานอยู่ แต่ลืมไปแล้วว่าทำให้ใคร',
    mistlake: 'ทูตคนสุดท้ายของ Odin บินวนในหมอกมาหลายสิบปี — รอใครบางคน',
    wolfwood: 'ไส้กรองเถ้ายังอุ่น... ไฟเพิ่งผ่านไป และมันเดินลงไปทางใต้',
    helcave: 'รากบางจนใบไม้มาช้า — ประกายนับพันส่องแสงเบา ๆ บนชั้นวาง',
  },
  // หลังปราบ MVP ของแผนที่นั้นแล้ว บรรทัดเปลี่ยน
  MAP_LINES_AFTER: {
    mistlake: 'หมอกเงียบลงแล้ว — ข้อความของ Odin ถูกส่งถึงมือผู้ถือกุญแจราก',
    helcave: 'ไฟดับแล้ว ชั้นวางประกายยังส่องแสง — และเสียงแทะดังมาจากข้างล่าง',
  },

  // ---------- MVP: บรรทัดตอนเกิด (ใต้ชื่อในฉากเปิดตัว) / แชต / ตอนล้ม ----------
  MVP: {
    seraph_pudding: {
      sub: 'ทูตแห่งวัลฮัลลา — ยืนยันตัวตนไม่ได้',
      spawn: 'Seraph Core ถือข้อความสุดท้ายของ Odin มาหลายสิบปี ระบบยืนยันตัวตนพัง — มันจะโจมตีทุกคนที่เข้าใกล้',
      fallName: '[ข้อความจากทูต]',
      fall: 'ระบบยืนยันตัวตนดับลง... ข้อความถูกปล่อยออกมา<br><b>“ถึงผู้ถือกุญแจราก — กิ่งไม่ได้หัก มันถูกตัด จากข้างใน ข้าให้อภัยเขา”</b>',
      fallShort: 'ข้อความของ Odin: “กิ่งไม่ได้หัก มันถูกตัด จากข้างใน ข้าให้อภัยเขา”',
    },
    kitsura: {
      sub: 'หน่วยเผาผลาญ — คำสั่ง: ดับกิ่งที่ 9',
      spawn: 'หน่วยเผาผลาญ Kitsura EX — คำสั่ง: ดับกิ่งที่ 9 — ผู้อนุมัติ: [ผู้พิทักษ์] — มันกำลังเผาชั้นวางประกายทีละชั้น',
      fallName: '[Kitsura EX]',
      fall: 'เก้าหัวเผาดับลงทีละหัว... บนแผ่นคำสั่งของมันมีลายเซ็นผู้อนุมัติ<br><b>[ผู้พิทักษ์ — กุญแจถูกใช้เมื่อสามคืนก่อน]</b> — ใครบางคนเพิ่งใช้กุญแจนั้น',
      fallShort: 'เก้าหัวเผาดับลง — ใครบางคนเพิ่งใช้กุญแจของผู้พิทักษ์ปลุกมัน',
    },
  },

  // ---------- Mimir: แม่พิมพ์ของหกวีรชน (บรรทัดต่อคลาส ตอนเลือกอัปเกรด) ----------
  JOB_LINES: {
    einherjar: 'แม่พิมพ์นี้หนักกว่าแบบอื่น เพราะมันแบกประตูทั้งบานไว้ — เจ้าจะเป็นคนที่โดนก่อนเสมอ และนั่นคือเกียรติ',
    runecaster: 'รูนคือภาษาที่ต้นไม้ยังฟังอยู่ เขียนให้ถูก แล้วโลกจะตอบ — เขียนผิด โลกก็ตอบเช่นกัน ระวังด้วย',
    wildhunter: 'แม่พิมพ์นี้มีสองเงา เจ้าและหมาป่า อย่าถามข้าว่ามันมาจากไหน ข้าบันทึกไว้แค่ว่ามันไม่เคยทิ้งเธอ',
    volva: 'แม่พิมพ์นี้ไม่ได้สอนให้เจ้าทำร้าย มันสอนให้เจ้าปล่อยสิ่งที่ควรได้พัก — แต่ปล่อยแรง ๆ ได้ ถ้ามันไม่ยอม',
    trickster: 'ข้าไม่รู้ว่าใครทิ้งแม่พิมพ์นี้ไว้ ข้ารู้แค่ว่าคนที่ใช้มันไม่เคยถูกจับได้ — จนกว่าจะอยากถูกจับ',
    berserker: 'แม่พิมพ์นี้ไม่มีตัวจำกัด เจ้าจะร้อนเร็ว ล้มง่าย และน่ากลัวกว่าทุกแบบ — ใบไม้จะมารับเจ้าเสมอ แต่อย่าทำให้มันต้องมาบ่อยนัก',
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
    const mvp = MAP_DEFS[id] && MAP_DEFS[id].mvp;
    if (mvp && k[mvp] && this.MAP_LINES_AFTER[id]) return this.MAP_LINES_AFTER[id];
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
    const hint = h('div', { class: 'pl-hint' }, touch ? 'แตะเพื่อไปต่อ' : 'คลิกหรือกด Space เพื่อไปต่อ');
    const skip = h('button', { id: 'prologue-skip', class: 'pl-skip', type: 'button', onclick: e => { e.stopPropagation(); end(); } }, 'ข้าม');
    const el = h('div', { id: 'prologue', class: 'pl', role: 'dialog', 'aria-label': 'บทนำ' },
      h('div', { class: 'pl-bg', 'aria-hidden': 'true' }), h('div', { class: 'pl-visor', 'aria-hidden': 'true' }),
      skip, h('div', { class: 'pl-kicker' }, 'CHAPTER 0', h('span', {}, 'ใบแรก')),
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
      else if (i === lines.length - 1) { el.classList.add('welcome'); hint.textContent = touch ? 'แตะเพื่อเริ่มต้น' : 'คลิกหรือกด Space เพื่อเริ่มต้น'; Sound.play('buff'); }
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
