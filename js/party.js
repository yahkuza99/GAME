'use strict';
// ============================================================
//  ปาร์ตี้ (แบบ RO): สร้าง / เชิญ / ออก / เตะ • แชทปาร์ตี้ /p • แบ่ง EXP เท่ากัน (Even Share)
//  ใช้ Supabase Realtime broadcast ล้วน ๆ (ไม่มีตาราง ไม่บันทึกลงเซฟ — ปาร์ตี้อยู่ตลอดเซสชัน ข้ามแผนที่ได้)
//    social           ช่องรวมของทุกคน: ส่งคำเชิญ { to, from, fromName, partyId, partyName } และคำตอบ
//    party:<partyId>  ช่องของปาร์ตี้: heartbeat สถานะสมาชิก (ทุก ~1.5 วิ และเมื่อเปลี่ยน), แชท, แจก EXP, ออก/เตะ
//  หัวหน้า = คนที่อยู่ในปาร์ตี้นานที่สุด (ผู้สร้าง) • หัวหน้าออก → คนที่เข้าก่อนสุดถัดไปเป็นแทน
//  ไม่ได้ยิน heartbeat 10 วินาที = หลุดจากปาร์ตี้
// ============================================================

const PARTY_MAX = 6, PARTY_HB_MS = 1500, PARTY_TIMEOUT_MS = 10000, PARTY_RANGE = 25, PARTY_BONUS = 0.15, PARTY_INVITE_SEC = 30;
const PARTY_ICON = {
  party: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.6 3-5.6 6-5.6s5.4 2 6 5.6"/><circle cx="17" cy="9" r="2.6"/><path d="M15.6 14.6c2.6-.4 4.8 1.3 5.4 4.4"/>',
  crown: '<path d="M3.5 8.5l4.6 3.8L12 5.5l3.9 6.8 4.6-3.8-1.8 9.5H5.3z"/>',
  pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
};
const partySvg = (k, cls) => `<svg viewBox="0 0 24 24" aria-hidden="true"${cls ? ` class="${cls}"` : ''}>${PARTY_ICON[k]}</svg>`;

