'use strict';
// ============================================================
//  ระบบบอท (Auto Hunt): ล่ามอนสเตอร์ ใช้สกิล ใช้ชุดซ่อม นั่งพัก เก็บของ อัตโนมัติ
//  ทำงานต่อได้แม้สลับแท็บ (จำลองย้อนหลังเมื่อกลับมา สูงสุด 10 นาที)
// ============================================================

const HP_POTS = ['white_potion', 'yellow_potion', 'orange_potion', 'mead', 'meat', 'red_potion', 'red_herb', 'carrot', 'apple', 'green_herb'];
const SP_POTS = ['blue_potion', 'mead', 'grape'];

const Bot = {
  on: false, nextThink: 0, pauseUntil: 0, resting: false, blacklist: new Map(),
  tgtSince: 0, tgtHp: 0, lastTgt: null, wanderAt: 0, skillIdx: 0, warnedTown: false,
  stats: null,

  defaults() {
    return { skills: {}, hpPot: 50, spPot: 20, restHp: 35, restSp: 10, healAt: 60, useBuffs: true, avoidMvp: true,
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
    if (want && p.dead) { UI.msg('ฟื้นคืนชีพก่อนจึงจะเปิดบอทได้', 'err'); return; }
    // ช่วงแรกให้เล่นเอง: บอทปลดล็อกเมื่ออัปเกรดคลาสแรกแล้ว
    if (want && !this.unlocked()) { UI.msg(`🔒 บอท AUTO ปลดล็อกเมื่ออัปเกรดคลาสแรก (Job Lv ${JOB_CHANGE_LV} แล้วคุยกับ Mimir AI)`, 'err'); return; }
    this.on = want;
    this.resting = false; this.pauseUntil = 0; this.warnedTown = false;
    if (want) {
      this.setAnchor(true);
      this.stats = { start: G.time, kills: 0, bexp: 0, jexp: 0, items: 0, zenyStart: p.zeny };
      UI.msg('▶ เริ่มบอทล่ามอนสเตอร์อัตโนมัติ (แตะ AUTO อีกครั้งเพื่อหยุด)', 'sys');
      if (G.map.def.kind === 'town') UI.msg('บอทจะเริ่มทำงานเมื่อออกไปยังแผนที่ที่มีมอนสเตอร์', 'info');
    } else {
      p.sitting = false;
      UI.msg('■ หยุดบอทแล้ว', 'sys');
    }
    UI.updateBotButton();
    UI.dirty();
  },
  // ขอบเขตการล่า: วงรัศมี radius รอบจุดที่เปิดบอท (หรือกด "ตั้งศูนย์กลางที่นี่")
  anchor: null,
  setAnchor(quiet) {
    const p = G.player;
    if (G.map.def.kind === 'town') { this.anchor = null; return; }
    this.anchor = { map: G.map.id, x: p.x, y: p.y };
    if (!quiet) UI.msg('ตั้งศูนย์กลางขอบเขตการล่าที่ตำแหน่งนี้แล้ว', 'info');
  },
  zone() {
    const c = this.cfg();
    if (!c.leash) return null;
    if (!this.anchor || this.anchor.map !== G.map.id) this.setAnchor(true); // เปลี่ยนแมพ = ตั้งศูนย์กลางใหม่
    return this.anchor && { x: this.anchor.x, y: this.anchor.y, r: c.radius };
  },
  // ผู้เล่นสั่งเดินเอง → หยุดบอทชั่วคราว
  manualOverride() {
    if (!this.on) return;
    this.pauseUntil = G.time + 4;
    this.resting = false;
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
    UI.msg('บอทหยุดทำงานเพราะตัวละครเสียชีวิต', 'err');
  },

  findItem(list) {
    const inv = G.player.inventory;
    for (const id of list) { const e = inv.find(x => x.id === id && x.qty > 0); if (e) return e; }
    return null;
  },
  canCast(id) {
    const p = G.player, s = SKILLS[id], lv = skillLv(id);
    if (!lv || !s || s.type !== 'active') return false;
    const c = this.cfg();
    if (c.skills[id] === false) return false;
    // ตั้งรายสกิล: ใช้เฉพาะตอน HP ต่ำกว่า X% (0 = ใช้ได้ตลอด)
    const hpGate = (c.skillHp || {})[id];
    if (hpGate && p.hp / p.d.maxHp * 100 >= hpGate) return false;
    if (G.time < p.skillReadyAt || p.cast || skillCdLeft(id) > 0) return false;
    if (s.bow && weaponType() !== 'bow') return false;
    return canPaySkill(skillCost(id, lv)) && (!p.d.bloodmagic || p.hp - skillCost(id, lv) > p.d.maxHp * 0.4);
  },
  // บทบาทของสกิลสำหรับบอท
  role(id) {
    const s = SKILLS[id];
    if (s.heal) return 'heal';
    if (s.special === 'summon_wolf') return 'summon';
    if (s.special === 'stealth') return 'opener';
    if (s.buff && !s.dmg) return 'buff';
    if (s.special === 'trap') return 'trap';
    if (s.dmg) return s.dmg.at === 'self' ? 'aoe' : 'attack';
    return 'other';
  },

  update() {
    const p = G.player, c = this.cfg();
    if (!this.on || p.dead || G.time < this.nextThink) return;
    this.nextThink = G.time + 0.2;
    if (G.time < this.pauseUntil || NPC.busy) return;
    if (G.map.def.pvp) { if (!this.warnedPvp) { this.warnedPvp = true; UI.msg('บอทไม่ทำงานในลานประลอง PvP', 'info'); } return; }
    this.warnedPvp = false;
    if (G.map.def.kind === 'town') {
      if (!this.warnedTown) { this.warnedTown = true; UI.msg('บอทรออยู่: ออกไปยังแผนที่ล่ามอนสเตอร์ได้เลย', 'info'); }
      return;
    }
    this.warnedTown = false;
    const hpPct = p.hp / p.d.maxHp * 100, spPct = p.sp / p.d.maxSp * 100;
    const threats = G.mobs.filter(m => !m.dead && m.state === 'chase' && U.dist(m.x, m.y, p.x, p.y) < 9);

    // 1) ฟื้นฟู: สกิลฮีล → ยา
    if (hpPct < c.healAt) for (const id in p.skills) {
      if (this.role(id) !== 'heal' || !this.canCast(id)) continue;
      if (SKILLS[id].heal(skillLv(id), p.d, p) < p.d.maxHp * 0.08) continue; // ฮีลน้อยเกินไป ไม่คุ้มดีเลย์
      useSkill(id); return;
    }
    if (hpPct < c.hpPot) {
      const e = this.findItem(HP_POTS);
      if (e) useItem(e);
      else if (hpPct < 20 && threats.length && c.returnHome) return this.goHome('HP ต่ำและยาหมด');
    }
    if (spPct < c.spPot) { const e = this.findItem(SP_POTS); if (e) useItem(e); }
    if (p.cast || p.skillIntent) return;

    // 2) นั่งพัก (โหมดตีปกติไม่ใช้ SP จึงไม่พักเพราะ SP)
    const needSp = c.style !== 'basic';
    if (this.resting) {
      if (threats.length || !c.rest || (hpPct >= Math.min(90, c.restHp + 45) && (!needSp || spPct >= Math.min(80, c.restSp + 35)))) { this.resting = false; p.sitting = false; }
      else { if (!p.sitting) { p.path = []; p.target = null; p.sitting = true; } return; }
    }
    if (c.rest && !threats.length && (hpPct < c.restHp || (needSp && spPct < c.restSp))) {
      this.resting = true; p.target = null; p.path = []; p.sitting = true;
      return;
    }

    // 3) บัฟ / เรียกสัตว์คู่ใจ
    if (c.useBuffs) {
      for (const id in p.skills) {
        const r = this.role(id);
        if (r === 'buff' && !p.buffs[id] && this.canCast(id)) { useSkill(id); return; }
        if (r === 'summon' && !G.allies.length && this.canCast(id)) { useSkill(id); return; }
      }
    }

    // 4) เก็บของที่ตกอยู่ใกล้ ๆ (กรณีปิด Auto Loot)
    if (!threats.length && !p.options.autoLoot) {
      const d = G.drops.filter(x => U.dist(x.x, x.y, p.x, p.y) < 7).sort((a, b) => U.dist(a.x, a.y, p.x, p.y) - U.dist(b.x, b.y, p.x, p.y))[0];
      if (d) { if (p.pickTarget !== d) { p.target = null; p.pickTarget = d; p.path = []; } return; }
    }
    if (p.pickTarget) return;

    // 5) เลือกเป้าหมาย
    let t = p.target && !p.target.dead && G.mobs.includes(p.target) ? p.target : null;
    if (t && t !== this.lastTgt) { this.lastTgt = t; this.tgtSince = G.time; this.tgtHp = t.hp; }
    if (t) {
      if (t.hp < this.tgtHp) { this.tgtHp = t.hp; this.tgtSince = G.time; }
      else if (G.time - this.tgtSince > 8) { this.blacklist.set(t, G.time + 15); p.target = null; t = null; }
    }
    if (!t || (!threats.includes(t) && threats.length)) {
      t = this.pickTarget(threats, c) || t;
      if (t) { p.target = t; p.repathAt = 0; p.sitting = false; }
    }
    if (!t) { this.wander(); return; }

    // 6) ใช้สกิลโจมตี (โหมด "ตีปกติ" ข้าม)
    if (c.style === 'basic') return;
    const dist = U.dist(p.x, p.y, t.x, t.y);
    const ids = Object.keys(p.skills).filter(id => this.canCast(id));
    const order = ids.length ? ids.slice(this.skillIdx % ids.length).concat(ids.slice(0, this.skillIdx % ids.length)) : [];
    for (const id of order) {
      const r = this.role(id), s = SKILLS[id];
      let ok = false;
      if (r === 'attack') ok = true;
      else if (r === 'aoe') ok = G.mobs.some(m => !m.dead && U.dist(m.x, m.y, p.x, p.y) <= s.dmg.area);
      else if (r === 'trap') ok = dist < 2.5 && G.traps.length < 3;
      else if (r === 'opener') ok = t.state !== 'chase' && dist < 6 && !threats.length;
      if (!ok) continue;
      this.skillIdx++;
      if (r === 'attack') beginSkill(id, skillLv(id), t); else useSkill(id);
      return;
    }
  },

  pickTarget(threats, c) {
    const p = G.player;
    const ok = m => !m.dead && !m.def.dummy && !(c.avoidMvp && m.isMvp && m.state !== 'chase') && !((this.blacklist.get(m) || 0) > G.time);
    const byDist = (a, b) => U.dist(a.x, a.y, p.x, p.y) - U.dist(b.x, b.y, p.x, p.y);
    const th = threats.filter(ok).sort(byDist);
    if (th.length) return th[0];
    const z = this.zone();
    const inRange = m => z ? U.dist(m.x, m.y, z.x, z.y) <= z.r : U.dist(m.x, m.y, p.x, p.y) <= c.radius;
    // มอนที่ไม่ได้เลือกไว้: ไม่เข้าไปตีเอง (แต่ถ้ามันตีเราก่อน ยังสู้กลับด้านบน)
    const skip = c.skipMobs || {};
    return G.mobs.filter(m => ok(m) && !skip[m.def.id] && inRange(m)).sort(byDist)[0] || null;
  },
  wander() {
    const p = G.player;
    if (p.path.length && G.time < this.wanderAt) return;
    this.wanderAt = G.time + 6;
    const z = this.zone();
    for (let i = 0; i < 20; i++) {
      const cx = z ? z.x : p.x, cy = z ? z.y : p.y, span = z ? Math.max(2, Math.floor(z.r * 0.8)) : 10;
      const tx = Math.floor(cx) + U.randi(-span, span), ty = Math.floor(cy) + U.randi(-span, span);
      if (z && U.dist(tx + 0.5, ty + 0.5, z.x, z.y) > z.r) continue;
      if (G.map.walkable(tx, ty) && !G.map.portalAt(tx, ty) && !G.map.portals.some(pt => U.dist(pt.x, pt.y, tx, ty) < 4)) {
        playerWalkTo(tx, ty);
        return;
      }
    }
  },
  goHome(reason) {
    const p = G.player, e = p.inventory.find(x => x.id === 'hearth_rune');
    this.toggle(false);
    UI.msg(`บอทหยุด: ${reason}${e ? ' — ใช้ Return Beacon กลับฐาน' : ''}`, 'err');
    if (e) useItem(e);
  },
  summary() {
    const s = this.stats;
    if (!s) return null;
    const mins = Math.max(0, (G.time - s.start) / 60);
    return { mins, kills: s.kills, bexp: s.bexp, jexp: s.jexp, items: s.items, zeny: G.player.zeny - s.zenyStart };
  },
};
