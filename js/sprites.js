'use strict';
// ============================================================
//  การวาดตัวละคร มอนสเตอร์ NPC ต้นไม้ เอฟเฟกต์ และไอคอนไอเทม
//  (วาดด้วยโค้ดทั้งหมด ไม่ใช้ไฟล์รูป)
// ============================================================

const Sprites = {};

Sprites.shadow = (g, x, y, rx, ry = rx * 0.4, a = 0.28) => {
  g.fillStyle = `rgba(0,0,0,${a})`;
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
};

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
}

// ------------------------------------------------------------
//  อาวุธในมือ (พิกัดโลคัล: มือที่ (0,0) ชี้ขึ้น)
// ------------------------------------------------------------
function drawWeaponShape(g, wtype, glow = '#7ad8ff') {
  const edge = (fn, w = 1.4) => { g.save(); g.shadowColor = glow; g.shadowBlur = 5; g.strokeStyle = glow; g.lineWidth = w; fn(); g.stroke(); g.restore(); };
  switch (wtype) {
    case 'sword':
      g.fillStyle = '#2a2e38'; g.fillRect(-1.6, -2, 3.2, 7);
      g.fillStyle = '#8a92a4'; g.fillRect(-5, -4.5, 10, 3);
      g.fillStyle = '#dfe6f2'; g.beginPath(); g.moveTo(-2.6, -4.5); g.lineTo(2.6, -4.5); g.lineTo(1.6, -26); g.lineTo(0, -30); g.lineTo(-1.6, -26); g.closePath(); g.fill();
      edge(() => { g.beginPath(); g.moveTo(1.9, -6); g.lineTo(1.2, -26); g.lineTo(0, -29); }, 1.3);
      break;
    case 'dagger':
      g.fillStyle = '#2a2e38'; g.fillRect(-1.5, -1, 3, 6);
      g.fillStyle = '#8a92a4'; g.fillRect(-4, -3, 8, 2);
      g.fillStyle = '#dfe6f2'; g.beginPath(); g.moveTo(-2, -3); g.lineTo(2, -3); g.lineTo(0, -16); g.closePath(); g.fill();
      edge(() => { g.beginPath(); g.moveTo(1.6, -3.5); g.lineTo(0, -15.5); }, 1.1);
      break;
    case 'rod':
      g.fillStyle = '#3a4050'; g.fillRect(-1.5, -24, 3, 30);
      g.fillStyle = '#8a92a4'; g.fillRect(-3, -25, 6, 3); g.fillRect(-2.2, -8, 4.4, 2);
      g.save(); g.shadowColor = glow; g.shadowBlur = 10; g.fillStyle = glow; g.beginPath(); g.arc(0, -29, 4, 0, 7); g.fill(); g.restore();
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(-1, -30, 1.4, 0, 7); g.fill();
      break;
    case 'mace':
      g.fillStyle = '#3a4050'; g.fillRect(-1.5, -16, 3, 21);
      g.fillStyle = '#9aa2b4'; rr(g, -5.5, -24, 11, 9, 2); g.fill();
      edge(() => { g.beginPath(); g.moveTo(-5.5, -19.5); g.lineTo(5.5, -19.5); }, 1.5);
      break;
    case 'axe':
      g.fillStyle = '#3a4050'; g.fillRect(-1.5, -22, 3, 27);
      g.fillStyle = '#c8ccd8'; g.beginPath(); g.moveTo(1, -22); g.quadraticCurveTo(12, -24, 11, -13); g.quadraticCurveTo(6, -15, 1, -12); g.closePath(); g.fill();
      edge(() => { g.beginPath(); g.moveTo(10, -22); g.quadraticCurveTo(12.5, -18, 10.8, -13.5); }, 1.5);
      break;
    case 'bow':
      g.strokeStyle = '#8a92a4'; g.lineWidth = 2.5;
      g.beginPath(); g.arc(-8, 0, 16, -1.1, 1.1); g.stroke();
      edge(() => { g.beginPath(); g.moveTo(-8 + Math.cos(-1.1) * 16, Math.sin(-1.1) * 16); g.lineTo(-8 + Math.cos(1.1) * 16, Math.sin(1.1) * 16); }, 1);
      break;
  }
}

// ------------------------------------------------------------
//  มนุษย์ตัวจิ๋ว (ผู้เล่น / NPC / มอนสเตอร์ร่างคน)
//  o: {facing, t, moving, sit, atk(0..1), skin, hair, hairStyle, outfit, outfit2, pants, weapon, hat, scale, extras}
// ------------------------------------------------------------
// ------------------------------------------------------------
//  ทิศ 8 ทาง: 0=E 1=SE 2=S 3=SW 4=W 5=NW 6=N 7=NE
// ------------------------------------------------------------
const DIR_VIEW = [
  { v: 'side', m: 1 }, { v: 'f34', m: 1 }, { v: 'front', m: 1 }, { v: 'f34', m: -1 },
  { v: 'side', m: -1 }, { v: 'b34', m: -1 }, { v: 'back', m: 1 }, { v: 'b34', m: 1 },
];
function dirFromVec(dx, dy) {
  return ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
}
function dirOf(o) {
  if (o.dir != null) return o.dir;
  return (o.facing || 1) > 0 ? 1 : 3;
}

