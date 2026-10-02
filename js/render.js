'use strict';
// ============================================================
//  การเรนเดอร์โลก: กล้อง, พื้น, ตัวละคร, เอฟเฟกต์, ตัวเลขดาเมจ
// ============================================================

const R = {
  cv: null, g: null, W: 0, H: 0, dpr: 1, zoom: 1, camX: 0, camY: 0, quality: 'high',
  // มุมกล้อง 2.5D แบบ RO: พื้นถูกบีบแนวตั้ง (มองเฉียง) แต่ตัวละคร/ต้นไม้ยืนตรง
  K: 0.76, ZMIN: 0.7, ZMAX: 2.2,
  dark: null, mouse: { x: -1, y: -1, wx: 0, wy: 0, down: false },
};

R.init = () => {
  R.cv = document.getElementById('cv');
  R.g = R.cv.getContext('2d');
  R.dark = document.createElement('canvas');
  R.resize();
  // ซูมเริ่มต้นแบบ Trickster: กล้องใกล้ ตัวละคร/ต้นไม้ใหญ่เด่น (จอเล็กซูมน้อยลงเพื่อให้เห็นรอบตัวพอ)
  const short = Math.min(window.innerWidth, window.innerHeight);
  R.zoom = short < 500 ? 1.35 : short < 700 ? 1.55 : 1.8;
  if (window.innerHeight > window.innerWidth && short < 500) R.zoom = 1.2; // มือถือแนวตั้ง: จอแคบ ซูมน้อยลงให้เห็นข้าง ๆ พอ
  window.addEventListener('resize', R.resize);
  // iOS / เบราว์เซอร์ในแอป (LINE ฯลฯ): ปิดคีย์บอร์ดหรือหมุนจอแล้วบางทีไม่ส่ง resize หรือส่งก่อนขนาดจอจะอัปเดต
  // → แคนวาสค้างขนาดตอนคีย์บอร์ดเปิด (ครึ่งล่างดำ) จึงเช็กซ้ำหลังเหตุการณ์เหล่านี้ และเช็กเบา ๆ ทุก 0.5 วิ
  const later = () => { R.fitCheck(); setTimeout(R.fitCheck, 300); setTimeout(R.fitCheck, 900); };
  window.addEventListener('orientationchange', later);
  window.addEventListener('focusout', later);
  window.addEventListener('pageshow', later);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', later);
  setInterval(R.fitCheck, 500);
};
// คุณภาพกราฟิก: 'low' = ความละเอียด 1x ไม่มีหญ้าพลิ้ว/หมอก/ฝุ่นลอย (มือถือรุ่นเก่าลื่นขึ้นมาก)
R.setQuality = q => { R.quality = q === 'low' ? 'low' : 'high'; R.resize(); };
R.fitCheck = () => { if (window.innerWidth !== R.W || window.innerHeight !== R.H) R.resize(); };
R.resize = () => {
  R.dpr = Math.min(window.devicePixelRatio || 1, R.quality === 'low' ? 1 : 2);
  R.W = window.innerWidth; R.H = window.innerHeight;
  R.cv.width = Math.floor(R.W * R.dpr); R.cv.height = Math.floor(R.H * R.dpr);
  R.cv.style.width = R.W + 'px'; R.cv.style.height = R.H + 'px';
  R.dark.width = Math.ceil(R.W / 2); R.dark.height = Math.ceil(R.H / 2);
};
// กล้องสั่นเบา ๆ (คริติคอล / โดนบอส)
R.shakeT = 0; R.shakeA = 0;
R.kick = (amp, dur) => { if (G.fastSim) return; R.shakeA = Math.max(R.shakeA * (R.shakeT > 0 ? 1 : 0), amp); R.shakeT = Math.max(R.shakeT, dur); };
R.screenToWorld = (sx, sy) => ({ x: sx / R.zoom + R.camX, y: (sy / R.zoom + R.camY) / R.K });
// พิกัดโลก (พิกเซล) -> พิกัดบนจอก่อนซูม (แกน y ถูกบีบ)
R.py = wy => wy * R.K;

R.updateCamera = () => {
  const p = G.player, m = G.map;
  const vw = R.W / R.zoom, vh = R.H / R.zoom;
  let cx = p.x * TILE - vw / 2, cy = p.y * TILE * R.K - vh / 2 - 20;
  const mw = m.w * TILE, mh = m.h * TILE * R.K;
  cx = mw < vw ? (mw - vw) / 2 : U.clamp(cx, 0, mw - vw);
  cy = mh < vh ? (mh - vh) / 2 : U.clamp(cy, 0, mh - vh);
  R.camX = Math.round(cx * R.zoom) / R.zoom; R.camY = Math.round(cy * R.zoom) / R.zoom;
};

// หาสิ่งที่อยู่ใต้เมาส์ (มอนสเตอร์ / NPC / ไอเทม)
R.pick = (wx, wy) => {
  let best = null, bestD = Infinity;
  wy *= R.K; // เทียบในพิกัดจอ (ตัวละครยืนตรง)
  for (const m of G.mobs) {
    if (m.dead) continue;
    const s = (m.def.scale || 1) * (m.def.size || 1);
    const mx = m.x * TILE, my = m.y * TILE * R.K;
    if (Math.abs(wx - mx) < 20 * s && wy > my - 42 * s && wy < my + 8) {
      const d = Math.hypot(wx - mx, wy - (my - 16 * s));
      if (d < bestD) { bestD = d; best = { kind: 'mob', ref: m }; }
    }
  }
  if (best) return best;
  for (const n of G.npcs) {
    const nx = n.x * TILE + TILE / 2, ny = ((n.y + 0.5) * TILE + 10) * R.K;
    if (Math.abs(wx - nx) < 16 && wy > ny - 52 && wy < ny + 6) return { kind: 'npc', ref: n };
  }
  for (const d of G.drops) {
    if (Math.hypot(wx - d.x * TILE, wy - d.y * TILE * R.K) < 16) return { kind: 'drop', ref: d };
  }
  return null;
};

