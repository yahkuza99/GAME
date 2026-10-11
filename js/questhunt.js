'use strict';
// ============================================================
//  ล่าตามเควสต์ (Quest Hunt) — เจ้าของ 2026-10-11:
//    "Quest ที่ให้ไปฆ่ามอนสเตอร์ ถ้าให้นำทางไปแล้ว ก็ให้มันฆ่ามอนสเตอร์ตัวที่ถูกระบุ" + "ใช้ logic auto ที่ตั้งค่าไว้ในเรื่อง skill"
//  จุดนำทางของเควสต์ล่า/เก็บของ (เควสต์หลัก • ขั้นเควสต์เสริม • ค่าหัว • ภารกิจประจำวัน "ล่า") แนบ t.hunt มาด้วย (QuestHunt.attach)
//  ถึงตัวมอนแล้ว (js/nav.js) → QuestHunt.start:
//    • ปลดล็อก AUTO แล้ว (มี Class แรก): เปิดบอทเดิม (js/bot.js) ด้วยค่าตั้งของผู้เล่นทุกอย่าง (สกิล/HP รายสกิล/สไตล์/พัก/ULT/ยา)
//      แต่จำกัดเป้า "ตัวใหม่" ให้เหลือมอนของเควสต์ (Bot.only) — ตัวที่ตีเราก่อนยังสู้กลับตามปกติ • ไม่ต้องเดินหามอนชนิดอื่น
//      ครบแล้ว: ปลดข้อจำกัด • ถ้าก่อนหน้านี้ AUTO ปิดอยู่ → ปิดกลับ / เปิดอยู่ → ปล่อยเปิดไว้
//    • ยังไม่ปลดล็อก (Novice): วนเลือกเป้าเอง — ตีตัวที่ไล่ตีเราก่อน แล้วเลือกมอนเควสต์ตัวใกล้สุด (ตีปกติผ่าน p.target เหมือนแตะเอง)
//    • ไม่มีมอนเควสต์ในสายตา: เดินไปแหล่งเกิดของมัน (MobAreas) แล้วรอเกิดใหม่ (มีข้อความบอก)
//  หยุดเมื่อ: ครบ (ประกาศ + นำทางไปส่งเควสต์ถ้าต้องส่ง) • ผู้เล่นเดิน/จอย/แตะพื้น/กด × (Nav.cancel) • เปิดนำทางอื่น (Nav.goTo)
//            • ออกจากแมพ • ตาย • ผู้เล่นปิด AUTO เองระหว่างล่า
//  ไม่วาร์ป ไม่โกงดาเมจ — ขยับผ่าน p.target / playerWalkTo เท่านั้น (ล็อกท่าตีใน moveEntity ยังทำงานตามปกติ)
// ============================================================
const QuestHunt = {
  cur: null, // { mobId, name, title, done(), prog() → [a,b], after() → จุดนำทางส่งเควสต์ | null, note(), map, bot, botWas, nextAt, hintAt }
  STEP: 0.25,

  // แนบโหมดล่าเข้ากับจุดนำทาง (คืนอ็อบเจกต์ใหม่ ไม่แก้ของเดิม)
  attach(t, o) {
    if (!t || t.kind !== 'mob' || !o || !MOBS[t.mobId]) return t;
    return { ...t, hunt: { mobId: t.mobId, name: MOBS[t.mobId].name, ...o } };
  },
  npcT(id) {
    for (const m in MAP_DEFS) { const n = (MAP_DEFS[m].npcs || []).find(x => x.id === id); if (n) return { kind: 'npc', map: m, x: n.x, y: n.y, name: n.name, npcId: n.id }; }
    return null;
  },
  active() { return !!this.cur; },
  prog(h = this.cur) { try { const r = h.prog ? h.prog() : null; return Array.isArray(r) ? r : null; } catch (e) { return null; } },
  isDone(h = this.cur) { try { return !!h.done(); } catch (e) { return true; } },
  canBot(h) { return Bot.unlocked() && !(MOBS[h.mobId] || {}).dummy && !G.map.def.pvp && G.map.def.kind !== 'town'; },

  start(h) {
    const p = G.player;
    this.stop(null, true);
    if (!h || p.dead) return;
    if (this.isDone(h)) { this.cur = { ...h, map: G.map.id }; this.finish(); return; }
    const c = { ...h, map: G.map.id, bot: this.canBot(h), botWas: Bot.on, nextAt: 0, hintAt: 0 };
    this.cur = c;
    const pr = this.prog(c), cnt = pr ? ` ${pr[0]}/${pr[1]}` : '';
    if (c.bot) {
      Bot.only = c.mobId;
      if (!Bot.on) Bot.toggle(true);
      else { Bot.reset(); Bot.manual = false; Bot.userTgt = null; Bot.pauseUntil = 0; }
      if (!Bot.on) { Bot.only = null; c.bot = false; } // เปิดไม่ได้ (เช่น เพิ่งตาย) → ใช้โหมดตีเอง
    }
    UI.msg(c.bot
      ? L(`🎯 ถึงแล้ว — ล่า ${c.name}${cnt} ด้วย AUTO ตามค่าตั้งบอทของคุณ (ไม่ไล่ตีมอนชนิดอื่น) • แตะป้ายด้านบนเพื่อหยุด`, `🎯 Arrived — hunting ${c.name}${cnt} with AUTO using your bot settings (other monsters are left alone) • tap the banner to stop`)
      : L(`🎯 ถึงแล้ว — ล่า ${c.name}${cnt} จนครบ (ไม่ไล่ตีมอนชนิดอื่น) • เดินเอง/แตะป้ายด้านบนเพื่อหยุด`, `🎯 Arrived — hunting ${c.name}${cnt} until done (other monsters are left alone) • move or tap the banner to stop`), 'info');
    Nav.updatePill();
  },
  // คืนสถานะบอท (ปิดกลับถ้าเราเป็นคนเปิด)
  release(c) {
    if (!c || !c.bot) return;
    Bot.only = null;
    if (!c.botWas && Bot.on) Bot.toggle(false);
  },
  stop(reason, silent) {
    const c = this.cur; if (!c) return;
    this.cur = null;
    this.release(c);
    if (G.player && !G.player.dead && reason !== 'nav') { const p = G.player; if (!c.bot && p.target && p.target.def && p.target.def.id === c.mobId && reason === 'cancel') p.target = null; }
    if (!silent && reason) {
      const why = { cancel: L('หยุดล่าตามเควสต์แล้ว', 'Quest hunt stopped'), map: L('ออกจากแผนที่ — หยุดล่าตามเควสต์', 'Left the map — quest hunt stopped'),
        dead: L('ตัวละครล้ม — หยุดล่าตามเควสต์', 'You fell — quest hunt stopped'), bot: L('ปิด AUTO แล้ว — หยุดล่าตามเควสต์', 'AUTO turned off — quest hunt stopped') }[reason];
      if (why) UI.msg(why, 'info');
    }
    Nav.updatePill();
  },
  finish() {
    const c = this.cur; if (!c) return;
    this.cur = null;
    this.release(c);
    const p = G.player;
    if (!c.bot && p.target && p.target.def && p.target.def.id === c.mobId && p.target.state !== 'chase') p.target = null;
    let nx = null;
    try { nx = c.after ? c.after() : null; } catch (e) { console.error(e); }
    const msg = nx ? L(`✅ ล่า ${c.name} ครบแล้ว — กลับไปส่งเควสต์ที่ ${nx.name}`, `✅ ${c.name} hunt complete — heading back to ${nx.name} to turn in`)
      : (c.note ? c.note() : null) || L(`✅ ล่า ${c.name} ครบแล้ว`, `✅ ${c.name} hunt complete`);
    UI.msg(msg, 'lvl');
    if (typeof UI.announce === 'function') UI.announce(msg.replace(/^✅ /, ''));
    Nav.updatePill();
    if (nx) Nav.goTo(nx);
  },

  // เรียกทุกเฟรมจาก Nav.update (และจาก Bot.update ระหว่างจำลองย้อนหลังตอนสลับแท็บ)
  update() {
    const c = this.cur, p = G.player; if (!c || !G.started || !p) return;
    if (p.dead) { this.stop('dead'); return; }
    if (G.map.id !== c.map) { this.stop('map'); return; }
    if (this.isDone(c)) { this.finish(); return; }
    if (c.bot) { if (!Bot.on) { c.bot = false; Bot.only = null; this.stop('bot'); return; } Bot.only = c.mobId; }
    if (G.time < c.nextAt) return;
    c.nextAt = G.time + this.STEP;
    Nav.updatePill();
    if (!c.bot) this.think(c);
  },
  // โหมดตีเอง (AUTO ยังไม่ปลดล็อก)
  think(c) {
    const p = G.player;
    if (p.cast || p.skillIntent || p.npcTarget || p.pickTarget || NPC.busy) return;
    if (p.target && !p.target.dead && G.mobs.includes(p.target)) return; // ตีตัวเดิมให้จบก่อน
    p.target = null;
    // ตัวที่ไล่ตีเราอยู่ใกล้ ๆ → สู้กลับก่อน (ไม่ยืนให้ตี)
    const th = G.mobs.filter(m => !m.dead && !m.def.dummy && m.state === 'chase' && U.dist(m.x, m.y, p.x, p.y) < 3)
      .sort((a, b) => U.dist(a.x, a.y, p.x, p.y) - U.dist(b.x, b.y, p.x, p.y))[0];
    if (th) { p.sitting = false; p.target = th; p.repathAt = 0; return; }
    const m = G.mobs.filter(x => !x.dead && x.def.id === c.mobId).sort((a, b) => U.dist(a.x, a.y, p.x, p.y) - U.dist(b.x, b.y, p.x, p.y))[0];
    if (m) { p.sitting = false; p.target = m; p.repathAt = 0; return; }
    this.roam(c);
  },
  // ไม่มีมอนเควสต์ให้เห็น: เดินไปแหล่งเกิดของมัน แล้วรอเกิดใหม่ (Bot.wander ก็เรียกตรงนี้)
  roam(c = this.cur) {
    const p = G.player; if (!c) return false;
    const a = typeof MobAreas !== 'undefined' ? MobAreas.get(G.map, c.mobId) : null;
    const cx = a ? a.x : G.map.w / 2, cy = a ? a.y : G.map.h / 2;
    if (U.dist(p.x, p.y, cx, cy) > 3 && !p.path.length) {
      const pos = G.map.walkable(Math.floor(cx), Math.floor(cy)) ? { x: cx, y: cy } : G.map.nearestWalkable(cx, cy);
      if (pos) playerWalkTo(Math.floor(pos.x), Math.floor(pos.y));
    }
    if (G.time >= (c.hintAt || 0)) {
      c.hintAt = G.time + 12;
      UI.msg(L(`ยังไม่เห็น ${c.name} — ไปรอที่แหล่งเกิดของมัน (เกิดใหม่เร็ว ๆ นี้)`, `No ${c.name} in sight — waiting at its spawn area (respawning soon)`), 'info');
    }
    return true;
  },
  pillText() {
    const c = this.cur; if (!c) return '';
    const pr = this.prog(c), n = pr ? ` ${Math.min(pr[0], pr[1])}/${pr[1]}` : '';
    return L(`ล่า ${c.name}${n}${c.bot ? ' (AUTO)' : ''} · แตะเพื่อหยุด`, `Hunt ${c.name}${n}${c.bot ? ' (AUTO)' : ''} · tap to stop`);
  },
};
