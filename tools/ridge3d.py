"""สันหิน + ซุ้มปากถ้ำ Wolfwood (ทางลง Hel's Hollow) — โมเดลด้วย bpy แล้วอบเป็นภาพ 2D (docs/RENDER3D_PLAN.md ข้อ #3)

ผลลัพธ์ 2 ภาพ:
  A  assets/bake_wolfwood_ridge.webp  แถบพื้นแถวล่าง (แถว Y0..104 × กว้างทั้งแมพ) — วาดลงผ้าใบพื้นแทน caveWalls (maps.js renderGround)
     พื้นหญ้า/ถนนเป็น shadow catcher (โปร่งใส มีแต่เงา) → พื้นที่วาดด้วยโค้ดยังเห็นต่อเนื่อง ภาพทึบเฉพาะหิน/ราก/เฟิร์น
  B  assets/bake_wolfwood_gate.webp   ซุ้มหินสลักรูน + ม่านมืดในช่องประตู ตรงวาร์ปใต้ (34,102) — สไปรต์ตั้งตรงเรียงความลึก (Sprites.drawRidgeGate)

กฎมุมกล้อง (R.K = 0.76 → เอียง 40.5° จากแนวดิ่ง): จุดสูง h ม. ปรากฏเหนือขึ้น 0.855h ช่องในภาพพื้น
→ ความสูงหินทุกจุด ≤ 0.9 × (ระยะถึงช่องที่ไม่ใช่หินทางเหนือในคอลัมน์เดียวกัน) / 0.855  = ด้านเหนือลาด ≤ ~46° ไม่บังพื้นเดินได้เลย
   ด้านใต้ (หันหากล้อง) ตั้งดิ่งได้ • ตรวจด้วย check() ต้องได้ 0 จุด
ผังช่องดึงจากเกมจริง (Playwright: new GameMap('wolfwood',{lite:true})) → tools/ridge3d_tiles.json + hash (เกมเทียบ hash ก่อนใช้ภาพ)
แสง: ซ้ายบน (sun z = -135° → เงาตกขวาล่าง) + rim แสงจันทร์ฟ้าจากขวา (SKY.wolfwood) • เส้นขอบ Freestyle + เพิ่มความอิ่มสีตอนติดตั้ง

ใช้:
  python3 tools/ridge3d.py --extract                                  (ต้องมี node + playwright)
  /tmp/bvenv/bin/python tools/ridge3d.py --ground [--samples 24] [--preview] [--out /tmp/ridge.png]
  /tmp/bvenv/bin/python tools/ridge3d.py --gate   [--samples 48] [--out /tmp/gate.png]
  python3 tools/ridge3d.py --install /tmp/ridge.png /tmp/gate.png     (ยืด ×1/0.76, ตัดขอบ, บันทึก webp, manifest, เขียน RIDGE_BAKE ใน js/maps.js)
"""
import math, os, sys, json, random, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TILES = os.path.join(ROOT, 'tools', 'ridge3d_tiles.json')
K = 0.76; PX = 40; SH = 0.855               # SH = ยื่นขึ้นเหนือกี่ช่องต่อความสูง 1 ม. ในภาพพื้น (sin/cos มุมกล้อง)
MAPW, MAPH = 68, 104
Y0 = 92                                      # แถวบนสุดของแถบอบ (หินเริ่มแถว 94)
CX, CY = 34.0, (Y0 + MAPH) / 2               # จุดแมพที่เป็น (0,0) ใน Blender • แกน y ของ Blender ชี้เหนือ (= -y ของแมพ)
GATE = (34.5, 102.6)                         # กลางฐานซุ้ม (วาร์ปใต้อยู่ช่อง 34,102)
GATE_FRONT = 103.0                           # y ที่ใช้เรียงความลึก = จุดยึดภาพ (ขอบหน้าเสา)
GPX = 80                                     # สไปรต์ซุ้ม: พิกเซลต่อเมตรของไฟล์ (เกมวาด ×0.5)
GW, GBELOW, GABOVE = 7.4, 0.5, 4.4           # กรอบภาพซุ้ม (ม. ในระนาบภาพ): กว้าง, ใต้จุดยึด, เหนือจุดยึด
ROCK = 8
SOLID = {1, 2, 5, 8, 9, 10}


def fnv(rows):
    h = 0x811c9dc5
    for row in rows:
        for v in row:
            h ^= v; h = (h * 0x01000193) & 0xffffffff
    return h


# ---------------------------------------------------------------- ดึงผังช่องจากเกม
def extract():
    import threading, subprocess, tempfile, http.server, functools
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    js = """const { chromium } = require('playwright');
(async () => { const o = { headless: true }; if (require('fs').existsSync('/opt/pw-browsers/chromium')) o.executablePath = '/opt/pw-browsers/chromium';
  const b = await chromium.launch(o), p = await b.newPage(); await p.goto(process.argv[2]);
  await p.waitForFunction(() => typeof GameMap !== 'undefined');
  const r = await p.evaluate(() => { const m = new GameMap('wolfwood', { lite: true }); return { w: m.w, h: m.h, tiles: Array.from(m.tiles), portals: m.portals }; });
  console.log(JSON.stringify(r)); await b.close(); })();"""
    f = os.path.join(tempfile.gettempdir(), 'ridge3d_extract.js'); open(f, 'w').write(js)
    env = dict(os.environ); env.setdefault('NODE_PATH', subprocess.check_output(['npm', 'root', '-g'], text=True).strip())
    out = subprocess.check_output(['node', f, f'http://127.0.0.1:{srv.server_address[1]}/index.html'], env=env, text=True)
    srv.shutdown()
    r = json.loads(out.strip().splitlines()[-1]); w, h = r['w'], r['h']
    assert (w, h) == (MAPW, MAPH), (w, h)
    rows = [r['tiles'][y * w:(y + 1) * w] for y in range(h)]
    data = {'map': 'wolfwood', 'w': w, 'h': h, 'y0': Y0, 'rows': {str(y): ''.join('0123456789AB'[v] for v in rows[y]) for y in range(Y0 - 4, h)},
            'hash': fnv(rows[Y0:]), 'portals': r['portals']}
    json.dump(data, open(TILES, 'w'), indent=0)
    print('ผังช่อง →', TILES, 'hash', data['hash'])


def load_tiles():
    d = json.load(open(TILES))
    T = {int(y): [int(c, 16) for c in s] for y, s in d['rows'].items()}
    return d, T


