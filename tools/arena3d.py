"""โคลอสเซียม v2 สำหรับลานประลอง PvP (MAP_DEFS.arena 34×34) — โมเดลด้วย bpy แล้วอบเป็นภาพ 2D (docs/RENDER3D_PLAN.md ข้อ #4)

สไตล์ (เจ้าของเลือก 2026-10-03): "งาน premium 3D กลิ่นอาย Ragnarok" — สว่าง อุ่น สีอิ่ม ก้อนกลมมนน่ารัก เส้นขอบสะอาด (Freestyle บาง) ไม่ใช้ฟิลเตอร์ภาพวาดหนัก

หน่วย: 1 ช่องในเกม = 1 เมตร • กลางลาน = จุด (17, 17) ของแมพ = (0, 0, 0) ใน Blender (แกน Y ของ Blender = ทิศเหนือ = y แมพลดลง)
กล้อง: ออร์โธเอียง acos(0.76) จากแนวดิ่ง = มุมเดียวกับกล้องในเกม (R.K = 0.76) • แดดซ้ายบน z = −135° (เงาตกขวาล่างเหมือนทั้งเกม)
ผังช่อง/การชน/จุดเกิด ไม่เปลี่ยน (maps.js genArena) — ดึงผังจริงจากเกม (--extract) แล้วเทียบ hash ตอนติดตั้ง

ผลลัพธ์ (โหลดตอนเข้าแมพเท่านั้น — Art.need):
  • assets/bake_arena_ground.webp  ภาพพื้นทั้งแมพ 1360×1360 (แบบ A — ยืด ×1/0.76 แล้วเกมบีบกลับ) แทน arena_ground.webp เดิม (ยังเก็บไว้เป็นทางสำรอง)
      พื้นทรายวาดเป็น texture (รอยเท้า รอยดาบ รอยลาก กรวด แหวนคราด) • เหรียญหินอ่อนกลางลาน + ตราวาลค์นัตทอง/แดง
      โพเดียมหินอ่อนขอบทอง + โล่กลมฝั่งเหนือ • อัฒจันทร์หินทราย 5 ชั้นขอบหินอ่อน + ผู้ชมตัวกลม ~1,000 คน (ท่านั่ง = เฟรมฐาน)
      กำแพงซุ้มโค้งนอกแบบโคลอสเซียมโรม (เจ้าของเลือก 2026-10-03: ฝั่งใต้เป็นซากพัง) — ฝั่งเหนือ 2 ชั้นซุ้ม + ผนังทึบบนสุด + ธงแขวน/โล่/เสาธง
        (ฝั่งเหนือสูงเกินขอบแมพ = โดนตัดหัวตามกรอบกล้อง เห็นเต็มเฉพาะมุมซ้าย/ขวาบน) • ฝั่งใต้เหลือแค่ตอเสา/ซุ้มชั้นล่างสูง ≤ 2.9 ม. + เศษหิน หญ้า ไม้เลื้อย
      นอกกำแพง = ทุ่งหญ้า + ทางดินรอบอาคาร • ประตูอุโมงค์ฝั่งใต้ (ตรงทางเดินไปวาร์ป) + ซุ้มโค้งหน้าประตู
  • assets/bake_arena_front_*.webp  ชั้นหน้า (แบบ B — สไปรต์ตั้งตรงเรียงความลึกกับตัวละคร, ภาพจริงตัดจากภาพพื้นความละเอียด ×2 ด้วยหน้ากากต่อกลุ่ม)
      podium = โพเดียม/ขอบทองฝั่งใต้ + ซุ้มประตู + ผนังอุโมงค์ (เรียงที่ y = ผนังในฝั่งใต้) • torch*/flag* = เสาคบเพลิง/เสาธงฝั่งใต้ทีละต้น (เรียงที่ฐานของมัน)
      → ตัวละครที่ยืนหลังเสา/ซุ้มถูกบังถูกต้อง และจางลงเมื่อผู้เล่นอยู่หลัง (js/bake.js Bake.draw — fadeAll รวมผู้เล่นคนอื่น)
  • assets/bake_arena_crowd.webp  ชีตผู้ชมขยับ 4 เฟรม (เฉพาะคนที่เปลี่ยนท่า วาดทับท่านั่งในภาพพื้น) ตัดเป็นช่อง 64 px เก็บเฉพาะช่องที่มีภาพ
      f1 ขยับเล็กน้อย (ยกมือข้างเดียว 18%) • f2/f3 เชียร์ (ชูสองมือ/ลุกยืน สลับกลุ่ม) • f4 คลื่นเชียร์ (ลุกทั้งหมด ชูมือ โบกผ้า) — js/feel.js F.drawCrowd
  • js/bake_data_arena.js  BAKE_DATA.arena (hash ผังทั้งแมพ — ไม่ตรง = ใช้ภาพเดิม + console.warn ครั้งเดียว)

กฎมุมกล้อง: จุดสูง h ม. ยื่นขึ้นเหนือ 0.855h ช่อง — check() รายงานจุดของภาพพื้นที่ยื่นทับตัวละครบนช่องเดินได้ (ต้องเป็น 0 — ของที่บังได้อยู่ในชั้นหน้าแล้ว)

ใช้:
  python3 tools/arena3d.py --extract                               (node + playwright) → tools/arena3d_tiles.json
  /tmp/bvenv/bin/python tools/arena3d.py --render [--samples 20] [--ss 2] [--preview] [--only ground,front,crowd] [--check] [--out /tmp/arena3d]
      → <out>/ground.png (×ss) + mask_*.png (หน้ากากชั้นหน้า) + crowd_f1..f4.png (×1) + meta.json  • --check = สร้างฉากแล้วตรวจการบังอย่างเดียว
  python3 tools/arena3d.py --install /tmp/arena3d                  (โทนสี, ภาพพื้น, ชั้นหน้า, ชีตผู้ชม, js/bake_data_arena.js, manifest)
  ค่าที่ใช้จริง: --samples 20 --ss 2 (ภาพพื้น ~15–25 นาทีบน CPU 2–3 เธรด) • BTHREADS=2 จำกัดเธรด (มีงาน Blender อื่นรันพร้อมกัน)
"""
import math, os, sys, json, random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
TILES = os.path.join(ROOT, 'tools', 'arena3d_tiles.json')
MAP_ID = 'arena'
MAPW = 34
K = 0.76; TH = math.acos(K); SN = math.sin(TH); SH = SN / K     # SH = 0.855 ช่องต่อความสูง 1 ม.
PX = 40                      # พิกเซลต่อช่อง (TILE)
DIRT = 3                     # T.DIRT (ช่องเดินได้ของลาน)
R0 = MAPW / 2 - 2.8          # รัศมีลานทราย (ตรงกับ maps.js genArena)
# คบเพลิง: ทุก 30° เว้นช่วงประตูใต้ (ตรงกับ maps.js genArena → this.torches — ห้ามเปลี่ยน: เปลวไฟวาดในเกมตามพิกัดนี้)
TORCH_ANGLES = [math.radians(d) for d in range(0, 360, 30) if abs(((d - 270 + 180) % 360) - 180) > 20]
TORCH_R = R0 + 0.28
TORCH_TOP = 0.7 + 1.3 + 0.22   # ความสูงปากชาม (เมตร)
FLAG_ANGLES = [i / 8 * 2 * math.pi + math.pi / 8 for i in range(8)]
FLAG_R = R0 + 0.3
# อัฒจันทร์ (ลดจาก 12 เหลือ 5 ชั้น → กำแพงซุ้มโค้งนอกเข้ามาอยู่ในกรอบภาพที่มุมแมพ)
PODIUM_H, PODIUM_T = 0.7, 0.55
TIERS, TD, TZ = 5, 0.8, 0.45
RR = R0 + PODIUM_T
RMAX = RR + TIERS * TD                    # 18.75
WALL_IN, WALL_T = RMAX, 1.1
WALL_OUT = WALL_IN + WALL_T
NB = 72                                    # จำนวนช่วงซุ้มรอบวง
RUIN_MAX = 2.9                             # ฝั่งใต้ (ซากพัง) สูงไม่เกิน (ม.) — ไม่ยื่นทับตัวละคร (check)
FRONT_Y = MAPW / 2 + R0                    # 31.2 = ผนังในฝั่งใต้ → จุดเรียงความลึกของชั้นหน้า "podium"
CELL = 64                                  # ช่องของชีตผู้ชม (px ที่ ×1)
IMG_GROUND, IMG_FRONT, IMG_CROWD = 'bake_arena_ground', 'bake_arena_front', 'bake_arena_crowd'


def fnv(tiles):
    h = 0x811c9dc5
    for v in tiles:
        h ^= v; h = (h * 0x01000193) & 0xffffffff
    return h


