'use strict';
// ============================================================
//  แกนหลักของเกม: ผู้เล่น สเตตัส การต่อสู้ มอนสเตอร์ สกิล ไอเทม
// ============================================================

const G = {
  time: 0, map: null, mapCache: {}, player: null,
  mobs: [], drops: [], npcs: [], fx: [], floaters: [], timers: [], respawns: [],
  mvpNext: {}, pendingSkill: null, hover: null, uid: 1, started: false,
};
const SAVE_KEY = 'ragnarok_web_save_v1';
const SAVE_FIELDS = ['name', 'gender', 'hair', 'job', 'baseLv', 'jobLv', 'baseExp', 'jobExp', 'stats', 'statPoints', 'skillPoints',
  'skills', 'zeny', 'inventory', 'equip', 'hotbar', 'map', 'x', 'y', 'save', 'hp', 'sp', 'options', 'uidSeq'];

// ------------------------------------------------------------
//  สร้าง / บันทึก / โหลด
// ------------------------------------------------------------
function newPlayer(name, gender, hair) {
  const p = {
    name, gender, hair, job: 'novice', baseLv: 1, jobLv: 1, baseExp: 0, jobExp: 0,
    stats: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 }, statPoints: 48, skillPoints: 0,
    skills: { first_aid: 1 }, zeny: 500, inventory: [],
    equip: { head: null, weapon: null, shield: null, armor: null, garment: null, shoes: null, acc: null },
    hotbar: [null, null, null, null, null, null, null, null, null],
    map: 'prontera', x: 20.5, y: 24.5, save: { map: 'prontera', x: 20.5, y: 24.5 },
    hp: 1, sp: 1, options: { autoLoot: true, sound: true, expMsg: true }, uidSeq: 1,
  };
  initRuntime(p);
  G.player = p;
  addItem('red_potion', 15, true);
  addItem('fly_wing', 5, true);
  addItem('butterfly_wing', 2, true);
  addItem('apple', 5, true);
  addItem('knife', 1, true);
  addItem('cotton_shirt', 1, true);
  equipItem(p.inventory.find(e => e.id === 'knife'), true);
  equipItem(p.inventory.find(e => e.id === 'cotton_shirt'), true);
  p.hotbar[0] = { t: 'item', id: 'red_potion' };
  p.hotbar[1] = { t: 'skill', id: 'first_aid' };
  p.hotbar[8] = { t: 'item', id: 'butterfly_wing' };
  recalc();
  p.hp = p.d.maxHp; p.sp = p.d.maxSp;
  return p;
}

function initRuntime(p) {
  Object.assign(p, {
    path: [], target: null, pickTarget: null, npcTarget: null, skillIntent: null, cast: null,
    facing: 1, moving: false, sitting: false, dead: false, atkAnim: 0, nextAttack: 0, skillReadyAt: 0, itemReadyAt: 0,
    repathAt: 0, hpTimer: 0, spTimer: 0, buffs: {}, speech: null, poisonUntil: 0, d: {},
  });
}

function saveGame(silent = true) {
  const p = G.player;
  if (!p || !G.started) return;
  const data = {};
  for (const k of SAVE_FIELDS) data[k] = p[k];
  data.uidSeq = G.uid;
  data.savedAt = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    if (!silent) UI.msg('บันทึกเกมเรียบร้อย', 'sys');
  } catch (e) {
    if (!silent) UI.msg('บันทึกเกมไม่สำเร็จ (เบราว์เซอร์ไม่อนุญาต)', 'err');
  }
}
function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}
function loadGame() {
  let data;
  try { data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; }
  if (!data || !data.name) return null;
  const p = newPlayer(data.name, data.gender, data.hair);
  for (const k of SAVE_FIELDS) if (data[k] !== undefined) p[k] = data[k];
  // ป้องกันข้อมูลเสีย
  p.equip = Object.assign({ head: null, weapon: null, shield: null, armor: null, garment: null, shoes: null, acc: null }, p.equip);
  p.inventory = (p.inventory || []).filter(e => e && ITEMS[e.id]);
  for (const s in p.equip) if (p.equip[s] && !ITEMS[p.equip[s].id]) p.equip[s] = null;
  if (!JOBS[p.job]) p.job = 'novice';
  if (!MAP_DEFS[p.map]) { p.map = 'prontera'; p.x = 20.5; p.y = 24.5; }
  G.uid = Math.max(G.uid, data.uidSeq || 1);
  initRuntime(p);
  recalc();
  return p;
}
function deleteSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }

// ------------------------------------------------------------
//  ค่าสถานะที่คำนวณได้
// ------------------------------------------------------------
function skillLv(id) { return (G.player.skills[id] || 0); }
function weaponType() {
  const w = G.player.equip.weapon;
  return w ? ITEMS[w.id].wtype : 'none';
}

