"""แท่น Bifrost + Norn's Wheel หมุนได้ (Neo Eldheim) — โมเดลด้วย bpy แล้วอบเป็นภาพ 2D (docs/RENDER3D_PLAN.md ข้อ #13)

  แท่น Bifrost รอบ Bifrost Keeper (NPC ช่อง 23,15):
    A (อบลงพื้น): แท่นหินอ่อนกลมเตี้ย 2 ขั้น ⌀3.1 ม. สูง 0.14 ม. ขอบทอง วงสายรุ้ง 7 สีฝังบนแท่น ตรารูนกลางแท่น
                  + เงาของเสาคริสตัลที่ตกบนแท่น/พื้น + แสงสีรุ้งจากเสาที่ส่องลงแท่น → assets/bake_bif_dais.webp
    B (สไปรต์ตั้งตรง): เสาคริสตัล 7 สีสายรุ้ง สูง ~2 ม. บนฐานหินอ่อนขอบทอง เรียงครึ่งวงด้านหลัง/ข้าง (เว้นหน้าแท่นให้เดินเข้า)
                  → assets/bake_bif_pillar_<สี>.webp • ไม่ชน (ตัวละครเดินผ่าน/ซ้อนหลังได้ เรียงความลึกตามโคนเสา)
  Norn's Wheel (เครื่องกาชา NPC ช่อง 13,20 — js/gacha.js):
    B ฐาน (นิ่ง): แท่นหินอ่อน 2 ขั้น + เสาเกลียวทอง + ด้าย 3 เส้นของสามนอร์น (อูร์ด ฟ้าเขียว / แวร์ดันดี ทอง / สกุลด์ ม่วง)
                  จากกระสวย 3 อันพันขึ้นตามเสา + วงทองรอบวงล้อ + เข็มชี้ทองด้านบน → assets/bake_norn_base.webp
                  (ส่วนที่อยู่หลังวงล้อถูกเจาะโปร่งด้วยหน้ากาก — เกมวาดวงล้อก่อน แล้ววาดฐานทับ ของที่อยู่หน้าวงล้อ (เข็มชี้) จึงทับวงล้อถูกต้อง)
    B วงล้อ (เฟรม): วงล้อรูน 12 ช่อง ใช้ภาพ assets/gacha_wheel.webp (ภาพเดียวกับหน้าต่างกาชาเต็มจอ) เป็นหน้าวงล้อ + ขอบทองหนา
                  + ลูกแก้วกลางดุมมีวงแหวนทอง 2 วง • เอนหลัง 35° ให้เกือบหันหากล้อง • หมุน 24 เฟรม/รอบ (เฟรมละ 15° ตามเข็มนาฬิกา)
                  → ชีต 6×4 assets/bake_norn_wheel.webp • เกมหมุนส่วนที่เหลือระหว่างเฟรมด้วย 2D (หน้าวงล้อเป็นระนาบ → แปลงแบบ affine ตรงพอดี)
    A เงา: เงาทั้งเครื่องบนพื้น (shadow catcher) → assets/bake_norn_shd.webp
  ตำแหน่ง/ผัง: ผังช่องดึงจากเกมจริง (Playwright: new GameMap('eldheim',{lite:true})) → tools/bifrost3d_tiles.json
               hash = ผังช่องในกรอบของแต่ละชุด (ไม่รวมน้ำพุกลางเมือง) — ผังเปลี่ยน = เกมไม่ใช้ชุดนั้น (กลับไปวาดเครื่องวงล้อด้วยโค้ด)
  วงเรียกบอส MVP: ไม่ทำ — MVP เกิดสุ่ม ต้องรอเจ้าของตัดสินจุดเกิดคงที่ (docs/PENDING.md "รอเจ้าของตัดสินใจ" ข้อ 3)
แสง/วัสดุ: ชุด town ของ tools/gate3d.py (sun ซ้ายบน z = -135° → เงาตกขวาล่าง • หินอ่อนขาว/ทอง/รูนฟ้า #5fd4ff) • เส้นขอบ Freestyle
กล้อง = กล้องเกม (ออร์โธ เอียง acos(0.76) จากแนวดิ่ง yaw 0) • สไปรต์ B 80 px/ม. (เรนเดอร์ ×2 แล้วย่อ) • ภาพพื้น A 40 px/ม. ยืด ×1/0.76

ใช้:
  python3 tools/bifrost3d.py --extract                       (ต้องมี node + playwright) → tools/bifrost3d_tiles.json
  python3 tools/bifrost3d.py --plan                          (พิมพ์ผังรอบแท่น/เครื่อง + ตรวจ)
  /tmp/bvenv/bin/python tools/bifrost3d.py --render [--only dais,pillars,norn] [--samples 32] [--preview] [--out /tmp/bifrost3d]
  python3 tools/bifrost3d.py --install /tmp/bifrost3d [--kuwahara]   (→ assets/bake_bif_*, bake_norn_* + js/bake_data_eldheim_bifrost.js + manifest)
"""
import math, os, sys, json, random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
TILES = os.path.join(ROOT, 'tools', 'bifrost3d_tiles.json')
MAP_ID = 'eldheim'
K = 0.76; TH = math.acos(K); SN = math.sin(TH)
PX = 40                        # TILE (px/ม. ที่ 1×)
GPX = 80                       # สไปรต์ B ในไฟล์ (เกมวาด ×0.5)
SS = 2                         # เรนเดอร์ ×2 แล้วย่อ
RES_A = 80                     # ภาพพื้นเรนเดอร์ 2× → ติดตั้ง 40 px/ม.

# ---------- แท่น Bifrost ----------
BIF_C = (23.5, 15.8)           # ศูนย์กลางแท่น (พิกัดแมพ) — Bifrost Keeper วาดเท้าต่ำกว่ากลางช่อง 10 px (sprites.js drawNpc) → ยืนกลางแท่นพอดี
DAIS = ((1.55, 0.07), (1.30, 0.14))   # (รัศมี, ความสูงผิวบน) ขั้นนอก/ใน — เตี้ย ≤ 0.14 ม. ยื่นขึ้นเหนือ 0.12 ช่อง (ปลอดภัยแบบ A)
PIL_R = 1.95                   # รัศมีวงเสาคริสตัล (นอกขอบแท่น)
PIL_ANG = (198, 162, 126, 90, 54, 18, -18)   # มุม (0° = ตะวันออก, 90° = เหนือ) — เว้นด้านใต้ (ทางเดินเข้าหา Keeper / จุดโผล่จากลานประลอง)
RAINBOW = (('red', (1.0, 0.16, 0.22), '255,90,110'), ('orange', (1.0, 0.48, 0.08), '255,160,70'), ('yellow', (1.0, 0.84, 0.16), '255,230,110'),
           ('green', (0.18, 0.92, 0.38), '110,240,150'), ('blue', (0.14, 0.66, 1.0), '110,210,255'), ('indigo', (0.28, 0.32, 1.0), '130,140,255'),
           ('violet', (0.70, 0.26, 1.0), '200,130,255'))
BIF_RECT_A = (21.0, 13.0, 27.8, 18.8)        # กรอบภาพพื้นแท่น+เงาเสา (x0, y0, x1, y1 พิกัดแมพ)
BIF_HASH_RECT = [20, 12, 28, 18]             # ผังช่องรอบแท่น (ไม่รวมน้ำพุ y ≥ 18)

