'use strict';
// ============================================================
//  ระบบบอท (Auto Hunt): ล่ามอนสเตอร์ ใช้สกิล นั่งพัก เก็บของ อัตโนมัติ (ยาใช้ระบบปั๊มยา autoPotTick ร่วมกับการเล่นเอง)
//  ทำงานต่อได้แม้สลับแท็บ (จำลองย้อนหลังเมื่อกลับมา สูงสุด 10 นาที)
//  ตัดสินใจจากข้อมูลใน SKILLS ล้วน ๆ (heal / buff / dmg.area / dmg.at / special) → สกิลใหม่ใช้ได้ทันทีไม่ต้องแก้บอท
// ============================================================

const HP_POTS = ['white_potion', 'yellow_potion', 'orange_potion', 'mead', 'meat', 'red_potion', 'red_herb', 'carrot', 'apple', 'green_herb'];
const SP_POTS = ['blue_potion', 'mead', 'grape'];

const Bot = {
  on: false, nextThink: 0, pauseUntil: 0, resting: false, blacklist: new Map(),
  tgt: null, tgtHp: 0, progAt: 0, stillAt: 0, lastX: 0, lastY: 0, wanderAt: 0, warnedTown: false,
  kiteAt: 0, kiteUntil: 0, fails: 0, failAt: 0, restMoveAt: 0, restMoveUntil: 0, pickSince: 0, badDrops: new Set(),
  intentRef: null, intentAt: 0, restForHp: false,
  stats: null,

  defaults() {
    return { skills: {}, restHp: 35, restSp: 10, healAt: 60, useBuffs: true, avoidMvp: true,
      radius: 14, returnHome: true,
      rest: true, style: 'skills', leash: false, skipMobs: {}, skillHp: {} };
  },
  cfg() {
    // แก้ "ในที่เดิม" เสมอ: ถ้าสร้างอ็อบเจกต์ใหม่ทุกครั้ง ค่าที่ผู้เล่นเพิ่งปรับ (ผ่านตัวเลื่อนที่ถืออ็อบเจกต์เก่า) จะหาย
    const o = G.player.options;
    if (!o.bot || typeof o.bot !== 'object') o.bot = {};
    const d = this.defaults();
    for (const k in d) if (!(k in o.bot)) o.bot[k] = d[k];
    if ('restock' in o.bot) { delete o.bot.restock; delete o.bot.restockQty; } // ระบบกลับเมืองซื้อยาเองถูกเอาออก (ผู้เล่นซื้อเอง)
    return o.bot;
  },

  unlocked() { return G.player && G.player.job !== 'novice'; },
  toggle(force) {
    const p = G.player;
    const want = force != null ? force : !this.on;
    if (want && p.dead) { UI.msg(L('ฟื้นคืนชีพก่อนจึงจะเปิดบอทได้', 'Revive first before turning on the bot'), 'err'); return; }
    // ช่วงแรกให้เล่นเอง: บอทปลดล็อกเมื่ออัปเกรด Class แรกแล้ว
    if (want && !this.unlocked()) { UI.msg(L(`🔒 บอท AUTO ปลดล็อกเมื่ออัปเกรด Class แรก (Job Lv ${JOB_CHANGE_LV} แล้วคุยกับ Mimir AI)`, `🔒 The AUTO bot unlocks with your first class (reach Job Lv ${JOB_CHANGE_LV}, then talk to Mimir AI)`), 'err'); return; }
    this.on = want;
    this.resting = false; this.pauseUntil = 0; this.warnedTown = false; this.manual = false; this.userTgt = null;
    this.reset();
    if (want) {
      this.setAnchor(true);
      this.stats = { start: G.time, kills: 0, bexp: 0, jexp: 0, items: 0, zenyStart: p.zeny };
      UI.msg(L('▶ เริ่มบอทล่ามอนสเตอร์อัตโนมัติ (แตะ AUTO อีกครั้งเพื่อหยุด)', '▶ Auto hunt started (tap AUTO again to stop)'), 'sys');
      if (G.map.def.kind === 'town') UI.msg(L('บอทจะเริ่มทำงานเมื่อออกไปยังแผนที่ที่มีมอนสเตอร์', 'The bot starts once you head out to a map with monsters'), 'info');
    } else {
      p.sitting = false;
      UI.msg(L('■ หยุดบอทแล้ว', '■ Auto hunt stopped'), 'sys');
    }
    UI.updateBotButton();
    UI.dirty();
  },
  // ล้างความจำระยะสั้นของบอท (เป้าหมาย ตัวที่ข้าม การถอย ฯลฯ)
  reset() {
    this.blacklist.clear(); this.badDrops.clear();
    this.tgt = null; this.progAt = this.stillAt = G.time; this.kiteAt = this.kiteUntil = 0;
    this.fails = 0; this.restMoveAt = this.restMoveUntil = 0; this.intentRef = null;
  },
  // ขอบเขตการล่า: วงรัศมี radius รอบจุดที่เปิดบอท (หรือกด "ตั้งศูนย์กลางที่นี่")
  anchor: null,
  setAnchor(quiet) {
    const p = G.player;
    if (G.map.def.kind === 'town') { this.anchor = null; return; }
    this.anchor = { map: G.map.id, x: p.x, y: p.y };
    if (!quiet) UI.msg(L('ตั้งศูนย์กลางขอบเขตการล่าที่ตำแหน่งนี้แล้ว', 'Hunting zone centred here'), 'info');
  },
  zone() {
    const c = this.cfg();
    if (!c.leash) return null;
    if (!this.anchor || this.anchor.map !== G.map.id) this.setAnchor(true); // เปลี่ยนแมพ = ตั้งศูนย์กลางใหม่
    return this.anchor && { x: this.anchor.x, y: this.anchor.y, r: c.radius };
  },
  // ผู้เล่นสั่งเดินเอง → หยุดบอทชั่วคราว
  // ผู้เล่นสั่งเอง (เดิน/แตะ/คุย/เก็บของ) ระหว่าง AUTO → ฟังผู้เล่นก่อนเสมอ (เจ้าของ 2026-10-03):
  //   บอทหยุดคิดจนกว่าคำสั่งนั้นจะจบ (เดินถึง / คุยเสร็จ / เก็บของแล้ว / มอนที่เลือกตาย) แล้วรออีก 3 วิ ค่อยกลับมาล่าต่อ
  //   ถ้าเปิดขอบเขตการล่า (leash) → ใช้ตำแหน่งที่ผู้เล่นพาไปเป็นศูนย์กลางใหม่ (ไม่เดินย้อนกลับที่เดิม)
  manual: false, userTgt: null,
  manualOverride() {
    if (!this.on) return;
    this.manual = true; this.userTgt = null;
    this.pauseUntil = G.time + 3;
    this.resting = false;
    this.tgt = null;
  },
  userTarget(m) { // ผู้เล่นแตะเลือกมอนเอง: ตีตัวนี้จนตาย บอทไม่เปลี่ยนเป้า
    if (!this.on) return;
    this.manual = true; this.userTgt = m; this.tgt = m;
    this.pauseUntil = G.time + 0.5; this.resting = false;
  },
  manualBusy() {
    const p = G.player;
    return p.path.length > 0 || !!p.npcTarget || !!p.pickTarget || !!p.cast || !!p.skillIntent || (this.userTgt && !this.userTgt.dead && p.target === this.userTgt);
  },
  onKill(m) {
    if (this.on && this.stats) this.stats.kills++;
  },
  onExp(b, j) {
    if (this.on && this.stats) { this.stats.bexp += b; this.stats.jexp += j; }
  },
  onItem(qty) {
    if (this.on && this.stats) this.stats.items += qty;
  },
  onDeath() {
    if (!this.on) return;
    this.toggle(false);
    UI.msg(L('บอทหยุดทำงานเพราะตัวละครเสียชีวิต', 'Auto hunt stopped — your character has fallen'), 'err');
  },

  findItem(list) {
    const inv = G.player.inventory;
    for (const id of list) { const e = inv.find(x => x.id === id && x.qty > 0); if (e) return e; }
    return null;
  },
  // ใช้สกิลได้ไหม (slack = ยอมให้ดีเลย์/คูลดาวน์เหลืออีกไม่เกินกี่วินาที — ใช้ตอน "รอสกิล" ไม่ได้ร่ายจริง)
  // raw = ไม่สนค่าตั้งแบบง่าย (ติ๊กสกิล / เงื่อนไข HP รายสกิล) — Battle Script สั่งสกิลเองตรง ๆ
  canCast(id, slack = 0, raw = false) {
    const p = G.player, s = skillDef(id), lv = skillLv(id);
    if (!lv || !s || s.type !== 'active') return false;
    if (!raw) {
      const c = this.cfg();
      if (c.skills[id] === false) return false;
      // ตั้งรายสกิล: ใช้เฉพาะตอน HP ต่ำกว่า X% (0 = ใช้ได้ตลอด)
      const hpGate = (c.skillHp || {})[id];
      if (hpGate && p.hp / p.d.maxHp * 100 >= hpGate) return false;
    }
    if (p.skillReadyAt - G.time > slack || p.cast || skillCdLeft(id) > slack || isStunned()) return false;
    if (s.bow && weaponType() !== 'bow') return false;
    return canPaySkill(skillCost(id, lv)) && (!p.d.bloodmagic || p.hp - bloodCost(skillCost(id, lv)) > p.d.maxHp * 0.5); // Blood Circuit: เหลือ HP ครึ่งหนึ่งไว้สู้ต่อ
  },
  // สกิลที่แลก HP (hpCost): ไม่ใช้ถ้าใช้แล้ว HP จะเหลือต่ำกว่า 35% (เสี่ยงตาย) หรือต่ำกว่าจุดปั๊มยา (จ่ายเลือดเพื่อให้ไปกินยา = เปลืองยา)
  hpCostOk(id) {
    const s = skillDef(id);
    if (!s.hpCost) return true;
    const ap = typeof autoPotCfg === 'function' ? autoPotCfg() : null;
    return this.hpPct() * (1 - s.hpCost(skillLv(id)) / 100) >= Math.max(35, ap && ap.on && this.findItem(HP_POTS) ? ap.hp + 2 : 0);
  },
  // บทบาทของสกิลสำหรับบอท (อ่านจากฟิลด์ใน SKILLS ล้วน ๆ)
  role(id) {
    const s = skillDef(id);
    if (s.rune && s.rune.role) return s.rune.role; // รูนที่เปลี่ยนบทบาทสกิล (เช่น Smoke Bomb = วางที่เท้าแบบกับดัก)
    if (s.heal) return 'heal';
    if (s.special === 'summon_wolf') return 'summon';
    if (s.special === 'stealth') return 'opener';
    if (s.buff && !s.dmg) return 'buff';
    if (s.special === 'trap') return 'trap';
    if (s.dmg) return s.dmg.at === 'self' ? 'aoe' : 'attack';
    return 'other';
  },

  // ---------- ตัวช่วยประเมิน (ค่าเฉลี่ยโดยประมาณ ไม่สุ่ม ใช้ตัดสินใจเท่านั้น) ----------
  hpPct() { const p = G.player; return p.hp / p.d.maxHp * 100; },
  // มอนตีก่อนที่ยังไม่ได้ไล่เรา (เข้าใกล้ 4 ช่องจะวิ่งมาตี ถ้าเลเวลเรายังไม่สูงกว่ามันเกิน 10)
  aggressive(m) { return !m.dead && m.def.aggro && !m.def.dummy && m.state !== 'chase' && G.player.baseLv < m.def.lv + 10; },
  inZone(x, y, pad = 0) { const z = this.zone(); return !z || U.dist(x, y, z.x, z.y) <= z.r + pad; },
  nearPortal(x, y, r = 3) { return G.map.portals.some(pt => U.dist(pt.x + 0.5, pt.y + 0.5, x, y) < r); },
  pathLen(path) {
    const p = G.player;
    let l = 0, x = p.x, y = p.y;
    for (const n of path) { l += Math.hypot(n.x + 0.5 - x, n.y + 0.5 - y); x = n.x + 0.5; y = n.y + 0.5; }
    return l;
  },
  // ปลายทางของเส้นทาง (findPath คืนเส้นทางไป "ช่องที่ใกล้ที่สุด" ถ้าไปไม่ถึง)
  pathEnd(path) { const p = G.player, n = path[path.length - 1]; return n ? { x: n.x + 0.5, y: n.y + 0.5 } : { x: p.x, y: p.y }; },
  physEst(m, mult, el) {
    const d = G.player.d, md = m.def;
    const atk = d.statusAtk + d.weaponAtk * 0.9 + d.atkBonus;
    return Math.max(1, atk * mult * this.elemK(m, el) * (1 + d.atkPct / 100) * (1 - md.def / 100) - md.vit * 0.43);
  },
  magicEst(m, mult, el) {
    const d = G.player.d, md = m.def;
    return Math.max(1, (d.matkMin + d.matkMax) / 2 * mult * this.elemK(m, el) * (1 - md.mdef / 100) - md.lv / 4);
  },
  // ธาตุ × Hunt Rune (js/huntrunes.js: Endow เปลี่ยนธาตุของตีปกติ/สกิลไม่มีธาตุ + โบนัสตามเงื่อนไข) — ไม่มีไฟล์นั้น = ธาตุอย่างเดียว
  elemK(m, el) { return typeof HuntRunes !== 'undefined' ? HuntRunes.estMul(m, el) : elemMod(el || 'neutral', m.def.element); },
  basicEst(m) { return this.physEst(m, masteryMul('attack')); },
  basicDps(m) {
    const d = G.player.d;
    return this.basicEst(m) * U.clamp(80 + d.hit - m.def.flee, 5, 100) / 100 * 1000 / d.aspdDelay;
  },
  skillEst(id, m) {
    const s = skillDef(id), D = s.dmg, lv = skillLv(id);
    const mult = (D.multAware && m.state === 'chase' ? D.multAware(lv) : D.mult(lv)) * masteryMul(id);
    const hits = typeof D.hits === 'function' ? D.hits(lv) : (D.hits || 1);
    return hits * (D.type === 'magic' ? this.magicEst(m, mult, D.element) : this.physEst(m, mult, D.element)) * (D.status ? 1.15 : 1) * (typeof Runes !== 'undefined' ? Runes.estMul(s) : 1); // รูนหลายลูก/ตีดีเลย์: ตัวคูณเฉลี่ยต่อเป้า
  },
  castSec(id) { const s = skillDef(id), p = G.player; return (s.cast ? s.cast(skillLv(id)) : 0) * p.d.castMul * Math.max(0, 1 - p.d.dex / 150) / 1000; },
  // ตัวที่จะโดนสกิลนี้ (เลียนแบบ skillDamage)
  victims(s, t) {
    const p = G.player, D = s.dmg;
    const rv = typeof Runes !== 'undefined' && Runes.victims(s, t); // รูนที่เลือกเป้าเอง (แตกลูก/เด้ง/พัด)
    if (rv) return rv;
    if (s.target !== 'enemy' && !D.area) return []; // สกิลใส่ตัวเองที่ไม่มีวง = ไม่โดนใคร
    if (D.area) {
      const self = D.at === 'self' || s.target !== 'enemy';
      const cx = self ? p.x : t.x, cy = self ? p.y : t.y;
      return G.mobs.filter(m => !m.dead && !m.def.dummy && U.dist(m.x, m.y, cx, cy) <= D.area);
    }
    if (D.line) {
      const dx = t.x - p.x, dy = t.y - p.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, reach = skillRange(s) + 1;
      return G.mobs.filter(m => {
        if (m.dead || m.def.dummy) return false;
        const k = (m.x - p.x) * ux + (m.y - p.y) * uy;
        return k >= 0 && k <= reach && Math.abs((m.x - p.x) * uy - (m.y - p.y) * ux) < 0.8;
      });
    }
    return [t];
  },
  // DPS โดยประมาณต่อมอนตัวนี้ (ตีปกติ หรือสกิลโจมตีที่ดีที่สุด) — ใช้คิดเวลาที่ต้องใช้ล้มมัน
  dpsVs(m) {
    const p = G.player;
    let best = this.basicDps(m);
    if (this.cfg().style !== 'basic') for (const id in p.skills) {
      const s = skillDef(id);
      if (s.type !== 'active' || !s.dmg || this.cfg().skills[id] === false || (s.bow && weaponType() !== 'bow')) continue;
      best = Math.max(best, this.skillEst(id, m) / (this.castSec(id) + Math.max(s.cd || 0, (typeof s.delay === 'function' ? s.delay(skillLv(id)) : (s.delay || 500)) / 1000)));
    }
    return Math.max(1, best);
  },

  update() {
    const p = G.player, c = this.cfg();
    if (!this.on || p.dead || G.time < this.nextThink) return;
    this.nextThink = G.time + 0.2;
    if (this.manual) {
      if (this.manualBusy()) this.pauseUntil = Math.max(this.pauseUntil, G.time + (this.userTgt ? 0.4 : 3));
      else if (G.time >= this.pauseUntil) { this.manual = false; this.userTgt = null; if (c.leash) this.setAnchor(true); }
    }
    if (G.time < this.pauseUntil || NPC.busy) return;
    if (G.map.def.pvp) { if (!this.warnedPvp) { this.warnedPvp = true; UI.msg(L('บอทไม่ทำงานในลานประลอง PvP', 'The bot does not work in the PvP Arena'), 'info'); } return; }
    this.warnedPvp = false;
    if (G.map.def.kind === 'town') {
      if (!this.warnedTown) { this.warnedTown = true; UI.msg(L('บอทรออยู่: ออกไปยังแผนที่ล่ามอนสเตอร์ได้เลย', 'Bot standing by: head out to a hunting map'), 'info'); }
      return;
    }
    this.warnedTown = false;
    const hpPct = this.hpPct(), spPct = p.sp / p.d.maxSp * 100;
    // ตัวที่กำลังไล่ตีเรา (มอนเลิกไล่เมื่อห่าง 11 ช่อง)
    const threats = G.mobs.filter(m => !m.dead && !m.def.dummy && m.state === 'chase' && U.dist(m.x, m.y, p.x, p.y) < 11);
    // จับว่าตัวละครขยับอยู่ไหม (ใช้ตรวจ "ติด")
    if (U.dist(p.x, p.y, this.lastX, this.lastY) > 0.15 || p.cast || isStunned()) this.stillAt = G.time;
    this.lastX = p.x; this.lastY = p.y;
    for (const [m, until] of this.blacklist) if (until <= G.time || m.dead) this.blacklist.delete(m);

    // 0) Battle Script (โหมดขั้นสูง js/botscript.js): กฎของผู้เล่นมาก่อน • ไม่มีกฎไหนทำงาน = ทำตามค่าตั้งแบบง่ายด้านล่างเหมือนเดิมทุกอย่าง
    if (typeof BotScript !== 'undefined' && BotScript.active(c) && !p.cast && !p.skillIntent && !(G.time < this.kiteUntil && p.path.length && !isStunned())
      && BotScript.run(c, threats, hpPct, spPct)) return;

    // 1) ฟื้นฟู: สกิลฮีล (ยาใช้ระบบปั๊มยาอัตโนมัติร่วมกับการเล่นเอง — autoPotTick)
    if (hpPct < c.healAt && this.castHeal()) return;
    if (hpPct < 20 && threats.length && c.returnHome && !this.findItem(HP_POTS)) return this.goHome(L('HP ต่ำและยาหมด', 'low HP and out of potions'));
    if (p.cast) return;
    // เดินเข้าระยะสกิลค้างนานเกินไป (ทางตัน/โดนบัง) → ยกเลิกแล้วข้ามตัวนั้นไปก่อน
    if (p.skillIntent) {
      if (this.intentRef !== p.skillIntent) { this.intentRef = p.skillIntent; this.intentAt = G.time; }
      const age = G.time - this.intentAt;
      if (age < 3.5 || (age < 8 && G.time - this.stillAt < 1)) return;
      const t = p.skillIntent.tgt;
      p.skillIntent = null; p.path = [];
      if (t && t.state !== 'chase') { this.blacklist.set(t, G.time + 15); this.noteFail(); if (this.tgt === t) this.tgt = null; }
    }
    // กำลังถอยหนี (สายระยะไกล)
    if (G.time < this.kiteUntil && p.path.length && !isStunned()) return;

    // 2) นั่งพัก (โหมดตีปกติไม่ใช้ SP จึงไม่พักเพราะ SP)
    if (this.rest(c, threats, hpPct, spPct)) return;

    // 3) บัฟ / เรียกสัตว์คู่ใจ (ต่อบัฟก่อนหมด ~5 วิ)
    if (c.useBuffs && this.castBuff(c, threats, hpPct)) return;

    // 4) เก็บของที่ตกอยู่ใกล้ ๆ (เมื่อไม่มีใครตีเรา) — Auto Loot เก็บให้แล้วในระยะ 12 ช่อง ที่เหลือคือของที่ตกไกล
    if (this.loot(threats)) return;

    // 5) เลือกเป้าหมาย
    let t = this.tgt && !this.tgt.dead && G.mobs.includes(this.tgt) ? this.tgt : null;
    if (t && this.stuck(t)) { this.blacklist.set(t, G.time + 12); this.noteFail(); t = null; }
    if (t && t.state !== 'chase' && threats.some(m => !this.blacklist.has(m))) t = null; // มีตัวกำลังตีเรา → จัดการตัวนั้นก่อน
    if (!t) {
      // HP ต่ำกว่าจุดฮีล และสกิลฮีลใกล้พร้อม → รอฮีลก่อนดึงตัวใหม่
      if (!threats.length && hpPct < c.healAt && this.healSoon()) { p.target = null; return; }
      t = this.pickTarget(threats, c, hpPct);
      this.setTgt(t);
    }
    if (!t) { p.target = null; this.wander(); return; }
    this.fails = 0;

    // 6) สายระยะไกล: มอนประชิดตัว → ถอยไปที่โล่ง 2.5–4 ช่องก่อนยิงต่อ
    if (this.kite(t, threats)) return;

    // 7) ใช้สกิลโจมตี (โหมด "ตีปกติ" ข้าม)
    if (c.style !== 'basic') {
      const id = this.pickSkill(t, threats, hpPct, spPct);
      if (id) {
        if (skillDef(id).target === 'enemy') beginSkill(id, skillLv(id), t); else useSkill(id);
        this.progAt = Math.max(this.progAt, G.time - 1.5);
        return;
      }
      // สายเวท: ตีปกติแทบไม่เข้า → ยืนรอสกิลในระยะ ไม่เดินเข้าไปประชิด
      if (this.hold(t)) { p.target = null; p.path = []; return; }
    }
    if (p.target !== t) { p.target = t; p.repathAt = 0; }
  },

  setTgt(t) {
    const p = G.player;
    this.tgt = t; this.progAt = G.time; this.tgtHp = t ? t.hp : 0;
    if (t) { p.target = t; p.repathAt = 0; p.sitting = false; this.resting = false; }
  },
  // ติด: ตัวละครไม่ขยับ + เลือดเป้าไม่ลด 3 วิ • หรือไล่ไม่ทันนาน 12 วิ
  stuck(t) {
    if (t.hp < this.tgtHp) this.progAt = G.time;
    this.tgtHp = t.hp;
    if (G.time < this.kiteUntil) return false;
    const idle = G.time - Math.max(this.progAt, this.stillAt);
    return idle > 3 || G.time - this.progAt > 12;
  },
  noteFail() {
    this.fails = (G.time - this.failAt < 15 ? this.fails : 0) + 1;
    this.failAt = G.time;
  },

  castHeal() {
    const p = G.player;
    for (const id in p.skills) {
      if (this.role(id) !== 'heal' || !this.canCast(id)) continue;
      if (skillDef(id).heal(skillLv(id), p.d, p) < p.d.maxHp * 0.08) continue; // ฮีลน้อยเกินไป ไม่คุ้มดีเลย์
      useSkill(id); return true;
    }
    return false;
  },
  healSoon() {
    const p = G.player;
    for (const id in p.skills) if (this.role(id) === 'heal' && this.canCast(id, 2) && skillDef(id).heal(skillLv(id), p.d, p) >= p.d.maxHp * 0.08) return true;
    return false;
  },
  castBuff(c, threats, hpPct) {
    const p = G.player;
    for (const id in p.skills) {
      const r = this.role(id), s = skillDef(id);
      if (r === 'buff' && s.target !== 'enemy') {
        const b = p.buffs[id];
        if (b && b.until - G.time > 5) continue;
        if (!this.canCast(id)) continue;
        if (!this.hpCostOk(id)) continue; // บัฟที่แลกเลือด: ไม่ใช้ตอนเลือดน้อย
        if (s.aggro) { // บัฟที่ดึงมอนรอบตัว: ไม่ใช้ตอนเลือดน้อย/โดนรุม และไม่ใช้ถ้าจะลากตัวใหม่เข้ามา (ตัวที่ไม่ได้เลือก/MVP ก็ไม่โดน)
          if (hpPct < 60 || threats.length >= 3) continue;
          if (G.mobs.some(m => !m.dead && !m.def.dummy && m.state !== 'chase' && U.dist(m.x, m.y, p.x, p.y) <= s.aggro)) continue;
        }
        useSkill(id); return true;
      }
      if (r === 'summon' && !G.allies.length && this.canCast(id)) { useSkill(id); return true; }
    }
    return false;
  },

  // พึ่งสกิลเป็นหลักไหม (ตีปกติได้ไม่ถึง 1/5 ของสกิล เช่น สายเวท) — ใช้ตัดสินว่าควรนั่งรอ SP หรือตีปกติต่อไปเลย
  // (สาย SP น้อยอย่างมีด/ขวาน นั่ง 40 วิได้สกิลแค่ 2 ครั้ง สู้ตีปกติไปเลยไม่ได้)
  skillReliant() {
    const p = G.player;
    let m = null, bd = Infinity;
    for (const o of G.mobs) { if (o.dead || o.def.dummy) continue; const d = U.dist(o.x, o.y, p.x, p.y); if (d < bd) { bd = d; m = o; } }
    return !m || this.basicDps(m) < this.dpsVs(m) * 0.2;
  },
  rest(c, threats, hpPct, spPct) {
    const p = G.player;
    // SP หมดแต่ตีปกติยังแรง (ธนู/มีด/ขวาน) → ไม่นั่งรอ SP ตีปกติไปพลาง ๆ • นั่งเพราะ SP เฉพาะสายที่พึ่งสกิล (สายเวท)
    const needSp = c.style !== 'basic' && this.skillReliant();
    if (this.resting) {
      // นั่งเพราะ SP อย่างเดียว: ไม่ต้องรอ HP เต็ม (HP ฟื้นช้ามากสำหรับตัวที่ VIT น้อย)
      const hpGoal = this.restForHp ? Math.min(90, c.restHp + 45) : c.restHp + 10;
      if (threats.length || !c.rest || (hpPct >= hpGoal && (!needSp || spPct >= Math.min(80, c.restSp + 35)))) {
        this.resting = false; p.sitting = false; return false;
      }
      if (p.path.length && G.time < this.restMoveUntil) return true; // กำลังเดินไปจุดพัก
      if (this.aggroNear(p.x, p.y) < 6 && G.time >= this.restMoveAt && this.moveToSafe()) return true;
      if (!p.sitting) { p.path = []; p.target = null; p.sitting = true; }
      return true;
    }
    if (c.rest && !threats.length && (hpPct < c.restHp || (needSp && spPct < c.restSp))) {
      this.resting = true; this.restForHp = hpPct < c.restHp;
      this.tgt = null; p.target = null; p.pickTarget = null; p.path = [];
      // มอนตีก่อนอยู่ใกล้ → ย้ายออกห่างก่อนนั่ง (ไม่งั้นนั่งได้ไม่กี่วิก็โดนตี)
      if (this.aggroNear(p.x, p.y) < 6 && this.moveToSafe()) return true;
      p.sitting = true;
      return true;
    }
    return false;
  },
  // ระยะถึงมอนตีก่อนตัวใกล้สุด
  aggroNear(x, y) {
    let best = Infinity;
    for (const m of G.mobs) if (this.aggressive(m)) best = Math.min(best, U.dist(m.x, m.y, x, y));
    return best;
  },
  moveToSafe() {
    const p = G.player;
    this.restMoveAt = G.time + 8;
    for (let r = 3; r <= 9; r += 2) {
      let best = null;
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2, tx = Math.floor(p.x + Math.cos(a) * r), ty = Math.floor(p.y + Math.sin(a) * r);
        if (!G.map.walkable(tx, ty) || G.map.portalAt(tx, ty) || this.nearPortal(tx + 0.5, ty + 0.5, 4) || !this.inZone(tx + 0.5, ty + 0.5)) continue;
        const safe = this.aggroNear(tx + 0.5, ty + 0.5);
        if (safe >= 6.5 && (!best || safe > best.safe)) best = { tx, ty, safe };
      }
      if (!best) continue;
      const path = findPath(G.map, Math.floor(p.x), Math.floor(p.y), best.tx, best.ty, 800);
      const e = this.pathEnd(path);
      if (U.dist(e.x, e.y, best.tx + 0.5, best.ty + 0.5) > 0.8 || this.pathLen(path) > r * 1.8 + 2) continue;
      p.sitting = false; p.target = null; p.path = path;
      this.restMoveUntil = G.time + this.pathLen(path) / p.d.speed + 1;
      return true;
    }
    return false;
  },

  loot(threats) {
    const p = G.player;
    if (threats.length) { if (p.pickTarget) { p.pickTarget = null; p.path = []; } return false; }
    if (p.pickTarget) {
      if (G.drops.includes(p.pickTarget) && G.time - this.pickSince < 5) return true;
      if (G.drops.includes(p.pickTarget)) this.badDrops.add(p.pickTarget.uid); // ไปไม่ถึง → ไม่สนชิ้นนี้อีก
      p.pickTarget = null; p.path = [];
    }
    let best = null, bd = 7;
    for (const d of G.drops) {
      const dd = U.dist(d.x, d.y, p.x, p.y);
      if (dd < bd && !this.badDrops.has(d.uid) && this.inZone(d.x, d.y, 2) && !this.nearPortal(d.x, d.y, 2)) { bd = dd; best = d; }
    }
    if (!best) return false;
    p.target = null; p.pickTarget = best; p.path = []; this.pickSince = G.time;
    return true;
  },

  DANGER_W: 20, // ดาเมจที่คาดว่าจะโดนเต็มหลอด HP เทียบเท่าเวลากี่วินาที (ยิ่งมากยิ่งเลือกตัวที่ตีเบา)
  pickTarget(threats, c, hpPct) {
    const p = G.player;
    const ok = m => !m.dead && !m.def.dummy && !(c.avoidMvp && m.isMvp && m.state !== 'chase') && !this.blacklist.has(m);
    // 1) ตัวที่กำลังตีเรา: ตัวที่อยู่ในระยะตีถึงก่อน — เลือกตัวที่ "ล้มเร็วเทียบกับแรงที่มันตีเรา" (ลดดาเมจที่โดนรวมได้มากสุด) ไม่งั้นตัวใกล้สุด
    const reach = Math.max(p.d.range, 1.5) + 0.5;
    const th = threats.filter(ok);
    if (th.length) {
      const sc = m => { const d = U.dist(m.x, m.y, p.x, p.y); return d <= reach ? m.hp / this.dpsVs(m) / this.danger(m) - 1e4 : d; };
      return th.sort((a, b) => sc(a) - sc(b))[0];
    }
    // 2) ตัวใหม่ในขอบเขต
    const z = this.zone(), skip = c.skipMobs || {};
    const inRange = m => z ? U.dist(m.x, m.y, z.x, z.y) <= z.r : U.dist(m.x, m.y, p.x, p.y) <= c.radius;
    const low = hpPct < 60;
    // มอนที่ไม่ได้เลือกไว้: ไม่เข้าไปตีเอง (แต่ถ้ามันตีเราก่อน ยังสู้กลับด้านบน) • ไม่ไล่ตัวที่ยืนชิดวาร์ป (เดินไปแล้ววาร์ปหลุดแมพ)
    let cands = G.mobs.filter(m => ok(m) && !skip[m.def.id] && inRange(m) && !this.nearPortal(m.x, m.y, 2.5));
    // HP ต่ำ (< 60%): ไม่เลือกตัวเลเวลสูงกว่าเราเกิน 3 (ด้านล่าง: และไม่เลือกตัวที่จะลากพวกตีก่อนมารุม)
    if (low) cands = cands.filter(m => m.def.lv <= p.baseLv + 3);
    cands = cands.map(m => ({ m, d: U.dist(m.x, m.y, p.x, p.y) })).sort((a, b) => a.d - b.d).slice(0, 6);
    const aggro = G.mobs.filter(o => this.aggressive(o));
    let best = null, bestSc = Infinity, unreachable = 0;
    for (let { m, d } of cands) {
      let path = null;
      if (d > 1.6) { // เทียบด้วยระยะเดินจริง ไม่ใช่เส้นตรง • ไปไม่ถึง = ข้ามไปสักพัก
        if (d / p.d.speed >= bestSc) continue; // เส้นตรงยังไกลกว่าตัวที่ดีสุด ไม่ต้องหาเส้นทาง
        path = findPath(G.map, Math.floor(p.x), Math.floor(p.y), Math.floor(m.x), Math.floor(m.y), 1500);
        const e = this.pathEnd(path), de = U.dist(e.x, e.y, m.x, m.y);
        const canShoot = p.d.ranged && de <= p.d.range && lineOfSight(G.map, e.x, e.y, m.x, m.y);
        if (de > 1.6 && !canShoot) { this.blacklist.set(m, G.time + 20); unreachable++; continue; }
        d = this.pathLen(path);
      }
      // มอนตีก่อนตัวอื่นที่จะโดนลากมาด้วย: ยืนใกล้เป้า หรืออยู่ใกล้ทางเดินไปหาเป้า (ระยะเห็น 4 ช่อง)
      const adds = aggro.filter(o => o !== m && (U.dist(o.x, o.y, m.x, m.y) < 4.5 || (path && path.some(n => U.dist(o.x, o.y, n.x + 0.5, n.y + 0.5) < 4.3)))).length;
      if (low && adds) continue;
      // เวลาเดิน + ครึ่งหนึ่งของเวลาที่ใช้ล้ม + ดาเมจที่คาดว่าจะโดนระหว่างสู้ (คิดเป็นวินาที: เลือดเต็มหลอด ≈ 20 วิ) + โทษตัวที่จะโดนลากมาด้วย
      const kill = m.hp / this.dpsVs(m);
      const sc = d / p.d.speed + 0.5 * kill + this.DANGER_W * this.danger(m) * kill / p.d.maxHp + adds * 4;
      if (sc < bestSc) { bestSc = sc; best = m; }
    }
    if (!best && unreachable) this.noteFail(); // เจอแต่ตัวที่เดินไปไม่ถึง → นับว่าหาทางไม่ได้
    return best;
  },
  // ดาเมจต่อวินาทีที่มอนตัวนี้ทำกับเรา (โดยประมาณ)
  mobDps(m) {
    const d = G.player.d, md = m.def;
    const hit = U.clamp(80 + md.hit - d.flee, 5, 95) / 100 * (1 - d.pdodge / 100);
    return Math.max(1, (md.atk[0] + md.atk[1]) / 2 * (1 - d.def / 100) - d.softDef * 0.85) * hit / (md.atkDelay || 1.7);
  },
  // ความอันตราย: ดาเมจต่อวินาที • ตัวที่ตีมึนได้นับหนักขึ้น (ระหว่างมึนกินยาไม่ได้) โดยเฉพาะกับตัวที่เลือดน้อยเทียบกับแรงตีของมัน
  danger(m) {
    const md = m.def, stun = md.stun ? 1 + md.stun[0] / 100 * md.stun[1] * Math.min(3, md.atk[1] * 4 / G.player.d.maxHp) : 1;
    return this.mobDps(m) * stun;
  },

  pickSkill(t, threats, hpPct, spPct) {
    const p = G.player, dist = U.dist(p.x, p.y, t.x, t.y);
    const finishable = dist <= p.d.range + 0.3 && t.hp <= this.basicEst(t) && G.time >= p.nextAttack - 0.3; // อยู่ในระยะและตีปกติทีเดียวก็ล้มแล้ว
    let best = null, bestSc = 0, hasSingle = false;
    const cand = [];
    for (const id in p.skills) {
      if (!this.canCast(id)) continue;
      const r = this.role(id), s = skillDef(id);
      if (r === 'trap') { if (dist < 2.5 && G.traps.length < 3) return id; continue; }
      // หายตัว: เปิดฉากใส่ตัวที่ยังไม่รู้ตัว • หรือกลางไฟต์ตอน SP เหลือ ≥ ครึ่งและเป้ายังอึด (มอนลืมเรา → ตีลอบ/แทงข้างหลังแรงขึ้น ตัวอื่นก็เลิกไล่)
      if (r === 'opener') { if ((t.state !== 'chase' && dist < 6 && !threats.length) || (t.state === 'chase' && spPct >= 50 && t.hp > this.basicEst(t) * 4)) return id; continue; }
      if (r !== 'attack' && r !== 'aoe') continue;
      if (!this.hpCostOk(id)) continue;
      const vs = this.victims(s, t);
      if (!vs.length || (!vs.includes(t) && !vs.some(m => threats.includes(m)))) continue;
      // สกิลวงกว้างที่จะโดนตัวที่ยังไม่ได้สู้กับเรา (ลากมารุมเพิ่ม = เปลืองยา) → ไม่ใช้
      if (vs.some(m => m !== t && m.state !== 'chase')) continue;
      const eff = vs.reduce((a, m) => a + Math.min(m.hp, this.skillEst(id, m)), 0);
      if (vs.length < 2 && finishable) continue; // ไม่เปลือง SP กับตัวที่ตีปกติก็ตาย
      const area = !!s.dmg.area;
      if (!area || vs.length >= 2) hasSingle = true;
      cand.push({ id, eff, area, n: vs.length, cost: skillCost(id, skillLv(id)), sec: this.castSec(id) });
    }
    for (const k of cand) {
      // สกิลวงกว้างกับศัตรูตัวเดียว: ใช้เมื่อไม่มีสกิลเดี่ยวพร้อม และ SP ยังเหลือเยอะ (ยกเว้นสกิลที่ทำให้มึน = กันดาเมจได้ด้วย)
      const stun = (skillDef(k.id).dmg.status || {}).kind === 'stun';
      if (k.area && k.n < 2 && (spPct < 50 || (hasSingle && !stun))) continue;
      // สกิลที่แรงไม่ต่างจากตีปกติ ไม่คุ้มดีเลย์
      if (k.n < 2 && k.eff < this.basicEst(t) * 1.2 && !skillDef(k.id).dmg.status) continue;
      // SP เหลือน้อยกว่าครึ่ง: เลือกสกิลที่คุ้ม SP ที่สุด (ดาเมจต่อ SP) แทนแรงสุด
      const sc = (k.eff / (k.sec + 0.6)) * (spPct < 50 ? 30 / Math.max(5, k.cost) : 1);
      if (sc > bestSc) { bestSc = sc; best = k.id; }
    }
    return best;
  },

  // มีสกิลโจมตีระยะไกล (≥5 ช่อง) ที่เปิดให้บอทใช้ไหม (สายเวท)
  casterish() {
    const p = G.player, c = this.cfg();
    if (c.style === 'basic') return false;
    for (const id in p.skills) { const s = skillDef(id); if (s.type === 'active' && s.dmg && s.target === 'enemy' && c.skills[id] !== false && skillRange(s) >= 5 && !(s.bow && weaponType() !== 'bow')) return true; }
    return false;
  },
  // สกิลโจมตีระยะไกล (≥5 ช่อง) ที่จะพร้อมภายใน slack วิ — คืนระยะที่ไกลสุด
  castRange(t, slack) {
    const p = G.player;
    let r = 0;
    for (const id in p.skills) {
      const s = skillDef(id);
      if (this.role(id) !== 'attack' || s.target !== 'enemy' || !this.canCast(id, slack)) continue;
      const rg = skillRange(s);
      if (rg >= 5 && (!t || this.skillEst(id, t) > this.basicEst(t) * 1.5)) r = Math.max(r, rg);
    }
    return r;
  },
  // สายเวท: อยู่ในระยะสกิลแล้วและสกิลจะพร้อมในไม่ช้า → ยืนรอ ไม่เดินเข้าไปตีปกติ (ตีปกติเบามาก)
  hold(t) {
    const p = G.player;
    if (p.d.ranged) return false;
    const dist = U.dist(p.x, p.y, t.x, t.y);
    if (dist <= 1.8) return false; // ประชิดอยู่แล้ว ตีปกติระหว่างรอได้ฟรี
    const rg = this.castRange(t, 1.2);
    if (!rg || dist > rg || !lineOfSight(G.map, p.x, p.y, t.x, t.y)) return false;
    // ตีปกติแรงพอ ๆ กับสกิล → เดินเข้าไปตีดีกว่า
    return this.basicDps(t) < this.dpsVs(t) * 0.5;
  },
  // ระยะถอย (ช่อง เรียงจากที่อยากได้) • เว้นระยะระหว่างการถอยแต่ละครั้ง (วิ) • สายเวทถอยเมื่อ HP ต่ำกว่านี้ (%)
  KITE_R: [4, 3, 2.5], KITE_CD: 1.6, KITE_HP: 50,
  kite(t, threats) {
    const p = G.player;
    if (p.cast || isStunned()) return false;
    const adj = threats.filter(m => U.dist(m.x, m.y, p.x, p.y) <= 1.8 && (m.def.range || 1) <= 2);
    if (!adj.length) return false;
    // ตัวบาง (มอนตี 4 ทีตาย) แล้วโดนรุม 2 ตัว หรือ HP ใกล้หมด → หนีก่อน (ไม่สนคูลดาวน์/ความเร็วมอน/ระยะยิง)
    const panic = (p.d.ranged || this.casterish()) && adj.some(m => m.def.atk[1] * 4 > p.d.maxHp) && (adj.length >= 2 || this.hpPct() < 45);
    const rng = p.d.ranged ? p.d.range : this.castRange(t, 1);
    if (!panic && (rng < 5 || G.time < this.kiteAt)) return false;
    // มอนวิ่งเร็วพอ ๆ กับเรา (และไม่ได้มึน) → ถอยไปก็โดนตามทัน เสียจังหวะยิงเปล่า ๆ
    const spd = m => m.stunUntil > G.time ? 0 : m.def.speed * (m.slowUntil > G.time ? 0.5 : 1) * 1.35;
    if (!panic && adj.some(m => spd(m) > p.d.speed * 0.7)) return false;
    // สายเวท: ถอยเมื่อ HP เริ่มลด, มอนช้า/มึนอยู่ (ได้ร่ายฟรี) หรือตัวเราบางแล้วมันตีมึนได้ (โดนมึนแล้วกินยาไม่ได้) • สายธนูถอยได้ตลอด
    const scary = m => m.def.stun && m.def.atk[1] * 4 > p.d.maxHp;
    if (!panic && !p.d.ranged && this.hpPct() >= this.KITE_HP && !adj.every(m => m.stunUntil > G.time || m.slowUntil > G.time || scary(m))) return false;
    const chasers = threats;
    let best = null;
    for (const r of this.KITE_R) {
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2, tx = Math.floor(p.x + Math.cos(a) * r), ty = Math.floor(p.y + Math.sin(a) * r);
        const cx = tx + 0.5, cy = ty + 0.5;
        if (!G.map.walkable(tx, ty) || G.map.portalAt(tx, ty) || this.nearPortal(cx, cy, 3) || !this.inZone(cx, cy)) continue;
        if (this.aggroNear(cx, cy) < 5) continue; // ไม่ถอยไปหามอนตีก่อนตัวอื่น
        if (!panic && (U.dist(cx, cy, t.x, t.y) > rng - 0.3 || !lineOfSight(G.map, cx, cy, t.x, t.y))) continue; // ยังยิงถึงเป้าจากจุดใหม่
        let gap = Infinity;
        for (const m of chasers) gap = Math.min(gap, U.dist(m.x, m.y, cx, cy));
        if (gap < 2.2 || (best && gap <= best.gap)) continue;
        best = { tx, ty, gap, r };
      }
      if (best) break;
    }
    if (!best) { this.kiteAt = G.time + 1; return false; }
    const path = findPath(G.map, Math.floor(p.x), Math.floor(p.y), best.tx, best.ty, 300);
    const e = this.pathEnd(path);
    if (!path.length || U.dist(e.x, e.y, best.tx + 0.5, best.ty + 0.5) > 0.8 || this.pathLen(path) > best.r * 1.7 + 0.5) { this.kiteAt = G.time + 1; return false; }
    p.target = null; p.skillIntent = null; p.sitting = false; p.path = path;
    this.kiteUntil = G.time + 1.5; this.kiteAt = G.time + this.KITE_CD;
    return true;
  },

  wander() {
    const p = G.player, c = this.cfg();
    if (p.path.length && G.time < this.wanderAt) return;
    this.wanderAt = G.time + 6;
    const z = this.zone();
    // หลุดวง / หาเป้าไม่ได้หลายครั้งติด → เดินกลับศูนย์กลางวง (หรือกลางแมพ)
    if ((z && U.dist(p.x, p.y, z.x, z.y) > z.r) || this.fails >= 3) {
      this.fails = 0;
      const cx = z ? z.x : G.map.w / 2, cy = z ? z.y : G.map.h / 2;
      for (let i = 0; i < 20; i++) {
        const tx = Math.floor(cx) + U.randi(-2, 2), ty = Math.floor(cy) + U.randi(-2, 2);
        if (G.map.walkable(tx, ty) && !this.nearPortal(tx + 0.5, ty + 0.5, 4)) { playerWalkTo(tx, ty); return; }
      }
    }
    // ไม่ได้จำกัดวง: เดินไปทางมอนที่เลือกไว้ตัวใกล้สุด (นอกระยะค้นหา)
    if (!z) {
      const skip = c.skipMobs || {};
      let best = null, bd = Infinity;
      for (const m of G.mobs) {
        if (m.dead || m.def.dummy || skip[m.def.id] || this.blacklist.has(m) || (c.avoidMvp && m.isMvp) || this.nearPortal(m.x, m.y, 4)) continue;
        const d = U.dist(m.x, m.y, p.x, p.y);
        if (d < bd) { bd = d; best = m; }
      }
      if (best) {
        const k = Math.max(0, (bd - c.radius * 0.6) / bd); // เดินไปแค่พอให้เข้าระยะค้นหา
        const tx = Math.floor(p.x + (best.x - p.x) * k), ty = Math.floor(p.y + (best.y - p.y) * k);
        if (G.map.walkable(tx, ty) && !this.nearPortal(tx + 0.5, ty + 0.5, 4)) { playerWalkTo(tx, ty); return; }
        playerWalkTo(Math.floor(best.x), Math.floor(best.y)); this.wanderAt = G.time + 2; return;
      }
    }
    for (let i = 0; i < 20; i++) {
      const cx = z ? z.x : p.x, cy = z ? z.y : p.y, span = z ? Math.max(2, Math.floor(z.r * 0.8)) : 10;
      const tx = Math.floor(cx) + U.randi(-span, span), ty = Math.floor(cy) + U.randi(-span, span);
      if (z && U.dist(tx + 0.5, ty + 0.5, z.x, z.y) > z.r) continue;
      if (G.map.walkable(tx, ty) && !G.map.portalAt(tx, ty) && !this.nearPortal(tx + 0.5, ty + 0.5, 4)) {
        playerWalkTo(tx, ty);
        return;
      }
    }
  },
  goHome(reason) {
    const p = G.player, e = p.inventory.find(x => x.id === 'hearth_rune');
    this.toggle(false);
    UI.msg(L(`บอทหยุด: ${reason}${e ? ' — ใช้ Return Beacon กลับฐาน' : ''}`, `Bot stopped: ${reason}${e ? ' — using a Return Beacon to go home' : ''}`), 'err');
    if (e) useItem(e);
  },
  summary() {
    const s = this.stats;
    if (!s) return null;
    const mins = Math.max(0, (G.time - s.start) / 60);
    return { mins, kills: s.kills, bexp: s.bexp, jexp: s.jexp, items: s.items, zeny: G.player.zeny - s.zenyStart };
  },
};
