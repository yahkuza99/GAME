"""ผนังถ้ำ/หน้าผาหิน 3D ทั้งแมพ (Hel's Hollow → Archive Depths → Gnawed Roots) — โมเดลด้วย bpy แล้วอบเป็นภาพพื้น 2D (docs/RENDER3D_PLAN.md ข้อ #2)

ผลลัพธ์: assets/bake_<map>_walls.webp  ภาพเต็มแมพ (กว้าง × สูง ช่อง × 40 px) วาดลงผ้าใบพื้นแทน caveWalls (maps.js renderGround)
  พื้นถ้ำเป็น shadow catcher (โปร่ง มีแต่เงา/AO โคนผนัง) → พื้นที่วาดด้วยโค้ด (ground_cave + caveTheme) ยังเห็นต่อเนื่อง ภาพทึบเฉพาะหิน/ผลึก
  หน้าผาหินแตกเป็นก้อน (Voronoi) มีชั้นหิน รอยแยก ขอบปากผารับแสง • ผลึกงอกจากโคนผนัง/ขอบผาพร้อมแสงสะท้อนบนหินรอบ ๆ
  แสงเรืองจากผลึกบนพื้น (ตำแหน่งเดียวกับ decorate() ในเกม) ตกบนผนังใกล้ ๆ • เส้นแร่เรืองบนหน้าผา

กฎมุมกล้อง (R.K = 0.76 → เอียง 40.5° จากแนวดิ่ง): จุดสูง h ม. ปรากฏเหนือขึ้น 0.855h ช่องในภาพพื้น
→ ความสูงหินทุกจุด ≤ 0.9 × (ระยะถึงช่องที่ไม่ใช่หินทางเหนือในคอลัมน์เดียวกัน) / 0.855 = ด้านเหนือลาดตามเส้นสายตา ไม่บังพื้นเดินได้เลย
   ด้านใต้ (หันหากล้อง) ตั้งดิ่งได้ • ตรวจด้วย check() ต้องได้ 0 จุด (ผลึกก็ต้องผ่านกฎเดียวกัน)
ผังช่องดึงจากเกมจริง (Playwright: new GameMap(id,{lite:true}) — รวมการเคลียร์หินใต้แท่นบัลลังก์ของ Bake.layout แล้ว)
→ tools/cave3d_<map>.json + hash FNV-1a ของผังทั้งแมพ (เกมเทียบ hash ก่อนใช้ภาพ ผังเปลี่ยน = กลับไปวาดผนังด้วยโค้ด)
แสง: ซ้ายบน (sun z = -135° → เงาตกขวาล่าง เหมือนทั้งเกม) อ่อน + ambient ต่ำ + แสงเติมหน้า-ซ้าย (หน้าผาไม่ดำสนิท) + แสงผลึก • เส้นขอบ Freestyle

ชุดวัสดุตามแมพ (--map): helcave = หินม่วงดำ + แร่ม่วง • archive = หินน้ำเงินเย็น + แร่ทอง • roots = หินสนิมส้มแดง + แร่ส้ม

ใช้:
  python3 tools/cave3d.py --extract --map helcave                     (ต้องมี node + playwright)
  python3 tools/cave3d.py --check --map helcave                       (ตรวจภาพบังทางเดิน + ภาพ heightfield ดูเร็ว ๆ — ไม่ต้องใช้ Blender)
  /tmp/bvenv/bin/python tools/cave3d.py --map helcave [--samples 16] [--ss 1.25] [--preview] [--crop x0,y0,x1,y1] [--clay] [--out /tmp/cave.png]
     (ค่าที่ใช้จริง: --samples 16 --ss 1.25 ≈ 13 นาที/แมพ บน CPU 4 คอร์ • --crop เรนเดอร์ทดสอบเฉพาะกรอบช่อง • --clay ดูรูปทรงด้วยวัสดุเทา)
  python3 tools/cave3d.py --install /tmp/cave.png --map helcave       (ยืด ×1/0.76, บันทึก webp, manifest, เขียน CAVE_BAKE ใน js/maps.js)
"""
import math, os, sys, json, random, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
K = 0.76; PX = 40; SH = 0.855               # SH = ยื่นขึ้นเหนือกี่ช่องต่อความสูง 1 ม. ในภาพพื้น
ROCK, CAVE = 8, 7
SOLID = {1, 2, 5, 8, 9, 10}
RES = 10                                     # ตัวอย่าง heightfield ต่อเมตร
PAD = 3                                      # ขยายหินเลยขอบแมพ (ม.) กันขอบภาพโหว่
CLAY = '--clay' in sys.argv                  # ทดสอบรูปทรง: วัสดุเทาล้วน

# ชุดวัสดุ/แสงต่อแมพ: tint = สีหิน (คูณลาย ground_cave) • vein/crystal = สีแร่เรือง • lights = แสงพิเศษ (x, y, z, สี, พลัง W)
THEMES = {
    'helcave': {'tint': (0.54, 0.52, 0.62), 'top': (0.46, 0.44, 0.56), 'vein': (0.62, 0.30, 1.0), 'crystal': (0.62, 0.30, 1.0),
                'world': (0.20, 0.16, 0.30), 'key': (0.86, 0.82, 1.0), 'fill': (0.72, 0.62, 1.0),
                'lights': [(37.5, 4.5, 2.4, (1.0, 0.90, 0.62), 320, 'daylight'),     # แดดอุ่นจากปากถ้ำเหนือ (extraLights 255,236,170)
                           (37.5, 39.0, 2.2, (0.38, 0.94, 0.82), 380, 'throne')]},   # แสงเขียวหยกจากบัลลังก์/ชั้นวางประกายของ Hel
    'archive': {'tint': (0.44, 0.56, 0.80), 'top': (0.24, 0.32, 0.46), 'vein': (1.0, 0.78, 0.30), 'crystal': (1.0, 0.80, 0.40),
                'world': (0.14, 0.18, 0.30), 'key': (0.84, 0.90, 1.0), 'fill': (0.62, 0.74, 1.0), 'lights': []},
    'roots': {'tint': (0.80, 0.50, 0.34), 'top': (0.40, 0.24, 0.16), 'vein': (1.0, 0.50, 0.20), 'crystal': (1.0, 0.55, 0.28),
              'world': (0.26, 0.15, 0.10), 'key': (1.0, 0.88, 0.76), 'fill': (1.0, 0.70, 0.52), 'lights': []},
}


