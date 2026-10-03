'use strict';
// ============================================================
//  Daily Ops (ภารกิจประจำวัน) + Streak (ล็อกอินเล่นต่อเนื่อง)
//  • ทุกวัน (วันที่ตามเครื่องผู้เล่น) ได้ 3 ภารกิจ สุ่มจากคลังตามช่วงเลเวล (ช่วงละ 5 เลเวล)
//    seed = วันที่ + ชื่อตัวละคร + ช่วงเลเวล → รีโหลด/เข้าใหม่วันเดียวกันได้ชุดเดิมเสมอ (และเก็บไว้ในเซฟด้วย)
//  • ทำครบ 3 ภารกิจ → เปิดหีบประจำวัน (Daily Cache) ได้ 1 ครั้ง • รางวัลตามบันได 7 วันของสตรีค (วันที่ 7 = ของหายาก)
//  • ขาดไป: ไม่รีเซ็ตทันที — สตรีคลด 2 วันต่อวันที่ขาด (พักสั้น ๆ เสียนิดเดียว พักยาวจึงกลับไปเริ่มใหม่)
//  • ปาร์ตี้: มอนที่ล่าตอนอยู่ในปาร์ตี้นับ ×2 ในภารกิจล่า
//  เก็บใน p.daily = { v, day, band, tasks: [{ t, mob?, map?, n, got }], claimed, streak, last, best, total }
//  ไฟล์นี้เกี่ยวเข้ากับเกมโดยห่อฟังก์ชันเดิม (Quest.onKill / onSkillUse / onEvent, UI.sell, pickUp, dropItemOnGround,
//  Quest.tick / renderTracker, UI.renderQuest) — ไม่แก้ไฟล์อื่น
// ============================================================
const DAILY_MIN_LV = 5;
const DAILY_DECAY = 2; // สตรีคที่หายไปต่อ 1 วันที่ขาด
const DAILY_ORES = ['refine_ore', 'oridecon', 'elunium', 'rough_oridecon', 'rough_elunium', 'forge_ore', 'mithril_ore', 'star_ore'];

