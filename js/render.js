'use strict';
// ============================================================
//  การเรนเดอร์โลก: กล้อง, พื้น, ตัวละคร, เอฟเฟกต์, ตัวเลขดาเมจ
// ============================================================

const R = {
  cv: null, g: null, W: 0, H: 0, dpr: 1, zoom: 1, camX: 0, camY: 0,
  dark: null, mouse: { x: -1, y: -1, wx: 0, wy: 0, down: false },
};

R.init = () => {
  R.cv = document.getElementById('cv');
  R.g = R.cv.getContext('2d');
  R.dark = document.createElement('canvas');
  R.resize();
  window.addEventListener('resize', R.resize);
};
R.resize = () => {
  R.dpr = Math.min(window.devicePixelRatio || 1, 2);
  R.W = window.innerWidth; R.H = window.innerHeight;
  R.cv.width = Math.floor(R.W * R.dpr); R.cv.height = Math.floor(R.H * R.dpr);
  R.cv.style.width = R.W + 'px'; R.cv.style.height = R.H + 'px';
  R.zoom = R.W < 700 ? 0.8 : 1;
  R.dark.width = Math.ceil(R.W / 2); R.dark.height = Math.ceil(R.H / 2);
};
R.screenToWorld = (sx, sy) => ({ x: sx / R.zoom + R.camX, y: sy / R.zoom + R.camY });

R.updateCamera = () => {
  const p = G.player, m = G.map;
  const vw = R.W / R.zoom, vh = R.H / R.zoom;
  let cx = p.x * TILE - vw / 2, cy = p.y * TILE - vh / 2;
  const mw = m.w * TILE, mh = m.h * TILE;
  cx = mw < vw ? (mw - vw) / 2 : U.clamp(cx, 0, mw - vw);
  cy = mh < vh ? (mh - vh) / 2 : U.clamp(cy, 0, mh - vh);
  R.camX = Math.round(cx * R.zoom) / R.zoom; R.camY = Math.round(cy * R.zoom) / R.zoom;
};

