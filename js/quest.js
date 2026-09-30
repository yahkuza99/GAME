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
      case 'event': return `บันทึกจุดเกิดที่ ${npc(o.npc)}`;
      case 'baseLv': return `Base Lv ${G.player.baseLv}/${b}`;
      case 'jobLv': return `Job Lv ${Math.min(G.player.jobLv, b)}/${b}`;
      case 'job': return `อัปเกรดคลาสที่ ${npc(o.npc)}`;
    }
    return '';
  },
  rewardText(q) {
    const r = q.reward, out = [];
    if (r.bexp) out.push(`Base EXP ${r.bexp}`);
    if (r.jexp) out.push(`Job EXP ${r.jexp}`);
    if (r.zeny) out.push(`${U.fmt(r.zeny)} z`);
    for (const [id, n] of r.items || []) out.push(`${ITEMS[id].name} ×${n}`);
    return out.join(' • ');
  },
  // จุดหมายสำหรับระบบนำทาง
  navTarget(q = this.current()) {
    if (!q) return null;
    const o = q.obj;
    const npcT = id => { for (const m in MAP_DEFS) { const n = (MAP_DEFS[m].npcs || []).find(x => x.id === id); if (n) return { kind: 'npc', map: m, x: n.x, y: n.y, name: n.name, npcId: n.id }; } return null; };
    const mobT = id => { for (const m in MAP_DEFS) if ((MAP_DEFS[m].spawns || []).some(s => s[0] === id)) return { kind: 'mob', map: m, mobId: id, name: MOBS[id].name }; return null; };
    switch (o.type) {
      case 'talk': case 'event': case 'job': return npcT(o.npc || 'jobmaster');
      case 'kill': return mobT(o.mob);
      case 'collect': return mobT(o.mob);
      case 'hit': return { kind: 'mob', map: HOME_MAP, mobId: 'training_dummy', name: MOBS.training_dummy.name };
      case 'jobLv': case 'baseLv': return G.player.baseLv < 8 ? mobT('pudding') : mobT('stumpling') || mobT('pudding');
    }
    return null;
  },
  go() { const t = this.navTarget(); if (t) Nav.goTo(t); },

  // ---------- เหตุการณ์จากเกม ----------
  onTalk(npcId) { const q = this.current(); if (q && q.obj.type === 'talk' && q.obj.npc === npcId) { this.state().n = 1; this.check(); } },
  onKill(mobId) { const q = this.current(); if (q && q.obj.type === 'kill' && q.obj.mob === mobId) { this.state().n++; this.changed(); this.check(); } },
  onHitDummy() { const q = this.current(); if (q && q.obj.type === 'hit') { this.state().n++; this.changed(); this.check(); } },
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
    Sound.play('levelup');
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