const Daily = {
  now: () => Date.now(), // นาฬิกา (เทสต์แทนที่ได้)
  _day: '', _tickAt: 0, _greeted: false,

  // ---------- วันที่ ----------
  dayKey(t = this.now()) { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; },
  dayNum(key) { const [y, m, d] = String(key).split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); },
  gap(a, b) { return a && b ? this.dayNum(b) - this.dayNum(a) : Infinity; }, // จำนวนวันจาก a ถึง b
  msToReset() { const d = new Date(this.now()); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - d.getTime(); },

  open(p = G.player) { return !!p && p.baseLv >= DAILY_MIN_LV; },

  // ---------- สถานะ ----------
  state() {
    const p = G.player; if (!p || !this.open(p)) return null;
    let s = p.daily;
    if (!s || typeof s !== 'object' || Array.isArray(s)) s = p.daily = { v: 1, streak: 0, last: null, best: 0, total: 0 };
    s.streak = Math.max(0, Math.floor(+s.streak) || 0); s.best = Math.max(s.streak, Math.floor(+s.best) || 0); s.total = Math.floor(+s.total) || 0;
    const day = this.dayKey();
    if (s.day !== day || !this.validTasks(s.tasks)) {
      const fresh = s.day !== day;
      const band = fresh || !Number.isFinite(s.band) ? this.band(p.baseLv) : s.band;
      Object.assign(s, { v: 1, day, band, tasks: this.roll(day, p.name, band), claimed: fresh ? false : !!s.claimed });
    }
    return s;
  },
  validTasks(list) {
    return Array.isArray(list) && list.length === 3 && list.every(t => t && this.KINDS[t.t] && t.n > 0 && Number.isFinite(t.got) &&
      (t.t !== 'hunt' || MOBS[t.mob]) && (t.t !== 'map' || MAP_DEFS[t.map]));
  },
  band(lv) { return Math.floor(lv / 5); },
  // สตรีคที่จะเป็นถ้าเปิดหีบวันนี้ / ที่แสดงตอนนี้
  liveStreak(s = this.state()) {
    if (!s) return 0;
    const g = this.gap(s.last, s.day);
    if (g <= 1) return s.streak;
    return Math.max(0, s.streak - DAILY_DECAY * (g - 1));
  },
  nextStreak(s = this.state()) { return s.claimed ? s.streak : this.liveStreak(s) + 1; },
  ladderDay(streak) { return ((Math.max(1, streak) - 1) % 7) + 1; },
  missed(s = this.state()) { const g = this.gap(s.last, s.day); return s.last && g > 1 && !s.claimed ? g - 1 : 0; },

  // ---------- สุ่มภารกิจ (กำหนดได้ด้วยวันที่ + ชื่อ + ช่วงเลเวล) ----------
  hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0; return h; },
  huntMaps() { return Object.keys(MAP_DEFS).filter(m => (MAP_DEFS[m].spawns || []).some(s => MOBS[s[0]] && !MOBS[s[0]].boss && !MOBS[s[0]].dummy)); },
  mapOf(id) { return Object.keys(MAP_DEFS).find(m => (MAP_DEFS[m].spawns || []).some(s => s[0] === id)) || null; },
  mapLv(m) { const l = (MAP_DEFS[m].spawns || []).map(s => MOBS[s[0]]).filter(Boolean).map(d => d.lv); return l.length ? l.reduce((a, b) => a + b, 0) / l.length : 99; },
  roll(day, name, band) {
    const rnd = U.seeded(this.hash(`${day}|${name}|${band}`)), lv = band * 5 + 2;
    const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const r5 = v => Math.max(5, Math.round(v / 5) * 5);
    const mobs = Object.values(MOBS).filter(m => !m.boss && !m.dummy && !m.worldBoss && this.mapOf(m.id))
      .sort((a, b) => (Math.abs(a.lv - lv) - Math.abs(b.lv - lv)) || (a.lv - b.lv) || (a.id < b.id ? -1 : 1)).slice(0, 6);
    const maps = this.huntMaps().sort((a, b) => (Math.abs(this.mapLv(a) - lv) - Math.abs(this.mapLv(b) - lv)) || (a < b ? -1 : 1)).slice(0, 2);
    const make = {
      hunt: () => { const m = mobs[Math.floor(rnd() * mobs.length)]; return m && { t: 'hunt', mob: m.id, n: ri(3, 5) * 5 }; },
      map: () => { const m = maps[Math.floor(rnd() * maps.length)]; return m && { t: 'map', map: m, n: ri(6, 9) * 5 }; },
      skill: () => ({ t: 'skill', n: r5(ri(15, 25) + band * 2) }),
      loot: () => ({ t: 'loot', n: r5(ri(10, 16) + band) }),
      sell: () => ({ t: 'sell', n: r5((lv * 25 + 150) * (0.8 + rnd() * 0.4)) }),
      refine: () => ({ t: 'refine', n: 1 }),
      mvp: () => ({ t: 'mvp', n: 1 }),
    };
    // ช่อง 1: ล่าเสมอ • ช่อง 2–3: สุ่มถ่วงน้ำหนักจากชนิดที่เปิดตามเลเวล (ไม่ซ้ำชนิด)
    const first = rnd() < 0.6 ? 'hunt' : 'map';
    const out = [make[first]() || make.skill()];
    const pool = Object.entries(this.KINDS).filter(([k, d]) => k !== first && lv >= (d.minLv || 0) && (k !== 'map' || maps.length) && (k !== 'hunt' || mobs.length));
    while (out.length < 3 && pool.length) {
      const tot = pool.reduce((a, [, d]) => a + d.w, 0);
      let x = rnd() * tot, i = 0;
      while (i < pool.length - 1 && (x -= pool[i][1].w) >= 0) i++;
      const [k] = pool.splice(i, 1)[0], t = make[k]();
      if (t) out.push(t);
    }
    for (const t of out) t.got = 0;
    return out;
  },

  // ---------- ชนิดภารกิจ ----------
  KINDS: {
    hunt: { w: 3, ic: '⚔' },
    map: { w: 3, ic: '🗺' },
    skill: { w: 3, ic: '✦' },
    loot: { w: 3, ic: '◈' },
    sell: { w: 2, ic: '◎', minLv: 8 },
    refine: { w: 1.5, ic: '⚒', minLv: 14 },
    mvp: { w: 1.2, ic: '♛', minLv: 24 },
  },
  title(t) {
    const a = Math.min(t.got, t.n), b = t.n;
    switch (t.t) {
      case 'hunt': return L(`ล่า ${MOBS[t.mob].name} ${a}/${b}`, `Hunt ${MOBS[t.mob].name} ${a}/${b}`);
      case 'map': return L(`ปราบมอนสเตอร์ใน ${MAP_DEFS[t.map].name} ${a}/${b}`, `Defeat monsters in ${MAP_DEFS[t.map].name} ${a}/${b}`);
      case 'skill': return L(`ใช้สกิล ${a}/${b} ครั้ง`, `Use skills ${a}/${b} times`);
      case 'loot': return L(`เก็บของดรอปจากมอนสเตอร์ ${a}/${b} ชิ้น`, `Loot ${a}/${b} monster drops`);
      case 'sell': return L(`ขายของให้ร้านค้า ${U.fmt(a)}/${U.fmt(b)} ${CUR}`, `Earn ${U.fmt(a)}/${U.fmt(b)} ${CUR} selling to shops`);
      case 'refine': return L('ตีบวกอุปกรณ์สำเร็จ 1 ครั้งที่ Brokk Forge-Bot', 'Refine gear once at Brokk Forge-Bot');
      case 'mvp': return L('ปราบ MVP หรือร่วมล้ม World Boss', 'Defeat an MVP or help topple a World Boss');
    }
    return '';
  },
  sub(t) {
    switch (t.t) {
      case 'hunt': { const m = this.mapOf(t.mob); return (m ? MAP_DEFS[m].name + ' • ' : '') + L('ในปาร์ตี้นับ ×2', 'party kills count ×2'); }
      case 'map': return L(`Lv ${MAP_DEFS[t.map].level || '?'} • ในปาร์ตี้นับ ×2`, `Lv ${MAP_DEFS[t.map].level || '?'} • party kills count ×2`);
      case 'skill': return L('สกิลไหนก็ได้ (รวม First Aid)', 'Any skill counts (First Aid too)');
      case 'loot': return L('เก็บเองหรือ Auto Loot ก็ได้', 'Manual pickup or Auto Loot');
      case 'sell': return L('ขายที่ Tool / Weapon / Armor Dealer', 'Sell at the Tool / Weapon / Armor Dealer');
      case 'refine': return L('สวมอุปกรณ์ที่จะตีบวกก่อน', 'Equip the gear you want refined first');
      case 'mvp': return L('ตีโดน World Boss อย่างน้อย 1 ครั้งก่อนมันล้ม = นับ', 'Land at least one hit before a World Boss falls');
    }
    return '';
  },
  navTarget(t) {
    const npc = id => { for (const m in MAP_DEFS) { const n = (MAP_DEFS[m].npcs || []).find(x => x.id === id); if (n) return { kind: 'npc', map: m, x: n.x, y: n.y, name: n.name, npcId: n.id }; } return null; };
    const lv = G.player.baseLv;
    const near = () => { const m = this.huntMaps().sort((a, b) => Math.abs(this.mapLv(a) - lv) - Math.abs(this.mapLv(b) - lv))[0]; return m ? { kind: 'map', map: m, name: MAP_DEFS[m].name } : null; };
    switch (t.t) {
      case 'hunt': { const m = this.mapOf(t.mob); return m ? { kind: 'mob', map: m, mobId: t.mob, name: MOBS[t.mob].name } : null; }
      case 'map': return { kind: 'map', map: t.map, name: MAP_DEFS[t.map].name };
      case 'skill': case 'loot': return near();
      case 'sell': return npc('tool');
      case 'refine': return npc('refine');
      case 'mvp': {
        const m = Object.keys(MAP_DEFS).filter(k => MAP_DEFS[k].mvp && MOBS[MAP_DEFS[k].mvp]).sort((a, b) => Math.abs(MOBS[MAP_DEFS[a].mvp].lv - lv) - Math.abs(MOBS[MAP_DEFS[b].mvp].lv - lv))[0];
        return m ? { kind: 'mob', map: m, mobId: MAP_DEFS[m].mvp, name: MOBS[MAP_DEFS[m].mvp].name } : null;
      }
    }
    return null;
  },
  done(t) { return t.got >= t.n; },
  allDone(s = this.state()) { return !!s && s.tasks.every(t => this.done(t)); },
  left(s = this.state()) { return s ? s.tasks.filter(t => !this.done(t)).length : 0; },
  canClaim(s = this.state()) { return !!s && !s.claimed && this.allDone(s); },

  // ---------- ความคืบหน้า ----------
  bump(kind, amt = 1, match) {
    if (!G.started) return;
    const s = this.state(); if (!s) return;
    let hit = false;
    for (const t of s.tasks) {
      if (t.t !== kind || this.done(t) || (match && !match(t))) continue;
      const was = t.got; t.got = Math.min(t.n, t.got + amt); hit = hit || t.got !== was;
      if (this.done(t)) this.onTaskDone(t, s);
    }
    if (hit) this.changed();
  },
  onTaskDone(t, s) {
    const p = G.player;
    UI.msg(L(`☀ ภารกิจประจำวันสำเร็จ: ${this.title(t)}`, `☀ Daily op complete: ${this.title(t)}`), 'lvl');
    addFloater(p.x, p.y - 1.8, 'DAILY ✓', '#ffe08a', true);
    Sound.play('quest_new');
    if (this.allDone(s) && !s.claimed) {
      setTimeout(() => { if (G.started) UI.announce(L('🎁 ทำภารกิจประจำวันครบแล้ว — เปิดหีบได้ที่สมุดเควสต์ (J)', '🎁 All daily ops done — open your Daily Cache in the Quest Log (J)')); }, 600);
    }
    saveGame();
  },
  partyMul() { return typeof Party !== 'undefined' && Party.party && Party.party.members && Party.party.members.size > 0 ? 2 : 1; },
  onKill(id) {
    const d = MOBS[id]; if (!d || d.dummy) return;
    if (d.boss || d.worldBoss) this.bump('mvp', 1);
    const k = this.partyMul();
    this.bump('hunt', k, t => t.mob === id);
    if (G.map) this.bump('map', k, t => t.map === G.map.id);
  },

  // ---------- หีบประจำวัน ----------
  ore() { return DAILY_ORES.find(id => ITEMS[id]) || Object.keys(ITEMS).find(id => ITEMS[id].type !== 'weapon' && ITEMS[id].type !== 'armor' && /(^|_)(ore|oridecon|elunium)($|_)/.test(id)) || null; },
  rewards(streak, p = G.player) {
    const day = this.ladderDay(streak), week = Math.floor((Math.max(1, streak) - 1) / 7), lv = p.baseLv;
    const mul = [1, 1.2, 1.4, 1.6, 1.8, 2.2, 3][day - 1] * (1 + Math.min(0.5, week * 0.1)); // ทุกสัปดาห์ที่ต่อเนื่อง +10% (สูงสุด +50%)
    const pct = [0.03, 0.035, 0.04, 0.045, 0.05, 0.06, 0.08][day - 1];
    const zeny = Math.round((200 + lv * 25) * mul / 10) * 10;
    const bexp = lv >= MAX_BASE_LV ? 0 : Math.max(10, Math.round(baseExpNeed(lv) * pct));
    const jmax = JOBS[p.job] ? JOBS[p.job].jobMax : 0;
    const jexp = p.jobLv >= jmax ? 0 : Math.max(5, Math.round(jobExpNeed(p.job, p.jobLv) * pct));
    const ITEMS_BY_DAY = [
      [['orange_potion', 5]],
      [['orange_potion', 5], ['blink_feather', 3]],
      [['ORE', 1], ['yellow_potion', 3]],
      [['yellow_potion', 3], ['blue_potion', 1]],
      [['ORE', 2], ['white_potion', 2]],
      [['white_potion', 3], ['hearth_rune', 2], ['blue_potion', 1]],
      [['yggdrasil_shard', 1], ['ORE', 3], ['white_potion', 5], ['blue_potion', 2]],
    ][day - 1];
    const ore = this.ore();
    const items = []; let extra = 0;
    for (const [id0, n] of ITEMS_BY_DAY) {
      const id = id0 === 'ORE' ? ore : id0;
      if (id && ITEMS[id]) items.push([id, n]);
      else extra += 600 * n; // ไม่มีไอเทมนี้ในเกม (เช่นแร่ตีบวกยังไม่มี) → แปลงเป็น Volt แทน
    }
    return { day, rare: day === 7, zeny: zeny + extra, bexp, jexp, items };
  },
  claim() {
    const s = this.state(), p = G.player;
    if (!this.canClaim(s)) return null;
    const streak = this.liveStreak(s) + 1;
    const r = this.rewards(streak);
    s.claimed = true; s.streak = streak; s.last = s.day; s.best = Math.max(s.best || 0, streak); s.total = (s.total || 0) + 1;
    p.zeny += r.zeny;
    for (const [id, n] of r.items) addItem(id, n, true);
    if (r.bexp || r.jexp) gainExp(r.bexp, r.jexp);
    addFloater(p.x, p.y - 1.8, r.rare ? 'RARE CACHE!' : 'DAILY CACHE!', '#ffd34a', true);
    addFx({ type: 'buff', ref: p, dur: 1.2 });
    Sound.play(r.rare ? 'refine_ok' : 'quest');
    const list = [`${U.fmt(r.zeny)} ${CUR}`, ...r.items.map(([id, n]) => `${ITEMS[id].name} ×${n}`), r.bexp ? `${U.fmt(r.bexp)} Base EXP` : '', r.jexp ? `${U.fmt(r.jexp)} Job EXP` : ''].filter(Boolean).join(' • ');
    UI.msg(L(`🎁 หีบประจำวัน (สตรีค ${streak} วัน): ${list}`, `🎁 Daily Cache (${streak}-day streak): ${list}`), 'lvl');
    this.changed(); saveGame();
    return Object.assign({ streak }, r);
  },

  changed() { if (typeof Quest !== 'undefined') Quest.dirty = true; UI.dirty(); this.badge(); },

  // ---------- เรียกทุกเฟรม (ผ่าน Quest.tick) ----------
  tick() {
    if (!G.started || !G.player) return;
    const t = performance.now(); if (t < this._tickAt) return;
    this._tickAt = t + 1000;
    if (this._p !== G.player) { this._p = G.player; this._greeted = false; this._day = ''; if (this.chipEl) this.chipEl.dataset.key = ''; } // เปลี่ยนตัวละคร
    const s = this.state(), day = this.dayKey();
    if (s && this._day && this._day !== day) { UI.msg(L('☀ วันใหม่แล้ว — ภารกิจประจำวันชุดใหม่มาแล้ว (J → ประจำวัน)', '☀ A new day — fresh daily ops are in (J → Daily)'), 'info'); this.changed(); }
    if (s && !this._greeted) {
      this._greeted = true;
      if (!s.claimed) UI.msg(this.missed(s) ? L(`☀ ภารกิจประจำวันพร้อมแล้ว — ขาดไป ${this.missed(s)} วัน สตรีคลดเหลือ ${this.liveStreak(s)} (เปิดหีบวันนี้เพื่อต่อสตรีค)`, `☀ Daily ops are ready — you missed ${this.missed(s)} day(s), streak eased to ${this.liveStreak(s)} (claim today's cache to keep it going)`)
        : L(`☀ ภารกิจประจำวันพร้อมแล้ว — สตรีค ${this.liveStreak(s)} วัน (กด J → ประจำวัน)`, `☀ Daily ops are ready — ${this.liveStreak(s)}-day streak (press J → Daily)`), 'info');
    }
    this._day = s ? day : '';
    this.badge();
    if (UI.questTab === 'daily' && UI.isOpen('w-quest')) UI.renderQuest();
  },

  // ---------- ป้ายบนเมนู + แถบติดตาม ----------
  badgeText() {
    const s = this.state(); if (!s || s.claimed) return '';
    return this.allDone(s) ? '!' : String(this.left(s));
  },
  badge() {
    const txt = G.started ? this.badgeText() : '';
    const btn = document.querySelector('#menubar button[data-win="w-quest"]');
    if (btn) {
      let b = btn.querySelector('.dl-badge');
      if (!b) { b = h('i', { class: 'dl-badge' }); btn.append(b); }
      if (b.textContent !== txt) b.textContent = txt;
      b.hidden = !txt; b.classList.toggle('ready', txt === '!');
    }
    const mf = document.querySelector('#menubar .menu-fold');
    if (mf) mf.classList.toggle('dl-dot', !!txt);
  },
  chipEl: null,
  renderChip() {
    const el = document.getElementById('quest-track'); if (!el || !G.player) return;
    const s = this.state(), off = G.player.options.questTrack === false;
    if (!s || off) { if (this.chipEl) this.chipEl.remove(); return; }
    if (!this.chipEl) {
      this.chipEl = h('button', { type: 'button', class: 'dl-chip', onclick: e => { e.stopPropagation(); this.openTab(); } });
    }
    const c = this.chipEl, live = s.claimed ? s.streak : this.liveStreak(s);
    const key = `${s.day}|${s.tasks.map(t => t.got).join(',')}|${s.claimed}|${live}`;
    if (c.dataset.key !== key) {
      c.dataset.key = key; c.innerHTML = '';
      const doneN = s.tasks.filter(t => this.done(t)).length;
      c.classList.toggle('ready', this.canClaim(s)); c.classList.toggle('claimed', s.claimed);
      c.append(h('span', { class: 'dl-chip-k' }, L('ประจำวัน', 'DAILY')),
        h('span', { class: 'dl-chip-v' }, s.claimed ? L('✓ ครบแล้ว', '✓ Done') : this.canClaim(s) ? L('🎁 เปิดหีบ', '🎁 Open cache') : `${doneN}/3`),
        live > 0 ? h('span', { class: 'dl-chip-s' }, `🔥${live}`) : null);
      c.title = L('ภารกิจประจำวัน — แตะเพื่อดู', 'Daily ops — tap to view');
    }
    if (!Quest.current()) { // จบเนื้อเรื่องแล้ว: แถบติดตามแสดงแค่ภารกิจประจำวัน
      el.hidden = false; el.dataset.ch = L('ภารกิจประจำวัน', 'DAILY OPS'); el.dataset.key = '';
      for (const x of [...el.children]) if (x !== c) x.remove();
    }
    if (c.parentNode !== el) el.append(c);
  },
  openTab() { UI.questTab = 'daily'; const b = document.querySelector('#w-quest .win-body'); if (b) b.dataset.dk = ''; UI.open('w-quest'); UI.renderQuest(); },

  // ---------- แท็บในหน้าต่างเควสต์ ----------
  tabs() {
    const s = this.state(), txt = this.badgeText();
    const tab = (k, label, extra) => h('button', { type: 'button', class: 'tab' + ((UI.questTab || 'story') === k ? ' on' : ''), 'data-qtab': k,
      onclick: () => { UI.questTab = k; const b = document.querySelector('#w-quest .win-body'); b.dataset.key = ''; b.dataset.dk = ''; UI.renderQuest(); Sound.play('click'); } }, label, extra);
    return h('div', { class: 'tabs dl-tabs' }, tab('story', 'Story'),
      tab('daily', 'Daily', s && txt ? h('i', { class: 'dl-tab-badge' + (txt === '!' ? ' ready' : '') }, txt) : null));
  },
  render(body) {
    const s = this.state(), p = G.player;
    const left = Math.ceil(this.msToReset() / 60000);
    const key = s ? `${s.day}|${s.tasks.map(t => t.got).join(',')}|${s.claimed}|${s.streak}|${left}|${p.baseLv}` : `locked|${p.baseLv}`;
    if (body.dataset.dk === key) return;
    body.dataset.dk = key; body.dataset.key = ''; body.innerHTML = '';
    body.append(this.tabs());
    if (!s) {
      body.append(h('div', { class: 'q-card dl-locked' }, h('h4', {}, L('☀ ภารกิจประจำวัน', '☀ Daily Ops')),
        h('p', {}, L(`เปิดที่ Base Lv ${DAILY_MIN_LV} — ทุกวันจะได้ 3 ภารกิจตามเลเวล ทำครบเปิดหีบรางวัล เล่นต่อเนื่องทุกวันรางวัลยิ่งดี (วันที่ 7 ได้ของหายาก)`,
          `Unlocks at Base Lv ${DAILY_MIN_LV} — 3 level-based ops every day. Finish all 3 to open a reward cache; play on consecutive days for better rewards (day 7 holds a rare prize).`))));
      return;
    }
    const live = s.claimed ? s.streak : this.liveStreak(s), next = this.nextStreak(s), today = this.ladderDay(next);
    const hh = Math.floor(left / 60), mm = left % 60;
    // หัว: สตรีค + บันได 7 วัน
    const pips = [];
    const filled = s.claimed ? this.ladderDay(s.streak) : this.ladderDay(next) - 1; // ช่องที่ได้แล้วในรอบสัปดาห์นี้
    for (let d = 1; d <= 7; d++) {
      const cls = 'dl-pip' + (d <= filled ? ' got' : '') + (!s.claimed && d === today ? ' today' : '') + (d === 7 ? ' rare' : '');
      pips.push(h('div', { class: cls, title: L(`วันที่ ${d}`, `Day ${d}`) }, h('b', {}, d === 7 ? '★' : String(d)), h('small', {}, L(`วัน ${d}`, `Day ${d}`))));
    }
    const miss = this.missed(s);
    body.append(h('div', { class: 'dl-head' },
      h('div', { class: 'dl-streak' }, h('span', { class: 'dl-flame' + (live > 0 ? ' lit' : '') }, '🔥'),
        h('div', {}, h('b', {}, L(`สตรีค ${live} วัน`, `${live}-day streak`)), h('small', {}, L(`ดีที่สุด ${s.best || 0} • เปิดไปแล้ว ${s.total || 0} หีบ`, `Best ${s.best || 0} • ${s.total || 0} caches opened`)))),
      h('div', { class: 'dl-ladder' }, ...pips),
      miss ? h('div', { class: 'dl-warn' }, L(`ขาดไป ${miss} วัน — สตรีคลด ${Math.min(s.streak, miss * DAILY_DECAY)} (เหลือ ${live}) ทำให้ครบวันนี้เพื่อไปต่อ`, `Missed ${miss} day(s) — streak eased by ${Math.min(s.streak, miss * DAILY_DECAY)} (now ${live}). Finish today to keep climbing.`)) : null,
      h('div', { class: 'dl-reset' }, L(`ภารกิจใหม่ในอีก ${hh} ชม. ${mm} นาที`, `New ops in ${hh}h ${mm}m`))));
    // ภารกิจ 3 อย่าง
    for (const t of s.tasks) {
      const ok = this.done(t), nav = !ok && this.navTarget(t);
      body.append(h('div', { class: 'dl-task' + (ok ? ' done' : '') },
        h('div', { class: 'dl-ic' }, ok ? '✓' : this.KINDS[t.t].ic),
        h('div', { class: 'dl-main' }, h('div', { class: 'dl-t' }, this.title(t)), h('div', { class: 'dl-sub' }, this.sub(t)),
          h('div', { class: 'dl-bar' }, h('i', { style: `width:${Math.round(Math.min(t.got, t.n) / t.n * 100)}%` }))),
        nav ? h('button', { type: 'button', class: 'btn small dl-go', title: 'Navigate', onclick: () => { Nav.goTo(nav); UI.close('w-quest'); } }, L('🧭 ไป', '🧭 Go')) : null));
    }
    // หีบ
    const r = this.rewards(s.claimed ? s.streak : next);
    const chips = [h('span', { class: 'dl-rw' }, `${U.fmt(r.zeny)} ${CUR}`), ...r.items.map(([id, n]) => h('span', { class: 'dl-rw' + (id === 'yggdrasil_shard' ? ' rare' : '') }, h('img', { src: itemIconUrl(id), alt: '' }), `${ITEMS[id].name} ×${n}`)),
      r.bexp ? h('span', { class: 'dl-rw' }, `${U.fmt(r.bexp)} Base EXP`) : null, r.jexp ? h('span', { class: 'dl-rw' }, `${U.fmt(r.jexp)} Job EXP`) : null];
    const can = this.canClaim(s);
    body.append(h('div', { class: 'dl-chest' + (can ? ' ready' : '') + (s.claimed ? ' claimed' : '') + (r.rare ? ' rare' : '') },
      h('div', { class: 'dl-chest-h' }, h('span', { class: 'dl-chest-ic' }, r.rare ? '💎' : '🎁'),
        h('b', {}, s.claimed ? L('รับหีบวันนี้แล้ว', "Today's cache claimed") : L(`หีบวันที่ ${r.day}${r.rare ? ' — ของหายาก!' : ''}`, `Day ${r.day} cache${r.rare ? ' — rare!' : ''}`))),
      h('div', { class: 'dl-rws' }, ...chips),
      s.claimed ? h('div', { class: 'dl-note' }, L(`กลับมาพรุ่งนี้เพื่อต่อสตรีคเป็น ${s.streak + 1} วัน`, `Come back tomorrow to extend your streak to ${s.streak + 1}`))
        : h('button', { type: 'button', class: 'btn big dl-claim', disabled: !can, onclick: () => { const res = this.claim(); if (res) this.reveal(res); } },
          can ? L('เปิดหีบ', 'Open cache') : L(`ทำภารกิจอีก ${this.left(s)} อย่าง`, `${this.left(s)} op(s) to go`))));
    body.append(h('div', { class: 'hint dl-hint' }, L(`ขาด 1 วัน สตรีคลด ${DAILY_DECAY} วัน (ไม่รีเซ็ตทันที) • ทุกสัปดาห์ที่ต่อเนื่อง ${CUR} +10% • ภารกิจตามช่วงเลเวลตอนเริ่มวัน`,
      `Missing a day costs ${DAILY_DECAY} streak days (no instant reset) • each full week adds +10% ${CUR} • ops are set by your level at the start of the day`)));
  },

  // ---------- ฉากเปิดหีบ ----------
  reveal(r) {
    const old = document.getElementById('dl-reveal'); if (old) old.remove();
    const rows = [['$z', `${U.fmt(r.zeny)} ${CUR}`], ...r.items.map(([id, n]) => [id, `${ITEMS[id].name} ×${n}`])];
    if (r.bexp) rows.push(['$b', `${U.fmt(r.bexp)} Base EXP`]);
    if (r.jexp) rows.push(['$j', `${U.fmt(r.jexp)} Job EXP`]);
    const close = () => { ov.classList.add('out'); setTimeout(() => ov.remove(), 220); };
    const chest = h('div', { class: 'dl-rv-chest', html: `<svg viewBox="0 0 120 100" aria-hidden="true">
      <defs><linearGradient id="dlc-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a5878"/><stop offset="1" stop-color="#16243a"/></linearGradient>
      <linearGradient id="dlc-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1c8"/><stop offset="1" stop-color="#e2b85a"/></linearGradient></defs>
      <rect x="18" y="46" width="84" height="46" rx="8" fill="url(#dlc-b)" stroke="#6ff3ff" stroke-opacity=".55"/>
      <rect x="54" y="46" width="12" height="46" fill="url(#dlc-g)"/><rect x="18" y="62" width="84" height="5" fill="url(#dlc-g)" opacity=".7"/>
      <g class="dl-rv-lid"><path d="M16 48 Q16 22 60 22 Q104 22 104 48 Z" fill="url(#dlc-b)" stroke="#6ff3ff" stroke-opacity=".55"/><rect x="54" y="22" width="12" height="26" fill="url(#dlc-g)"/></g>
      <circle cx="60" cy="56" r="6" fill="#6ff3ff"/></svg>` });
    const ov = h('div', { id: 'dl-reveal', class: r.rare ? 'rare' : '', role: 'dialog', 'aria-label': L('หีบประจำวัน', 'Daily cache'), onclick: e => { if (e.target === ov) close(); } },
      h('div', { class: 'dl-rv-card' },
        h('div', { class: 'dl-rv-rays' }), chest,
        h('div', { class: 'dl-rv-k' }, r.rare ? L('หีบหายาก', 'RARE CACHE') : L(`หีบวันที่ ${r.day}`, `DAY ${r.day} CACHE`)),
        h('div', { class: 'dl-rv-t' }, L(`🔥 สตรีค ${r.streak} วัน`, `🔥 ${r.streak}-day streak`)),
        h('div', { class: 'dl-rv-items' }, ...rows.map(([id, txt], i) => h('div', { class: 'dl-rv-it' + (id === 'yggdrasil_shard' ? ' rare' : ''), style: `animation-delay:${0.55 + i * 0.12}s` },
          ITEMS[id] ? h('img', { src: itemIconUrl(id), alt: '' }) : h('span', { class: 'dl-rv-dot ' + id.slice(1) }), h('span', {}, txt)))),
        h('button', { type: 'button', class: 'btn big', onclick: close }, 'Collect')));
    document.body.append(ov);
  },
};

