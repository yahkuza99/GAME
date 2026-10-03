'use strict';
// ============================================================
//  Loadouts + Build Code (Custom Play เฟส C) — ดู docs/DESIGN_CUSTOM_PLAY.md
//  • ตัวละครละ 3 ชุด (p.loadouts) แต่ละชุดเก็บ: Passive • Rune Paths • อุปกรณ์ (uid ของชิ้นที่ยังมีอยู่) • แถบลัด/แถบยา • Battle Script
//  • สลับคลิกเดียว ทุกที่ ยกเว้นระหว่างต่อสู้ (กติกาเดียวกับรูน: ตี/โดนตีภายใน 5 วิ — Runes.canChange)
//  • สวมของผ่าน equipItem/unequip ปกติ → ค่าสถานะคำนวณใหม่ ระดับตีบวก/ชิปติดไปกับชิ้นเดิม • ชิ้นที่ไม่มีแล้ว = ข้าม + บอกชัดเจน
//  • Passive สลับฟรีระหว่างชุดที่บันทึก แต่ต้องไม่เกินแต้มทั้งหมดของตัวละคร (Passive.total)
//  • Build Code: IV-BUILD:<base64url> = Class + รูน + Passive + Battle Script (ไม่บังคับ) + id อุปกรณ์ (แค่แสดง)
//    ไม่มี uid / ชื่อ / ข้อมูลระบุตัวตน • ตรวจเข้มแบบ whitelist ไม่ eval ไม่แตะ prototype
//  ข้อความในโค้ด (ก่อน base64):  1|<class>|<rune,rune>|<node,node>|<item×8 ตามช่อง EQUIP_SLOTS>|<ข้อความกฎ Battle Script>
//    มี Hunt Rune (js/huntrunes.js) = รุ่น 2:  2|<class>|<rune>|<node>|<item×8>|<hunt I,hunt II>|<script>  (ไม่มี Hunt Rune = ยังส่งรุ่น 1 → โค้ดเดิมใช้ได้ตลอด)
//  หน้าต่าง "Builds" (#w-builds) — CSS อยู่ที่ css/loadouts.css
// ============================================================

const LO_SLOTS = 3, LO_NAME_MAX = 16, LO_PREFIX = 'IV-BUILD:', LO_MAX_CODE = 3600, LO_MAX_TEXT = 2600;
const LO_RX = { hrune: /^hr_[a-z_]{1,24}$/, job: /^[a-z][a-z0-9_]{0,23}$/, rune: /^[a-z][a-z0-9_]{0,31}\.[a-z][a-z0-9_]{0,23}$/, node: /^[a-z0-9]{1,8}$/, item: /^[a-z][a-z0-9_]{0,39}$/ };

