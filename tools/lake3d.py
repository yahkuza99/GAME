"""ซากโบราณในบ่อน้ำ Mistlake (ซุ้มโค้งหัก เสาสลัก เสาล้ม ศิลารูนจมครึ่ง) + เงาสะท้อนในน้ำ — docs/RENDER3D_PLAN.md ข้อ #6

  B (สไปรต์ตั้งตรง): ซาก 6 แบบ → assets/bake_lake_<ชื่อ>.webp เรียงความลึกกับตัวละคร (js/bake.js Bake.draw)
                กล้องเดียวกับเกมทุกประการ (ออร์โธ เอียง acos(0.76) จากแนวดิ่ง yaw 0, 40 px/ม. ที่ 1×) ไม่ยืดภาพ → ฐานตรงช่องพอดี
                ส่วนที่จมน้ำถูกตัดทิ้งที่ระดับน้ำ z = 0 (bisect) → ภาพจบที่ผิวน้ำพอดี ใต้ภาพคือน้ำของเกม
  A (เงาสะท้อน): เรนเดอร์อีก pass ด้วย "กล้องกระจก" (กล้องเกมสะท้อนผ่านระนาบน้ำ มองขึ้นจากใต้น้ำ) แล้วพลิกภาพ
                = ภาพสะท้อนจริงของวัตถุ (เห็นด้านใต้ซุ้ม แสงตกถูกด้าน) → ย่อ/ยืด ×1/0.76 เป็นภาพพื้น + ริ้วคลื่น/จางตามระยะ/
                ย้อมสีน้ำยามเย็น + วงคลื่นรอบฐาน → assets/bake_lake_<ชื่อ>_refl.webp วาดลงผ้าใบพื้น ตัดเฉพาะส่วนน้ำลึก (js/bake.js)
ตำแหน่ง: เลือกอัตโนมัติจากผังจริงของแมพ (Playwright: new GameMap('mistlake',{lite:true})) → tools/lake3d_tiles.json
         วางเฉพาะช่องน้ำที่ waterDepth ≥ 2 (ระยะถึงฝั่ง — เหมือน js/maps.js waterDepth) • hash ผังน้ำเก็บในข้อมูล
         เกมเทียบ hash ก่อนใช้ — ผังเปลี่ยน (แก้ seed/genField) = ไม่วางซากเลย (ไม่มีซากลอยบนหญ้า)
แสง: key ซ้ายบน (sun rotation z = -135° → เงาตกขวาล่างเหมือนทั้งเกม) สีอุ่นยามเย็น + rim ชมพูส้มจากขวา (SKY.mistlake ใน js/render.js)
สไตล์: เส้นขอบ Freestyle สีน้ำตาลเข้ม • เพิ่มความอิ่มสี + เส้นขอบนอกตอนติดตั้ง (paint() ชุดเดียวกับ tools/hel3d.py) • พื้นหลังโปร่ง

ใช้:
  python3 tools/lake3d.py --extract                       (ต้องมี node + playwright) → tools/lake3d_tiles.json
  python3 tools/lake3d.py --plan                          (พิมพ์ตำแหน่งที่เลือก + แผนที่บ่อ)
  /tmp/bvenv/bin/python tools/lake3d.py --render [--samples 48] [--out /tmp/lake3d] [--only arch,runestone] [--preview]
  python3 tools/lake3d.py --install /tmp/lake3d           (→ assets/bake_lake_*.webp + js/bake_data_mistlake.js + manifest)
"""
import math, os, sys, json, random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TILES = os.path.join(ROOT, 'tools', 'lake3d_tiles.json')
MAP_ID = 'mistlake'
K = 0.76                       # R.K ในเกม
TH = math.acos(K)              # 40.5° จากแนวดิ่ง
SN = math.sin(TH)              # 0.65
PX = 40                        # TILE
RES_B = 160                    # เรนเดอร์ 4× → ติดตั้งสไปรต์ 2× (80 px/ม. เกมวาด ×0.5) • เงาสะท้อนติดตั้ง 1× (40 px/ม. ภาพพื้น)
STORE_B = 80
WATER = 2
RUNE = (95 / 255, 212 / 255, 255 / 255)    # #5fd4ff เรืองฟ้า (ตามภาพประกอบแมพ + TownArt)

# ชิ้นซาก: ฐาน (กว้าง x, ลึก y เมตร — ช่องน้ำใต้ฐานต้องลึก ≥ 2 ทุกช่อง) • ความสูงโดยประมาณ (ใช้ประเมินความยาวเงาสะท้อน)
PIECES = {
    'arch':         {'size': (3.5, 0.8), 'h': 3.7},
    'pillar_tall':  {'size': (0.9, 0.9), 'h': 3.6},
    'pillar_short': {'size': (1.4, 1.0), 'h': 1.9},
    'toppled':      {'size': (2.9, 1.0), 'h': 0.6},
    'runestone':    {'size': (1.2, 0.7), 'h': 1.8},
    'stumps':       {'size': (2.4, 0.9), 'h': 0.9},
}
# ชุดซากต่อบ่อ (บ่อใหญ่สุดก่อน) — ชิ้นที่ไม่พอดีบ่อจะข้ามไป
COMPOSE = [
    ['arch', 'pillar_short', 'stumps'],
    ['runestone', 'pillar_tall', 'toppled'],
    ['pillar_tall', 'toppled', 'stumps'],
    ['arch', 'runestone'],
    ['pillar_short', 'stumps'],
    ['runestone', 'stumps'],
    ['pillar_tall'],
    ['stumps'],
]


