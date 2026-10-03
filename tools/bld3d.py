"""ชุดอาคาร 3D ของ Neo Eldheim: หอคอย CENTRAL CORE + ร้านค้า 4 ร้าน (docs/RENDER3D_PLAN.md ข้อ #7 + #14) — โมเดลด้วย bpy แล้วอบเป็นสไปรต์ 2D แบบ B

สไตล์ (เจ้าของเลือก 2026-10-03): "งาน premium 3D กลิ่นอาย Ragnarok" — สว่าง อุ่น สีอิ่ม สัดส่วนอ้วนน่ารัก เส้นขอบ Freestyle สะอาด (ไม่ใช้ Kuwahara)
  ชุดวัสดุเดียวกับงานอบในเมือง (tools/gate3d.py ชุด town, tools/fountain3d.py, tools/bifrost3d.py, tools/town3d.py):
  หินอ่อนขาวก้อนใหญ่ + ทอง + เหล็กดำ + รูนเรืองฟ้า #5fd4ff • หลังคากระเบื้องสีตามร้าน (สีป้ายเดิม b.roof) • หน้าต่าง/ประตูเรืองไฟอุ่น
อาคาร (ฐานภาพ = ฐานชนพอดี ไม่มีกำแพงล่องหน • ประตูหันใต้ = หันหากล้อง):
  CENTRAL CORE (castle 11×7 ช่อง ที่ 15,2): อาคารขั้นบันได — โถงหลังเตี้ย, ป้อมกลม 2 ข้างหลังคากรวยฟ้า, ตึกกลางมีประตูโค้งใหญ่เรืองฟ้า
      + ป้าย CENTRAL CORE เหนือประตู, แกนพลังงาน/คริสตัลฟ้าบนยอดตึกกลางค่อนไปด้านหน้า (ยอด 8.3 ม. — งบความสูงที่กล้องเห็นจริง ดูด้านล่าง)
  ร้าน 8×6 ช่อง: ฐานยกหินอ่อนเต็มฐานชน + ระเบียงหน้าร้าน + ตัวร้านหลังคาจั่วขวาง + จั่วหน้าเหนือประตู (ป้ายชื่อร้านบนหน้าจั่ว)
      คลองตะวันตก/ตะวันออกลอดใต้ร้าน (js/maps.js genTown) → ฐานด้านหน้ามีซุ้มโค้งน้ำลอด (ต่อจากปากอุโมงค์ในพื้นเมืองอบ tools/town3d.py)
      ประตูอยู่อีกฝั่งของคลอง (NPC ร้านยืนระหว่างคลองกับประตู)
    SUPPLY  กันสาดลายทาง ลังไม้ ตะกร้าผลไม้/ขนมปัง ขวดยา • ARMORY ผนังโล่กลม ราวเกราะ (หุ่นใส่เกราะ) ชั้นวางหอก/ดาบ
    PLATING อ่างชุบแก้วเรืองเขียว #5aff9a + ท่อ • FORGE ปล่องไฟหิน เตาเปิดเรืองส้ม ทั่ง ถังชุบน้ำ แท่งโลหะ
งบความสูงหอคอย: เมืองมี skyMargin 7 (กล้องเลื่อนเหนือขอบบนได้) แต่กล้องยกได้ไม่เกิน 24% ของจอ (js/render.js updateCamera)
  → จอคอม 1280×720 (ซูม 1.8) ยืนหน้าประตู (y 9.6) ขอบบนจอ = −24 px โลก → ยอดคริสตัล (y แมพ 6.4) สูง 8.3 ม. พอดีขอบบนจอ • มือถือ (ซูม 1.2) เห็นทั้งหมด
แสง: sun ซ้ายบน z = −135° (เงาตกขวาล่าง เหมือนทั้งเกม) + fill อุ่น + ฟ้า (ชุดเมือง) • กล้อง = กล้องเกม (ออร์โธ เอียง acos(0.76) yaw 0)
ผลลัพธ์: สไปรต์ B 80 px/ม. (เรนเดอร์ ×2 แล้วย่อ — เกมวาด ×0.5) + เงาบนพื้น (shadow catcher, แบบ A 40 px/ม. ยืด ×1/0.76)
  meta: จุดยึด = กลางขอบหน้าฐาน (พื้น) • ป้าย (ตำแหน่ง/ความกว้าง px) • glows = จุดเรืองกะพริบ (เตา/อ่าง/คริสตัล) • mask = ตารางทึบหยาบ (จางเมื่ออยู่หลัง)
ผังช่อง: ดึงจากเกมจริง (Playwright) → tools/bld3d_tiles.json • hash ผังช่องในกรอบของแต่ละอาคาร (รวมคลองหน้าร้าน) — ไม่ตรงแม้หลังเดียว
  = เกมใช้ภาพวาดเดิมทั้งชุด + console.warn ครั้งเดียว (js/bake.js Bake.bld) • ปิดทั้งชุดด้วยมือ: BUILDING_3D = false ใน js/maps.js

ใช้:
  python3 tools/bld3d.py --extract                          (ต้องมี node + playwright) → tools/bld3d_tiles.json
  /tmp/bvenv/bin/python tools/bld3d.py --render [--only core,supply,armory,plating,forge] [--samples 32] [--preview] [--out /tmp/bld3d]
      (BTHREADS=n แบ่ง CPU กับงานเรนเดอร์อื่น)
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
def scene_setup():
    import bpy
    import gate3d as GT
    sc, so = GT.scene('town')
    # สีอิ่มแบบภาพวาด (Ragnarok): Standard แทน AgX (AgX ดึงสีหลังคา/ไฟเรืองให้ซีด) — แบบน้ำพุ tools/fountain3d.py
    try: sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    except Exception: pass
    sc.view_settings.exposure = float(os.environ.get('BEXP', -0.15))
    sc.cycles.max_bounces = 6
    sc.cycles.sample_clamp_indirect = 1.5; sc.cycles.sample_clamp_direct = 8.0; sc.cycles.blur_glossy = 1.0   # กันจุดวาบบนทอง
    sc.render.use_persistent_data = True
    if os.environ.get('BTHREADS'): sc.render.threads_mode = 'FIXED'; sc.render.threads = int(os.environ['BTHREADS'])
    w = sc.world.node_tree.nodes['Background']; w.inputs['Color'].default_value = (0.60, 0.68, 0.82, 1); w.inputs['Strength'].default_value = 0.7
    # หน้าอาคารหันใต้ = ด้านหลังแดด (แดดมาจากซ้ายบน/ตะวันตกเฉียงเหนือ) → เติม fill อุ่นจากหน้า-ซ้าย (ฝั่งกล้อง) ให้หน้าร้านมีมิติ ไม่แบน
    bpy.data.objects['fill'].data.energy = float(os.environ.get('BFILL', 1.6))
    so.data.energy = float(os.environ.get('BSUN', 3.6))
    return sc, so


def materials():
    import bpy
    import gate3d as GT
    GM = GT.materials('town')

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

    def coords(nt, sx=1.0, sz=1.0, floor=False):
        """พิกัดผนัง/หลังคา: (x + y, z) — ลายวิ่งตามแนวนอนได้ทั้งผนังหันใต้และผนังข้าง • floor = ผิวหงาย (พื้นระเบียง) ใช้ (x, y) แทน"""
        tc = nt.nodes.new('ShaderNodeTexCoord'); sp = nt.nodes.new('ShaderNodeSeparateXYZ'); L(nt, tc.outputs['Object'], sp.inputs[0])
        ad = nt.nodes.new('ShaderNodeMath'); ad.operation = 'ADD'; L(nt, sp.outputs['X'], ad.inputs[0]); L(nt, sp.outputs['Y'], ad.inputs[1])
        mx = nt.nodes.new('ShaderNodeMath'); mx.operation = 'MULTIPLY'; mx.inputs[1].default_value = sx; L(nt, ad.outputs[0], mx.inputs[0])
        mz = nt.nodes.new('ShaderNodeMath'); mz.operation = 'MULTIPLY'; mz.inputs[1].default_value = sz; L(nt, sp.outputs['Z'], mz.inputs[0])
        cb = nt.nodes.new('ShaderNodeCombineXYZ'); L(nt, mx.outputs[0], cb.inputs['X']); L(nt, mz.outputs[0], cb.inputs['Y'])
        if not floor: return cb.outputs[0], tc
        ge = nt.nodes.new('ShaderNodeNewGeometry'); sn = nt.nodes.new('ShaderNodeSeparateXYZ'); L(nt, ge.outputs['Normal'], sn.inputs[0])
        ab = nt.nodes.new('ShaderNodeMath'); ab.operation = 'ABSOLUTE'; L(nt, sn.outputs['Z'], ab.inputs[0])
        st = nt.nodes.new('ShaderNodeMath'); st.operation = 'GREATER_THAN'; st.inputs[1].default_value = 0.6; L(nt, ab.outputs[0], st.inputs[0])
        mv = nt.nodes.new('ShaderNodeMix'); mv.data_type = 'VECTOR'; L(nt, st.outputs[0], mv.inputs['Factor'])
        L(nt, cb.outputs[0], mv.inputs[4]); L(nt, tc.outputs['Object'], mv.inputs[5])
        return mv.outputs[1], tc

    def ashlar(name, c1, c2, mortar, bw=0.62, rh=0.31, rough=0.45):
        """หินก้อนใหญ่เรียงแบบอิฐ (ผนังหินอ่อน/ฐาน) — ร่องปูนจริงด้วย bump • ผิวหงายเป็นแผ่นพื้น"""
        m, nt, b = new(name)
        v, tc = coords(nt, floor=True)
        br = nt.nodes.new('ShaderNodeTexBrick'); br.offset = 0.5; br.squash = 1.0
        br.inputs['Color1'].default_value = (*c1, 1); br.inputs['Color2'].default_value = (*c2, 1); br.inputs['Mortar'].default_value = (*mortar, 1)
        br.inputs['Scale'].default_value = 1.0; br.inputs['Mortar Size'].default_value = 0.022; br.inputs['Mortar Smooth'].default_value = 0.4
        br.inputs['Brick Width'].default_value = bw; br.inputs['Row Height'].default_value = rh; br.inputs['Bias'].default_value = 0.0
        L(nt, v, br.inputs['Vector'])
        nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 1.4; nz.inputs['Detail'].default_value = 6; nz.inputs['Distortion'].default_value = 3.0
        L(nt, tc.outputs['Object'], nz.inputs['Vector'])
        col = mix(nt, br.outputs['Color'], (1.0, 0.985, 0.95), nz.outputs['Fac'], 'MULTIPLY')
        col = mix(nt, br.outputs['Color'], col, 0.45)
        L(nt, col, b.inputs['Base Color']); b.inputs['Roughness'].default_value = rough
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.55; bp.inputs['Distance'].default_value = 0.02
        L(nt, br.outputs['Fac'], bp.inputs['Height']); L(nt, bp.outputs['Normal'], b.inputs['Normal'])
        return m

    def roof(name, col, course=0.16):
        """กระเบื้องหลังคาสีตามร้าน: แถวกระเบื้องตามแนวนอน (z) • ในแต่ละแถวไล่เข้มขึ้นด้านบน (เงาแถวที่ทับ) → อ่านเป็นแผ่นกระเบื้องซ้อน
        • สีต่างกันทีละแผ่น + เข้มลงตรงชายคา (z ต่ำ) แบบภาพวาด"""
        m, nt, b = new(name)
        v, tc = coords(nt, 1.0, 1.0)
        br = nt.nodes.new('ShaderNodeTexBrick'); br.offset = 0.5
        c1 = tuple(min(1, c * 1.12) for c in col); c2 = tuple(c * 0.8 for c in col); mo = tuple(c * 0.3 for c in col)
        br.inputs['Color1'].default_value = (*c1, 1); br.inputs['Color2'].default_value = (*c2, 1); br.inputs['Mortar'].default_value = (*mo, 1)
        br.inputs['Scale'].default_value = 1.0; br.inputs['Mortar Size'].default_value = 0.012; br.inputs['Mortar Smooth'].default_value = 0.3
        br.inputs['Brick Width'].default_value = 0.3; br.inputs['Row Height'].default_value = course; br.inputs['Bias'].default_value = 0.0
        L(nt, v, br.inputs['Vector'])
        sp = nt.nodes.new('ShaderNodeSeparateXYZ'); L(nt, v, sp.inputs[0])
        dv = nt.nodes.new('ShaderNodeMath'); dv.operation = 'DIVIDE'; dv.inputs[1].default_value = course; L(nt, sp.outputs['Y'], dv.inputs[0])
        fr = nt.nodes.new('ShaderNodeMath'); fr.operation = 'FRACT'; L(nt, dv.outputs[0], fr.inputs[0])
        rp = nt.nodes.new('ShaderNodeValToRGB'); el = rp.color_ramp.elements
        el[0].position, el[0].color = 0.0, (1.12, 1.12, 1.12, 1); el[1].position, el[1].color = 1.0, (0.55, 0.55, 0.55, 1)
        e = el.new(0.7); e.color = (0.95, 0.95, 0.95, 1)
        L(nt, fr.outputs[0], rp.inputs['Fac'])
        col_ = mix(nt, br.outputs['Color'], rp.outputs['Color'], 1.0, 'MULTIPLY')
        nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.8; nz.inputs['Detail'].default_value = 3
        L(nt, tc.outputs['Object'], nz.inputs['Vector'])
        col_ = mix(nt, col_, (1.0, 0.92, 0.85), nz.outputs['Fac'], 'MULTIPLY')
        L(nt, col_, b.inputs['Base Color']); b.inputs['Roughness'].default_value = 0.4
        try: b.inputs['Coat Weight'].default_value = 0.3
        except Exception: pass
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.6; bp.inputs['Distance'].default_value = 0.03
        ad = nt.nodes.new('ShaderNodeMath'); ad.operation = 'MULTIPLY'; L(nt, fr.outputs[0], ad.inputs[0]); L(nt, br.outputs['Fac'], ad.inputs[1])
        L(nt, ad.outputs[0], bp.inputs['Height']); L(nt, bp.outputs['Normal'], b.inputs['Normal'])
        return m

    def plain(name, col, rough=0.5, metal=0.0, emit=None, es=0.0, coat=0.0):
        m, nt, b = new(name)
        b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
        if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = es
        if coat:
            try: b.inputs['Coat Weight'].default_value = coat
            except Exception: pass
        return m

    def wood(name, c0, c1, scale=6.0):
        m, nt, b = new(name)
        tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1.0, 1.0, 9.0)
        L(nt, tc.outputs['Object'], mp.inputs['Vector'])
        wv = nt.nodes.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.inputs['Scale'].default_value = scale; wv.inputs['Distortion'].default_value = 6.0
        wv.inputs['Detail'].default_value = 3; L(nt, mp.outputs['Vector'], wv.inputs['Vector'])
        r = nt.nodes.new('ShaderNodeValToRGB'); r.color_ramp.elements[0].color = (*c0, 1); r.color_ramp.elements[1].color = (*c1, 1)
        L(nt, wv.outputs['Fac'], r.inputs['Fac']); L(nt, r.outputs['Color'], b.inputs['Base Color'])
        b.inputs['Roughness'].default_value = 0.7
        return m

    def emit(name, col, strength):
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
        nt.nodes.remove(nt.nodes['Principled BSDF'])
        e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*col, 1); e.inputs['Strength'].default_value = strength
        L(nt, e.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
        return m

    def glow_grad(name, c_in, c_out, strength):
        """ช่องเรืองไฟ (ประตู/หน้าต่าง/เตา): กลางสว่าง ขอบเข้ม (ไล่ตามมุมมอง) — ไม่ขาวโพลนทั้งแผ่น"""
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
        nt.nodes.remove(nt.nodes['Principled BSDF'])
        tc = nt.nodes.new('ShaderNodeTexCoord'); gr = nt.nodes.new('ShaderNodeTexGradient'); gr.gradient_type = 'SPHERICAL'
        sub = nt.nodes.new('ShaderNodeVectorMath'); sub.operation = 'SUBTRACT'; sub.inputs[1].default_value = (0.5, 0.5, 0.5)
        L(nt, tc.outputs['Generated'], sub.inputs[0])
        sc_ = nt.nodes.new('ShaderNodeVectorMath'); sc_.operation = 'SCALE'; sc_.inputs['Scale'].default_value = 1.7; L(nt, sub.outputs[0], sc_.inputs[0])
        L(nt, sc_.outputs[0], gr.inputs['Vector'])
        r = nt.nodes.new('ShaderNodeValToRGB'); r.color_ramp.elements[0].color = (*c_out, 1); r.color_ramp.elements[1].color = (*c_in, 1)
        L(nt, gr.outputs['Fac'], r.inputs['Fac'])
        e = nt.nodes.new('ShaderNodeEmission'); L(nt, r.outputs['Color'], e.inputs['Color']); e.inputs['Strength'].default_value = strength
        L(nt, e.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
        return m

    def stripes(name, c0, c1, n=10.0):
        """ผ้ากันสาดลายทางตั้ง (สีร้าน/ครีม)"""
        m, nt, b = new(name)
        tc = nt.nodes.new('ShaderNodeTexCoord'); sp = nt.nodes.new('ShaderNodeSeparateXYZ'); L(nt, tc.outputs['Object'], sp.inputs[0])
        mm = nt.nodes.new('ShaderNodeMath'); mm.operation = 'MULTIPLY'; mm.inputs[1].default_value = n / 2; L(nt, sp.outputs['X'], mm.inputs[0])
        fr = nt.nodes.new('ShaderNodeMath'); fr.operation = 'FRACT'; L(nt, mm.outputs[0], fr.inputs[0])
        gt = nt.nodes.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = 0.5; L(nt, fr.outputs[0], gt.inputs[0])
        L(nt, mix(nt, c0, c1, gt.outputs[0]), b.inputs['Base Color']); b.inputs['Roughness'].default_value = 0.75
        try: b.inputs['Sheen Weight'].default_value = 0.4
        except Exception: pass
        return m

    M = {
        'marble': GM['stone'],                                        # หินอ่อนขาวลายเส้น (ชุดเดียวกับซุ้มประตูเมือง)
        'gold': GM['trim'], 'rune': GM['rune'],
        'wall': ashlar('wall', (0.86, 0.84, 0.80), (0.80, 0.78, 0.75), (0.56, 0.55, 0.56)),
        'wallw': ashlar('wallw', (0.90, 0.83, 0.69), (0.84, 0.76, 0.62), (0.52, 0.45, 0.38)),     # หินครีมอุ่น (ร้าน — โทน Ragnarok)
        'base': ashlar('base', (0.62, 0.64, 0.70), (0.55, 0.57, 0.64), (0.30, 0.31, 0.36), bw=0.9, rh=0.36, rough=0.6),
        'iron': plain('iron', (0.10, 0.115, 0.15), 0.38, 0.85),
        'ironl': plain('ironl', (0.36, 0.40, 0.48), 0.32, 0.9),        # เหล็กเงา (เกราะ/ทั่ว)
        'wood': wood('wood', (0.25, 0.12, 0.05), (0.45, 0.24, 0.10)),
        'woodl': wood('woodl', (0.48, 0.30, 0.13), (0.68, 0.46, 0.22), 8.0),
        'dark': plain('dark', (0.012, 0.016, 0.026), 0.9),
        'water': plain('water', (0.02, 0.16, 0.34), 0.15, emit=(0.02, 0.2, 0.42), es=0.25),
        'warm': glow_grad('warm', (1.0, 0.80, 0.42), (0.85, 0.32, 0.06), 3.2),     # ไฟอุ่นในร้าน
        'cyan': glow_grad('cyan', (0.75, 0.97, 1.0), (0.08, 0.50, 1.0), 4.0),       # ประตูหอคอย
        'fire': glow_grad('fire', (1.0, 0.86, 0.45), (1.0, 0.25, 0.02), 6.0),       # เตาหลอม
        'green': glow_grad('green', (0.55, 1.0, 0.68), (0.06, 0.75, 0.30), 2.2),    # น้ำยาชุบ #5aff9a
        'glass': plain('glass', (0.55, 0.85, 0.9), 0.05, coat=0.6),
        'red': plain('red', (0.70, 0.06, 0.05), 0.4, coat=0.3), 'blue': plain('blue', (0.05, 0.20, 0.65), 0.4, coat=0.3),
        'cream': plain('cream', (0.92, 0.84, 0.66), 0.6), 'leather': plain('leather', (0.36, 0.18, 0.08), 0.6),
        'green_l': plain('green_l', (0.20, 0.55, 0.12), 0.6), 'apple': plain('apple', (0.75, 0.06, 0.04), 0.3, coat=0.5),
        'bread': plain('bread', (0.78, 0.48, 0.18), 0.7), 'coal': plain('coal', (0.04, 0.035, 0.03), 0.8),
        'plaque': plain('plaque', (0.035, 0.05, 0.09), 0.35, 0.3),     # แผ่นป้ายเข้ม (เกมเขียนชื่อทับ)
    }
    M['roof_core'] = roof('roof_core', (0.06, 0.32, 0.80))
    for k, (key, col, _) in BLD.items():
        if col: M['roof_' + key] = roof('roof_' + key, col)
    M['awning'] = stripes('awning', (0.82, 0.10, 0.16), (0.95, 0.90, 0.80))
    M['crystal'] = crystal_mat('crystal', (0.10, 0.62, 1.0), 1.7)
    return M


def crystal_mat(name, col, strength):
    """คริสตัลเรือง: เงาแก้ว + เรืองไล่ตามมุมมอง (กลางฟ้าเข้มอิ่ม ขอบฟ้าสว่าง) — ไม่ซีดขาวภายใต้ Standard view"""
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
        self.n = 0

    def _obj(self, bm, mat, smooth=False, name=None):
        import bpy
        self.n += 1
        me = bpy.data.meshes.new(name or f'm{self.n}'); bm.to_mesh(me); bm.free()
        if smooth:
            for p in me.polygons: p.use_smooth = True
        o = bpy.data.objects.new(name or f'o{self.n}', me)
        o.data.materials.append(self.M[mat] if isinstance(mat, str) else mat)
        self.coll.objects.link(o)
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
        o = bpy.data.objects.new(f'cu{self.n}', cu); o.data.materials.append(self.M[mat]); self.coll.objects.link(o)
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


# ============================================================
#  อาคาร (พิกัดท้องถิ่น: (0,0,0) = กลางขอบหน้าฐานบนพื้น = จุดยึด • x ตะวันออก • y เหนือ (เข้าไปในอาคาร) • z ขึ้น)
#  ทุกชิ้นอยู่ในฐานชน x ∈ [−W/2, W/2], y ∈ [0, D] (ยกเว้นซุ้มน้ำลอดต่ำกว่าพื้นในช่วงคลอง)
#  คืน info: {'label': (จุด 3D กลางป้าย, กว้าง ม.), 'glows': [(จุด 3D, รัศมี ม., 'r,g,b', ชนิด)]}
# ============================================================
def _rx90():
    from mathutils import Matrix
    return Matrix.Rotation(math.pi / 2, 3, 'X')


def _ry90(s):
    from mathutils import Matrix
    return Matrix.Rotation(s * math.pi / 2, 3, 'Y')


def lantern(k, x, y, z):
    """โคมเหล็กติดผนัง (แขนยื่น + กล่องแก้วเรืองฟ้าแบบเสาไฟเมือง) — คืนจุดกลางโคม"""
    k.curve('iron', [[(x, y + 0.02, z + 0.42, 0.025), (x, y - 0.22, z + 0.48, 0.025), (x, y - 0.26, z + 0.36, 0.02)]])
    k.box('iron', x - 0.11, x + 0.11, y - 0.37, y - 0.15, z + 0.27, z + 0.31)
    k.box('rune', x - 0.08, x + 0.08, y - 0.34, y - 0.18, z + 0.04, z + 0.27)
    k.box('iron', x - 0.11, x + 0.11, y - 0.37, y - 0.15, z, z + 0.05)
    k.cyl('gold', x, y - 0.26, 0.05, z + 0.31, z + 0.4, 12, r2=0.0)
    return (x, y - 0.26, z + 0.16)


def crate(k, x, y, z, s=0.5, mat='woodl'):
    """ลังไม้ขอบเหล็ก (ขนาด s ม.)"""
    h = s / 2
    k.box(mat, x - h, x + h, y - h, y + h, z, z + s * 0.9, bevel=0.015)
    for a in (-1, 1):
        k.box('iron', x - h - 0.01, x + h + 0.01, y + a * (h - 0.04) - 0.025, y + a * (h - 0.04) + 0.025, z, z + s * 0.9 + 0.005)
    k.box('wood', x - h - 0.008, x + h + 0.008, y - 0.03, y + 0.03, z + 0.02, z + s * 0.9 - 0.02)


def barrel(k, x, y, z, r=0.26, h=0.62, lid='wood'):
    k.cyl('wood', x, y, r * 0.9, z, z + h * 0.5, 20, r2=r)
    k.cyl('wood', x, y, r, z + h * 0.5, z + h, 20, r2=r * 0.9)
    for zz in (0.12, 0.5, 0.88):
        rr = r * (0.94 if zz != 0.5 else 1.0) + 0.012
        k.cyl('iron', x, y, rr, z + h * zz - 0.025, z + h * zz + 0.025, 20)
    k.cyl(lid, x, y, r * 0.86, z + h - 0.01, z + h + 0.015, 20)


def plaque(k, cx, y, z0, z1, pw, knob='gold'):
    """แผ่นป้ายเข้มขอบทอง (หันใต้) — เกมเขียนชื่ออาคารทับ (ตัวหนังสืออ่านง่ายทุกระดับซูม)"""
    k.box('plaque', cx - pw / 2, cx + pw / 2, y, y + 0.1, z0, z1, bevel=0.02)
    e = [(cx - pw / 2, z0), (cx + pw / 2, z0), (cx + pw / 2, z1), (cx - pw / 2, z1)]
    k.curve('gold', [[(e[i][0], y, e[i][1], 0.032), (e[(i + 1) % 4][0], y, e[(i + 1) % 4][1], 0.032)] for i in range(4)])
    for s in (-1, 1): k.sphere(knob, cx + s * (pw / 2 + 0.05), y, (z0 + z1) / 2, 0.07)


def podium(k, W, D, pz, door, canals, steps=3):
    """ฐานยกหินเต็มฐานชน + บันไดหน้าประตู + ซุ้มน้ำลอด (ช่วงคลอง — ต่ำกว่าพื้นถึงผิวน้ำ ต่อจากปากอุโมงค์ในพื้นเมืองอบ)"""
    hw = W / 2
    pd = k.box('base', -hw, hw, 0, D, 0, pz, bevel=0.025)
    blocks = [pd]
    for c0, c1 in canals:
        blocks.append(k.box('base', c0, c1, 0, 0.4, -0.95, 0.002))   # หน้าผนังคลองใต้ฐาน (เฉพาะช่วงคลอง — ไม่ทับพื้นเดินได้)
    for c0, c1 in canals:
        a0, a1 = c0 + 0.1, c1 - 0.1
        zs = -0.16; rise = min(pz - 0.12 - zs, (a1 - a0) / 2)
        cut = k.arch_cutter(a0, a1, -1.2, zs, -0.3, D + 0.3, rise)
        for b in blocks: k.cut(b, cut)
        k.box('water', a0, a1, 0.0, D, Z_WATER - 0.05, Z_WATER)
        k.box('dark', a0, a1, D - 0.05, D, Z_WATER, pz)                 # ปลายอุโมงค์มืด
        m = (a0 + a1) / 2
        k.arch_trim('marble', m, 0.0, a1 - a0, zs, rise, r=0.07)
        k.arch_trim('gold', m, -0.06, a1 - a0 + 0.2, zs, rise + 0.1, r=0.025)
        k.box('marble', m - 0.11, m + 0.11, -0.1, 0.02, zs + rise - 0.06, pz + 0.01, bevel=0.015, taper=(1.25, 1.0))   # หินหัวโค้ง
        k.box('rune', m - 0.04, m + 0.04, -0.112, -0.1, zs + rise + 0.02, pz - 0.06)
    k.box('gold', -hw, hw, -0.012, 0.01, pz - 0.075, pz - 0.045)      # แถบทองตามขอบหน้าฐาน
    if door is not None:
        dx, dw = door
        notch = k.box('dark', dx - dw / 2, dx + dw / 2, -0.3, steps * 0.24, -0.1, pz + 0.2); notch.hide_render = True; k.cutters.append(notch)
        for b in blocks: k.cut(b, notch)
        for i in range(steps):
            k.box('marble', dx - dw / 2, dx + dw / 2, i * 0.24, steps * 0.24 + 0.02, 0, pz * (i + 1) / steps, bevel=0.02)
        for s in (-1, 1):   # แก้มบันได (หินฐาน) + ลูกแก้วทอง
            x = dx + s * (dw / 2 + 0.11)
            k.box('base', x - 0.11, x + 0.11, 0.0, steps * 0.24 + 0.05, 0, pz + 0.12, bevel=0.02)
            k.sphere('gold', x, 0.12, pz + 0.2, 0.08)
    return blocks


def shop(k, spec):
    """ร้าน 8×6: ฐานยก + ระเบียงหน้า + ตัวร้าน (หลังคาจั่วขวาง + จั่วหน้าเหนือประตู) + ของประดับตามชนิด"""
    kind = spec['kind']; W, D = spec['w'], spec['h']; hw = W / 2
    canals = spec['canals']; cmid = sum((a + b) / 2 for a, b in canals) / len(canals) if canals else -1
    side = -1 if cmid < 0 else 1                 # ฝั่งคลอง (−1 = ครึ่งตะวันตกของร้าน)
    DX = -side * 2.0                              # ประตูอยู่อีกฝั่งของคลอง (NPC ร้านยืนระหว่างกลาง)
    PZ = 0.45; FY = 1.3; BY = D - 0.2; EZ = 3.25; RZ = 6.2
    info = {'glows': []}
    podium(k, W, D, PZ, (DX, 1.7), canals)
    # ---- ตัวร้าน
    wl = k.box('wallw', -hw + 0.25, hw - 0.25, FY, BY, PZ, EZ)
    k.box('base', -hw + 0.2, hw - 0.2, FY - 0.05, BY + 0.05, PZ, PZ + 0.42, bevel=0.02)          # ฐานผนังหินเข้ม
    for s in (-1, 1):                                                                         # เสามุมหินอ่อน + หัวทอง
        x = s * (hw - 0.4)
        k.box('marble', x - 0.2, x + 0.2, FY - 0.1, FY + 0.25, PZ, EZ - 0.05, bevel=0.025)
        k.box('gold', x - 0.23, x + 0.23, FY - 0.13, FY + 0.28, EZ - 0.25, EZ - 0.1, bevel=0.01)
        k.box('marble', x - 0.2, x + 0.2, BY - 0.25, BY + 0.05, PZ, EZ - 0.05, bevel=0.025)
    k.box('iron', -hw + 0.25, hw - 0.25, FY - 0.06, FY, EZ - 0.42, EZ - 0.3)                    # คานเหล็กใต้ชายคา
    k.box('rune', -hw + 0.6, hw - 0.6, FY - 0.07, FY - 0.055, EZ - 0.39, EZ - 0.33)            # เส้นรูนเรืองฟ้า
    k.box('gold', -hw + 0.25, hw - 0.25, FY - 0.04, FY, 1.95, 2.02)                             # แถบทองกลางผนัง
    # ประตูโค้ง (ไฟอุ่นข้างใน) + บานเปิด + กรอบเหล็ก/ทอง
    dw, dz = 1.36, PZ + 1.42
    k.cut(wl, k.arch_cutter(DX - dw / 2, DX + dw / 2, PZ - 0.05, dz, FY - 0.2, FY + 0.32))
    k.box('warm', DX - dw / 2, DX + dw / 2, FY + 0.28, FY + 0.32, PZ, dz + dw / 2)
    k.box('wood', DX - dw / 2 - 0.02, DX - dw / 2 + 0.22, FY + 0.05, FY + 0.12, PZ, dz + 0.3)
    k.box('wood', DX + dw / 2 - 0.22, DX + dw / 2 + 0.02, FY + 0.05, FY + 0.12, PZ, dz + 0.3)
    k.arch_trim('iron', DX, FY, dw + 0.08, dz, dw / 2 + 0.04, r=0.075, z0=PZ)
    k.arch_trim('gold', DX, FY - 0.07, dw + 0.3, dz, dw / 2 + 0.15, r=0.035, keystone='marble')
    info['glows'].append(((DX, FY, PZ + 1.0), 0.9, '255,190,110', 'warm'))
    # หน้าต่างร้านฝั่งคลอง (ไฟอุ่น + ซี่เหล็ก)
    wx0, wx1 = (-hw + 0.75, -0.75) if side < 0 else (0.75, hw - 0.75)
    wz0, wz1 = PZ + 0.75, PZ + 1.85
    if kind not in ('forge', 'armory'):
        k.cut(wl, k.arch_cutter(wx0, wx1, wz0, wz1 - 0.3, FY - 0.2, FY + 0.25, 0.3))
        k.box('warm', wx0, wx1, FY + 0.2, FY + 0.25, wz0, wz1)
        nm = max(2, round((wx1 - wx0) / 0.7))
        for i in range(1, nm):
            x = wx0 + (wx1 - wx0) * i / nm
            k.box('iron', x - 0.025, x + 0.025, FY - 0.01, FY + 0.03, wz0, wz1)
        k.box('iron', wx0, wx1, FY - 0.01, FY + 0.03, wz0 + 0.5, wz0 + 0.55)
        k.arch_trim('gold', (wx0 + wx1) / 2, FY - 0.02, wx1 - wx0, wz1 - 0.3, 0.3, r=0.03)
        info['glows'].append((((wx0 + wx1) / 2, FY, (wz0 + wz1) / 2), 1.0, '255,190,110', 'warm'))
    k.box('marble', wx0 - 0.1, wx1 + 0.1, FY - 0.14, FY + 0.05, wz0 - 0.12, wz0, bevel=0.015)     # ขอบหน้าต่าง
    # ---- หลังคาจั่วใหญ่หันหน้าใต้ (สันเหนือ-ใต้) แบบบ้านยาวนอร์ส: ลาดตะวันตกรับแดด ลาดตะวันออกเป็นเงา → มีมิติ
    roof = 'roof_' + kind
    ry0, ry1 = FY - 0.5, BY + 0.15
    k.gable_roof(roof, -hw + 0.02, hw - 0.02, ry0, ry1, EZ - 0.05, RZ, 'y', t=0.16)
    TY, tz0 = FY - 0.1, EZ - 0.25
    for y, d in ((TY, 0.3), (BY - 0.3, 0.3)):   # ผนังสามเหลี่ยมหน้า/หลังจั่ว
        k.poly('wallw', [(-hw + 0.3, y, tz0), (hw - 0.3, y, tz0), (0, y, RZ - 0.3)], depth=d)
    # โครงไม้บนหน้าจั่ว (คานผูก + เสาดั้ง + ค้ำยันทแยง)
    yb = TY - 0.05
    k.box('wood', -hw + 0.3, hw - 0.3, yb - 0.04, yb + 0.02, tz0 - 0.04, tz0 + 0.16)
    k.box('wood', -0.08, 0.08, yb - 0.04, yb + 0.02, tz0 + 0.16, RZ - 0.4)
    for s in (-1, 1):
        k.curve('wood', [[(s * 0.1, yb - 0.01, tz0 + 1.75, 0.055), (s * 2.1, yb - 0.01, tz0 + 0.2, 0.055)]], res=1)
    # วงรูนกลางจั่ว (เหนือป้าย)
    oz = tz0 + 1.75
    k.torus('gold', 0.36, 0.04, loc=(0, TY - 0.07, oz), rot=_rx90())
    k.cyl('rune', 0, TY - 0.04, 0.32, 0.0, 0.01, 28, rot=_rx90()).location = (0, 0, oz)
    # ไม้ปั้นลมไขว้ ปลายเป็นเขาโค้ง + ลูกแก้วทอง (หน้า + หลัง)
    for yy in (ry0 - 0.06, ry1 + 0.06):
        for s in (-1, 1):
            x0 = s * (hw + 0.02)
            k.curve('wood', [[(x0, yy, EZ - 0.15, 0.085), (0, yy, RZ + 0.03, 0.085), (-s * 0.4, yy, RZ + 0.44, 0.07),
                              (-s * 0.52, yy, RZ + 0.78, 0.055), (-s * 0.36, yy, RZ + 0.95, 0.04)]])
            k.sphere('gold', -s * 0.35, yy, RZ + 0.95, 0.07)
    # ป้ายชื่อร้าน (เกมเขียนชื่อทับ) ล่างหน้าจั่ว
    pw, pz0, pz1 = 2.6, tz0 + 0.3, tz0 + 0.92
    plaque(k, 0, TY - 0.2, pz0, pz1, pw)
    info['label'] = ((0, TY - 0.21, (pz0 + pz1) / 2), pw - 0.2)
    # โคมข้างประตู
    for s in (-1, 1):
        info['glows'].append((lantern(k, DX + s * 1.05, FY, PZ + 1.6), 0.35, '120,220,255', 'lamp'))
    g = dict(wl=wl, W=W, D=D, PZ=PZ, FY=FY, BY=BY, EZ=EZ, RZ=RZ, DX=DX, side=side, wx=(wx0, wx1), wz=(wz0, wz1))
    {'supply': deco_supply, 'armory': deco_armory, 'plating': deco_plating, 'forge': deco_forge}[kind](k, info, g)
    return info


def deco_supply(k, info, g):
    """SUPPLY: กันสาดลายทางเหนือหน้าต่าง + แผงขาย (ตะกร้าแอปเปิล/ขนมปัง ขวดยา) + ลังไม้ ถัง กระสอบ"""
    PZ, FY, side, (wx0, wx1), (wz0, wz1), DX = g['PZ'], g['FY'], g['side'], g['wx'], g['wz'], g['DX']
    ax0, ax1 = wx0 - 0.25, wx1 + 0.25; zt, zb, yb = wz1 + 0.35, wz1 - 0.25, 0.4
    n = 14; V = []; F = []
    for i in range(n + 1):   # แถบผ้า: ขอบบนติดผนัง → ชายหยักด้านหน้า (quad ทีละช่อง ไม่มีเส้นทแยง)
        x = ax0 + (ax1 - ax0) * i / n
        V += [(x, FY - 0.02, zt), (x, yb, zb - (0.12 if i % 2 else 0.0))]
        if i: F.append((2 * i - 2, 2 * i, 2 * i + 1, 2 * i - 1))
    k.mesh('awning', V, F)
    for x in (ax0, ax1):
        k.curve('iron', [[(x, FY, zt - 0.45, 0.025), (x, yb + 0.03, zb + 0.02, 0.025)]])
    k.curve('gold', [[(ax0, yb, zb + 0.01, 0.025), (ax1, yb, zb + 0.01, 0.025)]])
    # แผงขายหน้าหน้าต่าง
    tx0, tx1 = wx0 + 0.3, wx1 - 0.3; cx = (tx0 + tx1) / 2
    k.box('woodl', tx0, tx1, 0.55, 1.05, PZ + 0.62, PZ + 0.7, bevel=0.012)
    for x in (tx0 + 0.06, tx1 - 0.06):
        for y in (0.6, 1.0): k.box('wood', x - 0.03, x + 0.03, y - 0.03, y + 0.03, PZ, PZ + 0.62)
    for bx, food in ((tx0 + 0.3, 'apple'), (tx1 - 0.3, 'bread')):
        k.cyl('woodl', bx, 0.85, 0.2, PZ + 0.7, PZ + 0.86, 16, r2=0.24)
        k.torus('wood', 0.235, 0.02, loc=(bx, 0.85, PZ + 0.86), seg=(24, 6))
        for i in range(7 if food == 'apple' else 4):
            a = i * 2.4; rr = 0.11 * (i > 0)
            if food == 'apple': k.sphere('apple', bx + rr * math.cos(a), 0.85 + rr * math.sin(a), PZ + 0.9 + 0.03 * (i == 0), 0.065)
            else: k.sphere('bread', bx + 0.09 * math.cos(a * 1.3), 0.85 + 0.07 * math.sin(a * 1.3), PZ + 0.9, 0.085, sz=0.6)
    for i, mat in enumerate(('red', 'blue', 'red', 'green_l')):
        x = cx + (i - 1.5) * 0.14
        k.cyl(mat, x, 0.65, 0.045, PZ + 0.7, PZ + 0.8, 12); k.cyl('glass', x, 0.65, 0.018, PZ + 0.8, PZ + 0.86, 8); k.cyl('cream', x, 0.65, 0.02, PZ + 0.86, PZ + 0.89, 8)
    # ลังซ้อน + ถัง ฝั่งคลอง (มุมระเบียง)
    bx = side * 3.25
    crate(k, bx, 0.55, PZ, 0.55); crate(k, bx, 0.55, PZ + 0.5, 0.45, mat='wood'); crate(k, bx - side * 0.62, 0.45, PZ, 0.5)
    barrel(k, bx, 1.05, PZ, 0.24, 0.6)
    # กระสอบ + ตะกร้าข้างประตูฝั่งนอก
    ox = DX - side * 1.6
    for sx, sy, r in ((ox, 0.5, 0.22), (ox - side * 0.36, 0.78, 0.19)):   # กระสอบผูกปาก
        k.cyl('cream', sx, sy, r, PZ, PZ + r * 1.5, 16, r2=r * 0.75)
        k.sphere('cream', sx, sy, PZ + r * 1.5, r * 0.75, sz=0.55)
        k.torus('leather', r * 0.32, 0.025, loc=(sx, sy, PZ + r * 1.85), seg=(16, 5))
        k.cyl('cream', sx, sy, r * 0.3, PZ + r * 1.85, PZ + r * 2.15, 10, r2=r * 0.45)
    k.cyl('woodl', ox + side * 0.05, 0.25, 0.18, PZ, PZ + 0.22, 16, r2=0.22)
    for i in range(5): k.sphere('apple', ox + side * 0.05 + 0.08 * math.cos(i * 1.3), 0.25 + 0.08 * math.sin(i * 1.3), PZ + 0.25, 0.06)


def shield(k, x, y, z, r, col, rim, seed):
    """โล่กลมไวกิ้งหันใต้: หน้าโล่สีพื้น + แฉกสีครีม 2 แฉก + ปุ่มเหล็กกลาง + ขอบโลหะ"""
    rot = _rx90()
    k.cyl(col, x, y + 0.03, r, 0.0, 0.03, 28, rot=rot).location = (0, 0, z)
    a0 = seed * 0.7
    for q in range(2):
        a = a0 + q * math.pi
        V = [(x, y - 0.005, z)] + [(x + r * 0.96 * math.cos(a + t * math.pi / 12), y - 0.005, z + r * 0.96 * math.sin(a + t * math.pi / 12)) for t in range(7)]
        k.mesh('cream' if col != 'cream' else 'red', V, [tuple(range(len(V)))])
    k.torus(rim, r, 0.03, loc=(x, y - 0.01, z), rot=rot, seg=(32, 6))
    k.sphere('ironl', x, y - 0.02, z, r * 0.24)


def armor_stand(k, x, y, z, horns):
    """หุ่นตั้งเกราะ: ฐานไม้ + เสา + เกราะอกเหล็กเงา + บ่าทอง + หมวก (มีเขา)"""
    k.box('wood', x - 0.22, x + 0.22, y - 0.12, y + 0.12, z, z + 0.06, bevel=0.01)
    k.cyl('wood', x, y, 0.035, z + 0.06, z + 0.8, 8)
    k.cyl('ironl', x, y, 0.2, z + 0.75, z + 1.25, 16, r2=0.24)
    k.cyl('ironl', x, y, 0.24, z + 1.25, z + 1.4, 16, r2=0.16)
    k.box('gold', x - 0.21, x + 0.21, y - 0.24, y - 0.18, z + 1.05, z + 1.1)
    k.box('leather', x - 0.21, x + 0.21, y - 0.22, y - 0.17, z + 0.8, z + 0.87)
    for s in (-1, 1): k.sphere('gold', x + s * 0.27, y, z + 1.33, 0.11, sz=0.75)
    k.cyl('ironl', x, y, 0.035, z + 1.4, z + 1.5, 8)
    k.sphere('ironl', x, y, z + 1.6, 0.14, sz=1.05)
    k.box('gold', x - 0.025, x + 0.025, y - 0.15, y - 0.1, z + 1.5, z + 1.72)
    if horns:
        for s in (-1, 1):
            k.curve('cream', [[(x + s * 0.11, y, z + 1.66, 0.035), (x + s * 0.24, y, z + 1.74, 0.025), (x + s * 0.27, y, z + 1.9, 0.012)]])


def deco_armory(k, info, g):
    """ARMORY: ผนังโล่กลมเหนือหน้าต่าง + หุ่นใส่เกราะ 2 ตัว + ชั้นวางหอก/ดาบข้างประตู"""
    PZ, FY, side, (wx0, wx1), (wz0, wz1), DX = g['PZ'], g['FY'], g['side'], g['wx'], g['wz'], g['DX']
    # ผนังโล่ (แทนหน้าต่าง): โล่กลม 2 แถวสลับสี + ขวานไขว้กลาง
    cols = (('red', 'gold'), ('blue', 'ironl'), ('red', 'ironl'), ('blue', 'gold'), ('blue', 'gold'), ('red', 'ironl'))
    for i in range(3):
        x = wx0 + (wx1 - wx0) * (i + 0.5) / 3
        shield(k, x, FY - 0.04, wz1 + 0.12, 0.34, *cols[i], i)
        shield(k, x + (wx1 - wx0) / 6 * (1 if i < 2 else -5), FY - 0.04, wz0 + 0.35, 0.28, *cols[i + 3], i + 3) if i < 2 else None
    armor_stand(k, side * 3.25, 0.6, PZ, True)
    armor_stand(k, side * 2.45, 0.75, PZ, False)
    rx = DX - side * 1.65
    k.box('wood', rx - 0.45, rx + 0.45, 0.35, 0.45, PZ + 0.2, PZ + 0.28)
    k.box('wood', rx - 0.45, rx + 0.45, 0.35, 0.45, PZ + 1.05, PZ + 1.12)
    for s in (-1, 1): k.box('wood', rx + s * 0.45 - 0.04, rx + s * 0.45 + 0.04, 0.33, 0.47, PZ, PZ + 1.3)
    for i in range(4):
        x = rx - 0.3 + i * 0.2
        if i % 2 == 0:   # หอก
            k.cyl('wood', x, 0.4, 0.022, PZ + 0.05, PZ + 1.75, 8)
            k.cyl('ironl', x, 0.4, 0.05, PZ + 1.75, PZ + 1.98, 4, r2=0.0, smooth=False)
        else:            # ดาบ
            k.box('ironl', x - 0.035, x + 0.035, 0.39, 0.41, PZ + 0.35, PZ + 1.2)
            k.box('gold', x - 0.1, x + 0.1, 0.38, 0.42, PZ + 1.2, PZ + 1.24)
            k.box('leather', x - 0.02, x + 0.02, 0.385, 0.415, PZ + 1.24, PZ + 1.42)
            k.sphere('gold', x, 0.4, PZ + 1.44, 0.03)


def deco_plating(k, info, g):
    """PLATING: อ่างชุบแก้วเรืองเขียว 3 ถัง + ท่อเข้าผนัง + ปล่องระบายบนหลังคาเรืองเขียว"""
    PZ, FY, side, (wx0, wx1), (wz0, wz1) = g['PZ'], g['FY'], g['side'], g['wx'], g['wz']
    for i, x in enumerate((wx0 - 0.05, (wx0 + wx1) / 2, wx1 + 0.05)):
        y = 0.62; r = 0.36 if i == 1 else 0.3; h = 1.05 if i == 1 else 0.85
        k.cyl('iron', x, y, r + 0.05, PZ, PZ + 0.16, 24)
        k.cyl('green', x, y, r - 0.02, PZ + 0.16, PZ + h, 24)
        for zz in (0.18, h * 0.55 + 0.1, h):
            k.torus('gold' if zz != h else 'iron', r + 0.01, 0.03, loc=(x, y, PZ + zz), seg=(32, 6))
        k.cyl('iron', x, y, r + 0.03, PZ + h, PZ + h + 0.06, 24, r2=r * 0.5)
        k.cyl('ironl', x, y, 0.05, PZ + h + 0.06, PZ + h + 0.2, 10)
        k.curve('ironl', [[(x, y, PZ + h + 0.18, 0.045), (x, y + 0.2, PZ + h + 0.42, 0.045), (x, FY - 0.15, PZ + h + 0.45, 0.045), (x, FY + 0.05, PZ + h + 0.45, 0.045)]])
        info['glows'].append(((x, y - r, PZ + 0.16 + (h - 0.16) * 0.55), r * 1.6, '90,255,154', 'vat'))
        for b in range(3):
            k.sphere('green', x + 0.1 * math.cos(b * 2.1 + i), y - r * 0.6, PZ + 0.35 + b * 0.22, 0.035)
    vx = side * 2.3
    k.cyl('iron', vx, 3.9, 0.22, 4.4, 6.35, 16)
    k.cyl('green', vx, 3.9, 0.17, 6.2, 6.4, 16)
    k.cyl('iron', vx, 3.9, 0.3, 6.4, 6.5, 16, r2=0.12)
    info['glows'].append(((vx, 3.9, 6.35), 0.4, '90,255,154', 'vat'))


def deco_forge(k, info, g):
    """FORGE: ปล่องไฟหินใหญ่ (ปากเรืองส้ม) + เตาหลอมเปิดหน้า (แทนหน้าต่าง) + ทั่ง ถังชุบน้ำ แท่งโลหะ"""
    PZ, FY, side, (wx0, wx1), (wz0, wz1), DX = g['PZ'], g['FY'], g['side'], g['wx'], g['wz'], g['DX']
    cx, cy = side * 2.5, 4.0
    k.box('base', cx - 0.5, cx + 0.5, cy - 0.45, cy + 0.45, PZ, 7.6, bevel=0.03)
    k.box('marble', cx - 0.58, cx + 0.58, cy - 0.53, cy + 0.53, 7.3, 7.55, bevel=0.02)
    k.box('gold', cx - 0.6, cx + 0.6, cy - 0.55, cy + 0.55, 6.6, 6.68)
    k.box('fire', cx - 0.36, cx + 0.36, cy - 0.31, cy + 0.31, 7.5, 7.58)
    info['glows'].append(((cx, cy, 7.6), 0.55, '255,140,50', 'fire'))
    # เตาหลอม: ช่องโค้งใหญ่เรืองส้ม + ถ่าน + ฝาครอบเหล็ก
    fx = (wx0 + wx1) / 2
    k.cut(g['wl'], k.arch_cutter(wx0 + 0.1, wx1 - 0.1, PZ + 0.3, wz1 - 0.5, FY - 0.2, FY + 0.3, 0.6))
    k.box('fire', wx0 + 0.1, wx1 - 0.1, FY + 0.25, FY + 0.3, PZ + 0.3, wz1 + 0.1)
    k.box('base', wx0 + 0.05, wx1 - 0.05, FY - 0.25, FY + 0.25, PZ, PZ + 0.45, bevel=0.02)
    k.box('coal', wx0 + 0.2, wx1 - 0.2, FY - 0.15, FY + 0.2, PZ + 0.45, PZ + 0.55)
    k.box('fire', wx0 + 0.3, wx1 - 0.3, FY - 0.1, FY + 0.15, PZ + 0.55, PZ + 0.6)
    k.arch_trim('iron', fx, FY, wx1 - wx0 - 0.15, wz1 - 0.5, 0.65, r=0.07, z0=PZ + 0.3)
    info['glows'].append(((fx, FY, PZ + 0.9), 1.1, '255,130,40', 'fire'))
    # ทั่ง
    ax = fx - side * 0.25
    k.box('wood', ax - 0.22, ax + 0.22, 0.45, 0.85, PZ, PZ + 0.42, bevel=0.02)
    k.box('ironl', ax - 0.12, ax + 0.12, 0.52, 0.78, PZ + 0.42, PZ + 0.62, taper=(1.6, 1.0))
    k.box('ironl', ax - 0.32, ax + 0.28, 0.5, 0.8, PZ + 0.62, PZ + 0.74, bevel=0.015)
    k.cyl('ironl', ax - 0.32, 0.65, 0.12, 0.0, 0.22, 4, r2=0.0, smooth=False, rot=_ry90(-1)).location = (0, 0, PZ + 0.68)
    k.box('wood', ax + 0.05, ax + 0.45, 0.62, 0.68, PZ + 0.75, PZ + 0.79)
    k.box('iron', ax + 0.38, ax + 0.48, 0.58, 0.72, PZ + 0.74, PZ + 0.86)
    k.box('fire', ax - 0.15, ax + 0.05, 0.6, 0.7, PZ + 0.74, PZ + 0.77)
    info['glows'].append(((ax - 0.05, 0.6, PZ + 0.76), 0.3, '255,150,60', 'fire'))
    # ถังชุบน้ำ + แท่งโลหะซ้อน
    barrel(k, side * 3.25, 0.7, PZ, 0.3, 0.55, lid='water')
    ix = DX - side * 1.6
    for i in range(3):
        for j in range(3 - i):
            x = ix - 0.24 + j * 0.16 + i * 0.08
            k.box('gold' if (i + j) % 2 else 'ironl', x - 0.07, x + 0.07, 0.42, 0.66, PZ + i * 0.08, PZ + (i + 1) * 0.08, bevel=0.01)


def core(k, spec):
    """หอคอย CENTRAL CORE 11×7: ฐานยก + โถงหลังเตี้ย + ป้อมกลม 2 ข้าง (หลังคากรวยฟ้า) + ตึกกลางประตูโค้งเรืองฟ้า + แกนคริสตัลบนยอด"""
    import gate3d as GT
    from mathutils import Matrix
    W, D = spec['w'], spec['h']; hw = W / 2
    PZ = 0.6; info = {'glows': []}
    podium(k, W, D, PZ, (0.0, 3.0), [], steps=4)
    # ---- โถงหลัง (เตี้ย — ชิดขอบเหนือแมพ)
    k.box('wall', -hw + 0.2, hw - 0.2, 3.6, D - 0.15, PZ, 3.7, bevel=0.03)
    k.box('base', -hw + 0.15, hw - 0.15, 3.55, D - 0.1, PZ, PZ + 0.45, bevel=0.02)
    k.box('marble', -hw + 0.1, hw - 0.1, 3.5, D - 0.05, 3.7, 3.95, bevel=0.03)
    for i in range(12):   # เชิงเทินหัวทอง
        x = -hw + 0.35 + i * (W - 0.7) / 11
        k.box('marble', x - 0.13, x + 0.13, 3.55, 3.75, 3.95, 4.25, bevel=0.015)
        k.box('gold', x - 0.14, x + 0.14, 3.53, 3.77, 4.25, 4.3)
    k.box('rune', -hw + 0.6, hw - 0.6, 3.48, 3.5, 3.2, 3.26)
    k.gable_roof('roof_core', -hw + 0.4, hw - 0.4, 3.75, D - 0.3, 3.95, 4.85, 'x', t=0.12)   # หลังคาเตี้ยกระเบื้องฟ้าหลังเชิงเทิน
    # ---- กำแพงเชื่อม (ระหว่างป้อมกับตึกกลาง) + หน้าต่างโค้งเรืองฟ้า
    for s in (-1, 1):
        x0, x1 = sorted((s * 2.55, s * 3.6))
        wl = k.box('wall', x0, x1, 1.6, 3.8, PZ, 3.3, bevel=0.03)
        k.box('marble', x0 - 0.05, x1 + 0.05, 1.55, 3.85, 3.3, 3.48, bevel=0.02)
        k.box('gold', x0 - 0.06, x1 + 0.06, 1.53, 3.87, 3.48, 3.53)
        wx = (x0 + x1) / 2
        k.cut(wl, k.arch_cutter(wx - 0.3, wx + 0.3, PZ + 0.9, PZ + 1.9, 1.4, 1.85))
        k.box('cyan', wx - 0.3, wx + 0.3, 1.78, 1.82, PZ + 0.9, PZ + 2.25)
        k.arch_trim('gold', wx, 1.6, 0.66, PZ + 1.9, r=0.03, z0=PZ + 0.9)
    # ---- ป้อมกลม 2 ข้าง
    TR, TX, TY, TZ = 1.2, hw - 1.25, 2.0, 4.6
    for s in (-1, 1):
        x = s * TX
        k.cyl('base', x, TY, TR + 0.08, PZ, PZ + 0.5, 40)
        t = k.cyl('wall', x, TY, TR, PZ + 0.5, TZ, 40)
        k.cyl('marble', x, TY, TR + 0.12, TZ, TZ + 0.3, 40)
        k.cyl('gold', x, TY, TR + 0.14, TZ + 0.3, TZ + 0.36, 40)
        k.cyl('gold', x, TY, TR + 0.03, 2.35, 2.43, 40)
        for a in (-0.6, 0.0, 0.6):   # ช่องแสงรูน (หันใต้)
            ang = -math.pi / 2 + a
            px, py = x + TR * math.cos(ang), TY + TR * math.sin(ang)
            c = k.box('dark', px - 0.1, px + 0.1, py - 0.3, py + 0.3, 2.8, 3.75); c.hide_render = True; k.cutters.append(c)
            k.cut(t, c)
        k.cyl('cyan', x, TY, TR - 0.12, 2.75, 3.8, 40)
        k.cyl('roof_core', x, TY, TR + 0.32, TZ + 0.3, TZ + 2.55, 40, r2=0.08)
        for i in range(1, 6):
            f = i / 6
            k.torus('roof_core', (TR + 0.32) * (1 - f) + 0.08 * f + 0.02, 0.035, loc=(x, TY, TZ + 0.3 + 2.25 * f), seg=(40, 5))
        k.torus('gold', TR + 0.3, 0.05, loc=(x, TY, TZ + 0.33), seg=(48, 6))
        k.cyl('gold', x, TY, 0.12, TZ + 2.45, TZ + 2.7, 12)
        k.sphere('gold', x, TY, TZ + 2.75, 0.1)
        k.sphere('crystal', x, TY, TZ + 3.0, 0.13, sz=1.8, seg=(6, 4))
        info['glows'].append(((x, TY, TZ + 3.0), 0.35, '120,220,255', 'gem'))
    # ---- ตึกกลาง (หน้าลบมุม)
    KX, KF, KB, KZ, ch = 2.6, 1.0, 5.0, 5.4, 0.45
    prof = [(-KX, KB), (-KX, KF + ch), (-KX + ch, KF), (KX - ch, KF), (KX, KF + ch), (KX, KB)]
    n = len(prof)
    F = [tuple(range(n))[::-1], tuple(range(n, 2 * n))] + [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    def ring(e, z0, z1):
        return [(x * (1 + e / KX), y + (-e if y < 2 else e), z0) for x, y in prof] + [(x * (1 + e / KX), y + (-e if y < 2 else e), z1) for x, y in prof]
    keep = k.mesh('wall', ring(0, PZ, KZ), F); k.bevel(keep, 0.03)
    k.mesh('base', ring(0.05, PZ, PZ + 0.55), F)
    k.mesh('marble', ring(0.1, KZ, KZ + 0.34), F)
    k.mesh('gold', ring(0.12, KZ + 0.12, KZ + 0.18), F)                     # แถบทองรอบขอบหลังคาตึกกลาง
    k.mesh('base', ring(-0.12, KZ + 0.34, KZ + 0.36), F)                    # พื้นดาดฟ้าแผ่นหินเทาฟ้า (ไม่เป็นแผ่นขาวโล่ง)
    k.mesh('gold', ring(0.04, 2.35, 2.43), F)
    for i in range(9):   # เชิงเทินหน้าตึก
        x = -KX + 0.3 + i * (2 * KX - 0.6) / 8
        k.box('marble', x - 0.14, x + 0.14, KF - 0.05, KF + 0.2, KZ + 0.34, KZ + 0.62, bevel=0.015)
        k.box('gold', x - 0.15, x + 0.15, KF - 0.06, KF + 0.21, KZ + 0.62, KZ + 0.67)
    for s in (-1, 1):   # เสาอิงหน้าตึก + เส้นรูน
        x = s * (KX - ch - 0.25)
        k.box('marble', x - 0.17, x + 0.17, KF - 0.16, KF + 0.05, PZ, KZ, bevel=0.025)
        k.box('gold', x - 0.2, x + 0.2, KF - 0.19, KF + 0.05, KZ - 0.35, KZ - 0.2)
        k.box('rune', x - 0.03, x + 0.03, KF - 0.175, KF - 0.16, PZ + 0.8, KZ - 0.5)
    # ประตูโค้งใหญ่เรืองฟ้า
    dw, dz = 1.9, PZ + 1.65
    k.cut(keep, k.arch_cutter(-dw / 2, dw / 2, PZ - 0.05, dz, KF - 0.3, KF + 0.5))
    k.box('cyan', -dw / 2, dw / 2, KF + 0.45, KF + 0.5, PZ, dz + dw / 2)
    k.box('iron', -dw / 2 - 0.02, -dw / 2 + 0.3, KF + 0.12, KF + 0.2, PZ, dz + 0.45)
    k.box('iron', dw / 2 - 0.3, dw / 2 + 0.02, KF + 0.12, KF + 0.2, PZ, dz + 0.45)
    k.arch_trim('iron', 0, KF, dw + 0.1, dz, dw / 2 + 0.05, r=0.09, z0=PZ)
    k.arch_trim('gold', 0, KF - 0.09, dw + 0.42, dz, dw / 2 + 0.21, r=0.045, z0=PZ)
    k.box('crystal', -0.1, 0.1, KF - 0.2, KF - 0.05, dz + dw / 2 + 0.1, dz + dw / 2 + 0.38)
    info['glows'].append(((0, KF, PZ + 1.4), 1.3, '120,220,255', 'door'))
    # ป้าย CENTRAL CORE
    pw, pz0, pz1 = 3.9, dz + dw / 2 + 0.5, dz + dw / 2 + 1.12
    plaque(k, 0, KF - 0.2, pz0, pz1, pw, knob='crystal')
    info['label'] = ((0, KF - 0.21, (pz0 + pz1) / 2), pw - 0.3)
    # ---- แกนพลังงาน: กลองทอง/หินอ่อนบนหลังคาตึกกลาง (ค่อนหน้า) + กรงทอง 4 ซี่ + คริสตัลฟ้าใหญ่ + วงแหวนรูนเอียง
    CY, CZ, TIP = 2.6, KZ + 0.34, 8.3
    k.cyl('marble', 0, CY, 1.15, CZ, CZ + 0.35, 48)
    k.cyl('gold', 0, CY, 1.2, CZ + 0.35, CZ + 0.42, 48)
    k.cyl('marble', 0, CY, 0.85, CZ + 0.42, CZ + 0.75, 48, r2=0.7)
    k.torus('rune', 0.78, 0.025, loc=(0, CY, CZ + 0.6), seg=(48, 6))
    G = GT.Geo(); rnd = random.Random(707)
    GT.shard(G, 'cry', 'C', (0, CY, CZ + 0.55), (0, 0, 1), TIP - (CZ + 0.55), 0.55, rnd)
    for a in range(4):
        an = a * math.pi / 2 + 0.4
        GT.shard(G, 'cry', 'C', (0.25 * math.cos(an), CY + 0.25 * math.sin(an), CZ + 0.7), (0.5 * math.cos(an), 0.5 * math.sin(an), 1), 1.1, 0.16, rnd)
    for (mat, tag), (Vv, Ff) in G.b.items(): k.mesh('crystal', Vv, Ff)
    for a in range(4):
        an = a * math.pi / 2 + math.pi / 4; c, s_ = math.cos(an), math.sin(an)
        k.curve('gold', [[(0.95 * c, CY + 0.95 * s_, CZ + 0.4, 0.07), (1.0 * c, CY + 1.0 * s_, CZ + 1.3, 0.06), (0.62 * c, CY + 0.62 * s_, CZ + 1.95, 0.05),
                          (0.3 * c, CY + 0.3 * s_, CZ + 2.35, 0.035)]])
        k.sphere('gold', 1.0 * c, CY + 1.0 * s_, CZ + 1.3, 0.09)
    k.torus('rune', 1.25, 0.045, loc=(0, CY, CZ + 1.55), rot=Matrix.Rotation(0.18, 3, 'X'), seg=(64, 8))
    k.torus('gold', 1.25, 0.022, loc=(0, CY, CZ + 1.42), rot=Matrix.Rotation(0.18, 3, 'X'), seg=(64, 6))
    info['glows'].append(((0, CY, TIP - 0.25), 0.45, '160,240,255', 'gem'))
    info['glows'].append(((0, CY, CZ + 1.4), 1.3, '120,220,255', 'core'))
    for s in (-1, 1):
        info['glows'].append((lantern(k, s * 1.55, KF - 0.15, PZ + 1.7), 0.35, '120,220,255', 'lamp'))
    return info


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
        cam = BF.Cam(sc)
        objs = [o for o in coll.objects if not o.hide_render]
        u0, u1, v0, v1 = cam.bounds(objs, 0.1)
        cam.frame(u0, u1, v0, v1, ppm)
        BF.freestyle(sc, coll, 1.3 * ss)
        sc.cycles.use_denoising = True
        cam.shoot(os.path.join(out, f'{key}.png'), samples)
        lp, lw = info['label']
        m = {'anchor': cam.px((0, 0, 0)), 'ppm': ppm, 'label': [*cam.px(lp), round(lw * ppm, 1)],
             'glows': [[*cam.px(p), round(r * ppm, 1), col, kd] for p, r, col, kd in info['glows']],
             'size': [sc.render.resolution_x, sc.render.resolution_y]}
        # เงาบนพื้น: วัตถุมองไม่เห็นแต่ยังทอดเงา (ภาพพื้นแบบ A)
        sc.render.use_freestyle = False
        for o in objs: o.visible_camera = False
        pl = BF.catcher(sc)
        rect = shadow_rect(b, key)
        BF.ground_shot(cam, rect, (b['x'] + b['w'] / 2, b['y'] + b['h']), os.path.join(out, f'{key}_sh.png'), max(8, samples // 2))
        bpy.data.objects.remove(pl)
        m['shadow'] = {'rect': rect}
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
        im = paint(im, sat=1.14, con=1.05, bri=1.03, outline=False)
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
