# -*- coding: utf-8 -*-
"""วัด "ชั้น" ของอาวุธต่อเฟรมจากภาพต้นฉบับที่มีแท่ง magenta (paperdoll)
แท่ง magenta ที่ศิลปินวาดไว้ในมือบอกได้ว่าอาวุธอยู่หน้าหรือหลังตัว:
  • เห็นแท่งทับเนื้อตัว (รอบแท่งเป็นตัวละครทั้งสองข้าง) = อาวุธอยู่หน้าตัว
  • แท่งหายเข้าไปในตัว (ส่วนปลายของแท่งที่ควรยาวเท่าเฟรมอื่น กลับถูกเนื้อตัวบัง) = ส่วนนั้นอยู่หลังตัว
ผล: js/paperdoll_depth.js → PAPERDOLL_DEPTH[ตัวละคร][ท่า][แถว*64+เฟรม] = [s0, s1]
  = ช่วงระยะตามแนวแท่ง (px จากจุดมือ ไปทางปลายแท่ง = บวก) ที่อยู่ "หน้าตัว" • นอกช่วงอยู่หลังตัว
  [-999, 999] = ทั้งชิ้นหน้าตัว • [0, 0] = ทั้งชิ้นหลังตัว • [-999, 23] = เลยจากมือไป 23px มุดหลังตัว (ขา/เสื้อคลุม)
ใช้:  python3 tools/paperdoll_depth.py [--debug โฟลเดอร์] einherjar_m einherjar_f ...   (ไม่ใส่ชื่อ = ทุกตัวที่มีใน PAPERDOLL_DATA ยกเว้น novice)"""
import sys, os, re, json, math
import numpy as np, cv2
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
A = os.path.join(ROOT, 'assets')
C = 240
BACK_ROWS = (5, 6, 7)  # หันหลัง: ถ้าไม่มีหลักฐานว่าแท่งทับตัว ให้อาวุธอยู่หลังตัว


def load_data():
    src = open(os.path.join(ROOT, 'js', 'paperdoll_data.js'), encoding='utf-8').read()
    return json.loads(src[src.index('{'):src.rindex('}') + 1])


