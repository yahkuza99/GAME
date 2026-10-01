'use strict';
// ============================================================
//  เควสต์เริ่มต้น (สายเดียว ทำทีละเควสต์): สอนระบบพื้นฐานจนอัปเกรดคลาสแรก
//  ความคืบหน้าเก็บใน p.quests = { i: เควสต์ที่กำลังทำ, n: ตัวนับ, done: [id] }
//  เป้าหมาย: talk (คุย NPC) • kill (ล่ามอน) • hit (ตีหุ่นฝึก) • collect (เก็บของ ส่งแล้วหาย)
//           event (เช่น บันทึกจุดเกิด) • baseLv / jobLv • job (อัปเกรดคลาส)
// ============================================================

const QUESTS = [
  { id: 'welcome', title: 'หน่วยใหม่รายงานตัว', desc: 'ไปรายงานตัวกับ Guard Unit Rolf (หุ่นหมวกเขา) ที่ลานกลางเมือง',
    obj: { type: 'talk', npc: 'guide' }, reward: { items: [['red_potion', 5]], bexp: 10, jexp: 5 } },
  { id: 'repair', title: 'ตรวจเช็กร่างกาย', desc: 'ให้ Eir Repair Unit สแกนร่างกาย — ซ่อม HP/SP และให้บัฟฟรีทุกครั้ง',
    obj: { type: 'talk', npc: 'nurse' }, reward: { zeny: 100, bexp: 20, jexp: 10 } },
  { id: 'dummy', title: 'ทดสอบระบบต่อสู้', desc: 'ตีหุ่นฝึกซ้อมใต้ลานเมือง 10 ครั้ง (คลิกที่หุ่นเพื่อโจมตี)',
    obj: { type: 'hit', n: 10 }, reward: { items: [['apple', 5]], bexp: 20, jexp: 15 } },
  { id: 'gel5', title: 'กำจัด Gel Unit', desc: 'ออกประตูตะวันออกไป Emerald Meadow แล้วทำลาย Gel Unit 5 ตัว',
    obj: { type: 'kill', mob: 'pudding', n: 5 }, reward: { items: [['red_potion', 5]], bexp: 60, jexp: 40 } },
  { id: 'jelly', title: 'เก็บตัวอย่างเจล', desc: 'เก็บ Gel Cell 3 ชิ้นจาก Gel Unit (ส่งแล้วไอเทมจะถูกใช้ไป)',
    obj: { type: 'collect', item: 'jelly_drop', n: 3, mob: 'pudding' }, reward: { zeny: 300, bexp: 50, jexp: 30 } },
  { id: 'savept', title: 'บันทึกจุดเกิด', desc: 'คุยกับ Bifrost Keeper แล้วเลือก "บันทึกจุดเกิด" — ล้มเมื่อไหร่จะกลับมาที่นี่',
    obj: { type: 'event', ev: 'save', npc: 'bifrost' }, reward: { items: [['blink_feather', 3]] } },
  { id: 'lv5', title: 'เพิ่มพลังร่าง', desc: 'ขึ้นถึง Base Lv 5 (อย่าลืมแจก Status Point — กด A)',
    obj: { type: 'baseLv', n: 5 }, reward: { items: [['hood', 1]], zeny: 300 } },
  { id: 'buzz', title: 'ภัยจากฝูงโดรนผึ้ง', desc: 'ทำลาย Buzz Unit 3 ตัว — พวกมันโจมตีก่อน ระวังตัว!',
    obj: { type: 'kill', mob: 'buzzfly', n: 3 }, reward: { items: [['orange_potion', 3]], bexp: 150, jexp: 100 } },
  { id: 'job10', title: 'ข้อมูลการต่อสู้ครบถ้วน', desc: `ขึ้นถึง Job Lv ${JOB_CHANGE_LV} เพื่อปลดล็อกการอัปเกรดคลาส`,
    obj: { type: 'jobLv', n: JOB_CHANGE_LV }, reward: { items: [['sandals', 1]] } },
  { id: 'upgrade', title: 'อัปเกรดร่างครั้งแรก', desc: 'คุยกับ Mimir AI แล้วเลือกคลาสใหม่ 1 ใน 6 คลาส',
    obj: { type: 'job', npc: 'jobmaster' }, reward: { items: [['yellow_potion', 3]], zeny: 1000 } },
  // ---- สายที่ 2: หลังอัปเกรดคลาส (Lv 10-30) ----
  { id: 'skill1', title: 'ติดตั้งโมดูลสกิล', desc: 'ใช้ Skill Point ติดตั้งสกิลของคลาสใหม่อย่างน้อย 1 สกิล (กด S)',
    obj: { type: 'skill' }, reward: { items: [['orange_potion', 5]], bexp: 300, jexp: 200 } },
  { id: 'useskill', title: 'ทดสอบสกิลในสนามจริง', desc: 'ใช้สกิลกดใช้ 10 ครั้ง (ลากสกิลไปวางที่แถบลัด แล้วกดเลขหรือแตะปุ่ม)',
    obj: { type: 'useskill', n: 10 }, reward: { items: [['grape', 3]], bexp: 400, jexp: 300 } },
  { id: 'mist', title: 'บุกที่ราบ Mistlake', desc: 'เดินทางไป Mistlake Plains (ต่อจาก Emerald Meadow) แล้วทำลาย Rust Sentry 10 ตัว',
    obj: { type: 'kill', mob: 'stumpling', n: 10 }, reward: { items: [['guard', 1]], bexp: 800, jexp: 500 } },
  { id: 'shroom', title: 'เก็บกู้ทุ่นระเบิดเดินได้', desc: 'ทำลาย Mine Unit 8 ตัวที่ Mistlake Plains (ระวังแรงระเบิด!)',
    obj: { type: 'kill', mob: 'capshroom', n: 8 }, reward: { items: [['yellow_potion', 3]], bexp: 1000, jexp: 700 } },
  { id: 'refine1', title: 'ตีบวกอุปกรณ์', desc: 'ให้ Brokk Forge-Bot ตีบวกอุปกรณ์ที่สวมอยู่สำเร็จ 1 ครั้ง (+1 ถึง +4 ไม่มีวันแตก)',
    obj: { type: 'event', ev: 'refine', npc: 'refine' }, reward: { zeny: 1500 } },
  { id: 'lv20', title: 'ร่างระดับกลาง', desc: 'ขึ้นถึง Base Lv 20',
    obj: { type: 'baseLv', n: 20 }, reward: { items: [['shoes', 1]], zeny: 1000 } },
  { id: 'wolf', title: 'นักล่าแห่ง Wolfwood', desc: 'ลงใต้ไป Wolfwood Forest แล้วทำลาย Ash Stalker 10 ตัว',
    obj: { type: 'kill', mob: 'ashtail', n: 10 }, reward: { items: [['yellow_potion', 5]], bexp: 2500, jexp: 1600 } },
  { id: 'mvp1', title: 'ล่า MVP: Seraph Core', desc: 'ปราบ MVP Seraph Core ที่ Mistlake Plains — เตรียมยาให้พร้อม เช็กเวลาเกิดได้ในข้อมูลมอนสเตอร์ (ⓘ)',
    obj: { type: 'kill', mob: 'seraph_pudding', n: 1 }, reward: { items: [['clip', 1], ['white_potion', 3]], zeny: 5000 } },
  { id: 'lv30', title: 'ทหารผ่านศึกแห่งมิดการ์ด', desc: 'ขึ้นถึง Base Lv 30 — ถ้ำ Hel\'s Hollow กำลังรอเจ้าอยู่',
    obj: { type: 'baseLv', n: 30 }, reward: { items: [['white_potion', 5]], zeny: 3000 } },
];

