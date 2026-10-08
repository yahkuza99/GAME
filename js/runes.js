'use strict';
// ============================================================
//  Rune Paths (Custom Play เฟส A — ชั้น I) — ดู docs/DESIGN_CUSTOM_PLAY.md
//  • ทุกสกิลของ Class 1 มีรูน 2 แบบ ปลดเมื่อ Skill Lv 4 • เลือกได้ 0 หรือ 1 ต่อสกิล (เซฟใน p.runes = { skillId: runeId })
//  • รูน = เปลี่ยน "วิธีเล่น" ของสกิล (แตกลูก ทิ้งพื้น ดึง ทะลุ กระโดด ตีดีเลย์ ติดรอย ฯลฯ) ไม่ใช่แค่ +%
//  • Sidegrade: ไม่มีรูน / รูน A / รูน B แรงพอ ๆ กัน (tests/runes.js จำลอง DPS เดี่ยว + ฝูง 5 ตัว)
//  • เปลี่ยนได้ทุกที่ฟรี ยกเว้นระหว่างต่อสู้ (ตีโดน/โดนตีภายใน 5 วิ)
//  ข้อมูลสกิลที่ใช้จริง = skillDef(id) (game.js) = SKILLS[id] + ส่วนที่รูนแก้ (ไม่แตะตัวเลขพื้นฐานของสกิล)
// ============================================================
const Runes = {
  UNLOCK: 4,      // Skill Lv ที่ปลดรูนชั้น I
  COMBAT: 5,      // วินาทีหลังตี/โดนตีที่ยังนับว่า "อยู่ในการต่อสู้"
  TREE: {},       // skillId → [รูน, รูน]
  BY_ID: {},      // runeId → รูน (มี .skill)
  _cache: {},

  // ---------- ข้อมูล ----------
  add(skill, list) {
    this.TREE[skill] = list;
    for (const r of list) { r.skill = skill; this.BY_ID[r.id] = r; }
  },
  list(skill) { return this.TREE[skill] || []; },
  chosen(id) {
    const p = G.player, rid = p && p.runes && p.runes[id];
    if (!rid || !this.BY_ID[rid] || this.BY_ID[rid].skill !== id) return null;
    if ((p.skills[id] || 0) < this.UNLOCK) return null; // รีเซ็ตสกิลจนต่ำกว่า Lv 4 → รูนหยุดทำงาน (ยังจำไว้)
    return this.BY_ID[rid];
  },
  // สกิลที่รวมรูนแล้ว (แคชต่อคู่ สกิล+รูน) • prototype = SKILLS[id] → ฟิลด์ที่รูนไม่แตะยังเป็นของเดิม
  def(id) {
    const base = SKILLS[id], r = base && this.chosen(id);
    if (!r) return base;
    const key = id + '|' + r.id;
    if (this._cache[key] && this._cache[key].__base === base) return this._cache[key];
    const d = Object.create(base), mod = r.mod ? r.mod(base) : {};
    for (const k in mod) {
      if (k === 'dmg' && base.dmg) d.dmg = Object.assign({}, base.dmg, mod.dmg);
      else if (k === 'buff' && base.buff) d.buff = Object.assign({}, base.buff, mod.buff);
      else d[k] = mod[k];
    }
    d.rune = r; d.__base = base;
    return (this._cache[key] = d);
  },
  // เซฟเก่า/ข้อมูลเสีย: เก็บเฉพาะคู่ สกิล→รูน ที่มีจริง
  sanitize(o) {
    const out = {};
    if (o && typeof o === 'object') for (const k in o) { const r = this.BY_ID[o[k]]; if (SKILLS[k] && r && r.skill === k) out[k] = o[k]; }
    return out;
  },

  // ---------- การเปลี่ยนรูน (อิสระเป็นของผู้เล่น: ฟรี ทุกที่ ยกเว้นระหว่างต่อสู้) ----------
  combatLeft() { const p = G.player; return Math.max(0, (p.combatAt == null ? -99 : p.combatAt) + this.COMBAT - G.time); },
  canChange() { return this.combatLeft() <= 0; },
  set(skill, rid) {
    const p = G.player;
    if (!this.TREE[skill]) return false;
    if (rid && (!this.BY_ID[rid] || this.BY_ID[rid].skill !== skill)) return false;
    if (rid && (p.skills[skill] || 0) < this.UNLOCK) { UI.msg(L(`ต้องอัป ${SKILLS[skill].name} ถึง Lv ${this.UNLOCK} ก่อน`, `${SKILLS[skill].name} must reach Lv ${this.UNLOCK} first.`), 'err'); return false; }
    if (!this.canChange()) { UI.msg(L(`เปลี่ยนรูนระหว่างต่อสู้ไม่ได้ (รออีก ${Math.ceil(this.combatLeft())} วิ)`, `Can't change runes in combat (${Math.ceil(this.combatLeft())}s).`), 'err'); return false; }
    p.runes = p.runes || {};
    const cur = p.runes[skill] || null;
    if (cur === (rid || null)) return true;
    if (rid) p.runes[skill] = rid; else delete p.runes[skill];
    if (p.buffs[skill]) delete p.buffs[skill]; // บัฟของสกิลที่เปลี่ยนรูนหมดไป (กันค่าค้างข้ามรูน)
    this.clearSkill(skill);
    recalc();
    if (typeof Sound !== 'undefined') Sound.play(rid ? 'buff' : 'click');
    if (rid) { const r = this.BY_ID[rid]; addFloater(p.x, p.y - 1.8, `ᚱ ${r.name}`, '#9ff0ff', true); }
    saveGame();
    UI.dirty();
    return true;
  },
  clearSkill(skill) {
    G.zones = (G.zones || []).filter(z => z.skill !== skill);
    const p = G.player; if (p.rb) for (const k in p.rb) if (p.rb[k].skill === skill) delete p.rb[k];
  },

  // ---------- บัฟชั่วคราวของรูน (p.rb = { key: { until, stats, skill, stacks } }) ----------
  bonus(p) {
    const o = {};
    if (p.rb) for (const k in p.rb) { const b = p.rb[k]; if (b.until > G.time) for (const s in b.stats) o[s] = (o[s] || 0) + b.stats[s] * (b.stacks || 1); }
    return o;
  },
  giveBuff(key, skill, sec, stats, maxStacks) {
    const p = G.player; p.rb = p.rb || {};
    const b = p.rb[key];
    if (maxStacks && b && b.until > G.time) { b.stacks = Math.min(maxStacks, (b.stacks || 1) + 1); b.until = G.time + sec; }
    else p.rb[key] = { until: G.time + sec, stats, skill, stacks: 1 };
    recalc();
    return p.rb[key];
  },

  // ---------- ตัวช่วยเลือกเป้า ----------
  foes(x, y, r, except) { return G.mobs.filter(m => !m.dead && m !== except && U.dist(m.x, m.y, x, y) <= r); },
  // รูนสตัน (เจ้าของ 2026-10-03): ไม่ติดแน่นอน — โอกาสพื้นฐาน 1% ก่อนหักค่าต้านของอีกฝ่าย ใช้กติกาเดียวทุกที่ (ไม่แยก PvE/PvP)
  //   รูนแต่ละตัวมีที่ทางของมันเอง ผู้เล่นเลือกใช้ตามสถานการณ์ (Custom Play) • ค่าต้าน: มอน = ต่างเลเวล (lvChanceMul) / ผู้เล่น = VIT/ต้านมึน (Online.onStun)
  STUN_CH: 0.01,
  tryStun(o, dur) {
    if (!o || o.dead) return false;
    const myLv = G.player ? G.player.baseLv : 1, lvMul = l => typeof lvChanceMul === 'function' ? lvChanceMul(myLv, l) : 1;
    if (o.isPlayer) {
      if (!G.map.def.pvp || typeof Online === 'undefined' || !U.chance(this.STUN_CH * lvMul(o.ref && o.ref.baseLv))) return false;
      Online.sendStun(o, dur); addFloater(o.x, o.y - 1.5, 'Stun!', '#ffe080');
      return true;
    }
    if (o.def.boss || o.isMvp || o.isWB || !U.chance(this.STUN_CH * lvMul(o.def.lv))) return false;
    o.stunUntil = Math.max(o.stunUntil || 0, G.time + dur); o.path = []; o.moving = false;
    addFloater(o.x, o.y - 1.5, 'Stun!', '#ffe080');
    return true;
  },
  nearest(x, y, r, skip) {
    let best = null, bd = r;
    for (const m of G.mobs) { if (m.dead || (skip && skip.includes(m))) continue; const d = U.dist(m.x, m.y, x, y); if (d <= bd) { bd = d; best = m; } }
    return best;
  },
  // ตัวที่จะโดน (บอทใช้ประเมิน) — คืน null = ใช้วิธีเดิมของบอท
  victims(s, t) {
    const r = s.rune; if (!r || !t) return null;
    if (r.victims) return r.victims(s, t).filter(m => !m.def.dummy);
    return null;
  },
  // ตัวคูณดาเมจเฉลี่ยต่อเป้า (บอทใช้ประเมิน)
  estMul(s) { const r = s.rune; return r && r.est ? r.est : 1; },

  // ---------- จุดเกาะจาก game.js ----------
  // รูนที่ "ทำงานต่อเนื่อง" ตอนนี้: รูนของสกิลติดตัว + รูนของบัฟที่ยังไม่หมด (ตีปกติ/โดนตี/ฆ่า/ร่ายสกิล)
  live() {
    const p = G.player; if (!p || !p.runes) return [];
    const out = [];
    for (const k in p.runes) {
      const r = this.chosen(k); if (!r) continue;
      if (SKILLS[k].type === 'passive' || (p.buffs[k] && p.buffs[k].until > G.time) || r.always) out.push(r);
    }
    return out;
  },
  each(fn, ...a) { let v; for (const r of this.live()) if (r[fn]) v = r[fn](...a); return v; },
  preCast(s) { this._hp0 = G.player.hp; },
  onCast(s, lv, tgt) {
    for (const r of this.live()) if (r.onAnySkill) r.onAnySkill(s, lv, tgt);
    const r = s.rune; return !!(r && r.cast && r.cast(s, lv, tgt));
  },
  damage(s, lv, tgt) { const r = s.rune; return !!(r && r.targets && r.targets(s, lv, tgt)); },
  hitMul(s, lv, m) {
    let k = 1;
    const mk = m.rmark;
    if (mk && mk.until > G.time && mk.by !== s.id && !mk.basic) { k *= mk.k; if (mk.crit) this._crit = true; this.consume(m, s); }
    const r = s.rune; if (r && r.hitMul) k *= r.hitMul(s, lv, m);
    for (const lr of this.live()) if (lr.skillMul) k *= lr.skillMul(s, m);
    return k;
  },
  // คริติคอลแน่นอนครั้งถัดไป (รอยรูน/ตีปกติครั้งที่ N) — อ่านแล้วล้าง
  takeCrit() { const c = this._crit; this._crit = false; return !!c; },
  castMul(id) { let k = 1; for (const r of this.live()) if (r.castMul) k *= r.castMul(id); return k; },
  consume(m, s) {
    const mk = m.rmark; if (!mk) return;
    m.rmark = null;
    if (mk.fx) mk.fx.t = mk.fx.dur; // ดับภาพรอย
    addFloater(m.x, m.y - 1.7, mk.label || 'ᚱ BREAK', mk.col || '#9ff0ff');
    this.fx(Object.assign({ kind: 'burst', ref: m, dur: 0.45, col: mk.rgb || '160,240,255' }, mk.presentation || {}));
    if (mk.onConsume) mk.onConsume(m, s);
  },
  // ติดรอยรูนบนเป้า (สกิลอื่น/ตีปกติถัดไปใช้แล้วหาย)
  mark(m, by, opt) {
    if (!m || m.dead) return;
    if (m.rmark && m.rmark.fx) m.rmark.fx.t = m.rmark.fx.dur;
    const fx = this.fx(Object.assign({ kind: 'mark', ref: m, dur: opt.dur, col: opt.rgb || '160,240,255', glyph: opt.glyph || 'ᚱ' }, opt.presentation || {}));
    m.rmark = Object.assign({ by, until: G.time + opt.dur, k: 1, fx }, opt);
  },
  afterHit(s, lv, m, r) {
    const ru = s.rune; if (ru && ru.onHit) ru.onHit(s, lv, m, r);
    for (const lr of this.live()) if (lr.onAnyHit) lr.onAnyHit(m, r, s, lv);
  },
  // ตีปกติ: รอยแบบ basic + รูนที่ทำงานอยู่
  basicMul(m) {
    let k = 1;
    const mk = m.rmark;
    if (mk && mk.until > G.time && mk.basic) { k *= mk.k; if (mk.crit) this._crit = true; this.consume(m, null); }
    for (const r of this.live()) if (r.basicMul) k *= r.basicMul(m);
    return k;
  },
  afterBasic(m, res) { for (const r of this.live()) { if (r.afterBasic) r.afterBasic(m, res); if (r.onAnyHit) r.onAnyHit(m, res, null, 0); } },
  onKill(m) {
    const src = m.killSrc;
    const r = src && SKILLS[src] && this.chosen(src);
    if (r && r.onKill) r.onKill(m);
    for (const lr of this.live()) if (lr.onAnyKill) lr.onAnyKill(m);
  },
  onHurt(m, dmg) { for (const r of this.live()) if (r.onHurt) dmg = r.onHurt(m, dmg); return dmg; },
  onAttacked(m, hit) { if (!m || m.dead) return; for (const r of this.live()) if (r.onAttacked) r.onAttacked(m, hit); },
  trapMod(t) { return t.rune && t.rune.trap ? t.rune.trap(t) : null; },
  afterWolf(a, t, dmg) { const r = this.chosen('wolf_companion'); if (r && r.wolf) r.wolf(a, t, dmg); },
  // พักการใช้ผลซ้ำ (internal cooldown) ต่อคีย์
  icd(key, sec) { const p = G.player; p.ricd = p.ricd || {}; if ((p.ricd[key] || 0) > G.time) return false; p.ricd[key] = G.time + sec; return true; },
  // ตัวนับ "ครั้งที่ N"
  count(key, n) { const p = G.player; p.rc = p.rc || {}; p.rc[key] = (p.rc[key] || 0) + 1; if (p.rc[key] >= n) { p.rc[key] = 0; return true; } return false; },

  // ---------- พื้นที่ค้างบนพื้น (G.zones) ----------
  // z = { x, y, r, until, every, next, skill, tick(z, mobs), col, ref? (ตามตัว) }
  zone(z) {
    z.next = G.time + (z.first != null ? z.first : z.every);
    (G.zones || (G.zones = [])).push(z);
    if (!G.fastSim && z.draw !== false) z.fx = this.fx({ kind: 'zone', x: z.x, y: z.y, ref: z.ref || null, r: z.r, dur: z.until - G.time, col: z.rgb || '255,150,60', style: z.style || 'ring' });
    return z;
  },
  update() {
    const p = G.player; if (!p) return;
    if (G.zones && G.zones.length) {
      G.zones = G.zones.filter(z => z.until > G.time && !(z.ref && z.ref.dead));
      for (const z of G.zones) {
        if (z.ref) { z.x = z.ref.x; z.y = z.ref.y; }
        while (G.time >= z.next && z.next <= z.until) { z.next += z.every; z.tick(z, this.foes(z.x, z.y, z.r)); }
      }
    }
    if (p.rb) {
      let ch = false;
      for (const k in p.rb) if (p.rb[k].until <= G.time) { delete p.rb[k]; ch = true; }
      if (ch) recalc();
    }
    for (const r of this.live()) if (r.tick) r.tick();
    this.watchCombat();
  },
  // ดาเมจรูน (ไม่ใช่ผ่าน skillHitOne): mult × ATK/MATK ของเรา → ใช้สูตรเดียวกับสกิล
  hit(m, s, mult, opt = {}) {
    if (!m || m.dead || !m.def) return null; // ลูกสะท้อน/ลูกบินที่ไปถึงช้า: เป้าอาจหายไปแล้ว (ไม่มี def) — เดิม magicHit พัง (tests/runes.js)
    const D = s.dmg || {}, type = opt.type || D.type || 'phys', el = opt.element || D.element;
    const r = type === 'magic' ? magicHit(m, mult, el) : physHit(m, mult, { skill: true, element: el, sureHit: opt.sureHit != null ? opt.sureHit : D.sureHit });
    applyHit(m, r, { element: el, src: s.id, color: opt.color });
    return r;
  },
  // ดึงเป้าเข้าหาจุด (ไม่ดึงผู้เล่น PvP/บอส)
  pull(m, x, y, keep = 0.9) {
    if (m.dead || m.isPlayer || m.def.boss || m.def.dummy) return;
    const dx = x - m.x, dy = y - m.y, d = Math.hypot(dx, dy);
    if (d <= keep) return;
    for (let s = d - keep; s > 0.2; s -= 0.5) {
      const nx = m.x + dx / d * s, ny = m.y + dy / d * s;
      if (G.map.walkable(Math.floor(nx), Math.floor(ny))) { m.x = nx; m.y = ny; m.path = []; this.fx({ kind: 'drag', x: nx, y: ny, ox: dx / d, oy: dy / d, dur: 0.35, col: '200,220,255' }); return; }
    }
  },

  // ลูกพลังบิน (sx,sy) → เป้า แล้วเรียก onHit • จำลองเร็ว (fastSim) = ไม่มีภาพ แค่หน่วงเวลา
  fly(sx, sy, to, dur, col, onHit, opt = {}) {
    if (G.fastSim) { later(dur, onHit); return; }
    this.fx(Object.assign({ kind: 'bolt', sx, sy, to, dur, col, onHit }, opt));
  },
  // ---------- ภาพ ----------
  fx(f) {
    if (G.fastSim) return { t: 0, dur: 0 };
    f.rune = 1; f.type = 'rune'; f.t = 0; f.linger = 0;
    // A visual continuation can reuse its parent seed without consuming combat RNG.
    if (!Number.isFinite(f.seed)) f.seed = (Math.random() * 1e6) | 0;
    G.fx.push(f); return f;
  },
  draw(g, f, t) {
    if (typeof SciencePresentation !== 'undefined' && SciencePresentation.owns(f)) return SciencePresentation.draw(g,f);
    const k = Math.min(1, f.t / Math.max(0.001, f.dur));
    const o = f.ref || f, X = o.x * TILE, Y = o.y * TILE * R.K, col = f.col || '160,240,255';
    const sc = (f.ref && f.ref.def && f.ref.def.scale) || 1;
    g.save();
    if (f.kind === 'zone') {
      const life = f.t / Math.max(0.001, f.dur), a = Math.min(1, f.t / 0.2) * Math.min(1, (1 - life) * 4), rr = f.r * TILE;
      g.fillStyle = `rgba(${col},${0.16 * a})`; g.beginPath(); g.ellipse(X, Y, rr, rr * R.K, 0, 0, 7); g.fill();
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = `rgba(${col},${0.75 * a})`; g.lineWidth = 2.5; g.setLineDash([10, 7]); g.lineDashOffset = -t * 30;
      g.beginPath(); g.ellipse(X, Y, rr, rr * R.K, 0, 0, 7); g.stroke(); g.setLineDash([]);
      const n = f.style === 'ice' ? 6 : 9;
      for (let i = 0; i < n; i++) {
        const an = i / n * 6.283 + t * (f.style === 'ice' ? 0.3 : 0.8), q = (t * 0.9 + U.hash2(i, 7, f.seed)) % 1, d = rr * (0.25 + 0.65 * U.hash2(i, 3, f.seed));
        const x = X + Math.cos(an) * d, y = Y + Math.sin(an) * d * R.K;
        if (f.style === 'ice') { g.fillStyle = `rgba(220,245,255,${0.7 * a})`; g.beginPath(); g.moveTo(x, y - 12); g.lineTo(x + 4, y); g.lineTo(x - 4, y); g.closePath(); g.fill(); }
        else { g.fillStyle = `rgba(${col},${(1 - q) * 0.8 * a})`; g.beginPath(); g.ellipse(x, y - q * 26, 3.5, 6 * (1 - q * 0.5), 0, 0, 7); g.fill(); }
      }
    } else if (f.kind === 'mark') {
      const by = Y - 54 * sc - Math.sin(t * 4) * 3, a = Math.min(1, f.t / 0.15) * (k > 0.85 ? (1 - k) / 0.15 : 1);
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = `rgba(${col},${0.9 * a})`; g.lineWidth = 2;
      g.beginPath(); g.ellipse(X, by, 11, 11, 0, 0, 7); g.stroke();
      g.beginPath(); g.ellipse(X, Y, 18 * sc, 18 * sc * R.K, 0, 0, 7); g.stroke();
      g.globalCompositeOperation = 'source-over';
      g.font = `700 14px serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = `rgba(20,20,30,${0.8 * a})`; g.fillText(f.glyph, X + 1, by + 1);
      g.fillStyle = `rgba(${col},${a})`; g.fillText(f.glyph, X, by);
    } else if (f.kind === 'burst') {
      const by = Y - 20 * sc, rr = 10 + 34 * (1 - (1 - k) * (1 - k));
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = `rgba(${col},${1 - k})`; g.lineWidth = 3 * (1 - k) + 1;
      g.beginPath(); g.ellipse(X, by, rr, rr * 0.8, 0, 0, 7); g.stroke();
      for (let i = 0; i < 6; i++) { const an = i / 6 * 6.283 + f.seed; g.beginPath(); g.moveTo(X + Math.cos(an) * rr * 0.5, by + Math.sin(an) * rr * 0.4); g.lineTo(X + Math.cos(an) * rr * 1.1, by + Math.sin(an) * rr * 0.9); g.stroke(); }
    } else if (f.kind === 'bolt') { // ลูกพลังจาก (sx,sy) → เป้า (แตกลูก/กระโดด/เด้ง)
      const T = f.to || f.ref; if (T) {
        const sx = f.sx * TILE, sy = f.sy * TILE * R.K - 24, tx = T.x * TILE, ty = T.y * TILE * R.K - 20 * ((T.def && T.def.scale) || 1);
        const x = sx + (tx - sx) * k, y = sy + (ty - sy) * k - Math.sin(k * Math.PI) * (f.arc || 0);
        g.globalCompositeOperation = 'lighter';
        if (f.zig) { g.strokeStyle = `rgba(${col},${1 - k * 0.5})`; g.lineWidth = 2.5; g.beginPath(); g.moveTo(sx, sy); for (let i = 1; i <= 6; i++) { const q = i / 6; g.lineTo(sx + (tx - sx) * q + (i < 6 ? (U.hash2(i, f.seed, (t * 20) | 0) - 0.5) * 22 : 0), sy + (ty - sy) * q + (i < 6 ? (U.hash2(f.seed, i, (t * 20) | 0) - 0.5) * 22 : 0)); } g.stroke(); }
        else {
          const gr = g.createRadialGradient(x, y, 0, x, y, f.size || 12);
          gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.35, `rgba(${col},0.9)`); gr.addColorStop(1, `rgba(${col},0)`);
          g.fillStyle = gr; g.beginPath(); g.arc(x, y, f.size || 12, 0, 7); g.fill();
          g.strokeStyle = `rgba(${col},0.5)`; g.lineWidth = (f.size || 12) * 0.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x - (tx - sx) * 0.08, y - (ty - sy) * 0.08); g.stroke();
        }
      }
    } else if (f.kind === 'sky') { // วงเตือนบนพื้น → ตกลงมาตอนจบ (ตีดีเลย์)
      const rr = f.r * TILE;
      g.fillStyle = `rgba(${col},${0.12 + 0.18 * k})`; g.beginPath(); g.ellipse(X, Y, rr, rr * R.K, 0, 0, 7); g.fill();
      g.strokeStyle = `rgba(${col},0.9)`; g.lineWidth = 2; g.beginPath(); g.ellipse(X, Y, rr * k, rr * k * R.K, 0, 0, 7); g.stroke();
      g.beginPath(); g.ellipse(X, Y, rr, rr * R.K, 0, 0, 7); g.stroke();
      if (k > 0.55) { const q = (k - 0.55) / 0.45; g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(${col},${q})`; g.lineWidth = 6 * q + 2; g.beginPath(); g.moveTo(X, Y - 260 * (1 - q) - 40); g.lineTo(X, Y - 10); g.stroke(); }
    } else if (f.kind === 'drag') { // เส้นลากตอนดึงเข้า
      g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(${col},${1 - k})`; g.lineWidth = 3;
      for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(X - f.ox * 40 + i * 6 * f.oy, Y - 18 - f.oy * 40 * R.K - i * 6 * f.ox); g.lineTo(X + i * 6 * f.oy, Y - 18 - i * 6 * f.ox); g.stroke(); }
    } else if (f.kind === 'aura') { // ออร่าบัฟรูนบนตัวเรา
      const by = Y - 26, a = (1 - k) * 0.9;
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 8; i++) { const an = i / 8 * 6.283 + t * 3, q = (k + i / 8) % 1; g.fillStyle = `rgba(${col},${a * (1 - q)})`; g.beginPath(); g.arc(X + Math.cos(an) * 20, by + Math.sin(an) * 9 - q * 34, 3, 0, 7); g.fill(); }
      g.strokeStyle = `rgba(${col},${a})`; g.lineWidth = 2; g.beginPath(); g.ellipse(X, Y, 22 + 10 * k, (22 + 10 * k) * R.K, 0, 0, 7); g.stroke();
    }
    g.restore();
  },
};

// ---------- หน้าต่างสกิล: แถวเลือกรูนใต้สกิล (เรียกจาก UI.renderSkills บรรทัดเดียว) — CSS อยู่ที่ css/runes.css ----------
// ไอคอนรูน 3D (tools/rune3d.py → assets/rune_<runeId>.webp, '.' → '_') — หินรูนแกะสลัก 1 ชุดต่อ Class + อักษร/สีของรูน + จุดแนวการเล่น
//   iconUrl → ใส่ <img src> ได้เลย (โหลดเมื่อขอ) • ไม่มีไฟล์/รูนไม่รู้จัก/manifest ยังไม่มา = null (ใช้ glyph ตัวอักษรเดิม)
//   iconImg → สำหรับวาดลงผ้าใบ: เริ่มโหลด (Art.need) แล้วคืนภาพเมื่อพร้อม ไม่งั้น null
Runes.artKey = function (rid) { return 'rune_' + String(rid).replace(/[^A-Za-z0-9_]/g, '_'); };
Runes.iconUrl = function (rid) { return this.BY_ID[rid] && typeof Art !== 'undefined' ? Art.url(this.artKey(rid)) : null; };
Runes.iconImg = function (rid) {
  if (!this.BY_ID[rid] || typeof Art === 'undefined') return null;
  const k = this.artKey(rid); Art.need(k); return Art.get(k) || null;
};
Runes.INTENT = { single: () => L('เป้าเดี่ยว', 'Single'), pack: () => L('ฝูง', 'Pack'), both: () => L('รอบด้าน', 'Any') };
// สรุป 1 บรรทัด (อังกฤษ — เจ้าของ: รายละเอียดรูนเป็นอังกฤษ / UI แบบ minimal) • ไม่มี short = คำอธิบายเต็ม (หน้าต่าง Runes ตัดเหลือบรรทัดแรกด้วย CSS เหมือนเดิม)
Runes.shortOf = function (r) { return !r ? '' : r.short || (typeof r.desc === 'function' ? r.desc() : r.desc || ''); };
Runes.skillRow = function (list, id) {
  const r2 = this.list(id); if (r2.length < 2 || typeof h !== 'function') return;
  const p = G.player, lv = p.skills[id] || 0, cur = this.chosen(id), open = lv >= this.UNLOCK, busy = !this.canChange();
  if (!list.querySelector('.rn-help')) {
    list.prepend(h('div', { class: 'rn-help' },
      h('b', {}, 'ᚱ Rune Paths'),
      h('span', {}, L(` — สกิล Lv ${this.UNLOCK} ปลดรูนชั้น I: เลือก 1 จาก 2 (หรือไม่เลือก) เปลี่ยนวิธีเล่นของสกิล • เปลี่ยนได้ฟรีทุกที่ ยกเว้นระหว่างต่อสู้`,
        ` — Skill Lv ${this.UNLOCK} unlocks tier-I runes: pick 1 of 2 (or none) to change how the skill plays • free to swap anywhere, except in combat`)),
      busy ? h('em', { class: 'rn-busy-t' }, L(` ⚔ กำลังต่อสู้ — เปลี่ยนได้ในอีก ${Math.ceil(this.combatLeft())} วิ`, ` ⚔ In combat — swap in ${Math.ceil(this.combatLeft())}s`)) : null,
      typeof Runebook !== 'undefined' ? h('button', { type: 'button', class: 'btn small rn-manage', title: `Runes (${Runebook.KEY})`, onclick: e => { e.stopPropagation(); Runebook.open('skill'); } }, L(`จัดการใน Runes (${Runebook.KEY})`, `Manage in Runes (${Runebook.KEY})`)) : null)); // หน้าต่าง Runes รวมทั้งสองระบบ (js/runebook.js)
  }
  const row = h('div', { class: 'rn-row' + (open ? '' : ' locked') + (busy ? ' busy' : ''), 'data-skill': id },
    h('div', { class: 'rn-head' },
      h('span', { class: 'rn-tier' }, 'ᚱ RUNE I'),
      h('span', { class: 'rn-state' }, !open ? L(`🔒 ปลดที่ ${SKILLS[id].name} Lv ${this.UNLOCK}`, `🔒 Unlocks at ${SKILLS[id].name} Lv ${this.UNLOCK}`)
        : cur ? `${cur.glyph || 'ᚱ'} ${cur.name}` : L('ไม่ใส่รูน (สกิลแบบเดิม)', 'No rune (original skill)'))),
    h('div', { class: 'rn-opts' }, ...r2.map(r => {
      const on = cur === r;
      return h('button', { type: 'button', class: 'rn-opt' + (on ? ' on' : ''), 'data-rune': r.id, 'aria-pressed': on ? 'true' : 'false', disabled: open ? false : 'disabled',
        title: on ? L('แตะอีกครั้งเพื่อถอดรูน', 'Tap again to remove the rune') : L('แตะเพื่อใส่รูนนี้', 'Tap to socket this rune'),
        onclick: e => { e.stopPropagation(); if (this.set(id, on ? null : r.id) && typeof UI !== 'undefined') UI.renderSkills(); } },
        h('span', { class: 'rn-top' },
          h('i', { class: 'rn-g', style: `color:${r.col || 'inherit'}` }, r.glyph || 'ᚱ'),
          h('b', { class: 'rn-n' }, r.name)),
        h('span', { class: 'rn-d', title: r.desc() }, h('small', { class: 'rn-tag ' + r.intent }, this.INTENT[r.intent]()), ' ', this.shortOf(r)));
    })));
  list.append(row);
};
// รีเฟรชหน้าต่างสกิลเมื่อสถานะ "อยู่ในการต่อสู้" เปลี่ยน (ปุ่มรูนล็อก/ปลดเอง)
Runes.watchCombat = function () {
  const busy = !this.canChange();
  if (busy !== this._busy) { this._busy = busy; if (typeof UI !== 'undefined' && UI.isOpen && UI.isOpen('w-skills')) UI.dirty(); }
};

// วาดภาพรูนผ่าน R.drawFx (แบบเดียวกับ juice.js) — ต่อเมื่อ render.js โหลดแล้ว
(() => {
  const hook = () => {
    if (typeof R === 'undefined' || !R.drawFx || R.drawFx._rune) return;
    const d0 = R.drawFx;
    R.drawFx = (g, f, t) => (f.rune ? Runes.draw(g, f, t) : d0(g, f, t));
    R.drawFx._rune = true;
  };
  if (typeof document !== 'undefined' && document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(hook, 0));
  else setTimeout(hook, 0);
})();

// ============================================================
//  ข้อมูลรูนชั้น I — Class 1 ทั้ง 6 (6 สกิล × 2 รูน = 72)
//  intent = ฉากที่ตั้งใจ: 'single' (เป้าเดี่ยว) | 'pack' (ฝูง) | 'both' (ทั้งคู่/สายป้องกัน)
//  ตัวเลขทั้งหมดอยู่ใน Runes.K (ปรับสมดุลที่เดียว — tests/runes.js จำลอง DPS ทุกตัว)
// ============================================================
(() => {
  const K = Runes.K = {
    // Einherjar
    ib_ret_ch: 1, ib_ret: 0.5, ib_jug: 1.8,
    ss_main: 0.84, ss_shock: 0.43, ss_charge: 1.15,
    cry_mark: 1.3,
    ww_vortex: 1.07, ww_storm_hit: 0.4, ww_storm_tick: 0.17,
    st_main: 0.72, st_bounce: 0.42, st_boom: 0.623,
    vo_echo: 0.517, vo_res: 0.51,
    // Rune Caster
    rm_echo: 0.8, rm_ley: 0.0688,
    fr_main: 0.78, fr_shard: 0.4, fr_kindle: 0.8, fr_mark: 1.75,
    ir_lance: 0.82, ir_shat: 1.24, ir_base: 0.85,
    tr_storm: 0.4, tr_focus: 1.9,
    er_fis: 1.51, er_boulder: 1.5,
    rw_stun: 1.2, rw_bar_cd: 8, rw_fb_ch: 0.3, rw_fb: 0.164,
    // Wildhunter
    ee_focus: 0.0275, ee_main: 0.6, ee_scatter: 0.33,
    pa_vol: 0.52, pa_fan: 0.92,
    wc_twin: 0.767, wc_alpha: 0.85, wc_mark: 1.36,
    bt_sh: 1.2, bt_hurl: 1.55,
    ca_harp: 1.5, ca_main: 0.8, ca_conc: 0.5,
    hr_fl: 0.483, hr_mom: 11,
    // Völva
    sa_weak: 0.25, sa_rad: 0.43,
    lf_daze: 1.5, lf_fav: 0.68,
    bo_raven: 0.659, bo_storm: 0.35,
    hs_lance: 0.652, hs_judg: 0.72,
    ds_ret: 0.5, ds_shell: 0.25,
    fg_smite: 0.847, fg_cap: 0.25,
    // Loki's Trickster
    ss_after: 0.26, ss_rhythm: 0.705,
    bs_leap: 0.79, bs_main: 0.84, bs_arc: 0.37,
    sv_bomb: 0.53, sv_dance: 1.9,
    vb_env: 0.628,
    tk_fmain: 0.81, tk_fan: 0.29, tk_main: 0.8, tk_mark: 1.48,
    lg_dbl_ch: 0.35, lg_dbl: 2.6, lg_mir: 1.97,
    // Berserker
    wb_price: 4.72, wb_feral: 45,
    rs_main: 0.79, rs_cleave: 0.39, rs_exe_lo: 0.85, rs_exe_hi: 2.6,
    bf_lust: 3.2, bf_ramp: 0.56,
    hw_rend: 0.6, hw_tick: 0.34, hw_chal: 0.6, hw_mark: 2.0,
    ax_boom: 0.39, ax_leap: 1.26,
    bt_hem: 1.15, bt_spray: 0.34,
  };
  const pc = v => Math.round(v * 100);
  const S = id => SKILLS[id];
  const P = () => G.player;
  const mul = (base, key) => lv => base.dmg.mult(lv) * K[key];
  const fast = () => G.fastSim;
  // เป้าหลัก ×K[km] + ตัวอื่นรอบเป้าในรัศมี r ×K[ks] (สกิลเดี่ยว → กระแทกรอบ)
  const splash = (r, km, ks, vis) => ({
    victims: (s, t) => [t, ...others(t, r, 8)],
    targets(s, lv, t) {
      if (!t) return false;
      if (vis) vis(t);
      const os = others(t, r, 8);
      skillHitOne(s, lv, t, K[km]);
      os.forEach((o, i) => later(0.05 + 0.03 * i, () => { if (!o.dead) skillHitOne(s, lv, o, K[ks]); }));
      return true;
    },
  });
  const curTgt = (r = 9) => { const p = G.player; return p.target && !p.target.dead ? p.target : Runes.nearest(p.x, p.y, r); };
  const ring = (x, y, r, color, waves = 2, dur = 0.6) => { if (!fast()) addFx({ type: 'ring', x, y, r, color, waves, dur }); };
  const aura = col => Runes.fx({ kind: 'aura', ref: G.player, dur: 0.9, col });
  const say = (m, t, c) => { if (!fast()) addFloater(m.x, m.y - 1.6, t, c); };
  const kick = (a, d) => { if (!fast() && typeof R !== 'undefined') R.kick(a, d); };
  const others = (m, r, n, skip = []) => G.mobs.filter(o => !o.dead && o !== m && !skip.includes(o) && U.dist(o.x, o.y, m.x, m.y) <= r)
    .sort((a, b) => U.dist(a.x, a.y, m.x, m.y) - U.dist(b.x, b.y, m.x, m.y)).slice(0, n);
  const inLine = (x, y, ux, uy, reach, w = 0.8) => G.mobs.filter(m => {
    if (m.dead) return false;
    const t = (m.x - x) * ux + (m.y - y) * uy, perp = Math.abs((m.x - x) * uy - (m.y - y) * ux);
    return t >= 0 && t <= reach && perp < w;
  });
  // พุ่งไปประชิดเป้า (เหลือระยะ gap ช่อง) — เส้นลากให้เห็นทาง
  const dashTo = (m, gap = 1.0, col = '255,220,150') => {
    const p = G.player, dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy) || 1;
    if (d <= gap + 0.4) return;
    const ox = p.x, oy = p.y;
    for (let g = gap; g <= d; g += 0.3) {
      const nx = m.x + dx / d * g, ny = m.y + dy / d * g;
      if (G.map.walkable(Math.floor(nx), Math.floor(ny))) { p.x = nx; p.y = ny; p.path = []; p.skillIntent = null; break; }
    }
    const L0 = Math.hypot(p.x - ox, p.y - oy) || 1;
    Runes.fx({ kind: 'drag', x: p.x, y: p.y, ox: (p.x - ox) / L0, oy: (p.y - oy) / L0, dur: 0.35, col });
    faceTo(p, m.x, m.y);
  };
  // หายตัวไปโผล่ด้านหลังเป้า
  const blinkBehind = m => {
    const p = G.player, dx = m.x - p.x, dy = m.y - p.y, d = Math.hypot(dx, dy) || 1;
    const nx = m.x + dx / d * 0.9, ny = m.y + dy / d * 0.9;
    ring(p.x, p.y, 0.9, '170,140,220', 1, 0.4);
    if (G.map.walkable(Math.floor(nx), Math.floor(ny))) { p.x = nx; p.y = ny; p.path = []; p.skillIntent = null; faceTo(p, m.x, m.y); }
    else dashTo(m, 0.9, '170,140,220');
    ring(p.x, p.y, 0.9, '170,140,220', 1, 0.4);
  };

  // ===================== Einherjar =====================
  Runes.add('iron_body', [
    { id: 'iron_body.retaliate', name: 'Retaliate', intent: 'pack', glyph: '⛨', col: '#ffd27a',
      short: `Bash attackers ${pc(K.ib_ret)}% ATK (1/s) · no MaxHP/DEF`,
      desc: () => L(`ไม่ได้ MaxHP/DEF จากร่างเหล็กอีก แลกกับ "สวนกลับ": ถูกโจมตีเมื่อไร (โดนหรือพลาด) ฟาดโล่ใส่ตัวที่ตี ${pc(K.ib_ret)}% ATK (ทุก 1 วิ) — ยิ่งโดนรุมยิ่งสวนบ่อย`,
        `Gives up the MaxHP/DEF of Iron Body. Whenever you are attacked (hit or miss), shield-bash the attacker for ${pc(K.ib_ret)}% ATK (once per second) — the bigger the mob, the more you strike back.`),
      mod: () => ({ passive: lv => ({ atk: 5 * lv, hit: 2 * lv }) }),
      onAttacked(m) {
        if (!U.chance(K.ib_ret_ch) || !Runes.icd('ib_ret', 1)) return;
        Runes.hit(m, S('iron_body'), K.ib_ret, { type: 'phys', sureHit: true });
        if (!fast()) addFx({ type: 'bash', skin: 'bash', x: m.x, y: m.y - 0.5, dur: 0.35 });
        say(m, 'Retaliate!', '#ffd27a');
      } },
    { id: 'iron_body.juggernaut', name: 'Juggernaut', intent: 'single', glyph: '⛰', col: '#ffb070',
      short: `Every 3rd basic hits ${pc(K.ib_jug)}% · no MaxHP/DEF`,
      desc: () => L(`ไม่ได้ MaxHP/DEF จากร่างเหล็กอีก แต่ตีปกติทุกครั้งที่ 3 เป็น "ทุบหนัก" แรง ${pc(K.ib_jug)}% (จอสั่น) — จังหวะ ตี-ตี-ทุบ`,
        `Gives up the MaxHP/DEF of Iron Body, but every 3rd basic attack is a Heavy Blow for ${pc(K.ib_jug)}% (screen shake) — a hit-hit-SMASH rhythm.`),
      mod: () => ({ passive: lv => ({ atk: 5 * lv, hit: 2 * lv }) }),
      basicMul() { if (Runes.count('ib_jug', 3)) { P().rc.heavy = 1; return K.ib_jug; } return 1; },
      afterBasic(m) { const p = P(); if (p.rc && p.rc.heavy) { p.rc.heavy = 0; say(m, 'HEAVY!', '#ffb070'); kick(4, 0.15); if (!fast()) addFx({ type: 'bash', skin: 'bash', x: m.x, y: m.y - 0.5, dur: 0.4 }); } } },
  ]);
  Runes.add('shield_slam', [
    { id: 'shield_slam.shockwave', name: 'Shockwave', intent: 'pack', glyph: '◎', col: '#ffd27a',
      short: `${pc(K.ss_shock)}% shockwave around target · main ${pc(K.ss_main)}%, ½ stun`,
      desc: () => L(`ฟาดโล่ลงพื้น เป้าหลักโดน ${pc(K.ss_main)}% และคลื่นกระแทกรัศมี 1.5 ช่องโดนตัวอื่นรอบ ๆ ตัวละ ${pc(K.ss_shock)}% • โอกาสมึนลดครึ่ง`,
        `Slam the ground: the target takes ${pc(K.ss_main)}% and a 1.5-cell shockwave hits every other enemy around it for ${pc(K.ss_shock)}%. Stun chance halved.`),
      mod: () => ({ dmg: { status: { kind: 'stun', chance: lv => (30 + 10 * lv) / 2, dur: () => 2 } } }),
      ...splash(1.5, 'ss_main', 'ss_shock', t => ring(t.x, t.y, 1.5, '255,210,120', 2, 0.5)) },
    { id: 'shield_slam.charge', name: 'Charge', intent: 'single', glyph: '➤', col: '#ffb070',
      short: `Charge in from 5 cells, ${pc(K.ss_charge)}% · no stun`,
      desc: () => L(`ใช้ได้ไกล 5 ช่อง: พุ่งเข้าชาร์จถึงตัวเป้าแล้วฟาดโล่ ${pc(K.ss_charge)}% แต่ไม่ทำให้มึน`,
        `Usable from 5 cells: charge into the target and slam for ${pc(K.ss_charge)}%, but no stun.`),
      mod: base => ({ melee: false, range: 5, dmg: { mult: mul(base, 'ss_charge'), status: null } }),
      cast(s, lv, t) { if (t) dashTo(t, 1.0); return false; } },
  ]);
  Runes.add('war_cry', [
    { id: 'war_cry.gather', name: 'Iron Gather', intent: 'pack', glyph: '⇲', col: '#ff8a6a',
      short: `Pulls all within 6 cells to you · ½ DEF/MDEF`,
      desc: () => L('คำรามแล้ว "ลาก" มอนทุกตัวในรัศมี 6 ช่องมากองรวมที่ตัวเรา (พร้อมให้ Whirlwind) แต่ DEF/MDEF ที่ได้ลดครึ่ง',
        'The roar drags every monster within 6 cells right up to you (set up a Whirlwind), but the DEF/MDEF gained is halved.'),
      mod: () => ({ buff: { stats: lv => ({ def: 2 * lv, mdef: lv }) } }),
      cast() { const p = P(); for (const m of Runes.foes(p.x, p.y, 6)) Runes.pull(m, p.x, p.y, 1.1); ring(p.x, p.y, 6, '255,120,90', 3, 0.7); return false; } },
    { id: 'war_cry.challenge', name: 'Challenge', intent: 'both', glyph: '!', col: '#ff6a4a',
      short: `Marks all within 6: next skill ${pc(K.cry_mark)}% · no DEF/MDEF`,
      desc: () => L(`ไม่ได้ DEF/MDEF แต่ติดรอย "ท้าดวล" บนมอนทุกตัวรอบตัว 6 ช่อง (8 วิ): สกิลถัดไปที่โดนตัวนั้นแรง ${pc(K.cry_mark)}% แล้วรอยหาย`,
        `No DEF/MDEF. Brands every monster within 6 cells as Challenged (8s): the next skill hit on each deals ${pc(K.cry_mark)}% and breaks the brand.`),
      mod: () => ({ buff: { stats: () => ({}) } }),
      cast() { const p = P(); for (const m of Runes.foes(p.x, p.y, 6)) Runes.mark(m, 'war_cry', { k: K.cry_mark, dur: 8, glyph: '!', rgb: '255,110,80', col: '#ff8a6a', label: 'CHALLENGE!' }); return false; } },
  ]);
  Runes.add('whirlwind', [
    { id: 'whirlwind.vortex', name: 'Vortex', intent: 'pack', glyph: '🌀', col: '#cfe0ff',
      short: `Pulls in foes within 3.5 cells · ${pc(K.ww_vortex)}% dmg`,
      desc: () => L(`ดูดมอนในรัศมี 3.5 ช่องเข้ามาก่อนหมุน (แทนการผลักออก) ดาเมจ ${pc(K.ww_vortex)}%`,
        `Sucks in monsters within 3.5 cells before spinning (instead of knocking them away). ${pc(K.ww_vortex)}% damage.`),
      mod: base => ({ dmg: { knockback: 0, mult: mul(base, 'ww_vortex') } }),
      victims: () => { const p = P(); return Runes.foes(p.x, p.y, 3.5); },
      cast() { const p = P(); for (const m of Runes.foes(p.x, p.y, 3.5)) Runes.pull(m, p.x, p.y, 1.0); return false; } },
    { id: 'whirlwind.bladestorm', name: 'Blade Storm', intent: 'both', glyph: '✺', col: '#e8ecff',
      short: `Blade ring 2.5s, ${pc(K.ww_storm_tick)}% per 0.5s · spin ${pc(K.ww_storm_hit)}%`,
      desc: () => L(`หมุนแรงน้อยลง (${pc(K.ww_storm_hit)}%) แต่ทิ้งวงใบมีดรอบตัว 2.5 วิ ฟันทุก 0.5 วิ ครั้งละ ${pc(K.ww_storm_tick)}% — เดินไปด้วยได้ ไม่ผลักมอน`,
        `Weaker spin (${pc(K.ww_storm_hit)}%) but leaves a ring of blades around you for 2.5s, cutting every 0.5s for ${pc(K.ww_storm_tick)}% — it moves with you, no knockback.`),
      mod: base => ({ dmg: { knockback: 0, mult: mul(base, 'ww_storm_hit') } }),
      cast(s, lv) {
        const p = P(), m0 = SKILLS.whirlwind.dmg.mult(lv);
        Runes.zone({ skill: 'whirlwind', ref: p, x: p.x, y: p.y, r: 2, until: G.time + 2.5, every: 0.5, rgb: '220,230,255', tick: (z, ms) => { for (const m of ms) Runes.hit(m, s, m0 * K.ww_storm_tick); } });
        return false;
      } },
  ]);
  Runes.add('shield_throw', [
    { id: 'shield_throw.ricochet', name: 'Ricochet', intent: 'pack', glyph: '⟳', col: '#ffe08a',
      short: `Bounces to 2 more, ${pc(K.st_bounce)}% each · main ${pc(K.st_main)}%`,
      desc: () => L(`โล่เด้งต่อไปอีก 2 ตัวที่อยู่ใกล้ (ห่างไม่เกิน 3.5 ช่อง) ตัวแรก ${pc(K.st_main)}% ตัวที่เด้งไป ${pc(K.st_bounce)}%`,
        `The shield bounces to 2 more nearby enemies (within 3.5 cells). First hit ${pc(K.st_main)}%, each bounce ${pc(K.st_bounce)}%.`),
      est: 1,
      victims: (s, t) => { const v = [t]; let prev = t; for (let i = 0; i < 2; i++) { const n = others(prev, 3.5, 1, v)[0]; if (!n) break; v.push(n); prev = n; } return v; },
      targets(s, lv, t) {
        if (!t) return false;
        skillHitOne(s, lv, t, K.st_main);
        const hit = [t]; let prev = t;
        for (let i = 0; i < 2; i++) {
          const n = others(prev, 3.5, 1, hit)[0]; if (!n) break;
          hit.push(n); const from = prev;
          later(0.3 + 0.22 * i, () => { if (!n.dead) Runes.fly(from.x, from.y, n, 0.2, '255,225,140', () => skillDeliver(s, lv, n, K.st_bounce), { size: 10, arc: 14 }); });
          prev = n;
        }
        return true;
      } },
    { id: 'shield_throw.boomerang', name: 'Boomerang', intent: 'single', glyph: '↩', col: '#ffe08a',
      short: `Hits twice, ${pc(K.st_boom)}% each · pulls target 2 cells in`,
      desc: () => L(`โล่บินกลับมาหา ฟาดเป้าซ้ำอีกครั้งตอนขากลับ (ครั้งละ ${pc(K.st_boom)}%) และลากเป้าเข้าหาเรา 2 ช่อง`,
        `The shield flies back, striking the target again on the return (${pc(K.st_boom)}% each) and dragging it 2 cells toward you.`),
      est: 2 * 0.55,
      targets(s, lv, t) {
        if (!t) return false;
        skillHitOne(s, lv, t, K.st_boom);
        later(0.55, () => {
          if (t.dead) return;
          const p = P();
          skillDeliver(s, lv, t, K.st_boom);
          Runes.pull(t, p.x, p.y, Math.max(1.2, U.dist(p.x, p.y, t.x, t.y) - 2));
          Runes.fly(t.x, t.y, p, 0.25, '255,225,140', () => {}, { size: 10, arc: 10 });
        });
        return true;
      } },
  ]);
  Runes.add('valhalla_oath', [
    { id: 'valhalla_oath.echo', name: 'Einherjar Echo', intent: 'both', glyph: 'ᛟ', col: '#ffe0a0',
      short: `Every 6th skill: ${pc(K.vo_echo)}% ATK sky strike · no SP cut`,
      desc: () => L(`ไม่ได้ส่วนลด SP อีก แต่ทุกสกิลที่ใช้ครบ 6 ครั้ง วิญญาณนักรบจะฟาดโล่ลงมาจากฟ้าใส่เป้า ${pc(K.vo_echo)}% ATK`,
        `No more SP discount, but every 6th skill you use calls a spectral warrior's shield down on your target for ${pc(K.vo_echo)}% ATK.`),
      mod: () => ({ passive: lv => ({ stunRes: 8 * lv, sp: 4 * lv }) }),
      onAnySkill(s, lv, t) {
        if (SKILLS[s.id].type !== 'active' || !Runes.count('vo_echo', 6)) return;
        const m = t && !t.dead ? t : curTgt(6); if (!m) return;
        Runes.fly(m.x, m.y - 4, m, 0.3, '255,230,150', () => { Runes.hit(m, S('valhalla_oath'), K.vo_echo, { type: 'phys', sureHit: true }); kick(3, 0.15); if (!fast()) addFx({ type: 'bash', skin: 'bash', x: m.x, y: m.y - 0.5, dur: 0.35 }); }, { size: 16 });
        say(m, 'ECHO', '#ffe0a0');
      } },
    { id: 'valhalla_oath.resolve', name: 'Resolve', intent: 'both', glyph: 'ᛉ', col: '#ffd27a',
      short: `10 hits taken → next skill +${pc(K.vo_res)}% · no stun resist`,
      desc: () => L(`ไม่ได้ต้านมึนอีก แต่ถูกโจมตีแล้วได้แต้ม "ใจเหล็ก" (วิละ 1 สูงสุด 10) — ครบ 10 แล้วสกิลถัดไปแรงขึ้น +${pc(K.vo_res)}% (ใช้แต้มหมด)`,
        `No more stun resistance, but being attacked builds Resolve (1 per second, max 10). At 10, your next skill hit deals +${pc(K.vo_res)}% (consumes them).`),
      mod: () => ({ passive: lv => ({ spCostPct: -4 * lv, sp: 4 * lv }) }),
      onAttacked() { const p = P(); p.rc = p.rc || {}; if ((p.rc.res || 0) >= 10 || !Runes.icd('vo_res', 1)) return; p.rc.res = (p.rc.res || 0) + 1; if (p.rc.res === 10) { say(p, 'RESOLVE ×10', '#ffd27a'); aura('255,210,120'); } },
      skillMul(s) { const p = P(); if (!s.dmg || !p.rc || (p.rc.res || 0) < 10) return 1; p.rc.res = 0; return 1 + K.vo_res; } },
  ]);

  // ===================== Rune Caster =====================
  Runes.add('rune_mastery', [
    { id: 'rune_mastery.overcharge', name: 'Overcharge', intent: 'single', glyph: 'ᛊ', col: '#8fd0ff',
      short: `Every 3rd spell echoes for ${pc(K.rm_echo)}% · ½ cast cut`,
      desc: () => L(`ลดเวลาร่ายได้แค่ครึ่งเดียว (3%×Lv) แต่ทุกคาถาครั้งที่ 3 จะยิงลูกพลังสะท้อนตามไปอีกลูก ${pc(K.rm_echo)}% ของคาถานั้น`,
        `Cast time reduction halved (3%×Lv), but every 3rd spell fires an echo bolt after it for ${pc(K.rm_echo)}% of that spell.`),
      mod: () => ({ passive: lv => ({ matkPct: 5 * lv, castPct: 3 * lv }) }),
      onAnySkill(s, lv, t) {
        if (!s.dmg || s.dmg.type !== 'magic' || !t || !Runes.count('rm_oc', 3)) return;
        const p = P();
        later(0.3, () => { if (!t.dead) Runes.fly(p.x, p.y, t, 0.25, '130,200,255', () => Runes.hit(t, s, s.dmg.mult(lv) * K.rm_echo, { type: 'magic', element: s.dmg.element }), { size: 14 }); });
        say(p, 'OVERCHARGE', '#8fd0ff');
      } },
    { id: 'rune_mastery.leyline', name: 'Leyline', intent: 'both', glyph: 'ᛝ', col: '#a0b8ff',
      short: `Stand still 1.2s: spells +${pc(K.rm_ley)}% · ½ cast cut`,
      desc: () => L(`ลดเวลาร่ายได้ครึ่งเดียว (3%×Lv) แต่ยืนนิ่ง 1.2 วิ จะเกิดวงเลย์ไลน์ใต้เท้า — คาถาทุกลูกแรงขึ้น +${pc(K.rm_ley)}% ตราบที่ยังไม่ขยับ`,
        `Cast time reduction halved (3%×Lv), but standing still for 1.2s draws a leyline under you — spells deal +${pc(K.rm_ley)}% for as long as you don't move.`),
      mod: () => ({ passive: lv => ({ matkPct: 5 * lv, castPct: 3 * lv }) }),
      tick() {
        const p = P(); p.rc = p.rc || {};
        if (p.moving || p.dead) { p.rc.leyAt = G.time; if (p.rc.leyFx) { p.rc.leyFx.t = p.rc.leyFx.dur; p.rc.leyFx = null; } return; }
        if (G.time - (p.rc.leyAt || 0) >= 1.2 && !p.rc.leyFx && !fast()) p.rc.leyFx = Runes.fx({ kind: 'zone', ref: p, r: 1.1, dur: 3600, col: '140,170,255', style: 'ice' });
      },
      skillMul(s) { const p = P(); return s.dmg && s.dmg.type === 'magic' && !p.moving && G.time - ((p.rc && p.rc.leyAt) || 0) >= 1.2 ? 1 + K.rm_ley : 1; } },
  ]);
  Runes.add('fire_rune', [
    { id: 'fire_rune.split', name: 'Split', intent: 'pack', glyph: '⁂', col: '#ff9050',
      short: `Splits in 3: 2 shards ${pc(K.fr_shard)}% each · main ${pc(K.fr_main)}%`,
      desc: () => L(`ลูกไฟแตกเป็น 3: ลูกหลักโดนเป้า ${pc(K.fr_main)}% (จุดไฟ) อีก 2 ลูกพุ่งไปหาตัวใกล้ ๆ (3.5 ช่อง) ลูกละ ${pc(K.fr_shard)}% (ไม่จุดไฟ)`,
        `The fire rune splits in 3: the main bolt hits for ${pc(K.fr_main)}% (ignites), and 2 shards seek nearby enemies (3.5 cells) for ${pc(K.fr_shard)}% each (no ignite).`),
      victims: (s, t) => [t, ...others(t, 3.5, 2)],
      targets(s, lv, t) {
        if (!t) return false;
        skillHitOne(s, lv, t, K.fr_main);
        const sh = Object.create(s); sh.dmg = Object.assign({}, s.dmg, { status: null }); // เศษไฟไม่จุดไฟ
        sh.presentationRune = 'fire_rune.split'; // Branch contact only; primary plasma hit retains its own art.
        for (const o of others(t, 3.5, 2)) later(0.3, () => { if (!o.dead && !t.dead) Runes.fly(t.x, t.y, o, 0.22, '255,140,50', () => skillDeliver(sh, lv, o, K.fr_shard), { size: 9, arc: 16, src: 'fire_rune', runeVariant: 'fire_rune.split' }); else if (!o.dead) skillDeliver(sh, lv, o, K.fr_shard); });
        return true;
      } },
    { id: 'fire_rune.kindle', name: 'Kindle', intent: 'single', glyph: 'ᚲ', col: '#ffa060',
      short: `Marks 6s: next other spell ${pc(K.fr_mark)}% · fire ${pc(K.fr_kindle)}%`,
      desc: () => L(`ไฟอ่อนลง (${pc(K.fr_kindle)}%) แต่ติดรอย "ประกายไฟ" 6 วิ: คาถาอื่นลูกถัดไปที่โดนตัวนั้นแรง ${pc(K.fr_mark)}% — สลับ ไฟ → น้ำแข็ง/สายฟ้า`,
        `Weaker fire (${pc(K.fr_kindle)}%) that leaves a Kindled mark for 6s: the next different spell to hit that enemy deals ${pc(K.fr_mark)}% — weave fire → ice/thunder.`),
      mod: base => ({ dmg: { mult: mul(base, 'fr_kindle') } }),
      onHit(s, lv, m, r) { if (!r.miss) Runes.mark(m, 'fire_rune', { k: K.fr_mark, dur: 6, glyph: 'ᚲ', rgb: '255,140,50', col: '#ffa060', label: 'KINDLED!', presentation: { src: 'fire_rune', runeVariant: 'fire_rune.kindle' } }); } },
  ]);
  Runes.add('ice_rune', [
    { id: 'ice_rune.lance', name: 'Glacial Lance', intent: 'pack', glyph: '⟶', col: '#9fe0ff',
      short: `Pierces a 10-cell line, ${pc(K.ir_lance)}% each`,
      desc: () => L(`หอกน้ำแข็งพุ่งทะลุทุกตัวในแนวเส้นตรงยาว 10 ช่อง ตัวละ ${pc(K.ir_lance)}% (ยังทำให้ช้า)`,
        `The ice lance pierces every enemy in a 10-cell line for ${pc(K.ir_lance)}% each (still slows).`),
      mod: base => ({ dmg: { line: true, mult: mul(base, 'ir_lance') } }) },
    { id: 'ice_rune.shatter', name: 'Shatter', intent: 'single', glyph: '❄', col: '#c0f0ff',
      short: `Shatters slowed foes for ${pc(K.ir_shat)}% · else ${pc(K.ir_base)}% + slow`,
      desc: () => L(`ถ้าเป้ากำลังช้าอยู่ หอกจะ "แตกกระจาย" แรง ${pc(K.ir_shat)}% และล้างอาการช้า • ถ้าไม่ช้า แรง ${pc(K.ir_base)}% แล้วทำให้ช้า — สลับ ช้า → แตก`,
        `If the target is Slowed, the lance Shatters it for ${pc(K.ir_shat)}% and clears the slow; otherwise it deals ${pc(K.ir_base)}% and slows — alternate slow → shatter.`),
      mod: base => ({ dmg: { status: null } }),
      hitMul(s, lv, m) { if (m.slowUntil > G.time) { m._shat = 1; return K.ir_shat; } m._shat = 0; return K.ir_base; },
      onHit(s, lv, m, r) {
        if (m._shat) { m._shat = 0; m.slowUntil = 0; say(m, 'SHATTER!', '#c0f0ff'); if (!fast()) {
          // Tag only this impact's authored overlay; retain all original effect clocks.
          for (const f of G.fx) if (f.skillArt && f.id === s.id && f.ref === m && f.t === 0) f.runeVariant = 'ice_rune.shatter';
          addFx({ type: 'coldbolt', src: 'ice_rune', runeVariant: 'ice_rune.shatter', ref: m, dur: 0.3 });
        } }
        else if (!r.miss && !m.dead) applyStatus(m, SKILLS.ice_rune.dmg.status, lv, r.dmg);
      } },
  ]);
  Runes.add('thunder_rune', [
    { id: 'thunder_rune.storm', name: 'Storm Call', intent: 'pack', glyph: 'ϟ', col: '#f0e060',
      short: `3 storm strikes of ${pc(K.tr_storm)}% · 2.5-cell area, 2.4s`,
      desc: () => L(`เรียกพายุค้างที่เป้า 2.4 วิ รัศมี 2.5 ช่อง ฟ้าผ่า 3 ครั้ง ครั้งละ ${pc(K.tr_storm)}% ใส่ทุกตัวที่ยังยืนในวง`,
        `Calls a storm over the target for 2.4s (2.5-cell radius): 3 strikes of ${pc(K.tr_storm)}% on everyone still standing inside.`),
      mod: () => ({ dmg: { area: 2.5 } }), est: 3 * 0.4,
      cast(s, lv, t) {
        const c = t || P(), x = c.x, y = c.y;
        const zone = Runes.zone({ skill: 'thunder_rune', x, y, r: 2.5, until: G.time + 2.4, every: 0.8, first: 0.15, rgb: '240,230,110', tick: (z, ms) => {
          // The original area tick owns both the hit and its visual pulse; no second timer.
          if (z.fx) { z.fx.pulseAt = G.time; z.fx.pulseCount = (z.fx.pulseCount || 0) + 1; }
          for (const m of ms) { if (!fast()) addFx({ type: 'lightning', src: 'thunder_rune', runeVariant: 'thunder_rune.storm', ref: m, dur: 0.3 }); skillDeliver(s, lv, m, K.tr_storm); }
        } });
        if (zone.fx) Object.assign(zone.fx, { src: 'thunder_rune', runeVariant: 'thunder_rune.storm', groundLayer: true });
        return true;
      } },
    { id: 'thunder_rune.focus', name: 'Focused Bolt', intent: 'single', glyph: '↯', col: '#fff080',
      short: `One bolt, ${pc(K.tr_focus)}% · single target only`,
      desc: () => L(`ไม่เป็นวงแล้ว รวมสายฟ้าเป็นลำเดียวใส่เป้าเดียว แรง ${pc(K.tr_focus)}%`,
        `No more area: all of Thor's lightning gathers into one bolt on a single target for ${pc(K.tr_focus)}%.`),
      mod: base => ({ dmg: { area: 0, mult: mul(base, 'tr_focus') } }),
      onHit(s, lv, m, r) { if (!r.miss) {
        const owner=G.fx.findLast(f=>f.elemental&&f.runeVariant==='thunder_rune.focus'&&f.focusTarget===m);
        if(owner){owner.focusHitAt=G.time;owner.focusContactAge=owner.t;}
        kick(5, 0.25); say(m, 'FOCUS!', '#fff080');
      } } },
  ]);
  Runes.add('earth_rune', [
    { id: 'earth_rune.fissure', name: 'Fissure', intent: 'pack', glyph: '⚡', col: '#d0a060',
      short: `Splits a 10-cell line, ${pc(K.er_fis)}% each`,
      desc: () => L(`แผ่นดินแยกเป็นแนวยาวจากตัวเราผ่านเป้า (10 ช่อง) ทุกตัวในแนว ${pc(K.er_fis)}% (ยังอาจมึน)`,
        `The ground splits in a line from you through the target (10 cells): everything on it takes ${pc(K.er_fis)}% (may still stun).`),
      mod: base => ({ vfx: 'fissure', dmg: { area: 0, line: true, mult: mul(base, 'er_fis') } }) },
    { id: 'earth_rune.boulder', name: 'Boulder', intent: 'single', glyph: '●', col: '#c09060',
      short: `${pc(K.er_boulder)}% + sure 1.5s stun · 0.8s delay, tiny area`,
      desc: () => L(`หินยักษ์ร่วงจากฟ้าใส่เป้าหลังเงาเตือน 0.8 วิ แรง ${pc(K.er_boulder)}% และมึนแน่นอน 1.5 วิ (โดนเฉพาะจุดเล็ก ๆ)`,
        `A boulder falls on the target after a 0.8s shadow: ${pc(K.er_boulder)}% and a guaranteed 1.5s stun (small impact point).`),
      mod: base => ({ vfx: null, dmg: { area: 0, mult: mul(base, 'er_boulder'), status: { kind: 'stun', chance: () => 100, dur: () => 1.5 } } }),
      cast(s, lv, t) {
        if (!t) return false;
        const x = t.x, y = t.y;
        const shadow = Runes.fx({ kind: 'sky', src: 'earth_rune', runeVariant: 'earth_rune.boulder', x, y, r: 0.9, dur: 0.8, col: '210,170,110' });
        later(0.8, () => { kick(5, 0.2); ring(x, y, 1, '210,170,110', 2, 0.45); for (const m of Runes.foes(x, y, 0.9)) skillDeliver(s, lv, m, 1);
          Runes.fx({ kind: 'boulder_impact', src: 'earth_rune', runeVariant: 'earth_rune.boulder', x, y, r: 0.9, dur: 0.65, seed: shadow.seed });
        });
        return true;
      } },
  ]);
  Runes.add('runic_ward', [
    { id: 'runic_ward.barrier', name: 'Rune Barrier', intent: 'both', glyph: 'ᛉ', col: '#7ab0ff',
      short: `Blocks 1 hit every ${K.rw_bar_cd}s · MaxHP only +2%×Lv`,
      desc: () => L(`MaxHP เพิ่มแค่ 2%×Lv แต่ทุก ${K.rw_bar_cd} วิ จะมีเกราะรูนกันการโดนตี 1 ครั้งเต็ม ๆ — เกราะแตกแล้วคลื่นรูนซัดศัตรูรอบตัว 2 ช่อง (โอกาส 1% มึน ${K.rw_stun} วิ)`,
        `MaxHP only +2%×Lv, but every ${K.rw_bar_cd}s a rune barrier fully blocks one hit — when it breaks, a rune pulse hits enemies within 2 cells (1% chance to stun for ${K.rw_stun}s).`),
      mod: () => ({ passive: lv => ({ hpPct: 2 * lv, spPct: 4 * lv, mdef: 2 * lv }) }),
      tick() { const p = P(); p.rc = p.rc || {}; if (!p.rc.barrier && G.time >= (p.rc.barAt || 0)) {
        p.rc.barrier = 1; const f=aura('120,170,255');
        Object.assign(f,{src:'runic_ward',runeVariant:'runic_ward.barrier'});
      } },
      onHurt(m, dmg) {
        const p = P(); if (!p.rc || !p.rc.barrier) return dmg;
        p.rc.barrier = 0; p.rc.barAt = G.time + K.rw_bar_cd;
        ring(p.x, p.y, 2, '120,170,255', 3, 0.5);
        if(!fast()){const f=G.fx.findLast(f=>f.type==='ring'&&f.t===0&&f.x===p.x&&f.y===p.y);if(f)Object.assign(f,{src:'runic_ward',runeVariant:'runic_ward.barrier'});}
        say(p, 'BARRIER!', '#9fc8ff');
        for (const o of Runes.foes(p.x, p.y, 2)) Runes.tryStun(o, K.rw_stun);
        return 0;
      } },
    { id: 'runic_ward.feedback', name: 'Feedback', intent: 'both', glyph: 'ϟ', col: '#b0d0ff',
      short: `${pc(K.rw_fb_ch)}% to zap attackers ${pc(K.rw_fb)}% MATK · no MDEF`,
      desc: () => L(`ไม่ได้ MDEF แต่ทุกครั้งที่ถูกโจมตี มีโอกาส ${pc(K.rw_fb_ch)}% ช็อตตัวที่ตีด้วยสายฟ้า ${pc(K.rw_fb)}% MATK`,
        `No MDEF, but whenever you're attacked there's a ${pc(K.rw_fb_ch)}% chance to zap the attacker with lightning for ${pc(K.rw_fb)}% MATK.`),
      mod: () => ({ passive: lv => ({ hpPct: 4 * lv, spPct: 4 * lv }) }),
      onAttacked(m) { if (!U.chance(K.rw_fb_ch) || !Runes.icd('rw_fb', 0.4)) return;
        if (!fast()) { const p=P();addFx({ type: 'lightning', src:'runic_ward', runeVariant:'runic_ward.feedback', feedbackOrigin:{x:p.x,y:p.y,facing:p.facing||1}, ref: m, dur: 0.3 }); }
        Runes.hit(m, S('runic_ward'), K.rw_fb, { type: 'magic', element: 'wind' });
      } },
  ]);

  // ===================== Wildhunter =====================
  Runes.add('eagle_eye', [
    { id: 'eagle_eye.focus', name: 'Hawk Focus', intent: 'single', glyph: '◉', col: '#c8e080',
      short: `Same target: +${pc(K.ee_focus)}% per shot (×5) · no range`,
      desc: () => L(`ไม่ได้ระยะธนูเพิ่ม แต่ยิงตัวเดิมต่อเนื่องได้สแต็ก "เล็ง" ครั้งละ +${pc(K.ee_focus)}% (สูงสุด 5) — เปลี่ยนเป้าเริ่มใหม่`,
        `No bonus bow range, but each consecutive basic shot at the same target stacks Focus +${pc(K.ee_focus)}% (max 5) — switching targets resets it.`),
      mod: () => ({ passive: lv => ({ hit: 3 * lv, dex: lv }) }),
      basicMul(m) { const p = P(); p.rc = p.rc || {}; if (p.rc.focusT !== m) { p.rc.focusT = m; p.rc.focusN = 0; } const n = Math.min(5, p.rc.focusN || 0); p.rc.focusN = n + 1; if (n === 4) say(m, 'FOCUS ×5', '#c8e080'); return 1 + K.ee_focus * n; } },
    { id: 'eagle_eye.scatter', name: 'Scatter Shot', intent: 'pack', glyph: '⋔', col: '#e0d080',
      short: `Every 3rd arrow +2 splinters ${pc(K.ee_scatter)}% · main ${pc(K.ee_main)}%`,
      desc: () => L(`ไม่ได้ HIT เพิ่ม และลูกธนูปกติทุกดอกที่ 3 จะแตก: ดอกหลักเหลือ ${pc(K.ee_main)}% แต่แตกอีก 2 ดอกไปหาตัวใกล้ ๆ (4 ช่อง) ดอกละ ${pc(K.ee_scatter)}% ATK`,
        `No bonus HIT, and every 3rd basic arrow splinters: the main arrow deals ${pc(K.ee_main)}%, plus 2 splinters at nearby enemies (4 cells) for ${pc(K.ee_scatter)}% ATK each.`),
      mod: () => ({ passive: lv => ({ range: Math.ceil(lv / 2), dex: lv }) }), // ระยะครึ่งเดียว (2026-10-08): ระยะเต็มทำให้ตีฝูง +13% เกินเกณฑ์ 12% (ถอดระยะ = +8.4%)
      basicMul() { if (!Runes.count('ee_sc', 3)) return 1; P().rc.scat = 1; return K.ee_main; },
      afterBasic(m) {
        const p = P(); if (!p.rc || !p.rc.scat) return; p.rc.scat = 0;
        for (const o of others(m, 4, 2)) Runes.fly(m.x, m.y, o, 0.15, '240,225,170', () => Runes.hit(o, S('eagle_eye'), K.ee_scatter, { type: 'phys' }), { size: 7 });
      } },
  ]);
  Runes.add('piercing_arrow', [
    { id: 'piercing_arrow.volley', name: 'Volley', intent: 'single', glyph: '⫸', col: '#e8c070',
      short: `3-arrow volley, ${pc(K.pa_vol)}% each · no pierce`,
      desc: () => L(`ไม่ทะลุแล้ว ยิงรัว 3 ดอกติดใส่เป้าเดียว ดอกละ ${pc(K.pa_vol)}%`,
        `No longer pierces: fires a rapid volley of 3 arrows into one target, ${pc(K.pa_vol)}% each.`),
      mod: () => ({ dmg: { line: false } }), est: 3 * 0.38,
      victims: (s, t) => [t],
      targets(s, lv, t) { if (!t) return false; for (let i = 0; i < 3; i++) later(i * 0.2, () => { if (!t.dead) skillHitOne(s, lv, t, K.pa_vol); }); return true; } },
    { id: 'piercing_arrow.fan', name: 'Fan Shot', intent: 'pack', glyph: '⋀', col: '#f0d890',
      short: `Fan of 3 piercing arrows · ${pc(K.pa_fan)}% each, 25° spread`,
      desc: () => L(`ยิง 3 ดอกเป็นรูปพัด (กาง 25°) ทุกดอกทะลุแนว ตัวละ ${pc(K.pa_fan)}% (ตัวเดียวกันโดนแค่ดอกเดียว)`,
        `Fires 3 piercing arrows in a 25° fan, ${pc(K.pa_fan)}% to each enemy struck (each enemy is hit only once).`),
      victims: (s, t) => { const p = P(), v = new Set(); for (const a of [-0.44, 0, 0.44]) { const b = Math.atan2(t.y - p.y, t.x - p.x) + a; for (const m of inLine(p.x, p.y, Math.cos(b), Math.sin(b), skillRange(s) + 1)) v.add(m); } return [...v]; },
      targets(s, lv, t) {
        if (!t) return false;
        const p = P(), reach = skillRange(s) + 1, hit = new Set();
        [-0.44, 0, 0.44].forEach((a, i) => {
          const b = Math.atan2(t.y - p.y, t.x - p.x) + a, ux = Math.cos(b), uy = Math.sin(b);
          if (!fast()) addFx({ type: 'arrow', sx: p.x, sy: p.y - 0.6, tx: p.x + ux * reach, ty: p.y + uy * reach, dur: 0.25, big: true });
          for (const m of inLine(p.x, p.y, ux, uy, reach)) if (!hit.has(m)) { hit.add(m); later(0.04 * hit.size + i * 0.02, () => skillHitOne(s, lv, m, K.pa_fan)); }
        });
        return true;
      } },
  ]);
  Runes.add('wolf_companion', [
    { id: 'wolf_companion.twins', name: 'Twin Wolves', intent: 'pack', glyph: 'ᚹ', col: '#c8d0e0',
      short: `2 wolves, 2nd hunts another foe · ${pc(K.wc_twin)}% power each`,
      desc: () => L(`เรียกหมาป่า 2 ตัว (ตัวละ ${pc(K.wc_twin)}% ของพลังเดิม) ตัวที่สองจะไปกัดมอนตัวอื่นที่ไม่ใช่เป้าของเรา`,
        `Summons 2 wolves (${pc(K.wc_twin)}% power each). The second one hunts a different monster than your target.`),
      cast() {
        const p = P(), w = G.allies.find(a => a.kind === 'wolf'); if (!w) return false;
        w.split = false;
        w.pow = K.wc_twin; w.def = Object.assign({}, w.def, { size: 0.72 });
        if (!G.allies.some(a => a.kind === 'wolf' && a !== w && a.split && !a.dead && a.hp > 0 && a.until > G.time)) {
          const near = { x: p.x - 0.8, y: p.y };
          const pos = G.map.walkable(Math.floor(near.x), Math.floor(near.y)) ? near : G.map.nearestWalkable(near.x, near.y);
          G.allies.push(Object.assign({}, w, { x: pos.x, y: pos.y, path: [], target: null, split: true, seed: Math.random(), def: Object.assign({}, w.def, { color: '#a8a8b8' }) }));
        }
        return false;
      } },
    { id: 'wolf_companion.alpha', name: 'Alpha Hunt', intent: 'single', glyph: '🐾', col: '#d0e0ff',
      short: `Bites mark: next bow skill ${pc(K.wc_mark)}% · bite ${pc(K.wc_alpha)}%`,
      desc: () => L(`หมาป่ากัดเบาลง (${pc(K.wc_alpha)}%) แต่ทุกคำที่กัดติดรอย "ล่า" — สกิลธนูถัดไปที่โดนตัวนั้นแรง ${pc(K.wc_mark)}%`,
        `The wolf bites softer (${pc(K.wc_alpha)}%) but every bite marks the prey as Hunted — your next bow skill on it deals ${pc(K.wc_mark)}%.`),
      cast() { const w = G.allies.find(a => a.kind === 'wolf'); if (w) w.pow = K.wc_alpha; return false; },
      wolf(a, t) { if (!t.dead && !(t.rmark && t.rmark.by !== 'wolf_companion' && t.rmark.until > G.time)) Runes.mark(t, 'wolf_companion', { k: K.wc_mark, dur: 4, glyph: 'ᚹ', rgb: '200,220,255', col: '#d0e0ff', label: 'HUNTED!' }); } },
  ]);
  Runes.add('blast_trap', [
    { id: 'blast_trap.shrapnel', name: 'Shrapnel', intent: 'pack', glyph: '✹', col: '#ffb060',
      short: `Blast 2.3 cells (from 1.5), ${pc(K.bt_sh)}%`,
      desc: () => L(`กับดักระเบิดเป็นสะเก็ดวงกว้าง 2.3 ช่อง (เดิม 1.5) แรง ${pc(K.bt_sh)}% — ดักทั้งฝูงที่วิ่งตามมา`,
        `The trap bursts into shrapnel over 2.3 cells (normally 1.5) at ${pc(K.bt_sh)}% power — catches the whole chasing pack.`),
      trap: () => ({ r: 2.3, k: K.bt_sh, done: t => { for (let i = 0; i < 3; i++) { const a = i * 2.1; if (!fast()) addFx({ type: 'firering', x: t.x + Math.cos(a) * 1.1, y: t.y + Math.sin(a) * 1.1, dur: 0.45, r: 0.9 }); } } }) },
    { id: 'blast_trap.hurl', name: 'Hurl', intent: 'single', glyph: '➶', col: '#ff9040',
      short: `Thrown at target (6 cells) · ${pc(K.bt_hurl)}%, small blast`,
      desc: () => L(`โยนกับดักไปใต้เท้าเป้า (ไกลสุด 6 ช่อง) ติดทันที ระเบิดวงเล็ก 1.4 ช่อง แรง ${pc(K.bt_hurl)}% (โอกาส 1% มึน 1.2 วิ)`,
        `Hurls the trap under your target (up to 6 cells); it arms at once, blasts a small 1.4-cell area for ${pc(K.bt_hurl)}% (1% chance to stun for 1.2s).`),
      cast() {
        const p = P(), t = G.traps[G.traps.length - 1], m = curTgt(6);
        if (t && m && U.dist(p.x, p.y, m.x, m.y) <= 6.3) { Runes.fly(p.x, p.y, { x: m.x, y: m.y }, 0.25, '255,150,60', () => {}, { size: 8, arc: 30 }); t.x = m.x; t.y = m.y; t.armed = G.time + 0.3; }
        return false;
      },
      trap: () => ({ r: 1.4, k: K.bt_hurl, after: m => { Runes.tryStun(m, 1.2); } }) },
  ]);
  Runes.add('charge_arrow', [
    { id: 'charge_arrow.harpoon', name: 'Harpoon', intent: 'single', glyph: '⥂', col: '#d0b080',
      short: `Pulls target in + 2s slow, ${pc(K.ca_harp)}% · no knockback`,
      desc: () => L(`แทนการผลักออก ลูกธนูมีเชือกดึงเป้าเข้ามาหาเรา (เหลือ 1.2 ช่อง) และทำให้ช้า 2 วิ ดาเมจ ${pc(K.ca_harp)}%`,
        `Instead of knocking back, a roped arrow yanks the target in to 1.2 cells and slows it for 2s. ${pc(K.ca_harp)}% damage.`),
      mod: base => ({ dmg: { knockback: 0, mult: mul(base, 'ca_harp') } }),
      onHit(s, lv, m, r) { if (r.miss || m.dead) return; const p = P(); Runes.pull(m, p.x, p.y, 1.2); if (!m.isPlayer) m.slowUntil = Math.max(m.slowUntil || 0, G.time + 2); say(m, 'HOOKED!', '#d0b080'); } },
    { id: 'charge_arrow.concussion', name: 'Concussion', intent: 'pack', glyph: '✸', col: '#ffe0a0',
      short: `${pc(K.ca_conc)}% blast, knocks all back · main ${pc(K.ca_main)}%`,
      desc: () => L(`ลูกธนูระเบิดเมื่อโดน: เป้า ${pc(K.ca_main)}% ตัวอื่นในรัศมี 1.6 ช่อง ${pc(K.ca_conc)}% และทุกตัวกระเด็นถอย 2 ช่อง`,
        `The arrow explodes on impact: the target takes ${pc(K.ca_main)}%, others within 1.6 cells ${pc(K.ca_conc)}%, and all are blown back 2 cells.`),
      mod: () => ({ dmg: { knockback: 2 } }),
      ...splash(1.6, 'ca_main', 'ca_conc', t => ring(t.x, t.y, 1.6, '255,230,170', 2, 0.5)) },
  ]);
  Runes.add('hunters_rhythm', [
    { id: 'hunters_rhythm.flurry', name: 'Flurry', intent: 'single', glyph: '⇉', col: '#b0e080',
      short: `Every 4th shot +1 arrow ${pc(K.hr_fl)}% ATK · no crit dmg`,
      desc: () => L(`ไม่ได้แรงคริติคอลเพิ่ม แต่ยิงปกติทุกดอกที่ 4 จะมีดอกที่สองตามไปติด ๆ ${pc(K.hr_fl)}% ATK`,
        `No bonus critical damage, but every 4th basic shot is followed by a second arrow for ${pc(K.hr_fl)}% ATK.`),
      mod: () => ({ passive: lv => ({ aspdPct: 2 * lv }) }),
      afterBasic(m) { if (!Runes.count('hr_fl', 4)) return; const p = P(); later(0.1, () => { if (!m.dead) Runes.fly(p.x, p.y, m, 0.15, '220,255,170', () => Runes.hit(m, S('hunters_rhythm'), K.hr_fl, { type: 'phys' }), { size: 7 }); }); } },
    { id: 'hunters_rhythm.momentum', name: 'Momentum', intent: 'both', glyph: '»', col: '#90f070',
      short: `Kill: +${K.hr_mom}% ASPD 6s (×3) · no base ASPD`,
      desc: () => L(`ไม่ได้ความเร็วโจมตีถาวร แต่ล่ามอนได้ 1 ตัว = เร็วขึ้น +${K.hr_mom}% 6 วิ (ซ้อน 3 ชั้น) — ล่าต่อเนื่องยิ่งเร็ว`,
        `No permanent attack speed, but each kill grants +${K.hr_mom}% attack speed for 6s (stacks 3×) — keep the hunt rolling.`),
      mod: () => ({ passive: lv => ({ critDmgPct: 4 * lv }) }),
      onAnyKill() { const b = Runes.giveBuff('momentum', 'hunters_rhythm', 6, { aspdPct: K.hr_mom }, 3); aura('150,240,110'); say(P(), `MOMENTUM ×${b.stacks}`, '#90f070'); } },
  ]);

  // ===================== Völva =====================
  Runes.add('sanctuary', [
    { id: 'sanctuary.hallowed', name: 'Hallowed Ground', intent: 'both', glyph: '✥', col: '#ffe890',
      short: `Stand still: foes slow, hit ${pc(K.sa_weak)}% softer · ½ regen`,
      desc: () => L(`ฟื้นฟู HP ได้ครึ่งเดียว แต่ยืนนิ่งระหว่างสู้ พื้นรอบตัว 2.2 ช่องจะศักดิ์สิทธิ์: ศัตรูในวงช้าลงครึ่งหนึ่ง และตีเราเบาลง ${pc(K.sa_weak)}%`,
        `Half the regen, but while you stand still in combat the ground within 2.2 cells turns holy: enemies inside are slowed by half and hit you ${pc(K.sa_weak)}% softer.`),
      mod: () => ({ passive: lv => ({ regenPct: (1 + 0.5 * lv) / 2, mdef: lv }) }),
      tick() {
        const p = P(); p.rc = p.rc || {};
        if (p.moving || Runes.combatLeft() <= 0) { p.rc.halAt = G.time + 1; if (p.rc.halFx) { p.rc.halFx.t = p.rc.halFx.dur; p.rc.halFx = null; } return; }
        if (G.time < (p.rc.halAt || 0)) return;
        p.rc.halAt = G.time + 0.5; p.rc.hal = G.time + 0.6;
        if (!p.rc.halFx && !fast()) p.rc.halFx = Runes.fx({ kind: 'zone', ref: p, r: 2.2, dur: 3600, col: '255,230,140', style: 'ring' });
        for (const o of Runes.foes(p.x, p.y, 2.2)) if (!o.isPlayer && !o.def.boss) o.slowUntil = Math.max(o.slowUntil || 0, G.time + 0.6);
      },
      onHurt(m, dmg) { const p = P(); return p.rc && p.rc.hal > G.time && U.dist(m.x, m.y, p.x, p.y) <= 2.4 ? Math.max(1, Math.round(dmg * (1 - K.sa_weak))) : dmg; } },
    { id: 'sanctuary.radiance', name: 'Radiance', intent: 'single', glyph: '☀', col: '#fff0a0',
      short: `Holy ray every 5s, ${pc(K.sa_rad)}% MATK · no regen bonus`,
      desc: () => L(`ไม่ได้ฟื้นฟู HP เพิ่ม แต่ระหว่างสู้ แสงจากฟ้าส่องลงเป้าของเราทุก 5 วิ ${pc(K.sa_rad)}% MATK (ศักดิ์สิทธิ์)`,
        `No bonus regen, but in combat a ray of light strikes your target every 5s for ${pc(K.sa_rad)}% MATK (Holy).`),
      mod: () => ({ passive: lv => ({ mdef: lv }) }),
      tick() {
        const p = P(); p.rc = p.rc || {};
        if (Runes.combatLeft() <= 0 || G.time < (p.rc.radAt || 0)) return;
        const m = p.target && !p.target.dead ? p.target : null; if (!m) return;
        p.rc.radAt = G.time + 5;
        if (!fast()) addFx({ type: 'holy', ref: m, dur: 0.5 });
        Runes.hit(m, S('sanctuary'), K.sa_rad, { type: 'magic', element: 'holy' });
      } },
  ]);
  Runes.add('light_of_freyja', [
    { id: 'light_of_freyja.dazzle', name: 'Dazzle', intent: 'both', glyph: '✹', col: '#a0ffa0',
      short: `Knocks foes back, 1% stun · heal 60%`,
      desc: () => L(`ฮีลเหลือ 60% แต่แสงวาบออกรอบตัว 2.5 ช่อง ผลักศัตรูถอย (ไม่ใช่บอส) โอกาส 1% ตาพร่ามึน ${K.lf_daze} วิ — ฮีลกลางวงล้อมได้ปลอดภัย`,
        `Heals only 60%, but the light flashes out (2.5 cells): enemies are pushed back (not bosses) with a 1% chance to be dazzled (stunned) for ${K.lf_daze}s — a safe heal in the middle of a mob.`),
      mod: base => ({ heal: (lv, d, p) => Math.floor(base.heal(lv, d, p) * 0.6) }),
      cast() {
        const p = P(); ring(p.x, p.y, 2.5, '255,240,150', 3, 0.6);
        for (const o of Runes.foes(p.x, p.y, 2.5)) { if (o.isPlayer) { Runes.tryStun(o, K.lf_daze); continue; } if (o.def.boss) continue; knockback(o, p.x, p.y, 1); if (Runes.tryStun(o, K.lf_daze)) say(o, 'Dazzled', '#fff0a0'); }
        return false;
      } },
    { id: 'light_of_freyja.favor', name: "Freyja's Favor", intent: 'single', glyph: '❦', col: '#ffe0a0',
      short: `Next Holy Spear instant, ${pc(K.lf_fav)}% · heal 70%`,
      desc: () => L(`ฮีลเหลือ 70% แต่ได้ "พรเฟรยา" 8 วิ: Holy Spear ลูกถัดไปร่ายทันที (ไม่มีเวลาร่าย) แรง ${pc(K.lf_fav)}%`,
        `Heals only 70%, but grants Freyja's Favor for 8s: your next Holy Spear is cast instantly (no cast time) at ${pc(K.lf_fav)}%.`),
      always: true,
      mod: base => ({ heal: (lv, d, p) => Math.floor(base.heal(lv, d, p) * 0.7) }),
      cast() { const p = P(); p.rc = p.rc || {}; p.rc.favor = G.time + 8; aura('255,225,150'); return false; },
      castMul(id) { const p = P(); return id === 'holy_spear' && p.rc && p.rc.favor > G.time ? 0 : 1; },
      onAnySkill(s) { const p = P(); if (s.id === 'holy_spear' && p.rc && p.rc.favor > G.time) { p.rc.favor = 0; p.rc.favHit = 1; say(p, 'FAVOR', '#ffe0a0'); } },
      skillMul(s) { const p = P(); if (s.id === 'holy_spear' && p.rc && p.rc.favHit) { p.rc.favHit = 0; return K.lf_fav; } return 1; } },
  ]);
  Runes.add('blessing_of_odin', [
    { id: 'blessing_of_odin.ravens', name: 'Huginn & Muninn', intent: 'single', glyph: '𐌗', col: '#b0b8d0',
      short: `Ravens peck ${pc(K.bo_raven)}% MATK every 1.5s · no INT`,
      desc: () => L(`ไม่ได้ INT (ได้แค่ STR/DEX) แต่อีกา 2 ตัวของโอดินบินวนรอบตัว จิกเป้าของเราทุก 1.5 วิ ${pc(K.bo_raven)}% MATK ตลอดเวลาที่บัฟอยู่`,
        `No INT (only STR/DEX), but Odin's two ravens circle you and peck your target every 1.5s for ${pc(K.bo_raven)}% MATK while the blessing lasts.`),
      mod: () => ({ buff: { stats: lv => ({ str: 2 * lv, dex: 2 * lv }) } }),
      tick() {
        const p = P(); p.rc = p.rc || {};
        if (G.time < (p.rc.ravAt || 0)) return;
        const m = p.target && !p.target.dead ? p.target : (Runes.combatLeft() > 0 ? Runes.nearest(p.x, p.y, 8) : null); if (!m) return;
        p.rc.ravAt = G.time + 1.5;
        Runes.fly(p.x + (Math.random() - 0.5), p.y - 1.4, m, 0.3, '60,60,90', () => Runes.hit(m, S('blessing_of_odin'), K.bo_raven, { type: 'magic' }), { size: 9, arc: 22 });
      } },
    { id: 'blessing_of_odin.gungnir', name: 'Gungnir', intent: 'pack', glyph: '↟', col: '#fff0b0',
      short: `Holy Spear splashes ${pc(K.bo_storm)}% (1.8 cells) · no stats`,
      desc: () => L(`พรไม่ให้สเตตัสเลย แต่ระหว่างบัฟ Holy Spear ทุกลูกแตกแสงกระเซ็นใส่ศัตรูรอบเป้า 1.8 ช่อง ตัวละ ${pc(K.bo_storm)}% ของหอก`,
        `The blessing grants no stats, but while it lasts every Holy Spear splashes light onto enemies within 1.8 cells of the target for ${pc(K.bo_storm)}% of the spear.`),
      mod: () => ({ buff: { stats: () => ({}) } }),
      onAnyHit(m, r, s, lv) {
        if (!s || s.id !== 'holy_spear' || r.miss) return;
        const os = others(m, 1.8, 4); if (!os.length) return;
        ring(m.x, m.y, 1.8, '255,240,170', 1, 0.4);
        for (const o of os) Runes.hit(o, s, s.dmg.mult(lv) * K.bo_storm, { type: 'magic', element: 'holy' });
      } },
  ]);
  Runes.add('holy_spear', [
    { id: 'holy_spear.lance', name: 'Lance of Light', intent: 'pack', glyph: '⟶', col: '#fff6c0',
      short: `Pierces a 10-cell line, ${pc(K.hs_lance)}% each`,
      desc: () => L(`หอกแสงพุ่งทะลุทุกตัวในแนวเส้นตรงยาว 10 ช่อง ตัวละ ${pc(K.hs_lance)}%`,
        `The spear of light pierces every enemy in a 10-cell line, ${pc(K.hs_lance)}% each.`),
      mod: base => ({ dmg: { line: true, mult: mul(base, 'hs_lance') } }) },
    { id: 'holy_spear.judgment', name: 'Judgment', intent: 'single', glyph: '⇓', col: '#ffe890',
      short: `No cast time, lands after 0.7s · ${pc(K.hs_judg)}% dmg`,
      desc: () => L(`ไม่ต้องร่ายแล้ว (ขยับได้) — หอกตกจากฟ้าใส่เป้าหลังวงเตือน 0.7 วิ แรง ${pc(K.hs_judg)}%`,
        `No cast time (keep moving) — the spear falls from the sky onto the target after a 0.7s warning circle for ${pc(K.hs_judg)}%.`),
      mod: base => ({ cast: () => 0, dmg: { mult: mul(base, 'hs_judg') } }),
      cast(s, lv, t) {
        if (!t) return false;
        Runes.fx({ kind: 'sky', ref: t, r: 0.8, dur: 0.7, col: '255,235,150' });
        later(0.7, () => { if (t.dead) return; if (!fast()) addFx({ type: 'holy', ref: t, dur: 0.5 }); kick(3, 0.15); skillDeliver(s, lv, t, 1); });
        return true;
      } },
  ]);
  Runes.add('divine_shield', [
    { id: 'divine_shield.retribution', name: 'Retribution', intent: 'pack', glyph: '☩', col: '#c0e0ff',
      short: `Reflects ${pc(K.ds_ret)}% of damage taken · ½ DEF/MDEF`,
      desc: () => L(`DEF/MDEF ที่ได้ลดครึ่ง แต่ระหว่างโล่ ดาเมจที่โดนตี ${pc(K.ds_ret)}% สะท้อนกลับใส่ตัวที่ตีเป็นแสงศักดิ์สิทธิ์ — ยิ่งโดนรุมแรงยิ่งสะท้อนแรง`,
        `Half the DEF/MDEF, but while shielded ${pc(K.ds_ret)}% of the damage you take is reflected onto the attacker as holy light — the harder the mob hits, the harder it burns.`),
      mod: () => ({ buff: { stats: lv => ({ def: 2 * lv, mdef: 2 * lv }) } }),
      onHurt(m, dmg) {
        const back = Math.round(dmg * K.ds_ret * elemMod('holy', m.def.element || 'neutral'));
        if (back > 0 && !m.dead) { if (!fast()) addFx({ type: 'holy', ref: m, dur: 0.45 }); damageMob(m, back, { color: '#fff6a0', src: 'divine_shield' }); }
        return dmg;
      } },
    { id: 'divine_shield.shell', name: 'Sanctified Shell', intent: 'both', glyph: '◯', col: '#e0f0ff',
      short: `Shell absorbs ${pc(K.ds_shell)}% MaxHP · no DEF/MDEF`,
      desc: () => L(`ไม่ได้ DEF/MDEF แต่ได้เปลือกแสงดูดซับดาเมจ ${pc(K.ds_shell)}% ของ MaxHP — เปลือกแตกแล้วฟื้น HP 10%`,
        `No DEF/MDEF; instead a shell of light absorbs damage equal to ${pc(K.ds_shell)}% of MaxHP — when it breaks you recover 10% HP.`),
      mod: () => ({ buff: { stats: () => ({}) } }),
      cast() { const p = P(); p.rc = p.rc || {}; p.rc.shell = Math.round(p.d.maxHp * K.ds_shell); aura('220,240,255'); return false; },
      onHurt(m, dmg) {
        const p = P(); if (!p.rc || !(p.rc.shell > 0)) return dmg;
        const a = Math.min(p.rc.shell, dmg); p.rc.shell -= a;
        say(p, L(`ดูดซับ ${a}`, `Absorb ${a}`), '#e0f0ff');
        if (p.rc.shell <= 0) { ring(p.x, p.y, 1.2, '220,240,255', 2, 0.5); healPlayer(Math.round(p.d.maxHp * 0.1), 'Shell'); }
        return dmg - a;
      } },
  ]);
  Runes.add('freyjas_grace', [
    { id: 'freyjas_grace.smite', name: 'Smite', intent: 'single', glyph: '⚚', col: '#fff0a0',
      short: `Every 4th Holy Spear: ${pc(K.fg_smite)}% pillar · no heal bonus`,
      desc: () => L(`ไม่ได้ฮีลแรงขึ้น แต่ Holy Spear ทุกครั้งที่ 4 ที่โดน จะเรียกเสาแสงลงซ้ำ ${pc(K.fg_smite)}% MATK`,
        `No healing bonus, but every 4th Holy Spear hit calls a pillar of light down on the target for ${pc(K.fg_smite)}% MATK.`),
      mod: () => ({ passive: lv => ({ spPct: 4 * lv, mdef: lv }) }),
      onAnyHit(m, r, s) {
        if (!s || s.id !== 'holy_spear' || r.miss || !Runes.count('fg_sm', 4)) return;
        later(0.2, () => { if (m.dead) return; if (!fast()) addFx({ type: 'holy', ref: m, dur: 0.6 }); kick(3, 0.15); Runes.hit(m, S('freyjas_grace'), K.fg_smite, { type: 'magic', element: 'holy' }); say(m, 'SMITE', '#fff0a0'); });
      } },
    { id: 'freyjas_grace.overflow', name: 'Overflow', intent: 'both', glyph: '❂', col: '#b0ffb0',
      short: `Overheal becomes a barrier · max ${pc(K.fg_cap)}% MaxHP, no MaxSP`,
      desc: () => L(`ไม่ได้ MaxSP เพิ่ม แต่ฮีลส่วนที่ล้นเกิน HP เต็ม กลายเป็นเกราะแสงดูดซับดาเมจ (สูงสุด ${pc(K.fg_cap)}% ของ MaxHP, 10 วิ)`,
        `No MaxSP bonus, but overhealing turns into a light barrier that absorbs damage (up to ${pc(K.fg_cap)}% of MaxHP, 10s).`),
      mod: () => ({ passive: lv => ({ healPct: 6 * lv, mdef: lv }) }),
      onAnySkill(s, lv, t) {
        if (!s.heal || t) return;
        const p = P(), amt = Math.floor(s.heal(lv, p.d, p) * (1 + p.d.healPct / 100) * masteryMul(s.id));
        const over = amt - (p.d.maxHp - (Runes._hp0 == null ? p.hp : Runes._hp0)); if (over <= 0) return;
        p.rc = p.rc || {}; p.rc.ovf = Math.min(Math.round(p.d.maxHp * K.fg_cap), (p.rc.ovfUntil > G.time ? p.rc.ovf || 0 : 0) + over); p.rc.ovfUntil = G.time + 10;
        aura('170,255,170'); say(p, L(`เกราะ ${p.rc.ovf}`, `Barrier ${p.rc.ovf}`), '#b0ffb0');
      },
      onHurt(m, dmg) {
        const p = P(); if (!p.rc || !(p.rc.ovf > 0) || !(p.rc.ovfUntil > G.time)) return dmg;
        const a = Math.min(p.rc.ovf, dmg); p.rc.ovf -= a; return dmg - a;
      } },
  ]);

  // ===================== Loki's Trickster =====================
  Runes.add('shadow_step', [
    { id: 'shadow_step.afterimage', name: 'Afterimage', intent: 'pack', glyph: '⧉', col: '#c0a0ff',
      short: `Dodge → counter ${pc(K.ss_after)}% ATK · FLEE only +3×Lv`,
      desc: () => L(`FLEE เพิ่มแค่ 3×Lv แต่ทุกครั้งที่หลบการโจมตีได้ ภาพติดตาจะฟันสวนตัวนั้น ${pc(K.ss_after)}% ATK (ทุก 0.6 วิ)`,
        `FLEE only +3×Lv, but every time you dodge an attack your afterimage slashes the attacker for ${pc(K.ss_after)}% ATK (every 0.6s).`),
      mod: () => ({ passive: lv => ({ flee: 3 * lv, crit: 2 * lv, atk: 4 * lv }) }),
      onAttacked(m, hit) { if (hit || !Runes.icd('ss_ai', 0.6)) return; if (!fast()) addFx({ type: 'crit', x: m.x, y: m.y - 0.5, dur: 0.3 }); Runes.hit(m, S('shadow_step'), K.ss_after, { type: 'phys', sureHit: true }); say(m, 'Afterimage', '#c0a0ff'); } },
    { id: 'shadow_step.rhythm', name: 'Shadow Rhythm', intent: 'single', glyph: '♪', col: '#d0b0ff',
      short: `Every 4th basic: sure crit ${pc(K.ss_rhythm)}% · no CRIT`,
      desc: () => L(`ไม่ได้ CRIT เพิ่ม แต่ตีปกติทุกครั้งที่ 4 เป็น "ฟันเงา": คริติคอลแน่นอน (ไม่พลาด ทะลุ DEF) ที่แรง ${pc(K.ss_rhythm)}% — คริได้ตามจังหวะ ไม่ต้องลุ้นดวง`,
        `No bonus CRIT, but every 4th basic attack is a Shadow Cut: a guaranteed critical (never misses, ignores DEF) at ${pc(K.ss_rhythm)}% power — crits on rhythm, not luck.`),
      mod: () => ({ passive: lv => ({ flee: 5 * lv, atk: 4 * lv }) }),
      basicMul() { if (Runes.count('ss_rh', 4)) { Runes._crit = true; P().rc.rhy = 1; return K.ss_rhythm; } return 1; },
      afterBasic(m) { const p = P(); if (p.rc && p.rc.rhy) { p.rc.rhy = 0; say(m, 'SHADOW CUT', '#d0b0ff'); } } },
  ]);
  Runes.add('backstab', [
    { id: 'backstab.leap', name: 'Shadow Leap', intent: 'single', glyph: '⤳', col: '#c080ff',
      short: `Blink behind from 5 cells · ${pc(K.bs_leap)}% of ambush dmg`,
      desc: () => L(`ใช้ได้ไกล 5 ช่อง: หายตัวไปโผล่ข้างหลังเป้าแล้วแทง นับเป็น "ยังไม่รู้ตัว" เสมอ แต่แรง ${pc(K.bs_leap)}% ของค่านั้น`,
        `Usable from 5 cells: vanish and reappear behind the target to stab. Always counts as unaware, at ${pc(K.bs_leap)}% of that damage.`),
      mod: base => ({ melee: false, range: 5, dmg: { mult: mul(base, 'bs_leap'), multAware: null } }),
      cast(s, lv, t) { if (t) blinkBehind(t); return false; } },
    { id: 'backstab.arc', name: 'Gutting Arc', intent: 'pack', glyph: '⌒', col: '#e080a0',
      short: `Arc hits all within 1.4 for ${pc(K.bs_arc)}% · main ${pc(K.bs_main)}%`,
      desc: () => L(`ฟันเป็นวงโค้ง: เป้าหลัก ${pc(K.bs_main)}% และทุกตัวรอบเป้า 1.4 ช่อง ${pc(K.bs_arc)}% ของดาเมจเดิม (ยังไม่พลาด)`,
        `Carves an arc: the target takes ${pc(K.bs_main)}% and every enemy within 1.4 cells of it takes ${pc(K.bs_arc)}% of normal damage (still never misses).`),
      ...splash(1.4, 'bs_main', 'bs_arc', t => { if (!fast()) addFx({ type: 'whirl', x: t.x, y: t.y, dur: 0.4, r: 1.4 }); }) },
  ]);
  Runes.add('smoke_veil', [
    { id: 'smoke_veil.bomb', name: 'Smoke Bomb', intent: 'pack', glyph: '☁', col: '#b090e0',
      short: `Smoke 2.2 cells 4s: ${pc(K.sv_bomb)}% ATK/s · no stealth`,
      desc: () => L(`ไม่หายตัวแล้ว (ไม่มีลอบโจมตี) แต่ขว้างระเบิดควันพิษรัศมี 2.2 ช่อง 4 วิ ศัตรูในควันโดน ${pc(K.sv_bomb)}% ATK ทุกวินาที และตีเราพลาดบ่อยขึ้น`,
        `No stealth (no ambush), but you throw a toxic smoke bomb (2.2 cells, 4s): enemies inside take ${pc(K.sv_bomb)}% ATK every second and miss you more.`),
      mod: () => ({ special: null }), role: 'trap',
      cast() { const p = P(); (p.rc = p.rc || {}).smoke = { x: p.x, y: p.y, until: G.time + 4 }; Runes.zone({ skill: 'smoke_veil', x: p.x, y: p.y, r: 2.2, until: G.time + 4, every: 1, rgb: '170,130,220', tick: (z, ms) => { for (const m of ms) Runes.hit(m, S('smoke_veil'), K.sv_bomb, { type: 'phys', sureHit: true, color: '#c080ff' }); } }); return false; },
      always: true,
      onHurt(m, dmg) { const p = P(), z = p.rc && p.rc.smoke; return z && z.until > G.time && U.dist(m.x, m.y, z.x, z.y) <= 2.2 && U.chance(0.3) ? 0 : dmg; } },
    { id: 'smoke_veil.dance', name: 'Shadow Dance', intent: 'single', glyph: '☾', col: '#a080ff',
      short: `Next skill in 5s deals ${pc(K.sv_dance)}% · stealth 2s`,
      desc: () => L(`หายตัวแค่ 2 วิ แต่ภายใน 5 วิ สกิลโจมตีถัดไปแรง ${pc(K.sv_dance)}% (ลอบโจมตีด้วยสกิลแทนตีปกติ)`,
        `Stealth lasts only 2s, but within 5s your next attack skill deals ${pc(K.sv_dance)}% (ambush with a skill instead of a basic attack).`),
      always: true,
      mod: () => ({ dur: () => 2 }),
      cast() { const p = P(); p.rc = p.rc || {}; p.rc.dance = G.time + 5; aura('170,130,255'); return false; },
      skillMul(s) { const p = P(); if (!s.dmg || !p.rc || !(p.rc.dance > G.time)) return 1; p.rc.dance = 0; say(p, 'SHADOW DANCE', '#a080ff'); return K.sv_dance; } },
  ]);
  Runes.add('venom_blade', [
    { id: 'venom_blade.contagion', name: 'Contagion', intent: 'pack', glyph: '☣', col: '#90e060',
      short: `Poisoned kills spread poison · ½ ATK`,
      desc: () => L('ATK ที่ได้ลดครึ่ง แต่มอนที่ตายขณะติดพิษ จะระเบิดพิษติดต่อไปทุกตัวรอบ ๆ 2.5 ช่อง (พิษ 8 วิ)',
        'Half the ATK bonus, but a monster that dies while poisoned bursts, spreading poison to everything within 2.5 cells (8s).'),
      mod: () => ({ buff: { stats: lv => ({ atk: 4 * lv, venom: 10 + 5 * lv }) } }),
      onAnyKill(m) {
        if (!(m.poisonUntil > G.time)) return;
        ring(m.x, m.y, 2.5, '140,230,90', 2, 0.5);
        for (const o of Runes.foes(m.x, m.y, 2.5)) if (!o.isPlayer && o.def.element !== 'undead') { o.poisonUntil = Math.max(o.poisonUntil || 0, G.time + 8); if (!(o.poisonTick > G.time)) o.poisonTick = G.time + 1; say(o, 'Poison!', '#c080ff'); }
      } },
    { id: 'venom_blade.envenom', name: 'Envenom', intent: 'single', glyph: '⚗', col: '#b0f070',
      short: `Skills detonate poison for ${pc(K.vb_env)}% ATK · ends poison`,
      desc: () => L(`สกิลโจมตีที่โดนเป้าที่ติดพิษ จะ "จุดระเบิดพิษ" ทันที ${pc(K.vb_env)}% ATK แล้วพิษหายไป — ติดพิษใหม่แล้วจุดซ้ำ`,
        `Attack skills that hit a poisoned target detonate the venom for ${pc(K.vb_env)}% ATK at once, ending the poison — re-poison and repeat.`),
      onAnyHit(m, r, s) {
        if (!s || !s.dmg || r.miss || m.dead || m.isPlayer || !(m.poisonUntil > G.time)) return;
        m.poisonUntil = 0;
        if (!fast()) addFx({ type: 'crit', x: m.x, y: m.y - 0.5, dur: 0.35 });
        Runes.hit(m, S('venom_blade'), K.vb_env, { type: 'phys', sureHit: true, color: '#b0f070' }); say(m, 'ENVENOM!', '#b0f070');
      } },
  ]);
  Runes.add('throwing_knife', [
    { id: 'throwing_knife.fan', name: 'Fan of Knives', intent: 'pack', glyph: '⋔', col: '#d8d8f0',
      short: `3 knives: 2 extra at ${pc(K.tk_fan)}% · main ${pc(K.tk_fmain)}%`,
      desc: () => L(`ปามีด 3 เล่มพร้อมกัน: เป้า ${pc(K.tk_fmain)}% และอีก 2 ตัวที่ใกล้ที่สุด (ในระยะ 6) เล่มละ ${pc(K.tk_fan)}% (เฉพาะเล่มแรกติดพิษได้)`,
        `Throws 3 knives at once: ${pc(K.tk_fmain)}% at the target and ${pc(K.tk_fan)}% each at the 2 nearest other enemies (within 6; only the first can poison).`),
      victims: (s, t) => { const p = P(); return [t, ...others(t, 99, 9).filter(o => U.dist(o.x, o.y, p.x, p.y) <= 6).slice(0, 2)]; },
      targets(s, lv, t) {
        if (!t) return false;
        const p = P(), v = [t, ...others(t, 99, 9).filter(o => U.dist(o.x, o.y, p.x, p.y) <= 6).slice(0, 2)];
        const sx = Object.create(s); sx.dmg = Object.assign({}, s.dmg, { status: null }); // มีดเสริมไม่ติดพิษ
        v.forEach((m, i) => later(i * 0.05, () => { if (!m.dead) skillHitOne(i ? sx : s, lv, m, i ? K.tk_fan : K.tk_fmain); }));
        return true;
      } },
    { id: 'throwing_knife.expose', name: 'Expose', intent: 'single', glyph: '✕', col: '#e0a0ff',
      short: `Marks 5s: next other skill ${pc(K.tk_mark)}% · knife ${pc(K.tk_main)}%`,
      desc: () => L(`มีดเบาลง (${pc(K.tk_main)}%) แต่ติดรอย "เปิดจุดตาย" 5 วิ: สกิลอื่นถัดไปที่โดนตัวนั้น (เช่น Backstab) แรง ${pc(K.tk_mark)}%`,
        `A lighter knife (${pc(K.tk_main)}%) that Exposes the target for 5s: your next other skill on it (e.g. Backstab) deals ${pc(K.tk_mark)}%.`),
      mod: base => ({ dmg: { mult: mul(base, 'tk_main') } }),
      onHit(s, lv, m, r) { if (!r.miss) Runes.mark(m, 'throwing_knife', { k: K.tk_mark, dur: 5, glyph: '✕', rgb: '220,160,255', col: '#e0a0ff', label: 'EXPOSED!' }); } },
  ]);
  Runes.add('lokis_gambit', [
    { id: 'lokis_gambit.double', name: 'Double Down', intent: 'single', glyph: '⚂', col: '#c090ff',
      short: `Crit: ${pc(K.lg_dbl_ch)}% to strike again ${pc(K.lg_dbl)}% · no crit dmg`,
      desc: () => L(`ไม่ได้แรงคริติคอลเพิ่ม แต่ทุกครั้งที่คริ มีโอกาส ${pc(K.lg_dbl_ch)}% ฟันซ้ำทันทีอีกที ${pc(K.lg_dbl)}% ATK`,
        `No bonus critical damage, but every critical has a ${pc(K.lg_dbl_ch)}% chance to strike again at once for ${pc(K.lg_dbl)}% ATK.`),
      mod: () => ({ passive: lv => ({ crit: lv, speedPct: 2 * lv }) }),
      onAnyHit(m, r) { if (!r || !r.crit || m.dead || !U.chance(K.lg_dbl_ch)) return; later(0.15, () => { if (m.dead) return; if (!fast()) addFx({ type: 'crit', x: m.x, y: m.y - 0.5, dur: 0.3 }); Runes.hit(m, S('lokis_gambit'), K.lg_dbl, { type: 'phys', sureHit: true }); say(m, 'DOUBLE!', '#c090ff'); }); } },
    { id: 'lokis_gambit.mirage', name: 'Mirage', intent: 'pack', glyph: '⧉', col: '#e090ff',
      short: `Crits slash a nearby foe ${pc(K.lg_mir)}% ATK · no CRIT/speed`,
      desc: () => L(`ไม่ได้ CRIT และความเร็วเดิน แต่ทุกครั้งที่คริ ภาพลวงของโลกิจะฟันมอนอีกตัวที่ใกล้ที่สุด (3 ช่อง) ${pc(K.lg_mir)}% ATK`,
        `No bonus CRIT or move speed, but every critical sends a Loki mirage to slash the nearest other enemy (3 cells) for ${pc(K.lg_mir)}% ATK.`),
      mod: () => ({ passive: lv => ({ critDmgPct: 6 * lv }) }),
      onAnyHit(m, r) { if (!r || !r.crit) return; const o = others(m, 3, 1)[0]; if (!o) return; Runes.fly(m.x, m.y, o, 0.15, '220,140,255', () => { Runes.hit(o, S('lokis_gambit'), K.lg_mir, { type: 'phys', sureHit: true }); if (!fast()) addFx({ type: 'crit', x: o.x, y: o.y - 0.5, dur: 0.3 }); }, { size: 10 }); } },
  ]);

  // ===================== Berserker =====================
  Runes.add('wolf_blood', [
    { id: 'wolf_blood.price', name: 'Blood Price', intent: 'both', glyph: '♦', col: '#ff6060',
      short: `HP skills: +${K.wb_price}% dmg 8s (×5) · no low-HP bonus`,
      desc: () => L(`ไม่แรงขึ้นตาม HP ที่หายแล้ว แต่ทุกครั้งที่จ่ายเลือดใช้สกิล ได้สแต็ก "ค่าเลือด" +${K.wb_price}% ดาเมจกายภาพ 8 วิ (ซ้อน 5) — แรงได้แม้เลือดเต็ม`,
        `No more bonus from missing HP; instead each HP-costing skill grants a Blood Price stack: +${K.wb_price}% physical damage for 8s (stacks 5×) — strong even at full HP.`),
      mod: () => ({ passive: lv => ({ hpPct: 2 * lv }) }),
      onAnySkill(s) { if (!SKILLS[s.id].hpCost) return; const b = Runes.giveBuff('bprice', 'wolf_blood', 8, { atkPct: K.wb_price }, 5); aura('255,80,80'); say(P(), `BLOOD ×${b.stacks}`, '#ff6060'); } },
    { id: 'wolf_blood.feral', name: 'Feral', intent: 'pack', glyph: '≋', col: '#ff9050',
      short: `Kill: heal 3%, +${K.wb_feral}% ASPD (×3) · ½ low-HP bonus`,
      desc: () => L(`แรงจาก HP ที่หายเหลือครึ่ง แต่ฆ่ามอนได้ = ฟื้น HP 3% และเร็วขึ้น +${K.wb_feral}% 5 วิ (ซ้อน 3)`,
        `Half the bonus from missing HP, but each kill restores 3% HP and grants +${K.wb_feral}% attack speed for 5s (stacks 3×).`),
      mod: () => ({ passive: lv => ({ rage: 5 * lv, hpPct: 2 * lv }) }),
      onAnyKill() { const p = P(), b = Runes.giveBuff('feral', 'wolf_blood', 5, { aspdPct: K.wb_feral }, 3); if (p.hp < p.d.maxHp) healPlayer(Math.round(p.d.maxHp * 0.03), 'Feral'); aura('255,140,80'); say(p, `FERAL ×${b.stacks}`, '#ff9050'); } },
  ]);
  Runes.add('rage_strike', [
    { id: 'rage_strike.cleave', name: 'Cleave', intent: 'pack', glyph: '⌓', col: '#ff7040',
      short: `Cleaves ${pc(K.rs_cleave)}% within 1.5 cells · main ${pc(K.rs_main)}%`,
      desc: () => L(`ฟาดกวาด: เป้าหลัก ${pc(K.rs_main)}% และทุกตัวรอบเป้า 1.5 ช่อง ${pc(K.rs_cleave)}% ของดาเมจเดิม`,
        `A sweeping blow: the target takes ${pc(K.rs_main)}% and every enemy within 1.5 cells of it takes ${pc(K.rs_cleave)}% of normal damage.`),
      ...splash(1.5, 'rs_main', 'rs_cleave', t => { if (!fast()) addFx({ type: 'whirl', x: t.x, y: t.y, dur: 0.35, r: 1.5 }); }) },
    { id: 'rage_strike.execute', name: 'Execute', intent: 'single', glyph: '☠', col: '#ff4040',
      short: `${pc(K.rs_exe_hi)}% vs <35% HP · else ${pc(K.rs_exe_lo)}%`,
      desc: () => L(`ปกติแรง ${pc(K.rs_exe_lo)}% แต่ถ้าเป้าเหลือเลือดต่ำกว่า 35% จะ "ประหาร" แรง ${pc(K.rs_exe_hi)}%`,
        `Normally ${pc(K.rs_exe_lo)}%, but against a target below 35% HP it Executes for ${pc(K.rs_exe_hi)}%.`),
      hitMul(s, lv, m) { if (m.hp / Math.max(1, m.maxHp) < 0.35) { say(m, 'EXECUTE!', '#ff4040'); kick(4, 0.15); return K.rs_exe_hi; } return K.rs_exe_lo; } },
  ]);
  Runes.add('blood_frenzy', [
    { id: 'blood_frenzy.bloodlust', name: 'Bloodlust', intent: 'single', glyph: '⇈', col: '#ff5050',
      short: `Each basic +${K.bf_lust}% ASPD (×10) · no base ASPD`,
      desc: () => L(`เริ่มต้นไม่ได้ความเร็วโจมตี แต่ระหว่างคลั่ง ตีปกติทุกครั้ง +${K.bf_lust}% ความเร็วโจมตี (ซ้อน 10) — ยิ่งตียิ่งเร็ว`,
        `No attack speed up front, but during the frenzy every basic attack adds +${K.bf_lust}% attack speed (stacks 10×) — the longer you swing, the faster.`),
      mod: () => ({ buff: { stats: lv => ({ atk: 5 * lv }) } }),
      afterBasic() { const p = P(), b = p.buffs.blood_frenzy; if (!b) return; const r = Runes.giveBuff('lust', 'blood_frenzy', b.until - G.time, { aspdPct: K.bf_lust }, 10); if (r.stacks === 10 && !(p.rc && p.rc.lust10)) { (p.rc = p.rc || {}).lust10 = 1; say(p, 'BLOODLUST ×10', '#ff5050'); } if (r.stacks < 10 && p.rc) p.rc.lust10 = 0; } },
    { id: 'blood_frenzy.rampage', name: 'Rampage', intent: 'pack', glyph: '✺', col: '#ff3030',
      short: `Kills burst ${pc(K.bf_ramp)}% ATK in 2 cells · ½ ASPD`,
      desc: () => L(`ความเร็วโจมตีที่ได้ลดครึ่ง แต่ระหว่างคลั่ง มอนที่เราฆ่าจะระเบิดเลือดใส่ตัวรอบ ๆ 2 ช่อง ${pc(K.bf_ramp)}% ATK`,
        `Half the attack speed, but during the frenzy every monster you kill bursts in blood, hitting enemies within 2 cells for ${pc(K.bf_ramp)}% ATK.`),
      mod: () => ({ buff: { stats: lv => ({ aspdPct: (5 + 3 * lv) / 2, atk: 5 * lv }) } }),
      onAnyKill(m) { if (!fast()) addFx({ type: 'firering', x: m.x, y: m.y, dur: 0.45, r: 2 }); for (const o of Runes.foes(m.x, m.y, 2)) Runes.hit(o, S('blood_frenzy'), K.bf_ramp, { type: 'phys', sureHit: true, color: '#ff6060' }); } },
  ]);
  Runes.add('howl', [
    { id: 'howl.rend', name: 'Rending Howl', intent: 'pack', glyph: '≈', col: '#ff8080',
      short: `Bleed 3s, ${pc(K.hw_tick)}%/s · no stun, ${pc(K.hw_rend)}% hit`,
      desc: () => L(`ไม่ทำให้มึนแล้ว (ดาเมจแรก ${pc(K.hw_rend)}%) แต่ทุกตัวที่โดนเลือดออก 3 วิ วิละ ${pc(K.hw_tick)}%`,
        `No longer stuns (initial ${pc(K.hw_rend)}%), but everything hit bleeds for 3s, ${pc(K.hw_tick)}% per second.`),
      mod: base => ({ dmg: { status: null, mult: mul(base, 'hw_rend') } }),
      onHit(s, lv, m, r) { if (r.miss) return; const m0 = SKILLS.howl.dmg.mult(lv); for (let i = 1; i <= 3; i++) later(i, () => { if (!m.dead) Runes.hit(m, s, m0 * K.hw_tick, { sureHit: true, color: '#ff6060' }); }); } },
    { id: 'howl.challenge', name: 'Blood Challenge', intent: 'single', glyph: 'ᚺ', col: '#ff6a4a',
      short: `Next skill on target ${pc(K.hw_mark)}% + 4% HP · howl ${pc(K.hw_chal)}%`,
      desc: () => L(`หอนเบาลง (${pc(K.hw_chal)}%) แต่ท้าเป้าของเรา: สกิลถัดไปที่โดนตัวนั้นแรง ${pc(K.hw_mark)}% และดูด HP คืน 4%`,
        `A weaker howl (${pc(K.hw_chal)}%) that challenges your target: your next skill on it deals ${pc(K.hw_mark)}% and restores 4% HP.`),
      mod: base => ({ dmg: { mult: mul(base, 'hw_chal') } }),
      onHit(s, lv, m, r) { const p = P(); if (r.miss || m !== p.target) return; Runes.mark(m, 'howl', { k: K.hw_mark, dur: 6, glyph: 'ᚺ', rgb: '255,90,70', col: '#ff8a6a', label: 'BLOOD!', onConsume: () => { const q = P(); if (q.hp < q.d.maxHp) healPlayer(Math.round(q.d.maxHp * 0.04), 'Blood'); } }); } },
  ]);
  Runes.add('axe_throw', [
    { id: 'axe_throw.boomerang', name: 'Boomerang Axe', intent: 'pack', glyph: '⟲', col: '#ffa060',
      short: `Pierces 6-cell line and back · ${pc(K.ax_boom)}% per pass`,
      desc: () => L(`ขวานหมุนทะลุทุกตัวในแนว (6 ช่อง) แล้วหมุนกลับมาฟันซ้ำทั้งแนว ครั้งละ ${pc(K.ax_boom)}%`,
        `The axe spins through every enemy in a 6-cell line, then whirls back through them again — ${pc(K.ax_boom)}% per pass.`),
      mod: () => ({ dmg: { line: true } }), est: 2 * 0.55,
      targets(s, lv, t) {
        if (!t) return false;
        const p = P(), dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, reach = skillRange(s) + 1;
        const v = inLine(p.x, p.y, ux, uy, reach);
        v.forEach((m, i) => later(i * 0.05, () => { if (!m.dead) skillHitOne(s, lv, m, K.ax_boom); }));
        later(0.6, () => {
          const q = P(); Runes.fly(q.x + ux * reach, q.y + uy * reach, q, 0.3, '255,160,80', () => {}, { size: 12, arc: 8 });
          v.forEach((m, i) => later(0.05 * (v.length - i), () => { if (!m.dead) { skillDeliver(s, lv, m, K.ax_boom); if (!fast()) addFx({ type: 'bash', skin: 'bash', x: m.x, y: m.y - 0.5, dur: 0.3 }); } }));
        });
        return true;
      } },
    { id: 'axe_throw.leap', name: 'Leap Strike', intent: 'single', glyph: '⤒', col: '#ff8040',
      short: `Leap to target, ${pc(K.ax_leap)}% + sure 1s stun`,
      desc: () => L(`กระโจนตามขวานไปถึงตัวเป้า ฟาดลงพร้อมกัน ${pc(K.ax_leap)}% และมึนแน่นอน 1 วิ`,
        `Leap after your axe and land on the target with it: ${pc(K.ax_leap)}% and a guaranteed 1s stun.`),
      mod: base => ({ dmg: { mult: mul(base, 'ax_leap'), status: { kind: 'stun', chance: () => 100, dur: () => 1 } } }),
      cast(s, lv, t) { if (t) { dashTo(t, 1.0, '255,140,80'); kick(4, 0.2); } return false; } },
  ]);
  Runes.add('bloodthirst', [
    { id: 'bloodthirst.hemorrhage', name: 'Hemorrhage', intent: 'single', glyph: '❖', col: '#ff3050',
      short: `5th hit on a foe: ${pc(K.bt_hem)}% ATK burst · ½ drain/ATK%`,
      desc: () => L(`ดูดเลือดและดาเมจ % ได้ครึ่งเดียว แต่ตีกายภาพโดนตัวเดิมครบ 5 ครั้ง เป้าจะ "เลือดทะลัก" ${pc(K.bt_hem)}% ATK`,
        `Half the drain and damage %, but every 5th physical hit on the same enemy makes it Hemorrhage for ${pc(K.bt_hem)}% ATK.`),
      mod: () => ({ passive: lv => ({ leech: 0.3 * lv, atkPct: lv }) }),
      onAnyHit(m, r) {
        if (!r || !r.phys || r.miss || m.dead) return;
        m.rbleed = (m.rbleed || 0) + 1; if (m.rbleed < 5) return;
        m.rbleed = 0;
        Runes.hit(m, S('bloodthirst'), K.bt_hem, { type: 'phys', sureHit: true, color: '#ff4060' }); say(m, 'HEMORRHAGE', '#ff3050');
        Runes.fx({ kind: 'burst', ref: m, dur: 0.45, col: '255,60,80' });
      } },
    { id: 'bloodthirst.spray', name: 'Blood Spray', intent: 'pack', glyph: '⁘', col: '#ff5060',
      short: `Every 6th hit: ${pc(K.bt_spray)}% splash 1.8 cells · no drain`,
      desc: () => L(`ไม่ดูดเลือดแล้ว แต่ตีกายภาพทุกครั้งที่ 6 เลือดสาดใส่มอนตัวอื่นรอบเป้า 1.8 ช่อง ตัวละ ${pc(K.bt_spray)}% ATK`,
        `No more drain, but every 6th physical hit sprays blood on the other enemies within 1.8 cells of the target for ${pc(K.bt_spray)}% ATK each.`),
      mod: () => ({ passive: lv => ({ atkPct: 2 * lv }) }),
      onAnyHit(m, r) {
        if (!r || !r.phys || r.miss || !Runes.count('bt_sp', 6)) return;
        const os = others(m, 1.8, 6); if (!os.length) return;
        if (!fast()) addFx({ type: 'firering', x: m.x, y: m.y, dur: 0.4, r: 1.8 });
        for (const o of os) Runes.hit(o, S('bloodthirst'), K.bt_spray, { type: 'phys', sureHit: true, color: '#ff6070' });
      } },
  ]);
})();
