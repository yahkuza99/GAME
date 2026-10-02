"""ต้นไม้ยักษ์ประจำแมพ Wolfwood ("ต้นหมาป่าเก่า") — โมเดลด้วย bpy แล้วอบเป็นภาพ 2D (docs/RENDER3D_PLAN.md ข้อ #15)

  B (สไปรต์ตั้งตรง): ลำต้น 2.5 ม. + รากค้ำโคน + ยอดเป็นก้อนพุ่มใบแรเงาเป็นขั้นแบบภาพวาด (กว้าง ~9.5 ม. ยอดสูง ~10 ม.)
                + โทเท็มหัวหมาป่าสลักบนลำต้น (ตาเรือง) + รูนสลัก + ผ้า/ริบบิ้นรูนผูกกิ่งต่ำ + เห็ดเรืองที่โคน
                → assets/bake_wolf_tree.webp เรียงความลึกกับตัวละคร (js/bake.js Bake.draw — จางเมื่อผู้เล่นอยู่หลัง + ไหวลมเบา ๆ)
                กล้องเดียวกับเกมทุกประการ (ออร์โธ เอียง acos(0.76) จากแนวดิ่ง yaw 0) ไม่ยืดภาพ → โคนตรงช่องพอดี
  A (อบลงพื้น): รากผิวดินที่แผ่ออก ~6 ม. + เฟิร์น + หินเล็ก + เห็ดเรืองกอเล็ก + เงาใต้พุ่ม → assets/bake_wolf_tree_roots.webp
                วาดลงผ้าใบพื้น (Bake.ground) — ของเตี้ย ≤ 0.35 ม. (ยื่นขึ้นเหนือ < 0.3 ช่อง) ไม่บังใคร ตัวละครเดินทับรากได้
                (ลำต้น/พุ่มไม่ทอดเงาในภาพนี้ — เงานุ่มใต้พุ่มวาดตอนติดตั้งแบบเงาต้นไม้ Flora)
ตำแหน่ง: ริมลานโล่งกลางแมพ ด้านตะวันตกของถนนดินเหนือ-ใต้ (ถนน x 33–36) — ผู้เล่นเดินผ่านเห็นทุกคน
         ผังช่องดึงจากเกมจริง (Playwright: new GameMap('wolfwood',{lite:true})) → tools/tree3d_tiles.json
         hash = ผังช่องในกรอบ HASH_RECT (ก่อน Bake.layout แก้ผัง) — ผังเปลี่ยน = เกมไม่วางต้นไม้เลย (js/bake.js Bake.data)
ชน: ลำต้น 2×2 ช่อง (block) • ต้นไม้ Flora ในวงรี CLEAR_TREE กลายเป็นหญ้า (Bake.layout — ยอดไม่บังต้นยักษ์)
แสง: key ซ้ายบน (sun z = -135° → เงาตกขวาล่าง) + rim แสงจันทร์ฟ้าจากขวา (ชุดเดียวกับ tools/ridge3d.py) • เห็ด/ตาโทเท็ม = emission
      พุ่มใบ = emission แรเงาเองจาก N·L ทิศเดียวกับ sun (cel 5 ขั้น) + AO + แต้มใบสว่าง → สีคุมได้ตรงแบบต้นไม้ภาพวาด
สไตล์: เส้นขอบ Freestyle สีน้ำตาลเข้ม • ตอนติดตั้ง: ฟิลเตอร์ Kuwahara (ผิวเป็นแปรง) + เพิ่มความอิ่มสี + เส้นขอบนอก

ใช้:
  python3 tools/tree3d.py --extract                        (ต้องมี node + playwright) → tools/tree3d_tiles.json
  python3 tools/tree3d.py --plan                           (พิมพ์ผังรอบต้นไม้ + ตรวจช่องชน)
  /tmp/bvenv/bin/python tools/tree3d.py --render [--samples 32] [--out /tmp/tree3d] [--only tree,roots] [--preview]
  python3 tools/tree3d.py --install /tmp/tree3d            (→ assets/bake_wolf_tree*.webp + js/bake_data_wolfwood.js + manifest)
"""
import math, os, sys, json, random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
TILES = os.path.join(ROOT, 'tools', 'tree3d_tiles.json')
MAP_ID = 'wolfwood'
K = 0.76                       # R.K ในเกม
TH = math.acos(K)              # 40.5° จากแนวดิ่ง
SN = math.sin(TH)              # 0.65
PX = 40                        # TILE
RES_B = 160                    # เรนเดอร์สไปรต์ 4× → ติดตั้ง 2× (80 px/ม.) เกมวาด ×0.5
STORE_B = 80
RES_A = 80                     # ภาพพื้นเรนเดอร์ 2× → ติดตั้ง 1× (40 px/ม. เท่าผ้าใบพื้น)
GX, GY = 29.0, 54.0            # ศูนย์กลางลำต้น (พิกัดแมพ) = มุมร่วมของ 4 ช่องชน = (0,0,0) ใน Blender (+Y = เหนือ)
ANCHOR_Y = 54.95               # จุดเรียงความลึก/จุดยึด = ขอบใต้ของช่องชน (หน้าลำต้น)
BLOCK = [[28, 53], [29, 53], [28, 54], [29, 54]]
HASH_RECT = [20, 44, 39, 64]   # x0, y0, x1, y1 (ไม่รวม x1/y1) — ลานรอบต้นไม้ + ถนน
CLEAR_TREE = {'x': GX, 'y': GY - 1.0, 'rx': 6.5, 'ry': 7.5}   # ต้นไม้ Flora ในวงรีนี้ → หญ้า (ยอดไม่ซ้อนต้นยักษ์)
FREE_R = 2.6                   # ของประดับ (พุ่ม/เฟิร์น/เห็ด prop) ในรัศมีนี้รอบลำต้นถูกเอาออก (รากอบลงพื้นแทน)
A_RECT = (GX - 4.5, GY - 3.6, GX + 5.0, GY + 4.4)   # กรอบภาพพื้น (x0, y0, x1, y1 พิกัดแมพ)
TRUNK_R = 1.2
CANOPY_C = (-0.2, 1.2, 7.65)  # ศูนย์กลางทรงพุ่ม (Blender) • รัศมีวงรี
CANOPY_R = (4.3, 2.9, 2.35)
EYE = (0.45, 0.95, 1.0)        # ตาโทเท็ม/รูน ฟ้าอมเขียว
MUSH_COL = '140,255,170'
SUN_DIR = (-0.491, 0.491, 0.719)    # ทิศไปหาแสง sun (rotation (44°, 0, -135°) ใน ridge3d.common_scene) — ใช้แรเงาพุ่มใบแบบขั้น
MOON_DIR = (0.900, 0.159, 0.407)    # ทิศไปหาแสงจันทร์ (rotation (66°, 0, 100°))
# กอเห็ดเรือง (พิกัด Blender): B = บนพูรากค้ำ (x, y, z, จำนวน, ขนาด) • A = บนรากผิวดิน (x, y)
MUSH_B = [(-1.35, -1.55, 0.03, 6, 1.25), (1.5, -1.3, 0.03, 4, 1.0), (-2.0, 0.2, 0.03, 3, 0.9)]
MUSH_A = [(-2.6, -1.9), (2.5, -2.0), (3.0, 0.4), (-3.1, -0.2), (0.6, -2.6)]


def fnv_rect(tiles, w, rect):
    """hash ผังช่องในกรอบ (ค่าชนิดช่องตรง ๆ) — ตรงกับ Bake.data() ใน js/bake.js (d.hashRect)"""
    x0, y0, x1, y1 = rect; h = 0x811c9dc5
    for y in range(y0, y1):
        for x in range(x0, x1):
            h ^= tiles[y * w + x]; h = (h * 0x01000193) & 0xffffffff
    return h


