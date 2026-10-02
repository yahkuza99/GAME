"""ซุ้มประตูวาร์ป 3D ทุกประตูของโลก (docs/RENDER3D_PLAN.md ข้อ #5) — โมเดลด้วย bpy แล้วอบเป็นสไปรต์ 2D แบบ B

ซุ้มแบบเดียว (เสา 2 ต้นบนฐาน 2 ขั้น + โค้ง 7 ก้อนสลักรูนเป็นวง + เหรียญวงแหวนรูนที่หินหลัก) สูง ~3.3 ม. ช่องกว้าง 2.9 ม.
วัสดุ 3 ชุดตามชนิดของ "แมพที่ประตูตั้งอยู่":
  town   หินอ่อนขาว ขอบ/แถบทอง รูนเรืองฟ้า (เข้ากับเมืองหินอ่อน js/townmap.js)
  field  หินผุมีมอส ลายถักนอร์สสลักนูนบนหน้าเสา รากไม้เลื้อย/ห้อย เฟิร์นที่โคน รูนเรืองเขียวอมฟ้าจาง ๆ
  cave   หินบะซอลต์/ออบซิเดียนดำเงา ฝังคริสตัลม่วงเรืองแสง (กระจุกบนหัวเสา + แถบฝังหน้าเสา)
4 แบบตามขอบแมพ:
  s  หันหน้าหากล้อง (ประตูขอบใต้) — ภาพเดียว เรียงความลึกที่ขอบหน้าฐาน
  n  ขอบเหนือ: กล้องเลื่อนเหนือ y=0 ไม่ได้ (ของสูงโดนตัดหัว) → เสาหินรูนเตี้ย 2 ต้น + ธรณีประตูเตี้ย (ไม่มีโค้ง)
  e/w  ขอบตะวันออก/ตก: ซุ้มทอดตามแนวขอบ หมุน 27.25° ให้ช่องประตูหันเข้าหาในแมพและตรงกับม่านวาร์ปเฉียงของ Sprites.drawPortal
       แยก 2 ภาพ: ชิ้นหลัง (เสาเหนือ + ครึ่งโค้ง + หินหลัก) / ชิ้นหน้า (เสาใต้ + ครึ่งโค้ง) เรียงความลึกคนละ y → เดินระหว่างเสาได้ถูกต้อง
ทุกแบบมีภาพเงาบนพื้นแยก (_sh — shadow catcher) วาดใต้ทุกอย่าง ตัวละครเดินทับเงาได้

กล้อง = กล้องเกม (ออร์โธ เอียง acos(0.76) จากแนวดิ่ง yaw 0) 80 px/ม. ในไฟล์ (เกมวาด ×0.5 = 40 px/ม.) เรนเดอร์ ×2 แล้วย่อ
แสงซ้ายบน (sun z = -135° → เงาตกขวาล่าง เหมือนทั้งเกม) • เส้นขอบ Freestyle น้ำตาลเข้ม • เพิ่มความอิ่มสีตอนติดตั้ง • พื้นหลังโปร่ง
จุดยึดของทุกภาพ = กลางวาร์ปบนพื้น (portal x+0.5, y+0.5) • ช่องประตูส่งเป็นรูปหลายเหลี่ยม (px) ให้เกมตัดม่านวาร์ปให้อยู่ในช่อง

ใช้:
  /tmp/bvenv/bin/python tools/gate3d.py [--only town:s,cave:e] [--samples 32] [--preview] [--out /tmp/gate3d]
  python3 tools/gate3d.py --install /tmp/gate3d       (ย่อ/ตัดขอบ/บันทึก webp → assets/bake_gate_*.webp, manifest, GATE_BAKE ใน js/maps.js)
"""
import math, os, sys, json, random, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
K = 0.76; PX = 40; GPX = 80; SS = 2
TH = math.acos(K)
THEMES = ('town', 'field', 'cave')
VARIANTS = ('s', 'n', 'e', 'w')
SIDE_YAW = math.atan(0.42 / (0.62 / K))   # มุมซุ้มด้านข้างจากแนวเหนือ-ใต้ = มุมม่านเฉียงใน drawPortal (0.42, 0.62) → 27.25°
# ขนาด (ม.) — พิกัดท้องถิ่น: กลางช่องประตูบนพื้น = (0,0,0), ซุ้มทอดตามแกน x, -y = ใต้ (หากล้อง)
AI, BI = 1.45, 0.55          # ช่องใน: ครึ่งกว้าง, ความสูงโค้ง
AO, BO = 2.20, 1.00          # ขอบนอกของโค้ง
ZS = 2.20                    # ความสูงจุดเริ่มโค้ง (บนหัวเสา)
D = 0.36                     # ครึ่งความหนาเสา/โค้ง (แกน y)
PX0, PX1 = 1.45, 2.15        # เสา (ระยะ x จากกลาง)
GLOW = {'town': (0.30, 0.82, 1.0), 'field': (0.40, 1.0, 0.80), 'cave': (0.48, 0.14, 1.0)}
GLOW_JS = {'town': '120,220,255', 'field': '130,240,210', 'cave': '185,130,255'}


