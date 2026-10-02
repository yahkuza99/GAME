# -*- coding: utf-8 -*-
"""ทดลองระบบเปลี่ยนอาวุธ/ใส่หมวก (paperdoll) บนภาพเคลื่อนไหวทีละเฟรม
ลบอาวุธเดิม (ใบมีดสีฟ้า) ออกจากทุกเฟรม แล้ววัดจุดมือ มุมอาวุธ และจุดหัว เก็บไว้ให้เกมวาดของที่สวมทับเอง

ใช้:  python3 tools/paperdoll.py novice_f novice_m
      python3 tools/paperdoll.py --marker magenta einherjar_m einherjar_f   (ภาพ Class วาดมือเปล่า + แท่ง magenta)
ได้:  assets/anim_<key>_bare_<action>.webp  (ตัวเปล่าไม่มีอาวุธ)
      js/paperdoll_data.js                  (จุดมือ/มุม/หัว ทุกเฟรม ทุกทิศ)
      ภาพตรวจ debug ใน --debug <โฟลเดอร์> (ถ้าใส่)"""
import sys, os, json, math
import numpy as np, cv2
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
A = os.path.join(ROOT, 'assets')
C = 240
ACTS = ['idle', 'walk', 'attack', 'shoot', 'cast', 'sit', 'hurt', 'dead']


CENTER_ACTS = set()  # ท่าที่จุดมือ = กลางแท่ง (ธนู) เช่น --center shoot,cast
MARKER = 'cyan'  # cyan = ใบมีดเดิมของ Novice • magenta = แท่งบอกตำแหน่งมือในภาพ Class (วาดมือเปล่า)


def cyan_mask(rgba):
    if MARKER == 'magenta': return magenta_mask(rgba)
    rgb = rgba[..., :3]
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV_FULL).astype(np.float32)
    h, s, v = hsv[..., 0] / 255, hsv[..., 1] / 255, hsv[..., 2] / 255
    a = rgba[..., 3]
    core = (h > 0.42) & (h < 0.60) & (s > 0.30) & (v > 0.50) & (a > 30)
    return core


def magenta_mask(rgba):
    """แท่งสีชมพูบานเย็น (#FF00FF) ที่สั่งให้ AI วาดไว้ในมือแทนอาวุธ"""
    hsv = cv2.cvtColor(rgba[..., :3], cv2.COLOR_RGB2HSV_FULL).astype(np.float32)
    h, s, v = hsv[..., 0] / 255, hsv[..., 1] / 255, hsv[..., 2] / 255
    return (h > 0.79) & (h < 0.92) & (s > 0.55) & (v > 0.55) & (rgba[..., 3] > 30)


def head_ref(alpha, cyan):
    """หัว = ยอดของเนื้อภาพที่ไม่ใช่สีฟ้า (ผม/หัว) + จุดกึ่งกลางแนวนอนของแถบบนสุด"""
    body = (alpha > 90) & ~cyan
    ys, xs = np.nonzero(body)
    if not len(ys): return None
    top = ys.min()
    band = body[top:top + 30]
    by, bx = np.nonzero(band)
    return float(bx.mean()), float(top)


