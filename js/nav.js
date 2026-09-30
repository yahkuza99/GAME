'use strict';
// ============================================================
//  ระบบนำทาง: เลือกจุดหมาย (NPC / แผนที่ / มอนสเตอร์) แล้วเดินไปเอง
//  ข้ามแผนที่ได้ (หาเส้นทางผ่านประตูด้วย BFS) มีลูกศรชี้ทางและป้ายบอกระยะ
// ============================================================

const Nav = {
  target: null, // { kind:'npc'|'map'|'mob'|'tile', map, x, y, name, npcId, mobId }
  repathAt: 0, doneAt: 0,

  // ---------- จุดหมายที่เลือกได้ ----------
  places() {
    const out = [];
    for (const id in MAP_DEFS) for (const n of MAP_DEFS[id].npcs || []) out.push({ kind: 'npc', map: id, x: n.x, y: n.y, name: n.name, npcId: n.id, mapName: MAP_DEFS[id].name });
    return out;
  },
  maps() { return Object.keys(MAP_DEFS).map(id => ({ kind: 'map', map: id, name: MAP_DEFS[id].name, thai: MAP_DEFS[id].thai, level: MAP_DEFS[id].level })); },
  mobs() {
    const out = [];
    for (const id in MAP_DEFS) {
      const d = MAP_DEFS[id];
      for (const [mid] of d.spawns || []) out.push({ kind: 'mob', map: id, mobId: mid, name: MOBS[mid].name, lv: MOBS[mid].lv, mapName: d.name });
      if (d.mvp) out.push({ kind: 'mob', map: id, mobId: d.mvp, name: MOBS[d.mvp].name, lv: MOBS[d.mvp].lv, mapName: d.name, mvp: true });
    }
    return out.sort((a, b) => a.lv - b.lv);
  },

  // ---------- เส้นทางข้ามแผนที่ (BFS บนกราฟประตู) ----------
  route(from, to) {
    if (from === to) return [];
    const prev = { [from]: null }, q = [from];
    while (q.length) {
      const cur = q.shift();
      for (const side in MAP_DEFS[cur].links || {}) {
        const nx = MAP_DEFS[cur].links[side];
        if (nx in prev) continue;
        prev[nx] = { from: cur, side }; q.push(nx);
      }
    }
    if (!(to in prev)) return null;
    const steps = []; let c = to;
    while (prev[c]) { steps.unshift(prev[c]); c = prev[c].from; }
    return steps; // [{from, side}] ทางออกที่ต้องใช้ทีละแผนที่
  },

  goTo(t) {
    const p = G.player;
    if (!G.started || !p || p.dead) return;
    if (t.kind === 'map' && t.map === G.map.id) { UI.msg(`คุณอยู่ที่ ${t.name} แล้ว`, 'info'); return; }
    if (this.route(G.map.id, t.map) === null) { UI.msg('หาเส้นทางไปที่นั่นไม่ได้', 'err'); return; }
    this.target = t; this.repathAt = 0; this.doneAt = 0;
    p.target = null; p.pickTarget = null; p.npcTarget = null; p.skillIntent = null; p.sitting = false;
    Bot.manualOverride();
    Sound.play('click');
    UI.msg(`🧭 กำลังนำทางไป ${t.name}${t.map !== G.map.id ? ` (${MAP_DEFS[t.map].name})` : ''} — คลิกที่พื้นเพื่อยกเลิก`, 'info');
    UI.close('w-nav'); UI.close('w-map');
    this.updatePill();
  },
  cancel(silent) {
    if (!this.target) return;
    this.target = null;
    if (!silent) UI.msg('ยกเลิกการนำทาง', 'info');
    this.updatePill();
  },

  // จุดที่ต้องเดินไปในแผนที่ปัจจุบัน (ประตูถัดไป หรือจุดหมายจริง)
  waypoint() {
    const t = this.target, map = G.map;
    if (!t) return null;
    if (t.map !== map.id) {
      const steps = this.route(map.id, t.map);
      if (!steps || !steps.length) return null;
      const next = MAP_DEFS[map.id].links[steps[0].side];
      const pt = map.portals.find(q => q.to === next);
      return pt ? { x: pt.x, y: pt.y, portal: true, label: MAP_DEFS[pt.to].name } : null;
    }
    if (t.kind === 'npc') return { x: t.x, y: t.y + 1, npc: true, label: t.name };
    if (t.kind === 'mob') {
      const m = G.mobs.filter(m => !m.dead && m.def.id === t.mobId).sort((a, b) => U.dist(a.x, a.y, G.player.x, G.player.y) - U.dist(b.x, b.y, G.player.x, G.player.y))[0];
      return m ? { x: Math.floor(m.x), y: Math.floor(m.y), mob: m, label: t.name } : { x: map.w >> 1, y: map.h >> 1, label: t.name, none: true };
    }
    return { x: t.x, y: t.y, label: t.name };
  },

  update() {
    const p = G.player, t = this.target;
    if (!t || !G.started || p.dead) return;
    if (p.target || p.npcTarget || p.cast) return; // กำลังสู้/คุยอยู่ ปล่อยให้เสร็จก่อน
    Bot.manualOverride();
    const wp = this.waypoint();
    if (!wp) { this.cancel(); return; }
    const d = U.dist(p.x, p.y, wp.x + 0.5, wp.y + 0.5);
    const arrive = wp.mob ? 4 : wp.npc ? 1.2 : 0.8;
    if (d <= arrive && !wp.portal) {
      if (wp.npc) { const n = G.npcs.find(n => n.id === t.npcId); if (n) p.npcTarget = n; }
      else if (wp.mob) { p.target = wp.mob; p.repathAt = 0; UI.msg(`ถึงตัว ${t.name} แล้ว — เริ่มโจมตี`, 'info'); }
      else if (wp.none) UI.msg(`มาถึง ${MAP_DEFS[t.map].name} แล้ว แต่ยังไม่พบ ${t.name} ในตอนนี้ ลองเดินหารอบ ๆ`, 'info');
      else UI.msg(`ถึง ${t.name} แล้ว`, 'info');
      this.target = null; this.updatePill();
      return;
    }
    if (!p.path.length && G.time >= this.repathAt) {
      this.repathAt = G.time + 0.6;
      p.path = findPath(G.map, Math.floor(p.x), Math.floor(p.y), wp.x, wp.y, 20000);
      if (!p.path.length) {
        // ลองช่องข้าง ๆ (จุดหมายอาจเดินไม่ได้ เช่น ตัว NPC)
        for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1]]) {
          p.path = findPath(G.map, Math.floor(p.x), Math.floor(p.y), wp.x + dx, wp.y + dy, 20000);
          if (p.path.length) break;
        }
        if (!p.path.length) { UI.msg('เดินไปจุดนั้นไม่ได้', 'err'); this.cancel(true); }
      }
    }
    this.updatePill();
  },
  onMapChange() { this.repathAt = 0; if (this.target) this.updatePill(); },

  // ---------- ป้ายบอกสถานะบนจอ ----------
  updatePill() {
    const el = $('#nav-pill'); if (!el) return;
    const t = this.target;
    if (!t) { el.hidden = true; return; }
    const wp = this.waypoint();
    const d = wp ? Math.round(U.dist(G.player.x, G.player.y, wp.x + 0.5, wp.y + 0.5)) : 0;
    const txt = `${t.name}${wp && wp.portal ? ` → ${wp.label}` : ''} • ${d} ช่อง`;
    const tx = $('#nav-text');
    if (tx.textContent !== txt) tx.textContent = txt;
    el.hidden = false;
  },
  // ลูกศรเหนือหัวผู้เล่น + หมุดปลายทาง (วาดในพิกัดโลกที่ฉายแล้ว)
  draw(g, t) {
    const wp = this.waypoint(); if (!wp) return;
    const p = G.player, P = R.py;
    const px = p.x * TILE, py = P(p.y * TILE) - 70 - Math.sin(t * 4) * 3;
    const ang = Math.atan2(P((wp.y + 0.5) * TILE) - P(p.y * TILE), (wp.x + 0.5) * TILE - px);
    g.save(); g.translate(px, py); g.rotate(ang);
    g.shadowColor = '#62e3ff'; g.shadowBlur = 10;
    g.fillStyle = '#9ff0ff'; g.strokeStyle = '#0a3a5a'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(12, 0); g.lineTo(-7, -7); g.lineTo(-3, 0); g.lineTo(-7, 7); g.closePath(); g.fill(); g.stroke();
    g.restore();
    // หมุดปลายทาง
    const dx = (wp.x + 0.5) * TILE, dy = P((wp.y + 0.5) * TILE);
    const k = (t * 1.2) % 1;
    g.strokeStyle = `rgba(98,227,255,${1 - k})`; g.lineWidth = 2;
    g.beginPath(); g.ellipse(dx, dy, 8 + k * 22, (8 + k * 22) * 0.45, 0, 0, 7); g.stroke();
    g.fillStyle = '#62e3ff'; g.shadowColor = '#62e3ff'; g.shadowBlur = 8;
    g.beginPath(); g.moveTo(dx, dy - 4); g.lineTo(dx - 6, dy - 22); g.lineTo(dx + 6, dy - 22); g.closePath(); g.fill();
    g.shadowBlur = 0;
    R.label(g, dx, dy - 30, wp.portal ? `→ ${wp.label}` : wp.label, '#bff4ff', true);
  },
};