def to_b(gx, gy, z=0.0):
    return (gx - GX, -(gy - GY), z)


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
    # ลบ BAKE_DATA.wolfwood ก่อนสร้างแมพ → ได้ผังก่อน Bake.layout แก้ (ตรงกับที่เกมคำนวณ hash)
    js = """const { chromium } = require('playwright');
(async () => { const o = { headless: true }; if (require('fs').existsSync('/opt/pw-browsers/chromium')) o.executablePath = '/opt/pw-browsers/chromium';
  const b = await chromium.launch(o), p = await b.newPage(); await p.goto(process.argv[2]);
  await p.waitForFunction(() => typeof GameMap !== 'undefined');
  const r = await p.evaluate(id => { if (typeof BAKE_DATA !== 'undefined') delete BAKE_DATA[id];
    const m = new GameMap(id, { lite: true }); return { w: m.w, h: m.h, tiles: Array.from(m.tiles), portals: m.portals.map(q => [q.ax, q.ay]) }; }, process.argv[3]);
  console.log(JSON.stringify(r)); await b.close(); })();"""
    f = os.path.join(tempfile.gettempdir(), 'tree3d_extract.js'); open(f, 'w').write(js)
    env = dict(os.environ); env.setdefault('NODE_PATH', subprocess.check_output(['npm', 'root', '-g'], text=True).strip())
    out = subprocess.check_output(['node', f, f'http://127.0.0.1:{srv.server_address[1]}/index.html', MAP_ID], env=env, text=True)
    srv.shutdown()
    r = json.loads(out.strip().splitlines()[-1]); w, h = r['w'], r['h']
    data = {'map': MAP_ID, 'w': w, 'h': h, 'portals': r['portals'],
            'rows': [''.join('0123456789AB'[v] for v in r['tiles'][y * w:(y + 1) * w]) for y in range(h)],
            'hash': fnv_rect(r['tiles'], w, HASH_RECT)}
    json.dump(data, open(TILES, 'w'), indent=0)
    print('ผังช่อง →', TILES, 'hash', data['hash'])


def load_tiles():
    d = json.load(open(TILES))
    tiles = [int(c, 16) for row in d['rows'] for c in row]
    assert fnv_rect(tiles, d['w'], HASH_RECT) == d['hash']
    return d, tiles


def plan():
    """พิมพ์ผังรอบต้นไม้ + ตรวจ: ช่องชนต้องเป็นหญ้า/ดอกไม้ (ไม่ทับถนน/ต้นไม้/น้ำ) และประตูยังเดินถึงกันได้"""
    d, tiles = load_tiles(); w, h = d['w'], d['h']
    T = lambda x, y: tiles[y * w + x]
    cl = CLEAR_TREE
    t2 = list(tiles)
    for y in range(h):
        for x in range(w):
            if t2[y * w + x] == 1 and ((x + 0.5 - cl['x']) / cl['rx']) ** 2 + ((y + 0.5 - cl['y']) / cl['ry']) ** 2 <= 1: t2[y * w + x] = 0
    blk = {tuple(b) for b in BLOCK}
    ch = '.T~=sWfcRHF'
    for y in range(HASH_RECT[1] - 2, HASH_RECT[3] + 2):
        print('%3d ' % y + ''.join('#' if (x, y) in blk else ch[t2[y * w + x]] for x in range(w)))
    print('    ' + ''.join(str(x % 10) for x in range(w)))
    bad = [b for b in BLOCK if T(*b) not in (0, 6)]
    print('ช่องชนที่ไม่ใช่หญ้า:', bad or 'ไม่มี')
    solid = {1, 2, 5, 8, 9, 10}
    walk = lambda x, y: 0 <= x < w and 0 <= y < h and t2[y * w + x] not in solid and (x, y) not in blk
    st = [tuple(d['portals'][0])]; seen = {st[0]}
    while st:
        x, y = st.pop()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (x + dx, y + dy)
            if q not in seen and walk(*q): seen.add(q); st.append(q)
    print('ประตูเดินถึงกัน:', all(tuple(p) in seen for p in d['portals']))
    print('ต้นไม้ Flora ที่เคลียร์:', sum(1 for i in range(w * h) if tiles[i] == 1 and t2[i] == 0))


