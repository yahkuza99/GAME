"""UI ไม้ v2 ("Wood UI v2") — เรนเดอร์วัสดุกรอบ/ปุ่ม/ช่อง ด้วย Blender (Cycles) → assets/ui3d_*.webp (9-slice / ไทล์ต่อกันไร้รอย)

แนวคิด "ภาพนูน 2.5 มิติ" (heightfield): ทุกชิ้นออกแบบเป็นสนามระยะ (SDF) ใน numpy → ได้แผนที่ความสูง + สีพื้น + ค่าวัสดุ
  (โลหะ/ความหยาบ/เคลือบเงา/กำมะหยี่) + ลายละเอียด (bump) แล้วสร้างเป็นเมชจริงใน Blender ให้ Cycles คำนวณแสงจริง:
  เงานุ่ม • ambient occlusion ในร่องแกะ • สะท้อนแสงของทองเหลือง • ลายเสี้ยนไม้นูน
แสงเดียวทั้งชุด: ดวงอาทิตย์อุ่นจาก "ซ้ายบน" (มุมเงย 42°) + ท้องฟ้าจำลองเป็นซอฟต์บ็อกซ์ซ้ายบน (ให้ขอบเอียงของทองเหลืองที่หันซ้ายบนสว่าง
  ขอบที่หันขวาล่างมืด) • กล้อง orthographic มองตรงลง (1 หน่วย = 1 พิกเซลของภาพ 2×)
ไทล์ไร้รอย: ลายไม้/กระดาษ/โลหะใช้ noise คาบ (FFT) • ขอบกรอบยาว 2W คาบ P → ตัดชิ้นขอบ 1 คาบต่อกันได้พอดี (border-image-repeat: round)
พื้นที่โปร่งใสใต้กรอบ = shadow catcher → เงาของกรอบ/หมุดตกบนเนื้อหาด้านในจริง (เก็บเป็นค่า alpha)

ใช้:
  /tmp/bvenv/bin/python tools/uiwood3d.py --render [--only frame,hud,...] [--samples 96] [--raw /tmp/uiwood3d_raw]
  /tmp/bvenv/bin/python tools/uiwood3d.py --install [--raw /tmp/uiwood3d_raw]     → assets/ui3d_<ชื่อ>.webp + assets/manifest.json
CSS ที่ใช้ภาพชุดนี้: css/theme5.css (ขนาด slice ใน CSS ต้องตรงกับค่า SLICE ด้านล่าง ÷ 2)
"""
import math, os, sys, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = '/tmp/uiwood3d_raw'

# ============================================================
#  numpy: noise คาบ + SDF
# ============================================================
import numpy as np


def pnoise(h, w, sy, sx, seed, octaves=1, gain=0.5):
    """noise ต่อเนื่องเป็นคาบ (ไทล์ไร้รอย) ขนาด h×w • sx/sy = ขนาดลวดลาย (px) ต่อแกน → ค่า ~[-1, 1]"""
    rng = np.random.default_rng(seed)
    fy = np.fft.fftfreq(h)[:, None]; fx = np.fft.fftfreq(w)[None, :]
    out = np.zeros((h, w)); amp = 1.0; tot = 0
    for o in range(octaves):
        k = 2 ** o
        g = np.exp(-((fx * sx / k) ** 2 + (fy * sy / k) ** 2) * 2 * math.pi ** 2 / 4)
        n = np.real(np.fft.ifft2(np.fft.fft2(rng.standard_normal((h, w))) * g))
        n /= (n.std() + 1e-9)
        out += n * amp; tot += amp; amp *= gain
    out /= tot
    return out / (np.abs(out).max() + 1e-9)


def sample(tex, s, u):
    """อ่านค่า tex (h×w คาบทั้งสองแกน) ที่พิกัด (แถว s, คอลัมน์ u) แบบ bilinear วนรอบ"""
    h, w = tex.shape
    s0 = np.floor(s).astype(int); u0 = np.floor(u).astype(int); fs = s - s0; fu = u - u0
    a = tex[s0 % h, u0 % w]; b = tex[s0 % h, (u0 + 1) % w]; c = tex[(s0 + 1) % h, u0 % w]; d = tex[(s0 + 1) % h, (u0 + 1) % w]
    return (a * (1 - fu) + b * fu) * (1 - fs) + (c * (1 - fu) + d * fu) * fs


def sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)


def sd_box(X, Y, cx, cy, hw, hh, r=0.0):
    qx = np.abs(X - cx) - hw + r; qy = np.abs(Y - cy) - hh + r
    return np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - r


def sd_chamfer(X, Y, cx, cy, hw, hh, c):
    """สี่เหลี่ยมตัดมุม 45° (ขนาดมุม c)"""
    qx = np.abs(X - cx) - hw; qy = np.abs(Y - cy) - hh
    box = np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0)
    diag = (np.abs(X - cx) + np.abs(Y - cy) - (hw + hh - c)) / math.sqrt(2)
    return np.maximum(box, diag)


def sd_circle(X, Y, cx, cy, r):
    return np.hypot(X - cx, Y - cy) - r


def sd_poly(X, Y, pts):
    """SDF ของรูปหลายเหลี่ยม (จุดเรียงตามลำดับ) — สูตร iq แบบเวกเตอร์"""
    P = np.array(pts, float); n = len(P)
    d = (X - P[0, 0]) ** 2 + (Y - P[0, 1]) ** 2; s = np.ones_like(X)
    for i in range(n):
        j = (i - 1) % n
        ex, ey = P[j] - P[i]; wx = X - P[i, 0]; wy = Y - P[i, 1]
        t = np.clip((wx * ex + wy * ey) / (ex * ex + ey * ey), 0, 1)
        bx = wx - ex * t; by = wy - ey * t
        d = np.minimum(d, bx * bx + by * by)
        c1 = Y >= P[i, 1]; c2 = Y < P[j, 1]; c3 = ex * wy > ey * wx
        flip = (c1 & c2 & c3) | (~c1 & ~c2 & ~c3)
        s = np.where(flip, -s, s)
    return s * np.sqrt(d)


