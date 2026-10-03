'use strict';
// ============================================================
//  ภาพประกอบจากไฟล์ (ใส่ไว้ในโฟลเดอร์ assets/ ตามชื่อไฟล์ใน art/PROMPTS.md)
//  ถ้าไม่มีไฟล์ เกมจะใช้ภาพที่วาดด้วยโค้ดแทนโดยอัตโนมัติ
// ============================================================

const ART_KEYS = [
  'keyart', 'logo',
  ...['novice', 'einherjar', 'runecaster', 'wildhunter', 'volva', 'trickster', 'berserker'].flatMap(j => [`job_${j}_f`, `job_${j}_m`]),
  ...['bifrost', 'jobmaster', 'tool', 'weapon', 'armor', 'refine', 'nurse', 'guide', 'storage'].map(n => `npc_${n}`),
  'mvp_seraph_pudding', 'mvp_kitsura',
];

// ไอคอน/ภาพย่อย (ตัดจากชีตที่สร้างใน ChatGPT) โหลดตาม assets/manifest.json เท่านั้น
// ชื่อไฟล์: skill_<id>, item_<id>, item_card, emblem_<job>, mob_<id>, map_<id>
const Art = {
  imgs: {},
  load() {
    // f = ชื่อไฟล์ (เช่น skill_fire_rune.webp) หรือ key ล้วน (ลอง .webp แล้วค่อย .png)
    let ver = {};
    const probe = f => {
      const k = f.replace(/\.(webp|png)$/, ''), exts = /\.(webp|png)$/.test(f) ? [''] : ['.webp', '.png'];
      const tryAt = i => {
        const img = new Image();
        img.onload = () => { this.imgs[k] = img; this.onLoad(k); };
        img.onerror = () => { if (i + 1 < exts.length) tryAt(i + 1); };
        img.src = `assets/${f}${exts[i]}` + (ver[f] ? `?v=${ver[f]}` : '');
      };
      tryAt(0);
    };
    if (location.protocol === 'file:') { ART_KEYS.forEach(probe); return; } // เปิดไฟล์ตรง ๆ อ่าน manifest ไม่ได้
    // manifest ห้ามใช้แคช: มีรหัสเวอร์ชันของภาพทุกไฟล์ (ภาพชื่อเดิมที่แก้ใหม่จะได้โหลดใหม่)
    fetch('assets/manifest.json', { cache: 'no-store' }).then(r => (r.ok ? r.json() : Promise.reject()))
      .then(m => {
        const list = Array.isArray(m) ? m : m.files; ver = (m && m.v) || {};
        // bake_*: ภาพอบ 3D ขนาดใหญ่ของแมพเดียว — ไม่โหลดตอนเปิดเกม รอ Art.need() ตอนเข้าแมพนั้น
        // ui_*: ภาพ UI (tools/ui_slice.py) ใช้ผ่าน css/ui_art.css เท่านั้น — ไม่ต้องโหลดเป็นภาพของ Art
        list.filter(f => !/\.(ogg|mp3|wav)$/.test(f) && !f.startsWith('ui_')).forEach(f => (f.startsWith('bake_') ? this.lazy.set(f.replace(/\.(webp|png)$/, ''), f) : probe(f)));
        this._probe = probe;
        for (const k of this.wanted) this.need(k);
        if (typeof Sound !== 'undefined') Sound.register(list, ver); // ไฟล์เสียงจริง (sfx_*, bgm_*)
      })
      .catch(() => ART_KEYS.forEach(probe));
  },
  // โหลดภาพตามต้องการ (bake_* — js/maps.js renderGround) • เรียกก่อน manifest มาถึงได้ (จำไว้แล้วโหลดทีหลัง) • โหลดเสร็จ → onLoad วาดพื้นใหม่
  lazy: new Map(), wanted: new Set(),
  need(k) {
    if (this.imgs[k] || this.wanted.has(k) && this._asked && this._asked.has(k)) return;
    this.wanted.add(k);
    const f = this.lazy.get(k);
    if (!f || !this._probe) return;
    (this._asked = this._asked || new Set()).add(k);
    this._probe(f);
  },
  // คืนหน่วยความจำภาพ bake_* ที่วาดลงผ้าใบพื้นแล้ว (ภาพถอดรหัสเต็มแมพหลายสิบ MB) • need() ครั้งหน้าโหลดใหม่ได้ (จากแคชเบราว์เซอร์)
  free(k) { delete this.imgs[k]; if (this._asked) this._asked.delete(k); },
  // ไอคอนไอเทม: ภาพเฉพาะชิ้น > ชิปการ์ดรวม > วาดด้วยโค้ด
  itemKey(id) {
    if (this.imgs['item_' + id]) return 'item_' + id;
    if (ITEMS[id] && ITEMS[id].type === 'card' && this.imgs.item_card) return 'item_card';
    return null;
  },
  has(k) { return !!this.get(k); },
  get(k) { return this.imgs[k] || this.derive(k); },

  // ---------------- ภาพย้อมสี (palette swap แบบ RO: Poring → Drops → Poporing) ----------------
  // มอนสีต่าง: MOBS[id].base = id มอนต้นแบบ + hue (องศา) / sat / bri / tint ('#สี' หรือ ['#สี', ความเข้ม 0..1])
  //   → ภาพของต้นแบบ (mobsprite_ / anim_mob_*_<ท่า> / mvp_) ถูกย้อมครั้งแรกที่มีคนขอ แล้วเก็บไว้ใต้คีย์ของตัวใหม่
  //   โค้ดวาดเดิมทุกจุด (Sprites.drawMob, Anim, หน้าข้อมูลมอน, รายการล่า) จึงได้ภาพสีใหม่โดยไม่ต้องแก้
  //   ถ้าภายหลังมีไฟล์ภาพของตัวใหม่จริง (assets/mobsprite_<id>.webp) ภาพจริงจะทับภาพย้อมเอง
  // ภาพอื่น: Art.alias('map_archive', 'map_helcave', { hue: 150, flip: true })
  aliases: {}, _vs: Object.create(null),
  alias(key, from, spec) { this.aliases[key] = Object.assign({ from }, spec); delete this._vs[key]; },
  derive(k) {
    let s = this._vs[k];
    if (s === undefined) s = this._vs[k] = this.variantSource(k);
    if (!s) return null;
    const img = this.get(s.from); // ต้นแบบอาจเป็นภาพย้อมอีกทอดก็ได้
    return img ? (this.imgs[k] = this.tint(img, s)) : null; // ต้นแบบยังโหลดไม่เสร็จ: ลองใหม่ครั้งหน้า
  },
  variantSource(k) {
    if (this.aliases[k]) return this.aliases[k];
    if (typeof MOBS === 'undefined') return null;
    const m = /^anim_mob_(.+)_([a-z]+)$/.exec(k) || /^(mobsprite|mvp)_(.+)$/.exec(k);
    if (!m) return null;
    const anim = k.startsWith('anim_'), d = MOBS[anim ? m[1] : m[2]];
    if (!d || !d.base || !MOBS[d.base]) return null;
    if (!anim && m[1] === 'mvp' && !d.boss) return null; // ภาพเปิดตัวบอส: เฉพาะบอสสีต่าง
    return { from: anim ? `anim_mob_${d.base}_${m[2]}` : `${m[1]}_${d.base}`, hue: d.hue, sat: d.sat, bri: d.bri, tint: d.tint };
  },
  // เมทริกซ์สีแบบเดียวกับ CSS hue-rotate() saturate() brightness() (ใช้ย้อมสีโค้ดวาด และเป็นทางสำรองเมื่อเบราว์เซอร์ไม่มี ctx.filter)
  colorMatrix(s) {
    const a = (s.hue || 0) * Math.PI / 180, c = Math.cos(a), n = Math.sin(a), v = s.sat == null ? 1 : s.sat, b = s.bri == null ? 1 : s.bri;
    const H = [0.213 + c * 0.787 - n * 0.213, 0.715 - c * 0.715 - n * 0.715, 0.072 - c * 0.072 + n * 0.928,
      0.213 - c * 0.213 + n * 0.143, 0.715 + c * 0.285 + n * 0.140, 0.072 - c * 0.072 - n * 0.283,
      0.213 - c * 0.213 - n * 0.787, 0.715 - c * 0.715 + n * 0.715, 0.072 + c * 0.928 + n * 0.072];
    const S = [0.213 + 0.787 * v, 0.715 - 0.715 * v, 0.072 - 0.072 * v, 0.213 - 0.213 * v, 0.715 + 0.285 * v, 0.072 - 0.072 * v,
      0.213 - 0.213 * v, 0.715 - 0.715 * v, 0.072 + 0.928 * v];
    const M = [];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) M.push(b * (S[i * 3] * H[j] + S[i * 3 + 1] * H[3 + j] + S[i * 3 + 2] * H[6 + j]));
    return M;
  },
  tintSpec(s) { return !s.tint ? null : Array.isArray(s.tint) ? s.tint : [s.tint, 0.3]; },
  // ย้อมสีโค้ดสีเดียว ('#rrggbb') ด้วยสูตรเดียวกับภาพ — ให้มอนที่วาดด้วยโค้ด (ตอนภาพยังไม่โหลด) สีตรงกับภาพ
  tintHex(hex, s) {
    if (typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) return hex;
    const n = parseInt(hex.slice(1), 16), rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255], M = this.colorMatrix(s), t = this.tintSpec(s);
    let o = [0, 1, 2].map(i => M[i * 3] * rgb[0] + M[i * 3 + 1] * rgb[1] + M[i * 3 + 2] * rgb[2]);
    if (t) { const m = parseInt(t[0].slice(1), 16), tc = [(m >> 16) & 255, (m >> 8) & 255, m & 255]; o = o.map((v, i) => v + (tc[i] - v) * t[1]); }
    return '#' + o.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  },
  tint(img, s) {
    const k = s.w ? Math.min(1, s.w / img.width) : 1; // w = ความกว้างสูงสุด (ย่อภาพใหญ่ เช่น ภาพแผนที่)
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    const g = c.getContext('2d'), W = c.width, H = c.height;
    const f = [s.hue ? `hue-rotate(${s.hue}deg)` : '', s.sat != null ? `saturate(${s.sat})` : '', s.bri != null ? `brightness(${s.bri})` : ''].join(' ').trim();
    const native = !!f && typeof CanvasRenderingContext2D !== 'undefined' && 'filter' in CanvasRenderingContext2D.prototype;
    const draw = () => { g.save(); if (s.flip) { g.translate(W, 0); g.scale(-1, 1); } g.drawImage(img, 0, 0, W, H); g.restore(); };
    if (native) g.filter = f;
    draw();
    g.filter = 'none';
    if (f && !native) { // Safari รุ่นเก่า (ไม่มี ctx.filter): ย้อมทีละพิกเซล
      try {
        const id = g.getImageData(0, 0, W, H), d = id.data, M = this.colorMatrix(s);
        for (let i = 0; i < d.length; i += 4) {
          if (!d[i + 3]) continue;
          const r = d[i], gg = d[i + 1], b = d[i + 2];
          d[i] = M[0] * r + M[1] * gg + M[2] * b; d[i + 1] = M[3] * r + M[4] * gg + M[5] * b; d[i + 2] = M[6] * r + M[7] * gg + M[8] * b;
        }
        g.putImageData(id, 0, 0);
      } catch (e) { /* ภาพจาก file:// อ่านพิกเซลไม่ได้ ใช้สีเดิม */ }
    }
    const t = this.tintSpec(s);
    if (t) { // เคลือบสี (เช่น สนิม) เฉพาะส่วนที่มีภาพ
      g.globalCompositeOperation = t[2] || 'source-atop'; g.globalAlpha = t[1]; g.fillStyle = t[0]; g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
      if (t[2]) { g.globalCompositeOperation = 'destination-in'; draw(); } // โหมดผสมอื่น (multiply/color) ทาเลยขอบ → ตัดตามรูปเดิม
      g.globalCompositeOperation = 'source-over';
    }
    // ใช้ใน <img src> (รายการล่า ข้อมูลมอน แบนเนอร์แผนที่) — แปลงเป็น URL ครั้งแรกที่ถูกขอเท่านั้น
    Object.defineProperty(c, 'src', { get() { if (!this._url) { try { this._url = this.toDataURL('image/webp', 0.9); } catch (e) { this._url = img.src || ''; } } return this._url; } });
    c.variantOf = s.from;
    return c;
  },
  // ภาพตัวละครตาม Class และเพศ (ถ้าไม่มีเพศนั้นใช้อีกเพศแทน)
  jobKey(job, gender) {
    const a = `job_${job}_${gender === 'm' ? 'm' : 'f'}`, b = `job_${job}_${gender === 'm' ? 'f' : 'm'}`;
    return this.has(a) ? a : this.has(b) ? b : null;
  },
  onLoad(k) {
    if (k === 'keyart' || k === 'logo' || k.startsWith('job_')) applyTitleArt();
    if ((k.startsWith('ground_') || k.startsWith('prop_') || k === 'arena_ground' || (k.startsWith('bake_') && typeof G !== 'undefined' && G.map && G.map.usesBake && G.map.usesBake(k))) && typeof G !== 'undefined' && G.map) { // ภาพพื้น/ของประดับโหลดเสร็จช้า → วาดพื้นใหม่
      clearTimeout(this._regen);
      this._regen = setTimeout(() => {
        for (const id in G.mapCache || {}) if (G.mapCache[id] !== G.map) delete G.mapCache[id];
        G.map.renderGround(); G.map._imgs = null;
      }, 60);
    }
    if (k.startsWith('rig_') && typeof Rig !== 'undefined') Rig.reset();
    if (k.startsWith('item_') || k.startsWith('skill_') || k.startsWith('emblem_') || k.startsWith('mob_') || k.startsWith('mobsprite_')) { // mob_: รูปบนชิปมอน
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
    if (l && !l.querySelector('img')) { l.textContent = ''; l.append(Object.assign(new Image(), { src: Art.get('logo').src, alt: 'IRON VALHALLA' })); l.classList.add('logo-img'); }
  }
}

