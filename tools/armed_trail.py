# -*- coding: utf-8 -*-
"""หาวงเหวี่ยงอาวุธในภาพท่าโจมตีแบบถืออาวุธในภาพ (anim_<gk>_attack.webp) → js/armed_trail.js
ให้ WeaponTrail วาดแสงฟันได้โดยไม่ต้องใช้ paperdoll — ไม่พึ่งสีอาวุธ (ชุด/ผ้าคลุมมักสีเดียวกับอาวุธ):
  - จังหวะฟันของแต่ละแถว = เฟรมที่ภาพเปลี่ยนจากเฟรมก่อนมากที่สุด (ไม่นับเฟรมแรก/สุดท้าย)
  - ปลายอาวุธก่อนฟัน = ส่วนที่ "หายไป" (มีในเฟรมก่อน ไม่มีในเฟรมฟัน) ที่ไกลจากไหล่ที่สุด
  - ปลายอาวุธตอนฟัน = ส่วนที่ "เกิดใหม่" ที่ไกลจากไหล่ที่สุด
ใช้: python3 tools/armed_trail.py [--check out_dir]   (รันใหม่ทุกครั้งที่ติดตั้งท่าโจมตีใหม่)"""
import os, json, argparse
import numpy as np, cv2
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), '..'); A = os.path.join(ROOT, 'assets')
C, CX, GROUND = 240, 120, 220
K = np.ones((3, 3), np.uint8)


def far(mask, px, py, foot, min_area=25):
    """ปลายอาวุธ: ก้อนที่ขยับใหญ่และยื่นไกลจากไหล่ (คะแนน = พื้นที่ × ระยะ) → จุดที่ไกลที่สุดของก้อนนั้น
    ไม่นับก้อนที่อยู่แถวเท้าทั้งก้อน (ขาขยับเปลี่ยนท่ายืน ไม่ใช่อาวุธ) และเศษเล็ก ๆ จากผม/ผ้า"""
    m = cv2.morphologyEx(mask.astype(np.uint8), cv2.MORPH_OPEN, K)
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    best = None
    for k in range(1, n):
        if st[k, cv2.CC_STAT_AREA] < min_area or st[k, cv2.CC_STAT_TOP] > foot: continue
        ys, xs = np.nonzero(lab == k); d = (xs - px) ** 2 + (ys - py) ** 2; i = int(np.argmax(d))
        sc = st[k, cv2.CC_STAT_AREA] * np.sqrt(d[i])
        if best is None or sc > best[0]: best = (sc, int(xs[i]), int(ys[i]))
    return best and best[1:]


def row_trail(cells):
    al = [c[..., 3] > 90 for c in cells]; n = len(cells)
    ys, xs = np.nonzero(al[0])
    if not len(ys): return None
    # ไหล่ = กลางตัวแนวนอน (ค่ามัธยฐานของเฟรมแรก) ที่ 35% ของความสูงจากหัว
    top = ys.min(); px = float(np.median(xs)); py = top + (GROUND - top) * 0.35
    best, bs = None, 0
    for f in range(1, max(2, n - 1)):
        d = int((al[f] ^ al[f - 1]).sum())
        if d > bs: bs, best = d, f
    if best is None: return None
    f = best
    gone = al[f - 1] & ~cv2.dilate(al[f].astype(np.uint8), K, iterations=2).astype(bool)
    new = al[f] & ~cv2.dilate(al[f - 1].astype(np.uint8), K, iterations=2).astype(bool)
    foot = GROUND - (GROUND - top) * 0.22
    a, b = far(gone, px, py, foot), far(new, px, py, foot)
    if not a or not b: return None
    ra, rb = np.hypot(a[0] - px, a[1] - py), np.hypot(b[0] - px, b[1] - py)
    if min(ra, rb) < 30 or np.hypot(a[0] - b[0], a[1] - b[1]) < 25: return None  # เหวี่ยงสั้นเกิน/ไม่ใช่อาวุธ
    o = lambda q: [int(round(q[0] - CX)), int(round(q[1] - GROUND))]
    return {'f': f, 'p': o((px, py)), 'a': o(a), 'b': o(b)}


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--check', default=''); a = ap.parse_args()
    out = {}
    for fn in sorted(os.listdir(A)):
        if not (fn.startswith('anim_') and fn.endswith('_attack.webp')) or '_bare_' in fn: continue
        gk = fn[5:-len('_attack.webp')]
        if gk.startswith(('mob_', 'novice_')): continue  # มอนสเตอร์/Novice ไม่มีอาวุธประจำ Class
        img = Image.open(os.path.join(A, fn)).convert('RGBA'); arr = np.array(img)
        rows = [row_trail([arr[r * C:(r + 1) * C, f * C:(f + 1) * C] for f in range(arr.shape[1] // C)]) for r in range(arr.shape[0] // C)]
        out[gk] = rows
        print(gk, 'rows', sum(x is not None for x in rows), '/', len(rows), [x and x['f'] for x in rows])
        if a.check:
            os.makedirs(a.check, exist_ok=True); im = img.copy(); dr = ImageDraw.Draw(im)
            for r, v in enumerate(rows):
                if not v: continue
                for f, q, col in ((v['f'] - 1, v['a'], (0, 120, 255, 255)), (v['f'], v['b'], (255, 0, 255, 255))):
                    ox, oy = f * C + CX, r * C + GROUND
                    dr.line((ox + v['p'][0], oy + v['p'][1], ox + q[0], oy + q[1]), fill=(0, 200, 0, 255), width=2)
                    dr.ellipse((ox + q[0] - 5, oy + q[1] - 5, ox + q[0] + 5, oy + q[1] + 5), fill=col)
            bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
            bg.convert('RGB').resize((im.width // 2, im.height // 2)).save(os.path.join(a.check, gk + '.png'))
    js = ("'use strict';\n// สร้างโดย tools/armed_trail.py — วงเหวี่ยงของท่าโจมตีแบบถืออาวุธในภาพ ต่อแถว: f = เฟรมฟัน, p = ไหล่,"
          " a/b = ปลายอาวุธเฟรมก่อน/เฟรมฟัน (พิกัดช่อง 240 เทียบ CX/GROUND) • ห้ามแก้มือ\n"
          "const ARMED_TRAIL = " + json.dumps(out, separators=(',', ':')) + ";\n")
    open(os.path.join(ROOT, 'js', 'armed_trail.js'), 'w', encoding='utf-8').write(js); print('js/armed_trail.js')


if __name__ == '__main__':
    main()