def cover(sd, aa=0.7):
    """SDF → ค่าความครอบคลุม 0..1 (ขอบนุ่ม 1px)"""
    return np.clip(0.5 - sd / (2 * aa), 0, 1)


def bevel(sd, width, height, shape='round'):
    """ความสูงจาก SDF: ขอบเอียงกว้าง width สูงขึ้นถึง height ด้านใน"""
    t = np.clip(-sd / width, 0, 1)
    if shape == 'round': t = np.sqrt(1 - (1 - t) ** 2)
    elif shape == 'smooth': t = t * t * (3 - 2 * t)
    return t * height


def dome(X, Y, cx, cy, r, hgt):
    d2 = ((X - cx) ** 2 + (Y - cy) ** 2) / (r * r)
    return np.where(d2 < 1, hgt * np.sqrt(np.clip(1 - d2, 0, 1)), 0.0)


def srgb(c):
    return np.array([int(c[i:i + 2], 16) / 255 for i in (1, 3, 5)])


# ============================================================
#  วัสดุ (สีพื้น sRGB + ค่า metal/rough/coat/sheen + ลายละเอียด)
# ============================================================
class Layers:
    """ตัวสะสมชั้นวัสดุ: เพิ่มทีละชั้นด้วย mask (0..1)"""
    def __init__(self, shape):
        self.alb = np.zeros(shape + (3,)); self.par = np.zeros(shape + (4,)); self.det = np.zeros(shape); self.a = np.zeros(shape)

    def put(self, m, alb, par, det=0.0):
        m3 = m[..., None]
        self.alb = self.alb * (1 - m3) + np.asarray(alb) * m3
        self.par = self.par * (1 - m3) + np.asarray(par) * m3
        self.det = self.det * (1 - m) + det * m
        self.a = np.maximum(self.a, m)


def wood_tex(h, w, seed, along='x', dark=False, tone=1.0):
    """เสี้ยนไม้โอ๊คเข้ม (คาบ h×w) → (สี sRGB h×w×3, ลายนูน h×w) • along = แนวเสี้ยน"""
    if along == 'x': fib = pnoise(h, w, 1.6, 90, seed, 3, 0.55); warp = pnoise(h, w, 30, 260, seed + 1, 2)
    else: fib = pnoise(h, w, 90, 1.6, seed, 3, 0.55); warp = pnoise(h, w, 260, 30, seed + 1, 2)
    Yg, Xg = np.mgrid[0:h, 0:w].astype(float)
    across = Yg if along == 'x' else Xg
    rings = np.sin((across / 7.5 + warp * 5.5) * math.pi)            # วงปีไม้ (เส้นยาวโค้งไปมา)
    rings = np.sign(rings) * np.abs(rings) ** 0.6
    mot = pnoise(h, w, 60, 60, seed + 2, 2)                           # ด่างสีกว้าง ๆ
    pores = np.clip(pnoise(h, w, 0.8, 9, seed + 3) if along == 'x' else pnoise(h, w, 9, 0.8, seed + 3), 0, 1) ** 2
    v = 0.48 + 0.3 * rings + 0.18 * fib + 0.12 * mot - 0.4 * pores
    v = np.clip(v, 0, 1)
    lo, hi = (srgb('#160904'), srgb('#5a3217')) if dark else (srgb('#2a160a'), srgb('#6a4020'))
    col = lo + (hi - lo) * v[..., None]
    col = col * tone
    det = 0.55 * fib + 0.35 * rings - 0.9 * pores
    return np.clip(col, 0, 1), det


def brass_cols(cav, wear, seed_tex):
    """ทองเหลืองเก่า: ร่อง = คราบเข้ม • ขอบนูน = ขัดเงา"""
    base = srgb('#d0a048'); dark = srgb('#4e3010'); hi = srgb('#fff1c0')
    t = np.clip(cav, 0, 1)[..., None]; wv = np.clip(wear, 0, 1)[..., None]
    col = base * (1 - t) + dark * t
    col = col * (1 - wv) + hi * wv
    col = col * (0.94 + 0.06 * seed_tex[..., None])
    return np.clip(col, 0, 1)


# ============================================================
#  ชิ้นงาน (คืนค่า dict ของแผนที่ ที่พิกัด X, Y ใดก็ได้)
# ============================================================
# ขนาดภาพ 2× และขนาด slice (px ของภาพ) — CSS ใช้ค่าครึ่งหนึ่ง
SPEC = {
    'frame':  dict(W=448, H=448, C=96, P=128),      # กรอบหน้าต่าง: มุม 96 + ขอบ 2×128 + มุม 96
    'hud':    dict(W=224, H=224, C=48, P=64),       # กรอบแผง HUD
    'plaque': dict(W=304, H=88, C=88, P=64),        # ป้ายหัวหน้าต่าง: ปลาย 88 + กลาง 2×64 + ปลาย 88
    'tab':    dict(W=160, H=64, C=24, P=56),
    'tab_on': dict(W=160, H=64, C=24, P=56),
    'btn':    dict(W=160, H=88, C=26, P=54),        # ปุ่มรอง (ไม้)
    'btn_gold': dict(W=160, H=88, C=26, P=54),      # ปุ่มหลัก (ทองเหลือง)
    'close':  dict(W=76, H=76),
    'slot':   dict(W=96, H=96, C=24),
    'ring':   dict(W=336, H=336),
    'niche':  dict(W=240, H=240, C=60),
    'wood':   dict(W=512, H=256),
    'paper':  dict(W=512, H=512),
}