// ไอคอนสกิลติดตัวชุดที่ 2: ย้อมสี + กลับด้านจากไอคอนพาสซีฟแรกของ Class (จนกว่าจะมีภาพจริง assets/skill_<id>.webp)
Art.alias('skill_valhalla_oath', 'skill_iron_body', { hue: 35, sat: 1.25, bri: 1.08, tint: ['#e0a030', 0.22], flip: true });
Art.alias('skill_runic_ward', 'skill_rune_mastery', { hue: 70, sat: 1.1, tint: ['#7ab0ff', 0.15], flip: true });
Art.alias('skill_hunters_rhythm', 'skill_eagle_eye', { hue: -85, sat: 1.3, bri: 1.05, tint: ['#ffb040', 0.18], flip: true });
Art.alias('skill_freyjas_grace', 'skill_sanctuary', { hue: -80, sat: 1.2, bri: 1.1, tint: ['#ffe08a', 0.25], flip: true });
Art.alias('skill_lokis_gambit', 'skill_shadow_step', { hue: 120, sat: 1.15, tint: ['#b07ae0', 0.2], flip: true });
Art.alias('skill_bloodthirst', 'skill_wolf_blood', { hue: -45, sat: 1.2, bri: 0.8, tint: ['#5a0030', 0.3], flip: true });