def process(rgba, act=''):
    """คืน (ภาพเปล่า, จุดมือ (x,y,มุม) หรือ None, จุดหัว (x,y), mask ที่ลบ)"""
    alpha = rgba[..., 3]
    cyan = cyan_mask(rgba)
    hr = head_ref(alpha, cyan)
    if hr is None: return rgba, None, None, False
    hx, top = hr
    hcx, hcy = hx, top + 30  # กลางหัวโดยประมาณ (ตัวสูง 150px หัวราว 55-60px)
    # รวมกลุ่มสีฟ้าที่ติดกัน (ขยาย 2px ให้ใบมีดที่มีขอบมืดเป็นชิ้นเดียว)
    grow = cv2.dilate(cyan.astype(np.uint8), np.ones((5, 5), np.uint8))
    n, lab, stats, cents = cv2.connectedComponentsWithStats(grow, connectivity=8)
    remove = np.zeros_like(cyan)
    parts, smear = [], False
    fx = np.zeros_like(cyan)
    for i in range(1, n):
        comp = (lab == i) & cyan
        cnt = int(comp.sum())
        if cnt < 10: continue
        ys, xs = np.nonzero(comp)
        cx, cy = xs.mean(), ys.mean()
        dmax = np.sqrt((xs - hcx) ** 2 + (ys - hcy) ** 2).max()
        dc = math.hypot(cx - hcx, cy - hcy)
        pts = np.stack([xs, ys], 1).astype(np.float32); mu = pts.mean(0)
        ev, evec = np.linalg.eigh(np.cov((pts - mu).T)) if cnt > 2 else (np.ones(2), np.eye(2))
        L = float(np.ptp((pts - mu) @ evec[:, 1]))
        flat = abs(evec[1, 1]) < 0.35  # แนวนอน (หน้ากาก)
        # ของบนหัว (หน้ากาก/ครีบหู): อยู่ในวงหัวทั้งชิ้น และเล็ก หรือเป็นแถบแนวนอน (ใบมีดที่ยกขึ้นข้างหัวจะใหญ่+เฉียง)
        if MARKER == 'cyan':  # ของสีฟ้าบนหัว Novice (แท่ง magenta ไม่มีของบนหัวให้แยก)
            if dmax < 46 and dc < 36 and (cnt < 160 or flat): continue
            if flat and dc < 44 and L < 40: continue  # หน้ากากตอนหันข้าง (อยู่เยื้องจากกลางผม)
        # เอฟเฟกต์ฟันเป็นวงโค้งยาว: เก็บไว้ในภาพ (เป็นเฟรมเบลอแทนอาวุธ) แล้วไม่วาดอาวุธในเฟรมนี้
        round_ = ev[1] / max(ev[0], 1e-3) < 4
        # ท่าร่าย: วงเวทกลม ๆ ที่มือ (ยังเล็กในเฟรมแรก) ก็เป็นเอฟเฟกต์ ไม่ใช่อาวุธ
        if MARKER == 'cyan' and act == 'cast' and round_ and cnt > 60:
            fx |= (lab == i); continue
        if MARKER == 'cyan' and (L >= 62 or (cnt > 380 and round_)):
            smear = True; fx |= (lab == i); continue
        parts.append((cnt, xs, ys))
        remove |= (lab == i)
    # ขอบเรืองแสงรอบใบมีด (สว่าง/อมฟ้าอ่อน) ที่ติดกับส่วนที่ลบ
    if remove.any():
        near = cv2.dilate(remove.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
        rgb = rgba[..., :3].astype(np.int32)
        if MARKER == 'magenta':  # แท่งเรืองแสง: ขอบชมพูอ่อน + แกนกลางสีขาว
            mx, mn = rgb.max(-1), rgb.min(-1)
            glow = (((rgb[..., 0] > rgb[..., 1] + 25) & (rgb[..., 2] > rgb[..., 1] + 25)) | ((mn > 200) & (mx - mn < 70))) & (alpha > 20)
            core = cv2.morphologyEx(remove.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8)).astype(bool)
            remove |= (near & glow) | (core & (alpha > 20))
        else:
            bluish = (rgb[..., 2] > rgb[..., 0] + 25) & (alpha > 20)
            remove |= near & bluish
    # ตัวเปล่า: ส่วนที่ลบซึ่งอยู่ "บนตัว" เติมสีจากรอบข้าง ส่วนที่อยู่นอกตัวทำให้โปร่ง
    body = ((alpha > 90) & ~remove).astype(np.uint8)
    sil = cv2.morphologyEx(body, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)))
    # เติมรูในเงาตัว
    ff = sil.copy(); h, w = ff.shape
    m = np.zeros((h + 2, w + 2), np.uint8); cv2.floodFill(ff, m, (0, 0), 1)
    sil = sil | (1 - ff)
    sil = cv2.erode(sil, np.ones((3, 3), np.uint8)).astype(bool)
    out = rgba.copy()
    inside = remove & sil
    if inside.any():
        bgr = cv2.cvtColor(np.ascontiguousarray(rgba[..., :3]), cv2.COLOR_RGB2BGR)
        fix = cv2.inpaint(bgr, inside.astype(np.uint8) * 255, 4, cv2.INPAINT_TELEA)
        out[..., :3][inside] = cv2.cvtColor(fix, cv2.COLOR_BGR2RGB)[inside]
        out[..., 3][inside] = 255
    out[..., 3][remove & ~sil] = 0
    # เศษเรืองแสงเล็ก ๆ ที่หลุดจากใบมีด (ไม่ติดตัว) → ลบทิ้ง
    n2, lab2, st2, _ = cv2.connectedComponentsWithStats((out[..., 3] > 20).astype(np.uint8), connectivity=8)
    for i in range(1, n2):
        if st2[i, cv2.CC_STAT_AREA] < 40 and remove[lab2 == i].any() or st2[i, cv2.CC_STAT_AREA] < 12:
            out[..., 3][lab2 == i] = 0
    # จุดมือ + มุม จากชิ้นใบมีดที่ใหญ่ที่สุด (ถ้ายาวเรียว = ใบมีด, ถ้าเป็นวงโค้ง = เอฟเฟกต์ฟัน → ไม่วัด)
    hand = None
    if parts:
        cnt, xs, ys = max(parts, key=lambda p: p[0])
        pts = np.stack([xs, ys], 1).astype(np.float32)
        mu = pts.mean(0)
        cov = np.cov((pts - mu).T)
        ev, evec = np.linalg.eigh(cov)
        axis = evec[:, 1]
        ratio = math.sqrt(ev[1] / max(ev[0], 1e-3))
        proj = (pts - mu) @ axis
        L = proj.max() - proj.min()
        if ratio > 1.6 and L < 75 and not smear:
            e1, e2 = mu + axis * proj.min(), mu + axis * proj.max()
            # ด้ามอยู่ฝั่งที่ใกล้กลางลำตัว
            bys, bxs = np.nonzero(body)
            bc = np.array([bxs.mean(), bys.mean()])
            grip, tip = (e1, e2) if np.linalg.norm(e1 - bc) < np.linalg.norm(e2 - bc) else (e2, e1)
            if act == 'shoot' or act in CENTER_ACTS:  # ท่ายิง: แท่งตั้งอยู่ในกำปั้น = กลางคันธนู
                grip = mu
            ang = math.atan2(tip[1] - grip[1], tip[0] - grip[0])
            hand = [round(float(grip[0]), 1), round(float(grip[1]), 1), round(ang, 3)]
    # หัวหลังลบ: ยอดเนื้อภาพ + กลางแถบบน
    a2 = (out[..., 3] > 90) & ~cyan
    if fx.any(): a2 &= ~cv2.dilate(fx.astype(np.uint8), np.ones((13, 13), np.uint8)).astype(bool)
    ys, xs = np.nonzero(a2[:, :])
    head = None
    if len(ys):
        t2 = ys.min(); band = a2[t2:t2 + 28]; by, bx = np.nonzero(band)
        head = [round(float(bx.mean()), 1), int(t2)]
    return out, hand, head, smear


