'use strict';
// ============================================================
//  ร้านรูน — ราคา/การซื้อของรูนทั้งสองระบบ (เจ้าของ 2026-10-11 รอบ 31)
//  "แก้ไขรูน ตอนนี้มันกดใส่ได้เลย ทั้งๆ ที่ยังไม่ได้ซื้อ เสนอให้ซื้อทางไกลได้ แต่ค่าใช้จ่ายแพง" — ใช้กับ Skill Rune และ Hunt Rune
//  • Skill Rune (js/runes.js): ต้องซื้อ 1 ครั้งต่อรูน (เก็บตลอดไป) ก่อนเลือกใช้ได้ • เซฟ p.runesOwn = [runeId]
//    ราคาตาม Class ของสกิล: RS_SKILL_PRICE (Class 1 / 2 / 3) — ตารางเดียว ปรับที่นี่ที่เดียว
//  • Hunt Rune (js/huntrunes.js): ราคาฐาน = HuntRunes.def(id).price เหมือนเดิม
//  • ยืนใกล้ Brokk Forge-Bot (ระยะคุย NPC.talkRange) หรือเปิดเตาของเขาอยู่ = ราคาปกติ
//    ซื้อจากที่อื่น (หน้าต่าง Skills / Runes ที่ไหนก็ได้) = ราคา × RS_REMOTE_MUL ("ค่าส่งทางไกล")
//  • เซฟเก่า (ไม่มี runesOwn): รูนที่เลือกใช้อยู่ใน p.runes + ในชุด Builds ที่บันทึกไว้ = ได้เป็นของตัวเองทันที (ไม่ยึดของที่เล่นอยู่)
//  • หน้าต่างยืนยัน = #w-confirm เดิม (ราคา / ค่าส่งทางไกล / เหลือหลังซื้อ หรือ ขาดอีกเท่าไร / ปุ่ม "ไปซื้อที่ Brokk")
//  • แท็บ "Skill Rune" ในเตาของ Brokk (UI.renderForge → RuneShop.forgeTab) • CSS: css/runeshop.css
// ============================================================
const RS_REMOTE_MUL = 1.5;                         // ซื้อทางไกล +50%
const RS_SKILL_PRICE = { 1: 1500, 2: 3000, 3: 6000 }; // Skill Rune ตาม Class ของสกิล (Novice = Class 1)

