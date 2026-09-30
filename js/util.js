'use strict';
// ============================================================
//  ฟังก์ชันช่วยเหลือทั่วไป + การหาเส้นทาง (A*)
// ============================================================

const U = {
  rand: (a, b) => a + Math.random() * (b - a),
  randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  dist: (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by),
  chance: p => Math.random() < p,
  pick: arr => arr[Math.floor(Math.random() * arr.length)],
  fmt: n => Math.floor(n).toLocaleString('en-US'),
  lerp: (a, b, t) => a + (b - a) * t,
  // RNG แบบกำหนด seed (mulberry32) สำหรับสร้างแผนที่ให้เหมือนเดิมทุกครั้ง
  seeded(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  hash2(x, y, s = 0) {
    let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  },
  // value noise แบบนุ่ม (ใช้ทำพื้นผิวหญ้า/ดินให้ต่อเนื่อง)
  vnoise(x, y, seed = 0) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
    const a = U.hash2(xi, yi, seed), b = U.hash2(xi + 1, yi, seed), c = U.hash2(xi, yi + 1, seed), d = U.hash2(xi + 1, yi + 1, seed);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  },
  fbm(x, y, seed = 0, oct = 3) {
    let v = 0, amp = 0.5, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) { v += U.vnoise(x * f, y * f, seed + i * 17) * amp; norm += amp; amp *= 0.5; f *= 2.03; }
    return v / norm;
  },
  // ผสมสี hex สองสี (k: 0..1) คืนค่า rgb()
  mix(h1, h2, k) {
    const p = h => { let c = h.replace('#', ''); if (c.length === 3) c = c.split('').map(ch => ch + ch).join(''); const n = parseInt(c, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const a = p(h1), b = p(h2);
    return `rgb(${(a[0] + (b[0] - a[0]) * k) | 0},${(a[1] + (b[1] - a[1]) * k) | 0},${(a[2] + (b[2] - a[2]) * k) | 0})`;
  },
  shade(hex, amt) {
    // ปรับความสว่างของสี hex (-1..1)
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(ch => ch + ch).join('');
    const n = parseInt(c, 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
    else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  },
  esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
};

// ------------------------------------------------------------
//  Binary heap สำหรับ A*
// ------------------------------------------------------------
class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(node) {
    const a = this.a; a.push(node);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]]; i = p;
    }
  }
  pop() {
    const a = this.a; const top = a[0]; const last = a.pop();
    if (a.length) {
      a[0] = last; let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1; let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top;
  }
}

// หาเส้นทาง 8 ทิศ ไม่ตัดมุม คืนค่า array ของ {x,y} (ช่อง) ไม่รวมจุดเริ่ม
// ถ้าจุดหมายเดินไม่ได้ จะไปช่องที่ใกล้ที่สุดเท่าที่ค้นเจอ
function findPath(map, sx, sy, tx, ty, maxNodes = 4000) {
  sx |= 0; sy |= 0; tx |= 0; ty |= 0;
  if (sx === tx && sy === ty) return [];
  const W = map.w;
  const key = (x, y) => y * W + x;
  const open = new MinHeap();
  const g = new Map(), came = new Map(), closed = new Set();
  const h = (x, y) => {
    const dx = Math.abs(x - tx), dy = Math.abs(y - ty);
    return (dx + dy) + (1.4142 - 2) * Math.min(dx, dy);
  };
  const sk = key(sx, sy);
  g.set(sk, 0);
  open.push({ x: sx, y: sy, f: h(sx, sy) });
  let best = { x: sx, y: sy, h: h(sx, sy) };
  let count = 0;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (open.size && count < maxNodes) {
    const cur = open.pop();
    const ck = key(cur.x, cur.y);
    if (closed.has(ck)) continue;
    closed.add(ck); count++;
    const ch = h(cur.x, cur.y);
    if (ch < best.h) best = { x: cur.x, y: cur.y, h: ch };
    if (cur.x === tx && cur.y === ty) { best = cur; break; }
    const cg = g.get(ck);
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (!map.walkable(nx, ny)) continue;
      if (dx && dy && (!map.walkable(cur.x + dx, cur.y) || !map.walkable(cur.x, cur.y + dy))) continue;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      const ng = cg + (dx && dy ? 1.4142 : 1);
      if (ng < (g.has(nk) ? g.get(nk) : Infinity)) {
        g.set(nk, ng); came.set(nk, ck);
        open.push({ x: nx, y: ny, f: ng + h(nx, ny) });
      }
    }
  }
  const path = [];
  let k = key(best.x, best.y);
  while (k !== sk && came.has(k)) {
    path.push({ x: k % W, y: (k / W) | 0 });
    k = came.get(k);
  }
  path.reverse();
  return path;
}

// ตรวจเส้นสายตา (สำหรับการยิงระยะไกล) ด้วยการเดินทีละช่อง
function lineOfSight(map, x0, y0, x1, y1) {
  const steps = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = Math.floor(x0 + (x1 - x0) * t), y = Math.floor(y0 + (y1 - y0) * t);
    if (map.isWallForSight(x, y)) return false;
  }
  return true;
}