// ------------------------------------------------------------
//  มนุษย์ตัวจิ๋ว 8 ทิศ (ผู้เล่น / NPC / มอนสเตอร์ร่างคน)
//  o: {dir|facing, t, moving, sit, dead, atk, skin, hair, hairStyle, outfit, outfit2, pants, wtype, hat, cape, robe, ...}
// ------------------------------------------------------------
Sprites.human = (g, x, y, o) => {
  const s = o.scale || 1;
  const D = DIR_VIEW[dirOf(o)], view = D.v;
  const back = view === 'back' || view === 'b34', front = view === 'front', side = view === 'side';
  g.save();
  g.translate(x, y);
  g.scale(D.m * s, s);
  const t = o.t || 0;
  const walk = o.moving && !o.hover ? Math.sin(t * 14) : 0;
  const bob = o.moving && !o.hover ? Math.abs(Math.sin(t * 14)) * 1.4 : Math.sin(t * 2) * 0.5;
  const plate = o.outfit || '#6a7a90', trim = o.outfit2 || '#c0c8d4';
  const chassis = o.skin || '#e6e9ef';               // สีโครงโลหะหลัก
  const joint = o.joint || '#2a2e38';                // ข้อต่อ/ส่วนดำ
  const glow = o.glow || '#6ad8ff';                  // ไฟนีออนประจำตัว
  const crest = o.hair;                              // สีแผ่นเกราะหัว (เดิมคือสีผม)
  const OL = 'rgba(16,18,26,0.7)';
  const ol = (w = 1.1) => { g.lineWidth = w; g.strokeStyle = OL; g.stroke(); };
  const metal = (c, x0, y0, x1, y1) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, U.shade(c, 0.22)); gr.addColorStop(0.55, c); gr.addColorStop(1, U.shade(c, -0.25)); return gr; };
  const pulse = 0.65 + Math.sin(t * 3.2) * 0.35;
  const glowFill = (a = 1) => { g.shadowColor = glow; g.shadowBlur = 6; g.fillStyle = glow; g.globalAlpha = a; };
  const glowOff = () => { g.shadowBlur = 0; g.globalAlpha = 1; };
  if (o.dead) { g.rotate(Math.PI / 2); g.translate(-10, -6); }
  if (o.sit) g.translate(0, 7);
  if (o.bulky) g.scale(o.bulky, 1);
  if (o.hover && !o.dead) {
    // ไอพ่นใต้เท้า + ลอยตัว
    g.save(); g.shadowColor = glow; g.shadowBlur = 10; g.fillStyle = glow; g.globalAlpha = 0.55 + Math.sin(t * 22) * 0.2;
    g.beginPath(); g.ellipse(-3.5, -1, 2.5, 4, 0, 0, 7); g.ellipse(3.5, -1, 2.5, 4, 0, 0, 7); g.fill(); g.restore();
    g.translate(0, -7 - Math.sin(t * 3 + (o.seedT || 0)) * 2);
  }
  const hy = -39;
  // ปีก (ด้านหลังลำตัว)
  if (o.wings) {
    const f = o.wings === 'bee' ? Math.sin(t * 40) * 0.25 : Math.sin(t * 3) * 0.12;
    for (const sx of [-1, 1]) {
      g.save(); g.translate(sx * 5, -26); g.rotate(sx * (-0.35 + f));
      if (o.wings === 'bee') {
        g.fillStyle = 'rgba(210,235,255,0.45)'; g.beginPath(); g.ellipse(sx * 11, -4, 11, 5, sx * -0.4, 0, 7); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 0.8; g.stroke();
      } else {
        const n = o.wings === 'angel' ? 5 : 3;
        for (let i = 0; i < n; i++) {
          g.fillStyle = metal(o.wings === 'angel' ? '#f4f2ea' : plate, 0, -14, 0, 4);
          g.beginPath(); g.moveTo(0, 0); g.lineTo(sx * (14 + i * 4), -14 + i * 5); g.lineTo(sx * (11 + i * 4), -9 + i * 5); g.closePath(); g.fill(); ol(0.8);
        }
        glowFill(0.85); g.fillRect(sx > 0 ? 2 : -16, -2, 14, 1); glowOff();
      }
      g.restore();
    }
  }
  const eyesX = front ? [-4.3, 4.3] : side ? [7] : [2.2, 7.6]; // ใช้กับหมวกบางแบบ

  // หางจิ้งจอกกลไก
  if (o.fox) {
    for (let i = 0; i < 3; i++) {
      g.save(); g.translate(back ? 0 : -6, -14); g.rotate((back ? -0.3 : -0.9) - i * 0.35 + Math.sin(t * 3 + i) * 0.12);
      g.fillStyle = metal(i % 2 ? '#e0803a' : '#f0a050', -5, -28, 5, 0);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(-5, -12); g.lineTo(0, -28); g.lineTo(5, -12); g.closePath(); g.fill(); ol(1);
      glowFill(0.9 * pulse); g.fillRect(-0.8, -24, 1.6, 18); glowOff();
      g.restore();
    }
  }
  // ผ้าคลุม / ครีบหลัง
  const drawCape = () => {
    if (!o.cape) return;
    g.fillStyle = back ? o.cape : U.shade(o.cape, -0.15);
    g.beginPath();
    if (back) { g.moveTo(-9, -29); g.lineTo(-12 - walk, -4); g.quadraticCurveTo(0, -1, 12 + walk, -4); g.lineTo(9, -29); }
    else if (side) { g.moveTo(-6, -29); g.lineTo(-14 - walk * 1.5, -5); g.lineTo(2, -7); g.lineTo(3, -29); }
    else { g.moveTo(-9, -28); g.lineTo(-13 - walk, -6); g.lineTo(13 + walk, -6); g.lineTo(9, -28); }
    g.closePath(); g.fill(); ol();
    g.strokeStyle = glow; g.globalAlpha = 0.5; g.lineWidth = 1; g.stroke(); g.globalAlpha = 1;
  };
  // สายเคเบิลยาวด้านหลัง (ทรงผมยาว)
  // ผมยาวด้านหลัง (อนิเมะ): พลิ้วตามการเดิน
  const longHair = crest && (o.hairStyle === 'long' || o.hairStyle === 'twin');
  // "ผม" ของแอนดรอยด์ = แผ่นไฟเบอร์สังเคราะห์ เงาแบบโลหะ
  const hairGrad = (y0, y1) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, U.shade(crest, 0.3)); gr.addColorStop(0.35, U.shade(crest, 0.02)); gr.addColorStop(0.5, U.shade(crest, 0.22)); gr.addColorStop(1, U.shade(crest, -0.3)); return gr; };
  const drawBackHair = () => {
    const sway = Math.sin(t * 2.2) * 1.5 + (o.moving ? Math.sin(t * 7) * 1.5 : 0);
    g.fillStyle = hairGrad(hy - 10, -12);
    g.beginPath();
    if (o.hairStyle === 'twin') {
      for (const sx of [-1, 1]) {
        g.moveTo(sx * 8, hy - 4);
        g.quadraticCurveTo(sx * 17 + sway, hy + 10, sx * 12 + sway, -12);
        g.lineTo(sx * 9 + sway, -14); g.quadraticCurveTo(sx * 12, hy + 8, sx * 5, hy - 2);
      }
    } else {
      g.moveTo(-10.5, hy - 2);
      g.quadraticCurveTo(-15 + sway * 0.5, hy + 14, -11 + sway, -13);
      g.lineTo(-6 + sway, -16); g.lineTo(-3 + sway, -12.5); g.lineTo(0 + sway, -16); g.lineTo(4 + sway, -12.5); g.lineTo(7 + sway, -15.5);
      g.lineTo(11 + sway, -13); g.quadraticCurveTo(15 + sway * 0.5, hy + 14, 10.5, hy - 2); g.closePath();
    }
    g.fill(); ol(1);
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(-6, hy + 2); g.quadraticCurveTo(-8 + sway, hy + 12, -7 + sway, -16); g.stroke();
  };
  if (longHair && !back) drawBackHair();
  if (!back) drawCape();

  // แขน: ต้นแขนโครงโลหะ → ข้อศอก → ปลายแขนเกราะ → มือกลไก
  const atk = o.atk || 0;
  const swing = atk > 0 ? Math.sin(atk * Math.PI) * 1.9 - 0.3 : walk * 0.45;
  const drawArm = (ax, rot, withWeapon, shade) => {
    g.save();
    g.translate(ax, -27);
    g.rotate(withWeapon && o.wtype === 'bow' ? -1.4 : rot);
    g.fillStyle = metal(U.shade(chassis, shade), -2.5, 0, 2.5, 0); rr(g, -2.3, -1, 4.6, 6.5, 2); g.fill(); ol(1);
    g.fillStyle = joint; g.beginPath(); g.arc(0, 6, 2.2, 0, 7); g.fill();
    g.fillStyle = metal(U.shade(plate, shade), -3, 0, 3, 0); rr(g, -2.8, 6.5, 5.6, 6, 2); g.fill(); ol(1);
    glowFill(0.8 * pulse); g.fillRect(-0.6, 7.5, 1.2, 3.8); glowOff();
    g.fillStyle = joint; g.beginPath(); g.arc(0, 13.2, 2.3, 0, 7); g.fill();
    if (withWeapon && o.wtype && o.wtype !== 'none') {
      g.translate(0, 13);
      if (o.wtype === 'bow') { g.rotate(1.4); g.scale(-1, 1); g.translate(-4, 0); }
      else g.rotate(0.6);
      drawWeaponShape(g, o.wtype, glow);
    }
    g.restore();
  };
  if (back) drawArm(9, swing, true, -0.1);
  else if (!front) drawArm(side ? -3 : -9, -walk * 0.4, false, -0.28);

  // ขา
  if (o.sit) {
    g.fillStyle = metal(plate, -10, -10, 10, -4);
    if (side) { rr(g, -6, -10, 17, 6, 2.5); g.fill(); ol(); g.fillStyle = joint; g.fillRect(9, -10, 5, 6); }
    else { g.beginPath(); g.ellipse(0, -7, 12, 4.5, 0, 0, 7); g.fill(); ol(); }
  } else {
    const leg = (lx, lift) => {
      g.fillStyle = metal(chassis, lx, 0, lx + 5, 0); rr(g, lx, -14, 5, 6, 2); g.fill(); ol(1);
      g.fillStyle = joint; g.beginPath(); g.arc(lx + 2.5, -8 - lift * 0.5, 2, 0, 7); g.fill();
      g.fillStyle = metal(plate, lx, 0, lx + 5.5, 0); rr(g, lx - 0.3, -8 - lift * 0.5, 5.6, 6 - lift * 0.5, 1.8); g.fill(); ol(1);
      g.fillStyle = joint; rr(g, lx - (side ? 0 : 0.8), -3.2 - lift, side ? 7.5 : 6.6, 3.4, 1.3); g.fill();
      glowFill(0.7 * pulse); g.fillRect(lx + (side ? 4 : 1.5), -2.5 - lift, side ? 3 : 2.5, 1); glowOff();
    };
    if (side) { leg(-6 + walk * 3, 0); leg(1 - walk * 3, 0); }
    else { leg(-6, Math.max(0, walk) * 2.5); leg(1, Math.max(0, -walk) * 2.5); }
    if (o.robe) {
      // เสื้อคลุมเทค: แผงกระโปรงสองชิ้น ขอบเรืองแสง
      g.fillStyle = metal(plate, -10, 0, 10, 0);
      g.beginPath(); g.moveTo(-8.5, -18); g.lineTo(-11 - (side ? walk : 0), -5); g.lineTo(side ? 4 : 0, -3.5); g.lineTo(11 + (side ? -walk : 0), -5); g.lineTo(8.5, -18); g.closePath(); g.fill(); ol();
      glowFill(0.7); g.fillRect(-10.5, -5.6, 21, 1.2); glowOff();
    }
  }

  g.translate(0, -bob);
  // ลำตัว
  if (o.bones) {
    // โครงเหล็กเปลือย (endoskeleton)
    g.strokeStyle = chassis; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(0, -29); g.lineTo(0, -12);
    for (let i = 0; i < 4; i++) { g.moveTo(-7 + i * 0.5, -27 + i * 3.6); g.quadraticCurveTo(0, -25 + i * 3.6, 7 - i * 0.5, -27 + i * 3.6); }
    g.stroke(); ol(0.5);
    g.fillStyle = joint; g.fillRect(-6, -14, 12, 3);
    glowFill(pulse); g.beginPath(); g.arc(0, -22, 2.2, 0, 7); g.fill(); glowOff();
  } else {
    const tw = side ? 14 : 18;
    // หน้าท้องข้อต่อ
    g.fillStyle = joint; rr(g, -tw / 2 + 2, -17, tw - 4, 6, 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(-tw / 2 + 3, -14.5); g.lineTo(tw / 2 - 3, -14.5); g.stroke();
    // เกราะอก
    g.fillStyle = metal(chassis, -tw / 2, -30, tw / 2, -16);
    g.beginPath();
    g.moveTo(-tw / 2, -29); g.lineTo(tw / 2, -29); g.lineTo(tw / 2 - 2.5, -17); g.quadraticCurveTo(0, -14.5, -tw / 2 + 2.5, -17); g.closePath();
    g.fill(); ol();
    if (!back) {
      // แผงอกสีอาชีพ + แกนพลังงาน
      g.fillStyle = metal(plate, -6, -28, 6, -18);
      if (side) { g.beginPath(); g.moveTo(1, -28); g.lineTo(6.5, -28); g.lineTo(5.5, -19); g.lineTo(1.5, -19); g.closePath(); g.fill(); }
      else { g.beginPath(); g.moveTo(-6.5, -28); g.lineTo(6.5, -28); g.lineTo(4.5, -19); g.lineTo(-4.5, -19); g.closePath(); g.fill(); }
      const cx = side ? 4 : front ? 0 : 2.5;
      g.fillStyle = joint; g.beginPath(); g.arc(cx, -23.5, 3.4, 0, 7); g.fill();
      glowFill(pulse); g.beginPath(); g.arc(cx, -23.5, 2.2, 0, 7); g.fill(); glowOff();
      g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(cx - 1.2, -25, 1.1, 1.1);
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(-tw / 2 + 1.5, -27.5); g.lineTo(-tw / 2 + 3, -19); g.stroke();
      if (o.apron) { g.fillStyle = o.apron; rr(g, -6, -18, 12, 8, 2); g.fill(); ol(0.8); }
      if (o.cross) { glowFill(1); g.fillRect(-1, -27, 2, 7); g.fillRect(-3.5, -24.5, 7, 2); glowOff(); }
    } else {
      // ด้านหลัง: ชุดขับดัน
      g.fillStyle = metal(plate, -6, -28, 6, -18); rr(g, -6, -28, 12, 10, 2.5); g.fill(); ol();
      g.fillStyle = joint; for (const vy of [-26, -23.5, -21]) g.fillRect(-4, vy, 8, 1.3);
      glowFill(0.8 * pulse); g.fillRect(-4.5, -18.4, 3, 1.6); g.fillRect(1.5, -18.4, 3, 1.6); glowOff();
    }
    // บ่าเกราะ
    const pad = px => { g.fillStyle = metal(plate, px - 4, -31, px + 4, -25); g.beginPath(); g.ellipse(px, -27.5, 4.6, 3.6, 0, Math.PI, 0); g.lineTo(px + 4.6, -26); g.lineTo(px - 4.6, -26); g.closePath(); g.fill(); ol(1); glowFill(0.7); g.fillRect(px - 3, -26.6, 6, 0.9); glowOff(); };
    if (front || back) { pad(-9.5); pad(9.5); } else if (side) pad(1.5); else pad(-8.5);
  }
  if (back) drawCape();
  if (front) drawArm(-10, -walk * 0.35, false, -0.12);
  if (back) drawArm(-9, -walk * 0.4, false, -0.22);

  // คอ (ข้อต่อกลไก)
  g.fillStyle = joint; g.fillRect(-2.6, -32, 5.2, 4);
  glowFill(0.6 * pulse); g.fillRect(-2.6, -30.5, 5.2, 0.9); glowOff();
  if (longHair && back) drawBackHair();
  // หูสัตว์กลไก (ด้านหลังหัว)
  const drawEars = () => {
    if (!o.ears) return;
    const ec = o.earColor || plate;
    for (const sx of (front || back) ? [-1, 1] : [-1, 0.4]) {
      g.save(); g.translate(sx * 6, hy - 8);
      g.rotate(sx * (o.ears === 'bunny' ? 0.12 : 0.35) + Math.sin(t * 3 + sx) * 0.04);
      g.fillStyle = metal(ec, -3, -14, 3, 0);
      g.beginPath();
      if (o.ears === 'bunny') { rr(g, -2.6, -18, 5.2, 18, 2.6); }
      else { g.moveTo(-4, 0); g.lineTo(0, o.ears === 'fox' ? -13 : -11); g.lineTo(4, 0); g.closePath(); }
      g.fill(); ol(1);
      glowFill(0.85); g.fillRect(-0.7, o.ears === 'bunny' ? -15 : -8, 1.4, o.ears === 'bunny' ? 11 : 6); glowOff();
      g.restore();
    }
  };
  drawEars();
  // หัว: เปลือกโลหะ + แผ่นหน้า (ไม่มีลูกตา)
  const faceC = o.face || U.shade(chassis, -0.04);
  g.fillStyle = metal(faceC, -11, hy - 10, 11, hy + 12);
  g.beginPath(); g.ellipse(0, hy + 0.5, 10.6, 11.4, 0, 0, 7); g.fill(); ol(1.2);
  // แสงขอบ (rim light) + เงาใต้คาง
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.2;
  g.beginPath(); g.ellipse(0, hy + 0.5, 9.6, 10.4, 0, Math.PI * 1.05, Math.PI * 1.45); g.stroke();
  g.fillStyle = 'rgba(10,14,24,0.18)'; g.beginPath(); g.ellipse(0, hy + 9, 7, 2.4, 0, 0, 7); g.fill();
  if (!back) {
    const fx = front ? 0 : side ? 5.2 : 2.8, fw = front ? 8.6 : side ? 5.2 : 7.2;
    const vis = o.visor || 'band';
    // เส้นรอยต่อแผ่นหน้า
    g.strokeStyle = 'rgba(30,36,50,0.35)'; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(fx - fw * 0.6, hy + 6.2); g.quadraticCurveTo(fx, hy + 8.4, fx + fw * 0.6, hy + 6.2); g.stroke();
    // วิเซอร์ (แทนตา)
    g.fillStyle = '#0b0e16';
    g.beginPath();
    if (vis === 'v') { g.moveTo(fx - fw, hy - 1.5); g.lineTo(fx, hy + 4.2); g.lineTo(fx + fw, hy - 1.5); g.lineTo(fx + fw, hy + 1.8); g.lineTo(fx, hy + 6.5); g.lineTo(fx - fw, hy + 1.8); g.closePath(); }
    else if (vis === 'slit') { rr(g, fx - fw, hy - 0.2, fw * 2, 4.2, 2); }
    else { g.ellipse(fx, hy + 1.6, fw, 4.4, 0, 0, 7); }
    g.fill();
    const vg = g.createLinearGradient(0, hy - 2, 0, hy + 5);
    vg.addColorStop(0, 'rgba(255,255,255,0.25)'); vg.addColorStop(0.45, 'rgba(255,255,255,0)'); vg.addColorStop(1, 'rgba(255,255,255,0.05)');
    g.fillStyle = vg; g.fill();
    glowFill(0.95);
    if (vis === 'v') { g.beginPath(); g.moveTo(fx - fw * 0.8, hy); g.lineTo(fx, hy + 4.4); g.lineTo(fx + fw * 0.8, hy); g.lineTo(fx + fw * 0.8, hy + 1); g.lineTo(fx, hy + 5.4); g.lineTo(fx - fw * 0.8, hy + 1); g.closePath(); g.fill(); }
    else if (vis === 'slit') { for (const dx of front ? [-fw * 0.5, fw * 0.5] : [fw * 0.35]) rr(g, fx + dx - 2.6, hy + 1.1, 5.2, 1.6, 0.8), g.fill(); }
    else { rr(g, fx - fw * 0.78, hy + 0.7, fw * 1.56, 2, 1); g.fill(); }
    glowOff();
    const sx = fx - fw * 0.7 + (((t + (o.seedT || 0)) * 0.8) % 1) * fw * 1.4;
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(sx, hy + 1, 1.4, 1.6);
    if (o.beard) { g.fillStyle = metal(o.beard, -6, hy + 6, 6, hy + 14); const bx = front ? 0 : side ? 5 : 3.5; rr(g, bx - 5, hy + 7, 10, 5.5, 2); g.fill(); ol(0.8); g.fillStyle = joint; for (let i = 0; i < 3; i++) g.fillRect(bx - 3.5 + i * 2.8, hy + 8.2, 1, 3.2); }
  } else {
    g.fillStyle = joint; for (const vy of [hy + 1, hy + 4]) { rr(g, -5, vy, 10, 1.4, 0.7); g.fill(); }
  }
  // แผ่นผมสังเคราะห์
  if (crest) {
    g.fillStyle = hairGrad(hy - 13, hy + 10);
    if (back) {
      g.beginPath(); g.ellipse(0, hy - 0.5, 11.8, 12, 0, 0, 7); g.fill(); ol();
      g.beginPath(); g.moveTo(-11.3, hy + 2); g.lineTo(-10, hy + 10.5); g.lineTo(-5.5, hy + 8); g.lineTo(-2.5, hy + 11.5); g.lineTo(0, hy + 8.5); g.lineTo(2.5, hy + 11.5); g.lineTo(5.5, hy + 8); g.lineTo(10, hy + 10.5); g.lineTo(11.3, hy + 2); g.closePath(); g.fill();
    } else if (front) {
      g.beginPath();
      g.moveTo(-11.8, hy + 8); g.quadraticCurveTo(-13.8, hy - 11, 0, hy - 12.8); g.quadraticCurveTo(13.8, hy - 11, 11.8, hy + 8);
      g.lineTo(10, hy - 1.5); g.lineTo(8.5, hy - 3.5); g.lineTo(6, hy - 2); g.lineTo(3.8, hy - 5.2); g.lineTo(1.2, hy - 3.2); g.lineTo(0, hy - 5.8);
      g.lineTo(-1.2, hy - 3.2); g.lineTo(-3.8, hy - 5.2); g.lineTo(-6, hy - 2); g.lineTo(-8.5, hy - 3.5); g.lineTo(-10, hy - 1.5);
      g.closePath(); g.fill(); ol();
      for (const sxx of [-1, 1]) { g.beginPath(); g.moveTo(sxx * 10.4, hy - 2); g.quadraticCurveTo(sxx * 12.6, hy + 7, sxx * 10.3, hy + 12); g.lineTo(sxx * 8.9, hy + 3); g.closePath(); g.fill(); ol(0.8); }
    } else {
      g.beginPath();
      g.moveTo(-11.4, hy + 8); g.quadraticCurveTo(-13.4, hy - 11, 0, hy - 12.6); g.quadraticCurveTo(12, hy - 11.5, 12.4, hy - 2);
      g.lineTo(10.2, hy - 1.5); g.lineTo(8.8, hy - 4); g.lineTo(6.6, hy - 2.2); g.lineTo(4.8, hy - 5.4); g.lineTo(2.4, hy - 3); g.lineTo(0.4, hy - 6); g.lineTo(-2.4, hy - 3);
      g.lineTo(-4, hy + 3); g.lineTo(-7, hy + 10); g.closePath(); g.fill(); ol();
    }
    // เส้นแบ่งแผ่น + ประกายแข็งแบบโลหะ
    g.strokeStyle = 'rgba(10,14,24,0.3)'; g.lineWidth = 0.8;
    for (const lx of back ? [-5, 0, 5] : [-5, 4]) { g.beginPath(); g.moveTo(lx, hy - 11); g.quadraticCurveTo(lx * 1.25, hy - 5, lx * 1.1, hy + (back ? 8 : -3)); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.4;
    g.beginPath(); g.arc(back ? 0 : front ? 0 : 1.5, hy - 1, 8.4, Math.PI * 1.15, Math.PI * 1.5); g.stroke();
    glowFill(0.7 * pulse); g.fillRect(-0.6, hy - 12.4, 1.2, 3.5); glowOff();
    if (o.hairStyle === 'spiky') {
      g.fillStyle = hairGrad(hy - 20, hy - 8);
      g.beginPath(); g.moveTo(-8, hy - 8); g.lineTo(-7, hy - 17); g.lineTo(-3, hy - 11); g.lineTo(0, hy - 19); g.lineTo(3, hy - 11); g.lineTo(7, hy - 16); g.lineTo(8, hy - 8); g.closePath(); g.fill(); ol(1);
    } else if (o.hairStyle === 'crest') {
      g.fillStyle = hairGrad(hy - 22, hy - 8);
      g.beginPath(); g.moveTo(-2.4, hy - 11); g.lineTo(side ? -6 : 0, hy - 22); g.lineTo(2.4, hy - 11); g.closePath(); g.fill(); ol(1);
      glowFill(0.9); g.fillRect(-0.5, hy - 19, 1, 7); glowOff();
    } else if (o.hairStyle === 'bob') {
      g.fillStyle = hairGrad(hy - 4, hy + 8);
      for (const sxx of (front || back) ? [-1, 1] : [-1]) { g.beginPath(); g.moveTo(sxx * 11, hy - 4); g.quadraticCurveTo(sxx * 13.5, hy + 5, sxx * 9, hy + 9); g.lineTo(sxx * 8, hy); g.closePath(); g.fill(); ol(0.8); }
    }
    if (o.hairStyle === 'twin' && !back) {
      g.fillStyle = hairGrad(hy - 12, hy);
      for (const sxx of front ? [-1, 1] : [-1]) { g.beginPath(); g.ellipse(sxx * 10, hy - 9, 3.6, 3, sxx * 0.5, 0, 7); g.fill(); ol(0.8); }
    }
  }
  // หูฟัง/เซ็นเซอร์ข้างหัว
  const ear = ex => {
    g.fillStyle = metal(plate, ex - 3.4, hy - 3, ex + 3.4, hy + 3); g.beginPath(); g.arc(ex, hy + 0.5, 3.5, 0, 7); g.fill(); ol(0.9);
    glowFill(pulse); g.beginPath(); g.arc(ex, hy + 0.5, 1.3, 0, 7); g.fill(); glowOff();
    g.strokeStyle = metal(plate, ex, hy - 12, ex, hy); g.lineWidth = 1.6; g.beginPath(); g.moveTo(ex, hy - 2); g.lineTo(ex + (ex < 0 ? -2 : 2), hy - 10); g.stroke();
  };
  if (!o.ears) { if (front || back) { ear(-11.5); ear(11.5); } else if (side) ear(-3); else ear(-10); }
  // วงแหวนเทวดา
  if (o.halo === 'rainbow') {
    // วงแหวนสายรุ้ง (Bifrost) ลอยรอบศีรษะ
    g.save(); g.lineWidth = 2; g.shadowBlur = 6;
    const ry = hy - 12 + Math.sin(t * 2) * 1;
    for (let i = 0; i < 12; i++) { const c = `hsl(${(i * 30 + t * 60) % 360},90%,70%)`; g.strokeStyle = c; g.shadowColor = c; g.beginPath(); g.ellipse(0, ry, 15, 5, 0, i / 12 * Math.PI * 2, (i + 1) / 12 * Math.PI * 2 + 0.05); g.stroke(); }
    g.restore();
  } else if (o.halo) { g.save(); g.strokeStyle = '#ffe27a'; g.shadowColor = '#ffe27a'; g.shadowBlur = 8; g.lineWidth = 1.8; g.beginPath(); g.ellipse(0, hy - 18 + Math.sin(t * 3) * 1.2, 8, 2.4, 0, 0, 7); g.stroke(); g.restore(); }
  if (o.jiangshi) {
    if (back) { g.fillStyle = '#1a1a2a'; g.fillRect(-11, hy - 14, 22, 8); g.fillRect(-7, hy - 20, 14, 7); } else {
    g.fillStyle = '#1a1a2a'; g.fillRect(-11, hy - 14, 22, 8); g.fillRect(-7, hy - 20, 14, 7);
    g.fillStyle = '#e8d860'; g.fillRect(4, hy - 7, 5, 13);
    g.fillStyle = '#c03030'; g.fillRect(5, hy - 5, 3, 1); g.fillRect(5, hy - 2, 3, 1); g.fillRect(5, hy + 1, 3, 1);
  } }
  if (o.fox) {
    g.fillStyle = '#f0a040';
    g.beginPath(); g.moveTo(-8, hy - 7); g.lineTo(-6, hy - 20); g.lineTo(0, hy - 10); g.fill();
    g.beginPath(); g.moveTo(2, hy - 10); g.lineTo(8, hy - 20); g.lineTo(9, hy - 6); g.fill();
    g.fillStyle = '#e04040'; g.beginPath(); g.arc(0, -27, 2.5, 0, 7); g.fill();
  }
  if (o.hat === 'dome') {
    g.fillStyle = metal(o.hatColor || '#d8433a', -12, hy - 16, 12, hy - 4);
    g.beginPath(); g.ellipse(0, hy - 5, 13, 11, 0, Math.PI, 0); g.closePath(); g.fill(); ol(1);
    g.fillStyle = '#e8e2d0'; for (const [dx, dy] of [[-6, -10], [1, -13], [7, -9]]) { g.beginPath(); g.arc(dx, hy + dy, 1.6, 0, 7); g.fill(); }
    glowFill(Math.floor(t * 2) % 2 ? 1 : 0.3); g.beginPath(); g.arc(0, hy - 16, 1.8, 0, 7); g.fill(); glowOff();
  }
  if (o.hat === 'viking') {
    g.fillStyle = o.hatColor || '#9aa2b0'; g.beginPath(); g.arc(0, hy - 2, 12.3, Math.PI, 0); g.fill();
    g.fillStyle = '#6a6f7a'; g.fillRect(-12.5, hy - 4, 25, 3); g.fillRect(-1, hy - 14, 2, 12);
    g.fillStyle = '#f0e8d0';
    g.beginPath(); g.moveTo(-10, hy - 8); g.quadraticCurveTo(-20, hy - 12, -18, hy - 24); g.quadraticCurveTo(-15, hy - 14, -7, hy - 12); g.fill();
    g.beginPath(); g.moveTo(10, hy - 8); g.quadraticCurveTo(20, hy - 12, 18, hy - 24); g.quadraticCurveTo(15, hy - 14, 7, hy - 12); g.fill();
  }
  if (o.hat === 'runehood' || o.hat === 'hood') {
    g.fillStyle = o.hatColor || (o.hat === 'runehood' ? '#24407a' : '#2f5a2a');
    g.beginPath(); g.moveTo(-13, hy + 8); g.quadraticCurveTo(-15, hy - 16, 0, hy - 15); g.quadraticCurveTo(13, hy - 14, 13, hy - 2); g.lineTo(8, hy - 6); g.quadraticCurveTo(0, hy - 9, -8, hy - 3); g.lineTo(-8, hy + 10); g.closePath(); g.fill();
    if (o.hat === 'runehood' && !back) { g.fillStyle = `rgba(140,230,255,${0.6 + Math.sin((o.t || 0) * 4) * 0.4})`; g.font = 'bold 8px serif'; g.textAlign = 'center'; g.fillText('ᚱ', -3, hy - 8); }
  }
  if (o.hat === 'circlet') { g.fillStyle = '#e0c040'; g.fillRect(-11, hy - 8, 22, 2.5); g.fillStyle = '#60c0ff'; g.beginPath(); g.arc(2, hy - 7, 2.5, 0, 7); g.fill(); }
  if (o.hat === 'mask') {
    g.fillStyle = '#3a2f4a'; g.beginPath(); g.arc(0, hy - 2, 11.8, Math.PI, 0); g.fill(); g.fillRect(-15, hy - 3, 5, 8);
    if (!back) { g.fillStyle = '#2a2233'; g.fillRect(front ? -10 : -2, hy - 2, front ? 20 : 14, 5);
    g.fillStyle = '#7ad04a'; for (const ex of eyesX) g.fillRect(ex - 1.5, hy, 3, 1.5); }
  }
  if (o.hat === 'wolfpelt') {
    g.fillStyle = '#8a8a94';
    g.beginPath(); g.moveTo(-14, hy + 10); g.quadraticCurveTo(-16, hy - 14, 0, hy - 14); g.quadraticCurveTo(12, hy - 14, 14, hy - 6); g.lineTo(18, hy - 4); g.lineTo(12, hy - 1); g.quadraticCurveTo(0, hy - 8, -8, hy - 2); g.lineTo(-9, hy + 12); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-6, hy - 12); g.lineTo(-4, hy - 21); g.lineTo(1, hy - 13); g.fill();
    g.beginPath(); g.moveTo(3, hy - 13); g.lineTo(7, hy - 21); g.lineTo(9, hy - 11); g.fill();
    if (!back) { g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(9, hy - 9, 1.2, 0, 7); g.fill();
    g.fillStyle = '#f0f0f0'; g.fillRect(12, hy - 3, 1.5, 2.5); g.fillRect(15, hy - 3, 1.5, 2); }
  }
  if (o.hat === 'keeper') {
    const cols = ['#e05050', '#f0a040', '#f0e050', '#60c060', '#5090e0', '#9060d0'];
    cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(-11 + i * 3.7, hy - 10, 3.7, 3); });
  }
  if (o.hat === 'nurse') { g.fillStyle = '#fff'; rr(g, -9, hy - 17, 18, 8, 2); g.fill(); g.fillStyle = '#e03030'; g.fillRect(-1.5, hy - 16, 3, 6); g.fillRect(-4, hy - 14, 8, 2); }
  if (o.hat === 'helmet') { g.fillStyle = o.hatColor || '#b0b8c8'; g.beginPath(); g.arc(0, hy - 2, 12.5, Math.PI, 0); g.fill(); g.fillRect(-12.5, hy - 3, 25, 3); if (o.hatColor) { g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(-8, hy - 12, 3, 8); g.fillStyle = glow; g.globalAlpha = 0.9; g.fillRect(-12.5, hy - 3, 25, 1.2); g.globalAlpha = 1; } else { g.fillStyle = '#d03030'; g.fillRect(-1.5, hy - 20, 3, 8); } }
  if (o.hat === 'wizard') { g.fillStyle = '#5a2a8a'; g.beginPath(); g.moveTo(-13, hy - 6); g.lineTo(13, hy - 6); g.lineTo(-2, hy - 30); g.closePath(); g.fill(); g.fillStyle = '#e0c040'; g.fillRect(-10, hy - 8, 20, 3); }
  if (o.hat === 'bandana') { g.fillStyle = '#b03030'; g.beginPath(); g.arc(0, hy - 2, 11.8, Math.PI, 0); g.fill(); g.fillRect(-14, hy - 3, 4, 7); }
  if (o.hat === 'hat') { g.fillStyle = '#8a6a4a'; g.fillRect(-14, hy - 8, 28, 3); g.fillRect(-8, hy - 17, 16, 10); }
  if (o.hat === 'cap') { g.fillStyle = '#8090a0'; g.beginPath(); g.arc(0, hy - 3, 12, Math.PI, 0); g.fill(); if (!back) { if (front) g.fillRect(-8, hy - 4, 16, 3); else g.fillRect(0, hy - 4, 15, 3); } }
  if (o.hat === 'ribbon') { g.fillStyle = '#e04070'; g.beginPath(); g.moveTo(-6, hy - 12); g.lineTo(-14, hy - 18); g.lineTo(-14, hy - 6); g.closePath(); g.fill(); g.beginPath(); g.moveTo(-6, hy - 12); g.lineTo(2, hy - 18); g.lineTo(2, hy - 6); g.closePath(); g.fill(); g.beginPath(); g.arc(-6, hy - 12, 2.5, 0, 7); g.fill(); }
  if (o.hat === 'angel_wing') {
    g.fillStyle = '#fff';
    for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 13, hy - 4, 7, 4, sx * -0.6, 0, 7); g.fill(); g.beginPath(); g.ellipse(sx * 15, hy - 8, 6, 3, sx * -0.9, 0, 7); g.fill(); }
  }



  // แขนข้างที่ถืออาวุธ (ด้านหน้า)
  if (!back) drawArm(front ? 10 : side ? 2 : 7.5, swing, true, -0.05);
  g.restore();
};