def frame_fields(X, Y, W, H, C, P, T, kind='frame'):
    """กรอบ 9-slice: แท่งไม้ 4 ด้าน (ต่อมุมแบบ miter ใต้ฝาครอบมุม) + ฝาครอบมุมทองเหลือง + หมุด"""
    L = Layers(X.shape)
    # พิกัดของแท่ง: u = ระยะจากขอบนอก, s = ระยะตามแนวแท่ง, side = ด้านที่ใกล้ที่สุด
    dl, dt, dr, db = X, Y, W - X, H - Y
    u = np.minimum(np.minimum(dl, dr), np.minimum(dt, db))
    horiz = np.minimum(dt, db) <= np.minimum(dl, dr)
    s = np.where(horiz, X, Y)
    # ไม้ (คาบ P ตามแนวแท่ง) — เสี้ยนวิ่งตามแท่ง
    gw, gd = wood_tex(64, P, 11 if kind == 'frame' else 21, along='x', dark=True)
    gwv, gdv = wood_tex(64, P, 12 if kind == 'frame' else 22, along='x', dark=True)
    sv = np.where(np.minimum(dt, dl) < np.minimum(db, dr), 0, 1)     # ด้านบน/ซ้าย กับ ด้านล่าง/ขวา ใช้ลายไม้คนละชุด (ไม่ซ้ำกันทั้งกรอบ)
    wc = np.where((sv == 0)[..., None], sample_rgb(gw, u, s), sample_rgb(gwv, u + 17, s))
    wd = np.where(sv == 0, sample(gd, u, s), sample(gdv, u + 17, s))
    if kind == 'frame':
        # หน้าตัดแท่ง (u: 0 → T): ขอบนอกมน • คิ้วเกลียวเชือก (แกะร่องเฉียง คาบ 8) • ร่อง V • พื้นไม้เรียบ • คิ้วทองเหลือง • ลาดลงด้านใน
        h = np.zeros_like(u)
        h = np.where(u < 2.5, 5 + 6 * np.sqrt(np.clip(u / 2.5, 0, 1)), h)
        tor = np.clip(1 - ((u - 7.75) / 5.25) ** 2, 0, 1)
        rope = 11 + 4.6 * np.sqrt(tor)
        ph = np.mod((s + (u - 7.75) * 1.1) / 8.0, 1.0)
        rope = rope - 1.9 * np.sqrt(tor) * np.exp(-((np.minimum(ph, 1 - ph)) / 0.11) ** 2)
        h = np.where((u >= 2.5) & (u < 13), np.maximum(11, rope), h)
        h = np.where((u >= 13) & (u < 14.5), 11 - 1.8 * np.sin((u - 13) / 1.5 * math.pi), h)
        h = np.where((u >= 14.5) & (u < 24), 11.3 + 0.9 * np.sin((u - 14.5) / 9.5 * math.pi), h)
        fil = 11.6 + 2.6 * np.sqrt(np.clip(1 - ((u - 26.25) / 2.25) ** 2, 0, 1))
        h = np.where((u >= 24) & (u < 28.5), fil, h)
        h = np.where((u >= 28.5) & (u < T), 11.5 * (1 - sstep(28.5, T, u)), h)
        h = np.where(u >= T, 0.0, h)
        brass_m = ((u >= 24) & (u < 28.5)).astype(float)
        wood_m = ((u < T) & (brass_m < 0.5)).astype(float)
    else:
        # HUD: แท่งบาง — ขอบนอกมน + พื้นไม้ + เส้นทองเหลืองด้านใน
        h = np.zeros_like(u)
        h = np.where(u < 2.5, 4 + 5 * np.sqrt(np.clip(u / 2.5, 0, 1)), h)
        h = np.where((u >= 2.5) & (u < 9), 9 + 0.8 * np.sin((u - 2.5) / 6.5 * math.pi), h)
        fil = 9.5 + 1.8 * np.sqrt(np.clip(1 - ((u - 11) / 2) ** 2, 0, 1))
        h = np.where((u >= 9) & (u < 13), fil, h)
        h = np.where((u >= 13) & (u < T), 9 * (1 - sstep(13, T, u)), h)
        h = np.where(u >= T, 0.0, h)
        brass_m = ((u >= 9) & (u < 13)).astype(float)
        wood_m = ((u < T) & (brass_m < 0.5)).astype(float)
    # ---------- ฝาครอบมุมทองเหลือง (4 มุม: รูปทรงเดียวกันสะท้อนพิกัด — แสงยังมาจากซ้ายบนทุกมุม) ----------
    a = np.minimum(X, W - X); b = np.minimum(Y, H - Y)
    if kind == 'frame':
        arm, aw, boss = 82, 38, 22
        cap = np.minimum.reduce([
            sd_poly(a, b, [(0, 0), (arm - 10, 0), (arm, aw / 2), (arm - 10, aw), (aw, aw), (aw, arm - 10), (aw / 2, arm), (0, arm - 10)]),
            sd_circle(a, b, 26, 26, boss)])
        ch = 17 + bevel(cap, 3.5, 3.0, 'round') + 1.8 * sstep(0, 16, -cap)
        bz = sd_circle(a, b, 26, 26, boss - 5)
        ch = ch + bevel(bz, 5, 4.5, 'round')                      # โดมกลาง
        ring = np.abs(sd_circle(a, b, 26, 26, boss - 8.5)) - 0.9     # วงแกะบนโดม
        ch = ch - 1.4 * cover(ring, 0.8)
        ch = ch + dome(a, b, 26, 26, 5.5, 3.0)                     # หมุดกลางโดม
        for i in range(8):                                          # วงเม็ดไข่ปลารอบโดม
            t = i * math.pi / 4
            ch = ch + dome(a, b, 26 + math.cos(t) * 11.5, 26 + math.sin(t) * 11.5, 1.9, 1.3)
        rv = np.maximum.reduce([dome(a, b, arm - 22, aw / 2, 4.6, 4.2), dome(a, b, aw / 2, arm - 22, 4.6, 4.2)])
        ch = ch + rv
        cavity_ring = cover(ring, 0.8)
    else:
        arm, aw = 40, 18
        cap = sd_poly(a, b, [(0, 0), (arm - 6, 0), (arm, aw / 2), (arm - 6, aw), (aw, aw), (aw, arm - 6), (aw / 2, arm), (0, arm - 6)])
        ch = 11.5 + bevel(cap, 2.5, 2.2, 'round')
        rv = dome(a, b, 9.5, 9.5, 3.6, 3.4)
        ch = ch + rv
        cavity_ring = np.zeros_like(a)
    capm = cover(cap)
    h = h * (1 - capm) + np.maximum(h, ch) * capm
    # ---------- วัสดุ ----------
    tex = sample(pnoise(64, 64, 6, 6, 5), a, b)
    edge_wear = np.clip(1 - np.abs(cap + 1.5) / 1.5, 0, 1) * 0.6
    cav = np.clip(0.55 * cavity_ring, 0, 1)
    bcol = brass_cols(cav, edge_wear, tex)
    frame_a = np.clip((T - u) + 0.5, 0, 1)        # ภายในเส้นขอบด้านใน = โปร่งใส (เหลือแต่เงา)
    wood_alb = wc * (0.85 + 0.15 * np.clip(h / 14, 0, 1))[..., None]
    L.put(frame_a * wood_m, wood_alb, (0, 0.5, 0.35, 0), wd * 0.8)
    bm = frame_a * brass_m
    fil_col = brass_cols(np.zeros_like(u) + 0.15, np.zeros_like(u), tex)
    L.put(bm, fil_col, (1, 0.32, 0, 0), tex * 0.05)
    L.put(capm, bcol, (1, 0.3 + 0.15 * cav.mean(), 0, 0), tex * 0.05)
    return dict(h=h, alb=L.alb, par=L.par, det=L.det, a=L.a)