def fill_gaps(seq, smears, steady=False):
    """เฟรมที่วัดมือไม่ได้ (เช่นเฟรมเอฟเฟกต์ฟัน): ใช้ค่าเฉลี่ยของเฟรมข้างเคียง"""
    n = len(seq)
    seq = list(seq)
    # เฟรมที่ AI วาดแท่งสลับไปอีกมือ (มือห่างจากตำแหน่งปกติของแถวนี้มาก) → ประมาณจากเฟรมข้างเคียงแทน
    xs = sorted(h[0] for h in seq if h)
    if steady and len(xs) >= 3:
        med = xs[len(xs) // 2]
        for i, h in enumerate(seq):
            if h and abs(h[0] - med) > 38 and not smears[i]:
                seq[i] = None
    # เฟรมหลังฟัน (ตามแรงเหวี่ยง) มักจับผิดชิ้น (อัญมณีที่เข่า/ปอยผม) — ถ้าห่างจากเฟรมถัดไปมากเกิน ให้ประมาณใหม่
    for i in range(1, n - 1):
        if smears[i - 1] and seq[i] and seq[i + 1] and math.hypot(seq[i][0] - seq[i + 1][0], seq[i][1] - seq[i + 1][1]) > 45:
            seq[i] = None
    out = list(seq)
    for i in range(n):
        if out[i] is not None: continue
        if smears[i]: continue
        # ใช้เฟรมข้างเคียงที่ใกล้ที่สุด (ท่าวนรอบ = เดินวน, ท่าเล่นครั้งเดียว = ไม่ข้ามหัว/ท้าย)
        prev = next((seq[i - k] for k in range(1, i + 1) if seq[i - k] is not None), None)
        nxt = next((seq[i + k] for k in range(1, n - i) if seq[i + k] is not None), None)
        if prev and nxt:
            da = math.atan2(math.sin(nxt[2] - prev[2]), math.cos(nxt[2] - prev[2]))
            out[i] = [round((prev[0] + nxt[0]) / 2, 1), round((prev[1] + nxt[1]) / 2, 1), round(prev[2] + da / 2, 3), 1]
        elif prev or nxt:
            out[i] = list(prev or nxt) + [1]
    return out


def run(key, dbg=None):
    data = {}
    for act in ACTS:
        p = os.path.join(A, f'anim_{key}_{act}.webp')
        if not os.path.exists(p): continue
        im = np.array(Image.open(p).convert('RGBA'))
        rows, cols = im.shape[0] // C, im.shape[1] // C
        bare = im.copy()
        dbgim = None
        if dbg is not None:
            dbgim = Image.new('RGBA', (im.shape[1], im.shape[0]), (70, 80, 90, 255))
        H, D = [], []
        for r in range(rows):
            hs, ds, ms = [], [], []
            for f in range(cols):
                cell = im[r * C:(r + 1) * C, f * C:(f + 1) * C]
                out, hand, head, sm = process(cell, act)
                bare[r * C:(r + 1) * C, f * C:(f + 1) * C] = out
                hs.append(hand); ds.append(head); ms.append(sm)
            # ท่าตาย/ล้ม: มือไม่สำคัญ ไม่เติมช่องว่าง (ไม่มีอาวุธก็ได้)
            H.append(fill_gaps(hs, ms if act == 'attack' else [False] * len(hs), act in ('walk', 'idle', 'sit')) if act != 'dead' else hs); D.append(ds)
        Image.fromarray(bare).save(os.path.join(A, f'anim_{key}_bare_{act}.webp'), 'WEBP', quality=90, method=6)
        data[act] = {'hand': H, 'head': D}
        if dbg is not None:
            dbgim.alpha_composite(Image.fromarray(bare))
            from PIL import ImageDraw
            dr = ImageDraw.Draw(dbgim)
            for r in range(rows):
                for f in range(cols):
                    h = H[r][f]; d = D[r][f]
                    ox, oy = f * C, r * C
                    if h:
                        x, y, a = h[0] + ox, h[1] + oy, h[2]
                        col = (255, 60, 60) if len(h) < 4 else (255, 200, 0)
                        dr.ellipse([x - 3, y - 3, x + 3, y + 3], fill=col)
                        dr.line([x, y, x + math.cos(a) * 30, y + math.sin(a) * 30], fill=col, width=2)
                    if d:
                        dr.ellipse([d[0] + ox - 3, d[1] + oy - 3, d[0] + ox + 3, d[1] + oy + 3], fill=(60, 255, 60))
            dbgim.convert('RGB').save(os.path.join(dbg, f'pd_{key}_{act}.png'))
        print(key, act, f'{rows}x{cols}', 'hands', sum(1 for r in H for h in r if h), '/', rows * cols)
    return data


if __name__ == '__main__':
    args = sys.argv[1:]
    dbg = None
    if '--marker' in args:
        i = args.index('--marker'); MARKER = args[i + 1]; del args[i:i + 2]
    if '--center' in args:
        i = args.index('--center'); CENTER_ACTS = set(args[i + 1].split(',')); del args[i:i + 2]
    if '--debug' in args:
        i = args.index('--debug'); dbg = args[i + 1]; del args[i:i + 2]
        os.makedirs(dbg, exist_ok=True)
    out_js = os.path.join(ROOT, 'js', 'paperdoll_data.js')
    # เก็บข้อมูลตัวอื่นที่ทำไว้แล้ว (รันทีละ Class ได้)
    allp = {}
    if os.path.exists(out_js):
        txt = open(out_js, encoding='utf-8').read()
        allp = json.loads(txt[txt.index('PAPERDOLL_DATA = ') + 17:txt.rindex(';')])
    for k in args: allp[k] = run(k, dbg)
    with open(out_js, 'w', encoding='utf-8') as fp:
        fp.write("'use strict';\n// สร้างอัตโนมัติโดย tools/paperdoll.py — อย่าแก้ด้วยมือ\n")
        fp.write('// hand[แถว][เฟรม] = [x, y, มุม(เรเดียน, ด้าม→ปลาย), (1 = ประมาณจากเฟรมข้างเคียง)] ในช่อง 240px, head = [x, ยอดหัว y]\n')
        fp.write('const PAPERDOLL_DATA = ' + json.dumps(allp, separators=(',', ':')) + ';\n')
    print('wrote', out_js)
