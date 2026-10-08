'use strict';
// ============================================================
//  ฉากหลังบทนำ (2026-10-08 เจ้าของ: "AAA = vibe ความสวย" • ถาม "เสร็จทางเนื้อเรื่องคัทซีน?")
//  เดิมบทนำเป็นตัวหนังสือบนพื้นดำล้วน → วาดฉากตามบรรทัด (โค้ดล้วน ไม่ใช้ภาพ) ใต้ตัวหนังสือ:
//    0 ต้นไม้ใหญ่ น้ำเลี้ยงสีทองไหลขึ้นกิ่ง  1 กิ่งใหญ่ทั้งเก้าหักพร้อมกัน (แสงแตก + ประกาย)  2 ต้นไม้หม่น จุดฟ้าจาง ๆ "ถูกปลุกซ้ำ"
//    3 มืดลงเกือบหมด  4 แสงวิเซอร์สีฟ้าจากล่าง  5 ใบไม้ใบแรกงอกที่ยอด (ชื่อบท "ใบแรก")
//  ผูกกับ #prologue ของ js/story.js ด้วย MutationObserver (ไม่แก้ลำดับบทนำเดิม) • แถบดำบน-ล่างแบบภาพยนตร์ • ลดการเคลื่อนไหว = ภาพนิ่ง
// ============================================================
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function tree(seed) {
    // กิ่งแบบสุ่มคงที่ (seed เดิม = ต้นเดิม) • 9 กิ่งหลักจากลำต้น
    let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const segs = [];
    const grow = (x, y, a, len, w, depth, main) => {
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      segs.push({ x, y, x2, y2, w, depth, main });
      if (depth >= 5) return;
      const n = depth === 0 ? 0 : 2;
      for (let i = 0; i < n; i++) grow(x2, y2, a + (i ? 1 : -1) * (0.28 + rnd() * 0.32), len * (0.68 + rnd() * 0.12), w * 0.62, depth + 1, main);
    };
    grow(0, 0, -Math.PI / 2, 0.30, 0.06, 0, -1); // ลำต้น (หน่วย = ความสูงจอ)
    for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.27 + (rnd() - 0.5) * 0.08; grow(0, -0.30, a, 0.13 + rnd() * 0.04, 0.026, 1, i); }
    return segs;
  }
  function start(root) {
    const cv = document.createElement('canvas'); cv.className = 'pl-scene'; cv.setAttribute('aria-hidden', 'true');
    root.prepend(cv);
    const bars = [document.createElement('i'), document.createElement('i')]; bars.forEach((b, k) => { b.className = 'pl-bar ' + (k ? 'pl-bar-b' : 'pl-bar-t'); root.append(b); });
    const g = cv.getContext('2d'), segs = tree(7919), motes = [], sparks = [];
    let W = 0, H = 0, line = -1, lineAt = 0, raf = 0, last = performance.now(), shake = 0;
    const fit = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; };
    fit(); addEventListener('resize', fit);
    const idx = () => root.querySelectorAll('.pl-dots i.on').length - 1;
    const base = () => ({ x: W / 2, y: H * 0.98, k: Math.min(H, W * 1.2) });
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const i = idx(); if (i !== line) { line = i; lineAt = now; if (i === 1) { shake = 1; for (const sg of segs) if (sg.main >= 0 && sg.depth === 1) burst(sg); } }
      const t = (now - lineAt) / 1000, B = base();
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
      if (shake > 0) { g.translate((Math.random() - 0.5) * 10 * shake, (Math.random() - 0.5) * 6 * shake); shake = Math.max(0, shake - dt * 1.6); }
      // ความสว่างของต้นไม้ตามบรรทัด
      const glow = line <= 0 ? Math.min(1, t / 1.4) : line === 1 ? 1 - Math.min(0.55, t * 0.5) : line === 2 ? 0.4 : line === 3 ? Math.max(0.08, 0.4 - t * 0.4) : line === 4 ? 0.22 : 0.5;
      const broken = line >= 1, fall = line === 1 ? Math.min(1, t / 1.2) : line > 1 ? 1 : 0;
      g.lineCap = 'round';
      for (const sg of segs) {
        const lost = broken && sg.main >= 0 && sg.depth >= 2; // กิ่งปลายร่วงหลังหัก
        if (lost && fall >= 1) continue;
        const dy = lost ? fall * fall * 0.35 : 0, a = lost ? 1 - fall : 1;
        const x1 = B.x + sg.x * B.k, y1 = B.y + (sg.y + dy) * B.k, x2 = B.x + sg.x2 * B.k, y2 = B.y + (sg.y2 + dy) * B.k;
        g.strokeStyle = `rgba(28,22,18,${0.95 * a})`; g.lineWidth = Math.max(1, sg.w * B.k);
        g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
        // เส้นน้ำเลี้ยงเรืองแสงตรงกลางกิ่ง
        const sap = line >= 2 ? '150,190,210' : '255,206,110';
        g.strokeStyle = `rgba(${sap},${0.55 * glow * a})`; g.lineWidth = Math.max(0.6, sg.w * B.k * 0.22);
        g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
      }
      // น้ำเลี้ยงลอยขึ้น (บรรทัด 0) / ฝุ่นจาง (หลังจากนั้น)
      if (!reduce && motes.length < (line <= 0 ? 70 : 28) && Math.random() < 0.6) motes.push({ x: W / 2 + (Math.random() - 0.5) * W * 0.5, y: H * (0.55 + Math.random() * 0.45), v: 12 + Math.random() * 30, r: 0.8 + Math.random() * 1.8, a: 0, gold: line <= 0 });
      g.globalCompositeOperation = 'lighter';
      for (let k = motes.length - 1; k >= 0; k--) {
        const m = motes[k]; m.y -= m.v * dt; m.a = Math.min(1, m.a + dt * 1.5);
        if (m.y < H * 0.12) { motes.splice(k, 1); continue; }
        g.fillStyle = m.gold ? `rgba(255,210,120,${0.5 * m.a * glow})` : `rgba(160,200,230,${0.25 * m.a})`;
        g.beginPath(); g.arc(m.x, m.y, m.r, 0, 7); g.fill();
      }
      for (let k = sparks.length - 1; k >= 0; k--) {
        const p = sparks[k]; p.t += dt; if (p.t > p.d) { sparks.splice(k, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt;
        g.fillStyle = `rgba(255,${150 + 80 * (1 - p.t / p.d)},80,${1 - p.t / p.d})`; g.beginPath(); g.arc(p.x, p.y, 1.8, 0, 7); g.fill();
      }
      // บรรทัด 1: แสงแตกตรงรอยหัก
      if (line === 1 && t < 0.6) {
        for (const sg of segs) if (sg.main >= 0 && sg.depth === 1) {
          const x = B.x + sg.x2 * B.k, y = B.y + sg.y2 * B.k, r = 50 * (1 - t / 0.6) + 8;
          const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,240,200,0.9)'); gr.addColorStop(1, 'rgba(255,120,60,0)');
          g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        }
      }
      // บรรทัด 2: จุดฟ้า "ถูกปลุกซ้ำ" กะพริบบนกิ่งที่เหลือ
      if (line === 2) for (let k = 0; k < 7; k++) {
        const sg = segs[(k * 5 + 3) % segs.length]; if (sg.main >= 0 && sg.depth >= 2) continue;
        const a = 0.5 + 0.5 * Math.sin(now / 400 + k * 1.7), x = B.x + sg.x2 * B.k, y = B.y + sg.y2 * B.k;
        g.fillStyle = `rgba(98,227,255,${0.5 * a})`; g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill();
      }
      // บรรทัด 5: ใบไม้ใบแรกงอกที่ยอดลำต้น
      if (line >= 5) {
        const x = B.x, y = B.y - 0.30 * B.k - 6, s = Math.min(1, t / 1.2) * 16, a = Math.min(1, t / 1.2);
        const gr = g.createRadialGradient(x, y, 0, x, y, 60); gr.addColorStop(0, `rgba(140,255,200,${0.35 * a})`); gr.addColorStop(1, 'rgba(98,227,255,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, 60, 0, 7); g.fill();
        g.fillStyle = `rgba(170,255,190,${a})`; g.beginPath(); g.ellipse(x, y - s * 0.5, s * 0.42, s, 0.35, 0, 7); g.fill();
      }
      g.globalCompositeOperation = 'source-over';
      if (!root.isConnected) { cancelAnimationFrame(raf); removeEventListener('resize', fit); return; }
      raf = requestAnimationFrame(frame);
    }
    function burst(sg) {
      if (reduce) return; const B = base(), x = B.x + sg.x2 * B.k, y = B.y + sg.y2 * B.k;
      for (let k = 0; k < 10; k++) sparks.push({ x, y, vx: (Math.random() - 0.5) * 220, vy: -60 - Math.random() * 140, t: 0, d: 0.6 + Math.random() * 0.6 });
    }
    raf = requestAnimationFrame(frame);
  }
  new MutationObserver(recs => { for (const r of recs) for (const n of r.addedNodes) if (n.id === 'prologue') start(n); })
    .observe(document.body, { childList: true });
})();
// ฉากเล่าเรื่องเต็มจอ (#illust.scene จาก UI.illust): ประกายไฟลอยขึ้นช้า ๆ เหนือภาพ ใต้เงาขอบ — หยุดเองเมื่อปิดฉาก
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let raf = 0;
  const run = el => {
    cancelAnimationFrame(raf);
    let cv = el.querySelector('.scene-motes');
    if (!cv) { cv = document.createElement('canvas'); cv.className = 'scene-motes'; el.append(cv); }
    const g = cv.getContext('2d'), ps = []; let last = performance.now();
    const step = now => {
      if (!el.classList.contains('scene') || !el.classList.contains('show')) { g.clearRect(0, 0, cv.width, cv.height); return; }
      if (cv.width !== el.clientWidth || cv.height !== el.clientHeight) { cv.width = el.clientWidth; cv.height = el.clientHeight; } else g.clearRect(0, 0, cv.width, cv.height); // ขยายแคนวาสเฉพาะตอนขนาดเปลี่ยน
      const W = cv.width, H = cv.height, dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (ps.length < 60 && Math.random() < 0.5) ps.push({ x: Math.random() * W, y: H * (0.6 + Math.random() * 0.4), vx: (Math.random() - 0.5) * 18, vy: -(20 + Math.random() * 45), r: 0.8 + Math.random() * 2.2, t: 0, d: 3 + Math.random() * 4 });
      g.globalCompositeOperation = 'lighter';
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i]; p.t += dt; if (p.t > p.d) { ps.splice(i, 1); continue; }
        p.x += (p.vx + Math.sin(now / 700 + i) * 8) * dt; p.y += p.vy * dt;
        const a = Math.sin(Math.PI * p.t / p.d);
        g.fillStyle = `rgba(255,${170 + (i % 3) * 25},90,${0.75 * a})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill();
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };
  const el = document.getElementById('illust'); if (!el) return;
  new MutationObserver(() => { if (el.classList.contains('scene') && el.classList.contains('show')) run(el); }).observe(el, { attributes: true, attributeFilter: ['class'] });
})();
