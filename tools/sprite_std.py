# -*- coding: utf-8 -*-
"""มาตรฐานขนาดสไปรต์ NEO MIDGARD (NMS-1) + เครื่องวัด/จัดเฟรมแอนิเมชัน

ทุกเฟรมที่ติดตั้งลงเกมจะถูกจัดให้เข้ามาตรฐานเดียวกัน:
  ช่องเฟรม 240x240 px • เส้นพื้น (ฝ่าเท้า) y=220 • แกนกลาง x=120
  ความสูงตัวละครยืนตรง (หัวจรดเท้า) = 150 px • หัว ≈ 28% ของความสูง (สัดส่วนแบบ RO ~3.5 หัว)
  หันหน้าไปทางซ้าย 3/4 (เกมกลับด้านเองเมื่อเดินไปทางขวา)

ใช้:
  python3 tools/sprite_std.py template [--cols 4 --rows 2]          สร้างภาพเทมเพลตไว้แนบให้ ChatGPT
  python3 tools/sprite_std.py template attack                        เทมเพลต 5 ทิศ มีเลขเฟรม+ชื่อท่า (walk/attack/cast/sit_hurt/dead)
  python3 tools/sprite_std.py measure <ชีต.png> --grid 4x2            วัดอย่างเดียว (ไม่ติดตั้ง)
  python3 tools/sprite_std.py install <ชีต.png> <key> <action> --grid 4x2 [--frames 8]
  python3 tools/sprite_std.py install <ชีต.png> <key> walk --grid 4x7 --dirs S,SW,W,NW,N,E,SE
      ชีตหลายทิศ (แบบ RO): แถวละทิศ ทิศที่ขาดสร้างจากการกลับด้านทิศคู่ (NE = กลับ NW ฯลฯ)
      → แถบเฟรม 8 แถว (แถว i = ทิศ i ตาม DIRS)
      เช่น  install walk.png novice_f walk --grid 4x2
      → assets/anim_novice_f_walk.webp (แถบเฟรมแนวนอน) + ภาพตรวจ art/check/anim_novice_f_walk.png
"""
import sys, os, json, argparse
from PIL import Image, ImageDraw, ImageFilter, ImageOps
sys.path.insert(0, os.path.dirname(__file__))
from slice_sheet import manifest, ROOT

# ---------------- มาตรฐาน ----------------
CELL = 240          # ขนาดช่องเฟรมในเกม
GROUND = 220        # เส้นพื้น
CX = 120            # แกนกลาง
STD_H = 150         # ความสูงยืนตรง
HEAD = 0.28         # สัดส่วนหัวต่อความสูงทั้งตัว
HIP = 0.40          # ความสูงสะโพกจากพื้น (สัดส่วน)
ACTIONS = {         # ท่า: (จำนวนเฟรมแนะนำ, วนซ้ำไหม)
    'idle': (4, True), 'walk': (8, True), 'attack': (6, False), 'cast': (4, True),
    'hurt': (2, False), 'sit': (2, True), 'dead': (4, False),
}
TOL = 0.06          # ความสูงเพี้ยนเกิน 6% = เตือน
FIT_TOL = 0.04      # ท่ายืน: เพี้ยนเกิน 4% ปรับกลับเท่าค่ากลาง (กันหัวกระตุกขึ้นลงระหว่างเฟรม)
STANDING = ('idle', 'walk', 'cast')   # ท่ายืน: ใช้ความสูงวัดสเกล ท่าอื่น (นั่ง/ล้ม/ฟัน) ใช้สเกลของท่ายืน
TPL_W, TPL_BODY = 1536, 0.60
# ทิศ 8 ทาง (ลำดับเดียวกับ dirFromVec ในเกม: 0=ขวา แล้ววนตามเข็มนาฬิกา) — แถวที่ i ของแถบเฟรม = ทิศ i
DIRS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE']
MIRROR = {'E': 'W', 'W': 'E', 'SE': 'SW', 'SW': 'SE', 'NE': 'NW', 'NW': 'NE'}          # เทมเพลต 1536 px กว้าง, ตัวยืนสูง 60% ของความสูงช่อง
HERE = os.path.dirname(__file__)
SIZES = os.path.join(HERE, '..', 'art', 'anim_sizes.json')
CHECK = os.path.join(HERE, '..', 'art', 'check')


