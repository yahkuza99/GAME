# -*- coding: utf-8 -*-
"""ภาพ "หุ่นอ้างอิงท่าเดิน" (rig) สำหรับแนบให้ AI ลอกท่าขา — วางตรงกับเทมเพลต tpl_walk (4 เฟรม × 5 ทิศ)
หุ่นจิบิ 3 มิติอย่างง่าย หมุนตามทิศ แล้วฉายลง 2 มิติ • ขาซ้าย = ฟ้า, ขาขวา = ส้ม (แขนสีอ่อนของข้างเดียวกัน)
หน้ากากสีฟ้าบอกทิศที่หัน • ใช้: python3 tools/make_walk_rig.py <out.png> [--plain]
  --plain = ไม่มีตัวหนังสือ/เส้นช่อง (ใช้แนบให้ AI ป้องกันมันวาดตัวหนังสือตาม)"""
import sys, math
from PIL import Image, ImageDraw, ImageFont

W, H, COLS, ROWS = 1024, 1536, 4, 5
CW, CH = W // COLS, H // ROWS
TOP, GROUND = 68, 285            # เส้นหัว/เส้นเท้าในแต่ละช่อง (ตามเทมเพลต)
DIRS = [('FRONT', (0, 1)), ('FRONT-LEFT', (-0.7071, 0.7071)), ('LEFT', (-1, 0)), ('BACK-LEFT', (-0.7071, -0.7071)), ('BACK', (0, -1))]
# สัดส่วนจิบิ (px): หัว ~1/3 ของความสูง
HEAD_R, NECK, TORSO, HIP_W, SH_W = 36, 4, 48, 11, 22
THIGH, SHIN, FOOT = 34, 34, 13
UARM, LARM = 22, 20
COL = {'L': (40, 120, 235), 'R': (240, 130, 30), 'Larm': (130, 180, 245), 'Rarm': (250, 190, 120), 'body': (150, 150, 160), 'head': (225, 225, 230), 'visor': (40, 200, 230), 'out': (40, 40, 48)}

# ท่าเดินต่อเฟรม (องศา): thigh + = เหวี่ยงไปข้างหน้า, knee = งอ (หน้าแข้งไปทางหลัง), arm + = แกว่งไปข้างหน้า
POSE = [
    {'L': (32, 4), 'R': (-26, 16), 'Larm': -26, 'Rarm': 26},   # 1 เท้าซ้ายหน้า
    {'L': (-4, 0), 'R': (40, 85), 'Larm': -6, 'Rarm': 6},      # 2 ขาขวาเหวี่ยงผ่าน ยกเข่า
    {'L': (-26, 16), 'R': (32, 4), 'Larm': 26, 'Rarm': -26},   # 3 เท้าขวาหน้า
    {'L': (40, 85), 'R': (-4, 0), 'Larm': 6, 'Rarm': -6},      # 4 ขาซ้ายเหวี่ยงผ่าน ยกเข่า
]


def body_to_world(F, fwd, left, up):
    fx, fz = F
    lx, lz = fz, -fx                     # ด้านซ้ายของตัวละคร (หันหน้าเข้าหาผู้ดู → ซ้ายตัวละคร = ขวาจอ)
    return (fwd * fx + left * lx, up, fwd * fz + left * lz)


def proj(p, cx, gy):
    x, y, z = p
    return (cx + x, gy - y + z * 0.4), z  # มองลงเล็กน้อย: ของที่อยู่ใกล้ผู้ดูต่ำลงนิด


def limb(base, ang1, len1, bend, len2, foot=0):
    """base=(fwd,left,up) ข้อต่อบน → (ข้อกลาง, ปลาย, ปลายเท้า) ในพิกัดตัว"""
    a1 = math.radians(ang1); a2 = math.radians(ang1 - bend)
    f, l, u = base
    k = (f + len1 * math.sin(a1), l, u - len1 * math.cos(a1))
    e = (k[0] + len2 * math.sin(a2), l, k[2] - len2 * math.cos(a2))
    t = (e[0] + foot, l, e[2]) if foot else None
    return k, e, t


