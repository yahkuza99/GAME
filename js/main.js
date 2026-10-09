'use strict';
// ============================================================
//  จุดเริ่มต้น: หน้าไตเติล, สร้างตัวละคร, ลูปเกม, การควบคุม
// ============================================================

const HAIR_COLORS = ['#e8ecf4', '#9aa4b8', '#3a3f4c', '#e0b050', '#c83a3a', '#3a8ae0', '#5ad0a0', '#d070d0'];
const BODY_COLORS = ['#e6e9ef', '#c8ccd6', '#8a94a6', '#3a404e', '#e8dcc8', '#f0d6e0'];
const GLOW_COLORS = ['#7ad8ff', '#8cff7a', '#ffe27a', '#ff8a2a', '#ff5a6a', '#c07aff', '#ff7ad8', '#ffffff'];
const HEAD_STYLES = [['long', L('ยาว', 'Long')], ['twin', L('แฝด', 'Twin')], ['bob', L('บ็อบ', 'Bob')], ['short', L('สั้น', 'Short')], ['spiky', L('แหลม', 'Spiky')], ['crest', L('หงอน', 'Crest')]];
const VISORS = [['band', L('แถบ', 'Band')], ['v', L('ทรง V', 'V-Shape')], ['slit', L('คู่', 'Twin Slit')]];
// เลขเวอร์ชัน (แสดงมุมหน้าไตเติล — แจ้งเวอร์ชันนี้เวลาส่งฟีดแบ็ก)
const GAME_VERSION = L('0.9.0 (ทดสอบ)', '0.9.0 (Beta)');
const creation = { gender: 'f', hair: HAIR_COLORS[0], head: 'long', color: BODY_COLORS[0], glow: GLOW_COLORS[0], visor: 'band', dir: 3 }; // dir 3 = หันหน้าซ้ายล่าง (3/4) ยืนนิ่ง

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
  p.target = null; p.skillTarget = null; p.manualSkillLock = false; p.pickTarget = null; p.npcTarget = null; p.skillIntent = null; p.cast = null; p.sitting = false;
  Bot.manualOverride(); Nav.cancel(true);
  p.path = findPath(G.map, Math.floor(p.x), Math.floor(p.y), tx, ty, 20000);
  if (!p.path.length) UI.msg(L('ไปจุดนั้นไม่ได้', 'Cannot move there.'), 'err');
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
  stepMove(dx, dy);
}
// ก้าวหนึ่งช่องตามทิศ (ใช้ร่วมกับจอยบนจอและจอยเกม)
function stepMove(dx, dy) {
  const p = G.player;
  if (!G.started || p.dead || p.cast) return;
  if (G.time < (p.kbAt || 0)) return;
  p.kbAt = G.time + 0.08;
  p.target = null; p.skillTarget = null; p.manualSkillLock = false; p.pickTarget = null; p.npcTarget = null; p.skillIntent = null; p.sitting = false;
  Bot.manualOverride(); Nav.cancel(true);
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
  if (!G.started || p.dead || p.cast || stunBlocked()) return;
  p.sitting = !p.sitting;
  p.path = []; p.target = null; p.skillTarget = null; p.manualSkillLock = false; p.skillIntent = null;
  UI.msg(p.sitting ? L('นั่งพัก — ฟื้นฟู HP/SP เร็วขึ้น 2 เท่า', 'Resting — HP/SP recovery doubled.') : L('ลุกขึ้นยืน', 'You stand up.'), 'info');
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
  if (G.pendingSkill) cur = skillAimRadius(G.pendingSkill) > 0 ? 'none' : 'crosshair';
  else if (G.hover) cur = G.hover.kind === 'mob' ? 'crosshair' : 'pointer';
  if (R.cv.style.cursor !== cur) R.cv.style.cursor = cur;
}
// /nc (/noctrl): เปิด = คลิกมอนแล้วตีต่อเนื่อง • ปิด = คลิกตี 1 ที (Ctrl+คลิก = ต่อเนื่อง) • คลิกเล็งสกิลไม่สั่งตีปกติ
function ncOn(ev) { return G.player.options.noCtrl !== false || !!(ev && ev.ctrlKey); }
function handleClick(ev) {
  const p = G.player;
  if (!G.started || p.dead) return;
  updateHover();
  const hv = G.hover;
  if (G.pendingSkill) {
    const id = G.pendingSkill;
    if (groundSkill(id)) {
      const w = R.screenToWorld(R.mouse.x, R.mouse.y);
      const point = {kind:'ground', map:G.map.id, x:w.x/TILE, y:w.y/TILE};
      if (!skillTargetValid(id, point)) { UI.msg(L('เลือกพื้นที่ที่เดินได้', 'Choose open ground.'), 'info'); return; }
      beginSkill(id, skillLv(id), point);
      return;
    }
    // แตะบนมือถือนิ้วใหญ่: ถ้าไม่โดนตัวพอดี เลือกมอนที่ใกล้จุดแตะที่สุดในระยะ 1.6 ช่อง
    let m = hv && hv.kind === 'mob' ? hv.ref : null;
    if (!m) {
      const wx = R.mouse.wx / TILE, wy = R.mouse.wy / TILE;
      m = G.mobs.filter(x => !x.dead && U.dist(x.x, x.y, wx, wy) < 1.6).sort((a, b) => U.dist(a.x, a.y, wx, wy) - U.dist(b.x, b.y, wx, wy))[0] || null;
    }
    G.pendingSkill = null;
    if (m) { beginSkill(id, skillLv(id), m); }
    else UI.msg(L('ยกเลิกการใช้สกิล', 'Skill cancelled.'), 'info');
    return;
  }
  if (typeof Market !== 'undefined' && Market.onClick()) return; // ป้ายร้านผู้เล่น = เปิดหน้าร้าน • กำลังเปิดร้าน = ไม่เดินออก (js/market.js)
  if (p.cast) { p.cast = null; UI.msg(L('ยกเลิกการร่ายเวท', 'Cast cancelled.'), 'info'); }
  p.target = null; p.skillTarget = null; p.manualSkillLock = false; p.pickTarget = null; p.npcTarget = null; p.skillIntent = null;
  p.sitting = false;
  if (hv && hv.kind === 'mob') { p.target = hv.ref; p.oneHit = ncOn(ev) ? null : hv.ref; p.repathAt = 0; Bot.userTarget(hv.ref); return; }
  if (hv && hv.kind === 'npc') { Bot.manualOverride(); p.npcTarget = hv.ref; p.path = []; return; }
  if (hv && hv.kind === 'drop') { Bot.manualOverride(); p.pickTarget = hv.ref; p.path = []; return; }
  const tx = Math.floor(R.mouse.wx / TILE), ty = Math.floor(R.mouse.wy / TILE);
  Bot.manualOverride(); Nav.cancel(true);
  playerWalkTo(tx, ty);
  addFx({ type: 'click', x: (tx + 0.5), y: (ty + 0.5), dur: 0.4 });
}

