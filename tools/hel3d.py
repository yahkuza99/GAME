"""บัลลังก์ Hel + ชั้นวางประกาย (Hel's Hollow) 3D — โมเดลด้วย bpy แล้วเรนเดอร์เป็นภาพ 2 แบบ (docs/RENDER3D_PLAN.md #1)

  A (อบลงพื้น): แท่นวงกลม 3 ขั้นรอบ Hel + เงาของบัลลังก์/ชั้นวางที่ตกบนพื้น → assets/bake_hel_dais.webp
                วาดลงผ้าใบพื้นของแมพ (js/bake.js Bake.ground) — ยืดแนวตั้ง ×1/0.76 แบบภาพพื้นโคลอสเซียม
  B (สไปรต์ตั้งตรง): บัลลังก์ 1 + ชั้นวาง 5 ตู้ → assets/bake_hel_<ชื่อ>.webp เรียงความลึกกับตัวละคร (js/bake.js Bake.draw)
                กล้องเดียวกับเกมทุกประการ (ออร์โธ เอียง acos(0.76) จากแนวดิ่ง yaw 0) ไม่ยืดภาพ → ฐานวัตถุตรงช่องพอดี

หน่วย: 1 ช่องในเกม = 1 เมตร • ศูนย์กลางแท่น = ช่อง (37.5, 39.5) ของแมพ = (0, 0, 0) ใน Blender
       แกน +Y ของ Blender = ทิศเหนือ = y ในเกมลดลง (gx = 37.5 + X, gy = 39.5 - Y)
แสง: key ซ้ายบน (sun rotation z = -135° → เงาตกขวาล่างเหมือนทุกอย่างในเกม) อ่อน ๆ + emission จากโหลประกาย (#60f0d0)
สไตล์: เส้นขอบ Freestyle สีน้ำตาลเข้ม ~1.5 px ที่ 1× • สีอิ่ม (ปรับตอนติดตั้ง) • พื้นหลังโปร่ง

ใช้:  /tmp/bvenv/bin/python tools/hel3d.py [--samples 48] [--out /tmp/hel3d] [--only throne,shelf_n,dais] [--preview]
แล้ว: python3 tools/hel3d.py --install /tmp/hel3d      (ย่อ/ตัดขอบ/เส้นขอบ → assets/bake_hel_*.webp + js/bake_data.js + manifest)
"""
import math, os, sys, json, random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
K = 0.76                       # R.K ในเกม (cos มุมกล้องจากแนวดิ่ง)
TH = math.acos(K)              # 40.5°
SN = math.sin(TH)              # 0.65 — ความสูง 1 ม. = 26 px บนจอที่ 1×
PX = 40                        # TILE (px ต่อเมตรที่ 1×)
RES_B = 160                    # เรนเดอร์สไปรต์ B ที่ 4× → ติดตั้งที่ 2× (80 px/ม.) เกมวาดย่อ 0.5
STORE_B = 80
RES_A = 80                     # เรนเดอร์ภาพพื้นที่ 2× → ติดตั้งที่ 1× (40 px/ม. เท่าผ้าใบพื้น)
CX, CY = 37.5, 39.5            # ศูนย์กลางแท่น (พิกัดแมพ)
MAP_ID = 'helcave'
DAIS_R = (3.5, 2.85, 2.2)      # รัศมีแท่น 3 ขั้น
STEP = 0.08                    # สูงขั้นละ 8 ซม. (รวม 0.24 ม. → ยื่นขึ้นเหนือแค่ 0.2 ช่อง ปลอดภัยแบบ A)
DAIS_TOP = STEP * 3
CLEAR_R = 4.5                  # เกมเคลียร์หินก้อนเล็กในรัศมีนี้รอบศูนย์กลาง (แท่นต้องไม่ทับช่องหิน)
GLOW = (96 / 255, 240 / 255, 208 / 255)   # #60f0d0 (สี glow ของ look 'hel' ใน js/sprites.js)
A_RECT = (29.5, 30.5, 47.5, 46.0)          # กรอบภาพพื้น (x0, y0, x1, y1 ในพิกัดแมพ) — ครอบแท่น + เงาทุกชิ้น

# ชั้นวาง: โค้งครึ่งวงด้านเหนือของแท่น หันหน้าเข้าหา Hel (yaw = มุมหมุนรอบแกนตั้ง องศา, 0 = หันใต้หากล้อง)
# ตำแหน่งตามรัศมี R จากศูนย์กลาง + มุม a (0° = ตะวันออก, 90° = เหนือ) • เว้นช่องเดินระหว่างตู้ ≥ 1 ช่อง
SHELF_W, SHELF_D, SHELF_H = 2.0, 0.6, 2.7
SHELF_RING = [('shelf_e2', 5.6, 18), ('shelf_e1', 5.3, 52), ('shelf_n', 5.0, 90), ('shelf_w1', 5.3, 128), ('shelf_w2', 5.6, 162)]
THRONE = ('throne', CX, 39.3, 0.0)   # ฐานบัลลังก์ 2.0 × 1.2 ม. หลัง Hel (Hel ยืนที่ y 40.5 → วาดหน้าบัลลังก์)


def pieces():
    """รายการชิ้น B: (ชื่อ, gx, gy, yaw°, ขนาดฐาน (กว้าง, ลึก))"""
    out = [(THRONE[0], THRONE[1], THRONE[2], THRONE[3], (2.0, 1.2))]
    for name, r, a in SHELF_RING:
        gx = CX + r * math.cos(math.radians(a)); gy = CY - r * math.sin(math.radians(a))
        yaw = (a - 90) * 0.7           # หันเข้าหาศูนย์กลาง (ลดมุมลงให้กล้องยังเห็นโหลในตู้ริมสุด)
        out.append((name, round(gx, 3), round(gy, 3), round(yaw, 2), (SHELF_W + 0.1, SHELF_D + 0.06)))
    return out


def to_b(gx, gy, z=0.0):
    return (gx - CX, -(gy - CY), z)


def screen(p):
    """จุดโลก Blender → พิกัดจอของกล้องเกม (เมตร): sx ขวา, sy ขึ้น"""
    return p[0], p[1] * K + p[2] * SN


