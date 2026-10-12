'use strict';
// ------------------------------------------------------------
//  โหมดประหยัดแบต (รอบ 38b) — ตัวเลือกใน options.saver (เซฟไปกับตัวละคร)
//  เปิด = เฟรมเรต 30 (AUTO/Fly Pilot ไม่แตะจอ 10 วิ → 15) · DPR 1 + กราฟิก "ประหยัด" บังคับ (R.setQuality)
//  · ตัวเลขดาเมจ/ข้อความลอยน้อยลง · HUD เช็กช้าลงครึ่งหนึ่ง · แท็บซ่อน = ไม่วาด (การจำลอง/AUTO ยังเดินด้วยตัวจับเวลา 1 วิใน main.js)
// ------------------------------------------------------------
const Battery = {
  last: 0, n: 0, lastInput: performance.now(), suggested: false,
  on() { return !!(typeof G !== 'undefined' && G.player && G.player.options && G.player.options.saver); },
  idle() { return performance.now() - this.lastInput > 10000; },
  // เฟรมเรตเป้าหมายตอนนี้ (0 = ไม่จำกัด)
  fps() {
    if (!this.on()) return 0;
    const auto = (typeof Bot !== 'undefined' && Bot.on) || (typeof FlyPilot !== 'undefined' && FlyPilot.on);
    return auto && this.idle() ? 15 : 30;
  },
  // เรียกต้นลูป rAF: true = ข้ามเฟรมนี้ (ไม่วาด ไม่จำลองเพิ่ม)
  skip(ts) {
    if (this.on()) {
      if (document.hidden) return true;
      const f = this.fps();
      if (ts - this.last < 1000 / f - 3) return true;
    }
    this.last = ts; this.n++;
    return false;
  },
  set(v) {
    const p = G.player; if (!p) return;
    p.options.saver = !!v;
    R.setQuality(p.options.gfx);
    if (typeof GpuFX !== 'undefined') GpuFX.sync();
    saveGame();
    if (typeof UI !== 'undefined' && UI.isOpen('w-options')) UI.renderOptions(true);
    if (typeof HudC !== 'undefined' && HudC.paintSheet) HudC.paintSheet();
  },
  toggle() { this.set(!this.on()); },
  poke() { this.lastInput = performance.now(); },
  // แบตต่ำ (<20% และไม่ได้ชาร์จ) → ชวนเปิดครั้งเดียวต่อเซสชัน
  async suggest() {
    if (this.suggested || !navigator.getBattery) return;
    try {
      const b = await navigator.getBattery();
      if (this.suggested || this.on() || !(b.level < 0.2) || b.charging) return;
      this.suggested = true;
      this.toast();
    } catch (e) { /* เบราว์เซอร์ไม่อนุญาต */ }
  },
  toast() {
    let el = document.getElementById('bat-toast'); if (el) el.remove();
    const off = () => { el.remove(); };
    el = h('div', { id: 'bat-toast', role: 'status', 'aria-live': 'polite' },
      h('span', {}, L('แบตเหลือน้อย — เปิดโหมดประหยัดแบตไหม?', 'Battery is low — turn on Battery Saver?')),
      h('button', { type: 'button', class: 'bat-on', onclick: () => { this.set(true); off(); } }, L('เปิดเลย', 'Turn on')),
      h('button', { type: 'button', class: 'bat-no', onclick: off }, L('ไว้ก่อน', 'Not now')));
    document.body.append(el);
    setTimeout(() => { if (el.isConnected) el.remove(); }, 15000);
  },
};
for (const ev of ['pointerdown', 'pointermove', 'touchstart', 'keydown', 'wheel']) window.addEventListener(ev, () => Battery.poke(), { capture: true, passive: true });