const Quest = {
  state() {
    const p = G.player;
    if (!p.quests || typeof p.quests !== 'object') p.quests = { i: 0, n: 0, done: [] };
    return p.quests;
  },
  current() { const s = this.state(); return QUESTS[s.i] || null; },

  // ความคืบหน้า [ทำได้, เป้า] ของเควสต์ปัจจุบัน
  progress(q = this.current()) {
    if (!q) return [0, 0];
    const p = G.player, s = this.state(), o = q.obj;
    switch (o.type) {
      case 'kill': case 'hit': return [Math.min(s.n, o.n), o.n];
      case 'collect': return [Math.min(countItem(o.item), o.n), o.n];
      case 'baseLv': return [Math.min(p.baseLv, o.n), o.n];
      case 'jobLv': return [p.job !== 'novice' ? o.n : Math.min(p.jobLv, o.n), o.n];
      case 'job': return [p.job !== 'novice' ? 1 : 0, 1];
      case 'skill': return [p.job !== 'novice' && Object.keys(p.skills).some(k => JOBS[p.job].skills.includes(k) && !JOBS.novice.skills.includes(k) && p.skills[k] > 0) ? 1 : 0, 1];
      case 'useskill': return [Math.min(s.n, o.n), o.n];
      default: return [s.n ? 1 : 0, 1];
    }
  },
  objText(q = this.current()) {
    if (!q) return '';
    const o = q.obj, [a, b] = this.progress(q);
    const npc = id => { for (const m in MAP_DEFS) { const n = (MAP_DEFS[m].npcs || []).find(x => x.id === id); if (n) return n.name; } return id; };
    switch (o.type) {
      case 'talk': return `คุยกับ ${npc(o.npc)}`;
      case 'kill': return `${MOBS[o.mob].name} ${a}/${b}`;
      case 'hit': return `ตีหุ่นฝึกซ้อม ${a}/${b}`;
      case 'collect': return `${ITEMS[o.item].name} ${a}/${b}`;
      case 'event': return o.ev === 'refine' ? `ตีบวกสำเร็จที่ ${npc(o.npc)}` : `บันทึกจุดเกิดที่ ${npc(o.npc)}`;
      case 'baseLv': return `Base Lv ${G.player.baseLv}/${b}`;
      case 'jobLv': return `Job Lv ${Math.min(G.player.jobLv, b)}/${b}`;
      case 'job': return `อัปเกรดคลาสที่ ${npc(o.npc)}`;
      case 'skill': return 'ติดตั้งสกิลคลาสใหม่ (กด S)';
      case 'useskill': return `ใช้สกิล ${a}/${b}`;
    }
    return '';
  },
  rewardText(q) {
    const r = q.reward, out = [];
    if (r.bexp) out.push(`Base EXP ${r.bexp}`);
    if (r.jexp) out.push(`Job EXP ${r.jexp}`);
    if (r.zeny) out.push(`${U.fmt(r.zeny)} ${CUR}`);
    for (const [id, n] of r.items || []) out.push(`${ITEMS[id].name} ×${n}`);
    return out.join(' • ');
  },
  // จุดหมายสำหรับระบบนำทาง
  navTarget(q = this.current()) {
    if (!q) return null;
    const o = q.obj;
    const npcT = id => { for (const m in MAP_DEFS) { const n = (MAP_DEFS[m].npcs || []).find(x => x.id === id); if (n) return { kind: 'npc', map: m, x: n.x, y: n.y, name: n.name, npcId: n.id }; } return null; };
    const mobT = id => { for (const m in MAP_DEFS) if ((MAP_DEFS[m].spawns || []).some(s => s[0] === id) || MAP_DEFS[m].mvp === id) return { kind: 'mob', map: m, mobId: id, name: MOBS[id].name }; return null; };
    switch (o.type) {
      case 'talk': case 'event': case 'job': return npcT(o.npc || 'jobmaster');
      case 'kill': return mobT(o.mob);
      case 'collect': return mobT(o.mob);
      case 'hit': return { kind: 'mob', map: HOME_MAP, mobId: 'training_dummy', name: MOBS.training_dummy.name };
      case 'jobLv': case 'baseLv': { // แนะนำที่ล่าตามเลเวล
        const lv = G.player.baseLv;
        return lv < 8 ? mobT('pudding') : lv < 16 ? mobT('stumpling') : lv < 24 ? mobT('ashtail') : mobT('draugr');
      }
      case 'useskill': return mobT(G.player.baseLv < 12 ? 'stumpling' : 'ashtail');
      case 'skill': return null;
    }
    return null;
  },
  go() { const t = this.navTarget(); if (t) Nav.goTo(t); else if (this.current() && this.current().obj.type === 'skill') UI.open('w-skills'); },

  // ---------- เหตุการณ์จากเกม ----------
  onTalk(npcId) { const q = this.current(); if (q && q.obj.type === 'talk' && q.obj.npc === npcId) { this.state().n = 1; this.check(); } },
  onKill(mobId) { const q = this.current(); if (q && q.obj.type === 'kill' && q.obj.mob === mobId) { this.state().n++; this.changed(); this.check(); } },
  onHitDummy() { const q = this.current(); if (q && q.obj.type === 'hit') { this.state().n++; this.changed(); this.check(); } },
  onSkillUse() { const q = this.current(); if (q && q.obj.type === 'useskill') { this.state().n++; this.changed(); this.check(); } },
  onEvent(ev) { const q = this.current(); if (q && q.obj.type === 'event' && q.obj.ev === ev) { this.state().n = 1; this.check(); } },
  changed() { this.dirty = true; UI.dirty(); },

  // เรียกทุกเฟรม (เบา): เป้าหมายที่ขึ้นกับสถานะ (เลเวล/ไอเทม/คลาส) และอัปเดตแถบติดตาม
  tick() {
    if (!G.started || !G.player) return;
    if (G.time >= (this.nextCheck || 0)) { this.nextCheck = G.time + 0.5; this.check(); this.dirty = true; }
    if (this.dirty) { this.dirty = false; this.renderTracker(); }
  },
  check() {
    const q = this.current(); if (!q) return;
    const [a, b] = this.progress(q);
    if (a >= b) this.complete(q);
  },
  complete(q) {
    const p = G.player, s = this.state(), r = q.reward;
    if (q.obj.type === 'collect') {
      let need = q.obj.n;
      for (const e of [...p.inventory]) { if (e.id !== q.obj.item || need <= 0) continue; const k = Math.min(e.qty, need); removeEntry(e, k); need -= k; }
    }
    s.done.push(q.id); s.i++; s.n = 0;
    if (r.zeny) p.zeny += r.zeny;
    for (const [id, n] of r.items || []) addItem(id, n, true);
    if (r.bexp || r.jexp) gainExp(r.bexp || 0, r.jexp || 0);
    addFloater(p.x, p.y - 1.8, 'QUEST CLEAR!', '#ffd34a', true);
    addFx({ type: 'buff', ref: p, dur: 1.2 });
    Sound.play('quest');
    if (this.current()) setTimeout(() => Sound.play('quest_new'), 900);
    UI.msg(`📜 เควสต์สำเร็จ: ${q.title} — รางวัล ${this.rewardText(q)}`, 'lvl');
    const nx = this.current();
    if (nx) UI.msg(`📜 เควสต์ใหม่: ${nx.title} — ${nx.desc}`, 'info');
    else UI.msg('📜 จบเควสต์เริ่มต้นทั้งหมดแล้ว! ขอให้สนุกกับการผจญภัยใน NEO MIDGARD', 'lvl');
    UI.dirty(); this.dirty = true;
    saveGame();
  },

  // ---------- แถบติดตามบนจอ ----------
  renderTracker() {
    const el = document.getElementById('quest-track'); if (!el) return;
    const q = this.current();
    if (!q || G.player.options.questTrack === false) { el.hidden = true; return; }
    el.hidden = false;
    const [a, b] = this.progress(q);
    const key = `${q.id}|${a}|${b}|${G.player.baseLv}|${G.player.jobLv}`;
    if (el.dataset.key === key) return;
    el.dataset.key = key;
    el.innerHTML = '';
    el.append(
      h('div', { class: 'qt-title' }, h('span', { class: 'qt-ic' }, '📜'), q.title),
      h('div', { class: 'qt-obj' }, this.objText(q), b > 1 ? h('span', { class: 'qt-bar' }, h('i', { style: `width:${Math.round(a / b * 100)}%` })) : null),
    );
  },
};

