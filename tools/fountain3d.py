"""น้ำพุคริสตัลกลางเมือง Neo Eldheim แบบมีเฟรมน้ำไหล — โมเดลด้วย bpy แล้วอบเป็นภาพ 2D (docs/RENDER3D_PLAN.md ข้อ #11)

แทน "ขอบสระซ้อนสองชั้น" เดิม (สระวาดโค้ด TownArt.basin R 2.85 ช่อง + ภาพวาด prop_fountain กว้าง 3.9 ช่องวางทับกลางสระ)
  A (อบลงพื้น)  ขอบสระหินอ่อนชั้นนอก (สูง 0.34 ม. → ยื่นขึ้นเหนือ ≤0.3 ช่อง) + ผิวน้ำสระนอก + พื้นสระวงรูน
                + เงาของแกนน้ำพุ/เสาคริสตัลบนน้ำและลาน (พื้นลาน = shadow catcher โปร่ง เหลือแต่เงา)
                → assets/bake_fountain_basin.webp วาดลงผ้าใบพื้นแทน TownArt.basin (js/bake.js Bake.ground)
  B (12 เฟรม)  ชั้นกลาง + ชั้นใน + แกนหินอ่อนในปลอกน้ำไหล + เกลียวทอง + ถ้วยทอง + คริสตัลหมุน + ม่านน้ำ 3 ชั้น + ฟองกระเซ็น
                → assets/bake_fountain.webp ชีต 4×3 เฟรม (Bake.draw วาดเฟรมตามเวลา) เรียงความลึกที่กลางน้ำพุ
                น้ำวนเป็นลูปเนียน: นอยส์ 4 มิติที่แกน z/W วิ่งเป็นวงกลมตามเฟส (cos/sin) → เฟรม 12 ต่อเฟรม 1 พอดี
                (ม่านน้ำ: ลายเลื่อนลงตามแกน z เป็นคาบ • ผิวน้ำ: วงคลื่นกระจายออก sin(r/λ − เฟส) • คริสตัลหกเหลี่ยมหมุน 60°/ลูป)
  B (เสาคริสตัล) เสาหินอ่อนฝังคริสตัลบนขอบสระ 4 ทิศ — ภาพเดียวใช้ 4 จุด เรียงความลึกของใครของมัน (ผู้เล่นเดินหน้า/หลังได้ถูก)
การชน: ไม่เปลี่ยน (ช่อง T.FOUNTAIN เดิมรัศมี 2.6 = 5×5 ตัดมุม) • ขอบสระนอก r 2.6 = ตรงขอบช่องชนแนวแกน
       เสาคริสตัลอยู่บนช่องชน (แนวแกน r 2.4) ไม่ใช่มุมทแยง (ช่องมุม 18,18 ฯลฯ เดินได้)
กล้อง = กล้องเกม (ออร์โธ เอียง acos(0.76) จากแนวดิ่ง yaw 0) • A 80 px/ม. → ติดตั้ง 40 px/ม. ยืด ×1/0.76 • B 160 px/ม. → 80 px/ม. (เกมวาด ×0.5)
แสง: ชุดเมืองของ tools/gate3d.py (sun ซ้ายบน z = -135° → เงาตกขวาล่าง + fill อุ่น + ฟ้า) • เส้นขอบ Freestyle น้ำตาลเข้ม
     สไตล์กลางชั่วคราว (เหมือนงานอบชิ้นอื่น): Freestyle + เพิ่มความอิ่มสีตอนติดตั้ง — รอเจ้าของเลือกระดับ toon
hash = ผังช่องในกรอบ HASH_RECT (เกมเทียบใน js/bake.js Bake.data) — ผังเปลี่ยน = เกมกลับไปใช้สระโค้ด + ภาพวาดเดิม + console.warn ครั้งเดียว

ใช้:
  python3 tools/fountain3d.py --extract                                   (ต้องมี node + playwright) → tools/fountain3d_tiles.json
  /tmp/bvenv/bin/python tools/fountain3d.py --render [--samples 32] [--out /tmp/fountain3d] [--only basin,pylon,frames] [--frames 0,6] [--preview]
  python3 tools/fountain3d.py --install /tmp/fountain3d                  (→ assets/bake_fountain*.webp + js/bake_data_eldheim.js + manifest)
"""
import math, os, sys, json, random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
TILES = os.path.join(ROOT, 'tools', 'fountain3d_tiles.json')
MAP_ID = 'eldheim'
K = 0.76; TH = math.acos(K); SN = math.sin(TH)
PX = 40                        # TILE
RES_A = 80                     # ภาพพื้นเรนเดอร์ 2× → ติดตั้ง 1× (40 px/ม.)
RES_B = 160                    # สไปรต์เรนเดอร์ 2× ของไฟล์ (80 px/ม.) — เกมวาด ×0.5
STORE_B = 80
FX, FY = 20.5, 20.5            # กลางน้ำพุ (map.fountain) = (0,0,0) ใน Blender (+Y = เหนือ)
HASH_RECT = [16, 16, 25, 25]   # x0, y0, x1, y1 (ไม่รวม x1/y1) — สระ + ลานรอบ
A_RECT = (17.3, 17.2, 24.4, 24.4)   # กรอบภาพพื้น (พิกัดแมพ) — เผื่อขอบเหนือที่ยื่นขึ้น + เงาแกนน้ำพุที่ตกขวาล่าง
NF = 12; COLS = 4; FPS = 10    # เฟรมน้ำ: 12 เฟรม ลูป 1.2 วิ • ชีต 4 คอลัมน์ × 3 แถว
# ขนาด (ม.) — ชั้นนอก (A) / ชั้นกลาง / ชั้นใน (B)
RIM_I, RIM_O, RIM_Z = 2.2, 2.6, 0.34
PLINTH = 2.7
WATER_Z, FLOOR_Z = 0.2, -0.25
MID_I, MID_O, MID_Z, MID_W = 1.5, 1.72, 0.56, 0.47
IN_I, IN_O, IN_Z, IN_W = 0.82, 1.0, 0.98, 0.9
CORE_R, CUP_Z = 0.27, 3.1
SPIRAL_R, SPIRAL_Z = 0.56, (0.98, 3.12)
CRYSTAL = (3.3, 4.55, 0.25)   # z ล่าง, z บน, รัศมี
PYLON_R = 2.4                  # เสาคริสตัลบนขอบสระ (แนวแกน — อยู่บนช่องชน)
PYLON_DIRS = {'n': (0, 1), 'w': (-1, 0), 'e': (1, 0), 's': (0, -1)}
PYLON_FRONT = 0.1              # จุดยึด/จุดเรียงความลึกของเสา = กลางเสา + 0.1 ช่องลงใต้
GLOW = (0.30, 0.82, 1.0)       # #5fd4ff ของ TownArt


def fnv_rect(tiles, w, rect):
    """hash ผังช่องในกรอบ (ค่าชนิดช่องตรง ๆ) — ตรงกับ Bake.data() ใน js/bake.js (d.hashRect)"""
    x0, y0, x1, y1 = rect; h = 0x811c9dc5
    for y in range(y0, y1):
        for x in range(x0, x1):
            h ^= tiles[y * w + x]; h = (h * 0x01000193) & 0xffffffff
    return h


