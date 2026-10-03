'use strict';
// ============================================================
//  สองภาษา (ไทย / English)
//  • ข้อความที่ผู้เล่นเห็นในโค้ด: L('ข้อความไทย', 'English text') — คืนตามภาษาที่เลือก (ไม่มีอังกฤษ = ใช้ไทย)
//  • ข้อความใน index.html: ใส่ data-en="..." (แทน innerHTML) / data-en-title / data-en-placeholder / data-en-aria-label
//  • เปลี่ยนภาษา = บันทึกแล้วโหลดหน้าใหม่ (ข้อมูลเกมที่แปลไว้ตอนโหลดไฟล์จะได้ภาษาใหม่ทั้งหมด)
//  ค่าเริ่มต้น: ไทย (เปลี่ยนได้ที่หน้าแรกและหน้าตั้งค่า)
// ============================================================
const LANG = (() => { try { return localStorage.getItem('nm_lang') === 'en' ? 'en' : 'th'; } catch (e) { return 'th'; } })();
// ข้อความที่แปลไว้ตอนโหลดไฟล์ (ข้อมูลไอเทม/สเตตัส ฯลฯ) เก็บคู่ ไทย → อังกฤษ ไว้ด้วย → EN() ดึงฉบับอังกฤษได้แม้เล่นภาษาไทย
// (เก็บเฉพาะช่วงโหลดหน้า ข้อความที่สร้างระหว่างเล่นไม่ถูกเก็บ — หน่วยความจำไม่โต)
const L_EN = new Map();
function L(th, en) {
  if (en != null && en !== '' && typeof th === 'string' && (typeof document === 'undefined' || document.readyState === 'loading')) L_EN.set(th, en);
  return LANG === 'en' && en != null && en !== '' ? en : th;
}
// รายละเอียดไอเทมเป็นภาษาอังกฤษเสมอ (เจ้าของสั่ง 2026-10-03): ชื่อ/ค่าพลัง/คำอธิบาย/ความหายาก/เงื่อนไข
// ข้อความที่ต่อท้ายหลังแปล (เช่น คำอธิบายไอเทม + ค่าพลัง) → แปลส่วนหน้าที่ยาวที่สุดที่รู้จัก แล้วคงส่วนท้ายไว้ (จำผลไว้)
const EN_CACHE = new Map();
function EN(s) {
  if (LANG === 'en' || typeof s !== 'string' || !s) return s;
  const hit = L_EN.get(s); if (hit != null) return hit;
  if (EN_CACHE.has(s)) return EN_CACHE.get(s);
  let best = '';
  for (const k of L_EN.keys()) if (k.length > best.length && s.startsWith(k)) best = k;
  const out = best ? L_EN.get(best) + s.slice(best.length) : s;
  EN_CACHE.set(s, out);
  return out;
}
function setLang(l) {
  if (l === LANG) return;
  try { localStorage.setItem('nm_lang', l); } catch (e) { /* โหมดส่วนตัว */ }
  if (typeof saveGame === 'function' && typeof G !== 'undefined' && G.started) { try { saveGame(true, true); } catch (e) { /* ไม่เป็นไร */ } }
  setTimeout(() => location.reload(), 120);
}
const I18N = {
  applyHtml(root = document) {
    document.documentElement.lang = LANG;
    if (LANG !== 'en') return;
    root.querySelectorAll('[data-en]').forEach(e => { e.innerHTML = e.dataset.en; });
    for (const a of ['title', 'placeholder', 'aria-label']) {
      const k = 'en' + a.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(''); // data-en-aria-label → dataset.enAriaLabel
      root.querySelectorAll(`[data-en-${a}]`).forEach(e => e.setAttribute(a, e.dataset[k]));
    }
  },
  // ปุ่มสลับภาษาบนหน้าแรก (ซ่อนเมื่อเข้าเกมแล้ว — ในเกมเปลี่ยนได้ที่หน้าตั้งค่า)
  pill() {
    const el = document.createElement('div');
    el.id = 'lang-pill';
    el.innerHTML = `<button type="button" data-l="th" class="${LANG === 'th' ? 'on' : ''}">ไทย</button><button type="button" data-l="en" class="${LANG === 'en' ? 'on' : ''}">EN</button>`;
    el.addEventListener('click', e => { const b = e.target.closest('button'); if (b) setLang(b.dataset.l); });
    document.body.append(el);
    setInterval(() => { const hide = typeof G !== 'undefined' && !!G.started; if (el.hidden !== hide) el.hidden = hide; }, 500);
  },
};
document.addEventListener('DOMContentLoaded', () => { I18N.applyHtml(); I18N.pill(); });