// ============================================================
//  งานล่าค่าหัวประจำวัน (รับ/ส่งที่ Guard Unit Rolf) — ทำซ้ำได้ทุกวัน
//  วันละ 3 งาน สุ่มจากมอนที่เลเวลใกล้ตัวเรา (สุ่มตามวันที่+ชื่อ ได้ชุดเดิมทั้งวัน) • ทำครบ 3 งานได้โบนัส
//  เก็บใน p.bounty = { day, list: [{ mob, n, got, zeny, bexp, jexp, claimed }], bonus }
// ============================================================
const BOUNTY_MIN_LV = 8;
const Bounty = {
  today() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; },
  open() { return G.player.baseLv >= BOUNTY_MIN_LV; },
  state() {
    const p = G.player, day = this.today();
    if (!this.open()) return null;
    if (!p.bounty || p.bounty.day !== day || !Array.isArray(p.bounty.list) || p.bounty.list.some(b => !MOBS[b.mob])) p.bounty = { day, list: this.roll(p, day), bonus: false };
    return p.bounty;
  },
  mapOf(id) { return Object.keys(MAP_DEFS).find(m => (MAP_DEFS[m].spawns || []).some(s => s[0] === id)); },
  roll(p, day) {
    let h = 7; for (const c of day + p.name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const rnd = U.seeded(h);
    const pool = Object.values(MOBS).filter(m => !m.boss && !m.dummy && this.mapOf(m.id))
      .sort((a, b) => Math.abs(a.lv - p.baseLv) - Math.abs(b.lv - p.baseLv)).slice(0, 6);
    const out = [];
    while (out.length < 3 && pool.length) {
      const m = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
      const n = 8 + Math.floor(rnd() * 4) * 2; // 8–14 ตัว
      const [z0, z1] = mobZeny(m);
      out.push({ mob: m.id, n, got: 0, zeny: Math.round((z0 + z1) / 2 * n * 1.5), bexp: Math.round(m.exp * n * 0.5), jexp: Math.round(m.jexp * n * 0.5), claimed: false });
    }
    return out;
  },
  onKill(id) {
    const s = this.state(); if (!s) return;
    for (const b of s.list) if (b.mob === id && b.got < b.n) {
      b.got++;
      if (b.got === b.n) { UI.msg(`📋 งานล่าค่าหัวเสร็จ: ${MOBS[id].name} ${b.n} ตัว — กลับไปรับรางวัลที่ Guard Unit Rolf`, 'lvl'); Sound.play('quest_new'); }
      UI.dirty();
    }
  },
  ready() { const s = this.state(); return s ? s.list.filter(b => b.got >= b.n && !b.claimed) : []; },
  claim(b) {
    const p = G.player, s = this.state();
    if (!s || b.claimed || b.got < b.n) return '';
    b.claimed = true; p.zeny += b.zeny; gainExp(b.bexp, b.jexp);
    let msg = `รับรางวัล ${U.fmt(b.zeny)} ${CUR} • ${U.fmt(b.bexp)} Base EXP • ${U.fmt(b.jexp)} Job EXP`;
    if (!s.bonus && s.list.every(x => x.claimed)) { // โบนัสครบ 3 งาน
      s.bonus = true; addItem('yellow_potion', 3, true); addItem('blink_feather', 2, true); p.zeny += 500;
      msg += `<br>🎁 โบนัสทำครบ 3 งาน: Repair Kit L ×3, Blink Chip ×2, 500 ${CUR}`;
    }
    addFloater(p.x, p.y - 1.8, 'BOUNTY CLEAR!', '#ffd34a', true); Sound.play('quest'); UI.dirty(); saveGame();
    return msg;
  },
  line(b) { const m = MOBS[b.mob], map = this.mapOf(b.mob); return `${m.name} ${Math.min(b.got, b.n)}/${b.n}${map ? ` • ${MAP_DEFS[map].name}` : ''}`; },
};