def template(cols=4, rows=2, cw=384, chh=512):
    """เทมเพลตตารางเฟรม: ChatGPT วาดตัวละครลงแต่ละช่อง เท้าแตะเส้นแดง หัวแตะเส้นน้ำเงิน"""
    W, H = cols * cw, rows * chh
    im = Image.new('RGB', (W, H), (255, 255, 255)); d = ImageDraw.Draw(im)
    g = chh * 0.90; top = chh * 0.30; hh = g - top  # สัดส่วนเดียวกับ CELL/GROUND/STD_H
    for r in range(rows):
        for c in range(cols):
            x0, y0 = c * cw, r * chh
            d.rectangle([x0, y0, x0 + cw - 1, y0 + chh - 1], outline=(200, 200, 205), width=2)
            cx = x0 + cw / 2
            d.line([cx, y0 + 12, cx, y0 + chh - 12], fill=(225, 225, 232), width=2)                    # แกนกลาง
            d.line([x0 + 16, y0 + top, x0 + cw - 16, y0 + top], fill=(70, 120, 235), width=3)         # หัว
            d.line([x0 + 30, y0 + top + hh * HEAD, x0 + cw - 30, y0 + top + hh * HEAD], fill=(170, 190, 240), width=2)  # คาง
            d.line([x0 + 30, y0 + g - hh * HIP, x0 + cw - 30, y0 + g - hh * HIP], fill=(235, 200, 150), width=2)  # สะโพก
            d.line([x0 + 16, y0 + g, x0 + cw - 16, y0 + g], fill=(235, 60, 60), width=3)              # พื้น
            d.text((x0 + 10, y0 + 8), str(r * cols + c + 1), fill=(150, 150, 160))
    return im


