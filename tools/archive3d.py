"""ชั้นวางสลักผนัง + ประตูห้องนิรภัย + ชั้นวางตั้งอิสระ (Archive Depths) — docs/RENDER3D_PLAN.md #9

  A (อบลงภาพผนังถ้ำของ tools/cave3d.py --map archive — ต้นทุนต่อเฟรม 0 ไม่แตะการชน):
    • ช่องชั้นวางเว้าลึก 0.55 ม. สลักเข้าไปในหน้าผาฝั่งใต้ (หันหากล้อง) ทุก ~3 ช่องตามแนวหน้าผาที่ตรงและหนาพอ
      หน้าผาตรงนั้นถูกเกลาเป็นผนังเรียบ + คานหินทับหัวช่อง + เสาขนาบลายรูนทอง • ชั้นไม้ 4 ชั้น โหลประกายทอง ม้วนคัมภีร์ ตำรา
    • ประตูห้องนิรภัยวงกลม Ø ~2.6 ม. สลักตราผนึกทองบนหน้าผาหนา (สูงสุด 3 บาน — ผังปัจจุบันได้ 2) (จุดเล่าเรื่องในอนาคต)
    • ตราผนึกบนพื้น (ตำแหน่ง/ลายเดียวกับ maps.js caveSeals) = แผ่นหินขัดฝังพื้น + ร่องมืด + เส้นเรืองทอง (CAVE_BAKE.seals → โค้ดไม่วาดซ้ำ)
    เลือกตำแหน่งอัตโนมัติจากผังช่อง + heightfield: ต้องผ่านเพดานความสูง cap (กฎ dN/0.855) ทุกจุด → check() ยังได้ 0
    ไม่ทับผลึกที่งอกจากผนัง (ตำแหน่งเดียวกับ cave3d.wall_crystals) • ห่างประตูวาร์ป
    → cave3d.heightfield เรียก carve() • cave3d.build เรียก geometry() • cave3d.py --patch เรนเดอร์เฉพาะกรอบของงานนี้แล้วแปะทับภาพเดิม
       (ส่วนอื่นของภาพเหมือนเดิมทุกพิกเซล)
  B (สไปรต์ตั้งตรงเรียงความลึก — js/bake_data_archive.js): ชั้นวางตั้งอิสระ 4 ตู้กลางห้องโถงใหญ่ (โมเดลแบบชั้นวางของ Hel #1 ย้อมน้ำเงิน-ทอง)
    ภาพเดียวใช้หลายตู้ (2 แบบ) + เงาบนพื้น (shadow catcher) วาดลงผ้าใบพื้น • ชนตาม block • จางเมื่อผู้เล่นอยู่หลัง
  ประกายโหล (ทั้งช่องในผนังและตู้) = จุดกะพริบในเกม (Bake.draw) • แสงตัดความมืด 1 ดวงต่อช่อง/ตู้/ประตู (map.extraLights)

ใช้:
  python3 tools/cave3d.py --check --map archive                                   (รวมงานนี้แล้ว: บังทางต้องเป็น 0)
  python3 tools/archive3d.py --plan [--out /tmp/a.png]                             (รายการช่อง/ประตู + ภาพตำแหน่งบนผัง)
  /tmp/bvenv/bin/python tools/cave3d.py --map archive --samples 16 --ss 1.25 --patch <ภาพเรนเดอร์เต็มเดิม.png> --out /tmp/arc.png
  python3 tools/cave3d.py --install /tmp/arc.png --map archive
  /tmp/bvenv/bin/python tools/archive3d.py [--samples 48] [--out /tmp/archive3d]   (ชิ้น B)
  python3 tools/archive3d.py --install /tmp/archive3d                              (assets/bake_arc_* + js/bake_data_archive.js + manifest)
"""
import math, os, sys, json, random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
MAP_ID = 'archive'
K = 0.76; SN = math.sin(math.acos(K)); PX = 40; SH = 0.855
TAN = 1 / math.tan(math.acos(K))            # รังสีกล้อง: ถอยไปทางใต้ 1 ม. สูงขึ้น 1.17 ม. (มุมก้ม 49.5°)
GOLD = (1.0, 0.80, 0.40)                    # crystalGlow 255,205,100
GLOW_COL = '255,205,100'

# ---- ช่องชั้นวางในหน้าผา (A)
NICHE_W = 2.0            # กว้างช่อง (ม.)
NICHE_D = 0.55           # ลึก
SILL = 0.24              # ขอบล่างช่อง (พื้นช่อง)
OPEN = 2.05              # ขอบบนช่อง (ใต้คาน)
FACE_H = (2.32, 2.5)     # ความสูงผนังเรียบรอบช่อง (ต่ำสุดที่รับได้, ที่ต้องการ) — ต้องไม่เกินเพดาน cap
FACE_M = 0.36            # เสาขนาบแต่ละข้าง
FACE_DEP = 0.9           # ผนังเรียบหนาเข้าไปในหิน
PITCH = 3.0              # ระยะห่างช่องตามแนวหน้าผา
BOARDS = (SILL, 0.66, 1.08, 1.50)
# ---- ประตูห้องนิรภัย (A)
DOOR_R = 1.30            # รัศมีบานประตู
DOOR_FR = 1.62           # รัศมีนอกกรอบหิน
DOOR_ZC = 1.56           # ความสูงศูนย์กลาง
DOOR_W = 4.8             # กว้างผนังเรียบรอบประตู
DOOR_H = (3.15, 3.45)
DOOR_SET = 0.22          # ผนังหน้าประตูถอยเข้าในหินจากแนวหน้าผา (ส่วนที่ยื่นของบาน/กรอบอยู่หลังแนวหน้าผา)
N_DOORS = 3
# ---- ชั้นวางตั้งอิสระ (B) กลางห้องโถงใหญ่ (x 31–53, y 37–47 โล่งทั้งหมด) — (ชื่อ, x, y จุดยึด = ขอบใต้กลางฐาน, แบบภาพ)
SHELF_W, SHELF_D, SHELF_H = 2.0, 0.6, 2.7
#   เว้นตราผนึกบนพื้น (48,44 r1.8 / 40,46 r1.5 — maps.js caveSeals) • ทางเดินระหว่างตู้ ≥ 1.4 ช่อง
SHELVES = [('shelf_a1', 35.5, 40.6, 'a'), ('shelf_b1', 39.0, 40.6, 'b'), ('shelf_b2', 42.5, 43.6, 'b'), ('shelf_a2', 45.5, 43.6, 'a')]
RES_B = 160; STORE_B = 80
A_PAD = 0.9              # กรอบภาพเงาบนพื้นรอบตู้ (ม.)


def runs(T, solid):
    """แนวหน้าผาฝั่งใต้ที่ตรง: ช่องหินแถว j ที่ใต้ลงไปเดินได้ ต่อกัน x0..x1-1 • คืน (j, x0, x1, ความหนาต่ำสุดของหิน)"""
    H, W = len(T), len(T[0]); out = []
    for j in range(1, H - 1):
        x = 0
        while x < W:
            ok = lambda xx: T[j][xx] == 8 and T[j + 1][xx] not in solid
            if not ok(x): x += 1; continue
            x0 = x
            while x < W and ok(x): x += 1
            th = []
            for xx in range(x0, x):
                k = j
                while k >= 0 and T[k][xx] == 8: k -= 1
                th.append(j - k)
            out.append((j, x0, x, th))
    return out