// ---------- สไตล์ (โทน Visor: กระจกฝ้า มุมโค้ง ฟ้า/ทอง) ----------
(() => {
  const css = `
#menubar button .dl-badge { position: absolute; right: -3px; top: -3px; min-width: 16px; height: 16px; padding: 0 4px; border-radius: var(--rad-pill, 4px); font: 700 10px/16px var(--mono, monospace); font-style: normal; color: #04121f; background: #6ff3ff; box-shadow: 0 0 10px rgba(111, 243, 255, .7); pointer-events: none; z-index: 2; }
#menubar button .dl-badge.ready { background: #ffd34a; box-shadow: 0 0 12px rgba(255, 211, 74, .8); animation: dl-pulse 1.4s ease-in-out infinite; }
#menubar .menu-fold.dl-dot { position: relative; }
#menubar .menu-fold.dl-dot::after { content: ""; position: absolute; right: 4px; top: 4px; width: 8px; height: 8px; border-radius: 50%; background: #ffd34a; box-shadow: 0 0 8px #ffd34a; }
#menubar:not(.folded) .menu-fold.dl-dot::after { display: none; }
.dl-chip { display: inline-flex; align-items: center; gap: 6px; margin-top: 5px; padding: 3px 10px 3px 8px; border-radius: var(--rad-pill, 4px); border: 1px solid rgba(255, 224, 138, .45); background: rgba(10, 16, 26, .55); color: #f4f7fb; font: 500 11.5px var(--font, sans-serif); cursor: pointer; text-shadow: none; pointer-events: auto; }
.dl-chip:hover { border-color: #ffe08a; background: rgba(255, 224, 138, .14); }
.dl-chip-k { font: 600 9.5px var(--mono, monospace); letter-spacing: .14em; color: #ffe08a; }
.dl-chip-v { font-family: var(--mono, monospace); }
.dl-chip-s { color: #ffb070; font-family: var(--mono, monospace); }
.dl-chip.ready { border-color: #ffd34a; box-shadow: 0 0 14px -2px rgba(255, 211, 74, .6); animation: dl-pulse 1.6s ease-in-out infinite; }
.dl-chip.claimed { opacity: .7; border-color: rgba(255, 255, 255, .16); }
.pad-mode #quest-track .dl-chip { padding: 2px 8px; gap: 4px; }
.dl-tabs { margin-bottom: 10px; }
.dl-tabs .tab { position: relative; }
.dl-tab-badge { display: inline-block; min-width: 16px; margin-left: 6px; padding: 0 4px; border-radius: var(--rad-pill, 4px); font: 700 10px/16px var(--mono, monospace); font-style: normal; color: #04121f; background: #6ff3ff; vertical-align: 1px; }
.dl-tab-badge.ready { background: #ffd34a; }
.dl-head { padding: 12px; border-radius: 14px; background: var(--fill, rgba(255,255,255,.06)); border: 1px solid var(--edge, rgba(255,255,255,.1)); margin-bottom: 8px; }
.dl-streak { display: flex; align-items: center; gap: 10px; }
.dl-streak b { display: block; font: 600 16px var(--display, sans-serif); color: #f4f7fb; }
.dl-streak small { font: 500 11px var(--mono, monospace); color: var(--ink-faint, #8a98aa); }
.dl-flame { font-size: 26px; filter: grayscale(1) opacity(.45); }
.dl-flame.lit { filter: drop-shadow(0 0 8px rgba(255, 140, 60, .7)); }
.dl-ladder { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; margin: 10px 0 6px; }
.dl-pip { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 0 4px; border-radius: 12px; background: rgba(255, 255, 255, .04); border: 1px solid rgba(255, 255, 255, .08); }
.dl-pip b { font: 600 13px var(--mono, monospace); color: var(--ink-dim, #c6d0dc); }
.dl-pip small { font: 500 8.5px var(--mono, monospace); color: var(--ink-faint, #8a98aa); letter-spacing: .04em; white-space: nowrap; }
.dl-pip.got { background: rgba(111, 243, 255, .16); border-color: rgba(111, 243, 255, .45); }
.dl-pip.got b { color: #6ff3ff; }
.dl-pip.today { border-color: #ffe08a; box-shadow: 0 0 0 2px rgba(255, 224, 138, .18), 0 0 16px -4px rgba(255, 224, 138, .7); }
.dl-pip.today b { color: #ffe08a; }
.dl-pip.rare b { color: #ffd34a; }
.dl-pip.rare.got { background: rgba(255, 211, 74, .2); border-color: rgba(255, 211, 74, .6); }
.dl-warn { margin: 4px 0; padding: 6px 10px; border-radius: 10px; font-size: 12px; color: #ffcf9a; background: rgba(255, 150, 60, .1); border: 1px solid rgba(255, 150, 60, .3); }
.dl-reset { font: 500 11px var(--mono, monospace); color: var(--ink-faint, #8a98aa); text-align: right; }
.dl-task { display: flex; align-items: center; gap: 10px; padding: 10px 12px; margin-bottom: 6px; border-radius: 14px; background: var(--fill, rgba(255,255,255,.06)); border: 1px solid var(--edge, rgba(255,255,255,.1)); }
.dl-task.done { border-color: rgba(111, 243, 255, .35); background: rgba(111, 243, 255, .07); }
.dl-ic { flex: 0 0 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; font-size: 16px; color: #6ff3ff; background: rgba(111, 243, 255, .1); border: 1px solid rgba(111, 243, 255, .3); }
.dl-task.done .dl-ic { color: #04121f; background: #6ff3ff; font-weight: 700; }
.dl-main { flex: 1; min-width: 0; }
.dl-t { font-weight: 600; font-size: 13.5px; color: #f4f7fb; }
.dl-task.done .dl-t { color: var(--ink-dim, #c6d0dc); }
.dl-sub { font-size: 11.5px; color: var(--ink-faint, #8a98aa); margin-top: 1px; }
.dl-bar { height: 4px; margin-top: 6px; border-radius: var(--rad-pill, 4px); background: rgba(255, 255, 255, .1); overflow: hidden; }
.dl-bar i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #38b9d2, #6ff3ff); transition: width .3s; }
.dl-task.done .dl-bar i { background: linear-gradient(90deg, #6ff3ff, #ffe08a); }
.dl-go { flex: 0 0 auto; white-space: nowrap; }
.dl-chest { margin-top: 8px; padding: 12px; border-radius: 16px; background: linear-gradient(160deg, rgba(255, 224, 138, .08), rgba(255, 255, 255, .03)); border: 1px solid rgba(255, 224, 138, .28); text-align: center; }
.dl-chest.ready { border-color: rgba(255, 211, 74, .7); box-shadow: 0 0 26px -8px rgba(255, 211, 74, .6); }
.dl-chest.claimed { opacity: .8; }
.dl-chest-h { display: flex; align-items: center; justify-content: center; gap: 8px; }
.dl-chest-h b { font: 600 14.5px var(--display, sans-serif); color: #ffe08a; }
.dl-chest-ic { font-size: 20px; }
.dl-rws { display: flex; flex-wrap: wrap; justify-content: center; gap: 5px; margin: 9px 0 10px; }
.dl-rw { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: var(--rad-pill, 4px); font-size: 11.5px; color: #f4f7fb; background: rgba(255, 255, 255, .07); border: 1px solid rgba(255, 255, 255, .12); }
.dl-rw img { width: 16px; height: 16px; image-rendering: auto; }
.dl-rw.rare { color: #ffe08a; border-color: rgba(255, 211, 74, .55); background: rgba(255, 211, 74, .12); }
.dl-claim { width: 100%; min-height: 42px; }
.dl-claim:disabled { opacity: .55; cursor: default; filter: grayscale(.6); }
body.visor .btn.big.dl-claim:not(:disabled) { color: #2a1d05; background: linear-gradient(180deg, #fff1c8, #f2d48a); border-color: rgba(255, 255, 255, .45); }
.dl-note { font-size: 12px; color: var(--ink-dim, #c6d0dc); }
.dl-hint { margin-top: 8px; font-size: 11px; color: var(--ink-faint, #8a98aa); line-height: 1.5; }
#dl-reveal { position: fixed; inset: 0; z-index: 4000; display: grid; place-items: center; padding: 16px; background: radial-gradient(ellipse at 50% 45%, rgba(20, 32, 52, .55), rgba(4, 6, 10, .85) 70%); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); animation: dl-fade .25s ease-out; }
#dl-reveal.out { opacity: 0; transition: opacity .2s; }
.dl-rv-card { position: relative; width: min(340px, 100%); padding: 18px 18px 18px; border-radius: 24px; text-align: center; overflow: hidden; background: linear-gradient(160deg, rgba(18, 28, 44, .92), rgba(8, 12, 20, .9)); border: 1px solid rgba(255, 224, 138, .35); box-shadow: 0 30px 60px -20px rgba(0, 0, 0, .8), 0 0 40px -10px rgba(255, 224, 138, .35); color: #f4f7fb; font-family: var(--font, sans-serif); animation: dl-pop .45s cubic-bezier(.2, 1.4, .4, 1); }
.dl-rv-card > * { position: relative; }
.dl-rv-rays { position: absolute; left: 50%; top: 70px; width: 420px; height: 420px; margin: -210px 0 0 -210px; border-radius: 50%; background: repeating-conic-gradient(rgba(255, 224, 138, .16) 0 8deg, transparent 8deg 22deg); -webkit-mask: radial-gradient(circle, #000 20%, transparent 62%); mask: radial-gradient(circle, #000 20%, transparent 62%); animation: dl-spin 14s linear infinite; pointer-events: none; }
#dl-reveal.rare .dl-rv-rays { background: repeating-conic-gradient(rgba(150, 120, 255, .22) 0 8deg, rgba(255, 211, 74, .12) 8deg 14deg, transparent 14deg 22deg); }
.dl-rv-chest { width: 120px; height: 100px; margin: 4px auto 6px; filter: drop-shadow(0 0 18px rgba(111, 243, 255, .45)); animation: dl-shake .5s ease-in-out .05s 1; }
.dl-rv-chest svg { width: 100%; height: 100%; overflow: visible; }
.dl-rv-lid { transform-box: fill-box; transform-origin: 0% 100%; animation: dl-lid .5s cubic-bezier(.3, 1.6, .5, 1) .45s both; }
.dl-rv-k { font: 600 11px var(--mono, monospace); letter-spacing: .24em; color: #ffe08a; }
#dl-reveal.rare .dl-rv-k { color: #d8c4ff; }
.dl-rv-t { font: 600 20px var(--display, sans-serif); margin: 2px 0 10px; }
.dl-rv-items { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.dl-rv-it { display: flex; align-items: center; gap: 10px; padding: 7px 12px; border-radius: 12px; background: rgba(255, 255, 255, .06); border: 1px solid rgba(255, 255, 255, .1); font-size: 13.5px; text-align: left; opacity: 0; animation: dl-rise .4s ease-out both; }
.dl-rv-it img { width: 26px; height: 26px; }
.dl-rv-it.rare { border-color: rgba(255, 211, 74, .7); background: rgba(255, 211, 74, .14); color: #ffe08a; box-shadow: 0 0 18px -6px rgba(255, 211, 74, .7); }
.dl-rv-dot { width: 26px; height: 26px; border-radius: 50%; flex: 0 0 26px; background: radial-gradient(circle at 35% 35%, #fff6d0, #e2b85a 60%, #8a6420); box-shadow: 0 0 10px rgba(255, 211, 74, .5); }
.dl-rv-dot.b { background: radial-gradient(circle at 35% 35%, #fff6d8, #ffe08a 55%, #a07a20); box-shadow: 0 0 10px rgba(255, 224, 138, .5); }
.dl-rv-dot.j { background: radial-gradient(circle at 35% 35%, #f2eaff, #c9b0ff 55%, #5a3aa0); box-shadow: 0 0 10px rgba(201, 176, 255, .5); }
.dl-rv-dot.b::after, .dl-rv-dot.j::after { content: "XP"; display: grid; place-items: center; height: 100%; font: 700 9px var(--mono, monospace); color: #1a1430; }
.dl-rv-card .btn.big { min-width: 60%; min-height: 44px; }
@keyframes dl-pulse { 50% { filter: brightness(1.25); } }
@keyframes dl-fade { from { opacity: 0; } }
@keyframes dl-pop { from { transform: scale(.7) translateY(30px); opacity: 0; } }
@keyframes dl-spin { to { transform: rotate(360deg); } }
@keyframes dl-shake { 25% { transform: rotate(-6deg); } 50% { transform: rotate(5deg); } 75% { transform: rotate(-3deg); } }
@keyframes dl-lid { to { transform: rotate(-28deg) translate(-6px, -10px); } }
@keyframes dl-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@media (max-width: 420px) { .dl-pip small { display: none; } .dl-pip { padding: 7px 0; } .dl-task { padding: 9px 10px; gap: 8px; } .dl-ic { flex-basis: 30px; height: 30px; } }
@media (prefers-reduced-motion: reduce) { .dl-rv-rays, .dl-chip.ready, #menubar button .dl-badge.ready, .dl-rv-card, .dl-rv-chest, .dl-rv-lid { animation: none; } .dl-rv-it { animation-duration: .01s; } }
`;
  const st = document.createElement('style'); st.id = 'daily-css'; st.textContent = css; document.head.append(st);
})();