# ---------------------------------------------------------------- heightfield (numpy)
RES = 8                                       # ตัวอย่างต่อเมตร
XA, XB, YA, YB = -2.0, 70.0, float(Y0), 110.0  # ขยายเกินขอบแมพ (ซ้าย/ขวา/ใต้) กันขอบหินโหว่ในภาพ


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
    """min ตามแนวนอน (แกน x): a(x) ≤ a(x') + k·|x - x'| ภายในระยะ reach ม. — ลดลงอย่างเดียว"""
    import numpy as np
    out = a.copy(); n = int(reach * RES)
    for o in range(1, n + 1):
        for sh in (o, -o):
            r = np.roll(a, sh, axis=1)
            if sh > 0: r[:, :sh] = a[:, :sh]
            else: r[:, sh:] = a[:, sh:]
            out = np.minimum(out, r + k * o / RES)
    return out


def heightfield():
    import numpy as np
    d, T = load_tiles()
    nx, ny = int((XB - XA) * RES) + 1, int((YB - YA) * RES) + 1
    xs = XA + np.arange(nx) / RES; ys = YA + np.arange(ny) / RES
    MX, MY = np.meshgrid(xs, ys)                         # [iy, ix]
    tx = np.clip(np.floor(MX).astype(int), 0, MAPW - 1); ty = np.floor(MY).astype(int)
    tile = np.zeros_like(tx)
    for iy in range(ny):
        y = int(ty[iy, 0])
        tile[iy] = ROCK if y >= MAPH else np.array(T[y])[tx[iy]]
    rockT = tile == ROCK
    gx, gy = MX - GATE[0], MY - GATE[1]
    # ขอบหินธรรมชาติ (ไม่เป็นเหลี่ยมตามช่อง): เบลอ + นอยส์ แล้วตัดที่ 0.5
    rockS = (blur(rockT.astype(float), 0.5 * RES) + (fbm(MX / 1.3, MY / 1.3, 5, 3) - 0.5) * 0.55) > 0.5
    # ระยะจากขอบเหนือของแนวหินต่อเนื่องในคอลัมน์เดียวกัน (ทั้งแบบช่องและแบบขอบนุ่ม — ใช้ค่าที่น้อยกว่า)
    dnT = np.zeros(MX.shape); dnS = np.zeros(MX.shape)
    for iy in range(1, ny):
        dnT[iy] = np.where(rockT[iy], np.where(rockT[iy - 1], dnT[iy - 1] + 1 / RES, MY[iy] - np.floor(MY[iy])), 0)
        dnS[iy] = np.where(rockS[iy], np.where(rockS[iy - 1], dnS[iy - 1] + 1 / RES, 0), 0)
    dnT[0] = 0; dnS[0] = 0
    dn = np.minimum(dnS, dnT + 0.25)                    # ขอบนุ่มยื่นเกินขอบช่องได้ ≤0.25 ม. (เหมือนขอบนุ่มของ caveWalls) — ไม่เป็นขั้นบันไดตามช่อง
    cap = 0.9 * dn / SH
    cap = np.where(rockT, cap, np.minimum(cap, 0.15))    # ส่วนขอบนุ่มที่ล้ำออกนอกช่องหิน: เตี้ยแค่ระดับพื้น
    cap = side_min(cap, 1.4, 1.2)                       # ขอบเหนือไม่เป็นขั้นบันไดตามคอลัมน์ช่อง (ลดลงอย่างเดียว = ยังปลอดภัย)
    # รูปทรง: ยอดสัน 2.6–3.9 ม. แตกเป็นก้อน (Voronoi) มีรอยแยก + ชั้นหิน (ขั้นนุ่ม)
    Hm = 2.7 + 1.3 * fbm(MX / 11, MX * 0 + 3.3, 9, 3)
    sp = 3.4; cx0, cy0 = np.floor(MX / sp), np.floor(MY / sp)
    F1 = np.full(MX.shape, 9.0); F2 = np.full(MX.shape, 9.0); cid = np.zeros(MX.shape)
    for ox in (-1, 0, 1):
        for oy in (-1, 0, 1):
            ci, cj = cx0 + ox, cy0 + oy
            jx = vnoise(ci * 7.13, cj * 3.71, 21) * 0 + (np.sin(ci * 12.9898 + cj * 78.233) * 43758.5453) % 1
            jy = (np.sin(ci * 39.346 + cj * 11.135) * 24634.6345) % 1
            dd = np.hypot((ci + 0.15 + 0.7 * jx) * sp - MX, (cj + 0.15 + 0.7 * jy) * sp - MY)
            idv = (np.sin(ci * 3.1 + cj * 17.7) * 9631.7) % 1
            closer = dd < F1
            F2 = np.where(closer, F1, np.minimum(F2, dd)); cid = np.where(closer, idv, cid); F1 = np.where(closer, dd, F1)
    crack = smooth(0.0, 0.32, F2 - F1)
    # ชั้นหินลดหลั่นลงทางใต้ (หน้าผาแต่ละชั้นหันหากล้อง = เห็นชัด) ขอบชั้นหยักด้วยนอยส์
    e = dn + (fbm(MX / 2.2, MY / 2.2, 41, 3) - 0.5) * 1.4 + (cid - 0.5) * 0.8
    ws = 1.5 + 0.6 * fbm(MX / 6, MX * 0 + 7.7, 17, 2)
    u = (e - 3.2) / ws; steps = np.maximum(0, np.floor(u) + 1 + smooth(0.72, 1.0, u - np.floor(u)) * (u > -1))
    S = np.maximum(0.9 + 0.4 * cid, Hm - steps * (0.5 + 0.2 * cid))
    S = S + (cid - 0.5) * 0.35 - 0.18 * (1 - crack) + (fbm(MX / 4, MY / 4, 31, 4) - 0.5) * 0.45
    t = np.maximum(S, 0) / 0.42; S = np.minimum(S, (np.floor(t) + smooth(0.55, 1.0, t - np.floor(t))) * 0.42)
    H = np.minimum(cap, S)
    # รอบซุ้ม: ลานหินเตี้ย (เสาซุ้มยืนบนลานนี้ ไม่จมในสันหิน) + ทางลงมืดเป็นขั้นบันไดด้านใต้ซุ้ม
    w = smooth(4.1, 3.3, np.abs(gx)) * smooth(-2.0, -1.0, gy)
    H = H * (1 - w) + np.minimum(H, 0.12) * w
    pit = (np.abs(gx) < 1.75) & (gy > 0.55)
    depth = np.minimum(2.6, (gy - 0.55) * 1.6); depth = np.floor(depth / 0.26) * 0.26 + 0.05
    H = np.where(pit, -depth, H)
    mesh = rockS | pit | (MY >= MAPH)
    H = np.where(mesh, H, 0.0)
    H = side_min(H, 2.4, 1.6)                           # ผนังข้างถนน/รอยแยก: ลาดชัน ~67° แทนผนังดิ่งที่หันข้าง (มองเห็นเป็นเส้นริ้ว)
    H = np.where(mesh & ~pit, np.maximum(H, 0.0), H); H = np.where(mesh, H, 0.0)
    return dict(xs=xs, ys=ys, MX=MX, MY=MY, H=H, cap=cap, mesh=mesh, rockT=rockT, rockS=rockS, tile=tile, gx=gx, gy=gy, T=T, pit=pit)