def plan(hf, crystals=None):
    """เลือกตำแหน่งช่องชั้นวาง/ประตู (กำหนดตายตัวจากผัง) → [{'kind': 'niche'|'door', 'x0', 'x1' (ผนังเรียบ), 'yf' (แนวหน้า), 'h', 'top'}]
       เพดานความสูงใช้ความหนาของช่องหินในคอลัมน์ (top = ขอบเหนือของแนวหิน): จุดสูง z ที่ y ต้อง z ≤ 0.9·(y − top)/0.855"""
    from cave3d import SOLID, wall_crystals
    T, d = hf['T'], hf['d']; W, H = hf['W'], hf['H']
    if crystals is None: crystals = wall_crystals(hf, random.Random(2025 + len(MAP_ID)))   # ลำดับสุ่มเดียวกับ cave3d.build
    portals = [(p['x'] + 0.5, p['y'] + 0.5) for p in d['portals']]

    def ok(j, x0, x1, yf, dep, need, th, rx0):
        """ช่วง x0..x1 ของแนวหน้าผาแถว j: หินหนาพอให้ความสูง need ที่ระยะ dep หลังแนวหน้า • ไม่ทับผลึก • ห่างวาร์ป"""
        c0, c1 = int(math.floor(x0)), int(math.ceil(x1))
        if c0 < rx0 or c1 - rx0 > len(th) or x0 < 2.5 or x1 > W - 2.5 or j < 3: return False
        top = j + 1 - min(th[c0 - rx0:c1 - rx0])
        if 0.9 * (yf - dep - top) / SH < need: return False
        if any(math.hypot(px - (x0 + x1) / 2, py - yf) < 6 for px, py in portals): return False
        return not any(x0 - 0.35 < cx < x1 + 0.35 and yf - 1.4 < cy < yf + 0.7 for (cx, cy, *_r) in crystals)

    feats, used = [], []
    rs = runs(T, SOLID)
    # ประตู: แนวตรง ≥ 5 ช่อง หินหนา (คิ้วบนสูง DOOR_H ที่ 0.3 ม. หลังแนวหน้า) — เลือกแนวที่หนาที่สุด ห่างกัน ≥ 14 ช่อง
    cand = []
    for (j, x0, x1, th) in rs:
        yf = j + 1 - 0.1 - DOOR_SET
        for k in range(int((x1 - x0 - DOOR_W) * 4) + 1):
            cx = x0 + DOOR_W / 2 + k * 0.25
            fx0, fx1 = cx - DOOR_W / 2, cx + DOOR_W / 2
            if ok(j, fx0, fx1, yf, 0.3, DOOR_H[1], th, x0):
                cand.append((min(th) + (x1 - x0) * 0.3 - abs(cx - (x0 + x1) / 2) * 0.2, j, cx, yf))
    cand.sort(key=lambda c: (-c[0], c[1], c[2]))
    for _s, j, cx, yf in cand:
        if sum(f['kind'] == 'door' for f in feats) >= N_DOORS: break
        if any(math.hypot(cx - f['cx'], yf - f['yf']) < 14 for f in feats): continue
        feats.append({'kind': 'door', 'j': j, 'cx': cx, 'x0': round(cx - DOOR_W / 2, 2), 'x1': round(cx + DOOR_W / 2, 2), 'yf': round(yf, 2), 'h': DOOR_H[1]})
        used.append((j, cx - DOOR_W / 2 - 0.4, cx + DOOR_W / 2 + 0.4))
    # ช่องชั้นวาง: แนวตรง ≥ 3 ช่อง • ทุก PITCH ม. กลางแนว (เลื่อนได้ ±0.75 ม. หลบผลึก) • คานสูง FACE_H ที่หลังช่อง
    for (j, x0, x1, th) in rs:
        L = x1 - x0
        if L < 3: continue
        n = L // 3; yf = j + 1 - 0.1
        for i in range(n):
            c0 = x0 + L / 2 + (i - (n - 1) / 2) * PITCH
            for sh in (0, 0.25, -0.25, 0.5, -0.5, 0.75, -0.75):
                cx = c0 + sh; fx0, fx1 = cx - NICHE_W / 2 - FACE_M, cx + NICHE_W / 2 + FACE_M
                if fx0 < x0 + 0.1 or fx1 > x1 - 0.1: continue
                if any(jj == j and a < fx1 and fx0 < b for jj, a, b in used): continue
                if not ok(j, fx0, fx1, yf, NICHE_D + 0.05, FACE_H[0], th, x0): continue
                feats.append({'kind': 'niche', 'j': j, 'cx': cx, 'x0': round(fx0, 2), 'x1': round(fx1, 2), 'yf': round(yf, 2), 'h': FACE_H[1]})
                used.append((j, fx0, fx1)); break
    # ตราผนึกบนพื้น (maps.js caveSeals ผ่าน cave3d.py --extract): อบเป็นแผ่นหินฝังพื้น + ร่องสลักเรืองทอง แทนเส้นวาดด้วยโค้ด
    for sl in d.get('seals', []):
        feats.append({'kind': 'seal', 'cx': sl['x'] + 0.5, 'yf': sl['y'] + 0.5, 'r': sl['r'], 'k': sl['k'], 'bits': sl['bits'],
                      'x0': sl['x'] + 0.5 - sl['r'], 'x1': sl['x'] + 0.5 + sl['r']})
    for f in feats:  # ขอบเหนือของแนวหิน (ใช้คุมความสูงผนังเรียบด้านหลังให้ลาดตามเส้นสายตา)
        if f['kind'] == 'seal': continue
        rr = next(r for r in rs if r[0] == f['j'] and r[1] <= f['x0'] + 0.5 and f['x1'] - 0.5 <= r[2])
        c0, c1 = int(math.floor(f['x0'])), int(math.ceil(f['x1']))
        f['top'] = f['j'] + 1 - min(rr[3][max(0, c0 - rr[1]):c1 - rr[1]])
    for i, f in enumerate(feats): f['id'] = f'{f["kind"]}_{i}'
    return feats


def carve(hf, feats):
    """แก้ heightfield: ผนังเรียบสูง h หน้าตรงที่ yf (ตัดหินที่ยื่นเลยออกไป) • ช่องชั้นวาง = เว้าลงเหลือระดับขอบล่าง"""
    import numpy as np
    MX, MY = hf['MX'], hf['MY']; Hh = hf['H_']; mesh = hf['mesh']; fS = hf['fS']
    for f in feats:
        if f['kind'] == 'seal': continue
        x0, x1, yf, h = f['x0'], f['x1'], f['yf'], f['h']
        dep = 1.0 if f['kind'] == 'door' else FACE_DEP
        col = (MX >= x0 - 1e-6) & (MX <= x1 + 1e-6)
        front = col & (MY > yf + 1e-6) & (MY < yf + 0.6)        # หินธรรมชาติที่ยื่นเลยแนวหน้า → ตัดออก (เห็นพื้นถ้ำ)
        block = col & (MY >= yf - dep - 1e-6) & (MY <= yf + 1e-6)
        mesh[front] = False; Hh[front] = 0
        capT = 0.9 * (MY - f['top']) / SH                               # เพดานตามความหนาหิน (ด้านหลังผนังเรียบลาดตามเส้นสายตา)
        mesh[block] = True; Hh[block] = np.minimum(h, capT[block])
        # ขอบหินเรียบตรงแนวหน้า (cave3d.build เลื่อนจุดโคนผนังไปที่จุดตัดศูนย์ของ fS)
        fS[col & (MY > yf - 0.3) & (MY < yf + 0.6)] = (yf - MY)[col & (MY > yf - 0.3) & (MY < yf + 0.6)]
        f['_blk'] = col & (MY >= yf - dep - 0.4) & (MY < yf + 0.6)        # ขอบปากผาสว่าง (lip) ไม่ใช้ตรงผนังเรียบ — มีคิ้วคานเป็นขอบแทน
        if f['kind'] == 'niche':
            hole = (MX >= f['cx'] - NICHE_W / 2 - 1e-6) & (MX <= f['cx'] + NICHE_W / 2 + 1e-6) & (MY > yf - NICHE_D) & (MY <= yf + 1e-6)
            Hh[hole] = SILL


# ---------------------------------------------------------------- ประกายโหล (ไม่ต้องใช้ Blender — รังสีกล้องไม่มีแกน x จึงตรวจด้วยเรขาคณิตตรง ๆ)
def niche_items(f):
    """ของในช่องชั้นวาง (กำหนดตายตัวต่อช่อง): [(ชนิด, x, y, z0, r, h, ความสว่าง)] พิกัดแมพ • ชนิด jar / tome / scroll"""
    rnd = random.Random(int(f['cx'] * 100) * 7 + f['j'] * 131)
    style = rnd.random()
    out = []
    for bi, z in enumerate(BOARDS):
        x = f['cx'] - NICHE_W / 2 + 0.12
        while x < f['cx'] + NICHE_W / 2 - 0.14:
            r0 = rnd.random()
            y = f['yf'] - NICHE_D + 0.24 + rnd.uniform(-0.02, 0.05)
            if r0 < (0.18 if style < 0.5 else 0.42):                          # ตำราตั้งเรียง 3–6 เล่ม
                n = rnd.randint(3, 6)
                for k in range(n):
                    w = rnd.uniform(0.045, 0.07); hh = rnd.uniform(0.2, 0.3)
                    if x + w > f['cx'] + NICHE_W / 2 - 0.1: break
                    out.append(('tome', x + w / 2, y + 0.04, z + 0.02, w, hh, rnd.random())); x += w + 0.006
                x += 0.05
            elif r0 < (0.26 if style < 0.5 else 0.55):                         # ม้วนคัมภีร์กองนอน
                out.append(('scroll', x + 0.12, y, z + 0.02, 0.045, 0.24, rnd.random())); x += 0.28
            elif r0 < 0.93:                                                    # โหลประกาย
                r = rnd.uniform(0.06, 0.075); hh = rnd.uniform(0.17, 0.25) * (0.9 if bi == len(BOARDS) - 1 else 1)
                out.append(('jar', x + r + 0.01, y, z + 0.02, r, hh, rnd.choice([0.45, 0.6, 0.8, 0.55, 1.0]) if rnd.random() > 0.08 else 0))
                x += 2 * r + rnd.uniform(0.07, 0.12)
            else: x += 0.2                                                     # ช่องว่าง
    return out


