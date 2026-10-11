'use strict';
// ============================================================
//  Tamper Watch (ด่านแรกฝั่งเบราว์เซอร์) — กันคนแก้ค่า/แก้โค้ดจากคอนโซลแบบง่าย ๆ (ไม่ใช่กันแฮกเกอร์ตัวจริง — นั่นงานของเซิร์ฟเวอร์)
//  หลัก: "ใครเป็นคนเขียนค่า" — ค่าสำคัญของผู้เล่น (Volt/EXP/เลเวล/สเตตัส/แต้ม/ของ/ตีบวก/ตำแหน่ง/ค่าต่อสู้) เป็น accessor
//  ที่เก็บค่าจริงไว้ใน closure (Volt/EXP ฯลฯ XOR กับกุญแจสุ่มต่อเซสชัน) • ทุกครั้งที่ค่าเปลี่ยน ดู call stack:
//  โค้ดของเกมเอง (ไฟล์ใน origin เดียวกัน / สคริปต์ที่หน้าโหลด) = ผ่านเสมอ → ไม่ต้องตามห่อทุกเส้นทางที่เกมเปลี่ยนค่า (AUTO, ตลาด, ตีบวก, กาชา, ตาย, เปลี่ยน Class ...)
//  เขียนจากคอนโซล/eval/สคริปต์ภายนอก = ไม่รับค่า (คืนค่าเดิม) + จดธง • ไม่แบนใคร ไม่บล็อกการเล่น
//  เสริม: ฟังก์ชันหลักถูกแทน → คืนตัวเดิม (ตรวจกับซอร์สไฟล์จริง) • ตารางข้อมูล ITEMS/MOBS ถูกแก้ → คืนค่า • กับดักล่อ (GOD_MODE / Cheats)
//  • ผู้เฝ้า 3 ตัวคนละกลไก (interval / rAF / timeout) ตรวจกันเอง • เปิด DevTools = ธงความมั่นใจต่ำ (ไม่ทำอะไร)
//  ธงส่งไปกับเซฟถัดไป (data.guardFlags) + RPC report_flags ถ้ามี • เบราว์เซอร์ที่คุมด้วยระบบอัตโนมัติ (navigator.webdriver: เทสต์/บอท) = ดูอย่างเดียว ไม่คืนค่า
// ============================================================
(function () {
  if (typeof G === 'undefined' || window.__ivg) return;
  N_defProp(window, '__ivg', { value: 1 });
  function N_defProp(o, k, d) { return Object.defineProperty(o, k, d); }
  const N = {
    defProp: Object.defineProperty, getDesc: Object.getOwnPropertyDescriptor, toStr: Function.prototype.toString,
    Err: Error, setInterval: window.setInterval.bind(window), setTimeout: window.setTimeout.bind(window),
    raf: window.requestAnimationFrame.bind(window), now: performance.now.bind(performance), push: Array.prototype.push,
    unshift: Array.prototype.unshift, splice: Array.prototype.splice, apply: Function.prototype.apply, keys: Object.keys,
    WeakSet, WeakMap, Map, Set, random: Math.random, fetch: window.fetch && window.fetch.bind(window),
  };
  const WD = !!navigator.webdriver;          // เทสต์/บอทอัตโนมัติ: ดูอย่างเดียว (เทสต์ตั้งค่าตรง ๆ เป็นปกติ)
  let enforce = !WD;
  const SELF = (document.currentScript && document.currentScript.src || '').split('?')[0];

  // ---------------- ธง ----------------
  const CAP = 40, flags = [], seen = new N.Map(), forSave = [], forRpc = [];
  let repairs = 0, lastRepairMsg = 0;
  function flag(rule, detail, conf) {
    detail = String(detail || '').slice(0, 140);
    const key = rule + '|' + detail, now = Date.now(), old = seen.get(key);
    if (old) { old.n++; if (now - old.t < 60000) return; old.t = now; }
    const f = { rule, detail, confidence: conf || 'high', t: now, n: 1 };
    if (!enforce) f.obs = 1;
    if (!old) seen.set(key, f);
    N.push.call(flags, f); if (flags.length > 200) flags.splice(0, flags.length - 200);
    N.push.call(forSave, f); if (forSave.length > CAP) forSave.splice(0, forSave.length - CAP);
    N.push.call(forRpc, f); if (forRpc.length > CAP) forRpc.splice(0, forRpc.length - CAP);
  }
  function repaired() {
    repairs++;
    const now = Date.now();
    if (now - lastRepairMsg < 8000) return;
    lastRepairMsg = now;
    try { if (typeof UI !== 'undefined' && UI.msg) UI.msg(typeof L === 'function' ? L('ข้อมูลไม่ตรง — คืนค่าเดิมแล้ว', 'Data mismatch — restored the original value') : 'ข้อมูลไม่ตรง — คืนค่าเดิมแล้ว', 'sys'); } catch (e) { /* ไม่ให้กระทบเกม */ }
  }

  // ---------------- ใครเป็นคนเขียน: อ่าน call stack ----------------
  let allowed = [], nScripts = -1;
  function scanAllowed() {
    const ss = document.scripts;
    if (ss.length === nScripts) return;
    nScripts = ss.length;
    const a = [];
    if (/^https?:$/.test(location.protocol)) a.push(location.origin + '/');
    else a.push(location.href.split('?')[0].replace(/[^/]*$/, ''));
    for (const s of ss) if (s.src) a.push(s.src.split('?')[0]);
    allowed = a;
  }
  scanAllowed();
  const RX_URL = /(?:blob:|data:)?[a-z][\w+.-]*:\/\/[^\s)]*/i, RX_DATA = /\bdata:[a-z]/i;
  const RX_CON = /<anonymous>:\d|debugger eval code|eval at |\(:\d+:\d+\)|^\s*at :\d|> (?:eval|Function)\b/;
  const K_NAT = 0, K_SELF = 1, K_OK = 2, K_EXT = 3, K_CON = 4;
  const ambient = new N.Set(); // เฟรมแปลกที่โผล่ใน callback ปกติของหน้า (ส่วนขยายเบราว์เซอร์ที่ห่อ timer/event) = ไม่นับ
  function kindOf(line) {
    const m = RX_URL.exec(line);
    if (m) {
      const u = m[0];
      if (/^(blob|data):/i.test(u)) return K_EXT;
      if (SELF && u.startsWith(SELF)) return K_SELF;
      for (const a of allowed) if (u.startsWith(a)) return K_OK;
      return K_EXT;
    }
    if (RX_DATA.test(line)) return K_EXT;
    if (RX_CON.test(line)) return K_CON;
    return K_NAT;
  }
  function stackLines() {
    const E = N.Err;
    let s, lim, pst;
    try { lim = E.stackTraceLimit; pst = E.prepareStackTrace; E.stackTraceLimit = 60; if (pst !== undefined) E.prepareStackTrace = undefined; } catch (e) { /* อ่านอย่างเดียว */ }
    try { s = new E().stack; } catch (e) { s = ''; }
    try { E.stackTraceLimit = lim; if (pst !== undefined) E.prepareStackTrace = pst; } catch (e) { /* */ }
    return typeof s === 'string' && s ? s.split('\n') : null;
  }
  const perf = { checks: 0, checkMs: 0, checkMax: 0, writes: 0, verdicts: 0, verdictMs: 0, ext: 0 };
  // null = โค้ดของเกม • string = รายละเอียดเฟรมที่มาจากนอกเกม
  function verdict() {
    const t0 = N.now();
    perf.verdicts++;
    const L = stackLines();
    let out = null;
    if (L) {
      let started = false;
      for (let k = 0; k < L.length; k++) {
        const line = L[k];
        if (k === 0 && !/@|^\s*at /.test(line)) continue; // หัวข้อ "Error" (V8)
        const kd = kindOf(line);
        if (!started) {
          if (kd === K_SELF || kd === K_NAT) continue;
          started = true;
          if (kd !== K_OK) { out = 'w ' + line.trim(); break; } // คนเขียนค่าโดยตรงไม่ใช่โค้ดเกม
          continue;
        }
        if (kd === K_CON && !ambient.has(line.trim())) { out = 'c ' + line.trim(); break; } // เกมถูกเรียกจากคอนโซล/eval
      }
      if (!started && !out) out = 'w none';
    }
    perf.verdictMs += N.now() - t0;
    if (out) perf.ext++;
    return out;
  }
  // ส่วนขยายบางตัวห่อ timer/event ด้วยสคริปต์ไม่มีไฟล์ → เรียนรู้เฟรมพวกนั้นจาก callback ของเราเองตอนเปิดหน้า (ก่อนเริ่มเล่น)
  function learn() {
    if (G.started) return;
    const L = stackLines();
    if (L) for (const line of L) { const kd = kindOf(line); if (kd === K_CON || kd === K_EXT) ambient.add(line.trim()); }
  }
  try {
    window.setTimeout(learn, 0); window.requestAnimationFrame(learn); Promise.resolve().then(learn);
    for (const ev of ['pointerdown', 'keydown', 'click', 'touchstart', 'message']) {
      let n = 0;
      const f = () => { learn(); if (++n >= 3 || G.started) window.removeEventListener(ev, f, true); };
      window.addEventListener(ev, f, { capture: true, passive: true });
    }
  } catch (e) { /* */ }
  // กันวงจรพัง: ถ้าการเขียนจากโค้ดเกมถูกตีว่า "ถูกเรียกจากนอก" ถี่ผิดปกติ (เช่น ส่วนขยายแปลก ๆ) → เลิกคืนค่าแบบนั้นทั้งเซสชัน ไม่ให้เกมพัง
  let deepBlocks = [], degraded = false;
  function shouldBlock(vd) {
    if (!enforce) return false;
    if (vd.charCodeAt(0) !== 99) return true; // 'w' = คนเขียนตรง ๆ ไม่ใช่เกม → คืนค่าเสมอ
    if (degraded) return false;
    const now = Date.now();
    deepBlocks = deepBlocks.filter(t => now - t < 60000); deepBlocks.push(now);
    if (deepBlocks.length > 40) { degraded = true; flag('guard-degraded', 'too many deep-origin blocks', 'medium'); return false; }
    return true;
  }

  // ---------------- ค่าเงา (shadow) ----------------
  const F64 = new Float64Array(1), U32 = new Uint32Array(F64.buffer);
  const KA = (N.random() * 4294967296) >>> 0, KB = (N.random() * 4294967296) >>> 0;
  function put(h, v) {
    if (h.obf && typeof v === 'number') { F64[0] = v; h.a = U32[0] ^ KA; h.b = U32[1] ^ KB; h.n = true; h.r = undefined; }
    else { h.n = false; h.r = v; }
  }
  function take(h) { if (h.n) { U32[0] = h.a ^ KA; U32[1] = h.b ^ KB; return F64[0]; } return h.r; }
  const OURS = new N.WeakSet(), REG = new N.WeakMap();
  // spec: { obf, need(old, v, obj) → ต้องตรวจ stack ไหม, after(v) → ติดตั้งลูก, cfg: configurable (ช่องที่เกมลบเองได้) }
  function guardProp(obj, key, spec, label) {
    if (!obj || typeof obj !== 'object') return;
    let m = REG.get(obj);
    if (!m) { m = new N.Map(); REG.set(obj, m); }
    const prev = m.get(key);
    const ds = N.getDesc(obj, key);
    if (!ds) { if (prev) m.delete(key); return; }
    if (ds.get && OURS.has(ds.get)) return;
    if (prev && !spec.cfg) return;
    if (!ds.configurable || ds.get || ds.set) return; // ของคนอื่น / ล็อกไว้แล้ว — ไม่ยุ่ง
    const h = { obf: !!spec.obf };
    put(h, ds.value);
    const get = function () { return take(h); };
    const set = function (v) {
      const old = take(h);
      if (v === old) return;
      perf.writes++;
      if (spec.need(old, v, obj)) {
        const vd = verdict();
        if (vd) {
          flag(spec.rule || 'edit', (label || key) + ' ' + vd, 'high');
          if (shouldBlock(vd)) { repaired(); return; }
        }
      }
      put(h, v);
      if (spec.after) spec.after(v);
    };
    OURS.add(get);
    N.defProp(obj, key, { get, set, enumerable: ds.enumerable, configurable: !!spec.cfg || WD }); // เทสต์อัตโนมัติ: ให้เทสต์เดิมที่ครอบ x/y ด้วย accessor ของตัวเองทำได้
    m.set(key, h);
    if (spec.after) spec.after(ds.value);
  }
  const always = () => true;
  const S_NUM = { obf: true, need: always };
  const S_KEY = { obf: true, need: always, cfg: true }; // คีย์ที่เกมลบเองได้ (เลเวลสกิล)
  const S_POS = { need: (o, v) => !(Math.abs(v - o) <= 3), rule: 'teleport' };    // เดินปกติ < 1 ช่องต่อเฟรม • วาร์ปของเกมผ่าน stack
  const S_POOL = { need: (o, v) => !(v <= o) };                                      // HP/SP เพิ่ม = ตรวจ (ลดไม่ตรวจ)
  const S_MOBHP = { need: (o, v, m) => !(o - v < 0.4 * (m.maxHp || 1)), rule: 'mob-hp' }; // หักเลือดมอนก้อนใหญ่ = ตรวจ
  const S_D = { need: always, rule: 'derived' };
  const ECON = ['zeny', 'baseExp', 'jobExp', 'baseLv', 'jobLv', 'statPoints', 'skillPoints', 'job'];
  const STATS = ['str', 'agi', 'vit', 'int', 'dex', 'luk'];
  const DKEYS = ['statusAtk', 'weaponAtk', 'atkBonus', 'matkMin', 'matkMax', 'aspdDelay', 'aspd', 'maxHp', 'maxSp', 'speed', 'crit', 'critMul', 'hit', 'flee',
    'def', 'mdef', 'softDef', 'softMdef', 'atkPct', 'range', 'castMul', 'cdCut', 'leech'];
  const SLOTS = ['head', 'weapon', 'shield', 'armor', 'garment', 'shoes', 'acc', 'acc2'];
  const ENTRY = { obf: true, need: always, rule: 'item' };
  const ENTRIES = new N.WeakSet();
  function installEntry(e) {
    if (!e || typeof e !== 'object' || ENTRIES.has(e)) return;
    ENTRIES.add(e);
    for (const k of ['id', 'qty', 'refine']) guardProp(e, k, ENTRY, 'item.' + k);
  }
  const HOOKED = new N.WeakSet();
  function hookList(arr, entries, label) {
    if (!Array.isArray(arr) || HOOKED.has(arr)) return;
    HOOKED.add(arr);
    const mk = (nat, name, minArgs) => function () {
      if (arguments.length > minArgs) {
        const vd = verdict();
        if (vd) {
          flag('list-add', label + '.' + name + ' ' + vd, 'high');
          if (shouldBlock(vd)) { repaired(); return name === 'splice' ? [] : this.length; }
        }
      }
      const r = N.apply.call(nat, this, arguments);
      if (entries) for (let i = name === 'splice' ? 2 : 0; i < arguments.length; i++) installEntry(arguments[i]);
      return r;
    };
    try {
      N.defProp(arr, 'push', { value: mk(N.push, 'push', 0), configurable: WD, writable: WD, enumerable: false });
      N.defProp(arr, 'unshift', { value: mk(N.unshift, 'unshift', 0), configurable: WD, writable: WD, enumerable: false });
      N.defProp(arr, 'splice', { value: mk(N.splice, 'splice', 2), configurable: WD, writable: WD, enumerable: false });
    } catch (e) { /* อาร์เรย์ถูกแช่แข็ง */ }
    if (entries) for (const e of arr) installEntry(e);
  }
  const S_STATS = { need: always, rule: 'stats', after: o => { if (o && typeof o === 'object') for (const k of STATS) guardProp(o, k, S_NUM, 'stats.' + k); } };
  const S_SLOT = { need: always, rule: 'equip', after: installEntry };
  const S_EQUIP = { need: always, rule: 'equip', after: o => { if (o && typeof o === 'object') for (const k of SLOTS) guardProp(o, k, S_SLOT, 'equip.' + k); } };
  const S_SKILLS = { need: always, rule: 'skills', after: o => { if (o && typeof o === 'object') for (const k of N.keys(o)) guardProp(o, k, S_KEY, 'skill.' + k); } };
  const S_DOBJ = { need: always, rule: 'derived', after: o => { if (o && typeof o === 'object') for (const k of DKEYS) guardProp(o, k, S_D, 'd.' + k); } };
  const S_INV = { need: always, rule: 'list', after: a => hookList(a, true, 'inventory') };
  const S_STO = { need: always, rule: 'list', after: a => hookList(a, true, 'storage') };
  const S_OWN = { need: always, rule: 'list', after: a => hookList(a, false, 'owned') };
  const INST = new N.WeakSet();
  function installPlayer(p) {
    if (!p || typeof p !== 'object' || INST.has(p)) return;
    INST.add(p);
    for (const k of ECON) guardProp(p, k, S_NUM);
    guardProp(p, 'x', S_POS); guardProp(p, 'y', S_POS);
    guardProp(p, 'hp', S_POOL); guardProp(p, 'sp', S_POOL);
    guardProp(p, 'stats', S_STATS); guardProp(p, 'equip', S_EQUIP); guardProp(p, 'skills', S_SKILLS); guardProp(p, 'd', S_DOBJ);
    guardProp(p, 'inventory', S_INV); guardProp(p, 'storage', S_STO);
    guardProp(p, 'runesOwn', S_OWN); guardProp(p, 'hrunesOwn', S_OWN);
    honeyProp(p, 'dropMul', 1); honeyProp(p, 'godMode', false);
  }
  // G.player เป็น accessor: เปลี่ยนตัวละคร (โหลดเซฟ/สร้างใหม่) = ติดตั้งให้ตัวใหม่ • แทนทั้งก้อนจากคอนโซล = ไม่รับ
  (function () {
    const h = { r: G.player };
    const get = function () { return h.r; };
    OURS.add(get);
    N.defProp(G, 'player', {
      get, enumerable: true, configurable: WD,
      set(v) {
        if (v === h.r) return;
        if (v && h.r) {
          const vd = verdict();
          if (vd) { flag('player-swap', vd, 'high'); if (shouldBlock(vd)) { repaired(); return; } }
        }
        h.r = v; installPlayer(v);
      },
    });
    installPlayer(h.r);
  })();

  // ---------------- กับดักล่อ (เกมไม่เคยใช้) ----------------
  function honeyProp(o, k, val) {
    try {
      N.defProp(o, k, { get() { return val; }, set(v) { flag('honeypot', k + '=' + String(v).slice(0, 20), 'high'); }, enumerable: false, configurable: false });
    } catch (e) { /* */ }
  }
  honeyProp(window, 'GOD_MODE', false);
  honeyProp(window, 'DEBUG_MODE', false);
  honeyProp(G, 'godMode', false);
  honeyProp(G, 'dropRate', 1);
  (function () {
    const bait = n => function () { flag('honeypot', 'Cheats.' + n + '()', 'high'); return undefined; };
    const C = Object.freeze({ infiniteZeny: bait('infiniteZeny'), godMode: bait('godMode'), maxLevel: bait('maxLevel'), addItem: bait('addItem'),
      oneHitKill: bait('oneHitKill'), unlockAll: bait('unlockAll'), setDropRate: bait('setDropRate'), speedHack: bait('speedHack') });
    try { N.defProp(window, 'Cheats', { value: C, enumerable: false, configurable: false, writable: false }); } catch (e) { /* */ }
  })();

  // ---------------- ฟังก์ชันหลัก: ถูกแทนแล้วคืนตัวเดิม ----------------
  const FN = ['damageMob', 'physHit', 'magicHit', 'applyHit', 'skillDamage', 'skillDeliver', 'skillHitOne', 'killMob', 'gainExp', 'addItem', 'removeEntry',
    'dropItemOnGround', 'pickUp', 'grantChip', 'mobZeny', 'expLevelMul', 'lvChanceMul', 'chipChance', 'recalc', 'damagePlayer', 'healPlayer', 'playerDie',
    'saveGame', 'saveData', 'loadGameFrom', 'raiseStat', 'moveEntity', 'playerAttack', 'mobAttack', 'skillCost', 'paySkill', 'canPaySkill', 'bossDmg',
    'statCost', 'statPointsForLevel', 'baseExpNeed', 'jobExpNeed', 'changeJob', 'learnSkill', 'equipItem', 'teleportPlayer', 'changeMap'];
  const fnLast = new N.Map();
  let fnSnap = false, srcTexts = null, srcLoading = null;
  function loadSources() {
    if (srcLoading || !N.fetch) return srcLoading;
    const urls = [...document.scripts].map(s => s.src).filter(u => u && allowed.some(a => u.startsWith(a)) && !/\/vendor\/|bake_data/.test(u));
    const got = [];
    srcLoading = urls.reduce((pr, u) => pr.then(() => N.fetch(u, { cache: 'force-cache' }).then(r => (r.ok ? r.text() : '')).catch(() => '').then(t => { if (t) got.push(t); })), Promise.resolve())
      .then(() => { srcTexts = got; }); // ทีละไฟล์ (จากแคช) ไม่แย่งโหลดกับเกม
    return srcLoading;
  }
  // ฟังก์ชันใหม่มาจากไฟล์ของเกมจริงไหม (ตัวห่อของโมดูลต่าง ๆ ติดตั้งช้า/เร็วไม่เท่ากัน) — ไม่รู้ = null
  function fromSource(fn) {
    if (!srcTexts) return null;
    if (!srcTexts.length) return true; // อ่านซอร์สไม่ได้ (เช่น file://) = ไม่ตัดสิน ปล่อยผ่าน
    let s; try { s = N.toStr.call(fn); } catch (e) { return false; }
    if (s.length < 12 || s.includes('[native code]')) return false;
    return srcTexts.some(t => t.includes(s));
  }
  let fnPending = null;
  function checkFns() {
    if (!fnSnap) { for (const k of FN) if (typeof window[k] === 'function') fnLast.set(k, window[k]); fnSnap = true; if (enforce) N.setTimeout(loadSources, 8000); return; } // โหลดซอร์ส (แคชเบราว์เซอร์) ไว้ก่อน → ตัดสินได้ทันทีเมื่อมีการแทน
    let pending = null;
    for (const [k, f0] of fnLast) {
      const cur = window[k];
      if (cur === f0) continue;
      if (typeof cur === 'function') {
        const ok = enforce ? fromSource(cur) : true; // โหมดดูอย่างเดียว (เทสต์แทนฟังก์ชันเป็นปกติ): ไม่โหลดซอร์ส ไม่ตัดสิน
        if (ok === null) { (pending || (pending = [])).push(k); continue; }
        if (ok) { fnLast.set(k, cur); continue; }
      }
      flag('fn-replaced', k, 'high');
      if (enforce) {
        try { window[k] = f0; } catch (e) { /* */ }
        repaired();
        try { if (G.player && G.started) window.recalc(); } catch (e) { /* */ } // ค่าต่อสู้ที่ตัวปลอมคำนวณไว้ → คำนวณใหม่ด้วยตัวจริง
      }
    }
    if (pending && !fnPending) { fnPending = pending; const lp = loadSources(); if (lp) lp.then(() => { fnPending = null; }); else { for (const k of pending) fnLast.set(k, window[k]); fnPending = null; } }
  }
  // ของพื้นฐานที่ตัวเฝ้าพึ่ง
  const NATIVE_CHK = [[Function.prototype, 'toString', N.toStr], [Object, 'defineProperty', N.defProp], [Object, 'getOwnPropertyDescriptor', N.getDesc], [window, 'Error', N.Err]];
  function checkNatives() {
    for (const [o, k, f] of NATIVE_CHK) if (o[k] !== f) { flag('native-tamper', k, 'high'); if (enforce) try { o[k] = f; } catch (e) { /* */ } }
    try { const d = N.getDesc(N.Err, 'stackTraceLimit'); if (d && (!d.writable && !d.set)) flag('native-tamper', 'stackTraceLimit', 'high'); } catch (e) { /* */ }
  }

  // ---------------- ตารางข้อมูล (ITEMS / MOBS): แก้เรท/EXP/พลังอาวุธ → คืนค่า ----------------
  const tabRows = []; let tabI = 0, tabSnapAt = 0;
  function snapTables() {
    const add = (tname, T) => {
      if (!T) return;
      for (const id of N.keys(T)) {
        const o = T[id]; if (!o || typeof o !== 'object') continue;
        const nums = [];
        for (const k of N.keys(o)) if (typeof o[k] === 'number') nums.push([k, o[k]]);
        const b = o.b && typeof o.b === 'object' ? N.keys(o.b).filter(k => typeof o.b[k] === 'number').map(k => [k, o.b[k]]) : null;
        tabRows.push({ tname, id, o, nums, b, drops: Array.isArray(o.drops) ? o.drops.map(x => (Array.isArray(x) ? x.slice() : x)) : null });
      }
    };
    add('ITEMS', typeof ITEMS !== 'undefined' && ITEMS); add('MOBS', typeof MOBS !== 'undefined' && MOBS);
  }
  function sameDrops(a, b) { // ไม่สร้างสตริงทุกรอบ (ถูกกว่า)
    if (!Array.isArray(a) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) { const x = a[i], y = b[i]; if (Array.isArray(y) ? !(Array.isArray(x) && x[0] === y[0] && x[1] === y[1]) : x !== y) return false; }
    return true;
  }
  function checkTables(n) {
    if (!tabRows.length) return;
    for (let c = 0; c < n; c++) {
      const r = tabRows[tabI++ % tabRows.length], o = r.o;
      for (const [k, v] of r.nums) if (!Object.is(o[k], v)) { flag('data-edit', `${r.tname}.${r.id}.${k}`, 'high'); if (enforce) { o[k] = v; repaired(); } }
      if (r.b) { if (!o.b || typeof o.b !== 'object') { flag('data-edit', `${r.tname}.${r.id}.b`, 'high'); } else for (const [k, v] of r.b) if (!Object.is(o.b[k], v)) { flag('data-edit', `${r.tname}.${r.id}.b.${k}`, 'high'); if (enforce) { o.b[k] = v; repaired(); } } }
      if (r.drops && !sameDrops(o.drops, r.drops)) { flag('data-edit', `${r.tname}.${r.id}.drops`, 'high'); if (enforce) { o.drops = r.drops.map(x => (Array.isArray(x) ? x.slice() : x)); repaired(); } }
    }
  }

  // ---------------- DevTools (ความมั่นใจต่ำ ไม่ทำอะไร) ----------------
  let dtFlagged = false;
  function checkDevtools() {
    if (dtFlagged || WD || ('ontouchstart' in window) || !window.outerWidth) return;
    const dw = window.outerWidth - window.innerWidth, dh = window.outerHeight - window.innerHeight;
    if (dw > 260 || dh > 320) { dtFlagged = true; flag('devtools', `gap ${dw}x${dh} dpr ${window.devicePixelRatio}`, 'low'); }
  }

  // ---------------- ดาเมจผิดธรรมชาติ (ธงอย่างเดียว เกณฑ์หลวมมาก) ----------------
  if (typeof damageMob === 'function') {
    const dm0 = damageMob;
    damageMob = function (m, dmg, opts) { // eslint-disable-line no-global-assign
      try {
        const d = G.player && G.player.d;
        if (d && dmg > 1e5) {
          const pow = Math.max(1, (d.statusAtk || 0) + (d.weaponAtk || 0) + (d.atkBonus || 0), d.matkMax || 0);
          if (dmg > pow * 1000) flag('dmg-outlier', `${Math.round(dmg)} vs pow ${pow}`, 'medium');
        }
      } catch (e) { /* */ }
      return dm0.apply(this, arguments);
    };
  }

  // ---------------- ส่งธง: ไปกับเซฟถัดไป + RPC (ถ้ามี) ----------------
  if (typeof saveData === 'function') {
    const sd0 = saveData;
    saveData = function () { // eslint-disable-line no-global-assign
      const d = sd0.apply(this, arguments);
      try {
        tick('C');
        const A = typeof Acct !== 'undefined' ? Acct.data : null, prev = A && A.chars && A.chars[A.active];
        const carried = prev && d && prev.name === d.name && Array.isArray(prev.guardFlags) ? prev.guardFlags : [];
        if (d && (forSave.length || carried.length)) {
          d.guardFlags = carried.concat(forSave.map(f => ({ rule: f.rule, detail: f.detail, confidence: f.confidence, t: f.t, n: f.n, obs: f.obs }))).slice(-CAP);
          forSave.length = 0;
        }
      } catch (e) { /* ห้ามทำเซฟพัง */ }
      return d;
    };
  }
  let rpcOk = null, rpcAt = 0, rpcBusy = false;
  function flushRpc(force) {
    if (!forRpc.length || rpcOk === false || rpcBusy) return;
    if (!force && Date.now() - rpcAt < 60000) return;
    let sb = null;
    try { if (typeof Online !== 'undefined' && Online.sb && Online.loggedIn && !Online.local && typeof Online.sb.rpc === 'function') sb = Online.sb; } catch (e) { /* */ }
    if (!sb) return;
    rpcAt = Date.now(); rpcBusy = true;
    const batch = forRpc.splice(0, forRpc.length).map(f => ({ rule: f.rule, detail: f.detail, confidence: f.confidence, t: f.t, n: f.n, obs: f.obs }));
    let pr;
    try { pr = Promise.resolve(sb.rpc('report_flags', { flags: batch })); } catch (e) { pr = Promise.reject(e); }
    pr.then(res => {
      const er = res && res.error;
      if (!er) { rpcOk = true; return; }
      const msg = String(er.message || '') + ' ' + (er.code || '') + ' ' + (er.status || '');
      if (/PGRST202|42883|404|Could not find the function|does not exist/i.test(msg)) rpcOk = false; // ไม่มี RPC บนเซิร์ฟเวอร์ = ข้ามตลอดเซสชัน
    }, () => { /* เน็ตหลุด — ไปกับเซฟแทน */ }).then(() => { rpcBusy = false; });
  }

  // ---------------- รอบตรวจ (ถูกปลุกจากผู้เฝ้า 3 ตัว) ----------------
  let lastRun = 0, startedAt = 0;
  const samples = [];
  function walk() {
    const p = G.player;
    if (!p) return;
    installPlayer(p);
    const inv = p.inventory, sto = p.storage, eq = p.equip;
    if (Array.isArray(inv)) { hookList(inv, true, 'inventory'); for (let i = 0; i < inv.length; i++) installEntry(inv[i]); }
    if (Array.isArray(sto)) { hookList(sto, true, 'storage'); for (let i = 0; i < sto.length; i++) installEntry(sto[i]); }
    if (eq && typeof eq === 'object') for (const s of SLOTS) installEntry(eq[s]);
    if (p.skills && typeof p.skills === 'object') for (const k of N.keys(p.skills)) guardProp(p.skills, k, S_KEY, 'skill.' + k);
    const ms = G.mobs;
    if (Array.isArray(ms)) for (let i = 0; i < ms.length; i++) { const m = ms[i]; if (m && !INST.has(m)) { INST.add(m); guardProp(m, 'hp', S_MOBHP); } }
  }
  function fullCheck() {
    const t0 = N.now();
    try {
      scanAllowed();
      checkNatives();
      walk();
      if (G.started) {
        if (!startedAt) startedAt = Date.now();
        checkFns();
        if (!tabSnapAt && Date.now() - startedAt > 3000) { tabSnapAt = Date.now(); snapTables(); }
        checkTables(30); // ทั้งตาราง ~360 แถว ≈ 12 รอบ (~25 วิ)
      }
      if (perf.checks % 5 === 0) checkDevtools(); // อ่านขนาดหน้าต่าง ไม่ต้องทุกรอบ
      flushRpc(false);
    } catch (e) { /* ตัวเฝ้าห้ามทำเกมพัง */ }
    const dt = N.now() - t0;
    perf.checks++; perf.checkMs += dt; if (dt > perf.checkMax) perf.checkMax = dt;
    N.push.call(samples, dt); if (samples.length > 200) samples.shift();
  }
  // ผู้เฝ้า 3 ตัว (interval / rAF / timeout ต่อกัน) — ตัวไหนเงียบไปขณะที่ตัวอื่นยังเดิน (หน้าเปิดอยู่) = ถูกฆ่า → ปลุกใหม่ + ธง
  const hb = { A: 0, B: 0, C: 0 };
  let visibleSince = Date.now();
  document.addEventListener('visibilitychange', () => { visibleSince = Date.now(); hb.A = hb.B = hb.C = 0; });
  function tick(src) {
    const now = Date.now();
    hb[src] = now;
    if (document.visibilityState === 'visible' && now - visibleSince > 30000 && G.started) {
      for (const w of ['A', 'B', 'C']) {
        if (w === src || !hb[w] || now - hb[w] < 30000) continue;
        flag('watcher', w + ' stopped', 'medium');
        hb[w] = now; START[w]();
      }
    }
    if (now - lastRun >= 1800) { lastRun = now; fullCheck(); }
  }
  let idA = 0, genB = 0, genC = 0;
  const START = {
    A() { try { clearInterval(idA); } catch (e) { /* */ } idA = N.setInterval(() => tick('A'), 2000); },
    B() { const g = ++genB; let n = 0; const f = () => { if (g !== genB) return; if (++n % 90 === 0) tick('B'); N.raf(f); }; N.raf(f); },
    C() { const g = ++genC; const f = () => { if (g !== genC) return; tick('C'); N.setTimeout(f, 2400 + N.random() * 1200); }; N.setTimeout(f, 2600); },
  };
  START.A(); START.B(); START.C();

  // ---------------- สำหรับเทสต์อัตโนมัติเท่านั้น (navigator.webdriver) ----------------
  if (WD) {
    N.defProp(window, '__guardTest', {
      value: Object.freeze({
        flags: () => flags.map(f => Object.assign({}, f)), arm() { enforce = true; loadSources(); }, disarm() { enforce = false; },
        clear() { flags.length = 0; forSave.length = 0; forRpc.length = 0; seen.clear(); repairs = 0; deepBlocks = []; degraded = false; },
        check() { fullCheck(); }, perf: () => Object.assign({ median: samples.length ? samples.slice().sort((a, b) => a - b)[samples.length >> 1] : 0, repairs, degraded, rpcOk, tabRows: tabRows.length, fns: fnLast.size, ambient: ambient.size }, perf),
        resetPerf() { for (const k in perf) perf[k] = 0; samples.length = 0; }, flush() { rpcAt = 0; flushRpc(true); }, verdict: () => verdict(), pending: () => forRpc.length,
      }),
    });
  }
})();