def tx(t, X, Y):
    """อ่านไทล์คาบ t (H×W) ที่พิกัดภาพ X, Y (กึ่งกลางพิกเซล = .5)"""
    return sample(t, Y - 0.5, X - 0.5)


def sample_rgb(tex, s, u):
    return np.stack([sample(tex[..., i], s, u) for i in range(3)], -1)


def plaque_fields(X, Y, W, H, C, P):
    """ป้ายหัวหน้าต่าง: แผ่นไม้เข้มขอบเอียง + ฝาทองเหลืองสองข้าง (ปลายตัดมุม) + เส้นทองบน/ล่าง"""
    L = Layers(X.shape)
    pl = sd_chamfer(X, Y, W / 2, H / 2, W / 2 - 1, H / 2 - 1, 14)
    gw, gd = wood_tex(H, P, 31, 'x', dark=True)
    wc = sample_rgb(gw, Y, X); wd = sample(gd, Y, X)
    h = bevel(pl, 5, 9, 'round')
    # ขอบทองเหลืองด้านบน/ล่าง (แนวนอน)
    inner = sd_chamfer(X, Y, W / 2, H / 2, W / 2 - 7, H / 2 - 7, 9)
    rim = np.maximum(pl, -inner)          # แถบรอบนอก
    h = np.where(inner < 0, 7.5 + 0.8 * sstep(0, 10, -inner), h)
    # ฝาปลาย (ซ้าย/ขวา)
    a = np.minimum(X, W - X)
    caph = 10 + bevel(np.maximum(pl, a - 44), 3.5, 3, 'round')
    gem = sd_chamfer(a, Y, 22, H / 2, 9, 9, 6)                      # ปุ่มเพชรสี่เหลี่ยมตัดมุม
    caph = caph + bevel(gem, 3, 3, 'round')
    rv = np.maximum(dome(a, Y, 22, 13, 3.2, 2.8), dome(a, Y, 22, H - 13, 3.2, 2.8))
    caph = caph + rv
    capm = cover(np.maximum(pl, a - 44))
    h = h * (1 - capm) + caph * capm
    # ตัวไม้
    pm = cover(pl)
    tex = tx(pnoise(H, W, 5, 5, 8), X, Y)
    rimm = cover(rim) * (1 - capm)
    L.put(pm, wc * 0.95, (0, 0.5, 0.4, 0), wd * 0.8)
    L.put(rimm, brass_cols(np.zeros_like(X) + 0.2, np.zeros_like(X), tex), (1, 0.33, 0, 0), tex * 0.05)
    wear = np.clip(1 - np.abs(np.maximum(pl, a - 44) + 1.2) / 1.6, 0, 1) * 0.6
    L.put(capm, brass_cols(0.4 * cover(gem + 1.5) * (1 - cover(gem)), wear, tex), (1, 0.3, 0, 0), tex * 0.05)
    return dict(h=h, alb=L.alb, par=L.par, det=L.det, a=pm)