def footprint_tiles(gx, gy, yaw, size, thr=0.16):
    """ช่องที่ฐานชิ้นนี้ทับ (สุ่ม 5×5 จุดต่อช่อง ทับ ≥ thr = ชน) • ช่องที่ต่อกันแค่ทแยงจะเติมช่องข้างที่ทับมากสุด (กันเดินเฉียงลอดมุม)"""
    w, d = size; c, s = math.cos(math.radians(yaw)), math.sin(math.radians(yaw))
    cov = {}
    for ty in range(int(gy) - 3, int(gy) + 4):
        for tx in range(int(gx) - 3, int(gx) + 4):
            n = 0
            for i in range(5):
                for j in range(5):
                    px, py = tx + (i + 0.5) / 5, ty + (j + 0.5) / 5
                    X, Y = px - gx, -(py - gy)                # Blender (เหนือ = +Y)
                    lx, ly = X * c + Y * s, -X * s + Y * c    # หมุนกลับเข้าแกนของชิ้น
                    if abs(lx) <= w / 2 and abs(ly) <= d / 2: n += 1
            cov[(tx, ty)] = n / 25
    sel = {t for t, v in cov.items() if v >= thr}
    for (x, y) in list(sel):
        for dx, dy in ((1, 1), (1, -1)):
            if (x + dx, y + dy) in sel and (x + dx, y) not in sel and (x, y + dy) not in sel:
                sel.add(max([(x + dx, y), (x, y + dy)], key=lambda t: cov.get(t, 0)))
    return [list(t) for t in sorted(sel, key=lambda t: (t[1], t[0]))]


