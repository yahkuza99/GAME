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
    if (k === 'keyart' || k === 'logo') applyTitleArt();
    if (typeof UI !== 'undefined' && G.player) { const cv = document.getElementById('bi-portrait'); if (cv) cv.dataset.key = ''; }
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
  if (Art.has('logo')) {
    const l = document.querySelector('.logo');
    if (l && !l.querySelector('img')) { l.textContent = ''; l.append(Object.assign(new Image(), { src: Art.get('logo').src, alt: 'NEO MIDGARD' })); l.classList.add('logo-img'); }
  }
}