def button_fields(X, Y, W, H, C, P, kind):
    """ปุ่ม 9-slice ตัดมุม: ขอบโลหะเอียง + หน้านูนเล็กน้อย • gold = ทองเหลืองขัดเงา • wood = ไม้วอลนัทขอบทองเหลือง
       tab = แผ่นกระดาษอัดนูนขอบบรอนซ์ • tab_on = ทองเหลือง"""
    L = Layers(X.shape)
    ch = 12 if kind.startswith('tab') else 14
    sd = sd_chamfer(X, Y, W / 2, H / 2, W / 2 - 1, H / 2 - 1, ch)
    m = cover(sd)
    rim_w = 5 if kind.startswith('tab') else 6
    inner = sd_chamfer(X, Y, W / 2, H / 2, W / 2 - 1 - rim_w, H / 2 - 1 - rim_w, max(3, ch - rim_w * 0.6))
    tex = tx(pnoise(H, W, 0.7, 40, 9), X, Y)
    # ความสูง: ขอบนอกมน → ร่องเล็ก → หน้านูน (หน้ากลางเรียบเพื่อยืดได้)
    h = bevel(sd, 3, 7, 'round')
    face = 6.5 + bevel(inner, 7 if kind != 'tab' else 5, 2.6, 'smooth') + 1.6 * np.sin(np.clip(Y / H, 0, 1) * math.pi)
    groove = cover(np.abs(inner + 0.2) - 0.9, 0.7)
    h = np.where(inner < 0, face, h) - 1.3 * groove
    if kind == 'btn_gold' or kind == 'tab_on':
        rimc = brass_cols(np.zeros_like(X) + 0.1, np.clip(1 - np.abs(sd + 1.5) / 2, 0, 1) * 0.5, tex)
        facec = brass_cols(np.zeros_like(X), np.zeros_like(X) + 0.18, tex) * 1.02
        L.put(m, rimc, (1, 0.28, 0, 0), tex * 0.05)
        L.put(cover(inner) * m, np.clip(facec, 0, 1), (1, 0.22, 0, 0), tex * 0.03)
        L.put(groove * m, srgb('#4a2c0c'), (1, 0.5, 0, 0), 0)
    elif kind == 'btn':
        gw, gd = wood_tex(H, P, 41, 'x', dark=False)
        wc = sample_rgb(gw, Y, np.mod(X, P)); wd = sample(gd, Y, np.mod(X, P))
        rimc = brass_cols(np.zeros_like(X) + 0.15, np.clip(1 - np.abs(sd + 1.5) / 2, 0, 1) * 0.5, tex)
        L.put(m, rimc, (1, 0.3, 0, 0), tex * 0.05)
        L.put(cover(inner) * m, wc * 1.05, (0, 0.42, 0.55, 0), wd * 0.7)
        L.put(groove * m, srgb('#24130a'), (0, 0.7, 0, 0), 0)
    else:   # tab ปกติ: กระดาษอัดหนา ขอบบรอนซ์
        pap = srgb('#efdcb4') * (0.97 + 0.03 * tex[..., None])
        rimc = brass_cols(np.zeros_like(X) + 0.35, np.zeros_like(X), tex) * 0.92
        L.put(m, rimc, (1, 0.38, 0, 0), tex * 0.05)
        L.put(cover(inner) * m, pap, (0, 0.8, 0, 0), tx(pnoise(H, W, 1.2, 1.2, 3), X, Y) * 0.6)
        L.put(groove * m, srgb('#6e4a20'), (0, 0.8, 0, 0), 0)
    return dict(h=h, alb=L.alb, par=L.par, det=L.det, a=m)


def close_fields(X, Y, W, H):
    """ปุ่มปิด: แผ่นแปดเหลี่ยมทองเหลืองขอบเอียง + หน้าเหล็กดำลงยา + กากบาททองเหลืองนูน"""
    L = Layers(X.shape)
    c = W / 2
    sd = sd_chamfer(X, Y, c, c, c - 1.5, c - 1.5, 21)
    inner = sd_chamfer(X, Y, c, c, c - 9, c - 9, 15)
    h = bevel(sd, 5, 10, 'round')
    h = np.where(inner < 0, 7 - 1.5 * sstep(0, 4, -inner), h)
    rx, ry = (X - c), (Y - c)
    d1 = np.abs(rx - ry) / math.sqrt(2); d2 = np.abs(rx + ry) / math.sqrt(2)
    arm = np.maximum(np.minimum(d1, d2) - 3.6, np.maximum(np.abs(rx), np.abs(ry)) - 15)
    h = np.where(arm < 0, np.maximum(h, 6.5 + bevel(arm, 2.5, 4.5, 'round')), h)
    tex = tx(pnoise(H, W, 4, 4, 13), X, Y)
    m = cover(sd)
    L.put(m, brass_cols(np.zeros_like(X) + 0.1, np.clip(1 - np.abs(sd + 2) / 2.5, 0, 1) * 0.6, tex), (1, 0.3, 0, 0), tex * 0.05)
    L.put(cover(inner) * m, srgb('#1c1410') * (0.9 + 0.1 * tex[..., None]), (0.6, 0.38, 0.6, 0), tex * 0.05)
    L.put(cover(arm) * m, brass_cols(np.zeros_like(X), np.zeros_like(X) + 0.25, tex), (1, 0.25, 0, 0), tex * 0.05)
    return dict(h=h, alb=L.alb, par=L.par, det=L.det, a=m)


def slot_fields(X, Y, W, H, C):
    """ช่องเก็บของเว้าลึก: ขอบบรอนซ์เอียง + ผนังด้านในลาดลง • พื้นกลาง = shadow catcher (เงาเข้าด้านในจริง)"""
    L = Layers(X.shape)
    sd = sd_chamfer(X, Y, W / 2, H / 2, W / 2 - 0.5, H / 2 - 0.5, 9)
    rim_in = sd_chamfer(X, Y, W / 2, H / 2, W / 2 - 7, H / 2 - 7, 6)
    wall_in = sd_chamfer(X, Y, W / 2, H / 2, W / 2 - 11, H / 2 - 11, 4)
    h = bevel(sd, 3, 9, 'round')
    h = np.where(rim_in < 0, 9 - 9 * sstep(0, 4.5, -rim_in), h)          # ผนังลาดลงสู่พื้น
    tex = tx(pnoise(H, W, 4, 4, 17), X, Y)
    m = cover(sd) * (1 - cover(wall_in))
    L.put(cover(sd), brass_cols(np.zeros_like(X) + 0.3, np.clip(1 - np.abs(sd + 1.5) / 2, 0, 1) * 0.5, tex) * 0.92, (1, 0.34, 0, 0), tex * 0.05)
    wallm = cover(rim_in) * (1 - cover(wall_in))
    L.put(wallm, srgb('#2a1a0e'), (0, 0.6, 0.2, 0), tex * 0.05)
    L.a = m
    return dict(h=h, alb=L.alb, par=L.par, det=L.det, a=m)