// ---------- เกี่ยวเข้ากับเกม (ห่อฟังก์ชันเดิม หลังโหลดสคริปต์ทั้งหมด) ----------
(() => {
  const wrap = (obj, key, after) => {
    const f = obj[key]; if (typeof f !== 'function') return;
    obj[key] = function (...a) { const r = f.apply(this, a); try { after.apply(this, [r, ...a]); } catch (e) { console.error(e); } return r; };
  };
  const install = () => {
    wrap(Quest, 'onKill', (r, id) => Daily.onKill(id));
    wrap(Quest, 'onSkillUse', () => Daily.bump('skill', 1));
    wrap(Quest, 'onEvent', (r, ev) => { if (ev === 'refine') Daily.bump('refine', 1); });
    wrap(Quest, 'tick', () => Daily.tick());
    wrap(Quest, 'renderTracker', () => Daily.renderChip());
    // ขายของ: นับจาก Volt ที่ได้จริง
    const sell0 = UI.sell;
    if (typeof sell0 === 'function') UI.sell = function (...a) { const z = G.player ? G.player.zeny : 0; const r = sell0.apply(this, a); try { const d = G.player.zeny - z; if (d > 0) Daily.bump('sell', d); } catch (e) { console.error(e); } return r; };
    // เก็บของดรอป: เก็บเอง (pickUp) หรือ Auto Loot (dropItemOnGround แล้วไม่ตกพื้น)
    if (typeof pickUp === 'function') { const f = pickUp; pickUp = function (drop) { const n = G.drops.length; const r = f.apply(this, arguments); if (G.drops.length < n) Daily.bump('loot', (drop && drop.qty) || 1); return r; }; }
    if (typeof dropItemOnGround === 'function') { const f = dropItemOnGround; dropItemOnGround = function (id, x, y, qty = 1) { const n = G.drops.length; const r = f.apply(this, arguments); if (G.drops.length === n && G.player && G.player.options.autoLoot) Daily.bump('loot', qty || 1); return r; }; }
    // หน้าต่างเควสต์: แท็บ เนื้อเรื่อง / ประจำวัน
    const rq0 = UI.renderQuest;
    UI.renderQuest = function (...a) {
      const body = document.querySelector('#w-quest .win-body');
      if (!body || !G.player) return rq0.apply(this, a);
      if (this.questTab === undefined) this.questTab = !Quest.current() && Daily.open() ? 'daily' : 'story'; // จบเนื้อเรื่องแล้ว → เปิดแท็บประจำวันก่อน
      if (this.questTab === 'daily') return Daily.render(body);
      if (body.dataset.dk) { body.dataset.dk = ''; body.dataset.key = ''; }
      const r = rq0.apply(this, a);
      const old = body.querySelector(':scope > .dl-tabs');
      const sig = Daily.badgeText();
      if (!old || old.dataset.sig !== sig) { if (old) old.remove(); const t = Daily.tabs(); t.dataset.sig = sig; body.prepend(t); }
      return r;
    };
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true }); else install();
})();
