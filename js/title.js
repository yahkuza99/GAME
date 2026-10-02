'use strict';
// ============================================================
//  หน้าไตเติล: ภาพหน้าปก (keyart) ซูมช้า ๆ • ระหว่างโหลด = ท้องฟ้า ออโรรา สะพานบิฟรอสต์
//  + ตัวละครโชว์สลับ Class ไปเรื่อย ๆ
// ============================================================

const Title = {
  cv: null, g: null, W: 0, H: 0, dpr: 1, stars: [], motes: [],
  heroKeys: [], heroIdx: 0, heroAt: 0, heroEl: [null, null], heroFront: 0,

  init() {
    this.cv = document.getElementById('title-bg');
    if (!this.cv) return;
    this.g = this.cv.getContext('2d');
    const rnd = U.seeded(7);
    for (let i = 0; i < 140; i++) this.stars.push({ x: rnd(), y: rnd() * 0.7, s: 0.6 + rnd() * 1.6, ph: rnd() * 6.28, sp: 0.6 + rnd() * 1.5 });
    for (let i = 0; i < 40; i++) this.motes.push({ x: rnd(), y: rnd(), s: 1 + rnd() * 2.2, v: 0.012 + rnd() * 0.02, ph: rnd() * 6.28 });
    this.heroEl = [document.getElementById('title-hero-a'), document.getElementById('title-hero-b')];
  },
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const W = window.innerWidth, H = window.innerHeight;
    if (this.W === W && this.H === H && this.dpr === dpr) return;
    this.W = W; this.H = H; this.dpr = dpr;
    this.cv.width = Math.floor(W * dpr); this.cv.height = Math.floor(H * dpr);
  },
  draw(t) {
    if (!this.cv || !this.g) return;
    this.resize();
    const g = this.g, W = this.W, H = this.H;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // มีภาพหน้าปก (keyart): ใช้เป็นฉากหลัง ซูมช้า ๆ + แสงลอย + ไล่มืดด้านซ้ายให้อ่านเมนูง่าย
    const key = typeof Art !== 'undefined' && Art.get('keyart');
    document.getElementById('title').classList.toggle('has-keyart', !!key);
    // ภาพหน้าปกโหลดเสร็จแล้ว: ค่อย ๆ จางเข้า (ระหว่างรอโหลดเห็นแค่ท้องฟ้า+ออโรรา ไม่ใช่ภาพเมืองแบบเก่า)
    if (key && this.keyT == null) this.keyT = t;
    const fade = key ? Math.min(1, (t - this.keyT) / 0.7) : 0;
    if (key && fade >= 1) {
      const z = 1.06 + Math.sin(t * 0.05) * 0.04;
      const s = Math.max(W / key.width, H / key.height) * z;
      const dw = key.width * s, dh = key.height * s;
      // จอแนวตั้ง: เลื่อนให้เห็นกลุ่มฮีโร่ตรงกลาง
      const fx = W < H ? 0.48 : 0.5;
      g.drawImage(key, (W - dw) * fx + Math.sin(t * 0.03) * 10, (H - dh) * 0.6, dw, dh);
      const side = g.createLinearGradient(0, 0, W, 0);
      side.addColorStop(0, W < 760 ? 'rgba(4,6,15,0.35)' : 'rgba(4,6,15,0.82)'); side.addColorStop(W < 760 ? 1 : 0.55, 'rgba(4,6,15,0)');
      g.fillStyle = side; g.fillRect(0, 0, W, H);
      const bot = g.createLinearGradient(0, H * 0.55, 0, H);
      bot.addColorStop(0, 'rgba(4,6,15,0)'); bot.addColorStop(1, 'rgba(4,6,15,0.7)');
      g.fillStyle = bot; g.fillRect(0, H * 0.55, W, H * 0.45);
      for (const m of this.motes) {
        m.y -= m.v * (1 / 60); if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
        g.fillStyle = `rgba(170,235,255,${0.25 + 0.35 * Math.sin(t * 2 + m.ph)})`;
        g.beginPath(); g.arc(m.x * W + Math.sin(t + m.ph) * 8, m.y * H, m.s, 0, 7); g.fill();
      }
      return;
    }
    this.drawSky(t);
    if (key) { // กำลังจางเข้า: วาดภาพหน้าปกทับท้องฟ้าด้วยความโปร่งใสที่เพิ่มขึ้น
      const s = Math.max(W / key.width, H / key.height) * 1.06, dw = key.width * s, dh = key.height * s;
      g.globalAlpha = fade; g.drawImage(key, (W - dw) * (W < H ? 0.48 : 0.5), (H - dh) * 0.6, dw, dh); g.globalAlpha = 1;
    }
  },
  // ฉากรอระหว่างโหลดภาพหน้าปก: ท้องฟ้า ดาว สะพานรุ้ง ออโรรา (เลิกวาดเส้นขอบฟ้าตึก/ภูเขาแบบเก่าแล้ว — เจ้าของเห็นเป็น "รูปตึกเก่า" ก่อนภาพจริง)
  drawSky(t) {
    const g = this.g, W = this.W, H = this.H;
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
  },

  // ตัวละครโชว์: สลับ Class ทุก 6 วินาที (ครอสเฟด)
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