def knock_bg(im, tol=40, hole_tol=14, hole_min=700):
    """ลบพื้นหลังสีเรียบแบบ "น้ำท่วมจากขอบภาพ" — สีขาวที่อยู่ในตัวละคร (หน้ากาก ชุดเกราะขาว) ไม่ถูกลบ
    ช่องว่างที่ถูกล้อมไว้ (เช่น ระหว่างแขนกับลำตัว) ลบเฉพาะที่สีตรงพื้นเป๊ะและกว้างพอ"""
    im = im.convert('RGBA')
    if im.getchannel('A').getextrema()[0] < 250: return im   # โปร่งใสอยู่แล้ว
    W, H = im.size; rgb = im.convert('RGB'); px = rgb.load()
    cs = [px[2, 2], px[W - 3, 2], px[2, H - 3], px[W - 3, H - 3]]
    bg = tuple(sorted(c[i] for c in cs)[1] for i in range(3))
    KEY = (255, 0, 254) if bg != (255, 0, 254) else (0, 255, 1)
    # เส้นตาราง/เส้นไกด์ยาว ๆ (ถ้า ChatGPT วาดติดมา) กั้นไม่ให้พื้นหลังไหลเข้าช่อง: ทาสีพื้นทับก่อน
    far = lambda c: sum(abs(c[i] - bg[i]) for i in range(3)) >= tol
    rowc = [sum(1 for x in range(0, W, 2) if far(px[x, y])) * 2 for y in range(H)]
    colc = [sum(1 for y in range(0, H, 2) if far(px[x, y])) * 2 for x in range(W)]
    def paint(pts, dx, dy):
        lone = [px[x, y] for x, y in pts if far(px[x, y]) and all(not (0 <= x + k * dx < W and 0 <= y + k * dy < H) or not far(px[x + k * dx, y + k * dy]) for k in (-3, 3))]
        if len(lone) < 20: return
        mc = [sorted(c[i] for c in lone)[len(lone) // 2] for i in range(3)]
        for x, y in pts:
            c = px[x, y]
            if sum(abs(c[i] - mc[i]) for i in range(3)) < 90: px[x, y] = bg
    for y in range(H):
        if rowc[y] > W * 0.5 and all(rowc[y] - rowc[j] > W * 0.3 for j in (y - 5, y + 5) if 0 <= j < H): paint([(x, y) for x in range(W)], 0, 1)
    for x in range(W):
        if colc[x] > H * 0.5 and all(colc[x] - colc[j] > H * 0.3 for j in (x - 5, x + 5) if 0 <= j < W): paint([(x, y) for y in range(H)], 1, 0)
    fill = rgb.copy()
    seeds = [(x, y) for x in range(0, W, 8) for y in (0, H - 1)] + [(x, y) for y in range(0, H, 8) for x in (0, W - 1)]
    fp = fill.load()
    for x, y in seeds:
        c = fp[x, y]
        if c != KEY and sum(abs(c[i] - bg[i]) for i in range(3)) < tol:
            ImageDraw.floodfill(fill, (x, y), KEY, thresh=tol)
    alpha = Image.new('L', (W, H), 255); ap = alpha.load()
    for y in range(H):
        for x in range(W):
            if fp[x, y] == KEY: ap[x, y] = 0
    # รูที่ถูกล้อม: สีเท่าพื้นเกือบเป๊ะ และกว้างพอ (หน้ากาก/เกราะมีแสงเงา จึงไม่เข้าเกณฑ์)
    f = 4; w, h = W // f, H // f
    cand = [[False] * w for _ in range(h)]
    for yy in range(h):
        for xx in range(w):
            ok = True
            for j in range(f):
                for i in range(f):
                    x, y = xx * f + i, yy * f + j
                    c = px[x, y]
                    if ap[x, y] == 0 or sum(abs(c[k] - bg[k]) for k in range(3)) >= hole_tol: ok = False; break
                if not ok: break
            cand[yy][xx] = ok
    seen = [[False] * w for _ in range(h)]
    for y0 in range(h):
        for x0 in range(w):
            if not cand[y0][x0] or seen[y0][x0]: continue
            st, pts = [(x0, y0)], []; seen[y0][x0] = True
            while st:
                x, y = st.pop(); pts.append((x, y))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and cand[ny][nx] and not seen[ny][nx]:
                        seen[ny][nx] = True; st.append((nx, ny))
            if len(pts) * f * f >= hole_min:
                for x, y in pts:
                    for j in range(f):
                        for i in range(f): ap[x * f + i, y * f + j] = 0
    # ขอบนุ่ม: ตัดขอบ 1px ที่ติดพื้นขาว (กันขอบขาวรอบตัวเวลาวางบนหญ้า)
    alpha = alpha.filter(ImageFilter.MinFilter(3))
    im.putalpha(alpha); return im


# เทมเพลตมีป้ายกำกับ: คอลัมน์ = เฟรม (เลข + ชื่อท่า) • แถว = ทิศ — แนบให้ ChatGPT รู้ว่าแต่ละช่องต้องวาดอะไร
DIR_LABELS = ['FRONT', 'FRONT-LEFT', 'LEFT', 'BACK-LEFT', 'BACK']
POSES = {
    'walk':   ('4x5', 1024, 1536, ['L foot fwd', 'passing', 'R foot fwd', 'passing']),
    'attack': ('6x5', 1536, 1024, ['ready', 'wind-up', 'lunge', 'SLASH', 'follow', 'ready']),
    'cast':   ('4x5', 1024, 1536, ['raise hand', 'rune small', 'rune grow', 'rune full']),
    'sit_hurt': ('4x5', 1024, 1536, ['SIT', 'SIT breathe', 'HURT hit', 'HURT recover']),
    'dead':   ('4x5', 1024, 1536, ['knees buckle', 'falling', 'on ground', 'still, visor off']),
}


def labeled_template(action):
    grid, W, H, labels = POSES[action]
    cols, rows = map(int, grid.split('x'))
    from PIL import ImageFont
    def font(sz):
        for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'):
            try: return ImageFont.truetype(f, sz)
            except Exception: pass
        return ImageFont.load_default()
    cw, ch = W / cols, H / rows
    f1, f2 = font(max(12, int(ch * 0.075))), font(max(10, int(ch * 0.055)))
    im = Image.new('RGB', (W, H), (255, 255, 255)); d = ImageDraw.Draw(im)
    g = ch * 0.93; top = ch * 0.22; hh = g - top
    for r in range(rows):
        for c in range(cols):
            x0, y0 = c * cw, r * ch
            d.rectangle([x0, y0, x0 + cw - 1, y0 + ch - 1], outline=(205, 205, 212), width=2)
            d.line([x0 + cw / 2, y0 + top - 6, x0 + cw / 2, y0 + g], fill=(228, 228, 236), width=2)
            d.line([x0 + 10, y0 + top, x0 + cw - 10, y0 + top], fill=(70, 120, 235), width=2)
            d.line([x0 + 10, y0 + g, x0 + cw - 10, y0 + g], fill=(235, 60, 60), width=3)
            d.text((x0 + 6, y0 + 4), f"{c + 1} {labels[c]}", fill=(90, 90, 110), font=f1)
            if c == 0: d.text((x0 + 6, y0 + 6 + f1.size), DIR_LABELS[r], fill=(200, 80, 60), font=f2)
    return im


def cuts(profile, n, lo=0, hi=None):
    """ตำแหน่งตัดแบ่ง n ช่อง: หาเส้นที่ "ว่างที่สุด" ใกล้เส้นตารางปกติ (±30% ของช่อง)
    ตัวละครที่วาดชิดกัน/ล้นช่องเล็กน้อยจึงไม่ถูกตัดกลางตัว"""
    hi = len(profile) if hi is None else hi
    size = (hi - lo) / n; out = [lo]
    for i in range(1, n):
        e = lo + i * size; a, b = int(max(out[-1] + size * 0.5, e - size * 0.3)), int(min(hi - 1, e + size * 0.3))
        out.append(min(range(a, b + 1), key=lambda y: (profile[y], abs(y - e))))
    out.append(hi); return out


def frames_from_grid(im, cols, rows):
    """ตัดตามตาราง (เส้นตัดขยับหาช่องว่างเอง) แล้วเก็บเฉพาะตัวละครในแต่ละช่อง
    (ตัดเส้นไกด์ ตัวเลข และเศษที่ล้นมาจากช่องข้าง ๆ ทิ้ง)"""
    im = knock_bg(im)
    W, H = im.size
    a = im.getchannel('A').point(lambda v: 1 if v > 60 else 0); px = a.load()
    xc = cuts([sum(px[x, y] for y in range(0, H, 2)) for x in range(W)], cols)
    out, grid = [], []
    touch_y = 0
    for c in range(cols):
        x0, x1 = xc[c], xc[c + 1]
        prof = [sum(px[x, y] for x in range(x0, x1, 2)) for y in range(H)]
        yc = cuts(prof, rows)
        touch_y = max(touch_y, max((prof[y] for y in yc[1:-1]), default=0) * 2 / max(1, x1 - x0))
        grid.append([(x0, yc[r], x1, yc[r + 1]) for r in range(rows)])
    # ขยายกรอบเฉพาะแกนที่ตัวละคร "ไม่ชนกัน" (เส้นแบ่งแทบว่าง) — แกนที่ชนกันตัดตรงตามเส้นแบ่ง
    mx = 0.35  # แนวนอน: ก้อนที่ชนกันจริงถูกจับได้จากความกว้าง (main_blob) แล้วถอยไปตัดตรง
    my = 0.15 if touch_y < 0.02 else 0.0
    for r in range(rows):
        for c in range(cols):
            x0, y0, x1, y1 = grid[c][r]
            cw_, ch_ = x1 - x0, y1 - y0
            # ขยายกรอบออกไปรอบ ๆ แล้วเก็บเฉพาะก้อนที่ "จุดศูนย์กลางอยู่ในช่องนี้" — ผม/อาวุธที่ล้นช่องไม่โดนตัด
            ex = (max(0, int(x0 - cw_ * mx)), max(0, int(y0 - ch_ * my)), min(W, int(x1 + cw_ * mx)), min(H, int(y1 + ch_ * my)))
            big = knock_lines(im.crop(ex))
            m = main_blob(big.getchannel('A'), core=(x0 - ex[0], y0 - ex[1], x1 - ex[0], y1 - ex[1]))
            if m is not None:
                cell = big
            else:  # ตัวละครชนกับช่องข้าง ๆ (ก้อนเดียวกัน) → ตัดตามเส้นแบ่งแบบเดิม
                cell = knock_lines(im.crop(grid[c][r]))
                m = main_blob(cell.getchannel('A'))
                if m is None: continue
            cell.putalpha(Image.composite(cell.getchannel('A'), Image.new('L', cell.size, 0), m))
            out.append(cell)
    return out


def knock_lines(cell):
    """ลบเส้นตรงบาง ๆ ที่พาดเกือบทั้งช่อง (เส้นไกด์ของเทมเพลตที่ ChatGPT อาจวาดติดมา)
    ลบเฉพาะพิกเซลที่สีเหมือนเส้นนั้น ตัวละครที่เส้นพาดผ่านจึงไม่แหว่ง"""
    W, H = cell.size; px = cell.load()
    op = lambda x, y: px[x, y][3] > 60
    row = [sum(1 for x in range(W) if op(x, y)) for y in range(H)]
    col = [sum(1 for y in range(H) if op(x, y)) for x in range(W)]
    def wipe(pts, d):
        # สีของเส้น = สีของพิกเซลบนเส้นที่ด้านบน/ล่าง (หรือซ้าย/ขวา) โปร่งใส คือไม่ใช่ตัวละคร
        def lone(x, y):
            a, b = (x + d[0], y + d[1]), (x - d[0], y - d[1])
            return all(not (0 <= q[0] < W and 0 <= q[1] < H) or not op(*q) for q in (a, b))
        cs = sorted(px[x, y][:3] for x, y in pts if op(x, y) and lone(x, y))
        if not cs: return
        mc = [sorted(c[i] for c in cs)[len(cs) // 2] for i in range(3)]
        for x, y in pts:
            r, g, b, al = px[x, y]
            if al and abs(r - mc[0]) + abs(g - mc[1]) + abs(b - mc[2]) < 90: px[x, y] = (0, 0, 0, 0)
    for y in range(H):
        if row[y] > W * 0.6 and all(row[y] - row[j] > W * 0.3 for j in (y - 6, y + 6) if 0 <= j < H):
            wipe([(x, y) for x in range(W)], (0, 4))
    for x in range(W):
        if col[x] > H * 0.6 and all(col[x] - col[j] > H * 0.3 for j in (x - 6, x + 6) if 0 <= j < W):
            wipe([(x, y) for y in range(H)], (4, 0))
    return cell


def main_blob(a, f=4, core=None):
    """หน้ากากของก้อนหลัก (ตัวละคร) + ก้อนที่ใหญ่พอจะเป็นส่วนของมัน (อาวุธ/เอฟเฟกต์ที่หลุดออกไป)"""
    W, H = a.size; w, h = max(1, W // f), max(1, H // f)
    sm = a.resize((w, h), Image.BOX).load()
    solid = [[sm[x, y] > 70 for x in range(w)] for y in range(h)]
    lab = [[-1] * w for _ in range(h)]; comps = []
    for y0 in range(h):
        for x0 in range(w):
            if not solid[y0][x0] or lab[y0][x0] >= 0: continue
            cid = len(comps); st = [(x0, y0)]; lab[y0][x0] = cid; pts = []
            while st:
                x, y = st.pop(); pts.append((x, y))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h and solid[ny][nx] and lab[ny][nx] < 0:
                            lab[ny][nx] = cid; st.append((nx, ny))
            comps.append(pts)
    if not comps: return None
    if core is not None:
        # เลือกเฉพาะก้อนที่จุดศูนย์กลางอยู่ในช่องหลัก • ก้อนที่กว้างเกินช่องมาก = ชนกับตัวข้าง ๆ → ใช้ไม่ได้
        cx0, cy0, cx1, cy1 = (v / f for v in core)
        inside = [p for p in comps if cx0 <= sum(q[0] for q in p) / len(p) < cx1 and cy0 <= sum(q[1] for q in p) / len(p) < cy1]
        if not inside: return None
        big = max(len(p) for p in inside)
        if big < 40: return None
        main = max(inside, key=len); xs = [q[0] for q in main]
        ys = [q[1] for q in main]
        if max(xs) - min(xs) > (cx1 - cx0) * 1.55 or max(ys) - min(ys) > (cy1 - cy0) * 1.12: return None
        comps = inside
    else:
        big = max(len(p) for p in comps)
        if big < 40: return None
    m = Image.new('L', (w, h), 0); mp = m.load()
    for pts in comps:
        if len(pts) >= big * 0.12:
            for x, y in pts: mp[x, y] = 255
    return m.resize((W, H), Image.NEAREST).filter(ImageFilter.MaxFilter(2 * f + 1))


def measure(fr):
    """วัดเฟรม: พื้น (แถวล่างสุดที่มีเนื้อ), หัว (แถวบนสุดที่กว้างพอจะเป็นหัว — ไม่นับอาวุธ/ปลายผมบาง ๆ),
    แกนกลาง (ค่ากลางแนวนอนของช่วงลำตัว 30–65%)"""
    a = fr.getchannel('A'); W, H = fr.size; px = a.load()
    rows = [sum(1 for x in range(W) if px[x, y] > 60) for y in range(H)]
    ys = [y for y in range(H) if rows[y] > 0]
    if not ys: return None
    bot = max(ys); full_top = min(ys)
    wmax = max(rows)
    top = next(y for y in range(H) if rows[y] >= wmax * 0.22)
    h = bot - top
    xs = []
    for y in range(int(top + h * 0.30), int(top + h * 0.65)):
        xs += [x for x in range(0, W, 2) if px[x, y] > 60]
    xs.sort(); cx = xs[len(xs) // 2] if xs else W / 2
    return {'top': top, 'full_top': full_top, 'bot': bot, 'h': h, 'cx': cx}


def normalize(frames, scale=None, fit=False):
    """จัดทุกเฟรมเข้ามาตรฐาน ด้วยสเกลเดียวกันทั้งชุด (ค่ากลางของความสูงลำตัว)
    fit=True: เฟรมที่สูงเพี้ยนเกิน TOL ถูกย่อ/ขยายกลับเท่าค่ากลาง (ใช้กับท่ายืน idle/walk/cast)"""
    ms = [measure(f) for f in frames]
    keep = [(f, m) for f, m in zip(frames, ms) if m]
    hs = sorted(m['h'] for _, m in keep)
    med = hs[len(hs) // 2]
    k = scale or STD_H / med
    if scale: med = STD_H / scale  # ท่าไม่ยืน: เทียบกับความสูงยืนตรง (แค่รายงาน ไม่ถือว่าเพี้ยน)
    out, rep = [], []
    for i, (f, m) in enumerate(keep):
        dev = m['h'] / med - 1
        kk = k / (1 + dev) if fit and abs(dev) > FIT_TOL else k
        fixed = kk != k
        s = f.resize((max(1, round(f.width * kk)), max(1, round(f.height * kk))), Image.LANCZOS)
        c = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
        c.alpha_composite(s, (round(CX - m['cx'] * kk), round(GROUND - m['bot'] * kk)))
        out.append(c)
        rep.append({'frame': i + 1, 'height_px': round(m['h'] * kk), 'dev_pct': round(dev * 100, 1),
                    'clipped': round(GROUND - m['bot'] * kk + m['full_top'] * kk) < 0,
                    'ok': bool(scale) or abs(dev) <= TOL, 'fixed': fixed})
    return out, rep, k, med


def check_sheet(frames, rep, title):
    """ภาพตรวจ: ทุกเฟรมบนเส้นไกด์มาตรฐาน + ตัวเลขความสูง (แดง = เพี้ยนเกินเกณฑ์)"""
    n = len(frames); pad = 24
    im = Image.new('RGB', (n * CELL, CELL + pad * 2), (34, 40, 48)); d = ImageDraw.Draw(im)
    d.text((6, 4), title, fill=(220, 230, 240))
    for i, (f, r) in enumerate(zip(frames, rep)):
        x0 = i * CELL; y0 = pad
        d.rectangle([x0, y0, x0 + CELL - 1, y0 + CELL - 1], outline=(70, 80, 95))
        d.line([x0 + CX, y0, x0 + CX, y0 + CELL], fill=(60, 70, 85))
        d.line([x0, y0 + GROUND, x0 + CELL, y0 + GROUND], fill=(230, 70, 70), width=2)
        d.line([x0, y0 + GROUND - STD_H, x0 + CELL, y0 + GROUND - STD_H], fill=(80, 130, 240), width=1)
        d.line([x0 + 20, y0 + GROUND - STD_H * (1 - HEAD), x0 + CELL - 20, y0 + GROUND - STD_H * (1 - HEAD)], fill=(60, 80, 130))
        im.paste(f, (x0, y0), f)
        col = (120, 220, 140) if r['ok'] else (255, 110, 100)
        d.text((x0 + 6, y0 + CELL + 4), f"#{r['frame']} h={r['height_px']} ({r['dev_pct']:+}%)" + (' fit' if r['fixed'] else ''), fill=col)
    return im


def load_sizes():
    try: return json.load(open(SIZES))
    except Exception: return {}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd'); ap.add_argument('src', nargs='?'); ap.add_argument('key', nargs='?'); ap.add_argument('action', nargs='?')
    ap.add_argument('--grid', default='4x2'); ap.add_argument('--cols', type=int, default=4); ap.add_argument('--rows', type=int, default=2)
    ap.add_argument('--frames', type=int, default=0, help='ใช้แค่ N เฟรมแรก')
    ap.add_argument('--dirs', default='', help='ทิศของแต่ละแถวในชีต เช่น S,SW,W,NW,N,E,SE')
    ap.add_argument('--ref-frames', default='', help='คอลัมน์ที่เป็นท่ายืนตรง เช่น 1,6 — ใช้ความสูงของเฟรมพวกนี้ตั้งสเกลให้เท่าท่าเดิน (ChatGPT มักวาดแต่ละชีตขนาดไม่เท่ากัน)')
    ap.add_argument('--still', action='store_true', help='เก็บแค่เฟรมที่เท้าชิดกันที่สุด (ยืนสองขา) แถวละ 1 เฟรม — ใช้ทำท่ายืนจากชีตเดิน')
    ap.add_argument('--nofit', action='store_true', help='ไม่ปรับขนาดเฟรมที่เพี้ยนอัตโนมัติ')
    ap.add_argument('--order', default='', help='ลำดับเฟรมใหม่ เช่น 1,2,3,4,3,2')
    a = ap.parse_args()
    if a.cmd == 'template':
        if a.src in POSES:  # template <ท่า> → เทมเพลต 5 ทิศมีป้ายกำกับ
            out = os.path.join(HERE, '..', 'art', f'tpl_{a.src}.png')
            labeled_template(a.src).save(out); print('template →', out); return
        out = os.path.join(HERE, '..', 'art', f'anim_template_{a.cols}x{a.rows}.png')
        template(a.cols, a.rows).save(out); print('template →', out); return
    cols, rows = map(int, a.grid.lower().split('x'))
    frames = frames_from_grid(Image.open(a.src), cols, rows)
    if a.order: frames = [frames[int(i) - 1] for i in a.order.split(',')]
    if a.frames: frames = frames[:a.frames]
    src_w = Image.open(a.src).width
    sz = load_sizes(); ref = sz.get(a.key or '', {}).get('_k1536')
    scale = None
    if a.action and a.action not in STANDING:
        # ใช้สเกลเดียวกับท่ายืนของตัวละครนี้ (ไม่มีก็ใช้สเกลเทมเพลต)
        scale = (ref * TPL_W / src_w) if ref else STD_H / (TPL_BODY * Image.open(a.src).height / rows)
        print(f"  สเกลจาก{'ท่ายืนที่ติดตั้งไว้' if ref else 'เทมเพลต'}: {scale:.3f}")
    if a.ref_frames:
        refs = {int(x) for x in a.ref_frames.split(',')}
        hs = sorted(m['h'] for i, f in enumerate(frames) if (i % cols) + 1 in refs for m in [measure(f)] if m)
        if hs:
            scale = STD_H / hs[len(hs) // 2]
            print(f"  สเกลจากเฟรมยืน {sorted(refs)}: {scale:.3f}")
    out, rep, k, med = normalize(frames, scale=scale, fit=(a.action in STANDING) and not a.nofit)
    if a.action in STANDING and ref:
        diff = (k * src_w / TPL_W) / ref - 1
        if abs(diff) > 0.1: print(f'  ⚠ ChatGPT วาดตัวใหญ่/เล็กต่างจากชีตก่อน {diff * 100:+.0f}% (จัดให้เท่ากันแล้ว)')
    bad = [r for r in rep if not r['ok']]
    for r in rep: print(f"  เฟรม {r['frame']}: สูง {r['height_px']}px ({r['dev_pct']:+}%)" + ('' if r['ok'] else '  ⚠ ขนาดเพี้ยน' + (' → ปรับให้แล้ว' if r['fixed'] else '')) + ('  ⚠ ล้นขอบบน' if r['clipped'] else ''))
    fx = sum(1 for r in rep if r['fixed'])
    print(f'  {len(out)} เฟรม • สเกล {k:.3f} • ตรงมาตรฐาน {len(out) - len(bad)}/{len(out)}' + (f' • ปรับขนาดให้ {fx} เฟรม' if fx else ''))
    title = f"{a.key or os.path.basename(a.src)} {a.action or ''}  NMS-1  {len(out)}f"
    os.makedirs(CHECK, exist_ok=True)
    name = f"anim_{a.key}_{a.action}" if a.cmd == 'install' else 'measure_' + os.path.splitext(os.path.basename(a.src))[0]
    check_sheet(out, rep, title).save(os.path.join(CHECK, name + '.png')); print('  ภาพตรวจ →', os.path.join(CHECK, name + '.png'))
    if a.cmd != 'install': return
    def feet_w(f):  # ความกว้างช่วงเท้า (เหนือเส้นพื้น 26 px)
        bb = f.crop((0, GROUND - 28, CELL, GROUND - 2)).getchannel('A').point(lambda v: 255 if v > 80 else 0).getbbox()
        return (bb[2] - bb[0]) if bb else 999
    def lowest_two(f):  # เท้าทั้งสองแตะพื้น: มีเนื้อที่แถวล่างสุดเป็น 2 ก้อนแยกกัน หรือก้อนเดียวที่กว้าง
        a_ = f.getchannel('A').crop((0, GROUND - 6, CELL, GROUND)).point(lambda v: 1 if v > 80 else 0)
        cols = [any(a_.getpixel((x, y)) for y in range(6)) for x in range(CELL)]
        runs = sum(1 for x in range(1, CELL) if cols[x] and not cols[x - 1]) + (1 if cols[0] else 0)
        return runs >= 2
    def pick_still(frs):
        both = [f for f in frs if lowest_two(f)] or frs
        return [min(both, key=feet_w)]
    if a.dirs:
        names = [d.strip().upper() for d in a.dirs.split(',')]
        per = len(out) // len(names)
        rows_by = {d: out[i * per:(i + 1) * per] for i, d in enumerate(names)}
        if a.still:
            rows_by = {d: pick_still(v) for d, v in rows_by.items()}; per = 1
        for d in DIRS:  # ทิศที่ขาด: กลับด้านจากทิศคู่ ไม่มีก็ใช้ทิศที่ใกล้ที่สุด
            if d in rows_by: continue
            if MIRROR.get(d) in rows_by: rows_by[d] = [ImageOps.mirror(f) for f in rows_by[MIRROR[d]]]; print(f'  ทิศ {d} = กลับด้าน {MIRROR[d]}')
        for d in DIRS:
            if d in rows_by: continue
            i = DIRS.index(d); near = min((x for x in rows_by if x in DIRS), key=lambda x: min((DIRS.index(x) - i) % 8, (i - DIRS.index(x)) % 8))
            rows_by[d] = rows_by[near]; print(f'  ทิศ {d} = ใช้ {near}')
        strip = Image.new('RGBA', (CELL * per, CELL * 8), (0, 0, 0, 0))
        for r, d in enumerate(DIRS):
            for i, f in enumerate(rows_by[d]): strip.alpha_composite(f, (i * CELL, r * CELL))
    else:
        if a.still: out = pick_still(out)
        strip = Image.new('RGBA', (CELL * len(out), CELL), (0, 0, 0, 0))
        for i, f in enumerate(out): strip.alpha_composite(f, (i * CELL, 0))
    strip.save(os.path.join(ROOT, name + '.webp'), 'WEBP', quality=90, method=6)
    ent = sz.setdefault(a.key, {}); ent[a.action] = {'frames': strip.width // CELL, 'dirs': strip.height // CELL, 'scale_src': round(k, 4), 'median_src_h': med}
    if a.action in STANDING and (a.action == 'walk' or '_k1536' not in ent): ent['_k1536'] = round(k * src_w / TPL_W, 5)
    json.dump(sz, open(SIZES, 'w'), indent=1, ensure_ascii=False)
    manifest(); print('ติดตั้ง →', name + '.webp')


if __name__ == '__main__':
    main()