const RuneShop = {
  REMOTE_MUL: RS_REMOTE_MUL, SKILL_PRICE: RS_SKILL_PRICE, NPC_ID: 'refine',
  _tier: null,

  // ---------- ราคา ----------
  tierOf(skill) {
    if (!this._tier) {
      this._tier = {};
      for (const j in JOBS) for (const id of JOBS[j].skills || []) if (!(id in this._tier)) this._tier[id] = j === 'novice' ? 1 : Math.max(1, Math.min(3, JOBS[j].tier || 1));
    }
    return this._tier[skill] || 1;
  },
  basePrice(kind, id) {
    if (kind === 'hunt') { const d = typeof HuntRunes !== 'undefined' && HuntRunes.def(id); return d ? d.price : 0; }
    const r = Runes.BY_ID[id]; return r ? this.SKILL_PRICE[this.tierOf(r.skill)] : 0;
  },
  brokk() { return (G.npcs || []).find(n => n.id === this.NPC_ID) || null; },
  // ใกล้ Brokk = อยู่ในระยะคุย หรือเปิดเตาของเขาอยู่ (เตาปิดเองเมื่อเดินห่าง — js/ui.js renderForge)
  near() {
    if (typeof UI !== 'undefined' && UI.forge && UI.forge.npc && UI.isOpen && UI.isOpen('w-forge')) return true;
    const n = this.brokk(), p = G.player;
    return !!(n && p && typeof NPC !== 'undefined' && NPC.inTalkRange(n, p));
  },
  quote(kind, id, near = this.near()) {
    const base = this.basePrice(kind, id), price = near ? base : Math.round(base * this.REMOTE_MUL);
    return { base, price, extra: price - base, near, have: G.player.zeny, miss: Math.max(0, price - G.player.zeny) };
  },
  price(kind, id) { return this.quote(kind, id).price; },

  // ---------- เป็นเจ้าของ ----------
  own(p = G.player) { return Array.isArray(p.runesOwn) ? p.runesOwn : (p.runesOwn = []); },
  owns(kind, id, p = G.player) { return kind === 'hunt' ? HuntRunes.owns(id, p) : this.own(p).includes(id); },
  ownsSkill(rid, p = G.player) { return this.own(p).includes(rid); },
  clean(a) {
    const out = [];
    if (Array.isArray(a)) for (const id of a.slice(0, 400)) if (typeof id === 'string' && Runes.BY_ID[id] && !out.includes(id)) out.push(id);
    return out;
  },
  // โหลดเซฟ (game.js loadGameFrom หลัง Runes.sanitize / Loadouts.sanitize) — data = เซฟดิบ
  migrate(p, data) {
    if (data && Array.isArray(data.runesOwn)) p.runesOwn = this.clean(data.runesOwn);
    else { // เซฟก่อนรอบ 31: รูนเลือกใช้ได้ฟรี → ของที่ใช้อยู่ (รวมในชุด Builds) เป็นของผู้เล่นเลย
      const grant = Object.values(p.runes || {});
      const lo = p.loadouts && Array.isArray(p.loadouts.slots) ? p.loadouts.slots : [];
      for (const s of lo) if (s && s.runes) grant.push(...Object.values(s.runes));
      p.runesOwn = this.clean(grant);
    }
    const keep = {}; // กันเซฟที่ถูกแก้: รูนที่เลือกต้องเป็นของเราแล้ว
    for (const k in p.runes || {}) if (p.runesOwn.includes(p.runes[k])) keep[k] = p.runes[k];
    p.runes = keep;
  },

  // ---------- ข้อความ ----------
  nameOf(kind, id) { return kind === 'hunt' ? HuntRunes.def(id).name : Runes.BY_ID[id].name; },
  // "ซื้อทางไกล 2,250 (ที่ Brokk 1,500)" / "ซื้อ 1,500"
  buyLabel(kind, id, q = this.quote(kind, id)) {
    return q.near ? L(`ซื้อ ${U.fmt(q.price)}`, `Buy ${U.fmt(q.price)}`)
      : L(`ซื้อทางไกล ${U.fmt(q.price)} (ที่ Brokk ${U.fmt(q.base)})`, `Remote ${U.fmt(q.price)} (at Brokk ${U.fmt(q.base)})`);
  },
  shortLabel(kind, id, q = this.quote(kind, id)) { return L(`ซื้อ ${U.fmt(q.price)}`, `Buy ${U.fmt(q.price)}`); },
  missText(q) { return L(`${CUR} ไม่พอ — ขาดอีก ${U.fmt(q.miss)} (ราคา ${U.fmt(q.price)} • มี ${U.fmt(q.have)})`, `Not enough ${CUR} — ${U.fmt(q.miss)} short (price ${U.fmt(q.price)} • you have ${U.fmt(q.have)})`); },
  notOwnedText(kind, id) {
    const q = this.quote(kind, id), nm = this.nameOf(kind, id);
    return q.near ? L(`ยังไม่ได้ซื้อ ${nm} — ซื้อได้ ${U.fmt(q.price)} ${CUR}`, `You don't own ${nm} yet — buy it for ${U.fmt(q.price)} ${CUR}`)
      : L(`ยังไม่ได้ซื้อ ${nm} — ซื้อทางไกล ${U.fmt(q.price)} ${CUR} หรือที่ Brokk Forge-Bot ${U.fmt(q.base)} ${CUR}`,
        `You don't own ${nm} yet — buy it remotely for ${U.fmt(q.price)} ${CUR} or at Brokk Forge-Bot for ${U.fmt(q.base)} ${CUR}`);
  },

  // ---------- ซื้อ (คืน true/false) — ราคาคิดตอนกดยืนยัน (เดินเข้า/ออกระยะ Brokk ระหว่างนั้นได้ราคาตามจริง) ----------
  // maxPrice = ราคาที่ผู้เล่นเห็นในหน้าต่างยืนยัน — ราคาตอนกดแพงกว่าที่เห็น (เดินออกจากระยะ Brokk) = ไม่ซื้อ ให้ดูราคาใหม่ก่อน
  buy(kind, id, maxPrice) {
    const p = G.player;
    if (kind === 'hunt') { if (!HuntRunes.def(id)) return false; }
    else if (!Runes.BY_ID[id]) return false;
    if (this.owns(kind, id)) { UI.msg(L('มีรูนนี้อยู่แล้ว', 'You already own this rune.'), 'info'); return false; }
    const q = this.quote(kind, id);
    if (maxPrice != null && q.price > maxPrice) { UI.msg(L(`ราคาเปลี่ยนเป็น ${U.fmt(q.price)} ${CUR} (ออกนอกระยะ Brokk) — กดซื้อใหม่เพื่อยืนยันราคานี้`, `Price changed to ${U.fmt(q.price)} ${CUR} (left Brokk's range) — tap buy again to confirm.`), 'err'); return false; }
    if (!(p.zeny >= q.price)) { UI.msg(this.missText(q), 'err'); return false; } // รวมกรณีเงินเสีย (NaN)
    p.zeny -= q.price;
    if (kind === 'hunt') HuntRunes.own(p).push(id); else this.own(p).push(id);
    if (typeof Sound !== 'undefined') Sound.play('buy');
    const nm = this.nameOf(kind, id), fee = q.extra > 0 ? L(` (รวมค่าส่งทางไกล ${U.fmt(q.extra)})`, ` (incl. ${U.fmt(q.extra)} remote fee)`) : '';
    UI.msg(kind === 'hunt'
      ? L(`ได้รับ ${nm} — ${U.fmt(q.price)} ${CUR}${fee} • ใส่ช่องได้ที่เมนู Runes (Shift+R) → Hunt Runes`, `Obtained ${nm} — ${U.fmt(q.price)} ${CUR}${fee} • socket it in Runes (Shift+R) → Hunt Runes.`)
      : L(`ได้รับ ${nm} — ${U.fmt(q.price)} ${CUR}${fee} • เลือกใช้ได้ตลอดไป`, `Obtained ${nm} — ${U.fmt(q.price)} ${CUR}${fee} • yours to use forever.`), 'sys');
    saveGame(); UI.dirty();
    return true;
  },
  // ไปซื้อที่ Brokk (ถูกกว่า): นำทางไปหา NPC
  goBrokk() {
    for (const m in MAP_DEFS) {
      const n = (MAP_DEFS[m].npcs || []).find(x => x.id === this.NPC_ID);
      if (n) { this.close(); Nav.goTo({ kind: 'npc', map: m, x: n.x, y: n.y, name: n.name, npcId: n.id }); return true; }
    }
    return false;
  },

  // ---------- หน้าต่างยืนยัน (#w-confirm) ----------
  // after(ok) = เรียกหลังซื้อสำเร็จ (เช่น ใส่รูนเลย) • คืน element ของหน้าต่าง (ให้เทสต์)
  priceRows(q) {
    const kv = (k, v, cls) => h('div', { class: 'rs-kv' + (cls ? ' ' + cls : '') }, h('span', {}, k), h('b', {}, v));
    return [
      q.near ? kv(L('ราคา (ที่ Brokk)', 'Price (at Brokk)'), `${U.fmt(q.price)} ${CUR}`)
        : kv(L('ราคาซื้อทางไกล', 'Remote price'), `${U.fmt(q.price)} ${CUR}`),
      q.near ? null : kv(L(`ค่าส่งทางไกล (+${Math.round((this.REMOTE_MUL - 1) * 100)}%)`, `Remote fee (+${Math.round((this.REMOTE_MUL - 1) * 100)}%)`), `+${U.fmt(q.extra)}`, 'rs-fee'),
      q.near ? null : kv(L('ซื้อที่ Brokk', 'At Brokk'), `${U.fmt(q.base)} ${CUR}`, 'rs-base'),
      q.miss > 0 ? kv(L('ขาดอีก', 'Short by'), `${U.fmt(q.miss)} ${CUR}`, 'rs-miss')
        : kv(L('เหลือหลังซื้อ', 'Left after'), `${U.fmt(q.have - q.price)} ${CUR}`, 'rs-left'),
    ].filter(Boolean);
  },
  ask(kind, id, after) {
    const w = document.getElementById('w-confirm'); if (!w) return null;
    const body = w.querySelector('.win-body'), q = this.quote(kind, id), nm = this.nameOf(kind, id);
    const sub = kind === 'hunt' ? `Hunt Rune · ${HuntRunes.kindLabel(HuntRunes.def(id))}` : `Skill Rune · ${SKILLS[Runes.BY_ID[id].skill].name} · Class ${this.tierOf(Runes.BY_ID[id].skill)}`;
    const btn = (cls, txt, fn, dis) => h('button', { type: 'button', class: 'btn ' + cls, disabled: dis ? 'disabled' : false, onclick: fn }, txt);
    body.innerHTML = '';
    body.append(h('div', { class: 'rs-ask', 'data-kind': kind, 'data-rune': id, 'data-price': String(q.price), 'data-near': q.near ? '1' : '0' },
      h('b', { class: 'rs-q' }, L(`ซื้อ ${nm}?`, `Buy ${nm}?`)),
      h('small', { class: 'rs-sub' }, sub),
      ...this.priceRows(q),
      h('p', { class: 'rs-note' }, L('ซื้อครั้งเดียว เก็บตลอดไป', 'Buy once, keep forever')),
      h('div', { class: 'rs-acts' },
        btn('primary rs-ok', q.miss > 0 ? L(`ขาดอีก ${U.fmt(q.miss)}`, `${U.fmt(q.miss)} short`) : L(`ยืนยันซื้อ ${U.fmt(q.price)}`, `Buy ${U.fmt(q.price)}`),
          () => { const ok = this.buy(kind, id, q.price); this.close(); if (ok && after) after(); }, q.miss > 0),
        q.near ? null : btn('rs-go', L(`ไปซื้อที่ Brokk ${U.fmt(q.base)}`, `Go to Brokk · ${U.fmt(q.base)}`), () => this.goBrokk()),
        btn('rs-no', L('ยกเลิก', 'Cancel'), () => this.close()))));
    w.classList.remove('hidden'); w.style.zIndex = ++UI.z + 1000;
    if (typeof Sound !== 'undefined') Sound.play('click');
    return w;
  },
  close() { const w = document.getElementById('w-confirm'); if (w && w.querySelector('.rs-ask')) w.classList.add('hidden'); },

  // ---------- แท็บ Skill Rune ในเตาของ Brokk (ราคาปกติ) — คืน { left, right, det } แบบ HuntRunes.forgeTab ----------
  forgeTab(f, tabs, foot, back) {
    const p = G.player, narrow = UI.narrow();
    const ids = typeof Runebook !== 'undefined' ? Runebook.skillIds() : [];
    const all = []; for (const id of ids) for (const r of Runes.list(id)) all.push(r);
    if (f.ssel && !all.some(r => r.id === f.ssel)) f.ssel = null;
    const cur = f.ssel || (narrow ? null : (all.find(r => !this.ownsSkill(r.id)) || all[0] || {}).id || null);
    const row = r => {
      const own = this.ownsSkill(r.id), q = this.quote('skill', r.id, true);
      const el = h('div', { class: 'rs-row' + (r.id === cur ? ' sel' : '') + (own ? ' own' : ''), role: 'button', tabindex: '0', 'data-rune': r.id },
        h('i', { class: 'rs-g', style: `color:${r.col || 'inherit'}` }, r.glyph || 'ᚱ'),
        h('span', { class: 'rs-t' }, h('b', {}, r.name), h('small', {}, `${SKILLS[r.skill].name} · Class ${this.tierOf(r.skill)}`)),
        own ? h('span', { class: 'rs-own' }, L('มีแล้ว ✓', 'Owned ✓')) : h('span', { class: 'rs-pr' + (q.miss > 0 ? ' poor' : '') }, U.fmt(q.price)));
      const go = () => { f.ssel = r.id; f.det = true; UI.renderForge(); };
      el.addEventListener('click', go); el.addEventListener('keydown', ev => { if (ev.key === 'Enter') go(); });
      return el;
    };
    const left = [tabs, all.length ? h('div', { class: 'irows rs-list' }, all.map(row))
      : UI.emptyState('rune', L('ยังไม่มี Skill Rune', 'No Skill Runes yet'), L('Skill Rune มากับสกิลของ Class — รับ Class ที่ Mimir AI ก่อน', 'Skill Runes come with Class skills — get a Class from Mimir AI first')),
    foot(L(`Class 1 = ${U.fmt(this.SKILL_PRICE[1])} • Class 2 = ${U.fmt(this.SKILL_PRICE[2])} • Class 3 = ${U.fmt(this.SKILL_PRICE[3])}`, `Class 1 = ${U.fmt(this.SKILL_PRICE[1])} • Class 2 = ${U.fmt(this.SKILL_PRICE[2])} • Class 3 = ${U.fmt(this.SKILL_PRICE[3])}`))];
    let right;
    if (cur) {
      const r = Runes.BY_ID[cur], own = this.ownsSkill(cur), q = this.quote('skill', cur, true), lv = p.skills[r.skill] || 0;
      const acts = own
        ? [h('button', { type: 'button', class: 'btn big primary rs-open', onclick: () => { if (typeof Runebook !== 'undefined') Runebook.open('skill', r.skill); } }, L('เลือกใช้ใน Runes', 'Use it in Runes'))]
        : [h('button', { type: 'button', class: 'btn big primary rs-buy' + (q.miss > 0 ? ' poor' : ''), disabled: q.miss > 0 ? 'disabled' : false, onclick: () => this.ask('skill', cur, () => UI.renderForge()) },
          q.miss > 0 ? L(`ขาดอีก ${U.fmt(q.miss)} ${CUR}`, `${U.fmt(q.miss)} ${CUR} short`) : L(`ซื้อ ${U.fmt(q.price)} ${CUR}`, `Buy ${U.fmt(q.price)} ${CUR}`))];
      right = [back,
        h('div', { class: 'det-top rs-top' }, h('i', { class: 'rs-g big', style: `color:${r.col || 'inherit'}` }, r.glyph || 'ᚱ'),
          h('div', {}, h('h3', { class: 'dname' }, r.name), h('small', {}, `${SKILLS[r.skill].name} · Skill Lv ${lv}/${SKILLS[r.skill].max} · Class ${this.tierOf(r.skill)}`))),
        h('p', { class: 'rs-desc' }, Runes.thOf ? Runes.thOf(r) : Runes.shortOf(r)),
        h('details', { class: 'det-more' }, h('summary', {}, 'Details'), h('p', {}, r.desc())),
        h('div', { class: 'rs-info' }, own ? L('มีแล้ว — เลือกใช้ได้ที่หน้าต่าง Skills หรือ Runes (Shift+R)', 'Owned — choose it in Skills or Runes (Shift+R)')
          : L(`Brokk ขายราคาปกติ ${U.fmt(q.price)} ${CUR} (ซื้อทางไกล ${U.fmt(Math.round(q.base * this.REMOTE_MUL))}) • ใช้ได้เมื่อสกิลถึง Lv ${Runes.UNLOCK}`,
            `Brokk sells it at the normal price, ${U.fmt(q.price)} ${CUR} (remote ${U.fmt(Math.round(q.base * this.REMOTE_MUL))}) • usable at Skill Lv ${Runes.UNLOCK}`)),
        h('div', { class: 'det-acts' }, acts)];
    } else right = [UI.emptyState('rune', L('เลือกรูนทางซ้าย', 'Pick a rune'), L('ซื้อครั้งเดียว เก็บตลอดไป', 'Buy once, keep forever'))];
    return { left, right, det: f.det && !!cur };
  },
};