// หาสิ่งที่อยู่ใต้เมาส์ (มอนสเตอร์ / NPC / ไอเทม)
R.pick = (wx, wy) => {
  let best = null, bestD = Infinity;
  for (const m of G.mobs) {
    if (m.dead) continue;
    const s = (m.def.scale || 1) * (m.def.size || 1);
    const mx = m.x * TILE, my = m.y * TILE;
    if (Math.abs(wx - mx) < 20 * s && wy > my - 42 * s && wy < my + 8) {
      const d = Math.hypot(wx - mx, wy - (my - 16 * s));
      if (d < bestD) { bestD = d; best = { kind: 'mob', ref: m }; }
    }
  }
  if (best) return best;
  for (const n of G.npcs) {
    const nx = n.x * TILE + TILE / 2, ny = n.y * TILE + TILE / 2 + 10;
    if (Math.abs(wx - nx) < 16 && wy > ny - 52 && wy < ny + 6) return { kind: 'npc', ref: n };
  }
  for (const d of G.drops) {
    if (Math.hypot(wx - d.x * TILE, wy - d.y * TILE) < 16) return { kind: 'drop', ref: d };
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
  g.scale(R.zoom, R.zoom);
  g.translate(-R.camX, -R.camY);

  // พื้น
  const sx = Math.max(0, Math.floor(R.camX)), sy = Math.max(0, Math.floor(R.camY));
  const sw = Math.min(map.ground.width - sx, Math.ceil(vw) + 2), sh = Math.min(map.ground.height - sy, Math.ceil(vh) + 2);
  if (sw > 0 && sh > 0) g.drawImage(map.ground, sx, sy, sw, sh, sx, sy, sw, sh);
  // น้ำพุมีชีวิต
  if (map.fountain) {
    const fx = map.fountain.x * TILE, fy = map.fountain.y * TILE;
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2, k = (t * 1.2 + i * 0.13) % 1;
      g.fillStyle = `rgba(200,235,255,${0.9 - k})`;
      g.beginPath(); g.arc(fx + Math.cos(a) * 18 * k, fy - 28 + 30 * k * k - 14 * k + Math.sin(a) * 6 * k, 2, 0, 7); g.fill();
    }
  }
  // พอร์ทัล
  for (const pt of map.portals) Sprites.drawPortal(g, pt, t);

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
  // ไอเทมบนพื้น
  for (const d of G.drops) {
    const x = d.x * TILE, y = d.y * TILE;
    const age = G.time - d.born;
    const pop = age < 0.35 ? Math.sin(age / 0.35 * Math.PI) * 14 : 0;
    Sprites.shadow(g, x, y + 6, 9, 3, 0.3);
    g.drawImage(itemIconCanvas(d.id, 26), x - 13, y - 13 - pop);
    if (ITEMS[d.id].type === 'card' || ITEMS[d.id].price >= 5000) {
      g.strokeStyle = `rgba(255,230,120,${0.5 + Math.sin(t * 6) * 0.4})`; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y - pop, 15, 0, 7); g.stroke();
    }
  }

  // เรียงวาดตามแกน y
  const L = R.camX / TILE - 2, Rr = (R.camX + vw) / TILE + 2, Tp = R.camY / TILE - 1, B = (R.camY + vh) / TILE + 3;
  const list = [];
  for (const o of map.objects) if (o.x > L && o.x < Rr && o.y > Tp && o.y < B) list.push({ y: o.y + 0.3, f: () => Sprites.drawTree(g, o, t) });
  for (const n of G.npcs) list.push({ y: n.y + 0.5, f: () => Sprites.drawNpc(g, n, t) });
  for (const m of G.mobs) if (m.x > L && m.x < Rr && m.y > Tp && m.y < B) list.push({ y: m.y, f: () => Sprites.drawMob(g, m, t) });
  for (const a of G.allies) list.push({ y: a.y, f: () => Sprites.drawAlly(g, a, t) });
  list.push({ y: p.y, f: () => {
    g.save();
    if (p.stealthUntil > G.time) g.globalAlpha = 0.35 + Math.sin(t * 6) * 0.08;
    if (p.hurtFlash > 0) g.filter = 'sepia(1) saturate(6) hue-rotate(-40deg)';
    Sprites.drawPlayer(g, p, t);
    g.restore();
  } });
  list.sort((a, b) => a.y - b.y);
  for (const it of list) it.f();

  // เอฟเฟกต์
  for (const f of G.fx) R.drawFx(g, f, t);

  // ป้ายชื่อ / หลอด HP
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const n of G.npcs) R.label(g, n.x * TILE + TILE / 2, n.y * TILE + TILE / 2 + 22, n.name, '#9fd0ff');
  for (const m of G.mobs) {
    if (m.dead) continue;
    const x = m.x * TILE, y = m.y * TILE, s = (m.def.scale || 1);
    if (m.hp < m.maxHp || m.isMvp) R.bar(g, x, y + 10, m.isMvp ? 60 : 36, m.hp / m.maxHp, m.isMvp ? '#ff5050' : '#ff7070');
    if (m.isMvp) R.label(g, x, y + 22, `★ ${m.def.name} ★`, '#ff8080', true);
    else if (G.hover && G.hover.ref === m) R.label(g, x, y + 22, `${m.def.name} (Lv ${m.def.lv})`, m.def.aggro ? '#ffb0a0' : '#ffffff');
    if (m.emoteUntil > G.time) R.emote(g, x + 12, y - 44 * s, '!');
  }
  for (const a of G.allies) R.label(g, a.x * TILE, a.y * TILE + 14, `${a.name} ${Math.ceil(a.until - G.time)}s`, '#b8e0ff');
  if (G.hover && G.hover.kind === 'drop') {
    const d = G.hover.ref;
    R.label(g, d.x * TILE, d.y * TILE + 20, `${ITEMS[d.id].name}${d.qty > 1 ? ' ×' + d.qty : ''}`, '#fff6c0');
  }
  // ผู้เล่น
  {
    const x = p.x * TILE, y = p.y * TILE;
    R.label(g, x, y + 24, p.name, '#ffffff');
    R.bar(g, x, y + 10, 38, p.hp / p.d.maxHp, p.hp / p.d.maxHp < 0.25 ? '#ff4040' : '#50e050', p.sp / p.d.maxSp);
    if (p.cast) {
      const k = U.clamp((G.time - p.cast.start) / (p.cast.end - p.cast.start), 0, 1);
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x - 30, y - 66, 60, 8);
      g.fillStyle = '#60ff60'; g.fillRect(x - 29, y - 65, 58 * k, 6);
    }
    if (p.speech) R.speech(g, x, y - (p.cast ? 76 : 62), p.speech.text, p.speech.shout);
    if (p.sitting) R.emote(g, x + 14, y - 46, 'z');
  }
  // ตัวเลขลอย
  for (const f of G.floaters) {
    const k = f.t / f.dur;
    const x = f.x * TILE, y = f.y * TILE - k * (f.big ? 40 : 34) - (k < 0.15 ? (0.15 - k) * 60 : 0);
    g.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
    const size = f.big ? 22 : (typeof f.text === 'string' && /^\d+$/.test(f.text) ? 18 : 14);
    g.font = `900 ${size}px "Trebuchet MS", Tahoma, sans-serif`;
    g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.85)';
    g.strokeText(f.text, x, y);
    g.fillStyle = f.color; g.fillText(f.text, x, y);
    g.globalAlpha = 1;
  }
  g.restore();

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
      const x = ((lx * TILE - R.camX) * R.zoom) / 2, y = ((ly * TILE - 20 - R.camY) * R.zoom) / 2;
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
};