function recalc() {
  const p = G.player, j = JOBS[p.job];
  const b = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0, atk: 0, matk: 0, def: 0, mdef: 0, hp: 0, sp: 0, hit: 0, flee: 0, crit: 0, range: 0 };
  const add = o => { if (o) for (const k in o) b[k] = (b[k] || 0) + o[k]; };
  let weaponAtk = 0, weaponMatk = 0;
  for (const slot of EQUIP_SLOTS) {
    const e = p.equip[slot];
    if (!e) continue;
    const it = ITEMS[e.id];
    add(it.b);
    if (slot === 'weapon') { weaponAtk = (it.atk || 0) + (e.refine || 0) * 3; weaponMatk = (it.matk || 0) + (e.refine || 0) * 2; }
    else { b.def += (it.def || 0) + (e.refine || 0); b.mdef += it.mdef || 0; }
    for (const c of e.cards || []) add(ITEMS[c].b);
  }
  // สกิลติดตัว
  b.dex += skillLv('owl_eye');
  b.range += skillLv('vultures_eye'); b.hit += skillLv('vultures_eye');
  b.flee += skillLv('improve_dodge') * 3;
  // บัฟ
  const bf = p.buffs;
  if (bf.increase_agi) b.agi += 2 + bf.increase_agi.lv;
  if (bf.blessing) { b.str += bf.blessing.lv; b.int += bf.blessing.lv; b.dex += bf.blessing.lv; }
  if (bf.improve_concentration) { b.agi += 2 + bf.improve_concentration.lv; b.dex += 2 + bf.improve_concentration.lv; }

  const d = {};
  for (const s of ['str', 'agi', 'vit', 'int', 'dex', 'luk']) { d[s] = p.stats[s] + b[s]; d[s + 'Bonus'] = b[s]; }
  const wt = weaponType();
  d.ranged = wt === 'bow';
  d.statusAtk = d.ranged
    ? d.dex + Math.floor(d.dex / 10) ** 2 + Math.floor(d.str / 5) + Math.floor(d.luk / 5)
    : d.str + Math.floor(d.str / 10) ** 2 + Math.floor(d.dex / 5) + Math.floor(d.luk / 5);
  d.weaponAtk = weaponAtk;
  d.atkBonus = b.atk + ((wt === 'sword' || wt === 'dagger') ? skillLv('sword_mastery') * 4 : 0);
  d.matkMin = d.int + Math.floor(d.int / 7) ** 2 + weaponMatk + b.matk;
  d.matkMax = d.int + Math.floor(d.int / 5) ** 2 + weaponMatk + b.matk;
  d.def = Math.min(90, b.def); d.softDef = Math.floor(d.vit / 2);
  d.mdef = Math.min(90, b.mdef); d.softMdef = Math.floor(d.int / 2);
  d.hit = p.baseLv + d.dex + b.hit;
  d.flee = p.baseLv + d.agi + b.flee;
  d.pdodge = 1 + Math.floor(d.luk / 10);
  d.crit = 1 + Math.floor(d.luk * 0.3) + b.crit;
  d.maxHp = Math.floor((35 + p.baseLv * (8 + p.baseLv * 0.12) * j.hp) * (1 + d.vit / 100)) + b.hp;
  d.maxSp = Math.floor((10 + p.baseLv * 2.2 * j.sp) * (1 + d.int / 100)) + b.sp;
  const base = j.aspd * (WEAPON_ASPD_MOD[wt] || 1);
  d.aspdDelay = Math.max(280, Math.floor(base * (1 - Math.min(0.72, (d.agi + d.dex / 4) / 140))));
  d.aspd = Math.floor(200 - d.aspdDelay / 10);
  d.range = d.ranged ? 5 + b.range : 1.5;
  d.speed = 4.6 * (bf.increase_agi ? 1.25 : 1);
  d.atkDisplay = `${d.statusAtk} + ${d.weaponAtk + d.atkBonus}`;
  p.d = d;
  p.hp = Math.min(p.hp, d.maxHp);
  p.sp = Math.min(p.sp, d.maxSp);
  UI.dirty();
}

// ------------------------------------------------------------
//  ประสบการณ์และเลเวล
// ------------------------------------------------------------
function gainExp(bexp, jexp) {
  const p = G.player;
  let baseUp = false, jobUp = false;
  p.baseExp += bexp;
  while (p.baseLv < MAX_BASE_LV && p.baseExp >= baseExpNeed(p.baseLv)) {
    p.baseExp -= baseExpNeed(p.baseLv);
    p.baseLv++;
    p.statPoints += statPointsForLevel(p.baseLv);
    baseUp = true;
  }
  if (p.baseLv >= MAX_BASE_LV) p.baseExp = 0;
  const jmax = JOBS[p.job].jobMax;
  p.jobExp += jexp;
  while (p.jobLv < jmax && p.jobExp >= jobExpNeed(p.job, p.jobLv)) {
    p.jobExp -= jobExpNeed(p.job, p.jobLv);
    p.jobLv++;
    p.skillPoints++;
    jobUp = true;
  }
  if (p.jobLv >= jmax) p.jobExp = 0;
  if (p.options.expMsg) UI.msg(`ได้รับ ${U.fmt(bexp)} Base EXP / ${U.fmt(jexp)} Job EXP`, 'exp');
  if (baseUp) {
    recalc();
    p.hp = p.d.maxHp; p.sp = p.d.maxSp;
    addFx({ type: 'levelup', ref: p, dur: 2.2 });
    addFloater(p.x, p.y - 1.4, 'LEVEL UP!', '#ffe36a', true);
    UI.msg(`★ Base Level เพิ่มเป็น ${p.baseLv}! ได้รับ Status Point`, 'lvl');
    Sound.play('levelup');
  }
  if (jobUp) {
    addFx({ type: 'levelup', ref: p, dur: 2.2, job: true });
    addFloater(p.x, p.y - (baseUp ? 1.9 : 1.4), 'JOB LEVEL UP!', '#9fe0ff', true);
    UI.msg(`★ Job Level เพิ่มเป็น ${p.jobLv}! ได้รับ Skill Point`, 'lvl');
    if (!baseUp) Sound.play('levelup');
  }
  UI.dirty();
}

function raiseStat(s) {
  const p = G.player;
  const cost = statCost(p.stats[s]);
  if (p.stats[s] >= 99 || p.statPoints < cost) return;
  p.statPoints -= cost;
  p.stats[s]++;
  recalc();
  Sound.play('click');
}

// ------------------------------------------------------------
//  ไอเทม
// ------------------------------------------------------------
function isEquipType(it) { return it.type === 'weapon' || it.type === 'armor'; }
function addItem(id, qty = 1, silent = false) {
  const p = G.player, it = ITEMS[id];
  if (!it) return false;
  if (isEquipType(it)) {
    for (let i = 0; i < qty; i++) p.inventory.push({ id, qty: 1, uid: G.uid++, refine: 0, cards: [] });
  } else {
    const ex = p.inventory.find(e => e.id === id);
    if (ex) ex.qty += qty; else p.inventory.push({ id, qty });
  }
  if (!silent) UI.msg(`ได้รับ ${it.name} ${qty} ชิ้น`, 'item');
  UI.dirty();
  return true;
}
function removeEntry(entry, qty = 1) {
  const p = G.player;
  entry.qty -= qty;
  if (entry.qty <= 0) {
    const i = p.inventory.indexOf(entry);
    if (i >= 0) p.inventory.splice(i, 1);
  }
  UI.dirty();
}
function countItem(id) { return G.player.inventory.filter(e => e.id === id).reduce((a, e) => a + e.qty, 0); }
function itemDisplayName(entry) {
  const it = ITEMS[entry.id];
  let n = (entry.refine ? `+${entry.refine} ` : '') + it.name;
  if (it.slots) n += ` [${it.slots}]`;
  return n;
}

