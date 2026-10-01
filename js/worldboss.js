'use strict';
// ============================================================
//  World Boss — บอสโลก 1 ตัวต่อแผนที่ที่มี MVP (แข็งกว่า MVP ปกติ 5 เท่า) ไว้ให้ผู้เล่นมาช่วยกันตี
//  • เวลาเกิดตามนาฬิกาจริงร่วมกันทุกเครื่อง: ทุก 60 นาที (แต่ละแผนที่เหลื่อมกัน 20 นาที) อยู่ 40 นาทีหรือจนกว่าจะถูกปราบ
//  • เลือดใช้ร่วมกันทั้งแผนที่: ใครตีโดน ส่ง 'wb' hit ให้ทุกคนหักเลือดเท่ากัน • คนเข้ามาใหม่ขอเลือดล่าสุดจากคนที่อยู่ก่อน
//  • เลือดจำไว้ในเครื่อง (localStorage): ผู้เล่นตาย/ออกจากแผนที่/รีโหลด แล้วกลับมา บอสไม่เลือดเต็มใหม่
//  • ปราบได้: ทุกคนที่ตีโดนอย่างน้อย 1 ครั้งได้รางวัลเต็ม (EXP/ของดรอปของตัวเอง)
// ============================================================
const WB = {
  PERIOD: 60 * 60e3, WINDOW: 40 * 60e3, MULT: 5,
  MAPS: { mistlake: { mvp: 'seraph_pudding', off: 0 }, helcave: { mvp: 'kitsura', off: 20 }, roots: { mvp: 'garmr', off: 40 } },
  st: {}, saveAt: 0, nextTick: 0,

  id(map) { return 'wb_' + this.MAPS[map].mvp; },
  init() {
    for (const map in this.MAPS) {
      const b = MOBS[this.MAPS[map].mvp]; if (!b) { delete this.MAPS[map]; continue; }
      const id = this.id(map), M = this.MULT;
      MOBS[id] = Object.assign({}, b, {
        id, base: b.id, name: `Ancient ${b.name}`, lv: b.lv + 10, hp: b.hp * M, atk: [Math.round(b.atk[0] * 3), Math.round(b.atk[1] * 3)], // ATK ×3 (เจ้าของเกมกำหนด)
        def: Math.min(80, b.def + 15), mdef: Math.min(80, b.mdef + 15), hit: b.hit + 20, flee: b.flee + 10,
        exp: b.exp * M, jexp: b.jexp * M, scale: (b.scale || 1.6) * 1.3, worldBoss: true, respawn: this.PERIOD,
        hue: 35, sat: 1.25, bri: 1.05, tint: ['#ffcf4a', 0.25],
        drops: [...b.drops.map(([i, ch]) => [i, Math.min(1, ch * 2)]), ['yggdrasil_shard', 0.5], ['white_potion', 1]],
      });
      if (b.look) MOBS[id].look = Object.assign({}, b.look, { scale: (b.look.scale || 1.6) * 1.3 });
    }
    try { this.st = JSON.parse(localStorage.getItem('nm_wb') || '{}') || {}; } catch (e) { this.st = {}; }
    // เกี่ยวเข้ากับระบบหลักโดยไม่แก้ไฟล์เกม: ดาเมจ / การตาย / ทุกเฟรม
    const dmg0 = damageMob, kill0 = killMob, upd0 = updateGame;
    damageMob = (m, dmg, opts) => { const hp0 = m.hp; dmg0(m, dmg, opts); if (m.isWB) this.onLocalDamage(m, hp0 - Math.max(0, m.hp)); };
    killMob = m => { kill0(m); if (m.isWB) this.onKilled(m); };
    updateGame = dt => { upd0(dt); if (G.time >= this.nextTick) { this.nextTick = G.time + 0.5; this.tick(); } };
  },

  cycleOf(map, now = Date.now()) {
    const off = this.MAPS[map].off * 60e3, c = Math.floor((now - off) / this.PERIOD), start = c * this.PERIOD + off;
    return { c, start, end: start + this.WINDOW, next: start + this.PERIOD };
  },
  state(map) {
    const cy = this.cycleOf(map);
    let s = this.st[map];
    if (!s || s.cycle !== cy.c) s = this.st[map] = { cycle: cy.c, hp: MOBS[this.id(map)].hp, dead: false };
    return s;
  },
  active(map) { return Date.now() < this.cycleOf(map).end && !this.state(map).dead; },
  live() { return G.mobs.find(m => m.isWB && !m.dead); },
  save(force) {
    if (!force && performance.now() < this.saveAt) return;
    this.saveAt = performance.now() + 1500;
    try { localStorage.setItem('nm_wb', JSON.stringify(this.st)); } catch (e) { /* โหมดส่วนตัว */ }
  },
  send(t, extra) {
    if (typeof Online === 'undefined' || !Online.mapChannel || !G.map) return;
    Online.mapChannel.send({ type: 'broadcast', event: 'wb', payload: Object.assign({ t, map: G.map.id, c: this.state(G.map.id).cycle }, extra) });
  },

  tick() {
    if (!G.started || !G.map || !this.MAPS[G.map.id]) { this.pill(''); return; }
    const map = G.map.id, live = this.live();
    if (this.active(map) && !live) this.spawn(map);
    else if (!this.active(map) && live && !this.state(map).dead) { // หมดเวลา: บอสจากไป (ไม่ได้ถูกปราบ)
      live.dead = true; live.deathT = 1;
      UI.announce(L(`🌫 ${live.def.name} หายกลับเข้าไปในราก... จะกลับมาในรอบถัดไป`, `🌫 ${live.def.name} sinks back into the roots... It will return next cycle.`));
    }
    this.pill(map);
  },
  pill(map) {
    let el = document.getElementById('mm-wb');
    if (!el) {
      const mv = document.getElementById('mm-mvp'); if (!mv) return;
      el = document.createElement('div'); el.id = 'mm-wb'; el.hidden = true; mv.after(el);
    }
    let t = '', alive = false;
    if (map) {
      const live = this.live(), cy = this.cycleOf(map);
      el.title = L(`World Boss: ${MOBS[this.id(map)].name} (แข็งกว่า MVP 5 เท่า) — เกิดทุก 60 นาที อยู่ 40 นาที เลือดใช้ร่วมกันทั้งแผนที่`, `World Boss: ${MOBS[this.id(map)].name} (5× stronger than an MVP) — spawns every 60 min and stays for 40 min. HP is shared across the whole map.`);
      if (live) { alive = true; t = L(`☠ บอสโลก · เลือด ${Math.ceil(live.hp / live.maxHp * 100)}%`, `☠ World Boss · HP ${Math.ceil(live.hp / live.maxHp * 100)}%`); }
      else {
        const left = Math.max(0, ((this.state(map).dead || Date.now() >= cy.end) ? cy.next : cy.start) - Date.now()) / 1000;
        t = L(`บอสโลก · อีก ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`, `World Boss · in ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`);
      }
    }
    el.classList.toggle('alive', alive);
    if (el.textContent !== t) el.textContent = t;
    if (el.hidden === !!t) el.hidden = !t;
  },

  spawn(map) {
    const s = this.state(map), id = this.id(map);
    const m = spawnMob(id);
    m.isWB = true; m.maxHp = MOBS[id].hp; m.hp = Math.max(1, s.hp); m.wbMine = 0;
    const fresh = s.hp >= m.maxHp;
    UI.announce(L(`☠ WORLD BOSS ${MOBS[id].name} ${fresh ? 'ตื่นขึ้นแล้ว' : `ยังอยู่ (เลือด ${Math.ceil(m.hp / m.maxHp * 100)}%)`} ที่ ${G.map.def.name} — ชวนเพื่อนมาช่วยกันตี!`, `☠ WORLD BOSS ${MOBS[id].name} ${fresh ? 'has awakened' : `still stands (HP ${Math.ceil(m.hp / m.maxHp * 100)}%)`} in ${G.map.def.name} — rally your friends and bring it down!`));
    if (fresh && !G.fastSim) UI.splash(`mvp_${id}`, MOBS[id].name, L('WORLD BOSS — แข็งกว่า MVP 5 เท่า', 'WORLD BOSS — 5× stronger than an MVP'));
    UI.msg(L(`[WORLD BOSS] ${MOBS[id].name} อยู่ในแผนที่นี้ เลือดใช้ร่วมกันทุกคน — ตายแล้วกลับมาตีต่อได้ บอสไม่ฟื้นเลือด`, `[WORLD BOSS] ${MOBS[id].name} is on this map. Its HP is shared by everyone — fall, come back, and keep fighting. The boss never regenerates.`), 'mvp');
    this.send('ask');
  },
  onLocalDamage(m, d) {
    if (d <= 0) return;
    m.wbMine += d;
    const s = this.state(G.map.id);
    s.hp = Math.max(0, m.hp); this.save();
    this.send('hit', { d: Math.round(d) });
  },
  onKilled(m) {
    const s = this.state(G.map.id);
    s.dead = true; s.hp = 0; this.save(true);
    const i = G.respawns.findIndex(r => r.id === m.def.id); if (i >= 0) G.respawns.splice(i, 1); // ไม่เกิดใหม่แบบมอนปกติ
    UI.announce(L(`🏆 WORLD BOSS ${m.def.name} ถูกปราบแล้ว! ทุกคนที่ร่วมตีได้รางวัล`, `🏆 WORLD BOSS ${m.def.name} has been defeated! Everyone who joined the fight is rewarded.`));
    Sound.play('mvp');
    if (!m.wbRemote) this.send('dead');
  },
  onNet(pl) {
    if (!pl || !G.map || pl.map !== G.map.id || !this.MAPS[pl.map]) return;
    const s = this.state(pl.map); if (pl.c !== s.cycle) return;
    const live = this.live();
    if (pl.t === 'hit') {
      s.hp = Math.max(0, s.hp - (+pl.d || 0));
      if (live) { live.hp = Math.min(live.hp, s.hp); live.hitFlash = 0.15; if (live.hp <= 0) this.remoteKill(live); }
      this.save();
    } else if (pl.t === 'dead') {
      s.dead = true; s.hp = 0; this.save(true);
      if (live) this.remoteKill(live);
    } else if (pl.t === 'ask') this.send('hp', { hp: Math.round(s.hp), dead: s.dead ? 1 : 0 });
    else if (pl.t === 'hp') {
      if (pl.dead) { s.dead = true; s.hp = 0; if (live) this.remoteKill(live); }
      else if (+pl.hp < s.hp) { s.hp = +pl.hp; if (live) live.hp = Math.max(1, s.hp); }
      this.save();
    }
  },
  // คนอื่นปิดฉาก: ถ้าเราร่วมตี ได้รางวัลเต็ม • ไม่ได้ตี แค่หายไป
  remoteKill(m) {
    m.wbRemote = true;
    if (m.wbMine > 0) killMob(m);
    else { m.dead = true; m.deathT = 0; m.hp = 0; this.onKilled(m); }
  },
};
WB.init();
