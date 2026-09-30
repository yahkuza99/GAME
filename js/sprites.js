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
function drawWeaponShape(g, wtype) {
  switch (wtype) {
    case 'sword':
      g.fillStyle = '#6a4a2a'; g.fillRect(-1.5, -2, 3, 7);
      g.fillStyle = '#c0a040'; g.fillRect(-5, -4, 10, 3);
      g.fillStyle = '#e4e8f0'; g.beginPath(); g.moveTo(-2.5, -4); g.lineTo(2.5, -4); g.lineTo(1.5, -26); g.lineTo(0, -29); g.lineTo(-1.5, -26); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(-0.5, -26, 1, 21);
      break;
    case 'dagger':
      g.fillStyle = '#5a3a1a'; g.fillRect(-1.5, -1, 3, 6);
      g.fillStyle = '#b09040'; g.fillRect(-4, -3, 8, 2);
      g.fillStyle = '#e4e8f0'; g.beginPath(); g.moveTo(-2, -3); g.lineTo(2, -3); g.lineTo(0, -15); g.closePath(); g.fill();
      break;
    case 'rod':
      g.fillStyle = '#8a5a2a'; g.fillRect(-1.5, -24, 3, 30);
      g.fillStyle = '#e050e0'; g.beginPath(); g.arc(0, -26, 4, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(-1, -27, 1.5, 0, 7); g.fill();
      break;
    case 'axe':
      g.fillStyle = '#6a4a2a'; g.fillRect(-1.5, -22, 3, 27);
      g.fillStyle = '#c8ccd8'; g.beginPath(); g.moveTo(1, -22); g.quadraticCurveTo(12, -24, 11, -13); g.quadraticCurveTo(6, -15, 1, -12); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(9, -21, 1.5, 7);
      break;
    case 'mace':
      g.fillStyle = '#6a4a2a'; g.fillRect(-1.5, -16, 3, 21);
      g.fillStyle = '#a0a0b0'; g.beginPath(); g.arc(0, -19, 5, 0, 7); g.fill();
      g.fillStyle = '#707080';
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.fillRect(Math.cos(a) * 6 - 1, -19 + Math.sin(a) * 6 - 1, 2, 2); }
      break;
    case 'bow':
      g.strokeStyle = '#8a5a2a'; g.lineWidth = 2.5;
      g.beginPath(); g.arc(-8, 0, 16, -1.1, 1.1); g.stroke();
      g.strokeStyle = '#e8e8e8'; g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(-8 + Math.cos(-1.1) * 16, Math.sin(-1.1) * 16); g.lineTo(-8 + Math.cos(1.1) * 16, Math.sin(1.1) * 16); g.stroke();
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
  const walk = o.moving ? Math.sin(t * 14) : 0;
  const bob = o.moving ? Math.abs(Math.sin(t * 14)) * 1.6 : Math.sin(t * 2) * 0.5;
  const outfit = o.outfit || '#b8905a', outfit2 = o.outfit2 || '#7a5a33';
  const skin = o.skin || '#f6d7b8', pants = o.pants || '#5a4127';
  const OL = 'rgba(34,22,20,0.62)';
  const ol = (w = 1.1) => { g.lineWidth = w; g.strokeStyle = OL; g.stroke(); };
  if (o.dead) { g.rotate(Math.PI / 2); g.translate(-10, -6); }
  if (o.sit) g.translate(0, 7);
  const hy = -38;
  const eyesX = front ? [-4.3, 4.3] : side ? [7] : [2.2, 7.6];

  // หางจิ้งจอก
  if (o.fox) {
    for (let i = 0; i < 3; i++) {
      g.save(); g.translate(back ? 0 : -6, -14); g.rotate((back ? -0.3 : -0.9) - i * 0.35 + Math.sin(t * 3 + i) * 0.12);
      g.fillStyle = i % 2 ? '#f0a040' : '#f7c070';
      g.beginPath(); g.ellipse(0, -14, 5, 14, 0, 0, 7); g.fill(); ol(1);
      g.fillStyle = '#fff6e8'; g.beginPath(); g.ellipse(0, -25, 3, 4, 0, 0, 7); g.fill();
      g.restore();
    }
  }
  const drawCape = () => {
    if (!o.cape) return;
    g.fillStyle = back ? o.cape : U.shade(o.cape, -0.15);
    g.beginPath();
    if (back) { g.moveTo(-9, -28); g.lineTo(-12 - walk, -3); g.quadraticCurveTo(0, 0, 12 + walk, -3); g.lineTo(9, -28); }
    else if (side) { g.moveTo(-6, -28); g.lineTo(-14 - walk * 1.5, -4); g.lineTo(2, -6); g.lineTo(3, -28); }
    else { g.moveTo(-9, -27); g.lineTo(-13 - walk, -5); g.lineTo(13 + walk, -5); g.lineTo(9, -27); }
    g.closePath(); g.fill(); ol();
  };
  // ผมยาวด้านหลังลำตัว (มุมหน้า)
  const longHair = o.hair && (o.hairStyle === 'long' || o.hairStyle === 'twin');
  if (longHair && !back) {
    g.fillStyle = U.shade(o.hair, -0.12);
    g.beginPath(); g.ellipse(side ? -5 : 0, hy + 9, side ? 8 : 12, 13, 0, 0, 7); g.fill(); ol();
  }
  if (!back) drawCape();

  // แขน + อาวุธ
  const atk = o.atk || 0;
  const swing = atk > 0 ? Math.sin(atk * Math.PI) * 1.9 - 0.3 : walk * 0.45;
  const drawArm = (ax, rot, withWeapon, shade) => {
    g.save();
    g.translate(ax, -26);
    g.rotate(withWeapon && o.wtype === 'bow' ? -1.4 : rot);
    g.fillStyle = U.shade(outfit, shade);
    rr(g, -2.2, -1, 4.4, 11.5, 2); g.fill(); ol(1);
    g.fillStyle = skin; g.beginPath(); g.arc(0, 11.5, 2.4, 0, 7); g.fill(); ol(0.9);
    if (withWeapon && o.wtype && o.wtype !== 'none') {
      g.translate(0, 11.5);
      if (o.wtype === 'bow') { g.rotate(1.4); g.scale(-1, 1); g.translate(-4, 0); }
      else g.rotate(0.6);
      drawWeaponShape(g, o.wtype);
    }
    g.restore();
  };
  // ด้านหลัง: อาวุธอยู่หลังลำตัว
  if (back) drawArm(8, swing, true, -0.1);
  else if (!front) drawArm(side ? -3 : -8, -walk * 0.4, false, -0.25);

  // ขา
  if (o.sit) {
    g.fillStyle = pants;
    if (side) { rr(g, -6, -10, 17, 6, 2); g.fill(); ol(); g.fillStyle = '#3a2a1a'; g.fillRect(9, -10, 4, 6); }
    else { g.beginPath(); g.ellipse(0, -7, 12, 4.5, 0, 0, 7); g.fill(); ol(); }
  } else if (o.robe) {
    g.fillStyle = '#3a2a1a';
    if (side) { g.fillRect(-6 + walk * 2, -3, 6, 3); g.fillRect(1 - walk * 2, -3, 6, 3); }
    else { g.fillRect(-6, -3 - Math.max(0, walk) * 2, 5, 3); g.fillRect(1, -3 - Math.max(0, -walk) * 2, 5, 3); }
    const rg = g.createLinearGradient(-10, 0, 10, 0);
    rg.addColorStop(0, U.shade(outfit, 0.08)); rg.addColorStop(1, U.shade(outfit, -0.2));
    g.fillStyle = rg;
    g.beginPath(); g.moveTo(-8.5, -17); g.lineTo(-11 - (side ? walk : 0), -1.5); g.quadraticCurveTo(0, 1, 11 + (side ? -walk : 0), -1.5); g.lineTo(8.5, -17); g.closePath(); g.fill(); ol();
    g.fillStyle = outfit2; g.fillRect(-10.5, -4, 21, 2);
  } else {
    const leg = (lx, ly, lift) => {
      g.fillStyle = pants; rr(g, lx, -13 + ly, 5, 11 - lift, 1.5); g.fill(); ol(1);
      g.fillStyle = '#3a2a1a'; rr(g, lx - (side ? 0 : 0.5), -3.5 - lift + ly, side ? 7 : 6, 3.5, 1.2); g.fill(); ol(0.9);
    };
    if (side) { leg(-6 + walk * 3, 0, 0); leg(1 - walk * 3, 0, 0); }
    else { leg(-6, 0, Math.max(0, walk) * 2.5); leg(1, 0, Math.max(0, -walk) * 2.5); }
  }

  g.translate(0, -bob);
  // ลำตัว
  if (o.bones) {
    g.fillStyle = skin;
    for (let i = 0; i < 4; i++) g.fillRect(-7, -27 + i * 4, 14, 2);
    g.fillRect(-1.5, -28, 3, 16);
    g.fillRect(-6, -14, 12, 3);
  } else {
    const tw = side ? 14 : 17;
    const tg = g.createLinearGradient(-tw / 2, -28, tw / 2, -11);
    tg.addColorStop(0, U.shade(outfit, 0.12)); tg.addColorStop(1, U.shade(outfit, -0.18));
    g.fillStyle = tg;
    rr(g, -tw / 2, -28.5, tw, 17.5, 5); g.fill(); ol();
    g.fillStyle = outfit2;
    g.fillRect(-tw / 2 + 0.5, -15.5, tw - 1, 3);
    if (!back) {
      if (side) g.fillRect(3, -28, 2.5, 13);
      else { g.fillRect(-1.5, -28, 3, 13); g.fillStyle = '#e8c860'; g.fillRect(-2, -15.5, 4, 3); }
      if (o.cross) { g.fillStyle = '#d03030'; g.fillRect(-1.5, -26, 3, 9); g.fillRect(-4.5, -23, 9, 3); }
      if (o.apron) { g.fillStyle = o.apron; rr(g, -6, -20, 12, 10, 2); g.fill(); }
    }
  }
  if (back) drawCape();
  // แขนอีกข้าง
  if (front) drawArm(-9.5, -walk * 0.35, false, -0.12);
  if (back) drawArm(-8, -walk * 0.4, false, -0.2);

  // หัว
  if (longHair && back) {
    g.fillStyle = o.hair;
    g.beginPath(); g.ellipse(0, hy + 10, 11, 14, 0, 0, 7); g.fill(); ol();
  }
  const hg = g.createRadialGradient(-3, hy - 4, 2, 0, hy, 12);
  hg.addColorStop(0, U.shade(skin, 0.1)); hg.addColorStop(1, U.shade(skin, -0.08));
  g.fillStyle = hg;
  g.beginPath(); g.arc(0, hy, 11.5, 0, Math.PI * 2); g.fill(); ol(1.2);
  if (!back) {
    if (o.bones) {
      g.fillStyle = '#222';
      for (const ex of eyesX) { g.beginPath(); g.arc(ex, hy, 2.7, 0, 7); g.fill(); }
      g.fillRect(front ? -4 : 1, hy + 5, 8, 1.5);
    } else {
      const blink = (Math.floor(t * 10) % 40) === 0;
      g.fillStyle = o.eye || '#2a1a10';
      eyesX.forEach((ex, i) => {
        const narrow = !front && !side && i === 0 ? 0.8 : 1;
        if (blink) g.fillRect(ex - 1.8, hy + 1.5, 3.6, 1.4);
        else {
          g.beginPath(); g.ellipse(ex, hy + 1.5, 1.9 * narrow, 3, 0, 0, 7); g.fill();
          g.fillStyle = '#fff'; g.fillRect(ex - 0.8, hy - 0.6, 1.2, 1.2); g.fillStyle = o.eye || '#2a1a10';
        }
      });
      const mx = front ? 0 : side ? 8.5 : 5;
      g.strokeStyle = 'rgba(120,50,50,0.8)'; g.lineWidth = 1;
      g.beginPath(); g.arc(mx, hy + 6, 1.6, 0.3, Math.PI - 0.3); g.stroke();
      g.fillStyle = 'rgba(240,120,120,0.35)';
      if (front) { g.beginPath(); g.arc(-6.5, hy + 5, 2, 0, 7); g.fill(); g.beginPath(); g.arc(6.5, hy + 5, 2, 0, 7); g.fill(); }
      else { g.beginPath(); g.arc(side ? 7 : 8.5, hy + 5, 2, 0, 7); g.fill(); }
      if (o.beard) {
        g.fillStyle = o.beard;
        const bx = front ? 0 : side ? 6 : 4;
        g.beginPath(); g.moveTo(bx - 7, hy + 5); g.lineTo(bx + 7, hy + 5); g.lineTo(bx, hy + 18); g.closePath(); g.fill(); ol(1);
      }
    }
  }
  // ผม
  if (o.hair) {
    g.fillStyle = o.hair;
    if (back) {
      g.beginPath(); g.arc(0, hy - 0.5, 12, Math.PI * 0.9, Math.PI * 2.1); g.lineTo(11, hy + 7); g.quadraticCurveTo(0, hy + 10, -11, hy + 7); g.closePath(); g.fill(); ol();
      g.strokeStyle = U.shade(o.hair, -0.25); g.lineWidth = 1;
      for (const hx of [-5, 0, 5]) { g.beginPath(); g.moveTo(hx, hy - 9); g.quadraticCurveTo(hx + 1, hy, hx, hy + 7); g.stroke(); }
    } else if (front) {
      g.beginPath();
      g.moveTo(-12.3, hy + 4); g.quadraticCurveTo(-13.5, hy - 10, 0, hy - 13); g.quadraticCurveTo(13.5, hy - 10, 12.3, hy + 4);
      g.lineTo(10, hy - 2); g.lineTo(7, hy + 0.5); g.lineTo(4, hy - 4); g.lineTo(0.5, hy - 1); g.lineTo(-3, hy - 4.5); g.lineTo(-6.5, hy + 0.5); g.lineTo(-9.5, hy - 2);
      g.closePath(); g.fill(); ol();
    } else {
      // มุมข้าง / 3/4
      g.beginPath(); g.arc(0, hy - 1, 12, Math.PI * 0.95, Math.PI * 2.05); g.fill();
      g.beginPath(); g.moveTo(-11.5, hy - 2); g.quadraticCurveTo(-13.5, hy + 8, -8, hy + 10); g.lineTo(-4, hy - 2); g.fill();
      g.beginPath(); g.moveTo(-3, hy - 9); g.quadraticCurveTo(8, hy - 11, 12, hy - 3); g.lineTo(9.5, hy - 1); g.quadraticCurveTo(4, hy - 5.5, 0, hy - 4); g.fill();
      g.beginPath(); g.arc(0, hy - 1, 12, Math.PI * 0.95, Math.PI * 2.05); ol();
    }
    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.beginPath(); g.ellipse(-4, hy - 8, 4, 1.6, -0.4, 0, 7); g.fill();
    if (o.hairStyle === 'spiky') {
      g.fillStyle = o.hair;
      g.beginPath(); g.moveTo(-8, hy - 8); g.lineTo(-5, hy - 18); g.lineTo(-1, hy - 11); g.lineTo(3, hy - 17); g.lineTo(7, hy - 8); g.closePath(); g.fill(); ol();
    }
    if (o.hairStyle === 'twin') {
      g.fillStyle = o.hair;
      for (const sx of front || back ? [-1, 1] : [-1]) { g.beginPath(); g.ellipse(sx * 13, hy + 4, 4, 9, sx * 0.3, 0, 7); g.fill(); ol(); }
    }
  }
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
  if (o.hat === 'helmet') { g.fillStyle = '#b0b8c8'; g.beginPath(); g.arc(0, hy - 2, 12.5, Math.PI, 0); g.fill(); g.fillRect(-12.5, hy - 3, 25, 3); g.fillStyle = '#d03030'; g.fillRect(-1.5, hy - 20, 3, 8); }
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
  if (!back) drawArm(front ? 9.5 : side ? 2 : 7, swing, true, -0.05);
  g.restore();
};

// ------------------------------------------------------------
//  มอนสเตอร์
// ------------------------------------------------------------
Sprites.poring = (g, x, y, m, t) => {
  const d = m.def, s = (d.scale || 1) * (m.bossPulse || 1);
  const moving = m.moving;
  const ph = t * (moving ? 7 : 3) + m.seed * 10;
  const b = Math.abs(Math.sin(ph));
  const lift = moving ? b * 8 * s : 0;
  const sq = moving ? 1 - b : (Math.sin(ph) + 1) / 2 * 0.4;
  Sprites.shadow(g, x, y, 13 * s * (1 - lift / 40), 5 * s);
  g.save();
  g.translate(x, y - lift);
  g.scale((m.facing || 1) * s * (1 + 0.1 * sq), s * (1 - 0.1 * sq));
  if (d.wings) {
    const f = Math.sin(t * 8) * 0.3;
    g.fillStyle = '#ffffff'; g.strokeStyle = '#d8d0b0'; g.lineWidth = 1;
    for (const sx of [-1, 1]) {
      g.save(); g.translate(sx * 11, -14); g.rotate(sx * (-0.4 + f));
      g.beginPath(); g.ellipse(sx * 8, -4, 10, 5, sx * -0.5, 0, 7); g.fill(); g.stroke();
      g.beginPath(); g.ellipse(sx * 6, 2, 8, 4, sx * -0.2, 0, 7); g.fill(); g.stroke();
      g.restore();
    }
  }
  const grd = g.createRadialGradient(-5, -16, 2, 0, -10, 18);
  grd.addColorStop(0, U.shade(d.color, 0.55)); grd.addColorStop(0.6, d.color); grd.addColorStop(1, U.shade(d.color, -0.2));
  g.fillStyle = grd;
  g.beginPath();
  g.moveTo(0, -25);
  g.bezierCurveTo(6, -20, 16, -14, 15, -6);
  g.bezierCurveTo(14, 1, 7, 1, 0, 1);
  g.bezierCurveTo(-7, 1, -14, 1, -15, -6);
  g.bezierCurveTo(-16, -14, -6, -20, 0, -25);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.beginPath(); g.ellipse(-7, -14, 3, 5, 0.5, 0, 7); g.fill();
  g.fillStyle = '#2a1a1a';
  g.beginPath(); g.ellipse(-1, -9, 1.5, 2.6, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(6, -9, 1.5, 2.6, 0, 0, 7); g.fill();
  g.strokeStyle = '#6a2a2a'; g.lineWidth = 1.2;
  g.beginPath(); g.arc(2.5, -5.5, 2.5, 0.2, Math.PI - 0.2); g.stroke();
  g.fillStyle = 'rgba(255,100,120,0.4)';
  g.beginPath(); g.arc(-5, -5, 2, 0, 7); g.fill(); g.beginPath(); g.arc(10, -5, 2, 0, 7); g.fill();
  if (d.wings) {
    g.strokeStyle = '#f0d040'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(0, -31 + Math.sin(t * 3) * 1.5, 8, 2.5, 0, 0, 7); g.stroke();
  }
  g.restore();
};

Sprites.lunatic = (g, x, y, m, t) => {
  const ph = t * (m.moving ? 9 : 2) + m.seed * 10;
  const hop = m.moving ? Math.abs(Math.sin(ph)) * 7 : 0;
  Sprites.shadow(g, x, y, 11, 4);
  g.save(); g.translate(x, y - hop); g.scale(m.facing || 1, 1);
  for (const [ex, rot] of [[-3, -0.15], [3, 0.15]]) {
    g.save(); g.translate(ex, -18); g.rotate(rot + Math.sin(t * 3 + ex) * 0.05);
    g.fillStyle = '#fafafa'; g.beginPath(); g.ellipse(0, -10, 3.5, 11, 0, 0, 7); g.fill();
    g.fillStyle = '#f5b5c5'; g.beginPath(); g.ellipse(0, -10, 1.8, 8, 0, 0, 7); g.fill();
    g.restore();
  }
  g.fillStyle = '#fafafa';
  g.beginPath(); g.ellipse(0, -10, 12, 11, 0, 0, 7); g.fill();
  g.strokeStyle = '#d8d8e0'; g.lineWidth = 1; g.stroke();
  g.fillStyle = '#d02040'; g.beginPath(); g.arc(3, -12, 2, 0, 7); g.fill(); g.beginPath(); g.arc(8, -12, 1.8, 0, 7); g.fill();
  g.fillStyle = '#f090a0'; g.beginPath(); g.arc(7, -8, 1.3, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(-10, -6, 3.5, 0, 7); g.fill();
  g.restore();
};

Sprites.fabre = (g, x, y, m, t) => {
  Sprites.shadow(g, x, y, 14, 4);
  g.save(); g.translate(x, y); g.scale(m.facing || 1, 1);
  const ph = t * (m.moving ? 8 : 2) + m.seed * 10;
  for (let i = 3; i >= 0; i--) {
    const sx = -12 + i * 7, sy = -6 - Math.abs(Math.sin(ph + i)) * 2;
    g.fillStyle = i % 2 ? '#7ec04a' : '#8fd35a';
    g.beginPath(); g.arc(sx, sy, 6 + (i === 3 ? 1.5 : 0), 0, 7); g.fill();
    g.fillStyle = '#5a8a30'; g.fillRect(sx - 1, sy + 4, 2, 3);
  }
  g.fillStyle = '#2a2a1a'; g.beginPath(); g.arc(12, -8, 1.6, 0, 7); g.fill();
  g.strokeStyle = '#5a8a30'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(9, -12); g.quadraticCurveTo(10, -19, 14, -20); g.stroke();
  g.fillStyle = '#e04040'; g.beginPath(); g.arc(14, -20, 1.8, 0, 7); g.fill();
  g.restore();
};

Sprites.chonchon = (g, x, y, m, t) => {
  const hov = 14 + Math.sin(t * 5 + m.seed * 9) * 3;
  Sprites.shadow(g, x, y, 8, 3, 0.2);
  g.save(); g.translate(x, y - hov); g.scale(m.facing || 1, 1);
  const f = Math.sin(t * 40) > 0;
  g.fillStyle = 'rgba(220,240,255,0.7)';
  g.beginPath(); g.ellipse(-3, -8, 7, f ? 4 : 2, -0.6, 0, 7); g.fill();
  g.beginPath(); g.ellipse(3, -8, 7, f ? 4 : 2, 0.6, 0, 7); g.fill();
  g.fillStyle = '#e8c830'; g.beginPath(); g.ellipse(-3, 0, 7, 5.5, 0, 0, 7); g.fill();
  g.fillStyle = '#2a2a2a'; g.fillRect(-6, -4, 2, 8); g.fillRect(-2, -5, 2, 10);
  g.beginPath(); g.arc(5, -1, 5, 0, 7); g.fill();
  g.fillStyle = '#e04040'; g.beginPath(); g.arc(7, -2, 2, 0, 7); g.fill();
  g.restore();
};

Sprites.rocker = (g, x, y, m, t) => {
  Sprites.shadow(g, x, y, 13, 4);
  g.save(); g.translate(x, y); g.scale(m.facing || 1, 1);
  const ph = t * (m.moving ? 10 : 2) + m.seed * 10;
  g.strokeStyle = '#5a8a2a'; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(-4, -10); g.lineTo(-12, -20 + Math.sin(ph) * 2); g.lineTo(-10, 0); g.stroke();
  g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(2, -8); g.lineTo(4, 0); g.moveTo(6, -8); g.lineTo(9, 0); g.stroke();
  g.fillStyle = '#7cb342'; g.beginPath(); g.ellipse(-2, -11, 12, 6, -0.15, 0, 7); g.fill();
  g.fillStyle = '#9ccc65'; g.beginPath(); g.ellipse(-4, -13, 9, 3, -0.15, 0, 7); g.fill();
  g.fillStyle = '#7cb342'; g.beginPath(); g.arc(11, -16, 6, 0, 7); g.fill();
  g.fillStyle = '#2a2a1a'; g.beginPath(); g.arc(13, -17, 2, 0, 7); g.fill();
  g.strokeStyle = '#5a8a2a'; g.lineWidth = 1; g.beginPath(); g.moveTo(12, -21); g.lineTo(18, -30); g.moveTo(10, -21); g.lineTo(13, -31); g.stroke();
  // ไวโอลิน
  g.fillStyle = '#a0522d'; g.beginPath(); g.ellipse(14, -8, 3, 5, 0.4, 0, 7); g.fill();
  g.restore();
};

Sprites.willow = (g, x, y, m, t) => {
  Sprites.shadow(g, x, y, 14, 5);
  g.save(); g.translate(x, y); g.scale(m.facing || 1, 1);
  const sw = Math.sin(t * 2 + m.seed * 5) * 0.06;
  g.rotate(sw);
  g.fillStyle = '#7a5230';
  g.beginPath(); g.moveTo(-10, 0); g.lineTo(-8, -26); g.lineTo(8, -26); g.lineTo(10, 0); g.closePath(); g.fill();
  g.fillStyle = '#5a3a1a';
  g.beginPath(); g.moveTo(-10, 0); g.lineTo(-15, 2); g.lineTo(-8, -4); g.fill();
  g.beginPath(); g.moveTo(10, 0); g.lineTo(15, 2); g.lineTo(8, -4); g.fill();
  g.fillStyle = '#1a0a00';
  g.beginPath(); g.ellipse(-3, -16, 2.5, 3.5, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(4, -16, 2.5, 3.5, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(0, -8, 4, 2.5, 0, 0, 7); g.fill();
  g.fillStyle = '#5a9a3a';
  for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(-10 + i * 5, -28 - (i % 2) * 4, 6, 0, 7); g.fill(); }
  g.restore();
};

Sprites.spore = (g, x, y, m, t) => {
  const hop = m.moving ? Math.abs(Math.sin(t * 8 + m.seed * 9)) * 5 : 0;
  Sprites.shadow(g, x, y, 12, 4);
  g.save(); g.translate(x, y - hop); g.scale(m.facing || 1, 1);
  g.fillStyle = '#f4ead0'; rr(g, -7, -16, 14, 16, 5); g.fill();
  g.fillStyle = '#2a1a10'; g.beginPath(); g.arc(-1, -9, 1.5, 0, 7); g.fill(); g.beginPath(); g.arc(4, -9, 1.5, 0, 7); g.fill();
  g.fillStyle = '#d8433a';
  g.beginPath(); g.ellipse(0, -18, 15, 10, 0, Math.PI, 0); g.fill();
  g.fillStyle = '#b8332a'; g.fillRect(-15, -18, 30, 2);
  g.fillStyle = '#fff';
  for (const [sx, sy, r] of [[-7, -22, 2.5], [2, -25, 3], [9, -20, 2]]) { g.beginPath(); g.arc(sx, sy, r, 0, 7); g.fill(); }
  g.restore();
};

Sprites.quad = (g, x, y, m, t) => {
  const d = m.def, s = (d.size || 1) * (d.scale || 1);
  const ph = t * (m.moving ? 12 : 2) + m.seed * 10;
  const lg = m.moving ? Math.sin(ph) * 3 : 0;
  Sprites.shadow(g, x, y, 16 * s, 5 * s);
  g.save(); g.translate(x, y); g.scale((m.facing || 1) * s, s);
  g.fillStyle = d.color2;
  g.fillRect(-11 + lg, -9, 4, 9); g.fillRect(6 - lg, -9, 4, 9);
  g.fillStyle = d.color;
  g.fillRect(-8 - lg, -9, 4, 9); g.fillRect(9 + lg, -9, 4, 9);
  // หาง
  g.strokeStyle = d.color; g.lineWidth = 4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-13, -14); g.quadraticCurveTo(-20, -18 + Math.sin(t * 5) * 3, -19, -24); g.stroke();
  if (d.variant === 'raccoon') {
    g.strokeStyle = d.color2; g.lineWidth = 4;
    g.beginPath(); g.moveTo(-16, -17); g.lineTo(-17.5, -19); g.stroke();
    g.beginPath(); g.moveTo(-19, -22); g.lineTo(-19, -24); g.stroke();
  }
  g.lineCap = 'butt';
  g.fillStyle = d.color; g.beginPath(); g.ellipse(0, -14, 15, 8, 0, 0, 7); g.fill();
  g.fillStyle = U.shade(d.color, 0.25); g.beginPath(); g.ellipse(1, -11, 10, 4, 0, 0, 7); g.fill();
  // หัว
  g.fillStyle = d.color; g.beginPath(); g.ellipse(14, -20, 8, 7, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(20, -17, 5, 3.5, 0, 0, 7); g.fill();
  g.beginPath(); g.moveTo(9, -24); g.lineTo(11, -32); g.lineTo(15, -25); g.fill();
  if (d.variant !== 'bear') { g.beginPath(); g.moveTo(14, -25); g.lineTo(17, -32); g.lineTo(19, -24); g.fill(); }
  else { g.beginPath(); g.arc(11, -26, 3, 0, 7); g.fill(); g.beginPath(); g.arc(17, -26, 3, 0, 7); g.fill(); }
  if (d.variant === 'raccoon') { g.fillStyle = '#3a3a3a'; g.beginPath(); g.ellipse(16, -21, 4.5, 2.5, 0, 0, 7); g.fill(); }
  g.fillStyle = m.state === 'chase' ? '#e02020' : '#1a1a1a';
  g.beginPath(); g.arc(16, -21, 1.6, 0, 7); g.fill();
  g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(24.5, -17.5, 1.5, 0, 7); g.fill();
  if (d.tusk) { g.fillStyle = '#f4f0e0'; g.beginPath(); g.moveTo(20, -15); g.lineTo(23, -21); g.lineTo(22, -14); g.fill(); }
  g.restore();
};

Sprites.mobHuman = (g, x, y, m, t) => {
  const d = m.def;
  Sprites.shadow(g, x, y, 12 * (d.scale || 1), 4 * (d.scale || 1));
  const sway = d.jiangshi ? Math.abs(Math.sin(t * 6 + m.seed)) * 4 : 0;
  Sprites.human(g, x, y - sway, {
    facing: m.facing, dir: m.dir, t: t + m.seed * 10, moving: m.moving && !d.jiangshi, atk: m.atkAnim,
    skin: d.skin, hair: d.hair, outfit: d.outfit, outfit2: U.shade(d.outfit, -0.3), pants: U.shade(d.outfit, -0.4),
    bones: d.bones, jiangshi: d.jiangshi, fox: d.fox, wtype: d.weapon || 'none',
    hat: d.viking ? 'viking' : d.hood ? 'hood' : null, hatColor: d.viking ? '#6a6a60' : d.hood,
    hairStyle: d.fox || d.hood ? 'long' : 'short', scale: d.scale || 1, eye: d.element === 'undead' && !d.bones ? '#60f0e0' : undefined,
  });
};

Sprites.drawMob = (g, m, t) => {
  const x = m.x * TILE, y = m.y * TILE;
  g.save();
  if (m.dead) g.globalAlpha = Math.max(0, 1 - m.deathT / 0.8);
  if (m.hitFlash > 0) g.filter = 'brightness(2.2)';
  switch (m.def.sprite) {
    case 'poring': Sprites.poring(g, x, y, m, t); break;
    case 'lunatic': Sprites.lunatic(g, x, y, m, t); break;
    case 'fabre': Sprites.fabre(g, x, y, m, t); break;
    case 'chonchon': Sprites.chonchon(g, x, y, m, t); break;
    case 'rocker': Sprites.rocker(g, x, y, m, t); break;
    case 'willow': Sprites.willow(g, x, y, m, t); break;
    case 'spore': Sprites.spore(g, x, y, m, t); break;
    case 'quad': Sprites.quad(g, x, y, m, t); break;
    case 'human': Sprites.mobHuman(g, x, y, m, t); break;
  }
  g.filter = 'none';
  const hs = (m.def.scale || 1) * (m.def.size || 1);
  if (m.stunUntil > G.time) {
    for (let i = 0; i < 3; i++) {
      const a = t * 5 + i * 2.1;
      g.fillStyle = '#ffe060';
      g.font = 'bold 12px sans-serif'; g.textAlign = 'center';
      g.fillText('★', x + Math.cos(a) * 12, y - 38 * hs + Math.sin(a) * 4);
    }
  }
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
  keeper:   { hair: '#f0e8d0', hairStyle: 'long', outfit: '#2a3a6a', outfit2: '#f0d060', pants: '#2a3a6a', hat: 'keeper', robe: true, cape: '#4a6ab0' },
  jobmaster:{ hair: '#dcdcdc', outfit: '#3a4a6a', outfit2: '#e0c040', pants: '#2a3a4a', beard: '#e8e8e8', hat: 'runehood', hatColor: '#2a3450', robe: true, cape: '#2a3450' },
  merchant: { hair: '#4a2a1a', outfit: '#a07040', outfit2: '#5a3a1a', pants: '#4a3020', apron: '#e8e0c8', hat: 'bandana' },
  merchant2:{ hair: '#c09040', hairStyle: 'twin', outfit: '#3a9a5a', outfit2: '#e8e0c8', pants: '#2a5a3a', robe: true },
  smith:    { hair: '#2a2a2a', hairStyle: 'spiky', outfit: '#6a6a70', outfit2: '#3a3a40', pants: '#3a3a40', apron: '#6a4a2a' },
  refiner:  { hair: null, outfit: '#8a5a3a', outfit2: '#3a2a1a', pants: '#3a2a1a', apron: '#4a4a4a', beard: '#7a4a2a', skin: '#e8b890' },
  nurse:    { hair: '#e0a0b0', hairStyle: 'long', outfit: '#ffffff', outfit2: '#e0a0b0', pants: '#ffffff', hat: 'nurse', robe: true },
  guide:    { hair: '#c08040', outfit: '#6a7080', outfit2: '#a03030', pants: '#3a3a44', hat: 'viking', cape: '#a03030' },
};
Sprites.drawNpc = (g, n, t) => {
  const x = n.x * TILE + TILE / 2, y = n.y * TILE + TILE / 2 + 10;
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
  Sprites.shadow(g, x, y, 12, 4);
  if (Object.keys(p.buffs).length) {
    g.strokeStyle = `rgba(255,240,150,${0.25 + Math.sin(t * 4) * 0.15})`; g.lineWidth = 2;
    g.beginPath(); g.ellipse(x, y, 16, 6, 0, 0, 7); g.stroke();
  }
  Sprites.human(g, x, y, {
    facing: p.facing, dir: p.dir, t, moving: p.moving, sit: p.sitting, dead: p.dead, atk: p.atkAnim,
    skin: '#f6d7b8', hair: p.hair, hairStyle: p.gender === 'f' ? 'long' : 'spiky',
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
Sprites.drawTree = (g, o, t) => {
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
  drawIconShape(c.getContext('2d'), ITEMS[id].icon, S);
  _iconCache[key] = c;
  return c;
}
const _iconUrl = {};
function itemIconUrl(id) {
  if (!_iconUrl[id]) _iconUrl[id] = itemIconCanvas(id, 48).toDataURL();
  return _iconUrl[id];
}