# ---------------------------------------------------------------- เก็บเรขาคณิตเป็นถัง (วัสดุ, ฝั่ง)
class Geo:
    """ถังเรขาคณิต: key = (วัสดุ, แท็ก) • แท็ก L = ฝั่ง -x (ชิ้นหน้าของซุ้มด้านข้าง) R = ฝั่ง +x (ชิ้นหลัง) C = กลาง (อยู่กับชิ้นหลัง)"""
    def __init__(self):
        self.b = {}; self.curves = []        # curves: (mat, tag, paths)

    def add(self, mat, tag, V, F):
        vv, ff = self.b.setdefault((mat, tag), ([], []))
        o = len(vv); vv.extend(V); ff.extend(tuple(i + o for i in f) for f in F)

    def box(self, mat, tag, x0, x1, y0, y1, z0, z1, amp=0.0, cuts=0, taper=1.0, bevel=0.0, seed=0.0):
        import bmesh
        from mathutils import noise, Vector
        bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=(x1 - x0, y1 - y0, z1 - z0), verts=bm.verts)
        if bevel > 0:   # ลบมุม (ขนาดจริง ม.) → ขอบหินอ่อนรับแสงเป็นเส้นสว่าง
            bmesh.ops.bevel(bm, geom=bm.verts[:] + bm.edges[:], offset=bevel, segments=2, affect='EDGES', profile=0.5)
        if cuts:
            bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=cuts, use_grid_fill=True)
        hx, hy, hz = (x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2
        V = []
        for v in bm.verts:
            u = v.co
            x = (x0 + x1) / 2 + u.x; y = (y0 + y1) / 2 + u.y; z = (z0 + z1) / 2 + u.z
            if taper != 1.0:
                t = 1 - (1 - taper) * (z - z0) / (z1 - z0)
                x = (x0 + x1) / 2 + u.x * t; y = (y0 + y1) / 2 + u.y * t
            if amp:
                n = noise.noise(Vector((x * 2.6 + 11 + seed, y * 2.6, z * 2.6))) * amp
                n += noise.noise(Vector((x * 7 + seed, y * 7 + 5, z * 7))) * amp * 0.35
                ex = abs(abs(u.x) - hx) < 1e-4; ey = abs(abs(u.y) - hy) < 1e-4; ez = abs(abs(u.z) - hz) < 1e-4
                x += n * (1 if u.x > 0 else -1) * ex; y += n * (1 if u.y > 0 else -1) * ey; z += n * 0.5 * ez
            V.append((x, y, z))
        F = [tuple(v.index for v in f.verts) for f in bm.faces]
        bm.free()
        self.add(mat, tag, V, F)

    def quad_face(self, mat, tag, pts):
        self.add(mat, tag, pts, [tuple(range(len(pts)))])

    def curve(self, mat, tag, paths):
        self.curves.append((mat, tag, paths))


RUNES = None


def glyph(G, mat, tag, gl, cx, cz, w, h, yface, rot=0.0, wd=0.05, out=1):
    """อักษรรูน (แถบเส้นแบน) บนระนาบ y = yface • rot = หมุนในระนาบ x-z (เรเดียน, 0 = ตั้งตรง) • out = ทิศหน้า (−1 ใต้ / +1 เหนือ) ให้หน้ากลับถูก"""
    cr, sr = math.cos(rot), math.sin(rot)
    def P(x, z): return (cx + x * cr - z * sr, cz + x * sr + z * cr)
    for (a, b) in RUNES[gl]:
        x0, z0 = (a[0] - 0.5) * w, (a[1] - 0.5) * h; x1, z1 = (b[0] - 0.5) * w, (b[1] - 0.5) * h
        L = math.hypot(x1 - x0, z1 - z0) + wd; ang = math.atan2(z1 - z0, x1 - x0)
        ux, uz = math.cos(ang), math.sin(ang); vx, vz = -uz, ux; mx, mz = (x0 + x1) / 2, (z0 + z1) / 2
        pts = []
        for (su, sv) in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            px, pz = P(mx + ux * su * L / 2 + vx * sv * wd / 2, mz + uz * su * L / 2 + vz * sv * wd / 2)
            pts.append((px, yface, pz))
        if out > 0: pts.reverse()
        G.quad_face(mat, tag, pts)


def shard(G, mat, tag, base, d, L, r, rnd):
    """คริสตัล 1 แท่ง: ปริซึมหกเหลี่ยมปลายแหลมสองด้าน ตามทิศ d"""
    from mathutils import Vector
    d = Vector(d).normalized(); a = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
    u = d.cross(a).normalized(); v = d.cross(u).normalized(); b = Vector(base)
    V = [tuple(b - d * L * 0.08)]
    ph = rnd.random()
    for t, rr in ((0.18, r), (0.78, r * 0.86)):
        for k in range(6):
            an = ph + k * math.pi / 3; V.append(tuple(b + d * L * t + (u * math.cos(an) + v * math.sin(an)) * rr))
    V.append(tuple(b + d * L))
    F = []
    for k in range(6):
        k1 = (k + 1) % 6
        F.append((0, 1 + k1, 1 + k)); F.append((1 + k, 1 + k1, 7 + k1, 7 + k)); F.append((7 + k, 7 + k1, 13))
    G.add(mat, tag, V, F)


# ---------------------------------------------------------------- ซุ้ม (ท้องถิ่น)
def build(theme, variant, rnd):
    import ridge3d as RG
    global RUNES
    RUNES = dict(RG.RUNES)
    RUNES.update({
        'f': [((0.2, 0), (0.2, 1)), ((0.2, 1), (0.85, 0.72)), ((0.2, 0.66), (0.85, 0.4))],
        'u': [((0.15, 0), (0.15, 1)), ((0.15, 1), (0.85, 0.7)), ((0.85, 0.7), (0.85, 0))],
        'r': [((0.2, 0), (0.2, 1)), ((0.2, 1), (0.8, 0.75)), ((0.8, 0.75), (0.2, 0.5)), ((0.2, 0.5), (0.8, 0))],
        'k': [((0.3, 0), (0.3, 1)), ((0.3, 0.55), (0.85, 0.95)), ((0.3, 0.55), (0.85, 0.15))],
        'ing': [((0.5, 0), (0.95, 0.5)), ((0.95, 0.5), (0.5, 1)), ((0.5, 1), (0.05, 0.5)), ((0.05, 0.5), (0.5, 0))],
        's': [((0.25, 1), (0.25, 0.55)), ((0.25, 0.55), (0.75, 0.45)), ((0.75, 0.45), (0.75, 0))],
    })
    G = Geo()
    town, field, cave = theme == 'town', theme == 'field', theme == 'cave'
    amp = 0.0 if town else (0.022 if field else 0.03)
    cuts = 0 if town else 3
    bev = 0.035 if town else 0.0
    stone = 'stone'; trim = 'trim'; rune = 'rune'
    side = variant in ('e', 'w')
    faces_y = (-1, 1)                                   # ลวดลายทั้งสองหน้า (ซุ้มด้านข้างเห็นหน้า "หลัง")
    T = lambda s: 'L' if s < 0 else 'R'
    words = (['f', 'u', 'th', 'o'], ['r', 'k', 'h', 'n']) if not cave else (['h', 'e', 'l', 'yr'], ['n', 'o', 't', 'd'])

    if variant == 'n':
        # ---- ขอบเหนือ: เสาหินรูนเตี้ย 2 ต้น + ธรณีประตูเตี้ยมีรูน (ไม่มีโค้ง — ยอดสูงโดนตัดเพราะกล้องเลื่อนเหนือขอบแมพไม่ได้)
        ox = 1.85; H1 = 1.05
        for s in (-1, 1):
            t = T(s); cx = s * ox
            G.box(stone, t, cx - 0.48, cx + 0.48, -0.48, 0.48, 0.0, 0.13, amp * 0.6, cuts, bevel=bev * 0.6, seed=s)
            G.box(stone, t, cx - 0.40, cx + 0.40, -0.40, 0.40, 0.13, 0.26, amp * 0.6, cuts, bevel=bev * 0.6, seed=s + 3)
            G.box(stone, t, cx - 0.30, cx + 0.30, -0.27, 0.27, 0.26, H1, amp, cuts, taper=0.82, bevel=bev, seed=s + 7)
            if town:
                G.box(trim, t, cx - 0.33, cx + 0.33, -0.30, 0.30, 0.26, 0.33, bevel=0.015)
                G.box(trim, t, cx - 0.27, cx + 0.27, -0.24, 0.24, H1 - 0.02, H1 + 0.07, bevel=0.015)
                apex = (cx, 0, H1 + 0.32)
                bm_v = [(cx - 0.25, -0.22, H1 + 0.07), (cx + 0.25, -0.22, H1 + 0.07), (cx + 0.25, 0.22, H1 + 0.07), (cx - 0.25, 0.22, H1 + 0.07), apex]
                G.add(trim, t, bm_v, [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4), (3, 2, 1, 0)])
            elif field:
                G.box(stone, t, cx - 0.34, cx + 0.34, -0.31, 0.31, H1, H1 + 0.14, amp, cuts, bevel=0, seed=s + 9)
            else:
                for k in range(5):
                    a = rnd.uniform(-0.5, 0.5); b = rnd.uniform(-0.35, 0.35)
                    shard(G, 'crystal', t, (cx + rnd.uniform(-0.12, 0.12), rnd.uniform(-0.1, 0.1), H1 - 0.05), (a, b, 1), rnd.uniform(0.32, 0.6) * (1.25 if k == 0 else 1), rnd.uniform(0.05, 0.08), rnd)
            for fy in faces_y:
                yy = fy * (0.27 * 0.91 + 0.006)
                for i, gl in enumerate(words[0 if s < 0 else 1][:2]):
                    glyph(G, rune, t, gl, cx, 0.78 - i * 0.34, 0.2, 0.26, yy, out=fy)
        # ธรณีประตู
        G.box(stone, 'C', -1.30, 1.30, -0.26, 0.26, 0.0, 0.12, amp * 0.5, cuts, bevel=bev * 0.5, seed=4)
        for i, gl in enumerate(['r', 'ing', 'k', 'ing', 'f']):
            glyph(G, rune, 'C', gl, -0.9 + i * 0.45, 0.06, 0.16, 0.08, -0.266, wd=0.03, out=-1)
        if field: field_dressing(G, rnd, variant)
        return G

    # ---- ฐาน 2 ขั้น + เสา + หัวเสา
    for s in (-1, 1):
        t = T(s); xa, xb = sorted((s * (PX0 - 0.15), s * (PX1 + 0.17)))
        G.box(stone, t, xa, xb, -0.56, 0.56, 0.0, 0.14, amp * 0.6, cuts, bevel=bev * 0.6, seed=s)
        xa, xb = sorted((s * (PX0 - 0.07), s * (PX1 + 0.09)))
        G.box(stone, t, xa, xb, -0.47, 0.47, 0.14, 0.28, amp * 0.6, cuts, bevel=bev * 0.6, seed=s + 2)
        xa, xb = sorted((s * PX0, s * PX1))
        G.box(stone, t, xa, xb, -D, D, 0.28, ZS - 0.22, amp, cuts + 2 if cuts else 0, taper=0.96, bevel=bev, seed=s + 5)
        xa, xb = sorted((s * (PX0 - 0.09), s * (PX1 + 0.11)))
        G.box(stone, t, xa, xb, -D - 0.1, D + 0.1, ZS - 0.24, ZS, amp * 0.6, cuts, bevel=bev, seed=s + 8)
        if town:   # แถบทองรอบหัวเสาและโคนเสา
            xa, xb = sorted((s * (PX0 - 0.03), s * (PX1 + 0.03)))
            G.box(trim, t, xa, xb, -D - 0.03, D + 0.03, ZS - 0.34, ZS - 0.26, bevel=0.012)
            G.box(trim, t, xa, xb, -D - 0.03, D + 0.03, 0.28, 0.36, bevel=0.012)
            xa, xb = sorted((s * (PX0 - 0.11), s * (PX1 + 0.13)))
            G.box(trim, t, xa, xb, -D - 0.12, D + 0.12, ZS - 0.03, ZS + 0.02, bevel=0.01)
        pcx = s * (PX0 + PX1) / 2
        for fy in faces_y:
            yy = fy * (D * (0.96 + 0.04 * 0.4) + 0.006)
            if town:      # รูนเรืองฟ้าเรียงลงหน้าเสา + กรอบทอง
                for i, gl in enumerate(words[0 if s < 0 else 1]):
                    glyph(G, rune, t, gl, pcx, 1.66 - i * 0.36, 0.24, 0.28, yy, out=fy)
                for zz in (0.42, 1.92):
                    G.box(trim, t, pcx - 0.22, pcx + 0.22, yy - 0.012, yy + 0.012, zz, zz + 0.035)
            elif field:   # ลายถักนอร์ส (เกลียวสองเส้นสานขึ้นลง) สลักนูนในกรอบ
                knot(G, t, pcx, fy * (D * 0.97), 0.48, 1.86, fy)
            else:         # แถบคริสตัลฝังหน้าเสา + รูนม่วง
                G.box('crystal', t, pcx - 0.035, pcx + 0.035, yy - 0.02, yy + 0.012 * fy, 0.42, 1.95)
                for zz in (0.62, 1.18, 1.74):
                    G.box('crystal', t, pcx - 0.09, pcx + 0.09, yy - 0.02, yy + 0.018 * fy, zz - 0.07, zz + 0.07)
        if cave:     # กระจุกคริสตัลบนหัวเสาด้านนอก
            for k in range(6):
                bx = s * (PX1 + rnd.uniform(-0.15, 0.05)); by = rnd.uniform(-0.3, 0.3)
                shard(G, 'crystal', t, (bx, by, ZS - 0.05), (s * rnd.uniform(0.2, 0.7), rnd.uniform(-0.3, 0.3), 1), rnd.uniform(0.3, 0.62) * (1.3 if k == 0 else 1), rnd.uniform(0.05, 0.085), rnd)

    # ---- โค้ง 7 ก้อน (ก้อนกลาง = หินหลัก สูงกว่า) + รูนเรียงเป็นวง
    n = 7
    for k in range(n):
        a0 = math.pi * k / n + 0.014; a1 = math.pi * (k + 1) / n - 0.014
        key = k == n // 2; bo = BO + (0.09 if key else 0); ao = AO + (0.03 if key else 0); dd = D + (0.03 if key else 0)
        mid = (a0 + a1) / 2; t = 'C' if key else T(math.cos(mid))
        steps = 4; V = []; F = []
        for j in range(steps + 1):
            a = a0 + (a1 - a0) * j / steps
            pi_ = (AI * math.cos(a), ZS + BI * math.sin(a)); po = (ao * math.cos(a), ZS + bo * math.sin(a))
            if key and j in (0, steps):   # หินหลักทรงลิ่ม: ด้านข้างตั้งตรงขึ้น
                po = (pi_[0] + (po[0] - pi_[0]) * 0.75, po[1])
            for y in (-dd, dd):
                V.append((pi_[0], y, pi_[1])); V.append((po[0], y, po[1]))
        q = lambda j, yi, io: j * 4 + yi * 2 + io
        for j in range(steps):
            F += [(q(j, 0, 0), q(j + 1, 0, 0), q(j + 1, 0, 1), q(j, 0, 1)), (q(j, 1, 1), q(j + 1, 1, 1), q(j + 1, 1, 0), q(j, 1, 0)),
                  (q(j, 0, 1), q(j + 1, 0, 1), q(j + 1, 1, 1), q(j, 1, 1)), (q(j, 1, 0), q(j + 1, 1, 0), q(j + 1, 0, 0), q(j, 0, 0))]
        F += [(q(0, 0, 0), q(0, 0, 1), q(0, 1, 1), q(0, 1, 0)), (q(steps, 1, 0), q(steps, 1, 1), q(steps, 0, 1), q(steps, 0, 0))]
        if amp:
            from mathutils import noise, Vector
            V = [(x + noise.noise(Vector((x * 3 + 2, y * 3, z * 3))) * amp * 0.5, y, z + noise.noise(Vector((x * 3, y * 3 + 7, z * 3))) * amp * 0.5) for x, y, z in V]
        G.add('arch' if cave else stone, t, V, F)
        rr = ((AI + ao) / 2, (BI + bo) / 2)
        cxg, czg = rr[0] * math.cos(mid), ZS + rr[1] * math.sin(mid)
        rot = math.atan2(rr[1] * math.sin(mid) / rr[1], rr[0] * math.cos(mid) / rr[0]) - math.pi / 2
        for fy in faces_y:
            yy = fy * (dd + 0.006)
            if not key:
                glyph(G, rune, t, ['f', 'th', 'r', None, 'k', 'u', 'ing'][k] if not cave else ['h', 'e', 'l', None, 'yr', 'd', 'th'][k], cxg, czg, 0.2, 0.27, yy, rot, out=fy)
        if town:   # ขอบทองตามขอบนอกโค้ง
            for fy in faces_y:
                pts = [((ao + 0.0) * math.cos(a0 + (a1 - a0) * j / 6), fy * (dd + 0.012), ZS + (bo - 0.02) * math.sin(a0 + (a1 - a0) * j / 6), 0.028) for j in range(7)]
                if not key: G.curve(trim, t, [pts])
    # เหรียญวงแหวนรูนที่หินหลัก
    kz = ZS + (BI + BO + 0.09) / 2 + 0.01
    for fy in faces_y:
        yy = fy * (D + 0.03 + 0.02)
        ring = []
        for j in range(33):
            a = j / 32 * 2 * math.pi; ring.append((0.215 * math.cos(a), yy, kz + 0.215 * math.sin(a), 0.04 if town else 0.032))
        G.curve(trim if not cave else 'crystal', 'C', [ring])
        glyph(G, rune, 'C', 'ing' if not cave else 'd', 0, kz, 0.2, 0.25, yy + fy * 0.012, out=fy)
    if cave:   # คริสตัลบนยอดหินหลัก
        for k in range(5):
            shard(G, 'crystal', 'C', (rnd.uniform(-0.12, 0.12), rnd.uniform(-0.15, 0.15), ZS + BO + 0.06), (rnd.uniform(-0.6, 0.6), rnd.uniform(-0.3, 0.3), 1), rnd.uniform(0.28, 0.5) * (1.3 if k == 0 else 1), rnd.uniform(0.045, 0.075), rnd)
    if field: field_dressing(G, rnd, variant)
    return G


