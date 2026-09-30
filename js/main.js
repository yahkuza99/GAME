'use strict';
// ============================================================
//  จุดเริ่มต้น: หน้าไตเติล, สร้างตัวละคร, ลูปเกม, การควบคุม
// ============================================================

const HAIR_COLORS = ['#3a2a1a', '#8a4a2a', '#e0b050', '#c83a3a', '#3a5ac8', '#e8e8f0', '#5aa04a', '#d070b0'];
const creation = { gender: 'm', hair: HAIR_COLORS[2] };

function toggleFullscreen() {
  const el = document.documentElement;
  if (document.fullscreenElement) document.exitFullscreen();
  else if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  setTimeout(() => UI.dirty(), 300);
}

// เดินไปยังช่องที่คลิกบนแผนที่ (หาเส้นทางยาวข้ามแผนที่ได้)
function mapWalkTo(tx, ty) {
  const p = G.player;
  tx = U.clamp(tx, 0, G.map.w - 1); ty = U.clamp(ty, 0, G.map.h - 1);
  p.target = null; p.pickTarget = null; p.npcTarget = null; p.skillIntent = null; p.cast = null; p.sitting = false;
  Bot.manualOverride();
  p.path = findPath(G.map, Math.floor(p.x), Math.floor(p.y), tx, ty, 20000);
  if (!p.path.length) UI.msg('ไปจุดนั้นไม่ได้', 'err');
  else addFx({ type: 'click', x: p.path[p.path.length - 1].x + 0.5, y: p.path[p.path.length - 1].y + 0.5, dur: 0.6 });
}

// เดิน 8 ทิศด้วยปุ่มลูกศร / WASD เมื่อกด Shift ค้าง
const keysDown = new Set();
function keyboardMove() {
  const p = G.player;
  if (!G.started || p.dead || p.cast) return;
  let dx = 0, dy = 0;
  if (keysDown.has('arrowleft')) dx--; if (keysDown.has('arrowright')) dx++;
  if (keysDown.has('arrowup')) dy--; if (keysDown.has('arrowdown')) dy++;
  if (!dx && !dy) return;
  if (G.time < (p.kbAt || 0)) return;
  p.kbAt = G.time + 0.08;
  p.target = null; p.pickTarget = null; p.npcTarget = null; p.skillIntent = null; p.sitting = false;
  Bot.manualOverride();
  const cx = Math.floor(p.x), cy = Math.floor(p.y);
  // ลองทิศตรงก่อน ถ้าติดให้ไถลตามแนวแกน
  for (const [ax, ay] of [[dx, dy], [dx, 0], [0, dy]]) {
    if (!ax && !ay) continue;
    const nx = cx + ax, ny = cy + ay;
    if (!G.map.walkable(nx, ny)) continue;
    if (ax && ay && (!G.map.walkable(cx + ax, cy) || !G.map.walkable(cx, cy + ay))) continue;
    p.path = [{ x: nx, y: ny }];
    p.dir = dirFromVec(ax, ay);
    return;
  }
  p.dir = dirFromVec(dx, dy);
}

function toggleSit() {
  const p = G.player;
  if (!G.started || p.dead || p.cast) return;
  p.sitting = !p.sitting;
  p.path = []; p.target = null; p.skillIntent = null;
  UI.msg(p.sitting ? 'นั่งพัก — ฟื้นฟู HP/SP เร็วขึ้น 2 เท่า' : 'ลุกขึ้นยืน', 'info');
}

