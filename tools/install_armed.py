# -*- coding: utf-8 -*-
"""ติดตั้งภาพ Class แบบ "ถืออาวุธในภาพ" ทีละภาพ (เดิน/ตี/ยิง/สกิล) ครบขั้นตอนเดียว
ใช้:  python3 tools/install_armed.py <png> <class>_<m|f> <walk|attack|shoot|cast> [--flip-rows 1,2,3] [--order 0,3,2,1]
ทำให้:
  1) ติดตั้งด้วย sprite_std (เดิน = วัดสเกลเอง • ท่าอื่น = ใช้สเกลของท่าเดินตัวเดียวกัน ไม่ปรับขนาดเฟรมย่อตัว,
     ชีตที่ขนาดไม่ใช่ 1024x1536 ปรับสเกลตามความสูงภาพ)
     --ref-frames 1,4: ชีตที่ขนาดภาพไม่เท่าท่าเดิน (เช่น 1536x1024) ใช้ความสูงของเฟรมยืนตรงตั้งสเกลแทน
  2) --flip-rows: กลับด้านแถวที่ AI วาดหันผิด (นับแถวในภาพต้นฉบับ 0-4 = หน้า, หน้าซ้าย, ซ้าย, หลังซ้าย, หลัง)
     --order: สลับลำดับเฟรม (เช่น 0,3,2,1 เมื่อเดินถอยหลัง)
  3) ถ้าเป็นท่าเดิน: ปิด paperdoll ของตัวนั้น (ลบ anim_<gk>_bare_* + ข้อมูลใน paperdoll_data/depth)
  4) รายงานเฟรมที่ไม่เห็นอาวุธ (สีเรืองแสงของอาวุธประจำ Class) + ทำ GIF 8 ทิศไว้ตรวจใน --gif <path>
  5) สร้าง manifest ใหม่
ยังไม่ commit — ให้รัน smoke test แล้ว commit เอง"""
import sys, os, json, subprocess, argparse
import numpy as np, cv2
from PIL import Image, ImageOps

ROOT = os.path.join(os.path.dirname(__file__), '..')
A = os.path.join(ROOT, 'assets')
C = 240
# ช่วงสี HSV (OpenCV 0-180) ของอาวุธประจำ Class (สายเดียวกันใช้ร่วม) — ใช้ตรวจว่าอาวุธอยู่ครบ
WEAPON_HUE = {'einherjar': [(0, 8), (172, 180)], 'runecaster': [(95, 125)], 'wildhunter': [(40, 85)],
              'volva': [(15, 35), (95, 125)], 'trickster': [(125, 160)], 'berserker': [(5, 25)]}
SECOND = {'valkyrie': 'einherjar', 'hersir': 'einherjar', 'galdr': 'runecaster', 'seidr': 'runecaster', 'skadi': 'wildhunter', 'ullr': 'wildhunter',
          'norn': 'volva', 'gythja': 'volva', 'phantom': 'trickster', 'skald': 'trickster', 'warlord': 'berserker', 'jotun': 'berserker'}


