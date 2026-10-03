'use strict';
// ============================================================
//  UI: หน้าต่าง IRON VALHALLA, แชท, ฮอตบาร์, ร้านค้า, บทสนทนา NPC
// ============================================================

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
// กันบั๊ก "null" ทั้งเกม: append/prepend ข้าม null/undefined/false (ค่าเดิมของเบราว์เซอร์จะพิมพ์คำว่า "null" ออกมา)
for (const P of [Element.prototype, DocumentFragment.prototype]) for (const k of ['append', 'prepend']) {
  const orig = P[k];
  P[k] = function (...nodes) { return orig.apply(this, nodes.filter(n => n != null && n !== false)); };
}
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

// สีชื่อไอเทมตามความหายาก (js/loot.js) — ไม่มีไฟล์นั้นก็ไม่เป็นไร
const rarCls = id => (typeof LOOT !== 'undefined' ? LOOT.cls(id) : '');
const fmtLeft = t => t >= 60 ? `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` : `${t}s`;
const UI = {
  isDirty: true, z: 100, invTab: 'use', selItem: null, shop: null, dialog: null,

  init() {
    this.buildHotbar();
    this.buildMenu();
    this.initTip();
    this.initFolds();
    for (const w of $$('.win')) this.makeWindow(w);
    // กล่องคุย NPC: รูปหน้า NPC ในวงกลมขอบทอง (วาดด้วย CSS — css/theme.css)
    $('#w-dialog').append(h('i', { class: 'dlg-face', 'aria-hidden': 'true' }));
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
    $('#quest-track').onclick = () => Quest.go();
    $('#target .tg-info').onclick = () => { const t = G.player.target || (G.hover && G.hover.ref); if (t && t.def) this.showMob(t.def.id); };
    $('#death-here').onclick = () => respawnPlayer(true);
    $('#death-hide').onclick = () => { $('#death').classList.add('hidden'); $('#death-mini').classList.remove('hidden'); };
    $('#death-mini').onclick = () => { $('#death-mini').classList.add('hidden'); $('#death').classList.remove('hidden'); };
    $('#nav-cancel').onclick = () => Nav.cancel();
    // มือถือ: ปุ่มแชทเปิดช่องพิมพ์แบบลอย ปิดเมื่อส่งหรือแตะที่อื่น
    $('#chat-btn').onclick = () => { const c = $('#chat'); c.classList.toggle('typing'); if (c.classList.contains('typing')) $('#chat-input').focus(); };
    $('#chat-input').addEventListener('blur', () => setTimeout(() => $('#chat').classList.remove('typing'), 150));
    $('#auto-btn').onclick = () => Bot.toggle();
    this.altPress($('#auto-btn'), () => this.open('w-bot')); // คลิกขวา / กดค้าง = ตั้งค่าบอท (เจ้าของ 2026-10-03)
    this.bindMapClick($('#minimap-cv'));
    this.bindMapClick($('#bigmap-cv'));
    $('#map-open').onclick = () => this.toggle('w-map');
    $('#minimap .mm-ring').addEventListener('click', () => this.toggle('w-map')); // แตะมินิแมพ = เปิดแผนที่ใหญ่
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
    const mf = h('button', { class: 'fold-btn menu-fold', title: L('เมนู (Tab)', 'Menu (Tab)'), 'aria-label': L('เปิดหรือปิดเมนู', 'Toggle menu') });
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
    if (p.id === 'basic-info') this.stackTop();
    const st = this.foldState(); st[p.dataset.fold] = on; this.saveFold(st);
    Sound.play('click');
  },
  toggleMenu() { const m = $('#menubar'); this.setFold(m, !m.classList.contains('folded')); },
  toggleHud() {
    const on = !$('#hud').classList.contains('hud-min');
    $('#hud').classList.toggle('hud-min', on);
    const st = this.foldState(); st.all = on; this.saveFold(st);
    this.msg(on ? L('ซ่อน HUD แล้ว (กด U หรือปุ่ม ◉ เพื่อแสดง)', 'HUD hidden (press U or ◉ to show)') : L('แสดง HUD', 'HUD shown'), 'info');
  },

  // ---------------- หน้าต่าง ----------------
  makeWindow(w) {
    const bar = $('.win-title', w);
    if (bar && !$('.win-x', bar) && !w.dataset.noclose) {
      bar.append(h('button', { class: 'win-x', title: L('ปิด (Esc)', 'Close (Esc)'), onclick: () => this.close(w.id) }, '×'));
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
  // คลิกขวา (คอม) หรือกดค้าง 0.5 วิ (มือถือ) = ทางลัดรอง ของปุ่ม — กดค้างแล้วจะไม่ส่งคลิกปกติตามมา
  altPress(el, fn) {
    if (!el || el._alt) return; el._alt = true;
    let tm = 0, fired = false;
    el.addEventListener('contextmenu', e => { e.preventDefault(); if (!fired) fn(); fired = false; });
    el.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; fired = false; clearTimeout(tm); tm = setTimeout(() => { fired = true; fn(); if (navigator.vibrate) navigator.vibrate(15); }, 500); });
    const stop = () => clearTimeout(tm);
    el.addEventListener('pointerup', stop); el.addEventListener('pointercancel', stop); el.addEventListener('pointerleave', stop);
    el.addEventListener('click', e => { if (fired) { e.stopImmediatePropagation(); e.preventDefault(); fired = false; } }, true);
  },
  toggle(id) { const w = $('#' + id); if (w.classList.contains('hidden')) this.open(id); else this.close(id); },
  open(id) {
    const w = $('#' + id);
    if (id === 'w-inv' || id === 'w-equip') { this.bookDet = false; this.eqDet = false; } // สมุดเปิดใหม่ = หน้ารายการ (มือถือ)
    w.classList.remove('hidden'); w.style.zIndex = ++this.z;
    this.dirty(); this.renderWindows(true);
    Sound.play('click');
  },
  close(id) {
    const w = $('#' + id);
    if (!w || w.classList.contains('hidden')) return false;
    w.classList.add('hidden');
    this.hideTip();
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
    const line = h('div', { class: 'cl ' + cls }, text);
    log.append(line);
    setTimeout(() => line.classList.add('old'), 6000); // มือถือแนวตั้ง: ข้อความเก่าค่อย ๆ หาย ไม่ค้างบังฉาก (ประวัติเต็มยังอยู่ในแชต)
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
      if (Party.chatCmd(text)) return; // /party /invite /leave /p
      const cmd = text.slice(1).toLowerCase();
      if (cmd === 'sit') toggleSit();
      else if (cmd === 'where') this.msg(`${G.map.def.name} (${Math.floor(p.x)}, ${Math.floor(p.y)})`, 'info');
      else if (cmd === 'save') saveGame(false);
      else if (cmd === 'autoloot') { p.options.autoLoot = !p.options.autoLoot; this.msg(`Auto Loot: ${p.options.autoLoot ? 'On' : 'Off'}`, 'info'); }
      else if (cmd === 'help') this.open('w-help');
      else if (cmd === 'emote' || cmd === 'e') this.toggle('w-emote');
      else if (/^trade(\s|$)/.test(cmd)) Trade.command(text.slice(6));
      else if (Emote.fromChat(cmd)) { /* อีโมต */ }
      else this.msg(L(`คำสั่ง: /sit /where /save /autoloot /help /emote • ปาร์ตี้: /party create /invite ชื่อ /leave /p ข้อความ • อีโมต: ${EMOTES.map(e => '/' + e.k).join(' ')}`, `Commands: /sit /where /save /autoloot /help /emote • Party: /party create /invite name /leave /p message • Emotes: ${EMOTES.map(e => '/' + e.k).join(' ')}`), 'info');
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
    this.msg(L(`เข้าสู่ ${map.def.name} — ${map.def.thai}${map.def.level ? ` (มอนสเตอร์ Lv ${map.def.level})` : ''}`, `Entered ${map.def.name} — ${map.def.thai}${map.def.level ? ` (Monsters Lv ${map.def.level})` : ''}`), 'map');
  },
  announceMap(map) {
    const el = $('#map-banner');
    const art = Art.get('map_' + map.id);
    const story = typeof Story !== 'undefined' ? Story.mapLine(map.id) : ''; // บรรทัดตำนานของแผนที่ (docs/STORY.md)
    el.innerHTML = `<div class="mb-en">${U.esc(map.def.name)}</div><div class="mb-th">${U.esc(map.def.thai)}</div>${story ? `<div class="mb-story">${U.esc(story)}</div>` : ''}`;
    el.classList.toggle('has-img', !!art && !G.edgeCross); el.classList.toggle('story', !!story && !G.edgeCross);
    el.classList.toggle('mini', !!G.edgeCross); // เดินข้ามขอบ = ป้ายชื่อเล็ก ไม่บังจอ
    el.style.backgroundImage = art && !G.edgeCross ? `url("${art.src}")` : '';
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    this._bannerUntil = performance.now() + (story && !G.edgeCross ? 4400 : 3300);
  },
  updateHud() {
    const p = G.player, d = p.d;
    $('#bi-name').textContent = p.name;
    this.drawPortrait();
    $$('#menubar [data-win]').forEach(b => b.classList.toggle('on', this.isOpen(b.dataset.win)));
    const em = Art.get('emblem_' + p.job), jobHtml = (em ? `<img src="${em.src}" alt="">` : '') + U.esc(JOBS[p.job].name);
    if ($('#bi-job').innerHTML !== jobHtml) $('#bi-job').innerHTML = jobHtml;
    this.updateTarget();
    if (this.isOpen('w-mob')) { const mv = $('#mb-mvp'); if (mv) { const s = this.mvpStatus(this.mobInfo); if (mv.textContent !== s) mv.textContent = s; } }
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
    // HUD แบบ Visor: วงแหวน HP/SP รอบรูป + เส้น EXP ล่างจอ
    const ring = (el, r, k) => { const c = 2 * Math.PI * r, v = `${(c * U.clamp(k, 0, 1)).toFixed(1)} ${c.toFixed(1)}`; if (el.getAttribute('stroke-dasharray') !== v) el.setAttribute('stroke-dasharray', v); };
    ring($('#ring-hp'), 37, p.hp / d.maxHp); ring($('#ring-sp'), 33, p.sp / d.maxSp);
    $('#ring-hp').classList.toggle('low', p.hp / d.maxHp < 0.25);
    $('#exp-line-fill').style.width = (bk * 100).toFixed(1) + '%';
    // ใกล้เลเวลแล้ว: แสงกวาดบนแถบ EXP (≥90%) + ป้ายเลเวลเต้น (≥97%) — GAME_FEEL ข้อ 13
    const near = bk >= 0.9 && bk < 1 && p.baseLv < MAX_BASE_LV;
    $('#bi-bexp').classList.toggle('near', near); $('#exp-line-fill').classList.toggle('near', near);
    $('#bi-lvbadge').classList.toggle('near', near && bk >= 0.97);
    $('#bi-hp-t').textContent = `${Math.floor(p.hp)} / ${d.maxHp}`;
    $('#bi-sp-t').textContent = `${Math.floor(p.sp)} / ${d.maxSp}`;
    // เงินนับขึ้นแบบไหล (0.4 วิ) + วาบเหลืองตอนได้เพิ่ม (GAME_FEEL ข้อ 14)
    const zt = this._zt || (this._zt = { show: p.zeny, from: p.zeny, to: p.zeny, t0: 0 }), nowZ = performance.now();
    if (zt.to !== p.zeny) {
      if (p.zeny > zt.to && zt.to !== undefined) { const ze0 = $('#bi-zeny'); ze0.classList.remove('zup'); void ze0.offsetWidth; ze0.classList.add('zup'); }
      zt.from = zt.show; zt.to = p.zeny; zt.t0 = nowZ;
      if (Math.abs(zt.to - zt.from) > 1e7 || matchMedia('(prefers-reduced-motion: reduce)').matches) zt.from = zt.to;
    }
    const zk = Math.min(1, (nowZ - zt.t0) / 400); zt.show = Math.round(zt.from + (zt.to - zt.from) * (1 - (1 - zk) * (1 - zk)));
    const zi = Art.get('item_zeny'), zHtml = (zi ? `<img src="${zi.src}" alt="">` : '') + U.fmt(zt.show) + ' ' + CUR;
    const ze = $('#bi-zeny');
    if (ze.innerHTML !== zHtml) { ze.innerHTML = zHtml; ze.classList.toggle('has-ic', !!zi); }
    const pts = [];
    if (p.statPoints > 0) pts.push(`<span class="pt" data-open="w-status">Status +${p.statPoints}</span>`);
    if (p.skillPoints > 0) pts.push(`<span class="pt" data-open="w-skills">Skill +${p.skillPoints}</span>`);
    const pf = Passive.free(p);
    if (pf > 0) pts.push(`<span class="pt" data-open="w-tree">Passive +${pf}</span>`);
    // มือถือแนวตั้ง: รวมป้ายแต้มเป็นอันเดียว (แตะแล้วเปิดหน้าต่างของแต้มอันแรกที่มี)
    const compact = innerWidth <= 760 && innerHeight > innerWidth && pts.length > 1;
    const ptsHtml = compact ? `<span class="pt" data-open="${/data-open="([^"]+)"/.exec(pts[0])[1]}">${'Points'} +${(p.statPoints || 0) + (p.skillPoints || 0) + Math.max(0, pf)}</span>` : pts.join(' ');
    const ptsEl = $('#bi-points');
    if (ptsEl.innerHTML !== ptsHtml) { ptsEl.innerHTML = ptsHtml; this.stackTop(); }
    // บัฟ
    const buffs = Object.keys(p.buffs).map(k => {
      const left = Math.ceil(p.buffs[k].until - G.time), s = SKILLS[k];
      const ic = Art.has('skill_' + k) ? `<img src="${Art.get('skill_' + k).src}" alt="">` : `<b>${s.glyph}</b>`;
      return `<div class="buff${left <= 10 ? ' ending' : ''}" style="--c:${s.icon}" title="${s.name}"><span class="bf-ic">${ic}</span><span class="bf-n">${s.name}</span><i>${fmtLeft(left)}</i></div>`;
    });
    if (p.poisonUntil > G.time) buffs.push(L(`<div class="buff debuff" style="--c:#a050e0" title="ติดพิษ"><span class="bf-ic"><b>✦</b></span><span class="bf-n">ติดพิษ</span><i>${fmtLeft(Math.ceil(p.poisonUntil - G.time))}</i></div>`, `<div class="buff debuff" style="--c:#a050e0" title="Poisoned"><span class="bf-ic"><b>✦</b></span><span class="bf-n">Poisoned</span><i>${fmtLeft(Math.ceil(p.poisonUntil - G.time))}</i></div>`));
    const bh = buffs.join('');
    const be = $('#buffs');
    if (be.innerHTML !== bh) { const n0 = be.childElementCount; be.innerHTML = bh; if (n0 !== be.childElementCount && (!n0 || !be.childElementCount)) this.stackTop(); }
    // คูลดาวน์บอสในแมพนี้ (ใต้มินิแมพ): นับถอยหลังจนเกิดใหม่ / เตือนเมื่อบอสอยู่ในแมพ
    const mv = $('#mm-mvp');
    if (mv) {
      const id = G.map.def.mvp; let t = '';
      if (id) {
        const alive = G.mobs.some(m => m.isMvp && !m.dead), left = mvpLeft(G.map.id);
        t = alive ? L(`⚠ MVP ${MOBS[id].name} อยู่ในแมพ`, `⚠ MVP ${MOBS[id].name} is here`) : left > 0 ? `MVP ${MOBS[id].name} · ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}` : '';
        mv.classList.toggle('alive', alive);
      }
      if (mv.textContent !== t) mv.textContent = t;
      if (mv.hidden === !!t) mv.hidden = !t;
    }
    // ลานประลอง PvP: สถิติฆ่า/ล้ม + จำนวนคู่ต่อสู้
    const ph = $('#pvp-hud');
    if (ph) {
      const on = !!(G.map && G.map.def.pvp);
      if (ph.hidden === on) ph.hidden = !on;
      if (on) {
        const s = p.pvp || { k: 0, d: 0 }, foes = G.mobs.filter(m => m.isPlayer).length;
        const html = L(`<b>⚔ ลานประลอง</b><span>ฆ่า <i>${s.k}</i></span><span>ล้ม <i>${s.d}</i></span><span class="pv-n">${Online.online ? `คู่ต่อสู้ ${foes} คน` : 'ต้องเล่นออนไลน์'}</span>`, `<b>⚔ Arena</b><span>Kills <i>${s.k}</i></span><span>Deaths <i>${s.d}</i></span><span class="pv-n">${Online.online ? `${foes} opponents` : 'Online only'}</span>`);
        if (ph.innerHTML !== html) ph.innerHTML = html;
      }
    }
    // โหมดเล็งสกิล: แถบบอกด้านบน
    const sa = $('#skill-aim');
    if (sa) {
      const id = G.pendingSkill;
      if (!id) { if (!sa.hidden) sa.hidden = true; }
      else {
        if (sa.dataset.id !== id) {
          sa.dataset.id = id; const ic = $('.sa-ic', sa); ic.innerHTML = ''; ic.append(this.skillIcon(id));
          $('.sa-t', sa).innerHTML = `<b>${SKILLS[id].name}</b> ${Pad.enabled() ? L('แตะมอนเพื่อใช้ • แตะซ้ำ = ตัวใกล้สุด', 'Tap a monster to cast • tap again = nearest') : L('คลิกมอนเพื่อใช้ • คลิกขวา/Esc ยกเลิก', 'Click a monster to cast • right-click/Esc to cancel')}`;
          $('#sa-x').onclick = () => { G.pendingSkill = null; };
        }
        sa.hidden = false;
      }
    }
    // ฮอตบาร์ (จำนวน/ดีเลย์สกิลแบบวงกวาด)
    $$('#hotbar .hb, #potbar .hb').forEach(el => {
      const hb = p[el.dataset.bar][+el.dataset.i];
      const cd = $('.cd', el);
      if (hb && hb.t === 'skill') {
        // วงกวาด: ดีเลย์รวม หรือคูลดาวน์ของสกิลนี้ (อันที่นานกว่า)
        const dl = p.skillReadyAt - G.time, cl = skillCdLeft(hb.id);
        const left = Math.max(dl, cl), tot = cl >= dl ? ((p.cdTot || {})[hb.id] || SKILLS[hb.id].cd || 1) : (p.skillDelayMs || 500) / 1000;
        const k = left > 0 ? U.clamp(left / tot, 0, 1) : 0;
        cd.style.height = k > 0 ? '100%' : '0';
        cd.style.setProperty('--cd', k.toFixed(3));
        const txt = k > 0 ? left.toFixed(1) : '';
        if (cd.textContent !== txt) cd.textContent = txt;
        // สกิลคูลดาวน์ยาวกลับมาพร้อมใช้: วงแสงขยายออก + เสียงติ๊งเบา ๆ (GAME_FEEL ข้อ 12)
        if (cl > 0) el._cdLong = (SKILLS[hb.id].cd || 0) >= 5;
        else if (el._cdLong) {
          el._cdLong = false; el.classList.remove('ready'); void el.offsetWidth; el.classList.add('ready');
          clearTimeout(el._rdT); el._rdT = setTimeout(() => el.classList.remove('ready'), 450);
          if (typeof Sound !== 'undefined' && p.options && p.options.sound !== false) Sound.play('click');
        }
        el.classList.toggle('aiming', G.pendingSkill === hb.id);
        el.classList.toggle('nosp', !canPaySkill(skillCost(hb.id, skillLv(hb.id))));
      } else { cd.style.height = '0'; if (cd.textContent) cd.textContent = ''; el.classList.remove('nosp', 'aiming'); }
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
      if (map.fountainImg || map.fountain3d) { g.fillStyle = '#5ad0f0'; g.beginPath(); g.arc(map.fountain.x * px, map.fountain.y * px, px * 1.3, 0, 7); g.fill(); }
      map._imgs[px] = c;
    }
    return map._imgs[px];
  },
  // ---------------- แผนที่ใหญ่ (M): แผนที่ภาพวาด ----------------
  // ชั้นนิ่ง (แคชต่อแมพ): พื้นจริง + โทนกระดาษอุ่น + ยอดไม้มีแสงเงา + ภาพอาคาร/น้ำพุ + เข็มทิศ + ขอบจาง
  // ชั้นเคลื่อนไหว (ทุกเฟรม): ป้ายชื่อแมพ, ประตูพร้อมป้ายปลายทาง, ไอคอน NPC, มอน, เพื่อน, เส้นทาง, หมุดเควสต์, ตัวเรา
  NPC_ICON: { tool: '🧪', weapon: '⚔️', armor: '🛡️', refine: '⚒️', nurse: '✚', guide: '★', storage: '📦', bifrost: '🌈', jobmaster: '📖', norn: '🎡', hel: '👑' },
  bigArt(map, S) {
    if (map._big && map._big.S === S && map._big.ground === map.ground) return map._big.c; // พื้นวาดใหม่ (ภาพโหลดเสร็จ) = สร้างใหม่
    const W = map.w * S, H = map.h * S, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(map.ground, 0, 0, W, H);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(244,228,198,0.38)'; g.fillRect(0, 0, W, H); // โทนกระดาษแผนที่
    g.globalCompositeOperation = 'source-over';
    // ยอดไม้: เงา + พุ่มไล่แสงจากซ้ายบน (สน = ทรงแหลม)
    const objs = map.objects.slice().sort((a, b) => a.y - b.y);
    for (const o of objs) {
      const x = o.x * S, y = o.y * S, hedge = o.kind === 'hedge', pine = !hedge && (map.def.pine || String(o.sp || '').startsWith('pine'));
      const r = S * (hedge ? 0.55 : 0.95) * Math.min(1.3, o.size || 1);
      g.fillStyle = 'rgba(20,30,10,0.32)'; g.beginPath(); g.ellipse(x + r * 0.35, y + r * 0.45, r * 1.05, r * 0.7, 0, 0, 7); g.fill();
      const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.1, x, y, r * 1.1);
      gr.addColorStop(0, pine ? '#5f9a5a' : '#8fd06a'); gr.addColorStop(0.6, pine ? '#2f6a3a' : '#4c9a3c'); gr.addColorStop(1, pine ? '#1c4426' : '#2a6428');
      g.fillStyle = gr; g.beginPath();
      if (pine) { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i / 10 * Math.PI * 2, rr = i % 2 ? r * 0.62 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); }
      else { for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; g.moveTo(x + Math.cos(a) * r * 0.45 + r * 0.42, y + Math.sin(a) * r * 0.45); g.arc(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45, r * 0.42, 0, 7); } g.arc(x, y, r * 0.6, 0, 7); }
      g.fill();
    }
    // อาคาร/น้ำพุจากภาพจริง (ย่อเป็นภาพบนแผนที่)
    for (const b of map.buildings) {
      const img = b.img && Art.get(b.img); if (!img) continue;
      const bw = b.w * S * 1.1, bh = bw * img.height / img.width, bx = (b.x + b.w / 2) * S - bw / 2, by = (b.y + b.h) * S - bh;
      g.fillStyle = 'rgba(20,24,30,0.3)'; g.beginPath(); g.ellipse((b.x + b.w / 2) * S + 6, (b.y + b.h) * S - 4, bw * 0.48, S * 0.9, 0, 0, 7); g.fill();
      g.drawImage(img, bx, by, bw, bh);
    }
    const fimg = map.fountainImg && Art.get('prop_fountain');
    if (fimg) { const fw = S * 3.6, fh = fw * fimg.height / fimg.width; g.drawImage(fimg, map.fountain.x * S - fw / 2, (map.fountain.y + 1.3) * S - fh, fw, fh); }
    else if (map.fountain3d) for (const o of map.props) { // น้ำพุ 3D (js/bake.js): เฟรมแรกของแกนน้ำพุ + เสาคริสตัล (ขอบสระอยู่ในพื้นแล้ว)
      const pc = o.kind === 'bake' && o.pc, img = pc && pc.id.startsWith('fountain') && Art.get(pc.img); if (!img) continue;
      const k = S / TILE * pc.scale, fw = pc.fw || img.width, fh = pc.fh || img.height;
      g.drawImage(img, 0, 0, fw, fh, pc.x * S - pc.ax * k, pc.y * S - pc.ay * k, fw * k, fh * k);
    }
    // ขอบจาง (vignette) + เส้นขอบด้านใน
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.56);
    vg.addColorStop(0, 'rgba(30,20,8,0)'); vg.addColorStop(1, 'rgba(30,20,8,0.55)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    // เข็มทิศ (มุมขวาล่าง)
    const cx = W - 46, cy = H - 46, R0 = 30;
    g.save(); g.translate(cx, cy);
    g.fillStyle = 'rgba(20,16,8,0.55)'; g.beginPath(); g.arc(0, 0, R0 + 8, 0, 7); g.fill();
    g.strokeStyle = 'rgba(215,178,90,0.9)'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, R0 + 4, 0, 7); g.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 - Math.PI / 2, L0 = i % 2 ? R0 * 0.55 : R0;
      g.fillStyle = i === 0 ? '#ff6a5a' : i % 2 ? '#bfa66a' : '#f4e2b0';
      g.beginPath(); g.moveTo(Math.cos(a) * L0, Math.sin(a) * L0); g.lineTo(Math.cos(a + 0.35) * L0 * 0.22, Math.sin(a + 0.35) * L0 * 0.22); g.lineTo(0, 0); g.lineTo(Math.cos(a - 0.35) * L0 * 0.22, Math.sin(a - 0.35) * L0 * 0.22); g.closePath(); g.fill();
    }
    g.font = '800 11px Kanit, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffe9b0'; g.fillText('N', 0, -R0 - 13 < -cy ? -R0 + 4 : -R0 - 0.5 - 12);
    g.restore();
    map._big = { S, c, ground: map.ground };
    return c;
  },
  drawBigMap(cv) {
    const map = G.map, p = G.player, S = map.w * map.h > 6000 ? 8 : 10;
    const base = this.bigArt(map, S), W = base.width, H = base.height;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; cv.style.width = `min(100%, calc((100vh - 270px) * ${(W / H).toFixed(4)}))`; } // คงสัดส่วนจริง (คลิกตรงช่อง)
    const g = cv.getContext('2d'), t = performance.now() / 1000;
    g.drawImage(base, 0, 0);
    // ตัวหนังสือย่อตามสเกลที่แสดงจริง (แมพเล็กถูกขยาย → ตัวหนังสือไม่บวม) • ป้ายไม่ทับกัน: ลองบน/ล่าง/ขวา/ซ้าย
    const disp = cv.clientWidth ? W / cv.clientWidth : 1, placed = [];
    const label = (txt, x, y, col = '#fff4d0', size = 13, align = 'center') => {
      g.font = `700 ${Math.round(size * Math.max(0.7, disp))}px Kanit, "Noto Sans Thai", sans-serif`; g.textAlign = align; g.textBaseline = 'middle'; g.lineJoin = 'round';
      g.lineWidth = 4 * Math.max(0.7, disp); g.strokeStyle = 'rgba(16,10,4,0.85)'; g.strokeText(txt, x, y); g.fillStyle = col; g.fillText(txt, x, y);
    };
    const place = (txt, x, y, offs, col, size) => {
      g.font = `700 ${Math.round(size * Math.max(0.7, disp))}px Kanit, "Noto Sans Thai", sans-serif`;
      const w = g.measureText(txt).width + 6, h = size * Math.max(0.7, disp) + 4;
      for (const [ox, oy, al] of offs) {
        const lx = al === 'left' ? x + ox : al === 'right' ? x + ox - w : x + ox - w / 2, r = [lx, y + oy - h / 2, w, h];
        if (r[0] < 2 || r[0] + w > W - 2 || r[1] < 2 || r[1] + h > H - 2) continue;
        if (placed.some(q => r[0] < q[0] + q[2] && q[0] < r[0] + w && r[1] < q[1] + q[3] && q[1] < r[1] + h)) continue;
        placed.push(r); label(txt, x + ox, y + oy, col, size, al); return;
      }
    };
    placed.push([W / 2 - 110, 4, 220, 50]); // ป้ายชื่อแมพ
    // เส้นทางที่กำลังเดิน
    if (p.path.length) {
      g.strokeStyle = 'rgba(255,226,120,0.95)'; g.lineWidth = 3; g.setLineDash([6, 5]); g.lineDashOffset = -t * 20;
      g.beginPath(); g.moveTo(p.x * S, p.y * S); for (const n of p.path) g.lineTo((n.x + 0.5) * S, (n.y + 0.5) * S); g.stroke(); g.setLineDash([]);
      const last = p.path[p.path.length - 1]; g.fillStyle = '#ffe36a'; g.beginPath(); g.arc((last.x + 0.5) * S, (last.y + 0.5) * S, 6, 0, 7); g.fill();
    }
    // ประตู: ซุ้มเรืองแสง + ป้ายปลายทางพร้อมลูกศรทิศ
    for (const pt of map.portals) {
      const x = (pt.x + 0.5) * S, y = (pt.y + 0.5) * S, pulse = 1 + Math.sin(t * 3) * 0.12;
      const gr = g.createRadialGradient(x, y, 2, x, y, S * 1.6 * pulse); gr.addColorStop(0, 'rgba(140,235,255,0.9)'); gr.addColorStop(1, 'rgba(140,235,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, S * 1.6 * pulse, 0, 7); g.fill();
      g.fillStyle = '#e8fbff'; g.strokeStyle = '#0a3a5a'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.stroke();
      const side = typeof WORLD !== 'undefined' ? WORLD.sideOf(map, pt) : 'E', arrow = { E: '➜', W: '⬅', N: '⬆', S: '⬇' }[side];
      const txt = `${side === 'W' || side === 'N' ? arrow + ' ' : ''}${MAP_DEFS[pt.to].name}${side === 'E' || side === 'S' ? ' ' + arrow : ''}`, al = side === 'W' ? 'left' : side === 'E' ? 'right' : 'center';
      const d = 16 * Math.max(0.7, disp);
      place(txt, x, y, side === 'N' ? [[0, d * 1.4, al], [d * 1.2, d * 2.4, 'left']] : side === 'S' ? [[0, -d * 1.4, al], [d * 1.2, -d * 2.4, 'left']] : [[side === 'W' ? d : -d, -d, al], [side === 'W' ? d : -d, d, al], [side === 'W' ? d : -d, -d * 2, al]], '#bff4ff', 14);
    }
    // NPC: วงทองพร้อมไอคอนหน้าที่
    for (const n of G.npcs) {
      const x = (n.x + 0.5) * S, y = (n.y + 0.5) * S;
      g.fillStyle = 'rgba(20,14,4,0.75)'; g.strokeStyle = '#ffd56a'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 10, 0, 7); g.fill(); g.stroke();
      g.font = '12px "Segoe UI Emoji", "Noto Color Emoji", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffe9a0';
      g.fillText(this.NPC_ICON[n.id] || '●', x, y + 0.5);
      const d = 13 * Math.max(0.7, disp) + 6;
      place(n.name, x, y, [[0, -d, 'center'], [0, d, 'center'], [d, 0, 'left'], [-d, 0, 'right'], [0, -d * 1.9, 'center'], [0, d * 1.9, 'center']], '#fff1c0', 12.5);
    }
    for (const m of G.mobs) {
      if (m.dead || m.isPlayer || m.def.dummy) continue;
      if (m.isMvp || m.isWB) { const k = 1 + Math.sin(t * 6) * 0.2; g.fillStyle = 'rgba(255,40,40,0.35)'; g.beginPath(); g.arc(m.x * S, m.y * S, 14 * k, 0, 7); g.fill(); label('☠', m.x * S, m.y * S, '#ff6a5a', 16); }
      else { g.fillStyle = m.state === 'chase' ? '#ff4a4a' : 'rgba(255,150,140,0.85)'; g.beginPath(); g.arc(m.x * S, m.y * S, m.state === 'chase' ? 3.5 : 2.6, 0, 7); g.fill(); }
    }
    for (const o of Online.others.values()) { g.fillStyle = '#7dffb0'; g.strokeStyle = '#0a3a20'; g.lineWidth = 1.5; g.beginPath(); g.arc(o.x * S, o.y * S, 5, 0, 7); g.fill(); g.stroke(); }
    if (G.started && typeof Quest !== 'undefined') {
      const qw = Nav.waypoint(Quest.navTarget());
      if (qw && !qw.none) { g.save(); g.translate((qw.x + 0.5) * S, (qw.y + 0.5) * S - Math.abs(Math.sin(t * 3)) * 4); g.scale(1.9, 1.9); this.drawQuestPin(g, 0, 0, null); g.restore(); }
    }
    // ตัวเรา: วงคลื่น + ลูกศรทิศ
    const k = (t % 1.4) / 1.4;
    g.strokeStyle = `rgba(255,214,90,${1 - k})`; g.lineWidth = 2.5; g.beginPath(); g.arc(p.x * S, p.y * S, 8 + k * 22, 0, 7); g.stroke();
    const ang = (p.dir != null ? p.dir : 2) * Math.PI / 4, pr = 11;
    g.save(); g.translate(p.x * S, p.y * S); g.rotate(ang);
    g.shadowColor = '#ffd34a'; g.shadowBlur = 10; g.fillStyle = '#fff6d8'; g.strokeStyle = '#b81818'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(pr, 0); g.lineTo(-pr * 0.7, pr * 0.68); g.lineTo(-pr * 0.32, 0); g.lineTo(-pr * 0.7, -pr * 0.68); g.closePath(); g.fill(); g.stroke();
    g.restore();
    // ป้ายชื่อแมพ (บนกลาง)
    const title = map.def.name, sub = map.def.kind === 'town' ? L('เมือง • ปลอดภัย', 'Town • Safe') : `Lv ${String(map.def.level || '').replace(/\s*\(.*\)/, '')}`;
    g.font = '800 18px Kanit, sans-serif'; const tw = Math.max(g.measureText(title).width, 120) + 56;
    const tx = W / 2, ty = 26;
    g.fillStyle = 'rgba(24,16,6,0.82)'; g.beginPath(); if (g.roundRect) g.roundRect(tx - tw / 2, ty - 18, tw, 44, 10); else g.rect(tx - tw / 2, ty - 18, tw, 44); g.fill();
    g.strokeStyle = 'rgba(215,178,90,0.95)'; g.lineWidth = 1.5; g.stroke();
    label(title, tx, ty - 2, '#ffe6a6', 18); label(sub, tx, ty + 16, '#d8c8a0', 11);
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
      if (m.dead || m.isPlayer) continue; // คู่ต่อสู้ PvP วาดในส่วนผู้เล่นอื่นแล้ว
      if (m.isMvp) { g.fillStyle = (Math.floor(G.time * 4) % 2) ? '#ff2020' : '#ffffff'; g.beginPath(); g.arc(m.x * S, m.y * S, big ? 7 : 4, 0, 7); g.fill(); }
      else if (big || m.state === 'chase') { g.fillStyle = m.state === 'chase' ? '#ff5050' : 'rgba(255,170,170,0.8)'; g.beginPath(); g.arc(m.x * S, m.y * S, big ? 2.5 : 1.3, 0, 7); g.fill(); }
    }
    for (const o of Online.others.values()) { g.fillStyle = '#7dffb0'; g.beginPath(); g.arc(o.x * S, o.y * S, big ? 4 : 2.5, 0, 7); g.fill(); }
    if (big && G.started && typeof Quest !== 'undefined') { // หมุดเควสต์บนแผนที่ใหญ่
      const qw = Nav.waypoint(Quest.navTarget());
      if (qw && !qw.none) { g.save(); g.translate((qw.x + 0.5) * S, (qw.y + 0.5) * S); g.scale(1.6, 1.6); this.drawQuestPin(g, 0, 0, null); g.restore(); }
    }
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
    const square = document.body.classList.contains('visor');
    g.beginPath(); if (square) { const rr = W * 0.115; if (g.roundRect) g.roundRect(0, 0, W, H, rr); else g.rect(0, 0, W, H); } else g.arc(W / 2, H / 2, W / 2, 0, 7); g.clip();
    g.fillStyle = '#060a12'; g.fillRect(0, 0, W, H);
    g.imageSmoothingEnabled = true;
    g.drawImage(full, x0 * S, y0 * S, span * S, span * S, 0, 0, W, H);
    // โทนเรดาร์ + เส้นกริด
    g.fillStyle = 'rgba(10,30,50,0.28)'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(120,220,255,0.12)'; g.lineWidth = 1;
    if (!square) for (let r = W / 6; r < W / 2; r += W / 6) { g.beginPath(); g.arc(W / 2, H / 2, r, 0, 7); g.stroke(); }
    g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
    // คลื่นกวาด
    const sw = (G.time * 1.2) % (Math.PI * 2);
    const grad = g.createConicGradient ? g.createConicGradient(sw, W / 2, H / 2) : null;
    if (grad) {
      grad.addColorStop(0, 'rgba(120,230,255,0.22)'); grad.addColorStop(0.12, 'rgba(120,230,255,0)'); grad.addColorStop(1, 'rgba(120,230,255,0)');
      g.fillStyle = grad; g.fillRect(0, 0, W, H);
    }
    g.restore();
    // เป้าหมายเควสต์บนเรดาร์ (นอกวง = ลูกศรที่ขอบชี้ทาง)
    const qw = G.started && typeof Quest !== 'undefined' ? Nav.waypoint(Quest.navTarget()) : null;
    if (qw && !qw.none) {
      let mx = (qw.x + 0.5 - x0) / span * W, my = (qw.y + 0.5 - y0) / span * H;
      const dx = mx - W / 2, dy = my - H / 2, d = Math.hypot(dx, dy), R0 = W / 2 - 7;
      const out = d > R0;
      if (out) { mx = W / 2 + dx / d * R0; my = H / 2 + dy / d * R0; }
      this.drawQuestPin(g, mx, my, out ? Math.atan2(dy, dx) : null);
    }
    $('#map-coord').textContent = Online.online ? `👥 ${Math.max(1, Online.count)} • ${Math.floor(p.x)}, ${Math.floor(p.y)}` : `${Math.floor(p.x)}, ${Math.floor(p.y)}`;
    if (this.isOpen('w-map')) this.drawBigMap($('#bigmap-cv'));
    if (this.isOpen('w-world') && $('#worldmap-cv')) this.drawWorldMap($('#worldmap-cv'));
  },
  // หมุดเควสต์ (ทอง): ไม่มีมุม = อยู่ในระยะ • มีมุม = ลูกศรชี้ออกนอกเรดาร์
  drawQuestPin(g, x, y, ang) {
    const pulse = 1 + Math.sin(G.time * 5) * 0.12;
    g.save(); g.translate(x, y);
    g.shadowColor = '#ffb020'; g.shadowBlur = 8; g.fillStyle = '#ffd34a'; g.strokeStyle = '#5a3a00'; g.lineWidth = 1.2;
    if (ang == null) { g.scale(pulse, pulse); g.beginPath(); g.moveTo(0, -6); g.lineTo(5, 0); g.lineTo(0, 6); g.lineTo(-5, 0); g.closePath(); g.fill(); g.stroke(); }
    else { g.rotate(ang); g.beginPath(); g.moveTo(7, 0); g.lineTo(-4, -5); g.lineTo(-1, 0); g.lineTo(-4, 5); g.closePath(); g.fill(); g.stroke(); }
    g.restore();
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
        const el = h('div', { class: 'hb', 'data-i': i, 'data-bar': bar, title: L(`ปุ่มลัด ${cfg.keys[i]}`, `Hotkey ${cfg.keys[i]}`) },
          h('div', { class: 'ic' }), h('span', { class: 'k' }, cfg.keys[i]), h('span', { class: 'q' }), h('div', { class: 'cd' }));
        const use = () => (G.player[bar][i] ? (bar === 'hotbar' ? useHotbar(i) : usePotbar(i)) : this.chooseFor(bar, i, el)); // ช่องว่าง: แตะเพื่อเลือกสกิล/ไอเทม
        const clear = () => { if (G.player[bar][i]) { G.player[bar][i] = null; this.msg(L(`ล้างปุ่มลัด ${cfg.keys[i]}`, `Cleared hotkey ${cfg.keys[i]}`), 'info'); this.dirty(); } };
        let lpTimer = null, lpFired = false;
        el.addEventListener('pointerdown', e => {
          e.stopPropagation();
          if (e.pointerType === 'mouse' || this.equipMode) return;
          lpFired = false;
          el.classList.add('press');
          lpTimer = setTimeout(() => { lpFired = true; this.chooseFor(bar, i, el); }, 550); // แตะค้าง: เปลี่ยน/ล้างช่องนี้
        });
        const cancelLp = () => { clearTimeout(lpTimer); el.classList.remove('press'); };
        el.addEventListener('pointerup', cancelLp); el.addEventListener('pointerleave', cancelLp); el.addEventListener('pointercancel', cancelLp);
        el.addEventListener('click', () => {
          if (this.equipMode) { if (this.equipMode.bar === bar) this.finishEquip(i); return; } // โหมดติดตั้ง: แตะช่อง = วางสกิล/ไอเทมลงช่องนี้
          if (lpFired) { lpFired = false; return; } use();
        });
        el.addEventListener('contextmenu', e => { e.preventDefault(); clear(); });
        el.addEventListener('dragover', e => e.preventDefault());
        el.addEventListener('drop', e => {
          e.preventDefault();
          try {
            const d = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (d.t !== cfg.t) { this.msg(cfg.t === 'skill' ? L('แถบนี้สำหรับสกิลเท่านั้น', 'This bar is for skills only') : L('แถบนี้สำหรับไอเทมเท่านั้น', 'This bar is for items only'), 'err'); return; }
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
      ic.innerHTML = ''; q.textContent = ''; el.title = L(`ปุ่มลัด ${key}`, `Hotkey ${key}`);
      el.classList.remove('empty', 'has-tip'); el._tip = null; el.classList.toggle('blank', !x);
      if (x && x.t === 'skill' && !skillLv(x.id)) { p[bar][i] = null; el.classList.add('blank'); return; }
      if (!x) return;
      if (x.t === 'skill') {
        ic.append(this.skillIcon(x.id));
        q.textContent = 'Lv' + skillLv(x.id);
        const sk = SKILLS[x.id], lv = skillLv(x.id), cost = skillCost(x.id, lv);
        el.title = `${sk.name} Lv ${lv} [${key}]${cost ? ` • SP ${cost}` : ''}${sk.cd ? L(` • คูลดาวน์ ${+(sk.cd * (1 - (G.player.d.cdCut || 0) / 100)).toFixed(1)} วิ`, ` • Cooldown ${+(sk.cd * (1 - (G.player.d.cdCut || 0) / 100)).toFixed(1)}s`) : ''}\n${sk.desc || ''}`;
        this.skillTipFor(el, x.id);
      } else {
        ic.append(h('img', { src: itemIconUrl(x.id), alt: '' }));
        q.textContent = countItem(x.id);
        el.title = `${ITEMS[x.id].name} ×${countItem(x.id)} [${key}]\n${ITEMS[x.id].desc || ''}`;
        this.tipFor(el, G.player.inventory.find(e => e.id === x.id) || { id: x.id }); el.removeAttribute('title');
      }
    });
  },
  assignHotbar(t, id) {
    const p = G.player, bar = t === 'skill' ? 'hotbar' : 'potbar', keys = this.BARS[bar].keys;
    if (p[bar].some(x => x && x.t === t && x.id === id)) { this.msg(L('อยู่ในปุ่มลัดแล้ว', 'Already on the hotbar'), 'info'); return; }
    const i = p[bar].findIndex(x => !x);
    if (i < 0) { this.msg(t === 'skill' ? L('แถบสกิลเต็ม (แตะค้าง/คลิกขวาที่ช่องเพื่อลบ)', 'Skill bar full (long-press/right-click a slot to clear)') : L('แถบไอเทมเต็ม (แตะค้าง/คลิกขวาที่ช่องเพื่อลบ)', 'Item bar full (long-press/right-click a slot to clear)'), 'err'); return; }
    p[bar][i] = { t, id };
    this.msg(L(`ตั้งปุ่มลัด ${keys[i]}: ${t === 'skill' ? SKILLS[id].name : ITEMS[id].name}`, `Hotkey ${keys[i]}: ${t === 'skill' ? SKILLS[id].name : ITEMS[id].name}`), 'info');
    this.dirty();
  },
  // ตั้งสกิล/ไอเทมลงช่องที่เลือกเอง (ถ้าอยู่ช่องอื่นอยู่แล้ว = สลับช่องกัน)
  bindSlot(t, id, i) {
    const p = G.player, bar = t === 'skill' ? 'hotbar' : 'potbar', keys = this.BARS[bar].keys;
    if (i < 0 || i >= keys.length) return;
    const from = p[bar].findIndex(x => x && x.t === t && x.id === id), prev = p[bar][i];
    if (from === i) { this.msg(L(`อยู่ที่ปุ่ม ${keys[i]} แล้ว`, `Already on ${keys[i]}`), 'info'); return; }
    p[bar][i] = { t, id };
    if (from >= 0) p[bar][from] = prev || null;
    this.msg(L(`ตั้งปุ่มลัด ${keys[i]}: ${t === 'skill' ? SKILLS[id].name : ITEMS[id].name}`, `Hotkey ${keys[i]}: ${t === 'skill' ? SKILLS[id].name : ITEMS[id].name}`), 'info');
    Sound.play('click'); this.dirty();
  },
  // ชี้ที่สกิล (หน้าต่างสกิล) แล้วกด 1–8 / ชี้ที่ไอเทม (กระเป๋า) แล้วกด Z C V F = ตั้งปุ่มลัดช่องนั้นทันที
  hoverBind: null,
  markBind(el, t, id) {
    el.addEventListener('pointerenter', () => { this.hoverBind = { t, id, el }; });
    el.addEventListener('pointerleave', () => { if (this.hoverBind && this.hoverBind.el === el) this.hoverBind = null; });
    return el;
  },
  bindKey(k) {
    const b = this.hoverBind;
    if (!b || !b.el.isConnected || !b.el.matches(':hover')) return false;
    const bar = b.t === 'skill' ? 'hotbar' : 'potbar', i = this.BARS[bar].keys.findIndex(x => x.toLowerCase() === k);
    if (i < 0) return false;
    this.bindSlot(b.t, b.id, i); return true;
  },
  // ---------- โหมดติดตั้งแบบเกมมือถือมาตรฐาน: เลือกสกิล → กด "ติดตั้ง" → ช่องจริงบนจอสว่างขึ้น → แตะช่องที่ต้องการ ----------
  equipMode: null,
  startEquip(t, id) {
    document.getElementById('slot-pick')?.remove();
    this.cancelEquip(true);
    const bar = t === 'skill' ? 'hotbar' : 'potbar';
    const wins = $$('.win:not(.hidden)').map(w => w.id).filter(w => w !== 'w-dialog');
    wins.forEach(w => $('#' + w).classList.add('hidden')); // หลบหน้าต่างให้เห็นช่องบนจอ
    this.equipMode = { t, id, bar, wins };
    document.body.classList.add('equip-mode', 'equip-' + bar);
    const name = t === 'skill' ? SKILLS[id].name : ITEMS[id].name;
    const ic = t === 'skill' ? this.skillIcon(id) : h('img', { src: itemIconUrl(id), alt: '' });
    const ban = h('div', { id: 'equip-banner', role: 'status' }, h('div', { class: 'eb-ic' }, ic),
      h('div', { class: 'eb-t' }, h('b', {}, name), h('span', {}, L('แตะช่องที่สว่างเพื่อวาง', 'Tap a glowing slot to place it'))),
      h('button', { type: 'button', class: 'btn small', onclick: e => { e.stopPropagation(); this.cancelEquip(); } }, 'Cancel'));
    document.body.append(ban);
    Sound.play('click');
  },
  finishEquip(i) {
    const m = this.equipMode; if (!m) return;
    this.bindSlot(m.t, m.id, i);
    this.cancelEquip();
  },
  cancelEquip(silent) {
    const m = this.equipMode; if (!m) return;
    this.equipMode = null;
    document.body.classList.remove('equip-mode', 'equip-hotbar', 'equip-potbar');
    document.getElementById('equip-banner')?.remove();
    if (!silent) m.wins.forEach(w => this.open(w)); // กลับไปหน้าต่างเดิม จะติดตั้งสกิลอื่นต่อได้เลย
  },
  // แตะช่องปุ่มลัดที่ว่าง / แตะค้างช่องที่มีของ → เลือกสกิล (หรือไอเทม) ใส่ช่องนั้นได้เลย ไม่ต้องลาก (มือถือ)
  chooseFor(bar, i, anchor) {
    document.getElementById('slot-pick')?.remove();
    const p = G.player, cfg = this.BARS[bar], cur = p[bar][i];
    const opts = cfg.t === 'skill'
      ? Object.keys(p.skills).filter(k => SKILLS[k] && SKILLS[k].type === 'active' && skillLv(k) > 0)
      : [...new Set(p.inventory.filter(e => ITEMS[e.id] && ITEMS[e.id].type === 'use').map(e => e.id))];
    const close = () => { box.remove(); document.removeEventListener('pointerdown', outside, true); };
    const outside = e => { if (!box.contains(e.target)) close(); };
    const box = h('div', { id: 'slot-pick', class: 'slot-pick choose', role: 'dialog' },
      h('div', { class: 'sp-h' }, cfg.t === 'skill' ? L(`เลือกสกิลใส่ปุ่ม ${cfg.keys[i]}`, `Pick a skill for slot ${cfg.keys[i]}`) : L(`เลือกไอเทมใส่ปุ่ม ${cfg.keys[i]}`, `Pick an item for slot ${cfg.keys[i]}`)),
      opts.length ? h('div', { class: 'sp-grid' }, ...opts.map(id => {
        const on = cur && cur.id === id;
        const ic = cfg.t === 'skill' ? this.skillIcon(id) : h('img', { src: itemIconUrl(id), alt: '' });
        return h('button', { type: 'button', class: 'sp-opt' + (on ? ' cur' : ''), onclick: e => { e.stopPropagation(); close(); this.bindSlot(cfg.t, id, i); } },
          h('div', { class: 'sp-ic' }, ic), h('span', {}, cfg.t === 'skill' ? SKILLS[id].name : ITEMS[id].name));
      })) : h('div', { class: 'sp-tip' }, cfg.t === 'skill' ? L('ยังไม่มีสกิลที่ใช้งานได้ — อัปสกิลในหน้าต่างสกิลก่อน', 'No active skills yet — learn one in the Skills window first') : L('ไม่มีไอเทมที่ใช้ได้ในกระเป๋า', 'No usable items in your bag')),
      h('div', { class: 'sp-foot' },
        cur ? h('button', { type: 'button', class: 'btn small', onclick: e => { e.stopPropagation(); close(); p[bar][i] = null; this.msg(L(`ล้างปุ่มลัด ${cfg.keys[i]}`, `Cleared hotkey ${cfg.keys[i]}`), 'info'); this.dirty(); } }, L('ล้างช่องนี้', 'Clear slot')) : null,
        h('button', { type: 'button', class: 'btn small', onclick: e => { e.stopPropagation(); close(); } }, 'Close')));
    document.body.append(box);
    const r = anchor.getBoundingClientRect(), bw = box.offsetWidth, bh = box.offsetHeight;
    box.style.left = Math.max(8, Math.min(innerWidth - bw - 8, r.left + r.width / 2 - bw / 2)) + 'px';
    box.style.top = Math.max(8, Math.min(innerHeight - bh - 8, r.top - bh - 10)) + 'px';
    setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
  },
  // ปุ่ม 📌: เลือกช่องปุ่มลัดเอง (ใช้ได้ทั้งเมาส์และจอสัมผัส)
  pickSlot(t, id, anchor) {
    document.getElementById('slot-pick')?.remove();
    const p = G.player, bar = t === 'skill' ? 'hotbar' : 'potbar', keys = this.BARS[bar].keys;
    const box = h('div', { id: 'slot-pick', class: 'slot-pick', role: 'dialog' },
      h('div', { class: 'sp-h' }, L('เลือกช่องปุ่มลัด', 'Choose a hotkey slot')),
      h('div', { class: 'sp-row' }, ...keys.map((k, i) => {
        const x = p[bar][i], cur = x && x.t === t && x.id === id;
        const ic = !x ? null : x.t === 'skill' ? this.skillIcon(x.id) : h('img', { src: itemIconUrl(x.id), alt: '' });
        return h('button', { type: 'button', class: 'sp-slot' + (cur ? ' cur' : '') + (x ? '' : ' empty'), title: x ? (x.t === 'skill' ? SKILLS[x.id].name : ITEMS[x.id].name) : 'Empty',
          onclick: e => { e.stopPropagation(); box.remove(); this.bindSlot(t, id, i); } }, h('div', { class: 'sp-ic' }, ic), h('b', {}, k));
      })),
      h('div', { class: 'sp-tip' }, matchMedia('(pointer: coarse)').matches ? L('ทางลัด: แตะช่องว่างข้างปุ่มโจมตีเพื่อเลือกสกิล • แตะค้างเพื่อเปลี่ยน/ล้าง', 'Shortcut: tap an empty slot by the attack button to pick a skill • long-press to change/clear') : L(`ทางลัด: ชี้ที่${t === 'skill' ? 'สกิล' : 'ไอเทม'}แล้วกด ${keys.join(' ')} • คลิกขวาที่ปุ่มลัดเพื่อล้าง`, `Shortcut: hover the ${t === 'skill' ? 'skill' : 'item'} and press ${keys.join(' ')} • right-click a hotkey to clear it`)));
    document.body.append(box);
    const r = anchor.getBoundingClientRect(), bw = box.offsetWidth, bh = box.offsetHeight;
    box.style.left = Math.max(8, Math.min(innerWidth - bw - 8, r.right - bw)) + 'px';
    box.style.top = (r.bottom + 6 + bh < innerHeight ? r.bottom + 6 : Math.max(8, r.top - bh - 6)) + 'px';
    const close = e => { if (!box.contains(e.target)) { box.remove(); document.removeEventListener('pointerdown', close, true); } };
    setTimeout(() => document.addEventListener('pointerdown', close, true), 0);
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
      emote: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4 4 0 0 0 7 0"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/>',
      quest: '<path d="M6 3h9l3 3v15H6z"/><path d="M9 9h6M9 13h6M9 17h4"/>',
      tree: '<circle cx="12" cy="12" r="2.5"/><circle cx="12" cy="4" r="1.6"/><circle cx="19" cy="16" r="1.6"/><circle cx="5" cy="16" r="1.6"/><path d="M12 9.5V5.6M14.2 13.2l3.4 2M9.8 13.2l-3.4 2"/>',
      nav: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
      party: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.6 3-5.6 6-5.6s5.4 2 6 5.6"/><circle cx="17" cy="9" r="2.6"/><path d="M15.6 14.6c2.6-.4 4.8 1.3 5.4 4.4"/>',
      help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"/><circle cx="12" cy="17" r=".6"/>',
      sit: '<path d="M6 21v-5h9l3 5"/><circle cx="10" cy="5" r="2.5"/><path d="M10 8v8M10 11h5"/>',
    };
    const icon = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${P[k]}</svg>`;
    const items = [
      ['w-status', 'Status', 'A', 'status'], ['w-inv', 'Items', 'E', 'bag'], ['w-equip', 'Equip', 'Q', 'equip'],
      ['w-skills', 'Skills', 'S', 'skill'], ['w-tree', 'Passive', 'P', 'tree'], ['w-map', 'Map', 'M', 'map'], ['w-quest', 'Quests', 'J', 'quest'], ['w-party', 'Party', 'Y', 'party'], ['w-emote', 'Emote', 'Alt', 'emote'], ['w-nav', 'Navi', 'G', 'nav'], ['w-bot', 'Bot', 'N', 'bot'], ['w-options', 'Settings', 'O', 'options'], ['w-help', 'Help', 'H', 'help'],
    ];
    const m = $('#menubar');
    for (const [id, label, key, ic] of items) {
      const b = h('button', { onclick: () => { this.toggle(id); if (Pad.enabled()) this.setFold(m, true); }, title: `${label} (${key})`, 'data-win': id });
      b.innerHTML = `${icon(ic)}<span>${label}</span><small>${key}</small>`;
      m.append(b);
    }
    const sit = h('button', { onclick: () => { toggleSit(); if (Pad.enabled()) this.setFold(m, true); }, title: L('นั่งพัก (X)', 'Sit (X)'), 'data-ic': 'sit' });
    sit.innerHTML = L(`${icon('sit')}<span>นั่ง</span><small>X</small>`, `${icon('sit')}<span>Sit</span><small>X</small>`);
    m.append(sit);
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-open]');
      if (t) this.open(t.dataset.open);
    });
  },
  // ภาพหน้าตัวละครในกรอบวงกลม (วาดใหม่เมื่อ Class/อุปกรณ์หัวเปลี่ยน)
  drawPortrait() {
    const p = G.player, cv = $('#bi-portrait');
    const artKey = Art.jobKey(p.job, p.gender);
    const key = [p.job, p.hair, p.gender, p.equip.head && p.equip.head.id, artKey, JSON.stringify(p.look || {})].join('|');
    if (cv.dataset.key === key) return;
    cv.dataset.key = key;
    const g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    const gk = Anim.playerKey(p.job, p.gender);
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
    if (this.isOpen('w-quest')) this.renderQuest();
    if (this.isOpen('w-party')) Party.render();
    if (this.isOpen('w-emote')) this.renderEmote();
    if (this.isOpen('w-storage')) this.renderStorage();
    if (this.isOpen('w-mob')) this.renderMob();
    if (this.isOpen('w-world')) this.renderWorld();
    if (this.isOpen('w-tree')) this.renderTree();
    if (this.isOpen('w-bot')) this.renderBot();
    if (this.isOpen('w-map')) $('#w-map .win-title span').textContent = `Map — ${G.map.def.name}`;
    if (this.isOpen('w-shop') && this.shop) this.renderShop();
  },

  // แจกแต้ม: กด + / − ปรับได้ก่อน (ยังไม่ใช้แต้มจริง) เห็นค่าที่จะได้ล่วงหน้า แล้วกด "ยืนยัน" ค่อยลงจริง • "รีเซ็ต" = ยกเลิกที่ปรับไว้
  statDraftCost(s, n) { const p = G.player; let c = 0; for (let k = 0; k < n; k++) c += statCost(p.stats[s] + k); return c; },
  statDraftLeft() { const D = this.statDraft || {}; return G.player.statPoints - Object.keys(D).reduce((a, s) => a + this.statDraftCost(s, D[s]), 0); },
  statDraftAdd(s, dir) {
    const p = G.player, D = this.statDraft || (this.statDraft = {}), n = D[s] || 0;
    if (dir > 0) { if (p.stats[s] + n >= 99 || this.statDraftLeft() < statCost(p.stats[s] + n)) return; D[s] = n + 1; Sound.play('click'); }
    else if (n > 0) { D[s] = n - 1; if (!D[s]) delete D[s]; Sound.play('click'); }
    G.statBump = s; this.renderStatus();
  },
  statDraftApply() {
    const D = this.statDraft || {}; let n = 0;
    for (const s in D) for (let k = 0; k < D[s]; k++) { raiseStat(s); n++; }
    this.statDraft = {};
    if (n && typeof Sound !== 'undefined') Sound.play('levelup');
    this.renderStatus();
  },
  renderStatus() {
    const p = G.player, D = this.statDraft || (this.statDraft = {});
    for (const s in D) if (p.stats[s] + D[s] > 99) delete D[s];
    if (this.statDraftLeft() < 0) { this.statDraft = {}; } // แต้มลดจากที่อื่น (รีเซ็ต/โหลดเซฟ) → ล้างที่ปรับไว้
    const pending = Object.keys(this.statDraft).length > 0;
    // ค่ารองแบบพรีวิว: ใส่ค่าที่ปรับไว้ชั่วคราว → recalc → อ่าน → คืนค่า
    let d = p.d;
    if (pending) { // recalc สั่ง UI.dirty() → เก็บ/คืนสถานะไว้ ไม่ให้หน้าต่างวาดใหม่วนทุกเฟรม (ปุ่มกดไม่ได้)
      const dirty0 = this.isDirty, hp0 = p.hp, sp0 = p.sp;
      for (const s in D) p.stats[s] += D[s]; recalc(); d = Object.assign({}, p.d); for (const s in D) p.stats[s] -= D[s]; recalc();
      p.hp = hp0; p.sp = sp0; this.isDirty = dirty0;
    }
    const cur = p.d;
    const stats = ['str', 'agi', 'vit', 'int', 'dex', 'luk'];
    const desc = { str: L('พลังโจมตีระยะประชิด', 'Melee attack power'), agi: L('ความเร็วโจมตี/หลบหลีก/ลดคูลดาวน์สกิล', 'Attack speed / evasion / skill cooldown'), vit: L('HP/ป้องกัน', 'HP / defense'), int: L('พลังเวท/SP', 'Magic attack / SP'), dex: L('ความแม่นยำ/ธนู/ร่ายเร็ว', 'Accuracy / bows / cast speed'), luk: L('คริติคอล/โชค', 'Critical / luck') };
    const left = stats.map(s => {
      const n = D[s] || 0, cost = statCost(p.stats[s] + n);
      const can = this.statDraftLeft() >= cost && p.stats[s] + n < 99;
      return h('div', { class: 'st-row st-row3' + (n ? ' drafted' : ''), title: desc[s] },
        h('span', { class: 'st-n' }, s.toUpperCase()),
        h('button', { class: 'st-dn', disabled: !n, onclick: () => this.statDraftAdd(s, -1), 'aria-label': '−' }, '−'),
        h('span', { class: 'st-v' + (G.statBump === s ? ' bump' : '') }, String(p.stats[s] + n), n ? h('i', { class: 'st-plus' }, ` +${n}`) : '', cur[s + 'Bonus'] ? h('em', {}, ` +${cur[s + 'Bonus']}`) : ''),
        h('button', { class: 'st-up', disabled: !can, onclick: () => this.statDraftAdd(s, 1), 'aria-label': '+' }, '+'),
        h('span', { class: 'st-c' }, String(cost)));
    });
    const row = (k, vNow, vNew) => { const ch = pending && String(vNow) !== String(vNew); return h('div', { class: 'st-row2' + (ch ? ' preview' : '') }, h('span', {}, k), h('b', {}, ch ? [h('s', {}, String(vNow)), ' → ', String(vNew)] : String(vNew))); };
    const right = [
      ['ATK', cur.atkDisplay, d.atkDisplay], ['MATK', `${cur.matkMin} ~ ${cur.matkMax}`, `${d.matkMin} ~ ${d.matkMax}`], ['HIT', cur.hit, d.hit], ['CRIT', cur.crit, d.crit],
      ['DEF', `${cur.def} + ${cur.softDef}`, `${d.def} + ${d.softDef}`], ['MDEF', `${cur.mdef} + ${cur.softMdef}`, `${d.mdef} + ${d.softMdef}`], ['FLEE', `${cur.flee} + ${cur.pdodge}`, `${d.flee} + ${d.pdodge}`], ['ASPD', cur.aspd, d.aspd],
      ['Max HP', cur.maxHp, d.maxHp], ['Max SP', cur.maxSp, d.maxSp],
    ].map(([k, a, b2]) => row(k, a, b2));
    G.statBump = null;
    // ค่าพิเศษ (จากต้นไม้พาสซีฟ/สกิล/บัฟ) — แสดงเฉพาะที่มีผล
    const castCut = Math.round((1 - d.castMul * Math.max(0, 1 - d.dex / 150)) * 100);
    const extra = [
      [L('ความเร็วเดิน', 'Move speed'), Math.round((d.speed / 4.6 - 1) * 100), '%'], [L('ร่ายเร็วขึ้น', 'Cast speed'), castCut, '%'], [L('ลดคูลดาวน์สกิล', 'Cooldown reduction'), d.cdCut, '%'], [L('ดาเมจกายภาพ', 'Physical damage'), d.atkPct, '%'],
      [L('แรงคริติคอล', 'Crit damage'), Math.round((d.critMul - 1.4) * 100), '%'], [L('ดูดเลือด', 'Lifesteal'), d.leech, '%'], [L('ฮีลแรงขึ้น', 'Healing power'), d.healPct, '%'],
      [L('ต้านมึน (VIT+พาสซีฟ)', 'Stun resist'), d.unshaken ? 100 : Math.round((1 - (1 - Math.min(0.9, d.vit / 100)) * (1 - d.stunRes / 100)) * 100), '%'], ['SP cost', d.spCostPct, '%'], [L('HP ฟื้นต่อรอบ', 'HP regen per tick'), d.regenPct, '%'],
      [L('ATK ตาม HP ที่เสีย', 'ATK per missing HP'), d.rage, '%'], [L('โอกาสติดพิษ', 'Poison chance'), d.venom, '%'],
    ].filter(([, v]) => v).map(([k, v, u]) => h('div', { class: 'st-row2' }, h('span', {}, k), h('b', {}, `${v > 0 ? '+' : ''}${Math.round(v * 10) / 10}${u}`)));
    const ks = Passive.list(p).filter(x => PTREE[x].kdesc).map(x => h('div', { class: 'st-ks' }, h('b', {}, PTREE[x].name), ' — ', PTREE[x].kdesc));
    if (extra.length || ks.length) right.push(h('div', { class: 'st-sub' }, 'Bonuses'), ...extra, ...ks);
    const body = $('#w-status .win-body');
    body.innerHTML = '';
    body.append(
      h('div', { class: 'st-grid' }, h('div', {}, left), h('div', {}, right)),
      h('div', { class: 'st-foot' }, `Status Point: `, h('b', {}, pending ? `${this.statDraftLeft()} / ${p.statPoints}` : String(p.statPoints)),
        h('span', { class: 'hint' }, L(' — ตัวเลขขวาคือแต้มที่ใช้เพิ่ม 1 ค่า', ' — right number = cost to raise by 1'))),
      h('div', { class: 'st-confirm' },
        h('button', { class: 'btn', disabled: !pending, onclick: () => { this.statDraft = {}; this.renderStatus(); } }, L('รีเซ็ต', 'Reset')),
        h('button', { class: 'btn primary', disabled: !pending, onclick: () => this.statDraftApply() }, L('ยืนยัน', 'Confirm'))),
    );
  },

  // ---------- การ์ดข้อมูลไอเทมเมื่อเอาเมาส์ชี้ (กระเป๋า / อุปกรณ์ / ร้านค้า) ----------
  tipFor(el, entry, worn) { el.classList.add('has-tip'); el._tip = { entry, worn }; return el; },
  skillTipFor(el, id) { el.classList.add('has-tip'); el._tip = { skill: id }; el.removeAttribute('title'); return el; },
  // การ์ดรายละเอียดสกิล (เมาส์ชี้): SP / คูลดาวน์ / ร่าย / ระยะ / ความชำนาญ / ค่าติดตัวที่ได้จริง
  skillTipBody(id) {
    const s = skillDef(id), p = G.player, lv = skillLv(id), show = Math.max(1, lv), d = p.d || {};
    const lines = [], add = (k, v) => lines.push(h('div', { class: 'tip-line' }, h('span', { class: 'tip-k' }, k + ' '), v));
    if (s.type === 'active') {
      const cost = skillCost(id, show); if (cost) add('SP', String(cost));
      if (s.hpCost) add('HP', `-${s.hpCost(show)}%`);
      if (s.cd) add('Cooldown', L(`${+(s.cd * (1 - (d.cdCut || 0) / 100)).toFixed(1)} วิ`, `${+(s.cd * (1 - (d.cdCut || 0) / 100)).toFixed(1)}s`) + (d.cdCut ? L(` (AGI ลด ${d.cdCut}%)`, ` (AGI -${d.cdCut}%)`) : ''));
      if (s.cast) add('Cast', L(`${+(s.cast(show) * (d.castMul || 1) / 1000).toFixed(2)} วิ`, `${+(s.cast(show) * (d.castMul || 1) / 1000).toFixed(2)}s`));
      add('Target', s.target === 'self' ? (s.dmg && s.dmg.area ? L(`รอบตัว ${s.dmg.area} ช่อง`, `Around you, ${s.dmg.area} tiles`) : L('ตัวเอง', 'Self'))
        : `${s.melee ? 'Melee' : s.bow ? L('ระยะธนู', 'Bow range') : L(`ระยะ ${skillRange(s)} ช่อง`, `Range ${skillRange(s)} tiles`)}${s.dmg && s.dmg.area ? L(` • วงกว้าง ${s.dmg.area} ช่อง`, ` • Area ${s.dmg.area}`) : ''}${s.dmg && s.dmg.line ? L(' • ทะลุแนว', ' • Pierces') : ''}`);
      if (s.dmg && s.dmg.element) add('Element', ELEM_THAI[s.dmg.element] || s.dmg.element);
    }
    const pas = s.passive ? s.passive(show) : s.buff ? s.buff.stats(show) : null;
    const req = s.req ? Object.entries(s.req).map(([k, v]) => `${SKILLS[k].name} ${v}`).join(', ') : '';
    return [
      h('div', { class: 'tip-head' }, this.skillIcon(id), h('div', {}, h('b', {}, s.name), h('small', {}, `${s.type === 'passive' ? 'Passive' : 'Active'} • Lv ${lv}/${s.max}${lv ? '' : L(' (ยังไม่เรียน)', ' (not learned)')}`))),
      s.desc ? h('div', { class: 'tip-desc' }, s.desc) : null,
      s.rune ? h('div', { class: 'tip-desc rn-tip' }, h('b', {}, `ᚱ ${s.rune.name}: `), s.rune.desc()) : null, // รูนที่ใส่อยู่ (js/runes.js)
      ...lines,
      pas && typeof PSTAT !== 'undefined' ? h('div', { class: 'tip-bon' }, ...Object.entries(pas).filter(([k]) => PSTAT[k]).map(([k, v]) => h('span', {}, PSTAT_FMT(k, Math.round(v * 10) / 10)))) : null,
      s.buff ? h('div', { class: 'tip-line' }, L(`นาน ${Math.round(s.buff.dur(show) * masteryMul(id))} วิ`, `Lasts ${Math.round(s.buff.dur(show) * masteryMul(id))}s`)) : null,
      s.type === 'active' ? h('div', { class: 'tip-line tip-mas' }, L(`ความชำนาญ Lv ${masteryLv(id)}/${MASTERY_MAX} — ${masteryEffect(id)}`, `Mastery Lv ${masteryLv(id)}/${MASTERY_MAX} — ${masteryEffect(id)}`)) : null,
      req ? h('div', { class: 'tip-line' + (skillReqMet(id) ? '' : ' tip-bad') }, L(`ต้องการ: ${req}`, `Requires: ${req}`)) : null,
    ].filter(Boolean);
  },
  // ปุ่ม ⓘ ในหน้าต่างสกิล: การ์ดรายละเอียดเต็ม (ใช้ได้ทั้งมือถือ/คอม) แตะที่อื่นเพื่อปิด
  skillDetail(id, anchor) {
    document.getElementById('sk-detail')?.remove();
    const box = h('div', { id: 'sk-detail', class: 'sk-detail', role: 'dialog' }, ...this.skillTipBody(id),
      h('button', { type: 'button', class: 'btn small sk-detail-x', onclick: () => close() }, 'Close'));
    const close = () => { box.remove(); document.removeEventListener('pointerdown', out, true); };
    const out = e => { if (!box.contains(e.target) && e.target !== anchor) close(); };
    document.body.append(box);
    const r = anchor.getBoundingClientRect(), bw = box.offsetWidth, bh = box.offsetHeight;
    box.style.left = Math.max(8, Math.min(innerWidth - bw - 8, r.right + 8 + bw < innerWidth ? r.right + 8 : r.left - bw - 8)) + 'px';
    box.style.top = Math.max(8, Math.min(innerHeight - bh - 8, r.top - 20)) + 'px';
    setTimeout(() => document.addEventListener('pointerdown', out, true), 0);
  },
  // ของชิ้นนี้หาได้จากมอนตัวไหน (ตารางดรอป + ชิปประจำมอน) — แสดงในการ์ดไอเทม • รายละเอียดไอเทมเป็นภาษาอังกฤษเสมอ
  dropSources(id) {
    const src = [];
    for (const mid in MOBS) {
      const m = MOBS[mid]; if (m.dummy || m.worldBoss) continue;
      const d = (m.drops || []).find(x => x[0] === id);
      if (d) src.push([m, d[1]]);
      if (typeof MOB_CHIP !== 'undefined' && MOB_CHIP[mid] === id) src.push([m, -1]);
    }
    if (!src.length) return null;
    src.sort((a, b) => (b[1] < 0 ? 1 : b[1]) - (a[1] < 0 ? 1 : a[1]));
    const where = mid => { const k = Object.keys(MAP_DEFS).find(k => (MAP_DEFS[k].spawns || []).some(s => s[0] === mid) || MAP_DEFS[k].mvp === mid); return k ? EN(MAP_DEFS[k].name) : ''; };
    const pct = c => c >= 0.1 ? `${Math.round(c * 100)}%` : `${+(c * 100).toFixed(2)}%`;
    return h('div', { class: 'tip-src' }, h('b', {}, 'Dropped by'),
      ...src.slice(0, 5).map(([m, c]) => h('div', {}, `${EN(m.name)}${m.boss ? ' (MVP)' : ''} · Lv ${m.lv}`, h('small', {}, ` ${where(m.id)}${where(m.id) ? ' · ' : ''}${c < 0 ? `defeat ${chipNeed(m)}` : pct(c)}`))),
      src.length > 5 ? h('small', {}, `and ${src.length - 5} more`) : null);
  },
  hideTip() { const t = $('#item-tip'); if (t) t.hidden = true; this._tipEl = null; },

  // ---------- ข้อมูลไอเทม (อังกฤษเสมอ — เจ้าของสั่ง 2026-10-03) ใช้ร่วมกัน: แถวรายการ / หน้ารายละเอียด / การ์ดเมาส์ชี้ ----------
  enStat(k, v) {
    const pct = /Pct$|^leech$|^stunRes$|^rage$|^venom$/.test(k), s = v > 0 ? '+' : '', n = EN(PSTAT[k]) || k.toUpperCase();
    return pct ? `${s}${v}${n}` : `${n} ${s}${v}`;
  },
  itemBon(entry) {
    const it = ITEMS[entry.id], bon = {}, add = o => { if (o) for (const k in o) bon[k] = (bon[k] || 0) + o[k]; };
    add(it.b); for (const c of entry.cards || []) if (ITEMS[c]) add(ITEMS[c].b);
    return Object.entries(bon).filter(([k, v]) => v && typeof PSTAT !== 'undefined' && PSTAT[k]);
  },
  itemKind(it) {
    if (it.type === 'weapon') return `Weapon · ${EN(WTYPE_THAI[it.wtype]) || it.wtype}`;
    if (it.type === 'armor') return it.slot === 'armor' ? 'Armor' : `Armor · ${SLOT_THAI[it.slot] || it.slot}`;
    if (it.type === 'card') return `Chip · fits ${SLOT_THAI[it.slot] || 'any slot'}`;
    if (it.type === 'use') return 'Consumable';
    return 'Material';
  },
  itemRarity(id) { return typeof LOOT !== 'undefined' ? EN(LOOT.label(id)) : 'Common'; },
  rarOf(id) { return typeof LOOT !== 'undefined' ? LOOT.rarityOf(id) : 'common'; },
  // ค่าหลัก (ตัวใหญ่ข้างภาพ): ATK / DEF / ฟื้น HP
  itemMain(e) {
    const it = ITEMS[e.id], rf = e.refine || 0;
    if (it.type === 'weapon') return `ATK ${(it.atk || 0) + rf * 3}` + (it.matk ? ` · MATK ${it.matk + rf * 2}` : '');
    if (it.type === 'armor' && (it.def || rf || it.mdef)) return [it.def || rf ? `DEF ${(it.def || 0) + rf}` : '', it.mdef ? `MDEF ${it.mdef}` : ''].filter(Boolean).join(' · ');
    if (it.heal) return `HP +${it.heal[0]}~${it.heal[1]}`;
    if (it.spHeal) return `SP +${it.spHeal[0]}~${it.spHeal[1]}`;
    const b = this.itemBon(e)[0]; if (b) return this.enStat(b[0], b[1]);
    return '';
  },
  // บรรทัดสรุปค่า 1 บรรทัดใต้ชื่อ (แถวรายการ)
  itemSummary(e) {
    const it = ITEMS[e.id], out = [];
    const main = this.itemMain(e); if (main) out.push(main);
    if (it.heal && it.spHeal) out.push(`SP +${it.spHeal[0]}~${it.spHeal[1]}`);
    for (const [k, v] of this.itemBon(e)) { const s = this.enStat(k, v); if (s !== main) out.push(s); }
    if (it.slots) out.push(`${(e.cards || []).length}/${it.slots} slots`);
    if (!out.length) out.push(it.desc ? EN(it.desc) : it.type === 'etc' ? `Sells for ${U.fmt(Math.floor(it.price / 2))} ${CUR}` : this.itemKind(it));
    return out.slice(0, 4).join(' · ');
  },
  plate(id, big) {
    return h('span', { class: 'plate r-' + this.rarOf(id) + (big ? ' big' : '') }, h('img', { src: itemIconUrl(id), alt: '', draggable: 'false' }));
  },
  icoSvg: {
    stats: '<svg viewBox="0 0 20 20"><rect x="2" y="11" width="4" height="7" rx="1"/><rect x="8" y="7" width="4" height="11" rx="1"/><rect x="14" y="3" width="4" height="15" rx="1"/></svg>',
    req: '<svg viewBox="0 0 20 20"><path d="M10 2l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V5z"/></svg>',
    gem: '<svg viewBox="0 0 20 20"><path d="M5 3h10l3 5-8 10L2 8z"/></svg>',
    lock: '<svg viewBox="0 0 20 20"><rect x="4" y="9" width="12" height="9" rx="2"/><path d="M7 9V6a3 3 0 016 0v3" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    info: '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8"/><rect x="9" y="8.5" width="2" height="6" rx="1" fill="#fff"/><circle cx="10" cy="5.8" r="1.2" fill="#fff"/></svg>',
    back: '<svg viewBox="0 0 20 20"><path d="M12.5 4L6.5 10l6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  ico(k) { return h('i', { class: 'ico ico-' + k, 'aria-hidden': 'true', html: this.icoSvg[k] }); },
  // แถวไอเทมในหน้าซ้ายของสมุด: ภาพบนจานกลม • ชื่อสีตามความหายาก • ค่าสรุป 1 บรรทัด • ขวา: จำนวน / แม่กุญแจ (ใส่ไม่ได้)
  itemRow(e, sel, onPick, extra) {
    const it = ITEMS[e.id], r = this.rarOf(e.id), eq = isEquipType(it), locked = eq && !canEquip(it, false);
    const row = h('div', { class: 'irow r-' + r + (sel ? ' sel' : '') + (locked ? ' locked' : ''), role: 'button', tabindex: '0', draggable: 'true' },
      h('span', { class: 'plate r-' + r }, h('img', { src: itemIconUrl(e.id), alt: '', draggable: 'false' }), e.refine ? h('i', { class: 'rf' }, '+' + e.refine) : null),
      h('span', { class: 'irow-t' }, h('b', { class: 'iname r-' + r }, itemDisplayName(e), h('em', {}, ' · ' + this.itemRarity(e.id))), h('small', { class: 'isum' }, this.itemSummary(e))),
      extra || (e.qty > 1 || !eq ? h('span', { class: 'iqty' }, '×' + U.fmt(e.qty)) : locked ? h('span', { class: 'ilock', title: 'Cannot equip' }, this.ico('lock')) : null));
    row.addEventListener('click', () => onPick(e));
    row.addEventListener('keydown', ev => { if (ev.key === 'Enter') onPick(e); });
    return row;
  },
  // หน้าขวาของสมุด: ภาพใหญ่บนจานเรือง • ป้ายความหายาก • ค่าพลัง • เงื่อนไข • ปุ่มใหญ่
  itemDetail(e, acts, note) {
    const it = ITEMS[e.id], r = this.rarOf(e.id), p = G.player, eq = isEquipType(it);
    const kv = (k, v, cls) => h('div', { class: 'kv' + (cls ? ' ' + cls : '') }, h('span', {}, k), h('b', {}, v));
    const sec = (ic, title, rows) => rows.length ? h('div', { class: 'dsec' }, h('div', { class: 'dsec-h' }, this.ico(ic), title), ...rows) : null;
    const stats = [], req = [];
    const rf = e.refine || 0;
    if (it.type === 'weapon') { stats.push(kv('ATK', String((it.atk || 0) + rf * 3))); if (it.matk || rf) stats.push(kv('MATK', String((it.matk || 0) + rf * 2))); }
    if (it.type === 'armor') { if (it.def || rf) stats.push(kv('DEF', String((it.def || 0) + rf))); if (it.mdef) stats.push(kv('MDEF', String(it.mdef))); }
    for (const [k, v] of this.itemBon(e)) { const s = this.enStat(k, v), m = s.match(/^(.*?) ([+−-]?\d.*)$/); stats.push(m ? kv(m[1], m[2]) : kv('Bonus', s)); }
    if (it.heal) stats.push(kv('Restores HP', `${it.heal[0]}~${it.heal[1]}`));
    if (it.spHeal) stats.push(kv('Restores SP', `${it.spHeal[0]}~${it.spHeal[1]}`));
    if (eq) {
      const okJob = canJobUse(it.jobs, p.job);
      req.push(kv('Class', it.jobs === 'all' ? 'All Classes' : it.jobs.map(j => EN(JOBS[j].name)).join(', '), okJob ? 'ok' : 'bad'));
      if (it.lv) req.push(kv('Base Lv', `${it.lv}+`, p.baseLv >= it.lv ? 'ok' : 'bad'));
      req.push(kv('Slot', SLOT_THAI[it.slot] || it.slot));
      if (it.slots) req.push(kv('Chip slots', `${(e.cards || []).length}/${it.slots}` + ((e.cards || []).length ? ` · ${e.cards.map(c => ITEMS[c] ? ITEMS[c].name : c).join(', ')}` : '')));
    }
    if (it.type === 'card') req.push(kv('Fits', SLOT_THAI[it.slot] || 'Any slot'));
    const main = this.itemMain(e);
    return [
      h('div', { class: 'det-top' }, h('h3', { class: 'dname r-' + r }, itemDisplayName(e)), h('small', {}, this.itemKind(it))),
      h('div', { class: 'det-hero r-' + r }, this.plate(e.id, true),
        h('div', { class: 'det-side' }, h('span', { class: 'rbadge r-' + r }, this.itemRarity(e.id)), main ? h('b', { class: 'det-main' }, main) : null,
          e.qty > 1 ? h('small', {}, `Owned ×${U.fmt(e.qty)}`) : null)),
      it.desc ? h('p', { class: 'det-desc' }, EN(it.desc)) : null,
      sec('stats', 'Stats', stats),
      sec('req', 'Requirements', req),
      eq && p.inventory.includes(e) ? this.compareLine(e) : null,
      typeof LOOT !== 'undefined' ? LOOT.setTip(e.id) : null,
      this.dropSources(e.id),
      h('div', { class: 'det-price' }, h('span', {}, 'Sell price'), h('b', {}, `${U.fmt(Math.floor(it.price / 2))} ${CUR}`)),
      note ? h('div', { class: 'det-note' }, this.ico('info'), h('span', {}, note)) : null,
      acts && acts.length ? h('div', { class: 'det-acts' }, acts) : null,
    ].filter(Boolean);
  },
  tipBody(entry, worn) {
    const it = ITEMS[entry.id], r = this.rarOf(entry.id), main = this.itemMain(entry);
    const bon = this.itemBon(entry);
    return [
      h('div', { class: 'tip-head' }, this.plate(entry.id), h('div', {}, h('b', { class: 'r-' + r }, itemDisplayName(entry)),
        h('small', {}, this.itemKind(it), ' · ', h('span', { class: 'r-' + r }, this.itemRarity(entry.id)), worn ? ' · Equipped' : ''))),
      main ? h('div', { class: 'tip-main' }, main) : null,
      it.desc ? h('div', { class: 'tip-desc' }, EN(it.desc)) : null,
      ...this.itemReqLines(entry).map(l => h('div', { class: 'tip-line' }, l)),
      bon.length ? h('div', { class: 'tip-bon' }, ...bon.map(([k, v]) => h('span', {}, this.enStat(k, v)))) : null,
      typeof LOOT !== 'undefined' ? LOOT.setTip(entry.id) : null,
      this.dropSources(entry.id),
      !worn && isEquipType(it) && G.player.inventory.includes(entry) ? this.compareLine(entry, true) : null,
    ].filter(Boolean);
  },
  initTip() {
    if ($('#item-tip')) return;
    const tip = h('div', { id: 'item-tip', role: 'tooltip' }); tip.hidden = true; document.body.append(tip);
    const place = (x, y) => {
      const r = tip.getBoundingClientRect(), W = innerWidth, H = innerHeight;
      tip.style.left = Math.round(x + 18 + r.width > W - 8 ? Math.max(8, x - r.width - 14) : x + 18) + 'px';
      tip.style.top = Math.round(Math.min(Math.max(8, y - 10), H - r.height - 8)) + 'px';
    };
    document.addEventListener('pointermove', ev => {
      if (ev.pointerType !== 'mouse') return;
      const el = ev.target.closest && ev.target.closest('.has-tip');
      if (!el || !el._tip) { if (!tip.hidden) this.hideTip(); return; }
      if (this._tipEl !== el) { this._tipEl = el; tip.innerHTML = ''; tip.append(...(el._tip.skill ? this.skillTipBody(el._tip.skill) : this.tipBody(el._tip.entry, el._tip.worn))); tip.hidden = false; }
      place(ev.clientX, ev.clientY);
    }, { passive: true });
    document.addEventListener('pointerdown', () => this.hideTip(), { passive: true });
  },

  itemReqLines(entry) {
    const it = ITEMS[entry.id], lines = [];
    if (it.type === 'card') lines.push(`Fits: ${SLOT_THAI[it.slot] || 'Any slot'}`);
    if (isEquipType(it)) {
      lines.push(`Class: ${it.jobs === 'all' ? 'All Classes' : it.jobs.map(j => EN(JOBS[j].name)).join(', ')}${it.lv ? `  |  Base Lv ${it.lv}+` : ''}`);
      if (it.slots) lines.push(`Chip slots: ${(entry.cards || []).map(c => ITEMS[c] ? ITEMS[c].name : c).join(', ') || '-'} (${(entry.cards || []).length}/${it.slots})`);
    }
    return lines;
  },
  itemTooltip(entry) {
    const it = ITEMS[entry.id], lines = [];
    if (it.type === 'weapon') lines.push(`Type: ${EN(WTYPE_THAI[it.wtype])}  ATK ${it.atk}${it.matk ? `  MATK ${it.matk}` : ''}`);
    if (it.type === 'armor') lines.push(`Slot: ${SLOT_THAI[it.slot]}${it.def ? `  DEF ${it.def}` : ''}${it.mdef ? `  MDEF ${it.mdef}` : ''}`);
    return lines.concat(this.itemReqLines(entry));
  },

  // ค่าพลังของอุปกรณ์ 1 ชิ้น (รวมตีบวกและชิป) ตามสูตรใน recalc()
  equipStats(e, slot) {
    const out = {}; if (!e) return out;
    const it = ITEMS[e.id], add = o => { if (o) for (const k in o) out[k] = (out[k] || 0) + o[k]; };
    if (slot === 'weapon') { add({ atk: (it.atk || 0) + (e.refine || 0) * 3 }); if (it.matk || e.refine) add({ matk: (it.matk || 0) + (e.refine || 0) * 2 }); }
    else add({ def: (it.def || 0) + (e.refine || 0), mdef: it.mdef || 0 });
    add(it.b); for (const c of e.cards || []) add(ITEMS[c].b);
    return out;
  },
  // เทียบกับชิ้นที่สวมอยู่ในช่องเดียวกัน: ▲ เขียว = ดีขึ้น ▼ แดง = แย่ลง
  // เทียบค่าตัวละครก่อน/หลังเปลี่ยนไอเทม (ค่าสุดท้ายจริง รวมสเตตัส บัฟ และพาสซีฟ)
  compareLine(e, compact) {
    const it = ITEMS[e.id]; if (!isEquipType(it)) return null;
    const pv = previewEquip(e); if (!pv) return null;
    const cur = pv.replaced, ok = canEquip(it, false);
    const chips = pv.diff.map(([k, dv, v]) => h('span', { class: 'cmp ' + (dv > 0 ? 'up' : 'down') },
      h('i', {}, k), `${dv > 0 ? '+' : '−'}${U.fmt(Math.abs(dv))}`, compact ? null : h('small', {}, ` → ${U.fmt(v)}`)));
    const up = pv.diff.filter(x => x[1] > 0).length, down = pv.diff.length - up;
    const verdict = !ok ? ['no', 'Cannot equip'] : !pv.diff.length ? ['eq', 'No change'] : !down ? ['up', 'Better'] : !up ? ['down', 'Worse'] : ['mix', 'Trade-off'];
    return h('div', { class: 'det-line cmp-row' + (compact ? ' compact' : '') },
      h('div', { class: 'cmp-h' }, h('span', {}, cur ? `vs. ${itemDisplayName(cur)}` : `${SLOT_THAI[it.slot] || 'Slot'} slot is empty`), h('b', { class: 'cmp-v ' + verdict[0] }, verdict[1])),
      h('div', { class: 'cmp-chips' }, chips.length ? chips : h('span', { class: 'cmp' }, 'No stat change')));
  },
  // ---------- สมุดไอเทม (แบบหนังสือเปิด): หน้าซ้าย = แท็บ + รายการ • หน้าขวา = รายละเอียด ----------
  // มือถือ: หน้าเดียว — แตะแถว = ไปหน้ารายละเอียด, ปุ่ม ‹ = กลับรายการ (UI.bookDet)
  narrow() { return innerWidth <= 760; },
  // วาดใหม่ทั้งหน้าต่างทุกครั้งที่ข้อมูลเปลี่ยน → จำตำแหน่งเลื่อนของรายการไว้
  keepScroll(body, fn) {
    const sc = $$('.irows, .book-r', body).map(el => el.scrollTop);
    fn();
    $$('.irows, .book-r', body).forEach((el, i) => { if (sc[i]) el.scrollTop = sc[i]; });
  },
  book(win, left, right, det) {
    $('#' + win).classList.add('book-win');
    return h('div', { class: 'book' + (det ? ' det' : '') }, h('div', { class: 'book-page book-l' }, left), h('i', { class: 'book-spine', 'aria-hidden': 'true' }), h('div', { class: 'book-page book-r' }, right));
  },
  bookBack(fn) { return h('button', { type: 'button', class: 'book-back', onclick: fn }, this.ico('back'), L('กลับ', 'Back')); },
  renderInv() {
    const p = G.player, body = $('#w-inv .win-body');
    const tabs = [['use', 'Usable'], ['equip', 'Equip'], ['card', 'Chips'], ['etc', 'Etc']];
    const tabType = e => { const t = ITEMS[e.id].type; return t === 'use' ? 'use' : t === 'card' ? 'card' : isEquipType(ITEMS[e.id]) ? 'equip' : 'etc'; };
    const list = p.inventory.filter(e => tabType(e) === this.invTab);
    if (this.selItem && !list.includes(this.selItem)) { this.selItem = null; this.bookDet = false; }
    const e = this.selItem || (this.narrow() ? null : list[0]) || null;
    const pick = x => { this.selItem = x; this.bookDet = true; this.renderInv(); };
    const rows = list.map(x => {
      const row = this.itemRow(x, x === e, pick);
      this.tipFor(row, x);
      const it = ITEMS[x.id];
      if (it.type === 'use' || isEquipType(it)) this.markBind(row, 'item', x.id);
      row.addEventListener('dblclick', () => useItem(x));
      row.addEventListener('dragstart', ev => ev.dataTransfer.setData('text/plain', JSON.stringify({ t: 'item', id: x.id })));
      return row;
    });
    const left = [
      h('div', { class: 'pills' }, tabs.map(([k, l]) => h('button', { type: 'button', class: 'pill' + (this.invTab === k ? ' on' : ''),
        onclick: () => { this.invTab = k; this.selItem = null; this.bookDet = false; this.renderInv(); } }, l, h('small', {}, String(p.inventory.filter(x => tabType(x) === k).length))))),
      h('div', { class: 'irows' }, rows.length ? rows : h('div', { class: 'book-empty' }, this.invTab === 'card'
        ? L(`ยังไม่มีชิป — ล่ามอนชนิดเดียวกันครบ ${CHIP_KILLS} ตัวได้ชิปของมัน 1 ชิ้น (MVP ได้ตั้งแต่ครั้งแรก)`, `No chips yet — defeat ${CHIP_KILLS} of one monster type to earn its chip (MVPs give one on the first kill)`)
        : L('ยังไม่มีของในแท็บนี้', 'Nothing in this tab yet'))),
      h('div', { class: 'book-foot' },
        h('button', { class: 'btn small inv-sort', type: 'button', onclick: () => { sortItems(p.inventory); saveGame(); this.renderInv(); Sound.play('click'); } }, 'Sort'),
        h('span', { class: 'bf-count' }, `${p.inventory.length} ${L('ชิ้น', 'items')}`),
        h('span', { class: 'coin-pill' }, h('i', { class: 'coin' }), U.fmt(p.zeny))),
    ];
    let right;
    if (e) {
      const it = ITEMS[e.id], acts = [];
      if (it.type === 'use') acts.push(h('button', { class: 'btn big primary', onclick: () => useItem(e) }, 'Use'));
      if (isEquipType(it)) acts.push(h('button', { class: 'btn big primary', disabled: !canEquip(it, false), onclick: () => useItem(e) }, 'Equip'));
      if (it.type === 'card') acts.push(h('button', { class: 'btn big primary', onclick: () => useItem(e) }, 'Insert'));
      if (it.type === 'use' || isEquipType(it)) acts.push(h('button', { class: 'btn big', onclick: () => this.startEquip('item', e.id) }, L('ตั้งปุ่มลัด', 'Hotkey')));
      acts.push(h('button', { class: 'btn big danger', onclick: () => this.discard(e) }, 'Drop'));
      right = [this.bookBack(() => { this.bookDet = false; this.selItem = null; this.renderInv(); }),
        ...this.itemDetail(e, acts, this.narrow() ? null : L('ดับเบิลคลิกเพื่อใช้/สวม • ลากไปวางที่แถบลัด หรือชี้แล้วกด Z C V F', 'Double-click to use/equip • drag onto the hotbar, or hover and press Z C V F'))];
    } else right = h('div', { class: 'book-empty' }, L('เลือกไอเทมทางซ้ายเพื่อดูรายละเอียด', 'Pick an item on the left to see its details'));
    this.keepScroll(body, () => { body.innerHTML = ''; body.append(this.book('w-inv', left, right, this.bookDet && !!this.selItem)); });
  },
  async discard(e) {
    const it = ITEMS[e.id];
    const ok = await this.confirm(L(`ทิ้ง ${itemDisplayName(e)}${e.qty > 1 ? ` ทั้งหมด ${e.qty} ชิ้น` : ''} หรือไม่? (จะวางไว้บนพื้น)`, `Drop ${itemDisplayName(e)}${e.qty > 1 ? ` (all ${e.qty})` : ''}? (It will be left on the ground)`));
    if (!ok || !G.player.inventory.includes(e)) return;
    removeEntry(e, e.qty);
    if (isEquipType(it)) G.drops.push({ uid: G.uid++, id: e.id, qty: 1, x: G.player.x + 0.4, y: G.player.y + 0.3, born: G.time });
    else G.drops.push({ uid: G.uid++, id: e.id, qty: e.qty, x: G.player.x + 0.4, y: G.player.y + 0.3, born: G.time });
    this.selItem = null; this.bookDet = false;
  },

  // สมุดอุปกรณ์: หน้าซ้าย = ตัวละครเคลื่อนไหว (หมุนได้) + ช่องสวม 8 ช่องรอบตัว • หน้าขวา = ชิ้นที่เลือก (ถอดได้) + ของในกระเป๋าที่ใส่ช่องนี้ได้
  EQ_LEFT: ['head', 'weapon', 'garment', 'acc'],
  EQ_RIGHT: ['armor', 'shield', 'shoes', 'acc2'],
  eqDir: 2, eqSel: 'weapon',
  renderEquip() {
    const p = G.player, body = $('#w-equip .win-body'), cur = this.eqSel || 'weapon';
    const pick = s => { this.eqSel = s; this.eqDet = true; this.renderEquip(); };
    const slot = s => {
      const e = p.equip[s], r = e ? this.rarOf(e.id) : '';
      const el = h('button', { type: 'button', class: 'eq-slot' + (e ? ' r-' + r : ' empty') + (s === cur ? ' sel' : ''), onclick: () => pick(s) },
        e ? h('span', { class: 'plate r-' + r }, h('img', { src: itemIconUrl(e.id), alt: '', draggable: 'false' }), e.refine ? h('i', { class: 'rf' }, '+' + e.refine) : null)
          : h('span', { class: 'plate empty' }, h('span', { class: 'eq-ph eq-ph-' + s })),
        h('span', { class: 'eq-i' }, h('small', {}, SLOT_THAI[s]), h('b', { class: e ? 'r-' + r : '' }, e ? itemDisplayName(e) : L('ว่าง', 'Empty'))));
      if (e) el.addEventListener('dblclick', () => unequip(s));
      return e ? this.tipFor(el, e, true) : el;
    };
    const prev = h('canvas', { class: 'eq-prev', width: 128, height: 168 });
    const turn = d => h('button', { type: 'button', class: 'eq-turn', 'aria-label': L('หมุนตัวละคร', 'Rotate character'), onclick: () => { this.eqDir = (this.eqDir + d + 8) % 8; } }, d < 0 ? '⟲' : '⟳');
    const d = p.d || {};
    const left = [
      h('div', { class: 'eq-wrap' }, h('div', { class: 'eq-col' }, this.EQ_LEFT.map(slot)),
        h('div', { class: 'eq-mid' }, h('div', { class: 'eq-stage' }, prev, turn(-1), turn(1)), h('span', { class: 'eq-job' }, `${JOBS[p.job].name} · Lv ${p.baseLv}`)),
        h('div', { class: 'eq-col' }, this.EQ_RIGHT.map(slot))),
      h('div', { class: 'eq-sum' }, [['ATK', (d.statusAtk || 0) + (d.weaponAtk || 0) + (d.atkBonus || 0)], ['MATK', d.matkMax || 0], ['DEF', d.def || 0], ['MDEF', d.mdef || 0]]
        .map(([k, v]) => h('span', {}, h('small', {}, k), h('b', {}, U.fmt(v))))),
    ];
    const e = p.equip[cur];
    const fits = p.inventory.filter(x => { const it = ITEMS[x.id]; return isEquipType(it) && (it.slot === cur || (cur === 'acc2' && it.slot === 'acc')); });
    const cand = fits.length ? h('div', { class: 'dsec' }, h('div', { class: 'dsec-h' }, this.ico('gem'), L(`ของในกระเป๋าที่ใส่ช่อง ${SLOT_THAI[cur]} ได้`, `In your bag for ${SLOT_THAI[cur]}`)),
      h('div', { class: 'irows flat' }, fits.map(x => { const row = this.itemRow(x, false, y => { useItem(y); },
        h('button', { type: 'button', class: 'btn small primary', disabled: !canEquip(ITEMS[x.id], false), onclick: ev => { ev.stopPropagation(); useItem(x); } }, 'Equip')); this.tipFor(row, x); return row; }))) : null;
    const back = this.bookBack(() => { this.eqDet = false; this.renderEquip(); });
    const right = e
      ? [back, ...this.itemDetail(e, [h('button', { class: 'btn big primary', onclick: () => unequip(cur) }, 'Unequip')]), cand]
      : [back, h('div', { class: 'det-top' }, h('h3', { class: 'dname' }, SLOT_THAI[cur]), h('small', {}, L('ช่องนี้ยังว่าง', 'This slot is empty'))),
        cand || h('div', { class: 'book-empty' }, L('ยังไม่มีของในกระเป๋าที่ใส่ช่องนี้ได้', 'Nothing in your bag fits this slot yet'))];
    this.keepScroll(body, () => { body.innerHTML = ''; body.append(this.book('w-equip', left, right, this.eqDet)); });
    this.eqAnim(prev);
  },
  // วาดตัวละครกลางหน้าต่างวนไปเรื่อย ๆ จนกว่าหน้าต่างจะปิด/วาดใหม่ (ใช้ canvas ใหม่ทุกครั้งที่ render)
  eqAnim(cv) {
    const g = cv.getContext('2d'), t0 = performance.now();
    const step = now => {
      if (!cv.isConnected || !this.isOpen('w-equip')) return;
      const p = G.player;
      if (p) {
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
        g.save(); g.translate(64, 156); g.scale(1.8, 1.8);
        Sprites.drawPlayer(g, Object.assign({}, p, { x: 0, y: 0, moving: false, sitting: false, dead: false, atkAnim: 0, cast: null, skillPose: null, hurtFlash: 0, stunUntil: 0, buffs: {}, dir: this.eqDir, facing: this.eqDir >= 3 && this.eqDir <= 5 ? -1 : 1, _an: null }), (now - t0) / 1000);
        g.restore();
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },

  renderSkills() {
    const p = G.player;
    const body = $('#w-skills .win-body');
    body.innerHTML = '';
    // แท็บตาม Class: Novice | Class แรก | Class 2 (เริ่มที่ Class ปัจจุบัน) • แต้มสกิลใช้ร่วมกัน
    const tabs = p.job === 'novice' ? ['novice'] : ['novice', ...jobLine(p.job).reverse()];
    if (!tabs.includes(this.skTab)) this.skTab = p.job;
    const tab = this.skTab;
    const ids = JOBS[tab].skills;
    body.append(h('div', { class: 'sk-head' }, `${JOBS[p.job].name} — Skill Point: `, h('b', {}, String(p.skillPoints))));
    if (tabs.length > 1) body.append(h('div', { class: 'tabs sk-tabs' }, ...tabs.map((j, i) => {
      const left = JOBS[j].skills.filter(k => canLearn(k)).length;
      return h('button', { type: 'button', class: 'tab' + (j === tab ? ' on' : ''), onclick: () => { this.skTab = j; this.renderSkills(); } },
        h('small', {}, i === 0 ? 'NOVICE' : i === 1 ? L('Class 1', 'CLASS 1') : L('Class 2', 'CLASS 2')), h('b', {}, i === 0 ? 'Basic' : JOBS[j].name), left ? h('i', { class: 'sk-tab-dot' }) : null);
    })));
    const list = h('div', { class: 'sk-list' });
    // ความชำนาญ: แถบความคืบหน้าถึง Lv ถัดไป
    const mastery = id => {
      const lv = masteryLv(id), u = masteryUses(id), a = masteryNeed(lv, id), z = masteryNeed(lv + 1, id);
      const pct = lv >= MASTERY_MAX ? 100 : Math.floor((u - a) / (z - a) * 100);
      return h('div', { class: 'sk-mas', title: lv >= MASTERY_MAX ? L('ความชำนาญสูงสุดแล้ว', 'Mastery maxed') : L(`ใช้อีก ${U.fmt(z - u)} ครั้งถึง Lv ${lv + 1}`, `${U.fmt(z - u)} more uses to Lv ${lv + 1}`) },
        h('span', {}, L(`ความชำนาญ Lv ${lv}/${MASTERY_MAX}`, `Mastery Lv ${lv}/${MASTERY_MAX}`)), h('i', {}, h('b', { style: `width:${pct}%` })),
        h('em', {}, id === 'attack' ? L(`ตีแรงขึ้น +${masteryPct(id)}%`, `Attack power +${masteryPct(id)}%`) : masteryEffect(id)));
    };
    // อธิบายว่าความชำนาญทำอะไร (ผู้เล่นถามบ่อย)
    body.append(h('details', { class: 'sk-mas-help' }, h('summary', {}, h('b', {}, L('ความชำนาญ = ยิ่งใช้ยิ่งเก่ง', 'Mastery: practice makes perfect')), h('span', { class: 'sk-mh-more' }, L(' (แตะเพื่ออ่าน)', ' (tap to read)'))),
      L(` สกิลที่ใช้บ่อยจะเก่งขึ้นเอง ${MASTERY_MAX} ขั้น ขั้นละ +3% ตามชนิดสกิล: สกิลโจมตี = แรงขึ้น • ฮีล = ฮีลแรงขึ้น • บัฟ = อยู่นานขึ้น • เรียกสัตว์/หายตัว = อยู่นานขึ้น • กับดัก = แรงขึ้น (สูงสุด +30%) • ตีปกติ +2% ต่อขั้น — ไม่ต้องใช้แต้ม ไม่หายตอนเปลี่ยน Class`, ` Skills you use often improve over ${MASTERY_MAX} ranks, +3% per rank by skill type: attacks hit harder • heals heal more • buffs last longer • summons/stealth last longer • traps hit harder (up to +30%) • basic attacks +2% per rank — no points needed, kept on job change`)));
    if (tab === 'novice' || tabs.length === 1) list.append(h('div', { class: 'sk-row uni' }, h('div', { class: 'sk-info' },
      h('div', { class: 'sk-name' }, L('การโจมตีปกติ', 'Basic Attack')), mastery('attack'))));
    for (const id of ids) {
      const s = SKILLS[id], lv = skillLv(id);
      const reqTxt = s.req ? Object.entries(s.req).map(([k, v]) => `${SKILLS[k].name} ${v}`).join(', ') : '';
      const ic = this.skillIcon(id);
      if (lv && s.type === 'active') {
        ic.draggable = true;
        ic.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', JSON.stringify({ t: 'skill', id })));
        ic.title = L('ลากไปวางที่ปุ่มลัด', 'Drag onto the hotbar');
      }
      // แถวสกิลขนาดเท่ากันเสมอ: ชื่อ + เลเวล + แถบความชำนาญ • รายละเอียดทั้งหมดกดปุ่ม ⓘ (หรือชี้เมาส์)
      const reqOk = !s.req || skillReqMet(id);
      list.append(this.skillTipFor(h('div', { class: 'sk-row uni' + (lv ? '' : ' locked') },
        ic,
        h('div', { class: 'sk-info' },
          h('div', { class: 'sk-name' }, s.name, h('span', { class: 'sk-lv' }, ` Lv ${lv}/${s.max}`)),
          lv && s.type === 'active' ? mastery(id)
            : h('div', { class: 'sk-sub' + (reqOk ? '' : ' bad') }, s.type === 'passive' ? 'Passive' : reqOk ? 'Not learned' : L('🔒 ต้องอัปสกิลก่อนหน้า', '🔒 Needs a prior skill'))),
        h('div', { class: 'sk-acts' },
          canLearn(id) ? h('button', { class: 'btn small', title: 'Learn', onclick: () => learnSkill(id) }, '+') : null,
          lv && s.type === 'active' ? h('button', { class: 'btn small', onclick: () => useSkill(id) }, 'Use') : null,
          lv && s.type === 'active' ? lv && s.type === 'active' ? h('button', { class: 'btn small sk-equip' + (p.hotbar.some(x => x && x.id === id) ? ' on' : ''), title: L('ติดตั้งลงช่องสกิล (คอม: ชี้ที่สกิลแล้วกด 1–8 ได้)', 'Equip to a skill slot (PC: hover and press 1–8)'), onclick: () => this.startEquip('skill', id) }, p.hotbar.some(x => x && x.id === id) ? 'Move' : 'Equip') : null : null,
          h('button', { class: 'btn small sk-info-btn', title: L('รายละเอียด', 'Details'), 'aria-label': L('รายละเอียด', 'Details'), onclick: e => { e.stopPropagation(); this.skillDetail(id, e.currentTarget); } }, 'ⓘ'))), id));
      if (lv && s.type === 'active') this.markBind(list.lastElementChild, 'skill', id);
      if (typeof Runes !== 'undefined') Runes.skillRow(list, id); // Rune Paths (js/runes.js + css/runes.css)
    }
    body.append(list);
    if (SECOND_JOBS[p.job] && tab === p.job) body.append(h('div', { class: 'hint' }, L(`Class ขั้น 2 (เลือก 1 สาย: ${SECOND_JOBS[p.job].map(j => JOBS[j].name).join(' / ')}): Base Lv ${SECOND_JOB_REQ.base} และ Job Lv ${SECOND_JOB_REQ.job} แล้วคุยกับ Mimir AI ในนีโอเอลด์ไฮม์`, `2nd class (choose one: ${SECOND_JOBS[p.job].map(j => JOBS[j].name).join(' / ')}): reach Base Lv ${SECOND_JOB_REQ.base} and Job Lv ${SECOND_JOB_REQ.job}, then talk to Mimir AI in Neo Eldheim`)));
    if (p.job === 'novice') body.append(h('div', { class: 'hint' }, L(`เก็บ Job Lv ${JOB_CHANGE_LV} แล้วไปหา Mimir AI ในนีโอเอลด์ไฮม์ เพื่ออัปเกรดร่างเป็น 1 ใน 6 Class`, `Reach Job Lv ${JOB_CHANGE_LV}, then visit Mimir AI in Neo Eldheim to upgrade your frame into one of 6 classes`)));
  },

  // ---------------- นำทาง ----------------
  navTab: 'mob',
  // สถานะ MVP: กำลังอาละวาด / พร้อมปรากฏ / นับถอยหลังเกิดใหม่
  mvpStatus(id) {
    const m = Object.keys(MAP_DEFS).find(k => MAP_DEFS[k].mvp === id); if (!m) return '';
    if (G.map && G.map.id === m && G.mobs.some(x => x.isMvp && !x.dead)) return L(`⚔ กำลังอาละวาดอยู่ที่ ${MAP_DEFS[m].name}!`, `⚔ Rampaging in ${MAP_DEFS[m].name}!`);
    const left = mvpLeft(m);
    if (left > 0) return L(`⏳ เกิดใหม่ในอีก ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')} นาที`, `⏳ Respawns in ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`);
    return L(`✦ พร้อมปรากฏที่ ${MAP_DEFS[m].name} (เข้าแผนที่เพื่อเจอ)`, `✦ Ready to appear in ${MAP_DEFS[m].name} (enter the map)`);
  },
  // ---------------- แผนที่โลก: วางแผนที่ตามทิศของประตู (E/W/S/N) จากเมืองหลัก ----------------
  worldLayout() {
    if (this._world) return this._world;
    const pos = { [HOME_MAP]: [0, 0] }, q = [HOME_MAP], D = { E: [1, 0], W: [-1, 0], S: [0, 1], N: [0, -1] };
    while (q.length) { const id = q.shift(); for (const [s, to] of Object.entries(MAP_DEFS[id].links || {})) if (!pos[to]) { pos[to] = [pos[id][0] + D[s][0], pos[id][1] + D[s][1]]; q.push(to); } }
    const xs = Object.values(pos).map(v => v[0]), ys = Object.values(pos).map(v => v[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys);
    for (const k in pos) pos[k] = [pos[k][0] - x0, pos[k][1] - y0];
    return (this._world = { pos, cols: Math.max(...xs) - x0 + 1, rows: Math.max(...ys) - y0 + 1 });
  },
  // แผนที่โลกภาพวาด (js/world.js WORLD.art): ทุกภูมิภาควาดจากผังจริง วางตามพิกัดโลก • แตะภูมิภาค = เดินทางไปเอง
  renderWorld() {
    const body = $('#w-world .win-body');
    if (!body.querySelector('#worldmap-cv')) {
      body.innerHTML = '';
      const cv = h('canvas', { id: 'worldmap-cv' });
      cv.addEventListener('pointerdown', e => {
        e.preventDefault(); e.stopPropagation();
        const A = WORLD.art(), r = cv.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * A.c.width, py = (e.clientY - r.top) / r.height * A.c.height;
        const go = id => { if (id !== G.map.id) { Nav.goTo({ kind: 'map', map: id, name: MAP_DEFS[id].name }); this.close('w-world'); } };
        const ci = A.caveIcon;
        if (ci && Math.hypot(px - ci.x, py - ci.y) < 40) { // ปากถ้ำ: เลือกชั้นใต้ดิน
          this.menu(L('ใต้ดิน — เลือกชั้น', 'Underground — choose a level'), L('ถ้ำทั้งหมดลงจากปากถ้ำนี้', 'Every cavern descends from this entrance'),
            [...ci.ids.map(id => `${MAP_DEFS[id].name} — Lv ${String(MAP_DEFS[id].level || '').replace(/\s*\(.*\)/, '')}`), 'Cancel']).then(i => { if (i >= 0 && i < ci.ids.length) go(ci.ids[i]); }).catch(() => {});
          return;
        }
        for (const [id, q] of Object.entries(A.regions)) if (px >= q.x && px <= q.x + q.w && py >= q.y && py <= q.y + q.h) { go(id); return; }
      });
      body.append(cv, h('div', { class: 'hint' }, L('แตะดินแดนเพื่อเดินทางไปเอง • แตะปากถ้ำเพื่อเลือกชั้นใต้ดิน', 'Tap a region to travel there • tap the cave mouth to pick an underground level')));
    }
    this.drawWorldMap($('#worldmap-cv'));
  },
  drawWorldMap(cv) {
    const A = WORLD.art(), W = A.c.width, H = A.c.height, P = A.P, t = performance.now() / 1000;
    if (cv.width !== W) { cv.width = W; cv.height = H; cv.style.width = `min(100%, calc((100vh - 190px) * ${(W / H).toFixed(4)}))`; }
    const g = cv.getContext('2d'), disp = cv.clientWidth ? W / cv.clientWidth : 1, fs = v => v * Math.max(0.8, disp);
    g.drawImage(A.c, 0, 0);
    const qt = typeof Quest !== 'undefined' ? Quest.navTarget() : null;
    // ตัวหนังสือแผนที่: หมึกเข้มบนรัศมีกระดาษ (ไม่มีกล่อง)
    const ink = (s, x, y, size, col = '#2e1c06', font = 'Cinzel, "Kanit", serif', weight = 800, spacing = 0) => {
      g.font = `${weight} ${fs(size)}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      if ('letterSpacing' in g) g.letterSpacing = `${fs(spacing)}px`;
      g.lineWidth = fs(size * 0.32); g.strokeStyle = 'rgba(246,234,204,0.82)'; g.strokeText(s, x, y);
      g.fillStyle = col; g.fillText(s, x, y);
      if ('letterSpacing' in g) g.letterSpacing = '0px';
    };
    for (const [id, q] of Object.entries(A.regions)) {
      const d = MAP_DEFS[id], town = d.kind === 'town', cx = q.x + q.w / 2, cy = town ? q.y - fs(14) : q.y + q.h * 0.5;
      ink(d.name.toUpperCase(), cx, cy, town ? 13 : 15, id === G.map.id ? '#7a3a00' : '#2e1c06', 'Cinzel, "Kanit", serif', 800, 1.5);
      const sub = [town ? L('เมือง • ปลอดภัย', 'Town • Safe') : `Lv ${String(d.level || '').replace(/\s*\(.*\)/, '')}`, d.mvp ? '☠ MVP' : '', qt && qt.map === id ? L('📜 เควสต์', '📜 Quest') : ''].filter(Boolean).join('  ·  ');
      ink(sub, cx, cy + fs(15), 9.5, d.mvp ? '#6a1a10' : '#4a3214', 'Kanit, sans-serif', 600);
    }
    const ci = A.caveIcon;
    if (ci) {
      const glow = 0.5 + Math.sin(t * 2.4) * 0.25, gr = g.createRadialGradient(ci.x, ci.y, 4, ci.x, ci.y, 44);
      gr.addColorStop(0, `rgba(170,120,255,${glow})`); gr.addColorStop(1, 'rgba(170,120,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(ci.x, ci.y, 44, 0, 7); g.fill();
      ink(L('ทางลงใต้ดิน', 'THE UNDERDARK'), ci.x, ci.y + fs(30), 11, '#3a1660', 'Cinzel, "Kanit", serif', 800, 1);
      ink(ci.ids.map(id => MAP_DEFS[id].name).join(' › '), ci.x, ci.y + fs(44), 8.5, '#4a2a6a', 'Kanit, sans-serif', 600);
    }
    // ตัวเรา: หมุดทองเต้น (อยู่ในถ้ำ = ที่ปากถ้ำ)
    const here = A.regions[G.map.id];
    let mx = null, my = null;
    if (here) { mx = here.x + G.player.x * P; my = here.y + G.player.y * P; }
    else if (ci && ci.ids.includes(G.map.id)) { mx = ci.x; my = ci.y - 6; }
    if (mx != null) {
      const k = (t % 1.5) / 1.5, bob = Math.abs(Math.sin(t * 3)) * fs(3);
      g.strokeStyle = `rgba(200,40,20,${0.9 * (1 - k)})`; g.lineWidth = fs(2.5); g.beginPath(); g.ellipse(mx, my, fs(6) + k * fs(22), (fs(6) + k * fs(22)) * 0.5, 0, 0, 7); g.stroke();
      g.save(); g.translate(mx, my - bob);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(0, bob, fs(5), fs(2.2), 0, 0, 7); g.fill();
      g.fillStyle = '#c0281c'; g.strokeStyle = '#3a0a04'; g.lineWidth = fs(1.6);
      g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-fs(10), -fs(12), -fs(9), -fs(24), 0, -fs(24)); g.bezierCurveTo(fs(9), -fs(24), fs(10), -fs(12), 0, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ffe9b0'; g.beginPath(); g.arc(0, -fs(16), fs(3.6), 0, 7); g.fill();
      g.restore();
      if (!here) ink(`📍 ${G.map.def.name}`, mx, my - fs(34), 10, '#7a1a00', 'Kanit, sans-serif', 700);
    }
  },
  // ---------------- ต้นไม้พาสซีฟ (แบบ PoE) ----------------
  // ลากเพื่อเลื่อน • ล้อเมาส์/ปุ่ม +− ซูม • แตะจุดเพื่อดูรายละเอียด แล้วกดปุ่มเปิด (เปิดทั้งเส้นทางได้ถ้าแต้มพอ)
  // ภาพสื่อความหมายโดยไม่ต้องแตะ: สี/แสงฟุ้งประจำแฉก + ไอคอนตามโบนัสในทุกจุด (ดาบ=ATK โล่=DEF หัวใจ=HP …)
  // ขนาด/ทรงตามชนิด (เล็ก=วงกลม, Notable=วงกลมใหญ่มีวงแหวน, Keystone=หกเหลี่ยมมน) • เปิดแล้ว=สีเต็ม, เปิดได้=วงกระพริบ, ล็อก=จาง
  tree: { x: 0, y: 0, z: 0.55, sel: null, hover: null, raf: 0, paths: {} },
  // ซูมเริ่มต้น: ให้จุดอ่านไอคอนออก (เห็นแกนกลาง + Notable วงใน) แล้วค่อยลากดูส่วนอื่น
  treeFit(cv) { return U.clamp(Math.min(cv.clientHeight / 700, cv.clientWidth / 560), 0.42, 0.8); },
  renderTree() {
    const body = $('#w-tree .win-body'), T = this.tree, p = G.player;
    if (!body.dataset.built) {
      body.dataset.built = '1'; body.innerHTML = '';
      const cv = h('canvas', { class: 'pt-cv' });
      const zoom = k => () => { T.z = U.clamp(T.z * k, 0.25, 1.8); this.drawTree(); };
      body.append(h('div', { class: 'pt-head' }, h('span', { id: 'pt-pts' }), h('span', { class: 'pt-zoom' },
        h('button', { class: 'btn', type: 'button', onclick: zoom(1 / 1.25) }, '−'), h('button', { class: 'btn', type: 'button', onclick: zoom(1.25) }, '+'),
        h('button', { class: 'btn', type: 'button', onclick: () => { T.x = 0; T.y = 0; T.z = this.treeFit(cv); this.drawTree(); } }, L('กลาง', 'Center')),
        h('button', { class: 'btn', type: 'button', onclick: () => { T.sum = !T.sum; this.renderTree(); } }, L('สรุปโบนัส', 'Summary')))),
        h('div', { class: 'pt-wrap' }, cv, h('div', { class: 'pt-info', id: 'pt-info' })),
        this.treeLegend(),
        h('div', { class: 'hint' }, L('ลากเพื่อเลื่อน • ล้อเมาส์/สองนิ้วเพื่อซูม • แตะจุดเพื่อดูรายละเอียด • ได้ 1 แต้มต่อ 1 Base Level', 'Drag to pan • wheel/pinch to zoom • tap a node for details • 1 point per Base Level')));
      this.treeInput(cv);
      T.z = this.treeFit(cv); // ครั้งแรก: ให้เห็นแกนกลางและจุด Notable วงในพอดีจอ
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { T.lpos = null; this.drawTree(); }); // วัดป้ายใหม่เมื่อฟอนต์โหลดเสร็จ
    }
    const free = Passive.free(p);
    $('#pt-pts').innerHTML = L(`แต้มพาสซีฟ <b>${free}</b> / ${Passive.total(p)}`, `Passive points <b>${free}</b> / ${Passive.total(p)}`);
    const info = $('#pt-info'), id = T.hover || T.sel;
    // สร้างกล่องรายละเอียดใหม่เฉพาะเมื่อข้อมูลเปลี่ยน (ไม่งั้นปุ่มถูกแทนที่ระหว่างกด)
    const ikey = [id, free, Passive.list(p).length, p.zeny, T.sum].join('|');
    if (info.dataset.key === ikey) { this.drawTree(); return; }
    info.dataset.key = ikey; info.innerHTML = ''; info.style.removeProperty('--pc');
    if (T.sum && !id) {
      const b = Passive.bonus(p), ks = Passive.list(p).filter(x => PTREE[x].kdesc).map(x => `${PTREE[x].name}: ${PTREE[x].kdesc}`);
      info.append(h('b', {}, L('โบนัสรวมจากต้นไม้', 'Total tree bonuses')),
        ...(Object.keys(b).length ? Object.entries(b).map(([k, v]) => h('div', { class: 'pt-i-row' }, this.treeSvg(PGLYPH[k] || 'sparkle', 14), PSTAT_FMT(k, Math.round(v * 10) / 10))) : [h('div', { class: 'dim' }, L('ยังไม่ได้เปิดจุดไหน', 'No nodes allocated yet'))]),
        ...ks.map(t => h('div', { class: 'ks' }, t)));
    } else if (id) {
      const n = PTREE[id], have = Passive.has(p, id), path = have ? [] : this.treePath(id);
      const sect = n.sect >= 0 ? PSECT[n.sect] : null, c = sect ? sect.color : n.mix ? PSECT[n.mix[0]].color : '#9fe8ff';
      const kindTh = { start: L('จุดเริ่มต้น', 'Start'), small: L('จุดเล็ก', 'Minor'), notable: 'Notable', key: 'Keystone' }[n.kind];
      const where = sect ? L(`สาย${sect.th}`, `${sect.name} path`) : n.mix ? L(`ผสม ${PSECT[n.mix[0]].th} + ${PSECT[n.mix[1]].th}`, `Hybrid ${PSECT[n.mix[0]].name} + ${PSECT[n.mix[1]].name}`) : '';
      const st = have ? [L('เปิดแล้ว', 'Allocated'), 'on'] : path.length === 1 ? [L('เปิดได้เลย', 'Available'), 'can'] : path.length ? [L(`ห่าง ${path.length} จุด`, `${path.length} nodes away`), 'far'] : null;
      info.style.setProperty('--pc', c);
      info.append(h('div', { class: 'pt-i-head' }, h('span', { class: 'pt-i-ic pt-i-' + n.kind }, this.treeSvg(Passive.glyph(n), 20)),
        h('div', { class: 'pt-i-t' }, h('b', {}, n.name), h('small', {}, kindTh + (where ? ` • ${where}` : ''))),
        st ? h('em', { class: 'pt-i-st ' + st[1] }, st[0]) : null));
      for (const [k, v] of Object.entries(n.b)) info.append(h('div', { class: 'pt-i-row' }, this.treeSvg(PGLYPH[k] || 'sparkle', 14), PSTAT_FMT(k, v)));
      if (n.kdesc) info.append(h('div', { class: 'ks' }, n.kdesc));
      if (id === 'core') info.append(h('div', { class: 'dim' }, L('ทุกคนเริ่มจากตรงนี้', 'Everyone starts here')));
      else if (have) {
        const cost = Passive.refundCost(p), ok = Passive.canRefund(p, id);
        info.append(h('button', { class: 'btn', type: 'button', disabled: ok ? null : 'disabled', onclick: () => { const e = Passive.refund(p, id); UI.msg(e || L(`คืนแต้ม ${n.name} แล้ว`, `Refunded ${n.name}`), e ? 'err' : 'sys'); this.renderTree(); } },
          L(`คืนแต้ม${cost ? ` (${U.fmt(cost)} ${CUR})` : ' (ฟรีถึง Lv 15)'}`, `Refund${cost ? ` (${U.fmt(cost)} ${CUR})` : ' (free until Lv 15)'}`)), ok ? '' : h('div', { class: 'dim' }, L('คืนได้เฉพาะจุดปลายทาง', 'Only end nodes can be refunded')));
      } else if (path.length) {
        const can = path.length <= free;
        info.append(h('button', { class: 'btn' + (can ? ' primary' : ''), type: 'button', disabled: can ? null : 'disabled',
          onclick: () => { for (const x of path) Passive.alloc(p, x); T.hover = null; this.renderTree(); } },
          path.length === 1 ? L('เปิดจุดนี้ (1 แต้ม)', 'Allocate (1 point)') : L(`เปิดทั้งเส้นทาง (${path.length} แต้ม)`, `Allocate path (${path.length} points)`)), can ? '' : h('div', { class: 'dim' }, L(`แต้มไม่พอ (มี ${free})`, `Not enough points (have ${free})`)));
      }
    } else info.append(h('div', { class: 'dim' }, L('แตะจุดบนต้นไม้เพื่อดูรายละเอียด', 'Tap a node on the tree for details')));
    this.drawTree();
  },
  // ไอคอนเส้นแบบ <svg> (ใช้ในกล่องรายละเอียดและคำอธิบายไอคอน) — path เดียวกับที่วาดบน canvas
  treeSvg(name, size = 14) {
    const NS = 'http://www.w3.org/2000/svg', s = document.createElementNS(NS, 'svg'), path = document.createElementNS(NS, 'path');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size); s.setAttribute('height', size); s.setAttribute('class', 'pt-g');
    path.setAttribute('d', PGLYPH_PATH[name] || PGLYPH_PATH.sparkle); s.append(path);
    return s;
  },
  treeLegend() {
    const kinds = [['small', L('จุดเล็ก', 'Minor')], ['notable', 'Notable'], ['key', 'Keystone']].map(([k, l]) => h('span', { class: 'pt-lg pt-lg-' + k }, h('i', {}), l));
    return h('div', { class: 'pt-legend' }, ...kinds, h('span', { class: 'pt-lg-sep' }), ...PGLYPH_LEGEND.map(([g, l]) => h('span', { class: 'pt-lg' }, this.treeSvg(g, 13), l)));
  },
  // เส้นทางสั้นที่สุดจากจุดที่เปิดแล้วไปยัง id (ไม่รวมจุดที่เปิดแล้ว)
  treePath(id) {
    const p = G.player, prev = { [id]: null }, q = [id];
    while (q.length) {
      const c = q.shift();
      if (Passive.has(p, c)) { const out = []; for (let x = prev[c]; x; x = prev[x]) out.push(x); return out; }
      for (const l of PTREE[c].links) if (!(l in prev)) { prev[l] = c; q.push(l); }
    }
    return [];
  },
  treeInput(cv) {
    const T = this.tree, pts = new Map();
    let moved = 0, pinch = 0;
    const at = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left - r.width / 2) / T.z - T.x, (e.clientY - r.top - r.height / 2) / T.z - T.y]; };
    const pick = e => {
      const [x, y] = at(e); let best = null, bd = 1e9;
      for (const n of Object.values(PTREE)) { const d = Math.hypot(n.x - x, n.y - y), rr = this.treeR(n) + 10 / T.z; if (d < rr && d < bd) { bd = d; best = n.id; } }
      return best;
    };
    cv.addEventListener('pointerdown', e => { pts.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; cv.setPointerCapture(e.pointerId); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
    cv.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) { if (e.pointerType === 'mouse') { const id = pick(e); cv.style.cursor = id ? 'pointer' : 'grab'; if (id !== T.hover) { T.hover = id; this.renderTree(); } } return; }
      const o = pts.get(e.pointerId), dx = e.clientX - o[0], dy = e.clientY - o[1];
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) T.z = U.clamp(T.z * d / pinch, 0.25, 1.8); pinch = d; moved += 10; }
      else { moved += Math.abs(dx) + Math.abs(dy); T.x += dx / T.z; T.y += dy / T.z; }
      this.drawTree();
    });
    const up = e => {
      if (pts.size === 1 && moved < 6) { T.sel = pick(e); T.hover = null; this.renderTree(); }
      pts.delete(e.pointerId); if (pts.size < 2) pinch = 0;
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', e => pts.delete(e.pointerId));
    cv.addEventListener('pointerleave', () => { if (T.hover) { T.hover = null; this.renderTree(); } });
    cv.addEventListener('wheel', e => { e.preventDefault(); T.z = U.clamp(T.z * (e.deltaY < 0 ? 1.12 : 1 / 1.12), 0.25, 1.8); this.drawTree(); }, { passive: false });
  },
  treeR(n) { return n.kind === 'key' ? 26 : n.kind === 'notable' ? 17 : n.kind === 'start' ? 22 : 11; },
  // ---- ตัวช่วยวาด ----
  treeRGBA(hex, a) { return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`; },
  // ไอคอนเส้นบน canvas (Path2D จาก SVG path เดียวกับ treeSvg) ขนาด s หน่วยโลก ตรงกลาง (x,y)
  treeGlyph(g, name, x, y, s, color, lw = 2.2) {
    const P = this.tree.paths, d = PGLYPH_PATH[name] || PGLYPH_PATH.sparkle, path = P[name] || (P[name] = new Path2D(d));
    g.save(); g.translate(x - s / 2, y - s / 2); g.scale(s / 24, s / 24);
    g.lineWidth = lw * 24 / s; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = color; g.stroke(path);
    g.restore();
  },
  // หกเหลี่ยมมุมมน (Keystone) — นุ่มตามธีม ไม่เป็นเหลี่ยมคม
  treeHex(g, x, y, r, cr = 0.3) {
    const pts = []; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 - Math.PI / 2; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const p0 = pts[i], p1 = pts[(i + 1) % 6], p2 = pts[(i + 2) % 6];
      const ax = p0[0] + (p1[0] - p0[0]) * (1 - cr), ay = p0[1] + (p1[1] - p0[1]) * (1 - cr), bx = p1[0] + (p2[0] - p1[0]) * cr, by = p1[1] + (p2[1] - p1[1]) * cr;
      if (!i) g.moveTo(ax, ay); else g.lineTo(ax, ay);
      g.quadraticCurveTo(p1[0], p1[1], bx, by);
    }
    g.closePath();
  },
  treeRoundRect(g, x, y, w, hh, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  },
  // ตำแหน่งป้ายชื่อ Notable (คำนวณครั้งเดียว): ลอง ล่าง/บน/ขวา/ซ้าย แล้วเลือกที่ไม่ทับจุดอื่นและป้ายอื่น
  treeLabelPos(g) {
    const T = this.tree; if (T.lpos) return T.lpos;
    const pos = T.lpos = {}, nodes = Object.values(PTREE), rects = [];
    // คะแนนความแย่: ทับจุดเล็ก 2, ทับ Notable/Keystone 5, ทับป้ายอื่น 10 (ป้ายทับกันอ่านไม่ออกเลย จึงแพงสุด)
    const hit = (rc, skip) => {
      let bad = 0;
      for (const m of nodes) { if (m.id === skip) continue; const rr = this.treeR(m) + 6; if (m.x + rr > rc[0] && m.x - rr < rc[2] && m.y + rr > rc[1] && m.y - rr < rc[3]) bad += m.kind === 'small' ? 2 : 5; }
      for (const o of rects) if (o[2] > rc[0] && o[0] < rc[2] && o[3] > rc[1] && o[1] < rc[3]) bad += 10;
      return bad;
    };
    g.font = '500 20px "IBM Plex Sans Thai", sans-serif';
    for (const n of nodes) {
      if (n.kind !== 'notable') continue;
      const w = g.measureText(n.name).width + 8, hh = 24, r = this.treeR(n) + 6, dy = r + hh / 2;
      const cands = [[0, dy, 'center'], [0, -dy, 'center'], [r + 4, 0, 'left'], [-r - 4, 0, 'right'],
        [r - 4, dy - 6, 'left'], [-r + 4, dy - 6, 'right'], [r - 4, -dy + 6, 'left'], [-r + 4, -dy + 6, 'right']];
      let best = null, bs = 1e9;
      for (const [dx, dy, al] of cands) {
        const x0 = al === 'center' ? n.x + dx - w / 2 : al === 'left' ? n.x + dx : n.x + dx - w;
        const rc = [x0, n.y + dy - hh / 2, x0 + w, n.y + dy + hh / 2], sc = hit(rc, n.id);
        if (sc < bs) { bs = sc; best = [dx, dy, al, rc]; }
        if (!sc) break;
      }
      pos[n.id] = best; rects.push(best[3]);
    }
    return pos;
  },
  treeLabel(g, text, x, y, font, color, align = 'center') {
    g.font = font; g.textAlign = align; g.textBaseline = 'middle';
    g.lineWidth = 4; g.lineJoin = 'round'; g.strokeStyle = 'rgba(5,9,16,.85)'; g.strokeText(text, x, y);
    g.fillStyle = color; g.fillText(text, x, y);
  },
  // วนวาดต่อเนื่องเฉพาะตอนหน้าต่างเปิด (ให้วงจุดที่เปิดได้กระพริบ) — หยุดเองเมื่อปิด
  treeLoop() {
    const T = this.tree;
    if (T.raf) return;
    const step = () => { if (!this.isOpen('w-tree') || document.hidden) { T.raf = 0; return; } this.drawTree(true); T.raf = requestAnimationFrame(step); };
    T.raf = requestAnimationFrame(step);
  },
  drawTree(fromLoop) {
    const cv = $('#w-tree .pt-cv'); if (!cv || !this.isOpen('w-tree')) return;
    if (!fromLoop) this.treeLoop();
    const T = this.tree, p = G.player, dpr = Math.min(2, window.devicePixelRatio || 1), now = performance.now() / 1000;
    const W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) return;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const g = cv.getContext('2d'), z = T.z, FONT = '"IBM Plex Sans Thai", "Noto Sans Thai", sans-serif', MONO = '"IBM Plex Mono", monospace';
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // พื้นหลัง: ไล่สีฟุ้งจากกลางจอ
    const bg = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.8);
    bg.addColorStop(0, '#0d1626'); bg.addColorStop(1, '#05080f');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.translate(W / 2, H / 2); g.scale(z, z); g.translate(T.x, T.y);
    const has = id => Passive.has(p, id), free = Passive.free(p) > 0;
    const focus = T.hover || T.sel, path = new Set(focus && !has(focus) ? this.treePath(focus) : []);
    const col = n => (n.sect >= 0 ? PSECT[n.sect].color : n.mix ? PSECT[n.mix[0]].color : '#9fe8ff');
    const rgba = (hex, a) => this.treeRGBA(hex, a);
    const pulse = 0.5 + 0.5 * Math.sin(now * 3.2);
    // แสงฟุ้งประจำแฉก (วงกลมนุ่ม ไม่มีขอบคม) + วงแหวนบาง ๆ บอกชั้น
    PSECT.forEach((S, i) => {
      const a = (-90 + i * 60) * Math.PI / 180, cx = Math.cos(a) * 400, cy = Math.sin(a) * 400;
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 470);
      gr.addColorStop(0, rgba(S.color, 0.16)); gr.addColorStop(0.6, rgba(S.color, 0.05)); gr.addColorStop(1, rgba(S.color, 0));
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 470, 0, Math.PI * 2); g.fill();
    });
    g.strokeStyle = 'rgba(255,255,255,.045)'; g.lineWidth = 1.5;
    for (const r of [160, 450, 720]) { g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); }
    // ชื่อแฉกจาง ๆ กลางแฉก (บอกทิศแม้ซูมเข้า) + ป้ายชื่อแฉกรอบนอก: แคปซูลกระจก + ไอคอน + ชื่อ + คำโปรยว่าให้อะไร
    g.textAlign = 'center'; g.textBaseline = 'middle';
    PSECT.forEach((S, i) => {
      const a = (-90 + i * 60) * Math.PI / 180, x = Math.cos(a) * 335, y = Math.sin(a) * 335;
      g.font = `600 64px ${MONO}`; g.fillStyle = rgba(S.color, 0.085); g.fillText(S.name.toUpperCase(), x, y - 14);
      if (LANG !== 'en') { g.font = `500 26px ${FONT}`; g.fillStyle = rgba(S.color, 0.12); g.fillText(S.th, x, y + 30); } // อังกฤษ: ไม่มีชื่อไทยใต้ชื่อแฉก
    });
    PSECT.forEach((S, i) => {
      const a = (-90 + i * 60) * Math.PI / 180, x = Math.cos(a) * 850, y = Math.sin(a) * 850;
      g.font = `600 30px ${FONT}`; const w1 = g.measureText(L(`${S.name} • ${S.th}`, S.name)).width;
      g.font = `500 17px ${MONO}`; const w2 = g.measureText(S.tag).width;
      const w = Math.max(w1, w2) + 44 + 36, hh = 74;
      g.fillStyle = rgba(S.color, 0.1); this.treeRoundRect(g, x - w / 2, y - hh / 2, w, hh, 26); g.fill();
      g.strokeStyle = rgba(S.color, 0.45); g.lineWidth = 2; g.stroke();
      g.fillStyle = rgba(S.color, 0.18); g.beginPath(); g.arc(x - w / 2 + 34, y, 22, 0, Math.PI * 2); g.fill();
      this.treeGlyph(g, S.icon, x - w / 2 + 34, y, 26, S.color, 2.2);
      g.textAlign = 'left'; g.textBaseline = 'middle';
      g.font = `600 30px ${FONT}`; g.fillStyle = S.color; g.fillText(L(`${S.name} • ${S.th}`, S.name), x - w / 2 + 66, y - 15);
      g.font = `500 17px ${MONO}`; g.fillStyle = rgba(S.color, 0.85); g.fillText(S.tag, x - w / 2 + 66, y + 18);
    });
    // เส้นเชื่อม: เปิดแล้ว=สีแฉกเรือง • เส้นทางที่กำลังจะเปิด=ฟ้า • ติดจุดที่เปิดแล้ว (เปิดได้)=สว่างขึ้น • อื่น ๆ=จาง
    const seen = new Set();
    for (const n of Object.values(PTREE)) for (const l of n.links) {
      const k = n.id < l ? n.id + l : l + n.id; if (seen.has(k)) continue; seen.add(k);
      const m = PTREE[l], both = has(n.id) && has(l), half = has(n.id) || has(l);
      const onPath = (path.has(n.id) || has(n.id)) && (path.has(l) || has(l)) && (path.has(n.id) || path.has(l));
      const c = n.sect >= 0 ? col(n) : col(m);
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(n.x, n.y); g.lineTo(m.x, m.y);
      if (both) { g.strokeStyle = rgba(c, 0.28); g.lineWidth = 13; g.stroke(); g.strokeStyle = '#fff1c8'; g.lineWidth = 5; g.stroke(); }
      else if (onPath) { g.strokeStyle = 'rgba(111,243,255,.25)'; g.lineWidth = 12; g.stroke(); g.strokeStyle = '#9ff0ff'; g.lineWidth = 4; g.stroke(); }
      else if (half && free) { g.strokeStyle = `rgba(190,225,255,${0.4 + 0.2 * pulse})`; g.lineWidth = 3; g.stroke(); }
      else { g.strokeStyle = 'rgba(140,165,200,.17)'; g.lineWidth = 2.5; g.stroke(); }
    }
    // จุด
    const showNotable = z >= 0.58, showKey = z > 0.28, showSmall = z > 0.95, lpos = this.treeLabelPos(g);
    const nfont = Math.min(20, Math.max(13, 12.5 / z)); // ป้าย Notable ไม่เล็กกว่า ~13px บนจอ
    const labels = []; // วาดป้ายทีหลังทุกจุด จะได้ไม่โดนจุดข้าง ๆ บัง
    for (const n of Object.values(PTREE)) {
      const r = this.treeR(n), on = has(n.id), can = !on && Passive.canAlloc(p, n.id), inPath = path.has(n.id), c = col(n), gl = Passive.glyph(n);
      const focused = n.id === focus;
      const shape = () => { if (n.kind === 'key') this.treeHex(g, n.x, n.y, r); else { g.beginPath(); g.arc(n.x, n.y, r, 0, Math.PI * 2); g.closePath(); } };
      // สีจุดผสม: ไล่สีสองแฉก
      let stroke = c, fillOn = c;
      if (n.mix) { const gr = g.createLinearGradient(n.x - r, n.y - r, n.x + r, n.y + r); gr.addColorStop(0, PSECT[n.mix[0]].color); gr.addColorStop(1, PSECT[n.mix[1]].color); stroke = fillOn = gr; }
      // แสงฟุ้งรอบจุดที่เปิดแล้ว / วงกระพริบรอบจุดที่เปิดได้
      if (on && n.kind !== 'small') { g.beginPath(); g.arc(n.x, n.y, r + 9, 0, Math.PI * 2); g.fillStyle = rgba(c, 0.2); g.fill(); }
      if (can && free) { g.beginPath(); g.arc(n.x, n.y, r + 4 + 4 * pulse, 0, Math.PI * 2); g.strokeStyle = rgba(c, 0.25 + 0.45 * (1 - pulse)); g.lineWidth = 2.5; g.stroke(); }
      // วงแหวนรอบนอกของ Notable / Keystone
      if (n.kind === 'notable' || n.kind === 'key') {
        if (n.kind === 'key') this.treeHex(g, n.x, n.y, r + 6); else { g.beginPath(); g.arc(n.x, n.y, r + 5, 0, Math.PI * 2); }
        g.lineWidth = 2; g.strokeStyle = on ? rgba(c, 0.9) : inPath ? 'rgba(159,240,255,.8)' : rgba(c, can ? 0.6 : 0.3); g.stroke();
      }
      // ตัวจุด
      shape();
      g.fillStyle = on ? fillOn : inPath ? 'rgba(111,243,255,.2)' : can ? '#141d2e' : '#0e1522'; g.fill();
      g.lineWidth = n.kind === 'small' ? 2.5 : 3.5;
      g.strokeStyle = on ? '#fff6d8' : inPath ? '#9ff0ff' : can ? stroke : (n.mix ? stroke : rgba(c, 0.38)); g.stroke();
      if (on && n.kind !== 'small') { shape(); g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,255,255,.35)'; g.stroke(); }
      if (focused) { g.beginPath(); g.arc(n.x, n.y, r + 13, 0, Math.PI * 2); g.lineWidth = 3; g.strokeStyle = '#ffffff'; g.stroke(); }
      // ไอคอนบอกว่าให้อะไร
      const gs = n.kind === 'key' ? 30 : n.kind === 'notable' ? 21 : n.kind === 'start' ? 26 : 13.5;
      const gcol = on ? '#0a1020' : inPath ? '#dffbff' : can ? '#ffffff' : (n.sect < 0 ? 'rgba(220,235,255,.65)' : rgba(c, 0.7));
      this.treeGlyph(g, gl, n.x, n.y, gs, gcol, n.kind === 'small' ? 2.4 : 2.1);
      // ชื่อ: Keystone เสมอ (ยกเว้นซูมออกมาก), Notable เมื่อซูมพอ, จุดเล็กโชว์ค่าเมื่อซูมเข้ามาก
      if (n.kind === 'key' && showKey) {
        const up = n.y < -0.3 * Math.hypot(n.x, n.y); // แฉกที่ชี้ขึ้นวางป้ายไว้ด้านบน (ห่างจากจุดถัดไปที่อยู่ด้านใน)
        labels.push([n.name, n.x, n.y + (up ? -r - 24 : r + 24), `600 18px ${FONT}`, on ? '#fff6d8' : '#e6edf7']);
        labels.push(['KEYSTONE', n.x, n.y + (up ? -r - 42 : r + 42), `600 10px ${MONO}`, rgba(c, 0.9)]);
      } else if (n.kind === 'notable' && showNotable) {
        const [dx, dy, al] = lpos[n.id] || [0, r + 17, 'center'];
        labels.push([n.name, n.x + dx, n.y + dy, `500 ${nfont}px ${FONT}`, on ? '#fff6d8' : '#d5deea', al]);
      } else if (n.kind === 'start') labels.push(['Core', n.x, n.y + r + 16, `600 14px ${FONT}`, '#dffbff']);
      else if (n.kind === 'small' && showSmall) {
        const txt = Object.entries(n.b).map(([k, v]) => PSTAT_SHORT(k, v)).join('  ');
        labels.push([txt, n.x, n.y + r + 11, `500 9.5px ${MONO}`, on ? '#fff6d8' : 'rgba(214,224,238,.9)']);
      }
    }
    for (const l of labels) this.treeLabel(g, ...l);
  },

  // ---------------- สมุดมอนสเตอร์ ----------------
  showMob(id) { this.mobInfo = id; const b = $('#w-mob .win-body'); if (b) b.dataset.key = ''; this.open('w-mob'); this.renderMob(); },
  renderMob() {
    const d = MOBS[this.mobInfo], body = $('#w-mob .win-body');
    if (!d || body.dataset.key === d.id) return;
    body.dataset.key = d.id; body.innerHTML = '';
    const RACE = { brute: L('สัตว์กลไก', 'Mech Beast'), plant: L('พืชกลไก', 'Mech Plant'), insect: L('แมลงกลไก', 'Mech Insect'), undead: L('อมตะ', 'Undead'), demon: L('ปีศาจ', 'Demon'), angel: L('เทวดา', 'Angel'), formless: L('ไร้รูป', 'Formless'), fish: L('สัตว์น้ำ', 'Aquatic'), dragon: L('มังกร', 'Dragon'), human: L('แอนดรอยด์', 'Android') };
    const cv = h('canvas', { width: 96, height: 96, class: 'mb-cv' });
    const spr = Art.get('mobsprite_' + d.id), g = cv.getContext('2d');
    if (spr) { const k = Math.min(96 / spr.width, 96 / spr.height) * 0.9; g.drawImage(spr, (96 - spr.width * k) / 2, (96 - spr.height * k) / 2, spr.width * k, spr.height * k); }
    // ธาตุที่ตีแรงที่สุด (แพ้ธาตุ)
    const weak = Object.keys(ELEM_THAI).map(e => [e, elemMod(e, d.element)]).filter(([, m]) => m > 1).sort((a, b) => b[1] - a[1]);
    const where = Object.keys(MAP_DEFS).filter(m => (MAP_DEFS[m].spawns || []).some(s => s[0] === d.id) || MAP_DEFS[m].mvp === d.id || (MAP_DEFS[m].dummies && d.dummy));
    const row = (k, v) => h('div', { class: 'mb-kv' }, h('span', {}, k), h('b', {}, String(v)));
    body.append(
      h('div', { class: 'mb-head' }, cv, h('div', {},
        h('div', { class: 'mb-name' }, d.name, d.boss ? h('span', { class: 'tag' }, 'MVP') : null),
        h('div', { class: 'mb-sub' }, L(`Lv ${d.lv} • ธาตุ${ELEM_THAI[d.element] || d.element} • ${RACE[d.race] || d.race}`, `Lv ${d.lv} • ${ELEM_THAI[d.element] || d.element} • ${RACE[d.race] || d.race}`)),
        h('div', { class: 'mb-sub ' + (d.aggro ? 'bad' : 'ok') }, d.aggro ? L('⚠ โจมตีก่อน (Aggressive)', '⚠ Aggressive') : L('ไม่โจมตีก่อน (Passive)', 'Passive (non-aggressive)')),
        h('div', { class: 'mb-sub' }, L(`ล่าแล้ว: ${U.fmt((G.player.kills || {})[d.id] || 0)} ตัว`, `Defeated: ${U.fmt((G.player.kills || {})[d.id] || 0)}`)),
        MOB_CHIP[d.id] ? h('div', { class: 'mb-sub' }, (G.player.chips || []).includes(d.id) ? L(`✦ ได้ ${ITEMS[MOB_CHIP[d.id]].name} แล้ว`, `✦ ${ITEMS[MOB_CHIP[d.id]].name} obtained`)
          : L(`✦ ${ITEMS[MOB_CHIP[d.id]].name}: ล่าอีก ${Math.max(0, chipNeed(d) - ((G.player.kills || {})[d.id] || 0))} ตัว`, `✦ ${ITEMS[MOB_CHIP[d.id]].name}: ${Math.max(0, chipNeed(d) - ((G.player.kills || {})[d.id] || 0))} more to go`)) : null,
        weak.length ? h('div', { class: 'mb-sub' }, L(`แพ้ธาตุ: ${weak.slice(0, 3).map(([e, m]) => `${ELEM_THAI[e]} ×${m}`).join(', ')}`, `Weak to: ${weak.slice(0, 3).map(([e, m]) => `${ELEM_THAI[e]} ×${m}`).join(', ')}`)) : null)),
      h('div', { class: 'mb-grid' }, row('HP', U.fmt(d.hp)), row('ATK', `${d.atk[0]}–${d.atk[1]}`), row('DEF', d.def), row('MDEF', d.mdef),
        row('HIT', d.hit), row('FLEE', d.flee), row('Base EXP', (() => { const em = expLevelMul(d.lv, G.player.baseLv); return `${U.fmt(Math.round(d.exp * em))}${em !== 1 ? ` (${Math.round(em * 100)}%)` : ''}`; })()), row('Job EXP', U.fmt(Math.round(d.jexp * expLevelMul(d.lv, G.player.baseLv)))), row(CUR, `${U.fmt(mobZeny(d)[0])}–${U.fmt(mobZeny(d)[1])}`)),
      h('div', { class: 'mb-h' }, L('ไอเทมที่ดรอป', 'Drops')),
      h('div', { class: 'mb-drops' }, ...(d.drops.length ? d.drops.map(([id, ch]) => h('div', { class: 'mb-drop', title: ITEMS[id].desc || '' },
        h('img', { src: itemIconUrl(id), alt: '' }), h('span', { class: rarCls(id) }, ITEMS[id].name), h('em', {}, `${ch >= 0.1 ? Math.round(ch * 100) : (ch * 100).toFixed(ch < 0.01 ? 2 : 1)}%`))) : [h('span', { class: 'hint' }, L('ไม่มี', 'None'))])),
      d.boss ? h('div', { class: 'mb-mvp', id: 'mb-mvp' }, this.mvpStatus(d.id)) : null,
      h('div', { class: 'mb-h' }, 'Found in'),
      h('div', { class: 'mb-where' }, where.length ? where.map(m => `${MAP_DEFS[m].name}${MAP_DEFS[m].level ? ` (Lv ${MAP_DEFS[m].level})` : ''}`).join(' • ') : '-'),
      where.length ? h('div', { class: 'opt-btns' }, h('button', { class: 'btn', onclick: () => { Nav.goTo({ kind: 'mob', map: where[0], mobId: d.id, name: d.name }); this.close('w-mob'); } }, L('🧭 นำทางไปล่า', '🧭 Go hunt'))) : null,
    );
  },
  renderStorage() {
    const p = G.player, body = $('#w-storage .win-body');
    body.innerHTML = '';
    // เดินห่างจาก NPC เกิน 6 ช่อง = ปิดคลัง
    const kaia = G.npcs.find(n => n.id === 'storage');
    if (!kaia || U.dist(p.x, p.y, kaia.x, kaia.y) > 6) { this.close('w-storage'); return; }
    const pane = (title, list, onPick, cap) => {
      const grid = h('div', { class: 'inv-grid st-pane' });
      for (const e of list) {
        const cell = h('div', { class: 'inv-cell rarc-' + rarCls(e.id).slice(4), title: L(`${itemDisplayName(e)}${e.qty > 1 ? ' ×' + e.qty : ''} — แตะเพื่อย้าย`, `${itemDisplayName(e)}${e.qty > 1 ? ' ×' + e.qty : ''} — tap to move`) },
          h('img', { src: itemIconUrl(e.id), alt: '' }),
          e.qty > 1 || !isEquipType(ITEMS[e.id]) ? h('span', { class: 'q' }, String(e.qty)) : null,
          e.refine ? h('span', { class: 'rf' }, '+' + e.refine) : null);
        cell.addEventListener('click', () => { onPick(e); saveGame(); this.renderStorage(); });
        grid.append(cell);
      }
      if (!list.length) grid.append(h('div', { class: 'hint' }, 'Empty'));
      return h('div', { class: 'st-col' }, h('div', { class: 'st-h' }, title, h('small', {}, cap)), grid);
    };
    body.append(
      h('div', { class: 'st-cols' },
        pane('Inventory', p.inventory, e => storeItem(e), `${p.inventory.length}`),
        pane('Storage', p.storage, e => takeItem(e), `${p.storage.length}/${STORAGE_MAX}`)),
      h('div', { class: 'opt-btns' },
        h('button', { class: 'btn', onclick: () => { for (const e of p.inventory.filter(x => ['etc', 'card'].includes(ITEMS[x.id].type))) storeItem(e); saveGame(); this.renderStorage(); } }, L('ฝากของอื่น ๆ + ชิปทั้งหมด', 'Store all Etc + chips')),
        h('button', { class: 'btn', onclick: () => { sortItems(p.inventory); sortItems(p.storage); saveGame(); this.renderStorage(); } }, L('จัดเรียงทั้งสองฝั่ง', 'Sort both'))),
      h('div', { class: 'hint' }, L('แตะไอเทมเพื่อย้ายไปอีกฝั่ง (ย้ายทั้งกอง) • ของที่สวมอยู่ต้องถอดก่อน', 'Tap an item to move it across (whole stack) • unequip worn items first')));
  },
  renderEmote() {
    const body = $('#w-emote .win-body');
    if (body.childElementCount) return;
    const grid = h('div', { class: 'emote-grid' });
    EMOTES.forEach((e, i) => {
      const c = h('canvas', { width: 44, height: 40 });
      const g = c.getContext('2d');
      const draw = () => { g.clearRect(0, 0, 44, 40); Emote.draw(g, 22, 22, { k: e.k, at: -9, until: 1e9 }, 0); };
      draw();
      grid.append(h('button', { class: 'emote-b', title: `/${e.k}${i < 9 ? ` • Alt+${i + 1}` : ''}`, onclick: () => { Emote.play(e.k); if (Pad.enabled()) this.close('w-emote'); } }, c, h('span', {}, e.name)));
    });
    body.append(grid, h('div', { class: 'hint' }, L('พิมพ์ /คำสั่ง ในแชตก็ได้ เช่น /lv /gg /thx • คอม: Alt+1..9', 'Or type a /command in chat, e.g. /lv /gg /thx • PC: Alt+1..9')));
  },
  renderQuest() {
    const body = $('#w-quest .win-body'), q = Quest.current(), s = Quest.state();
    const [a, b] = Quest.progress(q);
    const bs = Bounty.state();
    const key = `${s.i}|${a}|${b}|${bs ? bs.list.map(x => x.got + (x.claimed ? 'c' : '')).join(',') : ''}`;
    if (body.dataset.key === key) return;
    body.dataset.key = key; body.innerHTML = '';
    if (q) {
      body.append(h('div', { class: 'q-card' },
        q.ch ? h('div', { class: 'q-chapter' }, Quest.chapterText(q)) : null,
        h('h4', {}, `📜 ${q.title}`), h('p', {}, q.desc),
        h('p', { class: 'q-obj' }, L(`เป้าหมาย: ${Quest.objText(q)}`, `Objective: ${Quest.objText(q)}`)),
        h('p', { class: 'q-rw' }, L(`รางวัล: ${Quest.rewardText(q)}`, `Reward: ${Quest.rewardText(q)}`)),
        h('div', { class: 'opt-btns' }, h('button', { class: 'btn', onclick: () => { Quest.go(); this.close('w-quest'); } }, L('🧭 นำทางไปทำเควสต์', '🧭 Go to quest')))));
    } else body.append(h('div', { class: 'q-card' }, h('div', { class: 'q-chapter' }, L('บทที่ 6 — รากที่ถูกแทะ', 'Chapter 6 — The Gnawed Root')), h('h4', {}, L('🏆 เร็ว ๆ นี้', '🏆 Coming Soon')), h('p', {}, L('เสียงแทะยังดังอยู่ใต้โพรง... ระหว่างรอ ออกล่า MVP และเก็บชิปหายากต่อได้เลย!', 'The gnawing still echoes beneath the hollow... Until then, hunt MVPs and keep collecting rare chips!'))));
    body.append(h('div', { class: 'q-card' }, h('h4', {}, L('งานล่าค่าหัววันนี้', 'Daily Bounties')),
      bs ? bs.list.map(x => h('p', { class: x.claimed ? 'q-rw' : 'q-obj' }, `${x.claimed ? '✅' : x.got >= x.n ? L('🎁 ส่งได้ —', '🎁 Ready —') : '•'} ${Bounty.line(x)} — ${U.fmt(x.zeny)} ${CUR}`))
        : h('p', { class: 'q-rw' }, L(`เปิดที่ Base Lv ${BOUNTY_MIN_LV} — รับงานที่ Guard Unit Rolf ในเมือง`, `Unlocks at Base Lv ${BOUNTY_MIN_LV} — take bounties from Guard Unit Rolf in town`)),
      bs ? h('p', { class: 'q-rw' }, L('ส่งงานที่ Guard Unit Rolf • ทำครบ 3 งานได้โบนัส • งานใหม่ทุกวัน', 'Turn in to Guard Unit Rolf • bonus for all 3 • new bounties daily')) : null));
    body.append(h('div', { class: 'q-done' }, h('span', {}, L(`สำเร็จแล้ว ${s.done.length}/${QUESTS.length}`, `Completed ${s.done.length}/${QUESTS.length}`)),
      ...QUESTS.filter(x => s.done.includes(x.id)).map(x => h('b', {}, `✔ ${x.title}`))));
  },
  renderNav() {
    const body = $('#w-nav .win-body');
    // แท็บล่าเก็บเลเวลมีนับถอยหลัง MVP/จำนวนที่ล่า → อัปเดตทุก 5 วิ (ตำแหน่งเลื่อนถูกจำไว้)
    const key = this.navTab + '|' + G.map.id + '|' + G.player.baseLv + (this.navTab === 'mob' ? '|' + Math.floor(G.time / 5) : '');
    if (body.dataset.key === key) return;
    body.dataset.key = key; body.innerHTML = '';
    const tabs = [['mob', 'Leveling'], ['here', 'This Map'], ['place', 'Places'], ['map', 'Maps']];
    body.append(h('div', { class: 'tabs' }, ...tabs.map(([k, l]) => h('button', { class: 'tab' + (this.navTab === k ? ' on' : ''), onclick: () => { this.navTab = k; body.dataset.key = ''; this.renderNav(); } }, l))));
    const list = h('div', { class: 'nav-list' });
    const row = (t, sub, extra) => h('button', { class: 'nav-row' + (t.map === G.map.id ? ' here' : ''), onclick: () => Nav.goTo(t) },
      h('span', { class: 'nav-n' }, t.name, extra ? h('span', { class: 'tag' }, extra) : null), h('span', { class: 'nav-s' }, sub));
    if (this.navTab === 'here') for (const t of Nav.here()) list.append(row(t, L(`${t.sub} • ${Math.round(t.d)} ช่อง`, `${t.sub} • ${Math.round(t.d)} tiles`)));
    else if (this.navTab === 'place') for (const t of Nav.places()) list.append(row(t, MAP_DEFS[t.map].name));
    else if (this.navTab === 'map') for (const t of Nav.maps()) list.append(row(t, `${t.thai}${t.level ? ` • Lv ${t.level}` : ''}`, t.map === G.map.id ? L('อยู่ที่นี่', 'Here') : null));
    else this.renderHuntList(list);
    body.append(list, h('div', { class: 'hint' }, L('แตะแล้วตัวละครจะเดินไปเองและเริ่มตี ข้ามแผนที่ได้ • แตะพื้นเพื่อยกเลิก', 'Tap to auto-walk there and attack, even across maps • tap the ground to cancel')));
  },
  // รายการล่าเก็บเลเวล: จัดกลุ่มตามความเหมาะกับเลเวลผู้เล่น แตะเพื่อเดินไปตีทันที
  renderHuntList(list) {
    const p = G.player, lv = p.baseLv, lo = lv - 5, hi = lv + 5;
    const fit = t => t.mvp ? 'mvp' : t.lv > hi ? 'hard' : t.lv < lo ? 'easy' : 'good';
    const all = Nav.mobs(), groups = { good: [], hard: [], mvp: [], easy: [] };
    for (const t of all) groups[fit(t)].push(t);
    groups.good.sort((a, b) => MOBS[b.mobId].exp * expLevelMul(MOBS[b.mobId].lv, G.player.baseLv) - MOBS[a.mobId].exp * expLevelMul(MOBS[a.mobId].lv, G.player.baseLv));
    groups.easy.reverse();
    list.append(h('div', { class: 'hunt-head' }, h('b', {}, `Base Lv ${lv}`), h('span', {}, L(`มอนที่เหมาะ: Lv ${Math.max(1, lo)}–${hi}`, `Suggested: Lv ${Math.max(1, lo)}–${hi}`))));
    const HEAD = { good: [L('เหมาะกับคุณ', 'Your level'), L('EXP ดี ตีไม่ตาย', 'Good EXP, safe')], hard: [L('เลเวลสูงกว่า', 'Higher level'), L('EXP มากแต่อันตราย', 'More EXP, but dangerous')], mvp: ['MVP', L('บอสประจำแผนที่ ไปเป็นทีม', 'Map bosses — bring a party')], easy: [L('ผ่านมาแล้ว', 'Outleveled'), L('ง่ายเกินไป EXP น้อย', 'Too easy, low EXP')] };
    for (const k of ['good', 'hard', 'mvp', 'easy']) {
      if (!groups[k].length) continue;
      list.append(h('div', { class: 'hunt-sec ' + k }, h('b', {}, HEAD[k][0]), h('span', {}, HEAD[k][1])));
      for (const t of groups[k]) {
        const d = MOBS[t.mobId], kc = (p.kills || {})[t.mobId] || 0, spr = Art.get('mobsprite_' + t.mobId);
        const r = h('button', { class: `hunt-row ${k}` + (t.map === G.map.id ? ' here' : ''), onclick: () => Nav.goTo(t) },
          h('span', { class: 'hunt-pic' }, spr ? h('img', { src: spr.src, alt: '' }) : h('i', { style: `background:${d.color || '#6ff3ff'}` })),
          h('span', { class: 'hunt-mid' },
            h('span', { class: 'hunt-n' }, t.name, d.aggro ? h('span', { class: 'hunt-tag bad' }, 'Aggro') : null),
            h('span', { class: 'hunt-s' }, `${t.mapName}${t.map === G.map.id ? L(' · อยู่ที่นี่', ' · Here') : ''}${kc ? L(` · ล่าแล้ว ${U.fmt(kc)}`, ` · ${U.fmt(kc)} defeated`) : ''}${t.mvp ? ` · ${this.mvpStatus(t.mobId).replace(/^[^ ]+ /, '')}` : ''}`)),
          h('span', { class: 'hunt-r' }, h('b', {}, `Lv ${t.lv}`), h('small', { class: expLevelMul(d.lv, G.player.baseLv) < 1 ? 'exp-low' : expLevelMul(d.lv, G.player.baseLv) > 1 ? 'exp-hi' : '' }, `+${U.fmt(Math.round(d.exp * expLevelMul(d.lv, G.player.baseLv)))} EXP${expLevelMul(d.lv, G.player.baseLv) !== 1 ? ` · ${Math.round(expLevelMul(d.lv, G.player.baseLv) * 100)}%` : ''}`)),
          h('span', { class: 'hunt-info', title: L('ข้อมูลมอนสเตอร์', 'Monster info'), onclick: e => { e.stopPropagation(); this.showMob(t.mobId); } }, 'i'));
        list.append(r);
      }
    }
  },
  optKey() { return JSON.stringify(G.player.options, (k, v) => k === 'bot' ? undefined : v) + '|' + !!document.fullscreenElement + '|' + (typeof Pad !== 'undefined' ? Pad.mode : ''); },
  // ปั๊มยาอัตโนมัติ: ชุดควบคุมเดียวกันทั้งหน้าตั้งค่าและหน้าบอท (ค่าเดียวกัน ใช้ทั้งเล่นเองและบอท)
  autoPotControls(rekey) {
    const c = autoPotCfg();
    const slider = (key, label) => {
      const val = h('b', {}, `${c[key]}%`);
      const inp = h('input', { type: 'range', min: 0, max: 95, value: c[key], disabled: c.on ? false : 'disabled',
        oninput: e => { c[key] = +e.target.value; val.textContent = `${c[key]}%`; rekey(); }, onchange: () => saveGame() });
      return h('label', { class: 'bot-row' + (c.on ? '' : ' off') }, h('span', {}, label), inp, val);
    };
    return [
      h('label', { class: 'opt' }, h('input', { type: 'checkbox', checked: c.on ? 'checked' : false,
        onchange: e => { c.on = e.target.checked; saveGame(); rekey(true); } }), L(' ปั๊มยาอัตโนมัติ (เล่นเองและบอทใช้ค่าเดียวกัน)', ' Auto-potion (shared by manual play and bot)')),
      slider('hp', L('ปั๊ม HP เมื่อต่ำกว่า', 'HP potion below')),
      slider('sp', L('ปั๊ม SP เมื่อต่ำกว่า', 'SP potion below')),
    ];
  },
  renderOptions(force) {
    const p = G.player, o = p.options;
    const body = $('#w-options .win-body');
    const key = this.optKey();
    if (!force && body.dataset.key === key) return; // ค่าไม่เปลี่ยน ไม่ต้องสร้างใหม่ (ลากตัวเลื่อนได้ลื่น)
    body.dataset.key = key;
    body.innerHTML = '';
    const chk = (key, label) => h('label', { class: 'opt' },
      h('input', { type: 'checkbox', checked: o[key] ? 'checked' : false, onchange: e => { o[key] = e.target.checked; saveGame(); } }), ' ', label);
    body.append(
      chk('autoLoot', L('เก็บไอเทมอัตโนมัติ (Auto Loot)', 'Auto Loot')),
      ...this.autoPotControls(full => { if (full) this.renderOptions(true); else body.dataset.key = this.optKey(); }),
      h('label', { class: 'opt' }, h('input', { type: 'checkbox', checked: o.autoCounter !== false ? 'checked' : false, onchange: e => { o.autoCounter = e.target.checked; saveGame(); } }), L(' โจมตีกลับอัตโนมัติเมื่อถูกโจมตี', ' Auto counter-attack when hit')),
      h('label', { class: 'opt' }, h('input', { type: 'checkbox', checked: o.skillAim !== false ? 'checked' : false, onchange: e => { o.skillAim = e.target.checked; G.pendingSkill = null; saveGame(); } }), L(' กดสกิลแล้วคลิกเลือกเป้า (แบบ RO) — ปิด = ใช้ใส่เป้าปัจจุบันทันที', ' Click a target after pressing a skill (RO-style) — off = cast on current target')),
      chk('sound', L('เสียงเอฟเฟกต์', 'Sound effects')),
      h('label', { class: 'opt' }, L('ความดังเอฟเฟกต์ ', 'SFX volume '),
        h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: o.sfxVol != null ? o.sfxVol : 0.8, oninput: e => { o.sfxVol = +e.target.value; Sound.setVolume(); body.dataset.key = this.optKey(); }, onchange: () => { saveGame(); Sound.play('pickup'); } })),
      h('label', { class: 'opt' }, h('input', { type: 'checkbox', checked: o.music ? 'checked' : false, onchange: e => { o.music = e.target.checked; o.musicSet = true; saveGame(); } }), L(' เพลงประกอบ (BGM)', ' Music (BGM)')),
      h('label', { class: 'opt' }, L('ความดังเพลง ', 'Music volume '),
        h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: o.musicVol != null ? o.musicVol : 0.7, oninput: e => { o.musicVol = +e.target.value; Music.setVolume(o.musicVol); body.dataset.key = this.optKey(); }, onchange: () => saveGame() })),
      chk('expMsg', L('แสดงข้อความ EXP ในแชท', 'Show EXP messages in chat')),
      h('div', { class: 'opt-lbl' }, 'ภาษา / Language'),
      h('div', { class: 'seg' }, ...[['th', 'ไทย'], ['en', 'English']].map(([v, l]) =>
        h('button', { type: 'button', class: LANG === v ? 'on' : '', onclick: () => setLang(v) }, l))),
      h('div', { class: 'opt-lbl' }, L('คุณภาพกราฟิก', 'Graphics quality')),
      h('div', { class: 'seg' }, ...[['high', L('สวย (ค่าเริ่มต้น)', 'High (default)')], ['low', L('ประหยัด (มือถือรุ่นเก่า)', 'Low (older phones)')]].map(([v, l]) =>
        h('button', { type: 'button', class: (o.gfx || 'high') === v ? 'on' : '', onclick: () => { o.gfx = v; R.setQuality(v); saveGame(); this.renderOptions(true); } }, l))),
      h('label', { class: 'opt' }, h('input', { type: 'checkbox', checked: o.shake !== false ? 'checked' : false, onchange: e => { o.shake = e.target.checked; saveGame(); } }), L(' จอสั่นตอนตีแรง/โดนบอส', ' Screen shake')),
      h('div', { class: 'opt-lbl' }, L('ปุ่มควบคุมบนจอ (จอย + ปุ่มโจมตี)', 'On-screen controls')),
      h('div', { class: 'seg' }, ...[['auto', L('อัตโนมัติ', 'Auto')], ['on', 'On'], ['off', 'Off']].map(([v, l]) =>
        h('button', { type: 'button', class: Pad.mode === v ? 'on' : '', onclick: () => { Pad.setMode(v); this.renderOptions(true); } }, l))),
      h('div', { class: 'opt-btns' },
        h('button', { class: 'btn', onclick: () => saveGame(false) }, L('บันทึกเกม', 'Save game')),
        Online.loggedIn ? h('button', { class: 'btn', onclick: async () => { saveGame(true, true); await Online.logout(); location.reload(); } }, L(`ออกจากระบบ (${Online.username})`, `Log out (${Online.username})`)) : null,
        h('button', { class: 'btn', onclick: () => this.open('w-help') }, 'Help'),
        document.fullscreenEnabled ? h('button', { class: 'btn', onclick: () => toggleFullscreen() }, document.fullscreenElement ? L('ออกจากเต็มจอ', 'Exit fullscreen') : 'Fullscreen') : null,
        // บันทึกแล้วกลับไปหน้าเลือกตัวละคร (สร้าง/ลบตัวละครทำได้ที่นั่น)
        h('button', { class: 'btn', id: 'opt-charsel', onclick: () => switchCharacter() }, L('เปลี่ยนตัวละคร', 'Change character'))),
    );
  },

  // ---------------- ป็อปอัปยืนยัน ----------------
  confirm(text) {
    return new Promise(res => {
      const w = $('#w-confirm');
      $('.win-body', w).innerHTML = '';
      $('.win-body', w).append(h('div', { class: 'cf-text' }, text),
        h('div', { class: 'cf-btns' },
          h('button', { class: 'btn', onclick: () => { w.classList.add('hidden'); res(true); } }, 'OK'),
          h('button', { class: 'btn', onclick: () => { w.classList.add('hidden'); res(false); } }, 'Cancel')));
      w.classList.remove('hidden'); w.style.zIndex = ++this.z + 1000;
    });
  },
  async compoundCard(entry) {
    const p = G.player, card = ITEMS[entry.id];
    // เครื่องประดับมี 2 ช่อง: ใส่ชิ้นที่ยังมีช่องชิปว่างก่อน
    const cand = [card.slot, card.slot === 'acc' ? 'acc2' : null].map(s => s && p.equip[s]).filter(Boolean);
    const target = cand.find(t => ITEMS[t.id].slots && t.cards.length < ITEMS[t.id].slots) || cand[0];
    if (!target) { this.msg(L(`ต้องสวมใส่ ${SLOT_THAI[card.slot]} ก่อน จึงจะใส่ ${card.name} ได้`, `Equip a ${SLOT_THAI[card.slot]} first to insert ${card.name}`), 'err'); return; }
    const ti = ITEMS[target.id];
    if (!ti.slots || target.cards.length >= ti.slots) { this.msg(L(`${itemDisplayName(target)} ไม่มีช่องชิปว่าง`, `${itemDisplayName(target)} has no free chip slot`), 'err'); return; }
    if (!(await this.confirm(L(`ติดตั้ง ${card.name} ลงใน ${itemDisplayName(target)}? (ถอดคืนได้ฟรีที่ Brokk Forge-Bot)`, `Insert ${card.name} into ${itemDisplayName(target)}? (Brokk Forge-Bot can remove it for free)`)))) return;
    if (!p.inventory.includes(entry) || !EQUIP_SLOTS.some(s => p.equip[s] === target)) return;
    target.cards.push(entry.id);
    removeEntry(entry, 1);
    recalc();
    this.msg(L(`ติดตั้ง ${card.name} สำเร็จ!`, `${card.name} inserted!`), 'lvl');
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
      b.append(h('div', { class: 'dlg-text', html: text }), h('div', { class: 'dlg-btns' }, h('button', { class: 'btn', onclick: () => { this.dialog = null; res(); } }, L('ต่อไป ▸', 'Next ▸'), Pad.enabled() ? null : h('kbd', {}, 'Space'))));
      this.dialog = { reject: rej };
    });
  },
  menu(name, text, options) {
    return new Promise((res, rej) => {
      this.dlgOpen(name);
      const b = $('#w-dialog .win-body');
      if (text) b.append(h('div', { class: 'dlg-text', html: text }));
      this.dlgArmed = false;
      b.append(h('div', { class: 'dlg-menu' }, options.map((o, i) => h('button', { class: 'dlg-opt', onclick: () => { this.dialog = null; res(i); } },
        Pad.enabled() || i > 8 ? null : h('kbd', {}, String(i + 1)), o))));
      this.dialog = { reject: rej };
    });
  },
  dlgClose() { this.dialog = null; $('#w-dialog').classList.add('hidden'); },
  dlgKey(k) {
    const w = $('#w-dialog'), next = $('.dlg-btns button', w), opts = $$('.dlg-opt', w);
    if (next && (k === ' ' || k === 'enter')) { next.click(); return true; }
    if (!opts.length) return false;
    let i = opts.findIndex(o => o.classList.contains('kbd'));
    const mark = j => { opts.forEach(o => o.classList.remove('kbd')); opts[j].classList.add('kbd'); opts[j].scrollIntoView({ block: 'nearest' }); };
    if (k === 'arrowdown' || k === 's') { mark(i < 0 ? 0 : (i + 1) % opts.length); this.dlgArmed = true; return true; }
    if (k === 'arrowup' || k === 'w') { mark(i <= 0 ? opts.length - 1 : i - 1); this.dlgArmed = true; return true; }
    // ยังไม่ได้เลือกด้วยลูกศร: กดครั้งแรกแค่ไฮไลต์ตัวเลือกแรก (ต้องกดซ้ำเพื่อยืนยัน) — กันเผลอเลือก
    if (k === ' ' || k === 'enter') { if (i < 0 || !this.dlgArmed) { mark(i < 0 ? 0 : i); this.dlgArmed = true; return true; } opts[i].click(); this.dlgArmed = false; return true; }
    if (/^[1-9]$/.test(k) && +k <= opts.length) { opts[+k - 1].click(); return true; }
    return false;
  },
  // ภาพประกอบตัวละครข้างกล่องบทสนทนา (แบบเกมอนิเมะ)
  illust(key) {
    const el = $('#illust');
    const img = key && Art.get(key);
    // กล่องคุย: รูปหน้า NPC ในวงกลม (มือถือ: ภาพประกอบใหญ่ถูกกล่องคุยบัง)
    const dw = $('#w-dialog'); dw.classList.toggle('has-pic', !!img); if (img) dw.style.setProperty('--npc-pic', `url("${img.src}")`);
    if (!img) { el.classList.remove('show'); return; }
    if (el.dataset.key !== key) { el.innerHTML = ''; el.append(Object.assign(new Image(), { src: img.src, alt: '' })); el.dataset.key = key; }
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  },
  // ฉากเปิดตัวบอส
  splash(key, title, sub, cls) {
    // ป้ายชื่อแมพยังแสดงอยู่ → คำเตือนบอสรอให้จบก่อน (ใช้ช่องบนจอเดียวกัน ไม่ทับกัน)
    const wait = cls !== 'upgrade' ? (this._bannerUntil || 0) - performance.now() : 0;
    if (wait > 0) { clearTimeout(this._splashT); this._splashT = setTimeout(() => this.splash(key, title, sub, cls), wait); return; }
    const img = Art.get(key);
    const el = $('#splash');
    el.innerHTML = '';
    const pic = img ? Object.assign(new Image(), { src: img.src, alt: '' }) : null;
    const txt = h('div', { class: 'sp-text' }, h('small', {}, sub || 'WARNING'), h('b', {}, title));
    // บอส: การ์ดภาพครอปกลางจอ (ไม่บังทั้งจอ) • อัปเกรด Class: ภาพเต็มจอแบบเดิม
    const boss = cls !== 'upgrade';
    if (boss) el.append(h('div', { class: 'sp-card' }, pic, h('i', { class: 'sp-sheen' }), txt));
    else el.append(pic, txt);
    el.classList.toggle('noimg', !img);
    el.classList.toggle('upgrade', !boss);
    el.classList.toggle('boss', boss);
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
    // ซื้อ/ขายแล้วหน้าต่างวาดใหม่ → จำตำแหน่งเลื่อนไว้ ไม่ให้เด้งกลับขึ้นบน
    const old = $('.shop-list', body), keep = { list: old ? old.scrollTop : 0, body: body.scrollTop, mode: old && old.dataset.mode };
    body.innerHTML = '';
    body.append(h('div', { class: 'tabs' },
      h('button', { class: 'tab' + (s.mode === 'buy' ? ' on' : ''), onclick: () => { s.mode = 'buy'; this.renderShop(); } }, 'Buy'),
      h('button', { class: 'tab' + (s.mode === 'sell' ? ' on' : ''), onclick: () => { s.mode = 'sell'; this.renderShop(); } }, 'Sell')));
    const list = h('div', { class: 'shop-list' });
    if (s.mode === 'buy') {
      for (const id of s.list) {
        const it = ITEMS[id];
        const usable = !isEquipType(it) || canJobUse(it.jobs, p.job);
        const qty = h('input', { type: 'number', min: 1, max: 999, value: 1, class: 'qty' });
        if (isEquipType(it)) qty.style.visibility = 'hidden';
        list.append(h('div', { class: 'shop-row' + (usable ? '' : ' dim') },
          this.tipFor(h('img', { src: itemIconUrl(id), alt: '', class: 'slotic rarc-' + rarCls(id).slice(4) }), { id, refine: 0, cards: [] }),
          h('div', { class: 'shop-n' }, h('b', { class: rarCls(id) }, it.name + (it.slots ? ` [${it.slots}]` : '')), h('small', {}, EN(it.desc) + (it.lv ? ` (Lv ${it.lv}+)` : '')), isEquipType(it) && usable ? this.compareLine({ id, refine: 0, cards: [] }, true) : null),
          h('span', { class: 'shop-p' + (it.price > p.zeny ? ' poor' : '') }, U.fmt(it.price) + ' ' + CUR),
          qty,
          h('button', { class: 'btn small', onclick: () => this.buy(id, Math.max(1, Math.min(999, parseInt(qty.value, 10) || 1))) }, 'Buy')));
      }
    } else {
      const inv = p.inventory.slice();
      if (!inv.length) list.append(h('div', { class: 'hint' }, L('ไม่มีไอเทมให้ขาย', 'Nothing to sell')));
      for (const e of inv) {
        const it = ITEMS[e.id];
        const price = Math.floor(it.price / 2);
        list.append(h('div', { class: 'shop-row' },
          this.tipFor(h('img', { src: itemIconUrl(e.id), alt: '', class: 'slotic rarc-' + rarCls(e.id).slice(4) }), e),
          h('div', { class: 'shop-n' }, h('b', { class: rarCls(e.id) }, itemDisplayName(e)), h('small', {}, L(`มี ${e.qty} ชิ้น`, `Owned: ${e.qty}`))),
          h('span', { class: 'shop-p' }, U.fmt(price) + ' ' + CUR),
          h('button', { class: 'btn small', onclick: () => this.sell(e, 1) }, 'Sell 1'),
          e.qty > 1 ? h('button', { class: 'btn small', onclick: () => this.sell(e, e.qty) }, 'All') : null));
      }
      if (inv.some(e => ITEMS[e.id].type === 'etc' && !ITEMS[e.id].keep)) {
        list.prepend(h('div', { class: 'shop-row sellall' },
          h('button', { class: 'btn', onclick: () => { for (const e of p.inventory.filter(x => ITEMS[x.id].type === 'etc' && !ITEMS[x.id].keep)) this.sell(e, e.qty, true); Sound.play('buy'); } }, L('ขายของดรอป (Etc) ทั้งหมด', 'Sell all Etc items'))));
      }
    }
    list.dataset.mode = s.mode;
    body.append(list, h('div', { class: 'inv-foot' }, `${CUR}: `, h('b', {}, U.fmt(p.zeny))));
    if (keep.mode === s.mode) { list.scrollTop = keep.list; body.scrollTop = keep.body; }
  },
  buy(id, qty) {
    const p = G.player, it = ITEMS[id];
    const cost = it.price * qty;
    if (p.zeny < cost) { this.msg(L(`${CUR} ไม่เพียงพอ`, `Not enough ${CUR}`), 'err'); return; }
    p.zeny -= cost;
    addItem(id, qty, true);
    this.msg(L(`ซื้อ ${it.name} ×${qty} (-${U.fmt(cost)} ${CUR})`, `Bought ${it.name} ×${qty} (-${U.fmt(cost)} ${CUR})`), 'item');
    Sound.play('buy');
    this.dirty();
  },
  sell(e, qty, quiet) {
    const p = G.player, it = ITEMS[e.id];
    if (!p.inventory.includes(e)) return;
    const gain = Math.floor(it.price / 2) * qty;
    removeEntry(e, qty);
    p.zeny += gain;
    if (!quiet) { this.msg(L(`ขาย ${it.name} ×${qty} (+${U.fmt(gain)} ${CUR})`, `Sold ${it.name} ×${qty} (+${U.fmt(gain)} ${CUR})`), 'item'); Sound.play('buy'); }
    this.dirty();
  },

  // ---------------- บอท ----------------
  updateBotButton() {
    const b = $('#auto-btn');
    b.classList.toggle('on', Bot.on);
    b.classList.toggle('locked', !Bot.unlocked());
    const t = !Bot.unlocked() ? 'Lock' : Bot.on ? (Bot.resting ? L('พัก', 'Rest') : 'On') : 'Off';
    const sm = $('small', b);
    if (sm.textContent !== t) sm.textContent = t;
  },
  botPotsText() {
    const hpN = HP_POTS.reduce((a, id) => a + countItem(id), 0), spN = SP_POTS.reduce((a, id) => a + countItem(id), 0);
    return L(`ชุดซ่อมคงเหลือ ${hpN} • เซลล์พลังงานคงเหลือ ${spN} — บอททำงานต่อแม้สลับแท็บ/แอป (จำลองย้อนหลังสูงสุด 10 นาที)`, `Repair kits: ${hpN} • Energy cells: ${spN} — the bot keeps running when you switch tabs/apps (catches up to 10 min)`);
  },
  updateBotStats() {
    const pe = $('#bot-pots'); if (pe) { const t = this.botPotsText(); if (pe.textContent !== t) pe.textContent = t; }
    const el = $('#bot-stats');
    if (!el) return;
    const sum = Bot.summary();
    const html = sum ? [[L('เวลา', 'Time'), L(`${sum.mins.toFixed(1)} นาที`, `${sum.mins.toFixed(1)} min`)], [L('ล่าได้', 'Kills'), L(`${sum.kills} ตัว`, `${sum.kills}`)], ['Base EXP', '+' + U.fmt(sum.bexp)],
      ['Job EXP', '+' + U.fmt(sum.jexp)], ['Items', L(`${sum.items} ชิ้น`, `${sum.items}`)], [L('EXP/นาที', 'EXP/min'), U.fmt(sum.mins > 0.05 ? sum.bexp / sum.mins : 0)]]
      .map(([k, v]) => `<div>${k}<b>${v}</b></div>`).join('') : L('<div class="hint" style="grid-column:1/-1">สถิติจะแสดงเมื่อเริ่มบอท</div>', '<div class="hint" style="grid-column:1/-1">Stats appear once the bot starts</div>');
    if (el.innerHTML !== html) el.innerHTML = html;
  },
  botKey() { const p = G.player; return [JSON.stringify(Bot.cfg()), JSON.stringify(autoPotCfg()), G.map.id, Object.keys(p.skills).join(), Bot.on, p.options.autoLoot].join('|'); },
  renderBot(force) {
    const p = G.player, c = Bot.cfg();
    const body = $('#w-bot .win-body');
    // ระหว่างต่อสู้ UI ถูกสั่งวาดใหม่ถี่มาก → ถ้าค่าไม่เปลี่ยน ไม่ต้องสร้างใหม่ (ไม่งั้นลากตัวเลื่อนไม่ได้)
    const key = this.botKey();
    if (!force && body.dataset.key === key) { this.updateBotStats(); return; }
    body.dataset.key = key;
    body.innerHTML = '';
    body.append(h('button', { class: 'btn big bot-toggle' + (Bot.on ? ' on' : ''), onclick: () => Bot.toggle() }, Bot.on ? '■ Stop Bot' : '▶ Start Bot'));
    body.append(h('div', { id: 'bot-stats', class: 'bot-stats' }));
    this.updateBotStats();
    if (typeof BotScript !== 'undefined') body.append(BotScript.panel(c, () => this.renderBot(true))); // Battle Script (โหมดขั้นสูง) — js/botscript.js
    const slider = (key, label, min, max, unit = '%') => {
      const val = h('b', {}, `${c[key]}${unit}`);
      const inp = h('input', { type: 'range', min, max, value: c[key], oninput: e => { c[key] = +e.target.value; val.textContent = `${c[key]}${unit}`; body.dataset.key = this.botKey(); }, onchange: () => saveGame() });
      return h('label', { class: 'bot-row' }, h('span', {}, label), inp, val);
    };
    const chk = (key, label) => h('label', { class: 'opt' },
      h('input', { type: 'checkbox', checked: c[key] ? 'checked' : false, onchange: e => { c[key] = e.target.checked; saveGame(); } }), ' ', label);
    const seg = (key, opts) => h('div', { class: 'seg bot-seg' }, ...opts.map(([v, l]) =>
      h('button', { type: 'button', class: c[key] === v ? 'on' : '', onclick: () => { c[key] = v; saveGame(); this.renderBot(); } }, l)));
    body.append(...[
      h('div', { class: 'bot-sec' }, L('วิธีโจมตี', 'Attack style')),
      seg('style', [['skills', L('ใช้สกิล + ตีปกติ', 'Skills + attacks')], ['basic', L('ตีปกติอย่างเดียว', 'Basic attacks only')]]),
      h('div', { class: 'hint' }, c.style === 'basic' ? L('ไม่ใช้สกิลโจมตี (ยังใช้ฮีล/บัฟตามที่ติ๊กด้านล่าง) และไม่นั่งพักเพราะ SP', 'No attack skills (still uses heals/buffs ticked below) and never rests for SP') : L('ใช้สกิลที่ติ๊กไว้ด้านล่างสลับกับการตีปกติ', 'Mixes the skills ticked below with basic attacks')),
      h('div', { class: 'bot-sec' }, L('ขอบเขตการล่า', 'Hunting area')),
      slider('radius', c.leash ? L('รัศมีวงล่า', 'Hunt radius') : L('ระยะค้นหามอนรอบตัว', 'Search range'), 5, 30, L(' ช่อง', ' tiles')),
      chk('leash', L('ล่าเฉพาะในวงรอบจุดที่เปิดบอท (เห็นวงบนพื้น)', 'Only hunt inside a circle around the start point (shown on the ground)')),
      c.leash ? h('button', { class: 'btn', type: 'button', onclick: () => Bot.setAnchor() }, L('ตั้งศูนย์กลางวงที่ตำแหน่งนี้', 'Set circle center here')) : null,
      h('div', { class: 'bot-sec' }, L('มอนที่จะล่า', 'Targets')),
      this.botMobPicker(c),
      h('div', { class: 'bot-sec' }, L('การฟื้นฟู', 'Recovery')),
      ...this.autoPotControls(full => { if (full) this.renderBot(); else body.dataset.key = this.botKey(); }),
      slider('healAt', L('ใช้สกิลฮีลเมื่อ HP ต่ำกว่า', 'Heal skill below HP'), 0, 95),
      chk('rest', L('นั่งพักเมื่อ HP/SP ต่ำ (ไม่มีศัตรูรอบตัว)', 'Sit to rest when HP/SP is low (no enemies near)')),
      c.rest ? slider('restHp', L('นั่งพักเมื่อ HP ต่ำกว่า', 'Rest below HP'), 0, 90) : null,
      c.rest && c.style !== 'basic' ? slider('restSp', L('นั่งพักเมื่อ SP ต่ำกว่า', 'Rest below SP'), 0, 90) : null,
      c.rest && c.style !== 'basic' ? h('div', { class: 'hint' }, L('นั่งรอ SP เฉพาะสายที่พึ่งสกิล (สายเวท) — สายที่ตีปกติแรงจะตีต่อไปแทนการนั่งรอ', 'Only skill-reliant builds (casters) sit for SP — strong basic-attack builds keep fighting instead')) : null,
      h('div', { class: 'bot-sec' }, 'Other'),
      chk('useBuffs', L('ใช้บัฟ / เรียกสัตว์คู่ใจอัตโนมัติ', 'Auto buff / summon companion')),
      chk('avoidMvp', L('ไม่เข้าตี MVP เอง', 'Avoid engaging MVPs')),
      chk('returnHome', L('กลับเมืองเมื่อยาหมดและ HP วิกฤต', 'Return to town when out of potions at critical HP')),
      h('label', { class: 'opt' }, h('input', { type: 'checkbox', checked: p.options.autoLoot ? 'checked' : false, onchange: e => { p.options.autoLoot = e.target.checked; saveGame(); } }), L(' เก็บไอเทมอัตโนมัติ', ' Auto Loot')),
    ].filter(Boolean));
    const act = Object.keys(p.skills).filter(id => SKILLS[id] && SKILLS[id].type === 'active');
    body.append(h('div', { class: 'bot-sec' }, L('สกิลที่ให้บอทใช้', 'Bot skills')));
    if (!act.length) body.append(h('div', { class: 'hint' }, L('ยังไม่มีสกิลที่ใช้งานได้', 'No usable skills yet')));
    for (const id of act) {
      c.skillHp = c.skillHp || {};
      const gate = h('select', { class: 'bot-gate', title: L('เงื่อนไขการใช้สกิลนี้', 'When to use this skill'), onchange: e => { const v = +e.target.value; if (v) c.skillHp[id] = v; else delete c.skillHp[id]; saveGame(); } },
        [0, 30, 50, 70, 90].map(v => h('option', { value: v, selected: (c.skillHp[id] || 0) === v ? 'selected' : false }, v ? L(`เมื่อ HP < ${v}%`, `When HP < ${v}%`) : L('ใช้ตลอด', 'Always'))));
      body.append(h('div', { class: 'bot-skill-row' }, h('label', { class: 'opt bot-skill' },
        h('input', { type: 'checkbox', checked: c.skills[id] !== false ? 'checked' : false, onchange: e => { c.skills[id] = e.target.checked; saveGame(); } }),
        this.skillIcon(id), ` ${SKILLS[id].name}`, h('small', {}, ` (${({ heal: L('ฮีล', 'heal'), summon: L('เรียกสัตว์', 'summon'), opener: L('เปิดฉาก', 'opener'), buff: L('บัฟ', 'buff'), trap: L('กับดัก', 'trap'), aoe: L('โจมตีรอบตัว', 'AoE'), attack: L('โจมตี', 'attack') })[Bot.role(id)] || ''})`)), gate));
    }
    body.append(h('div', { class: 'hint', id: 'bot-pots' }, this.botPotsText()));
  },

  // เลือกมอนที่ให้บอทล่าในแมพนี้ (จำแยกตามชนิดมอน ใช้ได้ทุกแมพ)
  botMobPicker(c) {
    const d = G.map.def, skip = c.skipMobs || (c.skipMobs = {});
    const ids = [...new Set([...(d.spawns || []).map(s => s[0]), ...(d.mvp ? [d.mvp] : [])])].filter(id => MOBS[id] && !MOBS[id].dummy);
    if (!ids.length) return h('div', { class: 'hint' }, L('แมพนี้ไม่มีมอนสเตอร์ — ออกไปยังแมพล่าแล้วเลือกได้', 'No monsters on this map — head to a hunting map to choose'));
    const set = v => { for (const id of ids) { if (v) delete skip[id]; else skip[id] = true; } saveGame(); this.renderBot(); };
    const on = ids.filter(id => !skip[id]).length;
    return h('div', { class: 'bot-mobs' },
      h('div', { class: 'bm-head' }, h('span', {}, L(`${G.map.def.name} • ล่า ${on}/${ids.length} ชนิด`, `${G.map.def.name} • hunting ${on}/${ids.length} types`)),
        h('button', { type: 'button', class: 'linkbtn', onclick: () => set(true) }, L('เลือกทั้งหมด', 'Select all')),
        h('button', { type: 'button', class: 'linkbtn', onclick: () => set(false) }, L('ไม่เลือกเลย', 'Select none'))),
      h('div', { class: 'bm-grid' }, ids.map(id => {
        const m = MOBS[id], spr = Art.get('mobsprite_' + id), sel = !skip[id];
        return h('button', { type: 'button', class: 'bm-card' + (sel ? ' on' : ''), 'aria-pressed': sel ? 'true' : 'false',
          onclick: () => { if (sel) skip[id] = true; else delete skip[id]; saveGame(); this.renderBot(); } },
          h('span', { class: 'bm-pic' }, spr ? h('img', { src: spr.src, alt: '' }) : h('i', { style: `background:${m.color || '#6ff3ff'}` })),
          h('b', {}, m.name), h('small', {}, `Lv ${m.lv}${m.boss ? ' • MVP' : ''}${m.aggro ? L(' • ตีก่อน', ' • Aggro') : ''}`),
          h('span', { class: 'bm-chk' }, sel ? '✓' : ''));
      })),
      h('div', { class: 'hint' }, on ? L('ตัวที่ไม่ได้เลือก บอทจะไม่เข้าไปตีเอง แต่ถ้ามันตีเราก่อนจะสู้กลับ', 'The bot won’t engage unselected monsters, but fights back if they attack first') : L('ยังไม่ได้เลือกมอนเลย — บอทจะสู้เฉพาะตัวที่เข้ามาตีเรา', 'No monsters selected — the bot only fights what attacks you')));
  },

  setNet(state) {
    const el = $('#net');
    if (!el) return;
    el.hidden = !Online.online;
    el.className = 'net ' + state;
    el.title = state === 'ok' ? L('เชื่อมต่อเซิร์ฟเวอร์แล้ว', 'Connected to server') : L('การเชื่อมต่อมีปัญหา กำลังลองใหม่', 'Connection problem, retrying');
  },

  showDeath(lost) {
    const p = G.player, sv = p.save && MAP_DEFS[p.save.map];
    $('#death-loss').textContent = lost ? `Base EXP −${U.fmt(lost)}` : L('ไม่เสีย EXP', 'No EXP lost');
    $('#death-save').textContent = sv ? L(`จุดเซฟ · ${sv.name}`, `Save point · ${sv.name}`) : '';
    $('#death').classList.remove('hidden'); $('#death-mini').classList.add('hidden');
  },
  hideDeath() { $('#death').classList.add('hidden'); $('#death-mini').classList.add('hidden'); },
};

