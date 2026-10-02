'use strict';
// ============================================================
//  ความสะใจ (docs/GAME_FEEL.md • Top 5) — ไฟล์แยก เกี่ยวเข้าระบบด้วยการห่อฟังก์ชันเดิม ไม่เปลี่ยนตัวเลขเกม
//  1) CHAIN: ฆ่าต่อเนื่องภายใน 3 วิ นับเลขเด้งมุมขวา + เสียงไต่ระดับ • หลัก 5/10/25/50/100 = ฉลอง
//  2) ลูกแสงรางวัล: ฆ่าแล้วลูกแสง EXP เด้งออกจากศพบินเข้าตัว • ของที่เก็บอัตโนมัติบินเข้าตัวตามสีความหายาก
//  3) เลเวลอัป: โลกหยุดหนึ่งจังหวะ + วงแหวนทองกวาดพื้น + เลข LV ใหญ่กลางจอ + ป้ายเลเวลเด้ง
//  4) ลำดับความหายากของดรอป: uncommon ก็มีเสียง/วง • Epic แยกจาก Legendary ชัด (เสียง/แฟลช/สโลว์)
//  5) ตีบวก: ค้อน 3 จังหวะ → เงียบ → ผล (Feel.forge ใช้ใน npc.js)
//  ภาพทั้งหมดไม่ทำงานตอน G.fastSim (เทสต์/บอทจำลอง) • คุณภาพ 'low' = อนุภาคน้อยลง
// ============================================================
const Feel = (() => {
  const F = { chain: 0, chainT: -9, el: null, lvEl: null, orbN: 0 };
  const vis = () => typeof G !== 'undefined' && !G.fastSim && typeof document !== 'undefined';
  const low = () => typeof R !== 'undefined' && R.quality === 'low';
  const semi = n => Math.pow(2, n / 12);
  const chime = (f, at, vol, dur) => { if (typeof Sound !== 'undefined' && Sound.ctx && G.player && G.player.options.sound) Sound.chime(f, at, vol, dur); };
  const RANK_COL = ['#ffffff', '#7dff9a', '#6cc8ff', '#c98aff', '#ffcf4a'];

  // ---------- 1) CHAIN ----------
  F.chainEl = () => {
    if (F.el) return F.el;
    const el = document.createElement('div'); el.id = 'chain';
    el.innerHTML = '<b></b><small>CHAIN</small><i><s></s></i>';
    (document.getElementById('hud') || document.body).appendChild(el);
    return (F.el = el);
  };
  F.onKill = m => {
    if (!vis() || !m || !m.def || m.def.dummy) return;
    F.chain = G.time - F.chainT < 3 ? F.chain + 1 : 1; F.chainT = G.time;
    const n = F.chain;
    if (n >= 2) {
      const el = F.chainEl();
      el.querySelector('b').textContent = '×' + n;
      el.classList.toggle('hot', n >= 10);
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop', 'on');
      const s = el.querySelector('s'); s.style.animation = 'none'; void s.offsetWidth; s.style.animation = '';
      chime(660 * semi(Math.min(12, n - 1)), 0, 0.022, 0.22); // เสียงไต่ขึ้นทีละครึ่งเสียง
    }
    if ([5, 10, 25, 50, 100].includes(n)) {
      const p = G.player;
      addFloater(p.x, p.y - 2.3, `×${n} CHAIN!`, n >= 25 ? '#ff9a3a' : '#ffd23a', true);
      if (typeof Juice !== 'undefined') { Juice.flash('gold', n >= 25 ? 0.5 : 0.28); if (n >= 25) Juice.shake(3, 0.15); }
      [0, 4, 7, 12].forEach((s2, i) => chime(880 * semi(s2 + Math.min(12, n / 5)), i * 0.05, 0.035, 0.5));
    }
  };
  F.tickChain = () => {
    if (!F.ub && typeof G !== 'undefined' && G.started && G.player) F.ultDraw();
    if (F.el && F.el.classList.contains('on') && (typeof G === 'undefined' || G.time - F.chainT > 3 || G.time < F.chainT)) { F.el.classList.remove('on'); F.chain = 0; }
  };

  // ---------- 2) ลูกแสงรางวัล (เอฟเฟกต์ในโลก วาดผ่าน R.drawFx) ----------
  // เด้งโค้งขึ้นจากจุดเกิด 0.3 วิ → ค้าง 0.08 → พุ่งเข้าตัวผู้เล่น (ease-in) 0.32 วิ • ถึงตัว = เสียงกริ๊งตามความหายาก
  F.orbs = (x, y, n, col, rank = 0, icon = null) => {
    if (!vis() || !G.player) return;
    const cap = low() ? 5 : 14;
    for (let i = 0; i < n && F.orbN < cap; i++) {
      F.orbN++;
      const a = Math.random() * Math.PI * 2, r = 0.35 + Math.random() * 0.45;
      G.fx.push({ type: 'feel_orb', feel: true, t: -i * 0.035, dur: 0.72, x, y, ox: Math.cos(a) * r, oy: Math.sin(a) * r * 0.6, col, rank, icon, done: false });
    }
  };
  F.drawFx = (g, f) => {
    if (f.type === 'feel_orb') return F.drawOrb(g, f);
    if (f.type === 'feel_nova') return F.drawNova(g, f);
    if (f.type === 'feel_ripple') return F.drawRipple(g, f);
  };
  F.drawOrb = (g, f) => {
    if (f.t < 0) return;
    const p = G.player, P = R.py;
    let x, y, h;
    if (f.t < 0.3) { const k = f.t / 0.3, e = 1 - (1 - k) * (1 - k); x = f.x + f.ox * e; y = f.y + f.oy * e; h = 26 * Math.sin(k * Math.PI) + 14 * k; }
    else if (f.t < 0.38) { x = f.x + f.ox; y = f.y + f.oy; h = 14; }
    else {
      const k = Math.min(1, (f.t - 0.38) / 0.32), e = k * k * k;
      x = f.x + f.ox + (p.x - f.x - f.ox) * e; y = f.y + f.oy + (p.y - f.y - f.oy) * e; h = 14 + 16 * e;
      if (k >= 1 && !f.done) { f.done = true; F.orbN = Math.max(0, F.orbN - 1); chime([1568, 1976, 2349, 3136, 3520][f.rank] || 1568, 0, 0.018, 0.18); F.gain(); }
    }
    if (f.done) return;
    const X = x * TILE, Y = P(y * TILE) - h;
    g.save(); g.globalCompositeOperation = 'lighter';
    const r = f.icon ? 9 : 5;
    const gr = g.createRadialGradient(X, Y, 0, X, Y, r * 2.4);
    gr.addColorStop(0, f.col); gr.addColorStop(0.35, f.col + 'aa'); gr.addColorStop(1, f.col + '00');
    g.fillStyle = gr; g.beginPath(); g.arc(X, Y, r * 2.4, 0, 7); g.fill();
    g.restore();
    if (f.icon) { const im = f.icon; g.drawImage(im, X - 8, Y - 8, 16, 16); }
    else { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(X, Y, 2, 0, 7); g.fill(); }
  };
  // แถบ EXP สว่างวาบเมื่อลูกแสงถึงตัว (CSS)
  F.gain = () => {
    for (const id of ['bi-bexp', 'exp-line-fill']) {
      const el = document.getElementById(id); if (!el) continue;
      el.classList.remove('gain'); void el.offsetWidth; el.classList.add('gain');
    }
  };

  // ---------- 3) เลเวลอัป ----------
  F.nova = (col, rad) => { if (vis()) G.fx.push({ type: 'feel_nova', feel: true, t: 0, dur: 0.6, ref: G.player, x: G.player.x, y: G.player.y, col, rad }); };
  F.drawNova = (g, f) => {
    const k = Math.min(1, f.t / f.dur), P = R.py, X = f.ref.x * TILE, Y = P(f.ref.y * TILE);
    const r = (1 - (1 - k) * (1 - k)) * f.rad * TILE;
    g.save(); g.globalCompositeOperation = 'lighter';
    g.translate(X, Y); g.scale(1, R.K);
    g.strokeStyle = f.col; g.globalAlpha = 1 - k; g.lineWidth = 10 * (1 - k) + 2;
    g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke();
    g.lineWidth = 3; g.globalAlpha = (1 - k) * 0.6; g.beginPath(); g.arc(0, 0, r * 0.7, 0, 7); g.stroke();
    g.restore();
  };
  F.banner = (text, sub, job) => {
    if (!vis()) return;
    let el = F.lvEl;
    if (!el) { el = document.createElement('div'); el.id = 'lv-banner'; (document.getElementById('hud') || document.body).appendChild(el); F.lvEl = el; }
    el.className = job ? 'job' : '';
    el.innerHTML = `<b>${text}</b><small>${sub}</small>`;
    void el.offsetWidth; el.classList.add('show');
    clearTimeout(F.lvT); F.lvT = setTimeout(() => el.classList.remove('show'), 1700);
  };
  F.levelUp = (base, job) => {
    if (!vis()) return;
    const p = G.player;
    if (base) {
      if (typeof Juice !== 'undefined') { Juice.dilate(0.25, 0.18, true); Juice.flash('gold', 0.55); Juice.shake(2.5, 0.16); }
      F.nova('#ffd66a', 6);
      F.banner(`LV ${p.baseLv}`, 'BASE LEVEL UP', false);
      const b = document.getElementById('bi-lvbadge'); if (b) { b.classList.remove('lvpop'); void b.offsetWidth; b.classList.add('lvpop'); }
      [523, 659, 784, 1047, 1319].forEach((f2, i) => chime(f2, 0.05 + i * 0.07, 0.04, 0.8));
    } else if (job) {
      F.nova('#8fd8ff', 4);
      F.banner(`JOB ${p.jobLv}`, 'JOB LEVEL UP', true);
    }
  };

  // ---------- 4) ลำดับความหายากของดรอป ----------
  F.lootCue = (rank, x, y, looted, id) => {
    if (!vis()) return;
    const col = RANK_COL[rank] || '#ffffff';
    if (looted) F.orbs(x, y, 1, col, rank, typeof itemIconCanvas === 'function' ? itemIconCanvas(id) : null);
    if (rank === 1) { chime(1568, 0, 0.02, 0.3); return; }
    if (rank >= 3 && typeof Juice !== 'undefined') {
      Juice.dilate(rank >= 4 ? 0.15 : 0.4, rank >= 4 ? 0.3 : 0.12, rank >= 4);
      Juice.shake(rank >= 4 ? 4 : 2, 0.15);
      Juice.flash('gold', rank >= 4 ? 0.6 : 0.3);
    }
  };

  // ---------- 5) ตีบวก: ค้อน 3 จังหวะ (quick = โหมดตีอัตโนมัติ: 1 จังหวะ เวลาเท่าเดิม) ----------
  F.forge = async quick => {
    const p = G.player, beats = quick ? 1 : 3;
    for (let i = 0; i < beats; i++) {
      if (typeof Sound !== 'undefined') Sound.play('hit');
      chime(392 * semi(i * 2), 0, 0.03, 0.25);
      if (vis() && typeof Juice !== 'undefined') { Juice.shake(1.2 + i * 0.6, 0.08); Juice.sparks({ x: p.x, y: p.y, def: {} }, '#ffd27a', 6 + i * 3, 34); }
      await new Promise(r => setTimeout(r, quick ? 380 : 120));
    }
    if (!quick) await new Promise(r => setTimeout(r, 220)); // เงียบลุ้น
  };
  F.forgeResult = (ok, lv) => {
    if (!vis() || typeof Juice === 'undefined') return;
    const p = G.player;
    if (ok) {
      Juice.flash('gold', lv >= 7 ? 0.7 : 0.35); Juice.dilate(0.3, 0.12, true);
      if (lv >= 7) { F.nova('#ffd66a', 4); Juice.shake(3, 0.2); }
      if (lv >= 10) F.banner(`+${lv}`, 'LEGENDARY REFINE', false);
    } else {
      Juice.sparks({ x: p.x, y: p.y, def: {} }, '#9aa0aa', 12, 40); Juice.shake(1.5, 0.1);
      addFloater(p.x, p.y - 1.9, 'CRACK…', '#b8bec8');
    }
  };

  // ---------- 6) ไม้ตาย RAGNARÖK (เกจ) ----------
  // ตีโดน +2 • ฆ่า +5 (CHAIN 5 ขึ้นไป +2 เพิ่ม) → เต็ม 100 กดปุ่ม/คีย์ T: คัตอินชื่อ Class + สโลว์ + คลื่นกระแทกรัศมี 5 ช่อง
  // ดาเมจ = ตีแรง 3 เท่าของการตีปกติ (เลือกกายภาพหรือเวท ที่แรงกว่า) ใส่มอนทุกตัวในวง • ไม่ใช้ในลานประลอง/ตอนตาย • บอทไม่กดให้
  const ULT_MAX = 100, ULT_R = 5;
  const ULT_COL = { einherjar: '#ff6a5a', runecaster: '#6ec8ff', wildhunter: '#8cff7a', volva: '#ffd76e', trickster: '#c88aff', berserker: '#ff9a3a', novice: '#bff4ff' };
  F.ultCol = () => { const p = G.player, b = (JOBS[p.job] && JOBS[p.job].parent) || p.job; return ULT_COL[b] || '#ffd76e'; };
  F.ultGain = n => {
    const p = G.player; if (!p || p.dead || F.ultBusy || performance.now() < (F.ultQuiet || 0)) return; // ไม้ตายเอง (และศพที่ตายตามมา) ไม่เติมเกจ
    const was = p.ult || 0; p.ult = Math.min(ULT_MAX, was + n);
    if (was < ULT_MAX && p.ult >= ULT_MAX && vis()) { chime(1047, 0, 0.04, 0.5); chime(1568, 0.08, 0.04, 0.6); if (typeof UI !== 'undefined') UI.msg(L('⚡ เกจไม้ตายเต็ม! กด T หรือปุ่ม ULT', '⚡ Ultimate ready! Press T or the ULT button'), 'lvl'); }
    F.ultDraw();
  };
  F.ultBtn = () => {
    if (F.ub) return F.ub;
    const b = document.createElement('button'); b.id = 'ult-btn'; b.type = 'button';
    b.title = L('ไม้ตาย (T) — ตีและฆ่ามอนเพื่อเติมเกจ', 'Ultimate (T) — hit and kill monsters to charge');
    b.innerHTML = '<i></i><b>ULT</b><small>0%</small>';
    b.onclick = () => F.ultFire();
    const dock = document.getElementById('dock'), auto = document.getElementById('auto-btn');
    if (dock && auto) auto.after(b); else document.body.appendChild(b);
    return (F.ub = b);
  };
  F.ultDraw = () => {
    if (typeof document === 'undefined' || !G.player) return;
    const b = F.ultBtn(), v = G.player.ult || 0, k = v / ULT_MAX;
    b.style.setProperty('--k', k); b.style.setProperty('--uc', F.ultCol());
    b.querySelector('small').textContent = v >= ULT_MAX ? 'READY' : Math.floor(k * 100) + '%';
    b.title = `${F.ULTS[F.ultKind()].name} — ${F.ULTS[F.ultKind()].desc}\n` + L('เกจไม่เต็ม: กดเพื่อเลือกไม้ตาย • เต็ม: กด T หรือปุ่มนี้', 'Not full: click to choose • Full: press T or this button');
    b.classList.toggle('ready', v >= ULT_MAX);
  };
  // ไม้ตายแบบบัฟ ให้ผู้เล่นเลือกเอง (เจ้าของ: เน้นบัฟพื้นฐาน — ไม้ตายโจมตี RAGNARÖK/METEOR ถูกถอด 2026-10-02) (กดปุ่ม ULT ตอนเกจยังไม่เต็ม = เปิดตัวเลือก) • บันทึกใน p.ultKind
  F.ULTS = {
    fury: { name: 'BERSERK FURY', th: L('โหมดคลั่ง', 'Fury'), desc: L('10 วินาที: ATK/MATK +25% ตีเร็วขึ้น 30%', '10s: ATK/MATK +25%, attack speed +30%') },
    aegis: { name: 'VALKYRIE AEGIS', th: L('โล่วาลคิรี', 'Aegis'), desc: L('ฟื้น HP/SP เต็ม + อมตะ 4 วินาที', 'Full HP/SP + invulnerable for 4s') },
  };
  F.ultKind = () => { const k = G.player && G.player.ultKind; return F.ULTS[k] ? k : 'fury'; };
  F.ultPick = () => {
    if (typeof UI === 'undefined' || !UI.menu) return;
    const keys = Object.keys(F.ULTS);
    UI.menu(L('เลือกไม้ตาย', 'Choose Ultimate'), L('เลือกไม้ตายที่จะใช้ตอนเกจเต็ม (เปลี่ยนได้ตลอด)', 'Pick the ultimate you will unleash when the gauge is full (change anytime)'),
      [...keys.map(k => `${k === F.ultKind() ? '✔ ' : ''}${F.ULTS[k].name} — ${F.ULTS[k].desc}`), 'Cancel']).then(i => {
      if (i >= 0 && i < keys.length) { G.player.ultKind = keys[i]; F.ultDraw(); if (typeof saveGame === 'function') saveGame(); }
    }).catch(() => {});
  };
  F.ultFire = () => {
    const p = G.player;
    if (!p || p.dead) return;
    if ((p.ult || 0) < ULT_MAX) { F.ultPick(); return; } // ยังไม่เต็ม: เลือกไม้ตาย
    if (!G.map || G.map.def.pvp) return;
    p.ult = 0; F.ultDraw();
    const kind = F.ultKind(), U2 = F.ULTS[kind], col = F.ultCol(), job = JOBS[p.job] ? JOBS[p.job].name : '';
    p.atkAnim = 1; p.skillPose = G.time; p.skillKind = 'buff';
    if (vis()) {
      F.banner(U2.name, job.toUpperCase(), false);
      if (F.lvEl) F.lvEl.style.setProperty('--uc', col), F.lvEl.classList.add('ult');
      if (typeof Juice !== 'undefined') { Juice.flash('gold', 0.8); Juice.shake(4, 0.45); } // ไม่สโลว์: ผู้เล่นคนอื่นเห็นตัวเราเดินตามปกติ
      F.nova(col, ULT_R); setTimeout(() => F.nova('#ffffff', ULT_R * 0.7), 120); setTimeout(() => F.nova(col, ULT_R * 1.2), 240);
      [262, 330, 392, 523, 659, 784].forEach((f2, i) => chime(f2, i * 0.045, 0.05, 0.9));
      Sound.play(kind === 'aegis' ? 'heal' : 'crit');
    }
    if (kind === 'fury') {
      p.ultBuffUntil = G.time + 10; recalc(); addFloater(p.x, p.y - 2, 'FURY!', col, true);
      setTimeout(() => { if (G.player === p) { recalc(); if (typeof UI !== 'undefined') UI.dirty(); } }, 10100);
    } else if (kind === 'aegis') {
      p.hp = p.d.maxHp; p.sp = p.d.maxSp; p.invulnUntil = G.time + 4;
      addFloater(p.x, p.y - 2, 'AEGIS!', '#fff1a8', true);
    }
  };
  // ---------- 7) vibe เมาส์: เคอร์เซอร์ธีมนอร์ส + วงกระเพื่อมตอนคลิกพื้น ----------
  const svgCur = (svg, hx, hy, fb) => `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") ${hx} ${hy}, ${fb}`;
  F.CURSOR = {
    default: svgCur('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><path d="M3 2 L3 22 L8.5 17 L12.5 26 L16 24.5 L12 15.8 L19.5 15.5 Z" fill="#1a1308" stroke="#ffd66a" stroke-width="1.6" stroke-linejoin="round"/><path d="M5.5 7 L5.5 17" stroke="#6ff3ff" stroke-width="1.2" opacity=".85"/></svg>', 3, 2, 'default'),
    mob: svgCur('<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><g stroke-linecap="round"><path d="M5 5 L22 22 M25 5 L8 22" stroke="#1a0a08" stroke-width="5"/><path d="M5 5 L22 22 M25 5 L8 22" stroke="#ff6a5a" stroke-width="2.6"/><path d="M19 25 L25 19 M11 25 L5 19" stroke="#ffd66a" stroke-width="2.4"/></g></svg>', 15, 14, 'crosshair'),
    talk: svgCur('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><path d="M4 5 H24 V18 H13 L7 24 V18 H4 Z" fill="#14202c" stroke="#ffd66a" stroke-width="1.6" stroke-linejoin="round"/><circle cx="10" cy="11.5" r="1.4" fill="#6ff3ff"/><circle cx="14" cy="11.5" r="1.4" fill="#6ff3ff"/><circle cx="18" cy="11.5" r="1.4" fill="#6ff3ff"/></svg>', 4, 5, 'pointer'),
    grab: svgCur('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><path d="M8 13 V7 a2 2 0 0 1 4 0 V12 V5 a2 2 0 0 1 4 0 V12 V6.5 a2 2 0 0 1 4 0 V13 V10 a2 2 0 0 1 4 0 V17 c0 5 -3 8 -8 8 h-2 c-3 0 -5 -2 -7 -5 l-3 -5 a2 2 0 0 1 3 -2 z" fill="#2a1f10" stroke="#ffd66a" stroke-width="1.5" stroke-linejoin="round"/></svg>', 14, 6, 'pointer'),
    skill: svgCur('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="none" stroke="#6ff3ff" stroke-width="2"/><circle cx="16" cy="16" r="2.2" fill="#ffd66a"/><path d="M16 2 V9 M16 23 V30 M2 16 H9 M23 16 H30" stroke="#ffd66a" stroke-width="2" stroke-linecap="round"/></svg>', 16, 16, 'crosshair'),
  };
  F.cursorFor = () => {
    if (G.pendingSkill) return F.CURSOR.skill;
    const h = G.hover; if (!h) return F.CURSOR.default;
    return h.kind === 'mob' ? F.CURSOR.mob : h.kind === 'npc' ? F.CURSOR.talk : h.kind === 'drop' ? F.CURSOR.grab : F.CURSOR.default;
  };
  F.ripple = (wx, wy, col) => { if (vis()) G.fx.push({ type: 'feel_ripple', feel: true, t: 0, dur: 0.45, x: wx / TILE, y: wy / TILE, col }); };
  F.drawRipple = (g, f) => {
    const k = Math.min(1, f.t / f.dur), X = f.x * TILE, Y = R.py(f.y * TILE);
    g.save(); g.translate(X, Y); g.scale(1, R.K); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 2; i++) {
      const kk = Math.max(0, k - i * 0.25) / (1 - i * 0.25); if (kk <= 0) continue;
      g.globalAlpha = (1 - kk) * 0.9; g.strokeStyle = f.col; g.lineWidth = 2.4 * (1 - kk) + 0.6;
      g.beginPath(); g.arc(0, 0, 4 + kk * 22, 0, 7); g.stroke();
    }
    g.globalAlpha = (1 - k); g.fillStyle = '#ffffff'; for (let i = 0; i < 4; i++) { const a = i * 1.5708 + k * 2; g.fillRect(Math.cos(a) * (6 + k * 16) - 1, Math.sin(a) * (6 + k * 16) - 1, 2, 2); }
    g.restore();
  };
  F.installMouse = () => {
    if (typeof updateHover === 'function' && !updateHover._feel) {
      const u0 = updateHover;
      updateHover = function () { // eslint-disable-line no-global-assign
        const r = u0.apply(this, arguments);
        try { if (R.cv && R.mouse.x >= 0) { const c = F.cursorFor(); if (R.cv.style.cursor !== c) R.cv.style.cursor = c; } } catch (e) { /* ใช้เคอร์เซอร์เดิม */ }
        return r;
      };
      updateHover._feel = true;
    }
    const cv = document.getElementById('cv');
    if (cv && !cv._feelRipple) {
      cv._feelRipple = true;
      cv.addEventListener('pointerdown', e => {
        if (e.button !== 0 || typeof G === 'undefined' || !G.started || !G.player || G.player.dead) return;
        const h = G.hover;
        setTimeout(() => { if (R.mouse && R.mouse.wx != null) F.ripple(R.mouse.wx, R.mouse.wy, h && h.kind === 'mob' ? '#ff6a5a' : h && h.kind === 'npc' ? '#ffd66a' : '#6ff3ff'); }, 0);
      });
    }
  };

  // ---------- เกี่ยวเข้าระบบ ----------
  F.install = () => {
    if (typeof R !== 'undefined' && R.drawFx && !R.drawFx._feel) {
      const d0 = R.drawFx; R.drawFx = (g, f, t) => (f.feel ? F.drawFx(g, f, t) : d0(g, f, t)); R.drawFx._feel = true;
    }
    if (typeof killMob === 'function' && !killMob._feel) {
      const k0 = killMob;
      killMob = function (m) { // eslint-disable-line no-global-assign
        const r = k0.apply(this, arguments);
        try {
          F.onKill(m);
          if (m.def && !m.def.dummy) F.ultGain(5 + (F.chain >= 5 ? 2 : 0));
          const boss = m.def && (m.def.boss || m.isMvp || m.isWB);
          if (m.def && !m.def.dummy) F.orbs(m.x, m.y, boss ? 10 : 2 + (Math.random() < 0.5 ? 1 : 0), '#7fd4ff');
        } catch (e) { /* ภาพล้วน ไม่ให้กระทบเกม */ }
        return r;
      };
      killMob._feel = true;
    }
    if (typeof gainExp === 'function' && !gainExp._feel) {
      const g0 = gainExp;
      gainExp = function () { // eslint-disable-line no-global-assign
        const p = G.player, b0 = p.baseLv, j0 = p.jobLv;
        const r = g0.apply(this, arguments);
        try { if (p.baseLv > b0 || p.jobLv > j0) F.levelUp(p.baseLv > b0, p.jobLv > j0); } catch (e) { /* ภาพล้วน */ }
        return r;
      };
      gainExp._feel = true;
    }
    if (typeof dropItemOnGround === 'function' && !dropItemOnGround._feel) {
      const d0 = dropItemOnGround;
      dropItemOnGround = function (id, x, y) { // eslint-disable-line no-global-assign
        const it = ITEMS[id], rank = it && it.type !== 'card' && typeof LOOT !== 'undefined' ? LOOT.rank(id) : 0, n0 = G.drops.length;
        const r = d0.apply(this, arguments);
        try { if (rank >= 1 || G.drops.length === n0) F.lootCue(rank, x, y, G.drops.length === n0, id); } catch (e) { /* ภาพล้วน */ }
        return r;
      };
      dropItemOnGround._feel = true;
    }
    if (typeof applyHit === 'function' && !applyHit._feel) {
      const a0 = applyHit;
      applyHit = function (m, r) { // eslint-disable-line no-global-assign
        const res = a0.apply(this, arguments);
        try { if (m && !m.isPlayer && r && !r.miss && G.player && !G.player.dead) F.ultGain(2); } catch (e) { /* ภาพล้วน */ }
        return res;
      };
      applyHit._feel = true;
    }
    if (typeof recalc === 'function' && !recalc._feel) {
      const r0 = recalc;
      recalc = function () { // eslint-disable-line no-global-assign
        const res = r0.apply(this, arguments);
        const p = G.player, d = p && p.d;
        if (d && p.ultBuffUntil > G.time) { // โหมดคลั่ง (ไม้ตาย fury)
          d.atkPct += 25; d.matkMin = Math.floor(d.matkMin * 1.25); d.matkMax = Math.floor(d.matkMax * 1.25);
          d.aspdDelay = Math.max(200, Math.floor(d.aspdDelay * 0.7)); d.aspd = Math.floor(200 - d.aspdDelay / 10);
        }
        return res;
      };
      recalc._feel = true;
    }
    if (typeof damagePlayer === 'function' && !damagePlayer._feel) {
      const d0 = damagePlayer;
      damagePlayer = function () { // eslint-disable-line no-global-assign
        const p = G.player;
        if (p && p.invulnUntil > G.time) { if (Math.random() < 0.3) addFloater(p.x, p.y - 1.4, 'Block', '#fff1a8'); return; } // โล่วาลคิรี
        return d0.apply(this, arguments);
      };
      damagePlayer._feel = true;
    }
    setInterval(F.tickChain, 250);
    setTimeout(() => { if (G.player) F.ultDraw(); }, 0);
    window.addEventListener('load', () => F.installMouse()); // updateHover อยู่ใน main.js (โหลดหลังไฟล์นี้)
    // เปลี่ยนแผนที่/ตาย = ล้าง CHAIN
    if (typeof changeMap === 'function' && !changeMap._feel) {
      const c0 = changeMap;
      changeMap = function () { F.chain = 0; F.chainT = -9; F.orbN = 0; if (F.el) F.el.classList.remove('on'); return c0.apply(this, arguments); }; // eslint-disable-line no-global-assign
      changeMap._feel = true;
    }
  };
  return F;
})();
Feel.install();
