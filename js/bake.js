'use strict';
// ============================================================
//  ฉากที่เรนเดอร์จาก Blender แล้วอบเป็นภาพ 2D (docs/RENDER3D_PLAN.md) — ข้อมูลจาก js/bake_data.js (สร้างโดย tools/hel3d.py --install)
//  • แบบ A (ground): วาดลงผ้าใบพื้นของแมพ (แท่น/เงา — ของเตี้ย ไม่บังใคร)
//  • แบบ B (pieces): สไปรต์ตั้งตรงเรียงความลึกกับตัวละคร (บัลลังก์/ชั้นวาง) — กล้องเรนเดอร์ = กล้องเกม จึงวาด 1:1 ตามจุดยึด
//    ชนตาม block • จางเหลือ ~35% เมื่อผู้เล่น/เป้าหมายอยู่หลัง • ประกายโหลกะพริบ (lighter) • แสงตัดความมืดถ้ำ (map.extraLights)
//  ทุกอย่างกำหนดตายตัวจากข้อมูล (ไม่สุ่ม) → ทุกเครื่องเห็น/ชนเหมือนกัน
//  ใช้: maps.js (constructor → Bake.layout, renderGround → Bake.ground / Bake.props), sprites.js drawProp → Bake.draw
// ============================================================
const Bake = {
  data(map) { return typeof BAKE_DATA !== 'undefined' ? BAKE_DATA[map.id] : null; },

  // ผังช่อง: เคลียร์หินก้อนเล็กใต้แท่น (ช่องหิน → พื้นถ้ำ) + ช่องชนของชิ้น B
  // เรียกทั้งแมพเต็มและแบบ lite (แผนที่โลก) → การชนตรงกันทุกที่ • ชิ้นที่ทำให้ประตู/NPC เดินไปไม่ถึง = ไม่วาง (บันทึกใน map.bakeSkip)
  layout(map) {
    const d = this.data(map); map.bakeSkip = new Set(); if (!d) return;
    const c = d.clear;
    if (c) for (let y = Math.floor(c.y - c.r); y <= Math.ceil(c.y + c.r); y++) for (let x = Math.floor(c.x - c.r); x <= Math.ceil(c.x + c.r); x++)
      if (Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y) <= c.r && map.tile(x, y) === T.ROCK && x > 1 && y > 1 && x < map.w - 2 && y < map.h - 2) map.set(x, y, T.CAVE);
    const need = map.portals.map(p => [p.ax, p.ay]).concat((map.def.npcs || []).map(n => [n.x, n.y + 1]));
    for (const pc of d.pieces) {
      const cells = pc.block.filter(([x, y]) => map.inb(x, y) && !map.block[map.idx(x, y)]);
      for (const [x, y] of cells) map.block[map.idx(x, y)] = 1;
      if (!this.reach(map, need)) { // กันพลาด: ชิ้นนี้ปิดทาง → เอาออก (ผังถ้ำเปลี่ยนในอนาคต)
        for (const [x, y] of cells) map.block[map.idx(x, y)] = 0;
        map.bakeSkip.add(pc.id); console.warn(`Bake: ${map.id} ${pc.id} ปิดทางเดิน — ไม่วาง`);
      }
    }
  },
  reach(map, pts) {
    pts = pts.filter(([x, y]) => map.walkable(x, y));
    if (pts.length < 2) return true;
    const seen = new Uint8Array(map.w * map.h), st = [pts[0]]; seen[map.idx(...pts[0])] = 1;
    while (st.length) {
      const [x, y] = st.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (map.inb(nx, ny) && !seen[map.idx(nx, ny)] && map.walkable(nx, ny)) { seen[map.idx(nx, ny)] = 1; st.push([nx, ny]); }
      }
    }
    return pts.every(([x, y]) => seen[map.idx(x, y)]);
  },

  // แบบ A: วาดลงผ้าใบพื้น (เรียกหลัง decorate — กรวดที่อบลงพื้นจะไม่โผล่บนแท่น)
  ground(map, g) {
    const d = this.data(map); if (!d) return;
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    for (const e of d.ground) { const img = Art.get(e.img); if (img) g.drawImage(img, e.x * TILE, e.y * TILE, e.w * TILE, e.h * TILE); }
    g.restore();
  },

  // แบบ B: เพิ่มเป็น prop ชนิด 'bake' (เรียงความลึกใน render.js ด้วย y = จุดยึด) + เอาของประดับที่ทับแท่น/ชิ้นออก + แสง
  props(map) {
    const d = this.data(map); if (!d) return;
    const live = d.pieces.filter(pc => !map.bakeSkip || !map.bakeSkip.has(pc.id)), c = d.clear;
    const near = (x, y) => (c && Math.hypot(x - c.x, y - c.y) < 4) || live.some(pc => pc.block.some(([bx, by]) => Math.abs(bx + 0.5 - x) < 1.1 && Math.abs(by + 0.5 - y) < 1.1));
    map.props = map.props.filter(o => !near(o.x, o.y));
    map.extraLights = (map.extraLights || []).filter(l => !l.bake); // วาดพื้นใหม่ (ภาพโหลดช้า) → ไม่ซ้ำแสงเดิม
    for (const pc of live) {
      map.props.push({ kind: 'bake', img: pc.img, x: pc.x, y: pc.y, pc, fa: 1, lt: 0, r: U.hash2(pc.x * 10 | 0, pc.y * 10 | 0, 5) });
      if (pc.light) map.extraLights.push({ x: pc.x + pc.light.dx, y: pc.y + pc.light.dy, lr: pc.light.lr, col: pc.light.col, bake: true });
    }
    map.lightProps = null; // render.js แคชแสงครั้งแรกที่วาด → ให้สร้างใหม่รวมแสงของชิ้นเหล่านี้
  },

  // ประกายโหล: จุดเรืองนุ่ม ๆ (แคชครั้งเดียว) วาดแบบบวกแสง
  glint() {
    if (this._glint) return this._glint;
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(235,255,250,1)'); gr.addColorStop(0.18, 'rgba(150,255,225,0.9)'); gr.addColorStop(0.45, 'rgba(96,240,208,0.35)'); gr.addColorStop(1, 'rgba(96,240,208,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    return (this._glint = c);
  },

  // วาดชิ้น B (เรียกใน upright() ของ render.js — พิกัดโลก x, y·TILE = จุดยึดบนพื้น)
  draw(g, o, t) {
    const pc = o.pc, img = Art.get(pc.img); if (!img) return;
    const s = pc.scale, x = pc.x * TILE, y = pc.y * TILE, W = img.width * s, H = img.height * s, L = x - pc.ax * s, Tp = y - pc.ay * s;
    // ผู้เล่น/เป้าหมายอยู่หลังชิ้นนี้ (y น้อยกว่า) และตัวทับภาพ → จางลง (แบบยอดไม้ใน flora.js)
    let target = 1;
    const p = typeof G !== 'undefined' && G.player;
    if (p) for (const q of [p, p.target]) {
      if (!q || q.dead || q.x == null || q.y >= pc.y) continue;
      const qx = q.x * TILE, fy = q.y * TILE * R.K - pc.y * TILE * (R.K - 1); // เท้าของ q ในกรอบ upright ของชิ้นนี้
      if (qx > L + 10 && qx < L + W - 10 && fy > Tp + 14 && fy - 56 < y - 6) { target = 0.35; break; }
    }
    const dt = Math.min(0.1, Math.max(0, t - o.lt)); o.lt = t;
    o.fa += (target - o.fa) * Math.min(1, dt * 8);
    g.save();
    if (o.fa < 0.995) g.globalAlpha *= o.fa;
    g.drawImage(img, L, Tp, W, H);
    if (pc.jars.length && R.quality !== 'low') {
      const gl = this.glint(); g.globalCompositeOperation = 'lighter';
      const a0 = g.globalAlpha;
      for (let i = 0; i < pc.jars.length; i++) {
        const j = pc.jars[i], h1 = U.hash2(i, 3, o.r * 97 | 0), h2 = U.hash2(i, 7, o.r * 53 | 0);
        const tw = Math.pow(0.5 + 0.5 * Math.sin(t * (0.6 + h1 * 1.8) + h2 * 6.283), 5); // ส่วนใหญ่หรี่ บางทีวาบ
        const a = j[2] * (0.22 + 0.78 * tw);
        if (a < 0.06) continue;
        const r = 3 + 4.5 * tw * j[2];
        g.globalAlpha = a0 * Math.min(1, a);
        g.drawImage(gl, L + j[0] * s - r, Tp + j[1] * s - r, r * 2, r * 2);
      }
    }
    g.restore();
  },
};
