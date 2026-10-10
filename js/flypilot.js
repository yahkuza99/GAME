'use strict';
// ============================================================
//  Fly Pilot (โหมด "แมลงวัน"): ดูสมองแมลงวันผลไม้เล่นเกม — ทำงานในเครื่องล้วน ไม่ส่งอะไรออกเน็ต (แบบเดียวกับบอท AUTO)
//  ที่มา: โปรเจกต์ทดลอง flybrain (จำลองสมองแมลงวันทั้งหัว FlyWire 138,639 เซลล์บน GPU แล้วให้เล่นเกมนี้)
//  ในเกมไม่ได้จำลองสมองสด: ใช้ "ตารางคำตอบที่บันทึกไว้" ของสมองจำลอง (js/flypilot_tables.js) ซึ่งวัดจากการกระตุ้นจริง
//    เลี้ยว  : มุม/ระยะของมอน → ตา LC10a → DNa01/DNa02 ซ้าย-ขวา (Hz) → องศาเลี้ยว
//    หนี    : มอนพุ่งเข้าหา (LC4/LPLC2) → Giant Fiber (DNp01) → หมุนฟัน Whirlwind / ปีก Blink / ถอย
//    กิน/นั่ง : หิว HP/SP = รสหวาน · กำลังสู้ = รสขม → MN9 (เซลล์สั่งงวงกิน) → สู้อยู่ = ดื่มยา · สงบ = นั่ง
//  ทุกการกระทำผ่านฟังก์ชันเดียวกับที่ปุ่มผู้เล่น/บอทเรียก: playerWalkTo · p.target · beginSkill/useSkill · useItem · นั่ง (แบบ Bot.rest)
//  ใช้สกิลไหน = Bot.pickSkill (ตั้งค่าสกิลของบอทมีผล) · ไม่แจกแต้ม Status/สกิลให้ (ผู้เล่นเลือกเอง เหมือน AUTO)
//  ค่าคงที่ GL = "กาว" ชุดเดียวกับตัวทดลอง (flybrain/driver/run_rules.js) — ไม่ใช่ส่วนของสมอง
// ============================================================
const FlyPilot = {
  on: false, heading: 0, acc: 0, pauseUntil: 0, warned: '',
  ema: { gf: 0, mn9: 0, strike: 0 }, gfAt: -99, feedAt: -99, strikeAt: -99, escapeUntil: 0, lastDest: null,
  last: null, stats: null, noise: true,
  GL: {
    rmax: 120, sightTiles: 20, fieldOverlapDeg: 15, turnGain: 0.03, maxTurn: 4.0,
    loomK: 6, loomSplitDeg: 30,
    needFull: 0.85, needSpan: 0.75, spWeight: 0.2, spFull: 0.85, sugarMax: 200, bitterFight: 60, // spWeight 0.4→0.2 (flybrain รอบ 3: นั่งน้อยลง)
    emaTau: 0.3, gfThresh: 30, gfRefractory: 3, escapeSec: 1.5, retreatTiles: 4,
    mn9Thresh: 30, mn9Stand: 8, feedRefractory: 1.0, strikeThresh: 15, stepTiles: 2.5,
  },
  OV_KEY: 'iv_flypilot_overlay', // ค่าแสดงตัวเลข (ของเครื่องนี้ ไม่อยู่ในเซฟตัวละคร)

  unlocked() { return Bot.unlocked(); },
  toggle(force) {
    const p = G.player;
    const want = force != null ? !!force : !this.on;
    if (want && (!G.started || p.dead)) { UI.msg(L('ฟื้นคืนชีพก่อนจึงจะเปิดโหมดแมลงวันได้', 'Revive first before turning on Fly mode'), 'err'); return; }
    if (want && !this.unlocked()) { UI.msg(L(`🔒 โหมดแมลงวันปลดล็อกพร้อมบอท AUTO (อัปเกรด Class แรก: Job Lv ${JOB_CHANGE_LV} แล้วคุยกับ Mimir AI)`, `🔒 Fly mode unlocks with the AUTO bot (first class: Job Lv ${JOB_CHANGE_LV}, then talk to Mimir AI)`), 'err'); return; }
    if (want && Bot.on) Bot.toggle(false);
    this.on = want;
    this.reset();
    if (want) {
      this.heading = Math.random() * 2 * Math.PI - Math.PI;
      this.stats = { start: G.time, kills: 0 };
      UI.msg(L('🪰 โหมดแมลงวัน: ตัวละครเดินตามคำตอบที่บันทึกไว้ของสมองแมลงวันผลไม้ (แตะปุ่มอีกครั้งเพื่อหยุด)', '🪰 Fly mode: your character follows the recorded responses of a fruit-fly brain (tap again to stop)'), 'sys');
    } else {
      if (p.sitting) p.sitting = false;
      UI.msg(L('■ หยุดโหมดแมลงวันแล้ว', '■ Fly mode stopped'), 'sys');
    }
    this.draw();
  },
  reset() {
    this.acc = 0; this.pauseUntil = 0; this.warned = ''; this.escapeUntil = 0; this.lastDest = null;
    this.ema = { gf: 0, mn9: 0, strike: 0 }; this.gfAt = this.feedAt = this.strikeAt = -99;
  },
  // ผู้เล่นสั่งเอง (เดิน/แตะมอน/คุย/เก็บของ) → ฟังผู้เล่นก่อน หยุดคิด 3 วิหลังคำสั่งจบ (แบบเดียวกับบอท)
  manual() { if (this.on) this.pauseUntil = G.time + 3; },

  // ---------- ตารางคำตอบ (เหมือน flybrain/driver/fly_tables.js) ----------
  pos(ax, x) {
    if (x <= ax[0]) return [0, 0];
    const n = ax.length - 1;
    if (x >= ax[n]) return [n - 1, 1];
    let i = 0;
    while (ax[i + 1] < x) i++;
    return [i, (x - ax[i]) / (ax[i + 1] - ax[i])];
  },
  bil(g, ay, y, ax, x) {
    const [i, fy] = this.pos(ay, y), [j, fx] = this.pos(ax, x);
    const a = g[i][j] * (1 - fx) + g[i][j + 1] * fx, b = g[i + 1][j] * (1 - fx) + g[i + 1][j + 1] * fx;
    return a * (1 - fy) + b * fy;
  },
  // สมองจำลองตอบเป็น "จำนวนสไปก์ใน 0.1 วิ" ซึ่งแกว่งรอบค่าเฉลี่ย → สุ่มแบบ Poisson ตามจำนวนเซลล์ (T.cells) ให้แกว่งแบบเดียวกัน
  spikeRate(rate, n) {
    const lam = Math.max(0, rate) * n * 0.1;
    if (lam <= 0) return 0;
    let k = 0, q = 1;
    const lim = Math.exp(-lam);
    do { k++; q *= Math.random(); } while (q > lim && k < 1000);
    return (k - 1) / (n * 0.1);
  },
  lookup(inp, phi, d) {
    const T = window.FLY_TABLES, out = {}, st = T.steer;
    if (phi == null || d == null || !(inp.LC10a_L > 0 || inp.LC10a_R > 0)) for (const k of st.keys) out[k] = st.none[k];
    else {
      const sal = U.clamp(1 - d / T.glue.sightTiles, 0.25, 1), deg = U.clamp(phi * 180 / Math.PI, -90, 90);
      for (const k of st.keys) out[k] = this.bil(st[k], st.sal, sal, st.phiDeg, deg);
    }
    const lm = T.loom;
    for (const k of lm.keys) out[k] = (out[k] || 0) + this.bil(lm[k], lm.levels, inp.LOOM_L || 0, lm.levels, inp.LOOM_R || 0); // ของพุ่งเข้าหาทำให้เลี้ยวด้วย (บวกเพิ่ม)
    out.MN9 = this.bil(T.taste.MN9, T.taste.bitter, inp.BITTER || 0, T.taste.sugar, inp.SUGAR || 0);
    if (this.noise && T.cells) for (const k in out) out[k] = this.spikeRate(out[k], T.cells[k] || 1);
    return out;
  },

  // ---------- ตัวช่วย ----------
  wrap(a) { return Math.atan2(Math.sin(a), Math.cos(a)); },
  live(m) { return m && !m.dead && !m.def.dummy && G.mobs.includes(m); },
  threats(r = 6) { const p = G.player; return G.mobs.filter(m => this.live(m) && m.state === 'chase' && U.dist(m.x, m.y, p.x, p.y) < r); },
  hpFrac() { const p = G.player; return p.hp / p.d.maxHp; },
  spFrac() { const p = G.player; return p.sp / Math.max(1, p.d.maxSp); },
  frontMob(range, cone = 45) {
    const p = G.player; let best = null, bd = 1e9;
    for (const m of G.mobs) {
      if (!this.live(m)) continue;
      const d = U.dist(m.x, m.y, p.x, p.y);
      if (d > range + 0.3) continue;
      if (Math.abs(this.wrap(Math.atan2(m.y - p.y, m.x - p.x) - this.heading)) < cone * Math.PI / 180 && d < bd) { bd = d; best = m; }
    }
    return best;
  },
  sit(on) { // แบบเดียวกับ Bot.rest (ไม่ส่งข้อความนั่ง/ลุกทุกครั้ง)
    const p = G.player;
    if (on) { p.path = []; p.target = null; p.skillTarget = null; p.skillIntent = null; }
    p.sitting = on;
  },

  // ---------- ประสาทรับรู้: สถานะเกม → ความถี่กระตุ้น (สูตรกาวเดียวกับตัวทดลอง) ----------
  sense() {
    const p = G.player, GL = this.GL, H = this.heading, D2R = Math.PI / 180;
    let best = null, bd = 1e9;
    for (const m of G.mobs) { if (!this.live(m)) continue; const d = U.dist(m.x, m.y, p.x, p.y); if (d < bd) { bd = d; best = m; } }
    const inp = { LC10a_L: 0, LC10a_R: 0, LOOM_L: 0, LOOM_R: 0, SUGAR: 0, BITTER: 0 };
    let phi = null;
    if (best) {
      phi = this.wrap(Math.atan2(best.y - p.y, best.x - p.x) - H); // > 0 = มอนอยู่ทางขวา
      const sal = U.clamp(1 - bd / GL.sightTiles, 0.25, 1), ov = GL.fieldOverlapDeg * D2R;
      inp.LC10a_R = GL.rmax * sal * U.clamp((phi + ov) / (Math.PI / 2 + ov), 0, 1);
      inp.LC10a_L = GL.rmax * sal * U.clamp((-phi + ov) / (Math.PI / 2 + ov), 0, 1);
    }
    const th = this.threats(6);
    for (const m of th) {
      const d = Math.max(0.8, U.dist(m.x, m.y, p.x, p.y)), sz = m.def.size || m.def.scale || 1;
      const a = this.wrap(Math.atan2(m.y - p.y, m.x - p.x) - H), wR = U.clamp((a + GL.loomSplitDeg * D2R) / (2 * GL.loomSplitDeg * D2R), 0, 1);
      const v = GL.loomK * sz * sz / (d * d);
      inp.LOOM_R += v * wR; inp.LOOM_L += v * (1 - wR);
    }
    inp.LOOM_R = Math.min(200, inp.LOOM_R); inp.LOOM_L = Math.min(200, inp.LOOM_L);
    const nHp = (GL.needFull - this.hpFrac()) / GL.needSpan, nSp = GL.spWeight * (GL.spFull - this.spFrac()) / GL.needSpan;
    inp.SUGAR = GL.sugarMax * U.clamp(Math.max(nHp, nSp), 0, 1);
    inp.BITTER = th.length ? GL.bitterFight : 0;
    return { inp, phi, d: best ? bd : null, th };
  },

  // ---------- 1 รอบคิด (ทุก 0.1 วิในเกม) ----------
  think() {
    const p = G.player, GL = this.GL, now = G.time;
    if (p.dead) { this.toggle(false); UI.msg(L('โหมดแมลงวันหยุดเพราะตัวละครเสียชีวิต', 'Fly mode stopped — your character has fallen'), 'err'); return; }
    const where = G.map.def.pvp ? 'pvp' : G.map.def.kind === 'town' ? 'town' : '';
    if (where) {
      if (this.warned !== where) { this.warned = where; UI.msg(where === 'pvp' ? L('โหมดแมลงวันไม่ทำงานในลานประลอง PvP', 'Fly mode does not work in the PvP Arena') : L('แมลงวันรออยู่: ออกไปยังแผนที่ที่มีมอนสเตอร์ได้เลย', 'Fly standing by: head out to a hunting map'), 'info'); }
      this.last = null; this.drawOv(); return;
    }
    this.warned = '';
    if (now < this.pauseUntil || NPC.busy) {
      if (p.path.length || p.npcTarget || p.pickTarget || p.cast || p.skillIntent) this.pauseUntil = Math.max(this.pauseUntil, now + 1);
      return;
    }
    const s = this.sense(), n = this.lookup(s.inp, s.phi, s.d);
    // เลี้ยว: DNa01/DNa02 (ขวา − ซ้าย) → องศา/วินาที
    const tl = (n.DNa01_L + n.DNa02_L) / 2, tr = (n.DNa01_R + n.DNa02_R) / 2;
    this.heading = this.wrap(this.heading + U.clamp(GL.turnGain * (tr - tl), -GL.maxTurn, GL.maxTurn) * 0.1);
    const k = 1 - Math.exp(-0.1 / GL.emaTau);
    this.ema.gf += k * (Math.max(n.DNp01_L, n.DNp01_R) - this.ema.gf);
    this.ema.mn9 += k * (n.MN9 - this.ema.mn9);
    this.ema.strike += k * (n.DNa02_L + n.DNa02_R - this.ema.strike);
    this.last = { tl, tr, gf: this.ema.gf, mn9: this.ema.mn9 };
    this.drawOv();
    if (p.cast || isStunned()) return;
    this.act(s.th, now);
  },
  act(th, now) {
    const p = G.player, GL = this.GL;
    // 1) Giant Fiber → หนี
    if (this.ema.gf > GL.gfThresh && now - this.gfAt > GL.gfRefractory && th.length) {
      this.gfAt = now;
      const adj = th.filter(m => U.dist(m.x, m.y, p.x, p.y) <= 2);
      if (skillLv('whirlwind') && Bot.canCast('whirlwind', 0, true) && adj.length) useSkill('whirlwind');
      else if (this.hpFrac() < 0.35 && countItem('blink_feather')) useItem(p.inventory.find(e => e.id === 'blink_feather'));
      else if (this.retreat(th)) this.escapeUntil = now + GL.escapeSec;
      return;
    }
    if (now < this.escapeUntil) return;
    // 2) MN9 → สู้อยู่ = ดื่มยา · สงบ = นั่ง · MN9 เงียบ / มีมอนไล่ = ลุก
    if (p.sitting) {
      if (this.ema.mn9 < GL.mn9Stand || th.length) this.sit(false);
      else return;
    }
    if (this.ema.mn9 > GL.mn9Thresh && now - this.feedAt > GL.feedRefractory) {
      if (th.length) {
        const e = (this.hpFrac() <= this.spFrac() || !Bot.findItem(SP_POTS)) ? Bot.findItem(HP_POTS) : Bot.findItem(SP_POTS);
        if (e && G.time >= p.itemReadyAt) { useItem(e); this.feedAt = now; }
      } else { this.sit(true); this.feedAt = now; return; }
    }
    // 3) วงจรไล่เป้าทำงาน (DNa02 ซ้าย+ขวา) + มีมอนตรงหน้าในระยะสกิล → สกิลที่บอทเลือก (Bot.pickSkill)
    const tgt = this.frontMob(Math.max(p.d.range, 1.5) + 4.5, 45);
    if (this.ema.strike > GL.strikeThresh && tgt && now - this.strikeAt > 0.3 && G.time >= p.skillReadyAt) {
      const id = Bot.pickSkill(tgt, th, this.hpFrac() * 100, this.spFrac() * 100);
      if (id) {
        const sd = skillDef(id);
        if (sd.target !== 'enemy' || U.dist(p.x, p.y, tgt.x, tgt.y) <= skillRange(sd) + 0.3) {
          this.strikeAt = now;
          if (sd.target === 'enemy') beginSkill(id, skillLv(id), tgt); else useSkill(id);
          if (p.cast) return;
        }
      }
    }
    // 4) ตีปกติ: มอนในระยะอาวุธด้านหน้า ±45° = แตะมอน · ไม่มี = เดินตามทิศของสมอง (ท่าฟันยังไม่จบ = ยังไม่เดิน)
    const m = this.frontMob(p.d.range, 45);
    if (m) { if (p.target !== m) { p.target = m; p.repathAt = 0; } return; }
    p.target = null;
    if (p.atkAnim > 0) return;
    for (const off of [0, 45, -45, 90, -90]) {
      const a = this.heading + off * Math.PI / 180, tx = Math.floor(p.x + Math.cos(a) * GL.stepTiles), ty = Math.floor(p.y + Math.sin(a) * GL.stepTiles);
      if (!G.map.walkable(tx, ty)) continue;
      const key = tx + ',' + ty;
      if (key !== this.lastDest || !p.path.length) { playerWalkTo(tx, ty); this.lastDest = key; }
      if (off) this.heading = this.wrap(this.heading + off * Math.PI / 360); // ติดสิ่งกีดขวาง: เบี่ยงครึ่งทาง
      return;
    }
  },
  retreat(th) {
    const p = G.player; let cx = 0, cy = 0;
    for (const m of th) { cx += m.x; cy += m.y; }
    cx /= th.length; cy /= th.length;
    const base = Math.atan2(p.y - cy, p.x - cx);
    for (const off of [0, 30, -30, 60, -60, 90, -90]) {
      const a = base + off * Math.PI / 180, tx = Math.floor(p.x + Math.cos(a) * this.GL.retreatTiles), ty = Math.floor(p.y + Math.sin(a) * this.GL.retreatTiles);
      if (G.map.walkable(tx, ty) && !G.map.portalAt(tx, ty)) { p.target = null; playerWalkTo(tx, ty); return true; }
    }
    return false;
  },
  update(dt) {
    if (!this.on || !G.started) return;
    this.acc += dt;
    for (let i = 0; i < 3 && this.acc >= 0.1; i++) { this.acc -= 0.1; this.think(); if (!this.on) break; }
    if (this.acc > 0.3) this.acc = 0;
  },

  // ---------- ปุ่ม + กรอบตัวเลข ----------
  ovOn() { try { return localStorage.getItem(this.OV_KEY) !== '0'; } catch (e) { return true; } },
  setOv(v) { try { localStorage.setItem(this.OV_KEY, v ? '1' : '0'); } catch (e) {} this.drawOv(); },
  build() {
    if (this.btn || typeof document === 'undefined') return;
    const b = document.createElement('button');
    b.id = 'fly-btn'; b.type = 'button';
    b.title = L('แมลงวัน: สำเนาที่บันทึกไว้ของการตอบสนองจากสมองแมลงวันผลไม้จริง (FlyWire 138,639 เซลล์) ไม่ใช่สมองสด • คลิกขวา/กดค้าง = เปิด/ปิดตัวเลข',
      'Fly: a recorded copy of a real fruit-fly brain\'s responses (FlyWire 138,639 neurons), not a live brain • Right-click/hold = show/hide numbers');
    b.innerHTML = `<b>${L('แมลงวัน', 'Fly')}</b>`;
    b.onclick = () => this.toggle();
    if (UI.altPress) UI.altPress(b, () => this.setOv(!this.ovOn()));
    document.body.appendChild(b);
    const o = document.createElement('div');
    o.id = 'fly-ov'; o.hidden = true;
    o.title = b.title;
    document.body.appendChild(o);
    this.btn = b; this.ov = o;
    setInterval(() => this.place(), 500);
  },
  // วางปุ่มไว้เหนือปุ่ม AUTO (ทุกโหมดจอ) · AUTO ถูกซ่อน = ซ่อนด้วย
  place() {
    const b = this.btn, a = document.getElementById('auto-btn');
    if (!b) return;
    const r = a && G.started ? a.getBoundingClientRect() : null;
    const show = !!(r && r.width && getComputedStyle(a).visibility !== 'hidden' && !document.getElementById('hud').hidden);
    b.hidden = !show;
    if (show) {
      const w = b.offsetWidth || 56;
      b.style.left = Math.round(Math.max(4, Math.min(innerWidth - w - 4, r.left + r.width / 2 - w / 2))) + 'px';
      // AUTO อยู่ในกรอบแถบแอ็กชัน (คอม) = วางเหนือกรอบ ไม่ทับขอบ · โหมด PAD (AUTO ลอยเอง) = วางเหนือปุ่ม
      const dk = document.getElementById('dock'), dr = dk && dk.contains(a) && getComputedStyle(a).position !== 'fixed' ? dk.getBoundingClientRect() : null;
      const top = dr && dr.height && dr.top <= r.top ? dr.top : r.top;
      b.style.top = Math.round(Math.max(4, top - (b.offsetHeight || 26) - 6)) + 'px';
      b.classList.toggle('on', this.on);
      b.classList.toggle('locked', !this.unlocked());
    }
    this.drawOv();
  },
  draw() { this.place(); },
  drawOv() {
    const o = this.ov, b = this.btn;
    if (!o) return;
    const show = this.on && this.ovOn() && b && !b.hidden;
    o.hidden = !show;
    if (!show) return;
    const v = this.last, f = x => (x == null ? '–' : Math.round(x));
    const t = v ? `${L('เลี้ยว', 'Turn')} L ${f(v.tl)} · R ${f(v.tr)} Hz\nGF ${f(v.gf)} Hz\nMN9 ${f(v.mn9)} Hz` : `${L('เลี้ยว', 'Turn')} L – · R – Hz\nGF – Hz\nMN9 – Hz`;
    if (o.textContent !== t) o.textContent = t;
    const br = b.getBoundingClientRect(), w = o.offsetWidth || 150;
    o.style.left = Math.round(Math.max(4, Math.min(innerWidth - w - 4, br.right - w))) + 'px';
    o.style.top = Math.round(br.top - (o.offsetHeight || 70) - 6) + 'px';
  },
};