// Class ขั้นที่ 2: ภาพเต็มตัว/ตราประจำ Class ย้อมสีจาก Class แรก (จนกว่าจะมีภาพจริง assets/job_<id>_<f|m>.webp, emblem_<id>.webp)
for (const [id, spec] of Object.entries({
  valkyrie: { hue: 25, sat: 1.15, bri: 1.1, tint: ['#ffe6a0', 0.22] },
  galdr: { hue: 40, sat: 1.2, bri: 1.05, tint: ['#bfe8ff', 0.2] },
  skadi: { hue: 150, sat: 0.75, bri: 1.12, tint: ['#e8f6ff', 0.3] },
  norn: { hue: 230, sat: 1.0, bri: 1.08, tint: ['#e8d8ff', 0.25] },
  phantom: { hue: 50, sat: 1.25, bri: 0.92, tint: ['#c040a0', 0.2] },
  warlord: { hue: -15, sat: 1.1, bri: 0.85, tint: ['#5a1a08', 0.25] },
  hersir: { hue: -20, sat: 1.25, bri: 0.9, tint: ['#8a1a10', 0.22] },
  seidr: { hue: 60, sat: 1.1, bri: 0.85, tint: ['#5a2a90', 0.3] },
  ullr: { hue: 40, sat: 1.0, bri: 1.0, tint: ['#c0d070', 0.2] },
  gythja: { hue: -25, sat: 1.15, bri: 1.0, tint: ['#e08a30', 0.22] },
  skald: { hue: -90, sat: 1.0, bri: 1.05, tint: ['#4a7ad0', 0.22] },
  jotun: { hue: 15, sat: 0.7, bri: 0.95, tint: ['#8a7a6a', 0.3] },
})) {
  const base = JOBS[id].parent;
  for (const g of ['f', 'm']) Art.alias(`job_${id}_${g}`, `job_${base}_${g}`, Object.assign({ flip: true }, spec));
  Art.alias(`emblem_${id}`, `emblem_${base}`, spec);
}

