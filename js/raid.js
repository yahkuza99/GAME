'use strict';
// ============================================================
//  รุมบอส (Raid) — เจ้าของ 2026-10-10: "ผมอยากจะให้มันคนช่วยกันรุมหลายๆ คน"
//  ใช้กับบอส 2 ระดับ: MVP ประจำแผนที่ + Ancient (World Boss, js/worldboss.js) • ทำงานเฉพาะออนไลน์ (ออฟไลน์ = เหมือนเดิมทุกอย่าง)
//  1) MVP ใช้ร่วมกันทั้งแผนที่: เดิม MVP เป็นของใครของมัน (แต่ละเครื่องมีตัวของตัวเอง) → ตอนนี้ทุกคนในแผนที่ตีตัวเดียวกัน เลือดร่วมกัน
//     • ช่อง map:<id> event 'raid': st (สถานะบอส) · ask (ขอสถานะ) · hit (ดาเมจ) · dead
//     • สองคนมี MVP คนละตัวพร้อมกัน → รวมเป็นตัวเดียว: ตัวที่เกิดก่อน (sid น้อยกว่า) ชนะ ทุกเครื่องได้ผลเดียวกัน
//     • เดินเข้าแผนที่ตอน MVP ของเราติดคูลดาวน์แต่มีคนกำลังสู้ = เห็นบอสตัวนั้นและเข้าไปช่วยได้
//       (ปราบระหว่างคูลดาวน์ของเรา = ได้ EXP/Zeny แต่ไม่ได้ของดรอป/โบนัส MVP และคูลดาวน์ไม่รีเซ็ต — กันฟาร์มวนตัวคนอื่น)
//  2) ยิ่งรุมยิ่งแรง: นับคนที่ตีบอสใน 10 วิล่าสุด (ผู้ช่วย) → ทุกคนดาเมจใส่บอส +10% ต่อผู้ช่วยเพิ่ม 1 คน (สูงสุด +50%) และ EXP ตอนปราบเท่ากัน
//  3) บอสสำหรับฝูง: ความแค้นสลับไปตามผู้ช่วยทุก 8 วิ (บอสหันไปตีคนอื่น — คนเดียวโดนตีตลอด รุมกันโดนแค่ช่วงของตัวเอง)
//     + ท่าที่มีป้ายแดงลงแรงขึ้น +25% ต่อเพื่อนที่ยืนติดกันในระยะ 1.5 ช่อง (สูงสุด ×2, ไม่เกิน 90% MaxHP) — ต้องกระจายกันยืน
//  4) รวมพล: ปุ่มบนแถบบอส → ประกาศทุกแผนที่ (ช่อง 'rally') ผู้เล่นที่เลเวลพอได้โทสต์แตะเดียวนำทางมา • คูลดาวน์ 45 วิ
//  5) รางวัล: ทุกคนที่ดาเมจถึงเกณฑ์ (MVP ≥ 1% / Ancient ≥ 0.5% ของเลือดบอส) ได้รางวัลเต็มของตัวเอง ไม่หารกัน
//     + 3 อันดับดาเมจแรก (เมื่อร่วมกัน ≥ 2 คน) ได้ของเพิ่มเล็กน้อย • คนที่ปิดฉากได้รางวัลเสมอ
//  ข้อจำกัดที่รู้: เชื่อข้อมูลจากเครื่องผู้เล่น (เหมือนแลกเปลี่ยน/ตลาด) — ส่งดาเมจปลอมได้ ไม่มีเซิร์ฟเวอร์ตัดสิน
// ============================================================
const Raid = {
  HELP_SEC: 10, BONUS_PER: 0.10, BONUS_CAP: 0.5,
  MIN_SHARE: { mvp: 0.01, wb: 0.005 },
  AGGRO_MS: 8000, STACK_R: 1.5, STACK_PER: 0.25, STACK_CAP: 2, STACK_HP_CAP: 0.9,
  RALLY_CD: 45e3, CALL_SEC: 25, RESULT_SEC: 15,
  TOP_EXTRA: [[['white_potion', 2], ['blue_potion', 1]], [['white_potion', 2]], [['white_potion', 1]]],
  st: {},        // map → สถานะ MVP ร่วม { sid, mob, hp, max, dead, dmg: { id: { n, d } } }
  recent: {},    // 'mvp:<map>' | 'wb:<map>' → { id: { t, n } } เวลาที่ตีล่าสุด (ผู้ช่วย)
  res: {},       // ผลการปราบล่าสุดของเรา key → { earned, helpers, bonus, lean, extra, rank, n }
  expMul: 1, lean: false, rallyAt: -1e9, call: null, seenCall: {}, askAt: 0, stAt: 0, rch: null,

  // ---------------- พื้นฐาน ----------------
  on() { return typeof Online !== 'undefined' && !!Online.online && !!Online.mapChannel && !!G.map && !!G.player; },
  myId() { return (typeof Online !== 'undefined' && Online.user && Online.user.id) || 'local'; },
  kind(m) { return !m || m.isPlayer || m.minion ? '' : m.isWB ? 'wb' : m.isMvp ? 'mvp' : ''; },
  key(m) { return this.kind(m) + ':' + (G.map ? G.map.id : ''); },
  clean(s) { return String(s || '').replace(/[\u0000-\u001f<>"&]/g, '').trim().slice(0, 24); },
  okId: k => typeof k === 'string' && k.length > 0 && k.length < 80 && !/^(__proto__|constructor|prototype)$/.test(k),
  newSid() { return Date.now().toString(36).padStart(9, '0') + '-' + this.myId().slice(0, 12); },
  mvpLive() { return G.mobs ? G.mobs.find(m => m.isMvp && !m.dead) || null : null; },
  boss() { // บอสที่แสดงบนแถบ: ตัวที่เราล็อกเป้าอยู่ก่อน
    const t = G.player && G.player.target, list = [this.mvpLive(), typeof WB !== 'undefined' ? WB.live() : null].filter(Boolean);
    return list.find(m => m === t) || list[0] || null;
  },

  // ---------------- ผู้ช่วย / โบนัส ----------------
  noteHit(key, id, n) {
    if (!this.okId(id)) return;
    const r = this.recent[key] || (this.recent[key] = {});
    r[id] = { t: performance.now(), n: this.clean(n) || '???' };
  },
  helperIds(m) {
    const r = this.recent[this.key(m)] || {}, lim = performance.now() - this.HELP_SEC * 1000;
    return Object.keys(r).filter(id => r[id].t >= lim).sort();
  },
  helpers(m) { return this.on() ? this.helperIds(m).length : 0; },
  bonus(m) { const n = this.helpers(m); return n >= 2 ? Math.min(this.BONUS_CAP, this.BONUS_PER * (n - 1)) : 0; },
  myDmg(m) {
    if (this.kind(m) === 'wb') { const o = WB.state(G.map.id).dmg[WB.me().id]; return Math.max(m.wbMine || 0, o ? o.d : 0); } // ทั้งรอบ (ตายแล้วกลับมาตีต่อยังนับยอดเดิม)
    const s = this.st[G.map.id], o = s && s.dmg[this.myId()];
    return o ? o.d : 0;
  },
  need(m) { return Math.max(1, Math.round(m.maxHp * (this.MIN_SHARE[this.kind(m)] || 0.01))); },
  earned(m) { return this.myDmg(m) >= this.need(m); },
  // เพื่อนที่ยืนติดเรา (ระยะ 1.5 ช่อง) → ท่าป้ายแดงของบอสแรงขึ้น
  stackMul() {
    if (!this.on()) return 1;
    const p = G.player; let k = 0;
    for (const o of Online.others.values()) {
      if (o.dead) continue;
      const x = o.tx != null ? o.tx : o.x, y = o.ty != null ? o.ty : o.y;
      if (Math.hypot(x - p.x, y - p.y) <= this.STACK_R) k++;
    }
    return Math.min(this.STACK_CAP, 1 + this.STACK_PER * k);
  },
  // ความแค้นของบอส: ผู้ช่วยที่ยังอยู่ในแผนที่ (เรียงตาม id) สลับกันทุก AGGRO_MS — ทุกเครื่องคิดได้ผลเดียวกัน
  holder(m) {
    if (!this.on()) return null;
    const me = this.myId(), ids = this.helperIds(m).filter(id => id === me || (Online.others.has(id) && !Online.others.get(id).dead));
    if (ids.length < 2) return null;
    return ids[Math.floor(Date.now() / this.AGGRO_MS) % ids.length];
  },
  aggro(m) {
    const id = this.holder(m), me = this.myId();
    m.aggroId = id;
    if (!id || id === me) { m.focus = null; return; }
    const o = Online.others.get(id);
    if (!o) { m.focus = null; return; }
    const f = m.focus && m.focus.id === id ? m.focus : (m.focus = { id, remote: true, dead: false, flee: 0 });
    f.x = o.tx != null ? o.tx : o.x; f.y = o.ty != null ? o.ty : o.y; f.dead = !!o.dead; f.name = o.name;
  },

  // ---------------- เครือข่าย: แผนที่ ----------------
  send(t, extra) {
    if (!this.on()) return;
    Online.mapChannel.send({ type: 'broadcast', event: 'raid', payload: Object.assign({ t, map: G.map.id }, extra) });
  },
  state(m) { // สถานะร่วมของ MVP ตัวนี้ (สร้างใหม่ถ้ายังไม่มี / ตัวเก่าที่ตายไปแล้ว)
    const map = G.map.id;
    let s = this.st[map];
    if (!m.raidSid) m.raidSid = this.newSid();
    if (!s || s.sid !== m.raidSid) s = this.st[map] = { sid: m.raidSid, mob: m.def.id, hp: m.hp, max: m.maxHp, dead: false, dmg: {} };
    return s;
  },
  sendSt(force) {
    const m = this.mvpLive(); if (!m || !this.on()) return;
    const now = performance.now(); if (!force && now - this.stAt < 1200) return;
    this.stAt = now;
    const s = this.state(m);
    this.send('st', { sid: s.sid, mob: s.mob, hp: Math.round(s.hp), dead: s.dead ? 1 : 0, dm: s.dmg });
  },
  ask() { const now = performance.now(); if (now - this.askAt < 2500) return; this.askAt = now; this.send('ask'); },
  // ช่องแผนที่พร้อม (js/online.js) → บอกบอสของเรา + ขอสถานะคนที่อยู่ก่อน
  onJoin() { if (!G.map || !G.map.def.mvp) return; this.askAt = 0; this.stAt = 0; this.sendSt(true); this.ask(); },
  mergeDmg(s, dm) {
    if (!dm || typeof dm !== 'object') return;
    for (const k of Object.keys(dm).slice(0, 200)) {
      const r = dm[k]; if (!r || !(+r.d > 0) || !this.okId(k)) continue;
      const o = s.dmg[k] || (s.dmg[k] = { n: this.clean(r.n) || '???', d: 0 });
      o.d = Math.max(o.d, Math.round(+r.d));
    }
  },
  onNet(pl) {
    if (!pl || typeof pl !== 'object' || !G.started || !G.map || pl.map !== G.map.id || !G.map.def.mvp) return;
    const map = G.map.id, m = this.mvpLive(), sid = typeof pl.sid === 'string' ? pl.sid.slice(0, 60) : '';
    if (pl.t === 'ask') { this.sendSt(); return; }
    if (pl.t === 'st') {
      if (!sid || pl.mob !== G.map.def.mvp) return;
      const hp = Math.max(0, Math.min(MOBS[pl.mob].hp, Math.round(+pl.hp || 0)));
      if (!m) { if (!pl.dead && hp > 0) this.spawnGuest(sid, hp, pl.dm); else if (this.st[map] && this.st[map].sid === sid) this.mergeDmg(this.st[map], pl.dm); return; }
      const s = this.state(m);
      if (sid === s.sid) {
        this.mergeDmg(s, pl.dm);
        if (pl.dead) { this.remoteDead(m); return; }
        if (hp < s.hp) { s.hp = hp; m.hp = Math.max(1, Math.min(m.hp, hp)); }
        return;
      }
      if (pl.dead) return;
      if (sid < s.sid) { // ตัวของอีกฝ่ายเกิดก่อน → ใช้ตัวนั้น (ดาเมจที่เราตีตัวเดิมยังนับเป็นผลงานของเรา)
        const mine = s.dmg;
        const ns = this.st[map] = { sid, mob: pl.mob, hp, max: m.maxHp, dead: false, dmg: {} };
        this.mergeDmg(ns, pl.dm); this.mergeDmg(ns, mine);
        m.raidSid = sid; m.hp = Math.max(1, hp);
      } else this.sendSt();
      return;
    }
    if (pl.t === 'hit') {
      const d = Math.max(0, Math.min(1e9, Math.round(+pl.d || 0))), id = typeof pl.id === 'string' ? pl.id : '';
      const s = this.st[map];
      if (!s || s.sid !== sid) { if (m) this.sendSt(); else this.ask(); return; }
      if (this.okId(id) && d > 0) {
        const o = s.dmg[id] || (s.dmg[id] = { n: this.clean(pl.n) || '???', d: 0 });
        o.d += d; this.noteHit('mvp:' + map, id, pl.n);
      }
      if (s.dead) return;
      s.hp = Math.max(0, s.hp - d);
      if (m && m.raidSid === sid) { m.hp = Math.min(m.hp, s.hp); m.hitFlash = 0.12; if (m.hp <= 0) this.remoteDead(m); }
      return;
    }
    if (pl.t === 'dead') {
      const s = this.st[map];
      if (!s || s.sid !== sid) return;
      s.dead = true; s.hp = 0;
      if (m && m.raidSid === sid) this.remoteDead(m);
    }
  },
  // มีคนกำลังสู้ MVP ในแผนที่นี้ แต่ในเครื่องเราไม่มีตัวนั้น → เกิดบอสตัวเดียวกันให้เราเข้าไปช่วย
  spawnGuest(sid, hp, dm) {
    const id = G.map.def.mvp, s = this.st[G.map.id];
    if (!MOBS[id] || (s && s.sid === sid && s.dead)) return;
    const m = spawnMob(id, mvpSpawnPos(G.map));
    m.isMvp = true; m.raidSid = sid; m.raidGuest = true; m.hp = Math.max(1, Math.min(m.maxHp, hp));
    m.raidCd = mvpLeft(G.map.id) > 0; // MVP ของเราเองยังติดคูลดาวน์ = ช่วยได้ แต่รางวัลแค่ EXP/Zeny
    if (typeof BossKit !== 'undefined') BossKit.init(m);
    const ns = this.st[G.map.id] = { sid, mob: id, hp: m.hp, max: m.maxHp, dead: false, dmg: {} };
    this.mergeDmg(ns, dm);
    UI.msg(L(`[MVP] มีคนกำลังสู้ ${m.def.name} อยู่ในแผนที่นี้ (เลือด ${Math.ceil(m.hp / m.maxHp * 100)}%) — เข้าไปช่วยได้ เลือดใช้ร่วมกัน${m.raidCd ? ' · MVP ของคุณยังติดคูลดาวน์: ช่วยแล้วได้ EXP/Zeny' : ''}`,
      `[MVP] Someone is fighting ${m.def.name} on this map (HP ${Math.ceil(m.hp / m.maxHp * 100)}%) — join in, HP is shared${m.raidCd ? ' · your own MVP is on cooldown: helping earns EXP/Zeny' : ''}`), 'mvp');
  },
  // คนอื่นปิดฉาก: ถึงเกณฑ์ = รางวัลเต็มของเรา (killMob) • ไม่ถึง = บอสหายไปเฉย ๆ
  remoteDead(m) {
    if (m.dead) return;
    m.raidRemote = true;
    if (this.earned(m)) { killMob(m); return; }
    const k = this.key(m);
    this.res[k] = { earned: false, helpers: Math.max(1, this.helpers(m)), bonus: 0, lean: false, mine: this.myDmg(m), need: this.need(m) };
    m.dead = true; m.deathT = 0; m.hp = 0; m.path = []; m.moving = false;
    if (G.player.target === m) G.player.target = null;
    UI.msg(L(`[MVP] ${m.def.name} ถูกปราบโดยผู้เล่นอื่น — ดาเมจของคุณไม่ถึงเกณฑ์ ${Math.round(this.MIN_SHARE.mvp * 100)}% จึงไม่ได้รางวัล`, `[MVP] ${m.def.name} was defeated by other players — your damage was under the ${Math.round(this.MIN_SHARE.mvp * 100)}% threshold, so no reward`), 'mvp');
    this.afterKill(m, false);
  },

  // ---------------- เกี่ยวเข้ากับเกม (ห่อฟังก์ชันเดิม ไม่แก้ตรรกะหลัก) ----------------
  init() {
    const dm0 = damageMob, km0 = killMob, sp0 = spawnMvp, ge0 = gainExp, te0 = telegraph, dp0 = damagePlayer,
      dr0 = dropItemOnGround, gc0 = grantChip, ai0 = addItem;
    damageMob = (m, dmg, opts) => {
      const k = m && !m.dead && this.on() ? this.kind(m) : '';
      if (!k) return dm0(m, dmg, opts);
      const me = this.myId(), key = this.key(m);
      this.noteHit(key, me, G.player.name);
      const b = this.bonus(m);
      if (b > 0 && dmg > 0) dmg = Math.max(1, Math.round(dmg * (1 + b)));
      if (k === 'mvp' && dmg > 0) { // ส่งดาเมจก่อน แล้วค่อยหักเลือด (ถ้าตีตาย 'hit' ถึงก่อน 'dead')
        const s = this.state(m), d = Math.min(Math.max(0, m.hp), dmg);
        if (d > 0) {
          s.hp = Math.max(0, s.hp - d);
          const o = s.dmg[me] || (s.dmg[me] = { n: this.clean(G.player.name), d: 0 }); o.d += d;
          this.send('hit', { sid: s.sid, d: Math.round(d), id: me, n: this.clean(G.player.name) });
        }
      }
      return dm0(m, dmg, opts);
    };
    killMob = m => {
      const k = this.on() ? this.kind(m) : '';
      if (!k) return km0(m);
      const p = G.player, map = G.map.id, prevCd = p.mvpAt ? p.mvpAt[map] : undefined, b = this.bonus(m);
      const lean = k === 'mvp' && !!m.raidCd;
      this.res[this.key(m)] = { earned: true, helpers: Math.max(1, this.helpers(m)), bonus: b, lean };
      this.expMul = 1 + b; this.lean = lean;
      try { km0(m); } finally {
        this.expMul = 1; this.lean = false;
        if (lean) { if (prevCd === undefined) delete p.mvpAt[map]; else p.mvpAt[map] = prevCd; } // ช่วยระหว่างคูลดาวน์: ไม่รีเซ็ตคูลดาวน์ของเรา
      }
      if (b > 0) UI.msg(L(`[รุมบอส] ผู้ช่วย ${this.helpers(m)} คน → EXP +${Math.round(b * 100)}%`, `[Raid] ${this.helpers(m)} helpers → EXP +${Math.round(b * 100)}%`), 'mvp');
      if (lean) UI.msg(L('[MVP] ช่วยปราบระหว่างคูลดาวน์ของคุณ: ได้ EXP/Zeny (ของดรอปและโบนัส MVP รอรอบของคุณเอง)', '[MVP] Helped during your own cooldown: EXP/Zeny earned (drops and the MVP bonus wait for your own cycle)'), 'mvp');
      if (k === 'mvp') {
        const s = this.st[map];
        if (s && s.sid === m.raidSid) { s.dead = true; s.hp = 0; }
        if (!m.raidRemote && s) this.send('dead', { sid: s.sid });
      }
      this.afterKill(m, true);
    };
    spawnMvp = id => {
      sp0(id);
      const m = G.mobs.filter(x => x.isMvp && !x.dead).pop();
      if (!m || !this.on()) return;
      m.raidSid = this.newSid(); this.state(m);
      this.stAt = 0; this.sendSt(true); this.askAt = 0; this.ask();
    };
    gainExp = (b, j) => ge0(this.expMul !== 1 ? Math.round(b * this.expMul) : b, this.expMul !== 1 ? Math.round(j * this.expMul) : j);
    // ท่าป้ายแดงของบอสรุม: ยืนติดกันโดนแรงขึ้น
    telegraph = (m, shape, onHit, boom) => te0(m, shape, onHit && this.kind(m) && this.on() ? () => { this.teleBoss = m; try { onHit(); } finally { this.teleBoss = null; } } : onHit, boom);
    damagePlayer = (dmg, color, src) => {
      if (this.teleBoss && dmg > 0) {
        const k = this.stackMul();
        if (k > 1) {
          const cap = Math.round(G.player.d.maxHp * this.STACK_HP_CAP);
          dmg = Math.max(dmg, Math.min(cap, Math.round(dmg * k)));
          addFloater(G.player.x + 0.4, G.player.y - 1.9, L(`ยืนเบียดกัน ×${k.toFixed(2)}`, `Stacked ×${k.toFixed(2)}`), '#ff9a6a');
        }
      }
      return dp0(dmg, color, src);
    };
    // ช่วยระหว่างคูลดาวน์ MVP: ไม่มีของดรอป/ชิป/โบนัส MVP
    dropItemOnGround = (...a) => (this.lean ? undefined : dr0(...a));
    grantChip = (...a) => (this.lean ? undefined : gc0(...a));
    addItem = (...a) => (this.lean ? false : ai0(...a));
    if (typeof WB !== 'undefined') {
      const on0 = WB.onNet.bind(WB), rk0 = WB.remoteKill.bind(WB), sr0 = WB.showResult.bind(WB);
      WB.onNet = pl => {
        if (pl && pl.t === 'hit' && G.map && pl.map === G.map.id && typeof pl.id === 'string' && +pl.d > 0) this.noteHit('wb:' + pl.map, pl.id.split('/')[0], pl.n);
        return on0(pl);
      };
      WB.remoteKill = m => {
        if (!this.earned(m)) this.res['wb:' + G.map.id] = { earned: false, helpers: Math.max(1, this.helpers(m)), bonus: 0, mine: m.wbMine || 0, need: this.need(m) };
        return rk0(m);
      };
      WB.showResult = (...a) => { const r = sr0(...a); this.decorateWb(); return r; };
    }
  },

  // ---------------- หลังปราบ: ของเพิ่ม 3 อันดับแรก + การ์ดสรุป ----------------
  ranking(kind, map) {
    if (kind === 'wb') return WB.ranking(map).map(r => ({ id: r.id.split('/')[0], n: r.n, d: r.d }));
    const s = this.st[map]; if (!s) return [];
    return Object.keys(s.dmg).map(id => ({ id, n: s.dmg[id].n, d: s.dmg[id].d })).filter(r => r.d > 0).sort((a, b) => b.d - a.d || (a.n < b.n ? -1 : 1));
  },
  afterKill(m, earned) {
    const kind = this.kind(m), map = G.map.id, key = kind + ':' + map, name = m.def.name, maxHp = m.maxHp;
    setTimeout(() => { // รอ 'hit' สุดท้ายของทุกคนมาถึงก่อน (เหมือน WB)
      if (!G.map || G.map.id !== map) return;
      const all = this.ranking(kind, map), me = this.myId(), i = all.findIndex(r => r.id === me), r = this.res[key] || { earned };
      Object.assign(r, { rank: i >= 0 ? i + 1 : 0, n: all.length, mine: i >= 0 ? all[i].d : 0, extra: [] });
      if (r.earned && !r.lean && all.length >= 2 && r.rank >= 1 && r.rank <= 3) {
        r.extra = this.TOP_EXTRA[r.rank - 1];
        for (const [it, q] of r.extra) if (ITEMS[it]) addItem(it, q, true);
        UI.msg(L(`[รุมบอส] ดาเมจอันดับ ${r.rank} — ได้ของเพิ่ม: ${r.extra.map(([it, q]) => `${ITEMS[it].name} ×${q}`).join(', ')}`, `[Raid] Damage rank #${r.rank} — bonus: ${r.extra.map(([it, q]) => `${ITEMS[it].name} ×${q}`).join(', ')}`), 'mvp');
        saveGame(true);
      }
      this.res[key] = r;
      if (kind === 'wb') { if (WB.resultOpen) WB.showResult(); return; }
      if (all.length >= 2 || !r.earned) this.showResult(map, name, maxHp, all, r);
    }, 800);
  },
  resLine(r) {
    if (!r) return '';
    const status = !r.earned ? L(`ไม่ได้รางวัล — ดาเมจของคุณ ${U.fmt(Math.round(r.mine || 0))} ต่ำกว่าเกณฑ์ ${U.fmt(r.need || 0)}`, `No reward — your damage ${U.fmt(Math.round(r.mine || 0))} is under the ${U.fmt(r.need || 0)} threshold`)
      : r.lean ? L('ได้ EXP/Zeny (MVP ของคุณติดคูลดาวน์)', 'EXP/Zeny earned (your MVP is on cooldown)')
      : L('ได้รางวัลเต็ม', 'Full reward');
    const cells = [[L('ผู้ช่วย', 'Helpers'), String(r.helpers || 1)], [L('โบนัส EXP', 'EXP bonus'), `+${Math.round((r.bonus || 0) * 100)}%`]];
    return `<div class="raid-res"><div class="raid-res-c">${cells.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>` +
      `<p class="${r.earned ? 'ok' : 'no'}">${status}</p>` +
      (r.extra && r.extra.length ? `<p class="ok">${L(`ของเพิ่มอันดับ ${r.rank}`, `Rank #${r.rank} bonus`)}: ${r.extra.map(([it, q]) => `${U.esc(ITEMS[it].name)} ×${q}`).join(', ')}</p>` : '') + '</div>';
  },
  decorateWb() {
    const card = document.querySelector('#wb-result .wbr-card'); if (!card || !G.map) return;
    const old = card.querySelector('.raid-res'); if (old) old.remove();
    const html = this.resLine(this.res['wb:' + (WB.resultMap || G.map.id)]);
    if (html) card.querySelector('.wbr-list').insertAdjacentHTML('beforebegin', html);
  },
  showResult(map, name, maxHp, all, r) {
    let el = document.getElementById('raid-result');
    if (!el) {
      el = document.createElement('div'); el.id = 'raid-result'; el.hidden = true; document.body.append(el);
      el.addEventListener('click', e => { if (e.target.closest('.rr-x')) this.closeResult(); });
    }
    const me = this.myId(), rows = all.slice(0, 5).map((x, i) => ({ id: x.id, n: x.n, d: x.d, rank: i + 1, me: x.id === me }));
    const mine = all.findIndex(x => x.id === me);
    if (mine >= 5) rows.push({ id: me, n: all[mine].n, d: all[mine].d, rank: mine + 1, me: true });
    const rowsHtml = typeof WB !== 'undefined' ? WB.rowsHtml(rows, maxHp) : '';
    el.innerHTML = `<div class="rr-card" role="dialog" aria-label="${U.esc(name)}"><button class="rr-x" type="button" aria-label="Close">×</button>
      <div class="rr-k">${L('ปราบ MVP ด้วยกัน', 'MVP defeated together')}</div><div class="rr-t">${U.esc(name)}</div>
      <div class="rr-me"><div><small>${L('อันดับของคุณ', 'Your rank')}</small><b>${mine >= 0 ? `#${mine + 1}<i>/${all.length}</i>` : '-'}</b></div><div><small>Damage</small><b>${U.fmt(mine >= 0 ? all[mine].d : 0)}</b></div><div><small>${L('สัดส่วน', 'Share')}</small><b>${mine >= 0 ? (all[mine].d / maxHp * 100).toFixed(1) : '0.0'}%</b></div></div>
      ${this.resLine(r)}<div class="wbr-list">${rowsHtml}</div></div>`;
    el.hidden = false; this.resultOpen = true;
    this.armClose(this.RESULT_SEC * 1000);
  },
  // ปิดเองหลังเวลาผ่านไป — ระหว่างฉากเล่าเรื่อง (ปราบครั้งแรก) ยังไม่นับเวลา
  armClose(ms) { clearTimeout(this.resultTimer); this.resultTimer = setTimeout(() => (typeof NPC !== 'undefined' && NPC.busy ? this.armClose(4000) : this.closeResult()), ms); },
  closeResult() { const el = document.getElementById('raid-result'); if (el) el.hidden = true; this.resultOpen = false; clearTimeout(this.resultTimer); },

  // ---------------- รวมพล (ช่อง 'rally' ของทุกคน ทุกแผนที่) ----------------
  joinRally() {
    if (this.rch || typeof Online === 'undefined' || !Online.online || !Online.sb) return;
    const ch = Online.sb.channel('rally', { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: 'call' }, ({ payload }) => this.onRally(payload));
    ch.subscribe();
    this.rch = ch;
  },
  rallyLeft() { return Math.max(0, Math.ceil((this.rallyAt + this.RALLY_CD - Date.now()) / 1000)); },
  rally() {
    const m = this.boss();
    if (!m || !this.on()) { UI.msg(L('รวมพลได้เมื่อมีบอส MVP/Ancient อยู่ในแผนที่ (โหมดออนไลน์)', 'Rally works when an MVP/Ancient is on your map (online mode).'), 'err'); return false; }
    if (this.rallyLeft() > 0) { UI.msg(L(`รวมพลได้อีกครั้งในอีก ${this.rallyLeft()} วินาที`, `You can rally again in ${this.rallyLeft()} s`), 'err'); return false; }
    this.joinRally();
    this.rallyAt = Date.now();
    const k = this.kind(m), v = { from: this.myId(), n: this.clean(G.player.name), k, map: G.map.id, mob: k === 'wb' ? m.def.id : m.def.id, hp: Math.ceil(m.hp / m.maxHp * 100), h: Math.max(1, this.helpers(m)), lv: m.def.lv };
    if (this.rch) this.rch.send({ type: 'broadcast', event: 'call', payload: v });
    UI.msg(L(`📣 เรียกรวมพลแล้ว — ผู้เล่นทุกแผนที่จะเห็นคำเชิญมาช่วยตี ${m.def.name}`, `📣 Rally sent — players on every map will see your call to fight ${m.def.name}`), 'party');
    Sound.play('quest_new');
    this.bar(true);
    return true;
  },
  onRally(v) {
    if (!v || typeof v !== 'object' || !G.started || !G.player || typeof v.from !== 'string' || v.from === this.myId()) return;
    const map = String(v.map || ''), k = v.k === 'wb' ? 'wb' : v.k === 'mvp' ? 'mvp' : '', mob = String(v.mob || '');
    if (!k || !MAP_DEFS[map] || !MOBS[mob]) return;
    if (k === 'mvp' && MAP_DEFS[map].mvp !== mob) return;
    if (k === 'wb' && !(typeof WB !== 'undefined' && WB.MAPS[map] && WB.id(map) === mob)) return;
    const now = Date.now(); if (now - (this.seenCall[v.from] || 0) < 15000) return;
    this.seenCall[v.from] = now;
    const c = { from: v.from, n: this.clean(v.n) || 'Player', k, map, mob, hp: Math.max(1, Math.min(100, +v.hp | 0)), h: Math.max(1, Math.min(99, +v.h | 0)), exp: now + this.CALL_SEC * 1000 };
    const B = MOBS[mob], nm = MAP_DEFS[map].name;
    UI.msg(L(`📣 [รวมพล] ${c.n}: มาช่วยรุม ${B.name} (Lv ${B.lv}) ที่ ${nm} — เลือด ${c.hp}% · รุมอยู่ ${c.h} คน`, `📣 [Rally] ${c.n}: help take down ${B.name} (Lv ${B.lv}) in ${nm} — HP ${c.hp}% · ${c.h} fighting`), 'mvp');
    if (G.map && G.map.id === map) return; // อยู่แผนที่เดียวกันแล้ว: แค่ข้อความในแชต
    if (G.player.baseLv < B.lv - 20) return; // เลเวลห่างเกิน: ไม่เด้งโทสต์ (ยังเห็นในแชต)
    this.call = c; this.showCall();
    Sound.play('quest_new');
  },
  goCall() {
    const c = this.call; if (!c) return;
    this.call = null; this.showCall();
    if (typeof MM !== 'undefined') MM.navTo(c.k === 'wb' ? 'wb:' + c.map : 'mvp:' + c.mob);
    else Nav.goTo({ kind: 'map', map: c.map, name: MAP_DEFS[c.map].name });
  },
  showCall() {
    let el = document.getElementById('raid-call');
    const c = this.call;
    if (!c) { if (el) el.hidden = true; return; }
    if (!el) {
      el = document.createElement('div'); el.id = 'raid-call'; el.setAttribute('role', 'status'); el.hidden = true;
      (document.getElementById('hud') || document.body).append(el);
      el.addEventListener('click', e => { if (e.target.closest('.rc-go')) this.goCall(); else if (e.target.closest('.rc-x')) { this.call = null; this.showCall(); } });
    }
    const B = MOBS[c.mob], left = Math.max(0, Math.ceil((c.exp - Date.now()) / 1000)), key = c.from + c.exp;
    if (el.dataset.key === key && !el.hidden) { const s = el.querySelector('.rc-sec'); if (s && s.textContent !== String(left)) s.textContent = String(left); return; }
    el.dataset.key = key;
    el.innerHTML = `<div class="rc-t"><small>${L('รวมพล!', 'Rally!')} · ${U.esc(c.n)}</small>` +
      `<span><b>${U.esc(B.name)}</b> ${L('ที่', 'in')} ${U.esc(MAP_DEFS[c.map].name)}</span>` +
      `<span class="rc-n">${L('เลือด', 'HP')} <b>${c.hp}%</b> · ${L('รุมอยู่', 'fighting')} <b>${c.h}</b> ${L('คน', '')} · Lv ${B.lv}</span></div>` +
      `<b class="rc-sec" aria-label="${L('วินาทีที่เหลือ', 'seconds left')}">${left}</b>` +
      `<button type="button" class="btn rc-go">${L('ไปช่วย', 'Go help')}</button><button type="button" class="rc-x" aria-label="Close">×</button>`;
    el.hidden = false;
  },

  // ---------------- แถบบอส (ตัวเลขล้วน ไม่มีหลอดสัดส่วน) ----------------
  bar(force) {
    let el = document.getElementById('raid-bar');
    const m = this.on() ? this.boss() : null;
    if (!m) { if (el && !el.hidden) el.hidden = true; return; }
    if (!el) {
      el = document.createElement('div'); el.id = 'raid-bar'; el.hidden = true;
      (document.getElementById('hud') || document.body).append(el);
      el.addEventListener('click', e => { if (e.target.closest('.rb-call')) this.rally(); });
    }
    const n = Math.max(1, this.helpers(m)), b = this.bonus(m), cd = this.rallyLeft(), me = this.myId();
    const tgt = !m.aggroId ? '' : m.aggroId === me ? L('คุณ', 'You') : this.clean((Online.others.get(m.aggroId) || {}).name) || '???';
    const pct = Math.ceil(m.hp / m.maxHp * 100);
    const key = [m.def.id, Math.round(m.hp), n, b, cd, tgt, m.phase || 0].join('|');
    if (!force && el.dataset.key === key && !el.hidden) return;
    el.dataset.key = key;
    el.className = this.kind(m) === 'wb' ? 'wb' : 'mvp';
    el.innerHTML = `<div class="rb-a"><small>${this.kind(m) === 'wb' ? 'ANCIENT' : 'MVP'}</small><b class="rb-nm">${U.esc(m.def.name)}</b>` +
      `<span class="rb-hp"><b>${pct}%</b><small>${U.fmt(Math.max(0, Math.round(m.hp)))} / ${U.fmt(m.maxHp)}</small></span></div>` +
      `<div class="rb-b"><span class="rb-h" title="${L('คนที่ตีบอสใน 10 วินาทีล่าสุด', 'Players who hit the boss in the last 10 seconds')}"><b>${n}</b> ${L('คนรุม', 'fighting')}</span>` +
      `<span class="rb-bonus${b > 0 ? ' on' : ''}">${b > 0 ? L(`ดาเมจ/EXP +${Math.round(b * 100)}%`, `DMG/EXP +${Math.round(b * 100)}%`) : L('รุม 2 คนขึ้นไป = แรงขึ้น', '2+ helpers = bonus')}</span>` +
      (tgt ? `<span class="rb-tg">${L('บอสเล็ง', 'Boss targets')}: <b>${U.esc(tgt)}</b></span>` : '') +
      `<button type="button" class="btn rb-call"${cd ? ' disabled' : ''}>${cd ? L(`รวมพล (${cd})`, `Rally (${cd})`) : L('รวมพล', 'Rally')}</button></div>`;
    el.hidden = false;
  },

  // ---------------- ทุก 250 ms ----------------
  tick() {
    if (typeof G === 'undefined' || !G.started || !G.player || !G.map) return;
    if (typeof Online !== 'undefined' && Online.online && Online.sb) this.joinRally();
    if (this.on()) {
      const m = this.mvpLive(), s = m && this.st[G.map.id];
      if (m && s && s.sid === m.raidSid && m.hp > s.hp) m.hp = Math.max(1, s.hp); // เลือดร่วม: ท่าฟื้นเลือดของบอสในเครื่องเราไม่นับ (กันฟื้นซ้อนทุกเครื่อง)
      for (const b of [m, typeof WB !== 'undefined' ? WB.live() : null]) if (b) this.aggro(b);
    } else for (const b of G.mobs) if (b.focus) b.focus = null;
    this.bar();
    if (this.call) { if (this.call.exp < Date.now()) this.call = null; this.showCall(); }
  },
};
Raid.init();
setInterval(() => Raid.tick(), 250);