// ---------- ต่อเข้ากับเกม (ห่อฟังก์ชันเดิม ไม่แก้ไฟล์ร่วม) ----------
(() => {
  const ug = updateGame;
  updateGame = function (dt) { FlyPilot.update(dt); return ug.apply(this, arguments); };
  // ระหว่างโหมดแมลงวัน: ยาและการตีโต้ให้ "สมอง" ตัดสิน (ไม่เปลี่ยนค่าตั้งของผู้เล่น — แค่ข้ามขณะเปิดโหมด)
  const apt = autoPotTick;
  autoPotTick = function () { if (FlyPilot.on) return; return apt.apply(this, arguments); };
  const ac = autoCounter;
  autoCounter = function () { if (FlyPilot.on) return; return ac.apply(this, arguments); };
  // เปิด AUTO = ปิดแมลงวัน · ผู้เล่นสั่งเอง = แมลงวันหยุดคิดชั่วคราว
  const bt = Bot.toggle.bind(Bot);
  Bot.toggle = function (force) { const want = force != null ? force : !Bot.on; if (want && FlyPilot.on) FlyPilot.toggle(false); return bt(force); };
  const mo = Bot.manualOverride.bind(Bot), ut = Bot.userTarget.bind(Bot);
  Bot.manualOverride = function () { FlyPilot.manual(); return mo(); };
  Bot.userTarget = function (m) { FlyPilot.manual(); return ut(m); };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => FlyPilot.build());
    else FlyPilot.build();
  }
})();
