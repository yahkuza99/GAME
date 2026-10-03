'use strict';
// ============================================================
//  UI ชุดใหม่ เฟส 2 — ส่วนที่ต้องใช้ JS (หน้าตาอยู่ใน css/theme2.css)
//  1) ไอคอนเส้นทองของปุ่มเมนูที่ไฟล์อื่นเพิ่มเข้ามา (แลกเปลี่ยน / คู่มือ Class / กาชา) — ใช้ชุดเดียวกับ js/icons.js
//  2) การ์ดเควสต์ใต้การ์ดตัวละคร: แท็บ Quest / Daily (ดูภารกิจประจำวันได้ทันทีโดยไม่ต้องเปิดสมุด)
//  3) สมุด (หน้าต่างแบบหนังสือ) เปิดอยู่บนคอม: แชทและการ์ดเควสต์จางลง ไม่ถูกปกสมุดทับครึ่ง ๆ
//  ไม่แตะตรรกะเกม — ห่อฟังก์ชัน UI เดิมหลังโหลดครบ
// ============================================================
const UIKit = {
  // ---------- 1) ไอคอนปุ่มเมนู ----------
  menuIcons() {
    const m = document.getElementById('menubar'); if (!m) return;
    for (const b of m.querySelectorAll('button[data-win], button[data-ic]')) {
      const k = MENU_ICONS[b.dataset.win || b.dataset.ic]; if (!k || b.dataset.ivi === k) continue;
      const old = b.querySelector('svg'); const tmp = document.createElement('i'); tmp.innerHTML = ivIcon(k);
      if (old) old.replaceWith(tmp.firstChild); else b.prepend(tmp.firstChild);
      b.dataset.ivi = k;
      const sp = b.querySelector('span'); // ป้ายสั้นภาษาอังกฤษให้เท่ากันทั้งกริด
      if (sp && b.dataset.win === 'w-trade') sp.textContent = 'Trade';
    }
  },

  // ---------- 2) การ์ดเควสต์: แท็บ Quest / Daily ----------
  qtTab() { try { return localStorage.getItem('nm_qt') === 'daily' ? 'daily' : 'quest'; } catch (e) { return 'quest'; } },
  setQtTab(t) { try { localStorage.setItem('nm_qt', t); } catch (e) { /* ไม่เป็นไร */ } this.paintQt(true); Sound.play('click'); },
  paintQt(force) {
    const el = document.getElementById('quest-track'); if (!el || el.hidden || !G.player) return;
    const tab = this.qtTab(), D = typeof Daily !== 'undefined' ? Daily : null, s = D ? D.state() : null;
    const dkey = s ? `${s.day}|${s.tasks.map(t => t.got).join(',')}|${s.claimed}` : `off|${G.player.baseLv}`;
    const key = `${tab}|${dkey}|${el.dataset.key || ''}|${el.dataset.ch || ''}|${LANG}`;
    if (!force && el.dataset.qtk === key && el.querySelector(':scope > .qt-tabs')) return;
    el.dataset.qtk = key;
    el.classList.add('qt-tabbed');
    el.classList.toggle('qt-daily', tab === 'daily');
    // แถบแท็บ (บนสุดของการ์ด)
    let bar = el.querySelector(':scope > .qt-tabs');
    if (!bar) { bar = h('div', { class: 'qt-tabs', role: 'tablist' }); el.prepend(bar); }
    const left = s && !s.claimed ? D.left(s) : 0, ready = s && D.canClaim(s);
    bar.innerHTML = '';
    const tb = (k, ic, label, badge) => h('button', { type: 'button', role: 'tab', class: 'qt-tab' + (tab === k ? ' on' : ''), 'aria-selected': tab === k ? 'true' : 'false',
      onclick: e => { e.stopPropagation(); if (this.qtTab() !== k) this.setQtTab(k); } }, ivIconEl(ic), label, badge ? h('i', { class: 'qt-badge' + (ready ? ' ready' : '') }, badge) : null);
    bar.append(tb('quest', 'quest', 'Quest'), tb('daily', 'daily', 'Daily', s ? (ready ? '!' : left ? String(left) : '') : ''));
    // ป้ายบท (เดิมอยู่ใน ::before) → อยู่ในแท็บ Quest
    let ch = el.querySelector(':scope > .qt-ch');
    if (!ch) { ch = h('div', { class: 'qt-ch' }); bar.after(ch); }
    ch.textContent = Quest.current() ? (el.dataset.ch || '') : L('จบเนื้อเรื่องที่มีตอนนี้แล้ว', 'Story complete — more soon');
    // แท็บ Daily: ภารกิจ 3 อย่าง + แถบความคืบหน้า
    let dl = el.querySelector(':scope > .qt-dl');
    if (!dl) { dl = h('div', { class: 'qt-dl' }); el.append(dl); }
    dl.innerHTML = '';
    if (!s) dl.append(h('div', { class: 'qt-dl-lock' }, L(`ภารกิจประจำวันเปิดที่ Base Lv ${DAILY_MIN_LV}`, `Daily ops unlock at Base Lv ${DAILY_MIN_LV}`)));
    else {
      for (const t of s.tasks) {
        const ok = D.done(t);
        dl.append(h('div', { class: 'qt-dl-row' + (ok ? ' done' : '') }, h('span', { class: 'qt-dl-ic' }, ok ? '✓' : (D.KINDS[t.t] || {}).ic || '•'),
          h('span', { class: 'qt-dl-t' }, D.title(t)), h('span', { class: 'qt-dl-bar' }, h('i', { style: `width:${Math.round(Math.min(t.got, t.n) / t.n * 100)}%` }))));
      }
      dl.append(h('div', { class: 'qt-dl-foot' + (ready ? ' ready' : '') }, s.claimed ? L('✓ รับหีบวันนี้แล้ว', "✓ Today's cache claimed") : ready ? L('🎁 เปิดหีบได้แล้ว — แตะการ์ด', '🎁 Cache ready — tap the card') : L(`เหลือ ${left} อย่าง • แตะเพื่อดูรายละเอียด`, `${left} to go • tap for details`)));
    }
  },
  installQuestCard() {
    const el = document.getElementById('quest-track'); if (!el) return;
    el.onclick = () => { if (this.qtTab() === 'daily' && typeof Daily !== 'undefined') Daily.openTab(); else Quest.go(); };
    const rt = Quest.renderTracker;
    Quest.renderTracker = function (...a) { const r = rt.apply(this, a); try { UIKit.paintQt(); } catch (e) { console.error(e); } return r; };
    setInterval(() => { if (G.started) { try { this.paintQt(); } catch (e) { /* ไม่เป็นไร */ } } }, 1000);
  },

  // ---------- 3) สมุดเปิดบนคอม: แชท/การ์ดเควสต์จางลง ----------
  BOOKS: ['w-inv', 'w-equip', 'w-shop', 'w-storage', 'w-forge'],
  syncBook() {
    const open = this.BOOKS.some(id => { const w = document.getElementById(id); return w && !w.classList.contains('hidden'); });
    document.body.classList.toggle('book-open', open);
  },
  install() {
    this.installQuestCard();
    this.menuIcons();
    const m = document.getElementById('menubar');
    if (m) new MutationObserver(() => this.menuIcons()).observe(m, { childList: true });
    // ห่อชั้นนอกสุด (หลัง gacha/classbook ห่อแล้ว)
    const o = UI.open, c = UI.close;
    UI.open = function (...a) { const r = o.apply(this, a); UIKit.syncBook(); return r; };
    UI.close = function (...a) { const r = c.apply(this, a); UIKit.syncBook(); return r; };
    setInterval(() => this.syncBook(), 600); // หน้าต่างที่ถูกซ่อนตรง ๆ (classList) ก็ตามทัน
  },
};
// ประกาศของดรอป: ป้ายครีมทองพร้อมรูปไอเทม (UI.announce รับ id เพิ่ม — ข้อความเดิมยังใช้ได้)
{
  const ann0 = UI.announce;
  UI.announce = function (text, id) {
    const el = document.getElementById('announce');
    if (!el || !id || !ITEMS[id]) { if (el) { el.classList.remove('loot'); el.style.removeProperty('--rc'); } return ann0.call(this, text); }
    const r = this.rarOf(id);
    el.innerHTML = '';
    el.className = 'loot r-' + r;
    el.append(this.plate(id), h('span', { class: 'an-t' }, h('small', {}, `★ ${this.itemRarity(id)} drop`), h('b', {}, ITEMS[id].name), h('em', {}, L('เก็บเข้ากระเป๋าแล้ว', 'Added to your bag'))));
    void el.offsetWidth; el.classList.add('show');
  };
}
window.addEventListener('load', () => setTimeout(() => UIKit.install(), 0));
