"""ปากทางแสงแดด Hel's Hollow (ประตูเหนือ ขึ้น Wolfwood) — โมเดลด้วย bpy แล้วอบเป็นภาพพื้น 2D (docs/RENDER3D_PLAN.md ข้อ #3 ฝั่ง Hel)

ผลลัพธ์: assets/bake_helcave_daylight.webp  แผ่น patch ช่อง X0..X1 × Y0..Y1 วาดทับพื้นถ้ำ (maps.js seamArt แทนจุดมอสสุ่ม)
  บันไดหินแตก 4 ขั้นลงจากวาร์ป • มอส/หญ้า/เฟิร์นเตี้ยตรงที่แดดส่อง • ใบไม้แห้งจาก Wolfwood ปลิวลงมา • เศษหิน • รากไม้ไต่ขอบผนังหิน
  พื้นถ้ำ = shadow catcher (โปร่ง มีแต่เงา) → พื้นที่วาดด้วยโค้ดยังเห็นต่อเนื่อง • ทุกอย่างเตี้ย (≤ 0.45 ม.) — ขอบเหนือแมพกล้องเลื่อนขึ้นไม่ได้ ของสูงจะถูกตัดหัว
แสง: ซ้ายบนเหมือนทั้งเกม + แดดอุ่นส่องจากปากถ้ำทางเหนือ (extraLights สี 255,236,170 ในเกม)
ผังช่องดึงจากเกมจริง (Playwright: new GameMap('helcave',{lite:true})) → tools/daylight3d_tiles.json + hash ของกรอบ patch

ใช้:
  python3 tools/daylight3d.py --extract
  /tmp/bvenv/bin/python tools/daylight3d.py [--samples 32] [--preview] [--out /tmp/daylight.png]
  python3 tools/daylight3d.py --install /tmp/daylight.png    (ยืด ×1/0.76, บันทึก webp, manifest, เขียน DAYLIGHT_BAKE ใน js/maps.js)
"""
import math, os, sys, json, random, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import ridge3d as RG                                   # ฉาก/วัสดุ/กล้อง/เส้นขอบชุดเดียวกับสันหิน Wolfwood

TILES = os.path.join(ROOT, 'tools', 'daylight3d_tiles.json')
MAP = 'helcave'
K, PX = RG.K, RG.PX
X0, X1, Y0, Y1 = 27, 49, 0, 12                         # กรอบ patch (ช่อง) — ปากทาง x 35..39 y 1..4 กว้างออกเป็นโถง
PORTAL = (37.5, 1.5)                                   # กลางวาร์ปเหนือ (ช่อง 37,1)
SUN = (37.5, 4.5)                                      # กลางวงแดด (ตรงกับ extraLights ใน maps.js: ปากทาง + 2.5 ช่อง)
CX, CY = (X0 + X1) / 2, (Y0 + Y1) / 2
ROCK, CAVE = 8, 7


