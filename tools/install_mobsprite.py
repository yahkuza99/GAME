# -*- coding: utf-8 -*-
"""ติดตั้งภาพมอนจากโมเดลวาดในเครื่อง (ComfyUI • พื้นขาวเรียบ) เป็น assets/mobsprite_<id>.webp

ตัดพื้นขาวที่ต่อกับขอบภาพออก (flood fill จากขอบ — สีขาวในตัวมอนไม่หาย) • ลบเงาเทาใต้ตัว • ครอปชิดตัว
ย่อด้านยาวสุดเป็น 320 px (ขนาดเดียวกับ mobsprite_ เดิม) • บันทึก + สร้าง manifest ใหม่

ภาพที่ตัวมอนสีขาว/เทาอ่อน ตัวตัดนี้กินเนื้อตัว → ตัดก่อนด้วย rembg (โมเดล isnet-general-use) แล้วส่ง PNG โปร่งใสเข้ามา
(ภาพที่มีพื้นโปร่งใสอยู่แล้ว = ครอปอย่างเดียว)

ใช้:  python tools/install_mobsprite.py <ภาพ.png> <mob_id> [--tol 26]
"""
import sys, os, argparse
from collections import deque
from PIL import Image, ImageFilter
sys.path.insert(0, os.path.dirname(__file__))
from slice_sheet import manifest, save

MAX = 320


def cutout(im, tol):
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()
    # พื้นหลัง = พิกเซลสีจืด (ขาว/เทาไล่เฉด/เงาใต้ตัว) ที่ต่อเนื่องจากขอบภาพ — เส้นขอบเข้มของตัวมอนกั้นไม่ให้ลามเข้าตัว
    def bg(p):
        r, g, b, _ = p
        lo, hi = min(r, g, b), max(r, g, b)
        return (lo >= 120 and hi - lo <= tol) or (lo >= 150 and hi - lo <= tol + 18)
    # ช่องปิดในตัว (ในวงโซ่ ในกรง): ขาวเกือบล้วน และกว้างพอ (≥0.3% ของภาพ) ถึงนับเป็นพื้นหลัง
    def hole(p):
        r, g, b, _ = p
        return min(r, g, b) >= 222 and max(r, g, b) - min(r, g, b) <= 12
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        i = y * w + x
        if seen[i] or not bg(px[x, y]):
            continue
        seen[i] = 1
        if x > 0: q.append((x - 1, y))
        if x < w - 1: q.append((x + 1, y))
        if y > 0: q.append((x, y - 1))
        if y < h - 1: q.append((x, y + 1))
    done = bytearray(seen)
    for sy in range(0, h, 2):
        for sx in range(0, w, 2):
            i0 = sy * w + sx
            if done[i0] or not hole(px[sx, sy]):
                continue
            comp, q = [], deque([(sx, sy)])
            done[i0] = 1
            while q:
                x, y = q.popleft()
                comp.append(y * w + x)
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if 0 <= nx < w and 0 <= ny < h and not done[ny * w + nx] and hole(px[nx, ny]):
                        done[ny * w + nx] = 1
                        q.append((nx, ny))
            if len(comp) >= w * h * 0.003:
                for i in comp:
                    seen[i] = 1
    mask = Image.frombytes('L', (w, h), bytes(0 if s else 255 for s in seen))
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))  # ขอบนุ่ม ไม่มีขอบขาวค้าง
    im.putalpha(mask)
    return im.crop(mask.point(lambda v: 255 if v > 24 else 0).getbbox())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('mob')
    ap.add_argument('--tol', type=int, default=26)
    a = ap.parse_args()
    src = Image.open(a.src)
    if src.mode == 'RGBA' and src.getchannel('A').getextrema()[0] < 255:
        im = src.crop(src.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox())  # ตัดพื้นมาแล้ว (rembg): ครอปอย่างเดียว
    else:
        im = cutout(src, a.tol)
    im.thumbnail((MAX, MAX), Image.LANCZOS)
    save(im, 'mobsprite_' + a.mob)
    print('installed mobsprite_%s %s' % (a.mob, im.size))
    manifest()


if __name__ == '__main__':
    main()