# ============================================================
#  ฉาก Blender
# ============================================================
def build(samples, outdir, only=None, preview=False):
    import bpy, bmesh
    from mathutils import Vector, Matrix, noise
    from ridge3d import common_scene, freestyle, mesh_obj, fern, lump, root_curve, RUNES
    os.makedirs(outdir, exist_ok=True)
    rnd = random.Random(404)
    sc = common_scene()
    sc.cycles.max_bounces = 6; sc.cycles.transparent_max_bounces = 16

    def L(nt, a, b): nt.links.new(a, b)

    def new(name):
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
        return m, nt, nt.nodes['Principled BSDF']

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
        L(nt, fac, r.inputs['Fac']); return r.outputs['Color']

    def bark_mat(name='bark', moss=1.0):   # moss = ความหนาของมอส (คูณ)
        """เปลือกไม้แก่: ร่องแนวตั้งเข้ม (นอยส์ยืดตามแกน z) สีน้ำตาลอุ่นแบบต้นไม้ภาพวาด + มอสบนผิวหงาย/ด้านเหนือ"""
        m, nt, b = new(name)
        tc = nt.nodes.new('ShaderNodeTexCoord')
        mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (5.0, 5.0, 0.9); L(nt, tc.outputs['Object'], mp.inputs['Vector'])
        nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 1.6; nz.inputs['Detail'].default_value = 5; nz.inputs['Distortion'].default_value = 0.6
        L(nt, mp.outputs['Vector'], nz.inputs['Vector'])
        col = ramp(nt, nz.outputs['Fac'], [(0.36, (0.055, 0.025, 0.012)), (0.5, (0.20, 0.095, 0.04)), (0.66, (0.36, 0.19, 0.08))])
        geo = nt.nodes.new('ShaderNodeNewGeometry'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); L(nt, geo.outputs['Normal'], sep.inputs[0])
        up = nt.nodes.new('ShaderNodeMapRange'); up.inputs['From Min'].default_value = 0.35; up.inputs['From Max'].default_value = 0.8
        L(nt, sep.outputs['Z'], up.inputs['Value'])
        nm = nt.nodes.new('ShaderNodeMapRange'); nm.inputs['From Min'].default_value = 0.2; nm.inputs['From Max'].default_value = 0.9
        nm.inputs['To Max'].default_value = 0.75; L(nt, sep.outputs['Y'], nm.inputs['Value'])
        mx = nt.nodes.new('ShaderNodeMath'); mx.operation = 'MAXIMUM'; L(nt, up.outputs['Result'], mx.inputs[0]); L(nt, nm.outputs['Result'], mx.inputs[1])
        mn = nt.nodes.new('ShaderNodeTexNoise'); mn.inputs['Scale'].default_value = 2.2; mn.inputs['Detail'].default_value = 4; L(nt, tc.outputs['Object'], mn.inputs['Vector'])
        mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.45; mr.inputs['From Max'].default_value = 0.6; L(nt, mn.outputs['Fac'], mr.inputs['Value'])
        mm = nt.nodes.new('ShaderNodeMath'); mm.operation = 'MULTIPLY'; L(nt, mx.outputs['Value'], mm.inputs[0]); L(nt, mr.outputs['Result'], mm.inputs[1])
        mm2 = nt.nodes.new('ShaderNodeMath'); mm2.operation = 'MULTIPLY'; mm2.inputs[1].default_value = moss; L(nt, mm.outputs['Value'], mm2.inputs[0])
        col = mixc(nt, col, (0.16, 0.36, 0.09), mm2.outputs['Value'])
        L(nt, col, b.inputs['Base Color']); b.inputs['Roughness'].default_value = 0.9
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.7; bp.inputs['Distance'].default_value = 0.06
        L(nt, nz.outputs['Fac'], bp.inputs['Height']); L(nt, bp.outputs['Normal'], b.inputs['Normal'])
        return m

    def leaf_mat():
        """พุ่มใบแบบภาพวาด (cel shading ด้วยมือ): สี = ระดับแสงเป็นขั้นจาก N·L (ทิศแสงเดียวกับ sun ซ้ายบน)
        + ขอบขั้นหยักด้วยนอยส์ (ปลายพู่กัน) + แต้มใบสว่างลาย Voronoi บนด้านรับแสง + AO แยกก้อน + ขอบแสงจันทร์ฟ้าจากขวา
        → ใช้ Emission (ไม่พึ่งแสงฉาก) คุมโทนได้ตรงเหมือนต้นไม้ภาพวาดของเกม"""
        m = bpy.data.materials.new('leaf'); m.use_nodes = True; nt = m.node_tree
        nt.nodes.remove(nt.nodes['Principled BSDF'])
        tc = nt.nodes.new('ShaderNodeTexCoord'); geo = nt.nodes.new('ShaderNodeNewGeometry')
        # นอยส์บิด normal → ขอบขั้นแสงเป็นแต้ม ๆ
        nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.9; nz.inputs['Detail'].default_value = 2
        L(nt, tc.outputs['Object'], nz.inputs['Vector'])
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.6; bp.inputs['Distance'].default_value = 0.5
        L(nt, nz.outputs['Fac'], bp.inputs['Height'])
        dot = nt.nodes.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'; dot.inputs[1].default_value = SUN_DIR
        L(nt, bp.outputs['Normal'], dot.inputs[0])
        # ความต่างต่อก้อน (สุ่มต่อวัตถุ) เลื่อนระดับแสงเล็กน้อย
        oi = nt.nodes.new('ShaderNodeObjectInfo')
        jr = nt.nodes.new('ShaderNodeMapRange'); jr.inputs['To Min'].default_value = -0.12; jr.inputs['To Max'].default_value = 0.12
        L(nt, oi.outputs['Random'], jr.inputs['Value'])
        lit = nt.nodes.new('ShaderNodeMath'); lit.operation = 'ADD'; L(nt, dot.outputs['Value'], lit.inputs[0]); L(nt, jr.outputs['Result'], lit.inputs[1])
        # ใต้พุ่มมืดลง (ความสูงในทรงพุ่ม)
        sep = nt.nodes.new('ShaderNodeSeparateXYZ'); L(nt, geo.outputs['Position'], sep.inputs[0])
        hz = nt.nodes.new('ShaderNodeMapRange'); hz.inputs['From Min'].default_value = CANOPY_C[2] - CANOPY_R[2]; hz.inputs['From Max'].default_value = CANOPY_C[2] + 0.3 * CANOPY_R[2]
        hz.inputs['To Min'].default_value = -0.45; hz.inputs['To Max'].default_value = 0.0
        L(nt, sep.outputs['Z'], hz.inputs['Value'])
        lit2 = nt.nodes.new('ShaderNodeMath'); lit2.operation = 'ADD'; L(nt, lit.outputs['Value'], lit2.inputs[0]); L(nt, hz.outputs['Result'], lit2.inputs[1])
        r = nt.nodes.new('ShaderNodeValToRGB'); r.color_ramp.interpolation = 'CONSTANT'; el = r.color_ramp.elements
        bands = [(0.0, (0.018, 0.070, 0.060)), (0.38, (0.040, 0.150, 0.075)), (0.56, (0.090, 0.280, 0.080)), (0.74, (0.200, 0.440, 0.090)), (0.88, (0.380, 0.600, 0.130))]
        el[0].position, el[0].color = bands[0][0], (*bands[0][1], 1); el[1].position, el[1].color = bands[-1][0], (*bands[-1][1], 1)
        for pp, c in bands[1:-1]: e = el.new(pp); e.color = (*c, 1)
        fac = nt.nodes.new('ShaderNodeMapRange'); fac.inputs['From Min'].default_value = -1.0; fac.inputs['From Max'].default_value = 1.0
        L(nt, lit2.outputs['Value'], fac.inputs['Value']); L(nt, fac.outputs['Result'], r.inputs['Fac'])
        col = r.outputs['Color']
        # แต้มใบสว่าง (กลุ่มใบแบบภาพวาด) เฉพาะด้านรับแสง
        vo = nt.nodes.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = 1.7; vo.feature = 'F1'
        L(nt, tc.outputs['Object'], vo.inputs['Vector'])
        vd = nt.nodes.new('ShaderNodeMapRange'); vd.inputs['From Min'].default_value = 0.26; vd.inputs['From Max'].default_value = 0.2
        L(nt, vo.outputs['Distance'], vd.inputs['Value'])
        lm = nt.nodes.new('ShaderNodeMapRange'); lm.inputs['From Min'].default_value = 0.25; lm.inputs['From Max'].default_value = 0.45
        L(nt, lit2.outputs['Value'], lm.inputs['Value'])
        sp = nt.nodes.new('ShaderNodeMath'); sp.operation = 'MULTIPLY'; L(nt, vd.outputs['Result'], sp.inputs[0]); L(nt, lm.outputs['Result'], sp.inputs[1])
        col = mixc(nt, col, (0.50, 0.70, 0.17), sp.outputs['Value'])
        # ขอบแสงจันทร์ฟ้าจากขวา
        dm = nt.nodes.new('ShaderNodeVectorMath'); dm.operation = 'DOT_PRODUCT'; dm.inputs[1].default_value = MOON_DIR
        L(nt, bp.outputs['Normal'], dm.inputs[0])
        rm = nt.nodes.new('ShaderNodeMapRange'); rm.inputs['From Min'].default_value = 0.74; rm.inputs['From Max'].default_value = 0.8; rm.inputs['To Max'].default_value = 0.3
        L(nt, dm.outputs['Value'], rm.inputs['Value'])
        col = mixc(nt, col, (0.14, 0.38, 0.30), rm.outputs['Result'])
        # AO แยกก้อนพุ่ม
        ao = nt.nodes.new('ShaderNodeAmbientOcclusion'); ao.inputs['Distance'].default_value = 0.9; ao.samples = 8
        ar = nt.nodes.new('ShaderNodeMapRange'); ar.inputs['To Min'].default_value = 0.35; L(nt, ao.outputs['AO'], ar.inputs['Value'])
        col = mixc(nt, col, ar.outputs['Result'], 1.0, 'MULTIPLY')
        em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1.0; L(nt, col, em.inputs['Color'])
        L(nt, em.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
        return m

    def flat(name, c0, c1, scale=4.0, rough=0.8, emit=None, estr=0.0):
        m, nt, b = new(name)
        tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = 4
        L(nt, tc.outputs['Object'], nz.inputs['Vector'])
        L(nt, ramp(nt, nz.outputs['Fac'], [(0.3, c0), (0.7, c1)]), b.inputs['Base Color'])
        b.inputs['Roughness'].default_value = rough
        if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = estr
        return m

    def glow(name, col, strength, base=None):
        m, nt, b = new(name)
        b.inputs['Base Color'].default_value = (*(base or col), 1); b.inputs['Roughness'].default_value = 0.35
        b.inputs['Emission Color'].default_value = (*col, 1); b.inputs['Emission Strength'].default_value = strength
        return m

    M = {
        'bark': bark_mat(), 'rootbark': bark_mat('rootbark', 0.3), 'leaf': leaf_mat(),
        'core': flat('core', (0.015, 0.05, 0.035), (0.03, 0.09, 0.05), 3.0, 0.9),
        'wood': flat('woodcut', (0.52, 0.30, 0.13), (0.70, 0.46, 0.24), 9.0, 0.8),       # เนื้อไม้ที่ลอกเปลือกสลัก
        'carve': flat('carve', (0.26, 0.14, 0.06), (0.40, 0.24, 0.11), 7.0, 0.75),       # หัวหมาป่าสลัก
        'dark': flat('dark', (0.04, 0.025, 0.02), (0.08, 0.05, 0.03), 5.0, 0.6),
        'root': flat('root', (0.17, 0.10, 0.055), (0.36, 0.23, 0.12), 6.0, 0.88),
        'fern': flat('fern', (0.06, 0.19, 0.05), (0.20, 0.40, 0.10), 3.0, 0.65),
        'stone': flat('stone', (0.14, 0.15, 0.14), (0.28, 0.29, 0.26), 5.0, 0.85),
        'eye': glow('eye', EYE, 4.0),
        'rune': glow('rune', (0.12, 0.75, 1.0), 1.4, base=(0.05, 0.25, 0.3)),
        'cap': glow('cap', (0.10, 1.0, 0.35), 1.1, base=(0.12, 0.62, 0.30)),
        'capspot': glow('capspot', (0.55, 1.0, 0.6), 2.4),
        'stem': glow('stem', (0.3, 0.9, 0.45), 0.25, base=(0.55, 0.68, 0.50)),
        'cloth_r': flat('cloth_r', (0.42, 0.04, 0.03), (0.66, 0.10, 0.06), 9.0, 0.8),
        'cloth_b': flat('cloth_b', (0.06, 0.10, 0.34), (0.12, 0.18, 0.52), 9.0, 0.8),
        'cloth_w': flat('cloth_w', (0.62, 0.56, 0.42), (0.86, 0.80, 0.64), 9.0, 0.8),
        'cloth_g': flat('cloth_g', (0.05, 0.30, 0.26), (0.10, 0.46, 0.38), 9.0, 0.8),
        'rope': flat('rope', (0.40, 0.31, 0.18), (0.58, 0.47, 0.30), 12.0, 0.9),
        'bone': flat('bone', (0.72, 0.68, 0.58), (0.90, 0.86, 0.76), 8.0, 0.6),
    }

    cols = {}
    def coll(name):
        if name not in cols:
            c = bpy.data.collections.new(name); sc.collection.children.link(c); cols[name] = c
        return cols[name]

    def bm_obj(name, bm, mat, cname, smooth=True):
        me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new(name, me); coll(cname).objects.link(o); o.data.materials.append(mat)
        for p in o.data.polygons: p.use_smooth = smooth
        return o

    def ellip(bm, c, r, sub=2, rot=None, nz=0.0, seed=0.0):
        """ทรงรี (icosphere ยืด) + บิดด้วยนอยส์เล็กน้อย"""
        res = bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0)
        R = Matrix.Rotation(rot[1], 4, rot[0]) if rot else Matrix.Identity(4)
        for v in res['verts']:
            p = v.co.copy(); k = 1 + nz * noise.noise(Vector((p.x * 1.7 + seed, p.y * 1.7, p.z * 1.7)))
            q = R @ Vector((p.x * r[0] * k, p.y * r[1] * k, p.z * r[2] * k))
            v.co = Vector(c) + q

    # ============================================================
    #  B: ลำต้น (loft วงแหวน: โคนบานเป็นพูรากค้ำ + ร่องเปลือก + บิดเล็กน้อย)
    # ============================================================
    def trunk_r(a, z):
        flare = 0.42 * math.exp(-max(0.0, z) / 0.55)                                   # โคนบาน
        lobe = (0.5 + 0.5 * math.cos(7 * a + 0.6 + z * 0.35)) ** 3 * 0.30 * math.exp(-max(0.0, z) / 0.8)   # พูรากค้ำ 7 พู
        neck = -0.14 * math.exp(-((z - 3.6) / 1.1) ** 2)                               # คอดก่อนแตกกิ่ง
        top = 0.22 * max(0.0, z - 4.2)                                                 # บานออกตอนแตกกิ่ง
        ridge = 0.035 * math.sin(19 * a + z * 1.3) + 0.05 * noise.noise(Vector((math.cos(a) * 2.2, math.sin(a) * 2.2, z * 0.8)))
        return TRUNK_R + flare + lobe + neck + top + ridge

    bm = bmesh.new(); NA, ZS = 72, [(-0.15 + 5.35 * (i / 40) ** 1.25) for i in range(41)]
    rings = []
    for z in ZS:
        ox = 0.12 * math.sin(z * 0.55) - 0.05 * z; oy = 0.06 * math.sin(z * 0.8 + 1)
        rings.append([bm.verts.new((ox + trunk_r(2 * math.pi * i / NA, z) * math.cos(2 * math.pi * i / NA),
                                    oy + trunk_r(2 * math.pi * i / NA, z) * math.sin(2 * math.pi * i / NA), z)) for i in range(NA)])
    for j in range(len(rings) - 1):
        for i in range(NA):
            bm.faces.new([rings[j][i], rings[j][(i + 1) % NA], rings[j + 1][(i + 1) % NA], rings[j + 1][i]])
    bm.faces.new(rings[-1][::-1])
    bm_obj('trunk', bm, M['bark'], 'B_ink')

    # ---------- กิ่งหลักขึ้นสู่ทรงพุ่ม + กิ่งต่ำผูกผ้า (เส้นโค้ง bevel) ----------
    limbs = []
    for k, (ang, reach, lift) in enumerate([(200, 3.3, 7.4), (150, 3.0, 8.4), (95, 2.0, 9.4), (40, 3.2, 8.2), (-15, 3.4, 7.2), (-100, 2.3, 7.9), (265, 2.4, 8.8)]):
        a = math.radians(ang); ca, sa = math.cos(a), math.sin(a)
        p = [(ca * 0.3, sa * 0.3, 4.1, 0.62), (ca * 0.9, sa * 0.8, 5.0, 0.48), (ca * reach * 0.6, sa * reach * 0.55, (5.0 + lift) / 2 + 0.3, 0.32),
             (ca * reach, sa * reach * 0.85, lift, 0.16)]
        limbs.append(p)
    # กิ่งต่ำ (ผูกผ้า) ยื่นไปทางตะวันออกเฉียงใต้ (หาถนน) — ต่ำกว่าทรงพุ่ม เห็นชัด
    LOW = [(0.75, -0.45, 2.75, 0.30), (1.5, -0.75, 2.95, 0.22), (2.4, -1.05, 3.05, 0.15), (3.25, -1.25, 3.3, 0.09), (3.75, -1.3, 3.55, 0.05)]
    limbs.append(LOW)
    # กิ่งกุดฝั่งตะวันตก (กิ่งเก่าหัก)
    limbs.append([(-0.8, -0.2, 3.3, 0.24), (-1.5, -0.35, 3.75, 0.16), (-1.95, -0.4, 4.25, 0.11)])
    root_curve('limbs', limbs, M['bark'], coll('B_ink'))

    # ---------- ทรงพุ่ม: ก้อนพุ่มใบ (ก้อนใหญ่ + ก้อนย่อยรอบผิว = ขอบหยักแบบพุ่มไม้ภาพวาด) ไม่มีเส้น Freestyle ด้านใน ----------
    cx, cy, cz = CANOPY_C; rx, ry, rz = CANOPY_R
    bm = bmesh.new(); ellip(bm, (cx, cy, cz - 0.1), (rx * 0.8, ry * 0.78, rz * 0.8), 3, nz=0.15)
    bm_obj('core', bm, M['leaf'], 'B_leaf')
    N = 30; gold = math.pi * (3 - math.sqrt(5)); clumps = []
    for i in range(N):
        zz = 1 - 2 * (i + 0.5) / N; rr = math.sqrt(1 - zz * zz); th = gold * i + 0.4
        dx, dy, dz = math.cos(th) * rr, math.sin(th) * rr, zz
        if dz < -0.55: continue                                         # ใต้พุ่มไม่ต้องมีก้อน (มองไม่เห็น)
        j = rnd.uniform(0.74, 0.86)
        clumps.append((cx + dx * rx * j, cy + dy * ry * j, cz + dz * rz * j, dx, dy, dz))
    for k in range(6):                                                  # ก้อนห้อยต่ำรอบขอบ (ทรงพุ่มกว้างแบบต้นโอ๊กแก่ ไม่กลมเป๊ะ)
        a = math.radians(-170 + k * 40 + rnd.uniform(-10, 10)) if k < 5 else math.radians(rnd.uniform(60, 120))
        clumps.append((cx + math.cos(a) * rx * 0.86, cy + math.sin(a) * ry * 0.8, cz - rz * 0.5 + rnd.uniform(-0.15, 0.2), math.cos(a), math.sin(a), -0.3))
    for n, (x, y, z, dx, dy, dz) in enumerate(clumps):
        bm = bmesh.new()
        R0 = rnd.uniform(1.3, 1.7) * (1.08 if dz > 0.3 else 1)
        ellip(bm, (x, y, z), (R0, R0 * 0.94, R0 * 0.78), 3, nz=0.16, seed=n)
        nv = Vector((dx, dy, max(dz, -0.2) + 0.5)).normalized()
        for s_ in range(rnd.randint(7, 11)):                            # ปุ่มกลุ่มใบโผล่ด้านนอก/บน (ขอบหยัก)
            u = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.5, 1))).normalized()
            d = (u + nv * 0.9).normalized()
            r = R0 * rnd.uniform(0.32, 0.48)
            ellip(bm, Vector((x, y, z)) + d * R0 * rnd.uniform(0.72, 0.86), (r, r * 0.95, r * 0.8), 2, nz=0.08, seed=n * 10 + s_)
        for s_ in range(14):                                            # พู่ใบเล็กตามผิวด้านนอก → ขอบพุ่มหยักแบบใบไม้ภาพวาด
            u = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.6, 1))).normalized()
            d = (u + nv * 0.6).normalized(); r = R0 * rnd.uniform(0.17, 0.26)
            ellip(bm, Vector((x, y, z)) + Vector((d.x * R0, d.y * R0 * 0.94, d.z * R0 * 0.78)) * 0.93, (r, r * 0.9, r * 0.7), 1, nz=0.1, seed=n * 50 + s_)
        bm_obj(f'clump{n}', bm, M['leaf'], 'B_leaf')

    # ---------- โทเท็มหัวหมาป่าสลักบนหน้าลำต้น (หันใต้ = หากล้อง) ----------
    def front_y(z, a=-math.pi / 2):   # ผิวลำต้นด้านใต้ที่ความสูง z
        return 0.06 * math.sin(z * 0.8 + 1) - trunk_r(a, z) - 0.02
    zt = 2.05; fy = front_y(zt)
    bm = bmesh.new(); ellip(bm, (0.12 * math.sin(zt * 0.55) - 0.05 * zt, fy + 0.18, zt - 0.15), (0.62, 0.3, 1.05), 3)
    bm_obj('panel', bm, M['wood'], 'B_ink')                             # ลอกเปลือกเป็นแผ่นรีสีอ่อน
    tx = 0.12 * math.sin(zt * 0.55) - 0.05 * zt; py = fy - 0.08
    bm = bmesh.new()
    ellip(bm, (tx, py, zt + 0.12), (0.30, 0.13, 0.27), 3)               # หัว
    ellip(bm, (tx, py - 0.13, zt - 0.03), (0.13, 0.14, 0.11), 3)        # ปาก/จมูกยื่น
    ellip(bm, (tx, py - 0.05, zt - 0.17), (0.15, 0.08, 0.07), 2)        # คาง
    for s in (-1, 1):
        ellip(bm, (tx + s * 0.15, py - 0.02, zt + 0.25), (0.11, 0.06, 0.05), 2, rot=('Y', s * 0.4))    # คิ้ว
        ellip(bm, (tx + s * 0.25, py - 0.01, zt + 0.0), (0.09, 0.07, 0.16), 2, rot=('Y', s * 0.5))     # แก้มขนฟู
        bmesh.ops.create_cone(bm, cap_ends=True, segments=10, radius1=0.10, radius2=0.0, depth=0.30,   # หู
                              matrix=Matrix.Translation((tx + s * 0.17, py + 0.02, zt + 0.47)) @ Matrix.Rotation(-s * 0.32, 4, 'Y') @ Matrix.Scale(0.55, 4, (0, 1, 0)))
    bm_obj('wolf', bm, M['carve'], 'B_ink')
    bm = bmesh.new()
    ellip(bm, (tx, py - 0.27, zt + 0.02), (0.045, 0.035, 0.035), 2)    # จมูก
    for s in (-1, 1):
        ellip(bm, (tx + s * 0.06, py - 0.2, zt - 0.11), (0.012, 0.02, 0.04), 1)  # เขี้ยว (มืด → อ่านเป็นปากอ้า)
    bm_obj('wolf_dark', bm, M['dark'], 'B_ink')
    bm = bmesh.new()
    for s in (-1, 1): ellip(bm, (tx + s * 0.11, py - 0.115, zt + 0.15), (0.05, 0.03, 0.028), 2, rot=('Y', -s * 0.35))
    bm_obj('eyes', bm, M['eye'], 'B_glow')
    eyes = [(tx + s * 0.11, py - 0.13, zt + 0.15) for s in (-1, 1)]
    # รูนสลักใต้หัว 3 ตัว (เรืองจาง)
    RV, RF = [], []
    def glyph(gl, gx, gz, w, h, y, wd=0.035):
        for (a, b) in RUNES[gl]:
            x0, z0 = gx + (a[0] - 0.5) * w, gz + (a[1] - 0.5) * h; x1, z1 = gx + (b[0] - 0.5) * w, gz + (b[1] - 0.5) * h
            Ln = math.hypot(x1 - x0, z1 - z0) + wd; ang = math.atan2(z1 - z0, x1 - x0)
            ux, uz = math.cos(ang), math.sin(ang); vx, vz = -uz, ux; mx, mz = (x0 + x1) / 2, (z0 + z1) / 2
            base = len(RV)
            for (su, sv) in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                RV.append((mx + ux * su * Ln / 2 + vx * sv * wd / 2, y, mz + uz * su * Ln / 2 + vz * sv * wd / 2))
            RF.append((base, base + 1, base + 2, base + 3))
    for i, gl in enumerate(['o', 'yr', 'th']):                       # ใต้หัวหมาป่า: บรรพชน • ความตาย • พลัง
        z = zt - 0.43 - i * 0.27
        dz = (z - (zt - 0.15)) / 1.05; pf = fy + 0.18 - 0.3 * math.sqrt(max(0.0, 1 - dz * dz))   # ผิวหน้าแผ่นลอกเปลือก
        glyph(gl, tx, z, 0.17, 0.22, min(pf, front_y(z)) - 0.015)

    # ---------- ผ้า/ริบบิ้นผูกกิ่งต่ำ (แถบผ้าห้อยพลิ้ว + ปม + ป้ายไม้รูน + เขี้ยวหมาป่า) ----------
    def along(t):   # จุดบนกิ่งต่ำ t 0..1
        n = len(LOW) - 1; f = min(n - 1e-6, t * n); i = int(f); u = f - i
        a, b = LOW[i], LOW[i + 1]
        return [a[k] + (b[k] - a[k]) * u for k in range(4)]
    ribbons = [(0.30, 'cloth_r', 1.05), (0.40, 'cloth_w', 0.75), (0.52, 'cloth_b', 1.2), (0.62, 'cloth_r', 0.85), (0.72, 'cloth_g', 1.0), (0.83, 'cloth_w', 0.65), (0.9, 'cloth_b', 0.8)]
    for n, (t, mk, ln) in enumerate(ribbons):
        x, y, z, r = along(t); bm = bmesh.new(); seg = 14; wd = rnd.uniform(0.08, 0.12); ph = rnd.random() * 6
        prev = None
        for i in range(seg + 1):
            u = i / seg; zz = z - r - u * ln
            sw = 0.10 * math.sin(u * 3.2 + ph) * u + 0.12 * u * u           # พลิ้วลม (ปลายปลิวไปทางตะวันออก)
            tw = 0.6 * math.sin(u * 2.5 + ph)                                # บิดตัว
            cxr, cyr = x + sw, y - 0.02 + 0.05 * math.sin(u * 4 + ph)
            ex, ey = math.cos(tw) * wd / 2, math.sin(tw) * wd / 2
            cur = (bm.verts.new((cxr - ex, cyr - ey, zz)), bm.verts.new((cxr + ex, cyr + ey, zz)))
            if prev: bm.faces.new([prev[0], prev[1], cur[1], cur[0]])
            prev = cur
        # ปลายผ้าแฉก
        tip = bm.verts.new((prev[0].co + prev[1].co) / 2 + Vector((0, 0, 0.09))); bm.faces.new([prev[0], prev[1], tip])
        bm_obj(f'ribbon{n}', bm, M[mk], 'B_ink', smooth=False)
        bm = bmesh.new(); ellip(bm, (x, y - 0.01, z - r * 0.4), (r * 1.15, r * 1.15, r * 0.6), 2)   # ปมเชือกรอบกิ่ง
        bm_obj(f'knot{n}', bm, M['rope'], 'B_ink')
    # ป้ายไม้รูน 2 แผ่น + เขี้ยวหมาป่า ห้อยเชือก
    for t, kind in ((0.47, 'tag'), (0.66, 'fang'), (0.78, 'tag')):
        x, y, z, r = along(t); dz = 0.55 if kind == 'tag' else 0.45
        root_curve(f'cord{t}', [[(x, y, z - r, 0.012), (x + 0.02, y - 0.01, z - r - dz * 0.5, 0.012), (x + 0.03, y - 0.02, z - r - dz, 0.01)]], M['rope'], coll('B_ink'))
        bm = bmesh.new(); zc = z - r - dz - 0.1
        if kind == 'tag':
            bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.11, radius2=0.11, depth=0.03,
                                  matrix=Matrix.Translation((x + 0.03, y - 0.02, zc)) @ Matrix.Rotation(math.pi / 2, 4, 'X'))
            bm_obj(f'tag{t}', bm, M['wood'], 'B_ink')
            glyph('yr' if t < 0.6 else 'o', x + 0.03, zc, 0.09, 0.12, y - 0.04, 0.022)
        else:
            bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.035, radius2=0.0, depth=0.2, matrix=Matrix.Translation((x + 0.03, y - 0.02, zc)) @ Matrix.Rotation(math.pi, 4, 'X'))
            bm_obj(f'fang{t}', bm, M['bone'], 'B_ink')
    mesh_obj('runes', RV, RF, M['rune'], coll('B_glow'))

    # ---------- เห็ดเรืองแสง (กอบนรากค้ำ = B, กอบนรากผิวดิน = A) ----------
    caps = []
    def mushrooms(cname, x0, y0, z0, n, big, tag):
        bmc, bms, bmd = bmesh.new(), bmesh.new(), bmesh.new()
        for i in range(n):
            a = rnd.random() * 6.28; d = rnd.uniform(0.0, 0.32) * (1 if i else 0)
            x, y = x0 + math.cos(a) * d, y0 + math.sin(a) * d * 0.8
            s = big * rnd.uniform(0.55, 1.0) * (1.25 if i == 0 else 1)
            h = 0.22 * s; rc = 0.13 * s; lean = rnd.uniform(-0.25, 0.25)
            top = Vector((x + lean * h, y, z0 + h))
            bmesh.ops.create_cone(bms, cap_ends=True, segments=10, radius1=rc * 0.32, radius2=rc * 0.24, depth=h,
                                  matrix=Matrix.Translation((x + lean * h / 2, y, z0 + h / 2)) @ Matrix.Rotation(lean, 4, 'Y'))
            ellip(bmc, top + Vector((0, 0, rc * 0.18)), (rc, rc, rc * 0.62), 2)
            for k in range(3):                                         # จุดเรืองบนหมวก
                aa = rnd.random() * 6.28; ellip(bmd, top + Vector((math.cos(aa) * rc * 0.5, math.sin(aa) * rc * 0.5 - rc * 0.2, rc * 0.55)), (rc * 0.13,) * 3, 1)
            caps.append((tuple(top + Vector((0, 0, rc * 0.4))), tag, round(min(1.0, 0.5 + s * 0.4), 2)))
        bm_obj(f'mcap_{tag}', bmc, M['cap'], cname); bm_obj(f'mstem_{tag}', bms, M['stem'], cname); bm_obj(f'mdot_{tag}', bmd, M['capspot'], cname)
    # B: บนพูรากค้ำหน้าลำต้น (ซ้าย/ขวา) + ข้างตะวันตก
    for k, (x, y, z, n, s) in enumerate(MUSH_B): mushrooms('B_glow', x, y, z, n, s, f'b{k}')
    # A: บนรากผิวดินรอบ ๆ
    for k, (x, y) in enumerate(MUSH_A): mushrooms('A_glow', x, y, 0.02, rnd.randint(3, 5), 0.85, f'a{k}')

    # ============================================================
    #  A: รากผิวดินแผ่ ~6 ม. (ต่อจากพูรากค้ำของลำต้น) + มอส + เฟิร์น + หินเล็ก
    # ============================================================
    paths = []
    angs = [((2 * math.pi * k - 0.6) / 7, 1.0) for k in range(7)] + [((2 * math.pi * k + 2.6) / 7, 0.6) for k in range(0, 7, 2)]
    for k, (a, big) in enumerate(angs):                                     # รากหลัก 7 เส้นต่อจากพูรากค้ำ 7 พูของลำต้น + รากรอง
        a += rnd.uniform(-0.08, 0.08)
        a += rnd.uniform(-0.2, 0.2)
        L0 = rnd.uniform(2.1, 3.5) * (1.08 if math.sin(a) < 0 else 0.95) * (0.8 if big < 1 else 1); r0 = rnd.uniform(0.24, 0.28) * big
        p = []; x, y = math.cos(a) * 1.15, math.sin(a) * 1.15; da = 0.0; n = 18; step = (L0 - 1.15) / n; ph = rnd.random() * 6
        for i in range(n + 1):
            t = i / n; r = r0 * (1 - 0.8 * t)
            z = r * (0.12 + 0.28 * math.sin(t * 7 + ph) * min(1, t * 3)) + 0.06 * (1 - t) ** 2   # ผุดขึ้น-มุดดินเป็นช่วง ๆ สูงสุด ~0.3 ม. ที่โคน
            p.append((x, y, z, r))
            da = max(-0.45, min(0.45, da + rnd.uniform(-0.16, 0.16)))
            x += math.cos(a + da) * step; y += math.sin(a + da) * step
        paths.append(p)
        if big == 1 and rnd.random() < 0.75:                                # รากแขนง
            q = []; j0 = rnd.randint(6, 9); bx, by = p[j0][0], p[j0][1]; ba = a + rnd.choice((-0.75, 0.75)); bd = 0.0
            for i in range(9):
                t = i / 8; rr = p[j0][3] * 0.6 * (1 - 0.8 * t); q.append((bx, by, rr * 0.3, rr))
                bd += rnd.uniform(-0.2, 0.2); bx += math.cos(ba + bd) * 0.17; by += math.sin(ba + bd) * 0.17
            paths.append(q)
    ro = root_curve('roots', paths, M['rootbark'], coll('A_ink')); ro.scale = (1, 1, 0.7)   # รากแบนติดดิน เนื้อเปลือกเดียวกับลำต้น
    SV, SF = [], []
    for k in range(5):                                                     # หินเล็กระหว่างราก
        a = rnd.random() * 6.28; d = rnd.uniform(2.2, 3.4)
        lump(SV, SF, math.cos(a) * d, math.sin(a) * d, 0.0, rnd.uniform(0.08, 0.14), rnd, 0.6)
    mesh_obj('stones', SV, SF, M['stone'], coll('A_ink'))
    FV, FF = [], []
    for k in range(9):
        a = rnd.random() * 6.28; d = rnd.uniform(2.0, 3.4)
        fern(FV, FF, math.cos(a) * d, math.sin(a) * d, 0.0, rnd.uniform(0.3, 0.45), rnd, 0.24)
    mesh_obj('ferns', FV, FF, M['fern'], coll('A'))
    # พื้น = shadow catcher (โปร่ง เหลือแต่เงาของราก/มอส/เห็ด)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, -0.004)); pl = bpy.context.active_object
    pl.scale = (30, 30, 1); pl.is_shadow_catcher = True
    for c in list(pl.users_collection): c.objects.unlink(pl)
    coll('A').objects.link(pl)


    # ============================================================
    #  กล้อง/เรนเดอร์
    # ============================================================
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.sensor_fit = 'HORIZONTAL'; cam.clip_end = 300
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
    co.rotation_euler = (TH, 0, 0)
    dvec = Vector((0, math.sin(TH), -math.cos(TH))); uvec = Vector((0, math.cos(TH), math.sin(TH)))
    sc.cycles.samples = 10 if preview else samples
    sc.render.resolution_percentage = 50 if preview else 100
    sc.view_settings.exposure = 0.25

    def set_pass(target):
        for cname, c in cols.items():
            isA = cname.startswith('A')
            for o in c.objects:
                if target == 'tree':
                    o.hide_render = isA; o.visible_camera = True; o.visible_shadow = True
                else:   # roots: ลำต้น/พุ่มไม่เข้ากล้องและไม่ทอดเงา (เงาใต้พุ่มวาดนุ่ม ๆ ตอนติดตั้ง แบบเงาต้นไม้ Flora)
                    o.hide_render = False; o.visible_camera = isA; o.visible_shadow = isA
        pl.visible_camera = target == 'roots'

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
        print('เรนเดอร์ →', path, wpx, 'x', hpx)

    def fs_style():
        return bpy.context.view_layer.freestyle_settings.linesets[0].linestyle

    todo = only or ['tree', 'roots']
    old = {}
    mp = os.path.join(outdir, 'meta.json')
    if os.path.exists(mp):
        try: old = json.load(open(mp))
        except Exception: old = {}
    if 'roots' in todo:
        set_pass('roots'); freestyle(sc, cols['A_ink'], 1.0); sc.render.line_thickness = 1.0; fs_style().thickness = 2.0 * (0.5 if preview else 1)   # ความหนาจริง = สองค่านี้คูณกัน
        gx0, gy0, gx1, gy1 = A_RECT
        x0, x1 = gx0 - GX, gx1 - GX
        y1 = -(gy0 - GY) * K; y0 = -(gy1 - GY) * K
        wpx, hpx = round((x1 - x0) * RES_A), round((y1 - y0) * RES_A)
        shoot(x0, y0, x1, y1, wpx, hpx, os.path.join(outdir, 'roots.png'))
        old['roots'] = {'rect': A_RECT}
    if 'tree' in todo:
        set_pass('tree'); freestyle(sc, cols['B_ink'], 1.0); sc.render.line_thickness = 1.0; fs_style().thickness = 5.0 * (0.5 if preview else 1)
        objs = [o for cn in ('B_ink', 'B_glow', 'B_leaf') for o in cols[cn].objects]
        x0, y0, x1, y1, wpx, hpx = frame(objs, 0.15, RES_B)
        shoot(x0, y0, x1, y1, wpx, hpx, os.path.join(outdir, 'tree.png'))
        def px(p):
            sx, sy = screen(p); return [round((sx - x0) * RES_B, 2), round((y1 - sy) * RES_B, 2)]
        dg = bpy.context.evaluated_depsgraph_get()
        def seen(p, names):   # จุดเรืองที่กล้องมองเห็น (ไม่ถูกลำต้น/พุ่มบัง)
            p = Vector(p); hit, loc, nor, idx, ob, _ = sc.ray_cast(dg, p - dvec * 30, dvec)
            return hit and ob is not None and ob.name.startswith(names) and (loc - p).length < 0.25
        glints = [px(c[0]) + [c[2]] for c in caps if c[1].startswith('b') and seen(c[0], ('mcap', 'mdot', 'mstem'))]
        glints += [px(e) + [1.0] for e in eyes]
        old['tree'] = {'anchor': px(to_b(GX, ANCHOR_Y, 0.0)), 'px': [wpx, hpx], 'res': RES_B, 'glints': glints,
                       'eyes': [px(e) for e in eyes], 'totem': [tx, py, zt],
                       'caps': [[px(c[0]), c[1]] for c in caps]}
        print('ประกายที่เห็น', len(glints))
    json.dump(old, open(mp, 'w'), indent=1)
    print('meta →', mp)


