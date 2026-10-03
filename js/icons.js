'use strict';
// ============================================================
//  ไอคอนเส้นทอง (วาดด้วยโค้ดทั้งหมด — SVG 24×24 เส้น 1.7 ปลายมน) ที่เดียวทั้งเกม
//  • ปุ่มเมนูกริด (js/ui.js buildMenu + js/uikit.js สำหรับปุ่มที่ไฟล์อื่นเพิ่มเข้ามา)
//  • ไอคอนหน้าป้ายชื่อหน้าต่าง (สร้าง CSS mask ให้ทุกหน้าต่างตาม id — ไม่ต้องแก้ HTML ของหัวหน้าต่าง)
//  • ไอคอนช่องอุปกรณ์ / ปุ่มในสมุดร้านค้า คลัง เตาตีเหล็ก
// ============================================================
const ICONS = {
  status: '<circle cx="12" cy="7.6" r="3.6"/><path d="M4.8 20.5c.7-4.4 3.6-7 7.2-7s6.5 2.6 7.2 7"/><path d="M9.6 17.2l2.4 1.6 2.4-1.6"/>',
  bag: '<path d="M8.3 6.6C5.6 8.2 4 11.4 4 14.8c0 3.5 2.7 5.7 8 5.7s8-2.2 8-5.7c0-3.4-1.6-6.6-4.3-8.2"/><path d="M8.3 6.6h7.4"/><path d="M9 3.5l3 3.1 3-3.1"/><path d="M9.2 13h5.6"/><path d="M12 13v3"/>',
  equip: '<path d="M12 3l7.5 2.8v5.6c0 4.8-3.2 8.3-7.5 9.9-4.3-1.6-7.5-5.1-7.5-9.9V5.8z"/><path d="M12 7.4v9.2M8.1 11h7.8"/>',
  skill: '<path d="M12 2.8l2.2 5.6 5.9.4-4.6 3.7 1.5 5.8L12 15.1l-5 3.2 1.5-5.8-4.6-3.7 5.9-.4z"/><path d="M12 9.2v2.6"/>',
  tree: '<circle cx="12" cy="12" r="2.6"/><circle cx="12" cy="4" r="1.7"/><circle cx="19.2" cy="16.2" r="1.7"/><circle cx="4.8" cy="16.2" r="1.7"/><path d="M12 9.4V5.7M14.3 13.3l3.4 2M9.7 13.3l-3.4 2"/>',
  map: '<path d="M3.5 6.3l5.5-2 6 2 5.5-2v13.4l-5.5 2-6-2-5.5 2z"/><path d="M9 4.3v13.4M15 6.3v13.4"/>',
  quest: '<path d="M6.5 3.5h8.2l3.8 3.8v13.2H6.5z"/><path d="M14.5 3.5v4h4"/><path d="M9.3 11h6.4M9.3 14.2h6.4M9.3 17.4h3.8"/>',
  party: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.6 3-5.6 6-5.6s5.4 2 6 5.6"/><circle cx="17" cy="9" r="2.6"/><path d="M15.6 14.6c2.6-.4 4.8 1.3 5.4 4.4"/>',
  emote: '<circle cx="12" cy="12" r="8.6"/><path d="M8.5 14.3a4 4 0 0 0 7 0"/><circle cx="9.2" cy="10" r=".9"/><circle cx="14.8" cy="10" r=".9"/>',
  nav: '<circle cx="12" cy="12" r="8.6"/><path d="M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1z"/><path d="M12 3.4v1.8M12 18.8v1.8M3.4 12h1.8M18.8 12h1.8"/>',
  bot: '<rect x="5" y="8" width="14" height="11" rx="2.4"/><path d="M12 4.2V8"/><circle cx="12" cy="3.6" r="1"/><circle cx="9.5" cy="12.8" r="1.3"/><circle cx="14.5" cy="12.8" r="1.3"/><path d="M9.6 16.2h4.8M2.5 12v3.2M21.5 12v3.2"/>',
  options: '<circle cx="12" cy="12" r="3.1"/><path d="M12 2.6l1.7 2.5 2.9-.7.7 2.9 2.5 1.7-1.3 2.9 1.3 3-2.5 1.6-.7 2.9-2.9-.7L12 21.4l-1.7-2.5-2.9.7-.7-2.9-2.5-1.6 1.3-3-1.3-2.9 2.5-1.7.7-2.9 2.9.7z"/>',
  help: '<circle cx="12" cy="12" r="8.6"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"/><circle cx="12" cy="16.9" r=".7"/>',
  sit: '<circle cx="10" cy="4.8" r="2.4"/><path d="M10 7.8v7.4h6l2.5 5"/><path d="M10 10.6h5"/><path d="M6.5 11.5c0 4.2 1.2 7 1.2 9"/>',
  trade: '<path d="M4 8.2h14.5"/><path d="M15 4.5l3.5 3.7L15 11.9"/><path d="M20 15.8H5.5"/><path d="M9 12.1l-3.5 3.7L9 19.5"/>',
  classbook: '<path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h12.5v15H7a2.5 2.5 0 0 0-2.5 2.5z"/><path d="M4.5 20.5A2.5 2.5 0 0 0 7 23"/><path d="M4.5 5.5v15"/><path d="M9.5 7.5h6.5M9.5 11h4.5"/>',
  gacha: '<circle cx="12" cy="12.6" r="8.3"/><circle cx="12" cy="12.6" r="2.4"/><path d="M12 4.3v5.9M12 15v5.9M3.7 12.6h5.9M14.4 12.6h5.9M6.2 6.8l4.1 4.1M13.7 14.3l4.1 4.1M17.8 6.8l-4.1 4.1M10.3 14.3l-4.1 4.1"/><path d="M10.4 1.8h3.2L12 4.3z"/>',
  shop: '<path d="M4 9.2l1.6-5h12.8L20 9.2"/><path d="M4 9.2c0 1.5 1.2 2.6 2.7 2.6s2.6-1.1 2.6-2.6c0 1.5 1.2 2.6 2.7 2.6s2.7-1.1 2.7-2.6c0 1.5 1.1 2.6 2.6 2.6S20 10.7 20 9.2"/><path d="M5.6 11.6V20h12.8v-8.4"/><path d="M10 20v-4.6h4V20"/>',
  storage: '<path d="M3.8 9.6c0-3 2-5.1 5-5.1h6.4c3 0 5 2.1 5 5.1"/><rect x="3.8" y="9.6" width="16.4" height="10.4" rx="1.6"/><path d="M3.8 13.4h16.4"/><rect x="10.4" y="11.6" width="3.2" height="3.8" rx=".8"/>',
  forge: '<path d="M3 8.6h13.4l4.6-2v2.6c0 2-1.6 3-3.8 3H15a1.7 1.7 0 0 0-1.7 1.7v1.3h2.6v3.6H7.1v-3.6h2.6v-1.3A1.7 1.7 0 0 0 8 12.2C5 12.1 3 10.7 3 8.6z"/><path d="M7.4 3.2l2.2 2.2M12.3 2.6v3M15.8 3.4l-1.6 2"/>',
  hammer: '<path d="M13.2 3.8l7 7-2.3 2.3-7-7z"/><path d="M12.6 8.3L4.3 16.6a1.6 1.6 0 0 0 2.3 2.3l8.3-8.3"/>',
  world: '<circle cx="12" cy="12" r="8.6"/><path d="M3.4 12h17.2M12 3.4c2.4 2.3 3.6 5.2 3.6 8.6s-1.2 6.3-3.6 8.6c-2.4-2.3-3.6-5.2-3.6-8.6S9.6 5.7 12 3.4z"/>',
  mob: '<path d="M5.4 3.8l2.3 4.4M18.6 3.8l-2.3 4.4"/><path d="M12 7.4c4 0 6.6 2.8 6.6 6.6S15.7 20.6 12 20.6 5.4 17.8 5.4 14 8 7.4 12 7.4z"/><circle cx="9.6" cy="13.4" r="1"/><circle cx="14.4" cy="13.4" r="1"/><path d="M10 17.1h4"/>',
  dialog: '<path d="M4 5h16v10.4H10.2L5.6 19v-3.6H4z"/><path d="M8 9h8M8 12h5.2"/>',
  confirm: '<circle cx="12" cy="12" r="8.6"/><path d="M8 12.3l2.7 2.7 5.4-5.5"/>',
  emote2: '<circle cx="12" cy="12" r="8.6"/>',
  chips: '<rect x="6.5" y="6.5" width="11" height="11" rx="1.6"/><rect x="9.6" y="9.6" width="4.8" height="4.8" rx=".7"/><path d="M9.5 3.5v3M14.5 3.5v3M9.5 17.5v3M14.5 17.5v3M3.5 9.5h3M3.5 14.5h3M17.5 9.5h3M17.5 14.5h3"/>',
  deposit: '<path d="M12 3.5v9.2M8.4 9.1l3.6 3.6 3.6-3.6"/><path d="M4 13.6v5a1.6 1.6 0 0 0 1.6 1.6h12.8a1.6 1.6 0 0 0 1.6-1.6v-5"/>',
  withdraw: '<path d="M12 13V3.8M8.4 7.4L12 3.8l3.6 3.6"/><path d="M4 13.6v5a1.6 1.6 0 0 0 1.6 1.6h12.8a1.6 1.6 0 0 0 1.6-1.6v-5"/>',
  daily: '<circle cx="12" cy="12" r="3.9"/><path d="M12 2.6v2.6M12 18.8v2.6M2.6 12h2.6M18.8 12h2.6M5.4 5.4l1.8 1.8M16.8 16.8l1.8 1.8M5.4 18.6l1.8-1.8M16.8 7.2l1.8-1.8"/>',
  story: '<path d="M12 6.2c-1.8-1.5-4.4-2.2-8-2v13.5c3.6-.2 6.2.5 8 2 1.8-1.5 4.4-2.2 8-2V4.2c-3.6-.2-6.2.5-8 2z"/><path d="M12 6.2v13.5"/>',
  leaf: '<path d="M5 20c-.6-6.4 3.6-13.4 15-16-1 9.6-6.2 15.4-15 16z"/><path d="M5 20c3.2-4.6 6.6-8.4 11-12"/>',
  sword: '<path d="M19.6 4.4l-.6 4.2-9.3 9.3-3.6-3.6 9.3-9.3z"/><path d="M4.9 12.9l6.2 6.2"/><path d="M4.4 19.6l2.4-2.4"/>',
  sparkle: '<path d="M12 3.5l1.9 6.6 6.6 1.9-6.6 1.9L12 20.5l-1.9-6.6L3.5 12l6.6-1.9z"/>',
  crown: '<path d="M4 17.5l-1-10 5 4 4-6.5 4 6.5 5-4-1 10z"/><path d="M4.5 20.5h15"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  // ช่องอุปกรณ์
  slot_head: '<path d="M5 16V12a7 7 0 0 1 14 0v4"/><path d="M5 16h5.2v3.5H5zM19 16h-5.2v3.5H19z"/><path d="M12 5v7.5"/>',
  slot_weapon: '<path d="M19.6 4.4l-.6 4.2-9.3 9.3-3.6-3.6 9.3-9.3z"/><path d="M4.9 12.9l6.2 6.2"/><path d="M4.4 19.6l2.4-2.4"/>',
  slot_garment: '<path d="M8 4h8l1 3.5c1.6 4.3 2.5 8.4 2.5 12.5h-15c0-4.1.9-8.2 2.5-12.5z"/><path d="M8 4c.8 1.6 2.2 2.5 4 2.5S15.2 5.6 16 4"/><path d="M12 9.5v10.5"/>',
  slot_acc: '<circle cx="12" cy="14.6" r="5.9"/><path d="M9.6 6.4L12 3.4l2.4 3L12 8.7z"/>',
  slot_acc2: '<circle cx="12" cy="14.6" r="5.9"/><path d="M9.6 6.4L12 3.4l2.4 3L12 8.7z"/>',
  slot_armor: '<path d="M8 4l4 2 4-2 4.2 3-2.2 4v9H6v-9L3.8 7z"/><path d="M12 6v14M8.5 12.5h7"/>',
  slot_shield: '<path d="M12 3.5l7 2.5v5.5c0 4.7-3 8-7 9.5-4-1.5-7-4.8-7-9.5V6z"/><circle cx="12" cy="11.5" r="2.4"/>',
  slot_shoes: '<path d="M8 3.5h6V12l5.4 3a2.8 2.8 0 0 1 1.6 2.5V19H4v-6.5c1.6 0 4-1 4-3z"/><path d="M4 16.5h17"/>',
};
// หน้าต่าง → ไอคอนหน้าป้ายชื่อ
const WIN_ICONS = {
  'w-status': 'status', 'w-inv': 'bag', 'w-equip': 'equip', 'w-skills': 'skill', 'w-mob': 'mob', 'w-storage': 'storage', 'w-emote': 'emote',
  'w-quest': 'quest', 'w-nav': 'nav', 'w-party': 'party', 'w-options': 'options', 'w-shop': 'shop', 'w-map': 'map', 'w-world': 'world',
  'w-tree': 'tree', 'w-bot': 'bot', 'w-trade': 'trade', 'w-dialog': 'dialog', 'w-confirm': 'confirm', 'w-help': 'help', 'w-gacha': 'gacha',
  'w-classbook': 'classbook', 'w-forge': 'forge',
};
// ปุ่มเมนู (data-win / data-ic) → ไอคอน
const MENU_ICONS = {
  'w-status': 'status', 'w-inv': 'bag', 'w-equip': 'equip', 'w-skills': 'skill', 'w-tree': 'tree', 'w-map': 'map', 'w-quest': 'quest', 'w-party': 'party',
  'w-emote': 'emote', 'w-nav': 'nav', 'w-bot': 'bot', 'w-options': 'options', 'w-help': 'help', 'w-trade': 'trade', 'w-classbook': 'classbook', 'w-gacha': 'gacha', sit: 'sit',
};
const ivIcon = (k, cls) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${cls ? ` class="${cls}"` : ''}>${ICONS[k] || ICONS.sparkle}</svg>`;
// ไอคอนเป็น element (ใส่ในปุ่ม)
const ivIconEl = (k, cls) => { const i = document.createElement('i'); i.className = 'ivi' + (cls ? ' ' + cls : ''); i.setAttribute('aria-hidden', 'true'); i.innerHTML = ivIcon(k); return i; };
// CSS ไอคอนหน้าป้ายชื่อหน้าต่าง (mask = ใช้สีพื้นหลังของป้ายเป็นสีเส้น → ป้ายไม้ = ทอง, ป้ายครีม = น้ำตาลทอง)
(() => {
  const url = k => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='#000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>${ICONS[k]}</svg>`)}")`;
  const css = Object.entries(WIN_ICONS).map(([id, k]) => `body.visor #${id}:not(.gc-art) .win-title span::before{-webkit-mask:${url(k)} center/contain no-repeat;mask:${url(k)} center/contain no-repeat}`).join('\n');
  const st = document.createElement('style'); st.id = 'icons-css'; st.textContent = css; document.head.append(st);
})();
