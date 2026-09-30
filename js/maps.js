'use strict';
// ============================================================
//  แผนที่: นิยาม + ตัวสร้างแผนที่แบบสุ่ม (seed คงที่) + เรนเดอร์พื้น
// ============================================================

const T = { GRASS: 0, TREE: 1, WATER: 2, DIRT: 3, STONE: 4, WALL: 5, FLOWER: 6, CAVE: 7, ROCK: 8, HOUSE: 9, FOUNTAIN: 10 };
const SOLID = new Set([T.TREE, T.WATER, T.WALL, T.ROCK, T.HOUSE, T.FOUNTAIN]);
const SIGHT_BLOCK = new Set([T.TREE, T.WALL, T.ROCK, T.HOUSE]);

const MAP_DEFS = {
  eldheim: {
    name: 'Eldheim', thai: 'เมืองเอลด์ไฮม์ นครแห่งมิดการ์ด', w: 40, h: 40, kind: 'town', seed: 101,
    links: { E: 'meadow', S: 'wolfwood' }, spawns: [],
    grass: '#74b04c',
    npcs: [
      { id: 'bifrost', name: 'Bifrost Keeper', x: 23, y: 15, look: 'keeper' },
      { id: 'jobmaster', name: 'Sage Mimir', x: 17, y: 15, look: 'jobmaster' },
      { id: 'tool', name: 'Tool Dealer', x: 8, y: 17, look: 'merchant' },
      { id: 'weapon', name: 'Weapon Dealer', x: 32, y: 17, look: 'smith' },
      { id: 'armor', name: 'Armor Dealer', x: 8, y: 31, look: 'merchant2' },
      { id: 'refine', name: 'Brokk the Smith', x: 32, y: 31, look: 'refiner' },
      { id: 'nurse', name: "Eir's Healer", x: 16, y: 25, look: 'nurse' },
      { id: 'guide', name: 'Guard Rolf', x: 24, y: 25, look: 'guide' },
    ],
  },
  meadow: {
    name: 'Emerald Meadow', thai: 'ทุ่งหญ้ามรกต', w: 56, h: 56, kind: 'field', seed: 202,
    links: { W: 'eldheim', E: 'mistlake' }, level: '1-6',
    spawns: [['pudding', 14], ['leafworm', 8], ['moonbun', 8], ['ember_pudding', 6], ['buzzfly', 5]],
    grass: '#6fae4a', trees: 0.9, ponds: 2, flowers: 0.05,
  },
  mistlake: {
    name: 'Mistlake Plains', thai: 'ที่ราบทะเลสาบหมอก', w: 56, h: 56, kind: 'field', seed: 303,
    links: { W: 'meadow' }, level: '8-16 (MVP: Seraph Pudding)',
    spawns: [['fiddlehopper', 10], ['stumpling', 8], ['capshroom', 8], ['moss_pudding', 8]], mvp: 'seraph_pudding',
    grass: '#86b04a', trees: 0.8, ponds: 4, flowers: 0.08, treeHue: '#5f9a3a',
  },
  wolfwood: {
    name: 'Wolfwood Forest', thai: 'ป่าหมาป่า', w: 56, h: 56, kind: 'field', seed: 404,
    links: { N: 'eldheim', S: 'helcave' }, level: '18-30',
    spawns: [['ashtail', 10], ['fenrir_pup', 8], ['mossback', 6], ['tuskboar', 6]],
    grass: '#4f8a3a', trees: 1.7, ponds: 1, flowers: 0.02, pine: true,
  },
  helcave: {
    name: "Hel's Hollow", thai: 'โพรงถ้ำแห่งเฮล', w: 50, h: 50, kind: 'cave', seed: 505, dark: true,
    links: { N: 'wolfwood' }, level: '17-45 (MVP: Kitsura)',
    spawns: [['draugr', 10], ['bone_warden', 8], ['hel_maiden', 7], ['hel_guard', 6]], mvp: 'kitsura',
  },
};
const HOME_MAP = 'eldheim';

const PORTAL_SIDE = {
  E: (w, h) => ({ x: w - 2, y: h >> 1, ax: w - 4, ay: h >> 1 }),
  W: (w, h) => ({ x: 1, y: h >> 1, ax: 3, ay: h >> 1 }),
  N: (w, h) => ({ x: w >> 1, y: 1, ax: w >> 1, ay: 3 }),
  S: (w, h) => ({ x: w >> 1, y: h - 2, ax: w >> 1, ay: h - 4 }),
};
const OPP_SIDE = { E: 'W', W: 'E', N: 'S', S: 'N' };

class GameMap {
  constructor(id) {
    const def = MAP_DEFS[id];
    this.id = id; this.def = def; this.w = def.w; this.h = def.h;
    this.tiles = new Uint8Array(this.w * this.h);
    this.block = new Uint8Array(this.w * this.h);
    this.portals = []; this.objects = []; this.buildings = []; this.fountain = null;
    this.rng = U.seeded(def.seed);
    for (const side in def.links) {
      const p = PORTAL_SIDE[side](this.w, this.h);
      this.portals.push({ x: p.x, y: p.y, ax: p.ax, ay: p.ay, to: def.links[side], toSide: OPP_SIDE[side] });
    }
    if (def.kind === 'town') this.genTown();
    else if (def.kind === 'cave') this.genCave();
    else this.genField();
    for (const n of def.npcs || []) this.block[this.idx(n.x, n.y)] = 1;
    this.collectObjects();
    this.renderGround();
    this.renderMini();
  }