def check(hf, extra=()):
    """จุดที่สูง > 0.2 ม. แล้วยื่นขึ้นไปทับช่องเดินได้เกินขอบนุ่ม 0.26 ช่อง (ต้องเป็น 0) • extra = [(mx, my, z)] จุดของราก/เฟิร์น"""
    import numpy as np
    T = hf['T']; bad = []
    def walk(x, y):
        x = min(MAPW - 1, max(0, int(math.floor(x)))); y = int(math.floor(y))
        return y < MAPH and y in T and T[y][x] not in SOLID
    MX, MY, H = hf['MX'], hf['MY'], hf['H']
    idx = np.argwhere((H > 0.2) & (MX >= 0) & (MX < MAPW))
    pts = [(MX[i, j], MY[i, j], H[i, j]) for i, j in idx] + list(extra)
    for x, y, z in pts:
        if z <= 0.2: continue
        if walk(x, y - SH * z + 0.26): bad.append((round(x, 2), round(y, 2), round(z, 2)))
    print(f'ตรวจภาพบังทางเดิน: {len(pts)} จุด → ทับช่องเดินได้ {len(bad)} จุด', bad[:8])
    return bad


# ---------------------------------------------------------------- ฉาก Blender
def common_scene():
    import bpy
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 3.4; sun.angle = math.radians(4); sun.color = (1.0, 0.95, 0.86)
    so = bpy.data.objects.new('sun', sun); sc.collection.objects.link(so)
    so.rotation_euler = (math.radians(44), 0, math.radians(-135))     # ซ้ายบน → เงาตกขวาล่าง (เหมือนทั้งเกม)
    rim = bpy.data.lights.new('moon', 'SUN'); rim.energy = 1.5; rim.angle = math.radians(8); rim.color = (0.55, 0.70, 1.0)
    ro = bpy.data.objects.new('moon', rim); sc.collection.objects.link(ro)
    ro.rotation_euler = (math.radians(66), 0, math.radians(100))       # แสงจันทร์ฟ้าจากขวา (SKY.wolfwood from:'right')
    fill = bpy.data.lights.new('fill', 'SUN'); fill.energy = 0.7; fill.angle = math.radians(20); fill.color = (1.0, 0.92, 0.82)
    fo = bpy.data.objects.new('fill', fill); sc.collection.objects.link(fo); fill.use_shadow = False
    fo.rotation_euler = (math.radians(60), 0, math.radians(-30))      # เติมแสงอ่อนจากหน้า-ซ้าย (หน้าผาที่หันหากล้องไม่ดำสนิท) ไม่มีเงา
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.42, 0.50, 0.68, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
    try: sc.cycles.use_denoising = True
    except Exception: pass
    sc.cycles.max_bounces = 4
    try: sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Punchy'
    except Exception: sc.view_settings.view_transform = 'Filmic'
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    return sc


