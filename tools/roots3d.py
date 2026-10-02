"""รากยักษ์โค้งข้ามทาง + ประตูรากของ Garmr (Gnawed Roots) — โมเดลด้วย bpy แล้วอบเป็นภาพ 2D (docs/RENDER3D_PLAN.md ข้อ #10)

  B (สไปรต์ตั้งตรง): รากยักษ์ของ Yggdrasil (เส้นผ่าน 1.2–1.9 ม.) โผล่จากผนังหินฝั่งหนึ่ง โค้งข้ามหัวทางเดินแคบ (สูง 3.4–4.2 ม.)
                แล้วมุดลงผนัง/พื้นอีกฝั่ง • เปลือกแก่สีสนิม ร่องเปลือกตามแนวราก • รอยฟันแทะ (แอ่งเนื้อไม้สดมีร่องฟัน)
                • น้ำเลี้ยงสนิมเรืองส้ม (255,140,70) ซึมตามรอยแตก/ขอบรอยแทะ/หยดใต้ราก • รากฝอยห้อย • รากรองพันเกลียว
                4 แบบ (arch / twin / sag / foot) วาง 6 จุด ตรงทางเดินแคบเหนือ-ใต้ที่มีหินสองฝั่ง (หาอัตโนมัติ — ดู --plan)
                → assets/bake_roots_arch_<n>.webp เรียงความลึกกับตัวละคร (js/bake.js Bake.draw — จางเมื่อผู้เล่นอยู่หลัง/ใต้ราก
                  จางแรงขึ้นเมื่อมี MVP/บอสโลกในแมพ)
                + ประตูรากของ Garmr: เสารากถักเกลียวสองต้นโค้งชนกันเป็นซุ้มแหลม (กว้าง ~6 ม. สูง ~5 ม.) ตาข่ายรากที่ถูกฉีกขาด
                  ห่วงเหล็ก + โซ่ขาด 2 เส้น อักษรรูน "HEL" เรืองแดง → assets/bake_roots_gate.webp
                  วางหน้าซอกผนังเหนือสุดฝั่งตะวันออก (ไกลจากประตูวาร์ปทางตะวันตกที่สุด) — **ของประดับล้วน**:
                  ยังไม่เปลี่ยนจุดเกิด MVP Garmr (รอเจ้าของตัดสินใจ — docs/PENDING.md "รอเจ้าของตัดสินใจ" ข้อ 3)
  A (อบลงพื้น): เงาราก + แอ่งน้ำเลี้ยงเรืองใต้หยด + เศษไม้ที่ถูกแทะ + รากฝอยเลื้อยโคนผนัง (สูง ≤ 0.3 ม.)
                + หน้าประตู: โซ่ขาดที่ลากบนพื้น ปลอกคอเหล็กหนามที่ถูกกัดขาด กระดูกแทะ → assets/bake_roots_*_g.webp วาดลงผ้าใบพื้น
กล้องเดียวกับเกมทุกประการ (ออร์โธ เอียง acos(0.76) จากแนวดิ่ง yaw 0) ไม่ยืดสไปรต์ → ฐานตรงช่องพอดี
ผนังหิน: สร้างผิวหินจาก heightfield ชุดเดียวกับ tools/cave3d.py (ภาพผนัง bake_roots_walls) เป็นวัสดุ Holdout
  → ส่วนรากที่มุดเข้าหินถูกตัดตรงขอบผาในภาพผนังพอดี (ในเกมผนังจากภาพพื้นโผล่ตรงนั้น)
ชน: โคนรากอยู่บนช่องหิน (ไม่ชนเพิ่ม) ยกเว้นแบบ foot ที่ปักลงพื้น 1 ช่อง (block — ทางยังเหลือ ≥ 3 ช่อง ตรวจใน --plan)
ผังช่อง = tools/cave3d_roots.json (ดึงจากเกมด้วย tools/cave3d.py --extract --map roots) • hash = FNV-1a ทั้งแมพ (hashRect = ทั้งแมพ)
  ผังเปลี่ยน = เกมไม่วางรากเลย (js/bake.js Bake.data — เตือนครั้งเดียว)
แสง: ชุดเดียวกับ cave3d (key ซ้ายบน sun z = -135° → เงาตกขวาล่าง, fill หน้า-ซ้าย, rim สีแร่ส้มจากขวา) + แสงจุดสีน้ำเลี้ยงใต้ราก
สไตล์: เส้นขอบ Freestyle สีน้ำตาลเข้ม • ตอนติดตั้ง: Kuwahara (ผิวพู่กัน) + เพิ่มความอิ่มสี + เส้นขอบนอก (ฟังก์ชันจาก tools/tree3d.py)

ใช้:
  python3 tools/roots3d.py --plan                          (พิมพ์ผังรอบรากแต่ละจุด + ตรวจโคนราก/ช่องชน/ทางเดิน)
  /tmp/bvenv/bin/python tools/roots3d.py --render [--samples 20] [--out /tmp/roots3d] [--only a1,gate] [--preview]
  python3 tools/roots3d.py --install /tmp/roots3d          (→ assets/bake_roots_*.webp + js/bake_data_roots.js + manifest)
"""
import math, os, sys, json, random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
TILES = os.path.join(ROOT, 'tools', 'cave3d_roots.json')
MAP_ID = 'roots'
K = 0.76                       # R.K ในเกม
TH = math.acos(K)              # 40.5° จากแนวดิ่ง
SN = math.sin(TH)              # 0.65
PX = 40                        # TILE
RES_B = 160                    # เรนเดอร์สไปรต์ 4× → ติดตั้ง 2× (80 px/ม.) เกมวาด ×0.5
STORE_B = 80
RES_A = 80                     # ภาพพื้นเรนเดอร์ 2× → ติดตั้ง 1× (40 px/ม. เท่าผ้าใบพื้น)
OX, OY = 50.0, 36.0            # จุดกำเนิดฉาก Blender (พิกัดแมพ) • +Y ของ Blender = เหนือ
SAP = (1.0, 0.42, 0.13)        # น้ำเลี้ยงสนิมเรือง (ในเกม 255,140,70 — ในฉากเข้มกว่าเล็กน้อย ไม่ให้สีอิ่มตัวเป็นขาว)
SAP_COL = '255,140,70'
RUNE_COL = '255,90,60'
SOLID = {1, 2, 5, 8, 9, 10}
ROCK = 8

# รากโค้ง: y = แนวราก (กลางช่อง) • xl/xr = ขอบทางเดินฝั่งตะวันตก/ตะวันออก (ช่องเดินได้ช่องแรก/ช่องสุดท้าย + 1)
#   kind: arch = รากเดี่ยว + รากรองพันเกลียว • twin = สองรากไขว้สวนกัน • sag = รากหย่อนมีรากฝอยห้อยยาว • foot = ปลายหนึ่งปักลงพื้น (ชน 1 ช่อง)
#   top = ความสูงยอดแกนราก (ม.) • r = รัศมีราก (ม.) • seed = สุ่มรูปทรง
ARCHES = [
    {'id': 'a1', 'y': 32.5, 'xl': 75, 'xr': 79, 'kind': 'arch', 'top': 4.3, 'r': 0.66, 'seed': 11},
    {'id': 'a2', 'y': 53.5, 'xl': 92, 'xr': 96, 'kind': 'sag', 'top': 4.3, 'r': 0.62, 'seed': 22},
    {'id': 'a3', 'y': 44.5, 'xl': 44, 'xr': 48, 'kind': 'twin', 'top': 4.1, 'r': 0.5, 'seed': 33},
    {'id': 'a4', 'y': 14.5, 'xl': 52, 'xr': 57, 'kind': 'foot', 'top': 4.3, 'r': 0.7, 'seed': 44, 'foot': (52, 14)},
    {'id': 'a5', 'y': 18.5, 'xl': 3, 'xr': 7, 'kind': 'arch', 'top': 4.1, 'r': 0.6, 'seed': 55},
    {'id': 'a6', 'y': 55.5, 'xl': 3, 'xr': 8, 'kind': 'twin', 'top': 4.4, 'r': 0.56, 'seed': 66},
]
# ประตูรากของ Garmr: เสาซ้าย/ขวาบนช่องหิน (85,37) / (90,37) • ซอกผนังหลังประตู (86–89, 36–37) เดินเข้าได้ (= เดินผ่านใต้ซุ้ม)
GATE = {'id': 'gate', 'x': 87.65, 'y': 37.45, 'xl': 85.35, 'xr': 89.95, 'top': 5.0, 'front': 38.05}
HASH_RECT = [0, 0, 100, 72]    # ทั้งแมพ (ตรงกับ CAVE_BAKE.roots.hash)


def fnv_rect(tiles, w, rect):
    """hash ผังช่องในกรอบ (ค่าชนิดช่องตรง ๆ) — ตรงกับ Bake.data() ใน js/bake.js (d.hashRect) และ tools/tree3d.py"""
    x0, y0, x1, y1 = rect; h = 0x811c9dc5
    for y in range(y0, y1):
        for x in range(x0, x1):
            h ^= tiles[y * w + x]; h = (h * 0x01000193) & 0xffffffff
    return h


def load_tiles():
    d = json.load(open(TILES))
    tiles = [int(c, 16) for row in d['rows'] for c in row]
    assert fnv_rect(tiles, d['w'], HASH_RECT) == d['hash'], 'cave3d_roots.json hash ไม่ตรง'
    return d, tiles


def to_b(gx, gy, z=0.0):
    return (gx - OX, -(gy - OY), z)


def screen(p):
    """จุดโลก Blender → พิกัดจอของกล้องเกม (เมตร): sx ขวา, sy ขึ้น"""
    return p[0], p[1] * K + p[2] * SN