// ------------------------------------------------------------
//  มอนสเตอร์
// ------------------------------------------------------------
// ---------- ตัวช่วยวาดโลหะ/ไฟนีออน ----------
const MG = (g, c, x0, y0, x1, y1) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, U.shade(c, 0.28)); gr.addColorStop(0.55, c); gr.addColorStop(1, U.shade(c, -0.3)); return gr; };
const GLOW = (g, c, fn, blur = 7) => { g.save(); g.shadowColor = c; g.shadowBlur = blur; g.fillStyle = c; fn(); g.restore(); };
const MOL = 'rgba(14,16,24,0.7)';
const mobGlow = m => (m.state === 'chase' ? '#ff4a3a' : (m.def.glow || '#6ad8ff'));

// โดรนลอยทรงโดม (Slime/Ember/Moss Drone, Seraph Core)
Sprites.poring = (g, x, y, m, t) => {
  const d = m.def, s = (d.scale || 1);
  const ph = t * (m.moving ? 6 : 2.5) + m.seed * 10;
  const hover = 5 + Math.sin(ph) * 2.2;
  Sprites.shadow(g, x, y, 12 * s, 4.5 * s, 0.3 - Math.sin(ph) * 0.05);
  g.save(); g.translate(x, y - hover * s); g.scale((m.facing || 1) * s, s);
  const gc = mobGlow(m);
  // ไอพ่นใต้ตัว
  GLOW(g, gc, () => { g.globalAlpha = 0.5 + Math.sin(t * 20) * 0.2; g.beginPath(); g.ellipse(0, 1, 5, 2, 0, 0, 7); g.fill(); }, 10);
  if (d.wings) {
    const f = Math.sin(t * 5) * 0.25;
    for (const sx of [-1, 1]) {
      g.save(); g.translate(sx * 12, -13); g.rotate(sx * (-0.3 + f));
      for (let i = 0; i < 4; i++) {
        g.fillStyle = MG(g, '#f4f0e0', 0, -10, 0, 4);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(sx * (10 + i * 3), -10 + i * 4); g.lineTo(sx * (8 + i * 3), -6 + i * 4); g.closePath(); g.fill();
        g.strokeStyle = MOL; g.lineWidth = 0.8; g.stroke();
      }
      GLOW(g, '#ffe27a', () => g.fillRect(sx > 0 ? 2 : -12, -1, 10, 1));
      g.restore();
    }
  }
  // ตัวโดม
  g.fillStyle = MG(g, d.color, -14, -24, 14, 0);
  g.beginPath(); g.moveTo(-14, -6); g.quadraticCurveTo(-14, -24, 0, -24); g.quadraticCurveTo(14, -24, 14, -6); g.lineTo(11, -1); g.lineTo(-11, -1); g.closePath(); g.fill();
  g.strokeStyle = MOL; g.lineWidth = 1.2; g.stroke();
  // ฐานโลหะ
  g.fillStyle = '#2a2e38'; rr(g, -12, -6, 24, 5, 2); g.fill();
  g.fillStyle = '#8a92a4'; g.fillRect(-10, -5, 20, 1);
  // แถบเซ็นเซอร์เรืองแสง
  g.fillStyle = '#10131c'; rr(g, -9, -15, 18, 5.5, 2.5); g.fill();
  const scan = ((t * 0.8 + m.seed) % 1) * 14 - 7;
  GLOW(g, gc, () => { rr(g, -7.5, -13.6, 15, 2.6, 1.3); g.fill(); });
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(scan, -13.4, 1.5, 2.2);
  // ไฮไลต์โลหะ + เสาอากาศ
  g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(-6, -19, 4, 1.8, -0.4, 0, 7); g.fill();
  g.strokeStyle = '#2a2e38'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(3, -24); g.lineTo(5, -30); g.stroke();
  GLOW(g, gc, () => { g.beginPath(); g.arc(5, -31, 1.6, 0, 7); g.fill(); });
  if (d.wings) {
    g.save(); g.strokeStyle = '#ffe27a'; g.shadowColor = '#ffe27a'; g.shadowBlur = 8; g.lineWidth = 2;
    g.beginPath(); g.ellipse(0, -33 + Math.sin(t * 3) * 1.5, 9, 2.6, 0, 0, 7); g.stroke(); g.restore();
  }
  g.restore();
};

