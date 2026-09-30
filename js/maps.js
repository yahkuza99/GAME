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
  renderGround() {
    const c = document.createElement('canvas');
    c.width = this.w * TILE; c.height = this.h * TILE;
    const g = c.getContext('2d');
    const d = this.def;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.drawTile(g, x, y);
    // ขอบทุ่ง/ขอบน้ำนุ่มนวล
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const t = this.tile(x, y);
      if (t !== T.WATER) continue;
      const px = x * TILE, py = y * TILE;
      g.fillStyle = 'rgba(230,220,170,0.85)';
      if (this.tile(x, y - 1) !== T.WATER) g.fillRect(px, py, TILE, 4);
      if (this.tile(x, y + 1) !== T.WATER) g.fillRect(px, py + TILE - 3, TILE, 3);
      if (this.tile(x - 1, y) !== T.WATER) g.fillRect(px, py, 3, TILE);
      if (this.tile(x + 1, y) !== T.WATER) g.fillRect(px + TILE - 3, py, 3, TILE);
    }
    for (const b of this.buildings) this.drawBuilding(g, b);
    if (this.fountain) this.drawFountain(g);
    this.ground = c;
    void d;
  }

  drawTile(g, x, y) {
    const t = this.tile(x, y), px = x * TILE, py = y * TILE;
    const r = U.hash2(x, y, this.def.seed), r2 = U.hash2(y, x, 7);
    const grass = this.def.grass || '#6fae4a';
    const grassBase = () => {
      g.fillStyle = U.shade(grass, (r - 0.5) * 0.12);
      g.fillRect(px, py, TILE, TILE);
      g.strokeStyle = U.shade(grass, -0.18);
      g.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const bx = px + U.hash2(x * 4 + i, y, 3) * TILE, by = py + U.hash2(x, y * 4 + i, 5) * TILE;
        g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + 1.5, by - 4); g.stroke();
      }
      g.strokeStyle = U.shade(grass, 0.15);
      for (let i = 0; i < 2; i++) {
        const bx = px + U.hash2(x * 9 + i, y, 11) * TILE, by = py + U.hash2(x, y * 9 + i, 13) * TILE;
        g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - 1, by - 3); g.stroke();
      }
    };
    switch (t) {
      case T.GRASS: case T.TREE: case T.HOUSE: grassBase(); break;
      case T.FLOWER: {
        grassBase();
        const cols = ['#f4e04a', '#f06a8a', '#ffffff', '#b07af0', '#f09a3a'];
        for (let i = 0; i < 3; i++) {
          const fx = px + 6 + U.hash2(x * 3 + i, y, 17) * (TILE - 12), fy = py + 6 + U.hash2(x, y * 3 + i, 19) * (TILE - 12);
          g.fillStyle = cols[Math.floor(U.hash2(x + i, y, 23) * cols.length)];
          for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(fx + Math.cos(k * 1.57) * 2, fy + Math.sin(k * 1.57) * 2, 1.8, 0, 7); g.fill(); }
          g.fillStyle = '#f8d030'; g.beginPath(); g.arc(fx, fy, 1.3, 0, 7); g.fill();
        }
        break;
      }
      case T.DIRT: {
        g.fillStyle = U.shade('#b8935f', (r - 0.5) * 0.12);
        g.fillRect(px, py, TILE, TILE);
        g.fillStyle = 'rgba(90,60,30,0.35)';
        for (let i = 0; i < 3; i++) g.fillRect(px + U.hash2(x * 5 + i, y, 29) * TILE, py + U.hash2(x, y * 5 + i, 31) * TILE, 2, 2);
        g.fillStyle = 'rgba(255,240,200,0.25)';
        g.fillRect(px + r2 * TILE, py + r * TILE, 3, 2);
        break;
      }
      case T.STONE: {
        g.fillStyle = U.shade('#bdb5a2', (r - 0.5) * 0.1);
        g.fillRect(px, py, TILE, TILE);
        g.strokeStyle = 'rgba(90,80,65,0.35)'; g.lineWidth = 1;
        const off = (y % 2) * (TILE / 4);
        g.beginPath();
        g.moveTo(px, py + TILE / 2 + 0.5); g.lineTo(px + TILE, py + TILE / 2 + 0.5);
        g.moveTo(px, py + 0.5); g.lineTo(px + TILE, py + 0.5);
        g.moveTo(px + off + TILE / 4 + 0.5, py); g.lineTo(px + off + TILE / 4 + 0.5, py + TILE / 2);
        g.moveTo(px + ((off + TILE * 3 / 4) % TILE) + 0.5, py + TILE / 2); g.lineTo(px + ((off + TILE * 3 / 4) % TILE) + 0.5, py + TILE);
        g.stroke();
        break;
      }
      case T.WATER: {
        g.fillStyle = U.shade('#3f7fc4', (r - 0.5) * 0.08);
        g.fillRect(px, py, TILE, TILE);
        g.strokeStyle = 'rgba(200,230,255,0.45)'; g.lineWidth = 1.5;
        g.beginPath();
        const wy = py + 10 + r * 20;
        g.moveTo(px + 6, wy); g.quadraticCurveTo(px + 12, wy - 3, px + 18, wy); g.quadraticCurveTo(px + 24, wy + 3, px + 30, wy);
        g.stroke();
        break;
      }
      case T.FOUNTAIN: {
        g.fillStyle = '#bdb5a2'; g.fillRect(px, py, TILE, TILE); break;
      }
      case T.CAVE: {
        g.fillStyle = U.shade('#5d4f43', (r - 0.5) * 0.14);
        g.fillRect(px, py, TILE, TILE);
        g.strokeStyle = 'rgba(30,20,15,0.35)'; g.lineWidth = 1;
        if (r > 0.6) { g.beginPath(); g.moveTo(px + r2 * 30, py + 5); g.lineTo(px + r2 * 30 + 6, py + 14); g.lineTo(px + r2 * 30 + 3, py + 22); g.stroke(); }
        g.fillStyle = 'rgba(140,120,100,0.3)';
        g.fillRect(px + r * 34, py + r2 * 34, 3, 3);
        break;
      }
      case T.ROCK: {
        g.fillStyle = U.shade('#2e2622', (r - 0.5) * 0.15);
        g.fillRect(px, py, TILE, TILE);
        if (this.tile(x, y + 1) !== T.ROCK) {
          // หน้าผาหันลงด้านล่าง
          const grd = g.createLinearGradient(0, py + TILE * 0.35, 0, py + TILE);
          grd.addColorStop(0, '#5a4a3e'); grd.addColorStop(1, '#3a2e26');
          g.fillStyle = grd; g.fillRect(px, py + TILE * 0.4, TILE, TILE * 0.6);
          g.strokeStyle = 'rgba(0,0,0,0.3)';
          g.beginPath(); g.moveTo(px + r * 20 + 5, py + TILE * 0.45); g.lineTo(px + r * 20 + 8, py + TILE); g.stroke();
        } else {
          g.fillStyle = 'rgba(80,65,55,0.5)';
          g.fillRect(px + r * 30, py + r2 * 30, 6, 4);
        }
        break;
      }
      default: g.fillStyle = '#000'; g.fillRect(px, py, TILE, TILE);
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