def ring_fields(X, Y, W, H):
    """วงทองเหลืองรอบมินิแมพ: ขอบนอกมน • ร่อง • ขีดองศาแกะ • ขอบในเอียงลง"""
    L = Layers(X.shape)
    c = W / 2; r = np.hypot(X - c, Y - c); ang = np.arctan2(X - c, -(Y - c))
    R0, R1 = c - 1.5, c - 30
    sd = np.maximum(r - R0, R1 - r)
    h = bevel(sd, 4, 8, 'round')
    h = h + 2.5 * sstep(R1, R1 + 7, r) * (1 - sstep(R0 - 8, R0, r))
    # ขีดทุก 10° (ยาวทุก 45°)
    k = ang / (2 * math.pi) * 36
    dk = np.abs(k - np.round(k)) * (2 * math.pi / 36) * r
    big = (np.mod(np.round(k), 4.5) < 0.01) | (np.abs(np.mod(np.round(k) * 10, 45)) < 0.01)
    tick_len = np.where(big, 12, 7)
    card = np.minimum(np.abs(np.mod(ang + math.pi / 4, math.pi / 2) - math.pi / 4), 9) < math.radians(9)   # เว้นที่ให้อักษรทิศ
    tick = (dk < np.where(big, 1.6, 1.0)) & (r > R0 - 6 - tick_len) & (r < R0 - 6) & ~card
    h = h - 1.6 * tick
    # อักษรทิศ N E S W แกะลึกบนแถบ (เข้ม = คราบในร่อง) — N ใหญ่กว่า
    from PIL import Image, ImageDraw, ImageFont
    M = Image.new('L', (W, H), 0); dr = ImageDraw.Draw(M); rr = (R0 + R1) / 2 + 1
    for ch, a0, sz in (('N', 0, 25), ('E', 90, 20), ('S', 180, 20), ('W', 270, 20)):
        f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', sz)
        L1 = Image.new('L', (40, 40), 0); ImageDraw.Draw(L1).text((20, 20), ch, font=f, fill=255, anchor='mm')
        L1 = L1.rotate(-a0, resample=Image.BICUBIC)
        t = math.radians(a0); M.paste(255, (int(c + math.sin(t) * rr) - 20, int(c - math.cos(t) * rr) - 20), L1)
    let = tx(np.asarray(M, float) / 255, X, Y)
    h = h - 1.8 * let
    groove = cover(np.abs(r - (R1 + 5)) - 1.0)
    h = h - 1.2 * groove
    rv = np.zeros_like(X)
    for i in range(8):
        a = i * math.pi / 4 + math.pi / 8
        rv = np.maximum(rv, dome(X, Y, c + math.sin(a) * (R0 - 13), c - math.cos(a) * (R0 - 13), 3.4, 3))
    h = h + rv
    tex = tx(pnoise(H, W, 5, 5, 23), X, Y)
    m = cover(sd)
    L.put(m, brass_cols(np.maximum(0.6 * (tick | (groove > 0.5)).astype(float), 0.85 * let), np.clip(1 - np.abs(sd + 2) / 2.5, 0, 1) * 0.5, tex), (1, 0.3, 0, 0), tex * 0.05)
    return dict(h=h, alb=L.alb, par=L.par, det=L.det, a=m)


def niche_fields(X, Y, W, H, C):
    """ซุ้มโชว์ไอเทม: ขอบทองเหลืองบาง • ผนังไม้เข้มลาดลึก • ฉากหลังกำมะหยี่สีเข้ม • ชั้นวางด้านล่าง"""
    L = Layers(X.shape)
    sd = sd_chamfer(X, Y, W / 2, H / 2, W / 2 - 1, H / 2 - 1, 22)
    rim_in = sd_chamfer(X, Y, W / 2, H / 2, W / 2 - 9, H / 2 - 9, 18)
    back = sd_chamfer(X, Y, W / 2, H / 2 - 4, W / 2 - 30, H / 2 - 34, 12)
    h = 22 + bevel(sd, 4, 6, 'round')
    # ผนังด้านในลาดลงจากขอบ (ลึก 30) สู่ฉากหลัง
    depth = sstep(0, 1, np.clip(-rim_in / 24, 0, 1))
    h = np.where(rim_in < 0, 22 - 30 * depth, h)
    h = np.where(back < 0, -8 - 0.0 * X, h)
    tex = tx(pnoise(H, W, 3, 3, 29), X, Y)
    vel = tx(pnoise(H, W, 1.2, 1.2, 31), X, Y) * 0.5 + tx(pnoise(H, W, 18, 18, 32), X, Y) * 0.5
    m = cover(sd)
    L.put(m, brass_cols(np.zeros_like(X) + 0.15, np.clip(1 - np.abs(sd + 2) / 2.5, 0, 1) * 0.5, tex), (1, 0.3, 0, 0), tex * 0.05)
    gw, gd = wood_tex(H, W, 37, 'x', dark=True)
    gw = sample_rgb(gw, Y - 0.5, X - 0.5); gd = tx(gd, X, Y)
    L.put(cover(rim_in), gw * 0.9, (0, 0.55, 0.3, 0), gd * 0.6)
    L.put(cover(back + 2.0), srgb('#2a1712') * (0.85 + 0.15 * vel[..., None]), (0, 0.95, 0, 1.0), vel * 0.4)
    return dict(h=h, alb=L.alb, par=L.par, det=L.det, a=m)


def wood_tile(X, Y, W, H):
    L = Layers(X.shape)
    gw, gd = wood_tex(H, W, 51, 'x', dark=True)
    L.put(np.ones(X.shape), gw, (0, 0.5, 0.3, 0), gd)
    return dict(h=np.zeros(X.shape), alb=L.alb, par=L.par, det=L.det, a=np.ones(X.shape))


def paper_tile(X, Y, W, H):
    L = Layers(X.shape)
    fib = pnoise(H, W, 0.9, 0.9, 61, 2) * 0.5 + pnoise(H, W, 0.6, 7, 62) * 0.3 + pnoise(H, W, 7, 0.6, 63) * 0.2
    mot = pnoise(H, W, 70, 70, 64, 3, 0.6)
    spots = np.clip(pnoise(H, W, 22, 22, 65), 0.55, 1) - 0.55
    v = 0.5 + 0.10 * fib + 0.22 * mot - 0.6 * spots
    lo, hi = srgb('#d9bf8c'), srgb('#f7ebcf')
    col = lo + (hi - lo) * np.clip(v, 0, 1)[..., None]
    L.put(np.ones(X.shape), col, (0, 0.85, 0, 0), fib * 0.8 + mot * 0.2)
    return dict(h=np.zeros(X.shape), alb=L.alb, par=L.par, det=L.det, a=np.ones(X.shape))


