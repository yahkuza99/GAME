'use strict';
// ============================================================
//  การควบคุมแบบ PAD: จอยสติกบนจอ (มือถือ/แท็บเล็ต) + จอยเกม (Gamepad API)
// ============================================================

const Pad = {
  mode: 'auto',         // auto | on | off  (ตั้งแยกต่อเครื่อง)
  vec: { x: 0, y: 0 },  // ทิศจากจอยบนจอ
  gvec: { x: 0, y: 0 }, // ทิศจากจอยเกม
  joyId: null, joyOrigin: null,
  gp: { prev: [], connected: false, repeatAt: {} },

  init() {
    try { this.mode = localStorage.getItem('nm_pad') || 'auto'; } catch (e) { /* ใช้ค่าเริ่มต้น */ }
    this.bindJoystick();
    $('#pad-atk').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); Sound.ensure(); UI.autoFoldMenu(); this.interact(); $('#pad-atk').classList.add('press'); });
    const rel = () => $('#pad-atk').classList.remove('press');
    $('#pad-atk').addEventListener('pointerup', rel); $('#pad-atk').addEventListener('pointercancel', rel); $('#pad-atk').addEventListener('pointerleave', rel);
    window.addEventListener('gamepadconnected', e => {
      this.gp.connected = true;
      if (G.started) UI.msg(L(`🎮 เชื่อมต่อจอย: ${e.gamepad.id.slice(0, 40)} — A โจมตี/คุย, X Y LB RB = สกิล 1-4, D-pad = สกิล 5-8, LT/RT = ไอเทม`, `🎮 Gamepad connected: ${e.gamepad.id.slice(0, 40)} — A attack/talk, X Y LB RB = skills 1-4, D-pad = skills 5-8, LT/RT = items`), 'info');
    });
    window.addEventListener('gamepaddisconnected', () => { this.gp.connected = [...(navigator.getGamepads ? navigator.getGamepads() : [])].some(Boolean); });
    matchMedia('(pointer: coarse)').addEventListener?.('change', () => this.apply());
    this.apply();
  },
  enabled() { return this.mode === 'on' || (this.mode === 'auto' && matchMedia('(pointer: coarse)').matches); },
  setMode(m) {
    this.mode = m;
    try { localStorage.setItem('nm_pad', m); } catch (e) { /* ไม่เป็นไร */ }
    this.apply();
  },
  apply() {
    document.body.classList.toggle('pad-mode', this.enabled());
    if (typeof UI !== 'undefined') UI.syncCombatFold?.();
    if (!this.enabled()) this.releaseJoy();
  },

  // ---------------- จอยสติกบนจอ ----------------
  bindJoystick() {
    const zone = $('#joy-zone'), base = $('#joy'), knob = $('#joy-knob');
    const R = 46;
    zone.addEventListener('pointerdown', e => {
      UI.autoFoldMenu();
      if (this.joyId != null) return;
      e.preventDefault(); e.stopPropagation();
      Sound.ensure();
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      this.joyId = e.pointerId;
      try { zone.setPointerCapture(e.pointerId); } catch (err) { /* บางเบราว์เซอร์ไม่รองรับ */ }
      // จุดศูนย์กลางลอยตามนิ้วที่แตะ (ภายในโซนด้านซ้ายล่าง)
      const zr = zone.getBoundingClientRect();
      this.joyOrigin = { x: e.clientX, y: e.clientY };
      base.style.left = (e.clientX - zr.left) + 'px'; base.style.top = (e.clientY - zr.top) + 'px';
      base.classList.add('on');
      knob.style.transform = 'translate(-50%, -50%)';
      this.vec.x = 0; this.vec.y = 0;
    });
    zone.addEventListener('pointermove', e => {
      if (e.pointerId !== this.joyId || !this.joyOrigin) return;
      let dx = e.clientX - this.joyOrigin.x, dy = e.clientY - this.joyOrigin.y;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      this.vec.x = dx / R; this.vec.y = dy / R;
    });
    const end = e => { if (e.pointerId === this.joyId) this.releaseJoy(); };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
  },
  releaseJoy() {
    this.joyId = null; this.vec.x = 0; this.vec.y = 0;
    const base = $('#joy'), knob = $('#joy-knob');
    if (base) { base.classList.remove('on'); base.style.left = ''; base.style.top = ''; }
    if (knob) knob.style.transform = 'translate(-50%, -50%)';
  },

  // เรียกทุกเฟรมจากลูปหลัก
  update() {
    this.pollGamepad();
    const v = Math.hypot(this.gvec.x, this.gvec.y) > Math.hypot(this.vec.x, this.vec.y) ? this.gvec : this.vec;
    if (Math.hypot(v.x, v.y) < 0.35) return false;
    // แปลงเวกเตอร์เป็น 8 ทิศ
    const a = Math.atan2(v.y, v.x);
    const oct = Math.round(a / (Math.PI / 4));
    const dx = Math.round(Math.cos(oct * Math.PI / 4)), dy = Math.round(Math.sin(oct * Math.PI / 4));
    stepMove(dx, dy);
    return true;
  },

  // ---------------- ปุ่มโจมตีอัจฉริยะ ----------------
  nearestMob(maxD = 12) {
    const p = G.player;
    let best = null, bd = maxD;
    for (const m of G.mobs) {
      if (m.dead) continue;
      const d = U.dist(p.x, p.y, m.x, m.y);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  },
  interact() {
    const p = G.player;
    if (!G.started || !p || p.dead) return;
    if (G.pendingSkill) {
      const m = skillLockTarget();
      const id = G.pendingSkill; G.pendingSkill = null;
      if (m) beginSkill(id, skillLv(id), m); else UI.msg(L('ไม่มีเป้าหมายในระยะ', 'No target in range'), 'err');
      return;
    }
    p.sitting = false;
    Bot.manualOverride();
    // คุย NPC ที่อยู่ใกล้ > เก็บของ > โจมตีมอนใกล้สุด
    const npc = G.npcs.filter(n => NPC.inTalkRange(n, p))
      .sort((a, b) => NPC.distance(a, p) - NPC.distance(b, p))[0];
    if (npc && !(p.target && !p.target.dead)) { p.npcTarget = npc; p.path = []; return; }
    const drop = G.drops.find(d => U.dist(p.x, p.y, d.x, d.y) < 2.2);
    if (drop && !(p.target && !p.target.dead)) { p.pickTarget = drop; p.path = []; return; }
    if (p.target && !p.target.dead && U.dist(p.x, p.y, p.target.x, p.target.y) < 14) { p.repathAt = 0; return; }
    const m = this.nearestMob();
    if (m) { p.skillTarget = null; p.manualSkillLock = false; p.target = m; p.oneHit = p.options.noCtrl === false ? m : null; p.pickTarget = null; p.npcTarget = null; p.repathAt = 0; } // /nc ปิด = กดปุ่มตี 1 ที
    else if (npc) { p.npcTarget = npc; p.path = []; }
    else UI.msg(L('ไม่มีเป้าหมายใกล้ ๆ — เดินออกไปหามอนสเตอร์ก่อน', 'No target nearby — go find some monsters first'), 'info');
  },

  // ---------------- จอยเกม ----------------
  // ปุ่มมาตรฐาน: 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT, 7 RT, 8 Select, 9 Start, 12-15 D-pad
  pollGamepad() {
    this.gvec.x = 0; this.gvec.y = 0;
    if (!navigator.getGamepads) return;
    const pad = [...navigator.getGamepads()].find(Boolean);
    if (!pad) return;
    const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
    if (Math.hypot(ax, ay) > 0.3) { this.gvec.x = ax; this.gvec.y = ay; }
    const now = pad.buttons.map(b => b.pressed || b.value > 0.5);
    const hit = i => now[i] && !this.gp.prev[i];
    this.gp.prev = now;
    if (!G.started || !G.player) return;
    const menuOpen = !$('#w-dialog').classList.contains('hidden');
    if (menuOpen) {
      // บทสนทนา NPC: D-pad เลือก A ยืนยัน B ปิด
      const opts = $$('#w-dialog .dlg-opt, #w-dialog .dlg-btns .btn');
      if (opts.length) {
        let i = opts.findIndex(o => o.classList.contains('gp-sel'));
        if (hit(12) || hit(13) || (Math.abs(ay) > 0.6 && this.repeat('ay', 0.25))) {
          i = (i + ((hit(12) || ay < 0) ? -1 : 1) + opts.length) % opts.length;
          opts.forEach((o, k) => o.classList.toggle('gp-sel', k === i));
        }
        if (hit(0)) { (opts[Math.max(0, i)]).click(); return; }
      }
      if (hit(1)) UI.close('w-dialog');
      this.gvec.x = 0; this.gvec.y = 0;
      return;
    }
    if (hit(0)) this.interact();
    if (hit(1)) { if (G.pendingSkill) G.pendingSkill = null; else if (!UI.closeTop()) toggleSit(); }
    [2, 3, 4, 5].forEach((b, k) => { if (hit(b)) useHotbar(k); });
    [12, 15, 13, 14].forEach((b, k) => { if (hit(b)) useHotbar(4 + k); });
    if (hit(6)) usePotbar(0);
    if (hit(7)) usePotbar(1);
    if (hit(10)) usePotbar(2);
    if (hit(11)) usePotbar(3);
    if (hit(8)) UI.toggle('w-map');
    if (hit(9)) UI.toggleMenu();
    if (hit(16)) Bot.toggle();
  },
  repeat(k, dt) {
    const t = performance.now() / 1000;
    if ((this.gp.repeatAt[k] || 0) > t) return false;
    this.gp.repeatAt[k] = t + dt; return true;
  },
};