def tiles_path(m): return os.path.join(ROOT, 'tools', f'cave3d_{m}.json')


def fnv(tiles):
    h = 0x811c9dc5
    for v in tiles:
        h ^= v; h = (h * 0x01000193) & 0xffffffff
    return h


# ---------------------------------------------------------------- ดึงผังช่อง + ตำแหน่งผลึกบนพื้นจากเกม
def extract(m):
    import threading, subprocess, tempfile, http.server, functools
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    # ผลึกบนพื้น: ตรรกะเดียวกับ GameMap.decorate (ช่อง CAVE, hash2 < 0.035, ไม่ใกล้วาร์ป) → ใช้วางแสงเรืองบนผนังข้าง ๆ
    js = """const { chromium } = require('playwright');
(async () => { const o = { headless: true }; if (require('fs').existsSync('/opt/pw-browsers/chromium')) o.executablePath = '/opt/pw-browsers/chromium';
  const b = await chromium.launch(o), p = await b.newPage(); await p.goto(process.argv[2]);
  await p.waitForFunction(() => typeof GameMap !== 'undefined' && typeof U !== 'undefined');
  const r = await p.evaluate((id) => { const m = new GameMap(id, { lite: true }), seed = m.def.seed, cr = [];
    for (let y = 2; y < m.h - 2; y++) for (let x = 2; x < m.w - 2; x++) {
      if (m.tile(x, y) !== T.CAVE || m.portals.some(q => Math.abs(q.x - x) + Math.abs(q.y - y) < 3)) continue;
      const r = U.hash2(x, y, seed + 99); if (r >= 0.035) continue;
      cr.push([+(x + (8 + U.hash2(x, y, seed + 7) * 24) / TILE).toFixed(3), +(y + (10 + U.hash2(y, x, seed + 8) * 22) / TILE).toFixed(3)]); }
    return { w: m.w, h: m.h, tiles: Array.from(m.tiles), portals: m.portals, crystals: cr }; }, process.argv[3]);
  console.log(JSON.stringify(r)); await b.close(); })();"""
    f = os.path.join(tempfile.gettempdir(), 'cave3d_extract.js'); open(f, 'w').write(js)
    env = dict(os.environ); env.setdefault('NODE_PATH', subprocess.check_output(['npm', 'root', '-g'], text=True).strip())
    out = subprocess.check_output(['node', f, f'http://127.0.0.1:{srv.server_address[1]}/index.html', m], env=env, text=True)
    srv.shutdown()
    r = json.loads(out.strip().splitlines()[-1]); w, h = r['w'], r['h']
    data = {'map': m, 'w': w, 'h': h, 'hash': fnv(r['tiles']),
            'rows': [''.join('0123456789AB'[v] for v in r['tiles'][y * w:(y + 1) * w]) for y in range(h)],
            'portals': r['portals'], 'crystals': r['crystals']}
    json.dump(data, open(tiles_path(m), 'w'), indent=0)
    print('ผังช่อง →', tiles_path(m), f'{w}×{h}', 'hash', data['hash'], 'ผลึกบนพื้น', len(r['crystals']))


def load_tiles(m):
    d = json.load(open(tiles_path(m)))
    T = [[int(c, 16) for c in s] for s in d['rows']]
    return d, T


# ---------------------------------------------------------------- heightfield (numpy)
def smooth(a, b, x):
    import numpy as np
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)


def vnoise(x, y, seed):
    import numpy as np
    xi, yi = np.floor(x), np.floor(y); xf, yf = x - xi, y - yi
    def hh(i, j):
        v = np.sin(i * 127.1 + j * 311.7 + seed * 74.7) * 43758.5453; return v - np.floor(v)
    u, v = xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf)
    a, b, c, d = hh(xi, yi), hh(xi + 1, yi), hh(xi, yi + 1), hh(xi + 1, yi + 1)
    return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v


def fbm(x, y, seed, oct=4):
    s, a, n = 0, 0.5, 0
    for o in range(oct):
        s = s + vnoise(x * 2 ** o, y * 2 ** o, seed + o * 13) * a; n += a; a *= 0.5
    return s / n


def blur(a, sig):
    import numpy as np
    r = int(sig * 3) + 1; k = np.exp(-np.arange(-r, r + 1) ** 2 / (2 * sig * sig)); k /= k.sum()
    p = np.pad(a, r, mode='edge')
    p = np.apply_along_axis(lambda v: np.convolve(v, k, 'valid'), 0, p)
    return np.apply_along_axis(lambda v: np.convolve(v, k, 'valid'), 1, p)


def side_min(a, k, reach):
    """min ตามแนวนอน (แกน x): a(x) ≤ a(x') + k·|x - x'| ภายในระยะ reach ม. — ลดลงอย่างเดียว (ยังปลอดภัยตามกฎ)"""
    import numpy as np
    out = a.copy(); n = int(reach * RES)
    for o in range(1, n + 1):
        for sh in (o, -o):
            r = np.roll(a, sh, axis=1)
            if sh > 0: r[:, :sh] = a[:, :sh]
            else: r[:, sh:] = a[:, sh:]
            out = np.minimum(out, r + k * o / RES)
    return out


def voronoi(MX, MY, sp, seed):
    """F1, F2, id ของเซลล์ Voronoi ขนาด ~sp ม. (ก้อนหินแตก)"""
    import numpy as np
    cx0, cy0 = np.floor(MX / sp), np.floor(MY / sp)
    F1 = np.full(MX.shape, 99.0); F2 = np.full(MX.shape, 99.0); cid = np.zeros(MX.shape)
    for ox in (-1, 0, 1):
        for oy in (-1, 0, 1):
            ci, cj = cx0 + ox, cy0 + oy
            jx = (np.sin(ci * 12.9898 + cj * 78.233 + seed) * 43758.5453) % 1
            jy = (np.sin(ci * 39.346 + cj * 11.135 + seed) * 24634.6345) % 1
            dd = np.hypot((ci + 0.12 + 0.76 * jx) * sp - MX, (cj + 0.12 + 0.76 * jy) * sp - MY)
            idv = (np.sin(ci * 3.1 + cj * 17.7 + seed * 1.7) * 9631.7) % 1
            closer = dd < F1
            F2 = np.where(closer, F1, np.minimum(F2, dd)); cid = np.where(closer, idv, cid); F1 = np.where(closer, dd, F1)
    return F1, F2, cid


