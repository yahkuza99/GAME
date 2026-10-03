# -*- coding: utf-8 -*-
"""ตัดชีต UI (docs/UI_ART_SHEETS.md แผ่น 1–10, ต้นฉบับ art/ui_sheets/*.webp) เป็นชิ้นรายตัว → assets/ui_*.webp
แล้วอัปเดต assets/manifest.json (tools/slice_sheet.manifest)

ใช้:  python3 tools/ui_slice.py            (ตัดทุกแผ่นที่มีไฟล์ — รันซ้ำได้ ทับไฟล์เดิม)
      python3 tools/ui_slice.py --only sheet01   (ตัดเฉพาะแผ่นที่ชื่อขึ้นต้นแบบนี้)
      python3 tools/ui_slice.py --preview <โฟลเดอร์>   (บันทึกภาพตรวจ: ทุกชิ้นบนพื้นเทา/ขาว/ฉากเกม)

ขั้นตอน
  1) ภาพพื้นดำ (RGB) → ทำช่องโปร่งใสเอง: พิกเซลมืด (max(R,G,B) < T) ที่ต่อถึงขอบภาพ หรือเป็นหลุมมืดก้อนใหญ่
     (ช่องว่างกลางกรอบรูป/มินิแมพ/ร่องหลอด) = พื้นหลัง → ไล่ความโปร่งใสนุ่ม ๆ ตามความสว่าง
     • จุดมืดก้อนเล็กข้างในชิ้น (เงา/หมุด/ลายสลัก) ไม่ถูกเจาะ
     • ชิ้นที่มีแสงเรืองออกนอกตัว (mode 'glow' เช่นรัศมีป้ายเลเวลอัป) ใช้ T สูงขึ้น + คืนสีจากพื้นดำ (unpremultiply) ให้แสงไม่หม่น
     ภาพที่มีช่องโปร่งใสมาแล้ว (RGBA) ใช้ alpha เดิม
  2) แยกชิ้นด้วยก้อนพิกเซลที่ต่อกัน (ขยายขอบก่อนเพื่อรวมประกาย/แสงฟุ้งเข้าชิ้นเดียวกัน) → จับคู่ชื่อชิ้นตามตำแหน่งที่คาดไว้ในแผ่น
  3) ครอปชิดขอบ ย่อตามขนาดใช้งาน (เผื่อจอ 2× DPR) บันทึก WebP"""
import sys, os
import numpy as np, cv2
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
SRC = os.path.join(HERE, '..', 'art', 'ui_sheets')
OUT = os.path.join(HERE, '..', 'assets')

