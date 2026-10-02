'use strict';
// ============================================================
//  ฉากที่เรนเดอร์จาก Blender แล้วอบเป็นภาพ 2D (docs/RENDER3D_PLAN.md) — ข้อมูล BAKE_DATA[map.id]:
//    js/bake_data.js (tools/hel3d.py --install: Hel's Hollow) + js/bake_data_mistlake.js (tools/lake3d.py --install: ซากในบ่อน้ำ Mistlake)
//    + js/bake_data_wolfwood.js (tools/tree3d.py --install: ต้นไม้ยักษ์ "ต้นหมาป่าเก่า" กลางป่า Wolfwood)
//    + js/bake_data_archive.js (tools/archive3d.py --install: ชั้นวางตั้งอิสระ + ประกายโหลของชั้นวางสลักผนัง/ตราผนึกประตูห้องนิรภัย Archive Depths)
//  • แบบ A (ground): วาดลงผ้าใบพื้นของแมพ (แท่น/เงา — ของเตี้ย ไม่บังใคร)
//  • reflect: เงาสะท้อนในน้ำของชิ้น B — วาดลงผ้าใบพื้นเฉพาะส่วนน้ำลึก (หน้ากากจาก drawWater ใน maps.js) ใต้ตัวละครเสมอ
//  • แบบ B (pieces): สไปรต์ตั้งตรงเรียงความลึกกับตัวละคร (บัลลังก์/ชั้นวาง/ซากหิน) — กล้องเรนเดอร์ = กล้องเกม จึงวาด 1:1 ตามจุดยึด
//  • cave: ผูกกับภาพผนังถ้ำอบ (CAVE_BAKE ผังช่องทั้งแมพ) — ไม่ตรง = ไม่ใช้ทั้งชุด (Archive Depths)
//  • hash (ถ้ามี): ผังน้ำตอนเลือกตำแหน่ง (หรือผังช่องในกรอบ hashRect) — ผังแมพเปลี่ยน = ไม่ใช้ข้อมูลชุดนี้เลย (ไม่มีซากลอยบนหญ้า/ต้นไม้ทับถนน)
//  • clearTree: ต้นไม้ (T.TREE) ในวงรีกลายเป็นหญ้า • free: ของประดับ/พุ่ม Flora ในรัศมีถูกเอาออก (รากอบลงพื้นแทน)
//  • ชิ้นไม่มีภาพ (img null + wall): ของที่อบอยู่ในภาพผนังถ้ำแล้ว (CAVE_BAKE) — วาดแค่ประกายกะพริบ + แสง เฉพาะตอนภาพผนังอบแสดงอยู่
//  • ชิ้นสูงใหญ่ (ต้นไม้ยักษ์): mask = ตารางความทึบหยาบ → จางเฉพาะตอนตัวละครอยู่หลังส่วนทึบจริง • sway = ไหวลม • cull = เผื่อนอกจอ
//    ชนตาม block • จางเหลือ ~35% เมื่อผู้เล่น/เป้าหมายอยู่หลัง • ประกายโหลกะพริบ (lighter) • แสงตัดความมืดถ้ำ (map.extraLights)
//  ทุกอย่างกำหนดตายตัวจากข้อมูล (ไม่สุ่ม) → ทุกเครื่องเห็น/ชนเหมือนกัน
//  ใช้: maps.js (constructor → Bake.layout, renderGround → Bake.ground / Bake.props / Bake.gates), sprites.js drawProp → Bake.draw
//  ซุ้มประตูวาร์ปทุกประตู (GATE_BAKE ใน maps.js, tools/gate3d.py): Bake.gates → map.portalGates → render.js เรียงความลึก + Sprites.drawGate*
// ============================================================
const Bake = {
  data(map) {
    const d = typeof BAKE_DATA !== 'undefined' ? BAKE_DATA[map.id] : null;
    if (d && d.cave) { // ผูกกับภาพผนังถ้ำอบ (CAVE_BAKE — ผังช่องทั้งแมพชุดเดียวกัน): ผังไม่ตรง = ไม่วางทั้งชุด • เตือนครั้งเดียวที่ caveBake
      if (map._bakeOk === undefined) map._bakeOk = !!map.caveBake();
      return map._bakeOk ? d : null;
    }
    if (!d || d.hash == null) return d || null;
    if (map._bakeOk === undefined) { // คำนวณครั้งแรก (Bake.layout ก่อนแก้ผัง) แล้วจำไว้
      let h = 0x811c9dc5;
      const r = d.hashRect;
      if (r) { // FNV-1a ของชนิดช่องในกรอบ [x0, y0, x1, y1) — ตรงกับ tools/tree3d.py fnv_rect
        for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++) { h ^= map.tile(x, y); h = Math.imul(h, 0x01000193) >>> 0; }
      } else { // FNV-1a ของผังน้ำ (1 = ช่องน้ำ) — ตรงกับ tools/lake3d.py fnv_water
        for (let i = 0; i < map.tiles.length; i++) { h ^= map.tiles[i] === T.WATER ? 1 : 0; h = Math.imul(h, 0x01000193) >>> 0; }
      }
      map._bakeOk = h === d.hash;
      const warned = this._warned || (this._warned = new Set()); // เตือนครั้งเดียวต่อแมพ (แมพ lite ของแผนที่โลกสร้างซ้ำได้)
      if (!map._bakeOk && !warned.has(map.id)) { warned.add(map.id); console.warn(`Bake: ${map.id} ผัง${r ? 'ช่อง' : 'น้ำ'}เปลี่ยน (hash ${h} ≠ ${d.hash}) — ไม่วางฉาก 3D (รัน tools/${r ? 'tree3d' : 'lake3d'}.py ใหม่)`); }
    }
    return map._bakeOk ? d : null;
  },

  // ผังช่อง: เคลียร์หินก้อนเล็กใต้แท่น (ช่องหิน → พื้นถ้ำ) + ช่องชนของชิ้น B
  // เรียกทั้งแมพเต็มและแบบ lite (แผนที่โลก) → การชนตรงกันทุกที่ • ชิ้นที่ทำให้ประตู/NPC เดินไปไม่ถึง = ไม่วาง (บันทึกใน map.bakeSkip)
  layout(map) {
    const d = this.data(map); map.bakeSkip = new Set(); if (!d) return;
    const c = d.clear;
    if (c) for (let y = Math.floor(c.y - c.r); y <= Math.ceil(c.y + c.r); y++) for (let x = Math.floor(c.x - c.r); x <= Math.ceil(c.x + c.r); x++)
      if (Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y) <= c.r && map.tile(x, y) === T.ROCK && x > 1 && y > 1 && x < map.w - 2 && y < map.h - 2) map.set(x, y, T.CAVE);
    const ct = d.clearTree; // ต้นไม้ Flora รอบต้นยักษ์ → หญ้า (ยอดไม่ซ้อน/บังต้นยักษ์) — เปิดทางเพิ่มอย่างเดียว ไม่ปิดทาง
    if (ct) for (let y = Math.floor(ct.y - ct.ry); y <= Math.ceil(ct.y + ct.ry); y++) for (let x = Math.floor(ct.x - ct.rx); x <= Math.ceil(ct.x + ct.rx); x++)
      if (((x + 0.5 - ct.x) / ct.rx) ** 2 + ((y + 0.5 - ct.y) / ct.ry) ** 2 <= 1 && map.tile(x, y) === T.TREE && x > 1 && y > 1 && x < map.w - 2 && y < map.h - 2) map.set(x, y, T.GRASS);
    const need = map.portals.map(p => [p.ax, p.ay]).concat((map.def.npcs || []).map(n => [n.x, n.y + 1]));
    for (const pc of d.pieces || []) {
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
    const wm = map.waterMask; map.waterMask = null; // หน้ากากน้ำจาก drawWater (ใช้ครั้งเดียว — ไม่เก็บค้างในหน่วยความจำ)
    const d = this.data(map); if (!d) return;
    map.bakeWait = new Set();
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    for (const e of d.ground || []) { Art.need(e.img); const img = Art.get(e.img); if (img) g.drawImage(img, e.x * TILE, e.y * TILE, e.w * TILE, e.h * TILE); else map.bakeWait.add(e.img); } // bake_* โหลดตามแมพ (art.js need) — ยังไม่มา = จำไว้ วาดพื้นใหม่ตอนโหลดเสร็จ
    if (d.reflect && wm) this.reflect(map, g, d.reflect, wm);
    g.restore();
  },

  // เงาสะท้อน: ภาพจากกล้องกระจก (tools/lake3d.py — ริ้วคลื่น/จางตามระยะอบมาแล้ว) ตัดด้วยหน้ากาก "น้ำลึก" ของ drawWater
  //   (ขอบทราย/ฟองริมตลิ่งไม่มีเงา) แล้ววาดโปร่งลงผ้าใบพื้น — ใต้ตัวละครเสมอ ไม่มีต้นทุนต่อเฟรม
  reflect(map, g, list, wm) {
    const { x0, y0, mw, mh, S, V } = wm;
    let mk = null;
    for (const e of list) {
      if (map.bakeSkip && map.bakeSkip.has(e.id)) continue;
      Art.need(e.img); const img = Art.get(e.img);
      if (!img) { map.bakeWait.add(e.img); continue; }
      if (!mk) { // หน้ากากน้ำลึก (ความละเอียดเดียวกับหน้ากากน้ำ: S px โลกต่อ 1 px)
        mk = document.createElement('canvas'); mk.width = mw; mk.height = mh;
        const mg = mk.getContext('2d'), id = mg.createImageData(mw, mh);
        for (let i = 0; i < mw * mh; i++) { const t = Math.min(1, Math.max(0, (V[i] - 0.56) / 0.12)); id.data[i * 4 + 3] = t * t * (3 - 2 * t) * 255; }
        mg.putImageData(id, 0, 0);
      }
      const ex = e.x * TILE, ey = e.y * TILE, ew = Math.ceil(e.w * TILE), eh = Math.ceil(e.h * TILE);
      const c = document.createElement('canvas'); c.width = ew; c.height = eh;
      const cg = c.getContext('2d'); cg.imageSmoothingEnabled = true; cg.imageSmoothingQuality = 'high';
      cg.drawImage(img, 0, 0, ew, eh);
      cg.globalCompositeOperation = 'destination-in';
      cg.drawImage(mk, (ex - x0 * TILE) / S, (ey - y0 * TILE) / S, ew / S, eh / S, 0, 0, ew, eh);
      g.globalAlpha = 0.85; g.drawImage(c, ex, ey); g.globalAlpha = 1;
    }
  },

  // แบบ B: เพิ่มเป็น prop ชนิด 'bake' (เรียงความลึกใน render.js ด้วย y = จุดยึด) + เอาของประดับที่ทับแท่น/ชิ้นออก + แสง
  props(map) {
    const d = this.data(map); if (!d) return;
    const live = d.pieces.filter(pc => !map.bakeSkip || !map.bakeSkip.has(pc.id)), c = d.clear, fr = live.length && d.free;
    const near = (x, y) => (c && Math.hypot(x - c.x, y - c.y) < 4) || (fr && Math.hypot(x - fr.x, y - fr.y) < fr.r) || live.some(pc => pc.block.some(([bx, by]) => Math.abs(bx + 0.5 - x) < 1.1 && Math.abs(by + 0.5 - y) < 1.1));
    map.props = map.props.filter(o => !near(o.x, o.y));
    if (fr) { // พุ่ม/เฟิร์น/ดอกไม้ของ Flora บนรากต้นยักษ์ (รากอบลงพื้นแล้ว) — ต้นไม้ในวงเคลียร์กลายเป็นหญ้าตั้งแต่ layout
      if (map.flora) map.flora = map.flora.filter(o => !near(o.x, o.y));
      map.objects = map.objects.filter(o => !near(o.x, o.y));
    }
    map.extraLights = (map.extraLights || []).filter(l => !l.bake); // วาดพื้นใหม่ (ภาพโหลดช้า) → ไม่ซ้ำแสงเดิม
    for (const pc of live) {
      map.props.push({ kind: 'bake', img: pc.img, x: pc.x, y: pc.y, pc, fa: 1, lt: 0, r: U.hash2(pc.x * 10 | 0, pc.y * 10 | 0, 5), cull: pc.cull || 0 });
      for (const l of pc.lights || (pc.light ? [pc.light] : [])) map.extraLights.push({ x: pc.x + l.dx, y: pc.y + l.dy, lr: l.lr, col: l.col, bake: true }); // เห็ดเรือง/โทเท็มตัดความมืด
    }
    map.lightProps = null; // render.js แคชแสงครั้งแรกที่วาด → ให้สร้างใหม่รวมแสงของชิ้นเหล่านี้
  },

  // ซุ้มประตูวาร์ป 3D (GATE_BAKE ใน maps.js, tools/gate3d.py) — ทุกประตูยกเว้นซุ้มปากถ้ำ Wolfwood (มีของตัวเอง) และลานประลอง (ประตูอยู่ในอุโมงค์ของภาพ 3D)
  // วัสดุตามชนิดแมพปัจจุบัน • แบบตามขอบ: n = เสาเตี้ย (ขอบเหนือโดนตัดหัว) s = หันหน้า e/w = ด้านข้าง 2 ชิ้น (หลัง/หน้า)
  // ไม่แตะการชน/ระยะเข้าวาร์ป • ภาพโหลดตามแมพ (Art.need) — ยังไม่ครบ = render.js วาดวาร์ปแบบเดิม
  gates(map) {
    map.portalGates = [];
    map.extraLights = (map.extraLights || []).filter(l => !l.pgate);
    const th = typeof GATE_BAKE !== 'undefined' && !map.def.pvp && GATE_BAKE[map.def.kind];
    if (th) for (const p of map.portals) {
      if (map.ridgeGate && map.ridgeGate.portal === p) continue;
      const v = p.y <= 1 ? 'n' : p.y >= map.h - 2 ? 's' : p.x <= 1 ? 'w' : 'e', d = th[v];
      if (!d) continue;
      const cx = p.x + 0.5, cy = p.y + 0.5, s = GATE_BAKE.s;
      const pcs = d.pcs.map(q => ({ img: q.img, ax: q.ax, ay: q.ay, s, x: cx, y: cy + q.dy, ay0: cy, fa: 1, lt: 0 }));
      for (const q of pcs) Art.need(q.img);
      Art.need(d.sh.img);
      map.portalGates.push({ p, v, cx, cy, pcs, sh: d.sh, open: d.open, top: d.top, s });
      if (map.def.dark) map.extraLights.push({ x: cx, y: cy - 0.3, lr: 3, col: GATE_BAKE.glow[map.def.kind], pgate: true }); // แสงรูนตัดความมืด (ถ้ำ/ป่ากลางคืน)
    }
    map.lightProps = null;
  },

  // ตัวละครอยู่หลัง "ส่วนทึบ" ของภาพไหม: ช่วงลำตัว (ไม่นับเท้า — ยืนข้างรากเตี้ยไม่ต้องจาง) กว้าง ±hw ทับช่องทึบใน mask
  //   mask = { cell: px ต่อช่อง (พิกัดภาพ), w: จำนวนคอลัมน์, rows: [hex 4 ช่องต่อตัว] } • x, y0, y1, hw = พิกัดภาพ (px)
  behind(m, x, y0, y1, hw) {
    const c = m.cell, i0 = Math.max(0, Math.floor((x - hw) / c)), i1 = Math.min(m.w - 1, Math.floor((x + hw) / c));
    const j0 = Math.max(0, Math.floor(y0 / c)), j1 = Math.min(m.rows.length - 1, Math.floor(y1 / c));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if ((parseInt(m.rows[j][i >> 2], 16) >> (3 - (i & 3))) & 1) return true;
    return false;
  },

  // ประกายโหล/รูน: จุดเรืองนุ่ม ๆ (แคชต่อสี) วาดแบบบวกแสง • col = 'r,g,b' (ค่าเริ่ม = เขียวอมฟ้าของ Hel)
  glint(col) {
    col = col || '96,240,208';
    const cache = this._glints || (this._glints = {});
    if (cache[col]) return cache[col];
    const [r, gg, b] = col.split(',').map(Number), mid = `${Math.round((r + 255) / 2)},${Math.round((gg + 255) / 2)},${Math.round((b + 255) / 2)}`;
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(240,255,255,1)'); gr.addColorStop(0.18, `rgba(${mid},0.9)`); gr.addColorStop(0.45, `rgba(${col},0.35)`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    return (cache[col] = c);
  },

  // วาดชิ้น B (เรียกใน upright() ของ render.js — พิกัดโลก x, y·TILE = จุดยึดบนพื้น)
  draw(g, o, t) {
    const pc = o.pc;
    if (!pc.img) { // ประกายโหลในช่องชั้นวางสลักผนัง/ตราผนึกประตู (ตัวงานอบอยู่ในภาพผนังแล้ว) — ภาพผนังยังไม่มา/ผังไม่ตรง = ไม่มีอะไรให้กะพริบ
      if (pc.wall && !(typeof G !== 'undefined' && G.map && G.map.caveWallImg)) return;
      if (R.quality !== 'low') { g.save(); this.sparks(g, o, t, pc.x * TILE, pc.y * TILE, 1); g.restore(); }
      return;
    }
    Art.need(pc.img); const img = Art.get(pc.img); if (!img) return;
    const s = pc.scale, x = pc.x * TILE, y = pc.y * TILE, W = img.width * s, H = img.height * s, L = x - pc.ax * s, Tp = y - pc.ay * s;
    // ผู้เล่น/เป้าหมายอยู่หลังชิ้นนี้ (y น้อยกว่า) และตัวทับภาพ → จางลง (แบบยอดไม้ใน flora.js)
    let target = 1;
    const p = typeof G !== 'undefined' && G.player;
    if (p) for (const q of [p, p.target]) {
      if (!q || q.dead || q.x == null || q.y >= pc.y) continue;
      const qx = q.x * TILE, fy = q.y * TILE * R.K - pc.y * TILE * (R.K - 1); // เท้าของ q ในกรอบ upright ของชิ้นนี้
      if (pc.mask ? this.behind(pc.mask, (qx - L) / s, (fy - 56 - Tp) / s, (fy - 16 - Tp) / s, 12 / s)
        : qx > L + 10 && qx < L + W - 10 && fy > Tp + 14 && fy - 56 < y - 6) { target = pc.fade || 0.35; break; }
    }
    const dt = Math.min(0.1, Math.max(0, t - o.lt)); o.lt = t;
    o.fa += (target - o.fa) * Math.min(1, dt * 8);
    g.save();
    if (o.fa < 0.995) g.globalAlpha *= o.fa;
    if (pc.sway) { g.translate(x, y); g.transform(1, 0, Math.sin(t * 0.7 + o.r * 10) * pc.sway, 1, 0, 0); g.translate(-x, -y); } // ไหวลมช้า ๆ (โคนนิ่ง ยอดเอนไม่กี่ px)
    g.drawImage(img, L, Tp, W, H);
    if (pc.jars.length && R.quality !== 'low') this.sparks(g, o, t, L, Tp, s);
    g.restore();
  },
  // ประกายโหลกะพริบ (บวกแสง) ที่ตำแหน่ง jars ของชิ้น — L, Tp = มุมซ้ายบนของภาพ (หรือจุดยึดของชิ้นไม่มีภาพ), s = สเกลพิกัด jars
  sparks(g, o, t, L, Tp, s) {
    const pc = o.pc, gl = this.glint(pc.glint), a0 = g.globalAlpha;
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < pc.jars.length; i++) {
      const j = pc.jars[i], h1 = U.hash2(i, 3, o.r * 97 | 0), h2 = U.hash2(i, 7, o.r * 53 | 0);
      const tw = Math.pow(0.5 + 0.5 * Math.sin(t * (0.6 + h1 * 1.8) + h2 * 6.283), 5); // ส่วนใหญ่หรี่ บางทีวาบ
      const a = j[2] * (0.22 + 0.78 * tw);
      if (a < 0.06) continue;
      const r = 3 + 4.5 * tw * j[2];
      g.globalAlpha = a0 * Math.min(1, a);
      g.drawImage(gl, L + j[0] * s - r, Tp + j[1] * s - r, r * 2, r * 2);
    }
    g.globalAlpha = a0; g.globalCompositeOperation = 'source-over';
  },
};
