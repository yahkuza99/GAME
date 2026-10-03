'use strict';
// ============================================================
//  Hunt Rune — ตีแรงแบบมีเงื่อนไข (แนวการ์ด/Endow ของ RO) แยกจาก Rune Paths (js/runes.js)
//  เจ้าของ 2026-10-03: "มีรูนประเภทตีแรงขึ้นได้ อาจจะเป็นการชนะทาง หรือตีศัตรูชนิดได้แรงขึ้นแบบ RO" • "อิสระเป็นของผู้เล่น"
//  • ช่อง 2 ช่องต่อตัวละคร: ช่อง I ปลดที่ Base Lv 15 • ช่อง II ที่ Base Lv 35 • สลับฟรีนอกการต่อสู้ (กติกา 5 วิ เดียวกับ Runes.combatLeft)
//  • ซื้อครั้งเดียวเก็บตลอดไปที่ Brokk Forge-Bot (แท็บ Hunt Rune ในเตาตีเหล็ก) — ไม่ใช่ของในกระเป๋า ขาย/ทิ้ง/แลกไม่ได้
//  • ชนิด: Slayer (ตามเผ่า +20% กาย+เวท) • Endow (เปลี่ยนธาตุตีปกติ/สกิลที่ไม่มีธาตุ → ใช้ ELEM_TABLE จริง ได้ทั้งแรงขึ้นและเบาลง)
//          • เงื่อนไข: Giant Slayer / Executioner / Ambusher / Pack Breaker
//  • ซ้อนแบบคูณกับดาเมจเดิม • เงื่อนไขเดียวกันไม่ซ้อนสองครั้ง • Endow ได้แค่ 1 อัน • โบนัส Hunt Rune รวมต่อครั้งไม่เกิน +45%
//    (ตัวคูณธาตุจาก Endow = ระบบธาตุปกติ ไม่นับในเพดาน)
//  • ลานประลอง (PvP): ใช้ได้แค่ Human Slayer (+10%) • Endow เจอเกราะธาตุกลาง (×1) • Slayer อื่น/เงื่อนไขไม่ทำงาน
//  เซฟ: p.hrunes = [ช่อง I, ช่อง II] (id หรือ null) • p.hrunesOwn = id ที่ซื้อแล้ว • เซฟเก่าไม่มี = ว่าง
//  ข้อมูลไอเทม (ชื่อ/คำอธิบาย) เป็นภาษาอังกฤษ — ITEMS[id].type = 'hrune' (ไม่เข้ากระเป๋า)
//  หน้าต่าง: #w-hrunes (ช่องรูน) • แท็บ Runes ในกระเป๋า • แท็บ Hunt Rune ในเตาของ Brokk • CSS: css/huntrunes.css
// ============================================================

const HR_UNLOCK = [15, 35], HR_CAP = 0.45, HR_SLAY = 0.20, HR_SLAY_PVP = 0.20; // กติกาเดียวทุกที่ (เจ้าของ: ไม่แยก PvE/PvP) — Human Slayer แรงเท่า Slayer อื่น
// เส้นรูน (กล่อง 10×14) วาดเองทั้งหมด — ไม่พึ่งฟอนต์ Runic
const HR_GLYPH = {
  tiwaz: [[[5, 14], [5, 0]], [[1, 4], [5, 0], [9, 4]]],
  mannaz: [[[2, 14], [2, 0], [8, 6]], [[8, 14], [8, 0], [2, 6]]],
  kenaz: [[[8, 1], [2, 7], [8, 13]]],
  laguz: [[[3, 14], [3, 0], [8, 5]]],
  ansuz: [[[3, 14], [3, 0]], [[3, 1], [8, 5]], [[3, 6], [8, 10]]],
  othala: [[[1, 14], [8, 6], [5, 1], [2, 6], [9, 14]]],
  sowilo: [[[7, 0], [2, 5], [8, 9], [3, 14]]],
  hagalaz: [[[2, 0], [2, 14]], [[8, 0], [8, 14]], [[2, 5], [8, 9]]],
  thurisaz: [[[2, 0], [2, 14]], [[2, 4], [8, 7], [2, 10]]],
  eihwaz: [[[2, 0], [5, 2], [5, 12], [8, 14]]],
  perthro: [[[4, 0], [4, 14]], [[8, 1], [4, 4]], [[4, 10], [8, 13]]],
  dagaz: [[[1, 1], [1, 13], [9, 1], [9, 13], [1, 1]]],
};
// ชื่อเผ่า (ตรงกับสมุดมอนสเตอร์) — ใช้ใน UI / แถบเป้าหมาย
const HR_RACE = { brute: L('สัตว์กลไก', 'Mech Beast'), plant: L('พืชกลไก', 'Mech Plant'), insect: L('แมลงกลไก', 'Mech Insect'), undead: L('อมตะ', 'Undead'),
  demon: L('ปีศาจ', 'Demon'), angel: L('เทวดา', 'Angel'), formless: L('ไร้รูป', 'Formless'), human: L('ผู้เล่น', 'Human'), fish: L('สัตว์น้ำ', 'Aquatic'), dragon: L('มังกร', 'Dragon') };
