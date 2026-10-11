'use strict';
// ============================================================
//  คลังไอเทม (Item Index) — สารานุกรมไอเทมทั้งเกม ให้ผู้เล่นศึกษา/วางแผนคอมโบ-บิลด์
//  เจ้าของ 2026-10-11: "อยากให้แบ่ง index ว่าเกมนี้มีไอเทมอะไรบ้าง ทั้งหมดเลย ให้ไปทำการศึกษาทำคอมโบ"
//  (ไม่ใช่ระบบค้นหาว่าดรอปจากไหน — เจ้าของไม่เอา — แต่เป็นการเปิดดูทุกชิ้นตามหมวด)
//  • หมวดไอเทม (ทุกชิ้นใน ITEMS อยู่ในหมวดเดียวพอดี): อาวุธ (แยกประเภท) / ชุดเกราะ (แยกช่อง) / เครื่องประดับ / ชิป (แยกช่องที่ใส่) /
//    ของใช้ / วัตถุดิบ / Hunt Rune • หมวดอ้างอิง: กาชา (ของรางวัลวงล้อนอร์น) / เซ็ต (LOOT.SETS — โบนัสสวมครบชิ้น)
//  • แต่ละชิ้น: ไอคอน ชื่อ (อังกฤษ) สีตามความหายาก ค่าพลัง เงื่อนไข Class/Lv ช่องชิป ราคา + "หาได้จาก" (มอน/แผนที่/% · ร้าน · กาชา · เควสต์)
//    แตะมอน = สมุดมอน • ปุ่ม "ไป" = นำทาง (Nav.goTo) • ตัวกรอง: ใช้ได้กับ Class ฉัน / ความหายาก / ช่วงเลเวล / เรียง
//  • อ่านข้อมูลเกมอย่างเดียว ไม่แตะเซฟ/ข้อมูลไอเทม • สร้างดัชนีครั้งแรกที่เปิด (ไม่ทำตอนโหลดเกม)
//  • เปิดจาก: ปุ่มในเมนู (#menubar — มือถือแนวตั้งอยู่ในแผ่นเมนูอัตโนมัติ) / Shift+I
//  • ร้านในเนื้อเรื่องที่เขียนรายการไว้ในสคริปต์ NPC (Dagny / Loki) — สำเนารายการไว้ที่ EXTRA_SHOPS (แก้ร้านที่นั่นแล้วต้องแก้ที่นี่ด้วย)
// ============================================================
const ItemIndex = {
  WIN: 'w-itemidx', PAGE: 120,
  cat: 'weapon', sub: 'all', sel: null, selSet: null, det: false, limit: 120,
  classOnly: false, rar: 'all', lv: 'all', sort: 'lv',
  _src: null,
  EXTRA_SHOPS: [
    { npc: 'dagny', items: ['red_potion', 'orange_potion', 'green_herb', 'apple', 'carrot', 'blink_feather', 'hearth_rune'] }, // js/content_world.js DAGNY_SHOP
    { npc: 'loki', items: ['white_potion', 'blue_potion', 'green_herb', 'yellow_potion'] }, // js/content_ch7.js NPC.scripts.loki
  ],
  LV: [['all', 0, 999], ['1', 1, 10], ['11', 11, 20], ['21', 21, 30], ['31', 31, 45], ['46', 46, 60], ['61', 61, 999]],

  cats() {
    return [
      { k: 'weapon', t: L('อาวุธ', 'Weapons'), ic: 'slot_weapon' },
      { k: 'armor', t: L('ชุดเกราะ', 'Armor'), ic: 'slot_armor' },
      { k: 'acc', t: L('เครื่องประดับ', 'Accessories'), ic: 'slot_acc' },
      { k: 'card', t: L('ชิป', 'Chips'), ic: 'chips' },
      { k: 'use', t: L('ของใช้', 'Consumables'), ic: 'bag' },
      { k: 'etc', t: L('วัตถุดิบ', 'Materials'), ic: 'deposit' },
      { k: 'hrune', t: 'Hunt Rune', ic: 'rune' },
      { k: 'gacha', t: L('กาชา', 'Gacha'), ic: 'gacha', ref: true },
      { k: 'sets', t: L('เซ็ต', 'Sets'), ic: 'crown', ref: true },
    ];
  },
  // หมวดของไอเทม 1 ชิ้น (ทุกชิ้นได้หมวดเดียว — เทสต์นับครบ)
  catOf(it) {
    if (it.type === 'weapon') return 'weapon';
    if (it.type === 'armor') return it.slot === 'acc' || it.slot === 'acc2' ? 'acc' : 'armor';
    if (it.type === 'card') return 'card';
    if (it.type === 'use') return 'use';
    if (it.type === 'hrune') return 'hrune';
    return 'etc';
  },
  subsOf(cat) {
    if (cat === 'weapon') return [['all', L('ทั้งหมด', 'All')], ...Object.keys(WTYPE_THAI).filter(k => k !== 'none').map(k => [k, EN(WTYPE_THAI[k])])];
    if (cat === 'armor') return [['all', L('ทั้งหมด', 'All')], ...['head', 'armor', 'shield', 'garment', 'shoes'].map(k => [k, SLOT_THAI[k]])];
    if (cat === 'card') return [['all', L('ทั้งหมด', 'All')], ...['weapon', 'head', 'armor', 'shield', 'garment', 'shoes', 'acc'].map(k => [k, SLOT_THAI[k]])];
    return null;
  },
  subOf(it) { return it.type === 'weapon' ? it.wtype : it.slot === 'acc2' ? 'acc' : it.slot || ''; },
  ids(cat) { return Object.keys(ITEMS).filter(id => this.catOf(ITEMS[id]) === cat); },

  // ---------- แหล่งที่มา (สร้างครั้งเดียวตอนเปิดครั้งแรก) ----------
  sources() {
    if (this._src) return this._src;
    const S = {}, add = (id, x) => { if (ITEMS[id]) (S[id] || (S[id] = [])).push(x); };
    const mapOf = mid => Object.keys(MAP_DEFS).find(k => (MAP_DEFS[k].spawns || []).some(s => s[0] === mid) || MAP_DEFS[k].mvp === mid) || null;
    for (const mid in MOBS) {
      const m = MOBS[mid]; if (m.dummy || m.worldBoss) continue;
      const map = mapOf(mid);
      for (const d of m.drops || []) add(d[0], { k: 'mob', mid, map, c: d[1] });
      if (typeof MOB_CHIP !== 'undefined' && MOB_CHIP[mid]) add(MOB_CHIP[mid], { k: 'mob', mid, map, c: chipChance(m) });
    }
    const npcAt = id => { for (const k in MAP_DEFS) { const n = (MAP_DEFS[k].npcs || []).find(x => x.id === id); if (n) return { map: k, n }; } return null; };
    const shop = (npcIds, list) => {
      for (const nid of npcIds) { const at = npcAt(nid); if (at) for (const id of list) add(id, { k: 'shop', map: at.map, npc: at.n }); }
    };
    for (const key in SHOPS) { const ids = []; for (const k in MAP_DEFS) for (const n of MAP_DEFS[k].npcs || []) if (n.id === key || n.id.startsWith(key + '_')) ids.push(n.id); shop(ids, SHOPS[key] || []); }
    for (const x of this.EXTRA_SHOPS) shop([x.npc], x.items);
    if (typeof Gacha !== 'undefined') for (const r of Gacha.rows || []) if (r.id) add(r.id, { k: 'gacha', c: r.w / 100, qty: r.qty || 1 });
    if (typeof QUESTS !== 'undefined') for (const q of QUESTS) for (const [id, n] of (q.reward && q.reward.items) || []) add(id, { k: 'quest', q, n });
    for (const s of Object.values(S)) s.sort((a, b) => (a.k === 'mob' && b.k === 'mob' ? b.c - a.c : 0));
    return (this._src = S);
  },
  owned() {
    const p = G.player, s = new Set();
    for (const e of [...(p.inventory || []), ...(p.storage || []), ...Object.values(p.equip || {})]) if (e && e.id) s.add(e.id);
    if (typeof HuntRunes !== 'undefined') for (const id of HuntRunes.own(p)) s.add(id);
    return s;
  },
  // ตัวกรอง/เรียง (หมวดไอเทมเท่านั้น)
  pass(id) {
    const it = ITEMS[id], p = G.player, eq = isEquipType(it);
    if (this.sub !== 'all' && this.subOf(it) !== this.sub) return false;
    if (this.classOnly && eq && !canJobUse(it.jobs, p.job)) return false;
    if (this.rar !== 'all' && LOOT.rarityOf(id) !== this.rar) return false;
    const r = this.LV.find(x => x[0] === this.lv);
    if (r && r[0] !== 'all') { if (!eq) return false; const lv = it.lv || 1; if (lv < r[1] || lv > r[2]) return false; }
    return true;
  },
  sorted(ids) {
    const lv = id => ITEMS[id].lv || 0, rk = id => LOOT.rank(id), nm = id => ITEMS[id].name;
    const f = { lv: (a, b) => lv(a) - lv(b) || rk(a) - rk(b) || nm(a).localeCompare(nm(b)), lvd: (a, b) => lv(b) - lv(a) || rk(b) - rk(a) || nm(a).localeCompare(nm(b)),
      rar: (a, b) => rk(b) - rk(a) || lv(a) - lv(b) || nm(a).localeCompare(nm(b)), name: (a, b) => nm(a).localeCompare(nm(b)) }[this.sort] || (() => 0);
    return ids.slice().sort(f);
  },

  // ---------- หน้าต่าง ----------
  init() {
    const w = document.createElement('div');
    w.id = this.WIN; w.className = 'win hidden center'; w.style.width = 'min(880px, calc(100vw - 24px))';
    w.innerHTML = `<div class="win-title"><span>${L('คลังไอเทม', 'Item Index')}</span></div><div class="win-body"></div>`;
    (document.getElementById('w-help') || document.body.lastElementChild).after(w);
    const open0 = UI.open.bind(UI);
    UI.open = id => { open0(id); if (id === this.WIN) { this.det = false; this.render(); } };
    window.addEventListener('load', () => setTimeout(() => this.menuButton(), 0));
    // Shift+I (ตัวอักษรเดี่ยวถูกใช้หมดแล้ว • I เฉย ๆ = กระเป๋า) — ดักก่อน main.js ไม่ให้เปิดกระเป๋าซ้อน
    window.addEventListener('keydown', e => {
      if (!e.shiftKey || e.repeat || e.ctrlKey || e.metaKey || e.altKey || U.key(e) !== 'i') return;
      const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (typeof G === 'undefined' || !G.started) return;
      e.preventDefault(); e.stopImmediatePropagation();
      UI.toggle(this.WIN);
    }, true);
  },
  menuButton() {
    const m = document.getElementById('menubar'); if (!m || m.querySelector(`[data-win="${this.WIN}"]`)) return;
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.win = this.WIN; b.title = L('คลังไอเทม — ไอเทมทั้งเกม (Shift+I)', 'Item Index — every item (Shift+I)');
    b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><path d="M14 17.2h6.5M17.2 14v6.5"/></svg><span>${L('คลังไอเทม', 'Item Index')}</span><small>⇧I</small>`;
    b.addEventListener('click', () => { UI.toggle(this.WIN); if (typeof Pad !== 'undefined' && Pad.enabled() && UI.setFold) UI.setFold(m, true); });
    m.append(b);
  },
  go(cat) { this.cat = cat; this.sub = 'all'; this.sel = null; this.selSet = null; this.det = false; this.limit = this.PAGE; this.render(); },
  pick(id) { this.sel = id; this.det = true; this.render(); },
  // ไปที่ไอเทมชิ้นนั้นในหมวดของมัน (จากหน้าเซ็ต/กาชา)
  jump(id) { const it = ITEMS[id]; if (!it) return; this.cat = this.catOf(it); this.sub = 'all'; this.sel = id; this.det = true; this.limit = this.PAGE; this.render(); },

  render() {
    const body = document.querySelector(`#${this.WIN} .win-body`); if (!body || !G.player) return;
    const narrow = UI.narrow(), cats = this.cats(), cur = cats.find(c => c.k === this.cat) || cats[0];
    const counts = {}; for (const id in ITEMS) { const c = this.catOf(ITEMS[id]); counts[c] = (counts[c] || 0) + 1; }
    counts.gacha = typeof Gacha !== 'undefined' ? Gacha.rows.length : 0; counts.sets = Object.keys(LOOT.SETS).length;
    const catBar = h('div', { class: 'ix-cats', role: 'tablist', 'aria-label': L('หมวดไอเทม', 'Item categories') }, cats.map(c =>
      h('button', { type: 'button', role: 'tab', class: 'ix-cat' + (c.k === cur.k ? ' on' : ''), 'data-cat': c.k, 'aria-selected': String(c.k === cur.k), onclick: () => this.go(c.k) },
        h('span', { class: 'ix-ci', html: ivIcon(c.ic) }), h('b', {}, c.t), h('small', {}, String(counts[c.k] || 0)))));
    let left, right, e = null;
    const back = () => { this.det = false; this.render(); };
    if (cur.k === 'sets') ({ left, right } = this.setsPages(narrow, back));
    else if (cur.k === 'gacha') ({ left, right, e } = this.gachaPages(narrow, back));
    else ({ left, right, e } = this.itemPages(cur.k, narrow, back));
    const det = this.det && (cur.k === 'sets' ? !!this.selSet : !!e);
    UI.keepScroll(body, () => { body.innerHTML = ''; body.append(UI.book(this.WIN, [catBar, ...left], right, det, { back })); });
  },

  rowExtra(id, own) {
    const it = ITEMS[id];
    return h('span', { class: 'ix-tags' }, isEquipType(it) ? h('span', { class: 'ix-lv' }, `Lv ${it.lv || 1}`) : null, own.has(id) ? h('span', { class: 'ix-own', title: L('มีอยู่แล้ว (กระเป๋า/คลัง/สวมอยู่)', 'You own this (bag/storage/worn)') }, L('มีแล้ว', 'Owned')) : null);
  },
  filterBar() {
    const sel = (key, opts, label) => h('label', { class: 'ix-sel' }, h('span', {}, label),
      h('select', { 'data-f': key, 'aria-label': label, onchange: ev => { this[key] = ev.target.value; this.limit = this.PAGE; this.render(); }, onkeydown: ev => ev.stopPropagation() },
        opts.map(([v, t]) => h('option', { value: v, selected: this[key] === v ? '' : false }, t))));
    return h('div', { class: 'ix-filters' },
      h('button', { type: 'button', class: 'ix-tog' + (this.classOnly ? ' on' : ''), 'data-f': 'classOnly', 'aria-pressed': String(this.classOnly),
        onclick: () => { this.classOnly = !this.classOnly; this.limit = this.PAGE; this.render(); } }, h('i', { class: 'ix-box', 'aria-hidden': 'true' }), L('ใช้ได้กับ Class ฉัน', 'My Class only')),
      sel('rar', [['all', L('ทุกระดับ', 'Any rarity')], ...Object.keys(RARITY).map(k => [k, EN(RARITY[k].label)])], L('ความหายาก', 'Rarity')),
      sel('lv', this.LV.map(([k, a, b]) => [k, k === 'all' ? L('ทุกเลเวล', 'Any level') : b >= 999 ? `Lv ${a}+` : `Lv ${a}–${b}`]), L('เลเวล', 'Level')),
      sel('sort', [['lv', L('เลเวล น้อย→มาก', 'Level ↑')], ['lvd', L('เลเวล มาก→น้อย', 'Level ↓')], ['rar', L('หายากก่อน', 'Rarest first')], ['name', L('ชื่อ A–Z', 'Name A–Z')]], L('เรียง', 'Sort')));
  },
  itemPages(cat, narrow, back) {
    const own = this.owned(), all = this.ids(cat), subs = this.subsOf(cat);
    if (subs && !subs.some(([k]) => k === this.sub)) this.sub = 'all';
    const list = this.sorted(all.filter(id => this.pass(id)));
    if (this.sel && ITEMS[this.sel] && this.catOf(ITEMS[this.sel]) !== cat) this.sel = null;
    const id = this.sel || (narrow ? null : list[0]) || null;
    const e = id ? { id, qty: 1, refine: 0, cards: [] } : null;
    const shown = list.slice(0, this.limit);
    const rows = shown.map(x => UI.itemRow({ id: x, qty: 1, refine: 0, cards: [] }, x === id, en => this.pick(en.id), this.rowExtra(x, own)));
    rows.forEach((r, i) => { r.draggable = false; r.dataset.id = shown[i]; });
    const left = [
      subs ? h('div', { class: 'pills ix-subs', role: 'tablist' }, subs.map(([k, t]) => h('button', { type: 'button', class: 'pill' + (this.sub === k ? ' on' : ''), 'data-sub': k, 'aria-pressed': String(this.sub === k),
        onclick: () => { this.sub = k; this.sel = null; this.limit = this.PAGE; this.render(); } }, t, h('small', {}, String(k === 'all' ? all.length : all.filter(i => this.subOf(ITEMS[i]) === k).length))))) : null,
      this.filterBar(),
      h('div', { class: 'irows ix-rows' }, rows.length ? rows : UI.emptyState('bag', L('ไม่มีไอเทมที่ตรงตัวกรอง', 'No items match these filters'), L('ลองปิดตัวกรองบางอย่าง', 'Try turning some filters off')),
        list.length > shown.length ? h('button', { type: 'button', class: 'btn ix-showmore', onclick: () => { this.limit += this.PAGE; this.render(); } }, L(`แสดงเพิ่ม (${list.length - shown.length})`, `Show more (${list.length - shown.length})`)) : null),
      h('div', { class: 'book-foot' }, h('span', { class: 'bf-count' }, L(`${list.length} จาก ${all.length} ชิ้น`, `${list.length} of ${all.length} items`)),
        h('span', { class: 'bf-count ix-owncount' }, L(`มีแล้ว ${all.filter(i => own.has(i)).length}`, `Owned ${all.filter(i => own.has(i)).length}`))),
    ];
    const right = e ? [narrow ? UI.bookBack(back) : null, ...this.detail(e)] : [UI.emptyState('bag', L('เลือกไอเทม', 'Pick an item'), L('แตะรายการทางซ้ายเพื่อดูรายละเอียด', 'Tap an item to see its details'))];
    return { left, right, e };
  },
  gachaPages(narrow, back) {
    const own = this.owned(), rows0 = typeof Gacha !== 'undefined' ? Gacha.rows : [];
    const pct = w => `${+w.toFixed(w < 1 ? 2 : 1)}%`;
    if (this.sel && !rows0.some(r => r.id === this.sel)) this.sel = null;
    const id = this.sel || (narrow ? null : (rows0.find(r => r.id) || {}).id) || null;
    const e = id ? { id, qty: 1, refine: 0, cards: [] } : null;
    const rows = rows0.slice().sort((a, b) => b.rank - a.rank || a.w - b.w).map(r => {
      const tag = h('span', { class: 'ix-tags' }, h('span', { class: 'ix-pct' }, pct(r.w)), r.id && own.has(r.id) ? h('span', { class: 'ix-own' }, L('มีแล้ว', 'Owned')) : null);
      if (r.id) { const row = UI.itemRow({ id: r.id, qty: r.qty || 1, refine: 0, cards: [] }, r.id === id, en => this.pick(en.id), tag); row.draggable = false; row.dataset.id = r.id; return row; }
      return h('div', { class: 'irow ix-volt r-' + (r.rar || 'common') }, h('span', { class: 'plate r-' + (r.rar || 'common') }, h('img', { src: Gacha.voltIcon(), alt: '' })),
        h('span', { class: 'irow-t' }, h('b', { class: 'iname' }, `${U.fmt(r.volt)} ${CUR}`), h('small', { class: 'isum' }, L('เงินรางวัล', 'Volt prize'))), tag);
    });
    const C = typeof Gacha !== 'undefined' ? Gacha.C : null;
    const left = [
      C ? h('p', { class: 'ix-note' }, L(`วงล้อนอร์น (Neo Eldheim) — ใช้ ${ITEMS[Gacha.TOKEN].name} ${C.cost} อัน/ครั้ง • หมุน ${C.multi.count} ครั้งการันตี ${EN(RARITY[C.multi.guarantee] ? RARITY[C.multi.guarantee].label : '')}+ 1 ชิ้น • ครบ ${C.pity.every} ครั้งได้ Epic+ แน่นอน`,
        `Norn's Wheel (Neo Eldheim) — ${C.cost} ${ITEMS[Gacha.TOKEN].name}/spin • ${C.multi.count}-spin guarantees 1 ${EN(RARITY[C.multi.guarantee] ? RARITY[C.multi.guarantee].label : '')}+ • Epic+ guaranteed every ${C.pity.every} spins`)) : null,
      h('div', { class: 'irows ix-rows' }, rows),
      h('div', { class: 'book-foot' }, h('span', { class: 'bf-count' }, L(`ของรางวัล ${rows0.length} แบบ`, `${rows0.length} prizes`))),
    ];
    const right = e ? [narrow ? UI.bookBack(back) : null, ...this.detail(e)] : [UI.emptyState('gacha', L('เลือกของรางวัล', 'Pick a prize'), '')];
    return { left, right, e };
  },
  setsPages(narrow, back) {
    const own = this.owned(), sets = Object.values(LOOT.SETS);
    if (this.selSet && !LOOT.SETS[this.selSet]) this.selSet = null;
    const sid = this.selSet || (narrow ? null : sets[0] && sets[0].id) || null, set = sid ? LOOT.SETS[sid] : null;
    const bonusTxt = b => Object.entries(b).map(([k, v]) => UI.enStat(k, v)).join(' · ');
    const rows = sets.map(s => {
      const have = s.items.filter(i => own.has(i)).length;
      const row = h('div', { class: 'irow ix-setrow' + (s.id === sid ? ' sel' : ''), role: 'button', tabindex: '0', 'data-set': s.id },
        h('span', { class: 'ix-setic' }, s.items.map(i => h('span', { class: 'plate r-' + LOOT.rarityOf(i) }, h('img', { src: itemIconUrl(i), alt: '' })))),
        h('span', { class: 'irow-t' }, h('b', { class: 'iname' }, EN(s.name)), h('small', { class: 'isum' }, `${s.items.length} pcs · ` + Object.keys(s.bonus).map(t => `${t}: ${bonusTxt(s.bonus[t])}`).join(' / '))),
        have ? h('span', { class: 'ix-tags' }, h('span', { class: 'ix-own' }, `${have}/${s.items.length}`)) : null);
      const go = () => { this.selSet = s.id; this.det = true; this.render(); };
      row.addEventListener('click', go); row.addEventListener('keydown', ev => { if (ev.key === 'Enter') go(); });
      return row;
    });
    const left = [
      h('p', { class: 'ix-note' }, L('สวมชิ้นในเซ็ตเดียวกันครบตามจำนวน ได้โบนัสเพิ่ม (ขั้นสูงรวมขั้นต่ำด้วย) — ระบบคอมโบของเกมนี้', 'Wear enough pieces of one set to unlock its bonus (higher tiers stack with lower ones) — the combo system of this game.')),
      h('div', { class: 'irows ix-rows' }, rows),
      h('div', { class: 'book-foot' }, h('span', { class: 'bf-count' }, L(`${sets.length} เซ็ต`, `${sets.length} sets`))),
    ];
    let right;
    if (set) {
      right = [narrow ? UI.bookBack(back) : null,
        h('div', { class: 'det-top ix-sethead' }, h('h3', { class: 'dname' }, `${EN(set.name)} Set`), h('small', {}, `${set.items.length} pieces`)),
        h('div', { class: 'dsec' }, h('div', { class: 'dsec-h' }, UI.ico('stats'), 'Set bonus'),
          ...Object.entries(set.bonus).map(([t, b]) => h('div', { class: 'kv' }, h('span', {}, `${t} pcs`), h('b', {}, bonusTxt(b))))),
        h('div', { class: 'dsec' }, h('div', { class: 'dsec-h' }, UI.ico('gem'), 'Pieces'),
          h('div', { class: 'irows ix-pieces' }, set.items.map(i => { const r = UI.itemRow({ id: i, qty: 1, refine: 0, cards: [] }, false, () => this.jump(i), this.rowExtra(i, own)); r.draggable = false; r.dataset.id = i; return r; }))),
      ];
    } else right = [UI.emptyState('crown', L('เลือกเซ็ต', 'Pick a set'), '')];
    return { left, right };
  },

  // ---------- หน้ารายละเอียด: ใช้หน้าของกระเป๋า (UI.itemDetail) แต่กาง "Details" ออก + ส่วน "หาได้จาก" ----------
  detail(e) {
    const it = ITEMS[e.id];
    const nodes = UI.itemDetail(e, null, null, { noPrice: true, cmp: isEquipType(it) });
    const out = [];
    for (const n of nodes) {
      if (n.tagName === 'DETAILS') { // ไม่พับ — หน้าศึกษา ต้องเห็นเงื่อนไข/ช่อง/เซ็ตทันที (ไม่แตะ UI.detOpen ของกระเป๋า)
        const box = h('div', { class: 'ix-more' });
        for (const c of [...n.childNodes]) if (c.tagName !== 'SUMMARY' && !(c.classList && c.classList.contains('tip-src'))) box.append(c);
        out.push(box);
      } else out.push(n);
    }
    const at = out.findIndex(n => n.classList && n.classList.contains('ix-more'));
    const extra = [this.priceSec(it), this.whereSec(e.id)];
    if (at >= 0) out.splice(at + 1, 0, ...extra); else out.push(...extra);
    return out;
  },
  priceSec(it) {
    const shop = (this.sources()[it.id] || []).some(s => s.k === 'shop');
    return h('div', { class: 'dsec ix-price' }, h('div', { class: 'dsec-h' }, h('i', { class: 'coin' }), 'Price'),
      shop ? h('div', { class: 'kv' }, h('span', {}, 'Shop price'), h('b', {}, `${U.fmt(it.price)} ${CUR}`)) : null,
      it.type === 'hrune' ? h('div', { class: 'kv' }, h('span', {}, 'Buy (once, kept forever)'), h('b', {}, `${U.fmt(it.price)} ${CUR}`))
        : h('div', { class: 'kv' }, h('span', {}, 'Sells for'), h('b', {}, `${U.fmt(Math.floor(it.price / 2))} ${CUR}`)));
  },
  whereSec(id) {
    const src = this.sources()[id] || [], it = ITEMS[id], lines = [];
    const pct = c => c >= 0.1 ? `${Math.round(c * 100)}%` : `${+(c * 100).toFixed(2)}%`;
    const mapName = k => k && MAP_DEFS[k] ? EN(MAP_DEFS[k].name) : '';
    const goBtn = (t, label) => h('button', { type: 'button', class: 'btn small ix-go', title: label, onclick: ev => { ev.stopPropagation(); UI.close(this.WIN); Nav.goTo(t); } }, L('ไป', 'Go'));
    const mobs = src.filter(s => s.k === 'mob');
    for (const s of mobs.slice(0, 12)) {
      const m = MOBS[s.mid];
      lines.push(h('div', { class: 'ix-src', 'data-src': 'mob', 'data-mob': s.mid },
        h('button', { type: 'button', class: 'ix-mob', title: L('ดูข้อมูลมอน', 'Monster info'), onclick: () => UI.showMob(s.mid) },
          h('b', {}, `${EN(m.name)}${m.boss ? ' (MVP)' : ''}`), h('small', {}, ` Lv ${m.lv}${s.map ? ' · ' + mapName(s.map) : ''}`)),
        h('em', {}, pct(s.c)), s.map ? goBtn({ kind: 'mob', map: s.map, mobId: s.mid, name: m.name }, L(`นำทางไปล่า ${m.name}`, `Navigate to hunt ${m.name}`)) : null));
    }
    if (mobs.length > 12) lines.push(h('small', { class: 'ix-src-more' }, `and ${mobs.length - 12} more monsters`));
    if (typeof Gacha !== 'undefined' && id === Gacha.TOKEN) lines.push(h('div', { class: 'ix-src', 'data-src': 'boss' }, h('b', {}, 'Every MVP / World Boss'), h('em', {}, '100%')),
      h('div', { class: 'ix-src', 'data-src': 'boss' }, h('b', {}, 'Any monster'), h('em', {}, pct(Gacha.C.mobDrop.base))));
    const seen = new Set();
    for (const s of src.filter(x => x.k === 'shop')) {
      const key = s.npc.id + s.map; if (seen.has(key)) continue; seen.add(key);
      lines.push(h('div', { class: 'ix-src', 'data-src': 'shop' }, h('b', {}, `Shop · ${EN(s.npc.name)}`), h('small', {}, ` ${mapName(s.map)}`), h('em', {}, `${U.fmt(it.price)} ${CUR}`),
        goBtn({ kind: 'npc', map: s.map, x: s.npc.x, y: s.npc.y, name: s.npc.name, npcId: s.npc.id }, L(`นำทางไป ${s.npc.name}`, `Navigate to ${s.npc.name}`))));
    }
    for (const s of src.filter(x => x.k === 'gacha'))
      lines.push(h('div', { class: 'ix-src', 'data-src': 'gacha' }, h('b', {}, "Norn's Wheel"), h('small', {}, ` Neo Eldheim${s.qty > 1 ? ' · ×' + s.qty : ''}`), h('em', {}, pct(s.c))));
    for (const s of src.filter(x => x.k === 'quest'))
      lines.push(h('div', { class: 'ix-src', 'data-src': 'quest' }, h('b', {}, 'Quest'), h('small', {}, ` ${EN(s.q.title)}${s.n > 1 ? ' · ×' + s.n : ''}`)));
    if (it.type === 'hrune') lines.push(h('div', { class: 'ix-src', 'data-src': 'rune' }, h('b', {}, 'Runes window'), h('small', {}, ' (Shift+R) or Brokk Forge-Bot'), h('em', {}, `${U.fmt(it.price)} ${CUR}`)));
    if (!lines.length) lines.push(h('div', { class: 'ix-src none' }, h('small', {}, 'No fixed source — events, crafting or other systems')));
    return h('div', { class: 'dsec ix-where' }, h('div', { class: 'dsec-h' }, UI.ico('gem'), 'Where to get'), ...lines);
  },
};
ItemIndex.init();