def anchor_y(a):
    """จุดเรียงความลึก/จุดยึดของรากโค้ง = เยื้องใต้แนวรากเล็กน้อย (ผู้เล่นที่ยืนใต้ครึ่งหน้าของรากยังทับราก)"""
    return a['y'] + 0.35


def blocks(a):
    return [list(a['foot'])] if a.get('foot') else []


def a_rect(a):
    """กรอบภาพพื้น (x0, y0, x1, y1 พิกัดแมพ) ของรากโค้งแต่ละจุด"""
    return (a['xl'] - 3.0, a['y'] - 3.0, a['xr'] + 3.5, a['y'] + 4.0)


GATE_A = (GATE['x'] - 4.5, GATE['y'] - 2.5, GATE['x'] + 4.5, GATE['y'] + 4.5)


# ---------------------------------------------------------------- ตรวจผัง
def plan():
    d, tiles = load_tiles(); w, h = d['w'], d['h']
    T = lambda x, y: tiles[y * w + x] if 0 <= x < w and 0 <= y < h else ROCK
    walk = lambda x, y, blk=frozenset(): T(x, y) not in SOLID and (x, y) not in blk
    ok = True
    for a in ARCHES + [GATE]:
        yy = int(a['y']); xl, xr = int(a['xl']), int(math.ceil(a['xr']))
        print(f"--- {a['id']} y={a['y']} ทาง x {xl}–{xr - 1}")
        blk = {tuple(b) for b in blocks(a)} if a is not GATE else set()
        for y in range(yy - 5, yy + 6):
            print('%3d ' % y + ''.join('X' if (x, y) in blk else ('=' if y == yy and xl <= x < xr else ('#' if T(x, y) == ROCK else '.')) for x in range(xl - 8, xr + 8)))
        if a is GATE:
            for x in (85, 90):
                if T(x, yy) != ROCK: print('  !! เสาประตูไม่อยู่บนหิน', x); ok = False
            continue
        if T(xl - 1, yy) != ROCK or T(xr, yy) != ROCK: print('  !! โคนรากไม่อยู่บนหิน'); ok = False
        if any(T(x, yy) == ROCK for x in range(xl, xr)): print('  !! ช่องหินกลางทาง'); ok = False
        left = sum(1 for x in range(xl, xr) if walk(x, yy, blk))
        print('  ทางที่เหลือในแถวราก', left, 'ช่อง')
        if left < 3: ok = False
    # ทุกช่องเดินได้ยังเชื่อมกันเหมือนเดิม (นับกลุ่มก่อน/หลังตั้ง block)
    def comps(blk):
        seen = set(); n = 0
        for y in range(h):
            for x in range(w):
                if walk(x, y, blk) and (x, y) not in seen:
                    n += 1; st = [(x, y)]; seen.add((x, y))
                    while st:
                        cx, cy = st.pop()
                        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                            q = (cx + dx, cy + dy)
                            if q not in seen and walk(*q, blk): seen.add(q); st.append(q)
        return n
    allb = {tuple(b) for a in ARCHES for b in blocks(a)}
    n0, n1 = comps(frozenset()), comps(frozenset(allb))
    print('กลุ่มพื้นเดินได้ ก่อน/หลังตั้ง block:', n0, n1)
    if n0 != n1: ok = False
    print('ผ่าน' if ok else 'ไม่ผ่าน')
    return ok


