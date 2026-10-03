'use strict';
// ============================================================
//  Battle Script (Custom Play เฟส B) — ผู้เล่นเขียนกฎ AUTO เอง: ถ้า (เงื่อนไข ≤ 2 ข้อ) → ให้ (การกระทำ)
//  • ตรวจจากบนลงล่างทุกรอบคิดของบอท (0.2 วิ) กฎแรกที่ "เงื่อนไขตรง และทำได้จริง" ได้ทำ (สกิลติดคูลดาวน์ = ข้ามไปกฎถัดไป)
//  • ไม่มีกฎไหนทำ → บอททำตามค่าตั้งแบบง่ายเดิมใน js/bot.js ทุกอย่าง • ไม่เปิดโหมดขั้นสูง = บอทเดิม 100%
//  • เก็บใน G.player.options.bot: adv (เปิดโหมด) • script (กฎ ≤ 12) • presets (3 ชุด เก็บเป็นข้อความกฎ)
//  • แชร์เป็นโค้ด IV-SCRIPT:<base64url> — ตรวจเข้มทุกตัวอักษรด้วย whitelist ไม่ eval อะไรเลย
//  ข้อความกฎ (ภายในโค้ด):  "1:" + กฎคั่นด้วย ";"   กฎ = [!]เงื่อนไข[&เงื่อนไข]=การกระทำ   (! = ปิดกฎนั้น)
//    เงื่อนไข: A เสมอ • h<40 h>40 HP เรา • s<20 s>80 SP เรา • B เป้าเป็นบอส/MVP • m3.2 มอนในระยะ 3 ช่อง ≥ 2 ตัว
//              p40 เพื่อนปาร์ตี้ HP < 40% • f<skill> บัฟนี้ไม่ทำงาน • t30 HP เป้า < 30% • e<ธาตุ> ธาตุเป้า • r<เผ่า> เผ่าเป้า
//    การกระทำ: s<skill> ใช้สกิล • ph ps ดื่มยา HP/SP • K ถอยห่าง • tn tl tp เปลี่ยนเป้า (ใกล้สุด/HP ต่ำสุด/ตัวที่ประชิดเพื่อน)
//              R นั่งพัก • X ข้ามเป้านี้ • N ตีปกติ
// ============================================================

const BS_MAX_RULES = 12, BS_MAX_CONDS = 2, BS_PRESETS = 3, BS_PREFIX = 'IV-SCRIPT:', BS_MAX_CODE = 1600, BS_MAX_TEXT = 1200;
const BS_RACES = ['brute', 'plant', 'insect', 'undead', 'demon', 'angel', 'formless', 'fish', 'dragon', 'human'];
const BS_REST_HP = 90, BS_REST_SP = 80; // นั่งพักจากกฎ: ลุกเมื่อ HP ≥ 90% และ SP ≥ 80% (หรือโดนตี)
const BS_BUFF_LEFT = 5;                  // "บัฟไม่ทำงาน" = ไม่มีบัฟ หรือเหลือ ≤ 5 วิ (ต่อก่อนหมดเหมือนบอทเดิม)