# ---------------------------------------------------------------- ดึงผังช่องจากเกม (แบบ tools/town3d.py)
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
  const r = await p.evaluate(id => { const m = new GameMap(id, { lite: true });
    return { w: m.w, h: m.h, tiles: Array.from(m.tiles), portals: m.portals, torches: m.torches, arena: m.arena }; }, process.argv[3]);
  console.log(JSON.stringify(r)); await b.close(); })();"""
    f = os.path.join(tempfile.gettempdir(), 'arena3d_extract.js'); open(f, 'w').write(js)
    env = dict(os.environ); env.setdefault('NODE_PATH', subprocess.check_output(['npm', 'root', '-g'], text=True).strip())
    out = subprocess.check_output(['node', f, f'http://127.0.0.1:{srv.server_address[1]}/index.html', MAP_ID], env=env, text=True)
    srv.shutdown()
    r = json.loads(out.strip().splitlines()[-1]); w, h = r['w'], r['h']
    data = {'map': MAP_ID, 'w': w, 'h': h, 'hash': fnv(r['tiles']),
            'rows': [''.join('0123456789AB'[v] for v in r['tiles'][y * w:(y + 1) * w]) for y in range(h)],
            'portals': r['portals'], 'torches': r['torches'], 'arena': r['arena']}
    json.dump(data, open(TILES, 'w'), indent=0)
    print('ผังช่อง →', TILES, f'{w}×{h}', 'hash', data['hash'], 'วาร์ป', [(p['x'], p['y']) for p in r['portals']], 'คบเพลิง', len(r['torches']))


def load_tiles():
    d = json.load(open(TILES))
    d['T'] = [[int(c, 16) for c in s] for s in d['rows']]
    return d


def gate_info(d):
    """ประตูใต้: ทางเดินที่เกมขุด (carvePath แปรง 3×3) ไปวาร์ป → ศูนย์กลาง/ความกว้างอุโมงค์ (พิกัด Blender x) ให้ทางเดินทั้งเส้นอยู่ในช่องประตู"""
    T = d['T']; cx = MAPW / 2
    xs = [x for y in range(int(cx + R0), d['h']) for x in range(d['w']) if T[y][x] == DIRT]
    x0, x1 = min(xs), max(xs) + 1               # ช่วงช่องเดินได้ใต้ลาน (เช่น 16..19)
    return (x0 + x1) / 2 - cx, (x1 - x0) / 2 + 0.35   # ศูนย์กลาง (Blender x), ครึ่งความกว้างช่องประตู (เผื่อตัวละคร 0.35)


# ---------------------------------------------------------------- พื้นทราย (texture วาดด้วย numpy/PIL — พิกัดภาพ = พิกัดแมพ)
TEX_M = 30.0                 # texture ครอบคลุม 30×30 ม. รอบกลางลาน
def paint_sand(outdir, N=1920):
    import numpy as np
    from PIL import Image, ImageDraw, ImageFilter
    rng = np.random.default_rng(11); rnd = random.Random(11)
    S = N / TEX_M
    def P(mx, my): return ((mx - 17) / TEX_M + 0.5) * N, ((my - 17) / TEX_M + 0.5) * N   # พิกัดแมพ → px
    def vnoise(n, octs):
        acc = np.zeros((N, N), np.float32); amp = 1.0; tot = 0.0
        for o in range(octs):
            g = n * 2 ** o
            a = (rng.random((g, g)) * 255).astype(np.uint8)
            acc += np.asarray(Image.fromarray(a).resize((N, N), Image.BICUBIC), np.float32) / 255 * amp; tot += amp; amp *= 0.5
        return acc / tot
    n1 = vnoise(5, 6); n2 = vnoise(24, 3)
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    rr = np.hypot(xx / S - TEX_M / 2, yy / S - TEX_M / 2)
    base = np.array([236, 200, 140], np.float32)                 # ทรายทองอุ่น (โทน RO)
    col = base[None, None, :] * (0.88 + 0.2 * n1[..., None] + 0.05 * (n2[..., None] - 0.5))
    dark = Image.new('L', (N, N), 0); light = Image.new('L', (N, N), 0); hgt = Image.new('L', (N, N), 128)
    dd, ld, hd = ImageDraw.Draw(dark), ImageDraw.Draw(light), ImageDraw.Draw(hgt)
    # แหวนคราดจาง ๆ (รอยกวาดก่อนประลอง — ถูกรอยเท้าทับ)
    r = 2.9
    while r < R0 - 0.5:
        x0, y0 = P(17 - r, 17 - r); x1, y1 = P(17 + r, 17 + r)
        dd.ellipse((x0, y0, x1, y1), outline=26, width=2); ld.ellipse((x0 + 2, y0 + 2, x1 + 2, y1 + 2), outline=14, width=1)
        r += 0.62
    # คราบสนามต่อสู้ (ทรายถูกเหยียบจนเข้ม) — กลุ่มใหญ่รอบกลาง + หน้าหุ่นฝึก
    blob = Image.new('L', (N, N), 0); bd = ImageDraw.Draw(blob)
    for _ in range(26):
        a = rnd.random() * 6.283; rad = rnd.random() ** 0.7 * (R0 - 3)
        mx, my = 17 + math.cos(a) * rad, 17 + math.sin(a) * rad
        s = (0.7 + rnd.random() * 1.8) * S; cx, cy = P(mx, my)
        bd.ellipse((cx - s, cy - s * 0.8, cx + s, cy + s * 0.8), fill=rnd.randint(18, 40))
    for x in (15.5, 17.5, 19.5):
        cx, cy = P(x, 10.3); bd.ellipse((cx - 0.9 * S, cy - 0.5 * S, cx + 0.9 * S, cy + 0.6 * S), fill=42)
    blob = blob.filter(ImageFilter.GaussianBlur(S * 0.5))
    # รอยเท้า (เดินเป็นแนว สลับซ้ายขวา) — กดลงในทราย: เข้มกลาง ขอบล่างขวาสว่าง (แดดซ้ายบน)
    def foot(mx, my, hd_, s=1.0):
        c, sn = math.cos(hd_), math.sin(hd_)
        for (f, w, l) in ((0.07, 0.055, 0.075), (-0.075, 0.045, 0.05)):   # ปลายเท้า / ส้นเท้า
            px_, py_ = mx + c * f * s, my + sn * f * s
            pts = [P(px_ + c * l * s * math.cos(t) - sn * w * s * math.sin(t), py_ + sn * l * s * math.cos(t) + c * w * s * math.sin(t)) for t in [i * 0.524 for i in range(12)]]
            dd.polygon(pts, fill=95); hd.polygon(pts, fill=70)
            ld.polygon([(x + 1.6, y + 1.6) for x, y in pts], fill=40)
    for _ in range(44):
        a = rnd.random() * 6.283; rad = rnd.random() ** 0.6 * (R0 - 1.2)
        mx, my = 17 + math.cos(a) * rad, 17 + math.sin(a) * rad; hd_ = rnd.random() * 6.283
        for k in range(rnd.randint(5, 18)):
            hd_ += rnd.gauss(0, 0.25); mx += math.cos(hd_) * 0.32; my += math.sin(hd_) * 0.32
            if math.hypot(mx - 17, my - 17) > R0 - 0.5: break
            side = 1 if k % 2 else -1
            foot(mx - math.sin(hd_) * 0.09 * side, my + math.cos(hd_) * 0.09 * side, hd_)
    # รอยดาบ/ขวานขีดทราย (ร่อง: ขอบบนซ้ายมืด ขอบล่างขวาสว่าง) + รอยลาก (เส้นคู่ยาว)
    for i in range(80):
        a = rnd.random() * 6.283; rad = rnd.random() ** 0.8 * (R0 - 1.5)
        mx, my = 17 + math.cos(a) * rad, 17 + math.sin(a) * rad
        hd_ = rnd.random() * 6.283; L = 0.4 + rnd.random() * 1.4; bend = rnd.gauss(0, 0.6); n = 10
        pts = []
        for k in range(n + 1):
            t = k / n; h2 = hd_ + bend * (t - 0.5)
            pts.append(P(mx + math.cos(h2) * L * t, my + math.sin(h2) * L * t))
        w = 2 if i % 3 else 3
        dd.line([(x - 1, y - 1) for x, y in pts], fill=120, width=w); hd.line(pts, fill=60, width=w)
        ld.line([(x + 1.5, y + 1.5) for x, y in pts], fill=70, width=1)
    for _ in range(7):
        a = rnd.random() * 6.283; rad = rnd.random() * (R0 - 4)
        mx, my = 17 + math.cos(a) * rad, 17 + math.sin(a) * rad; hd_ = rnd.random() * 6.283; L = 2 + rnd.random() * 3
        for off in (-0.12, 0.12):
            pts = [P(mx + math.cos(hd_) * L * t - math.sin(hd_) * off, my + math.sin(hd_) * L * t + math.cos(hd_) * off) for t in [k / 12 for k in range(13)]]
            dd.line(pts, fill=60, width=4); ld.line([(x + 2, y + 2) for x, y in pts], fill=30, width=2)
    # กรวด/เปลือกหอยเล็ก ๆ
    peb = Image.new('L', (N, N), 0); pd = ImageDraw.Draw(peb)
    for _ in range(1400):
        a = rnd.random() * 6.283; rad = R0 * math.sqrt(rnd.random())
        cx, cy = P(17 + math.cos(a) * rad, 17 + math.sin(a) * rad); s = 1 + rnd.random() * 2.2
        pd.ellipse((cx - s, cy - s * 0.8, cx + s, cy + s * 0.8), fill=rnd.randint(120, 255))
    D = np.asarray(dark.filter(ImageFilter.GaussianBlur(0.7)), np.float32) / 255
    Lt = np.asarray(light.filter(ImageFilter.GaussianBlur(0.7)), np.float32) / 255
    B = np.asarray(blob, np.float32) / 255; Pb = np.asarray(peb, np.float32) / 255
    rim = np.clip((rr - (R0 - 1.2)) / 1.2, 0, 1) ** 2            # ทรายริมกำแพงเข้มขึ้น (ฝุ่นสะสม + เงา)
    col = col * (1 - 0.42 * D[..., None]) * (1 - 0.35 * B[..., None]) * (1 - 0.18 * rim[..., None])
    col = col + (255 - col) * (0.3 * Lt[..., None])
    pc = np.array([168, 140, 110], np.float32)
    col = col * (1 - Pb[..., None] * 0.8) + pc[None, None, :] * (Pb[..., None] * 0.8)
    Image.fromarray(np.clip(col, 0, 255).astype(np.uint8)).save(os.path.join(outdir, 'sand_col.png'))
    H = np.asarray(hgt.filter(ImageFilter.GaussianBlur(1.0)), np.float32) + (n2 - 0.5) * 30 + Pb * 40
    Image.fromarray(np.clip(H, 0, 255).astype(np.uint8)).save(os.path.join(outdir, 'sand_h.png'))
    print('texture ทราย →', outdir, N, 'px', flush=True)


# ---------------------------------------------------------------- ฉาก
def build(samples, outdir, ss, preview, only, check_only):
    import bpy, bmesh
    from mathutils import Vector, Matrix, Euler
    from bpy_extras.object_utils import world_to_camera_view
    os.makedirs(outdir, exist_ok=True)
    d = load_tiles()
    GX, GHALF = gate_info(d)
    print('ประตูใต้: กลาง x', GX, 'ครึ่งกว้าง', GHALF, flush=True)
    if not check_only: paint_sand(outdir)
    rnd = random.Random(7)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    cols = {}

    def coll(n):
        if n not in cols:
            c = bpy.data.collections.new(n); sc.collection.children.link(c); cols[n] = c
        return cols[n]

    def obj(name, bm, material, groups=('ink',), smooth=False, merge=True):
        if merge: bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
        me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new(name, me)
        for gname in groups: coll(gname).objects.link(o)
        me.materials.append(material)
        for p in me.polygons: p.use_smooth = smooth
        return o

    # ---------- วัสดุ ----------
    def mat(name, col, rough=0.8, metal=0.0, noise=0.0, bump=0.0, scale=6.0, emit=None):
        m = bpy.data.materials.new(name); m.use_nodes = True
        nt = m.node_tree; b = nt.nodes['Principled BSDF']
        b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
        if noise or bump:
            tex = nt.nodes.new('ShaderNodeTexNoise'); tex.inputs['Scale'].default_value = scale; tex.inputs['Detail'].default_value = 6
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
        if emit:
            b.inputs['Emission Color'].default_value = (*emit[0], 1); b.inputs['Emission Strength'].default_value = emit[1]
        return m

    def sand_mat():
        m = bpy.data.materials.new('sand'); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
        b.inputs['Roughness'].default_value = 0.95
        tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
        mp.inputs['Scale'].default_value = (1 / TEX_M, 1 / TEX_M, 1); mp.inputs['Location'].default_value = (0.5, 0.5, 0)
        nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
        ic = nt.nodes.new('ShaderNodeTexImage'); ic.extension = 'EXTEND'
        ic.image = bpy.data.images.load(os.path.join(outdir, 'sand_col.png')) if not check_only else None
        ih = nt.nodes.new('ShaderNodeTexImage'); ih.extension = 'EXTEND'
        if not check_only:
            ih.image = bpy.data.images.load(os.path.join(outdir, 'sand_h.png')); ih.image.colorspace_settings.name = 'Non-Color'
        nt.links.new(mp.outputs['Vector'], ic.inputs['Vector']); nt.links.new(mp.outputs['Vector'], ih.inputs['Vector'])
        nt.links.new(ic.outputs['Color'], b.inputs['Base Color'])
        bn = nt.nodes.new('ShaderNodeBump'); bn.inputs['Strength'].default_value = 0.45; bn.inputs['Distance'].default_value = 0.03
        nt.links.new(ih.outputs['Color'], bn.inputs['Height']); nt.links.new(bn.outputs['Normal'], b.inputs['Normal'])
        return m

    M_SAND = sand_mat()
    M_MARBLE = mat('marble', (0.86, 0.80, 0.70), 0.55, noise=0.08, bump=0.08, scale=4)
    M_SST = mat('sandstone', (0.80, 0.58, 0.38), 0.85, noise=0.16, bump=0.25, scale=3)      # หินทรายอุ่น (ชั้นคู่)
    M_SST2 = mat('sandstone2', (0.72, 0.50, 0.33), 0.85, noise=0.16, bump=0.25, scale=3)    # หินทรายเข้ม (ชั้นคี่)
    M_WALL = mat('wall', (0.84, 0.66, 0.46), 0.85, noise=0.18, bump=0.3, scale=2.2)        # กำแพงนอก
    M_WALLD = mat('walld', (0.66, 0.48, 0.32), 0.9, noise=0.2, bump=0.3, scale=2.2)        # เศษหิน/ซากเก่า
    M_DARK = mat('dark', (0.10, 0.07, 0.06), 0.95)                                         # ในซุ้ม/ในอุโมงค์
    M_GOLD = mat('gold', (0.95, 0.70, 0.25), 0.28, metal=1.0)
    M_BRONZE = mat('bronze', (0.75, 0.45, 0.18), 0.35, metal=1.0)
    M_RED = mat('red', (0.70, 0.07, 0.05), 0.65)
    M_BLUE = mat('blue', (0.08, 0.22, 0.62), 0.6)
    M_ENAMEL = mat('enamel', (0.62, 0.05, 0.04), 0.35)
    M_GRASS = mat('grass', (0.30, 0.62, 0.16), 0.9, noise=0.25, bump=0.15, scale=1.5)
    M_PATH = mat('path', (0.62, 0.46, 0.28), 0.95, noise=0.25, bump=0.2, scale=3)
    M_LEAF = mat('leaf', (0.22, 0.55, 0.12), 0.8, noise=0.2, scale=8)
    M_LEAF2 = mat('leaf2', (0.38, 0.70, 0.18), 0.8)
    M_FLOWER = [mat('fl0', (1.0, 0.85, 0.2), 0.6), mat('fl1', (1.0, 0.95, 0.95), 0.6), mat('fl2', (0.95, 0.35, 0.5), 0.6)]
    SHIRTS = [(0.85, 0.12, 0.10), (0.12, 0.38, 0.88), (0.98, 0.76, 0.12), (0.18, 0.66, 0.22), (0.58, 0.22, 0.80),
              (0.94, 0.92, 0.86), (0.98, 0.48, 0.10), (0.08, 0.66, 0.66), (0.98, 0.48, 0.66), (0.16, 0.20, 0.45)]
    M_SHIRT = [mat(f'shirt{i}', c, 0.7) for i, c in enumerate(SHIRTS)]
    M_SKIN = [mat('skin0', (0.96, 0.74, 0.58), 0.6), mat('skin1', (0.84, 0.58, 0.40), 0.6), mat('skin2', (0.55, 0.34, 0.22), 0.6)]
    M_HAIR = [mat('hair0', (0.30, 0.16, 0.07), 0.6), mat('hair1', (0.06, 0.05, 0.05), 0.6), mat('hair2', (0.95, 0.78, 0.35), 0.6),
              mat('hair3', (0.75, 0.25, 0.08), 0.6), mat('hair4', (0.82, 0.82, 0.86), 0.6)]
    M_SCARF = [M_RED, mat('scarfgold', (0.98, 0.78, 0.15), 0.6), M_BLUE]

    P = lambda r, a, z: (r * math.cos(a), r * math.sin(a), z)
    GATE = math.atan2(-(R0 + 1), GX)                  # มุมกลางประตูใต้ (เยื้องตามทางเดินจริง)

    def in_gate(a, r, extra=0.0):
        """จุดที่มุม a รัศมี r อยู่ในช่องประตูใต้ (กว้างตามทางเดินที่เกมขุด)"""
        x, y = r * math.cos(a), r * math.sin(a)
        return y < 0 and abs(x - GX) < GHALF + extra

    def ring(bm, r0, r1, z0, z1, seg=240, gate=True, inner=True, outer=False, keep=None, top=True, gx=0.0):
        for i in range(seg):
            a0 = i / seg * 2 * math.pi; a1 = (i + 1) / seg * 2 * math.pi; am = (a0 + a1) / 2
            if gate and in_gate(am, (r0 + r1) / 2, gx): continue   # gx = เว้นช่องกว้างขึ้น (ปลายหยักซ่อนในผนังอุโมงค์)
            if keep and not keep(am): continue
            v = lambda r, a, z: bm.verts.new(P(r, a, z))
            if top: bm.faces.new([v(r0, a0, z1), v(r1, a0, z1), v(r1, a1, z1), v(r0, a1, z1)])
            if inner: bm.faces.new([v(r0, a0, z0), v(r0, a0, z1), v(r0, a1, z1), v(r0, a1, z0)])
            if outer: bm.faces.new([v(r1, a1, z0), v(r1, a1, z1), v(r1, a0, z1), v(r1, a0, z0)])

    def box(bm, c, s, rot=0.0, tilt=None):
        q = (Euler(tilt) if tilt else Euler((0, 0, rot))).to_quaternion()
        bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.LocRotScale(Vector(c), q, Vector(s)))

    south = lambda a: math.sin(a) < 0.02         # ครึ่งใต้ (หันหลังให้กล้อง — เป็นชั้นหน้าได้)
    north = lambda a: not south(a)

    # ---------- พื้นทราย + ทางอุโมงค์ ----------
    bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, radius=R0 + 0.05, segments=200)
    obj('sand', bm, M_SAND, ('plain',))
    bm = bmesh.new(); box(bm, (GX, -R0 - 3.9, -0.005), (2 * GHALF + 0.8, 9.0, 0.02))   # เริ่มเหลื่อมเข้าในวงทราย (ขอบวงโค้ง ไม่เว้นช่องฟ้า)
    obj('gatefloor', bm, M_SAND, ('plain',))
    # เหรียญหินอ่อนกลางลาน + ตราวาลค์นัตทอง/ลงยาแดง (แบนราบ — ไม่บังใคร)
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=96, radius1=2.35, radius2=2.35, depth=0.03, matrix=Matrix.Translation((0, 0, 0.0)))
    obj('medallion', bm, M_MARBLE, ('ink',))
    bm = bmesh.new(); ring(bm, 2.3, 2.5, 0.0, 0.03, seg=96, gate=False, outer=True); obj('medal_ring', bm, M_GOLD, ('ink',))
    for nm, wdt, z, m in (('valk_gold', 0.24, 0.02, M_GOLD), ('valk_red', 0.13, 0.026, M_ENAMEL)):
        bm = bmesh.new(); s = 1.45
        for k in range(3):
            a = k * 2 * math.pi / 3; ox, oy = math.cos(a + math.pi / 2) * s * 0.35, math.sin(a + math.pi / 2) * s * 0.35
            pts = [(ox + math.cos(math.pi / 2 + j * 2 * math.pi / 3) * s, oy + math.sin(math.pi / 2 + j * 2 * math.pi / 3) * s) for j in range(3)]
            for j in range(3):
                (x0, y0), (x1, y1) = pts[j], pts[(j + 1) % 3]; L = math.hypot(x1 - x0, y1 - y0) + wdt
                box(bm, ((x0 + x1) / 2, (y0 + y1) / 2, z + k * 0.002 + j * 0.0007), (L, wdt, 0.02), math.atan2(y1 - y0, x1 - x0))
        obj(nm, bm, m, ('ink',) if nm == 'valk_gold' else ('plain',), merge=False)

    # ---------- โพเดียม + ขอบทอง (เหนือ = ภาพพื้น • ใต้ = ชั้นหน้า "podium") ----------
    for side, keep, grp in (('n', north, ('ink',)), ('s', south, ('ink', 'f_podium'))):
        bm = bmesh.new(); ring(bm, R0, RR, 0, PODIUM_H, keep=keep); obj('podium_' + side, bm, M_MARBLE, grp)
        bm = bmesh.new(); ring(bm, R0 - 0.06, RR + 0.02, PODIUM_H, PODIUM_H + 0.08, keep=keep); obj('trim_' + side, bm, M_GOLD, grp)
        bm = bmesh.new(); ring(bm, R0 - 0.03, R0, 0, 0.12, keep=keep); obj('plinth_' + side, bm, M_BRONZE, grp)
    # โล่กลมบนผนังโพเดียมฝั่งเหนือ (หันหากล้อง) — สลับแดง/น้ำเงิน/ทอง + ดุมทอง
    occupied = [a for a in TORCH_ANGLES] + FLAG_ANGLES
    bms = {M_RED: bmesh.new(), M_BLUE: bmesh.new(), M_GOLD: bmesh.new()}; boss = bmesh.new()
    k = 0
    for i in range(72):
        a = i / 72 * 2 * math.pi
        if not (0.15 < a < math.pi - 0.15) or min(abs((a - o + math.pi) % (2 * math.pi) - math.pi) for o in occupied) < 0.06: continue
        e = Euler((math.pi / 2, 0, a - math.pi / 2)).to_quaternion()
        mtx = Matrix.LocRotScale(Vector(P(R0 - 0.02, a, 0.38)), e, Vector((1, 1, 1)))
        bmesh.ops.create_cone(list(bms.values())[k % 3], cap_ends=True, segments=16, radius1=0.2, radius2=0.18, depth=0.05, matrix=mtx)
        bmesh.ops.create_uvsphere(boss, u_segments=8, v_segments=5, radius=0.05, matrix=Matrix.Translation(Vector(P(R0 - 0.06, a, 0.38))))
        k += 1
    for m_, b_ in bms.items(): obj('shield_' + m_.name, b_, m_, ('ink',))
    obj('shield_boss', boss, M_GOLD, ('plain',), smooth=True)

    # ---------- อัฒจันทร์ 5 ชั้น + ขอบหินอ่อน + ทางเดินขึ้น ----------
    def tier_z(i): return PODIUM_H + TZ * (i + 1)
    for i in range(TIERS):
        r0 = RR + i * TD; z = tier_z(i)
        bm = bmesh.new(); ring(bm, r0, r0 + TD, 0, z, gx=0.5); obj(f'tier{i}', bm, M_SST if i % 2 == 0 else M_SST2, ('ink',))
        bm = bmesh.new(); ring(bm, r0 - 0.04, r0 + 0.07, z, z + 0.05, outer=True, gx=0.5); obj(f'lip{i}', bm, M_MARBLE, ('ink',))
    bm = bmesh.new(); ring(bm, RMAX - 0.01, RMAX, 0, tier_z(TIERS - 1), inner=False, outer=True, top=False, gx=0.5, keep=lambda a: math.sin(a) >= -0.17)
    obj('tier_back', bm, M_DARK, ('plain',))   # หลังอัฒจันทร์ฝั่งเหนือ (เห็นทะลุซุ้มเท่านั้น)
    AIS = [i * 2 * math.pi / 20 + math.pi / 20 for i in range(20)]
    bm = bmesh.new(); bmL = bmesh.new()
    for a in AIS:   # ทางเดินขึ้นอัฒจันทร์: แถบหินอ่อน + ขั้นบันไดกลางชั้น
        if in_gate(a, RR + 2, 1.0): continue
        for i in range(TIERS):
            r0 = RR + i * TD; z = tier_z(i)
            box(bm, P(r0 + TD * 0.75, a, z + TZ / 4), (TD / 2, 0.56, TZ / 2), a)
            box(bmL, P(r0 + TD * 0.25, a, z + 0.004), (TD / 2, 0.56, 0.01), a)
    obj('aisle_steps', bm, M_MARBLE, ('ink',)); obj('aisles', bmL, M_MARBLE, ('plain',))

    # ---------- อุโมงค์ประตูใต้ (ผนังขั้นตามอัฒจันทร์) + ซุ้มโค้งหน้าประตู → ชั้นหน้า "podium" ----------
    bm = bmesh.new()
    for sx in (-1, 1):
        x = GX + sx * (GHALF + 0.3)
        steps = [(R0, RR, PODIUM_H + 0.25)] + [(RR + i * TD, RR + (i + 1) * TD, tier_z(i) + 0.25) for i in range(TIERS)] + [(RMAX, WALL_OUT + 1.5, 1.2)]
        for (ra, rb, h) in steps:
            box(bm, (x, -(ra + rb) / 2, h / 2), (0.6, rb - ra, h))
    obj('tunnel_walls', bm, M_SST2, ('ink', 'f_podium'))
    bm = bmesh.new(); box(bm, (GX, -(R0 + 2.0 + WALL_OUT + 1.5) / 2, 0.006), (2 * GHALF, WALL_OUT + 1.5 - R0 - 2.0, 0.004))
    obj('tunnel_shade', bm, M_DARK, ('plain',))   # พื้นอุโมงค์มืด (แบนราบ — อยู่ในภาพพื้น ไม่ใช่ชั้นหน้า)

    def arch_panel(bm, f, u0, u1, z0, z1, ow, sill, spring, n=12, sides=False, rise=None):
        """แผงผนังมีช่องซุ้มโค้งกลาง (u = แนวผนัง, z = สูง) — f(u, z, s) → จุด 3D (s = 0 หน้า, 1 หลัง)
        ช่องกว้าง ow ตั้งแต่ sill ถึง spring แล้วโค้งครึ่งวงกลม • z1 (ยอดแผง) ต้องสูงกว่ายอดโค้ง (ซุ้มพัง = ไม่สร้างแผง เหลือตอเสา)"""
        hw = ow / 2; rise = rise or hw; apex = spring + rise          # rise < hw = โค้งรี (ซุ้มประตูกว้าง)
        assert z1 > apex + 0.01, (z1, apex)
        arc = [(-hw * math.cos(math.pi * t / n), spring + rise * math.sin(math.pi * t / n)) for t in range(n + 1)]   # ซ้าย → ขวา ผ่านยอด
        for s in (0, 1):
            V = lambda u, z: bm.verts.new(f(u, z, s))
            polys = [[(u0, z0), (-hw, z0), (-hw, z1), (u0, z1)], [(hw, z0), (u1, z0), (u1, z1), (hw, z1)],
                     [(-hw, z1), (-hw, spring)] + arc[1:-1] + [(hw, spring), (hw, z1)]]
            if sill > z0: polys.append([(-hw, z0), (hw, z0), (hw, sill), (-hw, sill)])
            for q in polys: bm.faces.new([V(*p) for p in (q if s == 0 else q[::-1])])
        W = lambda u, z, s: bm.verts.new(f(u, z, s))
        def strip(pa, pb):  # หน้าเชื่อมหน้า-หลัง ระหว่างจุด 2D สองจุด
            bm.faces.new([W(*pa, 0), W(*pb, 0), W(*pb, 1), W(*pa, 1)])
        strip((-hw, sill), (-hw, spring)); strip((hw, spring), (hw, sill))     # วงกบข้างช่อง
        if sill > z0: strip((-hw, sill), (hw, sill))
        for i_ in range(n): strip(arc[i_], arc[i_ + 1])                       # ใต้โค้ง
        strip((u0, z1), (u1, z1))                                             # หลังผนัง
        if sides: strip((u0, z0), (u0, z1)); strip((u1, z1), (u1, z0))

    def wall_f(r_in, r_out, ac):
        return lambda u, z, s: P(r_in + s * (r_out - r_in), ac + u / r_in, z)

    # ---------- กำแพงซุ้มโค้งนอก (โคลอสเซียม): เหนือ = เต็ม 2 ชั้นซุ้ม + attic • ใต้ = ซากพัง ----------
    BW = 2 * math.pi * WALL_IN / NB; OW = 0.95
    ruined = lambda a: math.sin(a) < -0.17
    ph1, ph2 = rnd.random() * 6, rnd.random() * 6
    hp = []
    for kk in range(NB):   # ความสูงตอเสาฝั่งใต้ (นุ่มต่อเนื่อง + สุ่ม) — สูงสุด RUIN_MAX
        nn = 0.5 + 0.5 * (0.6 * math.sin(kk * 0.83 + ph1) + 0.4 * math.sin(kk * 2.1 + ph2))
        hp.append(max(0.35, min(RUIN_MAX, 0.4 + 2.6 * nn + rnd.uniform(-0.3, 0.3))))
    bmA = bmesh.new(); bmB = bmesh.new(); bmR = bmesh.new(); bmIn = bmesh.new(); bmP = bmesh.new(); bmCav = bmesh.new()
    intact_ranges = []
    for kk in range(NB):
        ac = (kk + 0.5) / NB * 2 * math.pi
        if not ruined(ac):
            f = wall_f(WALL_IN, WALL_OUT, ac)
            arch_panel(bmA, f, -BW / 2, BW / 2, 0.0, 3.2, OW, 0.0, 1.9)
            arch_panel(bmB, f, -BW / 2, BW / 2, 3.4, 5.9, OW, 3.55, 4.85)
            # ในซุ้ม: ผนังมืดลึก (ทางเดินในตัวอาคาร) — เห็นทะลุซุ้มจากด้านใน
            for (za, zb) in ((3.55, 5.4),):
                fi = wall_f(WALL_OUT + 0.6, WALL_OUT + 0.61, ac)
                bmIn.faces.new([bmIn.verts.new(fi(u, z, 0)) for u, z in ((-OW / 2 - 0.1, za), (OW / 2 + 0.1, za), (OW / 2 + 0.1, zb), (-OW / 2 - 0.1, zb))][::-1])
            intact_ranges.append(ac)
        else:
            # ตอเสาซ้าย/ขวาของช่วงนี้ = ครึ่งเสาของเสาที่ kk และ kk+1 (ยอดหยัก) • ซุ้มรอดถ้าเสาสองข้างสูงพอ
            hl, hr = hp[kk], hp[(kk + 1) % NB]
            f = wall_f(WALL_IN, WALL_OUT, ac)
            hw = OW / 2

            def block(ua, ub, j, bm_=bmR):   # ก้อนผนังยอดหยัก (j = ความสูง 4 มุม: หน้าซ้าย หน้าขวา หลังขวา หลังซ้าย)
                pts = [f(ua, 0, 0), f(ub, 0, 0), f(ub, 0, 1), f(ua, 0, 1), f(ua, j[0], 0), f(ub, j[1], 0), f(ub, j[2], 1), f(ua, j[3], 1)]
                vs = [bm_.verts.new(p) for p in pts]
                for fc in ((0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 6, 7)):
                    bm_.faces.new([vs[i_] for i_ in fc])
            for (ua, ub, h) in ((-BW / 2, -hw, hl), (hw, BW / 2, hr)):          # ตอเสา
                block(ua, ub, [h + rnd.uniform(-0.18, 0.1) for _ in range(4)])
            arch_ok = min(hl, hr) >= 1.9 + hw + 0.12
            if arch_ok:                                                          # ซุ้มชั้นล่างที่ยังรอด
                arch_panel(bmR, f, -hw - 0.001, hw + 0.001, 0.0, min(hl, hr) - 0.05, OW, 0.0, 1.9)
            else:                                                                # ช่องซุ้มพัง: ฐานหินถมเตี้ย ๆ ยอดหยัก
                hb = rnd.uniform(0.25, 0.7)
                block(-hw - 0.001, hw + 0.001, [hb + rnd.uniform(-0.12, 0.12) for _ in range(4)])
                for side, h in ((-1, hl), (1, hr)):                              # ตีนโค้งหักค้างบนเสาสูง
                    if h < 2.15 or rnd.random() < 0.35: continue
                    ub_ = side * hw; uc = ub_ - side * 0.22
                    tv = Vector((-math.sin(ac + uc / WALL_IN), math.cos(ac + uc / WALL_IN), 0)); rv = Vector((math.cos(ac + uc / WALL_IN), math.sin(ac + uc / WALL_IN), 0))
                    Mb = Matrix(((tv.x, rv.x, 0), (tv.y, rv.y, 0), (0, 0, 1))) @ Matrix.Rotation(-side * math.radians(38), 3, 'Y')
                    c3 = Vector(P((WALL_IN + WALL_OUT) / 2, ac + uc / WALL_IN, 2.08))
                    bmesh.ops.create_cube(bmR, size=1.0, matrix=Matrix.LocRotScale(c3, Mb.to_quaternion(), Vector((0.55, WALL_T * 0.96, 0.32))))
            # หลังอัฒจันทร์ที่โผล่พ้นซากกำแพง (หันหากล้อง): ผนังโครงสร้างใต้อัฒจันทร์ มีซุ้มทางเดินมืด
            if not in_gate(ac, RMAX, 0.5):
                fc_ = wall_f(RMAX - 0.35, RMAX, ac)
                arch_panel(bmCav, fc_, -BW / 2 * (RMAX - 0.35) / WALL_IN, BW / 2 * (RMAX - 0.35) / WALL_IN, 0.0, tier_z(TIERS - 1), 0.8, 0.0, 1.25)
                fi = wall_f(RMAX - 0.75, RMAX - 0.74, ac)
                bmIn.faces.new([bmIn.verts.new(fi(u, z, 0)) for u, z in ((-0.5, 0), (0.5, 0), (0.5, 1.8), (-0.5, 1.8))])
            # เสาประดับด้านนอก (หันหากล้อง) บนตอเสาที่ kk
            a_p = kk / NB * 2 * math.pi; hpk = hp[kk] - 0.15
            if hpk > 0.6:
                box(bmP, P(WALL_OUT + 0.05, a_p, hpk / 2), (0.12, 0.3, hpk), a_p)
                box(bmP, P(WALL_OUT + 0.08, a_p, 0.1), (0.18, 0.4, 0.2), a_p)
    obj('wall_a', bmA, M_WALL, ('ink',)); obj('wall_b', bmB, M_WALL, ('ink',)); obj('wall_ruin', bmR, M_WALL, ('ink',)); obj('cavea_back', bmCav, M_SST2, ('ink',))
    obj('wall_inside', bmIn, M_DARK, ('plain',)); obj('ruin_pilasters', bmP, M_WALL, ('ink',))
    keep_i = lambda a: not ruined(a)
    bm = bmesh.new()
    ring(bm, WALL_IN - 0.12, WALL_OUT + 0.12, 3.2, 3.4, gate=False, keep=keep_i, outer=True)
    ring(bm, WALL_IN - 0.12, WALL_OUT + 0.12, 5.9, 6.1, gate=False, keep=keep_i, outer=True)
    ring(bm, WALL_IN - 0.1, WALL_OUT + 0.1, 7.3, 7.45, gate=False, keep=keep_i, outer=True)
    obj('cornice', bm, M_MARBLE, ('ink',))
    bm = bmesh.new(); ring(bm, WALL_IN, WALL_OUT, 6.1, 7.3, gate=False, keep=keep_i, outer=True); obj('attic', bm, M_WALL, ('ink',))
    # เสาประดับ (pilaster) ด้านในชั้นบน + โล่บน attic + ธงแขวน + เสาธงบนยอด (ฝั่งเหนือ — หันหากล้อง)
    bmPil = bmesh.new(); bmCap = bmesh.new(); bmBan = bmesh.new(); bmBanG = bmesh.new(); bmSh = {M_RED: bmesh.new(), M_BLUE: bmesh.new(), M_GOLD: bmesh.new()}
    bmPole = bmesh.new(); bmPen = bmesh.new()
    for kk in range(NB):
        a = kk / NB * 2 * math.pi
        if ruined(a) or ruined(a + 0.05) or ruined(a - 0.05): continue
        box(bmPil, P(WALL_IN - 0.05, a, 4.65), (0.1, 0.26, 2.5), a)
        box(bmCap, P(WALL_IN - 0.08, a, 5.8), (0.16, 0.38, 0.14), a)
        box(bmCap, P(WALL_IN - 0.08, a, 3.47), (0.16, 0.38, 0.14), a)
        if kk % 2 == 0:   # ธงแขวนแดงขอบทองบนเสา
            e = Euler((math.pi / 2, 0, a - math.pi / 2)).to_quaternion()
            for (z0, z1, w, bmx, dr) in ((3.75, 5.65, 0.42, bmBan, 0.13), (3.62, 3.75, 0.42, bmBanG, 0.13), (5.65, 5.75, 0.48, bmBanG, 0.135)):
                c = P(WALL_IN - dr, a, (z0 + z1) / 2)
                bmesh.ops.create_cube(bmx, size=1.0, matrix=Matrix.LocRotScale(Vector(c), e, Vector((w, z1 - z0, 0.02))))
            # ปลายธงเป็นสามเหลี่ยม
            t = (-math.sin(a), math.cos(a)); rr_ = WALL_IN - 0.13
            vs = [bmBan.verts.new((rr_ * math.cos(a) + t[0] * dx, rr_ * math.sin(a) + t[1] * dx, z)) for dx, z in ((-0.21, 3.75), (0.21, 3.75), (0, 3.5))]
            bmBan.faces.new(vs)
        else:
            e = Euler((math.pi / 2, 0, a - math.pi / 2)).to_quaternion()
            bmesh.ops.create_cone(list(bmSh.values())[kk // 2 % 3], cap_ends=True, segments=16, radius1=0.26, radius2=0.23, depth=0.05,
                                  matrix=Matrix.LocRotScale(Vector(P(WALL_IN - 0.03, a, 6.7)), e, Vector((1, 1, 1))))
        if kk % 6 == 3:
            bmesh.ops.create_cone(bmPole, cap_ends=True, segments=8, radius1=0.05, radius2=0.04, depth=2.2, matrix=Matrix.Translation(Vector(P((WALL_IN + WALL_OUT) / 2, a, 7.45 + 1.1))))
            t = (-math.sin(a), math.cos(a)); x, y, _ = P((WALL_IN + WALL_OUT) / 2, a, 0)
            vs = [bmPen.verts.new(v) for v in [(x, y, 9.5), (x + t[0] * 1.2, y + t[1] * 1.2, 9.3), (x, y, 8.9)]]
            bmPen.faces.new(vs)
    obj('pilasters', bmPil, M_MARBLE, ('ink',)); obj('capitals', bmCap, M_MARBLE, ('ink',))
    obj('banners', bmBan, M_RED, ('ink',)); obj('banner_gold', bmBanG, M_GOLD, ('plain',))
    for m_, b_ in bmSh.items(): obj('wshield_' + m_.name, b_, m_, ('ink',))
    obj('wall_poles', bmPole, M_GOLD, ('ink',)); obj('pennants', bmPen, M_RED, ('ink',))

    # ---------- นอกกำแพง: ทุ่งหญ้า + ทางดินรอบอาคาร + เศษซาก/หญ้า/ไม้เลื้อย ฝั่งใต้ ----------
    bm = bmesh.new(); ring(bm, WALL_OUT - 0.05, 60, 0, 0, seg=144, gate=False, inner=False); obj('outside', bm, M_GRASS, ('plain',))
    bm = bmesh.new(); ring(bm, WALL_OUT - 0.05, WALL_OUT + 1.4, 0.004, 0.004, seg=240, gate=False, inner=False); obj('path', bm, M_PATH, ('plain',))
    bmRub = bmesh.new(); bmRub2 = bmesh.new(); bmDrum = bmesh.new(); bmG = bmesh.new(); bmG2 = bmesh.new(); bmFl = [bmesh.new() for _ in M_FLOWER]
    rub_n = 0
    while rub_n < 170:
        a = rnd.uniform(-math.pi, 0)
        if not ruined(a): continue
        r = WALL_OUT + 0.1 + abs(rnd.gauss(0, 1.3))
        if in_gate(a, r, 0.8): continue
        s = rnd.uniform(0.18, 0.55); x, y, _ = P(r, a, 0)
        box(bmRub if rub_n % 3 else bmRub2, (x, y, s * 0.32), (s * rnd.uniform(0.9, 1.6), s, s * rnd.uniform(0.6, 1.0)),
            tilt=(rnd.uniform(-0.3, 0.3), rnd.uniform(-0.3, 0.3), rnd.uniform(0, 6.3)))
        rub_n += 1
    for _ in range(14):   # กลองเสาล้ม
        a = rnd.uniform(-math.pi + 0.3, -0.3)
        if not ruined(a): continue
        r = WALL_OUT + 0.6 + rnd.random() * 2.5
        if in_gate(a, r, 1.0): continue
        x, y, _ = P(r, a, 0); L = rnd.uniform(0.5, 1.2)
        bmesh.ops.create_cone(bmDrum, cap_ends=True, segments=12, radius1=0.26, radius2=0.26, depth=L,
                              matrix=Matrix.LocRotScale(Vector((x, y, 0.24)), Euler((math.pi / 2, 0, rnd.uniform(0, 6.3))).to_quaternion(), Vector((1, 1, 1))))
    for _ in range(320):  # กอหญ้าเล็ก ๆ (กลุ่ม) รอบตอเสา/เศษหิน
        a = rnd.uniform(-math.pi, 0)
        if not ruined(a): continue
        r = WALL_OUT + rnd.uniform(-0.2, 3.5) if rnd.random() < 0.8 else WALL_IN + rnd.uniform(0.05, WALL_T - 0.05)
        if in_gate(a, r, 0.6): continue
        x, y, _ = P(r, a, 0); zb = 0.0 if r > WALL_OUT else hp[int((a % (2 * math.pi)) / (2 * math.pi) * NB) % NB] - 0.15
        for _ in range(rnd.randint(2, 5)):
            h = rnd.uniform(0.1, 0.26)
            bmesh.ops.create_cone(bmG if rnd.random() < 0.6 else bmG2, cap_ends=True, segments=5, radius1=rnd.uniform(0.04, 0.08), radius2=0.0, depth=h,
                                  matrix=Matrix.Translation(Vector((x + rnd.uniform(-0.15, 0.15), y + rnd.uniform(-0.15, 0.15), zb + h / 2))))
        if rnd.random() < 0.25:
            bmesh.ops.create_uvsphere(bmFl[rnd.randrange(3)], u_segments=6, v_segments=4, radius=0.045, matrix=Matrix.Translation(Vector((x + 0.1, y, zb + 0.2))))
    for _ in range(46):   # ไม้เลื้อยบนตอเสา (ก้อนใบไม้กลม)
        kk = rnd.randrange(NB); a = kk / NB * 2 * math.pi
        if not ruined(a) or hp[kk] < 0.8: continue
        z = rnd.uniform(0.3, hp[kk] - 0.1)
        bmesh.ops.create_uvsphere(bmG2, u_segments=8, v_segments=5, radius=rnd.uniform(0.12, 0.22),
                                  matrix=Matrix.LocRotScale(Vector(P(WALL_OUT + 0.02, a + rnd.uniform(-0.01, 0.01), z)), None, Vector((1, 1, 0.7))))
    obj('rubble', bmRub, M_WALLD, ('ink',)); obj('rubble2', bmRub2, M_WALL, ('ink',)); obj('drums', bmDrum, M_MARBLE, ('ink',))
    obj('grass_tufts', bmG, M_LEAF, ('plain',)); obj('ivy', bmG2, M_LEAF2, ('plain',), smooth=True)
    for b_, m_ in zip(bmFl, M_FLOWER): obj('flowers_' + m_.name, b_, m_, ('plain',), smooth=True)

    # ---------- ซุ้มโค้งหน้าประตูใต้ (ชั้นหน้า "podium") ----------
    bm = bmesh.new(); gw = GHALF
    fgate = lambda u, z, s: (GX + u, -R0 + 0.02 - s * 0.6, z)
    arch_panel(bm, fgate, -gw - 0.6, gw + 0.6, 0.0, 2.9, 2 * gw, 0.0, 1.5, n=20, sides=True, rise=1.1)
    obj('gate_arch', bm, M_MARBLE, ('ink', 'f_podium'))
    bm = bmesh.new(); box(bm, (GX, -R0 - 0.29, 2.97), (2 * gw + 1.45, 0.75, 0.14))   # บัวยอดซุ้ม (หินอ่อน — ทองหน้าบนสะท้อนฟ้าเป็นสีเขียวหม่น)
    obj('gate_cornice', bm, M_MARBLE, ('ink', 'f_podium'))
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=20, radius1=0.32, radius2=0.29, depth=0.08,
                          matrix=Matrix.LocRotScale(Vector((GX, -R0 - 0.3, 3.36)), Euler((math.pi / 2, 0, 0)).to_quaternion(), Vector((1, 1, 1))))  # โล่ทองบนยอดซุ้ม (หันใต้ = หากล้อง)
    obj('gate_gold', bm, M_GOLD, ('ink', 'f_podium'))

    # ---------- เสาธง 8 ต้น + คบเพลิง (เหนือ = ภาพพื้น • ใต้ = ชั้นหน้าทีละต้น) ----------
    for i, a in enumerate(FLAG_ANGLES):
        grp = ('ink', f'f_flag{i}')   # ทุกต้นเป็นชั้นหน้า (แนวกำแพงเฉียงฝั่งเหนือก็มีมุมที่ตัวละครยืนหลังเสาได้)
        x, y, _ = P(FLAG_R, a, 0)
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=10, radius1=0.075, radius2=0.05, depth=3.0, matrix=Matrix.Translation((x, y, 1.5 + PODIUM_H)))
        bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=0.1, matrix=Matrix.Translation((x, y, 3.0 + PODIUM_H + 0.05)))
        obj(f'flagpole{i}', bm, M_GOLD, grp, smooth=True)
        tx, ty = -math.sin(a), math.cos(a)
        bm = bmesh.new()
        vs = [bm.verts.new(v) for v in [(x, y, 3.6), (x + tx * 1.15, y + ty * 1.15, 3.42), (x + tx * 0.95, y + ty * 0.95, 3.05), (x + tx * 1.15, y + ty * 1.15, 2.68), (x, y, 2.5)]]
        bm.faces.new(vs); obj(f'flag{i}', bm, M_RED, grp)
    for i, a in enumerate(TORCH_ANGLES):
        grp = ('ink', f'f_torch{i}')
        x, y, _ = P(TORCH_R, a, 0)
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=10, radius1=0.1, radius2=0.065, depth=1.3, matrix=Matrix.Translation((x, y, PODIUM_H + 0.65)))
        obj(f'torchpole{i}', bm, M_SST2, grp)
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=14, radius1=0.08, radius2=0.27, depth=0.22, matrix=Matrix.Translation((x, y, PODIUM_H + 1.3 + 0.11)))
        bmesh.ops.create_cone(bm, cap_ends=True, segments=14, radius1=0.12, radius2=0.12, depth=0.06, matrix=Matrix.Translation((x, y, PODIUM_H + 0.95)))
        obj(f'torchbowl{i}', bm, M_GOLD, grp)
        bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.2, radius2=0.2, depth=0.04, matrix=Matrix.Translation((x, y, TORCH_TOP - 0.02)))
        obj(f'torchcoal{i}', bm, mat(f'coal{i}', (0.2, 0.06, 0.02), 0.9, emit=((1.0, 0.45, 0.1), 3.0)), grp)

    # ---------- ผู้ชม (ตัวกลมหัวโต) — ท่าฐาน (นั่ง) + 4 เฟรม (เฉพาะคนที่เปลี่ยนท่า) ----------
    CS = 1.12
    seats = []
    for i in range(TIERS):
        r = RR + i * TD + TD * 0.45; z = tier_z(i); n = int(2 * math.pi * r / (0.5 * CS))
        for k_ in range(n):
            a = k_ / n * 2 * math.pi + rnd.uniform(-0.004, 0.004)
            if in_gate(a, r, 0.7) or min(abs((a - x_ + math.pi) % (2 * math.pi) - math.pi) for x_ in AIS) * r < 0.42: continue
            if rnd.random() > 0.86: continue
            seats.append({'r': r, 'a': a, 'z': z, 'shirt': rnd.randrange(len(M_SHIRT)), 'skin': rnd.choice([0, 0, 0, 1, 1, 2]),
                          'hair': rnd.randrange(len(M_HAIR)), 'scarf': rnd.randrange(len(M_SCARF)), 'sz': rnd.uniform(0.92, 1.08)})
    print('ผู้ชม', len(seats), 'คน', flush=True)
    POSES = {'sit': (0, 0, 0), 'up1': (0, 1, 0), 'up1r': (0, 0, 1), 'up2': (0, 1, 1), 'stand2': (1, 1, 1), 'scarf': (1, 1, 1)}

    def person(B, s, pose, rng_):
        """B = dict วัสดุ → bmesh • หันเข้ากลางลาน (ฝั่งเหนือเห็นหน้า ฝั่งใต้เห็นหลัง)"""
        stand, lu, ru = POSES[pose]
        sz = s['sz'] * CS; a = s['a']; x0, y0, z0 = P(s['r'], a, s['z'])
        fx, fy = -math.cos(a), -math.sin(a)          # หันหน้าเข้ากลาง
        tx, ty = -fy, fx                             # แกนข้างตัว
        th = (0.48 if stand else 0.33) * sz          # สูงลำตัว
        M = lambda dx, dy, dz: Matrix.Translation(Vector((x0 + tx * dx + fx * dy, y0 + ty * dx + fy * dy, z0 + dz)))
        bmesh.ops.create_cone(B[M_SHIRT[s['shirt']]], cap_ends=True, segments=10, radius1=0.15 * sz, radius2=0.115 * sz, depth=th, matrix=M(0, 0, th / 2))
        hz = th + 0.12 * sz
        bmesh.ops.create_uvsphere(B[M_SKIN[s['skin']]], u_segments=12, v_segments=8, radius=0.125 * sz, matrix=M(0, 0, hz))
        bmesh.ops.create_uvsphere(B[M_HAIR[s['hair']]], u_segments=12, v_segments=8, radius=0.132 * sz, matrix=M(0, -0.035 * sz, hz + 0.035 * sz))
        sh = th - 0.04 * sz
        hands = []
        for side, up in ((-1, lu), (1, ru)):
            if up:   # แขนชูขึ้นเป็นตัว V
                p0 = Vector((side * 0.13 * sz, 0, sh)); p1 = Vector((side * 0.22 * sz, 0.02 * sz, sh + 0.3 * sz + rng_.uniform(-0.03, 0.04)))
            else:    # แขนลงข้างลำตัว
                p0 = Vector((side * 0.15 * sz, 0, sh)); p1 = Vector((side * 0.17 * sz, 0.03 * sz, sh - 0.2 * sz))
            mid = (p0 + p1) / 2; dv = p1 - p0; L = dv.length
            w = Vector((tx * dv.x + fx * dv.y, ty * dv.x + fy * dv.y, dv.z)).normalized()
            q = Vector((0, 0, 1)).rotation_difference(w)
            mw = Vector((x0 + tx * mid.x + fx * mid.y, y0 + ty * mid.x + fy * mid.y, z0 + mid.z))
            bmesh.ops.create_cone(B[M_SHIRT[s['shirt']]], cap_ends=True, segments=6, radius1=0.045 * sz, radius2=0.04 * sz, depth=L, matrix=Matrix.LocRotScale(mw, q, Vector((1, 1, 1))))
            bmesh.ops.create_uvsphere(B[M_SKIN[s['skin']]], u_segments=6, v_segments=4, radius=0.045 * sz, matrix=M(p1.x, p1.y, p1.z))
            hands.append(p1)
        if pose == 'scarf':   # ผ้าเชียร์ขึงระหว่างมือ
            (a1, a2) = hands
            vs = [B[M_SCARF[s['scarf']]].verts.new((x0 + tx * p.x + fx * (p.y + 0.02), y0 + ty * p.x + fy * (p.y + 0.02), z0 + p.z + dz))
                  for p, dz in ((a1, 0.02), (a2, 0.02), (a2, -0.13), (a1, -0.13))]
            B[M_SCARF[s['scarf']]].faces.new(vs)

    ALLM = M_SHIRT + M_SKIN + M_HAIR + M_SCARF

    def crowd(name, people, groups):
        B = {m_: bmesh.new() for m_ in ALLM}; rng_ = random.Random(hash(name) & 0xffff)
        for s, pose in people: person(B, s, pose, rng_)
        out = []
        for m_, b_ in B.items():
            if not len(b_.verts): b_.free(); continue
            out.append(obj(f'{name}_{m_.name}', b_, m_, groups, smooth=True, merge=False))
        return out

    crowd('crowd_base', [(s, 'sit') for s in seats], ('crowd',))
    fr = random.Random(21)
    FRAMES = {}
    for k_ in range(1, 5):
        ch = {}
        for i_, s in enumerate(seats):
            u = fr.random()
            if k_ == 1 and u < 0.18: ch[i_] = fr.choice(['up1', 'up1r'])
            elif k_ == 2 and u < 0.62: ch[i_] = 'stand2' if u < 0.14 else 'up2'
            elif k_ == 3 and u < 0.62: ch[i_] = 'stand2' if u < 0.1 else ('up1' if u < 0.2 else ('up1r' if u < 0.3 else 'up2'))
            elif k_ == 4: ch[i_] = 'scarf' if fr.random() < 0.35 else 'stand2'
        FRAMES[k_] = ch
        if not check_only and (not only or 'crowd' in only):   # สร้างเฉพาะตอนเรนเดอร์ชีตผู้ชม (ประหยัดเวลาสร้างฉาก)
            crowd(f'cf{k_}', [(seats[i_], p) for i_, p in ch.items()], (f'cf{k_}',))
            crowd(f'ch{k_}', [(s, 'sit') for i_, s in enumerate(seats) if i_ not in ch], (f'ch{k_}',))

    # ---------- ตรวจการบัง: จุดของภาพพื้น (ไม่ใช่ชั้นหน้า) ที่ยื่นขึ้นทับตัวละครบนช่องเดินได้ ----------
    if check_only: check(d, cols, sc)
    else: print('(ข้ามการตรวจการบัง — ใช้ --check)', flush=True)
    if check_only: return

    # ---------- แสง: แดดซ้ายบน (เงาขวาล่าง) อุ่น + ท้องฟ้าฟ้าสด (เงาอมฟ้าแบบ RO) ----------
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 3.6; sun.angle = math.radians(4); sun.color = (1.0, 0.93, 0.80)
    so = bpy.data.objects.new('sun', sun); sc.collection.objects.link(so)
    so.rotation_euler = (math.radians(46), 0, math.radians(-135))
    fill = bpy.data.lights.new('fill', 'SUN'); fill.energy = 0.95; fill.angle = math.radians(25); fill.color = (1.0, 0.86, 0.72); fill.use_shadow = False
    fo = bpy.data.objects.new('fill', fill); sc.collection.objects.link(fo); fo.rotation_euler = (math.radians(62), 0, math.radians(-10))
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (0.55, 0.70, 1.0, 1); bg.inputs['Strength'].default_value = 0.9
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
    sc.cycles.max_bounces = 4; sc.cycles.diffuse_bounces = 2; sc.cycles.glossy_bounces = 2; sc.cycles.transmission_bounces = 0
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'; sc.view_settings.exposure = float(os.environ.get('AEXP', -0.6))
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.use_persistent_data = True
    if os.environ.get('BTHREADS'): sc.render.threads_mode = 'FIXED'; sc.render.threads = int(os.environ['BTHREADS'])

    # ---------- กล้องเกม ----------
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = MAPW; cam.sensor_fit = 'HORIZONTAL'; cam.clip_end = 600
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
    co.rotation_euler = (TH, 0, 0)
    dv = Vector((0, math.sin(TH), -math.cos(TH))); co.location = -dv * 200

    def res(s):
        sc.render.resolution_x = round(MAPW * PX * s); sc.render.resolution_y = round(MAPW * PX * K * s); sc.render.resolution_percentage = 100

    def ink(on, coll_name='ink', s=1.0):
        sc.render.use_freestyle = on
        if not on: return
        sc.render.line_thickness_mode = 'ABSOLUTE'; sc.render.line_thickness = 1.0
        vl = bpy.context.view_layer; vl.use_freestyle = True
        fs = vl.freestyle_settings; fs.crease_angle = math.radians(125)
        ls = fs.linesets[0] if fs.linesets else fs.linesets.new('ink')
        ls.select_by_visibility = True; ls.select_by_collection = True; ls.collection = coll(coll_name)
        ls.select_silhouette = True; ls.select_border = True; ls.select_crease = True
        if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new('ink')
        ls.linestyle.color = (0.20, 0.11, 0.06); ls.linestyle.alpha = 0.72; ls.linestyle.thickness = max(0.7, 1.0 * s)

    meshes = [o for o in sc.objects if o.type == 'MESH']
    crowd_base = set(cols['crowd'].objects)
    frame_objs = set(o for o in meshes if o.name.startswith(('cf', 'ch')))
    ground_vis = [o for o in meshes if o not in frame_objs]

    def setup(visible, holdout):
        vis, hold = set(visible), set(holdout)
        for o in meshes:
            o.hide_render = o not in vis and o not in hold
            o.is_holdout = o in hold

    def border(box_=None):
        r = sc.render
        if box_ is None: r.use_border = False; return
        x0, y0, x1, y1 = box_   # px จากบนซ้าย (ความละเอียดปัจจุบัน)
        r.use_border = True; r.use_crop_to_border = False
        r.border_min_x, r.border_max_x = max(0, x0 / r.resolution_x), min(1, x1 / r.resolution_x)
        r.border_min_y, r.border_max_y = max(0, 1 - y1 / r.resolution_y), min(1, 1 - y0 / r.resolution_y)

    def pix(o, s):
        """กรอบภาพ (px บนซ้าย ที่ความละเอียด ×s) ของวัตถุ"""
        xs, ys = [], []
        for v in o.data.vertices:
            u = world_to_camera_view(sc, co, o.matrix_world @ v.co)
            xs.append(u.x * MAPW * PX * s); ys.append((1 - u.y) * MAPW * PX * K * s)
        return min(xs), min(ys), max(xs), max(ys)

    s = 0.5 if preview else ss
    meta = {'ss': s, 'hash': d['hash'], 'gate': [GX, GHALF], 'groups': {}, 'frames': 0, 'seats': len(seats)}
    want = lambda k: not only or k in only
    # ---------- 1) ภาพพื้น (ทุกอย่าง + ผู้ชมท่าฐาน) ----------
    if want('ground'):
        res(s); setup(ground_vis, []); sc.render.film_transparent = False
        crop = os.environ.get('ACROP')   # ดูเฉพาะกรอบ (px ที่ ×s: x0,y0,x1,y1) — ปรับแบบเร็ว ไม่ใช้ติดตั้ง
        border([float(v) for v in crop.split(',')] if crop else None)
        ink(True, 'ink', s); sc.cycles.samples = 6 if preview else samples; sc.cycles.use_denoising = True
        sc.render.filepath = os.path.join(outdir, 'ground.png')
        bpy.ops.render.render(write_still=True); print('เรนเดอร์ →', sc.render.filepath, flush=True)
    # ---------- 2) หน้ากากชั้นหน้า (ต่อกลุ่ม: เห็นเฉพาะกลุ่ม ที่เหลือ holdout) — สีจริงตัดจากภาพพื้นตอนติดตั้ง ----------
    if want('front'):
        res(s); sc.render.film_transparent = True; ink(False); sc.cycles.samples = 4 if preview else 8; sc.cycles.use_denoising = False
        for cname in sorted(c for c in cols if c.startswith('f_')):
            grp = list(cols[cname].objects)
            bx = [pix(o, s) for o in grp]; box_ = (min(b[0] for b in bx) - 6, min(b[1] for b in bx) - 6, max(b[2] for b in bx) + 6, max(b[3] for b in bx) + 6)
            setup(grp, [o for o in ground_vis if o not in grp]); border(box_)
            sc.render.filepath = os.path.join(outdir, f'mask_{cname[2:]}.png')
            bpy.ops.render.render(write_still=True); print('หน้ากาก →', sc.render.filepath, [round(v) for v in box_], flush=True)
            # จุดยึด = ฐานบนพื้น (เรียงความลึก): podium = ผนังในฝั่งใต้ • เสา = ฐานเสา (คบเพลิง: ก่อนเปลวไฟในเกม)
            if cname == 'f_podium': ax_, ay_ = MAPW / 2, FRONT_Y
            else:
                i_ = int(cname.lstrip('f_torchflag')); a = (TORCH_ANGLES if 'torch' in cname else FLAG_ANGLES)[i_]
                rr_ = TORCH_R if 'torch' in cname else FLAG_R
                ax_, ay_ = MAPW / 2 + rr_ * math.cos(a), MAPW / 2 - rr_ * math.sin(a)
                if 'torch' in cname: ay_ -= 0.002
            meta['groups'][cname[2:]] = {'x': ax_, 'y': ay_}
        border(None)
    # ---------- 3) ผู้ชม 4 เฟรม (×1: เฉพาะคนที่เปลี่ยนท่า • ฉากที่เหลือ + คนท่าเดิม = holdout) ----------
    if want('crowd'):
        res(0.5 if preview else 1.0); border(None); sc.render.film_transparent = True; ink(False)
        sc.cycles.samples = 6 if preview else max(16, samples); sc.cycles.use_denoising = True
        others = [o for o in ground_vis if o not in crowd_base]
        for k_ in range(1, 5):
            vis = list(cols[f'cf{k_}'].objects); hold = others + (list(cols[f'ch{k_}'].objects) if f'ch{k_}' in cols else [])   # f4: ลุกทุกคน → ไม่มีคนท่าเดิม
            setup(vis, hold)
            sc.render.filepath = os.path.join(outdir, f'crowd_f{k_}.png')
            bpy.ops.render.render(write_still=True); print('เรนเดอร์ →', sc.render.filepath, len(FRAMES[k_]), 'คนเปลี่ยนท่า', flush=True)
        meta['frames'] = 4
    old = json.load(open(os.path.join(outdir, 'meta.json'))) if os.path.exists(os.path.join(outdir, 'meta.json')) else {}
    if old.get('ss') == meta['ss'] and old.get('hash') == meta['hash']:
        old.update({k: v for k, v in meta.items() if v}); meta = old
    json.dump(meta, open(os.path.join(outdir, 'meta.json'), 'w'), indent=1)


def check(d, cols, sc):
    """จุดของภาพพื้น (ไม่ใช่ชั้นหน้า) ที่ยื่นขึ้นทับตัวละครบนช่องเดินได้ — พิมพ์ชื่อวัตถุ: [จำนวนจุด, ตัวอย่าง (x, y แมพ, z, ช่อง)]
    ที่เหลือได้: ของเตี้ย ≤ 0.7 ม. (โพเดียม/โล่/ขอบชั้นแรก) ที่ปลายกำแพงตะวันออก/ตก — บังแค่ปลายเท้าตัวละครที่ยืนชิดกำแพง (ของจริงก็บัง)"""
    T = d['T']; walk = set((x, y) for y in range(d['h']) for x in range(d['w']) if T[y][x] == DIRT)
    front_objs = set(o for c in cols.values() if c.name.startswith('f_') for o in c.objects)
    bad = {}
    for o in sc.objects:
        if o.type != 'MESH' or o in front_objs or o.name.startswith(('cf', 'ch')): continue
        for v in o.data.vertices:
            x, y, z = v.co
            if z < 0.12: continue
            mx, my = x + MAPW / 2, MAPW / 2 - y; yp = my - SH * z
            if mx < -1 or mx > MAPW + 1 or yp > MAPW: continue
            # ตัวละครยืนในช่อง (tx, ty) กว้าง ±0.35 → จุดนี้อยู่ใต้เท้า (ใกล้กล้องกว่า) แต่ยื่นขึ้นเหนือเท้าเกิน 0.3 ช่อง (บังเกินแค่ปลายเท้า) = บัง
            hit = [(tx_, ty_) for tx_ in range(math.floor(mx - 1.35), math.floor(mx + 0.35) + 1)
                   for ty_ in range(max(0, math.floor(yp) - 1), math.ceil(my)) if (tx_, ty_) in walk and tx_ - 0.35 < mx < tx_ + 1.35 and my > ty_ and yp < ty_ + 0.7]
            if hit:
                b_ = bad.setdefault(o.name, [0, None]); b_[0] += 1
                if b_[1] is None: b_[1] = (round(mx, 2), round(my, 2), round(z, 2), hit[0])
    print('ตรวจการบัง (ภาพพื้นยื่นทับตัวละคร):', bad or 'ไม่มี ✓', flush=True)


# ================================================================ ติดตั้ง
def post(rgb):
    """โทนกลาง "premium RO": อิ่มสี + คอนทราสต์เล็กน้อย (ใช้ชุดเดียวกันทั้งภาพพื้น ชั้นหน้า และผู้ชม → ต่อกันไม่สะดุด)"""
    from PIL import ImageEnhance
    rgb = ImageEnhance.Color(rgb).enhance(1.16)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.05)
    return ImageEnhance.Brightness(rgb).enhance(1.03)


def install(src):
    import numpy as np
    from PIL import Image
    from tree3d import opacity_mask
    from slice_sheet import manifest
    d = load_tiles()
    meta = json.load(open(os.path.join(src, 'meta.json')))
    assert meta['hash'] == d['hash'], 'ผังช่องเปลี่ยนหลังเรนเดอร์ — รัน --extract แล้วเรนเดอร์ใหม่'
    s = meta['ss']
    g = Image.open(os.path.join(src, 'ground.png')).convert('RGB')
    g = post(g)
    full = g.resize((MAPW * PX, MAPW * PX), Image.LANCZOS)   # ยืด ×1/0.76 → ภาพพื้น (เกมบีบกลับ)
    full.save(os.path.join(ROOT, 'assets', IMG_GROUND + '.webp'), 'WEBP', quality=86, method=6)
    print('ติดตั้ง', IMG_GROUND, full.size, os.path.getsize(os.path.join(ROOT, 'assets', IMG_GROUND + '.webp')) // 1024, 'KB')
    # ---- ชั้นหน้า: สีจากภาพพื้น (×s) + ความทึบจากหน้ากาก → สไปรต์ตั้งตรง (วาด ×1/s) ----
    pieces = []
    gs = g if g.size[0] == round(MAPW * PX * s) else g.resize((round(MAPW * PX * s), round(MAPW * PX * K * s)), Image.LANCZOS)
    for gname, gm in sorted(meta['groups'].items()):
        m = Image.open(os.path.join(src, f'mask_{gname}.png')).getchannel('A')
        if m.size != gs.size: m = m.resize(gs.size, Image.LANCZOS)
        im = gs.convert('RGBA'); im.putalpha(m)
        bb = m.point(lambda v: 255 if v > 6 else 0).getbbox()
        if not bb: continue
        l, t, r, b = max(0, bb[0] - 2), max(0, bb[1] - 2), min(im.width, bb[2] + 2), min(im.height, bb[3] + 2)
        im = im.crop((l, t, r, b))
        key = f'{IMG_FRONT}_{gname}'
        im.save(os.path.join(ROOT, 'assets', key + '.webp'), 'WEBP', quality=90, method=6)
        ax = gm['x'] * PX * s - l
        ay = (MAPW * PX * K * s) / 2 + (gm['y'] - MAPW / 2) * K * PX * s - t
        sc_ = round(1 / s, 4)
        pieces.append({'id': 'arena_' + gname, 'img': key, 'x': round(gm['x'], 3), 'y': round(gm['y'], 3), 'ax': round(ax, 1), 'ay': round(ay, 1),
                       'scale': sc_, 'block': [], 'jars': [], 'fade': 0.4 if gname == 'podium' else 0.7,   # เสาบาง: จางนิดเดียว (บังน้อยอยู่แล้ว ให้ความลึกยังอ่านออก)
                       'fadeAll': 1, 'dup': 1, 'fb': [60, 12], 'arena': 1,
                       'cull': math.ceil(im.width * sc_ / PX / 2) + 1, 'mask': opacity_mask(im, 16)})
        print('ติดตั้ง', key, im.size, 'จุดยึด', (round(ax, 1), round(ay, 1)), flush=True)
    # ---- ชีตผู้ชม: 4 เฟรม (×1) ตัดเป็นช่อง CELL px เก็บเฉพาะช่องที่มีภาพ + ขอบกันซึม 1 px ----
    crowd = None
    if meta.get('frames'):
        fr = [post(Image.open(os.path.join(src, f'crowd_f{k}.png')).convert('RGBA').convert('RGB')) for k in range(1, 5)]
        al = [Image.open(os.path.join(src, f'crowd_f{k}.png')).getchannel('A') for k in range(1, 5)]
        W, H = fr[0].size
        if W != MAPW * PX and os.environ.get('ARENA_TRY'):   # ลองระบบในเกมด้วยภาพ --preview (ขยาย ×2 — ไม่ใช่ของจริง)
            S1 = (MAPW * PX, round(MAPW * PX * K)); fr = [f.resize(S1, Image.LANCZOS) for f in fr]; al = [a.resize(S1, Image.LANCZOS) for a in al]; W, H = S1
        assert W == MAPW * PX, 'ชีตผู้ชมต้องเรนเดอร์ ×1 (ไม่ใช่ --preview)'
        GW, GH = math.ceil(W / CELL), math.ceil(H / CELL)
        cells, slots = [], []
        for k in range(4):
            a = np.asarray(al[k]); lst = []
            for gy in range(GH):
                for gx in range(GW):
                    if a[gy * CELL:(gy + 1) * CELL, gx * CELL:(gx + 1) * CELL].max() > 10:
                        lst += [gy * GW + gx, len(slots)]; slots.append((k, gx, gy))
            cells.append(lst)
        AC = 20; S2 = CELL + 2
        atlas = Image.new('RGBA', (AC * S2, math.ceil(len(slots) / AC) * S2), (0, 0, 0, 0))
        pads = []
        for k in range(4):
            im = fr[k].convert('RGBA'); im.putalpha(al[k])
            p = Image.new('RGBA', (GW * CELL + 2, GH * CELL + 2), (0, 0, 0, 0)); p.paste(im, (1, 1)); pads.append(p)
        for i, (k, gx, gy) in enumerate(slots):
            atlas.paste(pads[k].crop((gx * CELL, gy * CELL, gx * CELL + S2, gy * CELL + S2)), ((i % AC) * S2, (i // AC) * S2))
        atlas.save(os.path.join(ROOT, 'assets', IMG_CROWD + '.webp'), 'WEBP', quality=84, method=6)
        crowd = {'img': IMG_CROWD, 'cell': CELL, 'gw': GW, 'gh': GH, 'ac': AC, 'cells': cells}
        print('ติดตั้ง', IMG_CROWD, atlas.size, 'ช่อง', [len(c) // 2 for c in cells],
              os.path.getsize(os.path.join(ROOT, 'assets', IMG_CROWD + '.webp')) // 1024, 'KB', flush=True)
    data = {'tool': 'arena3d', 'hash': d['hash'], 'hashRect': [0, 0, d['w'], d['h']], 'arena': {'img': IMG_GROUND}, 'pieces': pieces}
    if crowd: data['crowd'] = crowd
    js = ("'use strict';\n// สร้างอัตโนมัติโดย tools/arena3d.py --install — อย่าแก้ด้วยมือ (แก้ใน tools/arena3d.py แล้วติดตั้งใหม่)\n"
          "// โคลอสเซียม v2 ลานประลอง PvP (docs/RENDER3D_PLAN.md #4) — รวมเข้า BAKE_DATA ของ js/bake_data.js (โหลดต่อจากไฟล์นั้น)\n"
          "// arena.img = ภาพพื้นทั้งแมพ (maps.js renderGround — ไม่มี/โหลดไม่ได้ = arena_ground เดิม) • hash+hashRect = ผังทั้งแมพตอนเรนเดอร์ (ไม่ตรง = ใช้ภาพเดิม)\n"
          "// pieces = ชั้นหน้าฝั่งใต้ (แบบ B: x,y = จุดยึด/จุดเรียงความลึก, scale = ภาพ ×2 วาดครึ่ง) — ภาพซ้ำกับภาพพื้นพอดี มีผลแค่ตอนบังตัวละคร • fadeAll = จางเมื่อผู้เล่นคนใดอยู่หลัง\n"
          "// crowd = ชีตผู้ชม 4 เฟรม: cells[เฟรม] = [ช่องในกริด gw×gh (ช่องละ cell px ที่ ×1), ลำดับในชีต (ac ช่องต่อแถว, ขอบกันซึม 1 px), ...] — js/feel.js F.drawCrowd\n"
          f"BAKE_DATA.{MAP_ID} = {json.dumps(data, separators=(',', ':'))};\n")
    open(os.path.join(ROOT, 'js', 'bake_data_arena.js'), 'w').write(js)
    print('เขียน js/bake_data_arena.js ชั้นหน้า', len(pieces), 'ชิ้น')
    manifest()


if __name__ == '__main__':
    a = sys.argv
    if '--extract' in a: extract()
    elif '--install' in a: install(a[a.index('--install') + 1])
    elif '--render' in a or '--check' in a:
        build(int(a[a.index('--samples') + 1]) if '--samples' in a else 20,
              a[a.index('--out') + 1] if '--out' in a else '/tmp/arena3d',
              float(a[a.index('--ss') + 1]) if '--ss' in a else 2.0, '--preview' in a,
              a[a.index('--only') + 1].split(',') if '--only' in a else None, '--check' in a)
    else: print(__doc__)