# ============================================================
#  ติดตั้ง: Kuwahara (ผิวพู่กัน) + ปรับสี + เส้นขอบนอก → assets + js/bake_data_wolfwood.js + manifest
# ============================================================
def kuwahara(im, r=4):
    """ฟิลเตอร์ Kuwahara (4 ควอแดรนต์ เลือกส่วนที่แปรปรวนน้อยสุด) — ผิว CG กลายเป็นแต้มพู่กัน ขอบคมคงอยู่
    คำนวณบนภาพสีที่คูณอัลฟาแล้ว (ขอบโปร่งไม่ดึงสีดำเข้ามา)"""
    import numpy as np
    from PIL import Image
    a = np.asarray(im).astype(np.float64) / 255.0
    al = a[..., 3:4]; rgb = a[..., :3] * al
    lum = rgb @ np.array([0.299, 0.587, 0.114])
    H, W = lum.shape
    def box(x):   # ผลรวมสะสม 2 มิติ → ค่าเฉลี่ยกล่อง (r+1)×(r+1) ที่มุมต่าง ๆ
        p = np.pad(x, [(r + 1, r + 1), (r + 1, r + 1)] + [(0, 0)] * (x.ndim - 2), mode='edge')
        c = p.cumsum(0).cumsum(1)
        c = np.pad(c, [(1, 0), (1, 0)] + [(0, 0)] * (x.ndim - 2))
        return c
    def quad(c, dy, dx):
        # ค่าเฉลี่ยของกล่องขนาด (r+1) ที่มุมซ้ายบนอยู่ที่ (y+dy, x+dx) ในพิกัดภาพเดิม
        y0 = np.arange(H)[:, None] + r + 1 + dy; x0 = np.arange(W)[None, :] + r + 1 + dx
        y1 = y0 + r + 1; x1 = x0 + r + 1
        s = c[y1, x1] - c[y0, x1] - c[y1, x0] + c[y0, x0]
        return s / (r + 1) ** 2
    cl, cl2, cc, ca = box(lum), box(lum * lum), box(rgb), box(al)
    best = None; out = np.zeros_like(rgb); oa = np.zeros_like(al)
    for dy, dx in ((-r, -r), (-r, 0), (0, -r), (0, 0)):
        m = quad(cl, dy, dx); v = quad(cl2, dy, dx) - m * m
        mc = np.stack([quad(cc[..., k], dy, dx) for k in range(3)], -1); ma = quad(ca[..., 0], dy, dx)[..., None]
        if best is None: best = v; out[:] = mc; oa[:] = ma
        else:
            sel = v < best; best = np.where(sel, v, best); out = np.where(sel[..., None], mc, out); oa = np.where(sel[..., None], ma, oa)
    na = al  # อัลฟาเดิม (ขอบคม)
    col = np.where(oa > 1e-4, out / np.maximum(oa, 1e-4), a[..., :3])
    res = np.concatenate([np.clip(col, 0, 1), na], -1)
    return Image.fromarray((res * 255 + 0.5).astype(np.uint8), 'RGBA')