# ชิ้นในแต่ละแผ่น: (ชื่อไฟล์ ui_<ชื่อ>, จุดกึ่งกลางโดยประมาณเป็นสัดส่วนของแผ่น (x, y), ขนาดส่งออก ('w'|'h'|'max', พิกเซล), โหมด)
#   โหมด: 'solid' = ชิ้นทึบ (ค่าเริ่มต้น — อุดรูรั่วข้างในทั้งหมด) • 'holes' = มีช่องว่างกลางชิ้นจริง (กรอบรูป/มินิแมพ/ร่องหลอด)
#         'glow' = มีแสงเรืองรอบตัว • 'keepholes' = ไม่เจาะหลุมมืดข้างใน (เช่นช่องใส่ไอคอนสีเข้ม)
ICON = ('max', 128)
SHEETS = {
    # แผ่น 1: กรอบหน้าต่าง (9 ส่วน) / หัวหน้าต่าง / ปุ่มปิด / tooltip / แท็บ 2 สถานะ
    'sheet01_window.webp': dict(dilate=9, pieces=[
        ('win_frame',   (0.278, 0.465), ('max', 512), 'solid'),
        ('win_title',   (0.765, 0.16), ('w', 640), 'solid'),
        ('win_close',   (0.758, 0.38), ('max', 96), 'solid'),
        ('tooltip',     (0.76, 0.62), ('w', 400), 'solid'),
        ('tab_on',      (0.64, 0.82), ('w', 256), 'solid'),
        ('tab_off',     (0.865, 0.82), ('w', 256), 'solid'),
    ]),
    'sheet02_buttons.webp': dict(dilate=9, pieces=[
        ('btn_normal',   (0.39, 0.16), ('h', 96), 'solid'),
        ('btn_hover',    (0.39, 0.385), ('h', 96), 'solid'),
        ('btn_pressed',  (0.39, 0.61), ('h', 96), 'solid'),
        ('btn_disabled', (0.39, 0.84), ('h', 96), 'solid'),
        ('scroll_track', (0.85, 0.5), ('w', 48), 'solid'),
        ('scroll_thumb', (0.94, 0.49), ('w', 40), 'solid'),
    ]),
    'sheet03_slots.webp': dict(dilate=31, core=0.6, grow=40, pieces=[
        ('slot_common',    (0.11, 0.48), ('max', 128), 'solid'),
        ('slot_uncommon',  (0.31, 0.48), ('max', 128), 'solid'),
        ('slot_rare',      (0.50, 0.48), ('max', 128), 'solid'),
        ('slot_epic',      (0.69, 0.48), ('max', 128), 'solid'),
        ('slot_legend',    (0.89, 0.48), ('max', 128), 'solid'),
    ]),
    # ช่องแบบไม่มีแสงเรือง (ขนาดชิดขอบ ใช้ในช่องเล็ก/แน่น เช่นฮอตบาร์ ร้านค้า)
    'sheet03_slots_alt.webp': dict(dilate=31, pieces=[
        ('slotflat_common',   (0.11, 0.48), ('max', 128), 'solid'),
        ('slotflat_uncommon', (0.31, 0.48), ('max', 128), 'solid'),
        ('slotflat_rare',     (0.50, 0.48), ('max', 128), 'solid'),
        ('slotflat_epic',     (0.69, 0.48), ('max', 128), 'solid'),
        ('slotflat_legend',   (0.89, 0.48), ('max', 128), 'solid'),
    ]),
    'sheet04_hud.webp': dict(dilate=5, pieces=[
        ('hud_portrait', (0.295, 0.24), ('max', 256), 'holes'),
        ('hud_minimap',  (0.705, 0.245), ('max', 320), 'holes'),
        ('hud_hotbar',   (0.50, 0.56), ('w', 1024), 'solid'),
        ('bar_frame',    (0.50, 0.69), ('w', 1024), 'holes'),
        ('bar_red',      (0.50, 0.775), ('w', 512), 'solid'),
        ('bar_cyan',     (0.50, 0.832), ('w', 512), 'solid'),
        ('bar_gold',     (0.50, 0.89), ('w', 512), 'solid'),
        ('bar_violet',   (0.50, 0.948), ('w', 512), 'solid'),
    ]),
    'sheet05_dialogue.webp': dict(dilate=7, pieces=[
        ('dlg_box',      (0.29, 0.29), ('w', 900), 'solid'),
        ('dlg_name',     (0.28, 0.64), ('w', 512), 'solid'),
        ('dlg_choice',   (0.29, 0.83), ('w', 640), 'solid'),
        ('quest_scroll', (0.69, 0.50), ('h', 640), 'solid'),
        ('dlg_portrait', (0.89, 0.48), ('h', 640), 'holes'),
    ]),
    'sheet06_icons_a.webp': dict(dilate=9, pieces=[
        ('icon_status', (0.10, 0.5), ICON, 'solid'), ('icon_items', (0.30, 0.5), ICON, 'solid'),
        ('icon_equip', (0.50, 0.5), ICON, 'solid'), ('icon_skills', (0.70, 0.5), ICON, 'solid'),
        ('icon_passive', (0.90, 0.5), ICON, 'solid')]),
    'sheet07_icons_b.webp': dict(dilate=9, pieces=[
        ('icon_map', (0.10, 0.5), ICON, 'solid'), ('icon_quests', (0.30, 0.5), ICON, 'solid'),
        ('icon_party', (0.50, 0.5), ICON, 'solid'), ('icon_emote', (0.70, 0.5), ICON, 'solid'),
        ('icon_trade', (0.90, 0.5), ICON, 'solid')]),
    'sheet08_icons_c.webp': dict(dilate=9, pieces=[
        ('icon_navi', (0.10, 0.5), ICON, 'solid'), ('icon_bot', (0.30, 0.5), ICON, 'solid'),
        ('icon_settings', (0.50, 0.5), ICON, 'solid'), ('icon_help', (0.70, 0.5), ICON, 'solid'),
        ('icon_class', (0.90, 0.5), ICON, 'solid')]),
    'sheet09_icons_d.webp': dict(dilate=9, pieces=[
        ('icon_gacha', (0.10, 0.5), ICON, 'solid'), ('icon_sit', (0.30, 0.5), ICON, 'solid'),
        ('icon_world', (0.50, 0.5), ICON, 'solid'), ('icon_storage', (0.70, 0.5), ICON, 'solid'),
        ('icon_chat', (0.90, 0.5), ICON, 'solid')]),
    'sheet10_banners.webp': dict(dilate=15, pieces=[
        ('banner_boss',    (0.36, 0.19), ('w', 900), 'solid'),
        ('banner_levelup', (0.36, 0.52), ('w', 900), 'glow'),
        ('banner_loot',    (0.36, 0.84), ('w', 720), 'keepholes'),
        ('banner_chapter', (0.84, 0.31), ('h', 560), 'solid'),
        ('banner_quest',   (0.84, 0.77), ('max', 256), 'solid'),
    ]),
}

