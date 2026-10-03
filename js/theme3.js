'use strict';
// ============================================================
//  UI เฟส 3 "game vibe" — ส่วน JS ของ css/theme3.css (วาดด้วยโค้ดทั้งหมด ไม่มีไฟล์ภาพ)
//  1) อบพื้นผิวครั้งเดียวตอนโหลด: SVG feTurbulence → canvas → PNG (blob: URL) (กระดาษ / ลายไม้ / หนัง) → ตัวแปร CSS
//  2) ลายเวกเตอร์สร้างจากโค้ด: วงอักษรรูน (Elder Futhark) / หน้าปัดเข็มทิศ / ลายถักนอร์ส / มุมโลหะฝังอัญมณี → ตัวแปร CSS
//  3) คุณภาพกราฟิก 'ประหยัด' (R.quality === 'low') → body.fx-low ปิดแอนิเมชันตกแต่งทั้งหมด
//  ไม่มีงานต่อเฟรม • ไม่แตะตรรกะเกม
// ============================================================
const Theme3 = (() => {
  const root = document.documentElement;
  // ใช้ blob: URL (สั้น) แทน data-URI ยาว ๆ — ตัวแปร CSS ที่ถูกแทนค่าใน background ต้อง parse ใหม่ทุกครั้งที่คำนวณสไตล์
  // data-URI ขนาดหลายสิบ KB ทำให้ style recalc ของ HUD ช้าลง ~10 เท่า (วัดแล้ว) → blob: URL ยาว ~60 ตัวอักษร
  const blobUrl = (data, type) => { try { return `url("${URL.createObjectURL(new Blob([data], { type }))}")`; } catch (e) { return `url("data:${type},${encodeURIComponent(data)}")`; } };
  const svgUrl = s => blobUrl(s, 'image/svg+xml');
  const set = (k, v) => root.style.setProperty(k, v);

  // ---------- 1) พื้นผิวอบ (ทำครั้งเดียว ไทล์เล็ก) ----------
  const TEX = {
    // กระดาษ: เส้นใยละเอียด + รอยด่างจาง ๆ
    '--tx-grain': [256, 256, `
      <filter id='f' x='0' y='0' width='100%' height='100%'>
        <feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' seed='4' stitchTiles='stitch' result='a'/>
        <feColorMatrix in='a' values='0 0 0 0 0.42  0 0 0 0 0.27  0 0 0 0 0.10  0.6 0 0 0 -0.24' result='fine'/>
        <feTurbulence type='fractalNoise' baseFrequency='0.018' numOctaves='2' seed='9' stitchTiles='stitch' result='b'/>
        <feColorMatrix in='b' values='0 0 0 0 0.55  0 0 0 0 0.36  0 0 0 0 0.12  0.42 0 0 0 -0.17' result='mot'/>
        <feMerge><feMergeNode in='mot'/><feMergeNode in='fine'/></feMerge>
      </filter><rect width='100%' height='100%' filter='url(#f)'/>`],
    // ลายไม้: เส้นยาวแนวนอน (ความถี่ x ต่ำ y สูง) สีเข้ม + เส้นสว่างบาง
    '--tx-wood': [256, 128, `
      <filter id='f' x='0' y='0' width='100%' height='100%'>
        <feTurbulence type='fractalNoise' baseFrequency='0.0039 0.36' numOctaves='3' seed='3' stitchTiles='stitch' result='a'/>
        <feColorMatrix in='a' values='0 0 0 0 0.06  0 0 0 0 0.03  0 0 0 0 0.0  1.25 0 0 0 -0.5' result='dark'/>
        <feColorMatrix in='a' values='0 0 0 0 1  0 0 0 0 0.84  0 0 0 0 0.6  0 -0.55 0 0 0.24' result='lite'/>
        <feMerge><feMergeNode in='dark'/><feMergeNode in='lite'/></feMerge>
      </filter><rect width='100%' height='100%' filter='url(#f)'/>`],
    // หนัง (ปกสมุด): เม็ดละเอียดนูน
    '--tx-leather': [192, 192, `
      <filter id='f' x='0' y='0' width='100%' height='100%'>
        <feTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='2' seed='11' stitchTiles='stitch' result='a'/>
        <feColorMatrix in='a' values='0 0 0 0 0.04  0 0 0 0 0.015  0 0 0 0 0.0  0.9 0 0 0 -0.32' result='d'/>
        <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='1' seed='5' stitchTiles='stitch' result='b'/>
        <feColorMatrix in='b' values='0 0 0 0 1  0 0 0 0 0.85  0 0 0 0 0.62  0.5 0 0 0 -0.26' result='l'/>
        <feMerge><feMergeNode in='l'/><feMergeNode in='d'/></feMerge>
      </filter><rect width='100%' height='100%' filter='url(#f)'/>`],
  };
  function bake() {
    for (const [k, [w, h, body]] of Object.entries(TEX)) {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>${body.replace(/\s+/g, ' ')}</svg>`;
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0);
          c.toBlob(b => set(k, b ? `url("${URL.createObjectURL(b)}")` : svgUrl(svg)), 'image/png');
        } catch (e) { set(k, svgUrl(svg)); } // canvas ใช้ไม่ได้ → ใช้ SVG ตรง ๆ (เบราว์เซอร์แคชภาพไทล์เอง)
      };
      img.src = 'data:image/svg+xml,' + encodeURIComponent(svg);
    }
  }

  // ---------- 2) ลายเวกเตอร์ ----------
  // อักษรรูน Elder Futhark (เส้นในกรอบ 6×10)
  const RUNES = ['M1 0V10M1 2L5 0M1 5L5 3', 'M1 10V0L5 3V10', 'M1 0V10M1 3L4 5L1 7', 'M1 0V10M1 0L5 3M1 3L5 6', 'M1 10V0L4 2.5L1 5L5 10', 'M5 0L1 5L5 10',
    'M0 0L6 10M6 0L0 10', 'M1 10V0L5 2.5L1 5', 'M1 0V10M5 0V10M1 3L5 7', 'M3 0V10M1 3L5 7', 'M3 0V10', 'M3 10V0M3 5L0 1M3 5L6 1', 'M5 0L1 4L5 6L1 10',
    'M3 10V0M0 3L3 0L6 3', 'M1 0V10M1 0L5 2.5L1 5L5 7.5L1 10', 'M1 10V0L3 3L5 0V10', 'M1 10V0L5 5M5 10V0L1 5', 'M1 10V0L5 3', 'M3 0L6 5L3 10L0 5Z', 'M0 0V10L6 0V10Z', 'M3 0L6 4L0 10M3 0L0 4L6 10'];
  // วงอักษรรูน: แถบโลหะสองเส้น + รูนเรียงรอบวง (ใช้รอบรูปตัวละคร / ปุ่ม AUTO / ปุ่มโจมตี / รูป NPC)
  function runeRing(col, n, band) {
    const C = 50, r1 = 49, r2 = 49 - band, rm = (r1 + r2) / 2, sc = (band - 3) / 10;
    let g = '';
    for (let i = 0; i < n; i++) {
      const a = i * 360 / n, p = RUNES[(i * 7) % RUNES.length];
      g += `<path transform='rotate(${a} ${C} ${C}) translate(${C - 3 * sc} ${C - rm - 5 * sc}) scale(${sc})' d='${p}'/>`;
    }
    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><g fill='none' stroke='${col}' stroke-linecap='round' stroke-linejoin='round'>
      <circle cx='50' cy='50' r='${r1 - 0.6}' stroke-width='1.1'/><circle cx='50' cy='50' r='${r2 + 0.6}' stroke-width='0.9'/>
      <g stroke-width='${(1.25 / sc).toFixed(2)}'>${g}</g></g></svg>`;
  }
  // หน้าปัดเข็มทิศรอบมินิแมพ: ขีดทุก 10° • ขีดยาวทุก 45° • N/E/S/W • หัวลูกศรทิศเหนือทองแดง
  function compass() {
    let t = '';
    for (let a = 0; a < 360; a += 10) {
      const long = a % 90 === 0 ? 0 : a % 45 === 0 ? 1 : 2, len = [0, 5, 3][long], w = [0, 1.3, 0.8][long];
      if (!len) continue;
      t += `<line x1='100' y1='4.5' x2='100' y2='${4.5 + len}' stroke-width='${w}' transform='rotate(${a} 100 100)'/>`;
    }
    const L = { // ตัวอักษรเส้น (กรอบ 8×10)
      N: 'M0 10V0L8 10V0', E: 'M7 0H0V10H7M0 5H5.5', S: 'M7.5 1.2C6 -0.4 0.6 -0.2 0.6 2.6S7.6 4.6 7.6 7.4S1.6 10.6 0.2 8.8', W: 'M0 0L2 10L4 3L6 10L8 0' };
    const at = (k, a) => { const r = a * Math.PI / 180, x = 100 + Math.sin(r) * 91.5, y = 100 - Math.cos(r) * 91.5; return `<path d='${L[k]}' transform='translate(${(x - 3.4).toFixed(1)} ${(y - 4.25).toFixed(1)}) scale(.85)' stroke-width='1.7'/>`; };
    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>
      <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#fff0bf'/><stop offset='.45' stop-color='#d9a441'/><stop offset='.55' stop-color='#9a6420'/><stop offset='1' stop-color='#f0c86a'/></linearGradient>
      <radialGradient id='v' cx='.5' cy='.5' r='.5'><stop offset='.80' stop-color='#000' stop-opacity='0'/><stop offset='1' stop-color='#000' stop-opacity='.55'/></radialGradient></defs>
      <circle cx='100' cy='100' r='100' fill='url(#v)'/>
      <circle cx='100' cy='100' r='93' fill='none' stroke='#1b0f05' stroke-opacity='.55' stroke-width='14'/>
      <g fill='none' stroke='#f3d58c' stroke-opacity='.9' stroke-linecap='round'>${t}
        ${at('E', 90)}${at('S', 180)}${at('W', 270)}</g>
      <circle cx='100' cy='100' r='98.6' fill='none' stroke='url(#g)' stroke-width='2.8'/>
      <circle cx='100' cy='100' r='86.6' fill='none' stroke='#f3d58c' stroke-opacity='.55' stroke-width='1'/>
      <circle cx='100' cy='8.5' r='8.2' fill='#2a1607' stroke='url(#g)' stroke-width='1.6'/>
      <path d='${L.N}' transform='translate(96.6 4.3) scale(.85)' fill='none' stroke='#ffdf8a' stroke-width='1.9' stroke-linejoin='round' stroke-linecap='round'/></svg>`;
  }
  // ลายถักนอร์ส (เส้นคู่ไขว้ ขึ้น-ลงสลับ) ไทล์ 24×10 สำหรับแถบตกแต่ง
  function knot(col, gap, op) {
    const A = 'M0 2.2C6 2.2 6 7.8 12 7.8S18 2.2 24 2.2', B = 'M0 7.8C6 7.8 6 2.2 12 2.2S18 7.8 24 7.8';
    const x1 = 'M3.6 3.3L8.4 6.7', x2 = 'M15.6 6.7L20.4 3.3'; // ช่วงข้ามบนจุดตัด (A บนที่ x=6, B บนที่ x=18)
    return `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='10' viewBox='0 0 24 10'><g fill='none' stroke-linecap='round' opacity='${op}'>
      <path d='${A}' stroke='${col}' stroke-width='1.3'/><path d='${B}' stroke='${col}' stroke-width='1.3'/>
      <path d='${x1}' stroke='${gap}' stroke-width='3.2'/><path d='${x1}' stroke='${col}' stroke-width='1.3'/>
      <path d='${x2}' stroke='${gap}' stroke-width='3.2'/><path d='${x2}' stroke='${col}' stroke-width='1.3'/></g></svg>`;
  }
  // มุมโลหะทองเหลือง + อัญมณีฟ้า (มุมซ้ายบน แล้วกลับด้านเป็นอีก 3 มุม)
  function corner(fx, fy) {
    const tf = `translate(${fx < 0 ? 40 : 0} ${fy < 0 ? 40 : 0}) scale(${fx} ${fy})`;
    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><defs>
      <linearGradient id='m' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#fff3c8'/><stop offset='.35' stop-color='#e2ad4c'/><stop offset='.6' stop-color='#8f5c1b'/><stop offset='1' stop-color='#d9a648'/></linearGradient>
      <radialGradient id='j' cx='.38' cy='.32' r='.75'><stop offset='0' stop-color='#eaffff'/><stop offset='.3' stop-color='#7fe8ff'/><stop offset='.75' stop-color='#1a7f9a'/><stop offset='1' stop-color='#0b3b4d'/></radialGradient></defs>
      <g transform='${tf}'>
      <path d='M0 12Q0 0 12 0H36L31 6H13Q6 6 6 13V31L0 36Z' fill='url(#m)' stroke='#3a2006' stroke-width='.8' stroke-linejoin='round'/>
      <path d='M9.5 26V14Q9.5 9.5 14 9.5H26' fill='none' stroke='#e9bf62' stroke-width='1.1' stroke-linecap='round'/>
      <path d='M31 6L27 9.5H26M6 31L9.5 27V26' fill='none' stroke='#3a2006' stroke-width='.8' stroke-opacity='.6'/>
      <circle cx='10' cy='10' r='5.2' fill='url(#m)' stroke='#3a2006' stroke-width='.8'/>
      <circle cx='10' cy='10' r='3.4' fill='url(#j)'/><circle cx='8.9' cy='8.8' r='.9' fill='#fff' fill-opacity='.85'/></g></svg>`;
  }
  function vectors() {
    set('--iv-runering', svgUrl(runeRing('#f3d58c', 16, 11)));
    set('--iv-runering-dark', svgUrl(runeRing('#6b3f0e', 18, 12)));
    set('--iv-runering-cy', svgUrl(runeRing('#9ff0ff', 16, 11)));
    set('--iv-compass', svgUrl(compass()));
    set('--iv-knot', svgUrl(knot('#e3b55c', '#2e1a0b', 0.9)));
    set('--iv-knot-paper', svgUrl(knot('#b98a3e', '#f6ead0', 0.75)));
    set('--iv-c-tl', svgUrl(corner(1, 1))); set('--iv-c-tr', svgUrl(corner(-1, 1)));
    set('--iv-c-bl', svgUrl(corner(1, -1))); set('--iv-c-br', svgUrl(corner(-1, -1)));
  }

  // ---------- 3) คุณภาพกราฟิกต่ำ → ปิดแอนิเมชันตกแต่ง ----------
  function syncQuality() { if (document.body && typeof R !== 'undefined') document.body.classList.toggle('fx-low', R.quality === 'low'); }
  function install() {
    if (typeof R !== 'undefined' && R.setQuality && !R.setQuality._t3) {
      const sq = R.setQuality;
      R.setQuality = function (...a) { const r = sq.apply(this, a); syncQuality(); return r; };
      R.setQuality._t3 = true;
    }
    syncQuality();
  }

  vectors(); bake();
  window.addEventListener('load', () => setTimeout(install, 0));
  return { syncQuality, bake };
})();