# ---------- Norn's Wheel ----------
NORN_AT = (13.5, 20.5)         # จุดยึด = จุดเรียงความลึกของ NPC (n.y + 0.5 ใน render.js)
NORN_OFF = 0.3                 # ศูนย์กลางแท่นอยู่ใต้จุดยึด 0.3 ม. (เท้า NPC วาดต่ำกว่ากลางช่อง 10 px — ให้ตรงตำแหน่งเครื่องเดิม)
NORN_RECT_A = (11.6, 18.4, 17.6, 24.0)       # กรอบภาพเงาบนพื้น
NORN_HASH_RECT = [10, 17, 16, 24]            # ผังช่องรอบเครื่อง (ไม่รวมน้ำพุ x ≥ 18)
FRAMES = 24                    # เฟรมต่อรอบ (15° ต่อเฟรม)
SHEET_COLS = 6
TILT = math.radians(35)        # วงล้อเอนหลังจากแนวดิ่ง
WHEEL_Z = 2.25                 # ความสูงดุมวงล้อ
WHEEL_Y = 0.02                 # ระยะดุมจากกลางแท่น (+ = เหนือ)
R_TEX = 0.9                    # รัศมีภาพหน้าวงล้อ (ถึงปลายอัญมณีในภาพ 360 px)
R_RIM = R_TEX * 0.925          # ขอบวงทอง (ในภาพ ~333 px)
R_HOLD = R_TEX + 0.015         # หน้ากากเจาะฐาน (ครอบปลายอัญมณีที่หมุนไปทุกมุม)
R_FRAME = 1.0                  # วงทองรอบวงล้อ (อยู่หลังวงล้อ)
NORNS = (('urd', (0.12, 0.85, 0.72)), ('verdandi', (1.0, 0.78, 0.30)), ('skuld', (0.62, 0.30, 1.0)))   # สีตามภาพ gacha_norns.webp
SOLID = {1, 2, 5, 8, 9, 10}


def fnv_rect(tiles, w, rect):
    """hash ผังช่องในกรอบ — ตรงกับ Bake.rectOk() ใน js/bake.js"""
    x0, y0, x1, y1 = rect; h = 0x811c9dc5
    for y in range(y0, y1):
        for x in range(x0, x1):
            h ^= tiles[y * w + x]; h = (h * 0x01000193) & 0xffffffff
    return h


