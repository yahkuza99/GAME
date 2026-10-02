"""หุ่นฟางฝึกซ้อม (Training Dummy) 3D — โมเดลด้วย bpy แล้วเรนเดอร์เป็นสไปรต์ assets/prop_dummy_straw.webp

หน่วย: เมตร • เสาไม้ปักอยู่ที่ (0, 0, 0) • ด้านหน้าหุ่นหันไปทาง -Y (หากล้อง)
หุ่น: เสาไม้ปักในเนินดิน+หิน • คานขวางเป็นแขนพันฟาง • ลำตัวฟางมัดเชือก 3 เปลาะ + เป้าสีแดงบนอก
      • หัวกระสอบป่านผูกคอ หน้าตาขีดด้วยสี • ฟางหลุดลุ่ยตามปลายแขน/ชายล่าง/กระหม่อม/พื้น
กล้อง: ออร์โธเอียง (VIEW_K = cos มุมจากแนวดิ่ง — ใช้มุมแบบสไปรต์ตัวละคร) • แสงจากซ้ายบนเหมือนทั้งเกม
หลังเรนเดอร์: ย่อครึ่ง + ตัดขอบใส + เส้นขอบเข้ม (สไตล์ภาพวาดของเกม) → เกมวาดด้วย Sprites.dummy (js/sprites.js)
  ค่าที่ js ต้องรู้ (จุดโคนเสา/จุดตัดฐาน) พิมพ์ออกมาตอน --install → ใส่ไว้ใน DUMMY_IMG ใน js/sprites.js

ใช้:  /tmp/bvenv/bin/python tools/dummy3d.py [--samples 96] [--out /tmp/dummy.png]
แล้ว: python3 tools/dummy3d.py --install /tmp/dummy.png
"""
import math, os, sys, random, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIEW_K = 0.5           # cos มุมกล้องจากแนวดิ่ง (มุมเงย 30° เหมือนสไปรต์ตัวละคร — R.K 0.76 ของพื้นมองจากบนเกินไป หุ่นดูเตี้ยแบน)
W, H = 512, 640        # ขนาดเรนเดอร์ (ย่อครึ่งตอนติดตั้ง)
ORTHO = 1.75           # ความกว้างภาพเป็นเมตร
ANCHOR_ROW = 0.86      # โคนเสา (0,0,0) อยู่ที่ 86% ของความสูงภาพ
CUT_Z = 0.16           # ความสูง (ม.) ที่แบ่ง "ฐานนิ่ง" กับ "ตัวหุ่นที่โยก" ตอนโดนตี


def cam_basis():
    th = math.acos(VIEW_K)
    d = (0.0, math.sin(th), -math.cos(th))      # ทิศที่กล้องมอง
    u = (0.0, math.cos(th), math.sin(th))       # ทิศขึ้นของจอ
    return th, d, u


def project(p):
    """จุดโลก → พิกเซลในภาพเรนเดอร์ (W×H)"""
    th, d, u = cam_basis()
    ppm = W / ORTHO
    k = (ANCHOR_ROW - 0.5) * H / ppm
    sy = p[1] * u[1] + p[2] * u[2] - k     # origin อยู่ต่ำกว่ากลางภาพ k เมตร
    return W / 2 + p[0] * ppm, H / 2 - sy * ppm


