"""โคลอสเซียม 3D สำหรับลานประลอง PvP (MAP_DEFS.arena 34×34) — โมเดลด้วย bpy แล้วเรนเดอร์เป็นภาพพื้นของแมพ

หน่วย: 1 ช่องในเกม = 1 เมตร • กลางลาน = จุด (17, 17) ของแมพ = (0, 0, 0) ใน Blender (แกน Y ของ Blender = ทิศเหนือ)
กล้อง: ออร์โธเอียง acos(0.76) จากแนวดิ่ง = มุมเดียวกับกล้องในเกม (R.K = 0.76)
→ หลังเรนเดอร์ ยืดแนวตั้ง ×1/0.76 ให้เป็นภาพพื้น 1360×1360 แล้วเกมบีบกลับ ×0.76 ตอนวาด = ได้มุมมอง 3D ตรงกับกล้องพอดี
จุดบนพื้น (z=0) ตรงช่องในเกมทุกจุด (ทางเดิน/การชนไม่เปลี่ยน — maps.js genArena)

ใช้:  /tmp/bvenv/bin/python tools/arena3d.py [--samples 64] [--out /tmp/arena.png]
แล้ว: python3 tools/arena3d.py --install /tmp/arena.png   (ยืดแนวตั้ง + บันทึก assets/arena_ground.webp + อัปเดต manifest)
"""
import math, os, sys, random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAPW = 34
K = 0.76
R0 = MAPW / 2 - 2.8          # รัศมีลานทราย (ตรงกับ maps.js genArena)
# คบเพลิง 10 ต้น: ทุก 30° เว้นช่วงประตูใต้ (ตรงกับ maps.js genArena → this.torches)
TORCH_ANGLES = [math.radians(d) for d in range(0, 360, 30) if abs(((d - 270 + 180) % 360) - 180) > 20]
TORCH_TOP = 0.7 + 1.3 + 0.22   # ความสูงปากชาม (เมตร)
PX = 40                      # พิกเซลต่อช่อง (TILE)


def install(src):
    from PIL import Image
    sys.path.insert(0, os.path.join(ROOT, 'tools'))
    im = Image.open(src).convert('RGB')
    im = im.resize((MAPW * PX, MAPW * PX), Image.LANCZOS)
    dst = os.path.join(ROOT, 'assets', 'arena_ground.webp')
    im.save(dst, 'WEBP', quality=90, method=6)
    from slice_sheet import manifest
    manifest()
    print('ติดตั้ง →', dst, im.size)