function bindInput() {
  const cv = R.cv;
  const touches = new Map();
  const pinchDist = () => { const [a, b] = [...touches.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
  cv.addEventListener('pointerdown', e => {
    UI.autoFoldMenu();
    if (e.button !== 0) return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2) { R.pinch = { d: pinchDist(), z: R.zoom }; R.mouse.down = false; return; }
    if (touches.size > 2) return;
    Sound.ensure();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    updateMouse(e);
    if (e.pointerType !== 'mouse' && typeof UnitCard !== 'undefined' && UnitCard.pressStart(e)) return; // มือถือ: นิ้วลงบนยูนิต → แตะค้าง 0.5 วิ = การ์ดข้อมูล (แตะสั้นทำงานตอนยกนิ้ว)
    R.mouse.down = true;
    R.mouse.holdAt = G.time + 0.35;
    handleClick(e);
  });
  cv.addEventListener('pointermove', e => {
    if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (R.pinch && touches.size >= 2) { R.zoom = U.clamp(R.pinch.z * pinchDist() / R.pinch.d, R.ZMIN, R.ZMAX); return; }
    updateMouse(e);
  });
  cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') R.mouse.x = -1; });
  const up = e => { touches.delete(e.pointerId); if (touches.size < 2) R.pinch = null; R.mouse.down = false; };
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  cv.addEventListener('contextmenu', e => { // คลิกขวา: มีสกิลรอเล็ง = ยกเลิก • ไม่งั้นที่ยูนิต = การ์ดข้อมูล (js/unitcard.js)
    e.preventDefault();
    if (G.pendingSkill) { G.pendingSkill = null; UI.msg(L('ยกเลิกการใช้สกิล', 'Skill cancelled.'), 'info'); return; }
    if (typeof UnitCard !== 'undefined') UnitCard.onContext(e);
  });
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    R.zoom = U.clamp(R.zoom * (e.deltaY > 0 ? 0.9 : 1.1), R.ZMIN, R.ZMAX);
  }, { passive: false });

  window.addEventListener('keyup', e => keysDown.delete(U.key(e)));
  window.addEventListener('blur', () => keysDown.clear());
  window.addEventListener('keydown', e => {
    if (!G.started) return;
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const k = U.key(e); // แป้นไทยก็ใช้คีย์ลัดได้
    // กำลังคุยกับ NPC: คีย์บอร์ดใช้กับบทสนทนาก่อน (Space/Enter ต่อไป-เลือก • ↑↓/W/S เลื่อน • 1-9 เลือกเลย • Esc ปิด)
    // กดค้าง (key repeat) ไม่นับในบทสนทนา — กัน Space ค้างไหลผ่านเมนูจนเลือกตัวเลือกแรก (เช่น เปลี่ยน Class)
    if (UI.dialog && UI.isOpen('w-dialog') && (e.repeat ? [' ', 'enter'].includes(k) : UI.dlgKey(k))) { e.preventDefault(); return; }
    if (k.startsWith('arrow')) { e.preventDefault(); keysDown.add(k); return; }
    if (e.altKey && /^Digit[1-9]$/.test(e.code)) { e.preventDefault(); Emote.play(EMOTES[+e.code.slice(5) - 1].k); return; } // ใช้ e.code: Option+เลขบน Mac ให้อักขระพิเศษ
    if (!e.repeat && UI.bindKey(/^f[1-8]$/.test(k) ? k.slice(1) : k)) { e.preventDefault(); return; } // ชี้ที่สกิล/ไอเทมแล้วกดปุ่มลัด = ตั้งช่องนั้น
    if (UI.equipMode && UI.equipMode.bar === 'hotbar' && k >= '1' && k <= '8') { UI.finishEquip(+k - 1); return; }
    if (UI.equipMode && UI.equipMode.bar === 'potbar' && ['z', 'c', 'v', 'f'].includes(k)) { UI.finishEquip(['z', 'c', 'v', 'f'].indexOf(k)); return; }
    if (k >= '1' && k <= '8') { useHotbar(+k - 1); return; }
    if (/^f[1-8]$/.test(k)) { e.preventDefault(); useHotbar(+k.slice(1) - 1); return; }
    const pot = ['z', 'c', 'v', 'f'].indexOf(k);
    if (pot >= 0) { usePotbar(pot); return; }
    switch (k) {
      case 'a': UI.toggle('w-status'); break;
      case 'e': case 'i': UI.toggle('w-inv'); break;
      case 'q': UI.toggle('w-equip'); break;
      case 's': case 'k': UI.toggle('w-skills'); break;
      case 'o': UI.toggle('w-options'); break;
      case 'h': UI.toggle('w-help'); break;
      case 'g': UI.toggle('w-nav'); break;
      case 'y': UI.toggle('w-party'); break;
      case 'j': UI.toggle('w-quest'); break;
      case 'w': UI.toggle('w-world'); break;
      case 'p': UI.toggle('w-tree'); break;
      case 'b': Bot.toggle(); break;
      case 'm': UI.toggle('w-map'); break;
      case 'u': UI.toggleHud(); break;
      case 'n': UI.toggle('w-bot'); break;
      case '-': R.zoom = U.clamp(R.zoom * 0.9, R.ZMIN, R.ZMAX); break;
      case '=': case '+': R.zoom = U.clamp(R.zoom * 1.1, R.ZMIN, R.ZMAX); break;
      case 'x': case 'insert': toggleSit(); break;
      case 't': if (typeof Feel !== 'undefined') Feel.ultFire(); break; // ไม้ตาย (เกจเต็ม)
      case ' ': e.preventDefault(); Pad.interact(); break;
      case 'tab': e.preventDefault(); UI.toggleMenu(); break;
      case 'enter': e.preventDefault(); $('#chat-input').focus(); break;
      case 'escape':
        if (UI.equipMode) UI.cancelEquip();
        else if (G.pendingSkill) { G.pendingSkill = null; UI.msg(L('ยกเลิกการใช้สกิล', 'Skill cancelled.'), 'info'); }
        else UI.closeTop();
        break;
    }
  });
}