# ============================================================
#  ฉาก Blender
# ============================================================
def build(samples, outdir, only=None, preview=False):
    import bpy, bmesh, numpy as np
    from mathutils import Vector, Matrix, Quaternion, noise
    import cave3d
    from ridge3d import RUNES
    os.makedirs(outdir, exist_ok=True)
    th = cave3d.THEMES['roots']
    sc = cave3d.scene(th)
    sc.cycles.max_bounces = 4; sc.cycles.diffuse_bounces = 2; sc.cycles.transparent_max_bounces = 8
    # แสงชุดเดียวกับผนัง แต่ key แรงขึ้นเล็กน้อย (รากเป็นตัวเด่นของภาพ ต้องอ่านทรงออกในความมืด)
    key = sc.objects['key'].data; key.energy = 1.6
    hf = cave3d.heightfield(MAP_ID)

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

    def rng(nt, src, a, b, c=0.0, d=1.0):
        r = nt.nodes.new('ShaderNodeMapRange'); r.inputs['From Min'].default_value = a; r.inputs['From Max'].default_value = b
        r.inputs['To Min'].default_value = c; r.inputs['To Max'].default_value = d; L(nt, src, r.inputs['Value']); return r.outputs['Result']

    def math_(nt, op, a, b):
        m = nt.nodes.new('ShaderNodeMath'); m.operation = op
        for i, v in enumerate((a, b)):
            if isinstance(v, (int, float)): m.inputs[i].default_value = v
            else: L(nt, v, m.inputs[i])
        return m.outputs[0]

    def bark_mat(name, sap_amt=1.0):
        """เปลือกรากแก่สีสนิม: ร่องเปลือกตามแนวราก (นอยส์ยืดตามความยาว — พิกัด bc จาก tube) + หย่อมสนิมส้ม
        + รอยแทะ (attribute bite) = เนื้อไม้สดสีอ่อนมีร่องฟัน • น้ำเลี้ยงเรือง: รอยแตก (ขอบ Voronoi) บางหย่อม + ขอบรอยแทะ + ริ้วหยดใต้ราก"""
        m, nt, b = new(name)
        at = nt.nodes.new('ShaderNodeAttribute'); at.attribute_name = 'bc'
        bt = nt.nodes.new('ShaderNodeAttribute'); bt.attribute_name = 'bite'
        mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (0.55, 3.2, 3.2); L(nt, at.outputs['Vector'], mp.inputs['Vector'])
        nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 1.4; nz.inputs['Detail'].default_value = 6; nz.inputs['Distortion'].default_value = 0.5
        L(nt, mp.outputs['Vector'], nz.inputs['Vector'])
        col = ramp(nt, nz.outputs['Fac'], [(0.34, (0.028, 0.011, 0.007)), (0.48, (0.10, 0.040, 0.020)), (0.62, (0.22, 0.095, 0.042)), (0.76, (0.36, 0.18, 0.08))])
        # หย่อมสนิมส้ม (ไม่เรือง)
        rz = nt.nodes.new('ShaderNodeTexNoise'); rz.inputs['Scale'].default_value = 0.9; rz.inputs['Detail'].default_value = 3; L(nt, at.outputs['Vector'], rz.inputs['Vector'])
        col = mixc(nt, col, (0.55, 0.20, 0.05), rng(nt, rz.outputs['Fac'], 0.55, 0.68, 0.0, 0.55))
        # แผ่นเปลือกแตก: ขอบเซลล์ Voronoi (ยืดตามแนวราก) = ร่องเปลือกลึกสีเข้ม
        pv = nt.nodes.new('ShaderNodeTexVoronoi'); pv.feature = 'DISTANCE_TO_EDGE'; pv.inputs['Scale'].default_value = 2.4
        pm = nt.nodes.new('ShaderNodeMapping'); pm.inputs['Scale'].default_value = (0.22, 1.5, 1.5); L(nt, at.outputs['Vector'], pm.inputs['Vector'])
        L(nt, pm.outputs['Vector'], pv.inputs['Vector'])
        fis = rng(nt, pv.outputs['Distance'], 0.0, 0.045)
        col = mixc(nt, col, rng(nt, fis, 0.0, 1.0, 0.3, 1.0), 1.0, 'MULTIPLY')
        # เนื้อไม้สดในรอยแทะ: ขอบอ่อน → กลางแอ่งเข้ม + ร่องฟัน (คลื่นแถบตามแนวขวางราก)
        wv = nt.nodes.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = 'X'; wv.inputs['Scale'].default_value = 7.0
        wv.inputs['Distortion'].default_value = 1.5; L(nt, at.outputs['Vector'], wv.inputs['Vector'])
        fresh = ramp(nt, bt.outputs['Fac'], [(0.12, (0.58, 0.31, 0.13)), (0.45, (0.42, 0.20, 0.08)), (0.95, (0.20, 0.08, 0.03))])
        fresh = mixc(nt, fresh, rng(nt, wv.outputs['Fac'], 0.55, 0.9, 1.0, 0.55), 1.0, 'MULTIPLY')
        bite = rng(nt, bt.outputs['Fac'], 0.06, 0.16)
        col = mixc(nt, col, fresh, bite)
        L(nt, col, b.inputs['Base Color']); b.inputs['Roughness'].default_value = 0.9; b.inputs['Specular IOR Level'].default_value = 0.25
        # น้ำเลี้ยงเรือง
        vo = nt.nodes.new('ShaderNodeTexVoronoi'); vo.feature = 'DISTANCE_TO_EDGE'; vo.inputs['Scale'].default_value = 1.6
        mv = nt.nodes.new('ShaderNodeMapping'); mv.inputs['Scale'].default_value = (0.5, 1.6, 1.6); L(nt, at.outputs['Vector'], mv.inputs['Vector'])
        L(nt, mv.outputs['Vector'], vo.inputs['Vector'])
        crack = rng(nt, vo.outputs['Distance'], 0.0, 0.022, 1.0, 0.0)
        pz = nt.nodes.new('ShaderNodeTexNoise'); pz.inputs['Scale'].default_value = 0.45; pz.inputs['Detail'].default_value = 2; L(nt, at.outputs['Vector'], pz.inputs['Vector'])
        crack = math_(nt, 'MULTIPLY', crack, rng(nt, pz.outputs['Fac'], 0.6, 0.67))
        rim = math_(nt, 'MULTIPLY', math_(nt, 'MULTIPLY', rng(nt, bt.outputs['Fac'], 0.5, 0.75), rng(nt, pz.outputs['Fac'], 0.45, 0.6)), 0.6)   # ก้นแอ่งรอยแทะบางแอ่งซึมน้ำเลี้ยง
        geo = nt.nodes.new('ShaderNodeNewGeometry'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); L(nt, geo.outputs['Normal'], sep.inputs[0])
        tc = nt.nodes.new('ShaderNodeTexCoord'); m3 = nt.nodes.new('ShaderNodeMapping'); m3.inputs['Scale'].default_value = (7.0, 7.0, 0.8)
        L(nt, tc.outputs['Object'], m3.inputs['Vector'])
        dz = nt.nodes.new('ShaderNodeTexNoise'); dz.inputs['Scale'].default_value = 1.2; dz.inputs['Detail'].default_value = 2; L(nt, m3.outputs['Vector'], dz.inputs['Vector'])
        drip = math_(nt, 'MULTIPLY', rng(nt, sep.outputs['Z'], -0.2, -0.75), rng(nt, dz.outputs['Fac'], 0.56, 0.64))
        e = math_(nt, 'MAXIMUM', math_(nt, 'MAXIMUM', crack, rim), drip)
        bh = math_(nt, 'ADD', math_(nt, 'MULTIPLY', nz.outputs['Fac'], 0.6), math_(nt, 'MULTIPLY', fis, 0.5))
        b.inputs['Emission Color'].default_value = (*SAP, 1)
        L(nt, math_(nt, 'MULTIPLY', e, 1.5 * sap_amt), b.inputs['Emission Strength'])
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.85; bp.inputs['Distance'].default_value = 0.08
        L(nt, bh, bp.inputs['Height']); L(nt, bp.outputs['Normal'], b.inputs['Normal'])
        return m

    def flat(name, c0, c1, scale=4.0, rough=0.8, metal=0.0):
        m, nt, b = new(name)
        tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = 4
        L(nt, tc.outputs['Object'], nz.inputs['Vector'])
        L(nt, ramp(nt, nz.outputs['Fac'], [(0.3, c0), (0.7, c1)]), b.inputs['Base Color'])
        b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
        return m

    def glow(name, col, strength, base=None):
        m, nt, b = new(name)
        b.inputs['Base Color'].default_value = (*(base or col), 1); b.inputs['Roughness'].default_value = 0.3
        b.inputs['Emission Color'].default_value = (*col, 1); b.inputs['Emission Strength'].default_value = strength
        return m

    hold = bpy.data.materials.new('holdout'); hold.use_nodes = True; nt = hold.node_tree
    nt.nodes.remove(nt.nodes['Principled BSDF']); ho = nt.nodes.new('ShaderNodeHoldout')
    L(nt, ho.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
    M = {
        'bark': bark_mat('bark'), 'bark2': bark_mat('bark2', 0.6),
        'iron': flat('iron', (0.10, 0.07, 0.06), (0.30, 0.15, 0.08), 9.0, 0.55, 0.6),   # เหล็กขึ้นสนิม
        'chip': flat('chip', (0.62, 0.38, 0.18), (0.88, 0.62, 0.36), 14.0, 0.85),         # เศษไม้ที่ถูกแทะ
        'bone': flat('bone', (0.62, 0.56, 0.46), (0.86, 0.80, 0.68), 8.0, 0.6),
        'sap': glow('sap', SAP, 1.8, base=(0.9, 0.36, 0.08)),
        'pool': glow('pool', SAP, 0.9, base=(0.5, 0.16, 0.04)),
        'rune': glow('rune', (1.0, 0.30, 0.18), 5.0, base=(0.6, 0.12, 0.06)),
    }
    M['pool'].node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.12

    cols = {}
    def coll(name):
        if name not in cols:
            c = bpy.data.collections.new(name); sc.collection.children.link(c); cols[name] = c
        return cols[name]

    def mk_mesh(name, V, F, mat, cname, smooth=True, attrs=None):
        me = bpy.data.meshes.new(name); me.from_pydata(V, [], F); me.update()
        for an, vals in (attrs or {}).items():
            if isinstance(vals[0], (tuple, list)):
                at = me.attributes.new(an, 'FLOAT_VECTOR', 'POINT'); at.data.foreach_set('vector', [c for v in vals for c in v])
            else:
                at = me.attributes.new(an, 'FLOAT', 'POINT'); at.data.foreach_set('value', vals)
        o = bpy.data.objects.new(name, me); coll(cname).objects.link(o); o.data.materials.append(mat)
        for p in o.data.polygons: p.use_smooth = smooth
        return o

    def bm_obj(name, bm, mat, cname, smooth=True):
        me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new(name, me); coll(cname).objects.link(o); o.data.materials.append(mat)
        for p in o.data.polygons: p.use_smooth = smooth
        return o

    def ellip(bm, c, r, sub=2, nz=0.0, seed=0.0, rot=None):
        res = bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0)
        R = rot if rot is not None else Matrix.Identity(3)
        for v in res['verts']:
            p = v.co.copy(); k = 1 + nz * noise.noise(Vector((p.x * 1.7 + seed, p.y * 1.7, p.z * 1.7)))
            v.co = Vector(c) + R @ Vector((p.x * r[0] * k, p.y * r[1] * k, p.z * r[2] * k))

    # ---------------------------------------------------------------- ท่อราก (loft วงแหวนตามเส้นโค้ง Catmull-Rom)
    def spline(ctrl, per=10):
        """ctrl = [(x, y, z, r)] พิกัด Blender → จุดถี่ตามเส้นโค้ง (ผ่านทุกจุดควบคุม)"""
        P = [Vector(c[:3]) for c in ctrl]; R_ = [c[3] for c in ctrl]
        P = [P[0] * 2 - P[1]] + P + [P[-1] * 2 - P[-2]]; R_ = [R_[0]] + R_ + [R_[-1]]
        out = []
        for i in range(1, len(P) - 2):
            p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
            n = per if i < len(P) - 3 else per + 1
            for k in range(n):
                t = k / per; t2, t3 = t * t, t * t * t
                q = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
                r = R_[i] + (R_[i + 1] - R_[i]) * (t * t * (3 - 2 * t))
                out.append((q, r))
        return out

    def frames(pts):
        T_ = []
        for i in range(len(pts)):
            a = pts[max(0, i - 1)]; b = pts[min(len(pts) - 1, i + 1)]
            T_.append((b - a).normalized())
        up = Vector((0, 0, 1)) if abs(T_[0].z) < 0.9 else Vector((0, 1, 0))
        N = [(up - T_[0] * up.dot(T_[0])).normalized()]
        for i in range(1, len(pts)):   # parallel transport
            n = N[-1] - T_[i] * N[-1].dot(T_[i]); N.append(n.normalized())
        B = [T_[i].cross(N[i]) for i in range(len(pts))]
        return T_, N, B

    def tube(name, ctrl, mat, cname, NA=28, per=10, ridge=0.06, knots=(), bites=(), seed=0.0, taper_tip=False, cap0=True):
        """รากหนึ่งเส้น: วงแหวนตามเส้นโค้ง + ร่องเปลือกตามยาว + ปุ่มปม (knots: (t, ขนาด)) + รอยแทะ (bites: (t, มุม, ยาวม., ลึกม.))
        คืน (วัตถุ, จุดกลางเส้น [(Vector, r)]) • attribute bc = (ระยะตามราก, ระยะรอบราก, 0) • bite = ความลึกรอยแทะ 0..1"""
        sp = spline(ctrl, per); pts = [p for p, _ in sp]; rs = [r for _, r in sp]
        T_, N, B = frames(pts)
        s = [0.0]
        for i in range(1, len(pts)): s.append(s[-1] + (pts[i] - pts[i - 1]).length)
        Ltot = s[-1] or 1.0
        V, F, bc, bt = [], [], [], []
        for i, (c, r) in enumerate(zip(pts, rs)):
            t = s[i] / Ltot
            rr = r * (1 - 0.92 * max(0.0, (t - 0.78) / 0.22) ** 1.4) if taper_tip else r
            kn = sum(sz * math.exp(-((t - tk) * Ltot / (0.35 + sz)) ** 2) for tk, sz in knots)
            for j in range(NA):
                a = 2 * math.pi * j / NA
                rid = ridge * (math.sin(9 * a + 0.9 * s[i] + seed) * 0.6 + noise.noise(Vector((math.cos(a) * 1.3, math.sin(a) * 1.3, s[i] * 0.9 + seed))))
                rad = rr * (1 + rid) + kn * (0.7 + 0.3 * math.sin(3 * a + seed))
                bv = 0.0
                for (tb, ab, lb, db) in bites:   # แอ่งรอยแทะ: ผลักผิวเข้าไปตามวงรี + ร่องฟัน
                    da = math.atan2(math.sin(a - ab), math.cos(a - ab))
                    q = ((s[i] - tb * Ltot) / (lb / 2)) ** 2 + (da * rr / (lb * 0.42)) ** 2
                    if q < 1:
                        f = math.sqrt(1 - q); bv = max(bv, f)
                        rad -= db * f * (0.8 + 0.2 * math.sin((s[i] - tb * Ltot) * 55))
                d = N[i] * math.cos(a) + B[i] * math.sin(a)
                V.append(tuple(c + d * max(rad, 0.01))); bc.append((s[i], a * r, seed)); bt.append(bv)
        n = len(pts)
        for i in range(n - 1):
            for j in range(NA):
                F.append((i * NA + j, i * NA + (j + 1) % NA, (i + 1) * NA + (j + 1) % NA, (i + 1) * NA + j))
        if cap0: F.append(tuple(range(NA))[::-1])
        F.append(tuple((n - 1) * NA + j for j in range(NA)))
        o = mk_mesh(name, V, F, mat, cname, attrs={'bc': bc, 'bite': bt})
        return o, list(zip(pts, rs)), (T_, N, B)

    def helix(center, rmain, turns, rsub, phase, frac=(0.0, 1.0)):
        """รากรองพันเกลียวรอบรากหลัก → ctrl จุดควบคุม"""
        pts = [p for p, _ in center]; T_, N, B = frames(pts); n = len(pts)
        i0, i1 = int(frac[0] * (n - 1)), int(frac[1] * (n - 1)); ctrl = []
        for k, i in enumerate(range(i0, i1 + 1, 3)):
            u = (i - i0) / max(1, i1 - i0); a = phase + turns * 2 * math.pi * u
            rr = center[i][1] * 0.98 + rsub * 0.7
            p = pts[i] + (N[i] * math.cos(a) + B[i] * math.sin(a)) * rr
            ctrl.append((p.x, p.y, p.z, rsub * (1 - 0.5 * u)))
        return ctrl

    def droplets(cname, center, rnd, n, tag, hang=0.0):
        """หยดน้ำเลี้ยงเรืองใต้ราก (+ ริ้วย้อย) → คืนจุดหยด (Vector) ไว้ทำประกาย/แสง/แอ่งบนพื้น"""
        bm = bmesh.new(); out = []
        pts = [p for p, _ in center]; m = len(pts)
        for k in range(n):
            i = int(m * (0.2 + 0.6 * (k + rnd.random()) / n)); c, r = center[i]
            if c.z < 1.6: continue
            bot = c + Vector((rnd.uniform(-0.08, 0.08), -r * rnd.uniform(0.45, 0.6), -r * 0.78))
            ln = rnd.uniform(0.12, 0.3) + hang
            ellip(bm, bot - Vector((0, 0, ln * 0.5)), (0.035, 0.035, ln * 0.55), 2)          # ริ้วย้อย
            ellip(bm, bot - Vector((0, 0, ln + 0.03)), (0.055, 0.055, 0.075), 2)              # หยดปลาย
            out.append(bot - Vector((0, 0, ln + 0.03)))
        if out: bm_obj(f'drip_{tag}', bm, M['sap'], cname)
        else: bm.free()
        return out

    def rootlets(cname, center, rnd, n, tag, lmin=0.4, lmax=1.1):
        """รากฝอยห้อยจากใต้ราก (ปลายเรียวโค้งเล็กน้อย) — ปลายบางเส้นมีหยดน้ำเลี้ยง"""
        tips = []
        pts = [p for p, _ in center]; m = len(pts)
        for k in range(n):
            i = int(m * (0.18 + 0.64 * (k + rnd.random()) / n)); c, r = center[i]
            if c.z < 2.0: continue
            a0 = c + Vector((rnd.uniform(-0.2, 0.2), -r * rnd.uniform(0.35, 0.6), -r * 0.75))
            ln = rnd.uniform(lmin, lmax); sw = rnd.uniform(-0.25, 0.25)
            ctrl = [(a0.x, a0.y + 0.1, a0.z + 0.15, 0.11), (a0.x + sw * 0.4, a0.y - 0.08, a0.z - ln * 0.4, 0.075),
                    (a0.x + sw, a0.y - 0.15, a0.z - ln * 0.8, 0.045), (a0.x + sw * 1.3, a0.y - 0.18, a0.z - ln, 0.018)]
            tube(f'rl_{tag}_{k}', ctrl, M['bark2'], cname, NA=8, per=5, ridge=0.1, seed=k, taper_tip=True)
            tips.append(Vector((a0.x + sw * 1.3, a0.y - 0.18, a0.z - ln)))
        return tips

    # ---------------------------------------------------------------- ผิวหินจาก heightfield ของ cave3d (Holdout)
    def proxy_rock(tag, x0, y0, x1, y1):
        xs, ys, Hh, mesh, fS = hf['xs'], hf['ys'], hf['H_'], hf['mesh'], hf['fS']
        R_ = cave3d.RES
        ix0, ix1 = max(0, int((x0 - xs[0]) * R_)), min(len(xs) - 1, int((x1 - xs[0]) * R_))
        iy0, iy1 = max(0, int((y0 - ys[0]) * R_)), min(len(ys) - 1, int((y1 - ys[0]) * R_))
        H_ = Hh[iy0:iy1 + 1, ix0:ix1 + 1]; ms = mesh[iy0:iy1 + 1, ix0:ix1 + 1]; f_ = fS[iy0:iy1 + 1, ix0:ix1 + 1]
        ny, nx = H_.shape
        MX, MY = np.meshgrid(xs[ix0:ix1 + 1], ys[iy0:iy1 + 1])
        # โคนผนังเลื่อนเข้าหาจุดตัดศูนย์ของสนาม fS (เหมือน cave3d.build — ขอบหินตรงภาพผนัง)
        best = np.zeros((ny, nx)); tgt = np.zeros((ny, nx, 2))
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            nb_in = np.zeros((ny, nx), bool); nb_f = np.zeros((ny, nx))
            sl_d = (slice(max(0, -dy), ny - max(0, dy)), slice(max(0, -dx), nx - max(0, dx)))
            sl_s = (slice(max(0, dy), ny - max(0, -dy)), slice(max(0, dx), nx - max(0, -dx)))
            nb_in[sl_d] = ms[sl_s]; nb_f[sl_d] = f_[sl_s]
            t = np.clip(-f_ / np.maximum(nb_f - f_, 1e-6), 0, 0.92)
            upd = nb_in & ~ms & (nb_f > best)
            best = np.where(upd, nb_f, best)
            tgt = np.where(upd[..., None], np.stack([dx * t / R_, dy * t / R_], -1), tgt)
        gx = MX + tgt[..., 0]; gy = MY + tgt[..., 1]
        V = [to_b(float(gx[j, i]), float(gy[j, i]), float(H_[j, i]) - 0.01) for j in range(ny) for i in range(nx)]
        F = []
        for j in range(ny - 1):
            for i in range(nx - 1):
                if ms[j, i] or ms[j, i + 1] or ms[j + 1, i] or ms[j + 1, i + 1]:
                    a0 = j * nx + i; F.append((a0, a0 + nx, a0 + nx + 1, a0 + 1))
        o = mk_mesh(f'rock_{tag}', V, F, hold, 'proxy', smooth=False)
        o.visible_shadow = False
        return o

    def rock_h(x, y):
        xs, ys = hf['xs'], hf['ys']
        return float(hf['H_'][int(round((y - ys[0]) * cave3d.RES)), int(round((x - xs[0]) * cave3d.RES))])

    lights_b = {}     # ชิ้น → [(จุด Blender, ระยะแสงในเกม, สี)]
    glints = {}       # ชิ้น → [(จุด Blender, ความแรง)]

    def pt_light(tag, p, energy, col=SAP, radius=0.25):
        l = bpy.data.lights.new('pt', 'POINT'); l.energy = energy; l.color = col; l.shadow_soft_size = radius
        o = bpy.data.objects.new(f'pt_{tag}', l); coll(f'L_{tag}').objects.link(o); o.location = p
        return o

    def sap_pool(tag, gx, gy, r, rnd):
        """แอ่งน้ำเลี้ยงเรืองบนพื้น (แบนมาก) — แบบ A"""
        bm = bmesh.new(); c = Vector(to_b(gx, gy, 0.004))
        for k in range(rnd.randint(2, 4)):
            o = Vector((rnd.uniform(-r, r) * 0.8, rnd.uniform(-r, r) * 0.6, 0)); rr = r * rnd.uniform(0.4, 0.9)
            ellip(bm, c + o, (rr, rr * 0.75, 0.012), 2, nz=0.25, seed=k + gx)
        bm_obj(f'pool_{tag}_{gx:.1f}', bm, M['pool'], f'A_{tag}')

    def chips(tag, gx, gy, rad, n, rnd):
        """เศษไม้ที่ถูกแทะร่วงบนพื้น (ชิ้นแบนเล็ก ๆ) — แบบ A"""
        bm = bmesh.new()
        for k in range(n):
            a = rnd.random() * 6.28; d = rnd.uniform(0.1, rad)
            c = Vector(to_b(gx + math.cos(a) * d, gy + math.sin(a) * d * 0.7, 0.02))
            rot = Matrix.Rotation(rnd.uniform(0, 6.28), 3, 'Z') @ Matrix.Rotation(rnd.uniform(-0.3, 0.3), 3, 'X')
            ellip(bm, c, (rnd.uniform(0.05, 0.12), rnd.uniform(0.025, 0.05), 0.015), 1, rot=rot)
        bm_obj(f'chips_{tag}_{gx:.1f}', bm, M['chip'], f'A_{tag}', smooth=False)

    def crawl(tag, gx, gy, ang, ln, r0, rnd, k):
        """รากฝอยเลื้อยบนพื้นจากโคนผนัง (สูง ≤ 0.25 ม.) — แบบ A"""
        ctrl = []; x, y = gx, gy; da = 0.0
        for i in range(6):
            t = i / 5; ctrl.append((*to_b(x, y, r0 * (1 - 0.8 * t) * 0.55), r0 * (1 - 0.8 * t)))
            da = max(-0.6, min(0.6, da + rnd.uniform(-0.35, 0.35))); x += math.cos(ang + da) * ln / 5; y += math.sin(ang + da) * ln / 5
        tube(f'crawl_{tag}_{k}', ctrl, M['bark2'], f'A_{tag}', NA=10, per=5, ridge=0.08, seed=k, taper_tip=True)

    # ============================================================
    #  รากโค้งแต่ละจุด
    # ============================================================
    def build_arch(a):
        tag = a['id']; rnd = random.Random(a['seed']); cB = f'B_{tag}'
        y = a['y']; xl, xr = a['xl'], a['xr']; top = a['top']; R0 = a['r']; kind = a['kind']
        mid = (xl + xr) / 2; yb = -(y - OY)
        hl, hr = rock_h(xl - 0.9, y), rock_h(xr + 0.9, y)
        def P(gx, z, dy=0.0, r=R0): return (gx - OX, yb + dy, z, r)
        wob = lambda: rnd.uniform(-0.25, 0.25)
        center = []
        def leg(x, side, r, dy=0.0, zin=None):
            """ขาราก: มุดในหินลึก → โผล่จากลาดผนังข้างทาง → ตั้งชันขึ้นชิดผนัง (side -1 = ตะวันตก, +1 = ตะวันออก) เรียงจากล่างขึ้นบน"""
            return [P(x + side * 1.8, -0.3 if zin is None else zin, dy + wob() * 0.5, r * 1.35), P(x + side * 0.8, 0.9, dy + wob() * 0.4, r * 1.22),
                    P(x + side * 0.4, 2.2, dy + wob() * 0.3, r * 1.1)]
        if kind in ('arch', 'sag', 'twin'):
            sag = 0.5 if kind == 'sag' else 0.0
            px_ = mid + (-0.5 if kind == 'twin' else rnd.uniform(-0.3, 0.3))
            ctrl = leg(xl, -1, R0) + [P(xl + 0.2, top * 0.82 - sag * 0.5, wob() * 0.4, R0 * 1.02), P(px_, top - sag, wob() * 0.3, R0 * 0.95),
                                      P(xr - 0.2, top * 0.8 - sag * 0.5, wob() * 0.4, R0)] + leg(xr, 1, R0)[::-1]
            bites = [(rnd.uniform(0.4, 0.46), math.radians(rnd.uniform(60, 110)), rnd.uniform(0.55, 0.8), R0 * 0.42),
                     (rnd.uniform(0.56, 0.64), math.radians(rnd.uniform(-20, 40)), rnd.uniform(0.45, 0.7), R0 * 0.36)]
            knots = [(rnd.uniform(0.2, 0.3), 0.1), (rnd.uniform(0.7, 0.78), 0.09)]
            _, center, _ = tube(f'root_{tag}', ctrl, M['bark'], cB, NA=36, per=14, knots=knots, bites=bites, seed=a['seed'])
            if kind == 'twin':   # รากที่สองเล็กกว่า โค้งต่ำกว่าอยู่หน้ารากแรก (ซุ้มซ้อนสองชั้น) ขาตะวันออกมุดผนังแนวเฉียง
                r2 = R0 * 0.7
                ctrl2 = [P(xl - 1.1, -0.3, -0.3, r2 * 1.3), P(xl - 0.35, 1.2, -0.35, r2 * 1.15), P(xl + 0.15, 2.3, -0.4, r2 * 1.05),
                         P(xl + 0.9, top - 1.05, -0.45, r2), P(mid + 0.6, top - 1.15, -0.4, r2 * 0.95), P(xr - 0.3, top - 1.5, -0.3, r2),
                         P(xr + 0.5, 2.1, -0.2, r2 * 1.1), P(xr + 1.7, 1.0, -0.1, r2 * 1.25), P(xr + 2.4, -0.3, 0.0, r2 * 1.3)]
                tube(f'root2_{tag}', ctrl2, M['bark'], cB, NA=28, per=12, knots=[(0.5, 0.07)], bites=[(0.45, math.radians(80), 0.5, r2 * 0.4)], seed=a['seed'] + 5)
            if kind == 'arch':   # รากรองพันเกลียว 2 เส้น
                for k, ph in enumerate((0.4, 3.3)):
                    tube(f'vine_{tag}_{k}', helix(center, R0, 2.2 + 0.5 * k, 0.15 - 0.03 * k, ph, (0.12, 0.88)), M['bark2'], cB, NA=12, per=6, ridge=0.08, seed=k + 3, taper_tip=True)
        else:   # foot: ปลายตะวันตกปักลงพื้นช่อง foot (โคนบานเป็นรากค้ำ) ปลายตะวันออกมุดผนัง
            fx, fy = a['foot']
            ctrl = [(fx + 0.5 - OX, -(fy + 0.5 - OY), -0.6, R0 * 1.35), (fx + 0.5 - OX, -(fy + 0.5 - OY), 0.9, R0 * 1.2),
                    P(fx + 0.6, 2.3, 0.0, R0 * 1.08), P(fx + 1.2, top * 0.86, wob() * 0.3, R0), P(mid + 0.4, top, wob() * 0.3, R0 * 0.95),
                    P(xr - 0.2, top * 0.8, wob() * 0.4, R0)] + leg(xr, 1, R0)[::-1]
            bites = [(0.5, math.radians(80), 0.7, R0 * 0.3), (0.66, math.radians(10), 0.55, R0 * 0.28), (0.2, math.radians(-90), 0.5, R0 * 0.25)]
            _, center, _ = tube(f'root_{tag}', ctrl, M['bark'], cB, NA=36, per=14, knots=[(0.3, 0.12)], bites=bites, seed=a['seed'], cap0=False)
            # รากค้ำแผ่ออกจากโคนที่ปักพื้น (B ส่วนที่สูง) + รากเลื้อยต่อบนพื้น (A)
            for k, ang in enumerate((200, 250, 300, 150)):
                aa = math.radians(ang); bx, by = fx + 0.5, fy + 0.5
                ctrl = [(bx - OX, -(by - OY), 0.9, R0 * 0.45), (bx + math.cos(aa) * 0.7 - OX, -(by + math.sin(aa) * 0.5 - OY), 0.3, R0 * 0.3),
                        (bx + math.cos(aa) * 1.25 - OX, -(by + math.sin(aa) * 0.9 - OY), 0.02, R0 * 0.18)]
                tube(f'buttress_{tag}_{k}', ctrl, M['bark'], cB, NA=14, per=6, seed=k + 7, taper_tip=True)
            for k, ang in enumerate((215, 290, 160)):
                aa = math.radians(ang); crawl(tag, fx + 0.5 + math.cos(aa) * 1.1, fy + 0.5 + math.sin(aa) * 0.8, aa, 1.3, 0.14, rnd, 10 + k)
        # รากฝอยห้อย + หยดน้ำเลี้ยง
        nrl = {'sag': 10, 'arch': 6, 'twin': 5, 'foot': 6}[kind]
        tips = rootlets(cB, center, rnd, nrl, tag, *((0.8, 1.6) if kind == 'sag' else (0.45, 1.0)))
        drops = droplets(cB, center, rnd, 5 if kind != 'sag' else 6, tag)
        for i, tp in enumerate(tips):
            if i % 2 == 0 and tp.z > 1.3:
                bm = bmesh.new(); ellip(bm, tp - Vector((0, 0, 0.05)), (0.045, 0.045, 0.07), 2); bm_obj(f'tipdrop_{tag}_{i}', bm, M['sap'], cB); drops.append(tp - Vector((0, 0, 0.1)))
        glints[tag] = [(p, 0.9) for p in drops]
        # แสงน้ำเลี้ยงใต้ราก (ส่องท้องราก) + แสงในเกม
        lights_b[tag] = []
        pools = []
        for i, p in enumerate(drops):
            gx, gy = p.x + OX, OY - p.y
            if not (xl <= gx <= xr and y - 0.8 <= gy <= y + 0.8): continue
            if any(math.hypot(gx - q[0], gy - q[1]) < 0.9 for q in pools): continue
            pools.append((gx, gy))
        for (gx, gy) in pools:
            sap_pool(tag, gx, gy + 0.05, rnd.uniform(0.22, 0.38), rnd)
            pt_light(tag, Vector(to_b(gx, gy, 0.35)), 22)
            lights_b[tag].append((Vector(to_b(gx, gy, 0.0)), 1.7, SAP_COL))
        # ไฟเรืองจาง ๆ ที่ยอดราก (รอยแทะใหญ่ซึมน้ำเลี้ยง) — ให้เห็นทรงโค้งในความมืด
        c_top = max(center, key=lambda q: q[0].z)[0]
        lights_b[tag].append((c_top, 2.3, SAP_COL))
        pt_light(tag, c_top + Vector((0, -1.2, 0.4)), 30, radius=0.6)
        # เศษไม้แทะบนพื้นใต้รอยแทะ + รากฝอยเลื้อยโคนผนังสองฝั่ง
        chips(tag, mid + rnd.uniform(-0.8, 0.8), y + 0.3, 0.7, 26, rnd)
        chips(tag, mid + rnd.uniform(-1.5, 1.5), y + 0.8, 0.5, 12, rnd)
        if kind != 'foot':
            for k in range(2):
                crawl(tag, xl + 0.05, y + rnd.uniform(-0.6, 0.6), math.radians(rnd.uniform(-40, 40)), rnd.uniform(0.9, 1.5), 0.12, rnd, k)
        for k in range(2):
            crawl(tag, xr - 0.05, y + rnd.uniform(-0.6, 0.6), math.radians(180 + rnd.uniform(-40, 40)), rnd.uniform(0.9, 1.5), 0.12, rnd, 5 + k)
        x0, y0, x1, y1 = a_rect(a)
        proxy_rock(tag, x0 - 1.5, y0 - 4.0, x1 + 1.5, y1 + 1.5)

    # ============================================================
    #  ประตูรากของ Garmr
    # ============================================================
    def build_gate():
        g = GATE; tag = 'gate'; rnd = random.Random(707); cB = 'B_gate'; cA = 'A_gate'
        yb = -(g['y'] - OY); top = g['top']; xc = g['x']
        lights_b[tag] = []; glints[tag] = []
        # เสารากถักเกลียว 3 เส้นต่อข้าง: ขึ้นตรงแล้วโค้งเข้าหากันเป็นซุ้มแหลม
        def spine(side):
            xp = g['xl'] if side < 0 else g['xr']
            pts = [(xp + side * 0.25, -0.2), (xp + side * 0.1, 0.8), (xp, 2.0), (xp - side * 0.05, 3.0), (xp - side * 0.45, 3.9),
                   (xp - side * 1.15, 4.55), (xc - side * 0.25, top)]
            return [Vector((x - OX, yb, z)) for x, z in pts]
        braid = []
        for side in (-1, 1):
            sp = spine(side)
            for k in range(3):
                ph = k * 2 * math.pi / 3 + (0.5 if side > 0 else 0); ctrl = []
                for i, c in enumerate(sp):
                    u = i / (len(sp) - 1); a = ph + u * 2.6 * math.pi; rr = 0.36 * (1 - 0.45 * u)
                    off = Vector((math.cos(a) * rr * (0.5 if 0.6 < u else 1), math.sin(a) * rr, 0))
                    ctrl.append((c.x + off.x, c.y + off.y, c.z, 0.34 * (1 - 0.5 * u) + 0.05))
                ctrl[0] = (ctrl[0][0] + side * 0.25 * math.cos(ph), ctrl[0][1] + 0.3 * math.sin(ph), -0.4, ctrl[0][3] * 1.3)
                bites = [(rnd.uniform(0.15, 0.3), math.radians(rnd.uniform(60, 120)), 0.45, 0.1)] if k == 1 else []
                _, cen, _ = tube(f'pillar_{side}_{k}', ctrl, M['bark'], cB, NA=18, per=8, bites=bites, seed=side * 10 + k)
                braid.append(cen)
        # ปมรากที่ยอดซุ้ม
        bm = bmesh.new(); ellip(bm, (xc - OX, yb, top - 0.1), (0.75, 0.55, 0.5), 3, nz=0.25, seed=3)
        o = bm_obj('crown', bm, M['bark'], cB)
        n = len(o.data.vertices); o.data.attributes.new('bc', 'FLOAT_VECTOR', 'POINT').data.foreach_set('vector', [c for v in o.data.vertices for c in (v.co.x * 2, v.co.z * 2, 0)])
        o.data.attributes.new('bite', 'FLOAT', 'POINT').data.foreach_set('value', [0.0] * n)
        # ตาข่ายรากที่ถูกฉีก: เส้นรากห้อยจากโค้งซุ้ม ปลายขาด (เนื้อไม้สด) — ตรงกลางเป็นช่องโหว่ใหญ่ (Garmr ฉีกออกมา)
        for k, (u, ln, sw) in enumerate([(0.12, 2.1, 0.3), (0.24, 1.2, 0.2), (0.36, 0.7, -0.1), (0.64, 0.55, 0.15), (0.76, 1.4, -0.25), (0.88, 2.4, -0.3)]):
            x = g['xl'] + 0.5 + (g['xr'] - g['xl'] - 1.0) * u
            zt = 3.9 + 0.95 * math.sin(math.pi * u) ** 0.6
            ctrl = [(x - OX, yb - 0.05, zt + 0.2, 0.11), (x + sw * 0.3 - OX, yb - 0.1, zt - ln * 0.45, 0.09), (x + sw - OX, yb - 0.12, zt - ln, 0.07)]
            tube(f'lattice_{k}', ctrl, M['bark2'], cB, NA=10, per=6, seed=k + 20, bites=[(0.97, 0.0, 0.25, 0.0)])
            bm = bmesh.new(); ellip(bm, (x + sw - OX, yb - 0.12, zt - ln - 0.02), (0.075, 0.075, 0.05), 2); bm_obj(f'latend_{k}', bm, M['chip'], cB)  # ปลายขาดเนื้อไม้สด
            if k in (0, 5):
                glints[tag].append((Vector((x + sw - OX, yb - 0.14, zt - ln - 0.12)), 0.8))
                bm = bmesh.new(); ellip(bm, (x + sw - OX, yb - 0.12, zt - ln - 0.12), (0.045, 0.045, 0.07), 2); bm_obj(f'latdrop_{k}', bm, M['sap'], cB)
        for k, (u0, z0, u1, z1) in enumerate([(0.05, 3.6, 0.42, 2.6), (0.95, 3.7, 0.62, 2.45), (0.2, 4.4, 0.5, 3.4)]):   # เส้นเฉียงที่ขาดกลางทาง
            xa = g['xl'] + (g['xr'] - g['xl']) * u0; xb = g['xl'] + (g['xr'] - g['xl']) * u1
            ctrl = [(xa - OX, yb - 0.08, z0, 0.12), ((xa + xb) / 2 - OX, yb - 0.13, (z0 + z1) / 2 + 0.15, 0.09), (xb - OX, yb - 0.16, z1, 0.06)]
            tube(f'diag_{k}', ctrl, M['bark2'], cB, NA=10, per=6, seed=k + 40, bites=[(0.95, 0.0, 0.3, 0.0)])
            bm = bmesh.new(); ellip(bm, (xb - OX, yb - 0.16, z1), (0.06, 0.06, 0.06), 2); bm_obj(f'diagend_{k}', bm, M['chip'], cB)
        # เส้นขวางที่ขาดกลาง (ซ้าย/ขวา ปลายห้อย)
        for side in (-1, 1):
            xp = g['xl'] if side < 0 else g['xr']
            ctrl = [(xp - OX, yb - 0.1, 3.1, 0.13), (xp - side * 0.9 - OX, yb - 0.15, 2.95, 0.11), (xp - side * 1.45 - OX, yb - 0.17, 2.5, 0.08), (xp - side * 1.6 - OX, yb - 0.18, 2.05, 0.06)]
            tube(f'cross_{side}', ctrl, M['bark2'], cB, NA=10, per=6, seed=side + 30)
        # อักษรรูน H-E-L บนเสาสองข้าง (เรืองแดง) — ผนึกของ Hel
        RV, RF = [], []
        def glyph(gl, gx, gz, w, h, y, wd=0.05):
            for (p, q) in RUNES[gl]:
                x0, z0 = gx + (p[0] - 0.5) * w, gz + (p[1] - 0.5) * h; x1, z1 = gx + (q[0] - 0.5) * w, gz + (q[1] - 0.5) * h
                Ln = math.hypot(x1 - x0, z1 - z0) + wd; ang = math.atan2(z1 - z0, x1 - x0)
                ux, uz = math.cos(ang), math.sin(ang); vx, vz = -uz, ux; mx, mz = (x0 + x1) / 2, (z0 + z1) / 2
                base = len(RV)
                for (su, sv) in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                    RV.append((mx + ux * su * Ln / 2 + vx * sv * wd / 2, y, mz + uz * su * Ln / 2 + vz * sv * wd / 2))
                RF.append((base, base + 1, base + 2, base + 3))
        for side in (-1, 1):
            xp = (g['xl'] if side < 0 else g['xr']) - OX
            for i, gl in enumerate(['h', 'e', 'l']):
                z = 2.85 - i * 0.48
                glyph(gl, xp, z, 0.22, 0.32, yb - 0.62)
                if i == 1: glints[tag].append((Vector((xp, yb - 0.64, z)), 1.0))
            lights_b[tag].append((Vector((xp, yb - 0.6, 2.4)), 2.0, RUNE_COL))
            pt_light(tag, Vector((xp, yb - 1.1, 2.4)), 14, col=(1.0, 0.35, 0.2))
        mk_mesh('runes', RV, RF, M['rune'], cB, smooth=False)
        # ห่วงเหล็กบนเสา + โซ่ที่ขาด: ห้อยจากห่วงลงพื้นแล้วลากมาทางใต้ (ข้อโซ่สูง > 0.35 ม. = B, บนพื้น = A)
        def link(name, c, d, big, cname):
            bm = bmesh.new()
            # torus ด้วยมือ (create_torus ไม่มีใน bmesh.ops): วงหลัก R ยืดเป็นวงรี + วงท่อ r
            Rm, rt, nu, nv = 0.13 * big, 0.035 * big, 14, 8
            vs = []
            for i in range(nu):
                u = 2 * math.pi * i / nu
                for j in range(nv):
                    v = 2 * math.pi * j / nv
                    p = Vector(((Rm + rt * math.cos(v)) * math.cos(u) * 1.35, (Rm + rt * math.cos(v)) * math.sin(u), rt * math.sin(v)))
                    vs.append(bm.verts.new(p))
            for i in range(nu):
                for j in range(nv):
                    bm.faces.new([vs[i * nv + j], vs[((i + 1) % nu) * nv + j], vs[((i + 1) % nu) * nv + (j + 1) % nv], vs[i * nv + (j + 1) % nv]])
            o = bm_obj(name, bm, M['iron'], cname)
            o.location = c; o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = d
            return o
        chain_pts = []
        for side in (-1, 1):
            xp = (g['xl'] if side < 0 else g['xr'])
            ring = Vector((xp - OX + side * -0.05, yb - 0.6, 1.75))
            link(f'ring_{side}', ring, Quaternion((1, 0, 0), math.pi / 2), 2.2, cB)
            # เส้นโซ่: ห้อยจากห่วง (โค้งลง) แล้วลากบนพื้นไปทางปลอกคอ
            end = (xc + side * 0.7, g['y'] + 2.4 + 0.3 * side)
            path = [ring + Vector((0, -0.12, -0.15)), Vector((xp - OX - side * 0.05, yb - 0.85, 0.9)), Vector((xp - OX - side * 0.2, yb - 1.05, 0.08)),
                    Vector((end[0] - side * 0.6 - OX, -(g['y'] + 1.6 - OY), 0.06)), Vector((end[0] - OX, -(end[1] - OY), 0.06))]
            sp = spline([(p.x, p.y, p.z, 0) for p in path], 12)
            pts = [p for p, _ in sp]; s = [0.0]
            for i in range(1, len(pts)): s.append(s[-1] + (pts[i] - pts[i - 1]).length)
            step = 0.2; k = 0; t = 0.0; j = 0
            while t < s[-1] - 0.1:
                while j < len(s) - 2 and s[j + 1] < t: j += 1
                f = (t - s[j]) / max(1e-6, s[j + 1] - s[j]); c = pts[j].lerp(pts[j + 1], f)
                d = (pts[j + 1] - pts[j]).normalized()
                q = Vector((1, 0, 0)).rotation_difference(d)
                if k % 2: q = q @ Quaternion((1, 0, 0), math.pi / 2)
                if c.z < 0.1: c = Vector((c.x, c.y, 0.035 if k % 2 else 0.06))
                link(f'chain_{side}_{k}', c, q, 1.0, cB if c.z > 0.35 else cA)
                chain_pts.append(c); t += step; k += 1
            # ข้อโซ่ที่ขาด (ปลายง้างออก) + เศษข้อหลุดบนพื้น
            for m_ in range(2):
                c = Vector(to_b(end[0] + rnd.uniform(-0.4, 0.4), end[1] + rnd.uniform(0.1, 0.5), 0.04))
                link(f'loose_{side}_{m_}', c, Quaternion((0, 0, 1), rnd.uniform(0, 6.28)), 1.0, cA)
        # ปลอกคอเหล็กหนาม (ถูกกัดขาด) นอนบนพื้นหน้าประตู — โยงไอเทม garmr_collar
        cc = Vector(to_b(xc + 0.1, g['y'] + 2.45, 0.0))
        bm = bmesh.new(); Rm, rt = 0.62, 0.1; nu, nv = 40, 10; vs = []
        gap0, gap1 = math.radians(-35), math.radians(25)
        us = [gap1 + (2 * math.pi - (gap1 - gap0)) * i / (nu - 1) for i in range(nu)]
        for u in us:
            for j in range(nv):
                v = 2 * math.pi * j / nv
                p = Vector(((Rm + rt * math.cos(v)) * math.cos(u), (Rm + rt * math.cos(v)) * math.sin(u) * 0.95, rt * 0.85 * math.sin(v)))
                vs.append(bm.verts.new(p))
        for i in range(nu - 1):
            for j in range(nv):
                bm.faces.new([vs[i * nv + j], vs[(i + 1) * nv + j], vs[(i + 1) * nv + (j + 1) % nv], vs[i * nv + (j + 1) % nv]])
        for k in range(10):   # หนามแหลมรอบนอก
            u = us[2 + k * 3]
            c0 = Vector(((Rm + rt * 0.8) * math.cos(u), (Rm + rt * 0.8) * math.sin(u) * 0.95, 0))
            bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.06, radius2=0.0, depth=0.24,
                                        matrix=Matrix.Translation(c0 + Vector((math.cos(u), math.sin(u), 0)) * 0.11) @ Matrix.Rotation(math.pi / 2, 4, Vector((-math.sin(u), math.cos(u), 0))))
        o = bm_obj('collar', bm, M['iron'], cA)
        o.location = cc + Vector((0, 0, 0.11)); o.rotation_euler = (math.radians(9), math.radians(-6), math.radians(20))
        # อักษรรูนแดงบนปลอกคอ (เรืองจาง)
        RV2, RF2 = [], []
        for k in range(5):
            u = us[4 + k * 7]; px_, py_ = Rm * math.cos(u), Rm * math.sin(u) * 0.95
            base = len(RV2)
            for (su, sv) in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                RV2.append((px_ + su * 0.035, py_ + sv * 0.035, rt * 0.86))
            RF2.append((base, base + 1, base + 2, base + 3))
        ro = mk_mesh('collar_runes', RV2, RF2, M['rune'], cA, smooth=False)
        ro.location = o.location; ro.rotation_euler = o.rotation_euler
        lights_b[tag].append((cc, 1.6, RUNE_COL))
        # กระดูกถูกแทะ + เศษไม้ + แอ่งน้ำเลี้ยง หน้าประตู
        for k in range(4):
            a = rnd.uniform(0, 6.28); d = rnd.uniform(1.0, 2.6)
            c = Vector(to_b(xc + math.cos(a) * d * 1.3, g['y'] + 1.8 + math.sin(a) * d * 0.5, 0.05))
            q = Matrix.Rotation(rnd.uniform(0, 6.28), 3, 'Z'); ln = rnd.uniform(0.35, 0.6)
            bm = bmesh.new(); ax = q @ Vector((1, 0, 0))
            ellip(bm, c, (ln / 2, 0.045, 0.045), 2, rot=q)
            for s_ in (-1, 1):
                for t_ in (-1, 1): ellip(bm, c + ax * s_ * ln / 2 + (q @ Vector((0, t_ * 0.04, 0))), (0.06, 0.05, 0.05), 1)
            bm_obj(f'bone_{k}', bm, M['bone'], cA)
        chips(tag, xc - 0.6, g['y'] + 1.0, 0.8, 24, rnd)
        chips(tag, xc + 1.2, g['y'] + 1.4, 0.6, 14, rnd)
        for (gx, gy) in ((g['xl'] + 0.6, g['y'] + 0.9), (g['xr'] - 0.4, g['y'] + 1.1)):
            sap_pool(tag, gx, gy, 0.3, rnd); pt_light(tag, Vector(to_b(gx, gy, 0.35)), 18)
            lights_b[tag].append((Vector(to_b(gx, gy, 0.0)), 1.6, SAP_COL))
        lights_b[tag].append((Vector((xc - OX, yb, top - 0.4)), 2.6, SAP_COL))
        pt_light(tag, Vector((xc - OX, yb - 1.4, top - 0.2)), 26, radius=0.6)
        for k, ang in enumerate((200, 250, 290, 340)):
            for side in (-1, 1):
                xp = g['xl'] if side < 0 else g['xr']
                aa = math.radians(ang if side < 0 else 180 - ang)
                crawl(tag, xp + math.cos(aa) * 0.5, g['y'] + 0.4 + abs(math.sin(aa)) * 0.3, aa if math.sin(aa) > 0 else -aa, 1.1, 0.13, rnd, 40 + k * 2 + (side > 0))
        x0, y0, x1, y1 = GATE_A
        proxy_rock(tag, x0 - 1.5, y0 - 5.0, x1 + 1.5, y1 + 1.0)

    # ---------------------------------------------------------------- สร้างฉาก
    todo = only or [a['id'] for a in ARCHES] + ['gate']
    for a in ARCHES:
        if a['id'] in todo: build_arch(a)
    if 'gate' in todo: build_gate()
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, -0.004)); pl = bpy.context.active_object
    pl.scale = (220, 160, 1); pl.is_shadow_catcher = True
    for c in list(pl.users_collection): c.objects.unlink(pl)
    coll('floor').objects.link(pl)
    # พื้นแบบ Holdout สำหรับรอบ B: ส่วนรากที่มุดใต้พื้นไม่โผล่ (ผนังบางที่ปลายรากทะลุไปอีกฝั่ง)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, -0.002)); hb = bpy.context.active_object
    hb.scale = (220, 160, 1); hb.data.materials.append(hold); hb.visible_shadow = False
    for c in list(hb.users_collection): c.objects.unlink(hb)
    coll('floorB').objects.link(hb)

    # ============================================================
    #  กล้อง/เรนเดอร์ (ทีละชิ้น: B = สไปรต์, A = ภาพพื้น)
    # ============================================================
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.sensor_fit = 'HORIZONTAL'; cam.clip_end = 400
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
    co.rotation_euler = (TH, 0, 0)
    dvec = Vector((0, math.sin(TH), -math.cos(TH))); uvec = Vector((0, math.cos(TH), math.sin(TH)))
    sc.cycles.samples = 8 if preview else samples
    sc.render.resolution_percentage = 50 if preview else 100
    cave3d.freestyle(sc, coll('B_dummy'), 1.0)
    fs = bpy.context.view_layer.freestyle_settings; fs.crease_angle = math.radians(120)
    ls = fs.linesets[0]; ls.select_border = True; ls.linestyle.color = (0.10, 0.04, 0.025); ls.linestyle.alpha = 0.85

    def set_pass(tag, mode):
        for cname, c in cols.items():
            mine = cname.endswith('_' + tag)
            for o in c.objects:
                if cname == 'proxy':
                    o.hide_render = False; o.visible_camera = True; o.visible_shadow = False
                elif cname == 'floor':
                    o.hide_render = mode != 'A'
                elif cname == 'floorB':
                    o.hide_render = mode != 'B'
                elif cname.startswith('L_'):
                    o.hide_render = not mine
                elif cname.startswith('B_'):
                    o.hide_render = not mine; o.visible_camera = mode == 'B'; o.visible_shadow = True
                elif cname.startswith('A_'):
                    o.hide_render = not mine or mode != 'A'; o.visible_camera = True; o.visible_shadow = True

    def frame(objs, pad, res):
        bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
        xs, ys = [], []
        for o in objs:
            ev = o.evaluated_get(dg); me = ev.to_mesh(); Mw = o.matrix_world
            for v in me.vertices:
                p = Mw @ v.co
                if p.z < -0.05: continue   # ส่วนที่มุดใต้พื้น (ไม่เห็นอยู่แล้ว)
                sx, sy = screen(p); xs.append(sx); ys.append(sy)
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

    mp = os.path.join(outdir, 'meta.json')
    meta = {}
    if os.path.exists(mp):
        try: meta = json.load(open(mp))
        except Exception: meta = {}
    pieces = [(a['id'], a) for a in ARCHES if a['id'] in todo] + ([('gate', GATE)] if 'gate' in todo else [])
    for tag, a in pieces:
        ls.collection = coll(f'B_{tag}')
        # ---- B
        key.angle = math.radians(6)
        set_pass(tag, 'B'); ls.linestyle.thickness = 4.0 * (0.5 if preview else 1)
        objs = list(coll(f'B_{tag}').objects)
        print(tag, 'B', len(objs), 'ชิ้น', 'A', len(coll(f'A_{tag}').objects), 'ชิ้น', [o.name for o in objs][:12], flush=True)
        x0, y0, x1, y1, wpx, hpx = frame(objs, 0.15, RES_B)
        shoot(x0, y0, x1, y1, wpx, hpx, os.path.join(outdir, f'{tag}.png'))
        def px(p):
            sx, sy = screen(p); return [round((sx - x0) * RES_B, 2), round((y1 - sy) * RES_B, 2)]
        ay = GATE['front'] if tag == 'gate' else anchor_y(a)
        ax_ = GATE['x'] if tag == 'gate' else (a['xl'] + a['xr']) / 2
        meta[tag] = {'anchor': px(to_b(ax_, ay, 0.0)), 'px': [wpx, hpx], 'res': RES_B, 'x': ax_, 'y': ay,
                     'glints': [px(p) + [s] for p, s in glints[tag]],
                     'lights': [[round(p.x + OX, 3), round(OY - p.y, 3), round(p.z, 3), lr, col] for p, lr, col in lights_b[tag]]}
        # ---- A
        key.angle = math.radians(24)
        set_pass(tag, 'A'); ls.collection = coll(f'A_{tag}'); ls.linestyle.thickness = 1.6 * (0.5 if preview else 1)
        gx0, gy0, gx1, gy1 = GATE_A if tag == 'gate' else a_rect(a)
        bx0, bx1 = gx0 - OX, gx1 - OX
        by1 = -(gy0 - OY) * K; by0 = -(gy1 - OY) * K
        shoot(bx0, by0, bx1, by1, round((bx1 - bx0) * RES_A), round((by1 - by0) * RES_A), os.path.join(outdir, f'{tag}_g.png'))
        meta[tag]['rect'] = [gx0, gy0, gx1, gy1]
        json.dump(meta, open(mp, 'w'), indent=1)
    print('meta →', mp)