def screen(p):
    """จุดโลก Blender → พิกัดจอของกล้องเกม (เมตร): sx ขวา, sy ขึ้น"""
    return p[0], p[1] * K + p[2] * SN


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
  const r = await p.evaluate(id => { if (typeof BAKE_DATA !== 'undefined') delete BAKE_DATA[id];
    const m = new GameMap(id, { lite: true }); return { w: m.w, h: m.h, tiles: Array.from(m.tiles), fountain: m.fountain }; }, process.argv[3]);
  console.log(JSON.stringify(r)); await b.close(); })();"""
    f = os.path.join(tempfile.gettempdir(), 'fountain3d_extract.js'); open(f, 'w').write(js)
    env = dict(os.environ); env.setdefault('NODE_PATH', subprocess.check_output(['npm', 'root', '-g'], text=True).strip())
    out = subprocess.check_output(['node', f, f'http://127.0.0.1:{srv.server_address[1]}/index.html', MAP_ID], env=env, text=True)
    srv.shutdown()
    r = json.loads(out.strip().splitlines()[-1]); w, h = r['w'], r['h']
    assert (r['fountain']['x'], r['fountain']['y']) == (FX, FY), r['fountain']
    data = {'map': MAP_ID, 'w': w, 'h': h, 'fountain': r['fountain'],
            'rows': [''.join('0123456789AB'[v] for v in r['tiles'][y * w:(y + 1) * w]) for y in range(h)],
            'hash': fnv_rect(r['tiles'], w, HASH_RECT)}
    json.dump(data, open(TILES, 'w'), indent=0)
    print('ผังช่อง →', TILES, 'hash', data['hash'])
    for y in range(HASH_RECT[1], HASH_RECT[3]): print(y, data['rows'][y][HASH_RECT[0]:HASH_RECT[2]])


def load_tiles():
    d = json.load(open(TILES))
    tiles = [int(c, 16) for row in d['rows'] for c in row]
    assert fnv_rect(tiles, d['w'], HASH_RECT) == d['hash']
    return d, tiles


# ============================================================
#  เรขาคณิต (รายการจุด/หน้า → mesh)
# ============================================================
def revolve(V, F, polylines, seg=96, a0=0.0, a1=2 * math.pi, cx=0.0, cy=0.0):
    """หมุนเส้นโปรไฟล์ (r, z) รอบแกน z • แต่ละ polyline เป็นแถบแยก (มุมคม = เริ่ม polyline ใหม่) • ลำดับจุดทวนเข็มในระนาบ r-z → หน้าหันออก"""
    full = abs(a1 - a0 - 2 * math.pi) < 1e-6
    n = seg if full else seg + 1
    for pl in polylines:
        o = len(V)
        for i in range(n):
            a = a0 + (a1 - a0) * i / seg
            c, s = math.cos(a), math.sin(a)
            for r, z in pl: V.append((cx + r * c, cy + r * s, z))
        m = len(pl)
        for i in range(seg):
            i1 = (i + 1) % n if full else i + 1
            for j in range(m - 1):
                F.append((o + i * m + j, o + i1 * m + j, o + i1 * m + j + 1, o + i * m + j + 1))


def box(V, F, x0, x1, y0, y1, z0, z1, taper=1.0):
    o = len(V); cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    for z, t in ((z0, 1.0), (z1, taper)):
        for x, y in ((x0, y0), (x1, y0), (x1, y1), (x0, y1)):
            V.append((cx + (x - cx) * t, cy + (y - cy) * t, z))
    F.extend([(o, o + 3, o + 2, o + 1), (o + 4, o + 5, o + 6, o + 7), (o, o + 1, o + 5, o + 4),
              (o + 1, o + 2, o + 6, o + 5), (o + 2, o + 3, o + 7, o + 6), (o + 3, o + 0, o + 4, o + 7)])


def helix_band(V, F, R, z0, z1, turns, a0, hb, th, n=220):
    """เกลียวแถบแบน (หน้ากว้างหันออก) รอบแกน z: สูงแถบ hb ความหนา th"""
    o = len(V)
    for i in range(n + 1):
        t = i / n; a = a0 + t * turns * 2 * math.pi; z = z0 + (z1 - z0) * t
        c, s = math.cos(a), math.sin(a)
        for r, dz in ((R - th / 2, -hb / 2), (R + th / 2, -hb / 2), (R + th / 2, hb / 2), (R - th / 2, hb / 2)):
            V.append((r * c, r * s, z + dz))
    for i in range(n):
        for k in range(4):
            k1 = (k + 1) % 4
            F.append((o + i * 4 + k, o + i * 4 + k1, o + (i + 1) * 4 + k1, o + (i + 1) * 4 + k))
    F.append((o + 3, o + 2, o + 1, o)); e = o + n * 4; F.append((e, e + 1, e + 2, e + 3))


def bipyramid(V, F, z0, z1, r, mid=0.42, sides=6, rot=0.0):
    """คริสตัลหกเหลี่ยมปลายแหลมสองด้าน (ช่วงลำตัว mid..mid+0.3 ของความยาว)"""
    o = len(V); L = z1 - z0
    V.append((0, 0, z0))
    for zz, rr in ((z0 + L * mid * 0.55, r), (z0 + L * (mid + 0.25), r * 0.92)):
        for k in range(sides):
            a = rot + k * 2 * math.pi / sides; V.append((rr * math.cos(a), rr * math.sin(a), zz))
    V.append((0, 0, z1))
    for k in range(sides):
        k1 = (k + 1) % sides
        F.append((o, o + 1 + k1, o + 1 + k)); F.append((o + 1 + k, o + 1 + k1, o + 1 + sides + k1, o + 1 + sides + k))
        F.append((o + 1 + sides + k, o + 1 + sides + k1, o + 1 + 2 * sides))


# ============================================================
#  ฉาก
# ============================================================
def build(samples, outdir, only=None, frames=None, preview=False):
    import bpy
    from mathutils import Vector
    os.makedirs(outdir, exist_ok=True)
    rnd = random.Random(1101)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    # แสงชุดเมือง (เหมือน tools/gate3d.py theme town): sun ซ้ายบน → เงาตกขวาล่าง
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 3.3; sun.angle = math.radians(5); sun.color = (1.0, 0.95, 0.86)
    so = bpy.data.objects.new('sun', sun); sc.collection.objects.link(so)
    so.rotation_euler = (math.radians(44), 0, math.radians(-135))
    fill = bpy.data.lights.new('fill', 'SUN'); fill.energy = 0.8; fill.angle = math.radians(20); fill.color = (1.0, 0.93, 0.85); fill.use_shadow = False
    fo = bpy.data.objects.new('fill', fill); sc.collection.objects.link(fo); fo.rotation_euler = (math.radians(60), 0, math.radians(-20))
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (0.56, 0.64, 0.78, 1); bg.inputs['Strength'].default_value = 0.65
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
    try: sc.cycles.use_denoising = True
    except Exception: pass
    sc.cycles.max_bounces = 8; sc.cycles.transmission_bounces = 8; sc.cycles.transparent_max_bounces = 24
    # Standard (ไม่ใช่ AgX แบบงานอบชิ้นอื่น): AgX ดึงสีฟ้าสว่างของน้ำ/คริสตัลจนซีดเทา — น้ำพุต้องฟ้าอิ่มแบบภาพวาดเดิม
    try: sc.view_settings.view_transform = os.environ.get('FVIEW', 'Standard'); sc.view_settings.look = os.environ.get('FLOOK', 'None')
    except Exception: sc.view_settings.view_transform = 'Filmic'
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.use_persistent_data = True
    if os.environ.get('BTHREADS'): sc.render.threads_mode = 'FIXED'; sc.render.threads = int(os.environ['BTHREADS'])   # แบ่ง CPU กับงานเรนเดอร์อื่น

    # ---------------- วัสดุ ----------------
    phases = []        # โหนด Value "เฟส" ทุกวัสดุที่เคลื่อนไหว (ตั้งค่าใหม่ทุกเฟรม)

    def L(nt, a, b): nt.links.new(a, b)

    def new(name):
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
        return m, nt, nt.nodes['Principled BSDF']

    def math_(nt, op, a, b=None, clamp=False):
        n = nt.nodes.new('ShaderNodeMath'); n.operation = op; n.use_clamp = clamp
        for i, v in enumerate((a, b)):
            if v is None: continue
            if isinstance(v, (int, float)): n.inputs[i].default_value = v
            else: L(nt, v, n.inputs[i])
        return n.outputs[0]

    def mixc(nt, a, b, fac, mode='MIX'):
        m = nt.nodes.new('ShaderNodeMix'); m.data_type = 'RGBA'; m.blend_type = mode
        if isinstance(fac, (int, float)): m.inputs['Factor'].default_value = fac
        else: L(nt, fac, m.inputs['Factor'])
        for sock, v in ((m.inputs[6], a), (m.inputs[7], b)):
            if isinstance(v, tuple): sock.default_value = (*v, 1)
            else: L(nt, v, sock)
        return m.outputs[2]

    def ramp(nt, fac, stops):
        r = nt.nodes.new('ShaderNodeValToRGB'); el = r.color_ramp.elements
        el[0].position, el[0].color = stops[0][0], (*stops[0][1], 1)
        el[1].position, el[1].color = stops[-1][0], (*stops[-1][1], 1)
        for p, c in stops[1:-1]: e = el.new(p); e.color = (*c, 1)
        L(nt, fac, r.inputs['Fac']); return r

    def phase_node(nt):
        v = nt.nodes.new('ShaderNodeValue'); v.outputs[0].default_value = 0.0; phases.append(v); return v.outputs[0]

    def coords(nt):
        tc = nt.nodes.new('ShaderNodeTexCoord'); sp = nt.nodes.new('ShaderNodeSeparateXYZ'); L(nt, tc.outputs['Object'], sp.inputs[0])
        return tc, sp

    def noise4(nt, X, Y, Z, W, detail=2.0, rough=0.55):
        cb = nt.nodes.new('ShaderNodeCombineXYZ')
        for i, v in enumerate((X, Y, Z)):
            if isinstance(v, (int, float)): cb.inputs[i].default_value = v
            else: L(nt, v, cb.inputs[i])
        nz = nt.nodes.new('ShaderNodeTexNoise'); nz.noise_dimensions = '4D'
        nz.inputs['Scale'].default_value = 1.0; nz.inputs['Detail'].default_value = detail; nz.inputs['Roughness'].default_value = rough
        L(nt, cb.outputs[0], nz.inputs['Vector']); L(nt, W, nz.inputs['W'])
        return nz.outputs['Fac']

    def flow_noise(nt, sp, ph, a, b, P, k=1.0, detail=2.0):
        """ลายน้ำไหลลงที่ลูปเนียน: มุมรอบแกน → วงรัศมี a (ลายรอบวงต่อกันพอดี) • z/P + k·เฟส → วงรัศมี b ในแกน (Z, W)
        เฟส 0→1 = ลายเลื่อนลง k คาบพอดี → เฟรมสุดท้ายต่อเฟรมแรกเนียน (โจทย์ "W วิ่งเป็นวง" ของแผน)"""
        ang = math_(nt, 'ARCTAN2', sp.outputs['Y'], sp.outputs['X'])
        X = math_(nt, 'MULTIPLY', math_(nt, 'COSINE', ang), a); Y = math_(nt, 'MULTIPLY', math_(nt, 'SINE', ang), a)
        arg = math_(nt, 'MULTIPLY', math_(nt, 'ADD', math_(nt, 'DIVIDE', sp.outputs['Z'], P), math_(nt, 'MULTIPLY', ph, k)), 2 * math.pi)
        Z = math_(nt, 'MULTIPLY', math_(nt, 'COSINE', arg), b); W = math_(nt, 'MULTIPLY', math_(nt, 'SINE', arg), b)
        return noise4(nt, X, Y, Z, W, detail)

    def morph_noise(nt, sp, ph, s, b, k=1.0, detail=2.0):
        """ลายบนผิวน้ำ/ฟองที่แปรรูปเป็นวง: (x, y)·s + วงรัศมี b ของเฟสในแกน (Z, W)"""
        arg = math_(nt, 'MULTIPLY', ph, 2 * math.pi * k)
        Z = math_(nt, 'MULTIPLY', math_(nt, 'COSINE', arg), b); W = math_(nt, 'MULTIPLY', math_(nt, 'SINE', arg), b)
        return noise4(nt, math_(nt, 'MULTIPLY', sp.outputs['X'], s), math_(nt, 'MULTIPLY', sp.outputs['Y'], s), Z, W, detail)

    def radius(nt, sp):
        return math_(nt, 'SQRT', math_(nt, 'ADD', math_(nt, 'MULTIPLY', sp.outputs['X'], sp.outputs['X']), math_(nt, 'MULTIPLY', sp.outputs['Y'], sp.outputs['Y'])))

    def marble(name='marble', tone=1.0, tint=(1.0, 1.0, 1.0)):
        m, nt, b = new(name)
        tc = nt.nodes.new('ShaderNodeTexCoord')
        nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 1.6; nz.inputs['Detail'].default_value = 7; nz.inputs['Distortion'].default_value = 4.0
        L(nt, tc.outputs['Object'], nz.inputs['Vector'])
        base = tuple(c * tone * u for c, u in zip((0.88, 0.87, 0.85), tint)); vein = tuple(c * tone * u for c, u in zip((0.56, 0.58, 0.64), tint))
        r = ramp(nt, nz.outputs['Fac'], [(0.0, base), (0.46, base), (0.495, vein), (0.53, base), (1.0, tuple(c * tone * u for c, u in zip((0.82, 0.82, 0.82), tint)))])
        L(nt, r.outputs['Color'], b.inputs['Base Color']); b.inputs['Roughness'].default_value = 0.3
        return m

    def gold():
        m, nt, b = new('gold')
        b.inputs['Base Color'].default_value = (1.0, 0.70, 0.26, 1); b.inputs['Metallic'].default_value = 0.75; b.inputs['Roughness'].default_value = 0.3
        b.inputs['Emission Color'].default_value = (1.0, 0.72, 0.3, 1); b.inputs['Emission Strength'].default_value = 0.14
        return m

    def emit(name, col, strength):
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
        nt.nodes.remove(nt.nodes['Principled BSDF'])
        e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*col, 1); e.inputs['Strength'].default_value = strength
        L(nt, e.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
        return m

    def crystal():
        m, nt, b = new('crystal')
        b.inputs['Base Color'].default_value = (0.02, 0.30, 0.88, 1); b.inputs['Roughness'].default_value = 0.22
        b.inputs['Coat Weight'].default_value = 0.12
        lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.4
        r = ramp(nt, lw.outputs['Facing'], [(0.0, (0.40, 0.90, 1.0)), (0.5, (0.04, 0.55, 1.0)), (1.0, (0.0, 0.18, 0.80))])
        L(nt, r.outputs['Color'], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = 1.6
        return m, b

    def water(name, tint=(0.02, 0.42, 0.84), ripple=0.2, animated=True):
        """ผิวน้ำในสระ: โปร่งแสงหักเห (เห็นพื้นสระวงรูน) + วงคลื่นกระจายออก sin(2π(r/λ − 2·เฟส)) × นอยส์แปรรูปเป็นวง → ลูปเนียน"""
        m, nt, b = new(name)
        b.inputs['Base Color'].default_value = (*tint, 1); b.inputs['Transmission Weight'].default_value = 1.0
        b.inputs['IOR'].default_value = 1.33; b.inputs['Roughness'].default_value = 0.04
        b.inputs['Emission Color'].default_value = (0.04, 0.50, 0.92, 1); b.inputs['Emission Strength'].default_value = 0.25
        tc, sp = coords(nt)
        ph = phase_node(nt) if animated else 0.0
        r = radius(nt, sp)
        wave = math_(nt, 'SINE', math_(nt, 'MULTIPLY', math_(nt, 'SUBTRACT', math_(nt, 'DIVIDE', r, ripple), math_(nt, 'MULTIPLY', ph, 2.0) if animated else 0.0), 2 * math.pi))
        nz = morph_noise(nt, sp, ph, 5.0, 0.5, 1.0, 3.0) if animated else None
        if nz is None:
            n0 = nt.nodes.new('ShaderNodeTexNoise'); n0.inputs['Scale'].default_value = 5.0; n0.inputs['Detail'].default_value = 3
            L(nt, tc.outputs['Object'], n0.inputs['Vector']); nz = n0.outputs['Fac']
        h = math_(nt, 'ADD', math_(nt, 'MULTIPLY', wave, 0.35), nz)
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.35; bp.inputs['Distance'].default_value = 0.02
        L(nt, h, bp.inputs['Height']); L(nt, bp.outputs['Normal'], b.inputs['Normal'])
        return m

    def curtain(name, P, a, b_, k=2.0, top=None, bot=None, amul=1.0):
        """ม่านน้ำไหลลง (โปร่ง): ลายเส้นน้ำจาก flow_noise • จางที่ปลายบน/ล่างเล็กน้อย"""
        m, nt, b = new(name)
        tc, sp = coords(nt); ph = phase_node(nt)
        nz = flow_noise(nt, sp, ph, a, b_, P, k, 2.0)
        col = ramp(nt, nz, [(0.0, (0.08, 0.50, 0.95)), (0.45, (0.25, 0.75, 1.0)), (0.62, (0.65, 0.93, 1.0)), (0.75, (0.95, 1.0, 1.0)), (1.0, (1.0, 1.0, 1.0))])
        al = ramp(nt, nz, [(0.0, (0.10,) * 3), (0.42, (0.28,) * 3), (0.62, (0.72,) * 3), (1.0, (0.92,) * 3)])
        L(nt, col.outputs['Color'], b.inputs['Base Color']); L(nt, col.outputs['Color'], b.inputs['Emission Color'])
        b.inputs['Emission Strength'].default_value = 0.3; b.inputs['Roughness'].default_value = 0.12
        alpha = math_(nt, 'MULTIPLY', al.outputs['Color'], amul)
        if top is not None:   # จางที่ขอบล่าง (ลงน้ำ) ให้กลืนกับฟอง
            fade = math_(nt, 'MULTIPLY', math_(nt, 'SUBTRACT', sp.outputs['Z'], bot), 1.0 / max(0.05, (top - bot) * 0.25), True)
            alpha = math_(nt, 'MULTIPLY', alpha, math_(nt, 'ADD', math_(nt, 'MULTIPLY', fade, 0.6), 0.4))
        L(nt, alpha, b.inputs['Alpha'])
        return m

    def foam(name, r0, r1):
        """ฟองกระเซ็นรอบจุดที่ม่านน้ำลงสระ: นอยส์แปรรูปเป็นวง × จางตามรัศมี"""
        m, nt, b = new(name)
        tc, sp = coords(nt); ph = phase_node(nt)
        nz = morph_noise(nt, sp, ph, 5.0, 0.6, 1.0, 1.5)
        r = radius(nt, sp)
        rr = math_(nt, 'DIVIDE', math_(nt, 'SUBTRACT', r, r0), r1 - r0)                 # 0 ที่ม่าน → 1 ที่ขอบนอก
        fall = math_(nt, 'SUBTRACT', 1.0, math_(nt, 'POWER', math_(nt, 'MINIMUM', math_(nt, 'MAXIMUM', rr, 0.0), 1.0), 0.55))
        al = ramp(nt, nz, [(0.0, (0.05,) * 3), (0.4, (0.15,) * 3), (0.6, (0.8,) * 3), (1.0, (1.0,) * 3)])
        a = math_(nt, 'MULTIPLY', al.outputs['Color'], fall)
        b.inputs['Base Color'].default_value = (0.92, 0.99, 1.0, 1); b.inputs['Emission Color'].default_value = (0.85, 0.97, 1.0, 1)
        b.inputs['Emission Strength'].default_value = 0.5; b.inputs['Roughness'].default_value = 0.4
        L(nt, a, b.inputs['Alpha'])
        return m

    def holdout():
        m = bpy.data.materials.new('holdout'); m.use_nodes = True; nt = m.node_tree
        nt.nodes.remove(nt.nodes['Principled BSDF'])
        h = nt.nodes.new('ShaderNodeHoldout'); L(nt, h.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
        return m

    def core():
        """แกนกลางในปลอกน้ำ: พลังงานฟ้าเรือง ไล่สว่างขึ้นด้านบน + ลายไหลลงจางๆ (ปลอกน้ำโปร่งทับอีกชั้น)"""
        m, nt, b = new('core')
        tc, sp = coords(nt); ph = phase_node(nt)
        nz = flow_noise(nt, sp, ph, 4.0, 0.25, 0.7, 1.0, 2.0)
        zz = math_(nt, 'DIVIDE', math_(nt, 'SUBTRACT', sp.outputs['Z'], IN_W), CUP_Z - IN_W, True)
        c = ramp(nt, zz, [(0.0, (0.08, 0.55, 0.98)), (0.6, (0.12, 0.70, 1.0)), (1.0, (0.45, 0.92, 1.0))])
        col = mixc(nt, c.outputs['Color'], (0.7, 0.96, 1.0), math_(nt, 'MULTIPLY', math_(nt, 'SUBTRACT', nz, 0.5, True), 1.2, True))
        L(nt, col, b.inputs['Base Color']); L(nt, col, b.inputs['Emission Color'])
        b.inputs['Emission Strength'].default_value = 0.4; b.inputs['Roughness'].default_value = 0.2
        return m

    MCRY, BCRY = crystal()
    M = {'marble': marble(), 'stone': marble('stone', 0.84, (1.0, 0.97, 0.92)), 'floor': marble('floor', 0.8, (0.62, 0.86, 1.0)), 'gold': gold(), 'rune': emit('rune', GLOW, 4.5),
         'crystal': MCRY, 'core': core(), 'water_out': water('water_out', animated=False), 'water_mid': water('water_mid', ripple=0.16),
         'water_in': water('water_in', ripple=0.12), 'holdout': holdout(),
         'cur_core': curtain('cur_core', 0.55, 9.0, 0.32, 2.0, CUP_Z, IN_W, 0.7),
         'cur_in': curtain('cur_in', 0.25, 14.0, 0.3, 2.0, IN_Z, MID_W),
         'cur_mid': curtain('cur_mid', 0.18, 20.0, 0.3, 2.0, MID_Z, WATER_Z),
         'foam_in': foam('foam_in', 0.40, 0.74), 'foam_mid': foam('foam_mid', 1.08, 1.42), 'foam_out': foam('foam_out', 1.86, 2.08)}
    runes_pulse = [M['rune']]

    # ---------------- วัตถุ ----------------
    cols = {}
    def coll(name):
        if name not in cols:
            c = bpy.data.collections.new(name); sc.collection.children.link(c); cols[name] = c
        return cols[name]

    def obj(name, V, F, mat, cname, smooth=True, shadow=True):
        me = bpy.data.meshes.new(name); me.from_pydata(V, [], F); me.update()
        o = bpy.data.objects.new(name, me); coll(cname).objects.link(o); o.data.materials.append(M[mat])
        for p in o.data.polygons: p.use_smooth = smooth
        o.visible_shadow = shadow
        return o

    # ===== A: ขอบสระนอก + ผิวน้ำ + พื้นสระวงรูน =====
    V, F = [], []
    nb = 20; gap = 0.006
    for i in range(nb):   # หินขอบสระเป็นก้อน (ร่องระหว่างก้อน = เส้น crease ของ Freestyle)
        a0 = i * 2 * math.pi / nb + gap; a1 = (i + 1) * 2 * math.pi / nb - gap
        revolve(V, F, [[(RIM_O, 0.0), (RIM_O, RIM_Z - 0.04)], [(RIM_O, RIM_Z - 0.04), (RIM_O - 0.04, RIM_Z)],
                       [(RIM_O - 0.04, RIM_Z), (RIM_I + 0.04, RIM_Z)], [(RIM_I + 0.04, RIM_Z), (RIM_I, RIM_Z - 0.04)],
                       [(RIM_I, RIM_Z - 0.04), (RIM_I, FLOOR_Z)]], seg=8, a0=a0, a1=a1)
    obj('rim', V, F, 'stone', 'A_ink')
    V, F = [], []
    revolve(V, F, [[(PLINTH, 0.0), (PLINTH, 0.07)], [(PLINTH, 0.07), (RIM_O - 0.01, 0.07)]], seg=128)   # ฐานบันไดเตี้ยรอบสระ
    obj('plinth', V, F, 'marble', 'A_ink')
    V, F = [], []
    revolve(V, F, [[(RIM_O + 0.012, 0.15), (RIM_O + 0.012, 0.21)]], seg=128)                            # แถบทองรอบผนังนอก
    revolve(V, F, [[(RIM_I + 0.16, RIM_Z), (RIM_I + 0.16, RIM_Z + 0.02)], [(RIM_I + 0.16, RIM_Z + 0.02), (RIM_I + 0.08, RIM_Z + 0.02)],
                   [(RIM_I + 0.08, RIM_Z + 0.02), (RIM_I + 0.08, RIM_Z)]], seg=128)                                  # เส้นทองนูนบนสันขอบ
    revolve(V, F, [[(PLINTH + 0.01, 0.0), (PLINTH + 0.01, 0.03)]], seg=128)                              # ขอบทองที่ฐาน
    obj('rim_gold', V, F, 'gold', 'A')
    V, F = [], []
    revolve(V, F, [[(RIM_I + 0.001, WATER_Z), (0.002, WATER_Z)]], seg=128)
    obj('water_out', V, F, 'water_out', 'A', shadow=False)
    V, F = [], []
    revolve(V, F, [[(RIM_I + 0.001, FLOOR_Z), (0.002, FLOOR_Z)]], seg=96)
    obj('floor_out', V, F, 'floor', 'A')
    V, F = [], []
    revolve(V, F, [[(2.06, FLOOR_Z + 0.01), (2.0, FLOOR_Z + 0.01)]], seg=128)                            # วงรูนเรืองบนพื้นสระ
    for i in range(16):   # ขีดรูนรอบวง
        a = i * 2 * math.pi / 16 + 0.1; c, s = math.cos(a), math.sin(a)
        for rr0, rr1, ww in ((1.92, 1.97, 0.02), (1.82, 1.9, 0.012)):
            o = len(V); tx, ty = -s, c
            for r_, w_ in ((rr0, -ww), (rr1, -ww), (rr1, ww), (rr0, ww)):
                V.append((r_ * c + tx * w_, r_ * s + ty * w_, FLOOR_Z + 0.012))
            F.append((o, o + 1, o + 2, o + 3))
    obj('floor_rune', V, F, 'rune', 'A', shadow=False)

    # ===== B: ชั้นกลาง + ชั้นใน + แกน + เกลียว + ถ้วย + คริสตัล + ม่านน้ำ/ฟอง =====
    V, F = [], []
    revolve(V, F, [[(MID_O, FLOOR_Z), (MID_O, MID_Z - 0.035)], [(MID_O, MID_Z - 0.035), (MID_O - 0.035, MID_Z)],
                   [(MID_O - 0.035, MID_Z), (MID_I + 0.035, MID_Z)], [(MID_I + 0.035, MID_Z), (MID_I, MID_Z - 0.035)],
                   [(MID_I, MID_Z - 0.035), (MID_I, MID_W - 0.2)]], seg=128)
    revolve(V, F, [[(MID_I, MID_W - 0.2), (IN_O, MID_W - 0.2)]], seg=96)                                  # พื้นชั้นกลาง
    revolve(V, F, [[(IN_O, MID_W - 0.2), (IN_O, IN_Z - 0.03)], [(IN_O, IN_Z - 0.03), (IN_O - 0.03, IN_Z)],
                   [(IN_O - 0.03, IN_Z), (IN_I + 0.03, IN_Z)], [(IN_I + 0.03, IN_Z), (IN_I, IN_Z - 0.03)],
                   [(IN_I, IN_Z - 0.03), (IN_I, IN_W - 0.14)]], seg=96)
    revolve(V, F, [[(IN_I, IN_W - 0.14), (CORE_R, IN_W - 0.14)]], seg=64)                                # พื้นชั้นใน
    obj('tiers', V, F, 'marble', 'B_ink')
    V, F = [], []; revolve(V, F, [[(CORE_R, IN_W - 0.14), (CORE_R, CUP_Z - 0.1)]], seg=48)              # แกนพลังงานเรืองฟ้า (อยู่ในปลอกน้ำ)
    obj('tiers_core', V, F, 'core', 'B')
    V, F = [], []
    revolve(V, F, [[(MID_O + 0.012, MID_Z - 0.16), (MID_O + 0.012, MID_Z - 0.11)]], seg=128)             # แถบทองรอบชั้นกลาง
    revolve(V, F, [[(MID_I + 0.15, MID_Z + 0.01), (MID_I + 0.07, MID_Z + 0.01)]], seg=128)
    revolve(V, F, [[(IN_O + 0.01, IN_Z - 0.14), (IN_O + 0.01, IN_Z - 0.09)]], seg=96)
    revolve(V, F, [[(IN_I + 0.12, IN_Z + 0.008), (IN_I + 0.06, IN_Z + 0.008)]], seg=96)
    # ถ้วยทองบนยอดแกน (น้ำล้นขอบถ้วยลงมาเป็นปลอกน้ำรอบแกน)
    revolve(V, F, [[(CORE_R + 0.02, CUP_Z - 0.16), (0.30, CUP_Z - 0.08), (0.42, CUP_Z + 0.02), (0.45, CUP_Z + 0.07)],
                   [(0.45, CUP_Z + 0.07), (0.40, CUP_Z + 0.09), (0.36, CUP_Z + 0.04)]], seg=64)
    revolve(V, F, [[(SPIRAL_R + 0.03, SPIRAL_Z[0] - 0.04), (SPIRAL_R + 0.03, SPIRAL_Z[0] + 0.04)], [(SPIRAL_R + 0.03, SPIRAL_Z[0] + 0.04), (SPIRAL_R - 0.03, SPIRAL_Z[0] + 0.04)],
                   [(SPIRAL_R - 0.03, SPIRAL_Z[0] + 0.04), (SPIRAL_R - 0.03, SPIRAL_Z[0] - 0.04)]], seg=64)   # วงทองฐานเกลียว
    revolve(V, F, [[(SPIRAL_R + 0.03, SPIRAL_Z[1] - 0.03), (SPIRAL_R + 0.03, SPIRAL_Z[1] + 0.05)], [(SPIRAL_R + 0.03, SPIRAL_Z[1] + 0.05), (SPIRAL_R - 0.03, SPIRAL_Z[1] + 0.05)],
                   [(SPIRAL_R - 0.03, SPIRAL_Z[1] + 0.05), (SPIRAL_R - 0.03, SPIRAL_Z[1] - 0.03)]], seg=64)   # วงทองบนยอดเกลียว (รับปลายแถบ)
    for k in range(4):   # ซี่ทองเชื่อมวงบนกับถ้วย
        a = k * math.pi / 2 + math.pi / 4; c, s_ = math.cos(a), math.sin(a)
        o = len(V); w_ = 0.025
        for r_ in (0.42, SPIRAL_R):
            V.extend([(r_ * c - s_ * w_, r_ * s_ + c * w_, SPIRAL_Z[1] - 0.01), (r_ * c + s_ * w_, r_ * s_ - c * w_, SPIRAL_Z[1] - 0.01),
                      (r_ * c + s_ * w_, r_ * s_ - c * w_, SPIRAL_Z[1] + 0.03), (r_ * c - s_ * w_, r_ * s_ + c * w_, SPIRAL_Z[1] + 0.03)])
        for q in range(4):
            q1 = (q + 1) % 4; F.append((o + q, o + q1, o + 4 + q1, o + 4 + q))
    helix_band(V, F, SPIRAL_R, SPIRAL_Z[0], SPIRAL_Z[1], 1.5, math.radians(-60), 0.15, 0.05)
    # ปลอกคอทองรับโคนคริสตัล (วงทองหนา + ยอดแหลมเล็ก 6 ยอด)
    zc = CRYSTAL[0] + 0.2
    revolve(V, F, [[(0.30, zc - 0.07), (0.31, zc + 0.03)], [(0.31, zc + 0.03), (0.22, zc + 0.05)], [(0.22, zc + 0.05), (0.22, zc - 0.07)],
                   [(0.22, zc - 0.07), (0.30, zc - 0.07)]], seg=48)
    for k in range(6):
        a = k * math.pi / 3 + math.pi / 6; c, s_ = math.cos(a), math.sin(a); o = len(V)
        for r_, tw in ((0.24, -0.045), (0.31, -0.045), (0.31, 0.045), (0.24, 0.045)):
            V.append((r_ * c - s_ * tw, r_ * s_ + c * tw, zc + 0.04))
        V.append((0.29 * c, 0.29 * s_, zc + 0.2))
        F.extend([(o, o + 1, o + 4), (o + 1, o + 2, o + 4), (o + 2, o + 3, o + 4), (o + 3, o, o + 4)])
    obj('gold_b', V, F, 'gold', 'B_ink')
    V, F = [], []
    bipyramid(V, F, CRYSTAL[0], CRYSTAL[1], CRYSTAL[2])
    cry = obj('crystal', V, F, 'crystal', 'B_ink', smooth=False)
    # ผิวน้ำชั้นกลาง/ชั้นใน (ในกล้อง B) + ผิวน้ำสระนอกเป็น holdout (ให้ส่วนผนังใต้ผิวน้ำหายไป → เห็นน้ำของภาพพื้นแทน)
    V, F = [], []; revolve(V, F, [[(MID_I + 0.001, MID_W), (IN_O - 0.001, MID_W)]], seg=128); obj('water_mid', V, F, 'water_mid', 'B', shadow=False)
    V, F = [], []; revolve(V, F, [[(IN_I + 0.001, IN_W), (0.40, IN_W)]], seg=96); obj('water_in', V, F, 'water_in', 'B', shadow=False)
    V, F = [], []; revolve(V, F, [[(RIM_I, WATER_Z), (0.002, WATER_Z)]], seg=96); hold = obj('hold', V, F, 'holdout', 'B', shadow=False)
    # ม่านน้ำ 3 ชั้น (โปรไฟล์ไหลลงจากขอบ — ทิศลงล่าง)
    V, F = [], []; revolve(V, F, [[(0.452, CUP_Z + 0.07), (0.44, CUP_Z - 0.2), (0.40, 2.2), (0.37, 1.4), (0.38, IN_W + 0.01)]], seg=64)
    obj('cur_core', V, F, 'cur_core', 'B', shadow=False)
    V, F = [], []; revolve(V, F, [[(IN_O + 0.01, IN_Z + 0.005), (IN_O + 0.06, IN_Z - 0.06), (IN_O + 0.10, IN_Z - 0.25), (IN_O + 0.12, MID_W + 0.005)]], seg=96)
    obj('cur_in', V, F, 'cur_in', 'B', shadow=False)
    V, F = [], []; revolve(V, F, [[(MID_O + 0.02, MID_Z + 0.005), (MID_O + 0.08, MID_Z - 0.06), (MID_O + 0.14, MID_Z - 0.22), (MID_O + 0.17, WATER_Z + 0.005)]], seg=128)
    obj('cur_mid', V, F, 'cur_mid', 'B', shadow=False)
    for nm, r0, r1, z in (('foam_in', 0.40, 0.74, IN_W + 0.006), ('foam_mid', 1.08, 1.42, MID_W + 0.006), ('foam_out', 1.86, 2.08, WATER_Z + 0.006)):
        V, F = [], []; revolve(V, F, [[(r1, z), (r0, z)]], seg=128); obj(nm, V, F, nm, 'B', shadow=False)

    # ===== เสาคริสตัลบนขอบสระ (แบบเดียว 4 ทิศ) =====
    pylons = []
    for key, (dx, dy) in PYLON_DIRS.items():
        cx, cy = dx * PYLON_R, dy * PYLON_R
        V, F = [], []
        box(V, F, cx - 0.21, cx + 0.21, cy - 0.21, cy + 0.21, RIM_Z, RIM_Z + 0.1)
        box(V, F, cx - 0.16, cx + 0.16, cy - 0.16, cy + 0.16, RIM_Z + 0.1, RIM_Z + 0.78, taper=0.8)
        pm = obj('pylon_' + key, V, F, 'marble', 'P_ink', smooth=False)
        V, F = [], []
        box(V, F, cx - 0.225, cx + 0.225, cy - 0.225, cy + 0.225, RIM_Z + 0.07, RIM_Z + 0.11)
        box(V, F, cx - 0.14, cx + 0.14, cy - 0.14, cy + 0.14, RIM_Z + 0.78, RIM_Z + 0.83)
        o = len(V); V.extend([(cx - 0.14, cy - 0.14, RIM_Z + 0.83), (cx + 0.14, cy - 0.14, RIM_Z + 0.83), (cx + 0.14, cy + 0.14, RIM_Z + 0.83), (cx - 0.14, cy + 0.14, RIM_Z + 0.83), (cx, cy, RIM_Z + 1.02)])
        F.extend([(o, o + 1, o + 4), (o + 1, o + 2, o + 4), (o + 2, o + 3, o + 4), (o + 3, o, o + 4)])
        pg = obj('pylon_gold_' + key, V, F, 'gold', 'P_ink', smooth=False)
        V, F = [], []
        for (nx, ny) in ((0, -1), (1, 0), (0, 1), (-1, 0)):   # แผ่นคริสตัลข้าวหลามตัดบนหน้าเสาทั้ง 4 ด้าน
            fx, fy = cx + nx * 0.152, cy + ny * 0.152; tx, ty = -ny, nx; zc = RIM_Z + 0.44
            o = len(V)
            V.extend([(fx, fy, zc - 0.22), (fx + tx * 0.075 + nx * 0.006, fy + ty * 0.075 + ny * 0.006, zc), (fx, fy, zc + 0.22), (fx - tx * 0.075 + nx * 0.006, fy - ty * 0.075 + ny * 0.006, zc)])
            F.append((o, o + 1, o + 2, o + 3))
        pc = obj('pylon_cry_' + key, V, F, 'crystal', 'P', smooth=False)
        pylons.append((key, cx, cy, [pm, pg, pc]))

    # พื้นลาน = shadow catcher (วงแหวนรอบสระ — ไม่บังพื้นสระที่ลึกกว่า)
    V, F = [], []; revolve(V, F, [[(14.0, -0.002), (PLINTH - 0.02, -0.002)]], seg=128)
    catcher = obj('catcher', V, F, 'marble', 'A', shadow=False); catcher.is_shadow_catcher = True

    # ============================================================
    #  กล้อง/เรนเดอร์
    # ============================================================
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.sensor_fit = 'HORIZONTAL'; cam.clip_end = 300
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
    co.rotation_euler = (TH, 0, 0)
    dvec = Vector((0, math.sin(TH), -math.cos(TH))); uvec = Vector((0, math.cos(TH), math.sin(TH)))
    sc.cycles.samples = 10 if preview else samples
    sc.render.resolution_percentage = 50 if preview else 100
    sc.view_settings.exposure = float(os.environ.get('FEXP', -0.3))

    def all_objs(): return [o for c in cols.values() for o in c.objects]

    def set_pass(target):
        """A = พื้น (ขอบสระ/น้ำ/เงา; แกนน้ำพุ+เสามองไม่เห็นแต่ทอดเงา) • B = แกนน้ำพุ • P = เสาคริสตัลต้นใต้ต้นเดียว"""
        solid = ('tiers', 'gold_b', 'crystal', 'pylon')      # ของทึบที่ทอดเงาลงภาพพื้น
        for cname, c in cols.items():
            grp = cname[0]
            for o in c.objects:
                if target == 'A':     # พื้นในกล้อง • แกนน้ำพุ/เสา: มองไม่เห็นแต่ทอดเงา (+ สะท้อนในน้ำ) • น้ำ/ม่าน/ฟอง/holdout ของ B ไม่อยู่
                    o.hide_render = not (grp == 'A' or o.name.startswith(solid)); o.visible_camera = grp == 'A'
                elif target == 'B':   # แกนน้ำพุในกล้อง • ขอบสระนอกมองไม่เห็น (เหลือไว้ให้น้ำสะท้อน)
                    o.hide_render = not (grp == 'B' or o.name in ('rim', 'plinth', 'rim_gold')); o.visible_camera = grp == 'B'
                else:                 # เสาต้นใต้ต้นเดียว
                    o.hide_render = not (grp == 'P' and o.name.endswith('_s')); o.visible_camera = True
        catcher.hide_render = target != 'A'

    def frame(objs, pad, res):
        bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
        xs, ys = [], []
        for o in objs:
            ev = o.evaluated_get(dg); me = ev.to_mesh(); Mw = o.matrix_world
            for v in me.vertices:
                sx, sy = screen(Mw @ v.co); xs.append(sx); ys.append(sy)
            ev.to_mesh_clear()
        x0, x1, y0, y1 = min(xs) - pad, max(xs) + pad, min(ys) - pad, max(ys) + pad
        wpx, hpx = math.ceil((x1 - x0) * res), math.ceil((y1 - y0) * res)
        return x0, y0, x0 + wpx / res, y0 + hpx / res, wpx, hpx

    def shoot(x0, y0, x1, y1, wpx, hpx, path):
        cam.ortho_scale = x1 - x0
        co.location = Vector(((x0 + x1) / 2, 0, 0)) + uvec * ((y0 + y1) / 2) - dvec * 80
        sc.render.resolution_x = wpx; sc.render.resolution_y = hpx
        sc.render.filepath = path
        bpy.ops.render.render(write_still=True)
        print('เรนเดอร์ →', path, wpx, 'x', hpx, flush=True)

    def ink(cname, thick):
        sc.render.use_freestyle = True; sc.render.line_thickness_mode = 'ABSOLUTE'; sc.render.line_thickness = 1.0
        vl = bpy.context.view_layer; vl.use_freestyle = True
        fs = vl.freestyle_settings; fs.crease_angle = math.radians(140)
        ls = fs.linesets[0] if fs.linesets else fs.linesets.new('ink')
        ls.select_by_visibility = True; ls.select_by_collection = True; ls.collection = cols[cname]
        ls.select_silhouette = True; ls.select_border = True; ls.select_crease = True
        if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new('ink')
        ls.linestyle.color = (0.08, 0.05, 0.04); ls.linestyle.alpha = 0.85
        ls.linestyle.thickness = thick * (0.5 if preview else 1)

    def set_phase(ph):
        for v in phases: v.outputs[0].default_value = ph
        BCRY.inputs['Emission Strength'].default_value = 0.9 * (1 + 0.22 * math.sin(2 * math.pi * ph))   # คริสตัลเต้นเป็นจังหวะ
        cry.rotation_euler = (0, 0, ph * math.pi / 3)                                                    # หกเหลี่ยมหมุน 60°/ลูป = ต่อกันพอดี

    todo = only or ['basin', 'pylon', 'frames']
    mp = os.path.join(outdir, 'meta.json')
    meta = {}
    if os.path.exists(mp):
        try: meta = json.load(open(mp))
        except Exception: meta = {}
    if 'basin' in todo:
        set_pass('A'); ink('A_ink', 2.4); set_phase(0.0)
        gx0, gy0, gx1, gy1 = A_RECT
        x0, x1 = gx0 - FX, gx1 - FX
        y1 = -(gy0 - FY) * K; y0 = -(gy1 - FY) * K
        wpx, hpx = round((x1 - x0) * RES_A), round((y1 - y0) * RES_A)
        shoot(x0, y0, x1, y1, wpx, hpx, os.path.join(outdir, 'basin.png'))
        meta['basin'] = {'rect': A_RECT}
    if 'pylon' in todo:
        set_pass('P'); ink('P_ink', 4.0); set_phase(0.0)
        key, cx, cy, objs = next(p for p in pylons if p[0] == 's')
        x0, y0, x1, y1, wpx, hpx = frame(objs, 0.1, RES_B)
        shoot(x0, y0, x1, y1, wpx, hpx, os.path.join(outdir, 'pylon.png'))
        sx, sy = screen((cx, cy - PYLON_FRONT, 0.0))
        meta['pylon'] = {'anchor': [round((sx - x0) * RES_B, 2), round((y1 - sy) * RES_B, 2)], 'px': [wpx, hpx], 'res': RES_B}
    if 'frames' in todo:
        set_pass('B'); ink('B_ink', 4.0)
        objs = [o for cn in ('B_ink', 'B') for o in cols[cn].objects if o.name != 'hold']
        x0, y0, x1, y1, wpx, hpx = frame(objs, 0.12, RES_B)
        sx, sy = screen((0.0, 0.0, 0.0))
        meta['frames'] = {'anchor': [round((sx - x0) * RES_B, 2), round((y1 - sy) * RES_B, 2)], 'px': [wpx, hpx], 'res': RES_B, 'n': NF}
        for i in (frames if frames is not None else range(NF)):
            set_phase(i / NF)
            shoot(x0, y0, x1, y1, wpx, hpx, os.path.join(outdir, f'f{i:02d}.png'))
    json.dump(meta, open(mp, 'w'), indent=1)
    print('meta →', mp)


# ============================================================
#  ติดตั้ง: ย่อ/ยืด/ปรับสี → assets/bake_fountain*.webp + js/bake_data_eldheim.js + manifest
# ============================================================
def install(src):
    from PIL import Image
    from tree3d import paint, opacity_mask
    d, _ = load_tiles()
    meta = json.load(open(os.path.join(src, 'meta.json')))
    s = PX / STORE_B
    data = {'ground': [], 'pieces': []}
    tag = {'fountain': True, 'tool': 'fountain3d', 'hash': d['hash'], 'hashRect': HASH_RECT}   # ทุกชิ้นของชุด: ป้ายน้ำพุ + hash ต่อชิ้น (Bake.rectOk)
    # ---------- A: ขอบสระ + น้ำ + เงา — ย่อเป็น 40 px/ม. แล้วยืดแนวตั้ง ×1/0.76 ----------
    x0, y0, x1, y1 = meta['basin']['rect']
    im = Image.open(os.path.join(src, 'basin.png')).convert('RGBA')
    W, H = round((x1 - x0) * PX), round((y1 - y0) * PX)
    im = paint(im.resize((W, H), Image.LANCZOS), sat=1.1, con=1.04, bri=1.0, outline=False)
    a = im.getchannel('A'); px = im.load(); al = a.load()
    # เงาบนลาน (พิกเซลกึ่งโปร่ง สีเข้ม = shadow catcher) → เงาฟ้าอมเทาแบบเงาอื่นของเมือง ความเข้ม 55%
    for yy in range(H):
        for xx in range(W):
            r_, g_, b_, a_ = px[xx, yy]
            if 0 < a_ < 250 and r_ + g_ + b_ < 60: px[xx, yy] = (30, 40, 62, int(a_ * 0.55))
    key = 'bake_fountain_basin'; im.save(os.path.join(ROOT, 'assets', key + '.webp'), 'WEBP', quality=88, method=6)
    data['ground'].append({'id': 'fountain_basin', 'img': key, 'x': x0, 'y': y0, 'w': round(x1 - x0, 2), 'h': round(y1 - y0, 2), **tag})
    print('ติดตั้ง', key, im.size)
    # ---------- B: เฟรมน้ำพุ → ชีต COLS × ROWS (ตัดขอบโปร่งร่วมกันทุกเฟรม — จุดยึดเดียวกัน) ----------
    m = meta['frames']; n = m['n']
    frames = [Image.open(os.path.join(src, f'f{i:02d}.png')).convert('RGBA') for i in range(n)]
    ratio = frames[0].width / m['px'][0]; k = STORE_B / (m['res'] * ratio)
    frames = [paint(f.resize((round(f.width * k), round(f.height * k)), Image.LANCZOS), sat=1.12, con=1.05, bri=1.0, outline=False) for f in frames]
    bb = None
    for f in frames:
        b_ = f.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox()
        bb = b_ if bb is None else (min(bb[0], b_[0]), min(bb[1], b_[1]), max(bb[2], b_[2]), max(bb[3], b_[3]))
    l, t, r, b = max(0, bb[0] - 2), max(0, bb[1] - 2), min(frames[0].width, bb[2] + 2), min(frames[0].height, bb[3] + 2)
    frames = [f.crop((l, t, r, b)) for f in frames]
    fw, fh = frames[0].size; rows = math.ceil(n / COLS)
    sheet = Image.new('RGBA', (fw * COLS, fh * rows), (0, 0, 0, 0))
    for i, f in enumerate(frames): sheet.paste(f, ((i % COLS) * fw, (i // COLS) * fh))
    key = 'bake_fountain'; sheet.save(os.path.join(ROOT, 'assets', key + '.webp'), 'WEBP', quality=88, method=6)
    kk = STORE_B / m['res']
    ax, ay = m['anchor'][0] * kk - l, m['anchor'][1] * kk - t
    data['pieces'].append({'id': 'fountain', 'img': key, 'x': FX, 'y': FY, 'ax': round(ax, 1), 'ay': round(ay, 1), 'scale': s, 'block': [], 'jars': [],
                           'frames': n, 'cols': COLS, 'fw': fw, 'fh': fh, 'fps': FPS, 'cull': 3, 'fade': 0.72, 'mask': opacity_mask(frames[0], 16), **tag})
    print('ติดตั้ง', key, sheet.size, 'เฟรม', (fw, fh), 'anchor', (round(ax, 1), round(ay, 1)))
    # ---------- B: เสาคริสตัล (ภาพเดียว 4 จุด) ----------
    m = meta['pylon']
    im = Image.open(os.path.join(src, 'pylon.png')).convert('RGBA')
    ratio = im.width / m['px'][0]; k = STORE_B / (m['res'] * ratio)
    im = paint(im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS), sat=1.12, con=1.05, bri=1.0, outline=False)
    l, t, r, b = im.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox()
    l, t, r, b = max(0, l - 2), max(0, t - 2), min(im.width, r + 2), min(im.height, b + 2)
    im = im.crop((l, t, r, b))
    key = 'bake_fountain_pylon'; im.save(os.path.join(ROOT, 'assets', key + '.webp'), 'WEBP', quality=90, method=6)
    kk = STORE_B / m['res']
    ax, ay = m['anchor'][0] * kk - l, m['anchor'][1] * kk - t
    pcs = []
    for kd, (dx, dy) in PYLON_DIRS.items():
        pcs.append({'id': 'fountain_pylon_' + kd, 'img': key, 'x': round(FX + dx * PYLON_R, 2), 'y': round(FY - dy * PYLON_R + PYLON_FRONT, 2),
                    'ax': round(ax, 1), 'ay': round(ay, 1), 'scale': s, 'block': [], 'jars': [], 'fade': 1, **tag})
    print('ติดตั้ง', key, im.size, 'anchor', (round(ax, 1), round(ay, 1)))
    data['pieces'] = sorted(data['pieces'] + pcs, key=lambda p: p['y'])   # เรียงตาม y (แผนที่ใหญ่วาดตามลำดับนี้)
    js = ("'use strict';\n// สร้างอัตโนมัติโดย tools/fountain3d.py --install — อย่าแก้ด้วยมือ (แก้ใน tools/fountain3d.py แล้วติดตั้งใหม่)\n"
          "// น้ำพุคริสตัลกลางเมือง Neo Eldheim แบบมีเฟรมน้ำไหล (docs/RENDER3D_PLAN.md #11) — ต่อท้ายเข้า BAKE_DATA.eldheim (ground/pieces) โดยไม่ทับชุดอื่น\n"
          "//   (แท่น Bifrost/Norn's Wheel #13 ใน js/bake_data_eldheim_bifrost.js — ไฟล์นี้โหลดก่อน) • ทุกชิ้นมี hash+hashRect ของตัวเอง (js/bake.js Bake.rectOk)\n"
          "// ground = ขอบสระนอก+ผิวน้ำ+เงา (แบบ A แทน TownArt.basin) • pieces = แกนน้ำพุ 12 เฟรม (frames/cols/fw/fh/fps — ชีตเฟรม) + เสาคริสตัล 4 ทิศ (แบบ B)\n"
          "// fountain = ชิ้นของชุดน้ำพุ: ใช้เมื่อผังตรง + ภาพครบทุกไฟล์ (Bake.fountain) ไม่งั้นสระโค้ด + ภาพวาด prop_fountain เดิม • ปิดทั้งชุด: FOUNTAIN_3D ใน js/townmap.js\n"
          "{\n"
          f"  const E = BAKE_DATA.{MAP_ID} || (BAKE_DATA.{MAP_ID} = {{ map: '{MAP_ID}', ground: [], pieces: [] }});\n"
          f"  E.ground = (E.ground || []).concat({json.dumps(data['ground'], separators=(',', ':'))});\n"
          f"  E.pieces = (E.pieces || []).concat({json.dumps(data['pieces'], separators=(',', ':'))});\n"
          "}\n")
    open(os.path.join(ROOT, 'js', 'bake_data_eldheim.js'), 'w').write(js)
    print('เขียน js/bake_data_eldheim.js')
    from slice_sheet import manifest
    manifest()


if __name__ == '__main__':
    a = sys.argv
    if '--extract' in a: extract()
    elif '--install' in a: install(a[a.index('--install') + 1])
    elif '--render' in a:
        only = a[a.index('--only') + 1].split(',') if '--only' in a else None
        fr = [int(v) for v in a[a.index('--frames') + 1].split(',')] if '--frames' in a else None
        build(int(a[a.index('--samples') + 1]) if '--samples' in a else 32,
              a[a.index('--out') + 1] if '--out' in a else '/tmp/fountain3d', only, fr, '--preview' in a)
    else: print(__doc__)
