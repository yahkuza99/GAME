'use strict';
// ============================================================
//  แกนหลักของเกม: ผู้เล่น สเตตัส การต่อสู้ มอนสเตอร์ สกิล ไอเทม
// ============================================================

const G = {
  time: 0, map: null, mapCache: {}, player: null,
  mobs: [], drops: [], npcs: [], fx: [], floaters: [], timers: [], respawns: [], allies: [], traps: [],
  mvpNext: {}, pendingSkill: null, hover: null, uid: 1, started: false,
};
const SAVE_KEY = 'ragnarok_web_save_v2';
const SAVE_FIELDS = ['pvp', 'mvpAt', 'job1Lv', 'name', 'gender', 'hair', 'job', 'baseLv', 'jobLv', 'baseExp', 'jobExp', 'stats', 'statPoints', 'skillPoints',
  'skills', 'zeny', 'inventory', 'equip', 'hotbar', 'potbar', 'look', 'map', 'x', 'y', 'save', 'hp', 'sp', 'options', 'uidSeq', 'quests', 'storage', 'kills', 'passives', 'bounty', 'chips', 'mastery', 'story'];

// ------------------------------------------------------------
//  สร้าง / บันทึก / โหลด
// ------------------------------------------------------------
function newPlayer(name, gender, hair, look) {
  const p = {
    name, gender, hair, look: Object.assign({ head: gender === 'f' ? 'long' : 'spiky', color: '#e6e9ef', glow: '#7ad8ff', visor: 'band' }, look || {}), job: 'novice', baseLv: 1, jobLv: 1, baseExp: 0, jobExp: 0,
    stats: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 }, statPoints: 48, skillPoints: 0,
    skills: { first_aid: 1 }, passives: [], zeny: 500, inventory: [],
    equip: { head: null, weapon: null, shield: null, armor: null, garment: null, shoes: null, acc: null },
    hotbar: [null, null, null, null, null, null, null, null], potbar: [null, null, null, null],
    map: HOME_MAP, x: 20.5, y: 24.5, save: { map: HOME_MAP, x: 20.5, y: 24.5 },
    hp: 1, sp: 1, options: { autoLoot: true, autoCounter: true, sound: true, music: false, musicVol: 0.7, expMsg: true }, uidSeq: 1, quests: { i: 0, n: 0, done: [] }, storage: [], kills: {},
  };
  initRuntime(p);
  G.player = p;
  addItem('red_potion', 15, true);
  addItem('blink_feather', 5, true);
  addItem('hearth_rune', 2, true);
  addItem('apple', 5, true);
  addItem('knife', 1, true);
  addItem('cotton_shirt', 1, true);
  equipItem(p.inventory.find(e => e.id === 'knife'), true);
  equipItem(p.inventory.find(e => e.id === 'cotton_shirt'), true);
  p.hotbar[0] = { t: 'skill', id: 'first_aid' };
  p.potbar[0] = { t: 'item', id: 'red_potion' };
  p.potbar[1] = { t: 'item', id: 'apple' };
  p.potbar[3] = { t: 'item', id: 'hearth_rune' };
  recalc();
  p.hp = p.d.maxHp; p.sp = p.d.maxSp;
  return p;
}

function initRuntime(p) {
  Object.assign(p, {
    path: [], target: null, pickTarget: null, npcTarget: null, skillIntent: null, cast: null,
    facing: 1, dir: 2, moving: false, sitting: false, dead: false, atkAnim: 0, nextAttack: 0, skillReadyAt: 0, itemReadyAt: 0,
    repathAt: 0, hpTimer: 0, spTimer: 0, buffs: {}, speech: null, poisonUntil: 0, stunUntil: 0, stealthUntil: 0, d: {},
  });
}

function saveData() {
  const p = G.player, data = {};
  for (const k of SAVE_FIELDS) data[k] = p[k];
  data.uidSeq = G.uid;
  data.savedAt = Date.now();
  return data;
}
// ------------------------------------------------------------
//  บัญชี = หลายตัวละคร (สูงสุด 5 ช่อง) เก็บรวมเป็นก้อนเดียว
//  { v: 2, active: <ช่องที่เล่นอยู่>, chars: [<เซฟตัวละคร>, ...], savedAt, job, baseLv }
//  ใช้ทั้งเซฟในเครื่อง (SAVE_KEY), บัญชีในเครื่อง (nm_char_<user>), แถวเดียวในตาราง characters และสำเนาคลาวด์
//  เซฟรุ่นเก่า (ตัวละครเดียว ไม่มี chars) ถูกห่อเป็นช่องแรกอัตโนมัติ — ไม่มีใครเสียตัวละคร
// ------------------------------------------------------------
const Acct = {
  MAX: 5,
  data: null, // ก้อนบัญชีที่ใช้อยู่ (อ่านจากที่เก็บตามโหมดตอนเข้าหน้าเลือกตัวละคร)
  isV2(d) { return !!(d && typeof d === 'object' && Array.isArray(d.chars)); },
  wrap(d) {
    if (this.isV2(d)) {
      const chars = d.chars.filter(c => c && typeof c === 'object' && c.name).slice(0, this.MAX);
      const active = Math.max(0, Math.min(chars.length - 1, (d.active | 0)));
      return { v: 2, active, chars, savedAt: d.savedAt || Math.max(0, ...chars.map(c => c.savedAt || 0)), job: d.job, baseLv: d.baseLv };
    }
    if (d && typeof d === 'object' && d.name) return { v: 2, active: 0, chars: [d], savedAt: d.savedAt || 0, job: d.job, baseLv: d.baseLv };
    return { v: 2, active: 0, chars: [] };
  },
  // รวมก้อนจากคลาวด์กับสำเนาในเครื่อง: ปกติใช้ก้อนที่ savedAt ใหม่กว่า
  // ถ้าฝั่งหนึ่งเป็นเซฟรุ่นเก่า (ตัวเดียว) → รวมตามชื่อเข้าก้อนใหม่ (ตัวที่ใหม่กว่าชนะ) ไม่ทิ้งช่องอื่น
  // คืน { acct, push } push = ต้องส่งผลลัพธ์ขึ้นคลาวด์
  merge(cloud, mirror) {
    const c = this.wrap(cloud), m = this.wrap(mirror);
    if (!mirror || !(m.chars.length || this.isV2(mirror))) return { acct: c, push: false };
    if (!cloud) return { acct: m, push: true };
    if (this.isV2(cloud) === this.isV2(mirror)) return (m.savedAt || 0) > (c.savedAt || 0) ? { acct: m, push: true } : { acct: c, push: false };
    const base = this.isV2(cloud) ? c : m, leg = (this.isV2(cloud) ? m : c).chars[0];
    let push = base === m;
    if (leg) {
      const i = base.chars.findIndex(x => x.name.toLowerCase() === leg.name.toLowerCase());
      if (i >= 0) { if ((leg.savedAt || 0) > (base.chars[i].savedAt || 0)) { base.chars[i] = leg; push = true; } }
      else if (base.chars.length < this.MAX) { base.chars.push(leg); push = true; }
    }
    if (push) base.savedAt = Math.max(c.savedAt || 0, m.savedAt || 0, Date.now());
    return { acct: base, push };
  },
  get chars() { return this.data ? this.data.chars : []; },
  current() { return this.data && this.data.chars[this.data.active] || null; },
  hasName(name, except = -1) { const n = String(name).trim().toLowerCase(); return this.chars.some((c, i) => i !== except && String(c.name).toLowerCase() === n); },
  // เซฟในเครื่อง (เล่นแบบไม่ล็อกอิน)
  readLocal() { try { return this.wrap(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch (e) { return this.wrap(null); } },
  // ก้อนล่าสุดในเครื่องนี้ตามโหมด (เซฟในเครื่อง / บัญชีในเครื่อง / สำเนาคลาวด์)
  stored() {
    if (Online.loggedIn) return Online.lsGet(Online.local ? Online.LS.char(Online.username) : Online.mirrorKey(), null);
    try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; }
  },
  // เปิดหลายแท็บเล่นคนละตัวในบัญชีเดียวกัน: เขียนเฉพาะช่องของตัวที่เล่นอยู่ลงก้อนล่าสุด ไม่ทับช่องอื่นด้วยข้อมูลเก่า
  withStored(a) {
    const me = a.chars[a.active], raw = me && this.stored();
    if (!raw) return a;
    const s = this.wrap(raw), n = String(me.name).toLowerCase();
    let i = s.chars.findIndex(c => String(c.name).toLowerCase() === n);
    if (i < 0) { if (s.chars.length >= this.MAX) return a; i = s.chars.length; }
    s.chars[i] = me; s.active = i;
    return s;
  },
  // เขียนก้อนบัญชีลงที่เก็บตามโหมด (คลาวด์/บัญชีในเครื่อง/เซฟในเครื่อง)
  // exact = เขียนตามนี้ทั้งก้อน (ลบ/ย้ายตัวละคร) • ปกติ = รวมกับก้อนล่าสุดในเครื่องก่อน (ดู withStored)
  persist(immediate, exact) {
    if (!this.data) return false;
    const a = this.data = exact ? this.data : this.withStored(this.data);
    const c = a.chars[a.active];
    a.v = 2; a.savedAt = Date.now(); a.job = c ? c.job : null; a.baseLv = c ? c.baseLv : null;
    if (Online.loggedIn) { Online.queueSave(a, immediate); return true; }
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(a)); return true; } catch (e) { return false; }
  },
  remove(i) {
    const a = this.data; if (!a || !a.chars[i]) return false;
    a.chars.splice(i, 1);
    if (a.active > i || a.active >= a.chars.length) a.active = Math.max(0, a.active - 1);
    return this.persist(true, true);
  },
};