function canEquip(it, verbose) {
  const p = G.player;
  const say = m => { if (verbose) UI.msg(m, 'err'); return false; };
  if (it.jobs !== 'all' && !it.jobs.includes(p.job)) return say(`อาชีพ ${JOBS[p.job].name} ไม่สามารถสวมใส่ ${it.name} ได้`);
  if (it.lv && p.baseLv < it.lv) return say(`ต้องมี Base Level ${it.lv} ขึ้นไป`);
  if (it.slot === 'shield' && weaponType() === 'bow') return say('ไม่สามารถใช้โล่คู่กับธนูได้');
  return true;
}
function equipItem(entry, silent) {
  const p = G.player;
  if (!entry) return;
  const it = ITEMS[entry.id];
  if (!isEquipType(it) || !canEquip(it, !silent)) return;
  if (it.wtype === 'bow' && p.equip.shield) unequip('shield', true);
  if (p.equip[it.slot]) unequip(it.slot, true);
  const i = p.inventory.indexOf(entry);
  if (i >= 0) p.inventory.splice(i, 1);
  p.equip[it.slot] = entry;
  recalc();
  if (!silent) { UI.msg(`สวมใส่ ${itemDisplayName(entry)}`, 'sys'); Sound.play('equip'); }
}
function unequip(slot, silent) {
  const p = G.player, e = p.equip[slot];
  if (!e) return;
  p.equip[slot] = null;
  p.inventory.push(e);
  recalc();
  if (!silent) UI.msg(`ถอด ${itemDisplayName(e)}`, 'sys');
}
function unequipInvalid() {
  const p = G.player;
  for (const s of EQUIP_SLOTS) {
    const e = p.equip[s];
    if (e && !canEquip(ITEMS[e.id], false)) unequip(s, false);
  }
}

function useItem(entry) {
  const p = G.player;
  if (!entry || entry.qty <= 0) return;
  const it = ITEMS[entry.id];
  if (isEquipType(it)) { equipItem(entry); return; }
  if (it.type === 'card') { UI.compoundCard(entry); return; }
  if (it.type !== 'use') { UI.msg(`${it.name} เป็นของสะสม นำไปขายที่ร้านค้าได้`, 'info'); return; }
  if (p.dead || G.time < p.itemReadyAt) return;
  p.itemReadyAt = G.time + 0.12;
  if (it.heal) {
    const amt = Math.floor(U.randi(it.heal[0], it.heal[1]) * (1 + p.d.vit * 0.02));
    healPlayer(amt, 'item');
  }
  if (it.spHeal) {
    const amt = Math.floor(U.randi(it.spHeal[0], it.spHeal[1]) * (1 + p.d.int * 0.02));
    p.sp = Math.min(p.d.maxSp, p.sp + amt);
    addFloater(p.x, p.y - 1.2, `+${amt}`, '#7fb0ff');
  }
  if (it.cure && p.poisonUntil > G.time) { p.poisonUntil = 0; UI.msg('หายจากพิษแล้ว', 'sys'); }
  if (it.effect === 'fly') {
    const pos = G.map.randomWalkable();
    addFx({ type: 'warp', x: p.x, y: p.y, dur: 0.6 });
    teleportPlayer(pos.x + 0.5, pos.y + 0.5);
    addFx({ type: 'warp', x: p.x, y: p.y, dur: 0.6 });
  }
  if (it.effect === 'return') {
    addFx({ type: 'warp', x: p.x, y: p.y, dur: 0.6 });
    changeMap(p.save.map, p.save.x, p.save.y);
  }
  if (it.heal || it.spHeal) Sound.play('potion'); else Sound.play('warp');
  removeEntry(entry, 1);
}
function useHotbar(i) {
  const p = G.player, h = p.hotbar[i];
  if (!h || p.dead) return;
  if (h.t === 'skill') useSkill(h.id);
  else {
    const e = p.inventory.find(x => x.id === h.id);
    if (e) useItem(e); else UI.msg(`${ITEMS[h.id].name} หมดแล้ว`, 'err');
  }
}

function dropItemOnGround(id, x, y, qty = 1) {
  const p = G.player;
  if (p.options.autoLoot && U.dist(x, y, p.x, p.y) < 12) { addItem(id, qty); Sound.play('pickup'); return; }
  G.drops.push({ uid: G.uid++, id, qty, x: x + U.rand(-0.5, 0.5), y: y + U.rand(-0.4, 0.4), born: G.time, pop: 0 });
}
function pickUp(drop) {
  const i = G.drops.indexOf(drop);
  if (i < 0) return;
  G.drops.splice(i, 1);
  addItem(drop.id, drop.qty);
  Sound.play('pickup');
}

// ------------------------------------------------------------
//  เอฟเฟกต์และตัวเลขลอย
// ------------------------------------------------------------
const FX_LINGER = { firebolt: 0.3, coldbolt: 0.25, lightning: 0.2, holy: 0.25, soul: 0.2, frost: 0.35, arrow: 0.05 };
function addFx(f) { f.t = 0; f.linger = FX_LINGER[f.type] || 0; G.fx.push(f); return f; }
function addFloater(x, y, text, color, big) {
  G.floaters.push({ x: x + U.rand(-0.15, 0.15), y, text: String(text), color, big, t: 0, dur: big ? 1.6 : 1.1 });
}
function later(sec, fn) { G.timers.push({ at: G.time + sec, fn }); }
function shout(text) { G.player.speech = { text, until: G.time + 1.6, shout: true }; }

// ------------------------------------------------------------
//  แผนที่
// ------------------------------------------------------------
function getMap(id) {
  if (!G.mapCache[id]) G.mapCache[id] = new GameMap(id);
  return G.mapCache[id];
}
function changeMap(id, x, y) {
  const p = G.player;
  const map = getMap(id);
  G.map = map;
  p.map = id;
  teleportPlayer(x, y);
  G.mobs = []; G.drops = []; G.fx = []; G.floaters = []; G.timers = []; G.respawns = [];
  G.npcs = (map.def.npcs || []).map(n => Object.assign({}, n));
  for (const [mid, n] of map.def.spawns) for (let i = 0; i < n; i++) spawnMob(mid);
  if (map.def.mvp && (!G.mvpNext[id] || G.time >= G.mvpNext[id])) spawnMvp(map.def.mvp);
  UI.onMapChange(map);
  Sound.play('warp');
  saveGame();
}
function teleportPlayer(x, y) {
  const p = G.player;
  p.x = x; p.y = y; p.path = []; p.target = null; p.pickTarget = null; p.npcTarget = null; p.skillIntent = null; p.cast = null;
  p.sitting = false;
  for (const m of G.mobs) if (m.state === 'chase') { m.state = 'idle'; m.path = []; }
}
function spawnMob(id, pos) {
  const d = MOBS[id];
  const p = G.player;
  pos = pos || G.map.randomWalkable([{ x: p.x, y: p.y }], 7);
  const m = {
    uid: G.uid++, def: d, x: pos.x + 0.5, y: pos.y + 0.5, hp: d.hp, maxHp: d.hp, state: 'idle', path: [],
    facing: Math.random() < 0.5 ? 1 : -1, seed: Math.random(), nextWander: G.time + U.rand(0, 4), nextAtk: 0, repathAt: 0,
    hitFlash: 0, atkAnim: 0, frozenUntil: 0, poisonUntil: 0, poisonTick: 0, dead: false, deathT: 0, moving: false,
    emoteUntil: 0, stolen: false, nextBossSkill: G.time + 8,
  };
  G.mobs.push(m);
  return m;
}
function spawnMvp(id) {
  const m = spawnMob(id);
  m.isMvp = true;
  UI.announce(`⚠ ${MOBS[id].name} (MVP) ได้ปรากฏตัวขึ้นใน ${G.map.def.name}!`);
  UI.msg(`[MVP] ${MOBS[id].name} ปรากฏตัวแล้ว!`, 'mvp');
}

