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

// ไอคอน/ภาพย่อย (ตัดจากชีตที่สร้างใน ChatGPT) โหลดตาม assets/manifest.json เท่านั้น
// ชื่อไฟล์: skill_<id>, item_<id>, item_card, emblem_<job>, mob_<id>, map_<id>
const Art = {
  imgs: {},
  load() {
    // f = ชื่อไฟล์ (เช่น skill_fire_rune.webp) หรือ key ล้วน (ลอง .webp แล้วค่อย .png)
    const probe = f => {
      const k = f.replace(/\.(webp|png)$/, ''), exts = /\.(webp|png)$/.test(f) ? [''] : ['.webp', '.png'];
      const tryAt = i => {
        const img = new Image();
        img.onload = () => { this.imgs[k] = img; this.onLoad(k); };
        img.onerror = () => { if (i + 1 < exts.length) tryAt(i + 1); };
        img.src = `assets/${f}${exts[i]}`;
      };
      tryAt(0);
    };
    if (location.protocol === 'file:') { ART_KEYS.forEach(probe); return; } // เปิดไฟล์ตรง ๆ อ่าน manifest ไม่ได้
    fetch('assets/manifest.json').then(r => (r.ok ? r.json() : Promise.reject())).then(list => list.forEach(probe))
      .catch(() => ART_KEYS.forEach(probe));
  },
  // ไอคอนไอเทม: ภาพเฉพาะชิ้น > ชิปการ์ดรวม > วาดด้วยโค้ด
  itemKey(id) {
    if (this.imgs['item_' + id]) return 'item_' + id;
    if (ITEMS[id] && ITEMS[id].type === 'card' && this.imgs.item_card) return 'item_card';
    return null;
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
    if ((k.startsWith('ground_') || k.startsWith('prop_')) && typeof G !== 'undefined' && G.map) {
      clearTimeout(this._regen);
      this._regen = setTimeout(() => {
        for (const id in G.mapCache || {}) if (G.mapCache[id] !== G.map) delete G.mapCache[id];
        G.map.renderGround(); G.map._imgs = null;
      }, 60);
    }
    if (k.startsWith('item_') || k.startsWith('skill_') || k.startsWith('emblem_')) {
      if (typeof clearIconCache === 'function') clearIconCache();
      if (typeof UI !== 'undefined') UI.dirty();
    }
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
      // ค้นเฉพาะกลางภาพ กันอาวุธ/เอฟเฟกต์ที่ยื่นสูงกว่าหัว
      const x0 = Math.round(W * 0.28), x1 = Math.round(W * 0.72);
      for (let y = 0; y < H && ty < 0; y++) for (let x = x0; x < x1; x++) if (solid(x, y)) { ty = y; break; }
      if (ty >= 0) {
        let sx = 0, n = 0;
        for (let y = ty; y < Math.min(H, ty + Math.round(H * 0.07)); y++) for (let x = x0; x < x1; x++) if (solid(x, y)) { sx += x; n++; }
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
  if (Art.has('logo')) {
    const l = document.querySelector('.logo');
    if (l && !l.querySelector('img')) { l.textContent = ''; l.append(Object.assign(new Image(), { src: Art.get('logo').src, alt: 'NEO MIDGARD' })); l.classList.add('logo-img'); }
  }
}