// ไอคอนสกิล Class ขั้น 2: ย้อมจากไอคอนสกิลที่ใกล้เคียง (สีประจำ Class + เหลื่อมสีทีละสกิล ไม่ให้ซ้ำกัน)
(() => {
  const SRC = {
    valkyrie: ['iron_body', 'holy_spear', 'war_cry', 'whirlwind', 'light_of_freyja'],
    galdr: ['rune_mastery', 'fire_rune', 'ice_rune', 'thunder_rune', 'blessing_of_odin'],
    skadi: ['eagle_eye', 'piercing_arrow', 'ice_rune', 'blast_trap', 'blood_frenzy'],
    norn: ['sanctuary', 'light_of_freyja', 'blessing_of_odin', 'thunder_rune', 'holy_spear'],
    phantom: ['shadow_step', 'backstab', 'venom_blade', 'smoke_veil', 'whirlwind'],
    warlord: ['wolf_blood', 'rage_strike', 'whirlwind', 'howl', 'blood_frenzy'],
    hersir: ['iron_body', 'shield_slam', 'piercing_arrow', 'war_cry', 'whirlwind'],
    seidr: ['rune_mastery', 'thunder_rune', 'venom_blade', 'fire_rune', 'holy_spear'],
    ullr: ['eagle_eye', 'piercing_arrow', 'blast_trap', 'smoke_veil', 'wolf_companion'],
    gythja: ['sanctuary', 'rage_strike', 'shield_slam', 'holy_spear', 'first_aid'],
    skald: ['shadow_step', 'thunder_rune', 'howl', 'war_cry', 'blessing_of_odin'],
    jotun: ['wolf_blood', 'shield_slam', 'rage_strike', 'blood_frenzy', 'light_of_freyja'],
  };
  const HUE = { valkyrie: 30, galdr: 50, skadi: 160, norn: 230, phantom: 60, warlord: -20, hersir: -25, seidr: 80, ullr: 45, gythja: -30, skald: -100, jotun: 20 };
  for (const job in SRC) JOBS[job].skills.forEach((id, i) =>
    Art.alias('skill_' + id, 'skill_' + SRC[job][i], { hue: HUE[job] + i * 22, sat: 1.15, bri: i % 2 ? 0.95 : 1.05, flip: i % 2 === 0 }));
})();

// ไอคอนสกิลที่ 6 ของ Class แรก
for (const [id, from, hue] of [['shield_throw', 'shield_slam', 40], ['earth_rune', 'thunder_rune', -60], ['charge_arrow', 'piercing_arrow', 40],
  ['divine_shield', 'blessing_of_odin', 180], ['throwing_knife', 'backstab', 50], ['axe_throw', 'rage_strike', 30]])
  Art.alias('skill_' + id, 'skill_' + from, { hue, sat: 1.1, flip: true });