# ============================================================
#  ติดตั้ง: Kuwahara (ผิวพู่กัน) + ปรับสี + เส้นขอบนอก → assets + js/bake_data_roots.js + manifest
# ============================================================
def install(src):
    from PIL import Image, ImageFilter
    from tree3d import kuwahara, paint, opacity_mask
    d, _ = load_tiles()
    meta = json.load(open(os.path.join(src, 'meta.json')))
    data = {'map': MAP_ID, 'hash': d['hash'], 'hashRect': HASH_RECT, 'tool': 'roots3d', 'ground': [], 'pieces': []}
    s = PX / STORE_B
    for tag, m in meta.items():
        a = GATE if tag == 'gate' else next(q for q in ARCHES if q['id'] == tag)
        # ---------- A: ภาพพื้น — ย่อเป็น 40 px/ม. แล้วยืดแนวตั้ง ×1/0.76 ----------
        x0, y0, x1, y1 = m['rect']
        im = Image.open(os.path.join(src, f'{tag}_g.png')).convert('RGBA')
        W, H = round((x1 - x0) * PX), round((y1 - y0) * PX)
        im = paint(im.resize((W, H), Image.LANCZOS), sat=1.2, con=1.05, bri=1.0, outline=False)
        key = f'bake_roots_{tag}_g'; im.save(os.path.join(ROOT, 'assets', key + '.webp'), 'WEBP', quality=86, method=6)
        data['ground'].append({'img': key, 'x': x0, 'y': y0, 'w': x1 - x0, 'h': y1 - y0})
        print('ติดตั้ง', key, im.size)
        # ---------- B ----------
        im = Image.open(os.path.join(src, f'{tag}.png')).convert('RGBA')
        ratio = im.width / m['px'][0]                # เรนเดอร์ preview = ครึ่งความละเอียด
        sc = STORE_B / (RES_B * ratio)
        im = kuwahara(im, max(2, round(3 * ratio)))
        im = im.resize((round(im.width * sc), round(im.height * sc)), Image.LANCZOS)
        im = paint(im, sat=1.2, con=1.08, bri=1.04)
        l, t, r, b = im.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox()
        l, t, r, b = max(0, l - 2), max(0, t - 2), min(im.width, r + 2), min(im.height, b + 2)
        im = im.crop((l, t, r, b))
        key = 'bake_roots_' + tag; im.save(os.path.join(ROOT, 'assets', key + '.webp'), 'WEBP', quality=88, method=6)
        k = STORE_B / RES_B
        ax, ay = m['anchor'][0] * k - l, m['anchor'][1] * k - t
        jars = [[round(j[0] * k - l, 1), round(j[1] * k - t, 1), j[2]] for j in m['glints']]
        # แสงตัดความมืด: จุด (x, y แมพ, z) → dx,dy เทียบจุดยึด (ของที่สูงเลื่อนจุดขึ้นเหนือตามความสูงบนจอ — แบบ tree3d)
        lights = [{'dx': round(gx - m['x'], 2), 'dy': round(gy - max(0.0, z * SN * PX - 14) / (PX * K) - m['y'], 2), 'lr': lr, 'col': col}
                  for gx, gy, z, lr, col in m['lights']]
        ent = {'id': tag, 'img': key, 'x': m['x'], 'y': m['y'], 'ax': round(ax, 1), 'ay': round(ay, 1), 'scale': s,
               'block': blocks(a) if tag != 'gate' else [], 'jars': jars, 'glint': RUNE_COL if tag == 'gate' else SAP_COL, 'lights': lights,
               'cull': math.ceil(max(im.width * s / 2, im.height * s / K) / PX) + 1, 'fade': 0.4, 'fadeBoss': 0.32, 'fb': [100, 12],
               'mask': opacity_mask(im, 16)}
        if tag == 'gate': ent['free'] = 2.6   # ผลึก/ของประดับในซอกประตูถูกเอาออก (ไม่โผล่ทะลุตาข่ายราก)
        data['pieces'].append(ent)
        print('ติดตั้ง', key, im.size, 'anchor', (round(ax, 1), round(ay, 1)), 'ประกาย', len(jars), 'แสง', len(lights), 'cull', ent['cull'])
    order = [q['id'] for q in ARCHES] + ['gate']
    data['pieces'].sort(key=lambda e: order.index(e['id']))
    data['ground'].sort(key=lambda e: order.index(e['img'][len('bake_roots_'):-2]))
    js = ("'use strict';\n// สร้างอัตโนมัติโดย tools/roots3d.py --install — อย่าแก้ด้วยมือ (แก้ใน tools/roots3d.py แล้วติดตั้งใหม่)\n"
          "// รากยักษ์โค้งข้ามทาง + ประตูรากของ Garmr ใน Gnawed Roots (docs/RENDER3D_PLAN.md #10) — รวมเข้า BAKE_DATA ของ js/bake_data.js (โหลดต่อจากไฟล์นั้น)\n"
          "// ground = เงาราก/แอ่งน้ำเลี้ยง/เศษไม้แทะ/โซ่+ปลอกคอหน้าประตู (แบบ A) • pieces = รากโค้ง 6 จุด + ประตูราก (แบบ B: x,y = จุดยึด/จุดเรียงความลึก)\n"
          "// lights = แสงน้ำเลี้ยง/รูน (dx,dy เทียบจุดยึด) • hash+hashRect = ผังทั้งแมพตอนเลือกตำแหน่ง — ไม่ตรง = ไม่วางเลย\n"
          "// mask = ตารางความทึบหยาบ • fb = ช่วงลำตัว (px เหนือเท้า) ที่ใช้เช็คว่าอยู่หลัง/ใต้ราก • fadeBoss = จางแรงขึ้นตอนมี MVP/บอสโลก • free = รัศมีเอาของประดับออก\n"
          "// ประตูรากเป็นของประดับล้วน — ไม่เปลี่ยนจุดเกิด MVP Garmr (รอเจ้าของตัดสินใจ)\n"
          f"BAKE_DATA.{MAP_ID} = {json.dumps(data, separators=(',', ':'))};\n")
    open(os.path.join(ROOT, 'js', 'bake_data_roots.js'), 'w').write(js)
    print('เขียน js/bake_data_roots.js', len(data['pieces']), 'ชิ้น')
    from slice_sheet import manifest
    manifest()


if __name__ == '__main__':
    a = sys.argv
    if '--plan' in a: plan()
    elif '--install' in a: install(a[a.index('--install') + 1])
    elif '--render' in a:
        only = a[a.index('--only') + 1].split(',') if '--only' in a else None
        build(int(a[a.index('--samples') + 1]) if '--samples' in a else 20,
              a[a.index('--out') + 1] if '--out' in a else '/tmp/roots3d', only, '--preview' in a)
    else: print(__doc__)