// หน้าต่างที่วาดใหม่ทั้งก้อนเมื่อกดอะไร: จำตำแหน่งเลื่อน (ทั้งตัวหน้าต่างและรายการข้างใน) แล้วคืนให้ ไม่ให้เด้งขึ้นบน
(() => {
  const WINS = { renderStatus: 'w-status', renderInv: 'w-inv', renderEquip: 'w-equip', renderSkills: 'w-skills', renderOptions: 'w-options',
    renderStorage: 'w-storage', renderBot: 'w-bot', renderQuest: 'w-quest', renderNav: 'w-nav', renderEmote: 'w-emote', renderWorld: 'w-world' };
  const snap = w => {
    const out = new Map(), seen = {};
    for (const el of w.querySelectorAll('.win-body, .win-body *')) {
      const k = el.className || el.tagName; const i = seen[k] = (seen[k] || 0) + 1; // นับลำดับก่อนเช็กว่าเลื่อนได้ ไม่ให้ช่องสลับกัน
      if (el.scrollHeight <= el.clientHeight + 1) continue;
      if (el.scrollTop > 0) out.set(k + '#' + i, el.scrollTop);
    }
    return out;
  };
  const restore = (w, m) => {
    if (!m.size) return;
    const seen = {};
    for (const el of w.querySelectorAll('.win-body, .win-body *')) {
      const k = el.className || el.tagName; const i = seen[k] = (seen[k] || 0) + 1;
      const v = m.get(k + '#' + i); if (v != null) el.scrollTop = v;
    }
  };
  for (const [fn, id] of Object.entries(WINS)) {
    const orig = UI[fn];
    if (typeof orig !== 'function') continue;
    UI[fn] = function (...a) {
      const w = document.getElementById(id);
      if (!w || w.classList.contains('hidden')) return orig.apply(this, a);
      const m = snap(w); const r = orig.apply(this, a); restore(w, m); return r;
    };
  }
})();