def build(samples, out):
    import bpy, bmesh
    from mathutils import Vector
    random.seed(7)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene

    # ---------- วัสดุ ----------
    def mat(name, col, rough=0.8, metal=0.0, noise=0.0, bump=0.0, scale=6.0):
        m = bpy.data.materials.new(name); m.use_nodes = True
        nt = m.node_tree; b = nt.nodes['Principled BSDF']
        b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
        if noise or bump:
            tex = nt.nodes.new('ShaderNodeTexNoise'); tex.inputs['Scale'].default_value = scale; tex.inputs['Detail'].default_value = 8
            if noise:
                ramp = nt.nodes.new('ShaderNodeValToRGB')
                ramp.color_ramp.elements[0].color = (*[c * (1 - noise) for c in col], 1)
                ramp.color_ramp.elements[1].color = (*[min(1, c * (1 + noise * 0.6)) for c in col], 1)
                nt.links.new(tex.outputs['Fac'], ramp.inputs['Fac']); nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
            else:
                b.inputs['Base Color'].default_value = (*col, 1)
            if bump:
                bn = nt.nodes.new('ShaderNodeBump'); bn.inputs['Strength'].default_value = bump
                nt.links.new(tex.outputs['Fac'], bn.inputs['Height']); nt.links.new(bn.outputs['Normal'], b.inputs['Normal'])
        else:
            b.inputs['Base Color'].default_value = (*col, 1)
        return m

    M_SAND = mat('sand', (0.82, 0.56, 0.26), 0.95, noise=0.2, bump=0.3, scale=14)
    M_STONE = mat('stone', (0.62, 0.52, 0.40), 0.85, noise=0.25, bump=0.4, scale=3)
    M_STONE2 = mat('stone2', (0.48, 0.42, 0.35), 0.85, noise=0.22, bump=0.4, scale=3)
    M_DARK = mat('dark', (0.06, 0.045, 0.035), 0.9)
    M_GOLD = mat('gold', (0.85, 0.62, 0.22), 0.3, metal=1.0)
    M_RED = mat('red', (0.55, 0.06, 0.04), 0.7)
    M_VALK = mat('valknut', (0.42, 0.08, 0.05), 0.8)
    CROWD = [mat(f'c{i}', c, 0.7) for i, c in enumerate([(0.7, 0.12, 0.1), (0.12, 0.35, 0.7), (0.85, 0.7, 0.12), (0.15, 0.5, 0.2), (0.45, 0.18, 0.55), (0.85, 0.85, 0.82), (0.8, 0.4, 0.1), (0.15, 0.18, 0.25)])]
    M_SKIN = mat('skin', (0.85, 0.66, 0.5), 0.6)

    def obj(name, bm, material):
        me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new(name, me); sc.collection.objects.link(o)
        o.data.materials.append(material)
        for p in o.data.polygons: p.use_smooth = False
        return o

    GATE = math.radians(-90)       # ทางเข้าด้านใต้ (ประตูอยู่ที่ช่อง (17, 32))

    def in_gate(a, r, half=1.45):
        d = (a - GATE + math.pi) % (2 * math.pi) - math.pi
        return abs(d) * r < half

    # วงแหวนแบบขั้น (ผิวบน + หน้าตั้งด้านใน) เว้นช่องประตู
    def ring(bm, r0, r1, z0, z1, seg=192, gate=True, outer_face=False):
        for i in range(seg):
            a0 = i / seg * 2 * math.pi; a1 = (i + 1) / seg * 2 * math.pi; am = (a0 + a1) / 2
            if gate and in_gate(am, (r0 + r1) / 2): continue
            p = lambda r, a, z: bm.verts.new((r * math.cos(a), r * math.sin(a), z))
            t = [p(r0, a0, z1), p(r1, a0, z1), p(r1, a1, z1), p(r0, a1, z1)]; bm.faces.new(t)          # ผิวบน
            f = [p(r0, a0, z0), p(r0, a0, z1), p(r0, a1, z1), p(r0, a1, z0)]; bm.faces.new(f)          # หน้าด้านใน (หันเข้ากลาง)
            if outer_face:
                o = [p(r1, a1, z0), p(r1, a1, z1), p(r1, a0, z1), p(r1, a0, z0)]; bm.faces.new(o)

    # ---------- พื้นทราย ----------
    bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, radius=R0 + 0.05, segments=160)
    sand = obj('sand', bm, M_SAND)
    M_RAKE = mat('rake', (0.62, 0.40, 0.18), 0.95)
    bm = bmesh.new()
    rr_ = 2.6
    while rr_ < R0 - 0.6:
        ring(bm, rr_, rr_ + 0.05, 0.0, 0.004, seg=160, gate=False); rr_ += 0.6
    obj('rake', bm, M_RAKE)
    # ทางเข้าบนพื้น (ทรายต่อไปถึงขอบภาพ)
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co.x *= 2.6; v.co.y = v.co.y * 12 - 6 - R0 + 1.0; v.co.z = v.co.z * 0.02 - 0.01
    obj('gatefloor', bm, M_SAND)

    # ---------- กำแพงโพเดียม + ขอบทอง ----------
    bm = bmesh.new(); ring(bm, R0, R0 + 0.55, 0, 0.7); obj('podium', bm, M_STONE2)
    bm = bmesh.new(); ring(bm, R0 - 0.02, R0 + 0.08, 0.7, 0.76); obj('trim', bm, M_GOLD)

    # ---------- อัฒจันทร์ ----------
    tiers = 12; rr = R0 + 0.55
    for i in range(tiers):
        r0 = rr + i * 0.9; z = 0.7 + 0.42 * (i + 1)
        bm = bmesh.new(); ring(bm, r0, r0 + 0.9, 0, z); obj(f'tier{i}', bm, M_STONE if i % 2 else M_STONE2)
    rmax = rr + tiers * 0.9
    bm = bmesh.new(); ring(bm, rmax, rmax + 3, 0, 0.7 + 0.42 * tiers + 1.6, outer_face=True); obj('outer', bm, M_STONE2)
    # ทางเดินระหว่างที่นั่ง (aisle) แถบมืดตามแนวรัศมี
    bm = bmesh.new()
    AIS = [i * 2 * math.pi / 20 for i in range(20)]
    for a in AIS:
        if in_gate(a, rr + 3, 3.5): continue
        for i in range(tiers):
            r0 = rr + i * 0.9; z = 0.7 + 0.42 * (i + 1) + 0.005
            c, s_ = math.cos(a), math.sin(a); w = 0.32
            for (r_, ww) in [(r0, -w), (r0 + 0.9, -w), (r0 + 0.9, w), (r0, w)]: pass
            vs = [bm.verts.new((r_ * c - ww * s_, r_ * s_ + ww * c, z)) for r_, ww in [(r0, -w), (r0 + 0.9, -w), (r0 + 0.9, w), (r0, w)]]
            bm.faces.new(vs)
    obj('aisles', bm, M_STONE2)

    # ---------- ผู้ชม (รวมเป็นก้อนตามสี) ----------
    bms = [bmesh.new() for _ in CROWD]; heads = bmesh.new()
    for i in range(tiers):
        r = rr + i * 0.9 + 0.55; z = 0.7 + 0.42 * (i + 1); n = int(2 * math.pi * r / 0.42)
        for k in range(n):
            a = k / n * 2 * math.pi + random.random() * 0.02
            if in_gate(a, r, 2.2) or min(abs((a - x + math.pi) % (2 * math.pi) - math.pi) for x in AIS) * r < 0.45: continue
            if random.random() > 0.78: continue
            x, y = r * math.cos(a), r * math.sin(a)
            b = bms[random.randrange(len(CROWD))]
            bmesh.ops.create_cone(b, cap_ends=True, segments=6, radius1=0.15, radius2=0.11, depth=0.34, matrix=__import__('mathutils').Matrix.Translation((x, y, z + 0.17)))
            bmesh.ops.create_uvsphere(heads, u_segments=6, v_segments=4, radius=0.09, matrix=__import__('mathutils').Matrix.Translation((x, y, z + 0.44)))
    for b, m in zip(bms, CROWD): obj('crowd_' + m.name, b, m)
    obj('heads', heads, M_SKIN)

    # ---------- อุโมงค์ทางเข้า (ด้านใต้) ----------
    bm = bmesh.new()
    for sx in (-1, 1):
        bmesh.ops.create_cube(bm, size=1.0, matrix=__import__('mathutils').Matrix.LocRotScale(Vector((sx * 1.75, -R0 - 6.5, 1.6)), None, Vector((0.7, 13, 3.2))))
    obj('gatewalls', bm, M_STONE)
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0, matrix=__import__('mathutils').Matrix.LocRotScale(Vector((0, -R0 - 0.9, 2.1)), None, Vector((4.2, 1.0, 0.6))))
    obj('lintel', bm, M_STONE2)
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0, matrix=__import__('mathutils').Matrix.LocRotScale(Vector((0, -R0 - 7, 0.01)), None, Vector((2.8, 12, 0.02))))
    obj('tunnel', bm, M_DARK)

    # ---------- เสาธง ----------
    bm = bmesh.new(); bmf = bmesh.new()
    for i in range(8):
        a = i / 8 * 2 * math.pi + math.pi / 8; x, y = (R0 + 0.3) * math.cos(a), (R0 + 0.3) * math.sin(a)
        bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.07, radius2=0.05, depth=3.0, matrix=__import__('mathutils').Matrix.Translation((x, y, 1.5 + 0.7)))
        tx, ty = -math.sin(a), math.cos(a)
        vs = [bmf.verts.new(v) for v in [(x, y, 3.6), (x + tx * 1.1, y + ty * 1.1, 3.45), (x + tx * 1.1, y + ty * 1.1, 2.7), (x, y, 2.55)]]
        bmf.faces.new(vs)
    obj('poles', bm, M_GOLD); obj('flags', bmf, M_RED)

    # ---------- คบเพลิง (ตัวเสา+ชามเหล็ก — เปลวไฟวาดเคลื่อนไหวในเกม: maps.js arenaTorches) ----------
    bm = bmesh.new(); bmb = bmesh.new()
    for a in TORCH_ANGLES:
        x, y = (R0 + 0.28) * math.cos(a), (R0 + 0.28) * math.sin(a)
        bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.09, radius2=0.06, depth=1.3, matrix=__import__('mathutils').Matrix.Translation((x, y, 0.7 + 0.65)))
        bmesh.ops.create_cone(bmb, cap_ends=True, segments=10, radius1=0.08, radius2=0.26, depth=0.22, matrix=__import__('mathutils').Matrix.Translation((x, y, 0.7 + 1.3 + 0.11)))
    obj('torch_poles', bm, M_STONE2); obj('torch_bowls', bmb, M_GOLD)

    # ---------- ตราวาลค์นัตบนพื้น ----------
    bm = bmesh.new(); s = 1.6
    for k in range(3):
        a = k * 2 * math.pi / 3; ox, oy = math.cos(a + math.pi / 2) * s * 0.35, math.sin(a + math.pi / 2) * s * 0.35
        pts = [(ox + math.cos(math.pi / 2 + j * 2 * math.pi / 3) * s, oy + math.sin(math.pi / 2 + j * 2 * math.pi / 3) * s) for j in range(3)]
        for j in range(3):
            (x0, y0), (x1, y1) = pts[j], pts[(j + 1) % 3]; L = math.hypot(x1 - x0, y1 - y0)
            bmesh.ops.create_cube(bm, size=1.0, matrix=__import__('mathutils').Matrix.LocRotScale(Vector(((x0 + x1) / 2, (y0 + y1) / 2, 0.015 + k * 0.006 + j * 0.002)), __import__('mathutils').Euler((0, 0, math.atan2(y1 - y0, x1 - x0))).to_quaternion(), Vector((L, 0.13, 0.02))))
    obj('valknut', bm, M_VALK)

    # ---------- แสง ----------
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 3.0; sun.angle = math.radians(3); sun.color = (1.0, 0.95, 0.86)
    so = bpy.data.objects.new('sun', sun); sc.collection.objects.link(so)
    so.rotation_euler = (math.radians(42), 0, math.radians(135))   # แสงจากซ้ายบน (ตะวันตกเฉียงเหนือ) เหมือนทั้งเกม
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.62, 0.75, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.4

    # ---------- กล้อง (ตรงกับกล้องในเกม) ----------
    th = math.acos(K)
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = MAPW; cam.sensor_fit = 'HORIZONTAL'; cam.clip_end = 400
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
    co.rotation_euler = (th, 0, 0)
    d = Vector((0, math.sin(th), -math.cos(th)))
    co.location = -d * 80
    sc.render.resolution_x = MAPW * PX; sc.render.resolution_y = round(MAPW * PX * K); sc.render.resolution_percentage = 100
    sc.render.engine = 'CYCLES'; sc.cycles.samples = samples; sc.cycles.device = 'CPU'
    try: sc.cycles.use_denoising = True
    except Exception: pass
    try: sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Punchy'
    except Exception: sc.view_settings.view_transform = 'Filmic'
    sc.view_settings.exposure = -0.15
    sc.render.filepath = out
    bpy.ops.render.render(write_still=True)
    print('เรนเดอร์ →', out)


if __name__ == '__main__':
    a = sys.argv
    if '--install' in a: install(a[a.index('--install') + 1])
    else:
        build(int(a[a.index('--samples') + 1]) if '--samples' in a else 64, a[a.index('--out') + 1] if '--out' in a else '/tmp/arena.png')
