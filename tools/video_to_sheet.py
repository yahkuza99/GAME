# -*- coding: utf-8 -*-
"""แปลงวิดีโอท่าทาง (Grok Imagine ฯลฯ — ตัวละครท่าเดียว ทิศเดียว พื้นขาว กล้องนิ่ง) เป็นแถบเฟรมของเกม
ใช้:  python3 tools/video_to_sheet.py <gk> <action> S=<mp4> SW=<mp4> W=<mp4> NW=<mp4> N=<mp4>  (หรือ S=clip.mp4@0,1.2 SW=clip.mp4@1.2,2.4 ... คลิปเดียวหลายทิศ) [--frames 8] [--loop] [--preview out.gif]
      (ทิศไหนไม่มีวิดีโอก็ข้ามได้ แต่ต้องมี W อย่างน้อย • ทิศขวาเกมกลับด้านให้เอง)
ทำให้:
  1) อ่านวิดีโอ ตัดช่วงต้น/ท้ายที่ตัวละครยังนิ่ง
  2) --loop (เดิน/ยืน/นั่ง): หาความยาว 1 รอบจากเฟรมที่หน้าตาวนกลับมาเหมือนเฟรมแรก แล้วเลือก N เฟรมเท่า ๆ กันในรอบนั้น
     ไม่ loop (ตี/สกิล/โดนตี/ล้ม): เลือก N เฟรมเท่า ๆ กันตลอดช่วงที่ขยับ
  3) ล็อกตำแหน่งตัว: ทุกเฟรมจัดให้เท้าอยู่ที่เดิม (วิดีโอมักเลื่อน/ซูมเล็กน้อย)
  4) ประกอบเป็นตาราง N × (จำนวนทิศ) บนพื้นขาว แล้วติดตั้งผ่าน sprite_std (สเกลเท่าท่าเดินของตัวนั้น)"""
import sys, os, json, argparse, subprocess
import numpy as np, cv2
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
ORDER = ['S', 'SW', 'W', 'NW', 'N']


def read(path, maxw=720):
    cap = cv2.VideoCapture(path); fr = []
    fps = cap.get(cv2.CAP_PROP_FPS) or 24
    while True:
        ok, f = cap.read()
        if not ok: break
        h, w = f.shape[:2]
        if w > maxw: f = cv2.resize(f, (maxw, int(h * maxw / w)), interpolation=cv2.INTER_AREA)
        fr.append(cv2.cvtColor(f, cv2.COLOR_BGR2RGB))
    return fr, fps


def mask(f):
    return (f.min(-1) < 225)


def motion_span(fr):
    """ช่วงที่ตัวละครขยับจริง (ตัดหัว/ท้ายที่นิ่ง)"""
    if len(fr) < 3: return 0, len(fr)
    sm = [small(f) for f in fr]  # เทียบรูปทรงตัวละคร (ไม่สนการเลื่อน/สั่นของกล้อง)
    d = [np.abs(sm[i + 1] - sm[i]).mean() for i in range(len(fr) - 1)]
    th = max(1.0, np.percentile(d, 70) * 0.3)
    mv = [i for i, v in enumerate(d) if v > th]
    return (mv[0], mv[-1] + 2) if mv else (0, len(fr))