// ------------------------------------------------------------
//  การเคลื่อนที่
// ------------------------------------------------------------
function moveEntity(e, dt, speed) {
  let step = speed * dt;
  e.moving = false;
  while (step > 0 && e.path.length) {
    const n = e.path[0];
    const tx = n.x + 0.5, ty = n.y + 0.5;
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
    if (Math.abs(dx) > 0.05) e.facing = dx > 0 ? 1 : -1;
    e.moving = true;
    if (d <= step) { e.x = tx; e.y = ty; e.path.shift(); step -= d; }
    else { e.x += dx / d * step; e.y += dy / d * step; step = 0; }
  }
}
function playerWalkTo(tx, ty) {
  const p = G.player;
  if (p.dead) return;
  p.sitting = false;
  p.path = findPath(G.map, Math.floor(p.x), Math.floor(p.y), tx, ty);
}

// ------------------------------------------------------------
//  การต่อสู้
// ------------------------------------------------------------
function physHit(m, mult = 1, opts = {}) {
  const p = G.player, d = p.d, md = m.def;
  const crit = !opts.skill && U.chance(Math.max(0, d.crit - md.lv * 0.1) / 100);
  const hitRate = U.clamp(80 + d.hit + (opts.hitBonus || 0) - md.flee, 5, 100);
  if (!crit && !U.chance(hitRate / 100)) return { miss: true };
  let atk = d.statusAtk + d.weaponAtk * (crit ? 1 : U.rand(0.8, 1.0)) + d.atkBonus + (opts.flatAtk || 0);
  const dbLv = skillLv('demon_bane');
  if (dbLv && (md.race === 'undead' || md.race === 'demon')) atk += dbLv * 3;
  const em = elemMod(opts.element || 'neutral', md.element);
  let dmg = atk * mult * em;
  if (crit) dmg *= 1.4;
  else dmg = dmg * (1 - md.def / 100) - md.vit * 0.5 * U.rand(0.7, 1);
  return { dmg: em === 0 ? 0 : Math.max(1, Math.round(dmg)), crit };
}
function magicHit(m, mult = 1, element = 'neutral') {
  const d = G.player.d, md = m.def;
  const matk = U.randi(d.matkMin, Math.max(d.matkMin, d.matkMax));
  const em = elemMod(element, md.element);
  const dmg = matk * mult * em * (1 - md.mdef / 100) - md.lv / 4;
  return { dmg: em === 0 ? 0 : Math.max(1, Math.round(dmg)) };
}
function applyHit(m, r, opts = {}) {
  if (m.dead) return;
  if (r.miss) {
    addFloater(m.x, m.y - 1, 'Miss', '#c8d0ff');
    aggroMob(m);
    return;
  }
  damageMob(m, r.dmg, Object.assign({ crit: r.crit }, opts));
}
function aggroMob(m) {
  if (m.dead) return;
  if (m.state !== 'chase') { m.state = 'chase'; m.emoteUntil = G.time + 0.9; m.path = []; }
}
function damageMob(m, dmg, opts = {}) {
  if (m.dead) return;
  m.hp -= dmg;
  m.hitFlash = 0.12;
  const s = (m.def.scale || 1);
  addFloater(m.x, m.y - 0.9 * s - 0.3, dmg, opts.color || (opts.crit ? '#ffe040' : '#ffffff'), opts.crit);
  if (opts.crit) addFx({ type: 'crit', x: m.x, y: m.y - 0.5, dur: 0.35 });
  else addFx({ type: 'hit', x: m.x + U.rand(-0.2, 0.2), y: m.y - 0.5 * s + U.rand(-0.2, 0.2), dur: 0.2 });
  if (m.frozenUntil > G.time && opts.element !== 'water') m.frozenUntil = 0;
  aggroMob(m);
  Sound.play(opts.crit ? 'crit' : 'hit');
  if (m.hp <= 0) killMob(m);
}
function killMob(m) {
  const p = G.player, d = m.def;
  m.dead = true; m.deathT = 0; m.hp = 0; m.path = []; m.moving = false;
  if (p.target === m) p.target = null;
  gainExp(d.exp, d.jexp);
  for (const [id, ch] of d.drops) if (U.chance(ch)) dropItemOnGround(id, m.x, m.y);
  if (m.isMvp) {
    UI.announce(`🏆 ${p.name} ได้ปราบ MVP ${d.name} สำเร็จ!`);
    UI.msg(`[MVP] ยินดีด้วย! คุณได้รับรางวัล MVP`, 'mvp');
    const bonus = U.pick(['white_potion', 'blue_potion', 'yellow_potion']);
    addItem(bonus, 3);
    G.mvpNext[G.map.id] = G.time + d.respawn / 1000;
    Sound.play('mvp');
  } else {
    G.respawns.push({ id: d.id, at: G.time + U.rand(6, 14) });
  }
  Sound.play('kill');
}

function playerAttack(m) {
  const p = G.player;
  p.nextAttack = G.time + p.d.aspdDelay / 1000;
  p.atkAnim = 1;
  p.facing = m.x >= p.x ? 1 : -1;
  const doHit = () => {
    if (m.dead) return;
    applyHit(m, physHit(m));
    const da = skillLv('double_attack');
    if (da && weaponType() === 'dagger' && !m.dead && U.chance(da * 0.05)) {
      later(0.1, () => { if (!m.dead) { applyHit(m, physHit(m)); addFloater(m.x, m.y - 1.6, 'Double!', '#ffd0a0'); } });
    }
  };
  if (p.d.ranged) {
    addFx({ type: 'arrow', sx: p.x, sy: p.y - 0.6, ref: m, dur: Math.max(0.08, U.dist(p.x, p.y, m.x, m.y) / 18), onHit: doHit });
    Sound.play('bow');
  } else {
    doHit();
    Sound.play('swing');
  }
}

