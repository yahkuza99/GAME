'use strict';
// ============================================================
//  Runes — หน้าต่างเดียวสำหรับรูนทั้งสองระบบ (เจ้าของ 2026-10-03: "ใส่ตรงไหน ใส่ยังไง ใช้ยังไง งง")
//  • แท็บ Skill Runes = Rune Paths (js/runes.js, p.runes) • แท็บ Hunt Runes = js/huntrunes.js (p.hrunes / p.hrunesOwn)
//  • สมุดเปิด (UI.book): หน้าซ้าย = รายการ • หน้าขวา = รายละเอียด + ปุ่ม • มือถือแนวตั้ง = หน้าเดียว รายการ → รายละเอียด → กลับ
//  • ไม่มีแถบ "วิธีใช้" (เจ้าของ 2026-10-03: "Rune ไม่ต้องใส่วิธีใช้") — จุดแดงบนแท็บ = มีรูนที่ยังใส่ได้
//  • ใช้ตรรกะเดิมทั้งหมด: Runes.set / HuntRunes.set (ล็อกระหว่างต่อสู้ 5 วิ เหมือนเดิม) — ไม่แตะสมดุล/เซฟ/id
//  • ซื้อ Hunt Rune ได้ที่นี่เลยทุกที่ (เจ้าของ 2026-10-11 "เพิ่มความสะดวกในการซื้อ") — กดซื้อ → ยืนยัน (+ ตัวเลือก "ซื้อแล้วใส่ช่องเลย") • Volt ไม่พอ = บอกว่าขาดเท่าไร
//    เตาของ Brokk ยังขายเหมือนเดิม • ราคา = HuntRunes (HR_PRICE_MUL)
//  • รอบ 31 (js/runeshop.js): Skill Rune ต้องซื้อก่อนใช้ (ปุ่ม Choose ของรูนที่ยังไม่ซื้อ = ซื้อ → หน้าต่างยืนยัน → ใส่เลย)
//    ซื้อทางไกล (ไม่ได้ยืนใกล้ Brokk) = +50% ทั้งสองชนิด • โชว์ทั้งสองราคา + ปุ่ม "ไปซื้อที่ Brokk"
//  • ทางเข้า: เมนู "Runes" • Shift+R (R = กาชาอยู่แล้ว) • การ์ด Hunt Rune ใน Status • แท็บ Runes ในกระเป๋า • ลิงก์ในหน้าต่าง Skills
//  • #w-hrunes เดิม (data-open / UI.open / UI.toggle) → เปิดหน้าต่างนี้ที่แท็บ Hunt Runes แทน
//  หน้าต่าง: #w-runes (index.html) • CSS: css/runebook.css (ใช้ token จาก css/tokens.css)
//  หน้าตา (เจ้าของ 2026-10-03 "Rune ไม่รอด"): ตัวเลือกรูน = แผ่นหินแกะสลัก (ช่องไอคอน 72px ซ้าย) • ช่อง Hunt Rune = เบ้าหินแกะ
//  ไอคอนรูน: Hunt Rune = itemIconUrl(id) • Skill Rune = Runes.iconUrl(id) ถ้ามี (ภาพหินรูน 3D) ไม่มี/โหลดไม่ขึ้น = ตัวอักษรรูนเรืองแสงแทน
// ============================================================
const Runebook = {
  KEY: 'Shift+R',
  tab: 'skill',      // 'skill' | 'hunt'
  skSel: null,       // สกิลที่เลือก (หน้าขวา)
  skPick: undefined, // รูนที่กดเลือกไว้บนหน้าขวา (ยังไม่กด Choose) • null = None • undefined = ยังไม่ได้แตะ (แสดงอันที่ใช้อยู่)
  hrSel: null,       // Hunt Rune ที่เลือก
  filter: 'all',     // all | slayer | endow | cond
  det: false,        // มือถือ: อยู่หน้ารายละเอียด
  buyAsk: null,      // Hunt Rune ที่กดซื้อแล้ว รอยืนยัน
  buyAuto: true,     // ยืนยันซื้อแล้วใส่ช่องว่างเลย
  _key: '',

  // ---------- เปิด ----------
  // tab = 'skill' | 'hunt' • sel = id ของสกิล/Hunt Rune ที่จะเลือกให้เลย (มือถือ = ไปหน้ารายละเอียดทันที)
  open(tab, sel) {
    if (tab === 'skill' || tab === 'hunt') this.tab = tab;
    if (sel) { if (this.tab === 'skill') { this.skSel = sel; this.skPick = undefined; } else this.hrSel = sel; }
    this.det = !!sel; this._key = '';
    const w = document.getElementById('w-runes');
    if (UI.isOpen('w-runes')) { w.style.zIndex = ++UI.z; this.render(); return; }
    this._keep = true;
    try { UI.open('w-runes'); } finally { this._keep = false; }
  },
  setTab(k) { if (this.tab === k) return; this.tab = k; this.det = false; this.skPick = undefined; if (typeof Sound !== 'undefined') Sound.play('click'); this.render(); },

  // ---------- ข้อมูลช่วย ----------
  // สกิลของสาย Class ปัจจุบันที่มีรูน (เรียงตามหน้าต่าง Skills: Novice → Class 1 → Class 2)
  skillIds() {
    const p = G.player, out = [];
    if (!p || typeof Runes === 'undefined') return out;
    for (const j of ['novice', ...jobLine(p.job).slice().reverse()]) for (const id of (JOBS[j] && JOBS[j].skills) || []) if (Runes.list(id).length >= 2 && !out.includes(id)) out.push(id);
    return out;
  },
  skLv(id) { return G.player.skills[id] || 0; },
  skOpen(id) { return this.skLv(id) >= Runes.UNLOCK; },
  busy() { return typeof Runes !== 'undefined' && !Runes.canChange(); },
  busyText() { return Runes.busyText(); },
  // สิ่งที่ยังทำได้ (จุดแจ้งเตือนบนแท็บ)
  todo() {
    const p = G.player, HR = typeof HuntRunes !== 'undefined' ? HuntRunes : null;
    const sk = this.skillIds().some(id => this.skOpen(id) && !Runes.chosen(id));
    const s = HR ? HR.slots() : [], spare = HR ? HR.own().filter(id => !s.includes(id)).length : 0;
    const hr = !!HR && [0, 1].some(i => HR.unlocked(i) && !s[i]) && spare > 0;
    return { sk, hr, any: sk || hr, p };
  },

  // ---------- วาด ----------
  key() {
    const p = G.player;
    return JSON.stringify([this.tab, this.skSel, this.skPick === undefined ? '~' : this.skPick, this.hrSel, this.buyAsk, this.buyAuto, this.filter, this.det, p.job, p.skills, p.runes, p.runesOwn, p.hrunes, p.hrunesOwn,
      p.baseLv, p.zeny, typeof RuneShop !== 'undefined' && RuneShop.near(), Math.ceil(Runes.combatLeft()), typeof LANG !== 'undefined' ? LANG : '', UI.narrow()]);
  },
  render(force) {
    const body = document.querySelector('#w-runes .win-body');
    if (!body || typeof G === 'undefined' || !G.player || !UI.isOpen('w-runes')) return;
    const key = this.key();
    if (!force && key === this._key && body.firstChild) return;
    this._key = key;
    const narrow = UI.narrow();
    const pg = this.tab === 'hunt' && typeof HuntRunes !== 'undefined' ? this.huntPages(narrow) : this.skillPages(narrow);
    const root = h('div', { class: 'rb' + (pg.det ? ' rb-det' : ''), 'data-tab': this.tab },
      this.tabsBar(), UI.book('w-runes', pg.left, pg.right, pg.det));
    UI.keepScroll(body, () => { body.innerHTML = ''; body.append(root); });
  },
  tabsBar() {
    const p = G.player, ids = this.skillIds(), open = ids.filter(id => this.skOpen(id)), chosen = open.filter(id => Runes.chosen(id)), td = this.todo();
    const HR = typeof HuntRunes !== 'undefined' ? HuntRunes : null;
    const tb = (k, ic, label, badge, dot) => h('button', { type: 'button', role: 'tab', class: 'tab rb-tab' + (this.tab === k ? ' on' : ''), 'aria-selected': this.tab === k ? 'true' : 'false', 'data-tab': k,
      onclick: () => this.setTab(k) }, ivIconEl(ic), h('b', {}, label), badge ? h('small', {}, badge) : null, dot ? h('i', { class: 'rb-dot', title: L('มีรูนที่ใส่ได้', 'Something to set up') }) : null);
    return h('div', { class: 'tabs rb-tabs', role: 'tablist' },
      tb('skill', 'rune', 'Skill Runes', open.length ? `${chosen.length}/${open.length}` : '', td.sk),
      HR ? tb('hunt', 'hrune', 'Hunt Runes', `${HR.active(p).length}/${[0, 1].filter(i => HR.unlocked(i)).length}`, td.hr) : null);
  },
  // ---------- ไอคอนรูน (ช่องสี่เหลี่ยม) ----------
  // Skill Rune: ภาพจาก Runes.iconUrl (ถ้ามี) • ไม่มี/โหลดไม่ขึ้น = ตัวอักษรรูนเรืองตามสีรูน • r = null → ∅ (ไม่ใส่รูน)
  runeIcon(r, cls) {
    const glyph = () => h('i', { class: 'rb-glyph', style: r && r.col ? `--rc:${r.col}` : null }, r ? r.glyph || 'ᚱ' : '∅');
    const url = r && typeof Runes !== 'undefined' && typeof Runes.iconUrl === 'function' ? Runes.iconUrl(r.id) : null;
    let inner = glyph();
    if (url) { inner = h('img', { src: url, alt: '', draggable: 'false' }); inner.addEventListener('error', () => inner.replaceWith(glyph()), { once: true }); }
    return h('span', { class: 'rb-ic' + (cls ? ' ' + cls : '') + (r ? '' : ' none') }, inner);
  },
  // Hunt Rune: ภาพไอเทม (itemIconUrl)
  huntIcon(id, cls) { return h('span', { class: 'rb-ic' + (cls ? ' ' + cls : '') }, h('img', { src: itemIconUrl(id), alt: '', draggable: 'false' })); },
  // การ์ดที่ไม่ได้เลือก: r.short แยก 2 บรรทัดสั้น — ผลหลัก (บน) / สิ่งที่แลก (ล่าง จางกว่า) ตัดที่ " · " • ชี้ค้าง = คำอธิบายเต็ม
  shortEl(r) {
    const [eff, ...cost] = Runes.thOf(r).split(' · '); // ไทย 1 บรรทัด (js/runes_th.js) • ภาษาอังกฤษ = r.short เดิม
    return h('span', { class: 'rb-card-d rb-short', title: r.desc() }, h('span', { class: 'rb-eff' }, eff), cost.length ? h('span', { class: 'rb-cost' }, cost.join(' · ')) : null);
  },
  back() { return UI.bookBack(() => { this.det = false; this.skPick = undefined; this.render(); }); },
  note(text, cls) { return h('div', { class: 'det-note' + (cls ? ' ' + cls : '') }, UI.ico('info'), h('span', {}, text)); },

  // ---------- แท็บ Skill Runes ----------
  skillPages(narrow) {
    const p = G.player, ids = this.skillIds(), busy = this.busy();
    if (this.skSel && !ids.includes(this.skSel)) { this.skSel = null; this.skPick = undefined; }
    const sel = this.skSel || (narrow ? null : ids.find(id => this.skOpen(id) && !Runes.chosen(id)) || ids.find(id => this.skOpen(id)) || ids[0] || null);
    let left;
    if (!ids.length) {
      left = [UI.emptyState('rune', L('ยังไม่มี Skill Rune', 'No Skill Runes yet'),
        L(`Skill Rune มีในสกิลของ Class — เก็บ Job Lv ${JOB_CHANGE_LV} แล้วคุยกับ Mimir AI ใน Neo Eldheim เพื่อรับ Class ก่อน`, `Skill Runes come with Class skills — reach Job Lv ${JOB_CHANGE_LV}, then talk to Mimir AI in Neo Eldheim to get a Class first`))];
    } else {
      const rows = ids.map(id => {
        const s = SKILLS[id], lv = this.skLv(id), open = this.skOpen(id), cur = Runes.chosen(id);
        const sub = !open ? Runes.lockText(id)
          : cur ? `${cur.glyph || 'ᚱ'} ${cur.name}` : L('ปลดแล้ว — ยังไม่ได้เลือกรูน', 'Unlocked — no rune chosen yet');
        // ขวา: เบ้ารูนเล็ก (รูนที่ใช้อยู่ / แม่กุญแจ / ว่างรอเลือก)
        const mark = !open ? h('span', { class: 'rb-mark lock', title: `Skill Lv ${Runes.UNLOCK}` }, UI.ico('lock'))
          : cur ? h('span', { class: 'rb-mark on', title: cur.name }, this.runeIcon(cur, 'sm'))
          : h('span', { class: 'rb-mark new' }, L('เลือก', 'Pick'));
        const row = h('div', { class: 'rb-row' + (id === sel ? ' sel' : '') + (open ? '' : ' locked') + (cur ? ' has' : ''), role: 'button', tabindex: '0', 'data-skill': id, 'aria-pressed': id === sel ? 'true' : 'false' },
          UI.skillIcon(id),
          h('span', { class: 'rb-row-t' }, h('b', {}, s.name, h('em', {}, ` Lv ${lv}/${s.max}`)), h('small', {}, sub)),
          mark);
        const go = () => { this.skSel = id; this.skPick = undefined; this.det = true; this.render(); };
        row.addEventListener('click', go);
        row.addEventListener('keydown', ev => { if (ev.key === 'Enter') go(); });
        return row;
      });
      const open = ids.filter(id => this.skOpen(id)), chosen = open.filter(id => Runes.chosen(id));
      left = [h('div', { class: 'irows rb-list' }, rows),
        h('div', { class: 'book-foot' }, h('span', { class: 'bf-count' }, L(`เลือกแล้ว ${chosen.length} • ปลดแล้ว ${open.length}/${ids.length} สกิล`, `Chosen ${chosen.length} • unlocked ${open.length}/${ids.length} skills`)),
          busy ? h('span', { class: 'rb-busy-pill' }, `⚔ ${Math.ceil(Runes.combatLeft())}s`) : null)];
    }
    let right;
    if (sel) right = this.skillDetail(sel, busy);
    else right = [UI.emptyState('rune', L('เลือกสกิลทางซ้าย', 'Pick a skill on the left'), L('แต่ละสกิลมีรูน 2 แบบ เปลี่ยน "วิธีเล่น" ของสกิล (เช่น แตกลูก ดึงมอน ทิ้งพื้น) — เลือกได้ 1 หรือไม่เลือกเลย', 'Each skill has 2 runes that change how it plays (split, pull, leave a zone…) — pick 1, or none'))];
    return { left, right, det: this.det && !!sel };
  },
  skillDetail(id, busy) {
    const s = SKILLS[id], lv = this.skLv(id), open = this.skOpen(id), cur = Runes.chosen(id), curId = cur ? cur.id : null, list = Runes.list(id), RS = RuneShop;
    const pick = this.skPick === undefined ? curId : this.skPick;
    const card = r => {
      const rid = r ? r.id : null, on = pick === rid, isCur = curId === rid;
      // การ์ด: เบ้ารูนซ้าย • ชื่อ + ป้ายแบบ + ตรา "ใช้อยู่" • r.short (ผล + สิ่งที่แลก) ทุกการ์ด — คำอธิบายเต็มของรูนที่เลือกอยู่ใน Details ใต้การ์ด
      return h('button', { type: 'button', class: 'rb-card' + (on ? ' sel' : '') + (isCur ? ' cur' : '') + (r ? '' : ' none') + (open ? '' : ' off'), 'data-rune': rid || '', 'aria-pressed': on ? 'true' : 'false',
        style: r && r.col ? `--rc:${r.col}` : null, onclick: () => { if (!open) return; this.skPick = rid; this.render(); } },
        this.runeIcon(r),
        h('span', { class: 'rb-card-t' },
          h('b', {}, r ? r.name : L('ไม่ใส่รูน', 'None')),
          r ? h('small', { class: 'rn-tag ' + r.intent }, Runes.INTENT[r.intent]()) : h('small', { class: 'rb-tag-none' }, L('สกิลแบบเดิม', 'Original'))),
        r && r.short ? this.shortEl(r) : h('span', { class: 'rb-card-d' }, r ? (on ? r.desc() : Runes.shortOf(r)) : on ? L(`${s.name} แบบเดิม ไม่เปลี่ยนวิธีเล่น`, `The original ${s.name}, unchanged.`) : L('ไม่เปลี่ยนวิธีเล่น', 'Unchanged')),
        isCur ? h('i', { class: 'rb-cur' }, L('ใช้อยู่', 'Current')) : on ? h('i', { class: 'rb-pick' }, '✓') : null,
        r && !RS.ownsSkill(r.id) ? h('i', { class: 'rb-price', 'data-price': String(RS.price('skill', r.id)) }, RS.shortLabel('skill', r.id)) : null); // ยังไม่ซื้อ = ป้ายราคา (รอบ 31)
    };
    const same = pick === curId, need = !!pick && !same && !RS.ownsSkill(pick), q = need ? RS.quote('skill', pick) : null; // need = เลือกรูนที่ยังไม่ซื้อ → ปุ่มกลายเป็น "ซื้อ"
    const label = !open ? `🔒 Skill Lv ${Runes.UNLOCK}` : same ? (pick ? L('ใช้รูนนี้อยู่ ✓', 'Chosen ✓') : L('ไม่ได้ใส่รูน ✓', 'No rune ✓'))
      : need ? RS.buyLabel('skill', pick, q) : pick ? `Choose ${Runes.BY_ID[pick].name}` : L('Choose None (ถอดรูน)', 'Choose None');
    const choose = () => { if (Runes.set(id, pick)) { this.skPick = undefined; this.render(true); } };
    const acts = [h('button', { type: 'button', class: 'btn big primary rb-choose' + (need ? ' rb-buyrune' : '') + (open && !busy && same ? ' cur' : ''), disabled: !open || (busy && !need) || same ? 'disabled' : false,
      'data-price': q ? String(q.price) : null, onclick: () => { if (need) RS.ask('skill', pick, () => { choose(); this.render(true); }); else choose(); } }, label)];
    if (open && need && !q.near) acts.push(h('button', { type: 'button', class: 'btn big rb-gobrokk', onclick: () => RS.goBrokk() }, L(`ไปซื้อที่ Brokk ${U.fmt(q.base)}`, `Buy at Brokk · ${U.fmt(q.base)}`)));
    if (!open) acts.push(h('button', { type: 'button', class: 'btn big rb-goskills', onclick: () => { UI.skTab = jobLine(G.player.job).find(j => (JOBS[j].skills || []).includes(id)) || UI.skTab; UI.open('w-skills'); } }, ivIconEl('skill'), L('เปิด Skills', 'Open Skills')));
    return [this.back(),
      h('div', { class: 'det-top rb-sk-top' }, UI.skillIcon(id), h('div', {},
        h('h3', { class: 'dname' }, s.name),
        h('small', {}, `Skill Lv ${lv}/${s.max} · ` + (!open ? L(`ปลดรูนที่ Lv ${Runes.UNLOCK}`, `Runes unlock at Lv ${Runes.UNLOCK}`) : cur ? `Rune: ${cur.name}` : L('ยังไม่ได้เลือกรูน', 'No rune chosen'))))),
      !open ? this.note(L(`อัป ${s.name} ให้ถึง Lv ${Runes.UNLOCK} ในหน้าต่าง Skills (S) ก่อน — อีก ${Runes.needLv(id)} Lv (ตอนนี้ Lv ${lv}) • ดูรูนทั้ง 2 แบบล่วงหน้าได้ด้านล่าง`,
        `Raise ${s.name} to Lv ${Runes.UNLOCK} in the Skills window (S) first — ${Runes.needLv(id)} more Lv (now Lv ${lv}) • you can preview both runes below`), 'rb-lock-note') : null,
      open && busy ? this.note(this.busyText(), 'rb-busy') : null,
      h('div', { class: 'rb-cards' + (open ? '' : ' off') }, card(null), ...list.map(card)),
      pick && Runes.BY_ID[pick] && Runes.BY_ID[pick].short ? h('details', { class: 'det-more rb-more' }, h('summary', {}, 'Details'), h('p', {}, Runes.BY_ID[pick].desc())) : null,
      open ? this.note(L(`แตะการ์ดเพื่อเลือก แล้วกด Choose • รูนต้องซื้อครั้งแรกครั้งเดียว (ที่ Brokk ${U.fmt(RS.basePrice('skill', list[0].id))} • ทางไกล +${Math.round((RS.REMOTE_MUL - 1) * 100)}%) • รูนที่มีแล้วสลับฟรีทุกที่ ยกเว้นระหว่างต่อสู้`,
        `Tap a card, then press Choose • each rune is bought once (${U.fmt(RS.basePrice('skill', list[0].id))} at Brokk • +${Math.round((RS.REMOTE_MUL - 1) * 100)}% remote) • owned runes swap free anywhere, except in combat`)) : null,
      h('div', { class: 'det-acts' }, acts)];
  },

  // ---------- แท็บ Hunt Runes ----------
  huntPages(narrow) {
    const HR = HuntRunes, p = G.player, s = HR.slots(p), busy = this.busy();
    const all = HR.LIST.filter(d => this.filter === 'all' || d.kind === this.filter);
    const owned = all.filter(d => HR.owns(d.id)), shop = all.filter(d => !HR.owns(d.id));
    if (this.hrSel && !HR.def(this.hrSel)) this.hrSel = null;
    const sel = this.hrSel || (narrow ? null : s.find(Boolean) || (HR.LIST.find(d => HR.owns(d.id)) || HR.LIST[0]).id);
    const pick = id => { this.hrSel = id; this.buyAsk = null; this.det = true; this.render(); };
    // แผ่นหิน: ไอคอนรูน 64px บนซ้าย + สถานะขวาบน (✓ ช่อง / Owned / ราคา) • ชื่อ + ชนิด · ผล
    const row = d => {
      const at = s.indexOf(d.id), own = HR.owns(d.id), r = typeof LOOT !== 'undefined' ? LOOT.rarityOf(d.id) : 'common';
      const extra = at >= 0 ? h('span', { class: 'rb-in' }, `✓ ${HR.slotName(at)}`) : own ? h('span', { class: 'hr-owned' }, 'Owned')
        : h('span', { class: 'ipr' + (p.zeny >= RuneShop.price('hunt', d.id) ? '' : ' poor') }, h('i', { class: 'coin' }), U.fmt(RuneShop.price('hunt', d.id))); // ราคาตามที่ยืน (ทางไกล +50%)
      const t = h('div', { class: 'rb-tile r-' + r + (d.id === sel ? ' sel' : '') + (own ? ' own' : ' rb-shop') + (at >= 0 ? ' in' : ''), role: 'button', tabindex: '0', 'data-hr': d.id, 'aria-pressed': d.id === sel ? 'true' : 'false' },
        this.huntIcon(d.id), extra,
        h('span', { class: 'rb-tile-t', title: HR.rowSum(d.id) }, h('b', {}, d.name.replace(/ Rune$/, '')), this.huntShort(d))); // ชนิดดูจากแผ่นหิน/ตัวกรอง — แผ่นนี้โชว์แค่ผล
      t.addEventListener('click', () => pick(d.id));
      t.addEventListener('keydown', ev => { if (ev.key === 'Enter') pick(d.id); });
      return t;
    };
    const pills = h('div', { class: 'pills rb-filter' }, [['all', 'All'], ['slayer', 'Slayer'], ['endow', 'Endow'], ['cond', 'Conditional']].map(([k, l]) =>
      h('button', { type: 'button', class: 'pill' + (this.filter === k ? ' on' : ''), 'data-f': k, onclick: () => { this.filter = k; this.render(); } }, l)));
    const list = [h('div', { class: 'rb-sec' }, h('span', {}, L(`รูนของคุณ (${owned.length})`, `Your runes (${owned.length})`))),
      owned.length ? h('div', { class: 'rb-tiles' }, owned.map(row)) : h('div', { class: 'rb-none' }, L('ยังไม่มีในหมวดนี้ — แตะรูนด้านล่างเพื่อซื้อได้เลย', 'None here yet — tap a rune below to buy it')),
      shop.length ? h('div', { class: 'rb-sec' }, h('span', {}, L(`ซื้อได้เลยที่นี่ (${shop.length})`, `Buy here (${shop.length})`))) : null,
      shop.length ? h('div', { class: 'rb-tiles' }, shop.map(row)) : null];
    const left = [pills, h('div', { class: 'irows rb-list' }, list),
      h('div', { class: 'book-foot' }, h('span', { class: 'bf-count' }, L('ซื้อครั้งเดียวเก็บตลอดไป • ใส่/ถอดฟรี', 'Buy once, keep forever • socketing is free')), h('span', { class: 'coin-pill' }, h('i', { class: 'coin' }), U.fmt(p.zeny)))];
    const right = [this.back(), this.sockets(sel, busy)];
    if (busy) right.push(this.note(this.busyText(), 'rb-busy'));
    if (sel) {
      const d = HR.def(sel), own = HR.owns(sel), acts = own ? [0, 1].map(i => this.sockBtn(i, sel, busy)) : this.buyActs(sel, busy);
      const note = own ? L('ใส่/ถอดฟรีทุกที่ ยกเว้นระหว่างต่อสู้ • ทำงานเองทุกครั้งที่ตี (ไม่ต้องกดใช้)', 'Free to swap anywhere, except in combat • works on its own whenever you hit')
        : RuneShop.near() ? L(`ยังไม่มี — ซื้อได้ราคาปกติ ${U.fmt(d.price)} ${CUR} (อยู่ใกล้ Brokk) • ซื้อครั้งเดียวเก็บตลอดไป`, `Not owned — normal price ${U.fmt(d.price)} ${CUR} (you're near Brokk) • buy once, keep forever`)
          : L(`ยังไม่มี — ซื้อทางไกลตรงนี้ ${U.fmt(RuneShop.price('hunt', sel))} ${CUR} หรือที่ Brokk ${U.fmt(d.price)} ${CUR} • ซื้อครั้งเดียวเก็บตลอดไป`,
            `Not owned — buy remotely here for ${U.fmt(RuneShop.price('hunt', sel))} ${CUR} or at Brokk for ${U.fmt(d.price)} ${CUR} • buy once, keep forever`);
      right.push(...UI.itemDetail(HR.entry(sel), acts, note, { noPrice: true, lead: [HR.infoSec(d)] }));
    } else right.push(UI.emptyState('hrune', L('เลือกรูนทางซ้าย', 'Pick a rune on the left'), L('Slayer = ตีเผ่านั้นแรงขึ้น • Endow = เปลี่ยนธาตุการโจมตี • Conditional = แรงขึ้นตามสถานการณ์', 'Slayer = bonus vs a race • Endow = change your attack element • Conditional = bonus in a situation')));
    return { left, right, det: this.det && !!sel };
  },
  // แผ่น Hunt Rune: ผลหลักบรรทัดแรก / สิ่งที่แลกหรือเงื่อนไขย่อยบรรทัดสอง (มือถือแนวนอนตัดเหลือบรรทัดแรกด้วย CSS เดิม)
  huntShort(d) {
    const [eff, ...rest] = HuntRunes.shortOf(d).split(' · ');
    return h('small', {}, eff, rest.length ? [h('br'), rest.join(' · ')] : null);
  },
  // ช่องรูน 2 ช่อง (ล็อกตาม Base Lv) — แตะช่องที่มีรูน = เลือกรูนนั้น
  sockets(sel, busy) {
    const HR = HuntRunes, p = G.player, s = HR.slots(p);
    // แผ่นหินใหญ่ 1 แผ่น มีเบ้าแกะ 2 เบ้า (I / II) • เบ้า = ช่องไอคอน 64px (รูน / แม่กุญแจ / ว่าง)
    return h('div', { class: 'rb-socks' }, [0, 1].map(i => {
      const d = HR.def(s[i]), lock = !HR.unlocked(i, p);
      const el = h('div', { class: 'rb-sock' + (lock ? ' lock' : d ? ' on' : ' empty') + (d && d.id === sel ? ' sel' : ''), 'data-slot': i },
        h('span', { class: 'rb-sock-n' }, HR.slotName(i)),
        lock ? h('span', { class: 'rb-ic rb-stone lock' }, UI.ico('lock')) : d ? this.huntIcon(d.id, 'rb-stone') : h('span', { class: 'rb-ic rb-stone empty' }, h('i', { class: 'rb-glyph' }, '+')),
        h('span', { class: 'rb-sock-t' },
          h('b', {}, lock ? `Base Lv ${HR.UNLOCK[i]}` : d ? d.name.replace(/ Rune$/, '') : L('ช่องว่าง', 'Empty')),
          h('small', {}, lock ? L(`ล็อก — ตอนนี้ Lv ${p.baseLv}`, `Locked — you are Lv ${p.baseLv}`) : d ? HR.shortOf(d) : L('เลือกรูนแล้วกด Socket', 'Pick a rune, then Socket'))),
        d && !lock ? h('button', { type: 'button', class: 'btn small rb-rm', 'data-slot': i, disabled: busy ? 'disabled' : false,
          onclick: ev => { ev.stopPropagation(); if (HR.set(i, null)) this.render(true); } }, L('ถอด', 'Remove')) : null);
      if (d) { el.setAttribute('role', 'button'); el.tabIndex = 0; el.addEventListener('click', () => { this.hrSel = d.id; this.det = true; this.render(); }); }
      return el;
    }));
  },
  sockBtn(i, id, busy) {
    const HR = HuntRunes, on = HR.slots()[i] === id, lock = !HR.unlocked(i), n = HR.slotName(i);
    return h('button', { type: 'button', class: 'btn big rb-sock-btn' + (on ? '' : ' primary'), 'data-slot': i, disabled: lock || busy ? 'disabled' : false,
      onclick: () => { if (HR.set(i, on ? null : id)) this.render(true); } },
    lock ? `🔒 Slot ${n} · Lv ${HR.UNLOCK[i]}` : on ? `Remove from ${n}` : `Socket in ${n}`);
  },
  // ---------- ซื้อ Hunt Rune ที่นี่ ----------
  // ช่องว่างที่ใส่รูนนี้ได้ทันที (ปลดแล้ว ว่าง และไม่ชน Endow 2 อัน) • ไม่มี = -1
  freeSlot(id) {
    const HR = HuntRunes, s = HR.slots(), d = HR.def(id);
    if (!d) return -1;
    for (let i = 0; i < 2; i++) {
      if (!HR.unlocked(i) || s[i]) continue;
      const o = HR.def(s[1 - i]);
      if (d.kind === 'endow' && o && o.kind === 'endow') continue;
      return i;
    }
    return -1;
  },
  // ปุ่มซื้อ: ราคา / ขาดเท่าไร → แตะ = กล่องยืนยัน (ราคา + เหลือหลังซื้อ + "ซื้อแล้วใส่ช่องเลย") → ยืนยัน = หักเงินพอดีราคา
  buyActs(id, busy) {
    // ราคา = RuneShop.quote (รอบ 31): ใกล้ Brokk = ราคาปกติ • ที่อื่น = ซื้อทางไกล x RS_REMOTE_MUL + ปุ่ม "ไปซื้อที่ Brokk" (ถูกกว่า)
    const HR = HuntRunes, RS = RuneShop, d = HR.def(id), p = G.player, q = RS.quote('hunt', id), miss = q.miss;
    const go = q.near ? null : h('button', { type: 'button', class: 'btn big rb-gobrokk', onclick: () => RS.goBrokk() }, L(`ไปซื้อที่ Brokk ${U.fmt(q.base)}`, `Buy at Brokk · ${U.fmt(q.base)}`));
    if (miss > 0) return [h('div', { class: 'rb-buy-wrap' }, h('button', { type: 'button', class: 'btn big rb-buy poor', 'data-miss': String(miss), disabled: 'disabled' },
      L(`ขาดอีก ${U.fmt(miss)} ${CUR}`, `${U.fmt(miss)} ${CUR} short`)),
    h('div', { class: 'rb-buy-have' }, q.near ? L(`ราคา ${U.fmt(q.price)} • มีอยู่ ${U.fmt(p.zeny)} ${CUR}`, `Price ${U.fmt(q.price)} • you have ${U.fmt(p.zeny)} ${CUR}`)
      : L(`ซื้อทางไกล ${U.fmt(q.price)} (ที่ Brokk ${U.fmt(q.base)}) • มีอยู่ ${U.fmt(p.zeny)} ${CUR}`, `Remote ${U.fmt(q.price)} (at Brokk ${U.fmt(q.base)}) • you have ${U.fmt(p.zeny)} ${CUR}`))), go].filter(Boolean);
    if (this.buyAsk !== id) return [h('button', { type: 'button', class: 'btn big primary rb-buy', 'data-price': String(q.price), onclick: () => { this.buyAsk = id; this.render(); } },
      ivIconEl('shop'), RS.buyLabel('hunt', id, q)), go].filter(Boolean);
    const slot = this.freeSlot(id), auto = slot >= 0 && this.buyAuto;
    return [h('div', { class: 'rb-confirm', role: 'group', 'aria-label': L('ยืนยันการซื้อ', 'Confirm purchase'), 'data-price': String(q.price) },
      h('b', { class: 'rb-confirm-q' }, L(`ซื้อ ${d.name}?`, `Buy ${d.name}?`)),
      ...RS.priceRows(q).map(el => { el.classList.add('rb-confirm-kv'); return el; }),
      slot >= 0 ? h('button', { type: 'button', class: 'rb-auto' + (auto ? ' on' : ''), role: 'checkbox', 'aria-checked': auto ? 'true' : 'false', 'data-slot': String(slot),
        onclick: () => { this.buyAuto = !this.buyAuto; this.render(); } },
      h('i', { class: 'rb-box' }, auto ? '✓' : ''), h('span', {}, L(`ซื้อแล้วใส่ช่อง ${HR.slotName(slot)} เลย`, `Socket in slot ${HR.slotName(slot)} right away`),
        busy && auto ? h('small', {}, L(' (ใส่ได้หลังพ้นการต่อสู้)', ' (after combat)')) : null))
        : h('div', { class: 'rb-buy-have' }, L('ไม่มีช่องว่างตอนนี้ — ซื้อเก็บไว้ แล้วใส่แทนอันเดิมได้ทีหลัง', 'No free slot now — keep it and swap it in later')),
      h('div', { class: 'rb-confirm-acts' },
        h('button', { type: 'button', class: 'btn big primary rb-buy-ok', onclick: () => this.confirmBuy(id) }, L('ยืนยันซื้อ', 'Confirm')),
        h('button', { type: 'button', class: 'btn big rb-buy-no', onclick: () => { this.buyAsk = null; this.render(); } }, L('ยกเลิก', 'Cancel'))), go)];
  },
  confirmBuy(id) {
    const HR = HuntRunes, slot = this.freeSlot(id), auto = slot >= 0 && this.buyAuto;
    this.buyAsk = null;
    if (!HR.buy(id)) { this.render(true); return false; }
    if (auto) HR.set(slot, id); // ระหว่างต่อสู้ = ข้อความเดิมของ HuntRunes.set (รูนอยู่ในรายการแล้ว ใส่ทีหลังได้)
    this.hrSel = id; this.render(true);
    return true;
  },

  // ---------- ลิงก์จากที่อื่น ----------
  // แท็บ Runes ในกระเป๋า: แถบลิงก์มาหน้าต่างนี้
  invLink() {
    const l = document.querySelector('#w-inv .book-l'); if (!l || l.querySelector('.rb-link')) return;
    const b = h('button', { type: 'button', class: 'rb-link', onclick: () => this.open('hunt', UI.selItem && ITEMS[UI.selItem.id] && ITEMS[UI.selItem.id].type === 'hrune' ? UI.selItem.id : null) },
      ivIconEl('rune'), h('span', {}, h('b', {}, L(`จัดการรูนทั้งหมดที่ Runes (${this.KEY})`, `Manage all runes in Runes (${this.KEY})`)), h('small', {}, L('Skill Runes + Hunt Runes ที่เดียว • ใส่ช่อง', 'Skill Runes + Hunt Runes in one place • sockets'))), h('i', { class: 'rb-link-go' }, '›'));
    const pills = l.querySelector('.pills');
    if (pills) pills.after(b); else l.prepend(b);
  },
  menuButton() {
    const m = document.getElementById('menubar'); if (!m || m.querySelector('[data-win="w-runes"]')) return;
    const b = h('button', { type: 'button', 'data-win': 'w-runes', title: `Runes (${this.KEY})` });
    b.innerHTML = `${ivIcon('rune')}<span>Runes</span><small>⇧R</small>`;
    b.addEventListener('click', () => { UI.toggle('w-runes'); if (typeof Pad !== 'undefined' && Pad.enabled() && UI.setFold) UI.setFold(m, true); });
    const sk = m.querySelector('[data-win="w-skills"]');
    if (sk) sk.after(b); else m.append(b);
  },

  // ---------- "!" รูนสกิลที่เพิ่งปลด ----------
  // เมนู Skills (+ ปุ่มเปิดเมนู) ติด "!" เมื่อมีสกิลที่เพิ่งปลดรูนแต่ยังไม่เลือก • เปิดหน้าต่าง Skills แล้ว = รับทราบ (ไม่ติดซ้ำจนกว่าจะปลดสกิลใหม่)
  // ที่รับทราบเก็บในเบราว์เซอร์ต่อชื่อตัวละคร (ไม่แตะเซฟเกม) • อ่าน/เขียนไม่ได้ = จำแค่รอบนี้
  _ack: null, _ackName: '',
  ackSet() {
    const nm = (G.player && G.player.name) || '';
    if (!this._ack || this._ackName !== nm) {
      this._ackName = nm; this._ack = new Set();
      try { const a = JSON.parse(localStorage.getItem('iv_rune_new_ack:' + nm) || '[]'); if (Array.isArray(a)) a.forEach(x => this._ack.add(String(x))); } catch (e) { /* ไม่มีที่เก็บ */ }
    }
    return this._ack;
  },
  ackSave() { try { localStorage.setItem('iv_rune_new_ack:' + this._ackName, JSON.stringify([...this._ack].slice(-200))); } catch (e) { /* ไม่มีที่เก็บ */ } },
  newUnseen() { const a = this.ackSet(); return Runes.newIds().filter(id => !a.has(id)); },
  markMenu() {
    const m = document.getElementById('menubar'); if (!m) return;
    let fresh = this.newUnseen();
    if (fresh.length && UI.isOpen('w-skills')) { const a = this.ackSet(); fresh.forEach(id => a.add(id)); this.ackSave(); fresh = []; }
    const on = fresh.length > 0, b = m.querySelector('[data-win="w-skills"]'), f = m.querySelector('.menu-fold');
    if (b) { b.classList.toggle('rn-new', on); if (on) b.title = L('Skills — มีรูนสกิลปลดใหม่ (S)', 'Skills — new skill runes unlocked (S)'); }
    if (f) f.classList.toggle('rn-new', on);
  },
  markSkillTabs() {
    const tabs = document.querySelectorAll('#w-skills .sk-tabs .tab'), p = G.player;
    if (!tabs.length || !p) return;
    const jobs = p.job === 'novice' ? ['novice'] : ['novice', ...jobLine(p.job).reverse()], fresh = Runes.newIds();
    tabs.forEach((t, i) => {
      const j = jobs[i], has = !!j && fresh.some(id => (JOBS[j].skills || []).includes(id));
      const cur = t.querySelector('.rn-bang');
      if (has && !cur) t.append(h('i', { class: 'rn-bang', title: L('ปลดรูนแล้ว — ยังไม่ได้เลือก', 'Runes unlocked — none chosen') }, '!'));
      else if (!has && cur) cur.remove();
    });
  },

  install() {
    if (typeof document === 'undefined' || typeof UI === 'undefined') return;
    // UI.open: #w-hrunes เดิม → หน้าต่างนี้ (แท็บ Hunt Runes) • เปิด #w-runes ใหม่จากเมนู = หน้ารายการ
    const open0 = UI.open;
    UI.open = function (id, ...a) {
      if (id === 'w-hrunes') { Runebook.open('hunt', typeof HuntRunes !== 'undefined' ? HuntRunes.sel : null); return; }
      if (id === 'w-runes' && !Runebook._keep) { Runebook.det = false; Runebook.skPick = undefined; }
      if (id === 'w-runes') Runebook._key = '';
      return open0.call(this, id, ...a);
    };
    const rw0 = UI.renderWindows;
    UI.renderWindows = function (force) { const d = this.isDirty || force, r = rw0.call(this, force); if (d && this.isOpen('w-runes')) Runebook.render(); return r; };
    // หน้าต่าง Skills: "!" บนแท็บ Class ที่มีสกิลปลดรูนแล้วแต่ยังไม่เลือก (แถวสกิลติด "!" เองใน Runes.skillRow)
    const rs0 = UI.renderSkills;
    UI.renderSkills = function (...a) { const r = rs0.apply(this, a); try { Runebook.markSkillTabs(); } catch (err) { console.error(err); } return r; };
    const ri0 = UI.renderInv;
    UI.renderInv = function (...a) { const r = ri0.apply(this, a); if (this.invTab === 'hrune') Runebook.invLink(); return r; };
    if (typeof UIKit !== 'undefined' && !UIKit.BOOKS.includes('w-runes')) UIKit.BOOKS.push('w-runes'); // สมุดเปิดบนคอม: แชทจางลง
    window.addEventListener('load', () => setTimeout(() => this.menuButton(), 0));
    // Shift+R (R เฉย ๆ = กาชา js/gacha.js)
    document.addEventListener('keydown', e => {
      if (e.repeat || !e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || U.key(e) !== 'r') return;
      const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (typeof G === 'undefined' || !G.started || (UI.dialog && UI.isOpen('w-dialog'))) return;
      e.preventDefault(); UI.toggle('w-runes');
    });
    // นับถอยหลังล็อกต่อสู้ / Brokk ใกล้-ไกล (วาดใหม่เฉพาะเมื่อมีอะไรเปลี่ยน)
    setInterval(() => { if (typeof G !== 'undefined' && G.started && G.player && UI.isOpen('w-runes')) { try { this.render(); } catch (err) { console.error(err); } } }, 400);
    setInterval(() => { if (typeof G !== 'undefined' && G.started && G.player) { try { this.markMenu(); } catch (err) { console.error(err); } } }, 500);
  },
};
Runebook.install();
