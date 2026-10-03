"""ชุดอาคาร 3D ของ Neo Eldheim: หอคอย CENTRAL CORE + ร้านค้า 4 ร้าน (docs/RENDER3D_PLAN.md ข้อ #7 + #14) — โมเดลด้วย bpy แล้วอบเป็นสไปรต์ 2D แบบ B

v2 (2026-10-03): ปั้นตาม "ภาพวาดเดิม" (assets/prop_bld_tower/shop/house/forge.webp) เป็นต้นแบบ — v1 (ปราสาทขาวหลังคากรวยฟ้า + ร้านผนังครีม
  หลังคาจั่วสีแบนใหญ่) ถูกปฏิเสธเพราะเสียเอกลักษณ์ Norse-tech ของภาพวาด
  สไตล์: "premium 3D กลิ่นอาย Ragnarok" — เส้นขอบ Freestyle สีอิ่ม น่ารัก • วัสดุชุดภาพวาด: หินเทาก้อนใหญ่ + แผ่นหินชนวนเข้ม + ซี่/ขอบบรอนซ์สลักลายถัก
  + ไม้ซุงเข้ม + ไฟรูนฟ้าเรือง #5fd4ff + ไฟอุ่นในร้าน • หลังคากระเบื้อง/แผ่นชนวนมีลายแผ่น มอส รอยสึก (สีหม่นต่างกันทุกร้าน)
อาคาร (ฐานภาพ = ฐานชนพอดี ไม่มีกำแพงล่องหน • ประตูหันใต้ = หันหากล้อง):
  CENTRAL CORE (castle 11×7 ที่ 15,2): หอแปดเหลี่ยม 3 ชั้นสอบขึ้น — ชั้นล่างค้ำยันหินเอียงมีซี่บรอนซ์ลายถัก ผนังชนวนเข้มช่องแสงรูนฟ้า
      ซุ้มประตูโค้งแหลมเรืองฟ้า + ป้าย CENTRAL CORE (เห็นในจอเสมอ) • เสาคริสตัล 2 มุมหน้า • ชั้นกลางธงฟ้าลายถัก • ยอด: วงแหวนรูนเรืองลอย
      บนแขนบรอนซ์ + ยอดแหลมคริสตัล
  ร้าน 8×6 (ฐานหินเต็มฐานชน + ซุ้มน้ำลอดตรงคลอง — ต่อจากปากอุโมงค์ในพื้นเมืองอบ tools/town3d.py):
    SUPPLY  (ภาพ prop_bld_shop) หลังคาโค้งแผ่นโลหะคาดบรอนซ์ เหรียญรูนเขาจันทร์เสี้ยวบนหน้าจั่ว กันสาดผ้าฟ้าลายฟันปลา ประตูเปิดไฟอุ่น
            ถังโลหะช่องแสงฟ้า + ท่อ • ลัง ถัง กระสอบ หม้อคริสตัล แผงขายยา/ผลไม้
    ARMORY  (ภาพ prop_bld_house) บ้านยาวนอร์สจั่วชัน ไม้ปั้นลมไขว้หัวมังกร หน้าต่างวงล้อรูน มุขทางเข้าจั่วเล็ก ปีกข้างหลังคาเพิง ผนังโล่ หุ่นเกราะ ชั้นหอก/ดาบ
    PLATING (ใหม่ — เดิมใช้ภาพเดียวกับ ARMORY) โรงชุบ 2 ชั้น: ล่างหินเทา บนโครงไม้ผนังปูนครีม หลังคาปั้นหยาทองแดงเขียวสนิม โดมแก้วเรืองเขียว
            อ่างชุบเรืองเขียว + ถังแก้วสูง + ท่อทองแดง
    FORGE   (ภาพ prop_bld_forge) โรงตีเหล็กหน้าเปิด เตาอิฐโค้งเรืองส้ม ปล่องหินกลมช่องไฟส้ม ตราทั่งมีเขา ทั่ง+เหล็กแดง ถังชุบ ลังทองแท่ง ชั้นเครื่องมือ
กล้องสไปรต์: ออร์โธ yaw 0 แต่ "ก้มน้อยกว่ากล้องเกม" (BTILT = 57° จากแนวดิ่ง — แบบภาพวาดที่โกงมุมให้เห็นหน้าอาคารมากกว่าหลังคา)
  yaw 0 → ขอบซ้าย/ขวา/หน้าของฐานตรงกับฐานชนพอดีทุกมุมก้ม (ขอบหลังถูกตัวอาคารบังเอง) • เงาบนพื้นยังเรนเดอร์ด้วยกล้องเกม (ทิศเดียวกับทั้งเกม)
งบความสูงหอคอย: จอคอม 1280×720 ยืนหน้าประตู (y 9.6) เห็นสูง ~7.4 ม. จอ เหนือขอบหน้าฐาน (ชั้นล่าง + ป้าย + ชั้นกลาง) • มือถือ ~12 ม. (เห็นถึงยอด)
แสง: sun ซ้ายบน z = −135° (เงาตกขวาล่าง เหมือนทั้งเกม) + fill อุ่นจากหน้า + ไฟจุดในประตู/เตา/อ่าง (แสงสาดบนพื้นระเบียง)
ผลลัพธ์: สไปรต์ B 80 px/ม. (เรนเดอร์ ×2 แล้วย่อ — เกมวาด ×0.5) + เงาบนพื้น (shadow catcher, แบบ A 40 px/ม. ยืด ×1/0.76)
  meta: จุดยึด = กลางขอบหน้าฐาน (พื้น) • ป้าย (ตำแหน่ง/ความกว้าง px) • glows = จุดเรืองกะพริบ (เตา/อ่าง/คริสตัล) • mask = ตารางทึบหยาบ (จางเมื่ออยู่หลัง)
ผังช่อง: ดึงจากเกมจริง (Playwright) → tools/bld3d_tiles.json • hash ผังช่องในกรอบของแต่ละอาคาร (รวมคลองหน้าร้าน) — ไม่ตรงแม้หลังเดียว
  = เกมใช้ภาพวาดเดิมทั้งชุด + console.warn ครั้งเดียว (js/bake.js Bake.bld) • ปิดทั้งชุดด้วยมือ: BUILDING_3D = false ใน js/maps.js

ใช้:
  python3 tools/bld3d.py --extract                          (ต้องมี node + playwright) → tools/bld3d_tiles.json
  /tmp/bvenv/bin/python tools/bld3d.py --render [--only core,supply,armory,plating,forge] [--samples 32] [--preview] [--out /tmp/bld3d]
      (BTHREADS=n แบ่ง CPU กับงานเรนเดอร์อื่น • BTILT=องศา ปรับมุมก้มกล้องสไปรต์)
  python3 tools/bld3d.py --install /tmp/bld3d               (→ assets/bake_bld_*.webp + js/bake_data_eldheim_bld.js + manifest)
"""
import math, os, sys, json, random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
TILES = os.path.join(ROOT, 'tools', 'bld3d_tiles.json')
MAP_ID = 'eldheim'
K = 0.76; TH = math.acos(K); SN = math.sin(TH)
PX = 40                        # TILE (px/ม. ที่ 1×)
GPX = 80                       # สไปรต์ในไฟล์ (เกมวาด ×0.5)
SS = 2                         # เรนเดอร์ ×2 แล้วย่อ
RES_A = 80                     # ภาพเงาพื้นเรนเดอร์ 2× → ติดตั้ง 40 px/ม.
WATER, HOUSE = 2, 9
Z_WATER = -0.6                 # ผิวน้ำคลอง (tools/town3d.py)

# อาคารตามป้าย (js/maps.js genTown addBuilding) — key, สีหลังคา (เชิงเส้น), สีป้าย (js), ชนิด
BLD = {
    'CENTRAL CORE': ('core', None, '#6ad8ff'),
    'SUPPLY': ('supply', (0.80, 0.12, 0.16), '#ff5a7a'),
    'ARMORY': ('armory', (0.10, 0.30, 0.78), '#4ab0ff'),
    'PLATING': ('plating', (0.08, 0.52, 0.34), '#5aff9a'),
    'FORGE': ('forge', (0.80, 0.30, 0.06), '#ffa040'),
}
KEYS = ('core', 'supply', 'armory', 'plating', 'forge')


def fnv_rect(tiles, w, rect):
    """hash ผังช่องในกรอบ [x0, y0, x1, y1) — ตรงกับ Bake.bld() ใน js/bake.js (FNV-1a แบบ Bake.rectOk)"""
    x0, y0, x1, y1 = rect; h = 0x811c9dc5
    for y in range(y0, y1):
        for x in range(x0, x1):
            h ^= tiles[y * w + x]; h = (h * 0x01000193) & 0xffffffff
    return h