// ------------------------------------------------------------
R.render = () => {
  const g = R.g, p = G.player, map = G.map, t = G.time;
  g.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
  g.fillStyle = map.def.kind === 'cave' ? '#0c0908' : '#1a2a14';
  g.fillRect(0, 0, R.W, R.H);
  R.updateCamera();
  const vw = R.W / R.zoom, vh = R.H / R.zoom;
  g.save();
  if (R.shakeT > 0) {
    R.shakeT -= 1 / 60;
    const a = R.shakeA * Math.max(0, R.shakeT) * 8;
    g.translate((Math.random() - 0.5) * a, (Math.random() - 0.5) * a);
  }
  g.scale(R.zoom, R.zoom);
  g.translate(-R.camX, -R.camY);
  const K = R.K, wTop = R.camY / K, wH = vh / K; // ขอบบน/ความสูงของพื้นที่เห็นในพิกัดโลก
  // วาดสิ่งที่ยืนตรง ณ ตำแหน่งโลก wy (เลื่อนแกน y ให้ตรงกับพื้นที่ถูกบีบ)
  const upright = (wy, fn) => { g.save(); g.translate(0, wy * (K - 1)); fn(); g.restore(); };

  // ---------- ชั้นพื้น (บีบแนวตั้ง) ----------
  g.save(); g.scale(1, K);
  const sx = Math.max(0, Math.floor(R.camX)), sy = Math.max(0, Math.floor(wTop));
  const sw = Math.min(map.ground.width - sx, Math.ceil(vw) + 2), sh = Math.min(map.ground.height - sy, Math.ceil(wH) + 2);
  if (sw > 0 && sh > 0) g.drawImage(map.ground, sx, sy, sw, sh, sx, sy, sw, sh);
  if (R.quality !== 'low') R.drawGrassWind(g, map, t, sx, sy, sw, sh);
  // น้ำพุมีชีวิต
  g.restore();
  if (map.fountain && !map.fountainImg) upright(map.fountain.y * TILE, () => {
    const fx = map.fountain.x * TILE, fy = map.fountain.y * TILE;
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2, k = (t * 1.2 + i * 0.13) % 1;
      g.fillStyle = `rgba(140,235,255,${0.9 - k})`;
      g.beginPath(); g.arc(fx + Math.cos(a + t) * 16, fy - 32 - k * 40, 1.8, 0, 7); g.fill();
    }
    // วงแหวนโฮโลแกรมหมุน
    g.save(); g.shadowColor = '#7ae8ff'; g.shadowBlur = 12;
    for (let i = 0; i < 3; i++) {
      const yy = fy - 44 - i * 12 + Math.sin(t * 1.5 + i) * 2;
      g.strokeStyle = `rgba(140,235,255,${0.55 - i * 0.12})`; g.lineWidth = 2;
      g.beginPath(); g.ellipse(fx, yy, 16 - i * 3, 5 - i, 0, t * (i % 2 ? 1 : -1), t * (i % 2 ? 1 : -1) + Math.PI * 1.5); g.stroke();
    }
    g.fillStyle = 'rgba(200,250,255,0.9)'; g.beginPath(); g.arc(fx, fy - 40 + Math.sin(t * 2) * 3, 4, 0, 7); g.fill();
    g.restore();
  });
  g.save(); g.scale(1, K);
  // ผิวน้ำระยิบระยับ
  if (map.waterTiles) {
    const wt = map.waterTiles;
    g.lineWidth = 1.4;
    for (let i = 0; i < wt.length; i += 2) {
      const x = wt[i], y = wt[i + 1];
      if (x < R.camX / TILE - 1 || x > (R.camX + vw) / TILE || y < wTop / TILE - 1 || y > (wTop + wH) / TILE) continue;
      const hh = U.hash2(x, y, 3);
      const k = (Math.sin(t * 1.6 + hh * 12) + 1) / 2;
      g.strokeStyle = `rgba(235,250,255,${0.08 + k * 0.32})`;
      const ox = x * TILE + 6 + hh * 20 + Math.sin(t * 0.8 + hh * 6) * 3, oy = y * TILE + 10 + U.hash2(y, x, 5) * 20;
      g.beginPath(); g.moveTo(ox, oy); g.quadraticCurveTo(ox + 5, oy - 2 - k, ox + 10, oy); g.stroke();
      if (hh > 0.7) { g.fillStyle = `rgba(255,255,255,${k * 0.7})`; g.fillRect(ox + 14, oy - 6, 1.5, 1.5); }
    }
  }

  // ช่องที่เมาส์ชี้
  if (R.mouse.x >= 0 && !G.hover && !p.dead) {
    const tx = Math.floor(R.mouse.wx / TILE), ty = Math.floor(R.mouse.wy / TILE);
    if (map.walkable(tx, ty)) {
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.5;
      g.strokeRect(tx * TILE + 2, ty * TILE + 2, TILE - 4, TILE - 4);
    }
  }
  // จุดหมายการเดิน
  if (p.path.length) {
    const last = p.path[p.path.length - 1];
    g.strokeStyle = `rgba(255,240,120,${0.5 + Math.sin(t * 8) * 0.3})`; g.lineWidth = 2;
    g.beginPath(); g.ellipse(last.x * TILE + TILE / 2, last.y * TILE + TILE / 2, 10, 5, 0, 0, 7); g.stroke();
  }

  // กับดัก
  for (const tr of G.traps) Sprites.drawTrap(g, tr, t);
  // เงาเมฆลอยผ่าน (กลางแจ้ง) — อยู่บนพื้น
  if (map.def.kind !== 'cave') {
    const mw = map.w * TILE, mh = map.h * TILE;
    for (let i = 0; i < 5; i++) {
      const cx = ((U.hash2(i, 1, 9) * mw + t * (14 + i * 3)) % (mw + 600)) - 300;
      const cy = U.hash2(i, 2, 9) * mh + Math.sin(t * 0.05 + i) * 40;
      const r = 160 + U.hash2(i, 3, 9) * 140;
      if (cx + r < R.camX || cx - r > R.camX + vw || cy + r < wTop || cy - r > wTop + wH) continue;
      const cg = g.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
      cg.addColorStop(0, 'rgba(20,30,50,0.13)'); cg.addColorStop(1, 'rgba(20,30,50,0)');
      g.fillStyle = cg; g.beginPath(); g.ellipse(cx, cy, r * 1.4, r, 0, 0, 7); g.fill();
    }
  }
  g.restore();
  // ---------- จบชั้นพื้น ----------

  // พอร์ทัล
  for (const pt of map.portals) upright((pt.y + 0.5) * TILE, () => Sprites.drawPortal(g, pt, t));
  // ไอเทมบนพื้น
  for (const d of G.drops) upright(d.y * TILE, () => {
    const x = d.x * TILE, y = d.y * TILE;
    const age = G.time - d.born;
    const pop = age < 0.35 ? Math.sin(age / 0.35 * Math.PI) * 14 : 0;
    Sprites.shadow(g, x, y + 6, 9, 3, 0.3);
    if (typeof LOOT !== 'undefined') LOOT.drawDrop(g, d, x, y, t); // ลำแสงของ rare ขึ้นไป (js/loot.js)
    g.drawImage(itemIconCanvas(d.id, 26), x - 13, y - 13 - pop);
    if (ITEMS[d.id].type === 'card' || ITEMS[d.id].price >= 5000) {
      g.strokeStyle = `rgba(255,230,120,${0.5 + Math.sin(t * 6) * 0.4})`; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y - pop, 15, 0, 7); g.stroke();
    }
  });

  // โหมดเล็งสกิล (แบบ RO): วงระยะสกิลรอบตัว + ไฮไลต์มอนที่ชี้/ใกล้นิ้ว
  if (G.pendingSkill && SKILLS[G.pendingSkill]) {
    const sk = SKILLS[G.pendingSkill], col = sk.icon || '#6ff3ff', rr2 = Math.max(1.5, skillRange(sk)) * TILE;
    g.save(); g.translate(p.x * TILE, p.y * TILE * K);
    g.strokeStyle = col; g.globalAlpha = 0.55; g.lineWidth = 2; g.setLineDash([10, 8]); g.lineDashOffset = -t * 20;
    g.beginPath(); g.ellipse(0, 0, rr2, rr2 * K, 0, 0, 7); g.stroke();
    g.restore();
    const hm = G.hover && G.hover.kind === 'mob' ? G.hover.ref : null;
    for (const m of G.mobs) {
      if (m.dead || U.dist(m.x, m.y, p.x, p.y) > 12) continue;
      const on = m === hm;
      upright(m.y * TILE, () => R.targetRing(g, m.x * TILE, m.y * TILE + 2, (on ? 24 : 18) * (m.def.scale || 1), on ? 'rgba(255,224,120,1)' : 'rgba(255,255,255,1)', t));
    }
  }
  // ขอบเขตการล่าของบอท: วงนุ่ม ๆ บนพื้น
  const zone = Bot.on && Bot.zone();
  if (zone) {
    const rx = zone.r * TILE, ry = rx * K;
    g.save(); g.translate(zone.x * TILE, zone.y * TILE * K);
    const grd = g.createRadialGradient(0, 0, rx * 0.6, 0, 0, rx);
    grd.addColorStop(0, 'rgba(111,243,255,0)'); grd.addColorStop(1, 'rgba(111,243,255,0.10)');
    g.scale(1, K); g.fillStyle = grd; g.beginPath(); g.arc(0, 0, rx, 0, 7); g.fill(); g.scale(1, 1 / K);
    g.strokeStyle = 'rgba(111,243,255,0.55)'; g.lineWidth = 2; g.setLineDash([14, 10]); g.lineDashOffset = -t * 12;
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 7); g.stroke();
    g.restore();
  }
  R.drawTelegraphs(g, t); // ป้ายเตือนท่าบอสบนพื้น (ท้ายไฟล์)
  // วงเล็งเป้าหมายที่พื้น
  for (const m of G.mobs) {
    if (m.dead) continue;
    const tgt = p.target === m, hov = G.hover && G.hover.ref === m;
    if (tgt || hov) upright(m.y * TILE, () => R.targetRing(g, m.x * TILE, m.y * TILE + 2, 20 * (m.def.scale || 1), tgt ? 'rgba(255,107,125,1)' : 'rgba(255,255,255,1)', t));
  }

  // เรียงวาดตามแกน y
  const VL = R.camX / TILE - 2, Rr = (R.camX + vw) / TILE + 2, Tp = wTop / TILE - 1, B = (wTop + wH) / TILE + 4;
  const list = [];
  if (map.flora && typeof Flora !== 'undefined') Flora.collect(list, g, map, t, VL, Rr, Tp, B); // ต้นไม้ใหญ่ + ของประดับ (js/flora.js)
  else for (const o of map.objects) if (o.x > VL && o.x < Rr && o.y > Tp && o.y < B) list.push({ y: o.y + 0.3, f: () => Sprites.drawTree(g, o, t) });
  for (const o of map.props || []) if (o.x > VL && o.x < Rr && o.y > Tp && o.y < B + 2) list.push({ y: o.y, f: () => Sprites.drawProp(g, o, t) });
  for (const b of map.buildings) if (b.img) list.push({ y: b.y + b.h - 0.5, f: () => Sprites.drawBuildingImg(g, b, t) });
  if (map.fountainImg) list.push({ y: map.fountain.y + 1.2, f: () => Sprites.drawFountainImg(g, map.fountain, t) });
  for (const n of G.npcs) list.push({ y: n.y + 0.5, f: () => Sprites.drawNpc(g, n, t) });
  for (const m of G.mobs) if (!m.isPlayer && m.x > VL && m.x < Rr && m.y > Tp && m.y < B) list.push({ y: m.y, f: () => Sprites.drawMob(g, m, t) });
  for (const a of G.allies) list.push({ y: a.y, f: () => Sprites.drawAlly(g, a, t) });
  // ผู้เล่นคนอื่น (ออนไลน์)
  for (const o of Online.others.values()) {
    if (o.x < VL || o.x > Rr || o.y < Tp || o.y > B) continue;
    list.push({ y: o.y, f: () => {
      g.save();
      if (o.stealth) g.globalAlpha = 0.3;
      Sprites.drawPlayer(g, o, t);
      g.restore();
    } });
  }
  list.push({ y: p.y, f: () => {
    g.save();
    if (p.stealthUntil > G.time) g.globalAlpha = 0.35 + Math.sin(t * 6) * 0.08;
    Sprites.drawPlayer(p.hurtFlash > 0 ? R.filterCtx(g, 'sepia(1) saturate(6) hue-rotate(-40deg)') : g, p, t);
    g.restore();
  } });
  list.sort((a, b) => a.y - b.y);
  for (const it of list) upright(it.y * TILE, it.f);

  // เอฟเฟกต์ (คำนวณตำแหน่งแบบฉายแล้วใน drawFx)
  for (const f of G.fx) R.drawFx(g, f, t);
  // ป้ายชื่อ / หลอด HP
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const P = R.py;
  const qt = G.started && Quest.current() ? Quest.current().obj : null, qNpc = qt && (qt.type === 'talk' || qt.type === 'event' || qt.type === 'job') ? qt.npc : null;
  // NPC ที่อยู่ใกล้พอจะคุย (ระยะเดียวกับปุ่ม Space/ปุ่มโจมตีบนจอ): ป้ายบอกปุ่มใต้ชื่อ
  const talkN = G.started && !p.dead && !NPC.busy ? G.npcs.filter(n => U.dist(p.x, p.y, n.x + 0.5, n.y + 0.5) < 2.6).sort((a, b) => U.dist(p.x, p.y, a.x + 0.5, a.y + 0.5) - U.dist(p.x, p.y, b.x + 0.5, b.y + 0.5))[0] : null;
  for (const n of G.npcs) {
    R.tag(g, n.x * TILE + TILE / 2, P((n.y + 0.5) * TILE + 10) + 14, n.name, '#d6f6ff', '#6ff3ff');
    if (n === talkN) R.tag(g, n.x * TILE + TILE / 2, P((n.y + 0.5) * TILE + 10) + 34, Pad.enabled() ? L('แตะปุ่มโจมตีเพื่อคุย', 'Tap Attack to talk') : L('Space · คุย', 'Space · Talk'), '#fff3c4', '#ffd56a');
    if (n.id === qNpc) R.questMark(g, n.x * TILE + TILE / 2, P((n.y + 0.5) * TILE + 10) - 92, t); // เครื่องหมายเควสต์เหนือหัว NPC
    else if (n.emote && n.emote.until > G.time) Emote.draw(g, n.x * TILE + TILE / 2 + 4, P((n.y + 0.5) * TILE + 10) - 96, n.emote, t);
  }
  for (const m of G.mobs) {
    if (m.dead || m.x < VL || m.x > Rr || m.y < Tp - 1 || m.y > B) continue; // นอกจอ: ไม่ต้องวาดหลอด/ป้าย
    const x = m.x * TILE, y = P(m.y * TILE), s = (m.def.scale || 1);
    if (m.isPlayer) { R.bar(g, x, y + 10, 40, m.hp / Math.max(1, m.maxHp), '#ff4f6a'); continue; } // คู่ต่อสู้ PvP: แถบเลือดแดง (ชื่อวาดโดยระบบผู้เล่นอื่น)
    if (m.hp < m.maxHp || m.isMvp) R.bar(g, x, y + 10, m.isMvp ? 64 : 38, m.hp / m.maxHp, m.isMvp ? '#ff4f6a' : '#ff6b7d');
    if (m.isMvp) R.tag(g, x, y + 26, `MVP · ${m.def.name}`, '#ffd98a', '#ff6b7d');
    else if ((G.hover && G.hover.ref === m) || (p.target === m && !(Pad.enabled() && innerHeight > innerWidth))) { // มือถือแนวตั้ง: ชื่อเป้าหมายอยู่ในแถบบนแล้ว ไม่ต้องซ้ำในฉาก
      // ยืนชิดผู้เล่น: ป้ายชื่อมอนจะทับชื่อผู้เล่น → เลื่อนลงไปใต้ป้ายผู้เล่น
      let ty = y + 26; const py = P(p.y * TILE) + 28;
      if (Math.abs(x - p.x * TILE) < 110 && Math.abs(ty - py) < 22) ty = Math.max(ty, py) + 22;
      R.tag(g, x, ty, `${m.def.name} · Lv ${m.def.lv}`, '#ffffff', m.def.aggro ? '#ff6b7d' : '#8fe3a8');
    }
    if (m.emoteUntil > G.time) R.emote(g, x + 12, y - 44 * s, '!');
  }
  for (const o of Online.others.values()) {
    if (o.stealth) continue;
    const x = o.x * TILE, y = P(o.y * TILE), pm = Party.member(o.id); // สมาชิกปาร์ตี้: ป้ายสีเขียวฟ้า + หลอด HP/SP
    if (pm) R.bar(g, x, y + 10, 40, pm.hp / pm.maxHp, pm.hp / pm.maxHp < 0.25 ? '#ff4f6a' : '#5fe08a', pm.sp / pm.maxSp);
    R.tag(g, x, y + (pm ? 28 : 26), o.name, pm ? '#8dffdd' : '#fff3c8', pm ? '#3dffc8' : '#ffd34a');
    R.label(g, x, y + (pm ? 43 : 41), `${JOBS[o.job].name} Lv ${o.baseLv}${o.bot ? ' · AUTO' : ''}`, pm ? '#a8f0dc' : '#c8d4e8');
    if (o.speech) R.speech(g, x, y - 92, o.speech.text, false);
    if (o.emote && o.emote.until > G.time) Emote.draw(g, x + 2, y - (o.speech ? 122 : 84), o.emote, t);
  }
  for (const a of G.allies) R.label(g, a.x * TILE, P(a.y * TILE) + 14, `${a.name} ${Math.ceil(a.until - G.time)}s`, '#b8e0ff');
  // ชื่อของบนพื้น: ตัวที่เมาส์ชี้ + ของ rare ขึ้นไปแสดงตลอด (สีตามความหายาก)
  for (const d of G.drops) {
    const hov = G.hover && G.hover.kind === 'drop' && G.hover.ref === d, rare = typeof LOOT !== 'undefined' && ITEMS[d.id].type !== 'card' && LOOT.rank(d.id) >= 2;
    if (hov || rare) R.label(g, d.x * TILE, P(d.y * TILE) + 20, `${ITEMS[d.id].name}${d.qty > 1 ? ' ×' + d.qty : ''}`, typeof LOOT !== 'undefined' ? LOOT.labelColor(d.id) : '#fff6c0', rare);
  }
  // ผู้เล่น
  {
    const x = p.x * TILE, y = P(p.y * TILE);
    R.tag(g, x, y + 28, p.name, '#ffffff');
    if (Bot.on) R.tag(g, x, y - 60, Bot.resting ? L('AUTO · พัก', 'AUTO · Resting') : 'AUTO', '#d8ffe8', '#7dffb4');
    if (Nav.target) Nav.draw(g, t);
    R.bar(g, x, y + 10, 40, p.hp / p.d.maxHp, p.hp / p.d.maxHp < 0.25 ? '#ff4f6a' : '#5fe08a', p.sp / p.d.maxSp);
    if (p.cast) {
      const k = U.clamp((G.time - p.cast.start) / (p.cast.end - p.cast.start), 0, 1);
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x - 30, y - 66, 60, 8);
      g.fillStyle = '#60ff60'; g.fillRect(x - 29, y - 65, 58 * k, 6);
    }
    if (p.speech) R.speech(g, x, y - (p.cast ? 104 : 92), p.speech.text, p.speech.shout);
    if (p.sitting && !(p.emote && p.emote.until > G.time)) R.emote(g, x + 14, y - 46, 'z');
    if (p.emote && p.emote.until > G.time) Emote.draw(g, x + 2, y - (p.speech ? 122 : 84), p.emote, t);
  }
  // ตัวเลขลอย
  for (const f of G.floaters) R.drawFloater(g, f);
  g.restore();

  // หมอกระยะไกลด้านบนจอ ช่วยให้รู้สึกถึงความลึกแบบมุมกล้องเฉียง
  if (map.def.kind !== 'cave' && R.quality !== 'low') {
    if (!R.haze || R.haze.h !== R.H) {
      const hz = g.createLinearGradient(0, 0, 0, R.H * 0.42);
      hz.addColorStop(0, 'rgba(190,220,255,0.16)'); hz.addColorStop(1, 'rgba(190,220,255,0)');
      R.haze = { h: R.H, grad: hz };
    }
    g.fillStyle = R.haze.grad; g.fillRect(0, 0, R.W, R.H * 0.42);
  }
  if (R.quality !== 'low') { R.drawSky(g, map, t); if (!map.def.dark) R.drawAtmosphere(g, map, t); }
  // ความมืดในถ้ำ
  if (map.def.dark) {
    const dc = R.dark, dg = dc.getContext('2d');
    dg.globalCompositeOperation = 'source-over';
    dg.clearRect(0, 0, dc.width, dc.height);
    dg.fillStyle = typeof map.def.dark === 'string' ? map.def.dark : 'rgba(5,3,10,0.72)'; dg.fillRect(0, 0, dc.width, dc.height); // dark = สี → กลางคืน (เช่น Wolfwood แสงจันทร์)
    dg.globalCompositeOperation = 'destination-out';
    const lights = [[p.x, p.y, map.def.nightLight || 7]];
    if (!map.lightProps) map.lightProps = (map.props || []).filter(q => q.kind === 'mushroom' || q.kind === 'lamp' || q.kind === 'crystal')
      .map(q => ({ x: q.x, y: q.y, lr: q.kind === 'lamp' ? 3 : 1.8, col: q.kind === 'mushroom' ? '140,255,170' : q.kind === 'crystal' ? (map.def.crystalGlow || '200,140,255') : '255,210,140' }));
    for (const q of map.lightProps) if (Math.abs(q.x - p.x) < 22 && Math.abs(q.y - p.y) < 16) lights.push([q.x, q.y, q.lr]); // เห็ดเรืองแสง/ตะเกียง/คริสตัล ส่องในที่มืด
    for (const f of G.fx) if (['firebolt', 'firering', 'lightning', 'holy', 'levelup'].includes(f.type)) {
      const pos = R.fxPos(f); lights.push([pos.x, pos.y, 3]);
    }
    for (const [lx, ly, lr] of lights) {
      const x = ((lx * TILE - R.camX) * R.zoom) / 2, y = ((ly * TILE * R.K - 20 - R.camY) * R.zoom) / 2;
      const r = lr * TILE * R.zoom / 2 * (1 + Math.sin(t * 3) * 0.02);
      const grd = dg.createRadialGradient(x, y, r * 0.2, x, y, r);
      grd.addColorStop(0, 'rgba(0,0,0,1)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      dg.fillStyle = grd; dg.beginPath(); dg.arc(x, y, r, 0, 7); dg.fill();
    }
    g.drawImage(dc, 0, 0, R.W, R.H);
    // แสงเรืองสีของแหล่งแสง (เห็ดเขียว/คริสตัลม่วง/ตะเกียงส้ม) ทับความมืดแบบบวกแสง
    if (R.quality !== 'low') {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (const q of map.lightProps) {
        if (Math.abs(q.x - p.x) > 22 || Math.abs(q.y - p.y) > 16) continue;
        const x = (q.x * TILE - R.camX) * R.zoom, y = (q.y * TILE * R.K - 10 - R.camY) * R.zoom, r = q.lr * TILE * R.zoom * 0.7 * (1 + Math.sin(t * 2 + q.x) * 0.06);
        const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${q.col},0.22)`); gr.addColorStop(1, `rgba(${q.col},0)`);
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
      g.restore();
    }
    if (R.quality !== 'low') R.drawAtmosphere(g, map, t); // ถ้ำมืด: อนุภาคเรืองแสงอยู่เหนือความมืด (มองเห็นในที่มืด)
  }
  // HP ต่ำ: ขอบจอแดง
  if (!p.dead && p.hp / p.d.maxHp < 0.25) {
    const a = 0.25 + Math.sin(t * 5) * 0.12;
    const grd = g.createRadialGradient(R.W / 2, R.H / 2, Math.min(R.W, R.H) * 0.35, R.W / 2, R.H / 2, Math.max(R.W, R.H) * 0.7);
    grd.addColorStop(0, 'rgba(200,0,0,0)'); grd.addColorStop(1, `rgba(200,0,0,${a})`);
    g.fillStyle = grd; g.fillRect(0, 0, R.W, R.H);
  }
  if (p.dead) { g.fillStyle = 'rgba(40,0,0,0.35)'; g.fillRect(0, 0, R.W, R.H); }
  R.drawVignette(g);
};

// ------------------------------------------------------------
//  บรรยากาศ: อนุภาค (กลีบดอก ใบไม้ หิ่งห้อย ฝุ่น) หมอก แสงลอดป่า
// ------------------------------------------------------------
R.parts = []; R.lastT = 0; R.partMap = null;
const ATMOS = {
  meadow:   { kind: 'petal', n: 26, grade: 'rgba(255,236,170,0.07)' },
  eldheim:  { kind: 'petal', n: 14, grade: 'rgba(255,236,190,0.06)' },
  mistlake: { kind: 'firefly', n: 26, fog: true, grade: 'rgba(240,130,170,0.13)' },   // ยามเย็น ชมพูอมม่วง
  wolfwood: { kind: 'firefly', n: 40, fog: true, grade: 'rgba(20,40,70,0.06)' },     // กลางคืน หิ่งห้อย + หมอก (อยู่เหนือความมืด)
  helcave:  { kind: 'dust', n: 36, grade: 'rgba(70,40,110,0.10)' },
  // vibe เพิ่ม (2026-10-02): เงาเมฆลอยผ่าน + แสงแดดเฉียงในแมพกลางแจ้ง • แมพลึกมีอนุภาคของตัวเอง
  arena:    { kind: 'ember', n: 24, grade: 'rgba(120,50,20,0.06)' },  // ประกายไฟลอย
};
// แมพกลางแจ้ง: เงาเมฆ (ทึบเท่าไร) + แสงแดดจากมุมซ้ายบน
// ให้บรรยากาศใกล้ภาพประกอบแผนที่ (assets/map_*.webp): ทุ่งหญ้าแดดจ้า • ทะเลสาบหมอก = ยามเย็นแสงชมพูส้มจากขวา • ป่าหมาป่า = กลางคืนแสงจันทร์ฟ้า
const SKY = { meadow: { cloud: 0.2, sun: 0.12 }, eldheim: { cloud: 0.15, sun: 0.1 },
  mistlake: { cloud: 0.08, sun: 0.24, col: '255,140,130', from: 'right' }, wolfwood: { cloud: 0, sun: 0.12, col: '150,190,255', from: 'right' } };
R.drawSky = (g, map, t) => {
  const S = SKY[map.id]; if (!S) return;
  const z = R.zoom, P = 900; // เมฆวนซ้ำทุก P px ของโลก (ยึดกับโลก: เดินแล้วเงาเลื่อนตามพื้น)
  g.save();
  for (let k = 0; k < (S.cloud ? 4 : 0); k++) {
    const wx0 = ((k * 613 + t * (9 + k * 2)) % P + P) % P, wy0 = (k * 347) % P;
    for (let ox = -P; ox <= P; ox += P) for (let oy = -P; oy <= P; oy += P) {
      const sx = (wx0 + ox + Math.floor(R.camX / P) * P - R.camX) * z, sy = (wy0 + oy + Math.floor(R.camY / P) * P - R.camY) * z;
      const r = (150 + (k % 3) * 50) * z;
      if (sx < -r * 1.6 || sx > R.W + r * 1.6 || sy < -r || sy > R.H + r) continue;
      for (let b = 0; b < 3; b++) { // เมฆ 1 ก้อน = วงรีนุ่ม 3 วงซ้อนกัน
        const bx = sx + (b - 1) * r * 0.55, by = sy + Math.sin(k + b) * r * 0.18, rr = r * (b === 1 ? 1 : 0.7);
        const gr = g.createRadialGradient(bx, by, rr * 0.2, bx, by, rr);
        gr.addColorStop(0, `rgba(12,22,18,${S.cloud})`); gr.addColorStop(1, 'rgba(12,22,18,0)');
        g.fillStyle = gr; g.beginPath(); g.ellipse(bx, by, rr * 1.3, rr * 0.75, 0, 0, 7); g.fill();
      }
    }
  }
  // แสงแดดอุ่นจากมุมซ้ายบน (ค่อย ๆ หายใจ)
  const a = S.sun * (0.85 + Math.sin(t * 0.25) * 0.15);
  const col = S.col || '255,226,160', sx = S.from === 'right' ? R.W * 1.1 : -R.W * 0.1;
  const sg = g.createRadialGradient(sx, -R.H * 0.2, 0, sx, -R.H * 0.2, Math.hypot(R.W, R.H) * 0.9);
  sg.addColorStop(0, `rgba(${col},${a * 1.6})`); sg.addColorStop(0.5, `rgba(${col},${a * 0.5})`); sg.addColorStop(1, `rgba(${col},0)`);
  g.globalCompositeOperation = 'lighter'; g.fillStyle = sg; g.fillRect(0, 0, R.W, R.H);
  g.restore();
};
R.spawnPart = (kind, anywhere) => {
  const p = { kind, x: Math.random() * R.W, y: anywhere ? Math.random() * R.H : -10, s: 0.6 + Math.random() * 0.8, ph: Math.random() * 6.28, life: 0 };
  if (kind === 'petal' || kind === 'leaf') { p.vx = 18 + Math.random() * 22; p.vy = 22 + Math.random() * 18; p.x -= R.W * 0.3; }
  else if (kind === 'firefly') { p.y = Math.random() * R.H; p.vx = 0; p.vy = 0; }
  else { p.y = anywhere ? Math.random() * R.H : R.H + 10; p.vx = (Math.random() - 0.5) * 6; p.vy = -6 - Math.random() * 8; }
  p.col = kind === 'petal' ? U.pick(['#ffd6e6', '#ffffff', '#ffe9a8', '#f7b6cf']) : kind === 'leaf' ? U.pick(['#d98a2b', '#b8c23c', '#8fb03a', '#c0552a'])
    : kind === 'data' ? '255,214,130' : kind === 'spore' ? '255,140,95' : kind === 'ember' ? '255,150,60' : '210,190,255';
  return p;
};
R.drawAtmosphere = (g, map, t) => {
  const A = ATMOS[map.id];
  const dt = Math.min(0.1, Math.max(0, t - R.lastT)); R.lastT = t;
  if (!A) return;
  if (R.partMap !== map.id) { R.partMap = map.id; R.parts = []; for (let i = 0; i < A.n; i++) R.parts.push(R.spawnPart(A.kind, true)); }
  // แสงลอดผ่านป่า
  if (A.rays) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const bx = ((i * 0.3 + 0.1) * R.W + Math.sin(t * 0.1 + i) * 30), a = 0.05 + Math.sin(t * 0.4 + i * 2) * 0.02;
      const gr = g.createLinearGradient(bx, 0, bx - R.H * 0.35, R.H);
      gr.addColorStop(0, `rgba(255,240,180,${a})`); gr.addColorStop(1, 'rgba(255,240,180,0)');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(bx, 0); g.lineTo(bx + 60, 0); g.lineTo(bx + 60 - R.H * 0.35, R.H); g.lineTo(bx - R.H * 0.35 - 30, R.H); g.closePath(); g.fill();
    }
    g.restore();
  }
  // หมอกลอยต่ำ
  if (A.fog) {
    for (let i = 0; i < 4; i++) {
      const fx = ((t * (8 + i * 4) + i * 400) % (R.W + 800)) - 400, fy = R.H * (0.2 + i * 0.22);
      // ไล่สีเป็นวงรีจริง (บีบแกนตั้ง) → ขอบหมอกนุ่ม ไม่เป็นแถบขอบแข็ง
      g.save(); g.translate(fx, fy); g.scale(1, 0.3);
      const fg = g.createRadialGradient(0, 0, 10, 0, 0, 420);
      fg.addColorStop(0, 'rgba(235,245,255,0.16)'); fg.addColorStop(1, 'rgba(235,245,255,0)');
      g.fillStyle = fg; g.beginPath(); g.arc(0, 0, 420, 0, 7); g.fill(); g.restore();
    }
  }
  for (let i = 0; i < R.parts.length; i++) {
    const p = R.parts[i];
    p.life += dt; p.ph += dt;
    if (p.kind === 'firefly') { p.x += Math.sin(p.ph * 0.7) * 12 * dt; p.y += Math.cos(p.ph * 0.9) * 10 * dt; }
    else { p.x += (p.vx + Math.sin(p.ph * 1.5) * 10) * dt; p.y += p.vy * dt; }
    if (p.y > R.H + 20 || p.x > R.W + 30 || p.y < -30 || p.life > 40) { R.parts[i] = R.spawnPart(A.kind, false); continue; }
    if (p.kind === 'petal' || p.kind === 'leaf') {
      g.save(); g.translate(p.x, p.y); g.rotate(p.ph * 1.3); g.scale(1, Math.abs(Math.sin(p.ph * 2)) * 0.7 + 0.3);
      g.fillStyle = p.col; g.globalAlpha = 0.85;
      g.beginPath(); g.ellipse(0, 0, (p.kind === 'leaf' ? 4 : 3) * p.s, 2 * p.s, 0, 0, 7); g.fill();
      g.restore();
    } else if (p.kind === 'firefly') {
      const a = (Math.sin(p.ph * 3) + 1) / 2;
      const fg = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, 8 * p.s);
      fg.addColorStop(0, `rgba(230,255,140,${0.9 * a})`); fg.addColorStop(1, 'rgba(230,255,140,0)');
      g.fillStyle = fg; g.beginPath(); g.arc(p.x, p.y, 8 * p.s, 0, 7); g.fill();
    } else if (p.kind === 'dust') {
      g.fillStyle = `rgba(${p.col},${0.25 + 0.25 * Math.sin(p.ph * 2)})`;
      g.beginPath(); g.arc(p.x, p.y, 1.3 * p.s, 0, 7); g.fill();
    } else { // data / spore / ember: จุดเรืองแสงลอยขึ้น
      const a = 0.45 + 0.4 * Math.sin(p.ph * 2.2), r = (p.kind === 'data' ? 2.6 : 3.4) * p.s;
      const fg = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.2);
      fg.addColorStop(0, `rgba(${p.col},${a})`); fg.addColorStop(1, `rgba(${p.col},0)`);
      g.fillStyle = fg; g.beginPath(); g.arc(p.x, p.y, r * 2.2, 0, 7); g.fill();
      if (p.kind === 'data') { g.fillStyle = `rgba(${p.col},${a})`; g.fillRect(p.x - 0.8, p.y - 2.5 * p.s, 1.6, 5 * p.s); }
    }
  }
  if (A.grade) { g.fillStyle = A.grade; g.fillRect(0, 0, R.W, R.H); }
};
R.drawVignette = g => {
  // แคชที่ความละเอียดจริงของแคนวาส แล้ววางแบบ 1:1 (ไม่ต้องขยายภาพเต็มจอทุกเฟรม)
  const cw = R.cv.width, ch = R.cv.height;
  if (!R.vig || R.vig.width !== cw || R.vig.height !== ch) {
    R.vig = document.createElement('canvas'); R.vig.width = cw; R.vig.height = ch;
    const vg = R.vig.getContext('2d');
    vg.scale(cw / R.W, ch / R.H);
    const grd = vg.createRadialGradient(R.W / 2, R.H / 2, Math.min(R.W, R.H) * 0.45, R.W / 2, R.H / 2, Math.hypot(R.W, R.H) * 0.6);
    grd.addColorStop(0, 'rgba(10,8,20,0)'); grd.addColorStop(1, 'rgba(10,8,20,0.42)');
    vg.fillStyle = grd; vg.fillRect(0, 0, R.W, R.H);
  }
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(R.vig, 0, 0); g.restore();
};
// ctx.filter แบบสีล้วน (กะพริบโดนตี) โดยไม่ใช้ filter บนแคนวาสหลัก: เบราว์เซอร์สร้างเลเยอร์เต็มจอให้ทุกคำสั่งวาด
// (ตัวละครวาดด้วยโค้ดมีหลายสิบคำสั่ง = ช้ามาก) → คืน context ตัวแทนที่แปลงสีแต่ละคำสั่งผ่าน filter เดียวกันแทน
// (fill/stroke/เงา/ไล่สี = สีที่ผ่าน filter, ภาพ = ภาพที่ผ่าน filter) ผลเท่ากับ filter รายคำสั่งเดิม
R.fcolCache = new Map();
R.fcolX = null;
// สีใด ๆ → [r, g, b, a] (ให้เบราว์เซอร์แปลงรูปแบบสีให้)
R.rgba = c => {
  const x = R.fcolX || (R.fcolX = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true }));
  x.fillStyle = '#000'; x.fillStyle = c;
  const n = x.fillStyle, m = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/.exec(n);
  return m ? [+m[1], +m[2], +m[3], +m[4]] : [parseInt(n.slice(1, 3), 16), parseInt(n.slice(3, 5), 16), parseInt(n.slice(5, 7), 16), 1];
};
// สีหลังผ่าน filter (วัดจากเบราว์เซอร์จริงบนแคนวาส 1x1 แล้วจำไว้)
R.fcol = (filter, c) => {
  if (typeof c !== 'string') return c;
  const key = filter + '|' + c;
  let v = R.fcolCache.get(key);
  if (v) return v;
  const q = R.rgba(c), x = R.fcolX, rk = `${filter}|${q[0]},${q[1]},${q[2]}`; // จำตามสีทึบ (ความโปร่งต่างกันใช้ผลเดียวกัน)
  let d = R.fcolCache.get(rk);
  if (!d) {
    x.clearRect(0, 0, 1, 1); x.filter = filter; x.fillStyle = `rgb(${q[0]},${q[1]},${q[2]})`; x.fillRect(0, 0, 1, 1); x.filter = 'none';
    d = x.getImageData(0, 0, 1, 1).data; R.fcolCache.set(rk, d);
  }
  v = `rgba(${d[0]},${d[1]},${d[2]},${q[3] * d[3] / 255})`;
  if (R.fcolCache.size > 4000) R.fcolCache.clear();
  R.fcolCache.set(key, v);
  return v;
};
// ctx.filter แบบปรับสี (กะพริบโดนตี) โดยไม่ใช้ filter บนแคนวาสหลัก: เบราว์เซอร์สร้างเลเยอร์เต็มจอให้ทุกคำสั่งวาด
// (ตัวละครวาดด้วยโค้ดมีหลายสิบคำสั่ง = ช้ามาก) → คืน context ตัวแทนที่ส่งสีของแต่ละคำสั่งผ่าน filter เดียวกันแทน
// (fill/stroke/เงา = สีที่ผ่าน filter, ไล่สี = ซอยจุดสีถี่ ๆ แล้วผ่าน filter ทีละจุด, ภาพ = สำเนาเล็กที่ผ่าน filter) ผลเท่ากับ filter รายคำสั่งเดิม
R.filterCtx = (g, filter) => {
  const fns = {}, col = c => R.fcol(filter, c);
  const style = v => {
    if (typeof v === 'string') return col(v);
    if (v && v._st && !v._done) { // ไล่สี: ใส่จุดสีที่ผ่าน filter แบบซอย 8 ช่วงต่อคู่จุด (filter ไม่เป็นเชิงเส้นเพราะสีตัน 0..255)
      v._done = true;
      const st = v._st.sort((p, q) => p[0] - q[0]), add = v._add;
      if (st.length === 1) add(st[0][0], col(st[0][1]));
      for (let i = 0; i + 1 < st.length; i++) {
        const [o0, c0] = st[i], [o1, c1] = st[i + 1], a = R.rgba(c0), b = R.rgba(c1), N = o1 > o0 ? 8 : 1;
        for (let j = i ? 1 : 0; j <= N; j++) {
          const k = j / N, m = a.map((x, n) => x + (b[n] - x) * k);
          add(o0 + (o1 - o0) * k, col(`rgba(${Math.round(m[0])},${Math.round(m[1])},${Math.round(m[2])},${m[3]})`));
        }
      }
    }
    return v;
  };
  for (const k of ['fillStyle', 'strokeStyle', 'shadowColor']) g[k] = style(g[k]);
  const grad = k => (...a) => { const gr = g[k](...a); gr._add = gr.addColorStop.bind(gr); gr._st = []; gr.addColorStop = (o, c) => { gr._st.push([o, c]); }; return gr; };
  fns.createLinearGradient = grad('createLinearGradient'); fns.createRadialGradient = grad('createRadialGradient');
  fns.drawImage = (img, ...a) => { // ภาพ: ใส่ filter ที่สำเนาเล็กของส่วนที่ใช้ แล้ววาดแทน
    let sx = 0, sy = 0, sw = img.width, sh = img.height, dst = a.length === 2 ? [a[0], a[1], sw, sh] : a;
    if (a.length === 8) { [sx, sy, sw, sh] = a; dst = a.slice(4); }
    const sc = R.fimgCv || (R.fimgCv = document.createElement('canvas')), w = Math.max(1, Math.ceil(sw)), h = Math.max(1, Math.ceil(sh));
    if (sc.width < w || sc.height < h) { sc.width = Math.max(sc.width, w); sc.height = Math.max(sc.height, h); }
    const x = sc.getContext('2d');
    x.clearRect(0, 0, w, h); x.filter = filter; x.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh); x.filter = 'none';
    g.drawImage(sc, 0, 0, sw, sh, ...dst);
  };
  return new Proxy(g, {
    get(t, k) { if (fns[k]) return fns[k]; const v = t[k]; return typeof v === 'function' ? (fns[k] = v.bind(t)) : v; },
    set(t, k, v) { t[k] = k === 'fillStyle' || k === 'strokeStyle' || k === 'shadowColor' ? style(v) : v; return true; },
  });
};

// ตัวเลขดาเมจสไตล์ RO
R.drawFloater = (g, f) => {
  const k = f.t / f.dur, P = R.py;
  let x = f.x * TILE, y = P(f.y * TILE), sc = 1;
  if (f.num) {
    const t = f.t;
    x += f.vx * t;
    y -= 150 * t - 170 * t * t;              // เด้งขึ้นแล้วตก
    sc = 1 + 0.9 * Math.max(0, 1 - t / 0.12); // กระแทกตอนโผล่
    g.globalAlpha = k > 0.65 ? Math.max(0, (1 - k) / 0.35) : 1;
  } else {
    y -= k * (f.big ? 40 : 34) + (k < 0.15 ? (0.15 - k) * 60 : 0);
    g.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
  }
  g.save(); g.translate(x, y); g.scale(sc, sc);
  if (f.crit) {
    // ดาวแตกสีแดงส้มด้านหลังตัวเลขคริ
    g.save(); g.rotate(f.t * 1.5);
    const r1 = 24, r2 = 12;
    const grd = g.createRadialGradient(0, 0, 2, 0, 0, r1);
    grd.addColorStop(0, '#ffe36a'); grd.addColorStop(0.5, '#ff7a2a'); grd.addColorStop(1, '#d0202a');
    g.fillStyle = grd; g.beginPath();
    for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2, r = i % 2 ? r2 : r1; g.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.8); }
    g.closePath(); g.fill(); g.restore();
  }
  const size = f.crit ? 24 : f.big ? 22 : f.num ? 19 : 14;
  g.font = `800 ${size}px Kanit, "Trebuchet MS", Tahoma, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round'; g.lineWidth = f.crit ? 5 : 4; g.strokeStyle = f.crit ? '#5a0a0a' : 'rgba(0,0,0,0.85)';
  g.strokeText(f.text, 0, 0);
  g.fillStyle = f.color; g.fillText(f.text, 0, 0);
  g.restore();
  g.globalAlpha = 1;
};
// หญ้าพลิ้วตามลม: ครอสเฟดระหว่างภาพหญ้า 3 เฟรม (ground_grass, 2, 3) เฉพาะบริเวณหญ้าที่มองเห็น
// อัปเดตภาพซ้อนราว 15 ครั้ง/วินาที แล้ววาดซ้ำจากแคชในเฟรมอื่น (เบาบนมือถือ)
R.grassWind = { cv: null, ox: 0, oy: 0, w: 0, h: 0, at: -1, map: null, pats: null };
R.drawGrassWind = (g, map, t, sx, sy, sw, sh) => {
  if (!map.grassMask || G.fastSim) return;
  const F = [Art.get('ground_grass'), Art.get('ground_grass2'), Art.get('ground_grass3')];
  if (!F[0] || !F[1] || !F[2]) return;
  const W = R.grassWind, PX = 256;
  if (!W.pats || W.map !== map) {
    W.pats = F.map(im => { const c = document.createElement('canvas'); c.width = c.height = PX; c.getContext('2d').drawImage(im, 0, 0, PX, PX); return c; });
    W.map = map; W.at = -1;
  }
  const M = 96, need = sx < W.ox || sy < W.oy || sx + sw > W.ox + W.w || sy + sh > W.oy + W.h;
  if (need || t - W.at > 1 / 15 || t < W.at) {
    W.at = t;
    if (need || !W.cv) { W.ox = Math.max(0, sx - M); W.oy = Math.max(0, sy - M); W.w = sw + M * 2; W.h = sh + M * 2; }
    if (!W.cv) W.cv = document.createElement('canvas');
    if (W.cv.width !== W.w || W.cv.height !== W.h) { W.cv.width = W.w; W.cv.height = W.h; }
    const c = W.cv.getContext('2d');
    // ลำดับเฟรม 0→1→2→1 วนซ้ำ ครอสเฟดนุ่ม (smoothstep) เฟรมละ ~0.8 วินาที
    const seq = [0, 1, 2, 1], u = t / 0.8, i = Math.floor(u) % 4, f = u - Math.floor(u), a = f * f * (3 - 2 * f);
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    c.clearRect(0, 0, W.w, W.h);
    c.translate(-W.ox, -W.oy);
    c.fillStyle = c.createPattern(W.pats[seq[i]], 'repeat'); c.fillRect(W.ox, W.oy, W.w, W.h);
    c.globalAlpha = a; c.fillStyle = c.createPattern(W.pats[seq[(i + 1) % 4]], 'repeat'); c.fillRect(W.ox, W.oy, W.w, W.h);
    c.globalAlpha = 1; c.globalCompositeOperation = 'destination-in';
    c.imageSmoothingEnabled = true;
    const k = map.grassMaskScale; c.drawImage(map.grassMask, 0, 0, map.grassMask.width * k, map.grassMask.height * k);
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over';
  }
  g.drawImage(W.cv, W.ox, W.oy);
};
// ป้ายตัวหนังสือในฉาก: ฟอนต์เดียวกับ HUD + เงานุ่ม (ไม่ใช่ขอบดำแข็ง)
R.FONT = '"IBM Plex Sans Thai", "Noto Sans Thai", Tahoma, sans-serif';
// แคชป้าย/แคปซูลชื่อเป็นภาพเล็กที่ความละเอียดจริงของจอ (คีย์ = ข้อความ+สี+สเกล) แล้ววางแบบ 1:1
// (ตัวหนังสือ + เงาเบลอทุกเฟรมแพงมากบนมือถือ) — ใช้เฉพาะตอนสเกลเท่ากันสองแกน ไม่หมุน ไม่โปร่ง ไม่มี filter
R.txtCache = new Map();
if (typeof document !== 'undefined' && document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => R.txtCache.clear()); // ฟอนต์เว็บโหลดเสร็จ: วาดป้ายใหม่
R.cached = (g, key, x, y, box, draw) => {
  const m = g.getTransform(), S = m.a;
  if (m.b || m.c || S <= 0 || m.d !== S || g.globalAlpha !== 1 || g.globalCompositeOperation !== 'source-over' || (g.filter && g.filter !== 'none')) return false;
  key += '|' + S + '|' + g.font + '|' + g.textAlign + '|' + g.textBaseline;
  let e = R.txtCache.get(key);
  if (!e) {
    const b = box(), pad = 2 + 14 / S; // เผื่อเงาเบลอ (หน่วยพิกเซลจอ ไม่ขึ้นกับซูม)
    const ox = b.x - pad, oy = b.y - pad, cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil((b.w + pad * 2) * S)); cv.height = Math.max(1, Math.ceil((b.h + pad * 2) * S));
    const c = cv.getContext('2d');
    c.setTransform(S, 0, 0, S, -ox * S, -oy * S);
    c.font = g.font; c.textAlign = g.textAlign; c.textBaseline = g.textBaseline;
    draw(c);
    if (R.txtCache.size > 400) R.txtCache.clear();
    R.txtCache.set(key, e = { cv, ox: ox * S, oy: oy * S });
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(e.cv, Math.round(S * x + m.e + e.ox), Math.round(S * y + m.f + e.oy));
  g.setTransform(m);
  return true;
};
// กรอบข้อความ (เทียบจุดยึด) ตามการจัดแนวปัจจุบันของ g
R.textBox = (g, text) => {
  const mt = g.measureText(text), w = mt.width, al = g.textAlign;
  const asc = mt.actualBoundingBoxAscent || 12, desc = mt.actualBoundingBoxDescent || 4;
  return { x: al === 'center' ? -w / 2 : al === 'right' || al === 'end' ? -w : 0, y: -asc, w, h: asc + desc };
};
R.label = (g, x, y, text, color, bold) => {
  g.font = `${bold ? 600 : 500} 12px ${R.FONT}`;
  if (R.cached(g, `L|${text}|${color}|${bold ? 1 : 0}`, x, y, () => R.textBox(g, text), c => R.labelRaw(c, 0, 0, text, color, bold))) return;
  R.labelRaw(g, x, y, text, color, bold);
};
R.labelRaw = (g, x, y, text, color, bold) => {
  g.font = `${bold ? 600 : 500} 12px ${R.FONT}`;
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.85)'; g.shadowBlur = 4; g.shadowOffsetY = 1;
  g.lineJoin = 'round'; g.lineWidth = 2.5; g.strokeStyle = 'rgba(4,8,14,0.55)'; g.strokeText(text, x, y);
  g.shadowBlur = 0; g.shadowOffsetY = 0;
  g.fillStyle = color; g.fillText(text, x, y);
  g.restore();
};
// ป้ายชื่อแบบแคปซูล (ผู้เล่น / NPC / มอนที่เล็งอยู่): พื้นกระจกเข้มมุมมน + จุดสีนำหน้า (ถ้ามี)
R.tag = (g, x, y, text, color, dot) => {
  g.font = `600 12px ${R.FONT}`;
  if (R.cached(g, `T|${text}|${color}|${dot || ''}`, x, y, () => { const w = Math.ceil(g.measureText(text).width + 16 + (dot ? 10 : 0)); return { x: -w / 2 - 1, y: -10, w: w + 2, h: 20 }; },
    c => R.tagRaw(c, 0, 0, text, color, dot))) return;
  R.tagRaw(g, x, y, text, color, dot);
};
R.tagRaw = (g, x, y, text, color, dot) => {
  g.font = `600 12px ${R.FONT}`;
  const tw = g.measureText(text).width, pad = 8, dw = dot ? 10 : 0, w = Math.ceil(tw + pad * 2 + dw), h = 18;
  const x0 = Math.round(x - w / 2), y0 = Math.round(y - h / 2);
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 6; g.shadowOffsetY = 1;
  g.fillStyle = 'rgba(8,13,22,0.62)'; rr(g, x0, y0, w, h, h / 2); g.fill();
  g.shadowBlur = 0; g.shadowOffsetY = 0;
  g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1; rr(g, x0 + 0.5, y0 + 0.5, w - 1, h - 1, h / 2 - 0.5); g.stroke();
  if (dot) { g.fillStyle = dot; g.beginPath(); g.arc(x0 + pad + 3, y, 3, 0, 7); g.fill(); }
  g.fillStyle = color; g.fillText(text, x + dw / 2, y + 0.5);
  g.restore();
};
// หลอด HP (และ SP) เหนือ/ใต้ตัว: แคปซูลมน พื้นเข้มโปร่ง ไล่สีอ่อน ๆ
R.barGrads = {};
R.bar = (g, x, y, w, k, color, k2) => {
  const h1 = 5, h2 = 3, gap = 2, H = k2 != null ? h1 + gap + h2 : h1;
  x = Math.round(x - w / 2); y = Math.round(y);
  g.save();
  g.fillStyle = 'rgba(6,10,18,0.72)'; rr(g, x - 2, y - 2, w + 4, H + 4, (H + 4) / 2); g.fill();
  const fill = (yy, hh, kk, c) => {
    g.fillStyle = 'rgba(255,255,255,0.1)'; rr(g, x, yy, w, hh, hh / 2); g.fill();
    const fw = Math.max(0, Math.round(w * U.clamp(kk, 0, 1)));
    if (fw < 1) return;
    // ไล่สีแนวตั้งสร้างครั้งเดียวต่อ (ความสูง, สี) แล้วเลื่อนแกนไปที่แถบ (ไม่สร้าง gradient ใหม่ทุกเฟรม)
    const gk = hh + c, grd = R.barGrads[gk] || (R.barGrads[gk] = (() => { const q = g.createLinearGradient(0, 0, 0, hh); q.addColorStop(0, '#ffffff'); q.addColorStop(0.35, c); q.addColorStop(1, c); return q; })());
    g.translate(0, yy);
    g.fillStyle = grd; g.globalAlpha = 0.95; rr(g, x, 0, Math.max(fw, hh), hh, hh / 2); g.fill(); g.globalAlpha = 1;
    g.translate(0, -yy);
  };
  fill(y, h1, k, color);
  if (k2 != null) fill(y + h1 + gap, h2, k2, '#6ff3ff');
  g.restore();
};
// วงเล็งเป้าหมายที่พื้น (มอนที่กำลังตี = ชมพูแดง, ที่ชี้เมาส์ = ขาว)
R.targetRing = (g, x, y, r, color, t) => {
  g.save();
  g.translate(x, y); g.scale(1, 0.38);
  const pulse = 1 + Math.sin(t * 5) * 0.05;
  const grd = g.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 1.15);
  grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(0.75, color.replace('1)', '0.32)')); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.beginPath(); g.arc(0, 0, r * 1.15, 0, 7); g.fill();
  g.shadowColor = color; g.shadowBlur = 8; g.strokeStyle = color; g.lineWidth = 3.5; g.setLineDash([r * 0.9, r * 0.45]); g.lineDashOffset = -t * 30;
  g.beginPath(); g.arc(0, 0, r * pulse, 0, 7); g.stroke();
  g.restore();
};
R.emote = (g, x, y, ch) => {
  g.fillStyle = '#fff'; g.strokeStyle = '#333'; g.lineWidth = 1.5;
  g.beginPath(); g.ellipse(x, y, 9, 9, 0, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(x - 4, y + 7); g.lineTo(x - 7, y + 13); g.lineTo(x, y + 8); g.fill();
  g.fillStyle = ch === '!' ? '#e02020' : '#4060c0'; g.font = 'bold 13px Tahoma'; g.fillText(ch, x, y + 1);
};
// เครื่องหมาย "!" สีทองเด้งเหนือหัว NPC ที่ต้องไปคุยตามเควสต์
R.questMark = (g, x, y, t) => {
  const b = Math.abs(Math.sin(t * 3.2)) * 6;
  g.save(); g.translate(x, y - b);
  g.shadowColor = '#ffb020'; g.shadowBlur = 12;
  g.fillStyle = '#ffd34a'; g.strokeStyle = '#6a4000'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(-4.5, -16); g.lineTo(4.5, -16); g.lineTo(2.6, 3); g.lineTo(-2.6, 3); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.arc(0, 9, 3.6, 0, 7); g.fill(); g.stroke();
  g.restore();
};
R.speech = (g, x, y, text, shout) => {
  g.font = 'bold 13px "Noto Sans Thai", Tahoma, sans-serif';
  if (shout) {
    g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.strokeText(text, x, y);
    g.fillStyle = '#fffbd0'; g.fillText(text, x, y);
    return;
  }
  g.font = `500 13px ${R.FONT}`;
  const w = Math.min(230, g.measureText(text).width + 22);
  g.save(); g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 8; g.shadowOffsetY = 2;
  g.fillStyle = 'rgba(250,252,255,0.96)'; rr(g, x - w / 2, y - 13, w, 25, 12.5); g.fill();
  g.beginPath(); g.moveTo(x - 5, y + 11); g.lineTo(x, y + 17); g.lineTo(x + 5, y + 11); g.fill();
  g.restore();
  g.fillStyle = '#1a2230'; g.fillText(text, x, y, 216);
};

R.fxPos = f => {
  if (f.ref) return { x: f.ref.x, y: f.ref.y };
  return { x: f.x, y: f.y };
};

R.drawFx = (g, f, t) => {
  if (f.fx2) return FX2.draw(g, f, t); // เอฟเฟกต์เฉพาะสกิล (js/fx2.js)
  const k = Math.min(1, f.t / f.dur);
  const after = f.t > f.dur ? (f.t - f.dur) / (f.linger || 1) : -1;
  const pos = R.fxPos(f);
  const X = pos.x * TILE, Y = pos.y * TILE * R.K;
  const tgtY = Y - 18 * ((f.ref && f.ref.def && f.ref.def.scale) || 1);
  switch (f.type) {
    case 'sprite': { // ภาพเอฟเฟกต์: เฟรมละ 240px ยึดพื้นที่ y=220 ของช่อง ผสมแบบบวกแสง (พื้นดำ = โปร่งใส)
      const img = Art.get(f.sprite); if (!img) break;
      const n = Math.max(1, Math.round(img.width / 240)), fr = Math.min(n - 1, Math.floor(k * n));
      const s = 68 / 150 * (f.size || 1) * ((f.ref && f.ref.def && f.ref.def.scale) || 1);
      g.save(); g.globalCompositeOperation = 'lighter';
      g.drawImage(img, fr * 240, 0, 240, 240, X - 120 * s, Y - 220 * s, 240 * s, 240 * s);
      g.restore();
      break;
    }
    case 'arrow': {
      if (after >= 0) break;
      const sx = f.sx * TILE, sy = f.sy * TILE * R.K;
      const ex = f.ref ? X : f.tx * TILE, ey = f.ref ? tgtY : f.ty * TILE * R.K - 24;
      const x = U.lerp(sx, ex, k), y = U.lerp(sy, ey, k);
      const a = Math.atan2(ey - sy, ex - sx);
      g.save(); g.translate(x, y); g.rotate(a);
      g.strokeStyle = f.big ? '#ffe080' : '#e8d8b0'; g.lineWidth = f.big ? 3 : 2;
      g.beginPath(); g.moveTo(-14, 0); g.lineTo(6, 0); g.stroke();
      g.fillStyle = '#ddd'; g.beginPath(); g.moveTo(9, 0); g.lineTo(4, -3); g.lineTo(4, 3); g.fill();
      if (f.big) { g.strokeStyle = 'rgba(255,220,120,0.4)'; g.lineWidth = 6; g.beginPath(); g.moveTo(-26, 0); g.lineTo(-8, 0); g.stroke(); }
      g.restore();
      break;
    }
    case 'firebolt': case 'coldbolt': {
      const fire = f.type === 'firebolt';
      if (after < 0) {
        const y = U.lerp(tgtY - 150, tgtY, k), x = X + (1 - k) * 30;
        g.save();
        g.shadowColor = fire ? '#ff6020' : '#80d0ff'; g.shadowBlur = 16;
        g.fillStyle = fire ? '#ffb040' : '#c0ecff';
        if (fire) {
          g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill();
          g.fillStyle = 'rgba(255,90,20,0.6)'; g.beginPath(); g.ellipse(x + 8, y - 16, 5, 16, -0.45, 0, 7); g.fill();
        } else {
          g.save(); g.translate(x, y); g.rotate(-0.45);
          g.beginPath(); g.moveTo(0, 10); g.lineTo(5, -6); g.lineTo(0, -22); g.lineTo(-5, -6); g.closePath(); g.fill();
          g.restore();
        }
        g.restore();
      } else {
        g.fillStyle = fire ? `rgba(255,140,40,${1 - after})` : `rgba(180,230,255,${1 - after})`;
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4, r = 6 + after * 22;
          g.beginPath(); g.arc(X + Math.cos(a) * r, tgtY + Math.sin(a) * r * 0.6, 4 * (1 - after) + 1, 0, 7); g.fill();
        }
      }
      break;
    }
    case 'lightning': {
      const a = after < 0 ? 1 : 1 - after;
      g.save(); g.strokeStyle = `rgba(255,255,160,${a})`; g.lineWidth = 3; g.shadowColor = '#ffff80'; g.shadowBlur = 14;
      g.beginPath(); let x = X, y = tgtY - 170; g.moveTo(x, y);
      const seed = Math.floor(t * 30);
      while (y < tgtY) { y += 18; x = X + (U.hash2(seed, y | 0) - 0.5) * 26; g.lineTo(x, Math.min(y, tgtY)); }
      g.stroke(); g.restore();
      break;
    }
    case 'soul': case 'frost': {
      if (after < 0) {
        const sx = f.sx * TILE, sy = f.sy * TILE * R.K;
        const x = U.lerp(sx, X, k), y = U.lerp(sy, tgtY, k) - Math.sin(k * Math.PI) * 20;
        g.save(); g.shadowColor = f.type === 'soul' ? '#c0a0ff' : '#a0e8ff'; g.shadowBlur = 14;
        g.fillStyle = f.type === 'soul' ? '#efe6ff' : '#dff6ff';
        g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); g.restore();
      } else {
        g.strokeStyle = f.type === 'soul' ? `rgba(200,170,255,${1 - after})` : `rgba(170,230,255,${1 - after})`;
        g.lineWidth = 3; g.beginPath(); g.arc(X, tgtY, 6 + after * 20, 0, 7); g.stroke();
      }
      break;
    }
    case 'holy': {
      const a = after < 0 ? Math.min(1, k * 2) : 1 - after;
      const grd = g.createLinearGradient(X, tgtY - 160, X, tgtY + 10);
      grd.addColorStop(0, 'rgba(255,255,220,0)'); grd.addColorStop(1, `rgba(255,250,200,${0.8 * a})`);
      g.fillStyle = grd; g.fillRect(X - 14, tgtY - 160, 28, 170);
      g.fillStyle = `rgba(255,255,255,${a})`; g.fillRect(X - 4, tgtY - 160, 8, 170);
      break;
    }
    case 'heal': case 'buff': {
      const col = f.type === 'heal' ? '120,255,140' : '255,240,150';
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2 + t * 2, h = ((k + i * 0.13) % 1) * 50;
        const x = X + Math.cos(a) * 16, y = Y - 10 - h + Math.sin(a) * 5;
        g.fillStyle = `rgba(${col},${1 - k})`;
        if (f.type === 'heal') { g.fillRect(x - 1.5, y - 5, 3, 10); g.fillRect(x - 5, y - 1.5, 10, 3); }
        else { g.beginPath(); g.arc(x, y, 2.5, 0, 7); g.fill(); }
      }
      g.strokeStyle = `rgba(${col},${1 - k})`; g.lineWidth = 2;
      g.beginPath(); g.ellipse(X, Y, 14 + k * 10, 5 + k * 4, 0, 0, 7); g.stroke();
      break;
    }
    case 'levelup': {
      const a = k < 0.8 ? 1 : (1 - k) / 0.2;
      const col = f.job ? '150,220,255' : '255,225,110';
      const grd = g.createLinearGradient(X, Y - 120, X, Y);
      grd.addColorStop(0, `rgba(${col},0)`); grd.addColorStop(1, `rgba(${col},${0.55 * a})`);
      g.fillStyle = grd;
      g.beginPath(); g.moveTo(X - 26, Y); g.lineTo(X - 12, Y - 120); g.lineTo(X + 12, Y - 120); g.lineTo(X + 26, Y); g.fill();
      for (let i = 0; i < 3; i++) {
        const kk = (k * 2 + i / 3) % 1;
        g.strokeStyle = `rgba(${col},${(1 - kk) * a})`; g.lineWidth = 2;
        g.beginPath(); g.ellipse(X, Y - kk * 60, 22, 8, 0, 0, 7); g.stroke();
      }
      break;
    }
    case 'upgrade': {
      // อัปเกรดร่าง: กรงหกเหลี่ยมประกอบตัว + เส้นสแกนไล่จากเท้าถึงหัว + แฟลช
      const col = f.col || '120,220,255';
      const a = k < 0.85 ? 1 : (1 - k) / 0.15;
      const build = Math.min(1, k / 0.35), scan = U.clamp((k - 0.25) / 0.45, 0, 1);
      g.save();
      g.lineWidth = 1.5;
      for (let ring = 0; ring < 4; ring++) {
        const ry = Y - ring * 22 * build, rr = 26 - ring * 3;
        g.strokeStyle = `rgba(${col},${0.8 * a * build})`;
        g.beginPath();
        for (let i = 0; i <= 6; i++) { const t2 = i / 6 * Math.PI * 2 + G.time * (ring % 2 ? 1.5 : -1.5); const px = X + Math.cos(t2) * rr, py = ry + Math.sin(t2) * rr * 0.36; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
        g.stroke();
      }
      for (let i = 0; i < 6; i++) {
        const t2 = i / 6 * Math.PI * 2 + G.time * 1.5;
        g.strokeStyle = `rgba(${col},${0.35 * a * build})`;
        g.beginPath(); g.moveTo(X + Math.cos(t2) * 26, Y + Math.sin(t2) * 9); g.lineTo(X + Math.cos(t2) * 17, Y - 66 * build + Math.sin(t2) * 6); g.stroke();
      }
      if (scan > 0 && scan < 1) {
        const sy = Y - scan * 72;
        const gr = g.createLinearGradient(X - 30, 0, X + 30, 0);
        gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(0.5, `rgba(255,255,255,0.95)`); gr.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = gr; g.fillRect(X - 30, sy - 1.5, 60, 3);
        g.fillStyle = `rgba(${col},0.18)`; g.fillRect(X - 22, sy, 44, Y - sy);
      }
      for (let i = 0; i < 14; i++) {
        const kk = (k * 1.6 + i / 14) % 1;
        const px = X + Math.sin(i * 7.3) * 24, py = Y - kk * 90;
        g.fillStyle = `rgba(${col},${(1 - kk) * a})`;
        g.fillRect(px - 1.5, py - 1.5, 3, 3);
      }
      if (k > 0.68 && k < 0.82) {
        const fl = 1 - Math.abs(k - 0.75) / 0.07;
        const rg = g.createRadialGradient(X, Y - 34, 2, X, Y - 34, 90);
        rg.addColorStop(0, `rgba(255,255,255,${0.9 * fl})`); rg.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = rg; g.fillRect(X - 90, Y - 124, 180, 180);
      }
      g.restore();
      break;
    }
    case 'beam': {
      // ลำแสงทองตอนการ์ดดรอป
      const a = k < 0.1 ? k / 0.1 : k > 0.75 ? (1 - k) / 0.25 : 1;
      const w = 14 + Math.sin(t * 10) * 2;
      const grd = g.createLinearGradient(X, Y - 260, X, Y);
      grd.addColorStop(0, 'rgba(255,230,120,0)'); grd.addColorStop(0.7, `rgba(255,236,150,${0.55 * a})`); grd.addColorStop(1, `rgba(255,250,210,${0.9 * a})`);
      g.save(); g.globalCompositeOperation = 'lighter';
      g.fillStyle = grd; g.fillRect(X - w / 2, Y - 260, w, 260);
      g.fillStyle = `rgba(255,240,170,${0.5 * a})`; g.beginPath(); g.ellipse(X, Y, 26 + Math.sin(t * 6) * 3, 9, 0, 0, 7); g.fill();
      for (let i = 0; i < 10; i++) { const kk = (k * 2 + i / 10) % 1; g.fillStyle = `rgba(255,245,190,${(1 - kk) * a})`; g.fillRect(X + Math.sin(i * 5.1) * 14, Y - kk * 200, 2.5, 2.5); }
      g.restore();
      break;
    }
    case 'firering': {
      const r = f.r * TILE * (0.3 + 0.7 * k);
      for (let i = 0; i < 18; i++) {
        const a = i / 18 * Math.PI * 2;
        const x = X + Math.cos(a) * r, y = Y + Math.sin(a) * r * 0.55;
        g.fillStyle = `rgba(255,${120 + (i % 3) * 40},30,${1 - k})`;
        g.beginPath(); g.ellipse(x, y - 10, 6, 14 * (1 - k * 0.5), 0, 0, 7); g.fill();
      }
      g.fillStyle = `rgba(255,120,30,${0.25 * (1 - k)})`;
      g.beginPath(); g.ellipse(X, Y, r, r * 0.55, 0, 0, 7); g.fill();
      break;
    }
    case 'whirl': {
      const r = f.r * TILE;
      g.save(); g.translate(X, Y - 14); g.scale(1, 0.5);
      for (let i = 0; i < 3; i++) {
        const a0 = k * Math.PI * 4 + i * 2.1;
        g.strokeStyle = `rgba(230,235,255,${(1 - k) * (0.9 - i * 0.2)})`; g.lineWidth = 6 - i * 1.5;
        g.beginPath(); g.arc(0, 0, r * (0.6 + i * 0.18), a0, a0 + 1.6); g.stroke();
      }
      g.restore();
      break;
    }
    case 'ring': {
      const waves = f.waves || 1;
      for (let i = 0; i < waves; i++) {
        const kk = U.clamp(k * 1.4 - i * 0.2, 0, 1);
        if (kk <= 0 || kk >= 1) continue;
        g.strokeStyle = `rgba(${f.color || '255,255,255'},${1 - kk})`; g.lineWidth = 3;
        g.beginPath(); g.ellipse(X, Y, f.r * TILE * kk, f.r * TILE * kk * 0.5, 0, 0, 7); g.stroke();
      }
      break;
    }
    case 'warnring': {
      g.fillStyle = `rgba(255,40,20,${0.12 + Math.sin(t * 20) * 0.08})`;
      g.strokeStyle = `rgba(255,60,40,0.8)`; g.lineWidth = 2;
      g.beginPath(); g.ellipse(X, Y, f.r * TILE, f.r * TILE * 0.55, 0, 0, 7); g.fill(); g.stroke();
      break;
    }
    case 'shower': {
      for (let i = 0; i < 12; i++) {
        const ox = (U.hash2(i, 3) - 0.5) * f.r * 2 * TILE, oy = (U.hash2(i, 9) - 0.5) * f.r * TILE;
        const kk = U.clamp(k * 1.5 - U.hash2(i, 5) * 0.5, 0, 1);
        const y = Y + oy - (1 - kk) * 140;
        g.strokeStyle = `rgba(240,220,170,${kk < 1 ? 1 : 0.3})`; g.lineWidth = 2;
        g.beginPath(); g.moveTo(X + ox - 5, y - 18); g.lineTo(X + ox, y); g.stroke();
      }
      break;
    }
    case 'hit': case 'crit': case 'bash': {
      const big = f.type !== 'hit';
      const col = f.type === 'crit' ? '255,230,80' : f.type === 'bash' ? '255,150,50' : '255,255,255';
      g.strokeStyle = `rgba(${col},${1 - k})`; g.lineWidth = big ? 3 : 2;
      const r = (big ? 10 : 6) + k * (big ? 22 : 12);
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 + 0.3;
        g.moveTo(X + Math.cos(a) * r * 0.4, Y + Math.sin(a) * r * 0.4);
        g.lineTo(X + Math.cos(a) * r, Y + Math.sin(a) * r);
      }
      g.stroke();
      break;
    }
    case 'warp': {
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2 + t * 4, h = k * 60 + (i % 3) * 8;
        g.fillStyle = `rgba(160,220,255,${1 - k})`;
        g.fillRect(X + Math.cos(a) * 14, Y - h + Math.sin(a) * 5, 3, 8);
      }
      break;
    }
    case 'castcircle': {
      g.save(); g.translate(X, Y); g.scale(1, 0.5); g.rotate(t * 2);
      g.strokeStyle = f.color || '#80c0ff'; g.globalAlpha = 0.8; g.lineWidth = 2;
      g.beginPath(); g.arc(0, 0, 26, 0, 7); g.stroke();
      g.beginPath(); g.arc(0, 0, 20, 0, 7); g.stroke();
      g.beginPath();
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.lineTo(Math.cos(a) * 20, Math.sin(a) * 20); g.lineTo(Math.cos(a + Math.PI * 2 / 3) * 20, Math.sin(a + Math.PI * 2 / 3) * 20); }
      g.stroke();
      g.restore();
      break;
    }
    case 'click': {
      g.strokeStyle = `rgba(255,255,255,${1 - k})`; g.lineWidth = 2;
      g.beginPath(); g.ellipse(X, Y, 4 + k * 12, 2 + k * 6, 0, 0, 7); g.stroke();
      break;
    }
  }
};