// ------------------------------------------------------------
//  การควบคุมด้วยเมาส์/สัมผัส
// ------------------------------------------------------------
function updateMouse(e) {
  const r = R.cv.getBoundingClientRect();
  R.mouse.x = e.clientX - r.left; R.mouse.y = e.clientY - r.top;
  const w = R.screenToWorld(R.mouse.x, R.mouse.y);
  R.mouse.wx = w.x; R.mouse.wy = w.y;
}
function updateHover() {
  if (R.mouse.x < 0) { G.hover = null; return; }
  const w = R.screenToWorld(R.mouse.x, R.mouse.y);
  R.mouse.wx = w.x; R.mouse.wy = w.y;
  G.hover = R.pick(w.x, w.y);
  let cur = 'default';
  if (G.pendingSkill) cur = 'crosshair';
  else if (G.hover) cur = G.hover.kind === 'mob' ? 'crosshair' : 'pointer';
  if (R.cv.style.cursor !== cur) R.cv.style.cursor = cur;
}
function handleClick() {
  const p = G.player;
  if (!G.started || p.dead) return;
  updateHover();
  const hv = G.hover;
  if (G.pendingSkill) {
    const id = G.pendingSkill;
    G.pendingSkill = null;
    if (hv && hv.kind === 'mob') beginSkill(id, skillLv(id), hv.ref);
    else UI.msg('ยกเลิกการใช้สกิล', 'info');
    return;
  }
  if (p.cast) { p.cast = null; UI.msg('ยกเลิกการร่ายเวท', 'info'); }
  p.target = null; p.pickTarget = null; p.npcTarget = null; p.skillIntent = null;
  p.sitting = false;
  if (hv && hv.kind === 'mob') { p.target = hv.ref; p.repathAt = 0; return; }
  if (hv && hv.kind === 'npc') { p.npcTarget = hv.ref; p.path = []; return; }
  if (hv && hv.kind === 'drop') { p.pickTarget = hv.ref; p.path = []; return; }
  const tx = Math.floor(R.mouse.wx / TILE), ty = Math.floor(R.mouse.wy / TILE);
  Bot.manualOverride();
  playerWalkTo(tx, ty);
  addFx({ type: 'click', x: (tx + 0.5), y: (ty + 0.5), dur: 0.4 });
}

function bindInput() {
  const cv = R.cv;
  const touches = new Map();
  const pinchDist = () => { const [a, b] = [...touches.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
  cv.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2) { R.pinch = { d: pinchDist(), z: R.zoom }; R.mouse.down = false; return; }
    if (touches.size > 2) return;
    Sound.ensure();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    updateMouse(e);
    R.mouse.down = true;
    R.mouse.holdAt = G.time + 0.35;
    handleClick();
  });
  cv.addEventListener('pointermove', e => {
    if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (R.pinch && touches.size >= 2) { R.zoom = U.clamp(R.pinch.z * pinchDist() / R.pinch.d, 0.5, 1.8); return; }
    updateMouse(e);
  });
  cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') R.mouse.x = -1; });
  const up = e => { touches.delete(e.pointerId); if (touches.size < 2) R.pinch = null; R.mouse.down = false; };
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    R.zoom = U.clamp(R.zoom * (e.deltaY > 0 ? 0.9 : 1.1), 0.5, 1.8);
  }, { passive: false });

  window.addEventListener('keyup', e => keysDown.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keysDown.clear());
  window.addEventListener('keydown', e => {
    if (!G.started) return;
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const k = e.key.toLowerCase();
    if (k.startsWith('arrow')) { e.preventDefault(); keysDown.add(k); return; }
    if (k >= '1' && k <= '9') { useHotbar(+k - 1); return; }
    if (/^f[1-9]$/.test(k)) { e.preventDefault(); useHotbar(+k.slice(1) - 1); return; }
    switch (k) {
      case 'a': UI.toggle('w-status'); break;
      case 'e': case 'i': UI.toggle('w-inv'); break;
      case 'q': UI.toggle('w-equip'); break;
      case 's': case 'k': UI.toggle('w-skills'); break;
      case 'o': UI.toggle('w-options'); break;
      case 'h': UI.toggle('w-help'); break;
      case 'b': Bot.toggle(); break;
      case 'm': UI.toggle('w-map'); break;
      case 'u': UI.toggleHud(); break;
      case 'n': UI.toggle('w-bot'); break;
      case '-': R.zoom = U.clamp(R.zoom * 0.9, 0.5, 1.8); break;
      case '=': case '+': R.zoom = U.clamp(R.zoom * 1.1, 0.5, 1.8); break;
      case 'x': case 'insert': toggleSit(); break;
      case 'enter': e.preventDefault(); $('#chat-input').focus(); break;
      case 'escape':
        if (G.pendingSkill) { G.pendingSkill = null; UI.msg('ยกเลิกการใช้สกิล', 'info'); }
        else UI.closeTop();
        break;
    }
  });
}

