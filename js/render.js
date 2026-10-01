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
  // ซูมเริ่มต้นแบบ RO: กล้องใกล้ ตัวละครเด่น (จอเล็กซูมน้อยลงเพื่อให้เห็นรอบตัวพอ)
  const short = Math.min(window.innerWidth, window.innerHeight);
  R.zoom = short < 500 ? 1.2 : short < 800 ? 1.3 : 1.45;
  window.addEventListener('resize', R.resize);
};
// คุณภาพกราฟิก: 'low' = ความละเอียด 1x ไม่มีหญ้าพลิ้ว/หมอก/ฝุ่นลอย (มือถือรุ่นเก่าลื่นขึ้นมาก)
R.setQuality = q => { R.quality = q === 'low' ? 'low' : 'high'; R.resize(); };
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
    g.drawImage(itemIconCanvas(d.id, 26), x - 13, y - 13 - pop);
    if (ITEMS[d.id].type === 'card' || ITEMS[d.id].price >= 5000) {
      g.strokeStyle = `rgba(255,230,120,${0.5 + Math.sin(t * 6) * 0.4})`; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y - pop, 15, 0, 7); g.stroke();
    }
  });

  // เรียงวาดตามแกน y
  const L = R.camX / TILE - 2, Rr = (R.camX + vw) / TILE + 2, Tp = wTop / TILE - 1, B = (wTop + wH) / TILE + 4;
  const list = [];
  for (const o of map.objects) if (o.x > L && o.x < Rr && o.y > Tp && o.y < B) list.push({ y: o.y + 0.3, f: () => Sprites.drawTree(g, o, t) });
  for (const o of map.props || []) if (o.x > L && o.x < Rr && o.y > Tp && o.y < B + 2) list.push({ y: o.y, f: () => Sprites.drawProp(g, o, t) });
  for (const b of map.buildings) if (b.img) list.push({ y: b.y + b.h - 0.5, f: () => Sprites.drawBuildingImg(g, b, t) });
  if (map.fountainImg) list.push({ y: map.fountain.y + 1.2, f: () => Sprites.drawFountainImg(g, map.fountain, t) });
  for (const n of G.npcs) list.push({ y: n.y + 0.5, f: () => Sprites.drawNpc(g, n, t) });
  for (const m of G.mobs) if (m.x > L && m.x < Rr && m.y > Tp && m.y < B) list.push({ y: m.y, f: () => Sprites.drawMob(g, m, t) });
  for (const a of G.allies) list.push({ y: a.y, f: () => Sprites.drawAlly(g, a, t) });
  // ผู้เล่นคนอื่น (ออนไลน์)
  for (const o of Online.others.values()) {
    if (o.x < L || o.x > Rr || o.y < Tp || o.y > B) continue;
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
    if (p.hurtFlash > 0) g.filter = 'sepia(1) saturate(6) hue-rotate(-40deg)';
    Sprites.drawPlayer(g, p, t);
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
  for (const n of G.npcs) {
    R.label(g, n.x * TILE + TILE / 2, P((n.y + 0.5) * TILE + 10) + 12, n.name, '#9fd0ff');
    if (n.id === qNpc) R.questMark(g, n.x * TILE + TILE / 2, P((n.y + 0.5) * TILE + 10) - 92, t); // เครื่องหมายเควสต์เหนือหัว NPC
    else if (n.emote && n.emote.until > G.time) Emote.draw(g, n.x * TILE + TILE / 2 + 4, P((n.y + 0.5) * TILE + 10) - 96, n.emote, t);
  }
  for (const m of G.mobs) {
    if (m.dead) continue;
    const x = m.x * TILE, y = P(m.y * TILE), s = (m.def.scale || 1);
    if (m.hp < m.maxHp || m.isMvp) R.bar(g, x, y + 10, m.isMvp ? 60 : 36, m.hp / m.maxHp, m.isMvp ? '#c02828' : '#c84040');
    if (m.isMvp) R.label(g, x, y + 22, `★ ${m.def.name} ★`, '#ff8080', true);
    else if ((G.hover && G.hover.ref === m) || p.target === m) R.label(g, x, y + 22, `${m.def.name} (Lv ${m.def.lv})`, m.def.aggro ? '#ffb0a0' : '#ffffff');
    if (m.emoteUntil > G.time) R.emote(g, x + 12, y - 44 * s, '!');
  }
  for (const o of Online.others.values()) {
    if (o.stealth) continue;
    const x = o.x * TILE, y = P(o.y * TILE);
    R.label(g, x, y + 24, o.name, '#ffe9a0');
    R.label(g, x, y + 37, `${JOBS[o.job].name} Lv ${o.baseLv}${o.bot ? ' • AUTO' : ''}`, '#c8d4e8');
    if (o.speech) R.speech(g, x, y - 62, o.speech.text, false);
    if (o.emote && o.emote.until > G.time) Emote.draw(g, x + 2, y - (o.speech ? 96 : 84), o.emote, t);
  }
  for (const a of G.allies) R.label(g, a.x * TILE, P(a.y * TILE) + 14, `${a.name} ${Math.ceil(a.until - G.time)}s`, '#b8e0ff');
  if (G.hover && G.hover.kind === 'drop') {
    const d = G.hover.ref;
    R.label(g, d.x * TILE, P(d.y * TILE) + 20, `${ITEMS[d.id].name}${d.qty > 1 ? ' ×' + d.qty : ''}`, '#fff6c0');
  }
  // ผู้เล่น
  {
    const x = p.x * TILE, y = P(p.y * TILE);
    R.label(g, x, y + 24, p.name, '#ffffff');
    if (Bot.on) R.label(g, x, y - 58, Bot.resting ? '[AUTO • พัก]' : '[AUTO]', '#7dffb0', true);
    if (Nav.target) Nav.draw(g, t);
    R.bar(g, x, y + 10, 38, p.hp / p.d.maxHp, p.hp / p.d.maxHp < 0.25 ? '#b83232' : '#3a9a44', p.sp / p.d.maxSp);
    if (p.cast) {
      const k = U.clamp((G.time - p.cast.start) / (p.cast.end - p.cast.start), 0, 1);
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x - 30, y - 66, 60, 8);
      g.fillStyle = '#60ff60'; g.fillRect(x - 29, y - 65, 58 * k, 6);
    }
    if (p.speech) R.speech(g, x, y - (p.cast ? 76 : 62), p.speech.text, p.speech.shout);
    if (p.sitting && !(p.emote && p.emote.until > G.time)) R.emote(g, x + 14, y - 46, 'z');
    if (p.emote && p.emote.until > G.time) Emote.draw(g, x + 2, y - (p.speech ? 96 : 84), p.emote, t);
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
  if (R.quality !== 'low') R.drawAtmosphere(g, map, t);
  // ความมืดในถ้ำ
  if (map.def.dark) {
    const dc = R.dark, dg = dc.getContext('2d');
    dg.globalCompositeOperation = 'source-over';
    dg.clearRect(0, 0, dc.width, dc.height);
    dg.fillStyle = 'rgba(5,3,10,0.72)'; dg.fillRect(0, 0, dc.width, dc.height);
    dg.globalCompositeOperation = 'destination-out';
    const lights = [[p.x, p.y, 7]];
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
  mistlake: { kind: 'firefly', n: 22, fog: true, grade: 'rgba(200,225,255,0.07)' },
  wolfwood: { kind: 'leaf', n: 26, rays: true, grade: 'rgba(40,70,30,0.10)' },
  helcave:  { kind: 'dust', n: 36, grade: 'rgba(70,40,110,0.10)' },
};
R.spawnPart = (kind, anywhere) => {
  const p = { kind, x: Math.random() * R.W, y: anywhere ? Math.random() * R.H : -10, s: 0.6 + Math.random() * 0.8, ph: Math.random() * 6.28, life: 0 };
  if (kind === 'petal' || kind === 'leaf') { p.vx = 18 + Math.random() * 22; p.vy = 22 + Math.random() * 18; p.x -= R.W * 0.3; }
  else if (kind === 'firefly') { p.y = Math.random() * R.H; p.vx = 0; p.vy = 0; }
  else { p.y = anywhere ? Math.random() * R.H : R.H + 10; p.vx = (Math.random() - 0.5) * 6; p.vy = -6 - Math.random() * 8; }
  p.col = kind === 'petal' ? U.pick(['#ffd6e6', '#ffffff', '#ffe9a8', '#f7b6cf']) : kind === 'leaf' ? U.pick(['#d98a2b', '#b8c23c', '#8fb03a', '#c0552a']) : '#fff';
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
      const fg = g.createRadialGradient(fx, fy, 10, fx, fy, 320);
      fg.addColorStop(0, 'rgba(235,245,255,0.16)'); fg.addColorStop(1, 'rgba(235,245,255,0)');
      g.fillStyle = fg; g.beginPath(); g.ellipse(fx, fy, 420, 120, 0, 0, 7); g.fill();
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
    } else {
      g.fillStyle = `rgba(210,190,255,${0.25 + 0.25 * Math.sin(p.ph * 2)})`;
      g.beginPath(); g.arc(p.x, p.y, 1.3 * p.s, 0, 7); g.fill();
    }
  }
  if (A.grade) { g.fillStyle = A.grade; g.fillRect(0, 0, R.W, R.H); }
};
R.drawVignette = g => {
  if (!R.vig || R.vig.width !== Math.ceil(R.W) || R.vig.height !== Math.ceil(R.H)) {
    R.vig = document.createElement('canvas'); R.vig.width = Math.ceil(R.W); R.vig.height = Math.ceil(R.H);
    const vg = R.vig.getContext('2d');
    const grd = vg.createRadialGradient(R.W / 2, R.H / 2, Math.min(R.W, R.H) * 0.45, R.W / 2, R.H / 2, Math.hypot(R.W, R.H) * 0.6);
    grd.addColorStop(0, 'rgba(10,8,20,0)'); grd.addColorStop(1, 'rgba(10,8,20,0.42)');
    vg.fillStyle = grd; vg.fillRect(0, 0, R.W, R.H);
  }
  g.drawImage(R.vig, 0, 0);
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
R.label = (g, x, y, text, color, bold) => {
  g.font = `${bold ? 'bold ' : ''}12px "Noto Sans Thai", Tahoma, sans-serif`;
  g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.8)';
  g.strokeText(text, x, y); g.fillStyle = color; g.fillText(text, x, y);
};
R.bar = (g, x, y, w, k, color, k2) => {
  const h1 = 4, h2 = 3, H = k2 != null ? h1 + h2 + 1 : h1;
  x = Math.round(x - w / 2); y = Math.round(y);
  g.fillStyle = '#0c0e12'; g.fillRect(x - 1, y - 1, w + 2, H + 2);
  g.fillStyle = '#2a2e36'; g.fillRect(x, y, w, h1);
  g.fillStyle = color; g.fillRect(x, y, Math.round(w * U.clamp(k, 0, 1)), h1);
  if (k2 != null) {
    g.fillStyle = '#2a2e36'; g.fillRect(x, y + h1 + 1, w, h2);
    g.fillStyle = '#3563bf'; g.fillRect(x, y + h1 + 1, Math.round(w * U.clamp(k2, 0, 1)), h2);
  }
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
  const w = Math.min(220, g.measureText(text).width + 16);
  g.fillStyle = 'rgba(255,255,255,0.95)'; g.strokeStyle = '#444'; g.lineWidth = 1;
  rr(g, x - w / 2, y - 12, w, 22, 6); g.fill(); g.stroke();
  g.fillStyle = '#222'; g.fillText(text, x, y, 210);
};

R.fxPos = f => {
  if (f.ref) return { x: f.ref.x, y: f.ref.y };
  return { x: f.x, y: f.y };
};

R.drawFx = (g, f, t) => {
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