def paint(im, sat=1.25, con=1.06, bri=1.04, outline=True, ow=3):
    from PIL import Image, ImageEnhance, ImageFilter
    a = im.getchannel('A')
    rgb = ImageEnhance.Color(im.convert('RGB')).enhance(sat)
    rgb = ImageEnhance.Contrast(rgb).enhance(con)
    rgb = ImageEnhance.Brightness(rgb).enhance(bri)
    im = Image.merge('RGBA', (*rgb.split(), a))
    if outline:
        edge = a.point(lambda v: 255 if v > 60 else 0).filter(ImageFilter.MaxFilter(ow)).filter(ImageFilter.GaussianBlur(0.5))
        ol = Image.new('RGBA', im.size, (24, 16, 10, 0)); ol.putalpha(edge.point(lambda v: int(v * 0.92)))
        ol.alpha_composite(im); im = ol
    return im


def opacity_mask(im, cell):
    """ตารางความทึบหยาบ (1 = มีภาพ) สำหรับเช็คว่าผู้เล่นอยู่หลังส่วนทึบของภาพ (js/bake.js Bake.draw) — แถวละ 1 สตริง hex 4 ช่อง/ตัว"""
    a = im.getchannel('A').point(lambda v: 255 if v > 150 else 0)
    cw, ch = math.ceil(im.width / cell), math.ceil(im.height / cell)
    rows = []
    px = a.load()
    for j in range(ch):
        bits = []
        for i in range(cw):
            n = tot = 0
            for y in range(j * cell, min(im.height, (j + 1) * cell), 2):
                for x in range(i * cell, min(im.width, (i + 1) * cell), 2):
                    tot += 1; n += px[x, y] > 0
            bits.append(1 if tot and n / tot > 0.5 else 0)
        bits += [0] * (-len(bits) % 4)
        rows.append(''.join('%x' % (bits[k] * 8 + bits[k + 1] * 4 + bits[k + 2] * 2 + bits[k + 3]) for k in range(0, len(bits), 4)))
    return {'cell': cell, 'w': cw, 'rows': rows}