def fnv_rect(tiles, w):
    h = 0x811c9dc5
    for y in range(Y0, Y1):
        for x in range(X0, X1):
            h ^= tiles[y * w + x]; h = (h * 0x01000193) & 0xffffffff
    return h


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
  const r = await p.evaluate((id) => { const m = new GameMap(id, { lite: true }); return { w: m.w, h: m.h, tiles: Array.from(m.tiles), portals: m.portals }; }, process.argv[3]);
  console.log(JSON.stringify(r)); await b.close(); })();"""
    f = os.path.join(tempfile.gettempdir(), 'daylight3d_extract.js'); open(f, 'w').write(js)
    env = dict(os.environ); env.setdefault('NODE_PATH', subprocess.check_output(['npm', 'root', '-g'], text=True).strip())
    out = subprocess.check_output(['node', f, f'http://127.0.0.1:{srv.server_address[1]}/index.html', MAP], env=env, text=True)
    srv.shutdown()
    r = json.loads(out.strip().splitlines()[-1]); w = r['w']
    data = {'map': MAP, 'w': w, 'h': r['h'], 'rect': [X0, Y0, X1, Y1],
            'rows': {str(y): ''.join('0123456789AB'[v] for v in r['tiles'][y * w + X0:y * w + X1]) for y in range(Y0, Y1)},
            'hash': fnv_rect(r['tiles'], w), 'portals': r['portals']}
    json.dump(data, open(TILES, 'w'), indent=0)
    print('ผังช่อง →', TILES, 'hash', data['hash'])


def load_tiles():
    d = json.load(open(TILES))
    T = {int(y): [int(c, 16) for c in s] for y, s in d['rows'].items()}
    return d, lambda x, y: T[y][x - X0] if (Y0 <= y < Y1 and X0 <= x < X1) else ROCK


def b(mx, my, z=0.0): return (mx - CX, CY - my, z)


def build(samples, out, preview=False):
    import bpy, bmesh
    from mathutils import noise, Vector
    d, tile = load_tiles()
    walk = lambda x, y: tile(int(math.floor(x)), int(math.floor(y))) == CAVE
    def near_rock(x, y, r):
        return any(tile(int(math.floor(x + dx)), int(math.floor(y + dy))) == ROCK for dx in (-r, 0, r) for dy in (-r, 0, r))
    sc = RG.common_scene(); M = RG.materials(); rnd = random.Random(505)
    # แสง: แดดอุ่นจากปากถ้ำทางเหนือแทนแสงจันทร์ฟ้า • ฟ้าโลกโทนถ้ำ
    moon = bpy.data.objects['moon']; moon.data.color = (1.0, 0.86, 0.62); moon.data.energy = 2.2
    moon.rotation_euler = (math.radians(50), 0, math.radians(180))
    sc.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.46, 0.42, 0.52, 1)
    flat = lambda name, c0, c1, scale=4.0, rough=0.8: _flat(name, c0, c1, scale, rough)
    for nd in M['stone'].node_tree.nodes:                                    # หินบันไดมอสน้อยลง (เหลือตามร่อง/ขอบ)
        if nd.type == 'MAP_RANGE' and abs(nd.inputs['From Min'].default_value - 0.47) < 0.01:
            nd.inputs['From Min'].default_value = 0.6; nd.inputs['From Max'].default_value = 0.7
    M['moss'] = flat('moss', (0.06, 0.13, 0.04), (0.30, 0.40, 0.12), 14.0, 0.95)
    M['grass'] = flat('grassb', (0.16, 0.30, 0.07), (0.46, 0.58, 0.20), 3.0, 0.7)
    M['leaf'] = flat('leaf', (0.30, 0.10, 0.04), (0.70, 0.42, 0.12), 2.5, 0.75)
    ink = bpy.data.collections.new('ink'); sc.collection.children.link(ink)
    sun_w = lambda x, y: max(0.0, 1 - math.hypot(x - SUN[0], (y - SUN[1]) * 1.25) / 7.5)   # น้ำหนักแสงแดด (กลางวง = 1)

    # ---------- บันไดหินแตก: 4 ขั้นลงจากวาร์ป (ขั้นบนสุดสูงสุด) • แผ่นหินแตกเป็น 2–3 ก้อน หาย/ร่วงบางก้อน ----------
    V, F = [], []
    def slab(x0, x1, y0, y1, z0, z1, rot=0.0, amp=0.025, cuts=3):
        bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=cuts, use_grid_fill=True)
        base = len(V); idx = {}; cx, cy = (x0 + x1) / 2, (y0 + y1) / 2; c, s = math.cos(rot), math.sin(rot)
        for i, v in enumerate(bm.verts):
            u = v.co; x = u.x * (x1 - x0); y = u.y * (y1 - y0); z = (z0 + z1) / 2 + u.z * (z1 - z0)
            x, y = cx + x * c - y * s, cy + x * s + y * c
            n = noise.noise(Vector((x * 3.1 + 7, y * 3.1, z * 3.1))) * amp
            top = u.z > 0.49
            V.append((x + n * (abs(u.x) > 0.49) * (1 if u.x > 0 else -1), y + n * (abs(u.y) > 0.49) * (1 if u.y > 0 else -1),
                      z + (n * 0.6 if top else 0) - (0.03 * (abs(u.x) > 0.49 or abs(u.y) > 0.49) if top else 0)))   # ขอบบนสึกมน
            idx[v.index] = base + i
        for f in bm.faces: F.append(tuple(idx[v.index] for v in f.verts))
        bm.free()
    STEPS = [(1.55, 2.35, 0.40), (2.35, 3.15, 0.30), (3.15, 3.95, 0.20), (3.95, 4.75, 0.10)]   # (y เหนือ, y ใต้, สูง) ช่องโลก
    for si, (ya, yb, h) in enumerate(STEPS):
        xa, xb = 35.15, 39.85
        # แบ่งแผ่นตามแนวกว้าง 2–3 ก้อน รอยแตกเฉียง
        cuts = sorted(rnd.uniform(xa + 1.0, xb - 1.0) for _ in range(rnd.choice((1, 2))))
        edges = [xa] + cuts + [xb]
        for k in range(len(edges) - 1):
            a, c = edges[k] + 0.04, edges[k + 1] - 0.04
            if si == 3 and k == len(edges) - 2: continue                       # ขั้นล่างสุดหายไปครึ่ง (ร่วงลงโถง)
            sink = rnd.uniform(0.0, 0.05) + (0.06 if (si, k) == (2, 0) else 0)   # ทรุดไม่เท่ากัน
            mx, my = b((a + c) / 2, (ya + yb) / 2)[:2]
            slab(mx - (c - a) / 2, mx + (c - a) / 2, my - (yb - ya) / 2 + 0.03, my + (yb - ya) / 2 - 0.03, 0.0, h - sink, rnd.uniform(-0.035, 0.035))
    # หินร่วงจากขั้นล่าง + เศษหิน
    for _ in range(3):
        x, y = rnd.uniform(38.0, 40.2), rnd.uniform(5.0, 6.2); mx, my, _z = b(x, y)
        slab(mx - 0.3, mx + 0.3, my - 0.22, my + 0.22, 0.0, 0.09, rnd.uniform(-0.6, 0.6), 0.03, 2)
    RV, RF = [], []; nrub = 0
    for _ in range(900):
        x, y = rnd.uniform(X0 + 1, X1 - 1), rnd.uniform(Y0 + 1, Y1 - 0.5)
        if not walk(x, y) or (35.0 < x < 40.0 and 1.4 < y < 4.8): continue
        w = sun_w(x, y)
        if rnd.random() > (0.02 + (0.22 if near_rock(x, y, 0.5) else 0.04)) * min(1, w * 2.5): continue
        r = rnd.uniform(0.04, 0.16) * (1.3 if near_rock(x, y, 0.5) else 1); mx, my, _z = b(x, y)
        RG.lump(RV, RF, mx, my, 0.0, r, rnd, 0.5); nrub += 1
    RG.mesh_obj('steps', V, F, M['stone'], ink)
    RG.mesh_obj('rubble', RV, RF, M['stone'], ink, smooth=True)

    # ---------- มอสพรมตามแสงแดด (แผ่นนูนบาง ขอบหยัก) + มอสในร่องบันได ----------
    MV, MF = [], []
    def moss_pad(x, y, r, z=0.0):
        n = 14; c = len(MV); mx, my, _z = b(x, y); MV.append((mx, my, z + 0.022))
        for k in range(n):
            a = k * 6.283 / n; rr = r * (0.7 + 0.5 * noise.noise(Vector((x * 2 + math.cos(a), y * 2 + math.sin(a), 0.3))) + 0.15 * rnd.random())
            MV.append((mx + math.cos(a) * rr, my + math.sin(a) * rr * 0.9, z + 0.004))
        for k in range(n): MF.append((c, c + 1 + k, c + 1 + (k + 1) % n))
    npad = 0
    for _ in range(2600):
        x, y = rnd.uniform(X0 + 0.5, X1 - 0.5), rnd.uniform(Y0 + 1.0, Y1 - 0.3)
        w = sun_w(x, y)
        if w <= 0 or not walk(x, y) or (35.1 < x < 39.9 and 1.5 < y < 4.8): continue
        edge = near_rock(x, y, 0.45)
        if rnd.random() > w * (0.5 if edge else 0.14): continue
        for _k in range(rnd.randint(1, 4)): moss_pad(x + rnd.uniform(-0.2, 0.2), y + rnd.uniform(-0.15, 0.15), rnd.uniform(0.06, 0.2) * (0.6 + 0.6 * w))
        npad += 1
    for (ya, yb, h) in STEPS:                                                  # มอสขึ้นตามซอกขั้นบันได (ขอบซ้าย/ขวาที่ชิดผนัง)
        for x in (35.3, 35.6, 39.4, 39.7):
            if rnd.random() < 0.7: moss_pad(x + rnd.uniform(-0.1, 0.1), rnd.uniform(ya + 0.15, yb - 0.15), rnd.uniform(0.1, 0.2), h - 0.02)
    RG.mesh_obj('moss', MV, MF, M['moss'], smooth=True)

    # ---------- หญ้ากอเตี้ย + เฟิร์นเล็ก (≤ 0.25 ม.) ----------
    GV, GF = [], []; ng = 0
    def tuft(x, y, hmax):
        mx, my, _z = b(x, y); n = rnd.randint(7, 13)
        for _ in range(n):
            a = rnd.random() * 6.283; lean = rnd.uniform(0.15, 0.55); h = hmax * rnd.uniform(0.55, 1.0); wd = 0.018
            dx, dy = math.cos(a), math.sin(a); px, py = -dy, dx
            bx, by = mx + dx * 0.03, my + dy * 0.03; c = len(GV)
            GV.extend([(bx + px * wd, by + py * wd, 0), (bx - px * wd, by - py * wd, 0),
                   (bx + dx * lean * h * 0.5 + px * wd * 0.6, by + dy * lean * h * 0.5 + py * wd * 0.6, h * 0.6),
                   (bx + dx * lean * h * 0.5 - px * wd * 0.6, by + dy * lean * h * 0.5 - py * wd * 0.6, h * 0.6),
                   (bx + dx * lean * h, by + dy * lean * h, h)])
            GF.extend([(c, c + 1, c + 3, c + 2), (c + 2, c + 3, c + 4)])
    FV, FF = [], []; nf = 0
    for _ in range(4000):
        x, y = rnd.uniform(X0 + 0.5, X1 - 0.5), rnd.uniform(Y0 + 1.0, Y1 - 0.3)
        w = sun_w(x, y)
        if w <= 0.12 or not walk(x, y) or (35.1 < x < 39.9 and 1.5 < y < 4.8): continue
        edge = near_rock(x, y, 0.4)
        if edge and rnd.random() < 0.05 * w:
            mx, my, _z = b(x, y); RG.fern(FV, FF, mx, my, 0.0, rnd.uniform(0.22, 0.34), rnd, 0.16); nf += 1
        elif rnd.random() < w * (0.6 if edge else 0.22):
            tuft(x, y, rnd.uniform(0.09, 0.2) * (0.6 + 0.5 * w)); ng += 1
    RG.mesh_obj('grass', GV, GF, M['grass'])
    RG.mesh_obj('ferns', FV, FF, M['fern'])

    # ---------- ใบไม้แห้งจาก Wolfwood ปลิวลงมา (หนาแน่นใต้ปากทาง กระจายออก) ----------
    LV, LF = [], []; nl = 0
    for _ in range(260):
        x = PORTAL[0] + rnd.gauss(0, 2.4); y = PORTAL[1] + 1.2 + abs(rnd.gauss(0, 2.6))
        if not walk(x, y) and not (35.0 < x < 40.0 and 1.4 < y < 4.8): continue
        z = 0.004
        for (ya, yb, h) in STEPS:
            if 35.15 < x < 39.85 and ya < y < yb: z = h - 0.02
        mx, my, _z = b(x, y); a = rnd.random() * 6.283; L = rnd.uniform(0.05, 0.11); W = L * rnd.uniform(0.35, 0.55); c = len(LV)
        dx, dy = math.cos(a), math.sin(a); px, py = -dy, dx; curl = rnd.uniform(0.0, 0.02)
        LV += [(mx - dx * L, my - dy * L, z), (mx + px * W, my + py * W, z + curl), (mx + dx * L, my + dy * L, z + curl * 0.5), (mx - px * W, my - py * W, z + curl)]
        LF.append((c, c + 1, c + 2, c + 3)); nl += 1
    RG.mesh_obj('leaves', LV, LF, M['leaf'])

    # ---------- รากไม้: ไต่ลงจากขอบผนังหินสองข้างปากทาง + ขอบโถง (บนหิน สูงได้ บนพื้นเดินแนบพื้น) ----------
    paths = []
    starts = [(34.85, 1.4, 1), (34.9, 2.7, 1), (34.8, 4.1, 1), (40.15, 1.7, -1), (40.1, 3.2, -1), (41.3, 4.7, -1),
              (33.4, 5.5, 1), (43.2, 4.5, -1), (31.4, 7.0, 1), (45.4, 5.0, -1)]
    for (x, y, sgn) in starts:                                                 # รากโผล่จากซอกผนัง เลื้อยแนบพื้นเป็นคลื่น
        for br in range(rnd.randint(1, 2)):
            px_, py_ = x + rnd.uniform(-0.15, 0.15), y + rnd.uniform(-0.25, 0.25); p = []; r0 = rnd.uniform(0.04, 0.07)
            head = math.atan2(rnd.uniform(0.3, 1.0), sgn * rnd.uniform(0.4, 1.0)); L = rnd.uniform(1.2, 2.6); n = int(L / 0.08); ph = rnd.random() * 6
            for i in range(n):
                t = i / n
                if 35.15 < px_ < 39.85 and 1.5 < py_ < 4.8: break                 # ไม่ทับบันได
                r = r0 * (1 - 0.75 * t); p.append((*b(px_, py_)[:2], r * 0.55, r))
                ang = head + 0.55 * math.sin(i * 0.35 + ph) + rnd.uniform(-0.15, 0.15); px_ += math.cos(ang) * 0.08; py_ += math.sin(ang) * 0.08
            if len(p) > 5: paths.append(p)
    RG.root_curve('roots', paths, M['root'], ink)
    print(f'บันได {len(STEPS)} ขั้น • เศษหิน {nrub} • มอส {npad} • หญ้า {ng} • เฟิร์น {nf} • ใบไม้ {nl} • ราก {len(paths)}')

    # ---------- พื้น = shadow catcher ----------
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, -0.004)); pl = bpy.context.active_object
    pl.scale = (60, 40, 1); pl.is_shadow_catcher = True
    ss = 1 if preview else 2
    RG.camera(sc, (0, 0, 0), X1 - X0, (X1 - X0) * PX * ss, round((Y1 - Y0) * PX * K * ss))
    RG.freestyle(sc, ink, 0.9 * ss)
    sc.cycles.samples = samples; sc.view_settings.exposure = 0.15
    sc.render.filepath = out
    bpy.ops.render.render(write_still=True)
    print('เรนเดอร์ →', out)


def _flat(name, c0, c1, scale, rough):
    import bpy
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; bs = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = 5
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    r = nt.nodes.new('ShaderNodeValToRGB'); r.color_ramp.elements[0].color = (*c0, 1); r.color_ramp.elements[1].color = (*c1, 1)
    nt.links.new(nz.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], bs.inputs['Base Color'])
    bs.inputs['Roughness'].default_value = rough
    return m


def install(src):
    from PIL import Image, ImageEnhance
    from slice_sheet import manifest
    d, _ = load_tiles()
    im = Image.open(src).convert('RGBA').resize(((X1 - X0) * PX, (Y1 - Y0) * PX), Image.LANCZOS)
    a = im.getchannel('A'); rgb = ImageEnhance.Contrast(ImageEnhance.Color(im.convert('RGB')).enhance(1.15)).enhance(1.05)
    im = Image.merge('RGBA', (*rgb.split(), a))
    dst = os.path.join(ROOT, 'assets', 'bake_helcave_daylight.webp'); im.save(dst, 'WEBP', quality=88, method=6)
    print('ติดตั้ง →', dst, im.size)
    manifest()
    meta = {MAP: {'img': 'bake_helcave_daylight', 'rect': [X0, Y0, X1, Y1], 'hash': d['hash']}}
    js = os.path.join(ROOT, 'js', 'maps.js'); s = open(js, encoding='utf-8').read()
    line = 'const DAYLIGHT_BAKE = ' + json.dumps(meta, separators=(',', ':')) + '; // tools/daylight3d.py --install'
    s2, n = re.subn(r'^const DAYLIGHT_BAKE = .*$', lambda _: line, s, flags=re.M)
    if n: open(js, 'w', encoding='utf-8').write(s2); print('อัปเดต js/maps.js DAYLIGHT_BAKE')
    else: print('ไม่พบบรรทัด DAYLIGHT_BAKE ใน js/maps.js — ใส่เอง:\n' + line)


if __name__ == '__main__':
    a = sys.argv
    arg = lambda k, dflt: a[a.index(k) + 1] if k in a else dflt
    if '--extract' in a: extract()
    elif '--install' in a: install(a[a.index('--install') + 1])
    else: build(int(arg('--samples', 32)), arg('--out', '/tmp/daylight.png'), '--preview' in a)
