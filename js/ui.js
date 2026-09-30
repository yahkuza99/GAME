'use strict';
// ============================================================
//  UI: หน้าต่าง NEO MIDGARD, แชท, ฮอตบาร์, ร้านค้า, บทสนทนา NPC
// ============================================================

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const k in attrs) {
    if (k === 'class') el.className = attrs[k];
    else if (k === 'html') el.innerHTML = attrs[k];
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] !== false && attrs[k] != null) el.setAttribute(k, attrs[k]);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
}

const UI = {
  isDirty: true, z: 100, invTab: 'use', selItem: null, shop: null, dialog: null,

  init() {
    this.buildHotbar();
    this.buildMenu();
    this.initFolds();
    for (const w of $$('.win')) this.makeWindow(w);
    $('#chat-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const v = e.target.value.trim();
        e.target.value = '';
        if (v) this.chat(v);
        e.target.blur();
        e.stopPropagation();
      } else if (e.key === 'Escape') e.target.blur();
      e.stopPropagation();
    });
    $('#chat-log').addEventListener('click', () => { const c = $('#chat'); if (c.classList.contains('folded')) this.setFold(c, false); });
    $('#death-btn').onclick = () => respawnPlayer();
    $('#nav-cancel').onclick = () => Nav.cancel();
    // มือถือ: ปุ่มแชทเปิดช่องพิมพ์แบบลอย ปิดเมื่อส่งหรือแตะที่อื่น
    $('#chat-btn').onclick = () => { const c = $('#chat'); c.classList.toggle('typing'); if (c.classList.contains('typing')) $('#chat-input').focus(); };
    $('#chat-input').addEventListener('blur', () => setTimeout(() => $('#chat').classList.remove('typing'), 150));
    $('#auto-btn').onclick = () => Bot.toggle();
    this.bindMapClick($('#minimap-cv'));
    this.bindMapClick($('#bigmap-cv'));
    $('#map-open').onclick = () => this.toggle('w-map');
    $$('#zoom-ctl button').forEach(b => b.onclick = () => { R.zoom = U.clamp(R.zoom * +b.dataset.zoom, R.ZMIN, R.ZMAX); });
  },

  // ---------------- HUD พับได้ ----------------
  foldState() {
    try { return JSON.parse(localStorage.getItem('nm_hud') || '{}'); } catch (e) { return {}; }
  },
  saveFold(st) { try { localStorage.setItem('nm_hud', JSON.stringify(st)); } catch (e) { /* ไม่เป็นไร */ } },
  initFolds() {
    const st = this.foldState();
    const menu = $('#menubar');
    const mf = h('button', { class: 'fold-btn menu-fold', title: 'เมนู (Tab)', 'aria-label': 'เปิดหรือปิดเมนู' });
    mf.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
    menu.prepend(mf);
    // จอเล็ก/จอสัมผัส: เริ่มต้นพับเมนูและแชทไว้ให้เห็นเกมเต็ม ๆ
    const small = matchMedia('(pointer: coarse)').matches || innerWidth < 760 || innerHeight < 520;
    if (small) { if (st.menu === undefined) st.menu = true; if (st.chat === undefined) st.chat = true; }
    $$('.foldable').forEach(p => {
      if (st[p.dataset.fold]) p.classList.add('folded');
      const b = $('.fold-btn', p);
      b.addEventListener('click', e => { e.stopPropagation(); this.setFold(p, !p.classList.contains('folded')); });
    });
    if (st.all) $('#hud').classList.add('hud-min');
    $('#hud-toggle').onclick = () => this.toggleHud();
  },
  setFold(p, on) {
    p.classList.toggle('folded', on);
    const st = this.foldState(); st[p.dataset.fold] = on; this.saveFold(st);
    Sound.play('click');
  },
  toggleMenu() { const m = $('#menubar'); this.setFold(m, !m.classList.contains('folded')); },
  toggleHud() {
    const on = !$('#hud').classList.contains('hud-min');
    $('#hud').classList.toggle('hud-min', on);
    const st = this.foldState(); st.all = on; this.saveFold(st);
    this.msg(on ? 'ซ่อน HUD แล้ว (กด U หรือปุ่ม ◉ เพื่อแสดง)' : 'แสดง HUD', 'info');
  },

  // ---------------- หน้าต่าง ----------------
  makeWindow(w) {
    const bar = $('.win-title', w);
    if (bar && !$('.win-x', bar) && !w.dataset.noclose) {
      bar.append(h('button', { class: 'win-x', title: 'ปิด (Esc)', onclick: () => this.close(w.id) }, '×'));
    }
    w.addEventListener('pointerdown', () => { w.style.zIndex = ++this.z; });
    if (!bar) return;
    let sx, sy, ox, oy, drag = false;
    bar.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      drag = true; sx = e.clientX; sy = e.clientY;
      const r = w.getBoundingClientRect(); ox = r.left; oy = r.top;
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener('pointermove', e => {
      if (!drag) return;
      w.style.left = U.clamp(ox + e.clientX - sx, 0, innerWidth - 60) + 'px';
      w.style.top = U.clamp(oy + e.clientY - sy, 0, innerHeight - 30) + 'px';
      w.style.right = 'auto'; w.style.bottom = 'auto'; w.style.transform = 'none';
    });
    bar.addEventListener('pointerup', () => { drag = false; });
  },
  toggle(id) { const w = $('#' + id); if (w.classList.contains('hidden')) this.open(id); else this.close(id); },
  open(id) {
    const w = $('#' + id);
    w.classList.remove('hidden'); w.style.zIndex = ++this.z;
    this.dirty(); this.renderWindows(true);
    Sound.play('click');
  },
  close(id) {
    const w = $('#' + id);
    if (!w || w.classList.contains('hidden')) return false;
    w.classList.add('hidden');
    if (id === 'w-dialog' && this.dialog) { const d = this.dialog; this.dialog = null; d.reject('closed'); }
    if (id === 'w-shop') this.shop = null;
    return true;
  },
  closeTop() {
    const open = $$('.win').filter(w => !w.classList.contains('hidden'));
    if (!open.length) return false;
    open.sort((a, b) => (+b.style.zIndex || 0) - (+a.style.zIndex || 0));
    return this.close(open[0].id);
  },
  isOpen(id) { return !$('#' + id).classList.contains('hidden'); },
  dirty() { this.isDirty = true; },

  // ---------------- ข้อความ ----------------
  msg(text, cls = 'sys') {
    const log = $('#chat-log');
    log.append(h('div', { class: 'cl ' + cls }, text));
    while (log.children.length > 120) log.firstChild.remove();
    log.scrollTop = log.scrollHeight;
  },
  announce(text) {
    const el = $('#announce');
    el.textContent = text;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  },
  chat(text) {
    const p = G.player;
    if (text.startsWith('/')) {
      const cmd = text.slice(1).toLowerCase();
      if (cmd === 'sit') toggleSit();
      else if (cmd === 'where') this.msg(`${G.map.def.name} (${Math.floor(p.x)}, ${Math.floor(p.y)})`, 'info');
      else if (cmd === 'save') saveGame(false);
      else if (cmd === 'autoloot') { p.options.autoLoot = !p.options.autoLoot; this.msg(`Auto Loot: ${p.options.autoLoot ? 'เปิด' : 'ปิด'}`, 'info'); }
      else if (cmd === 'help') this.open('w-help');
      else this.msg('คำสั่ง: /sit /where /save /autoloot /help', 'info');
      return;
    }
    this.msg(`${p.name} : ${text}`, 'say');
    p.speech = { text, until: G.time + 5 };
    Online.sendChat(text);
  },

  // ---------------- HUD ----------------
  onMapChange(map) {
    this.close('w-dialog'); this.close('w-shop');
    $('#map-name').textContent = map.def.name;
    this.announceMap(map);
    this.msg(`เข้าสู่ ${map.def.name} — ${map.def.thai}${map.def.level ? ` (มอนสเตอร์ Lv ${map.def.level})` : ''}`, 'map');
  },
  announceMap(map) {
    const el = $('#map-banner');
    const art = Art.get('map_' + map.id);
    el.innerHTML = `<div class="mb-en">${U.esc(map.def.name)}</div><div class="mb-th">${U.esc(map.def.thai)}</div>`;
    el.classList.toggle('has-img', !!art);
    el.style.backgroundImage = art ? `url("${art.src}")` : '';
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  },
  updateHud() {
    const p = G.player, d = p.d;
    $('#bi-name').textContent = p.name;
    this.drawPortrait();
    $$('#menubar [data-win]').forEach(b => b.classList.toggle('on', this.isOpen(b.dataset.win)));
    const em = Art.get('emblem_' + p.job), jobHtml = (em ? `<img src="${em.src}" alt="">` : '') + U.esc(JOBS[p.job].name);
    if ($('#bi-job').innerHTML !== jobHtml) $('#bi-job').innerHTML = jobHtml;
    this.updateTarget();
    const bNeed = baseExpNeed(p.baseLv), jNeed = jobExpNeed(p.job, p.jobLv);
    const bk = p.baseLv >= MAX_BASE_LV ? 1 : p.baseExp / bNeed, jk = p.jobLv >= JOBS[p.job].jobMax ? 1 : p.jobExp / jNeed;
    $('#bi-blv').textContent = p.baseLv; $('#bi-jlv').textContent = p.jobLv;
    $('#bi-lvbadge').textContent = p.baseLv;
    $('#bi-bexp').style.width = (bk * 100).toFixed(1) + '%';
    $('#bi-jexp').style.width = (jk * 100).toFixed(1) + '%';
    $('#bi-bexp-t').textContent = (bk * 100).toFixed(1) + '%';
    $('#bi-jexp-t').textContent = (jk * 100).toFixed(1) + '%';
    $('#bi-hp').style.width = (p.hp / d.maxHp * 100) + '%';
    $('#bi-sp').style.width = (p.sp / d.maxSp * 100) + '%';
    $('#bi-hp').classList.toggle('low', p.hp / d.maxHp < 0.25);
    $('#bi-hp-t').textContent = `${Math.floor(p.hp)} / ${d.maxHp}`;
    $('#bi-sp-t').textContent = `${Math.floor(p.sp)} / ${d.maxSp}`;
    const zi = Art.get('item_zeny'), zHtml = (zi ? `<img src="${zi.src}" alt="">` : '') + U.fmt(p.zeny) + ' z';
    const ze = $('#bi-zeny');
    if (ze.innerHTML !== zHtml) { ze.innerHTML = zHtml; ze.classList.toggle('has-ic', !!zi); }
    const pts = [];
    if (p.statPoints > 0) pts.push(`<span class="pt" data-open="w-status">Status +${p.statPoints}</span>`);
    if (p.skillPoints > 0) pts.push(`<span class="pt" data-open="w-skills">Skill +${p.skillPoints}</span>`);
    const ptsHtml = pts.join(' ');
    const ptsEl = $('#bi-points');
    if (ptsEl.innerHTML !== ptsHtml) ptsEl.innerHTML = ptsHtml;
    // บัฟ
    const buffs = Object.keys(p.buffs).map(k => {
      const left = Math.ceil(p.buffs[k].until - G.time);
      return `<div class="buff" style="--c:${SKILLS[k].icon}" title="${SKILLS[k].name}"><b>${SKILLS[k].glyph}</b><i>${left}</i></div>`;
    });
    if (p.poisonUntil > G.time) buffs.push(`<div class="buff" style="--c:#a050e0" title="Poison"><b>☠</b><i>${Math.ceil(p.poisonUntil - G.time)}</i></div>`);
    const bh = buffs.join('');
    const be = $('#buffs');
    if (be.innerHTML !== bh) be.innerHTML = bh;
    // ฮอตบาร์ (จำนวน/คูลดาวน์)
    $$('#hotbar .hb, #potbar .hb').forEach(el => {
      const hb = p[el.dataset.bar][+el.dataset.i];
      const cd = $('.cd', el);
      if (hb && hb.t === 'skill') {
        const left = p.skillReadyAt - G.time;
        cd.style.height = left > 0 ? '100%' : '0';
        el.classList.toggle('nosp', p.sp < skillCost(hb.id, skillLv(hb.id)));
      } else { cd.style.height = '0'; el.classList.remove('nosp'); }
      if (hb && hb.t === 'item') { const q = $('.q', el); const c = countItem(hb.id); if (q.textContent !== String(c)) q.textContent = c; el.classList.toggle('empty', c === 0); }
    });
    // มินิแมพ + บอท
    this.drawMinimap();
    this.updateBotButton();
    if (this.isOpen('w-bot')) this.updateBotStats();
  },
  // กรอบเป้าหมาย (มอนที่กำลังตี / ชี้อยู่)
  updateTarget() {
    const p = G.player, el = $('#target');
    let t = p.target || (p.skillIntent && p.skillIntent.tgt) || (G.hover && G.hover.kind === 'mob' ? G.hover.ref : null);
    if (!t || t.dead) { if (!el.hidden) el.hidden = true; return; }
    el.hidden = false;
    el.classList.toggle('boss', !!t.isMvp);
    $('#tg-name').textContent = t.def.name;
    $('#tg-lv').textContent = `Lv ${t.def.lv}`;
    $('#tg-hp').style.width = (t.hp / t.maxHp * 100) + '%';
    $('#tg-hp-t').textContent = `${Math.max(0, Math.ceil(t.hp))} / ${t.maxHp}`;
    const cv = $('#tg-cv');
    if (cv.dataset.key === t.def.id) return;
    cv.dataset.key = t.def.id;
    const g = cv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    const art = Art.get('mob_' + t.def.id), spr = Art.get('mobsprite_' + t.def.id);
    if (spr) {
      const bg2 = g.createRadialGradient(cv.width / 2, cv.height * 0.45, 2, cv.width / 2, cv.height / 2, cv.width * 0.7);
      bg2.addColorStop(0, '#3a2430'); bg2.addColorStop(1, '#0a0f1a'); g.fillStyle = bg2; g.fillRect(0, 0, cv.width, cv.height);
      const k = Math.min(cv.width / spr.width, cv.height / spr.height) * 0.92;
      g.drawImage(spr, (cv.width - spr.width * k) / 2, (cv.height - spr.height * k) / 2, spr.width * k, spr.height * k);
      return;
    }
    if (art && HUMANOID_MOBS.includes(t.def.id)) { Art.drawCover(g, art, cv.width, cv.height, 0.2); return; }
    const bg = g.createRadialGradient(cv.width / 2, cv.height * 0.4, 2, cv.width / 2, cv.height / 2, cv.width * 0.7);
    bg.addColorStop(0, U.rgba((t.def.look && t.def.look.glow) || '#ff6a6a', 0.5)); bg.addColorStop(1, '#0a0f1a');
    g.fillStyle = bg; g.fillRect(0, 0, cv.width, cv.height);
    const sc = cv.width / 34 / (t.def.scale || 1);
    g.save(); g.translate(cv.width / 2, cv.height * 1.45); g.scale(sc, sc);
    Sprites.drawMob(g, { def: t.def, x: 0, y: 0, facing: 1, dir: 2, moving: false, seed: 0.3, state: 'idle', hp: 1, maxHp: 1, atkAnim: 0 }, 0.2);
    g.restore();
  },
  // วาดแผนที่ลงแคนวาส (ใช้ทั้งมินิแมพและแผนที่ใหญ่) — ใช้ภาพพื้นจริงย่อส่วน
  mapImage(map, px) {
    map._imgs = map._imgs || {};
    if (!map._imgs[px]) {
      const c = document.createElement('canvas'); c.width = map.w * px; c.height = map.h * px;
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
      g.drawImage(map.ground, 0, 0, c.width, c.height);
      // ต้นไม้เป็นจุดเขียวเข้ม
      g.fillStyle = map.def.pine ? 'rgba(30,70,35,0.9)' : 'rgba(40,95,40,0.9)';
      for (const o of map.objects) { g.beginPath(); g.arc(o.x * px, o.y * px, px * 0.62, 0, 7); g.fill(); }
      for (const b of map.buildings) if (b.img) { g.fillStyle = '#4a5468'; g.fillRect(b.x * px, b.y * px, b.w * px, b.h * px); g.fillStyle = b.roof || '#6ad8ff'; g.fillRect(b.x * px, b.y * px, b.w * px, Math.max(1, px * 0.6)); }
      if (map.fountainImg) { g.fillStyle = '#5ad0f0'; g.beginPath(); g.arc(map.fountain.x * px, map.fountain.y * px, px * 1.3, 0, 7); g.fill(); }
      map._imgs[px] = c;
    }
    return map._imgs[px];
  },
  drawMapTo(cv, S, big) {
    const g = cv.getContext('2d'), map = G.map, p = G.player;
    if (cv.width !== map.w * S) { cv.width = map.w * S; cv.height = map.h * S; }
    g.drawImage(this.mapImage(map, S), 0, 0);
    // เส้นทางที่กำลังเดิน
    if (p.path.length) {
      g.strokeStyle = 'rgba(255,236,140,0.9)'; g.lineWidth = big ? 2 : 1.2; g.setLineDash([3, 3]);
      g.beginPath(); g.moveTo(p.x * S, p.y * S);
      for (const n of p.path) g.lineTo((n.x + 0.5) * S, (n.y + 0.5) * S);
      g.stroke(); g.setLineDash([]);
      const last = p.path[p.path.length - 1];
      g.fillStyle = '#ffe36a'; g.beginPath(); g.arc((last.x + 0.5) * S, (last.y + 0.5) * S, big ? 5 : 3, 0, 7); g.fill();
    }
    for (const pt of map.portals) {
      const r = big ? 6 : 3.5;
      g.fillStyle = '#7fe0ff'; g.strokeStyle = '#0a3a5a'; g.lineWidth = 1.5;
      g.beginPath(); g.arc((pt.x + 0.5) * S, (pt.y + 0.5) * S, r, 0, 7); g.fill(); g.stroke();
      if (big) {
        const name = MAP_DEFS[pt.to].name;
        g.font = 'bold 12px "Noto Sans Thai", sans-serif'; g.textAlign = pt.x < 3 ? 'left' : pt.x > map.w - 4 ? 'right' : 'center';
        const ly = pt.y < 3 ? (pt.y + 2) * S : pt.y > map.h - 4 ? (pt.y - 1) * S : (pt.y + 0.5) * S - 10;
        const lx = pt.x < 3 ? (pt.x + 1.5) * S : pt.x > map.w - 4 ? (pt.x - 0.5) * S : (pt.x + 0.5) * S;
        g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.75)'; g.strokeText('➜ ' + name, lx, ly);
        g.fillStyle = '#bff0ff'; g.fillText('➜ ' + name, lx, ly);
      }
    }
    for (const n of G.npcs) {
      g.fillStyle = '#ffd84a'; g.strokeStyle = '#5a3a00'; g.lineWidth = 1;
      g.beginPath(); g.arc((n.x + 0.5) * S, (n.y + 0.5) * S, big ? 4 : 2.2, 0, 7); g.fill(); g.stroke();
      if (big) { g.font = '11px "Noto Sans Thai", sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.7)'; g.strokeText(n.name, (n.x + 0.5) * S, (n.y + 0.5) * S - 8); g.fillStyle = '#fff4c0'; g.fillText(n.name, (n.x + 0.5) * S, (n.y + 0.5) * S - 8); }
    }
    for (const m of G.mobs) {
      if (m.dead) continue;
      if (m.isMvp) { g.fillStyle = (Math.floor(G.time * 4) % 2) ? '#ff2020' : '#ffffff'; g.beginPath(); g.arc(m.x * S, m.y * S, big ? 7 : 4, 0, 7); g.fill(); }
      else if (big || m.state === 'chase') { g.fillStyle = m.state === 'chase' ? '#ff5050' : 'rgba(255,170,170,0.8)'; g.beginPath(); g.arc(m.x * S, m.y * S, big ? 2.5 : 1.3, 0, 7); g.fill(); }
    }
    for (const o of Online.others.values()) { g.fillStyle = '#7dffb0'; g.beginPath(); g.arc(o.x * S, o.y * S, big ? 4 : 2.5, 0, 7); g.fill(); }
    // ผู้เล่น: ลูกศรชี้ทิศ
    const ang = (p.dir != null ? p.dir : 2) * Math.PI / 4, pr = big ? 8 : 5;
    g.save(); g.translate(p.x * S, p.y * S); g.rotate(ang);
    g.fillStyle = '#ffffff'; g.strokeStyle = '#c01818'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(pr, 0); g.lineTo(-pr * 0.7, pr * 0.65); g.lineTo(-pr * 0.35, 0); g.lineTo(-pr * 0.7, -pr * 0.65); g.closePath(); g.fill(); g.stroke();
    g.restore();
  },
  // เรดาร์วงกลม: ตัดภาพแผนที่รอบตัวผู้เล่น (ผู้เล่นอยู่กลางเสมอ)
  drawMinimap() {
    const p = G.player, cv = $('#minimap-cv');
    const S = 4, full = this._mmFull || (this._mmFull = document.createElement('canvas'));
    this.drawMapTo(full, S, false);
    const g = cv.getContext('2d'), W = cv.width, H = cv.height;
    const span = W / S * (innerWidth < 760 ? 1.15 : 1); // จำนวนช่องที่เห็น
    const x0 = p.x - span / 2, y0 = p.y - span / 2;
    this._mmView = { x0, y0, span };
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, H);
    g.save();
    g.beginPath(); g.arc(W / 2, H / 2, W / 2, 0, 7); g.clip();
    g.fillStyle = '#060a12'; g.fillRect(0, 0, W, H);
    g.imageSmoothingEnabled = true;
    g.drawImage(full, x0 * S, y0 * S, span * S, span * S, 0, 0, W, H);
    // โทนเรดาร์ + เส้นกริด
    g.fillStyle = 'rgba(10,30,50,0.28)'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(120,220,255,0.12)'; g.lineWidth = 1;
    for (let r = W / 6; r < W / 2; r += W / 6) { g.beginPath(); g.arc(W / 2, H / 2, r, 0, 7); g.stroke(); }
    g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
    // คลื่นกวาด
    const sw = (G.time * 1.2) % (Math.PI * 2);
    const grad = g.createConicGradient ? g.createConicGradient(sw, W / 2, H / 2) : null;
    if (grad) {
      grad.addColorStop(0, 'rgba(120,230,255,0.22)'); grad.addColorStop(0.12, 'rgba(120,230,255,0)'); grad.addColorStop(1, 'rgba(120,230,255,0)');
      g.fillStyle = grad; g.fillRect(0, 0, W, H);
    }
    g.restore();
    $('#map-coord').textContent = Online.online ? `👥 ${Math.max(1, Online.count)} • ${Math.floor(p.x)}, ${Math.floor(p.y)}` : `${Math.floor(p.x)}, ${Math.floor(p.y)}`;
    if (this.isOpen('w-map')) this.drawMapTo($('#bigmap-cv'), 8, true);
  },
  // คลิกบนแผนที่เพื่อเดินไปยังจุดนั้น
  bindMapClick(cv) {
    cv.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      if (!G.started || G.player.dead) return;
      const r = cv.getBoundingClientRect();
      const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
      let tx, ty;
      if (cv.id === 'minimap-cv' && this._mmView) { const v = this._mmView; tx = Math.floor(v.x0 + fx * v.span); ty = Math.floor(v.y0 + fy * v.span); }
      else { tx = Math.floor(fx * G.map.w); ty = Math.floor(fy * G.map.h); }
      if (cv.id === 'bigmap-cv') {
        // แตะใกล้ NPC / ประตู บนแผนที่ใหญ่ = นำทางไปที่นั่น
        const near = (x, y) => Math.abs(x - tx) <= 1 && Math.abs(y - ty) <= 1;
        const n = G.npcs.find(n => near(n.x, n.y));
        if (n) { Nav.goTo({ kind: 'npc', map: G.map.id, x: n.x, y: n.y, name: n.name, npcId: n.id }); return; }
        const pt = G.map.portals.find(q => near(q.x, q.y));
        if (pt) { Nav.goTo({ kind: 'map', map: pt.to, name: MAP_DEFS[pt.to].name }); return; }
      }
      mapWalkTo(tx, ty);
    });
  },

  // ---------------- แถบสกิล (8) + แถบไอเทม (4) ----------------
  // bar: 'hotbar' = สกิลเท่านั้น, 'potbar' = ไอเทมเท่านั้น
  BARS: { hotbar: { n: 8, t: 'skill', keys: ['1', '2', '3', '4', '5', '6', '7', '8'] }, potbar: { n: 4, t: 'item', keys: ['Z', 'C', 'V', 'F'] } },
  buildHotbar() {
    for (const bar of ['hotbar', 'potbar']) {
      const cfg = this.BARS[bar], root = $('#' + bar);
      for (let i = 0; i < cfg.n; i++) {
        const el = h('div', { class: 'hb', 'data-i': i, 'data-bar': bar, title: `ปุ่มลัด ${cfg.keys[i]}` },
          h('div', { class: 'ic' }), h('span', { class: 'k' }, cfg.keys[i]), h('span', { class: 'q' }), h('div', { class: 'cd' }));
        const use = () => (bar === 'hotbar' ? useHotbar(i) : usePotbar(i));
        const clear = () => { if (G.player[bar][i]) { G.player[bar][i] = null; this.msg(`ล้างปุ่มลัด ${cfg.keys[i]}`, 'info'); this.dirty(); } };
        let lpTimer = null, lpFired = false;
        el.addEventListener('pointerdown', e => {
          e.stopPropagation();
          if (e.pointerType === 'mouse') return;
          lpFired = false;
          el.classList.add('press');
          lpTimer = setTimeout(() => { lpFired = true; clear(); }, 650);
        });
        const cancelLp = () => { clearTimeout(lpTimer); el.classList.remove('press'); };
        el.addEventListener('pointerup', cancelLp); el.addEventListener('pointerleave', cancelLp); el.addEventListener('pointercancel', cancelLp);
        el.addEventListener('click', () => { if (lpFired) { lpFired = false; return; } use(); });
        el.addEventListener('contextmenu', e => { e.preventDefault(); clear(); });
        el.addEventListener('dragover', e => e.preventDefault());
        el.addEventListener('drop', e => {
          e.preventDefault();
          try {
            const d = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (d.t !== cfg.t) { this.msg(cfg.t === 'skill' ? 'แถบนี้สำหรับสกิลเท่านั้น' : 'แถบนี้สำหรับไอเทมเท่านั้น', 'err'); return; }
            G.player[bar][i] = { t: d.t, id: d.id };
            if (d.bar === bar && d.from != null && d.from !== i) G.player[bar][d.from] = null;
            this.dirty();
          } catch (err) { /* ignore */ }
        });
        el.draggable = true;
        el.addEventListener('dragstart', e => {
          const x = G.player[bar][i];
          if (!x) { e.preventDefault(); return; }
          e.dataTransfer.setData('text/plain', JSON.stringify({ t: x.t, id: x.id, from: i, bar }));
        });
        root.append(el);
      }
    }
  },
  renderHotbar() {
    const p = G.player;
    $$('#hotbar .hb, #potbar .hb').forEach(el => {
      const bar = el.dataset.bar, i = +el.dataset.i, key = this.BARS[bar].keys[i];
      const x = p[bar][i];
      const ic = $('.ic', el), q = $('.q', el);
      ic.innerHTML = ''; q.textContent = ''; el.title = `ปุ่มลัด ${key}`;
      el.classList.remove('empty'); el.classList.toggle('blank', !x);
      if (x && x.t === 'skill' && !skillLv(x.id)) { p[bar][i] = null; el.classList.add('blank'); return; }
      if (!x) return;
      if (x.t === 'skill') {
        ic.append(this.skillIcon(x.id));
        q.textContent = 'Lv' + skillLv(x.id);
        el.title = `${SKILLS[x.id].name} Lv ${skillLv(x.id)} [${key}]`;
      } else {
        ic.append(h('img', { src: itemIconUrl(x.id), alt: '' }));
        q.textContent = countItem(x.id);
        el.title = `${ITEMS[x.id].name} [${key}]`;
      }
    });
  },
  assignHotbar(t, id) {
    const p = G.player, bar = t === 'skill' ? 'hotbar' : 'potbar', keys = this.BARS[bar].keys;
    if (p[bar].some(x => x && x.t === t && x.id === id)) { this.msg('อยู่ในปุ่มลัดแล้ว', 'info'); return; }
    const i = p[bar].findIndex(x => !x);
    if (i < 0) { this.msg(t === 'skill' ? 'แถบสกิลเต็ม (แตะค้าง/คลิกขวาที่ช่องเพื่อลบ)' : 'แถบไอเทมเต็ม (แตะค้าง/คลิกขวาที่ช่องเพื่อลบ)', 'err'); return; }
    p[bar][i] = { t, id };
    this.msg(`ตั้งปุ่มลัด ${keys[i]}: ${t === 'skill' ? SKILLS[id].name : ITEMS[id].name}`, 'info');
    this.dirty();
  },
  skillIcon(id) {
    const s = SKILLS[id];
    if (Art.has('skill_' + id)) return h('div', { class: 'sicon art', style: `--c:${s.icon}` }, h('img', { src: Art.get('skill_' + id).src, alt: '' }));
    return h('div', { class: 'sicon', style: `--c:${s.icon}` }, s.glyph);
  },

  buildMenu() {
    // ไอคอนเส้นแบบ SVG (stroke = currentColor)
    const P = {
      status: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.5-7 8-7s7 2.5 8 7"/>',
      bag: '<path d="M6 8h12l1 13H5z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><path d="M9 12h6"/>',
      equip: '<path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z"/><path d="M12 8v8M9 11h6"/>',
      skill: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
      map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
      bot: '<rect x="5" y="8" width="14" height="11" rx="2"/><path d="M12 4v4"/><circle cx="12" cy="3.5" r="1"/><circle cx="9.5" cy="13" r="1.3"/><circle cx="14.5" cy="13" r="1.3"/><path d="M2 12v3M22 12v3"/>',
      options: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
      nav: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
      help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"/><circle cx="12" cy="17" r=".6"/>',
      sit: '<path d="M6 21v-5h9l3 5"/><circle cx="10" cy="5" r="2.5"/><path d="M10 8v8M10 11h5"/>',
    };
    const icon = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${P[k]}</svg>`;
    const items = [
      ['w-status', 'สถานะ', 'A', 'status'], ['w-inv', 'ไอเทม', 'E', 'bag'], ['w-equip', 'อุปกรณ์', 'Q', 'equip'],
      ['w-skills', 'สกิล', 'S', 'skill'], ['w-map', 'แผนที่', 'M', 'map'], ['w-nav', 'นำทาง', 'G', 'nav'], ['w-bot', 'บอท', 'N', 'bot'], ['w-options', 'ตั้งค่า', 'O', 'options'], ['w-help', 'วิธีเล่น', 'H', 'help'],
    ];
    const m = $('#menubar');
    for (const [id, label, key, ic] of items) {
      const b = h('button', { onclick: () => { this.toggle(id); if (Pad.enabled()) this.setFold(m, true); }, title: `${label} (${key})`, 'data-win': id });
      b.innerHTML = `${icon(ic)}<span>${label}</span><small>${key}</small>`;
      m.append(b);
    }
    const sit = h('button', { onclick: () => { toggleSit(); if (Pad.enabled()) this.setFold(m, true); }, title: 'นั่งพัก (X)' });
    sit.innerHTML = `${icon('sit')}<span>นั่ง</span><small>X</small>`;
    m.append(sit);
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-open]');
      if (t) this.open(t.dataset.open);
    });
  },
  // ภาพหน้าตัวละครในกรอบวงกลม (วาดใหม่เมื่ออาชีพ/อุปกรณ์หัวเปลี่ยน)
  drawPortrait() {
    const p = G.player, cv = $('#bi-portrait');
    const artKey = Art.jobKey(p.job, p.gender);
    const key = [p.job, p.hair, p.gender, p.equip.head && p.equip.head.id, artKey, JSON.stringify(p.look || {})].join('|');
    if (cv.dataset.key === key) return;
    cv.dataset.key = key;
    const g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    const gk = `${p.job}_${p.gender === 'm' ? 'm' : 'f'}`;
    if (Anim.has(gk)) { // มีภาพเคลื่อนไหวแล้ว: ใช้หน้าจากตัวในเกม (ไม่ใช้ภาพประกอบรุ่นเก่า)
      const bg = g.createLinearGradient(0, 0, 0, cv.height); bg.addColorStop(0, '#1c3450'); bg.addColorStop(1, '#070b14');
      g.fillStyle = bg; g.fillRect(0, 0, cv.width, cv.height);
      Anim.drawFace(g, gk, cv.width, cv.height); return;
    }
    if (artKey) { Art.drawFace(g, Art.get(artKey), cv.width, cv.height); return; }
    const bg = g.createRadialGradient(cv.width / 2, cv.height * 0.4, 4, cv.width / 2, cv.height / 2, cv.width * 0.7);
    const glow = (p.look && p.look.glow) || JOBS[p.job].glow || '#7ad8ff';
    bg.addColorStop(0, U.rgba(glow, 0.55)); bg.addColorStop(0.55, '#16223a'); bg.addColorStop(1, '#070b14');
    g.fillStyle = bg; g.fillRect(0, 0, cv.width, cv.height);
    g.strokeStyle = U.rgba(glow, 0.18); g.lineWidth = 1;
    for (let y = 2; y < cv.height; y += 4) { g.beginPath(); g.moveTo(0, y); g.lineTo(cv.width, y); g.stroke(); }
    const sc = cv.width / 40;
    g.save(); g.translate(cv.width / 2, cv.height * 1.55); g.scale(sc, sc);
    Sprites.drawPlayer(g, Object.assign({}, p, { x: 0, y: 0, dir: 2, facing: 1, moving: false, sitting: false, dead: false, atkAnim: 0, hurtFlash: 0, cast: null, buffs: {}, _an: null }), 0.2);
    g.restore();
  },

  // ---------------- เรนเดอร์หน้าต่างที่เปิดอยู่ ----------------
  renderWindows(force) {
    if (!this.isDirty && !force) return;
    this.isDirty = false;
    this.renderHotbar();
    if (this.isOpen('w-status')) this.renderStatus();
    if (this.isOpen('w-inv')) this.renderInv();
    if (this.isOpen('w-equip')) this.renderEquip();
    if (this.isOpen('w-skills')) this.renderSkills();
    if (this.isOpen('w-options')) this.renderOptions();
    if (this.isOpen('w-nav')) this.renderNav();
    if (this.isOpen('w-bot')) this.renderBot();
    if (this.isOpen('w-map')) $('#w-map .win-title span').textContent = `แผนที่ — ${G.map.def.name}`;
    if (this.isOpen('w-shop') && this.shop) this.renderShop();
  },

  renderStatus() {
    const p = G.player, d = p.d;
    const stats = ['str', 'agi', 'vit', 'int', 'dex', 'luk'];
    const desc = { str: 'พลังโจมตีระยะประชิด', agi: 'ความเร็วโจมตี/หลบหลีก', vit: 'HP/ป้องกัน', int: 'พลังเวท/SP', dex: 'ความแม่นยำ/ธนู/ร่ายเร็ว', luk: 'คริติคอล/โชค' };
    const left = stats.map(s => {
      const cost = statCost(p.stats[s]);
      const can = p.statPoints >= cost && p.stats[s] < 99;
      return h('div', { class: 'st-row', title: desc[s] },
        h('span', { class: 'st-n' }, s.toUpperCase()),
        h('span', { class: 'st-v' }, String(p.stats[s]), d[s + 'Bonus'] ? h('em', {}, ` +${d[s + 'Bonus']}`) : ''),
        h('button', { class: 'st-up', disabled: !can, onclick: () => raiseStat(s) }, '▲'),
        h('span', { class: 'st-c' }, String(cost)));
    });
    const right = [
      ['ATK', d.atkDisplay], ['MATK', `${d.matkMin} ~ ${d.matkMax}`], ['HIT', d.hit], ['CRIT', d.crit],
      ['DEF', `${d.def} + ${d.softDef}`], ['MDEF', `${d.mdef} + ${d.softMdef}`], ['FLEE', `${d.flee} + ${d.pdodge}`], ['ASPD', d.aspd],
    ].map(([k, v]) => h('div', { class: 'st-row2' }, h('span', {}, k), h('b', {}, String(v))));
    const body = $('#w-status .win-body');
    body.innerHTML = '';
    body.append(
      h('div', { class: 'st-grid' }, h('div', {}, left), h('div', {}, right)),
      h('div', { class: 'st-foot' }, `Status Point: `, h('b', {}, String(p.statPoints)),
        h('span', { class: 'hint' }, ' — ตัวเลขขวาคือแต้มที่ใช้เพิ่ม 1 ค่า')),
    );
  },

  itemTooltip(entry) {
    const it = ITEMS[entry.id];
    const lines = [];
    if (it.type === 'weapon') lines.push(`ประเภท: ${WTYPE_THAI[it.wtype]}  ATK ${it.atk}${it.matk ? `  MATK ${it.matk}` : ''}`);
    if (it.type === 'armor') lines.push(`ตำแหน่ง: ${SLOT_THAI[it.slot]}${it.def ? `  DEF ${it.def}` : ''}${it.mdef ? `  MDEF ${it.mdef}` : ''}`);
    if (it.type === 'card') lines.push(`ใส่ใน: ${SLOT_THAI[it.slot]}`);
    if (isEquipType(it)) {
      lines.push(`อาชีพ: ${it.jobs === 'all' ? 'ทุกอาชีพ' : it.jobs.map(j => JOBS[j].name).join(', ')}${it.lv ? `  |  Lv ${it.lv}+` : ''}`);
      if (it.slots) lines.push(`ช่องชิป: ${(entry.cards || []).map(c => ITEMS[c].name).join(', ') || '-'} (${(entry.cards || []).length}/${it.slots})`);
    }
    return lines;
  },

  renderInv() {
    const p = G.player;
    const body = $('#w-inv .win-body');
    body.innerHTML = '';
    const tabs = [['use', 'ของใช้'], ['equip', 'อุปกรณ์'], ['etc', 'อื่น ๆ']];
    const tabType = e => { const t = ITEMS[e.id].type; return t === 'use' ? 'use' : isEquipType(ITEMS[e.id]) ? 'equip' : 'etc'; };
    body.append(h('div', { class: 'tabs' }, tabs.map(([k, l]) => h('button', {
      class: 'tab' + (this.invTab === k ? ' on' : ''), onclick: () => { this.invTab = k; this.selItem = null; this.renderInv(); },
    }, l, h('small', {}, ` ${p.inventory.filter(e => tabType(e) === k).length}`)))));
    const grid = h('div', { class: 'inv-grid' });
    const list = p.inventory.filter(e => tabType(e) === this.invTab);
    for (const e of list) {
      const cell = h('div', { class: 'inv-cell' + (this.selItem === e ? ' sel' : ''), title: itemDisplayName(e), draggable: 'true' },
        h('img', { src: itemIconUrl(e.id), alt: '' }),
        e.qty > 1 || !isEquipType(ITEMS[e.id]) ? h('span', { class: 'q' }, String(e.qty)) : null,
        e.refine ? h('span', { class: 'rf' }, '+' + e.refine) : null);
      cell.addEventListener('click', () => { this.selItem = e; this.renderInv(); });
      cell.addEventListener('dblclick', () => { useItem(e); });
      cell.addEventListener('dragstart', ev => ev.dataTransfer.setData('text/plain', JSON.stringify({ t: 'item', id: e.id })));
      grid.append(cell);
    }
    for (let i = list.length; i < Math.max(24, Math.ceil(list.length / 6) * 6); i++) grid.append(h('div', { class: 'inv-cell empty' }));
    body.append(grid);
    const det = h('div', { class: 'inv-detail' });
    const e = this.selItem && p.inventory.includes(this.selItem) ? this.selItem : null;
    if (e) {
      const it = ITEMS[e.id];
      const acts = [];
      if (it.type === 'use') acts.push(h('button', { class: 'btn', onclick: () => useItem(e) }, 'ใช้'));
      if (isEquipType(it)) acts.push(h('button', { class: 'btn', onclick: () => useItem(e) }, 'สวมใส่'));
      if (it.type === 'card') acts.push(h('button', { class: 'btn', onclick: () => useItem(e) }, 'ใส่ชิป'));
      if (it.type === 'use' || isEquipType(it)) acts.push(h('button', { class: 'btn', onclick: () => this.assignHotbar('item', e.id) }, 'ตั้งปุ่มลัด'));
      acts.push(h('button', { class: 'btn danger', onclick: () => this.discard(e) }, 'ทิ้ง'));
      det.append(
        h('div', { class: 'det-head' }, h('img', { src: itemIconUrl(e.id), alt: '' }), h('b', {}, itemDisplayName(e)), e.qty > 1 ? ` ×${e.qty}` : ''),
        h('div', { class: 'det-desc' }, it.desc || ''),
        ...this.itemTooltip(e).map(l => h('div', { class: 'det-line' }, l)),
        h('div', { class: 'det-line' }, `ราคาขาย: ${U.fmt(Math.floor(it.price / 2))} z`),
        h('div', { class: 'det-acts' }, acts));
    } else det.append(h('div', { class: 'hint' }, 'คลิกเพื่อดูรายละเอียด • ดับเบิลคลิกเพื่อใช้/สวมใส่ • ลากไปวางที่ปุ่มลัดได้'));
    body.append(det, h('div', { class: 'inv-foot' }, `Zeny: `, h('b', {}, U.fmt(p.zeny))));
  },
  async discard(e) {
    const it = ITEMS[e.id];
    const ok = await this.confirm(`ทิ้ง ${itemDisplayName(e)}${e.qty > 1 ? ` ทั้งหมด ${e.qty} ชิ้น` : ''} หรือไม่? (จะวางไว้บนพื้น)`);
    if (!ok || !G.player.inventory.includes(e)) return;
    removeEntry(e, e.qty);
    if (isEquipType(it)) G.drops.push({ uid: G.uid++, id: e.id, qty: 1, x: G.player.x + 0.4, y: G.player.y + 0.3, born: G.time });
    else G.drops.push({ uid: G.uid++, id: e.id, qty: e.qty, x: G.player.x + 0.4, y: G.player.y + 0.3, born: G.time });
    this.selItem = null;
  },

  renderEquip() {
    const p = G.player;
    const body = $('#w-equip .win-body');
    body.innerHTML = '';
    const prev = h('canvas', { class: 'eq-prev', width: 120, height: 150 });
    const g = prev.getContext('2d');
    g.save(); g.translate(60, 125); g.scale(2, 2);
    Sprites.drawPlayer(g, Object.assign({}, p, { x: 0, y: 0, moving: false, sitting: false, dead: false, atkAnim: 0, facing: 1 }), 0.5);
    g.restore();
    const slots = EQUIP_SLOTS.map(s => {
      const e = p.equip[s];
      return h('div', { class: 'eq-slot' + (e ? '' : ' empty'), title: e ? 'คลิกเพื่อถอด' : '', onclick: () => e && unequip(s) },
        h('span', { class: 'eq-n' }, SLOT_THAI[s]),
        e ? h('img', { src: itemIconUrl(e.id), alt: '' }) : h('span', { class: 'eq-ph' }),
        h('span', { class: 'eq-i' }, e ? itemDisplayName(e) + (e.cards && e.cards.length ? ` ◆${e.cards.length}` : '') : '-'));
    });
    body.append(h('div', { class: 'eq-wrap' }, prev, h('div', { class: 'eq-slots' }, slots)),
      h('div', { class: 'hint' }, 'คลิกที่อุปกรณ์เพื่อถอด • สวมใส่ได้จากหน้าต่างไอเทม'));
  },

  renderSkills() {
    const p = G.player;
    const body = $('#w-skills .win-body');
    body.innerHTML = '';
    const ids = [...new Set([...(p.job !== 'novice' ? JOBS.novice.skills : []), ...JOBS[p.job].skills])];
    body.append(h('div', { class: 'sk-head' }, `${JOBS[p.job].name} — Skill Point: `, h('b', {}, String(p.skillPoints))));
    const list = h('div', { class: 'sk-list' });
    for (const id of ids) {
      const s = SKILLS[id], lv = skillLv(id);
      const reqTxt = s.req ? Object.entries(s.req).map(([k, v]) => `${SKILLS[k].name} ${v}`).join(', ') : '';
      const ic = this.skillIcon(id);
      if (lv && s.type === 'active') {
        ic.draggable = true;
        ic.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', JSON.stringify({ t: 'skill', id })));
        ic.title = 'ลากไปวางที่ปุ่มลัด';
      }
      list.append(h('div', { class: 'sk-row' + (lv ? '' : ' locked') },
        ic,
        h('div', { class: 'sk-info' },
          h('div', { class: 'sk-name' }, s.name, h('span', { class: 'sk-lv' }, ` Lv ${lv}/${s.max}`), s.type === 'passive' ? h('span', { class: 'tag' }, 'ติดตัว') : null),
          h('div', { class: 'sk-desc' }, s.desc + (s.sp && lv ? ` [SP ${s.sp(lv)}]` : '')),
          reqTxt ? h('div', { class: 'sk-req' + (skillReqMet(id) ? ' ok' : '') }, `ต้องการ: ${reqTxt}`) : null),
        h('div', { class: 'sk-acts' },
          canLearn(id) ? h('button', { class: 'btn small', onclick: () => learnSkill(id) }, '+') : null,
          lv && s.type === 'active' ? h('button', { class: 'btn small', onclick: () => useSkill(id) }, 'ใช้') : null,
          lv && s.type === 'active' ? h('button', { class: 'btn small', title: 'ตั้งปุ่มลัด', onclick: () => this.assignHotbar('skill', id) }, '📌') : null)));
    }
    body.append(list);
    if (p.job === 'novice') body.append(h('div', { class: 'hint' }, `เก็บ Job Lv ${JOB_CHANGE_LV} แล้วไปหา Mimir AI ในนีโอเอลด์ไฮม์ เพื่ออัปเกรดร่างเป็น 1 ใน 6 คลาส`));
  },

  // ---------------- นำทาง ----------------
  navTab: 'here',
  renderNav() {
    const body = $('#w-nav .win-body');
    const key = this.navTab + '|' + G.map.id;
    if (body.dataset.key === key) return;
    body.dataset.key = key; body.innerHTML = '';
    const tabs = [['here', 'แผนที่นี้'], ['place', 'สถานที่'], ['map', 'แผนที่'], ['mob', 'มอนสเตอร์']];
    body.append(h('div', { class: 'tabs' }, ...tabs.map(([k, l]) => h('button', { class: 'tab' + (this.navTab === k ? ' on' : ''), onclick: () => { this.navTab = k; body.dataset.key = ''; this.renderNav(); } }, l))));
    const list = h('div', { class: 'nav-list' });
    const row = (t, sub, extra) => h('button', { class: 'nav-row' + (t.map === G.map.id ? ' here' : ''), onclick: () => Nav.goTo(t) },
      h('span', { class: 'nav-n' }, t.name, extra ? h('span', { class: 'tag' }, extra) : null), h('span', { class: 'nav-s' }, sub));
    if (this.navTab === 'here') for (const t of Nav.here()) list.append(row(t, `${t.sub} • ${Math.round(t.d)} ช่อง`));
    else if (this.navTab === 'place') for (const t of Nav.places()) list.append(row(t, MAP_DEFS[t.map].name));
    else if (this.navTab === 'map') for (const t of Nav.maps()) list.append(row(t, `${t.thai}${t.level ? ` • Lv ${t.level}` : ''}`, t.map === G.map.id ? 'อยู่ที่นี่' : null));
    else for (const t of Nav.mobs()) list.append(row(t, `${t.mapName} • Lv ${t.lv}`, t.mvp ? 'MVP' : null));
    body.append(list, h('div', { class: 'hint' }, 'เลือกแล้วตัวละครจะเดินไปเอง ข้ามแผนที่ได้ • คลิกที่พื้นเพื่อยกเลิก'));
  },
  renderOptions() {
    const p = G.player, o = p.options;
    const body = $('#w-options .win-body');
    body.innerHTML = '';
    const chk = (key, label) => h('label', { class: 'opt' },
      h('input', { type: 'checkbox', checked: o[key] ? 'checked' : false, onchange: e => { o[key] = e.target.checked; saveGame(); } }), ' ', label);
    body.append(
      chk('autoLoot', 'เก็บไอเทมอัตโนมัติ (Auto Loot)'),
      chk('sound', 'เสียงเอฟเฟกต์'),
      h('label', { class: 'opt' }, h('input', { type: 'checkbox', checked: o.music ? 'checked' : false, onchange: e => { o.music = e.target.checked; o.musicSet = true; saveGame(); } }), ' เพลงประกอบ (BGM)'),
      h('label', { class: 'opt' }, 'ความดังเพลง ',
        h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: o.musicVol != null ? o.musicVol : 0.7, oninput: e => { o.musicVol = +e.target.value; Music.setVolume(o.musicVol); }, onchange: () => saveGame() })),
      chk('expMsg', 'แสดงข้อความ EXP ในแชท'),
      h('div', { class: 'opt-lbl' }, 'ปุ่มควบคุมบนจอ (จอย + ปุ่มโจมตี)'),
      h('div', { class: 'seg' }, ...[['auto', 'อัตโนมัติ'], ['on', 'เปิด'], ['off', 'ปิด']].map(([v, l]) =>
        h('button', { type: 'button', class: Pad.mode === v ? 'on' : '', onclick: () => { Pad.setMode(v); this.renderOptions(); } }, l))),
      h('div', { class: 'opt-btns' },
        h('button', { class: 'btn', onclick: () => saveGame(false) }, 'บันทึกเกม'),
        Online.loggedIn ? h('button', { class: 'btn', onclick: async () => { saveGame(true, true); await Online.logout(); location.reload(); } }, `ออกจากระบบ (${Online.username})`) : null,
        h('button', { class: 'btn', onclick: () => this.open('w-help') }, 'วิธีเล่น'),
        document.fullscreenEnabled ? h('button', { class: 'btn', onclick: () => toggleFullscreen() }, document.fullscreenElement ? 'ออกจากเต็มจอ' : 'เต็มจอ') : null,
        Online.loggedIn ? null : h('button', { class: 'btn danger', onclick: async () => {
          if (await this.confirm('ลบข้อมูลตัวละครทั้งหมดและเริ่มใหม่? (ย้อนกลับไม่ได้)')) { deleteSave(); G.started = false; location.reload(); }
        } }, 'ลบเซฟ / เริ่มใหม่')),
    );
  },

  // ---------------- ป็อปอัปยืนยัน ----------------
  confirm(text) {
    return new Promise(res => {
      const w = $('#w-confirm');
      $('.win-body', w).innerHTML = '';
      $('.win-body', w).append(h('div', { class: 'cf-text' }, text),
        h('div', { class: 'cf-btns' },
          h('button', { class: 'btn', onclick: () => { w.classList.add('hidden'); res(true); } }, 'ตกลง'),
          h('button', { class: 'btn', onclick: () => { w.classList.add('hidden'); res(false); } }, 'ยกเลิก')));
      w.classList.remove('hidden'); w.style.zIndex = ++this.z + 1000;
    });
  },
  async compoundCard(entry) {
    const p = G.player, card = ITEMS[entry.id];
    const target = p.equip[card.slot];
    if (!target) { this.msg(`ต้องสวมใส่${SLOT_THAI[card.slot]}ก่อน จึงจะใส่ ${card.name} ได้`, 'err'); return; }
    const ti = ITEMS[target.id];
    if (!ti.slots || target.cards.length >= ti.slots) { this.msg(`${itemDisplayName(target)} ไม่มีช่องชิปว่าง`, 'err'); return; }
    if (!(await this.confirm(`ติดตั้ง ${card.name} ลงใน ${itemDisplayName(target)}? (ถอดออกไม่ได้)`))) return;
    if (!p.inventory.includes(entry) || p.equip[card.slot] !== target) return;
    target.cards.push(entry.id);
    removeEntry(entry, 1);
    recalc();
    this.msg(`ติดตั้ง ${card.name} สำเร็จ!`, 'lvl');
    Sound.play('refine_ok');
  },

  // ---------------- บทสนทนา NPC ----------------
  dlgOpen(name) {
    const w = $('#w-dialog');
    $('.win-title span', w).textContent = name;
    $('.win-body', w).innerHTML = '';
    w.classList.remove('hidden'); w.style.zIndex = ++this.z;
  },
  say(name, text) {
    return new Promise((res, rej) => {
      this.dlgOpen(name);
      const b = $('#w-dialog .win-body');
      b.append(h('div', { class: 'dlg-text', html: text }), h('div', { class: 'dlg-btns' }, h('button', { class: 'btn', onclick: () => { this.dialog = null; res(); } }, 'ต่อไป ▸')));
      this.dialog = { reject: rej };
    });
  },
  menu(name, text, options) {
    return new Promise((res, rej) => {
      this.dlgOpen(name);
      const b = $('#w-dialog .win-body');
      if (text) b.append(h('div', { class: 'dlg-text', html: text }));
      b.append(h('div', { class: 'dlg-menu' }, options.map((o, i) => h('button', { class: 'dlg-opt', onclick: () => { this.dialog = null; res(i); } }, o))));
      this.dialog = { reject: rej };
    });
  },
  dlgClose() { this.dialog = null; $('#w-dialog').classList.add('hidden'); },
  // ภาพประกอบตัวละครข้างกล่องบทสนทนา (แบบเกมอนิเมะ)
  illust(key) {
    const el = $('#illust');
    const img = key && Art.get(key);
    if (!img) { el.classList.remove('show'); return; }
    if (el.dataset.key !== key) { el.innerHTML = ''; el.append(Object.assign(new Image(), { src: img.src, alt: '' })); el.dataset.key = key; }
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  },
  // ฉากเปิดตัวบอส
  splash(key, title, sub, cls) {
    const img = Art.get(key);
    const el = $('#splash');
    el.innerHTML = '';
    if (img) el.append(Object.assign(new Image(), { src: img.src, alt: '' }));
    el.append(h('div', { class: 'sp-text' }, h('small', {}, sub || 'WARNING'), h('b', {}, title)));
    el.classList.toggle('noimg', !img);
    el.classList.toggle('upgrade', cls === 'upgrade');
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  },

  // ---------------- ร้านค้า ----------------
  openShop(name, list) {
    this.shop = { name, list, mode: 'buy', cart: {} };
    $('#w-shop .win-title span').textContent = name;
    this.open('w-shop');
  },
  renderShop() {
    const p = G.player, s = this.shop;
    const body = $('#w-shop .win-body');
    body.innerHTML = '';
    body.append(h('div', { class: 'tabs' },
      h('button', { class: 'tab' + (s.mode === 'buy' ? ' on' : ''), onclick: () => { s.mode = 'buy'; this.renderShop(); } }, 'ซื้อ'),
      h('button', { class: 'tab' + (s.mode === 'sell' ? ' on' : ''), onclick: () => { s.mode = 'sell'; this.renderShop(); } }, 'ขาย')));
    const list = h('div', { class: 'shop-list' });
    if (s.mode === 'buy') {
      for (const id of s.list) {
        const it = ITEMS[id];
        const usable = !isEquipType(it) || it.jobs === 'all' || it.jobs.includes(p.job);
        const qty = h('input', { type: 'number', min: 1, max: 999, value: 1, class: 'qty' });
        if (isEquipType(it)) qty.style.visibility = 'hidden';
        list.append(h('div', { class: 'shop-row' + (usable ? '' : ' dim'), title: it.desc },
          h('img', { src: itemIconUrl(id), alt: '' }),
          h('div', { class: 'shop-n' }, h('b', {}, it.name + (it.slots ? ` [${it.slots}]` : '')), h('small', {}, it.desc + (it.lv ? ` (Lv ${it.lv}+)` : ''))),
          h('span', { class: 'shop-p' }, U.fmt(it.price) + ' z'),
          qty,
          h('button', { class: 'btn small', onclick: () => this.buy(id, Math.max(1, Math.min(999, parseInt(qty.value, 10) || 1))) }, 'ซื้อ')));
      }
    } else {
      const inv = p.inventory.slice();
      if (!inv.length) list.append(h('div', { class: 'hint' }, 'ไม่มีไอเทมให้ขาย'));
      for (const e of inv) {
        const it = ITEMS[e.id];
        const price = Math.floor(it.price / 2);
        list.append(h('div', { class: 'shop-row' },
          h('img', { src: itemIconUrl(e.id), alt: '' }),
          h('div', { class: 'shop-n' }, h('b', {}, itemDisplayName(e)), h('small', {}, `มี ${e.qty} ชิ้น`)),
          h('span', { class: 'shop-p' }, U.fmt(price) + ' z'),
          h('button', { class: 'btn small', onclick: () => this.sell(e, 1) }, 'ขาย 1'),
          e.qty > 1 ? h('button', { class: 'btn small', onclick: () => this.sell(e, e.qty) }, 'ทั้งหมด') : null));
      }
      if (inv.some(e => ITEMS[e.id].type === 'etc')) {
        list.prepend(h('div', { class: 'shop-row sellall' },
          h('button', { class: 'btn', onclick: () => { for (const e of p.inventory.filter(x => ITEMS[x.id].type === 'etc')) this.sell(e, e.qty, true); Sound.play('buy'); } }, 'ขายของดรอป (Etc) ทั้งหมด')));
      }
    }
    body.append(list, h('div', { class: 'inv-foot' }, 'Zeny: ', h('b', {}, U.fmt(p.zeny))));
  },
  buy(id, qty) {
    const p = G.player, it = ITEMS[id];
    const cost = it.price * qty;
    if (p.zeny < cost) { this.msg('Zeny ไม่เพียงพอ', 'err'); return; }
    p.zeny -= cost;
    addItem(id, qty, true);
    this.msg(`ซื้อ ${it.name} ×${qty} (-${U.fmt(cost)} z)`, 'item');
    Sound.play('buy');
    this.dirty();
  },
  sell(e, qty, quiet) {
    const p = G.player, it = ITEMS[e.id];
    if (!p.inventory.includes(e)) return;
    const gain = Math.floor(it.price / 2) * qty;
    removeEntry(e, qty);
    p.zeny += gain;
    if (!quiet) { this.msg(`ขาย ${it.name} ×${qty} (+${U.fmt(gain)} z)`, 'item'); Sound.play('buy'); }
    this.dirty();
  },

  // ---------------- บอท ----------------
  updateBotButton() {
    const b = $('#auto-btn');
    b.classList.toggle('on', Bot.on);
    const t = Bot.on ? (Bot.resting ? 'พัก' : 'เปิด') : 'ปิด';
    const sm = $('small', b);
    if (sm.textContent !== t) sm.textContent = t;
  },
  updateBotStats() {
    const el = $('#bot-stats');
    if (!el) return;
    const sum = Bot.summary();
    const html = sum ? [['เวลา', `${sum.mins.toFixed(1)} นาที`], ['ล่าได้', `${sum.kills} ตัว`], ['Base EXP', '+' + U.fmt(sum.bexp)],
      ['Job EXP', '+' + U.fmt(sum.jexp)], ['ไอเทม', `${sum.items} ชิ้น`], ['EXP/นาที', U.fmt(sum.mins > 0.05 ? sum.bexp / sum.mins : 0)]]
      .map(([k, v]) => `<div>${k}<b>${v}</b></div>`).join('') : '<div class="hint" style="grid-column:1/-1">สถิติจะแสดงเมื่อเริ่มบอท</div>';
    if (el.innerHTML !== html) el.innerHTML = html;
  },
  renderBot() {
    const p = G.player, c = Bot.cfg();
    const body = $('#w-bot .win-body');
    body.innerHTML = '';
    body.append(h('button', { class: 'btn big bot-toggle' + (Bot.on ? ' on' : ''), onclick: () => Bot.toggle() }, Bot.on ? '■ หยุดบอท' : '▶ เริ่มบอท'));
    body.append(h('div', { id: 'bot-stats', class: 'bot-stats' }));
    this.updateBotStats();
    const slider = (key, label, min, max, unit = '%') => {
      const val = h('b', {}, `${c[key]}${unit}`);
      const inp = h('input', { type: 'range', min, max, value: c[key], oninput: e => { c[key] = +e.target.value; val.textContent = `${c[key]}${unit}`; }, onchange: () => saveGame() });
      return h('label', { class: 'bot-row' }, h('span', {}, label), inp, val);
    };
    const chk = (key, label) => h('label', { class: 'opt' },
      h('input', { type: 'checkbox', checked: c[key] ? 'checked' : false, onchange: e => { c[key] = e.target.checked; saveGame(); } }), ' ', label);
    body.append(
      h('div', { class: 'bot-sec' }, 'การฟื้นฟู'),
      slider('hpPot', 'ใช้ชุดซ่อมเมื่อ HP ต่ำกว่า', 0, 95),
      slider('spPot', 'ใช้เซลล์พลังงานเมื่อ SP ต่ำกว่า', 0, 95),
      slider('healAt', 'ใช้สกิลฮีลเมื่อ HP ต่ำกว่า', 0, 95),
      slider('restHp', 'นั่งพักเมื่อ HP ต่ำกว่า', 0, 90),
      slider('restSp', 'นั่งพักเมื่อ SP ต่ำกว่า', 0, 90),
      h('div', { class: 'bot-sec' }, 'การล่า'),
      slider('radius', 'ระยะค้นหามอนสเตอร์', 5, 30, ' ช่อง'),
      chk('useBuffs', 'ใช้บัฟ / เรียกสัตว์คู่ใจอัตโนมัติ'),
      chk('avoidMvp', 'ไม่เข้าตี MVP เอง'),
      chk('returnHome', 'กลับเมืองเมื่อยาหมดและ HP วิกฤต'),
      h('label', { class: 'opt' }, h('input', { type: 'checkbox', checked: p.options.autoLoot ? 'checked' : false, onchange: e => { p.options.autoLoot = e.target.checked; saveGame(); } }), ' เก็บไอเทมอัตโนมัติ'),
    );
    const act = Object.keys(p.skills).filter(id => SKILLS[id] && SKILLS[id].type === 'active');
    body.append(h('div', { class: 'bot-sec' }, 'สกิลที่ให้บอทใช้'));
    if (!act.length) body.append(h('div', { class: 'hint' }, 'ยังไม่มีสกิลที่ใช้งานได้'));
    for (const id of act) {
      body.append(h('label', { class: 'opt bot-skill' },
        h('input', { type: 'checkbox', checked: c.skills[id] !== false ? 'checked' : false, onchange: e => { c.skills[id] = e.target.checked; saveGame(); } }),
        this.skillIcon(id), ` ${SKILLS[id].name}`, h('small', {}, ` (${({ heal: 'ฮีล', summon: 'เรียกสัตว์', opener: 'เปิดฉาก', buff: 'บัฟ', trap: 'กับดัก', aoe: 'โจมตีรอบตัว', attack: 'โจมตี' })[Bot.role(id)] || ''})`)));
    }
    const hpN = HP_POTS.reduce((a, id) => a + countItem(id), 0), spN = SP_POTS.reduce((a, id) => a + countItem(id), 0);
    body.append(h('div', { class: 'hint' }, `ชุดซ่อมคงเหลือ ${hpN} • เซลล์พลังงานคงเหลือ ${spN} — บอททำงานต่อแม้สลับแท็บ/แอป (จำลองย้อนหลังสูงสุด 10 นาที)`));
  },

  setNet(state) {
    const el = $('#net');
    if (!el) return;
    el.hidden = !Online.online;
    el.className = 'net ' + state;
    el.title = state === 'ok' ? 'เชื่อมต่อเซิร์ฟเวอร์แล้ว' : 'การเชื่อมต่อมีปัญหา กำลังลองใหม่';
  },

  showDeath() { $('#death').classList.remove('hidden'); },
  hideDeath() { $('#death').classList.add('hidden'); },
};