const Party = {
  social: null,       // ช่อง social (เปิดเมื่อออนไลน์)
  ch: null,           // ช่อง party:<id>
  party: null,        // { id, name, since, members: Map<id, สมาชิกคนอื่น> } — ไม่รวมตัวเอง
  gone: new Map(),    // id → since ของคนที่ออก/ถูกเตะ (ไม่รับ heartbeat เก่าที่ยังค้างในสาย)
  invited: new Map(), // id หรือ 'n:ชื่อ' → เวลาหมดอายุคำเชิญที่ส่งไป (ms)
  invite: null,       // คำเชิญที่ได้รับ (แสดงเป็นโทสต์ รับ/ปฏิเสธ)
  queue: [],          // EXP ที่รอส่ง (ช่วงจำลองย้อนหลังตอนสลับแท็บ)
  lastHb: 0, hbKey: '', lastChat: 0, fold: false,

  me() { return Online.user ? Online.user.id : null; },
  has(id) { return !!(this.party && this.party.members.has(id)); },
  member(id) { return this.party ? this.party.members.get(id) || null : null; },
  // สมาชิกทั้งหมด (รวมตัวเอง) เรียงตามเวลาที่เข้า: คนแรก = หัวหน้า
  roster() {
    if (!this.party) return [];
    return [this.selfState(), ...this.party.members.values()].sort((a, b) => (a.since - b.since) || (a.id < b.id ? -1 : 1));
  },
  leaderId() { const r = this.roster(); return r.length ? r[0].id : null; },
  isLeader() { return !!this.party && this.leaderId() === this.me(); },
  selfState() {
    const p = G.player, d = p.d || {};
    return {
      id: this.me(), me: true, name: p.name, job: p.job, lv: p.baseLv, hp: Math.max(0, Math.round(p.hp)), maxHp: d.maxHp || 1,
      sp: Math.max(0, Math.round(p.sp)), maxSp: d.maxSp || 1, map: G.map ? G.map.id : p.map,
      x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, dead: p.dead ? 1 : 0,
      since: this.party ? this.party.since : 0, pn: this.party ? this.party.name : '',
    };
  },
  needOnline() {
    if (Online.online && Online.sb) return true;
    UI.msg(L('ระบบปาร์ตี้ใช้ได้เฉพาะโหมดออนไลน์ (ล็อกอินบัญชีออนไลน์)', 'Parties are only available in online mode (log in with an online account).'), 'err');
    return false;
  },
  cleanName(s) { return String(s || '').replace(/[\u0000-\u001f<>"]/g, '').trim().slice(0, 24); },

  // ---------------- ช่องสื่อสาร ----------------
  joinSocial() {
    if (this.social || !Online.online || !Online.sb) return;
    const ch = Online.sb.channel('social', { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: 'invite' }, ({ payload }) => this.onInvite(payload));
    ch.on('broadcast', { event: 'reply' }, ({ payload }) => this.onReply(payload));
    ch.subscribe();
    this.social = ch;
  },
  sendSocial(event, payload) { if (this.social) this.social.send({ type: 'broadcast', event, payload }); },
  send(event, payload) { return this.ch ? this.ch.send({ type: 'broadcast', event, payload }) : null; },

  join(id, name, since) {
    this.party = { id, name, since, members: new Map() };
    this.gone.clear(); this.hbKey = ''; this.lastHb = 0; this.queue = [];
    const ch = Online.sb.channel('party:' + id, { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: 'hb' }, ({ payload }) => this.onHb(payload));
    ch.on('broadcast', { event: 'leave' }, ({ payload }) => this.onLeave(payload));
    ch.on('broadcast', { event: 'kick' }, ({ payload }) => this.onKick(payload));
    ch.on('broadcast', { event: 'chat' }, ({ payload }) => this.onChat(payload));
    ch.on('broadcast', { event: 'pexp' }, ({ payload }) => this.onExp(payload));
    ch.subscribe(st => {
      if (ch !== this.ch) return;
      if (st === 'SUBSCRIBED') this.heartbeat(true);
      else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') UI.msg(L('การเชื่อมต่อปาร์ตี้สะดุด กำลังลองใหม่…', 'Party connection hiccup — retrying…'), 'err');
    });
    this.ch = ch;
    this.refresh();
  },

  // ---------------- สร้าง / ออก / เตะ ----------------
  create(name) {
    if (!this.needOnline()) return false;
    if (this.party) { UI.msg(L('คุณอยู่ในปาร์ตี้แล้ว — ออกก่อนด้วย /leave', 'You\'re already in a party — leave it first with /leave'), 'err'); return false; }
    name = this.cleanName(name) || L(`ปาร์ตี้ของ ${G.player.name}`, `${G.player.name}'s Party`);
    this.join('p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), name, Date.now());
    UI.msg(L(`★ ตั้งปาร์ตี้ "${name}" แล้ว — เชิญเพื่อนได้ที่หน้าต่างปาร์ตี้ (Y) หรือพิมพ์ /invite ชื่อ`, `★ Party "${name}" created — invite friends from the Party window (Y) or type /invite name`), 'party');
    Sound.play('buff');
    return true;
  },
  leave(quiet) {
    if (!this.party) { if (!quiet) UI.msg(L('คุณไม่ได้อยู่ในปาร์ตี้', 'You\'re not in a party.'), 'err'); return; }
    const name = this.party.name, ch = this.ch;
    const sent = this.send('leave', { id: this.me(), since: this.party.since });
    this.ch = null; this.party = null; this.queue = [];
    // ปิดช่องหลังส่งข้อความลาเสร็จ (ไม่งั้นข้อความอาจหายระหว่างทาง)
    if (ch) Promise.resolve(sent).catch(() => {}).then(() => { if (Online.sb) Online.sb.removeChannel(ch); });
    if (!quiet) UI.msg(L(`ออกจากปาร์ตี้ "${name}" แล้ว`, `You left the party "${name}".`), 'party');
    this.refresh();
  },
  async kick(id) {
    const m = this.member(id);
    if (!m) return;
    if (!this.isLeader()) { UI.msg(L('เฉพาะหัวหน้าปาร์ตี้เท่านั้นที่เตะสมาชิกได้', 'Only the party leader can kick members.'), 'err'); return; }
    if (!(await UI.confirm(L(`เตะ ${m.name} ออกจากปาร์ตี้?`, `Kick ${m.name} from the party?`))) || !this.has(id)) return;
    this.send('kick', { id, by: this.me() });
    this.removeMember(id, 'kick');
  },
  removeMember(id, why) {
    const m = this.member(id);
    if (!m) return;
    const lead0 = this.leaderId();
    this.party.members.delete(id);
    if (why !== 'timeout') this.gone.set(id, m.since);
    UI.msg(why === 'kick' ? L(`${m.name} ถูกเตะออกจากปาร์ตี้`, `${m.name} was kicked from the party.`) : why === 'timeout' ? L(`${m.name} ขาดการเชื่อมต่อจากปาร์ตี้`, `${m.name} lost connection to the party.`) : L(`${m.name} ออกจากปาร์ตี้`, `${m.name} left the party.`), 'party');
    const lead1 = this.leaderId();
    if (lead1 !== lead0) UI.msg(lead1 === this.me() ? L('♛ คุณเป็นหัวหน้าปาร์ตี้คนใหม่', '♛ You are the new party leader.') : L(`♛ ${this.member(lead1).name} เป็นหัวหน้าปาร์ตี้คนใหม่`, `♛ ${this.member(lead1).name} is the new party leader.`), 'party');
    this.refresh();
  },

  // ---------------- เชิญ ----------------
  // target = { id, name } จากรายชื่อในแผนที่ หรือ { name } จาก /invite (หาไม่เจอในแผนที่ = ส่งตามชื่อ ข้ามแผนที่ได้)
  inviteName(name) {
    name = this.cleanName(name);
    if (!name) { UI.msg(L('พิมพ์ /invite ตามด้วยชื่อตัวละคร เช่น /invite Alice', 'Type /invite followed by a character name, e.g. /invite Alice'), 'err'); return; }
    const o = [...Online.others.values()].find(x => String(x.name || '').toLowerCase() === name.toLowerCase());
    this.sendInvite(o ? { id: o.id, name: o.name } : { name });
  },
  sendInvite(t) {
    if (!this.needOnline()) return;
    if (String(t.name).toLowerCase() === String(G.player.name).toLowerCase()) { UI.msg(L('เชิญตัวเองไม่ได้', 'You can\'t invite yourself.'), 'err'); return; }
    if (!this.party && !this.create()) return; // ยังไม่มีปาร์ตี้ = ตั้งให้อัตโนมัติ
    if (!this.isLeader()) { UI.msg(L('เฉพาะหัวหน้าปาร์ตี้เท่านั้นที่เชิญสมาชิกได้', 'Only the party leader can invite members.'), 'err'); return; }
    if (this.roster().length >= PARTY_MAX) { UI.msg(L(`ปาร์ตี้เต็มแล้ว (สูงสุด ${PARTY_MAX} คน)`, `The party is full (max ${PARTY_MAX}).`), 'err'); return; }
    if ((t.id && this.has(t.id)) || [...this.party.members.values()].some(m => m.name.toLowerCase() === String(t.name).toLowerCase())) { UI.msg(L(`${t.name} อยู่ในปาร์ตี้แล้ว`, `${t.name} is already in the party.`), 'info'); return; }
    const key = t.id || 'n:' + t.name.toLowerCase();
    if ((this.invited.get(key) || 0) > Date.now()) { UI.msg(L(`ส่งคำเชิญถึง ${t.name} แล้ว กำลังรอคำตอบ`, `Invite already sent to ${t.name} — waiting for a reply.`), 'info'); return; }
    this.invited.set(key, Date.now() + PARTY_INVITE_SEC * 1000);
    const r = this.roster();
    this.sendSocial('invite', { to: t.id || null, toName: t.id ? null : t.name, from: this.me(), fromName: G.player.name,
      partyId: this.party.id, partyName: this.party.name, since: Math.max(...r.map(m => m.since)), n: r.length });
    UI.msg(L(`ส่งคำเชิญเข้าปาร์ตี้ถึง ${t.name} แล้ว`, `Party invite sent to ${t.name}.`), 'party');
    this.refresh();
  },
  onInvite(v) {
    if (!v || !G.started || !v.from || v.from === this.me() || !v.partyId) return;
    const mine = v.to ? v.to === this.me() : String(v.toName || '').toLowerCase() === String(G.player.name).toLowerCase();
    if (!mine) return;
    if (this.party) { this.reply(v, 'busy'); return; }
    if (this.invite && this.invite.partyId !== v.partyId) this.reply(this.invite, 'no'); // คำเชิญใหม่แทนอันเดิม
    this.invite = { from: String(v.from), fromName: this.cleanName(v.fromName) || L('ผู้เล่น', 'Player'), partyId: String(v.partyId).slice(0, 40),
      partyName: this.cleanName(v.partyName) || L('ปาร์ตี้', 'Party'), since: +v.since || 0, n: +v.n || 1, exp: Date.now() + PARTY_INVITE_SEC * 1000 };
    UI.msg(L(`${this.invite.fromName} เชิญคุณเข้าปาร์ตี้ "${this.invite.partyName}"`, `${this.invite.fromName} invited you to the party "${this.invite.partyName}"`), 'party');
    Sound.play('quest_new');
    this.showInvite();
  },
  reply(v, ans) { this.sendSocial('reply', { to: v.from, from: this.me(), fromName: G.player.name, partyId: v.partyId, ans }); },
  accept() {
    const v = this.invite;
    if (!v) return;
    this.invite = null; this.showInvite();
    if (this.party) { UI.msg(L('ออกจากปาร์ตี้เดิมก่อน จึงจะเข้าปาร์ตี้ใหม่ได้', 'Leave your current party before joining a new one.'), 'err'); this.reply(v, 'busy'); return; }
    if (!this.needOnline()) return;
    if (v.n >= PARTY_MAX) { UI.msg(L('ปาร์ตี้นั้นเต็มแล้ว', 'That party is already full.'), 'err'); this.reply(v, 'full'); return; }
    // เวลาเข้าต้องหลังสมาชิกเดิมทุกคน (นาฬิกาแต่ละเครื่องไม่ตรงกัน) หัวหน้าจะได้ไม่สลับ
    this.join(v.partyId, v.partyName, Math.max(Date.now(), v.since + 1));
    this.reply(v, 'yes');
    UI.msg(L(`★ เข้าร่วม "${v.partyName}" แล้ว — พิมพ์ /p ข้อความ เพื่อคุยในปาร์ตี้`, `★ Joined "${v.partyName}" — type /p message to talk to your party`), 'party');
    Sound.play('buff');
  },
  decline(why) {
    const v = this.invite;
    if (!v) return;
    this.invite = null; this.showInvite();
    this.reply(v, why || 'no');
    UI.msg(why === 'timeout' ? L(`คำเชิญจาก ${v.fromName} หมดเวลาแล้ว`, `The invite from ${v.fromName} has expired.`) : L(`ปฏิเสธคำเชิญจาก ${v.fromName}`, `Declined the invite from ${v.fromName}.`), 'info');
  },
  onReply(r) {
    if (!r || r.to !== this.me()) return;
    const n = this.cleanName(r.fromName) || L('ผู้เล่น', 'Player');
    this.invited.delete(r.from); this.invited.delete('n:' + n.toLowerCase());
    if (r.ans === 'busy') UI.msg(L(`${n} อยู่ในปาร์ตี้อื่นอยู่แล้ว`, `${n} is already in another party.`), 'err');
    else if (r.ans === 'full') UI.msg(L(`${n} เข้าปาร์ตี้ไม่ได้ เพราะปาร์ตี้เต็ม`, `${n} couldn't join because the party is full.`), 'err');
    else if (r.ans === 'no') UI.msg(L(`${n} ปฏิเสธคำเชิญเข้าปาร์ตี้`, `${n} declined your party invite.`), 'info');
    else if (r.ans === 'timeout') UI.msg(L(`${n} ไม่ได้ตอบคำเชิญ`, `${n} didn't respond to your invite.`), 'info');
    this.refresh(); // 'yes' → ข้อความ "เข้าร่วม" มากับ heartbeat แรกของเขา
  },
  // โทสต์คำเชิญ (รับ / ปฏิเสธ + แถบเวลานับถอยหลัง)
  showInvite() {
    let el = document.getElementById('party-invite');
    const v = this.invite;
    if (!v) { if (el) el.hidden = true; return; }
    if (!el) {
      el = h('div', { id: 'party-invite', role: 'alertdialog', 'aria-live': 'polite' });
      (document.getElementById('hud') || document.body).append(el);
    }
    el.innerHTML = '';
    const ic = h('span', { class: 'pinv-ic' }); ic.innerHTML = partySvg('party');
    const left = Math.max(1, (v.exp - Date.now()) / 1000);
    el.append(ic,
      h('div', { class: 'pinv-t' }, h('small', {}, L('คำเชิญเข้าปาร์ตี้', 'Party Invite')),
        h('span', {}, h('b', {}, v.fromName), L(' ชวนคุณเข้า ', ' invites you to join '), h('b', { class: 'pinv-pn' }, v.partyName))),
      h('div', { class: 'pinv-btns' },
        h('button', { type: 'button', class: 'btn pinv-yes', onclick: () => this.accept() }, L('รับ', 'Accept')),
        h('button', { type: 'button', class: 'btn pinv-no', onclick: () => this.decline() }, L('ปฏิเสธ', 'Decline'))),
      h('i', { class: 'pinv-bar' }, h('b', { style: `animation-duration:${left.toFixed(1)}s` })));
    el.hidden = false;
  },

  // ---------------- สถานะสมาชิก (heartbeat) ----------------
  heartbeat(force) {
    if (!this.party || !this.ch || !G.player) return;
    const s = this.selfState(), now = performance.now();
    // ส่งทันทีเมื่อสถานะสำคัญเปลี่ยน (HP/SP ปัดเป็นช่วง ไม่ส่งถี่ตอนฟื้นทีละนิด) ไม่งั้นทุก 1.5 วิ
    const key = [s.map, s.lv, s.job, s.dead, s.name, s.maxHp, s.maxSp, Math.round(s.hp / s.maxHp * 40), Math.round(s.sp / s.maxSp * 20)].join('|');
    const changed = key !== this.hbKey;
    if (!force && !(changed && now - this.lastHb > 350) && now - this.lastHb < PARTY_HB_MS) return;
    this.hbKey = key; this.lastHb = now;
    delete s.me;
    this.send('hb', s);
  },
  onHb(s) {
    if (!this.party || !s || typeof s.id !== 'string' || s.id === this.me()) return;
    if (this.gone.has(s.id) && this.gone.get(s.id) === s.since) return;
    const ms = this.party.members, num = (v, d) => (Number.isFinite(+v) ? +v : d);
    let m = ms.get(s.id);
    const fresh = !m;
    if (!m) { m = { id: s.id }; ms.set(s.id, m); }
    Object.assign(m, {
      name: this.cleanName(s.name) || '???', job: JOBS[s.job] ? s.job : 'novice', lv: num(s.lv, 1),
      hp: num(s.hp, 0), maxHp: Math.max(1, num(s.maxHp, 1)), sp: num(s.sp, 0), maxSp: Math.max(1, num(s.maxSp, 1)),
      map: String(s.map || ''), x: num(s.x, 0), y: num(s.y, 0), dead: !!s.dead, since: num(s.since, Date.now()), seen: performance.now(),
    });
    if (fresh) {
      this.gone.delete(s.id);
      this.heartbeat(true); // ให้คนที่เพิ่งเข้าเห็นเราทันที ไม่ต้องรอรอบถัดไป
      if (m.since > this.party.since) UI.msg(L(`★ ${m.name} เข้าร่วมปาร์ตี้`, `★ ${m.name} joined the party`), 'party');
      Sound.play('click');
      // คนเกิน 6: คนที่เข้าหลังสุดออกเอง
      const r = this.roster();
      if (r.length > PARTY_MAX && r.findIndex(x => x.me) >= PARTY_MAX) { UI.msg(L(`ปาร์ตี้เต็มแล้ว (สูงสุด ${PARTY_MAX} คน)`, `The party is full (max ${PARTY_MAX}).`), 'err'); this.leave(true); return; }
    }
    if (s.pn && s.id === this.leaderId()) this.party.name = this.cleanName(s.pn) || this.party.name; // ชื่อปาร์ตี้ตามหัวหน้า
  },
  onLeave(v) { if (v && this.has(v.id)) this.removeMember(v.id, 'leave'); },
  onKick(v) {
    if (!this.party || !v || v.by !== this.leaderId()) return;
    if (v.id === this.me()) { UI.msg(L(`คุณถูกเตะออกจากปาร์ตี้ "${this.party.name}"`, `You were kicked from the party "${this.party.name}".`), 'err'); this.leave(true); return; }
    this.removeMember(v.id, 'kick');
  },

  // ---------------- แชทปาร์ตี้ ----------------
  sendChat(text) {
    if (!this.party) { UI.msg(L('คุณยังไม่ได้อยู่ในปาร์ตี้ — ตั้งปาร์ตี้ด้วย /party create', 'You\'re not in a party yet — create one with /party create'), 'err'); return; }
    const t = String(text || '').trim().slice(0, 80);
    if (!t) { UI.msg(L('พิมพ์ /p ตามด้วยข้อความ เช่น /p ไปตีบอสกัน', 'Type /p followed by a message, e.g. /p let\'s go fight the boss'), 'err'); return; }
    const now = performance.now();
    if (now - this.lastChat < 600) { UI.msg(L('ส่งข้อความเร็วเกินไป', 'You\'re sending messages too fast.'), 'err'); return; }
    this.lastChat = now;
    this.send('chat', { id: this.me(), name: G.player.name, t });
    UI.msg(L(`[ปาร์ตี้] ${G.player.name} : ${t}`, `[Party] ${G.player.name} : ${t}`), 'party');
  },
  onChat(c) {
    if (!this.party || !c || !c.t || this.gone.has(c.id)) return;
    const m = this.member(c.id);
    UI.msg(L(`[ปาร์ตี้] ${m ? m.name : this.cleanName(c.name)} : ${String(c.t).slice(0, 80)}`, `[Party] ${m ? m.name : this.cleanName(c.name)} : ${String(c.t).slice(0, 80)}`), 'party');
  },
  // คำสั่งแชท: คืน true ถ้าจัดการแล้ว
  chatCmd(text) {
    const mm = /^\/(\S+)\s*([\s\S]*)$/.exec(text);
    if (!mm) return false;
    const cmd = mm[1].toLowerCase(), arg = mm[2].trim(), rest = arg.replace(/^\S+\s*/, '');
    if (cmd === 'party' || cmd === 'pt') {
      const sub = (arg.split(/\s+/)[0] || '').toLowerCase();
      if (sub === 'create' || sub === 'new') this.create(rest);
      else if (sub === 'invite') this.inviteName(rest);
      else if (sub === 'leave') this.leave();
      else UI.toggle('w-party');
      return true;
    }
    if (cmd === 'organize') { this.create(arg); return true; } // แบบ RO
    if (cmd === 'invite') { this.inviteName(arg); return true; }
    if (cmd === 'leave') { this.leave(); return true; }
    if (cmd === 'p') { this.sendChat(arg); return true; }
    return false;
  },

  // ---------------- แบ่ง EXP (Even Share) ----------------
  // สมาชิกที่อยู่แผนที่เดียวกัน ระยะไม่เกิน 25 ช่อง ยังไม่ตาย (ใช้ตำแหน่งสดจากช่องแผนที่ถ้ามี)
  eligible() {
    if (!this.party || !G.map) return [];
    const p = G.player, now = performance.now(), out = [];
    for (const m of this.party.members.values()) {
      if (m.map !== G.map.id || m.dead || now - m.seen > PARTY_TIMEOUT_MS) continue;
      const o = Online.others.get(m.id), x = o ? (o.tx != null ? o.tx : o.x) : m.x, y = o ? (o.ty != null ? o.ty : o.y) : m.y;
      if (U.dist(p.x, p.y, x, y) <= PARTY_RANGE) out.push(m);
    }
    return out;
  },
  // ใช้แทน gainExp ตอนล่ามอน: n คน → EXP รวม = ฐาน × (1 + 0.15 × (n−1)) แล้วหารเท่ากัน
  shareExp(b, j, d) {
    const el = (b > 0 || j > 0) && Online.online ? this.eligible() : [];
    if (!el.length) { gainExp(b, j); return; }
    const n = el.length + 1, k = (1 + PARTY_BONUS * (n - 1)) / n;
    const sb = Math.round(b * k), sj = Math.round(j * k);
    gainExp(sb, sj);
    const pkt = { to: el.map(m => m.id), b: sb, j: sj, mob: d ? d.id : null, map: G.map.id, from: this.me() };
    if (G.fastSim) this.queue.push(pkt); else this.send('pexp', pkt);
  },
  flushQueue() {
    if (!this.queue.length) return;
    const by = new Map();
    for (const q of this.queue) {
      const k = q.map + '|' + q.to.join(',');
      const a = by.get(k);
      if (a) { a.b += q.b; a.j += q.j; } else by.set(k, Object.assign({}, q));
    }
    this.queue = [];
    for (const q of by.values()) this.send('pexp', q);
  },
  onExp(e) {
    if (!this.party || !e || !G.started || !Array.isArray(e.to) || !e.to.includes(this.me())) return;
    if (!this.has(e.from) || e.map !== G.map.id || G.player.dead) return;
    const lim = v => Math.max(0, Math.min(1e9, Math.floor(+v || 0)));
    const b = lim(e.b), j = lim(e.j);
    if (!b && !j) return;
    gainExp(b, j);
    if (!G.fastSim) addFloater(G.player.x, G.player.y - 1.3, `+${U.fmt(b)} EXP`, '#7dffd8');
  },

  // ---------------- ทุก 250 ms ----------------
  tick() {
    if (typeof G === 'undefined' || !G.started || !G.player || !G.map) return;
    if (Online.online && !this.social) this.joinSocial();
    const now = Date.now();
    for (const [k, t] of this.invited) if (t < now) this.invited.delete(k);
    if (this.invite && this.invite.exp < now) this.decline('timeout');
    if (this.party) {
      const pn = performance.now();
      for (const m of [...this.party.members.values()]) if (pn - m.seen > PARTY_TIMEOUT_MS) this.removeMember(m.id, 'timeout');
      if (this.party) { this.heartbeat(false); this.flushQueue(); }
    }
    this.renderHud();
    if (UI.isOpen('w-party')) this.render();
  },
  refresh() { this.renderHud(); if (typeof UI !== 'undefined' && UI.isOpen('w-party')) this.render(); },
  // แตะสมาชิก: แผนที่เดียวกัน = เดินไปหา • คนละแผนที่ = นำทางไปแผนที่นั้น
  goTo(m) {
    if (!m || !G.started) return;
    if (m.map === G.map.id) {
      const o = Online.others.get(m.id), x = o ? o.x : m.x, y = o ? o.y : m.y;
      Nav.goTo({ kind: 'tile', map: G.map.id, x: Math.floor(x), y: Math.floor(y), name: m.name });
    } else if (MAP_DEFS[m.map]) Nav.goTo({ kind: 'map', map: m.map, name: MAP_DEFS[m.map].name });
  },

  // ---------------- HUD ย่อ (แถวสมาชิก: ชื่อ + หลอด HP/SP) ----------------
  renderHud() {
    const el = document.getElementById('party-hud');
    if (!el) return;
    if (!this.party || !G.started) { if (!el.hidden) { el.hidden = true; el.innerHTML = ''; el.dataset.key = ''; } return; }
    const here = G.map.id, lead = this.leaderId();
    const others = this.roster().filter(m => !m.me);
    const key = [this.party.name, this.fold ? 1 : 0, lead === this.me() ? 1 : 0,
      ...others.map(m => `${m.id}:${m.name}:${m.lv}:${m.map === here ? 1 : m.map}:${m.id === lead ? 1 : 0}`)].join('|');
    if (el.dataset.key !== key) {
      el.dataset.key = key; el.innerHTML = '';
      el.classList.toggle('folded', this.fold);
      el.dataset.n = others.length; // CSS จัดแถวตามจำนวนคน (คนเยอะ = แถวบรรทัดเดียว / หลายคอลัมน์บนจอเตี้ย)
      const head = h('button', { type: 'button', class: 'ph-head', title: this.fold ? L('แสดงสมาชิกปาร์ตี้', 'Show party members') : L('ย่อแถบปาร์ตี้', 'Collapse party bar'),
        'aria-expanded': this.fold ? 'false' : 'true', onclick: e => { e.stopPropagation(); this.fold = !this.fold; this.renderHud(); } },
      h('span', { class: 'ph-k' }, 'PARTY'), h('span', { class: 'ph-name' }, this.party.name), h('span', { class: 'ph-n' }, `${others.length + 1}/${PARTY_MAX}`), h('i', { class: 'ph-chev' }));
      el.append(head);
      if (!this.fold) {
        const list = h('div', { class: 'ph-list' });
        for (const m of others) {
          const off = m.map !== here;
          const row = h('button', { type: 'button', class: 'ph-row' + (off ? ' off' : ''), 'data-id': m.id,
            title: off ? L(`${m.name} อยู่ที่ ${MAP_DEFS[m.map] ? MAP_DEFS[m.map].name : m.map} — แตะเพื่อนำทางไปแผนที่นั้น`, `${m.name} is in ${MAP_DEFS[m.map] ? MAP_DEFS[m.map].name : m.map} — tap to navigate to that map`) : L(`${m.name} — แตะเพื่อเดินไปหา`, `${m.name} — tap to walk over`),
            onclick: e => { e.stopPropagation(); this.goTo(this.member(m.id)); } },
          h('span', { class: 'ph-top' }, m.id === lead ? h('i', { class: 'ph-crown', html: partySvg('crown') }) : null,
            h('b', {}, m.name), h('small', {}, off ? (MAP_DEFS[m.map] ? MAP_DEFS[m.map].name : '—') : `Lv ${m.lv}`)),
          off ? null : h('span', { class: 'ph-bars' }, h('i', { class: 'hp' }, h('b')), h('i', { class: 'sp' }, h('b'))));
          list.append(row);
        }
        if (!others.length) list.append(h('button', { type: 'button', class: 'ph-row ph-add', onclick: e => { e.stopPropagation(); UI.open('w-party'); } },
          h('span', { class: 'ph-top', html: L(`${partySvg('plus')}<b>เชิญสมาชิก</b>`, `${partySvg('plus')}<b>Invite Members</b>`) })));
        el.append(list);
      }
    }
    // อัปเดตหลอดทุกรอบ (ไม่สร้าง DOM ใหม่)
    for (const row of el.querySelectorAll('.ph-row[data-id]')) {
      const m = this.member(row.dataset.id);
      if (!m) continue;
      row.classList.toggle('dead', !!m.dead);
      const hp = row.querySelector('.hp b'), sp = row.querySelector('.sp b');
      if (hp) { const k = U.clamp(m.hp / m.maxHp, 0, 1); hp.style.width = (k * 100).toFixed(1) + '%'; hp.parentNode.classList.toggle('low', k < 0.25); }
      if (sp) sp.style.width = (U.clamp(m.sp / m.maxSp, 0, 1) * 100).toFixed(1) + '%';
    }
    el.hidden = false;
  },

  // ---------------- หน้าต่างปาร์ตี้ (Y) ----------------
  render() {
    const w = document.getElementById('w-party');
    if (!w) return;
    const body = w.querySelector('.win-body');
    const online = Online.online && !!Online.sb, here = G.map.id, me = this.me();
    const roster = this.roster(), lead = this.leaderId(), leader = this.isLeader(), elig = this.eligible().length;
    const near = online ? [...Online.others.values()].filter(o => !this.has(o.id) && o.name).sort((a, b) => U.dist(G.player.x, G.player.y, a.x, a.y) - U.dist(G.player.x, G.player.y, b.x, b.y)) : [];
    const pend = id => (this.invited.get(id) || 0) > Date.now();
    const key = JSON.stringify([online, this.party && this.party.name, lead, elig, here,
      roster.map(m => [m.id, m.name, m.job, m.lv, m.map, m.dead, Math.round(m.hp / m.maxHp * 100), Math.round(m.sp / m.maxSp * 100), m.hp, m.maxHp]),
      near.map(o => [o.id, o.name, o.job, o.baseLv, pend(o.id)])]);
    if (body.dataset.key === key) return;
    // กำลังพิมพ์ชื่อปาร์ตี้อยู่: อย่าสร้างใหม่ (เคอร์เซอร์จะหลุด)
    if (document.activeElement && body.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;
    body.dataset.key = key;
    const scroll = body.scrollTop;
    body.innerHTML = '';
    w.querySelector('.win-title span').textContent = this.party ? L(`ปาร์ตี้ — ${this.party.name}`, `Party — ${this.party.name}`) : L('ปาร์ตี้ (Party)', 'Party');
    const icon = (k, cls) => h('span', { class: cls || 'py-ic', html: partySvg(k) });
    const avatar = (job, crown) => {
      const em = Art.get('emblem_' + job);
      return h('span', { class: 'py-av', style: `--c:${(JOBS[job] && JOBS[job].glow) || '#6ff3ff'}` },
        em ? h('img', { src: em.src, alt: '' }) : h('i'), crown ? h('i', { class: 'py-crown', title: L('หัวหน้าปาร์ตี้', 'Party Leader'), html: partySvg('crown') }) : null);
    };
    const nearList = (canInvite) => {
      const box = h('div', { class: 'py-near' });
      for (const o of near) {
        const p = pend(o.id);
        box.append(h('div', { class: 'py-nrow' }, avatar(o.job),
          h('span', { class: 'py-mid' }, h('b', {}, o.name), h('small', {}, `${JOBS[o.job] ? JOBS[o.job].name : ''} · Lv ${o.baseLv || 1}${o.dead ? L(' · ล้มอยู่', ' · fallen') : ''}`)),
          canInvite ? h('button', { type: 'button', class: 'btn small py-inv' + (p ? ' wait' : ''), disabled: p ? 'disabled' : false,
            onclick: () => this.sendInvite({ id: o.id, name: o.name }) }, p ? L('รอตอบ…', 'Waiting…') : L('เชิญ', 'Invite')) : null));
      }
      if (!near.length) box.append(h('div', { class: 'py-none' }, L('ยังไม่มีผู้เล่นอื่นในแผนที่นี้ • ชวนคนที่อยู่แผนที่อื่นได้ด้วย /invite ชื่อ', 'No other players on this map yet • Invite players on other maps with /invite name')));
      return box;
    };

    if (!online) {
      body.append(h('div', { class: 'py-empty' }, icon('party', 'py-hero'),
        h('b', {}, L('ปาร์ตี้ใช้ได้ในโหมดออนไลน์', 'Parties are available in online mode')),
        h('p', {}, Online.loggedIn ? L(`ตอนนี้คุณเล่นด้วยบัญชีในเครื่อง (${Online.username}) จึงยังไม่เห็นผู้เล่นคนอื่น`, `You're playing with a local account (${Online.username}), so you can't see other players yet.`) : L('ตอนนี้คุณเล่นแบบไม่ล็อกอิน (เซฟในเครื่องนี้) จึงยังไม่เห็นผู้เล่นคนอื่น', 'You\'re playing without logging in (saved on this device), so you can\'t see other players yet.')),
        h('p', { class: 'py-dim' }, L('เมื่อเชื่อมต่อเซิร์ฟเวอร์ออนไลน์ได้ คุณจะตั้งปาร์ตี้ ชวนเพื่อน แชทในทีม และแบ่ง EXP กันได้', 'Once connected to the online server, you can form parties, invite friends, chat with your team, and share EXP.'))));
      body.scrollTop = scroll;
      return;
    }

    if (!this.party) {
      const inp = h('input', { type: 'text', maxlength: 24, placeholder: L(`ปาร์ตี้ของ ${G.player.name}`, `${G.player.name}'s Party`), 'aria-label': L('ชื่อปาร์ตี้', 'Party name'),
        onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); this.create(inp.value); } e.stopPropagation(); } });
      body.append(
        h('div', { class: 'py-empty' }, icon('party', 'py-hero'),
          h('b', {}, L('ยังไม่มีปาร์ตี้', 'No Party Yet')),
          h('p', {}, L('รวมทีมได้สูงสุด 6 คน ล่ามอนใกล้กันได้ EXP แบ่งเท่ากัน + โบนัส 15% ต่อสมาชิกที่ร่วมล่า', 'Team up with up to 6 players. Hunt near each other to share EXP evenly, plus a 15% bonus for each member who joins the hunt.')),
          h('div', { class: 'py-create' }, inp, h('button', { type: 'button', class: 'btn py-go', onclick: () => this.create(inp.value) }, L('สร้างปาร์ตี้', 'Create Party')))),
        h('div', { class: 'py-sec' }, h('span', {}, L('ผู้เล่นในแผนที่นี้', 'Players on This Map')), h('small', {}, near.length ? L(`${near.length} คน · เชิญ = ตั้งปาร์ตี้ให้อัตโนมัติ`, `${near.length} here · Inviting creates a party automatically`) : '')),
        nearList(true),
        h('div', { class: 'hint' }, L('คำสั่งแชท: /party create • /invite ชื่อ • /leave • /p ข้อความ', 'Chat commands: /party create • /invite name • /leave • /p message')));
      body.scrollTop = scroll;
      return;
    }

    const list = h('div', { class: 'py-list' });
    for (const m of roster) {
      const off = m.map !== here, hk = U.clamp(m.hp / m.maxHp, 0, 1), sk = U.clamp(m.sp / m.maxSp, 0, 1);
      const bar = (cls, k, txt) => h('span', { class: 'py-bar ' + cls + (cls === 'hp' && k < 0.25 ? ' low' : '') }, h('i', {}, h('b', { style: `width:${(k * 100).toFixed(1)}%` })), h('em', {}, txt));
      list.append(h('div', { class: `py-row${m.me ? ' me' : ''}${off ? ' off' : ''}${m.dead ? ' dead' : ''}` },
        avatar(m.job, m.id === lead),
        h('span', { class: 'py-mid' },
          h('span', { class: 'py-n' }, h('b', {}, m.name), m.me ? h('em', {}, L('คุณ', 'You')) : null, m.id === lead ? h('small', { class: 'py-lead' }, L('หัวหน้า', 'Leader')) : null,
            h('small', { class: 'py-s' }, `${JOBS[m.job] ? JOBS[m.job].name : ''} · Lv ${m.lv}${m.dead ? L(' · ล้ม', ' · fallen') : ''}`)),
          off ? h('span', { class: 'py-map', html: `${partySvg('pin')}<span>${U.esc(MAP_DEFS[m.map] ? MAP_DEFS[m.map].name : m.map)}</span>` })
            : h('span', { class: 'py-bars' }, bar('hp', hk, `${Math.round(m.hp)}/${m.maxHp}`), bar('sp', sk, `${Math.round(m.sp)}/${m.maxSp}`))),
        leader && !m.me ? h('button', { type: 'button', class: 'btn small danger py-kick', title: L(`เตะ ${m.name} ออกจากปาร์ตี้`, `Kick ${m.name} from the party`), onclick: () => this.kick(m.id) }, L('เตะ', 'Kick')) : null));
    }
    const n = elig + 1;
    body.append(
      h('div', { class: 'py-head' },
        h('span', { class: 'py-count' }, h('b', {}, String(roster.length)), `/${PARTY_MAX}`),
        h('span', { class: 'py-share' }, h('b', {}, L('แบ่ง EXP เท่ากัน', 'Even EXP Share')),
          h('small', {}, n > 1 ? L(`ตอนนี้แบ่งกับ ${n - 1} คน · EXP รวม +${Math.round(PARTY_BONUS * (n - 1) * 100)}%`, `Sharing with ${n - 1} now · Total EXP +${Math.round(PARTY_BONUS * (n - 1) * 100)}%`) : L(`ต้องอยู่แผนที่เดียวกันในระยะ ${PARTY_RANGE} ช่อง`, `Must be on the same map within ${PARTY_RANGE} tiles`)))),
      list);
    if (leader && roster.length < PARTY_MAX) body.append(h('div', { class: 'py-sec' }, h('span', {}, L('เชิญผู้เล่นใกล้ ๆ', 'Invite Nearby Players')), h('small', {}, near.length ? L(`${near.length} คนในแผนที่นี้`, `${near.length} on this map`) : '')), nearList(true));
    else if (!leader) body.append(h('div', { class: 'py-none' }, L('เฉพาะหัวหน้าปาร์ตี้ (มงกุฎ) ที่เชิญและเตะสมาชิกได้', 'Only the party leader (crown) can invite and kick members.')));
    body.append(
      h('div', { class: 'py-foot' }, h('span', { class: 'hint' }, L('แชทปาร์ตี้: /p ข้อความ • แตะชื่อบนแถบปาร์ตี้เพื่อเดินไปหาเพื่อน', 'Party chat: /p message • Tap a name on the party bar to walk to a friend')),
        h('button', { type: 'button', class: 'btn danger py-leave', onclick: () => this.leave() }, L('ออกจากปาร์ตี้', 'Leave Party'))));
    body.scrollTop = scroll;
  },
};

setInterval(() => Party.tick(), 250);
// ปิดแท็บ/รีเฟรช: บอกสมาชิกว่าออกแล้ว (ไม่ต้องรอหมดเวลา 10 วินาที)
window.addEventListener('pagehide', () => { if (Party.party) Party.send('leave', { id: Party.me(), since: Party.party.since }); });
