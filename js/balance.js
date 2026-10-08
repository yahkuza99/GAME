'use strict';
// ============================================================
//  ปรับสมดุลรวม (โหลดหลังไฟล์เนื้อหาทั้งหมด ก่อน World Boss)
//  • มอนสเตอร์เลเวล 30 ขึ้นไปทุกตัว (รวม MVP) เลือด +30% — World Boss คำนวณจากเลือดที่ปรับแล้ว
// ============================================================
for (const id in MOBS) {
  const m = MOBS[id];
  if (m.lv >= 30 && !m.dummy && !m.hpBoosted) { m.hp = Math.round(m.hp * 1.3); m.hpBoosted = true; }
}
// ตัวคูณกลางหลัง Passive แบบ D (2026-10-08): D ทำให้ฆ่ามอนช้าลงและโดนตีต่อตัวมากขึ้น → คืนจังหวะเล่นให้ใกล้ก่อน D
//   วัดด้วย CURVE=1 ONLY=duel tests/balance_sim.js เทียบ commit ก่อน D (048f888): เวลาฆ่ารวม ×1.26 • ดาเมจที่โดนต่อนาที ×1.16
//   ใช้กับมอน Lv 30+ ครั้งเดียว (ธง mulTuned) ก่อน World Boss → Ancient สร้างจาก MVP ที่คูณแล้ว ไม่คูณซ้ำ
//   EXP/ดรอปต่อตัวไม่เปลี่ยน • ลูกสมุนบอส (js/bosskit.js) และมอนที่สร้างทีหลังไฟล์นี้ไม่โดน
const MOB_HP_MUL = 0.8, MOB_ATK_MUL = 0.86;
for (const id in MOBS) {
  const m = MOBS[id];
  if (m.lv < 30 || m.dummy || m.mulTuned) continue;
  m.hp = Math.round(m.hp * MOB_HP_MUL);
  if (Array.isArray(m.atk)) m.atk = m.atk.map(v => Math.max(1, Math.round(v * MOB_ATK_MUL)));
  m.mulTuned = true;
}

// ------------------------------------------------------------
//  ของดรอปแบบ RO: ของสวมใส่ต้อง "หายาก" — แจกเยอะเกินทำให้ของไม่มีค่า
//  ลดเฉพาะอุปกรณ์ (ของขยะไว้ขาย ยา แร่ตีบวก คงเดิม) • มอนธรรมดา / MVP / World Boss ใช้ตัวคูณต่างกัน
//  เป้าหมายราว ๆ ต่อชั่วโมงฟาร์ม (~600 ตัว): อุปกรณ์เขียว ~3 ชิ้น • น้ำเงิน ~1 ชิ้นทุก 2–3 ชม. • MVP: ม่วง ~1 ชิ้นต่อ 10 ตัว
// ------------------------------------------------------------
(() => {
  const isGear = id => ITEMS[id] && (ITEMS[id].type === 'weapon' || ITEMS[id].type === 'armor');
  const rar = id => (ITEMS[id] && ITEMS[id].rarity) || 'common';
  const MUL = {
    mob: { common: 0.25, uncommon: 0.1, rare: 0.2, epic: 0.2, legend: 0.5 },
    mvp: { common: 0.4, uncommon: 0.35, rare: 0.3, epic: 0.18, legend: 0.5 },
    wb: { common: 0.6, uncommon: 0.5, rare: 0.5, epic: 0.25, legend: 0.35 },
  };
  for (const id in MOBS) {
    const m = MOBS[id]; if (!m.drops || m.dummy || m.dropsTuned) continue;
    const t = m.worldBoss || /^wb_/.test(id) ? MUL.wb : m.boss ? MUL.mvp : MUL.mob;
    m.drops = m.drops.map(([it, ch]) => [it, isGear(it) ? Math.max(0.0001, +(ch * t[rar(it)]).toFixed(5)) : ch]);
    m.dropsTuned = true;
  }
})();
// World Boss: ถูกสร้าง/เติมของหลังไฟล์นี้ (worldboss.js + loot.js ตอน DOMContentLoaded) → ปรับตามทีหลัง
// ทุกคนที่ร่วมตีได้ทอยของของตัวเอง จึงต้องไม่ใจดีเกิน: ม่วง ~1 ชิ้นต่อ 3 ครั้ง • ทอง 1%
document.addEventListener('DOMContentLoaded', () => {
  const MUL = { uncommon: 0.5, rare: 0.6, epic: 0.35 };
  for (const id in MOBS) {
    const m = MOBS[id]; if (!/^wb_/.test(id) || m.wbTuned) continue;
    m.wbTuned = true;
    m.drops = m.drops.map(([it, ch]) => {
      const I = ITEMS[it]; if (!I || (I.type !== 'weapon' && I.type !== 'armor')) return [it, ch];
      const r = I.rarity || 'common';
      return [it, r === 'legend' ? Math.min(ch, 0.01) : +(ch * (MUL[r] || 1)).toFixed(5)];
    });
  }
});