# ============================================================
#  ฉาก Blender
# ============================================================
def build(samples, outdir, only=None, preview=False):
    import bpy, bmesh
    from mathutils import Vector, Matrix, Euler
    os.makedirs(outdir, exist_ok=True)
    random.seed(505)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene

    # ---------- วัสดุ ----------
    def principled(name):
        m = bpy.data.materials.new(name); m.use_nodes = True
        nt = m.node_tree; return m, nt, nt.nodes['Principled BSDF']

    def mat(name, col, rough=0.7, metal=0.0, noise=0.0, scale=4.0, emit=None, estr=0.0, alpha=1.0, spec=0.5, stretch=None):
        m, nt, b = principled(name)
        b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
        try: b.inputs['Specular IOR Level'].default_value = spec
        except Exception: pass
        if noise:
            tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
            mp.inputs['Scale'].default_value = stretch or (scale, scale, scale)
            nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
            tex = nt.nodes.new('ShaderNodeTexNoise'); tex.inputs['Scale'].default_value = 1.0; tex.inputs['Detail'].default_value = 6
            nt.links.new(mp.outputs['Vector'], tex.inputs['Vector'])
            ramp = nt.nodes.new('ShaderNodeValToRGB')
            ramp.color_ramp.elements[0].position = 0.3; ramp.color_ramp.elements[1].position = 0.7
            ramp.color_ramp.elements[0].color = (*[c * (1 - noise) for c in col], 1)
            ramp.color_ramp.elements[1].color = (*[min(1, c * (1 + noise)) for c in col], 1)
            nt.links.new(tex.outputs['Fac'], ramp.inputs['Fac']); nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
        else:
            b.inputs['Base Color'].default_value = (*col, 1)
        if emit:
            b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = estr
        if alpha < 1:
            b.inputs['Alpha'].default_value = alpha
        return m

    M_OBS = mat('obsidian', (0.035, 0.035, 0.055), 0.28, noise=0.35, scale=2.5, spec=0.6)        # หินออบซิเดียนขัด
    M_OBS2 = mat('obsidian2', (0.06, 0.055, 0.085), 0.45, noise=0.3, scale=3.0)
    M_STONE = mat('darkstone', (0.10, 0.085, 0.13), 0.75, noise=0.35, scale=3.5)                 # หินดำอมม่วง (ตู้)
    M_TOP = mat('top', (0.045, 0.04, 0.06), 0.85, noise=0.3, scale=3.0)                        # ผิวบนตู้ (หันฟ้า — ไม่ให้สว่างเป็นแผ่น)
    M_BOARD = mat('board', (0.16, 0.10, 0.075), 0.7, noise=0.3, stretch=(1.5, 12, 12))           # แผ่นชั้นไม้เข้ม
    M_BARK = mat('bark', (0.30, 0.22, 0.17), 0.85, noise=0.45, stretch=(14, 14, 1.6))            # กิ่งไม้โลก (เปลือกเทาน้ำตาล)
    M_WOODCUT = mat('woodcut', (0.62, 0.52, 0.40), 0.8, noise=0.2, scale=9)                      # รอยหัก (เนื้อไม้ด้านใน)
    M_BRONZE = mat('bronze', (0.62, 0.40, 0.18), 0.38, metal=1.0, noise=0.25, scale=6)           # ขอบเหล็กสนิมทองแดง
    M_CLOTH = mat('cloth', (0.10, 0.12, 0.26), 0.85, noise=0.2, scale=8)                         # เบาะสีกรมท่า (ชุด Hel #1c2238)
    M_RUNE = mat('rune', (0.05, 0.3, 0.25), 0.4, emit=GLOW, estr=4.5)
    M_RUNE_DIM = mat('rune_dim', (0.02, 0.25, 0.18), 0.4, emit=tuple(c ** 2.2 for c in GLOW), estr=2.2)
    M_RUNE_FLOOR = mat('rune_floor', (0.01, 0.2, 0.14), 0.4, emit=(0.03, 0.75, 0.5), estr=1.8)            # ลายบนแท่น (อิ่มกว่า ไม่ซีดเป็นขาว)
    M_GLASS = mat('glass', (0.55, 0.85, 0.80), 0.08, alpha=0.32, spec=0.9)
    M_LID = M_BRONZE
    SPARK = []
    for i, (hue, st) in enumerate([((0.38, 0.94, 0.82), 4.0), ((0.38, 0.94, 0.82), 8.0), ((0.55, 1.0, 0.92), 12.0), ((0.30, 0.85, 0.95), 6.0), ((0.75, 1.0, 0.95), 16.0)]):
        lin = tuple(c ** 2.2 for c in hue)
        SPARK.append(mat(f'spark{i}', lin, 0.5, emit=lin, estr=st))
    M_SPARK_DEAD = mat('spark_dead', (0.08, 0.10, 0.10), 0.6)

    # ---------- เครื่องมือเรขาคณิต ----------
    cols = {}

    def coll(name):
        if name not in cols:
            c = bpy.data.collections.new(name); sc.collection.children.link(c); cols[name] = c
        return cols[name]

    def obj(name, bm, material, cname, smooth=False):
        me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new(name, me); coll(cname).objects.link(o)
        if isinstance(material, (list, tuple)):
            for mm in material: o.data.materials.append(mm)
        else: o.data.materials.append(material)
        for p in o.data.polygons: p.use_smooth = smooth
        return o

    def box(bm, c, s, rot=None):
        M = Matrix.LocRotScale(Vector(c), rot.to_quaternion() if rot else None, Vector(s))
        bmesh.ops.create_cube(bm, size=1.0, matrix=M)

    def cyl(bm, p0, p1, r0, r1, seg=10):
        p0, p1 = Vector(p0), Vector(p1); d = p1 - p0; L = d.length
        if L < 1e-5: return
        q = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r0, radius2=r1, depth=L, matrix=Matrix.Translation((p0 + p1) / 2) @ q)

    def ring_band(bm, r0, r1, z0, z1, seg=128, a0=0.0, a1=2 * math.pi):
        """วงแหวนแบน (ผิวบน+หน้าตั้งด้านนอก) สำหรับลายเรืองบนแท่น"""
        for i in range(seg):
            t0 = a0 + (a1 - a0) * i / seg; t1 = a0 + (a1 - a0) * (i + 1) / seg
            P = lambda r, t, z: bm.verts.new((r * math.cos(t), r * math.sin(t), z))
            bm.faces.new([P(r0, t0, z1), P(r1, t0, z1), P(r1, t1, z1), P(r0, t1, z1)])
            bm.faces.new([P(r1, t0, z0), P(r1, t1, z0), P(r1, t1, z1), P(r1, t0, z1)])

    def branch(bm, pts, r0, r1, seg=9, jitter=0.0):
        """กิ่งไม้เรียวตามเส้นโพลีไลน์ (ทรงกระบอกต่อกัน + ลูกบอลที่ข้อต่อ)"""
        n = len(pts) - 1
        for i in range(n):
            ra = r0 + (r1 - r0) * i / n; rb = r0 + (r1 - r0) * (i + 1) / n
            cyl(bm, pts[i], pts[i + 1], ra, rb, seg)
            if i: bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=5, radius=ra * 1.02, matrix=Matrix.Translation(Vector(pts[i])))

    def place(o, gx, gy, yaw, z=0.0):
        o.location = Vector(to_b(gx, gy, z)); o.rotation_euler = Euler((0, 0, math.radians(yaw)))

    meta = {'pieces': {}}

    # ============================================================
    #  แท่น 3 ขั้น (A) + พื้นรับเงา
    # ============================================================
    bm = bmesh.new()
    for i, r in enumerate(DAIS_R):
        bmesh.ops.create_cone(bm, cap_ends=True, segments=128, radius1=r, radius2=r - 0.02, depth=STEP, matrix=Matrix.Translation((0, 0, STEP * i + STEP / 2)))
    obj('dais', bm, M_OBS, 'dais')
    # ขอบบรอนซ์บาง ๆ ที่ปากขั้น
    bm = bmesh.new()
    for i, r in enumerate(DAIS_R):
        ring_band(bm, r - 0.07, r - 0.015, STEP * (i + 1) - 0.004, STEP * (i + 1) + 0.004, seg=128)
    obj('dais_trim', bm, M_BRONZE, 'dais')
    # ลายวงจร/รูนเรืองฟ้าอมเขียวบนผิวบน: วงแหวน 2 วง + ซี่รัศมี + ลายรูนสั้น ๆ บนขั้นกลาง
    bm = bmesh.new(); zt = DAIS_TOP + 0.002
    ring_band(bm, 1.80, 1.84, zt - 0.002, zt, seg=160)
    ring_band(bm, 1.15, 1.18, zt - 0.002, zt, seg=128)
    for k in range(12):
        a = k / 12 * 2 * math.pi + math.pi / 12
        if abs(math.sin(a) - 1) < 0.2: continue          # เว้นใต้บัลลังก์
        c, s = math.cos(a), math.sin(a)
        for (ra, rb) in [(1.18, 1.80), (1.84, 2.12)]:
            w = 0.018
            vs = [bm.verts.new((r_ * c - ww * s, r_ * s + ww * c, zt)) for r_, ww in [(ra, -w), (rb, -w), (rb, w), (ra, w)]]
            bm.faces.new(vs)
        # หัวลูกศรรูนปลายซี่ (ลายวงจร)
        r_ = 2.12; vs = [bm.verts.new(((r_ + dr) * c - ww * s, (r_ + dr) * s + ww * c, zt)) for dr, ww in [(0, -0.06), (0.08, 0), (0, 0.06), (-0.03, 0)]]
        bm.faces.new(vs)
    for k in range(36):                                     # ขีดรูนบนขั้นกลาง
        a = k / 36 * 2 * math.pi
        if k % 3 == 0: continue
        c, s = math.cos(a), math.sin(a); r_ = (DAIS_R[0] + DAIS_R[1]) / 2; z2 = STEP * 2 + 0.002
        L = 0.12 if k % 2 else 0.07
        vs = [bm.verts.new(((r_ - L / 2) * c - ww * s, (r_ - L / 2) * s + ww * c, z2) if j < 2 else ((r_ + L / 2) * c - ww * s, (r_ + L / 2) * s + ww * c, z2)) for j, ww in enumerate([-0.012, 0.012, 0.012, -0.012])]
        bm.faces.new([vs[0], vs[3], vs[2], vs[1]][::-1])
    obj('dais_runes', bm, M_RUNE_FLOOR, 'dais')
    # พื้นรับเงา (shadow catcher) — มองไม่เห็นในภาพ เหลือแต่เงาบนพื้นโปร่ง
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=30)
    floor = obj('floor', bm, M_OBS2, 'floor')
    floor.is_shadow_catcher = True

    # ============================================================
    #  บัลลังก์ (B): กิ่งไม้โลกที่หัก ต่อด้วยโลหะ บนฐานออบซิเดียน
    # ============================================================
    name, gx, gy, yaw, size = pieces()[0]
    root = bpy.data.objects.new(name, None); sc.collection.objects.link(root); place(root, gx, gy, yaw, DAIS_TOP)
    cm, cf = f'{name}_main', f'{name}_fine'
    def add(nm, bm, m, fine=False, smooth=False):
        o = obj(f'{name}_{nm}', bm, m, cf if fine else cm, smooth); o.parent = root; return o
    bm = bmesh.new()
    box(bm, (0, 0, 0.09), (2.0, 1.2, 0.18))                                        # ฐาน
    box(bm, (0, -0.02, 0.21), (1.8, 1.0, 0.06))
    add('plinth', bm, M_OBS)
    bm = bmesh.new()
    for sx in (-1, 1):
        for sy in (-1, 1): box(bm, (sx * 0.94, sy * 0.54, 0.1), (0.16, 0.16, 0.22))  # มุมบรอนซ์
    add('plinth_caps', bm, M_BRONZE)
    bm = bmesh.new(); box(bm, (0, -0.1, 0.45), (1.0, 0.62, 0.42)); add('seat', bm, M_OBS2)   # ที่นั่ง
    bm = bmesh.new(); box(bm, (0, -0.12, 0.69), (0.94, 0.56, 0.07)); add('cushion', bm, M_CLOTH)
    bm = bmesh.new(); box(bm, (0, -0.42, 0.45), (1.02, 0.03, 0.06)); box(bm, (0, -0.42, 0.62), (1.02, 0.03, 0.03)); add('seat_trim', bm, M_BRONZE)
    # พนักออบซิเดียนสลัก (แผ่นยอดแหลม) + รูนเรืองกลางพนัก
    prof = [(-0.5, 0.66), (0.5, 0.66), (0.5, 1.75), (0.32, 2.05), (0, 2.25), (-0.32, 2.05), (-0.5, 1.75)]
    bm = bmesh.new()
    fr = [bm.verts.new((x, 0.12, z)) for x, z in prof]; bk = [bm.verts.new((x, 0.34, z)) for x, z in prof]
    bm.faces.new(fr[::-1]); bm.faces.new(bk)
    n = len(prof)
    for i in range(n): bm.faces.new([fr[i], fr[(i + 1) % n], bk[(i + 1) % n], bk[i]])
    add('back', bm, M_OBS)
    bm = bmesh.new()                                           # ลายรูน: แกนตั้ง + บั้ง 3 คู่ + วงบนยอด
    def strip(x0, z0, x1, z1, w=0.025, y=0.115):
        dx, dz = x1 - x0, z1 - z0; L = math.hypot(dx, dz); nx, nz = -dz / L * w, dx / L * w
        vs = [bm.verts.new(v) for v in [(x0 - nx, y, z0 - nz), (x1 - nx, y, z1 - nz), (x1 + nx, y, z1 + nz), (x0 + nx, y, z0 + nz)]]
        bm.faces.new(vs)
    strip(0, 0.85, 0, 1.95)
    for zz in (1.05, 1.35, 1.65):
        strip(0, zz, -0.25, zz + 0.16); strip(0, zz, 0.25, zz + 0.16)
    for k in range(20):
        a0, a1 = k / 20 * 2 * math.pi, (k + 1) / 20 * 2 * math.pi
        strip(0.11 * math.cos(a0), 2.0 + 0.11 * math.sin(a0), 0.11 * math.cos(a1), 2.0 + 0.11 * math.sin(a1), 0.018)
    add('runes', bm, M_RUNE, fine=True)
    bm = bmesh.new()                                           # กรอบบรอนซ์รอบพนัก
    for i in range(n):
        (xa, za), (xb, zb) = prof[i], prof[(i + 1) % n]
        if za == 0.66 and zb == 0.66: continue
        cyl(bm, (xa, 0.11, za), (xb, 0.11, zb), 0.03, 0.03, 6)
    add('back_trim', bm, M_BRONZE)
    # กิ่งไม้โลก 2 กิ่งขนาบพนัก โค้งขึ้นเป็นมงกุฎ ปลายหักทู่ • กิ่งแขนงโค้งเข้าหากันประคองเบ้าว่างบนยอด (ที่ของ Yggdrasil Core)
    #   ต่อกันด้วยปลอกบรอนซ์ ("ต่อกิ่งกลับเข้าต้นไม้" — js/npc.js) + รากแผ่บนฐาน + แขนเท้าเป็นรากโค้ง
    def curve(ctrl, n=6):
        """Catmull-Rom ผ่านจุดควบคุม → จุดเรียบ"""
        P = [Vector(c) for c in ctrl]; P = [P[0] * 2 - P[1]] + P + [P[-1] * 2 - P[-2]]; out = []
        for i in range(1, len(P) - 2):
            p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
            for k in range(n):
                t = k / n
                out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
        out.append(P[-2]); return out
    tips = []
    def limb(bm, ctrl, r0, r1, seg=10, broken=True):
        """กิ่งเป็นท่อต่อเนื่องเรียวตามเส้นโค้ง (ผิวเรียบ ไม่มีรอยต่อเป็นปล้อง) + ปุ่มปมสุ่มเล็กน้อย"""
        pts = curve(ctrl); n = len(pts); rings = []; prev = None
        for i, p in enumerate(pts):
            d = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
            if prev is None:
                a = Vector((1, 0, 0)) if abs(d.x) < 0.9 else Vector((0, 1, 0))
                u = d.cross(a).normalized()
            else:
                u = (prev - d * prev.dot(d)).normalized()          # ส่งต่อแกนอ้างอิง (ไม่บิด)
            prev = u; v = d.cross(u)
            r = r0 + (r1 - r0) * i / (n - 1)
            ring = []
            for k in range(seg):
                a = k / seg * 2 * math.pi
                bump = 1 + 0.10 * math.sin(a * 3 + i * 0.9) * math.sin(i * 1.7) + 0.05 * math.sin(a * 5 - i)
                ring.append(bm.verts.new(p + (u * math.cos(a) + v * math.sin(a)) * r * bump))
            rings.append(ring)
        for i in range(n - 1):
            for k in range(seg):
                bm.faces.new([rings[i][k], rings[i][(k + 1) % seg], rings[i + 1][(k + 1) % seg], rings[i + 1][k]])
        bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
        if broken: tips.append((pts[-1], (pts[-1] - pts[-2]).normalized(), r1))
        return pts
    bm = bmesh.new()
    Lm = limb(bm, [(-0.62, 0.36, 0.22), (-0.66, 0.30, 0.95), (-0.60, 0.30, 1.65), (-0.74, 0.32, 2.15), (-1.0, 0.34, 2.5), (-1.08, 0.36, 2.86)], 0.16, 0.075)
    Rm = limb(bm, [(0.62, 0.36, 0.22), (0.64, 0.30, 1.0), (0.61, 0.30, 1.7), (0.78, 0.32, 2.2), (1.05, 0.34, 2.45), (1.16, 0.36, 2.62)], 0.16, 0.08)
    limb(bm, [(-0.70, 0.31, 2.02), (-0.46, 0.33, 2.42), (-0.24, 0.35, 2.66), (-0.10, 0.36, 2.74)], 0.085, 0.05, broken=False)
    limb(bm, [(0.72, 0.31, 2.08), (0.48, 0.33, 2.46), (0.26, 0.35, 2.68), (0.10, 0.36, 2.74)], 0.085, 0.05, broken=False)
    limb(bm, [(-0.92, 0.34, 2.42), (-1.18, 0.38, 2.42), (-1.30, 0.40, 2.30)], 0.06, 0.035, seg=7)      # กิ่งแขนง
    limb(bm, [(1.0, 0.34, 2.43), (1.05, 0.36, 2.72), (0.98, 0.38, 2.95)], 0.06, 0.035, seg=7)
    limb(bm, [(-0.64, 0.30, 1.45), (-0.86, 0.30, 1.62), (-0.95, 0.32, 1.85)], 0.05, 0.03, seg=7)
    limb(bm, [(0.62, 0.30, 1.3), (0.84, 0.32, 1.42), (0.92, 0.34, 1.62)], 0.05, 0.03, seg=7)
    for sx in (-1, 1):                                       # รากแผ่บนฐาน
        for (dx, dy, ln) in [(0.22, 0.12, 1), (0.35, -0.25, 1), (0.05, 0.22, 0.8)]:
            limb(bm, [(sx * 0.62, 0.36, 0.3), (sx * (0.62 + dx * 0.6), 0.36 + dy * 0.6, 0.24), (sx * (0.62 + dx * ln), 0.36 + dy * ln, 0.15)], 0.09, 0.035, seg=7, broken=False)
        limb(bm, [(sx * 0.6, 0.32, 0.62), (sx * 0.62, 0.05, 0.88), (sx * 0.6, -0.28, 0.9), (sx * 0.56, -0.46, 0.78)], 0.08, 0.06, seg=8, broken=False)  # แขนเท้า
    add('branch', bm, M_BARK, smooth=True)
    bm = bmesh.new()                                         # รอยหักปลายกิ่ง (เนื้อไม้สีอ่อน ทรงฟันเลื่อย)
    for (p, d, r) in tips:
        q = Vector((0, 0, 1)).rotation_difference(d).to_matrix().to_4x4()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=7, radius1=r * 1.05, radius2=r * 0.25, depth=r * 1.4, matrix=Matrix.Translation(p + d * r * 0.5) @ q)
    add('cuts', bm, M_WOODCUT)
    bm = bmesh.new()                                         # ปลอกบรอนซ์ที่ "ต่อกิ่ง" + หมุดปลายแขนเท้า
    for pts in (Lm, Rm):
        for k in (9, 17):
            p = pts[k]; d = (pts[k + 1] - pts[k - 1]).normalized()
            rr = 0.16 + (0.075 - 0.16) * k / (len(pts) - 1)
            bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=rr * 1.25, radius2=rr * 1.25, depth=0.06, matrix=Matrix.Translation(p) @ Vector((0, 0, 1)).rotation_difference(d).to_matrix().to_4x4())
    for sx in (-1, 1): bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=5, radius=0.055, matrix=Matrix.Translation((sx * 0.56, -0.47, 0.8)))
    add('bands', bm, M_BRONZE)
    bm = bmesh.new()                                         # เบ้าว่างบนยอด: วงแหวนบรอนซ์ที่กิ่งประคอง + แสงจาง ๆ ข้างใน
    for k in range(24):
        a0, a1 = k / 24 * 2 * math.pi, (k + 1) / 24 * 2 * math.pi
        cyl(bm, (0.15 * math.cos(a0), 0.36, 2.86 + 0.15 * math.sin(a0)), (0.15 * math.cos(a1), 0.36, 2.86 + 0.15 * math.sin(a1)), 0.028, 0.028, 6)
    add('socket', bm, M_BRONZE)
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=0.06, matrix=Matrix.Translation((0, 0.36, 2.86)))
    add('socket_glow', bm, M_RUNE_DIM, fine=True, smooth=True)
    meta['pieces'][name] = {'gx': gx, 'gy': gy, 'yaw': yaw, 'size': size, 'z0': DAIS_TOP, 'jars': []}

    # ============================================================
    #  ชั้นวางประกาย (B) × 5
    # ============================================================
    for si, (name, gx, gy, yaw, size) in enumerate(pieces()[1:]):
        rnd = random.Random(1000 + si * 77)
        root = bpy.data.objects.new(name, None); sc.collection.objects.link(root); place(root, gx, gy, yaw)
        cm, cf = f'{name}_main', f'{name}_fine'
        W, D, H = SHELF_W, SHELF_D, SHELF_H
        def add(nm, bm, m, fine=False, smooth=False, _n=name, _r=root, _cm=cm, _cf=cf):
            o = obj(f'{_n}_{nm}', bm, m, _cf if fine else _cm, smooth); o.parent = _r; return o
        bm = bmesh.new()
        box(bm, (0, 0, 0.07), (W + 0.1, D + 0.06, 0.14))                       # ฐาน
        for sx in (-1, 1): box(bm, (sx * (W / 2 - 0.06), 0, H / 2), (0.12, D, H))   # เสาข้าง
        box(bm, (0, D / 2 - 0.02, H / 2), (W - 0.1, 0.04, H))                   # แผ่นหลัง (หน้าในทึบมืด)
        add('frame', bm, M_STONE)
        bm = bmesh.new(); box(bm, (0, 0, H - 0.05), (W + 0.12, D + 0.08, 0.12)); add('cornice', bm, M_TOP)   # คิ้วบน (ผิวบนเข้ม ไม่ให้เป็นแผ่นสว่าง)
        bm = bmesh.new()                                                        # แผ่นยอดสลักโค้ง (ไม่ใช่หลังคา) + ปุ่มปลายสองข้าง
        ztop = H + 0.01
        prof = [(-W / 2 + 0.02, ztop)] + [(x * (W / 2 - 0.02), ztop + 0.08 + 0.16 * (1 - x * x) ** 0.8) for x in [i / 10 - 1 for i in range(21)]] + [(W / 2 - 0.02, ztop)]
        fr = [bm.verts.new((x, -D / 2 - 0.02, z)) for x, z in prof]; bk = [bm.verts.new((x, -D / 2 + 0.06, z)) for x, z in prof]
        bm.faces.new(fr[::-1]); bm.faces.new(bk)
        for i in range(len(prof)): bm.faces.new([fr[i], fr[(i + 1) % len(prof)], bk[(i + 1) % len(prof)], bk[i]])
        add('crest', bm, M_STONE)
        bm = bmesh.new()
        for sx in (-1, 1):
            bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=0.075, matrix=Matrix.Translation((sx * (W / 2 + 0.0), -D / 2 + 0.0, ztop + 0.07)))
        for i in range(20):
            (xa, za), (xb, zb) = prof[i + 1], prof[i + 2]
            cyl(bm, (xa, -D / 2 - 0.04, za), (xb, -D / 2 - 0.04, zb), 0.02, 0.02, 6)
        for sx in (-1, 1):
            box(bm, (sx * (W / 2 - 0.06), -D / 2 - 0.005, 0.2), (0.15, 0.02, 0.06)); box(bm, (sx * (W / 2 - 0.06), -D / 2 - 0.005, H - 0.2), (0.15, 0.02, 0.06))
        box(bm, (0, -D / 2 - 0.045, H - 0.05), (W + 0.14, 0.02, 0.04))
        add('trim', bm, M_BRONZE)
        bm = bmesh.new()                                                        # รูนเรืองตามเสาข้าง
        for sx in (-1, 1):
            for k in range(5):
                z = 0.45 + k * 0.42
                box(bm, (sx * (W / 2 - 0.06), -D / 2 - 0.004, z), (0.022, 0.01, 0.16))
                box(bm, (sx * (W / 2 - 0.06) + 0.03, -D / 2 - 0.004, z + 0.05), (0.05, 0.01, 0.018), Euler((0, 0.6, 0)))
        for k in range(16):                                                     # วงรูนกลางแผ่นยอด
            a0 = k / 16 * 2 * math.pi
            box(bm, (0.075 * math.cos(a0), -D / 2 - 0.035, ztop + 0.13 + 0.075 * math.sin(a0)), (0.032, 0.012, 0.016), Euler((0, -a0 - math.pi / 2, 0)))
        box(bm, (0, -D / 2 - 0.035, ztop + 0.13), (0.016, 0.012, 0.1))
        add('runes', bm, M_RUNE, fine=True)
        # แผ่นชั้น 6 ชั้น × 8 ช่อง + โหลแก้ว
        rows = 6; zs = [0.16 + i * (H - 0.38) / rows for i in range(rows)]
        bm = bmesh.new()
        for z in zs: box(bm, (0, -0.02, z), (W - 0.2, D - 0.06, 0.04))
        add('boards', bm, M_BOARD)
        glass, lids, sparks = bmesh.new(), bmesh.new(), [bmesh.new() for _ in SPARK]; dead = bmesh.new()
        jars = []
        cols_n = 8; inner = W - 0.26
        for ri, z in enumerate(zs):
            for ci in range(cols_n):
                if rnd.random() < 0.08: continue                                # ช่องว่าง (โหลที่หล่นหายไป)
                x = -inner / 2 + inner * (ci + 0.5) / cols_n + rnd.uniform(-0.015, 0.015)
                y = -D / 2 + 0.16 + rnd.uniform(-0.02, 0.05)
                r = rnd.uniform(0.062, 0.078); h = rnd.uniform(0.17, 0.25) * (0.9 if ri == rows - 1 else 1)
                z0 = z + 0.02
                bmesh.ops.create_cone(glass, cap_ends=True, segments=12, radius1=r * 0.9, radius2=r, depth=h * 0.85, matrix=Matrix.Translation((x, y, z0 + h * 0.425)))
                bmesh.ops.create_cone(glass, cap_ends=True, segments=12, radius1=r, radius2=r * 0.55, depth=h * 0.15, matrix=Matrix.Translation((x, y, z0 + h * 0.925)))
                bmesh.ops.create_cone(lids, cap_ends=True, segments=12, radius1=r * 0.62, radius2=r * 0.6, depth=0.03, matrix=Matrix.Translation((x, y, z0 + h + 0.012)))
                lit = rnd.random() > 0.07
                k = rnd.choices(range(len(SPARK)), weights=[3, 3, 2, 2, 1])[0]
                sr = r * rnd.uniform(0.45, 0.62)
                bmesh.ops.create_icosphere(sparks[k] if lit else dead, subdivisions=2, radius=sr, matrix=Matrix.Translation((x, y, z0 + h * 0.45)))
                if lit: jars.append({'p': (x, y, z0 + h * 0.45), 'b': round([0.45, 0.6, 0.8, 0.55, 1.0][k], 2)})
        add('glass', glass, M_GLASS, fine=True, smooth=True)
        add('lids', lids, M_LID, fine=True)
        for k, b in enumerate(sparks): add(f'spark{k}', b, SPARK[k], fine=True, smooth=True)
        add('dead', dead, M_SPARK_DEAD, fine=True, smooth=True)
        meta['pieces'][name] = {'gx': gx, 'gy': gy, 'yaw': yaw, 'size': size, 'z0': 0.0, 'jars': jars}

    # ---------- แสง ----------
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 2.6; sun.angle = math.radians(12); sun.color = (0.92, 0.9, 1.0)
    so = bpy.data.objects.new('sun', sun); sc.collection.objects.link(so)
    so.rotation_euler = (math.radians(42), 0, math.radians(-135))   # จากซ้ายบน (ตะวันตกเฉียงเหนือ) → เงาตกขวาล่าง
    rim = bpy.data.lights.new('rim', 'SUN'); rim.energy = 1.1; rim.angle = math.radians(8); rim.color = (0.55, 1.0, 0.9)
    ro = bpy.data.objects.new('rim', rim); sc.collection.objects.link(ro)
    ro.rotation_euler = (math.radians(65), 0, math.radians(150))    # ขอบแสงเขียวอมฟ้าจากหลังขวา (แยกวัตถุออกจากความมืด)
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.26, 0.24, 0.36, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.42

    # ---------- กล้อง/เรนเดอร์ ----------
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.sensor_fit = 'HORIZONTAL'; cam.clip_end = 200
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
    co.rotation_euler = (TH, 0, 0)
    dvec = Vector((0, math.sin(TH), -math.cos(TH))); uvec = Vector((0, math.cos(TH), math.sin(TH)))
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
    sc.cycles.samples = 12 if preview else samples
    try: sc.cycles.use_denoising = True
    except Exception: pass
    sc.cycles.max_bounces = 6; sc.cycles.transparent_max_bounces = 16
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    try: sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Punchy'
    except Exception: sc.view_settings.view_transform = 'Filmic'
    sc.view_settings.exposure = 0.35
    sc.render.resolution_percentage = 50 if preview else 100
    # เส้นขอบ (Freestyle) — เส้นเฉพาะ collection หลักของชิ้นที่กำลังเรนเดอร์ (โหล/รูนไม่มีเส้น)
    sc.render.use_freestyle = True; sc.render.line_thickness_mode = 'ABSOLUTE'
    vl = bpy.context.view_layer; fs = vl.freestyle_settings
    fs.crease_angle = math.radians(128)
    ls = fs.linesets[0] if fs.linesets else fs.linesets.new('L')
    ls.select_by_visibility = True; ls.select_by_collection = True
    ls.select_silhouette = True; ls.select_border = True; ls.select_crease = True
    if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new('line')
    ls.linestyle.color = (0.08, 0.05, 0.04)

    def all_objs(cname):
        return list(cols[cname].objects) if cname in cols else []

    def set_vis(target):
        """target = 'dais' (A) หรือชื่อชิ้น (B): ชิ้นอื่นซ่อนจากกล้องแต่ยังให้เงา/แสง"""
        for cname, c in cols.items():
            piece = cname.rsplit('_', 1)[0] if cname.endswith(('_main', '_fine')) else cname
            for o in c.objects:
                o.hide_render = False
                if target == 'dais': o.visible_camera = piece in ('dais', 'floor')
                else: o.visible_camera = piece == target
                if piece == 'floor': o.visible_camera = target == 'dais'
                # B: ชิ้นอื่นซ่อนทั้งหมด (Freestyle ไม่รู้จัก visible_camera — กันเส้นของชิ้นอื่น) ยกเว้นแท่น/พื้น (ให้แสงสะท้อน)
                if target != 'dais' and piece not in (target, 'dais', 'floor'): o.hide_render = True

    def frame(objs, pad, res):
        bpy.context.view_layer.update()
        xs, ys = [], []
        for o in objs:
            M = o.matrix_world
            for v in o.data.vertices:
                p = M @ v.co; sx, sy = screen(p); xs.append(sx); ys.append(sy)
        x0, x1, y0, y1 = min(xs) - pad, max(xs) + pad, min(ys) - pad, max(ys) + pad
        wpx, hpx = math.ceil((x1 - x0) * res), math.ceil((y1 - y0) * res)
        x1, y1 = x0 + wpx / res, y0 + hpx / res
        return x0, y0, x1, y1, wpx, hpx

    def shoot(x0, y0, x1, y1, wpx, hpx, path):
        cam.ortho_scale = x1 - x0
        # จุดกลางภาพบนจอ (sx, sy) → ตำแหน่งกล้อง: X = sx, และระนาบ Y-Z ตาม uvec
        cxs, cys = (x0 + x1) / 2, (y0 + y1) / 2
        co.location = Vector((cxs, 0, 0)) + uvec * cys - dvec * 60
        sc.render.resolution_x = wpx; sc.render.resolution_y = hpx
        sc.render.filepath = path
        bpy.ops.render.render(write_still=True)
        print('เรนเดอร์ →', path, wpx, 'x', hpx)

    todo = only or (['dais'] + [p[0] for p in pieces()])
    # ---------- A: แท่น + เงา ----------
    if 'dais' in todo:
        set_vis('dais'); ls.collection = cols['dais']; sc.render.line_thickness = 1.0; ls.linestyle.thickness = 2.0 * (0.5 if preview else 1)
        gx0, gy0, gx1, gy1 = A_RECT
        x0, x1 = gx0 - CX, gx1 - CX
        y1 = -(gy0 - CY) * K; y0 = -(gy1 - CY) * K                 # พื้น z=0: sy = Y·K
        wpx, hpx = round((x1 - x0) * RES_A), round((y1 - y0) * RES_A)
        shoot(x0, y0, x1, y1, wpx, hpx, os.path.join(outdir, 'dais.png'))
        meta['dais'] = {'rect': A_RECT, 'px': [wpx, hpx], 'res': RES_A}
    # ---------- B: ทีละชิ้น ----------
    for name in [p[0] for p in pieces()]:
        if name not in todo: continue
        set_vis(name); ls.collection = cols[f'{name}_main']
        sc.render.line_thickness = 1.0; ls.linestyle.thickness = 5.0 * (0.5 if preview else 1)
        objs = all_objs(f'{name}_main') + all_objs(f'{name}_fine')
        x0, y0, x1, y1, wpx, hpx = frame(objs, 0.12, RES_B)
        shoot(x0, y0, x1, y1, wpx, hpx, os.path.join(outdir, f'{name}.png'))
        m = meta['pieces'][name]
        def px(p):
            sx, sy = screen(p); return [round((sx - x0) * RES_B, 2), round((y1 - sy) * RES_B, 2)]
        m['anchor'] = px(to_b(m['gx'], m['gy'], 0.0))
        m['px'] = [wpx, hpx]; m['res'] = RES_B
        # โหลที่กล้องมองเห็น (ไม่ถูกเสา/คิ้วบังจนมิด): ยิงรังสีจากกล้องไปที่ประกาย
        root = bpy.data.objects[name]; Mw = root.matrix_world
        dg = bpy.context.evaluated_depsgraph_get(); vis = []
        for j in m['jars']:
            p = Mw @ Vector(j['p'])
            hit, loc, nor, idx, ob, _ = sc.ray_cast(dg, p - dvec * 20, dvec)
            okv = hit and ob is not None and (ob.name.startswith(f'{name}_spark') or ob.name.startswith(f'{name}_glass')) and (loc - p).length < 0.5
            if okv: vis.append(px(tuple(p)) + [j['b']])
        m['jarpx'] = vis
        print(name, 'โหลที่เห็น', len(vis), '/', len(m['jars']))
    old = {}
    mp = os.path.join(outdir, 'meta.json')
    if os.path.exists(mp):
        try: old = json.load(open(mp))
        except Exception: old = {}
    old.setdefault('pieces', {})
    for k, v in meta['pieces'].items():
        if 'anchor' in v: old['pieces'][k] = v
    if 'dais' in meta: old['dais'] = meta['dais']
    json.dump(old, open(mp, 'w'), indent=1)
    print('meta →', mp)