def build(samples, out):
    import bpy, bmesh
    from mathutils import Vector, Matrix, noise
    random.seed(11)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene

    # ---------- วัสดุ ----------
    def principled(name):
        m = bpy.data.materials.new(name); m.use_nodes = True
        nt = m.node_tree; b = nt.nodes['Principled BSDF']
        return m, nt, b

    def coord(nt, scale):
        tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
        mp.inputs['Scale'].default_value = scale
        nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
        return mp.outputs['Vector']

    def ramp(nt, fac, cols):
        r = nt.nodes.new('ShaderNodeValToRGB'); el = r.color_ramp.elements
        for i, (pos, c) in enumerate(cols):
            e = el[i] if i < len(el) else el.new(pos)
            e.position = pos; e.color = (*c, 1)
        nt.links.new(fac, r.inputs['Fac'])
        return r.outputs['Color']

    def bump(nt, b, h, strength, dist=0.01):
        bn = nt.nodes.new('ShaderNodeBump'); bn.inputs['Strength'].default_value = strength
        bn.inputs['Distance'].default_value = dist
        nt.links.new(h, bn.inputs['Height']); nt.links.new(bn.outputs['Normal'], b.inputs['Normal'])

    def fibre_mat(name, scale, cols, rough=0.72, bstr=0.55, sheen=0.25):
        """ฟาง/ไม้: noise ที่ยืดตามแนวเส้นใย (scale น้อยในแกนเส้นใย) + noise ใหญ่สำหรับคราบ/สีไม่สม่ำเสมอ"""
        m, nt, b = principled(name)
        v = coord(nt, scale)
        n1 = nt.nodes.new('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 1.0; n1.inputs['Detail'].default_value = 10
        n1.inputs['Roughness'].default_value = 0.65
        nt.links.new(v, n1.inputs['Vector'])
        n2 = nt.nodes.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 3.0; n2.inputs['Detail'].default_value = 3
        mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'FLOAT'; mix.inputs['Factor'].default_value = 0.3
        nt.links.new(n1.outputs['Fac'], mix.inputs['A']); nt.links.new(n2.outputs['Fac'], mix.inputs['B'])
        nt.links.new(ramp(nt, mix.outputs['Result'], cols), b.inputs['Base Color'])
        b.inputs['Roughness'].default_value = rough
        try: b.inputs['Sheen Weight'].default_value = sheen; b.inputs['Sheen Tint'].default_value = (1.0, 0.9, 0.6, 1)
        except Exception: pass
        bump(nt, b, n1.outputs['Fac'], bstr, 0.006)
        return m

    STRAW_COLS = [(0.30, (0.36, 0.20, 0.04)), (0.48, (0.80, 0.52, 0.12)), (0.62, (0.95, 0.74, 0.28)), (0.78, (1.0, 0.90, 0.50))]
    M_STRAW_Z = fibre_mat('straw_z', (70, 70, 2.5), STRAW_COLS)          # เส้นใยตามแนวตั้ง (ลำตัว)
    M_STRAW_X = fibre_mat('straw_x', (2.5, 70, 70), STRAW_COLS)          # เส้นใยตามแนวนอน (แขน)
    M_WOOD = fibre_mat('wood', (24, 24, 1.2), [(0.30, (0.13, 0.07, 0.03)), (0.5, (0.30, 0.17, 0.08)), (0.68, (0.46, 0.29, 0.14)), (0.85, (0.56, 0.38, 0.20))], rough=0.8, bstr=0.5, sheen=0.0)
    M_WOODX = fibre_mat('woodx', (1.2, 24, 24), [(0.30, (0.13, 0.07, 0.03)), (0.5, (0.30, 0.17, 0.08)), (0.68, (0.46, 0.29, 0.14)), (0.85, (0.56, 0.38, 0.20))], rough=0.8, bstr=0.5, sheen=0.0)
    STRAND = [fibre_mat(f'strand{i}', (40, 40, 40), [(0.3, tuple(c * f for c in (0.7, 0.5, 0.18))), (0.7, tuple(min(1, c * f) for c in (0.98, 0.85, 0.45)))], bstr=0.2)
              for i, f in enumerate((0.85, 1.0, 1.12))]

    def rope_mat():
        m, nt, b = principled('rope')
        b.inputs['Base Color'].default_value = (0.36, 0.24, 0.12, 1); b.inputs['Roughness'].default_value = 0.9
        n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = 160; n.inputs['Detail'].default_value = 4
        bump(nt, b, n.outputs['Fac'], 0.4, 0.003)
        return m
    M_ROPE = rope_mat()

    def burlap_mat():
        """กระสอบป่าน: ลายสาน (คลื่นสองทิศคูณกัน) + noise สีหม่น"""
        m, nt, b = principled('burlap')
        v = coord(nt, (1, 1, 1))
        wx = nt.nodes.new('ShaderNodeTexWave'); wx.bands_direction = 'X'; wx.inputs['Scale'].default_value = 140
        wz = nt.nodes.new('ShaderNodeTexWave'); wz.bands_direction = 'Z'; wz.inputs['Scale'].default_value = 140
        for w_ in (wx, wz):
            w_.inputs['Distortion'].default_value = 1.5; nt.links.new(v, w_.inputs['Vector'])
        mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MAXIMUM'
        nt.links.new(wx.outputs['Fac'], mul.inputs[0]); nt.links.new(wz.outputs['Fac'], mul.inputs[1])
        n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = 9; n.inputs['Detail'].default_value = 5
        nt.links.new(v, n.inputs['Vector'])
        mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'FLOAT'; mix.inputs['Factor'].default_value = 0.55
        nt.links.new(mul.outputs['Value'], mix.inputs['A']); nt.links.new(n.outputs['Fac'], mix.inputs['B'])
        nt.links.new(ramp(nt, mix.outputs['Result'], [(0.25, (0.30, 0.20, 0.11)), (0.55, (0.56, 0.42, 0.25)), (0.85, (0.74, 0.60, 0.38))]), b.inputs['Base Color'])
        b.inputs['Roughness'].default_value = 0.95
        bump(nt, b, mul.outputs['Value'], 0.35, 0.002)
        return m
    M_BURLAP = burlap_mat()

    def flat(name, col, rough=0.75, nscale=0, var=0.0, bstr=0.0):
        m, nt, b = principled(name)
        b.inputs['Roughness'].default_value = rough
        if nscale:
            n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = nscale; n.inputs['Detail'].default_value = 8
            nt.links.new(ramp(nt, n.outputs['Fac'], [(0.3, tuple(c * (1 - var) for c in col)), (0.7, tuple(min(1, c * (1 + var)) for c in col))]), b.inputs['Base Color'])
            if bstr: bump(nt, b, n.outputs['Fac'], bstr, 0.02)
        else:
            b.inputs['Base Color'].default_value = (*col, 1)
        return m
    M_RED = flat('paint_red', (0.62, 0.07, 0.04), 0.65, nscale=30, var=0.25)
    M_CREAM = flat('paint_cream', (0.86, 0.76, 0.56), 0.8, nscale=30, var=0.2)
    M_INK = flat('paint_ink', (0.07, 0.04, 0.03), 0.6)
    M_DIRT = flat('dirt', (0.30, 0.20, 0.12), 0.95, nscale=12, var=0.35, bstr=0.6)
    M_STONE = flat('stone', (0.33, 0.30, 0.26), 0.85, nscale=8, var=0.35, bstr=0.5)
    M_IRON = flat('iron', (0.30, 0.30, 0.32), 0.45)
    M_IRON.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value = 1.0

    def obj(name, bm, material, smooth=True):
        me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new(name, me); sc.collection.objects.link(o)
        o.data.materials.append(material)
        for p in o.data.polygons: p.use_smooth = smooth
        return o

    # ---------- เครื่องมือสร้างรูปทรง ----------
    def lathe(bm, prof, seg, disp=None, mat=Matrix(), cap0=True, cap1=True):
        """หมุนโปรไฟล์ [(z, r)] รอบแกน Z ของ local แล้วแปลงด้วย mat • disp(a, z, r) → r ใหม่"""
        rings = []
        for z, r in prof:
            ring = []
            for i in range(seg):
                a = i / seg * 2 * math.pi
                rr = disp(a, z, r) if disp else r
                ring.append(bm.verts.new(mat @ Vector((rr * math.cos(a), rr * math.sin(a), z))))
            rings.append(ring)
        for j in range(len(rings) - 1):
            A, B = rings[j], rings[j + 1]
            for i in range(seg):
                bm.faces.new((A[i], A[(i + 1) % seg], B[(i + 1) % seg], B[i]))
        if cap0:
            c = bm.verts.new(mat @ Vector((0, 0, prof[0][0])))
            for i in range(seg): bm.faces.new((rings[0][(i + 1) % seg], rings[0][i], c))
        if cap1:
            c = bm.verts.new(mat @ Vector((0, 0, prof[-1][0])))
            for i in range(seg): bm.faces.new((rings[-1][i], rings[-1][(i + 1) % seg], c))

    def rope_ring(bm, R, r, mat, twists=None, seg=96, tseg=10, wob=0.0):
        """เชือกพันเป็นวง: ท่อรอบวงกลมรัศมี R + เกลียวเชือก 3 เกลียว (นูนตามมุม)"""
        twists = twists or int(R * 2 * math.pi / (r * 2.2))
        rings = []
        for i in range(seg):
            a = i / seg * 2 * math.pi
            cx, cy = R * math.cos(a), R * math.sin(a)
            dz = wob * math.sin(a * 2 + 1.3)
            ring = []
            for j in range(tseg):
                b = j / tseg * 2 * math.pi
                rr = r * (1 + 0.22 * math.cos(3 * b - a * twists))
                ring.append(bm.verts.new(mat @ Vector((cx + rr * math.cos(b) * math.cos(a), cy + rr * math.cos(b) * math.sin(a), dz + rr * math.sin(b)))))
            rings.append(ring)
        for i in range(seg):
            A, B = rings[i], rings[(i + 1) % seg]
            for j in range(tseg):
                bm.faces.new((A[j], A[(j + 1) % tseg], B[(j + 1) % tseg], B[j]))

    def strand(bm, p, d, L, w=0.0045):
        """ฟางหนึ่งเส้น: ปริซึมสามเหลี่ยมเรียวแหลม โค้งเล็กน้อยตามแรงโน้มถ่วง"""
        d = Vector(d).normalized()
        side = d.cross(Vector((0.3, 0.7, 0.2)) if abs(d.z) > 0.9 else Vector((0, 0, 1))).normalized()
        up = d.cross(side).normalized()
        p = Vector(p); n = 3; prev = None
        for k in range(n + 1):
            t = k / n
            c = p + d * L * t + Vector((0, 0, -0.04 * L * t * t))
            ww = w * (1 - 0.85 * t)
            cur = [bm.verts.new(c + (side * math.cos(q) + up * math.sin(q)) * ww) for q in (0, 2.1, 4.2)]
            if prev:
                for j in range(3): bm.faces.new((prev[j], prev[(j + 1) % 3], cur[(j + 1) % 3], cur[j]))
            prev = cur

    def nz(x, y, z):
        return noise.noise(Vector((x, y, z)))

    # ---------- ฐาน: เนินดิน + หิน ----------
    bm = bmesh.new()
    prof = []
    for i in range(13):
        t = i / 12; r = 0.06 + t * 0.27
        prof.append((0.07 * (1 - t ** 1.6) - 0.004, r))
    # เนินดินเป็นแผ่น (ยกตามระยะ) — ใช้ grid เชิงขั้วแทน lathe (z ขึ้นกับ r)
    seg = 72; rings = []
    for z, r in prof:
        ring = []
        for i in range(seg):
            a = i / seg * 2 * math.pi
            rr = r * (1 + 0.12 * nz(math.cos(a) * 2, math.sin(a) * 2, 3.1)) if r > 0.1 else r
            zz = z + 0.012 * nz(math.cos(a) * 6 * r, math.sin(a) * 6 * r, 7.7)
            ring.append(bm.verts.new((rr * math.cos(a), rr * math.sin(a), max(-0.004, zz))))
        rings.append(ring)
    for j in range(len(rings) - 1):
        for i in range(seg):
            bm.faces.new((rings[j][i], rings[j + 1][i], rings[j + 1][(i + 1) % seg], rings[j][(i + 1) % seg]))
    c = bm.verts.new((0, 0, 0.075))
    for i in range(seg): bm.faces.new((rings[0][i], rings[0][(i + 1) % seg], c))
    obj('mound', bm, M_DIRT)

    bm = bmesh.new()
    for k, (a, r, s) in enumerate([(200, 0.22, 0.06), (240, 0.27, 0.042), (300, 0.21, 0.055), (345, 0.25, 0.04), (25, 0.22, 0.05), (115, 0.23, 0.055), (160, 0.26, 0.04)]):
        a = math.radians(a)
        bmesh.ops.create_icosphere(bm, subdivisions=2, radius=s,
                                   matrix=Matrix.LocRotScale(Vector((r * math.cos(a), r * math.sin(a), 0.02 + 0.008 * (k % 2))), Matrix.Rotation(a, 3, 'Z'), Vector((1.0 + 0.3 * (k % 3), 0.85, 0.6))))
    for v in bm.verts:
        v.co.z += 0.01 * nz(v.co.x * 30, v.co.y * 30, v.co.z * 30)
        v.co.x += 0.01 * nz(v.co.x * 25 + 3, v.co.y * 25, v.co.z * 25)
    obj('stones', bm, M_STONE, smooth=False)

    # ---------- เสาไม้ + คานแขน ----------
    bm = bmesh.new()
    post = [(z / 20 * 1.72 - 0.05, 0.062 - 0.006 * z / 20) for z in range(21)]
    lathe(bm, post, 12, disp=lambda a, z, r: r * (1 + 0.06 * nz(math.cos(a), math.sin(a), z * 4)), cap0=False)
    obj('post', bm, M_WOOD)
    # ลิ่มไม้ตอกโคนเสา 3 อัน
    bm = bmesh.new()
    for a in (35, 155, 275):
        a = math.radians(a)
        bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.LocRotScale(Vector((0.085 * math.cos(a), 0.085 * math.sin(a), 0.08)),
                              Matrix.Rotation(a, 3, 'Z') @ Matrix.Rotation(math.radians(-14), 3, 'Y'), Vector((0.035, 0.05, 0.16))))
    obj('wedges', bm, M_WOOD, smooth=False)
    # คานขวาง (ไม้สี่เหลี่ยมมนมุม) + หมุดเหล็ก
    bm = bmesh.new()
    lathe(bm, [(-0.66, 0.04), (-0.66, 0.046), (0.66, 0.046), (0.66, 0.04)], 8,
          disp=lambda a, z, r: r * (1 + 0.05 * nz(math.cos(a), math.sin(a), z * 5)),
          mat=Matrix.Translation((0, 0, 1.24)) @ Matrix.Rotation(math.pi / 2, 4, 'Y'))
    obj('beam', bm, M_WOODX)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=10, radius1=0.022, radius2=0.018, depth=0.03,
                          matrix=Matrix.LocRotScale(Vector((0, -0.062, 1.17)), Matrix.Rotation(math.pi / 2, 3, 'X'), Vector((1, 1, 1))))
    obj('nail', bm, M_IRON)

    # ---------- ลำตัวฟาง ----------
    BANDS = [0.80, 1.07, 1.36]
    Z0, Z1 = 0.70, 1.50

    def body_r(z):
        t = (z - Z0) / (Z1 - Z0)
        r = 0.175 + 0.075 * math.sin(math.pi * min(1, max(0, t)) ** 0.9)
        if t > 0.86: r *= 1 - (t - 0.86) / 0.14 * 0.55        # ไหล่ลาดเข้าคอ
        for b in BANDS: r -= 0.028 * math.exp(-((z - b) / 0.022) ** 2)
        return r

    def body_disp(a, z, r):
        ca, sa = math.cos(a), math.sin(a)
        lump = 0.06 * nz(ca * 1.6, sa * 1.6, z * 3.0)                              # ก้อนฟางไม่เรียบ
        fib = 0.022 * nz(ca * 22, sa * 22, z * 1.2) + 0.012 * math.sin(a * 70 + 6 * nz(ca * 3, sa * 3, z * 2))  # เส้นใยตามแนวตั้ง
        return r * (1 + lump + fib)
    bm = bmesh.new()
    prof = [(Z0 + (Z1 - Z0) * i / 90, 0) for i in range(91)]
    prof = [(z, body_r(z)) for z, _ in prof]
    lathe(bm, prof, 160, disp=body_disp)
    obj('body', bm, M_STRAW_Z)

    # ชายฟางด้านล่าง (บานออกใต้เชือกเส้นล่าง)
    bm = bmesh.new()
    lathe(bm, [(0.80, 0.16), (0.74, 0.19), (0.68, 0.215), (0.63, 0.235)], 120,
          disp=lambda a, z, r: r * (1 + 0.05 * nz(math.cos(a) * 2, math.sin(a) * 2, 1) + 0.03 * math.sin(a * 60)), cap0=False, cap1=False)
    obj('skirt', bm, M_STRAW_Z)

    # เชือกพัน
    bm = bmesh.new()
    for b in BANDS:
        rope_ring(bm, body_r(b) + 0.004, 0.013, Matrix.Translation((0, 0, b)), wob=0.008)
    # คอ
    rope_ring(bm, 0.062, 0.012, Matrix.Translation((0, 0, 1.535)), wob=0.004)
    obj('ropes', bm, M_ROPE)

    # ---------- แขนฟาง (พันรอบคาน) ----------
    for sx in (-1, 1):
        def arm_r(x):
            t = (x - 0.16) / 0.40
            r = 0.062 + 0.012 * math.sin(math.pi * t) + (0.03 * ((t - 0.86) / 0.14) if t > 0.86 else 0)
            for b in (0.24, 0.47): r -= 0.014 * math.exp(-((x - b) / 0.015) ** 2)
            return r
        prof = [(0.16 + 0.40 * i / 40, 0) for i in range(41)]
        prof = [(x, arm_r(x)) for x, _ in prof]
        bm = bmesh.new()
        m = Matrix.Translation((0, 0, 1.24)) @ Matrix.Rotation(sx * math.pi / 2, 4, 'Y')
        lathe(bm, prof, 64, disp=lambda a, x, r: r * (1 + 0.05 * nz(math.cos(a) * 1.5, math.sin(a) * 1.5, x * 4 + sx) + 0.03 * math.sin(a * 36)), mat=m, cap0=False)
        obj(f'arm{sx}', bm, M_STRAW_X)
        bm = bmesh.new()
        for b in (0.24, 0.47):
            rope_ring(bm, arm_r(b) + 0.003, 0.009, m @ Matrix.Translation((0, 0, b)), seg=48)
        obj(f'armrope{sx}', bm, M_ROPE)

    # ---------- หัวกระสอบป่าน ----------
    HZ, HR = 1.68, 0.15
    bm = bmesh.new()
    prof = []
    for i in range(41):
        t = i / 40; ph = math.pi * t
        z = HZ - 0.14 * math.cos(ph) * (1.02 if t < 0.5 else 0.9)
        r = HR * math.sin(ph) ** 0.75
        if t < 0.2: r = max(r, 0.07 * (1 - t / 0.2) + r * t / 0.2)          # คอกระสอบรวบ
        prof.append((z, r))
    prof = [(1.50, 0.075), (1.53, 0.06)] + [p for p in prof if p[0] > 1.545]
    lathe(bm, prof, 96, disp=lambda a, z, r: r * (1 + 0.05 * nz(math.cos(a) * 2, math.sin(a) * 2, z * 4)
                                                 + (0.12 * math.sin(a * 14) * max(0, 1 - (z - 1.52) / 0.07) if z < 1.6 else 0)))
    obj('head', bm, M_BURLAP)
    # ใบหน้า: ตาไขว้ (X) สองข้าง + ปากเย็บ วาดด้วยสีเข้ม บนผิวด้านหน้า (-Y)
    def on_head(u, v, off=0.011):
        """u = มุมจากด้านหน้า (เรเดียน, + = ขวาของหุ่น = ซ้ายของจอ), v = ความสูงเหนือ HZ"""
        a = -math.pi / 2 + u
        rr = math.sqrt(max(1e-6, HR ** 2 - v ** 2 * (HR / 0.14) ** 2)) + off
        return Vector((rr * math.cos(a), rr * math.sin(a), HZ + v))
    bm = bmesh.new()
    def stroke(p0, p1, w=0.008, segs=6):
        (u0, v0), (u1, v1) = p0, p1
        pts = [on_head(u0 + (u1 - u0) * k / segs, v0 + (v1 - v0) * k / segs) for k in range(segs + 1)]
        prev = None
        for k, p in enumerate(pts):
            n = (p - Vector((0, 0, HZ))).normalized()
            d = (pts[min(k + 1, segs)] - pts[max(k - 1, 0)]).normalized()
            s = d.cross(n).normalized() * w
            cur = (bm.verts.new(p + s), bm.verts.new(p - s))
            if prev: bm.faces.new((prev[0], prev[1], cur[1], cur[0]))
            prev = cur
    for ex in (-0.38, 0.38):
        stroke((ex - 0.2, 0.06), (ex + 0.2, -0.025), w=0.011); stroke((ex - 0.2, -0.025), (ex + 0.2, 0.06), w=0.011)
    stroke((-0.42, -0.07), (0.42, -0.07), w=0.008, segs=10)
    for k in range(5):
        u = -0.32 + k * 0.16; stroke((u, -0.045), (u, -0.095), w=0.006, segs=3)
    obj('face', bm, M_INK)

    # ---------- เป้าสีแดงบนอก (ทาสีบนแผ่นป่านที่ตอกหมุดไว้) ----------
    TZ = 1.10
    def patch(bm, rad, R, segs=48, rings=8):
        cen = []
        def P(rho, phi):
            u, v = rho * math.cos(phi), rho * math.sin(phi)
            a = -math.pi / 2 + u / R
            return Vector((R * math.cos(a), R * math.sin(a), TZ + v))
        c = bm.verts.new(P(0, 0)); prev = None
        for i in range(1, rings + 1):
            cur = [bm.verts.new(P(rad * i / rings, j / segs * 2 * math.pi)) for j in range(segs)]
            if prev is None:
                for j in range(segs): bm.faces.new((c, cur[j], cur[(j + 1) % segs]))
            else:
                for j in range(segs): bm.faces.new((prev[j], cur[j], cur[(j + 1) % segs], prev[(j + 1) % segs]))
            prev = cur
    Rb = max(body_r(TZ + dz) * (1 + 0.1) for dz in (-0.12, 0, 0.12)) + 0.006
    bm = bmesh.new(); patch(bm, 0.135, Rb); obj('patch', bm, M_BURLAP)
    for i, (rad, mm) in enumerate([(0.105, M_RED), (0.078, M_CREAM), (0.052, M_RED), (0.026, M_CREAM), (0.012, M_RED)]):
        bm = bmesh.new(); patch(bm, rad, Rb + 0.003 + i * 0.0015, segs=40, rings=4); obj(f'ring{i}', bm, mm)
    # หมุดตอกแผ่นเป้า 4 มุม
    bm = bmesh.new()
    for ang in (45, 135, 225, 315):
        u, v = 0.115 * math.cos(math.radians(ang)), 0.115 * math.sin(math.radians(ang))
        a = -math.pi / 2 + u / Rb
        bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.011,
                                   matrix=Matrix.Translation(((Rb + 0.004) * math.cos(a), (Rb + 0.004) * math.sin(a), TZ + v)))
    obj('tacks', bm, M_IRON)
    # รอยฟัน/รอยแทงบนเป้า (ฟางทะลักออกมา)
    stab = [(0.03, 0.05), (-0.06, -0.02), (0.07, -0.07)]

    # ลูกธนูปักคาลำตัว (ร่องรอยการฝึก)
    def arrow(base, d, L=0.5):
        d = Vector(d).normalized(); base = Vector(base)
        bm = bmesh.new()
        q = Vector((0, 0, 1)).rotation_difference(d).to_matrix().to_4x4()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.008, radius2=0.008, depth=L, matrix=Matrix.Translation(base + d * L / 2) @ q)
        obj('shaft', bm, M_WOOD)
        bm = bmesh.new(); side = d.cross(Vector((0, 0, 1))).normalized(); up = side.cross(d).normalized()
        for k in range(3):
            ang = k * 2 * math.pi / 3 + 0.4; n = side * math.cos(ang) + up * math.sin(ang)
            p0 = base + d * (L - 0.13); p1 = base + d * (L - 0.01)
            vs = [bm.verts.new(v) for v in (p0, p1, p1 + n * 0.035, p0 + d * 0.04 + n * 0.03)]
            bm.faces.new(vs)
        o = obj('fletch', bm, M_RED); o.data.materials.append(M_CREAM)
        for i, pg in enumerate(o.data.polygons): pg.material_index = i % 2
    arrow((0.12, -0.17, 1.24), (0.55, -0.75, 0.35), 0.48)

    # ---------- ฟางหลุดลุ่ย ----------
    bms = [bmesh.new() for _ in STRAND]
    def S(p, d, L, w=0.0045): strand(random.choice(bms), p, d, L, w)
    # ชายล่าง
    for i in range(260):
        a = random.random() * 2 * math.pi; r = 0.17 + random.random() * 0.05; z = 0.66 + random.random() * 0.12
        ow = 0.35 + random.random() * 0.5
        S((r * math.cos(a), r * math.sin(a), z), (math.cos(a) * ow, math.sin(a) * ow, -1), 0.08 + random.random() * 0.14)
    # ปลายแขน (บานออก)
    for sx in (-1, 1):
        for i in range(90):
            a = random.random() * 2 * math.pi; rr_ = 0.06 * math.sqrt(random.random())
            sp = 0.25 + random.random() * 0.8
            S((sx * (0.53 + random.random() * 0.02), rr_ * math.cos(a), 1.24 + rr_ * math.sin(a)),
              (sx * 1.0, math.cos(a) * sp, math.sin(a) * sp - 0.25), 0.06 + random.random() * 0.12)
        for i in range(30):                               # ใต้แขนห้อยลง
            x = sx * (0.18 + random.random() * 0.33); a = random.uniform(-2.6, -0.5)
            S((x, 0.065 * math.cos(a), 1.24 + 0.065 * math.sin(a)), (sx * random.uniform(-0.3, 0.3), random.uniform(-0.4, 0.4), -1), 0.04 + random.random() * 0.08)
    # ตามลำตัว (เส้นที่หลุดออกจากมัด)
    for i in range(110):
        a = random.random() * 2 * math.pi; z = Z0 + 0.04 + random.random() * (Z1 - Z0 - 0.1)
        r = body_r(z) * 1.02
        tilt = random.choice((-1, 1))
        S((r * math.cos(a), r * math.sin(a), z), (math.cos(a) * 0.35 + random.uniform(-0.3, 0.3), math.sin(a) * 0.35 + random.uniform(-0.3, 0.3), tilt), 0.05 + random.random() * 0.09)
    # ฟางทะลักจากรอยแทงบนเป้า
    for (u, v) in stab:
        a0 = -math.pi / 2 + u / Rb
        for i in range(9):
            S((Rb * math.cos(a0), Rb * math.sin(a0), TZ + v), (math.cos(a0) + random.uniform(-0.6, 0.6), math.sin(a0) + random.uniform(-0.3, 0.3), random.uniform(-0.6, 0.7)), 0.03 + random.random() * 0.05, 0.004)
    # จุกฟางบนกระหม่อม + ที่คอ
    for i in range(40):
        a = random.random() * 2 * math.pi; r = 0.03 * random.random()
        S((r * math.cos(a), r * math.sin(a), HZ + 0.12), (math.cos(a) * random.uniform(0.2, 0.9), math.sin(a) * random.uniform(0.2, 0.9), 1), 0.05 + random.random() * 0.08)
    for i in range(40):
        a = random.random() * 2 * math.pi
        S((0.07 * math.cos(a), 0.07 * math.sin(a), 1.545), (math.cos(a), math.sin(a), random.uniform(-0.3, 0.6)), 0.04 + random.random() * 0.06)
    # ฟางร่วงบนพื้น
    for i in range(40):
        a = random.random() * 2 * math.pi; r = 0.1 + random.random() * 0.22
        z = 0.07 * max(0, 1 - ((r - 0.06) / 0.27) ** 1.6) + 0.006
        d = random.random() * 2 * math.pi
        S((r * math.cos(a), r * math.sin(a), z), (math.cos(d), math.sin(d), -0.05), 0.06 + random.random() * 0.1)
    for b, m in zip(bms, STRAND): obj('strands_' + m.name, b, m)

    # ---------- แสง ----------
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 4.2; sun.angle = math.radians(6); sun.color = (1.0, 0.93, 0.80)
    so = bpy.data.objects.new('sun', sun); sc.collection.objects.link(so)
    so.rotation_euler = (math.radians(42), 0, math.radians(-135))   # แสงจากซ้ายบน เหมือนทั้งเกม
    rim = bpy.data.lights.new('rim', 'SUN'); rim.energy = 1.2; rim.angle = math.radians(10); rim.color = (1.0, 0.82, 0.6)
    ro = bpy.data.objects.new('rim', rim); sc.collection.objects.link(ro)
    ro.rotation_euler = (math.radians(70), 0, math.radians(-40))    # ขอบแสงด้านหลังขวา (ให้ตัวหุ่นลอยออกจากพื้น)
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.62, 0.68, 0.80, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.55

    # ---------- กล้อง ----------
    th, d, u = cam_basis()
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = ORTHO; cam.sensor_fit = 'HORIZONTAL'; cam.clip_end = 100
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
    co.rotation_euler = (th, 0, 0)
    k = (ANCHOR_ROW - 0.5) * H / (W / ORTHO)
    co.location = -Vector(d) * 20 + Vector(u) * k
    sc.render.resolution_x = W; sc.render.resolution_y = H; sc.render.resolution_percentage = 100
    sc.render.film_transparent = True
    sc.render.engine = 'CYCLES'; sc.cycles.samples = samples; sc.cycles.device = 'CPU'
    try: sc.cycles.use_denoising = True
    except Exception: pass
    try: sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Punchy'
    except Exception: sc.view_settings.view_transform = 'Filmic'
    sc.view_settings.exposure = 0.25
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.filepath = out
    bpy.ops.render.render(write_still=True)
    print('เรนเดอร์ →', out)