def magenta(rgba):
    rgb = rgba[..., :3].astype(np.int32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    core = (r > 140) & (b > 140) & (g < r - 50) & (g < b - 50)  # ชมพูบานเย็น
    white = (r > 215) & (g > 215) & (b > 215)  # แกนกลางสีขาวของแท่งเรืองแสง (นับเฉพาะที่ติดสีชมพู)
    near = cv2.dilate(core.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
    return ((core | (white & near)) & (rgba[..., 3] > 30))


def analyze(cell, hand, Lnom, row):
    """คืน ([s0, s1], ข้อมูล debug)"""
    m = magenta(cell)
    md = cv2.dilate(m.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
    body = (cell[..., 3] > 90) & ~md
    H, W = body.shape
    x0, y0, ang = hand[0], hand[1], hand[2]
    ux, uy = math.cos(ang), math.sin(ang)
    px, py = -uy, ux

    def at(mask, t, q=0):
        x, y = int(round(x0 + ux * t + px * q)), int(round(y0 + uy * t + py * q))
        return 0 <= x < W and 0 <= y < H and bool(mask[y, x])

    T = int(Lnom) + 8
    vis = [any(at(m, t, q) for q in (-3, -2, -1, 0, 1, 2, 3)) for t in range(0, T)]
    cen = [at(body, t) or at(body, t, 1) or at(body, t, -1) for t in range(0, T)]
    # แท่งทับตัว: มีสีแท่งตรงกลาง และมีเนื้อตัวทั้งสองข้าง (ห่าง 5-7px)
    over = [vis[t] and any(at(body, t, q) for q in (5, 6, 7)) and any(at(body, t, -q) for q in (5, 6, 7)) for t in range(0, T)]
    # ปลายแท่งที่เห็น: เดินจากมือ ยอมให้ขาดได้ไม่เกิน 4px
    Lvis, gap = -1, 0
    for t in range(0, T):
        if vis[t]: Lvis, gap = t, 0
        else:
            gap += 1
            if gap > 4 and Lvis >= 0: break
    n_over = sum(over)
    n_vis = sum(vis)
    info = dict(Lvis=Lvis, n_vis=n_vis, n_over=n_over)
    if n_vis < 4:
        # ไม่เห็นแท่งเลย (เฟรมที่ประมาณมือจากเฟรมข้างเคียง): ถ้าแนวแท่งผ่านเนื้อตัว = ถูกบังทั้งแท่ง → หลังตัว
        hid = sum(cen[0:int(Lnom)])
        info['hidden'] = hid
        return ([0, 0] if hid >= Lnom * 0.4 or row in BACK_ROWS else [-999, 999]), info
    # ส่วนปลายหาย: แท่งสั้นกว่าปกติเกิน 5px และช่วงที่หายไปมีเนื้อตัวอยู่ (ถูกบัง)
    s1 = 999
    if Lnom - Lvis >= 5:
        tail = range(Lvis + 2, int(Lnom) + 1)
        hid = sum(cen[t] for t in tail if t < T)
        info['tail_hidden'] = hid
        if hid >= 0.5 * len(tail): s1 = Lvis + 2
    if row in BACK_ROWS and n_over < 3 and s1 == 999:
        return [0, 0], info  # หันหลัง แท่งไม่ทับตัว → ทั้งชิ้นหลังตัว
    if row in BACK_ROWS and n_over < 3:
        return [0, 0], info
    return [-999, s1], info


def nominal(im, data, act):
    """ความยาวแท่งปกติของภาพนี้ (เฟรมที่แท่งไม่ถูกบัง) = เปอร์เซ็นไทล์ 90 ของความยาวที่เห็น"""
    Ls = []
    for r in range(8):
        for f, hand in enumerate(data[act]['hand'][r]):
            if not hand or len(hand) > 3: continue
            cell = im[r * C:(r + 1) * C, f * C:(f + 1) * C]
            m = magenta(cell)
            ys, xs = np.nonzero(m)
            if len(xs) < 10: continue
            ux, uy = math.cos(hand[2]), math.sin(hand[2])
            t = (xs - hand[0]) * ux + (ys - hand[1]) * uy
            Ls.append(float(np.percentile(t, 98)))
    return float(np.percentile(Ls, 90)) if Ls else 30.0


def run(keys, dbg=None):
    data = load_data()
    out = {}
    for key in keys:
        if key not in data: print('ไม่มีข้อมูล', key); continue
        out[key] = {}
        for act in data[key]:
            p = os.path.join(A, f'anim_{key}_{act}.webp')
            if not os.path.exists(p): continue
            im = np.array(Image.open(p).convert('RGBA'))
            Lnom = nominal(im, data[key], act)
            res = {}
            dbgim = im.copy() if dbg else None
            for r in range(8):
                for f, hand in enumerate(data[key][act]['hand'][r]):
                    if not hand: continue
                    cell = im[r * C:(r + 1) * C, f * C:(f + 1) * C]
                    rng, info = analyze(cell, hand, Lnom, r)
                    res[r * 64 + f] = rng
                    tag = 'F' if rng == [-999, 999] else 'B' if rng == [0, 0] else f'{rng[0]},{rng[1]}'
                    print(f'{key} {act} r{r} f{f}: {tag}  L{info["Lvis"]}/{Lnom:.0f} over{info["n_over"]} {info.get("tail_hidden", "")}{info.get("hidden", "")}')
                    if dbgim is not None:
                        col = (0, 255, 0, 255) if tag == 'F' else (255, 0, 0, 255) if tag == 'B' else (255, 255, 0, 255)
                        ox, oy = f * C, r * C
                        x1, y1 = hand[0] + math.cos(hand[2]) * Lnom, hand[1] + math.sin(hand[2]) * Lnom
                        cv2.line(dbgim, (int(ox + hand[0]), int(oy + hand[1])), (int(ox + x1), int(oy + y1)), col, 1)
                        cv2.putText(dbgim, tag, (ox + 4, oy + 16), cv2.FONT_HERSHEY_SIMPLEX, 0.5, col, 1)
            out[key][act] = res
            if dbgim is not None:
                os.makedirs(dbg, exist_ok=True)
                Image.fromarray(dbgim).save(os.path.join(dbg, f'depth_{key}_{act}.png'))
    js = ["'use strict';",
          '// สร้างอัตโนมัติโดย tools/paperdoll_depth.py — อย่าแก้ด้วยมือ (แก้รายเฟรมใช้ช่องที่ 4 ใน js/paperdoll_fix.js แทน)',
          '// PAPERDOLL_DEPTH[ตัวละคร][ท่า][แถว*64+เฟรม] = [s0, s1] ช่วงระยะตามแนวแท่งมาร์กเกอร์จากจุดมือ (px, ไปทางปลาย = บวก) ที่อาวุธอยู่ "หน้าตัว"',
          '//   นอกช่วงอยู่หลังตัว • [-999,999] = ทั้งชิ้นหน้าตัว • [0,0] = ทั้งชิ้นหลังตัว • [-999,23] = เลยมือไป 23px มุดหลังขา/เสื้อคลุม',
          'const PAPERDOLL_DEPTH = ' + json.dumps(out, separators=(',', ':')) + ';', '']
    open(os.path.join(ROOT, 'js', 'paperdoll_depth.js'), 'w', encoding='utf-8').write('\n'.join(js))
    print('เขียน js/paperdoll_depth.js')


if __name__ == '__main__':
    args = sys.argv[1:]
    dbg = None
    if '--debug' in args:
        i = args.index('--debug'); dbg = args[i + 1]; del args[i:i + 2]
    if not args:
        args = [k for k in load_data() if not k.startswith('novice')]
    run(args, dbg)