def build(name):
    sp = SPEC[name]; W, H = sp['W'], sp['H']
    def ev(X, Y):
        if name == 'frame': return frame_fields(X, Y, W, H, sp['C'], sp['P'], 32, 'frame')
        if name == 'hud': return frame_fields(X, Y, W, H, sp['C'], sp['P'], 16, 'hud')
        if name == 'plaque': return plaque_fields(X, Y, W, H, sp['C'], sp['P'])
        if name in ('tab', 'tab_on', 'btn', 'btn_gold'): return button_fields(X, Y, W, H, sp['C'], sp['P'], name)
        if name == 'close': return close_fields(X, Y, W, H)
        if name == 'slot': return slot_fields(X, Y, W, H, sp['C'])
        if name == 'ring': return ring_fields(X, Y, W, H)
        if name == 'niche': return niche_fields(X, Y, W, H, sp['C'])
        if name == 'wood': return wood_tile(X, Y, W, H)
        if name == 'paper': return paper_tile(X, Y, W, H)
    Yc, Xc = np.mgrid[0:H, 0:W].astype(float) + 0.5
    f = ev(Xc, Yc)
    Yv, Xv = np.mgrid[0:H + 1, 0:W + 1].astype(float)
    f['hv'] = ev(Xv, Yv)['h'] if name not in ('wood', 'paper') else np.zeros((H + 1, W + 1))
    return W, H, f


# ============================================================
#  Blender
# ============================================================
CATCHER = {'frame', 'hud', 'slot'}     # มีพื้นรับเงา (โปร่งใส ยกเว้นเงา)


def render(samples, raw, only=None):
    import bpy
    from mathutils import Vector
    os.makedirs(raw, exist_ok=True)
    names = [n for n in SPEC if not only or n in only]
    for name in names:
        W, H, f = build(name)
        bpy.ops.wm.read_factory_settings(use_empty=True)
        sc = bpy.context.scene
        # ---------- เมช heightfield ----------
        hv = f['hv']; ny, nx = hv.shape
        Yv, Xv = np.mgrid[0:ny, 0:nx].astype(float)
        co = np.stack([Xv, H - Yv, hv], -1).reshape(-1, 3)
        idx = (np.arange(ny - 1)[:, None] * nx + np.arange(nx - 1)[None, :]).ravel()
        quads = np.stack([idx, idx + nx, idx + nx + 1, idx + 1], -1)       # ทวนเข็มเมื่อมองจากบน (Y กลับด้าน)
        me = bpy.data.meshes.new(name)
        me.vertices.add(len(co)); me.vertices.foreach_set('co', co.astype(np.float32).ravel())
        me.loops.add(quads.size); me.loops.foreach_set('vertex_index', quads.astype(np.int32).ravel())
        me.polygons.add(len(quads)); me.polygons.foreach_set('loop_start', (np.arange(len(quads)) * 4).astype(np.int32))
        me.update(calc_edges=True)
        me.polygons.foreach_set('use_smooth', np.ones(len(quads), bool))
        ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob)
        # ---------- ภาพแผนที่ → วัสดุ ----------
        def img(nm, arr):
            arr = np.flipud(arr).astype(np.float32)
            if arr.ndim == 2: arr = np.repeat(arr[..., None], 4, -1); arr[..., 3] = 1
            im = bpy.data.images.new(nm, W, H, alpha=True, float_buffer=True)
            im.colorspace_settings.name = 'Non-Color'; im.alpha_mode = 'CHANNEL_PACKED'
            im.pixels.foreach_set(arr.ravel()); return im
        lin = np.where(f['alb'] <= 0.04045, f['alb'] / 12.92, ((f['alb'] + 0.055) / 1.055) ** 2.4)
        alb = np.concatenate([lin, f['a'][..., None]], -1)
        det = np.clip(f['det'] * 0.5 + 0.5, 0, 1)        # ค่าสัมบูรณ์ (ไม่ normalize) → ความนูนเท่ากันทุกชิ้น
        mat = bpy.data.materials.new(name); mat.use_nodes = True
        nt = mat.node_tree; N = nt.nodes; Lk = nt.links
        b = N['Principled BSDF']
        tc = N.new('ShaderNodeTexCoord'); vm = N.new('ShaderNodeVectorMath'); vm.operation = 'MULTIPLY'
        vm.inputs[1].default_value = (1 / W, 1 / H, 0); Lk.new(tc.outputs['Object'], vm.inputs[0])
        def tex(im):
            t = N.new('ShaderNodeTexImage'); t.image = im; t.extension = 'EXTEND'; t.interpolation = 'Linear'
            Lk.new(vm.outputs[0], t.inputs['Vector']); return t
        ta = tex(img(name + '_alb', alb)); tp = tex(img(name + '_par', f['par'])); td = tex(img(name + '_det', det))
        Lk.new(ta.outputs['Color'], b.inputs['Base Color']); Lk.new(ta.outputs['Alpha'], b.inputs['Alpha'])
        sp = N.new('ShaderNodeSeparateColor'); Lk.new(tp.outputs['Color'], sp.inputs[0])
        Lk.new(sp.outputs[0], b.inputs['Metallic']); Lk.new(sp.outputs[1], b.inputs['Roughness']); Lk.new(sp.outputs[2], b.inputs['Coat Weight'])
        Lk.new(tp.outputs['Alpha'], b.inputs['Sheen Weight'])
        b.inputs['Coat Roughness'].default_value = 0.32
        b.inputs['Sheen Tint'].default_value = (1.0, 0.75, 0.6, 1)
        bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.6; bump.inputs['Distance'].default_value = 1.0
        Lk.new(td.outputs['Color'], bump.inputs['Height']); Lk.new(bump.outputs['Normal'], b.inputs['Normal'])
        me.materials.append(mat)
        # ---------- พื้นรับเงา ----------
        if name in CATCHER:
            bpy.ops.mesh.primitive_plane_add(size=1, location=(W / 2, H / 2, -0.3))
            pl = bpy.context.active_object; pl.scale = (W * 1.02, H * 1.02, 1); pl.is_shadow_catcher = True
        # ---------- แสง ----------
        to_light = Vector((-1, 1, 0)).normalized() * math.cos(math.radians(42)) + Vector((0, 0, math.sin(math.radians(42))))
        L = bpy.data.lights.new('key', 'SUN'); L.energy = 3.4; L.angle = math.radians(22); L.color = (1.0, 0.9, 0.76)
        lo = bpy.data.objects.new('key', L); sc.collection.objects.link(lo)
        lo.rotation_euler = to_light.to_track_quat('Z', 'Y').to_euler()
        w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
        wn = w.node_tree.nodes; wl = w.node_tree.links; bg = wn['Background']
        wtc = wn.new('ShaderNodeTexCoord'); dot = wn.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'
        dot.inputs[1].default_value = tuple(to_light); wl.new(wtc.outputs['Generated'], dot.inputs[0])
        # ซอฟต์บ็อกซ์ซ้ายบน (สะท้อนบนขอบเอียงทองเหลือง) + ฟ้าด้านบนกลาง ๆ + ด้านล่างขวามืด
        mr = wn.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = -0.2; mr.inputs['From Max'].default_value = 1.0
        wl.new(dot.outputs['Value'], mr.inputs['Value'])
        pw = wn.new('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = 2.0; wl.new(mr.outputs['Result'], pw.inputs[0])
        ramp = wn.new('ShaderNodeValToRGB'); el = ramp.color_ramp.elements
        el[0].position = 0.0; el[0].color = (0.02, 0.018, 0.018, 1)
        e2 = el.new(0.45); e2.color = (0.14, 0.12, 0.10, 1)
        el[-1].position = 1.0; el[-1].color = (3.2, 2.6, 1.9, 1)
        wl.new(pw.outputs[0], ramp.inputs['Fac'])
        wl.new(ramp.outputs['Color'], bg.inputs['Color']); bg.inputs['Strength'].default_value = 0.9
        if name == 'niche':     # สปอตไลต์ในซุ้ม (จากบนลงล่าง ส่องฉากหลัง/ชั้นวาง)
            S = bpy.data.lights.new('spot', 'SPOT'); S.energy = 1300000; S.spot_size = math.radians(70); S.spot_blend = 0.9
            S.shadow_soft_size = 14; S.color = (1.0, 0.86, 0.66)
            so = bpy.data.objects.new('spot', S); sc.collection.objects.link(so)
            so.location = (W / 2, H - 30, 40); so.rotation_euler = Vector((0, 0.9, 1.0)).to_track_quat('Z', 'Y').to_euler()   # ส่องลงล่าง + เข้าผนัง
            L.energy = 1.6
        # ---------- กล้อง / เรนเดอร์ ----------
        cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = max(W, H); cam.clip_end = 500
        co_ = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co_); sc.camera = co_
        co_.location = (W / 2, H / 2, 200)
        sc.render.resolution_x = W; sc.render.resolution_y = H; sc.render.resolution_percentage = 100
        sc.render.film_transparent = True
        sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples
        sc.cycles.use_denoising = True; sc.cycles.seed = 3
        sc.cycles.max_bounces = 4; sc.cycles.use_adaptive_sampling = True
        sc.view_settings.view_transform = 'AgX'
        try: sc.view_settings.look = 'AgX - Medium High Contrast'
        except Exception: pass
        sc.view_settings.exposure = 0.0
        sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
        sc.render.filepath = os.path.join(raw, name + '.png')
        bpy.ops.render.render(write_still=True)
        print('rendered', name, W, H)