  idx(x, y) { return y * this.w + x; }
  inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  tile(x, y) { return this.inb(x, y) ? this.tiles[this.idx(x, y)] : T.WALL; }
  set(x, y, t) { if (this.inb(x, y)) this.tiles[this.idx(x, y)] = t; }
  walkable(x, y) {
    if (!this.inb(x, y)) return false;
    const i = this.idx(x, y);
    return !SOLID.has(this.tiles[i]) && !this.block[i];
  }
  isWallForSight(x, y) { return SIGHT_BLOCK.has(this.tile(x, y)); }
  portalAt(x, y) { return this.portals.find(p => p.x === x && p.y === y); }

  // ---------------- การสร้างแผนที่ ----------------
  fill(t) { this.tiles.fill(t); }
  border(t, thick) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++)
      if (x < thick || y < thick || x >= this.w - thick || y >= this.h - thick) this.set(x, y, t);
  }
  disc(cx, cy, r, t, prob = 1, onlyIf = null) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        if (x < 2 || y < 2 || x >= this.w - 2 || y >= this.h - 2) continue;
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d <= r && this.rng() < prob * (1 - (d / (r + 1)) * 0.3)) {
          if (onlyIf === null || onlyIf.includes(this.tile(x, y))) this.set(x, y, t);
        }
      }
  }
  carvePath(x0, y0, x1, y1, t, width = 1) {
    let x = x0, y = y0, guard = 0;
    const paint = () => {
      for (let yy = y - width; yy <= y + width; yy++)
        for (let xx = x - width; xx <= x + width; xx++) {
          if (xx < 1 || yy < 1 || xx >= this.w - 1 || yy >= this.h - 1) continue;
          const cur = this.tile(xx, yy);
          if (SOLID.has(cur) || cur === T.GRASS || cur === T.FLOWER || cur === T.CAVE) this.set(xx, yy, t);
        }
    };
    paint();
    while ((x !== x1 || y !== y1) && guard++ < 2000) {
      const dx = Math.sign(x1 - x), dy = Math.sign(y1 - y), r = this.rng();
      if (r < 0.42 && dx) x += dx;
      else if (r < 0.84 && dy) y += dy;
      else if (r < 0.92) x = U.clamp(x + (this.rng() < 0.5 ? -1 : 1), 2, this.w - 3);
      else y = U.clamp(y + (this.rng() < 0.5 ? -1 : 1), 2, this.h - 3);
      if (!dx && !dy) break;
      paint();
    }
  }
  floodCleanup(cx, cy, fillWith) {
    const seen = new Uint8Array(this.w * this.h);
    const st = [[cx, cy]];
    seen[this.idx(cx, cy)] = 1;
    while (st.length) {
      const [x, y] = st.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (!this.inb(nx, ny)) continue;
        const i = this.idx(nx, ny);
        if (seen[i] || SOLID.has(this.tiles[i])) continue;
        seen[i] = 1; st.push([nx, ny]);
      }
    }
    for (let i = 0; i < this.tiles.length; i++)
      if (!seen[i] && !SOLID.has(this.tiles[i])) this.tiles[i] = fillWith;
  }

  genField() {
    const d = this.def, R = this.rng, w = this.w, h = this.h;
    this.fill(T.GRASS);
    this.border(T.TREE, 2);
    const clusters = Math.floor((w * h / 170) * (d.trees || 1));
    for (let i = 0; i < clusters; i++) {
      const cx = 3 + R() * (w - 6), cy = 3 + R() * (h - 6);
      this.disc(cx, cy, 0.6 + R() * 2.4, T.TREE, 0.75);
    }
    for (let i = 0; i < (d.ponds || 0); i++) {
      const cx = 8 + R() * (w - 16), cy = 8 + R() * (h - 16), r = 2 + R() * 2.5;
      for (let y = Math.floor(cy - r); y <= cy + r; y++)
        for (let x = Math.floor(cx - r * 1.4); x <= cx + r * 1.4; x++)
          if (((x + 0.5 - cx) / 1.4) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) this.set(x, y, T.WATER);
    }
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++)
      if (this.tile(x, y) === T.GRASS && R() < (d.flowers || 0.04)) this.set(x, y, T.FLOWER);
    const cx = w >> 1, cy = h >> 1;
    for (const p of this.portals) this.carvePath(p.x, p.y, cx, cy, T.DIRT, 1);
    this.disc(cx + 0.5, cy + 0.5, 3.5, T.GRASS, 10, [T.TREE, T.WATER, T.FLOWER]);
    for (const p of this.portals) { this.set(p.x, p.y, T.DIRT); this.set(p.ax, p.ay, T.DIRT); }
    this.floodCleanup(cx, cy, T.TREE);
  }

  genCave() {
    const R = this.rng, w = this.w, h = this.h;
    for (let i = 0; i < w * h; i++) this.tiles[i] = R() < 0.46 ? T.ROCK : T.CAVE;
    this.border(T.ROCK, 2);
    for (let it = 0; it < 4; it++) {
      const next = new Uint8Array(this.tiles);
      for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
          if ((dx || dy) && this.tile(x + dx, y + dy) === T.ROCK) n++;
        next[this.idx(x, y)] = n >= 5 ? T.ROCK : n <= 3 ? T.CAVE : this.tiles[this.idx(x, y)];
      }
      this.tiles = next;
    }
    const cx = w >> 1, cy = h >> 1;
    for (const p of this.portals) this.carvePath(p.x, p.y, cx, cy, T.CAVE, 1);
    // ทางเชื่อมเพิ่มเติมไปยังมุมต่าง ๆ ให้ถ้ำกว้างขึ้น
    for (const [ox, oy] of [[8, 8], [w - 9, 8], [8, h - 9], [w - 9, h - 9]]) this.carvePath(cx, cy, ox, oy, T.CAVE, 1);
    this.disc(cx + 0.5, cy + 0.5, 4, T.CAVE, 10, [T.ROCK]);
    this.floodCleanup(cx, cy, T.ROCK);
  }

  genTown() {
    const R = this.rng, w = this.w, h = this.h, cx = w >> 1, cy = h >> 1;
    this.fill(T.GRASS);
    this.border(T.TREE, 2);
    // ถนนหลัก
    for (let x = 2; x < w - 1; x++) for (let y = cy - 1; y <= cy + 1; y++) this.set(x, y, T.STONE);
    for (let y = 9; y < h - 1; y++) for (let x = cx - 1; x <= cx + 1; x++) this.set(x, y, T.STONE);
    // ลานกลางเมือง
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
      if (Math.hypot(x + 0.5 - (cx + 0.5), y + 0.5 - (cy + 0.5)) < 7.2) this.set(x, y, T.STONE);
    // น้ำพุ
    for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) this.set(x, y, T.FOUNTAIN);
    this.fountain = { x: cx + 0.5, y: cy + 0.5 };
    // ปราสาท
    this.addBuilding(13, 2, 15, 7, 'castle', '#6a7fb0', 'ELDHEIM HALL');
    // ร้านค้า
    this.addBuilding(4, 11, 8, 6, 'house', '#c0463a', 'TOOL');
    this.addBuilding(28, 11, 8, 6, 'house', '#3a6ac0', 'WEAPON');
    this.addBuilding(4, 25, 8, 6, 'house', '#3a9a5a', 'ARMOR');
    this.addBuilding(28, 25, 8, 6, 'house', '#8a5a3a', 'REFINE');
    // ทางเดินหน้าร้าน
    for (const b of this.buildings) {
      if (b.kind !== 'house') continue;
      const dx = b.x + (b.w >> 1), dy = b.y + b.h;
      for (let y = dy; y <= dy + 1; y++) for (let x = dx - 1; x <= dx + 1; x++) if (this.tile(x, y) !== T.HOUSE) this.set(x, y, T.STONE);
    }
    // ประดับดอกไม้และต้นไม้
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
      if (this.tile(x, y) !== T.GRASS) continue;
      const r = R();
      if (r < 0.06) this.set(x, y, T.FLOWER);
      else if (r < 0.085 && Math.abs(x - cx) > 3 && Math.abs(y - cy) > 3) this.set(x, y, T.TREE);
    }
    for (const n of this.def.npcs) {
      for (let y = n.y - 1; y <= n.y + 1; y++) for (let x = n.x - 1; x <= n.x + 1; x++)
        if (this.tile(x, y) === T.TREE) this.set(x, y, T.GRASS);
    }
    for (const p of this.portals) {
      this.set(p.x, p.y, T.STONE); this.set(p.ax, p.ay, T.STONE);
      for (let i = -1; i <= 1; i++) {
        if (p.x === 1 || p.x === w - 2) this.set(p.x + (p.x === 1 ? -1 : 1), p.y + i, T.TREE);
      }
    }
    this.floodCleanup(cx, cy + 3, T.TREE);
  }
  addBuilding(x, y, w, h, kind, roof, label) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, T.HOUSE);
    this.buildings.push({ x, y, w, h, kind, roof, label });
  }

  collectObjects() {
    const d = this.def;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.tile(x, y) !== T.TREE) continue;
      const r = U.hash2(x, y, d.seed);
      this.objects.push({
        kind: d.pine ? 'pine' : 'tree', x: x + 0.5, y: y + 0.5,
        size: 0.85 + r * 0.35, hue: d.treeHue || (d.pine ? '#2f6a35' : '#3f8a3a'), r,
      });
    }
    this.objects.sort((a, b) => a.y - b.y);
  }

  // ---------------- เรนเดอร์พื้นลง canvas ล่วงหน้า ----------------
  palette() {
    const hex = h => { let c = h.replace('#', ''); const n = parseInt(c, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const g = hex(this.def.grass || '#6fae4a');
    return {
      grassD: g.map(v => v * 0.68), grassL: [g[0] * 1.12 + 18, g[1] * 1.1 + 12, g[2] * 0.95],
      dirtD: hex('#94744a'), dirtL: hex('#c9a874'),
      stoneD: hex('#9a9282'), stoneL: hex('#c4bca8'),
      waterS: hex('#63b4dc'), waterD: hex('#23578f'),
      caveD: hex('#3e342c'), caveL: hex('#6a5a4a'),
      rockD: hex('#1c1714'), rockL: hex('#2e2622'),
    };
  }
  waterDepth() {
    const dist = new Float32Array(this.w * this.h).fill(99);
    const q = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++)
      if (this.tile(x, y) !== T.WATER && this.tile(x, y) !== T.FOUNTAIN) { dist[this.idx(x, y)] = 0; q.push(x, y); }
    for (let i = 0; i < q.length; i += 2) {
      const x = q[i], y = q[i + 1], d = dist[this.idx(x, y)];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (!this.inb(nx, ny) || dist[this.idx(nx, ny)] <= d + 1) continue;
        dist[this.idx(nx, ny)] = d + 1; q.push(nx, ny);
      }
    }
    return dist;
  }
  terrainClass(t) {
    if (t === T.GRASS || t === T.TREE || t === T.HOUSE || t === T.FLOWER) return 'grass';
    if (t === T.DIRT) return 'dirt';
    if (t === T.STONE || t === T.FOUNTAIN) return 'stone';
    if (t === T.WATER) return 'water';
    if (t === T.CAVE) return 'cave';
    return 'rock';
  }
  renderGround() {
    const W = this.w * TILE, H = this.h * TILE, seed = this.def.seed;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const P = this.palette();
    const depth = this.waterDepth();
    // 1) สีพื้นฐานความละเอียดต่ำ แล้วขยายแบบนุ่ม → ไล่สีต่อเนื่อง ขอบนุ่ม
    const CS = 6, sw = Math.ceil(W / CS), sh = Math.ceil(H / CS);
    const small = document.createElement('canvas'); small.width = sw; small.height = sh;
    const sg = small.getContext('2d'), img = sg.createImageData(sw, sh);
    const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
    for (let yy = 0; yy < sh; yy++) for (let xx = 0; xx < sw; xx++) {
      const wx = xx * CS + CS / 2, wy = yy * CS + CS / 2;
      const tx = (wx / TILE) | 0, ty = (wy / TILE) | 0;
      const cls = this.terrainClass(this.tile(tx, ty));
      const n = U.fbm(wx / 120, wy / 120, seed, 4), fine = U.hash2(xx, yy, seed) * 0.12 - 0.06;
      let col;
      if (cls === 'grass') col = lerp3(P.grassD, P.grassL, U.clamp(n * 1.25 - 0.1 + fine, 0, 1));
      else if (cls === 'dirt') col = lerp3(P.dirtD, P.dirtL, U.clamp(n * 1.2 - 0.05 + fine, 0, 1));
      else if (cls === 'stone') col = lerp3(P.stoneD, P.stoneL, U.clamp(n + fine, 0, 1));
      else if (cls === 'water') col = lerp3(P.grassD, P.grassL, U.clamp(n * 1.25 - 0.1 + fine, 0, 1));
      else if (cls === 'cave') col = lerp3(P.caveD, P.caveL, U.clamp(n * 1.3 - 0.15 + fine, 0, 1));
      else col = lerp3(P.rockD, P.rockL, U.clamp(n + fine, 0, 1));
      const i = (yy * sw + xx) * 4;
      img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
    }
    sg.putImageData(img, 0, 0);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(small, 0, 0, sw * CS, sh * CS);
    // 2) รายละเอียดทีละช่อง
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.detailTile(g, x, y);
    // 3) ขอบธรรมชาติระหว่างพื้นต่างชนิด
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.edgeTile(g, x, y, P);
    // 3.5) น้ำทรงธรรมชาติจากหน้ากากเบลอ
    this.drawWater(g, P, depth);
    // 4) ผนังหิน (ถ้ำ) มีมิติ
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.tile(x, y) === T.ROCK) this.rockTile(g, x, y);
    // 5) ของตกแต่ง
    this.decorate(g);
    for (const b of this.buildings) this.drawBuilding(g, b);
    if (this.fountain) this.drawFountain(g);
    this.ground = c;
    // เก็บตำแหน่งน้ำไว้ทำคลื่นเคลื่อนไหว
    this.waterTiles = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.tile(x, y) !== T.WATER) continue;
      let n = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (this.tile(x + dx, y + dy) === T.WATER) n++;
      if (n >= 3) this.waterTiles.push(x, y);
    }
  }

  detailTile(g, x, y) {
    const t = this.tile(x, y), px = x * TILE, py = y * TILE, seed = this.def.seed;
    const h = (i, k = 0) => U.hash2(x * 31 + i, y * 17 + k, seed);
    const cls = this.terrainClass(t);
    if (cls === 'grass' && t !== T.HOUSE) {
      const base = this.def.grass || '#6fae4a';
      const n = 4 + Math.floor(h(1) * 5);
      if (!this._bladeCol) this._bladeCol = [U.shade(base, -0.28), U.shade(base, 0.18)];
      g.lineWidth = 1.1; g.lineCap = 'round';
      const dark = new Path2D(), light = new Path2D();
      for (let i = 0; i < n; i++) {
        const bx = px + h(i, 2) * TILE, by = py + 4 + h(i, 3) * (TILE - 4);
        const tall = 3 + h(i, 4) * 4, lean = (h(i, 5) - 0.5) * 3;
        dark.moveTo(bx, by); dark.quadraticCurveTo(bx + lean * 0.3, by - tall * 0.6, bx + lean, by - tall);
        light.moveTo(bx + 1.5, by); light.quadraticCurveTo(bx + 1.5 - lean * 0.2, by - tall * 0.5, bx + 2 - lean * 0.6, by - tall * 0.8);
      }
      g.strokeStyle = this._bladeCol[0]; g.stroke(dark);
      g.strokeStyle = this._bladeCol[1]; g.stroke(light);
      g.lineCap = 'butt';
      if (h(9) < 0.12) { g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(px + h(10) * TILE, py + h(11) * TILE, 1.2, 0, 7); g.fill(); }
      if (h(12) < 0.08) { g.fillStyle = 'rgba(250,220,80,0.9)'; g.beginPath(); g.arc(px + h(13) * TILE, py + h(14) * TILE, 1.2, 0, 7); g.fill(); }
      if (t === T.FLOWER) {
        const cols = ['#f4e04a', '#f47a9a', '#ffffff', '#b98af5', '#f5a14a', '#7ac8f5'];
        const n2 = 2 + Math.floor(h(20) * 3);
        for (let i = 0; i < n2; i++) {
          const fx = px + 6 + h(i, 21) * (TILE - 12), fy = py + 8 + h(i, 22) * (TILE - 14);
          const col = cols[Math.floor(h(i, 23) * cols.length)], r = 1.9 + h(i, 24) * 0.8;
          g.strokeStyle = 'rgba(40,90,30,0.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(fx, fy + 2); g.lineTo(fx + 0.5, fy + 6); g.stroke();
          g.fillStyle = 'rgba(0,0,0,0.15)'; g.beginPath(); g.ellipse(fx + 1, fy + 6, 3, 1.2, 0, 0, 7); g.fill();
          g.fillStyle = col;
          for (let k = 0; k < 5; k++) { const a = k * 1.2566 + h(i, 25); g.beginPath(); g.ellipse(fx + Math.cos(a) * r, fy + Math.sin(a) * r, r * 0.85, r * 0.6, a, 0, 7); g.fill(); }
          g.fillStyle = '#f8c830'; g.beginPath(); g.arc(fx, fy, r * 0.55, 0, 7); g.fill();
        }
      }
    } else if (cls === 'dirt') {
      for (let i = 0; i < 4; i++) {
        const sx = px + h(i, 30) * TILE, sy = py + h(i, 31) * TILE, r = 1 + h(i, 32) * 2;
        g.fillStyle = 'rgba(70,50,30,0.35)'; g.beginPath(); g.ellipse(sx + 0.6, sy + 0.8, r, r * 0.7, 0, 0, 7); g.fill();
        g.fillStyle = `rgba(${200 + h(i, 33) * 40 | 0},${175 + h(i, 34) * 30 | 0},${135},0.9)`; g.beginPath(); g.ellipse(sx, sy, r, r * 0.7, 0, 0, 7); g.fill();
      }
      if (h(40) < 0.3) { g.strokeStyle = 'rgba(90,65,40,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(px + h(41) * TILE, py + h(42) * TILE); g.lineTo(px + h(43) * TILE, py + h(44) * TILE); g.stroke(); }
    } else if (cls === 'stone' && t === T.STONE) {
      // หินปูพื้นทรงมน
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
        const off = (j % 2) * 6;
        const sx = px + i * 13.3 + off - 3 + (h(i + j * 3, 50) - 0.5) * 2, sy = py + j * 13.3 + 1 + (h(i + j * 3, 51) - 0.5) * 2;
        const k = h(i + j * 3, 52);
        g.fillStyle = `rgba(${150 + k * 55 | 0},${144 + k * 52 | 0},${128 + k * 46 | 0},0.95)`;
        rr(g, sx, sy, 11.5, 11, 3.5); g.fill();
        g.strokeStyle = 'rgba(70,64,55,0.55)'; g.lineWidth = 1; g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(sx + 2, sy + 1.5, 6, 1.5);
      }
    } else if (cls === 'water' && false) {
      g.strokeStyle = 'rgba(210,240,255,0.22)'; g.lineWidth = 1.2;
      for (let i = 0; i < 2; i++) {
        const wx = px + 4 + h(i, 60) * 24, wy = py + 8 + h(i, 61) * 24;
        g.beginPath(); g.moveTo(wx, wy); g.quadraticCurveTo(wx + 5, wy - 2.5, wx + 10, wy); g.stroke();
      }
    } else if (cls === 'cave') {
      if (h(70) < 0.5) {
        g.strokeStyle = 'rgba(20,14,10,0.45)'; g.lineWidth = 1;
        const cx = px + h(71) * TILE, cy = py + h(72) * TILE;
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + 5, cy + 4); g.lineTo(cx + 3, cy + 10); g.moveTo(cx + 5, cy + 4); g.lineTo(cx + 10, cy + 5); g.stroke();
      }
      for (let i = 0; i < 3; i++) {
        const sx = px + h(i, 73) * TILE, sy = py + h(i, 74) * TILE;
        g.fillStyle = 'rgba(150,130,110,0.35)'; g.beginPath(); g.ellipse(sx, sy, 1.8, 1.2, 0, 0, 7); g.fill();
      }
    }
  }

  // ขอบโค้งธรรมชาติ: หญ้าคลุมทับทางดิน/ลานหิน, ชายน้ำมีทราย+ฟอง
  edgeTile(g, x, y, P) {
    const t = this.tile(x, y), cls = this.terrainClass(t), px = x * TILE, py = y * TILE, seed = this.def.seed;
    const h = (i, k = 0) => U.hash2(x * 13 + i, y * 29 + k, seed + 5);
    const sides = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    if (cls === 'dirt' || (cls === 'stone' && t === T.STONE)) {
      for (const [dx, dy] of sides) {
        const nc = this.terrainClass(this.tile(x + dx, y + dy));
        if (nc !== 'grass') continue;
        for (let i = 0; i < 7; i++) {
          const along = (i + 0.5) / 7 * TILE + (h(i, dx * 3 + dy) - 0.5) * 4;
          const inset = 1 + h(i, 9 + dx + dy * 2) * 5;
          const r = 3 + h(i, 11 + dx) * 4;
          const cx = dx ? (dx > 0 ? px + TILE - inset : px + inset) : px + along;
          const cy = dy ? (dy > 0 ? py + TILE - inset : py + inset) : py + along;
          g.fillStyle = 'rgba(40,30,15,0.18)'; g.beginPath(); g.arc(cx + 0.8, cy + 1.4, r, 0, 7); g.fill();
          const n = U.fbm(cx / 120, cy / 120, seed, 4);
          const k = U.clamp(n * 1.25 - 0.1, 0, 1);
          g.fillStyle = `rgb(${P.grassD[0] + (P.grassL[0] - P.grassD[0]) * k | 0},${P.grassD[1] + (P.grassL[1] - P.grassD[1]) * k | 0},${P.grassD[2] + (P.grassL[2] - P.grassD[2]) * k | 0})`;
          g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
        }
      }
    } else if (cls === 'water' && false) {
      for (const [dx, dy] of sides) {
        const nc = this.terrainClass(this.tile(x + dx, y + dy));
        if (nc === 'water' || this.tile(x + dx, y + dy) === T.FOUNTAIN) continue;
        const horiz = dy !== 0;
        const ex = dx > 0 ? px + TILE : px, ey = dy > 0 ? py + TILE : py;
        const grd = horiz ? g.createLinearGradient(0, ey, 0, ey - dy * 9) : g.createLinearGradient(ex, 0, ex - dx * 9, 0);
        grd.addColorStop(0, 'rgba(226,210,160,0.95)'); grd.addColorStop(0.45, 'rgba(200,225,220,0.55)'); grd.addColorStop(1, 'rgba(200,230,240,0)');
        g.fillStyle = grd;
        if (horiz) g.fillRect(px, dy > 0 ? py + TILE - 9 : py, TILE, 9); else g.fillRect(dx > 0 ? px + TILE - 9 : px, py, 9, TILE);
        g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.3;
        g.beginPath();
        for (let i = 0; i <= 6; i++) {
          const al = i / 6 * TILE, wob = Math.sin(i * 2.1 + h(i, 7) * 6) * 1.5 + 5;
          const fx = horiz ? px + al : (dx > 0 ? px + TILE - wob : px + wob), fy = horiz ? (dy > 0 ? py + TILE - wob : py + wob) : py + al;
          if (i === 0) g.moveTo(fx, fy); else g.lineTo(fx, fy);
        }
        g.stroke();
      }
    }
  }

  drawWater(g, P, depth) {
    const S = 4, ts = TILE / S;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.tile(x, y) === T.WATER) {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    if (x1 < 0) return;
    x0 -= 1; y0 -= 1; x1 += 2; y1 += 2;
    const mw = Math.ceil((x1 - x0) * ts), mh = Math.ceil((y1 - y0) * ts);
    const m = document.createElement('canvas'); m.width = mw; m.height = mh;
    const mg = m.getContext('2d');
    // หน้ากากน้ำ + box blur หลายรอบ (≈ gaussian): A = รูปทรงขอบ, Dp = ความลึก
    const M = new Float32Array(mw * mh);
    for (let py = 0; py < mh; py++) for (let px = 0; px < mw; px++) {
      if (this.tile(x0 + ((px / ts) | 0), y0 + ((py / ts) | 0)) === T.WATER) M[py * mw + px] = 1;
    }
    const blur = (src, R, passes) => {
      let A = Float32Array.from(src), B = new Float32Array(src.length);
      const inv = 1 / (2 * R + 1);
      for (let pass = 0; pass < passes; pass++) {
        for (let py = 0; py < mh; py++) {
          let acc = 0; const row = py * mw;
          for (let k = -R; k <= R; k++) acc += A[row + Math.min(mw - 1, Math.max(0, k))];
          for (let px = 0; px < mw; px++) { B[row + px] = acc * inv; acc += A[row + Math.min(mw - 1, px + R + 1)] - A[row + Math.max(0, px - R)]; }
        }
        for (let px = 0; px < mw; px++) {
          let acc = 0;
          for (let k = -R; k <= R; k++) acc += B[Math.min(mh - 1, Math.max(0, k)) * mw + px];
          for (let py = 0; py < mh; py++) { A[py * mw + px] = acc * inv; acc += B[Math.min(mh - 1, py + R + 1) * mw + px] - B[Math.max(0, py - R) * mw + px]; }
        }
      }
      return A;
    };
    const A = blur(M, 5, 3), Dp = blur(M, 12, 2);
    const id = mg.createImageData(mw, mh), d = id.data;
    const WS = P.waterS, WD = P.waterD;
    for (let py = 0; py < mh; py++) {
      for (let px = 0; px < mw; px++) {
        const i = (py * mw + px) * 4, a = A[py * mw + px];
        if (a < 0.3) continue;
        if (a >= 0.56) {
          const k = Math.min(1, Math.max(0, (Dp[py * mw + px] - 0.45) * 2 + (((px * 7 + py * 13) % 11) / 11 - 0.5) * 0.05));
          d[i] = WS[0] + (WD[0] - WS[0]) * k; d[i + 1] = WS[1] + (WD[1] - WS[1]) * k; d[i + 2] = WS[2] + (WD[2] - WS[2]) * k; d[i + 3] = 255;
        } else if (a >= 0.5) { d[i] = 236; d[i + 1] = 248; d[i + 2] = 252; d[i + 3] = 215; }
        else { d[i] = 214; d[i + 1] = 196; d[i + 2] = 146; d[i + 3] = Math.min(1, (a - 0.3) / 0.2) * 230; }
      }
    }
    mg.putImageData(id, 0, 0);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(m, x0 * TILE, y0 * TILE, mw * S, mh * S);
  }

  rockTile(g, x, y) {
    const px = x * TILE, py = y * TILE, h = i => U.hash2(x * 7 + i, y * 11, this.def.seed);
    const below = this.tile(x, y + 1) !== T.ROCK, above = this.tile(x, y - 1) !== T.ROCK;
    if (below) {
      const top = py + TILE * 0.38;
      const grd = g.createLinearGradient(0, top, 0, py + TILE);
      grd.addColorStop(0, '#5e4d40'); grd.addColorStop(1, '#2e241e');
      g.fillStyle = grd; g.fillRect(px, top, TILE, TILE - (top - py));
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1;
      for (let i = 0; i < 3; i++) { const sx = px + 5 + h(i) * 30; g.beginPath(); g.moveTo(sx, top + 3); g.lineTo(sx + (h(i + 5) - 0.5) * 4, py + TILE - 2); g.stroke(); }
      g.fillStyle = 'rgba(160,140,120,0.35)'; g.fillRect(px, top, TILE, 2);
      // เงาทอดลงพื้น
      const sg = g.createLinearGradient(0, py + TILE, 0, py + TILE + 12);
      sg.addColorStop(0, 'rgba(0,0,0,0.45)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = sg; g.fillRect(px, py + TILE, TILE, 12);
    }
    if (above) { g.fillStyle = 'rgba(120,100,85,0.45)'; g.fillRect(px, py, TILE, 2); }
    if (h(9) < 0.35) { g.fillStyle = 'rgba(90,75,62,0.5)'; g.beginPath(); g.ellipse(px + 8 + h(10) * 24, py + 6 + h(11) * 8, 5, 3, 0, 0, 7); g.fill(); }
  }

  // ของตกแต่ง (ไม่กีดขวาง): พุ่มไม้ ก้อนหิน เห็ด คริสตัล
  decorate(g) {
    const d = this.def, seed = d.seed;
    for (let y = 2; y < this.h - 2; y++) for (let x = 2; x < this.w - 2; x++) {
      const t = this.tile(x, y), r = U.hash2(x, y, seed + 99);
      if (this.portals.some(p => Math.abs(p.x - x) + Math.abs(p.y - y) < 3)) continue;
      const cx = x * TILE + 8 + U.hash2(x, y, seed + 7) * 24, cy = y * TILE + 10 + U.hash2(y, x, seed + 8) * 22;
      if (d.kind === 'cave' && t === T.CAVE) {
        if (r < 0.035) this.drawCrystal(g, cx, cy, r);
        else if (r < 0.08) this.drawStone(g, cx, cy, 0.7, '#6a5a4c');
      } else if (t === T.GRASS && d.kind !== 'town') {
        if (r < 0.025) this.drawBush(g, cx, cy, r);
        else if (r < 0.045) this.drawStone(g, cx, cy, 0.8 + r * 6, '#9a9a90');
        else if (r < 0.055) this.drawMushroom(g, cx, cy);
      } else if (t === T.GRASS && d.kind === 'town' && r < 0.03) this.drawBush(g, cx, cy, r);
    }
  }
  drawBush(g, x, y, r) {
    const base = this.def.pine ? '#2f6a35' : '#3f8a3a';
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(x + 2, y + 5, 12, 4, 0, 0, 7); g.fill();
    for (const [ox, oy, rad, sh] of [[-6, 0, 6, -0.15], [6, 0, 6, -0.15], [0, -3, 7.5, 0], [-2, -5, 4, 0.2]]) {
      g.fillStyle = U.shade(base, sh); g.beginPath(); g.arc(x + ox, y + oy, rad, 0, 7); g.fill();
    }
    if (r < 0.012) { g.fillStyle = '#d83040'; for (const [bx, by] of [[-4, -2], [3, -4], [5, 1]]) { g.beginPath(); g.arc(x + bx, y + by, 1.4, 0, 7); g.fill(); } }
  }
  drawStone(g, x, y, s, col) {
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x + 1.5, y + 3 * s, 8 * s, 3 * s, 0, 0, 7); g.fill();
    g.fillStyle = col; g.beginPath(); g.ellipse(x, y, 7 * s, 5 * s, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.ellipse(x - 2 * s, y - 2 * s, 3.5 * s, 1.8 * s, -0.3, 0, 7); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y, 7 * s, 5 * s, 0, 0, 7); g.stroke();
  }
  drawMushroom(g, x, y) {
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(x + 1, y + 3, 5, 1.8, 0, 0, 7); g.fill();
    g.fillStyle = '#f2ead0'; g.fillRect(x - 1.2, y - 3, 2.4, 5);
    g.fillStyle = '#d8433a'; g.beginPath(); g.ellipse(x, y - 3, 4.5, 3, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 1.5, y - 4.5, 0.8, 0, 7); g.fill(); g.beginPath(); g.arc(x + 1.8, y - 4, 0.7, 0, 7); g.fill();
  }
  drawCrystal(g, x, y, r) {
    const col = r < 0.018 ? '#7fd8ff' : '#c08aff';
    const glow = g.createRadialGradient(x, y - 4, 1, x, y - 4, 16);
    glow.addColorStop(0, col + '66'); glow.addColorStop(1, col + '00');
    g.fillStyle = glow; g.beginPath(); g.arc(x, y - 4, 16, 0, 7); g.fill();
    for (const [ox, hgt, w] of [[-3, 11, 3], [2, 15, 3.5], [5, 8, 2.5]]) {
      g.fillStyle = col; g.beginPath(); g.moveTo(x + ox - w, y); g.lineTo(x + ox, y - hgt); g.lineTo(x + ox + w, y); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.moveTo(x + ox - w * 0.3, y - 1); g.lineTo(x + ox, y - hgt + 1); g.lineTo(x + ox + w * 0.2, y - 1); g.closePath(); g.fill();
    }
  }

  drawBuilding(g, b) {
    const px = b.x * TILE, py = b.y * TILE, pw = b.w * TILE, ph = b.h * TILE;
    if (b.kind === 'castle') {
      g.fillStyle = '#a8a092'; g.fillRect(px, py + ph * 0.35, pw, ph * 0.65);
      g.fillStyle = '#8a8274';
      for (let i = 0; i < pw; i += 20) g.fillRect(px + i, py + ph * 0.35 - 10, 12, 10);
      // หอคอย
      for (const tx of [px - 4, px + pw - 44, px + pw / 2 - 26]) {
        const tw = tx === px + pw / 2 - 26 ? 52 : 48;
        g.fillStyle = '#b8b0a2'; g.fillRect(tx, py + 18, tw, ph - 18);
        g.fillStyle = b.roof;
        g.beginPath(); g.moveTo(tx - 6, py + 22); g.lineTo(tx + tw / 2, py - 30); g.lineTo(tx + tw + 6, py + 22); g.closePath(); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.2)';
        g.beginPath(); g.moveTo(tx + tw / 2, py - 30); g.lineTo(tx + tw + 6, py + 22); g.lineTo(tx + tw / 2, py + 22); g.closePath(); g.fill();
        g.fillStyle = '#e8e0a0'; g.fillRect(tx + tw / 2 - 5, py + 40, 10, 16);
        g.strokeStyle = '#555'; g.lineWidth = 2; g.beginPath(); g.moveTo(tx + tw / 2, py - 30); g.lineTo(tx + tw / 2, py - 48); g.stroke();
        g.fillStyle = '#d03030'; g.beginPath(); g.moveTo(tx + tw / 2, py - 48); g.lineTo(tx + tw / 2 + 16, py - 43); g.lineTo(tx + tw / 2, py - 38); g.fill();
      }
      // ประตู
      g.fillStyle = '#4a3020';
      g.beginPath(); g.moveTo(px + pw / 2 - 22, py + ph); g.lineTo(px + pw / 2 - 22, py + ph - 34);
      g.arc(px + pw / 2, py + ph - 34, 22, Math.PI, 0); g.lineTo(px + pw / 2 + 22, py + ph); g.fill();
      g.strokeStyle = '#2a1a10'; g.lineWidth = 2;
      for (let i = -14; i <= 14; i += 7) { g.beginPath(); g.moveTo(px + pw / 2 + i, py + ph); g.lineTo(px + pw / 2 + i, py + ph - 48); g.stroke(); }
      this.drawSign(g, px + pw / 2, py + ph * 0.52, b.label);
      return;
    }
    const wallTop = py + ph * 0.45;
    // เงา
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(px + 6, py + ph - 2, pw, 6);
    // ผนัง
    g.fillStyle = '#efe2c4'; g.fillRect(px + 4, wallTop, pw - 8, ph - (wallTop - py));
    g.strokeStyle = '#8a6a44'; g.lineWidth = 4;
    g.strokeRect(px + 6, wallTop + 2, pw - 12, ph - (wallTop - py) - 4);
    g.beginPath(); g.moveTo(px + pw / 2, wallTop); g.lineTo(px + pw / 2, py + ph); g.stroke();
    // หลังคา
    g.fillStyle = b.roof;
    g.beginPath(); g.moveTo(px - 4, wallTop + 6); g.lineTo(px + 18, py + 2); g.lineTo(px + pw - 18, py + 2); g.lineTo(px + pw + 4, wallTop + 6); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 2;
    for (let i = 1; i < 6; i++) {
      const yy = py + 2 + (wallTop + 6 - py - 2) * i / 6;
      g.beginPath(); g.moveTo(px + 18 - 22 * i / 6, yy); g.lineTo(px + pw - 18 + 22 * i / 6, yy); g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(px + 18, py + 2, pw - 36, 6);
    // หน้าต่าง
    g.fillStyle = '#6aa0d0'; g.strokeStyle = '#6a4a2a'; g.lineWidth = 3;
    for (const wx of [px + pw * 0.2, px + pw * 0.8 - 22]) { g.fillRect(wx, wallTop + 16, 22, 18); g.strokeRect(wx, wallTop + 16, 22, 18); }
    // ประตู
    const dx = px + pw / 2 - 14;
    g.fillStyle = '#6a4424'; g.fillRect(dx, py + ph - 38, 28, 38);
    g.fillStyle = '#e0c040'; g.beginPath(); g.arc(dx + 22, py + ph - 18, 2.5, 0, 7); g.fill();
    this.drawSign(g, px + pw / 2, py + 26, b.label);
  }
  drawSign(g, x, y, text) {
    g.font = 'bold 13px "Trebuchet MS", sans-serif';
    const w = g.measureText(text).width + 16;
    g.fillStyle = '#5a3a1a'; g.fillRect(x - w / 2, y - 11, w, 22);
    g.fillStyle = '#f0dca8'; g.fillRect(x - w / 2 + 2, y - 9, w - 4, 18);
    g.fillStyle = '#4a2a10'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, x, y + 1);
  }
  drawFountain(g) {
    const x = this.fountain.x * TILE, y = this.fountain.y * TILE;
    g.fillStyle = '#8a8478'; g.beginPath(); g.ellipse(x, y + 4, TILE * 1.55, TILE * 1.35, 0, 0, 7); g.fill();
    g.fillStyle = '#d8d2c2'; g.beginPath(); g.ellipse(x, y, TILE * 1.5, TILE * 1.3, 0, 0, 7); g.fill();
    g.fillStyle = '#4a90d0'; g.beginPath(); g.ellipse(x, y, TILE * 1.3, TILE * 1.1, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.ellipse(x - 12, y - 10, 20, 8, -0.3, 0, 7); g.fill();
    g.fillStyle = '#c8c2b2'; g.beginPath(); g.ellipse(x, y, 12, 9, 0, 0, 7); g.fill();
    g.fillStyle = '#b0aa9a'; g.fillRect(x - 4, y - 26, 8, 26);
    g.fillStyle = '#d8d2c2'; g.beginPath(); g.ellipse(x, y - 26, 12, 5, 0, 0, 7); g.fill();
  }

  renderMini() {
    const S = 3;
    const c = document.createElement('canvas');
    c.width = this.w * S; c.height = this.h * S;
    const g = c.getContext('2d');
    const col = {
      [T.GRASS]: this.def.grass || '#6fae4a', [T.FLOWER]: this.def.grass || '#6fae4a', [T.TREE]: '#2d5e2a', [T.WATER]: '#3f7fc4',
      [T.DIRT]: '#b8935f', [T.STONE]: '#c8c0ae', [T.WALL]: '#222', [T.CAVE]: '#7a6a5a', [T.ROCK]: '#1e1814',
      [T.HOUSE]: '#a05040', [T.FOUNTAIN]: '#4a90d0',
    };
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      g.fillStyle = col[this.tile(x, y)] || '#000';
      g.fillRect(x * S, y * S, S, S);
    }
    this.mini = c; this.miniScale = S;
  }

  randomWalkable(avoid = [], minDist = 0, tries = 300) {
    for (let i = 0; i < tries; i++) {
      const x = U.randi(2, this.w - 3), y = U.randi(2, this.h - 3);
      if (!this.walkable(x, y)) continue;
      if (this.portals.some(p => U.dist(p.x, p.y, x, y) < 4)) continue;
      if (avoid.some(a => U.dist(a.x, a.y, x, y) < minDist)) continue;
      return { x, y };
    }
    return { x: this.w >> 1, y: this.h >> 1 };
  }
}
