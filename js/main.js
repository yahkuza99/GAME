'use strict';
// ============================================================
//  จุดเริ่มต้น: หน้าไตเติล, สร้างตัวละคร, ลูปเกม, การควบคุม
// ============================================================

const HAIR_COLORS = ['#3a2a1a', '#8a4a2a', '#e0b050', '#c83a3a', '#3a5ac8', '#e8e8f0', '#5aa04a', '#d070b0'];
const creation = { gender: 'm', hair: HAIR_COLORS[2] };

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
  playerWalkTo(tx, ty);
  addFx({ type: 'click', x: (tx + 0.5), y: (ty + 0.5), dur: 0.4 });
}

function bindInput() {
  const cv = R.cv;
  cv.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    Sound.ensure();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    updateMouse(e);
    R.mouse.down = true;
    R.mouse.holdAt = G.time + 0.35;
    handleClick();
  });
  cv.addEventListener('pointermove', e => updateMouse(e));
  cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') R.mouse.x = -1; });
  window.addEventListener('pointerup', () => { R.mouse.down = false; });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    R.zoom = U.clamp(R.zoom * (e.deltaY > 0 ? 0.9 : 1.1), 0.6, 1.8);
  }, { passive: false });

  window.addEventListener('keydown', e => {
    if (!G.started) return;
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const k = e.key.toLowerCase();
    if (k >= '1' && k <= '9') { useHotbar(+k - 1); return; }
    if (/^f[1-9]$/.test(k)) { e.preventDefault(); useHotbar(+k.slice(1) - 1); return; }
    switch (k) {
      case 'a': UI.toggle('w-status'); break;
      case 'e': case 'i': UI.toggle('w-inv'); break;
      case 'q': UI.toggle('w-equip'); break;
      case 's': case 'k': UI.toggle('w-skills'); break;
      case 'o': UI.toggle('w-options'); break;
      case 'h': UI.toggle('w-help'); break;
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
let lastTs = 0, hudAcc = 0;
function loop(ts) {
  const dt = Math.min(0.05, lastTs ? (ts - lastTs) / 1000 : 0);
  lastTs = ts;
  if (G.started) {
    updateHover();
    updateGame(dt);
    const p = G.player;
    // กดค้างเพื่อเดินตามเมาส์
    if (R.mouse.down && !p.target && !p.npcTarget && !p.pickTarget && !p.skillIntent && !p.dead && !G.hover && G.time >= R.mouse.holdAt) {
      R.mouse.holdAt = G.time + 0.2;
      playerWalkTo(Math.floor(R.mouse.wx / TILE), Math.floor(R.mouse.wy / TILE));
    }
    R.render();
    UI.renderWindows();
    hudAcc += dt;
    if (hudAcc > 0.08) { hudAcc = 0; UI.updateHud(); }
  } else {
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
function showTitle() {
  const s = peekSave();
  const cont = $('#btn-continue');
  if (s && s.name) {
    cont.classList.remove('hidden');
    cont.innerHTML = `เล่นต่อ<small>${U.esc(s.name)} • ${JOBS[s.job] ? JOBS[s.job].name : ''} Lv ${s.baseLv}</small>`;
  }
  $('#btn-new').onclick = () => { $('#title-menu').classList.add('hidden'); $('#create').classList.remove('hidden'); $('#cr-name').focus(); Sound.ensure(); };
  cont.onclick = () => {
    const p = loadGame();
    if (!p) { alert('ไม่สามารถโหลดเซฟได้'); return; }
    startGame(p, false);
  };
  $('#cr-back').onclick = () => { $('#create').classList.add('hidden'); $('#title-menu').classList.remove('hidden'); };
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
  $('#cr-start').onclick = () => {
    const name = $('#cr-name').value.trim().slice(0, 16);
    if (!name) { $('#cr-err').textContent = 'กรุณาตั้งชื่อตัวละคร'; return; }
    if (s && s.name && !confirm('มีเซฟเดิมอยู่ การสร้างตัวละครใหม่จะเขียนทับเซฟเดิม ต้องการดำเนินการต่อหรือไม่?')) return;
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
  UI.msg(`ยินดีต้อนรับสู่มิดการ์ด, ${p.name}! แร็กนาร็อกกำลังใกล้เข้ามา...`, 'lvl');
  UI.msg('กด H เพื่อดูวิธีเล่น • คุยกับ Guard Rolf (ทหารหมวกเขา) เพื่อขอคำแนะนำ', 'info');
  if (isNew) {
    UI.open('w-help');
    UI.msg('เคล็ดลับ: เริ่มต้นด้วยการแจก Status Point (กด A) แล้วออกไปล่า Pudding ทางตะวันออกของเมือง', 'info');
  }
  saveGame();
}

window.addEventListener('load', () => {
  R.init();
  UI.init();
  bindInput();
  showTitle();
  setInterval(() => saveGame(), 30000);
  window.addEventListener('beforeunload', () => saveGame());
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
  requestAnimationFrame(loop);
});