// ------------------------------------------------------------
//  ลูปหลัก
// ------------------------------------------------------------
let lastTs = 0, hudAcc = 0, lastSimReal = performance.now();
// วัด FPS ช่วงแรกของการเล่น: ถ้าเครื่องช้า แนะนำโหมดกราฟิกประหยัด (ครั้งเดียว ถ้ายังไม่เคยเลือกเอง)
let fpsWatch = { done: true };
function watchFps(now) {
  const w = fpsWatch; if (w.done || document.hidden) return;
  if (now < w.t0) return;
  w.n++;
  if (now - w.t0 >= 8000) {
    w.done = true;
    const fps = w.n / ((now - w.t0) / 1000);
    if (fps < 38 && R.quality !== 'low') UI.msg(L(`⚙ เครื่องนี้แสดงผลได้ ~${Math.round(fps)} FPS — ลองตั้งค่า → คุณภาพกราฟิก: "ประหยัด" จะลื่นขึ้นมาก`, `⚙ Your device is running at ~${Math.round(fps)} FPS — try Settings → Graphics Quality: "Low" for much smoother play.`), 'info');
  }
}
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
    UI.msg(L(`⏱ ระหว่างที่ไม่อยู่ ${Math.round(Math.min(sec, MAX_CATCHUP) / 60 * 10) / 10} นาที: ล่าได้ ${s1.kills - s0.kills} ตัว, Base EXP +${U.fmt(s1.bexp - s0.bexp)}, ไอเทม ${s1.items - s0.items} ชิ้น${G.player.baseLv > lv0 ? `, เลเวลอัปเป็น ${G.player.baseLv}!` : ''}`, `⏱ While you were away (${Math.round(Math.min(sec, MAX_CATCHUP) / 60 * 10) / 10} min): ${s1.kills - s0.kills} kills, Base EXP +${U.fmt(s1.bexp - s0.bexp)}, ${s1.items - s0.items} items${G.player.baseLv > lv0 ? `, reached Base Lv ${G.player.baseLv}!` : ''}`), 'lvl');
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

// เฟรมหนึ่งพังต้องไม่ทำให้ทั้งเกมค้าง: จับ error แล้ววนเฟรมต่อ (แจ้งในแชทครั้งเดียวต่อชนิด เพื่อแคปส่งมาแก้)
const loopErrs = new Set();
function loop(ts) {
  try { frame(ts); } catch (e) {
    const key = String(e && e.message || e);
    if (!loopErrs.has(key)) {
      loopErrs.add(key); console.error(e);
      try { UI.msg(L(`⚠ เกิดข้อผิดพลาด (เกมยังเล่นต่อได้): ${key.slice(0, 120)} — แคปหน้าจอนี้ส่งผู้พัฒนาได้`, `⚠ An error occurred (you can keep playing): ${key.slice(0, 120)} — please send a screenshot to the developer.`), 'err'); } catch (e2) { /* ignore */ }
    }
  }
  requestAnimationFrame(loop);
}
function frame(ts) {
  if (G.started) watchFps(ts);
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
    Pad.update();
    Nav.update();
    Quest.tick();
    Ambient.tick();
    Music.update();
    Online.update(dt);
    R.render();
    UI.renderWindows();
    hudAcc += dt;
    if (hudAcc > 0.08) { hudAcc = 0; UI.updateHud(); }
  } else {
    if (GpuFX.active || GpuFX.pending) GpuFX.release();
    lastSimReal = performance.now();
    Title.draw(ts / 1000);
    drawTitlePreview(ts / 1000);
    drawSelectPreview(ts / 1000);
  }
}

