'use strict';
// ============================================================
//  ภาพประกอบจากไฟล์ (ใส่ไว้ในโฟลเดอร์ assets/ ตามชื่อไฟล์ใน art/PROMPTS.md)
//  ถ้าไม่มีไฟล์ เกมจะใช้ภาพที่วาดด้วยโค้ดแทนโดยอัตโนมัติ
// ============================================================

const ART_KEYS = [
  'keyart', 'logo',
  ...['novice', 'einherjar', 'runecaster', 'wildhunter', 'volva', 'trickster', 'berserker'].flatMap(j => [`job_${j}_f`, `job_${j}_m`]),
  ...['bifrost', 'jobmaster', 'tool', 'weapon', 'armor', 'refine', 'nurse', 'guide'].map(n => `npc_${n}`),
  'mvp_seraph_pudding', 'mvp_kitsura',
];

const Art = {
  imgs: {},
  load() {
    for (const k of ART_KEYS) {
      const img = new Image();
      img.onload = () => { this.imgs[k] = img; this.onLoad(k); };
      img.onerror = () => {};
      img.src = `assets/${k}.png`;
    }
  },
  has(k) { return !!this.imgs[k]; },
  get(k) { return this.imgs[k] || null; },
  // ภาพตัวละครตามอาชีพและเพศ (ถ้าไม่มีเพศนั้นใช้อีกเพศแทน)
  jobKey(job, gender) {
    const a = `job_${job}_${gender === 'm' ? 'm' : 'f'}`, b = `job_${job}_${gender === 'm' ? 'f' : 'm'}`;
    return this.has(a) ? a : this.has(b) ? b : null;
  },
  onLoad(k) {
    if (k === 'keyart' || k === 'logo' || k.startsWith('job_')) applyTitleArt();
    if (typeof UI !== 'undefined' && G.player) { const cv = document.getElementById('bi-portrait'); if (cv) cv.dataset.key = ''; }
  },
  // หาตำแหน่งหัวจากความทึบของภาพ (ภาพเต็มตัวพื้นโปร่งใส) เพื่อครอปเป็นรูปโปรไฟล์
  faceRect(img) {
    if (img._face) return img._face;
    let top = 0.03, cx = 0.5;
    try {
      const W = 96, H = Math.round(96 * img.height / img.width);
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0, W, H);
      const d = g.getImageData(0, 0, W, H).data;
      const solid = (x, y) => d[(y * W + x) * 4 + 3] > 128;
      let ty = -1;
      for (let y = 0; y < H && ty < 0; y++) for (let x = 0; x < W; x++) if (solid(x, y)) { ty = y; break; }
      if (ty >= 0) {
        let sx = 0, n = 0;
        for (let y = ty; y < Math.min(H, ty + Math.round(H * 0.07)); y++) for (let x = 0; x < W; x++) if (solid(x, y)) { sx += x; n++; }
        top = ty / H; if (n) cx = sx / n / W;
      }
    } catch (e) { /* ภาพจาก file:// อ่านพิกเซลไม่ได้ ใช้ค่าประมาณ */ }
    const size = img.height * 0.2;
    const x = U.clamp(cx * img.width - size / 2, 0, img.width - size), y = U.clamp(top * img.height - size * 0.08, 0, img.height - size);
    return (img._face = { x, y, size });
  },
  drawFace(g, img, w, h) {
    const f = this.faceRect(img);
    g.drawImage(img, f.x, f.y, f.size, f.size * h / w, 0, 0, w, h);
  },
  // วาดภาพลงแคนวาสแบบ cover (ครอปให้เต็มกรอบ) โดยให้น้ำหนักด้านบน (หน้า)
  drawCover(g, img, w, h, focusY = 0.18) {
    const s = Math.max(w / img.width, h / img.height);
    const dw = img.width * s, dh = img.height * s;
    g.drawImage(img, (w - dw) / 2, -(dh - h) * focusY, dw, dh);
  },
};

function applyTitleArt() {
  const t = document.getElementById('title');
  if (!t) return;
  if (Art.has('keyart')) {
    t.style.backgroundImage = `linear-gradient(rgba(5,8,16,.25), rgba(5,8,16,.55) 60%, rgba(5,8,16,.9)), url("${Art.get('keyart').src}")`;
    t.style.backgroundSize = 'cover'; t.style.backgroundPosition = 'center';
    t.classList.add('has-art');
  }
  // ภาพตัวละครบนหน้าไตเติล (ใช้ภาพอาชีพที่มีอยู่ภาพแรก)
  const hero = ['job_novice_f', 'job_novice_m', ...ART_KEYS.filter(k => k.startsWith('job_'))].find(k => Art.has(k));
  if (hero && !document.getElementById('title-hero')) {
    t.prepend(Object.assign(new Image(), { id: 'title-hero', src: Art.get(hero).src, alt: '' }));
    t.classList.add('has-hero');
  }
  if (Art.has('logo')) {
    const l = document.querySelector('.logo');
    if (l && !l.querySelector('img')) { l.textContent = ''; l.append(Object.assign(new Image(), { src: Art.get('logo').src, alt: 'NEO MIDGARD' })); l.classList.add('logo-img'); }
  }
}