def smooth(x):
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3 - 2 * x)

def matte(rgb, mode):
    """พื้นดำ → alpha • คืน RGBA float32 (0..1)"""
    f = rgb.astype(np.float32) / 255.0
    mx = f.max(axis=2)
    lo, T = (0.03, 0.62) if mode == 'glow' else (0.035, 0.19)
    dark = (mx < T).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(dark, connectivity=8)
    H, W = dark.shape
    bg = np.zeros((H, W), bool)
    big = 0.0015 * H * W if mode != 'keepholes' else 1e18
    for i in range(1, n):
        x, y, w, h, a = st[i]
        edge = x == 0 or y == 0 or x + w >= W or y + h >= H
        if edge or a > big:
            bg |= lab == i
    a = np.ones((H, W), np.float32)
    a[bg] = smooth((mx[bg] - lo) / (T - lo))
    out = np.dstack([f, a])
    if mode == 'glow':  # แสงเรืองบนพื้นดำ: คืนสีเต็ม (สีที่เห็น = สีจริง × alpha)
        k = np.maximum(a[..., None], 1e-3)
        out[..., :3] = np.where(bg[..., None], np.clip(f / k, 0, 1), f)
    return out

def fill_holes(px):
    """ชิ้นที่ไม่มีช่องว่างจริง: อุดรูโปร่งที่รั่วเข้าไปตามร่องมืด (เงาระหว่างกรอบกับกระดาษ ฯลฯ) — ขอบนอกยังนุ่มเหมือนเดิม"""
    a = px[..., 3]
    m = (a > 0.5).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)))
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    full = np.zeros_like(m)
    cv2.drawContours(full, cs, -1, 1, thickness=cv2.FILLED)
    full = cv2.erode(full, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))).astype(np.float32)
    px = px.copy(); px[..., 3] = np.maximum(a, full)
    return px

# ชิ้นที่แปลงจากชิ้นอื่น: แถบเควสต์บนจอเป็นแนวนอน → หมุนม้วนกระดาษ 90° (แกนม้วนซ้าย/ขวา ตราครั่งอยู่ซ้าย)
# กล่องคุย: ลวดลายกลางขอบบน (ข้าวหลามตัด) / ล่าง (อีกา) ยืดแบบ 9 ส่วนไม่ได้ → ตัดกลางออก ต่อซ้าย+ขวาเป็นกรอบเปล่า (dlg_box9)
#   แล้วแยกลวดลายสองชิ้นไว้วางทับกึ่งกลางด้วย CSS (ไม่ยืดตามความกว้างกล่อง)
def _cat(im, a, b):
    W, H = im.size; l = im.crop((0, 0, round(W * a), H)); r = im.crop((round(W * b), 0, W, H))
    out = Image.new('RGBA', (l.width + r.width, H)); out.paste(l, (0, 0)); out.paste(r, (l.width, 0)); return out