// หุ่นกระต่าย (Hopper Bunny)
Sprites.lunatic = (g, x, y, m, t) => {
  const ph = t * (m.moving ? 9 : 2) + m.seed * 10;
  const hop = m.moving ? Math.abs(Math.sin(ph)) * 7 : 0;
  Sprites.shadow(g, x, y, 11, 4);
  g.save(); g.translate(x, y - hop); g.scale(m.facing || 1, 1);
  const gc = mobGlow(m);
  for (const [ex, rot] of [[-3.5, -0.18], [3.5, 0.12]]) {
    g.save(); g.translate(ex, -19); g.rotate(rot + Math.sin(t * 3 + ex) * 0.05);
    g.fillStyle = MG(g, '#eef0f6', -3, -20, 3, 0); rr(g, -2.6, -19, 5.2, 19, 2.6); g.fill(); g.strokeStyle = MOL; g.lineWidth = 1; g.stroke();
    GLOW(g, gc, () => g.fillRect(-0.8, -16, 1.6, 10));
    g.restore();
  }
  g.fillStyle = MG(g, '#eef0f6', -12, -22, 12, 0);
  g.beginPath(); g.ellipse(0, -10, 12, 10.5, 0, 0, 7); g.fill(); g.strokeStyle = MOL; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = '#10131c'; rr(g, 1, -15, 10, 5, 2.5); g.fill();
  GLOW(g, gc, () => { rr(g, 2.5, -13.6, 7.5, 2.2, 1.1); g.fill(); });
  g.fillStyle = '#2a2e38'; g.fillRect(-8, -3, 16, 2.5);
  g.fillStyle = '#c8ccd6'; g.beginPath(); g.arc(-11, -6, 3.2, 0, 7); g.fill();
  g.restore();
};

// หุ่นหนอนต่อข้อ (Crawler Unit)
Sprites.fabre = (g, x, y, m, t) => {
  Sprites.shadow(g, x, y, 15, 4);
  g.save(); g.translate(x, y); g.scale(m.facing || 1, 1);
  const ph = t * (m.moving ? 8 : 2) + m.seed * 10, gc = mobGlow(m);
  for (let i = 0; i < 4; i++) {
    const sx = -13 + i * 7, sy = -6 - Math.abs(Math.sin(ph + i)) * 2;
    g.fillStyle = '#2a2e38'; g.fillRect(sx - 1, sy + 4, 2, 3);
    g.fillStyle = MG(g, i % 2 ? '#6aa84a' : '#86c05a', sx - 6, sy - 6, sx + 6, sy + 6);
    g.beginPath(); g.arc(sx, sy, 6 + (i === 3 ? 1.5 : 0), 0, 7); g.fill(); g.strokeStyle = MOL; g.lineWidth = 1; g.stroke();
    GLOW(g, gc, () => { g.beginPath(); g.arc(sx, sy - 3, 1.1, 0, 7); g.fill(); }, 5);
  }
  g.fillStyle = '#10131c'; rr(g, 9, -10, 6, 3.5, 1.5); g.fill();
  GLOW(g, gc, () => g.fillRect(10, -9.2, 4.5, 1.6));
  g.strokeStyle = '#2a2e38'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(10, -13); g.lineTo(13, -20); g.stroke();
  GLOW(g, gc, () => { g.beginPath(); g.arc(13, -20.5, 1.6, 0, 7); g.fill(); });
  g.restore();
};

// โดรนใบพัด (Buzz Drone)
// หุ่นฝึกซ้อม (Training Dummy): เสาเหล็ก + ลำตัวทองเหลือง + หัววิเซอร์ • โยกเมื่อโดนตี • ฟาดแขนเมื่อตีกลับ • แสดง DPS
Sprites.dummy = (g, x, y, m, t) => {
  const last = m.dmgLog && m.dmgLog.length ? m.dmgLog[m.dmgLog.length - 1][0] : -9;
  const since = G.time - last, sway = since < 1.2 ? Math.sin(since * 22) * Math.exp(-since * 4) * 0.32 : 0;
  const swing = m.atkAnim > 0 ? Math.sin((1 - m.atkAnim) * Math.PI) : 0;
  Sprites.shadow(g, x, y, 15, 5, 0.3);
  // ฐาน
  g.fillStyle = MG(g, '#6a6e78', -12, -4, 12, 4); g.beginPath(); g.ellipse(x, y - 1, 13, 4.5, 0, 0, 7); g.fill(); g.strokeStyle = MOL; g.lineWidth = 1; g.stroke();
  g.save(); g.translate(x, y - 2); g.rotate(sway * (m.facing || 1));
  // เสา
  g.fillStyle = MG(g, '#8a8e98', -2, -30, 2, 0); g.fillRect(-2.2, -30, 4.4, 30); g.strokeStyle = MOL; g.strokeRect(-2.2, -30, 4.4, 30);
  // แขน (คานขวาง) — หมุนตอนตีกลับ
  g.save(); g.translate(0, -34); g.rotate(-swing * 0.9 * (m.facing || 1));
  g.fillStyle = MG(g, '#b07a3a', -17, -3, 17, 3); g.fillRect(-17, -2.5, 34, 5); g.strokeRect(-17, -2.5, 34, 5);
  g.fillStyle = '#3a3e48'; g.beginPath(); g.arc(-17, 0, 3.2, 0, 7); g.arc(17, 0, 3.2, 0, 7); g.fill();
  g.restore();
  // ลำตัว (เป้า)
  g.fillStyle = MG(g, '#d8a860', -9, -46, 9, -22); g.beginPath(); g.ellipse(0, -34, 9.5, 12, 0, 0, 7); g.fill(); g.strokeStyle = MOL; g.stroke();
  g.strokeStyle = '#a02830'; g.lineWidth = 1.6; g.beginPath(); g.arc(0, -34, 6, 0, 7); g.stroke();
  g.fillStyle = '#c02a34'; g.beginPath(); g.arc(0, -34, 2.4, 0, 7); g.fill();
  // หัว + วิเซอร์
  g.fillStyle = MG(g, '#dfe3ea', -7, -58, 7, -45); g.beginPath(); g.arc(0, -52, 7, 0, 7); g.fill(); g.strokeStyle = MOL; g.lineWidth = 1; g.stroke();
  GLOW(g, m.state === 'chase' ? '#ff5a4a' : '#62e3ff', () => { g.beginPath(); g.roundRect ? g.roundRect(-5.5, -54, 11, 3, 1.5) : g.rect(-5.5, -54, 11, 3); g.fill(); });
  g.restore();
  // DPS (5 วินาทีล่าสุด)
  if (m.dmgLog && m.dmgLog.length) {
    const span = Math.max(1, Math.min(5, G.time - m.dmgLog[0][0]));
    const tot = m.dmgLog.reduce((a, e) => a + e[1], 0);
    R.label(g, x, y - 72, `DPS ${Math.round(tot / span)}`, '#ffe08a', true);
  }
};

