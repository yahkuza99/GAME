"""ไอคอนรูน 3D (หินรูนแกะสลัก) — เรนเดอร์ด้วย Blender (Cycles) แล้วติดตั้งเป็น assets/rune_<id>.webp

สไตล์: "premium 3D กลิ่นอาย Ragnarok" — สว่าง สีอิ่ม ก้อนมนน่ารัก เส้นขอบ Freestyle บาง แสงหลักจากซ้ายบน
หินตั้งหันหน้าเข้ากล้อง เอียง 3/4 (เห็นข้างซ้ายที่โดนแสง) • ขอบลบมุม + หน้าหินนูนเล็กน้อย
อักษรรูนแกะลึกจริง (ดันเวอร์เท็กซ์ตามภาพความสูง) + เรืองแสงสีของรูน (emission ในร่อง + เรืองจาง ๆ บนผิวรอบร่อง)
+ แสงฟุ้ง (bloom) จากพาสเรืองแสงแยก ใส่ตอน --install

ชุดหิน (1 รูปทรง/วัสดุ ต่อกลุ่ม — รูนในกลุ่มต่างกันที่อักษร + สี + ของประดับ):
  Hunt Rune (js/huntrunes.js — 18 อัน)
    slayer  หินเหล็กเข้ม ขอบบรอนซ์ หมุดย้ำ  + ของประดับบอกเผ่า (เฟือง/ใบไม้/หนวดแมลง/ลูกแก้วลอย/กระดูกไขว้/เขาปีศาจ/รัศมี+ปีก/ดาบไขว้)
    endow   หินคริสตัลย้อมสีธาตุ ทรงยอดแหลม + กระจุกผลึกธาตุที่ฐาน
    cond    ออบซิเดียนเงา ทรงแปดเหลี่ยม ขอบทอง หมุดทอง + อัญมณีบนยอดสีรูน
  Skill Rune (js/runes.js — 72 อัน = 6 Class × 6 สกิล × 2)
    เลือกแบบ "หิน 1 ชุดต่อ Class" (6 ชุด) ไม่ใช่ 36 ชุดต่อสกิล เพราะ:
      • ที่ 48–64px รูปทรง/วัสดุบอก "Class" ได้ทันที (ผู้เล่นเห็นแต่รูนของ Class ตัวเอง) ส่วนอักษร+สีบอก "รูนไหน"
      • 36 ทรงต่อสกิลจะต่างกันนิดเดียวจนดูไม่ออกที่ขนาดไอคอน แต่เพิ่มงาน/เวลาเรนเดอร์ 6 เท่า
      • ใต้อักษรมีจุดเรืองบอกแนวการเล่นของรูน (1 จุด = เป้าเดี่ยว • 2 = รอบด้าน • 3 = ฝูง) → ไอคอนไม่ซ้ำกันทั้ง 72
    einherjar  หินแกรนิตทรงโล่ ขอบเหล็กกล้า หมุดย้ำ
    runecaster แผ่นหินชนวนฟ้าทรงโค้ง (หินรูนคลาสสิก) ร่องกรอบเรืองแสง
    wildhunter ก้อนกรวดแม่น้ำ มอสบนหัว ใบไม้สองใบ
    volva      เหรียญหินอ่อนขาวลายทอง ขอบทอง หมุดทองแปดทิศ
    trickster  หินอเมทิสต์เข้มทรงหกเหลี่ยมยอดแหลม ขอบเงิน
    berserker  หินทรายแดงแตกหยัก รอยกรงเล็บสามเส้น

ใช้:
  /tmp/bvenv/bin/python tools/rune3d.py --render [--only id,id,...] [--samples 64] [--raw /tmp/rune3d_raw]
      → <raw>/<key>.png (ภาพหลัก 256px) + <raw>/<key>_glow.png (พาสเรืองแสง) • key = rune_<id> ('.' → '_')
  python3 tools/rune3d.py --install [--raw /tmp/rune3d_raw] [--sheet dir]
      → assets/rune_<key>.webp 128px + assets/manifest.json (+ แผ่นรวมตรวจภาพ 64px บนกระดาษ/พื้นมืด ถ้าให้ --sheet)
ผลลัพธ์ซ้ำได้ (deterministic): seed ตายตัว • ข้อมูลรูนอ่านจาก js โดยตรง (เพิ่มรูนใหม่ → รันซ้ำได้เลย)
เกมใช้: itemIconUrl(id) / itemIconCanvas (js/sprites.js) สำหรับ Hunt Rune • Runes.iconUrl(runeId) สำหรับ Skill Rune
"""
import math, os, sys, re, json, random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = '/tmp/rune3d_raw'
RES = 256            # ขนาดเรนเดอร์
OUT = 128            # ขนาดไฟล์ติดตั้ง
M = 512              # ขนาดภาพความสูง/เรืองแสงของหน้าหิน

CLASS_NAME = {'Einherjar': 'einherjar', 'Rune Caster': 'runecaster', 'Wildhunter': 'wildhunter', 'Völva': 'volva',
              "Loki's Trickster": 'trickster', 'Berserker': 'berserker'}
INTENT_PIPS = {'single': 1, 'both': 2, 'pack': 3}


def key_of(rid):
    return 'rune_' + re.sub(r'[^A-Za-z0-9_]', '_', rid)


# ============================================================
#  ข้อมูลรูน (อ่านจาก js)
# ============================================================
def load_runes():
    hr = open(os.path.join(ROOT, 'js', 'huntrunes.js'), encoding='utf8').read()
    strokes = {k: json.loads(v) for k, v in re.findall(r"^\s+(\w+): (\[\[\[.*?\]\]\]),?$", hr.split('const HR_GLYPH')[1].split('};')[0], re.M)}
    out = []
    slay = hr.split('const slay')[1].split(']];')[0] + ']]'
    for race, col in re.findall(r"\['(\w+)', \d+, '(#[0-9a-fA-F]{6})'\]", slay):
        out.append(dict(id='hr_slay_' + race, fam='slayer', race=race, col=col, glyph=strokes['tiwaz']))
    m = re.search(r"id: 'hr_slay_human'.*?col: '(#[0-9a-fA-F]{6})', glyph: '(\w+)'", hr)
    out.append(dict(id='hr_slay_human', fam='slayer', race='human', col=m.group(1), glyph=strokes[m.group(2)]))
    endow = hr.split('const endow')[1].split(']];')[0] + ']]'
    for el, col, g in re.findall(r"\['(\w+)', \d+, '(#[0-9a-fA-F]{6})', '(\w+)'\]", endow):
        out.append(dict(id='hr_endow_' + el, fam='endow', elem=el, col=col, glyph=strokes[g]))
    for rid, g, col in re.findall(r"C\('(hr_\w+)', '(\w+)', '(#[0-9a-fA-F]{6})'", hr):
        out.append(dict(id=rid, fam='cond', col=col, glyph=strokes[g]))
    assert len(out) == 18, f'Hunt Rune ควรมี 18 อัน (เจอ {len(out)})'

    rs = open(os.path.join(ROOT, 'js', 'runes.js'), encoding='utf8').read()
    cls = None; n = 0
    for line in rs.split('\n'):
        mc = re.search(r'// =+ (.+?) =+', line)
        if mc and mc.group(1) in CLASS_NAME: cls = CLASS_NAME[mc.group(1)]
        mr = re.search(r"\{ id: '([a-z_]+\.[a-z_]+)', name: (?:'[^']*'|\"[^\"]*\"), intent: '(\w+)', glyph: '([^']*)', col: '(#[0-9a-fA-F]{6})'", line)
        if mr:
            assert cls, 'ไม่รู้ Class ของ ' + mr.group(1)
            out.append(dict(id=mr.group(1), fam=cls, intent=mr.group(2), col=mr.group(4), glyph=mr.group(3)))
            n += 1
    assert n == 72, f'Skill Rune ควรมี 72 อัน (เจอ {n})'
    for r in out: r['key'] = key_of(r['id'])
    return out


# ============================================================
#  อักษรรูน → ภาพขาวดำ (PIL)
# ============================================================
# อักษร Runic ใน runes.js: ฟอนต์ในเครื่องมีแต่ Unifont (บิตแมป) → วาดเส้นเองแบบเดียวกับ HR_GLYPH (กล่อง 10×14, y ลง)
FUTHARK = {
    'ᚲ': [[[8, 1], [2, 7], [8, 13]]],
    'ᚹ': [[[3, 14], [3, 0]], [[3, 0], [8, 4], [3, 8]]],
    'ᚺ': [[[2, 0], [2, 14]], [[8, 0], [8, 14]], [[2, 5], [8, 9]]],
    'ᛉ': [[[5, 14], [5, 0]], [[5, 6], [1, 1]], [[5, 6], [9, 1]]],
    'ᛊ': [[[7, 0], [2, 5], [8, 9], [3, 14]]],
    'ᛝ': [[[2, 1], [8, 7], [2, 13]], [[8, 1], [2, 7], [8, 13]]],
    'ᛟ': [[[1, 14], [8, 6], [5, 1], [2, 6], [9, 14]]],
}
FONTS = ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf',
         '/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
         '/usr/share/fonts/truetype/freefont/FreeSans.ttf', '/usr/share/fonts/truetype/freefont/FreeSerif.ttf',
         '/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf']