# ============================================================
#  ติดตั้ง: ย่อ + ปรับสีให้เข้ากับภาพวาด + เส้นขอบรอบนอก → assets + js/bake_data.js + manifest
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


def install(src):
    from PIL import Image
    sys.path.insert(0, os.path.join(ROOT, 'tools'))
    meta = json.load(open(os.path.join(src, 'meta.json')))
    data = {'map': MAP_ID, 'clear': {'x': CX, 'y': CY, 'r': CLEAR_R}, 'ground': [], 'pieces': []}
    # A: แท่น — ย่อเป็น 40 px/ม. แล้วยืดแนวตั้ง ×1/0.76 (ผ้าใบพื้นไม่ถูกบีบ เกมบีบตอนวาด)
    d = meta['dais']; x0, y0, x1, y1 = d['rect']
    im = Image.open(os.path.join(src, 'dais.png')).convert('RGBA')
    W, H = round((x1 - x0) * PX), round((y1 - y0) * PX)
    im = im.resize((W, H), Image.LANCZOS)
    im = paint(im, sat=1.2, con=1.05, bri=1.0, outline=False)
    al = im.getchannel('A').point(lambda v: v if v >= 250 else int(v * 0.6))   # เงาบนพื้นอ่อนลง (ถ้ำ — แสงหลักคือโหลประกาย) แท่นทึบคงเดิม
    im.putalpha(al)
    key = 'bake_hel_dais'; im.save(os.path.join(ROOT, 'assets', key + '.webp'), 'WEBP', quality=90, method=6)
    data['ground'].append({'img': key, 'x': x0, 'y': y0, 'w': x1 - x0, 'h': y1 - y0})
    print('ติดตั้ง', key, im.size)
    # B: สไปรต์
    sc = STORE_B / RES_B
    for name, gx, gy, yaw, size in pieces():
        m = meta['pieces'].get(name)
        if not m or not os.path.exists(os.path.join(src, name + '.png')): print('ข้าม', name); continue
        im = Image.open(os.path.join(src, name + '.png')).convert('RGBA')
        im = im.resize((round(im.width * sc), round(im.height * sc)), Image.LANCZOS)
        im = paint(im)
        l, t, r, b = im.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox()
        l, t, r, b = max(0, l - 2), max(0, t - 2), min(im.width, r + 2), min(im.height, b + 2)
        im = im.crop((l, t, r, b))
        key = 'bake_hel_' + name; im.save(os.path.join(ROOT, 'assets', key + '.webp'), 'WEBP', quality=90, method=6)
        ax, ay = m['anchor'][0] * sc - l, m['anchor'][1] * sc - t
        jars = [[round(j[0] * sc - l, 1), round(j[1] * sc - t, 1), j[2]] for j in m.get('jarpx', [])]
        ent = {'id': name, 'img': key, 'x': gx, 'y': gy, 'ax': round(ax, 1), 'ay': round(ay, 1), 'scale': PX / STORE_B,
               'block': footprint_tiles(gx, gy, yaw, size), 'jars': jars}
        # แสงตัดความมืดถ้ำ: 1 ดวงต่อชิ้น (render.js รวม map.extraLights เข้า lightProps)
        if name == 'throne': ent['light'] = {'dx': 0, 'dy': -0.3, 'lr': 2.6, 'col': '96,240,208'}
        else:
            a = math.atan2(-(gy - CY), gx - CX)
            ent['light'] = {'dx': round(-math.cos(a) * 0.7, 2), 'dy': round(math.sin(a) * 0.7 - 0.35, 2), 'lr': 3.0, 'col': '96,240,208'}
        data['pieces'].append(ent)
        print('ติดตั้ง', key, im.size, 'anchor', (round(ax, 1), round(ay, 1)), 'โหล', len(jars), 'ชน', ent['block'])
    js = ("'use strict';\n// สร้างอัตโนมัติโดย tools/hel3d.py --install — อย่าแก้ด้วยมือ (แก้ใน tools/hel3d.py แล้วติดตั้งใหม่)\n"
          "// ภาพ 3D อบเป็น 2D ของแมพ: ground = แบบ A (วาดลงผ้าใบพื้น) • pieces = แบบ B (สไปรต์ตั้งตรงเรียงความลึก) — ใช้ใน js/bake.js\n"
          "// x,y = จุดเรียงความลึก/จุดยึด (พิกัดแมพ) • ax,ay = จุดเดียวกันในภาพ (px) • scale = ขนาดวาด (ภาพเก็บที่ 80 px/ม.)\n"
          "// block = ช่องชน • jars = ตำแหน่งโหลประกายในภาพ (px, ความสว่าง) สำหรับประกายกะพริบ • light = แสงตัดความมืด\n"
          f"const BAKE_DATA = {{ {MAP_ID}: {json.dumps(data, separators=(',', ':'))} }};\n")
    open(os.path.join(ROOT, 'js', 'bake_data.js'), 'w').write(js)
    print('เขียน js/bake_data.js')
    from slice_sheet import manifest
    manifest()


if __name__ == '__main__':
    a = sys.argv
    if '--install' in a: install(a[a.index('--install') + 1])
    else:
        only = a[a.index('--only') + 1].split(',') if '--only' in a else None
        build(int(a[a.index('--samples') + 1]) if '--samples' in a else 48,
              a[a.index('--out') + 1] if '--out' in a else '/tmp/hel3d', only, '--preview' in a)
