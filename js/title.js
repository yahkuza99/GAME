'use strict';
// ============================================================
//  หน้าไตเติล: ฉากหลังเคลื่อนไหว (ท้องฟ้า ออโรรา สะพานบิฟรอสต์ เส้นขอบฟ้าเมือง)
//  + ตัวละครโชว์สลับคลาสไปเรื่อย ๆ
// ============================================================

const Title = {
  cv: null, g: null, W: 0, H: 0, dpr: 1, stars: [], motes: [], skyline: null,
  heroKeys: [], heroIdx: 0, heroAt: 0, heroEl: [null, null], heroFront: 0,

  init() {
    this.cv = document.getElementById('title-bg');
    if (!this.cv) return;
    this.g = this.cv.getContext('2d');
    const rnd = U.seeded(7);
    for (let i = 0; i < 140; i++) this.stars.push({ x: rnd(), y: rnd() * 0.7, s: 0.6 + rnd() * 1.6, ph: rnd() * 6.28, sp: 0.6 + rnd() * 1.5 });
    for (let i = 0; i < 40; i++) this.motes.push({ x: rnd(), y: rnd(), s: 1 + rnd() * 2.2, v: 0.012 + rnd() * 0.02, ph: rnd() * 6.28 });
    this.heroEl = [document.getElementById('title-hero-a'), document.getElementById('title-hero-b')];
    window.addEventListener('resize', () => { this.skyline = null; });
  },
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const W = window.innerWidth, H = window.innerHeight;
    if (this.W === W && this.H === H && this.dpr === dpr) return;
    this.W = W; this.H = H; this.dpr = dpr;
    this.cv.width = Math.floor(W * dpr); this.cv.height = Math.floor(H * dpr);
    this.skyline = null;
  },
  // เส้นขอบฟ้า 2 ชั้น (ภูเขาไกล + ตึกเมืองแอนดรอยด์) สร้างครั้งเดียวต่อขนาดจอ
  buildSkyline() {
    const W = this.W, H = this.H, base = H * 0.78;
    const far = [], near = [];
    for (let x = 0; x <= W + 40; x += 20) far.push({ x, y: base - 40 - U.fbm(x * 0.0025, 3, 11, 3) * H * 0.22 });
    const rnd = U.seeded(31);
    let x = -30;
    while (x < W + 60) {
      const w = 18 + rnd() * 46, h = 30 + Math.pow(rnd(), 1.6) * H * 0.34;
      near.push({ x, w, h, spire: rnd() < 0.3, lit: Array.from({ length: Math.floor(h / 14) }, () => rnd() < 0.5) });
      x += w + 4 + rnd() * 18;
    }
    this.skyline = { far, near, base };
  },
  draw(t) {
    if (!this.cv || !this.g) return;
    this.resize();
    if (!this.skyline) this.buildSkyline();
    const g = this.g, W = this.W, H = this.H, S = this.skyline;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // ท้องฟ้า
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#04060f'); sky.addColorStop(0.45, '#0a1430'); sky.addColorStop(0.78, '#173a5a'); sky.addColorStop(1, '#061018');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    // ดาว
    for (const s of this.stars) {
      const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
      g.fillStyle = `rgba(210,230,255,${a})`; g.fillRect(s.x * W, s.y * H, s.s, s.s);
    }
    // สะพานบิฟรอสต์ (โค้งรุ้งจาง ๆ)
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineWidth = 10;
    const cx = W * 0.62, cy = H * 1.05, R = Math.hypot(W, H) * 0.55;
    for (let i = 0; i < 6; i++) {
      g.strokeStyle = `hsla(${(i * 55 + t * 8) % 360},90%,70%,0.045)`;
      g.beginPath(); g.arc(cx, cy, R - i * 9, Math.PI * 1.05, Math.PI * 1.7); g.stroke();
    }
    g.restore();
    // ออโรรา: ริบบิ้นแสง 3 เส้น
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let r = 0; r < 3; r++) {
      const baseY = H * (0.16 + r * 0.09), amp = H * 0.05, hue = 160 + r * 30;
      for (let x = 0; x < W; x += 6) {
        const k = x / W;
        const y = baseY + Math.sin(k * 5 + t * 0.35 + r) * amp + Math.sin(k * 11 - t * 0.2) * amp * 0.4;
        const h = H * (0.10 + 0.05 * Math.sin(k * 7 + t * 0.5 + r * 2));
        const a = 0.05 + 0.05 * Math.sin(k * 9 + t * 0.7 + r);
        const gr = g.createLinearGradient(0, y - h, 0, y + h * 0.4);
        gr.addColorStop(0, `hsla(${hue},80%,60%,0)`); gr.addColorStop(0.6, `hsla(${hue},85%,65%,${a})`); gr.addColorStop(1, `hsla(${hue + 40},80%,70%,0)`);
        g.fillStyle = gr; g.fillRect(x - 4, y - h, 14, h * 1.4);
      }
    }
    g.restore();
    // ภูเขาไกล
    g.fillStyle = '#0b1a30';
    g.beginPath(); g.moveTo(-10, H);
    for (const p of S.far) g.lineTo(p.x, p.y);
    g.lineTo(W + 10, H); g.closePath(); g.fill();
    // หมอกหลังเมือง
    const fog = g.createLinearGradient(0, S.base - H * 0.3, 0, S.base);
    fog.addColorStop(0, 'rgba(60,140,200,0)'); fog.addColorStop(1, 'rgba(60,140,200,0.22)');
    g.fillStyle = fog; g.fillRect(0, S.base - H * 0.3, W, H * 0.3);
    // เมือง: ตึก + หน้าต่างไฟ + ยอดเสาสัญญาณ
    const shift = Math.sin(t * 0.05) * 6;
    for (const b of S.near) {
      const x = b.x + shift, top = S.base - b.h;
      g.fillStyle = '#070d1a'; g.fillRect(x, top, b.w, b.h + 4);
      g.fillStyle = 'rgba(98,227,255,0.35)'; g.fillRect(x, top, b.w, 1.5);
      if (b.spire) { g.fillStyle = '#0a1224'; g.fillRect(x + b.w / 2 - 1.5, top - 22, 3, 22); g.fillStyle = `rgba(255,90,90,${0.5 + 0.5 * Math.sin(t * 2 + x)})`; g.fillRect(x + b.w / 2 - 1.5, top - 24, 3, 3); }
      b.lit.forEach((on, i) => {
        if (!on) return;
        const flick = Math.sin(t * 0.8 + i + x * 0.1) > -0.7;
        g.fillStyle = flick ? 'rgba(140,225,255,0.55)' : 'rgba(140,225,255,0.15)';
        g.fillRect(x + 3, top + 6 + i * 14, Math.max(3, b.w * 0.25), 3);
      });
    }
    // พื้น: ระนาบโลหะมืดพร้อมเส้นไฟจาง ๆ ไล่หายไปในความมืด
    const gnd = g.createLinearGradient(0, S.base, 0, H);
    gnd.addColorStop(0, '#0e2236'); gnd.addColorStop(1, '#030608');
    g.fillStyle = gnd; g.fillRect(0, S.base, W, H - S.base);
    g.strokeStyle = 'rgba(98,227,255,0.12)'; g.lineWidth = 1;
    for (let i = 1; i < 6; i++) { const y = S.base + (H - S.base) * (i * i) / 36; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    // แสงลอย
    for (const m of this.motes) {
      m.y -= m.v * (1 / 60); if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
      const a = 0.25 + 0.35 * Math.sin(t * 2 + m.ph);
      g.fillStyle = `rgba(150,235,255,${a})`;
      g.beginPath(); g.arc(m.x * W + Math.sin(t + m.ph) * 8, m.y * H, m.s, 0, 7); g.fill();
    }
    // ขอบมืดรอบจอ
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.hypot(W, H) * 0.6);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    this.updateHero(t);
  },

  // ตัวละครโชว์: สลับคลาสทุก 6 วินาที (ครอสเฟด)
  refreshHeroes() {
    const keys = ART_KEYS.filter(k => k.startsWith('job_') && Art.has(k));
    if (keys.length === this.heroKeys.length) return;
    this.heroKeys = keys;
    if (keys.length && !this.heroEl[0].src) this.showHero(0, true);
  },
  showHero(idx, instant) {
    const key = this.heroKeys[idx]; if (!key) return;
    const next = 1 - this.heroFront, el = this.heroEl[next], cur = this.heroEl[this.heroFront];
    el.src = Art.get(key).src;
    el.classList.add('show'); cur.classList.remove('show');
    if (instant) el.style.transition = 'none';
    this.heroFront = next; this.heroIdx = idx;
    document.getElementById('title').classList.add('has-hero');
    const job = key.split('_')[1];
    const cap = document.getElementById('hero-cap');
    if (cap && JOBS[job]) cap.textContent = `${JOBS[job].name} • ${JOBS[job].thai}`;
    requestAnimationFrame(() => { el.style.transition = ''; });
  },
  updateHero(t) {
    this.refreshHeroes();
    if (this.heroKeys.length < 2) return;
    if (t - this.heroAt > 6) { this.heroAt = t; this.showHero((this.heroIdx + 1) % this.heroKeys.length); }
  },
};