Sprites.chonchon = (g, x, y, m, t) => {
  const hov = 15 + Math.sin(t * 5 + m.seed * 9) * 3;
  Sprites.shadow(g, x, y, 9, 3, 0.2);
  g.save(); g.translate(x, y - hov); g.scale(m.facing || 1, 1);
  const gc = mobGlow(m);
  g.strokeStyle = '#3a3e48'; g.lineWidth = 2; g.beginPath(); g.moveTo(-11, -4); g.lineTo(11, -4); g.stroke();
  for (const px of [-11, 11]) {
    g.fillStyle = 'rgba(210,225,240,0.45)'; g.beginPath(); g.ellipse(px, -6, 7, 1.6 + Math.abs(Math.sin(t * 45 + px)) * 1.2, 0, 0, 7); g.fill();
    g.fillStyle = '#2a2e38'; g.fillRect(px - 1, -7, 2, 3);
  }
  g.fillStyle = MG(g, '#e0b830', -7, -8, 7, 6); g.beginPath(); g.ellipse(0, -1, 7.5, 6, 0, 0, 7); g.fill(); g.strokeStyle = MOL; g.lineWidth = 1; g.stroke();
  g.fillStyle = '#1e2028'; g.fillRect(-4, -6.5, 2, 11); g.fillRect(0.5, -7, 2, 12);
  g.fillStyle = '#10131c'; g.beginPath(); g.arc(6, -1, 3.2, 0, 7); g.fill();
  GLOW(g, gc, () => { g.beginPath(); g.arc(6.5, -1, 1.8, 0, 7); g.fill(); });
  g.restore();
};

// ตั๊กแตนกลไก (Hopper Mech)
Sprites.rocker = (g, x, y, m, t) => {
  Sprites.shadow(g, x, y, 14, 4);
  g.save(); g.translate(x, y); g.scale(m.facing || 1, 1);
  const ph = t * (m.moving ? 10 : 2) + m.seed * 10, gc = mobGlow(m);
  g.strokeStyle = '#3a4a2a'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(-4, -10); g.lineTo(-12, -20 + Math.sin(ph) * 2); g.lineTo(-10, 0); g.stroke();
  g.fillStyle = '#2a2e38'; g.beginPath(); g.arc(-12, -20 + Math.sin(ph) * 2, 2, 0, 7); g.fill();
  g.lineWidth = 1.8; g.strokeStyle = '#4a5a3a'; g.beginPath(); g.moveTo(2, -8); g.lineTo(4, 0); g.moveTo(6, -8); g.lineTo(9, 0); g.stroke();
  g.fillStyle = MG(g, '#7cb342', -14, -18, 10, -4); g.beginPath(); g.ellipse(-2, -11, 12, 6, -0.15, 0, 7); g.fill(); g.strokeStyle = MOL; g.lineWidth = 1.1; g.stroke();
  g.strokeStyle = 'rgba(20,30,10,0.5)'; g.lineWidth = 1; for (const sx of [-8, -3, 2]) { g.beginPath(); g.moveTo(sx, -16); g.lineTo(sx - 1, -6); g.stroke(); }
  g.fillStyle = MG(g, '#8ccf52', 5, -22, 17, -10); g.beginPath(); g.arc(11, -16, 6, 0, 7); g.fill(); g.strokeStyle = MOL; g.stroke();
  g.fillStyle = '#10131c'; rr(g, 11, -18.5, 6.5, 3.5, 1.5); g.fill();
  GLOW(g, gc, () => g.fillRect(12, -17.6, 5, 1.6));
  g.strokeStyle = '#2a2e38'; g.lineWidth = 1; g.beginPath(); g.moveTo(12, -21); g.lineTo(18, -30); g.moveTo(10, -21); g.lineTo(13, -31); g.stroke();
  g.restore();
};

// ป้อมปืนสนิม (Rust Sentry)
Sprites.willow = (g, x, y, m, t) => {
  Sprites.shadow(g, x, y, 14, 5);
  g.save(); g.translate(x, y); g.scale(m.facing || 1, 1);
  const gc = mobGlow(m), turn = Math.sin(t * 1.2 + m.seed * 5) * 0.15;
  g.fillStyle = MG(g, '#8a6a4a', -11, -12, 11, 0); rr(g, -11, -12, 22, 12, 3); g.fill(); g.strokeStyle = MOL; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = 'rgba(160,90,40,0.55)'; g.beginPath(); g.arc(-5, -6, 2.5, 0, 7); g.arc(6, -4, 2, 0, 7); g.fill();
  g.fillStyle = '#2a2e38'; for (const lx of [-9, 7]) g.fillRect(lx, -1, 3, 2);
  g.save(); g.translate(0, -14); g.rotate(turn);
  g.fillStyle = MG(g, '#9a8a6a', -9, -9, 9, 2); g.beginPath(); g.ellipse(0, 0, 9, 8, 0, Math.PI, 0); g.lineTo(9, 2); g.lineTo(-9, 2); g.closePath(); g.fill(); g.strokeStyle = MOL; g.stroke();
  g.fillStyle = '#3a3e48'; g.fillRect(5, -4, 11, 3.2);
  GLOW(g, gc, () => g.fillRect(15, -3.8, 2, 2.8));
  g.fillStyle = '#10131c'; rr(g, -4, -6, 8, 3, 1.5); g.fill();
  GLOW(g, gc, () => g.fillRect(-3, -5.2, 6, 1.4));
  g.restore();
  g.restore();
};

// หุ่นทุ่นระเบิด (Mine Bot)
Sprites.spore = (g, x, y, m, t) => {
  const hop = m.moving ? Math.abs(Math.sin(t * 8 + m.seed * 9)) * 4 : 0;
  Sprites.shadow(g, x, y, 12, 4);
  g.save(); g.translate(x, y - hop); g.scale(m.facing || 1, 1);
  const gc = mobGlow(m);
  g.strokeStyle = '#3a3e48'; g.lineWidth = 2;
  for (const lx of [-8, -3, 3, 8]) { g.beginPath(); g.moveTo(lx * 0.8, -6); g.lineTo(lx, 0); g.stroke(); }
  g.fillStyle = '#2a2e38'; rr(g, -11, -9, 22, 4, 2); g.fill();
  g.fillStyle = MG(g, '#d8433a', -13, -24, 13, -8);
  g.beginPath(); g.ellipse(0, -9, 13, 12, 0, Math.PI, 0); g.closePath(); g.fill(); g.strokeStyle = MOL; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = '#e8e2d0'; for (const [sx, sy] of [[-7, -15], [0, -19], [7, -14]]) { g.beginPath(); g.arc(sx, sy, 1.6, 0, 7); g.fill(); }
  const blink = Math.floor(t * 2 + m.seed * 4) % 2 === 0;
  if (blink || m.state === 'chase') GLOW(g, gc, () => { g.beginPath(); g.arc(0, -22, 2, 0, 7); g.fill(); }, 10);
  g.fillStyle = '#10131c'; rr(g, -6, -12, 12, 3, 1.5); g.fill();
  GLOW(g, gc, () => g.fillRect(-5, -11.2, 10, 1.4));
  g.restore();
};

// สัตว์สี่ขากลไก (Ash Hound / Fenrir Unit / Iron Bear / Tusk Tank)
Sprites.quad = (g, x, y, m, t) => {
  const d = m.def, s = (d.size || 1) * (d.scale || 1);
  const ph = t * (m.moving ? 12 : 2) + m.seed * 10;
  const lg = m.moving ? Math.sin(ph) * 3 : 0;
  const gc = m.state === 'ally' ? '#6ad8ff' : mobGlow(m);
  Sprites.shadow(g, x, y, 16 * s, 5 * s);
  g.save(); g.translate(x, y); g.scale((m.facing || 1) * s, s);
  const leg = (lx, dx, c) => {
    g.fillStyle = MG(g, c, lx, -10, lx + 4, 0); rr(g, lx + dx, -10, 4, 9, 1.5); g.fill();
    g.fillStyle = '#2a2e38'; g.beginPath(); g.arc(lx + dx + 2, -6, 1.3, 0, 7); g.fill(); g.fillRect(lx + dx - 0.5, -1.5, 5, 1.8);
  };
  leg(-11, lg, d.color2); leg(6, -lg, d.color2);
  // หาง: สายเคเบิลปลายเรืองแสง
  g.strokeStyle = '#3a3e48'; g.lineWidth = 3; g.lineCap = 'round';
  const tx = -19, ty = -24 + Math.sin(t * 5) * 3;
  g.beginPath(); g.moveTo(-13, -14); g.quadraticCurveTo(-20, -17, tx, ty); g.stroke(); g.lineCap = 'butt';
  GLOW(g, gc, () => { g.beginPath(); g.arc(tx, ty, 2, 0, 7); g.fill(); });
  // ลำตัวเกราะ
  g.fillStyle = MG(g, d.color, -15, -22, 15, -6);
  g.beginPath(); g.moveTo(-15, -12); g.quadraticCurveTo(-14, -21, -4, -21); g.lineTo(9, -21); g.quadraticCurveTo(16, -19, 15, -12); g.quadraticCurveTo(12, -6, 0, -6.5); g.quadraticCurveTo(-13, -6, -15, -12); g.fill();
  g.strokeStyle = MOL; g.lineWidth = 1.2; g.stroke();
  g.strokeStyle = 'rgba(20,24,34,0.45)'; g.lineWidth = 1; for (const sx of [-7, 0, 7]) { g.beginPath(); g.moveTo(sx, -20); g.lineTo(sx - 1, -8); g.stroke(); }
  GLOW(g, gc, () => { g.globalAlpha = 0.8; g.fillRect(-10, -14, 20, 1.2); });
  leg(-8, -lg, d.color); leg(9, lg, d.color);
  // หัว
  g.fillStyle = MG(g, d.color, 7, -28, 24, -12);
  g.beginPath(); g.moveTo(8, -24); g.lineTo(18, -26); g.lineTo(25, -18); g.lineTo(22, -14); g.lineTo(10, -14); g.closePath(); g.fill(); g.strokeStyle = MOL; g.lineWidth = 1.1; g.stroke();
  g.fillStyle = MG(g, d.color2, 8, -34, 16, -24);
  if (d.variant === 'bear') { g.beginPath(); g.arc(11, -27, 3, 0, 7); g.arc(17, -27.5, 3, 0, 7); g.fill(); }
  else { g.beginPath(); g.moveTo(9, -24); g.lineTo(11, -33); g.lineTo(14, -25); g.closePath(); g.moveTo(14, -25.5); g.lineTo(17, -33); g.lineTo(19, -24.5); g.closePath(); g.fill(); }
  g.fillStyle = '#10131c'; g.beginPath(); g.moveTo(14, -22.5); g.lineTo(21.5, -21.5); g.lineTo(21, -19.3); g.lineTo(14, -20); g.closePath(); g.fill();
  GLOW(g, gc, () => { g.beginPath(); g.moveTo(15, -21.8); g.lineTo(21, -21); g.lineTo(20.8, -20); g.lineTo(15, -20.6); g.closePath(); g.fill(); });
  if (d.tusk) { g.fillStyle = '#d8dce6'; g.beginPath(); g.moveTo(20, -15); g.lineTo(25, -21); g.lineTo(22, -13.5); g.closePath(); g.fill(); g.strokeStyle = MOL; g.stroke(); }
  if (m.atkAnim > 0.5) GLOW(g, '#ffffff', () => { g.globalAlpha = m.atkAnim - 0.5; g.beginPath(); g.arc(24, -16, 3, 0, 7); g.fill(); });
  g.restore();
};

Sprites.mobHuman = (g, x, y, m, t) => {
  const d = m.def;
  Sprites.shadow(g, x, y, 12 * (d.scale || 1), 4 * (d.scale || 1));
  const sway = d.jiangshi ? Math.abs(Math.sin(t * 6 + m.seed)) * 4 : 0;
  Sprites.human(g, x, y - sway, {
    facing: m.facing, dir: m.dir, t: t + m.seed * 10, moving: m.moving && !d.jiangshi, atk: m.atkAnim,
    skin: d.skin, face: d.face, glow: d.glow, joint: d.joint, hair: d.hair, outfit: d.outfit, outfit2: U.shade(d.outfit, -0.3), pants: U.shade(d.outfit, -0.4),
    bones: d.bones, jiangshi: d.jiangshi, fox: d.fox, wtype: d.weapon || 'none',
    hat: d.viking ? 'viking' : d.hood ? 'hood' : null, hatColor: d.viking ? '#6a6a60' : d.hood,
    hairStyle: d.fox || d.hood ? 'long' : 'short', scale: d.scale || 1, eye: d.element === 'undead' && !d.bones ? '#60f0e0' : undefined,
  });
};