def _frac(im, x0, y0, x1, y1):
    W, H = im.size; return im.crop((round(W * x0), round(H * y0), round(W * x1), round(H * y1)))
def _disc(im):  # เหรียญอีกา: ตัดเป็นวงกลม (ไม่ติดลายเชือกถักข้าง ๆ)
    from PIL import ImageDraw
    w, h = im.size; m = Image.new('L', (w, h), 0); r = min(w, h) * 0.5 - 1; cx, cy = w / 2, h * 0.515
    ImageDraw.Draw(m).ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
    a = np.minimum(np.asarray(im.getchannel('A')), np.asarray(m)); im = im.copy(); im.putalpha(Image.fromarray(a)); return im
DERIVED = [('quest_scroll_h', 'quest_scroll', lambda im: im.rotate(90, expand=True)),
           ('dlg_box9', 'dlg_box', lambda im: _cat(im, 0.311, 0.689)),
           ('dlg_raven', 'dlg_box', lambda im: _disc(_frac(im, 0.447, 0.747, 0.553, 1.0))),
           ('dlg_diamond', 'dlg_box', lambda im: _frac(im, 0.406, 0.0, 0.594, 0.175))]

def to_rgba(path, modes):
    im = Image.open(path)
    if im.mode == 'RGBA' and np.asarray(im)[..., 3].min() < 250:
        return np.asarray(im).astype(np.float32) / 255.0, None
    rgb = np.asarray(im.convert('RGB'))
    return None, rgb

def components(alpha, dilate, core=0.06):
    m = (alpha > core).astype(np.uint8)
    if dilate > 1:
        m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dilate, dilate)))
    n, lab, st, cen = cv2.connectedComponentsWithStats(m, connectivity=8)
    return [(st[i], cen[i], lab == i) for i in range(1, n)]

def fit(im, spec):
    k, v = spec
    w, h = im.size
    s = v / w if k == 'w' else v / h if k == 'h' else v / max(w, h)
    s = min(s, 1.0)
    return im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS) if s < 1 else im

