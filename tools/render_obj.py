# -*- coding: utf-8 -*-
"""เรนเดอร์โมเดล 3 มิติ (.obj + texture) เป็นภาพ 2 มิติหลายทิศ (ซอฟต์แวร์ล้วน ไม่ต้องใช้การ์ดจอ)
ใช้: python3 tools/render_obj.py <model.obj> <texture.png|webp> <out_prefix> [--size 512] [--pitch 25] [--yaw0 0] [--up y]
ได้: <out_prefix>_<ทิศ>.png 8 ทิศ (S, SW, W, NW, N, NE, E, SE) + <out_prefix>_sheet.png"""
import sys, math, argparse
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('obj'); ap.add_argument('tex'); ap.add_argument('out')
ap.add_argument('--size', type=int, default=512); ap.add_argument('--pitch', type=float, default=25)
ap.add_argument('--yaw0', type=float, default=0); ap.add_argument('--up', default='y')
a = ap.parse_args()

V, VT, F = [], [], []
for line in open(a.obj):
    if line.startswith('v '): V.append(list(map(float, line.split()[1:4])))
    elif line.startswith('vt '): VT.append(list(map(float, line.split()[1:3])))
    elif line.startswith('f '):
        p = [x.split('/') for x in line.split()[1:]]
        for i in range(1, len(p) - 1):  # แตกเป็นสามเหลี่ยม
            tri = [p[0], p[i], p[i + 1]]
            F.append([(int(t[0]) - 1, int(t[1]) - 1 if len(t) > 1 and t[1] else -1) for t in tri])
V = np.array(V); VT = np.array(VT) if VT else np.zeros((1, 2)); F = np.array(F)
if a.up == 'z': V = V[:, [0, 2, 1]] * [1, 1, -1]
V -= (V.min(0) + V.max(0)) / 2
tex = np.array(Image.open(a.tex).convert('RGB')).astype(np.float32); TH, TW = tex.shape[:2]
print('verts', len(V), 'tris', len(F), 'bbox', V.min(0).round(3), V.max(0).round(3))

def render(yaw):
    cy, sy = math.cos(math.radians(yaw)), math.sin(math.radians(yaw))
    cp, sp = math.cos(math.radians(a.pitch)), math.sin(math.radians(a.pitch))
    x = V[:, 0] * cy + V[:, 2] * sy; z = -V[:, 0] * sy + V[:, 2] * cy; y = V[:, 1]
    y2 = y * cp - z * sp; z2 = y * sp + z * cp   # เอียงกล้องมองลง
    S = a.size; scale = S * 0.86 / (max(y2.max() - y2.min(), x.max() - x.min()))
    px = S / 2 + x * scale; py = S / 2 - (y2 - (y2.max() + y2.min()) / 2) * scale; pz = z2
    img = np.zeros((S, S, 3), np.float32); zb = np.full((S, S), -1e9, np.float32); alpha = np.zeros((S, S), np.uint8)
    # แสง: ทิศตายตัวในมุมกล้อง (บนซ้ายหน้า)
    P = np.stack([x, y2, z2], 1)
    for tri in F:
        vi = tri[:, 0]; ti = tri[:, 1]
        X, Y, Z = px[vi], py[vi], pz[vi]
        x0, x1 = int(max(0, X.min())), int(min(S - 1, X.max() + 1)); y0, y1 = int(max(0, Y.min())), int(min(S - 1, Y.max() + 1))
        if x1 < x0 or y1 < y0: continue
        den = (Y[1] - Y[2]) * (X[0] - X[2]) + (X[2] - X[1]) * (Y[0] - Y[2])
        if abs(den) < 1e-9: continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        w0 = ((Y[1] - Y[2]) * (gx - X[2]) + (X[2] - X[1]) * (gy - Y[2])) / den
        w1 = ((Y[2] - Y[0]) * (gx - X[2]) + (X[0] - X[2]) * (gy - Y[2])) / den
        w2 = 1 - w0 - w1
        m = (w0 >= -1e-4) & (w1 >= -1e-4) & (w2 >= -1e-4)
        if not m.any(): continue
        zz = w0 * Z[0] + w1 * Z[1] + w2 * Z[2]
        sub = zb[y0:y1 + 1, x0:x1 + 1]; m &= zz > sub
        if not m.any(): continue
        if ti[0] >= 0:
            uv = VT[ti]; u = w0 * uv[0, 0] + w1 * uv[1, 0] + w2 * uv[2, 0]; v = w0 * uv[0, 1] + w1 * uv[1, 1] + w2 * uv[2, 1]
            c = tex[np.clip(((1 - v) * TH).astype(int), 0, TH - 1), np.clip((u * TW).astype(int), 0, TW - 1)]
        else: c = np.full(gx.shape + (3,), 200.0)
        n = np.cross(P[vi[1]] - P[vi[0]], P[vi[2]] - P[vi[0]]); n /= (np.linalg.norm(n) + 1e-9)
        lit = 0.72 + 0.28 * abs(np.dot(n, np.array([-0.4, 0.6, 0.7]) / 1.0296))
        sub[m] = zz[m]
        img[y0:y1 + 1, x0:x1 + 1][m] = c[m] * lit
        alpha[y0:y1 + 1, x0:x1 + 1][m] = 255
    return Image.fromarray(np.dstack([np.clip(img, 0, 255).astype(np.uint8), alpha]), 'RGBA')

DIRS = [('S', 0), ('SW', 45), ('W', 90), ('NW', 135), ('N', 180), ('NE', 225), ('E', 270), ('SE', 315)]
outs = []
for name, yaw in DIRS:
    im = render(yaw + a.yaw0); im.save(f'{a.out}_{name}.png'); outs.append(im); print('rendered', name)
sheet = Image.new('RGBA', (a.size * 4, a.size * 2), (255, 255, 255, 255))
for i, im in enumerate(outs): sheet.alpha_composite(im, ((i % 4) * a.size, (i // 4) * a.size))
sheet.convert('RGB').save(f'{a.out}_sheet.png')