def knot(G, t, cx, yface, z0, z1, fy):
    """ลายถักนอร์ส: เกลียวสองเส้นสานกัน (เส้นหนึ่งนูนกว่าอีกเส้นสลับกันเป็นช่วง = ขึ้น-ลง) + กรอบ"""
    A = 0.17; P = 0.46; r = 0.034
    for ph in (0.0, math.pi):
        pts = []
        N = 64
        for i in range(N + 1):
            z = z0 + (z1 - z0) * i / N; w = 2 * math.pi * (z - z0) / P + ph
            x = cx + A * math.sin(w); lift = 0.018 * math.cos(w)
            pts.append((x, yface + fy * (0.02 + lift), z, r))
        G.curve('knot', t, [pts])
    for (xa, za, xb, zb) in ((cx - 0.27, z0 - 0.06, cx + 0.27, z0 - 0.06), (cx - 0.27, z1 + 0.06, cx + 0.27, z1 + 0.06),
                             (cx - 0.27, z0 - 0.06, cx - 0.27, z1 + 0.06), (cx + 0.27, z0 - 0.06, cx + 0.27, z1 + 0.06)):
        G.curve('knot', t, [[(xa, yface + fy * 0.02, za, 0.028), (xb, yface + fy * 0.02, zb, 0.028)]])


