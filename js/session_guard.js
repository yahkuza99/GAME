'use strict';
// ============================================================
//  ป้องกันล็อกอินซ้ำ — บัญชีเดียวเล่นได้ทีละหน้าเดียว (ใหม่ล่าสุดชนะ)
//  ล็อกอิน/กู้เซสชันแล้ว "ประกาศตัว" (claim) บนช่องของบัญชี • หน้าเก่าที่ได้ยิน → หยุดเซฟทันที ตัดช่องเรียลไทม์ทั้งหมด
//  แล้วขึ้นหน้าต่างให้กลับหน้าล็อกอิน (อันตรายจริงคือเซฟอัตโนมัติของหน้าเก่าไปทับความคืบหน้าใหม่ของหน้าใหม่)
//  ออนไลน์: Supabase Realtime broadcast ช่อง `acct:<user.id>` (ไม่ใช้ตาราง/สคีมา) • ในเครื่อง: BroadcastChannel (สำรอง: storage event)
//  ข้อความ { k: 'claim'|'hb', sid, t } — เทียบ (t, sid) ใหม่กว่าชนะ • หน้าที่เล่นมานาน (> WINDOW_MS) ยอมให้ claim ใหม่เสมอ
//  (กันนาฬิกาสองเครื่องเหลื่อม) • hb ทุก HB_MS กันกรณีหน้าเก่าหลับ/หลุดจนพลาด claim
//  ฝั่งเซิร์ฟเวอร์บังคับด้วย claim_session + trigger บนตาราง characters (เซฟจากเครื่องเก่าถูกปฏิเสธ แม้ไคลเอนต์ถูกแก้)
// ============================================================
const SessionGuard = {
  sid: Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4),
  uid: null, t: 0, since: 0, sentAt: 0, kicked: false, lastDefend: 0, server: false, serverP: null,
  ch: null, bc: null, hbTimer: null, store: null,
  SETTLE_MS: 1200, HB_MS: 15000, WINDOW_MS: 5000,

  start(uid) {
    if (!uid) return;
    if (this.uid === uid && !this.kicked && (this.ch || this.bc || this.store)) return;
    this.stop();
    this.uid = uid; this.t = Date.now(); this.since = performance.now(); this.sentAt = 0;
    if (Online.local) this.openLocal(uid); else if (Online.sb) this.openCloud(uid); else return;
    clearInterval(this.hbTimer);
    this.hbTimer = setInterval(() => { if (this.sentAt) this.send({ k: 'hb', sid: this.sid, t: this.t }); }, this.HB_MS);
  },
  stop() {
    clearInterval(this.hbTimer); this.hbTimer = null;
    if (this.ch && Online.sb) { try { Online.sb.removeChannel(this.ch); } catch (e) { /* ปิดแล้ว */ } }
    if (this.bc) { try { this.bc.close(); } catch (e) { /* ปิดแล้ว */ } }
    if (this.store) window.removeEventListener('storage', this.store);
    this.ch = this.bc = this.store = null; this.uid = null; this.sentAt = 0; this.server = false; this.serverP = null;
    this.kicked = false; if (typeof Online !== 'undefined') Online.kicked = false;
  },
  openCloud(uid) {
    const ch = Online.sb.channel('acct:' + uid, { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: 'g' }, ({ payload }) => this.recv(payload));
    ch.subscribe(status => { if (status === 'SUBSCRIBED' && this.ch === ch) this.claim(); });
    this.ch = ch;
  },
  openLocal(uid) {
    const name = 'iv_acct:' + uid;
    if (typeof BroadcastChannel === 'function') {
      this.bc = new BroadcastChannel(name);
      this.bc.onmessage = e => this.recv(e.data);
    } else { // เบราว์เซอร์เก่า: ส่งผ่าน storage event (เกิดเฉพาะอีกแท็บ)
      this.store = e => { if (e.key === name && e.newValue) { try { this.recv(JSON.parse(e.newValue)); } catch (x) { /* ข้อความเสีย */ } } };
      window.addEventListener('storage', this.store);
    }
    this.claim();
  },
  send(m) {
    if (this.ch) { try { this.ch.send({ type: 'broadcast', event: 'g', payload: m }); } catch (e) { /* ช่องปิด */ } }
    else if (this.bc) this.bc.postMessage(m);
    else if (this.store) { try { localStorage.setItem('iv_acct:' + this.uid, JSON.stringify({ ...m, n: Math.random() })); } catch (e) { /* โหมดส่วนตัว */ } }
  },
  claim() { this.sentAt = performance.now(); this.send({ k: 'claim', sid: this.sid, t: this.t }); this.claimServer(); },
  // ฝั่งเซิร์ฟเวอร์ (supabase/migrations/20261011000000_single_session.sql): เครื่องที่ claim ล่าสุดเป็นเจ้าของ
  // เซฟที่ไม่แนบ sid ของเจ้าของถูกฐานข้อมูลปฏิเสธ ('stale_session') — server = true เมื่อฐานข้อมูลรองรับแล้ว
  claimServer() {
    if (!this.uid || this.kicked || typeof Online === 'undefined' || Online.local || !Online.sb) return;
    const uid = this.uid;
    this.serverP = Promise.resolve(Online.sb.rpc('claim_session', { s: this.sid })).then(({ error }) => {
      if (this.uid !== uid) return;
      this.server = !error; // ยังไม่มีฟังก์ชันบนเซิร์ฟเวอร์ = เซฟแบบเดิม (ไม่แนบ sid)
    }).catch(() => { /* เน็ตหลุด: ลองใหม่ตอน claim/defend รอบหน้า */ });
  },
  defend() { // อีกฝั่งเก่ากว่า (หรือเพิ่งตื่น) → ประกาศซ้ำให้มันหยุด
    const now = performance.now();
    if (now - this.lastDefend < 2000) return;
    this.lastDefend = now; this.claim();
  },
  recv(m) {
    if (!this.uid || this.kicked || !m || !m.sid || m.sid === this.sid || typeof m.t !== 'number') return;
    const newer = m.t > this.t || (m.t === this.t && m.sid > this.sid);
    if (m.k === 'claim') { if (newer || performance.now() - this.since > this.WINDOW_MS) this.kick(); else this.defend(); }
    else if (m.k === 'hb') { if (newer) this.kick(); else this.defend(); }
  },
  // รอให้หน้าเก่าได้ยินแล้วหยุดเซฟ ก่อนหน้าใหม่อ่านเซฟ (เฉพาะออนไลน์ — ในเครื่องเซฟเป็นแบบซิงก์อยู่แล้ว)
  async settle() {
    if (!this.uid || this.kicked || (typeof Online !== 'undefined' && Online.local)) return;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const end = performance.now() + 4000;
    while (!this.sentAt && performance.now() < end && !this.kicked) await sleep(40);
    if (!this.sentAt) return;
    if (this.serverP) await Promise.race([this.serverP, sleep(3000)]); // ให้เซิร์ฟเวอร์รู้จักเราก่อนอ่านเซฟ
    const w = this.SETTLE_MS - (performance.now() - this.sentAt);
    if (w > 0) await sleep(w);
  },

  kick() {
    if (this.kicked) return;
    this.kicked = true; Online.kicked = true;
    clearInterval(this.hbTimer); this.hbTimer = null;
    // 1) หยุดเซฟ: ทิ้งที่ค้างอยู่ (ไม่เซฟรอบสุดท้าย — ไม่ให้ทับของหน้าใหม่)
    clearTimeout(Online.saveTimer); Online.saveTimer = null; Online.pendingSave = null;
    // 2) ตัดช่องเรียลไทม์ทั้งหมด
    try { Online.leaveMap(); } catch (e) { /* ยังไม่ได้เข้าแผนที่ */ }
    const sb = Online.sb;
    if (sb) {
      if (typeof sb.removeAllChannels === 'function') { try { sb.removeAllChannels(); } catch (e) { /* ignore */ } }
      else for (const c of [Online.chatChannel, this.ch, window.Market && Market.ch, typeof Social !== 'undefined' && Social.ch, window.Party && Party.social, window.Raid && Raid.rch, window.Trade && Trade.ch]) { if (c) { try { sb.removeChannel(c); } catch (e) { /* ignore */ } } }
    }
    Online.chatChannel = null; this.ch = null; Online.sb = null;
    if (this.bc) { try { this.bc.close(); } catch (e) { /* ignore */ } this.bc = null; }
    if (this.store) { window.removeEventListener('storage', this.store); this.store = null; }
    this.showModal();
  },
  showModal() {
    if (document.getElementById('dup-kick')) return;
    const el = document.createElement('div');
    el.id = 'dup-kick'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'dup-kick-t');
    const card = document.createElement('div'); card.className = 'dk-card';
    const t = document.createElement('h2'); t.id = 'dup-kick-t'; t.textContent = L('บัญชีนี้เข้าเล่นจากเครื่อง/แท็บอื่นแล้ว', 'This account is now playing on another device or tab.');
    const p = document.createElement('p');
    p.textContent = L('หน้านี้หยุดบันทึกแล้ว เพื่อไม่ให้ความคืบหน้าล่าสุดจากอีกหน้าถูกทับ กดปุ่มด้านล่างเพื่อกลับหน้าล็อกอิน (ถ้าอยากเล่นต่อที่หน้านี้ ให้ล็อกอินใหม่ — อีกหน้าจะถูกตัดออกแทน)', 'This page stopped saving so your latest progress from the other page is not overwritten. Press the button to return to the login screen (log in again here to take over; the other page will be disconnected instead).');
    const b = document.createElement('button'); b.type = 'button'; b.id = 'dup-kick-btn'; b.textContent = L('กลับหน้าล็อกอิน', 'Back to login');
    b.onclick = () => { try { sessionStorage.setItem('nm_dupkick', '1'); } catch (e) { /* โหมดส่วนตัว */ } location.reload(); };
    card.append(t, p, b); el.append(card); document.body.append(el);
    b.focus({ preventScroll: true });
  },
};
