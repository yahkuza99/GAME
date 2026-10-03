'use strict';
// ============================================================
//  การ์ดรายละเอียดยูนิต (ROADMAP: "คลิกขวาที่ยูนิต = ดูรายละเอียด")
//  • คอม: คลิกขวาบนฉาก — มีสกิลรอเล็งอยู่ = ยกเลิกสกิลเหมือนเดิม (js/main.js) • คลิกขวาที่พื้นว่าง = ไม่ทำอะไร
//  • มือถือ: แตะค้าง ~0.5 วิ บนยูนิต → การ์ดเดียวกัน (ไม่เดิน/ไม่ตี) • แตะสั้น = ทำงานเหมือนเดิม (ตี/คุย/เดิน ตอนยกนิ้ว)
//  • มอน: ชื่อ/Lv/เผ่า/ธาตุ/ขนาด/HP สด/ATK/DEF/MDEF/โจมตีก่อนไหม/แพ้-ต้านธาตุ (ELEM_TABLE)/Hunt Rune ที่ช่วย/ของดรอป/ชิป + ป้าย MVP/Ancient
//  • ผู้เล่นอื่น (ออนไลน์ + ตัวแทนในลานประลอง): ชื่อ/Class (+ Class 2)/Lv/ปาร์ตี้/ของที่สวม (ตามข้อมูลเครือข่าย) + ปุ่ม Invite/Trade/Emote
//  • NPC: ชื่อ + หน้าที่ + ปุ่มคุย • ตัวเรา: เปิดหน้าต่าง Status
//  ปิดเมื่อ Esc / คลิกนอกการ์ด / ยูนิตตาย-หายไป / ย้ายแผนที่ • มือถือ = แผ่นล่างจอ (bottom sheet) • หน้าตา: css/unitcard.css
//  ไม่แตะตรรกะเกม — ปุ่มในการ์ดเรียกคำสั่งเดิม (ตั้งเป้า/คุย NPC/เชิญปาร์ตี้/ขอแลก) เท่านั้น
// ============================================================
const UnitCard = {
  el: null, u: null, map: null, press: null, lastTouch: 0, refs: null,
  HOLD_MS: 500, MOVE_PX: 14,
  RACE: { brute: L('สัตว์กลไก', 'Mech Beast'), plant: L('พืชกลไก', 'Mech Plant'), insect: L('แมลงกลไก', 'Mech Insect'), undead: L('อมตะ', 'Undead'),
    demon: L('ปีศาจ', 'Demon'), angel: L('เทวดา', 'Angel'), formless: L('ไร้รูป', 'Formless'), fish: L('สัตว์น้ำ', 'Aquatic'), dragon: L('มังกร', 'Dragon'), human: L('แอนดรอยด์', 'Android') },
  NPC_ROLE: {
    bifrost: L('บันทึกจุดเกิด • เทเลพอร์ตข้ามแผนที่', 'Save point • Teleport'),
    jobmaster: L('เปลี่ยน Class • เนื้อเรื่องหลัก', 'Class change • Main story'),
    tool: L('ร้านค้า — ยา/ของใช้', 'Shop — potions & tools'),
    weapon: L('ร้านค้า — อาวุธ', 'Shop — weapons'),
    armor: L('ร้านค้า — ชุดเกราะ', 'Shop — armor'),
    refine: L('ตีบวก • ถอดชิป • Hunt Rune', 'Refine • Chips • Hunt Runes'),
    nurse: L('ซ่อม HP/SP + บัฟ', 'Repair HP/SP + buff'),
    guide: L('ผู้นำทาง • บอร์ดล่าค่าหัว', 'Guide • Bounty board'),
    storage: L('คลังเก็บของ', 'Storage'),
    norn: L('วงล้อโชคชะตา (กาชา)', "Wheel of fate (gacha)"),
    hel: L('ราชินีแห่งโพรง • เนื้อเรื่อง', 'Queen of the Hollow • Story'),
  },

  init() {
    if (this.el || typeof document === 'undefined') return;
    this.el = h('div', { id: 'unit-card', role: 'dialog', 'aria-label': L('ข้อมูลยูนิต', 'Unit details') });
    this.el.hidden = true;
    document.body.append(this.el);
    // Esc ปิดการ์ดก่อน (ไม่ไปยกเลิกสกิล/ปิดหน้าต่างอื่น)
    window.addEventListener('keydown', e => {
      if (!this.isOpen() || e.key !== 'Escape') return;
      const tag = e.target && e.target.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault(); e.stopImmediatePropagation(); this.close();
    }, true);
    // คลิก/แตะนอกการ์ด = ปิด (การกระทำปกติยังทำงานต่อ) • นิ้วที่สองลงระหว่างกดค้าง = ยกเลิก (ถ่างซูม)
    document.addEventListener('pointerdown', e => {
      if (this.press && e.pointerId !== this.press.id) this.cancelPress(false);
      if (this.isOpen() && !this.el.contains(e.target)) this.close();
    }, true);
    window.addEventListener('pointermove', e => this.pressMove(e));
    window.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') this.lastTouch = performance.now(); this.pressEnd(e); });
    window.addEventListener('pointercancel', e => { if (this.press && e.pointerId === this.press.id) this.cancelPress(false); });
    window.addEventListener('resize', () => { if (this.isOpen()) this.place(); });
    setInterval(() => { try { this.tick(); } catch (e) { console.warn('unitcard', e); } }, 120);
    this.extendMobBook();
  },
  isOpen() { return !!this.el && !this.el.hidden; },
  sheet() { return (typeof Pad !== 'undefined' && Pad.enabled()) || innerWidth < 640 || matchMedia('(pointer: coarse)').matches; },

  // ---------------- หายูนิตใต้เมาส์/นิ้ว (ใช้ G.hover จาก updateHover() เดิม + ผู้เล่นอื่น/ตัวเรา) ----------------
  pick() {
    if (typeof updateHover === 'function') updateHover();
    const hv = G.hover;
    if (hv && hv.kind === 'mob') return hv.ref.isPlayer ? { kind: 'player', ref: hv.ref.ref, mob: hv.ref } : { kind: 'mob', ref: hv.ref };
    if (hv && hv.kind === 'npc') return { kind: 'npc', ref: hv.ref };
    if (R.mouse.x < 0) return null;
    const w = R.screenToWorld(R.mouse.x, R.mouse.y), wx = w.x, wy = w.y * R.K;
    const inBox = (x, y) => Math.abs(wx - x * TILE) < 16 && wy > y * TILE * R.K - 56 && wy < y * TILE * R.K + 8;
    let best = null, bd = Infinity;
    if (typeof Online !== 'undefined') for (const o of Online.others.values()) {
      if (o.stealth || !inBox(o.x, o.y)) continue;
      const d = Math.hypot(wx - o.x * TILE, wy - (o.y * TILE * R.K - 24));
      if (d < bd) { bd = d; best = o; }
    }
    if (best) return { kind: 'player', ref: best, mob: G.mobs.find(m => m.isPlayer && m.ref === best) || null };
    const p = G.player;
    if (p && inBox(p.x, p.y)) return { kind: 'self', ref: p };
    return null;
  },

  // ---------------- คอม: คลิกขวา (เรียกจาก js/main.js หลังเช็กสกิลที่รอเล็ง) ----------------
  onContext(e) {
    if (!G.started || !G.player) return;
    if ((e && e.pointerType && e.pointerType !== 'mouse') || performance.now() - this.lastTouch < 1000) return; // กดค้างบนจอสัมผัส: จัดการใน pressStart แล้ว
    if (e && typeof updateMouse === 'function') updateMouse(e);
    const u = this.pick();
    if (u) this.open(u, e ? e.clientX : R.mouse.x, e ? e.clientY : R.mouse.y);
  },

  // ---------------- มือถือ: แตะค้าง (เรียกจาก pointerdown ของฉากใน js/main.js) ----------------
  // คืน true = นิ้วลงบนยูนิต → เลื่อนการแตะปกติไปตอนยกนิ้ว (ค้างครบ 0.5 วิ = เปิดการ์ดแทน ไม่เดิน/ไม่ตี)
  pressStart(e) {
    this.lastTouch = performance.now();
    this.cancelPress(false);
    if (!G.started || G.pendingSkill) return false;
    const u = this.pick();
    if (!u) return false;
    const pr = { id: e.pointerId, x: e.clientX, y: e.clientY, mx: R.mouse.x, my: R.mouse.y, u, defer: u.kind !== 'self' };
    pr.tm = setTimeout(() => this.pressFire(), this.HOLD_MS);
    pr.ring = h('i', { class: 'uc-press', style: `left:${e.clientX}px;top:${e.clientY}px` });
    document.body.append(pr.ring);
    this.press = pr;
    return pr.defer; // แตะตัวเอง: ทำงานปกติทันที (เดินตามนิ้วได้) — ค้างนิ่ง 0.5 วิ ค่อยเปิด Status
  },
  pressFire() {
    const pr = this.press; if (!pr) return;
    this.cancelPress(false);
    if (!pr.defer) R.mouse.down = false; // ตัวเอง: หยุดเดินตามนิ้ว
    if (navigator.vibrate) try { navigator.vibrate(15); } catch (e) { /* ไม่เป็นไร */ }
    this.open(pr.u, pr.x, pr.y);
  },
  pressMove(e) {
    const pr = this.press;
    if (!pr || e.pointerId !== pr.id || Math.hypot(e.clientX - pr.x, e.clientY - pr.y) <= this.MOVE_PX) return;
    this.cancelPress(true); // ลากนิ้วออก = แตะปกติ ณ จุดที่กดลง (เหมือนก่อนมีระบบนี้)
    if (pr.defer) { R.mouse.down = true; R.mouse.holdAt = G.time + 0.35; }
  },
  pressEnd(e) {
    const pr = this.press;
    if (pr && e.pointerId === pr.id) this.cancelPress(true);
  },
  // run = ทำการแตะปกติที่เลื่อนไว้ (ตี/คุย/เดิน) ณ ตำแหน่งที่กดลง
  cancelPress(run) {
    const pr = this.press; if (!pr) return;
    this.press = null;
    clearTimeout(pr.tm);
    if (pr.ring) pr.ring.remove();
    if (!run || !pr.defer || typeof handleClick !== 'function') return;
    const mx = R.mouse.x, my = R.mouse.y;
    R.mouse.x = pr.mx; R.mouse.y = pr.my;
    handleClick();
    R.mouse.x = mx; R.mouse.y = my; // กลับไปตำแหน่งนิ้วปัจจุบัน (ลากต่อ = เดินตามนิ้ว)
  },

  // ---------------- เปิด / ปิด ----------------
  open(u, cx, cy) {
    if (!u) return;
    if (u.kind === 'self') { this.close(); UI.open('w-status'); return; }
    this.u = u; this.map = G.map; this.anchor = { x: cx, y: cy };
    this.render();
    this.el.hidden = false;
    this.place();
    if (typeof Sound !== 'undefined') Sound.play('click');
  },
  close() {
    if (!this.el || this.el.hidden) return false;
    this.el.hidden = true; this.u = null; this.refs = null;
    if (typeof UI !== 'undefined') UI.hideTip();
    return true;
  },
  // วางใกล้เคอร์เซอร์/นิ้ว ไม่ล้นจอ • จอเล็ก/มือถือ = แผ่นล่างจอ
  place() {
    const el = this.el, sh = this.sheet();
    el.classList.toggle('uc-sheet', sh);
    if (sh) { el.style.left = el.style.top = ''; return; }
    const r = { width: el.offsetWidth, height: el.offsetHeight }, W = innerWidth, H = innerHeight, a = this.anchor || { x: W / 2, y: H / 2 }; // offset* = ขนาดจริง (ไม่นับแอนิเมชันย่อ/ขยายตอนเปิด)
    let x = a.x + 16, y = a.y - 24;
    if (x + r.width > W - 8) x = a.x - r.width - 16;
    x = U.clamp(x, 8, Math.max(8, W - r.width - 8)); y = U.clamp(y, 8, Math.max(8, H - r.height - 8));
    el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px';
  },
  // ยูนิตยังอยู่ไหม (ตาย/ออก/ย้ายแผนที่ = ปิด)
  alive() {
    const u = this.u;
    if (!u || !G.started || G.map !== this.map) return false;
    if (u.kind === 'mob') return !u.ref.dead && G.mobs.includes(u.ref);
    if (u.kind === 'npc') return G.npcs.includes(u.ref);
    if (u.kind === 'player') {
      if (u.mob) return !u.mob.dead && G.mobs.includes(u.mob);
      return typeof Online !== 'undefined' && Online.others.get(u.ref.id) === u.ref && !u.ref.dead;
    }
    return false;
  },
  tick() {
    if (this.press && (!G.started || G.pendingSkill)) this.cancelPress(false);
    if (!this.isOpen()) return;
    if (!this.alive()) { this.close(); return; }
    const u = this.u, r = this.refs || {};
    const hpOf = u.kind === 'mob' ? u.ref : u.mob;
    if (hpOf && r.hp) this.setHp(r, hpOf.hp, hpOf.maxHp);
    if (u.kind === 'player' && r.party) { const t = this.partyText(u.ref); if (r.party.textContent !== t) r.party.textContent = t; }
    if (this.sheet() !== this.el.classList.contains('uc-sheet')) this.place();
  },
  setHp(r, hp, max) {
    const k = U.clamp(hp / Math.max(1, max), 0, 1), w = (k * 100).toFixed(1) + '%', t = `${U.fmt(Math.max(0, Math.ceil(hp)))} / ${U.fmt(max)}`;
    if (r.hp.style.width !== w) r.hp.style.width = w;
    r.hp.classList.toggle('low', k < 0.25);
    if (r.hpT.textContent !== t) r.hpT.textContent = t;
  },

  // ---------------- ข้อมูลมอน (ใช้ร่วมกับสมุดมอนสเตอร์ #w-mob) ----------------
  // แพ้/ต้านธาตุ: ตัวคูณจาก ELEM_TABLE เมื่อธาตุต่าง ๆ ตีมอนธาตุนี้
  elemInfo(el) {
    const all = Object.keys(ELEM_THAI).map(a => [a, elemMod(a, el || 'neutral')]);
    return { weak: all.filter(([, m]) => m > 1).sort((a, b) => b[1] - a[1]), resist: all.filter(([, m]) => m < 1).sort((a, b) => a[1] - b[1]) };
  },
  sizeOf(d) {
    if (d.size == null) return '';
    return d.size < 0.95 ? L('เล็ก', 'Small') : d.size <= 1.15 ? L('กลาง', 'Medium') : L('ใหญ่', 'Large');
  },
  tags(m) {
    const d = m.def, out = [];
    if (m.isWB || d.worldBoss) out.push(['ancient', 'ANCIENT']);
    else if (m.isMvp || d.boss) out.push(['mvp', 'MVP']);
    if (m.minion) out.push(['minion', L('ลูกสมุน', 'Minion')]);
    if (d.dummy) out.push(['dummy', L('หุ่นฝึก', 'Dummy')]);
    return out;
  },
  // Hunt Rune ที่ช่วยกับเป้านี้: Slayer เผ่าตรง • Endow ที่ธาตุชนะ • Giant Slayer (บอส/MVP/Ancient) • PvP = Human Slayer
  huntHints(m) {
    if (typeof HuntRunes === 'undefined' || !m || !m.def) return [];
    const d = m.def, out = [], pvp = !!m.isPlayer;
    for (const r of HuntRunes.LIST) {
      if (r.kind === 'slayer') {
        if (pvp ? r.arena : (!r.arena && r.race === d.race)) out.push({ r, v: `+${Math.round(r.pct * 100)}%` });
      } else if (r.kind === 'endow' && !pvp) {
        const k = elemMod(r.elem, d.element || 'neutral'); if (k > 1) out.push({ r, v: `×${k}` });
      } else if (r.id === 'hr_giant' && !pvp && HuntRunes.isBig(m)) out.push({ r, v: `+${Math.round(r.pct * 100)}%` });
    }
    return out;
  },
  // Endow ที่ใส่อยู่ถูกต้าน (เตือนเบา ๆ)
  endowWarn(m) {
    if (typeof HuntRunes === 'undefined' || !m || m.isPlayer) return '';
    const e = HuntRunes.endow(); if (!e) return '';
    const k = elemMod(e.elem, m.def.element || 'neutral');
    return k < 1 ? L(`Endow ที่ใส่อยู่ (${ELEM_THAI[e.elem]}) ถูกต้าน ×${k}`, `Your Endow (${ELEM_THAI[e.elem]}) is resisted ×${k}`) : '';
  },
  hintChips(m) {
    const act = typeof HuntRunes !== 'undefined' ? HuntRunes.active().map(r => r.id) : [];
    return this.huntHints(m).map(({ r, v }) => {
      const own = HuntRunes.owns(r.id), on = act.includes(r.id);
      return h('span', { class: 'uc-hr' + (on ? ' on' : own ? ' own' : ''), 'data-hr': r.id, title: r.desc },
        h('img', { src: itemIconUrl(r.id), alt: '' }), h('b', {}, r.name.replace(/ Rune$/, '')), h('em', {}, v),
        on ? h('i', {}, L('ใส่อยู่', 'On')) : own ? h('i', {}, '✓') : null);
    });
  },
  drops(d) {
    const list = (d.drops || []).slice();
    if (typeof Gacha !== 'undefined' && Gacha.bossTokens) { const n = Gacha.bossTokens({ def: d, isWB: !!d.worldBoss }); if (n > 0) list.unshift([Gacha.TOKEN, 1, n]); }
    return list.filter(([id]) => ITEMS[id]);
  },
  pct(ch) { return `${ch >= 0.1 ? Math.round(ch * 100) : (ch * 100).toFixed(ch < 0.01 ? 2 : 1)}%`; },
  chip(d) {
    const id = MOB_CHIP[d.id]; if (!id || !ITEMS[id]) return null;
    const p = G.player, got = (p.chips || []).includes(d.id), need = typeof chipNeed === 'function' ? chipNeed(d) : CHIP_KILLS, k = Math.min(need, (p.kills || {})[d.id] || 0);
    return { id, got, need, k };
  },

  // ---------------- วาดรูปหน้า ----------------
  portrait(u) {
    const cv = h('canvas', { width: 128, height: 128, class: 'uc-pt' }), g = cv.getContext('2d'), W = 128;
    try {
      if (u.kind === 'mob') {
        const d = u.ref.def, spr = Art.get('mobsprite_' + d.id) || (d.base && Art.get('mobsprite_' + d.base)), art = Art.get('mob_' + d.id);
        if (spr) { const k = Math.min(W / spr.width, W / spr.height) * 0.9; g.drawImage(spr, (W - spr.width * k) / 2, (W - spr.height * k) / 2, spr.width * k, spr.height * k); }
        else if (art && typeof HUMANOID_MOBS !== 'undefined' && HUMANOID_MOBS.includes(d.id)) Art.drawCover(g, art, W, W, 0.2);
        else { const sc = W / 34 / (d.scale || 1); g.save(); g.translate(W / 2, W * 1.45); g.scale(sc, sc);
          Sprites.drawMob(g, { def: d, x: 0, y: 0, facing: 1, dir: 2, moving: false, seed: 0.3, state: 'idle', hp: 1, maxHp: 1, atkAnim: 0 }, 0.2); g.restore(); }
      } else if (u.kind === 'player') {
        const o = u.ref, gk = Anim.playerKey(o.job, o.gender), em = Art.get('emblem_' + o.job);
        if (Anim.has(gk)) Anim.drawFace(g, gk, W, W);
        else if (em) { g.drawImage(em, W * 0.15, W * 0.15, W * 0.7, W * 0.7); }
      } else if (u.kind === 'npc') {
        const a = Art.get('npc_' + u.ref.id);
        if (a) Art.drawFace(g, a, W, W);
        else { g.save(); g.translate(W / 2 - (u.ref.x * TILE + TILE / 2) * 1.6, W * 0.92 - ((u.ref.y + 0.5) * TILE + 10) * 1.6); g.scale(1.6, 1.6); Sprites.drawNpc(g, u.ref, 0.2); g.restore(); }
      }
    } catch (e) { /* รูปหน้าไม่มี = กรอบว่าง */ }
    return h('span', { class: 'uc-ptw' }, cv);
  },

  // ---------------- สร้างการ์ด ----------------
  render() {
    const u = this.u, el = this.el;
    el.innerHTML = ''; el.dataset.kind = u.kind; this.refs = {};
    el.dataset.id = u.kind === 'mob' ? u.ref.def.id : u.kind === 'npc' ? u.ref.id : u.ref.id || '';
    const body = u.kind === 'mob' ? this.mobBody(u.ref) : u.kind === 'npc' ? this.npcBody(u.ref) : this.playerBody(u.ref, u.mob);
    el.append(h('button', { type: 'button', class: 'uc-x', 'aria-label': L('ปิด', 'Close'), title: L('ปิด (Esc)', 'Close (Esc)'), onclick: () => this.close() }, '×'), ...body);
  },
  head(u, name, sub, tags) {
    return h('div', { class: 'uc-head' }, this.portrait(u), h('div', { class: 'uc-id' },
      h('div', { class: 'uc-name' }, h('b', {}, name), ...(tags || []).map(([k, t]) => h('span', { class: 'uc-tag ' + k }, t))), ...sub));
  },
  hpBar(hp, max) {
    const fill = h('i'), t = h('em');
    const bar = h('div', { class: 'uc-hp' }, h('span', {}, 'HP'), h('div', { class: 'uc-bar' }, fill), t);
    this.refs.hp = fill; this.refs.hpT = t; this.setHp(this.refs, hp, max);
    return bar;
  },
  sec(title, ...kids) { return h('div', { class: 'uc-sec' }, h('div', { class: 'uc-h' }, title), ...kids); },
  mobBody(m) {
    const d = m.def, p = G.player, el = this.elemInfo(d.element), sz = this.sizeOf(d);
    const lv = h('span', { class: 'uc-lv', style: `color:${R.lvColor(d.lv, p.baseLv || 1)}` }, `Lv ${d.lv}`);
    const meta = h('div', { class: 'uc-meta' }, lv, h('span', {}, this.RACE[d.race] || d.race || '-'), h('span', { class: 'uc-el', 'data-el': d.element || 'neutral' }, ELEM_THAI[d.element] || d.element || '-'),
      sz ? h('span', { class: 'uc-size' }, L(`ขนาด${sz}`, `${sz} size`)) : null);
    const aggro = h('div', { class: 'uc-aggro ' + (d.aggro ? 'bad' : 'ok') }, d.aggro ? L('⚠ โจมตีก่อน (Aggressive)', '⚠ Aggressive') : L('ไม่โจมตีก่อน (Passive)', 'Passive'));
    const kv = (k, v) => h('div', { class: 'uc-kv' }, h('span', {}, k), h('b', {}, String(v)));
    const out = [
      this.head({ kind: 'mob', ref: m }, d.name, [meta, aggro], this.tags(m)),
      this.hpBar(m.hp, m.maxHp),
      h('div', { class: 'uc-grid' }, kv('ATK', `${d.atk[0]}–${d.atk[1]}`), kv('DEF', d.def), kv('MDEF', d.mdef)),
    ];
    const chips = [
      ...el.weak.slice(0, 4).map(([e, k]) => h('span', { class: 'uc-ech weak', 'data-el': e }, L(`แพ้${ELEM_THAI[e]} ×${k}`, `Weak to ${ELEM_THAI[e]} ×${k}`))),
      ...el.resist.slice(0, 3).map(([e, k]) => h('span', { class: 'uc-ech res', 'data-el': e }, k === 0 ? L(`${ELEM_THAI[e]} ไม่เข้า`, `Immune to ${ELEM_THAI[e]}`) : L(`ต้าน${ELEM_THAI[e]} ×${k}`, `Resists ${ELEM_THAI[e]} ×${k}`))),
    ];
    out.push(this.sec(L('ธาตุ', 'Elements'), h('div', { class: 'uc-chips uc-weak' }, chips.length ? chips : h('span', { class: 'uc-dim' }, L('ไม่มีจุดอ่อนธาตุ', 'No elemental weakness')))));
    const hr = this.hintChips(m), warn = this.endowWarn(m);
    if (hr.length || warn) out.push(this.sec('Hunt Rune', hr.length ? h('div', { class: 'uc-chips' }, hr) : null, warn ? h('div', { class: 'uc-warn' }, warn) : null));
    const dl = this.drops(d);
    out.push(this.sec(L('ของดรอป', 'Drops'), dl.length ? h('div', { class: 'uc-drops' }, dl.map(([id, ch, n]) => {
      const it = ITEMS[id], cell = h('div', { class: 'uc-drop', 'data-item': id },
        h('span', { class: 'uc-plate r-' + (UI.rarOf ? UI.rarOf(id) : 'common') }, h('img', { src: itemIconUrl(id), alt: '' })),
        h('span', { class: 'uc-dn ' + rarCls(id) }, EN(it.name) + (n > 1 ? ` ×${n}` : '')), h('em', {}, this.pct(ch)));
      return UI.tipFor(cell, { id, qty: 1, refine: 0, cards: [] });
    })) : h('span', { class: 'uc-dim' }, L('ไม่มี', 'None'))));
    const c = this.chip(d);
    if (c) out.push(h('div', { class: 'uc-chip' + (c.got ? ' got' : ''), 'data-chip': c.id }, h('img', { src: itemIconUrl(c.id), alt: '' }),
      h('span', { class: 'uc-chip-t' }, h('b', {}, EN(ITEMS[c.id].name)),
        h('small', {}, c.got ? L('✦ ได้แล้ว', '✦ Obtained') : L(`ล่า ${c.k}/${c.need} ตัว`, `Hunted ${c.k}/${c.need}`))),
      c.got ? null : h('span', { class: 'uc-chip-bar' }, h('i', { style: `width:${(c.k / c.need * 100).toFixed(1)}%` }))));
    const btns = [];
    btns.push(h('button', { type: 'button', class: 'btn small primary', 'data-act': 'attack', onclick: () => { this.attack(m); } }, ivIconEl('sword'), L('โจมตี', 'Attack')));
    if (MOBS[d.id] && !m.isPlayer) btns.push(h('button', { type: 'button', class: 'btn small', 'data-act': 'book', onclick: () => { this.close(); UI.showMob(d.id); } }, ivIconEl('mob'), L('สมุดมอนสเตอร์', 'Monster Book')));
    out.push(h('div', { class: 'uc-btns' }, btns));
    return out;
  },
  // ปุ่มโจมตี = คำสั่งเดียวกับคลิกซ้ายที่มอน (js/main.js handleClick)
  attack(m) {
    const p = G.player; this.close();
    if (!G.started || p.dead || m.dead) return;
    p.target = null; p.pickTarget = null; p.npcTarget = null; p.skillIntent = null; p.sitting = false;
    p.target = m; p.repathAt = 0; Bot.userTarget(m);
  },
  partyText(o) {
    if (typeof Party === 'undefined' || !Party.party) return L('ไม่ได้อยู่ปาร์ตี้เดียวกับคุณ', 'Not in your party');
    if (!Party.has(o.id)) return L('ไม่ได้อยู่ปาร์ตี้เดียวกับคุณ', 'Not in your party');
    return Party.leaderId() === o.id ? L(`♛ หัวหน้าปาร์ตี้ "${Party.party.name}"`, `♛ Leader of "${Party.party.name}"`) : L(`อยู่ปาร์ตี้เดียวกัน "${Party.party.name}"`, `In your party "${Party.party.name}"`);
  },
  playerBody(o, pm) {
    const J = JOBS[o.job] || JOBS.novice, par = J.parent && JOBS[J.parent];
    const lv = o.baseLv || (pm && pm.def.lv) || 1, p = G.player;
    const party = h('div', { class: 'uc-party' + (typeof Party !== 'undefined' && Party.has(o.id) ? ' in' : '') }, this.partyText(o));
    this.refs.party = party;
    const meta = h('div', { class: 'uc-meta' }, h('span', { class: 'uc-lv', style: `color:${R.lvColor(lv, p.baseLv || 1)}` }, `Lv ${lv}`),
      h('span', { class: 'uc-cls', style: `--c:${J.glow || '#d4a347'}` }, par ? `${par.name} → ${J.name}` : J.name), o.bot ? h('span', { class: 'uc-dim' }, 'AUTO') : null);
    const clsLine = h('div', { class: 'uc-sub' }, par ? L(`Class 2 · สายของ ${par.name}`, `Class 2 · from ${par.name}`) : J.tier === 2 ? 'Class 2' : o.job === 'novice' ? 'Novice' : 'Class 1');
    const tags = pm ? [['pvp', 'PvP']] : [];
    const out = [this.head({ kind: 'player', ref: o }, o.name || '?', [meta, clsLine, party], tags)];
    if (pm) out.push(this.hpBar(pm.hp, pm.maxHp));
    // ของที่สวม (ข้อมูลเครือข่ายส่งมาแค่ อาวุธ/หัว/ผ้าคลุม) • ไม่มีเลย = อาวุธประจำ Class
    const eq = o.equip || {}, slots = [['weapon', 'Weapon'], ['head', 'Head'], ['garment', 'Garment']].filter(([k]) => eq[k] && ITEMS[eq[k].id]);
    const rows = slots.map(([k, lab]) => this.eqRow(eq[k].id, lab));
    if (!rows.length && typeof Paperdoll !== 'undefined') { const cw = Paperdoll.classWeapon(o.job); if (cw) rows.push(this.eqRow(cw.id, 'Class weapon')); }
    out.push(this.sec(L('ของที่สวม', 'Equipment'), rows.length ? h('div', { class: 'uc-eq' }, rows) : h('span', { class: 'uc-dim' }, L('ไม่มีข้อมูล', 'Nothing visible'))));
    if (pm) { const hr = this.hintChips(pm); if (hr.length) out.push(this.sec('Hunt Rune', h('div', { class: 'uc-chips' }, hr))); }
    // ปุ่ม: เฉพาะที่มีอยู่แล้วในเกม (เชิญปาร์ตี้ / ขอแลก / อีโมต)
    const btns = [];
    const online = typeof Online !== 'undefined' && Online.online;
    if (typeof Party !== 'undefined' && !Party.has(o.id)) btns.push(h('button', { type: 'button', class: 'btn small primary', 'data-act': 'invite', disabled: online ? false : 'disabled',
      onclick: () => { this.close(); Party.sendInvite({ id: o.id, name: o.name }); } }, ivIconEl('party'), L('ชวนเข้าปาร์ตี้', 'Invite to party')));
    if (typeof Trade !== 'undefined') btns.push(h('button', { type: 'button', class: 'btn small', 'data-act': 'trade', disabled: online && !o.dead ? false : 'disabled',
      onclick: () => { this.close(); Trade.request(o); } }, ivIconEl('trade'), L('แลกเปลี่ยน', 'Trade')));
    if (typeof Emote !== 'undefined') btns.push(h('button', { type: 'button', class: 'btn small', 'data-act': 'emote', onclick: () => { this.close(); UI.open('w-emote'); } }, ivIconEl('emote'), L('อีโมต', 'Emote')));
    if (pm) btns.unshift(h('button', { type: 'button', class: 'btn small primary', 'data-act': 'attack', onclick: () => this.attack(pm) }, ivIconEl('sword'), L('โจมตี', 'Attack')));
    out.push(h('div', { class: 'uc-btns' }, btns));
    if (!online) out.push(h('div', { class: 'uc-dim uc-note' }, L('ปาร์ตี้/แลกเปลี่ยน ใช้ได้เมื่อออนไลน์', 'Party/Trade need an online connection')));
    return out;
  },
  eqRow(id, lab) {
    const it = ITEMS[id];
    return UI.tipFor(h('div', { class: 'uc-eqr', 'data-item': id }, h('span', { class: 'uc-plate r-' + (UI.rarOf ? UI.rarOf(id) : 'common') }, h('img', { src: itemIconUrl(id), alt: '' })),
      h('span', {}, h('b', { class: rarCls(id) }, EN(it.name)), h('small', {}, lab))), { id, qty: 1, refine: 0, cards: [] });
  },
  npcBody(n) {
    const role = this.NPC_ROLE[n.id] || 'NPC', p = G.player, far = U.dist(p.x, p.y, n.x + 0.5, n.y + 0.5);
    return [
      this.head({ kind: 'npc', ref: n }, n.name, [h('div', { class: 'uc-meta' }, h('span', { class: 'uc-role' }, role)),
        h('div', { class: 'uc-sub' }, L(`ห่าง ${Math.round(far)} ช่อง`, `${Math.round(far)} cells away`))], [['npc', 'NPC']]),
      h('div', { class: 'uc-btns' }, h('button', { type: 'button', class: 'btn small primary', 'data-act': 'talk', onclick: () => this.talk(n) }, ivIconEl('dialog'), L('คุย', 'Talk'))),
    ];
  },
  // ปุ่มคุย = คำสั่งเดียวกับคลิกซ้ายที่ NPC (เดินไปแล้วคุย)
  talk(n) {
    const p = G.player; this.close();
    if (!G.started || p.dead) return;
    p.target = null; p.pickTarget = null; p.skillIntent = null; p.sitting = false;
    Bot.manualOverride(); p.npcTarget = n; p.path = [];
  },

  // ---------------- สมุดมอนสเตอร์ (#w-mob): เพิ่ม ขนาด / ป้าย Ancient / Hunt Rune ที่ช่วย / ต้านธาตุ ----------------
  extendMobBook() {
    if (typeof UI === 'undefined' || !UI.renderMob || UI.renderMob._uc) return;
    const mob0 = UI.renderMob.bind(UI);
    UI.renderMob = () => {
      mob0();
      const d = MOBS[UI.mobInfo], body = document.querySelector('#w-mob .win-body');
      if (!d || !body || body.querySelector('.uc-mbx')) return;
      const fake = { def: d, isWB: !!d.worldBoss, isMvp: !!d.boss };
      const sub = body.querySelector('.mb-head .mb-sub'), sz = this.sizeOf(d);
      if (sub && sz) sub.textContent += L(` • ขนาด${sz}`, ` • ${sz} size`);
      const nm = body.querySelector('.mb-name');
      if (nm && d.worldBoss) { const t = nm.querySelector('.tag'); if (t) t.textContent = 'ANCIENT'; }
      const res = this.elemInfo(d.element).resist;
      const box = h('div', { class: 'uc-mbx' });
      if (res.length) box.append(h('div', { class: 'mb-sub' }, L(`ต้านธาตุ: ${res.slice(0, 3).map(([e, k]) => `${ELEM_THAI[e]} ×${k}`).join(', ')}`, `Resists: ${res.slice(0, 3).map(([e, k]) => `${ELEM_THAI[e]} ×${k}`).join(', ')}`)));
      const hr = this.hintChips(fake);
      if (hr.length) box.append(h('div', { class: 'mb-h' }, 'Hunt Rune'), h('div', { class: 'uc-chips' }, hr));
      const dropsH = [...body.querySelectorAll('.mb-h')][0];
      if (box.children.length) { if (dropsH) dropsH.before(box); else body.append(box); }
    };
    UI.renderMob._uc = true;
  },
};
UnitCard.init();