// มอนสเตอร์แอนดรอยด์: ไฟเปลี่ยนเป็นสีแดงเมื่อเข้าโจมตี
Sprites.mobAndroid = (g, x, y, m, t) => {
  const L = m.def.look, sc = m.def.scale || 1;
  Sprites.shadow(g, x, y, 12 * sc * (L.bulky || 1), 4 * sc, L.hover ? 0.18 : 0.28);
  Sprites.human(g, x, y, Object.assign({}, L, {
    facing: m.facing, dir: m.dir, t: t + m.seed * 10, seedT: m.seed * 7, moving: m.moving, atk: m.atkAnim, scale: sc,
    glow: m.state === 'chase' && !m.def.boss ? '#ff4a3a' : L.glow, pants: L.outfit2,
  }));
};
// ============================================================
//  ตัวละครจากภาพเดียว + แอนิเมชันด้วยโค้ด (มอนสเตอร์ / NPC / ผู้เล่น)
//  ท่าทาง: หายใจตอนนิ่ง, เหลียวมองเป็นครั้งคราว, กระโดดแบบย่อ-พุ่ง-ลงกระแทก,
//  เดินโยกซ้ายขวา, บินลอยเป็นเลข 8, พุ่งตี, สะดุ้งตอนโดนตี, ล้มตอนตาย
// ============================================================
const MOB_MOTION = { poring: 'hop', lunatic: 'hop', fabre: 'crawl', chonchon: 'fly', rocker: 'hop', willow: 'sway', spore: 'hop', quad: 'walk' };
Sprites.motion = (m, t, motion) => {
  const ph = t * (m.moving ? 7 : 2.2) + (m.seed || 0) * 10;
  const o = { lift: 0, sx: 1, sy: 1, rot: 0, dx: 0 };
  // หายใจ + เหลียวมองตอนยืนนิ่ง
  const breath = Math.sin(ph) * 0.02;
  const glance = Math.sin(t * 0.37 + (m.seed || 0) * 20) > 0.93 ? 0.06 : 0;
  if (motion === 'hop') {
    if (m.moving) {
      const k = (ph * 0.8) % (Math.PI * 2) / (Math.PI * 2);   // รอบกระโดด 0..1
      if (k < 0.18) { const q = k / 0.18; o.sy = 1 - q * 0.22; o.sx = 1 + q * 0.18; }               // ย่อตัวเตรียม
      else if (k < 0.72) { const q = (k - 0.18) / 0.54; o.lift = Math.sin(q * Math.PI) * 12; o.sy = 1.12 - Math.abs(q - 0.5) * 0.2; o.sx = 0.92; o.rot = (0.5 - q) * 0.16; }
      else { const q = (k - 0.72) / 0.28; o.sy = 1 - Math.sin(q * Math.PI) * 0.25; o.sx = 1 + Math.sin(q * Math.PI) * 0.2; }   // ลงกระแทก
    } else { o.sy = 1 + breath * 1.5; o.sx = 1 - breath; o.rot = glance; }
  } else if (motion === 'fly') {
    o.lift = 12 + Math.sin(ph * 1.3) * 3 + Math.sin(ph * 2.6) * 1.2;
    o.dx = Math.sin(ph * 0.65) * 3;
    o.rot = Math.sin(ph * 0.65) * 0.08 + (m.moving ? (m.facing || 1) * 0.1 : 0);
  } else if (motion === 'crawl') {
    const w = m.moving ? Math.sin(ph * 2) : breath * 3;
    o.sx = 1 + w * 0.07; o.sy = 1 - w * 0.05; o.dx = m.moving ? Math.max(0, w) * 1.5 : 0;
  } else if (motion === 'sway') { o.rot = Math.sin(ph * 0.8) * 0.05 + glance; o.sy = 1 + breath; }
  else if (motion === 'float') { o.lift = 8 + Math.sin(ph * 0.9) * 4; o.rot = Math.sin(ph * 0.5) * 0.05; }
  else { // walk / human
    if (m.moving) { o.lift = Math.abs(Math.sin(ph * 1.2)) * 2.6; o.rot = Math.sin(ph * 1.2) * 0.06; o.sy = 1 + Math.abs(Math.sin(ph * 1.2)) * 0.03; }
    else { o.sy = 1 + breath; o.sx = 1 - breath * 0.5; o.rot = glance; }
  }
  // พุ่งตี / สะดุ้ง / ตาย
  if (m.atkAnim > 0) { const k = m.atkAnim; o.dx += (m.facing || 1) * k * 9; o.rot += (m.facing || 1) * k * 0.18; o.sx *= 1 + k * 0.1; o.sy *= 1 - k * 0.08; }
  if (m.hitFlash > 0) { o.dx -= (m.facing || 1) * m.hitFlash * 40; o.sx *= 1.06; o.sy *= 0.94; }
  if (m.sit) { o.sy *= 0.78; o.sx *= 1.06; o.rot = 0; o.lift = 0; }
  if (m.dead) { const k = Math.min(1, m.deathT / 0.45); o.rot += (m.facing || 1) * k * 1.35; o.lift = -k * 6; }
  return o;
};
Sprites.drawImageActor = (g, x, y, m, t, img, H, motion, flipSrc) => {
  const W = H * img.width / img.height;
  const o = Sprites.motion(m, t, motion);
  const sh = 1 - Math.min(0.5, Math.max(0, o.lift) / 40);
  Sprites.shadow(g, x, y, W * 0.36 * sh, W * 0.12 * sh, 0.32 * sh);
  g.save();
  g.translate(x + o.dx, y - o.lift);
  g.rotate(o.rot);
  g.scale((flipSrc ? -1 : 1) * (m.facing || 1) * o.sx, o.sy);
  if (m.state === 'chase' && !(m.def && m.def.boss)) { g.shadowColor = 'rgba(255,60,50,0.55)'; g.shadowBlur = 10; }
  else if (m.def && m.def.boss) { g.shadowColor = 'rgba(255,220,120,0.7)'; g.shadowBlur = 16; }
  g.drawImage(img, -W / 2, -H, W, H);
  g.restore();
};
Sprites.mobImage = (g, x, y, m, t, img) => {
  const d = m.def, s = (d.scale || 1) * (d.size || 1);
  const motion = d.wings ? 'fly' : d.id === 'hel_maiden' ? 'float' : (MOB_MOTION[d.sprite] || 'walk');
  const base = { hop: 40, fly: 40, crawl: 34, sway: 50, float: 52, walk: d.sprite === 'quad' ? 44 : 60 }[motion];
  Sprites.drawImageActor(g, x, y, m, t, img, base * s, motion, true);
};
Sprites.drawMob = (g, m, t) => {
  const x = m.x * TILE, y = m.y * TILE;
  g.save();
  if (m.dead) g.globalAlpha = Math.max(0, 1 - m.deathT / 0.8);
  if (m.hitFlash > 0) g.filter = 'brightness(2.2)';
  const art = typeof Art !== 'undefined' && Art.get('mobsprite_' + m.def.id);
  const ak = 'mob_' + m.def.id;
  if (typeof Anim !== 'undefined' && Anim.has(ak)) {
    const d = m.def, motion = d.wings ? 'fly' : (MOB_MOTION[d.sprite] || 'walk');
    const base = { hop: 40, fly: 40, crawl: 34, sway: 50, float: 52, walk: d.sprite === 'quad' ? 44 : 60 }[motion];
    const tr = Anim.track(m, t, m.atkAnim || 0, m.hitFlash > 0, !!m.dead);
    const mo = (motion === 'hop' || motion === 'fly' || motion === 'float') && !m.dead ? Sprites.motion(m, t, motion) : null; // ภาพวาดเท้าแตะพื้นทุกเฟรม เกมยกตัวให้เอง
    Anim.draw(g, x, y, ak, { facing: m.facing || 1, dir: m.dir, moving: m.moving, atk: tr.atk, hurt: tr.hurt, dead: m.dead, deathT: m.deathT, seed: m.x * 0.37, raise: mo ? Math.max(0, mo.lift) : 0 }, t, base * (d.scale || 1) * (d.size || 1));
  }
  else if (art) Sprites.mobImage(g, x, y, m, t, art);
  else switch (m.def.sprite) {
    case 'poring': Sprites.poring(g, x, y, m, t); break;
    case 'lunatic': Sprites.lunatic(g, x, y, m, t); break;
    case 'fabre': Sprites.fabre(g, x, y, m, t); break;
    case 'chonchon': Sprites.chonchon(g, x, y, m, t); break;
    case 'dummy': Sprites.dummy(g, x, y, m, t); break;
    case 'rocker': Sprites.rocker(g, x, y, m, t); break;
    case 'willow': Sprites.willow(g, x, y, m, t); break;
    case 'spore': Sprites.spore(g, x, y, m, t); break;
    case 'quad': Sprites.quad(g, x, y, m, t); break;
    case 'human': Sprites.mobHuman(g, x, y, m, t); break;
    case 'android': Sprites.mobAndroid(g, x, y, m, t); break;
  }
  g.filter = 'none';
  const hs = (m.def.scale || 1) * (m.def.size || 1);
  if (m.stunUntil > G.time) Sprites.stunStars(g, x, y - 38 * hs, t);
  if (m.slowUntil > G.time) {
    g.strokeStyle = 'rgba(150,220,255,0.8)'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(x, y, 16 * hs, 6 * hs, 0, 0, 7); g.stroke();
  }
  if (m.burnUntil > G.time) {
    for (let i = 0; i < 4; i++) {
      const k = (t * 1.8 + i * 0.25) % 1;
      g.fillStyle = `rgba(255,${120 + i * 30},40,${1 - k})`;
      g.beginPath(); g.ellipse(x + (i - 1.5) * 7 * hs, y - 10 - k * 26 * hs, 3.5 * (1 - k) + 1, 6 * (1 - k) + 1, 0, 0, 7); g.fill();
    }
  }
  if (m.poisonUntil > G.time) {
    g.fillStyle = 'rgba(140,60,200,0.7)';
    for (let i = 0; i < 3; i++) { const a = t * 2 + i * 2; g.beginPath(); g.arc(x + Math.cos(a) * 10, y - 30 - ((t * 20 + i * 10) % 20), 2.5, 0, 7); g.fill(); }
  }
  g.restore();
};

// ------------------------------------------------------------
//  NPC
// ------------------------------------------------------------
const NPC_LOOKS = {
  keeper:   { skin: '#f2f2f8', glow: '#c9a8ff', hair: '#c4b2ec', hairStyle: 'long', outfit: '#232a5e', outfit2: '#e2c677', hat: 'keeper', robe: true, cape: '#2e3878', halo: 'rainbow', visor: 'band' },
  jobmaster:{ skin: '#d8dce4', glow: '#6ac8ff', hair: '#5a6070', outfit: '#1e2a52', outfit2: '#c8a860', beard: '#c8ccd6', hat: 'runehood', hatColor: '#cfd4de', robe: true, cape: '#1e2a52', visor: 'band' },
  merchant: { skin: '#eceef2', glow: '#ffb43a', hair: '#dfe3ea', hairStyle: 'long', outfit: '#7a5234', outfit2: '#3a2a1a', apron: '#cdb385', hat: 'bandana', visor: 'band' },
  merchant2:{ skin: '#f2f3f6', glow: '#5aff7a', hair: '#7ccf9a', hairStyle: 'twin', outfit: '#2f7a48', outfit2: '#efe6cf', robe: true, visor: 'band' },
  smith:    { skin: '#c4c8d0', glow: '#ff9a3a', hair: '#2e3038', hairStyle: 'spiky', outfit: '#8a8e96', outfit2: '#3a3a40', apron: '#6e6a64', bulky: 1.15, visor: 'band' },
  refiner:  { skin: '#b8925a', glow: '#ff8a2a', hair: '#9a4a2a', outfit: '#9a7240', outfit2: '#6a2a22', apron: '#7a2e24', beard: '#b0482a', joint: '#3a2e26', hat: 'helmet', hatColor: '#a88048', bulky: 1.3, visor: 'slit' },
  nurse:    { skin: '#f6f6fa', glow: '#ff7ac0', hair: '#f4a8c8', hairStyle: 'long', outfit: '#ffffff', outfit2: '#f0a0c0', hat: 'nurse', robe: true, visor: 'band' },
  storage:  { skin: '#eef0f6', glow: '#7ae0c8', hair: '#3a4a6a', hairStyle: 'long', outfit: '#2e5a8a', outfit2: '#e8e0c8', hat: 'ribbon', robe: true, visor: 'band' },
  guide:    { skin: '#e6e8ee', glow: '#ff4a4a', hair: '#c8ccd4', outfit: '#e6e8ee', outfit2: '#a82a30', hat: 'viking', hatColor: '#d8d2c4', cape: '#a82a30', bulky: 1.1, visor: 'band' },
};
// ดาวหมุนเหนือหัวตอนมึน
Sprites.stunStars = (g, x, y, t) => {
  g.fillStyle = '#ffe060'; g.font = 'bold 12px sans-serif'; g.textAlign = 'center';
  for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1; g.fillText('★', x + Math.cos(a) * 12, y + Math.sin(a) * 4); }
};
Sprites.drawNpc = (g, n, t) => {
  const x = n.x * TILE + TILE / 2, y = n.y * TILE + TILE / 2 + 10;
  if (typeof Anim !== 'undefined' && Anim.has('npc_' + n.id)) { Anim.draw(g, x, y, 'npc_' + n.id, { facing: -1, seed: n.x * 0.1 }, t, 74); return; }
  const img = typeof Art !== 'undefined' && Art.get('npcsprite_' + n.id);
  if (img) { Sprites.drawImageActor(g, x, y, { facing: -1, moving: false, seed: n.x * 0.1 }, t, img, 74, 'walk', true); return; }
  Sprites.shadow(g, x, y, 12, 4);
  const look = NPC_LOOKS[n.look] || NPC_LOOKS.guide;
  Sprites.human(g, x, y, Object.assign({ facing: 1, dir: n.dir != null ? n.dir : 2, t: t + n.x, moving: false }, look));
};