def materials():
    import bpy
    def img(name):
        return bpy.data.images.load(os.path.join(ROOT, 'assets', name), check_existing=True)
    CAVE, GRASS = img('ground_cave.webp'), img('ground_grass.webp')

    def new(name):
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
        return m, nt, nt.nodes['Principled BSDF']

    def L(nt, a, b): nt.links.new(a, b)

    def boxtex(nt, im, scale, blend=0.3):
        tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (scale,) * 3
        L(nt, tc.outputs['Object'], mp.inputs['Vector'])
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = im; t.projection = 'BOX'; t.projection_blend = blend
        L(nt, mp.outputs['Vector'], t.inputs['Vector']); return t, tc

    def mix(nt, a, b, fac, mode='MIX'):
        m = nt.nodes.new('ShaderNodeMix'); m.data_type = 'RGBA'; m.blend_type = mode
        if isinstance(fac, float): m.inputs['Factor'].default_value = fac
        else: L(nt, fac, m.inputs['Factor'])
        for sock, v in ((m.inputs[6], a), (m.inputs[7], b)):
            if isinstance(v, tuple): sock.default_value = (*v, 1)
            else: L(nt, v, sock)
        return m.outputs[2]

    def rock(name, tint, moss_amt, sat=0.22, val=1.35, scale=0.2, dark_depth=True):
        m, nt, b = new(name)
        t, tc = boxtex(nt, CAVE, scale)
        hs = nt.nodes.new('ShaderNodeHueSaturation'); hs.inputs['Saturation'].default_value = sat; hs.inputs['Value'].default_value = val
        L(nt, t.outputs['Color'], hs.inputs['Color'])
        base = mix(nt, hs.outputs['Color'], tint, 1.0, 'MULTIPLY')
        # สีไม่สม่ำเสมอ (คราบ/หินอุ่น-เย็น)
        nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.35; nz.inputs['Detail'].default_value = 4
        L(nt, tc.outputs['Object'], nz.inputs['Vector'])
        base = mix(nt, base, (0.62, 0.55, 0.50), nz.outputs['Fac'], 'OVERLAY')
        # มอสบนผิวที่หงายขึ้น
        g, _ = boxtex(nt, GRASS, 0.33)
        gh = nt.nodes.new('ShaderNodeHueSaturation'); gh.inputs['Hue'].default_value = 0.47; gh.inputs['Saturation'].default_value = 0.62; gh.inputs['Value'].default_value = 0.8
        L(nt, g.outputs['Color'], gh.inputs['Color'])
        moss = mix(nt, gh.outputs['Color'], (0.55, 0.62, 0.42), 1.0, 'MULTIPLY')
        geo = nt.nodes.new('ShaderNodeNewGeometry'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); L(nt, geo.outputs['Normal'], sep.inputs[0])
        mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.62; mr.inputs['From Max'].default_value = 0.92
        L(nt, sep.outputs['Z'], mr.inputs['Value'])
        mn = nt.nodes.new('ShaderNodeTexNoise'); mn.inputs['Scale'].default_value = 0.9; mn.inputs['Detail'].default_value = 6
        L(nt, tc.outputs['Object'], mn.inputs['Vector'])
        mr2 = nt.nodes.new('ShaderNodeMapRange'); mr2.inputs['From Min'].default_value = 0.62 - moss_amt * 0.3; mr2.inputs['From Max'].default_value = 0.70 - moss_amt * 0.3
        L(nt, mn.outputs['Fac'], mr2.inputs['Value'])
        mm = nt.nodes.new('ShaderNodeMath'); mm.operation = 'MULTIPLY'; L(nt, mr.outputs['Result'], mm.inputs[0]); L(nt, mr2.outputs['Result'], mm.inputs[1])
        col = mix(nt, base, moss, mm.outputs['Value'])
        # ผนังชัน (หน้าผา) มืดลงเล็กน้อย + ทางลงมืดตามความลึก
        st = nt.nodes.new('ShaderNodeMapRange'); st.inputs['From Min'].default_value = 0.2; st.inputs['From Max'].default_value = 0.8
        st.inputs['To Min'].default_value = 0.86; st.inputs['To Max'].default_value = 1.0; L(nt, sep.outputs['Z'], st.inputs['Value'])
        col = mix(nt, col, st.outputs['Result'], 1.0, 'MULTIPLY')
        if dark_depth:
            ps = nt.nodes.new('ShaderNodeSeparateXYZ'); L(nt, tc.outputs['Object'], ps.inputs[0])
            dz = nt.nodes.new('ShaderNodeMapRange'); dz.inputs['From Min'].default_value = -1.6; dz.inputs['From Max'].default_value = 0.0
            dz.inputs['To Min'].default_value = 0.02; dz.inputs['To Max'].default_value = 1.0; L(nt, ps.outputs['Z'], dz.inputs['Value'])
            col = mix(nt, col, dz.outputs['Result'], 1.0, 'MULTIPLY')
            # ลึก ๆ มีแสงม่วงจาง (ถ้ำของ Hel)
            gl = nt.nodes.new('ShaderNodeMapRange'); gl.inputs['From Min'].default_value = -0.6; gl.inputs['From Max'].default_value = -2.6
            L(nt, ps.outputs['Z'], gl.inputs['Value'])
            L(nt, gl.outputs['Result'], b.inputs['Emission Strength']); b.inputs['Emission Color'].default_value = (0.45, 0.18, 0.85, 1)
        L(nt, col, b.inputs['Base Color'])
        b.inputs['Roughness'].default_value = 0.92
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.45; bp.inputs['Distance'].default_value = 0.05
        L(nt, t.outputs['Color'], bp.inputs['Height']); L(nt, bp.outputs['Normal'], b.inputs['Normal'])
        return m

    def flat(name, c0, c1, scale=4.0, rough=0.8):
        m, nt, b = new(name)
        tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = 5
        L(nt, tc.outputs['Object'], nz.inputs['Vector'])
        r = nt.nodes.new('ShaderNodeValToRGB'); r.color_ramp.elements[0].color = (*c0, 1); r.color_ramp.elements[1].color = (*c1, 1)
        L(nt, nz.outputs['Fac'], r.inputs['Fac']); L(nt, r.outputs['Color'], b.inputs['Base Color'])
        b.inputs['Roughness'].default_value = rough
        return m

    def emit(name, col, strength):
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
        nt.nodes.remove(nt.nodes['Principled BSDF'])
        e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*col, 1); e.inputs['Strength'].default_value = strength
        L(nt, e.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
        return m

    def void():
        """ม่านมืดในช่องประตู: ดำลึกที่ขอบ ม่วงจางลึก ๆ ตรงกลาง + วงซ้อนให้ดูเหมือนอุโมงค์"""
        m = bpy.data.materials.new('void'); m.use_nodes = True; nt = m.node_tree
        nt.nodes.remove(nt.nodes['Principled BSDF'])
        tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
        mp.inputs['Location'].default_value = (0, 0, -1.75 / 2.9); mp.inputs['Scale'].default_value = (1 / 1.95, 1, 1 / 2.9)
        L(nt, tc.outputs['Object'], mp.inputs['Vector'])
        ln = nt.nodes.new('ShaderNodeVectorMath'); ln.operation = 'LENGTH'; L(nt, mp.outputs['Vector'], ln.inputs[0])
        r = nt.nodes.new('ShaderNodeValToRGB'); el = r.color_ramp.elements
        el[0].position = 0.0; el[0].color = (0.36, 0.14, 0.66, 1); el[1].position = 1.0; el[1].color = (0.004, 0.002, 0.008, 1)
        e2 = el.new(0.18); e2.color = (0.10, 0.035, 0.20, 1); e3 = el.new(0.5); e3.color = (0.02, 0.008, 0.04, 1)
        L(nt, ln.outputs['Value'], r.inputs['Fac'])
        # วงซี่หินของอุโมงค์ (ถี่ขึ้นเมื่อลึกเข้าไป = มีมิติ)
        a1 = nt.nodes.new('ShaderNodeMath'); a1.operation = 'ADD'; a1.inputs[1].default_value = 0.12; L(nt, ln.outputs['Value'], a1.inputs[0])
        a2 = nt.nodes.new('ShaderNodeMath'); a2.operation = 'DIVIDE'; a2.inputs[0].default_value = 5.0; L(nt, a1.outputs[0], a2.inputs[1])
        a3 = nt.nodes.new('ShaderNodeMath'); a3.operation = 'SINE'; L(nt, a2.outputs[0], a3.inputs[0])
        a4 = nt.nodes.new('ShaderNodeMapRange'); a4.inputs['From Min'].default_value = -1; a4.inputs['To Min'].default_value = 0.78; L(nt, a3.outputs[0], a4.inputs['Value'])
        rc = mix(nt, r.outputs['Color'], a4.outputs['Result'], 1.0, 'MULTIPLY')
        e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Strength'].default_value = 0.75; L(nt, rc, e.inputs['Color'])
        L(nt, e.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
        return m

    return {
        'rock': rock('rock', (0.80, 0.72, 0.62), 0.55),
        'stone': rock('stone', (0.80, 0.78, 0.72), 0.5, sat=0.10, val=1.3, scale=0.45, dark_depth=False),
        'root': flat('root', (0.13, 0.08, 0.05), (0.30, 0.19, 0.10), 6.0),
        'fern': flat('fern', (0.07, 0.20, 0.05), (0.22, 0.42, 0.10), 3.0, 0.65),
        'rune': emit('rune', (0.70, 0.42, 1.0), 4.0),
        'void': void(),
        'catch': bpy.data.materials.new('catch'),
    }


def mesh_obj(name, verts, faces, mat, coll=None, smooth=False):
    import bpy
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    o = bpy.data.objects.new(name, me); (coll or bpy.context.scene.collection).objects.link(o)
    o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth = smooth
    return o


def fern(V, F, x, y, z, R, rnd, hmax=0.35):
    """เฟิร์น 1 กอ: ใบโค้งตก 6–9 ใบ ใบย่อยหยักซ้าย-ขวา"""
    n = rnd.randint(6, 9); a0 = rnd.random() * 6.28
    for k in range(n):
        a = a0 + k * 6.28 / n + rnd.uniform(-0.25, 0.25); L = R * rnd.uniform(0.75, 1.1)
        dx, dy = math.cos(a), math.sin(a); px, py = -dy, dx
        seg = 12; base = len(V)
        for i in range(seg + 1):
            t = i / seg
            cx, cy = x + dx * L * t, y + dy * L * t
            cz = z + hmax * (R / 0.5) * math.sin(math.pi * t * 0.85) * (1 - 0.35 * t) + 0.01
            wdt = L * 0.17 * math.sin(math.pi * min(1, t * 1.05)) ** 0.8 * (1.0 if i % 2 else 0.45)
            V += [(cx + px * wdt, cy + py * wdt, cz + 0.02 * wdt), (cx, cy, cz + 0.03 * wdt), (cx - px * wdt, cy - py * wdt, cz + 0.02 * wdt)]
        for i in range(seg):
            b = base + i * 3
            F += [(b, b + 3, b + 4, b + 1), (b + 1, b + 4, b + 5, b + 2)]


def lump(V, F, x, y, z, r, rnd, squash=0.6):
    """ก้อนหินเล็ก (icosphere บิดด้วยนอยส์)"""
    import bmesh
    from mathutils import noise, Vector
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=r)
    base = len(V); idx = {}
    for i, v in enumerate(bm.verts):
        p = v.co; k = 1 + 0.25 * noise.noise(Vector((p.x * 3 + x, p.y * 3 + y, p.z * 3)))
        V.append((x + p.x * k, y + p.y * k * rnd.uniform(0.85, 1.15), z + max(-0.02, p.z * k * squash))); idx[v.index] = base + i
    for f in bm.faces: F.append(tuple(idx[v.index] for v in f.verts))
    bm.free()


def root_curve(name, paths, mat, coll=None):
    import bpy
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 1.0; cu.bevel_resolution = 2; cu.use_fill_caps = True
    for pts in paths:
        sp = cu.splines.new('NURBS'); sp.points.add(len(pts) - 1); sp.use_endpoint_u = True; sp.order_u = 3
        for i, (x, y, z, r) in enumerate(pts): sp.points[i].co = (x, y, z, 1); sp.points[i].radius = r
    o = bpy.data.objects.new(name, cu); (coll or bpy.context.scene.collection).objects.link(o); o.data.materials.append(mat)
    return o


# ---------------------------------------------------------------- ซุ้มประตู (พิกัดท้องถิ่น: กลางฐาน = (0,0,0), -y = ใต้ = หากล้อง)
RUNES = {  # อักษรรูนเอลเดอร์ฟูธาร์ก (เส้นในกรอบ 1×1, z ขึ้น)
    'h': [((0, 0), (0, 1)), ((1, 0), (1, 1)), ((0, 0.62), (1, 0.38))],
    'e': [((0, 0), (0, 1)), ((1, 0), (1, 1)), ((0, 1), (0.5, 0.62)), ((0.5, 0.62), (1, 1))],
    'l': [((0.2, 0), (0.2, 1)), ((0.2, 1), (0.9, 0.68))],
    'n': [((0.5, 0), (0.5, 1)), ((0.1, 0.66), (0.9, 0.36))],
    'o': [((0.5, 1), (0.95, 0.62)), ((0.5, 1), (0.05, 0.62)), ((0.95, 0.62), (0.05, 0)), ((0.05, 0.62), (0.95, 0))],
    't': [((0.5, 0), (0.5, 1)), ((0.5, 1), (0.05, 0.62)), ((0.5, 1), (0.95, 0.62))],
    'd': [((0, 0), (0, 1)), ((1, 0), (1, 1)), ((0, 1), (1, 0)), ((0, 0), (1, 1))],
    'th': [((0.2, 0), (0.2, 1)), ((0.2, 0.78), (0.8, 0.5)), ((0.8, 0.5), (0.2, 0.22))],
    'yr': [((0.5, 0), (0.5, 1)), ((0.5, 0.4), (0.05, 0)), ((0.5, 0.4), (0.95, 0))],  # algiz กลับหัว — รูนแห่งความตาย (Hel)
}
AI, BI, AO, BO, ZS = 1.85, 0.85, 2.85, 1.5, 3.05   # วงโค้งใน/นอก (ครึ่งกว้าง, สูง) และความสูงจุดเริ่มโค้ง


def build_gate(M, ox, oy, coll, rnd):
    import bmesh
    from mathutils import noise, Vector, Matrix
    V, F = [], []

    def block(x0, x1, y0, y1, z0, z1, cuts=3, amp=0.03, taper=1.0):
        bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=cuts, use_grid_fill=True)
        base = len(V); idx = {}
        for i, v in enumerate(bm.verts):
            u = v.co
            tz = 1 - (1 - taper) * (u.z + 0.5)
            x = (x0 + x1) / 2 + u.x * (x1 - x0) * tz; y = (y0 + y1) / 2 + u.y * (y1 - y0) * tz; z = (z0 + z1) / 2 + u.z * (z1 - z0)
            n = noise.noise(Vector((x * 2.7 + 11, y * 2.7, z * 2.7))) * amp
            V.append((x + n * (1 if u.x > 0 else -1) * (abs(u.x) > 0.49), y + n * (1 if u.y > 0 else -1) * (abs(u.y) > 0.49), z + n * 0.5 * (abs(u.z) > 0.49)))
            idx[v.index] = base + i
        for f in bm.faces: F.append(tuple(idx[v.index] for v in f.verts))
        bm.free()

    for s in (-1, 1):
        xa, xb = sorted((s * 1.70, s * 3.00)); block(xa, xb, -0.55, 0.55, 0.0, 0.24, 2, 0.02)          # ฐาน
        xa, xb = sorted((s * 1.90, s * 2.80)); block(xa, xb, -0.40, 0.40, 0.2, 2.82, 5, 0.035, 0.94)  # เสา
        xa, xb = sorted((s * 1.76, s * 2.96)); block(xa, xb, -0.50, 0.50, 2.78, 3.07, 2, 0.02)        # หัวเสา
    # วงโค้ง 9 ก้อน (ก้อนกลาง = หินหลักสูงกว่า)
    n = 9
    for k in range(n):
        a0 = math.pi * k / n + 0.012; a1 = math.pi * (k + 1) / n - 0.012
        key = k == n // 2; bo = BO + (0.28 if key else 0); ao = AO + (0.06 if key else 0)
        ring = []
        for a in (a0, (a0 + a1) / 2, a1):
            ring.append(((AI * math.cos(a), ZS + BI * math.sin(a)), (ao * math.cos(a), ZS + bo * math.sin(a))))
        base = len(V)
        for (pi_, po) in ring:
            for y in (-0.44, 0.44):
                V.append((pi_[0], y, pi_[1])); V.append((po[0], y, po[1]))
        # ดัชนี: ring j, y index yi, inner/outer io → base + j*4 + yi*2 + io
        q = lambda j, yi, io: base + j * 4 + yi * 2 + io
        for j in range(2):
            F += [(q(j, 0, 0), q(j + 1, 0, 0), q(j + 1, 0, 1), q(j, 0, 1)),   # หน้า (ใต้)
                  (q(j, 1, 1), q(j + 1, 1, 1), q(j + 1, 1, 0), q(j, 1, 0)),   # หลัง
                  (q(j, 0, 1), q(j + 1, 0, 1), q(j + 1, 1, 1), q(j, 1, 1)),   # ผิวนอก
                  (q(j, 1, 0), q(j + 1, 1, 0), q(j + 1, 0, 0), q(j, 0, 0))]   # ผิวใน
        F += [(q(0, 0, 0), q(0, 0, 1), q(0, 1, 1), q(0, 1, 0)), (q(2, 1, 0), q(2, 1, 1), q(2, 0, 1), q(2, 0, 0))]
    # เศษหินรอบฐาน
    for s in (-1, 1):
        for i in range(4):
            lump(V, F, s * rnd.uniform(1.6, 3.4), rnd.uniform(-0.9, 0.5), 0.0, rnd.uniform(0.12, 0.26), rnd)
    st = mesh_obj('gate', [(x + ox, y + oy, z) for x, y, z in V], F, M['stone'], coll)
    # รูนเรืองแสงบนหน้าเสา (2 ด้าน) + รูน Hel บนหินหลัก
    RV, RF = [], []

    def glyph(gl, cx, cz, w, h, y, wd=0.05):
        for (a, b) in RUNES[gl]:
            x0, z0 = cx + (a[0] - 0.5) * w, cz + (a[1] - 0.5) * h; x1, z1 = cx + (b[0] - 0.5) * w, cz + (b[1] - 0.5) * h
            L = math.hypot(x1 - x0, z1 - z0) + wd; ang = math.atan2(z1 - z0, x1 - x0)
            ux, uz = math.cos(ang), math.sin(ang); vx, vz = -uz, ux; mx, mz = (x0 + x1) / 2, (z0 + z1) / 2
            base = len(RV)
            for (su, sv) in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                RV.append((mx + ux * su * L / 2 + vx * sv * wd / 2, y, mz + uz * su * L / 2 + vz * sv * wd / 2))
            RF.append((base, base + 1, base + 2, base + 3))
    for s, word in ((-1, ['h', 'e', 'l', 'th']), (1, ['n', 'o', 't', 'd'])):
        for i, gl in enumerate(word):
            for y in (-0.405 - 0.01, 0.405 + 0.01):
                glyph(gl, s * 2.35, 2.35 - i * 0.56, 0.30, 0.40, y)
    kz = ZS + (BI + BO + 0.28) / 2
    for y in (-0.455, 0.455): glyph('yr', 0, kz + 0.05, 0.34, 0.44, y, 0.06)
    ru = mesh_obj('runes', [(x + ox, y + oy, z) for x, y, z in RV], RF, M['rune'], coll)
    # ม่านมืดในช่องประตู
    pts = [(-AI, 0.0)] + [(AI * math.cos(math.pi - a * math.pi / 24), ZS + BI * math.sin(math.pi - a * math.pi / 24)) for a in range(25)] + [(AI, 0.0)]
    vo = mesh_obj('void', [(x + ox, 0.05 + oy, z) for x, z in pts], [tuple(range(len(pts)))], M['void'], coll)
    vo.location = (0, 0, 0)
    # รากห้อยจากยอดซุ้ม + เฟิร์นที่โคนเสา
    paths = []
    for i in range(8):
        a = math.pi * rnd.uniform(0.1, 0.9); x = (AO + 0.1) * math.cos(a) * rnd.uniform(0.82, 0.98); z = ZS + BO * math.sin(a) * 0.98 + 0.05
        L = rnd.uniform(0.9, 2.1) * (0.6 if abs(x) < 1.2 else 1); r = rnd.uniform(0.012, 0.022); ph = rnd.random() * 6; p = [(x + ox, 0.25 + oy, z + 0.03, r * 1.2), (x + ox, -0.3 + oy, z + 0.05, r)]
        for j in range(1, 10):
            t = j / 9; p.append((x + ox + math.sin(t * 5 + ph) * 0.14 * t, -0.5 + oy - 0.06 * t, z - t * L, r * (1 - 0.75 * t)))
        paths.append(p)
    rt = root_curve('gate_roots', paths, M['root'], coll)
    FV, FF = [], []
    for s in (-1, 1):
        for i in range(2): fern(FV, FF, s * rnd.uniform(1.6, 3.2) + ox, rnd.uniform(-0.9, -0.5) + oy, 0.0, rnd.uniform(0.35, 0.5), rnd)
    fe = mesh_obj('gate_ferns', FV, FF, M['fern'], coll)
    return [st, ru, vo, rt, fe]