function mobAttack(m) {
  const p = G.player, d = p.d, md = m.def;
  m.nextAtk = G.time + (md.atkDelay || 1.7);
  m.atkAnim = 1;
  m.facing = p.x >= m.x ? 1 : -1;
  if (U.chance(d.pdodge / 100)) { addFloater(p.x, p.y - 1.2, 'Lucky!', '#a0ffa0'); return; }
  const hitRate = U.clamp(80 + md.hit - d.flee, 5, 95);
  if (!U.chance(hitRate / 100)) { addFloater(p.x, p.y - 1.2, 'Miss', '#a0c0ff'); return; }
  let dmg = U.randi(md.atk[0], md.atk[1]);
  dmg = Math.max(1, Math.round(dmg * (1 - d.def / 100) - d.softDef * U.rand(0.7, 1)));
  damagePlayer(dmg);
}
function damagePlayer(dmg, color = '#ff5050') {
  const p = G.player;
  if (p.dead) return;
  p.hp -= dmg;
  p.sitting = false;
  addFloater(p.x, p.y - 1.2, dmg, color);
  p.hurtFlash = 0.15;
  Sound.play('hurt');
  if (p.hp <= 0) playerDie();
}
function healPlayer(amt) {
  const p = G.player;
  p.hp = Math.min(p.d.maxHp, p.hp + amt);
  addFloater(p.x, p.y - 1.2, `+${amt}`, '#70ff70');
}
function playerDie() {
  const p = G.player;
  p.hp = 0; p.dead = true; p.path = []; p.target = null; p.cast = null; p.skillIntent = null; p.sitting = false;
  let lost = 0;
  if (p.job !== 'novice' && p.baseLv < MAX_BASE_LV) {
    lost = Math.floor(baseExpNeed(p.baseLv) * 0.01);
    p.baseExp = Math.max(0, p.baseExp - lost);
  }
  for (const m of G.mobs) if (m.state === 'chase') { m.state = 'idle'; m.path = []; }
  UI.msg(`คุณถูกสังหาร!${lost ? ` เสีย Base EXP ${U.fmt(lost)}` : ''}`, 'err');
  Sound.play('die');
  UI.showDeath();
}
function respawnPlayer() {
  const p = G.player;
  UI.hideDeath();
  p.dead = false;
  p.hp = Math.max(1, Math.floor(p.d.maxHp * (p.job === 'novice' ? 1 : 0.5)));
  p.sp = Math.max(p.sp, Math.floor(p.d.maxSp * 0.3));
  p.poisonUntil = 0;
  changeMap(p.save.map, p.save.x, p.save.y);
}

// ------------------------------------------------------------
//  สกิล
// ------------------------------------------------------------
function skillCost(id, lv) { const s = SKILLS[id]; return s.sp ? s.sp(lv) : 0; }
function skillReqMet(id) {
  const req = SKILLS[id].req;
  if (!req) return true;
  return Object.keys(req).every(k => skillLv(k) >= req[k]);
}
function learnableSkills() {
  const p = G.player;
  return JOBS[p.job].skills.filter(id => !SKILLS[id].noLearn);
}
function canLearn(id) {
  const p = G.player, s = SKILLS[id];
  return p.skillPoints > 0 && !s.noLearn && skillLv(id) < s.max && learnableSkills().includes(id) && skillReqMet(id);
}
function learnSkill(id) {
  const p = G.player;
  if (!canLearn(id)) return;
  p.skillPoints--;
  const first = !p.skills[id];
  p.skills[id] = skillLv(id) + 1;
  if (first && SKILLS[id].type === 'active') {
    const slot = p.hotbar.findIndex(h => !h);
    if (slot >= 0 && !p.hotbar.some(h => h && h.t === 'skill' && h.id === id)) p.hotbar[slot] = { t: 'skill', id };
  }
  recalc();
  Sound.play('click');
}
function skillRange(s) {
  if (s.range) return s.range;
  if (s.melee) return 1.5;
  return G.player.d.range;
}

function useSkill(id) {
  const p = G.player;
  if (p.dead) return;
  const lv = skillLv(id), s = SKILLS[id];
  if (!lv || !s) return;
  if (s.type === 'passive') { UI.msg(`${s.name} เป็นสกิลติดตัว ทำงานอัตโนมัติ`, 'info'); return; }
  if (p.cast) return;
  if (s.bow && weaponType() !== 'bow') { UI.msg('สกิลนี้ต้องสวมธนู', 'err'); return; }
  if (id === 'heal') {
    const h = G.hover && G.hover.kind === 'mob' ? G.hover.ref : null;
    beginSkill(id, lv, h && h.def.element === 'undead' ? h : null);
    return;
  }
  if (s.target === 'enemy') {
    const tgt = p.target && !p.target.dead ? p.target : (G.hover && G.hover.kind === 'mob' ? G.hover.ref : null);
    if (!tgt) { G.pendingSkill = id; UI.msg(`คลิกที่มอนสเตอร์เพื่อใช้ ${s.name}`, 'info'); return; }
    beginSkill(id, lv, tgt);
  } else beginSkill(id, lv, null);
}
function beginSkill(id, lv, tgt) {
  const p = G.player, s = SKILLS[id];
  G.pendingSkill = null;
  if (G.time < p.skillReadyAt) { UI.msg('ยังไม่สามารถใช้สกิลได้ (ดีเลย์)', 'err'); return; }
  if (p.sp < skillCost(id, lv)) { UI.msg('SP ไม่เพียงพอ', 'err'); addFloater(p.x, p.y - 1.3, 'SP ไม่พอ', '#8fb0ff'); return; }
  if (tgt) {
    const dist = U.dist(p.x, p.y, tgt.x, tgt.y);
    const range = skillRange(s);
    if (dist > range + 0.3 || (range > 2 && !lineOfSight(G.map, p.x, p.y, tgt.x, tgt.y))) {
      p.skillIntent = { id, lv, tgt }; p.target = null; p.repathAt = 0;
      return;
    }
    p.facing = tgt.x >= p.x ? 1 : -1;
  }
  p.sitting = false; p.path = []; p.skillIntent = null;
  let castMs = s.cast ? s.cast(lv) : 0;
  castMs *= Math.max(0, 1 - p.d.dex / 150);
  if (castMs > 50) {
    p.cast = { id, lv, target: tgt, start: G.time, end: G.time + castMs / 1000 };
    if (s.magic) addFx({ type: 'castcircle', ref: p, dur: castMs / 1000, color: SKILLS[id].icon });
    return;
  }
  executeSkill(id, lv, tgt);
}