def small(f):
    m = mask(f).astype(np.uint8) * 255
    ys, xs = np.nonzero(m)
    if not len(ys): return np.zeros((64, 64), np.float32)
    c = cv2.cvtColor(f, cv2.COLOR_RGB2GRAY)[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return cv2.resize(c, (64, 64)).astype(np.float32)


def find_cycle(fr, fps):
    """ความยาวรอบ (จำนวนเฟรม): เฟรมที่กลับมาเหมือนเฟรมแรกที่สุด หลังเวลาผ่านไป ≥ 0.35 วิ"""
    s = [small(f) for f in fr]
    lo, hi = int(fps * 0.35), min(len(fr) - 1, int(fps * 3.0))
    if hi <= lo: return len(fr)
    err = [np.abs(s[k] - s[0]).mean() for k in range(lo, hi + 1)]
    best = min(err)  # รอบแรกที่กลับมาเหมือนเฟรมแรก (ไม่เอารอบที่ 2-3 ที่เหมือนพอ ๆ กัน)
    return lo + next(i for i, v in enumerate(err) if v <= best * 1.2 + 0.6)


def lock(frames, H=700):
    """จัดทุกเฟรมให้เท้าอยู่ที่จุดเดียวกัน (กึ่งกลางล่างของกรอบรวม) บนผืนขาวขนาดเท่ากัน"""
    boxes = []
    for f in frames:
        ys, xs = np.nonzero(mask(f)); boxes.append((xs.min(), ys.min(), xs.max(), ys.max()) if len(ys) else None)
    hs = [b[3] - b[1] for b in boxes if b]; ws = [b[2] - b[0] for b in boxes if b]
    W = int(max(ws) * 1.25) + 20; Hh = int(max(hs) * 1.1) + 20
    out = []
    for f, b in zip(frames, boxes):
        cv = Image.new('RGB', (W, Hh), (255, 255, 255))
        if b:
            # จุดยึด = กลางเท้า (กลางแนวนอนของ 15% ล่างของตัว)
            m = mask(f); band = m[b[3] - max(2, (b[3] - b[1]) // 7):b[3] + 1, :]
            fx = int(np.nonzero(band.any(0))[0].mean()) if band.any() else (b[0] + b[2]) // 2
            crop = Image.fromarray(f).crop((b[0], b[1], b[2] + 1, b[3] + 1))
            cv.paste(crop, (W // 2 - (fx - b[0]), Hh - 10 - crop.height))
        out.append(cv)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('gk'); ap.add_argument('action'); ap.add_argument('vids', nargs='+')
    ap.add_argument('--frames', type=int, default=0); ap.add_argument('--loop', action='store_true')
    ap.add_argument('--preview', default=''); ap.add_argument('--scale', type=float, default=0)
    ap.add_argument('--no-install', action='store_true')
    ap.add_argument('--t', default='', help='ช่วงเวลา (วินาที) ในวิดีโอรวมหลายท่า เช่น 1.5,4.5')
    ap.add_argument('--range', default='', help='ใช้เฉพาะช่วงของวิดีโอ เช่น 0.5,1 = ครึ่งหลัง (นั่งลงแล้วนั่งนิ่ง)')
    a = ap.parse_args()
    loop = a.loop or a.action in ('walk', 'idle', 'sit')
    N = a.frames or (8 if loop else 6)
    vids = dict(v.split('=', 1) for v in a.vids)
    dirs = [d for d in ORDER if d in vids]
    rows = []
    for d in dirs:
        path, _, span = vids[d].partition('@')  # W=clip.mp4@2.4,3.6 → ใช้เฉพาะช่วงเวลานั้นของคลิป (คลิปเดียวหลายทิศ)
        fr, fps = read(path)
        if span:
            t0, t1 = map(float, span.split(',')); fr = fr[int(t0 * fps):max(int(t0 * fps) + 2, int(t1 * fps))]
        if a.t:
            t0, t1 = map(float, a.t.split(',')); fr = fr[int(t0 * fps):max(int(t0 * fps) + 2, int(t1 * fps))]
        elif a.range:
            r0, r1 = map(float, a.range.split(',')); fr = fr[int(len(fr) * r0):max(int(len(fr) * r0) + 2, int(len(fr) * r1))]
        else:
            s, e = motion_span(fr); fr = fr[s:e]
        if loop:
            k = find_cycle(fr, fps); seg = fr[:k]
            print(f'  {d}: {len(fr)} เฟรมที่ขยับ • 1 รอบ = {k} เฟรม ({k / fps:.2f} วิ)')
        else:
            seg = fr; print(f'  {d}: {len(fr)} เฟรมที่ขยับ ({len(fr) / fps:.2f} วิ)')
        idx = [int(round(i * len(seg) / N)) for i in range(N)] if loop else [int(round(i * (len(seg) - 1) / (N - 1))) for i in range(N)]
        rows.append(lock([seg[min(i, len(seg) - 1)] for i in idx]))
    cw = max(c.width for r in rows for c in r); ch = max(c.height for r in rows for c in r)
    sheet = Image.new('RGB', (cw * N, ch * len(rows)), (255, 255, 255))
    for r, row in enumerate(rows):
        for c, im in enumerate(row): sheet.paste(im, (c * cw + (cw - im.width) // 2, r * ch + ch - im.height))
    tmp = f'/tmp/video_sheet_{a.gk}_{a.action}.png'; sheet.save(tmp); print('  ชีต', tmp, sheet.size)
    if a.preview:
        fr = []
        for c in range(N):
            o = Image.new('RGB', (len(rows) * 200, 220), (52, 60, 70))
            for r in range(len(rows)):
                cell = sheet.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)); cell.thumbnail((200, 220)); o.paste(cell, (r * 200, 220 - cell.height))
            fr.append(o)
        fr[0].save(a.preview, save_all=True, append_images=fr[1:], duration=int(1000 * (0.9 / N if loop else 0.5 / N)), loop=0)
    if a.no_install: return
    cmd = ['python3', os.path.join(ROOT, 'tools', 'sprite_std.py'), 'install', tmp, a.gk, a.action, '--grid', f'{N}x{len(rows)}', '--dirs', ','.join(dirs)]
    if a.scale: cmd += ['--scale', str(a.scale)]
    if a.action not in ('walk', 'idle'): cmd += ['--nofit']
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=ROOT)
    print('\n'.join(l for l in r.stdout.splitlines() if 'สเกล' in l or 'ติดตั้ง' in l or 'ทิศ' in l) or r.stdout[-600:], r.stderr[-600:])


if __name__ == '__main__':
    main()