def freestyle(sc, coll, thick):
    import bpy
    sc.render.use_freestyle = True; sc.render.line_thickness_mode = 'ABSOLUTE'; sc.render.line_thickness = thick
    vl = bpy.context.view_layer; vl.use_freestyle = True
    fs = vl.freestyle_settings; fs.crease_angle = math.radians(118)
    ls = fs.linesets[0] if fs.linesets else fs.linesets.new('ink')
    ls.select_by_visibility = True; ls.select_by_collection = True; ls.collection = coll
    ls.select_silhouette = True; ls.select_border = True; ls.select_crease = True
    if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new('ink')
    ls.linestyle.color = (0.08, 0.05, 0.04); ls.linestyle.thickness = thick; ls.linestyle.alpha = 0.85


def camera(sc, center, ortho, rx, ry):
    import bpy
    from mathutils import Vector
    th = math.acos(K)
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = ortho; cam.sensor_fit = 'HORIZONTAL'; cam.clip_end = 400
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
    co.rotation_euler = (th, 0, 0)
    d = Vector((0, math.sin(th), -math.cos(th)))
    co.location = Vector(center) - d * 120
    sc.render.resolution_x = rx; sc.render.resolution_y = ry; sc.render.resolution_percentage = 100
    return co


def b(mx, my): return (mx - CX, CY - my)