def heightfield(m):
    import numpy as np
    d, T = load_tiles(m); W, H = d['w'], d['h']
    XA, XB, YA, YB = -PAD, W + PAD, -PAD, H + PAD
    nx, ny = int((XB - XA) * RES) + 1, int((YB - YA) * RES) + 1
    xs = XA + np.arange(nx) / RES; ys = YA + np.arange(ny) / RES
    MX, MY = np.meshgrid(xs, ys)                         # [iy, ix]
    TA = np.full((H + 2 * PAD + 2, W + 2 * PAD + 2), ROCK)  # ผังช่องขยายขอบ (นอกแมพ = หิน)
    TA[PAD:PAD + H, PAD:PAD + W] = np.array(T)
    tx = np.clip(np.floor(MX).astype(int) + PAD, 0, TA.shape[1] - 1); ty = np.clip(np.floor(MY).astype(int) + PAD, 0, TA.shape[0] - 1)
    tile = TA[ty, tx]
    rockT = tile == ROCK
    # ขอบหินธรรมชาติ (ไม่เป็นเหลี่ยมตามช่อง): เบลอ + นอยส์ แล้วตัด — ค่อนเข้าในช่องหิน (หินดูเล็กกว่าช่องชนเล็กน้อย ดีกว่าล้ำทางเดิน)
    nE = fbm(MX / 1.1, MY / 1.1, 5, 3) - 0.5
    fS = blur(rockT.astype(float), 0.4 * RES) + nE * 0.5 - 0.5      # สนามต่อเนื่อง (>0 = หิน) — ใช้เลื่อนจุดโคนผนังให้ขอบเรียบไม่เป็นขั้นตามกริด
    near = blur(rockT.astype(float), 0.12 * RES) > 0.1                  # ขอบนุ่มล้ำออกนอกช่องหินได้ไม่เกิน ~0.2 ม. (มุมเว้าไม่กินพื้นเดินได้)
    fS = np.where(near, fS, np.minimum(fS, -0.01)); rockS = fS > 0
    # ระยะจากขอบเหนือของแนวหินต่อเนื่องในคอลัมน์เดียวกัน (ทั้งแบบช่องและแบบขอบนุ่ม — ใช้ค่าที่น้อยกว่า)
    dnT = np.zeros(MX.shape); dnS = np.zeros(MX.shape)
    big = 99.0
    dnT[0] = np.where(rockT[0], big, 0); dnS[0] = np.where(rockS[0], big, 0)
    for iy in range(1, ny):
        dnT[iy] = np.where(rockT[iy], np.where(rockT[iy - 1], dnT[iy - 1] + 1 / RES, MY[iy] - np.floor(MY[iy])), 0)
        dnS[iy] = np.where(rockS[iy], np.where(rockS[iy - 1], dnS[iy - 1] + 1 / RES, 0), 0)
    # ระยะถึงพื้นทางใต้ (ใช้ทำชั้นหินลดหลั่นที่หน้าผาด้านใต้)
    dsS = np.zeros(MX.shape); dsS[-1] = np.where(rockS[-1], big, 0)
    for iy in range(ny - 2, -1, -1):
        dsS[iy] = np.where(rockS[iy], np.where(rockS[iy + 1], dsS[iy + 1] + 1 / RES, 0), 0)
    dn = np.minimum(dnS, dnT + 0.2)
    cap = 0.9 * dn / SH
    cap = np.where(rockT, cap, np.minimum(cap, 0.12))    # ส่วนขอบนุ่มที่ล้ำออกนอกช่องหิน: เตี้ยแค่ระดับพื้น
    cap = side_min(cap, 1.5, 1.2)                       # ขอบเหนือไม่เป็นขั้นบันไดตามคอลัมน์ช่อง
    # รูปทรง: ยอดผา 1.9–2.9 ม. แตกเป็นก้อน (Voronoi) มีรอยแยก • ก้อนตามขอบด้านใต้บางก้อนต่ำลงเป็นชั้น (หน้าผาแตกขั้น)
    Hm = 2.0 + 0.9 * fbm(MX / 9, MY / 9, 9, 3)
    F1, F2, cid = voronoi(MX, MY, 2.6, 3.0)
    crack = smooth(0.0, 0.28, F2 - F1)
    S = Hm + (cid - 0.5) * 0.7 - 0.32 * (1 - crack) + (fbm(MX / 3.2, MY / 3.2, 31, 4) - 0.5) * 0.5
    # ชั้นหินลดหลั่นที่หน้าผาด้านใต้: ระยะจากขอบใต้ (ds) + นอยส์ → ชั้นล่างเตี้ยลง (เห็นเป็นหน้าผา 2 ระดับ)
    e = dsS + (fbm(MX / 2.0, MY / 2.0, 41, 3) - 0.5) * 1.6 + (cid - 0.5) * 0.9
    ledge = smooth(0.55, 0.9, e)                        # 0 = ขอบล่าง (ชั้นเตี้ย) • 1 = ผาหลัก
    low = 0.55 + 0.6 * cid
    S = S * (ledge + (1 - ledge) * np.clip(low / np.maximum(S, 0.1), 0, 1))
    # ผิวบนเป็นชั้นหินแบนเล็กน้อย (ไม่เป็นเนินนุ่ม)
    t = np.maximum(S, 0) / 0.36; S = np.minimum(S, (np.floor(t) + smooth(0.5, 1.0, t - np.floor(t))) * 0.36)
    Hh = np.minimum(cap, S)
    mesh = rockS | (MX < 0) | (MX > W) | (MY < 0) | (MY > H)
    Hh = np.where(mesh, Hh, 0.0)
    Hh = side_min(Hh, 2.6, 1.4)                         # ผนังข้าง (ตะวันออก/ตก): ลาดชัน ~69° แทนผนังดิ่งที่หันข้าง (เห็นเป็นเส้นริ้ว)
    Hh = np.where(mesh, np.maximum(Hh, 0.0), 0.0)
    # ระยะถึงพื้นที่ใกล้ที่สุด (ประมาณจากหน้ากากเบลอ): ยอดหินกลางก้อนใหญ่มืดลง (เพดานถ้ำ) ขอบปากผาสว่าง
    inner = blur(mesh.astype(float), 1.3 * RES)
    # ขอบปากผา: จุดบนยอดที่ห่างไม่ถึง ~0.35 ม. มีพื้นต่ำลงไปมาก (หน้าผา) — ไม่นับด้านเหนือที่ลาดตามเส้นสายตา
    Hp = np.pad(Hh, 2); Hmin = Hh.copy()
    for oy in range(-2, 3):
        for ox in range(-2, 3):
            if ox * ox + oy * oy <= 5: Hmin = np.minimum(Hmin, Hp[2 + oy:2 + oy + ny, 2 + ox:2 + ox + nx])
    lip = smooth(0.55, 1.3, Hh - Hmin)
    return dict(W=W, H=H, xs=xs, ys=ys, MX=MX, MY=MY, H_=Hh, cap=cap, mesh=mesh, rockT=rockT, rockS=rockS, fS=fS, tile=tile, T=T, d=d, inner=inner, lip=lip, cid=cid)