// ------------------------------------------------------------
//  หน้าไตเติลและการสร้างตัวละคร
// ------------------------------------------------------------
// ---------------- ออนไลน์: สมัคร / ล็อกอิน ----------------
let authMode = 'login';
// ซ่อนทุกแผงของหน้าไตเติล (ล็อกอิน / เลือกตัวละคร / สร้างตัวละคร)
function hideTitlePanels() {
  for (const id of ['#auth', '#charsel', '#create', '#acct']) $(id).classList.add('hidden');
  $('#title').classList.remove('creating', 'selecting');
  csConfirmClose();
}
function authNote() { return Online.local ? L('บัญชีเก็บในเบราว์เซอร์นี้ • ตัวละครแยกตามบัญชี', 'Accounts are stored in this browser • Characters are saved per account') : L('บัญชีออนไลน์ • เล่นได้ทุกเครื่อง', 'Online account • Play from any device'); }
function showAuth() {
  hideTitlePanels();
  Acct.data = null;
  $('#auth').classList.remove('hidden');
  $('#au-note').textContent = authNote();
  if (!matchMedia('(pointer: coarse)').matches) $('#au-user').focus();
}
function setAuthMode(m) {
  authMode = m;
  $$('#au-tabs button').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
  $('#au-pass2-wrap').classList.toggle('hidden', m !== 'register');
  $('#au-pass').autocomplete = m === 'register' ? 'new-password' : 'current-password';
  $('#au-submit').textContent = m === 'register' ? L('สมัครสมาชิก', 'Register') : L('เข้าสู่ระบบ', 'Log In');
  $('#au-err').textContent = '';
}
// แถบบัญชีบนหน้าเลือกตัวละคร: ล็อกอินอยู่ = ชื่อบัญชี + ออกจากระบบ • ไม่ล็อกอิน = เล่นในเครื่อง + เข้าสู่ระบบ
function showAcctPill() {
  const a = $('#acct'), off = !Online.loggedIn;
  a.classList.remove('hidden'); a.classList.toggle('offline', off);
  $('#acct-label').textContent = off ? L('เล่นแบบไม่ล็อกอิน', 'Playing offline') : L('ล็อกอินเป็น', 'Logged in as');
  $('#acct-name').textContent = off ? '' : Online.username;
  $('#acct-name').classList.toggle('hidden', off);
  $('#acct-logout').textContent = off ? L('เข้าสู่ระบบ / สมัครสมาชิก', 'Log in / Sign up') : L('ออกจากระบบ', 'Log out');
}
async function afterLogin() {
  hideTitlePanels();
  showAcctPill();
  csLoading(L('กำลังโหลดตัวละคร...', 'Loading characters...'));
  let acct;
  try { acct = await Online.loadCharacter(); }
  catch (e) { csLoading(L(`โหลดตัวละครไม่สำเร็จ: ${e.message}`, `Failed to load characters: ${e.message}`), () => afterLogin()); return; }
  Acct.data = acct;
  // ยังไม่มีตัวละคร → ไปหน้าสร้างตัวละครเลย (บัญชีในเครื่องที่มีตัวละครแบบไม่ล็อกอินให้เลือกย้ายเข้าบัญชีก่อน)
  if (!acct.chars.length && !csImportable().length) { openCreate(); if (!$('#cr-name').value) $('#cr-name').value = Online.username; return; }
  showCharSel();
}
function enterOffline() {
  Acct.data = Acct.readLocal();
  showCharSel();
}
function bindAuth() {
  $$('#au-tabs button').forEach(b => b.onclick = () => setAuthMode(b.dataset.mode));
  $('#auth').addEventListener('submit', async e => {
    e.preventDefault();
    const u = $('#au-user').value.trim(), pw = $('#au-pass').value;
    const err = $('#au-err'), btn = $('#au-submit');
    if (authMode === 'register' && pw !== $('#au-pass2').value) { err.textContent = L('รหัสผ่านทั้งสองช่องไม่ตรงกัน', 'Passwords do not match.'); return; }
    btn.disabled = true; err.textContent = authMode === 'register' ? L('กำลังสมัคร...', 'Registering...') : L('กำลังเข้าสู่ระบบ...', 'Logging in...');
    try {
      if (authMode === 'register') await Online.register(u, pw); else await Online.login(u, pw);
      err.textContent = '';
      $('#au-pass').value = ''; $('#au-pass2').value = '';
      await afterLogin();
    } catch (ex) { err.textContent = ex.message; }
    finally { btn.disabled = false; }
  });
  $('#au-offline').onclick = () => { Sound.ensure(); enterOffline(); };
  $('#acct-logout').onclick = async () => {
    if (Online.loggedIn) { await Online.logout(); Acct.data = null; }
    showAuth();
  };
}

function showTitle() {
  $('#title-ver').textContent = 'IRON VALHALLA v' + GAME_VERSION;
  setupCreateScreen();
  setupCharSel();
  bindAuth();
  // หน้าแรก: ล็อกอิน/สมัคร (หรือกด "เล่นแบบไม่ล็อกอิน") • เคยล็อกอินค้างไว้ = เข้าหน้าเลือกตัวละครเลย
  setAuthMode(Online.local && !Object.keys(Online.lsGet(Online.LS.accounts, {})).length ? 'register' : 'login');
  let back = null; // กลับมาจาก "เปลี่ยนตัวละคร" ในเกม (รีโหลดหน้า) → เปิดหน้าเลือกตัวละครเลย
  try { back = sessionStorage.getItem('nm_charsel'); sessionStorage.removeItem('nm_charsel'); } catch (e) { /* โหมดส่วนตัว */ }
  hideTitlePanels();
  // การ์ดล็อกอินขึ้นทันที (เดิมรอเช็กเซิร์ฟเวอร์ออนไลน์ ~1.5 วิหลังโหลดสคริปต์) — เฉพาะคนที่ไม่มีเซสชันค้าง (มีเซสชัน = ข้ามไปเลือกตัวละคร ไม่กะพริบ)
  //   สมัคร/ล็อกอินรอเซิร์ฟเวอร์เองอยู่แล้ว (Online.login/register await ready) • ปุ่มเล่นแบบไม่ล็อกอินกดได้ทันที
  let hasSession = false;
  try { hasSession = !!localStorage.getItem(Online.LS.session) || Object.keys(localStorage).some(k => /^sb-.+-auth-token$/.test(k)); } catch (e) { /* โหมดส่วนตัว */ }
  const early = !hasSession && back !== 'offline';
  if (early) showAuth();
  Online.restore().then(ok => {
    if (ok) afterLogin();
    else if (back === 'offline') enterOffline();
    else if (!early) showAuth();
    else if (!$('#auth').classList.contains('hidden')) { // ยังอยู่หน้าล็อกอิน: อัปเดตข้อความ/แท็บตามผลเช็กเซิร์ฟเวอร์ (ถ้ายังไม่ได้พิมพ์อะไร)
      if (!$('#au-user').value && !$('#au-pass').value) setAuthMode(Online.local && !Object.keys(Online.lsGet(Online.LS.accounts, {})).length ? 'register' : 'login');
      $('#au-note').textContent = authNote();
    }
  });
}