# ============================================================
#  ติดตั้ง: ภาพดิบ → WebP (ตัดชิ้น 9-slice ให้ขอบต่อกันเป็นคาบ)
# ============================================================
def nine(im, C, P, axis='both'):
    """ภาพเรนเดอร์ (มุม C + ขอบ n×P + มุม C) → ภาพ 9-slice ขนาด (2C+P) — ขอบเหลือ 1 คาบ"""
    from PIL import Image
    W, H = im.size
    xs = [(0, C), (C, C + P), (W - C, W)] if axis in ('both', 'x') else [(0, W)]
    ys = [(0, C), (C, C + P), (H - C, H)] if axis in ('both', 'y') else [(0, H)]
    ow = sum(b - a for a, b in xs); oh = sum(b - a for a, b in ys)
    out = Image.new('RGBA', (ow, oh)); oy = 0
    for y0, y1 in ys:
        ox = 0
        for x0, x1 in xs:
            out.paste(im.crop((x0, y0, x1, y1)), (ox, oy)); ox += x1 - x0
        oy += y1 - y0
    return out


def install(raw):
    from PIL import Image
    sys.path.insert(0, os.path.join(ROOT, 'tools'))
    sizes = {}
    for name, sp in SPEC.items():
        p = os.path.join(raw, name + '.png')
        if not os.path.exists(p): print('ข้าม', name); continue
        im = Image.open(p).convert('RGBA')
        if name in ('frame', 'hud'): im = nine(im, sp['C'], sp['P'])
        elif name in ('plaque', 'tab', 'tab_on', 'btn', 'btn_gold'): im = nine(im, sp['C'], sp['P'], 'x')
        q = 96 if name in ('paper', 'wood') else 90
        dst = os.path.join(ROOT, 'assets', f'ui3d_{name}.webp')
        im.save(dst, 'WEBP', quality=q, method=6, alpha_quality=90)
        sizes[name] = (im.size, os.path.getsize(dst))
    tot = 0
    for k, (sz, b) in sizes.items(): print(f'  ui3d_{k}.webp {sz[0]}×{sz[1]} {b / 1024:.1f} KB'); tot += b
    print(f'รวม {tot / 1024:.1f} KB')
    import slice_sheet; slice_sheet.manifest()


if __name__ == '__main__':
    a = sys.argv[1:]
    raw = a[a.index('--raw') + 1] if '--raw' in a else RAW
    only = a[a.index('--only') + 1].split(',') if '--only' in a else None
    if '--render' in a: render(int(a[a.index('--samples') + 1]) if '--samples' in a else 96, raw, only)
    if '--install' in a: install(raw)
