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
    skyMargin: 7, // กล้องเลื่อนเหนือขอบบนได้ 7 ช่อง → เห็นยอดหอคอย CENTRAL CORE เต็ม (render.js) + ป่าฉากหลัง
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
    name: 'Emerald Meadow', thai: L('ทุ่งหญ้ามรกต', 'Emerald Grasslands'), w: 104, h: 68, kind: 'field', seed: 202, // ทุ่งกว้างแนวตะวันออก-ตก (ทางผ่านเมือง → ทะเลสาบ) พื้นที่เท่าเดิม
    links: { W: 'eldheim', E: 'mistlake' }, level: '1-6', gate: { W: 0.78 }, // ประตูเมืองค่อนลงใต้ → ทุ่งอยู่เหนือป่า Wolfwood ไม่ซ้อนกัน
    spawns: [['pudding', 36], ['leafworm', 20], ['moonbun', 20], ['ember_pudding', 16], ['buzzfly', 13]],
    grass: '#6fae4a', trees: 0.9, ponds: 4, flowers: 0.05,
  },
  mistlake: {
    name: 'Mistlake Plains', thai: L('ที่ราบทะเลสาบหมอก', 'Plains of the Misty Lake'), w: 96, h: 80, kind: 'field', seed: 303, // ที่ราบปลายทางตะวันออก (+9% พื้นที่ มอน +9%)
    links: { W: 'meadow' }, level: '8-16 (MVP: Seraph Core)',
    spawns: [['fiddlehopper', 29], ['stumpling', 24], ['capshroom', 24], ['moss_pudding', 24]], mvp: 'seraph_pudding',
    grass: '#86b04a', trees: 0.8, ponds: 8, flowers: 0.08, treeHue: '#5f9a3a', flora: 'lake',
  },
  wolfwood: {
    name: 'Wolfwood Forest', thai: L('ป่าหมาป่า', 'Forest of the Wolves'), w: 68, h: 104, kind: 'field', seed: 404, // ป่ายาวเหนือ-ใต้ (เมือง → ปากถ้ำ) พื้นที่เท่าเดิม
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
// ตำแหน่งประตูของแมพ (def) ด้าน side — ปกติกลางขอบ • def.gate = { W: 0.8 } เลื่อนไปตามขอบ (สัดส่วน) ให้แมพขนาดต่างกันวางชิดกันได้ไม่ซ้อนทับ (js/world.js)
function portalPos(def, side) {
  const p = PORTAL_SIDE[side](def.w, def.h), f = def.gate && def.gate[side];
  if (f != null) { if (side === 'E' || side === 'W') p.y = p.ay = Math.round((def.h - 1) * f); else p.x = p.ax = Math.round((def.w - 1) * f); }
  return p;
}
// ภาพฉาก (assets/prop_*) — ไม่มีภาพจะวาดด้วยโค้ดแบบเดิม
const PROP_ART = { pylon: 'prop_pylon', crate: 'prop_crate', scrap: 'prop_scrap', bush: 'prop_bush', rock: 'prop_rock', mushroom: 'prop_mushroom', crystal: 'prop_crystal' };
const BUILDING_ART = { SUPPLY: 'prop_bld_shop', ARMORY: 'prop_bld_house', PLATING: 'prop_bld_house', FORGE: 'prop_bld_forge' };
// อาคาร 3D ทั้งชุดของเมือง (หอคอย + ร้าน 4 ร้าน — tools/bld3d.py, js/bake_data_eldheim_bld.js, js/bake.js Bake.buildings) • false = กลับไปใช้ภาพวาด BUILDING_ART เดิม
const BUILDING_3D = true;
const propArt = k => !!k && typeof Art !== 'undefined' && Art.has(k);
// ภาพอบจาก Blender ของรอยต่อทุ่ง→ถ้ำ (tools/ridge3d.py): แถบสันหินแถวล่าง (แบบ A วาดลงพื้นแทน caveWalls) + ซุ้มปากถ้ำ (แบบ B ตั้งตรงเรียงความลึก)
// hash = ผังช่องแถว y0..ล่างสุดตอนเรนเดอร์ — ผังเปลี่ยน (แก้ seed/ตัวสร้างแมพ) จะไม่ใช้ภาพ กลับไปวาดด้วยโค้ดเหมือนเดิม
const RIDGE_BAKE = {"wolfwood":{"img":"bake_wolfwood_ridge","y0":92,"hash":843460604,"gate":{"img":"bake_wolfwood_gate","x":34.5,"y":103.0,"ax":270.0,"ay":307.0,"s":0.5,"light":[34.5,102.4,3.4,"175,120,255"],"open":[1.85,3.05,0.85,0.45]}}}; // tools/ridge3d.py --install
const DAYLIGHT_BAKE = {"helcave":{"img":"bake_helcave_daylight","rect":[27,0,49,12],"hash":3258200064}}; // tools/daylight3d.py --install
// ผนังถ้ำ/หน้าผาหิน 3D ทั้งแมพ (tools/cave3d.py): ภาพเต็มแมพแบบ A วาดลงผ้าใบพื้นแทน caveWalls — พื้นในภาพโปร่ง (มีแต่เงา/AO) พื้นวาดด้วยโค้ดยังเห็นต่อเนื่อง
// hash = FNV-1a ของผังช่องทั้งแมพตอนเรนเดอร์ — ผังเปลี่ยน = กลับไปวาดผนังด้วยโค้ด • ภาพใหญ่ (3000×3000) โหลดตอนเข้าแมพ (Art.need) แล้วคืนหน่วยความจำหลังวาดลงพื้น (Art.free)
const CAVE_BAKE = {"helcave":{"img":"bake_helcave_walls","hash":1823187180},"archive":{"img":"bake_archive_walls","hash":1171733009,"seals":1},"roots":{"img":"bake_roots_walls","hash":4054022947}}; // tools/cave3d.py --install
// พื้นเมือง 3D ทั้งแมพ (tools/town3d.py, docs/RENDER3D_PLAN.md #12): ลานหินอ่อน คลองลึก สะพานโค้ง ขอบสวน กระถาง เส้นแสง — แทน TownArt.floor/over
// hash = FNV-1a ของผังช่องทั้งแมพ (เหมือน CAVE_BAKE) — genTown เปลี่ยน = กลับไปวาดด้วยโค้ด (TownArt) + เตือนครั้งเดียว • โหลดตอนเข้าเมือง (Art.need)
const TOWN_BAKE = {"eldheim":{"img":"bake_eldheim_ground","hash":3247684423}}; // tools/town3d.py --install
// ซุ้มประตูวาร์ป 3D ทุกประตู (tools/gate3d.py, js/bake.js Bake.gates): วัสดุตามชนิดแมพที่ประตูตั้งอยู่ (town/field/cave) × แบบตามขอบ (s หันหน้า, n เสาเตี้ย, e/w ด้านข้าง)
// pcs = ชิ้นสไปรต์ (ax, ay = กลางวาร์ปบนพื้นในภาพ px • dy = จุดเรียงความลึกเทียบกลางวาร์ป ช่อง) • sh = เงาบนพื้น • open = ช่องประตู (px 1× เทียบกลางวาร์ป) ตัดม่านวาร์ป • top = ยอดซุ้ม (px) วางป้ายปลายทาง
const GATE_BAKE = {"town":{"s":{"pcs":[{"img":"bake_gate_town_s","ax":189.2,"ay":200.4,"dy":0.56}],"sh":{"img":"bake_gate_town_s_sh","ax":187.2,"ay":36.4},"open":[[-58.0,3.9],[-58.0,-57.2],[-56.9,-60.0],[-53.6,-62.7],[-48.2,-65.2],[-41.0,-67.3],[-32.2,-69.1],[-22.2,-70.4],[-11.3,-71.2],[0.0,-71.5],[11.3,-71.2],[22.2,-70.4],[32.2,-69.1],[41.0,-67.3],[48.2,-65.2],[53.6,-62.7],[56.9,-60.0],[58.0,-57.2],[58.0,3.9]],"top":-98.7},"n":{"pcs":[{"img":"bake_gate_town_n","ax":190.0,"ay":75.2,"dy":0.48}],"sh":{"img":"bake_gate_town_n_sh","ax":188.0,"ay":31.2},"top":-36.6},"e":{"pcs":[{"img":"bake_gate_town_e_b","ax":127.7,"ay":259.2,"dy":-0.908},{"img":"bake_gate_town_e_f","ax":15.7,"ay":151.2,"dy":2.311}],"sh":{"img":"bake_gate_town_e_sh","ax":125.7,"ay":142.2},"open":[[26.6,43.1],[26.6,-18.0],[26.1,-21.5],[24.6,-26.5],[22.1,-32.5],[18.8,-39.6],[14.8,-47.3],[10.2,-55.4],[5.2,-63.6],[0.0,-71.5],[-5.2,-78.9],[-10.1,-85.4],[-14.7,-90.8],[-18.7,-95.0],[-22.0,-97.7],[-24.5,-98.9],[-26.0,-98.4],[-26.5,-96.4],[-26.5,-35.3]],"top":-128.6},"w":{"pcs":[{"img":"bake_gate_town_w_b","ax":46.7,"ay":259.2,"dy":-0.908},{"img":"bake_gate_town_w_f","ax":127.7,"ay":151.2,"dy":2.311}],"sh":{"img":"bake_gate_town_w_sh","ax":125.7,"ay":142.2},"open":[[-26.5,43.1],[-26.5,-18.0],[-26.0,-21.5],[-24.5,-26.5],[-22.0,-32.5],[-18.7,-39.6],[-14.7,-47.3],[-10.1,-55.4],[-5.2,-63.6],[0.0,-71.5],[5.2,-78.9],[10.2,-85.4],[14.8,-90.8],[18.8,-95.0],[22.1,-97.7],[24.6,-98.9],[26.1,-98.4],[26.6,-96.4],[26.6,-35.3]],"top":-128.6}},"field":{"s":{"pcs":[{"img":"bake_gate_field_s","ax":222.1,"ay":199.0,"dy":0.564}],"sh":{"img":"bake_gate_field_s_sh","ax":216.1,"ay":52.0},"open":[[-58.0,3.9],[-58.0,-57.2],[-56.9,-60.0],[-53.6,-62.7],[-48.2,-65.2],[-41.0,-67.3],[-32.2,-69.1],[-22.2,-70.4],[-11.3,-71.2],[0.0,-71.5],[11.3,-71.2],[22.2,-70.4],[32.2,-69.1],[41.0,-67.3],[48.2,-65.2],[53.6,-62.7],[56.9,-60.0],[58.0,-57.2],[58.0,3.9]],"top":-98.5},"n":{"pcs":[{"img":"bake_gate_field_n","ax":220.6,"ay":84.2,"dy":0.487}],"sh":{"img":"bake_gate_field_n_sh","ax":215.6,"ay":44.2},"top":-41.1},"e":{"pcs":[{"img":"bake_gate_field_e_b","ax":143.6,"ay":256.8,"dy":-0.895},{"img":"bake_gate_field_e_f","ax":16.6,"ay":149.8,"dy":2.324}],"sh":{"img":"bake_gate_field_e_sh","ax":138.6,"ay":156.8},"open":[[26.5,43.1],[26.5,-18.0],[26.0,-21.6],[24.5,-26.5],[22.1,-32.6],[18.8,-39.6],[14.8,-47.3],[10.2,-55.4],[5.2,-63.6],[0.0,-71.5],[-5.2,-78.9],[-10.1,-85.4],[-14.8,-90.9],[-18.8,-95.0],[-22.1,-97.7],[-24.5,-98.9],[-26.0,-98.4],[-26.5,-96.4],[-26.5,-35.3]],"top":-127.4},"w":{"pcs":[{"img":"bake_gate_field_w_b","ax":46.3,"ay":257.1,"dy":-0.899},{"img":"bake_gate_field_w_f","ax":155.3,"ay":150.1,"dy":2.321}],"sh":{"img":"bake_gate_field_w_sh","ax":150.3,"ay":157.1},"open":[[-26.5,43.1],[-26.5,-18.0],[-26.0,-21.6],[-24.5,-26.5],[-22.1,-32.6],[-18.8,-39.6],[-14.8,-47.3],[-10.2,-55.4],[-5.2,-63.6],[0.0,-71.5],[5.2,-78.9],[10.2,-85.4],[14.8,-90.9],[18.8,-95.0],[22.1,-97.7],[24.5,-98.9],[26.0,-98.4],[26.5,-96.4],[26.5,-35.3]],"top":-127.5}},"cave":{"s":{"pcs":[{"img":"bake_gate_cave_s","ax":195.5,"ay":199.8,"dy":0.565}],"sh":{"img":"bake_gate_cave_s_sh","ax":201.5,"ay":38.8},"open":[[-58.0,3.9],[-58.0,-57.2],[-56.9,-60.0],[-53.6,-62.7],[-48.2,-65.1],[-41.0,-67.3],[-32.2,-69.1],[-22.2,-70.4],[-11.3,-71.2],[0.0,-71.5],[11.3,-71.2],[22.2,-70.4],[32.2,-69.1],[41.0,-67.3],[48.2,-65.1],[53.6,-62.7],[56.9,-60.0],[58.0,-57.2],[58.0,3.9]],"top":-98.4},"n":{"pcs":[{"img":"bake_gate_cave_n","ax":190.6,"ay":98.9,"dy":0.489}],"sh":{"img":"bake_gate_cave_n_sh","ax":196.6,"ay":31.9},"top":-48.0},"e":{"pcs":[{"img":"bake_gate_cave_e_b","ax":128.5,"ay":273.4,"dy":-0.893},{"img":"bake_gate_cave_e_f","ax":16.5,"ay":150.4,"dy":2.326}],"sh":{"img":"bake_gate_cave_e_sh","ax":134.5,"ay":142.4},"open":[[26.5,43.1],[26.5,-18.0],[26.0,-21.5],[24.5,-26.4],[22.1,-32.5],[18.8,-39.6],[14.8,-47.3],[10.2,-55.4],[5.2,-63.6],[0.0,-71.5],[-5.2,-78.9],[-10.1,-85.4],[-14.8,-90.8],[-18.8,-95.0],[-22.0,-97.7],[-24.5,-98.9],[-26.0,-98.4],[-26.5,-96.4],[-26.5,-35.3]],"top":-135.2},"w":{"pcs":[{"img":"bake_gate_cave_w_b","ax":46.9,"ay":278.0,"dy":-0.899},{"img":"bake_gate_cave_w_f","ax":128.9,"ay":150.0,"dy":2.322}],"sh":{"img":"bake_gate_cave_w_sh","ax":134.9,"ay":143.0},"open":[[-26.5,43.1],[-26.5,-18.0],[-26.0,-21.5],[-24.5,-26.5],[-22.1,-32.5],[-18.8,-39.6],[-14.7,-47.3],[-10.2,-55.4],[-5.2,-63.6],[0.0,-71.5],[5.2,-78.8],[10.2,-85.4],[14.8,-90.8],[18.8,-95.0],[22.1,-97.7],[24.5,-98.9],[26.0,-98.4],[26.5,-96.4],[26.5,-35.3]],"top":-137.5}},"s":0.5,"glow":{"town":"120,220,255","field":"130,240,210","cave":"185,130,255"}}; // tools/gate3d.py --install

class GameMap {
  constructor(id, opts) {
    const def = MAP_DEFS[id];
    this.id = id; this.def = def; this.w = def.w; this.h = def.h;
    this.tiles = new Uint8Array(this.w * this.h);
    this.block = new Uint8Array(this.w * this.h);
    this.portals = []; this.objects = []; this.buildings = []; this.fountain = null;
    this.paved = []; this.caveMouths = []; this.daylight = []; this.seams = []; this.openEdges = []; // รอยต่อกับแมพข้างเคียง (seamTransitions)
    this.rng = U.seeded(def.seed);
    for (const side in def.links) {
      const p = portalPos(def, side);
      this.portals.push({ x: p.x, y: p.y, ax: p.ax, ay: p.ay, to: def.links[side], toSide: OPP_SIDE[side] });
    }
    if (def.kind === 'town') this.genTown();
    else if (def.pvp) this.genArena();
    else if (def.kind === 'cave') this.genCave();
    else this.genField();
    // ลานหน้าวาร์ป: เอาต้นไม้ที่ยอดไม้บังวาร์ปออก (ต้นที่อยู่ต่ำกว่าวาร์ป 3 แถว ยอดจะบัง) ในเมืองคงต้นไม้ขอบนอกข้างวาร์ปไว้
    for (const p of this.portals) for (let dy = -1; dy <= 3; dy++) for (let dx = -2; dx <= 2; dx++) {
      const x = p.x + dx, y = p.y + dy;
      if (!this.inb(x, y) || (def.kind === 'town' && dy < 1 && (x <= 0 || y <= 0 || x >= this.w - 1 || y >= this.h - 1))) continue;
      if (this.tile(x, y) === T.TREE) this.set(x, y, this.tile(p.x, p.y));
    }
    for (const n of def.npcs || []) this.block[this.idx(n.x, n.y)] = 1;
    if (typeof Bake !== 'undefined') Bake.layout(this); // ฉากอบจาก 3D (js/bake.js): เคลียร์หินใต้แท่น + ช่องชนของบัลลังก์/ชั้นวาง (Hel's Hollow)
    if (opts && opts.lite) return; // แค่ผังช่อง (ใช้วาดแผนที่โลก — ไม่ต้องวาดพื้น/วางของประดับ)
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
    this.seamTransitions('before');
    const cx = w >> 1, cy = h >> 1;
    for (const p of this.portals) this.carvePath(p.x, p.y, cx, cy, T.DIRT, 1);
    this.disc(cx + 0.5, cy + 0.5, 3.5, T.GRASS, 10, [T.TREE, T.WATER, T.FLOWER]);
    for (const p of this.portals) { this.set(p.x, p.y, T.DIRT); this.set(p.ax, p.ay, T.DIRT); }
    this.seamTransitions('after');
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
    this.seamTransitions('after');
  }

  // ลานประลอง PvP แบบโคลอสเซียม: พื้นทรายวงกลม รอบนอกเป็นอัฒจันทร์ (ชนได้) ทางเข้าด้านประตู — ภาพวาดใน townmap.js TownArt.arena
  genArena() {
    const w = this.w, h = this.h, cx = w / 2, cy = h / 2, R0 = Math.min(w, h) / 2 - 2.8;
    this.fill(T.ROCK);
    // ฝั่งใต้: กำแพง/อัฒจันทร์ในภาพ 3D มีความสูง → บังทรายประมาณ 1 ช่อง (มุมกล้องเอียง) → ขอบเดินได้ถอยเข้ามาตามนั้น ไม่ให้ยืนแล้วดูเหมือนอยู่บนอัฒจันทร์
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy), south = Math.max(0, dy / (d || 1));
      if (d < R0 - 1.15 * south) this.set(x, y, T.DIRT);
    }
    for (const p of this.portals) { this.carvePath(p.x, p.y, Math.floor(cx), Math.floor(cy), T.DIRT, 1); this.set(p.x, p.y, T.DIRT); this.set(p.ax, p.ay, T.DIRT); }
    this.arena = { cx, cy, r: R0 };
    // คบเพลิง (ตรงกับ tools/arena3d.py TORCH_ANGLES/TORCH_TOP): ทุก 30° เว้นช่วงประตูใต้ • พิกัดแมพ: y ของ Blender ชี้เหนือ = ลบ
    this.torches = [];
    for (let d = 0; d < 360; d += 30) if (Math.abs(((d - 270 + 540) % 360) - 180) > 20) {
      const a = d * Math.PI / 180; this.torches.push({ x: cx + (R0 + 0.28) * Math.cos(a), y: cy - (R0 + 0.28) * Math.sin(a), h: 2.22, ph: d });
    }
  }

  // รอยต่อกับแมพข้างเคียง (โลกเชื่อมกันทางกายภาพ — js/world.js):
  // ทุ่ง→เมือง = ถนนหินอ่อนต่อจากประตูเมืองแล้วค่อยกลายเป็นทางดิน • ทุ่ง→ถ้ำ = สันหินตามขอบด้านนั้น + ปากถ้ำตรงประตู
  // ถ้ำ→ทุ่ง = แสงแดด/มอสส่องเข้ามาที่ปากทาง (วาดตอนเรนเดอร์) • ทุ่ง↔ทุ่ง = ต้นไม้พันธุ์ของแมพข้าง ๆ ปนมากขึ้นเมื่อใกล้ขอบ (flora.js)
  seamTransitions(phase) {
    for (const p of this.portals) {
      const nd = MAP_DEFS[p.to]; if (!nd) continue;
      const side = typeof WORLD !== 'undefined' ? WORLD.sideOf(this, p) : OPP_SIDE[p.toSide];
      const dx = Math.sign(p.ax - p.x), dy = Math.sign(p.ay - p.y), qx = -dy, qy = dx;
      const kind = this.def.kind;
      if (phase === 'before' && kind === 'field' && nd.kind === 'cave') {
        const ns = side === 'N' || side === 'S', along = ns ? this.w : this.h, pa = ns ? p.x : p.y;
        for (let a = 0; a < along; a++) {
          const depth = 3 + Math.round(U.fbm(a / 5, side.charCodeAt(0) * 3, this.def.seed + 17, 2) * 6) + Math.max(0, 3 - Math.abs(a - pa) / 3 | 0);
          for (let k = 0; k < 2 + depth; k++) {
            const x = side === 'W' ? k : side === 'E' ? this.w - 1 - k : a, y = side === 'N' ? k : side === 'S' ? this.h - 1 - k : a;
            if (!this.inb(x, y) || Math.abs(a - pa) <= 1) continue; // ช่องปากถ้ำ (ถนนจะเจาะผ่านพอดี)
            this.set(x, y, T.ROCK);
          }
        }
        this.caveMouths.push(p);
      }
      if (phase === 'after') {
        if (kind === 'field' && nd.kind === 'town') {
          for (let i = 0; i <= 11; i++) for (let k = -1; k <= 1; k++) {
            const x = p.x + dx * i + qx * k, y = p.y + dy * i + qy * k;
            if (this.inb(x, y) && this.tile(x, y) !== T.WATER && (i > 0 || k === 0)) this.set(x, y, T.STONE);
          }
          this.paved.push({ x: p.x, y: p.y, dx, dy, qx, qy, len: 11 });
        } else if (kind === 'cave' && nd.kind !== 'cave') this.daylight.push(p);
        else if (kind === 'field' && nd.kind === 'field') { this.seams.push({ side, def: nd }); this.openEdge(side, p.to); }
      }
    }
  }
  // ขอบเปิด (ทุ่ง↔ทุ่ง): เอาแนวต้นไม้ขอบออกตลอดช่วงที่สองแมพติดกันบนผืนโลก → เดินข้ามตรงไหนก็ได้ ไปโผล่ตำแหน่งเดียวกันของอีกฝั่ง (game.js edgeCross)
  openEdge(side, to) {
    if (typeof WORLD === 'undefined') return;
    const L0 = WORLD.layout(), a = L0[this.id], b = L0[to], B = MAP_DEFS[to]; if (!a || !b) return;
    const ns = side === 'N' || side === 'S';
    const lo = Math.max(ns ? a.x : a.y, ns ? b.x : b.y) - (ns ? a.x : a.y), hi = Math.min(ns ? a.x + this.w : a.y + this.h, ns ? b.x + B.w : b.y + B.h) - (ns ? a.x : a.y);
    const a0 = Math.max(3, lo + 3), a1 = Math.min((ns ? this.w : this.h) - 4, hi - 4);
    if (a1 <= a0) return;
    for (let t = a0; t <= a1; t++) for (let k = 0; k < 3; k++) {
      const x = side === 'W' ? k : side === 'E' ? this.w - 1 - k : t, y = side === 'N' ? k : side === 'S' ? this.h - 1 - k : t;
      if (this.tile(x, y) === T.TREE || this.tile(x, y) === T.WATER) this.set(x, y, T.GRASS);
    }
    (this.openEdges || (this.openEdges = [])).push({ side, to, a0, a1 });
  }
  // น้ำหนักแมพข้างเคียงที่จุด (x, y): 1 ที่ขอบ → 0 ที่ระยะ 14 ช่อง (ใช้ผสมพันธุ์ไม้/ของประดับ)
  seamWeight(x, y) {
    let best = null;
    for (const s of this.seams || []) {
      const d = s.side === 'W' ? x : s.side === 'E' ? this.w - 1 - x : s.side === 'N' ? y : this.h - 1 - y;
      const wgt = Math.max(0, 1 - (d - 2) / 14);
      if (wgt > 0 && (!best || wgt > best.w)) best = { def: s.def, w: wgt };
    }
    return best;
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
    this.addBuilding(15, 2, 11, 7, 'castle', '#6a7fb0', 'CENTRAL CORE'); // ฐานชน 11 ช่อง = ความกว้างภาพหอคอยจริง (เดิม 15 → กำแพงล่องหนข้างละ ~1.6 ช่อง)
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
      // ประตูข้าง (ตะวันออก/ตก): ต้นไม้ใต้ซุ้ม 2–4 ช่องยอดสูงบังซุ้มวาร์ป 3D (tools/gate3d.py) → เปิดเป็นสนามหญ้า
      if (p.x === 1 || p.x === w - 2) for (let yy = p.y + 2; yy <= p.y + 4; yy++) for (let k = 0; k < 4; k++) {
        const xx = p.x === 1 ? k : w - 1 - k;
        if (this.tile(xx, yy) === T.TREE && !this.planters.some(([px, py]) => px === xx && py === yy)) this.set(xx, yy, T.GRASS);
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
    this.backdrop = [];
    if (d.skyMargin) for (let y = -d.skyMargin + 0.5; y < 0.5; y += 0.9) for (let x = 0.3; x < this.w; x += 1.15) { // ป่าฉากหลังเหนือเมือง
      const r = U.hash2(Math.round(x * 10), Math.round(y * 10), d.seed);
      this.backdrop.push({ kind: 'tree', sp: r < 0.5 ? 'round' : 'bloom', x: x + (r - 0.5) * 0.6, y, size: 0.7 + r * 0.35, flip: r < 0.5, r, fa: 1 });
    }
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
        if (tc === cls || (cls === 'grass' && (this.tile(x, y) === T.WATER || (orgDirt && tc === 'dirt') || (this.def.kind !== 'cave' && tc === 'rock'))) || (cls === 'cave' && this.def.kind === 'cave' && tc === 'rock')) { md.data[(y * this.w + x) * 4 + 3] = 255; any = true; }
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
    if (town) { // พื้นเมืองอบ 3D (TOWN_BAKE) วาดแทนลานหินอ่อนโค้ด — ก่อน Flora.bake (เงาต้นไม้/หญ้ากระจุกทับได้เหมือนเดิม) • ยังไม่โหลด/ผังไม่ตรง = TownArt.floor
      const tb = this.townBake(), img = tb && typeof Art !== 'undefined' && (Art.need(tb.img), Art.get(tb.img));
      this.townImg = !!img;
      if (img) { g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, W, H); g.restore(); }
      else TownArt.floor(this, g);
      this.texClasses.add('stone');
    }
    else if (this.paved.length && typeof TownArt !== 'undefined') { TownArt.pave(this, g); this.texClasses.add('stone'); } // ถนนหินอ่อนต่อจากประตูเมือง
    if (this.arena) { // โคลอสเซียม: ภาพเรนเดอร์ 3D (tools/arena3d.py — มุมกล้องเดียวกับเกม) • ไม่มีภาพ = วาดด้วยโค้ด
      const img = typeof Art !== 'undefined' && Art.get('arena_ground');
      this.arenaImg = !!img;
      if (img) { g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, W, H); }
      else if (typeof TownArt !== 'undefined') TownArt.arena(this, g);
      this.texClasses.add('dirt'); this.texClasses.add('rock');
    }
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
    this.fountain3d = !!this.fountain && typeof Bake !== 'undefined' && Bake.fountain(this); // น้ำพุคริสตัล 3D (tools/fountain3d.py) — ภาพยังไม่ครบ/ผังไม่ตรง = สระโค้ด + ภาพวาดเดิม
    if (town) TownArt.over(this, g); else this.drawWater(g, P, depth);
    // 4) ผนังหิน (ถ้ำ) มีมิติ
    if (this.def.kind === 'cave') { // ผนังถ้ำ: ภาพอบ 3D (tools/cave3d.py) • ยังไม่โหลด/ผังไม่ตรง = วาดด้วยโค้ด
      const cb = this.caveBake(), img = cb && typeof Art !== 'undefined' && (Art.need(cb.img), Art.get(cb.img));
      this.caveWallImg = !!img;
      if (img) {
        if (this.def.caveTheme) this.caveTheme(g, W, H, cb.seals); // ย้อมโทน/ตราผนึก/รากบนพื้นก่อน → ผนังในภาพทับขอบราก (ผนังย้อมสีมาในภาพแล้ว) • seals = ตราผนึกอบอยู่ในภาพแล้ว
        g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, W, H); g.restore();
        this.caveDepthShade(g, W, H);
        Art.free(cb.img); // ภาพถอดรหัสแล้ว ~36 MB — อยู่ในผ้าใบพื้นแล้ว ไม่ต้องเก็บ (วาดพื้นใหม่เมื่อไร need โหลดซ้ำจากแคชเบราว์เซอร์)
      } else { this.caveWalls(g, W, H); if (this.def.caveTheme) this.caveTheme(g, W, H); }
    }
    else if (this.caveMouths.length) { // สันหินก่อนถึงปากถ้ำ (ทุ่ง → ถ้ำ): ภาพอบ 3D (tools/ridge3d.py) • ยังไม่โหลด/ผังไม่ตรง = วาดด้วยโค้ด
      const rb = this.ridgeBake(), img = rb && typeof Art !== 'undefined' && (Art.need(rb.img), Art.get(rb.img));
      this.ridgeImg = !!img;
      if (img) { g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, rb.y0 * TILE, W, H - rb.y0 * TILE); g.restore(); }
      else this.caveWalls(g, W, H, true);
      this.ridgeGate = rb && rb.gate ? Object.assign({ fa: 1 }, rb.gate, { portal: this.caveMouths[0] }) : null;
      if (this.ridgeGate && typeof Art !== 'undefined') Art.need(rb.gate.img);
    }
    else if (this.arena) { /* อัฒจันทร์วาดใน TownArt.arena แล้ว */ }
    else for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.tile(x, y) === T.ROCK) this.rockTile(g, x, y);
    this.seamArt(g);
    // 5) ของตกแต่ง — ถ้ามีภาพ (assets/prop_*) จะเป็นวัตถุตั้งตรงเรียงความลึก ไม่อบลงพื้น
    this.props = [];
    this.decorate(g);
    if (typeof Bake !== 'undefined') Bake.ground(this, g); // แท่นหิน + เงาจากภาพเรนเดอร์ 3D (ทับกรวดที่ decorate วาด)
    if (typeof Bake !== 'undefined') Bake.buildings(this, g); // อาคาร 3D (ภาพครบ + ผังตรง) → b.bake + เงาบนพื้น • ไม่งั้นภาพวาด/โค้ดเดิม
    for (const b of this.buildings) { b.img = BUILDING_ART[b.label] || (b.kind === 'castle' ? 'prop_bld_tower' : null); if (!propArt(b.img)) { b.img = null; if (!b.bake) this.drawBuilding(g, b); } }
    this.fountainImg = !!(this.fountain && !this.fountain3d && propArt('prop_fountain')); // ภาพวาดน้ำพุเดิม = ทางสำรองของน้ำพุ 3D
    if (this.fountain && !this.fountainImg && !this.fountain3d) this.drawFountain(g);
    if (this.def.kind === 'town') this.placeTownProps(); else this.placeSeamProps();
    if (typeof Bake !== 'undefined') Bake.props(this); // บัลลังก์/ชั้นวาง (สไปรต์ตั้งตรง) + แสงโหลประกาย → extraLights
    if (typeof Bake !== 'undefined') Bake.gates(this); // ซุ้มประตูวาร์ป 3D (สไปรต์ตั้งตรงเรียงความลึก) + แสงในแมพมืด
    // พื้นเมืองอบ (1600² ถอดรหัสแล้ว ~10 MB) อยู่ในผ้าใบพื้นแล้ว → คืนหน่วยความจำ • ยังมีภาพอบอื่นรอโหลด (วาดพื้นใหม่อีกรอบแน่) = เก็บไว้ก่อน ไม่ต้องโหลดซ้ำ
    if (this.townImg && !(this.bakeWait && this.bakeWait.size)) Art.free(TOWN_BAKE[this.id].img);
    this.ground = c;
    // เก็บตำแหน่งน้ำไว้ทำคลื่นเคลื่อนไหว
    this.waterTiles = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.tile(x, y) !== T.WATER) continue;
      let n = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (this.tile(x + dx, y + dy) === T.WATER) n++;
      if (n >= 3 && !(this.townImg && this.tile(x, y - 1) !== T.WATER)) this.waterTiles.push(x, y); // พื้นเมืองอบ: แถวบนสุดของคลองคือผนังคลอง (ผิวน้ำต่ำกว่าพื้น) — ไม่วาดประกายน้ำทับผนัง
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
    if ((cls === 'dirt' && !this.orgDirt) || (cls === 'stone' && t === T.STONE && !this.paved.length)) {
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
    const nO = U.noiseGrid(mw, mh, 3, (x, y) => U.fbm(x * S / 70, y * S / 70, seed + 11, 3));
    for (let py = 0; py < mh; py++) for (let px = 0; px < mw; px++) {
      const i = py * mw + px, v0 = A[i];
      let a, v = v0;
      if (v0 < 0.03) a = 0; else if (v0 > 0.97) a = 1;
      else { v = v0 + (nO(px, py) - 0.5) * 0.6; a = ss(0.4, 0.5, v); }
      const o = i * 4;
      md.data[o] = md.data[o + 1] = md.data[o + 2] = 255; md.data[o + 3] = a * 255;
      // ขอบทาง: ด้านบนมีเงาตลิ่งหญ้าทอดลงมา (มีมิติ) ด้านล่างสว่างเล็กน้อย + ขอบดินชื้นรอบ ๆ
      const up = py >= 4 ? A[i - 4 * mw] : 0, dn = py < mh - 4 ? A[i + 4 * mw] : 0;
      const top = Math.max(0, Math.min(1, (v0 - up) * 3)), bot = Math.max(0, Math.min(1, (v0 - dn) * 3));
      const rim = a * (1 - ss(0.5, 0.66, v)) * 0.4, shd = a * top * 0.55, hl = a * bot * (1 - top) * 0.3;
      if (hl > shd + rim) { rd.data[o] = 255; rd.data[o + 1] = 232; rd.data[o + 2] = 190; rd.data[o + 3] = hl * 255; }
      else { rd.data[o] = 58; rd.data[o + 1] = 38; rd.data[o + 2] = 20; rd.data[o + 3] = Math.min(0.7, rim + shd) * 255; }
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
    const S = 2, ts = TILE / S; // หน้ากากน้ำละเอียด 2px → ขอบเนียน
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
    const A = blur(M, 10, 3), Dp = blur(M, 24, 2);
    const id = mg.createImageData(mw, mh), d = id.data;
    const WS = P.waterS, WD = P.waterD, seed = this.def.seed;
    // ขอบน้ำธรรมชาติ: นอยส์เลื่อนเส้นขอบ (ไม่เป็นมุมตามช่อง) • ไล่ alpha นุ่ม • ตื้นอมเขียว → ลึกน้ำเงินเข้ม
    const ss = (lo, hi, v) => { const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo))); return t * t * (3 - 2 * t); };
    const V = new Float32Array(mw * mh), nW = U.noiseGrid(mw, mh, 4, (x, y) => U.fbm((x0 * TILE + x * S) / 60, (y0 * TILE + y * S) / 60, seed + 61, 3));
    for (let py = 0; py < mh; py++) for (let px = 0; px < mw; px++) {
      const j = py * mw + px, a0 = A[j];
      V[j] = a0 < 0.05 || a0 > 0.95 ? a0 : a0 + (nW(px, py) - 0.5) * 0.32;
    }
    const SH = [Math.min(255, WS[0] * 0.75 + 40), Math.min(255, WS[1] * 0.9 + 20), Math.min(255, WS[2] * 0.8)];
    for (let py = 0; py < mh; py++) {
      for (let px = 0; px < mw; px++) {
        const j = py * mw + px, i = j * 4, v = V[j];
        if (v < 0.32) continue;
        const aw = ss(0.5, 0.56, v);
        const k = Math.min(1, Math.max(0, (Dp[j] - 0.45) * 2.2));
        const wr = SH[0] + (WD[0] * 0.8 - SH[0]) * k, wg = SH[1] + (WD[1] * 0.85 - SH[1]) * k, wb = SH[2] + (WD[2] * 0.95 - SH[2]) * k;
        const fz = (v - 0.535) / 0.012, foam = Math.exp(-fz * fz) * 0.75;
        const sand = ss(0.32, 0.46, v) * (1 - aw);
        let r = 120 * sand + wr * aw, gg = 104 * sand + wg * aw, bb = 70 * sand + wb * aw;  // ดินชื้นริมน้ำ
        r += (238 - r) * foam; gg += (248 - gg) * foam; bb += (250 - bb) * foam;
        d[i] = r; d[i + 1] = gg; d[i + 2] = bb; d[i + 3] = Math.max(aw, sand * 0.8, foam) * 255;
      }
    }
    mg.putImageData(id, 0, 0);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(m, x0 * TILE, y0 * TILE, mw * S, mh * S);
    const bkd = typeof Bake !== 'undefined' && Bake.data(this);
    if (bkd && bkd.reflect) this.waterMask = { x0, y0, mw, mh, S, V }; // เงาสะท้อนของซาก 3D ตัดเฉพาะน้ำลึก (js/bake.js Bake.reflect — ใช้แล้วทิ้ง)
    // ภาพผิวน้ำจริงทับเฉพาะส่วนน้ำลึก (ขอบทราย/ฟองยังเป็นแบบเดิม) โปร่งบางส่วนให้เห็นความลึก
    const wt = typeof Art !== 'undefined' && Art.get('ground_water');
    if (wt) {
      const wmk = document.createElement('canvas'); wmk.width = mw; wmk.height = mh;
      const wg = wmk.getContext('2d'), wd = wg.createImageData(mw, mh);
      for (let i = 0; i < mw * mh; i++) wd.data[i * 4 + 3] = ss(0.56, 0.68, V[i]) * 255;
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
      g.save(); g.globalAlpha = 0.5; g.globalCompositeOperation = 'overlay'; g.drawImage(layer, x0 * TILE, y0 * TILE); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 0.22; g.drawImage(layer, x0 * TILE, y0 * TILE); g.restore();
    }
    // มิติของบ่อ: ตลิ่งด้านบนทอดเงาลงน้ำ • ขอบล่างสะท้อนแสงฝั่งตรงข้าม
    const bk = document.createElement('canvas'); bk.width = mw; bk.height = mh;
    const bkg = bk.getContext('2d'), bd = bkg.createImageData(mw, mh);
    for (let py = 0; py < mh; py++) for (let px = 0; px < mw; px++) {
      const i = py * mw + px; if (V[i] < 0.58) continue;
      let up = 0, dn = 0;
      for (let k = 1; k <= 10; k++) if (py - k < 0 || V[i - k * mw] < 0.53) { up = k; break; }
      for (let k = 1; k <= 6; k++) if (py + k >= mh || V[i + k * mw] < 0.53) { dn = k; break; }
      const o = i * 4;
      if (up) { bd.data[o] = 6; bd.data[o + 1] = 34; bd.data[o + 2] = 62; bd.data[o + 3] = (1 - (up - 1) / 10) * 150; }
      else if (dn) { bd.data[o] = 215; bd.data[o + 1] = 245; bd.data[o + 2] = 255; bd.data[o + 3] = (1 - (dn - 1) / 6) * 70; }
    }
    bkg.putImageData(bd, 0, 0);
    g.drawImage(bk, x0 * TILE, y0 * TILE, mw * S, mh * S);
  }

  // ผนังถ้ำแบบหน้าผา: ขอบโค้งธรรมชาติ (ไม่เป็นเหลี่ยมตามช่อง) • ยอดหินมืดมีลาย • ขอบปากผาสว่าง
  // หน้าผาฝั่งใต้สูง ~0.6 ช่องไล่สี + ริ้วหินแนวตั้ง • เงาทอดและความมืดสะสม (AO) บนพื้นข้างผนัง
  caveWalls(g, W, H, field = false) {
    const S = 2, ts = TILE / S, mw = this.w * ts, mh = this.h * ts, seed = this.def.seed;
    const M = new Float32Array(mw * mh);
    for (let py = 0; py < mh; py++) for (let px = 0; px < mw; px++) if (this.tile((px / ts) | 0, (py / ts) | 0) === T.ROCK) M[py * mw + px] = 1;
    const A = U.boxBlur(M, mw, mh, 7, 2), B = U.boxBlur(M, mw, mh, 16, 2);
    const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    const al = new Float32Array(mw * mh);
    const nE = U.noiseGrid(mw, mh, 3, (x, y) => U.fbm(x * S / 60, y * S / 60, seed + 21, 3)), nT = U.noiseGrid(mw, mh, 8, (x, y) => U.fbm(x * S / 90, y * S / 90, seed + 33, 3));
    for (let py = 0; py < mh; py++) for (let px = 0; px < mw; px++) {
      const i = py * mw + px, v0 = A[i];
      al[i] = v0 < 0.02 ? 0 : v0 > 0.98 ? 1 : ss(0.42, 0.54, v0 + (nE(px, py) - 0.5) * 0.55);
    }
    // ระยะต่อเนื่องตามแนวตั้ง (คำนวณครั้งเดียว): dn = ระยะถึงพื้นด้านล่าง, upW = ระยะถึงพื้นด้านบน, wa = ระยะถึงผนังด้านบน (ของพื้น)
    const dn = new Uint16Array(mw * mh), upW = new Uint16Array(mw * mh), wa = new Uint16Array(mw * mh);
    for (let py = mh - 1; py >= 0; py--) for (let px = 0; px < mw; px++) { const i = py * mw + px; dn[i] = al[i] < 0.5 ? 0 : py + 1 < mh ? dn[i + mw] + 1 : 1; }
    for (let py = 0; py < mh; py++) for (let px = 0; px < mw; px++) {
      const i = py * mw + px;
      upW[i] = al[i] < 0.5 ? 0 : py > 0 ? upW[i - mw] + 1 : 1;
      wa[i] = al[i] > 0.5 ? 0 : py > 0 ? Math.min(999, wa[i - mw] + 1) : 999;
    }
    const FH = Math.round(TILE * 0.78 / S); // ความสูงหน้าผา (พิกเซลที่ความละเอียดนี้)
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const shC = mk(mw, mh), aoC = mk(mw, mh), alC = mk(mw, mh);
    const shD = shC.getContext('2d').createImageData(mw, mh), aoD = aoC.getContext('2d').createImageData(mw, mh), alD = alC.getContext('2d').createImageData(mw, mh);
    const sd = shD.data, ad = aoD.data, ld = alD.data;
    for (let py = 0; py < mh; py++) for (let px = 0; px < mw; px++) {
      const i = py * mw + px, a = al[i], o = i * 4;
      if (a < 0.98) { // พื้น: AO ใกล้ผนัง + เงาทอดใต้หน้าผา
        let sh = B[i] * 0.55; const k = wa[i];
        if (k >= 1 && k <= 10) sh = Math.max(sh, 0.7 * (1 - k / 11));
        ad[o] = 8; ad[o + 1] = 5; ad[o + 2] = 12; ad[o + 3] = Math.min(0.78, sh) * 255;
      }
      if (a < 0.01) continue;
      ld[o] = ld[o + 1] = ld[o + 2] = 255; ld[o + 3] = a * 255;
      const down = dn[i] >= 1 && dn[i] <= FH ? dn[i] : FH + 1;
      const n = nT(px, py);
      let L, warm = 0;
      if (down <= FH) { // หน้าผา (คูณกับลายหิน): บนสว่าง ล่างมืด + ริ้วแนวตั้งนุ่ม
        const t = 1 - down / FH, str = Math.sin(px * 0.42 + n * 7) * 0.5 + 0.5;
        L = 0.38 + t * t * 1.05 + (str - 0.5) * 0.26; warm = 0.22;
        if (t > 0.86) L = 1.75; // ปากผารับแสง
      } else { // ยอดหิน: มืดกว่าพื้น
        const up = upW[i] <= 3 ? upW[i] : 0;
        L = (field ? 0.62 : 0.2) + (n - 0.5) * (field ? 0.35 : 0.22) + (up ? 0.35 / up : 0);
      }
      sd[o] = Math.min(255, 255 * L * (1 + warm)); sd[o + 1] = Math.min(255, 238 * L); sd[o + 2] = Math.min(255, 228 * L * (1 - warm)); sd[o + 3] = 255;
    }
    shC.getContext('2d').putImageData(shD, 0, 0); aoC.getContext('2d').putImageData(aoD, 0, 0); alC.getContext('2d').putImageData(alD, 0, 0);
    // ประกอบที่ความละเอียดครึ่งหนึ่ง แล้วขยายครั้งเดียว (เร็วกว่าประกอบเต็มขนาดหลายเท่า)
    const wall = mk(mw, mh), wg = wall.getContext('2d');
    const tex = typeof Art !== 'undefined' && Art.get('ground_cave');
    if (tex) { const pc = mk(420 / S, 420 / S); pc.getContext('2d').drawImage(tex, 0, 0, 420 / S, 420 / S); wg.fillStyle = wg.createPattern(pc, 'repeat'); } else wg.fillStyle = '#6a5a5e';
    wg.fillRect(0, 0, mw, mh);
    if (field) { // หินกลางแจ้ง: ย้อมลายหินถ้ำเป็นเทาอมน้ำตาล + หย่อมมอสเขียว
      wg.globalCompositeOperation = 'color'; wg.fillStyle = '#9a8e7c'; wg.fillRect(0, 0, mw, mh);
      wg.globalCompositeOperation = 'soft-light'; wg.fillStyle = '#c8bca8'; wg.fillRect(0, 0, mw, mh);
      wg.globalCompositeOperation = 'source-over';
      const rr = U.seeded(seed + 77);
      for (let i = 0; i < mw * mh / 900; i++) { wg.fillStyle = `rgba(${70 + rr() * 30 | 0},${110 + rr() * 40 | 0},${40 + rr() * 20 | 0},${0.25 + rr() * 0.3})`; wg.beginPath(); wg.ellipse(rr() * mw, rr() * mh, 3 + rr() * 9, 2 + rr() * 5, rr() * 3, 0, 7); wg.fill(); }
    }
    wg.globalCompositeOperation = 'multiply'; wg.drawImage(shC, 0, 0);
    wg.globalCompositeOperation = 'destination-in'; wg.drawImage(alC, 0, 0);
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(aoC, 0, 0, W, H); g.drawImage(wall, 0, 0, W, H); g.restore();
  }
  // ภาพอบสันหิน (RIDGE_BAKE) ของแมพนี้ ถ้าผังช่องตรงกับตอนเรนเดอร์ (FNV-1a ของแถว y0..ล่างสุด)
  ridgeBake() {
    const rb = RIDGE_BAKE[this.id];
    if (!rb || !this.caveMouths.length) return null;
    if (this._ridgeOk === undefined) {
      let h = 0x811c9dc5;
      for (let i = rb.y0 * this.w; i < this.tiles.length; i++) { h ^= this.tiles[i]; h = Math.imul(h, 0x01000193) >>> 0; }
      this._ridgeOk = h === rb.hash;
      if (!this._ridgeOk) console.warn(`ridge bake ${this.id}: ผังช่องเปลี่ยน (hash ${h} ≠ ${rb.hash}) — ใช้ภาพวาดด้วยโค้ดแทน (รัน tools/ridge3d.py ใหม่)`);
    }
    return this._ridgeOk ? rb : null;
  }
  // ภาพอบปากทางแสงแดด (DAYLIGHT_BAKE) ถ้าผังช่องในกรอบตรงกับตอนเรนเดอร์
  daylightBake() {
    const db = DAYLIGHT_BAKE[this.id];
    if (!db || !this.daylight.length) return null;
    if (this._dayOk === undefined) {
      const [x0, y0, x1, y1] = db.rect; let h = 0x811c9dc5;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { h ^= this.tiles[y * this.w + x]; h = Math.imul(h, 0x01000193) >>> 0; }
      this._dayOk = h === db.hash;
      if (!this._dayOk) console.warn(`daylight bake ${this.id}: ผังช่องเปลี่ยน (hash ${h} ≠ ${db.hash}) — ใช้มอสวาดด้วยโค้ดแทน (รัน tools/daylight3d.py ใหม่)`);
    }
    return this._dayOk ? db : null;
  }
  // เงาลึกบนหลังผนังถ้ำ (ทับภาพอบ 3D): ยิ่งห่างพื้นเดินได้ยิ่งมืด → ผนังอ่านออกชัดว่าเดินไม่ได้ (เหมือนหลุมมืดของผนังโค้ดเดิม)
  //   หน้าผา/ขอบปากผา (ห่างพื้น ≤ ~1.5 ช่อง) ไม่โดน • ระยะ chamfer 2 รอบ แล้วขยายแบบนุ่มจากผ้าใบขนาดช่อง
  caveDepthShade(g, W, H) {
    const w = this.w, h = this.h, D = new Float32Array(w * h), BIG = 1e3, d2 = Math.SQRT2;
    for (let i = 0; i < w * h; i++) D[i] = this.tiles[i] === T.ROCK ? BIG : 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!D[i]) continue; let v = D[i];
      if (x > 0) v = Math.min(v, D[i - 1] + 1); if (y > 0) { v = Math.min(v, D[i - w] + 1); if (x > 0) v = Math.min(v, D[i - w - 1] + d2); if (x < w - 1) v = Math.min(v, D[i - w + 1] + d2); } D[i] = v; }
    for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; if (!D[i]) continue; let v = D[i];
      if (x < w - 1) v = Math.min(v, D[i + 1] + 1); if (y < h - 1) { v = Math.min(v, D[i + w] + 1); if (x < w - 1) v = Math.min(v, D[i + w + 1] + d2); if (x > 0) v = Math.min(v, D[i + w - 1] + d2); } D[i] = v; }
    const c = document.createElement('canvas'); c.width = w; c.height = h; const cx = c.getContext('2d'), im = cx.createImageData(w, h);
    for (let i = 0; i < w * h; i++) { const a = Math.max(0, Math.min(0.78, (D[i] - 1.6) * 0.32)); im.data[i * 4] = 6; im.data[i * 4 + 1] = 3; im.data[i * 4 + 2] = 10; im.data[i * 4 + 3] = a * 255; }
    cx.putImageData(im, 0, 0);
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, W, H); g.restore();
  }
  // ภาพอบผนังถ้ำ (CAVE_BAKE) ถ้าผังช่องทั้งแมพตรงกับตอนเรนเดอร์ (FNV-1a — tools/cave3d.py fnv) • ไม่ตรง = เตือนครั้งเดียว ใช้ caveWalls
  caveBake() {
    const cb = CAVE_BAKE[this.id];
    if (!cb) return null;
    if (this._caveOk === undefined) {
      let h = 0x811c9dc5;
      for (let i = 0; i < this.tiles.length; i++) { h ^= this.tiles[i]; h = Math.imul(h, 0x01000193) >>> 0; }
      this._caveOk = h === cb.hash;
      const warned = GameMap.caveWarned || (GameMap.caveWarned = new Set()); // เตือนครั้งเดียวต่อแมพ (แมพ lite ของแผนที่โลก/Bake.data เรียกซ้ำได้)
      if (!this._caveOk && !warned.has(this.id)) { warned.add(this.id); console.warn(`cave bake ${this.id}: ผังช่องเปลี่ยน (hash ${h} ≠ ${cb.hash}) — ใช้ผนังวาดด้วยโค้ดแทน (รัน tools/cave3d.py ใหม่)`); }
    }
    return this._caveOk ? cb : null;
  }
  // พื้นเมืองอบ 3D (TOWN_BAKE — tools/town3d.py) ถ้าผังช่องทั้งแมพตรงกับตอนเรนเดอร์ (FNV-1a แบบ caveBake) • ไม่ตรง = เตือนครั้งเดียว ใช้ TownArt วาดด้วยโค้ด
  townBake() {
    const tb = typeof TOWN_BAKE !== 'undefined' && TOWN_BAKE[this.id];
    if (!tb) return null;
    if (this._townOk === undefined) {
      let h = 0x811c9dc5;
      for (let i = 0; i < this.tiles.length; i++) { h ^= this.tiles[i]; h = Math.imul(h, 0x01000193) >>> 0; }
      this._townOk = h === tb.hash;
      const warned = GameMap.caveWarned || (GameMap.caveWarned = new Set());
      if (!this._townOk && !warned.has('town:' + this.id)) { warned.add('town:' + this.id); console.warn(`town bake ${this.id}: ผังช่องเปลี่ยน (hash ${h} ≠ ${tb.hash}) — ใช้พื้นเมืองวาดด้วยโค้ดแทน (รัน tools/town3d.py ใหม่)`); }
    }
    return this._townOk ? tb : null;
  }
  usesBake(k) { const rb = this.ridgeBake(), db = this.daylightBake(), cb = this.caveBake(), tb = this.def.kind === 'town' && this.townBake(); return (!!rb && rb.img === k && !this.ridgeImg) || (!!db && db.img === k && !this.daylightImg) || (!!cb && cb.img === k && !this.caveWallImg) || (!!tb && tb.img === k && !this.townImg) || !!(this.bakeWait && this.bakeWait.has(k)); } // ภาพพื้นอบที่แมพนี้รออยู่ (art.js onLoad → วาดพื้นใหม่) • ซุ้มวาดทุกเฟรมอยู่แล้ว ไม่ต้องวาดพื้นใหม่
  // ภาพรอยต่อ: ปากถ้ำมืดลึก (ทุ่ง) • แสงแดด + มอส + ใบไม้ปลิวเข้ามาที่ปากทางถ้ำ (ถ้ำ) • เสาไฟริมถนนหินอ่อน (ทุ่ง)
  seamArt(g) {
    for (const p of this.caveMouths) {
      if (this.ridgeImg) break; // มีภาพอบ 3D: ทางลง/ซุ้มปากถ้ำอยู่ในภาพแล้ว
      const x = (p.x + 0.5) * TILE, y = (p.y + 0.5) * TILE, r = TILE * 2.6;
      const gr = g.createRadialGradient(x, y, TILE * 0.3, x, y, r);
      gr.addColorStop(0, 'rgba(4,2,8,0.95)'); gr.addColorStop(0.45, 'rgba(10,6,14,0.7)'); gr.addColorStop(1, 'rgba(10,6,14,0)');
      g.save(); g.translate(x, y); g.scale(1, 0.7); g.translate(-x, -y); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.restore();
    }
    for (const p of this.daylight) {
      const x = (p.x + 0.5) * TILE, y = (p.y + 0.5) * TILE, dx = Math.sign(p.ax - p.x), dy = Math.sign(p.ay - p.y);
      const lx = x + dx * TILE * 2.5, ly = y + dy * TILE * 2.5, r = TILE * 6;
      // มอสและหญ้าขึ้นตรงที่แดดส่องถึง — ภาพอบ 3D (tools/daylight3d.py: บันไดหินแตก มอส หญ้า ใบไม้ปลิว ราก) • ยังไม่โหลด/ผังไม่ตรง = จุดมอสวาดด้วยโค้ด
      const db = this.daylightBake(), dimg = db && typeof Art !== 'undefined' && (Art.need(db.img), Art.get(db.img));
      this.daylightImg = !!dimg;
      if (dimg) { const [x0, y0, x1, y1] = db.rect; g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(dimg, x0 * TILE, y0 * TILE, (x1 - x0) * TILE, (y1 - y0) * TILE); g.restore(); }
      const rnd = U.seeded(this.def.seed + p.x * 7 + p.y);
      for (let i = 0; i < (dimg ? 0 : 70); i++) {
        const a = rnd() * Math.PI * 2, d = Math.pow(rnd(), 0.7) * r * 0.75, mx = lx + Math.cos(a) * d, my = ly + Math.sin(a) * d * 0.8;
        if (this.tile(Math.floor(mx / TILE), Math.floor(my / TILE)) !== T.CAVE) continue;
        g.fillStyle = `rgba(${70 + rnd() * 40 | 0},${120 + rnd() * 50 | 0},${50 + rnd() * 30 | 0},${0.35 + rnd() * 0.3})`;
        g.beginPath(); g.ellipse(mx, my, 4 + rnd() * 9, 3 + rnd() * 5, rnd() * 3, 0, 7); g.fill();
      }
      g.save(); g.globalCompositeOperation = 'screen';
      const gr = g.createRadialGradient(lx, ly, TILE * 0.5, lx, ly, r);
      gr.addColorStop(0, 'rgba(255,236,180,0.55)'); gr.addColorStop(0.5, 'rgba(200,220,150,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(lx, ly, r, 0, 7); g.fill(); g.restore();
    }
  }
  placeSeamProps() {
    if (this.daylight.length) this.extraLights = this.daylight.map(p => ({ x: p.x + 0.5 + Math.sign(p.ax - p.x) * 2.5, y: p.y + 0.5 + Math.sign(p.ay - p.y) * 2.5, lr: 6, col: '255,236,170' }));
    const gl = this.ridgeGate && this.ridgeGate.light; // แสงม่วงจากม่านมืดในซุ้มปากถ้ำ (ส่องให้เห็นซุ้มในความมืดกลางคืน)
    if (gl && !(this.extraLights || []).some(q => q.gate)) (this.extraLights = this.extraLights || []).push({ x: gl[0], y: gl[1], lr: gl[2], col: gl[3], gate: true });
    if (!propArt('prop_lamp')) return;
    for (const r of this.paved) for (const i of [3, 8]) for (const k of [-2, 2]) {
      const x = r.x + r.dx * i + r.qx * k, y = r.y + r.dy * i + r.qy * k;
      if (this.walkable(x, y)) this.props.push({ kind: 'lamp', img: 'prop_lamp', x: x + 0.5, y: y + 0.5, s: 0.9, r: 0.4 });
    }
  }
  // เอกลักษณ์ถ้ำแต่ละชั้น (def.caveTheme): ย้อมโทนทั้งพื้น + ลายเฉพาะ — Archive = ตราผนึก/อักษรรูนทองสลักพื้น • Roots = รากไม้ชอนไชจากผนัง
  // ตราผนึกวงกลมบนพื้น (Archive): ตำแหน่ง/ขนาด/ลายกำหนดตายตัวจาก seed — ใช้ทั้งวาดด้วยโค้ดและ tools/cave3d.py --extract (อบเป็นร่องสลักในภาพผนัง)
  caveSeals() {
    const rnd = U.seeded(this.def.seed * 3 + 1), floor = (x, y) => this.tile(x, y) === T.CAVE, out = [];
    for (let n = 0, tries = 0; n < Math.round(this.w * this.h / 500) && tries < 400; tries++) {
      const x = 3 + Math.floor(rnd() * (this.w - 6)), y = 3 + Math.floor(rnd() * (this.h - 6));
      let ok = true; for (let yy = y - 2; yy <= y + 2 && ok; yy++) for (let xx = x - 2; xx <= x + 2; xx++) if (!floor(xx, yy)) { ok = false; break; }
      if (!ok) continue; n++;
      const R0 = 1.3 + rnd() * 0.7, k = 6 + Math.floor(rnd() * 4), bits = [];
      for (let i = 0; i < k; i++) bits.push(rnd() < 0.5 ? 1 : 0); // อักษรรูนเล็กแต่ละซี่: ขีดเฉียงเริ่มบนสุด/กลาง
      out.push({ x, y, r: +R0.toFixed(4), k, bits });
    }
    return out;
  }
  caveTheme(g, W, H, bakedSeals) {
    const th = this.def.caveTheme, seed = this.def.seed;
    g.save(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = th.tintA || 0.5; g.fillStyle = th.tint; g.fillRect(0, 0, W, H);
    if (th.colorA) { g.globalCompositeOperation = 'color'; g.globalAlpha = th.colorA; g.fillRect(0, 0, W, H); } // ลดสีเส้นแร่เดิมให้เข้าโทน
    g.restore();
    const floor = (x, y) => this.tile(x, y) === T.CAVE;
    const nearWall = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => this.tile(x + dx, y + dy) === T.ROCK);
    if (th.glyph) {
      const col = th.glyph;
      const glowStroke = (w, a) => { g.globalAlpha = a; g.shadowColor = col; g.shadowBlur = 8; g.strokeStyle = col; g.lineWidth = w; g.stroke(); g.shadowBlur = 0; };
      // ตราผนึกวงกลมสลักพื้น (ภาพผนังอบมีร่องสลักเรืองทองของตราชุดเดียวกันแล้ว = ไม่วาดซ้ำ — tools/archive3d.py)
      for (const sl of bakedSeals ? [] : this.caveSeals()) {
        const cx = (sl.x + 0.5) * TILE, cy = (sl.y + 0.5) * TILE, R0 = TILE * sl.r, k = sl.k;
        g.save(); g.translate(cx, cy); g.scale(1, 0.8);
        g.beginPath(); g.arc(0, 0, R0, 0, 7); glowStroke(1.6, 0.42);
        g.beginPath(); g.arc(0, 0, R0 * 0.72, 0, 7); glowStroke(1, 0.32);
        for (let i = 0; i < k; i++) {
          const a = i / k * Math.PI * 2;
          g.beginPath(); g.moveTo(Math.cos(a) * R0 * 0.72, Math.sin(a) * R0 * 0.72); g.lineTo(Math.cos(a) * R0, Math.sin(a) * R0); glowStroke(1, 0.35);
          // อักษรรูนเล็ก (เส้นตั้ง + ขีดเฉียง)
          const ra = a + Math.PI / k, rx = Math.cos(ra) * R0 * 0.86, ry = Math.sin(ra) * R0 * 0.86, sz = 4;
          g.beginPath(); g.moveTo(rx, ry - sz); g.lineTo(rx, ry + sz); g.moveTo(rx, ry - sz * sl.bits[i]); g.lineTo(rx + sz * 0.8, ry - sz * 0.2); glowStroke(0.9, 0.4);
        }
        g.beginPath(); for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * 2.094; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * R0 * 0.4, Math.sin(a) * R0 * 0.4); } g.closePath(); glowStroke(1.2, 0.38);
        g.restore();
      }
      // เส้นวงจรข้อมูลจาง ๆ ตามพื้น
      for (let y = 2; y < this.h - 2; y++) for (let x = 2; x < this.w - 2; x++) {
        if (!floor(x, y) || U.hash2(x, y, seed + 808) > 0.05) continue;
        const px = x * TILE + 6, py = y * TILE + 10 + U.hash2(y, x, seed) * 20, len = 14 + U.hash2(x, y, seed + 3) * 18;
        g.save(); g.beginPath(); g.moveTo(px, py); g.lineTo(px + len * 0.5, py); g.lineTo(px + len * 0.5 + 6, py + 6); g.lineTo(px + len, py + 6); glowStroke(1, 0.28);
        g.fillStyle = col; g.globalAlpha = 0.6; g.beginPath(); g.arc(px + len, py + 6, 1.6, 0, 7); g.fill(); g.restore();
      }
    }
    if (th.roots) {
      // รากชอนไช: เริ่มที่พื้นติดผนัง เลื้อยออกเป็นเส้นโค้ง หนา→บาง มีเงาใต้ราก + ไฮไลต์ด้านบน
      const starts = [];
      for (let y = 2; y < this.h - 2; y++) for (let x = 2; x < this.w - 2; x++) if (floor(x, y) && nearWall(x, y) && U.hash2(x, y, seed + 909) < 0.16) starts.push([x, y]);
      for (const [x, y] of starts) {
        let px = (x + 0.5) * TILE, py = (y + 0.5) * TILE;
        // ทิศออกจากผนัง
        let ang = 0, c = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (this.tile(x + dx, y + dy) === T.ROCK) { ang += Math.atan2(-dy, -dx); c++; }
        ang = ang / c + (U.hash2(x, y, seed + 5) - 0.5) * 1.2;
        const segs = 4 + Math.floor(U.hash2(x, y, seed + 6) * 5), w0 = 9 + U.hash2(x, y, seed + 7) * 7;
        const pts = [[px - Math.cos(ang) * 14, py - Math.sin(ang) * 14]];
        for (let i = 0; i <= segs; i++) { pts.push([px, py]); ang += (U.hash2(x + i, y, seed + 11) - 0.5) * 1.1; px += Math.cos(ang) * 20; py += Math.sin(ang) * 20; }
        for (let pass = 0; pass < 3; pass++) {
          for (let i = 1; i < pts.length; i++) {
            const t = i / pts.length, w = Math.max(0.8, w0 * (1 - t * 0.85));
            const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
            g.beginPath(); g.moveTo(ax + (pass === 0 ? 2 : 0), ay + (pass === 0 ? 3 : pass === 2 ? -w * 0.25 : 0)); g.lineTo(bx + (pass === 0 ? 2 : 0), by + (pass === 0 ? 3 : pass === 2 ? -w * 0.25 : 0));
            g.lineCap = 'round'; g.lineWidth = pass === 2 ? w * 0.3 : w;
            g.strokeStyle = pass === 0 ? 'rgba(10,4,2,0.45)' : pass === 1 ? th.roots : 'rgba(200,130,80,0.45)';
            g.stroke();
          }
        }
      }
    }
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
    const img = (kind === 'crystal' && this.def.crystalImg && propArt(this.def.crystalImg)) ? this.def.crystalImg : PROP_ART[kind];
    this.props.push({ kind, img, x: x / TILE, y: y / TILE, s, r: U.hash2(x | 0, y | 0, this.def.seed) });
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
    // มินิแมพจากภาพพื้นจริง (ย่อ) + ยอดไม้เป็นจุดเขียวเข้ม → ตรงกับที่เห็นในเกม
    if (this.ground) {
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(this.ground, 0, 0, c.width, c.height);
      g.fillStyle = 'rgba(30,70,32,0.9)';
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.tile(x, y) === T.TREE) { g.beginPath(); g.arc((x + 0.5) * S, (y + 0.5) * S, S * 0.75, 0, 7); g.fill(); }
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
