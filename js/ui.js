'use strict';
// ============================================================
//  UI: หน้าต่างแบบ Ragnarok, แชท, ฮอตบาร์, ร้านค้า, บทสนทนา NPC
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
    $('#death-btn').onclick = () => respawnPlayer();
    $('#auto-btn').onclick = () => Bot.toggle();
    $$('#zoom-ctl button').forEach(b => b.onclick = () => { R.zoom = U.clamp(R.zoom * +b.dataset.zoom, 0.5, 1.8); });
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
  },

  // ---------------- HUD ----------------
  onMapChange(map) {
    this.close('w-dialog'); this.close('w-shop');
    $('#map-name').textContent = map.def.name;
    this.announceMap(map);
    this.msg(`เข้าสู่ ${map.def.name} — ${map.def.thai}${map.def.level ? ` (มอนสเตอร์ Lv ${map.def.level})` : ''}`, 'map');
    const mc = $('#minimap-cv');
    mc.width = map.mini.width; mc.height = map.mini.height;
  },
  announceMap(map) {
    const el = $('#map-banner');
    el.innerHTML = `<div class="mb-en">${U.esc(map.def.name)}</div><div class="mb-th">${U.esc(map.def.thai)}</div>`;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  },
  updateHud() {
    const p = G.player, d = p.d;
    $('#bi-name').textContent = p.name;
    $('#bi-job').textContent = `${JOBS[p.job].name}`;
    const bNeed = baseExpNeed(p.baseLv), jNeed = jobExpNeed(p.job, p.jobLv);
    const bk = p.baseLv >= MAX_BASE_LV ? 1 : p.baseExp / bNeed, jk = p.jobLv >= JOBS[p.job].jobMax ? 1 : p.jobExp / jNeed;
    $('#bi-blv').textContent = p.baseLv; $('#bi-jlv').textContent = p.jobLv;
    $('#bi-bexp').style.width = (bk * 100).toFixed(1) + '%';
    $('#bi-jexp').style.width = (jk * 100).toFixed(1) + '%';
    $('#bi-bexp-t').textContent = (bk * 100).toFixed(1) + '%';
    $('#bi-jexp-t').textContent = (jk * 100).toFixed(1) + '%';
    $('#bi-hp').style.width = (p.hp / d.maxHp * 100) + '%';
    $('#bi-sp').style.width = (p.sp / d.maxSp * 100) + '%';
    $('#bi-hp').classList.toggle('low', p.hp / d.maxHp < 0.25);
    $('#bi-hp-t').textContent = `${Math.floor(p.hp)} / ${d.maxHp}`;
    $('#bi-sp-t').textContent = `${Math.floor(p.sp)} / ${d.maxSp}`;
    $('#bi-zeny').textContent = U.fmt(p.zeny) + ' z';
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
    $$('#hotbar .hb').forEach((el, i) => {
      const hb = p.hotbar[i];
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
  drawMinimap() {
    const mc = $('#minimap-cv'), g = mc.getContext('2d'), map = G.map, S = map.miniScale, p = G.player;
    g.drawImage(map.mini, 0, 0);
    for (const pt of map.portals) { g.fillStyle = '#80e0ff'; g.fillRect(pt.x * S - 2, pt.y * S - 2, 6, 6); }
    for (const n of G.npcs) { g.fillStyle = '#ffe040'; g.fillRect(n.x * S, n.y * S, 4, 4); }
    for (const m of G.mobs) {
      if (m.dead) continue;
      if (m.isMvp) { g.fillStyle = (Math.floor(G.time * 4) % 2) ? '#ff2020' : '#ffffff'; g.beginPath(); g.arc(m.x * S, m.y * S, 4, 0, 7); g.fill(); }
      else if (m.state === 'chase') { g.fillStyle = '#ff6060'; g.fillRect(m.x * S - 1, m.y * S - 1, 2, 2); }
    }
    g.fillStyle = '#ffffff'; g.strokeStyle = '#d02020'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(p.x * S, p.y * S, 3.5, 0, 7); g.fill(); g.stroke();
    $('#map-coord').textContent = `${Math.floor(p.x)}, ${Math.floor(p.y)}`;
  },

  // ---------------- ฮอตบาร์ ----------------
  buildHotbar() {
    const hb = $('#hotbar');
    for (let i = 0; i < 9; i++) {
      const el = h('div', { class: 'hb', 'data-i': i, title: `ปุ่มลัด ${i + 1} (คลิกขวาเพื่อลบ)` },
        h('div', { class: 'ic' }), h('span', { class: 'k' }, String(i + 1)), h('span', { class: 'q' }), h('div', { class: 'cd' }));
      let lpTimer = null, lpFired = false;
      el.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse') return;
        lpFired = false;
        lpTimer = setTimeout(() => { lpFired = true; if (G.player.hotbar[i]) { G.player.hotbar[i] = null; this.msg(`ล้างปุ่มลัด ${i + 1}`, 'info'); this.dirty(); } }, 650);
      });
      const cancelLp = () => clearTimeout(lpTimer);
      el.addEventListener('pointerup', cancelLp); el.addEventListener('pointerleave', cancelLp); el.addEventListener('pointercancel', cancelLp);
      el.addEventListener('click', () => { if (lpFired) { lpFired = false; return; } useHotbar(i); });
      el.addEventListener('contextmenu', e => { e.preventDefault(); G.player.hotbar[i] = null; this.dirty(); });
      el.addEventListener('dragover', e => e.preventDefault());
      el.addEventListener('drop', e => {
        e.preventDefault();
        try {
          const d = JSON.parse(e.dataTransfer.getData('text/plain'));
          if (d.t === 'skill' || d.t === 'item') G.player.hotbar[i] = { t: d.t, id: d.id };
          if (d.from != null && d.from !== i) G.player.hotbar[d.from] = null;
          this.dirty();
        } catch (err) { /* ignore */ }
      });
      el.draggable = true;
      el.addEventListener('dragstart', e => {
        const x = G.player.hotbar[i];
        if (!x) { e.preventDefault(); return; }
        e.dataTransfer.setData('text/plain', JSON.stringify({ t: x.t, id: x.id, from: i }));
      });
      hb.append(el);
    }
  },
  renderHotbar() {
    const p = G.player;
    $$('#hotbar .hb').forEach((el, i) => {
      const x = p.hotbar[i];
      const ic = $('.ic', el), q = $('.q', el);
      ic.innerHTML = ''; q.textContent = ''; el.title = `ปุ่มลัด ${i + 1}`;
      el.classList.remove('empty');
      if (x && x.t === 'skill' && !skillLv(x.id)) { p.hotbar[i] = null; return; }
      if (!x) return;
      if (x.t === 'skill') {
        ic.append(this.skillIcon(x.id));
        q.textContent = 'Lv' + skillLv(x.id);
        el.title = `${SKILLS[x.id].name} Lv ${skillLv(x.id)} [${i + 1}]`;
      } else {
        ic.append(h('img', { src: itemIconUrl(x.id), alt: '' }));
        q.textContent = countItem(x.id);
        el.title = `${ITEMS[x.id].name} [${i + 1}]`;
      }
    });
  },
  assignHotbar(t, id) {
    const p = G.player;
    if (p.hotbar.some(x => x && x.t === t && x.id === id)) { this.msg('อยู่ในปุ่มลัดแล้ว', 'info'); return; }
    const i = p.hotbar.findIndex(x => !x);
    if (i < 0) { this.msg('ปุ่มลัดเต็ม (คลิกขวาที่ช่องเพื่อลบ)', 'err'); return; }
    p.hotbar[i] = { t, id };
    this.msg(`ตั้งปุ่มลัด ${i + 1}: ${t === 'skill' ? SKILLS[id].name : ITEMS[id].name}`, 'info');
    this.dirty();
  },
  skillIcon(id) {
    const s = SKILLS[id];
    return h('div', { class: 'sicon', style: `--c:${s.icon}` }, s.glyph);
  },

  buildMenu() {
    const items = [
      ['w-status', 'สถานะ', 'A'], ['w-inv', 'ไอเทม', 'E'], ['w-equip', 'อุปกรณ์', 'Q'],
      ['w-skills', 'สกิล', 'S'], ['w-bot', 'บอท', 'N'], ['w-options', 'ตั้งค่า', 'O'],
    ];
    const m = $('#menubar');
    for (const [id, label, key] of items) m.append(h('button', { onclick: () => this.toggle(id), title: `${label} (${key})` }, label, h('small', {}, key)));
    m.append(h('button', { onclick: () => toggleSit(), title: 'นั่งพัก (X / Insert)' }, 'นั่ง', h('small', {}, 'X')));
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-open]');
      if (t) this.open(t.dataset.open);
    });
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
    if (this.isOpen('w-bot')) this.renderBot();
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
      if (it.slots) lines.push(`ช่องการ์ด: ${(entry.cards || []).map(c => ITEMS[c].name).join(', ') || '-'} (${(entry.cards || []).length}/${it.slots})`);
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
      if (it.type === 'card') acts.push(h('button', { class: 'btn', onclick: () => useItem(e) }, 'ใส่การ์ด'));
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
    if (p.job === 'novice') body.append(h('div', { class: 'hint' }, `เก็บ Job Lv ${JOB_CHANGE_LV} แล้วไปคุยกับ Sage Mimir ในเมืองเอลด์ไฮม์ เพื่อเลือก 1 ใน 6 อาชีพ`));
  },

  renderOptions() {
    const p = G.player, o = p.options;
    const body = $('#w-options .win-body');
    body.innerHTML = '';
    const chk = (key, label) => h('label', { class: 'opt' },
      h('input', { type: 'checkbox', checked: o[key] ? 'checked' : false, onchange: e => { o[key] = e.target.checked; saveGame(); } }), ' ', label);
    body.append(
      chk('autoLoot', 'เก็บไอเทมอัตโนมัติ (Auto Loot)'),
      chk('sound', 'เสียงประกอบ'),
      chk('expMsg', 'แสดงข้อความ EXP ในแชท'),
      h('div', { class: 'opt-btns' },
        h('button', { class: 'btn', onclick: () => saveGame(false) }, 'บันทึกเกม'),
        h('button', { class: 'btn', onclick: () => this.open('w-help') }, 'วิธีเล่น'),
        document.fullscreenEnabled ? h('button', { class: 'btn', onclick: () => toggleFullscreen() }, document.fullscreenElement ? 'ออกจากเต็มจอ' : 'เต็มจอ') : null,
        h('button', { class: 'btn danger', onclick: async () => {
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
    if (!ti.slots || target.cards.length >= ti.slots) { this.msg(`${itemDisplayName(target)} ไม่มีช่องการ์ดว่าง`, 'err'); return; }
    if (!(await this.confirm(`ใส่ ${card.name} ลงใน ${itemDisplayName(target)}? (ถอดออกไม่ได้)`))) return;
    if (!p.inventory.includes(entry) || p.equip[card.slot] !== target) return;
    target.cards.push(entry.id);
    removeEntry(entry, 1);
    recalc();
    this.msg(`ใส่ ${card.name} สำเร็จ!`, 'lvl');
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
      slider('hpPot', 'ใช้ยา HP เมื่อ HP ต่ำกว่า', 0, 95),
      slider('spPot', 'ใช้ยา SP เมื่อ SP ต่ำกว่า', 0, 95),
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
    body.append(h('div', { class: 'hint' }, `ยา HP คงเหลือ ${hpN} • ยา SP คงเหลือ ${spN} — บอททำงานต่อแม้สลับแท็บ/แอป (จำลองย้อนหลังสูงสุด 10 นาที)`));
  },

  showDeath() { $('#death').classList.remove('hidden'); },
  hideDeath() { $('#death').classList.add('hidden'); },
};