// ------------------------------------------------------------
//  ผู้เล่น
// ------------------------------------------------------------
Sprites.drawPlayer = (g, p, t) => {
  const x = p.x * TILE, y = p.y * TILE;
  const job = JOBS[p.job];
  const wEntry = p.equip.weapon, wItem = wEntry ? ITEMS[wEntry.id] : null;
  const head = p.equip.head ? p.equip.head.id : null;
  const hatMap = { hat: 'hat', iron_helm: 'cap', ribbon: 'ribbon', seraph_wings: 'angel_wing' };
  const garment = p.equip.garment ? ITEMS[p.equip.garment.id].icon.c : job.cape || null;
  const gk = `${p.job}_${p.gender === 'm' ? 'm' : 'f'}`;
  if (typeof Anim !== 'undefined' && Anim.has(gk)) {
    if (Object.keys(p.buffs).length) { g.strokeStyle = `rgba(255,240,150,${0.25 + Math.sin(t * 4) * 0.15})`; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, 16, 6, 0, 0, 7); g.stroke(); }
    const tr = Anim.track(p, t, p.atkAnim || 0, false, !!p.dead);
    const stun = !p.dead && p.stunUntil > G.time ? { e: G.time - p.stunAt, r: p.stunUntil - G.time } : null;
    // โดนตี: ไม่ล้ม แค่สะดุ้ง (สั่นเล็กน้อย + แสงแดงจาก render) • ล้มเฉพาะตอนมึน
    const shake = (p.hurtFlash || 0) > 0 && !stun ? Math.sin(t * 90) * 1.5 : 0;
    Anim.draw(g, x + shake, y, gk, {
      facing: p.facing || 1, dir: p.dir, moving: p.moving && !p.sitting, atk: tr.atk, cast: !!p.cast, sit: p.sitting, dead: p.dead, deathT: tr.deathT,
      skill: p.skillPose != null && G.time - p.skillPose < 0.5 && G.time >= p.skillPose ? 1 - (G.time - p.skillPose) / 0.5 : 0,
      hurt: 0, stun,
    }, t, 68);
    if (stun) Sprites.stunStars(g, x, y - (stun.e < 0.3 || stun.r < 0.3 ? 56 : 30), t);
    return;
  }
  if (typeof Rig !== 'undefined' && Rig.enabled && Rig.get(gk)) {
    if (Object.keys(p.buffs).length) { g.strokeStyle = `rgba(255,240,150,${0.25 + Math.sin(t * 4) * 0.15})`; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, 16, 6, 0, 0, 7); g.stroke(); }
    const wt = wItem ? wItem.wtype : 'none';
    const casting = !!p.cast;
    Rig.draw(g, x, y, gk, {
      facing: p.facing || 1, moving: p.moving && !p.sitting && !casting, sit: p.sitting, dead: p.dead, deathT: 1,
      atk: casting ? 0.55 + Math.sin(t * 6) * 0.05 : p.atkAnim, atkKind: casting || wt === 'rod' ? 'cast' : wt === 'bow' ? 'bow' : 'melee',
      hurt: Math.max(0, (p.hurtFlash || 0) / 0.15) * 0.25,
    }, t, 68);
    return;
  }
  const img = typeof Art !== 'undefined' && Art.get(`hero_${gk}`);
  if (img) {
    if (Object.keys(p.buffs).length) { g.strokeStyle = `rgba(255,240,150,${0.25 + Math.sin(t * 4) * 0.15})`; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, 16, 6, 0, 0, 7); g.stroke(); }
    Sprites.drawImageActor(g, x, y, { facing: p.facing || 1, moving: p.moving && !p.sitting, atkAnim: p.atkAnim, hitFlash: p.hurtFlash, seed: 0.3, sit: p.sitting, dead: p.dead, deathT: 1 }, t, img, 66, 'walk', true);
    return;
  }
  Sprites.shadow(g, x, y, 12, 4);
  if (Object.keys(p.buffs).length) {
    g.strokeStyle = `rgba(255,240,150,${0.25 + Math.sin(t * 4) * 0.15})`; g.lineWidth = 2;
    g.beginPath(); g.ellipse(x, y, 16, 6, 0, 0, 7); g.stroke();
  }
  Sprites.human(g, x, y, {
    facing: p.facing, dir: p.dir, t, moving: p.moving, sit: p.sitting, dead: p.dead, atk: p.atkAnim,
    skin: (p.look && p.look.color) || '#e6e9ef', glow: (p.look && p.look.glow) || job.glow, hair: p.hair,
    hairStyle: (p.look && p.look.head) || (p.gender === 'f' ? 'long' : 'spiky'), visor: p.look && p.look.visor,
    bulky: p.gender === 'm' ? 1.08 : 1,
    outfit: job.outfit, outfit2: job.outfit2, pants: job.pants, robe: !!job.robe,
    wtype: wItem ? wItem.wtype : 'none', hat: head ? hatMap[head] : (job.jobHat || null),
    cape: garment,
  });
};

Sprites.drawAlly = (g, a, t) => {
  const x = a.x * TILE, y = a.y * TILE;
  g.save();
  const left = a.until - G.time;
  if (left < 3) g.globalAlpha = 0.5 + Math.sin(t * 12) * 0.3;
  Sprites.quad(g, x, y, a, t);
  g.restore();
};
Sprites.drawTrap = (g, tr, t) => {
  const x = tr.x * TILE, y = tr.y * TILE;
  const armed = G.time >= tr.armed;
  g.strokeStyle = armed ? `rgba(255,140,40,${0.6 + Math.sin(t * 6) * 0.3})` : 'rgba(200,200,200,0.5)';
  g.lineWidth = 2;
  g.beginPath(); g.ellipse(x, y, 12, 5, 0, 0, 7); g.stroke();
  g.fillStyle = '#6a5040'; g.beginPath(); g.ellipse(x, y, 7, 3, 0, 0, 7); g.fill();
  g.fillStyle = armed ? '#ff8030' : '#a0a0a0'; g.beginPath(); g.arc(x, y - 2, 2, 0, 7); g.fill();
};

