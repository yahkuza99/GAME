'use strict';
// ============================================================
//  QuestUI — ชั้น UI ของเควสต์ (ไม่แตะตรรกะ/รางวัล/เซฟ)
//  1) list(): งานที่ "รับรางวัลได้เลย" — ค่าหัวครบ (ส่งที่ Guard Unit Rolf) • เควสต์เสริมที่ล่า/เก็บครบ (ส่งที่ NPC) • หีบประจำวัน
//     claim(r): ปุ่ม "รับรางวัล" ในหน้าต่างเควสต์ → อยู่ใกล้ NPC = เปิดบทสนทนาส่งงานทันที • อยู่ไกล = นำทางไปแล้วเปิดเอง
//     (รางวัลยังรับที่ NPC เดิมผ่านโค้ดเดิม — Bounty.claim ใน NPC.bountyBoard / Side.npcTalk / Daily.claim)
//  2) ป้ายกลางจอ "เควสต์สำเร็จ!" 3.5 วิ แตะ = เปิดหน้าต่างเควสต์ • 1 ครั้งต่อ 1 งาน (จำ key ไว้ต่อตัวละคร ไม่อยู่ในเซฟ)
//     งานที่ครบอยู่แล้วตอนเข้าเกมไม่ประกาศซ้ำ (ไฟที่ปุ่ม Quest บอกแทน)
//  3) ปุ่ม Quest (เมนู/ปุ่มมือถือ) เรืองทอง + ป้าย "!" จนกว่าจะรับรางวัลครบ
//  เกี่ยวเข้ากับเกมโดยห่อ Quest.tick / Quest.complete / Daily.badge / UIKit.paintQtBtn / NPC.scripts.guide
// ============================================================
const QuestUI = {
  SHOW_MS: 3500,
  seen: null, _p: null, _q: [], _t: 0, el: null, board: 0,

  npcName(id) { for (const m in MAP_DEFS) { const n = (MAP_DEFS[m].npcs || []).find(x => x.id === id); if (n) return n.name; } return id; },
  list() {
    const p = G.player; if (!p) return [];
    const out = [];
    const bs = Bounty.state();
    if (bs) bs.list.forEach((x, i) => {
      if (x.claimed || x.got < x.n) return;
      out.push({ key: `b:${bs.day}:${i}:${x.mob}`, kind: 'bounty', b: x, title: `${MOBS[x.mob].name} ${x.n}/${x.n}`,
        sub: `${U.fmt(x.zeny)} ${CUR} • ${U.fmt(x.bexp)} Base EXP • ${U.fmt(x.jexp)} Job EXP`, where: L('ส่งที่ Guard Unit Rolf', 'Turn in to Guard Unit Rolf'), npc: 'guide' });
    });
    if (typeof Side !== 'undefined') for (const q of Side.active()) {
      if (!Side.claimable(q)) continue;
      const st = Side.step(q), r = Side.rec(q.id), last = (r.k || 0) >= q.steps.length - 1;
      out.push({ key: `s:${q.id}:${r.k || 0}`, kind: 'side', q, title: q.title, sub: last ? Quest.rewardText(q) : Side.objText(q).split(' — ')[0],
        where: L(`ส่งที่ ${this.npcName(st.to)}`, `Turn in to ${this.npcName(st.to)}`), npc: st.to, btn: last ? null : L('ส่งงาน', 'Turn in') });
    }
    if (typeof Daily !== 'undefined') { const s = Daily.state(); if (s && Daily.canClaim(s)) out.push({ key: `d:${s.day}`, kind: 'daily', title: L('ภารกิจประจำวันครบ 3/3', 'Daily ops 3/3'), sub: L('เปิดหีบประจำวันได้เลย', 'Your Daily Cache is ready'), btn: L('เปิดหีบ', 'Open cache') }); }
    return out;
  },

  // ---------- รับรางวัล ----------
  claim(r) {
    if (!r) return;
    if (r.kind === 'daily') { const res = Daily.claim(); if (res) Daily.reveal(res); this.refresh(); return; }
    const p = G.player, n = G.npcs.find(x => x.id === r.npc);
    UI.close('w-quest');
    if (r.npc === 'guide') this.board = performance.now() + 5 * 60e3; // ถึงตัว Rolf แล้วเปิดบอร์ดค่าหัวเลย (ข้ามเมนูทักทาย)
    if (n && NPC.inTalkRange(n, p)) { NPC.talk(n); return; }
    const t = r.kind === 'side' ? Side.navTarget(r.q) : Quest.navTarget({ obj: { type: 'talk', npc: r.npc } });
    if (t) Nav.goTo(t);
  },
  refresh() { const b = document.querySelector('#w-quest .win-body'); if (b) b.dataset.key = ''; if (UI.isOpen('w-quest')) UI.renderQuest(); this.paint(); },
  openBook() {
    UI.questTab = 'story';
    const b = document.querySelector('#w-quest .win-body'); if (b) { b.dataset.key = ''; b.dataset.dk = ''; b.dataset.lk = ''; }
    UI.open('w-quest'); UI.renderQuest();
  },

  // ---------- ป้ายกลางจอ ----------
  banner(o) { this.show(o); }, // เรียกจากเหตุการณ์ (1 ครั้งต่อ 1 งาน) • show = แสดง/ต่อคิว
  show(o) {
    if (typeof document === 'undefined' || !G.started) return;
    if (this.el && this.el.classList.contains('show')) { this._q = this._q.filter(x => x.key !== o.key).concat(o).slice(-3); return; }
    const wait = (UI._bannerUntil || 0) - performance.now(); // ป้ายชื่อแผนที่ยังแสดงอยู่ (ตำแหน่งใกล้กัน) → รอให้หายก่อน
    if (wait > 0) {
      this._q = this._q.filter(x => x.key !== o.key).concat(o).slice(-3);
      if (!this._w) this._w = setTimeout(() => { this._w = 0; const nx = this._q.shift(); if (nx) this.show(nx); }, Math.min(wait, 4000) + 150);
      return;
    }
    if (!this.el) {
      this.el = h('button', { type: 'button', id: 'qd-banner', 'aria-live': 'polite', onclick: e => { e.stopPropagation(); this.hide(); Sound.play('click'); this.openBook(); } });
      (document.getElementById('hud') || document.body).append(this.el);
    }
    const el = this.el;
    el.innerHTML = '';
    el.className = o.ready ? 'ready' : 'done';
    el.dataset.key = o.key;
    el.append(h('span', { class: 'qd-ic' }, ivIconEl(o.ready ? 'crown' : 'confirm')),
      h('span', { class: 'qd-txt' }, h('b', {}, o.head || L('เควสต์สำเร็จ!', 'Quest complete!')), h('span', { class: 'qd-name' }, o.name),
        h('small', {}, o.ready ? L('แตะเพื่อรับรางวัล', 'Tap to claim your reward') : (o.note || L('แตะเพื่อดูเควสต์ถัดไป', 'Tap to see your next quest')))));
    void el.offsetWidth; el.classList.add('show');
    clearTimeout(this._t); this._t = setTimeout(() => this.hide(), this.SHOW_MS);
    if (o.ready) Sound.play('quest');
  },
  hide() {
    clearTimeout(this._t);
    if (!this.el) return;
    this.el.classList.remove('show');
    const nx = this._q.shift();
    if (nx) setTimeout(() => this.show(nx), 350);
  },

  // ---------- เฝ้าดูงานที่เพิ่งครบ (ทุก 0.5 วิผ่าน Quest.tick) ----------
  watch() {
    const p = G.player; if (!p) return;
    const list = this.list();
    if (this._p !== p) { this._p = p; this.seen = new Set(list.map(r => r.key)); this._q = []; this.paint(list); return; } // เข้าเกม/เปลี่ยนตัวละคร: ของเดิมไม่ประกาศ
    for (const r of list) if (!this.seen.has(r.key)) { this.seen.add(r.key); this.banner({ key: r.key, ready: true, name: r.title, head: r.kind === 'daily' ? L('ภารกิจประจำวันครบ!', 'Daily ops complete!') : null }); }
    this.paint(list);
  },
  paint(list = this.list()) {
    const n = list.length, sig = String(n);
    if (this._sig === sig) return;
    this._sig = sig;
    const mb = document.querySelector('#menubar button[data-win="w-quest"]');
    if (mb) mb.classList.toggle('qd-ready', n > 0);
    this.trackChip(n);
    const qb = document.getElementById('qt-btn');
    if (qb) qb.classList.toggle('qd-ready', n > 0);
    if (typeof Daily !== 'undefined') Daily.badge();
    if (typeof UIKit !== 'undefined' && UIKit.paintQtBtn) UIKit.paintQtBtn();
  },
  // คอม: การ์ดเควสต์บนจอ (#quest-track) เรืองทอง + แถบ "รับรางวัล (N)" แตะแล้วเปิดสมุดเควสต์ (มือถือแนวตั้งใช้ปุ่ม Quest แทน)
  trackChip(n = this.list().length) {
    const el = document.getElementById('quest-track'); if (!el) return;
    el.classList.toggle('qd-ready', n > 0);
    if (!n) { if (this.chip) this.chip.remove(); return; }
    if (!this.chip) this.chip = h('button', { type: 'button', class: 'qd-chip', onclick: e => { e.stopPropagation(); Sound.play('click'); this.openBook(); } });
    const t = L(`รับรางวัลได้ ${n} งาน — แตะ`, `${n} reward${n > 1 ? 's' : ''} ready — tap`);
    if (this.chip.dataset.t !== t) { this.chip.dataset.t = t; this.chip.innerHTML = ''; this.chip.append(ivIconEl('crown'), h('span', {}, t)); }
    if (this.chip.parentNode !== el) el.prepend(this.chip);
  },
  // ป้ายตัวเลขบนปุ่ม: มีของให้รับ = "!" สีทอง (ทับตัวนับประจำวัน)
  stamp(i) {
    if (!i || !G.player) return;
    if (!this.list().length) return;
    if (i.textContent !== '!') i.textContent = '!';
    i.hidden = false; i.classList.add('ready');
  },
};