def check(hf, extra=(), quiet=False):
    """จุดที่สูง > 0.2 ม. แล้วยื่นขึ้นไปทับช่องเดินได้เกินขอบนุ่ม 0.26 ช่อง (ต้องเป็น 0) • extra = [(mx, my, z)] จุดของผลึก"""
    import numpy as np
    W, H, T = hf['W'], hf['H'], np.array(hf['T'])
    MX, MY, Hh = hf['MX'], hf['MY'], hf['H_']
    sel = (Hh > 0.2) & (MX >= 0) & (MX < W) & (MY >= 0) & (MY < H + 0.5)
    px, py, pz = MX[sel], MY[sel], Hh[sel]
    if extra:
        e = np.array(extra); px, py, pz = np.concatenate([px, e[:, 0]]), np.concatenate([py, e[:, 1]]), np.concatenate([pz, e[:, 2]])
    yy = np.floor(py - SH * pz + 0.26).astype(int); xx = np.clip(np.floor(px).astype(int), 0, W - 1)
    ok = (yy >= 0) & (yy < H)
    walk = np.zeros(px.shape, bool)
    walk[ok] = ~np.isin(T[yy[ok], xx[ok]], list(SOLID))
    bad = np.argwhere(walk & (pz > 0.2))[:, 0]
    if not quiet: print(f'ตรวจภาพบังทางเดิน: {len(px)} จุด → ทับช่องเดินได้ {len(bad)} จุด', [(round(px[i], 2), round(py[i], 2), round(pz[i], 2)) for i in bad[:8]])
    return bad


def preview_png(hf, out):
    """ภาพ heightfield ดูเร็ว ๆ (ไม่ต้องใช้ Blender): ความสูง = ความสว่าง, ช่องเดินได้ = เขียว"""
    import numpy as np
    from PIL import Image
    Hh = hf['H_']; a = np.clip(Hh / 3.0, 0, 1)
    rgb = np.stack([a * 255, a * 255, a * 255], -1).astype(np.uint8)
    walk = ~np.isin(hf['tile'], list(SOLID)); rgb[walk & (Hh <= 0.01)] = (40, 90, 40)
    Image.fromarray(rgb).save(out); print('heightfield →', out)


# ---------------------------------------------------------------- ผลึกงอกจากผนัง (เลือกตำแหน่ง — ไม่ใช้ Blender)
def wall_crystals(hf, rnd):
    """จุดวางกอผลึก: โคนหน้าผาด้านใต้ (เอนออกหากล้อง) + บนขอบปากผา • ห่างกัน ≥ 2.6 ม. • คืน [(x, y, z0, lean_dir, size, kind)] พิกัดแมพ"""
    import numpy as np
    MX, MY, Hh, mesh = hf['MX'], hf['MY'], hf['H_'], hf['mesh']
    W, H = hf['W'], hf['H']
    Hn = Hh.copy()
    for k in range(1, 5): Hn[k:] = np.maximum(Hn[k:], Hh[:-k])   # สูงสุดในระยะ ~0.7 ม. ทางเหนือ (ขอบนุ่มที่โคนผนังเตี้ย)
    edge = mesh[:-1] & ~mesh[1:] & (Hn[:-1] > 1.2)       # ขอบใต้ของหิน (หินอยู่เหนือ พื้นอยู่ใต้) และสูงพอเป็นหน้าผา
    idx = [tuple(v) for v in np.argwhere(edge)]
    rnd.shuffle(idx)
    out = []
    for iy, ix in idx:
        x = float(MX[iy, ix])
        if not (2 < x < W - 2 and 3 < MY[iy, ix] < H - 2): continue
        j = next(j for j in range(iy, iy - 6, -1) if Hh[j, ix] > 0.6 or j == iy - 5)   # โคนหน้าผาจริง (ตัวอย่างแรกที่สูงพ้นขอบนุ่ม)
        y = float(MY[j, ix])
        if any(math.hypot(x - q[0], y - q[1]) < 2.4 for q in out): continue
        if rnd.random() > 0.4: continue
        if rnd.random() < 0.75:
            out.append((x, y + 0.04, 0.0, rnd.uniform(-0.5, 0.5), rnd.uniform(0.8, 1.35), 'base'))
        else:                                                  # บนขอบปากผา (ถอยเข้าไป 0.3–0.6 ม.)
            back = rnd.uniform(0.3, 0.6); jj = max(0, j - int(back * RES))
            out.append((x, y - back, float(Hh[jj, ix]) - 0.06, rnd.uniform(-0.6, 0.6), rnd.uniform(0.45, 0.75), 'lip'))
    return out