// ------------------------------------------------------------
//  ลูปหลัก
// ------------------------------------------------------------
let lastTs = 0, hudAcc = 0, lastSimReal = performance.now();
const MAX_CATCHUP = 600; // จำลองย้อนหลังได้สูงสุด 10 นาที

// จำลองเกมแบบเร่งความเร็ว (ใช้เมื่อสลับแท็บ/ล็อกจอขณะเปิดบอท)
function catchUp(sec) {
  const s0 = Bot.summary();
  const lv0 = G.player.baseLv;
  G.fastSim = true;
  const step = 1 / 15;
  let left = Math.min(sec, MAX_CATCHUP);
  while (left > 0 && Bot.on) { updateGame(Math.min(step, left)); left -= step; }
  G.fastSim = false;
  const s1 = Bot.summary();
  if (sec > 20 && s0 && s1) {
    UI.msg(`⏱ ระหว่างที่ไม่อยู่ ${Math.round(Math.min(sec, MAX_CATCHUP) / 60 * 10) / 10} นาที: ล่าได้ ${s1.kills - s0.kills} ตัว, Base EXP +${U.fmt(s1.bexp - s0.bexp)}, ไอเทม ${s1.items - s0.items} ชิ้น${G.player.baseLv > lv0 ? `, เลเวลอัปเป็น ${G.player.baseLv}!` : ''}`, 'lvl');
  }
  UI.dirty();
}
function advanceSim() {
  const now = performance.now();
  const real = (now - lastSimReal) / 1000;
  lastSimReal = now;
  if (!G.started) return;
  if (real > 0.25 && Bot.on) catchUp(real);
  else updateGame(Math.min(0.05, real));
}

function loop(ts) {
  const dt = Math.min(0.05, lastTs ? (ts - lastTs) / 1000 : 0);
  lastTs = ts;
  if (G.started) {
    updateHover();
    advanceSim();
    const p = G.player;
    // กดค้างเพื่อเดินตามเมาส์
    if (R.mouse.down && !R.pinch && !p.target && !p.npcTarget && !p.pickTarget && !p.skillIntent && !p.dead && !G.hover && G.time >= R.mouse.holdAt) {
      R.mouse.holdAt = G.time + 0.2;
      Bot.manualOverride();
      playerWalkTo(Math.floor(R.mouse.wx / TILE), Math.floor(R.mouse.wy / TILE));
    }
    keyboardMove();
    Online.update(dt);
    R.render();
    UI.renderWindows();
    hudAcc += dt;
    if (hudAcc > 0.08) { hudAcc = 0; UI.updateHud(); }
  } else {
    lastSimReal = performance.now();
    drawTitlePreview(ts / 1000);
  }
  requestAnimationFrame(loop);
}