const Loadouts = {
  draft: '', lastCode: '', preview: null, withScript: true, _busy: null, _left: -1, _defer: false,

  own(o, k) { return !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k); },
  st(p = G.player) {
    if (!p.loadouts || typeof p.loadouts !== 'object' || !Array.isArray(p.loadouts.slots)) p.loadouts = this.sanitize(p.loadouts);
    return p.loadouts;
  },
  defName(i) { return `Build ${i + 1}`; },
  cleanName(s, i) {
    const t = typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, LO_NAME_MAX) : '';
    return t || this.defName(i);
  },
  // สาย Class (ตัวเอง → Class แม่) และสกิลทั้งสาย
  line(job) {
    const out = [];
    for (let j = job, n = 0; j && this.own(JOBS, j) && n < 6; j = JOBS[j].parent, n++) out.push(j);
    return out;
  },
  lineSkills(job) { const s = new Set(); for (const j of this.line(job)) for (const id of JOBS[j].skills || []) s.add(id); return s; },
  // Passive: ไม่ซ้ำ มีจริง ไม่ใช่แกนกลาง และต่อถึงแกนกลางครบทุกจุด
  passivesOk(list) {
    if (!Array.isArray(list)) return false;
    const set = new Set();
    for (const id of list) { if (!this.own(PTREE, id) || id === 'core' || set.has(id)) return false; set.add(id); }
    const seen = new Set(['core']), st = ['core'];
    while (st.length) for (const l of PTREE[st.pop()].links) if (set.has(l) && !seen.has(l)) { seen.add(l); st.push(l); }
    return seen.size - 1 === set.size;
  },
  cleanRunes(o) {
    const out = {};
    if (!o || typeof o !== 'object' || Array.isArray(o)) return out;
    for (const k of Object.keys(o)) {
      const rid = o[k];
      if (!this.own(SKILLS, k) || typeof rid !== 'string' || !this.own(Runes.BY_ID, rid) || Runes.BY_ID[rid].skill !== k) continue;
      out[k] = rid;
    }
    return out;
  },

  // ---------- เซฟ: ตรวจ/ทำความสะอาด (เซฟเก่าไม่มี = 3 ช่องว่าง) ----------
  sanitize(raw) {
    const out = { cur: -1, slots: [] };
    const src = raw && typeof raw === 'object' && !Array.isArray(raw) && Array.isArray(raw.slots) ? raw.slots : [];
    for (let i = 0; i < LO_SLOTS; i++) out.slots.push(this.cleanSlot(src[i], i));
    const cur = raw && raw.cur;
    if (Number.isInteger(cur) && cur >= 0 && cur < LO_SLOTS && out.slots[cur]) out.cur = cur;
    return out;
  },
  cleanSlot(o, i) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
    const s = { name: this.cleanName(o.name, i), at: Number.isFinite(+o.at) ? Math.max(0, Math.floor(+o.at)) : 0, job: this.own(JOBS, o.job) ? o.job : null };
    s.passives = [];
    if (Array.isArray(o.passives)) for (const id of o.passives.slice(0, 400)) if (this.own(PTREE, id) && id !== 'core' && !s.passives.includes(id)) s.passives.push(id);
    s.runes = this.cleanRunes(o.runes);
    s.equip = {};
    const eq = o.equip && typeof o.equip === 'object' ? o.equip : {};
    for (const slot of EQUIP_SLOTS) {
      const e = this.own(eq, slot) ? eq[slot] : null, uid = e && Math.floor(+e.uid);
      s.equip[slot] = e && typeof e === 'object' && this.own(ITEMS, e.id) && isEquipType(ITEMS[e.id]) && uid > 0 && Number.isSafeInteger(uid) ? { uid, id: e.id } : null;
    }
    const bar = (a, n, t, ok) => { const r = []; for (let k = 0; k < n; k++) { const x = Array.isArray(a) ? a[k] : null; r.push(x && typeof x === 'object' && x.t === t && ok(x.id) ? { t, id: x.id } : null); } return r; };
    s.hotbar = bar(o.hotbar, 8, 'skill', id => this.own(SKILLS, id));
    s.potbar = bar(o.potbar, 4, 'item', id => this.own(ITEMS, id));
    const b = o.bot && typeof o.bot === 'object' ? o.bot : {};
    const text = typeof b.text === 'string' && typeof BotScript !== 'undefined' && !BotScript.parseText(b.text).err ? b.text : '1:';
    s.bot = { adv: b.adv === true, text, preset: Number.isInteger(b.preset) && b.preset >= 0 && b.preset < 3 ? b.preset : -1 };
    s.hrunes = Array.isArray(o.hrunes) && typeof HuntRunes !== 'undefined' ? HuntRunes.cleanSlots(o.hrunes, null) : null; // Hunt Rune: ชุดเก่าไม่มี = ไม่แตะของที่ใส่อยู่
    return s;
  },

  // ---------- สภาพตอนนี้ → ชุด ----------
  snapshot(p = G.player) {
    const equip = {};
    for (const slot of EQUIP_SLOTS) {
      const e = p.equip[slot];
      if (e && e.uid == null) e.uid = G.uid++; // ของจากเซฟเก่ามาก ๆ ที่ยังไม่มี uid
      equip[slot] = e ? { uid: e.uid, id: e.id } : null;
    }
    let bot = { adv: false, text: '1:', preset: -1 };
    if (typeof Bot !== 'undefined' && typeof BotScript !== 'undefined') {
      const c = Bot.cfg(); BotScript.normalize(c);
      const text = BotScript.toText(c.script);
      bot = { adv: c.adv === true, text, preset: c.script.length ? c.presets.indexOf(text) : -1 };
    }
    return {
      job: p.job, passives: Passive.list(p).slice(), runes: this.cleanRunes(p.runes), equip,
      hotbar: p.hotbar.slice(0, 8).map(x => (x && x.t === 'skill' && p.skills[x.id] ? { t: 'skill', id: x.id } : null)), // สกิลที่ยังไม่เรียน = ช่องว่าง (แบบเดียวกับแถบลัด)
      potbar: p.potbar.slice(0, 4).map(x => (x && x.t === 'item' ? { t: 'item', id: x.id } : null)),
      bot, hrunes: typeof HuntRunes !== 'undefined' ? HuntRunes.slots(p).slice() : null,
    };
  },
  // เทียบชุดกับสภาพตอนนี้ (ไม่สนชื่อ/เวลา และลำดับการเปิด Passive)
  sig(s) {
    const r = Object.keys(s.runes).sort().map(k => s.runes[k]);
    return JSON.stringify([s.passives.slice().sort(), r, EQUIP_SLOTS.map(k => (s.equip[k] ? s.equip[k].uid : 0)), s.hotbar.map(x => x && x.id), s.potbar.map(x => x && x.id), s.bot.adv, s.bot.text, s.hrunes || null]);
  },
  matches(i) { const s = this.st().slots[i]; if (!s) return false; const n = this.snapshot(); if (!s.hrunes) n.hrunes = null; return this.sig(s) === this.sig(n); },

  save(i, name) {
    const L0 = this.st(), old = L0.slots[i];
    if (!(i >= 0 && i < LO_SLOTS)) return false;
    const s = this.snapshot();
    s.name = this.cleanName(name != null ? name : old && old.name, i); s.at = Date.now();
    L0.slots[i] = this.cleanSlot(s, i); L0.cur = i;
    saveGame(); UI.dirty();
    return true;
  },
  rename(i, name) { const s = this.st().slots[i]; if (!s) return; s.name = this.cleanName(name, i); saveGame(); },
  clear(i) { const L0 = this.st(); L0.slots[i] = null; if (L0.cur === i) L0.cur = -1; saveGame(); UI.dirty(); },

  // ---------- สลับชุด ----------
  combatLeft() { return typeof Runes !== 'undefined' ? Runes.combatLeft() : 0; },
  canSwitch() { return this.combatLeft() <= 0; },
  busyMsg() { const n = Math.ceil(this.combatLeft()); return L(`สลับ Build ระหว่างต่อสู้ไม่ได้ (รออีก ${n} วิ)`, `Can't switch builds in combat (${n}s).`); },
  // หา entry ของ uid นี้: 'inv' | 'equip' | 'storage' | null
  locate(ref) {
    const p = G.player, hit = e => e && e.uid === ref.uid && e.id === ref.id;
    for (const s of EQUIP_SLOTS) if (hit(p.equip[s])) return { where: 'equip', slot: s, e: p.equip[s] };
    let e = p.inventory.find(hit); if (e) return { where: 'inv', e };
    e = (p.storage || []).find(hit); if (e) return { where: 'storage', e };
    return null;
  },
  applyPassives(list) {
    const p = G.player;
    if (!this.passivesOk(list)) return L('ข้าม Passive: ข้อมูลจุดไม่ต่อถึงแกนกลาง', 'Passives skipped: nodes are not connected to the Core');
    const tot = Passive.total(p);
    if (list.length > tot) return L(`ข้าม Passive: ต้องใช้ ${list.length} แต้ม แต่มี ${tot} แต้ม`, `Passives skipped: needs ${list.length} points, you have ${tot}`);
    p.passives = list.slice();
    return '';
  },
  // ใส่รูนทั้งชุด (onlyUnlocked = ใส่เฉพาะสกิลที่ถึง Lv ปลดรูน — ใช้ตอนนำเข้าโค้ด)
  applyRunes(map, onlyUnlocked) {
    const p = G.player, next = {}, before = this.cleanRunes(p.runes);
    let skipped = 0;
    for (const k of Object.keys(map)) {
      if (onlyUnlocked && (p.skills[k] || 0) < Runes.UNLOCK) { skipped++; continue; }
      next[k] = map[k];
    }
    for (const k of new Set([...Object.keys(before), ...Object.keys(next)])) if (before[k] !== next[k]) { if (p.buffs[k]) delete p.buffs[k]; Runes.clearSkill(k); }
    p.runes = next;
    return skipped;
  },
  applyEquip(eq) {
    const p = G.player, missing = [], failed = [], plan = [];
    for (const slot of EQUIP_SLOTS) {
      const t = eq[slot], cur = p.equip[slot];
      if (!t) { if (cur) unequip(slot, true); continue; }
      if (cur && cur.uid === t.uid && cur.id === t.id) continue;
      const at = this.locate(t);
      if (!at || at.where === 'storage') { missing.push({ slot, id: t.id, where: at ? 'storage' : 'gone' }); continue; }
      if (cur) unequip(slot, true);
      plan.push([slot, t]);
    }
    for (const [slot, t] of plan) {
      const at = this.locate(t); if (!at) { missing.push({ slot, id: t.id, where: 'gone' }); continue; }
      if (at.where === 'equip') unequip(at.slot, true);
      const it = ITEMS[t.id];
      if (!canEquip(it, false)) { failed.push({ slot, id: t.id }); continue; }
      equipItem(at.e, true);
      // เครื่องประดับ: equipSlotFor ใส่ช่องว่างแรก → ถ้าชุดเก็บไว้ช่อง 2 แต่ช่อง 1 ว่าง ให้ย้ายกลับช่องเดิม
      if (slot === 'acc2' && p.equip.acc === at.e && !p.equip.acc2) { p.equip.acc2 = at.e; p.equip.acc = null; }
      if (p.equip[slot] !== at.e) failed.push({ slot, id: t.id });
    }
    return { missing, failed };
  },
  applyBars(s) {
    const p = G.player;
    p.hotbar = s.hotbar.map(x => (x && p.skills[x.id] ? { t: 'skill', id: x.id } : null));
    p.potbar = s.potbar.map(x => (x ? { t: 'item', id: x.id } : null));
  },
  applyBot(b) {
    if (typeof Bot === 'undefined' || typeof BotScript === 'undefined') return;
    const c = Bot.cfg(); BotScript.normalize(c);
    const pre = b.preset >= 0 ? c.presets[b.preset] : null;
    const r = BotScript.parseText(pre || b.text);
    BotScript.setRules(c, r.rules || []); c.adv = b.adv; BotScript.restIdx = -1;
  },
  // คืน { ok, err?, missing[], failed[], passErr }
  apply(i) {
    const p = G.player, L0 = this.st(), s = L0.slots[i];
    if (!s) return { ok: false, err: L('ชุดนี้ยังว่าง', 'This slot is empty') };
    if (p.dead) return { ok: false, err: L('ฟื้นคืนชีพก่อนจึงจะสลับ Build ได้', 'Revive first to switch builds') };
    if (!this.canSwitch()) return { ok: false, err: this.busyMsg() };
    const passErr = this.applyPassives(s.passives);
    const eq = this.applyEquip(s.equip);
    this.applyRunes(s.runes, false);
    this.applyBars(s);
    this.applyBot(s.bot);
    const hrSkip = s.hrunes && typeof HuntRunes !== 'undefined' ? HuntRunes.applyList(s.hrunes) : 0;
    L0.cur = i;
    recalc(); saveGame(); UI.dirty();
    return Object.assign({ ok: true, passErr, hrSkip }, eq);
  },
  // ข้อความสรุปหลังสลับ (บอกชิ้นที่ข้ามชัดเจน)
  report(s, r) {
    if (!r.ok) { UI.msg(r.err, 'err'); return; }
    UI.msg(L(`สลับเป็น ${s.name} แล้ว`, `Switched to ${s.name}`), 'sys');
    if (r.missing.length) {
      const names = r.missing.map(m => `${ITEMS[m.id].name}${m.where === 'storage' ? L(' (อยู่ในคลัง)', ' (in Storage)') : ''}`).join(', ');
      UI.msg(L(`ข้ามอุปกรณ์ ${r.missing.length} ชิ้นที่ไม่อยู่ในกระเป๋าแล้ว: ${names}`, `Skipped ${r.missing.length} missing item(s): ${names}`), 'err');
    }
    if (r.failed.length) UI.msg(L(`สวมไม่ได้ (Class/เลเวล): ${r.failed.map(m => ITEMS[m.id].name).join(', ')}`, `Can't equip (Class/level): ${r.failed.map(m => ITEMS[m.id].name).join(', ')}`), 'err');
    if (r.passErr) UI.msg(r.passErr, 'err');
    if (r.hrSkip) UI.msg(L(`ข้าม Hunt Rune ${r.hrSkip} อัน (ยังไม่มี / ช่องยังไม่ปลด)`, `Skipped ${r.hrSkip} Hunt Rune(s) (not owned / slot locked)`), 'err');
    if (typeof Sound !== 'undefined') Sound.play('equip');
    if (typeof addFloater === 'function') addFloater(G.player.x, G.player.y - 1.8, `⚙ ${s.name}`, '#ffe08a', true);
  },
  switchTo(i) { const s = this.st().slots[i], r = this.apply(i); this.report(s || { name: '' }, r); this.render(); return r; },

  // ---------- Build Code ----------
  b64e(s) { return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
  b64d(b) {
    if (!/^[A-Za-z0-9_-]+$/.test(b) || b.length % 4 === 1) return null;
    try { return atob(b.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - b.length % 4) % 4)); } catch (e) { return null; }
  },
  // ชุดข้อมูล build (ไม่มี uid/ชื่อ) จากสภาพตอนนี้ หรือจากช่องที่บันทึก
  buildFrom(src, withScript) {
    const p = G.player, s = src || this.snapshot();
    const job = s.job || p.job, ok = this.lineSkills(job);
    const runes = Object.keys(s.runes).filter(k => ok.has(k) && (src || (p.skills[k] || 0) >= Runes.UNLOCK)).sort().map(k => s.runes[k]);
    let text = s.bot && s.bot.adv ? s.bot.text : ''; // Battle Script ใส่เฉพาะตอนเปิดโหมดขั้นสูงอยู่
    if (text && src && s.bot.preset >= 0 && typeof Bot !== 'undefined') { const pre = Bot.cfg().presets; if (Array.isArray(pre) && typeof pre[s.bot.preset] === 'string') text = pre[s.bot.preset]; }
    const script = withScript && text && text !== '1:' ? text : '';
    const hr = (s.hrunes || [null, null]).map(x => x || '');
    return { job, runes, passives: s.passives.slice(), equip: EQUIP_SLOTS.map(k => (s.equip[k] ? s.equip[k].id : '')), hrunes: hr, script };
  },
  encode(b) {
    const hr = (b.hrunes || []).some(Boolean); // ไม่มี Hunt Rune = รุ่น 1 เดิมทุกตัวอักษร
    return LO_PREFIX + this.b64e([hr ? '2' : '1', b.job, b.runes.join(','), b.passives.join(','), b.equip.join(','), ...(hr ? [b.hrunes.map(x => x || '').join(',')] : []), b.script || ''].join('|'));
  },
  exportCode(src, withScript = true) { return this.encode(this.buildFrom(src, withScript)); },
  // ตรวจโค้ดแบบ whitelist ทุกช่อง: ผิดแม้แต่ตัวเดียว = ปฏิเสธทั้งโค้ด (ยกเว้นกฎ Battle Script ที่ใช้สกิลที่ไม่รู้จัก = ข้ามกฎนั้น)
  decode(str) {
    const bad = (why) => ({ err: L('Build Code ไม่ถูกต้อง', 'Invalid Build Code') + (why ? ` (${why})` : '') });
    if (typeof str !== 'string') return bad();
    str = str.trim();
    if (!str || str.length > LO_MAX_CODE || str.indexOf(LO_PREFIX) !== 0) return bad(L('ต้องขึ้นต้นด้วย IV-BUILD:', 'must start with IV-BUILD:'));
    const txt = this.b64d(str.slice(LO_PREFIX.length));
    if (txt == null || txt.length > LO_MAX_TEXT || !/^[\x20-\x7e]*$/.test(txt)) return bad();
    const f = txt.split('|');
    if (!((f[0] === '1' && f.length === 6) || (f[0] === '2' && f.length === 7))) return bad(L('รุ่นโค้ดไม่รู้จัก', 'unknown version'));
    const hs = f[0] === '2' ? f.splice(5, 1)[0] : '';
    const [, job, rs, ps, es, sc] = f;
    // Hunt Rune (รุ่น 2): ช่อง I,II — id ที่มีจริง ไม่ซ้ำ Endow ไม่เกิน 1
    const hrunes = [null, null];
    if (hs) {
      const hl = hs.split(','), HR = typeof HuntRunes !== 'undefined' ? HuntRunes : null;
      if (!HR || hl.length > 2) return bad('Hunt Rune');
      let endow = 0;
      for (let k = 0; k < hl.length; k++) {
        const id = hl[k]; if (!id) continue;
        if (!LO_RX.hrune.test(id) || !this.own(HR.DEFS, id) || hrunes.includes(id)) return bad('Hunt Rune');
        if (HR.DEFS[id].kind === 'endow' && ++endow > 1) return bad('Hunt Rune');
        hrunes[k] = id;
      }
    }
    if (!LO_RX.job.test(job) || !this.own(JOBS, job)) return bad('Class');
    const skills = this.lineSkills(job), runes = [], rskill = new Set();
    const rl = rs ? rs.split(',') : [];
    if (rl.length > 64) return bad('Rune');
    for (const rid of rl) {
      if (!LO_RX.rune.test(rid) || !this.own(Runes.BY_ID, rid)) return bad('Rune');
      const sk = Runes.BY_ID[rid].skill;
      if (!skills.has(sk) || rskill.has(sk)) return bad('Rune');
      rskill.add(sk); runes.push(rid);
    }
    const pl = ps ? ps.split(',') : [];
    if (pl.length > Object.keys(PTREE).length - 1) return bad('Passive');
    for (const id of pl) if (!LO_RX.node.test(id)) return bad('Passive');
    if (!this.passivesOk(pl)) return bad('Passive');
    const el = es.split(',');
    if (el.length !== EQUIP_SLOTS.length) return bad(L('อุปกรณ์', 'equipment'));
    for (let k = 0; k < el.length; k++) {
      const id = el[k]; if (!id) continue;
      const it = LO_RX.item.test(id) && this.own(ITEMS, id) ? ITEMS[id] : null, want = EQUIP_SLOTS[k] === 'acc2' ? 'acc' : EQUIP_SLOTS[k];
      if (!it || !isEquipType(it) || it.slot !== want) return bad(L('อุปกรณ์', 'equipment'));
    }
    let script = null;
    if (sc) {
      if (typeof BotScript === 'undefined') return bad('Battle Script');
      const r = BotScript.parseText(sc);
      if (r.err) return bad('Battle Script');
      script = { text: BotScript.toText(r.rules), rules: r.rules, dropped: r.dropped };
    }
    return { build: { job, runes, passives: pl, equip: el, hrunes, script } };
  },
  // ใช้ได้แค่ไหนกับตัวละครนี้: Class ต้องตรง (หรือเป็น Class แม่ของเรา) ไม่งั้นดูอย่างเดียว
  check(b) {
    const p = G.player, classOk = this.line(p.job).includes(b.job), tot = Passive.total(p);
    const runeOk = b.runes.filter(rid => (p.skills[Runes.BY_ID[rid].skill] || 0) >= Runes.UNLOCK).length;
    const hl = (b.hrunes || []).filter(Boolean), hrOk = typeof HuntRunes !== 'undefined' ? hl.filter(id => HuntRunes.owns(id)).length : 0;
    return { classOk, passOk: classOk && b.passives.length <= tot, passNeed: b.passives.length, passHave: tot, runeOk: classOk ? runeOk : 0, runeAll: b.runes.length, scriptOk: classOk && !!b.script,
      hrOk: classOk ? hrOk : 0, hrAll: hl.length };
  },
  // parts = { runes, passives, script } — คืน { ok, err?, done[], skipped }
  applyBuild(b, parts) {
    const c = this.check(b), done = [];
    if (!c.classOk) return { ok: false, err: L(`Build นี้เป็นของ Class ${JOBS[b.job].name} — ดูได้อย่างเดียว`, `This build is for ${JOBS[b.job].name} — view only`) };
    if (G.player.dead) return { ok: false, err: L('ฟื้นคืนชีพก่อน', 'Revive first') };
    if (!this.canSwitch()) return { ok: false, err: this.busyMsg() };
    let skipped = 0;
    if (parts.passives) {
      if (!c.passOk) return { ok: false, err: L(`Passive ต้องใช้ ${c.passNeed} แต้ม แต่มี ${c.passHave} แต้ม`, `Passives need ${c.passNeed} points, you have ${c.passHave}`) };
      const e = this.applyPassives(b.passives); if (e) return { ok: false, err: e };
      done.push('passives');
    }
    if (parts.runes) {
      const map = {}; for (const rid of b.runes) map[Runes.BY_ID[rid].skill] = rid;
      skipped = this.applyRunes(map, true); done.push('runes');
    }
    if (parts.script && b.script) {
      const cf = Bot.cfg(); BotScript.normalize(cf); BotScript.setRules(cf, b.script.rules); cf.adv = true; BotScript.restIdx = -1; done.push('script');
    }
    let hrSkipped = 0;
    if (parts.hrunes && c.hrAll && typeof HuntRunes !== 'undefined') { hrSkipped = HuntRunes.applyList(b.hrunes); done.push('hrunes'); } // ยังไม่มี/ช่องยังล็อก = ข้าม
    if (!done.length) return { ok: false, err: L('ยังไม่ได้เลือกส่วนที่จะใช้', 'Nothing selected to apply') };
    this.st().cur = -1;
    recalc(); saveGame(); UI.dirty();
    return { ok: true, done, skipped, hrSkipped };
  },

  // ---------- หน้าต่าง Builds ----------
  timeAgo(t) {
    if (!t) return '';
    const s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return L('เมื่อสักครู่', 'just now');
    if (s < 3600) return L(`${Math.floor(s / 60)} นาทีก่อน`, `${Math.floor(s / 60)}m ago`);
    if (s < 86400) return L(`${Math.floor(s / 3600)} ชม.ก่อน`, `${Math.floor(s / 3600)}h ago`);
    return L(`${Math.floor(s / 86400)} วันก่อน`, `${Math.floor(s / 86400)}d ago`);
  },
  botLabel(b) {
    if (!b.adv) return L('ค่าตั้งแบบง่าย', 'Simple settings');
    if (b.preset >= 0) return L(`ชุดสคริปต์ ${b.preset + 1}`, `Script slot ${b.preset + 1}`);
    const n = typeof BotScript !== 'undefined' ? (BotScript.parseText(b.text).rules || []).length : 0;
    return L(`${n} กฎ`, `${n} rules`);
  },
  chip(label, val, cls) { return h('span', { class: 'lo-chip' + (cls ? ' ' + cls : '') }, h('i', {}, label), h('b', {}, val)); },
  slotCard(i) {
    const L0 = this.st(), s = L0.slots[i], busy = !this.canSwitch(), on = L0.cur === i && !!s, same = s && this.matches(i);
    const card = h('section', { class: 'lo-card' + (s ? '' : ' empty') + (on ? ' on' : ''), 'data-slot': i });
    const name = s ? h('input', { class: 'lo-name', type: 'text', value: s.name, maxlength: LO_NAME_MAX, 'aria-label': L('ชื่อ Build', 'Build name'),
      onchange: e => { this.rename(i, e.target.value); e.target.value = this.st().slots[i].name; }, onblur: () => this.flush() })
      : h('span', { class: 'lo-name empty' }, this.defName(i));
    card.append(h('header', { class: 'lo-head' }, h('span', { class: 'lo-num' }, String(i + 1)), name,
      s && (same || on) ? h('span', { class: 'lo-badge' + (same ? ' ok' : ' edit') }, same ? (on ? L('ใช้อยู่', 'Active') : L('ตรงกับตอนนี้', 'Matches')) : L('แก้ไขหลังบันทึก', 'Edited since save')) : null));
    if (!s) {
      card.append(h('p', { class: 'lo-empty' }, L('ว่าง — กด "บันทึก" เพื่อเก็บ Passive, Rune, อุปกรณ์, แถบลัด และ Battle Script ตอนนี้', 'Empty — press "Save" to store your current passives, runes, gear, hotbars and Battle Script')));
    } else {
      const eqN = EQUIP_SLOTS.filter(k => s.equip[k]).length, miss = EQUIP_SLOTS.filter(k => s.equip[k] && (!this.locate(s.equip[k]) || this.locate(s.equip[k]).where === 'storage'));
      const ks = s.passives.filter(id => PTREE[id].ks).map(id => PTREE[id].name);
      card.append(h('div', { class: 'lo-chips' },
        this.chip('Class', s.job ? JOBS[s.job].name : '—', s.job && s.job !== G.player.job ? 'warn' : ''),
        this.chip('Passive', `${s.passives.length}${ks.length ? ' • ' + ks.join(', ') : ''}`),
        this.chip('Rune', String(Object.keys(s.runes).length)),
        s.hrunes ? this.chip('Hunt', String(s.hrunes.filter(Boolean).length)) : null,
        this.chip(L('อุปกรณ์', 'Gear'), `${eqN}/${EQUIP_SLOTS.length}`, miss.length ? 'warn' : ''),
        this.chip('AUTO', this.botLabel(s.bot))));
      if (miss.length) card.append(h('p', { class: 'lo-warn' }, '⚠ ', L('ไม่มีในกระเป๋าแล้ว (จะข้าม): ', 'Missing (will be skipped): '),
        miss.map(k => ITEMS[s.equip[k].id].name + (this.locate(s.equip[k]) ? L(' — อยู่ในคลัง', ' — in Storage') : '')).join(', ')));
      if (s.passives.length > Passive.total(G.player)) card.append(h('p', { class: 'lo-warn' }, '⚠ ', L(`Passive ใช้ ${s.passives.length} แต้ม มากกว่าที่มี (${Passive.total(G.player)})`, `Passives use ${s.passives.length} points, more than you have (${Passive.total(G.player)})`)));
      card.append(h('p', { class: 'lo-meta' }, L(`บันทึก ${this.timeAgo(s.at)}`, `Saved ${this.timeAgo(s.at)}`)));
    }
    const acts = h('div', { class: 'lo-acts' });
    if (s) acts.append(h('button', { type: 'button', class: 'btn primary lo-go', disabled: busy || (on && same) ? 'disabled' : false, onclick: () => this.switchTo(i) },
      on && same ? L('✓ ใช้อยู่', '✓ Active') : L('สลับไปชุดนี้', 'Switch')));
    acts.append(h('button', { type: 'button', class: 'btn lo-save', onclick: async () => {
      if (s && !same && typeof UI.confirm === 'function' && !(await UI.confirm(L(`บันทึกสภาพตอนนี้ทับ "${s.name}"?`, `Overwrite "${s.name}" with your current setup?`)))) return;
      this.save(i); UI.msg(L(`บันทึก ${this.st().slots[i].name} แล้ว`, `Saved ${this.st().slots[i].name}`), 'info'); this.render();
    } }, s ? L('บันทึกทับ', 'Overwrite') : L('บันทึก', 'Save')));
    if (s) acts.append(
      h('button', { type: 'button', class: 'btn small lo-copy', onclick: () => this.copy(this.exportCode(s, this.withScript)) }, L('คัดลอกโค้ด', 'Copy code')),
      h('button', { type: 'button', class: 'btn small danger lo-del', 'aria-label': L('ลบชุดนี้', 'Delete slot'), onclick: async () => {
        if (typeof UI.confirm === 'function' && !(await UI.confirm(L(`ลบ "${s.name}"? (ไม่กระทบของในกระเป๋า)`, `Delete "${s.name}"? (your items are not affected)`)))) return;
        this.clear(i); this.render();
      } }, L('ลบ', 'Delete')));
    card.append(acts);
    return card;
  },
  copy(code) {
    this.lastCode = code;
    try { navigator.clipboard.writeText(code).then(() => UI.msg(L('คัดลอก Build Code แล้ว ส่งให้เพื่อนได้เลย', 'Build Code copied — share it with friends'), 'info'), () => {}); } catch (e) { /* ไม่มีคลิปบอร์ด: คัดลอกจากช่องเอง */ }
    this.render();
  },
  previewCard() {
    const pv = this.preview; if (!pv) return null;
    if (pv.err) return h('p', { class: 'lo-warn lo-pv-err' }, '⚠ ', pv.err);
    const b = pv.build, c = this.check(b), p = G.player;
    const box = h('div', { class: 'lo-pv' + (c.classOk ? '' : ' ro') });
    box.append(h('div', { class: 'lo-pv-head' }, h('b', {}, `Class: ${JOBS[b.job].name}`),
      c.classOk ? h('span', { class: 'lo-badge ok' }, L('Class ตรงกัน', 'Class matches')) : h('span', { class: 'lo-badge ro' }, L('ดูอย่างเดียว (คนละ Class)', 'View only (different Class)'))));
    // รูน
    const rl = h('ul', { class: 'lo-pv-list' });
    for (const rid of b.runes) {
      const r = Runes.BY_ID[rid], lvOk = (p.skills[r.skill] || 0) >= Runes.UNLOCK;
      rl.append(h('li', { class: c.classOk && !lvOk ? 'dim' : '', title: Runes.shortOf(r) }, `${SKILLS[r.skill].name} → `, h('b', {}, `${r.glyph || 'ᚱ'} ${r.name}`),
        c.classOk && !lvOk ? h('small', {}, L(` (ต้อง ${SKILLS[r.skill].name} Lv ${Runes.UNLOCK})`, ` (needs Lv ${Runes.UNLOCK})`)) : null));
    }
    if (!b.runes.length) rl.append(h('li', { class: 'dim' }, L('ไม่ใส่รูน', 'No runes')));
    // Passive: จุดเด่น + ผลรวม
    const bonus = {}; for (const id of b.passives) for (const k in PTREE[id].b) bonus[k] = (bonus[k] || 0) + PTREE[id].b[k];
    const big = b.passives.filter(id => PTREE[id].kind !== 'small').map(id => PTREE[id].name);
    const sum = Object.keys(bonus).filter(k => bonus[k] && PSTAT[k]).map(k => PSTAT_FMT(k, Math.round(bonus[k] * 10) / 10));
    const eq = b.equip.map((id, k) => id ? `${SLOT_THAI[EQUIP_SLOTS[k]]}: ${ITEMS[id].name}` : null).filter(Boolean);
    const hl = (b.hrunes || []).filter(Boolean), HR = typeof HuntRunes !== 'undefined' ? HuntRunes : null;
    box.append(
      h('div', { class: 'lo-pv-sec' }, h('h5', {}, `ᚱ Rune Paths (${b.runes.length})`), rl),
      hl.length && HR ? h('div', { class: 'lo-pv-sec' }, h('h5', {}, `Hunt Rune (${hl.length})`), h('ul', { class: 'lo-pv-list' }, hl.map(id => h('li', { class: HR.owns(id) ? '' : 'dim' }, h('b', {}, HR.DEFS[id].name),
        HR.owns(id) ? null : h('small', {}, L(' (ยังไม่มี — Brokk ตีให้)', ' (not owned — Brokk forges it)')))))) : null,
      h('div', { class: 'lo-pv-sec' }, h('h5', {}, L(`Passive (${b.passives.length} แต้ม • Base Lv ${b.passives.length + 1}+)`, `Passive (${b.passives.length} pts • Base Lv ${b.passives.length + 1}+)`)),
        big.length ? h('p', { class: 'lo-pv-big' }, big.join(' • ')) : null, h('p', { class: 'lo-pv-sum' }, sum.join(', ') || '—')),
      h('div', { class: 'lo-pv-sec' }, h('h5', {}, L('อุปกรณ์ (ข้อมูลเท่านั้น)', 'Equipment (info only)')), h('p', { class: 'lo-pv-sum' }, eq.join(' • ') || '—')),
      h('div', { class: 'lo-pv-sec' }, h('h5', {}, 'Battle Script'), h('p', { class: 'lo-pv-sum' },
        b.script ? L(`${b.script.rules.length} กฎ${b.script.dropped ? ` (ข้าม ${b.script.dropped} กฎที่ไม่รู้จัก)` : ''}`, `${b.script.rules.length} rules${b.script.dropped ? ` (${b.script.dropped} unknown skipped)` : ''}`) : L('ไม่มี', 'None'))));
    if (!c.classOk) { box.append(h('p', { class: 'hint' }, L(`Build นี้เป็นของ Class ${JOBS[b.job].name} — ดูเป็นไอเดียได้ แต่ใช้กับตัวละคร ${JOBS[p.job].name} ไม่ได้`, `This build is for ${JOBS[b.job].name} — browse it for ideas, but it can't be applied to your ${JOBS[p.job].name}`))); return box; }
    const sel = pv.sel || (pv.sel = { runes: c.runeOk > 0, passives: c.passOk, script: c.scriptOk, hrunes: c.hrOk > 0 });
    const opt = (k, label, can, why) => h('label', { class: 'lo-opt' + (can ? '' : ' off') },
      h('input', { type: 'checkbox', checked: can && sel[k] ? 'checked' : false, disabled: can ? false : 'disabled', onchange: e => { sel[k] = e.target.checked; } }), ' ', label, why ? h('small', {}, ' — ' + why) : null);
    box.append(h('div', { class: 'lo-opts' },
      opt('runes', L(`Rune Paths (${c.runeOk}/${c.runeAll})`, `Rune Paths (${c.runeOk}/${c.runeAll})`), c.runeOk > 0, c.runeAll && c.runeOk < c.runeAll ? L('บางสกิลยังไม่ถึง Lv ปลดรูน', 'some skills are below the rune level') : !c.runeAll ? L('ไม่มีรูน', 'none') : ''),
      opt('passives', 'Passive', c.passOk, c.passOk ? L('ฟรี (แทนที่ของเดิม)', 'free (replaces current)') : L(`ต้องใช้ ${c.passNeed} แต้ม มี ${c.passHave}`, `needs ${c.passNeed} pts, you have ${c.passHave}`)),
      opt('script', 'Battle Script', c.scriptOk, c.scriptOk ? L('แทนกฎ AUTO ปัจจุบัน', 'replaces your AUTO rules') : L('ไม่มี', 'none')),
      c.hrAll ? opt('hrunes', `Hunt Rune (${c.hrOk}/${c.hrAll})`, c.hrOk > 0, c.hrOk < c.hrAll ? L('บางอันยังไม่มี (ข้าม)', 'some not owned (skipped)') : '') : null));
    const busy = !this.canSwitch();
    box.append(h('div', { class: 'lo-acts' }, h('button', { type: 'button', class: 'btn primary lo-apply', disabled: busy ? 'disabled' : false, onclick: async () => {
      if (typeof UI.confirm === 'function' && !(await UI.confirm(L('ใช้ส่วนที่เลือกกับตัวละครนี้? (บันทึก Build เดิมไว้ในช่องก่อนได้)', 'Apply the selected parts to this character? (save your current build to a slot first if you want to keep it)')))) return;
      const r = this.applyBuild(b, sel);
      if (!r.ok) UI.msg(r.err, 'err');
      else { UI.msg(L(`ใช้ Build แล้ว${r.skipped ? ` (ข้าม ${r.skipped} รูนที่ยังไม่ปลด)` : ''}${r.hrSkipped ? ` (ข้าม Hunt Rune ${r.hrSkipped})` : ''}`, `Build applied${r.skipped ? ` (${r.skipped} locked runes skipped)` : ''}${r.hrSkipped ? ` (${r.hrSkipped} Hunt Rune skipped)` : ''}`), 'sys'); this.preview = null; this.draft = ''; if (typeof Sound !== 'undefined') Sound.play('buff'); }
      this.render();
    } }, busy ? this.busyMsg() : L('ใช้ส่วนที่เลือก', 'Apply selected'))));
    return box;
  },
  render() {
    const body = document.querySelector('#w-builds .win-body');
    if (!body || !G.player || !UI.isOpen('w-builds')) return;
    const a = document.activeElement;
    // กำลังพิมพ์ หรือกำลังกดปุ่มค้าง: วาดใหม่ทีหลัง (ไม่ให้ช่องกรอกหาย/คลิกหลุดเพราะปุ่มถูกแทนกลางคัน)
    if (this.holding() || (a && body.contains(a) && a.tagName === 'INPUT' && a.type === 'text' && !a.readOnly)) { this._defer = true; this.hook(); return; }
    this._defer = false; this.hook();
    const busy = !this.canSwitch();
    body.innerHTML = '';
    const wrap = h('div', { class: 'lo' });
    wrap.append(h('p', { class: 'lo-intro' }, L('เก็บ Build ได้ 3 ชุด — Passive • Rune Paths • อุปกรณ์ • แถบลัด • Battle Script — สลับคลิกเดียวได้ทุกที่ ยกเว้นระหว่างต่อสู้ • Passive สลับฟรี',
      'Keep 3 builds — passives • Rune Paths • gear • hotbars • Battle Script — switch in one click anywhere except in combat • passive swaps are free')));
    if (busy) wrap.append(h('p', { class: 'lo-busy' }, '⚔ ', L(`กำลังต่อสู้ — สลับได้ในอีก ${Math.ceil(this.combatLeft())} วิ`, `In combat — switch in ${Math.ceil(this.combatLeft())}s`)));
    const slots = h('div', { class: 'lo-slots' });
    for (let i = 0; i < LO_SLOTS; i++) slots.append(this.slotCard(i));
    wrap.append(slots);
    // Build Code
    wrap.append(h('h4', { class: 'lo-sec' }, 'Build Code'),
      h('p', { class: 'hint' }, L('แชร์ Class + Rune + Passive (+ Battle Script) เป็นโค้ดสั้น ๆ • อุปกรณ์ใส่แค่ชื่อไว้ดู ไม่มีข้อมูลระบุตัวตน', 'Share Class + runes + passives (+ Battle Script) as a short code • gear is listed by name only, nothing identifying')),
      h('div', { class: 'lo-row' },
        h('label', { class: 'lo-opt' }, h('input', { type: 'checkbox', checked: this.withScript ? 'checked' : false, onchange: e => { this.withScript = e.target.checked; } }), ' ', L('รวม Battle Script', 'Include Battle Script')),
        h('button', { type: 'button', class: 'btn lo-export', onclick: () => this.copy(this.exportCode(null, this.withScript)) }, L('คัดลอก Build ตอนนี้', 'Copy current build'))));
    if (this.lastCode) wrap.append(h('input', { class: 'lo-code', type: 'text', readonly: 'readonly', value: this.lastCode, 'aria-label': 'Build Code', onfocus: e => e.target.select() }));
    const inp = h('input', { class: 'lo-code lo-paste', type: 'text', placeholder: L('วางโค้ด IV-BUILD:... ที่นี่', 'Paste an IV-BUILD:... code here'), value: this.draft, maxlength: LO_MAX_CODE, 'aria-label': L('วาง Build Code', 'Paste Build Code'),
      oninput: e => { this.draft = e.target.value; }, onblur: () => this.flush() });
    wrap.append(h('div', { class: 'lo-row lo-import' }, inp, h('button', { type: 'button', class: 'btn lo-view', onclick: () => { this.preview = this.decode(inp.value); if (this.preview.err) UI.msg(this.preview.err, 'err'); inp.blur(); this.render(); } }, L('ดูตัวอย่าง', 'Preview'))));
    wrap.append(this.previewCard());
    body.append(wrap);
  },
  flush() { setTimeout(() => { if (this._defer && !this.holding()) this.render(); }, 0); },
  holding() { return !!this._hold && Date.now() - this._hold < 1500; }, // กันค้าง: ปล่อยนอกจอแล้วไม่ได้ pointerup
  hook() {
    const w = document.getElementById('w-builds'); if (!w || w._lo) return; w._lo = true;
    w.addEventListener('pointerdown', () => { this._hold = Date.now(); }, true);
    const up = () => { if (this._hold) { this._hold = 0; this.flush(); } };
    document.addEventListener('pointerup', up, true); document.addEventListener('pointercancel', up, true);
  },
  // แถบเล็กในหน้าต่าง Status (เรียกจาก UI.renderStatus)
  statusEntry() {
    const L0 = this.st(), s = L0.cur >= 0 ? L0.slots[L0.cur] : null;
    return h('div', { class: 'lo-st' }, h('span', {}, 'Build: ', h('b', {}, s ? s.name : L('ยังไม่ได้บันทึก', 'not saved'))),
      h('button', { type: 'button', class: 'btn small', 'data-open': 'w-builds' }, L('จัดการ Builds', 'Manage Builds')));
  },
  // สถานะ "ต่อสู้" เปลี่ยน/นับถอยหลัง → วาดหน้าต่างใหม่ (ปุ่มสลับล็อก/ปลดเอง)
  tick() {
    if (typeof G === 'undefined' || !G.started || !G.player || typeof UI === 'undefined' || !UI.isOpen('w-builds')) return;
    const left = Math.ceil(this.combatLeft());
    if (left !== this._left) { this._left = left; this.render(); }
  },
};

(() => {
  if (typeof document === 'undefined') return;
  setInterval(() => Loadouts.tick(), 400);
  document.addEventListener('keydown', e => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || typeof U === 'undefined' || U.key(e) !== 'd') return;
    const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (typeof G === 'undefined' || !G.started || (UI.dialog && UI.isOpen('w-dialog'))) return;
    UI.toggle('w-builds');
  });
})();
