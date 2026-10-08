'use strict';
// ============================================================
//  แรงกระแทกตอนสกิลโดน (2026-10-08 เจ้าของ: "AAA = vibe ความสวย" • ถ่ายฉากจริงแล้วสกิลส่วนใหญ่แทบไม่มีภาพตอนโดน)
//  • ทุกสกิลที่โดนเป้า: แฟลชแกนสว่าง + วงคลื่นขยาย + ประกายพุ่งออกตามสีธาตุ (บวกแสง) — คริ ใหญ่และนานกว่า
//  • ตอนร่าย (จ่าย SP/HP): วงอักษรรูนบนพื้นใต้ตัว สีประจำสาย (สีเดียวกับ js/class-trait-fx.js)
//  • วาดด้วยโค้ดล้วน ไม่ใช้ภาพ (ภาพเอฟเฟกต์เฉพาะสกิลยังเป็นงานของ Codex) • จำกัดพร้อมกัน 8 วง • คุณภาพ low = เบาลงครึ่ง • fastSim ไม่วาด
// ============================================================
const ImpactFX = (() => {
  const EL = { fire: '255,140,60', water: '120,210,255', ice: '150,225,255', wind: '170,255,190', thunder: '255,240,130', earth: '220,180,110',
    holy: '255,245,190', shadow: '185,130,255', ghost: '200,170,255', poison: '160,255,110', neutral: '255,255,255' };
  const ROOT = { einherjar: '255,225,155', runecaster: '135,240,255', wildhunter: '185,255,145', volva: '255,245,185', trickster: '220,170,255', berserker: '255,140,90' };
  const live = () => G.fx.filter(f => f.impactFx && f.t < f.dur).length;
  function hit(m, opts, el) {
    if (G.fastSim || !m || live() >= 8) return;
    const s = opts && opts.src && SKILLS[opts.src]; if (!s) return;
    const col = EL[el || (s.dmg && s.dmg.element) || 'neutral'] || EL.neutral, crit = !!(opts && opts.crit);
    G.fx.push({ type: 'impact_fx', impactFx: true, kind: 'hit', ref: m, x: m.x, y: m.y, col, crit, seed: Math.random() * 6.28,
      r: (m.def && m.def.scale) || 1, t: 0, dur: crit ? 0.5 : 0.36 });
  }
  function cast(p) {
    if (G.fastSim || !p) return;
    const col = ROOT[typeof jobRoot === 'function' ? jobRoot(p.job) : p.job] || '255,230,170';
    G.fx.push({ type: 'impact_fx', impactFx: true, kind: 'cast', x: p.x, y: p.y, col, t: 0, dur: 0.55, seed: Math.random() * 6.28 });
  }
  function draw(g, f) {
    const k = U.clamp(f.t / f.dur, 0, 1), low = R.quality === 'low';
    const o = f.ref && !f.ref.dead ? f.ref : f, x = o.x * TILE, y = R.py(o.y * TILE);
    g.save(); g.globalCompositeOperation = 'lighter';
    if (f.kind === 'cast') {
      // วงรูนบนพื้น: ขยายเร็วช่วงแรก แล้วหมุนจาง
      const r = (22 + 34 * Math.min(1, k * 2.2)) * (low ? 0.8 : 1), a = (1 - k) * 0.75;
      g.translate(x, y + 4); g.scale(1, R.K);
      g.strokeStyle = `rgba(${f.col},${a})`; g.lineWidth = 3;
      g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke();
      g.lineWidth = 1; g.beginPath(); g.arc(0, 0, r * 0.78, f.seed + k * 2, f.seed + k * 2 + 4.4); g.stroke();
      if (!low) { g.font = 'bold 11px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = `rgba(${f.col},${a})`;
        for (let i = 0; i < 6; i++) { const an = f.seed + i * 1.047 - k * 1.5; g.fillText('ᚠᚢᚦᚨᚱᚲ'[i], Math.cos(an) * r * 0.9, Math.sin(an) * r * 0.9); } }
      g.restore(); return;
    }
    const sz = (f.crit ? 1.45 : 1) * Math.min(1.6, 0.8 + f.r * 0.3), cy = y - 22 * f.r;
    // แกนสว่าง (สั้นมาก) → วงคลื่น → ประกาย
    const core = Math.max(0, 1 - k / 0.35);
    if (core > 0) {
      const rc = 46 * sz * (0.6 + 0.4 * (1 - core)), gr = g.createRadialGradient(x, cy, 0, x, cy, rc);
      gr.addColorStop(0, `rgba(255,255,255,${0.9 * core})`); gr.addColorStop(0.35, `rgba(${f.col},${0.7 * core})`); gr.addColorStop(1, `rgba(${f.col},0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(x, cy, rc, 0, 7); g.fill();
    }
    g.strokeStyle = `rgba(${f.col},${0.85 * (1 - k)})`; g.lineWidth = (f.crit ? 6 : 4.5) * (1 - k) + 1;
    g.beginPath(); g.ellipse(x, cy, (12 + 50 * k) * sz, (12 + 50 * k) * sz * 0.7, 0, 0, 7); g.stroke();
    if (!low || f.crit) {
      const n = f.crit ? 12 : 8;
      g.lineCap = 'round'; g.lineWidth = f.crit ? 4 : 3;
      for (let i = 0; i < n; i++) {
        const an = f.seed + i * 6.283 / n, r0 = (10 + 46 * k) * sz, r1 = r0 + (24 - 14 * k) * sz;
        g.strokeStyle = `rgba(${i % 2 ? '255,255,255' : f.col},${1 - k})`;
        g.beginPath(); g.moveTo(x + Math.cos(an) * r0, cy + Math.sin(an) * r0 * 0.7); g.lineTo(x + Math.cos(an) * r1, cy + Math.sin(an) * r1 * 0.7); g.stroke();
      }
    }
    g.restore();
  }
  const draw0 = R.drawFx;
  R.drawFx = function (g, f, t) { if (f.impactFx) return draw(g, f); return draw0.apply(this, arguments); };
  // ดักที่ damageMob (ทุกทางของดาเมจผ่านที่นี่ — รูน/พื้นที่/ลูกธนู Class 2-3 ไม่ผ่าน applyHit) • สกิลเดียวกันเป้าเดียวกันเว้น 0.15 วิ (พื้นที่/หลายฮิตไม่ถี่เกิน)
  const hitAt = new WeakMap();
  const dmg0 = damageMob;
  damageMob = function (m, dmg, opts = {}) {
    const alive = m && !m.dead, res = dmg0.apply(this, arguments);
    if (alive && dmg > 0 && !m.isPlayer && !opts.dot && opts.src && SKILLS[opts.src]) {
      const k = hitAt.get(m) || {}; if (!(G.time - (k[opts.src] ?? -9) < 0.15)) { k[opts.src] = G.time; hitAt.set(m, k); hit(m, opts, opts.element || opts.emEl); }
    }
    return res;
  };
  // วงรูนตอนร่าย: ดักตอนจ่าย SP/HP ของสกิล (paySkill) — ทุกสกิลจ่ายที่นี่ รวมสกิลขยายของ js/class-expansion.js ที่ไม่ผ่าน executeSkill เดิม
  const pay0 = paySkill;
  paySkill = function () {
    const res = pay0.apply(this, arguments);
    if (G.player && !G.player.dead) cast(G.player);
    return res;
  };
  return { hit, cast };
})();
