'use strict';
// ============================================================
//  ฉากที่เรนเดอร์จาก Blender แล้วอบเป็นภาพ 2D (docs/RENDER3D_PLAN.md) — ข้อมูล BAKE_DATA[map.id]:
//    js/bake_data.js (tools/hel3d.py --install: Hel's Hollow) + js/bake_data_mistlake.js (tools/lake3d.py --install: ซากในบ่อน้ำ Mistlake)
//    + js/bake_data_wolfwood.js (tools/tree3d.py --install: ต้นไม้ยักษ์ "ต้นหมาป่าเก่า" กลางป่า Wolfwood)
//    + js/bake_data_roots.js (tools/roots3d.py --install: รากยักษ์โค้งข้ามทาง + ประตูรากของ Garmr ใน Gnawed Roots — ประตูเป็นของประดับล้วน)
//    + js/bake_data_archive.js (tools/archive3d.py --install: ชั้นวางตั้งอิสระ + ประกายโหลของชั้นวางสลักผนัง/ตราผนึกประตูห้องนิรภัย Archive Depths)
//    + js/bake_data_eldheim.js (tools/fountain3d.py --install: น้ำพุคริสตัลกลางเมือง Neo Eldheim — ขอบสระ A + แกนน้ำพุ 12 เฟรม + เสาคริสตัล 4 ทิศ)
//    + js/bake_data_eldheim_bifrost.js (tools/bifrost3d.py --install: แท่น Bifrost + เสาคริสตัลสายรุ้ง + เงา Norn's Wheel — ภาพวงล้อวาดใน gacha.js)
//    + js/bake_data_eldheim_bld.js (tools/bld3d.py --install: หอคอย CENTRAL CORE + ร้าน 4 ร้าน — BLD_BAKE แยกจาก BAKE_DATA, Bake.buildings/drawBuilding)
//  • แบบ A (ground): วาดลงผ้าใบพื้นของแมพ (แท่น/เงา — ของเตี้ย ไม่บังใคร)
//  • reflect: เงาสะท้อนในน้ำของชิ้น B — วาดลงผ้าใบพื้นเฉพาะส่วนน้ำลึก (หน้ากากจาก drawWater ใน maps.js) ใต้ตัวละครเสมอ
//  • แบบ B (pieces): สไปรต์ตั้งตรงเรียงความลึกกับตัวละคร (บัลลังก์/ชั้นวาง/ซากหิน) — กล้องเรนเดอร์ = กล้องเกม จึงวาด 1:1 ตามจุดยึด
//  • cave: ผูกกับภาพผนังถ้ำอบ (CAVE_BAKE ผังช่องทั้งแมพ) — ไม่ตรง = ไม่ใช้ทั้งชุด (Archive Depths)
//  • hash+hashRect ต่อชิ้น (ground/pieces): หลายชุดในแมพเดียว (เมือง: แท่น Bifrost / Norn's Wheel / น้ำพุ) — ผังในกรอบของชิ้นไม่ตรง = ไม่วางชิ้นนั้น (Bake.rectOk)
//  • hash (ถ้ามี): ผังน้ำตอนเลือกตำแหน่ง (หรือผังช่องในกรอบ hashRect) — ผังแมพเปลี่ยน = ไม่ใช้ข้อมูลชุดนี้เลย (ไม่มีซากลอยบนหญ้า/ต้นไม้ทับถนน)
//  • clearTree: ต้นไม้ (T.TREE) ในวงรีกลายเป็นหญ้า • free: ของประดับ/พุ่ม Flora ในรัศมีถูกเอาออก (รากอบลงพื้นแทน)
//  • fountain (ต่อชิ้น): ชุดน้ำพุ (แทนสระโค้ด TownArt.basin + ภาพวาด prop_fountain) — ใช้เมื่อผังตรง + ภาพครบทุกไฟล์เท่านั้น (Bake.fountain)
//    ปิดทั้งชุด = FOUNTAIN_3D ใน js/townmap.js • frames/cols/fw/fh/fps = ชีตเฟรม (ชิ้นเคลื่อนไหว: วาดเฟรมตามเวลา 1 drawImage/เฟรมเกม)
//  • ชิ้นไม่มีภาพ (img null + wall): ของที่อบอยู่ในภาพผนังถ้ำแล้ว (CAVE_BAKE) — วาดแค่ประกายกะพริบ + แสง เฉพาะตอนภาพผนังอบแสดงอยู่
//  • ชิ้นสูงใหญ่ (ต้นไม้ยักษ์/รากโค้ง): mask = ตารางความทึบหยาบ → จางเฉพาะตอนตัวละครอยู่หลังส่วนทึบจริง • sway = ไหวลม • cull = เผื่อนอกจอ
//    fb = ช่วงลำตัวที่ใช้เช็ค [px เหนือเท้า บน, ล่าง] (รากโค้ง: รวมหัว → เดินลอดใต้รากก็จาง) • fadeBoss = จางแรงขึ้นตอนมี MVP/บอสโลกในแมพ
//    free = รัศมี (ช่อง) รอบจุดยึดที่เอาของประดับ (ผลึก/หิน) ออก
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
      if (!map._bakeOk && !warned.has(map.id)) { warned.add(map.id); console.warn(`Bake: ${map.id} ผัง${r ? 'ช่อง' : 'น้ำ'}เปลี่ยน (hash ${h} ≠ ${d.hash}) — ไม่วางฉาก 3D (รัน tools/${d.tool || (r ? 'tree3d' : 'lake3d')}.py ใหม่)`); }
    }
    return map._bakeOk ? d : null;
  },
  // hash ของชิ้นเดียว (e.hash + e.hashRect [x0, y0, x1, y1)) — FNV-1a ชนิดช่องในกรอบ ตรงกับ tools/bifrost3d.py fnv_rect
  //   คำนวณครั้งแรกต่อกรอบแล้วจำไว้ในแมพ (Bake.layout เรียกก่อนแก้ผัง) • ไม่ตรง = เตือนครั้งเดียวต่อแมพ
  rectOk(map, e) {
    if (!e || e.hash == null || !e.hashRect) return true;
    const memo = map._bakeRect || (map._bakeRect = {}), r = e.hashRect, k = r.join(',');
    if (memo[k] === undefined) {
      let h = 0x811c9dc5;
      for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++) { h ^= map.tile(x, y); h = Math.imul(h, 0x01000193) >>> 0; }
      memo[k] = h === e.hash;
      const warned = this._warned || (this._warned = new Set()), wk = map.id + ':rect';
      if (!memo[k] && !warned.has(wk)) { warned.add(wk); console.warn(`Bake: ${map.id} ผังช่องในกรอบ [${k}] เปลี่ยน (hash ${h} ≠ ${e.hash}) — ไม่วางฉาก 3D ชุดนี้ (รัน tools/${e.tool || 'bifrost3d'}.py ใหม่)`); }
    }
    return memo[k];
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
      if (!this.rectOk(map, pc)) { map.bakeSkip.add(pc.id); continue; }
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

  // น้ำพุคริสตัล 3D (Neo Eldheim): ผังตรง + ภาพครบทุกไฟล์ → true • ยังไม่ครบ = เริ่มโหลด (Art.need) แล้วใช้สระโค้ด + ภาพวาดเดิมไปก่อน
  //   (Bake.ground จดภาพที่รอไว้ใน map.bakeWait → art.js onLoad วาดพื้นใหม่ → สลับเป็น 3D ทั้งชุดพร้อมกัน ไม่มีช่วงสระว่าง)
  //   ปิดทั้งชุด (FOUNTAIN_3D = false ใน js/townmap.js) หรือผังรอบสระเปลี่ยน (Bake.rectOk) = ภาพวาดเดิม • ชุดอื่นในเมือง (Bifrost) ไม่เกี่ยว
  fountain(map) {
    const es = this.fountainSet(map);
    if (!es.length || (typeof FOUNTAIN_3D !== 'undefined' && !FOUNTAIN_3D) || !es.every(e => this.rectOk(map, e))) return false;
    let ok = true;
    for (const k of this.imgs(es)) { Art.need(k); if (!Art.get(k)) ok = false; }
    return ok;
  },
  fountainSet(map) { const d = map.fountain && this.data(map); return d ? (d.ground || []).concat(d.pieces || []).filter(e => e.fountain) : []; },
  imgs(es) { return [...new Set(es.map(e => e.img).filter(Boolean))]; },

  // แบบ A: วาดลงผ้าใบพื้น (เรียกหลัง decorate — กรวดที่อบลงพื้นจะไม่โผล่บนแท่น)
  ground(map, g) {
    const wm = map.waterMask; map.waterMask = null; // หน้ากากน้ำจาก drawWater (ใช้ครั้งเดียว — ไม่เก็บค้างในหน่วยความจำ)
    const d = this.data(map); if (!d) return;
    map.bakeWait = new Set();
    if (!map.fountain3d && (typeof FOUNTAIN_3D === 'undefined' || FOUNTAIN_3D)) { // น้ำพุ 3D รอภาพ (สระโค้ดวาดไปแล้ว) → จดไว้ วาดพื้นใหม่ตอนครบ
      const es = this.fountainSet(map);
      if (es.length && es.every(e => this.rectOk(map, e))) for (const k of this.imgs(es)) if (!Art.get(k)) map.bakeWait.add(k);
    }
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    for (const e of d.ground || []) {
      if (!this.rectOk(map, e) || (e.fountain && !map.fountain3d)) continue; // ชิ้นที่ผังในกรอบของมันเปลี่ยน (Bake.rectOk) • น้ำพุ 3D ยังไม่ใช้
      Art.need(e.img); const img = Art.get(e.img); if (img) g.drawImage(img, e.x * TILE, e.y * TILE, e.w * TILE, e.h * TILE); else map.bakeWait.add(e.img);
    } // bake_* โหลดตามแมพ (art.js need) — ยังไม่มา = จำไว้ วาดพื้นใหม่ตอนโหลดเสร็จ
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
    const live = d.pieces.filter(pc => (!map.bakeSkip || !map.bakeSkip.has(pc.id)) && (!pc.fountain || map.fountain3d)), c = d.clear, fr = live.length && d.free; // น้ำพุ 3D: ภาพครบเท่านั้น
    const near = (x, y) => (c && Math.hypot(x - c.x, y - c.y) < 4) || (fr && Math.hypot(x - fr.x, y - fr.y) < fr.r)
      || live.some(pc => (pc.free && Math.hypot(x - pc.x, y - pc.y) < pc.free) || pc.block.some(([bx, by]) => Math.abs(bx + 0.5 - x) < 1.1 && Math.abs(by + 0.5 - y) < 1.1));
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

  // ชุดอาคาร 3D ของเมือง (หอคอย CENTRAL CORE + ร้าน 4 ร้าน — tools/bld3d.py → BLD_BAKE ใน js/bake_data_eldheim_bld.js)
  //   ใช้ทั้งชุดหรือไม่ใช้เลย (ไม่ปนภาพวาดกับ 3D): ปิดด้วยมือ BUILDING_3D = false (js/maps.js) • ฐาน/ป้ายไม่ตรงกับ addBuilding หรือ hash ผังรอบอาคารไม่ตรง
  //   = ภาพวาดเดิม (BUILDING_ART) + console.warn ครั้งเดียว • คำนวณครั้งเดียวต่อแมพ (ผังเมืองไม่เปลี่ยนระหว่างเล่น)
  bldSet(map) {
    if (map._bldSet !== undefined) return map._bldSet;
    map._bldSet = null;
    if ((typeof BUILDING_3D !== 'undefined' && !BUILDING_3D) || typeof BLD_BAKE === 'undefined' || !map.buildings.length) return null;
    const list = BLD_BAKE.list.filter(e => map.buildings.some(b => b.label === e.label));
    if (!list.length) return null;
    const bad = [];
    for (const b of map.buildings) {
      const e = list.find(q => q.label === b.label);
      if (!e || e.x !== b.x || e.y !== b.y || e.w !== b.w || e.h !== b.h) { bad.push(`${b.label} ฐานไม่ตรง`); continue; }
      let h = 0x811c9dc5; const r = e.hashRect; // FNV-1a ชนิดช่องในกรอบ — ตรงกับ tools/bld3d.py fnv_rect
      for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++) { h ^= map.tile(x, y); h = Math.imul(h, 0x01000193) >>> 0; }
      if (h !== e.hash) bad.push(`${b.label} ผังรอบอาคารเปลี่ยน (hash ${h} ≠ ${e.hash})`);
    }
    if (bad.length) {
      const warned = this._warned || (this._warned = new Set());
      if (!warned.has(map.id + ':bld')) { warned.add(map.id + ':bld'); console.warn(`Bake: ${map.id} อาคาร 3D ไม่ตรงผัง — ใช้ภาพวาดเดิมทั้งชุด (รัน tools/bld3d.py ใหม่): ${bad.join(' • ')}`); }
      return null;
    }
    return (map._bldSet = list);
  },
  // renderGround: ภาพครบทุกไฟล์ → ผูก b.bake + วาดเงาอาคารลงผ้าใบพื้น • ยังไม่ครบ = เริ่มโหลด (Art.need) ใช้ภาพวาดไปก่อน แล้ววาดพื้นใหม่ตอนครบ (bakeWait)
  buildings(map, g) {
    for (const b of map.buildings) b.bake = null;
    const set = this.bldSet(map); if (!set) return;
    let ok = true;
    for (const e of set) for (const k of [e.img, e.sh.img]) {
      Art.need(k);
      if (!Art.get(k)) { ok = false; (map.bakeWait || (map.bakeWait = new Set())).add(k); }
    }
    if (!ok) return;
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    for (const e of set) g.drawImage(Art.get(e.sh.img), e.sh.x * TILE, e.sh.y * TILE, e.sh.w * TILE, e.sh.h * TILE); // เงาอาคาร (ตกขวาล่าง) ใต้ตัวละคร
    g.restore();
    for (const b of map.buildings) b.bake = { e: set.find(q => q.label === b.label), fa: 1, lt: 0 };
  },
  // วาดอาคาร 3D (เรียกใน upright(b.y + b.h − 0.5) ของ render.js — ที่เดียวกับภาพวาดเดิม เรียงความลึกเหมือนเดิม)
  //   จุดยึด = กลางขอบหน้าฐานบนพื้น • จางเมื่อผู้เล่น/เป้าหมายยืนหลังส่วนทึบของภาพ • จุดเรืองกะพริบ (เตา/อ่างชุบ/คริสตัล/โคม) • ชื่ออาคารบนแผ่นป้าย
  drawBuilding(g, b, t) {
    const bk = b.bake, e = bk.e, img = Art.get(e.img); if (!img) return false;
    const s = BLD_BAKE.s, K = R.K, sy = b.y + b.h - 0.5;
    const L = (b.x + b.w / 2) * TILE - e.ax * s, Tp = (b.y + b.h) * TILE * K - sy * TILE * (K - 1) - e.ay * s;
    let target = 1;
    const p = typeof G !== 'undefined' && G.player;
    if (p) for (const q of [p, p.target]) {
      if (!q || q.dead || q.x == null || q.y >= sy) continue;
      const qx = q.x * TILE, fy = q.y * TILE * K - sy * TILE * (K - 1); // เท้าของ q ในกรอบ upright ของอาคาร
      if (this.behind(e.mask, (qx - L) / s, (fy - 56 - Tp) / s, (fy - 16 - Tp) / s, 12 / s)) { target = 0.4; break; }
    }
    const dt = Math.min(0.1, Math.max(0, t - bk.lt)); bk.lt = t;
    bk.fa += (target - bk.fa) * Math.min(1, dt * 8);
    g.save();
    if (bk.fa < 0.995) g.globalAlpha *= bk.fa;
    g.drawImage(img, L, Tp, img.width * s, img.height * s);
    if (R.quality !== 'low') { // แสงเรืองมีชีวิต (บวกแสง): ไฟเตาวูบวาบ • อ่างชุบ/คริสตัลเต้นช้า • โคม/ไฟในร้านหายใจเบา ๆ
      g.globalCompositeOperation = 'lighter';
      const a0 = g.globalAlpha;
      for (let i = 0; i < e.glows.length; i++) {
        const [x, y, r, col, kd] = e.glows[i], ph = i * 1.7 + b.x;
        const k = kd === 'fire' ? 0.55 + 0.25 * Math.sin(t * 11 + ph) + 0.2 * Math.sin(t * 23.7 + ph * 3)
          : kd === 'vat' || kd === 'core' || kd === 'gem' ? 0.55 + 0.45 * Math.sin(t * 2.2 + ph) : 0.6 + 0.2 * Math.sin(t * 1.3 + ph);
        const rr = r * s * (kd === 'warm' || kd === 'door' ? 1.1 : 1.6) * (0.9 + 0.15 * k);
        g.globalAlpha = a0 * (kd === 'warm' || kd === 'door' ? 0.22 : 0.5) * k;
        g.drawImage(this.glint(col), L + x * s - rr, Tp + y * s - rr, rr * 2, rr * 2);
      }
      g.globalAlpha = a0; g.globalCompositeOperation = 'source-over';
    }
    g.restore();
    // ชื่ออาคารบนแผ่นป้าย (ตัวหนังสือจากโค้ด — คมทุกระดับซูม) ไม่จางตามอาคาร
    const lx = L + e.lx * s, ly = Tp + e.ly * s, lw = e.lw * s;
    g.save();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = b.kind === 'castle' ? 14 : 12;
    g.font = `700 ${fs}px Kanit, "Noto Sans Thai", sans-serif`;
    const tw = g.measureText(b.label).width;
    if (tw > lw * 0.9) { fs = Math.max(8, fs * lw * 0.9 / tw); g.font = `700 ${fs.toFixed(1)}px Kanit, "Noto Sans Thai", sans-serif`; }
    g.shadowColor = b.roof || '#6ad8ff'; g.shadowBlur = 6 + Math.sin(t * 3) * 2;
    g.fillStyle = '#fff'; g.fillText(b.label, lx, ly + 1);
    g.restore();
    return true;
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
    const fw = pc.fw || img.width, fh = pc.fh || img.height; // ชีตเฟรม (น้ำพุ): ขนาดเฟรมเดียว
    const s = pc.scale, x = pc.x * TILE, y = pc.y * TILE, W = fw * s, H = fh * s, L = x - pc.ax * s, Tp = y - pc.ay * s;
    // ผู้เล่น/เป้าหมายอยู่หลังชิ้นนี้ (y น้อยกว่า) และตัวทับภาพ → จางลง (แบบยอดไม้ใน flora.js)
    let target = 1;
    const p = typeof G !== 'undefined' && G.player, fb = pc.fb || [56, 16];
    if (p) for (const q of [p, p.target]) {
      if (!q || q.dead || q.x == null || q.y >= pc.y) continue;
      const qx = q.x * TILE, fy = q.y * TILE * R.K - pc.y * TILE * (R.K - 1); // เท้าของ q ในกรอบ upright ของชิ้นนี้
      if (pc.mask ? this.behind(pc.mask, (qx - L) / s, (fy - fb[0] - Tp) / s, (fy - fb[1] - Tp) / s, 12 / s)
        : qx > L + 10 && qx < L + W - 10 && fy > Tp + 14 && fy - fb[0] < y - 6) {
        // รากโค้ง (Gnawed Roots): มี MVP/บอสโลกอยู่ในแมพ → จางแรงขึ้น (ไม่บังการต่อสู้กับบอส)
        target = pc.fadeBoss && G.mobs && G.mobs.some(m => (m.isMvp || m.isWB) && !m.dead) ? pc.fadeBoss : pc.fade || 0.35; break;
      }
    }
    const dt = Math.min(0.1, Math.max(0, t - o.lt)); o.lt = t;
    o.fa += (target - o.fa) * Math.min(1, dt * 8);
    g.save();
    if (o.fa < 0.995) g.globalAlpha *= o.fa;
    if (pc.sway) { g.translate(x, y); g.transform(1, 0, Math.sin(t * 0.7 + o.r * 10) * pc.sway, 1, 0, 0); g.translate(-x, -y); } // ไหวลมช้า ๆ (โคนนิ่ง ยอดเอนไม่กี่ px)
    if (pc.frames) { // น้ำไหลวนเป็นลูป: เฟรมตามเวลา (ทุกเครื่องเห็นจังหวะเดียวกันโดยไม่ต้องซิงก์ — ของประดับล้วน)
      const fi = Math.floor(t * pc.fps) % pc.frames;
      g.drawImage(img, (fi % pc.cols) * fw, Math.floor(fi / pc.cols) * fh, fw, fh, L, Tp, W, H);
    } else g.drawImage(img, L, Tp, W, H);
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