def install(src, scale=0.5):
    """ย่อ + ตัดขอบใส + เส้นขอบเข้มบาง ๆ (เหมือนภาพวาดในเกม) → assets/prop_dummy_straw.webp + manifest
    พิมพ์ค่า anchor (โคนเสา) และแนวตัดฐานเป็นสัดส่วนของภาพ สำหรับ DUMMY_IMG ใน js/sprites.js"""
    from PIL import Image, ImageFilter, ImageEnhance
    sys.path.insert(0, os.path.join(ROOT, 'tools'))
    im = Image.open(src).convert('RGBA')
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    # สีอุ่นขึ้นเล็กน้อยให้เข้ากับภาพวาด
    rgb = ImageEnhance.Color(im.convert('RGB')).enhance(1.35)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.08)
    rgb = ImageEnhance.Brightness(rgb).enhance(1.06)
    a = im.getchannel('A')
    im = Image.merge('RGBA', (*rgb.split(), a))
    # เส้นขอบ: ขยาย alpha 1 พิกเซล วาดสีน้ำตาลเข้มไว้ใต้ภาพ
    edge = a.point(lambda v: 255 if v > 40 else 0).filter(ImageFilter.MaxFilter(5))
    edge = edge.filter(ImageFilter.GaussianBlur(0.4))
    ol = Image.new('RGBA', im.size, (34, 20, 10, 0)); ol.putalpha(edge.point(lambda v: int(v * 0.9)))
    ol.alpha_composite(im); im = ol
    # ตัดขอบใส (เผื่อ 2 px)
    l, t, r, b = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    l, t, r, b = max(0, l - 2), max(0, t - 2), min(im.width, r + 2), min(im.height, b + 2)
    im = im.crop((l, t, r, b))
    ax, ay = project((0, 0, 0)); cx, cy = project((0, 0, CUT_Z))
    ax, ay, cy = ax * scale - l, ay * scale - t, cy * scale - t
    dst = os.path.join(ROOT, 'assets', 'prop_dummy_straw.webp')
    im.save(dst, 'WEBP', quality=92, method=6)
    from slice_sheet import manifest
    manifest()
    print('ติดตั้ง →', dst, im.size)
    print('DUMMY_IMG =', json.dumps({'ax': round(ax / im.width, 4), 'ay': round(ay / im.height, 4), 'cut': round(cy / im.height, 4)}))


if __name__ == '__main__':
    a = sys.argv
    if '--k' in a: VIEW_K = float(a[a.index('--k') + 1])
    if '--install' in a: install(a[a.index('--install') + 1])
    else:
        build(int(a[a.index('--samples') + 1]) if '--samples' in a else 96, a[a.index('--out') + 1] if '--out' in a else '/tmp/dummy.png')