// QA: หน้าต่างต้องอยู่ในจอเสมอ (เปิด / ปรับขนาดจอ / ลากเสร็จ) — เดิมหน้าต่างที่เริ่มที่ top:200px ล้นใต้จอโน้ตบุ๊ก
UI.fit = function (w) {
  if (!w || w.classList.contains('hidden') || w.classList.contains('dialog')) return;
  if (matchMedia('(max-width: 760px), (max-height: 520px) and (orientation: landscape)').matches) return; // มือถือ: CSS ตรึงหน้าต่างไว้แล้ว
  const m = 8, r = w.getBoundingClientRect();
  let top = r.top, left = r.left;
  if (r.bottom > innerHeight - m) top = Math.max(m, innerHeight - m - r.height);
  if (r.right > innerWidth - m) left = Math.max(m, innerWidth - m - r.width);
  if (left < m) left = m;
  if (top !== r.top || left !== r.left) Object.assign(w.style, { top: top + 'px', left: left + 'px', right: 'auto', bottom: 'auto', transform: 'none' });
  w.style.maxHeight = `calc(100dvh - ${Math.round(top) + m}px)`;
};
{
  const open0 = UI.open;
  UI.open = function (id) {
    // z-index ไม่วิ่งเพิ่มไม่รู้จบ (เกิน 900 จะทับฉาก/จอล้มลง) → เรียงใหม่จาก 100
    if (this.z > 900) { const ws = $$('.win').sort((a, b) => (+a.style.zIndex || 0) - (+b.style.zIndex || 0)); this.z = 100; for (const w of ws) w.style.zIndex = ++this.z; }
    const r = open0.apply(this, arguments);
    const w = document.getElementById(id); requestAnimationFrame(() => UI.fit(w));
    return r;
  };
  addEventListener('resize', () => { $$('.win:not(.hidden)').forEach(w => UI.fit(w)); UI.stackTop(); });
  addEventListener('pointerup', () => $$('.win:not(.hidden)').forEach(w => UI.fit(w)));
}
// QA: เมนู ☰ บนมือถือพับเองเมื่อเริ่มเล่น (แตะจอ/จอย/ปุ่มโจมตี) ไม่ค้างทับเป้าหมายและบัฟ
UI.autoFoldMenu = function () {
  const m = $('#menubar');
  if (m && typeof Pad !== 'undefined' && Pad.enabled() && !m.classList.contains('folded')) this.setFold(m, true);
};