// ---------------- หน้าเลือกตัวละคร (สูงสุด Acct.MAX ช่องต่อบัญชี) ----------------
let csSel = 0, csFakes = [], csFaceAt = 0;
function setupCharSel() {
  UnitPreview.init($('#cs-preview'));
  $('#btn-new').onclick = () => openCreate();
  $('#btn-continue').onclick = () => csPlay(csSel);
  $('#cs-delete').onclick = () => csAskDelete(csSel);
  $('#cs-import').onclick = () => csImport();
  $('#cs-list').addEventListener('keydown', e => {
    const n = Acct.chars.length; if (!n) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); csSelect(U.clamp(csSel + (e.key === 'ArrowDown' ? 1 : -1), 0, n - 1), true); }
    else if (e.key === 'Enter' && e.target.closest('.cs-slot:not(.empty)')) { e.preventDefault(); csPlay(csSel); }
  });
}
function showCharSel(sel) {
  hideTitlePanels();
  showAcctPill();
  $('#title').classList.add('selecting');
  $('#charsel').classList.remove('hidden');
  $('#charsel').classList.remove('loading');
  csSel = sel != null ? sel : (Acct.data ? Acct.data.active : 0);
  $('#cs-err').textContent = '';
  renderCharSel();
  const on = $('#cs-list .cs-slot.on');
  if (on && !matchMedia('(pointer: coarse)').matches) on.focus({ preventScroll: true });
}
// ระหว่างโหลดตัวละครจากเซิร์ฟเวอร์ / โหลดไม่สำเร็จ (retry = ปุ่มลองใหม่)
function csLoading(text, retry) {
  $('#title').classList.add('selecting');
  $('#charsel').classList.remove('hidden');
  $('#charsel').classList.add('loading');
  $('#cs-list').innerHTML = '';
  $('#cs-list').append(h('div', { class: 'cs-wait' }, text, retry ? h('button', { type: 'button', class: 'linkbtn', onclick: retry }, 'Retry') : null));
  $('#cs-info').innerHTML = ''; $('#cs-count').textContent = ''; $('.cs-stage').dataset.slot = '';
  csFakes = [];
  for (const id of ['#btn-continue', '#btn-new', '#cs-delete', '#cs-import']) $(id).classList.add('hidden');
}
function csJob(c) { return JOBS[c.job] ? c.job : 'novice'; }
function csMapName(c) { const d = MAP_DEFS[c.map]; return d ? d.name : (MAP_DEFS[HOME_MAP] ? MAP_DEFS[HOME_MAP].name : ''); }
function csEmblem(job) { const em = typeof Art !== 'undefined' && Art.get('emblem_' + job); return em ? h('img', { src: em.src, alt: '' }) : null; }
function renderCharSel() {
  const chars = Acct.chars, n = chars.length;
  csSel = U.clamp(csSel, 0, Math.max(0, n - 1));
  csFakes = chars.map(c => ({
    x: 0, y: 0, job: csJob(c), hair: c.hair, gender: c.gender, look: c.look, facing: 1, dir: 3, moving: false, sitting: false, dead: false,
    atkAnim: 0, buffs: {}, equip: { weapon: c.equip && c.equip.weapon && ITEMS[c.equip.weapon.id] ? { id: c.equip.weapon.id } : null,
      head: c.equip && c.equip.head && ITEMS[c.equip.head.id] ? { id: c.equip.head.id } : null, garment: c.equip && c.equip.garment && ITEMS[c.equip.garment.id] ? { id: c.equip.garment.id } : null },
  }));
  $('#cs-count').textContent = `${n} / ${Acct.MAX}`;
  const list = $('#cs-list'); list.innerHTML = '';
  for (let i = 0; i < Acct.MAX; i++) {
    const c = chars[i];
    if (!c) {
      list.append(h('button', { type: 'button', class: 'cs-slot empty', onclick: () => openCreate() },
        h('span', { class: 'cs-plus', 'aria-hidden': 'true' }, '+'), h('span', { class: 'cs-main' }, h('b', {}, L('สร้างตัวละคร', 'Create character')), h('small', {}, L(`ช่องว่าง ${i + 1}`, `Empty slot ${i + 1}`)))));
      continue;
    }
    const job = csJob(c);
    const row = h('button', { type: 'button', role: 'option', class: 'cs-slot' + (i === csSel ? ' on' : ''), 'aria-selected': i === csSel ? 'true' : 'false', 'data-i': i,
      onclick: () => csSelect(i), ondblclick: () => csPlay(i) },
      h('canvas', { class: 'cs-face', width: 96, height: 96, 'aria-hidden': 'true' }),
      h('span', { class: 'cs-main' }, h('b', {}, c.name), h('small', {}, csEmblem(job), JOBS[job].name, h('i', {}, ' · ' + csMapName(c)))),
      h('span', { class: 'cs-lv' }, h('b', {}, `Lv ${c.baseLv || 1}`), h('small', {}, `Job ${c.jobLv || 1}`)));
    list.append(row);
  }
  csRenderInfo();
  $('#charsel').classList.toggle('empty', !n);
  $('#cs-delete').classList.toggle('hidden', !n);
  $('#btn-new').classList.toggle('hidden', n >= Acct.MAX);
  $('#btn-new').classList.toggle('primary', !n);
  const imp = csImportable();
  $('#cs-import').classList.toggle('hidden', !imp.length || n >= Acct.MAX);
  $('#cs-import').textContent = L(`ย้ายตัวละครที่เล่นแบบไม่ล็อกอินเข้าบัญชีนี้ (${imp.map(x => x.name).join(', ')})`, `Move offline characters into this account (${imp.map(x => x.name).join(', ')})`);
  csFaceAt = 0;
}
// รายละเอียดตัวที่เลือก (ใต้ภาพตัวละคร) + ปุ่มเข้าเกม
function csRenderInfo() {
  const chars = Acct.chars, n = chars.length;
  const c = chars[csSel], info = $('#cs-info'); info.innerHTML = '';
  $('.cs-stage').dataset.slot = n ? `${String(csSel + 1).padStart(2, '0')} / ${String(Acct.MAX).padStart(2, '0')}` : '';
  if (c) {
    const job = csJob(c);
    info.append(h('b', { class: 'cs-name' }, c.name), h('span', { class: 'cs-job' }, csEmblem(job), JOBS[job].name),
      h('div', { class: 'cs-stats' },
        h('span', {}, h('small', {}, 'Base Lv'), h('b', {}, c.baseLv || 1)),
        h('span', {}, h('small', {}, 'Job Lv'), h('b', {}, c.jobLv || 1)),
        h('span', { class: 'wide' }, h('small', {}, 'Map'), h('b', {}, csMapName(c)))));
  } else info.append(h('div', { class: 'cs-empty' }, L('ยังไม่มีตัวละคร — สร้างตัวแรกของคุณ!', 'No characters yet — create your first unit!')));
  $('#btn-continue').classList.toggle('hidden', !n);
  $('#btn-continue').innerHTML = c ? L(`เข้าเกม<small>${U.esc(c.name)}</small>`, `Play<small>${U.esc(c.name)}</small>`) : 'Play';
}
function csSelect(i, focus) {
  if (i === csSel) return;
  csSel = i; csConfirmClose(); $('#cs-err').textContent = '';
  $$('#cs-list .cs-slot[data-i]').forEach(r => { const on = +r.dataset.i === i; r.classList.toggle('on', on); r.setAttribute('aria-selected', on ? 'true' : 'false'); });
  csRenderInfo();
  const on = $('#cs-list .cs-slot.on');
  if (on && (focus || !matchMedia('(pointer: coarse)').matches)) on.focus({ preventScroll: !focus });
}
function csPlay(i) {
  const c = Acct.chars[i];
  if (!c || G.started) return;
  const p = loadGameFrom(c);
  if (!p) { $('#cs-err').textContent = L('ข้อมูลตัวละครเสียหาย', 'Character data is corrupted'); return; }
  Sound.ensure();
  Acct.data.active = i;
  startGame(p, false);
}
// บัญชีในเครื่องใหม่: ตัวละครที่เคยเล่นแบบไม่ล็อกอิน (ยังไม่อยู่ในบัญชีนี้) ย้ายเข้าได้
function csImportable() {
  if (!Online.local || !Online.loggedIn || !Acct.data) return [];
  return Acct.readLocal().chars.filter(c => !Acct.hasName(c.name));
}
async function csImport() {
  const imp = csImportable();
  for (const c of imp) {
    if (Acct.chars.length >= Acct.MAX) break;
    if (!(await Online.nameAvailable(c.name).catch(() => false))) continue;
    Acct.data.chars.push(c);
  }
  Acct.persist(true, true);
  showCharSel(Math.max(0, Acct.chars.length - 1));
}
// ลบตัวละคร: ต้องพิมพ์ชื่อตัวละครให้ตรงก่อนจึงกดลบได้ (กันลบโดยไม่ตั้งใจ)
function csAskDelete(i) {
  const c = Acct.chars[i]; if (!c) return;
  const box = $('#cs-confirm'); box.innerHTML = '';
  const inp = h('input', { type: 'text', maxlength: 16, autocomplete: 'off', spellcheck: 'false', placeholder: c.name, 'aria-label': L('พิมพ์ชื่อตัวละครเพื่อยืนยัน', 'Type the character name to confirm') });
  const del = h('button', { type: 'button', class: 'tbtn small danger', disabled: 'disabled', onclick: () => {
    if (inp.value.trim() !== c.name) return;
    Acct.remove(i);
    csConfirmClose();
    showCharSel(Math.min(i, Acct.chars.length - 1));
    $('#cs-err').textContent = L(`ลบ ${c.name} แล้ว`, `${c.name} was deleted.`);
  } }, L('ลบถาวร', 'Delete forever'));
  inp.addEventListener('input', () => { del.disabled = inp.value.trim() !== c.name; });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') del.click(); else if (e.key === 'Escape') csConfirmClose(); });
  box.append(
    h('div', { class: 'cs-cf-text' }, h('b', {}, L(`ลบ ${c.name}?`, `Delete ${c.name}?`)),
      h('span', {}, L(`${JOBS[csJob(c)].name} Base Lv ${c.baseLv || 1} — ไอเทม เงิน และความคืบหน้าทั้งหมดจะหายไป ย้อนกลับไม่ได้ พิมพ์ชื่อตัวละครเพื่อยืนยัน`, `${JOBS[csJob(c)].name} Base Lv ${c.baseLv || 1} — all items, zeny and progress will be lost. This cannot be undone. Type the character name to confirm.`))),
    inp,
    h('div', { class: 'cs-cf-btns' }, h('button', { type: 'button', class: 'tbtn small', onclick: () => csConfirmClose() }, 'Cancel'), del));
  box.classList.remove('hidden');
  $('#charsel').classList.add('confirming');
  inp.focus();
}
function csConfirmClose() {
  const box = $('#cs-confirm'); if (!box) return;
  box.classList.add('hidden'); box.innerHTML = '';
  $('#charsel').classList.remove('confirming');
}
function openCreate() {
  if (Acct.data && Acct.chars.length >= Acct.MAX) { $('#cs-err').textContent = L(`มีตัวละครครบ ${Acct.MAX} ช่องแล้ว — ลบตัวเก่าก่อนจึงจะสร้างใหม่ได้`, `All ${Acct.MAX} slots are full — delete a character first.`); return; }
  hideTitlePanels();
  if (Online.loggedIn) showAcctPill();
  $('#create').classList.remove('hidden'); $('#title').classList.add('creating');
  $('#cr-err').textContent = '';
  if (!matchMedia('(pointer: coarse)').matches) $('#cr-name').focus();
  Sound.ensure();
}
// ภาพตัวละครในหน้าเลือกตัวละคร: ตัวเต็ม (ตัวที่เลือก, เคลื่อนไหว) + รูปหน้าในแต่ละช่อง
function drawSelectPreview(t) {
  if ($('#charsel').classList.contains('hidden')) return;
  const c = $('#cs-preview'), g = c.getContext('2d'), fake = csFakes[csSel];
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, c.width, c.height);
  const cx = c.width / 2, by = c.height - 30, glow = (fake && fake.look && fake.look.glow) || '#7ad8ff';
  const rg = g.createRadialGradient(cx, by, 4, cx, by, 80);
  rg.addColorStop(0, U.rgba(glow, 0.4)); rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg; g.beginPath(); g.ellipse(cx, by, 80, 22, 0, 0, 7); g.fill();
  g.strokeStyle = glow; g.lineWidth = 1.5; g.globalAlpha = 0.75;
  g.beginPath(); g.ellipse(cx, by, 58, 14, 0, 0, 7); g.stroke();
  g.globalAlpha = 0.3; g.beginPath(); g.ellipse(cx, by, 70 + Math.sin(t * 2) * 4, 18, 0, 0, 7); g.stroke();
  g.globalAlpha = 1;
  if (fake) { g.save(); g.translate(cx, by); g.scale(3.2, 3.2); UnitPreview.draw(g, c, fake, t); g.restore(); }
  else { g.fillStyle = U.rgba(glow, 0.35); g.font = '600 64px sans-serif'; g.textAlign = 'center'; g.fillText('?', cx, by - 60); }
  // รูปหน้าในช่อง: วาดใหม่ทุก 1 วินาที (ภาพอาจโหลดเสร็จทีหลัง)
  if (t - csFaceAt < 1 && csFaceAt) return;
  csFaceAt = t;
  $$('#cs-list .cs-slot[data-i]').forEach(row => {
    const f = csFakes[+row.dataset.i], cv = $('canvas', row); if (!f || !cv) return;
    const fg = cv.getContext('2d'), W = cv.width, H = cv.height, gk = Anim.playerKey(f.job, f.gender);
    fg.setTransform(1, 0, 0, 1, 0, 0); fg.clearRect(0, 0, W, H);
    const bg = fg.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1c3450'); bg.addColorStop(1, '#070b14');
    fg.fillStyle = bg; fg.fillRect(0, 0, W, H);
    if (Anim.has(gk)) { Anim.drawFace(fg, gk, W, H); return; }
    const ak = Art.jobKey(f.job, f.gender);
    if (ak) { Art.drawFace(fg, Art.get(ak), W, H); return; }
    fg.save(); fg.translate(W / 2, H * 1.55); fg.scale(W / 40, W / 40);
    Sprites.drawPlayer(fg, Object.assign({}, f, { dir: 2 }), 0.2);
    fg.restore();
  });
}
// ในเกม (ตั้งค่า → เปลี่ยนตัวละคร): บันทึกให้เสร็จก่อน แล้วโหลดหน้าใหม่เข้าหน้าเลือกตัวละคร (ล้างสถานะโลก/ปาร์ตี้/เทรดทั้งหมด)
async function switchCharacter() {
  if (!G.started) return;
  saveGame(true, true);
  await Online.flushAll();
  G.started = false;
  try { sessionStorage.setItem('nm_charsel', Online.loggedIn ? 'acct' : 'offline'); } catch (e) { /* โหมดส่วนตัว */ }
  location.reload();
}
function setupCreateScreen() {
  UnitPreview.init($('#cr-preview'));
  // ย้อนกลับ = กลับไปหน้าเลือกตัวละคร (ออกจากระบบได้จากแถบบัญชีที่นั่น)
  $('#cr-back').onclick = () => showCharSel();
  const swatchRow = (sel, list, key) => {
    const el = $(sel); el.innerHTML = '';
    for (const c of list) {
      const b = h('button', { type: 'button', class: 'swatch' + (c === creation[key] ? ' on' : ''), style: `background:${c}`, 'aria-label': c, onclick: () => {
        creation[key] = c; $$('.swatch', el).forEach(x => x.classList.toggle('on', x === b));
      } });
      el.append(b);
    }
  };
  const segRow = (sel, list, key) => {
    const el = $(sel); el.innerHTML = '';
    for (const [v, label] of list) {
      const b = h('button', { type: 'button', class: v === creation[key] ? 'on' : '', onclick: () => { creation[key] = v; $$('button', el).forEach(x => x.classList.toggle('on', x === b)); } }, label);
      el.append(b);
    }
  };
  swatchRow('#cr-hair', HAIR_COLORS, 'hair'); swatchRow('#cr-color', BODY_COLORS, 'color'); swatchRow('#cr-glow', GLOW_COLORS, 'glow');
  segRow('#cr-head', HEAD_STYLES, 'head'); segRow('#cr-visor', VISORS, 'visor');
  $$('#cr-gender button').forEach(b => b.onclick = () => {
    creation.gender = b.dataset.g; $$('#cr-gender button').forEach(x => x.classList.toggle('on', x === b));
  });
  $('#cr-start').onclick = async () => {
    const name = $('#cr-name').value.trim().slice(0, 16);
    const err = $('#cr-err');
    if (!name) { err.textContent = L('กรุณาตั้งชื่อตัวละคร', 'Please name your character.'); return; }
    if (!Acct.data) Acct.data = Online.loggedIn ? Acct.wrap(null) : Acct.readLocal();
    if (Acct.chars.length >= Acct.MAX) { err.textContent = L(`มีตัวละครครบ ${Acct.MAX} ช่องแล้ว`, `All ${Acct.MAX} character slots are full.`); return; }
    // ชื่อซ้ำกับตัวละครอีกช่องในบัญชีเดียวกันไม่ได้
    if (Acct.hasName(name)) { err.textContent = L('มีตัวละครชื่อนี้ในบัญชีแล้ว ลองชื่ออื่น', 'You already have a character with that name. Try another.'); return; }
    if (Online.loggedIn) {
      err.textContent = L('กำลังตรวจสอบชื่อ...', 'Checking name...');
      try { if (!(await Online.nameAvailable(name))) { err.textContent = L('ชื่อตัวละครนี้มีคนใช้แล้ว ลองชื่ออื่น', 'That name is already taken. Try another.'); return; } }
      catch (e) { err.textContent = e.message; return; }
      if (G.started || Acct.chars.length >= Acct.MAX) return; // กดซ้ำระหว่างรอตรวจชื่อ
    }
    err.textContent = '';
    G.uid = 1;
    const p = newPlayer(name, creation.gender, creation.hair, creationLook());
    Acct.data.active = Acct.chars.length; // ช่องว่างถัดไป — startGame → saveGame เขียนลงช่องนี้
    startGame(p, true);
  };
  $('#cr-name').addEventListener('keydown', e => { if (e.key === 'Enter') $('#cr-start').click(); });
}
function creationLook() { return { head: creation.head, color: creation.color, glow: creation.glow, visor: creation.visor }; }
function drawTitlePreview(t) {
  const c = $('#cr-preview');
  if (!c || $('#create').classList.contains('hidden')) return;
  // มีโมเดลแบบภาพแล้ว: ซ่อนตัวเลือกสี/ทรงหัว/วิเซอร์ (มีผลเฉพาะโมเดลวาดด้วยโค้ด)
  const imgModel = Anim.has('novice_'+creation.gender) || Art.has('hero_novice_f') || Art.has('hero_novice_m');
  if ($('#create').classList.contains('img-model') !== imgModel) {
    $('#create').classList.toggle('img-model', imgModel);
    ['#cr-head', '#cr-hair', '#cr-color', '#cr-glow', '#cr-visor'].forEach(sel => { const el = $(sel); el.classList.toggle('hidden', imgModel); el.previousElementSibling.classList.toggle('hidden', imgModel); });
  }
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, c.width, c.height);
  // แท่นโฮโลแกรม
  const cx = c.width / 2, by = c.height - 30;
  const glow = creation.glow;
  const rg = g.createRadialGradient(cx, by, 4, cx, by, 80);
  rg.addColorStop(0, U.rgba(glow, 0.45)); rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg; g.beginPath(); g.ellipse(cx, by, 80, 22, 0, 0, 7); g.fill();
  g.strokeStyle = glow; g.lineWidth = 1.5; g.globalAlpha = 0.8;
  g.beginPath(); g.ellipse(cx, by, 58, 14, 0, 0, 7); g.stroke();
  g.globalAlpha = 0.35; g.beginPath(); g.ellipse(cx, by, 70 + Math.sin(t * 2) * 4, 18, 0, 0, 7); g.stroke();
  g.globalAlpha = 1;
  // เส้นสแกน
  const sy = by - ((t * 60) % 190);
  g.fillStyle = glow; g.globalAlpha = 0.12; g.fillRect(cx - 60, sy, 120, 2); g.globalAlpha = 1;
  g.save(); g.translate(cx, by); g.scale(3.2, 3.2);
  const fake = {
    x: 0, y: 0, job: 'novice', hair: creation.hair, gender: creation.gender, look: creationLook(), facing: 1, dir: creation.dir, moving: false, sitting: false, dead: false,
    atkAnim: 0, buffs: {}, equip: { weapon: { id: 'knife' }, head: null, garment: null },
  };
  UnitPreview.draw(g, c, fake, t);
  g.restore();
}