function executeSkill(id, lv, tgt) {
  const p = G.player, s = SKILLS[id];
  if (tgt && tgt.dead) return;
  const cost = skillCost(id, lv);
  if (p.sp < cost) { UI.msg('SP ไม่เพียงพอ', 'err'); return; }
  p.sp -= cost;
  const delay = typeof s.delay === 'function' ? s.delay(lv) : (s.delay || 500);
  p.skillReadyAt = G.time + delay / 1000;
  shout(`${s.name}!!`);
  p.atkAnim = 1;
  if (tgt) p.facing = tgt.x >= p.x ? 1 : -1;
  Sound.play('skill');

  switch (id) {
    case 'first_aid': healPlayer(5); addFx({ type: 'heal', ref: p, dur: 1 }); break;
    case 'heal': {
      const amt = Math.floor((p.baseLv + p.d.int) / 8) * (4 + 8 * lv);
      if (tgt) { damageMob(tgt, Math.max(1, Math.floor(amt / 2 * elemMod('holy', tgt.def.element))), { color: '#fff6a0' }); addFx({ type: 'holy', ref: tgt, dur: 0.5 }); }
      else { healPlayer(amt); addFx({ type: 'heal', ref: p, dur: 1.1 }); Sound.play('heal'); }
      break;
    }
    case 'bash':
      applyHit(tgt, physHit(tgt, 1 + 0.3 * lv, { skill: true, hitBonus: 5 * lv }));
      addFx({ type: 'bash', x: tgt.x, y: tgt.y - 0.5, dur: 0.35 });
      break;
    case 'magnum_break': {
      addFx({ type: 'firering', x: p.x, y: p.y, dur: 0.55, r: 2.5 });
      for (const m of G.mobs) {
        if (m.dead || U.dist(m.x, m.y, p.x, p.y) > 2.5) continue;
        applyHit(m, physHit(m, 1 + 0.2 * lv, { skill: true, element: 'fire', hitBonus: 10 * lv }));
        if (!m.dead && !m.def.boss) knockback(m, p.x, p.y, 2);
      }
      break;
    }
    case 'fire_bolt': case 'cold_bolt': case 'lightning_bolt': case 'soul_strike': case 'holy_light': case 'frost_diver': {
      const n = s.hits(lv);
      let mult = s.mult(lv);
      if (id === 'soul_strike' && tgt.def.element === 'undead') mult *= 1 + 0.05 * lv;
      const fxType = { fire_bolt: 'firebolt', cold_bolt: 'coldbolt', lightning_bolt: 'lightning', soul_strike: 'soul', holy_light: 'holy', frost_diver: 'frost' }[id];
      for (let i = 0; i < n; i++) {
        later(i * 0.16, () => {
          if (tgt.dead) return;
          const hit = () => {
            if (tgt.dead) return;
            damageMob(tgt, magicHit(tgt, mult, s.element).dmg, { element: s.element, color: '#ffffff' });
            if (id === 'frost_diver' && !tgt.dead && !tgt.def.boss && U.chance((35 + 3 * lv) / 100)) {
              tgt.frozenUntil = G.time + 3 * lv; tgt.path = []; tgt.moving = false;
              addFloater(tgt.x, tgt.y - 1.5, 'Frozen!', '#a0e8ff');
            }
          };
          if (fxType === 'soul' || fxType === 'frost') addFx({ type: fxType, sx: p.x, sy: p.y - 0.8, ref: tgt, dur: Math.max(0.1, U.dist(p.x, p.y, tgt.x, tgt.y) / 14), onHit: hit });
          else addFx({ type: fxType, ref: tgt, dur: 0.28, onHit: hit });
          Sound.play(fxType === 'lightning' ? 'zap' : 'magic');
        });
      }
      break;
    }
    case 'double_strafe':
      for (let i = 0; i < 2; i++) later(i * 0.12, () => {
        if (tgt.dead) return;
        addFx({ type: 'arrow', sx: p.x, sy: p.y - 0.6, ref: tgt, dur: Math.max(0.08, U.dist(p.x, p.y, tgt.x, tgt.y) / 20), big: true,
          onHit: () => applyHit(tgt, physHit(tgt, 1 + 0.1 * lv, { skill: true })) });
        Sound.play('bow');
      });
      break;
    case 'arrow_shower': {
      const cx = tgt.x, cy = tgt.y;
      addFx({ type: 'shower', x: cx, y: cy, dur: 0.45, r: 1.8 });
      later(0.3, () => {
        for (const m of G.mobs) {
          if (m.dead || U.dist(m.x, m.y, cx, cy) > 1.8) continue;
          applyHit(m, physHit(m, 0.8 + 0.05 * lv, { skill: true }));
          if (!m.dead && !m.def.boss) knockback(m, p.x, p.y, 1);
        }
      });
      break;
    }
    case 'envenom': {
      const r = physHit(tgt, 1, { skill: true, element: 'poison', flatAtk: 15 * lv });
      applyHit(tgt, r, { color: '#d0a0ff' });
      if (!r.miss && !tgt.dead && !tgt.def.boss && tgt.def.element !== 'undead' && U.chance((10 + 4 * lv) / 100)) {
        tgt.poisonUntil = G.time + 10; tgt.poisonTick = G.time + 1;
        addFloater(tgt.x, tgt.y - 1.5, 'Poisoned!', '#c080ff');
      }
      break;
    }
    case 'steal': {
      aggroMob(tgt);
      if (tgt.stolen) { UI.msg('มอนสเตอร์ตัวนี้ถูกขโมยไปแล้ว', 'err'); break; }
      const chance = (10 + 6 * lv + (p.d.dex - tgt.def.lv) / 2) / 100;
      const pool = tgt.def.drops.filter(([iid]) => ITEMS[iid].type !== 'card');
      if (pool.length && U.chance(chance)) {
        const [iid] = U.pick(pool);
        tgt.stolen = true;
        addItem(iid, 1);
        addFloater(tgt.x, tgt.y - 1.5, 'Steal!', '#ffd070');
      } else addFloater(tgt.x, tgt.y - 1.5, 'Failed', '#c0c0c0');
      break;
    }
    case 'increase_agi': case 'blessing': case 'improve_concentration': {
      const dur = { increase_agi: 60 + 20 * lv, blessing: 40 + 20 * lv, improve_concentration: 40 + 20 * lv }[id];
      p.buffs[id] = { lv, until: G.time + dur };
      recalc();
      addFx({ type: 'buff', ref: p, dur: 1, color: s.icon });
      Sound.play('buff');
      break;
    }
  }
  if (s.chain && tgt && !tgt.dead) { p.target = tgt; p.nextAttack = Math.max(p.nextAttack, G.time + 0.35); }
}
function knockback(m, fx, fy, n) {
  const dx = m.x - fx, dy = m.y - fy, d = Math.hypot(dx, dy) || 1;
  for (let i = n; i > 0; i--) {
    const nx = m.x + dx / d * i, ny = m.y + dy / d * i;
    if (G.map.walkable(Math.floor(nx), Math.floor(ny))) { m.x = Math.floor(nx) + 0.5; m.y = Math.floor(ny) + 0.5; m.path = []; return; }
  }
}