def hash_rect(b, W, H):
    """กรอบ hash ของอาคาร: ฐาน + ขอบรอบ 1 ช่อง + แถวหน้า 2 แถว (คลองที่ลอดออกมาหน้าร้าน)"""
    return [max(0, b['x'] - 1), max(0, b['y'] - 1), min(W, b['x'] + b['w'] + 1), min(H, b['y'] + b['h'] + 2)]


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
  const r = await p.evaluate(id => { const m = new GameMap(id, { lite: true });
    return { w: m.w, h: m.h, tiles: Array.from(m.tiles), buildings: m.buildings.map(q => ({ x: q.x, y: q.y, w: q.w, h: q.h, kind: q.kind, label: q.label })),
             npcs: m.def.npcs.map(n => [n.id, n.x, n.y]) }; }, process.argv[3]);
  console.log(JSON.stringify(r)); await b.close(); })();"""
    f = os.path.join(tempfile.gettempdir(), 'bld3d_extract.js'); open(f, 'w').write(js)
    env = dict(os.environ); env.setdefault('NODE_PATH', subprocess.check_output(['npm', 'root', '-g'], text=True).strip())
    out = subprocess.check_output(['node', f, f'http://127.0.0.1:{srv.server_address[1]}/index.html', MAP_ID], env=env, text=True)
    srv.shutdown()
    r = json.loads(out.strip().splitlines()[-1]); w, h = r['w'], r['h']
    for b in r['buildings']:
        b['hashRect'] = hash_rect(b, w, h); b['hash'] = fnv_rect(r['tiles'], w, b['hashRect'])
    data = {'map': MAP_ID, 'w': w, 'h': h, 'buildings': r['buildings'], 'npcs': r['npcs'],
            'rows': [''.join('0123456789AB'[v] for v in r['tiles'][y * w:(y + 1) * w]) for y in range(h)]}
    json.dump(data, open(TILES, 'w'), indent=0)
    print('ผังช่อง →', TILES, [(b['label'], b['hash']) for b in r['buildings']])


def load_tiles():
    d = json.load(open(TILES))
    tiles = [int(c, 16) for row in d['rows'] for c in row]
    for b in d['buildings']:
        assert fnv_rect(tiles, d['w'], b['hashRect']) == b['hash']
    return d, tiles


def canal_runs(d, tiles, b):
    """คลองที่ลอดใต้อาคาร: ช่วง x ของน้ำในแถวหน้าฐาน (y = b.y + b.h) ที่ติดอาคาร → [(x0, x1)] พิกัดแมพ"""
    w = d['w']; y = b['y'] + b['h']; out = []; x = b['x']
    while x < b['x'] + b['w']:
        if tiles[y * w + x] == WATER:
            x1 = x
            while x1 < b['x'] + b['w'] and tiles[y * w + x1] == WATER: x1 += 1
            out.append((x, x1)); x = x1
        else: x += 1
    return out


# ============================================================
#  วัสดุ (ชุดเมือง) + ฉาก
# ============================================================


TB = math.radians(float(os.environ.get('BTILT', 60)))   # มุมก้มกล้องสไปรต์อาคาร (จากแนวดิ่ง) — กล้องเกม = acos(0.76) ≈ 40.5°


# ============================================================
#  วัสดุ (ชุด Norse-tech ตามภาพวาด) + ฉาก
# ============================================================
def scene_setup():
    import bpy
    import gate3d as GT
    sc, so = GT.scene('town')
    # สีอิ่มแบบภาพวาด (Ragnarok): Standard แทน AgX (AgX ดึงสีไฟเรือง/บรอนซ์ให้ซีด)
    try: sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    except Exception: pass
    sc.view_settings.exposure = float(os.environ.get('BEXP', 0.0))
    sc.cycles.max_bounces = 6
    sc.cycles.sample_clamp_indirect = 1.5; sc.cycles.sample_clamp_direct = 10.0; sc.cycles.blur_glossy = 1.0
    sc.render.use_persistent_data = True
    if os.environ.get('BTHREADS'): sc.render.threads_mode = 'FIXED'; sc.render.threads = int(os.environ['BTHREADS'])
    w = sc.world.node_tree.nodes['Background']; w.inputs['Color'].default_value = (0.62, 0.70, 0.86, 1); w.inputs['Strength'].default_value = 0.7
    # หน้าอาคารหันใต้ = ด้านหลังแดด (แดดมาจากตะวันตกเฉียงเหนือ เหมือนทั้งเกม) → fill อุ่นจากหน้า-ซ้าย (ฝั่งกล้อง) ให้หน้าร้านสว่างอ่านง่ายแบบภาพวาด
    f = bpy.data.objects['fill']; f.data.energy = float(os.environ.get('BFILL', 2.2)); f.rotation_euler = (math.radians(62), 0, math.radians(-28))
    so.data.energy = float(os.environ.get('BSUN', 3.8))
    return sc, so


def S(r, g, b):
    """สี sRGB 0..255 → ค่าเชิงเส้น (Cycles)"""
    return tuple((c / 255) ** 2.2 for c in (r, g, b))


def materials():
    import bpy

    def new(name):
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
        return m, nt, nt.nodes['Principled BSDF']

    def L(nt, a, b): nt.links.new(a, b)

    def mix(nt, a, b, fac, mode='MIX'):
        m = nt.nodes.new('ShaderNodeMix'); m.data_type = 'RGBA'; m.blend_type = mode
        if isinstance(fac, (int, float)): m.inputs['Factor'].default_value = fac
        else: L(nt, fac, m.inputs['Factor'])
        for sock, v in ((m.inputs[6], a), (m.inputs[7], b)):
            if isinstance(v, tuple): sock.default_value = (*v, 1)
            else: L(nt, v, sock)
        return m.outputs[2]

    def math_(nt, op, a, b=None, clamp=False):
        n = nt.nodes.new('ShaderNodeMath'); n.operation = op; n.use_clamp = clamp
        for i, v in enumerate((a, b)):
            if v is None: continue
            if isinstance(v, (int, float)): n.inputs[i].default_value = v
            else: L(nt, v, n.inputs[i])
        return n.outputs[0]

    def coords(nt, mode='wall'):
        """พิกัดลาย: wall = (x + y, z) วิ่งตามแนวนอนได้ทั้งผนังหันใต้และผนังข้าง • plank = (z, x + y) แผ่นไม้ตั้ง
        • ผิวหงาย (|n.z| > 0.6) ใช้ (x, y) แทนเสมอ (พื้นระเบียง/หลังเชิงเทิน)"""
        tc = nt.nodes.new('ShaderNodeTexCoord'); sp = nt.nodes.new('ShaderNodeSeparateXYZ'); L(nt, tc.outputs['Object'], sp.inputs[0])
        u = math_(nt, 'ADD', sp.outputs['X'], sp.outputs['Y'])
        cb = nt.nodes.new('ShaderNodeCombineXYZ')
        if mode == 'plank': L(nt, sp.outputs['Z'], cb.inputs['X']); L(nt, u, cb.inputs['Y'])
        else: L(nt, u, cb.inputs['X']); L(nt, sp.outputs['Z'], cb.inputs['Y'])
        ge = nt.nodes.new('ShaderNodeNewGeometry'); sn = nt.nodes.new('ShaderNodeSeparateXYZ'); L(nt, ge.outputs['Normal'], sn.inputs[0])
        st = math_(nt, 'GREATER_THAN', math_(nt, 'ABSOLUTE', sn.outputs['Z']), 0.6)
        mv = nt.nodes.new('ShaderNodeMix'); mv.data_type = 'VECTOR'; L(nt, st, mv.inputs['Factor'])
        L(nt, cb.outputs[0], mv.inputs[4]); L(nt, tc.outputs['Object'], mv.inputs[5])
        return mv.outputs[1], tc

    def noise(nt, tc, scale, detail=4, dist=0.0):
        n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = detail
        n.inputs['Distortion'].default_value = dist; L(nt, tc.outputs['Object'], n.inputs['Vector'])
        return n.outputs['Fac']

    def ramp(nt, fac, stops):
        r = nt.nodes.new('ShaderNodeValToRGB'); el = r.color_ramp.elements
        el[0].position, el[0].color = stops[0][0], (*stops[0][1], 1)
        el[1].position, el[1].color = stops[-1][0], (*stops[-1][1], 1)
        for p, c in stops[1:-1]:
            e = el.new(p); e.color = (*c, 1)
        L(nt, fac, r.inputs['Fac'])
        return r.outputs['Color']

    def bump(nt, b, h, strength, dist=0.02):
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = strength; bp.inputs['Distance'].default_value = dist
        L(nt, h, bp.inputs['Height']); L(nt, bp.outputs['Normal'], b.inputs['Normal'])

    def moss_mix(nt, tc, col, amt, scale=1.6):
        """มอสเป็นหย่อม (เขียวสด สไตล์ภาพวาด) — amt 0..1"""
        if amt <= 0: return col
        n = noise(nt, tc, scale * 0.6, 3, 0.6)
        mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.66 - amt * 0.2; mr.inputs['From Max'].default_value = 0.72 - amt * 0.2
        L(nt, n, mr.inputs['Value'])
        return mix(nt, col, S(92, 118, 44), mr.outputs['Result'])

    def blocks(name, c1, c2, mortar, bw=0.7, rh=0.36, rough=0.7, moss=0.0, edge=0.08):
        """หินก้อนใหญ่เรียงแบบอิฐ (ร่องลึกด้วย bump) + สีต่างกันทีละก้อน + ขอบก้อนสว่าง (สึก) + มอสเป็นหย่อม"""
        m, nt, b = new(name)
        v, tc = coords(nt)
        br = nt.nodes.new('ShaderNodeTexBrick'); br.offset = 0.5; br.squash = 1.0
        br.inputs['Color1'].default_value = (*c1, 1); br.inputs['Color2'].default_value = (*c2, 1); br.inputs['Mortar'].default_value = (*mortar, 1)
        br.inputs['Scale'].default_value = 1.0; br.inputs['Mortar Size'].default_value = 0.028; br.inputs['Mortar Smooth'].default_value = 0.5
        br.inputs['Brick Width'].default_value = bw; br.inputs['Row Height'].default_value = rh; br.inputs['Bias'].default_value = 0.0
        L(nt, v, br.inputs['Vector'])
        n = noise(nt, tc, 2.2, 6, 2.0)
        col = mix(nt, br.outputs['Color'], ramp(nt, n, [(0.3, (0.8, 0.8, 0.82)), (0.7, (1.12, 1.1, 1.06))]), 0.6, 'MULTIPLY')
        # ขอบก้อนสว่าง: ใกล้ร่องปูน (Fac เริ่มลด) → สีอ่อนขึ้น (หินสึกมุม แบบภาพวาด)
        e = math_(nt, 'LESS_THAN', br.outputs['Fac'], 0.999)
        col = mix(nt, col, tuple(min(1.0, c * 1.9) for c in c1), math_(nt, 'MULTIPLY', e, edge))
        col = moss_mix(nt, tc, col, moss)
        L(nt, col, b.inputs['Base Color']); b.inputs['Roughness'].default_value = rough
        bump(nt, b, br.outputs['Fac'], 0.7, 0.03)
        return m

    def planks(name, c1, c2, gap, pw=0.26, pl=1.9, rough=0.72):
        """แผ่นไม้ตั้ง (ผนังไม้) / พื้นไม้ (ผิวหงาย) — ร่องเข้ม ลายเสี้ยนไม้ สีต่างกันทีละแผ่น"""
        m, nt, b = new(name)
        v, tc = coords(nt, 'plank')
        br = nt.nodes.new('ShaderNodeTexBrick'); br.offset = 0.37; br.squash = 1.0
        br.inputs['Color1'].default_value = (*c1, 1); br.inputs['Color2'].default_value = (*c2, 1); br.inputs['Mortar'].default_value = (*gap, 1)
        br.inputs['Scale'].default_value = 1.0; br.inputs['Mortar Size'].default_value = 0.014; br.inputs['Mortar Smooth'].default_value = 0.2
        br.inputs['Brick Width'].default_value = pl; br.inputs['Row Height'].default_value = pw; br.inputs['Bias'].default_value = 0.0
        L(nt, v, br.inputs['Vector'])
        mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (0.6, 9.0, 9.0); L(nt, v, mp.inputs['Vector'])
        wv = nt.nodes.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = 'Y'
        wv.inputs['Scale'].default_value = 1.2; wv.inputs['Distortion'].default_value = 5.0; wv.inputs['Detail'].default_value = 2
        L(nt, mp.outputs['Vector'], wv.inputs['Vector'])
        col = mix(nt, br.outputs['Color'], ramp(nt, wv.outputs['Fac'], [(0.0, (0.82, 0.8, 0.78)), (1.0, (1.08, 1.06, 1.0))]), 0.7, 'MULTIPLY')
        L(nt, col, b.inputs['Base Color']); b.inputs['Roughness'].default_value = rough
        bump(nt, b, br.outputs['Fac'], 0.6, 0.02)
        return m

    def timber(name, c0, c1):
        """ซุง/คานไม้ (ลายเสี้ยนตามความยาว — ใช้พิกัด Generated ของวัตถุ)"""
        m, nt, b = new(name)
        tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (3.0, 3.0, 14.0)
        L(nt, tc.outputs['Object'], mp.inputs['Vector'])
        wv = nt.nodes.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.inputs['Scale'].default_value = 2.0; wv.inputs['Distortion'].default_value = 8.0
        wv.inputs['Detail'].default_value = 3; L(nt, mp.outputs['Vector'], wv.inputs['Vector'])
        L(nt, ramp(nt, wv.outputs['Fac'], [(0.0, c0), (1.0, c1)]), b.inputs['Base Color'])
        b.inputs['Roughness'].default_value = 0.7
        bump(nt, b, wv.outputs['Fac'], 0.25, 0.01)
        return m

    def shingles(name, col, course=0.21, width=0.42, moss=0.35, metal=0.0, rough=0.55, mode='wall'):
        """หลังคาแผ่นชนวน/กระเบื้อง • mode wall = แถวตามแนวนอน (กระเบื้องซ้อน) • plank = แผ่นชนวนยาวตามลาด (ภาพวาด)
        • ในแต่ละแถวไล่เข้ม (เงาแผ่นที่ทับ/ขอบแผ่น) • สีต่างกันทีละแผ่น • มอส + รอยสึก"""
        m, nt, b = new(name)
        v, tc = coords(nt, mode)
        br = nt.nodes.new('ShaderNodeTexBrick'); br.offset = 0.5
        c1 = tuple(min(1, c * 1.15) for c in col); c2 = tuple(c * 0.78 for c in col); mo = tuple(c * 0.25 for c in col)
        br.inputs['Color1'].default_value = (*c1, 1); br.inputs['Color2'].default_value = (*c2, 1); br.inputs['Mortar'].default_value = (*mo, 1)
        br.inputs['Scale'].default_value = 1.0; br.inputs['Mortar Size'].default_value = 0.016; br.inputs['Mortar Smooth'].default_value = 0.3
        br.inputs['Brick Width'].default_value = width; br.inputs['Row Height'].default_value = course; br.inputs['Bias'].default_value = 0.0
        L(nt, v, br.inputs['Vector'])
        sp = nt.nodes.new('ShaderNodeSeparateXYZ'); L(nt, v, sp.inputs[0])
        fr = math_(nt, 'FRACT', math_(nt, 'DIVIDE', sp.outputs['Y'], course))
        col_ = mix(nt, br.outputs['Color'], ramp(nt, fr, [(0.0, (1.12, 1.12, 1.12)), (0.75, (0.95, 0.95, 0.95)), (1.0, (0.6, 0.6, 0.62))]), 1.0, 'MULTIPLY')
        col_ = mix(nt, col_, ramp(nt, noise(nt, tc, 0.9, 3), [(0.3, (0.82, 0.84, 0.88)), (0.7, (1.1, 1.08, 1.04))]), 1.0, 'MULTIPLY')
        col_ = moss_mix(nt, tc, col_, moss, 1.3)
        L(nt, col_, b.inputs['Base Color']); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
        h = math_(nt, 'MULTIPLY', fr, br.outputs['Fac'])
        bump(nt, b, h, 0.8, 0.04)
        return m

    def plain(name, col, rough=0.5, metal=0.0, emit=None, es=0.0, coat=0.0):
        m, nt, b = new(name)
        b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
        if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = es
        if coat:
            try: b.inputs['Coat Weight'].default_value = coat
            except Exception: pass
        return m

    def bronze(name, col, glow=0.05):
        """บรอนซ์ด้าน (โลหะครึ่งเดียว — ด้านหลังแดดยังเห็นสีอุ่นแบบภาพวาด) + รอยหม่นเป็นจุด"""
        m, nt, b = new(name)
        tc = nt.nodes.new('ShaderNodeTexCoord')
        c = ramp(nt, noise(nt, tc, 5.0, 4), [(0.35, tuple(x * 0.72 for x in col)), (0.65, col)])
        L(nt, c, b.inputs['Base Color']); b.inputs['Metallic'].default_value = 0.45; b.inputs['Roughness'].default_value = 0.38
        b.inputs['Emission Color'].default_value = (*col, 1); b.inputs['Emission Strength'].default_value = glow
        return m

    def emit(name, col, strength):
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
        nt.nodes.remove(nt.nodes['Principled BSDF'])
        e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*col, 1); e.inputs['Strength'].default_value = strength
        L(nt, e.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
        return m

    def glow_grad(name, c_in, c_out, strength):
        """ช่องเรืองไฟ (ประตู/หน้าต่าง/เตา): กลางสว่าง ขอบเข้ม — ไม่ขาวโพลนทั้งแผ่น"""
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
        nt.nodes.remove(nt.nodes['Principled BSDF'])
        tc = nt.nodes.new('ShaderNodeTexCoord'); gr = nt.nodes.new('ShaderNodeTexGradient'); gr.gradient_type = 'SPHERICAL'
        sub = nt.nodes.new('ShaderNodeVectorMath'); sub.operation = 'SUBTRACT'; sub.inputs[1].default_value = (0.5, 0.5, 0.5)
        L(nt, tc.outputs['Generated'], sub.inputs[0])
        sc_ = nt.nodes.new('ShaderNodeVectorMath'); sc_.operation = 'SCALE'; sc_.inputs['Scale'].default_value = 1.7; L(nt, sub.outputs[0], sc_.inputs[0])
        L(nt, sc_.outputs[0], gr.inputs['Vector'])
        r = ramp(nt, gr.outputs['Fac'], [(0.0, c_out), (1.0, c_in)])
        e = nt.nodes.new('ShaderNodeEmission'); L(nt, r, e.inputs['Color']); e.inputs['Strength'].default_value = strength
        L(nt, e.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
        return m

    def cloth(name, col, rough=0.85):
        m, nt, b = new(name)
        tc = nt.nodes.new('ShaderNodeTexCoord')
        L(nt, ramp(nt, noise(nt, tc, 6.0, 3), [(0.3, tuple(x * 0.82 for x in col)), (0.7, col)]), b.inputs['Base Color'])
        b.inputs['Roughness'].default_value = rough
        try: b.inputs['Sheen Weight'].default_value = 0.5
        except Exception: pass
        return m

    # สี = ค่า sRGB ที่ดูดจากภาพวาด → แปลงเป็นค่าเชิงเส้น (S) ให้ Cycles
    M = {
        'stone': blocks('stone', S(156, 156, 164), S(136, 136, 146), S(84, 84, 94), bw=1.7, rh=0.72, edge=0.14),            # หินเทาก้อนใหญ่ (หอ/ค้ำยัน/ตีนเสา)
        'stoned': blocks('stoned', S(88, 89, 99), S(74, 75, 85), S(34, 34, 40), bw=1.0, rh=0.45, moss=0.15, edge=0.1),      # ฐานหินเข้ม
        'stonew': blocks('stonew', S(150, 144, 134), S(132, 126, 117), S(60, 55, 50), bw=0.75, rh=0.36, edge=0.1),          # หินอุ่น (ชั้นล่างโรงชุบ)
        'brick': blocks('brick', S(160, 72, 44), S(132, 56, 36), S(52, 34, 28), bw=0.3, rh=0.14, rough=0.8, edge=0.06),
        'slate': blocks('slate', S(66, 72, 90), S(56, 61, 78), S(26, 28, 36), bw=1.1, rh=0.55, rough=0.5, edge=0.08),       # แผ่นชนวนเข้ม (ผนังหอ)
        'bronze': bronze('bronze', S(196, 136, 66)),
        'bronzed': bronze('bronzed', S(120, 78, 40), 0.02),
        'gold': bronze('gold', S(232, 180, 80), 0.1),
        'wall': planks('wall', S(140, 92, 52), S(118, 76, 42), S(40, 26, 16)),                 # ผนังไม้แผ่นตั้ง
        'floor': planks('floor', S(176, 128, 76), S(152, 108, 62), S(60, 40, 24), pw=0.22, pl=1.4),   # พื้น/บันไดไม้อ่อน
        'beam': timber('beam', S(78, 50, 30), S(112, 74, 44)),                                  # เสา/คานไม้เข้ม
        'beaml': timber('beaml', S(140, 96, 56), S(178, 130, 80)),                              # ไม้อ่อน (ลัง/โต๊ะ)
        'plaster': blocks('plaster', S(226, 214, 186), S(218, 204, 176), S(200, 186, 158), bw=3.0, rh=1.5, rough=0.85, edge=0.0),
        'iron': plain('iron', S(52, 54, 62), 0.45, 0.7),
        'ironl': plain('ironl', S(150, 158, 172), 0.3, 0.85),
        'steel': plain('steel', S(84, 90, 102), 0.45, 0.4),
        'dark': plain('dark', (0.012, 0.016, 0.026), 0.9),
        'water': plain('water', (0.02, 0.16, 0.34), 0.15, emit=(0.02, 0.2, 0.42), es=0.25),
        'warm': glow_grad('warm', (1.0, 0.80, 0.42), (0.80, 0.30, 0.05), 2.6),
        'cyan': glow_grad('cyan', (0.75, 0.97, 1.0), (0.04, 0.50, 1.0), 3.6),
        'rune': emit('rune', (0.25, 0.80, 1.0), 6.0),
        'fire': glow_grad('fire', (1.0, 0.55, 0.12), (0.9, 0.13, 0.0), 4.2),
        'ember': emit('ember', (1.0, 0.38, 0.05), 4.0),
        'green': glow_grad('green', (0.60, 1.0, 0.62), (0.03, 0.70, 0.22), 3.0),
        'greenw': emit('greenw', (0.25, 1.0, 0.45), 3.5),
        'glass': plain('glass', S(150, 210, 220), 0.05, coat=0.6),
        'cloth_b': cloth('cloth_b', S(58, 102, 140)), 'cloth_c': cloth('cloth_c', S(228, 216, 182)),
        'cloth_r': cloth('cloth_r', S(170, 40, 36)), 'sack': cloth('sack', S(196, 168, 120), 0.95),
        'red': plain('red', S(196, 44, 36), 0.4, coat=0.3), 'blue': plain('blue', S(40, 92, 180), 0.4, coat=0.3),
        'cream': plain('cream', S(236, 222, 188), 0.6), 'leather': plain('leather', S(110, 64, 34), 0.6),
        'green_l': plain('green_l', S(80, 170, 60), 0.6), 'apple': plain('apple', S(210, 40, 30), 0.3, coat=0.5),
        'bread': plain('bread', S(206, 146, 70), 0.7), 'coal': plain('coal', (0.02, 0.018, 0.016), 0.8),
        'plaque': plain('plaque', (0.02, 0.028, 0.05), 0.35, 0.3),     # แผ่นป้ายเข้ม (เกมเขียนชื่อทับ)
        'copper': bronze('copper', S(200, 112, 64), 0.04),
        'verd': plain('verd', S(96, 170, 150), 0.5, 0.2),
        'hay': plain('hay', S(222, 180, 96), 0.9),
    }
    M['roof_supply'] = shingles('roof_supply', S(118, 122, 134), course=0.62, width=1.6, moss=0.05, rough=0.5, mode='plank')     # แผ่นโลหะโค้ง (ภาพวาด)
    M['roof_armory'] = shingles('roof_armory', S(98, 108, 132), course=0.48, width=1.3, moss=0.1, mode='plank')                  # แผ่นชนวนยาวเทาฟ้า
    M['roof_plating'] = shingles('roof_plating', S(84, 156, 136), course=0.2, width=0.36, moss=0.06, metal=0.15)                 # ทองแดงเขียวสนิม (เกล็ด)
    M['roof_forge'] = shingles('roof_forge', S(86, 84, 88), course=0.5, width=1.05, moss=0.12, mode='plank')                    # แผ่นหินชนวนเทาเข้ม
    M['roof_core'] = shingles('roof_core', S(90, 98, 118), moss=0.05)
    M['crystal'] = crystal_mat('crystal', (0.10, 0.62, 1.0), 1.9)
    M['crystal_g'] = crystal_mat('crystal_g', (0.12, 0.95, 0.40), 1.6)
    M['ringb'] = plain('ringb', S(28, 62, 84), 0.4, 0.2)   # แถบวงแหวนรูน (ฟ้าเข้ม)
    M['flag'] = blocks('flag', S(96, 90, 86), S(82, 77, 74), S(38, 34, 32), bw=0.95, rh=0.8, moss=0.12, edge=0.1)   # แผ่นหินพื้นระเบียง
    ao_all()
    return M


def ao_all():
    """เงาซอก (AO) ทุกวัสดุ: คูณสีพื้นด้วย AO → ซอก/มุมเข้ม ขอบนูนเด่นแบบภาพวาด (ไม่ต้องอบ)"""
    import bpy
    for m in bpy.data.materials:
        if not m.use_nodes: continue
        nt = m.node_tree; b = nt.nodes.get('Principled BSDF')
        if not b: continue
        bc = b.inputs['Base Color']
        ao = nt.nodes.new('ShaderNodeAmbientOcclusion'); ao.samples = 8; ao.inputs['Distance'].default_value = 0.35
        r = nt.nodes.new('ShaderNodeValToRGB'); el = r.color_ramp.elements
        el[0].position, el[0].color = 0.0, (0.30, 0.27, 0.32, 1); el[1].position, el[1].color = 0.85, (1, 1, 1, 1)
        nt.links.new(ao.outputs['AO'], r.inputs['Fac'])
        mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 1.0
        if bc.is_linked: nt.links.new(bc.links[0].from_socket, mx.inputs[6])
        else: mx.inputs[6].default_value = bc.default_value
        nt.links.new(r.outputs['Color'], mx.inputs[7]); nt.links.new(mx.outputs[2], bc)


def crystal_mat(name, col, strength):
    """คริสตัลเรือง: เงาแก้ว + เรืองไล่ตามมุมมอง (กลางเข้มอิ่ม ขอบสว่าง) — ไม่ซีดขาวภายใต้ Standard view"""
    import bpy
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    dark = tuple(c * 0.2 for c in col); lite = tuple(min(1.0, c * 0.6 + 0.25) for c in col); deep = tuple(c ** 2.2 * 0.8 for c in col)
    b.inputs['Base Color'].default_value = (*dark, 1); b.inputs['Roughness'].default_value = 0.08
    try: b.inputs['Coat Weight'].default_value = 0.6
    except Exception: pass
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.35
    r = nt.nodes.new('ShaderNodeValToRGB'); r.color_ramp.elements[0].color = (*deep, 1); r.color_ramp.elements[1].color = (*lite, 1)
    nt.links.new(lw.outputs['Facing'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], b.inputs['Emission Color'])
    b.inputs['Emission Strength'].default_value = strength
    return m


# ============================================================
#  เรขาคณิต (bmesh) — ทุกฟังก์ชันคืน object ที่ลิงก์เข้า collection แล้ว
# ============================================================
class Kit:
    def __init__(self, sc, M, coll):
        self.sc, self.M, self.coll = sc, M, coll
        self.cutters = []
        self.created = []   # ทุกวัตถุที่สร้าง (ไว้ย้าย/หมุนทั้งกลุ่ม — ตัวร้านหมุนบนแท่น)
        self.n = 0

    def _obj(self, bm, mat, smooth=False, name=None):
        import bpy
        self.n += 1
        me = bpy.data.meshes.new(name or f'm{self.n}'); bm.to_mesh(me); bm.free()
        if smooth:
            for p in me.polygons: p.use_smooth = True
        o = bpy.data.objects.new(name or f'o{self.n}', me)
        o.data.materials.append(self.M[mat] if isinstance(mat, str) else mat)
        self.coll.objects.link(o); self.created.append(o)
        return o

    def box(self, mat, x0, x1, y0, y1, z0, z1, bevel=0.0, taper=None):
        """กล่อง (พิกัด Blender: x ตะวันออก, y เหนือ, z ขึ้น) • bevel = ลบมุมจริง (ขอบรับแสง) • taper = (sx, sy) ย่อด้านบน"""
        import bmesh
        bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
        for v in bm.verts:
            u = v.co
            sx = 1.0 if not taper or u.z < 0 else taper[0]; sy = 1.0 if not taper or u.z < 0 else taper[1]
            v.co = ((x0 + x1) / 2 + u.x * (x1 - x0) * sx, (y0 + y1) / 2 + u.y * (y1 - y0) * sy, (z0 + z1) / 2 + u.z * (z1 - z0))
        if bevel > 0:
            bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel, segments=2, affect='EDGES', profile=0.5, clamp_overlap=True)
        return self._obj(bm, mat)

    def cyl(self, mat, x, y, r, z0, z1, seg=32, r2=None, smooth=True, caps=True, rot=None):
        """ทรงกระบอก/กรวยตั้ง • rot = Matrix 3x3 หมุนรอบ (x, y, z0) (เช่นถังนอน)"""
        import bmesh
        from mathutils import Matrix, Vector
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=caps, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=z1 - z0,
                              matrix=Matrix.Translation((0, 0, (z1 - z0) / 2)))
        for v in bm.verts:
            p = v.co if rot is None else rot @ v.co
            v.co = Vector((x, y, z0)) + p
        o = self._obj(bm, mat, smooth)
        if smooth:
            try: o.data.set_sharp_from_angle(angle=math.radians(50))
            except Exception: pass
        return o

    def sphere(self, mat, x, y, z, r, sz=1.0, seg=(24, 12)):
        import bmesh
        from mathutils import Matrix
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=seg[0], v_segments=seg[1], radius=r, matrix=Matrix.Translation((x, y, z)) @ Matrix.Diagonal((1, 1, sz, 1)))
        return self._obj(bm, mat, True)

    def poly(self, mat, pts, depth=0.0, axis='y'):
        """รูปหลายเหลี่ยมในระนาบ (x, z) ที่ y = pts[i][1] (หรือระนาบ y,z เมื่อ axis='x') แล้วอัดหนา depth ไปทางเหนือ (+y) / ตะวันออก"""
        import bmesh
        from mathutils import Vector
        bm = bmesh.new()
        vs = [bm.verts.new(p) for p in pts]
        f = bm.faces.new(vs)
        if depth:
            d = Vector((0, depth, 0)) if axis == 'y' else Vector((depth, 0, 0))
            r = bmesh.ops.extrude_face_region(bm, geom=[f])
            for v in [e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)]: v.co += d
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        return self._obj(bm, mat)

    def mesh(self, mat, V, F, smooth=False):
        import bmesh
        bm = bmesh.new(); vs = [bm.verts.new(v) for v in V]
        for f in F: bm.faces.new([vs[i] for i in f])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        return self._obj(bm, mat, smooth)

    def torus(self, mat, R, r, loc=(0, 0, 0), rot=None, seg=(48, 8), arc=None):
        """ห่วง/ส่วนโค้ง (arc=(a0, a1)) ในระนาบ xy ท้องถิ่น → หมุน rot (Matrix 3x3) → เลื่อน loc"""
        import bmesh
        from mathutils import Vector
        bm = bmesh.new(); n, m = seg
        a0, a1 = arc if arc else (0.0, 2 * math.pi)
        closed = arc is None; nn = n if closed else n + 1
        rows = []
        for i in range(nn):
            a = a0 + (a1 - a0) * i / n; ring = []
            for j in range(m):
                b = 2 * math.pi * j / m
                p = Vector(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b)))
                if rot is not None: p = rot @ p
                ring.append(bm.verts.new(p + Vector(loc)))
            rows.append(ring)
        for i in range(nn if closed else nn - 1):
            A, B = rows[i], rows[(i + 1) % nn]
            for j in range(m): bm.faces.new((A[j], A[(j + 1) % m], B[(j + 1) % m], B[j]))
        if not closed: bm.faces.new(rows[0][::-1]); bm.faces.new(rows[-1])
        return self._obj(bm, mat, True)

    def curve(self, mat, paths, res=3):
        """ท่อ/เส้นโค้ง NURBS มีความหนา: paths = [[(x, y, z, รัศมี), ...], ...]"""
        import bpy
        self.n += 1
        cu = bpy.data.curves.new(f'cu{self.n}', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 1.0; cu.bevel_resolution = res; cu.use_fill_caps = True
        for pts in paths:
            sp = cu.splines.new('NURBS'); sp.points.add(len(pts) - 1); sp.use_endpoint_u = True; sp.order_u = 3 if len(pts) > 2 else 2
            for j, (x, y, z, r) in enumerate(pts): sp.points[j].co = (x, y, z, 1); sp.points[j].radius = r
        o = bpy.data.objects.new(f'cu{self.n}', cu); o.data.materials.append(self.M[mat]); self.coll.objects.link(o); self.created.append(o)
        return o

    # ---- ตัด (boolean) ----
    def arch_cutter(self, x0, x1, z0, zs, y0, y1, rise=None, axis='y', seg=24):
        """ตัวตัดช่องโค้ง: ผนังตรง z0..zs แล้วโค้ง (ครึ่งวงรี สูง rise — ค่าเริ่ม = ครึ่งความกว้าง) • ทะลุจาก y0 ถึง y1 (axis 'x' = ช่องในผนังข้าง)"""
        hw = (x1 - x0) / 2; cx = (x0 + x1) / 2; rise = hw if rise is None else rise
        prof = [(x0, z0)] + [(cx - hw * math.cos(math.pi * i / seg), zs + rise * math.sin(math.pi * i / seg)) for i in range(seg + 1)] + [(x1, z0)]
        if axis == 'y':
            V = [(u, y0, z) for u, z in prof] + [(u, y1, z) for u, z in prof]
        else:
            V = [(y0, u, z) for u, z in prof] + [(y1, u, z) for u, z in prof]
        n = len(prof)
        F = [list(range(n))[::-1], list(range(n, 2 * n))] + [[i, (i + 1) % n, n + (i + 1) % n, n + i] for i in range(n)]
        o = self.mesh('dark', V, F)
        o.hide_render = True; self.cutters.append(o)
        return o

    def cut(self, target, cutter, transfer=True):
        m = target.modifiers.new('cut', 'BOOLEAN'); m.operation = 'DIFFERENCE'; m.object = cutter; m.solver = 'EXACT'
        if transfer:
            try: m.material_mode = 'TRANSFER'
            except Exception: pass
        return m

    def bevel(self, o, w=0.03, seg=2):
        m = o.modifiers.new('bev', 'BEVEL'); m.width = w; m.segments = seg; m.limit_method = 'ANGLE'; m.angle_limit = math.radians(40)
        try: m.harden_normals = False
        except Exception: pass
        return m

    # ---- ชิ้นส่วนสถาปัตย์ ----
    def arch_trim(self, mat, cx, y, w, zs, rise=None, r=0.07, z0=None, keystone=None):
        """ขอบโค้งนูน (archivolt) ที่หน้าผนัง y (หันใต้) + เสาข้าง (ถ้ามี z0) + หินหัวโค้ง"""
        hw = w / 2; rise = hw if rise is None else rise
        n = 20; pts = [(cx - hw * math.cos(math.pi * i / n), y - r * 0.6, zs + rise * math.sin(math.pi * i / n), r) for i in range(n + 1)]
        paths = [pts]
        if z0 is not None:
            paths.append([(cx - hw, y - r * 0.6, z0, r), (cx - hw, y - r * 0.6, zs, r)])
            paths.append([(cx + hw, y - r * 0.6, z0, r), (cx + hw, y - r * 0.6, zs, r)])
        self.curve(mat, paths)
        if keystone:
            kz = zs + rise
            self.box(keystone, cx - 0.12, cx + 0.12, y - 0.16, y + 0.02, kz - 0.1, kz + 0.2, bevel=0.02, taper=(1.3, 1.0))

    def gable_roof(self, mat, x0, x1, y0, y1, ze, zr, axis='x', t=0.14, cap='gold'):
        """หลังคาจั่วมีความหนา: axis 'x' = สันวิ่งตะวันออก-ตก (เห็นลาดใต้) • 'y' = สันวิ่งเหนือ-ใต้ (จั่วหันใต้) • คืน (ลาด, สัน)"""
        if axis == 'x':
            ym = (y0 + y1) / 2
            V = [(x0, y0, ze), (x1, y0, ze), (x1, ym, zr), (x0, ym, zr), (x0, y1, ze), (x1, y1, ze)]
            Vb = [(x, y, z - t) for x, y, z in V]
            F = [(0, 1, 2, 3), (3, 2, 5, 4)]
        else:
            xm = (x0 + x1) / 2
            V = [(x0, y0, ze), (xm, y0, zr), (xm, y1, zr), (x0, y1, ze), (x1, y0, ze), (x1, y1, ze)]
            Vb = [(x, y, z - t) for x, y, z in V]
            F = [(0, 3, 2, 1), (1, 2, 5, 4)]
        nV = len(V); VV = V + Vb
        FF = [f for f in F] + [tuple(i + nV for i in f[::-1]) for f in F]
        # ขอบรอบ (ความหนา)
        rim = [0, 1, 2, 5, 4, 3] if axis == 'x' else [0, 1, 4, 5, 2, 3]   # ขอบนอกของแผ่นหลังคา (วนรอบ)
        for i in range(len(rim)):
            a, b = rim[i], rim[(i + 1) % len(rim)]
            FF.append((a, b, b + nV, a + nV))
        o = self.mesh(mat, VV, FF)
        # ครอบสัน (ทอง/เหล็ก)
        if axis == 'x': s = self.curve(cap, [[(x0 - 0.02, ym, zr + 0.02, 0.07), (x1 + 0.02, ym, zr + 0.02, 0.07)]])
        else: s = self.curve(cap, [[(xm, y0 - 0.02, zr + 0.02, 0.07), (xm, y1 + 0.02, zr + 0.02, 0.07)]])
        return o, s

    def tile_rows(self, mat, x0, x1, y0, y1, ze, zr, axis='x', n=7, gap=None):
        """แถวกระเบื้องนูน (ขั้นบันไดเล็ก ๆ ตามลาด) — ให้หลังคาอ่านเป็นแผ่นกระเบื้องหนา ๆ แบบภาพวาด"""
        out = []
        for side in (0, 1):
            for i in range(1, n):
                f = i / n
                if axis == 'x':
                    ym = (y0 + y1) / 2; ya = y0 + (ym - y0) * f if side == 0 else y1 - (y1 - ym) * f
                    z = ze + (zr - ze) * f
                    if gap and side == 0 and ya < gap[2]:   # แถวหน้าที่ถูกจั่วหน้าเจาะ → แยกสองท่อน
                        out.append([(x0 + 0.03, ya, z + 0.012, 0.035), (gap[0], ya, z + 0.012, 0.035)])
                        out.append([(gap[1], ya, z + 0.012, 0.035), (x1 - 0.03, ya, z + 0.012, 0.035)])
                    else: out.append([(x0 + 0.03, ya, z + 0.012, 0.035), (x1 - 0.03, ya, z + 0.012, 0.035)])
                else:
                    xm = (x0 + x1) / 2; xa = x0 + (xm - x0) * f if side == 0 else x1 - (x1 - xm) * f
                    z = ze + (zr - ze) * f
                    out.append([(xa, y0 + 0.03, z + 0.012, 0.035), (xa, y1 - 0.03, z + 0.012, 0.035)])
        return self.curve(mat, out, res=1)


    # ---- ชิ้นส่วนเพิ่ม (v2) ----
    def beam(self, mat, a, b, w, h=None, bevel=0.012):
        """คานไม้หน้าตัดสี่เหลี่ยม w×h จากจุด a ถึง b (ค้ำยันทแยง/จันทัน/ไม้ปั้นลม)"""
        import bmesh
        from mathutils import Vector
        a, b = Vector(a), Vector(b); d = b - a; L = d.length; dz = d.normalized(); h = h or w
        up = Vector((0, 0, 1)) if abs(dz.z) < 0.95 else Vector((0, 1, 0))
        sx = dz.cross(up).normalized(); sy = sx.cross(dz).normalized()
        bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=(w, h, L), verts=bm.verts)
        if bevel > 0: bmesh.ops.bevel(bm, geom=bm.edges[:], offset=min(bevel, w * 0.3, h * 0.3), segments=1, affect='EDGES', clamp_overlap=True)
        c = (a + b) / 2
        for v in bm.verts:
            u = v.co.copy(); v.co = c + sx * u.x + sy * u.y + dz * u.z
        return self._obj(bm, mat)

    @staticmethod
    def ngon(cx, cy, rx, ry, n=8):
        """จุดยอดรูป n เหลี่ยม (รี rx×ry) ที่มี "หน้าแบน" หันใต้ (n หาร 4 ลงตัว)"""
        return [(cx + rx * math.cos(math.pi / n + 2 * math.pi * k / n), cy + ry * math.sin(math.pi / n + 2 * math.pi * k / n)) for k in range(n)]

    def prism(self, mat, cx, cy, rx, ry, z0, z1, top=1.0, n=8):
        """ปริซึม n เหลี่ยมสอบขึ้น (top = สเกลหน้าบน) — หน้าแบนหันใต้"""
        P = self.ngon(cx, cy, rx, ry, n)
        V = [(x, y, z0) for x, y in P] + [(cx + (x - cx) * top, cy + (y - cy) * top, z1) for x, y in P]
        F = [tuple(range(n))[::-1], tuple(range(n, 2 * n))] + [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
        return self.mesh(mat, V, F)

    def face_pt(self, cx, cy, rx, ry, z0, z1, top, k, s, z, out=0.0, n=8):
        """จุดบนหน้าที่ k ของปริซึม (ระหว่างยอด k กับ k+1) ที่สัดส่วน s (0..1) ความสูง z + ยื่นออกตามแนวฉาก out ม."""
        from mathutils import Vector
        P = self.ngon(cx, cy, rx, ry, n); a, b = P[k], P[(k + 1) % n]
        t = (z - z0) / (z1 - z0); f = 1 + (top - 1) * t
        x = cx + ((a[0] + (b[0] - a[0]) * s) - cx) * f; y = cy + ((a[1] + (b[1] - a[1]) * s) - cy) * f
        nx, ny = (b[1] - a[1]), -(b[0] - a[0]); ln = math.hypot(nx, ny); nx, ny = nx / ln, ny / ln
        return Vector((x + nx * out, y + ny * out, z)), Vector((nx, ny, 0)), Vector(((b[0] - a[0]) / math.hypot(b[0] - a[0], b[1] - a[1]), (b[1] - a[1]) / math.hypot(b[0] - a[0], b[1] - a[1]), 0))

    def panel(self, mat, c, nrm, tan, w, h, lean=0.0, out=0.01, t=0.0):
        """แผ่นสี่เหลี่ยมบนผนัง: กลาง c, แนวฉาก nrm, แนวนอน tan, กว้าง w สูง h • lean = เอนตามผนังสอบ (ม. ต่อ ม.) • t = หนา"""
        from mathutils import Vector
        upv = Vector((0, 0, 1)) - nrm * lean; upv.normalize()
        c = c + nrm * out
        Q = [c - tan * w / 2 - upv * h / 2, c + tan * w / 2 - upv * h / 2, c + tan * w / 2 + upv * h / 2, c - tan * w / 2 + upv * h / 2]
        if t <= 0: return self.mesh(mat, [tuple(q) for q in Q], [(0, 1, 2, 3)])
        B = [q - nrm * t for q in Q]
        V = [tuple(q) for q in Q + B]
        return self.mesh(mat, V, [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)])

    def shell(self, mat, V, F, t, offset=-1.0):
        """ผิว (หลังคา) + ความหนาจริงด้วย Solidify"""
        o = self.mesh(mat, V, F)
        nz = sum(p.normal.z for p in o.data.polygons)
        m = o.modifiers.new('sol', 'SOLIDIFY'); m.thickness = t; m.offset = -1.0 if nz > 0 else 1.0; m.use_even_offset = True   # ผิวที่ให้ = ผิวบน หนาลงล่าง
        return o

    def vault(self, mat, x0, x1, y0, y1, zs, rise, t=0.14, seg=20):
        """หลังคาโค้งครึ่งวงรีตามแกนเหนือ-ใต้ (หน้าโค้งหันกล้อง) — คืน (หลังคา, จุดโปรไฟล์)"""
        cx, hw = (x0 + x1) / 2, (x1 - x0) / 2
        prof = [(cx - hw * math.cos(math.pi * i / seg), zs + rise * math.sin(math.pi * i / seg)) for i in range(seg + 1)]
        V = [(x, y0, z) for x, z in prof] + [(x, y1, z) for x, z in prof]
        n = len(prof); F = [(i + 1, i, n + i, n + i + 1) for i in range(n - 1)]
        return self.shell(mat, V, F, t, 1.0), prof

    def gable2(self, mat, x0, x1, y0, y1, ze, zr, t=0.16):
        """หลังคาจั่ว สันเหนือ-ใต้ (จั่วหันกล้อง)"""
        xm = (x0 + x1) / 2
        V = [(x0, y0, ze), (xm, y0, zr), (xm, y1, zr), (x0, y1, ze), (x1, y0, ze), (x1, y1, ze)]
        return self.shell(mat, V, [(0, 3, 2, 1), (1, 2, 5, 4)], t, 1.0)

    def hip(self, mat, x0, x1, y0, y1, ze, zr, t=0.15):
        """หลังคาปั้นหยา (สันตะวันออก-ตก)"""
        ym = (y0 + y1) / 2; d = (y1 - y0) / 2
        a, b = x0 + d * 0.9, x1 - d * 0.9
        V = [(x0, y0, ze), (x1, y0, ze), (x1, y1, ze), (x0, y1, ze), (a, ym, zr), (b, ym, zr)]
        F = [(0, 1, 5, 4), (2, 3, 4, 5), (1, 2, 5), (3, 0, 4)]
        return self.shell(mat, V, F, t, 1.0)

    def pointed(self, x0, x1, zs, k=0.8, n=12):
        """โปรไฟล์โค้งแหลม (gothic) — ส่วนโค้งสองข้างรัศมี k·กว้าง มาบรรจบที่ยอด: [(x, z)] จากโคนซ้ายถึงโคนขวา"""
        w = x1 - x0; hw = w / 2; rho = k * w
        th = math.acos((hw - rho) / rho)
        L = [(x0 + rho + rho * math.cos(math.pi - (math.pi - th) * i / n), zs + rho * math.sin(math.pi - (math.pi - th) * i / n)) for i in range(n + 1)]
        R = [(x0 + x1 - x, z) for x, z in L[::-1]][1:]
        return L + R

    def prof_cutter(self, prof, z0, y0, y1, axis='y'):
        """ตัวตัดจากโปรไฟล์ (x, z) ปิดล่างที่ z0 ทะลุ y0..y1"""
        P = [(prof[0][0], z0)] + prof + [(prof[-1][0], z0)]
        V = [(u, y0, z) for u, z in P] + [(u, y1, z) for u, z in P]
        n = len(P)
        F = [list(range(n))[::-1], list(range(n, 2 * n))] + [[i, (i + 1) % n, n + (i + 1) % n, n + i] for i in range(n)]
        o = self.mesh('dark', V, F); o.hide_render = True; self.cutters.append(o)
        return o

    def prof_trim(self, mat, prof, y, r, z0=None):
        """ขอบนูนตามโปรไฟล์ (x, z) ที่หน้าผนัง y + เสาข้างลงถึง z0"""
        pts = [(x, y, z, r) for x, z in prof]
        if z0 is not None: pts = [(prof[0][0], y, z0, r)] + pts + [(prof[-1][0], y, z0, r)]
        return self.curve(mat, [pts], res=2)

    def light(self, kind, loc, energy, col, radius=0.2, size=None):
        """ไฟจริง (สาดแสงบนพื้น/ผนังรอบ ๆ) — ไม่ติดเส้นขอบ (ไม่อยู่ใน collection เส้น)"""
        import bpy
        self.n += 1
        ld = bpy.data.lights.new(f'L{self.n}', kind); ld.energy = energy; ld.color = col
        if kind == 'POINT': ld.shadow_soft_size = radius
        if kind == 'AREA' and size: ld.size = size
        o = bpy.data.objects.new(f'L{self.n}', ld); o.location = loc; self.sc.collection.objects.link(o); self.created.append(o)
        return o

    def frame(self):
        """เริ่มกลุ่มพิกัดท้องถิ่น — คืนจุดเริ่ม (ใช้กับ place)"""
        return len(self.created)

    def place(self, i0, px, py, phi):
        """ย้ายทุกวัตถุที่สร้างหลัง i0: หมุนรอบแกนตั้ง phi (เรเดียน) แล้วเลื่อนไป (px, py) — คืนฟังก์ชันแปลงจุด"""
        from mathutils import Matrix, Vector
        M = Matrix.Translation((px, py, 0)) @ Matrix.Rotation(phi, 4, 'Z')
        for o in self.created[i0:]: o.matrix_basis = M @ o.matrix_basis   # basis (ไม่ใช่ matrix_world ที่ยังไม่อัปเดตหลังตั้ง location)
        return lambda p: tuple(M @ Vector(p))


# ============================================================
#  อาคาร (พิกัดท้องถิ่น: (0,0,0) = กลางขอบหน้าฐานบนพื้น = จุดยึด • x ตะวันออก • y เหนือ (เข้าไปในอาคาร) • z ขึ้น)
#  ฐานทุกชิ้นอยู่ในฐานชน x ∈ [−W/2, W/2], y ∈ [0, D] (ยกเว้นซุ้มน้ำลอดต่ำกว่าพื้นในช่วงคลอง)
#  คืน info: {'label': (จุด 3D กลางป้าย, กว้าง ม.), 'glows': [(จุด 3D, รัศมี ม., 'r,g,b', ชนิด)]}
# ============================================================
def _rx90():
    from mathutils import Matrix
    return Matrix.Rotation(math.pi / 2, 3, 'X')


def _ry90(s):
    from mathutils import Matrix
    return Matrix.Rotation(s * math.pi / 2, 3, 'Y')


CYAN = '120,220,255'; WARM = '255,190,110'; GREEN = '90,255,154'; FIRE = '255,140,50'


def disc(k, mat, x, y, z, r, t=0.08, seg=40):
    """แผ่นกลมตั้งหันใต้ (หน้าอยู่ที่ y)"""
    o = k.cyl(mat, 0, 0, r, 0.0, t, seg, rot=_rx90()); o.location = (x, y + t, z)
    return o


def lantern(k, x, y, z):
    """โคมเหล็กแขวนแขนยื่น (กรงเหล็ก + แก้วเรืองฟ้า แบบภาพวาด) — คืนจุดกลางโคม"""
    k.curve('iron', [[(x, y + 0.02, z + 0.5, 0.03), (x, y - 0.24, z + 0.56, 0.03), (x, y - 0.3, z + 0.42, 0.022)]])
    k.cyl('iron', x, y - 0.3, 0.13, z + 0.3, z + 0.36, 8, r2=0.05, smooth=False)
    k.cyl('cyan', x, y - 0.3, 0.085, z + 0.06, z + 0.3, 8)
    for a in range(4):
        an = a * math.pi / 2 + math.pi / 4
        k.box('iron', x + 0.1 * math.cos(an) - 0.016, x + 0.1 * math.cos(an) + 0.016, y - 0.3 + 0.1 * math.sin(an) - 0.016, y - 0.3 + 0.1 * math.sin(an) + 0.016, z + 0.04, z + 0.32)
    k.cyl('iron', x, y - 0.3, 0.12, z, z + 0.06, 8, smooth=False)
    return (x, y - 0.3, z + 0.18)


def crate(k, x, y, z, s=0.5, mat='beaml'):
    """ลังไม้ขอบเหล็ก (ขนาด s ม.) + ไม้คาดทแยง"""
    h = s / 2; hz = s * 0.9
    k.box(mat, x - h, x + h, y - h, y + h, z, z + hz, bevel=0.015)
    for a in (-1, 1):
        k.box('beam', x - h - 0.01, x + h + 0.01, y - h - 0.012, y - h + 0.02, z + (0.02 if a < 0 else hz - 0.08), z + (0.08 if a < 0 else hz - 0.02))
    k.beam('beam', (x - h + 0.05, y - h - 0.01, z + 0.06), (x + h - 0.05, y - h - 0.01, z + hz - 0.06), 0.06, 0.03)
    for s_ in (-1, 1): k.box('iron', x + s_ * h - 0.03, x + s_ * h + 0.03, y - h - 0.015, y + h, z, z + hz)


def barrel(k, x, y, z, r=0.26, h=0.62, lid='beam'):
    k.cyl('beaml', x, y, r * 0.88, z, z + h * 0.5, 20, r2=r)
    k.cyl('beaml', x, y, r, z + h * 0.5, z + h, 20, r2=r * 0.88)
    for zz in (0.14, 0.5, 0.86):
        rr = r * (0.93 if zz != 0.5 else 1.0) + 0.012
        k.cyl('iron', x, y, rr, z + h * zz - 0.028, z + h * zz + 0.028, 20)
    k.cyl(lid, x, y, r * 0.84, z + h - 0.01, z + h + 0.015, 20)


def sack(k, x, y, z, r=0.22):
    k.cyl('sack', x, y, r, z, z + r * 1.4, 14, r2=r * 0.8)
    k.sphere('sack', x, y, z + r * 1.4, r * 0.8, sz=0.55)
    k.torus('leather', r * 0.3, 0.025, loc=(x, y, z + r * 1.8), seg=(14, 5))
    k.cyl('sack', x, y, r * 0.28, z + r * 1.8, z + r * 2.1, 10, r2=r * 0.42)


def plaque(k, cx, y, z0, z1, pw, knob='bronze'):
    """แผ่นป้ายเข้มขอบบรอนซ์ (หันใต้) — เกมเขียนชื่ออาคารทับ (ตัวหนังสืออ่านง่ายทุกระดับซูม)"""
    k.box('plaque', cx - pw / 2, cx + pw / 2, y, y + 0.1, z0, z1, bevel=0.02)
    e = [(cx - pw / 2, z0), (cx + pw / 2, z0), (cx + pw / 2, z1), (cx - pw / 2, z1)]
    k.curve('bronze', [[(e[i][0], y, e[i][1], 0.035), (e[(i + 1) % 4][0], y, e[(i + 1) % 4][1], 0.035)] for i in range(4)])
    for s in (-1, 1):
        k.sphere(knob, cx + s * (pw / 2 + 0.06), y, (z0 + z1) / 2, 0.075)
        k.box('bronze', cx + s * (pw / 2) - 0.03, cx + s * (pw / 2) + 0.03, y - 0.01, y + 0.08, z0 - 0.06, z1 + 0.06)


def knot_strip(k, mat, p0, p1, nrm, width, r=0.024, period=0.42):
    """ลายถักนอร์ส: สองเส้นสานกัน (นูนสลับ) ตามแถบ p0 → p1 บนผิวแนวฉาก nrm + เส้นขอบสองข้าง"""
    from mathutils import Vector
    p0, p1, nrm = Vector(p0), Vector(p1), Vector(nrm).normalized()
    d = p1 - p0; L = d.length; t = d.normalized(); side = t.cross(nrm).normalized()
    paths = []
    N = max(12, int(L / period * 10))
    for ph in (0.0, math.pi):
        pts = []
        for i in range(N + 1):
            s = i / N; w = 2 * math.pi * s * L / period + ph
            p = p0 + d * s + side * (width * 0.42 * math.sin(w)) + nrm * (0.018 + 0.012 * math.cos(w))
            pts.append((p.x, p.y, p.z, r))
        paths.append(pts)
    for sg in (-1, 1):
        a = p0 + side * sg * width * 0.55 + nrm * 0.014; b = p1 + side * sg * width * 0.55 + nrm * 0.014
        paths.append([(a.x, a.y, a.z, r * 0.8), (b.x, b.y, b.z, r * 0.8)])
    k.curve(mat, paths, res=2)


def banner(k, cx, y, ztop, w, h, col='cloth_b', trim='cloth_c', emblem='knot'):
    """ธงแขวนหันใต้: ราวบรอนซ์ + ผ้าปลายแหลม + ขอบครีม + ตรา (knot = ลายถักข้าวหลามตัด • anvil = ทั่ง)"""
    k.beam('bronze', (cx - w / 2 - 0.1, y - 0.04, ztop + 0.04), (cx + w / 2 + 0.1, y - 0.04, ztop + 0.04), 0.05)
    for s in (-1, 1): k.sphere('bronze', cx + s * (w / 2 + 0.12), y - 0.04, ztop + 0.04, 0.05)
    tip = h * 0.22
    P = [(cx - w / 2, y, ztop), (cx + w / 2, y, ztop), (cx + w / 2, y, ztop - h), (cx, y, ztop - h - tip), (cx - w / 2, y, ztop - h)]
    k.poly(col, P[::-1], depth=0.025)
    i = 0.06; yy = y - 0.012
    Q = [(cx - w / 2 + i, ztop - 0.05), (cx + w / 2 - i, ztop - 0.05), (cx + w / 2 - i, ztop - h + 0.02), (cx, ztop - h - tip + 0.09), (cx - w / 2 + i, ztop - h + 0.02)]
    k.curve(trim, [[(Q[j][0], yy, Q[j][1], 0.022), (Q[(j + 1) % 5][0], yy, Q[(j + 1) % 5][1], 0.022)] for j in range(5)], res=1)
    zc = ztop - h * 0.5; s = w * 0.3
    if emblem == 'knot':
        for f in (1.0, 0.55):
            D = [(cx, zc + s * f * 1.3), (cx + s * f, zc), (cx, zc - s * f * 1.3), (cx - s * f, zc)]
            k.curve(trim, [[(D[j][0], yy - 0.004, D[j][1], 0.026), (D[(j + 1) % 4][0], yy - 0.004, D[(j + 1) % 4][1], 0.026)] for j in range(4)], res=1)
        k.curve(trim, [[(cx - s * 0.75, yy - 0.006, zc + s * 0.6, 0.022), (cx + s * 0.75, yy - 0.006, zc - s * 0.6, 0.022)],
                       [(cx + s * 0.75, yy - 0.006, zc + s * 0.6, 0.022), (cx - s * 0.75, yy - 0.006, zc - s * 0.6, 0.022)]], res=1)
    elif emblem == 'anvil':
        A = [(-0.5, 0.3), (0.55, 0.3), (0.3, 0.1), (0.15, 0.1), (0.15, -0.15), (0.35, -0.35), (-0.35, -0.35), (-0.15, -0.15), (-0.15, 0.1), (-0.5, 0.2)]
        k.poly('iron', [(cx + a * w * 0.8, yy - 0.01, zc + b * w * 0.8) for a, b in A][::-1], depth=0.012)


def rune_disc(k, x, y, z, r, rune='snow', glow='rune', face='slate', horns=True):
    """เหรียญรูนกลมมีเขาจันทร์เสี้ยว (ภาพวาด SUPPLY/FORGE): หน้าชนวนเข้ม ขอบบรอนซ์ + รูนเรือง + เขาครีมปลายบรอนซ์"""
    disc(k, face, x, y, z, r, 0.16)
    k.torus('bronze', r, 0.075, loc=(x, y - 0.02, z), rot=_rx90(), seg=(48, 8))
    k.torus('bronzed', r * 0.82, 0.03, loc=(x, y - 0.03, z), rot=_rx90(), seg=(40, 6))
    yy = y - 0.035
    if rune == 'snow':   # รูนเกล็ดหิมะ: 3 เส้นตัดกลาง + แฉกปลาย
        for a in (90, 30, 150):
            an = math.radians(a); dx, dz = math.cos(an) * r * 0.62, math.sin(an) * r * 0.62
            k.beam(glow, (x - dx, yy, z - dz), (x + dx, yy, z + dz), 0.11, 0.03, bevel=0)
            for sg in (-1, 1):
                ex, ez = x + sg * dx * 0.78, z + sg * dz * 0.78
                for b in (-0.6, 0.6):
                    bn = an + (math.pi if sg < 0 else 0) + math.pi + b
                    k.beam(glow, (ex, yy, ez), (ex + math.cos(bn) * r * 0.24, yy, ez + math.sin(bn) * r * 0.24), 0.08, 0.03, bevel=0)
    elif rune == 'anvil':
        A = [(-0.62, 0.28), (0.66, 0.28), (0.40, 0.06), (0.20, 0.04), (0.20, -0.22), (0.42, -0.42), (-0.42, -0.42), (-0.20, -0.22), (-0.20, 0.04), (-0.62, 0.16)]
        k.poly(glow, [(x + a * r * 0.85, yy, z + b * r * 0.85) for a, b in A][::-1], depth=0.02)
    if horns:
        for s in (-1, 1):
            k.curve('cream', [[(x + s * r * 0.8, y - 0.04, z - r * 0.35, 0.10), (x + s * r * 1.45, y - 0.04, z + r * 0.05, 0.085),
                               (x + s * r * 1.45, y - 0.04, z + r * 0.75, 0.05), (x + s * r * 1.15, y - 0.04, z + r * 1.15, 0.018)]])
            k.torus('bronze', 0.09, 0.03, loc=(x + s * r * 1.2, y - 0.04, z - r * 0.18), rot=_ry90(1), seg=(16, 5))


def post(k, x, y, z0, z1, w=0.3, foot=True, mat='beam', glow=False):
    """เสาไม้บนตีนหินก้อน + ปลอกบรอนซ์ (แบบภาพวาด) • glow = ตีนหินใหญ่มีช่องแสงรูนฟ้า (มุมอาคาร)"""
    zf = z0 + (0.34 if foot else 0) + (0.3 if glow else 0)
    if foot:
        fw = w * (1.0 if glow else 0.78)
        k.box('stone', x - fw, x + fw, y - fw, y + fw, z0, zf, bevel=0.04)
        if glow:
            k.box('slate', x - 0.07, x + 0.07, y - fw - 0.02, y - fw + 0.02, z0 + 0.12, zf - 0.1)
            k.box('cyan', x - 0.035, x + 0.035, y - fw - 0.03, y - fw, z0 + 0.16, zf - 0.14)
    k.box(mat, x - w / 2, x + w / 2, y - w / 2, y + w / 2, zf, z1, bevel=0.025)
    k.box('bronze', x - w / 2 - 0.03, x + w / 2 + 0.03, y - w / 2 - 0.03, y + w / 2 + 0.03, zf, zf + 0.1, bevel=0.01)


def podium(k, W, D, PZ, door, canals, steps=3, step_mat='stone'):
    """ฐานยกหินเต็มฐานชน + บันไดหน้าประตู + ซุ้มน้ำลอด (ช่วงคลอง — ต่ำกว่าพื้นถึงผิวน้ำ ต่อจากปากอุโมงค์ในพื้นเมืองอบ)"""
    hw = W / 2
    pd = k.box('stoned', -hw, hw, 0, D, 0, PZ, bevel=0.03)
    fl = k.box('flag', -hw + 0.06, hw - 0.06, 0.06, D - 0.06, PZ, PZ + 0.015)
    blocks = [pd, fl]
    for c0, c1 in canals:
        blocks.append(k.box('stoned', c0, c1, 0, 0.4, -0.95, 0.002))   # หน้าผนังคลองใต้ฐาน (เฉพาะช่วงคลอง)
    for c0, c1 in canals:
        a0, a1 = c0 + 0.1, c1 - 0.1
        zs = -0.16; rise = min(PZ - 0.12 - zs, (a1 - a0) / 2)
        cut = k.arch_cutter(a0, a1, -1.2, zs, -0.3, D + 0.3, rise)
        for b in blocks: k.cut(b, cut)
        k.box('water', a0, a1, 0.0, D, Z_WATER - 0.05, Z_WATER)
        k.box('dark', a0, a1, D - 0.05, D, Z_WATER, PZ)
        m = (a0 + a1) / 2
        k.arch_trim('stone', m, 0.0, a1 - a0, zs, rise, r=0.075)
        k.arch_trim('bronze', m, -0.06, a1 - a0 + 0.2, zs, rise + 0.1, r=0.028)
        k.box('stone', m - 0.12, m + 0.12, -0.1, 0.02, zs + rise - 0.06, PZ + 0.01, bevel=0.015, taper=(1.25, 1.0))
        k.box('rune', m - 0.04, m + 0.04, -0.112, -0.1, zs + rise + 0.02, PZ - 0.06)
    k.box('bronze', -hw, hw, -0.012, 0.01, PZ - 0.08, PZ - 0.05)
    if door is not None:
        dx, dw = door
        notch = k.box('dark', dx - dw / 2, dx + dw / 2, -0.3, steps * 0.2, -0.1, PZ + 0.2); notch.hide_render = True; k.cutters.append(notch)
        for b in blocks: k.cut(b, notch)
        for i in range(steps):
            k.box(step_mat, dx - dw / 2, dx + dw / 2, i * 0.2, steps * 0.2 + 0.02, 0, PZ * (i + 1) / steps, bevel=0.02)
        for s in (-1, 1):
            x = dx + s * (dw / 2 + 0.1)
            k.box('stone', x - 0.1, x + 0.1, 0.0, steps * 0.2 + 0.05, 0, PZ + 0.1, bevel=0.02)
    return blocks


def shield(k, x, y, z, r, col, rim, seed):
    """โล่กลมไวกิ้งหันใต้: หน้าโล่สี + แฉกครีม 2 แฉก + ปุ่มเหล็กกลาง + ขอบโลหะ"""
    disc(k, col, x, y, z, r, 0.03)
    a0 = seed * 0.7
    for q in range(2):
        a = a0 + q * math.pi
        V = [(x, y - 0.005, z)] + [(x + r * 0.96 * math.cos(a + t * math.pi / 12), y - 0.005, z + r * 0.96 * math.sin(a + t * math.pi / 12)) for t in range(7)]
        k.mesh('cream' if col != 'cream' else 'red', V, [tuple(range(len(V)))])
    k.torus(rim, r, 0.03, loc=(x, y - 0.01, z), rot=_rx90(), seg=(32, 6))
    k.sphere('ironl', x, y - 0.02, z, r * 0.24)


def armor_stand(k, x, y, z, horns):
    """หุ่นตั้งเกราะ: ฐานไม้ + เสา + เกราะอกเหล็กเงา + บ่าบรอนซ์ + ผ้าคลุมแดง + หมวก (มีเขา)"""
    k.box('beam', x - 0.22, x + 0.22, y - 0.12, y + 0.12, z, z + 0.06, bevel=0.01)
    k.cyl('beam', x, y, 0.035, z + 0.06, z + 0.8, 8)
    k.cyl('ironl', x, y, 0.2, z + 0.75, z + 1.25, 16, r2=0.24)
    k.cyl('ironl', x, y, 0.24, z + 1.25, z + 1.4, 16, r2=0.16)
    k.box('bronze', x - 0.21, x + 0.21, y - 0.24, y - 0.18, z + 1.05, z + 1.1)
    k.box('leather', x - 0.21, x + 0.21, y - 0.22, y - 0.17, z + 0.8, z + 0.87)
    k.poly('cloth_r', [(x - 0.24, y + 0.16, z + 1.38), (x + 0.24, y + 0.16, z + 1.38), (x + 0.3, y + 0.16, z + 0.55), (x - 0.3, y + 0.16, z + 0.55)][::-1], depth=0.02)
    for s in (-1, 1): k.sphere('bronze', x + s * 0.27, y, z + 1.33, 0.11, sz=0.75)
    k.cyl('ironl', x, y, 0.035, z + 1.4, z + 1.5, 8)
    k.sphere('ironl', x, y, z + 1.6, 0.14, sz=1.05)
    k.box('bronze', x - 0.025, x + 0.025, y - 0.15, y - 0.1, z + 1.5, z + 1.72)
    if horns:
        for s in (-1, 1):
            k.curve('cream', [[(x + s * 0.11, y, z + 1.66, 0.035), (x + s * 0.24, y, z + 1.74, 0.025), (x + s * 0.27, y, z + 1.9, 0.012)]])


def weapon_rack(k, x, y, z):
    """ชั้นวางอาวุธ: หอก 2 ด้าม + ดาบ 2 เล่ม + ขวาน"""
    for zz in (0.2, 1.05):
        k.box('beam', x - 0.5, x + 0.5, y - 0.05, y + 0.05, z + zz, z + zz + 0.08, bevel=0.01)
    for s in (-1, 1): post(k, x + s * 0.5, y, z, z + 1.3, w=0.1, foot=False)
    for i in range(5):
        xx = x - 0.34 + i * 0.17
        if i in (0, 4):
            k.cyl('beam', xx, y - 0.06, 0.022, z + 0.05, z + 1.75, 8)
            k.cyl('ironl', xx, y - 0.06, 0.055, z + 1.75, z + 2.0, 4, r2=0.0, smooth=False)
            k.cyl('cloth_r', xx, y - 0.06, 0.03, z + 1.68, z + 1.75, 8)
        elif i == 2:
            k.cyl('beam', xx, y - 0.06, 0.025, z + 0.05, z + 1.45, 8)
            k.poly('ironl', [(xx, y - 0.08, z + 1.45), (xx + 0.22, y - 0.08, z + 1.55), (xx + 0.25, y - 0.08, z + 1.3), (xx, y - 0.08, z + 1.25)][::-1], depth=0.02)
        else:
            k.box('ironl', xx - 0.035, xx + 0.035, y - 0.07, y - 0.05, z + 0.32, z + 1.18)
            k.box('bronze', xx - 0.1, xx + 0.1, y - 0.08, y - 0.04, z + 1.18, z + 1.22)
            k.box('leather', xx - 0.02, xx + 0.02, y - 0.075, y - 0.045, z + 1.22, z + 1.4)
            k.sphere('bronze', xx, y - 0.06, z + 1.42, 0.03)


def lattice(k, x0, x1, z0, z1, y, mat='bronze', sp=0.3):
    """ซี่หน้าต่างลายข้าวหลามตัด (ภาพวาด) + กรอบไม้"""
    w, h = x1 - x0, z1 - z0; paths = []
    c = -h + sp / 2
    while c < w:   # เส้น x' − z' = c
        lo, hi = max(0.0, -c), min(h, w - c)
        if hi - lo > 0.02: paths.append([(x0 + c + lo, y, z0 + lo, 0.022), (x0 + c + hi, y, z0 + hi, 0.022)])
        c += sp
    c = sp / 2
    while c < w + h:   # เส้น x' + z' = c
        lo, hi = max(0.0, c - w), min(h, c)
        if hi - lo > 0.02: paths.append([(x0 + c - lo, y, z0 + lo, 0.022), (x0 + c - hi, y, z0 + hi, 0.022)])
        c += sp
    k.curve(mat, paths, res=1)
    k.curve('beam', [[(x0, y, z0, 0.05), (x1, y, z0, 0.05)], [(x0, y, z1, 0.05), (x1, y, z1, 0.05)],
                     [(x0, y, z0, 0.05), (x0, y, z1, 0.05)], [(x1, y, z0, 0.05), (x1, y, z1, 0.05)]], res=1)


def ring_runes(k, cx, cy, R, z, a0, a1, h, n):
    """อักษรรูนเรืองบนผิวนอกวงแหวน (มุม a0..a1 องศา, สูงตัวอักษร h)"""
    import gate3d as GT, bifrost3d as BF
    if GT.RUNES is None: BF.init_runes()
    names = [g for g in ('f', 'u', 'r', 'k', 'ing', 'b', 'w', 's') if g in GT.RUNES] + [g for g in GT.RUNES if g not in ('f', 'u', 'r', 'k', 'ing', 'b', 'w', 's')]
    w = h * 0.62; wd = 0.075; Rr = R + 0.012
    V = []; F = []
    for i in range(n):
        ang = math.radians(a0 + (a1 - a0) * (i + 0.5) / n)
        for (a, b) in GT.RUNES[names[i % len(names)]]:
            u0, z0 = (a[0] - 0.5) * w, (a[1] - 0.5) * h; u1, z1 = (b[0] - 0.5) * w, (b[1] - 0.5) * h
            Lr = math.hypot(u1 - u0, z1 - z0) + wd; an2 = math.atan2(z1 - z0, u1 - u0)
            uu, uz = math.cos(an2), math.sin(an2); vu, vz = -uz, uu; mu, mz = (u0 + u1) / 2, (z0 + z1) / 2
            base = len(V)
            for su, sv in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                pu = mu + uu * su * Lr / 2 + vu * sv * wd / 2; pz = mz + uz * su * Lr / 2 + vz * sv * wd / 2
                an = ang - pu / Rr   # u บวก = ไปทางขวาเมื่อมองจากนอกวง (มุมลดลงด้านหน้า)
                V.append((cx + Rr * math.cos(an), cy + Rr * math.sin(an), z + pz))
            F.append((base, base + 1, base + 2, base + 3))
    o = k.mesh('rune', V, F)
    return o


def band(k, mat, cx, cy, r0, r1, z0, z1, seg=64):
    """วงแหวนหน้าตัดสี่เหลี่ยม (รัศมีใน r0 นอก r1)"""
    V = []; F = []
    for i in range(seg):
        a = 2 * math.pi * i / seg; c, s = math.cos(a), math.sin(a)
        V += [(cx + r0 * c, cy + r0 * s, z0), (cx + r1 * c, cy + r1 * s, z0), (cx + r1 * c, cy + r1 * s, z1), (cx + r0 * c, cy + r0 * s, z1)]
    for i in range(seg):
        j = (i + 1) % seg
        for q in range(4):
            F.append((4 * i + q, 4 * j + q, 4 * j + (q + 1) % 4, 4 * i + (q + 1) % 4))
    o = k.mesh(mat, V, F, smooth=True)
    try: o.data.set_sharp_from_angle(angle=math.radians(50))
    except Exception: pass
    return o


# ---------------------------------------------------------------- หอคอย CENTRAL CORE
def buttress(k, C, kk, zt, d0, d1, w, knot=True, rib=True):
    """ค้ำยันหินเอียงที่มุม kk ของปริซึม C (ภาพวาด: แท่งหินเทาสอบขึ้น + ซี่บรอนซ์ลายถักบนหน้านอก)"""
    from mathutils import Vector
    P = k.ngon(C['cx'], C['cy'], C['rx'], C['ry'])
    vx, vy = P[kk]; a = math.atan2(vy - C['cy'], vx - C['cx'])
    o = Vector((math.cos(a) / C['rx'], math.sin(a) / C['ry'], 0)).normalized(); t = Vector((-o.y, o.x, 0))
    z0 = C['z0']; ft = 1 + (C['top'] - 1) * (zt - z0) / (C['z1'] - z0)
    b0 = Vector((vx, vy, z0)); b1 = Vector((C['cx'] + (vx - C['cx']) * ft, C['cy'] + (vy - C['cy']) * ft, zt))
    Vv = []
    for base, d, ww in ((b0, d0, w), (b1, d1, w * 0.86)):
        i_ = base - o * 0.3; e_ = base + o * d
        Vv += [tuple(i_ - t * ww / 2), tuple(i_ + t * ww / 2), tuple(e_ + t * ww / 2), tuple(e_ - t * ww / 2)]
    k.mesh('stone', Vv, [(3, 2, 1, 0), (4, 5, 6, 7), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)])
    e0 = b0 + o * d0; e1 = b1 + o * d1
    fn = t.cross(e1 - e0).normalized()
    if fn.dot(o) < 0: fn = -fn
    k.beam('bronze', tuple(b1 - o * 0.3 + Vector((0, 0, 0.06))), tuple(b1 + o * (d1 + 0.08) + Vector((0, 0, 0.06))), w * 0.95, 0.14)   # หมวกบรอนซ์
    if rib:
        rw = w * 0.72; q0, q1 = e0 + Vector((0, 0, 0.4)), e1 - (e1 - e0).normalized() * 0.06
        Q = [q0 - t * rw / 2 + fn * 0.012, q0 + t * rw / 2 + fn * 0.012, q1 + t * rw * 0.43 + fn * 0.012, q1 - t * rw * 0.43 + fn * 0.012]
        B = [q - fn * 0.07 for q in Q]
        k.mesh('bronzed', [tuple(v) for v in Q + B], [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)])
        if knot: knot_strip(k, 'bronze', q0 + (q1 - q0) * 0.05 + fn * 0.012, q1 - (q1 - q0) * 0.05 + fn * 0.012, fn, rw * 0.8, r=0.03, period=0.55)
    return b0, b1, o


def core(k, spec):
    """หอแปดเหลี่ยม 3 ชั้น (ภาพวาด prop_bld_tower): ค้ำยันหิน + ซี่บรอนซ์ลายถัก + ผนังชนวนเข้มช่องแสงฟ้า + ซุ้มประตูโค้งแหลมเรืองฟ้า
    + เสาคริสตัล 2 มุม + ธง + วงแหวนรูนลอยรอบชั้นบน + ยอดคริสตัล
    งบความสูง: กล้อง 60° → จอ v = 0.5·y + 0.866·z • ยอดคริสตัล ~12 ม. จอ (มือถือหน้าประตูเห็นครบ) • จอคอมหน้าประตูเห็น ~7.4 ม. (ชั้น 1 + ป้าย + ชั้น 2)"""
    import gate3d as GT
    from mathutils import Vector
    W, D = spec['w'], spec['h']; hw = W / 2
    PZ = 0.5; info = {'glows': []}
    # ---- ฐาน 2 ขั้น: แผ่นหินเข้มเต็มฐานชน + แท่นแปดเหลี่ยมหินเทา (บันไดหน้า)
    k.box('stoned', -hw, hw, 0, D, 0, 0.26, bevel=0.03)
    k.box('flag', -hw + 0.05, hw - 0.05, 0.05, D - 0.05, 0.26, 0.275)
    oc = k.prism('stone', 0, 3.6, 5.55, 3.6, 0.26, PZ, top=0.985)
    notch = k.box('dark', -1.25, 1.25, -0.3, 0.75, -0.1, PZ + 0.3); notch.hide_render = True; k.cutters.append(notch); k.cut(oc, notch)
    for i in range(3):
        k.box('stone', -1.25, 1.25, 0.27 + i * 0.16, 0.8, 0, 0.26 + (PZ - 0.26) * (i + 1) / 3 + 0.001, bevel=0.02)
    k.box('bronze', -hw, hw, -0.012, 0.01, 0.17, 0.21)
    # ---- เสาคริสตัล 2 มุมหน้า (บนขั้นล่าง)
    for s in (-1, 1):
        x, y = s * 4.62, 0.82
        k.box('stone', x - 0.48, x + 0.48, y - 0.44, y + 0.44, 0.26, 0.6, bevel=0.03)
        k.box('stone', x - 0.38, x + 0.38, y - 0.34, y + 0.34, 0.6, 2.15, bevel=0.03, taper=(0.82, 0.82))
        k.box('slate', x - 0.2, x + 0.2, y - 0.35, y - 0.3, 0.85, 1.9)
        k.box('rune', x - 0.045, x + 0.045, y - 0.365, y - 0.35, 1.0, 1.75)
        k.box('bronze', x - 0.36, x + 0.36, y - 0.32, y + 0.32, 2.1, 2.24, bevel=0.015)
        k.cyl('bronzed', x, y, 0.22, 2.24, 2.34, 16)
        k.cyl('cyan', x, y, 0.17, 2.34, 3.1, 16)
        for zz in (2.4, 2.72, 3.04): k.torus('bronze', 0.185, 0.035, loc=(x, y, zz), seg=(20, 6))
        for a in range(4):
            an = a * math.pi / 2 + math.pi / 4
            k.box('bronze', x + 0.19 * math.cos(an) - 0.03, x + 0.19 * math.cos(an) + 0.03, y + 0.19 * math.sin(an) - 0.03, y + 0.19 * math.sin(an) + 0.03, 2.34, 3.1)
        k.cyl('bronze', x, y, 0.22, 3.1, 3.32, 16, r2=0.04)
        info['glows'].append(((x, y, 2.72), 0.45, CYAN, 'gem'))
        k.light('POINT', (x, y - 0.45, 2.6), 25, (0.4, 0.85, 1.0), 0.15)
    # ---- ชั้นล่าง: กลองหินเทา (ค้ำยันสั้นหัวบรอนซ์ + ช่องแสงเล็ก) แล้ว "กรวย" ผนังชนวนเข้มสอบขึ้น มีซี่บรอนซ์ลายถักเอียงตามกรวย (ภาพวาด)
    D0 = dict(cx=0.0, cy=4.0, rx=4.25, ry=3.15, z0=PZ, z1=2.45, top=0.95)
    k.prism('stone', **D0)
    k.prism('bronze', 0, D0['cy'], D0['rx'] * 0.95 + 0.05, D0['ry'] * 0.95 + 0.05, 2.38, 2.48)
    lean0 = (1 - D0['top']) * D0['ry'] * 0.92 / (D0['z1'] - D0['z0'])
    for kk in (0, 3, 4, 5, 6, 7):
        buttress(k, D0, kk, 2.25, 0.8, 0.5, 0.72, knot=kk in (4, 7))
    for kk, ss in ((4, (0.32, 0.68)), (6, (0.32, 0.68)), (3, (0.5,)), (7, (0.5,))):
        for s_ in ss:
            c, nrm, tan = k.face_pt(D0['cx'], D0['cy'], D0['rx'], D0['ry'], D0['z0'], D0['z1'], D0['top'], kk, s_, 1.55)
            k.panel('bronzed', c, nrm, tan, 0.34, 1.05, lean0, out=0.015, t=0.04)
            k.panel('cyan', c, nrm, tan, 0.13, 0.85, lean0, out=0.06)
    C1 = dict(cx=0.0, cy=4.05, rx=3.7, ry=2.75, z0=2.45, z1=6.3, top=0.64)
    k.prism('slate', **C1)
    P1 = k.ngon(C1['cx'], C1['cy'], C1['rx'], C1['ry'])
    lean1 = (1 - C1['top']) * C1['ry'] * 0.92 / (C1['z1'] - C1['z0'])
    def f1(kk, s_, z): return k.face_pt(C1['cx'], C1['cy'], C1['rx'], C1['ry'], C1['z0'], C1['z1'], C1['top'], kk, s_, z)
    for kk in (0, 3, 4, 5, 6, 7):   # ซี่บรอนซ์เอียงตามมุมกรวย + ลายถัก
        vx, vy = P1[kk]; a = math.atan2(vy - C1['cy'], vx - C1['cx']); o = Vector((math.cos(a), math.sin(a), 0))
        b0 = Vector((vx, vy, C1['z0'] + 0.05)); b1 = Vector((C1['cx'] + (vx - C1['cx']) * C1['top'], C1['cy'] + (vy - C1['cy']) * C1['top'], C1['z1'] - 0.05))
        k.beam('bronzed', tuple(b0 + o * 0.1), tuple(b1 + o * 0.1), 0.42, 0.2)
        if kk in (3, 4, 6, 7, 0):
            d_ = (b1 - b0).normalized(); fn = o - d_ * o.dot(d_); fn.normalize()
            knot_strip(k, 'bronze', b0 + o * 0.2 + d_ * 0.25, b1 + o * 0.2 - d_ * 0.25, fn, 0.3, r=0.028, period=0.55)
    for kk, ss in ((4, (0.5,)), (6, (0.5,)), (3, (0.5,)), (7, (0.5,))):   # ช่องแสงรูนสูงบนกรวย
        for s_ in ss:
            c, nrm, tan = f1(kk, s_, 4.25)
            k.panel('bronzed', c, nrm, tan, 0.44, 2.3, lean1, out=0.015, t=0.04)
            k.panel('slate', c, nrm, tan, 0.32, 2.15, lean1, out=0.05)
            k.panel('cyan', c, nrm, tan, 0.16, 1.9, lean1, out=0.065)
            if kk in (4, 6): info['glows'].append((tuple(c + nrm * 0.07), 0.4, CYAN, 'lamp'))
    # ---- ซุ้มประตูยื่น (หน้า) + ประตูโค้งแหลมเรืองฟ้า + ป้าย
    PY0, PY1, PX = 0.62, 1.75, 1.9
    portal = k.box('stone', -PX, PX, PY0, PY1, PZ, PZ + 3.75, bevel=0.035)
    k.poly('stone', [(-PX - 0.05, PY0, PZ + 3.75), (PX + 0.05, PY0, PZ + 3.75), (0, PY0, PZ + 4.75)][::-1], depth=PY1 - PY0)
    k.poly('slate', [(-PX + 0.35, PY0 - 0.02, PZ + 3.9), (PX - 0.35, PY0 - 0.02, PZ + 3.9), (0, PY0 - 0.02, PZ + 4.55)][::-1], depth=0.03)
    for s in (-1, 1):   # ไม้ปั้นลมบรอนซ์ + เสาซุ้มลายถัก
        k.beam('bronze', (s * (PX + 0.14), PY0 - 0.07, PZ + 3.66), (0, PY0 - 0.07, PZ + 4.86), 0.2, 0.16)
        k.beam('bronzed', (s * PX, PY0 - 0.06, PZ + 0.02), (s * PX, PY0 - 0.06, PZ + 3.7), 0.4, 0.14)
        knot_strip(k, 'bronze', (s * PX, PY0 - 0.13, PZ + 0.4), (s * PX, PY0 - 0.13, PZ + 3.45), (0, -1, 0), 0.3, r=0.03, period=0.5)
    k.box('bronze', -PX - 0.05, PX + 0.05, PY0 - 0.09, PY0 + 0.02, PZ + 3.62, PZ + 3.76)
    k.box('rune', -0.06, 0.06, PY0 - 0.06, PY0 - 0.04, PZ + 4.0, PZ + 4.45)
    k.sphere('crystal', 0, PY0 - 0.1, PZ + 4.22, 0.13, sz=1.6, seg=(6, 4))
    dprof = k.pointed(-0.85, 0.85, PZ + 1.55, 0.78)
    k.cut(portal, k.prof_cutter(dprof, PZ - 0.05, PY0 - 0.3, PY0 + 0.55))
    k.box('cyan', -0.88, 0.88, PY0 + 0.5, PY0 + 0.55, PZ, PZ + 3.0)
    k.box('bronze', -0.045, 0.045, PY0 + 0.3, PY0 + 0.5, PZ, PZ + 2.75)
    for s in (-1, 1):
        k.box('slate', s * 0.85 - 0.02, s * 0.85 + 0.02, PY0, PY0 + 0.5, PZ, PZ + 1.55)
    k.prof_trim('bronze', k.pointed(-0.94, 0.94, PZ + 1.55, 0.78), PY0 - 0.04, 0.08, z0=PZ)
    k.prof_trim('stone', k.pointed(-1.18, 1.18, PZ + 1.55, 0.78), PY0 - 0.06, 0.12, z0=PZ)
    info['glows'].append(((0, PY0, PZ + 1.5), 1.3, CYAN, 'door'))
    k.light('POINT', (0, PY0 + 0.2, PZ + 1.1), 90, (0.45, 0.85, 1.0), 0.4)
    pw, pz0, pz1 = 3.5, PZ + 3.02, PZ + 3.55
    plaque(k, 0, PY0 - 0.16, pz0, pz1, pw, knob='crystal')
    info['label'] = ((0, PY0 - 0.17, (pz0 + pz1) / 2), pw - 0.3)
    for s in (-1, 1):
        info['glows'].append((lantern(k, s * (PX + 0.34), PY0 + 0.3, PZ + 2.05), 0.35, CYAN, 'lamp'))
    # ชายคากรวย (วงหินเทา + บรอนซ์)
    r1x, r1y = C1['rx'] * C1['top'], C1['ry'] * C1['top']
    k.prism('stone', 0, C1['cy'], r1x + 0.3, r1y + 0.3, 6.25, 6.6)
    k.prism('bronze', 0, C1['cy'], r1x + 0.33, r1y + 0.33, 6.18, 6.26)
    # ---- ชั้นที่ 2 (ผนังชนวน + เสาหินมุม + ธงหน้า/ข้าง)
    C2 = dict(cx=0.0, cy=4.15, rx=2.3, ry=1.82, z0=6.6, z1=8.6, top=0.92)
    k.prism('slate', **C2)
    P2 = k.ngon(C2['cx'], C2['cy'], C2['rx'], C2['ry'])
    lean2 = (1 - C2['top']) * C2['ry'] * 0.92 / (C2['z1'] - C2['z0'])
    for kk in (0, 3, 4, 5, 6, 7):
        vx, vy = P2[kk]; a = math.atan2(vy - C2['cy'], vx - C2['cx']); o = Vector((math.cos(a), math.sin(a), 0))
        b0 = Vector((vx, vy, C2['z0'])); b1 = Vector((C2['cx'] + (vx - C2['cx']) * C2['top'], C2['cy'] + (vy - C2['cy']) * C2['top'], C2['z1']))
        k.beam('stone', tuple(b0 + o * 0.08), tuple(b1 + o * 0.08), 0.42, 0.34)
        k.beam('bronzed', tuple(b0 + o * 0.27 + Vector((0, 0, 0.3))), tuple(b1 + o * 0.27 - Vector((0, 0, 0.3))), 0.18, 0.06)
    for zz in (6.95, 8.25):
        f = 1 + (C2['top'] - 1) * (zz - C2['z0']) / (C2['z1'] - C2['z0'])
        k.prism('bronze', C2['cx'], C2['cy'], C2['rx'] * f + 0.06, C2['ry'] * f + 0.06, zz, zz + 0.1)
    def f2(kk, s_, z): return k.face_pt(C2['cx'], C2['cy'], C2['rx'], C2['ry'], C2['z0'], C2['z1'], C2['top'], kk, s_, z)
    for kk in (4, 6, 3, 7):
        c, nrm, tan = f2(kk, 0.5, 7.6)
        k.panel('bronzed', c, nrm, tan, 0.4, 1.05, lean2, out=0.015, t=0.04)
        k.panel('cyan', c, nrm, tan, 0.16, 0.85, lean2, out=0.06)
    c, nrm, tan = f2(5, 0.5, 8.1)
    k.box('bronze', -0.15, 0.15, c.y - 0.12, c.y + 0.02, 8.15, 8.45)
    banner(k, 0, c.y - 0.1, 8.12, 0.8, 1.15)
    for s, kk in ((-1, 3), (1, 7)):   # ธงข้างบนคันบรอนซ์ยื่น
        c, nrm, tan = f2(kk, 0.5, 8.1)
        tip = c + nrm * 1.1
        k.beam('bronze', tuple(c), tuple(tip), 0.08)
        k.sphere('bronze', tip.x, tip.y, tip.z, 0.09)
        banner(k, tip.x - nrm.x * 0.4, tip.y - 0.05, 8.05, 0.6, 1.3)
    r2x, r2y = C2['rx'] * C2['top'], C2['ry'] * C2['top']
    k.prism('stone', 0, C2['cy'], r2x + 0.2, r2y + 0.2, 8.55, 8.8)
    k.prism('bronze', 0, C2['cy'], r2x + 0.23, r2y + 0.23, 8.49, 8.56)
    # ---- ชั้นที่ 3 + วงแหวนรูนลอย + ยอดคริสตัล
    CY = 4.35
    C3 = dict(cx=0.0, cy=CY, rx=1.4, ry=1.18, z0=8.8, z1=9.75, top=0.92)
    k.prism('stone', **C3)
    for kk in (3, 4, 5, 6, 7, 0):
        c, nrm, tan = k.face_pt(C3['cx'], C3['cy'], C3['rx'], C3['ry'], C3['z0'], C3['z1'], C3['top'], kk, 0.5, 9.27)
        k.panel('slate', c, nrm, tan, 0.5, 0.8, 0.07, out=0.02)
        k.panel('cyan', c, nrm, tan, 0.14, 0.62, 0.07, out=0.04)
    k.prism('stone', 0, CY, 1.55, 1.32, 9.75, 9.95)
    k.prism('bronze', 0, CY, 1.58, 1.35, 9.7, 9.76)
    k.prism('stone', 0, CY, 0.58, 0.52, 9.95, 10.85, top=0.6)
    c, nrm, tan = k.face_pt(0, CY, 0.58, 0.52, 9.95, 10.85, 0.6, 5, 0.5, 10.4)
    k.panel('rune', c, nrm, tan, 0.09, 0.8, 0.12, out=0.01)
    G = GT.Geo(); rnd = random.Random(707)
    GT.shard(G, 'cry', 'C', (0, CY, 10.75), (0, 0, 1), 1.1, 0.33, rnd)
    for (mat, tag), (Vv, Ff) in G.b.items(): k.mesh('crystal', Vv, Ff)
    info['glows'].append(((0, CY, 11.3), 0.55, '160,240,255', 'gem'))
    RR, RZ0, RZ1 = 2.3, 9.05, 9.95
    band(k, 'ringb', 0, CY, RR - 0.3, RR, RZ0 + 0.12, RZ1 - 0.12, 72)
    band(k, 'stone', 0, CY, RR - 0.34, RR + 0.08, RZ0, RZ0 + 0.14, 72)
    band(k, 'stone', 0, CY, RR - 0.34, RR + 0.08, RZ1 - 0.14, RZ1, 72)
    ring_runes(k, 0, CY, RR, (RZ0 + RZ1) / 2, 200, 340, 0.6, 8)
    for a in range(4):   # แขนบรอนซ์: ค้ำวงแหวนจากชายคาชั้น 2 + โค้งขึ้นจับยอด (กรงแบบภาพวาด)
        an = a * math.pi / 2 + math.pi / 4; c_, s_ = math.cos(an), math.sin(an)
        k.curve('bronze', [[(1.85 * c_, CY + 1.5 * s_, 8.8, 0.1), (RR * c_, CY + RR * s_, RZ0, 0.09)]])
        k.curve('bronze', [[(RR * c_, CY + RR * s_, RZ1, 0.085), (RR * 0.9 * c_, CY + RR * 0.9 * s_, 10.5, 0.075), (0.72 * c_, CY + 0.72 * s_, 11.1, 0.06), (0.34 * c_, CY + 0.34 * s_, 10.95, 0.05)]])
        k.sphere('bronze', RR * c_, CY + RR * s_, (RZ0 + RZ1) / 2, 0.14)
    info['glows'].append(((0, CY - RR, (RZ0 + RZ1) / 2), 1.1, CYAN, 'core'))
    k.light('POINT', (0, CY - RR - 0.3, (RZ0 + RZ1) / 2), 60, (0.4, 0.85, 1.0), 0.3)
    return info


# ---------------------------------------------------------------- ร้านค้า
# แท่นหิน (ฐานชน + ซุ้มน้ำลอด + บันได) อยู่ตรงตามแกนแมพ • ตัวร้านปั้นในพิกัดท้องถิ่นแล้ว "หมุน 30° บนแท่น" ให้หน้าร้านหันเข้าลานกลางเมือง
#   (ร้านฝั่งตะวันตกหันตะวันออกเฉียงใต้ • ฝั่งตะวันออกหันตะวันตกเฉียงใต้) → เห็นหน้าร้าน + ผนังข้างอีกด้านแบบภาพวาด 3/4 แต่ขอบฐานยังตรงฐานชน
#   พิกัดท้องถิ่นตัวร้าน: หน้าร้าน y = 0 (หันลบ y) ลึกเข้าไป +y • x ∈ [−w/2, w/2] • ผนังข้างที่เห็น = x = vs·w/2 (vs = −s)
#   ป้ายชื่อ = ป้ายแขวนหันกล้องตรง ๆ (ตัวหนังสือจากเกมไม่เอียง) ห้อยจากแขนบรอนซ์ที่เสามุมหน้าของร้าน
YAW = math.radians(30)


def shop(k, spec):
    kind = spec['kind']; W, D = spec['w'], spec['h']
    canals = spec['canals']; cmid = sum((a + b) / 2 for a, b in canals) / len(canals) if canals else -1
    side = -1 if cmid < 0 else 1                 # ฝั่งคลอง (−1 = ครึ่งตะวันตกของร้าน)
    info = {'glows': []}
    {'supply': shop_supply, 'armory': shop_armory, 'plating': shop_plating, 'forge': shop_forge}[kind](k, info, W, D, canals, side)
    return info


class Body:
    """ตัวร้านหมุนบนแท่น: s = +1 ร้านฝั่งตะวันตก (หมุนทวนเข็ม หน้าหันตะวันออกเฉียงใต้) / −1 ฝั่งตะวันออก"""
    def __init__(self, k, info, s, w, d, PZ):
        self.k, self.info, self.s, self.w, self.d, self.PZ = k, info, s, w, d, PZ
        self.vs = -s; self.phi = s * YAW
        self.px = s * 0.25 * d; self.py = 0.27 + w * math.sin(YAW) / 2
        self.i0 = k.frame(); self.g0 = len(info['glows'])

    def W(self, lx, ly, z=0.0):
        """จุดท้องถิ่น → พิกัดฐาน (ก่อน/หลังหมุนก็ใช้ได้ — คำนวณตรง)"""
        c, sn = math.cos(self.phi), math.sin(self.phi)
        return (self.px + lx * c - ly * sn, self.py + lx * sn + ly * c, z)

    def done(self):
        T = self.k.place(self.i0, self.px, self.py, self.phi)
        g = self.info['glows']
        for i in range(self.g0, len(g)): g[i] = (T(g[i][0]), *g[i][1:])
        return T


def hanging_sign(k, info, cx, y, z, w, h=0.52, post=None):
    """ป้ายแขวนหันกล้อง (แผ่นป้ายเข้มขอบบรอนซ์ + โซ่ + แขนบรอนซ์จากเสามุม) — เกมเขียนชื่อทับ (ตัวหนังสือไม่เอียง)"""
    plaque(k, cx, y, z - h, z, w)
    info['label'] = ((cx, y - 0.01, z - h / 2), w - 0.22)
    if post is not None:   # post = (x, y, z) จุดยึดบนเสามุม
        px_, py_, pz_ = post
        zb = z + 0.3; far = cx + math.copysign(w / 2 + 0.18, cx - px_)
        k.beam('bronze', (px_, py_, zb), (far, y + 0.05, zb), 0.08, 0.08)
        k.curve('bronze', [[(px_, py_, zb - 0.5, 0.04), (px_ + (far - px_) * 0.12, (py_ + y) / 2 + 0.02, zb - 0.12, 0.035), (px_ + (far - px_) * 0.32, y + 0.05, zb - 0.02, 0.03)]])
        k.sphere('bronze', far, y + 0.05, zb, 0.075)
        for f in (-0.38, 0.38):
            xx = cx + f * w
            k.beam('iron', (xx, y + 0.05, z - 0.02), (xx, y + 0.05, zb), 0.025)


def roof_plates(k, rx, EZ, RZ, ys, cyan_ys=(), plates=()):
    """แผ่นเหล็กคาด/แผ่นสี่เหลี่ยม/เส้นรูนบนหลังคาจั่ว (สันตามแกน y ท้องถิ่น ชายคาที่ |x| = rx สูง EZ สัน RZ)"""
    def on(sg, f): return sg * (rx - (rx - 0.12) * f), EZ + (RZ - EZ) * f + 0.03
    for yy in ys:
        for sg in (-1, 1):
            xa, za = on(sg, 0.02); xb, zb = on(sg, 0.97)
            k.beam('iron', (xa, yy, za), (xb, yy, zb), 0.2, 0.05)
    for sg, yy, f0, f1 in plates:
        xa, za = on(sg, f0); xb, zb = on(sg, f1)
        k.beam('iron', (xa, yy, za), (xb, yy, zb), 0.42, 0.04)
    for sg, yy, f0, f1 in cyan_ys:
        xa, za = on(sg, f0); xb, zb = on(sg, f1)
        k.beam('rune', (xa, yy, za + 0.01), (xb, yy, zb + 0.01), 0.07, 0.04, bevel=0)


def deck(k, x0, x1, y0, y1, z):
    """ทางเดินไม้ (พื้นไม้ + คานขอบ)"""
    k.box('floor', x0, x1, y0, y1, z, z + 0.06)
    k.box('beam', x0, x1, y0 - 0.02, y0 + 0.08, z - 0.05, z + 0.08)


def shop_supply(k, info, W, D, canals, side):
    """SUPPLY (ภาพ prop_bld_shop): หลังคาโค้งแผ่นโลหะคาดบรอนซ์ + เหรียญรูนมีเขา + กันสาดผ้าฟ้าลายฟันปลาเหนือระเบียงไม้ + ถังโลหะช่องแสงฟ้า"""
    PZ = 0.45; s = -side; vs = side
    w, d = 5.0, 3.6
    B = Body(k, info, s, w, d, PZ)
    dx = s * 0.95; dw = 1.25                  # ประตูบนหน้าร้าน (ฝั่งไกลคลอง)
    dwx, dwy, _ = B.W(dx, -1.0)
    podium(k, W, D, PZ, (dwx, 1.2), canals, 3, step_mat='floor')
    deck(k, *sorted((s * 0.05, s * 3.92)), 0.62, 3.4, PZ)   # ลานไม้หน้าร้านฝั่งประตู (เติมสามเหลี่ยมหน้าหน้าร้านเอียง)
    # ---- ตัวร้าน (ท้องถิ่น)
    B.i0 = k.frame(); B.g0 = len(info['glows'])
    hw = w / 2; EZ = 3.05
    k.box('stoned', -hw - 0.05, hw + 0.05, -0.05, d + 0.05, PZ, PZ + 0.42, bevel=0.03)
    wl = k.box('wall', -hw + 0.05, hw - 0.05, 0.05, d - 0.05, PZ, EZ)
    for x in (-hw, hw):
        for y in (0.05, d - 0.05): post(k, x, y, PZ, EZ, 0.32, glow=(y < 1))
    post(k, -s * 0.1, 0.0, PZ, EZ, 0.24)
    k.box('beam', -hw - 0.12, hw + 0.12, -0.08, 0.16, EZ - 0.22, EZ, bevel=0.02)
    k.box('beam', vs * hw - 0.12, vs * hw + 0.12, 0.0, d, EZ - 0.22, EZ, bevel=0.02)
    for xa, sg in ((-hw, 1), (hw, -1)):
        k.beam('beam', (xa + sg * 0.16, -0.04, EZ - 0.25), (xa + sg * 0.85, -0.04, EZ - 0.95), 0.13, 0.1)
    doorway(k, wl, dx, dw, 0.05, PZ, 1.72, arch=False)
    k.light('POINT', (dx, -0.2, PZ + 1.2), 55, (1.0, 0.72, 0.4), 0.3)
    info['glows'].append(((dx, 0.0, PZ + 1.0), 0.95, WARM, 'warm'))
    wx0, wx1 = sorted((-s * 0.55, -s * 1.95)); wz0, wz1 = PZ + 0.9, PZ + 2.0          # หน้าต่างข้าวหลามตัด (หน้าร้าน)
    k.cut(wl, k.arch_cutter(wx0, wx1, wz0, wz1, -0.3, 0.35, 0.001))
    k.box('warm', wx0, wx1, 0.28, 0.32, wz0, wz1)
    lattice(k, wx0, wx1, wz0, wz1, 0.06)
    k.box('beam', wx0 - 0.14, wx1 + 0.14, -0.12, 0.1, wz0 - 0.12, wz0, bevel=0.015)
    k.box('beam', wx0 - 0.14, wx1 + 0.14, -0.08, 0.1, wz1, wz1 + 0.1, bevel=0.015)
    info['glows'].append((((wx0 + wx1) / 2, 0.0, (wz0 + wz1) / 2), 0.9, WARM, 'warm'))
    # ผนังข้างที่เห็น: หน้าต่างโค้งไฟอุ่น 2 บาน (แกน y ผนัง x = vs·hw)
    for yc in (1.0, 2.55):
        c = k.arch_cutter(yc - 0.4, yc + 0.4, PZ + 1.0, PZ + 1.7, vs * hw - 0.35, vs * hw + 0.35, 0.4, axis='x')
        k.cut(wl, c)
        k.box('warm', vs * hw - vs * 0.3 - 0.02, vs * hw - vs * 0.3 + 0.02, yc - 0.4, yc + 0.4, PZ + 1.0, PZ + 2.15)
        k.curve('beam', [[(vs * (hw + 0.04), yc - 0.4 + 0.8 * i / 12, PZ + 1.7 + 0.4 * math.sin(math.pi * i / 12), 0.06) for i in range(13)]], res=1)
        k.box('beam', vs * hw - 0.12, vs * hw + 0.12, yc - 0.5, yc + 0.5, PZ + 0.88, PZ + 1.0, bevel=0.015)
        for t in (-0.2, 0.2): k.box('bronze', vs * (hw + 0.02) - 0.02, vs * (hw + 0.02) + 0.02, yc + t - 0.02, yc + t + 0.02, PZ + 1.0, PZ + 2.0)
        info['glows'].append(((vs * hw, yc, PZ + 1.45), 0.6, WARM, 'warm'))
    # หลังคาโค้งแผ่นโลหะ + ซี่บรอนซ์
    RISE = 1.45; vy0, vy1 = -0.45, d + 0.3
    _, prof = k.vault('roof_supply', -hw - 0.35, hw + 0.35, vy0, vy1, EZ - 0.05, RISE, 0.16)
    for y in (vy0 + 0.1, 0.9, 2.1, 3.3):
        k.curve('bronze', [[(x * 1.012, y, EZ - 0.05 + (z - EZ + 0.05) * 1.03 + 0.03, 0.07) for x, z in prof[::2]]], res=2)
    k.curve('bronzed', [[(x, vy0 - 0.02, z, 0.09) for x, z in prof]], res=2)
    gp = [(x * 0.93, EZ + (z - EZ) * 0.95) for x, z in prof]
    k.poly('wall', [(x, 0.0, z) for x, z in gp][::-1], depth=0.2)
    k.box('beam', -0.09, 0.09, -0.08, 0.0, EZ, EZ + RISE * 0.9)
    disc(k, 'warm', vs * 1.1, -0.02, EZ + 0.6, 0.42, 0.04)   # หน้าต่างกลมไฟอุ่น
    for t_ in range(4): k.beam('beam', (vs * 1.1, -0.04, EZ + 0.6), (vs * 1.1 + 0.42 * math.cos(t_ * math.pi / 2), -0.04, EZ + 0.6 + 0.42 * math.sin(t_ * math.pi / 2)), 0.05, 0.03)
    k.torus('bronze', 0.42, 0.05, loc=(vs * 1.1, -0.03, EZ + 0.6), rot=_rx90(), seg=(28, 6))
    k.box('warm', vs * 1.1 - 0.3, vs * 1.1 + 0.3, 0.03, 0.05, EZ + 0.35, EZ + 0.85)
    mz = EZ + RISE + 0.45                     # เหรียญรูนเขาจันทร์เสี้ยวบนยอดหน้าจั่วโค้ง
    k.beam('bronzed', (0, 0.2, EZ + RISE - 0.1), (0, -0.55, mz), 0.2)
    rune_disc(k, 0, -0.62, mz, 0.95)
    info['glows'].append(((0, -0.68, mz), 1.0, CYAN, 'gem'))
    k.cyl('iron', -vs * 1.4, 2.6, 0.14, EZ + 0.9, EZ + 2.2, 12)   # ปล่องท่อบนหลังคา
    k.cyl('iron', -vs * 1.4, 2.6, 0.24, EZ + 2.2, EZ + 2.35, 12, r2=0.08)
    for zz in (EZ + 1.3, EZ + 1.9): k.torus('bronze', 0.15, 0.03, loc=(-vs * 1.4, 2.6, zz), seg=(16, 5))
    # กันสาดผ้าฟ้าลายฟันปลา + ระเบียงไม้หน้าประตู
    ax0, ax1 = sorted((s * 0.05, s * 2.55)); zt, zb, yb = EZ - 0.12, 2.5, -1.05
    deck(k, ax0, ax1, yb - 0.05, 0.05, PZ + 0.06)
    for x in (ax0 + 0.12, ax1 - 0.12):
        post(k, x, yb + 0.05, PZ, zb + 0.05, 0.2)
        k.beam('beam', (x, yb + 0.05, zb - 0.42), (x, -0.08, zb + 0.06), 0.11, 0.09)
    k.poly('cloth_b', [(ax0 - 0.05, -0.12, zt), (ax1 + 0.05, -0.12, zt), (ax1 + 0.05, yb, zb), (ax0 - 0.05, yb, zb)], depth=0.0)
    k.beam('bronze', (ax0 - 0.08, yb, zb), (ax1 + 0.08, yb, zb), 0.07)
    n = 7
    for i in range(n):
        xa = ax0 + (ax1 - ax0) * i / n; xb = ax0 + (ax1 - ax0) * (i + 1) / n
        k.poly('cloth_c' if i % 2 else 'cloth_b', [(xa, yb - 0.01, zb), (xb, yb - 0.01, zb), (xb, yb - 0.01, zb - 0.2), ((xa + xb) / 2, yb - 0.01, zb - 0.34), (xa, yb - 0.01, zb - 0.2)][::-1], depth=0.01)
    f = 0.5; y_ = -0.12 + (yb + 0.12) * f; z_ = zt + (zb - zt) * f + 0.03
    zz_ = [(ax0 + 0.15 + (ax1 - ax0 - 0.3) * i / 12, y_ + (0.18 if i % 2 else 0.0), z_ + (0.11 if i % 2 else 0.0)) for i in range(13)]
    k.curve('cloth_c', [[(*zz_[i], 0.035), (*zz_[i + 1], 0.035)] for i in range(len(zz_) - 1)], res=1)
    for x in (ax0 + 0.12, ax1 - 0.12):
        info['glows'].append((lantern(k, x, yb + 0.02, 1.8), 0.32, CYAN, 'lamp'))
    tx = s * 2.0                              # แผงขายใต้กันสาด: ขวดยา + ตะกร้าแอปเปิล
    k.box('beaml', tx - 0.4, tx + 0.4, -0.75, -0.3, PZ + 0.62, PZ + 0.7, bevel=0.012)
    for xx in (tx - 0.34, tx + 0.34):
        for yy in (-0.7, -0.35): k.box('beam', xx - 0.03, xx + 0.03, yy - 0.03, yy + 0.03, PZ, PZ + 0.62)
    for i, mat in enumerate(('red', 'blue', 'red', 'green_l', 'blue')):
        x = tx - 0.3 + i * 0.15
        k.cyl(mat, x, -0.62, 0.048, PZ + 0.7, PZ + 0.82, 12); k.cyl('glass', x, -0.62, 0.018, PZ + 0.82, PZ + 0.88, 8); k.cyl('cream', x, -0.62, 0.02, PZ + 0.88, PZ + 0.91, 8)
    k.cyl('beaml', tx, -0.42, 0.15, PZ + 0.7, PZ + 0.84, 14, r2=0.19)
    for i in range(6): k.sphere('apple', tx + 0.08 * math.cos(i * 1.05), -0.42 + 0.08 * math.sin(i * 1.05), PZ + 0.88, 0.055)
    # ถังโลหะช่องแสงฟ้าชิดผนังข้าง + ท่อ
    tx, ty, tr = vs * (hw + 0.6), 2.2, 0.58
    k.cyl('stone', tx, ty, tr + 0.08, PZ, PZ + 0.3, 28)
    k.cyl('steel', tx, ty, tr, PZ + 0.3, 3.55, 32)
    for zz in (1.05, 2.25, 3.4): k.torus('bronze', tr + 0.02, 0.05, loc=(tx, ty, zz), seg=(40, 6))
    for a in (-150, -120, -90):
        an = math.radians(a if vs < 0 else -180 - a); c = (tx + (tr + 0.01) * math.cos(an), ty + (tr + 0.01) * math.sin(an))
        k.beam('cyan', (c[0], c[1], 1.3), (c[0], c[1], 2.05), 0.09, 0.03, bevel=0)
        k.beam('cyan', (c[0], c[1], 2.5), (c[0], c[1], 3.2), 0.09, 0.03, bevel=0)
    info['glows'].append(((tx, ty - tr, 2.2), 0.55, CYAN, 'gem'))
    k.sphere('steel', tx, ty, 3.55, tr, sz=0.45)
    k.torus('bronze', tr * 0.55, 0.05, loc=(tx, ty, 3.78), seg=(24, 6))
    k.cyl('ironl', tx, ty, 0.12, 3.7, 4.55, 12)
    k.cyl('iron', tx, ty, 0.2, 4.55, 4.75, 12, r2=0.06)
    k.curve('copper', [[(tx - vs * 0.5, ty - 0.2, 2.9, 0.07), (tx - vs * 0.62, ty - 0.2, 2.9, 0.07), (vs * hw, ty - 0.2, 2.9, 0.07)]])
    k.curve('copper', [[(tx, ty - tr, 1.6, 0.06), (tx, ty - tr - 0.3, 1.3, 0.06), (tx, ty - tr - 0.3, PZ, 0.06)]])
    k.curve('copper', [[(tx - vs * 0.3, ty + 0.5, 3.3, 0.06), (vs * hw, ty + 0.9, 3.3, 0.06)]])
    T = B.done()
    # ---- ป้ายแขวน + ของหน้าร้าน (พิกัดฐาน)
    fc = B.W(vs * hw, 0.0)                    # เสามุมหน้า
    hanging_sign(k, info, fc[0] + vs * 1.15, 0.22, 3.05, 2.05, post=(fc[0], fc[1], 3.0))
    bx = vs * 3.45
    barrel(k, bx, 0.75, PZ, 0.27, 0.66); barrel(k, bx - vs * 0.6, 0.55, PZ, 0.24, 0.6, lid='beaml')
    crate(k, vs * 1.75, 0.55, PZ, 0.55); crate(k, vs * 1.75, 0.55, PZ + 0.5, 0.42, mat='beam')
    sack(k, vs * 2.35, 0.45, PZ, 0.22); sack(k, vs * 2.8, 1.25, PZ, 0.2)
    cx_ = s * 0.35
    k.cyl('iron', cx_, 0.45, 0.26, PZ, PZ + 0.32, 20, r2=0.3)
    k.torus('iron', 0.3, 0.04, loc=(cx_, 0.45, PZ + 0.32), seg=(24, 6))
    import gate3d as GT
    G_ = GT.Geo(); rnd = random.Random(11)
    for i in range(5):
        a = i * 1.3
        GT.shard(G_, 'c', 'C', (cx_ + 0.12 * math.cos(a), 0.45 + 0.1 * math.sin(a), PZ + 0.26), (0.4 * math.cos(a), 0.3 * math.sin(a), 1), 0.32 + 0.1 * (i % 2), 0.06, rnd)
    for (mat, tag), (Vv, Ff) in G_.b.items(): k.mesh('crystal', Vv, Ff)
    info['glows'].append(((cx_, 0.45, PZ + 0.45), 0.4, CYAN, 'gem'))
    barrel(k, s * 3.5, 0.6, PZ, 0.25, 0.6)
    crate(k, s * 3.45, 1.35, PZ, 0.5)


def front_wall(k, mat, x0, x1, y, y1, z0, z1, posts, plate=True, base=True, glow=False):
    """ผนังไม้แผ่นตั้ง + ฐานหิน + เสาไม้ (ตำแหน่ง posts) + คานบน — คืนผนัง (ตัดช่องประตู/หน้าต่างได้)"""
    wl = k.box(mat, x0, x1, y, y1, z0, z1)
    if base: k.box('stoned', x0 - 0.04, x1 + 0.04, y - 0.06, y1 + 0.04, z0, z0 + 0.42, bevel=0.025)
    for x in posts: post(k, x, y - 0.02, z0, z1, 0.3, glow=glow)
    if plate: k.box('beam', x0 - 0.12, x1 + 0.12, y - 0.12, y + 0.12, z1 - 0.2, z1 + 0.02, bevel=0.02)
    return wl


def doorway(k, wl, cx, w, y, z0, h, glow='warm', arch=True, interior=True):
    """ช่องประตูเปิด (ไฟอุ่นข้างใน + เงาชั้นของในร้าน) + กรอบไม้หนา"""
    prof = k.pointed(cx - w / 2, cx + w / 2, z0 + h, 0.62) if arch else [(cx - w / 2, z0 + h), (cx + w / 2, z0 + h)]
    k.cut(wl, k.prof_cutter(prof, z0 - 0.05, y - 0.3, y + 0.5))
    top = max(z for _, z in prof)
    k.box(glow, cx - w / 2, cx + w / 2, y + 0.42, y + 0.46, z0, top + 0.05)
    if interior:   # ชั้นวางของในร้าน (เงาตัดกับไฟ) + โหลยาสี
        for zz in (z0 + 0.7, z0 + 1.25):
            k.box('beam', cx - w / 2, cx + w / 2, y + 0.3, y + 0.42, zz, zz + 0.05)
            for i in range(4):
                xx = cx - w / 2 + 0.2 + i * (w - 0.4) / 3
                k.cyl(('red', 'blue', 'green_l', 'bronze')[(i + int(zz * 10)) % 4], xx, y + 0.36, 0.05, zz + 0.05, zz + 0.2, 10)
    k.prof_trim('beam', prof, y - 0.06, 0.09, z0=z0)
    k.box('floor', cx - w / 2, cx + w / 2, y - 0.1, y + 0.42, z0, z0 + 0.03)
    return top


def dragon_head(k, base, d, s=1.0):
    """หัวมังกรไม้แกะสลัก (ปลายไม้ปั้นลมไขว้): คอ + หัว + จมูกงุ้ม + ขากรรไกร + ตาเรืองฟ้า + หงอนบรอนซ์ • d = ทิศหัว (x, z)"""
    from mathutils import Vector
    b = Vector(base); dd = Vector((d[0], 0, d[1])).normalized(); up = Vector((-dd.z, 0, dd.x)) if dd.x >= 0 else Vector((dd.z, 0, -dd.x))
    nk = b + dd * 0.35 * s
    k.beam('beam', tuple(b), tuple(nk), 0.24 * s, 0.26 * s)
    hd = nk + dd * 0.38 * s + up * 0.08 * s
    k.beam('beam', tuple(nk), tuple(hd), 0.24 * s, 0.32 * s)
    sn = hd + dd * 0.27 * s - up * 0.13 * s
    k.beam('beam', tuple(hd - dd * 0.05 * s), tuple(sn), 0.17 * s, 0.17 * s)
    k.beam('beam', tuple(nk + dd * 0.15 * s - up * 0.15 * s), tuple(hd + dd * 0.14 * s - up * 0.28 * s), 0.13 * s, 0.08 * s)
    e = hd - dd * 0.06 * s + up * 0.06 * s
    for side_ in (-1, 1): k.sphere('rune', e.x, b.y + side_ * 0.125 * s, e.z, 0.045 * s)
    k.curve('bronze', [[(nk.x - dd.x * 0.05 * s + up.x * 0.15 * s, b.y, nk.z + up.z * 0.15 * s, 0.05 * s),
                        (hd.x - dd.x * 0.25 * s + up.x * 0.32 * s, b.y, hd.z - dd.z * 0.25 * s + up.z * 0.32 * s, 0.035 * s),
                        (hd.x - dd.x * 0.55 * s + up.x * 0.42 * s, b.y, hd.z - dd.z * 0.55 * s + up.z * 0.42 * s, 0.012 * s)]])


def shop_armory(k, info, W, D, canals, side):
    """ARMORY (ภาพ prop_bld_house): บ้านยาวนอร์สจั่วชัน ไม้ปั้นลมไขว้หัวมังกร หน้าต่างวงล้อรูน มุขจั่วเล็กหน้าประตู
    ระเบียงข้างหลังคาเพิง + ราว + หน้าต่างโค้งไฟอุ่น + กันสาดฟ้า • ผนังโล่ หุ่นเกราะ ชั้นหอก/ดาบ"""
    from mathutils import Vector
    PZ = 0.45; s = -side; vs = side
    w, d = 4.4, 3.6
    B = Body(k, info, s, w, d, PZ); B.py = 1.5
    dwx, dwy, _ = B.W(0.0, -0.85)
    podium(k, W, D, PZ, (dwx, 1.25), canals, 3)
    deck(k, *sorted((s * 0.05, s * 3.92)), 0.62, 3.4, PZ)
    B.i0 = k.frame(); B.g0 = len(info['glows'])
    hw = w / 2; EZ, RZ = 2.85, 5.25
    k.box('stoned', -hw - 0.05, hw + 0.05, -0.05, d + 0.05, PZ, PZ + 0.42, bevel=0.03)
    wl = k.box('wall', -hw + 0.05, hw - 0.05, 0.05, d - 0.05, PZ, EZ)
    for x in (-hw, hw):
        for y in (0.05, d - 0.05): post(k, x, y, PZ, EZ, 0.34, glow=True)
    k.box('beam', -hw - 0.12, hw + 0.12, -0.08, 0.16, EZ - 0.22, EZ, bevel=0.02)
    k.box('beam', vs * hw - 0.12, vs * hw + 0.12, 0.0, d, EZ - 0.22, EZ, bevel=0.02)
    # หลังคาจั่วชัน (สันตามแกน y) + จั่วหน้า
    rx = hw + 0.42; ry0, ry1 = -0.5, d + 0.4
    k.gable2('roof_armory', -rx, rx, ry0, ry1, EZ - 0.12, RZ, 0.17)
    k.poly('wall', [(-hw, 0.0, EZ), (hw, 0.0, EZ), (0, 0.0, RZ - 0.2)][::-1], depth=0.25)
    k.beam('beam', (0, -0.06, EZ), (0, -0.06, RZ - 0.4), 0.16, 0.08)
    for sg in (-1, 1): k.beam('beam', (sg * 0.1, -0.06, EZ + 0.85), (sg * 1.5, -0.06, EZ + 0.05), 0.13, 0.08)
    roof_plates(k, rx, EZ - 0.12, RZ, (0.5, 1.6, 2.7), cyan_ys=((vs, 1.05, 0.15, 0.6), (-vs, 2.15, 0.2, 0.55)),
                plates=((vs, 2.15, 0.45, 0.75), (-vs, 0.85, 0.3, 0.55), (vs, 3.2, 0.2, 0.42)))
    slope = (RZ - EZ + 0.12) / rx
    for yy in (ry0 - 0.1, ry1 + 0.1):   # ไม้ปั้นลมไขว้หัวมังกร (หน้า + หลัง) + เส้นไฟรูนตามขอบ
        for sg in (-1, 1):
            a = Vector((sg * (rx + 0.08), yy, EZ - 0.28)); top = Vector((-sg * 0.7, yy, RZ + 0.12 + slope * 0.7))
            k.beam('beam', tuple(a), tuple(top), 0.3, 0.32)
            if yy < 0:
                knot_strip(k, 'bronze', a + (top - a) * 0.08 + Vector((0, -0.17, 0)), a + (top - a) * 0.72 + Vector((0, -0.17, 0)), Vector((0, -1, 0)), 0.22, r=0.026, period=0.5)
                k.beam('rune', tuple(a + Vector((0, 0.14, 0.22)) + (top - a) * 0.04), tuple(a + Vector((0, 0.14, 0.22)) + (top - a) * 0.66), 0.06, 0.05, bevel=0)
            dd = (top - a).normalized()
            dragon_head(k, top, (dd.x * 0.6 - sg * 0.5, dd.z * 0.4 + 0.2), 1.05)
    k.beam('beam', (0, ry0 - 0.05, RZ + 0.08), (0, ry1 + 0.05, RZ + 0.08), 0.22, 0.2)
    wz = EZ + 1.3                              # หน้าต่างวงล้อรูน
    disc(k, 'slate', 0, -0.05, wz, 0.56, 0.06)
    disc(k, 'cyan', 0, -0.07, wz, 0.4, 0.01)
    k.torus('bronze', 0.56, 0.07, loc=(0, -0.09, wz), rot=_rx90(), seg=(40, 8))
    for i in range(6):
        an = i * math.pi / 3
        k.beam('bronze', (0, -0.1, wz), (0.42 * math.cos(an), -0.1, wz + 0.42 * math.sin(an)), 0.06, 0.04)
    k.sphere('bronze', 0, -0.12, wz, 0.09)
    info['glows'].append(((0, -0.1, wz), 0.6, CYAN, 'gem'))
    # มุขทางเข้า (จั่วเล็ก) + ประตูโค้ง
    doorway(k, wl, 0, 1.2, 0.05, PZ, 1.55)
    info['glows'].append(((0, 0.0, PZ + 1.0), 0.9, WARM, 'warm'))
    k.light('POINT', (0, -0.3, PZ + 1.3), 50, (1.0, 0.72, 0.4), 0.3)
    PX, PY0 = 1.0, -0.85
    for sg in (-1, 1): post(k, sg * PX, PY0 + 0.1, PZ, 2.55, 0.26, glow=True)
    deck(k, -PX, PX, PY0, 0.05, PZ + 0.06)
    k.curve('beam', [[(-PX, PY0 + 0.05, 2.0, 0.1), (-PX * 0.7, PY0 + 0.05, 2.45, 0.1), (0, PY0 + 0.05, 2.62, 0.1), (PX * 0.7, PY0 + 0.05, 2.45, 0.1), (PX, PY0 + 0.05, 2.0, 0.1)]])
    k.box('beam', -PX - 0.18, PX + 0.18, PY0 - 0.05, PY0 + 0.2, 2.55, 2.72, bevel=0.02)
    pe, pr = 2.65, 3.7
    k.gable2('roof_armory', -PX - 0.4, PX + 0.4, PY0 - 0.25, 0.25, pe, pr, 0.13)
    k.poly('wall', [(-PX - 0.1, PY0 + 0.05, 2.72), (PX + 0.1, PY0 + 0.05, 2.72), (0, PY0 + 0.05, pr - 0.15)][::-1], depth=0.12)
    disc(k, 'bronze', 0, PY0, 3.1, 0.2, 0.04); disc(k, 'cyan', 0, PY0 - 0.02, 3.1, 0.12, 0.01)
    for sg in (-1, 1):
        k.beam('beam', (sg * (PX + 0.48), PY0 - 0.3, pe - 0.2), (-sg * 0.32, PY0 - 0.3, pr + 0.32), 0.18, 0.2)
        k.sphere('bronze', -sg * 0.36, PY0 - 0.3, pr + 0.38, 0.08)
        info['glows'].append((lantern(k, sg * PX, PY0 + 0.0, 1.7), 0.32, CYAN, 'lamp'))
        banner(k, sg * 1.62, -0.08, EZ - 0.15, 0.55, 1.35)
    # ระเบียงข้าง (ฝั่งที่เห็น): หลังคาเพิง + ราว + หน้าต่างโค้งไฟอุ่น + กันสาดฟ้า
    gx = vs * (hw + 1.0)
    k.shell('roof_armory', [(vs * hw, 0.55, EZ + 0.1), (gx + vs * 0.1, 0.55, 2.2), (gx + vs * 0.1, d - 0.1, 2.2), (vs * hw, d - 0.1, EZ + 0.1)], [(0, 1, 2, 3)], 0.13)
    k.beam('beam', (gx + vs * 0.1, 0.52, 2.18), (gx + vs * 0.1, d - 0.07, 2.18), 0.16, 0.16)
    for y in (0.7, d - 0.25): post(k, gx, y, PZ, 2.15, 0.24, glow=(y < 1))
    deck(k, min(vs * hw, gx), max(vs * hw, gx), 0.6, d - 0.1, PZ + 0.0)
    for y_ in (0.62, ):
        k.box('beam', min(vs * hw, gx), max(vs * hw, gx), y_ - 0.04, y_ + 0.04, PZ + 0.82, PZ + 0.92)
    k.box('beam', gx - 0.04, gx + 0.04, 0.6, d - 0.1, PZ + 0.82, PZ + 0.92)
    for i in range(9):
        y = 0.75 + (d - 0.95) * i / 8
        k.box('beam', gx - 0.035, gx + 0.035, y - 0.035, y + 0.035, PZ, PZ + 0.85)
    for yc in (1.25, 2.6):
        c = k.arch_cutter(yc - 0.38, yc + 0.38, PZ + 0.95, PZ + 1.6, vs * hw - 0.35, vs * hw + 0.35, 0.38, axis='x')
        k.cut(wl, c)
        k.box('warm', vs * hw - vs * 0.3 - 0.02, vs * hw - vs * 0.3 + 0.02, yc - 0.38, yc + 0.38, PZ + 0.95, PZ + 2.05)
        k.curve('beam', [[(vs * (hw + 0.04), yc - 0.38 + 0.76 * i / 12, PZ + 1.6 + 0.38 * math.sin(math.pi * i / 12), 0.06) for i in range(13)]], res=1)
        for t in (-0.19, 0.0, 0.19): k.box('bronze', vs * (hw + 0.02) - 0.02, vs * (hw + 0.02) + 0.02, yc + t - 0.015, yc + t + 0.015, PZ + 0.95, PZ + 1.9)
        info['glows'].append(((vs * hw, yc, PZ + 1.4), 0.6, WARM, 'warm'))
    # ผนังโล่บนหน้าจั่ว (ใต้หน้าต่างวงล้อ ข้างประตู) + ขวานไขว้
    for i, (col, rim) in enumerate((('red', 'bronze'), ('blue', 'ironl'))):
        xx = (-1 if i == 0 else 1) * 1.55
        shield(k, xx, -0.06, PZ + 1.0, 0.26, col, rim, i)
    T = B.done()
    fc = B.W(vs * hw, 0.0)
    hanging_sign(k, info, fc[0] + vs * 1.05, 0.22, 3.0, 1.85, post=(fc[0], fc[1], 2.95))
    # ของหน้าร้าน (พิกัดฐาน): หุ่นเกราะ ชั้นอาวุธ ถัง โล่พิง
    armor_stand(k, s * 3.3, 0.85, PZ, True)
    weapon_rack(k, s * 2.05, 0.75, PZ)
    barrel(k, vs * 3.45, 0.62, PZ, 0.25, 0.6); barrel(k, vs * 2.9, 0.5, PZ, 0.22, 0.52, lid='beaml')
    shield(k, vs * 3.45, 0.3, PZ + 0.48, 0.26, 'blue', 'bronze', 4)
    crate(k, vs * 0.6, 0.55, PZ, 0.5)


def shop_plating(k, info, W, D, canals, side):
    """PLATING (ใหม่): โรงชุบ 2 ชั้น — ล่างหินอุ่น บนโครงไม้ผนังปูนครีม (ยื่น) หลังคาปั้นหยาทองแดงเขียวสนิม โดมแก้วเรืองเขียว + จั่วหน้าต่างกลม
    อ่างชุบเรืองเขียว + ถังแก้วสูงข้างผนัง + ท่อทองแดง"""
    PZ = 0.45; s = -side; vs = side
    w, d = 5.2, 3.5
    B = Body(k, info, s, w, d, PZ)
    dx = s * 1.0
    dwx, dwy, _ = B.W(dx, -0.3)
    podium(k, W, D, PZ, (dwx, 1.2), canals, 3)
    deck(k, *sorted((s * 0.05, s * 3.92)), 0.62, 3.4, PZ)
    B.i0 = k.frame(); B.g0 = len(info['glows'])
    hw = w / 2; Z1, Z2 = 2.2, 3.75
    g = k.box('stonew', -hw, hw, 0.0, d, PZ, Z1, bevel=0.03)
    k.box('stoned', -hw - 0.05, hw + 0.05, -0.05, d + 0.05, PZ, PZ + 0.4, bevel=0.025)
    doorway(k, g, dx, 1.15, 0.0, PZ, 1.2)
    k.prof_trim('stone', k.pointed(dx - 0.7, dx + 0.7, PZ + 1.2, 0.62), -0.05, 0.09, z0=PZ)
    k.light('POINT', (dx, -0.25, PZ + 1.2), 45, (1.0, 0.75, 0.45), 0.3)
    info['glows'].append(((dx, 0.0, PZ + 0.9), 0.85, WARM, 'warm'))
    wx = -s * 1.1
    k.cut(g, k.arch_cutter(wx - 0.62, wx + 0.62, PZ + 0.55, PZ + 1.15, -0.3, 0.3, 0.62))
    k.box('green', wx - 0.62, wx + 0.62, 0.22, 0.26, PZ + 0.55, PZ + 1.8)
    lattice(k, wx - 0.62, wx + 0.62, PZ + 0.55, PZ + 1.15, 0.02, mat='copper')
    k.arch_trim('stone', wx, 0.0, 1.34, PZ + 1.15, 0.67, r=0.08, z0=PZ + 0.5, keystone='stone')
    info['glows'].append(((wx, 0.0, PZ + 1.05), 0.8, GREEN, 'vat'))
    # ผนังข้างชั้นล่าง: ช่องโค้งเรืองเขียว
    for yc in (0.95, 2.45):
        c = k.arch_cutter(yc - 0.35, yc + 0.35, PZ + 0.7, PZ + 1.2, vs * hw - 0.3, vs * hw + 0.3, 0.35, axis='x'); k.cut(g, c)
        k.box('green', vs * hw - vs * 0.25 - 0.02, vs * hw - vs * 0.25 + 0.02, yc - 0.35, yc + 0.35, PZ + 0.7, PZ + 1.6)
        k.curve('stone', [[(vs * (hw + 0.04), yc - 0.4 + 0.8 * i / 12, PZ + 1.2 + 0.4 * math.sin(math.pi * i / 12), 0.07) for i in range(13)]], res=1)
        info['glows'].append(((vs * hw, yc, PZ + 1.1), 0.5, GREEN, 'vat'))
    # ชั้นบนโครงไม้ยื่น (jetty) ทั้งหน้าและข้างที่เห็น
    J = 0.18
    k.box('plaster', -hw - J, hw + J, -J, d, Z1, Z2)
    for (a0, a1, yy) in ((-hw - J, hw + J, -J),):
        k.box('beam', a0 - 0.12, a1 + 0.12, yy - 0.12, yy + 0.12, Z1 - 0.06, Z1 + 0.16, bevel=0.02)
        k.box('beam', a0 - 0.08, a1 + 0.08, yy - 0.1, yy + 0.06, Z2 - 0.16, Z2, bevel=0.02)
    xv = vs * (hw + J)
    k.box('beam', xv - 0.12, xv + 0.12, -J, d, Z1 - 0.06, Z1 + 0.16, bevel=0.02)
    k.box('beam', xv - 0.1, xv + 0.1, -J, d, Z2 - 0.16, Z2, bevel=0.02)
    xs = (-hw - J, -1.05, 1.05, hw + J)
    for x in xs:
        k.box('beam', x - 0.12, x + 0.12, -J - 0.1, -J + 0.04, Z1, Z2, bevel=0.015)
        k.beam('beam', (x, 0.02, Z1 - 0.6), (x, -J + 0.02, Z1 - 0.03), 0.14, 0.14)
    for xa, xb in ((-hw - J, -1.05), (1.05, hw + J)):
        for a, b in (((xa, Z1 + 0.1), (xb, Z2 - 0.12)), ((xb, Z1 + 0.1), (xa, Z2 - 0.12))):
            k.beam('beam', (a[0], -J - 0.04, a[1]), (b[0], -J - 0.04, b[1]), 0.11, 0.07)
        mx = (xa + xb) / 2
        k.box('beam', mx - 0.45, mx + 0.45, -J - 0.12, -J + 0.02, Z1 + 0.38, Z1 + 1.22, bevel=0.015)
        k.box('green', mx - 0.36, mx + 0.36, -J - 0.13, -J - 0.11, Z1 + 0.46, Z1 + 1.14)
        lattice(k, mx - 0.36, mx + 0.36, Z1 + 0.46, Z1 + 1.14, -J - 0.14, mat='copper', sp=0.24)
        info['glows'].append(((mx, -J - 0.12, Z1 + 0.8), 0.5, GREEN, 'vat'))
    for y in (-J, 1.2, 2.4, d):   # โครงไม้ผนังข้างชั้นบน + หน้าต่างกลม
        k.box('beam', xv - 0.1, xv + 0.1, y - 0.1, y + 0.1, Z1, Z2, bevel=0.015)
    for yc in (0.55, 1.8):
        o = k.cyl('dark', 0, 0, 0.3, 0, 0.05, 20, rot=_ry90(1)); o.location = (xv + vs * 0.02, yc + 0.0, (Z1 + Z2) / 2)
        k.torus('copper', 0.3, 0.05, loc=(xv + vs * 0.05, yc, (Z1 + Z2) / 2), rot=_ry90(1), seg=(24, 6))
        o2 = k.cyl('green', 0, 0, 0.26, 0, 0.02, 20, rot=_ry90(1)); o2.location = (xv + vs * 0.03, yc, (Z1 + Z2) / 2)
        info['glows'].append(((xv, yc, (Z1 + Z2) / 2), 0.4, GREEN, 'vat'))
    # หลังคาปั้นหยาทองแดงเขียวสนิม + จั่วหน้าต่างกลม + โดมแก้วเรือง + ปล่องระบาย
    rx0, rx1, ry0, ry1 = -hw - 0.5, hw + 0.5, -J - 0.45, d + 0.35
    k.hip('roof_plating', rx0, rx1, ry0, ry1, Z2 - 0.08, 5.15, 0.15)
    dd = (ry1 - ry0) / 2; ym = (ry0 + ry1) / 2
    k.beam('copper', (rx0 + dd * 0.9, ym, 5.2), (rx1 - dd * 0.9, ym, 5.2), 0.16, 0.12)
    for sg in (-1, 1):
        k.beam('copper', (sg * rx1, ry0, Z2 - 0.05), (sg * (rx1 - dd * 0.9), ym, 5.18), 0.12, 0.1)
    k.gable2('roof_plating', -0.85, 0.85, ry0 + 0.05, ym - 0.2, Z2 + 0.1, Z2 + 1.25, 0.12)     # จั่วหน้า (dormer)
    k.poly('plaster', [(-0.7, ry0 + 0.15, Z2 - 0.1), (0.7, ry0 + 0.15, Z2 - 0.1), (0.7, ry0 + 0.15, Z2 + 0.2), (0, ry0 + 0.15, Z2 + 1.1), (-0.7, ry0 + 0.15, Z2 + 0.2)][::-1], depth=0.8)
    disc(k, 'copper', 0, ry0 + 0.1, Z2 + 0.45, 0.32, 0.05); disc(k, 'green', 0, ry0 + 0.07, Z2 + 0.45, 0.25, 0.01)
    for a in range(4): k.beam('copper', (0, ry0 + 0.06, Z2 + 0.45), (0.25 * math.cos(a * math.pi / 2 + 0.78), ry0 + 0.06, Z2 + 0.45 + 0.25 * math.sin(a * math.pi / 2 + 0.78)), 0.04, 0.03)
    info['glows'].append(((0, ry0 + 0.06, Z2 + 0.45), 0.45, GREEN, 'vat'))
    for sg in (-1, 1): k.beam('copper', (sg * 0.95, ry0 - 0.02, Z2 + 0.05), (0, ry0 - 0.02, Z2 + 1.32), 0.12, 0.1)
    cy_ = ym + 0.15
    k.prism('copper', 0, cy_, 0.62, 0.55, 5.05, 5.25)
    k.prism('green', 0, cy_, 0.5, 0.45, 5.25, 5.85)
    P = k.ngon(0, cy_, 0.52, 0.47)
    for kk in range(8): k.box('copper', P[kk][0] - 0.035, P[kk][0] + 0.035, P[kk][1] - 0.035, P[kk][1] + 0.035, 5.25, 5.85)
    k.prism('verd', 0, cy_, 0.68, 0.62, 5.85, 6.4, top=0.12)
    k.sphere('copper', 0, cy_, 6.47, 0.08)
    info['glows'].append(((0, cy_ - 0.45, 5.55), 0.6, GREEN, 'vat'))
    vx = -vs * 1.8
    k.cyl('copper', vx, d - 0.6, 0.2, 4.0, 5.9, 16)
    k.cyl('greenw', vx, d - 0.6, 0.15, 5.85, 5.93, 16)
    k.cyl('copper', vx, d - 0.6, 0.3, 5.93, 6.05, 16, r2=0.12)
    info['glows'].append(((vx, d - 0.6, 5.95), 0.35, GREEN, 'vat'))
    # ถังแก้วสูงเรืองเขียวชิดผนังข้าง + ท่อขึ้นชั้นบน
    tx, ty, tr = vs * (hw + 0.62), 1.9, 0.48
    k.cyl('iron', tx, ty, tr + 0.08, PZ, PZ + 0.3, 24)
    k.cyl('glass', tx, ty, tr, PZ + 0.3, 2.85, 28)
    k.cyl('green', tx, ty, tr - 0.06, PZ + 0.32, 2.45, 24)
    for zz in (PZ + 0.32, 1.6, 2.85): k.torus('bronze', tr + 0.02, 0.045, loc=(tx, ty, zz), seg=(32, 6))
    for a in range(4):
        an = a * math.pi / 2 + math.pi / 4
        k.box('copper', tx + tr * math.cos(an) - 0.03, tx + tr * math.cos(an) + 0.03, ty + tr * math.sin(an) - 0.03, ty + tr * math.sin(an) + 0.03, PZ + 0.3, 2.85)
    k.sphere('copper', tx, ty, 2.85, tr + 0.04, sz=0.5)
    k.curve('copper', [[(tx, ty, 3.05, 0.07), (tx, ty, 3.35, 0.07), (tx - vs * 0.25, ty, 3.4, 0.07), (xv, ty, 3.4, 0.07)]])
    for b in range(4): k.sphere('greenw', tx + 0.1 * math.cos(b * 2), ty - tr * 0.6, 1.0 + b * 0.35, 0.04)
    info['glows'].append(((tx, ty - tr, 1.6), 0.7, GREEN, 'vat'))
    k.light('POINT', (tx, ty - tr - 0.4, 1.5), 30, (0.4, 1.0, 0.55), 0.3)
    T = B.done()
    fc = B.W(vs * (hw + J), -J)
    hanging_sign(k, info, fc[0] + vs * 1.05, 0.22, 3.05, 1.95, post=(fc[0], fc[1], 3.0))
    # อ่างชุบเรืองเขียว (พิกัดฐาน หน้าร้านฝั่งประตู) + เกราะ/หมวกกำลังชุบ + ท่อจากผนัง
    ax0, ax1 = sorted((s * 2.25, s * 3.85)); ay0, ay1 = 0.35, 1.45; az = PZ + 0.85
    k.box('iron', ax0, ax1, ay0, ay1, PZ, PZ + 0.18, bevel=0.02)
    k.box('glass', ax0 + 0.06, ax1 - 0.06, ay0 + 0.06, ay1 - 0.06, PZ + 0.18, az - 0.05)
    k.box('green', ax0 + 0.1, ax1 - 0.1, ay0 + 0.08, ay1 - 0.1, PZ + 0.2, az - 0.12)
    k.box('greenw', ax0 + 0.08, ax1 - 0.08, ay0 + 0.08, ay1 - 0.08, az - 0.14, az - 0.11)
    for x in (ax0, ax1):
        for y in (ay0, ay1): k.box('iron', x - 0.05, x + 0.05, y - 0.05, y + 0.05, PZ, az + 0.05)
    for z in (PZ + 0.18, az - 0.04): k.box('bronze', ax0 - 0.02, ax1 + 0.02, ay0 - 0.05, ay0 + 0.02, z, z + 0.06)
    for i in range(6): k.sphere('greenw', ax0 + 0.25 + (ax1 - ax0 - 0.5) * (i % 3) / 2, ay0 + 0.3 + 0.4 * (i // 3), az - 0.1, 0.035 + 0.015 * (i % 2))
    k.beam('iron', (ax0 + 0.05, 0.9, az + 1.05), (ax1 - 0.05, 0.9, az + 1.05), 0.06)
    for x in (ax0 + 0.05, ax1 - 0.05): k.beam('iron', (x, 0.9, az), (x, 0.9, az + 1.08), 0.06)
    for i, x in enumerate((ax0 + 0.5, ax1 - 0.5)):
        k.beam('iron', (x, 0.9, az + 1.03), (x, 0.9, az + 0.55), 0.012)
        if i == 0: k.sphere('gold', x, 0.9, az + 0.42, 0.15, sz=1.05)
        else: k.cyl('gold', x, 0.9, 0.16, az + 0.2, az + 0.55, 14, r2=0.2)
    info['glows'].append((((ax0 + ax1) / 2, ay0, az - 0.3), 0.75, GREEN, 'vat'))
    k.light('POINT', ((ax0 + ax1) / 2, ay0 - 0.15, az + 0.1), 35, (0.4, 1.0, 0.55), 0.3)
    wa = B.W(s * 2.0, 0.0, 1.9); wb = B.W(s * 2.4, 0.0, 1.6)
    k.curve('copper', [[(wa[0], wa[1] - 0.02, 1.9, 0.07), (wa[0], (wa[1] + 1.1) / 2, 2.0, 0.07), (s * 3.3, 1.0, az + 0.25, 0.07)]])
    k.curve('copper', [[(wb[0], wb[1] - 0.02, 1.6, 0.06), (wb[0], (wb[1] + 1.2) / 2, 1.65, 0.06), (s * 2.7, 1.2, az + 0.1, 0.06)]])
    for i, (x, y, r) in enumerate(((vs * 2.15, 0.55, 0.3), (vs * 2.95, 0.72, 0.25))):   # อ่างกลมเล็ก 2 ใบ (ฝั่งคลอง)
        k.cyl('copper', x, y, r, PZ, PZ + 0.42, 20, r2=r * 1.08)
        k.cyl('greenw', x, y, r * 0.92, PZ + 0.38, PZ + 0.4, 20)
        k.torus('bronze', r * 1.06, 0.03, loc=(x, y, PZ + 0.42), seg=(24, 6))
    info['glows'].append(((vs * 2.5, 0.55, PZ + 0.4), 0.45, GREEN, 'vat'))
    crate(k, s * 0.75, 0.55, PZ, 0.5)
    for i in range(3): k.box('gold' if i % 2 else 'ironl', s * 0.75 - 0.17 + i * 0.12, s * 0.75 - 0.07 + i * 0.12, 0.4, 0.7, PZ + 0.45, PZ + 0.52, bevel=0.008)
    barrel(k, vs * 3.5, 0.6, PZ, 0.25, 0.6)


def shop_forge(k, info, W, D, canals, side):
    """FORGE (ภาพ prop_bld_forge): โรงตีเหล็กหน้าเปิด เตาอิฐโค้งเรืองส้ม ตราทั่งมีเขาบนหน้าจั่ว ปล่องหินกลมช่องไฟส้ม (หลังฝั่งคลอง)
    ทั่ง+เหล็กแดง ถังชุบ ลังทองแท่ง ชั้นเครื่องมือ ธงทั่ง"""
    PZ = 0.45; s = -side; vs = side
    w, d = 4.7, 3.9
    B = Body(k, info, s, w, d, PZ)
    dwx, dwy, _ = B.W(-s * 0.2, -0.6)
    podium(k, W, D, PZ, (dwx, 1.25), canals, 3)
    deck(k, *sorted((s * 0.05, s * 3.92)), 0.62, 3.4, PZ)
    B.i0 = k.frame(); B.g0 = len(info['glows'])
    hw = w / 2; EZ, RZ = 3.15, 4.95; OY = 1.7     # OY = ผนังด้านในของพื้นที่หน้าเปิด
    k.box('stoned', -hw + 0.1, hw - 0.1, OY, d, PZ, EZ)
    k.box('stoned', vs * hw - 0.2, vs * hw + 0.1, 0.0, OY, PZ, EZ)        # ผนังข้างที่เห็น (หินเข้ม)
    for x in (-hw + 0.12, 0.0, hw - 0.12): post(k, x, 0.0, PZ, EZ - 0.1, 0.32, glow=(abs(x) > 1))
    k.box('beam', -hw - 0.1, hw + 0.1, -0.12, 0.18, EZ - 0.34, EZ - 0.06, bevel=0.02)
    for x in (-hw + 0.12, 0.0, hw - 0.12):
        for sg in (-1, 1):
            if (x < -1 and sg < 0) or (x > 1 and sg > 0): continue
            k.beam('beam', (x + sg * 0.14, 0.0, EZ - 0.95), (x + sg * 0.72, 0.0, EZ - 0.32), 0.12, 0.1)
    k.box('flag', -hw, hw, 0.0, OY, PZ, PZ + 0.03)
    rx = hw + 0.32
    k.gable2('roof_forge', -rx, rx, -0.45, d + 0.3, EZ - 0.12, RZ, 0.18)
    k.poly('wall', [(-hw, 0.0, EZ - 0.06), (hw, 0.0, EZ - 0.06), (0, 0.0, RZ - 0.15)][::-1], depth=0.2)
    roof_plates(k, rx, EZ - 0.12, RZ, (0.6, 1.8, 3.0), plates=((vs, 1.2, 0.3, 0.7), (-vs, 2.4, 0.4, 0.8)))
    for sg in (-1, 1):
        k.beam('beam', (sg * (rx + 0.08), -0.5, EZ - 0.3), (-sg * 0.3, -0.5, RZ + 0.25), 0.26, 0.28)
        k.sphere('bronze', -sg * 0.33, -0.5, RZ + 0.33, 0.09)
    k.beam('iron', (0, -0.45, RZ + 0.05), (0, d + 0.35, RZ + 0.05), 0.2, 0.14)
    k.box('slate', -1.1, 1.1, d - 0.3, d + 0.05, RZ - 0.6, RZ - 0.1)   # แผงลายถักบนลาดหลัง (ภาพวาด)
    rune_disc(k, 0, -0.2, EZ + 0.95, 0.62, rune='anvil', glow='ember', face='slate')
    info['glows'].append(((0, -0.25, EZ + 0.95), 0.6, FIRE, 'fire'))
    # เตาอิฐโค้ง (ในพื้นที่เปิด ชิดผนังใน) + ฮูด
    fx = -vs * 0.95; fw = 1.75
    fb = k.box('brick', fx - fw / 2, fx + fw / 2, OY - 0.75, OY, PZ, 2.4, bevel=0.03)
    k.cut(fb, k.arch_cutter(fx - 0.55, fx + 0.55, PZ + 0.35, PZ + 0.95, OY - 1.0, OY - 0.2, 0.55))
    k.box('fire', fx - 0.55, fx + 0.55, OY - 0.25, OY - 0.2, PZ + 0.3, PZ + 1.55)
    k.box('coal', fx - 0.5, fx + 0.5, OY - 0.75, OY - 0.25, PZ + 0.3, PZ + 0.42)
    k.box('ember', fx - 0.4, fx + 0.4, OY - 0.7, OY - 0.3, PZ + 0.42, PZ + 0.46)
    k.arch_trim('stone', fx, OY - 0.75, 1.2, PZ + 0.95, 0.6, r=0.08, z0=PZ + 0.3, keystone='stone')
    k.box('stoned', fx - fw / 2 - 0.05, fx + fw / 2 + 0.05, OY - 0.8, OY, 2.4, 2.55, bevel=0.02)
    info['glows'].append(((fx, OY - 0.75, PZ + 0.8), 1.0, '255,130,40', 'fire'))
    k.light('POINT', (fx, OY - 1.0, PZ + 0.8), 140, (1.0, 0.45, 0.12), 0.4)
    tx = vs * 0.9                              # ชั้นเครื่องมือบนผนังใน
    k.box('beam', tx - 0.55, tx + 0.55, OY - 0.08, OY, PZ + 1.5, PZ + 1.58)
    for i in range(5):
        x = tx - 0.42 + i * 0.21
        k.box('beam' if i % 2 else 'iron', x - 0.02, x + 0.02, OY - 0.12, OY - 0.08, PZ + 0.8, PZ + 1.53)
        k.box('iron', x - 0.07 + 0.02 * (i % 2), x + 0.07, OY - 0.13, OY - 0.07, PZ + 0.72, PZ + 0.9 + 0.08 * (i % 2))
    k.box('beaml', tx - 0.6, tx + 0.6, OY - 0.65, OY - 0.1, PZ + 0.7, PZ + 0.78, bevel=0.01)   # โต๊ะงาน
    for xx in (tx - 0.52, tx + 0.52): k.box('beam', xx - 0.04, xx + 0.04, OY - 0.6, OY - 0.15, PZ, PZ + 0.7)
    k.box('iron', tx - 0.3, tx - 0.05, OY - 0.5, OY - 0.3, PZ + 0.78, PZ + 0.86)
    # ผนังข้างที่เห็น: ช่องไฟส้ม + เตาหลอมเหลี่ยมชิดผนัง
    for yc in (0.55, 1.2):
        k.box('iron', vs * (hw + 0.1) - 0.02, vs * (hw + 0.1) + 0.02, yc - 0.12, yc + 0.12, 1.5, 2.6)
        k.box('fire', vs * (hw + 0.12) - 0.02, vs * (hw + 0.12) + 0.02, yc - 0.06, yc + 0.06, 1.6, 2.5)
    info['glows'].append(((vs * hw, 0.9, 2.05), 0.5, FIRE, 'fire'))
    banner(k, 0.0, -0.22, EZ - 0.5, 0.5, 1.15, col='cloth_c', trim='cloth_b', emblem='anvil')
    info['glows'].append((lantern(k, -vs * (hw - 0.12), 0.0, 1.6), 0.32, CYAN, 'lamp'))
    T = B.done()
    fc = B.W(vs * hw, 0.0)
    hanging_sign(k, info, fc[0] + vs * 1.05, 0.22, 3.0, 1.9, post=(fc[0], fc[1], 2.95))
    # ปล่องหินกลมช่องไฟส้ม (พิกัดฐาน หลังฝั่งคลอง)
    cx_, cy_, cr = vs * 2.95, 4.55, 0.95
    k.cyl('stoned', cx_, cy_, cr + 0.1, PZ, PZ + 0.55, 32)
    k.cyl('stoned', cx_, cy_, cr, PZ + 0.55, 6.3, 32)
    for zz in (1.6, 3.3, 5.1, 6.1): k.torus('iron', cr + 0.02, 0.06, loc=(cx_, cy_, zz), seg=(40, 6))
    for a in (-112, -90, -68):
        an = math.radians(a); c = (cx_ + (cr + 0.012) * math.cos(an), cy_ + (cr + 0.012) * math.sin(an))
        k.beam('fire', (c[0], c[1], 3.55), (c[0], c[1], 4.85), 0.12, 0.03, bevel=0)
        k.beam('iron', (c[0], c[1] - 0.005, 3.47), (c[0], c[1] - 0.005, 4.93), 0.2, 0.02, bevel=0)
    info['glows'].append(((cx_, cy_ - cr, 4.2), 0.6, FIRE, 'fire'))
    band(k, 'stoned', cx_, cy_, cr - 0.25, cr + 0.15, 6.3, 6.6, 40)
    band(k, 'iron', cx_, cy_, cr - 0.25, cr + 0.15, 6.6, 6.7, 40)
    k.cyl('ember', cx_, cy_, cr - 0.25, 6.28, 6.4, 32)
    info['glows'].append(((cx_, cy_, 6.7), 0.75, FIRE, 'fire'))
    k.light('POINT', (cx_, cy_ - cr - 0.4, 4.2), 40, (1.0, 0.5, 0.15), 0.3)
    # หน้าร้าน: ทั่ง + เหล็กแดง + ค้อน, ถังชุบ, ลังทองแท่ง, กองถ่าน
    ax, ay = dwx - vs * 0.95, 1.0
    k.cyl('beam', ax, ay, 0.28, PZ, PZ + 0.42, 14, r2=0.25)
    k.box('iron', ax - 0.13, ax + 0.13, ay - 0.13, ay + 0.13, PZ + 0.42, PZ + 0.62, taper=(1.6, 1.3))
    k.box('ironl', ax - 0.36, ax + 0.3, ay - 0.17, ay + 0.17, PZ + 0.62, PZ + 0.76, bevel=0.02)
    k.cyl('ironl', ax - 0.36, ay, 0.15, 0.0, 0.28, 4, r2=0.0, smooth=False, rot=_ry90(-1)).location = (0, 0, PZ + 0.69)
    k.box('ember', ax - 0.2, ax + 0.05, ay - 0.06, ay + 0.06, PZ + 0.76, PZ + 0.8)
    k.beam('beam', (ax + 0.1, ay + 0.05, PZ + 0.8), (ax + 0.5, ay - 0.15, PZ + 0.8), 0.04)
    k.box('iron', ax + 0.43, ax + 0.55, ay - 0.24, ay - 0.08, PZ + 0.74, PZ + 0.88)
    info['glows'].append(((ax - 0.08, ay, PZ + 0.8), 0.35, '255,150,60', 'fire'))
    k.light('POINT', (ax - 0.08, ay - 0.3, PZ + 1.0), 12, (1.0, 0.5, 0.15), 0.1)
    barrel(k, s * 3.45, 0.62, PZ, 0.3, 0.55, lid='water')
    crate(k, vs * 2.2, 0.55, PZ, 0.55)
    for i in range(3):
        for j in range(3 - i):
            x = vs * 2.2 - 0.18 + j * 0.13 + i * 0.065
            k.box('gold', x - 0.055, x + 0.055, 0.4, 0.68, PZ + 0.5 + i * 0.07, PZ + 0.57 + i * 0.07, bevel=0.01)
    for i in range(7):
        a = i * 0.9; k.sphere('coal', s * 3.35 + 0.18 * math.cos(a), 1.45 + 0.1 * math.sin(a), PZ + 0.07, 0.12, sz=0.7)
    k.box('stoned', vs * 3.5 - 0.35, vs * 3.5 + 0.35, 0.5, 1.3, PZ, PZ + 0.75, bevel=0.04)   # ก้อนหินลับ + แท่งเหล็ก
    for i in range(3): k.box('iron', vs * 3.5 - 0.25 + i * 0.15, vs * 3.5 - 0.15 + i * 0.15, 0.6, 1.2, PZ + 0.75, PZ + 0.82)


# ============================================================
#  เรนเดอร์: สไปรต์ (Freestyle) + เงาบนพื้น (shadow catcher) ต่ออาคาร
# ============================================================
def spec_of(d, tiles, b):
    key = BLD[b['label']][0]
    ox = b['x'] + b['w'] / 2
    return {'kind': key, 'w': b['w'], 'h': b['h'], 'canals': [(x0 - ox, x1 - ox) for x0, x1 in canal_runs(d, tiles, b)]}


def shadow_rect(b, key):
    ext = 8.0 if key == 'core' else 6.5
    return (b['x'] - 0.5, b['y'] - 0.5, b['x'] + b['w'] + ext, b['y'] + b['h'] + ext)


def render(samples, out, only=None, preview=False):
    import bpy
    import bifrost3d as BF
    os.makedirs(out, exist_ok=True)
    d, tiles = load_tiles()
    only = only or list(KEYS)
    mp = os.path.join(out, 'meta.json')
    meta = json.load(open(mp)) if os.path.exists(mp) else {}
    ss = 1 if preview else SS; ppm = GPX * ss
    for b in d['buildings']:
        key = BLD[b['label']][0]
        if key not in only: continue
        spec = spec_of(d, tiles, b)
        sc, so = scene_setup(); M = materials()
        coll = bpy.data.collections.new('ink'); sc.collection.children.link(coll)
        k = Kit(sc, M, coll)
        info = core(k, spec) if key == 'core' else shop(k, spec)
        cam = BF.Cam(sc)   # กล้องสไปรต์: yaw 0 เหมือนกล้องเกม แต่ก้มน้อยกว่า (TB) → เห็นหน้าอาคารมากขึ้น หลังคาน้อยลง
        from mathutils import Vector
        cam.co.rotation_euler = (TB, 0, 0)
        cam.d = Vector((0, math.sin(TB), -math.cos(TB))); cam.up = Vector((0, math.cos(TB), math.sin(TB)))
        objs = [o for o in coll.objects if not o.hide_render]
        for o in objs:   # ลบมุมทุกชิ้น (ขอบรับแสง = งาน 3D พรีเมียม) — หลังตัด boolean
            if o.type == 'MESH' and not any(md.type == 'BEVEL' for md in o.modifiers) and len(o.data.polygons) > 1:
                md = o.modifiers.new('bev2', 'BEVEL'); md.width = 0.022; md.segments = 2; md.limit_method = 'ANGLE'; md.angle_limit = math.radians(35)
                try: md.harden_normals = False
                except Exception: pass
        u0, u1, v0, v1 = cam.bounds(objs, 0.1)
        cam.frame(u0, u1, v0, v1, ppm)
        BF.freestyle(sc, coll, float(os.environ.get('BLINE', 2.1)) * ss)
        sc.cycles.use_denoising = True
        cam.shoot(os.path.join(out, f'{key}.png'), samples)
        lp, lw = info['label']
        m = {'anchor': cam.px((0, 0, 0)), 'ppm': ppm, 'label': [*cam.px(lp), round(lw * ppm, 1)],
             'glows': [[*cam.px(p), round(r * ppm, 1), col, kd] for p, r, col, kd in info['glows']],
             'size': [sc.render.resolution_x, sc.render.resolution_y]}
        m['shadow'] = {'rect': shadow_rect(b, key)}
        meta[key] = m
        json.dump(meta, open(mp, 'w'), indent=1)
        if os.environ.get('BNOSHADOW'): print('meta', key, m['anchor'], m['label']); continue
        # เงาบนพื้น: วัตถุมองไม่เห็นแต่ยังทอดเงา (ภาพพื้นแบบ A) — กล้องเกมจริง (มุมก้ม acos 0.76) • ไฟจุดในร้านไม่ทอดเงาลงพื้น (เอาออก)
        for o in [o for o in sc.objects if o.type == 'LIGHT' and o.data.type == 'POINT']: bpy.data.objects.remove(o)
        cam = BF.Cam(sc)
        sc.render.use_freestyle = False
        for o in objs: o.visible_camera = False
        pl = BF.catcher(sc)
        rect = shadow_rect(b, key)
        BF.ground_shot(cam, rect, (b['x'] + b['w'] / 2, b['y'] + b['h']), os.path.join(out, f'{key}_sh.png'), max(8, samples // 2))
        bpy.data.objects.remove(pl)
        meta[key] = m
        json.dump(meta, open(mp, 'w'), indent=1)
        print('meta', key, m['anchor'], m['label'])
    print('meta →', mp)


# ============================================================
#  ติดตั้ง: ย่อ/ปรับสี/ตัดขอบ → assets/bake_bld_*.webp + js/bake_data_eldheim_bld.js + manifest
# ============================================================
def install(src):
    from PIL import Image
    from tree3d import paint, opacity_mask
    from slice_sheet import manifest
    d, _ = load_tiles()
    meta = json.load(open(os.path.join(src, 'meta.json')))
    A = os.path.join(ROOT, 'assets')
    s = PX / GPX
    out = []
    for b in d['buildings']:
        key = BLD[b['label']][0]
        if key not in meta: raise SystemExit(f'ยังไม่ได้เรนเดอร์ {key} — ต้องติดตั้งครบทั้งชุด (ร้าน + หอคอย)')
        m = meta[key]
        im = Image.open(os.path.join(src, f'{key}.png')).convert('RGBA')
        f = GPX / m['ppm']
        im = im.resize((round(im.width * f), round(im.height * f)), Image.LANCZOS)
        im = paint(im, sat=1.22, con=1.12, bri=1.0, outline=False)
        bb = im.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox()
        l, t, r, bt = max(0, bb[0] - 2), max(0, bb[1] - 2), min(im.width, bb[2] + 2), min(im.height, bb[3] + 2)
        im = im.crop((l, t, r, bt))
        img = f'bake_bld_{key}'
        im.save(os.path.join(A, img + '.webp'), 'WEBP', quality=90, method=6)
        P = lambda p: [round(p[0] * f - l, 1), round(p[1] * f - t, 1)]
        e = {'label': b['label'], 'x': b['x'], 'y': b['y'], 'w': b['w'], 'h': b['h'], 'hash': b['hash'], 'hashRect': b['hashRect'],
             'img': img, 'ax': P(m['anchor'])[0], 'ay': P(m['anchor'])[1],
             'lx': P(m['label'])[0], 'ly': P(m['label'])[1], 'lw': round(m['label'][2] * f, 1),
             'glows': [[*P(g[:2]), round(g[2] * f, 1), g[3], g[4]] for g in m['glows']],
             'mask': opacity_mask(im, 16)}
        # เงาบนพื้น: สีม่วงเข้ม (แบบเงาซุ้มประตู) อัลฟาลดลง → ยืด ×1/0.76 เป็นพิกัดพื้น 40 px/ม.
        x0, y0, x1, y1 = m['shadow']['rect']
        sh = Image.open(os.path.join(src, f'{key}_sh.png')).convert('RGBA').resize((round((x1 - x0) * PX), round((y1 - y0) * PX)), Image.LANCZOS)
        a = sh.getchannel('A').point(lambda q: int(q * 0.55)); sh = Image.merge('RGBA', (*Image.new('RGB', sh.size, (18, 12, 24)).split(), a))
        sh.save(os.path.join(A, img + '_sh.webp'), 'WEBP', quality=86, method=6)
        e['sh'] = {'img': img + '_sh', 'x': x0, 'y': y0, 'w': round(x1 - x0, 3), 'h': round(y1 - y0, 3)}
        out.append(e)
        print('ติดตั้ง', img, im.size, 'anchor', e['ax'], e['ay'], 'ป้าย', e['lx'], e['ly'], e['lw'])
    js = ("'use strict';\n// สร้างอัตโนมัติโดย tools/bld3d.py --install — อย่าแก้ด้วยมือ (แก้ใน tools/bld3d.py แล้วติดตั้งใหม่)\n"
          "// ชุดอาคาร 3D ของ Neo Eldheim: หอคอย CENTRAL CORE + ร้าน 4 ร้าน (docs/RENDER3D_PLAN.md #7 + #14) — สไปรต์ B วาดแทนภาพวาด BUILDING_ART\n"
          "//   x,y,w,h = ฐานชน (ต้องตรงกับ addBuilding) • hash/hashRect = ผังช่องรอบอาคาร (รวมคลองหน้าร้าน) — ไม่ตรงแม้หลังเดียว = ภาพวาดเดิมทั้งชุด\n"
          "//   ax,ay = จุดยึด (กลางขอบหน้าฐานบนพื้น) px ในภาพ • lx,ly,lw = กลาง/ความกว้างแผ่นป้ายชื่อ (เกมเขียนชื่อทับ)\n"
          "//   glows = [x, y, รัศมี px, 'r,g,b', ชนิด] จุดเรืองกะพริบ (เตา/อ่าง/คริสตัล/โคม) • mask = ตารางทึบหยาบ (จางเมื่อผู้เล่นอยู่หลัง)\n"
          "//   sh = เงาบนพื้น (แบบ A วาดลงผ้าใบพื้น) • s = สเกลวาด (ภาพ 80 px/ม. → 40)\n"
          f"const BLD_BAKE = {json.dumps({'s': s, 'list': out}, separators=(',', ':'), ensure_ascii=False)};\n")
    open(os.path.join(ROOT, 'js', 'bake_data_eldheim_bld.js'), 'w').write(js)
    print('เขียน js/bake_data_eldheim_bld.js')
    manifest()


if __name__ == '__main__':
    a = sys.argv
    arg = lambda k, dflt: a[a.index(k) + 1] if k in a else dflt
    if '--extract' in a: extract()
    elif '--install' in a: install(a[a.index('--install') + 1])
    elif '--render' in a:
        only = arg('--only', '').split(',') if '--only' in a else None
        render(int(arg('--samples', 32)), arg('--out', '/tmp/bld3d'), only, '--preview' in a)
    else: print(__doc__)