def build_ground(samples, out, preview=False):
    import bpy, numpy as np
    hf = heightfield()
    sc = common_scene(); M = materials(); rnd = random.Random(404)
    ink = bpy.data.collections.new('ink'); sc.collection.children.link(ink)
    xs, ys, H, mesh = hf['xs'], hf['ys'], hf['H'], hf['mesh']
    ny, nx = H.shape
    verts = [(xs[i] - CX, CY - ys[j], float(H[j, i])) for j in range(ny) for i in range(nx)]
    faces = []
    m = mesh
    for j in range(ny - 1):
        row = m[j, :-1] | m[j, 1:] | m[j + 1, :-1] | m[j + 1, 1:]
        for i in np.nonzero(row)[0]:
            a = j * nx + i; faces.append((a, a + nx, a + nx + 1, a + 1))
    mesh_obj('ridge', verts, faces, M['rock'], ink)
    print('ridge mesh', len(verts), 'verts', len(faces), 'faces')

    def Hat(x, y):
        i = int((x - XA) * RES); j = int((y - YA) * RES)
        if 0 <= i < nx and 0 <= j < ny: return float(H[j, i]), bool(mesh[j, i]), float(hf['cap'][j, i])
        return 0.0, False, 0.0
    extra = []; T = hf['T']
    def safe(x, y, z):   # ราก/เฟิร์นต้องผ่านกฎเดียวกับ check()
        yy = int(math.floor(y - SH * z + 0.26)); xx = min(MAPW - 1, max(0, int(math.floor(x))))
        return z <= 0.2 or not (yy < MAPH and yy in T and T[yy][xx] not in SOLID)
    # ---------- รากไม้จากป่าเลื้อยข้ามสันหิน ----------
    paths = []
    cols = [x for x in range(1, MAPW - 1) if not (31 <= x <= 38)]
    for k in range(34):
        x = rnd.choice(cols) + rnd.random()
        y0 = next((y for y in range(Y0, MAPH) if T[y][int(x)] == ROCK), None)
        if y0 is None or T[y0 - 1][int(x)] not in (0, 6): continue
        y = y0 - rnd.uniform(0.0, 0.25); r0 = rnd.uniform(0.045, 0.085); L = rnd.uniform(2.5, 6.5); p = []; dx = rnd.uniform(-0.25, 0.25)
        n = int(L / 0.2)
        for i in range(n):
            t = i / n; h, inm, _ = Hat(x, y)
            if abs(x - GATE[0]) < 4.2 and y > GATE[1] - 2.2: break
            r = r0 * (1 - 0.75 * t); z = max(0.0, h) + r * 0.55
            if not safe(x, y, z + r): break
            p.append((x - CX, CY - y, z, r)); extra.append((x, y, z + r))
            dx = max(-0.5, min(0.5, dx + rnd.uniform(-0.12, 0.12))); x += dx * 0.2; y += 0.2
            if i == n // 3 and rnd.random() < 0.6:   # กิ่งราก
                q = []; bx, by, bdx = x, y, -dx + rnd.choice((-0.4, 0.4))
                for jj in range(int(n * 0.4)):
                    hb, _, _ = Hat(bx, by); rr = r * 0.6 * (1 - jj / (n * 0.4)); zb = max(0.0, hb) + rr * 0.55
                    if not safe(bx, by, zb + rr): break
                    q.append((bx - CX, CY - by, zb, rr)); extra.append((bx, by, zb + rr)); bx += bdx * 0.2; by += 0.18
                if len(q) > 3: paths.append(q)
        if len(p) > 3: paths.append(p)
    root_curve('roots', paths, M['root'], ink)
    # ---------- เฟิร์น: บนยอดสัน + ตีนสัน (เตี้ย ≤0.3 ม. บนหญ้า) ----------
    FV, FF = [], []; nf = 0
    for k in range(4000):
        x, y = rnd.uniform(0.5, MAPW - 0.5), rnd.uniform(Y0 + 1, MAPH + 1.5)
        if abs(x - GATE[0]) < 4.4 and y > GATE[1] - 2.0: continue
        h, inm, cap = Hat(x, y)
        tx, ty = int(x), int(y)
        if inm and h > 0.25 and cap - h > 0.7 and rnd.random() < 0.045:
            R = rnd.uniform(0.4, 0.7); fern(FV, FF, x - CX, CY - y, h, R, rnd); extra.append((x, y, h + 0.35 * R / 0.5)); nf += 1
        elif ty < MAPH and T[ty][tx] in (0, 6) and any(T.get(ty + dd, [0] * MAPW)[tx] == ROCK for dd in (1,)) and rnd.random() < 0.35:
            R = rnd.uniform(0.28, 0.42); fern(FV, FF, x - CX, CY - y, 0.0, R, rnd, 0.24); nf += 1
    mesh_obj('ferns', FV, FF, M['fern'])
    print('ferns', nf, 'roots', len(paths))
    bad = check(hf, extra)
    # ---------- ซุ้ม (เงาอย่างเดียว — ตัวซุ้มเป็นสไปรต์แยก) ----------
    gx, gy = b(*GATE)
    for o in build_gate(M, gx, gy, sc.collection, random.Random(7)):
        o.visible_camera = False
    # ---------- พื้น = shadow catcher (โปร่ง เหลือแต่เงา) ----------
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, -0.004)); pl = bpy.context.active_object
    pl.scale = (90, 40, 1); pl.is_shadow_catcher = True
    # ---------- กล้อง/เรนเดอร์ ----------
    ss = 1 if preview else 2
    camera(sc, (0, 0, 0), MAPW, MAPW * PX * ss, round((MAPH - Y0) * PX * K * ss))
    freestyle(sc, ink, 1.0 * ss)
    sc.cycles.samples = samples; sc.view_settings.exposure = 0.1
    sc.render.filepath = out
    bpy.ops.render.render(write_still=True)
    print('เรนเดอร์ →', out, 'บังทาง', len(bad))