// ------------------------------------------------------------
//  ป้ายเตือนท่าบอส (telegraph จาก telegraph() ใน js/game.js): วาดบนพื้นใต้ตัวละคร
//  พื้นแดงโปร่ง + ขอบกะพริบ + แดงเข้มด้านในขยายจนเต็ม = เวลาที่เหลือก่อนดาเมจลง • ครบเวลา = แฟลชสว่างแล้วจางหาย
// ------------------------------------------------------------
R.drawTelegraphs = (g, t) => {
  if (!G.fx.some(f => f.type === 'tele')) return;
  const shape = (f, s) => { // เส้นทางรูปทรงในพิกัดโลก (พิกเซล) • s = สัดส่วนที่ขยายแล้ว (0..1)
    const x = f.x * TILE, y = f.y * TILE;
    g.beginPath();
    if (f.shape === 'circle') g.arc(x, y, Math.max(0.1, f.r * TILE * s), 0, 7);
    else if (f.shape === 'ring') {
      const r0 = f.r0 * TILE, r1 = Math.max(r0 + 0.1, (f.r0 + (f.r - f.r0) * s) * TILE);
      g.arc(x, y, r1, 0, 7); if (r0 > 0) { g.moveTo(x + r0, y); g.arc(x, y, r0, 0, 7, true); }
    } else if (f.shape === 'line') {
      const c = Math.cos(f.a), sn = Math.sin(f.a), w = f.w * TILE / 2, l0 = -0.5 * TILE, l1 = l0 + (f.len * TILE - l0) * s;
      g.moveTo(x + c * l0 - sn * w, y + sn * l0 + c * w); g.lineTo(x + c * l1 - sn * w, y + sn * l1 + c * w);
      g.lineTo(x + c * l1 + sn * w, y + sn * l1 - c * w); g.lineTo(x + c * l0 + sn * w, y + sn * l0 - c * w); g.closePath();
    } else if (f.shape === 'cone') { g.moveTo(x, y); g.arc(x, y, Math.max(0.1, f.r * TILE * s), f.a - f.arc / 2, f.a + f.arc / 2); g.closePath(); }
  };
  g.save(); g.scale(1, R.K); g.lineJoin = 'round';
  for (const f of G.fx) {
    if (f.type !== 'tele' || (f.owner && f.owner.dead && f.t < f.dur)) continue;
    if (f.t >= f.dur) { // ดาเมจลงแล้ว: แฟลชขาวอมส้มแล้วจาง
      const a = 1 - (f.t - f.dur) / (f.linger || 0.35);
      if (a <= 0) continue;
      shape(f, 1); g.fillStyle = `rgba(255,190,140,${0.45 * a})`; g.fill('evenodd');
      g.strokeStyle = `rgba(255,240,220,${0.9 * a})`; g.lineWidth = 3; g.stroke();
      continue;
    }
    const k = f.t / f.dur, late = k > 0.7, pulse = 0.5 + 0.5 * Math.sin(t * (late ? 24 : 12));
    shape(f, 1); // พื้นที่ทั้งหมด
    g.fillStyle = `rgba(235,20,30,${0.24 + 0.08 * pulse})`; g.fill('evenodd');
    g.strokeStyle = `rgba(255,30,40,${0.25 + 0.25 * pulse})`; g.lineWidth = 9; g.stroke(); // ขอบเรือง
    g.strokeStyle = late ? `rgba(255,190,180,${0.8 + 0.2 * pulse})` : `rgba(255,70,70,${0.75 + 0.25 * pulse})`; g.lineWidth = 2.6; g.stroke();
    shape(f, k); // ส่วนที่เต็มแล้ว = เวลาที่ผ่านไป
    g.fillStyle = `rgba(220,10,25,${0.3 + 0.2 * k})`; g.fill('evenodd');
    if (f.shape === 'line') { // ลูกศรบอกทิศทางทุบ
      g.save(); g.translate(f.x * TILE, f.y * TILE); g.rotate(f.a);
      g.strokeStyle = `rgba(255,225,210,${0.3 + 0.4 * pulse})`; g.lineWidth = 3;
      const w = f.w * TILE * 0.2;
      for (let i = 1.2; i < f.len; i += 1.7) { g.beginPath(); g.moveTo(i * TILE - w, -w); g.lineTo(i * TILE, 0); g.lineTo(i * TILE - w, w); g.stroke(); }
      g.restore();
    }
  }
  g.restore();
};