// ------------------------------------------------------------
//  หน้าไตเติลและการสร้างตัวละคร
// ------------------------------------------------------------
function peekSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; }
}
// ---------------- ออนไลน์: สมัคร / ล็อกอิน ----------------
let authMode = 'login', cloudSave = null;
function showAuth() {
  $('#title-menu').classList.add('hidden'); $('#create').classList.add('hidden'); $('#acct').classList.add('hidden');
  $('#auth').classList.remove('hidden');
  $('#au-user').focus();
}
function setAuthMode(m) {
  authMode = m;
  $$('#au-tabs button').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
  $('#au-pass2-wrap').classList.toggle('hidden', m !== 'register');
  $('#au-pass').autocomplete = m === 'register' ? 'new-password' : 'current-password';
  $('#au-submit').textContent = m === 'register' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ';
  $('#au-err').textContent = '';
}
async function afterLogin() {
  $('#auth').classList.add('hidden');
  $('#acct').classList.remove('hidden');
  $('#acct-name').textContent = Online.username;
  const cont = $('#btn-continue');
  $('#title-menu').classList.remove('hidden');
  cont.classList.remove('hidden');
  cont.innerHTML = 'กำลังโหลดตัวละคร...';
  $('#btn-new').classList.add('hidden');
  try { cloudSave = await Online.loadCharacter(); }
  catch (e) { cont.innerHTML = `โหลดตัวละครไม่สำเร็จ<small>${U.esc(e.message)} — แตะเพื่อลองใหม่</small>`; cont.onclick = () => afterLogin(); return; }
  if (cloudSave) {
    cont.innerHTML = `เข้าเกม<small>${U.esc(cloudSave.name)} • ${JOBS[cloudSave.job] ? JOBS[cloudSave.job].name : ''} Lv ${cloudSave.baseLv}</small>`;
    cont.onclick = () => {
      const p = loadGameFrom(cloudSave);
      if (!p) { cont.innerHTML = 'ข้อมูลตัวละครเสียหาย'; return; }
      startGame(p, false);
    };
  } else {
    // ยังไม่มีตัวละคร → ไปหน้าสร้างตัวละคร
    $('#title-menu').classList.add('hidden');
    $('#create').classList.remove('hidden');
    if (!$('#cr-name').value) $('#cr-name').value = Online.username;
    $('#cr-name').focus();
  }
}
function bindAuth() {
  $$('#au-tabs button').forEach(b => b.onclick = () => setAuthMode(b.dataset.mode));
  $('#auth').addEventListener('submit', async e => {
    e.preventDefault();
    const u = $('#au-user').value.trim(), pw = $('#au-pass').value;
    const err = $('#au-err'), btn = $('#au-submit');
    if (authMode === 'register' && pw !== $('#au-pass2').value) { err.textContent = 'รหัสผ่านทั้งสองช่องไม่ตรงกัน'; return; }
    btn.disabled = true; err.textContent = authMode === 'register' ? 'กำลังสมัคร...' : 'กำลังเข้าสู่ระบบ...';
    try {
      if (authMode === 'register') await Online.register(u, pw); else await Online.login(u, pw);
      err.textContent = '';
      $('#au-pass').value = ''; $('#au-pass2').value = '';
      await afterLogin();
    } catch (ex) { err.textContent = ex.message; }
    finally { btn.disabled = false; }
  });
  $('#au-offline').onclick = () => {
    Online.enabled = false;
    $('#auth').classList.add('hidden');
    $('#title-menu').classList.remove('hidden');
    setupOfflineMenu();
  };
  $('#acct-logout').onclick = async () => { await Online.logout(); cloudSave = null; $('#btn-new').classList.remove('hidden'); $('#btn-continue').classList.add('hidden'); showAuth(); };
}