R.label = (g, x, y, text, color, bold) => {
  g.font = `${bold ? 'bold ' : ''}12px Tahoma, "Noto Sans Thai", sans-serif`;
  g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.8)';
  g.strokeText(text, x, y); g.fillStyle = color; g.fillText(text, x, y);
};
R.bar = (g, x, y, w, k, color, k2) => {
  g.fillStyle = 'rgba(0,0,0,0.65)'; g.fillRect(x - w / 2 - 1, y - 1, w + 2, k2 != null ? 8 : 5);
  g.fillStyle = color; g.fillRect(x - w / 2, y, w * U.clamp(k, 0, 1), 3);
  if (k2 != null) { g.fillStyle = '#5a8aff'; g.fillRect(x - w / 2, y + 4, w * U.clamp(k2, 0, 1), 2); }
};
R.emote = (g, x, y, ch) => {
  g.fillStyle = '#fff'; g.strokeStyle = '#333'; g.lineWidth = 1.5;
  g.beginPath(); g.ellipse(x, y, 9, 9, 0, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(x - 4, y + 7); g.lineTo(x - 7, y + 13); g.lineTo(x, y + 8); g.fill();
  g.fillStyle = ch === '!' ? '#e02020' : '#4060c0'; g.font = 'bold 13px Tahoma'; g.fillText(ch, x, y + 1);
};
R.speech = (g, x, y, text, shout) => {
  g.font = 'bold 13px Tahoma, "Noto Sans Thai", sans-serif';
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
  const X = pos.x * TILE, Y = pos.y * TILE;
  const tgtY = Y - 18 * ((f.ref && f.ref.def && f.ref.def.scale) || 1);
  switch (f.type) {
    case 'arrow': {
      if (after >= 0) break;
      const sx = f.sx * TILE, sy = f.sy * TILE;
      const ex = f.ref ? X : f.tx * TILE, ey = f.ref ? tgtY : f.ty * TILE - 24;
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
        const sx = f.sx * TILE, sy = f.sy * TILE;
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
