'use strict';
// ============================================================
//  Class 3 — กลไก / Oath / ไม้ตาย / เควสต์ทดสอบ / บอท / ภาพ (ข้อมูลอยู่ที่ js/class3_data.js)
//  ออกแบบ: docs/CLASS3_DESIGN.md (เจ้าของตอบ "A" 2026-10-03 → A+ = Oath 2 แบบต่อ Class)
//
//  • ปลด: Class 2 ที่มี THIRD_JOBS + Base Lv 70 + Job 26 + จบภาค 1 (ch7_home) → คุยกับ Mimir AI → เควสต์ทดสอบ:
//      คุย NPC "ความคิดสุดท้าย" (Runelord = Muninn @ Archive Depths • Packlord = Sigrún @ Wolfwood)
//      → ดวล "เงาแม่พิมพ์" (ร่างเงาของ Class 2 ตัวเอง — วาดจากภาพผู้เล่น + ชุดท่า BossKit) → กลับไปหา Mimir → ยกระดับ
//    สถานะเก็บใน p.c3 = { trial: { job, stage: 'seek'|'duel'|'ascend' } | null, done: [job] } (ฟิลด์เซฟใหม่ — เซฟเก่าไม่มี = ว่าง)
//  • Oath = รูนของสกิลติดตัว Class 3 (Runes.add เดิม — หน้าต่าง Runes/Skills/Builds/IV-BUILD เห็นเองทั้งหมด) เปลี่ยนฟรีนอกการต่อสู้
//  • ไม้ตาย: ตัวเลือกที่ 4 ใน Feel.ULTS (ผูก Class ด้วย job) — เป็นบัฟ/โหมด ไม่ใช่ระเบิด
//  • เกี่ยวเข้าเกมแบบ "ห่อ" ฟังก์ชันเดิม (ไม่แก้ไฟล์อื่น): Runes.preCast/onCast/hitMul/basicMul/afterHit/afterBasic/onKill/update/castMul,
//    runSpecialSkill, damagePlayer, stunPlayer, skillCost, recalc, updateAllies, damageMob, Bot.role/pickSkill,
//    NPC.scripts (jobmaster/muninn/sigrun), Sprites.drawMob/drawAlly, R.drawFx/drawTelegraphs, UI.renderSkills/renderStatus/skillIcon
//  ตัวเลขสมดุลทั้งหมดอยู่ใน Class3.K + js/class3_data.js — วัดด้วย tests/class3.js (SIM=1) และ tests/balance_sim.js (C3=1)
// ============================================================
const Class3 = (() => {
  const C = {};
  const K = C.K = {
    verseGap: 0.55,             // วินาทีระหว่างระลอก Ragnarök Verse
    // Oath — Runelord (Root Script)
    of_k: 1.0, of_burn: 0.3, of_spread: 2.5,      // of Fire-Tongue: ทุกคาถาเป็นไฟ (คิดตามธาตุจริงของเป้า) ×of_k • ติดไฟ of_burn • ตัวที่ไหม้ตายลามไปตัวใกล้
    ot_up: 0.2, ot_down: 0.2,                      // of Three Tongues: ต่างธาตุจากลูกก่อน +20% / ธาตุซ้ำ −20% (แทน Resonance)
    // รูน Rune Circle
    sg_echo: 0.75, sg_root: 1.5, sg_root_boss: 0.5, // Snare Glyph: ระเบิดซ้ำเหลือครึ่ง • ตรึงตัวที่เดินเข้า 1.5 วิ (บอส/ผู้เล่น: ช้า 0.5 วิ)
    ley_r: 2, ley_echo: 0.15,                      // Leyline: วงเล็ก 2 ช่องเดินตามตัวเรา • ระเบิดซ้ำ 25% (tests/runes_c3.js: เต็มแรง ฝูง +21~25% / 50% +16% / 30% +12.2%)
    // Oath — Packlord (Pack Blood)
    op_n: 5, op_self: 0.08,                        // of the Pack: หมา 5 ตัว • ตัวเราเบาลง 12%
    ol_ch: 0.25, ol_k: 0.8, ol_aspd: 12,           // of the Lone Wolf: ไม่มีหมา • ตีปกติ 25% ตีซ้ำ (80%) • หอน = ASPD +12% 10 วิ
    // รูน Howl of the Pack
    sa_pow: 2.6, sa_size: 1.25,                    // Single Alpha: ตัวเดียว แรง ×2.6 เกาะเป้า
    ep_boom: 1.0, ep_r: 2,                         // Ember Pack: หมดเวลาระเบิดไฟ 2 ช่อง 100% ATK ต่อตัว
    // ไม้ตาย
    ult_tree: 8, ult_howl: 10, ult_howl_n: 2, ult_leech: 8,
  };
  const P = () => G.player;
  const fast = () => !!G.fastSim;
  const lvOf = id => (G.player && G.player.skills[id]) || 0;
  const onLine = job => !!G.player && jobLine(G.player.job).includes(job);
  const say = (o, t, c, big) => { if (!fast()) addFloater(o.x, o.y - 1.6, t, c, big); };
  const oath = sk => { const r = typeof Runes !== 'undefined' && Runes.chosen(sk); return r ? r.oath || null : null; };
  const alive = m => m && !m.dead && G.mobs.includes(m);
  C.isThird = job => !!(JOBS[job] && JOBS[job].tier === 3);

  // ============================================================
  //  สถานะ / เงื่อนไขปลด
  // ============================================================
  if (typeof SAVE_FIELDS !== 'undefined' && !SAVE_FIELDS.includes('c3')) SAVE_FIELDS.push('c3');
  C.st = (p = G.player) => {
    const s = p.c3 && typeof p.c3 === 'object' && !Array.isArray(p.c3) ? p.c3 : (p.c3 = {});
    if (!Array.isArray(s.done)) s.done = [];
    s.done = s.done.filter(j => C.isThird(j));
    const t = s.trial;
    if (!t || typeof t !== 'object' || !C.isThird(t.job) || !['seek', 'duel', 'ascend'].includes(t.stage) || THIRD_JOBS[JOBS[t.job].parent] !== t.job) s.trial = null;
    return s;
  };
  C.storyDone = () => typeof Quest !== 'undefined' && Quest.passed(THIRD_JOB_REQ.quest);
  // คืน { next, base, job, story, ok } — next = Class 3 ของสายนี้ (null = ยังไม่มี/ไม่ใช่ Class 2)
  C.req = (p = G.player) => {
    const J = JOBS[p.job], next = J && J.tier === 2 ? THIRD_JOBS[p.job] || null : null;
    const r = { next, base: p.baseLv >= THIRD_JOB_REQ.base, job: p.jobLv >= THIRD_JOB_REQ.job, story: C.storyDone() };
    r.ok = !!next && r.base && r.job && r.story;
    return r;
  };
  C.howText = id => {
    const J = JOBS[id];
    return L(`เป็น ${JOBS[J.parent].name} แล้วมี Base Lv ${THIRD_JOB_REQ.base} + Job Lv ${THIRD_JOB_REQ.job} และจบภาค 1 (ฉาก "ใบแรกกลับบ้าน") → คุยกับ Mimir AI ในนีโอเอลด์ไฮม์ → เดินตาม "ความคิดสุดท้าย" แล้วชนะ "เงาแม่พิมพ์" (ร่างเงาของ Class 2 ตัวเอง)`,
      `As a ${JOBS[J.parent].name}, reach Base Lv ${THIRD_JOB_REQ.base} + Job Lv ${THIRD_JOB_REQ.job} and finish Part 1 ("The First Leaf Comes Home") → talk to Mimir AI in Neo Eldheim → follow the "last thought" and defeat the Mould Shadow (a shadow of your own Class 2).`);
  };
  // เซฟเก่า: c3/job2Lv เสีย → ล้าง (ไม่แตะ SAVE_KEY / id เดิม)
  if (typeof loadGameFrom === 'function' && !loadGameFrom._c3) {
    const lg0 = loadGameFrom;
    loadGameFrom = function (data) { // eslint-disable-line no-global-assign
      const p = lg0.apply(this, arguments);
      if (p) {
        if (p.job2Lv != null && !(Number.isInteger(p.job2Lv) && p.job2Lv >= 1 && p.job2Lv <= 99)) delete p.job2Lv;
        C.st(p);
        if (p.ultKind && typeof Feel !== 'undefined' && Feel.ULTS[p.ultKind] && Feel.ULTS[p.ultKind].job && Feel.ULTS[p.ultKind].job !== p.job) p.ultKind = 'fury';
      }
      return p;
    };
    loadGameFrom._c3 = true;
  }

  // ============================================================
  //  วงรูน (G.zones ของ Rune Paths — ล้างตอนเปลี่ยนแมพ/เปลี่ยนรูนเอง)
  // ============================================================
  C.circles = () => (G.zones || []).filter(z => z.c3circle && z.until > G.time);
  C.circleAt = m => { let best = null; for (const z of C.circles()) if (U.dist(m.x, m.y, z.x, z.y) <= z.r && (!best || z.echo > best.echo)) best = z; return best; };
  const killZone = z => { z.until = G.time; if (z.fx) z.fx.t = z.fx.dur; };
  C.placeCircle = (s, lv, at) => {
    const p = P(), ru = s.rune, ci = SKILLS.rune_circle.c3circle, ley = !!(ru && ru.c3 === 'leyline'), snare = !!(ru && ru.c3 === 'snare');
    const o = ley ? p : (at || p), mine = C.circles().filter(z => !!z.ley === ley);
    if (ley) mine.forEach(killZone);
    else while (mine.length >= ci.max) killZone(mine.shift());
    const dur = ci.dur(lv) * masteryMul('rune_circle');
    const z = Runes.zone({ skill: 'rune_circle', c3circle: true, ley, snare, x: o.x, y: o.y, ref: ley ? p : null, r: ley ? K.ley_r : ci.r(lv), until: G.time + dur,
      echo: ci.echo(lv) * (snare ? K.sg_echo : ley ? K.ley_echo : 1), every: 0.2, first: 0.05, draw: false, seen: new Set(),
      tick: (zz, ms) => { if (zz.snare) for (const m of ms) C.snare(zz, m); } });
    if (!fast()) z.fx = C.fx({ kind: 'circle', ground: 1, z, ref: ley ? p : null, x: z.x, y: z.y, r: z.r, dur, col: snare ? '170,255,190' : ley ? '160,190,255' : '120,236,255' });
    if (!fast()) Sound.play('magic');
    return z;
  };
  C.snare = (z, m) => {
    if (z.seen.has(m) || m.dead) return;
    z.seen.add(m);
    if (m.isPlayer) return; // PvP: ไม่ตรึงผู้เล่น (ภาพเท่านั้น)
    if (m.def.boss || m.isMvp || m.isWB) { m.slowUntil = Math.max(m.slowUntil || 0, G.time + K.sg_root_boss); say(m, 'Snared', '#b0ffc8'); return; }
    m.stunUntil = Math.max(m.stunUntil || 0, G.time + K.sg_root * lvChanceMul(P().baseLv, m.def.lv)); m.path = []; m.moving = false;
    say(m, 'Snared!', '#b0ffc8');
  };

  // ============================================================
  //  ร่ายพิเศษ
  // ============================================================
  // Ragnarök Verse: ไฟ → น้ำแข็ง → สายฟ้า 3 ระลอก (ธาตุต่างกันทุกระลอก = Resonance ทุกระลอก)
  const VERSE = [['fire', '255,140,60', { kind: 'burn', chance: () => 30, dur: () => 3 }], ['water', '150,220,255', { kind: 'slow', chance: () => 100, dur: () => 3 }], ['wind', '240,240,120', null]];
  C.verse = (s, lv, tgt) => {
    const p = P(), cx = tgt ? tgt.x : p.x, cy = tgt ? tgt.y : p.y, r = s.dmg.area;
    VERSE.forEach(([el, col, st], i) => later(0.15 + i * K.verseGap, () => {
      if (p.dead) return;
      const ws = Object.create(s); ws.dmg = Object.assign({}, s.dmg, { element: el, hits: 1, status: st });
      C.resonate(ws);
      if (!fast()) { C.fx({ kind: 'verse', x: cx, y: cy, r, el, col, dur: 0.75 }); Sound.play(el === 'fire' ? 'fire' : el === 'water' ? 'ice' : 'zap'); if (typeof R !== 'undefined' && R.kick) R.kick(3 + i, 0.18); }
      for (const m of G.mobs.filter(o => !o.dead && U.dist(o.x, o.y, cx, cy) <= r)) {
        if (!fast() && el === 'wind') addFx({ type: 'lightning', ref: m, dur: 0.28 });
        skillDeliver(ws, lv, m);
      }
    }));
  };
  // Resonance (Root Script) / of Three Tongues: ตัวคูณของการร่ายครั้งนี้ — เก็บไว้ต่อสกิล (ดาเมจลงทีหลังได้)
  C.resonate = s => {
    const p = P();
    if (!s.dmg || s.dmg.type !== 'magic' || !lvOf('root_script')) return;
    const el = s.dmg.element || 'neutral', prev = p.c3el, ot = oath('root_script');
    let k = 1;
    if (ot === 'three') k = prev == null ? 1 : prev !== el ? 1 + K.ot_up : 1 - K.ot_down;
    else if (ot !== 'fire' && prev != null && prev !== el) k = 1 + SKILLS.root_script.c3res(lvOf('root_script'));
    p.c3el = el;
    (p.c3cast || (p.c3cast = {}))[s.id] = { k };
    if (k > 1 && !fast()) say(p, ot === 'three' ? 'THREE TONGUES' : 'RESONANCE', '#9ff0ff');
  };
  // Sap Ward: โล่ดูดซับตาม MATK (ความชำนาญยืดเวลาเหมือนบัฟ)
  C.ward = (s, lv) => {
    const p = P(), w = s.c3ward, mt = (p.d.matkMin + p.d.matkMax) / 2;
    p.c3ward = { hp: Math.round(mt * w.shield(lv)), max: Math.round(mt * w.shield(lv)), until: G.time + s.buff.dur(lv) * masteryMul(s.id), lv };
  };
  C.wardBreak = () => {
    const p = P(), w = p.c3ward; if (!w) return;
    p.c3ward = null;
    const s = SKILLS.sap_ward, lv = w.lv, r = s.c3ward.r;
    say(p, 'WARD BURST', '#bff4ff', true);
    if (!fast()) { addFx({ type: 'firering', c3wardBurst: 1, x: p.x, y: p.y, dur: 0.55, r }); C.fx({ kind: 'shatter', x: p.x, y: p.y, r, dur: 0.7 }); Sound.play('ice'); }
    for (const m of G.mobs.filter(o => !o.dead && U.dist(o.x, o.y, p.x, p.y) <= r)) {
      const res = Runes.hit(m, s, s.c3ward.boom(lv), { type: 'magic', element: 'water' });
      if (res && !res.miss && !m.dead) applyStatus(m, { kind: 'slow', chance: () => 100, dur: () => 3 }, lv, res.dmg);
    }
  };
  // Blink Glyph: ไปวงรูนของตัวเองที่ใกล้สุด • ไม่มีวง = ถอยหนีศัตรูที่ใกล้สุด (หรือไปข้างหน้า)
  C.blink = (s, lv) => {
    const p = P(), ox = p.x, oy = p.y;
    const zs = C.circles().filter(z => !z.ley).sort((a, b) => U.dist(a.x, a.y, p.x, p.y) - U.dist(b.x, b.y, p.x, p.y));
    let tx = null, ty = null;
    for (const z of zs) { const q = G.map.walkable(Math.floor(z.x), Math.floor(z.y)) ? { x: z.x, y: z.y } : G.map.nearestWalkable(z.x, z.y); if (q && U.dist(q.x, q.y, p.x, p.y) > 0.6) { tx = q.x; ty = q.y; break; } }
    if (tx == null) {
      const m = Runes.nearest(p.x, p.y, 8);
      let ux = p.facing || 1, uy = 0;
      if (m) { const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy) || 1; ux = dx / d; uy = dy / d; }
      for (let d = s.c3blink.dist(lv); d > 0.6; d -= 0.4) {
        const nx = p.x + ux * d, ny = p.y + uy * d;
        if (G.map.walkable(Math.floor(nx), Math.floor(ny)) && !G.map.portalAt(Math.floor(nx), Math.floor(ny))) { tx = nx; ty = ny; break; }
      }
    }
    if (tx == null) return;
    p.x = tx; p.y = ty; p.path = []; p.skillIntent = null; p.target = null;
    if (!fast()) { C.fx({ kind: 'blink', x: ox, y: oy, dur: 0.5 }); C.fx({ kind: 'blink', x: tx, y: ty, dur: 0.6, arrive: 1 }); Sound.play('magic'); }
  };
  // Howl of the Pack: เงาหมาป่าเพลิงชั่วคราว (G.allies kind 'c3wolf' — ใช้ระบบเดินตาม/กัดของหมาป่าคู่ใจเดิม)
  C.wolves = (n, lv, pow, sec, opt = {}) => {
    const p = P(), out = [];
    for (let i = 0; i < n; i++) {
      const a = (i / Math.max(1, n)) * Math.PI * 2 + Math.random() * 0.4, sz = (opt.size || 1) * 0.82;
      const w = { kind: 'c3wolf', name: opt.alpha ? 'Shadow Alpha' : n > 1 ? `Shadow Pack ×${n}` : 'Shadow Wolf', quiet: i > 0, x: p.x + Math.cos(a) * 1.1, y: p.y + Math.sin(a) * 0.8, path: [], facing: p.facing, moving: false, seed: Math.random(),
        until: G.time + sec, born: G.time, lv, pow, nextAtk: G.time + 0.25 + i * 0.15, repathAt: 0, atkAnim: 0, target: null, state: 'ally', split: i > 0 && !opt.alpha,
        ember: !!opt.ember, ult: !!opt.ult, alpha: !!opt.alpha, sz: opt.size || 1,
        def: { size: sz, color: '#2a1612', color2: '#ff6a2a', variant: 'wolf' } };
      G.allies.push(w); out.push(w);
      if (!fast()) C.fx({ kind: 'spawn', x: w.x, y: w.y, dur: 0.6 });
    }
    return out;
  };
  C.howl = (s, lv) => {
    const p = P(), o = oath('pack_blood'), ru = s.rune, sec = s.dur(lv) * masteryMul(s.id);
    if (!fast()) C.fx({ kind: 'howl', ref: p, dur: 0.9 });
    if (o === 'lone') { Runes.giveBuff('c3_lone', 'howl_of_the_pack', sec, { aspdPct: K.ol_aspd }); say(p, 'LONE HOWL', '#ffb070', true); return; }
    G.allies = G.allies.filter(a => !(a.kind === 'c3wolf' && !a.ult));
    const W = s.c3wolves;
    if (ru && ru.c3 === 'alpha') C.wolves(1, lv, W.pow(lv) * K.sa_pow, sec, { alpha: 1, size: K.sa_size });
    else C.wolves(o === 'pack' ? K.op_n : W.n, lv, W.pow(lv), sec, { ember: ru && ru.c3 === 'ember' });
  };
  C.wolfBoom = w => {
    w.boomed = true;
    const p = P();
    if (!fast()) { addFx({ type: 'firering', x: w.x, y: w.y, dur: 0.5, r: K.ep_r }); Sound.play('fire'); }
    const s = SKILLS.howl_of_the_pack;
    for (const m of G.mobs.filter(o => !o.dead && U.dist(o.x, o.y, w.x, w.y) <= K.ep_r)) Runes.hit(m, s, K.ep_boom, { type: 'phys', element: 'fire', color: '#ffb060' });
    void p;
  };
  C.mark = (s, lv, t) => {
    if (!t || t.dead) return;
    t.c3mark = { k: s.c3mark.k(lv), until: G.time + s.c3mark.dur(lv) };
    say(t, "ALPHA'S MARK", '#ffd060');
    if (!fast()) C.fx({ kind: 'amark', ref: t, dur: s.c3mark.dur(lv) });
  };
  const markK = m => (m && m.c3mark && m.c3mark.until > G.time ? 1 + m.c3mark.k : 1);
  // Pack Blood: ศัตรูรอบตัว 3 ช่อง (สูงสุด 5) → ดาเมจกายภาพ +0.6%×Lv ต่อตัว
  C.packMul = () => {
    const lv = lvOf('pack_blood'); if (!lv) return 1;
    const c = SKILLS.pack_blood.c3pack, p = P();
    let n = 0; for (const m of G.mobs) if (!m.dead && U.dist(m.x, m.y, p.x, p.y) <= c.r && ++n >= c.cap) break;
    return 1 + c.per(lv) * n;
  };
  const leechHeal = (amt) => {
    const p = P(); if (amt <= 0 || p.dead || p.hp >= p.d.maxHp) return;
    const before = p.hp;
    p.hp = Math.min(p.d.maxHp, p.hp + amt);
    if (!fast()) {
      const got = p.hp - before;
      const recent = G.floaters.find(f => f.c3Drain && f.t < 0.6 && Math.abs(f.x - p.x) < 1.6);
      if (recent) {
        recent.drainAmount += got;
        recent.text = L(`+${recent.drainAmount} ดูดเลือด`, `+${recent.drainAmount} Drain`);
        recent.t = 0;
      } else {
        addFloater(p.x + 0.35, p.y - 1.5, L(`+${got} ดูดเลือด`, `+${got} Drain`), '#ff8fb4');
        Object.assign(G.floaters[G.floaters.length - 1], { c3Drain: true, drainAmount: got });
      }
    }
  };
  C.ultOn = kind => { const u = G.player && G.player.c3ult; return !!(u && u.kind === kind && u.until > G.time); };

  // ============================================================
  //  จุดเกาะเข้าเกม (ห่อของเดิม — ไม่มี Class 3 = ทำงานเหมือนเดิมทุกอย่าง)
  // ============================================================
  const RU = Runes;
  { const f0 = RU.preCast; RU.preCast = function (s, lv, tgt) { C.tgt = tgt || null; if (s && s.dmg && !s.c3cast) C.resonate(s); return f0.apply(this, arguments); }; }
  { const f0 = RU.onCast;
    RU.onCast = function (s, lv, tgt) {
      const done = f0.apply(this, arguments);
      if (s.c3ward) C.ward(s, lv);
      if (s.c3unchained) { const p = P(); p.stunUntil = 0; p.c3floorUntil = G.time + s.c3unchained.floor(lv); say(p, 'UNCHAINED', '#ff8080', true); }
      if (done) return true;
      if (s.c3cast === 'verse') { C.verse(s, lv, tgt || C.tgt); return true; }
      return false;
    }; }
  { const f0 = RU.hitMul;
    RU.hitMul = function (s, lv, m) {
      let k = f0.apply(this, arguments);
      const p = P(), rec = p.c3cast && p.c3cast[s.id];
      if (rec && s.dmg && s.dmg.type === 'magic') k *= rec.k;
      if (s.c3inCircle && C.circleAt(m)) k *= s.c3inCircle;
      k *= markK(m);
      if (s.dmg && s.dmg.type === 'phys' && lvOf('pack_blood')) k *= C.packMul();
      return k;
    }; }
  { const f0 = RU.basicMul; RU.basicMul = function (m) { let k = f0.apply(this, arguments) * markK(m); if (lvOf('pack_blood')) k *= C.packMul(); return k; }; }
  { const f0 = RU.afterHit;
    RU.afterHit = function (s, lv, m, r) {
      f0.apply(this, arguments);
      if (!r || r.miss || !(r.dmg > 0)) return;
      const p = P();
      // วงรูน: คาถาที่โดนศัตรูในวง → ระเบิดซ้ำ (ไม่ซ้อนกันเอง)
      if (s.dmg && s.dmg.type === 'magic') {
        const z = C.circleAt(m);
        if (z && z.echo > 0) {
          const amt = Math.max(1, Math.round(r.dmg * z.echo * (m.isPlayer ? 1 : 1)));
          later(0.2, () => { if (m.dead) return; damageMob(m, amt, { color: '#8ff4ff', src: 'rune_circle', sfx: '' }); if (!fast()) C.fx({ kind: 'echo', ref: m, dur: 0.45 }); });
        }
      }
      if (r.phys) {
        if (s.c3leech) leechHeal(Math.round(r.dmg * s.c3leech * (m.isPlayer ? 0.6 : 1)));
        if (lvOf('pack_blood') && p.hp < p.d.maxHp * 0.5) leechHeal(Math.round(r.dmg * SKILLS.pack_blood.c3pack.leech(lvOf('pack_blood')) / 100));
      }
    }; }
  { const f0 = RU.afterBasic;
    RU.afterBasic = function (m, res) {
      f0.apply(this, arguments);
      const p = P();
      if (res && !res.miss && res.dmg > 0 && lvOf('pack_blood') && p.hp < p.d.maxHp * 0.5) leechHeal(Math.round(res.dmg * SKILLS.pack_blood.c3pack.leech(lvOf('pack_blood')) / 100));
    }; }
  { const f0 = RU.onKill;
    RU.onKill = function (m) {
      f0.apply(this, arguments);
      if (m.c3shadow) C.shadowDown(m);
    }; }
  { const f0 = RU.castMul; RU.castMul = function (id) { return C.ultOn('tree') ? 0 : f0.apply(this, arguments); }; }
  { const f0 = RU.update;
    RU.update = function () {
      f0.apply(this, arguments);
      const p = P(); if (!p) return;
      if (p.c3ward && (p.c3ward.until <= G.time || !p.buffs.sap_ward)) p.c3ward = null;
      if (p.c3ult && p.c3ult.until <= G.time && !p.c3ult.off) { p.c3ult.off = true; recalc(); }
      C.shadowTick();
    }; }
  // สกิลพิเศษ (special: 'c3_*')
  if (typeof runSpecialSkill === 'function' && !runSpecialSkill._c3) {
    const f0 = runSpecialSkill;
    runSpecialSkill = function (kind, s, lv) { // eslint-disable-line no-global-assign
      if (kind === 'c3_circle') return void C.placeCircle(s, lv, C.tgt);
      if (kind === 'c3_blink') return void C.blink(s, lv);
      if (kind === 'c3_howl') return void C.howl(s, lv);
      if (kind === 'c3_mark') return void C.mark(s, lv, C.tgt);
      return f0.apply(this, arguments);
    };
    runSpecialSkill._c3 = true;
  }
  // ดาเมจที่เราโดน: โล่ Sap Ward ดูดซับก่อน • Unchained 2 วิแรก HP ไม่ต่ำกว่า 1
  if (typeof damagePlayer === 'function' && !damagePlayer._c3) {
    const f0 = damagePlayer;
    damagePlayer = function (dmg, color, src) { // eslint-disable-line no-global-assign
      const p = G.player;
      if (p && !p.dead && dmg > 0) {
        const w = p.c3ward;
        if (w && w.until > G.time && !(p.invulnUntil > G.time)) {
          const take = Math.min(w.hp, dmg); w.hp -= take; dmg -= take;
          if (w.hp <= 0) C.wardBreak();
        }
        if (dmg > 0 && p.c3floorUntil > G.time && dmg >= p.hp && p.hp > 1) { dmg = p.hp - 1; say(p, 'UNBROKEN', '#ffb0b0'); }
      }
      return f0.call(this, dmg, color, src);
    };
    damagePlayer._c3 = true;
  }
  // มึน: Unchained / RAGNARÖK HOWL = กันมึน
  if (typeof stunPlayer === 'function' && !stunPlayer._c3) {
    const f0 = stunPlayer;
    stunPlayer = function () { // eslint-disable-line no-global-assign
      const p = G.player;
      if (p && ((p.buffs.unchained && p.buffs.unchained.until > G.time) || C.ultOn('howl'))) { say(p, 'Unchained', '#ffb0b0'); return; }
      return f0.apply(this, arguments);
    };
    stunPlayer._c3 = true;
  }
  // ไม้ตาย TREE'S COMMAND: ไม่ใช้ SP (ไม่ต้องร่ายอยู่ที่ Runes.castMul)
  if (typeof skillCost === 'function' && !skillCost._c3) {
    const f0 = skillCost;
    skillCost = function () { return C.ultOn('tree') ? 0 : f0.apply(this, arguments); }; // eslint-disable-line no-global-assign
    skillCost._c3 = true;
  }
  if (typeof recalc === 'function' && !recalc._c3) {
    const f0 = recalc;
    recalc = function () { // eslint-disable-line no-global-assign
      const r = f0.apply(this, arguments), p = G.player, d = p && p.d;
      if (d && C.ultOn('howl')) d.leech += K.ult_leech;
      return r;
    };
    recalc._c3 = true;
  }
  // เงาหมาป่า Ember Pack: ระเบิดก่อนหายไป (updateAllies ตัดตัวที่หมดเวลาทิ้งเอง)
  if (typeof updateAllies === 'function' && !updateAllies._c3) {
    const f0 = updateAllies;
    updateAllies = function () { // eslint-disable-line no-global-assign
      for (const a of G.allies) if (a.kind === 'c3wolf' && a.ember && !a.boomed && a.until <= G.time + 0.05) C.wolfBoom(a);
      return f0.apply(this, arguments);
    };
    updateAllies._c3 = true;
  }
  // หมาป่า (คู่ใจ/เงา) กัดเป้าที่ถูกประกาศ (Alpha's Mark) แรงขึ้น
  if (typeof damageMob === 'function' && !damageMob._c3) {
    const f0 = damageMob;
    damageMob = function (m, dmg, opts) { // eslint-disable-line no-global-assign
      if (opts && opts.src === 'wolf_companion' && m && m.c3mark && m.c3mark.until > G.time) dmg = Math.max(1, Math.round(dmg * (1 + m.c3mark.k)));
      return f0.apply(this, [m, dmg, opts]);
    };
    damageMob._c3 = true;
  }

  // ============================================================
  //  Oath (รูนของสกิลติดตัว) + รูนของสกิลประจำตัว ★ — ใช้ระบบ Rune Paths เดิมทั้งหมด
  // ============================================================
  const pc = v => Math.round(v * 100);
  const keepP = id => () => ({ passive: SKILLS[id].passive });
  Runes.add('root_script', [
    { id: 'root_script.fire_tongue', name: 'Fire-Tongue', oath: 'fire', intent: 'pack', glyph: 'ᚲ', col: '#ff9050',
      short: `Oath: all spells burn as Fire ×${pc(K.of_k)}% · ignite ${pc(K.of_burn)}%`,
      desc: () => L(`Oath of Fire-Tongue — ทุกคาถาคิดดาเมจเป็นธาตุไฟ (แรง ${pc(K.of_k)}% ไม่มี Resonance) และมีโอกาส ${pc(K.of_burn)}% ติดไฟ • ศัตรูที่ไหม้อยู่ตาย ไฟลามไปตัวใกล้สุดใน ${K.of_spread} ช่อง`,
        `Oath of Fire-Tongue — every spell deals Fire damage (${pc(K.of_k)}% power, no Resonance) with a ${pc(K.of_burn)}% chance to ignite • a burning enemy that dies spreads the fire to the nearest foe within ${K.of_spread} cells.`),
      mod: keepP('root_script'),
      skillMul(s, m) {
        if (!s.dmg || s.dmg.type !== 'magic') return 1;
        const e0 = elemMod(s.dmg.element || 'neutral', m.def.element), e1 = elemMod('fire', m.def.element);
        return e0 > 0 ? K.of_k * e1 / e0 : K.of_k;
      },
      onAnyHit(m, r, s, lv) { if (s && s.dmg && s.dmg.type === 'magic' && !r.miss && !m.dead) applyStatus(m, { kind: 'burn', chance: () => K.of_burn * 100, dur: () => 3 }, lv, r.dmg); },
      onAnyKill(m) {
        if (!(m.burnUntil > G.time)) return;
        const o = Runes.nearest(m.x, m.y, K.of_spread, [m]); if (!o || o.isPlayer) return;
        o.burnUntil = Math.max(o.burnUntil || 0, G.time + 3); o.burnTick = G.time + 1; o.burnDmg = Math.max(o.burnDmg || 0, m.burnDmg || 1);
        say(o, 'Spread!', '#ffa060');
      } },
    { id: 'root_script.three_tongues', name: 'Three Tongues', oath: 'three', intent: 'single', glyph: 'ᛞ', col: '#c0a8ff',
      short: `Oath: new element +${pc(K.ot_up)}% · same element −${pc(K.ot_down)}%`,
      desc: () => L(`Oath of Three Tongues — แทน Resonance: คาถาที่ธาตุต่างจากลูกก่อนแรง +${pc(K.ot_up)}% แต่ร่ายธาตุซ้ำลูกก่อนเบาลง −${pc(K.ot_down)}% (สายสลับธาตุ ไฟ → น้ำแข็ง → สายฟ้า)`,
        `Oath of Three Tongues — replaces Resonance: a spell of a different element than your last deals +${pc(K.ot_up)}%, repeating the same element deals −${pc(K.ot_down)}% (weave fire → ice → lightning).`),
      mod: keepP('root_script') },
  ]);
  Runes.add('rune_circle', [
    { id: 'rune_circle.snare_glyph', name: 'Snare Glyph', c3: 'snare', intent: 'both', glyph: 'ᛜ', col: '#b0ffc8',
      short: `Roots foes entering ${K.sg_root}s · echo ${pc(K.sg_echo)}% of normal`,
      desc: () => L(`วงรูนกลายเป็นกับดัก: ศัตรูที่เดินเข้าวงถูกตรึง ${K.sg_root} วินาที (บอส/ผู้เล่น: ช้า ${K.sg_root_boss} วิ ครั้งเดียวต่อวง) แต่การระเบิดซ้ำเหลือ ${pc(K.sg_echo)}%`,
        `The circle becomes a snare: enemies that step in are rooted for ${K.sg_root}s (bosses/players: slowed ${K.sg_root_boss}s, once per circle), but the echo drops to ${pc(K.sg_echo)}%.`) },
    { id: 'rune_circle.leyline', name: 'Leyline', c3: 'leyline', intent: 'both', glyph: 'ᛝ', col: '#a0b8ff',
      short: `A ${K.ley_r}-cell circle that follows you · echo ${pc(K.ley_echo)}% of normal`,
      desc: () => L(`วงรูนเล็กรัศมี ${K.ley_r} ช่อง เดินตามตัวเรา (มีได้ทีละวง) — ศัตรูที่เข้ามาประชิดโดนระเบิดซ้ำ (เหลือ ${pc(K.ley_echo)}% ของวงปกติ) ไม่ต้องวางล่วงหน้า`,
        `A small ${K.ley_r}-cell circle that follows you (one at a time) — enemies that close in take the echo (${pc(K.ley_echo)}% of a normal circle's), no planning needed.`) },
  ]);
  Runes.add('pack_blood', [
    { id: 'pack_blood.pack', name: 'Of the Pack', oath: 'pack', intent: 'pack', glyph: 'ᚹ', col: '#ff8a5a',
      short: `Oath: Howl calls ${K.op_n} wolves · your hits −${pc(K.op_self)}%`,
      desc: () => L(`Oath of the Pack — Howl of the Pack เรียกเงาหมาป่า ${K.op_n} ตัว (แทน 3) แต่ดาเมจของตัวเราเบาลง ${pc(K.op_self)}%`,
        `Oath of the Pack — Howl of the Pack calls ${K.op_n} shadow wolves (instead of 3), but your own damage is ${pc(K.op_self)}% lower.`),
      mod: keepP('pack_blood'),
      skillMul(s) { return s.dmg ? 1 - K.op_self : 1; },
      basicMul() { return 1 - K.op_self; } },
    { id: 'pack_blood.lone_wolf', name: 'Lone Wolf', oath: 'lone', intent: 'single', glyph: 'ᛟ', col: '#ffc070',
      short: `Oath: no wolves · basic hits ${pc(K.ol_ch)}% strike again`,
      desc: () => L(`Oath of the Lone Wolf — Howl ไม่เรียกหมาป่า กลายเป็นเสียงหอนของหมาป่าเดียวดาย (ASPD +${K.ol_aspd}% 10 วิ) • ตีปกติทุกครั้งมีโอกาส ${pc(K.ol_ch)}% ตีซ้ำ (${pc(K.ol_k)}%)`,
        `Oath of the Lone Wolf — Howl calls no wolves; it becomes a lone howl (ASPD +${K.ol_aspd}% for 10s) • every basic hit has a ${pc(K.ol_ch)}% chance to strike again (${pc(K.ol_k)}%).`),
      mod: keepP('pack_blood'),
      afterBasic(m, res) {
        if (!res || res.miss || m.dead || !U.chance(K.ol_ch)) return;
        later(0.12, () => { if (m.dead) return; const r = physHit(m, masteryMul('attack') * K.ol_k * markK(m) * C.packMul()); applyHit(m, r, { src: 'attack', sfx: 'slash' }); if (!fast()) say(m, 'LONE STRIKE', '#ffc070'); });
      } },
  ]);
  Runes.add('howl_of_the_pack', [
    { id: 'howl_of_the_pack.single_alpha', name: 'Single Alpha', c3: 'alpha', intent: 'single', glyph: '🐺', col: '#ffb080',
      short: `One big wolf ×${K.sa_pow} power, sticks to your target`,
      desc: () => L(`เรียกเงาหมาป่าจ่าฝูงตัวเดียว ตัวใหญ่ แรง ×${K.sa_pow} ของตัวปกติ เกาะเป้าของเราตลอด`,
        `Calls a single great alpha wolf with ×${K.sa_pow} the power of a normal shadow wolf; it stays on your target.`) },
    { id: 'howl_of_the_pack.ember_pack', name: 'Ember Pack', c3: 'ember', intent: 'pack', glyph: '✹', col: '#ff8040',
      short: `Wolves explode on expiry: ${K.ep_r}-cell fire, ${pc(K.ep_boom)}%`,
      desc: () => L(`เงาหมาป่าระเบิดเป็นไฟตอนหมดเวลา รัศมี ${K.ep_r} ช่อง ตัวละ ${pc(K.ep_boom)}% ATK ธาตุไฟ`,
        `Shadow wolves burst into fire when they expire: ${K.ep_r}-cell radius, ${pc(K.ep_boom)}% ATK Fire each.`) },
  ]);

  // ============================================================
  //  ไม้ตายตัวเลือกที่ 4 (Feel.ULTS — ผูก Class ด้วย job)
  // ============================================================
  if (typeof Feel !== 'undefined' && Feel.ULTS) {
    Feel.ULTS.tree = { job: 'runelord', name: "TREE'S COMMAND", th: L('คำสั่งของต้นไม้', "Tree's Command"),
      desc: L(`${K.ult_tree} วินาที: ร่ายทันที (ไม่ต้องร่าย) และไม่ใช้ SP`, `${K.ult_tree}s: instant casts and no SP cost`),
      fire(p, col) { p.c3ult = { kind: 'tree', until: G.time + K.ult_tree }; addFloater(p.x, p.y - 2, "TREE'S COMMAND!", col || '#7fe8ff', true); if (!fast()) C.fx({ kind: 'tree', ref: p, dur: K.ult_tree }); } };
    Feel.ULTS.howl = { job: 'packlord', name: 'RAGNARÖK HOWL', th: L('เสียงหอนแรกนาร็อก', 'Ragnarök Howl'),
      desc: L(`${K.ult_howl} วินาที: เงาหมาป่าเพิ่ม ${K.ult_howl_n} ตัว + ดูดเลือด ${K.ult_leech}% + กันมึน`, `${K.ult_howl}s: ${K.ult_howl_n} extra shadow wolves + ${K.ult_leech}% lifesteal + stun immunity`),
      fire(p, col) {
        p.c3ult = { kind: 'howl', until: G.time + K.ult_howl };
        C.wolves(K.ult_howl_n, Math.max(1, lvOf('howl_of_the_pack')), SKILLS.howl_of_the_pack.c3wolves.pow(Math.max(1, lvOf('howl_of_the_pack'))), K.ult_howl, { ult: 1 });
        recalc(); addFloater(p.x, p.y - 2, 'RAGNARÖK HOWL!', col || '#ff6a2a', true);
        if (!fast()) C.fx({ kind: 'howl', ref: p, dur: 1.2, big: 1 });
      } };
  }

  // ============================================================
  //  เควสต์ทดสอบ: "ความคิดสุดท้าย" → ดวลเงาแม่พิมพ์ → ยกระดับที่ Mimir
  // ============================================================
  const NB = s => (typeof B === 'function' ? B(s) : `<b>${s}</b>`);
  C.TRIAL = {
    runelord: { npc: 'muninn', map: 'archive', place: 'Archive Depths', who: 'Muninn Raven-Courier',
      thought: L('"ชั้นวางนี้ต้องการตราผนึกใหม่ — ไม่ได้เขียนด้วยความจำ แต่เขียนด้วยความคิด"', '"This shelf needs a new seal — written not with memory, but with thought."'),
      meet: L(`กา! Huginn ฝากความคิดชิ้นหนึ่งไว้กับข้าก่อนบินขึ้นไปหา Mimir — ${NB('"ชั้นวางนี้ต้องการตราผนึกใหม่ ไม่ได้เขียนด้วยความจำ แต่เขียนด้วยความคิด"')}<br>เขียนรูนแรกลงบนชั้นวางสิ... (เงาบนชั้นวางขยับ) กา! กา! นั่นร่างของเจ้าเอง!`,
        `Caw! Huginn left a thought with me before flying up to Mimir — ${NB('"This shelf needs a new seal, written not with memory, but with thought."')}<br>Write the first rune on the shelf... (the shadow on the shelf moves) Caw! Caw! That's YOU!`) },
    packlord: { npc: 'sigrun', map: 'wolfwood', place: 'Wolfwood', who: 'Sigrún',
      thought: L('"ฝูงไม่ได้ต้องการผู้ที่แข็งแรงที่สุด — มันต้องการผู้ที่ตอบเสียงหอน"', '"The pack does not need the strongest — it needs the one who answers the howl."'),
      meet: L(`ได้ยินไหม... Fenrir Unit ทุกตัวหันไปทางเหนือแล้วหอนพร้อมกัน ข้าล้มมาพันกว่าครั้ง ไม่เคยได้ยินฝูงหอนแบบนี้<br>${NB('"ฝูงไม่ได้ต้องการผู้ที่แข็งแรงที่สุด — มันต้องการผู้ที่ตอบเสียงหอน"')} — ตอบมันสิ... (เงาที่ยาวเกินตัวเจ้าลุกขึ้นจากพื้น)`,
        `Do you hear it... every Fenrir Unit turned north and howled at once. I've fallen over a thousand times and never heard a pack howl like this.<br>${NB('"The pack does not need the strongest — it needs the one who answers the howl."')} — answer it... (a shadow longer than your own rises from the ground)`) },
  };
  C.startTrial = job => {
    const p = P(), st = C.st(p);
    if (!C.isThird(job) || THIRD_JOBS[p.job] !== job || !C.req(p).ok) return false;
    st.trial = { job, stage: 'seek' };
    UI.msg(L(`✦ เควสต์ทดสอบ Class 3: ไปหา ${C.TRIAL[job].who} ที่ ${C.TRIAL[job].place} — เดินตามความคิดสุดท้ายของแม่พิมพ์`, `✦ Class 3 trial: find ${C.TRIAL[job].who} in ${C.TRIAL[job].place} — follow the mold's last thought.`), 'lvl');
    saveGame(); UI.dirty();
    return true;
  };
  C.trial = () => { const p = G.player; return p ? C.st(p).trial : null; };
  // เงาแม่พิมพ์: ร่างเงาของ Class 2 ตัวเอง (ไม่อยู่ใน MOBS — ไม่โผล่ในสมุดมอน/กาชา/ดรอป) • ไม่มี EXP/ดรอป (minion)
  C.shadowDef = p => {
    const par = p.job, magic = jobRoot(par) === 'runecaster' || jobRoot(par) === 'volva';
    return { id: 'c3_shadow', name: `Mould Shadow · ${JOBS[par].name}`, lv: 70, hp: Math.round(14000 + p.d.maxHp * 1.5), atk: magic ? [190, 250] : [215, 275], def: 35, mdef: 35, vit: 60,
      flee: 95, hit: 175, exp: 0, jexp: 0, zeny: [0, 0], speed: 2.3, aggro: true, element: 'shadow', race: 'demon', drops: [], range: magic ? 4 : 1, atkDelay: 1.6,
      boss: true, bossSkill: 'c3_echo', scale: 1, shadowJob: par, magic };
  };
  C.spawnShadow = () => {
    const p = P(), tr = C.trial(); if (!tr) return null;
    G.mobs.filter(m => m.c3shadow).forEach(m => { m.dead = true; });
    G.mobs = G.mobs.filter(m => !m.c3shadow);
    let pos = null;
    for (let i = 0; i < 24 && !pos; i++) { const a = i / 24 * Math.PI * 2, x = Math.floor(p.x + Math.cos(a) * 3), y = Math.floor(p.y + Math.sin(a) * 3); if (G.map.walkable(x, y) && !G.map.portalAt(x, y)) pos = { x, y }; }
    const m = spawnMob(G.mobs.length && G.mobs[0].def && MOBS[G.mobs[0].def.id] ? G.mobs[0].def.id : Object.keys(MOBS)[0], pos || { x: Math.floor(p.x) + 1, y: Math.floor(p.y) });
    const d = C.shadowDef(p);
    m.def = d; m.hp = m.maxHp = d.hp; m.minion = true; m.master = m; m.c3shadow = tr.job; // minion = ไม่มี EXP/ดรอป/สมุดมอน • master = ตัวเอง (BossKit ไม่สลายทิ้ง เว้นแต่หลุดการไล่นาน) m.state = 'chase'; m.emoteUntil = G.time + 1; m.nextAtk = G.time + 1.5; m.nextBossSkill = G.time + 4;
    m.speech = { text: L('...ข้าคือสิ่งที่เจ้าเคยเป็น', '...I am what you were.'), until: G.time + 3 };
    tr.stage = 'duel';
    if (!fast()) { C.fx({ kind: 'spawn', x: m.x, y: m.y, dur: 1.0, big: 1 }); UI.announce(L(`⚔ เงาแม่พิมพ์ ${JOBS[p.job].name} ลุกขึ้นแล้ว!`, `⚔ The Mould Shadow of ${JOBS[p.job].name} rises!`)); Sound.play('mvp'); }
    return m;
  };
  C.shadowDown = m => {
    const tr = C.trial(); if (!tr || tr.job !== m.c3shadow) return;
    tr.stage = 'ascend';
    UI.announce(L('✦ ความคิดสุดท้ายนิ่งลงในร่างของเจ้า ✦', '✦ The last thought settles into your frame ✦'));
    UI.msg(L(`✦ ชนะเงาแม่พิมพ์แล้ว — กลับไปหา Mimir AI ที่นีโอเอลด์ไฮม์ เพื่อยกระดับเป็น ${JOBS[tr.job].name}`, `✦ The Mould Shadow is defeated — return to Mimir AI in Neo Eldheim to ascend into ${JOBS[tr.job].name}.`), 'lvl');
    if (!fast()) { Sound.play('levelup'); C.fx({ kind: 'spawn', x: m.x, y: m.y, dur: 1.2, big: 1 }); }
    saveGame(); UI.dirty();
  };
  C.shadowTick = () => {
    const p = P(), sh = G.mobs.find(m => m.c3shadow && !m.dead); if (!sh) return;
    if (p.dead || U.dist(sh.x, sh.y, p.x, p.y) > 18) { sh.dead = true; G.mobs = G.mobs.filter(m => m !== sh); UI.msg(L('เงาแม่พิมพ์สลายไป — คุยกับ NPC อีกครั้งเพื่อท้าใหม่', 'The Mould Shadow fades — talk to the NPC again to retry.'), 'info'); }
  };
  // ท่าของเงา: เลียนสกิลประจำ Class 2 (เวท = วงตกใส่เรา • ประชิด = วงกวาดรอบตัว) — หลบได้ทุกท่า (telegraph)
  if (typeof BOSS_SKILLS !== 'undefined') BOSS_SKILLS.c3_echo = m => {
    const p = G.player, magic = m.def.magic;
    const x = magic ? p.x : m.x, y = magic ? p.y : m.y, r = 2.5;
    m.speech = { text: magic ? L('รูนของเจ้า... ข้าก็ร้องได้', 'Your runes... I can chant them too.') : L('ขวานของเจ้า... ข้าก็เหวี่ยงได้', 'Your axe... I can swing it too.'), until: G.time + 2 };
    telegraph(m, { shape: 'circle', x, y, r, dur: 1.2 }, () => { damagePlayer(bossDmg(m, 1.5, magic), magic ? '#c080ff' : '#ff8060'); },
      () => addFx({ type: magic ? 'firering' : 'whirl', x, y, dur: 0.55, r }));
  };
  if (typeof BossKit !== 'undefined' && BossKit.KITS) BossKit.KITS.c3_shadow = { col: '170,120,255', hex: '#b080ff', rot: ['c3_echo', 'slam', 'c3_echo', 'shockwave'], wbRot: ['c3_echo', 'slam', 'shockwave'], ult: null, minions: [], elite: null, cry: L('เงาไม่ต้องการพวก', 'A shadow needs no allies') };
  C.ascend = job => {
    const p = P(), st = C.st(p);
    if (THIRD_JOBS[p.job] !== job || !C.req(p).ok || st.trial?.job !== job || st.trial?.stage !== 'ascend') return false;
    changeJob(job);
    if (!st.done.includes(job)) st.done.push(job);
    st.trial = null;
    saveGame();
    return true;
  };

  // ---------- บทพูด ----------
  const mimirWrap = () => {
    const m0 = NPC.scripts.jobmaster; if (!m0 || m0._c3) return;
    const fn = async n => {
      const p = G.player, nm = `[${n.name}]`, rq = C.req(p), tr = C.trial();
      if (rq.ok && tr && tr.job === rq.next && tr.stage === 'ascend') {
        const J = JOBS[tr.job];
        UI.illust(Art.jobKey(tr.job, p.gender));
        const ok = await UI.menu(nm, L(`เจ้าชนะเงาของตัวเองแล้ว... ความคิดสุดท้ายของวีรชนนิ่งพอจะยึดร่าง<br><b>${J.name}</b> — ${J.thai}<br>${J.desc}<br><br>สกิลใหม่: ${J.skills.map(id => SKILLS[id].name).join(', ')}<br>สกิลและอาวุธของ ${JOBS[p.job].name} และ ${JOBS[jobRoot(p.job)].name} ยังอยู่ครบ • แต้มสกิลที่เหลือยกมาด้วย<br><br>รับความคิดนี้ลงร่างหรือไม่? (ย้อนกลับไม่ได้)`,
          `You have defeated your own shadow... the hero's last thought is still enough to take hold.<br><b>${J.name}</b> — ${J.thai}<br>${J.desc}<br><br>New skills: ${J.skills.map(id => SKILLS[id].name).join(', ')}<br>${JOBS[p.job].name} and ${JOBS[jobRoot(p.job)].name} skills and weapons remain • unspent skill points carry over.<br><br>Receive this thought into your frame? (This cannot be undone.)`),
          [L('รับความคิด!', 'Receive the thought!'), L('ไว้ก่อน', 'Not yet')]);
        UI.illust(`npc_${n.id}`);
        if (ok !== 0) return;
        C.ascend(tr.job);
        UI.illust(Art.jobKey(p.job, p.gender));
        await UI.say(nm, L(`ชั้นที่สามตื่นแล้ว — ตอนนี้เจ้าคือ ${NB(J.name)}<br>Job Level เริ่มใหม่ที่ 1 ถึง ${J.jobMax} (${J.jobMax - 1} แต้มใหม่ — เลือกบิลด์ของเจ้า) • สกิลติดตัวมี ${NB('Oath')} 2 แบบ เปลี่ยนได้ที่ Runes (Shift+R)<br>ไม้ตายแบบใหม่รออยู่ในปุ่ม ULT (คลิกขวา/กดค้างเพื่อเลือก)`,
          `The third tier has woken — you are now ${NB(J.name)}.<br>Job Level restarts at 1 up to ${J.jobMax} (${J.jobMax - 1} new points — choose your build) • your passive has 2 ${NB('Oaths')}, swap them in Runes (Shift+R).<br>A new ultimate awaits on the ULT button (right-click/hold to choose).`));
        UI.illust(`npc_${n.id}`);
        await UI.say(nm, L('(Mimir มองไปทางเหนือ) ...Huginn ยังมีเศษความคิดเหลืออีกสี่ชิ้น ข้าจะถอดให้ครบ — แต่ทำไมทุกชิ้นถึงอุ่นเหมือนเพิ่งถูกคิดเมื่อเช้านี้', '(Mimir looks north) ...Huginn still carries four more shards. I will decode them all — but why is every shard warm, as if it were thought only this morning?'));
        return;
      }
      if (rq.ok && !(tr && tr.job === rq.next)) {
        const J = JOBS[rq.next];
        await UI.say(nm, L(`${p.name}... เมื่อคืน ${NB('Huginn')} บินกลับมาจากทางเหนือ — กาส่ง "ความคิด" ที่ข้าคิดว่าหายไปแล้ว ปากมันคาบ ${NB('เศษความคิดหกชิ้น')} มาจากปลายกิ่งที่หัก<br>Class 1 คือท่าของวีรชน Class 2 คือชั้นที่ซ่อนอยู่ แต่สิ่งที่ข้าไม่เคยเก็บได้คือ ${NB('สิ่งที่พวกเขาคิดตอนรุ่งเช้าก่อนล้ม')}`,
          `${p.name}... last night ${NB('Huginn')} flew back from the north — the raven of "thought" I believed lost. In its beak: ${NB('six shards of thought')} from the tip of the broken branch.<br>Class 1 was the heroes' technique, Class 2 the hidden layer — but what I could never keep was ${NB('what they thought at dawn, before they fell')}.`));
        UI.illust(Art.jobKey(rq.next, p.gender));
        const c = await UI.menu(nm, L(`ชิ้นหนึ่งตรงกับแม่พิมพ์ของเจ้า — ${NB(J.name)} (${J.thai})<br>${J.desc}<br><br>แต่ความคิดเอาใส่ร่างตรง ๆ ไม่ได้ เจ้าต้อง ${NB('เดินตามความคิดนั้นให้ครบ')} ก่อน: ไปหา ${NB(C.TRIAL[rq.next].who)} ที่ ${NB(C.TRIAL[rq.next].place)}`,
          `One shard matches your mold — ${NB(J.name)} (${J.thai})<br>${J.desc}<br><br>But a thought cannot simply be poured into a frame. You must ${NB('follow that thought to its end')} first: find ${NB(C.TRIAL[rq.next].who)} in ${NB(C.TRIAL[rq.next].place)}.`),
          [L('เดินตามความคิด (เริ่มเควสต์ทดสอบ)', 'Follow the thought (start the trial)'), L('เรื่องอื่น', 'Something else')]);
        UI.illust(`npc_${n.id}`);
        if (c === 0) { C.startTrial(rq.next); return; }
        return m0(n);
      }
      if (rq.next && tr && tr.job === rq.next) {
        await UI.say(nm, L(`ความคิดยังรอเจ้าอยู่ — ${NB(C.TRIAL[tr.job].who)} ที่ ${NB(C.TRIAL[tr.job].place)}${tr.stage === 'duel' ? ' (เงาแม่พิมพ์ยังไม่ถูกปราบ)' : ''}`, `The thought still waits for you — ${NB(C.TRIAL[tr.job].who)} in ${NB(C.TRIAL[tr.job].place)}${tr.stage === 'duel' ? ' (the Mould Shadow still stands)' : ''}.`));
        return m0(n);
      }
      if (JOBS[p.job] && JOBS[p.job].tier === 2 && rq.story && !rq.ok) {
        await UI.say(nm, L(rq.next ? `Huginn กลับมาพร้อมความคิดของแม่พิมพ์ ${NB(JOBS[p.job].name)} — ชั้นที่สาม (${NB(JOBS[rq.next].name)}) จะยึดร่างได้เมื่อเจ้ามี ${NB('Base Lv ' + THIRD_JOB_REQ.base)} และ ${NB('Job Lv ' + THIRD_JOB_REQ.job)} (ตอนนี้ ${p.baseLv} / ${p.jobLv})`
          : `Huginn กลับมาพร้อมเศษความคิดหกชิ้น แต่ชิ้นของแม่พิมพ์ ${NB(JOBS[p.job].name)} ข้ายังถอดไม่ออก — ให้เวลาข้าอีกหน่อย`,
        rq.next ? `Huginn returned with the thought of the ${NB(JOBS[p.job].name)} mold — the third tier (${NB(JOBS[rq.next].name)}) can take hold once you reach ${NB('Base Lv ' + THIRD_JOB_REQ.base)} and ${NB('Job Lv ' + THIRD_JOB_REQ.job)} (currently ${p.baseLv} / ${p.jobLv}).`
          : `Huginn returned with six shards of thought, but the one for the ${NB(JOBS[p.job].name)} mold I have not decoded yet — give me a little more time.`));
      }
      return m0(n);
    };
    fn._c3 = true;
    NPC.scripts.jobmaster = fn;
  };
  // NPC หนึ่งตัวรับได้หลาย Class (Sigrún = Packlord/Jarl/Huntmaster) — เลือกบทจากเควสต์ที่ถืออยู่ ไม่ผูกกับ job ตอนห่อ
  const trialNpcWrap = id => {
    const s0 = NPC.scripts[id]; if (s0 && s0._c3) return;
    const fn = async n => {
      const tr = C.trial(), T = tr && C.TRIAL[tr.job];
      if (T && T.npc === id && (tr.stage === 'seek' || (tr.stage === 'duel' && !G.mobs.some(m => m.c3shadow && !m.dead)))) {
        const c = await UI.menu(`[${n.name}]`, T.meet, [L('ท้าเงาแม่พิมพ์!', 'Face the Mould Shadow!'), L('ยังไม่พร้อม', 'Not ready yet')]);
        if (c === 0) { UI.dlgClose(); C.spawnShadow(); }
        return;
      }
      return s0 ? s0(n) : undefined;
    };
    fn._c3 = true;
    NPC.scripts[id] = fn;
  };
  C.install = () => {
    if (typeof NPC === 'undefined') return;
    mimirWrap();
    for (const job in C.TRIAL) trialNpcWrap(C.TRIAL[job].npc);
  };
  C.install();

  // ============================================================
  //  บอท (AUTO) + Battle Script: บทบาทของสกิลใหม่ + จังหวะใช้
  // ============================================================
  if (typeof Bot !== 'undefined') {
    const role0 = Bot.role;
    Bot.role = function (id) {
      const s = skillDef(id);
      if (s) {
        if (s.special === 'c3_circle') return 'zone';
        if (s.special === 'c3_blink') return 'other';
        if (s.special === 'c3_mark') return 'debuff';
        if (s.c3unchained) return 'other';
        if (s.special === 'c3_howl') { // เรียกเงาหมาป่าเมื่อกำลังสู้เท่านั้น (อยู่ 10 วิ)
          const p = G.player;
          return G.mobs.some(m => !m.dead && !m.def.dummy && (m.state === 'chase' || m === p.target) && U.dist(m.x, m.y, p.x, p.y) < 7) ? 'summon' : 'other';
        }
      }
      return role0.apply(this, arguments);
    };
    const pick0 = Bot.pickSkill;
    Bot.pickSkill = function (t, threats, hpPct, spPct) {
      const p = G.player;
      if (lvOf('unchained') && hpPct < 35 && threats.length && this.canCast('unchained')) return 'unchained';
      if (t && lvOf('rune_circle') && this.canCast('rune_circle') && !C.circleAt(t) && !(skillDef('rune_circle').rune && skillDef('rune_circle').rune.c3 === 'leyline' && C.circles().some(z => z.ley))
        && (t.hp > this.basicEst(t) * 8 || threats.length >= 3) && U.dist(t.x, t.y, p.x, p.y) <= 9.5) return 'rune_circle';
      if (t && lvOf('alphas_mark') && this.canCast('alphas_mark') && !(t.c3mark && t.c3mark.until > G.time + 1) && t.hp > this.basicEst(t) * 6) return 'alphas_mark';
      return pick0.apply(this, arguments);
    };
  }

  // ============================================================
  //  ภาพ: ภาพ Class/ตรา/ไอคอนสกิล ย้อมจาก Class 2 (จนกว่าจะมีไฟล์จริง) • เอฟเฟกต์วาดด้วยโค้ด
  // ============================================================
  if (typeof Art !== 'undefined') {
    const ART = { runelord: ['galdr', { hue: -18, sat: 1.25, bri: 1.06, tint: ['#5ad8ff', 0.18] }], packlord: ['warlord', { hue: -8, sat: 1.3, bri: 0.92, tint: ['#ff4a10', 0.2] }] };
    for (const [id, [base, spec]] of Object.entries(ART)) {
      for (const g of ['f', 'm']) Art.alias(`job_${id}_${g}`, `job_${base}_${g}`, Object.assign({ flip: true }, spec));
      Art.alias(`emblem_${id}`, `emblem_${base}`, spec);
    }
    // ไอคอนสกิล: ย้อมจากไอคอนพรีเมียมที่ใกล้เคียง (สีประจำ Class + เหลื่อมทีละสกิล) + ป้าย III ใน UI (css/class3.css)
    const SRC = {
      runelord: [['root_script', 'galdr_focus', 160], ['rune_circle', 'runic_ward', -40], ['ragnarok_verse', 'meteor_rune', -20], ['odins_spear_rune', 'holy_spear', 10], ['sap_ward', 'rune_barrier', 120], ['blink_glyph', 'shadow_step', 200]],
      packlord: [['pack_blood', 'berserk_soul', -10], ['howl_of_the_pack', 'howl', -30], ['jaws_of_fenrir', 'fang_of_fenrir', -20], ['wolfstorm_cleave', 'ragnarok_cleave', 15], ['alphas_mark', 'skadis_mark', 200], ['unchained', 'blood_frenzy', -25]],
    };
    for (const job in SRC) SRC[job].forEach(([id, from, hue], i) => Art.alias('skill_' + id, 'skill_' + from, { hue, sat: 1.2, bri: i % 2 ? 1.0 : 1.08, flip: i % 2 === 0, tint: [JOBS[job].glow, 0.12] }));
  }
  if (typeof CLASSBOOK !== 'undefined') Object.assign(CLASSBOOK, {
    runelord: { diff: 3, weapon: 'Rod', stats: [['int', 60], ['dex', 30], ['vit', 10]],
      build: [['root_script', 5], ['rune_circle', 5], ['odins_spear_rune', 5], ['ragnarok_verse', 5], ['sap_ward', 4], ['blink_glyph', 1]],
      play: L('วาง Rune Circle ใต้ฝูงก่อน แล้วร่าย Ragnarok Verse / Meteor ให้ตกในวง (ระเบิดซ้ำ) • สลับธาตุไฟ → น้ำแข็ง → สายฟ้าให้ติด Resonance • โดนประชิด Blink Glyph กลับเข้าวง',
        'Place a Rune Circle under the pack first, then drop Ragnarok Verse / Meteor inside it (echo) • weave fire → ice → lightning for Resonance • when caught, Blink Glyph back into a circle.'),
      pros: L('ดาเมจวงกว้างสูงสุดเมื่อวางแผนก่อน', 'Top area damage when you plan ahead'), cons: L('ต้องวางวงก่อน ร่ายนาน ตัวบาง', 'Needs set-up, long casts, fragile'),
      tips: L('Oath of Three Tongues = สายเป้าเดี่ยว/บอส • Oath of Fire-Tongue = ฟาร์มฝูง (ระวังมอนธาตุไฟ)', 'Oath of Three Tongues for single targets/bosses • Oath of Fire-Tongue for packs (mind fire-element foes).') },
    packlord: { diff: 2, weapon: 'Axe', stats: [['str', 50], ['agi', 35], ['vit', 15]],
      build: [['pack_blood', 5], ['howl_of_the_pack', 5], ['jaws_of_fenrir', 5], ['wolfstorm_cleave', 5], ['alphas_mark', 4], ['unchained', 1]],
      play: L('ลงกลางวงล้อม (Pack Blood ยิ่งรุมยิ่งแรง) หอนเรียกเงาหมาป่า ประกาศเป้าด้วย Alpha\'s Mark แล้วกัดด้วย Jaws of Fenrir • โดนมึน/เลือดใกล้หมด Unchained',
        "Dive into the ring (Pack Blood grows with every foe), howl for shadow wolves, mark the prey with Alpha's Mark, then bite with Jaws of Fenrir • stunned or nearly dead: Unchained."),
      pros: L('ยิ่งโดนล้อมยิ่งแรง ดูดเลือดได้ หมาช่วยตี', 'Stronger when surrounded, lifesteal, wolves help'), cons: L('เป้าเดี่ยวไม่เด่นถ้าไม่มี Oath', 'Single target is plain without an Oath'),
      tips: L('Oath of the Pack = ฟาร์มฝูง • Oath of the Lone Wolf = บอส/ดวล', 'Oath of the Pack for packs • Oath of the Lone Wolf for bosses/duels.') },
  });

  // ---------- เอฟเฟกต์ (วาดเอง: วงรูน / ระลอกบทแรกนาร็อก / ระเบิดซ้ำ / เงาหมาป่า / วาร์ป / ประกาศเป้า) ----------
  C.fx = f => {
    if (fast()) return { t: 0, dur: 0 };
    f.c3 = 1; f.type = 'c3'; f.t = 0; f.linger = 0; f.seed = (Math.random() * 1e6) | 0;
    G.fx.push(f); return f;
  };
  const RUNES_TXT = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
  const gEll = (g, x, y, rx, ry) => { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, 7); };
  C.drawGround = (g, f, t) => { // วงรูนบนพื้น (ใต้ตัวละคร)
    const o = f.ref || f, X = o.x * TILE, Y = o.y * TILE * R.K, k = Math.min(1, f.t / Math.max(0.001, f.dur));
    const a = Math.min(1, f.t / 0.25) * Math.min(1, (1 - k) * 6), rr = f.r * TILE, col = f.col, spin = t * 0.6 + f.seed;
    g.save(); g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(X, Y, rr * 0.2, X, Y, rr);
    gr.addColorStop(0, `rgba(${col},${0.02 * a})`); gr.addColorStop(0.75, `rgba(${col},${0.10 * a})`); gr.addColorStop(1, `rgba(${col},${0.22 * a})`);
    g.fillStyle = gr; g.save(); g.translate(X, Y); g.scale(1, R.K); g.beginPath(); g.arc(0, 0, rr, 0, 7); g.fill(); g.restore();
    g.lineWidth = 2.5; g.strokeStyle = `rgba(${col},${0.85 * a})`; gEll(g, X, Y, rr, rr * R.K); g.stroke();
    g.lineWidth = 1.2; g.strokeStyle = `rgba(255,236,170,${0.55 * a})`; gEll(g, X, Y, rr * 0.86, rr * 0.86 * R.K); g.stroke();
    g.strokeStyle = `rgba(${col},${0.5 * a})`; gEll(g, X, Y, rr * 0.42, rr * 0.42 * R.K); g.stroke();
    // เส้นอาคมโค้งรอบขอบ เว้นกลางวงให้เห็นเป้าและพื้นที่เล่นชัด
    g.lineWidth=1.2;g.strokeStyle=`rgba(${col},${.4*a})`;
    g.save();g.translate(X,Y);g.scale(1,R.K);
    for(let i=0;i<3;i++){const an=spin+i*Math.PI*2/3;g.beginPath();g.arc(0,0,rr*.69,an,an+1.4);g.stroke();}
    g.restore();
    // อักษรรูนวนรอบขอบ
    const n = Math.max(8, Math.round(f.r * 6));
    g.font = `700 ${Math.round(10 + f.r * 1.5)}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const an = -spin * 0.8 + i / n * Math.PI * 2, x = X + Math.cos(an) * rr * 0.93, y = Y + Math.sin(an) * rr * 0.93 * R.K, tw = 0.6 + 0.4 * Math.sin(t * 3 + i);
      g.fillStyle = `rgba(${col},${a * tw})`; g.fillText(RUNES_TXT[(i + f.seed) % RUNES_TXT.length], x, y);
    }
    // ประกายลอยขึ้น
    for (let i = 0; i < 7; i++) {
      const q = (t * 0.7 + U.hash2(i, 5, f.seed)) % 1, an = U.hash2(i, 9, f.seed) * 6.283, d = rr * (0.2 + 0.7 * U.hash2(i, 2, f.seed));
      g.fillStyle = `rgba(${col},${(1 - q) * 0.8 * a})`; g.beginPath(); g.arc(X + Math.cos(an) * d, Y + Math.sin(an) * d * R.K - q * 30, 2.2, 0, 7); g.fill();
    }
    g.restore();
  };
  C.draw = (g, f, t) => {
    if (f.ground) return; // วาดแล้วในชั้นพื้น
    const k = Math.min(1, f.t / Math.max(0.001, f.dur)), o = f.ref || f, X = o.x * TILE, Y = o.y * TILE * R.K;
    g.save(); g.globalCompositeOperation = 'lighter';
    if (f.kind === 'verse') { // ระลอกธาตุตกจากฟ้า + วงกระแทก
      const rr = f.r * TILE, n = 10;
      for (let i = 0; i < n; i++) {
        const an = U.hash2(i, 1, f.seed) * 6.283, d = rr * Math.sqrt(U.hash2(i, 2, f.seed)), x = X + Math.cos(an) * d, y = Y + Math.sin(an) * d * R.K;
        const q = Math.min(1, Math.max(0, (k - U.hash2(i, 3, f.seed) * 0.35) / 0.4));
        if (q <= 0) continue;
        if (q < 1) { g.strokeStyle = `rgba(${f.col},0.9)`; g.lineWidth = f.el === 'wind' ? 2 : 4; g.beginPath(); g.moveTo(x + 40 * (1 - q), y - 260 * (1 - q) - 30); g.lineTo(x + 40 * (1 - q) - 6, y - 260 * (1 - q) + 10); g.stroke(); }
        else { const z = Math.min(1, (k - 0.4) / 0.6); g.fillStyle = `rgba(${f.col},${0.6 * (1 - z)})`; gEll(g, x, y, 10 + 22 * z, (10 + 22 * z) * R.K); g.fill(); }
      }
      g.strokeStyle = `rgba(${f.col},${(1 - k) * 0.8})`; g.lineWidth = 3; gEll(g, X, Y, rr * (0.6 + 0.4 * k), rr * (0.6 + 0.4 * k) * R.K); g.stroke();
    } else if (f.kind === 'echo') { // ระเบิดซ้ำในวง
      const by = Y - 22 * ((o.def && o.def.scale) || 1), rr = 8 + 26 * k;
      g.strokeStyle = `rgba(140,244,255,${1 - k})`; g.lineWidth = 2.5; g.beginPath(); g.arc(X, by, rr, 0, 7); g.stroke();
      g.font = '700 15px serif'; g.textAlign = 'center'; g.fillStyle = `rgba(200,250,255,${1 - k})`; g.fillText(RUNES_TXT[f.seed % RUNES_TXT.length], X, by - 10 * k);
    } else if (f.kind === 'blink') {
      const rr = 26 * (f.arrive ? 1 - k : k) + 6;
      g.strokeStyle = `rgba(176,160,255,${1 - k})`; g.lineWidth = 3; gEll(g, X, Y, rr, rr * R.K); g.stroke();
      for (let i = 0; i < 8; i++) { const an = i / 8 * 6.283 + f.seed; g.fillStyle = `rgba(200,190,255,${1 - k})`; g.beginPath(); g.arc(X + Math.cos(an) * rr, Y - 20 - k * 30 + Math.sin(an) * 6, 2.5, 0, 7); g.fill(); }
    } else if (f.kind === 'spawn') { // ควันเงา/ไฟลุกตอนเรียก
      const rr = (f.big ? 40 : 22) * (0.4 + k);
      g.fillStyle = `rgba(255,110,40,${0.35 * (1 - k)})`; gEll(g, X, Y, rr, rr * R.K); g.fill();
      for (let i = 0; i < 10; i++) { const q = (k + U.hash2(i, 4, f.seed)) % 1, an = U.hash2(i, 6, f.seed) * 6.283; g.fillStyle = `rgba(255,${120 + 80 * q | 0},60,${(1 - q) * (1 - k)})`; g.beginPath(); g.arc(X + Math.cos(an) * rr * 0.7, Y - q * 46, 3 * (1 - q) + 1, 0, 7); g.fill(); }
    } else if (f.kind === 'howl') { // คลื่นเสียงหอน (สีถ่านคุ)
      for (let w = 0; w < 3; w++) { const q = Math.min(1, Math.max(0, k * 1.4 - w * 0.2)); if (q <= 0) continue; const rr = (f.big ? 7 : 4) * TILE * q; g.strokeStyle = `rgba(255,${90 + 40 * w},40,${(1 - q) * 0.8})`; g.lineWidth = 3 - w * 0.6; gEll(g, X, Y - 10, rr, rr * R.K); g.stroke(); }
    } else if (f.kind === 'amark') { // ประกาศเป้า: ตาหมาป่าเหนือหัว + วงทองที่เท้า
      const sc = (o.def && o.def.scale) || 1, by = Y - 58 * sc - Math.sin(t * 4) * 3, a = Math.min(1, f.t / 0.2) * (k > 0.9 ? (1 - k) / 0.1 : 1);
      if (!o.dead) {
        g.strokeStyle = `rgba(255,208,96,${0.9 * a})`; g.lineWidth = 2; gEll(g, X, Y, 20 * sc, 20 * sc * R.K); g.stroke();
        g.fillStyle = `rgba(255,190,70,${a})`; g.beginPath(); g.moveTo(X - 12, by); g.quadraticCurveTo(X - 5, by - 7, X - 1, by); g.quadraticCurveTo(X - 5, by + 3, X - 12, by); g.fill();
        g.beginPath(); g.moveTo(X + 12, by); g.quadraticCurveTo(X + 5, by - 7, X + 1, by); g.quadraticCurveTo(X + 5, by + 3, X + 12, by); g.fill();
      }
    } else if (f.kind === 'shatter') {
      for (let i = 0; i < 12; i++) { const an = i / 12 * 6.283 + f.seed, d = f.r * TILE * k; g.fillStyle = `rgba(200,240,255,${1 - k})`; g.save(); g.translate(X + Math.cos(an) * d, Y - 18 + Math.sin(an) * d * R.K); g.rotate(an); g.fillRect(-5, -2, 10, 4); g.restore(); }
    } else if (f.kind === 'tree') { // ไม้ตาย: รากเรืองวนรอบตัว
      const a = Math.min(1, f.t / 0.3) * Math.min(1, (f.dur - f.t) / 0.5);
      for (let i = 0; i < 5; i++) { const an = t * 2 + i / 5 * 6.283; g.strokeStyle = `rgba(127,232,255,${0.7 * a})`; g.lineWidth = 2; g.beginPath(); g.moveTo(X, Y - 4); g.quadraticCurveTo(X + Math.cos(an) * 30, Y - 30, X + Math.cos(an + 0.8) * 22, Y - 60 + Math.sin(t * 3 + i) * 6); g.stroke(); }
    }
    g.restore();
  };
  const hookDraw = () => {
    if (typeof R === 'undefined' || !R.drawFx || R.drawFx._c3) return false;
    const d0 = R.drawFx; R.drawFx = (g, f, t) => (f.c3 ? C.draw(g, f, t) : d0(g, f, t)); R.drawFx._c3 = true;
    const t0 = R.drawTelegraphs;
    if (t0) R.drawTelegraphs = (g, t) => { for (const f of G.fx) if (f.c3 && f.ground) C.drawGround(g, f, t); return t0(g, t); };
    // เงาแม่พิมพ์: วาดเป็นร่างผู้เล่น (Class 2) สีเงา + ออร่าม่วง
    if (typeof Sprites !== 'undefined' && !Sprites.drawMob._c3) {
      const dm0 = Sprites.drawMob;
      Sprites.drawMob = (g, m, t) => {
        if (!m.c3shadow) return dm0(g, m, t);
        const p = G.player, x = m.x * TILE, y = m.y * TILE;
        const px = m._px || (m._px = { buffs: {} });
        Object.assign(px, { x: m.x, y: m.y, job: m.def.shadowJob, gender: p.gender, hair: p.hair, look: p.look, equip: p.equip, facing: m.facing, moving: m.moving, sitting: false,
          dead: m.dead, atkAnim: m.atkAnim, hurtFlash: m.hitFlash, cast: null, stunUntil: m.stunUntil, stunAt: G.time - 0.3 });
        g.save();
        const pul = 0.5 + 0.5 * Math.sin(t * 3);
        g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(150,90,255,${0.18 + 0.12 * pul})`; g.beginPath(); g.ellipse(x, y, 30, 11, 0, 0, 7); g.fill();
        g.globalCompositeOperation = 'source-over';
        const fade = m.dead ? Math.max(0, 1 - (m.deathT || 0) * 1.5) : 1;
        try {
          // ชั้นที่ 1: เงาเรืองม่วงรอบร่าง (เบลอ + บวกแสง) • ชั้นที่ 2: ร่างผู้เล่นสีเงาอมม่วง
          g.globalAlpha = (0.55 + 0.25 * pul) * fade; g.globalCompositeOperation = 'lighter';
          g.filter = 'blur(4px) brightness(0.6) sepia(1) saturate(6) hue-rotate(215deg)';
          Sprites.drawPlayer(g, px, t);
          g.globalAlpha = 0.95 * fade; g.globalCompositeOperation = 'source-over';
          g.filter = 'grayscale(1) brightness(0.42) sepia(0.5) hue-rotate(220deg) saturate(2.2) contrast(1.35)';
          Sprites.drawPlayer(g, px, t);
        } catch (e) { g.filter = 'none'; dm0(g, m, t); }
        g.restore();
      };
      Sprites.drawMob._c3 = true;
      const da0 = Sprites.drawAlly;
      Sprites.drawAlly = (g, a, t) => {
        if (a.kind !== 'c3wolf') return da0(g, a, t);
        const x = a.x * TILE, y = a.y * TILE, sz = a.sz || 1;
        g.save(); g.globalCompositeOperation = 'lighter';
        g.fillStyle = `rgba(255,90,30,${0.22 + 0.1 * Math.sin(t * 6 + a.seed * 9)})`; g.beginPath(); g.ellipse(x, y, 20 * sz, 7 * sz, 0, 0, 7); g.fill();
        for (let i = 0; i < 4; i++) { const q = (t * 1.3 + i / 4 + a.seed) % 1; g.fillStyle = `rgba(255,${140 + 60 * q | 0},50,${(1 - q) * 0.8})`; g.beginPath(); g.arc(x + Math.sin(i * 2.1 + a.seed * 7) * 10 * sz, y - 8 - q * 30 * sz, 2.2 * (1 - q) + 0.8, 0, 7); g.fill(); }
        g.restore();
        g.save(); g.filter = 'brightness(0.45) sepia(1) saturate(4) hue-rotate(-20deg) contrast(1.35)';
        da0(g, a, t);
        g.restore();
        // แผงคอเปลวไฟ + ตาเรือง (เงาหมาป่าเพลิง)
        g.save(); g.globalCompositeOperation = 'lighter';
        const f = a.facing || 1, hx = x + f * 13 * sz, hy = y - 15 * sz;
        for (let i = 0; i < 5; i++) {
          const q = (t * 2.2 + i * 0.21 + a.seed) % 1, bx = x + f * (-6 + i * 4) * sz, by = y - 17 * sz;
          g.fillStyle = `rgba(255,${110 + 90 * (1 - q) | 0},40,${0.75 * (1 - q)})`;
          g.beginPath(); g.moveTo(bx - 3 * sz, by); g.quadraticCurveTo(bx + Math.sin(t * 9 + i) * 3, by - (8 + 10 * q) * sz, bx + 3 * sz, by); g.fill();
        }
        g.fillStyle = 'rgba(255,230,120,0.95)'; g.beginPath(); g.arc(hx, hy, 1.8 * sz, 0, 7); g.fill();
        g.restore();
      };
    }
    return true;
  };
  if (!hookDraw()) {
    if (typeof document !== 'undefined' && document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(hookDraw, 0));
    else setTimeout(hookDraw, 0);
  }

  // ============================================================
  //  UI: หน้าต่างสกิล (ป้ายบอกทาง Class 3 / Oath) • ไอคอนสกิล Class 3 (ป้าย III) • Status (Oath ที่ใช้อยู่) • ตัวติดตามเควสต์ทดสอบ
  // ============================================================
  C.uiHint = () => {
    const p = G.player, J = JOBS[p.job], tab = UI.skTab, rq = C.req(p);
    if (rq.next && tab === p.job) return h('div', { class: 'hint c3-hint' }, L(`Class 3 (${JOBS[rq.next].name}): Base Lv ${THIRD_JOB_REQ.base} + Job Lv ${THIRD_JOB_REQ.job} + จบภาค 1 แล้วคุยกับ Mimir AI → เควสต์ทดสอบ`, `Class 3 (${JOBS[rq.next].name}): Base Lv ${THIRD_JOB_REQ.base} + Job Lv ${THIRD_JOB_REQ.job} + finish Part 1, then talk to Mimir AI → trial quest`));
    if (J && J.tier === 3 && tab === p.job) {
      const ps = J.skills.find(id => SKILLS[id].type === 'passive'), r = ps && Runes.chosen(ps);
      return h('div', { class: 'hint c3-hint' }, h('b', {}, 'Oath'), L(` = รูนของ ${SKILLS[ps].name} (ปลดที่ Lv ${Runes.UNLOCK}) — ${r ? 'ใช้อยู่: ' + r.name : 'ยังไม่ได้เลือก'} • ${J.jobMax - 1} แต้มใหม่สำหรับ ${J.skills.length} สกิล (เลือกหรือผสมบิลด์ได้)`, ` = a rune on ${SKILLS[ps].name} (unlocks at Lv ${Runes.UNLOCK}) — ${r ? 'active: ' + r.name : 'none chosen'} • ${J.jobMax - 1} new points for ${J.skills.length} skills (choose or combine builds)`));
    }
    return null;
  };
  C.hookUI = () => {
    if (typeof UI === 'undefined' || UI._c3) return;
    UI._c3 = true;
    const rs0 = UI.renderSkills;
    UI.renderSkills = function () { const r = rs0.apply(this, arguments); try { const el = C.uiHint(); if (el) document.querySelector('#w-skills .win-body').append(el); } catch (e) { /* ป้ายเสริมเท่านั้น */ } return r; };
    const si0 = UI.skillIcon;
    if (si0) UI.skillIcon = function (id) { const el = si0.apply(this, arguments); try { if (el && SKILLS[id] && Object.keys(THIRD_JOBS).some(j2 => JOBS[THIRD_JOBS[j2]].skills.includes(id))) el.classList.add('sk-c3'); } catch (e) { /* ภาพเท่านั้น */ } return el; };
    const st0 = UI.renderStatus;
    UI.renderStatus = function () {
      const r = st0.apply(this, arguments);
      try {
        const p = G.player, J = JOBS[p.job];
        if (J && J.tier === 3) {
          const ps = J.skills.find(id => SKILLS[id].type === 'passive'), o = ps && Runes.chosen(ps);
          const body = document.querySelector('#w-status .win-body');
          if (body) body.prepend(h('div', { class: 'c3-status' }, h('span', { class: 'c3-tier' }, 'CLASS III'), h('b', {}, J.name),
            h('span', {}, `Job ${p.job1Lv || 26} / ${p.job2Lv || 26} / ${p.jobLv}`), h('span', { class: 'c3-oath' }, 'Oath: ', o ? o.name : '—')));
        }
      } catch (e) { /* แสดงผลเสริมเท่านั้น */ }
      return r;
    };
    if (typeof Quest !== 'undefined' && Quest.renderTracker) {
      const qt0 = Quest.renderTracker;
      Quest.renderTracker = function () {
        const r = qt0.apply(this, arguments);
        const el = document.getElementById('quest-track'), tr = G.player && C.trial();
        if (!el || !tr || (!el.hidden && Quest.current())) return r;
        const T = C.TRIAL[tr.job], key = `c3|${tr.job}|${tr.stage}`;
        el.hidden = false;
        if (el.dataset.key === key) return r;
        el.dataset.key = key; el.dataset.ch = 'CLASS III'; el.innerHTML = '';
        el.append(h('div', { class: 'qt-title' }, h('span', { class: 'qt-ic' }, '✦'), L(`ความคิดสุดท้าย — ${JOBS[tr.job].name}`, `The Last Thought — ${JOBS[tr.job].name}`)),
          h('div', { class: 'qt-obj' }, tr.stage === 'ascend' ? L('กลับไปหา Mimir AI ที่นีโอเอลด์ไฮม์', 'Return to Mimir AI in Neo Eldheim')
            : tr.stage === 'duel' ? L(`ปราบเงาแม่พิมพ์ (คุย ${T.who} อีกครั้งถ้าเงาหายไป)`, `Defeat the Mould Shadow (talk to ${T.who} again if it fades)`)
              : L(`คุยกับ ${T.who} ที่ ${T.place}`, `Talk to ${T.who} in ${T.place}`)));
        return r;
      };
    }
  };
  if (typeof document !== 'undefined' && document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => C.hookUI());
  else C.hookUI();

  return C;
})();
