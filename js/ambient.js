'use strict';
// ============================================================
//  ชีวิตในฉาก (Ambient life) — ของประดับที่ขยับได้ทุกแมพ ให้โลกดูมีชีวิต
//   ทุ่ง/ทะเลสาบ: ผีเสื้อ แมลงปอ นกกระจอกจิกพื้น (บินหนีเมื่อเราเข้าใกล้) ฝูงนกบินผ่านมีเงาบนพื้น ใบไม้ร่วงจากต้นไม้
//                 ปลากระโดด + วงน้ำ เป็ดแม่ลูกว่ายน้ำ (Mistlake) ฝุ่น/เศษหญ้าตามรอยเท้า
//   เมือง: ชาวเมืองเดินเล่น นกพิราบ/อีกาบนลาน ควันปล่องไฟ + ประกายไฟเตาหลอม ละอองน้ำพุ ประกายรุ้ง Bifrost กลีบดอกลอยในคลอง
//   ป่าหมาป่า (กลางคืน): ผีเสื้อกลางคืนบินวนเห็ด/ตะเกียง ตานกฮูกกะพริบบนยอดไม้ ค้างคาว ใบไม้ร่วง
//   ถ้ำ: น้ำหยดมีวงกระเพื่อม ค้างคาว ประกายบนคริสตัล ฝุ่นในลำแสง • Archive อักษรรูนลอยกะพริบ • Roots เศษดินร่วง
//        Abyss เถ้าปลิว ถ่านไฟลอย ฟองพิษผุดแตก • ลานประลอง: ควันคบเพลิง ลมหมุนทราย นกบินวนเหนือลาน
//  ภาพล้วน — ไม่ชน ไม่คลิก ไม่แตะเกมเพลย์/เซฟ • เกี่ยว js/render.js 4 จุด (บรรทัดเดียวต่อจุด):
//   ground  = ชั้นพื้น (บีบแกนตั้ง K) — วงน้ำ เงา ฝุ่นรอยเท้า + อัปเดตทุกอย่าง (ครั้งเดียวต่อเฟรม)
//   collect = รายการเรียงความลึก — ชาวเมือง นกบนพื้น เป็ด (บังกับตัวละคร/ต้นไม้ถูกต้อง)
//   air     = หลังตัวละคร/เอฟเฟกต์ (พิกัดโลก) — สิ่งที่บิน/ร่วง (โดนความมืดกลางคืนกลบตามจริง)
//   glow    = หลังชั้นความมืด (พิกัดจอ) — ของเรืองแสง/เงาดำที่ต้องเห็นในที่มืด
//  งบประสิทธิภาพ: < 1 ms/เฟรม (มือถือ CPU/4) • พูลอนุภาคคงที่ ไม่จองหน่วยความจำต่อเฟรม • ภาพเล็กอบไว้ครั้งเดียว
//   ไม่มี ctx.filter/shadowBlur ต่อเฟรม • ตัดสิ่งนอกจอ • กราฟิก 'ประหยัด' = เหลือชาวเมืองอย่างเดียว
//   prefers-reduced-motion = จำนวนครึ่งหนึ่ง ไม่กะพริบ ไม่มีฝูงบินผ่าน/ลมหมุน
//  ปิดทั้งหมด: AmbientLife.off = true (คนละตัวกับ Ambient ใน js/emote.js = อีโมต NPC)
// ============================================================

