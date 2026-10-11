'use strict';
// ============================================================
//  ระบบตรวจเซฟ — ฝั่งเกม (เซิร์ฟเวอร์: supabase/migrations/20261012000000_save_verify.sql • อธิบาย: docs/SAVE_VERIFY.md)
//  1) บันทึกการโอนระหว่างผู้เล่น: ตลาดกลาง (market_record) / แลกเปลี่ยน (trade_record) — ทั้งสองฝ่ายบันทึกฝั่งของตัวเอง
//     เซิร์ฟเวอร์ยอมให้ Volt/ของเพิ่มตามรายการที่สองฝ่ายยืนยันตรงกัน • เซฟรอบถัดไปรอให้รายการของเราส่งถึงก่อน (flush)
//     เซิร์ฟเวอร์ที่ยังไม่ได้รัน migration (ไม่มีฟังก์ชัน → PGRST202) = ข้ามเงียบ ๆ เกมทำงานแบบเดิม
//  2) เซฟถูกปฏิเสธ ('save_rejected:<กติกา>' — โหมด enforce): เล่นต่อได้ สำเนาในเครื่องยังอยู่ · แจ้งเป็นภาษาไทย · ลองใหม่ห่างขึ้นเรื่อย ๆ
//     ปฏิเสธติดกัน 3 ครั้ง → เก็บสำรองความคืบหน้าในเครื่อง แล้วให้เลือก "เล่นต่อ" หรือ "โหลดเซฟจากเซิร์ฟเวอร์"
//  3) บัญชีที่เจ้าของปฏิเสธ (player_bans): ล็อกอินแล้วขึ้นเหตุผล เข้าเล่นออนไลน์ไม่ได้
//  4) หน้าตั้งค่า: บรรทัดเล็ก "ตรวจเซฟล่าสุด" (ผ่าน/ถูกปฏิเสธ + เวลา)
// ============================================================
const SaveVerify = {
  server: null,      // null = ยังไม่รู้ • true = มีฟังก์ชันบนเซิร์ฟเวอร์ • false = ยังไม่ได้รัน migration
  pending: new Set(), // คำขอบันทึกการโอนที่ยังไม่ตอบ
  recent: [],        // รายการที่บันทึกแล้วแต่อีกฝ่ายยังไม่ยืนยัน (ลองถามซ้ำก่อนเซฟ)
  strikes: 0, holdUntil: 0, last: null, banned: null, STRIKES: 3,

  usable() { return typeof Online !== 'undefined' && Online.online && !Online.local && !!Online.sb && this.server !== false; },
  missing(error) { return !!error && (error.code === 'PGRST202' || error.code === '42883' || /Could not find the function|does not exist/i.test(error.message || '')); },

  // ---------- 1) บันทึกการโอน ----------
  call(fn, args) {
    if (!this.usable()) return Promise.resolve(null);
    const p = Promise.resolve(Online.sb.rpc(fn, args)).then(({ data, error }) => {
      if (this.missing(error)) { this.server = false; return null; }
      if (error) { console.warn('บันทึกการโอนไม่สำเร็จ', fn, error.message || error); return null; }
      this.server = true;
      return !!data; // true = อีกฝ่ายบันทึกตรงกันแล้ว
    }).catch(e => { console.warn('บันทึกการโอนไม่สำเร็จ', fn, e); return null; }).finally(() => this.pending.delete(p));
    this.pending.add(p);
    return p;
  },
  remember(fn, args, p) {
    p.then(paired => { if (paired === false) { this.recent.push({ fn, args, at: Date.now() }); if (this.recent.length > 20) this.recent.shift(); } });
    return p;
  },
  // ตลาดกลาง — ผู้ขายและผู้ซื้อเรียกด้วยค่าชุดเดียวกัน (price = ราคาต่อชิ้น)
  market(tid, seller, buyer, item, qty, price, cards) {
    const args = { tid: String(tid).slice(0, 64), seller, buyer, item, qty: Math.floor(+qty) || 0, price: Math.floor(+price) || 0, cards: Array.isArray(cards) ? cards.slice(0, 4) : [] };
    return this.remember('market_record', args, this.call('market_record', args));
  },
  // แลกเปลี่ยน — gave/got = ข้อเสนอฝั่งเรา/ฝั่งเขา { zeny, items:[{ id, qty, cards }] }
  trade(tid, peer, gave, got) {
    const pick = o => ({ zeny: Math.floor(+(o && o.zeny)) || 0, items: ((o && o.items) || []).map(x => ({ id: x.id, qty: Math.floor(+x.qty) || 1, cards: (x.cards || []).slice() })) });
    const args = { tid: String(tid).slice(0, 64), peer, gave: pick(gave), got: pick(got) };
    return this.remember('trade_record', args, this.call('trade_record', args));
  },
  // ก่อนเซฟ: รอให้รายการโอนของเราถึงเซิร์ฟเวอร์ + ถามซ้ำรายการที่อีกฝ่ายยังไม่ยืนยัน (ไม่เกิน ~3 วิ — ไม่ค้างเซฟ)
  async flush(ms = 3000) {
    const end = performance.now() + ms, sleep = t => new Promise(r => setTimeout(r, t));
    if (this.pending.size) await Promise.race([Promise.all([...this.pending]), sleep(ms)]);
    this.recent = this.recent.filter(x => Date.now() - x.at < 8000);
    for (let round = 0; this.recent.length && round < 3 && performance.now() < end; round++) {
      await sleep(350);
      const still = [];
      for (const x of this.recent) { const ok = await this.call(x.fn, x.args); if (ok === false) still.push(x); }
      this.recent = still;
    }
  },

  // ---------- 2) ผลการเซฟ ----------
  waitMs() { return Math.max(0, this.holdUntil - Date.now()); },
  onSaveOk() {
    if (this.strikes) UI.msg(L('✓ เซิร์ฟเวอร์รับเซฟแล้ว', '✓ The server accepted your save.'), 'sys');
    this.strikes = 0; this.holdUntil = 0; this.last = { ok: true, at: Date.now() };
    this.paint();
  },
  // คืน true = จัดการแล้ว (Online.flushSave ไม่ต้องทำต่อ)
  onSaveError(error) {
    const msg = String((error && error.message) || error || '');
    if (/\bbanned\b/.test(msg)) { this.showBan(this.banned || ''); return true; }
    const m = msg.match(/save_rejected:([a-z_]+)/);
    if (!m) return false;
    const rule = m[1];
    this.strikes++;
    this.last = { ok: false, rule, at: Date.now() };
    this.holdUntil = Date.now() + [0, 8000, 20000, 60000][Math.min(3, this.strikes)];
    UI.msg(L(`⚠ เซิร์ฟเวอร์ไม่รับเซฟล่าสุด (${this.ruleName(rule)}) — เล่นต่อได้ตามปกติ ความคืบหน้ายังเก็บไว้ในเครื่องนี้ ระบบจะลองบันทึกใหม่เอง`,
      `⚠ The server rejected your latest save (${this.ruleName(rule)}) — keep playing; your progress is kept on this device and will be retried.`), 'err');
    if (this.usable()) Promise.resolve(Online.sb.rpc('save_verify_report', { rule, detail: { strikes: this.strikes } })).catch(() => {});
    if (this.strikes >= this.STRIKES) this.showRejected(rule);
    this.paint();
    return true;
  },
  ruleName(r) {
    return ({
      worth_rate: L('Volt/ไอเทมเพิ่มเร็วผิดปกติ', 'Volt/items rose too fast'), exp_rate: L('Base EXP เพิ่มเร็วผิดปกติ', 'Base EXP rose too fast'),
      jexp_rate: L('Job EXP เพิ่มเร็วผิดปกติ', 'Job EXP rose too fast'), level_rate: L('เลเวลขึ้นเร็วผิดปกติ', 'levels rose too fast'),
      level_cap: L('เลเวลเกินเพดาน', 'level above cap'), job_level_cap: L('Job Level เกินเพดาน', 'Job Level above cap'), stat_cap: L('Stat เกินเพดาน', 'stat above cap'),
      stat_points: L('แต้ม Stat ไม่ตรงกับเลเวล', 'stat points don’t match level'), zeny_range: L('จำนวน Volt ผิดปกติ', 'invalid Volt'), qty_range: L('จำนวนไอเทมผิดปกติ', 'invalid item amount'),
      refine_cap: L('ค่าตีบวกเกินเพดาน', 'refine above cap'), card_range: L('ชิปผิดช่อง', 'invalid chips'), job_path: L('เปลี่ยน Class ข้ามขั้น', 'skipped a Class step'), exp_range: L('EXP ผิดปกติ', 'invalid EXP'),
    })[r] || r;
  },
  // เก็บสำรองความคืบหน้าในเครื่อง (ไม่ทิ้งเงียบ ๆ) — คืนชื่อคีย์
  backup() {
    try {
      const raw = localStorage.getItem(Online.mirrorKey());
      if (!raw) return null;
      const k = `nm_rejected_backup_${Online.user && Online.user.id}_${Date.now()}`;
      localStorage.setItem(k, raw);
      return k;
    } catch (e) { return null; }
  },
  modal(id, title, text, buttons) {
    if (document.getElementById(id)) return;
    const el = document.createElement('div');
    el.id = id; el.className = 'sv-modal'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-modal', 'true');
    const card = document.createElement('div'); card.className = 'dk-card';
    const t = document.createElement('h2'); t.textContent = title;
    const p = document.createElement('p'); p.textContent = text;
    const row = document.createElement('div'); row.className = 'sv-btns';
    for (const [label, fn, bid] of buttons) { const b = document.createElement('button'); b.type = 'button'; b.id = bid; b.textContent = label; b.onclick = () => fn(el); row.append(b); }
    card.append(t, p, row); el.append(card); document.body.append(el);
    const first = row.querySelector('button'); if (first) first.focus({ preventScroll: true });
  },
  showRejected(rule) {
    const key = this.backup();
    this.modal('sv-reject', L('เซิร์ฟเวอร์ไม่รับเซฟติดกันหลายครั้ง', 'The server keeps rejecting your save'),
      L(`ข้อมูลตัวละครในเครื่องนี้ไม่ตรงกับที่เซิร์ฟเวอร์ตรวจได้ (${this.ruleName(rule)}) จึงยังไม่ถูกบันทึกขึ้นเซิร์ฟเวอร์ — เก็บสำรองไว้ในเครื่องแล้ว${key ? '' : ' (สำรองไม่สำเร็จ)'}\nเล่นต่อได้ (ระบบจะลองบันทึกใหม่ทุก 1 นาที) หรือโหลดเซฟล่าสุดจากเซิร์ฟเวอร์กลับมาเล่นต่อ ถ้าคิดว่าเป็นความผิดพลาด แจ้งผู้ดูแลเกมได้`,
        `This device's character data doesn't match what the server can verify (${this.ruleName(rule)}), so it hasn't been saved to the server. A backup was kept on this device${key ? '' : ' (backup failed)'}.\nKeep playing (retries every minute) or load the latest server save. If you think this is a mistake, contact the game admin.`),
      [[L('เล่นต่อ', 'Keep playing'), el => el.remove(), 'sv-keep'],
       [L('โหลดเซฟจากเซิร์ฟเวอร์', 'Load the server save'), () => this.reloadServer(), 'sv-reload']]);
  },
  // ทิ้งสำเนาในเครื่อง (สำรองไว้แล้ว) แล้วโหลดหน้าใหม่ → loadCharacter อ่านเซฟจากเซิร์ฟเวอร์
  reloadServer() {
    this.backup();
    clearTimeout(Online.saveTimer); Online.saveTimer = null; Online.pendingSave = null; Online.kicked = true; // ไม่ให้เซฟรอบสุดท้ายส่งของเก่าขึ้นไปอีก
    try { localStorage.removeItem(Online.mirrorKey()); } catch (e) { /* โหมดส่วนตัว */ }
    location.reload();
  },

  // ---------- 3) บัญชีที่ถูกปฏิเสธ ----------
  async checkBan() {
    if (!this.usable()) return null;
    try {
      const { data, error } = await Online.sb.rpc('my_ban');
      if (this.missing(error)) { this.server = false; return null; }
      if (error) return null;
      this.server = true;
      this.banned = data || null;
      return this.banned;
    } catch (e) { return null; }
  },
  banText(reason) {
    return L(`บัญชีนี้ถูกระงับการเล่นออนไลน์โดยผู้ดูแลเกม${reason && reason !== 'banned' ? ` — เหตุผล: ${reason}` : ''} (ข้อมูลตัวละครไม่ผ่านการตรวจของเซิร์ฟเวอร์) ติดต่อผู้ดูแลเกมหากคิดว่าเป็นความผิดพลาด`,
      `This account has been blocked from online play by the game admin${reason && reason !== 'banned' ? ` — reason: ${reason}` : ''} (character data failed the server's checks). Contact the admin if you think this is a mistake.`);
  },
  showBan(reason) {
    clearTimeout(Online.saveTimer); Online.saveTimer = null; Online.pendingSave = null; Online.kicked = true;
    this.modal('sv-ban', L('บัญชีถูกระงับ', 'Account blocked'), this.banText(reason),
      [[L('กลับหน้าล็อกอิน', 'Back to login'), () => { Online.logout().catch(() => {}).finally(() => location.reload()); }, 'sv-ban-ok']]);
  },

  // ---------- 4) หน้าตั้งค่า ----------
  status() {
    if (typeof Online === 'undefined' || !Online.online || Online.local) return '';
    if (this.server === false) return L('ตรวจเซฟ: เซิร์ฟเวอร์ยังไม่เปิดระบบ', 'Save check: not enabled on the server');
    const l = this.last;
    if (!l) return L('ตรวจเซฟ: ยังไม่มีการเซฟรอบนี้', 'Save check: no save yet this session');
    const t = new Date(l.at).toLocaleTimeString();
    return l.ok ? L(`ตรวจเซฟล่าสุด: ผ่าน · ${t}`, `Last save check: passed · ${t}`) : L(`ตรวจเซฟล่าสุด: ไม่ผ่าน (${this.ruleName(l.rule)}) · ${t}`, `Last save check: rejected (${this.ruleName(l.rule)}) · ${t}`);
  },
  paint() {
    const el = document.getElementById('sv-status');
    if (el) el.textContent = this.status();
  },
  boot() {
    if (typeof UI === 'undefined' || !UI.renderOptions || UI.renderOptions.__sv) return;
    const orig = UI.renderOptions;
    UI.renderOptions = function () {
      const r = orig.apply(this, arguments);
      const body = document.querySelector('#w-options .win-body') || document.getElementById('w-options');
      if (body && !document.getElementById('sv-status')) { const d = document.createElement('div'); d.id = 'sv-status'; d.className = 'hint'; body.append(d); }
      SaveVerify.paint();
      return r;
    };
    UI.renderOptions.__sv = true;
  },
};
window.addEventListener('DOMContentLoaded', () => SaveVerify.boot());