def visible(f, x, y, z):
    """จุด (x, y, z) ในช่องมองเห็นจากกล้องไหม: รังสีขึ้นไปทางใต้ ผ่านแนวหน้าที่ความสูง z + (yf - y)·1.17 ต้องอยู่ใต้ขอบบนช่อง"""
    return z + (f['yf'] - y) * TAN < OPEN - 0.03 and z > SILL


def wall_glints(feats):
    """ประกายของโหลในผนัง (ที่กล้องเห็น) ต่อช่อง: จุดยึด = กลางแนวหน้าช่อง (เรียงความลึกกับตัวละคร) • px เทียบจุดยึดที่ 1×"""
    out = []
    for f in feats:
        if f['kind'] != 'niche': continue
        ax, ay = f['cx'], f['yf']; js = []
        for (k, x, y, z0, r, h, b) in niche_items(f):
            if k != 'jar' or not b: continue
            zc = z0 + h * 0.45
            if not visible(f, x, y, zc): continue
            js.append([round((x - ax) * PX, 1), round((y - ay) * PX * K - zc * SN * PX, 1), b])
        out.append({'id': f['id'], 'x': round(ax, 2), 'y': round(ay, 2), 'jars': js,
                    'light': {'dx': 0, 'dy': -0.15, 'lr': 2.4, 'col': GLOW_COL}})
    for f in feats:
        if f['kind'] != 'door': continue
        # ตราผนึกกลางบาน: ประกายช้า ๆ 5 จุดบนวงรูน + แสงทองหน้าประตู
        ax, ay = f['cx'], f['yf'] + 0.2; js = []
        for i in range(5):
            a = math.pi / 2 + i * 2 * math.pi / 5; r = DOOR_R * 0.62
            js.append([round(math.cos(a) * r * PX, 1), round((f['yf'] - ay) * PX * K - (DOOR_ZC + math.sin(a) * r) * SN * PX, 1), 0.8])
        js.append([0.0, round((f['yf'] - ay) * PX * K - DOOR_ZC * SN * PX, 1), 1.0])
        out.append({'id': f['id'], 'x': round(ax, 2), 'y': round(ay, 2), 'jars': js,
                    'light': {'dx': 0, 'dy': -0.25, 'lr': 3.4, 'col': GLOW_COL}})
    return out