const AmbientLife = (() => {
  const SS = 3, TAU = Math.PI * 2;
  const A = { off: false, map: null, cfg: null, last: 0, dt: 0, t: 0, rm: false, low: false, on: false, g: null,
    vx0: 0, vx1: 0, vy0: 0, vy1: 0, wind: 12 };
  try {
    const mq = matchMedia('(prefers-reduced-motion: reduce)'); A.rm = mq.matches;
    if (mq.addEventListener) mq.addEventListener('change', e => { A.rm = e.matches; A.map = null; });
  } catch (e) { /* ไม่มี matchMedia */ }
  const rnd = () => Math.random(), rr = (a, b) => a + Math.random() * (b - a);

  // ---------- ภาพเล็กอบครั้งเดียว (วาดที่ 3 เท่าแล้วย่อ = คมทุกระดับซูม) ----------
  //   แคชเป็นอ็อบเจกต์ซ้อนตามพารามิเตอร์ (ไม่ต่อสตริงคีย์ทุกเฟรม = ไม่จองหน่วยความจำต่อเฟรม)
  const make = (w, h, fn) => {
    const c = document.createElement('canvas'); c.width = Math.ceil(w * SS); c.height = Math.ceil(h * SS);
    const x = c.getContext('2d'); x.scale(SS, SS); fn(x, w, h); return c;
  };
  const memo = (o, k) => o[k] || (o[k] = {});
  // ปุยนุ่ม (ควัน ฝุ่น เงา) และจุดเรืองแสง
  const SOFT = {}, GLOW = {}, STAR = {};
  const soft = rgb => SOFT[rgb] || (SOFT[rgb] = make(16, 16, (x) => {
    const gr = x.createRadialGradient(8, 8, 0, 8, 8, 8);
    gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.45, `rgba(${rgb},0.55)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, 16, 16);
  }));
  const glow = rgb => GLOW[rgb] || (GLOW[rgb] = make(16, 16, (x) => {
    const gr = x.createRadialGradient(8, 8, 0, 8, 8, 8);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, `rgba(${rgb},0.95)`); gr.addColorStop(0.5, `rgba(${rgb},0.25)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, 16, 16);
  }));
  // ประกายสี่แฉก (คริสตัล/น้ำพุ)
  const star = rgb => STAR[rgb] || (STAR[rgb] = make(20, 20, (x) => {
    x.drawImage(glow(rgb), 4, 4, 12, 12);
    x.fillStyle = 'rgba(255,255,255,0.95)';
    x.beginPath(); x.moveTo(10, 0); x.lineTo(11, 9); x.lineTo(20, 10); x.lineTo(11, 11); x.lineTo(10, 20); x.lineTo(9, 11); x.lineTo(0, 10); x.lineTo(9, 9); x.closePath(); x.fill();
  }));
  // นกด้านข้าง (หันซ้าย; flip = หันขวา) — ยืน / จิก / ปีกขึ้น / ปีกลง
  const BIRD = {
    sparrow: { w: 10, body: '#8a5a34', belly: '#ecdcb8', head: '#6e4428', wing: '#5a3a22', bill: '#3a2a1a', cap: '#9a3a2a' },
    pigeon: { w: 12, body: '#a3abbc', belly: '#c9cfdb', head: '#7d8698', wing: '#59606f', bill: '#e8c0a0', neck: '#4f9a86' },
    raven: { w: 13, body: '#22212b', belly: '#2d2c38', head: '#1a1922', wing: '#11111a', bill: '#3a3a44', sheen: '#4a5a8a' },
  };
  const BS = {};
  const birdSpr = (sp, fr, flip) => { const o = memo(memo(BS, sp), fr); return o[flip] || (o[flip] = make(16, 14, (x) => {
    const B = BIRD[sp], k = B.w / 10;
    if (flip) { x.translate(16, 0); x.scale(-1, 1); }
    x.translate(8, 10); x.scale(k, k);
    x.lineJoin = 'round'; x.lineWidth = 0.7; x.strokeStyle = 'rgba(20,14,10,0.75)';
    const tail = () => { x.fillStyle = B.wing; x.beginPath(); x.moveTo(2.5, -2.4); x.lineTo(6.2, -3.6); x.lineTo(6.4, -2.2); x.lineTo(2.8, -1.0); x.closePath(); x.fill(); x.stroke(); };
    if (fr === 'up' || fr === 'down') {
      tail();
      x.fillStyle = B.body; x.beginPath(); x.ellipse(0, -2.6, 3.8, 2.0, 0, 0, TAU); x.fill(); x.stroke();
      x.fillStyle = B.head; x.beginPath(); x.arc(-3.6, -3.3, 1.6, 0, TAU); x.fill(); x.stroke();
      x.fillStyle = B.bill; x.beginPath(); x.moveTo(-5.0, -3.6); x.lineTo(-6.4, -3.1); x.lineTo(-5.0, -2.7); x.fill();
      x.fillStyle = B.wing; x.beginPath();
      if (fr === 'up') { x.moveTo(-1.6, -3.6); x.quadraticCurveTo(-0.5, -9.5, 3.6, -9.8); x.quadraticCurveTo(1.6, -6.2, 1.8, -3.4); }
      else { x.moveTo(-1.6, -2.4); x.quadraticCurveTo(0.2, 2.6, 3.8, 3.2); x.quadraticCurveTo(1.8, -0.2, 1.8, -2.2); }
      x.closePath(); x.fill(); x.stroke();
      return;
    }
    const peck = fr === 'peck';
    x.fillStyle = 'rgba(0,0,0,0.22)'; x.beginPath(); x.ellipse(0, 0.6, 4.6, 1.3, 0, 0, TAU); x.fill(); // เงาใต้ตัว (อบในภาพ ไม่ต้องวาดแยก)
    // ขา
    x.strokeStyle = '#c08a5a'; x.lineWidth = 0.6; x.beginPath(); x.moveTo(-0.6, -1); x.lineTo(-0.9, 0.6); x.moveTo(0.8, -1); x.lineTo(0.9, 0.6); x.stroke();
    x.strokeStyle = 'rgba(20,14,10,0.75)'; x.lineWidth = 0.7;
    tail();
    x.fillStyle = B.body; x.beginPath(); x.ellipse(0, -2.8, 3.7, 2.3, peck ? -0.35 : -0.12, 0, TAU); x.fill(); x.stroke();
    x.fillStyle = B.belly; x.beginPath(); x.ellipse(-0.6, -2.0, 2.4, 1.2, peck ? -0.35 : -0.12, 0, Math.PI); x.fill();
    x.fillStyle = B.wing; x.beginPath(); x.ellipse(0.9, -3.0, 2.4, 1.3, -0.2, 0, TAU); x.fill();
    const hx = peck ? -3.7 : -3.0, hy = peck ? -1.3 : -5.0;
    if (B.neck) { x.fillStyle = B.neck; x.beginPath(); x.ellipse((hx - 1.6) / 2, (hy - 3.2) / 2 + 0.4, 1.3, 1.5, 0, 0, TAU); x.fill(); }
    x.fillStyle = B.head; x.beginPath(); x.arc(hx, hy, 1.7, 0, TAU); x.fill(); x.stroke();
    if (B.cap) { x.fillStyle = B.cap; x.beginPath(); x.arc(hx + 0.2, hy - 0.6, 1.1, Math.PI, TAU); x.fill(); }
    if (B.sheen) { x.fillStyle = B.sheen; x.globalAlpha = 0.6; x.beginPath(); x.ellipse(0.4, -3.6, 2, 0.6, -0.2, 0, TAU); x.fill(); x.globalAlpha = 1; }
    x.fillStyle = B.bill; x.beginPath(); x.moveTo(hx - 1.3, hy - 0.3); x.lineTo(hx - 3.0, hy + (peck ? 1.0 : 0.3)); x.lineTo(hx - 1.2, hy + 0.6); x.fill();
    x.fillStyle = '#fff'; x.fillRect(hx - 0.9, hy - 0.7, 0.7, 0.7); x.fillStyle = '#111'; x.fillRect(hx - 0.8, hy - 0.6, 0.45, 0.45);
  })); };
  // นก/ค้างคาวมองจากด้านบน (บินผ่านสูง ๆ) — 3 จังหวะปีก
  const FL = {};
  const flyer = (kind, fr) => { const o = memo(FL, kind); return o[fr] || (o[fr] = make(20, 12, (x) => {
    x.translate(10, 6);
    const bat = kind === 'bat', up = [-4.5, -0.5, 3.5][fr], span = [7, 9.5, 8][fr];
    x.fillStyle = bat ? '#1c1626' : '#f4f1ea'; x.strokeStyle = bat ? 'rgba(170,140,220,0.55)' : 'rgba(60,60,75,0.85)'; x.lineWidth = 0.6;
    x.beginPath(); x.moveTo(0, -1.4);
    if (bat) {
      x.quadraticCurveTo(-span * 0.5, up - 1, -span, up); x.lineTo(-span * 0.75, up + 2.2); x.lineTo(-span * 0.5, up + 1.4); x.lineTo(-span * 0.25, up + 2.6); x.lineTo(0, 1.6);
      x.lineTo(span * 0.25, up + 2.6); x.lineTo(span * 0.5, up + 1.4); x.lineTo(span * 0.75, up + 2.2); x.lineTo(span, up); x.quadraticCurveTo(span * 0.5, up - 1, 0, -1.4);
    } else {
      x.quadraticCurveTo(-span * 0.45, up - 1.6, -span, up + 0.6); x.quadraticCurveTo(-span * 0.5, up + 1.2, -1, 1.2); x.lineTo(0, 3.6); x.lineTo(1, 1.2);
      x.quadraticCurveTo(span * 0.5, up + 1.2, span, up + 0.6); x.quadraticCurveTo(span * 0.45, up - 1.6, 0, -1.4);
    }
    x.closePath(); x.fill(); x.stroke();
    if (!bat) { x.fillStyle = '#5a5e6c'; for (const s of [-1, 1]) { x.beginPath(); x.arc(s * span * 0.86, up + 0.4, 1.3, 0, TAU); x.fill(); } x.fillStyle = '#e8a040'; x.fillRect(-0.4, -2.4, 0.8, 1.1); }
    if (bat) { x.fillStyle = '#1c1626'; x.beginPath(); x.arc(0, -1.6, 1.3, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,90,90,0.9)'; x.fillRect(-0.8, -2, 0.5, 0.5); x.fillRect(0.3, -2, 0.5, 0.5); }
  })); };
  // ผีเสื้อ (มองจากบน กางปีก) / ผีเสื้อกลางคืน
  const BFLY = [['#ffb43a', '#fff0c0'], ['#6cc8ff', '#e8f8ff'], ['#ffffff', '#ffe6f0'], ['#ff7aa8', '#ffe0ea'], ['#b48cff', '#efe6ff'], ['#ffe14a', '#fff8d0']];
  const BF = {};
  const bfly = (i, moth) => { const k = moth ? 99 : i; return BF[k] || (BF[k] = make(12, 10, (x) => {
    const [c1, c2] = moth ? ['#e8e0c8', '#fffbea'] : BFLY[i];
    x.translate(6, 5); x.strokeStyle = 'rgba(40,24,30,0.8)'; x.lineWidth = 0.5;
    for (const s of [-1, 1]) {
      x.fillStyle = c1; x.beginPath(); x.ellipse(s * 2.9, -1.4, 2.9, 2.3, s * 0.5, 0, TAU); x.fill(); x.stroke();
      x.fillStyle = c1; x.beginPath(); x.ellipse(s * 2.1, 2.0, 1.9, 1.6, -s * 0.4, 0, TAU); x.fill(); x.stroke();
      x.fillStyle = c2; x.beginPath(); x.arc(s * 3.4, -1.8, 0.9, 0, TAU); x.fill();
      if (!moth) { x.fillStyle = 'rgba(30,20,30,0.85)'; x.beginPath(); x.arc(s * 4.6, -2.6, 0.55, 0, TAU); x.fill(); }
    }
    x.fillStyle = '#2a2026'; x.beginPath(); x.ellipse(0, 0.3, 0.6, 2.8, 0, 0, TAU); x.fill();
  })); };
  // แมลงปอ (มองจากบน หัวไปทาง +x) 2 จังหวะปีก
  const DF = {};
  const dfly = (c, fr, rot) => { const o = memo(memo(DF, c), fr); return o[rot] || (o[rot] = make(16, 16, (x) => {
    x.translate(8, 8); x.rotate(rot / 16 * TAU);
    const col = c ? '#e0503a' : '#26c8c0', sw = fr ? 0.35 : -0.15;
    x.fillStyle = 'rgba(225,245,255,0.55)'; x.strokeStyle = 'rgba(255,255,255,0.7)'; x.lineWidth = 0.35;
    for (const s of [-1, 1]) for (const [ox, ln] of [[1.8, 6.2], [0.3, 5.6]]) {
      x.save(); x.translate(ox, 0); x.rotate(s * (Math.PI / 2 + (ox > 1 ? -sw : sw)));
      x.beginPath(); x.ellipse(ln / 2, 0, ln / 2, 1.05, 0, 0, TAU); x.fill(); x.stroke(); x.restore();
    }
    x.fillStyle = col; x.strokeStyle = 'rgba(10,30,30,0.8)'; x.lineWidth = 0.4;
    x.beginPath(); x.ellipse(-3.4, 0, 4.4, 0.65, 0, 0, TAU); x.fill(); x.stroke();
    x.beginPath(); x.ellipse(1.4, 0, 1.4, 1, 0, 0, TAU); x.fill(); x.stroke();
    x.fillStyle = '#1a2a2a'; x.beginPath(); x.arc(3.2, -0.6, 0.7, 0, TAU); x.arc(3.2, 0.6, 0.7, 0, TAU); x.fill();
  })); };
  // ใบไม้ 8 มุมหมุน
  const LEAF = { field: ['#c8d84a', '#e8c040', '#f0a030', '#a8d050', '#e07a30', '#ffe070'], dark: ['#7aa060', '#a0a050', '#c09050', '#8ab070'], petal: ['#ffd6e6', '#ffffff', '#f7b6cf'] };
  const LF = {};
  const leaf = (col, r) => { const o = memo(LF, col); return o[r] || (o[r] = make(10, 10, (x) => {
    x.translate(5, 5); x.rotate(r / 8 * Math.PI);
    x.fillStyle = col; x.strokeStyle = 'rgba(40,30,10,0.55)'; x.lineWidth = 0.4;
    x.beginPath(); x.moveTo(-3.6, 0); x.quadraticCurveTo(0, -2.4, 3.6, 0); x.quadraticCurveTo(0, 2.4, -3.6, 0); x.fill(); x.stroke();
    x.strokeStyle = 'rgba(255,255,220,0.45)'; x.beginPath(); x.moveTo(-3, 0); x.lineTo(3, 0); x.stroke();
  })); };
  // เป็ด (ด้านข้าง หันซ้าย) แม่ = น้ำตาลลาย, ลูก = เหลือง
  const DK = {};
  const duck = (baby, flip) => { const o = memo(DK, baby); return o[flip] || (o[flip] = make(16, 12, (x) => {
    if (flip) { x.translate(16, 0); x.scale(-1, 1); }
    x.translate(8, 9); if (baby) x.scale(0.6, 0.6);
    x.lineWidth = 0.6; x.strokeStyle = 'rgba(30,20,10,0.75)';
    x.fillStyle = baby ? '#f4d040' : '#9a7448';
    x.beginPath(); x.moveTo(-4, -1); x.quadraticCurveTo(-4.4, 1.6, -1, 1.6); x.lineTo(4.6, 1.4); x.quadraticCurveTo(6.6, 0, 5.6, -2.6); x.quadraticCurveTo(2, -3.6, -2, -2.4); x.closePath(); x.fill(); x.stroke();
    if (!baby) { x.fillStyle = '#6a4a2a'; x.beginPath(); x.ellipse(1.6, -1.4, 3, 1.2, -0.1, 0, TAU); x.fill(); x.fillStyle = '#3a5ac8'; x.fillRect(2.2, -1.3, 1.6, 0.7); }
    x.fillStyle = baby ? '#f8dc58' : '#8a6440'; x.beginPath(); x.arc(-3.4, -3.6, 2.0, 0, TAU); x.fill(); x.stroke();
    x.fillStyle = '#f0902a'; x.beginPath(); x.moveTo(-5.0, -3.9); x.lineTo(-7.0, -3.3); x.lineTo(-5.0, -2.8); x.fill();
    x.fillStyle = '#111'; x.fillRect(-4.3, -4.4, 0.7, 0.7);
  })); };
  // ปลาเงิน (หัวไปทาง +x)
  let FISH = null;
  const fish = () => FISH || (FISH = make(10, 6, (x) => {
    x.translate(5, 3); x.fillStyle = '#d8e4ee'; x.strokeStyle = 'rgba(30,50,70,0.7)'; x.lineWidth = 0.4;
    x.beginPath(); x.ellipse(0.4, 0, 3.4, 1.3, 0, 0, TAU); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(-2.6, 0); x.lineTo(-4.6, -1.4); x.lineTo(-4.6, 1.4); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = '#7a9ab0'; x.fillRect(-1.5, -1.0, 3.5, 0.6);
  }));
  // อักษรรูนเรือง (อบ shadowBlur ครั้งเดียวตอนสร้าง)
  const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
  const GL = [];
  const glyph = i => GL[i] || (GL[i] = make(24, 28, (x) => {
    x.drawImage(glow('255,180,70'), -2, 0, 28, 28);
    x.font = 'bold 17px serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.shadowColor = 'rgba(255,190,80,1)'; x.shadowBlur = 4; x.lineWidth = 2.2; x.strokeStyle = 'rgba(255,170,60,0.9)';
    x.strokeText(RUNES[i % RUNES.length], 12, 14.5);
    x.shadowBlur = 0; x.fillStyle = 'rgba(255,248,215,1)'; x.fillText(RUNES[i % RUNES.length], 12, 14.5);
  }));

  // ---------- ค่าตั้งต่อแมพ ----------
  const CFG = {
    eldheim: { steps: 'town', citizens: 5, flocks: [['pigeon', 4], ['raven', 2], ['pigeon', 3]], flockOn: 'stone', butterflies: 4,
      smoke: [[359, 560, 0.9, '205,205,212'], [354, 252, 0.7, '205,205,212'], [1397, 604, 1.4, '120,112,118', 1]], fountain: [820, 623], bifrost: [940, 452], canal: 4, ripples: 1 },
    meadow: { steps: 'field', butterflies: 7, flocks: [['sparrow', 5], ['sparrow', 4], ['sparrow', 3]], overhead: 'bird', leaves: 7, fish: 1, ripples: 1, dragonflies: 2 },
    mistlake: { steps: 'field', butterflies: 4, dragonflies: 4, ducks: 3, fish: 1, ripples: 1, flocks: [['sparrow', 4], ['sparrow', 3]], overhead: 'bird', leaves: 6 },
    wolfwood: { steps: 'field', leaves: 7, leafCol: 'dark', moths: 8, owls: 2, bats: 1, ripples: 1 },
    arena: { steps: 'sand', torchSmoke: 1, devil: 1, circlers: 3 },
    helcave: { steps: 'cave', drips: '170,210,255', bats: 1, glints: '200,140,255', beams: 1 },
    archive: { steps: 'cave', drips: '230,215,180', glyphs: 7, glints: '255,200,110', beams: 1 },
    roots: { steps: 'cave', drips: '255,150,80', bats: 1, glints: '255,140,90', beams: 1, crumbs: 7 },
    abyss: { steps: 'cave', drips: '150,230,120', bats: 1, glints: '120,255,170', ash: 18, bubbles: 4, embers: 6 },
  };
  const defCfg = m => m.def.kind === 'cave' ? { steps: 'cave', drips: '190,200,230', glints: '200,180,255', bats: 1 }
    : m.def.kind === 'field' ? { steps: 'field', butterflies: 4, leaves: 4 } : { steps: 'town' };

  // ---------- สถานะต่อแมพ (สร้างครั้งเดียวตอนเข้าแมพ) ----------
  let C = null; // ทุกพูลของแมพปัจจุบัน
  const pool = (n, mkf) => { const a = []; for (let i = 0; i < n; i++) a.push(Object.assign({ on: false }, mkf ? mkf(i) : {})); return a; };
  const half = n => A.rm ? Math.ceil(n / 2) : n;

  function setup(map) {
    A.map = map; A.low = R.quality === 'low';
    const cfg = A.cfg = CFG[map.id] || defCfg(map);
    A.dripCol = cfg.drips ? `rgba(${cfg.drips},0.75)` : '';
    const water = [], trees = [], crystals = [], lights = [], torches = [];
    const wt = map.waterTiles || [];
    for (let i = 0; i < wt.length; i += 2) water.push(wt[i], wt[i + 1]);
    for (const o of map.objects || []) if (o.kind === 'tree' || o.kind === 'pine') trees.push(o);
    for (const o of map.props || []) {
      if (o.kind === 'crystal') crystals.push(o);
      else if (o.kind === 'lamp' || o.kind === 'mushroom') lights.push(o);
    }
    for (const tc of map.torches || []) torches.push(tc);
    C = {
      water, trees, crystals, lights, torches, vTrees: [], vCrys: [], vLights: [], visT: 0,
      steps: pool(8), stepAcc: 0, stepSide: 1, px: G.player.x, py: G.player.y,
      bf: pool(half(cfg.butterflies || 0), i => ({ col: i % BFLY.length })),
      df: pool(half(cfg.dragonflies || 0), i => ({ col: i % 3 === 2 ? 1 : 0 })),
      flocks: [], over: pool(8), overT: rr(4, 10), overKind: 'bird',
      leaves: pool(half(cfg.leaves || 0)), leafT: 0,
      ripples: pool(12), ripT: 0, fish: { on: false }, fishT: rr(2, 5), drops: pool(10),
      ducks: null, cits: [], smoke: pool(cfg.smoke ? 16 : cfg.torchSmoke ? 14 : 0), sparks: pool(cfg.smoke ? 5 : 0),
      fdrops: pool(cfg.fountain ? 12 : 0), mist: pool(cfg.fountain ? 3 : 0), bif: pool(cfg.bifrost ? 10 : 0), petals: pool(cfg.canal || 0),
      moths: pool(half(cfg.moths || 0)), owls: pool(cfg.owls || 0), drips: pool(6), dripT: 1, glints: pool(cfg.glints ? 6 : 0), glintT: 0,
      motes: pool(cfg.beams ? half(14) : 0), glyphs: pool(half(cfg.glyphs || 0)), crumbs: pool(half(cfg.crumbs || 0)),
      ash: pool(half(cfg.ash || 0)), embers: pool(half(cfg.embers || 0)), bubbles: pool(cfg.bubbles || 0),
      devil: { on: false, t: rr(8, 16) }, circ: pool(cfg.circlers || 0, i => ({ a: i * TAU / 3, r: 150 + i * 50, z: 150 + i * 25 })),
    };
    if (A.low) return; // กราฟิก 'ประหยัด': ชาวเมืองอย่างเดียว
    for (const [sp, n] of cfg.flocks || []) C.flocks.push(newFlock(sp, half(n)));
    if (cfg.ducks && water.length) C.ducks = newDucks(cfg.ducks);
  }

  // ---------- ช่วยเหลือ ----------
  const K = () => R.K;
  function view() {
    const vw = R.W / R.zoom, vh = R.H / R.zoom;
    A.vx0 = R.camX; A.vx1 = R.camX + vw; A.vy0 = R.camY / R.K; A.vy1 = (R.camY + vh) / R.K;
  }
  const inView = (x, y, m) => x > A.vx0 - m && x < A.vx1 + m && y > A.vy0 - m && y < A.vy1 + m;
  const tileAt = (x, y) => A.map.tile(Math.floor(x / TILE), Math.floor(y / TILE));
  // จุดสุ่มในจอ (พิกเซลโลก) ที่ผ่านเงื่อนไข — ไม่เจอใน n ครั้ง = null
  function spotInView(ok, n = 10, pad = 0) {
    for (let i = 0; i < n; i++) {
      const x = rr(A.vx0 + pad, A.vx1 - pad), y = rr(A.vy0 + pad, A.vy1 - pad);
      if (ok(x, y)) return [x, y];
    }
    return null;
  }
  const isGrassy = (x, y) => { const t = tileAt(x, y); return t === T.GRASS || t === T.FLOWER; };
  const isWater = (x, y) => tileAt(x, y) === T.WATER;
  const walk = (x, y) => A.map.walkable(Math.floor(x / TILE), Math.floor(y / TILE));
  const waterInView = () => {
    const W = C.water; if (!W.length) return null;
    for (let i = 0; i < 12; i++) {
      const k = (Math.random() * (W.length / 2)) | 0, x = (W[k * 2] + 0.15 + rnd() * 0.7) * TILE, y = (W[k * 2 + 1] + 0.15 + rnd() * 0.7) * TILE;
      if (inView(x, y, -10)) return [x, y];
    }
    return null;
  };
  const plDist = (x, y) => { const p = G.player; return Math.hypot(p.x * TILE - x, p.y * TILE - y); };
  function ripple(x, y, r1, life, a) {
    for (const q of C.ripples) if (!q.on) { q.on = true; q.x = x; q.y = y; q.age = 0; q.life = life || 1.1; q.r1 = r1 || 10; q.a = a || 0.5; return; }
  }

  // ---------- นกบนพื้น (ฝูง) ----------
  function flockSpot(fl, far) {
    const p = G.player, town = A.cfg.flockOn === 'stone';
    for (let i = 0; i < 30; i++) {
      const x = (p.x + rr(-14, 14)) * TILE, y = (p.y + rr(-10, 10)) * TILE, d = plDist(x, y);
      if (d < far * TILE || !walk(x, y)) continue;
      const t = tileAt(x, y);
      if (town ? t !== T.STONE : !(t === T.GRASS || t === T.FLOWER || t === T.DIRT)) continue;
      if (G.npcs.some(n => Math.hypot((n.x + 0.5) * TILE - x, (n.y + 0.5) * TILE - y) < 2.2 * TILE)) continue;
      return [x, y];
    }
    return null;
  }
  function newFlock(sp, n) {
    const fl = { sp, st: 'away', tm: rr(0.5, 4), cx: 0, cy: 0, b: [] };
    for (let i = 0; i < n; i++) {
      const b = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, fl: rnd() < 0.5, act: 'stand', tm: rr(0, 2), ox: 0, oy: 0, sx: 0, sy: 0, ph: rnd() * 6, item: null };
      b.item = { y: 0, f: () => drawGroundBird(fl, b) };
      fl.b.push(b);
    }
    return fl;
  }
  function landFlock(fl) {
    const s = flockSpot(fl, 5); if (!s) { fl.tm = 2; return; }
    fl.cx = s[0]; fl.cy = s[1]; fl.st = 'land'; fl.tm = 1.5;
    const a = rnd() * TAU;
    for (const b of fl.b) {
      b.ox = rr(-26, 26); b.oy = rr(-16, 16);
      b.sx = fl.cx + b.ox + Math.cos(a) * 160; b.sy = fl.cy + b.oy + Math.sin(a) * 100;
      b.fl = Math.cos(a) < 0; b.act = 'stand'; b.tm = rr(0.3, 2);
    }
  }
  function updFlock(fl, dt) {
    const p = G.player;
    if (fl.st === 'away') { fl.tm -= dt; if (fl.tm <= 0) landFlock(fl); return; }
    if (fl.st === 'land') {
      fl.tm -= dt; const k = Math.max(0, fl.tm / 1.5), e = k * k;
      for (const b of fl.b) { b.x = fl.cx + b.ox + (b.sx - fl.cx - b.ox) * e; b.y = fl.cy + b.oy + (b.sy - fl.cy - b.oy) * e; b.z = 90 * e; b.ph += dt * 18; }
      if (fl.tm <= 0) fl.st = 'ground';
      return;
    }
    if (fl.st === 'ground') {
      // ไกลจากผู้เล่นมาก (เดินผ่านไปแล้ว) → ย้ายมาใกล้ ๆ ใหม่ด้วยการบินลง
      const dp = plDist(fl.cx, fl.cy);
      if (dp > 22 * TILE) { fl.st = 'away'; fl.tm = rr(1, 4); return; }
      let scare = dp < 2.6 * TILE ? [p.x * TILE, p.y * TILE] : null;
      if (!scare) for (const c of C.cits) if (Math.hypot(c.x * TILE - fl.cx, c.y * TILE - fl.cy) < 1.3 * TILE) { scare = [c.x * TILE, c.y * TILE]; break; }
      if (!scare && Online.others.size) for (const o of Online.others.values()) if (Math.hypot(o.x * TILE - fl.cx, o.y * TILE - fl.cy) < 2.2 * TILE) { scare = [o.x * TILE, o.y * TILE]; break; }
      if (scare) {
        fl.st = 'flee'; fl.tm = 2.6;
        for (const b of fl.b) {
          let dx = b.x - scare[0], dy = b.y - scare[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
          const sp = rr(110, 160) * (A.rm ? 0.6 : 1), j = rr(-0.5, 0.5);
          b.vx = (dx * Math.cos(j) - dy * Math.sin(j)) * sp; b.vy = (dx * Math.sin(j) + dy * Math.cos(j)) * sp * 0.8; b.vz = rr(70, 110);
          b.fl = b.vx > 0; b.ph = rnd() * 6;
        }
        return;
      }
      for (const b of fl.b) {
        b.tm -= dt;
        if (b.act === 'hop') { b.z = Math.max(0, Math.sin((1 - b.tm / 0.22) * Math.PI) * 4); b.x += b.vx * dt; b.y += b.vy * dt; }
        if (b.tm <= 0) {
          const r = rnd();
          if (r < 0.42) { b.act = 'peck'; b.tm = rr(0.15, 0.35); }
          else if (r < 0.7) { b.act = 'stand'; b.tm = rr(0.4, 1.6); if (rnd() < 0.3) b.fl = !b.fl; }
          else {
            b.act = 'hop'; b.tm = 0.22; b.z = 0;
            // กระโดดไปทางที่หัน ไม่ห่างกลุ่มเกินไป
            let dx = b.fl ? 1 : -1; if (Math.abs(b.x + dx * 6 - fl.cx) > 30) { dx = -dx; b.fl = !b.fl; }
            b.vx = dx * rr(20, 34); b.vy = rr(-12, 12); if (Math.abs(b.y - fl.cy) > 18) b.vy = (fl.cy - b.y) * 1.5;
          }
          if (b.act !== 'hop') b.z = 0;
        }
      }
      return;
    }
    // flee: บินขึ้นแล้วหายไป (ไปลงที่อื่น)
    fl.tm -= dt;
    for (const b of fl.b) { b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.vz = Math.max(30, b.vz - 30 * dt); b.ph += dt * 22; }
    if (fl.tm <= 0) { fl.st = 'away'; fl.tm = rr(5, 12); }
  }
  // วาดนกบนพื้น (ในรายการเรียงความลึก: พิกัด y โลก ไม่บีบ)
  function drawGroundBird(fl, b) {
    const g = A.g, img = birdSpr(fl.sp, b.act === 'peck' ? 'peck' : 'stand', b.fl ? 1 : 0);
    g.drawImage(img, b.x - 11, b.y - 14 - b.z, 22, 19.25);
  }
  function drawAirBird(fl, b, K) {
    const g = A.g, up = Math.sin(b.ph) > 0;
    g.drawImage(birdSpr(fl.sp, up ? 'up' : 'down', b.fl ? 1 : 0), b.x - 11, b.y * K - 14 - b.z, 22, 19.25);
  }

  // ---------- เป็ดแม่ลูก ----------
  function newDucks(nb) {
    // จุดเริ่ม = ช่องน้ำที่มีน้ำรอบตัวมากที่สุด (กลางทะเลสาบ)
    const W = C.water; let best = 0, bx = W[0], by = W[1];
    for (let i = 0; i < W.length; i += 2) {
      let n = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (A.map.tile(W[i] + dx, W[i + 1] + dy) === T.WATER) n++;
      if (n > best) { best = n; bx = W[i]; by = W[i + 1]; }
    }
    const D = { x: (bx + 0.5) * TILE, y: (by + 0.5) * TILE, h: rnd() * TAU, sp: 13, pause: 0, hist: new Float32Array(80), hi: 0, ht: 0, fl: false, list: [] };
    for (let i = 0; i < 40; i++) { D.hist[i * 2] = D.x; D.hist[i * 2 + 1] = D.y; }
    for (let i = 0; i <= nb; i++) {
      const d = { i, x: D.x, y: D.y, fl: false, ph: rnd() * 6, item: null };
      d.item = { y: 0, f: () => drawDuck(d) };
      D.list.push(d);
    }
    return D;
  }
  function updDucks(D, dt) {
    if (D.pause > 0) D.pause -= dt;
    else {
      const ax = D.x + Math.cos(D.h) * 22, ay = D.y + Math.sin(D.h) * 22;
      if (!isWater(ax, ay) || !isWater(D.x + Math.cos(D.h) * 40, D.y + Math.sin(D.h) * 40)) D.h += (rnd() < 0.5 ? 1 : -1) * rr(0.8, 2.2) * dt * 3;
      else D.h += rr(-0.4, 0.4) * dt;
      const nx = D.x + Math.cos(D.h) * D.sp * dt, ny = D.y + Math.sin(D.h) * D.sp * dt;
      if (isWater(nx, ny)) { D.x = nx; D.y = ny; } else D.h += Math.PI * 0.6;
      if (rnd() < dt * 0.06) D.pause = rr(1.5, 4);
    }
    D.ht += dt;
    if (D.ht > 0.12 && D.pause <= 0) { D.ht = 0; D.hi = (D.hi + 1) % 40; D.hist[D.hi * 2] = D.x; D.hist[D.hi * 2 + 1] = D.y; }
    for (const d of D.list) {
      const ox = d.x, oy = d.y;
      if (d.i === 0) { d.x = D.x; d.y = D.y; }
      else { const k = ((D.hi - d.i * 4) % 40 + 40) % 40; d.x += (D.hist[k * 2] - d.x) * Math.min(1, dt * 4); d.y += (D.hist[k * 2 + 1] - d.y) * Math.min(1, dt * 4); }
      if (Math.abs(d.x - ox) > 0.02) d.fl = d.x > ox;
      d.ph += dt;
    }
  }
  function drawDuck(d) {
    const g = A.g, bob = Math.sin(d.ph * 2.2 + d.i) * 0.8, img = duck(d.i ? 1 : 0, d.fl ? 1 : 0);
    g.drawImage(img, d.x - 11, d.y - 12.5 + bob, 22, 16.5);
  }

  // ---------- ชาวเมือง ----------
  // ชาวเมือง = ภาพ Novice มือเปล่าย้อมสีเป็นชุดพลเมืองแอนดรอยด์ (ย้อมครั้งเดียว ย่อ 2/3 ประหยัดหน่วยความจำ ~3 MB/ชุด)
  //   + ภาพ Novice มือเปล่าเดิม (ใช้ร่วมกับผู้เล่น ไม่เสียหน่วยความจำเพิ่ม)
  //   วาดเองจากแถบท่าเดิน 8 ทิศ (ภาพย้อมย่อขนาด ช่องไม่ใช่ 240 px — Anim.draw ใช้ไม่ได้) = เงา 1 + ภาพ 1 ต่อคน
  const CIT_KEYS = ['amb_cit_a', 'novice_f_bare', 'amb_cit_b', 'novice_m_bare', 'amb_cit_a', 'amb_cit_b'];
  const CIT_BASE = { amb_cit_a: 'novice_f_bare', amb_cit_b: 'novice_m_bare', novice_f_bare: 'novice_f_bare', novice_m_bare: 'novice_m_bare' };
  const CIT_H = 96; // ช่อง 240 px ของภาพ → 96 px โลก (ตัวสูงราว 60 px — เล็กกว่าผู้เล่นนิดหน่อย)
  function drawCitizen(c) {
    const g = A.g, src = Art.get(`anim_${c.key}_walk`), base = Art.get(`anim_${CIT_BASE[c.key]}_walk`);
    if (!src || !base) return;
    const cell = src.height / 8, n = Math.max(1, Math.round(src.width / cell)), row = c.st.dir;
    const f = c.st.moving ? Math.floor((A.t + c.st.seed) / (0.8 / n)) % n : (c.still[row] != null ? c.still[row] : (c.still[row] = Anim.stillFrame(base, n, row)));
    const x = c.x * TILE, y = c.y * TILE;
    g.globalAlpha = 0.26; g.drawImage(soft('0,0,0'), x - 13, y - 4.5, 26, 9); g.globalAlpha = 1;
    // ครอปเฉพาะกรอบตัวละครในช่อง (x 55–185, y 50–232 ของช่อง 240) — พื้นที่วาดเหลือ ~40% (raster ซอฟต์แวร์คิดตามพิกเซล)
    const u = cell / 240, k = CIT_H / 240;
    g.drawImage(src, (f * 240 + 55) * u, (row * 240 + 50) * u, 130 * u, 182 * u, x - 65 * k, y - 170 * k, 130 * k, 182 * k);
  }
  Art.alias('anim_amb_cit_a_walk', 'anim_novice_f_bare_walk', { sat: 0.55, bri: 1.04, tint: ['#bfe0ff', 0.2], w: 640 });
  Art.alias('anim_amb_cit_b_walk', 'anim_novice_m_bare_walk', { hue: 25, sat: 0.9, bri: 0.9, tint: ['#e8c89a', 0.18], w: 640 });
  function setupCitizens(n) {
    for (const k of ['novice_f_bare', 'novice_m_bare']) Art.need(`anim_${k}_walk`);
    if (!Anim.has('novice_f_bare') || !Anim.has('novice_m_bare')) return false;
    const keys = CIT_KEYS.filter(k => Anim.has(k));
    if (!keys.length) return false;
    const m = A.map;
    for (let i = 0; i < n; i++) {
      const s = citSpot(); if (!s) continue;
      const c = { key: keys[i % keys.length], x: s[0] + 0.5, y: s[1] + 0.5, path: [], wait: rr(0, 4), st: { dir: (rnd() * 8) | 0, moving: false, seed: i * 1.7 }, still: [], item: null };
      c.item = { y: 0, f: () => drawCitizen(c) };
      C.cits.push(c);
    }
    return m === A.map;
  }
  function citSpot() {
    const m = A.map, cx = m.w / 2, cy = m.h / 2;
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(cx + rr(-12, 12)), y = Math.floor(cy + rr(-11, 11));
      if (!m.walkable(x, y) || m.tile(x, y) !== T.STONE) continue;
      if (G.npcs.some(n => Math.abs(n.x - x) < 2 && Math.abs(n.y - y) < 2)) continue;
      if (m.portals.some(p => Math.abs(p.x - x) < 3 && Math.abs(p.y - y) < 3)) continue;
      if (m.fountain && Math.hypot(x + 0.5 - m.fountain.x, y + 0.5 - m.fountain.y) < 4.6) continue; // ขอบสระน้ำพุ 3D กว้างกว่าช่องชน
      return [x, y];
    }
    return null;
  }
  function updCitizens(dt) {
    for (const c of C.cits) {
      if (!c.path.length) {
        c.st.moving = false;
        c.wait -= dt;
        if (c.wait <= 0) {
          const s = citSpot();
          if (s) c.path = findPath(A.map, c.x, c.y, s[0], s[1], 900);
          c.wait = rr(2, 7);
        }
        continue;
      }
      const nd = c.path[0], tx = nd.x + 0.5, ty = nd.y + 0.5, dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy), sp = 1.25 * dt;
      if (d <= sp) { c.x = tx; c.y = ty; c.path.shift(); }
      else { c.x += dx / d * sp; c.y += dy / d * sp; c.st.dir = dirFromVec(dx, dy); }
      c.st.moving = true;
    }
  }

  // ---------- อัปเดตทั้งหมด (ครั้งเดียวต่อเฟรม จาก ground) ----------
  function update(dt) {
    const cfg = A.cfg, p = G.player, t = A.t, Kk = R.K;
    A.wind = 12 + Math.sin(t * 0.13) * 7;
    // ต้นไม้/คริสตัล/แหล่งแสงที่อยู่ในจอ (สำรวจทุก 0.5 วิ — อาร์เรย์เดิมใช้ซ้ำ)
    if ((C.visT -= dt) <= 0) {
      C.visT = 0.5;
      C.vTrees.length = 0; C.vCrys.length = 0; C.vLights.length = 0;
      for (const o of C.trees) if (inView(o.x * TILE, o.y * TILE, 30)) C.vTrees.push(o);
      for (const o of C.crystals) if (inView(o.x * TILE, o.y * TILE, -10)) C.vCrys.push(o);
      for (const o of C.lights) if (inView(o.x * TILE, o.y * TILE, 0)) C.vLights.push(o);
    }
    if (C.cits.length) updCitizens(dt);
    if (A.low) return;
    // รอยเท้า: ฝุ่น/เศษหญ้าทุก ~0.8 ช่องที่เดิน
    const mv = Math.hypot(p.x - C.px, p.y - C.py); C.px = p.x; C.py = p.y;
    if (p.moving && !p.dead && mv < 1) {
      C.stepAcc += mv;
      if (C.stepAcc > 0.8) {
        C.stepAcc = 0; C.stepSide = -C.stepSide;
        const t0 = A.map.tile(Math.floor(p.x), Math.floor(p.y));
        let kind = cfg.steps === 'cave' ? 1 : cfg.steps === 'sand' ? 2 : t0 === T.DIRT ? 3 : t0 === T.GRASS || t0 === T.FLOWER ? 4 : 0;
        if (cfg.steps === 'town' && t0 === T.STONE) kind = 0;
        if (kind) for (const s of C.steps) if (!s.on) { s.on = true; s.x = p.x * TILE + C.stepSide * 4; s.y = p.y * TILE + 2; s.age = 0; s.kind = kind; s.r = rnd(); break; }
      }
    } else C.stepAcc = Math.min(C.stepAcc, 0.5);
    for (const s of C.steps) if (s.on && (s.age += dt) > 0.6) s.on = false;
    // ผีเสื้อ
    for (const b of C.bf) {
      if (!b.on) {
        const s = spotInView(isGrassy, 6, 30); if (!s) continue;
        b.on = true; b.x = s[0]; b.y = s[1]; b.h = rnd() * TAU; b.ph = rnd() * 9; b.a = 0; b.z = rr(10, 22);
        continue;
      }
      b.ph += dt; b.a = Math.min(1, b.a + dt);
      const d = plDist(b.x, b.y);
      if (d < 70) { const ax = Math.atan2(b.y - p.y * TILE, b.x - p.x * TILE); b.h += Math.sin(ax - b.h) * dt * 6; }
      else b.h += Math.sin(b.ph * 0.9 + b.col) * dt * 2.2;
      const sp = d < 70 ? 62 : 24;
      b.x += Math.cos(b.h) * sp * dt + A.wind * 0.15 * dt; b.y += Math.sin(b.h) * sp * dt * 0.8;
      b.z = 16 + Math.sin(b.ph * 0.8) * 7 + Math.abs(Math.sin(b.ph * 7)) * 3;
      if (!inView(b.x, b.y, 160)) b.on = false;
    }
    // แมลงปอ: โฉบเร็วแล้วหยุดลอยนิ่งเหนือน้ำ
    for (const f of C.df) {
      if (!f.on) {
        const s = waterInView() || (C.water.length ? null : spotInView(isGrassy, 4, 30)); if (!s) continue;
        f.on = true; f.x = s[0]; f.y = s[1]; f.tx = f.x; f.ty = f.y; f.tm = rr(0.3, 1.2); f.h = rnd() * TAU; f.ph = rnd() * 5; f.a = 0; f.z = rr(12, 22);
        continue;
      }
      f.ph += dt; f.a = Math.min(1, f.a + dt * 1.5); f.tm -= dt;
      if (f.tm <= 0) {
        const a = rnd() * TAU, r = rr(25, 70); f.tx = f.x + Math.cos(a) * r; f.ty = f.y + Math.sin(a) * r * 0.7; f.tm = rr(0.6, 1.8);
        if (C.water.length && !isWater(f.tx, f.ty) && rnd() < 0.7) { f.tx = f.x - Math.cos(a) * r; f.ty = f.y - Math.sin(a) * r * 0.7; }
      }
      const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy);
      if (d > 1) { f.h = Math.atan2(dy, dx); const k = Math.min(1, dt * 7); f.x += dx * k; f.y += dy * k; }
      if (plDist(f.x, f.y) < 50) { f.tx = f.x + (f.x - p.x * TILE) * 1.5; f.ty = f.y + (f.y - p.y * TILE); f.tm = 1; }
      if (!inView(f.x, f.y, 200)) f.on = false;
    }
    // ฝูงนกบนพื้น
    for (const fl of C.flocks) updFlock(fl, dt);
    // ฝูงนก/ค้างคาวบินผ่าน
    if ((cfg.overhead || cfg.bats || cfg.circlers) && !A.rm) {
      C.overT -= dt;
      if (C.overT <= 0 && (cfg.overhead || cfg.bats) && !C.over.some(o => o.on)) {
        C.overT = cfg.bats ? rr(7, 15) : rr(12, 22);
        const bat = !!cfg.bats, n = bat ? (3 + rnd() * 3) | 0 : (5 + rnd() * 3) | 0, fromL = rnd() < 0.5;
        const vw = A.vx1 - A.vx0, vh = A.vy1 - A.vy0, y0 = A.vy0 + vh * rr(0.15, 0.85), sp = bat ? 120 : 100, ang = rr(-0.35, 0.35);
        const vx = Math.cos(ang) * sp * (fromL ? 1 : -1), vy = Math.sin(ang) * sp;
        C.overKind = bat ? 'bat' : 'bird';
        for (let i = 0; i < n && i < C.over.length; i++) {
          const o = C.over[i], row = (i + 1) >> 1, side = i % 2 ? 1 : -1;
          o.on = true; o.x = (fromL ? A.vx0 - 60 : A.vx1 + 60) - (fromL ? 1 : -1) * row * 22 + rr(-6, 6); o.y = y0 + side * row * 14 + rr(-5, 5);
          o.vx = vx; o.vy = vy; o.z = bat ? rr(50, 80) : rr(120, 160); o.ph = rnd() * 6; o.life = (vw + 300) / sp + 1; o.j = rnd() * 6;
        }
      }
    }
    for (const o of C.over) if (o.on) {
      o.ph += dt; o.life -= dt;
      const bat = C.overKind === 'bat';
      o.x += o.vx * dt; o.y += (o.vy + (bat ? Math.sin(o.ph * 5 + o.j) * 60 : 0)) * dt;
      if (o.life <= 0) o.on = false;
    }
    for (const c of C.circ) { c.a += dt * (0.25 + c.r * 0.0004) * (A.rm ? 0.5 : 1); c.ph = (c.ph || 0) + dt; }
    // ใบไม้ร่วงจากต้นไม้ในจอ
    if (C.leaves.length && C.trees.length) {
      C.leafT -= dt;
      if (C.leafT <= 0) {
        C.leafT = rr(0.35, 0.8) * (A.rm ? 2 : 1);
        if (C.vTrees.length) {
          const o = C.vTrees[(Math.random() * C.vTrees.length) | 0], x = o.x * TILE, y = o.y * TILE;
          for (const l of C.leaves) if (!l.on) {
            const sz = o.size || 1;
            l.on = true; l.x = x + rr(-34, 34) * sz; l.y = y + rr(-6, 14); l.z = rr(45, 100) * sz; l.ph = rnd() * 9; l.rest = 0; l.vz = rr(14, 22);
            const P = LEAF[cfg.leafCol || 'field']; l.col = P[(Math.random() * P.length) | 0];
            break;
          }
        }
      }
      for (const l of C.leaves) if (l.on) {
        l.ph += dt;
        if (l.z > 0) { l.z -= l.vz * dt * (0.7 + 0.5 * Math.abs(Math.sin(l.ph * 2.2))); l.x += (A.wind * 0.9 + Math.sin(l.ph * 2.2) * 22) * dt; if (l.z <= 0) { l.z = 0; l.rest = 0; } }
        else if ((l.rest += dt) > 2.2) l.on = false;
      }
    }
    // น้ำ: วงกระเพื่อม ปลากระโดด
    if (cfg.ripples && C.water.length) {
      C.ripT -= dt;
      if (C.ripT <= 0) { C.ripT = rr(0.25, 0.7) * (A.rm ? 2 : 1); const s = waterInView(); if (s) ripple(s[0], s[1], rr(6, 11), rr(0.9, 1.4), 0.4); }
    }
    for (const q of C.ripples) if (q.on && (q.age += dt) > q.life) q.on = false;
    if (cfg.fish && C.water.length) {
      const F = C.fish;
      if (!F.on) {
        C.fishT -= dt;
        if (C.fishT <= 0) {
          C.fishT = rr(3, 7);
          const s = waterInView();
          if (s) {
            const a = rnd() < 0.5 ? 0 : Math.PI, ex = s[0] + Math.cos(a) * 34, ey = s[1] + rr(-6, 6);
            if (isWater(ex, ey)) { F.on = true; F.x0 = s[0]; F.y0 = s[1]; F.x1 = ex; F.y1 = ey; F.k = 0; F.fl = a; ripple(s[0], s[1], 13, 1.2, 0.7); splash(s[0], s[1], '220,240,255', 3); }
          }
        }
      } else if ((F.k += dt / 0.7) >= 1) { F.on = false; ripple(F.x1, F.y1, 15, 1.3, 0.75); splash(F.x1, F.y1, '220,240,255', 4); }
    }
    for (const d of C.drops) if (d.on) { d.age += dt; d.x += d.vx * dt; d.z += d.vz * dt; d.vz -= 260 * dt; if (d.z < 0) d.on = false; }
    if (C.ducks) updDucks(C.ducks, dt);
    // ควันปล่องไฟ (เมือง) / ควันคบเพลิง (ลานประลอง)
    if (C.smoke.length) {
      if (cfg.smoke) for (const e of cfg.smoke) {
        if (!inView(e[0], e[1] / Kk, 260)) continue;
        if (rnd() < dt * (e[4] ? 2.4 : 1.4)) emitSmoke(e[0] + rr(-3, 3), e[1], e[2], e[3]);
        if (e[4] && rnd() < dt * 3) for (const s of C.sparks) if (!s.on) { s.on = true; s.x = e[0] + rr(-10, 10); s.yk = e[1]; s.vx = rr(-8, 14); s.vy = -rr(30, 55); s.age = 0; s.life = rr(0.8, 1.5); break; }
      }
      if (cfg.torchSmoke) for (const tc of C.torches) {
        const lift = tc.h * Math.sqrt(1 - Kk * Kk) * TILE, x = tc.x * TILE, yk = tc.y * TILE * Kk - lift - 22;
        if (!inView(x, yk / Kk, 120)) continue;
        if (rnd() < dt * 2.2) emitSmoke(x + rr(-2, 2), yk + 6, 0.8, '60,52,48');
      }
      for (const s of C.smoke) if (s.on) { s.age += dt; s.x += (s.vx + A.wind * 0.8 * Math.min(1, s.age)) * dt; s.yk -= s.vy * dt; if (s.age > s.life) s.on = false; }
      for (const s of C.sparks) if (s.on) { s.age += dt; s.x += (s.vx + A.wind * 0.5) * dt; s.yk += s.vy * dt; if (s.age > s.life) s.on = false; }
    }
    // น้ำพุ: ละอองหยดลงสระ + ไอหมอก
    if (cfg.fountain) {
      const [fx, fyk] = cfg.fountain;
      if (inView(fx, fyk / Kk, 200)) {
        for (const d of C.fdrops) if (!d.on && rnd() < dt * 5) {
          const a = rnd() * TAU, tier = rnd() < 0.55;
          d.on = true; d.x = fx + Math.cos(a) * (tier ? 20 : 34); d.yk = fyk - (tier ? 72 : 48) + Math.sin(a) * (tier ? 6 : 10);
          d.vx = Math.cos(a) * rr(10, 26); d.vy = -rr(10, 40); d.age = 0; d.life = rr(0.5, 0.8);
        }
        for (const m of C.mist) if (!m.on && rnd() < dt * 0.8) { const a = rnd() * TAU; m.on = true; m.x = fx + Math.cos(a) * rr(30, 60); m.yk = fyk - rr(8, 40) + Math.sin(a) * 16; m.age = 0; m.life = rr(2.5, 4); }
      }
      for (const d of C.fdrops) if (d.on) { d.age += dt; d.x += d.vx * dt; d.yk += d.vy * dt; d.vy += 240 * dt; if (d.age > d.life) d.on = false; }
      for (const m of C.mist) if (m.on) { m.age += dt; m.x += A.wind * 0.3 * dt; m.yk -= 4 * dt; if (m.age > m.life) m.on = false; }
    }
    if (cfg.bifrost) {
      const [bx, byk] = cfg.bifrost;
      for (const q of C.bif) {
        if (!q.on) { if (rnd() < dt * 2) { const a = rnd() * TAU; q.on = true; q.x = bx + Math.cos(a) * rr(20, 80); q.yk = byk + Math.sin(a) * rr(8, 30); q.age = 0; q.life = rr(1.6, 3); q.c = (Math.random() * 6) | 0; q.ph = rnd() * 6; } continue; }
        q.age += dt; q.yk -= 18 * dt; q.x += Math.sin(q.age * 3 + q.ph) * 8 * dt;
        if (q.age > q.life) q.on = false;
      }
    }
    // กลีบดอกลอยในคลอง (ไหลไปตะวันออก)
    if (C.petals.length && A.map.canalY) {
      const cy = A.map.canalY;
      for (const q of C.petals) {
        if (!q.on) {
          const x = rr(A.vx0, A.vx1), y = (cy[0] + rr(0.2, 1.8)) * TILE;
          if (inView(x, y, 0) && isWater(x, y)) { q.on = true; q.x = x; q.y = y; q.ph = rnd() * 9; q.c = LEAF.petal[(Math.random() * 3) | 0]; q.a = 0; }
          continue;
        }
        q.ph += dt; q.a = Math.min(1, q.a + dt); q.x += 9 * dt; q.y += Math.sin(q.ph * 0.7) * 2 * dt;
        if (!isWater(q.x + 4, q.y) || !inView(q.x, q.y, 60)) q.on = false;
        if (rnd() < dt * 0.15) ripple(q.x, q.y, 7, 1, 0.35);
      }
    }
    // ผีเสื้อกลางคืนวนรอบแหล่งแสง (Wolfwood)
    for (const m of C.moths) {
      if (!m.on || !inView(m.lx, m.ly, 30)) {
        m.on = false;
        if (C.vLights.length) {
          const o = C.vLights[(Math.random() * C.vLights.length) | 0];
          m.on = true; m.lx = o.x * TILE; m.ly = o.y * TILE; m.lh = o.kind === 'lamp' ? 58 : 18; m.a = rnd() * TAU; m.r = rr(8, 16); m.sp = rr(2.5, 4.5) * (rnd() < 0.5 ? 1 : -1); m.ph = rnd() * 9; break;
        }
        continue;
      }
      m.ph += dt; m.a += m.sp * dt * (0.6 + Math.abs(Math.sin(m.ph * 1.7)));
      if (rnd() < dt * 0.6) m.sp = -m.sp;
    }
    // ตานกฮูกบนยอดไม้ (กะพริบ, ย้ายที่เป็นครั้งคราว)
    for (const o of C.owls) {
      if (!o.on || !inView(o.x, o.y, 0)) {
        o.on = false;
        const s = spotInView((x, y) => tileAt(x, y) === T.TREE && plDist(x, y) > 4 * TILE, 8, 40);
        if (s) { o.on = true; o.x = s[0]; o.y = s[1]; o.z = rr(50, 85); o.blink = rr(2, 5); o.tm = rr(12, 25); o.a = 0; }
        continue;
      }
      o.a = Math.min(1, o.a + dt * 0.5); o.blink -= dt; o.tm -= dt;
      if (o.blink < -0.16) o.blink = rr(2, 6);
      if (o.tm <= 0 || plDist(o.x, o.y) < 2.5 * TILE) o.on = false;
    }
    // ถ้ำ: น้ำหยด
    if (cfg.drips) {
      C.dripT -= dt;
      if (C.dripT <= 0) {
        C.dripT = rr(0.35, 0.9) * (A.rm ? 2 : 1);
        const s = spotInView((x, y) => walk(x, y) && plDist(x, y) < 6.5 * TILE, 6, 20);
        if (s) for (const d of C.drips) if (!d.on) { d.on = true; d.x = s[0]; d.y = s[1]; d.z = rr(90, 140); d.vz = 0; break; }
      }
      for (const d of C.drips) if (d.on) {
        d.vz += 520 * dt; d.z -= d.vz * dt;
        if (d.z <= 0) { d.on = false; ripple(d.x, d.y, rr(8, 12), 0.8, 0.65); splash(d.x, d.y, cfg.drips, 2); }
      }
    }
    // ถ้ำ: ประกายบนคริสตัล
    if (cfg.glints && C.crystals.length) {
      C.glintT -= dt;
      if (C.glintT <= 0) {
        C.glintT = rr(0.12, 0.35) * (A.rm ? 2.5 : 1);
        if (C.vCrys.length) {
          const o = C.vCrys[(Math.random() * C.vCrys.length) | 0];
          for (const q of C.glints) if (!q.on) { q.on = true; q.x = o.x * TILE + rr(-9, 9) * (o.s || 1); q.yk = o.y * TILE * Kk - rr(12, 34) * (o.s || 1); q.age = 0; q.life = rr(0.45, 0.8); q.s = rr(0.6, 1.1); break; }
        }
      }
      for (const q of C.glints) if (q.on && (q.age += dt) > q.life) q.on = false;
    }
    // ถ้ำ: ฝุ่นในลำแสง (ปากถ้ำ/แสงแดดที่ลอดลงมา)
    if (C.motes.length) {
      const L = A.map.extraLights || [];
      for (const q of C.motes) {
        if (!q.on) {
          if (!L.length || rnd() > dt * 3) continue;
          const l = L[(Math.random() * L.length) | 0], cx = l.x * TILE, cy = l.y * TILE;
          if (!inView(cx, cy, 60)) continue;
          const a = rnd() * TAU, r = Math.sqrt(rnd()) * l.lr * TILE * 0.42;
          q.on = true; q.x = cx + Math.cos(a) * r; q.y = cy + Math.sin(a) * r; q.z = rr(4, 70); q.age = 0; q.life = rr(3, 6); q.ph = rnd() * 9; q.s = rr(0.5, 1);
          continue;
        }
        q.age += dt; q.ph += dt; q.x += (3 + Math.sin(q.ph * 0.7) * 4) * dt; q.z += Math.sin(q.ph * 0.5) * 3 * dt;
        if (q.age > q.life) q.on = false;
      }
    }
    // Archive: อักษรรูนลอยขึ้นกะพริบ
    for (const q of C.glyphs) {
      if (!q.on) {
        if (rnd() > dt * 0.8) continue;
        const s = spotInView((x, y) => walk(x, y) && plDist(x, y) < 7 * TILE && plDist(x, y) > 1.5 * TILE, 5, 30);
        if (s) { q.on = true; q.x = s[0]; q.y = s[1]; q.z = rr(10, 30); q.age = 0; q.life = rr(2.5, 4); q.i = (Math.random() * 24) | 0; q.ph = rnd() * 9; }
        continue;
      }
      q.age += dt; q.z += 9 * dt; q.x += Math.sin(q.age * 1.3 + q.ph) * 4 * dt;
      if (q.age > q.life) q.on = false;
    }
    // Roots: เศษดินร่วงจากเพดานราก
    for (const q of C.crumbs) {
      if (!q.on) {
        if (rnd() > dt * 0.9) continue;
        const s = spotInView((x, y) => walk(x, y) && plDist(x, y) < 6 * TILE, 4, 20);
        if (s) { q.on = true; q.x = s[0]; q.y = s[1]; q.z = rr(100, 150); q.vz = 0; q.n = 2 + ((rnd() * 3) | 0); }
        continue;
      }
      q.vz += 300 * dt; q.z -= q.vz * dt;
      if (q.z <= 0) { q.on = false; for (const s of C.steps) if (!s.on) { s.on = true; s.x = q.x; s.y = q.y; s.age = 0.15; s.kind = 1; s.r = rnd(); break; } }
    }
    // Abyss: เถ้าปลิว + ถ่านไฟ (พิกัดจอ เหมือนอนุภาคบรรยากาศเดิม) + ฟองพิษ
    const W = R.W, H = R.H;
    for (const q of C.ash) {
      if (!q.on) { q.on = true; q.x = rnd() * W; q.y = rnd() * H * (q.init ? 0 : 1) - 10; q.init = true; q.vy = rr(14, 30); q.ph = rnd() * 9; q.s = rr(0.7, 1.4); continue; }
      q.ph += dt; q.y += q.vy * dt; q.x += (A.wind * 0.8 + Math.sin(q.ph * 1.4) * 14) * dt;
      if (q.y > H + 10 || q.x > W + 20) { q.on = false; q.init = true; }
    }
    for (const q of C.embers) {
      if (!q.on) { q.on = true; q.x = rnd() * W; q.y = q.init ? H + 10 : rnd() * H; q.init = true; q.vy = rr(18, 36); q.ph = rnd() * 9; q.s = rr(0.6, 1.1); continue; }
      q.ph += dt; q.y -= q.vy * dt; q.x += Math.sin(q.ph * 1.8) * 16 * dt;
      if (q.y < -10) q.on = false;
    }
    for (const q of C.bubbles) {
      if (!q.on) {
        if (rnd() > dt * 0.8) continue;
        const s = spotInView((x, y) => walk(x, y) && plDist(x, y) < 6 * TILE && plDist(x, y) > TILE, 4, 20);
        if (s) { q.on = true; q.x = s[0]; q.y = s[1]; q.age = 0; q.life = rr(0.9, 1.6); }
        continue;
      }
      if ((q.age += dt) > q.life) { q.on = false; ripple(q.x, q.y, 10, 0.6, 0.6); splash(q.x, q.y, '150,230,120', 2); }
    }
    // ลานประลอง: ลมหมุนทราย
    if (cfg.devil && !A.rm) {
      const D = C.devil;
      if (!D.on) {
        D.t -= dt;
        if (D.t <= 0) { D.t = rr(16, 30); const s = spotInView(walk, 6, 60); if (s) { D.on = true; D.x = s[0]; D.y = s[1]; D.age = 0; D.life = rr(4, 6); D.vx = rr(-30, 30); D.vy = rr(-16, 16); } }
      } else { D.age += dt; D.x += D.vx * dt; D.y += D.vy * dt; if (D.age > D.life) D.on = false; }
    }
  }
  function emitSmoke(x, yk, sc, col) {
    for (const s of C.smoke) if (!s.on) { s.on = true; s.x = x; s.yk = yk; s.age = 0; s.life = rr(2.2, 3.4); s.sc = sc; s.vx = rr(-3, 3); s.vy = rr(16, 24) * Math.max(0.7, sc); s.col = col; s.r = rnd(); return; }
  }
  const RGB = {}; // สตริงสีที่สร้างแล้ว (ไม่สร้างใหม่ทุกเฟรม)
  function splash(x, y, col, n) {
    for (let i = 0, k = 0; i < C.drops.length && k < n; i++) {
      const d = C.drops[i]; if (d.on) continue;
      d.on = true; d.x = x; d.y = y; d.z = 1; d.vx = rr(-30, 30); d.vz = rr(40, 70); d.age = 0; d.col = RGB[col] || (RGB[col] = `rgba(${col},0.85)`); k++;
    }
  }

  // ---------- ชั้นพื้น (ctx บีบแกนตั้ง K: วาดที่พิกัดโลกตรง ๆ) ----------
  function drawGround(g) {
    const t = A.t;
    // ฝุ่น/เศษหญ้ารอยเท้า
    for (const s of C.steps) if (s.on) {
      const k = s.age / 0.6, col = s.kind === 1 ? '150,140,155' : s.kind === 2 ? '220,190,140' : s.kind === 3 ? '185,155,110' : '170,175,120';
      const r = 4 + k * 9;
      g.globalAlpha = (s.kind === 4 ? 0.22 : 0.38) * (1 - k); g.drawImage(soft(col), s.x - r, s.y - r * 0.8, r * 2, r * 1.6);
      if (s.kind === 4) {
        g.globalAlpha = 1 - k; g.fillStyle = s.r < 0.5 ? '#7fae3a' : '#a8c454';
        const h = Math.sin(Math.min(1, k * 1.6) * Math.PI) * 9;
        g.fillRect(s.x - 5 - k * 6, s.y - h, 1.6, 1.6); g.fillRect(s.x + 3 + k * 7, s.y - h * 0.8, 1.6, 1.6); g.fillRect(s.x - 1, s.y - h * 1.2, 1.4, 1.4);
      }
    }
    g.globalAlpha = 1;
    // วงน้ำกระเพื่อม
    let any = false;
    for (const q of C.ripples) if (q.on) { any = true; break; }
    if (any) {
      g.lineWidth = 1.1; g.strokeStyle = 'rgb(235,248,255)';
      for (const q of C.ripples) if (q.on) {
        const k = q.age / q.life, r = 2 + q.r1 * k;
        if (!inView(q.x, q.y, 20)) continue;
        g.globalAlpha = q.a * (1 - k);
        g.beginPath(); g.arc(q.x, q.y, r, 0, TAU); g.stroke();
        if (k < 0.6 && q.r1 > 9) { g.beginPath(); g.arc(q.x, q.y, r * 0.55, 0, TAU); g.stroke(); }
      }
      g.globalAlpha = 1;
    }
    // เงาบนพื้น: ผีเสื้อ นกที่บินผ่าน นกวนเหนือลาน
    const sh = soft('0,0,0');
    g.globalAlpha = 0.13;
    for (const o of C.over) if (o.on && C.overKind === 'bird' && inView(o.x, o.y, 30)) g.drawImage(sh, o.x - 9 + o.z * 0.25, o.y - 4 + o.z * 0.15, 18, 8);
    if (C.circ.length && A.map.arena) {
      const ax = A.map.arena.cx * TILE, ay = A.map.arena.cy * TILE;
      for (const c of C.circ) { const x = ax + Math.cos(c.a) * c.r, y = ay + Math.sin(c.a) * c.r * 0.6; if (inView(x, y, 30)) g.drawImage(sh, x - 9 + c.z * 0.25, y - 4 + c.z * 0.15, 18, 8); }
    }
    for (const fl of C.flocks) if (fl.st === 'flee' || fl.st === 'land') for (const b of fl.b) if (b.z > 3 && inView(b.x, b.y, 10)) { g.globalAlpha = Math.max(0, 0.25 - b.z * 0.002); g.drawImage(sh, b.x - 4, b.y - 1.6, 8, 3.2); }
    g.globalAlpha = 1;
    // คลื่นท้ายเป็ด
    if (C.ducks) {
      g.strokeStyle = 'rgba(235,248,255,0.32)'; g.lineWidth = 1;
      for (const d of C.ducks.list) {
        if (!inView(d.x, d.y, 30)) continue;
        const s = d.fl ? -1 : 1, L = d.i ? 9 : 15;
        g.beginPath(); g.moveTo(d.x - s * 3, d.y + 1); g.lineTo(d.x + s * L, d.y - L * 0.32); g.moveTo(d.x - s * 3, d.y + 2); g.lineTo(d.x + s * L, d.y + 2 + L * 0.32); g.stroke();
      }
    }
    // ใบไม้/กลีบดอกที่ตกถึงพื้นหรือลอยน้ำ
    for (const q of C.petals) if (q.on) { g.globalAlpha = q.a * 0.95; g.drawImage(leaf(q.c, ((q.ph * 0.6) | 0) & 7), q.x - 3, q.y - 3, 6, 6); }
    for (const l of C.leaves) if (l.on && l.z <= 0 && inView(l.x, l.y, 10)) { g.globalAlpha = Math.min(1, (2.2 - l.rest) / 0.8); g.drawImage(leaf(l.col, ((l.ph * 0.5) | 0) & 7), l.x - 5.5, l.y - 5.5, 11, 11); }
    g.globalAlpha = 1;
    // ฟองพิษ (Abyss)
    for (const q of C.bubbles) if (q.on) {
      const k = q.age / q.life, r = 1.5 + k * 4.5;
      g.globalAlpha = 0.35 + k * 0.3; g.fillStyle = 'rgb(120,200,90)'; g.beginPath(); g.arc(q.x, q.y, r, 0, TAU); g.fill(); g.globalAlpha = 1;
      g.fillStyle = 'rgba(220,255,200,0.7)'; g.fillRect(q.x - r * 0.45, q.y - r * 0.55, 1.4, 1.4);
    }
    // ลมหมุนทราย
    const D = C.devil;
    if (D.on && inView(D.x, D.y, 60)) {
      const k = D.age / D.life, a = Math.sin(k * Math.PI);
      g.globalAlpha = 0.25 * a; g.drawImage(soft('225,195,145'), D.x - 22, D.y - 14, 44, 28);
      g.fillStyle = 'rgba(205,170,115,0.85)';
      for (let i = 0; i < 12; i++) {
        const an = t * 7 + i * 0.52, r = 4 + i * 1.6;
        g.globalAlpha = a * 0.8; g.fillRect(D.x + Math.cos(an) * r, D.y + Math.sin(an) * r * 0.5 - i * 0.5, 1.6, 1.6);
      }
      g.globalAlpha = 1;
    }
  }

  // ---------- ชั้นอากาศ (หลังตัวละคร, พิกัดโลก: y จอ = y·K − ความสูง) ----------
  function drawAir(g) {
    const Kk = R.K, t = A.t;
    // ผีเสื้อ
    for (const b of C.bf) if (b.on && inView(b.x, b.y, 20)) {
      const s = 0.25 + 0.75 * Math.abs(Math.sin(b.ph * 13 + b.col));
      g.globalAlpha = b.a; g.drawImage(bfly(b.col), b.x - 7 * s, b.y * Kk - b.z - 6, 14 * s, 11.5);
    }
    g.globalAlpha = 1;
    // แมลงปอ (หมุนตามทิศ)
    for (const f of C.df) if (f.on && inView(f.x, f.y, 20)) {
      const ang = Math.atan2(Math.sin(f.h) * Kk, Math.cos(f.h)), rot = (Math.round(ang / TAU * 16) + 16) & 15;
      g.globalAlpha = f.a; g.drawImage(dfly(f.col, ((f.ph * 30) | 0) & 1, rot), f.x - 8, f.y * Kk - f.z - 8, 16, 16);
    }
    // นกที่บินขึ้น/บินลง
    for (const fl of C.flocks) if (fl.st === 'flee' || fl.st === 'land') for (const b of fl.b) if (inView(b.x, b.y, 30)) {
      if (fl.st === 'flee') g.globalAlpha = Math.min(1, fl.tm / 0.8);
      drawAirBird(fl, b, Kk);
    }
    g.globalAlpha = 1;
    // ใบไม้ร่วง
    for (const l of C.leaves) if (l.on && l.z > 0 && inView(l.x, l.y, 20)) {
      const sq = 0.35 + 0.65 * Math.abs(Math.cos(l.ph * 2.6));
      g.drawImage(leaf(l.col, ((l.ph * 3) | 0) & 7), l.x - 5.5 * sq, l.y * Kk - l.z - 5.5, 11 * sq, 11);
    }
    g.globalAlpha = 1;
    // ปลากระโดด
    const F = C.fish;
    if (F.on) {
      const k = F.k, x = F.x0 + (F.x1 - F.x0) * k, y = (F.y0 + (F.y1 - F.y0) * k) * Kk - Math.sin(k * Math.PI) * 24;
      const dir = F.x1 > F.x0 ? 1 : -1, ang = Math.atan2(-Math.cos(k * Math.PI) * 24 * Math.PI, Math.abs(F.x1 - F.x0)) * dir;
      g.save(); g.translate(x, y); g.scale(dir, 1); g.rotate(ang * dir); g.drawImage(fish(), -5, -3, 10, 6); g.restore();
    }
    // หยดน้ำกระเด็น
    for (const d of C.drops) if (d.on) { g.fillStyle = d.col; g.fillRect(d.x - 0.8, d.y * Kk - d.z - 0.8, 1.6, 1.6); }
    // ควัน
    for (const s of C.smoke) if (s.on) {
      const k = s.age / s.life, r = (4 + 13 * k) * s.sc;
      g.globalAlpha = (k < 0.15 ? k / 0.15 : 1) * (1 - k) * 0.45;
      g.drawImage(soft(s.col), s.x - r, s.yk - r, r * 2, r * 2);
    }
    g.globalAlpha = 1;
    // น้ำพุ: ไอหมอก + หยดน้ำ
    for (const m of C.mist) if (m.on) { const k = m.age / m.life; g.globalAlpha = Math.sin(k * Math.PI) * 0.22; g.drawImage(soft('240,250,255'), m.x - 22, m.yk - 12, 44, 24); }
    g.globalAlpha = 1;
    if (C.fdrops.length) { g.fillStyle = 'rgba(230,250,255,0.9)'; for (const d of C.fdrops) if (d.on) g.fillRect(d.x - 0.9, d.yk - 1.4, 1.8, 2.8); }
    // หยดน้ำ/เศษดินจากเพดาน (ถ้ำ)
    if (A.cfg.drips) for (const d of C.drips) if (d.on) {
      g.strokeStyle = A.dripCol; g.lineWidth = 1.3;
      const y = d.y * Kk - d.z; g.beginPath(); g.moveTo(d.x, y - Math.min(10, d.vz * 0.03)); g.lineTo(d.x, y); g.stroke();
    }
    if (C.crumbs.length) { g.fillStyle = 'rgba(120,80,50,0.9)'; for (const q of C.crumbs) if (q.on) for (let i = 0; i < q.n; i++) g.fillRect(q.x + (i - 1) * 3, q.y * Kk - q.z - i * 5, 1.6, 1.6); }
    // ฝูงนกบินผ่าน (สูง) + นกวนเหนือลานประลอง
    if (C.overKind === 'bird') for (const o of C.over) if (o.on && inView(o.x, o.y, 60)) {
      const fr = (((o.ph * 7) | 0) % 4), f = fr === 3 ? 1 : fr;
      g.drawImage(flyer('bird', f), o.x - 13, o.y * Kk - o.z - 8, 26, 15.6);
    }
    if (C.circ.length && A.map.arena) {
      const ax = A.map.arena.cx * TILE, ay = A.map.arena.cy * TILE;
      for (const c of C.circ) {
        const x = ax + Math.cos(c.a) * c.r, y = ay + Math.sin(c.a) * c.r * 0.6;
        if (!inView(x, y, 60)) continue;
        const glide = Math.sin(c.ph * 0.7 + c.r) > -0.2, f = glide ? 1 : (((c.ph * 7) | 0) % 3);
        g.drawImage(flyer('bird', f), x - 14, y * Kk - c.z - 8.5, 28, 17);
      }
    }
  }

  // ---------- ชั้นเรืองแสง (หลังความมืด, พิกัดจอ) ----------
  const RB = ['255,120,140', '255,190,100', '255,240,130', '130,255,170', '120,200,255', '200,140,255'];
  const SX = x => (x - R.camX) * R.zoom, SY = yk => (yk - R.camY) * R.zoom; // โลก (y บีบแล้ว) → จอ
  function drawGlow(g) {
    const Kk = R.K, z = R.zoom, flick = !A.rm;
    g.globalCompositeOperation = 'lighter';
    // ประกายไฟเตาหลอม
    for (const s of C.sparks) if (s.on) { const k = s.age / s.life, r = 3 * z; g.globalAlpha = 1 - k; g.drawImage(glow('255,150,60'), SX(s.x) - r, SY(s.yk) - r, r * 2, r * 2); }
    // ประกายน้ำพุ (หยดที่สะท้อนแดด)
    if (C.fdrops.length) for (let i = 0; i < C.fdrops.length; i += 3) {
      const d = C.fdrops[i]; if (!d.on) continue;
      const r = 4 * z * Math.sin(d.age / d.life * Math.PI); g.globalAlpha = 0.7; g.drawImage(star('190,240,255'), SX(d.x) - r, SY(d.yk) - r, r * 2, r * 2);
    }
    // ประกายคริสตัล
    if (A.cfg.glints) {
      const img = star(A.cfg.glints);
      for (const q of C.glints) if (q.on) {
        const k = q.age / q.life, r = 9 * z * q.s * Math.sin(k * Math.PI);
        g.globalAlpha = 0.9; g.drawImage(img, SX(q.x) - r, SY(q.yk) - r, r * 2, r * 2);
      }
    }
    // ฝุ่นในลำแสง
    if (C.motes.length) {
      const img = glow('255,236,180');
      for (const q of C.motes) if (q.on) {
        const k = q.age / q.life, r = 2.6 * z * q.s;
        g.globalAlpha = Math.sin(k * Math.PI) * (0.45 + 0.25 * Math.sin(q.ph * 2)); g.drawImage(img, SX(q.x) - r, SY(q.y * Kk - q.z) - r, r * 2, r * 2);
      }
    }
    // อักษรรูน
    for (const q of C.glyphs) if (q.on) {
      const k = q.age / q.life, fl = flick ? (Math.sin(q.age * 23 + q.ph) > -0.6 ? 1 : 0.35) : 1;
      const w = 15 * z, h = 17.5 * z;
      g.globalAlpha = Math.sin(k * Math.PI) * 0.75 * fl; g.drawImage(glyph(q.i), SX(q.x) - w / 2, SY(q.y * Kk - q.z) - h / 2, w, h);
    }
    // ผีเสื้อกลางคืน: รัศมีเรืองจาง ๆ
    if (C.moths.length) {
      const img = glow('255,240,190');
      g.globalAlpha = 0.5;
      for (const m of C.moths) if (m.on) { const x = m.lx + Math.cos(m.a) * m.r, yk = m.ly * Kk - m.lh + Math.sin(m.a * 1.3) * m.r * 0.6, r = 8 * z; g.drawImage(img, SX(x) - r, SY(yk) - r, r * 2, r * 2); }
    }
    // ตานกฮูก
    if (C.owls.length) {
      const img = glow('255,200,80');
      for (const o of C.owls) if (o.on && o.blink > 0) {
        const x = SX(o.x), y = SY(o.y * Kk - o.z), r = 2.4 * z;
        g.globalAlpha = o.a * 0.9; g.drawImage(img, x - 3 * z - r, y - r, r * 2, r * 2); g.drawImage(img, x + 3 * z - r, y - r, r * 2, r * 2);
      }
    }
    // ถ่านไฟลอย (Abyss)
    if (C.embers.length) {
      const img = glow('255,140,60');
      for (const q of C.embers) if (q.on) { const r = 3.2 * q.s * (R.zoom / 1.5); g.globalAlpha = 0.5 + 0.4 * Math.sin(q.ph * 3); g.drawImage(img, q.x - r, q.y - r, r * 2, r * 2); }
    }
    g.globalCompositeOperation = 'source-over';
    // ประกายรุ้ง Bifrost (บนหินอ่อนสว่าง: วาดทับแบบปกติ ไม่ใช่บวกแสง ไม่งั้นกลืนเป็นสีขาว)
    for (const q of C.bif) if (q.on) {
      const k = q.age / q.life, r = 6 * z * (0.6 + 0.4 * Math.sin(k * Math.PI));
      g.globalAlpha = Math.sin(k * Math.PI) * 0.9; g.drawImage(star(RB[q.c]), SX(q.x) - r, SY(q.yk) - r, r * 2, r * 2);
    }
    // ผีเสื้อกลางคืน (ตัว)
    for (const m of C.moths) if (m.on) {
      const x = SX(m.lx + Math.cos(m.a) * m.r), y = SY(m.ly * Kk - m.lh + Math.sin(m.a * 1.3) * m.r * 0.6), s = (0.3 + 0.7 * Math.abs(Math.sin(m.ph * 16))) * z;
      g.globalAlpha = 0.95; g.drawImage(bfly(0, 1), x - 5 * s, y - 4 * z, 10 * s, 8 * z);
    }
    // เถ้าปลิว
    if (C.ash.length) {
      g.fillStyle = 'rgba(205,200,190,1)';
      for (const q of C.ash) if (q.on) { g.globalAlpha = 0.5 + 0.25 * Math.sin(q.ph * 2.3); const w = 4 * q.s * Math.abs(Math.cos(q.ph * 2)) + 1; g.fillRect(q.x, q.y, w, 2.8 * q.s); }
    }
    // ค้างคาวบินผ่าน (เงาดำมีขอบม่วง — เห็นในที่มืด)
    if (C.overKind === 'bat') for (const o of C.over) if (o.on && inView(o.x, o.y, 60)) {
      const f = ((o.ph * 14) | 0) % 3, w = 26 * z, h = 15.6 * z;
      g.globalAlpha = 0.95; g.drawImage(flyer('bat', f), SX(o.x) - w / 2, SY(o.y * Kk - o.z) - h / 2, w, h);
    }
    g.globalAlpha = 1;
  }

  // ---------- จุดเกี่ยวจาก js/render.js ----------
  return {
    get off() { return A.off; }, set off(v) { A.off = !!v; },
    // ชั้นพื้น: เรียกครั้งแรกของเฟรม (อัปเดตทุกอย่างที่นี่)
    ground(g, map, t) {
      A.on = false;
      if (A.off || G.fastSim || !map) return;
      if (A.map !== map || A.low !== (R.quality === 'low')) { setup(map); if (A.cfg.citizens) setupCitizens(A.cfg.citizens); }
      else if (A.cfg.citizens && !C.cits.length && !A.citTry) { A.citTry = 1; setTimeout(() => { A.citTry = 0; }, 2000); if (A.map === map) setupCitizens(A.cfg.citizens); }
      A.on = true; A.g = g;
      A.dt = Math.min(0.1, Math.max(0, t - A.last)); A.last = t; A.t = t;
      view(); update(A.dt);
      if (!A.low) drawGround(g);
    },
    // รายการเรียงความลึก (ชาวเมือง นกบนพื้น เป็ด)
    collect(list, g, map) {
      if (!A.on || A.map !== map) return;
      A.g = g;
      for (const c of C.cits) if (inView(c.x * TILE, c.y * TILE, 60)) { c.item.y = c.y; list.push(c.item); }
      if (A.low) return;
      for (const fl of C.flocks) if (fl.st === 'ground') for (const b of fl.b) if (inView(b.x, b.y, 20)) { b.item.y = b.y / TILE; list.push(b.item); }
      if (C.ducks) for (const d of C.ducks.list) if (inView(d.x, d.y, 20)) { d.item.y = d.y / TILE; list.push(d.item); }
    },
    air(g, map) { if (!A.on || A.low || A.map !== map) return; A.g = g; g.save(); drawAir(g); g.restore(); },
    glow(g, map) { if (!A.on || A.low || A.map !== map) return; g.save(); drawGlow(g); g.restore(); },
    _dbg: () => ({ A, C }), // ดีบัก/วัดผล (tests)
    // สถิติ (ทดสอบ/ดีบัก): จำนวนสิ่งที่ทำงานอยู่
    stats() {
      if (!C) return {};
      const n = a => a.filter(q => q.on).length;
      return { map: A.map && A.map.id, cits: C.cits.length, bf: n(C.bf), df: n(C.df), flocks: C.flocks.map(f => f.st), over: n(C.over), leaves: n(C.leaves), ripples: n(C.ripples),
        smoke: n(C.smoke), drips: n(C.drips), glints: n(C.glints), motes: n(C.motes), glyphs: n(C.glyphs), ash: n(C.ash), moths: n(C.moths), owls: n(C.owls), ducks: C.ducks ? C.ducks.list.length : 0 };
    },
  };
})();