def draw_cell(d, cx, gy, F, pose, plain):
    segs = []  # (ความลึก, ชนิด, ข้อมูล)
    # หาความสูงสะโพกให้เท้าที่ต่ำสุดแตะพื้น
    legs = {}
    for s, side in (('L', 1), ('R', -1)):
        th, kn = pose[s]
        k, e, t = limb((0, side * HIP_W, 0), th, THIGH, kn, SHIN, FOOT)
        legs[s] = (k, e, t, side)
    low = min(min(v[1][2], v[2][2]) for v in legs.values())
    hip_up = -low + 3
    up = lambda p: (p[0], p[1], p[2] + hip_up)
    def W_(p): return body_to_world(F, *p)
    def add_line(a, b, color, width):
        pa, za = proj(W_(a), cx, gy); pb, zb = proj(W_(b), cx, gy)
        segs.append(((za + zb) / 2, 'line', (pa, pb, color, width)))
    for s, (k, e, t, side) in legs.items():
        hip = (0, side * HIP_W, hip_up)
        add_line(hip, up(k), COL[s], 15)
        add_line(up(k), up(e), COL[s], 13)
        add_line(up(e), up(t), COL[s], 11)
    # ลำตัว
    pelvis = (0, 0, hip_up + 2); chest = (0, 0, hip_up + TORSO)
    add_line(pelvis, chest, COL['body'], 36)
    # แขน
    for s, side in (('Larm', 1), ('Rarm', -1)):
        sh = (0, side * SH_W, hip_up + TORSO - 6)
        k, e, _ = limb((0, side * SH_W, 0), pose[s], UARM, -20, LARM)
        add_line(sh, (k[0], k[1], k[2] + hip_up + TORSO - 6), COL[s], 10)
        add_line((k[0], k[1], k[2] + hip_up + TORSO - 6), (e[0], e[1], e[2] + hip_up + TORSO - 6), COL[s], 9)
    # หัว + หน้ากาก (บอกทิศหน้า)
    hc = (0, 0, hip_up + TORSO + NECK + HEAD_R)
    ph, zh = proj(W_(hc), cx, gy)
    segs.append((zh, 'head', (ph, F)))
    segs.sort(key=lambda s: s[0])
    for _, kind, v in segs:
        if kind == 'line':
            pa, pb, color, width = v
            d.line([pa, pb], fill=COL['out'], width=width + 5)
            for p in (pa, pb): d.ellipse([p[0] - (width + 5) / 2, p[1] - (width + 5) / 2, p[0] + (width + 5) / 2, p[1] + (width + 5) / 2], fill=COL['out'])
            d.line([pa, pb], fill=color, width=width)
            for p in (pa, pb): d.ellipse([p[0] - width / 2, p[1] - width / 2, p[0] + width / 2, p[1] + width / 2], fill=color)
        else:
            (x, y), Fv = v
            r = HEAD_R
            d.ellipse([x - r - 3, y - r - 3, x + r + 3, y + r + 3], fill=COL['out'])
            d.ellipse([x - r, y - r, x + r, y + r], fill=COL['head'])
            if Fv[1] > -0.2:  # หน้ากาก: แถบเรืองแสงเลื่อนไปทางที่หัน
                vx = x + Fv[0] * r * 0.55
                w = r * (0.55 + 0.35 * max(0, Fv[1]))
                d.rounded_rectangle([vx - w, y - 5, vx + w, y + 7], radius=6, fill=COL['visor'], outline=COL['out'], width=2)


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else 'walk_rig.png'
    plain = '--plain' in sys.argv
    im = Image.new('RGB', (W, H), (255, 255, 255))
    d = ImageDraw.Draw(im)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
        small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
    except OSError:
        font = small = ImageFont.load_default()
    names = ['1 L foot fwd', '2 R leg passes', '3 R foot fwd', '4 L leg passes']
    for r, (dname, F) in enumerate(DIRS):
        for c in range(COLS):
            x0, y0 = c * CW, r * CH
            if not plain:
                d.rectangle([x0, y0, x0 + CW - 1, y0 + CH - 1], outline=(205, 205, 210), width=2)
                d.text((x0 + 8, y0 + 4), names[c], fill=(80, 80, 100), font=font)
                if c == 0: d.text((x0 + 8, y0 + 28), dname, fill=(200, 70, 50), font=small)
                d.line([x0 + 10, y0 + GROUND, x0 + CW - 10, y0 + GROUND], fill=(230, 60, 60), width=3)
            draw_cell(d, x0 + CW // 2, y0 + GROUND, F, POSE[c], plain)
    if not plain:  # คำอธิบายสี (มุมขวาล่างของแถวสุดท้ายมีที่ว่างน้อย → ใส่ไว้บนสุด)
        pass
    im.save(out)
    print('wrote', out)


if __name__ == '__main__':
    main()