// รูปแบบ HUD: Visor แบบเดียว (เลิกตัวเลือกคลาสสิกแล้ว — เซฟเก่าที่ตั้ง classic ไว้ก็ใช้ Visor)
function applyHudStyle() {
  document.body.classList.add('visor');
  UI.dirty();
}
function startGame(p, isNew) {
  G.player = p;
  p.stunUntil = 0;
  applyHudStyle();
  G.started = true;
  $('#title').classList.add('leaving');
  setTimeout(() => { $('#title').classList.add('hidden'); $('#title').classList.remove('leaving', 'creating'); }, 650);
  $('#hud').classList.remove('hidden');
  R.setQuality(p.options.gfx);
  fpsWatch = { t0: performance.now() + 4000, n: 0, done: !!p.options.gfx };
  recalc();
  if (isNew) { p.hp = p.d.maxHp; p.sp = p.d.maxSp; }
  changeMap(p.map, p.x, p.y);
  UI.dirty(); UI.renderWindows(true); UI.updateHud();
  UI.msg(L(`ระบบออนไลน์... ยินดีต้อนรับสู่ IRON VALHALLA, ${p.name}!`, `Systems online... Welcome to IRON VALHALLA, ${p.name}!`), 'lvl');
  if (Online.online) { Online.joinChat(); UI.setNet('ok'); UI.msg(L(`🌐 ออนไลน์ในชื่อบัญชี ${Online.username} — กด Enter เพื่อแชทกับทุกคน`, `🌐 Online as ${Online.username} — press Enter to chat with everyone.`), 'sys'); }
  else if (Online.loggedIn) UI.msg(L(`🔑 เข้าสู่ระบบเป็น ${Online.username} — ตัวละครบันทึกแยกตามบัญชีในเครื่องนี้`, `🔑 Logged in as ${Online.username} — characters are saved per account on this device.`), 'sys');
  UI.msg(L('กด H เพื่อดูวิธีเล่น • คุยกับ Guard Unit Rolf (หุ่นหมวกเขา) เพื่อขอคำแนะนำ', 'Press H for the guide • Talk to Guard Unit Rolf (the horned-helm android) for advice.'), 'info');
  if (isNew) {
    UI.open('w-help');
    UI.msg(L('เคล็ดลับ: เริ่มต้นด้วยการแจก Status Point (กด A) แล้วออกไปล่า Gel Unit ทางตะวันออกของเมือง', 'Tip: Start by spending your Status Points (press A), then hunt Gel Units east of town.'), 'info');
  }
  saveGame(true, true); // บันทึกทันที: ช่องตัวละคร + ชื่อในแถวบัญชี (แชทใช้ชื่อนี้) เป็นตัวที่เพิ่งเลือก
  if (typeof Story !== 'undefined') Story.onStart(p, isNew); // บทนำ (บทที่ 0) ครั้งแรกที่เข้าโลก
}

window.addEventListener('load', () => {
  document.body.classList.add('visor'); // HUD แบบ Visor เป็นค่าเริ่มต้น (หน้าเว็บที่ไม่มีแท็ก <body> ของเราเองก็ได้)
  R.init();
  Art.load();
  Online.init();
  UI.init();
  Title.init();
  Pad.init();
  bindInput();
  showTitle();
  setInterval(() => saveGame(), 30000);
  // แท็บถูกซ่อน: requestAnimationFrame หยุด แต่บอทยังทำงานต่อผ่าน timer
  setInterval(() => { if (document.hidden && G.started) advanceSim(); }, 1000);
  window.addEventListener('beforeunload', () => { saveGame(true, true); Online.flushSave(); });
  // สลับแอป/ล็อกจอ: เซฟทันที (ไม่รอหน่วง 4 วิ) — มือถือมักปิดแอปที่อยู่เบื้องหลังโดยไม่บอก
  document.addEventListener('visibilitychange', () => { if (document.hidden) { saveGame(true, true); Online.flushSave(); Music.stop(); } });
  requestAnimationFrame(loop);
});