function showTitle() {
  setupCreateScreen();
  if (Online.enabled) {
    bindAuth();
    setAuthMode('login');
    Online.restore().then(ok => (ok ? afterLogin() : showAuth()));
    return;
  }
  setupOfflineMenu();
}
function setupOfflineMenu() {
  const s = peekSave();
  const cont = $('#btn-continue');
  if (s && s.name) {
    cont.classList.remove('hidden');
    cont.innerHTML = `เล่นต่อ<small>${U.esc(s.name)} • ${JOBS[s.job] ? JOBS[s.job].name : ''} Lv ${s.baseLv}</small>`;
  }
  $('#btn-new').onclick = () => { $('#title-menu').classList.add('hidden'); $('#create').classList.remove('hidden'); $('#cr-name').focus(); Sound.ensure(); };
  cont.onclick = () => {
    const p = loadGame();
    if (!p) { cont.innerHTML = 'โหลดเซฟไม่สำเร็จ<small>กรุณาเริ่มการผจญภัยใหม่</small>'; return; }
    startGame(p, false);
  };
}
function setupCreateScreen() {
  $('#cr-back').onclick = () => {
    $('#create').classList.add('hidden');
    if (Online.online) { $('#acct-logout').click(); return; }
    $('#title-menu').classList.remove('hidden');
  };
  const hc = $('#cr-hair');
  for (const c of HAIR_COLORS) {
    const b = h('button', { class: 'swatch' + (c === creation.hair ? ' on' : ''), style: `background:${c}`, title: c, onclick: () => {
      creation.hair = c; $$('.swatch', hc).forEach(x => x.classList.remove('on')); b.classList.add('on');
    } });
    hc.append(b);
  }
  $$('#cr-gender button').forEach(b => b.onclick = () => {
    creation.gender = b.dataset.g; $$('#cr-gender button').forEach(x => x.classList.toggle('on', x === b));
  });
  $('#cr-start').onclick = async () => {
    const name = $('#cr-name').value.trim().slice(0, 16);
    if (!name) { $('#cr-err').textContent = 'กรุณาตั้งชื่อตัวละคร'; return; }
    if (Online.online) {
      $('#cr-err').textContent = 'กำลังตรวจสอบชื่อ...';
      try { if (!(await Online.nameAvailable(name))) { $('#cr-err').textContent = 'ชื่อตัวละครนี้มีคนใช้แล้ว ลองชื่ออื่น'; return; } }
      catch (e) { $('#cr-err').textContent = e.message; return; }
      G.uid = 1;
      startGame(newPlayer(name, creation.gender, creation.hair), true);
      return;
    }
    const s = peekSave();
    // มีเซฟเดิม: กดครั้งแรกเตือน กดซ้ำเพื่อยืนยันเขียนทับ (ไม่ใช้ confirm() ของเบราว์เซอร์)
    if (s && s.name && !creation.overwriteOk) {
      creation.overwriteOk = true;
      $('#cr-err').textContent = `มีเซฟของ ${s.name} อยู่แล้ว — กด "เริ่มเกม!" อีกครั้งเพื่อเขียนทับ`;
      $('#cr-start').textContent = 'ยืนยันเขียนทับ';
      return;
    }
    G.uid = 1;
    const p = newPlayer(name, creation.gender, creation.hair);
    startGame(p, true);
  };
  $('#cr-name').addEventListener('keydown', e => { if (e.key === 'Enter') $('#cr-start').click(); });
}
function drawTitlePreview(t) {
  const c = $('#cr-preview');
  if (!c || $('#create').classList.contains('hidden')) return;
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, c.width, c.height);
  g.fillStyle = 'rgba(111,174,74,0.35)';
  g.beginPath(); g.ellipse(c.width / 2, c.height - 22, 70, 18, 0, 0, 7); g.fill();
  g.save(); g.translate(c.width / 2 - 10, c.height - 24); g.scale(2.4, 2.4);
  const fake = {
    x: 0, y: 0, job: 'novice', hair: creation.hair, gender: creation.gender, facing: 1, moving: false, sitting: false, dead: false,
    atkAnim: 0, buffs: {}, equip: { weapon: { id: 'knife' }, head: null, garment: null },
  };
  Sprites.drawPlayer(g, fake, t);
  g.restore();
  const poring = { def: MOBS.pudding, facing: -1, moving: true, seed: 0.3, state: 'idle' };
  g.save(); g.translate(c.width / 2 + 60, c.height - 22); g.scale(1.5, 1.5);
  Sprites.poring(g, 0, 0, poring, t);
  g.restore();
}

function startGame(p, isNew) {
  G.player = p;
  G.started = true;
  $('#title').classList.add('hidden');
  $('#hud').classList.remove('hidden');
  recalc();
  if (isNew) { p.hp = p.d.maxHp; p.sp = p.d.maxSp; }
  changeMap(p.map, p.x, p.y);
  UI.dirty(); UI.renderWindows(true); UI.updateHud();
  UI.msg(`ระบบออนไลน์... ยินดีต้อนรับสู่ NEO MIDGARD, ${p.name}!`, 'lvl');
  if (Online.online) { Online.joinChat(); UI.setNet('ok'); UI.msg(`🌐 ออนไลน์ในชื่อบัญชี ${Online.username} — กด Enter เพื่อแชทกับทุกคน`, 'sys'); }
  UI.msg('กด H เพื่อดูวิธีเล่น • คุยกับ Guard Unit Rolf (หุ่นหมวกเขา) เพื่อขอคำแนะนำ', 'info');
  if (isNew) {
    UI.open('w-help');
    UI.msg('เคล็ดลับ: เริ่มต้นด้วยการแจก Status Point (กด A) แล้วออกไปล่า Slime Drone ทางตะวันออกของเมือง', 'info');
  }
  saveGame();
}

window.addEventListener('load', () => {
  R.init();
  Art.load();
  Online.init();
  UI.init();
  bindInput();
  showTitle();
  setInterval(() => saveGame(), 30000);
  // แท็บถูกซ่อน: requestAnimationFrame หยุด แต่บอทยังทำงานต่อผ่าน timer
  setInterval(() => { if (document.hidden && G.started) advanceSim(); }, 1000);
  window.addEventListener('beforeunload', () => { saveGame(true, true); Online.flushSave(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
  requestAnimationFrame(loop);
});
