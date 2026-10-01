'use strict';
// ============================================================
//  อีโมต (แบบ RO): ฟองไอคอนเหนือหัว 3 วินาที
//  ใช้ได้ทาง: พิมพ์ /คำสั่ง ในแชต • Alt+1..9 • หน้าต่างอีโมต (เมนู) • ออนไลน์ส่งให้คนอื่นเห็น
// ============================================================

const EMOTES = [
  { k: '!', sym: '!', col: '#ff4a4a', name: L('ตกใจ', 'Surprised') },
  { k: '?', sym: '?', col: '#4a8cff', name: L('สงสัย', 'Confused') },
  { k: 'lv', sym: '♥', col: '#ff5fa2', name: L('รัก', 'Love') },
  { k: 'ho', sym: '♪', col: '#e0a820', name: L('ร้องเพลง', 'Sing') },
  { k: 'swt', sym: 'drop', col: '#5fb8ff', name: L('เหงื่อตก', 'Sweat') },
  { k: 'ic', sym: 'bulb', col: '#ffd34a', name: L('ไอเดีย', 'Idea') },
  { k: 'gg', sym: 'GG', col: '#3fae5a', name: 'GG' },
  { k: 'thx', sym: 'THX', col: '#e07830', name: L('ขอบคุณ', 'Thanks') },
  { k: 'zzz', sym: 'zZ', col: '#8a7ae0', name: L('ง่วง', 'Sleepy') },
  { k: 'heh', sym: '^^', col: '#e0a820', name: L('ยิ้ม', 'Smile') },
  { k: 'omg', sym: '!?', col: '#ff7a3a', name: L('อะไรนะ', 'What?!') },
  { k: 'sob', sym: 'T_T', col: '#5fb8ff', name: L('ร้องไห้', 'Cry') },
  { k: 'ok', sym: 'OK', col: '#3fae5a', name: L('โอเค', 'OK') },
  { k: 'go', sym: 'GO!', col: '#ff4a4a', name: L('ลุย', 'Go!') },
  { k: 'angry', sym: 'anger', col: '#e03030', name: L('โกรธ', 'Angry') },
  { k: 'dots', sym: '...', col: '#667', name: L('เงียบ', 'Silence') },
];
const EMOTE_BY = Object.fromEntries(EMOTES.map(e => [e.k, e]));

const Emote = {
  DUR: 3,
  play(k, who = G.player) {
    const e = EMOTE_BY[k]; if (!e || !who) return false;
    who.emote = { k, at: G.time, until: G.time + this.DUR };
    if (who === G.player) { Sound.play('emote'); Online.sendEmote(k); }
    return true;
  },
  fromChat(cmd) { return EMOTE_BY[cmd] ? this.play(cmd) : false; },

  // ฟองอีโมต: เด้งเข้า แกว่งเบา ๆ แล้วจางออก
  draw(g, x, y, em, t) {
    const e = EMOTE_BY[em.k]; if (!e) return;
    const age = G.time - em.at, left = em.until - G.time;
    const pop = Math.min(1, age / 0.18), s = pop < 1 ? 0.4 + pop * 0.75 : 1 + Math.sin(age * 8) * 0.03;
    g.save();
    g.globalAlpha = Math.min(1, left / 0.35);
    g.translate(x, y - Math.sin(age * 3) * 2); g.scale(s, s);
    // ฟอง
    g.fillStyle = '#ffffff'; g.strokeStyle = 'rgba(30,40,60,0.85)'; g.lineWidth = 1.6;
    rr(g, -17, -15, 34, 26, 9); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-4, 11); g.lineTo(0, 17); g.lineTo(4, 11); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-4, 11); g.lineTo(0, 17); g.lineTo(4, 11); g.stroke();
    g.fillStyle = e.col; g.strokeStyle = e.col;
    if (e.sym === 'drop') {
      g.beginPath(); g.moveTo(0, -10); g.quadraticCurveTo(8, 2, 0, 6); g.quadraticCurveTo(-8, 2, 0, -10); g.fill();
      g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(-2, 0, 1.5, 3, 0, 0, 7); g.fill();
    } else if (e.sym === 'bulb') {
      g.beginPath(); g.arc(0, -3, 7, 0, 7); g.fill();
      g.fillStyle = '#9a8a60'; g.fillRect(-3.5, 4, 7, 4);
      g.strokeStyle = '#ffd34a'; g.lineWidth = 1.4;
      for (const a of [-2.4, -1.57, -0.7]) { g.beginPath(); g.moveTo(Math.cos(a) * 9, -3 + Math.sin(a) * 9); g.lineTo(Math.cos(a) * 12, -3 + Math.sin(a) * 12); g.stroke(); }
    } else if (e.sym === 'anger') {
      g.lineWidth = 2.6; g.lineCap = 'round';
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.moveTo(sx * 2.5, sy * 7 - 2); g.quadraticCurveTo(sx * 2.5, sy * 2.5 - 2, sx * 7, sy * 2.5 - 2); g.stroke(); }
    } else {
      const big = e.sym.length <= 2;
      g.font = `900 ${big ? 18 : e.sym.length === 3 ? 12 : 11}px Kanit, "Noto Sans Thai", sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(e.sym, 0, -1.5);
    }
    g.restore();
  },
};

// ชีวิตชีวาในเมือง: NPC แสดงอีโมตเป็นระยะ (เฉพาะตอนผู้เล่นอยู่ใกล้ ๆ)
const NPC_EMOTES = {
  nurse: ['lv', 'ho'], tool: ['heh', 'thx'], weapon: ['!', 'ok'], armor: ['heh', 'ic'], refine: ['angry', 'gg'],
  guide: ['ok', '!'], bifrost: ['ic', 'dots'], jobmaster: ['ic', '?'], storage: ['ok', 'thx'],
};
const Ambient = {
  next: 0,
  tick() {
    if (!G.started || G.fastSim || G.time < this.next) return;
    this.next = G.time + 6 + Math.random() * 8;
    const p = G.player, q = typeof Quest !== 'undefined' && Quest.current() ? Quest.current().obj : null;
    const near = G.npcs.filter(n => NPC_EMOTES[n.id] && U.dist(n.x, n.y, p.x, p.y) < 12 && !(q && q.npc === n.id) && !(n.emote && n.emote.until > G.time));
    if (!near.length) return;
    const n = near[Math.floor(Math.random() * near.length)], list = NPC_EMOTES[n.id];
    n.emote = { k: list[Math.floor(Math.random() * list.length)], at: G.time, until: G.time + 2.6 };
  },
};