# ---------------------------------------------------------------- เรขาคณิตในฉาก cave3d (Blender)
def geometry(sc, ink, feats, bm_xy, light):
    """สร้างคาน/เสา/ชั้น/โหล/ประตูของทุกงาน A ในฉากผนังถ้ำ • bm_xy(x, y, z) = พิกัดแมพ → Blender
       light(x, y, z, col, energy, radius) • คืนจุดยอดทั้งหมด [(x, y, z)] (พิกัดแมพ) ให้ check() ตรวจบังทาง"""
    import bpy, bmesh
    from mathutils import Matrix, Vector
    M = mats()
    fine = bpy.data.collections.new('arc_fine'); sc.collection.children.link(fine)   # โหล/ประกาย/ลายรูน ไม่มีเส้นขอบ
    meshes = {}

    def B(name):
        if name not in meshes: meshes[name] = bmesh.new()
        return meshes[name]

    def box(name, x0, x1, y0, y1, z0, z1):
        """กล่องในพิกัดแมพ (y0 < y1 = เหนือ → ใต้)"""
        (bx, by, bz) = bm_xy((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
        bmesh.ops.create_cube(B(name), size=1.0, matrix=Matrix.LocRotScale(Vector((bx, by, bz)), None, Vector((x1 - x0, y1 - y0, z1 - z0))))

    def cyl_y(name, x, y0, y1, z, r0, r1=None, seg=24):
        """ทรงกระบอกแกนเหนือ-ใต้ (หน้าตัดหันหากล้อง) จาก y0 ถึง y1"""
        p = Vector(bm_xy(x, (y0 + y1) / 2, z)); q = Vector((0, 0, 1)).rotation_difference(Vector((0, -1, 0))).to_matrix().to_4x4()
        bmesh.ops.create_cone(B(name), cap_ends=True, segments=seg, radius1=r0, radius2=r1 if r1 is not None else r0, depth=y1 - y0, matrix=Matrix.Translation(p) @ q)

    def cyl_z(name, x, y, z0, z1, r0, r1=None, seg=12):
        bmesh.ops.create_cone(B(name), cap_ends=True, segments=seg, radius1=r0, radius2=r1 if r1 is not None else r0, depth=z1 - z0, matrix=Matrix.Translation(Vector(bm_xy(x, y, (z0 + z1) / 2))))

    def ring_y(name, x, y, z, r0, r1, dep, seg=64):
        """วงแหวนหน้าตั้ง (ระนาบ x-z) ความหนา dep ไปทางใต้จาก y"""
        bm = B(name); vs = []
        for i in range(seg):
            a = i / seg * 2 * math.pi
            row = []
            for (rr, yy) in ((r0, y), (r1, y), (r1, y + dep), (r0, y + dep)):
                row.append(bm.verts.new(bm_xy(x + rr * math.cos(a), yy, z + rr * math.sin(a))))
            vs.append(row)
        for i in range(seg):
            a, b = vs[i], vs[(i + 1) % seg]
            for k in range(4):
                bm.faces.new([a[k], a[(k + 1) % 4], b[(k + 1) % 4], b[k]])

    def strip(name, xa, za, xb, zb, y, w=0.03):
        """แถบรูนบาง ๆ บนผนังหันใต้ (ระนาบ x-z ที่ y)"""
        dx, dz = xb - xa, zb - za; L = math.hypot(dx, dz) or 1; nx, nz = -dz / L * w / 2, dx / L * w / 2
        bm = B(name); vs = [bm.verts.new(bm_xy(*p)) for p in ((xa - nx, y, za - nz), (xb - nx, y, zb - nz), (xb + nx, y, zb + nz), (xa + nx, y, za + nz))]
        bm.faces.new(vs)

    def flat(name, xa, ya, xb, yb, z, w):
        """แถบแบนบนพื้น (ระนาบ x-y ที่ความสูง z) จาก (xa, ya) ถึง (xb, yb) กว้าง w"""
        dx, dy = xb - xa, yb - ya; L = math.hypot(dx, dy) or 1; nx, ny = -dy / L * w / 2, dx / L * w / 2
        bm = B(name); vs = [bm.verts.new(bm_xy(*p)) for p in ((xa - nx, ya - ny, z), (xa + nx, ya + ny, z), (xb + nx, yb + ny, z), (xb - nx, yb - ny, z))]
        bm.faces.new(vs)

    def ring_flat(name, cx, cy, r, w, z, seg=72):
        for i in range(seg):
            a0, a1 = i / seg * 2 * math.pi, (i + 1) / seg * 2 * math.pi
            flat(name, cx + math.cos(a0) * r, cy + math.sin(a0) * r, cx + math.cos(a1) * r, cy + math.sin(a1) * r, z, w)

    pts = []
    for si, f in enumerate(f for f in feats if f['kind'] == 'seal'):
        # ตราผนึกบนพื้น: แผ่นหินขัดฝังพื้น (ขอบลบมุม) + ร่องมืด + เส้นเรืองทอง — ลายเดียวกับ caveTheme (วง 2 ชั้น ซี่ k รูน สามเหลี่ยม)
        cx, cy, r, k = f['cx'], f['yf'], f['r'], f['k']; z = 0.02 + si * 0.0007     # ตราที่ซ้อนกันไม่ z-fight
        bmesh.ops.create_cone(B('seal'), cap_ends=True, segments=72, radius1=r + 0.14, radius2=r + 0.08, depth=z, matrix=Matrix.Translation(Vector(bm_xy(cx, cy, z / 2))))
        for nm, zz, ww in (('groove', z + 0.0004, 0.075), ('floor_rune', z + 0.0008, 0.035)):
            ring_flat(nm, cx, cy, r, ww, zz); ring_flat(nm, cx, cy, r * 0.72, ww * 0.7, zz)
            for i in range(k):
                a = i / k * 2 * math.pi
                flat(nm, cx + math.cos(a) * r * 0.72, cy + math.sin(a) * r * 0.72, cx + math.cos(a) * r, cy + math.sin(a) * r, zz, ww * 0.75)
                ra = a + math.pi / k; rx, ry, sz = cx + math.cos(ra) * r * 0.86, cy + math.sin(ra) * r * 0.86, 0.1
                flat(nm, rx, ry - sz, rx, ry + sz, zz, ww * 0.6)
                flat(nm, rx, ry - sz * f['bits'][i], rx + sz * 0.8, ry - sz * 0.2, zz, ww * 0.6)
            for i in range(3):
                a0 = -math.pi / 2 + i * 2.094; a1 = a0 + 2.094
                flat(nm, cx + math.cos(a0) * r * 0.4, cy + math.sin(a0) * r * 0.4, cx + math.cos(a1) * r * 0.4, cy + math.sin(a1) * r * 0.4, zz, ww * 0.8)
    for f in feats:
        if f['kind'] == 'seal': continue
        yf, h, cx = f['yf'], f['h'], f['cx']
        if f['kind'] == 'niche':
            x0, x1 = cx - NICHE_W / 2, cx + NICHE_W / 2
            box('lintel', x0 - 0.06, x1 + 0.06, yf - NICHE_D - 0.02, yf + 0.05, OPEN, h - 0.12)          # คานหินทับหัวช่อง (ยื่นนิดหน่อย)
            box('lintel', x0 - FACE_M + 0.04, x1 + FACE_M - 0.04, yf - 0.25, yf + 0.08, h - 0.16, h)    # คิ้วบนผนังเรียบ
            for sx in (-1, 1):                                                                          # เสาขนาบ
                xp = cx + sx * (NICHE_W / 2 + FACE_M / 2)
                box('lintel', xp - FACE_M / 2 + 0.03, xp + FACE_M / 2 - 0.03, yf - 0.1, yf + 0.06, 0.0, h - 0.16)
                for k in range(4):                                                                      # รูนทองบนเสา
                    z = 0.42 + k * 0.42
                    strip('rune', xp, z - 0.09, xp, z + 0.09, yf + 0.065, 0.026)
                    strip('rune', xp, z + 0.03, xp + sx * 0.07, z + 0.09, yf + 0.065, 0.02)
            for z in BOARDS[1:]: box('board', x0 + 0.02, x1 - 0.02, yf - NICHE_D + 0.02, yf - 0.02, z - 0.04, z)   # แผ่นชั้นหิน
            box('board', x0, x1, yf - 0.12, yf + 0.03, SILL - 0.04, SILL + 0.005)                       # ขอบหน้าช่อง
            strip('rune', x0 + 0.1, OPEN + 0.12, x1 - 0.1, OPEN + 0.12, yf + 0.052, 0.022)               # เส้นรูนทองใต้คิ้วคาน
            for (k, x, y, z0, r, hh, b) in niche_items(f):
                if k == 'jar':
                    cyl_z('glass', x, y, z0, z0 + hh * 0.85, r * 0.9, r, 12)
                    cyl_z('glass', x, y, z0 + hh * 0.85, z0 + hh, r, r * 0.55, 12)
                    cyl_z('lid', x, y, z0 + hh, z0 + hh + 0.03, r * 0.62, r * 0.6, 12)
                    bmesh.ops.create_icosphere(B(f'spark{min(4, int(b * 5))}' if b else 'spark_dead'), subdivisions=2, radius=r * 0.55, matrix=Matrix.Translation(Vector(bm_xy(x, y, z0 + hh * 0.45))))
                elif k == 'tome':
                    box('tome%d' % int(b * 4), x - r / 2, x + r / 2, y - 0.1, y + 0.1, z0, z0 + hh)
                else:
                    q = Vector((0, 0, 1)).rotation_difference(Vector((1, 0, 0))).to_matrix().to_4x4()
                    for (oy, oz) in ((0, r), (-0.05, r * 3), (0.05, r * 3)) if b > 0.5 else ((0, r),):
                        bmesh.ops.create_cone(B('scroll'), cap_ends=True, segments=10, radius1=r, radius2=r, depth=hh, matrix=Matrix.Translation(Vector(bm_xy(x, y + oy, z0 + oz))) @ q)
                        bmesh.ops.create_cone(B('lid'), cap_ends=True, segments=10, radius1=r * 1.15, radius2=r * 1.15, depth=0.02, matrix=Matrix.Translation(Vector(bm_xy(x - hh / 2, y + oy, z0 + oz))) @ q)
            light(cx, yf + 0.25, 1.15, GOLD, 22, 0.4)
            pts += [(x0 - FACE_M, yf + 0.08, h), (x1 + FACE_M, yf + 0.08, h), (cx, yf + 0.08, h)]
        else:
            x0, x1 = f['x0'], f['x1']; zc = DOOR_ZC
            box('lintel', x0 - 0.05, x1 + 0.05, yf - 0.3, yf + 0.1, h - 0.2, h)                         # คิ้วบน
            box('lintel', x0 + 0.2, x1 - 0.2, yf - 0.2, yf + 0.06, h - 0.38, h - 0.2)
            for sx in (-1, 1):                                                                          # เสาเหลี่ยมขนาบ + รูน
                xp = cx + sx * (DOOR_W / 2 - 0.32)
                box('lintel', xp - 0.24, xp + 0.24, yf - 0.1, yf + 0.14, 0, h - 0.38)
                for k in range(6):
                    z = 0.4 + k * 0.42
                    strip('rune', xp, z - 0.1, xp, z + 0.1, yf + 0.145, 0.03)
                    strip('rune', xp, z + (0.02 if k % 2 else -0.06), xp + sx * (0.08 if k % 2 else -0.08), z + (0.1 if k % 2 else 0.02), yf + 0.145, 0.022)
            box('lintel', x0 + 0.1, x1 - 0.1, yf - 0.1, yf + 0.3, 0, 0.1)                              # ธรณีประตู
            ring_y('lintel', cx, yf, zc, DOOR_R + 0.05, DOOR_FR, 0.17, 72)                              # กรอบหินวงกลม
            ring_y('gold', cx, yf + 0.17, zc, DOOR_FR - 0.12, DOOR_FR - 0.04, 0.02, 72)                  # ขอบทอง
            for i in range(24):                                                                         # รูนทองรอบกรอบ
                a = i / 24 * 2 * math.pi; rr = (DOOR_R + DOOR_FR) / 2 - 0.02
                ca, sa = math.cos(a), math.sin(a)
                strip('rune', cx + ca * (rr - 0.07), zc + sa * (rr - 0.07), cx + ca * (rr + 0.07), zc + sa * (rr + 0.07), yf + 0.172, 0.03)
            cyl_y('door', cx, yf - 0.05, yf + 0.1, zc, DOOR_R, None, 64)                                 # บานประตู (เหล็กน้ำเงินเข้ม)
            cyl_y('gold', cx, yf + 0.1, yf + 0.13, zc, DOOR_R * 0.30, DOOR_R * 0.26, 32)                 # ดุมกลาง
            ring_y('gold', cx, yf + 0.1, zc, DOOR_R * 0.86, DOOR_R * 0.92, 0.03, 64)                    # วงทอง (เครื่องกล)
            ring_y('rune', cx, yf + 0.1, zc, DOOR_R * 0.58, DOOR_R * 0.62, 0.012, 64)                    # วงตราผนึกเรือง
            ring_y('rune', cx, yf + 0.1, zc, DOOR_R * 0.40, DOOR_R * 0.43, 0.012, 48)
            for i in range(3):                                                                          # สามเหลี่ยมตราผนึก (เหมือนตราบนพื้น)
                a0 = math.pi / 2 + i * 2 * math.pi / 3; a1 = a0 + 2 * math.pi / 3; rr = DOOR_R * 0.58
                strip('rune', cx + math.cos(a0) * rr, zc + math.sin(a0) * rr, cx + math.cos(a1) * rr, zc + math.sin(a1) * rr, yf + 0.113, 0.03)
            for i in range(8):                                                                          # สลักล็อกรัศมี 8 อัน
                a = i / 8 * 2 * math.pi + math.pi / 8; ca, sa = math.cos(a), math.sin(a)
                q = Vector((0, 0, 1)).rotation_difference(Vector((ca, 0, sa))).to_matrix().to_4x4()
                rm = (DOOR_R * 0.68 + DOOR_R * 1.08) / 2
                bmesh.ops.create_cone(B('gold'), cap_ends=True, segments=10, radius1=0.055, radius2=0.055, depth=DOOR_R * 0.4, matrix=Matrix.Translation(Vector(bm_xy(cx + ca * rm, yf + 0.14, zc + sa * rm))) @ q)
                bmesh.ops.create_uvsphere(B('gold'), u_segments=10, v_segments=6, radius=0.075, matrix=Matrix.Translation(Vector(bm_xy(cx + ca * DOOR_R * 1.08, yf + 0.14, zc + sa * DOOR_R * 1.08))))
            for i in range(5):                                                                          # อักษรรูนบนวงตรา
                a = math.pi / 2 + i * 2 * math.pi / 5 + math.pi / 5; rr = DOOR_R * 0.75
                xx, zz = cx + math.cos(a) * rr, zc + math.sin(a) * rr
                strip('rune', xx, zz - 0.08, xx, zz + 0.08, yf + 0.112, 0.022); strip('rune', xx, zz + 0.04, xx + 0.06, zz - 0.01, yf + 0.112, 0.018)
            for sz in (-1, 1):                                                                          # บานพับขวา
                box('gold', cx + DOOR_R - 0.05, cx + DOOR_FR + 0.05, yf + 0.0, yf + 0.18, zc + sz * 0.7 - 0.12, zc + sz * 0.7 + 0.12)
            light(cx, yf + 1.1, 1.7, GOLD, 70, 0.6)
            pts += [(x0, yf + 0.3, h), (x1, yf + 0.3, h), (cx, yf + 0.3, zc + DOOR_FR)]
    for name, bm in meshes.items():
        me = bpy.data.meshes.new('arc_' + name); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new('arc_' + name, me)
        (fine if name.startswith(('glass', 'spark', 'rune', 'lid', 'groove', 'floor_rune')) else ink).objects.link(o)
        if name[:5] == 'spark' and name[5:].isdigit(): mat = M['spark'][int(name[5:])]
        elif name[:4] == 'tome': mat = M['tome'][int(name[4:])]
        else: mat = M[name]
        o.data.materials.append(mat)
        for p in o.data.polygons: p.use_smooth = name in ('glass', 'spark0', 'spark1', 'spark2', 'spark3', 'spark4', 'spark_dead', 'scroll')
    return pts


def mats():
    """วัสดุของงานนี้ (น้ำเงินหินเย็น + ทอง) — ใช้ทั้งฉากผนังถ้ำและฉากชิ้น B"""
    import bpy

    def mat(name, col, rough=0.7, metal=0.0, noise=0.0, scale=4.0, emit=None, estr=0.0, alpha=1.0):
        m = bpy.data.materials.get('arc_' + name)
        if m: return m
        m = bpy.data.materials.new('arc_' + name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
        b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
        if noise:
            tc = nt.nodes.new('ShaderNodeTexCoord'); tx = nt.nodes.new('ShaderNodeTexNoise'); tx.inputs['Scale'].default_value = scale; tx.inputs['Detail'].default_value = 5
            nt.links.new(tc.outputs['Object'], tx.inputs['Vector'])
            rp = nt.nodes.new('ShaderNodeValToRGB'); rp.color_ramp.elements[0].position = 0.3; rp.color_ramp.elements[1].position = 0.7
            rp.color_ramp.elements[0].color = (*[c * (1 - noise) for c in col], 1); rp.color_ramp.elements[1].color = (*[min(1, c * (1 + noise)) for c in col], 1)
            nt.links.new(tx.outputs['Fac'], rp.inputs['Fac']); nt.links.new(rp.outputs['Color'], b.inputs['Base Color'])
        else: b.inputs['Base Color'].default_value = (*col, 1)
        if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = estr
        if alpha < 1: b.inputs['Alpha'].default_value = alpha
        return m
    def dressed(name, c1, c2, mortar):
        """หินแต่งก่อเป็นก้อน (ลายอิฐตามผิวหน้า/ผิวบน) • ผิวหงายมืดลง (ไม่ให้ยอดคาน/คิ้วเป็นแผ่นสว่างในถ้ำ)"""
        m = bpy.data.materials.get('arc_' + name)
        if m: return m
        m = bpy.data.materials.new('arc_' + name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']; L = nt.links.new
        tc = nt.nodes.new('ShaderNodeTexCoord'); sp = nt.nodes.new('ShaderNodeSeparateXYZ'); L(tc.outputs['Object'], sp.inputs[0])
        ad = nt.nodes.new('ShaderNodeMath'); ad.operation = 'ADD'; L(sp.outputs['Y'], ad.inputs[0]); L(sp.outputs['Z'], ad.inputs[1])
        cb = nt.nodes.new('ShaderNodeCombineXYZ'); L(sp.outputs['X'], cb.inputs['X']); L(ad.outputs[0], cb.inputs['Y'])
        br = nt.nodes.new('ShaderNodeTexBrick'); L(cb.outputs[0], br.inputs['Vector'])
        br.inputs['Color1'].default_value = (*c1, 1); br.inputs['Color2'].default_value = (*c2, 1); br.inputs['Mortar'].default_value = (*mortar, 1)
        br.inputs['Scale'].default_value = 1.0; br.inputs['Mortar Size'].default_value = 0.018; br.inputs['Brick Width'].default_value = 0.62; br.inputs['Row Height'].default_value = 0.26
        nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 5.0; nz.inputs['Detail'].default_value = 5; L(tc.outputs['Object'], nz.inputs['Vector'])
        mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'OVERLAY'; mx.inputs['Factor'].default_value = 0.6
        L(br.outputs['Color'], mx.inputs[6]); L(nz.outputs['Color'], mx.inputs[7])
        g = nt.nodes.new('ShaderNodeNewGeometry'); gz = nt.nodes.new('ShaderNodeSeparateXYZ'); L(g.outputs['Normal'], gz.inputs[0])
        rg = nt.nodes.new('ShaderNodeMapRange'); rg.inputs['From Min'].default_value = 0.5; rg.inputs['From Max'].default_value = 0.9
        rg.inputs['To Min'].default_value = 1.0; rg.inputs['To Max'].default_value = 0.42; L(gz.outputs['Z'], rg.inputs['Value'])
        m2 = nt.nodes.new('ShaderNodeMix'); m2.data_type = 'RGBA'; m2.blend_type = 'MULTIPLY'; m2.inputs['Factor'].default_value = 1.0
        L(mx.outputs[2], m2.inputs[6]); L(rg.outputs['Result'], m2.inputs[7])
        L(m2.outputs[2], b.inputs['Base Color']); b.inputs['Roughness'].default_value = 0.85
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.35; L(br.outputs['Fac'], bp.inputs['Height']); L(bp.outputs['Normal'], b.inputs['Normal'])
        return m
    lin = lambda c: tuple(v ** 2.2 for v in c)
    out = {
        'lintel': dressed('dressed', (0.105, 0.135, 0.21), (0.085, 0.11, 0.175), (0.03, 0.035, 0.05)),   # หินแต่งน้ำเงินเทาเข้ม
        'board': mat('slab', (0.10, 0.12, 0.18), 0.8, noise=0.3, scale=6.0),
        'door': mat('steel', (0.10, 0.14, 0.24), 0.42, metal=0.85, noise=0.25, scale=5.0),  # เหล็กน้ำเงินเข้ม
        'gold': mat('gold', (0.95, 0.70, 0.30), 0.32, metal=1.0, noise=0.15, scale=8.0),
        'gold_b': mat('gold_b', (0.95, 0.72, 0.32), 0.4, metal=0.7, noise=0.15, scale=8.0, emit=lin((0.9, 0.62, 0.25)), estr=0.6),   # ขอบทองตู้ตั้งอิสระ (เรืองนิด ๆ ให้อ่านออกในถ้ำมืด)
        'stone_b': dressed('dressed_b', (0.20, 0.25, 0.36), (0.17, 0.21, 0.31), (0.05, 0.06, 0.09)),                           # หินแต่งของตู้ (สว่างกว่าผนัง — เป็นสไปรต์เดี่ยว)
        'top_b': mat('top_b', (0.05, 0.06, 0.09), 0.85, noise=0.3, scale=3.0),                                                  # ผิวบนตู้ (หันฟ้า — ไม่ให้สว่างเป็นแผ่น)
        'rune': mat('rune', (0.4, 0.28, 0.05), 0.4, emit=lin(GOLD), estr=5.0),
        'floor_rune': mat('floor_rune', (0.4, 0.28, 0.05), 0.4, emit=lin(GOLD), estr=2.6),                      # เส้นตราผนึกบนพื้น (#ffcf5a)
        'groove': mat('groove', (0.015, 0.018, 0.03), 0.9),                                                     # ร่องสลักมืดรอบเส้นเรือง
        'seal': mat('seal', (0.075, 0.09, 0.14), 0.38, noise=0.3, scale=2.5),                                    # แผ่นหินขัดฝังพื้น
        'glass': mat('glass', (0.85, 0.80, 0.62), 0.08, alpha=0.3),
        'lid': mat('lid', (0.62, 0.44, 0.18), 0.4, metal=1.0, noise=0.2, scale=8),
        'scroll': mat('scroll', (0.70, 0.60, 0.42), 0.85, noise=0.2, scale=12),
        'spark_dead': mat('spark_dead', (0.10, 0.09, 0.07), 0.6),
        'tome': [mat(f'tome{i}', c, 0.75, noise=0.2, scale=10) for i, c in enumerate([(0.30, 0.10, 0.08), (0.10, 0.16, 0.30), (0.12, 0.22, 0.14), (0.36, 0.26, 0.10), (0.30, 0.10, 0.08)])],
        'spark': [mat(f'spark{i}', lin(c), 0.5, emit=lin(c), estr=s) for i, (c, s) in enumerate([((1.0, 0.78, 0.36), 4.0), ((1.0, 0.80, 0.40), 7.0), ((1.0, 0.86, 0.50), 10.0), ((1.0, 0.72, 0.30), 6.0), ((1.0, 0.92, 0.64), 14.0)])],
    }
    return out


def rects(feats, W, H, kinds=None):
    """กรอบช่องที่ต้องเรนเดอร์ใหม่ต่องาน (รวมกรอบที่ทับกัน) — เผื่อเงา/แสงรอบ ๆ และส่วนสูงที่ยื่นขึ้นเหนือในภาพ • kinds = เฉพาะชนิด"""
    rs = []
    for f in feats:
        if kinds and f['kind'] not in kinds: continue
        if f['kind'] == 'seal': rs.append([max(0, math.floor(f['x0'] - 1)), max(0, math.floor(f['yf'] - f['r'] - 1)), min(W, math.ceil(f['x1'] + 1)), min(H, math.ceil(f['yf'] + f['r'] + 1))]); continue
        rs.append([max(0, math.floor(f['x0'] - 3)), max(0, math.floor(f['yf'] - 6)), min(W, math.ceil(f['x1'] + 3)), min(H, math.ceil(f['yf'] + 3.5))])
    merged = True
    while merged:
        merged = False
        for i in range(len(rs)):
            for j in range(i + 1, len(rs)):
                a, b = rs[i], rs[j]
                if a[0] <= b[2] and b[0] <= a[2] and a[1] <= b[3] and b[1] <= a[3]:
                    rs[i] = [min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])]; rs.pop(j); merged = True; break
            if merged: break
    return sorted(rs, key=lambda r: (r[1], r[0]))


def plan_png(hf, feats, out):
    """ภาพตรวจตำแหน่ง: heightfield + กรอบงาน (แดง = ประตู, เหลือง = ช่องชั้นวาง)"""
    from PIL import Image, ImageDraw
    import numpy as np
    from cave3d import SOLID
    Hh = hf['H_']; a = np.clip(Hh / 3.5, 0, 1); RS = round(1 / (hf['MX'][0, 1] - hf['MX'][0, 0]))
    rgb = np.stack([a * 255] * 3, -1).astype(np.uint8)
    walk = ~np.isin(hf['tile'], list(SOLID)); rgb[walk & (Hh <= 0.01)] = (40, 90, 40)
    im = Image.fromarray(rgb); d = ImageDraw.Draw(im); o = -hf['MX'][0, 0]
    for f in feats:
        if f['kind'] == 'seal': d.ellipse([(f['x0'] + o) * RS, (f['yf'] - f['r'] + o) * RS, (f['x1'] + o) * RS, (f['yf'] + f['r'] + o) * RS], outline=(255, 200, 60), width=1); continue
        c = (255, 60, 60) if f['kind'] == 'door' else (255, 220, 60)
        d.rectangle([(f['x0'] + o) * RS, (f['yf'] - 1 + o) * RS, (f['x1'] + o) * RS, (f['yf'] + o) * RS], outline=c, width=2)
    for r in rects(feats, hf['W'], hf['H']):
        d.rectangle([(r[0] + o) * RS, (r[1] + o) * RS, (r[2] + o) * RS, (r[3] + o) * RS], outline=(80, 160, 255), width=1)
    im.save(out); print('ภาพตำแหน่ง →', out)


# ============================================================ ชิ้น B: ชั้นวางตั้งอิสระ (ฉาก Blender แยก)
def to_b(gx, gy, z=0.0):
    return (gx, -gy, z)


def build_b(samples, outdir, preview=False):
    import bpy, bmesh
    from mathutils import Vector, Matrix, Euler
    os.makedirs(outdir, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    M = mats()
    cols = {}

    def coll(name):
        if name not in cols:
            c = bpy.data.collections.new(name); sc.collection.children.link(c); cols[name] = c
        return cols[name]

    def obj(name, bm, m, cname, smooth=False):
        me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new(name, me); coll(cname).objects.link(o); o.data.materials.append(m)
        for p in o.data.polygons: p.use_smooth = smooth
        return o

    def box(bm, c, s, rot=None):
        bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.LocRotScale(Vector(c), rot.to_quaternion() if rot else None, Vector(s)))

    def cyl(bm, p0, p1, r0, r1, seg=10):
        p0, p1 = Vector(p0), Vector(p1); d = p1 - p0
        q = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r0, radius2=r1, depth=d.length, matrix=Matrix.Translation((p0 + p1) / 2) @ q)

    W, D, H = SHELF_W, SHELF_D, SHELF_H
    meta = {'pieces': {}}
    variants = {'a': random.Random(31), 'b': random.Random(77)}
    for vi, (var, rnd) in enumerate(variants.items()):
        ox = vi * 6.0                                      # วางแยกกันในฉาก (เรนเดอร์ทีละแบบ ซ่อนอีกแบบ)
        cm, cf = f'{var}_main', f'{var}_fine'
        def add(nm, bm, m, fine=False, smooth=False):
            return obj(f'{var}_{nm}', bm, m, cf if fine else cm, smooth)
        # ฐาน/โครงหินแต่ง + แผ่นหลัง (ด้านใต้ = หน้า หันหากล้อง: y ของ Blender ติดลบ)
        bm = bmesh.new()
        box(bm, (ox, 0, 0.07), (W + 0.1, D + 0.06, 0.14))
        for sx in (-1, 1): box(bm, (ox + sx * (W / 2 - 0.06), 0, H / 2), (0.12, D, H))
        box(bm, (ox, D / 2 - 0.02, H / 2), (W - 0.1, 0.04, H))
        add('frame', bm, M['stone_b'])
        bm = bmesh.new(); box(bm, (ox, 0, H - 0.05), (W + 0.12, D + 0.08, 0.12)); add('cornice', bm, M['top_b'])
        bm = bmesh.new()                                    # แผ่นยอดโค้งสลัก
        ztop = H + 0.01
        prof = [(-W / 2 + 0.02, ztop)] + [(x * (W / 2 - 0.02), ztop + 0.08 + 0.16 * (1 - x * x) ** 0.8) for x in [i / 10 - 1 for i in range(21)]] + [(W / 2 - 0.02, ztop)]
        fr = [bm.verts.new((ox + x, -D / 2 - 0.02, z)) for x, z in prof]; bk = [bm.verts.new((ox + x, -D / 2 + 0.06, z)) for x, z in prof]
        bm.faces.new(fr[::-1]); bm.faces.new(bk)
        for i in range(len(prof)): bm.faces.new([fr[i], fr[(i + 1) % len(prof)], bk[(i + 1) % len(prof)], bk[i]])
        add('crest', bm, M['stone_b'])
        bm = bmesh.new()                                    # ขอบทอง + ปุ่ม + มุมทอง
        for sx in (-1, 1):
            bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=0.075, matrix=Matrix.Translation((ox + sx * W / 2, -D / 2, ztop + 0.07)))
            box(bm, (ox + sx * (W / 2 - 0.06), -D / 2 - 0.005, 0.2), (0.15, 0.02, 0.06)); box(bm, (ox + sx * (W / 2 - 0.06), -D / 2 - 0.005, H - 0.2), (0.15, 0.02, 0.06))
        for i in range(20):
            (xa, za), (xb, zb) = prof[i + 1], prof[i + 2]
            cyl(bm, (ox + xa, -D / 2 - 0.04, za), (ox + xb, -D / 2 - 0.04, zb), 0.02, 0.02, 6)
        box(bm, (ox, -D / 2 - 0.045, H - 0.05), (W + 0.14, 0.02, 0.04))
        add('trim', bm, M['gold_b'])
        bm = bmesh.new()                                    # รูนทองตามเสา + วงรูนกลางแผ่นยอด
        for sx in (-1, 1):
            for k in range(5):
                z = 0.45 + k * 0.42
                box(bm, (ox + sx * (W / 2 - 0.06), -D / 2 - 0.004, z), (0.022, 0.01, 0.16))
                box(bm, (ox + sx * (W / 2 - 0.06) + 0.03, -D / 2 - 0.004, z + 0.05), (0.05, 0.01, 0.018), Euler((0, 0.6, 0)))
        for k in range(16):
            a0 = k / 16 * 2 * math.pi
            box(bm, (ox + 0.075 * math.cos(a0), -D / 2 - 0.035, ztop + 0.13 + 0.075 * math.sin(a0)), (0.032, 0.012, 0.016), Euler((0, -a0 - math.pi / 2, 0)))
        box(bm, (ox, -D / 2 - 0.035, ztop + 0.13), (0.016, 0.012, 0.1))
        add('runes', bm, M['rune'], fine=True)
        rows = 6; zs = [0.16 + i * (H - 0.38) / rows for i in range(rows)]
        bm = bmesh.new()
        for z in zs: box(bm, (ox, -0.02, z), (W - 0.2, D - 0.06, 0.04))
        add('boards', bm, M['board'])
        glass, lids, dead, scroll = bmesh.new(), bmesh.new(), bmesh.new(), bmesh.new()
        sparks = [bmesh.new() for _ in M['spark']]; tomes = [bmesh.new() for _ in M['tome']]
        jars = []; inner = W - 0.26
        for ri, z in enumerate(zs):
            x = -inner / 2
            while x < inner / 2 - 0.12:
                r0 = rnd.random(); y = -D / 2 + 0.16 + rnd.uniform(-0.02, 0.05)
                if r0 < (0.2 if var == 'a' else 0.4):                            # ตำราตั้งเรียง
                    for k in range(rnd.randint(3, 6)):
                        w = rnd.uniform(0.045, 0.07); hh = rnd.uniform(0.2, 0.3)
                        if x + w > inner / 2: break
                        box(tomes[rnd.randrange(4)], (ox + x + w / 2, y + 0.04, z + 0.02 + hh / 2), (w, 0.2, hh)); x += w + 0.006
                    x += 0.05
                elif r0 < (0.28 if var == 'a' else 0.52):                         # ม้วนคัมภีร์
                    q = Vector((0, 0, 1)).rotation_difference(Vector((1, 0, 0))).to_matrix().to_4x4()
                    bmesh.ops.create_cone(scroll, cap_ends=True, segments=10, radius1=0.045, radius2=0.045, depth=0.24, matrix=Matrix.Translation((ox + x + 0.12, y, z + 0.065)) @ q)
                    x += 0.28
                elif r0 < 0.94:                                                    # โหลประกายทอง
                    r = rnd.uniform(0.062, 0.078); hh = rnd.uniform(0.17, 0.25) * (0.9 if ri == rows - 1 else 1); z0 = z + 0.02; xc = x + r + 0.01
                    bmesh.ops.create_cone(glass, cap_ends=True, segments=12, radius1=r * 0.9, radius2=r, depth=hh * 0.85, matrix=Matrix.Translation((ox + xc, y, z0 + hh * 0.425)))
                    bmesh.ops.create_cone(glass, cap_ends=True, segments=12, radius1=r, radius2=r * 0.55, depth=hh * 0.15, matrix=Matrix.Translation((ox + xc, y, z0 + hh * 0.925)))
                    bmesh.ops.create_cone(lids, cap_ends=True, segments=12, radius1=r * 0.62, radius2=r * 0.6, depth=0.03, matrix=Matrix.Translation((ox + xc, y, z0 + hh + 0.012)))
                    lit = rnd.random() > 0.07; k = rnd.choices(range(5), weights=[3, 3, 2, 2, 1])[0]
                    bmesh.ops.create_icosphere(sparks[k] if lit else dead, subdivisions=2, radius=r * rnd.uniform(0.45, 0.62), matrix=Matrix.Translation((ox + xc, y, z0 + hh * 0.45)))
                    if lit: jars.append({'p': (ox + xc, y, z0 + hh * 0.45), 'b': [0.45, 0.6, 0.8, 0.55, 1.0][k]})
                    x += 2 * r + rnd.uniform(0.06, 0.1)
                else: x += 0.2
        add('glass', glass, M['glass'], fine=True, smooth=True); add('lids', lids, M['lid'], fine=True)
        add('dead', dead, M['spark_dead'], fine=True, smooth=True); add('scroll', scroll, M['scroll'], smooth=True)
        for k, b in enumerate(sparks): add(f'spark{k}', b, M['spark'][k], fine=True, smooth=True)
        for k, b in enumerate(tomes): add(f'tome{k}', b, M['tome'][k])
        meta['pieces'][var] = {'ox': ox, 'jars': jars}
    # พื้นรับเงา
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=30); fl = obj('floor', bm, M['board'], 'floor'); fl.is_shadow_catcher = True
    # แสง: key ซ้ายบน (เงาตกขวาล่าง) + rim ทองจากหลังขวา + ambient เย็น
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 2.6; sun.angle = math.radians(12); sun.color = (0.88, 0.92, 1.0)
    so = bpy.data.objects.new('sun', sun); sc.collection.objects.link(so); so.rotation_euler = (math.radians(42), 0, math.radians(-135))
    rim = bpy.data.lights.new('rim', 'SUN'); rim.energy = 1.0; rim.angle = math.radians(8); rim.color = (1.0, 0.82, 0.5)
    ro = bpy.data.objects.new('rim', rim); sc.collection.objects.link(ro); ro.rotation_euler = (math.radians(65), 0, math.radians(150))
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.20, 0.26, 0.40, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.42
    # กล้องเกม (ออร์โธ เอียง acos(0.76))
    TH = math.acos(K)
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.sensor_fit = 'HORIZONTAL'; cam.clip_end = 200
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co; co.rotation_euler = (TH, 0, 0)
    dvec = Vector((0, math.sin(TH), -math.cos(TH))); uvec = Vector((0, math.cos(TH), math.sin(TH)))
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 12 if preview else samples
    try: sc.cycles.use_denoising = True
    except Exception: pass
    sc.cycles.max_bounces = 6; sc.cycles.transparent_max_bounces = 16
    sc.render.film_transparent = True; sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    try: sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Punchy'
    except Exception: sc.view_settings.view_transform = 'Filmic'
    sc.view_settings.exposure = 0.35; sc.render.resolution_percentage = 50 if preview else 100
    sc.render.use_freestyle = True; sc.render.line_thickness_mode = 'ABSOLUTE'
    vl = bpy.context.view_layer; fs = vl.freestyle_settings; fs.crease_angle = math.radians(128)
    ls = fs.linesets[0] if fs.linesets else fs.linesets.new('L')
    ls.select_by_visibility = True; ls.select_by_collection = True; ls.select_silhouette = True; ls.select_border = True; ls.select_crease = True
    if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new('line')
    ls.linestyle.color = (0.08, 0.05, 0.04)
    screen = lambda p: (p[0], p[1] * K + p[2] * SN)

    def shoot(x0, y0, x1, y1, wpx, hpx, path):
        cam.ortho_scale = x1 - x0
        co.location = Vector(((x0 + x1) / 2, 0, 0)) + uvec * ((y0 + y1) / 2) - dvec * 60
        sc.render.resolution_x = wpx; sc.render.resolution_y = hpx; sc.render.filepath = path
        bpy.ops.render.render(write_still=True); print('เรนเดอร์ →', path, wpx, 'x', hpx)

    for var in variants:
        m = meta['pieces'][var]; ox = m['ox']
        # B: ตู้ (ซ่อนอีกแบบ + พื้นซ่อนจากกล้อง)
        for cname, c in cols.items():
            for o in c.objects:
                o.hide_render = not (cname.startswith(var + '_') or cname == 'floor'); o.visible_camera = cname != 'floor'
        ls.collection = cols[f'{var}_main']; sc.render.line_thickness = 1.0; ls.linestyle.thickness = 5.0 * (0.5 if preview else 1)
        bpy.context.view_layer.update(); xs, ys = [], []
        for cname in (f'{var}_main', f'{var}_fine'):
            for o in cols[cname].objects:
                for v in o.data.vertices: sx, sy = screen(o.matrix_world @ v.co); xs.append(sx); ys.append(sy)
        x0, x1, y0, y1 = min(xs) - 0.12, max(xs) + 0.12, min(ys) - 0.12, max(ys) + 0.12
        wpx, hpx = math.ceil((x1 - x0) * RES_B), math.ceil((y1 - y0) * RES_B); x1, y1 = x0 + wpx / RES_B, y0 + hpx / RES_B
        shoot(x0, y0, x1, y1, wpx, hpx, os.path.join(outdir, f'{var}.png'))
        px = lambda p: [round((screen(p)[0] - x0) * RES_B, 2), round((y1 - screen(p)[1]) * RES_B, 2)]
        m['anchor'] = px((ox, -D / 2 - 0.03, 0.0)); m['px'] = [wpx, hpx]
        dg = bpy.context.evaluated_depsgraph_get(); vis = []
        for j in m['jars']:
            p = Vector(j['p']); hit, loc, nor, idx, ob, _ = sc.ray_cast(dg, p - dvec * 20, dvec)
            if hit and ob is not None and (ob.name.startswith(f'{var}_spark') or ob.name.startswith(f'{var}_glass')) and (loc - p).length < 0.5: vis.append(px(tuple(p)) + [j['b']])
        m['jarpx'] = vis; print(var, 'โหลที่เห็น', len(vis), '/', len(m['jars']))
        # A: เงาบนพื้น (เฉพาะ shadow catcher เห็นในกล้อง ตู้ซ่อนจากกล้องแต่ยังบังแสง)
        for cname, c in cols.items():
            for o in c.objects: o.visible_camera = cname == 'floor'
        sc.render.use_freestyle = False
        gx0, gx1 = ox - W / 2 - A_PAD, ox + W / 2 + A_PAD + 1.6      # เงาตกขวาล่าง (ขวา + ใต้ เพิ่ม)
        gy0, gy1 = -(D / 2 + A_PAD + 1.4), D / 2 + A_PAD               # พิกัด Blender (y ขึ้น = เหนือ)
        rim.use_shadow = False                                          # เงาบนพื้นมาจากแสงหลักซ้ายบนเท่านั้น
        wpx, hpx = round((gx1 - gx0) * PX * 2), round((gy1 - gy0) * K * PX * 2)
        shoot(gx0, gy0 * K, gx1, gy1 * K, wpx, hpx, os.path.join(outdir, f'{var}_shd.png'))
        m['shd'] = {'x0': gx0 - ox, 'x1': gx1 - ox, 'n': gy1, 's': -gy0}    # เทียบกลางตู้ (ม.) • n/s = ระยะเหนือ/ใต้ของกลางตู้ (แมพ)
        sc.render.use_freestyle = True; rim.use_shadow = True
    json.dump(meta, open(os.path.join(outdir, 'meta.json'), 'w'), indent=1)
    print('meta →', os.path.join(outdir, 'meta.json'))