function saveGame(silent = true, immediate = false) {
  const p = G.player;
  if (!p || !G.started) return;
  const data = saveData();
  if (!Acct.data) Acct.data = Acct.wrap(null);
  const a = Acct.data;
  if (!a.chars[a.active] || a.chars[a.active].name === data.name || a.active >= a.chars.length) a.chars[a.active] = data;
  else { // ช่องที่ใช้อยู่ไม่ใช่ตัวนี้ (ไม่ควรเกิด) → หาช่องตามชื่อ ไม่เขียนทับตัวอื่น
    const i = a.chars.findIndex(c => c.name === data.name);
    if (i >= 0) { a.active = i; a.chars[i] = data; } else if (a.chars.length < Acct.MAX) { a.active = a.chars.length; a.chars.push(data); } else return;
  }
  // ล็อกอินอยู่: เซฟแยกตามบัญชี (คลาวด์ หรือช่องของบัญชีในเครื่อง) ไม่ทับเซฟแบบไม่ล็อกอิน
  const ok = Acct.persist(immediate || !silent);
  if (silent) return;
  if (Online.loggedIn) UI.msg(Online.local ? L(`บันทึกเกมของบัญชี ${Online.username} แล้ว`, `Game saved for account ${Online.username}.`) : L('บันทึกเกมลงเซิร์ฟเวอร์แล้ว', 'Game saved to the server.'), 'sys');
  else if (ok) UI.msg(L('บันทึกเกมเรียบร้อย', 'Game saved.'), 'sys');
  else UI.msg(L('บันทึกเกมไม่สำเร็จ (เบราว์เซอร์ไม่อนุญาต)', 'Save failed (blocked by the browser).'), 'err');
}
function hasSave() { return Acct.readLocal().chars.length > 0; }
// โหลดตัวละครที่เล่นล่าสุดจากเซฟในเครื่อง (ไม่ล็อกอิน)
function loadGame() {
  Acct.data = Acct.readLocal();
  return loadGameFrom(Acct.current());
}
function loadGameFrom(data) {
  if (!data || !data.name) return null;
  const p = newPlayer(data.name, data.gender, data.hair);
  for (const k of SAVE_FIELDS) if (data[k] !== undefined) p[k] = data[k];
  // ป้องกันข้อมูลเสีย
  p.equip = Object.assign({ head: null, weapon: null, shield: null, armor: null, garment: null, shoes: null, acc: null }, p.equip);
  p.inventory = (p.inventory || []).filter(e => e && ITEMS[e.id]);
  p.storage = (Array.isArray(p.storage) ? p.storage : []).filter(e => e && ITEMS[e.id] && e.qty > 0);
  for (const s in p.equip) if (p.equip[s] && !ITEMS[p.equip[s].id]) p.equip[s] = null;
  for (const e of [...Object.values(p.equip), ...p.inventory, ...p.storage]) if (e && Array.isArray(e.cards)) e.cards = e.cards.filter(c => ITEMS[c]); // ชิปที่ไม่มีแล้ว
  if (!JOBS[p.job]) p.job = 'novice';
  if (!MAP_DEFS[p.map]) { p.map = HOME_MAP; p.x = 20.5; p.y = 24.5; }
  if (!p.save || !MAP_DEFS[p.save.map]) p.save = { map: HOME_MAP, x: 20.5, y: 24.5 };
  // สกิลที่ไม่มีอยู่แล้ว (เช่น ถูกลบออกจาก data.js) คืนแต้มให้
  for (const id in p.skills) if (!SKILLS[id]) { if (!SKILLS.first_aid || id !== 'first_aid') p.skillPoints += p.skills[id]; delete p.skills[id]; }
  fixSkillPoints(p, true); // เซฟเก่าที่แต้มสกิลเกิน (แต้ม Novice ค้างข้ามอาชีพ) → ปรับให้ถูกต้อง
  // แถบสกิล (8 ช่อง) แยกจากแถบไอเทม (4 ช่อง) — เซฟเก่าที่ปนกันจะถูกย้ายไอเทมไปแถบไอเทม
  const oldBar = (p.hotbar || []).filter(h => h && ((h.t === 'skill' && SKILLS[h.id]) || (h.t === 'item' && ITEMS[h.id])));
  const hadPot = Array.isArray(data.potbar);
  p.hotbar = hadPot ? (data.hotbar || []).slice(0, 8).map(h => (h && h.t === 'skill' && SKILLS[h.id] ? h : null)) : oldBar.filter(h => h.t === 'skill').slice(0, 8);
  p.potbar = hadPot ? data.potbar.slice(0, 4).map(h => (h && h.t === 'item' && ITEMS[h.id] ? h : null)) : oldBar.filter(h => h.t === 'item').slice(0, 4);
  while (p.hotbar.length < 8) p.hotbar.push(null);
  while (p.potbar.length < 4) p.potbar.push(null);
  // เพลงปิดไว้ก่อน (เดโม) จนกว่าผู้เล่นจะเปิดเองในตั้งค่า
  if (!p.options.musicSet) p.options.music = false;
  p.look = Object.assign({ head: p.gender === 'f' ? 'long' : 'spiky', color: '#e6e9ef', glow: '#7ad8ff', visor: 'band' }, p.look && typeof p.look === 'object' ? p.look : {});
  G.uid = Math.max(G.uid, data.uidSeq || 1);
  initRuntime(p);
  recalc();
  return p;
}
// ลบตัวละครที่เล่นอยู่ (ช่องอื่นในบัญชีไม่ถูกแตะ)
function deleteSave() { if (Acct.data) Acct.remove(Acct.data.active); }

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
  // สกิลติดตัว (passive) และบัฟ — อ่านจากข้อมูลใน SKILLS
  for (const id in p.skills) {
    const sk = SKILLS[id];
    if (sk && sk.passive) add(sk.passive(p.skills[id]));
  }
  add(j.bonus); // คลาสขั้น 2: พลังตื่นแม่พิมพ์ (ATK/MATK +10%, HIT +10, MaxHP +10%)
  add(Passive.bonus(p)); // ต้นไม้พาสซีฟ
  const bf = p.buffs;
  for (const id in bf) {
    const sk = SKILLS[id];
    if (sk && sk.buff) add(sk.buff.stats(bf[id].lv));
  }

  const d = {};
  for (const s of ['str', 'agi', 'vit', 'int', 'dex', 'luk']) { d[s] = p.stats[s] + b[s]; d[s + 'Bonus'] = b[s]; }
  const wt = weaponType();
  d.ranged = wt === 'bow';
  d.statusAtk = d.ranged
    ? d.dex + Math.floor(d.dex / 10) ** 2 + Math.floor(d.str / 5) + Math.floor(d.luk / 5)
    : d.str + Math.floor(d.str / 10) ** 2 + Math.floor(d.dex / 5) + Math.floor(d.luk / 5) + (wt === 'dagger' ? Math.floor(d.agi / 3) : 0) + (jobRoot(p.job) === 'einherjar' ? Math.floor(d.vit / 2) : 0); // มีด: AGI ช่วยแรงตี • Einherjar: VIT ช่วยแรงตี (แทงค์ที่ยังตีได้)
  d.weaponAtk = weaponAtk;
  d.atkBonus = b.atk;
  const mp = 1 + (b.matkPct || 0) / 100;
  d.matkMin = Math.floor((d.int + Math.floor(d.int / 7) ** 2 + weaponMatk + b.matk) * mp);
  d.matkMax = Math.floor((d.int + Math.floor(d.int / 5) ** 2 + weaponMatk + b.matk) * mp);
  d.castMul = Math.max(0.2, 1 - (b.castPct || 0) / 100);
  d.cdCut = Math.min(35, Math.floor(d.agi / 2.5)); // AGI ลดคูลดาวน์สกิล: 2.5 AGI = 1% สูงสุด 35%
  d.regenPct = b.regenPct || 0;
  d.rage = b.rage || 0;
  d.venom = b.venom || 0;
  // ต้นไม้พาสซีฟ: ค่าเปอร์เซ็นต์ + Keystone
  d.atkPct = b.atkPct || 0; d.critMul = 1.4 + (b.critDmgPct || 0) / 100; d.leech = b.leech || 0;
  d.healPct = b.healPct || 0; d.stunRes = Math.min(90, b.stunRes || 0); d.spCostPct = Math.max(-50, b.spCostPct || 0);
  for (const ks of ['unshaken', 'phantom', 'resolute', 'bloodmagic', 'mom']) d[ks] = Passive.keystone(p, ks);
  d.def = Math.min(90, b.def); d.softDef = Math.floor(d.vit / 2);
  d.mdef = Math.min(90, b.mdef); d.softMdef = Math.floor(d.int / 2);
  d.hit = p.baseLv + d.dex + b.hit;
  d.flee = d.unshaken ? 0 : Math.floor((p.baseLv + d.agi + b.flee) * (d.phantom ? 1.5 : 1));
  if (d.phantom) { d.def = Math.floor(d.def / 2); d.softDef = Math.floor(d.softDef / 2); }
  d.pdodge = 1 + Math.floor(d.luk / 10);
  d.crit = 1 + Math.floor(d.luk * 0.3) + b.crit;
  d.maxHp = Math.floor((35 + p.baseLv * (8 + p.baseLv * 0.12) * j.hp) * (1 + d.vit / 100) * (1 + (b.hpPct || 0) / 100)) + b.hp;
  d.maxSp = Math.floor((10 + p.baseLv * 2.2 * j.sp) * (1 + d.int / 100) * (1 + (b.spPct || 0) / 100)) + b.sp;
  const base = j.aspd * (WEAPON_ASPD_MOD[wt] || 1);
  d.aspdDelay = Math.max(250, Math.floor(base * (1 - Math.min(0.72, (d.agi + d.dex / 4) / 140)) * (1 - (b.aspdPct || 0) / 100)));
  d.aspd = Math.floor(200 - d.aspdDelay / 10);
  d.range = d.ranged ? 5 + b.range : 1.5;
  d.speed = 4.6 * (1 + (b.speedPct || 0) / 100);
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
  if (jobUp) fixSkillPoints(p); // ไม่ให้แต้มเกินที่อัปได้จริง (เซฟเก่าที่ใช้แต้มยกมาไปแล้ว)
  if (p.jobLv >= jmax) p.jobExp = 0;
  Bot.onExp(bexp, jexp);
  if (p.options.expMsg) UI.msg(L(`ได้รับ ${U.fmt(bexp)} Base EXP / ${U.fmt(jexp)} Job EXP`, `Gained ${U.fmt(bexp)} Base EXP / ${U.fmt(jexp)} Job EXP`), 'exp');
  if (baseUp) {
    recalc();
    p.hp = p.d.maxHp; p.sp = p.d.maxSp;
    addFx({ type: 'levelup', ref: p, dur: 2.2 });
    addFloater(p.x, p.y - 1.4, 'LEVEL UP!', '#ffe36a', true);
    UI.msg(L(`★ Base Level เพิ่มเป็น ${p.baseLv}! ได้รับ Status Point + แต้มพาสซีฟ (กด P)`, `★ Base Lv up to ${p.baseLv}! Gained Status Points + a passive point (press P).`), 'lvl');
    Sound.play('levelup');
  }
  if (jobUp) {
    addFx({ type: 'levelup', ref: p, dur: 2.2, job: true });
    addFloater(p.x, p.y - (baseUp ? 1.9 : 1.4), 'JOB LEVEL UP!', '#9fe0ff', true);
    UI.msg(L(`★ Job Level เพิ่มเป็น ${p.jobLv}! ได้รับ Skill Point`, `★ Job Lv up to ${p.jobLv}! Gained a skill point.`), 'lvl');
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
  if (!silent) { UI.msg(L(`ได้รับ ${it.name} ${qty} ชิ้น`, `Obtained ${it.name} x${qty}`), 'item'); Bot.onItem(qty); }
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
// ---------------- คลังเก็บของ (Storage Unit) ----------------
const STORAGE_MAX = 300;
// ย้ายของระหว่างกระเป๋ากับคลัง (อุปกรณ์ย้ายทั้งชิ้นพร้อมค่าตีบวก/ชิป • ของกองรวมกันตาม id)
function moveStack(from, to, entry, qty) {
  const it = ITEMS[entry.id];
  qty = Math.min(qty || entry.qty, entry.qty);
  if (isEquipType(it)) {
    if (to.length >= STORAGE_MAX) return false;
    from.splice(from.indexOf(entry), 1); to.push(entry);
  } else {
    const ex = to.find(e => e.id === entry.id);
    if (!ex && to.length >= STORAGE_MAX) return false;
    if (ex) ex.qty += qty; else to.push({ id: entry.id, qty });
    entry.qty -= qty;
    if (entry.qty <= 0) from.splice(from.indexOf(entry), 1);
  }
  UI.dirty();
  return true;
}
function storeItem(entry, qty) { const p = G.player; if (!moveStack(p.inventory, p.storage, entry, qty)) { UI.msg(L(`คลังเต็มแล้ว (${STORAGE_MAX} ช่อง)`, `Storage is full (${STORAGE_MAX} slots).`), 'err'); return false; } return true; }
function takeItem(entry, qty) { const p = G.player; return moveStack(p.storage, p.inventory, entry, qty); }
// จัดเรียงไอเทม: รวมกองที่แยกกัน แล้วเรียงตามหมวด → ชนิดย่อย → เลเวล/ตีบวก → ชื่อ (ใช้ได้ทั้งกระเป๋าและคลัง)
const SORT_TYPE = { use: 0, weapon: 1, armor: 2, card: 3, etc: 4 };
function sortItems(list) {
  const merged = [];
  for (const e of list) {
    const it = ITEMS[e.id], plain = !isEquipType(it) && !e.refine && !(e.cards && e.cards.length);
    const into = plain && merged.find(x => x.id === e.id && !x.refine && !(x.cards && x.cards.length));
    if (into) into.qty += e.qty; else merged.push(e);
  }
  const key = e => {
    const it = ITEMS[e.id];
    const sub = it.type === 'use' ? (it.heal ? 0 : it.spHeal ? 1 : 2) : isEquipType(it) ? EQUIP_SLOTS.indexOf(it.type === 'weapon' ? 'weapon' : it.slot) : it.type === 'card' ? EQUIP_SLOTS.indexOf(it.slot) : 0;
    return [SORT_TYPE[it.type] ?? 9, sub, it.type === 'etc' ? -(it.price || 0) : (it.heal ? it.heal[0] : it.spHeal ? it.spHeal[0] : -(it.lv || 0)), -(e.refine || 0), it.name];
  };
  merged.sort((a, b) => { const x = key(a), y = key(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1; return 0; });
  list.splice(0, list.length, ...merged);
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
  if (!canJobUse(it.jobs, p.job)) return say(L(`อาชีพ ${JOBS[p.job].name} ไม่สามารถสวมใส่ ${it.name} ได้`, `${JOBS[p.job].name} cannot equip ${it.name}.`));
  if (it.lv && p.baseLv < it.lv) return say(L(`ต้องมี Base Level ${it.lv} ขึ้นไป`, `Requires Base Lv ${it.lv} or higher.`));
  if (it.slot === 'shield' && weaponType() === 'bow') return say(L('ไม่สามารถใช้โล่คู่กับธนูได้', 'Shields cannot be used with a bow.'));
  return true;
}
function equipItem(entry, silent) {
  const p = G.player;
  if (!entry) return;
  const it = ITEMS[entry.id];
  if (!isEquipType(it) || !canEquip(it, !silent)) return;
  if (it.wtype === 'bow' && p.equip.shield) unequip('shield', true);
  const pv = silent ? null : previewEquip(entry);
  if (p.equip[it.slot]) unequip(it.slot, true);
  const i = p.inventory.indexOf(entry);
  if (i >= 0) p.inventory.splice(i, 1);
  p.equip[it.slot] = entry;
  recalc();
  if (!silent) { UI.msg(L(`สวมใส่ ${itemDisplayName(entry)}${pv && pv.diff.length ? ` (${fmtDiff(pv.diff)})` : ''}`, `Equipped ${itemDisplayName(entry)}${pv && pv.diff.length ? ` (${fmtDiff(pv.diff)})` : ''}`), 'sys'); Sound.play('equip'); }
}
// เทียบค่าสุดท้ายของตัวละคร ถ้าเปลี่ยนไปใส่ entry (จำลองแล้วคืนค่าเดิม ไม่กระทบเกม)
const CMP_STATS = [
  ['ATK', d => d.statusAtk + d.weaponAtk + d.atkBonus], ['MATK', d => d.matkMax], ['DEF', d => d.def], ['MDEF', d => d.mdef],
  ['HP', d => d.maxHp], ['SP', d => d.maxSp], ['HIT', d => d.hit], ['FLEE', d => d.flee], ['CRIT', d => d.crit], ['ASPD', d => d.aspd],
  ['STR', d => d.str], ['AGI', d => d.agi], ['VIT', d => d.vit], ['INT', d => d.int], ['DEX', d => d.dex], ['LUK', d => d.luk],
];
function statSnap(d) { const o = {}; for (const [k, f] of CMP_STATS) o[k] = f(d); return o; }
function previewEquip(entry) {
  const p = G.player, it = entry && ITEMS[entry.id];
  if (!it || !isEquipType(it)) return null;
  const save = { equip: Object.assign({}, p.equip), d: p.d, hp: p.hp, sp: p.sp, dirty: UI.isDirty };
  const before = statSnap(p.d);
  if (it.wtype === 'bow') p.equip.shield = null;
  p.equip[it.slot] = entry;
  let after;
  try { recalc(); after = statSnap(p.d); }
  finally { p.equip = save.equip; p.d = save.d; p.hp = save.hp; p.sp = save.sp; UI.isDirty = save.dirty; }
  const diff = CMP_STATS.map(([k]) => [k, after[k] - before[k], after[k]]).filter(([, dv]) => dv);
  return { before, after, diff, replaced: save.equip[it.slot] };
}
const fmtDiff = diff => diff.map(([k, dv]) => `${k} ${dv > 0 ? '+' : '−'}${U.fmt(Math.abs(dv))}`).join(' · ');
function unequip(slot, silent) {
  const p = G.player, e = p.equip[slot];
  if (!e) return;
  p.equip[slot] = null;
  p.inventory.push(e);
  recalc();
  if (!silent) UI.msg(L(`ถอด ${itemDisplayName(e)}`, `Unequipped ${itemDisplayName(e)}`), 'sys');
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
  if (it.type !== 'use') { UI.msg(L(`${it.name} เป็นของสะสม นำไปขายที่ร้านค้าได้`, `${it.name} is a collectible — sell it at a shop.`), 'info'); return; }
  if (p.dead || G.time < p.itemReadyAt) return;
  if (stunBlocked()) return;
  p.itemReadyAt = G.time + 0.12;
  if (it.heal) {
    const amt = Math.floor(U.randi(it.heal[0], it.heal[1]) * (1 + p.d.vit * 0.02));
    healPlayer(amt, it.name);
  }
  if (it.spHeal) {
    const amt = Math.floor(U.randi(it.spHeal[0], it.spHeal[1]) * (1 + p.d.int * 0.02));
    p.sp = Math.min(p.d.maxSp, p.sp + amt);
    addFloater(p.x, p.y - 1.2, `+${amt}`, '#7fb0ff');
  }
  if (it.cure && p.poisonUntil > G.time) { p.poisonUntil = 0; UI.msg(L('หายจากพิษแล้ว', 'Poison cured.'), 'sys'); }
  if (it.effect === 'fly') {
    const pos = G.map.randomWalkable();
    addFx({ type: 'warp', x: p.x, y: p.y, dur: 0.6 });
    teleportPlayer(pos.x + 0.5, pos.y + 0.5);
    addFx({ type: 'warp', x: p.x, y: p.y, dur: 0.6 });
  }
  if (it.effect === 'return') {
    addFx({ type: 'warp', x: p.x, y: p.y, dur: 0.6 });
    changeMap(p.save.map, p.save.x, p.save.y, { quiet: true });
  }
  if (it.heal || it.spHeal) Sound.play('potion'); // ใช้ปีก/บีคอนวาร์ป: ไม่มีเสียง (ยะยาสั่ง)
  removeEntry(entry, 1);
}
function usePotbar(i) { useSlot(G.player.potbar[i]); }
function useHotbar(i) { useSlot(G.player.hotbar[i]); }
function useSlot(h) {
  const p = G.player;
  if (!h || p.dead) return;
  if (h.t === 'skill') useSkill(h.id);
  else {
    const e = p.inventory.find(x => x.id === h.id);
    if (e) useItem(e); else UI.msg(L(`${ITEMS[h.id].name} หมดแล้ว`, `Out of ${ITEMS[h.id].name}.`), 'err');
  }
}

function dropItemOnGround(id, x, y, qty = 1) {
  const p = G.player;
  if (ITEMS[id] && ITEMS[id].type === 'card') {
    // การ์ดดรอป: ลำแสงทองพุ่งขึ้นฟ้า + ประกาศ
    addFx({ type: 'beam', x, y, dur: 2.6 });
    UI.announce(L(`✦ ${ITEMS[id].name} ดรอปแล้ว! ✦`, `✦ ${ITEMS[id].name} dropped! ✦`));
    Sound.play('refine_ok');
  }
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
// เอฟเฟกต์แบบภาพ (สไตล์ RO): ถ้ามี assets/fx_<ชื่อ>.webp (แถบเฟรม 240px พื้นดำ) เล่นภาพนั้นแทนเอฟเฟกต์ที่วาดด้วยโค้ด
// ชื่อ = f.skin (ชื่อ fx ของสกิล) หรือ f.type • ลูกธนู/ลูกพลังยังพุ่งแบบเดิม แล้วเล่นภาพตอนโดนเป้า
const FX_PROJECTILE = { arrow: 1, soul: 1, frost: 1 };
const FX_MIDBODY = { hit: 0.5, crit: 0.5, bash: 0.5 }; // เอฟเฟกต์ที่วางกลางตัว → ภาพยึดที่เท้า
const FX_FRAME = 0.07; // วินาทีต่อเฟรมของภาพเอฟเฟกต์
function addFx(f) {
  const key = 'fx_' + (f.skin || f.type), img = f.type !== 'sprite' && typeof Art !== 'undefined' && Art.get(key);
  if (img) {
    if (FX_PROJECTILE[f.type]) {
      const hit = f.onHit, ref = f.ref, tx = f.tx, ty = f.ty;
      f.onHit = () => { if (hit) hit(); addFx({ type: 'sprite', sprite: key, ref, x: tx, y: ty }); };
    } else {
      // เวลาที่ดาเมจเข้า (onHit) ยังเท่าเดิม แม้ภาพจะยาวกว่า
      return addFx({ type: 'sprite', sprite: key, ref: f.ref, x: f.x, y: f.y + (f.ref ? 0 : FX_MIDBODY[f.type] || 0), onHit: f.onHit, hitAt: f.dur, size: f.r ? Math.max(1, f.r / 2) : 1 });
    }
  }
  if (f.type === 'sprite') { const im = Art.get(f.sprite); f.dur = Math.max(0.2, Math.round(im.width / 240) * FX_FRAME); }
  f.t = 0; f.linger = FX_LINGER[f.type] || 0; G.fx.push(f); return f;
}
function addFloater(x, y, text, color, big) {
  const num = typeof text === 'number' || /^[+-]?\d+$/.test(String(text));
  // ข้อความ (ฮีล/ดูดเลือด/Volt/เลเวลอัป) ที่เด้งพร้อมกันตรงจุดเดียวกัน: เรียงซ้อนขึ้นไป ไม่ทับกัน
  if (!num) {
    const near = G.floaters.filter(f => !f.num && f.t < 0.6 && Math.abs(f.x - x) < 1.6 && Math.abs(f.y - y) < 1.2).length;
    y -= near * 0.42;
  }
  // ตัวเลขดาเมจแบบ RO: เด้งขึ้นแล้วตกลง ส่ายซ้ายขวาเล็กน้อย / คริ = ตัวเหลืองบนดาวแตก
  G.floaters.push({ x: x + U.rand(-0.15, 0.15), y, text: String(text), color, big, num, crit: num && big,
    vx: num ? U.rand(-45, 45) : 0, t: 0, dur: num ? (big ? 1.25 : 1.0) : (big ? 1.6 : 1.1) });
  if (num && big) R.kick(4, 0.14);
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
function changeMap(id, x, y, opts = {}) {
  const p = G.player;
  const map = getMap(id);
  G.map = map;
  p.map = id;
  teleportPlayer(x, y);
  G.mapEntry = { map: id, x, y };
  G.mobs = []; G.drops = []; G.fx = []; G.floaters = []; G.timers = []; G.respawns = []; G.traps = [];
  for (const a of G.allies) { a.x = x + 0.7; a.y = y; a.path = []; a.target = null; }
  G.npcs = (map.def.npcs || []).map(n => Object.assign({}, n));
  for (const [mid, n] of map.def.spawns) for (let i = 0; i < n; i++) spawnMob(mid);
  for (const [dx, dy] of map.def.dummies || []) { const d = spawnMob('training_dummy', { x: dx, y: dy }); d.facing = 1; d.home = { x: dx + 0.5, y: dy + 0.5 }; }
  if (map.def.mvp && mvpLeft(id) <= 0) { if (p.mvpAt) delete p.mvpAt[id]; spawnMvp(map.def.mvp); }
  UI.onMapChange(map);
  if (typeof Nav !== 'undefined') Nav.onMapChange();
  Online.joinMap(id);
  if (!opts.quiet) Sound.play('warp');
  saveGame(true, true);
}
function teleportPlayer(x, y) {
  const p = G.player;
  G.pendingSkill = null; // เปลี่ยนแมพ/วาร์ป = ยกเลิกโหมดเล็งสกิล
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
    hitFlash: 0, atkAnim: 0, stunUntil: 0, slowUntil: 0, burnUntil: 0, burnTick: 0, burnDmg: 0, poisonUntil: 0, poisonTick: 0, dead: false, deathT: 0, moving: false,
    emoteUntil: 0, stolen: false, nextBossSkill: G.time + 8,
  };
  G.mobs.push(m);
  return m;
}
// คูลดาวน์บอส: เก็บเป็นเวลาจริง (ms) ลงเซฟ → ปิดเกมเปิดใหม่ไม่รีเซ็ต ฟาร์มบอสด้วยการรีโหลดไม่ได้
function mvpLeft(mapId) {
  const at = ((G.player && G.player.mvpAt) || {})[mapId] || 0, d = MAP_DEFS[mapId], mv = d && d.mvp && MOBS[d.mvp];
  const left = Math.max(0, at - Date.now()) / 1000;
  return mv ? Math.min(left, mv.respawn / 1000) : left; // นาฬิกาเครื่องเพี้ยนไปอนาคต ไม่ทำให้บอสหายนานเกินเวลาเกิดจริง
}
function spawnMvp(id) {
  const m = spawnMob(id);
  m.isMvp = true;
  UI.announce(L(`⚠ ${MOBS[id].name} (MVP) ได้ปรากฏตัวขึ้นใน ${G.map.def.name}!`, `⚠ ${MOBS[id].name} (MVP) has appeared in ${G.map.def.name}!`));
  if (!G.fastSim) UI.splash(`mvp_${id}`, MOBS[id].name, (typeof Story !== 'undefined' && Story.mvpSub(id)) || 'MVP BOSS APPEARED');
  UI.msg(L(`[MVP] ${MOBS[id].name} ปรากฏตัวแล้ว!`, `[MVP] ${MOBS[id].name} has appeared!`), 'mvp');
  if (typeof Story !== 'undefined') Story.onMvpSpawn(id);
}

// ------------------------------------------------------------
//  การเคลื่อนที่
// ------------------------------------------------------------
function faceTo(e, tx, ty) {
  e.facing = tx >= e.x ? 1 : -1;
  if (Math.hypot(tx - e.x, ty - e.y) > 0.05) e.dir = dirFromVec(tx - e.x, ty - e.y);
}
function moveEntity(e, dt, speed) {
  let step = speed * dt;
  e.moving = false;
  while (step > 0 && e.path.length) {
    const n = e.path[0];
    const tx = n.x + 0.5, ty = n.y + 0.5;
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
    if (Math.abs(dx) > 0.05) e.facing = dx > 0 ? 1 : -1;
    if (d > 0.01) e.dir = dirFromVec(dx, dy);
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
  const crit = !d.resolute && (opts.forceCrit || (!opts.skill && U.chance(Math.max(0, d.crit - md.lv * 0.1) / 100)));
  const hitRate = U.clamp(80 + d.hit + (opts.hitBonus || 0) - md.flee, 5, 100);
  if (!crit && !opts.sureHit && !d.resolute && !U.chance(hitRate / 100)) return { miss: true };
  let atk = d.statusAtk + d.weaponAtk * (crit ? 1 : U.rand(0.8, 1.0)) + d.atkBonus + (opts.flatAtk || 0);
  if (d.rage) atk *= 1 + (1 - p.hp / d.maxHp) * d.rage / 100;
  const em = elemMod(opts.element || 'neutral', md.element);
  let dmg = atk * mult * em * (1 + d.atkPct / 100);
  if (crit) dmg *= d.critMul;
  else dmg = dmg * (1 - md.def / 100) - md.vit * 0.5 * U.rand(0.7, 1);
  return { dmg: em === 0 ? 0 : Math.max(1, Math.round(dmg)), crit, phys: true };
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
    Sound.play('miss');
    aggroMob(m);
    return;
  }
  damageMob(m, r.dmg, Object.assign({ crit: r.crit }, opts));
  // ดูดเลือด (ต้นไม้พาสซีฟ): ดาเมจกายภาพส่วนหนึ่งกลับมาเป็น HP แบบเงียบ ๆ
  const p = G.player;
  if (r.phys && p.d.leech && !p.dead && !m.def.dummy && p.hp < p.d.maxHp) {
    const amt = Math.min(p.d.maxHp - p.hp, Math.max(1, Math.round(r.dmg * (m.isPlayer ? 0.6 : 1) * p.d.leech / 100))); // PvP: คิดจากดาเมจหลังลด
    p.hp += amt;
    addFloater(p.x + 0.35, p.y - 1.5, L(`+${amt} ดูดเลือด`, `+${amt} Drain`), '#ff8fb4');
  }
}
function aggroMob(m) {
  if (m.dead) return;
  if (m.state !== 'chase') { m.state = 'chase'; m.emoteUntil = G.time + 0.9; m.path = []; }
}
function damageMob(m, dmg, opts = {}) {
  if (m.dead) return;
  if (m.isPlayer) { // PvP: ดาเมจลด 40% ให้สู้ได้นานขึ้น • คู่ต่อสู้เป็นคนหักเลือดเอง
    dmg = Math.max(1, Math.round(dmg * 0.6));
    addFloater(m.x, m.y - 1.2, dmg, opts.color || (opts.crit ? '#ffe040' : '#ffffff'), opts.crit);
    addFx({ type: opts.crit ? 'crit' : 'hit', x: m.x, y: m.y - 0.5, dur: 0.25 });
    Sound.play(opts.crit ? 'crit' : 'hit');
    Online.sendHit(m, dmg, !!opts.crit);
    return;
  }
  m.hp -= dmg;
  m.hitFlash = 0.12;
  if (m.def.dummy) { // หุ่นฝึก: จดดาเมจไว้คิด DPS และไม่มีวันตาย (เลือดเต็มใหม่เมื่อหมด)
    (m.dmgLog || (m.dmgLog = [])).push([G.time, dmg]);
    Quest.onHitDummy();
    if (m.hp <= 0) { m.hp = m.maxHp; addFloater(m.x, m.y - 1.8, 'RESET', '#9ff0ff'); }
  }
  const s = (m.def.scale || 1);
  addFloater(m.x, m.y - 0.9 * s - 0.3, dmg, opts.color || (opts.crit ? '#ffe040' : '#ffffff'), opts.crit);
  if (opts.crit) addFx({ type: 'crit', x: m.x, y: m.y - 0.5, dur: 0.35 });
  else addFx({ type: 'hit', x: m.x + U.rand(-0.2, 0.2), y: m.y - 0.5 * s + U.rand(-0.2, 0.2), dur: 0.2 });
  aggroMob(m);
  // เสียงตีโดน 1 เสียงต่อครั้ง: คริ > ตีบอส > ดาเมจแรง (≥25% เลือดเต็ม) > เสียงของท่านั้น (ฟัน/ทุบ) หรือ 'hit'
  const big = !m.def.dummy && dmg >= m.maxHp * 0.25;
  const sfx = opts.crit ? 'crit' : (m.def.boss || m.isMvp) ? 'hit_boss' : big ? 'hit_big' : opts.sfx === undefined ? 'hit' : opts.sfx;
  if (sfx) Sound.play(sfx);
  if (m.hp <= 0) killMob(m);
}
// Zeny ที่ได้ทันทีเมื่อฆ่า: ตั้งเองได้ด้วย MOBS[id].zeny = [min, max] ไม่งั้น (Lv+2) ถึง 2×(Lv+2) • MVP ×40–60
function mobZeny(d) {
  if (d.zeny) return d.zeny;
  if (d.dummy) return [0, 0];
  const b = d.lv + 2;
  return d.boss ? [b * 40, b * 60] : [b, b * 2];
}
function killMob(m) {
  const p = G.player, d = m.def;
  m.dead = true; m.deathT = 0; m.hp = 0; m.path = []; m.moving = false;
  if (p.target === m) p.target = null;
  Bot.onKill(m);
  Quest.onKill(d.id);
  Bounty.onKill(d.id);
  p.kills = p.kills || {}; p.kills[d.id] = (p.kills[d.id] || 0) + 1; // สมุดมอนสเตอร์: จำนวนที่ล่าได้
  grantChip(d, m);
  Party.shareExp(d.exp, d.jexp, d); // ไม่มีปาร์ตี้ = gainExp ตามปกติ
  const [z0, z1] = mobZeny(d), z = U.randi(z0, z1);
  if (z > 0) { p.zeny += z; addFloater(m.x, m.y - 0.5, `+${z} ${CUR}`, '#ffd34a'); UI.dirty(); }
  for (const [id, ch] of d.drops) if (U.chance(ch)) dropItemOnGround(id, m.x, m.y);
  if (m.isMvp) {
    UI.announce(L(`🏆 ${p.name} ได้ปราบ MVP ${d.name} สำเร็จ!`, `🏆 ${p.name} has slain the MVP ${d.name}!`));
    UI.msg(L(`[MVP] ยินดีด้วย! คุณได้รับรางวัล MVP`, `[MVP] Congratulations! You earned the MVP reward.`), 'mvp');
    const bonus = U.pick(['white_potion', 'blue_potion', 'yellow_potion']);
    addItem(bonus, 3);
    (p.mvpAt || (p.mvpAt = {}))[G.map.id] = Date.now() + d.respawn;
    saveGame(true);
    Sound.play('mvp');
    if (typeof Story !== 'undefined') Story.onMvpKill(d.id);
  } else {
    G.respawns.push({ id: d.id, at: G.time + U.rand(6, 14) });
  }
  Sound.play('kill');
}

// ชิปประจำมอน: ล่าครบ CHIP_KILLS ตัว (MVP ตัวแรก) ได้แน่นอน 1 ชิ้น — ไม่ต้องฟาร์มดรอป
function chipNeed(d) { return d.boss ? 1 : CHIP_KILLS; }
function grantChip(d, m) {
  const p = G.player, chip = MOB_CHIP[d.id];
  p.chips = p.chips || [];
  if (!chip || p.chips.includes(d.id) || (p.kills[d.id] || 0) < chipNeed(d)) return;
  p.chips.push(d.id); addItem(chip, 1, true);
  addFx({ type: 'beam', x: m.x, y: m.y, dur: 2.6 });
  UI.announce(L(`✦ ล่า ${d.name} ครบ ${chipNeed(d)} ตัว — ได้รับ ${ITEMS[chip].name}! ✦`, `✦ ${chipNeed(d)} ${d.name} hunted — obtained ${ITEMS[chip].name}! ✦`));
  UI.msg(L(`✦ ได้รับ ${ITEMS[chip].name} — ${ITEMS[chip].desc}`, `✦ Obtained ${ITEMS[chip].name} — ${ITEMS[chip].desc}`), 'lvl');
  Sound.play('refine_ok');
}

// สถานะผิดปกติของมอนสเตอร์: stun (มึน), slow (ช้า), burn (ไหม้), poison (พิษ)
function applyStatus(m, st, lv, lastDmg = 0) {
  if (!st || m.dead || m.isPlayer) return;
  if (m.def.boss && st.kind === 'stun') return;
  if (!U.chance(st.chance(lv) / 100)) return;
  const until = G.time + st.dur(lv);
  const at = (t, c) => addFloater(m.x, m.y - 1.5, t, c);
  if (st.kind === 'stun') { m.stunUntil = until; m.path = []; m.moving = false; at('Stun!', '#ffe080'); }
  else if (st.kind === 'slow') { m.slowUntil = until; at('Slow', '#a0e8ff'); }
  else if (st.kind === 'burn') { m.burnUntil = until; m.burnTick = G.time + 1; m.burnDmg = Math.max(1, Math.floor(lastDmg * 0.2)); at('Burn!', '#ff9040'); }
  else if (st.kind === 'poison' && m.def.element !== 'undead') { m.poisonUntil = until; m.poisonTick = G.time + 1; at('Poison!', '#c080ff'); }
}

function playerAttack(m) {
  const p = G.player;
  p.nextAttack = G.time + p.d.aspdDelay / 1000;
  p.atkAnim = 1;
  faceTo(p, m.x, m.y);
  const ambush = p.stealthUntil > G.time;
  if (ambush) { p.stealthUntil = 0; addFloater(p.x, p.y - 1.6, 'Ambush!', '#d0a0ff'); }
  const doHit = () => {
    if (m.dead) return;
    const r = physHit(m, masteryMul('attack'), { forceCrit: ambush });
    // ตีธรรมดา: ประชิด = เสียงฟัน (มีด/ดาบ/ขวาน) หรือทุบ (กระบอง/คทา/มือเปล่า) • ธนู = เสียงยิงตอนปล่อย ตอนโดนไม่ซ้อนอีก
    applyHit(m, r, { sfx: p.d.ranged ? '' : (['dagger', 'sword', 'axe'].includes(weaponType()) ? 'slash' : 'smash') });
    if (!r.miss && !m.def.dummy) addMastery('attack');
    if (!r.miss && p.d.venom && !m.def.boss) applyStatus(m, { kind: 'poison', chance: () => p.d.venom, dur: () => 8 }, 1);
  };
  if (p.d.ranged) {
    addFx({ type: 'arrow', sx: p.x, sy: p.y - 0.6, ref: m, dur: Math.max(0.08, U.dist(p.x, p.y, m.x, m.y) / 18), onHit: doHit });
    Sound.play('bow');
  } else {
    doHit();
  }
}

function mobAttack(m) {
  const p = G.player, d = p.d, md = m.def;
  m.nextAtk = G.time + (md.atkDelay || 1.7);
  m.atkAnim = 1;
  faceTo(m, p.x, p.y);
  autoCounter(m);
  if (U.chance(d.pdodge / 100)) { addFloater(p.x, p.y - 1.2, 'Lucky!', '#a0ffa0'); return; }
  const hitRate = U.clamp(80 + md.hit - d.flee, 5, 95);
  if (!U.chance(hitRate / 100)) { addFloater(p.x, p.y - 1.2, 'Miss', '#a0c0ff'); return; }
  let dmg = U.randi(md.atk[0], md.atk[1]);
  dmg = Math.max(1, Math.round(dmg * (1 - d.def / 100) - d.softDef * U.rand(0.7, 1)));
  damagePlayer(dmg);
  if (md.stun && !d.unshaken && U.chance(md.stun[0] / 100 * (1 - Math.min(0.9, d.vit / 100)) * (1 - d.stunRes / 100))) stunPlayer(md.stun[1]);
}
// โจมตีกลับอัตโนมัติ (ตั้งค่าได้): ยืนเฉย ๆ / นั่งพัก แล้วโดนตี → หันไปตีตัวที่ตีเรา
// ไม่แย่งการควบคุม: ถ้ากำลังเดิน, นำทาง, คุย NPC, ร่ายสกิล, มีเป้าอยู่แล้ว หรือบอททำงานอยู่ จะไม่ทำ
function autoCounter(m) {
  const p = G.player;
  if (p.options.autoCounter === false || p.dead || m.dead || isStunned()) return;
  if ((p.target && !p.target.dead) || p.npcTarget || p.pickTarget || p.cast || p.skillIntent || p.path.length) return;
  if (Bot.on || (typeof Nav !== 'undefined' && Nav.target) || NPC.busy) return;
  p.sitting = false; p.target = m; p.repathAt = 0;
}
// มึน: ล้มลงกับพื้น ขยับ/ตี/ใช้สกิล/ใช้ของไม่ได้จนกว่าจะลุก (VIT สูงต้านได้)
function stunPlayer(dur) {
  const p = G.player;
  if (p.dead || p.stunUntil > G.time) return;
  p.stunAt = G.time; p.stunUntil = G.time + dur;
  p.path = []; p.moving = false; p.sitting = false; p.cast = null;
  addFloater(p.x, p.y - 1.6, 'Stun!', '#ffe080');
  Sound.play('stun');
}
function isStunned() { return G.player.stunUntil > G.time; }
// กดใช้ของ/สกิลตอนมึน: แจ้งครั้งเดียวต่อการมึน (บอทกดซ้ำทุกเฟรมจะได้ไม่ท่วมแชต)
function stunBlocked() {
  const p = G.player;
  if (!isStunned()) return false;
  if (p.stunMsg !== p.stunAt) { p.stunMsg = p.stunAt; UI.msg(L('มึนอยู่ ทำอะไรไม่ได้ชั่วครู่', 'You are stunned and cannot act!'), 'err'); }
  return true;
}
function damagePlayer(dmg, color = '#ff5050') {
  const p = G.player;
  if (p.dead) return;
  if (p.d.mom) { const s = Math.min(Math.floor(p.sp), Math.floor(dmg * 0.3)); p.sp -= s; p.hp -= dmg - s; if (s > 0) addFloater(p.x + 0.4, p.y - 1.7, L(`SP ดูดซับ ${s}`, `SP absorbed ${s}`), '#8fb8ff'); } // Mind over Matter
  else p.hp -= dmg;
  p.sitting = false;
  addFloater(p.x, p.y - 1.2, dmg, color);
  p.hurtFlash = 0.15;
  Sound.play('hurt');
  if (p.hp <= 0) playerDie();
}
// label = ที่มาของการฟื้น HP (ชื่อไอเทม/สกิล/พาสซีฟ) โชว์ต่อท้ายตัวเลข ให้รู้ว่าเลือดเด้งเพราะอะไร
function healPlayer(amt, label) {
  const p = G.player;
  p.hp = Math.min(p.d.maxHp, p.hp + amt);
  addFloater(p.x, p.y - 1.2, `+${amt}${label ? ' ' + label : ''}`, '#70ff70');
}
function playerDie() {
  const p = G.player;
  p.hp = 0; p.dead = true; p.path = []; p.target = null; p.cast = null; p.skillIntent = null; p.sitting = false; p.stunUntil = 0;
  G.pendingSkill = null;
  let lost = 0;
  if (G.map.def.pvp) { Online.onPvpDeath(); UI.showDeath(0); Sound.play('die'); Bot.onDeath(); return; } // ลานประลอง: ไม่เสีย EXP
  if (p.job !== 'novice' && p.baseLv < MAX_BASE_LV) {
    lost = Math.floor(baseExpNeed(p.baseLv) * 0.01);
    p.baseExp = Math.max(0, p.baseExp - lost);
  }
  for (const m of G.mobs) if (m.state === 'chase') { m.state = 'idle'; m.path = []; }
  UI.msg(L(`คุณล้มลง!${lost ? ` เสีย Base EXP ${U.fmt(lost)}` : ''}`, `You have fallen!${lost ? ` Lost ${U.fmt(lost)} Base EXP.` : ''}`), 'err');
  Sound.play('die');
  Bot.onDeath();
  UI.showDeath(lost);
}
// here = เกิดในแมพเดิม (ที่จุดที่เดินเข้าแมพนี้มา) • ไม่งั้นกลับจุดเซฟ
function respawnPlayer(here) {
  const p = G.player;
  UI.hideDeath();
  p.dead = false;
  p.hp = Math.max(1, Math.floor(p.d.maxHp * (p.job === 'novice' ? 1 : 0.5)));
  p.sp = Math.max(p.sp, Math.floor(p.d.maxSp * 0.3));
  p.poisonUntil = 0;
  if (here && G.mapEntry && G.mapEntry.map === G.map.id) {
    changeMap(G.map.id, G.mapEntry.x, G.mapEntry.y);
    UI.msg(L('ฟื้นคืนชีพในแมพเดิมแล้ว', 'Revived on the same map.'), 'info');
  } else changeMap(p.save.map, p.save.x, p.save.y);
}

// ------------------------------------------------------------
//  สกิล
// ------------------------------------------------------------
// ความชำนาญ (ยิ่งเล่นยิ่งเก่ง): สกิลกดใช้และการโจมตีปกติสะสมจำนวนครั้งที่ใช้ → Lv ความชำนาญสูงสุด 10
// สกิล: แรงขึ้น 3%/Lv (ทั้งดาเมจและฮีล) ใช้ครบ 660 ครั้งได้ Lv 10 • โจมตีปกติ: แรงขึ้น 2%/Lv ตีโดนครบ 6,600 ครั้งได้ Lv 10
const MASTERY_MAX = 10;
function masteryNeed(lv, id) { return Math.round((id === 'attack' ? 120 : 12) * lv * (lv + 1) / 2); } // ยอดสะสมที่ต้องมีเพื่อถึง lv
function masteryUses(id) { return (G.player.mastery || {})[id] || 0; }
function masteryLv(id) { const u = masteryUses(id); let lv = 0; while (lv < MASTERY_MAX && u >= masteryNeed(lv + 1, id)) lv++; return lv; }
function masteryPct(id) { return masteryLv(id) * (id === 'attack' ? 2 : 3); }
function masteryMul(id) { return 1 + masteryPct(id) / 100; }
function addMastery(id) {
  const p = G.player; p.mastery = p.mastery || {};
  const before = masteryLv(id);
  p.mastery[id] = (p.mastery[id] || 0) + 1;
  const now = masteryLv(id);
  if (now > before) {
    const name = id === 'attack' ? L('การโจมตีปกติ', 'Basic Attack') : SKILLS[id].name;
    addFloater(p.x, p.y - 1.9, `MASTERY ${now}!`, '#9ff0ff', true);
    UI.msg(L(`★ ความชำนาญ ${name} เพิ่มเป็น Lv ${now} — แรงขึ้น +${masteryPct(id)}%`, `★ ${name} Mastery reached Lv ${now} — power +${masteryPct(id)}%`), 'lvl');
    Sound.play('buff');
  }
  UI.dirty();
}
function skillCost(id, lv) {
  const s = SKILLS[id], d = G.player.d;
  return s.sp ? Math.max(1, Math.round(s.sp(lv) * (1 + ((d && d.spCostPct) || 0) / 100))) : 0;
}
// Blood Circuit (ต้นไม้พาสซีฟ): จ่ายค่าสกิลด้วย HP แทน SP (ต้องเหลือ HP มากกว่าค่าสกิล)
function canPaySkill(cost) { const p = G.player; return p.d.bloodmagic ? p.hp > cost : p.sp >= cost; }
function paySkill(cost) { const p = G.player; if (p.d.bloodmagic) p.hp -= cost; else p.sp -= cost; }
function skillReqMet(id) {
  const req = SKILLS[id].req;
  if (!req) return true;
  return Object.keys(req).every(k => skillLv(k) >= req[k]);
}
function learnableSkills() {
  const p = G.player;
  // คลาสขั้น 2: ใช้แต้มกับสกิลของคลาสแรกที่ยังไม่เต็มได้ด้วย
  return jobLine(p.job).flatMap(j => JOBS[j].skills).filter(id => SKILLS[id] && !SKILLS[id].noLearn);
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
  if (s.type === 'passive') { UI.msg(L(`${s.name} เป็นสกิลติดตัว ทำงานอัตโนมัติ`, `${s.name} is a passive skill and works automatically.`), 'info'); return; }
  if (p.cast) return;
  if (stunBlocked()) return;
  if (s.bow && weaponType() !== 'bow') { UI.msg(L('สกิลนี้ต้องสวมธนู', 'This skill requires a bow.'), 'err'); return; }
  if (s.heal) {
    // สกิลฮีลใช้กับมอนสเตอร์อมตะที่เมาส์ชี้อยู่ = ทำความเสียหาย
    const h = !Bot.on && G.hover && G.hover.kind === 'mob' ? G.hover.ref : null; // บอทฮีลตัวเองเสมอ (ไม่ไปตีอมตะที่เมาส์บังเอิญชี้)
    beginSkill(id, lv, h && h.def.element === 'undead' ? h : null);
    return;
  }
  if (s.target === 'enemy') {
    const cur = p.target && !p.target.dead ? p.target : (G.hover && G.hover.kind === 'mob' ? G.hover.ref : null);
    // แบบ RO: กดสกิล → โหมดเล็ง → คลิก/แตะมอน • กดปุ่มเดิมซ้ำ = ใช้กับเป้าปัจจุบัน (หรือตัวใกล้สุด)
    if (p.options.skillAim !== false && G.pendingSkill !== id) {
      if (G.time < p.skillReadyAt) { skillDelayHint(); return; }
      if (skillCdLeft(id) > 0) { skillCdHint(id); return; }
      G.pendingSkill = id; G.pendingAt = G.time; Sound.play('click');
      return;
    }
    let tgt = cur;
    if (!tgt && (Pad.enabled() || G.pendingSkill === id)) tgt = Pad.nearestMob(12);
    if (!tgt) { G.pendingSkill = id; G.pendingAt = G.time; UI.msg(L(`คลิกที่มอนสเตอร์เพื่อใช้ ${s.name}`, `Click a monster to use ${s.name}.`), 'info'); return; }
    beginSkill(id, lv, tgt);
  } else beginSkill(id, lv, null);
}
// กดสกิลระหว่างติดดีเลย์: เตือนเหนือหัว (ไม่สแปมแชท)
// คูลดาวน์เหลือของสกิล (วินาที)
function skillCdLeft(id) { const p = G.player; return Math.max(0, ((p.cds || {})[id] || 0) - G.time); }
function skillCdHint(id) {
  const p = G.player;
  if (G.time < (p.delayHintAt || 0)) return;
  p.delayHintAt = G.time + 0.6;
  addFloater(p.x, p.y - 1.6, L(`${SKILLS[id].name} คูลดาวน์ ${skillCdLeft(id).toFixed(1)}s`, `${SKILLS[id].name} cooldown ${skillCdLeft(id).toFixed(1)}s`), '#9fb8d8');
}
function skillDelayHint() {
  const p = G.player;
  if (G.time < (p.delayHintAt || 0)) return;
  p.delayHintAt = G.time + 0.6;
  addFloater(p.x, p.y - 1.6, L(`ดีเลย์ ${Math.max(0.1, p.skillReadyAt - G.time).toFixed(1)}s`, `Delay ${Math.max(0.1, p.skillReadyAt - G.time).toFixed(1)}s`), '#9fb8d8');
}
function beginSkill(id, lv, tgt) {
  const p = G.player, s = SKILLS[id];
  G.pendingSkill = null;
  // ตรวจซ้ำที่นี่ด้วย: ทางคลิกเล็ง/ปุ่มบนจอ/บอท เรียก beginSkill ตรง ๆ ไม่ผ่าน useSkill
  if (p.dead || !lv || !s || (s.bow && weaponType() !== 'bow')) return;
  if (stunBlocked()) return;
  if (G.time < p.skillReadyAt) { skillDelayHint(); return; }
  if (skillCdLeft(id) > 0) { skillCdHint(id); return; }
  if (!canPaySkill(skillCost(id, lv))) { const w = p.d.bloodmagic ? 'HP' : 'SP'; UI.msg(L(`${w} ไม่เพียงพอ`, `Not enough ${w}.`), 'err'); addFloater(p.x, p.y - 1.3, L(`${w} ไม่พอ`, `Low ${w}`), '#8fb0ff'); return; }
  if (tgt) {
    const dist = U.dist(p.x, p.y, tgt.x, tgt.y);
    const range = skillRange(s);
    if (dist > range + 0.3 || (range > 2 && !lineOfSight(G.map, p.x, p.y, tgt.x, tgt.y))) {
      p.skillIntent = { id, lv, tgt }; p.target = null; p.repathAt = 0;
      return;
    }
    faceTo(p, tgt.x, tgt.y);
  }
  p.sitting = false; p.path = []; p.skillIntent = null;
  let castMs = s.cast ? s.cast(lv) : 0;
  castMs *= p.d.castMul * Math.max(0, 1 - p.d.dex / 150);
  if (castMs > 50) {
    p.cast = { id, lv, target: tgt, start: G.time, end: G.time + castMs / 1000 };
    addFx({ type: 'castcircle', ref: p, dur: castMs / 1000, color: s.icon });
    return;
  }
  executeSkill(id, lv, tgt);
}

// ทำงานของสกิลตามข้อมูลใน SKILLS (ดูคำอธิบายรูปแบบใน data.js)
function executeSkill(id, lv, tgt) {
  const p = G.player, s = SKILLS[id];
  if (tgt && tgt.dead) return;
  const cost = skillCost(id, lv);
  if (!canPaySkill(cost)) { UI.msg(L(`${p.d.bloodmagic ? 'HP' : 'SP'} ไม่เพียงพอ`, `Not enough ${p.d.bloodmagic ? 'HP' : 'SP'}.`), 'err'); return; }
  paySkill(cost);
  if (s.type === 'active') addMastery(id);
  if (s.hpCost) {
    const hc = Math.floor(p.hp * s.hpCost(lv) / 100);
    if (hc > 0) { p.hp = Math.max(1, p.hp - hc); addFloater(p.x, p.y - 1.2, `-${hc}`, '#ff8080'); }
  }
  Quest.onSkillUse();
  const delay = typeof s.delay === 'function' ? s.delay(lv) : (s.delay || 500);
  p.skillReadyAt = G.time + delay / 1000; p.skillDelayMs = delay;
  if (s.cd) { const cd = s.cd * (1 - p.d.cdCut / 100); (p.cds || (p.cds = {}))[id] = G.time + cd; (p.cdTot || (p.cdTot = {}))[id] = cd; } // ดีเลย์หลังใช้สกิล (After-cast Delay) ทุกสกิลรอพร้อมกัน
  shout(`${s.name}!!`);
  p.atkAnim = 1;
  p.skillPose = G.time; // ท่าใช้สกิล (1 ท่าต่ออาชีพ) — ความต่างของแต่ละสกิลอยู่ที่เอฟเฟกต์
  if (tgt) faceTo(p, tgt.x, tgt.y);
  Sound.play(skillRange(s) > 3 ? 'skill_range' : 'skill');

  if (s.selfFx) {
    const fxMap = {
      heal: { type: 'heal', ref: p, dur: 1.1 }, buff: { type: 'buff', ref: p, dur: 1, color: s.icon },
      whirl: { type: 'whirl', x: p.x, y: p.y, dur: 0.45, r: (s.dmg && s.dmg.area) || 2 },
      howl: { type: 'ring', ref: p, dur: 0.7, r: (s.dmg && s.dmg.area) || 2.5, color: '230,220,180', waves: 3 },
      shout: { type: 'ring', ref: p, dur: 0.6, r: s.aggro || 4, color: '255,90,70', waves: 2 },
      firering: { type: 'firering', x: p.x, y: p.y, dur: 0.55, r: (s.dmg && s.dmg.area) || 2.5 },
    };
    if (fxMap[s.selfFx]) addFx(fxMap[s.selfFx]);
  }
  if (s.heal) {
    const amt = Math.floor(s.heal(lv, p.d, p) * (1 + p.d.healPct / 100) * masteryMul(id));
    if (tgt) { damageMob(tgt, Math.max(1, Math.floor(amt / 2 * elemMod('holy', tgt.def.element))), { color: '#fff6a0' }); addFx({ type: 'holy', ref: tgt, dur: 0.5 }); }
    else { healPlayer(amt, s.name); Sound.play('heal'); }
  }
  if (s.buff) {
    p.buffs[id] = { lv, until: G.time + s.buff.dur(lv) };
    recalc();
    Sound.play('buff');
  }
  if (s.aggro) {
    for (const m of G.mobs) if (!m.dead && U.dist(m.x, m.y, p.x, p.y) <= s.aggro) aggroMob(m);
  }
  if (s.special) runSpecialSkill(s.special, s, lv);
  if (s.dmg) skillDamage(s, lv, tgt);
  if (s.chain && tgt && !tgt.dead) { p.target = tgt; p.nextAttack = Math.max(p.nextAttack, G.time + 0.35); }
}

function skillDamage(s, lv, tgt) {
  const p = G.player, D = s.dmg;
  let targets;
  if (D.area) {
    const cx = D.at === 'self' || !tgt ? p.x : tgt.x, cy = D.at === 'self' || !tgt ? p.y : tgt.y;
    targets = G.mobs.filter(m => !m.dead && U.dist(m.x, m.y, cx, cy) <= D.area);
  } else if (D.line && tgt) {
    const dx = tgt.x - p.x, dy = tgt.y - p.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
    const reach = skillRange(s) + 1;
    targets = G.mobs.filter(m => {
      if (m.dead) return false;
      const t = (m.x - p.x) * ux + (m.y - p.y) * uy;
      const perp = Math.abs((m.x - p.x) * uy - (m.y - p.y) * ux);
      return t >= 0 && t <= reach && perp < 0.8;
    });
    if (D.line) addFx({ type: 'arrow', sx: p.x, sy: p.y - 0.6, tx: p.x + ux * reach, ty: p.y + uy * reach, dur: 0.25, big: true });
  } else targets = tgt ? [tgt] : [];
  const hits = typeof D.hits === 'function' ? D.hits(lv) : (D.hits || 1);
  targets.forEach((m, ti) => {
    for (let i = 0; i < hits; i++) later(i * 0.15 + ti * 0.04, () => skillHitOne(s, lv, m));
  });
}
function skillHitOne(s, lv, m) {
  const p = G.player, D = s.dmg;
  if (m.dead) return;
  const mult = (D.multAware && m.state === 'chase' ? D.multAware(lv) : D.mult(lv)) * masteryMul(s.id);
  const deliver = () => {
    if (m.dead) return;
    const r = D.type === 'magic' ? magicHit(m, mult, D.element) : physHit(m, mult, { skill: true, element: D.element, sureHit: D.sureHit });
    applyHit(m, r, { element: D.element });
    if (!r.miss && !m.dead) {
      applyStatus(m, D.status, lv, r.dmg);
      if (D.knockback && !m.def.boss) knockback(m, p.x, p.y, D.knockback);
    }
  };
  const fx = s.fx;
  if (fx === 'arrow' && !D.line) {
    addFx({ type: 'arrow', sx: p.x, sy: p.y - 0.6, ref: m, dur: Math.max(0.08, U.dist(p.x, p.y, m.x, m.y) / 20), big: true, onHit: deliver });
    Sound.play('bow');
  } else if (fx === 'firebolt' || fx === 'coldbolt' || fx === 'lightning' || fx === 'holy') {
    addFx({ type: fx, ref: m, dur: 0.28, onHit: deliver });
    Sound.play({ firebolt: 'fire', coldbolt: 'ice', lightning: 'zap', holy: 'holy' }[fx]);
  } else if (fx === 'soul') {
    addFx({ type: 'soul', sx: p.x, sy: p.y - 0.8, ref: m, dur: Math.max(0.1, U.dist(p.x, p.y, m.x, m.y) / 14), onHit: deliver });
    Sound.play('magic');
  } else {
    deliver();
    if (fx) addFx({ type: fx === 'slash' ? 'crit' : 'bash', skin: fx, x: m.x, y: m.y - 0.5, dur: 0.35 });
  }
}

function runSpecialSkill(kind, s, lv) {
  const p = G.player;
  if (kind === 'summon_wolf') {
    G.allies = G.allies.filter(a => a.kind !== 'wolf');
    G.allies.push({
      kind: 'wolf', name: 'Wolf', x: p.x + 0.8, y: p.y, path: [], facing: p.facing, moving: false, seed: Math.random(),
      until: G.time + s.dur(lv), lv, nextAtk: 0, repathAt: 0, atkAnim: 0, target: null, state: 'ally',
      def: { size: 0.85, color: '#c8c8d4', color2: '#8a8a98', variant: 'wolf' },
    });
    addFx({ type: 'warp', x: p.x + 0.8, y: p.y, dur: 0.6 });
    UI.msg(L(`หมาป่าคู่ใจมาช่วยสู้ ${s.dur(lv)} วินาที!`, `Your loyal wolf joins the fight for ${s.dur(lv)}s!`), 'sys');
  } else if (kind === 'trap') {
    if (G.traps.length >= 3) G.traps.shift();
    G.traps.push({ x: p.x, y: p.y, lv, until: G.time + 40, armed: G.time + 0.6 });
  } else if (kind === 'stealth') {
    p.stealthUntil = G.time + s.dur(lv);
    p.target = null;
    for (const m of G.mobs) if (m.state === 'chase') { m.state = 'idle'; m.path = []; }
    addFx({ type: 'ring', ref: p, dur: 0.6, r: 1.5, color: '140,140,170', waves: 2 });
  }
}

function knockback(m, fx, fy, n) {
  if (m.isPlayer) return;
  const dx = m.x - fx, dy = m.y - fy, d = Math.hypot(dx, dy) || 1;
  for (let i = n; i > 0; i--) {
    const nx = m.x + dx / d * i, ny = m.y + dy / d * i;
    if (G.map.walkable(Math.floor(nx), Math.floor(ny))) { m.x = Math.floor(nx) + 0.5; m.y = Math.floor(ny) + 0.5; m.path = []; return; }
  }
}

// ------------------------------------------------------------
//  สัตว์คู่ใจและกับดัก
// ------------------------------------------------------------
function updateAllies(dt) {
  const p = G.player;
  G.allies = G.allies.filter(a => a.until > G.time && !p.dead);
  for (const a of G.allies) {
    a.atkAnim = Math.max(0, a.atkAnim - dt * 3);
    let t = a.target && !a.target.dead && G.mobs.includes(a.target) ? a.target : null;
    if (!t) {
      t = p.target && !p.target.dead ? p.target : null;
      if (!t) {
        let best = 7;
        for (const m of G.mobs) {
          if (m.dead || m.state !== 'chase') continue;
          const d = U.dist(m.x, m.y, p.x, p.y);
          if (d < best) { best = d; t = m; }
        }
      }
      a.target = t;
    }
    if (t && U.dist(t.x, t.y, p.x, p.y) > 12) { a.target = null; t = null; }
    if (t) {
      const d = U.dist(a.x, a.y, t.x, t.y);
      if (d <= 1.3) {
        a.path = []; a.moving = false; faceTo(a, t.x, t.y);
        if (G.time >= a.nextAtk) {
          a.nextAtk = G.time + 1.0; a.atkAnim = 1;
          const dmg = Math.max(1, Math.round((p.d.statusAtk * 0.5 + p.d.weaponAtk * 0.5 + a.lv * 12) * U.rand(0.85, 1.1) * (1 - t.def.def / 100)));
          damageMob(t, dmg, { color: '#c0e0ff' });
        }
      } else {
        if (G.time >= a.repathAt || !a.path.length) { a.path = findPath(G.map, Math.floor(a.x), Math.floor(a.y), Math.floor(t.x), Math.floor(t.y), 600); a.repathAt = G.time + 0.4; }
        moveEntity(a, dt, 5.5);
      }
    } else {
      const d = U.dist(a.x, a.y, p.x, p.y);
      if (d > 14) { a.x = p.x; a.y = p.y; a.path = []; }
      else if (d > 2) {
        if (G.time >= a.repathAt || !a.path.length) { a.path = findPath(G.map, Math.floor(a.x), Math.floor(a.y), Math.floor(p.x), Math.floor(p.y), 600); a.repathAt = G.time + 0.4; }
        moveEntity(a, dt, 5.5);
      } else { a.path = []; a.moving = false; }
    }
  }
}
function updateTraps() {
  const p = G.player;
  G.traps = G.traps.filter(t => t.until > G.time);
  for (let i = G.traps.length - 1; i >= 0; i--) {
    const t = G.traps[i];
    if (G.time < t.armed) continue;
    if (!G.mobs.some(m => !m.dead && U.dist(m.x, m.y, t.x, t.y) < 1.0)) continue;
    G.traps.splice(i, 1);
    addFx({ type: 'firering', x: t.x, y: t.y, dur: 0.5, r: 1.5 });
    Sound.play('crit');
    for (const m of G.mobs) {
      if (m.dead || U.dist(m.x, m.y, t.x, t.y) > 1.5) continue;
      const base = (p.d.dex * 3 + p.baseLv * 2 + p.d.statusAtk * 0.5) * (0.6 + 0.2 * t.lv);
      const dmg = Math.max(1, Math.round(base * U.rand(0.9, 1.1) * elemMod('fire', m.def.element)));
      damageMob(m, dmg, { color: '#ffb060' });
    }
  }
}

// ------------------------------------------------------------
//  อาชีพ
// ------------------------------------------------------------
function changeJob(job) {
  const p = G.player;
  // แต้มสกิลของ Novice ที่ยังไม่ใช้ → ใส่ Basic Training ให้อัตโนมัติ (แต้มไม่ยกข้ามอาชีพ)
  if (p.job === 'novice' && p.skillPoints > 0) {
    const cur = p.skills.basic_training || 0, add = Math.min(p.skillPoints, SKILLS.basic_training.max - cur);
    if (add > 0) { p.skills.basic_training = cur + add; UI.msg(L(`ใส่แต้มสกิล Novice ที่เหลือ ${add} แต้มให้ Basic Training อัตโนมัติ (ATK +${2 * add}, MaxHP +${2 * add}%)`, `${add} leftover Novice skill point(s) auto-assigned to Basic Training (ATK +${2 * add}, MaxHP +${2 * add}%).`), 'sys'); }
  }
  const second = JOBS[job].tier === 2;
  if (second) p.job1Lv = p.jobLv; // จำ Job Lv ของคลาสแรกไว้ (แต้มสกิลคลาสแรกที่ยังไม่ใช้ ยกมาใช้ต่อได้)
  p.skillPoints = 0;
  p.job = job; p.jobLv = 1; p.jobExp = 0;
  if (second) p.skillPoints = Math.max(0, totalSkillPoints(p) - lineSkillsSpent(p));
  else {
    const starter = JOB_STARTER[job];
    addItem(starter, 1);
    unequipInvalid();
    const e = p.inventory.find(x => x.id === starter);
    if (e) equipItem(e, true);
    if (job === 'runecaster' || job === 'volva') addItem('blue_potion', 3);
  }
  recalc();
  p.hp = p.d.maxHp; p.sp = p.d.maxSp;
  const gc = (JOBS[job].glow || '#7ad8ff').replace('#', ''), gn = parseInt(gc, 16);
  addFx({ type: 'upgrade', ref: p, dur: 3.2, col: `${(gn >> 16) & 255},${(gn >> 8) & 255},${gn & 255}` });
  later(2.2, () => addFloater(p.x, p.y - 1.5, `UPGRADE: ${JOBS[job].name}`, JOBS[job].glow || '#7ad8ff', true));
  UI.announce(L(`⚙ ${p.name} อัปเกรดร่างเป็นคลาส ${JOBS[job].name} (${JOBS[job].thai}) สำเร็จ!`, `⚙ ${p.name} has upgraded into the ${JOBS[job].name} class!`));
  UI.splash(Art.jobKey(job, p.gender), `${JOBS[job].name}`, second ? 'SECOND CLASS AWAKENED' : 'BODY UPGRADE COMPLETE', 'upgrade');
  if (second) UI.msg(L(`✦ ปลดล็อกสกิลคลาสขั้น 2 แล้ว — กด S เพื่อดูสกิลใหม่ (ใช้สกิลและอาวุธของ ${JOBS[JOBS[job].parent].name} ได้ต่อ)`, `✦ Second-class skills unlocked — press S to view them (${JOBS[JOBS[job].parent].name} skills and weapons remain usable).`), 'sys');
  else UI.msg(L('🔓 ปลดล็อกบอท AUTO แล้ว — กด B หรือปุ่ม AUTO เพื่อให้ล่าอัตโนมัติ', '🔓 AUTO bot unlocked — press B or the AUTO button to hunt automatically.'), 'sys');
  Sound.play('levelup');
  saveGame();
}
// แต้มสกิลที่ถูกต้อง = (Job Lv − 1) − แต้มที่ใช้ไปในสกิลของอาชีพปัจจุบัน (ได้ 1 แต้มต่อ Job Lv)
// onLoad: เซฟเก่าที่แต้ม Novice ยกข้ามอาชีพ → แปลงส่วนเกินเป็น Basic Training (ไม่ลบทิ้งเฉย ๆ)
function totalSkillPoints(p) { return (p.jobLv - 1) + (JOBS[p.job].tier === 2 ? Math.max(0, (p.job1Lv || JOBS[JOBS[p.job].parent].jobMax) - 1) : 0); }
function lineSkillsSpent(p) { return jobLine(p.job).flatMap(j => JOBS[j].skills).filter(id => SKILLS[id] && !SKILLS[id].noLearn).reduce((a, id) => a + (p.skills[id] || 0), 0); }
function fixSkillPoints(p, onLoad) {
  const spent = lineSkillsSpent(p);
  const should = Math.max(0, totalSkillPoints(p) - spent);
  if (p.skillPoints <= should) return;
  if (onLoad && p.job !== 'novice') {
    const bt = p.skills.basic_training || 0, add = Math.min(p.skillPoints - should, SKILLS.basic_training.max - bt);
    if (add > 0) p.skills.basic_training = bt + add;
  }
  p.skillPoints = should;
}
function resetSkills() {
  const p = G.player;
  let pts = 0;
  for (const id of jobLine(p.job).flatMap(j => JOBS[j].skills)) {
    if (!p.skills[id] || SKILLS[id].noLearn) continue;
    pts += p.skills[id]; delete p.skills[id];
  }
  p.skillPoints += pts;
  fixSkillPoints(p); // คืนได้ไม่เกิน Job Lv − 1
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
  Bot.update();
  updatePlayer(dt);
  updateAllies(dt);
  updateTraps();
  for (const m of G.mobs) updateMob(m, dt);
  G.mobs = G.mobs.filter(m => !(m.dead && m.deathT > 0.8));
  // เกิดใหม่
  for (let i = G.respawns.length - 1; i >= 0; i--) {
    if (G.respawns[i].at <= G.time) { spawnMob(G.respawns[i].id); G.respawns.splice(i, 1); }
  }
  const mvp = G.map.def.mvp;
  const pa = G.player.mvpAt;
  if (mvp && pa && pa[G.map.id] && mvpLeft(G.map.id) <= 0 && !G.mobs.some(m => m.isMvp && !m.dead)) {
    delete pa[G.map.id];
    spawnMvp(mvp);
  }
  // ไอเทมบนพื้นหายไปหลัง 60 วิ
  G.drops = G.drops.filter(d => G.time - d.born < 60);
  // เอฟเฟกต์
  for (const f of G.fx) {
    f.t += dt;
    if (f.onHit && f.t >= (f.hitAt != null ? f.hitAt : f.dur)) { const fn = f.onHit; f.onHit = null; fn(); }
  }
  G.fx = G.fx.filter(f => f.t < f.dur + (f.linger || 0));
  for (const f of G.floaters) f.t += dt;
  G.floaters = G.floaters.filter(f => f.t < f.dur);
  if (p.speech && p.speech.until < G.time) p.speech = null;
}

// ปั๊มยาอัตโนมัติ (ใช้ร่วมกันทั้งเล่นเองและบอท — ตั้งค่าที่เดียว)
function autoPotCfg() {
  const o = G.player.options;
  if (!o.autoPot || typeof o.autoPot !== 'object') {
    const b = o.bot || {}; // เซฟเก่า: ย้ายค่าจากหน้าบอทมาใช้
    o.autoPot = { on: true, hp: b.hpPot != null ? b.hpPot : 50, sp: b.spPot != null ? b.spPot : 20 };
  }
  return o.autoPot;
}
function autoPotTick() {
  const p = G.player;
  if (p.dead || G.time < (p.autoPotAt || 0)) return;
  p.autoPotAt = G.time + 0.2; // ไม่กินรัวทั้งกระเป๋าในพริบตา
  const c = autoPotCfg();
  if (!c.on || isStunned() || (G.map && G.map.def.pvp)) return; // ลานประลอง: กดยาเองเท่านั้น (ปั๊มอัตโนมัติทำให้ไม่มีใครล้ม)
  if (p.hp / p.d.maxHp * 100 < c.hp) { const e = Bot.findItem(HP_POTS); if (e) { useItem(e); return; } }
  if (p.sp / p.d.maxSp * 100 < c.sp) { const e = Bot.findItem(SP_POTS); if (e) useItem(e); }
}

function updatePlayer(dt) {
  const p = G.player;
  p.atkAnim = Math.max(0, p.atkAnim - dt * 4);
  p.hurtFlash = Math.max(0, (p.hurtFlash || 0) - dt);
  if (p.dead) { p.moving = false; return; }
  // บัฟหมดเวลา
  let changed = false;
  for (const k in p.buffs) if (p.buffs[k].until <= G.time) { delete p.buffs[k]; changed = true; UI.msg(L(`${SKILLS[k].name} หมดฤทธิ์แล้ว`, `${SKILLS[k].name} has worn off.`), 'info'); }
  if (changed) recalc();
  autoPotTick();
  // ฟื้นฟู
  const moving = p.path.length > 0;
  p.hpTimer += dt; p.spTimer += dt;
  // นั่งพัก: ถี่ขึ้น 3 เท่าและได้ต่อครั้ง 2 เท่า (รวม ~6 เท่าของยืนนิ่ง) — นั่งราว 1.5 นาทีจากเกือบหมดจนเกือบเต็ม
  const hpInt = p.sitting ? 2 : 6, spInt = p.sitting ? 2.7 : 8, sitMul = p.sitting ? 2 : 1;
  if (p.hpTimer >= hpInt) {
    p.hpTimer = 0;
    if (!moving || p.sitting || p.d.regenPct) {
      const amt = (Math.max(1, Math.floor(p.d.maxHp / 200)) + Math.floor(p.d.vit / 5)) * sitMul + Math.floor(p.d.maxHp * p.d.regenPct / 100);
      const got = Math.min(p.d.maxHp - p.hp, amt);
      p.hp += got;
      // ฟื้นจากพาสซีฟ (regenPct) โชว์ให้เห็น • ฟื้นธรรมชาติปกติเงียบไว้ไม่ให้รก
      if (got > 0 && p.d.regenPct && !p.dead) addFloater(p.x - 0.35, p.y - 1.5, L(`+${got} ฟื้นฟู`, `+${got} Regen`), '#8dffb0');
    }
  }
  if (p.spTimer >= spInt) {
    p.spTimer = 0;
    const amt = (1 + Math.floor(p.d.maxSp / 100) + Math.floor(p.d.int / 6)) * sitMul;
    p.sp = Math.min(p.d.maxSp, p.sp + amt);
  }
  if (p.stunUntil > G.time) { p.moving = false; p.path = []; return; }
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
        faceTo(p, m.x, m.y);
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
      faceTo(p, n.x + 0.5, n.y + 0.5);
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
  // เข้าวาร์ปได้เมื่อตัวละครอยู่ในรัศมี PORTAL_REACH ช่องจากกลางวาร์ป (จุดเกิดอยู่ห่าง 2 ช่อง จึงไม่เด้งกลับ)
  const portal = G.map.portals.find(q => U.dist(q.x + 0.5, q.y + 0.5, p.x, p.y) <= PORTAL_REACH);
  if (portal) {
    const td = MAP_DEFS[portal.to], ar = td.arrive && td.arrive[G.map.id];
    if (ar) changeMap(portal.to, ar[0], ar[1]);
    else { const a = PORTAL_SIDE[portal.toSide](td.w, td.h); changeMap(portal.to, a.ax + 0.5, a.ay + 0.5); }
  }
}

const PORTAL_REACH = 1.1;

function updateMob(m, dt) {
  if (m.isPlayer) return; // ตัวแทนผู้เล่นใน PvP: ตำแหน่งมาจากเครือข่าย
  const p = G.player, md = m.def;
  if (m.dead) { m.deathT += dt; return; }
  m.hitFlash = Math.max(0, m.hitFlash - dt);
  m.atkAnim = Math.max(0, m.atkAnim - dt * 3);
  if (m.poisonUntil > G.time && G.time >= m.poisonTick) {
    m.poisonTick = G.time + 1;
    const dmg = Math.max(1, Math.floor(m.maxHp * 0.015));
    if (m.hp - dmg >= 1) { m.hp -= dmg; addFloater(m.x, m.y - 1, dmg, '#c080ff'); }
  }
  if (m.burnUntil > G.time && G.time >= m.burnTick) {
    m.burnTick = G.time + 1;
    damageMob(m, m.burnDmg, { color: '#ff9040' });
    if (m.dead) return;
  }
  if (m.stunUntil > G.time) { m.moving = false; return; }
  const alive = !p.dead;
  const hidden = p.stealthUntil > G.time;
  const dist = U.dist(m.x, m.y, p.x, p.y);
  const spd = md.speed * (m.slowUntil > G.time ? 0.5 : 1);
  if (hidden && m.state === 'chase') { m.state = 'idle'; m.path = []; }
  // มอนตีก่อน: เห็นในระยะ 4 ช่อง • ไม่สนผู้เล่นที่เลเวลสูงกว่ามันเกิน 10 (ฟาร์มแมพเก่าได้สบาย)
  // • เจอแล้วชะงัก (!) ครู่หนึ่งก่อนตีครั้งแรก ให้ผู้เล่นมีเวลาตั้งตัว
  if (m.state !== 'chase' && md.aggro && alive && !hidden && dist < 4 && p.baseLv < md.lv + 10 && G.map.def.kind !== 'town') {
    m.state = 'chase'; m.emoteUntil = G.time + 0.9; m.path = [];
    m.nextAtk = Math.max(m.nextAtk || 0, G.time + 1.0);
  }
  if (md.dummy) { // หุ่นฝึก: อยู่กับที่ ตีกลับเฉพาะตอนผู้เล่นอยู่ในระยะหลังถูกตี
    m.moving = false; m.path = [];
    if (m.state === 'chase' && (!alive || dist > 5)) m.state = 'idle';
    if (m.state === 'chase' && dist <= md.range + 0.5) { faceTo(m, p.x, p.y); if (G.time >= m.nextAtk) mobAttack(m); }
    if (m.dmgLog) while (m.dmgLog.length && m.dmgLog[0][0] < G.time - 5) m.dmgLog.shift();
    return;
  }
  if (m.state === 'chase') {
    if (!alive || dist > 11) { m.state = 'idle'; m.path = []; m.moving = false; return; } // หนีพ้นได้เมื่อห่าง 11 ช่อง
    // สกิลบอส
    if (md.boss && G.time >= m.nextBossSkill && dist < 8) {
      m.nextBossSkill = G.time + U.rand(8, 12);
      bossSkill(m);
    }
    if (dist <= (md.range || 1) + 0.5) {
      m.path = []; m.moving = false;
      faceTo(m, p.x, p.y);
      if (G.time >= m.nextAtk) mobAttack(m);
    } else {
      if (G.time >= m.repathAt || !m.path.length) {
        m.path = findPath(G.map, Math.floor(m.x), Math.floor(m.y), Math.floor(p.x), Math.floor(p.y), 800);
        m.repathAt = G.time + 0.5;
      }
      moveEntity(m, dt, spd * 1.35);
    }
  } else {
    if (m.path.length) moveEntity(m, dt, spd);
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

// สกิลบอสเพิ่มเติมจากไฟล์เนื้อหา (เช่น js/content_ch6.js): BOSS_SKILLS[ชื่อ] = m => { ... } แล้วใส่ bossSkill: 'ชื่อ' ในข้อมูลมอน
const BOSS_SKILLS = {};
function bossSkill(m) {
  const p = G.player;
  if (BOSS_SKILLS[m.def.bossSkill]) return BOSS_SKILLS[m.def.bossSkill](m);
  if (m.def.bossSkill === 'heal') {
    const amt = Math.floor(m.maxHp * 0.08);
    m.hp = Math.min(m.maxHp, m.hp + amt);
    addFloater(m.x, m.y - 2, `+${amt}`, '#70ff70', true);
    addFx({ type: 'heal', ref: m, dur: 1.2 });
    UI.msg(L(`${m.def.name} ใช้เวทฟื้นฟูตัวเอง!`, `${m.def.name} casts a healing spell on itself!`), 'mvp');
  } else {
    addFx({ type: 'warnring', x: m.x, y: m.y, dur: 1.0, r: 3 });
    UI.msg(L(`${m.def.name} กำลังร่ายเวทไฟ! ถอยออกมา!`, `${m.def.name} is casting a fire spell! Get back!`), 'mvp');
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