def arch_tag(a, n=7):
    """แท็กของก้อนโค้งที่มุม a (0 = ปลาย +x, π = ปลาย −x) — ของที่วางบนก้อนไหนต้องอยู่ชิ้นเดียวกับก้อนนั้น (หินหลัก = C)"""
    k = min(n - 1, int(a / (math.pi / n)))
    return 'C' if k == n // 2 else ('R' if k < n // 2 else 'L')


def field_dressing(G, rnd, variant):
    """ทุ่ง: รากไม้เลื้อยขึ้นเสา/ห้อยจากโค้ง + มอสบนหัวเสา + เฟิร์นที่โคน"""
    import ridge3d as RG
    tall = variant != 'n'
    ox = (PX0 + PX1) / 2 if tall else 1.85
    top = ZS if tall else 1.05
    for s in (-1, 1):
        t = 'L' if s < 0 else 'R'
        # รากเลื้อยขึ้นด้านนอกเสา แล้วพาดข้ามหัวเสา
        for i in range(3 if tall else 2):
            y0 = rnd.uniform(-0.3, 0.3); r0 = rnd.uniform(0.03, 0.05); ph = rnd.random() * 6
            pts = [(s * (ox + 0.75), y0 - 0.1, 0.0, r0 * 1.3)]
            N = 12
            for j in range(N + 1):
                u = j / N; z = top * u
                x = s * (ox + (0.38 if tall else 0.34) + 0.03 * math.sin(u * 9 + ph)) - s * 0.02
                y = y0 + 0.12 * math.sin(u * 5 + ph)
                pts.append((x, y, z, r0 * (1 - 0.6 * u)))
            pts.append((s * (ox + 0.1), y0, top + 0.06, r0 * 0.35))
            G.curve('root', t, [pts])
        # มอสเป็นก้อนบนหัวเสา
        V, F = [], []
        for k in range(6 if tall else 2):
            RG.lump(V, F, s * ox + rnd.uniform(-0.3, 0.3) * (1 if tall else 0.6), rnd.uniform(-0.3, 0.3) * (1 if tall else 0.6), top + (0.02 if tall else 0.14), rnd.uniform(0.09, 0.16) * (1 if tall else 0.7), rnd, 0.5)
        G.add('moss', t, V, F)
        # เฟิร์นที่โคนด้านนอก/หน้า
        V, F = [], []
        for k in range(2):
            RG.fern(V, F, s * (ox + rnd.uniform(0.35, 0.75)), rnd.uniform(-0.75, -0.45) if k == 0 else rnd.uniform(0.3, 0.6), 0.0, rnd.uniform(0.32, 0.45), rnd)
        G.add('fern', t, V, F)
    if tall:   # รากห้อยจากโค้ง
        for i in range(7):
            a = math.pi * rnd.uniform(0.12, 0.88); x = (AO - 0.05) * math.cos(a); z = ZS + BO * math.sin(a) - 0.02
            L = rnd.uniform(0.45, 1.3) * (0.6 if abs(x) < 0.9 else 1); r = rnd.uniform(0.014, 0.024); ph = rnd.random() * 6
            for fy in (-1, 1):
                p = [(x, fy * 0.2, z + 0.06, r * 1.2), (x, fy * (D + 0.04), z + 0.03, r)]
                for j in range(1, 9):
                    u = j / 8; p.append((x + math.sin(u * 5 + ph) * 0.08 * u, fy * (D + 0.06 + 0.04 * u), z - u * L, r * (1 - 0.7 * u)))
                G.curve('root', arch_tag(a), [p])
        for k in range(7):   # มอสบนหลังโค้ง (แท็กตามฝั่งของก้อนที่มันวางอยู่ — ชิ้นหลัง/หน้าของซุ้มด้านข้างจะได้ไม่มีเงาลอย)
            V, F = [], []
            a = math.pi * rnd.uniform(0.15, 0.85)
            RG.lump(V, F, (AO - 0.15) * math.cos(a), rnd.uniform(-0.25, 0.25), ZS + (BO - 0.05) * math.sin(a), rnd.uniform(0.1, 0.17), rnd, 0.45)
            G.add('moss', arch_tag(a), V, F)