def slice_one(fname, cfg, saved):
    path = os.path.join(SRC, fname)
    if not os.path.exists(path):
        print('  (ยังไม่มี)', fname); return
    pre, rgb = to_rgba(path, None)
    H, W = (pre.shape[:2] if pre is not None else rgb.shape[:2])
    # หาชิ้นจาก alpha (โหมด solid ก่อน เพื่อหาตำแหน่ง) — ชิ้นที่มีโหมดอื่นคำนวณ alpha ใหม่เฉพาะกรอบของมัน
    base = pre if pre is not None else matte(rgb, 'solid')
    comps = components(base[..., 3], cfg['dilate'], cfg.get('core', 0.06))
    comps = [c for c in comps if c[0][4] > 0.0004 * W * H]
    used = set()
    for name, (fx, fy), size, mode in cfg['pieces']:
        best, bd = None, 1e18
        for i, (st, cen, _) in enumerate(comps):
            if i in used: continue
            d = (cen[0] / W - fx) ** 2 + (cen[1] / H - fy) ** 2
            if d < bd: best, bd = i, d
        if best is None:
            print('  !! หาไม่เจอ', name); continue
        used.add(best)
        st, _, mask = comps[best]
        x, y, w, h = st[:4]
        g = cfg.get('grow', 0)
        square = False
        if g:  # แสงเรือง/ประกายรอบชิ้น (หาชิ้นจากแกนทึบ แล้วขยายเก็บแสงรอบ ๆ) • ไม่เกินครึ่งช่องว่างถึงชิ้นข้าง ๆ
            for j, (s2, _, _) in enumerate(comps):
                if j == best: continue
                gap = max(s2[0] - (x + w), x - (s2[0] + s2[2]), s2[1] - (y + h), y - (s2[1] + s2[3]))
                if gap > 0: g = min(g, gap // 2)
            cx, cy, r = x + w // 2, y + h // 2, max(w, h) // 2 + g  # ช่องสี่เหลี่ยมจัตุรัส จุดกลางตรงกรอบ (วางกลางช่องใน CSS ได้เลย)
            x, y, w, h = cx - r, cy - r, 2 * r, 2 * r
            mask = np.ones_like(mask); square = True
        if pre is not None:
            px = pre.copy()
        else:
            px = matte(rgb, mode) if mode in ('glow', 'keepholes') else base.copy()
        px[..., 3] *= mask  # เฉพาะชิ้นนี้ (ไม่ติดชิ้นข้าง ๆ)
        crop = px[max(0, y):y + h, max(0, x):x + w]
        if not square:
            ys, xs = np.nonzero(crop[..., 3] > 0.01)
            crop = crop[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        if pre is None and mode != 'holes':
            crop = fill_holes(crop)
        im = Image.fromarray((np.clip(crop, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA')
        im = fit(im, size)
        key = 'ui_' + name
        im.save(os.path.join(OUT, key + '.webp'), 'WEBP', quality=92, method=6, alpha_quality=100)
        saved.append((key, im.size))
        print(f'  {key:22s} {im.size[0]}x{im.size[1]}')
    if len(comps) > len(used):
        print(f'  (ข้าม {len(comps) - len(used)} ก้อนเล็ก/เกิน)')

def preview(folder):
    """แผ่นตรวจ: ทุกชิ้นบนพื้นเทากลาง / ขาว / ภาพฉากเกม"""
    os.makedirs(folder, exist_ok=True)
    keys = sorted(f[:-5] for f in os.listdir(OUT) if f.startswith('ui_') and f.endswith('.webp'))
    for bgname, bg in (('gray', (96, 96, 96)), ('white', (250, 250, 250)), ('dark', (16, 20, 28))):
        x = y = 8; rowh = 0; W = 1800
        tiles = []
        for k in keys:
            im = Image.open(os.path.join(OUT, k + '.webp')).convert('RGBA')
            if im.width > 600: im = im.resize((600, round(im.height * 600 / im.width)), Image.LANCZOS)
            if x + im.width > W: x = 8; y += rowh + 8; rowh = 0
            tiles.append((im, x, y)); x += im.width + 8; rowh = max(rowh, im.height)
        c = Image.new('RGBA', (W, y + rowh + 8), bg + (255,))
        for im, tx, ty in tiles: c.alpha_composite(im, (tx, ty))
        c.convert('RGB').save(os.path.join(folder, f'ui_pieces_{bgname}.png'))
    print('preview →', folder)

def main():
    if '--preview' in sys.argv:
        preview(sys.argv[sys.argv.index('--preview') + 1]); return
    saved = []
    only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else ''  # --only sheet01 = ตัดเฉพาะแผ่นนั้น
    for fname, cfg in SHEETS.items():
        if only and not fname.startswith(only): continue
        print(fname)
        slice_one(fname, cfg, saved)
    for key, src, op in DERIVED:
        p = os.path.join(OUT, 'ui_' + src + '.webp')
        if os.path.exists(p):
            im = op(Image.open(p).convert('RGBA'))
            im.save(os.path.join(OUT, 'ui_' + key + '.webp'), 'WEBP', quality=92, method=6, alpha_quality=100)
            saved.append(('ui_' + key, im.size)); print(f'  ui_{key:19s} {im.size[0]}x{im.size[1]} (จาก {src})')
    from slice_sheet import manifest
    manifest()
    print('รวม', len(saved), 'ชิ้น')

if __name__ == '__main__':
    main()