def pillars():
    """เสาคริสตัล: (สี, gx, gy, ความยาวคริสตัล, หมุน)"""
    rnd = random.Random(1313); out = []
    for (name, col, js), a in zip(RAINBOW, PIL_ANG):
        gx = BIF_C[0] + PIL_R * math.cos(math.radians(a)); gy = BIF_C[1] - PIL_R * math.sin(math.radians(a))
        out.append((name, col, js, round(gx, 3), round(gy, 3), 1.55 + 0.25 * (1 - abs(a - 90) / 108) + rnd.uniform(-0.05, 0.05), rnd.uniform(0, 1)))
    return out


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
  await p.waitForFunction(() => typeof GameMap !== 'undefined' && typeof Gacha !== 'undefined');
  const r = await p.evaluate(id => { const m = new GameMap(id, { lite: true });
    return { w: m.w, h: m.h, tiles: Array.from(m.tiles), portals: m.portals.map(q => [q.ax, q.ay]), npcs: m.def.npcs.map(n => [n.id, n.x, n.y]) }; }, process.argv[3]);
  console.log(JSON.stringify(r)); await b.close(); })();"""
    f = os.path.join(tempfile.gettempdir(), 'bifrost3d_extract.js'); open(f, 'w').write(js)
    env = dict(os.environ); env.setdefault('NODE_PATH', subprocess.check_output(['npm', 'root', '-g'], text=True).strip())
    out = subprocess.check_output(['node', f, f'http://127.0.0.1:{srv.server_address[1]}/index.html', MAP_ID], env=env, text=True)
    srv.shutdown()
    r = json.loads(out.strip().splitlines()[-1]); w, h = r['w'], r['h']
    data = {'map': MAP_ID, 'w': w, 'h': h, 'portals': r['portals'], 'npcs': r['npcs'],
            'rows': [''.join('0123456789AB'[v] for v in r['tiles'][y * w:(y + 1) * w]) for y in range(h)],
            'hashBif': fnv_rect(r['tiles'], w, BIF_HASH_RECT), 'hashNorn': fnv_rect(r['tiles'], w, NORN_HASH_RECT)}
    json.dump(data, open(TILES, 'w'), indent=0)
    print('ผังช่อง →', TILES, 'hash', data['hashBif'], data['hashNorn'])


def load_tiles():
    d = json.load(open(TILES))
    tiles = [int(c, 16) for row in d['rows'] for c in row]
    assert fnv_rect(tiles, d['w'], BIF_HASH_RECT) == d['hashBif'] and fnv_rect(tiles, d['w'], NORN_HASH_RECT) == d['hashNorn']
    return d, tiles


def plan():
    """พิมพ์ผังรอบแท่น/เครื่อง: เสา (P) แท่น (o) • ตรวจว่าแท่น/เสาอยู่บนลานหินเดินได้ (ไม่ทับคลอง/กระถาง/อาคาร)"""
    d, tiles = load_tiles(); w = d['w']
    T = lambda x, y: tiles[y * w + x]
    pil = {(int(gx), int(gy)) for _, _, _, gx, gy, _, _ in pillars()}
    ch = '.T~=sWfcRHF'
    for y in range(10, 26):
        row = ''
        for x in range(6, 32):
            if (x, y) in pil: row += 'P'
            elif math.hypot(x + 0.5 - BIF_C[0], y + 0.5 - BIF_C[1]) <= DAIS[0][0]: row += 'o' if T(x, y) == 4 else '!'
            else: row += ch[T(x, y)]
        print('%3d ' % y + row)
    print('    ' + ''.join(str(x % 10) for x in range(6, 32)))
    bad = [p for p in pil if T(*p) in SOLID]
    print('เสาทับช่องตัน:', bad or 'ไม่มี')
    for n in d['npcs']: print('NPC', n)


# ============================================================
#  ฉาก Blender (ใช้แสง/วัสดุชุด town ของ tools/gate3d.py)
# ============================================================
def scene_setup():
    import gate3d as GT
    sc, so = GT.scene('town')
    sc.view_settings.exposure = 0.2
    sc.cycles.use_denoising = False   # OIDN ทำผิวเรืองแสง (หน้าวงล้อ/คริสตัล) ขาวโพลน — ใช้ samples มากขึ้นแทน (ภาพเล็ก) • เปิดเฉพาะภาพเงาพื้น
    sc.cycles.sample_clamp_indirect = 1.0; sc.cycles.sample_clamp_direct = 6.0; sc.cycles.blur_glossy = 1.0   # กันจุดวาบ (firefly) บนทองโค้ง
    M = GT.materials('town')
    b = M['trim'].node_tree.nodes['Principled BSDF']   # ทองของชิ้นโค้ง (ห่วง/เกลียว): โลหะเต็ม สีเข้มขึ้น — ผิวโค้งสะท้อนฟ้าจนขาวถ้าใช้ค่าซุ้มประตู (ผิวเรียบ)
    b.inputs['Base Color'].default_value = (0.78, 0.50, 0.15, 1); b.inputs['Metallic'].default_value = 1.0; b.inputs['Roughness'].default_value = 0.38
    b.inputs['Emission Strength'].default_value = 0.0
    return sc, so, M


def no_spill(o):
    """ของเรืองแสง (ด้าย/รูน/ลูกแก้ว): ไม่ส่องแสงใส่ของรอบ ๆ — กันหินอ่อน/ทองข้าง ๆ สว่างจนขาว"""
    o.visible_diffuse = False; o.visible_glossy = False; o.visible_transmission = False
    return o


def new_mat(name):
    import bpy
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    return m, nt, nt.nodes['Principled BSDF']


def emit_mat(name, col, strength):
    import bpy
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    nt.nodes.remove(nt.nodes['Principled BSDF'])
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*col, 1); e.inputs['Strength'].default_value = strength
    nt.links.new(e.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
    return m


def crystal_mat(name, col, strength=1.6):
    """คริสตัลสี: เงาแก้ว + เรืองแสงไล่ตามมุมมอง (กลางเข้ม ขอบสว่าง) แบบคริสตัลถ้ำใน gate3d"""
    m, nt, b = new_mat(name)
    dark = tuple(c * 0.25 for c in col); lite = tuple(min(1.0, c * 0.75 + 0.12) for c in col); deep = tuple(c ** 1.6 for c in col)
    b.inputs['Base Color'].default_value = (*dark, 1); b.inputs['Roughness'].default_value = 0.1
    try: b.inputs['Coat Weight'].default_value = 0.5
    except Exception: pass
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.4
    r = nt.nodes.new('ShaderNodeValToRGB'); r.color_ramp.elements[0].color = (*lite, 1); r.color_ramp.elements[1].color = (*deep, 1)
    nt.links.new(lw.outputs['Facing'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], b.inputs['Emission Color'])
    b.inputs['Emission Strength'].default_value = strength
    return m


def obj_from_bm(name, bm, mat, coll, smooth=False):
    import bpy
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    if smooth:
        for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new(name, me); o.data.materials.append(mat); coll.objects.link(o)
    return o


def cyl(name, r, z0, z1, mat, coll, x=0.0, y=0.0, seg=64, r2=None, smooth=True):
    import bmesh
    from mathutils import Matrix
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=z1 - z0,
                          matrix=Matrix.Translation((x, y, (z0 + z1) / 2)))
    o = obj_from_bm(name, bm, mat, coll, smooth)
    if smooth:   # ผิวข้างโค้งเนียน ขอบบน/ล่างคม (มุมตั้งฉาก)
        try: o.data.set_sharp_from_angle(angle=math.radians(50))
        except Exception: pass
    return o


def torus(name, R, r, mat, coll, loc=(0, 0, 0), rot=None, seg=(64, 12), arc=None):
    """ห่วง (หรือส่วนโค้ง arc=(a0, a1) เรเดียน) ในระนาบ xy ท้องถิ่น → หมุนด้วย rot (Matrix 3x3) แล้วเลื่อนไป loc"""
    import bmesh
    from mathutils import Vector, Matrix
    bm = bmesh.new(); n, m = seg
    a0, a1 = arc if arc else (0.0, 2 * math.pi)
    closed = arc is None; nn = n if closed else n + 1
    rows = []
    for i in range(nn):
        a = a0 + (a1 - a0) * i / n
        ring = []
        for j in range(m):
            b = 2 * math.pi * j / m
            p = Vector(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b)))
            if rot is not None: p = rot @ p
            ring.append(bm.verts.new(p + Vector(loc)))
        rows.append(ring)
    for i in range(nn if closed else nn - 1):
        A, B = rows[i], rows[(i + 1) % nn]
        for j in range(m):
            bm.faces.new((A[j], A[(j + 1) % m], B[(j + 1) % m], B[j]))
    if not closed:
        bm.faces.new(rows[0][::-1]); bm.faces.new(rows[-1])
    return obj_from_bm(name, bm, mat, coll, True)


def curve_obj(name, paths, mat, coll):
    """เส้นโค้ง NURBS มีความหนา (x, y, z, รัศมี) — แบบ gate3d make_objects"""
    import bpy
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 1.0; cu.bevel_resolution = 3; cu.use_fill_caps = True
    for pts in paths:
        sp = cu.splines.new('NURBS'); sp.points.add(len(pts) - 1); sp.use_endpoint_u = True; sp.order_u = 3 if len(pts) > 2 else 2
        for j, (x, y, z, r) in enumerate(pts): sp.points[j].co = (x, y, z, 1); sp.points[j].radius = r
    o = bpy.data.objects.new(name, cu); o.data.materials.append(mat); coll.objects.link(o)
    return o


def coll(sc, name):
    import bpy
    c = bpy.data.collections.new(name); sc.collection.children.link(c); return c


def freestyle(sc, collection, thick):
    import bpy
    sc.render.use_freestyle = True; sc.render.line_thickness_mode = 'ABSOLUTE'; sc.render.line_thickness = 1.0
    vl = bpy.context.view_layer; vl.use_freestyle = True
    fs = vl.freestyle_settings; fs.crease_angle = math.radians(140)
    ls = fs.linesets[0] if fs.linesets else fs.linesets.new('ink')
    ls.select_by_visibility = True; ls.select_by_collection = True; ls.collection = collection
    ls.select_silhouette = True; ls.select_border = True; ls.select_crease = True
    if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new('ink')
    ls.linestyle.color = (0.08, 0.05, 0.04); ls.linestyle.thickness = thick; ls.linestyle.alpha = 0.85


class Cam:
    """กล้องเกม (ออร์โธ เอียง TH, yaw 0) — screen(p): u = x, v = y·K + z·SN (ม. บนจอ)"""
    def __init__(self, sc):
        import bpy
        from mathutils import Vector
        self.sc = sc
        cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.sensor_fit = 'HORIZONTAL'; cam.clip_end = 400
        self.co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(self.co); sc.camera = self.co
        self.co.rotation_euler = (TH, 0, 0)
        self.d = Vector((0, math.sin(TH), -math.cos(TH))); self.up = Vector((0, math.cos(TH), math.sin(TH)))

    def bounds(self, objs, pad):
        import bpy
        bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
        us, vs = [], []
        for o in objs:
            ev = o.evaluated_get(dg); me = ev.to_mesh(); Mw = o.matrix_world
            for v in me.vertices:
                p = Mw @ v.co; us.append(p.x); vs.append(p.dot(self.up))
            ev.to_mesh_clear()
        return min(us) - pad, max(us) + pad, min(vs) - pad, max(vs) + pad

    def frame(self, u0, u1, v0, v1, ppm):
        from mathutils import Vector
        rx, ry = math.ceil((u1 - u0) * ppm), math.ceil((v1 - v0) * ppm)
        u1 = u0 + rx / ppm; v1 = v0 + ry / ppm
        self.co.data.ortho_scale = u1 - u0
        self.co.location = Vector(((u0 + u1) / 2, 0, 0)) + self.up * ((v0 + v1) / 2) - self.d * 60
        self.sc.render.resolution_x = rx; self.sc.render.resolution_y = ry; self.sc.render.resolution_percentage = 100
        self.box = (u0, u1, v0, v1, ppm)
        return rx, ry

    def px(self, p):
        from mathutils import Vector
        u0, u1, v0, v1, ppm = self.box; p = Vector(p)
        return [round((p.x - u0) * ppm, 2), round((v1 - p.dot(self.up)) * ppm, 2)]

    def shoot(self, path, samples):
        import bpy
        self.sc.cycles.samples = samples; self.sc.render.filepath = path
        bpy.ops.render.render(write_still=True)
        print('เรนเดอร์ →', path, self.sc.render.resolution_x, 'x', self.sc.render.resolution_y)


def catcher(sc):
    import bpy
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, -0.002)); pl = bpy.context.active_object
    pl.scale = (40, 40, 1); pl.is_shadow_catcher = True
    return pl


def ground_shot(cam, rect, center, path, samples):
    """ภาพพื้นแบบ A: กรอบ rect (พิกัดแมพ) ด้วยกล้องเกม — แกน v ของจอ = Y·K"""
    gx0, gy0, gx1, gy1 = rect
    u0, u1 = gx0 - center[0], gx1 - center[0]
    v1 = -(gy0 - center[1]) * K; v0 = -(gy1 - center[1]) * K
    cam.frame(u0, u1, v0, v1, RES_A)
    cam.sc.cycles.use_denoising = True
    cam.shoot(path, samples)
    cam.sc.cycles.use_denoising = False


# ---------------------------------------------------------------- แท่น Bifrost + เสาคริสตัล
def flat_glyph(bm, gl, cx, cy, z, w, h, rot, wd=0.035):
    """อักษรรูนแบน (แถบเส้น) บนพื้นราบ z — rot = หมุนรอบแกนตั้ง (0 = หัวอักษรชี้เหนือ)"""
    import gate3d as GT
    cr, sr = math.cos(rot), math.sin(rot)
    P = lambda x, y: (cx + x * cr - y * sr, cy + x * sr + y * cr)
    for (a, b) in GT.RUNES[gl]:
        x0, y0 = (a[0] - 0.5) * w, (a[1] - 0.5) * h; x1, y1 = (b[0] - 0.5) * w, (b[1] - 0.5) * h
        L = math.hypot(x1 - x0, y1 - y0) + wd; ang = math.atan2(y1 - y0, x1 - x0)
        ux, uy = math.cos(ang), math.sin(ang); vx, vy = -uy, ux; mx, my = (x0 + x1) / 2, (y0 + y1) / 2
        vs = [bm.verts.new((*P(mx + ux * su * L / 2 + vx * sv * wd / 2, my + uy * su * L / 2 + vy * sv * wd / 2), z)) for su, sv in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        bm.faces.new(vs)


def init_runes():
    import gate3d as GT, ridge3d as RG
    GT.RUNES = dict(RG.RUNES)
    GT.RUNES.update({
        'f': [((0.2, 0), (0.2, 1)), ((0.2, 1), (0.85, 0.72)), ((0.2, 0.66), (0.85, 0.4))],
        'u': [((0.15, 0), (0.15, 1)), ((0.15, 1), (0.85, 0.7)), ((0.85, 0.7), (0.85, 0))],
        'r': [((0.2, 0), (0.2, 1)), ((0.2, 1), (0.8, 0.75)), ((0.8, 0.75), (0.2, 0.5)), ((0.2, 0.5), (0.8, 0))],
        'k': [((0.3, 0), (0.3, 1)), ((0.3, 0.55), (0.85, 0.95)), ((0.3, 0.55), (0.85, 0.15))],
        'ing': [((0.5, 0), (0.95, 0.5)), ((0.95, 0.5), (0.5, 1)), ((0.5, 1), (0.05, 0.5)), ((0.05, 0.5), (0.5, 0))],
        'b': [((0.2, 0), (0.2, 1)), ((0.2, 1), (0.8, 0.75)), ((0.8, 0.75), (0.2, 0.5)), ((0.2, 0.5), (0.8, 0.25)), ((0.8, 0.25), (0.2, 0))],
        'w': [((0.2, 0), (0.2, 1)), ((0.2, 1), (0.8, 0.75)), ((0.8, 0.75), (0.2, 0.5))],
        's': [((0.3, 1), (0.3, 0.55)), ((0.3, 0.55), (0.7, 0.45)), ((0.7, 0.45), (0.7, 0))],
    })


def build_dais(sc, M):
    """แท่นกลม 2 ขั้น (ศูนย์กลาง = (0,0)) + วงสายรุ้งฝัง + ตรารูนกลาง — คืน collection"""
    import bmesh
    c = coll(sc, 'dais')
    (r0, z0), (r1, z1) = DAIS
    cyl('dais0', r0, -0.02, z0, M['stone'], c, seg=96)
    cyl('dais1', r1, z0, z1, M['stone'], c, seg=96)
    cyl('dais0_gold', r0 + 0.008, z0 - 0.022, z0 - 0.004, M['trim'], c, seg=96)       # แถบทองรอบขอบขั้นนอก
    cyl('dais1_gold', r1 + 0.008, z1 - 0.022, z1 - 0.004, M['trim'], c, seg=96)
    # วงสายรุ้ง 7 สีฝังบนแท่น (แถบบาง ๆ ซ้อนจากนอกเข้าใน: แดง → ม่วง) + เส้นทองคั่นสองข้าง
    ri, ro = 0.86, 1.18; n = len(RAINBOW); step = (ro - ri) / n
    for k, (name, col, _) in enumerate(RAINBOW):
        a, b = ro - step * (k + 1) + 0.004, ro - step * k - 0.004
        bm = bmesh.new()
        bmesh.ops.create_circle(bm, cap_ends=False, segments=96, radius=b)
        outer = list(bm.verts)
        bmesh.ops.create_circle(bm, cap_ends=False, segments=96, radius=a)
        inner = [v for v in bm.verts if v not in outer]
        for v in bm.verts: v.co.z = z1 + 0.002
        for i in range(96):
            bm.faces.new((outer[i], outer[(i + 1) % 96], inner[(i + 1) % 96], inner[i]))
        obj_from_bm(f'rb_{name}', bm, crystal_mat(f'rbm_{name}', col, 1.0), c)
    torus('rb_gold_o', ro + 0.012, 0.012, M['trim'], c, loc=(0, 0, z1), seg=(96, 6))
    torus('rb_gold_i', ri - 0.012, 0.012, M['trim'], c, loc=(0, 0, z1), seg=(96, 6))
    # ตรากลาง: วงรูนฟ้า (ใต้เท้า Keeper) + ดาวทอง 8 แฉก
    no_spill(torus('core_ring', 0.62, 0.014, M['rune'], c, loc=(0, 0, z1 + 0.004), seg=(96, 6)))
    bm = bmesh.new()
    for i, gl in enumerate(['f', 'u', 'th', 'o', 'r', 'k', 'ing', 'b', 'e', 'l', 'd', 's']):
        a = math.pi / 2 - i * 2 * math.pi / 12
        flat_glyph(bm, gl, 0.73 * math.cos(a), 0.73 * math.sin(a), z1 + 0.003, 0.09, 0.12, a - math.pi / 2, wd=0.018)
    no_spill(obj_from_bm('core_runes', bm, M['rune'], c))
    bm = bmesh.new(); ctr = bm.verts.new((0, 0, z1 + 0.006)); ring = []
    for i in range(16):
        a = math.pi / 2 + i * math.pi / 8; rr = 0.42 if i % 2 == 0 else 0.13
        ring.append(bm.verts.new((rr * math.cos(a), rr * math.sin(a), z1 + 0.004)))
    for i in range(16): bm.faces.new((ctr, ring[i], ring[(i + 1) % 16]))
    obj_from_bm('core_star', bm, M['trim'], c)
    return c


def build_pillar(sc, M, name, col, L, ph, x=0.0, y=0.0):
    """เสาคริสตัล 1 ต้น ที่ (x, y): ฐานหินอ่อนกลมขอบทอง + กรงเล็บทอง + คริสตัลหกเหลี่ยมปลายแหลม + คริสตัลเล็ก 2 แท่ง"""
    import gate3d as GT
    c = coll(sc, 'pil_' + name)
    cyl('ped0', 0.27, 0.0, 0.10, M['stone'], c, x, y, 48)
    cyl('ped1', 0.21, 0.10, 0.26, M['stone'], c, x, y, 48, r2=0.18)
    cyl('ped_gold', 0.225, 0.24, 0.30, M['trim'], c, x, y, 48)
    G = GT.Geo(); rnd = random.Random(int(ph * 1000))
    GT.shard(G, 'cry', 'C', (x, y, 0.24), (0, 0, 1), L, 0.12, rnd)
    for k in range(2):
        a = ph * 6.28 + k * 2.6
        GT.shard(G, 'cry', 'C', (x + 0.07 * math.cos(a), y + 0.07 * math.sin(a), 0.27), (0.45 * math.cos(a), 0.45 * math.sin(a), 1), L * rnd.uniform(0.28, 0.38), 0.06, rnd)
    import bpy
    cm = crystal_mat('cry_' + name, col, 1.3)
    for (mat, tag), (V, F) in G.b.items():
        me = bpy.data.meshes.new('cry'); me.from_pydata(V, [], F); me.update()
        o = bpy.data.objects.new('cry_' + name, me); o.data.materials.append(cm); c.objects.link(o)
    # กรงเล็บทอง 3 ซี่จับโคนคริสตัล
    claws = []
    for k in range(3):
        a = ph * 6.28 + k * 2 * math.pi / 3 + 0.5
        claws.append([(x + 0.19 * math.cos(a), y + 0.19 * math.sin(a), 0.28, 0.022), (x + 0.16 * math.cos(a), y + 0.16 * math.sin(a), 0.42, 0.018),
                      (x + 0.12 * math.cos(a), y + 0.12 * math.sin(a), 0.55, 0.012)])
    curve_obj('claw_' + name, claws, M['trim'], c)
    return c, (x, y, 0.24 + L)


def render_bifrost(out, samples, preview, only):
    import bpy
    init_runes()
    sc, so, M = scene_setup()
    cam = Cam(sc)
    ss = 1 if preview else SS
    meta = {}
    dais = build_dais(sc, M)
    pls = []
    for name, col, js, gx, gy, L, ph in pillars():
        c, tip = build_pillar(sc, M, name, col, L, ph, gx - BIF_C[0], -(gy - BIF_C[1]))
        pls.append((name, js, gx, gy, c, tip))
    allp = [o for p in pls for o in p[4].objects]
    if 'dais' in only:
        # A: แท่น + เงาเสาบนแท่น/พื้น (เสามองไม่เห็นแต่ทอดเงาและส่องแสงสี)
        for o in allp: o.visible_camera = False
        pl = catcher(sc)
        freestyle(sc, dais, 1.0 * ss)
        ground_shot(cam, BIF_RECT_A, BIF_C, os.path.join(out, 'dais.png'), max(8, samples // (2 if preview else 1)))
        bpy.data.objects.remove(pl)
        for o in allp: o.visible_camera = True
        meta['dais'] = {'rect': BIF_RECT_A}
    if 'pillars' in only:
        for o in dais.objects: o.hide_render = True
        meta['pillars'] = []
        for name, js, gx, gy, c, tip in pls:
            for p in pls:
                for o in p[4].objects: o.hide_render = p[4] is not c
            x0 = gx - BIF_C[0]; y0 = -(gy - BIF_C[1])
            u0, u1, v0, v1 = cam.bounds(list(c.objects), 0.1)
            cam.frame(u0, u1, v0, v1, GPX * ss)
            freestyle(sc, c, 1.3 * ss)
            cam.shoot(os.path.join(out, f'pillar_{name}.png'), samples)
            meta['pillars'].append({'name': name, 'glint': js, 'x': gx, 'y': gy, 'anchor': cam.px((x0, y0, 0)), 'tip': cam.px(tip),
                                    'mid': cam.px((tip[0], tip[1], tip[2] * 0.62)), 'ppm': GPX * ss})
        for o in dais.objects: o.hide_render = False
        for p in pls:
            for o in p[4].objects: o.hide_render = False
    return meta


# ---------------------------------------------------------------- Norn's Wheel
def wheel_face_mat(M):
    """หน้าวงล้อ = ภาพ gacha_wheel.webp (อัลฟาตัดขอบ) — แสงเงาจริง + เรืองแสงบางส่วนให้รูนสว่างเหมือนในหน้าต่างกาชา"""
    import bpy
    m, nt, b = new_mat('wheel_face')
    im = bpy.data.images.load(os.path.join(ROOT, 'assets', 'gacha_wheel.webp'), check_existing=True)
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = im; tex.interpolation = 'Cubic'
    uv = nt.nodes.new('ShaderNodeUVMap'); nt.links.new(uv.outputs['UV'], tex.inputs['Vector'])
    nt.links.new(tex.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.35; b.inputs['Metallic'].default_value = 0.0
    em = nt.nodes.new('ShaderNodeEmission'); nt.links.new(tex.outputs['Color'], em.inputs['Color']); em.inputs['Strength'].default_value = 1.0
    lit = nt.nodes.new('ShaderNodeMixShader'); lit.inputs['Fac'].default_value = 0.22          # 78% สีภาพเดิม + 22% แสงเงา/ไฮไลต์จริง
    nt.links.new(em.outputs[0], lit.inputs[1]); nt.links.new(b.outputs[0], lit.inputs[2])
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mx = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(tex.outputs['Alpha'], mx.inputs['Fac']); nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(lit.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
    try: m.blend_method = 'BLEND'
    except Exception: pass
    return m


def orb_mat():
    """ลูกแก้วกลางดุม: ฟ้าขาวเรือง ขอบเข้ม (ตามลูกแก้วในภาพวงล้อ)"""
    m, nt, b = new_mat('orb')
    b.inputs['Base Color'].default_value = (0.3, 0.55, 1.0, 1); b.inputs['Roughness'].default_value = 0.05
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.5
    r = nt.nodes.new('ShaderNodeValToRGB'); el = r.color_ramp.elements
    el[0].color = (0.92, 0.98, 1.0, 1); el[1].color = (0.18, 0.40, 1.0, 1); e = el.new(0.45); e.color = (0.45, 0.80, 1.0, 1)
    nt.links.new(lw.outputs['Facing'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], b.inputs['Emission Color'])
    b.inputs['Emission Strength'].default_value = 2.2
    return m


def build_norn(sc, M):
    """เครื่องวงล้อ (พิกัด Blender: (0,0,0) = จุดยึด NORN_AT • กลางแท่นอยู่ y = -NORN_OFF)
    คืน (base collection, wheel collection, rig, holdout disc, wheel center, rotation matrix ของระนาบวงล้อ)"""
    import bpy, bmesh
    from mathutils import Matrix, Vector, Euler
    base = coll(sc, 'norn_base'); wcol = coll(sc, 'norn_wheel'); face_c = coll(sc, 'norn_face')
    oy = -NORN_OFF
    # ---- แท่น 2 ขั้น + แถบทอง + วงเรืองฟ้า
    cyl('np0', 0.80, 0.0, 0.16, M['stone'], base, 0, oy, 96)
    cyl('np1', 0.64, 0.16, 0.30, M['stone'], base, 0, oy, 96)
    cyl('np0g', 0.81, 0.13, 0.155, M['trim'], base, 0, oy, 96)
    cyl('np1g', 0.65, 0.27, 0.295, M['trim'], base, 0, oy, 96)
    no_spill(torus('np_glow', 0.52, 0.012, M['rune'], base, loc=(0, oy, 0.30), seg=(96, 6)))
    # ---- เสาเกลียวทอง: แกนกลาง + เกลียวคู่ + ฐานบานทอง
    py = oy + 0.10 + WHEEL_Y
    cyl('post', 0.055, 0.28, WHEEL_Z, M['trim'], base, 0, py, 24)
    cyl('post_foot', 0.17, 0.28, 0.46, M['trim'], base, 0, py, 32, r2=0.06)
    hel = []
    for ph in (0.0, math.pi):
        pts = []
        N = 70
        for i in range(N + 1):
            u = i / N; z = 0.42 + (WHEEL_Z - 0.55) * u; a = ph + u * 2 * math.pi * 3.5
            pts.append((0.105 * math.cos(a), py + 0.105 * math.sin(a), z, 0.022))
        hel.append(pts)
    curve_obj('helix', hel, M['trim'], base)
    # ---- ด้าย 3 เส้นของนอร์น: กระสวยบนแท่น → พันขึ้นเสา (ด้ายเรืองสี) จนหายหลังวงล้อ
    for k, (nm, col) in enumerate(NORNS):
        a = math.radians((210, 90, 330)[k])
        sx, sy = 0.45 * math.cos(a), oy + 0.45 * math.sin(a)
        cyl(f'spool_{nm}_rod', 0.018, 0.30, 0.62, M['trim'], base, sx, sy, 12)
        cyl(f'spool_{nm}_top', 0.05, 0.60, 0.64, M['trim'], base, sx, sy, 16)
        cyl(f'spool_{nm}_bot', 0.06, 0.30, 0.34, M['trim'], base, sx, sy, 16)
        tm = emit_mat(f'thread_{nm}', col, 2.4)
        no_spill(cyl(f'spool_{nm}_yarn', 0.045, 0.34, 0.58, tm, base, sx, sy, 16, r2=0.035))
        pts = [(sx, sy, 0.55, 0.011)]
        ang0 = math.atan2(sy - py, sx)
        pts.append((sx * 0.55, py + (sy - py) * 0.55, 0.78, 0.011))
        N = 40
        for i in range(N + 1):
            u = i / N; z = 0.95 + (WHEEL_Z - 1.15) * u; aa = ang0 + u * 2 * math.pi * 2.2 + k * 0.4
            pts.append((0.15 * math.cos(aa), py + 0.15 * math.sin(aa), z, 0.011))
        no_spill(curve_obj(f'thread_{nm}', [pts], tm, base))
    # ---- ระนาบวงล้อ: เอนหลัง TILT (บนเอียงไปทางเหนือ) • แกน z ท้องถิ่น = หน้าวงล้อ (หันใต้-ขึ้นหากล้อง)
    C = Vector((0, oy + WHEEL_Y, WHEEL_Z))
    Rw = Matrix.Rotation(math.pi / 2 - TILT, 3, 'X')      # ระนาบ xy ท้องถิ่น (หน้า +z) → ตั้งขึ้นแล้วเอนหลัง: +z ท้องถิ่นชี้ใต้-ขึ้น (หากล้อง) • +y = บนของภาพ
    nrm = Rw @ Vector((0, 0, 1))
    # วงทองรอบวงล้อ (อยู่หลังหน้าวงล้อ) + แขนยึดกับเสา + เข็มชี้ทอง + อัญมณีฟ้าด้านบน
    torus('frame_ring', R_FRAME, 0.034, M['trim'], base, loc=tuple(C - nrm * 0.07), rot=Rw, seg=(128, 10))
    torus('frame_ring2', R_FRAME - 0.055, 0.014, M['trim'], base, loc=tuple(C - nrm * 0.075), rot=Rw, seg=(128, 6))
    for a in (math.radians(-35), math.radians(215)):
        p0 = C - nrm * 0.07 + Rw @ Vector((R_FRAME * math.cos(a), R_FRAME * math.sin(a), 0))
        curve_obj('arm', [[(*p0, 0.03), (*(C - nrm * 0.12 + Rw @ Vector((0.4 * math.cos(a), 0.4 * math.sin(a), 0))), 0.028), (0, py, WHEEL_Z - 0.55, 0.035)]], M['trim'], base)
    bm = bmesh.new()
    top = C + Rw @ Vector((0, R_FRAME + 0.02, 0))
    tip = C + Rw @ Vector((0, R_RIM - 0.13, 0)) + nrm * 0.07
    vs = [bm.verts.new(tuple(top + Rw @ Vector((-0.085, 0.02, 0)) + nrm * 0.06)), bm.verts.new(tuple(top + Rw @ Vector((0.085, 0.02, 0)) + nrm * 0.06)),
          bm.verts.new(tuple(tip)), bm.verts.new(tuple(top + Rw @ Vector((0, 0.02, 0)) + nrm * 0.11))]
    bm.faces.new((vs[0], vs[2], vs[1])); bm.faces.new((vs[0], vs[3], vs[2])); bm.faces.new((vs[1], vs[2], vs[3])); bm.faces.new((vs[0], vs[1], vs[3]))
    obj_from_bm('pointer', bm, M['trim'], base)
    bm = bmesh.new(); gc = top + Rw @ Vector((0, 0.13, 0)) + nrm * 0.05
    bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.075, matrix=Matrix.Translation(gc) @ Matrix.Diagonal((0.8, 1.0, 1.25, 1)))
    no_spill(obj_from_bm('top_gem', bm, crystal_mat('gem_cyan', (0.25, 0.85, 1.0), 2.0), base))
    # ---- วงล้อ (ลูกของ rig — หมุนรอบแกน z ท้องถิ่น = หมุนในระนาบหน้า)
    rig = bpy.data.objects.new('wheel_rig', None); sc.collection.objects.link(rig)
    rig.matrix_world = Matrix.Translation(C) @ Rw.to_4x4()
    T = 0.07
    def child(o):
        o.parent = rig; o.matrix_parent_inverse = Matrix.Identity(4); return o
    bm = bmesh.new()   # หน้าวงล้อ: วงกลม R_TEX + uv ตามภาพ
    n = 128
    cv = bm.verts.new((0, 0, T / 2 + 0.001)); ring = [bm.verts.new((R_TEX * math.cos(2 * math.pi * i / n), R_TEX * math.sin(2 * math.pi * i / n), T / 2 + 0.001)) for i in range(n)]
    uvl = bm.loops.layers.uv.new('UVMap')
    for i in range(n):
        f = bm.faces.new((cv, ring[i], ring[(i + 1) % n]))
        for lp in f.loops:
            lp[uvl].uv = (0.5 + lp.vert.co.x / (2 * R_TEX), 0.5 + lp.vert.co.y / (2 * R_TEX))
    face = child(obj_from_bm('wheel_face', bm, wheel_face_mat(M), face_c))
    body = child(cyl('wheel_body', R_RIM, -T / 2, T / 2, M['trim'], wcol, seg=128))
    back = child(cyl('wheel_back', R_RIM * 0.82, -T / 2 - 0.035, -T / 2, M['trim'], wcol, seg=64, r2=R_RIM * 0.88))
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=40, v_segments=24, radius=0.14, matrix=Matrix.Translation((0, 0, T / 2 + 0.05)))
    orb = no_spill(child(obj_from_bm('orb', bm, orb_mat(), wcol, True)))
    rings = [child(torus(f'orb_ring{i}', 0.175, 0.011, M['trim'], wcol, loc=(0, 0, T / 2 + 0.05), rot=Matrix.Rotation(r1, 3, 'X') @ Matrix.Rotation(r2, 3, 'Y'), seg=(64, 8)))
             for i, (r1, r2) in enumerate(((0.9, 0.3), (-0.5, 1.0)))]
    # หน้ากากเจาะฐาน (มองไม่เห็นในภาพจริง ใช้รอบหน้ากากเท่านั้น)
    bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=128, radius=R_HOLD)
    hold = obj_from_bm('holdout', bm, emit_mat('white', (1, 1, 1), 1.0), sc.collection)
    hold.matrix_world = Matrix.Translation(C + nrm * (T / 2 + 0.003)) @ Rw.to_4x4()
    hold.hide_render = True
    return base, wcol, face_c, rig, hold, C, Rw


def render_norn(out, samples, preview, only):
    import bpy
    from mathutils import Vector
    sc, so, M = scene_setup()
    cam = Cam(sc)
    ss = 1 if preview else SS; ppm = GPX * ss
    base, wcol, face_c, rig, hold, C, Rw = build_norn(sc, M)
    bobj = list(base.objects); wobj = list(wcol.objects) + list(face_c.objects)
    meta = {}
    # ---- ฐาน (วงล้อซ่อน แต่ยังทอดเงาลงแท่น/เสา)
    u0, u1, v0, v1 = cam.bounds(bobj + wobj, 0.12)
    cam.frame(u0, u1, v0, v1, ppm)
    for o in wobj: o.visible_camera = False
    freestyle(sc, base, 1.3 * ss)
    cam.shoot(os.path.join(out, 'norn_base.png'), samples)
    meta['base'] = {'anchor': cam.px((0, 0, 0)), 'ppm': ppm, 'size': [sc.render.resolution_x, sc.render.resolution_y]}
    # ---- หน้ากาก: แผ่นกลมสีขาวตรงหน้าวงล้อ ส่วนที่ฐานบัง (เข็มชี้/อัญมณี) เป็น holdout → อัลฟา = ส่วนของฐานที่อยู่หลังวงล้อ
    sc.render.use_freestyle = False
    for o in bobj: o.is_holdout = True
    hold.hide_render = False
    cam.shoot(os.path.join(out, 'norn_mask.png'), 4)
    hold.hide_render = True
    for o in bobj: o.is_holdout = False
    # ---- วงล้อ 24 เฟรม (ฐานไม่เข้ากล้อง/ไม่ทอดเงาบนวงล้อ — ภาพฐานวาดทับอยู่แล้ว)
    for o in bobj: o.visible_camera = False; o.visible_shadow = False
    for o in wobj: o.visible_camera = True
    hold.hide_render = False; hold.visible_camera = False; hold.visible_shadow = False
    bpy.context.view_layer.update()
    hu0, hu1, hv0, hv1 = cam.bounds([hold], 0.06)
    hold.hide_render = True
    cam.frame(hu0, hu1, hv0, hv1, ppm)
    freestyle(sc, wcol, 1.2 * ss)
    vt = (sc.view_settings.view_transform, sc.view_settings.look, sc.view_settings.exposure)
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = 0.0   # หน้าวงล้อเป็นภาพวาดอยู่แล้ว — AgX ทำสีซีด/ขาว
    try: sc.view_settings.look = 'None'
    except Exception: pass
    nf = 4 if preview else FRAMES
    for i in range(nf if 'frames' in only or 'norn' in only else 0):
        rig.rotation_euler = (0, 0, 0)
        from mathutils import Matrix
        rig.matrix_world = Matrix.Translation(C) @ Rw.to_4x4() @ Matrix.Rotation(-2 * math.pi * i / FRAMES, 4, 'Z')   # ตามเข็มนาฬิกาเมื่อมองจากหน้า
        cam.shoot(os.path.join(out, f'norn_wheel_{i:02d}.png'), samples)
    meta['wheel'] = {'center': cam.px(tuple(C)), 'anchor': cam.px((0, 0, 0)), 'ppm': ppm, 'frames': nf,
                     'c': round(math.sin(TILT + TH), 4), 'size': [sc.render.resolution_x, sc.render.resolution_y]}
    sc.view_settings.view_transform, sc.view_settings.look, sc.view_settings.exposure = vt
    # ---- เงาบนพื้น (ทุกชิ้นมองไม่เห็นแต่ทอดเงา) → ภาพพื้นแบบ A
    from mathutils import Matrix
    rig.matrix_world = Matrix.Translation(C) @ Rw.to_4x4()
    for o in bobj + wobj: o.visible_camera = False; o.visible_shadow = True
    sc.render.use_freestyle = False
    pl = catcher(sc)
    ground_shot(cam, NORN_RECT_A, NORN_AT, os.path.join(out, 'norn_shd.png'), max(8, samples // 2))
    bpy.data.objects.remove(pl)
    meta['shd'] = {'rect': NORN_RECT_A}
    return meta


def render(samples, out, only=None, preview=False):
    os.makedirs(out, exist_ok=True)
    only = only or ['dais', 'pillars', 'norn']
    mp = os.path.join(out, 'meta.json')
    meta = json.load(open(mp)) if os.path.exists(mp) else {}
    if 'dais' in only or 'pillars' in only:
        meta.update(render_bifrost(out, samples, preview, only))
    if 'norn' in only or 'frames' in only:
        meta.update({'norn': render_norn(out, samples, preview, only)})
    json.dump(meta, open(mp, 'w'), indent=1)
    print('meta →', mp)


# ============================================================
#  ติดตั้ง: ย่อ/ตัดขอบ/ปรับสี → assets + js/bake_data_eldheim_bifrost.js + manifest
# ============================================================
def install(src, kuw=False):
    from PIL import Image, ImageEnhance, ImageChops
    from tree3d import kuwahara, paint
    from slice_sheet import manifest
    d, _ = load_tiles()
    meta = json.load(open(os.path.join(src, 'meta.json')))
    A = os.path.join(ROOT, 'assets')
    s = PX / GPX

    def crop(im, thr=6):
        bb = im.getchannel('A').point(lambda v: 255 if v > thr else 0).getbbox()
        l, t, r, b = bb; l, t, r, b = max(0, l - 2), max(0, t - 2), min(im.width, r + 2), min(im.height, b + 2)
        return im.crop((l, t, r, b)), l, t

    def ground(path, rect, key, shadow=False):
        x0, y0, x1, y1 = rect
        im = Image.open(path).convert('RGBA').resize((round((x1 - x0) * PX), round((y1 - y0) * PX)), Image.LANCZOS)
        if shadow:   # เงาล้วน: สีม่วงเข้ม (แบบเงาซุ้มประตู gate3d) อัลฟาลดลง
            a = im.getchannel('A').point(lambda q: int(q * 0.6)); im = Image.merge('RGBA', (*Image.new('RGB', im.size, (18, 12, 24)).split(), a))
        else:
            im = paint(im, sat=1.12, con=1.04, bri=1.0, outline=False)
        im.save(os.path.join(A, key + '.webp'), 'WEBP', quality=88, method=6)
        print('ติดตั้ง', key, im.size)
        return {'img': key, 'x': x0, 'y': y0, 'w': round(x1 - x0, 3), 'h': round(y1 - y0, 3)}

    def sprite(im, ppm):
        f = GPX / ppm
        im = im.resize((round(im.width * f), round(im.height * f)), Image.LANCZOS)
        return im, f

    ground_e, pieces = [], []
    # ---------- แท่น Bifrost (A) ----------
    if 'dais' in meta:
        e = ground(os.path.join(src, 'dais.png'), meta['dais']['rect'], 'bake_bif_dais')
        e.update({'id': 'bif_dais', 'hash': d['hashBif'], 'hashRect': BIF_HASH_RECT}); ground_e.append(e)
    # ---------- เสาคริสตัล (B) ----------
    for p in meta.get('pillars', []):
        im = Image.open(os.path.join(src, f"pillar_{p['name']}.png")).convert('RGBA')
        if kuw: im = kuwahara(im, max(2, round(3 * p['ppm'] / (GPX * SS))))
        im, f = sprite(im, p['ppm'])
        im = paint(im, sat=1.35, con=1.06, bri=1.02, outline=True, ow=3)   # คริสตัลสีอิ่มขึ้น (AgX ทำสีเรืองซีด)
        im, l, t = crop(im)
        key = f"bake_bif_pillar_{p['name']}"
        im.save(os.path.join(A, key + '.webp'), 'WEBP', quality=90, method=6)
        ax, ay = p['anchor'][0] * f - l, p['anchor'][1] * f - t
        jars = [[round(p['tip'][0] * f - l, 1), round(p['tip'][1] * f - t + 3, 1), 1.0], [round(p['mid'][0] * f - l, 1), round(p['mid'][1] * f - t, 1), 0.55]]
        pieces.append({'id': f"bif_{p['name']}", 'img': key, 'x': p['x'], 'y': p['y'], 'ax': round(ax, 1), 'ay': round(ay, 1), 'scale': s,
                       'block': [], 'jars': jars, 'glint': p['glint'], 'fade': 0.5, 'hash': d['hashBif'], 'hashRect': BIF_HASH_RECT})
        print('ติดตั้ง', key, im.size, 'anchor', round(ax, 1), round(ay, 1))
    # ---------- Norn's Wheel ----------
    norn = None
    if 'norn' in meta:
        m = meta['norn']
        # ฐาน: เจาะส่วนหลังวงล้อด้วยหน้ากาก
        im = Image.open(os.path.join(src, 'norn_base.png')).convert('RGBA')
        mk = Image.open(os.path.join(src, 'norn_mask.png')).convert('RGBA').getchannel('A')
        a = ImageChops.multiply(im.getchannel('A'), ImageChops.invert(mk)); im.putalpha(a)
        if kuw: im = kuwahara(im, max(2, round(3 * m['base']['ppm'] / (GPX * SS))))
        im, f = sprite(im, m['base']['ppm'])
        im = paint(im, sat=1.12, con=1.05, bri=1.02, outline=False)
        im, l, t = crop(im)
        im.save(os.path.join(A, 'bake_norn_base.webp'), 'WEBP', quality=90, method=6)
        bax, bay = m['base']['anchor'][0] * f - l, m['base']['anchor'][1] * f - t
        print('ติดตั้ง bake_norn_base', im.size, 'anchor', round(bax, 1), round(bay, 1))
        # วงล้อ: ชีต 6 คอลัมน์ ทุกเฟรมตัดกรอบเดียวกัน (ศูนย์กลางวงล้ออยู่ที่เดิมทุกช่อง)
        w = m['wheel']; nf = w['frames']
        frs = []
        for i in range(nf):
            fr = Image.open(os.path.join(src, f'norn_wheel_{i:02d}.png')).convert('RGBA')
            fr, f = sprite(fr, w['ppm'])
            frs.append(paint(fr, sat=1.06, con=1.03, bri=1.0, outline=False))
        bb = None
        for fr in frs:
            b = fr.getchannel('A').point(lambda v: 255 if v > 4 else 0).getbbox()
            bb = b if bb is None else (min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3]))
        l, t, r, b = max(0, bb[0] - 1), max(0, bb[1] - 1), min(frs[0].width, bb[2] + 1), min(frs[0].height, bb[3] + 1)
        fw, fh = r - l, b - t; cols = min(SHEET_COLS, nf); rows = math.ceil(nf / cols)
        sheet = Image.new('RGBA', (fw * cols, fh * rows), (0, 0, 0, 0))
        for i, fr in enumerate(frs): sheet.paste(fr.crop((l, t, r, b)), ((i % cols) * fw, (i // cols) * fh))
        sheet.save(os.path.join(A, 'bake_norn_wheel.webp'), 'WEBP', quality=90, method=6)
        cx, cy = w['center'][0] * f - l, w['center'][1] * f - t           # ศูนย์กลางวงล้อในช่องเฟรม (px ไฟล์)
        wax, way = w['anchor'][0] * f, w['anchor'][1] * f                   # จุดยึดในกรอบเฟรม (ก่อนตัด)
        print('ติดตั้ง bake_norn_wheel', sheet.size, 'เฟรม', nf, 'ช่อง', fw, fh, 'กลาง', round(cx, 1), round(cy, 1))
        e = ground(os.path.join(src, 'norn_shd.png'), m['shd']['rect'], 'bake_norn_shd', shadow=True)
        e.update({'id': 'norn_shd', 'hash': d['hashNorn'], 'hashRect': NORN_HASH_RECT}); ground_e.append(e)
        norn = {'hash': d['hashNorn'], 'hashRect': NORN_HASH_RECT, 'x': NORN_AT[0], 'y': NORN_AT[1], 'scale': s,
                'base': {'img': 'bake_norn_base', 'ax': round(bax, 1), 'ay': round(bay, 1)},
                'wheel': {'img': 'bake_norn_wheel', 'n': nf, 'cols': cols, 'fw': fw, 'fh': fh, 'cx': round(cx, 1), 'cy': round(cy, 1),
                          'dx': round((w['center'][0] - w['anchor'][0]) * f * s, 2), 'dy': round((w['center'][1] - w['anchor'][1]) * f * s, 2), 'c': w['c']}}
    js = ("'use strict';\n// สร้างอัตโนมัติโดย tools/bifrost3d.py --install — อย่าแก้ด้วยมือ (แก้ใน tools/bifrost3d.py แล้วติดตั้งใหม่)\n"
          "// แท่น Bifrost + เสาคริสตัลสายรุ้ง 7 ต้น + Norn's Wheel 3D ใน Neo Eldheim (docs/RENDER3D_PLAN.md #13) — โหลดต่อจาก js/bake_data*.js อื่น\n"
          "// ต่อท้ายเข้า BAKE_DATA.eldheim (ground/pieces) โดยไม่ทับของเดิม (น้ำพุ #11 ฯลฯ) • ทุกชิ้นมี hash+hashRect ของตัวเอง (js/bake.js Bake.rectOk)\n"
          "//   ผังช่องในกรอบเปลี่ยน = ไม่วางชิ้นนั้น • เสาคริสตัลไม่ชน (block ว่าง) • jars = ประกายปลายคริสตัล (สี glint)\n"
          "// NORN_BAKE = เครื่องวงล้อ (js/gacha.js Gacha.drawMachine): base = ฐานนิ่ง (ส่วนหลังวงล้อโปร่ง วาดทับวงล้อ) • wheel = ชีตเฟรมหมุน\n"
          "//   n เฟรม/รอบ ตามเข็มนาฬิกา, ช่องละ fw×fh px, cx,cy = ศูนย์กลางวงล้อในช่อง • dx,dy = ศูนย์กลางวงล้อเทียบจุดยึด (px ที่ 1×) • c = อัตราบีบแนวตั้งของหน้าวงล้อบนจอ\n"
          "{\n  const E = BAKE_DATA.eldheim || (BAKE_DATA.eldheim = { map: 'eldheim', ground: [], pieces: [] });\n"
          f"  E.ground = (E.ground || []).concat({json.dumps(ground_e, separators=(',', ':'), ensure_ascii=False)});\n"
          f"  E.pieces = (E.pieces || []).concat({json.dumps(pieces, separators=(',', ':'), ensure_ascii=False)});\n"
          "}\n"
          f"const NORN_BAKE = {json.dumps(norn, separators=(',', ':'))};\n")
    open(os.path.join(ROOT, 'js', 'bake_data_eldheim_bifrost.js'), 'w').write(js)
    print('เขียน js/bake_data_eldheim_bifrost.js')
    manifest()


if __name__ == '__main__':
    a = sys.argv
    arg = lambda k, dflt: a[a.index(k) + 1] if k in a else dflt
    if '--extract' in a: extract()
    elif '--plan' in a: plan()
    elif '--install' in a: install(a[a.index('--install') + 1], '--kuwahara' in a)
    elif '--render' in a:
        only = arg('--only', '').split(',') if '--only' in a else None
        render(int(arg('--samples', 32)), arg('--out', '/tmp/bifrost3d'), only, '--preview' in a)
    else: print(__doc__)