const BotScript = {
  restIdx: -1,       // กำลังนั่งพักเพราะกฎลำดับนี้ (-1 = ไม่ได้พักเพราะกฎ)
  lastRule: -1, lastAt: -99,
  draft: '', lastCode: '',
  _ok: new WeakSet(), // อาร์เรย์กฎที่ตรวจความถูกต้องแล้ว (ไม่ต้องตรวจซ้ำทุกรอบคิด)
  // ปาร์ตี้: เก็บตำแหน่ง/HP ของเพื่อนลงบัฟเฟอร์ที่จองไว้ (ไม่สร้างอ็อบเจกต์ใหม่ทุกรอบคิด)
  _pv: false, _pn: 0, _px: new Float64Array(8), _py: new Float64Array(8), _ph: new Float64Array(8), _pfn: null,

  has(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); },
  num(v, lo, hi, def) { const n = Math.round(+v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def; },
  elems() { return this._el || (this._el = Object.keys(typeof ELEM_THAI !== 'undefined' ? ELEM_THAI : { neutral: 1 })); },
  races() {
    if (this._rc) return this._rc;
    const s = new Set(BS_RACES);
    if (typeof MOBS !== 'undefined') for (const id in MOBS) if (typeof MOBS[id].race === 'string' && /^[a-z]{1,16}$/.test(MOBS[id].race)) s.add(MOBS[id].race);
    return (this._rc = [...s]);
  },
  isActive(id) { return typeof id === 'string' && this.has(SKILLS, id) && SKILLS[id].type === 'active'; },
  isBuff(id) { return this.isActive(id) && !!SKILLS[id].buff; },

  // ---------- ตรวจ/ทำความสะอาดข้อมูล (ใช้ทั้งตอนโหลดเซฟ ตอนแก้ใน UI และตอนนำเข้าโค้ด) ----------
  // คืน null = ใช้ไม่ได้ (ชนิดไม่รู้จัก / สกิล-ธาตุ-เผ่าที่ไม่มีในเกม)
  cleanCond(o) {
    if (!o || typeof o !== 'object') return null;
    switch (o.t) {
      case 'always': case 'boss': return { t: o.t };
      case 'hp': case 'sp': return { t: o.t, op: o.op === '>' ? '>' : '<', v: this.num(o.v, 0, 100, 50) };
      case 'thp': case 'party': return { t: o.t, v: this.num(o.v, 0, 100, 40) };
      case 'mobs': return { t: 'mobs', n: this.num(o.n, 1, 15, 3), k: this.num(o.k, 1, 20, 3) };
      case 'nobuff': return this.isBuff(o.v) ? { t: 'nobuff', v: o.v } : null;
      case 'elem': return this.elems().includes(o.v) ? { t: 'elem', v: o.v } : null;
      case 'race': return this.races().includes(o.v) ? { t: 'race', v: o.v } : null;
    }
    return null;
  },
  cleanAct(o) {
    if (!o || typeof o !== 'object') return null;
    switch (o.t) {
      case 'skill': return this.isActive(o.v) ? { t: 'skill', v: o.v } : null;
      case 'pot': return { t: 'pot', v: o.v === 'sp' ? 'sp' : 'hp' };
      case 'target': return { t: 'target', v: o.v === 'low' || o.v === 'party' ? o.v : 'near' };
      case 'kite': case 'rest': case 'skip': case 'basic': return { t: o.t };
    }
    return null;
  },
  cleanRule(o) {
    if (!o || typeof o !== 'object' || !Array.isArray(o.c) || !o.c.length || o.c.length > BS_MAX_CONDS) return null;
    const c = [];
    for (const x of o.c) { const k = this.cleanCond(x); if (!k) return null; c.push(k); }
    const a = this.cleanAct(o.a);
    return a ? { on: o.on !== false, c, a } : null;
  },
  // เซฟเก่า/เซฟเสีย: เติมค่าที่ขาด ทิ้งกฎที่ใช้ไม่ได้ (ทำครั้งเดียวต่ออาร์เรย์กฎ)
  normalize(c) {
    if (typeof c.adv !== 'boolean') c.adv = false;
    if (!this._ok.has(c.script)) {
      const out = [];
      if (Array.isArray(c.script)) for (const x of c.script) { if (out.length >= BS_MAX_RULES) break; const r = this.cleanRule(x); if (r) out.push(r); }
      c.script = out; this._ok.add(out);
    }
    if (!this._ok.has(c.presets)) {
      const ps = Array.isArray(c.presets) ? c.presets : [], out = [];
      for (let i = 0; i < BS_PRESETS; i++) { const t = ps[i]; out.push(typeof t === 'string' && !this.parseText(t).err ? t : null); }
      c.presets = out; this._ok.add(out);
    }
    return c;
  },
  // มีกฎที่เปิดอยู่ไหม (เรียกทุกรอบคิด — ต้องถูก)
  active(c) {
    if (c.adv !== true) return false;
    if (!this._ok.has(c.script)) this.normalize(c);
    const r = c.script;
    for (let i = 0; i < r.length; i++) if (r[i].on) return true;
    return false;
  },

  // ---------- ข้อความกฎ / โค้ดแชร์ ----------
  condText(k) {
    switch (k.t) {
      case 'always': return 'A';
      case 'boss': return 'B';
      case 'hp': return 'h' + k.op + k.v;
      case 'sp': return 's' + k.op + k.v;
      case 'thp': return 't' + k.v;
      case 'party': return 'p' + k.v;
      case 'mobs': return 'm' + k.n + '.' + k.k;
      case 'nobuff': return 'f' + k.v;
      case 'elem': return 'e' + k.v;
      case 'race': return 'r' + k.v;
    }
    return 'A';
  },
  actText(a) {
    switch (a.t) {
      case 'skill': return 's' + a.v;
      case 'pot': return a.v === 'sp' ? 'ps' : 'ph';
      case 'kite': return 'K';
      case 'target': return a.v === 'low' ? 'tl' : a.v === 'party' ? 'tp' : 'tn';
      case 'rest': return 'R';
      case 'skip': return 'X';
    }
    return 'N';
  },
  toText(rules) { return '1:' + rules.map(r => (r.on ? '' : '!') + r.c.map(k => this.condText(k)).join('&') + '=' + this.actText(r.a)).join(';'); },
  // คืน undefined = ผิดรูปแบบ (ปฏิเสธทั้งโค้ด) • null = รูปแบบถูกแต่ไม่รู้จักสกิล/ธาตุ/เผ่า (ข้ามกฎนั้น)
  parseCond(t) {
    let m;
    if (t === 'A') return { t: 'always' };
    if (t === 'B') return { t: 'boss' };
    if ((m = /^([hs])([<>])(\d{1,3})$/.exec(t))) return this.cleanCond({ t: m[1] === 'h' ? 'hp' : 'sp', op: m[2], v: +m[3] });
    if ((m = /^([tp])(\d{1,3})$/.exec(t))) return this.cleanCond({ t: m[1] === 't' ? 'thp' : 'party', v: +m[2] });
    if ((m = /^m(\d{1,3})\.(\d{1,3})$/.exec(t))) return this.cleanCond({ t: 'mobs', n: +m[1], k: +m[2] });
    if ((m = /^([fer])([a-z][a-z0-9_]{0,39})$/.exec(t))) return this.cleanCond({ t: m[1] === 'f' ? 'nobuff' : m[1] === 'e' ? 'elem' : 'race', v: m[2] });
    return undefined;
  },
  parseAct(t) {
    switch (t) {
      case 'ph': return { t: 'pot', v: 'hp' };
      case 'ps': return { t: 'pot', v: 'sp' };
      case 'K': return { t: 'kite' };
      case 'tn': return { t: 'target', v: 'near' };
      case 'tl': return { t: 'target', v: 'low' };
      case 'tp': return { t: 'target', v: 'party' };
      case 'R': return { t: 'rest' };
      case 'X': return { t: 'skip' };
      case 'N': return { t: 'basic' };
    }
    const m = /^s([a-z][a-z0-9_]{0,39})$/.exec(t);
    return m ? this.cleanAct({ t: 'skill', v: m[1] }) : undefined;
  },
  parseText(txt) {
    const bad = L('โค้ดสคริปต์ไม่ถูกต้อง', 'Invalid script code');
    if (typeof txt !== 'string' || txt.length > BS_MAX_TEXT || !/^[\x20-\x7e]*$/.test(txt)) return { err: bad };
    const mm = /^1:(.*)$/.exec(txt);
    if (!mm) return { err: bad };
    const rules = [];
    let dropped = 0;
    if (!mm[1]) return { rules, dropped };
    const parts = mm[1].split(';');
    if (parts.length > 64) return { err: bad };
    for (const part of parts) {
      const rm = /^(!?)([^=]{1,120})=([^=]{1,48})$/.exec(part);
      if (!rm) return { err: bad };
      const cs = rm[2].split('&');
      if (cs.length > BS_MAX_CONDS) return { err: bad };
      const c = [];
      let unknown = false;
      for (const t of cs) { const k = this.parseCond(t); if (k === undefined) return { err: bad }; if (k === null) unknown = true; else c.push(k); }
      const a = this.parseAct(rm[3]);
      if (a === undefined) return { err: bad };
      if (a === null || unknown || rules.length >= BS_MAX_RULES) { dropped++; continue; }
      rules.push({ on: !rm[1], c, a });
    }
    return { rules, dropped };
  },
  exportCode(rules) {
    const b = btoa(this.toText(rules)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return BS_PREFIX + b;
  },
  importCode(str) {
    const bad = { err: L('โค้ดสคริปต์ไม่ถูกต้อง (ต้องขึ้นต้นด้วย IV-SCRIPT:)', 'Invalid script code (must start with IV-SCRIPT:)') };
    if (typeof str !== 'string') return bad;
    str = str.trim();
    if (str.length > BS_MAX_CODE || str.indexOf(BS_PREFIX) !== 0) return bad;
    const b = str.slice(BS_PREFIX.length);
    if (!/^[A-Za-z0-9_-]+$/.test(b) || b.length % 4 === 1) return bad;
    let txt;
    try { txt = atob(b.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - b.length % 4) % 4)); } catch (e) { return bad; }
    return this.parseText(txt);
  },

  // ---------- ทำงานจริง (เรียกจาก Bot.update ทุก 0.2 วิ — ห้ามสร้างอ็อบเจกต์ในลูป) ----------
  run(c, threats, hpPct, spPct) {
    const B = Bot, r = c.script;
    this._pv = false; // ข้อมูลปาร์ตี้ของรอบคิดนี้ยังไม่ได้สแกน
    // HP วิกฤต + ยาหมด + โดนตี → ให้ระบบเดิม (ฮีล / กลับเมือง) จัดการก่อนเสมอ
    if (hpPct < 20 && threats.length && c.returnHome && !B.findItem(HP_POTS)) return false;
    if (this.restIdx >= 0 && !B.resting) this.restIdx = -1; // มีอย่างอื่นปลุกให้ลุกแล้ว (ผู้เล่นเดินเอง ฯลฯ)
    let lim = r.length;
    if (this.restIdx >= 0) {
      if (threats.length || (hpPct >= BS_REST_HP && spPct >= BS_REST_SP)) this.wake();
      else lim = Math.min(lim, this.restIdx); // ระหว่างพัก: เฉพาะกฎที่สำคัญกว่า (อยู่สูงกว่า) เท่านั้นที่ขัดได้
    }
    const t = this.ctxTarget(threats);
    for (let i = 0; i < lim; i++) {
      const rule = r[i];
      if (!rule.on || !this.match(rule.c, t, hpPct, spPct)) continue;
      if (!this.act(rule.a, i, t, c, threats, hpPct, spPct)) continue;
      if (rule.a.t !== 'rest' && rule.a.t !== 'pot') this.wake();
      this.lastRule = i; this.lastAt = G.time;
      return true;
    }
    return this.restIdx >= 0 ? this.keepResting() : false;
  },
  match(cs, t, hpPct, spPct) {
    for (let j = 0; j < cs.length; j++) if (!this.cond(cs[j], t, hpPct, spPct)) return false;
    return true;
  },
  cond(k, t, hpPct, spPct) {
    switch (k.t) {
      case 'always': return true;
      case 'hp': return k.op === '>' ? hpPct > k.v : hpPct < k.v;
      case 'sp': return k.op === '>' ? spPct > k.v : spPct < k.v;
      case 'boss': return !!t && (!!t.isMvp || !!t.def.boss);
      case 'thp': return !!t && t.hp / Math.max(1, t.maxHp) * 100 < k.v;
      case 'mobs': return this.mobsNear(k.n, k.k);
      case 'party': {
        const n = this.partyScan();
        for (let i = 0; i < n; i++) if (this._ph[i] < k.v) return true;
        return false;
      }
      case 'nobuff': { const b = G.player.buffs[k.v]; return !b || b.until - G.time <= BS_BUFF_LEFT; }
      case 'elem': return !!t && t.def.element === k.v;
      case 'race': return !!t && t.def.race === k.v;
    }
    return false;
  },
  mobsNear(r, k) {
    const p = G.player, ms = G.mobs;
    let n = 0;
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i];
      if (m.dead || m.def.dummy || U.dist(m.x, m.y, p.x, p.y) > r) continue;
      if (++n >= k) return true;
    }
    return false;
  },
  // เพื่อนปาร์ตี้ในแมพเดียวกัน ระยะไม่เกิน PARTY_RANGE ยังไม่ตาย (สแกนครั้งเดียวต่อรอบคิด)
  partyScan() {
    if (this._pv) return this._pn;
    this._pv = true; this._pn = 0;
    if (typeof Party === 'undefined' || !Party.party || !G.map) return 0;
    if (!this._pfn) this._pfn = m => this.partyAdd(m);
    Party.party.members.forEach(this._pfn);
    return this._pn;
  },
  partyAdd(m) {
    if (this._pn >= this._px.length || !m || m.dead || m.map !== G.map.id) return;
    if (m.seen != null && typeof PARTY_TIMEOUT_MS !== 'undefined' && performance.now() - m.seen > PARTY_TIMEOUT_MS) return;
    const o = typeof Online !== 'undefined' && Online.others ? Online.others.get(m.id) : null;
    const x = o ? (o.tx != null ? o.tx : o.x) : m.x, y = o ? (o.ty != null ? o.ty : o.y) : m.y, p = G.player;
    if (U.dist(p.x, p.y, x, y) > (typeof PARTY_RANGE !== 'undefined' ? PARTY_RANGE : 25)) return;
    const i = this._pn++;
    this._px[i] = x; this._py[i] = y; this._ph[i] = (+m.hp || 0) / Math.max(1, +m.maxHp || 1) * 100;
  },
  // เป้าที่ใช้ตรวจเงื่อนไข: เป้าปัจจุบันของบอท ไม่มี → ตัวที่กำลังตีเราที่ใกล้สุด
  ctxTarget(threats) {
    const B = Bot, p = G.player, t = B.tgt;
    if (t && !t.dead && G.mobs.includes(t)) return t;
    let best = null, bd = Infinity;
    for (let i = 0; i < threats.length; i++) {
      const m = threats[i];
      if (B.blacklist.has(m)) continue;
      const d = U.dist(m.x, m.y, p.x, p.y);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  },
  wake() {
    if (this.restIdx < 0 && !Bot.resting) return;
    this.restIdx = -1; Bot.resting = false; G.player.sitting = false;
  },
  keepResting() {
    const p = G.player, B = Bot;
    if (p.path.length && G.time < B.restMoveUntil) return true; // กำลังเดินไปจุดพัก
    if (B.aggroNear(p.x, p.y) < 6 && G.time >= B.restMoveAt && B.moveToSafe()) return true;
    if (!p.sitting) { p.path = []; p.target = null; p.sitting = true; }
    return true;
  },
  // เป้าที่จะลงมือ: เป้าในบริบท → ติด (ไม่ขยับ + เลือดไม่ลด) ข้ามแบบเดียวกับบอทเดิมแล้วหาตัวใหม่ทันที → ตั้งเป็นเป้าบอท
  aim(t, c, threats, hpPct) {
    const B = Bot, p = G.player;
    let tg = t;
    if (tg && tg === B.tgt && B.stuck(tg)) { B.blacklist.set(tg, G.time + 12); B.noteFail(); B.tgt = null; p.target = null; tg = null; }
    if (!tg) tg = this.ctxTarget(threats) || B.pickTarget(threats, c, hpPct);
    if (!tg) return null;
    if (tg !== B.tgt) B.setTgt(tg);
    B.fails = 0;
    return tg;
  },
  act(a, i, t, c, threats, hpPct, spPct) {
    switch (a.t) {
      case 'skill': return this.doSkill(a.v, t, c, threats, hpPct);
      case 'pot': return this.doPot(a.v === 'sp');
      case 'kite': return this.doKite(t, threats);
      case 'target': return this.doTarget(a.v, c);
      case 'rest': return this.doRest(i, threats, hpPct, spPct);
      case 'skip': return this.doSkip(t);
      case 'basic': return this.doBasic(t, c, threats, hpPct);
    }
    return false;
  },
  doSkill(id, t, c, threats, hpPct) {
    const B = Bot, s = SKILLS[id] && skillDef(id); // รวมรูนที่เลือก (Rune Paths)
    if (!s || !B.canCast(id, 0, true)) return false; // สั่งเองตรง ๆ: ไม่สนติ๊กสกิล/เงื่อนไขแบบง่าย
    if (s.target === 'enemy') {
      const tg = this.aim(t, c, threats, hpPct);
      if (!tg) return false;
      beginSkill(id, skillLv(id), tg);
      B.progAt = Math.max(B.progAt, G.time - 1.5);
      return true;
    }
    beginSkill(id, skillLv(id), null); // ฮีล/บัฟ/รอบตัว: ใส่ตัวเองเสมอ
    return true;
  },
  doPot(sp) {
    const p = G.player;
    if (p.dead || isStunned() || G.time < (p.itemReadyAt || 0)) return false;
    if (sp ? p.sp >= p.d.maxSp : p.hp >= p.d.maxHp) return false;
    const e = Bot.findItem(sp ? SP_POTS : HP_POTS);
    if (!e) return false;
    useItem(e);
    return true;
  },
  // ถอยห่างจากตัวที่ประชิด (≤ 3 ช่อง) ไปที่โล่ง 2.5–4 ช่อง
  doKite(t, threats) {
    const p = G.player, B = Bot;
    if (p.cast || isStunned() || G.time < B.kiteAt) return false;
    let near = false;
    for (let i = 0; i < threats.length && !near; i++) near = U.dist(threats[i].x, threats[i].y, p.x, p.y) <= 3;
    if (!near) return false;
    let bx = 0, by = 0, bg = -1, br = 0;
    for (let ri = 0; ri < B.KITE_R.length && bg < 0; ri++) {
      const r = B.KITE_R[ri];
      for (let k = 0; k < 16; k++) {
        const a = k / 16 * Math.PI * 2, tx = Math.floor(p.x + Math.cos(a) * r), ty = Math.floor(p.y + Math.sin(a) * r), cx = tx + 0.5, cy = ty + 0.5;
        if (!G.map.walkable(tx, ty) || G.map.portalAt(tx, ty) || B.nearPortal(cx, cy, 3) || !B.inZone(cx, cy) || B.aggroNear(cx, cy) < 5) continue;
        let gap = Infinity;
        for (let j = 0; j < threats.length; j++) gap = Math.min(gap, U.dist(threats[j].x, threats[j].y, cx, cy));
        if (gap < 2.2 || gap <= bg) continue;
        bx = tx; by = ty; bg = gap; br = r;
      }
    }
    if (bg < 0) { B.kiteAt = G.time + 1; return false; }
    const path = findPath(G.map, Math.floor(p.x), Math.floor(p.y), bx, by, 300), e = B.pathEnd(path);
    if (!path.length || U.dist(e.x, e.y, bx + 0.5, by + 0.5) > 0.8 || B.pathLen(path) > br * 1.7 + 0.5) { B.kiteAt = G.time + 1; return false; }
    p.target = null; p.skillIntent = null; p.sitting = false; p.path = path;
    B.kiteUntil = G.time + 1.5; B.kiteAt = G.time + B.KITE_CD;
    return true;
  },
  // เปลี่ยนเป้า: ทำงาน (กินรอบคิดนี้) เฉพาะเมื่อได้ตัวใหม่ที่ไม่ใช่เป้าเดิม
  doTarget(mode, c) {
    const p = G.player, B = Bot, skip = c.skipMobs || {}, z = B.zone(), ms = G.mobs, pts = G.map.portals;
    const pn = mode === 'party' ? this.partyScan() : 0;
    if (mode === 'party' && !pn) return false;
    let best = null, bs = Infinity;
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i];
      if (m.dead || m.def.dummy || B.blacklist.has(m)) continue;
      const chase = m.state === 'chase', d = U.dist(m.x, m.y, p.x, p.y);
      if (!chase) { // ตัวที่ยังไม่สู้กับเรา: ตามค่าตั้งแบบง่าย (มอนที่เลือก / ไม่ตี MVP / ในวง / ไม่ชิดวาร์ป)
        if (skip[m.def.id] || (c.avoidMvp && m.isMvp)) continue;
        if (z ? U.dist(m.x, m.y, z.x, z.y) > z.r : d > c.radius) continue;
        let np = false;
        for (let j = 0; j < pts.length && !np; j++) np = U.dist(pts[j].x + 0.5, pts[j].y + 0.5, m.x, m.y) < 2.5;
        if (np) continue;
      } else if (d > 11) continue;
      let sc;
      if (mode === 'low') sc = m.hp / Math.max(1, m.maxHp) * 1000 + d * 0.01;
      else if (mode === 'party') {
        sc = Infinity;
        for (let j = 0; j < pn; j++) sc = Math.min(sc, U.dist(m.x, m.y, this._px[j], this._py[j]));
        if (sc > 3) continue;
      } else sc = d;
      if (sc < bs) { bs = sc; best = m; }
    }
    if (!best || best === B.tgt) return false;
    B.setTgt(best); B.fails = 0;
    return true;
  },
  doRest(i, threats, hpPct, spPct) {
    const p = G.player, B = Bot;
    if (threats.length || (hpPct >= BS_REST_HP && spPct >= BS_REST_SP)) return false;
    if (this.restIdx < 0) { B.tgt = null; p.target = null; p.pickTarget = null; p.skillIntent = null; p.path = []; }
    this.restIdx = i; B.resting = true; B.restForHp = hpPct < BS_REST_HP;
    return this.keepResting();
  },
  doSkip(t) {
    const p = G.player, B = Bot;
    if (!t) return false;
    B.blacklist.set(t, G.time + 20);
    if (B.tgt === t) B.tgt = null;
    if (p.target === t) p.target = null;
    if (p.skillIntent && p.skillIntent.tgt === t) p.skillIntent = null;
    return true;
  },
  doBasic(t, c, threats, hpPct) {
    const p = G.player, tg = this.aim(t, c, threats, hpPct);
    if (!tg) return false;
    if (p.target !== tg) { p.target = tg; p.repathAt = 0; }
    return true;
  },

  // ---------- กฎตั้งต้นจากค่าตั้งแบบง่าย (ฮีล/พัก/บัฟ — การเลือกสกิลโจมตียังเป็นของบอทเดิมที่ทำต่อท้าย) ----------
  template(c) {
    const p = G.player, out = [], R = (cs, a) => ({ on: true, c: cs, a });
    const ids = Object.keys(p.skills).filter(id => this.isActive(id) && skillLv(id) && c.skills[id] !== false);
    if (c.healAt > 0) for (const id of ids) if (Bot.role(id) === 'heal') out.push(R([{ t: 'hp', op: '<', v: c.healAt }], { t: 'skill', v: id }));
    if (c.rest && c.restHp > 0) out.push(R([{ t: 'hp', op: '<', v: c.restHp }], { t: 'rest' }));
    if (c.rest && c.restSp > 0 && Bot.casterish()) out.push(R([{ t: 'sp', op: '<', v: c.restSp }], { t: 'rest' }));
    if (c.useBuffs) for (const id of ids) if (Bot.role(id) === 'buff' && SKILLS[id].target !== 'enemy' && !SKILLS[id].aggro) out.push(R([{ t: 'nobuff', v: id }], { t: 'skill', v: id }));
    if (c.style === 'basic') out.push(R([{ t: 'always' }], { t: 'basic' }));
    return out.slice(0, BS_MAX_RULES).map(r => this.cleanRule(r)).filter(Boolean);
  },
  defCond(t) {
    const buffs = this.skillList('buff');
    return this.cleanCond({ t, op: '<', v: t === 'hp' || t === 'sp' ? 50 : t === 'thp' ? 30 : 40, n: 3, k: 3,
      ...(t === 'nobuff' ? { v: buffs[0] } : t === 'elem' ? { v: 'fire' } : t === 'race' ? { v: this.races()[0] } : {}) });
  },
  defAct(t) {
    if (t === 'skill') { const l = this.skillList('active'); return l.length ? { t, v: l[0] } : null; }
    return this.cleanAct({ t, v: t === 'pot' ? 'hp' : 'near' });
  },
  // สกิลที่เลือกได้ในตัวแก้: สกิลที่เรียนแล้ว + สกิลทั้งสาย Class (เผื่อเขียนกฎไว้ก่อนเรียน)
  skillList(kind) {
    const p = G.player, s = new Set(Object.keys(p.skills || {}));
    for (let j = p.job; j && JOBS[j]; j = JOBS[j].parent) for (const id of JOBS[j].skills || []) s.add(id);
    return [...s].filter(id => kind === 'buff' ? this.isBuff(id) : this.isActive(id));
  },

  // ---------- หน้าตั้งกฎ (อยู่ในหน้าต่างตั้งค่าบอท) ----------
  panel(c, rerender) {
    this.normalize(c);
    this.css();
    const save = () => { saveGame(); rerender(); };
    // แทนกฎที่มีอยู่ (สร้างจากค่าตั้ง / ล้าง / โหลดชุด / นำเข้า): ถามก่อนถ้ายังมีกฎอยู่
    const sure = async () => !c.script.length || typeof UI.confirm !== 'function' || await UI.confirm(L(`แทนที่กฎปัจจุบัน ${c.script.length} กฎ?`, `Replace your current ${c.script.length} rules?`));
    const wrap = h('div', { class: 'bs' });
    wrap.append(h('div', { class: 'bot-sec' }, 'Battle Script'),
      h('label', { class: 'opt bs-adv' }, h('input', { type: 'checkbox', checked: c.adv ? 'checked' : false, onchange: e => { c.adv = e.target.checked; save(); } }),
        ' ', L('โหมดขั้นสูง: เขียนกฎ AUTO เอง', 'Advanced: write your own AUTO rules')));
    if (!c.adv) {
      wrap.append(h('div', { class: 'hint' }, L('ไม่บังคับ — ปิดไว้บอทก็ทำงานตามค่าตั้งแบบง่ายด้านล่างได้เลย', 'Optional — leave it off and the bot follows the simple settings below')));
      return wrap;
    }
    wrap.append(h('div', { class: 'hint bs-help' }, L('ตรวจกฎจากบนลงล่างทุก 0.2 วิ กฎแรกที่เงื่อนไขตรงและทำได้จะทำงาน (สกิลยังไม่พร้อม = ข้ามไปกฎถัดไป) • ไม่มีกฎไหนทำงาน → บอทใช้ค่าตั้งแบบง่ายด้านล่าง • ใส่ "เสมอ → ตีปกติ" ไว้ท้ายสุดถ้าอยากคุมเองทั้งหมด',
      'Rules are checked top to bottom every 0.2 s; the first one whose conditions match and that can act runs (a skill on cooldown passes to the next rule) • If none acts, the bot uses the simple settings below • Put "Always → Basic attack" last to take full control')));
    const list = h('ol', { class: 'bs-list' });
    c.script.forEach((r, i) => list.append(this.ruleCard(c, r, i, save)));
    if (!c.script.length) list.append(h('li', { class: 'hint bs-empty' }, L('ยังไม่มีกฎ — เพิ่มกฎ หรือเริ่มจากค่าตั้งปัจจุบัน', 'No rules yet — add one, or start from your current settings')));
    wrap.append(list);
    const full = c.script.length >= BS_MAX_RULES;
    wrap.append(h('div', { class: 'bs-tools' },
      h('button', { type: 'button', class: 'btn', disabled: full ? 'disabled' : false, onclick: () => { if (c.script.length < BS_MAX_RULES) { c.script.push({ on: true, c: [{ t: 'always' }], a: { t: 'basic' } }); save(); } } },
        full ? L(`ครบ ${BS_MAX_RULES} กฎแล้ว`, `${BS_MAX_RULES} rules max`) : L('＋ เพิ่มกฎ', '＋ Add rule')),
      h('button', { type: 'button', class: 'btn', onclick: async () => { if (!(await sure())) return; this.setRules(c, this.template(c)); UI.msg(L('สร้างกฎจากค่าตั้งปัจจุบันแล้ว (ฮีล / นั่งพัก / บัฟ)', 'Rules created from your current settings (heal / rest / buffs)'), 'info'); save(); } },
        L('เริ่มจากค่าตั้งปัจจุบัน', 'From my settings')),
      c.script.length ? h('button', { type: 'button', class: 'btn danger', onclick: async () => { if (!(await sure())) return; this.setRules(c, []); save(); } }, L('ล้างกฎ', 'Clear')) : null));

    // ชุดที่บันทึกไว้ 3 ชุด
    wrap.append(h('div', { class: 'bot-sec' }, L('ชุดสคริปต์ที่บันทึกไว้', 'Saved scripts')));
    for (let i = 0; i < BS_PRESETS; i++) {
      const t = c.presets[i], n = t ? (this.parseText(t).rules || []).length : 0;
      wrap.append(h('div', { class: 'bs-preset' },
        h('span', {}, h('b', {}, L(`ชุด ${i + 1}`, `Slot ${i + 1}`)), ' • ', t ? L(`${n} กฎ`, `${n} rules`) : L('ว่าง', 'empty')),
        h('button', { type: 'button', class: 'btn small', onclick: () => { c.presets[i] = this.toText(c.script); UI.msg(L(`บันทึกลงชุด ${i + 1} แล้ว`, `Saved to slot ${i + 1}`), 'info'); save(); } }, L('บันทึก', 'Save')),
        h('button', { type: 'button', class: 'btn small', disabled: t ? false : 'disabled', onclick: async () => { const r = t && this.parseText(t); if (r && r.rules && await sure()) { this.setRules(c, r.rules); UI.msg(L(`โหลดชุด ${i + 1} แล้ว`, `Loaded slot ${i + 1}`), 'info'); save(); } } }, L('โหลด', 'Load'))));
    }

    // แชร์
    wrap.append(h('div', { class: 'bot-sec' }, L('แชร์สคริปต์', 'Share script')));
    wrap.append(h('div', { class: 'bs-tools' },
      h('button', { type: 'button', class: 'btn', onclick: () => {
        this.lastCode = this.exportCode(c.script);
        try { navigator.clipboard.writeText(this.lastCode).then(() => UI.msg(L('คัดลอกโค้ดสคริปต์แล้ว ส่งให้เพื่อนได้เลย', 'Script code copied — share it with friends'), 'info'), () => {}); } catch (e) { /* ไม่มีคลิปบอร์ด: ให้คัดลอกจากช่องเอง */ }
        rerender();
      } }, L('คัดลอกโค้ด', 'Copy code'))));
    if (this.lastCode) wrap.append(h('input', { class: 'bs-code', type: 'text', readonly: 'readonly', value: this.lastCode, onfocus: e => e.target.select() }));
    const inp = h('input', { class: 'bs-code', type: 'text', placeholder: L('วางโค้ด IV-SCRIPT:... ที่นี่', 'Paste an IV-SCRIPT:... code here'), value: this.draft, maxlength: BS_MAX_CODE,
      oninput: e => { this.draft = e.target.value; } });
    wrap.append(inp, h('div', { class: 'bs-tools' }, h('button', { type: 'button', class: 'btn', onclick: async () => {
      const res = this.importCode(inp.value);
      if (res.err) { UI.msg(res.err, 'err'); return; }
      if (!(await sure())) return;
      this.setRules(c, res.rules); this.draft = '';
      UI.msg(L(`นำเข้า ${res.rules.length} กฎ${res.dropped ? ` (ข้าม ${res.dropped} กฎที่ใช้สกิล/ข้อมูลที่ไม่รู้จัก)` : ''}`, `Imported ${res.rules.length} rules${res.dropped ? ` (skipped ${res.dropped} with unknown skills/data)` : ''}`), 'info');
      save();
    } }, L('นำเข้า (แทนกฎปัจจุบัน)', 'Import (replaces current)'))));
    return wrap;
  },
  setRules(c, rules) { const r = rules.slice(0, BS_MAX_RULES).map(x => this.cleanRule(x)).filter(Boolean); this._ok.add(r); c.script = r; this.normalize(c); },

  ruleCard(c, r, i, save) {
    const n = c.script.length;
    const sel = (opts, cur, on, cls) => {
      if (cur != null && !opts.some(o => o[0] === cur)) opts = [[cur, String(cur)], ...opts];
      return h('select', { class: cls || '', onchange: e => { on(e.target.value); save(); } },
        opts.map(([v, l]) => h('option', { value: v, selected: v === cur ? 'selected' : false }, l)));
    };
    const pcts = [5, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 95];
    const skillName = id => SKILLS[id].name + (skillLv(id) ? '' : L(' (ยังไม่เรียน)', ' (not learned)'));
    const buffs = this.skillList('buff'), acts = this.skillList('active');
    const condTypes = [['always', L('เสมอ', 'Always')], ['hp', L('HP ของฉัน', 'My HP')], ['sp', L('SP ของฉัน', 'My SP')], ['thp', L('HP ของเป้า', 'Target HP')],
      ['boss', L('เป้าเป็นบอส/MVP', 'Target is boss/MVP')], ['mobs', L('มอนรอบตัว', 'Mobs around me')], ['party', L('เพื่อนปาร์ตี้ HP', 'Party member HP')],
      ...(buffs.length ? [['nobuff', L('บัฟหมด (เหลือ ≤ 5 วิ)', 'Buff missing (≤ 5 s left)')]] : []), ['elem', L('ธาตุของเป้า', 'Target element')], ['race', L('เผ่าของเป้า', 'Target race')]];
    const condRow = (j) => {
      const k = r.c[j], set = v => { r.c[j] = v; };
      const kids = [];
      if (j === 1) kids.push(sel([['', L('— ไม่มี —', '— none —')], ...condTypes], k ? k.t : '', v => { if (!v) r.c.length = 1; else { const d = this.defCond(v); if (d) set(d); } }));
      else kids.push(sel(condTypes, k.t, v => { const d = this.defCond(v); if (d) set(d); }));
      if (k) {
        if (k.t === 'hp' || k.t === 'sp') kids.push(sel([['<', L('ต่ำกว่า', 'below')], ['>', L('สูงกว่า', 'above')]], k.op, v => { k.op = v === '>' ? '>' : '<'; }, 'bs-s'),
          sel(pcts.map(v => [v, v + '%']), k.v, v => { k.v = this.num(v, 0, 100, 50); }, 'bs-s'));
        else if (k.t === 'thp' || k.t === 'party') kids.push(sel(pcts.map(v => [v, '< ' + v + '%']), k.v, v => { k.v = this.num(v, 0, 100, 40); }, 'bs-s'));
        else if (k.t === 'mobs') kids.push(sel([1, 2, 3, 4, 5, 6, 8, 10].map(v => [v, L(`ใน ${v} ช่อง`, `within ${v}`)]), k.n, v => { k.n = this.num(v, 1, 15, 3); }, 'bs-s'),
          sel([1, 2, 3, 4, 5, 6, 8].map(v => [v, L(`≥ ${v} ตัว`, `≥ ${v}`)]), k.k, v => { k.k = this.num(v, 1, 20, 3); }, 'bs-s'));
        else if (k.t === 'nobuff') kids.push(sel(buffs.map(id => [id, skillName(id)]), k.v, v => { if (this.isBuff(v)) k.v = v; }));
        else if (k.t === 'elem') kids.push(sel(this.elems().map(e => [e, (typeof ELEM_THAI !== 'undefined' && ELEM_THAI[e]) || e]), k.v, v => { if (this.elems().includes(v)) k.v = v; }));
        else if (k.t === 'race') kids.push(sel(this.races().map(e => [e, this.raceName(e)]), k.v, v => { if (this.races().includes(v)) k.v = v; }));
      }
      return h('div', { class: 'bs-line' }, h('span', { class: 'bs-k' }, j ? L('และ', 'AND') : L('ถ้า', 'IF')), h('div', { class: 'bs-sel' }, ...kids));
    };
    const actTypes = [...(acts.length ? [['skill', L('ใช้สกิล', 'Use skill')]] : []), ['basic', L('ตีปกติ', 'Basic attack')], ['pot', L('ดื่มยา', 'Drink potion')],
      ['kite', L('ถอยห่าง', 'Retreat / kite')], ['target', L('เปลี่ยนเป้า', 'Switch target')], ['rest', L('นั่งพัก', 'Sit and rest')], ['skip', L('ข้ามเป้านี้', 'Skip this target')]];
    const a = r.a, actKids = [sel(actTypes, a.t, v => { const d = this.defAct(v); if (d) r.a = d; })];
    if (a.t === 'skill') actKids.push(sel(acts.map(id => [id, skillName(id)]), a.v, v => { if (this.isActive(v)) a.v = v; }));
    else if (a.t === 'pot') actKids.push(sel([['hp', L('ยา HP', 'HP potion')], ['sp', L('ยา SP', 'SP potion')]], a.v, v => { a.v = v === 'sp' ? 'sp' : 'hp'; }, 'bs-s'));
    else if (a.t === 'target') actKids.push(sel([['near', L('ตัวใกล้สุด', 'Nearest')], ['low', L('HP ต่ำสุด', 'Lowest HP')], ['party', L('ตัวที่ประชิดเพื่อนปาร์ตี้', 'Next to a party member')]], a.v, v => { a.v = v === 'low' || v === 'party' ? v : 'near'; }));
    const swap = (x, y) => { const s = c.script; [s[x], s[y]] = [s[y], s[x]]; };
    const ib = (txt, title, dis, fn) => h('button', { type: 'button', class: 'btn small bs-ib', title, 'aria-label': title, disabled: dis ? 'disabled' : false, onclick: () => { fn(); save(); } }, txt);
    return h('li', { class: 'bs-rule' + (r.on ? '' : ' off') },
      h('div', { class: 'bs-head' },
        h('b', { class: 'bs-num' }, `#${i + 1}`),
        h('button', { type: 'button', class: 'btn small bs-on' + (r.on ? ' on' : ''), 'aria-pressed': r.on ? 'true' : 'false', onclick: () => { r.on = !r.on; save(); } }, r.on ? L('เปิด', 'On') : L('ปิด', 'Off')),
        h('span', { class: 'bs-sp' }),
        ib('▲', L('เลื่อนขึ้น', 'Move up'), i === 0, () => swap(i, i - 1)),
        ib('▼', L('เลื่อนลง', 'Move down'), i === n - 1, () => swap(i, i + 1)),
        ib('✕', L('ลบกฎ', 'Delete rule'), false, () => c.script.splice(i, 1))),
      condRow(0), condRow(1),
      h('div', { class: 'bs-line' }, h('span', { class: 'bs-k' }, L('ให้', 'THEN')), h('div', { class: 'bs-sel' }, ...actKids)));
  },
  raceName(r) {
    const N = { brute: L('สัตว์กลไก', 'Mech Beast'), plant: L('พืชกลไก', 'Mech Plant'), insect: L('แมลงกลไก', 'Mech Insect'), undead: L('อมตะ', 'Undead'), demon: L('ปีศาจ', 'Demon'),
      angel: L('เทวดา', 'Angel'), formless: L('ไร้รูป', 'Formless'), fish: L('สัตว์น้ำ', 'Aquatic'), dragon: L('มังกร', 'Dragon'), human: L('แอนดรอยด์', 'Android') };
    return N[r] || r;
  },

  // CSS ของตัวแก้กฎ (บล็อกของตัวเอง — ไม่แตะสไตล์หน้าต่างเดิม) • สีโปร่งใสกลาง ๆ ใช้ได้ทั้งธีมกระดาษและธีมมืด
  css() {
    if (document.getElementById('botscript-css')) return;
    const st = document.createElement('style');
    st.id = 'botscript-css';
    st.textContent = `
.bs .bs-adv { font-weight: 600; }
.bs-help { line-height: 1.45; }
.bs-list { list-style: none; margin: 8px 0 4px; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.bs-rule { border: 1px solid rgba(120, 100, 70, .45); border-radius: 6px; padding: 6px 8px 8px; background: rgba(127, 110, 80, .08); }
.bs-rule.off { opacity: .55; }
.bs-head { display: flex; align-items: center; gap: 4px; }
.bs-num { min-width: 28px; font-size: 13px; }
.bs-sp { flex: 1; }
.bs .bs-ib { min-width: 34px; min-height: 30px; padding: 0 6px; font-size: 13px; line-height: 1; }
.bs .bs-on { min-width: 52px; min-height: 30px; }
.bs .bs-on.on { font-weight: 700; }
.bs-line { display: grid; grid-template-columns: 34px minmax(0, 1fr); align-items: center; gap: 4px; margin-top: 5px; }
.bs-k { font-weight: 700; font-size: 11.5px; opacity: .85; }
.bs-sel { display: flex; flex-wrap: wrap; gap: 4px; min-width: 0; }
.bs-line select { flex: 1 1 100px; min-width: 0; max-width: 100%; min-height: 30px; font-size: 12.5px; border-radius: 4px; padding: 2px 4px; }
.bs-line select.bs-s { flex: 1 1 70px; }
.bs-empty { padding: 6px 2px; }
.bs-tools { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.bs-tools .btn { flex: 1 1 120px; min-height: 34px; }
.bs-preset { display: flex; align-items: center; gap: 6px; margin: 5px 0; }
.bs-preset span { flex: 1; font-size: 12px; }
.bs-preset .btn { min-width: 70px; min-height: 30px; }
.bs-code { display: block; width: 100%; box-sizing: border-box; margin-top: 6px; min-height: 32px; padding: 4px 8px; font: 12px/1.3 var(--mono, monospace); }
@media (pointer: coarse), (max-width: 600px) {
  .bs-line select { min-height: 40px; font-size: 15px; }
  .bs .bs-ib { min-width: 44px; min-height: 40px; font-size: 15px; }
  .bs .bs-on { min-width: 60px; min-height: 40px; }
  .bs-tools .btn, .bs-preset .btn { min-height: 42px; }
  .bs-tools .btn { flex-basis: 150px; }
  .bs-preset .btn { min-width: 84px; }
  .bs-code { min-height: 42px; font-size: 15px; }
}`;
    document.head.append(st);
  },
};