def footprint(gx, gy):
    """ช่องชนของตู้ (ฐาน 2.1 × 0.66 ม. — ตรงแกน ไม่หมุน): จุดยึด (gx, gy) = ขอบใต้กลางฐาน"""
    x0, x1, y0, y1 = gx - (SHELF_W + 0.1) / 2, gx + (SHELF_W + 0.1) / 2, gy - SHELF_D - 0.06, gy
    out = []
    for ty in range(int(math.floor(y0)), int(math.ceil(y1))):
        for tx in range(int(math.floor(x0)), int(math.ceil(x1))):
            ov = (min(x1, tx + 1) - max(x0, tx)) * (min(y1, ty + 1) - max(y0, ty))
            if ov >= 0.16: out.append([tx, ty])
    return out


def install(src):
    from PIL import Image
    from hel3d import paint
    from cave3d import heightfield, load_tiles
    d, _ = load_tiles(MAP_ID)
    meta = json.load(open(os.path.join(src, 'meta.json')))
    hf = heightfield(MAP_ID); feats = hf['arc']
    data = {'map': MAP_ID, 'cave': 1, 'ground': [], 'pieces': []}
    sc = STORE_B / RES_B
    for var, m in meta['pieces'].items():
        im = Image.open(os.path.join(src, var + '.png')).convert('RGBA')
        im = im.resize((round(im.width * sc), round(im.height * sc)), Image.LANCZOS)
        im = paint(im, sat=1.2)
        l, t, r, b = im.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox()
        l, t, r, b = max(0, l - 2), max(0, t - 2), min(im.width, r + 2), min(im.height, b + 2)
        im = im.crop((l, t, r, b)); key = f'bake_arc_shelf_{var}'
        im.save(os.path.join(ROOT, 'assets', key + '.webp'), 'WEBP', quality=90, method=6)
        m['key'] = key; m['ax'] = round(m['anchor'][0] * sc - l, 1); m['ay'] = round(m['anchor'][1] * sc - t, 1)
        m['jarsI'] = [[round(j[0] * sc - l, 1), round(j[1] * sc - t, 1), j[2]] for j in m['jarpx']]
        # เงา: ย่อเป็น 40 px/ม. ยืด ×1/0.76 (ผ้าใบพื้นไม่ถูกบีบ) • เงาอ่อนลง (ถ้ำมืด)
        s = m['shd']; sh = Image.open(os.path.join(src, var + '_shd.png')).convert('RGBA')
        sh = sh.resize((round((s['x1'] - s['x0']) * PX), round((s['n'] + s['s']) * PX)), Image.LANCZOS)
        sh.putalpha(sh.getchannel('A').point(lambda v: int(v * 0.7)))
        sk = f'bake_arc_shelf_{var}_shd'; sh.save(os.path.join(ROOT, 'assets', sk + '.webp'), 'WEBP', quality=88, method=6)
        m['shdKey'] = sk
        print('ติดตั้ง', key, im.size, 'โหล', len(m['jarsI']), '•', sk, sh.size)
    for (name, gx, gy, var) in SHELVES:
        m = meta['pieces'][var]; s = m['shd']; cy = gy - SHELF_D / 2 - 0.03
        data['ground'].append({'img': m['shdKey'], 'x': round(gx + s['x0'], 3), 'y': round(cy - s['n'], 3), 'w': round(s['x1'] - s['x0'], 3), 'h': round(s['n'] + s['s'], 3)})
        data['pieces'].append({'id': name, 'img': m['key'], 'x': gx, 'y': gy, 'ax': m['ax'], 'ay': m['ay'], 'scale': PX / STORE_B,
                               'block': footprint(gx, gy), 'jars': m['jarsI'], 'glint': GLOW_COL,
                               'light': {'dx': 0, 'dy': -0.4, 'lr': 2.8, 'col': GLOW_COL}})
    # ประกายโหลในช่องผนัง/ตราผนึกประตู (ภาพอบอยู่ในผนังแล้ว — ชิ้นไม่มีภาพ วาดแค่จุดกะพริบ + แสง) • wall = ใช้เมื่อภาพผนังอบแสดงอยู่
    for g in wall_glints(feats):
        data['pieces'].append({'id': g['id'], 'img': None, 'wall': 1, 'x': g['x'], 'y': g['y'], 'ax': 0, 'ay': 0, 'scale': 1, 'block': [],
                               'jars': g['jars'], 'glint': GLOW_COL, 'light': g['light']})
    js = ("'use strict';\n// สร้างอัตโนมัติโดย tools/archive3d.py --install — อย่าแก้ด้วยมือ (แก้ใน tools/archive3d.py แล้วติดตั้งใหม่)\n"
          "// ชั้นวางสลักผนัง + ประตูห้องนิรภัย + ชั้นวางตั้งอิสระ Archive Depths (docs/RENDER3D_PLAN.md #9) — รวมเข้า BAKE_DATA ของ js/bake_data.js (โหลดต่อจากไฟล์นั้น)\n"
          "// ground = เงาตู้บนพื้น (แบบ A) • pieces ที่มี img = ตู้ตั้งอิสระ (แบบ B: x,y = จุดยึด/จุดเรียงความลึก) • img null + wall = ประกายโหล/ตราผนึก\n"
          "//   ของช่องชั้นวาง/ประตูที่อบอยู่ในภาพผนัง (tools/cave3d.py --map archive) — วาดเฉพาะเมื่อภาพผนังอบแสดงอยู่ • jars = px เทียบจุดยึด\n"
          "// cave = ผูกกับภาพผนังถ้ำอบ CAVE_BAKE.archive (hash ผังช่องทั้งแมพ) — ผังไม่ตรง = ไม่วางอะไรเลย (กลับไปผนังโค้ด)\n"
          f"BAKE_DATA.{MAP_ID} = {json.dumps(data, separators=(',', ':'))};\n")
    open(os.path.join(ROOT, 'js', 'bake_data_archive.js'), 'w').write(js)
    print('เขียน js/bake_data_archive.js', len(data['pieces']), 'ชิ้น')
    from slice_sheet import manifest
    manifest()


if __name__ == '__main__':
    a = sys.argv
    arg = lambda k, dflt: a[a.index(k) + 1] if k in a else dflt
    if '--plan' in a:
        from cave3d import heightfield, check
        hf = heightfield(MAP_ID); feats = hf['arc']
        for f in feats: print(f)
        print('ประตู', sum(f['kind'] == 'door' for f in feats), 'ช่องชั้นวาง', sum(f['kind'] == 'niche' for f in feats), 'กรอบเรนเดอร์', rects(feats, hf['W'], hf['H']))
        check(hf); plan_png(hf, feats, arg('--out', '/tmp/archive3d_plan.png'))
    elif '--install' in a: install(a[a.index('--install') + 1])
    else: build_b(int(arg('--samples', 48)), arg('--out', '/tmp/archive3d'), '--preview' in a)
