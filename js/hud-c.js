'use strict';
// ============================================================
//  HUD แบบ C "จอโล่ง" — มือถือแนวตั้งเท่านั้น (เจ้าของเลือก 2026-10-11 หลังลองม็อกอัป: "ก็ดี ลองทำเลย")
//  • เปิดเมื่อ จอ ≤ 760px แนวตั้ง + โหมด PAD → body.hudc (หน้าตาอยู่ใน css/hud-c.css) • คอม/แนวนอนไม่แตะ
//  • ใช้ของจริงในเกมทั้งหมด: ปุ่ม/หน้าต่างเดิม (UI.toggle, Quest.go, Nav, MM.open, FlyPilot.toggle …) — ไฟล์นี้แค่จัดที่ + เพิ่มปุ่มทางลัด
//  • ซ้ายบน: ชิปตัวละคร (รูป + Lv + แต้มค้าง + HP/SP ตัวเลข) → บัฟ → บรรทัดเควสต์ → ปาร์ตี้
//    ขวาบน: Quest / แผนที่ / เมนู (48px) → ชิปเหตุการณ์ (MVP / Ancient) → แถบรุมบอส
//    ล่าง: จอย + ยา 2×2 + แชต (ซ้าย) • ปุ่มตีใหญ่ + สกิล 4 ช่องเป็นวง + สลับหน้า (8 ช่องครบ) + ULT/AUTO (ขวา)
//  • ไม่ได้สู้ ~5 วิ: สกิล/ULT จางเหลือ 40% (ยังกดได้) • ข้อความระบบหายเองใน ~3 วิ (ประวัติเต็มอยู่ในช่องแชต)
//  • ไม่แตะตรรกะเกม/เซฟ — ห่อฟังก์ชัน UI เดิมเฉพาะตอน body.hudc
// ============================================================
const HudC = {
  on: false, page: 0, calmAt: 0, lastHp: null, mq: null, els: {},
  CALM_SEC: 5,
  active() { return !!(this.mq && this.mq.matches && typeof Pad !== 'undefined' && Pad.enabled()); },

  install() {
    if (this.els.chip || typeof document === 'undefined') return;
    this.mq = matchMedia('(max-width: 760px) and (orientation: portrait)');
    const hud = document.getElementById('hud'); if (!hud) return;
    const btn = (id, label, onclick, extra = {}) => h('button', Object.assign({ type: 'button', id, class: 'hc-btn', onclick }, extra), label);
    // ---- ขวาบน: แผนที่ (Quest = #qt-btn เดิม • เมนู = ปุ่ม TAB เดิมของ #menubar) ----
    this.els.map = btn('hc-map', L('แผนที่', 'Map'), e => { e.stopPropagation(); UI.toggle('w-map'); }, { 'aria-label': L('แผนที่', 'Map') });
    // ---- ชิปเหตุการณ์ (ของจริงคือ #mm-mvp / #mm-wb ใต้มินิแมพ — มินิแมพซ่อนบนมือถือแนวตั้ง จึงสะท้อนข้อความมาไว้ที่นี่) ----
    this.els.mvp = btn('hc-mvp', '', e => { e.stopPropagation(); this.goMvp(); });
    this.els.wb = btn('hc-wb', '', e => { e.stopPropagation(); const w = document.getElementById('mm-wb'); if (w) w.click(); });
    this.els.mvp.hidden = this.els.wb.hidden = true;
    // ---- ซ้ายบน: บรรทัดเควสต์ (แตะ = นำทาง/ล่า แบบเดียวกับการ์ดเควสต์เดิม) ----
    this.els.qline = btn('hc-qline', '', e => { e.stopPropagation(); Sound.play('click'); Quest.go(); }, { title: L('แตะเพื่อนำทางไปทำเควสต์', 'Tap to navigate to your quest') });
    this.els.qline.hidden = true;
    // ---- ป้ายเป้าหมายใต้ตัวมอน (แทนการ์ด #target) ----
    this.els.tag = h('div', { id: 'hc-tag', 'aria-hidden': 'true' }); this.els.tag.hidden = true;
    // ---- สลับหน้าสกิล 1–4 / 5–8 ----
    this.els.page = btn('hc-page', '1/2', e => { e.stopPropagation(); this.setPage(this.page ? 0 : 1); Sound.play('click'); }, { 'aria-label': L('สลับหน้าสกิล', 'Switch skill page') });
    hud.append(this.els.map, this.els.mvp, this.els.wb, this.els.qline, this.els.tag, this.els.page);
    // ---- ชิปตัวละคร: แตะ = Status • จุดสถานะเน็ต (สะท้อน #net ที่อยู่ในมินิแมพ) ----
    const bi = document.getElementById('basic-info');
    this.els.net = h('i', { class: 'hc-net', hidden: '' });
    this.els.pts = h('i', { class: 'hc-pts', hidden: '', title: L('แต้มที่ยังไม่ได้ใช้ (แตะชิปเพื่อเปิด Status)', 'Unspent points (tap to open Status)') });
    bi.append(this.els.pts);
    this.els.volt = h('i', { class: 'hc-volt only-hudc' }); // เงินตัวเล็กใต้ SP (เจ้าของ 2026-10-11)
    ($('.bi-main', bi) || bi).append(this.els.volt);
    // หลอด Base/Job บาง ๆ ใต้เงิน (เจ้าของ 2026-10-11 "เพิ่มหลอด base job")
    this.els.bx = h('i', { class: 'hc-xb base' }, h('i', {})); this.els.jx = h('i', { class: 'hc-xb job' }, h('i', {}));
    ($('.bi-main', bi) || bi).append(this.els.bx, this.els.jx);
    this.els.chip = bi;
    $('.bi-face', bi).append(this.els.net);
    bi.addEventListener('click', e => {
      if (!this.on) return;
      Sound.play('click'); UI.toggle('w-status');
    });
    this.buildSheet();
    this.buildMapTools();
    this.wrap();
    this.mq.addEventListener('change', () => this.sync());
    addEventListener('resize', () => this.sync());
    try { this.setPage(+(localStorage.getItem('nm_hcpage') || 0)); } catch (e) { this.setPage(0); }
    setInterval(() => { if (typeof Battery !== 'undefined' && Battery.on() && (document.hidden || (this._bt = !this._bt))) return; this.tick(); }, 250); // ประหยัดแบต: 500ms
    const raf = () => { if (typeof Battery === 'undefined' || !Battery.on() || Battery.n !== this._bn) { this._bn = Battery && Battery.n; this.frame(); } requestAnimationFrame(raf); }; requestAnimationFrame(raf);
    this.sync();
  },

  sync() {
    const on = this.active();
    if (on === this.on && document.body.classList.contains('hudc') === on) return;
    this.on = on;
    document.body.classList.toggle('hudc', on);
    if (on) { this.calmAt = 0; this.tick(); }
    else { for (const e of this.stackEls()) if (e) e.style.removeProperty('top'); }
    if (typeof UI !== 'undefined' && UI.stackTop) UI.stackTop();
  },
  setPage(n) {
    this.page = n ? 1 : 0;
    document.body.dataset.hcpage = String(this.page);
    if (this.els.page) { this.els.page.textContent = `${this.page + 1}/2`; this.els.page.title = this.page ? L('สกิล 5–8 (แตะเพื่อไป 1–4)', 'Skills 5–8 (tap for 1–4)') : L('สกิล 1–4 (แตะเพื่อไป 5–8)', 'Skills 1–4 (tap for 5–8)'); }
    try { localStorage.setItem('nm_hcpage', String(this.page)); } catch (e) { /* ไม่เป็นไร */ }
  },

  // ---------- แผ่นเมนู (ใช้แผง #menu-panel เดิม — ปุ่มเดิมทุกปุ่ม + ทางลัดที่เคยกระจายอยู่บนจอ) ----------
  buildSheet() {
    const m = document.getElementById('menubar'), panel = document.getElementById('menu-panel');
    if (!m || !panel) return;
    const add = (key, label, ic, fn) => {
      const b = h('button', { type: 'button', class: 'hc-only', 'data-hc': key, title: label, onclick: () => { fn(); UI.setFold(m, true); } });
      b.innerHTML = `${ivIcon(ic)}<span>${U.esc(label)}</span>`;
      m.append(b); // MutationObserver ใน UI.initFolds ย้ายเข้ากริดเมนูให้เอง
      return b;
    };
    add('quests', 'Quest', 'quest', () => UI.toggle('w-quest'));
    add('mm', L('หาปาร์ตี้', 'Find Party'), 'party', () => { if (typeof MM !== 'undefined') MM.open(); });
    add('emote', L('อีโมต', 'Emote'), 'emote', () => UI.toggle('w-emote'));
    this.els.saverItem = add('saver', L('ประหยัดแบต', 'Battery'), 'bell', () => Battery.toggle());
    this.els.flyItem = add('fly', L('แมลงวัน', 'Fly'), 'leaf', () => { if (typeof FlyPilot !== 'undefined') FlyPilot.toggle(); });
    // หัวแผ่น: ชื่อ · Class · Lv + เงิน / Job / EXP (ย้ายมาจากการ์ดตัวละครเต็ม)
    this.els.head = h('div', { class: 'hc-only hc-sheet-head' });
    panel.prepend(this.els.head);
    // แถวล่าง: ซ่อนปุ่มบนจอ / แชต / นั่งพัก / เต็มจอ
    const act = (key, label, fn) => h('button', { type: 'button', 'data-hc': key, onclick: () => { UI.setFold(m, true); fn(); } }, label);
    const row = h('div', { class: 'hc-only hc-sheet-row' },
      act('hide', L('ซ่อนปุ่ม', 'Hide HUD'), () => UI.toggleHud()),
      act('chat', L('แชต', 'Chat'), () => this.openChat()),
      act('sit', L('นั่งพัก', 'Sit'), () => { if (typeof toggleSit === 'function') toggleSit(); }),
      document.documentElement.requestFullscreen ? act('fs', L('เต็มจอ', 'Fullscreen'), () => this.fullscreen()) : null);
    panel.append(row);
    // เปิดแผ่น = เติมหัว + สถานะปุ่มแมลงวัน
    const fold = m.querySelector('.menu-fold');
    if (fold) fold.addEventListener('click', () => setTimeout(() => this.paintSheet(), 0));
  },
  paintSheet() {
    if (!this.on || !G.player || !this.els.head) return;
    const p = G.player, bNeed = baseExpNeed(p.baseLv), jNeed = jobExpNeed(p.job, p.jobLv);
    const bk = p.baseLv >= MAX_BASE_LV ? 100 : p.baseExp / bNeed * 100, jk = p.jobLv >= JOBS[p.job].jobMax ? 100 : p.jobExp / jNeed * 100;
    this.els.head.innerHTML = '';
    this.els.head.append(h('b', {}, `${p.name} · ${JOBS[p.job].name} · Lv ${p.baseLv}`),
      h('span', {}, `${U.fmt(p.zeny)} ${CUR} · Job ${p.jobLv} · EXP ${bk.toFixed(1)}% · Job ${jk.toFixed(1)}%`));
    if (this.els.saverItem) this.els.saverItem.classList.toggle('on', Battery.on());
    if (this.els.flyItem && typeof FlyPilot !== 'undefined') this.els.flyItem.classList.toggle('on', !!FlyPilot.on);
  },
  openChat() {
    const c = document.getElementById('chat'); if (!c) return;
    if (c.classList.contains('folded')) UI.setFold(c, false);
    c.classList.add('typing'); document.getElementById('chat-input').focus();
  },
  fullscreen() {
    try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); } catch (e) { /* เบราว์เซอร์ไม่รองรับ */ }
  },

  // ---------- หน้าต่างแผนที่: ชื่อแผนที่ + ซูมจอ + นำทางไป MVP (มินิแมพถาวรถูกถอดบนมือถือแนวตั้ง) ----------
  buildMapTools() {
    const body = document.querySelector('#w-map .win-body'); if (!body) return;
    this.els.mapName = h('div', { class: 'hc-only hc-mapname' });
    body.prepend(this.els.mapName);
    const zoom = k => () => { const b = document.querySelector(`#zoom-ctl button[data-zoom="${k}"]`); if (b) b.click(); };
    this.els.mapMvp = h('button', { type: 'button', class: 'btn hc-only', 'data-hc': 'map-mvp', onclick: () => { UI.close('w-map'); this.goMvp(); } }, L('นำทางไป MVP', 'Go to MVP'));
    const ops = body.querySelector('.opt-btns') || body;
    ops.append(
      h('button', { type: 'button', class: 'btn hc-only', 'data-hc': 'zin', 'aria-label': L('ซูมจอเข้า', 'Zoom in'), onclick: zoom('1.18') }, L('ซูม +', 'Zoom +')),
      h('button', { type: 'button', class: 'btn hc-only', 'data-hc': 'zout', 'aria-label': L('ซูมจอออก', 'Zoom out'), onclick: zoom('0.85') }, L('ซูม −', 'Zoom −')),
      this.els.mapMvp);
  },
  goMvp() {
    const id = G.map && G.map.def.mvp;
    if (!id) return;
    const alive = G.mobs.some(m => m.isMvp && !m.dead);
    if (alive && typeof Nav !== 'undefined') { Sound.play('click'); Nav.goTo({ kind: 'mob', map: G.map.id, mobId: id, name: MOBS[id].name }); }
    else UI.msg(document.getElementById('mm-mvp').textContent || L(`MVP ${MOBS[id].name} ยังไม่เกิด`, `MVP ${MOBS[id].name} hasn't spawned yet`), 'info');
  },

  // ---------- ห่อฟังก์ชันเดิม (เฉพาะตอน hudc) ----------
  wrap() {
    const st = UI.stackTop;
    UI.stackTop = function () { if (HudC.on) { HudC.stack(); return; } return st.apply(this, arguments); };
    const alt = UI.autoAlt;
    UI.autoAlt = function () { // กดค้าง AUTO: แมลงวัน หรือ ตั้งค่าบอท (ปุ่มแมลงวันลอยถูกถอดบนมือถือแนวตั้ง)
      if (!HudC.on || !UI.menu || typeof FlyPilot === 'undefined') return alt.apply(this, arguments);
      UI.menu('AUTO', '', [FlyPilot.on ? L('ปิดโหมดแมลงวัน', 'Stop Fly mode') : L('โหมดแมลงวัน', 'Fly mode'), L('ตั้งค่าบอท', 'Bot settings'), L('ยกเลิก', 'Cancel')])
        .then(i => { UI.dlgClose(); if (i === 0) FlyPilot.toggle(); else if (i === 1) UI.open('w-bot'); }).catch(() => {});
    };
    if (typeof FlyPilot !== 'undefined' && FlyPilot.drawOv) {
      const dov = FlyPilot.drawOv;
      FlyPilot.drawOv = function () {
        const r = dov.apply(this, arguments);
        if (HudC.on && this.ov && !this.ov.hidden) { // ปุ่มแมลงวันซ่อน → กรอบตัวเลขลอยเหนือแถว ULT/AUTO
          const a = document.getElementById('auto-btn').getBoundingClientRect(), o = this.ov;
          o.style.left = Math.round(Math.max(4, a.right - (o.offsetWidth || 150))) + 'px';
          o.style.top = Math.round(a.top - (o.offsetHeight || 70) - 8) + 'px';
        }
        return r;
      };
    }
  },

  // ---------- คอลัมน์ซ้าย/ขวา/กลาง เรียงต่อกันตามของที่แสดงอยู่ (ไม่ทับกัน) ----------
  stackEls() { return ['buffs', 'hc-qline', 'party-hud', 'hc-mvp', 'hc-wb', 'raid-bar', 'pvp-hud', 'nav-pill'].map(id => document.getElementById(id)); },
  vis(e) { return !!(e && !e.hidden && e.getClientRects().length && getComputedStyle(e).display !== 'none'); },
  stack() {
    const $i = id => document.getElementById(id), put = (e, y) => { const v = Math.round(y) + 'px'; if (e.style.getPropertyValue('top') !== v) e.style.setProperty('top', v, 'important'); };
    const bot = e => e.getBoundingClientRect().bottom, G6 = 6;
    const st = parseFloat(getComputedStyle(document.body).getPropertyValue('--st')) || 0;
    // ซ้าย: ชิปตัวละคร → บัฟ → เควสต์ → ปาร์ตี้
    let y = this.vis(this.els.chip) ? bot(this.els.chip) + G6 : 8 + st;
    for (const id of ['buffs', 'hc-qline', 'party-hud']) { const e = $i(id); if (id === 'buffs' && !(e && e.querySelector('.buff'))) continue; if (this.vis(e)) { put(e, y); y = bot(e) + G6; } }
    const left = y;
    // ขวา: ปุ่ม 3 ปุ่ม → MVP → Ancient → แถบรุมบอส
    const top3 = $i('hc-map'); let r = this.vis(top3) ? bot(top3) + 8 : 64 + st;
    for (const id of ['hc-mvp', 'hc-wb', 'raid-bar']) { const e = $i(id); if (this.vis(e)) { put(e, r); r = bot(e) + G6; } }
    // กลาง: ใต้คอลัมน์ที่ยาวกว่า (PvP → ป้ายนำทาง)
    let c = Math.max(left, r);
    for (const id of ['pvp-hud', 'nav-pill']) { const e = $i(id); if (this.vis(e)) { put(e, c); c = bot(e) + G6; } }
  },

  // ---------- ทุก 250ms ----------
  tick() {
    if (!this.on) { if (this.active()) this.sync(); return; }
    if (!this.active()) { this.sync(); return; }
    if (typeof G === 'undefined' || !G.started || !G.player || !G.map) return;
    const p = G.player, $i = id => document.getElementById(id);
    // MVP / Ancient
    const mv = $i('mm-mvp'), wb = $i('mm-wb');
    this.mirror(this.els.mvp, mv, 'mvp'); this.mirror(this.els.wb, wb, 'wb');
    // เควสต์
    const q = Quest.current(), ql = this.els.qline;
    if (q && p.options.questTrack !== false) {
      const t = `${L('เควสต์', 'Quest')} · ${Quest.objText(q)}`;
      if (ql.dataset.t !== t) { ql.dataset.t = t; ql.innerHTML = ''; ql.append(h('b', {}, L('เควสต์', 'Quest')), h('span', {}, Quest.objText(q))); }
      ql.hidden = false;
    } else ql.hidden = true;
    // ป้ายแต้มค้างบนชิป: ตัวเลขรวม (Status + Skill + Passive)
    const n = (p.statPoints || 0) + (p.skillPoints || 0) + Math.max(0, Passive.free(p)), nt = n > 0 ? '+' + n : '';
    if (this.els.pts.textContent !== nt) { this.els.pts.textContent = nt; this.els.pts.hidden = !nt; }
    const vt = `${U.fmt(p.zeny || 0)} Volt`; if (this.els.volt.textContent !== vt) this.els.volt.textContent = vt;
    for (const [el, src, lb] of [[this.els.bx, 'bi-bexp-t', 'Base ' + p.baseLv], [this.els.jx, 'bi-jexp-t', 'Job ' + p.jobLv]]) {
      const tx = ((document.getElementById(src) || {}).textContent || '0').trim(), w = Math.max(0, Math.min(100, parseFloat(tx) || 0)) + '%';
      if (el.firstChild.style.width !== w) el.firstChild.style.width = w;
      const ti = `${lb} · ${tx}`; if (el.title !== ti) el.title = ti;
    }
    // จุดสถานะเน็ต
    const net = $i('net');
    if (net) { this.els.net.hidden = net.hidden; this.els.net.className = 'hc-net ' + net.className.replace(/\bnet\b/, '').trim(); this.els.net.title = net.title; }
    // ปาร์ตี้: HP% เป็นตัวเลขต่อแถว
    for (const row of document.querySelectorAll('#party-hud .ph-row[data-id]')) {
      const m = typeof Party !== 'undefined' && Party.member(row.dataset.id); if (!m) continue;
      let e = row.querySelector('.hc-hp'); if (!e) { e = h('em', { class: 'hc-hp' }); row.append(e); }
      const t = row.classList.contains('off') ? '—' : m.dead ? L('ล้ม', 'Down') : Math.round(U.clamp(m.hp / Math.max(1, m.maxHp), 0, 1) * 100) + '%';
      if (e.textContent !== t) e.textContent = t;
    }
    // สู้อยู่ไหม: มีเป้า/เล็งสกิล/ร่ายอยู่/โดนตี/บอทหรือแมลงวันทำงาน → สกิลไม่จาง
    const fight = (p.target && !p.target.dead) || (p.skillTarget && !p.skillTarget.dead) || G.pendingSkill || p.cast || (this.lastHp != null && p.hp < this.lastHp) || (typeof Bot !== 'undefined' && Bot.on) || (typeof FlyPilot !== 'undefined' && FlyPilot.on);
    this.lastHp = p.hp;
    if (fight) this.calmAt = G.time + this.CALM_SEC;
    document.body.classList.toggle('hc-calm', G.time > this.calmAt);
    $i('auto-btn').classList.toggle('hc-fly', typeof FlyPilot !== 'undefined' && !!FlyPilot.on);
    if (this.els.mapName && UI.isOpen('w-map')) {
      const t = `${G.map.def.name} · ${G.map.def.thai} (${Math.floor(p.x)}, ${Math.floor(p.y)})`;
      if (this.els.mapName.textContent !== t) this.els.mapName.textContent = t;
      this.els.mapMvp.hidden = !G.map.def.mvp;
    }
    this.stack();
  },
  // ป้ายบอส: MVP (ทอง) / Ancient (ม่วง) ต่างกันชัด + เลขเลือดจริงเมื่อบอสอยู่ในแมพนี้ (เจ้าของ 2026-10-11)
  mirror(dst, src, kind) {
    const t = src && !src.hidden ? src.textContent.replace(/^[^\p{L}\p{N}]+/u, '').trim() : '';
    const m = t && G.mobs ? G.mobs.find(x => !x.dead && (kind === 'wb' ? x.isWB : x.isMvp)) : null;
    const hp = m ? `${U.fmt(Math.max(0, Math.round(m.hp)))} / ${U.fmt(m.maxHp)}` : '';
    const key = t + '|' + hp;
    if (dst.dataset.k !== key) {
      dst.dataset.k = key; dst.textContent = '';
      if (t) dst.append(h('b', { class: 'hc-kind' }, kind === 'wb' ? 'ANCIENT' : 'MVP'), h('span', { class: 'hc-bt' }, t.replace(/^(MVP|Ancient)\s*[·:]?\s*/i, '')), hp ? h('em', { class: 'hc-hp' }, hp) : '');
    }
    dst.hidden = !t;
    dst.classList.toggle('alive', !!(src && src.classList.contains('alive')));
    if (src && src.title) dst.title = src.title;
  },

  // ---------- ทุกเฟรม: ป้ายเป้าหมายตามตัวมอน ----------
  frame() {
    const el = this.els.tag;
    if (!el) return;
    const p = this.on && typeof G !== 'undefined' && G.started ? G.player : null;
    const t = p && [p.target, p.skillTarget, p.skillIntent && p.skillIntent.tgt].find(m => m && m.def && !m.dead && !m.isPlayer);
    if (!t || document.getElementById('hud').classList.contains('hud-min')) { if (!el.hidden) el.hidden = true; return; }
    const pct = Math.max(0, Math.ceil(t.hp / t.maxHp * 100)), er = typeof HuntRunes !== 'undefined' ? HuntRunes.targetTag(t) : '';
    // มอนธรรมดา: ชื่อ + เลือดเท่านั้น (เจ้าของ 2026-10-11) · บอส (MVP/Ancient): + Lv ธาตุ เผ่า
    const boss = !!(t.isMvp || t.isWB), hpN = `${U.fmt(Math.max(0, Math.round(t.hp)))} / ${U.fmt(t.maxHp)}`;
    const key = `${t.def.name}|${t.def.lv}|${pct}|${er}|${boss ? hpN : ''}`;
    if (el.dataset.k !== key) {
      el.dataset.k = key; el.innerHTML = '';
      if (boss) el.append(h('b', {}, t.def.name), h('span', {}, ` Lv ${t.def.lv} · `), h('em', {}, `${pct}% · ${hpN}`), er ? h('span', { class: 'hc-er' }, ` · ${er}`) : null);
      else el.append(h('b', {}, t.def.name), h('span', {}, ' · '), h('em', {}, `${pct}%`));
      el.classList.toggle('boss', !!(t.isMvp || t.isWB));
    }
    el.hidden = false;
    // พิกัดจอ: ใต้เท้ามอน (ตำแหน่งเดียวกับป้ายชื่อบนแคนวาส) — หลอด HP ของแคนวาสอยู่เหนือป้ายนี้พอดี
    const sx = (t.x * TILE - R.camX) * R.zoom, sy = (R.py(t.y * TILE) + 22 - R.camY) * R.zoom;
    const w = el.offsetWidth, x = U.clamp(sx - w / 2, 8, innerWidth - w - 8), y = U.clamp(sy, 8, innerHeight - 60);
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  },
};
window.addEventListener('load', () => setTimeout(() => { try { HudC.install(); } catch (e) { console.error(e); } }, 0));