# ---------------------------------------------------------------- วัสดุ
def materials(theme):
    import bpy

    def new(name):
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
        return m, nt, nt.nodes['Principled BSDF']

    def L(nt, a, b): nt.links.new(a, b)

    def img(name): return bpy.data.images.load(os.path.join(ROOT, 'assets', name), check_existing=True)

    def mix(nt, a, b, fac, mode='MIX'):
        m = nt.nodes.new('ShaderNodeMix'); m.data_type = 'RGBA'; m.blend_type = mode
        if isinstance(fac, float): m.inputs['Factor'].default_value = fac
        else: L(nt, fac, m.inputs['Factor'])
        for sock, v in ((m.inputs[6], a), (m.inputs[7], b)):
            if isinstance(v, tuple): sock.default_value = (*v, 1)
            else: L(nt, v, sock)
        return m.outputs[2]

    def boxtex(nt, im, scale, blend=0.3):
        tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (scale,) * 3
        L(nt, tc.outputs['Object'], mp.inputs['Vector'])
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = im; t.projection = 'BOX'; t.projection_blend = blend
        L(nt, mp.outputs['Vector'], t.inputs['Vector']); return t, tc

    def emit(name, col, strength):
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
        nt.nodes.remove(nt.nodes['Principled BSDF'])
        e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*col, 1); e.inputs['Strength'].default_value = strength
        L(nt, e.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
        return m

    def flat(name, c0, c1, scale=4.0, rough=0.8):
        m, nt, b = new(name)
        tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = 5
        L(nt, tc.outputs['Object'], nz.inputs['Vector'])
        r = nt.nodes.new('ShaderNodeValToRGB'); r.color_ramp.elements[0].color = (*c0, 1); r.color_ramp.elements[1].color = (*c1, 1)
        L(nt, nz.outputs['Fac'], r.inputs['Fac']); L(nt, r.outputs['Color'], b.inputs['Base Color'])
        b.inputs['Roughness'].default_value = rough
        return m

    def marble():
        m, nt, b = new('marble')
        tc = nt.nodes.new('ShaderNodeTexCoord')
        nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 1.6; nz.inputs['Detail'].default_value = 7; nz.inputs['Distortion'].default_value = 4.0
        L(nt, tc.outputs['Object'], nz.inputs['Vector'])
        r = nt.nodes.new('ShaderNodeValToRGB'); el = r.color_ramp.elements
        base = (0.86, 0.84, 0.80, 1); vein = (0.52, 0.53, 0.58, 1)
        el[0].position = 0.0; el[0].color = base; el[1].position = 1.0; el[1].color = (0.80, 0.79, 0.77, 1)
        for p, c in ((0.46, base), (0.495, vein), (0.53, base)):
            e = el.new(p); e.color = c
        L(nt, nz.outputs['Fac'], r.inputs['Fac'])
        n2 = nt.nodes.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 0.6; L(nt, tc.outputs['Object'], n2.inputs['Vector'])
        col = mix(nt, r.outputs['Color'], (0.95, 0.92, 0.86), n2.outputs['Fac'], 'MULTIPLY')
        col = mix(nt, r.outputs['Color'], col, 0.35)
        L(nt, col, b.inputs['Base Color']); b.inputs['Roughness'].default_value = 0.32
        return m

    def gold():
        m, nt, b = new('gold')
        b.inputs['Base Color'].default_value = (1.0, 0.70, 0.26, 1); b.inputs['Metallic'].default_value = 0.75; b.inputs['Roughness'].default_value = 0.32
        b.inputs['Emission Color'].default_value = (1.0, 0.72, 0.3, 1); b.inputs['Emission Strength'].default_value = 0.12
        return m

    def rock(name, tint, moss_amt, sat=0.18, val=1.3, scale=0.42, dark=False):
        CAVE, GRASS = img('ground_cave.webp'), img('ground_grass.webp')
        m, nt, b = new(name)
        t, tc = boxtex(nt, CAVE, scale)
        hs = nt.nodes.new('ShaderNodeHueSaturation'); hs.inputs['Saturation'].default_value = sat; hs.inputs['Value'].default_value = val
        L(nt, t.outputs['Color'], hs.inputs['Color'])
        base = mix(nt, hs.outputs['Color'], tint, 1.0, 'MULTIPLY')
        nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 1.1; nz.inputs['Detail'].default_value = 4
        L(nt, tc.outputs['Object'], nz.inputs['Vector'])
        base = mix(nt, base, (0.62, 0.57, 0.52) if not dark else (0.45, 0.40, 0.55), nz.outputs['Fac'], 'OVERLAY')
        if moss_amt > 0:
            g, _ = boxtex(nt, GRASS, 0.5)
            gh = nt.nodes.new('ShaderNodeHueSaturation'); gh.inputs['Hue'].default_value = 0.47; gh.inputs['Saturation'].default_value = 0.7; gh.inputs['Value'].default_value = 0.85
            L(nt, g.outputs['Color'], gh.inputs['Color'])
            moss = mix(nt, gh.outputs['Color'], (0.55, 0.66, 0.40), 1.0, 'MULTIPLY')
            geo = nt.nodes.new('ShaderNodeNewGeometry'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); L(nt, geo.outputs['Normal'], sep.inputs[0])
            mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.35; mr.inputs['From Max'].default_value = 0.8
            mr.inputs['To Min'].default_value = 0.0; L(nt, sep.outputs['Z'], mr.inputs['Value'])
            mn = nt.nodes.new('ShaderNodeTexNoise'); mn.inputs['Scale'].default_value = 2.2; mn.inputs['Detail'].default_value = 6
            L(nt, tc.outputs['Object'], mn.inputs['Vector'])
            # มอสขึ้นตามโคน (z ต่ำ) และผิวหงาย
            ps = nt.nodes.new('ShaderNodeSeparateXYZ'); L(nt, tc.outputs['Object'], ps.inputs[0])
            lo = nt.nodes.new('ShaderNodeMapRange'); lo.inputs['From Min'].default_value = 0.9; lo.inputs['From Max'].default_value = 0.0
            lo.inputs['To Min'].default_value = 0.0; lo.inputs['To Max'].default_value = 0.35; L(nt, ps.outputs['Z'], lo.inputs['Value'])
            ad = nt.nodes.new('ShaderNodeMath'); ad.operation = 'ADD'; L(nt, mr.outputs['Result'], ad.inputs[0]); L(nt, lo.outputs['Result'], ad.inputs[1])
            mr2 = nt.nodes.new('ShaderNodeMapRange'); mr2.inputs['From Min'].default_value = 0.62 - moss_amt * 0.3; mr2.inputs['From Max'].default_value = 0.68 - moss_amt * 0.3
            L(nt, mn.outputs['Fac'], mr2.inputs['Value'])
            mm = nt.nodes.new('ShaderNodeMath'); mm.operation = 'MULTIPLY'; mm.use_clamp = True; L(nt, ad.outputs['Value'], mm.inputs[0]); L(nt, mr2.outputs['Result'], mm.inputs[1])
            mm2 = nt.nodes.new('ShaderNodeMath'); mm2.operation = 'MULTIPLY'; mm2.use_clamp = True; mm2.inputs[1].default_value = 1.8; L(nt, mm.outputs['Value'], mm2.inputs[0])
            base = mix(nt, base, moss, mm2.outputs['Value'])
        L(nt, base, b.inputs['Base Color'])
        b.inputs['Roughness'].default_value = 0.88 if not dark else 0.5
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.5; bp.inputs['Distance'].default_value = 0.04
        L(nt, t.outputs['Color'], bp.inputs['Height']); L(nt, bp.outputs['Normal'], b.inputs['Normal'])
        return m

    def obsidian():
        m, nt, b = new('obsidian')
        tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 2.5; nz.inputs['Detail'].default_value = 3
        L(nt, tc.outputs['Object'], nz.inputs['Vector'])
        r = nt.nodes.new('ShaderNodeValToRGB'); r.color_ramp.elements[0].color = (0.05, 0.04, 0.075, 1); r.color_ramp.elements[1].color = (0.13, 0.10, 0.19, 1)
        L(nt, nz.outputs['Fac'], r.inputs['Fac']); L(nt, r.outputs['Color'], b.inputs['Base Color'])
        b.inputs['Roughness'].default_value = 0.16; b.inputs['Coat Weight'].default_value = 0.6
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.25; L(nt, nz.outputs['Fac'], bp.inputs['Height']); L(nt, bp.outputs['Normal'], b.inputs['Normal'])
        return m

    def crystal():
        m, nt, b = new('crystal')
        b.inputs['Base Color'].default_value = (0.28, 0.08, 0.80, 1); b.inputs['Roughness'].default_value = 0.12
        geo = nt.nodes.new('ShaderNodeLayerWeight'); geo.inputs['Blend'].default_value = 0.35
        r = nt.nodes.new('ShaderNodeValToRGB'); r.color_ramp.elements[0].color = (0.50, 0.18, 1.0, 1); r.color_ramp.elements[1].color = (0.22, 0.03, 0.75, 1)
        L(nt, geo.outputs['Facing'], r.inputs['Fac']); L(nt, r.outputs['Color'], b.inputs['Emission Color'])
        b.inputs['Emission Strength'].default_value = 0.75
        return m

    M = {'rune': emit('rune', GLOW[theme], {'town': 5.0, 'field': 2.4, 'cave': 1.0}[theme]), 'catch': bpy.data.materials.new('catch')}
    if theme == 'town':
        M.update(stone=marble(), trim=gold())
    elif theme == 'field':
        M.update(stone=rock('fstone', (0.84, 0.82, 0.74), 0.32, sat=0.12, val=1.75), knot=rock('knot', (0.74, 0.72, 0.65), 0.0, sat=0.1, val=1.55),
                 root=flat('root', (0.16, 0.10, 0.06), (0.34, 0.22, 0.12), 6.0), fern=flat('fern', (0.08, 0.24, 0.06), (0.26, 0.48, 0.12), 3.0, 0.65),
                 moss=flat('moss', (0.16, 0.34, 0.08), (0.36, 0.56, 0.16), 9.0, 0.95))
        M['trim'] = M['knot']
    else:
        M.update(stone=rock('basalt', (0.36, 0.33, 0.42), 0.0, sat=0.15, val=0.9, scale=0.5, dark=True), arch=obsidian(), crystal=crystal())
        M['trim'] = M['arch']
    return M


# ---------------------------------------------------------------- ฉาก
def scene(theme):
    import bpy
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    cave = theme == 'cave'
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 3.3 if not cave else 2.6; sun.angle = math.radians(4)
    sun.color = (1.0, 0.95, 0.86) if not cave else (0.92, 0.90, 1.0)
    so = bpy.data.objects.new('sun', sun); sc.collection.objects.link(so)
    so.rotation_euler = (math.radians(44), 0, math.radians(-135))     # ซ้ายบน → เงาตกขวาล่าง (เหมือนทั้งเกม)
    fill = bpy.data.lights.new('fill', 'SUN'); fill.energy = 0.8; fill.angle = math.radians(20); fill.color = (1.0, 0.93, 0.85); fill.use_shadow = False
    fo = bpy.data.objects.new('fill', fill); sc.collection.objects.link(fo); fo.rotation_euler = (math.radians(60), 0, math.radians(-20))
    if cave:   # ขอบแสงม่วงจากขวา (สีวาร์ปถ้ำ) ให้หินดำมีขอบ
        rim = bpy.data.lights.new('rim', 'SUN'); rim.energy = 1.6; rim.angle = math.radians(10); rim.color = (0.70, 0.50, 1.0)
        ro = bpy.data.objects.new('rim', rim); sc.collection.objects.link(ro); ro.rotation_euler = (math.radians(64), 0, math.radians(100))
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = {'town': (0.56, 0.64, 0.78, 1), 'field': (0.50, 0.60, 0.56, 1), 'cave': (0.36, 0.32, 0.46, 1)}[theme]
    bg.inputs['Strength'].default_value = 0.65
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
    try: sc.cycles.use_denoising = True
    except Exception: pass
    sc.cycles.max_bounces = 4
    try: sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Punchy'
    except Exception: sc.view_settings.view_transform = 'Filmic'
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    return sc, so


def yaw_of(variant):
    """หมุนซุ้ม (เรเดียน รอบแกน z) ให้แกน +x ท้องถิ่นชี้ไปปลาย "หลัง" (เหนือ) • E: หลังอยู่ตะวันตกเฉียงเหนือ (ช่องหันเข้าในแมพ) • W: สลับ"""
    if variant == 'e': return math.pi / 2 + SIDE_YAW
    if variant == 'w': return math.pi / 2 - SIDE_YAW
    return 0.0


def make_objects(G, M, rig, inks):
    import bpy
    objs = []
    for (mat, tag), (V, F) in G.b.items():
        me = bpy.data.meshes.new(f'{mat}_{tag}'); me.from_pydata(V, [], F); me.update()
        o = bpy.data.objects.new(f'{mat}_{tag}', me); o.data.materials.append(M[mat]); o.parent = rig
        objs.append((o, tag, mat))
    for i, (mat, tag, paths) in enumerate(G.curves):
        cu = bpy.data.curves.new(f'cu{i}', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 1.0; cu.bevel_resolution = 2; cu.use_fill_caps = True
        for pts in paths:
            sp = cu.splines.new('NURBS'); sp.points.add(len(pts) - 1); sp.use_endpoint_u = True; sp.order_u = 3 if len(pts) > 2 else 2
            for j, (x, y, z, r) in enumerate(pts): sp.points[j].co = (x, y, z, 1); sp.points[j].radius = r
        o = bpy.data.objects.new(f'cu{i}_{mat}_{tag}', cu); o.data.materials.append(M[mat]); o.parent = rig
        objs.append((o, tag, mat))
    for o, tag, mat in objs:
        (inks['F'] if tag == 'L' else inks['B']).objects.link(o)
    return objs


def project_bounds(sc, objs, sun_dir):
    """ขอบเขตบนระนาบภาพ (ม.) ของทุกจุด + เงาบนพื้นของมัน"""
    import bpy
    from mathutils import Vector
    up = Vector((0, math.cos(TH), math.sin(TH)))
    dg = bpy.context.evaluated_depsgraph_get()
    us, vs = [], []
    for o, _, _ in objs:
        oe = o.evaluated_get(dg); me = oe.to_mesh()
        mw = o.matrix_world
        for v in me.vertices:
            p = mw @ v.co
            us.append(p.x); vs.append(p.dot(up))
            if p.z > 0.01 and sun_dir.z < 0:
                q = p + sun_dir * (p.z / -sun_dir.z)
                us.append(q.x); vs.append(q.dot(up))
        oe.to_mesh_clear()
    return min(us), max(us), min(vs), max(vs)


def render_variant(theme, variant, samples, out, preview=False):
    import bpy
    from mathutils import Vector
    sc, so = scene(theme)
    M = materials(theme)
    rnd = random.Random({'town': 11, 'field': 23, 'cave': 37}[theme] * 7 + VARIANTS.index(variant))
    G = build(theme, variant, rnd)
    rig = bpy.data.objects.new('rig', None); sc.collection.objects.link(rig); rig.rotation_euler = (0, 0, yaw_of(variant))
    inks = {k: bpy.data.collections.new('ink' + k) for k in 'BF'}
    for c in inks.values(): sc.collection.children.link(c)
    objs = make_objects(G, M, rig, inks)
    bpy.context.view_layer.update()
    sun_dir = so.matrix_world.to_3x3() @ Vector((0, 0, -1))
    u0, u1, v0, v1 = project_bounds(sc, objs, sun_dir)
    pad = 0.12; u0 -= pad; u1 += pad; v0 -= pad; v1 += pad
    ss = 1 if preview else SS; ppm = GPX * ss
    rx, ry = math.ceil((u1 - u0) * ppm), math.ceil((v1 - v0) * ppm)
    u1 = u0 + rx / ppm; v1 = v0 + ry / ppm
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = u1 - u0; cam.sensor_fit = 'HORIZONTAL'; cam.clip_end = 400
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
    co.rotation_euler = (TH, 0, 0)
    d = Vector((0, math.sin(TH), -math.cos(TH))); up = Vector((0, math.cos(TH), math.sin(TH)))
    co.location = Vector(((u0 + u1) / 2, 0, 0)) + up * ((v0 + v1) / 2) - d * 60
    sc.render.resolution_x = rx; sc.render.resolution_y = ry; sc.render.resolution_percentage = 100
    px = lambda p: ((p.x - u0) * ppm, (v1 - p.dot(up)) * ppm)
    anchor = px(Vector((0, 0, 0)))
    # ช่องประตู (ระนาบกลาง y=0 ท้องถิ่น) → px — เกมตัดม่านวาร์ปให้อยู่ในนี้
    rot = rig.matrix_world.to_3x3()
    opening = None
    if variant != 'n':
        loc = [(-AI, -0.15), (-AI, ZS)] + [(AI * math.cos(math.pi - i * math.pi / 16), ZS + BI * math.sin(math.pi - i * math.pi / 16)) for i in range(1, 16)] + [(AI, ZS), (AI, -0.15)]
        opening = [[round(c, 1) for c in px(rot @ Vector((x, 0, z)))] for x, z in loc]
    # จุดเรียงความลึกของแต่ละชิ้น: ขอบใต้สุด (y แมพมากสุด) ของฐานเสา/ธรณีในชิ้นนั้น (ช่องแมพ, เทียบกลางวาร์ป)
    def front_y(tags):
        ys = []
        dg = bpy.context.evaluated_depsgraph_get()
        for o, tag, mat in objs:
            if tag not in tags or mat in ('fern', 'root', 'moss', 'rune') or o.type != 'MESH': continue
            for v in o.data.vertices:
                p = o.matrix_world @ v.co
                if p.z < 0.3: ys.append(-p.y)
        return round(max(ys), 3) if ys else 0.0
    sc.view_settings.exposure = 0.2 if theme != 'cave' else 0.35
    # Freestyle: 2 ชุดเส้น (ชิ้นหลัง/หน้า) เปิดปิดตามรอบเรนเดอร์
    sc.render.use_freestyle = True; sc.render.line_thickness_mode = 'ABSOLUTE'
    vl = bpy.context.view_layer; vl.use_freestyle = True
    fs = vl.freestyle_settings; fs.crease_angle = math.radians(118 if theme != 'town' else 140)
    lsets = {}
    for i, k in enumerate('BF'):
        ls = fs.linesets[0] if (i == 0 and fs.linesets) else fs.linesets.new('ink' + k)
        ls.select_by_visibility = True; ls.select_by_collection = True; ls.collection = inks[k]
        ls.select_silhouette = True; ls.select_border = True; ls.select_crease = True
        st = bpy.data.linestyles.new('ink' + k); ls.linestyle = st
        st.color = (0.08, 0.05, 0.04); st.thickness = 1.3 * ss; st.alpha = 0.85
        lsets[k] = ls
    os.makedirs(out, exist_ok=True)
    name = f'{theme}_{variant}'
    passes = [('', 'BF')] if variant in ('s', 'n') else [('_b', 'B'), ('_f', 'F')]
    meta = {'anchor': [round(anchor[0], 1), round(anchor[1], 1)], 'ppm': ppm, 'open': opening, 'pieces': [], 'size': [rx, ry]}
    for suf, keys in passes:
        for o, tag, mat in objs:
            o.visible_camera = (('F' if tag == 'L' else 'B') in keys)
        for k, ls in lsets.items(): ls.show_render = k in keys
        sc.cycles.samples = samples
        f = os.path.join(out, name + suf + '.png'); sc.render.filepath = f
        bpy.ops.render.render(write_still=True)
        tags = {'B': ('R', 'C'), 'F': ('L',), 'BF': ('L', 'R', 'C')}[keys]
        meta['pieces'].append({'file': name + suf + '.png', 'dy': front_y(tags)})
        print('เรนเดอร์ →', f)
    # เงาบนพื้น (shadow catcher) — วัตถุมองไม่เห็นแต่ยังทอดเงา
    sc.render.use_freestyle = False
    for o, _, _ in objs: o.visible_camera = False
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, -0.002)); pl = bpy.context.active_object
    pl.scale = (30, 30, 1); pl.is_shadow_catcher = True
    sc.cycles.samples = max(8, samples // 2)
    f = os.path.join(out, name + '_sh.png'); sc.render.filepath = f
    bpy.ops.render.render(write_still=True)
    meta['shadow'] = name + '_sh.png'
    json.dump(meta, open(os.path.join(out, name + '.json'), 'w'), indent=1)
    print('meta', name, meta['anchor'], [p['dy'] for p in meta['pieces']])


# ---------------------------------------------------------------- ติดตั้ง
def install(src):
    from PIL import Image, ImageEnhance
    from slice_sheet import manifest

    def boost(im, sat, con=1.06):
        a = im.getchannel('A'); rgb = im.convert('RGB')
        rgb = ImageEnhance.Contrast(ImageEnhance.Color(rgb).enhance(sat)).enhance(con)
        return Image.merge('RGBA', (*rgb.split(), a))

    def load(path, ppm):
        im = Image.open(path).convert('RGBA'); f = GPX / ppm
        return im.resize((round(im.width * f), round(im.height * f)), Image.LANCZOS), f

    def crop(im, thr=6):
        bb = im.getchannel('A').point(lambda v: 255 if v > thr else 0).getbbox()
        if not bb: return im, 0, 0
        l, t, r, b = bb; l, t, r, b = max(0, l - 2), max(0, t - 2), min(im.width, r + 2), min(im.height, b + 2)
        return im.crop((l, t, r, b)), l, t

    s = PX / GPX
    data = {}
    for theme in THEMES:
        for v in VARIANTS:
            mf = os.path.join(src, f'{theme}_{v}.json')
            if not os.path.exists(mf): continue
            m = json.load(open(mf)); f = GPX / m['ppm']; ax, ay = m['anchor'][0] * f, m['anchor'][1] * f
            ent = {'pcs': []}; top = 1e9
            for i, pc in enumerate(m['pieces']):
                im, _ = load(os.path.join(src, pc['file']), m['ppm']); im = boost(im, 1.2)
                im, l, t = crop(im)
                key = f'bake_gate_{theme}_{v}' + ('' if len(m['pieces']) == 1 else ('_b', '_f')[i])
                im.save(os.path.join(ROOT, 'assets', key + '.webp'), 'WEBP', quality=90, method=6)
                ent['pcs'].append({'img': key, 'ax': round(ax - l, 1), 'ay': round(ay - t, 1), 'dy': pc['dy']})
                bb = im.getchannel('A').point(lambda q: 255 if q > 120 else 0).getbbox()
                if bb: top = min(top, (bb[1] + t - ay) * s)
                print('ติดตั้ง', key, im.size, 'anchor', ent['pcs'][-1]['ax'], ent['pcs'][-1]['ay'], 'dy', pc['dy'])
            im, _ = load(os.path.join(src, m['shadow']), m['ppm'])
            a = im.getchannel('A').point(lambda q: int(q * 0.62)); im = Image.merge('RGBA', (*Image.new('RGB', im.size, (18, 12, 24)).split(), a))
            im, l, t = crop(im, 10)
            key = f'bake_gate_{theme}_{v}_sh'; im.save(os.path.join(ROOT, 'assets', key + '.webp'), 'WEBP', quality=85, method=6)
            ent['sh'] = {'img': key, 'ax': round(ax - l, 1), 'ay': round(ay - t, 1)}
            if m['open']: ent['open'] = [[round((x * f - ax) * s, 1), round((y * f - ay) * s, 1)] for x, y in m['open']]
            ent['top'] = round(top, 1)          # px เหนือจุดยึดของยอดซุ้ม (1×) — ป้ายชื่อปลายทางวางเหนือนี้
            data.setdefault(theme, {})[v] = ent
    data['s'] = s; data['glow'] = GLOW_JS
    manifest()
    js = os.path.join(ROOT, 'js', 'maps.js'); srcjs = open(js, encoding='utf-8').read()
    line = 'const GATE_BAKE = ' + json.dumps(data, separators=(',', ':')) + '; // tools/gate3d.py --install'
    src2, n = re.subn(r'^const GATE_BAKE = .*$', lambda _: line, srcjs, flags=re.M)
    if n: open(js, 'w', encoding='utf-8').write(src2); print('อัปเดต js/maps.js GATE_BAKE')
    else: print('ไม่พบบรรทัด GATE_BAKE ใน js/maps.js — ใส่เอง:\n' + line[:300] + '…')


if __name__ == '__main__':
    a = sys.argv
    arg = lambda k, dflt: a[a.index(k) + 1] if k in a else dflt
    if '--install' in a: install(a[a.index('--install') + 1])
    else:
        only = arg('--only', '')
        jobs = [tuple(j.split(':')) for j in only.split(',')] if only else [(t, v) for t in THEMES for v in VARIANTS]
        for t, v in jobs:
            render_variant(t, v, int(arg('--samples', 32)), arg('--out', '/tmp/gate3d'), '--preview' in a)