def regrid(im, cols=4, rows=5, win=0.18):
    """แถว/คอลัมน์ที่ AI วาดไม่เท่ากัน: หาเส้นแบ่งจริง (แนวที่มีเนื้อภาพน้อยสุด ใกล้เส้นแบ่งปกติ)
    แล้วจัดลงตารางเท่ากันใหม่ (ชิดล่าง/กลาง) — ตัวละครที่ล้นเส้นแบ่งปกติจะไม่ถูกตัด"""
    a = np.array(im); fg = a.min(-1) < 235
    def cuts(prof, n):
        L = len(prof); out = [0]
        for i in range(1, n):
            c = L * i / n; lo, hi = int(c - L / n * win), int(c + L / n * win)
            out.append(lo + int(np.argmin(prof[lo:hi])))
        return out + [L]
    ys = cuts(fg.sum(1), rows); xs = cuts(fg.sum(0), cols)
    ch = max(ys[i + 1] - ys[i] for i in range(rows)); cw = max(xs[i + 1] - xs[i] for i in range(cols))
    out = Image.new('RGB', (cw * cols, ch * rows), (255, 255, 255))
    for r in range(rows):
        for c in range(cols):
            cell = im.crop((xs[c], ys[r], xs[c + 1], ys[r + 1]))
            out.paste(cell, (c * cw + (cw - cell.width) // 2, r * ch + ch - cell.height))
    uni = [round(im.height * i / rows) for i in range(rows + 1)]
    if max(abs(y - u) for y, u in zip(ys, uni)) > 3: print('  จัดแถวใหม่ตามเส้นแบ่งจริง:', ys)
    return out


def clean_cells(im, cols=4, rows=5):
    """ชีตที่ตัวละครชิดกันจนเกินเส้นแบ่งช่อง (ผม/ฮู้ดของแถวล่างโผล่เข้าช่องบน): ทาสีขาวทับชิ้นส่วนที่เป็นของช่องอื่น
    ชิ้นส่วน = กลุ่มพิกเซลที่ติดกัน → ยกให้ช่องที่มีชิ้นนั้นมากที่สุด"""
    a = np.array(im)
    W, H = im.size; cw, ch = W / cols, H / rows
    fg = (a.min(-1) < 235).astype(np.uint8)
    n, lab = cv2.connectedComponents(cv2.dilate(fg, np.ones((3, 3), np.uint8)), connectivity=8)
    lab = lab * fg
    owner = {}
    for r in range(rows):
        for c in range(cols):
            y0, y1, x0, x1 = int(r * ch), int((r + 1) * ch), int(c * cw), int((c + 1) * cw)
            ids, cnt = np.unique(lab[y0:y1, x0:x1], return_counts=True)
            for i, k in zip(ids, cnt):
                if i and (i not in owner or k > owner[i][0]): owner[i] = (k, r, c)
    totals = dict(zip(*np.unique(lab, return_counts=True)))
    out = a.copy(); moved = 0
    for r in range(rows):
        for c in range(cols):
            y0, y1, x0, x1 = int(r * ch), int((r + 1) * ch), int(c * cw), int((c + 1) * cw)
            sub = lab[y0:y1, x0:x1]
            ids, cnt = np.unique(sub, return_counts=True)
            big = max((k for i, k in zip(ids, cnt) if i), default=0)
            for i, k in zip(ids, cnt):
                # ลบเฉพาะเศษที่ส่วนใหญ่เป็นของช่องอื่น และไม่ใช่ตัวหลักของช่องนี้ (ตัวที่ล้นเส้นช่องเล็กน้อยยังอยู่ครบ)
                if i and owner[i][1:] != (r, c) and k < big * 0.5 and k < totals[i] * 0.3:
                    m = sub == i; out[y0:y1, x0:x1][m] = 255; moved += int(m.sum())
    if moved: print(f'  ตัดชิ้นส่วนที่ล้นมาจากช่องข้างเคียง: {moved} px')
    return Image.fromarray(out)


def sizes():
    p = os.path.join(ROOT, 'art', 'anim_sizes.json')
    return json.load(open(p)) if os.path.exists(p) else {}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('gk'); ap.add_argument('action')
    ap.add_argument('--flip-rows', default=''); ap.add_argument('--order', default='')
    ap.add_argument('--gif', default=''); ap.add_argument('--scale', type=float, default=0)
    ap.add_argument('--holes', default='', help='pixel = ลบพื้นขาวที่ถูกล้อมแคบ ๆ (เช่น ระหว่างคันธนูกับสาย)')
    ap.add_argument('--ref-frames', default='', help='คอลัมน์ที่ยืนตรง (เช่น 1,4) → ตั้งสเกลจากความสูงเฟรมพวกนี้ (ใช้เมื่อชีตขนาด/สัดส่วนต่างจากท่าเดิน)')
    a = ap.parse_args()
    src = a.src
    im = Image.open(src).convert('RGB')
    W, H = im.size
    if a.flip_rows:
        cw, ch = W // 4, H // 5
        for r in map(int, a.flip_rows.split(',')):
            for c in range(4):
                box = (c * cw, r * ch, (c + 1) * cw, (r + 1) * ch); im.paste(ImageOps.mirror(im.crop(box)), box[:2])
    im = regrid(im)
    im = clean_cells(im)
    tmp = os.path.join('/tmp', f'install_armed_{a.gk}_{a.action}.png'); im.save(tmp)
    cmd = ['python3', os.path.join(ROOT, 'tools', 'sprite_std.py'), 'install', tmp, a.gk, a.action, '--grid', '4x5', '--dirs', 'S,SW,W,NW,N']
    scale = a.scale
    if a.ref_frames: cmd += ['--ref-frames', a.ref_frames]
    if a.holes: cmd += ['--holes', a.holes]
    if not scale and a.action != 'walk' and not a.ref_frames:
        w = sizes().get(a.gk, {}).get('walk')
        if w: scale = w['scale_src'] * 1536 / H
    if scale: cmd += ['--scale', str(round(scale, 4))]
    if a.action != 'walk': cmd += ['--nofit']
    out = subprocess.run(cmd, capture_output=True, text=True, cwd=ROOT)
    print('\n'.join(l for l in out.stdout.splitlines() if 'สเกล' in l or 'ติดตั้ง' in l) or out.stdout[-800:], out.stderr[-800:])
    dst = os.path.join(A, f'anim_{a.gk}_{a.action}.webp')
    if a.order:
        o = list(map(int, a.order.split(',')))
        s = Image.open(dst).convert('RGBA'); t = s.copy()
        for i, f in enumerate(o): t.paste(s.crop((f * C, 0, f * C + C, s.height)), (i * C, 0))
        t.save(dst, 'WEBP', quality=90, method=6)
    # ปิด paperdoll เมื่อมีท่าเดินแบบถืออาวุธ
    if a.action == 'walk':
        for f in os.listdir(A):
            if f.startswith(f'anim_{a.gk}_bare_'): os.remove(os.path.join(A, f))
        for fn, var in [('js/paperdoll_data.js', 'PAPERDOLL_DATA'), ('js/paperdoll_depth.js', 'PAPERDOLL_DEPTH')]:
            p = os.path.join(ROOT, fn)
            if not os.path.exists(p): continue
            s = open(p, encoding='utf-8').read(); i = s.index(var + ' = ') + len(var) + 3; j = s.rindex(';')
            D = json.loads(s[i:j])
            if D.pop(a.gk, None) is not None:
                open(p, 'w', encoding='utf-8').write(s[:i] + json.dumps(D, separators=(',', ':')) + s[j:]); print('paperdoll off:', fn)
    # ตรวจอาวุธ
    base = a.gk.rsplit('_', 1)[0]; base = SECOND.get(base, base)
    hues = WEAPON_HUE.get(base)
    arr = np.array(Image.open(dst).convert('RGBA'))
    if hues:
        miss = []
        for r in range(arr.shape[0] // C):
            for f in range(arr.shape[1] // C):
                c = arr[r * C:(r + 1) * C, f * C:(f + 1) * C]
                hsv = cv2.cvtColor(np.ascontiguousarray(c[..., :3]), cv2.COLOR_RGB2HSV)
                m = np.zeros(c.shape[:2], bool)
                for lo, hi in hues: m |= (hsv[..., 0] >= lo) & (hsv[..., 0] <= hi)
                m &= (hsv[..., 1] > 110) & (hsv[..., 2] > 170) & (c[..., 3] > 100)
                ys = np.nonzero(c[..., 3] > 90)[0]
                if len(ys): m[:ys.min() + 45] = False  # ตัดหน้ากาก/หัว
                if m.sum() < 40: miss.append((r, f))
        print('frames without visible weapon (row,frame):', miss or 'none', '(rows 5-7 = back-facing, hidden is OK)')
    if a.gif:
        order = [2, 1, 0, 7, 6, 5, 4, 3]
        img = Image.open(dst).convert('RGBA'); n = img.width // C; fr = []
        for f in range(n):
            o = Image.new('RGBA', (8 * 150, 150), (52, 60, 70, 255))
            for i, r in enumerate(order): o.alpha_composite(img.crop((f * C, r * C, f * C + C, r * C + C)).resize((150, 150), Image.LANCZOS), (i * 150, 0))
            fr.append(o.convert('P', palette=Image.ADAPTIVE, colors=255))
        fr[0].save(a.gif, save_all=True, append_images=fr[1:], duration=180 if a.action == 'walk' else 200, loop=0, disposal=2)
        print('gif', a.gif)
    subprocess.run(['python3', '-c', "import sys; sys.path.insert(0,'tools'); import slice_sheet; slice_sheet.manifest()"], cwd=ROOT)
    for f in os.listdir(os.path.join(ROOT, 'art', 'check')) if os.path.isdir(os.path.join(ROOT, 'art', 'check')) else []:
        pass


if __name__ == '__main__':
    main()