def crystal_shards(V, F, x, y, z, lean, size, rnd):
    """กอผลึก 4–7 แท่ง: แท่งหกเหลี่ยมยอดแหลม เอนออกทางใต้ (หากล้อง = เห็นเต็ม) • คืนจุดยอดทั้งหมด (พิกัดแมพ, z) ไว้ตรวจบังทาง"""
    pts = []
    n = rnd.randint(4, 7)
    for k in range(n):
        L = size * (1.0 if k == 0 else rnd.uniform(0.35, 0.8)); r = L * rnd.uniform(0.10, 0.15)
        a = lean + rnd.uniform(-0.9, 0.9)                      # ทิศเอนรอบทิศใต้
        tilt = rnd.uniform(0.15, 0.55) * (0.4 if k == 0 else 1)
        dx, dy, dz = math.sin(a) * math.sin(tilt), math.cos(a) * math.sin(tilt), math.cos(tilt)   # dy + = ใต้ (แมพ)
        bx, by = x + rnd.uniform(-0.18, 0.18) * size, y - 0.05 + rnd.uniform(-0.08, 0.04)
        # ฐานตั้งฉากกับแกนแท่ง
        ux, uy, uz = (1, 0, 0) if abs(dx) < 0.9 else (0, 1, 0)
        px_, py_, pz_ = dy * uz - dz * uy, dz * ux - dx * uz, dx * uy - dy * ux
        l = math.sqrt(px_ ** 2 + py_ ** 2 + pz_ ** 2); px_, py_, pz_ = px_ / l, py_ / l, pz_ / l
        qx, qy, qz = dy * pz_ - dz * py_, dz * px_ - dx * pz_, dx * py_ - dy * px_
        base = len(V); ph = rnd.random()
        for ring, (t, rr) in enumerate(((-0.15, r), (0.78, r * 0.92))):
            for i in range(6):
                an = (i + ph) * math.pi / 3
                ox, oy, oz = (px_ * math.cos(an) + qx * math.sin(an)) * rr, (py_ * math.cos(an) + qy * math.sin(an)) * rr, (pz_ * math.cos(an) + qz * math.sin(an)) * rr
                V.append((bx + dx * L * t + ox, by + dy * L * t + oy, z + dz * L * t + oz))
        tip = (bx + dx * L, by + dy * L, z + dz * L); V.append(tip); pts.append(tip)
        for i in range(6):
            j = (i + 1) % 6
            F.append((base + i, base + j, base + 6 + j, base + 6 + i))
            F.append((base + 6 + i, base + 6 + j, base + 12))
        F.append(tuple(base + 5 - i for i in range(6)))
        pts += [V[base + 6 + i] for i in range(6)]
    return pts