def fnv_water(tiles):
    """hash ผังน้ำทั้งแมพ (1 = ช่องน้ำ) — ตรงกับ Bake.ok() ใน js/bake.js"""
    h = 0x811c9dc5
    for v in tiles:
        h ^= 1 if v == WATER else 0; h = (h * 0x01000193) & 0xffffffff
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
  const r = await p.evaluate(id => { const m = new GameMap(id, { lite: true }); return { w: m.w, h: m.h, tiles: Array.from(m.tiles) }; }, process.argv[3]);
  console.log(JSON.stringify(r)); await b.close(); })();"""
    f = os.path.join(tempfile.gettempdir(), 'lake3d_extract.js'); open(f, 'w').write(js)
    env = dict(os.environ); env.setdefault('NODE_PATH', subprocess.check_output(['npm', 'root', '-g'], text=True).strip())
    out = subprocess.check_output(['node', f, f'http://127.0.0.1:{srv.server_address[1]}/index.html', MAP_ID], env=env, text=True)
    srv.shutdown()
    r = json.loads(out.strip().splitlines()[-1]); w, h = r['w'], r['h']
    data = {'map': MAP_ID, 'w': w, 'h': h, 'rows': [''.join('0123456789AB'[v] for v in r['tiles'][y * w:(y + 1) * w]) for y in range(h)],
            'hash': fnv_water(r['tiles'])}
    json.dump(data, open(TILES, 'w'), indent=0)
    print('ผังช่อง →', TILES, 'hash', data['hash'])


def load_tiles():
    d = json.load(open(TILES))
    tiles = [int(c, 16) for row in d['rows'] for c in row]
    assert fnv_water(tiles) == d['hash']
    return d, tiles


# ---------------------------------------------------------------- เลือกตำแหน่ง (กำหนดตายตัวจากผัง — ทุกเครื่องเหมือนกัน)
def water_depth(w, h, tiles):
    """ระยะ (4 ทิศ) ถึงช่องที่ไม่ใช่น้ำ — เหมือน GameMap.waterDepth() ใน js/maps.js (ริมน้ำ = 1)"""
    from collections import deque
    dist = [0 if v != WATER else 99 for v in tiles]; q = deque(i for i, v in enumerate(tiles) if v != WATER)
    while q:
        i = q.popleft(); x, y = i % w, i // w
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and dist[ny * w + nx] > dist[i] + 1: dist[ny * w + nx] = dist[i] + 1; q.append(ny * w + nx)
    return dist


def ponds(w, h, tiles):
    seen = set(); out = []
    for i, v in enumerate(tiles):
        if v != WATER or i in seen: continue
        st = [i]; seen.add(i); comp = []
        while st:
            j = st.pop(); comp.append(j); x, y = j % w, j // w
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy; k = ny * w + nx
                if 0 <= nx < w and 0 <= ny < h and tiles[k] == WATER and k not in seen: seen.add(k); st.append(k)
        out.append(comp)
    return out


def cover(cx, cy, fw, fd, shrink=0.12):
    """ช่องที่ฐาน (กว้าง fw ลึก fd ศูนย์กลาง cx,cy พิกัดแมพ) ทับ"""
    x0, x1, y0, y1 = cx - fw / 2 + shrink, cx + fw / 2 - shrink, cy - fd / 2 + shrink, cy + fd / 2 - shrink
    return [(x, y) for y in range(math.floor(y0), math.floor(y1) + 1) for x in range(math.floor(x0), math.floor(x1) + 1)]


def plan():
    d, tiles = load_tiles(); w, h = d['w'], d['h']
    dep = water_depth(w, h, tiles)
    deep = lambda x, y: 0 <= x < w and 0 <= y < h and dep[y * w + x] >= 2
    wet = lambda x, y: 0 <= x < w and 0 <= y < h and tiles[y * w + x] == WATER
    P = []
    for comp in ponds(w, h, tiles):
        cells = [(j % w, j // w) for j in comp if dep[j] >= 2]
        if cells: P.append((len(cells), comp, cells))
    P.sort(key=lambda p: (-p[0], min(p[1])))
    out = []
    for rank, (n, comp, cells) in enumerate(P):
        pcx = sum(x + 0.5 for x, _ in cells) / n; pcy = sum(y + 0.5 for _, y in cells) / n
        placed = []
        for kind in COMPOSE[min(rank, len(COMPOSE) - 1)]:
            fw, fd = PIECES[kind]['size']; best = None
            xs = sorted({x for x, _ in cells}); ys = sorted({y for _, y in cells})
            for cy2 in range(2 * ys[0], 2 * ys[-1] + 3):
                for cx2 in range(2 * xs[0], 2 * xs[-1] + 3):
                    cx, cy = cx2 / 2, cy2 / 2
                    if not all(deep(x, y) for x, y in cover(cx, cy, fw, fd)): continue
                    # วางเรียงข้างกัน (ช่วงแนวนอนไม่ซ้อนกัน ห่าง ≥ 0.3 ม.) — ชิ้นที่อยู่หลังกันในบ่อเล็กจะบังกันจนอ่านไม่ออก
                    gap = min([abs(cx - q['cx']) - (fw + q['fw']) / 2 for q in placed] or [9])
                    if gap < 0.3: continue
                    # น้ำทางใต้ (ที่เงาสะท้อนตกลง) ยาวพอเงาสะท้อน 0.855h ช่อง • ใกล้กลางบ่อ • กระจายจากชิ้นอื่น
                    south = 0; yy = int(cy + fd / 2)
                    while wet(int(cx), yy) and south < 6: south += 1; yy += 1
                    need = 0.855 * PIECES[kind]['h']
                    s = 2.0 * min(1, south / max(1, need)) - 0.45 * abs(cx - pcx) - 0.3 * abs(cy - pcy) + (0.2 * min(gap, 2) + 0.25 * min(abs(cy - placed[0]['cy']), 1.5) if placed else 0)
                    s += 0.001 * ((cx2 * 7 + cy2 * 13) % 11)
                    if best is None or s > best[0]: best = (s, cx, cy)
            if best:
                _, cx, cy = best
                placed.append({'kind': kind, 'cx': cx, 'cy': cy, 'fw': fw, 'fd': fd, 'pond': rank})
        out += placed
    return d, out


def print_plan():
    d, pl = plan(); w, h = d['w'], d['h']
    rows = [list(r) for r in d['rows']]
    for i, p in enumerate(pl):
        for x, y in cover(p['cx'], p['cy'], p['fw'], p['fd']): rows[y][x] = 'abcdefghijklmnopqrstuvwxyz'[i]
        print('abcdefghijklmnopqrstuvwxyz'[i], p)
    for y, r in enumerate(rows):
        s = ''.join(r).replace('0', '.').replace('2', '~').replace('6', ',').replace('3', ':')
        if '~' in s or any(c.isalpha() for c in s): print('%2d %s' % (y, s))


# ============================================================
#  ฉาก Blender
# ============================================================
def build(samples, outdir, only=None, preview=False):
    import bpy, bmesh
    from mathutils import Vector, Matrix, Euler
    os.makedirs(outdir, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene

    # ---------- วัสดุ ----------
    def L(nt, a, b): nt.links.new(a, b)

    def stone(name, col, moss=0.5, seed=0.0):
        """หินเก่าเทาอมม่วง: นอยส์สี + ตะไคร่บนผิวที่หันฟ้า + แถบเปียกเข้มใกล้ผิวน้ำ + bump"""
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
        b.inputs['Roughness'].default_value = 0.85
        try: b.inputs['Specular IOR Level'].default_value = 0.35
        except Exception: pass
        tc = nt.nodes.new('ShaderNodeTexCoord')
        mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Location'].default_value = (seed, seed * 0.7, 0); L(nt, tc.outputs['Object'], mp.inputs['Vector'])
        nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3.2; nz.inputs['Detail'].default_value = 6; L(nt, mp.outputs['Vector'], nz.inputs['Vector'])
        rp = nt.nodes.new('ShaderNodeValToRGB'); rp.color_ramp.elements[0].position = 0.32; rp.color_ramp.elements[1].position = 0.72
        rp.color_ramp.elements[0].color = (*[c * 0.72 for c in col], 1); rp.color_ramp.elements[1].color = (*[min(1, c * 1.18) for c in col], 1)
        L(nt, nz.outputs['Fac'], rp.inputs['Fac'])
        # ตะไคร่: normal z สูง × นอยส์ใหญ่
        geo = nt.nodes.new('ShaderNodeNewGeometry'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); L(nt, geo.outputs['Normal'], sep.inputs[0])
        up = nt.nodes.new('ShaderNodeMapRange'); up.inputs['From Min'].default_value = 0.45; up.inputs['From Max'].default_value = 0.8; L(nt, sep.outputs['Z'], up.inputs['Value'])
        mn = nt.nodes.new('ShaderNodeTexNoise'); mn.inputs['Scale'].default_value = 1.6; mn.inputs['Detail'].default_value = 5; L(nt, mp.outputs['Vector'], mn.inputs['Vector'])
        mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.62 - moss * 0.22; mr.inputs['From Max'].default_value = 0.68 - moss * 0.22; L(nt, mn.outputs['Fac'], mr.inputs['Value'])
        mm = nt.nodes.new('ShaderNodeMath'); mm.operation = 'MULTIPLY'; L(nt, up.outputs['Result'], mm.inputs[0]); L(nt, mr.outputs['Result'], mm.inputs[1])
        # ตะไคร่ห้อยลงตามหน้าข้าง (ส่วนล่างครึ่งหนึ่ง) เล็กน้อย
        pz = nt.nodes.new('ShaderNodeSeparateXYZ'); L(nt, tc.outputs['Object'], pz.inputs[0])
        lo = nt.nodes.new('ShaderNodeMapRange'); lo.inputs['From Min'].default_value = 0.7; lo.inputs['From Max'].default_value = 0.15; L(nt, pz.outputs['Z'], lo.inputs['Value'])
        lm = nt.nodes.new('ShaderNodeMath'); lm.operation = 'MULTIPLY'; L(nt, lo.outputs['Result'], lm.inputs[0]); L(nt, mr.outputs['Result'], lm.inputs[1])
        lm2 = nt.nodes.new('ShaderNodeMath'); lm2.operation = 'MULTIPLY'; lm2.inputs[1].default_value = 0.55 * moss; L(nt, lm.outputs['Value'], lm2.inputs[0])
        mx = nt.nodes.new('ShaderNodeMath'); mx.operation = 'MAXIMUM'; L(nt, mm.outputs['Value'], mx.inputs[0]); L(nt, lm2.outputs['Value'], mx.inputs[1])
        moss_rgb = nt.nodes.new('ShaderNodeValToRGB')
        moss_rgb.color_ramp.elements[0].color = (0.13, 0.25, 0.07, 1); moss_rgb.color_ramp.elements[1].color = (0.28, 0.45, 0.12, 1)
        L(nt, nz.outputs['Fac'], moss_rgb.inputs['Fac'])
        mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
        L(nt, mx.outputs['Value'], mix.inputs['Factor']); L(nt, rp.outputs['Color'], mix.inputs[6]); L(nt, moss_rgb.outputs['Color'], mix.inputs[7])
        # เปียก: z 0..0.3 → เข้ม/เขียวตะไคร่น้ำ
        wt = nt.nodes.new('ShaderNodeMapRange'); wt.inputs['From Min'].default_value = 0.32; wt.inputs['From Max'].default_value = 0.02; L(nt, pz.outputs['Z'], wt.inputs['Value'])
        wmix = nt.nodes.new('ShaderNodeMix'); wmix.data_type = 'RGBA'; wmix.blend_type = 'MULTIPLY'
        L(nt, wt.outputs['Result'], wmix.inputs['Factor']); L(nt, mix.outputs[2], wmix.inputs[6]); wmix.inputs[7].default_value = (0.42, 0.48, 0.40, 1)
        L(nt, wmix.outputs[2], b.inputs['Base Color'])
        rr = nt.nodes.new('ShaderNodeMapRange'); rr.inputs['To Min'].default_value = 0.85; rr.inputs['To Max'].default_value = 0.45; L(nt, wt.outputs['Result'], rr.inputs['Value'])
        L(nt, rr.outputs['Result'], b.inputs['Roughness'])
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.35; bp.inputs['Distance'].default_value = 0.04
        bn = nt.nodes.new('ShaderNodeTexNoise'); bn.inputs['Scale'].default_value = 9; bn.inputs['Detail'].default_value = 8; L(nt, mp.outputs['Vector'], bn.inputs['Vector'])
        L(nt, bn.outputs['Fac'], bp.inputs['Height']); L(nt, bp.outputs['Normal'], b.inputs['Normal'])
        return m

    def flat(name, col, rough=0.8, emit=None, estr=0.0):
        m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Roughness'].default_value = rough
        if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = estr
        return m

    def grad(name, c0, c1, z0, z1):
        """สีไล่ตามความสูง (อ้อ: โคนเขียว → ปลายฟาง)"""
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
        b.inputs['Roughness'].default_value = 0.75
        tc = nt.nodes.new('ShaderNodeTexCoord'); sp = nt.nodes.new('ShaderNodeSeparateXYZ'); L(nt, tc.outputs['Object'], sp.inputs[0])
        mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = z0; mr.inputs['From Max'].default_value = z1; L(nt, sp.outputs['Z'], mr.inputs['Value'])
        rp = nt.nodes.new('ShaderNodeValToRGB'); rp.color_ramp.elements[0].color = (*c0, 1); rp.color_ramp.elements[1].color = (*c1, 1)
        L(nt, mr.outputs['Result'], rp.inputs['Fac']); L(nt, rp.outputs['Color'], b.inputs['Base Color'])
        return m

    lin = lambda c: tuple(v ** 2.2 for v in c)
    M_ST = stone('stone', (0.56, 0.54, 0.56), moss=0.55)              # หินเทาอมม่วง
    M_ST2 = stone('stone2', (0.60, 0.56, 0.52), moss=0.45, seed=3.3)  # หินอุ่นกว่า (สลับก้อน)
    M_ST3 = stone('stone3', (0.46, 0.46, 0.50), moss=0.75, seed=7.1)  # ก้อนล่าง/เศษหิน ตะไคร่หนา
    M_RUNE = flat('rune', (0.1, 0.35, 0.45), 0.4, lin(RUNE), 7.0)
    M_RUNE_DIM = flat('rune_dim', (0.08, 0.25, 0.32), 0.5, lin(RUNE), 2.4)
    M_REED = grad('reed', (0.20, 0.30, 0.08), (0.62, 0.55, 0.30), 0.0, 0.8)
    M_PLUME = flat('plume', (0.92, 0.86, 0.74), 0.9)

    # ---------- เรขาคณิต ----------
    cols = {}

    def coll(name):
        if name not in cols:
            c = bpy.data.collections.new(name); sc.collection.children.link(c); cols[name] = c
        return cols[name]

    def finish(bm, bevel=0.035, cut=True):
        """ลบมุมคม (ไฮไลต์ขอบหิน) → ตัดส่วนใต้ผิวน้ำทิ้ง (z < 0) แล้วปิดรู"""
        bm.normal_update()
        if bevel:
            ed = [e for e in bm.edges if e.calc_face_angle(0) > 0.6]
            if ed: bmesh.ops.bevel(bm, geom=ed, offset=bevel, segments=1, affect='EDGES', clamp_overlap=True)
        if cut:
            geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
            r = bmesh.ops.bisect_plane(bm, geom=geom, dist=1e-5, plane_co=(0, 0, 0), plane_no=(0, 0, 1), clear_inner=True)
            bnd = [e for e in bm.edges if e.is_boundary and all(abs(v.co.z) < 1e-4 for v in e.verts)]   # ปิดเฉพาะรูที่ผิวน้ำ
            if bnd:
                try: bmesh.ops.holes_fill(bm, edges=bnd, sides=0)
                except Exception as ex: print('holes_fill', ex)
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        return bm

    def obj(name, bm, material, cname, smooth=False, bevel=0.035, cut=True):
        finish(bm, bevel, cut)
        me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new(name, me); coll(cname).objects.link(o)
        o.data.materials.append(material)
        for p in o.data.polygons: p.use_smooth = smooth
        return o

    def box(bm, c, s, rot=(0, 0, 0)):
        M = Matrix.LocRotScale(Vector(c), Euler(rot).to_quaternion(), Vector(s))
        bmesh.ops.create_cube(bm, size=1.0, matrix=M)

    def chunk(bm, c, s, rnd, rot=(0, 0, 0), jag=0.18):
        """ก้อนหินแตก: กล่องที่มุมบนถูกเฉือนสุ่ม (ไม่เป็นกล่องเรียบ)"""
        M = Matrix.LocRotScale(Vector(c), Euler(rot).to_quaternion(), Vector(s))
        r = bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Identity(4))
        for v in r['verts']:
            if v.co.z > 0: v.co.z -= rnd.uniform(0, jag) / max(s[2], 0.05)
            v.co.x *= 1 + rnd.uniform(-0.06, 0.06); v.co.y *= 1 + rnd.uniform(-0.06, 0.06)
            v.co = M @ v.co

    def reeds(bm, plume_bm, cx, cy, rnd, n=14, hmax=0.95, spread=0.28):
        """กอต้นอ้อ/หญ้าขนนก: ใบเรียวเอนออก + ช่อดอกสีครีมบางต้น (ไม่มีเส้นขอบ)"""
        for i in range(n):
            a = rnd.uniform(0, 2 * math.pi); r0 = rnd.uniform(0, spread)
            x0, y0 = cx + math.cos(a) * r0, cy + math.sin(a) * r0
            hh = rnd.uniform(0.45, 1.0) * hmax; lean = rnd.uniform(0.08, 0.32)
            x1, y1, z1 = x0 + math.cos(a) * lean, y0 + math.sin(a) * lean, hh
            p0, p1 = Vector((x0, y0, -0.05)), Vector((x1, y1, z1)); d = p1 - p0
            q = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
            bmesh.ops.create_cone(bm, cap_ends=True, segments=4, radius1=0.022, radius2=0.003, depth=d.length, matrix=Matrix.Translation((p0 + p1) / 2) @ q)
            if rnd.random() < 0.45:
                pp = p1 + d.normalized() * 0.09
                M = Matrix.Translation(pp) @ q @ Matrix.Diagonal((0.035, 0.035, 0.12, 1))
                bmesh.ops.create_uvsphere(plume_bm, u_segments=6, v_segments=5, radius=1.0, matrix=M)

    def rune_glyphs(bm, x0, z0, x1, z1, y, rnd, n=None, w=0.018, out=None):
        """ขีดรูนแนวตั้ง (แบบ Elder Futhark ง่าย ๆ) บนหน้าใต้ (ระนาบ y) ภายในกรอบ x0..x1, z0..z1 • out = จุดกลางแต่ละตัว (สำหรับประกาย)"""
        n = n or max(1, int((z1 - z0) / 0.28))
        step = (z1 - z0) / n
        for i in range(n):
            zc = z0 + step * (i + 0.5); xc = (x0 + x1) / 2 + rnd.uniform(-0.03, 0.03); hgt = step * 0.78
            def strip(xa, za, xb, zb):
                dx, dz = xb - xa, zb - za; Ln = math.hypot(dx, dz); nx, nz = -dz / Ln * w, dx / Ln * w
                vs = [bm.verts.new(v) for v in [(xa - nx, y, za - nz), (xb - nx, y, zb - nz), (xb + nx, y, zb + nz), (xa + nx, y, za + nz)]]
                bm.faces.new(vs)
            strip(xc, zc - hgt / 2, xc, zc + hgt / 2)
            k = rnd.randrange(4); s = hgt * 0.36
            if k == 0: strip(xc, zc + hgt / 2 - s * 0.2, xc + s, zc + hgt / 2 - s)
            elif k == 1: strip(xc, zc, xc + s, zc + s * 0.7); strip(xc, zc, xc - s, zc + s * 0.7)
            elif k == 2: strip(xc, zc + s, xc + s, zc); strip(xc + s, zc, xc, zc - s)
            else: strip(xc - s, zc + s, xc + s, zc - s); strip(xc - s, zc - s, xc + s, zc + s)
            if out is not None: out.append((xc, y, zc))

    meta = {}
    built = {}

    # ---------- เสาสลัก (ใช้ซ้ำในซุ้ม/เสาเดี่ยว) ----------
    def column(name, cx, cy, n_blocks, rnd, wid=0.74, broken=True, glyph=True, cap=False, lean=(0, 0)):
        bmA, bmB, bmC, rn = bmesh.new(), bmesh.new(), bmesh.new(), bmesh.new()
        box(bmC, (cx, cy, 0.05), (wid + 0.32, wid + 0.32, 0.5))                       # ฐานกว้าง (จมครึ่ง)
        box(bmC, (cx, cy, 0.36), (wid + 0.16, wid + 0.16, 0.14))
        z = 0.43; bh = 0.5
        for i in range(n_blocks):
            last = broken and i == n_blocks - 1
            dx, dy = rnd.uniform(-0.025, 0.025) + lean[0] * i, rnd.uniform(-0.025, 0.025) + lean[1] * i
            tgt = bmA if i % 2 == 0 else bmB
            if last:
                chunk(tgt, (cx + dx, cy + dy, z + bh * 0.5), (wid, wid, bh), rnd, (rnd.uniform(-0.05, 0.05), rnd.uniform(-0.05, 0.05), rnd.uniform(-0.1, 0.1)), jag=0.32)
            else:
                box(tgt, (cx + dx, cy + dy, z + bh / 2), (wid, wid, bh - 0.02), (0, 0, rnd.uniform(-0.04, 0.04)))
                # แถบสลักรอบก้อน (คิ้วนูนบาง ๆ)
                if i % 2 == 1: box(tgt, (cx + dx, cy + dy, z + bh - 0.06), (wid + 0.05, wid + 0.05, 0.06))
                if glyph and i in (1, 2, 3):
                    rune_glyphs(rn, cx + dx - 0.12, z + 0.08, cx + dx + 0.12, z + bh - 0.1, cy + dy - wid / 2 - 0.004, rnd, n=1)
            z += bh
        if cap and not broken:
            box(bmC, (cx, cy, z + 0.09), (wid + 0.22, wid + 0.22, 0.18))
            z += 0.18
        return [(bmA, M_ST), (bmB, M_ST2), (bmC, M_ST3), (rn, M_RUNE_DIM)], z

    def rubble(bm, cx, cy, rnd, n=5, spread=0.7, size=0.32):
        for i in range(n):
            a = rnd.uniform(0, 2 * math.pi); r = rnd.uniform(0.15, spread)
            s = rnd.uniform(0.6, 1.1) * size
            chunk(bm, (cx + math.cos(a) * r, cy + math.sin(a) * r * 0.6, rnd.uniform(-0.05, 0.08)), (s * 1.3, s, s), rnd,
                  (rnd.uniform(-0.3, 0.3), rnd.uniform(-0.3, 0.3), rnd.uniform(0, 3)), jag=0.1)

    def emit_piece(name, parts, fine=None, glints=None):
        for i, (bm, m) in enumerate(parts):
            if len(bm.verts) == 0: bm.free(); continue
            is_rune = m in (M_RUNE, M_RUNE_DIM)
            obj(f'{name}_{i}', bm, m, f'{name}_fine' if is_rune else f'{name}_main', bevel=0 if is_rune else 0.03)
        for i, (bm, m) in enumerate(fine or []):
            if len(bm.verts) == 0: bm.free(); continue
            obj(f'{name}_f{i}', bm, m, f'{name}_fine', smooth=True, bevel=0)
        meta[name] = {'glints': [list(g) for g in (glints or [])]}
        coll(f'{name}_main'); coll(f'{name}_fine')

    want = only or list(PIECES)

    # ---------- ซุ้มโค้งหัก ----------
    if 'arch' in want:
        rnd = random.Random(61)
        parts = []
        L1, zL = column('archL', -1.35, 0, 5, rnd, wid=0.72, broken=False, glyph=True)
        R1, zR = column('archR', 1.35, 0, 5, rnd, wid=0.72, broken=False, glyph=False)
        parts += L1 + R1
        bmV, bmV2, rn = bmesh.new(), bmesh.new(), bmesh.new()
        spring = zL + 0.02; Rr, th = 1.35, 0.42
        # คิ้วรับโค้ง (impost) สองข้าง
        box(bmV2, (-1.35, 0, spring + 0.07), (0.9, 0.86, 0.14)); box(bmV2, (1.35, 0, spring + 0.07), (0.9, 0.86, 0.14))
        spring += 0.14
        N = 11
        for i in range(N):
            if i in (7, 8): continue                       # ก้อนโค้งหลุดหาย 2 ก้อน (ฝั่งขวาบน)
            a0, a1 = math.pi - i / N * math.pi, math.pi - (i + 1) / N * math.pi
            gap = 0.012
            a0 -= gap; a1 += gap
            ri, ro = Rr - 0.36, Rr - 0.36 + th + (0.08 if i == 5 else 0)
            tgt = bmV if i % 2 == 0 else bmV2
            vs = []
            for (r_, a_) in ((ri, a0), (ro, a0), (ro, a1), (ri, a1)):
                for yy in (-0.33, 0.33):
                    vs.append((r_ * math.cos(a_), yy, spring + r_ * math.sin(a_)))
            vv = [tgt.verts.new(v) for v in vs]
            bmesh.ops.convex_hull(tgt, input=vv)                       # ก้อนลิ่ม 8 จุด → ทรงตันปิดสนิท (ไม่มีหน้ากลับด้าน)
        # ก้อนกำแพงเหนือโค้งฝั่งซ้าย (ยังติดอยู่) + ฝั่งขวาเหลือก้อนเดียวแตก
        top = spring + Rr + 0.06
        # ผนังเหนือโค้ง (spandrel) ฝั่งซ้าย 2 ชั้นหินเรียง แตกเป็นขั้นลงทางขวา • ฝั่งขวาเหลือก้อนเดียว
        # (ลึก 0.58 < ก้อนโค้ง 0.66 — ผิวไม่ซ้อนระนาบเดียวกัน ไม่งั้นจุดแรเงาอยู่ในเนื้ออีกก้อน = ดำสนิท)
        box(bmV, (-1.33, 0.02, spring + 0.38), (0.74, 0.58, 0.74))
        box(bmV2, (-1.36, 0.02, spring + 1.0), (0.8, 0.58, 0.46)); box(bmV, (-0.62, 0.02, spring + 1.04), (0.62, 0.56, 0.44), (0, 0, 0.02))
        chunk(bmV, (-1.28, 0.02, top + 0.12), (0.7, 0.56, 0.36), rnd, (0, 0.03, 0.03), jag=0.22)
        chunk(bmV2, (-0.12, 0.02, spring + 1.04), (0.42, 0.54, 0.4), rnd, (0, 0.08, 0), jag=0.3)
        box(bmV2, (1.33, 0.02, spring + 0.33), (0.72, 0.58, 0.62)); chunk(bmV, (1.38, 0.02, spring + 0.8), (0.66, 0.56, 0.34), rnd, jag=0.3)
        # รูนเรืองตามแนวโค้งด้านใน (intrados) — ช่วงที่ยังอยู่
        rr = Rr - 0.38
        for i in range(30):
            a0, a1 = math.pi - i / 30 * math.pi, math.pi - (i + 0.6) / 30 * math.pi
            if 0.62 < i / 30 < 0.84: continue
            vs = [rn.verts.new(v) for v in [(rr * math.cos(a0), -0.335, spring + rr * math.sin(a0) - 0.0), (rr * math.cos(a1), -0.335, spring + rr * math.sin(a1)),
                                            ((rr + 0.05) * math.cos(a1), -0.335, spring + (rr + 0.05) * math.sin(a1)), ((rr + 0.05) * math.cos(a0), -0.335, spring + (rr + 0.05) * math.sin(a0))]]
            rn.faces.new(vs[::-1])
        glints = []
        rune_glyphs(rn, -0.15, spring + Rr - 0.02, 0.15, spring + Rr + 0.3, -0.42, rnd, n=1, out=glints)   # รูนบนก้อนหัวโค้ง (keystone)
        parts += [(bmV, M_ST), (bmV2, M_ST2), (rn, M_RUNE)]
        rb = bmesh.new(); rubble(rb, 0.1, -0.15, rnd, 6, 1.1, 0.3); rubble(rb, 1.5, -0.25, rnd, 3, 0.4, 0.38); parts.append((rb, M_ST3))
        rd, pl = bmesh.new(), bmesh.new()
        reeds(rd, pl, -1.9, -0.35, rnd, 16, 1.0); reeds(rd, pl, 2.05, 0.1, rnd, 10, 0.8); reeds(rd, pl, 0.7, -0.45, rnd, 6, 0.5)
        emit_piece('arch', parts, [(rd, M_REED), (pl, M_PLUME)], glints)

    # ---------- เสาสลักสูงหักยอด ----------
    if 'pillar_tall' in want:
        rnd = random.Random(72)
        parts, z = column('pt', 0, 0, 7, rnd, wid=0.78, broken=True, glyph=True, lean=(0.006, 0))
        rb = bmesh.new(); chunk(rb, (0.55, -0.32, 0.05), (0.45, 0.4, 0.36), rnd, (0.3, 0.2, 0.6), 0.1); parts.append((rb, M_ST3))
        rd, pl = bmesh.new(), bmesh.new(); reeds(rd, pl, -0.6, -0.3, rnd, 12, 0.9)
        emit_piece('pillar_tall', parts, [(rd, M_REED), (pl, M_PLUME)])

    # ---------- เสาตอกลาง + ก้อนที่หล่นพิง ----------
    if 'pillar_short' in want:
        rnd = random.Random(83)
        parts, z = column('ps', -0.15, 0.05, 3, rnd, wid=0.74, broken=True, glyph=True)
        rb = bmesh.new()
        chunk(rb, (0.5, -0.2, 0.12), (0.72, 0.5, 0.5), rnd, (0.0, -0.5, 0.35), 0.12)       # ก้อนเสาที่หล่นมาพิง
        rubble(rb, 0.1, -0.2, rnd, 3, 0.6, 0.26); parts.append((rb, M_ST3))
        rd, pl = bmesh.new(), bmesh.new(); reeds(rd, pl, 0.55, 0.25, rnd, 10, 0.8)
        emit_piece('pillar_short', parts, [(rd, M_REED), (pl, M_PLUME)])

    # ---------- เสาล้มนอนจมครึ่ง ----------
    if 'toppled' in want:
        rnd = random.Random(94)
        bA, bB, bC, rn = bmesh.new(), bmesh.new(), bmesh.new(), bmesh.new()
        yaw = math.radians(-14)
        c, s = math.cos(yaw), math.sin(yaw)
        for i in range(4):
            t = -1.15 + i * 0.76
            x, y = t * c, t * s
            zc = 0.12 - 0.05 * i + rnd.uniform(-0.03, 0.03)
            rot = (rnd.uniform(-0.06, 0.06), math.radians(90) + rnd.uniform(-0.08, 0.08), yaw + rnd.uniform(-0.06, 0.06))
            # แกนยาวของก้อน = แกน z ท้องถิ่น หมุน 90° รอบ y → นอนตามแนว x
            box(bA if i % 2 == 0 else bB, (x, y, zc), (0.72, 0.72, 0.7), rot)
            if i == 1: rune_glyphs(rn, x - 0.14, 0.05, x + 0.14, zc + 0.3, y - 0.37, rnd, n=1)
        chunk(bC, (1.75 * c, 1.75 * s - 0.05, 0.02), (0.95, 0.9, 0.36), rnd, (0.2, -0.15, yaw + 0.3), 0.1)   # หัวเสาหลุดจมอยู่ปลาย
        rubble(bC, -1.55, -0.1, rnd, 3, 0.4, 0.25)
        rd, pl = bmesh.new(), bmesh.new(); reeds(rd, pl, -0.3, 0.42, rnd, 10, 0.7); reeds(rd, pl, 1.1, -0.42, rnd, 6, 0.5)
        emit_piece('toppled', [(bA, M_ST), (bB, M_ST2), (bC, M_ST3), (rn, M_RUNE_DIM)], [(rd, M_REED), (pl, M_PLUME)])

    # ---------- ศิลารูนจมครึ่ง (เอียง) ----------
    if 'runestone' in want:
        rnd = random.Random(105)
        st, rn, rb = bmesh.new(), bmesh.new(), bmesh.new()
        W, D, H = 1.05, 0.36, 2.3
        prof = [(-W / 2 - 0.05, -0.6), (W / 2 + 0.05, -0.6), (W / 2 * 0.96, H - 0.75)] + \
               [(W / 2 * math.cos(a) * (1 + rnd.uniform(-0.05, 0.03)), H - 0.75 + 0.55 * math.sin(a) * (1 + rnd.uniform(-0.12, 0.04)) - (0.16 if 2 <= i <= 3 else 0))
                for i, a in [(i, i / 10 * math.pi) for i in range(1, 10)]] + [(-W / 2 * 0.96, H - 0.75)]   # ยอดโค้งบิ่นทางขวา
        fr = [st.verts.new((x, -D / 2, z)) for x, z in prof]; bk = [st.verts.new((x, D / 2, z)) for x, z in prof]
        st.faces.new(fr[::-1]); st.faces.new(bk)
        n = len(prof)
        for i in range(n): st.faces.new([fr[i], fr[(i + 1) % n], bk[(i + 1) % n], bk[i]])
        bmesh.ops.recalc_face_normals(st, faces=st.faces[:])
        # ปิ่นแตกที่มุมบนขวา
        glints = []
        rune_glyphs(rn, -0.16, 0.08, 0.16, H - 0.62, -D / 2 - 0.006, rnd, n=4, w=0.02, out=glints)
        # ขอบสลักกรอบ (คิ้วนูน) บนหน้าใต้
        for sx in (-1, 1): box(st, (sx * (W / 2 - 0.1), -D / 2 - 0.01, (H - 1.35) / 2), (0.05, 0.03, H - 0.75 - 0.0))
        lean = Matrix.Rotation(math.radians(-9), 4, 'X') @ Matrix.Rotation(math.radians(7), 4, 'Y')   # เอนไปหลัง-ขวา
        for b_ in (st, rn): bmesh.ops.transform(b_, matrix=lean, verts=b_.verts[:])
        glints = [tuple(lean @ Vector(g)) for g in glints]
        rubble(rb, 0.0, -0.1, rnd, 5, 0.75, 0.24)
        rd, pl = bmesh.new(), bmesh.new(); reeds(rd, pl, -0.55, -0.25, rnd, 9, 0.75); reeds(rd, pl, 0.6, 0.15, rnd, 7, 0.6)
        emit_piece('runestone', [(st, M_ST3), (rb, M_ST), (rn, M_RUNE)], [(rd, M_REED), (pl, M_PLUME)], glints)

    # ---------- ตอเสา 3 ต้น ----------
    if 'stumps' in want:
        rnd = random.Random(116)
        parts = []
        for (x, y, nb, wd) in ((-0.8, 0.05, 2, 0.66), (0.15, -0.08, 1, 0.62), (0.95, 0.12, 1, 0.56)):
            pp, _ = column(f's{x}', x, y, nb, rnd, wid=wd, broken=True, glyph=False)
            parts += pp
        rd, pl = bmesh.new(), bmesh.new(); reeds(rd, pl, 0.55, -0.3, rnd, 10, 0.75); reeds(rd, pl, -1.3, 0.2, rnd, 8, 0.6)
        emit_piece('stumps', parts, [(rd, M_REED), (pl, M_PLUME)])

    # ---------- แสง: ยามเย็น ----------
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 3.4; sun.angle = math.radians(6); sun.color = (1.0, 0.84, 0.68)
    so = bpy.data.objects.new('sun', sun); sc.collection.objects.link(so)
    so.rotation_euler = (math.radians(42), 0, math.radians(-135))     # ซ้ายบน → เงาตกขวาล่าง
    rim = bpy.data.lights.new('rim', 'SUN'); rim.energy = 3.0; rim.angle = math.radians(8); rim.color = (1.0, 0.50, 0.42)
    ro = bpy.data.objects.new('rim', rim); sc.collection.objects.link(ro)
    ro.rotation_euler = (math.radians(68), 0, math.radians(100))      # ขอบแสงชมพูส้มอาทิตย์ตกจากขวา (SKY.mistlake)
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.62, 0.55, 0.78, 1)   # ฟ้าหมอกม่วงชมพู
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.55

    # ---------- กล้อง/เรนเดอร์ ----------
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.sensor_fit = 'HORIZONTAL'; cam.clip_end = 200
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
    c_, s_ = K, SN
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
    sc.cycles.samples = 12 if preview else samples
    try: sc.cycles.use_denoising = True
    except Exception: pass
    sc.cycles.max_bounces = 5
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    try: sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Punchy'
    except Exception: sc.view_settings.view_transform = 'Filmic'
    sc.view_settings.exposure = 0.3
    sc.render.resolution_percentage = 50 if preview else 100
    vl = bpy.context.view_layer; fs = vl.freestyle_settings
    fs.crease_angle = math.radians(125)
    ls = fs.linesets[0] if fs.linesets else fs.linesets.new('L')
    ls.select_by_visibility = True; ls.select_by_collection = True
    ls.select_silhouette = True; ls.select_border = True; ls.select_crease = True
    if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new('line')
    ls.linestyle.color = (0.08, 0.05, 0.04); ls.linestyle.alpha = 0.9

    def scr(p, mirror):
        """จุดโลก → พิกัดจอ (ม.) ของกล้องเกม • mirror = ภาพสะท้อน (จุดสูง z ปรากฏใต้ฐาน)"""
        return p[0], p[1] * K + (-p[2] if mirror else p[2]) * SN

    def frame(objs, pad, mirror):
        bpy.context.view_layer.update()
        xs, ys = [], []
        for o in objs:
            M = o.matrix_world
            for v in o.data.vertices:
                sx, sy = scr(M @ v.co, mirror); xs.append(sx); ys.append(sy)
        x0, x1, y0, y1 = min(xs) - pad, max(xs) + pad, min(ys) - pad, max(ys) + pad
        wpx, hpx = math.ceil((x1 - x0) * RES_B), math.ceil((y1 - y0) * RES_B)
        return x0, y0, x0 + wpx / RES_B, y0 + hpx / RES_B, wpx, hpx

    def shoot(fr, path, mirror):
        x0, y0, x1, y1, wpx, hpx = fr
        cam.ortho_scale = x1 - x0
        cxs, cys = (x0 + x1) / 2, (y0 + y1) / 2
        if not mirror:
            d = Vector((0, s_, -c_)); u = Vector((0, c_, s_))
            co.matrix_world = Matrix.Identity(4); co.rotation_euler = (TH, 0, 0)
            co.location = Vector((cxs, 0, 0)) + u * cys - d * 60
        else:
            # กล้องกระจก: กล้องเกมสะท้อนผ่านระนาบน้ำ z=0 (มองขึ้น) — แกน (ขวา, ขึ้น, หลัง) = (1,0,0), (0,-c,s), (0,-s,-c)
            # ภาพที่ได้กลับหัว (พลิกตอนติดตั้ง): แถวบน = sy ต่ำสุดของภาพสะท้อน
            up = Vector((0, -c_, s_)); back = Vector((0, -s_, -c_)); dirv = -back
            loc = Vector((cxs, 0, 0)) + up * (-cys) - dirv * 60
            co.matrix_world = Matrix(((1, 0, 0, loc.x), (0, -c_, -s_, loc.y), (0, s_, -c_, loc.z), (0, 0, 0, 1)))
        sc.render.resolution_x = wpx; sc.render.resolution_y = hpx
        sc.render.filepath = path
        bpy.ops.render.render(write_still=True)
        print('เรนเดอร์ →', path, wpx, 'x', hpx)

    def set_vis(target):
        for cname, cl in cols.items():
            piece = cname.rsplit('_', 1)[0]
            for o in cl.objects: o.hide_render = piece != target

    for name in want:
        if name not in meta: continue
        set_vis(name); ls.collection = cols[f'{name}_main']
        objs = list(cols[f'{name}_main'].objects) + list(cols[f'{name}_fine'].objects)
        fw, fd = PIECES[name]['size']
        anchor = (0.0, -fd / 2, 0.0)                         # จุดยึด = ขอบหน้า (ใต้) กลางฐาน บนผิวน้ำ = จุดเรียงความลึก
        m = meta[name]
        # B: ตัววัตถุ
        sc.render.use_freestyle = True; sc.render.line_thickness_mode = 'ABSOLUTE'; sc.render.line_thickness = 1.0
        ls.linestyle.thickness = 5.0 * (0.5 if preview else 1)
        fr = frame(objs, 0.14, False)
        shoot(fr, os.path.join(outdir, f'{name}.png'), False)
        x0, y0, x1, y1, wpx, hpx = fr
        def px(p, mirror=False, _f=fr):
            sx, sy = scr(p, mirror); return [round((sx - _f[0]) * RES_B, 2), round((_f[3] - sy) * RES_B, 2)]
        m['anchor'] = px(anchor); m['px'] = [wpx, hpx]
        m['glintpx'] = [px(g) for g in m['glints']]
        # A: เงาสะท้อน (ไม่มีเส้นขอบ — ภาพในน้ำนุ่ม)
        sc.render.use_freestyle = False
        fr2 = frame(objs, 0.14, True)
        shoot(fr2, os.path.join(outdir, f'{name}_refl.png'), True)
        m['ranchor'] = px(anchor, True, fr2); m['rpx'] = [fr2[4], fr2[5]]
        m['size'] = [fw, fd]
    mp = os.path.join(outdir, 'meta.json')
    old = {}
    if os.path.exists(mp):
        try: old = json.load(open(mp))
        except Exception: old = {}
    for k, v in meta.items():
        if 'anchor' in v: old[k] = v
    json.dump(old, open(mp, 'w'), indent=1)
    print('meta →', mp)


# ============================================================
#  ติดตั้ง
# ============================================================
def paint(im, sat=1.25, con=1.06, bri=1.04, outline=True, ow=3):
    from PIL import Image, ImageEnhance, ImageFilter
    a = im.getchannel('A')
    rgb = ImageEnhance.Color(im.convert('RGB')).enhance(sat)
    rgb = ImageEnhance.Contrast(rgb).enhance(con)
    rgb = ImageEnhance.Brightness(rgb).enhance(bri)
    im = Image.merge('RGBA', (*rgb.split(), a))
    if outline:
        edge = a.point(lambda v: 255 if v > 60 else 0).filter(ImageFilter.MaxFilter(ow)).filter(ImageFilter.GaussianBlur(0.5))
        ol = Image.new('RGBA', im.size, (34, 20, 12, 0)); ol.putalpha(edge.point(lambda v: int(v * 0.92)))
        ol.alpha_composite(im); im = ol
    return im


def reflection(im, ax, ay, fw, fd):
    """ภาพจากกล้องกระจก (พลิกแล้ว, พิกัดจอ 160 px/ม.) → ภาพพื้น 40 px/ม. (ยืดแนวตั้ง ×1/K) + ริ้วคลื่น + จางตามระยะ + ย้อมสีน้ำยามเย็น + วงคลื่นรอบฐาน
    คืน (ภาพ, จุดยึด x, y ในภาพใหม่)"""
    import numpy as np
    from PIL import Image, ImageFilter, ImageDraw
    sx, sy = PX / RES_B, PX / (RES_B * K)
    W, H = max(1, round(im.width * sx)), max(1, round(im.height * sy))
    im = im.resize((W, H), Image.LANCZOS)
    ax, ay = ax * sx, ay * sy
    pad = 10
    can = Image.new('RGBA', (W + pad * 2, H + pad * 2), (0, 0, 0, 0)); can.alpha_composite(im, (pad, pad)); ax += pad; ay += pad
    a = np.asarray(can).astype(np.float32) / 255.0
    Hh, Ww = a.shape[:2]
    # ริ้วคลื่น: เลื่อนแต่ละแถวตามแนวนอน (แรงขึ้นเมื่อไกลฐาน) — ภาพสะท้อนในน้ำนิ่งที่มีคลื่นบาง ๆ
    out = np.zeros_like(a)
    rng = np.random.default_rng(6)
    ph = rng.uniform(0, 6.28, 3)
    xs = np.arange(Ww, dtype=np.float32)
    for y in range(Hh):
        dist = max(0.0, (y - ay) / PX)                      # ช่องใต้ฐาน
        amp = 1.0 + 2.2 * min(1.0, dist / 2.0)
        off = amp * (math.sin(y * 0.55 + ph[0]) * 0.7 + math.sin(y * 0.19 + ph[1]) * 0.5 + math.sin(y * 1.3 + ph[2]) * 0.25)
        src = np.clip(xs - off, 0, Ww - 1)
        x0 = np.floor(src).astype(int); x1 = np.minimum(x0 + 1, Ww - 1); f = (src - x0)[:, None]
        out[y] = a[y, x0] * (1 - f) + a[y, x1] * f
    # จางตามระยะจากฐาน + แถบคลื่นแนวนอน (บางแถวจางลง = เส้นคลื่นตัดเงา)
    yy = np.arange(Hh, dtype=np.float32)[:, None]
    dist = np.maximum(0, (yy - ay) / PX)
    fade = np.exp(-dist / 3.2) * 0.9 + 0.1
    band = 0.72 + 0.28 * np.sin(yy * 0.8 + 1.3) * np.sin(yy * 0.21)   # แถบคลื่นตัดภาพสะท้อนเป็นช่วง ๆ
    alpha = out[..., 3] * (fade * band)
    alpha *= np.clip((yy - (ay - 8)) / 8, 0, 1)            # เหนือขอบหน้าฐาน = หน้าตัดผิวน้ำของวัตถุ (สไปรต์บังอยู่แล้ว) → ตัดทิ้ง กันขอบมืด
    # ย้อมสี: มืดลงเล็กน้อย + ผสมสีฟ้ายามเย็น (ชมพูม่วงของ ATMOS.mistlake)
    rgb = out[..., :3]
    tint = np.array([0.42, 0.48, 0.74], np.float32)            # ผสมสีน้ำเล็กน้อยให้กลืนกับบ่อ (ไม่ซีดเป็นแสงขาว)
    rgb = rgb * 0.8 * 0.82 + tint * rgb.mean(axis=2, keepdims=True) * 0.18 * 1.1
    res = np.dstack([np.clip(rgb, 0, 1), np.clip(alpha, 0, 1)])
    img = Image.fromarray((res * 255).astype(np.uint8), 'RGBA').filter(ImageFilter.GaussianBlur(0.6))
    # วงคลื่นรอบฐาน (ผิวน้ำแตะหิน) — วงรีในพิกัดพื้น (ไม่บีบ) • ครึ่งเหนืออยู่ใต้ตัวสไปรต์อยู่แล้ว
    ring = Image.new('RGBA', img.size, (0, 0, 0, 0)); dr = ImageDraw.Draw(ring)
    cx, cy = ax, ay - fd / 2 * PX
    for k, (grow, al) in enumerate(((0.12, 120), (0.42, 70), (0.78, 36))):
        rx, ry = (fw / 2 + grow) * PX, (fd / 2 + grow) * PX
        dr.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], outline=(235, 240, 255, al), width=2 if k == 0 else 1)
    ring = ring.filter(ImageFilter.GaussianBlur(0.8))
    img.alpha_composite(ring)
    # ตัดขอบโปร่ง
    l, t, r, b = img.getchannel('A').point(lambda v: 255 if v > 3 else 0).getbbox()
    img = img.crop((l, t, r, b))
    return img, ax - l, ay - t


def install(src):
    from PIL import Image
    sys.path.insert(0, os.path.join(ROOT, 'tools'))
    meta = json.load(open(os.path.join(src, 'meta.json')))
    d, pl = plan()
    data = {'map': MAP_ID, 'hash': d['hash'], 'ground': [], 'reflect': [], 'pieces': []}
    sc = STORE_B / RES_B
    done = {}
    for name in PIECES:
        m = meta.get(name)
        if not m or not os.path.exists(os.path.join(src, name + '.png')): print('ข้าม', name); continue
        fw, fd = PIECES[name]['size']
        im = Image.open(os.path.join(src, name + '.png')).convert('RGBA')
        im = im.resize((round(im.width * sc), round(im.height * sc)), Image.LANCZOS)
        im = paint(im, sat=1.15, con=1.08, bri=1.04)
        l, t, r, b = im.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox()
        l, t, r, b = max(0, l - 2), max(0, t - 2), min(im.width, r + 2), min(im.height, b + 2)
        im = im.crop((l, t, r, b))
        key = 'bake_lake_' + name; im.save(os.path.join(ROOT, 'assets', key + '.webp'), 'WEBP', quality=90, method=6)
        ax, ay = m['anchor'][0] * sc - l, m['anchor'][1] * sc - t
        glints = [[round(g[0] * sc - l, 1), round(g[1] * sc - t, 1), 1.0] for g in m.get('glintpx', [])]
        # เงาสะท้อน
        rim = Image.open(os.path.join(src, name + '_refl.png')).convert('RGBA').transpose(Image.FLIP_TOP_BOTTOM)
        rax, ray = m['ranchor'][0], m['ranchor'][1]
        rimg, rax, ray = reflection(rim, rax, ray, fw, fd)
        rkey = key + '_refl'; rimg.save(os.path.join(ROOT, 'assets', rkey + '.webp'), 'WEBP', quality=85, method=6)
        done[name] = {'img': key, 'ax': round(ax, 1), 'ay': round(ay, 1), 'glints': glints, 'rimg': rkey, 'rax': round(rax, 1), 'ray': round(ray, 1),
                      'rw': rimg.width, 'rh': rimg.height}
        print('ติดตั้ง', key, im.size, 'anchor', (round(ax, 1), round(ay, 1)), '| เงาสะท้อน', rimg.size)
    for i, p in enumerate(pl):
        e = done.get(p['kind'])
        if not e: continue
        x, y = round(p['cx'], 3), round(p['cy'] + p['fd'] / 2, 3)      # จุดยึด = ขอบใต้กลางฐาน
        pid = f"{p['kind']}_{i}"
        data['pieces'].append({'id': pid, 'img': e['img'], 'x': x, 'y': y, 'ax': e['ax'], 'ay': e['ay'], 'scale': PX / STORE_B,
                               'block': [list(c) for c in cover(p['cx'], p['cy'], p['fw'], p['fd'])], 'jars': e['glints'], 'glint': '95,212,255'})
        data['reflect'].append({'id': pid, 'img': e['rimg'], 'x': round(x - e['rax'] / PX, 3), 'y': round(y - e['ray'] / PX, 3),
                                'w': round(e['rw'] / PX, 3), 'h': round(e['rh'] / PX, 3)})
    js = ("'use strict';\n// สร้างอัตโนมัติโดย tools/lake3d.py --install — อย่าแก้ด้วยมือ (แก้ใน tools/lake3d.py แล้วติดตั้งใหม่)\n"
          "// ซากโบราณในบ่อน้ำ Mistlake (docs/RENDER3D_PLAN.md #6) — รวมเข้า BAKE_DATA ของ js/bake_data.js (โหลดต่อจากไฟล์นั้น)\n"
          "// pieces = สไปรต์ตั้งตรงยืนในน้ำ (x,y = จุดยึด/จุดเรียงความลึก = ขอบใต้กลางฐาน) • reflect = เงาสะท้อนวาดลงผ้าใบพื้น (กรอบ x,y,w,h ช่อง) ตัดเฉพาะน้ำลึก\n"
          "// hash = ผังน้ำตอนเลือกตำแหน่ง — ไม่ตรง (ผังแมพเปลี่ยน) เกมจะไม่วางซากเลย (js/bake.js Bake.data)\n"
          f"BAKE_DATA.{MAP_ID} = {json.dumps(data, separators=(',', ':'))};\n")
    open(os.path.join(ROOT, 'js', 'bake_data_mistlake.js'), 'w').write(js)
    print('เขียน js/bake_data_mistlake.js', len(data['pieces']), 'ชิ้น')
    from slice_sheet import manifest
    manifest()


if __name__ == '__main__':
    a = sys.argv
    arg = lambda k, dflt: a[a.index(k) + 1] if k in a else dflt
    if '--extract' in a: extract()
    elif '--plan' in a: print_plan()
    elif '--install' in a: install(a[a.index('--install') + 1])
    elif '--render' in a:
        only = arg('--only', None)
        build(int(arg('--samples', 48)), arg('--out', '/tmp/lake3d'), only.split(',') if only else None, '--preview' in a)
    else: print(__doc__)