// ------------------------------------------------------------
//  อาชีพ
// ------------------------------------------------------------
function changeJob(job) {
  const p = G.player;
  p.job = job; p.jobLv = 1; p.jobExp = 0;
  const starter = { swordman: 'sword', mage: 'rod', archer: 'bow', acolyte: 'club', thief: 'main_gauche' }[job];
  addItem(starter, 1);
  unequipInvalid();
  const e = p.inventory.find(x => x.id === starter);
  if (e) equipItem(e, true);
  if (job === 'mage' || job === 'acolyte') addItem('blue_potion', 3);
  recalc();
  p.hp = p.d.maxHp; p.sp = p.d.maxSp;
  addFx({ type: 'levelup', ref: p, dur: 2.5, job: true });
  addFloater(p.x, p.y - 1.5, `${JOBS[job].name}!`, '#ffe36a', true);
  UI.announce(`🎉 ${p.name} ได้เปลี่ยนอาชีพเป็น ${JOBS[job].name} (${JOBS[job].thai}) แล้ว!`);
  Sound.play('levelup');
  saveGame();
}
function resetSkills() {
  const p = G.player;
  let pts = 0;
  for (const id in p.skills) {
    if (SKILLS[id].noLearn) continue;
    if (id === 'basic_skill' && p.job !== 'novice') continue;
    pts += p.skills[id]; delete p.skills[id];
  }
  p.skillPoints += pts;
  p.hotbar = p.hotbar.map(h => (h && h.t === 'skill' && !p.skills[h.id] ? null : h));
  for (const k in p.buffs) delete p.buffs[k];
  recalc();
  return pts;
}
function resetStats() {
  const p = G.player;
  let pts = 0;
  for (const s in p.stats) { for (let v = 1; v < p.stats[s]; v++) pts += statCost(v); p.stats[s] = 1; }
  p.statPoints += pts;
  recalc();
  unequipInvalid();
  return pts;
}

// ------------------------------------------------------------
//  อัปเดตในแต่ละเฟรม
// ------------------------------------------------------------
function updateGame(dt) {
  G.time += dt;
  const p = G.player;
  // ตัวจับเวลา
  if (G.timers.length) {
    const due = G.timers.filter(t => t.at <= G.time);
    G.timers = G.timers.filter(t => t.at > G.time);
    for (const t of due) t.fn();
  }
  updatePlayer(dt);
  for (const m of G.mobs) updateMob(m, dt);
  G.mobs = G.mobs.filter(m => !(m.dead && m.deathT > 0.8));
  // เกิดใหม่
  for (let i = G.respawns.length - 1; i >= 0; i--) {
    if (G.respawns[i].at <= G.time) { spawnMob(G.respawns[i].id); G.respawns.splice(i, 1); }
  }
  const mvp = G.map.def.mvp;
  if (mvp && G.mvpNext[G.map.id] && G.time >= G.mvpNext[G.map.id] && !G.mobs.some(m => m.isMvp)) {
    G.mvpNext[G.map.id] = 0;
    spawnMvp(mvp);
  }
  // ไอเทมบนพื้นหายไปหลัง 60 วิ
  G.drops = G.drops.filter(d => G.time - d.born < 60);
  // เอฟเฟกต์
  for (const f of G.fx) {
    f.t += dt;
    if (f.onHit && f.t >= f.dur) { const fn = f.onHit; f.onHit = null; fn(); }
  }
  G.fx = G.fx.filter(f => f.t < f.dur + (f.linger || 0));
  for (const f of G.floaters) f.t += dt;
  G.floaters = G.floaters.filter(f => f.t < f.dur);
  if (p.speech && p.speech.until < G.time) p.speech = null;
}