# ---------------------------------------------------------------- ฉาก Blender
def scene(th):
    import bpy
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    def sun(name, energy, col, rx, rz, angle, shadow=True):
        l = bpy.data.lights.new(name, 'SUN'); l.energy = energy; l.angle = math.radians(angle); l.color = col; l.use_shadow = shadow
        o = bpy.data.objects.new(name, l); sc.collection.objects.link(o); o.rotation_euler = (math.radians(rx), 0, math.radians(rz)); return o
    sun('key', 1.15, th['key'], 44, -135, 6)                  # ซ้ายบน → เงาตกขวาล่าง (เหมือนทั้งเกม) — ส่องยอด/ขอบปากผา
    sun('fill', 0.8, th['fill'], 40, -20, 25, False)        # เติมหน้า-ซ้าย ไม่มีเงา: หน้าผาที่หันหากล้องไม่ดำสนิท
    sun('rim', 0.45, th['crystal'], 70, 100, 10, False)       # ขอบรับแสงสีแร่จากขวา (ตามคู่มือสไตล์: rim สีตามแมพ ไม่ใช่ key)
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (*th['world'], 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.35
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
    try: sc.cycles.use_denoising = True
    except Exception: pass
    sc.cycles.max_bounces = 3; sc.cycles.diffuse_bounces = 2; sc.cycles.glossy_bounces = 1; sc.cycles.transmission_bounces = 1
    sc.view_settings.view_transform = 'Standard'          # ค่าสีตรงไปตรงมา (คุมค่าความสว่างยอด/หน้าผา/พื้นได้แม่น)
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    return sc


def materials(th):
    import bpy
    CAVE = bpy.data.images.load(os.path.join(ROOT, 'assets', 'ground_cave.webp'), check_existing=True)

    def L(nt, a, b): nt.links.new(a, b)

    def mix(nt, a, b, fac, mode='MIX'):
        m = nt.nodes.new('ShaderNodeMix'); m.data_type = 'RGBA'; m.blend_type = mode
        if isinstance(fac, float): m.inputs['Factor'].default_value = fac
        else: L(nt, fac, m.inputs['Factor'])
        for sock, v in ((m.inputs[6], a), (m.inputs[7], b)):
            if isinstance(v, tuple): sock.default_value = (*v, 1)
            else: L(nt, v, sock)
        return m.outputs[2]

    def rng(nt, src, a, b, c=0.0, d=1.0):
        r = nt.nodes.new('ShaderNodeMapRange'); r.inputs['From Min'].default_value = a; r.inputs['From Max'].default_value = b
        r.inputs['To Min'].default_value = c; r.inputs['To Max'].default_value = d; L(nt, src, r.inputs['Value']); return r.outputs['Result']

    # ---- หิน: ลาย ground_cave (ต่อเนื่องกับพื้นในเกม) ย้อมตามแมพ
    #   ยอด = มืด (เพดานถ้ำ มืดลงตามระยะเข้ากลางก้อน) • ขอบปากผา = สว่าง (attribute lip) • หน้าผา = ลายหินแนวตั้ง + ชั้นหิน + โคนมืด (AO)
    #   ผิวแตกเป็นแผ่นเหลี่ยม (normal เอียงทีละเซลล์ Voronoi) • แร่เรืองบางหย่อมบนหน้าผา
    m = bpy.data.materials.new('rock'); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (0.24,) * 3
    L(nt, tc.outputs['Object'], mp.inputs['Vector'])
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = CAVE; t.projection = 'BOX'; t.projection_blend = 0.3; L(nt, mp.outputs['Vector'], t.inputs['Vector'])
    hs = nt.nodes.new('ShaderNodeHueSaturation'); hs.inputs['Saturation'].default_value = 0.15; hs.inputs['Value'].default_value = 2.1
    L(nt, t.outputs['Color'], hs.inputs['Color'])
    base = mix(nt, hs.outputs['Color'], th['tint'], 1.0, 'MULTIPLY')
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.3; nz.inputs['Detail'].default_value = 4
    L(nt, tc.outputs['Object'], nz.inputs['Vector'])
    base = mix(nt, base, (0.6, 0.56, 0.58), nz.outputs['Fac'], 'OVERLAY')
    geo = nt.nodes.new('ShaderNodeNewGeometry'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); L(nt, geo.outputs['Normal'], sep.inputs[0])
    up = rng(nt, sep.outputs['Z'], 0.5, 0.8)                    # 1 = ผิวหงาย (ยอด) • 0 = หน้าผา
    at = nt.nodes.new('ShaderNodeAttribute'); at.attribute_name = 'edge'
    ac = nt.nodes.new('ShaderNodeSeparateColor'); L(nt, at.outputs['Color'], ac.inputs[0])   # R = ความทึบหน้ากากเบลอ (ลึกเข้ากลางก้อน) • G = ขอบปากผา
    # หน้าผา: ริ้วหินแนวตั้ง (นอยส์ยืดตามแกน z) × ชั้นหินแนวนอน × โคนมืด
    ps = nt.nodes.new('ShaderNodeSeparateXYZ'); L(nt, tc.outputs['Object'], ps.inputs[0])
    mp2 = nt.nodes.new('ShaderNodeMapping'); mp2.inputs['Scale'].default_value = (2.6, 2.6, 0.35); L(nt, tc.outputs['Object'], mp2.inputs['Vector'])
    st = nt.nodes.new('ShaderNodeTexNoise'); st.inputs['Scale'].default_value = 1.4; st.inputs['Detail'].default_value = 3; L(nt, mp2.outputs['Vector'], st.inputs['Vector'])
    streak = rng(nt, st.outputs['Fac'], 0.3, 0.7, 0.62, 1.18)
    wv = nt.nodes.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = 'Z'; wv.inputs['Scale'].default_value = 0.55
    wv.inputs['Distortion'].default_value = 4.0; wv.inputs['Detail'].default_value = 2.0; L(nt, tc.outputs['Object'], wv.inputs['Vector'])
    strata = rng(nt, wv.outputs['Fac'], 0.0, 1.0, 0.8, 1.1)
    face = mix(nt, base, streak, 1.0, 'MULTIPLY')
    face = mix(nt, face, strata, 1.0, 'MULTIPLY')
    face = mix(nt, face, rng(nt, ps.outputs['Z'], 0.0, 1.4, 0.45, 1.15), 1.0, 'MULTIPLY')   # โคนผนังมืด (AO) ขึ้นไปสว่าง
    # ยอด: มืด + มืดลงอีกตามระยะเข้ากลางก้อน • ขอบปากผาสว่างจัด
    top = mix(nt, base, th['top'], 1.0, 'MULTIPLY')
    top = mix(nt, top, rng(nt, ac.outputs['Red'], 0.62, 0.98, 1.0, 0.35), 1.0, 'MULTIPLY')
    top = mix(nt, top, mix(nt, base, (1.5, 1.45, 1.6), 1.0, 'MULTIPLY'), ac.outputs['Green'])
    col = mix(nt, face, top, up)
    L(nt, col, b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.86
    # แร่เรือง: เส้นบาง (ขอบเซลล์ Voronoi) เฉพาะบางหย่อม บนหน้าผา
    vo = nt.nodes.new('ShaderNodeTexVoronoi'); vo.feature = 'DISTANCE_TO_EDGE'; vo.inputs['Scale'].default_value = 2.2
    L(nt, tc.outputs['Object'], vo.inputs['Vector'])
    line = rng(nt, vo.outputs['Distance'], 0.0, 0.018, 1.0, 0.0)
    pz = nt.nodes.new('ShaderNodeTexNoise'); pz.inputs['Scale'].default_value = 0.22; pz.inputs['Detail'].default_value = 2
    L(nt, tc.outputs['Object'], pz.inputs['Vector'])
    patch = rng(nt, pz.outputs['Fac'], 0.66, 0.71)
    mm = nt.nodes.new('ShaderNodeMath'); mm.operation = 'MULTIPLY'; L(nt, line, mm.inputs[0]); L(nt, patch, mm.inputs[1])
    nf = rng(nt, up, 0.0, 0.5, 1.0, 0.0)
    mm2 = nt.nodes.new('ShaderNodeMath'); mm2.operation = 'MULTIPLY'; L(nt, mm.outputs[0], mm2.inputs[0]); L(nt, nf, mm2.inputs[1])
    mm3 = nt.nodes.new('ShaderNodeMath'); mm3.operation = 'MULTIPLY'; mm3.inputs[1].default_value = 1.4; L(nt, mm2.outputs[0], mm3.inputs[0])
    b.inputs['Emission Color'].default_value = (*th['vein'], 1); L(nt, mm3.outputs[0], b.inputs['Emission Strength'])
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.8; bp.inputs['Distance'].default_value = 0.06
    L(nt, t.outputs['Color'], bp.inputs['Height'])
    # แผ่นเหลี่ยม: เอียง normal ทีละเซลล์ Voronoi (หน้าผาเต็มที่ ยอดครึ่งเดียว — ยอดไม่ลายจุด)
    fv = nt.nodes.new('ShaderNodeTexVoronoi'); fv.inputs['Scale'].default_value = 2.0; L(nt, tc.outputs['Object'], fv.inputs['Vector'])
    v1 = nt.nodes.new('ShaderNodeVectorMath'); v1.operation = 'SUBTRACT'; v1.inputs[1].default_value = (0.5, 0.5, 0.5); L(nt, fv.outputs['Color'], v1.inputs[0])
    fs_ = rng(nt, up, 0.0, 1.0, 1.3, 0.5)
    v2 = nt.nodes.new('ShaderNodeVectorMath'); v2.operation = 'SCALE'; L(nt, v1.outputs[0], v2.inputs[0]); L(nt, fs_, v2.inputs['Scale'])
    v3 = nt.nodes.new('ShaderNodeVectorMath'); v3.operation = 'ADD'; L(nt, geo.outputs['Normal'], v3.inputs[0]); L(nt, v2.outputs[0], v3.inputs[1])
    v4 = nt.nodes.new('ShaderNodeVectorMath'); v4.operation = 'NORMALIZE'; L(nt, v3.outputs[0], v4.inputs[0])
    L(nt, v4.outputs[0], bp.inputs['Normal'])
    L(nt, bp.outputs['Normal'], b.inputs['Normal'])
    rock = m
    # ---- ผลึก: สีแร่ + เรืองแสง (ยอดสว่างกว่าโคน)
    c = bpy.data.materials.new('crystal'); c.use_nodes = True; nt = c.node_tree; b = nt.nodes['Principled BSDF']
    cc = th['crystal']
    b.inputs['Base Color'].default_value = (cc[0] * 0.45, cc[1] * 0.35, cc[2] * 0.6, 1); b.inputs['Roughness'].default_value = 0.18
    b.inputs['Emission Color'].default_value = (*cc, 1)
    tc = nt.nodes.new('ShaderNodeTexCoord'); g2 = nt.nodes.new('ShaderNodeNewGeometry'); s2 = nt.nodes.new('ShaderNodeSeparateXYZ')
    L(nt, g2.outputs['Position'], s2.inputs[0])
    fr = nt.nodes.new('ShaderNodeLayerWeight'); fr.inputs['Blend'].default_value = 0.35
    em = rng(nt, fr.outputs['Facing'], 0.0, 1.0, 0.5, 1.6)
    L(nt, em, b.inputs['Emission Strength'])
    cl = bpy.data.materials.new('clay'); cl.use_nodes = True; cl.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.5, 0.5, 0.5, 1)
    return {'rock': rock, 'crystal': c, 'clay': cl}


def mesh_obj(name, verts, faces, mat, coll):
    import bpy
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    o = bpy.data.objects.new(name, me); coll.objects.link(o); o.data.materials.append(mat)
    return o


def freestyle(sc, coll, thick):
    import bpy
    sc.render.use_freestyle = True; sc.render.line_thickness_mode = 'ABSOLUTE'; sc.render.line_thickness = thick
    vl = bpy.context.view_layer; vl.use_freestyle = True
    fs = vl.freestyle_settings; fs.crease_angle = math.radians(96)        # เฉพาะสันคมจริง (ปากผา/ชั้นหิน) — ไม่ขีดตามนอยส์ผิวหิน
    ls = fs.linesets[0] if fs.linesets else fs.linesets.new('ink')
    ls.select_by_visibility = True; ls.select_by_collection = True; ls.collection = coll
    ls.select_silhouette = True; ls.select_border = False; ls.select_crease = True
    if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new('ink')
    ls.linestyle.color = (0.06, 0.03, 0.07); ls.linestyle.thickness = thick; ls.linestyle.alpha = 0.9


def camera(sc, ortho, rx, ry):
    import bpy
    from mathutils import Vector
    th = math.acos(K)
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = ortho; cam.sensor_fit = 'HORIZONTAL'; cam.clip_end = 600
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
    co.rotation_euler = (th, 0, 0)
    d = Vector((0, math.sin(th), -math.cos(th)))
    co.location = -d * 200
    sc.render.resolution_x = rx; sc.render.resolution_y = ry; sc.render.resolution_percentage = 100
    return co


def build(m, samples, out, preview=False, ss=1.0, crop=None):
    import bpy, numpy as np
    th = THEMES[m]
    hf = heightfield(m); W, H = hf['W'], hf['H']; d = hf['d']
    CX, CY = W / 2, H / 2
    bm = lambda x, y, z=0.0: (x - CX, CY - y, z)
    sc = scene(th); M = materials(th); rnd = random.Random(2025 + len(m))
    ink = bpy.data.collections.new('ink'); sc.collection.children.link(ink)
    # ---------- หิน (heightfield) ----------
    xs, ys, Hh, mesh = hf['xs'], hf['ys'], hf['H_'], hf['mesh']
    ny, nx = Hh.shape
    MX, MY = np.meshgrid(xs - CX, CY - ys)
    verts = np.stack([MX.ravel(), MY.ravel(), Hh.ravel()], 1)
    # โคนผนัง: จุดนอกหน้ากากที่ติดจุดในหน้ากาก เลื่อนเข้าหาจุดตัดศูนย์ของสนาม fS (ขอบหินเรียบ ไม่เป็นขั้นบันไดตามกริด)
    fS = hf['fS']; V3 = verts.reshape(ny, nx, 3); best = np.zeros((ny, nx)); tgt = np.zeros((ny, nx, 2))
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
        nb_in = np.zeros((ny, nx), bool); nb_f = np.zeros((ny, nx))
        sl_d = (slice(max(0, -dy), ny - max(0, dy)), slice(max(0, -dx), nx - max(0, dx)))
        sl_s = (slice(max(0, dy), ny - max(0, -dy)), slice(max(0, dx), nx - max(0, -dx)))
        nb_in[sl_d] = mesh[sl_s]; nb_f[sl_d] = fS[sl_s]
        t = np.clip(-fS / np.maximum(nb_f - fS, 1e-6), 0, 0.92)
        upd = nb_in & ~mesh & (nb_f > best)
        best = np.where(upd, nb_f, best)
        off = np.stack([dx * t / RES, -dy * t / RES], -1)              # แกน y ของ Blender กลับด้าน
        tgt = np.where(upd[..., None], off, tgt)
    V3[..., 0] += tgt[..., 0]; V3[..., 1] += tgt[..., 1]; verts = V3.reshape(-1, 3)
    q = mesh[:-1, :-1] | mesh[:-1, 1:] | mesh[1:, :-1] | mesh[1:, 1:]
    jj, ii = np.nonzero(q); a0 = jj * nx + ii
    faces = np.stack([a0, a0 + nx, a0 + nx + 1, a0 + 1], 1)          # ทวนเข็มเมื่อมองจากบน (แถวถัดไป = y ของ Blender ลดลง) → normal ชี้ขึ้น
    used = np.unique(faces); remap = np.full(nx * ny, -1); remap[used] = np.arange(len(used))
    me = bpy.data.meshes.new('rock'); me.vertices.add(len(used)); me.vertices.foreach_set('co', verts[used].astype(np.float32).ravel())
    fr = remap[faces]
    me.loops.add(fr.size); me.loops.foreach_set('vertex_index', fr.astype(np.int32).ravel())
    me.polygons.add(len(fr)); me.polygons.foreach_set('loop_start', (np.arange(len(fr)) * 4).astype(np.int32))
    me.update(); me.validate()
    ca = me.color_attributes.new('edge', 'FLOAT_COLOR', 'POINT')
    e = hf['inner'].ravel()[used]; lp = hf['lip'].ravel()[used]
    ca.data.foreach_set('color', np.stack([e, lp, np.zeros_like(e), np.ones_like(e)], 1).astype(np.float32).ravel())
    ro = bpy.data.objects.new('rock', me); ink.objects.link(ro); me.materials.append(M['clay'] if CLAY else M['rock'])
    print('rock mesh', len(used), 'verts', len(fr), 'faces')
    # ---------- ผลึกงอกจากผนัง + แสงของมัน ----------
    V, F = [], []; extra = []; nlit = 0
    cc = th['crystal']
    def light(x, y, z, col, energy, radius=0.15):
        l = bpy.data.lights.new('pt', 'POINT'); l.energy = energy; l.color = col; l.shadow_soft_size = radius; l.use_shadow = False
        o = bpy.data.objects.new('pt', l); sc.collection.objects.link(o); o.location = bm(x, y, z)
    for (x, y, z0, lean, size, kind) in wall_crystals(hf, rnd):
        V2, F2 = [], []
        pts = crystal_shards(V2, F2, x, y, z0, lean, size, rnd)
        if len(check({**hf, 'H_': np.zeros((1, 1)), 'MX': np.zeros((1, 1)), 'MY': np.zeros((1, 1))}, [(px, py, pz) for px, py, pz in pts], quiet=True)):
            continue
        base = len(V); V += [bm(px, py, pz) for px, py, pz in V2]; F += [tuple(i + base for i in f) for f in F2]
        extra += pts
        light(x, y + 0.35, z0 + size * 0.45, cc, 34 * size + 8); nlit += 1
    co = mesh_obj('crystals', V, F, M['crystal'], ink)
    for p in co.data.polygons: p.use_smooth = False
    # แสงเรืองจากผลึกบนพื้น (สไปรต์ในเกม — อบเฉพาะแสงที่ตกบนผนังรอบ ๆ)
    for (x, y) in d['crystals']:
        light(x, y, 0.45, cc, 26); nlit += 1
    for (x, y, z, col, energy, _n) in th['lights']:
        light(x, y, z, col, energy, 0.6)
    print('ผลึกบนผนัง', nlit - len(d['crystals']), 'แสงผลึกบนพื้น', len(d['crystals']))
    bad = check(hf, extra)
    # ---------- พื้น = shadow catcher (โปร่ง เหลือแต่เงา/AO โคนผนัง) ----------
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, -0.004)); pl = bpy.context.active_object
    pl.scale = (W + 2 * PAD, H + 2 * PAD, 1); pl.is_shadow_catcher = True
    # ---------- กล้อง/เรนเดอร์ ----------
    s = 0.5 if preview else ss
    camera(sc, W, round(W * PX * s), round(H * PX * K * s))
    freestyle(sc, ink, max(0.7, 1.2 * s))
    sc.cycles.samples = samples; sc.view_settings.exposure = 0.0
    if crop:                                                # เรนเดอร์ทดสอบเฉพาะกรอบ (ช่อง x0,y0,x1,y1) ที่ความละเอียดจริง
        x0, y0, x1, y1 = crop; r = sc.render; r.use_border = True; r.use_crop_to_border = True
        r.border_min_x, r.border_max_x = x0 / W, x1 / W; r.border_min_y, r.border_max_y = 1 - y1 / H, 1 - y0 / H
    sc.render.filepath = out
    bpy.ops.render.render(write_still=True)
    print('เรนเดอร์ →', out, 'บังทาง', len(bad))