_cmaps = {}


def font_for(ch):
    try:
        from fontTools.ttLib import TTFont
    except ImportError:
        return FONTS[0]
    for f in FONTS:
        if not os.path.exists(f): continue
        if f not in _cmaps: _cmaps[f] = TTFont(f, fontNumber=0).getBestCmap() or {}
        if ord(ch[0]) in _cmaps[f]: return f
    return FONTS[0]


def stroke_img(strokes, S, w):
    from PIL import Image, ImageDraw
    im = Image.new('L', (S, S), 0); d = ImageDraw.Draw(im)
    k = S * 0.86 / 14; ox = (S - 10 * k) / 2; oy = (S - 14 * k) / 2
    for st in strokes:
        pts = [(ox + x * k, oy + y * k) for x, y in st]
        d.line(pts, fill=255, width=int(w), joint='curve')
        for x, y in pts: d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=255)
    return im


def glyph_img(g, S=256):
    """อักษรรูนเป็นภาพ L ขนาด S×S (ขาว = ร่อง) • ความหนาเส้นปรับให้ใกล้เคียงกันทุกตัว (อ่านออกที่ 48px)"""
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
    W = S * 0.105                           # ความหนาเส้นเป้าหมาย
    if isinstance(g, list): return stroke_img(g, S, W)
    if g in FUTHARK: return stroke_img(FUTHARK[g], S, W)
    if g == '🌀':                            # ฟอนต์ในเครื่องวาดเป็นจุลภาค → เกลียวลากเส้นเอง
        sp = [[5 + (0.45 + t * 4.6) * math.cos(t * 2 * math.pi * 2.25 + 0.4), 7 + (0.45 + t * 4.6) * 1.18 * math.sin(t * 2 * math.pi * 2.25 + 0.4)] for t in [i / 80 for i in range(81)]]
        return stroke_img([sp], S, W * 0.85)
    f = font_for(g); big = 512
    if f.endswith('NotoColorEmoji.ttf'):
        fnt = ImageFont.truetype(f, 109); c = Image.new('RGBA', (220, 220), (0, 0, 0, 0))
        ImageDraw.Draw(c).text((110, 110), g, font=fnt, anchor='mm', embedded_color=True)
        a = c.getchannel('A')
    else:
        fnt = ImageFont.truetype(f, 380); a = Image.new('L', (big, big), 0)
        ImageDraw.Draw(a).text((big / 2, big / 2), g, font=fnt, fill=255, anchor='mm')
    a = a.point(lambda v: 255 if v > 110 else 0)
    bb = a.getbbox(); a = a.crop(bb)
    fit = S * 0.84; k = min(fit / a.width, fit / a.height)
    a = a.resize((max(1, round(a.width * k)), max(1, round(a.height * k))), Image.LANCZOS).point(lambda v: 255 if v > 120 else 0)
    out = Image.new('L', (S, S), 0); out.paste(a, ((S - a.width) // 2, (S - a.height) // 2))
    # ความหนาเส้น: นับจำนวนครั้งที่กร่อน (3×3) จนพื้นที่เหลือ < 45% ≈ ครึ่งความหนาเส้น → เส้นบางกว่าเป้าหมาย = ขยาย
    area = sum(out.histogram()[128:]); e = out; half = 0
    while half < 40:
        e = e.filter(ImageFilter.MinFilter(3)); half += 1
        if sum(e.histogram()[128:]) < area * 0.45: break
    grow = min(6, int(round(W / 2 - half)))
    # ขยายได้ไม่เกินที่รูภายในอักษร (เช่น วงใน ◎ ช่องว่างระหว่างแฉก) ยังเหลือ ≥ 55% — กันอักษรละเอียดกลายเป็นก้อน
    h0 = holes(out); best = out; g = out
    for _ in range(max(0, grow)):
        g = g.filter(ImageFilter.MaxFilter(3))
        if h0 and holes(g) < h0 * 0.55: break
        best = g
    return best


def holes(im):
    """จำนวนพิกเซลพื้นหลังที่ถูกอักษรล้อมไว้ (ไม่ต่อกับขอบภาพ) + ช่องแคบระหว่างแฉก (วัดจากพื้นที่ใน convex hull หยาบ)"""
    from PIL import ImageDraw, ImageOps
    inv = ImageOps.invert(im.point(lambda v: 255 if v > 127 else 0)).convert('L')
    pad = Image_pad(inv)
    ImageDraw.floodfill(pad, (0, 0), 0)
    return sum(pad.histogram()[128:])


def Image_pad(im):
    from PIL import Image
    p = Image.new('L', (im.width + 2, im.height + 2), 255); p.paste(im, (1, 1)); return p


# ============================================================
#  ชุดหิน
# ============================================================
def chaikin(pts, it=3):
    for _ in range(it):
        q = []
        for i in range(len(pts)):
            a, b = pts[i], pts[(i + 1) % len(pts)]
            q += [(a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25), (a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75)]
        pts = q
    return pts


def outline(shape, W, H, seed=0):
    """เส้นรอบรูปหน้าหิน (x, z) ทวนเข็ม • มุมมนด้วย Chaikin"""
    rnd = random.Random(seed)
    if shape == 'ellipse':
        n = 120
        pts = []
        for i in range(n):
            a = i / n * 2 * math.pi
            r = 1 + 0.035 * math.sin(3 * a + 0.7) + 0.025 * math.sin(5 * a + 2.1)
            pts.append((W / 2 * r * math.cos(a), H / 2 * r * math.sin(a)))
        return pts
    if shape == 'arch':          # แผ่นหินรูนคลาสสิก: ล่างสอบเล็กน้อย ยอดโค้ง
        pts = [(-W / 2 * 0.92, -H / 2), (W / 2 * 0.92, -H / 2), (W / 2, H / 2 - W / 2)]
        for i in range(1, 16): a = i / 16 * math.pi; pts.append((W / 2 * math.cos(a), H / 2 - W / 2 + W / 2 * 1.0 * math.sin(a)))
        pts.append((-W / 2, H / 2 - W / 2))
        return chaikin(pts, 3)
    if shape == 'shield':
        pts = [(-W / 2, H / 2), (W / 2, H / 2)]
        for i in range(1, 12):
            t = i / 12
            pts.append((W / 2 * (1 - t ** 2.2), H / 2 - 0.42 * H * 0 - H * t))
        pts.append((0, -H / 2))
        for i in range(11, 0, -1):
            t = i / 12
            pts.append((-W / 2 * (1 - t ** 2.2), H / 2 - H * t))
        return chaikin(pts, 3)
    if shape == 'squircle':
        n = 120; pts = []
        for i in range(n):
            a = i / n * 2 * math.pi; c, s = math.cos(a), math.sin(a)
            pts.append((W / 2 * math.copysign(abs(c) ** 0.5, c), H / 2 * math.copysign(abs(s) ** 0.5, s)))
        return pts
    if shape == 'disc':
        return [(W / 2 * math.cos(i / 120 * 2 * math.pi), H / 2 * math.sin(i / 120 * 2 * math.pi)) for i in range(120)]
    if shape == 'shard':         # ยอดแหลม ไหล่ตัด ล่างสอบ
        pts = [(-W * 0.40, -H / 2), (W * 0.40, -H / 2), (W / 2, H * 0.14), (0, H / 2), (-W / 2, H * 0.14)]
        return chaikin(pts, 2)
    if shape == 'hexpoint':
        pts = [(0, -H / 2), (W / 2, -H * 0.24), (W / 2, H * 0.24), (0, H / 2), (-W / 2, H * 0.24), (-W / 2, -H * 0.24)]
        return chaikin(pts, 3)
    if shape == 'octagon':
        pts = []
        for i in range(8):
            a = (i + 0.5) / 8 * 2 * math.pi
            pts.append((W / 2 / math.cos(math.pi / 8) * math.cos(a), H / 2 / math.cos(math.pi / 8) * math.sin(a)))
        return chaikin(pts, 3)
    if shape == 'jagged':        # หินแตก: หลายเหลี่ยมไม่สม่ำเสมอ
        base = [(-0.50, -0.42), (-0.12, -0.50), (0.30, -0.47), (0.50, -0.20), (0.44, 0.10), (0.50, 0.36), (0.18, 0.50), (-0.20, 0.44), (-0.48, 0.30), (-0.44, -0.02)]
        pts = [(x * W, z * H) for x, z in base]
        return chaikin(pts, 2)
    raise ValueError(shape)


# พารามิเตอร์ชุดหิน • col = ไล่สีหิน (มืด→สว่าง, sRGB 0..1) • rim = ขอบโลหะ • acc = ของประดับ
FAMILY = {
    'slayer':     dict(shape='squircle', W=0.86, H=0.96, T=0.30, col=[(0.15, 0.15, 0.17), (0.30, 0.29, 0.30), (0.42, 0.40, 0.40)], rough=0.6, nscale=7, rim='bronze', rivets=8, gy=0.02),
    'endow':      dict(shape='shard', W=0.80, H=1.00, T=0.30, col=None, rough=0.25, nscale=5, crystal=True, gy=-0.03),
    'cond':       dict(shape='octagon', W=0.92, H=0.92, T=0.28, col=[(0.03, 0.03, 0.05), (0.09, 0.08, 0.12), (0.20, 0.18, 0.26)], rough=0.18, coat=1.0, nscale=4, rim='gold', rivets=8, gem=True, gy=0.0),
    'einherjar':  dict(shape='shield', W=0.86, H=1.00, T=0.28, col=[(0.32, 0.33, 0.36), (0.52, 0.53, 0.56), (0.66, 0.66, 0.68)], rough=0.6, nscale=9, rim='steel', rivets=7, gy=0.10, pipz=-0.24),
    'runecaster': dict(shape='arch', W=0.76, H=1.02, T=0.26, col=[(0.12, 0.20, 0.32), (0.24, 0.36, 0.50), (0.38, 0.50, 0.62)], rough=0.55, nscale=6, border_glow=True, gy=0.04, pipz=-0.34),
    'wildhunter': dict(shape='ellipse', W=0.86, H=0.98, T=0.36, col=[(0.30, 0.25, 0.18), (0.50, 0.44, 0.33), (0.66, 0.60, 0.48)], rough=0.75, nscale=5, moss=True, leaves=True, gy=0.03, pipz=-0.33, bumpy=0.02),
    'volva':      dict(shape='disc', W=0.96, H=0.96, T=0.24, col=[(0.80, 0.78, 0.74), (0.93, 0.91, 0.88), (1.0, 0.99, 0.97)], rough=0.3, coat=0.6, nscale=3, veins=True, rim='gold', rivets=8, gy=0.03, pipz=-0.32,
                       panel=(0.16, 0.24, 0.50)),   # แผ่นในกรอบเป็นลาพิสลาซูลีน้ำเงิน → อักษรสีอ่อนเด่นบนหินอ่อนขาว
    'trickster':  dict(shape='hexpoint', W=0.84, H=1.04, T=0.28, col=[(0.10, 0.06, 0.16), (0.22, 0.14, 0.32), (0.36, 0.25, 0.48)], rough=0.22, coat=0.8, nscale=5, rim='silver', rivets=0, gy=0.03, pipz=-0.30),
    'berserker':  dict(shape='jagged', W=0.92, H=0.96, T=0.32, col=[(0.30, 0.10, 0.07), (0.52, 0.22, 0.14), (0.68, 0.36, 0.24)], rough=0.8, nscale=7, claws=True, gy=0.04, pipz=-0.33, bumpy=0.025),
}
ELEM_STONE = {'water': '#3a90e0', 'wind': '#3ab89a', 'earth': '#b08040', 'fire': '#e8602a', 'holy': '#e8c850', 'shadow': '#6a4a9a'}
METAL = {'bronze': (0.80, 0.46, 0.20), 'gold': (1.0, 0.74, 0.26), 'steel': (0.74, 0.77, 0.82), 'silver': (0.86, 0.86, 0.92)}


def hex2rgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def lin(c):
    return tuple(((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c)


def sat_boost(c, s=1.25, minv=0.0):
    import colorsys
    h, l, ss = colorsys.rgb_to_hls(*c)
    return colorsys.hls_to_rgb(h, max(minv, l), min(1.0, ss * s))


def rune_rgb(h):
    """สีเรืองของรูน: อิ่มขึ้น + จำกัดความสว่าง (สีพาสเทลอย่าง #e8ecff ไม่กลายเป็นขาวล้วนตอนเรือง)"""
    import colorsys
    hh, l, s = colorsys.rgb_to_hls(*hex2rgb(h))
    return colorsys.hls_to_rgb(hh, min(l, 0.60), min(1.0, s * 1.5 if s > 0.08 else s))


def face_maps(fam, F, rune, ol, S):
    """ภาพหน้าหิน M×M ครอบกล่อง S×S (ม.) กลางหิน → R = เรืองแสงแกน, G = เรืองจางรอบร่อง, B = ความลึก (ร่อง)"""
    from PIL import Image, ImageDraw, ImageFilter, ImageChops
    px = M / S
    def P(x, z): return (M / 2 + x * px, M / 2 - z * px)
    # อักษร
    gs = int(min(F['W'], F['H']) * 0.64 * px)
    if fam == 'endow': gs = int(min(F['W'], F['H']) * 0.60 * px)
    gim = glyph_img(rune['glyph'], 256).resize((gs, gs), Image.LANCZOS).point(lambda v: 255 if v > 127 else 0)
    gl = Image.new('L', (M, M), 0)
    cx, cy = P(0, F.get('gy', 0))
    gl.paste(gim, (int(cx - gs / 2), int(cy - gs / 2)))
    # จุดแนวการเล่น (Skill Rune)
    pip = Image.new('L', (M, M), 0)
    if 'intent' in rune:
        n = INTENT_PIPS.get(rune['intent'], 0); d = ImageDraw.Draw(pip); r = 0.024 * px; sp = 0.075 * px
        x0, y0 = P(0, F.get('pipz', -0.33) * F['H'] / 0.98 * 0.98)
        for i in range(n):
            x = x0 + (i - (n - 1) / 2) * sp
            d.ellipse((x - r, y0 - r, x + r, y0 + r), fill=255)
    # ร่องกรอบตามขอบ (ร่นเข้ามา)
    bd = Image.new('L', (M, M), 0)
    inset = 0.085 if fam != 'wildhunter' else 0
    if inset:
        sc = []
        cxo = sum(p[0] for p in ol) / len(ol); czo = sum(p[1] for p in ol) / len(ol)
        for x, z in ol:
            # ร่นเข้าหาจุดศูนย์กลางตามสัดส่วน (พอสำหรับรูปนูน)
            kx = 1 - inset / (F['W'] / 2); kz = 1 - inset / (F['H'] / 2)
            sc.append(P(cxo + (x - cxo) * kx, czo + (z - czo) * kz))
        ImageDraw.Draw(bd).line(sc + [sc[0]], fill=255, width=max(2, int(0.016 * px)), joint='curve')
    # รอยกรงเล็บ (Berserker)
    cl = Image.new('L', (M, M), 0)
    if F.get('claws'):
        d = ImageDraw.Draw(cl)
        for i in range(3):
            a = P(0.20 + i * 0.07, 0.40); b = P(0.36 + i * 0.07, 0.20)
            d.line([a, b], fill=255, width=int(0.022 * px))
    # ความลึก: อักษรลึกสุด (ขอบร่องลาดด้วย blur) • จุด/กรอบ/กรงเล็บตื้นกว่า
    hB = ImageChops.lighter(gl.filter(ImageFilter.GaussianBlur(2.2)),
                            ImageChops.lighter(pip.filter(ImageFilter.GaussianBlur(1.5)).point(lambda v: int(v * 0.8)),
                                               ImageChops.lighter(bd.filter(ImageFilter.GaussianBlur(1.6)).point(lambda v: int(v * 0.45)),
                                                                  cl.filter(ImageFilter.GaussianBlur(2.0)).point(lambda v: int(v * 0.6)))))
    # เรืองแสงแกน: อักษร + จุด (+ กรอบจาง ๆ สำหรับ Runecaster)
    core = ImageChops.lighter(gl, pip.point(lambda v: int(v * 0.85)))
    if F.get('border_glow'): core = ImageChops.lighter(core, bd.point(lambda v: int(v * 0.5)))
    if F.get('claws'): core = ImageChops.lighter(core, cl.point(lambda v: int(v * 0.25)))
    core = core.filter(ImageFilter.MinFilter(7)).filter(ImageFilter.GaussianBlur(1.2))   # เรืองที่ก้นร่อง (ผนังร่องมืด → เห็นความลึก)
    halo = ImageChops.lighter(gl, pip).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(12))
    # A = แผ่นในกรอบ (สำหรับชุดที่มี panel)
    pn = Image.new('L', (M, M), 0)
    if inset and F.get('panel'):
        ImageDraw.Draw(pn).polygon(sc, fill=255); pn = pn.filter(ImageFilter.GaussianBlur(1.5))
    return Image.merge('RGBA', (core, halo, hB, pn))


# ============================================================
#  Blender
# ============================================================
def render(samples, raw, only=None):
    import bpy, bmesh
    import numpy as np
    from mathutils import Vector, Matrix, noise
    from PIL import Image
    os.makedirs(raw, exist_ok=True)
    runes = load_runes()
    if only: runes = [r for r in runes if r['id'] in only or r['key'] in only]
    print('รูนที่จะเรนเดอร์:', len(runes))

    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    SWITCH = []        # โหนด Value ในทุกวัสดุ: 0 = ภาพปกติ, 1 = พาสเรืองแสง (ทุกอย่างดำ ยกเว้นส่วนที่เรือง)

    # ---------- วัสดุ ----------
    def new_mat(name):
        m = bpy.data.materials.new(name); m.use_nodes = True
        nt = m.node_tree; b = nt.nodes['Principled BSDF']
        return m, nt, b

    def finish(nt, b, glow_col=None):
        """ต่อสวิตช์พาสเรืองแสง: ปกติ = BSDF • พาสเรือง = Emission(glow_col หรือดำ)"""
        out = nt.nodes['Material Output']
        sw = nt.nodes.new('ShaderNodeValue'); sw.outputs[0].default_value = 0; SWITCH.append(sw)
        em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1.0
        if glow_col is None: em.inputs['Color'].default_value = (0, 0, 0, 1)
        else: nt.links.new(glow_col, em.inputs['Color'])
        mx = nt.nodes.new('ShaderNodeMixShader')
        nt.links.new(sw.outputs[0], mx.inputs['Fac']); nt.links.new(b.outputs[0], mx.inputs[1]); nt.links.new(em.outputs[0], mx.inputs[2])
        nt.links.new(mx.outputs[0], out.inputs['Surface'])

    def ramp(nt, fac, cols):
        r = nt.nodes.new('ShaderNodeValToRGB'); el = r.color_ramp.elements
        for i, (pos, c) in enumerate(cols):
            e = el[i] if i < len(el) else el.new(pos)
            e.position = pos; e.color = (*lin(c), 1)
        nt.links.new(fac, r.inputs['Fac'])
        return r.outputs['Color']

    def metal_mat(name, col, rough=0.28):
        m, nt, b = new_mat(name)
        n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = 18; n.inputs['Detail'].default_value = 6
        nt.links.new(ramp(nt, n.outputs['Fac'], [(0.3, tuple(c * 0.78 for c in col)), (0.7, tuple(min(1, c * 1.08) for c in col))]), b.inputs['Base Color'])
        b.inputs['Metallic'].default_value = 1.0; b.inputs['Roughness'].default_value = rough
        finish(nt, b); return m

    def flat_mat(name, col, rough=0.5, emit=0.0, coat=0.0, metal=0.0):
        m, nt, b = new_mat(name)
        b.inputs['Base Color'].default_value = (*lin(col), 1); b.inputs['Roughness'].default_value = rough
        b.inputs['Metallic'].default_value = metal
        if coat: b.inputs['Coat Weight'].default_value = coat
        glow = None
        if emit:
            b.inputs['Emission Color'].default_value = (*lin(col), 1); b.inputs['Emission Strength'].default_value = emit
            rgb = nt.nodes.new('ShaderNodeRGB'); rgb.outputs[0].default_value = (*lin(col), 1)
            vm = nt.nodes.new('ShaderNodeVectorMath'); vm.operation = 'SCALE'; vm.inputs['Scale'].default_value = emit
            nt.links.new(rgb.outputs[0], vm.inputs[0]); glow = vm.outputs[0]
        finish(nt, b, glow); return m

    # ---------- เครื่องมือรูปทรง ----------
    def link(o, coll):
        coll.objects.link(o); return o

    def mesh_obj(name, bm, mat, coll, smooth=True, parent=None):
        me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new(name, me); link(o, coll)
        if isinstance(mat, (list, tuple)):
            for mm in mat: o.data.materials.append(mm)
        else: o.data.materials.append(mat)
        o.data.polygons.foreach_set('use_smooth', [smooth] * len(o.data.polygons))
        if parent: o.parent = parent
        return o

    def sweep(bm, path, prof, closed=True, frame_up=None):
        """กวาดหน้าตัด prof [(a, b)] ไปตาม path [Vector] • a = ทิศตั้งฉากในระนาบ, b = ทิศ up"""
        n = len(path); rings = []
        for i in range(n):
            p0 = path[(i - 1) % n] if closed or i > 0 else path[i]
            p1 = path[(i + 1) % n] if closed or i < n - 1 else path[i]
            t = (p1 - p0).normalized()
            up = frame_up(i) if frame_up else Vector((0, 1, 0))
            side = t.cross(up).normalized(); up2 = side.cross(t).normalized()
            pr = prof(i / max(1, n - 1)) if callable(prof) else prof
            rings.append([bm.verts.new(path[i] + side * a + up2 * b) for a, b in pr])
        m = len(rings[0])
        for i in range(n if closed else n - 1):
            A, B = rings[i], rings[(i + 1) % n]
            for j in range(m):
                bm.faces.new((A[j], A[(j + 1) % m], B[(j + 1) % m], B[j]))
        if not closed:
            for ring, rev in ((rings[0], True), (rings[-1], False)):
                c = bm.verts.new(sum((v.co for v in ring), Vector()) / m)
                for j in range(m):
                    f = (ring[j], ring[(j + 1) % m], c)
                    bm.faces.new(f[::-1] if rev else f)
        return rings

    def round_prof(w, h, seg=10):
        """หน้าตัดสี่เหลี่ยมมน w (ทิศออก) × h (ทิศ up)"""
        out = []; r = min(w, h) * 0.45
        for q in range(4):
            cx = (w / 2 - r) * (1 if q in (0, 3) else -1); cy = (h / 2 - r) * (1 if q in (0, 1) else -1)
            for k in range(seg // 4 + 1):
                a = (q + k / (seg // 4)) * math.pi / 2
                out.append((cx + r * math.cos(a), cy + r * math.sin(a)))
        return out

    def ellipsoid(bm, c, r, rot=Matrix()):
        bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=14, radius=1.0,
                                  matrix=Matrix.Translation(c) @ rot @ Matrix.Diagonal((*r, 1)))

    # ---------- แสง / กล้อง / ฉาก ----------
    def light(name, energy, rot, col, angle=8):
        L = bpy.data.lights.new(name, 'SUN'); L.energy = energy; L.angle = math.radians(angle); L.color = col
        o = bpy.data.objects.new(name, L); sc.collection.objects.link(o); o.rotation_euler = rot
        return o
    light('key', 4.6, (math.radians(48), 0, math.radians(-140)), (1.0, 0.95, 0.86), 6)     # ซ้ายบน-หน้า
    light('fill', 1.1, (math.radians(70), 0, math.radians(150)), (0.70, 0.80, 1.0), 20)    # ขวา-หน้า เย็น
    light('rim', 3.2, (math.radians(-55), 0, math.radians(20)), (1.0, 0.88, 0.70), 10)     # หลังบนขวา (ขอบสว่าง)
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.70, 0.74, 0.85, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.65

    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.sensor_fit = 'HORIZONTAL'; cam.clip_end = 100
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
    EL = math.radians(14)                                   # กล้องเงยลงมอง 14°
    co.rotation_euler = (math.pi / 2 - EL, 0, 0)
    cdir = Vector((0, math.cos(EL), -math.sin(EL))); cup = Vector((0, math.sin(EL), math.cos(EL))); cright = Vector((1, 0, 0))

    sc.render.resolution_x = sc.render.resolution_y = RES; sc.render.resolution_percentage = 100
    sc.render.film_transparent = True
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 6; sc.cycles.glossy_bounces = 3; sc.cycles.transmission_bounces = 4
    sc.cycles.seed = 7
    sc.view_settings.view_transform = 'AgX'
    try: sc.view_settings.look = 'AgX - Punchy'
    except Exception: pass
    sc.view_settings.exposure = 0.35
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    vl = bpy.context.view_layer
    sc.render.line_thickness_mode = 'ABSOLUTE'; sc.render.line_thickness = 1.0
    vl.use_freestyle = True
    fs = vl.freestyle_settings; fs.crease_angle = math.radians(118)
    ls = fs.linesets[0] if fs.linesets else fs.linesets.new('ink')
    ls.select_by_visibility = True; ls.select_silhouette = True; ls.select_border = True; ls.select_crease = True
    if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new('ink')
    ls.linestyle.color = (0.10, 0.06, 0.05); ls.linestyle.alpha = 0.85; ls.linestyle.thickness = 1.7

    # รูปหน้าหิน (R/G/B) — ภาพเดียวใช้ร่วมทุกวัสดุหิน
    IMG = bpy.data.images.new('face', M, M, alpha=True, float_buffer=True)
    IMG.colorspace_settings.name = 'Non-Color'; IMG.alpha_mode = 'CHANNEL_PACKED'

    def stone_mat(fam, F, rune_rgb_node_holder):
        m, nt, b = new_mat('stone_' + fam)
        # สีหิน: noise ใหญ่ + voronoi (ลายผลึก/หินแกรนิต)
        tc = nt.nodes.new('ShaderNodeTexCoord')
        n1 = nt.nodes.new('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = F['nscale']; n1.inputs['Detail'].default_value = 8; n1.inputs['Roughness'].default_value = 0.6
        nt.links.new(tc.outputs['Object'], n1.inputs['Vector'])
        vo = nt.nodes.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = F['nscale'] * 6
        nt.links.new(tc.outputs['Object'], vo.inputs['Vector'])
        mixf = nt.nodes.new('ShaderNodeMix'); mixf.data_type = 'FLOAT'; mixf.inputs['Factor'].default_value = 0.25
        nt.links.new(n1.outputs['Fac'], mixf.inputs['A']); nt.links.new(vo.outputs['Distance'], mixf.inputs['B'])
        cols = F['col']
        if F.get('crystal'):
            e = sat_boost(hex2rgb(F['_elem']), 1.15)
            cols = [tuple(c * 0.20 for c in e), tuple(min(1, c * 0.42 + 0.05) for c in e), tuple(min(1, c * 0.55 + 0.16) for c in e)]
        stone = ramp(nt, mixf.outputs['Result'], [(0.25, cols[0]), (0.55, cols[1]), (0.85, cols[2])])
        if F.get('veins'):     # หินอ่อน: เส้นทองคดเคี้ยว
            wv = nt.nodes.new('ShaderNodeTexWave'); wv.inputs['Scale'].default_value = 2.2; wv.inputs['Distortion'].default_value = 9; wv.inputs['Detail'].default_value = 4
            nt.links.new(tc.outputs['Object'], wv.inputs['Vector'])
            vr = nt.nodes.new('ShaderNodeValToRGB'); vr.color_ramp.elements[0].position = 0.0; vr.color_ramp.elements[1].position = 0.06
            vr.color_ramp.elements[0].color = (1, 1, 1, 1); vr.color_ramp.elements[1].color = (0, 0, 0, 1)
            nt.links.new(wv.outputs['Fac'], vr.inputs['Fac'])
            mv = nt.nodes.new('ShaderNodeMix'); mv.data_type = 'RGBA'
            nt.links.new(vr.outputs['Color'], mv.inputs['Factor']); nt.links.new(stone, mv.inputs['A'])
            mv.inputs['B'].default_value = (*lin((0.95, 0.70, 0.25)), 1)
            stone = mv.outputs['Result']
        if F.get('moss'):      # มอสบนด้านที่หันขึ้น
            gn = nt.nodes.new('ShaderNodeNewGeometry')
            sepn = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(gn.outputs['Normal'], sepn.inputs[0])
            n2 = nt.nodes.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 9; n2.inputs['Detail'].default_value = 6
            nt.links.new(tc.outputs['Object'], n2.inputs['Vector'])
            add = nt.nodes.new('ShaderNodeMath'); add.operation = 'ADD'
            nt.links.new(sepn.outputs['Z'], add.inputs[0]); nt.links.new(n2.outputs['Fac'], add.inputs[1])
            mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 1.05; mr.inputs['From Max'].default_value = 1.25
            nt.links.new(add.outputs[0], mr.inputs['Value'])
            mm = nt.nodes.new('ShaderNodeMix'); mm.data_type = 'RGBA'
            nt.links.new(mr.outputs['Result'], mm.inputs['Factor']); nt.links.new(stone, mm.inputs['A'])
            nt.links.new(ramp(nt, n2.outputs['Fac'], [(0.35, (0.22, 0.42, 0.10)), (0.65, (0.50, 0.72, 0.20))]), mm.inputs['B'])
            stone = mm.outputs['Result']
        # รูปหน้าหิน
        uv = nt.nodes.new('ShaderNodeUVMap')
        ti = nt.nodes.new('ShaderNodeTexImage'); ti.image = IMG; ti.extension = 'CLIP'; ti.interpolation = 'Linear'
        nt.links.new(uv.outputs['UV'], ti.inputs['Vector'])
        sep = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(ti.outputs['Color'], sep.inputs[0])
        fr = nt.nodes.new('ShaderNodeAttribute'); fr.attribute_name = 'front'; fr.attribute_type = 'GEOMETRY'
        rgb = nt.nodes.new('ShaderNodeRGB'); rune_rgb_node_holder.append(rgb)
        # ในร่อง: สีหินมืดลง + อมสีรูน
        dk = nt.nodes.new('ShaderNodeMix'); dk.data_type = 'RGBA'; dk.blend_type = 'MULTIPLY'
        nt.links.new(sep.outputs['Blue'], dk.inputs['Factor']); nt.links.new(stone, dk.inputs['A'])
        dk.inputs['B'].default_value = (0.10, 0.09, 0.10, 1)
        if F.get('panel'):
            pm = nt.nodes.new('ShaderNodeMix'); pm.data_type = 'RGBA'; pm.blend_type = 'MULTIPLY'
            nt.links.new(ti.outputs['Alpha'], pm.inputs['Factor']); nt.links.new(stone, pm.inputs['A'])
            pm.inputs['B'].default_value = (*lin(F['panel']), 1)
            nt.links.new(pm.outputs['Result'], dk.inputs['A'])
        nt.links.new(dk.outputs['Result'], b.inputs['Base Color'])
        # เรืองแสง = สีรูน × (แกน × E1 + รอบร่อง × E2) × front
        e1 = nt.nodes.new('ShaderNodeMath'); e1.operation = 'MULTIPLY'; e1.inputs[1].default_value = 3.2
        nt.links.new(sep.outputs['Red'], e1.inputs[0])
        e2 = nt.nodes.new('ShaderNodeMath'); e2.operation = 'MULTIPLY_ADD'; e2.inputs[1].default_value = 0.55
        nt.links.new(sep.outputs['Green'], e2.inputs[0]); nt.links.new(e1.outputs[0], e2.inputs[2])
        e3 = nt.nodes.new('ShaderNodeMath'); e3.operation = 'MULTIPLY'
        nt.links.new(e2.outputs[0], e3.inputs[0]); nt.links.new(fr.outputs['Fac'], e3.inputs[1])
        vm = nt.nodes.new('ShaderNodeVectorMath'); vm.operation = 'SCALE'
        nt.links.new(rgb.outputs[0], vm.inputs[0]); nt.links.new(e3.outputs[0], vm.inputs['Scale'])
        nt.links.new(vm.outputs[0], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = 1.0
        b.inputs['Roughness'].default_value = F['rough']
        if F.get('coat'): b.inputs['Coat Weight'].default_value = F['coat']; b.inputs['Coat Roughness'].default_value = 0.08
        if F.get('crystal'):
            b.inputs['Coat Weight'].default_value = 1.0; b.inputs['Coat Roughness'].default_value = 0.05
            b.inputs['Subsurface Weight'].default_value = 0.25; b.inputs['Subsurface Radius'].default_value = (0.3, 0.3, 0.3)
            b.inputs['Subsurface Scale'].default_value = 0.05
        # ผิวหยาบ
        bn = nt.nodes.new('ShaderNodeBump'); bn.inputs['Strength'].default_value = 0.35 if not F.get('coat') else 0.12; bn.inputs['Distance'].default_value = 0.01
        nt.links.new(mixf.outputs['Result'], bn.inputs['Height']); nt.links.new(bn.outputs['Normal'], b.inputs['Normal'])
        # พาสเรือง: เฉพาะแกนอักษร (ไม่เอาเรืองจางรอบร่อง — bloom ทำเอง)
        g1 = nt.nodes.new('ShaderNodeMath'); g1.operation = 'MULTIPLY'
        nt.links.new(e1.outputs[0], g1.inputs[0]); nt.links.new(fr.outputs['Fac'], g1.inputs[1])
        gv = nt.nodes.new('ShaderNodeVectorMath'); gv.operation = 'SCALE'
        nt.links.new(rgb.outputs[0], gv.inputs[0]); nt.links.new(g1.outputs[0], gv.inputs['Scale'])
        finish(nt, b, gv.outputs[0])
        return m

    # ---------- สร้างหิน ----------
    def build_family(fam, rune):
        F = dict(FAMILY[fam])
        if fam == 'endow': F['_elem'] = ELEM_STONE.get(rune.get('elem'), rune['col'])
        coll = bpy.data.collections.new('fam_' + fam + rune['id']); sc.collection.children.link(coll)
        root = bpy.data.objects.new('root', None); link(root, coll)
        W, H, T = F['W'], F['H'], F['T']
        ol = outline(F['shape'], W, H, seed=len(fam))
        # ปริซึม → bevel → remesh (เมชละเอียดสม่ำเสมอ สำหรับแกะร่อง)
        bm = bmesh.new()
        fv = [bm.verts.new((x, -T / 2, z)) for x, z in ol]; bv = [bm.verts.new((x, T / 2, z)) for x, z in ol]
        bm.faces.new(fv[::-1]); bm.faces.new(bv)
        n = len(ol)
        for i in range(n): bm.faces.new((fv[i], fv[(i + 1) % n], bv[(i + 1) % n], bv[i]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        me = bpy.data.meshes.new('prism'); bm.to_mesh(me); bm.free()
        pr = bpy.data.objects.new('prism', me); link(pr, coll)
        bev = pr.modifiers.new('bev', 'BEVEL'); bev.width = T * 0.36; bev.segments = 8; bev.limit_method = 'ANGLE'; bev.angle_limit = math.radians(50)
        rem = pr.modifiers.new('rem', 'REMESH'); rem.mode = 'VOXEL'; rem.voxel_size = 0.0065; rem.use_smooth_shade = True
        dg = bpy.context.evaluated_depsgraph_get()
        sm = bpy.data.meshes.new_from_object(pr.evaluated_get(dg))
        bpy.data.objects.remove(pr); bpy.data.meshes.remove(me)
        st = bpy.data.objects.new('stone', sm); link(st, coll); st.parent = root
        nv = len(sm.vertices)
        co0 = np.zeros(nv * 3, np.float32); sm.vertices.foreach_get('co', co0); co0 = co0.reshape(-1, 3)
        nr0 = np.zeros(nv * 3, np.float32); sm.vertex_normals.foreach_get('vector', nr0); nr0 = nr0.reshape(-1, 3)
        front = np.clip((-nr0[:, 1] - 0.55) / 0.3, 0, 1)
        front = front * front * (3 - 2 * front)
        # หน้าหินนูน + ผิวขรุขระ (ครั้งเดียวต่อชุด)
        ex, ez = co0[:, 0] / (W / 2), co0[:, 2] / (H / 2)
        dome = np.clip(1 - ex * ex - ez * ez, 0, 1)
        co0[:, 1] -= 0.035 * dome * (co0[:, 1] < 0)
        co0[:, 1] += 0.035 * dome * (co0[:, 1] > 0)
        bump = F.get('bumpy', 0.008)
        if bump:
            rr = np.array([noise.noise(Vector((x * 3.2 + len(fam), y * 3.2, z * 3.2))) for x, y, z in co0], np.float32)
            co0 += nr0 * (rr * bump)[:, None]
        sm.vertices.foreach_set('co', co0.ravel())
        at = sm.attributes.new('front', 'FLOAT', 'POINT'); at.data.foreach_set('value', front)
        S = max(W, H) * 1.02
        uvl = sm.uv_layers.new(name='UVMap')
        li = np.zeros(len(sm.loops), np.int32); sm.loops.foreach_get('vertex_index', li)
        uv = np.stack([co0[li, 0] / S + 0.5, co0[li, 2] / S + 0.5], 1).astype(np.float32)
        uvl.data.foreach_set('uv', uv.ravel())
        holder = []
        st.data.materials.append(stone_mat(fam, F, holder))
        st.data.polygons.foreach_set('use_smooth', [True] * len(st.data.polygons))
        objs = [st]
        acc = accents(fam, F, rune, ol, coll, root)
        root.rotation_euler = (math.radians(-7), 0, math.radians(24))   # เอียงไปหลังนิด + หัน 3/4 (เห็นข้างซ้ายที่โดนแสง)
        return dict(F=F, coll=coll, root=root, stone=st, co0=co0, front=front, S=S, ol=ol, rgb=holder, acc=acc)

    MATS = {}
    def mat(key, fn):
        if key not in MATS: MATS[key] = fn()
        return MATS[key]

    def accents(fam, F, rune, ol, coll, root):
        """ของประดับ • คืน {ชื่อกลุ่ม: [object]} (เปิด/ปิดต่อรูน)"""
        W, H, T = F['W'], F['H'], F['T']
        out = {}
        def put(group, o): out.setdefault(group, []).append(o); o.parent = root; return o
        # ขอบโลหะรอบข้างหิน + หมุด
        if F.get('rim'):
            col = METAL[F['rim']]
            mm = mat('metal_' + F['rim'], lambda: metal_mat('metal_' + F['rim'], col))
            path = []
            n = len(ol)
            for i in range(n):
                x, z = ol[i]; xa, za = ol[(i - 1) % n]; xb, zb = ol[(i + 1) % n]
                tx, tz = xb - xa, zb - za; L = math.hypot(tx, tz) or 1
                nx, nz = tz / L, -tx / L                     # ทิศออก (เส้นทวนเข็ม)
                path.append(Vector((x + nx * 0.004, 0, z + nz * 0.004)))
            bm = bmesh.new()
            sweep(bm, path, [(a - 0.0, b) for a, b in round_prof(0.05, T * 0.62)], closed=True)
            put('rim', mesh_obj('rim', bm, mm, coll))
            k = F.get('rivets', 0)
            if k:
                bm = bmesh.new()
                for j in range(k):
                    i = int((j + 0.5) / k * n) % n
                    x, z = ol[i]; xa, za = ol[(i - 1) % n]; xb, zb = ol[(i + 1) % n]
                    tx, tz = xb - xa, zb - za; L = math.hypot(tx, tz) or 1
                    nx, nz = tz / L, -tx / L
                    ellipsoid(bm, Vector((x + nx * 0.03, -T * 0.20, z + nz * 0.03)), (0.026, 0.02, 0.026))
                put('rim', mesh_obj('rivets', bm, mm, coll))
        if F.get('gem'):        # อัญมณีบนยอด (สีรูน)
            bm = bmesh.new()
            bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.065, matrix=Matrix.Translation((0, -T * 0.05, H / 2 + 0.05)) @ Matrix.Diagonal((1, 0.8, 1.15, 1)))
            put('gem', mesh_obj('gem', bm, flat_mat('gem_' + rune['id'], sat_boost(hex2rgb(rune['col']), 1.3), 0.08, emit=0.6, coat=1.0), coll, smooth=False))
            bm = bmesh.new()
            sweep(bm, [Vector((0.075 * math.cos(a), -T * 0.05 + 0.075 * math.sin(a) * 0.8, H / 2 + 0.02)) for a in [i / 24 * 2 * math.pi for i in range(24)]],
                  round_prof(0.022, 0.03), closed=True, frame_up=lambda i: Vector((0, 0, 1)))
            put('gem', mesh_obj('gemset', bm, mat('metal_gold', lambda: metal_mat('metal_gold', METAL['gold'])), coll))
        if F.get('crystal'):    # กระจุกผลึกธาตุที่ฐาน
            e = sat_boost(hex2rgb(F['_elem']), 1.2)
            cm = flat_mat('crystal_' + rune['id'], rune_rgb(F['_elem']), 0.05, emit=1.3, coat=1.0)
            bm = bmesh.new()
            spec = [(-0.34, -0.50, 0.24, 0.075, 30, -0.10), (-0.18, -0.52, 0.14, 0.06, 6, -0.22), (-0.46, -0.44, 0.15, 0.055, 58, 0.02),
                    (0.36, -0.50, 0.20, 0.07, -28, -0.10), (0.22, -0.53, 0.12, 0.055, -4, -0.22), (0.48, -0.42, 0.12, 0.05, -60, 0.04)]
            for x, z, L, r, tilt, yy in spec:
                rot = Matrix.Rotation(math.radians(-tilt), 4, 'Y') @ Matrix.Rotation(math.radians(-14), 4, 'X')
                base = Vector((x * W / 0.8, yy, z * H))
                bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=r, radius2=r, depth=L, matrix=Matrix.Translation(base + rot @ Vector((0, 0, L / 2))) @ rot)
                bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=r, radius2=0.0, depth=r * 2.2, matrix=Matrix.Translation(base + rot @ Vector((0, 0, L + r * 1.1))) @ rot)
            put('crystal', mesh_obj('crystals', bm, cm, coll, smooth=False))
        if F.get('leaves') or fam == 'slayer':
            leaf_m = mat('leaf', lambda: flat_mat('leaf', (0.36, 0.70, 0.20), 0.45))
            def leaf(group, x, z, ang, s=1.0, y=-0.02):
                bm = bmesh.new()
                rot = Matrix.Rotation(math.radians(ang), 4, 'Y')
                ellipsoid(bm, Vector((x, y, z)) + rot @ Vector((0.09 * s, 0, 0)), (0.11 * s, 0.018, 0.05 * s), rot)
                put(group, mesh_obj('leaf', bm, leaf_m, coll))
            if F.get('leaves'):
                leaf('leaves', -W * 0.42, -H * 0.34, 200, 1.5, -0.06); leaf('leaves', -W * 0.34, -H * 0.42, 235, 1.2, -0.10); leaf('leaves', W * 0.40, -H * 0.40, -25, 1.1, -0.08)
            if fam == 'slayer':
                leaf('plant', -W * 0.46, -H * 0.38, 205, 1.15, -0.05); leaf('plant', -W * 0.40, -H * 0.46, 240, 0.9, -0.09)
                leaf('plant', W * 0.44, -H * 0.42, -30, 1.0, -0.06)
        if fam == 'slayer':
            bronze = mat('metal_bronze', lambda: metal_mat('metal_bronze', METAL['bronze']))
            iron = mat('metal_iron', lambda: metal_mat('metal_iron', (0.45, 0.45, 0.48), 0.4))
            # brute (Mech Beast): เฟืองหลังมุมขวาบน
            bm = bmesh.new(); prof = []
            for i in range(48):
                a = i / 48 * 2 * math.pi; tooth = 1.0 if (i // 3) % 2 == 0 else 0.78
                prof.append(Vector((0.30 * tooth * math.cos(a), 0, 0.30 * tooth * math.sin(a))))
            g = bmesh.ops.create_circle(bm, cap_ends=True, segments=48, radius=1)
            for v, p in zip(g['verts'], prof): v.co = p
            ext = bmesh.ops.extrude_face_region(bm, geom=bm.faces[:])
            for v in [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]: v.co.y += 0.06
            for v in bm.verts: v.co += Vector((W * 0.44, T * 0.12, H * 0.44))
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            put('brute', mesh_obj('gear', bm, bronze, coll, smooth=False))
            bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=0.09, radius2=0.09, depth=0.09,
                                                     matrix=Matrix.Translation((W * 0.44, T * 0.10, H * 0.44)) @ Matrix.Rotation(math.pi / 2, 4, 'X'))
            put('brute', mesh_obj('hub', bm, iron, coll))
            # insect: หนวดสองเส้น ปลายกลม
            ant_m = mat('ant', lambda: flat_mat('ant', (0.30, 0.24, 0.10), 0.35, coat=0.6))
            for sx in (-1, 1):
                bm = bmesh.new()
                pts = [Vector((sx * (0.12 + 0.28 * t + 0.06 * t * t), 0.0, H * 0.44 + 0.42 * t - 0.12 * t * t)) for t in [i / 14 for i in range(15)]]
                sweep(bm, pts, lambda t: [(0.028 * (1 - 0.4 * t) * math.cos(a), 0.028 * (1 - 0.4 * t) * math.sin(a)) for a in [k / 8 * 2 * math.pi for k in range(8)]], closed=False)
                ellipsoid(bm, pts[-1], (0.065, 0.065, 0.065))
                put('insect', mesh_obj('antenna', bm, ant_m, coll))
            # formless: ลูกแก้วเรืองลอยสามลูก
            orb = flat_mat('orb_' + rune['id'], sat_boost(hex2rgb('#b8a8ff'), 1.2), 0.1, emit=1.6, coat=1.0)
            for x, z, r in ((-W * 0.60, H * 0.34, 0.095), (W * 0.62, H * 0.06, 0.085), (-W * 0.52, -H * 0.46, 0.07), (W * 0.40, H * 0.60, 0.055)):
                bm = bmesh.new(); ellipsoid(bm, Vector((x, -0.06, z)), (r, r, r)); put('formless', mesh_obj('orb', bm, orb, coll))
            # undead: กระดูกไขว้หลังฐาน
            bone = mat('bone', lambda: flat_mat('bone', (0.95, 0.90, 0.78), 0.55))
            for sgn in (-1, 1):
                bm = bmesh.new(); ang = math.radians(32 * sgn)
                rot = Matrix.Rotation(ang, 4, 'Y'); c = Vector((0, T * 0.35, -H * 0.30))
                bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.045, radius2=0.045, depth=1.24, matrix=Matrix.Translation(c) @ rot @ Matrix.Rotation(math.pi / 2, 4, 'Y'))
                for e in (-1, 1):
                    end = c + rot @ Vector((0.62 * e, 0, 0))
                    for o in (-1, 1): ellipsoid(bm, end + rot @ Vector((0, 0, 0.045 * o)), (0.07, 0.06, 0.07))
                put('undead', mesh_obj('bone', bm, bone, coll))
            # demon: เขาโค้งสองข้าง
            horn = mat('horn', lambda: flat_mat('horn', (0.20, 0.06, 0.06), 0.3, coat=0.8))
            for sx in (-1, 1):
                bm = bmesh.new()
                pts = [Vector((sx * (W * 0.30 + 0.24 * t + 0.03 * math.sin(t * 3)), -0.01, H * 0.38 + 0.38 * t - 0.16 * t * t * t)) for t in [i / 16 for i in range(17)]]
                sweep(bm, pts, lambda t: [(0.10 * (1 - t) ** 0.9 * math.cos(a) + 0.001, 0.10 * (1 - t) ** 0.9 * math.sin(a)) for a in [k / 10 * 2 * math.pi for k in range(10)]], closed=False)
                put('demon', mesh_obj('horn', bm, horn, coll))
            # angel: รัศมีทอง + ปีกเล็ก
            halo = flat_mat('halo', (1.0, 0.86, 0.40), 0.2, emit=1.4, metal=0.3)
            bm = bmesh.new()
            sweep(bm, [Vector((0.30 * math.cos(a), 0.02 + 0.10 * math.sin(a), H * 0.64)) for a in [i / 40 * 2 * math.pi for i in range(40)]],
                  round_prof(0.05, 0.04), closed=True, frame_up=lambda i: Vector((0, 0, 1)))
            put('angel', mesh_obj('halo', bm, halo, coll))
            feather = mat('feather', lambda: flat_mat('feather', (1.0, 0.98, 0.94), 0.5))
            for sx in (-1, 1):
                bm = bmesh.new()
                for k, (ang, L) in enumerate(((24, 0.40), (2, 0.36), (-22, 0.30))):
                    rot = Matrix.Rotation(math.radians(sx * ang), 4, 'Y')
                    ellipsoid(bm, Vector((sx * (W * 0.48), T * 0.05, H * 0.12)) + rot @ Vector((sx * L * 0.55, 0, 0)), (L * 0.6, 0.025, 0.075), rot)
                put('angel', mesh_obj('wing', bm, feather, coll))
            # human: ดาบไขว้หลังหิน
            steel = mat('metal_steel', lambda: metal_mat('metal_steel', METAL['steel'], 0.22))
            for sgn in (-1, 1):
                bm = bmesh.new(); rot = Matrix.Rotation(math.radians(45 * sgn), 4, 'Y'); c = Vector((0, T * 0.40, 0.0))
                bmesh.ops.create_cube(bm, size=1, matrix=Matrix.Translation(c + rot @ Vector((0, 0, 0.12))) @ rot @ Matrix.Diagonal((0.10, 0.022, 1.36, 1)))
                bmesh.ops.create_cone(bm, cap_ends=True, segments=4, radius1=0.071, radius2=0.0, depth=0.14, matrix=Matrix.Translation(c + rot @ Vector((0, 0, 0.87))) @ rot @ Matrix.Rotation(math.pi / 4, 4, 'Z'))
                put('human', mesh_obj('blade', bm, steel, coll, smooth=False))
                bm = bmesh.new()
                bmesh.ops.create_cube(bm, size=1, matrix=Matrix.Translation(c + rot @ Vector((0, 0, -0.58))) @ rot @ Matrix.Diagonal((0.30, 0.05, 0.05, 1)))
                bmesh.ops.create_cone(bm, cap_ends=True, segments=10, radius1=0.03, radius2=0.03, depth=0.18, matrix=Matrix.Translation(c + rot @ Vector((0, 0, -0.69))) @ rot)
                ellipsoid(bm, c + rot @ Vector((0, 0, -0.80)), (0.05, 0.05, 0.05))
                put('human', mesh_obj('hilt', bm, bronze, coll))
        return out

    def show_only(fam_d, rune):
        want = {'rim', 'gem', 'crystal', 'leaves'}
        if fam_d['F'].get('rim') is None: want.discard('rim')
        if rune.get('race'): want.add(rune['race'])
        for g, objs in fam_d['acc'].items():
            for o in objs: o.hide_render = g not in want

    def frame(fam_d):
        """ปรับกล้องออร์โธให้ครอบวัตถุที่แสดง (เผื่อขอบสำหรับแสงฟุ้ง)"""
        bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
        us, vs = [], []
        for o in fam_d['coll'].all_objects:
            if o.type != 'MESH' or o.hide_render: continue
            ev = o.evaluated_get(dg); mw = ev.matrix_world
            me = ev.data
            pts = np.zeros(len(me.vertices) * 3, np.float32); me.vertices.foreach_get('co', pts); pts = pts.reshape(-1, 3)
            if len(pts) > 4000: pts = pts[::7]
            Mw = np.array(mw, np.float32)
            wp = pts @ Mw[:3, :3].T + Mw[:3, 3]
            us.append(wp @ np.array(cright, np.float32)); vs.append(wp @ np.array(cup, np.float32))
        u = np.concatenate(us); v = np.concatenate(vs)
        cu, cv = (u.min() + u.max()) / 2, (v.min() + v.max()) / 2
        ext = max(u.max() - u.min(), v.max() - v.min())
        cam.ortho_scale = ext * 1.16
        co.location = cright * cu + cup * cv - cdir * 10

    def set_rune(fam_d, rune):
        F = fam_d['F']
        rgb_img = face_maps(rune['fam'], F, rune, fam_d['ol'], fam_d['S'])
        arr = np.asarray(rgb_img, np.float32) / 255.0                     # แถว 0 = บน
        # ภาพใน Blender: แถว 0 = ล่าง
        px = arr[::-1].copy()
        IMG.pixels.foreach_set(px.ravel()); IMG.update()
        # แกะร่อง: ดันเวอร์เท็กซ์หน้าหินเข้าไปตามความลึก (bilinear)
        co0, S = fam_d['co0'], fam_d['S']
        hgt = arr[:, :, 2]
        fx = (co0[:, 0] / S + 0.5) * (M - 1); fy = (0.5 - co0[:, 2] / S) * (M - 1)
        x0 = np.clip(np.floor(fx).astype(int), 0, M - 2); y0 = np.clip(np.floor(fy).astype(int), 0, M - 2)
        tx = np.clip(fx - x0, 0, 1); ty = np.clip(fy - y0, 0, 1)
        h = (hgt[y0, x0] * (1 - tx) * (1 - ty) + hgt[y0, x0 + 1] * tx * (1 - ty) + hgt[y0 + 1, x0] * (1 - tx) * ty + hgt[y0 + 1, x0 + 1] * tx * ty)
        co = co0.copy(); co[:, 1] += 0.085 * h * fam_d['front']
        me = fam_d['stone'].data; me.vertices.foreach_set('co', co.ravel()); me.update()
        c = rune_rgb(rune['col'])
        for node in fam_d['rgb']: node.outputs[0].default_value = (*lin(c), 1)
        show_only(fam_d, rune)
        frame(fam_d)

    def do_render(path, glow):
        for s in SWITCH: s.outputs[0].default_value = 1.0 if glow else 0.0
        sc.render.use_freestyle = not glow
        sc.cycles.samples = 12 if glow else samples
        sc.cycles.use_denoising = not glow
        sc.render.filepath = path
        bpy.ops.render.render(write_still=True)

    cur = None; fam_d = None
    for rune in runes:
        fk = rune['fam'] + ('_' + rune['elem'] if rune['fam'] == 'endow' else '')
        if fk != cur:
            if fam_d:
                for o in list(fam_d['coll'].all_objects): bpy.data.objects.remove(o)
                bpy.data.collections.remove(fam_d['coll'])
            fam_d = build_family(rune['fam'], rune); cur = fk
        elif rune['fam'] == 'cond':     # อัญมณีสีรูน: สร้างใหม่ต่อรูน
            for o in list(fam_d['coll'].all_objects): bpy.data.objects.remove(o)
            bpy.data.collections.remove(fam_d['coll'])
            fam_d = build_family(rune['fam'], rune)
        set_rune(fam_d, rune)
        do_render(os.path.join(raw, rune['key'] + '.png'), False)
        do_render(os.path.join(raw, rune['key'] + '_glow.png'), True)
        print('✓', rune['key'], flush=True)


# ============================================================
#  ติดตั้ง: แสงฟุ้ง + เส้นขอบ + ย่อ → assets/rune_*.webp
# ============================================================
def finish_icon(raw, key):
    import numpy as np
    from PIL import Image, ImageFilter, ImageEnhance
    im = Image.open(os.path.join(raw, key + '.png')).convert('RGBA')
    gl = Image.open(os.path.join(raw, key + '_glow.png')).convert('RGB')
    rgb = ImageEnhance.Color(im.convert('RGB')).enhance(1.12)
    a = np.asarray(im.getchannel('A'), np.float32) / 255
    c = np.asarray(rgb, np.float32) / 255
    # เส้นขอบเข้มรอบเงา (อ่านออกทุกพื้น)
    ea = Image.fromarray((a > 0.35).astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(0.7))
    e = np.asarray(ea, np.float32) / 255 * 0.92
    ink = np.array([0.13, 0.08, 0.06], np.float32)
    # ภาพ (premultiplied): ขอบใต้ภาพ
    pa = a + e * (1 - a)
    pc = c * a[..., None] + ink * (e * (1 - a))[..., None]
    # แสงฟุ้งจากพาสเรือง (บวกแสง)
    g = gl.filter(ImageFilter.GaussianBlur(3)); g2 = gl.filter(ImageFilter.GaussianBlur(10))
    b = np.asarray(g, np.float32) / 255 * 0.40 + np.asarray(g2, np.float32) / 255 * 0.75
    lum = b.max(2)
    pc = pc + b * 0.8
    pa = np.clip(pa + lum * 0.75 * (1 - pa), 0, 1)
    pc = np.minimum(pc, pa[..., None])
    out = np.zeros(c.shape[:2] + (4,), np.float32)
    nz = pa > 1e-4
    out[..., :3][nz] = pc[nz] / pa[nz][:, None]
    out[..., 3] = pa
    img = Image.fromarray(np.clip(out * 255 + 0.5, 0, 255).astype(np.uint8), 'RGBA')
    return img


def install(raw, sheet=None):
    from PIL import Image, ImageFilter
    sys.path.insert(0, os.path.join(ROOT, 'tools'))
    runes = load_runes(); done = []
    for r in runes:
        if not os.path.exists(os.path.join(raw, r['key'] + '.png')): print('ข้าม (ยังไม่เรนเดอร์):', r['key']); continue
        big = finish_icon(raw, r['key'])
        ic = big.resize((OUT, OUT), Image.LANCZOS)
        ic = ic.filter(ImageFilter.UnsharpMask(radius=1.0, percent=40, threshold=2))
        ic.save(os.path.join(ROOT, 'assets', r['key'] + '.webp'), 'WEBP', quality=90, method=6)
        done.append((r, ic))
    from slice_sheet import manifest
    manifest()
    print('ติดตั้ง', len(done), 'ไอคอน → assets/rune_*.webp')
    if sheet: contact(done, sheet)


def contact(done, d):
    """แผ่นรวมตรวจภาพ: 64px บนกระดาษ + พื้นมืด (+ แถว 48/96px)"""
    from PIL import Image, ImageDraw, ImageFont
    import numpy as np
    os.makedirs(d, exist_ok=True)
    fnt = ImageFont.truetype(FONTS[3], 9)
    for name, bg, fg in (('parchment', (238, 224, 190), (70, 50, 30)), ('dark', (26, 22, 30), (210, 200, 180))):
        for sz in (64, 48, 96):
            cols = 12; cw = sz + 16; chh = sz + 20
            rows = (len(done) + cols - 1) // cols
            sh = Image.new('RGBA', (cols * cw + 16, rows * chh + 16), bg + (255,))
            if name == 'parchment':      # ลายกระดาษจาง ๆ
                rnd = np.random.default_rng(3).normal(0, 5, (sh.height, sh.width, 1))
                arr = np.clip(np.asarray(sh, np.float32)[..., :3] + rnd, 0, 255).astype(np.uint8)
                sh = Image.fromarray(np.dstack([arr, np.full(arr.shape[:2], 255, np.uint8)]), 'RGBA')
            dr = ImageDraw.Draw(sh)
            for i, (r, ic) in enumerate(done):
                x = 8 + (i % cols) * cw + 8; y = 8 + (i // cols) * chh + 2
                sh.alpha_composite(ic.resize((sz, sz), Image.LANCZOS), (x, y))
                lab = r['id'].replace('hr_', '').split('.')[-1][:12]
                dr.text((x + sz / 2, y + sz + 2), lab, font=fnt, fill=fg, anchor='mt')
            sh.convert('RGB').save(os.path.join(d, f'rune3d_{name}_{sz}.png'))
    print('แผ่นรวม →', d)


if __name__ == '__main__':
    a = sys.argv
    raw = a[a.index('--raw') + 1] if '--raw' in a else RAW
    if '--render' in a:
        only = set(a[a.index('--only') + 1].split(',')) if '--only' in a else None
        render(int(a[a.index('--samples') + 1]) if '--samples' in a else 64, raw, only)
    elif '--install' in a:
        install(raw, a[a.index('--sheet') + 1] if '--sheet' in a else None)
    else:
        print(__doc__)