def gate_anchor_px(ss):
    """จุดยึด (ขอบหน้าเสากลางซุ้ม บนพื้น) ในภาพเรนเดอร์ซุ้ม (พิกเซล)"""
    ppm = GPX * ss; return GW * ppm / 2, (GABOVE + 0.0) * ppm


def build_gate_sprite(samples, out):
    import bpy
    from mathutils import Vector
    sc = common_scene(); M = materials()
    ink = bpy.data.collections.new('ink'); sc.collection.children.link(ink)
    objs = build_gate(M, 0, 0, ink, random.Random(7))
    bpy.data.collections['ink'].objects.unlink(objs[-1]); sc.collection.objects.link(objs[-1])   # เฟิร์นไม่มีเส้นขอบ
    for o in objs:
        if o.name.startswith('void'): ink.objects.unlink(o); sc.collection.objects.link(o)
    ss = 2; th = math.acos(K)
    d = Vector((0, math.sin(th), -math.cos(th))); u = Vector((0, math.cos(th), math.sin(th)))
    fy = -(GATE_FRONT - GATE[1])                    # จุดยึดในพิกัดท้องถิ่น (ใต้ = -y)
    anchor = Vector((0, fy, 0))
    hgt = GABOVE + GBELOW
    co = camera(sc, (0, 0, 0), GW, round(GW * GPX * ss), round(hgt * GPX * ss))
    co.location = anchor + u * (hgt / 2 - GBELOW) - d * 60
    freestyle(sc, ink, 1.3 * ss)
    sc.cycles.samples = samples; sc.view_settings.exposure = 0.25
    sc.render.filepath = out
    bpy.ops.render.render(write_still=True)
    from bpy_extras.object_utils import world_to_camera_view
    p = world_to_camera_view(sc, co, anchor)
    print('เรนเดอร์ →', out, 'anchor px', p.x * sc.render.resolution_x, (1 - p.y) * sc.render.resolution_y, 'คาด', gate_anchor_px(ss))


