# -*- coding: utf-8 -*-
"""ภาพรวมเฟรมของวิดีโอพร้อมเวลา (ไว้ดูว่าแต่ละท่าอยู่ช่วงวินาทีไหน ก่อนตัดด้วย video_to_sheet --t)
ใช้: python3 tools/video_contact.py <mp4> <out.png> [--step 0.25]"""
import sys, cv2
from PIL import Image, ImageDraw, ImageFont

src, out = sys.argv[1], sys.argv[2]
step = float(sys.argv[sys.argv.index('--step') + 1]) if '--step' in sys.argv else 0.25
cap = cv2.VideoCapture(src); fps = cap.get(cv2.CAP_PROP_FPS) or 24
fr = []
while True:
    ok, f = cap.read()
    if not ok: break
    fr.append(f)
idx = [int(i * step * fps) for i in range(int(len(fr) / fps / step) + 1) if int(i * step * fps) < len(fr)]
tw = 160; th = int(tw * fr[0].shape[0] / fr[0].shape[1]); cols = 8
sheet = Image.new('RGB', (cols * tw, ((len(idx) + cols - 1) // cols) * (th + 18)), (40, 44, 52))
d = ImageDraw.Draw(sheet)
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 13)
except OSError: font = ImageFont.load_default()
for n, i in enumerate(idx):
    im = Image.fromarray(cv2.cvtColor(fr[i], cv2.COLOR_BGR2RGB)).resize((tw, th))
    x, y = (n % cols) * tw, (n // cols) * (th + 18)
    sheet.paste(im, (x, y + 18)); d.text((x + 4, y + 2), f'{i / fps:.2f}s', fill=(255, 220, 120), font=font)
sheet.save(out); print(out, f'{len(fr)} frames, {len(fr) / fps:.1f}s @ {fps:.0f}fps')
