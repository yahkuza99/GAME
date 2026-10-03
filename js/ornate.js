'use strict';
// ============================================================
//  Ornate — ชั้นตกแต่งล้วน (css/theme6.css) • ไม่แตะตรรกะเกม/ID เดิม • ทุกชิ้นที่เพิ่ม = aria-hidden + pointer-events:none
//  1) มุมหน้าต่าง: <i class="orn-k"> (ลายถักนอร์ส 4 มุม + ชั้นประกายทองตอนเปิด) ใส่ให้ทุก .win เมื่อเปิด
//  2) กดปุ่ม: ฝุ่นแสงเล็ก ๆ ตรงจุดกด (องค์ประกอบเดียวใช้ซ้ำ • transform/opacity)
//  3) สลับแท็บ: body.orn-tabsw 0.35 วิ → แท็บที่เลือกใหม่เล่นแถบทองเลื่อน + เรืองสั้น ๆ (เรนเดอร์ซ้ำทีหลังไม่เล่นซ้ำ)
//  4) ป้ายเควสต์สำเร็จ (Ornate.questDone) — ลายเครือเถาทอง + QUEST COMPLETE
//  ประหยัดเครื่อง (body.fx-low) / prefers-reduced-motion → ไม่มีฝุ่น/แอนิเมชัน (CSS ซ่อนเอง)
// ============================================================
const Ornate = (() => {
  const O = {};
  const calm = () => document.body.classList.contains('fx-low') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const deco = (cls, tag = 'i') => { const e = document.createElement(tag); e.className = cls; e.setAttribute('aria-hidden', 'true'); return e; };

  // ---------- 1) มุมหน้าต่าง ----------
  O.dress = w => {
    if (!w || w.classList.contains('gc-art') || w.querySelector(':scope > .orn-k')) return;
    w.append(deco('orn-k'));
  };
  O.dressAll = () => document.querySelectorAll('.win').forEach(O.dress);

  // ---------- 2) ฝุ่นแสงตอนกด ----------
  const PRESS = '.btn, .dlg-opt, .tab, .pill, .seg button, .rb-tab, .qt-tab, #menubar button, .hb, #auto-btn, #ult-btn, .tp-btn, #qt-btn, .win-x';
  const TABS = '.tab, .pill, .seg button, .rb-tab, .qt-tab';
  let dust = null, tabT = 0;
  const onDown = e => {
    const t = e.target.closest && e.target.closest(PRESS);
    if (!t || t.disabled) return;
    if (t.matches(TABS) && !t.classList.contains('on')) {
      document.body.classList.add('orn-tabsw'); clearTimeout(tabT);
      tabT = setTimeout(() => document.body.classList.remove('orn-tabsw'), 350);
    }
    if (calm()) return;
    if (!dust) { dust = deco('', 'div'); dust.id = 'orn-dust'; document.body.append(dust); }
    dust.style.transform = `translate(${Math.round(e.clientX)}px, ${Math.round(e.clientY)}px)`;
    dust.classList.remove('go'); void dust.offsetWidth; dust.classList.add('go');
  };

  // ---------- 4) ป้ายเควสต์สำเร็จ ----------
  let qc = null, qcT = 0;
  O.questDone = () => {
    if (document.hidden || typeof G === 'undefined' || !G.started) return;
    if (!qc) {
      qc = deco('', 'div'); qc.id = 'orn-qc';
      qc.append(deco('orn-fl'), Object.assign(document.createElement('b'), { textContent: 'QUEST COMPLETE' }));
      (document.getElementById('hud') || document.body).append(qc);
    }
    qc.classList.remove('show'); void qc.offsetWidth; qc.classList.add('show');
    clearTimeout(qcT); qcT = setTimeout(() => qc.classList.remove('show'), 1900);
  };

  O.init = () => {
    O.dressAll();
    if (typeof UI !== 'undefined' && UI.open && !UI.open._orn) {
      const open0 = UI.open;
      UI.open = function (id) { O.dress(document.getElementById(id)); return open0.apply(this, arguments); };
      UI.open._orn = true;
    }
    addEventListener('pointerdown', onDown, { capture: true, passive: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', O.init); else O.init();
  return O;
})();
