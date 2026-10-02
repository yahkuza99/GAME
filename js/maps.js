'use strict';
// ============================================================
//  แผนที่: นิยาม + ตัวสร้างแผนที่แบบสุ่ม (seed คงที่) + เรนเดอร์พื้น
// ============================================================

const T = { GRASS: 0, TREE: 1, WATER: 2, DIRT: 3, STONE: 4, WALL: 5, FLOWER: 6, CAVE: 7, ROCK: 8, HOUSE: 9, FOUNTAIN: 10 };
const SOLID = new Set([T.TREE, T.WATER, T.WALL, T.ROCK, T.HOUSE, T.FOUNTAIN]);
const SIGHT_BLOCK = new Set([T.TREE, T.WALL, T.ROCK, T.HOUSE]);

const MAP_DEFS = {
  eldheim: {
    name: 'Neo Eldheim', thai: L('นครนีโอเอลด์ไฮม์ ฐานที่มั่นแห่งแอนดรอยด์', 'City of Neo Eldheim — Bastion of the Androids'), w: 40, h: 40, kind: 'town', seed: 101,
    links: { E: 'meadow', S: 'wolfwood' }, spawns: [],
    arrive: { arena: [23.5, 17.5] }, // ออกจากลานประลอง → โผล่ข้าง Bifrost Keeper (ด้านเหนือของเมืองเป็นหอคอย เดินไม่ได้)
    dummies: [[18, 28], [20, 28], [22, 28]], // หุ่นฝึกซ้อม (ทดสอบการโจมตี)
    grass: '#74b04c',
    npcs: [
      { id: 'bifrost', name: 'Bifrost Keeper', x: 23, y: 15, look: 'keeper' },
      { id: 'jobmaster', name: 'Mimir AI', x: 17, y: 15, look: 'jobmaster' },
      { id: 'tool', name: 'Tool Dealer', x: 8, y: 17, look: 'merchant' },
      { id: 'weapon', name: 'Weapon Dealer', x: 32, y: 17, look: 'smith' },
      { id: 'armor', name: 'Armor Dealer', x: 8, y: 31, look: 'merchant2' },
      { id: 'refine', name: 'Brokk Forge-Bot', x: 32, y: 31, look: 'refiner' },
      { id: 'nurse', name: 'Eir Repair Unit', x: 16, y: 25, look: 'nurse' },
      { id: 'guide', name: 'Guard Unit Rolf', x: 24, y: 25, look: 'guide' },
      { id: 'storage', name: 'Storage Unit Kaia', x: 27, y: 20, look: 'storage' },
    ],
  },
  meadow: {
    name: 'Emerald Meadow', thai: L('ทุ่งหญ้ามรกต', 'Emerald Grasslands'), w: 84, h: 84, kind: 'field', seed: 202, // ขยาย 1.5 เท่า (2026-10-02)
    links: { W: 'eldheim', E: 'mistlake' }, level: '1-6',
    spawns: [['pudding', 36], ['leafworm', 20], ['moonbun', 20], ['ember_pudding', 16], ['buzzfly', 13]],
    grass: '#6fae4a', trees: 0.9, ponds: 4, flowers: 0.05,
  },
  mistlake: {
    name: 'Mistlake Plains', thai: L('ที่ราบทะเลสาบหมอก', 'Plains of the Misty Lake'), w: 84, h: 84, kind: 'field', seed: 303,
    links: { W: 'meadow' }, level: '8-16 (MVP: Seraph Core)',
    spawns: [['fiddlehopper', 27], ['stumpling', 22], ['capshroom', 22], ['moss_pudding', 22]], mvp: 'seraph_pudding',
    grass: '#86b04a', trees: 0.8, ponds: 8, flowers: 0.08, treeHue: '#5f9a3a', flora: 'lake',
  },
  wolfwood: {
    name: 'Wolfwood Forest', thai: L('ป่าหมาป่า', 'Forest of the Wolves'), w: 84, h: 84, kind: 'field', seed: 404,
    links: { N: 'eldheim', S: 'helcave' }, level: '18-30',
    spawns: [['ashtail', 29], ['fenrir_pup', 25], ['mossback', 18], ['tuskboar', 14]], // tuskboar ตีก่อน: เพิ่มน้อย กันโดนรุม
    grass: '#4f8a3a', trees: 1.7, ponds: 2, flowers: 0.02, pine: true,
    dark: 'rgba(6,14,38,0.62)', nightLight: 5, // กลางคืนแสงจันทร์ (ตามภาพประกอบแผนที่) — เห็ดเรืองแสงเป็นแหล่งแสง
  },
  // ลานประลอง PvP: ผู้เล่นตีกันได้ ไม่มีมอน ตายไม่เสีย EXP (ต้องออนไลน์ถึงจะเจอคู่ต่อสู้)
  arena: {
    name: 'Valhalla Arena', thai: L('ลานประลองวัลฮัลลา (PvP)', 'Valhalla Proving Grounds (PvP)'), w: 34, h: 34, kind: 'field', seed: 606, pvp: true,
    links: { S: 'eldheim' }, level: 'PvP', spawns: [], dummies: [[15, 9], [17, 9], [19, 9]],
    grass: '#8a9a5a', trees: 0.25, ponds: 0, flowers: 0.02, flora: 'arena',
  },
  helcave: {
    name: "Hel's Hollow", thai: L('โพรงถ้ำแห่งเฮล', 'Cavern of Hel'), w: 75, h: 75, kind: 'cave', seed: 505, dark: true,
    links: { N: 'wolfwood' }, level: '17-45 (MVP: Kitsura EX)',
    npcs: [{ id: 'hel', name: 'Hel', x: 37, y: 40, look: 'hel' }], // ราชินีแห่งโพรง (บทที่ 5) นั่งกลางชั้นวางประกาย
    spawns: [['draugr', 18], ['bone_warden', 14], ['hel_maiden', 13], ['hel_guard', 11]], mvp: 'kitsura',
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
// ภาพฉาก (assets/prop_*) — ไม่มีภาพจะวาดด้วยโค้ดแบบเดิม
const PROP_ART = { pylon: 'prop_pylon', crate: 'prop_crate', scrap: 'prop_scrap', bush: 'prop_bush', rock: 'prop_rock', mushroom: 'prop_mushroom', crystal: 'prop_crystal' };
const BUILDING_ART = { SUPPLY: 'prop_bld_shop', ARMORY: 'prop_bld_house', PLATING: 'prop_bld_house', FORGE: 'prop_bld_forge' };
const propArt = k => !!k && typeof Art !== 'undefined' && Art.has(k);

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
    // ลานหน้าวาร์ป: เอาต้นไม้ที่ยอดไม้บังวาร์ปออก (ต้นที่อยู่ต่ำกว่าวาร์ป 3 แถว ยอดจะบัง) ในเมืองคงต้นไม้ขอบนอกข้างวาร์ปไว้
    for (const p of this.portals) for (let dy = -1; dy <= 3; dy++) for (let dx = -2; dx <= 2; dx++) {
      const x = p.x + dx, y = p.y + dy;
      if (!this.inb(x, y) || (def.kind === 'town' && dy < 1 && (x <= 0 || y <= 0 || x >= this.w - 1 || y >= this.h - 1))) continue;
      if (this.tile(x, y) === T.TREE) this.set(x, y, this.tile(p.x, p.y));
    }
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
    const clusters = Math.floor((w * h / 170) * (d.trees || 1) * (typeof Flora !== 'undefined' ? 1.35 : 1));
    // Flora (js/flora.js): ต้นไม้ใหญ่ยอดกว้าง → ชนเฉพาะลำต้น วางเป็นกลุ่ม 1-3 ต้นห่างกันพอเดินลอดได้
    // ป่าทึบ (trees ≥ 1.5) ยังมีพุ่มไม้ทึบขนาดเล็กปนบ้าง • ไม่มี Flora = ก้อนต้นไม้แบบเดิม
    const groves = typeof Flora !== 'undefined';
    for (let i = 0; i < clusters; i++) {
      const cx = 3 + R() * (w - 6), cy = 3 + R() * (h - 6);
      if (!groves) this.disc(cx, cy, 0.6 + R() * 2.4, T.TREE, 0.75);
      else if ((d.trees || 1) >= 1.5 && i % 4 === 0) this.disc(cx, cy, 0.6 + R() * 1.2, T.TREE, 0.75);
      else this.grove(cx, cy, (d.trees || 1) >= 1.5);
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

  // กลุ่มต้นไม้ 1-3(4) ต้น: ลำต้นละ 1 ช่อง ไม่ติดกัน (8 ทิศ) → มีช่องเดินระหว่างต้นเสมอ
  grove(cx, cy, thick) {
    const R = this.rng, n = 1 + Math.floor(R() * (thick ? 4 : 3));
    for (let i = 0; i < n; i++) {
      let x = Math.floor(cx), y = Math.floor(cy);
      if (i) { const a = R() * Math.PI * 2, r = 2 + R() * 0.9; x = Math.round(cx - 0.5 + Math.cos(a) * r); y = Math.round(cy - 0.5 + Math.sin(a) * r * 0.8); }
      if (x < 3 || y < 3 || x >= this.w - 3 || y >= this.h - 3 || this.tile(x, y) !== T.GRASS) continue;
      let ok = true;
      for (let yy = y - 1; yy <= y + 1 && ok; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if (this.tile(xx, yy) === T.TREE) { ok = false; break; }
      if (ok && !(this.def.dummies || []).some(q => Math.abs(q[0] - x) <= 1 && Math.abs(q[1] - y) <= 1)) this.set(x, y, T.TREE);
    }
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

  // เมือง Neo Eldheim ตามภาพ assets/map_eldheim.webp: ลานหินอ่อน น้ำพุคริสตัลกลางสระกลม
  // คลองตะวันออก/ตะวันตก/ใต้ + สะพานจริง (น้ำเดินไม่ได้ ข้ามได้เฉพาะสะพาน) กระถางต้นไม้ สวนมุมเมือง — ภาพวาดอยู่ใน js/townmap.js
  genTown() {
    const R = this.rng, w = this.w, h = this.h, cx = w >> 1, cy = h >> 1, C = cx + 0.5;
    this.fill(T.GRASS);
    this.border(T.TREE, 2);
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) this.set(x, y, T.STONE);
    // สวนมุมเมือง (หญ้า + ต้นไม้)
    this.beds = [];
    const bed = (x0, y0, x1, y1, trees) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const r = U.hash2(x, y, 4711);
        this.set(x, y, r < trees ? T.TREE : r < trees + (trees ? 0.07 : 0.2) ? T.FLOWER : T.GRASS);
      }
      this.beds.push({ x0, y0, x1, y1 });
    };
    bed(2, 2, 11, 9, 0.3); bed(w - 11, 2, w - 3, 9, 0.3);                 // สวนขั้นบันไดข้างหอคอย
    bed(2, h - 5, cx - 3, h - 3, 0); bed(cx + 3, h - 5, w - 3, h - 3, 0); // แนวสวนดอกไม้ริมคลองใต้ (ไม่มีต้นสูงบังคลอง)
    bed(2, 17, 4, 18, 0); bed(2, 22, 4, 24, 0.2); bed(w - 4, 17, w - 3, 18, 0); bed(w - 4, 22, w - 3, 24, 0.2);
    // สระน้ำพุกลม
    for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 3; x <= cx + 3; x++)
      if (Math.hypot(x + 0.5 - C, y + 0.5 - C) <= 2.6) this.set(x, y, T.FOUNTAIN);
    this.fountain = { x: C, y: C };
    // คลอง: ตะวันตก/ตะวันออก (ลอดใต้ร้าน) + คลองใหญ่ฝั่งใต้
    this.canalY = [h - 7, h - 6];
    const water = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, T.WATER); };
    water(2, h - 7, w - 3, h - 6);
    for (const x0 of [6, w - 7]) { water(x0, 17, x0 + 1, 24); water(x0, h - 9, x0 + 1, h - 8); }
    // สะพาน (ทางเดินข้ามน้ำ) — ถนนหลักทั้ง 3 สาย
    this.bridges = [
      { x0: cx - 1, y0: h - 7, x1: cx + 1, y1: h - 6, dir: 'v' },
      { x0: 6, y0: cy - 1, x1: 7, y1: cy + 1, dir: 'h' },
      { x0: w - 7, y0: cy - 1, x1: w - 6, y1: cy + 1, dir: 'h' },
    ];
    for (const b of this.bridges) for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) this.set(x, y, T.STONE);
    // กระถางต้นไม้ในลาน + ริมถนน
    this.planters = [[14, 14], [26, 14], [14, 26], [26, 26], [17, 30], [23, 30], [10, 18], [10, 22], [30, 18], [30, 22]];
    for (const [x, y] of this.planters) this.set(x, y, T.TREE);
    // หอคอยกลาง + ร้านค้า
    this.addBuilding(13, 2, 15, 7, 'castle', '#6a7fb0', 'CENTRAL CORE');
    this.addBuilding(4, 11, 8, 6, 'house', '#ff5a7a', 'SUPPLY');
    this.addBuilding(28, 11, 8, 6, 'house', '#4ab0ff', 'ARMORY');
    this.addBuilding(4, 25, 8, 6, 'house', '#5aff9a', 'PLATING');
    this.addBuilding(28, 25, 8, 6, 'house', '#ffa040', 'FORGE');
    for (const n of this.def.npcs) {
      for (let y = n.y - 1; y <= n.y + 1; y++) for (let x = n.x - 1; x <= n.x + 1; x++)
        if (this.tile(x, y) === T.TREE && !this.planters.some(([px, py]) => px === x && py === y)) this.set(x, y, T.GRASS);
      if (SOLID.has(this.tile(n.x, n.y))) this.set(n.x, n.y, T.STONE);
    }
    for (const p of this.portals) {
      this.set(p.x, p.y, T.STONE); this.set(p.ax, p.ay, T.STONE);
      for (let i = -1; i <= 1; i++) {
        if (p.x === 1 || p.x === w - 2) this.set(p.x + (p.x === 1 ? -1 : 1), p.y + i, T.TREE);
      }
    }
    this.floodCleanup(cx, cy + 4, T.TREE);
  }
  addBuilding(x, y, w, h, kind, roof, label) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, T.HOUSE);
    this.buildings.push({ x, y, w, h, kind, roof, label });
  }

  collectObjects() {
    const d = this.def;
    if (typeof Flora !== 'undefined' && d.kind !== 'cave') { Flora.plan(this); return; } // ต้นไม้ใหญ่หลายพันธุ์ + ของประดับ (js/flora.js)
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
      dirtD: hex('#4c525c'), dirtL: hex('#737b87'),
      stoneD: hex('#566070'), stoneL: hex('#7c8696'),
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
    // 1.5) ภาพพื้นผิวจริง (assets/ground_*.webp) ทับตามชนิดพื้น ขอบนุ่มด้วยหน้ากากเบลอ
    this.texClasses = new Set();
    // ทางดินขอบธรรมชาติ (ไม่เป็นขั้นบันไดตามช่อง): หญ้าปูใต้ทั้งหมด แล้วทับดินด้วยหน้ากากเบลอ+นอยส์
    const orgDirt = this.def.kind !== 'town' && this.def.kind !== 'cave' && typeof Art !== 'undefined' && !!Art.get('ground_grass') && !!Art.get('ground_dirt');
    this.orgDirt = orgDirt;
    const TEX = { grass: 'ground_grass', dirt: 'ground_dirt', stone: 'ground_road', cave: 'ground_cave' };
    const TEX_PX = { grass: 256, dirt: 288, stone: 320, cave: 352 }; // ขนาดต่อ 1 รอบลาย (พิกเซลโลก)
    for (const cls in TEX) {
      const tex = typeof Art !== 'undefined' && Art.get(TEX[cls]);
      if (!tex) continue;
      let any = false;
      const mk = document.createElement('canvas'); mk.width = this.w; mk.height = this.h;
      const mg = mk.getContext('2d'), md = mg.createImageData(this.w, this.h);
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        const tc = this.terrainClass(this.tile(x, y));
        if (tc === cls || (cls === 'grass' && (this.tile(x, y) === T.WATER || (orgDirt && tc === 'dirt'))) || (cls === 'cave' && this.def.kind === 'cave' && tc === 'rock')) { md.data[(y * this.w + x) * 4 + 3] = 255; any = true; }
      }
      if (!any) continue;
      mg.putImageData(md, 0, 0);
      this.texClasses.add(cls);
      const layer = document.createElement('canvas'); layer.width = W; layer.height = H;
      const lg = layer.getContext('2d');
      const pc = document.createElement('canvas'); pc.width = TEX_PX[cls]; pc.height = TEX_PX[cls];
      pc.getContext('2d').drawImage(tex, 0, 0, pc.width, pc.height);
      lg.fillStyle = lg.createPattern(pc, 'repeat'); lg.fillRect(0, 0, W, H);
      lg.globalCompositeOperation = 'destination-in';
      lg.imageSmoothingEnabled = true; lg.imageSmoothingQuality = 'high';
      // ขยายหน้ากากจาก 1px/ช่อง → ขอบไล่นุ่ม (ถนนโลหะคมกว่าเล็กน้อย)
      if (orgDirt && cls === 'dirt') { const om = this.organicMask('dirt'); lg.drawImage(om.mask, 0, 0, W, H); g.drawImage(layer, 0, 0); g.drawImage(om.rim, 0, 0, W, H); continue; }
      lg.filter = `blur(${cls === 'stone' ? 3 : 7}px)`;
      lg.drawImage(mk, 0, 0, W, H);
      lg.filter = 'none';
      g.drawImage(layer, 0, 0);
    }
    if (this.def.kind !== 'town' && this.def.kind !== 'cave') this.lightVariation(g, W, H);
    const town = this.def.kind === 'town' && typeof TownArt !== 'undefined';
    if (town) { TownArt.floor(this, g); this.texClasses.add('stone'); }
    // 1.6) หน้ากากหญ้าความละเอียดต่ำ (4px/ช่อง เบลอแล้ว) สำหรับหญ้าพลิ้วตามลมตอนเล่น
    this.grassMask = null;
    // มี Flora: หญ้านิ่งแบบภาพวาด (หย่อมดิน/หญ้ากระจุก/เงาต้นไม้ที่อบลงพื้นจะไม่ถูกชั้นหญ้าพลิ้วทับ) — ต้นไม้/พุ่มไม้ยังไหวตามลม
    if (this.texClasses.has('grass') && typeof Flora === 'undefined') {
      const MS = 4, raw = document.createElement('canvas'); raw.width = this.w * MS; raw.height = this.h * MS;
      const rg = raw.getContext('2d');
      rg.fillStyle = '#fff';
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        const tt = this.tile(x, y);
        if (this.terrainClass(tt) === 'grass' && tt !== T.HOUSE) rg.fillRect(x * MS, y * MS, MS, MS);
      }
      const m = document.createElement('canvas'); m.width = raw.width; m.height = raw.height;
      const mg = m.getContext('2d'); mg.filter = 'blur(1.6px)'; mg.drawImage(raw, 0, 0); mg.filter = 'none';
      this.grassMask = m; this.grassMaskScale = TILE / MS;
    }
    // 2) รายละเอียดทีละช่อง
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.detailTile(g, x, y);
    // 3) ขอบธรรมชาติระหว่างพื้นต่างชนิด
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.edgeTile(g, x, y, P);
    // 3.2) หย่อมดิน เงาต้นไม้ หญ้ากระจุก ดอกไม้จิ๋ว กรวด (js/flora.js)
    if (typeof Flora !== 'undefined' && this.flora) Flora.bake(this, g);
    // 3.5) น้ำทรงธรรมชาติจากหน้ากากเบลอ
    if (town) TownArt.over(this, g); else this.drawWater(g, P, depth);
    // 4) ผนังหิน (ถ้ำ) มีมิติ
    if (this.def.kind === 'cave') this.caveWalls(g, W, H);
    else for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.tile(x, y) === T.ROCK) this.rockTile(g, x, y);
    // 5) ของตกแต่ง — ถ้ามีภาพ (assets/prop_*) จะเป็นวัตถุตั้งตรงเรียงความลึก ไม่อบลงพื้น
    this.props = [];
    this.decorate(g);
    for (const b of this.buildings) { b.img = BUILDING_ART[b.label] || (b.kind === 'castle' ? 'prop_bld_tower' : null); if (!propArt(b.img)) { b.img = null; this.drawBuilding(g, b); } }
    this.fountainImg = !!(this.fountain && propArt('prop_fountain'));
    if (this.fountain && !this.fountainImg) this.drawFountain(g);
    if (this.def.kind === 'town') this.placeTownProps();
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
    const tex = this.texClasses && this.texClasses.has(cls);
    if (tex) return;                                   // มีภาพพื้นผิวแล้ว (หญ้าในภาพมีดอกไม้อยู่แล้ว) ไม่วาดรายละเอียดทับ
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
      // ถนนแผ่นเหล็ก: รอยต่อ หมุด รอยขีดข่วน และไฟนำทาง
      g.strokeStyle = 'rgba(20,24,32,0.55)'; g.lineWidth = 1;
      g.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
      g.beginPath(); g.moveTo(px + TILE / 2 + 0.5, py); g.lineTo(px + TILE / 2 + 0.5, py + TILE); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.08)';
      g.beginPath(); g.moveTo(px + 1.5, py + 1.5); g.lineTo(px + TILE - 1.5, py + 1.5); g.stroke();
      g.fillStyle = 'rgba(20,24,32,0.6)';
      for (const [rx, ry] of [[4, 4], [TILE - 5, 4], [4, TILE - 5], [TILE - 5, TILE - 5]]) { g.beginPath(); g.arc(px + rx, py + ry, 1.2, 0, 7); g.fill(); }
      for (let i = 0; i < 2; i++) {
        g.strokeStyle = 'rgba(200,210,225,0.12)'; g.beginPath();
        const sx = px + h(i, 41) * TILE, sy = py + h(i, 42) * TILE; g.moveTo(sx, sy); g.lineTo(sx + (h(i, 43) - 0.5) * 16, sy + (h(i, 44) - 0.5) * 6); g.stroke();
      }
      if (h(45) < 0.25) { g.fillStyle = 'rgba(150,90,50,0.25)'; g.beginPath(); g.ellipse(px + h(46) * TILE, py + h(47) * TILE, 5, 3, 0, 0, 7); g.fill(); }
      if (h(48) < 0.18) { g.save(); g.shadowColor = '#6ad8ff'; g.shadowBlur = 6; g.fillStyle = 'rgba(120,220,255,0.85)'; g.fillRect(px + TILE / 2 - 5, py + TILE / 2 - 1, 10, 2); g.restore(); }
    } else if (cls === 'stone' && t === T.STONE) {
      // พื้นเมือง: แผงโลหะ 2x2 มีขอบเอียงและเส้นไฟ
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
        const sx = px + i * 20 + 1, sy = py + j * 20 + 1, k = h(i + j * 2, 52);
        g.fillStyle = `rgba(${104 + k * 30 | 0},${114 + k * 30 | 0},${130 + k * 30 | 0},0.9)`;
        g.fillRect(sx, sy, 18, 18);
        g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(sx, sy, 18, 1.5); g.fillRect(sx, sy, 1.5, 18);
        g.fillStyle = 'rgba(10,14,22,0.35)'; g.fillRect(sx, sy + 16.5, 18, 1.5); g.fillRect(sx + 16.5, sy, 1.5, 18);
        if (h(i + j * 2, 53) < 0.1) { g.save(); g.shadowColor = '#6ad8ff'; g.shadowBlur = 5; g.fillStyle = 'rgba(120,220,255,0.75)'; g.fillRect(sx + 3, sy + 8, 12, 1.5); g.restore(); }
      }
      g.fillStyle = 'rgba(10,14,22,0.5)'; g.fillRect(px, py, TILE, 1); g.fillRect(px, py, 1, TILE);
    } else if (cls === 'water' && false) {
      g.strokeStyle = 'rgba(210,240,255,0.22)'; g.lineWidth = 1.2;
      for (let i = 0; i < 2; i++) {
        const wx = px + 4 + h(i, 60) * 24, wy = py + 8 + h(i, 61) * 24;
        g.beginPath(); g.moveTo(wx, wy); g.quadraticCurveTo(wx + 5, wy - 2.5, wx + 10, wy); g.stroke();
      }
    } else if (cls === 'cave') {
      if (h(80) < 0.12) {
        g.save(); g.strokeStyle = 'rgba(160,110,255,0.55)'; g.shadowColor = '#a070ff'; g.shadowBlur = 5; g.lineWidth = 1.2;
        const sx = px + 4 + h(81) * 12, sy = py + 6 + h(82) * 20;
        g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + 12, sy); g.lineTo(sx + 17, sy + 5); g.lineTo(sx + 26, sy + 5); g.stroke();
        g.fillStyle = 'rgba(200,170,255,0.9)'; g.beginPath(); g.arc(sx + 26, sy + 5, 1.6, 0, 7); g.fill();
        g.restore();
      }
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
    if (this.def.kind === 'town' && typeof TownArt !== 'undefined') return; // เมือง: ขอบคมแบบงานหินอ่อน (TownArt วาดขอบกระถาง/ขอบคลองเอง)
    if ((cls === 'dirt' && !this.orgDirt) || (cls === 'stone' && t === T.STONE)) {
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

  // หน้ากากพื้นขอบธรรมชาติ (ความละเอียด 1/4): เบลอขอบช่อง + นอยส์ → ขอบโค้งหยักแบบทางเดินจริง • rim = ขอบดินเข้ม (ดินชื้น/ร่องล้อ)
  organicMask(cls) {
    const S = 4, ts = TILE / S, mw = this.w * ts, mh = this.h * ts, seed = this.def.seed;
    const M = new Float32Array(mw * mh);
    for (let py = 0; py < mh; py++) for (let px = 0; px < mw; px++)
      if (this.terrainClass(this.tile((px / ts) | 0, (py / ts) | 0)) === cls) M[py * mw + px] = 1;
    const A = U.boxBlur(M, mw, mh, 5, 2);
    const mk = document.createElement('canvas'); mk.width = mw; mk.height = mh;
    const rk = document.createElement('canvas'); rk.width = mw; rk.height = mh;
    const md = mk.getContext('2d').createImageData(mw, mh), rd = rk.getContext('2d').createImageData(mw, mh);
    const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    for (let py = 0; py < mh; py++) for (let px = 0; px < mw; px++) {
      const i = py * mw + px, v0 = A[i];
      let a, v = v0;
      if (v0 < 0.03) a = 0; else if (v0 > 0.97) a = 1;
      else { v = v0 + (U.fbm(px * S / 70, py * S / 70, seed + 11, 3) - 0.5) * 0.6; a = ss(0.4, 0.5, v); }
      const o = i * 4;
      md.data[o] = md.data[o + 1] = md.data[o + 2] = 255; md.data[o + 3] = a * 255;
      const rim = a * (1 - ss(0.5, 0.66, v)) * 0.5;
      rd.data[o] = 74; rd.data[o + 1] = 50; rd.data[o + 2] = 28; rd.data[o + 3] = rim * 255;
    }
    mk.getContext('2d').putImageData(md, 0, 0); rk.getContext('2d').putImageData(rd, 0, 0);
    return { mask: mk, rim: rk };
  }
  // แสงระดับใหญ่: หย่อมหญ้าแดดจ้า/ร่มเย็นสลับกันแบบภาพวาด (soft-light) → ไม่เป็นลายเดียวทั้งแมพ
  lightVariation(g, W, H) {
    const S = 16, vw = Math.ceil(W / S), vh = Math.ceil(H / S), seed = this.def.seed;
    const c = document.createElement('canvas'); c.width = vw; c.height = vh;
    const cg = c.getContext('2d'), id = cg.createImageData(vw, vh);
    for (let y = 0; y < vh; y++) for (let x = 0; x < vw; x++) {
      const n = U.fbm(x * S / 640, y * S / 640, seed + 77, 3), n2 = U.fbm(x * S / 220, y * S / 220, seed + 91, 2);
      const v = Math.max(-1, Math.min(1, ((n - 0.5) * 1.5 + (n2 - 0.5) * 0.5) * 2.2)), o = (y * vw + x) * 4;
      id.data[o] = 128 + v * 110; id.data[o + 1] = 128 + v * 85; id.data[o + 2] = 128 + v * 20 - Math.max(0, v) * 60 + Math.max(0, -v) * 30; id.data[o + 3] = 255;
    }
    cg.putImageData(id, 0, 0);
    g.save(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = 0.85; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(c, 0, 0, W, H); g.restore();
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
    // ภาพผิวน้ำจริงทับเฉพาะส่วนน้ำลึก (ขอบทราย/ฟองยังเป็นแบบเดิม) โปร่งบางส่วนให้เห็นความลึก
    const wt = typeof Art !== 'undefined' && Art.get('ground_water');
    if (wt) {
      const wmk = document.createElement('canvas'); wmk.width = mw; wmk.height = mh;
      const wg = wmk.getContext('2d'), wd = wg.createImageData(mw, mh);
      for (let i = 0; i < mw * mh; i++) if (A[i] >= 0.6) wd.data[i * 4 + 3] = 255;
      wg.putImageData(wd, 0, 0);
      const RW = mw * S, RH = mh * S;
      const layer = document.createElement('canvas'); layer.width = RW; layer.height = RH;
      const lg = layer.getContext('2d');
      const pc = document.createElement('canvas'); pc.width = pc.height = 288;
      pc.getContext('2d').drawImage(wt, 0, 0, 288, 288);
      lg.fillStyle = lg.createPattern(pc, 'repeat');
      lg.translate(-x0 * TILE, -y0 * TILE); lg.fillRect(x0 * TILE, y0 * TILE, RW, RH); lg.setTransform(1, 0, 0, 1, 0, 0);
      lg.globalCompositeOperation = 'destination-in';
      lg.filter = 'blur(2px)'; lg.drawImage(wmk, 0, 0, RW, RH); lg.filter = 'none';
      g.save(); g.globalAlpha = 0.78; g.drawImage(layer, x0 * TILE, y0 * TILE); g.restore();
    }
  }

  // ผนังถ้ำแบบหน้าผา: ขอบโค้งธรรมชาติ (ไม่เป็นเหลี่ยมตามช่อง) • ยอดหินมืดมีลาย • ขอบปากผาสว่าง
  // หน้าผาฝั่งใต้สูง ~0.6 ช่องไล่สี + ริ้วหินแนวตั้ง • เงาทอดและความมืดสะสม (AO) บนพื้นข้างผนัง
  caveWalls(g, W, H) {
    const S = 2, ts = TILE / S, mw = this.w * ts, mh = this.h * ts, seed = this.def.seed;
    const M = new Float32Array(mw * mh);
    for (let py = 0; py < mh; py++) for (let px = 0; px < mw; px++) if (this.tile((px / ts) | 0, (py / ts) | 0) === T.ROCK) M[py * mw + px] = 1;
    const A = U.boxBlur(M, mw, mh, 7, 2), B = U.boxBlur(M, mw, mh, 16, 2);
    const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    const al = new Float32Array(mw * mh);
    for (let py = 0; py < mh; py++) for (let px = 0; px < mw; px++) {
      const i = py * mw + px, v0 = A[i];
      al[i] = v0 < 0.02 ? 0 : v0 > 0.98 ? 1 : ss(0.42, 0.54, v0 + (U.fbm(px * S / 60, py * S / 60, seed + 21, 3) - 0.5) * 0.55);
    }
    const FH = Math.round(TILE * 0.78 / S); // ความสูงหน้าผา (พิกเซลที่ความละเอียดนี้)
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const shC = mk(mw, mh), aoC = mk(mw, mh), alC = mk(mw, mh);
    const shD = shC.getContext('2d').createImageData(mw, mh), aoD = aoC.getContext('2d').createImageData(mw, mh), alD = alC.getContext('2d').createImageData(mw, mh);
    const sd = shD.data, ad = aoD.data, ld = alD.data;
    for (let py = 0; py < mh; py++) for (let px = 0; px < mw; px++) {
      const i = py * mw + px, a = al[i], o = i * 4;
      if (a < 0.98) { // พื้น: AO ใกล้ผนัง + เงาทอดใต้หน้าผา
        let sh = B[i] * 0.55;
        for (let k = 1; k <= 10; k++) if (py - k >= 0 && al[i - k * mw] > 0.5) { sh = Math.max(sh, 0.7 * (1 - k / 11)); break; }
        ad[o] = 8; ad[o + 1] = 5; ad[o + 2] = 12; ad[o + 3] = Math.min(0.78, sh) * 255;
      }
      if (a < 0.01) continue;
      ld[o] = ld[o + 1] = ld[o + 2] = 255; ld[o + 3] = a * 255;
      let down = FH + 1; for (let k = 1; k <= FH; k++) { if (py + k >= mh || al[i + k * mw] < 0.5) { down = k; break; } }
      const n = U.fbm(px * S / 90, py * S / 90, seed + 33, 3);
      let L, warm = 0;
      if (down <= FH) { // หน้าผา (คูณกับลายหิน): บนสว่าง ล่างมืด + ริ้วแนวตั้งนุ่ม
        const t = 1 - down / FH, str = Math.sin(px * 0.42 + n * 7) * 0.5 + 0.5;
        L = 0.38 + t * t * 1.05 + (str - 0.5) * 0.26; warm = 0.22;
        if (t > 0.86) L = 1.75; // ปากผารับแสง
      } else { // ยอดหิน: มืดกว่าพื้น
        let up = 0; for (let k = 1; k <= 3; k++) if (py - k < 0 || al[i - k * mw] < 0.5) { up = k; break; }
        L = 0.2 + (n - 0.5) * 0.22 + (up ? 0.35 / up : 0);
      }
      sd[o] = Math.min(255, 255 * L * (1 + warm)); sd[o + 1] = Math.min(255, 238 * L); sd[o + 2] = Math.min(255, 228 * L * (1 - warm)); sd[o + 3] = 255;
    }
    shC.getContext('2d').putImageData(shD, 0, 0); aoC.getContext('2d').putImageData(aoD, 0, 0); alC.getContext('2d').putImageData(alD, 0, 0);
    const wall = mk(W, H), wg = wall.getContext('2d');
    wg.imageSmoothingEnabled = true; wg.imageSmoothingQuality = 'high';
    const tex = typeof Art !== 'undefined' && Art.get('ground_cave');
    if (tex) { const pc = mk(420, 420); pc.getContext('2d').drawImage(tex, 0, 0, 420, 420); wg.fillStyle = wg.createPattern(pc, 'repeat'); } else wg.fillStyle = '#6a5a5e';
    wg.fillRect(0, 0, W, H);
    wg.globalCompositeOperation = 'multiply'; wg.drawImage(shC, 0, 0, W, H);
    wg.globalCompositeOperation = 'destination-in'; wg.drawImage(alC, 0, 0, W, H);
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(aoC, 0, 0, W, H); g.drawImage(wall, 0, 0); g.restore();
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
  // เพิ่มวัตถุภาพ (ต้นไม้/ของประดับ) ถ้ามีภาพ คืนค่า true = ไม่ต้องวาดแบบเดิม
  addProp(kind, x, y, s = 1) {
    if (!propArt(PROP_ART[kind])) return false;
    this.props.push({ kind, img: PROP_ART[kind], x: x / TILE, y: y / TILE, s, r: U.hash2(x | 0, y | 0, this.def.seed) });
    return true;
  }
  // เมือง: เสาไฟรอบลานกลาง + ป้ายนีออนหน้าร้าน
  placeTownProps() {
    if (!propArt('prop_lamp')) return;
    const cx = this.w >> 1, lamp = (x, y, s = 1) => this.props.push({ kind: 'lamp', img: 'prop_lamp', x, y, s, r: 0.3 });
    for (const b of this.bridges || []) {                     // เสาไฟหัวสะพานทั้งสองฝั่ง
      if (b.dir === 'v') for (const x of [b.x0 - 0.15, b.x1 + 1.15]) { lamp(x, b.y0 - 0.25, 0.95); lamp(x, b.y1 + 1.6, 0.95); }
      else for (const y of [b.y0 - 0.2, b.y1 + 1.25]) { lamp(b.x0 - 0.3, y, 0.95); lamp(b.x1 + 1.3, y, 0.95); }
    }
    for (const x of [cx - 1.6, cx + 2.6]) lamp(x, 11.6);       // ทางขึ้นหอคอย
    if (propArt('prop_sign')) for (const b of this.buildings) if (b.kind === 'house') {
      const sx = b.x + (b.x < cx ? b.w + 0.2 : -0.2), sy = b.y + b.h - 0.3;
      if (this.tile(Math.floor(sx), Math.floor(sy)) !== T.HOUSE) this.props.push({ kind: 'sign', img: 'prop_sign', x: sx, y: sy, s: 0.9, r: 0.2 });
    }
  }
  decorate(g) {
    const d = this.def, seed = d.seed;
    for (let y = 2; y < this.h - 2; y++) for (let x = 2; x < this.w - 2; x++) {
      const t = this.tile(x, y), r = U.hash2(x, y, seed + 99);
      if (this.portals.some(p => Math.abs(p.x - x) + Math.abs(p.y - y) < 3)) continue;
      const cx = x * TILE + 8 + U.hash2(x, y, seed + 7) * 24, cy = y * TILE + 10 + U.hash2(y, x, seed + 8) * 22;
      if (d.kind === 'cave' && t === T.CAVE) {
        if (r < 0.035) { if (!this.addProp('crystal', cx, cy, 0.8 + r * 6)) this.drawCrystal(g, cx, cy, r); }
        else if (r < 0.08) this.drawStone(g, cx, cy, 0.7, '#6a5a4c');
      } else if (t === T.GRASS && d.kind !== 'town') {
        if (this.flora && r < 0.018 && U.hash2(x, y, seed + 5) < 0.5) continue; // ทุ่งแบบนิทาน: ซากเทคโนโลยีน้อยลงครึ่งหนึ่ง
        if (r < 0.006) { if (!this.addProp('pylon', cx, cy)) this.drawPylon(g, cx, cy); }
        else if (r < 0.012) { if (!this.addProp('crate', cx, cy)) this.drawCrate(g, cx, cy, r); }
        else if (r < 0.018) { if (!this.addProp('scrap', cx, cy)) this.drawScrap(g, cx, cy, r); }
        else if (r < 0.03) { if (!this.flora && !this.addProp('bush', cx, cy, 0.85 + r * 5)) this.drawBush(g, cx, cy, r); } // มี Flora: พุ่มไม้วางเป็นกลุ่มแทน
        else if (r < 0.045) { if (!this.addProp('rock', cx, cy, 0.7 + r * 6)) this.drawStone(g, cx, cy, 0.8 + r * 6, '#9a9a90'); }
        else if (r < 0.055) { if (!this.addProp('mushroom', cx, cy, d.pine ? 1 : 0.8)) this.drawMushroom(g, cx, cy); }
      } else if (t === T.GRASS && d.kind === 'town' && r < 0.03) { if (!this.addProp('bush', cx, cy, 0.85)) this.drawBush(g, cx, cy, r); }
    }
  }
  // ซากเทคโนโลยีกลางธรรมชาติ
  drawPylon(g, x, y) {
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x + 3, y + 2, 9, 3, 0, 0, 7); g.fill();
    const gr = g.createLinearGradient(x - 4, 0, x + 4, 0); gr.addColorStop(0, '#8a94a4'); gr.addColorStop(1, '#4a5260');
    g.fillStyle = gr; g.beginPath(); g.moveTo(x - 5, y + 1); g.lineTo(x - 2.5, y - 26); g.lineTo(x + 2.5, y - 26); g.lineTo(x + 5, y + 1); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(10,14,22,0.6)'; g.lineWidth = 1; g.stroke();
    g.save(); g.shadowColor = '#6ad8ff'; g.shadowBlur = 8; g.fillStyle = '#8ae8ff';
    g.fillRect(x - 1, y - 20, 2, 14); g.beginPath(); g.arc(x, y - 28, 2.5, 0, 7); g.fill(); g.restore();
  }
  drawCrate(g, x, y, r) {
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x + 2, y + 5, 10, 3, 0, 0, 7); g.fill();
    g.fillStyle = r < 0.009 ? '#6a7486' : '#7a6a4a'; g.fillRect(x - 8, y - 10, 16, 14);
    g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(x - 8, y - 10, 16, 3);
    g.strokeStyle = 'rgba(10,14,22,0.6)'; g.lineWidth = 1; g.strokeRect(x - 7.5, y - 9.5, 15, 13);
    g.beginPath(); g.moveTo(x - 7, y - 9); g.lineTo(x + 7, y + 3); g.stroke();
    g.fillStyle = '#f0c040'; g.fillRect(x - 3, y - 6, 6, 2);
  }
  drawScrap(g, x, y, r) {
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(x + 2, y + 3, 11, 3.5, 0, 0, 7); g.fill();
    for (const [ox, oy, w, hh, c, rot] of [[-5, -2, 10, 5, '#6a7080', 0.3], [3, -3, 8, 6, '#8a6a4a', -0.4], [0, -6, 7, 3, '#9aa2b4', 0.1]]) {
      g.save(); g.translate(x + ox, y + oy); g.rotate(rot); g.fillStyle = c; g.fillRect(-w / 2, -hh / 2, w, hh);
      g.strokeStyle = 'rgba(10,14,22,0.5)'; g.lineWidth = 0.8; g.strokeRect(-w / 2, -hh / 2, w, hh); g.restore();
    }
    g.strokeStyle = '#2a303c'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - 9, y); g.quadraticCurveTo(x - 2, y + 5, x + 9, y - 1); g.stroke();
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
    const neon = (c, blur, fn) => { g.save(); g.shadowColor = c; g.shadowBlur = blur; g.fillStyle = c; fn(); g.restore(); };
    const metalV = (x0, y0, y1, c) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, U.shade(c, 0.18)); gr.addColorStop(1, U.shade(c, -0.25)); return gr; };
    if (b.kind === 'castle') {
      // Central Core: หอพลังงานกลางเมือง
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(px + 10, py + ph - 4, pw, 10);
      g.fillStyle = metalV(px, py + ph * 0.3, py + ph, '#6a7486'); g.fillRect(px, py + ph * 0.32, pw, ph * 0.68);
      g.strokeStyle = 'rgba(10,14,22,0.5)'; g.lineWidth = 1;
      for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(px + pw * i / 6, py + ph * 0.32); g.lineTo(px + pw * i / 6, py + ph); g.stroke(); }
      neon('#6ad8ff', 10, () => g.fillRect(px, py + ph * 0.32, pw, 3));
      for (const tx of [px + 4, px + pw - 48]) {
        g.fillStyle = metalV(tx, py + 6, py + ph, '#7a8498'); g.fillRect(tx, py + 10, 44, ph - 10);
        g.fillStyle = '#2a303c'; g.beginPath(); g.moveTo(tx - 4, py + 14); g.lineTo(tx + 22, py - 18); g.lineTo(tx + 48, py + 14); g.closePath(); g.fill();
        neon('#6ad8ff', 8, () => { g.fillRect(tx + 18, py + 30, 8, 30); g.beginPath(); g.arc(tx + 22, py - 20, 3.5, 0, 7); g.fill(); });
      }
      // แกนพลังงานกลาง
      const cx = px + pw / 2, cy = py + ph * 0.35;
      g.fillStyle = metalV(cx - 30, py - 10, py + ph, '#8a94a8'); g.fillRect(cx - 30, py - 6, 60, ph + 6);
      g.fillStyle = '#1a1e28'; g.beginPath(); g.arc(cx, cy, 22, 0, 7); g.fill();
      neon('#7ae8ff', 18, () => { g.beginPath(); g.arc(cx, cy, 14, 0, 7); g.fill(); });
      g.fillStyle = '#e8fbff'; g.beginPath(); g.arc(cx, cy, 7, 0, 7); g.fill();
      g.strokeStyle = 'rgba(122,232,255,0.8)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 20, 0, 7); g.stroke();
      // ประตู
      g.fillStyle = '#12161e'; g.fillRect(cx - 18, py + ph - 40, 36, 40);
      neon('#6ad8ff', 8, () => { g.fillRect(cx - 1, py + ph - 38, 2, 36); g.fillRect(cx - 18, py + ph - 42, 36, 2); });
      this.drawSign(g, cx, py + ph * 0.62, b.label, '#6ad8ff');
      return;
    }
    const wallTop = py + ph * 0.34;
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(px + 8, py + ph - 3, pw, 8);
    // ผนังโลหะ
    g.fillStyle = metalV(px, wallTop, py + ph, '#8a94a4'); g.fillRect(px + 4, wallTop, pw - 8, ph - (wallTop - py));
    g.strokeStyle = 'rgba(10,14,22,0.45)'; g.lineWidth = 1;
    for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(px + 4 + (pw - 8) * i / 4, wallTop); g.lineTo(px + 4 + (pw - 8) * i / 4, py + ph); g.stroke(); }
    // หลังคาแบน + ขอบนีออน
    g.fillStyle = metalV(px, py, wallTop, '#3a4252'); g.fillRect(px - 4, py + 4, pw + 8, wallTop - py);
    g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(px - 4, py + 4, pw + 8, 3);
    g.fillStyle = '#20252f'; for (let i = 0; i < 3; i++) g.fillRect(px + 14 + i * 22, py + 12, 14, 8);
    neon(b.roof, 10, () => g.fillRect(px - 4, wallTop - 3, pw + 8, 3));
    // เสาอากาศ
    g.strokeStyle = '#2a303c'; g.lineWidth = 2; g.beginPath(); g.moveTo(px + pw - 20, py + 6); g.lineTo(px + pw - 20, py - 16); g.stroke();
    neon('#ff5a4a', 8, () => { g.beginPath(); g.arc(px + pw - 20, py - 17, 2.5, 0, 7); g.fill(); });
    // หน้าต่างเรืองแสง
    for (const wx of [px + pw * 0.14, px + pw * 0.86 - 26]) {
      g.fillStyle = '#12161e'; g.fillRect(wx - 2, wallTop + 12, 30, 22);
      neon('rgba(140,220,255,0.9)', 8, () => g.fillRect(wx, wallTop + 14, 26, 18));
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(wx + 3, wallTop + 16, 8, 3);
    }
    // ประตูเลื่อน
    const dx = px + pw / 2 - 16;
    g.fillStyle = '#12161e'; g.fillRect(dx, py + ph - 42, 32, 42);
    g.fillStyle = metalV(dx, py + ph - 40, py + ph, '#5a6474'); g.fillRect(dx + 2, py + ph - 40, 13, 40); g.fillRect(dx + 17, py + ph - 40, 13, 40);
    neon(b.roof, 8, () => g.fillRect(dx, py + ph - 44, 32, 2));
    this.drawSign(g, px + pw / 2, py + 24, b.label, b.roof);
  }
  drawSign(g, x, y, text, col = '#6ad8ff') {
    g.font = 'bold 13px "Trebuchet MS", sans-serif';
    const w = g.measureText(text).width + 18;
    g.fillStyle = 'rgba(10,14,22,0.88)'; g.fillRect(x - w / 2, y - 11, w, 22);
    g.save(); g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = 8; g.lineWidth = 1.5; g.strokeRect(x - w / 2 + 0.5, y - 10.5, w - 1, 21);
    g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y + 1); g.restore();
  }
  drawFountain(g) {
    // แท่นพลังงาน (แทนน้ำพุ)
    const x = this.fountain.x * TILE, y = this.fountain.y * TILE;
    g.fillStyle = '#3a4252'; g.beginPath(); g.ellipse(x, y + 4, TILE * 1.55, TILE * 1.3, 0, 0, 7); g.fill();
    g.fillStyle = '#6a7486'; g.beginPath(); g.ellipse(x, y, TILE * 1.5, TILE * 1.25, 0, 0, 7); g.fill();
    const eg = g.createRadialGradient(x, y, 4, x, y, TILE * 1.25);
    eg.addColorStop(0, '#d8fbff'); eg.addColorStop(0.35, '#5ad0f0'); eg.addColorStop(1, '#1a4a78');
    g.fillStyle = eg; g.beginPath(); g.ellipse(x, y, TILE * 1.28, TILE * 1.05, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(200,245,255,0.6)'; g.lineWidth = 1.5;
    for (const r of [0.45, 0.8]) { g.beginPath(); g.ellipse(x, y, TILE * r * 1.28, TILE * r * 1.05, 0, 0, 7); g.stroke(); }
    g.fillStyle = '#2a303c'; g.fillRect(x - 5, y - 30, 10, 30);
    g.fillStyle = '#8a94a8'; g.beginPath(); g.ellipse(x, y - 30, 12, 5, 0, 0, 7); g.fill();
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

  nearestWalkable(x, y) {
    const fx = Math.floor(x), fy = Math.floor(y);
    for (let r = 1; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++)
      if (Math.max(Math.abs(dx), Math.abs(dy)) === r && this.walkable(fx + dx, fy + dy)) return { x: fx + dx + 0.5, y: fy + dy + 0.5 };
    return { x: (this.w >> 1) + 0.5, y: (this.h >> 1) + 0.5 };
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