# ---------------------------------------------------------------- ติดตั้ง
def install(ground, gate):
    from PIL import Image, ImageEnhance
    sys.path.insert(0, os.path.join(ROOT, 'tools'))
    d, _ = load_tiles()

    def boost(im, sat, con=1.06):
        a = im.getchannel('A'); rgb = im.convert('RGB')
        rgb = ImageEnhance.Contrast(ImageEnhance.Color(rgb).enhance(sat)).enhance(con)
        return Image.merge('RGBA', (*rgb.split(), a))
    im = Image.open(ground).convert('RGBA').resize((MAPW * PX, (MAPH - Y0) * PX), Image.LANCZOS)
    im = boost(im, 1.18)
    dst = os.path.join(ROOT, 'assets', 'bake_wolfwood_ridge.webp'); im.save(dst, 'WEBP', quality=86, method=6)
    print('ติดตั้ง →', dst, im.size)
    g = Image.open(gate).convert('RGBA'); ss = g.width / (GW * GPX)
    g = g.resize((round(g.width / ss), round(g.height / ss)), Image.LANCZOS); g = boost(g, 1.2)
    l, t, r, bb = g.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox()
    l, t, r, bb = max(0, l - 2), max(0, t - 2), min(g.width, r + 2), min(g.height, bb + 2)
    g = g.crop((l, t, r, bb))
    ax, ay = gate_anchor_px(1); ax -= l; ay -= t
    dst2 = os.path.join(ROOT, 'assets', 'bake_wolfwood_gate.webp'); g.save(dst2, 'WEBP', quality=90, method=6)
    print('ติดตั้ง →', dst2, g.size, 'anchor', ax, ay)
    from slice_sheet import manifest
    manifest()
    meta = {'wolfwood': {'img': 'bake_wolfwood_ridge', 'y0': Y0, 'hash': d['hash'],
                         'gate': {'img': 'bake_wolfwood_gate', 'x': GATE[0], 'y': GATE_FRONT, 'ax': round(ax, 1), 'ay': round(ay, 1), 's': PX / GPX,
                                  'light': [GATE[0], round(GATE[1] - 0.2, 2), 3.4, '175,120,255'],
                                  'open': [AI, ZS, BI, round(GATE_FRONT - GATE[1] + 0.05, 2)]}}}  # ช่องประตู: ครึ่งกว้าง, สูงจุดเริ่มโค้ง, สูงโค้ง, ระยะจากจุดยึดถึงระนาบม่าน (ม.)
    js = os.path.join(ROOT, 'js', 'maps.js'); src = open(js, encoding='utf-8').read()
    line = 'const RIDGE_BAKE = ' + json.dumps(meta, separators=(',', ':')) + '; // tools/ridge3d.py --install'
    src2, n = re.subn(r'^const RIDGE_BAKE = .*$', lambda _: line, src, flags=re.M)
    if n: open(js, 'w', encoding='utf-8').write(src2); print('อัปเดต js/maps.js RIDGE_BAKE')
    else: print('ไม่พบบรรทัด RIDGE_BAKE ใน js/maps.js — ใส่เอง:\n' + line)


if __name__ == '__main__':
    a = sys.argv
    arg = lambda k, dflt: a[a.index(k) + 1] if k in a else dflt
    if '--extract' in a: extract()
    elif '--check' in a: check(heightfield())
    elif '--install' in a: install(a[a.index('--install') + 1], a[a.index('--install') + 2])
    elif '--gate' in a: build_gate_sprite(int(arg('--samples', 48)), arg('--out', '/tmp/gate.png'))
    else: build_ground(int(arg('--samples', 24)), arg('--out', '/tmp/ridge.png'), '--preview' in a)