// ------------------------------------------------------------
//  วัตถุฉาก
// ------------------------------------------------------------
// ต้นไม้/ของประดับจากภาพ: ตั้งตรง มีเงา ต้นไม้ไหวตามลม เสาพลังงาน/เห็ด/คริสตัลเรืองแสงเป็นจังหวะ
const PROP_H = { tree: 104, pine: 118, pylon: 50, crate: 34, scrap: 26, bush: 30, rock: 30, mushroom: 34, crystal: 38, lamp: 76, sign: 70 };
Sprites.drawProp = (g, o, t) => {
  const img = Art.get(o.img); if (!img) return;
  const x = o.x * TILE, y = o.y * TILE, H = (PROP_H[o.kind] || 40) * (o.s || 1), W = H * img.width / img.height;
  const sh = { tree: 0.42, pine: 0.34, lamp: 0.18, sign: 0.2 }[o.kind] || 0.4;
  Sprites.shadow(g, x + 3, y, W * sh, W * sh * 0.32, 0.3);
  g.save(); g.translate(x, y);
  if (o.kind === 'tree' || o.kind === 'pine' || o.kind === 'bush') {
    const sway = Math.sin(t * 1.1 + o.r * 10) * (o.kind === 'bush' ? 0.012 : 0.022);
    g.transform(1, 0, sway, 1, 0, 0); // เอียงเฉพาะส่วนบน (โคนอยู่กับที่)
  }
  if (o.kind === 'pylon' || o.kind === 'crystal' || o.kind === 'mushroom' || o.kind === 'lamp') {
    const pulse = 0.5 + 0.5 * Math.sin(t * 2 + o.r * 9);
    g.shadowColor = o.kind === 'crystal' ? `rgba(190,120,255,${0.6 * pulse})` : o.kind === 'mushroom' ? `rgba(120,255,160,${0.5 * pulse})` : `rgba(110,220,255,${0.6 * pulse})`;
    g.shadowBlur = 10 + pulse * 8;
  }
  g.drawImage(img, -W / 2, -H, W, H);
  g.restore();
};
// อาคารจากภาพ: วางทับฐานอาคาร (footprint) ตั้งตรง หลังคายื่นขึ้นไปด้านบน
Sprites.drawBuildingImg = (g, b, t) => {
  const img = Art.get(b.img); if (!img) return;
  const pw = b.w * TILE, cx = (b.x + b.w / 2) * TILE, by = (b.y + b.h) * TILE;
  let W = pw * 1.12, H = W * img.height / img.width;
  if (b.kind === 'castle') { H = Math.min(H, b.h * TILE * 2.4); W = H * img.width / img.height; }
  Sprites.shadow(g, cx + 8, by - 4, W * 0.44, W * 0.1, 0.16);
  g.drawImage(img, cx - W / 2, by - H + 6, W, H);
  if (b.label) {
    const ly = by - H + 6 - 14;
    g.font = '700 13px Kanit, "Noto Sans Thai", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = g.measureText(b.label).width + 18;
    g.fillStyle = 'rgba(6,12,24,0.82)'; g.fillRect(cx - w / 2, ly - 10, w, 20);
    g.save(); g.shadowColor = b.roof || '#6ad8ff'; g.shadowBlur = 8 + Math.sin(t * 3) * 3;
    g.strokeStyle = b.roof || '#6ad8ff'; g.lineWidth = 1.5; g.strokeRect(cx - w / 2, ly - 10, w, 20);
    g.fillStyle = '#fff'; g.fillText(b.label, cx, ly + 1); g.restore();
  }
};
Sprites.drawFountainImg = (g, f, t) => {
  const img = Art.get('prop_fountain'); if (!img) return;
  const x = f.x * TILE, y = (f.y + 1.6) * TILE, W = TILE * 3.9, H = W * img.height / img.width;
  g.drawImage(img, x - W / 2, y - H, W, H);
  // ประกายน้ำเคลื่อนไหวเหนือแกนพลังงาน
  for (let i = 0; i < 8; i++) {
    const k = (t * 0.9 + i / 8) % 1, a = i / 8 * Math.PI * 2 + t * 0.6;
    g.fillStyle = `rgba(170,240,255,${0.9 * (1 - k)})`;
    g.beginPath(); g.arc(x + Math.cos(a) * 14, y - H * 0.72 - k * 34, 1.6, 0, 7); g.fill();
  }
};
Sprites.drawTree = (g, o, t) => {
  const art = typeof Art !== 'undefined' && Art.get(o.kind === 'pine' ? 'prop_tree_pine' : 'prop_tree_round');
  if (art) { Sprites.drawProp(g, { kind: o.kind === 'pine' ? 'pine' : 'tree', img: o.kind === 'pine' ? 'prop_tree_pine' : 'prop_tree_round', x: o.x, y: o.y + 0.35, s: o.size, r: o.r }, t); return; }
  const x = o.x * TILE, y = o.y * TILE + TILE * 0.35, s = o.size;
  // เงานุ่ม
  const sg = g.createRadialGradient(x + 6, y, 2, x + 6, y, 24 * s);
  sg.addColorStop(0, 'rgba(0,0,0,0.32)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sg; g.beginPath(); g.ellipse(x + 6, y, 24 * s, 9 * s, 0, 0, 7); g.fill();
  const sway = Math.sin(t * 1.1 + o.r * 10) * 1.3;
  const OL = 'rgba(20,30,15,0.5)';
  if (o.kind === 'pine') {
    g.fillStyle = '#4a3020'; g.fillRect(x - 3.5, y - 16, 7, 16);
    g.fillStyle = '#6a4a30'; g.fillRect(x - 3.5, y - 16, 2.5, 16);
    for (let i = 0; i < 4; i++) {
      const w = (22 - i * 4.5) * s, top = y - 12 - i * 12 * s, sx = sway * (i / 3);
      const tip = top - 20 * s;
      g.fillStyle = U.shade(o.hue, -0.25 + i * 0.05);
      g.beginPath(); g.moveTo(x - w + sx, top + 2); g.lineTo(x + sx, tip); g.lineTo(x + w + sx, top + 2); g.quadraticCurveTo(x + sx, top + 7, x - w + sx, top + 2); g.fill();
      g.strokeStyle = OL; g.lineWidth = 1; g.stroke();
      g.fillStyle = U.shade(o.hue, 0.02 + i * 0.05);
      g.beginPath(); g.moveTo(x - w * 0.8 + sx, top); g.lineTo(x + sx, tip + 2); g.lineTo(x + sx - 1, top + 3); g.closePath(); g.fill();
    }
    return;
  }
  // ลำต้น + ราก
  g.fillStyle = '#5a3a22';
  g.beginPath(); g.moveTo(x - 5, y); g.quadraticCurveTo(x - 3.5, y - 12, x - 4, y - 22); g.lineTo(x + 4, y - 22); g.quadraticCurveTo(x + 3.5, y - 12, x + 5, y); g.closePath(); g.fill();
  g.strokeStyle = OL; g.lineWidth = 1; g.stroke();
  g.fillStyle = '#7a5434'; g.fillRect(x - 3.5, y - 20, 2.2, 18);
  g.fillStyle = '#4a3020'; g.beginPath(); g.ellipse(x - 6, y - 1, 3.5, 1.8, -0.3, 0, 7); g.fill(); g.beginPath(); g.ellipse(x + 6, y - 1, 3.5, 1.8, 0.3, 0, 7); g.fill();
  // พุ่มใบ 3 ชั้นแสงเงา
  const c = o.hue, cx = x + sway, cy = y - 34 * s;
  const blobs = [[-13, 6, 11], [13, 6, 11], [0, 9, 12], [-8, -5, 12], [8, -6, 12], [0, -13, 11], [-15, -3, 8], [15, -3, 8]];
  g.fillStyle = U.shade(c, -0.32);
  g.beginPath(); for (const [bx, by, r] of blobs) { g.moveTo(cx + bx * s + r * s, cy + by * s + 3); g.arc(cx + bx * s, cy + by * s + 3, r * s, 0, 7); } g.fill();
  g.strokeStyle = OL; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = U.shade(c, -0.08);
  g.beginPath(); for (const [bx, by, r] of blobs) { g.moveTo(cx + bx * s + r * s * 0.9, cy + by * s); g.arc(cx + bx * s, cy + by * s, r * s * 0.9, 0, 7); } g.fill();
  g.fillStyle = U.shade(c, 0.14);
  g.beginPath();
  for (const [bx, by, r] of [[-8, -8, 7], [1, -15, 7], [-14, -4, 4.5], [7, -9, 5]]) { g.moveTo(cx + bx * s + r * s, cy + by * s); g.arc(cx + bx * s, cy + by * s, r * s, 0, 7); }
  g.fill();
  g.fillStyle = 'rgba(255,255,200,0.22)'; g.beginPath(); g.ellipse(cx - 6 * s, cy - 14 * s, 5 * s, 3 * s, -0.4, 0, 7); g.fill();
  if (o.r > 0.78) {
    g.fillStyle = '#e03a30';
    for (const [ax, ay] of [[6, 2], [-5, -7], [10, -8], [-10, 4]]) { g.beginPath(); g.arc(cx + ax * s, cy + ay * s, 2.3, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,0.6)'; for (const [ax, ay] of [[6, 2], [-5, -7]]) g.fillRect(cx + ax * s - 1, cy + ay * s - 1.5, 1, 1);
  }
};

Sprites.drawPortal = (g, p, t) => {
  const x = p.x * TILE + TILE / 2, y = p.y * TILE + TILE / 2;
  for (let i = 0; i < 4; i++) {
    const k = ((t * 0.8 + i / 4) % 1);
    g.strokeStyle = `rgba(${120 + i * 30},${200 + i * 10},255,${1 - k})`;
    g.lineWidth = 3;
    g.beginPath(); g.ellipse(x, y, 6 + k * 20, (6 + k * 20) * 0.45, 0, 0, 7); g.stroke();
  }
  g.fillStyle = 'rgba(160,220,255,0.35)';
  g.beginPath(); g.ellipse(x, y, 20, 9, 0, 0, 7); g.fill();
  for (let i = 0; i < 6; i++) {
    const a = t * 2 + i * 1.05, h = (t * 30 + i * 13) % 40;
    g.fillStyle = `rgba(200,240,255,${1 - h / 40})`;
    g.fillRect(x + Math.cos(a) * 14 - 1, y - h, 2, 4);
  }
};

// ------------------------------------------------------------
//  ไอคอนไอเทม (แคชเป็น dataURL สำหรับ UI และเป็น canvas สำหรับพื้น)
// ------------------------------------------------------------
const _iconCache = {};
function drawIconShape(g, spec, S) {
  const c = spec.c;
  g.save(); g.scale(S / 24, S / 24);
  g.lineJoin = 'round';
  const outline = () => { g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1.2; g.stroke(); };
  switch (spec.s) {
    case 'potion':
      g.beginPath(); g.moveTo(9, 3); g.lineTo(15, 3); g.lineTo(15, 8); g.quadraticCurveTo(21, 11, 20, 17); g.quadraticCurveTo(19, 22, 12, 22); g.quadraticCurveTo(5, 22, 4, 17); g.quadraticCurveTo(3, 11, 9, 8); g.closePath();
      g.fillStyle = c; g.fill(); outline();
      g.fillStyle = '#c8a070'; g.fillRect(9, 1.5, 6, 3);
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(8.5, 14, 1.8, 3.5, 0.3, 0, 7); g.fill();
      break;
    case 'fruit':
      g.fillStyle = c; g.beginPath(); g.arc(12, 14, 8, 0, 7); g.fill(); outline();
      g.fillStyle = '#5a3a1a'; g.fillRect(11, 3, 2, 5);
      g.fillStyle = '#50a040'; g.beginPath(); g.ellipse(16, 5, 4, 2, -0.5, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(9, 11, 2, 0, 7); g.fill();
      break;
    case 'carrot':
      g.fillStyle = c; g.beginPath(); g.moveTo(6, 8); g.lineTo(18, 20); g.lineTo(11, 6); g.closePath(); g.fill(); outline();
      g.fillStyle = '#40a040'; g.beginPath(); g.moveTo(8, 7); g.lineTo(3, 2); g.lineTo(6, 8); g.lineTo(4, 5); g.fill(); g.fillRect(6, 2, 2, 6);
      break;
    case 'meat':
      g.fillStyle = '#f0ecd8'; g.fillRect(3, 16, 8, 3); g.beginPath(); g.arc(3, 16, 2, 0, 7); g.arc(3, 19, 2, 0, 7); g.fill();
      g.fillStyle = c; g.beginPath(); g.ellipse(14, 11, 8, 7, -0.5, 0, 7); g.fill(); outline();
      g.fillStyle = 'rgba(255,200,160,0.5)'; g.beginPath(); g.ellipse(12, 9, 3, 2, -0.5, 0, 7); g.fill();
      break;
    case 'grape':
      g.fillStyle = c;
      for (const [x, y] of [[8, 9], [13, 9], [18, 9], [10, 14], [15, 14], [12, 19]]) { g.beginPath(); g.arc(x, y, 3.4, 0, 7); g.fill(); outline(); }
      g.fillStyle = '#50a040'; g.fillRect(12, 2, 2, 5);
      break;
    case 'herb':
      g.fillStyle = c;
      for (const a of [-0.8, 0, 0.8]) { g.save(); g.translate(12, 20); g.rotate(a); g.beginPath(); g.ellipse(0, -8, 3.5, 8, 0, 0, 7); g.fill(); outline(); g.restore(); }
      g.fillStyle = '#3a6a2a'; g.fillRect(11, 16, 2, 7);
      break;
    case 'jar':
      g.fillStyle = c; g.beginPath(); g.ellipse(12, 15, 8, 7, 0, 0, 7); g.fill(); outline();
      g.fillStyle = '#e8d8b0'; g.fillRect(7, 4, 10, 5);
      break;
    case 'wing':
      g.fillStyle = c;
      g.beginPath(); g.moveTo(4, 20); g.quadraticCurveTo(2, 6, 20, 3); g.quadraticCurveTo(16, 8, 18, 10); g.quadraticCurveTo(12, 12, 15, 15); g.quadraticCurveTo(8, 16, 4, 20); g.fill(); outline();
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.moveTo(5, 18); g.quadraticCurveTo(8, 9, 18, 5); g.stroke();
      break;
    case 'blob':
      g.fillStyle = c; g.beginPath(); g.moveTo(12, 5); g.bezierCurveTo(20, 8, 21, 20, 12, 20); g.bezierCurveTo(3, 20, 4, 8, 12, 5); g.fill(); outline();
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(9, 11, 1.8, 3, 0.4, 0, 7); g.fill();
      break;
    case 'feather':
      g.fillStyle = c; g.beginPath(); g.ellipse(12, 12, 4, 10, 0.7, 0, 7); g.fill(); outline();
      g.strokeStyle = '#999'; g.beginPath(); g.moveTo(4, 21); g.lineTo(19, 4); g.stroke();
      break;
    case 'shell':
      g.fillStyle = c; g.beginPath(); g.arc(12, 14, 9, Math.PI, 0); g.lineTo(12, 20); g.closePath(); g.fill(); outline();
      g.strokeStyle = 'rgba(0,0,0,0.3)'; for (const a of [-2.4, -1.57, -0.7]) { g.beginPath(); g.moveTo(12, 19); g.lineTo(12 + Math.cos(a) * 9, 14 + Math.sin(a) * 9); g.stroke(); }
      break;
    case 'bone':
      g.fillStyle = c; g.save(); g.translate(12, 12); g.rotate(-0.8);
      g.fillRect(-8, -2, 16, 4); for (const sx of [-8, 8]) for (const sy of [-2.5, 2.5]) { g.beginPath(); g.arc(sx, sy, 3, 0, 7); g.fill(); }
      g.restore(); break;
    case 'claw':
      g.fillStyle = c;
      for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(5 + i * 5, 20); g.quadraticCurveTo(4 + i * 5, 8, 12 + i * 4, 3); g.quadraticCurveTo(9 + i * 5, 12, 9 + i * 5, 20); g.fill(); outline(); }
      break;
    case 'cloth':
      g.fillStyle = c; g.beginPath(); g.moveTo(4, 6); g.lineTo(20, 4); g.lineTo(19, 20); g.lineTo(5, 19); g.closePath(); g.fill(); outline();
      g.strokeStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.moveTo(8, 8); g.lineTo(9, 17); g.moveTo(14, 7); g.lineTo(15, 17); g.stroke();
      break;
    case 'gem':
      g.fillStyle = c; g.beginPath(); g.moveTo(12, 3); g.lineTo(20, 10); g.lineTo(12, 21); g.lineTo(4, 10); g.closePath(); g.fill(); outline();
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.moveTo(12, 3); g.lineTo(15, 10); g.lineTo(9, 10); g.fill();
      break;
    case 'ring':
      g.strokeStyle = c; g.lineWidth = 3; g.beginPath(); g.arc(12, 14, 6.5, 0, 7); g.stroke();
      g.fillStyle = '#e04060'; g.beginPath(); g.arc(12, 6.5, 3, 0, 7); g.fill();
      break;
    case 'card':
      g.fillStyle = '#f8f0d8'; rr(g, 5, 2, 14, 20, 2); g.fill(); outline();
      g.fillStyle = c; g.fillRect(7, 5, 10, 9);
      g.fillStyle = '#b09060'; g.fillRect(7, 16, 10, 1.5); g.fillRect(7, 18.5, 7, 1.5);
      break;
    case 'dagger': g.translate(12, 20); g.rotate(0.7); g.scale(1.2, 1.2); drawWeaponShape(g, 'dagger'); break;
    case 'sword': g.translate(7, 20); g.rotate(0.75); g.scale(0.72, 0.72); drawWeaponShape(g, 'sword'); break;
    case 'rod': g.translate(8, 21); g.rotate(0.6); g.scale(0.72, 0.72); drawWeaponShape(g, 'rod'); g.fillStyle = c; g.beginPath(); g.arc(0, -26, 4, 0, 7); g.fill(); break;
    case 'mace': g.translate(8, 21); g.rotate(0.6); g.scale(0.9, 0.9); drawWeaponShape(g, 'mace'); break;
    case 'axe': g.translate(8, 22); g.rotate(0.5); g.scale(0.8, 0.8); drawWeaponShape(g, 'axe'); break;
    case 'bow': g.translate(16, 12); g.scale(0.9, 0.9); g.strokeStyle = c; g.lineWidth = 3; g.beginPath(); g.arc(-8, 0, 14, -1.1, 1.1); g.stroke(); g.strokeStyle = '#eee'; g.lineWidth = 1; g.beginPath(); g.moveTo(-2, -12.5); g.lineTo(-2, 12.5); g.stroke(); break;
    case 'armor':
      g.fillStyle = c; g.beginPath(); g.moveTo(7, 3); g.lineTo(3, 7); g.lineTo(5, 11); g.lineTo(7, 10); g.lineTo(7, 21); g.lineTo(17, 21); g.lineTo(17, 10); g.lineTo(19, 11); g.lineTo(21, 7); g.lineTo(17, 3); g.lineTo(14, 5); g.lineTo(10, 5); g.closePath(); g.fill(); outline();
      break;
    case 'hat':
      g.fillStyle = c; g.fillRect(2, 15, 20, 4); rr(g, 6, 5, 12, 11, 3); g.fill(); outline();
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(6, 12, 12, 2);
      break;
    case 'ribbon':
      g.fillStyle = c; g.beginPath(); g.moveTo(12, 12); g.lineTo(3, 5); g.lineTo(3, 19); g.closePath(); g.fill(); outline();
      g.beginPath(); g.moveTo(12, 12); g.lineTo(21, 5); g.lineTo(21, 19); g.closePath(); g.fill(); outline();
      g.beginPath(); g.arc(12, 12, 3, 0, 7); g.fill();
      break;
    case 'shield':
      g.fillStyle = c; g.beginPath(); g.moveTo(12, 2); g.lineTo(21, 5); g.quadraticCurveTo(21, 16, 12, 22); g.quadraticCurveTo(3, 16, 3, 5); g.closePath(); g.fill(); outline();
      g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(11, 5, 2, 14); g.fillRect(6, 10, 12, 2);
      break;
    case 'shoes':
      g.fillStyle = c; g.beginPath(); g.moveTo(5, 5); g.lineTo(11, 5); g.lineTo(11, 14); g.lineTo(20, 16); g.lineTo(20, 20); g.lineTo(5, 20); g.closePath(); g.fill(); outline();
      break;
    default:
      g.fillStyle = c; g.fillRect(5, 5, 14, 14);
  }
  g.restore();
}
function itemIconCanvas(id, S = 24) {
  const key = id + '@' + S;
  if (_iconCache[key]) return _iconCache[key];
  const c = document.createElement('canvas'); c.width = S; c.height = S;
  const ak = Art.itemKey(id);
  if (ak) { const im = Art.get(ak), k = S / Math.max(im.width, im.height); c.getContext('2d').drawImage(im, (S - im.width * k) / 2, (S - im.height * k) / 2, im.width * k, im.height * k); }
  else drawIconShape(c.getContext('2d'), ITEMS[id].icon, S);
  _iconCache[key] = c;
  return c;
}
const _iconUrl = {};
function clearIconCache() { for (const k in _iconCache) delete _iconCache[k]; for (const k in _iconUrl) delete _iconUrl[k]; }
function itemIconUrl(id) {
  const ak = Art.itemKey(id);
  if (ak) return Art.get(ak).src;
  if (!_iconUrl[id]) _iconUrl[id] = itemIconCanvas(id, 48).toDataURL();
  return _iconUrl[id];
}