const HR_RACE_EN = { brute: 'Mech Beast', plant: 'Mech Plant', insect: 'Mech Insect', undead: 'Undead', demon: 'Demon', angel: 'Angel', formless: 'Formless', human: 'Human' };
const HR_ELEM_EN = { fire: 'Fire', water: 'Water', wind: 'Wind', earth: 'Earth', holy: 'Holy', shadow: 'Shadow' };

const HuntRunes = {
  UNLOCK: HR_UNLOCK, CAP: HR_CAP, DEFS: {}, LIST: [],
  KINDS: { slayer: 'Slayer', endow: 'Endow', cond: 'Conditional' },
  sel: null, filter: 'all', _left: -1,

  // ---------- ข้อมูล ----------
  add(d) {
    d.price = d.price | 0;
    this.DEFS[d.id] = d; this.LIST.push(d);
    ITEMS[d.id] = { id: d.id, name: d.name, type: 'hrune', price: d.price, rarity: d.rarity, icon: { s: 'hrune', c: d.col, g: d.glyph }, desc: d.desc };
  },
  build() {
    const slay = [['brute', 1500, '#c0703a'], ['plant', 1500, '#5aa04a'], ['insect', 1500, '#a8a03a'], ['formless', 1500, '#9a90b0'],
      ['undead', 2500, '#6f8296'], ['demon', 4000, '#b03a3a'], ['angel', 4000, '#e0c060']];
    for (const [race, price, col] of slay) this.add({ id: 'hr_slay_' + race, kind: 'slayer', race, pct: HR_SLAY, price, col, glyph: 'tiwaz', rarity: price >= 4000 ? 'rare' : 'uncommon',
      name: `${HR_RACE_EN[race]} Slayer Rune`, short: `+${HR_SLAY * 100}% vs ${HR_RACE_EN[race]}`,
      desc: `Slayer rune. +${HR_SLAY * 100}% physical and magic damage against ${HR_RACE_EN[race]}-race monsters.` });
    this.add({ id: 'hr_slay_human', kind: 'slayer', race: 'human', pct: HR_SLAY_PVP, price: 2500, col: '#c87a8a', glyph: 'mannaz', rarity: 'uncommon', arena: true,
      name: 'Human Slayer Rune', short: `+${HR_SLAY_PVP * 100}% vs players (Arena)`,
      desc: `Slayer rune. +${HR_SLAY_PVP * 100}% physical and magic damage against other players (they only meet in the PvP Arena).` });
    const endow = [['fire', 2500, '#e8602a', 'kenaz'], ['water', 1500, '#3a90e0', 'laguz'], ['wind', 1500, '#3ab89a', 'ansuz'], ['earth', 1500, '#a07a40', 'othala'],
      ['holy', 4000, '#e8c850', 'sowilo'], ['shadow', 4000, '#6a4a9a', 'hagalaz']];
    for (const [el, price, col, glyph] of endow) {
      const row = ELEM_TABLE[el] || {}, good = Object.keys(row).filter(k => row[k] > 1), bad = Object.keys(row).filter(k => row[k] < 1);
      const fmt = ks => ks.map(k => `${k[0].toUpperCase() + k.slice(1)} ×${row[k]}`).join(', ');
      this.add({ id: 'hr_endow_' + el, kind: 'endow', elem: el, price, col, glyph, rarity: price >= 4000 ? 'rare' : 'uncommon',
        name: `${HR_ELEM_EN[el]} Endow Rune`, short: `Attacks become ${HR_ELEM_EN[el]}`,
        desc: `Endow rune. Your basic attacks and skills without an element of their own deal ${HR_ELEM_EN[el]} damage.`
          + (good.length ? ` Strong: ${fmt(good)}.` : '') + (bad.length ? ` Weak: ${fmt(bad)}.` : '') + ' Only one Endow can be active.' });
    }
    const C = (id, glyph, col, pct, name, short, desc, test, extra) => this.add(Object.assign({ id, kind: 'cond', glyph, col, pct, price: 6000, rarity: 'rare', name, short, desc, test }, extra || {}));
    C('hr_giant', 'thurisaz', '#c8962a', 0.25, 'Giant Slayer Rune', '+25% vs bosses · −10% vs others',
      'Conditional rune. +25% damage against MVPs, bosses and Ancients, but −10% against every other monster.', m => this.isBig(m), { miss: -0.10 });
    C('hr_exec', 'eihwaz', '#b03030', 0.30, 'Executioner Rune', '+30% vs targets under 30% HP',
      'Conditional rune. +30% damage against a target below 30% HP.', m => m.maxHp > 0 && m.hp / m.maxHp < 0.30);
    C('hr_ambush', 'perthro', '#4a6a9a', 0.25, 'Ambusher Rune', '+25% first hit on a full-HP target',
      'Conditional rune. +25% damage on the opening hit against a target at full HP.', m => m.maxHp > 0 && m.hp >= m.maxHp);
    C('hr_pack', 'dagaz', '#c86a20', 0.15, 'Pack Breaker Rune', '+15% with 3+ enemies within 3 cells',
      'Conditional rune. +15% damage while 3 or more enemies are within 3 cells of you.', () => this.packCount() >= 3);
  },
  isBig(m) { return !!(m.def.boss || m.isMvp || m.isWB || m.def.worldBoss); },
  packCount() {
    const p = G.player; let n = 0;
    for (const o of G.mobs) if (!o.dead && !o.def.dummy && Math.abs(o.x - p.x) <= 3 && Math.abs(o.y - p.y) <= 3 && U.dist(o.x, o.y, p.x, p.y) <= 3) n++;
    return n;
  },
  def(id) { return typeof id === 'string' && Object.prototype.hasOwnProperty.call(this.DEFS, id) ? this.DEFS[id] : null; },
  own(p = G.player) { return Array.isArray(p.hrunesOwn) ? p.hrunesOwn : (p.hrunesOwn = []); },
  owns(id, p = G.player) { return this.own(p).includes(id); },
  slots(p = G.player) { if (!Array.isArray(p.hrunes) || p.hrunes.length !== 2) p.hrunes = this.cleanSlots(p.hrunes, this.own(p)); return p.hrunes; },
  unlocked(i, p = G.player) { return (p.baseLv || 1) >= HR_UNLOCK[i]; },
  // รูนที่ทำงานจริง (ช่องที่ปลดแล้วเท่านั้น)
  active(p = G.player) {
    const s = this.slots(p), out = [];
    for (let i = 0; i < 2; i++) { const d = this.unlocked(i, p) && this.def(s[i]); if (d) out.push(d); }
    return out;
  },
  endow(p = G.player) { for (const d of this.active(p)) if (d.kind === 'endow') return d; return null; },

  // ---------- เซฟ ----------
  cleanOwn(a) {
    const out = [];
    if (Array.isArray(a)) for (const id of a.slice(0, 64)) if (this.def(id) && !out.includes(id)) out.push(id);
    return out;
  },
  // [ช่อง I, ช่อง II]: ต้องซื้อแล้ว ไม่ซ้ำ และ Endow ไม่เกิน 1
  cleanSlots(a, own) {
    const out = [null, null];
    if (!Array.isArray(a)) return out;
    let endow = false;
    for (let i = 0; i < 2; i++) {
      const d = this.def(a[i]);
      if (!d || (own && !own.includes(d.id)) || out.includes(d.id) || (d.kind === 'endow' && endow)) continue;
      if (d.kind === 'endow') endow = true;
      out[i] = d.id;
    }
    return out;
  },
  sanitize(p) { p.hrunesOwn = this.cleanOwn(p.hrunesOwn); p.hrunes = this.cleanSlots(p.hrunes, p.hrunesOwn); },

  // ---------- การต่อสู้ ----------
  // ธาตุที่ใช้ตีจริง: สกิลมีธาตุของตัวเอง = ใช้ธาตุนั้น • ไม่มี = Endow (ถ้าใส่) ไม่งั้น neutral
  elem(el) { if (el) return el; const e = G.player && this.endow(); return e ? e.elem : 'neutral'; },
  // คืน { el, k, tags } — k = ตัวคูณ Hunt Rune (ไม่รวมธาตุ) เพดาน +45% • tags = รูนที่ทำงานครั้งนี้ (ใช้ทำเอฟเฟกต์)
  hit(m, el) {
    const p = G.player, act = p ? this.active(p) : [];
    const out = { el: el || 'neutral', k: 1, tags: null, endow: null };
    if (!act.length || !m || !m.def) return out;
    const arena = !!m.isPlayer, pvp = arena && !!(G.map && G.map.def.pvp);
    let k = 1;
    for (const d of act) {
      let on = false;
      if (d.kind === 'endow') { if (!el) { out.el = d.elem; out.endow = d; } continue; }
      if (d.kind === 'slayer') {
        if (d.arena) on = pvp && m.def.race === 'human';
        else on = !arena && m.def.race === d.race;
      } else if (d.kind === 'cond') { // ใช้ได้ทุกที่รวมลานประลอง (เจ้าของ: ไม่แยก PvE/PvP)
        on = !!d.test(m);
        if (!on && d.miss) k *= 1 + d.miss; // Giant Slayer: มอนธรรมดา −10% (หุ่นฝึกก็นับเป็นมอนธรรมดา — วัด DPS ตรงความจริง)
      }
      if (on) { k *= 1 + d.pct; (out.tags || (out.tags = [])).push(d); }
    }
    out.k = Math.min(1 + HR_CAP, k);
    return out;
  },
  // ประมาณการให้บอท (js/bot.js): ธาตุ + ตัวคูณ (ไม่มีสุ่ม)
  estMul(m, el) { const r = this.hit(m, el); return elemMod(r.el, m.def.element) * r.k; },

  // ---------- เอฟเฟกต์ตีโดน (เรียกจาก applyHit) ----------
  feedback(m, r) {
    if (!r || r.miss || G.fastSim || !m) return;
    const tags = (r.hr || []).slice();
    if (r.endow && r.em != null && r.em !== 1) tags.push(r.endow); // Endow โชว์เมื่อธาตุมีผลจริง (ไม่กะพริบทุกครั้ง)
    const s = (m.def && m.def.scale) || 1;
    if (tags.length && (m._hrFx || 0) <= G.time) {
      m._hrFx = G.time + 0.22;
      G.fx.push({ type: 'hrune', hrune: 1, ref: m, x: m.x, y: m.y, t: 0, dur: 0.7, ids: tags.map(d => d.id), s });
    }
    if (r.em != null && r.em !== 1 && (m._hrEm || 0) <= G.time) {
      m._hrEm = G.time + 0.7;
      addFloater(m.x + 0.8, m.y - 0.8 * s - 0.1, r.em > 1 ? 'Weak!' : 'Resist', r.em > 1 ? '#ffb347' : '#a9bccf');
    }
  },
  drawFx(g, f) {
    const k = Math.min(1, f.t / f.dur), o = f.ref && !f.ref.dead ? f.ref : f;
    // ข้างซ้ายของมอน ระดับอก (ตัวเลขดาเมจลอยตรงกลาง / Weak! อยู่ขวา — ไม่ทับกัน)
    const n = f.ids.length, S = 22, sz = f.s || 1, X = o.x * TILE - 24 * sz - S / 2, Y = o.y * TILE * R.K - 30 * sz - 12 * k;
    const a = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.55) / 0.45);
    g.save(); g.globalAlpha = Math.max(0, a);
    for (let i = 0; i < n; i++) {
      const cv = itemIconCanvas(f.ids[i], 48), x = X - (n - 1 - i) * (S + 3), sc = 1 + 0.35 * (1 - Math.min(1, k / 0.2));
      const d = this.DEFS[f.ids[i]];
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = U.rgba(d ? d.col : '#ffd34a', 0.55 * (1 - k));
      g.beginPath(); g.arc(x, Y, S * 0.85 * sc, 0, 7); g.fill(); g.restore();
      g.drawImage(cv, x - S * sc / 2, Y - S * sc / 2, S * sc, S * sc);
    }
    g.restore();
  },
  // ไอคอนหินรูน (วาดด้วยโค้ด — ใช้ทั้งในกระเป๋า/ร้าน/เอฟเฟกต์)
  drawIcon(g, spec, S) {
    g.save(); g.scale(S / 24, S / 24); g.lineJoin = 'round'; g.lineCap = 'round';
    const c = spec.c || '#c9a24a';
    g.beginPath(); g.moveTo(7, 2.5); g.lineTo(17, 2); g.quadraticCurveTo(20.5, 2.5, 20.5, 6.5); g.lineTo(21, 18.5); g.quadraticCurveTo(20.5, 22, 16.5, 22);
    g.lineTo(7.5, 22.3); g.quadraticCurveTo(3.4, 22, 3.2, 18); g.lineTo(3.5, 6); g.quadraticCurveTo(3.6, 2.6, 7, 2.5); g.closePath();
    const gr = g.createLinearGradient(4, 2, 20, 22); gr.addColorStop(0, U.rgba(c, 1)); gr.addColorStop(1, '#2a1c10');
    g.fillStyle = '#e9dcc0'; g.fill(); g.globalAlpha = 0.82; g.fillStyle = gr; g.fill(); g.globalAlpha = 1;
    g.strokeStyle = '#c9a24a'; g.lineWidth = 1.4; g.stroke();
    g.strokeStyle = 'rgba(255,240,200,0.35)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(6.5, 4); g.lineTo(16.5, 3.6); g.stroke();
    const gl = HR_GLYPH[spec.g] || HR_GLYPH.tiwaz;
    const path = dx => { g.beginPath(); for (const ln of gl) ln.forEach(([x, y], i) => (i ? g.lineTo : g.moveTo).call(g, 7 + x + dx, 5 + y + dx)); };
    path(0.7); g.strokeStyle = 'rgba(20,12,4,0.75)'; g.lineWidth = 2.6; g.stroke();
    path(0); g.strokeStyle = '#ffe9a8'; g.lineWidth = 1.7; g.stroke();
    g.restore();
  },

  // ---------- ซื้อ / ใส่ ----------
  canChange() { return typeof Runes === 'undefined' || Runes.canChange(); },
  combatLeft() { return typeof Runes !== 'undefined' ? Runes.combatLeft() : 0; },
  busyMsg() { const n = Math.ceil(this.combatLeft()); return L(`เปลี่ยน Hunt Rune ระหว่างต่อสู้ไม่ได้ (รออีก ${n} วิ)`, `Can't change Hunt Runes in combat (${n}s).`); },
  // ซื้อ (คืน true/false) — ไม่เช็กระยะ NPC (เรียกจากเตาของ Brokk ซึ่งปิดเองเมื่อเดินห่าง)
  buy(id) {
    const p = G.player, d = this.def(id);
    if (!d) return false;
    if (this.owns(id)) { UI.msg(L('มีรูนนี้อยู่แล้ว', 'You already own this rune.'), 'info'); return false; }
    if (p.zeny < d.price) { UI.msg(L(`${CUR} ไม่พอ (ต้องใช้ ${U.fmt(d.price)})`, `Not enough ${CUR} (needs ${U.fmt(d.price)}).`), 'err'); return false; }
    p.zeny -= d.price; this.own(p).push(id);
    if (typeof Sound !== 'undefined') Sound.play('buy');
    UI.msg(L(`ได้รับ ${d.name} — ใส่ได้ที่ Status → Hunt Rune`, `Obtained ${d.name} — socket it from Status → Hunt Rune.`), 'sys');
    saveGame(); UI.dirty();
    return true;
  },
  // ใส่/ถอด (id = null ถอด) • คืน true เมื่อเปลี่ยนจริง
  set(i, id, quiet) {
    const p = G.player, s = this.slots(p), d = id ? this.def(id) : null;
    const err = t => { if (!quiet) UI.msg(t, 'err'); return false; };
    if (!(i === 0 || i === 1)) return false;
    if (!this.unlocked(i)) return err(L(`ช่อง ${i ? 'II' : 'I'} ปลดที่ Base Lv ${HR_UNLOCK[i]}`, `Slot ${i ? 'II' : 'I'} unlocks at Base Lv ${HR_UNLOCK[i]}.`));
    if (!this.canChange()) return err(this.busyMsg());
    if (id && !d) return false;
    if (d && !this.owns(id)) return err(L('ยังไม่มีรูนนี้ — ซื้อได้ที่ Brokk Forge-Bot', "You don't own this rune yet — Brokk Forge-Bot forges them."));
    if (s[i] === (id || null)) return false;
    const other = s[1 - i];
    if (d && other === id) s[1 - i] = s[i]; // ใส่ตัวที่อยู่อีกช่อง = สลับช่อง
    else if (d && d.kind === 'endow' && other && this.def(other).kind === 'endow') return err(L('ใส่ Endow ได้ครั้งละ 1 อัน', 'Only one Endow rune can be active.'));
    s[i] = id || null;
    if (s[1 - i] && s[1 - i] === s[i]) s[1 - i] = null;
    if (!quiet) { if (typeof Sound !== 'undefined') Sound.play('equip'); }
    saveGame(); UI.dirty();
    return true;
  },
  // ใส่ทั้งชุด (Loadouts / Build Code) — ข้ามที่ไม่มี/ช่องยังล็อก • คืนจำนวนที่ข้าม
  applyList(list) {
    const p = G.player, next = [null, null], own = this.own(p);
    let skipped = 0, endow = false;
    for (let i = 0; i < 2; i++) {
      const d = this.def(list && list[i]);
      if (!d) continue;
      if (!own.includes(d.id) || !this.unlocked(i) || next.includes(d.id) || (d.kind === 'endow' && endow)) { skipped++; continue; }
      if (d.kind === 'endow') endow = true;
      next[i] = d.id;
    }
    p.hrunes = next;
    return skipped;
  },

  // ---------- UI ----------
  entry(id) { const c = this._ent || (this._ent = {}); return c[id] || (c[id] = { id, qty: 1, refine: 0, cards: [] }); },
  entries() { return this.LIST.filter(d => this.owns(d.id)).map(d => this.entry(d.id)); },
  kindLabel(d) { return this.KINDS[d.kind]; },
  rowSum(id) { const d = this.def(id); return d ? `${this.kindLabel(d)} · ${d.short}` : ''; },
  slotName(i) { return i ? 'II' : 'I'; },
  // ส่วนข้อมูลเฉพาะรูน (อังกฤษ) ใส่ใต้ภาพใหญ่ในหน้ารายละเอียด
  infoSec(d) {
    const kv = (k, v, cls) => h('div', { class: 'kv' + (cls ? ' ' + cls : '') }, h('span', {}, k), h('b', {}, v));
    const rows = [kv('Type', `Hunt Rune · ${this.kindLabel(d)}`)];
    if (d.kind === 'slayer') rows.push(kv('Bonus', `+${Math.round(d.pct * 100)}% physical & magic`), kv('Target', d.arena ? 'Other players (Arena only)' : `${HR_RACE_EN[d.race]} race`));
    else if (d.kind === 'endow') {
      const row = ELEM_TABLE[d.elem] || {};
      rows.push(kv('Element', HR_ELEM_EN[d.elem]), kv('Applies to', 'Basic attacks + skills with no element'));
      for (const e of Object.keys(row)) rows.push(kv(`vs ${e[0].toUpperCase() + e.slice(1)}`, `×${row[e]}`, row[e] > 1 ? 'ok' : 'bad'));
    } else {
      rows.push(kv('Bonus', `+${Math.round(d.pct * 100)}%`, 'ok'));
      if (d.miss) rows.push(kv('Penalty', `${Math.round(d.miss * 100)}% vs normal monsters`, 'bad'));
      rows.push(kv('Condition', d.short));
    }
    rows.push(kv('Cap', `Hunt Rune bonus ≤ +${HR_CAP * 100}% per hit`));
    return h('div', { class: 'dsec hr-sec' }, h('div', { class: 'dsec-h' }, UI.ico('gem'), 'Hunt Rune'), ...rows);
  },
  slotBtns(id) {
    const s = this.slots(), busy = !this.canChange();
    return [0, 1].map(i => {
      const on = s[i] === id, lock = !this.unlocked(i);
      return h('button', { type: 'button', class: 'btn big' + (on ? '' : ' primary') + ' hr-sock', 'data-slot': i, disabled: lock || busy ? 'disabled' : false,
        onclick: () => { if (this.set(i, on ? null : id)) this.render(); } },
        lock ? `🔒 Slot ${this.slotName(i)} · Lv ${HR_UNLOCK[i]}` : on ? `Remove from ${this.slotName(i)}` : `Socket in ${this.slotName(i)}`);
    });
  },
  // แท็บ Runes ในกระเป๋า: หน้ารายละเอียด
  invDetail(e, back) {
    const d = this.def(e.id);
    return [back, ...UI.itemDetail(e, [...this.slotBtns(e.id), h('button', { type: 'button', class: 'btn big', 'data-open': 'w-hrunes' }, 'Hunt Runes…')],
      this.canChange() ? L('ใส่/ถอดได้ฟรีทุกที่ ยกเว้นระหว่างต่อสู้', 'Free to swap anywhere, except in combat') : this.busyMsg(),
      { noPrice: true, lead: [this.infoSec(d)] })];
  },
  // แท็บ Hunt Rune ในเตาของ Brokk: คืน { left, right, det }
  forgeTab(f, tabs, foot, back) {
    const p = G.player, narrow = UI.narrow();
    const list = this.LIST.filter(d => this.filter === 'all' || d.kind === this.filter);
    if (f.hsel && !this.def(f.hsel)) f.hsel = null;
    const cur = f.hsel || (narrow ? null : list[0] && list[0].id);
    const pills = h('div', { class: 'pills hr-filter' }, [['all', 'All'], ['slayer', 'Slayer'], ['endow', 'Endow'], ['cond', 'Conditional']].map(([k, l]) =>
      h('button', { type: 'button', class: 'pill' + (this.filter === k ? ' on' : ''), onclick: () => { this.filter = k; f.hsel = null; f.det = false; UI.renderForge(); } }, l)));
    const rows = list.map(d => {
      const own = this.owns(d.id), e = this.entry(d.id);
      const row = UI.itemRow(e, d.id === cur, () => { f.hsel = d.id; f.det = true; UI.renderForge(); },
        own ? h('span', { class: 'hr-owned' }, '✓ Owned') : h('span', { class: 'hr-price' + (p.zeny >= d.price ? '' : ' bad') }, `${U.fmt(d.price)}`));
      row.draggable = false; row.dataset.hr = d.id;
      const sum = row.querySelector('.isum'); if (sum) sum.textContent = this.rowSum(d.id);
      return row;
    });
    const left = [tabs, pills, h('div', { class: 'irows' }, rows),
      foot(L('ซื้อครั้งเดียวเก็บตลอดไป • ใส่/ถอดฟรี', 'Buy once, keep forever • socketing is free'))];
    let right;
    if (cur) {
      const d = this.def(cur), own = this.owns(cur), e = this.entry(cur);
      const acts = own ? [h('button', { type: 'button', class: 'btn big primary', 'data-open': 'w-hrunes' }, 'Socket…')]
        : [h('button', { type: 'button', class: 'btn big primary hr-buy', disabled: p.zeny < d.price ? 'disabled' : false, onclick: () => { if (this.buy(cur)) UI.renderForge(); } },
          ivIconEl('shop'), `Forge · ${U.fmt(d.price)} ${CUR}`)];
      right = [back, ...UI.itemDetail(e, acts, own ? L('มีแล้ว — ใส่ได้ที่ Status → Hunt Rune', 'Owned — socket it from Status → Hunt Rune')
        : L(`Brokk ตีรูนให้ ${U.fmt(d.price)} ${CUR} • ปลดช่อง I ที่ Base Lv ${HR_UNLOCK[0]}, ช่อง II ที่ Lv ${HR_UNLOCK[1]}`, `Brokk forges it for ${U.fmt(d.price)} ${CUR} • slot I unlocks at Base Lv ${HR_UNLOCK[0]}, slot II at Lv ${HR_UNLOCK[1]}`),
      { noPrice: true, lead: [this.infoSec(d)] })];
    } else right = UI.emptyState('gem', L('เลือกรูนทางซ้าย', 'Pick a rune'), L('Slayer = ตีเผ่านั้นแรงขึ้น • Endow = เปลี่ยนธาตุการโจมตี • Conditional = แรงขึ้นตามสถานการณ์', 'Slayer = bonus vs a race • Endow = change your attack element • Conditional = bonus in a situation'));
    return { left, right, det: f.det && !!cur };
  },
  // การ์ดในหน้าต่าง Status
  statusEntry() {
    const s = this.slots();
    return h('div', { class: 'hr-st' }, h('span', { class: 'hr-st-t' }, 'Hunt Rune'),
      ...[0, 1].map(i => {
        const d = this.def(s[i]), lock = !this.unlocked(i);
        return h('span', { class: 'hr-st-s' + (lock ? ' lock' : d ? '' : ' empty') }, d ? h('img', { src: itemIconUrl(d.id), alt: '' }) : null,
          lock ? `🔒 Lv ${HR_UNLOCK[i]}` : d ? d.name.replace(/ Rune$/, '') : L('ว่าง', 'Empty'));
      }),
      h('button', { type: 'button', class: 'btn small', 'data-open': 'w-hrunes' }, L('จัดการ', 'Manage')));
  },
  // หน้าต่าง #w-hrunes
  render() {
    const body = document.querySelector('#w-hrunes .win-body');
    if (!body || !G.player || !UI.isOpen('w-hrunes')) return;
    const p = G.player, s = this.slots(), busy = !this.canChange(), owned = this.entries();
    if (this.sel && !this.owns(this.sel)) this.sel = null;
    const wrap = h('div', { class: 'hr' });
    wrap.append(h('p', { class: 'hr-intro' }, L(`ตีแรงแบบมีเงื่อนไข (แบบ RO) — ช่อง I ปลดที่ Base Lv ${HR_UNLOCK[0]} • ช่อง II ที่ Lv ${HR_UNLOCK[1]} • ใส่/ถอดฟรีทุกที่ ยกเว้นระหว่างต่อสู้ • โบนัสรวมต่อครั้งไม่เกิน +${HR_CAP * 100}%`,
      `Conditional damage, RO-style — slot I unlocks at Base Lv ${HR_UNLOCK[0]} • slot II at Lv ${HR_UNLOCK[1]} • free to swap anywhere except in combat • total bonus capped at +${HR_CAP * 100}% per hit`)));
    if (busy) wrap.append(h('p', { class: 'hr-busy' }, '⚔ ', L(`กำลังต่อสู้ — เปลี่ยนได้ในอีก ${Math.ceil(this.combatLeft())} วิ`, `In combat — swap in ${Math.ceil(this.combatLeft())}s`)));
    const socks = h('div', { class: 'hr-socks' });
    for (let i = 0; i < 2; i++) {
      const d = this.def(s[i]), lock = !this.unlocked(i);
      socks.append(h('section', { class: 'hr-sock-card' + (lock ? ' lock' : d ? ' on' : ' empty'), 'data-slot': i },
        h('span', { class: 'hr-num' }, this.slotName(i)),
        lock ? h('span', { class: 'hr-stone lock', html: UI.icoSvg.lock }) : d ? h('img', { class: 'hr-stone', src: itemIconUrl(d.id), alt: '' }) : h('span', { class: 'hr-stone empty' }),
        h('div', { class: 'hr-sock-t' },
          h('b', {}, lock ? L(`ปลดที่ Base Lv ${HR_UNLOCK[i]}`, `Unlocks at Base Lv ${HR_UNLOCK[i]}`) : d ? d.name : L('ช่องว่าง', 'Empty socket')),
          h('small', {}, lock ? L(`ตอนนี้ Lv ${p.baseLv}`, `You are Lv ${p.baseLv}`) : d ? d.short : L('เลือกรูนด้านล่างแล้วกดใส่', 'Pick a rune below to socket it'))),
        d && !lock ? h('button', { type: 'button', class: 'btn small hr-rm', disabled: busy ? 'disabled' : false, onclick: () => { if (this.set(i, null)) this.render(); } }, L('ถอด', 'Remove')) : null));
    }
    wrap.append(socks);
    wrap.append(h('h4', { class: 'hr-sec-t' }, L(`รูนที่มี (${owned.length}/${this.LIST.length})`, `Your runes (${owned.length}/${this.LIST.length})`)));
    if (!owned.length) {
      wrap.append(UI.emptyState('gem', L('ยังไม่มี Hunt Rune', 'No Hunt Runes yet'), L('Brokk Forge-Bot ใน Neo Eldheim ตีรูนให้ (แท็บ Hunt Rune ในเตา) — ซื้อครั้งเดียวเก็บตลอดไป', 'Brokk Forge-Bot in Neo Eldheim forges them (Hunt Rune tab at his forge) — buy once, keep forever')));
    } else {
      const grid = h('div', { class: 'hr-grid' });
      for (const e of owned) {
        const d = this.def(e.id), at = s.indexOf(d.id);
        grid.append(h('button', { type: 'button', class: 'hr-tile' + (this.sel === d.id ? ' sel' : '') + (at >= 0 ? ' in' : ''), 'data-hr': d.id, onclick: () => { this.sel = this.sel === d.id ? null : d.id; this.render(); } },
          h('img', { src: itemIconUrl(d.id), alt: '' }), h('span', { class: 'hr-tile-t' }, h('b', {}, d.name.replace(/ Rune$/, '')), h('small', {}, d.short)),
          at >= 0 ? h('i', { class: 'hr-tag' }, this.slotName(at)) : null));
      }
      wrap.append(grid);
      if (this.sel) {
        const d = this.def(this.sel);
        wrap.append(h('div', { class: 'hr-det' }, h('div', { class: 'hr-det-h' }, h('img', { src: itemIconUrl(d.id), alt: '' }), h('div', {}, h('b', {}, d.name), h('small', {}, `Hunt Rune · ${this.kindLabel(d)}`))),
          h('p', { class: 'hr-det-d' }, d.desc), h('div', { class: 'hr-acts' }, this.slotBtns(d.id))));
      }
    }
    body.innerHTML = ''; body.append(wrap);
  },
  tick() {
    if (typeof G === 'undefined' || !G.started || !G.player || typeof UI === 'undefined' || !UI.isOpen('w-hrunes')) return;
    const left = Math.ceil(this.combatLeft());
    if (left !== this._left) { this._left = left; this.render(); }
  },
  // แถบเป้าหมาย: ธาตุ + เผ่า (ให้ผู้เล่นเลือกรูนได้)
  targetTag(t) {
    const d = t && t.def; if (!d) return '';
    return `${ELEM_THAI[d.element] || d.element || ''} · ${HR_RACE[d.race] || d.race || ''}`;
  },
};
HuntRunes.build();

