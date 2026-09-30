# -*- coding: utf-8 -*-
"""ตัดชีตภาพจาก ChatGPT เป็นไอคอนรายชิ้น แล้วอัปเดต assets/manifest.json
ใช้:  python3 tools/slice_sheet.py <ภาพชีต> <ชื่อชีต เช่น sheet_items_1.png>
      python3 tools/slice_sheet.py --add <ภาพ> <key>     (ภาพเดี่ยว เช่น job_volva_f, map_meadow)
      python3 tools/slice_sheet.py --manifest"""
import sys, os, json
from PIL import Image, ImageChops
sys.path.insert(0, os.path.dirname(__file__))
from asset_spec import SHEETS

ROOT = os.path.join(os.path.dirname(__file__), '..', 'assets')

def manifest():
    # รายชื่อไฟล์ภาพทั้งหมด (เกมโหลดเฉพาะที่อยู่ในรายการนี้)
    files = sorted(f for f in os.listdir(ROOT) if f.endswith(('.webp', '.png')))
    json.dump(files, open(os.path.join(ROOT, 'manifest.json'), 'w'), indent=0)
    print('manifest:', len(files), 'assets')

def save(im, key):
    """บันทึกเป็น WebP (เล็กกว่า PNG ~5 เท่า ยังโปร่งใสได้) และลบ PNG เก่าชื่อเดียวกัน"""
    im.save(os.path.join(ROOT, key + '.webp'), 'WEBP', quality=90, method=6)
    old = os.path.join(ROOT, key + '.png')
    if os.path.exists(old): os.remove(old)

def knock_bg(im):
    """ภาพไม่มีพื้นโปร่งใส: ลบสีพื้นที่เหมือนมุมภาพออก"""
    im = im.convert('RGBA')
    if im.getchannel('A').getextrema()[0] < 250: return im
    px = im.load(); w, h = im.size
    cs = [px[2, 2], px[w - 3, 2], px[2, h - 3], px[w - 3, h - 3]]
    bg = tuple(sorted(c[i] for c in cs)[1] for i in range(3))
    diff = ImageChops.difference(im.convert('RGB'), Image.new('RGB', im.size, bg))
    r, g, b = diff.split()
    mask = ImageChops.add(ImageChops.add(r, g), b).point(lambda v: 0 if v < 36 else 255)
    im.putalpha(mask); return im

def square(im, size, fill=(0, 0, 0, 0)):
    w, h = im.size; s = max(w, h)
    c = Image.new('RGBA', (s, s), fill); c.paste(im, ((s - w) // 2, (s - h) // 2), im)
    return c.resize((size, size), Image.LANCZOS)

def slice_sheet(path, name):
    spec = next(s for s in SHEETS if s['file'] == name)
    im = Image.open(path).convert('RGBA')
    if spec['mode'] == 'alpha': im = knock_bg(im)
    W, H = im.size; cw, ch = W / spec['cols'], H / spec['rows']
    for i, (key, _) in enumerate(spec['cells']):
        if key.endswith('_blank'): continue
        cx, cy = i % spec['cols'], i // spec['cols']
        box = (round(cx * cw), round(cy * ch), round((cx + 1) * cw), round((cy + 1) * ch))
        cell = im.crop(box)
        if spec['mode'] == 'tile':
            # ตัดขอบร่อง (gutter) ออกแล้วครอปกลางให้เป็นจัตุรัส
            ins = int(min(cell.size) * 0.05); cell = cell.crop((ins, ins, cell.size[0] - ins, cell.size[1] - ins))
            s = min(cell.size); l = (cell.size[0] - s) // 2; t = (cell.size[1] - s) // 2
            out = cell.crop((l, t, l + s, t + s)).resize((160 if key.startswith('mob_') else 128,) * 2, Image.LANCZOS)
        else:
            a = cell.getchannel('A').point(lambda v: 255 if v > 24 else 0)
            bb = a.getbbox()
            if not bb: print('  ! ช่องว่าง:', key); continue
            pad = int(max(bb[2] - bb[0], bb[3] - bb[1]) * 0.06)
            bb = (max(0, bb[0] - pad), max(0, bb[1] - pad), min(cell.size[0], bb[2] + pad), min(cell.size[1], bb[3] + pad))
            out = cell.crop(bb) if key.startswith('mobsprite_') else square(cell.crop(bb), 128)
            if key.startswith('mobsprite_'): out.thumbnail((320, 320), Image.LANCZOS)
        save(out, key)
        print('  +', key)
    manifest()

def add(path, key):
    im = Image.open(path).convert('RGBA')
    lim = 1600 if key.startswith(('map_', 'keyart', 'mvp_')) else 1536
    if max(im.size) > lim: im.thumbnail((lim, lim), Image.LANCZOS)
    save(im, key)
    print('  +', key, im.size); manifest()

if __name__ == '__main__':
    a = sys.argv[1:]
    if a[0] == '--manifest': manifest()
    elif a[0] == '--webp':  # แปลง PNG ที่มีอยู่ทั้งหมดเป็น WebP
        for f in sorted(os.listdir(ROOT)):
            if f.endswith('.png'): save(Image.open(os.path.join(ROOT, f)).convert('RGBA'), f[:-4])
        manifest()
    elif a[0] == '--add': add(a[1], a[2])
    else: slice_sheet(a[0], a[1])
