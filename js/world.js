'use strict';
// ============================================================
//  โลกที่เชื่อมกันทางกายภาพ
//  ตำแหน่งจริงของแต่ละแมพบนผืนโลก (หน่วย: ช่อง) คำนวณจาก links + ขนาดแมพ (แต่ละแมพขนาดไม่เท่ากันได้)
//  วางให้ประตูสองฝั่งชนกันพอดี → ออกขอบตะวันออกของแมพหนึ่ง = โผล่ขอบตะวันตกของแมพถัดไป ณ จุดเดียวกันบนโลก
//  ใช้กับ: แผนที่โลก (ui.js renderWorld) และโซนรอยต่อขอบแมพ (maps.js seamTransitions)
// ============================================================
const WORLD = {
  _pos: null,
  layout() {
    if (this._pos) return this._pos;
    const pos = { [HOME_MAP]: { x: 0, y: 0 } }, q = [HOME_MAP];
    while (q.length) {
      const a = q.shift(), A = MAP_DEFS[a];
      for (const [s, b] of Object.entries(A.links || {})) {
        const B = MAP_DEFS[b];
        if (pos[b] || !B || !PORTAL_SIDE[s]) continue;
        const pa = portalPos(A, s), pb = portalPos(B, OPP_SIDE[s]), o = pos[a];
        pos[b] = {
          x: s === 'E' ? o.x + A.w : s === 'W' ? o.x - B.w : o.x + pa.x - pb.x,
          y: s === 'S' ? o.y + A.h : s === 'N' ? o.y - B.h : o.y + pa.y - pb.y,
        };
        q.push(b);
      }
    }
    return (this._pos = pos);
  },
  // กรอบรวมของโลก (ใช้วาดแผนที่โลกตามสัดส่วนจริง)
  bounds() {
    const P = this.layout();
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [id, p] of Object.entries(P)) { const d = MAP_DEFS[id]; x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x + d.w); y1 = Math.max(y1, p.y + d.h); }
    return { x0, y0, w: x1 - x0, h: y1 - y0 };
  },
  // ตรวจว่าไม่มีแมพซ้อนทับกันบนผืนโลก (ทางกายภาพต้องเป็นไปได้) — ใช้ในเทสต์
  overlaps() {
    const P = this.layout(), ids = Object.keys(P), out = [];
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const a = P[ids[i]], b = P[ids[j]], A = MAP_DEFS[ids[i]], B = MAP_DEFS[ids[j]];
      if (a.x < b.x + B.w && b.x < a.x + A.w && a.y < b.y + B.h && b.y < a.y + A.h) out.push(ids[i] + '/' + ids[j]);
    }
    return out;
  },
  // ด้านที่ประตูอยู่ (จากตำแหน่งประตูในแมพ)
  sideOf(m, p) { return p.x <= 1 ? 'W' : p.x >= m.w - 2 ? 'E' : p.y <= 1 ? 'N' : 'S'; },
};
// กันพลาด: แมพที่ไม่มี kind/seed (เช่นคอมเมนต์ // กลางบรรทัดกินค่าไป) จะสร้างผิดแบบเงียบ ๆ → เตือนตั้งแต่โหลด
for (const [id, d] of Object.entries(MAP_DEFS)) if (!d.kind || d.seed == null || !d.w || !d.h) console.warn(`MAP_DEFS.${id}: ขาด kind/seed/w/h`);