// มือถือแนวตั้ง: กล่องข้อมูลตัวละครสูงขึ้นเมื่อมีป้าย Status/Skill/Passive หลายอัน → ดันแถบเป้าหมายและแชตลงมาไม่ให้ทับกัน
UI.stackTop = () => {
  const bi = $('#basic-info'), tg = $('#target'), ch = $('#chat'), nav = $('#nav-pill'), bf = $('#buffs'), qt = $('#quest-track'), ab = $('#auto-btn');
  if (!bi || !tg) return;
  for (const e of [tg, ch, nav, bf, qt]) if (e) e.style.top = '';
  if (qt) qt.style.right = ''; if (ch) ch.style.width = '';
  if (!bi.getClientRects().length) return;
  // คอม / แนวนอน: บัฟ และการ์ดเควสต์ เรียงต่อใต้การ์ดตัวละคร (การ์ดสูงไม่คงที่ — มีป้ายแต้ม / พับได้)
  if (innerWidth > 760 || innerHeight <= innerWidth) {
    let y = bi.getBoundingClientRect().bottom + 8;
    if (bf && bf.querySelector('.buff')) { bf.style.top = y + 'px'; y = bf.getBoundingClientRect().bottom + 6; }
    if (qt && !(document.body.classList.contains('pad-mode') && innerHeight <= 520)) qt.style.top = y + 'px';
    return;
  }
  const vis = e => e && !e.hidden && e.getClientRects().length && getComputedStyle(e).display !== 'none';
  const top = e => parseFloat(getComputedStyle(e).top) || 0;
  const biB = bi.getBoundingClientRect().bottom;
  // แถบนำทาง (กว้างเต็มแถว) ใต้กล่องข้อมูลตัวละคร → ของที่อยู่ใต้มันเลื่อนตาม
  let below = biB + 6;
  if (vis(nav)) { if (top(nav) < below) nav.style.top = below + 'px'; below = nav.getBoundingClientRect().bottom + 6; }
  let tTop = top(tg);
  const tgR = tg.getBoundingClientRect(), biR = bi.getBoundingClientRect(), navR = vis(nav) ? nav.getBoundingClientRect() : null;
  const hit = r => r && tgR.left < r.right + 6 && tgR.right > r.left - 6; // แถบเป้าหมายอยู่ใต้มินิแมพ (ขวา): ดันลงเฉพาะเมื่อทับแนวเดียวกันจริง
  const tBelow = hit(navR) ? navR.bottom + 6 : hit(biR) ? biR.bottom + 6 : 0;
  if (tBelow > tTop) { tTop = tBelow; tg.style.top = tTop + 'px'; }
  if (bf && bf.querySelector('.buff') && top(bf) < below) bf.style.top = below + 'px';
  // เควสต์ (คอลัมน์ขวา): ห้ามทับแถบนำทาง และถ้าแนวตั้งชนปุ่ม AUTO ให้ขยับไปอยู่ทางซ้ายของปุ่มแทน
  if (vis(qt)) {
    if (top(qt) < below + 2) qt.style.top = (below + 2) + 'px';
    if (vis(ab)) {
      const a = ab.getBoundingClientRect(), q = qt.getBoundingClientRect();
      if (q.bottom > a.top - 4 && q.top < a.bottom + 4 && q.right > a.left - 4) qt.style.right = Math.round(innerWidth - a.left + 6) + 'px';
    }
  }
  if (ch && document.body.classList.contains('pad-mode')) {
    const bfB = bf && bf.querySelector('.buff') ? bf.getBoundingClientRect().bottom + 6 : below;
    const qB = vis(qt) && qt.getBoundingClientRect().left < innerWidth / 2 ? qt.getBoundingClientRect().bottom + 6 : 0; // การ์ดเควสต์อยู่ซ้าย (ชุด UI ใหม่) → แชตลงไปใต้การ์ด
    const cTop = parseFloat(getComputedStyle(ch).top) || 0, need = Math.max(tTop + 52, bfB, qB);
    if (need > cTop) ch.style.top = need + 'px';
    // ข้อความแชตยาวไม่วิ่งไปทับแถบเควสต์ทางขวา
    if (vis(qt)) {
      const c = ch.getBoundingClientRect(), q = qt.getBoundingClientRect();
      if (c.bottom > q.top && c.top < q.bottom && c.right > q.left - 8) ch.style.width = Math.max(150, Math.round(q.left - 10 - c.left)) + 'px';
    }
  }
};
setInterval(() => { if (typeof G !== 'undefined' && G.started) UI.stackTop(); }, 1000); // บัฟขึ้น/หาย ป้ายแต้มเปลี่ยน → จัดใหม่

// กันข้อความ/รูปถูกเลือกหรือลากโดยไม่ตั้งใจ (ยกเว้นช่องพิมพ์ และของที่ตั้งใจให้ลาก เช่น ไอเทม/สกิล)
(() => {
  const typing = t => t && t.closest && t.closest('input, textarea, [contenteditable="true"]');
  document.addEventListener('selectstart', e => { if (!typing(e.target)) e.preventDefault(); });
  document.addEventListener('dragstart', e => { if (!typing(e.target) && !(e.target.closest && e.target.closest('[draggable="true"]'))) e.preventDefault(); });
  // เกมจริง: ปิดเมนูคลิกขวาของเบราว์เซอร์ทุกที่ (ยกเว้นช่องพิมพ์) — คลิกขวาสงวนไว้ดูรายละเอียดยูนิต (ROADMAP)
  document.addEventListener('contextmenu', e => { if (!typing(e.target)) e.preventDefault(); });
})();