// ไอคอนหินรูน + เอฟเฟกต์ในโลก (ห่อฟังก์ชันวาดเดิม)
(() => {
  const dis = drawIconShape;
  drawIconShape = function (g, spec, S) { return spec && spec.s === 'hrune' ? HuntRunes.drawIcon(g, spec, S) : dis(g, spec, S); }; // eslint-disable-line no-global-assign
  if (typeof ICONS !== 'undefined') {
    ICONS.hrune = '<path d="M7 3.2h10l2.6 3.4-.4 11.6-3 3H7.8l-3-3-.3-11.6z"/><path d="M12 6.5v11M8.6 9.6L12 6.5l3.4 3.1"/>';
    if (typeof WIN_ICONS !== 'undefined') WIN_ICONS['w-hrunes'] = 'hrune';
  }
  if (typeof document === 'undefined') return;
  const url = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='#000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>${ICONS.hrune}</svg>`)}")`;
  const st = document.createElement('style'); st.id = 'hr-icon-css';
  st.textContent = `body.visor #w-hrunes .win-title span::before{-webkit-mask:${url} center/contain no-repeat;mask:${url} center/contain no-repeat}`;
  document.head.append(st);
  const hook = () => {
    if (typeof R === 'undefined' || !R.drawFx || R.drawFx._hr) return;
    const d0 = R.drawFx; R.drawFx = (g, f, t) => (f.hrune ? HuntRunes.drawFx(g, f, t) : d0(g, f, t)); R.drawFx._hr = true;
  };
  hook(); window.addEventListener('load', hook);
  setInterval(() => HuntRunes.tick(), 400);
})();