function updatePlayer(dt) {
  const p = G.player;
  p.atkAnim = Math.max(0, p.atkAnim - dt * 4);
  p.hurtFlash = Math.max(0, (p.hurtFlash || 0) - dt);
  if (p.dead) { p.moving = false; return; }
  // บัฟหมดเวลา
  let changed = false;
  for (const k in p.buffs) if (p.buffs[k].until <= G.time) { delete p.buffs[k]; changed = true; UI.msg(`${SKILLS[k].name} หมดฤทธิ์แล้ว`, 'info'); }
  if (changed) recalc();
  // ฟื้นฟู
  const moving = p.path.length > 0;
  p.hpTimer += dt; p.spTimer += dt;
  const hpInt = p.sitting ? 3 : 6, spInt = p.sitting ? 4 : 8;
  if (p.hpTimer >= hpInt) {
    p.hpTimer = 0;
    if (!moving || p.sitting) {
      const hl = skillLv('hp_recovery');
      const amt = Math.max(1, Math.floor(p.d.maxHp / 200)) + Math.floor(p.d.vit / 5) + hl * 5 + Math.floor(p.d.maxHp * 0.002 * hl);
      p.hp = Math.min(p.d.maxHp, p.hp + amt);
    }
  }
  if (p.spTimer >= spInt) {
    p.spTimer = 0;
    const sl = skillLv('sp_recovery');
    const amt = 1 + Math.floor(p.d.maxSp / 100) + Math.floor(p.d.int / 6) + sl * 3 + Math.floor(p.d.maxSp * 0.002 * sl);
    p.sp = Math.min(p.d.maxSp, p.sp + amt);
  }
  if (p.cast) {
    p.moving = false;
    if (p.cast.target && p.cast.target.dead) { p.cast = null; return; }
    if (G.time >= p.cast.end) { const c = p.cast; p.cast = null; executeSkill(c.id, c.lv, c.target); }
    return;
  }
  // เดินเข้าระยะเพื่อใช้สกิล
  if (p.skillIntent) {
    const si = p.skillIntent, t = si.tgt;
    if (t.dead) p.skillIntent = null;
    else {
      const range = skillRange(SKILLS[si.id]);
      const dist = U.dist(p.x, p.y, t.x, t.y);
      if (dist <= range + 0.3 && (range <= 2 || lineOfSight(G.map, p.x, p.y, t.x, t.y))) { p.path = []; p.skillIntent = null; beginSkill(si.id, si.lv, t); return; }
      if (G.time >= p.repathAt) { p.path = findPath(G.map, Math.floor(p.x), Math.floor(p.y), Math.floor(t.x), Math.floor(t.y), 1500); p.repathAt = G.time + 0.35; }
    }
  }
  // โจมตีเป้าหมาย
  if (p.target) {
    const m = p.target;
    if (m.dead || !G.mobs.includes(m)) p.target = null;
    else {
      const dist = U.dist(p.x, p.y, m.x, m.y);
      const inRange = dist <= p.d.range + 0.3 && (!p.d.ranged || lineOfSight(G.map, p.x, p.y, m.x, m.y));
      if (inRange) {
        p.path = [];
        p.facing = m.x >= p.x ? 1 : -1;
        if (G.time >= p.nextAttack) playerAttack(m);
      } else if (G.time >= p.repathAt) {
        p.path = findPath(G.map, Math.floor(p.x), Math.floor(p.y), Math.floor(m.x), Math.floor(m.y), 1500);
        p.repathAt = G.time + 0.3;
      }
    }
  }
  if (p.pickTarget) {
    const d = p.pickTarget;
    if (!G.drops.includes(d)) p.pickTarget = null;
    else if (U.dist(p.x, p.y, d.x, d.y) <= 1.1) { p.path = []; p.pickTarget = null; pickUp(d); }
    else if (!p.path.length) p.path = findPath(G.map, Math.floor(p.x), Math.floor(p.y), Math.floor(d.x), Math.floor(d.y));
  }
  if (p.npcTarget) {
    const n = p.npcTarget;
    if (U.dist(p.x, p.y, n.x + 0.5, n.y + 0.5) <= 2.0) {
      p.path = []; p.npcTarget = null;
      p.facing = n.x + 0.5 >= p.x ? 1 : -1;
      NPC.talk(n);
    } else if (!p.path.length) {
      p.path = findPath(G.map, Math.floor(p.x), Math.floor(p.y), n.x, n.y + 1);
      if (!p.path.length) p.npcTarget = null;
    }
  }
  moveEntity(p, dt, p.d.speed);
  if (p.moving) p.sitting = false;
  // พิษ
  if (p.poisonUntil > G.time && G.time >= (p.poisonTick || 0)) {
    p.poisonTick = G.time + 1.5;
    if (p.hp > p.d.maxHp * 0.25) damagePlayer(Math.max(1, Math.floor(p.d.maxHp * 0.015)), '#c080ff');
  }
  // วาร์ปพอร์ทัล
  const portal = G.map.portalAt(Math.floor(p.x), Math.floor(p.y));
  if (portal) {
    const td = MAP_DEFS[portal.to];
    const a = PORTAL_SIDE[portal.toSide](td.w, td.h);
    changeMap(portal.to, a.ax + 0.5, a.ay + 0.5);
  }
}

function updateMob(m, dt) {
  const p = G.player, md = m.def;
  if (m.dead) { m.deathT += dt; return; }
  m.hitFlash = Math.max(0, m.hitFlash - dt);
  m.atkAnim = Math.max(0, m.atkAnim - dt * 3);
  if (m.poisonUntil > G.time && G.time >= m.poisonTick) {
    m.poisonTick = G.time + 1;
    const dmg = Math.max(1, Math.floor(m.maxHp * 0.015));
    if (m.hp - dmg >= 1) { m.hp -= dmg; addFloater(m.x, m.y - 1, dmg, '#c080ff'); }
  }
  if (m.frozenUntil > G.time) { m.moving = false; return; }
  const alive = !p.dead;
  const dist = U.dist(m.x, m.y, p.x, p.y);
  if (m.state !== 'chase' && md.aggro && alive && dist < 6 && G.map.def.kind !== 'town') {
    m.state = 'chase'; m.emoteUntil = G.time + 0.9; m.path = [];
  }
  if (m.state === 'chase') {
    if (!alive || dist > 16) { m.state = 'idle'; m.path = []; m.moving = false; return; }
    // สกิลบอส
    if (md.boss && G.time >= m.nextBossSkill && dist < 8) {
      m.nextBossSkill = G.time + U.rand(8, 12);
      bossSkill(m);
    }
    if (dist <= (md.range || 1) + 0.5) {
      m.path = []; m.moving = false;
      m.facing = p.x >= m.x ? 1 : -1;
      if (G.time >= m.nextAtk) mobAttack(m);
    } else {
      if (G.time >= m.repathAt || !m.path.length) {
        m.path = findPath(G.map, Math.floor(m.x), Math.floor(m.y), Math.floor(p.x), Math.floor(p.y), 800);
        m.repathAt = G.time + 0.5;
      }
      moveEntity(m, dt, md.speed * 1.35);
    }
  } else {
    if (m.path.length) moveEntity(m, dt, md.speed);
    else {
      m.moving = false;
      if (G.time >= m.nextWander) {
        m.nextWander = G.time + U.rand(2, 6);
        const tx = Math.floor(m.x) + U.randi(-4, 4), ty = Math.floor(m.y) + U.randi(-4, 4);
        if (G.map.walkable(tx, ty) && !G.map.portalAt(tx, ty)) m.path = findPath(G.map, Math.floor(m.x), Math.floor(m.y), tx, ty, 200);
      }
    }
  }
}

function bossSkill(m) {
  const p = G.player;
  if (m.def.id === 'angeling') {
    const amt = Math.floor(m.maxHp * 0.08);
    m.hp = Math.min(m.maxHp, m.hp + amt);
    addFloater(m.x, m.y - 2, `+${amt}`, '#70ff70', true);
    addFx({ type: 'heal', ref: m, dur: 1.2 });
    UI.msg('Angeling ใช้ Heal!', 'mvp');
  } else {
    addFx({ type: 'warnring', x: m.x, y: m.y, dur: 1.0, r: 3 });
    UI.msg(`${m.def.name} กำลังร่ายเวทไฟ! ถอยออกมา!`, 'mvp');
    later(1.0, () => {
      if (m.dead) return;
      addFx({ type: 'firering', x: m.x, y: m.y, dur: 0.6, r: 3 });
      if (!p.dead && U.dist(m.x, m.y, p.x, p.y) <= 3) {
        const dmg = Math.max(1, Math.round(U.randi(m.def.atk[0], m.def.atk[1]) * 1.3 * (1 - p.d.mdef / 100) - p.d.softMdef));
        damagePlayer(dmg, '#ff8040');
      }
    });
  }
}