(() => {
  const install = () => {
    // เควสต์หลักสำเร็จ (รับรางวัลอัตโนมัติ): ป้ายใหญ่แทนป้าย QUEST COMPLETE เล็ก (js/ornate.js)
    const c0 = Quest.complete;
    Quest.complete = function (q) {
      const od = typeof Ornate !== 'undefined' ? Ornate.questDone : null;
      if (od) Ornate.questDone = () => {};
      let r;
      try { r = c0.apply(this, arguments); } finally { if (od) Ornate.questDone = od; }
      try { QuestUI.banner({ key: 'q:' + q.id, name: q.title, note: L(`ได้รับ ${Quest.rewardText(q)}`, `Received ${Quest.rewardText(q)}`) }); } catch (e) { console.error(e); }
      return r;
    };
    const rt = Quest.renderTracker; // แถบติดตามสร้างใหม่ทุกครั้งที่ความคืบหน้าเปลี่ยน → ใส่แถบรับรางวัลกลับ
    Quest.renderTracker = function () { const r = rt.apply(this, arguments); try { if (QuestUI.chip && G.player) QuestUI.trackChip(); } catch (e) { console.error(e); } return r; };
    const t0 = Quest.tick; let at = 0;
    Quest.tick = function () {
      const r = t0.apply(this, arguments);
      try { if (G.started && G.player && G.time >= at) { at = G.time + 0.5; QuestUI.watch(); } } catch (e) { console.error(e); }
      return r;
    };
    if (typeof Daily !== 'undefined') {
      const b0 = Daily.badge;
      Daily.badge = function () { const r = b0.apply(this, arguments); try { if (G.started) QuestUI.stamp(document.querySelector('#menubar button[data-win="w-quest"] .dl-badge')); } catch (e) { console.error(e); } return r; };
    }
    if (typeof UIKit !== 'undefined' && UIKit.paintQtBtn) {
      const p0 = UIKit.paintQtBtn;
      UIKit.paintQtBtn = function () { const r = p0.apply(this, arguments); try { QuestUI.stamp(document.querySelector('#qt-btn .qt-badge')); } catch (e) { console.error(e); } return r; };
      const o0 = UIKit.openQuestBook;
      UIKit.openQuestBook = function () { if (QuestUI.list().some(x => x.kind !== 'daily')) { Sound.play('click'); QuestUI.openBook(); return; } return o0.apply(this, arguments); };
    }
    // "รับรางวัล" ค่าหัว: ถึงตัว Rolf แล้วเปิดบอร์ดค่าหัวทันที (บอร์ดเดิม — รับรางวัลด้วยโค้ดเดิม)
    const g0 = NPC.scripts.guide;
    if (g0) NPC.scripts.guide = async function (n) {
      if (QuestUI.board > performance.now() && Bounty.ready().length) { QuestUI.board = 0; await NPC.bountyBoard(`[${n.name}]`); return; }
      QuestUI.board = 0;
      return g0.apply(this, arguments);
    };
  };
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true }); else install(); }
})();