# ---------------------------------------------------------------- ติดตั้ง
def install(m, src):
    from PIL import Image, ImageEnhance
    from slice_sheet import manifest
    d, _ = load_tiles(m); W, H = d['w'], d['h']
    im = Image.open(src).convert('RGBA').resize((W * PX, H * PX), Image.LANCZOS)
    a = im.getchannel('A'); rgb = ImageEnhance.Contrast(ImageEnhance.Color(im.convert('RGB')).enhance(1.15)).enhance(1.05)
    im = Image.merge('RGBA', (*rgb.split(), a))
    key = f'bake_{m}_walls'
    dst = os.path.join(ROOT, 'assets', key + '.webp'); im.save(dst, 'WEBP', quality=84, method=6)
    print('ติดตั้ง →', dst, im.size, os.path.getsize(dst) // 1024, 'KB')
    manifest()
    js = os.path.join(ROOT, 'js', 'maps.js'); s = open(js, encoding='utf-8').read()
    mt = re.search(r'^const CAVE_BAKE = (\{.*\}); // tools/cave3d\.py --install$', s, flags=re.M)
    meta = json.loads(mt.group(1)) if mt else {}
    meta[m] = {'img': key, 'hash': d['hash']}
    line = 'const CAVE_BAKE = ' + json.dumps(meta, separators=(',', ':')) + '; // tools/cave3d.py --install'
    s2, n = re.subn(r'^const CAVE_BAKE = .*$', lambda _: line, s, flags=re.M)
    if n: open(js, 'w', encoding='utf-8').write(s2); print('อัปเดต js/maps.js CAVE_BAKE')
    else: print('ไม่พบบรรทัด CAVE_BAKE ใน js/maps.js — ใส่เอง:\n' + line)


if __name__ == '__main__':
    a = sys.argv
    arg = lambda k, dflt: a[a.index(k) + 1] if k in a else dflt
    M = arg('--map', 'helcave')
    if '--extract' in a: extract(M)
    elif '--check' in a:
        hf = heightfield(M); check(hf); preview_png(hf, arg('--out', f'/tmp/cave3d_{M}_hf.png'))
    elif '--install' in a: install(M, a[a.index('--install') + 1])
    else: build(M, int(arg('--samples', 20)), arg('--out', f'/tmp/cave3d_{M}.png'), '--preview' in a, float(arg('--ss', 1.0)),
               [float(v) for v in arg('--crop', '').split(',')] if '--crop' in a else None)