def install(src):
    from PIL import Image, ImageDraw, ImageFilter
    d, _ = load_tiles()
    meta = json.load(open(os.path.join(src, 'meta.json')))
    data = {'map': MAP_ID, 'hash': d['hash'], 'hashRect': HASH_RECT, 'clearTree': CLEAR_TREE,
            'free': {'x': GX, 'y': GY, 'r': FREE_R}, 'ground': [], 'pieces': []}
    # ---------- A: รากผิวดิน — ย่อเป็น 40 px/ม. แล้วยืดแนวตั้ง ×1/0.76 + เงานุ่มใต้พุ่ม (แบบเงาต้นไม้ Flora) ----------
    x0, y0, x1, y1 = meta['roots']['rect']
    im = Image.open(os.path.join(src, 'roots.png')).convert('RGBA')
    W, H = round((x1 - x0) * PX), round((y1 - y0) * PX)
    im = im.resize((W, H), Image.LANCZOS)
    im = paint(im, sat=1.2, con=1.05, bri=1.0, outline=False)
    sh = Image.new('L', (W, H), 0); dr = ImageDraw.Draw(sh)
    cxp, cyp = (GX + 0.35 - x0) * PX, (GY + 0.55 - y0) * PX
    for i in range(24):   # วงรีซ้อน = ไล่ความเข้มจากกลาง
        f = 1 - i / 24; rxp, ryp = 4.3 * PX * f, 3.2 * PX * f
        dr.ellipse((cxp - rxp, cyp - ryp, cxp + rxp, cyp + ryp), fill=int(118 * (1 - f) ** 0.6 + 4))
    sh = sh.filter(ImageFilter.GaussianBlur(10))
    shade = Image.new('RGBA', (W, H), (14, 30, 10, 0)); shade.putalpha(sh)
    shade.alpha_composite(im); im = shade
    key = 'bake_wolf_tree_roots'; im.save(os.path.join(ROOT, 'assets', key + '.webp'), 'WEBP', quality=88, method=6)
    data['ground'].append({'img': key, 'x': x0, 'y': y0, 'w': x1 - x0, 'h': y1 - y0})
    print('ติดตั้ง', key, im.size)
    # ---------- B: ต้นไม้ ----------
    m = meta['tree']
    im = Image.open(os.path.join(src, 'tree.png')).convert('RGBA')
    ratio = im.width / m['px'][0]                # เรนเดอร์ preview = ครึ่งความละเอียด
    sc = STORE_B / (RES_B * ratio)
    # Kuwahara เฉพาะพุ่มใบ/ลำต้นช่วงบน (ผ้า/โทเท็ม/เห็ดชิ้นเล็กไม่โดนป่น) — ไล่น้ำหนักตามความสูงบนจอเหนือจุดยึด 2.1 → 2.7 ม.
    import numpy as np
    kw = kuwahara(im, max(2, round(4 * ratio)))
    hh = (m['anchor'][1] * ratio - np.arange(im.height)) / (RES_B * ratio)
    wgt = np.clip((hh - 2.1) / 0.6, 0, 1)[:, None, None]
    im = Image.fromarray((np.asarray(kw).astype(np.float64) * wgt + np.asarray(im).astype(np.float64) * (1 - wgt) + 0.5).astype(np.uint8), 'RGBA')
    im = im.resize((round(im.width * sc), round(im.height * sc)), Image.LANCZOS)
    im = paint(im, sat=1.22, con=1.07, bri=1.02)
    l, t, r, b = im.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox()
    l, t, r, b = max(0, l - 2), max(0, t - 2), min(im.width, r + 2), min(im.height, b + 2)
    im = im.crop((l, t, r, b))
    key = 'bake_wolf_tree'; im.save(os.path.join(ROOT, 'assets', key + '.webp'), 'WEBP', quality=88, method=6)
    k = STORE_B / RES_B
    ax, ay = m['anchor'][0] * k - l, m['anchor'][1] * k - t
    jars = [[round(j[0] * k - l, 1), round(j[1] * k - t, 1), j[2]] for j in m.get('glints', [])]
    s = PX / STORE_B
    # แสงตัดความมืด (render.js map.extraLights): กอเห็ดหน้าโคนซ้าย/ขวา + โทเท็ม (ยกขึ้นตามความสูงบนจอ) + เห็ดบนรากรอบ ๆ
    def light(bx, by, z, lr, col):   # จุด Blender → แสงในเกม (dx,dy เทียบจุดยึด) • render.js วาดวงแสงสูงจากพื้น 20 px → ของที่สูงกว่านั้นเลื่อนจุดขึ้นเหนือ
        return {'dx': round(bx, 2), 'dy': round(GY - by - max(0.0, z * SN * PX - 14) / (PX * K) - ANCHOR_Y, 2), 'lr': lr, 'col': col}
    tt = m['totem']
    lights = [light(x, y, z, 2.0 + 0.4 * (s > 1.1), MUSH_COL) for x, y, z, n, s in MUSH_B] + [light(x, y, 0.0, 1.5, MUSH_COL) for x, y in MUSH_A]
    lights.append(light(tt[0], tt[1], tt[2], 2.2, '120,230,255'))
    lights.append(light(CANOPY_C[0], CANOPY_C[1], CANOPY_C[2] - 0.5, 3.6, '120,215,160'))   # เรืองจาง ๆ ในพุ่ม (สปอร์/หิ่งห้อย) — ต้นยักษ์เห็นเป็นจุดหมายในความมืด
    ent = {'id': 'wolf_tree', 'img': key, 'x': GX, 'y': ANCHOR_Y, 'ax': round(ax, 1), 'ay': round(ay, 1), 'scale': s,
           'block': BLOCK, 'jars': jars, 'glint': MUSH_COL, 'lights': lights, 'sway': 0.005,
           'cull': math.ceil(max(im.width * s / 2, im.height * s / K) / PX) + 1, 'fade': 0.45,
           'mask': opacity_mask(im, 16)}
    data['pieces'].append(ent)
    print('ติดตั้ง', key, im.size, 'anchor', (round(ax, 1), round(ay, 1)), 'ประกาย', len(jars), 'cull', ent['cull'])
    js = ("'use strict';\n// สร้างอัตโนมัติโดย tools/tree3d.py --install — อย่าแก้ด้วยมือ (แก้ใน tools/tree3d.py แล้วติดตั้งใหม่)\n"
          "// ต้นไม้ยักษ์ \"ต้นหมาป่าเก่า\" กลางป่า Wolfwood (docs/RENDER3D_PLAN.md #15) — รวมเข้า BAKE_DATA ของ js/bake_data.js (โหลดต่อจากไฟล์นั้น)\n"
          "// ground = รากผิวดิน+เงาใต้พุ่ม (แบบ A) • pieces = ต้นไม้ (แบบ B: x,y = จุดยึด/จุดเรียงความลึก) • lights = แสงเห็ด/โทเท็ม (dx,dy เทียบจุดยึด)\n"
          "// hash+hashRect = ผังช่องรอบต้นไม้ตอนเลือกตำแหน่ง — ไม่ตรง = ไม่วางต้นไม้เลย • clearTree = ต้นไม้ Flora ในวงรีนี้กลายเป็นหญ้า\n"
          "// mask = ตารางความทึบหยาบของภาพ (จางเมื่อผู้เล่นอยู่หลังส่วนทึบ) • sway = ไหวลม • cull = ระยะเผื่อนอกจอ (ช่อง)\n"
          f"BAKE_DATA.{MAP_ID} = {json.dumps(data, separators=(',', ':'))};\n")
    open(os.path.join(ROOT, 'js', 'bake_data_wolfwood.js'), 'w').write(js)
    print('เขียน js/bake_data_wolfwood.js')
    from slice_sheet import manifest
    manifest()


if __name__ == '__main__':
    a = sys.argv
    if '--extract' in a: extract()
    elif '--plan' in a: plan()
    elif '--install' in a: install(a[a.index('--install') + 1])
    elif '--render' in a:
        only = a[a.index('--only') + 1].split(',') if '--only' in a else None
        build(int(a[a.index('--samples') + 1]) if '--samples' in a else 24,
              a[a.index('--out') + 1] if '--out' in a else '/tmp/tree3d', only, '--preview' in a)
    else: print(__doc__)
