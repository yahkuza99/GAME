"""พื้นเมือง Neo Eldheim ทั้งแมพ 3D: คลองลึก สะพานโค้ง ลานหินอ่อน — โมเดลด้วย bpy แล้วอบเป็นภาพพื้น 2D (docs/RENDER3D_PLAN.md ข้อ #12)

ผลลัพธ์: assets/bake_eldheim_ground.webp  ภาพเต็มแมพ 40×40 ช่อง (1600×1600) วาดลงผ้าใบพื้นแทน TownArt.floor/over
  (ลานหินอ่อน คลอง ขอบสวน เส้นแสง สะพาน กระถาง — js/maps.js renderGround + js/townmap.js) • ผังไม่ตรง/ภาพยังไม่มา = วาดด้วยโค้ดแบบเดิม
  • ลานหินอ่อนแผ่น 2×2 ม. ร่องรอยต่อจริง (bump) ฝังเส้นทอง • ลานกลางลายโมเสกวงแหวน • เส้นแสงฟ้า #5fd4ff = emission + เรืองฟุ้ง (glow pass)
    ลายพื้นวาดเป็น texture 2D ความละเอียด 100 px/ม. (paint() — ตำแหน่งเส้นตรงกับ TownArt.lines เดิมทุกเส้น) แล้วให้แสง/เงา 3D ทำงานบนนั้น
  • คลองลึก: ผิวน้ำ z = −0.6 ม. • ผนังคลองฝั่งเหนือหันหากล้อง = ผนังหินอ่อนแถบทอง + ไฟเส้นฟ้า (ความลึกจริง เงาผนังตกบนน้ำ)
    ขอบคลอง (coping) เตี้ย 8 ซม. เส้นทอง + ไฟฟ้า • ขั้นบันไดลงน้ำ 2 จุดในคลองใต้ • ราวลูกกรงริมฝั่งใต้ของคลองใต้ (ยื่นขึ้นทับน้ำ ไม่ทับทางเดิน)
    ปลายคลองที่ลอดใต้ร้าน = ปากอุโมงค์โค้งมืด (ร้านภาพวาดทับด้านบน)
  • สะพานโค้ง: ซุ้มโค้งใต้สะพาน + ขอบทอง + หินหัวโค้ง (เห็นจากด้านใต้) • ราวสะพาน: สะพานแนวตะวันออก-ตะวันตก ราวเหนือ 0.7 ม. (ยื่นทับน้ำ)
    ราวใต้ ≤ 0.36 ม. (ยื่นทับพื้นสะพาน ≤ 0.31 ช่อง — กฎข้อ 5 ของแผน) • สะพานคลองใต้ ราววิ่งเหนือ-ใต้ ยอดราวโค้ง (ยื่นตามแนวตัวเอง ไม่บังพื้นสะพาน)
  • ขอบสวนหินอ่อนสูง 0.22 ม. • กระถางต้นไม้สูง 0.32 ม. (ต้นไม้ Flora วาดทับในเกม) • ช่องหญ้า = shadow catcher (โปร่ง เหลือแต่เงาขอบสวน/ราว)
  • ไม่รวม: อาคาร/ร้าน (ภาพวาด), น้ำพุ (ขอบสระอบ #11 — ลานใต้สระเป็นหินอ่อนเรียบ), แท่น Bifrost/Norn (#13), ซุ้มวาร์ป, เสาไฟ
กฎมุมกล้อง (R.K = 0.76): จุดสูง h ม. ยื่นขึ้นเหนือ 0.855h ช่อง • ผิวน้ำต่ำกว่าพื้น −0.6 ม. เลื่อนลงใต้ 0.51 ช่อง (ยังอยู่ในคลอง)
   check() รายงานของสูงที่ยื่นทับช่องเดินได้ (ต้องเตี้ยตามแผน: กระถาง/ขอบสวน/ราวใต้สะพาน ≤ 0.36 ช่อง)
ผังช่องดึงจากเกมจริง (Playwright: new GameMap('eldheim',{lite:true})) → tools/town3d_tiles.json + hash FNV-1a ของผังทั้งแมพ
   เกมเทียบ hash (GameMap.townBake ใน js/maps.js) — genTown เปลี่ยน = กลับไปวาดด้วยโค้ด + console.warn ครั้งเดียว
แสง: ชุดเมืองเดียวกับ tools/fountain3d.py (sun ซ้ายบน z = −135° → เงาตกขวาล่าง + fill อุ่น + ฟ้า) — หินอ่อนรอบสระน้ำพุอบโทนเดียวกัน
   หินอ่อนขาวไม่จ้า: roughness สูง + exposure ต่ำ + โทนสีจาก TownArt เดิม • เส้นขอบ Freestyle บาง (ผนัง/ราว/กระถาง/ขอบสวน — ไม่ขีดพื้น)
   สไตล์กลางชั่วคราวเหมือนงานอบชิ้นอื่น (รอเจ้าของเลือกระดับ toon)

ใช้:
  python3 tools/town3d.py --extract                       (ต้องมี node + playwright) → tools/town3d_tiles.json
  python3 tools/town3d.py --check                         (ตรวจของสูงบังทางเดิน + บันทึก texture พื้น /tmp/town3d_tex*.png — ไม่ต้องใช้ Blender)
  /tmp/bvenv/bin/python tools/town3d.py --render [--samples 24] [--ss 2] [--preview] [--crop x0,y0,x1,y1] [--clay] [--out /tmp/town3d]
     → <out>/ground.png + <out>/glow.png (pass เรืองแสงล้วน) • ค่าที่ใช้จริง: --samples 24 --ss 2
  python3 tools/town3d.py --look /tmp/town3d_crop        (ดูภาพที่เรนเดอร์ด้วย --crop แบบภาพพื้นในเกม → look.png ไม่ติดตั้ง)
  python3 tools/town3d.py --install /tmp/town3d          (ยืด ×1/0.76, เรืองฟุ้ง, webp, manifest, เขียน TOWN_BAKE ใน js/maps.js)
     (ค่าที่ใช้จริง: --samples 24 --ss 2 ≈ 5 นาทีบน CPU 4 คอร์ • ภาพติดตั้ง ~180 KB)
"""
import math, os, sys, json, random, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
TILES = os.path.join(ROOT, 'tools', 'town3d_tiles.json')
MAP_ID = 'eldheim'
IMG_KEY = 'bake_eldheim_ground'
K = 0.76; TH = math.acos(K); SN = math.sin(TH); SH = SN / K   # SH = 0.855 ช่องต่อความสูง 1 ม.
PX = 40                        # TILE
TP = 100                       # texture พื้น: พิกเซลต่อเมตร
CLAY = '--clay' in sys.argv
# ชนิดช่อง (js/data.js T)
GRASS, TREE, WATER, STONE, FLOWER, HOUSE, FOUNTAIN = 0, 1, 2, 4, 6, 9, 10
# ขนาด (ม.)
Z_WATER, Z_BOT = -0.6, -0.95   # ผิวน้ำ / ก้นผนัง (ต่ำกว่าน้ำ ไม่มีรอยรั่ว)
COPE_W, COPE_H = 0.16, 0.08    # ขอบคลอง (ฝั่งพื้น)
CURB_W, CURB_H = 0.16, 0.22    # ขอบสวน (ฝั่งหญ้า)
PLANT_PAD, PLANT_H, SOIL_Z = 0.1, 0.32, 0.26
RAIL_N, RAIL_S = 0.7, 0.36     # ราวสะพานตะวันออก-ตะวันตก: ฝั่งเหนือ (ยื่นทับน้ำ) / ฝั่งใต้ (ยื่นทับพื้นสะพาน → เตี้ย)
BANK_RAIL = 0.55               # ราวริมฝั่งใต้ของคลองใต้ (ยื่นขึ้นทับน้ำ)
ARCH_SPRING, ARCH_APEX = -0.5, -0.13
CULVERT = 1.6                  # อุโมงค์ใต้ร้านลึก (ม.)
STAIRS = [(9.8, 11.2), (29.8, 31.2)]   # ขั้นบันไดลงน้ำในคลองใต้ (ช่วง x) — สมมาตรรอบถนนใต้ (x = 20.5)
C = 20.5; R1, R2 = 3.4, 7.6    # ลานกลาง (TownArt.lines)
BASIN_R = 2.9                  # ใต้สระน้ำพุ: หินอ่อนเรียบ (ขอบสระอบ #11 / TownArt.basin วาดทับ)
GLOW = (95, 212, 255); CORE = (235, 252, 255); GOLD = (215, 178, 90)


def fnv(tiles):
    h = 0x811c9dc5
    for v in tiles:
        h ^= v; h = (h * 0x01000193) & 0xffffffff
    return h


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
    return { w: m.w, h: m.h, tiles: Array.from(m.tiles), bridges: m.bridges, planters: m.planters, fountain: m.fountain, portals: m.portals }; }, process.argv[3]);
  console.log(JSON.stringify(r)); await b.close(); })();"""
    f = os.path.join(tempfile.gettempdir(), 'town3d_extract.js'); open(f, 'w').write(js)
    env = dict(os.environ); env.setdefault('NODE_PATH', subprocess.check_output(['npm', 'root', '-g'], text=True).strip())
    out = subprocess.check_output(['node', f, f'http://127.0.0.1:{srv.server_address[1]}/index.html', MAP_ID], env=env, text=True)
    srv.shutdown()
    r = json.loads(out.strip().splitlines()[-1]); w, h = r['w'], r['h']
    data = {'map': MAP_ID, 'w': w, 'h': h, 'hash': fnv(r['tiles']),
            'rows': [''.join('0123456789AB'[v] for v in r['tiles'][y * w:(y + 1) * w]) for y in range(h)],
            'bridges': r['bridges'], 'planters': r['planters'], 'fountain': r['fountain'], 'portals': r['portals']}
    json.dump(data, open(TILES, 'w'), indent=0)
    print('ผังช่อง →', TILES, f'{w}×{h}', 'hash', data['hash'], 'สะพาน', len(r['bridges']), 'กระถาง', len(r['planters']))


class Town:
    """ผังเมือง + ชนิดช่องที่ใช้บ่อย (พิกัดแมพ: x ขวา, y ลง — 1 ช่อง = 1 ม.)"""
    def __init__(self):
        d = json.load(open(TILES)); self.d = d
        self.w, self.h = d['w'], d['h']
        self.T = [[int(c, 16) for c in s] for s in d['rows']]
        self.bridge_tiles = set()
        for b in d['bridges']:
            for y in range(b['y0'], b['y1'] + 1):
                for x in range(b['x0'], b['x1'] + 1): self.bridge_tiles.add((x, y))
        self.planters = {tuple(p) for p in d['planters'] if self.t(*p) == TREE}

    def t(self, x, y): return self.T[y][x] if 0 <= x < self.w and 0 <= y < self.h else TREE
    def water(self, x, y): return self.t(x, y) == WATER
    def wet(self, x, y): return self.water(x, y) or (x, y) in self.bridge_tiles   # น้ำ (รวมใต้สะพาน)
    def stone(self, x, y): return self.t(x, y) in (STONE, FOUNTAIN)
    def floor(self, x, y): return self.t(x, y) in (STONE, FOUNTAIN, HOUSE)   # พื้นหินอ่อน (รวมใต้อาคาร/พื้นสะพาน)
    def green(self, x, y): return self.t(x, y) in (GRASS, FLOWER, TREE)
    def walk(self, x, y): return self.t(x, y) in (GRASS, STONE, FLOWER)        # ช่องเดินได้ (ไม่นับ NPC)


# ================================================================ texture พื้น (numpy) — ตรงกับ TownArt.floor/lines/bridge
class Canvas:
    def __init__(self, W, H):
        import numpy as np
        self.np = np; self.W, self.H = W, H; self.N = (W * TP, H * TP)
        self.col = np.zeros((H * TP, W * TP, 3), np.float32)      # sRGB 0..1
        self.hgt = np.ones((H * TP, W * TP), np.float32)          # 1 = ผิว • 0 = ก้นร่อง (bump)
        self.emi = np.zeros((H * TP, W * TP), np.float32)         # เส้นแสง
        self.met = np.zeros((H * TP, W * TP), np.float32)         # ทอง (metallic)
        self.cov = np.zeros((H * TP, W * TP), np.float32)         # บัฟเฟอร์เส้นเดียว (ความทึบสูงสุดของทุกท่อน)
        c = (np.arange(W * TP) + 0.5) / TP; r = (np.arange(H * TP) + 0.5) / TP
        self.MX, self.MY = np.meshgrid(c, r)

    def blend(self, sl, cov, rgb, a):
        np = self.np
        k = (cov * a)[..., None]; self.col[sl] = self.col[sl] * (1 - k) + np.array(rgb, np.float32) / 255 * k

    def stroke(self, pts, w, rgb, a=1.0, emi=None, met=None, groove=None, clip=None):
        """เส้น polyline (พิกัดเมตร) กว้าง w ม. ขอบนุ่ม 1 px — ความทึบสูงสุดต่อเส้น (รอยต่อท่อนไม่ซ้อนเป็นจุด) • clip(mx, my) → bool array"""
        np = self.np; hw = w / 2; pad = hw + 2 / TP
        X0 = Y0 = 10 ** 9; X1 = Y1 = -1
        for (ax, ay), (bx, by) in zip(pts[:-1], pts[1:]):
            i0 = max(0, int((min(ax, bx) - pad) * TP)); i1 = min(self.N[0], int((max(ax, bx) + pad) * TP) + 1)
            j0 = max(0, int((min(ay, by) - pad) * TP)); j1 = min(self.N[1], int((max(ay, by) + pad) * TP) + 1)
            if i1 <= i0 or j1 <= j0: continue
            mx, my = self.MX[j0:j1, i0:i1], self.MY[j0:j1, i0:i1]
            dx, dy = bx - ax, by - ay; L2 = dx * dx + dy * dy
            t = np.clip(((mx - ax) * dx + (my - ay) * dy) / L2, 0, 1) if L2 > 0 else 0
            d = np.hypot(mx - ax - t * dx, my - ay - t * dy)
            c = np.clip((hw - d) * TP + 0.5, 0, 1)
            if clip is not None: c = c * clip(mx, my)
            self.cov[j0:j1, i0:i1] = np.maximum(self.cov[j0:j1, i0:i1], c)
            X0, Y0, X1, Y1 = min(X0, i0), min(Y0, j0), max(X1, i1), max(Y1, j1)
        if X1 < 0: return
        sl = (slice(Y0, Y1), slice(X0, X1)); cov = self.cov[sl]
        self.blend(sl, cov, rgb, a)
        if emi is not None: self.emi[sl] = np.maximum(self.emi[sl] * (1 - cov * a), cov * a * emi)
        if met is not None: self.met[sl] = self.met[sl] * (1 - cov * a) + cov * a * met
        else: self.met[sl] = self.met[sl] * (1 - cov * a)
        if groove is not None: self.hgt[sl] = np.minimum(self.hgt[sl], 1 - cov * groove)
        self.cov[sl] = 0

    def glow(self, pts, wpx, rgb=GLOW, clip=None):
        """เส้นแสงแบบ TownArt.glow: เนื้อสีฟ้า + แกนขาว (ความกว้างเป็น px ที่ 40 px/ม. เหมือนโค้ดเดิม) — เรืองฟุ้งทำตอนติดตั้ง (glow pass)"""
        self.stroke(pts, wpx / PX, rgb, 1.0, emi=0.75, met=0, clip=clip)
        self.stroke(pts, max(0.8, wpx * 0.35) / PX, CORE, 0.95, emi=1.0, met=0, clip=clip)

    def gold(self, pts, wpx, clip=None):
        """เส้นทองแบบ TownArt.gold: ขอบเข้มจาง + เนื้อทอง (โลหะ) + ไฮไลต์"""
        self.stroke(pts, (wpx + 1.6) / PX, (70, 50, 20), 0.45, clip=clip)
        self.stroke(pts, wpx / PX, GOLD, 1.0, met=1.0, clip=clip)
        self.stroke(pts, max(0.6, wpx * 0.35) / PX, (255, 240, 190), 0.7, met=0.6, clip=clip)


def arc(cx, cy, r, a0=0.0, a1=2 * math.pi, n=None):
    n = n or max(16, int(abs(a1 - a0) * r * 24))
    return [(cx + math.cos(a0 + (a1 - a0) * i / n) * r, cy + math.sin(a0 + (a1 - a0) * i / n) * r) for i in range(n + 1)]


def hh(x, y, k, seed=101 + 4242):
    """ค่าสุ่มคงที่ต่อแผ่น (ไม่ใช่ U.hash2 ของเกม — ลายหินไม่ต้องตรงกับโค้ดเดิมทุกเส้น แค่โทนเดียวกัน)"""
    v = math.sin(x * 127.1 + y * 311.7 + k * 74.7 + seed * 0.13) * 43758.5453
    return v - math.floor(v)


def paint(town):
    """texture พื้นหินอ่อนทั้งแมพ: สี (sRGB) + ข้อมูล (R = ความสูงร่อง, G = เส้นแสง, B = ทอง)"""
    import numpy as np
    W, H = town.w, town.h
    cv = Canvas(W, H); MX, MY = cv.MX, cv.MY
    # ---- 1) แผ่นหินอ่อน 2×2 ม.: โทนต่างกันเล็กน้อย ไล่สีทแยง (อ่อนกว่าโค้ดเดิม — แสง 3D ให้มิติแล้ว)
    sx, sy = np.floor(MX / 2), np.floor(MY / 2)
    k = (np.sin(sx * 127.1 + sy * 311.7 + 7.7) * 43758.5453) % 1
    u = ((MX - sx * 2) + (MY - sy * 2)) / 4
    a = 228 + k * 14; b = 216 + k * 12
    t = (u * 0.55)[..., None]
    c0 = np.stack([a, a + 3, a + 7], -1); c1 = np.stack([b, b + 4, b + 10], -1)
    cv.col[:] = (c0 * (1 - t) + c1 * t) / 255
    # ลายหิน (เส้นโค้ง 2 เส้นต่อแผ่น แบบ TownArt.floor)
    for py in range(0, H, 2):
        for px in range(0, W, 2):
            k2 = hh(px, py, 2)
            for i in range(2):
                r1, r2, r3 = hh(px, py, 10 + i), hh(px, py, 20 + i), hh(px, py, 30 + i)
                P = [(px + r1 * 2, py), (px + r2 * 2, py + 0.7), (px + r3 * 2, py + 1.3), (px + (1 - r1) * 2, py + 2)]
                pts = [((1 - s) ** 3 * P[0][0] + 3 * (1 - s) ** 2 * s * P[1][0] + 3 * (1 - s) * s * s * P[2][0] + s ** 3 * P[3][0],
                        (1 - s) ** 3 * P[0][1] + 3 * (1 - s) ** 2 * s * P[1][1] + 3 * (1 - s) * s * s * P[2][1] + s ** 3 * P[3][1]) for s in [j / 24 for j in range(25)]]
                cv.stroke(pts, 0.9 / PX, (140, 150, 168), 0.14 + k2 * 0.12)
    # ร่องรอยต่อแผ่น: ร่องจริง (bump) ฝังเส้นทองบาง
    gx = np.abs(MX - np.round(MX / 2) * 2); gy = np.abs(MY - np.round(MY / 2) * 2)
    gcov = np.clip((0.016 - np.minimum(gx, gy)) * TP + 0.5, 0, 1)
    R = np.hypot(MX - C, MY - C)
    gcov *= R >= R2                                            # ลานกลางเป็นโมเสกวงแหวน (ไม่มีร่องแผ่นสี่เหลี่ยม)
    cv.blend((slice(None), slice(None)), gcov, (176, 146, 84), 0.7); cv.met[:] = np.maximum(cv.met, gcov * 0.55)
    cv.hgt[:] = np.minimum(cv.hgt, 1 - gcov)
    # ---- 2) ลานกลาง: หินอ่อนวงกลมไล่สี + ลายโมเสก (วงแหวนทุก 1.05 ม. + รอยต่อแนวรัศมีเหลื่อมกันทีละวง)
    disc = R < R2
    tt = np.clip((R - 2) / (R2 - 2), 0, 1)[..., None]
    dc = (np.array([244, 246, 249]) * (1 - tt) + np.array([226, 231, 238]) * tt) / 255
    cv.col[disc] = dc[disc]
    cv.hgt[disc] = 1; cv.met[disc] = 0
    rr, ring = R1, 0
    while rr < R2 - 0.01:
        cv.stroke(arc(C, C, rr), 1.1 / PX, (176, 146, 84), 0.5, met=0.5, groove=0.8)
        n = round(rr * 3.2); off = math.pi / n if ring % 2 else 0
        for i in range(n):
            an = off + i / n * 2 * math.pi
            cv.stroke([(C + math.cos(an) * rr, C + math.sin(an) * rr), (C + math.cos(an) * (rr + 1.05), C + math.sin(an) * (rr + 1.05))],
                      1.1 / PX, (176, 146, 84), 0.5, met=0.5, groove=0.8)
        rr += 1.05; ring += 1
    # ---- 3) เส้นแสงฟ้า + เส้นทอง (ตำแหน่งเดียวกับ TownArt.lines)
    deck = []   # กรอบพื้นสะพาน (a0..a1 ตามทางเดิน, c0..c1 ขวาง) — เส้นถนนไม่วาดทับสะพาน (โค้ดเดิม: สะพานวาดทับ)
    for b in town.d['bridges']:
        v = b['dir'] == 'v'
        x0, x1 = (b['x0'] - 0.1, b['x1'] + 1.1) if v else (b['x0'] - 0.2, b['x1'] + 1.2)
        y0, y1 = (b['y0'] - 0.2, b['y1'] + 1.2) if v else (b['y0'] - 0.1, b['y1'] + 1.1)
        deck.append((x0, y0, x1, y1, v))
    nodeck = lambda mx, my: np.all([~((mx > d[0]) & (mx < d[2]) & (my > d[1]) & (my < d[3])) for d in deck], 0)
    cv.gold(arc(C, C, R2 + 7 / PX), 2.4)
    cv.glow(arc(C, C, R2), 3)
    cv.glow(arc(C, C, R1), 2.4)
    cv.gold(arc(C, C, R1 - 6 / PX), 1.6)
    for i in range(8):
        an = i / 8 * 2 * math.pi + math.pi / 8
        cv.glow([(C + math.cos(an) * R1, C + math.sin(an) * R1), (C + math.cos(an) * R2, C + math.sin(an) * R2)], 1.8)
    ends = {'N': 9.2, 'S': H - 1.2, 'E': W - 1.2, 'W': 2.2}
    for dr in 'NSEW':
        sg = 1 if dr in 'SE' else -1; vert = dr in 'NS'
        frm = C + sg * math.sqrt(R2 * R2 - 1.5 ** 2); to = ends[dr]
        P = (lambda al, ac: (C + ac, al)) if vert else (lambda al, ac: (al, C + ac))
        for side in (-1, 1):
            nIn, nOut, bend = side * 1.2, side * 1.42, frm + sg * 0.6
            cv.glow([P(frm, nIn), P(bend, nIn), P(bend + sg * 0.22, nOut), P(to, nOut)], 2.2, clip=nodeck)
            cv.gold([P(frm + sg * 0.2, side * 1.62), P(to, side * 1.62)], 1.6, clip=nodeck)
        d = frm + sg * 1.6
        while (d < to - 1) if sg > 0 else (d > to + 1):
            cv.glow([P(d, -0.32), P(d + sg * 0.3, 0), P(d, 0.32)], 1.6, (143, 230, 255), clip=nodeck)
            d += sg * 2.2
    # ---- 4) พื้นสะพาน: หินอ่อนปูขวาง (รอยต่อทุก 0.25 ม.) ไล่สีขวางสะพาน + เส้นแสงกลาง (TownArt.bridge)
    for (x0, y0, x1, y1, v) in deck:
        i0, i1, j0, j1 = int(x0 * TP), int(x1 * TP), int(y0 * TP), int(y1 * TP)
        sl = (slice(j0, j1), slice(i0, i1))
        q = ((MX[sl] - x0) / (x1 - x0)) if v else ((MY[sl] - y0) / (y1 - y0))
        q = q[..., None]
        g1, g2, g3 = np.array([223, 227, 234]), np.array([246, 247, 250]), np.array([214, 219, 227])
        cv.col[sl] = np.where(q < 0.5, g1 * (1 - q * 2) + g2 * q * 2, g2 * (2 - q * 2) + g3 * (q * 2 - 1)) / 255
        cv.hgt[sl] = 1; cv.met[sl] = 0; cv.emi[sl] = 0
        al0, al1 = (y0, y1) if v else (x0, x1)
        a_ = al0 + 0.25
        while a_ < al1:
            pts = [(x0 + 0.15, a_), (x1 - 0.15, a_)] if v else [(a_, y0 + 0.15), (a_, y1 - 0.15)]
            cv.stroke(pts, 1 / PX, (150, 135, 100), 0.45, groove=0.7)
            a_ += 0.25
        m = (x0 + x1) / 2 if v else (y0 + y1) / 2
        cv.glow([(m, y0 + 0.1), (m, y1 - 0.1)] if v else [(x0 + 0.1, m), (x1 - 0.1, m)], 2.2)
    # ---- 5) ใต้สระน้ำพุ: หินอ่อนเรียบ (ขอบสระอบ / สระโค้ดวาดทับ)
    f = R < BASIN_R
    cv.col[f] = np.array([238, 241, 245]) / 255; cv.hgt[f] = 1; cv.met[f] = 0; cv.emi[f] = 0
    return cv


def save_tex(cv, outdir):
    import numpy as np
    from PIL import Image
    os.makedirs(outdir, exist_ok=True)
    col = os.path.join(outdir, 'tex_col.png'); dat = os.path.join(outdir, 'tex_dat.png')
    Image.fromarray(np.clip(cv.col * 255 + 0.5, 0, 255).astype(np.uint8)).save(col)
    Image.fromarray(np.clip(np.stack([cv.hgt, cv.emi, cv.met], -1) * 255 + 0.5, 0, 255).astype(np.uint8)).save(dat)
    print('texture พื้น →', col, dat)
    return col, dat


# ================================================================ เรขาคณิต (พิกัดแมพ → Blender: x − 20, 20 − y, z)
class Geo:
    def __init__(self, cx, cy):
        self.cx, self.cy = cx, cy; self.parts = {}      # (ชื่อวัสดุ, กลุ่ม) → [V, F, UV]

    def bl(self, x, y, z): return (x - self.cx, self.cy - y, z)

    def _p(self, mat, grp):
        return self.parts.setdefault((mat, grp), [[], [], []])

    def poly(self, mat, pts, normal=None, grp='ink', uv=False):
        """หน้าเดียว (จุดพิกัดแมพ x, y, z) • normal (แมพ) = ทิศที่ต้องหันออก (สลับลำดับจุดถ้าผิด)"""
        V, F, U = self._p(mat, grp)
        P = [self.bl(*p) for p in pts]
        if normal:
            nb = (normal[0], -normal[1], normal[2])
            a, b, c = P[0], P[1], P[2]
            u_ = (b[0] - a[0], b[1] - a[1], b[2] - a[2]); v_ = (c[0] - a[0], c[1] - a[1], c[2] - a[2])
            cr = (u_[1] * v_[2] - u_[2] * v_[1], u_[2] * v_[0] - u_[0] * v_[2], u_[0] * v_[1] - u_[1] * v_[0])
            if cr[0] * nb[0] + cr[1] * nb[1] + cr[2] * nb[2] < 0: P = P[::-1]; pts = pts[::-1]
        i = len(V); V += P; F.append(tuple(range(i, i + len(P))))
        if uv: U += [(p[0] / 40.0, 1 - p[1] / 40.0) for p in pts]

    def box(self, mat, x0, x1, y0, y1, z0, z1, grp='ink'):
        V, F, U = self._p(mat, grp)
        X0, X1, Y0, Y1 = x0 - self.cx, x1 - self.cx, self.cy - y1, self.cy - y0
        i = len(V)
        V += [(X0, Y0, z0), (X1, Y0, z0), (X1, Y1, z0), (X0, Y1, z0), (X0, Y0, z1), (X1, Y0, z1), (X1, Y1, z1), (X0, Y1, z1)]
        F += [(i, i + 3, i + 2, i + 1), (i + 4, i + 5, i + 6, i + 7), (i, i + 1, i + 5, i + 4), (i + 1, i + 2, i + 6, i + 5),
              (i + 2, i + 3, i + 7, i + 6), (i + 3, i, i + 4, i + 7)]


def plan(town):
    """สร้างเรขาคณิตทั้งฉาก (ไม่ใช้ Blender) → Geo + รายการจุดของสูงไว้ตรวจบังทาง [(ชนิด, x, y, z)]"""
    W, H = town.w, town.h
    G = Geo(W / 2, H / 2); tall = []
    # ---------- พื้น: หินอ่อน (texture) • หญ้า = shadow catcher • น้ำ ----------
    for y in range(H):
        for x in range(W):
            q = [(x, y, 0), (x + 1, y, 0), (x + 1, y + 1, 0), (x, y + 1, 0)]
            if town.floor(x, y): G.poly('floor', q, (0, 0, 1), 'floor', uv=True)
            elif town.green(x, y) and (x, y) not in town.planters: G.poly('catcher', q, (0, 0, 1), 'catcher')
            if town.wet(x, y): G.poly('water' if town.water(x, y) else 'deep', [(px, py, Z_WATER) for px, py, _ in q], (0, 0, 1), 'water')   # ใต้สะพาน = น้ำมืด
    # ---------- ปากอุโมงค์ใต้ร้าน: ปลายเหนือของคลองที่ติดอาคาร ----------
    culverts = []
    for y in range(H):
        x = 0
        while x < W:
            if town.water(x, y) and town.t(x, y - 1) == HOUSE:
                x1 = x
                while town.water(x1, y) and town.t(x1, y - 1) == HOUSE: x1 += 1
                culverts.append((x, x1, y)); x = x1
            else: x += 1
    culv_edges = {(x, y) for (x0, x1, y) in culverts for x in range(x0, x1)}
    for (x0, x1, y) in culverts:
        G.poly('deep', [(x0, y - CULVERT, Z_WATER), (x1, y - CULVERT, Z_WATER), (x1, y, Z_WATER), (x0, y, Z_WATER)], (0, 0, 1), 'water')
    # ---------- ผนังคลอง + ขอบคลอง (coping) + ไฟเส้น ----------
    def stair_gap(x0, x1, y):   # ช่วงขอบคลองที่ถูกตัดตรงขั้นบันได (ฝั่งเหนือของคลองใต้)
        segs = [(x0, x1)]
        if y == town.canal_top:
            for s0, s1 in STAIRS:
                segs = [p for a, b in segs for p in ((a, min(b, s0)), (max(a, s1), b)) if p[1] - p[0] > 1e-6]
        return segs
    runs = {}
    def add_run(key, a0, a1): runs.setdefault(key, []).append((a0, a1))
    def merged(lst):
        out = []
        for a0, a1 in sorted(lst):
            if out and a0 <= out[-1][1] + 1e-6: out[-1] = (out[-1][0], max(out[-1][1], a1))
            else: out.append((a0, a1))
        return out
    town.canal_top = min(y for y in range(H) if all(town.wet(x, y) for x in range(3, W - 3)))   # แถวบนของคลองใต้ (ตลอดความกว้างเมือง)
    for y in range(H):
        for x in range(W):
            if not town.water(x, y): continue
            for dx, dy in ((0, -1), (0, 1), (-1, 0), (1, 0)):
                nx, ny = x + dx, y + dy
                if town.wet(nx, ny): continue
                if dy == -1 and (x, y) in culv_edges: continue          # ปากอุโมงค์ (ทำแยก)
                # ผนังแนวขอบช่อง (หันเข้าหาน้ำ)
                if dy:
                    ey = y if dy < 0 else y + 1
                    G.poly('wall', [(x, ey, 0), (x + 1, ey, 0), (x + 1, ey, Z_BOT), (x, ey, Z_BOT)], (0, -dy, 0))
                else:
                    ex = x if dx < 0 else x + 1
                    G.poly('wall', [(ex, y, 0), (ex, y + 1, 0), (ex, y + 1, Z_BOT), (ex, y, Z_BOT)], (-dx, 0, 0))
                t = town.t(nx, ny)
                if t == HOUSE or (t == TREE and (nx < 2 or nx >= W - 2)): continue   # ใต้อาคาร / ปลายคลองชนแนวต้นไม้ขอบแมพ (โค้ดเดิมก็ไม่มีขอบ)
                # ผนังฝั่งเหนือ (หันหากล้อง): แถบทอง + ไฟเส้นฟ้าใต้ขอบ + บัวเชิงผนังเหนือผิวน้ำ • ขอบคลองฝั่งพื้น — เก็บเป็นช่วงแล้วต่อกันทีหลัง (ไม่มีรอยต่อทุกช่อง)
                if dy == -1:
                    for a0, a1 in stair_gap(x, x + 1, y): add_run(('wall_n', y), a0, a1)
                if dy: add_run(('cope', 'h', y if dy < 0 else y + 1, dy), x, x + 1)      # sd = ทิศเข้าฝั่ง (ขอบอยู่บนพื้น ไม่ยื่นเหนือน้ำ)
                else: add_run(('cope', 'v', x if dx < 0 else x + 1, dx), y, y + 1)
    for key, rs in runs.items():
        for a0, a1 in merged(rs):
            if key[0] == 'wall_n':
                y = key[1]
                G.poly('gold', [(a0, y + 0.004, -0.035), (a1, y + 0.004, -0.035), (a1, y + 0.004, -0.07), (a0, y + 0.004, -0.07)], (0, 1, 0), 'plain')
                G.poly('led', [(a0, y + 0.004, -0.19), (a1, y + 0.004, -0.19), (a1, y + 0.004, -0.215), (a0, y + 0.004, -0.215)], (0, 1, 0), 'plain')
                G.box('marble', a0, a1, y, y + 0.035, Z_WATER - 0.05, Z_WATER + 0.07)   # บัวเชิงผนังเหนือผิวน้ำ
                continue
            # ขอบคลองฝั่งพื้น: บล็อกหินอ่อนเตี้ย + ไฟฟ้าขอบใน + ทองขอบนอก (แบบ TownArt.canals: ทองที่ขอบ + เส้นแสง)
            _, ax, e, sd = key
            if ax == 'h':
                for b0, b1 in (stair_gap(a0, a1, e) if sd < 0 else [(a0, a1)]):
                    yi, yo = e, e + sd * COPE_W
                    G.box('marble', b0, b1, min(yi, yo), max(yi, yo), 0, COPE_H)
                    G.poly('led', [(b0, yi + sd * 0.03, COPE_H + 0.002), (b1, yi + sd * 0.03, COPE_H + 0.002), (b1, yi + sd * 0.055, COPE_H + 0.002), (b0, yi + sd * 0.055, COPE_H + 0.002)], (0, 0, 1), 'plain')
                    G.poly('gold', [(b0, yo - sd * 0.01, COPE_H + 0.002), (b1, yo - sd * 0.01, COPE_H + 0.002), (b1, yo - sd * 0.04, COPE_H + 0.002), (b0, yo - sd * 0.04, COPE_H + 0.002)], (0, 0, 1), 'plain')
            else:
                xi, xo = e, e + sd * COPE_W
                G.box('marble', min(xi, xo), max(xi, xo), a0, a1, 0, COPE_H)
                G.poly('led', [(xi + sd * 0.03, a0, COPE_H + 0.002), (xi + sd * 0.03, a1, COPE_H + 0.002), (xi + sd * 0.055, a1, COPE_H + 0.002), (xi + sd * 0.055, a0, COPE_H + 0.002)], (0, 0, 1), 'plain')
                G.poly('gold', [(xo - sd * 0.01, a0, COPE_H + 0.002), (xo - sd * 0.01, a1, COPE_H + 0.002), (xo - sd * 0.04, a1, COPE_H + 0.002), (xo - sd * 0.04, a0, COPE_H + 0.002)], (0, 0, 1), 'plain')
    # ---------- ซุ้มโค้ง: สะพาน (ทั้งสองหน้า + เพดานโค้ง) และปากอุโมงค์ใต้ร้าน ----------
    def za(u, s0, s1):        # ความสูงขอบโค้ง (วงรีครึ่งบน) ที่ตำแหน่ง u ในช่วง [s0, s1]
        t = (u - s0) / (s1 - s0) * 2 - 1
        return ARCH_SPRING + (ARCH_APEX - ARCH_SPRING) * math.sqrt(max(0.0, 1 - t * t))

    def pt(axis, line, u, z, off=0.0):   # axis 'y' = หน้าอยู่บนเส้น y = line (โค้งตามแกน x) • 'x' = หน้าอยู่บนเส้น x = line
        return (u, line + off, z) if axis == 'y' else (line + off, u, z)

    def nrm(axis, s): return (0, s, 0) if axis == 'y' else (s, 0, 0)

    def arch_face(axis, line, s0, s1, face_dir, deco=True):
        """หน้าผนังมีช่องโค้ง: ช่วง [s0, s1] (กว้างเท่าคลอง) โค้งเว้าข้างละ 0.1 • face_dir = ทิศที่หน้าหัน (+1 = ใต้/ตะวันออก)"""
        a0, a1 = s0 + 0.1, s1 - 0.1; n = 20; N = nrm(axis, face_dir)
        G.poly('wall', [pt(axis, line, s0, 0), pt(axis, line, a0, 0), pt(axis, line, a0, Z_BOT), pt(axis, line, s0, Z_BOT)], N)
        G.poly('wall', [pt(axis, line, a1, 0), pt(axis, line, s1, 0), pt(axis, line, s1, Z_BOT), pt(axis, line, a1, Z_BOT)], N)
        for i in range(n):
            u0, u1 = a0 + (a1 - a0) * i / n, a0 + (a1 - a0) * (i + 1) / n
            G.poly('wall', [pt(axis, line, u0, 0), pt(axis, line, u1, 0), pt(axis, line, u1, za(u1, a0, a1)), pt(axis, line, u0, za(u0, a0, a1))], N)
            if deco:   # ขอบโค้งทอง (archivolt) ลอยหน้าผนัง 4 มม.
                o = face_dir * 0.004
                G.poly('gold', [pt(axis, line, u0, za(u0, a0, a1) + 0.05, o), pt(axis, line, u1, za(u1, a0, a1) + 0.05, o),
                                pt(axis, line, u1, za(u1, a0, a1), o), pt(axis, line, u0, za(u0, a0, a1), o)], N, 'plain')
        if deco:
            m = (a0 + a1) / 2; o0, o1 = (line, line + face_dir * 0.035)
            lo, hi = min(o0, o1), max(o0, o1)
            if axis == 'y': G.box('marble', m - 0.07, m + 0.07, lo, hi, ARCH_APEX - 0.02, ARCH_APEX + 0.12)        # หินหัวโค้ง
            else: G.box('marble', lo, hi, m - 0.07, m + 0.07, ARCH_APEX - 0.02, ARCH_APEX + 0.12)
            G.poly('gold', [pt(axis, line, s0, -0.035, o), pt(axis, line, s1, -0.035, o), pt(axis, line, s1, -0.07, o), pt(axis, line, s0, -0.07, o)], N, 'plain')
        return a0, a1

    def vault(axis, l0, l1, a0, a1):
        """เพดานโค้งใต้สะพาน/อุโมงค์ + ผนังข้างใต้จุดเริ่มโค้ง (ระหว่างเส้น l0..l1) — ใต้สะพานมืดตามจริง"""
        n = 20
        for i in range(n):
            u0, u1 = a0 + (a1 - a0) * i / n, a0 + (a1 - a0) * (i + 1) / n
            G.poly('wall', [pt(axis, l0, u0, za(u0, a0, a1)), pt(axis, l0, u1, za(u1, a0, a1)), pt(axis, l1, u1, za(u1, a0, a1)), pt(axis, l1, u0, za(u0, a0, a1))], (0, 0, -1), 'plain')
        for u, s in ((a0, 1), (a1, -1)):
            nn = (s, 0, 0) if axis == 'y' else (0, s, 0)
            G.poly('wall', [pt(axis, l0, u, ARCH_SPRING), pt(axis, l1, u, ARCH_SPRING), pt(axis, l1, u, Z_BOT), pt(axis, l0, u, Z_BOT)], nn, 'plain')

    for b in town.d['bridges']:
        if b['dir'] == 'h':     # ทางเดินตะวันออก-ตะวันตก ข้ามคลองแนวเหนือ-ใต้: หน้าโค้งที่ y0 (เหนือ) และ y1+1 (ใต้ — เห็นจากกล้อง)
            s0, s1, l0, l1 = b['x0'], b['x1'] + 1, b['y0'], b['y1'] + 1
            arch_face('y', l0, s0, s1, -1); a0, a1 = arch_face('y', l1, s0, s1, 1); vault('y', l0, l1, a0, a1)
        else:                   # ทางเดินเหนือ-ใต้ ข้ามคลองใต้: หน้าโค้งที่ x0 / x1+1 (หันข้าง — กล้องไม่เห็น แต่ทำให้ใต้สะพานมืดถูก)
            s0, s1, l0, l1 = b['y0'], b['y1'] + 1, b['x0'], b['x1'] + 1
            arch_face('x', l0, s0, s1, -1); a0, a1 = arch_face('x', l1, s0, s1, 1); vault('x', l0, l1, a0, a1)
    for (x0, x1, y) in culverts:
        a0, a1 = arch_face('y', y, x0, x1, 1); vault('y', y - CULVERT, y, a0, a1)
        G.poly('dark', [(x0, y - CULVERT, 0), (x1, y - CULVERT, 0), (x1, y - CULVERT, Z_BOT), (x0, y - CULVERT, Z_BOT)], (0, 1, 0), 'plain')
    # ---------- ราว (ลูกกรง) ----------
    def post(x, y, h, w=0.13, z0=0.0, cap=True, kind='post'):
        G.box('marble', x - w / 2, x + w / 2, y - w / 2, y + w / 2, z0, z0 + h)
        if cap: G.box('gold', x - w / 2 - 0.015, x + w / 2 + 0.015, y - w / 2 - 0.015, y + w / 2 + 0.015, z0 + h, z0 + h + 0.04)
        for k in range(5): tall.append((kind, x, y - w / 2 + w * k / 4, z0 + h + 0.04))

    def rail(p0, p1, hf, z0=0.0, kind='rail', spacing=0.2, posts=1.0):
        """ราวลูกกรงตรงจาก p0 → p1 (แนวแกน x หรือ y) • hf(t) = ความสูงยอดราวที่สัดส่วน t (0..1)"""
        (x0, y0), (x1, y1) = p0, p1; L = math.hypot(x1 - x0, y1 - y0); alongx = abs(x1 - x0) > abs(y1 - y0)
        P = lambda t: (x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)
        def seg_box(mat, t0, t1, w, za0, za1):
            (ax, ay), (bx, by) = P(t0), P(t1)
            if alongx: G.box(mat, min(ax, bx), max(ax, bx), ay - w / 2, ay + w / 2, za0, za1)
            else: G.box(mat, ax - w / 2, ax + w / 2, min(ay, by), max(ay, by), za0, za1)
        n = max(1, int(L / 0.25))
        for i in range(n):   # คานล่าง + ราวบน (ทีละท่อน — ยอดราวโค้งได้)
            t0, t1 = i / n, (i + 1) / n; h = hf((t0 + t1) / 2)
            seg_box('marble', t0, t1, 0.12, z0, z0 + 0.09)
            seg_box('marble', t0, t1, 0.11, z0 + h - 0.07, z0 + h)
            seg_box('gold', t0, t1, 0.04, z0 + h, z0 + h + 0.012)
            for k in range(3):
                x_, y_ = P(t0 + (t1 - t0) * k / 2); tall.append((kind, x_, y_, z0 + h + 0.012))
        m = max(1, round(L / spacing))
        for i in range(1, m):   # ลูกกรง
            t = i / m; x_, y_ = P(t); h = hf(t)
            G.box('marble', x_ - 0.03, x_ + 0.03, y_ - 0.03, y_ + 0.03, z0 + 0.09, z0 + h - 0.07)
        k = max(1, round(L / posts))
        for i in range(k + 1):  # เสาเป็นระยะ (หัวทอง)
            t = i / k; x_, y_ = P(t); post(x_, y_, hf(t) + 0.06, z0=z0, kind=kind)
    for b in town.d['bridges']:
        if b['dir'] == 'h':
            xa, xb = b['x0'] + 0.07, b['x1'] + 1 - 0.07   # ปลายราวอยู่เหนือผนังคลอง (เสาหัวราวยื่นทับน้ำ ไม่ทับฝั่ง)
            yn, ys = b['y0'] + 0.06, b['y1'] + 1 - 0.06
            rail((xa, yn), (xb, yn), lambda t: RAIL_N, kind='rail_n')            # ราวเหนือ (ยื่นทับน้ำ)
            rail((xa, ys), (xb, ys), lambda t: RAIL_S - 0.06, kind='rail_s', posts=0.75)   # ราวใต้เตี้ย (ยื่นทับพื้นสะพาน)
        else:
            ya, yb = b['y0'] - 0.15, b['y1'] + 1.15
            for xx in (b['x0'] + 0.06, b['x1'] + 1 - 0.06):   # ราวเหนือ-ใต้ ยอดโค้งกลางสะพาน (ปลายเหนือเตี้ย — มีเสาไฟหัวสะพานอยู่แล้ว)
                rail((xx, ya), (xx, yb), lambda t: 0.36 + 0.34 * math.sin(math.pi * min(1, t * 1.12)), kind='rail_v')
    # ราวริมฝั่งใต้ของคลองใต้ (บนขอบคลองฝั่งหญ้า — ยื่นขึ้นทับน้ำ ไม่ทับทางเดิน)
    cy = town.canal_top
    yb = cy + 2   # ขอบใต้ของคลองใต้ (แถวหญ้า)
    runs, x = [], 2
    while x < W - 2:
        if town.water(x, yb - 1) and town.green(x, yb):
            x1 = x
            while x1 < W - 2 and town.water(x1, yb - 1) and town.green(x1, yb): x1 += 1
            runs.append((x, x1)); x = x1
        else: x += 1
    for (x0, x1) in runs:
        rail((x0 + 0.12, yb + COPE_W / 2), (x1 - 0.12, yb + COPE_W / 2), lambda t: BANK_RAIL, z0=COPE_H, kind='bank')
    # ---------- ขั้นบันไดลงน้ำ (ผนังเหนือของคลองใต้) ----------
    for s0, s1 in STAIRS:
        for k in range(4):
            top = -0.15 * (k + 1) + (0.02 if k == 3 else 0)
            G.box('marble', s0, s1, cy, cy + 0.22 * (k + 1) + (0.25 if k == 3 else 0), Z_BOT, top)
        G.poly('gold', [(s0, cy + 0.004, -0.035), (s1, cy + 0.004, -0.035), (s1, cy + 0.004, -0.07), (s0, cy + 0.004, -0.07)], (0, 1, 0), 'plain')
        for xx in (s0 - 0.08, s1 + 0.08): post(xx, cy - 0.08, 0.26, w=0.12)
    # ---------- ขอบสวน (ฝั่งหญ้า ติดลานหิน) — TownArt.bedCurbs ----------
    runs = {}
    for y in range(2, H - 2):
        for x in range(2, W - 2):
            if not town.green(x, y) or (x, y) in town.planters: continue
            for dx, dy in ((0, -1), (0, 1), (-1, 0), (1, 0)):
                if not town.stone(x + dx, y + dy): continue
                if dy: add_run(('h', y if dy < 0 else y + 1, -dy), x, x + 1)
                else: add_run(('v', x if dx < 0 else x + 1, -dx), y, y + 1)
    for (ax, e, sd), rs in runs.items():
        for a0, a1 in merged(rs):
            a0, a1 = a0 - 0.03, a1 + 0.03
            if ax == 'h':
                yi, yo = e, e + sd * CURB_W
                G.box('marble', a0, a1, min(yi, yo), max(yi, yo), 0, CURB_H)
                G.poly('gold', [(a0, yi + sd * 0.03, CURB_H + 0.002), (a1, yi + sd * 0.03, CURB_H + 0.002), (a1, yi + sd * 0.055, CURB_H + 0.002), (a0, yi + sd * 0.055, CURB_H + 0.002)], (0, 0, 1), 'plain')
                for k in range(int((a1 - a0) * 4) + 1): tall.append(('curb', a0 + k / 4, yi, CURB_H))
            else:
                xi, xo = e, e + sd * CURB_W
                G.box('marble', min(xi, xo), max(xi, xo), a0, a1, 0, CURB_H)
                G.poly('gold', [(xi + sd * 0.03, a0, CURB_H + 0.002), (xi + sd * 0.03, a1, CURB_H + 0.002), (xi + sd * 0.055, a1, CURB_H + 0.002), (xi + sd * 0.055, a0, CURB_H + 0.002)], (0, 0, 1), 'plain')
                for k in range(int(a1 - a0) + 1): tall.append(('curb', xi, a0 + k, CURB_H))
    # ---------- กระถางต้นไม้ (ต้นไม้ Flora วาดทับในเกม) ----------
    for (x, y) in sorted(town.planters):
        a0, a1, b0, b1, w = x - PLANT_PAD, x + 1 + PLANT_PAD, y - PLANT_PAD, y + 1 + PLANT_PAD, 0.16
        G.box('marble', a0, a1, b0, b0 + w, 0, PLANT_H); G.box('marble', a0, a1, b1 - w, b1, 0, PLANT_H)
        G.box('marble', a0, a0 + w, b0 + w, b1 - w, 0, PLANT_H); G.box('marble', a1 - w, a1, b0 + w, b1 - w, 0, PLANT_H)
        G.box('marble', a0 - 0.03, a1 + 0.03, b0 - 0.03, b1 + 0.03, 0, 0.06)               # ฐานกว้างกว่าเล็กน้อย
        G.box('soil', a0 + w, a1 - w, b0 + w, b1 - w, 0, SOIL_Z, 'plain')
        z = PLANT_H + 0.002; i0, i1, j0, j1 = a0 + w - 0.035, a1 - w + 0.035, b0 + w - 0.035, b1 - w + 0.035
        for q in ([(i0, j0, z), (i1, j0, z), (i1, j0 + 0.025, z), (i0, j0 + 0.025, z)], [(i0, j1 - 0.025, z), (i1, j1 - 0.025, z), (i1, j1, z), (i0, j1, z)],
                  [(i0, j0, z), (i0 + 0.025, j0, z), (i0 + 0.025, j1, z), (i0, j1, z)], [(i1 - 0.025, j0, z), (i1, j0, z), (i1, j1, z), (i1 - 0.025, j1, z)]):
            G.poly('gold', q, (0, 0, 1), 'plain')
        G.poly('gold', [(a0, b1 + 0.004, PLANT_H - 0.06), (a1, b1 + 0.004, PLANT_H - 0.06), (a1, b1 + 0.004, PLANT_H - 0.09), (a0, b1 + 0.004, PLANT_H - 0.09)], (0, 1, 0), 'plain')
        for k in range(5): tall.append(('planter', a0 + (a1 - a0) * k / 4, b0, PLANT_H))
    return G, tall


def check(town, tall, quiet=False):
    """ของสูงที่ยื่นขึ้นทับช่องเดินได้: ลึกเข้าไปในช่องเดินได้ทางเหนือเกินขอบช่องของมันเองกี่ช่อง (สรุปต่อชนิด)
    กฎแผน: กระถาง/ขอบสวน ≤ ~0.35 ช่อง • ราวใต้ของสะพานตะวันออก-ตะวันตก ≤ 0.5 ม. (≤ 0.43 ช่อง) • ราวอื่นต้องยื่นทับน้ำ/ตามแนวตัวเอง"""
    worst = {}
    for kind, x, y, z in tall:
        yp = y - SH * z; tx = int(math.floor(x))
        # ระยะที่ยื่นเข้าไปในช่องเดินได้ (ไล่จากจุดฉายขึ้นไปถึงตัวมันเอง)
        over = 0.0
        yy = yp
        while yy < y - 1e-6:
            ty = int(math.floor(yy)); seg_end = min(y, ty + 1)
            if town.walk(tx, ty): over += seg_end - yy
            yy = seg_end
        w = worst.get(kind, (0, None))
        if over > w[0]: worst[kind] = (over, (round(x, 2), round(y, 2), round(z, 2)))
    if not quiet:
        note = {'rail_v': '(ราววิ่งเหนือ-ใต้ ยื่นตามแนวตัวเอง — ทับเฉพาะแถบขอบสะพานที่ราวตั้งอยู่)', 'rail_s': '(ราวใต้เตี้ย — กฎข้อ 5)', 'planter': '(ของเตี้ย)', 'curb': '(ของเตี้ย)'}
        for k, (o, p) in sorted(worst.items()): print(f'  ยื่นทับช่องเดินได้ {k:8s} สูงสุด {o:.2f} ช่อง ที่ {p}', note.get(k, ''))
    return worst


# ================================================================ ฉาก Blender
def build(samples, outdir, preview=False, ss=2.0, crop=None):
    import bpy
    from mathutils import Vector
    os.makedirs(outdir, exist_ok=True)
    town = Town(); W, H = town.w, town.h
    cv = paint(town); col_p, dat_p = save_tex(cv, outdir); del cv
    G, tall = plan(town); check(town, tall)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    # แสงชุดเมือง (tools/fountain3d.py): sun ซ้ายบน → เงาตกขวาล่าง • fill อุ่นจากด้านกล้อง • ท้องฟ้าฟ้าอ่อน
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 3.3; sun.angle = math.radians(5); sun.color = (1.0, 0.95, 0.86)
    so = bpy.data.objects.new('sun', sun); sc.collection.objects.link(so); so.rotation_euler = (math.radians(44), 0, math.radians(-135))
    fill = bpy.data.lights.new('fill', 'SUN'); fill.energy = 0.8; fill.angle = math.radians(20); fill.color = (1.0, 0.93, 0.85); fill.use_shadow = True   # มีเงา: ใต้สะพาน/ในอุโมงค์มืดจริง
    fo = bpy.data.objects.new('fill', fill); sc.collection.objects.link(fo); fo.rotation_euler = (math.radians(60), 0, math.radians(-20))
    wd = bpy.data.worlds.new('w'); sc.world = wd; wd.use_nodes = True
    bg = wd.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (0.56, 0.64, 0.78, 1); bg.inputs['Strength'].default_value = 0.65
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
    try: sc.cycles.use_denoising = True
    except Exception: pass
    sc.cycles.max_bounces = 4; sc.cycles.diffuse_bounces = 2; sc.cycles.glossy_bounces = 2
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    sc.view_settings.exposure = float(os.environ.get('TEXP', -0.2))   # หินอ่อนขาวไม่จ้า (วัดเทียบโทน TownArt เดิม)
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.use_persistent_data = True
    if os.environ.get('BTHREADS'): sc.render.threads_mode = 'FIXED'; sc.render.threads = int(os.environ['BTHREADS'])

    # ---------------- วัสดุ (ทุกวัสดุมีสวิตช์ pass เรืองแสง: 1 = เหลือแต่ emission — glow pass) ----------------
    flags = []

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

    def rng(nt, src, a, b, c=0.0, d=1.0):
        r = nt.nodes.new('ShaderNodeMapRange'); r.inputs['From Min'].default_value = a; r.inputs['From Max'].default_value = b
        r.inputs['To Min'].default_value = c; r.inputs['To Max'].default_value = d; L(nt, src, r.inputs['Value']); return r.outputs['Result']

    def glow_switch(nt, b, ecol=None, estr=None):
        """ต่อท้ายวัสดุ: Mix(ปกติ, Emission ของเส้นแสงล้วน) ด้วยค่า flag (0 ตอนเรนเดอร์ภาพหลัก • 1 ตอน glow pass)"""
        out = nt.nodes['Material Output']; e = nt.nodes.new('ShaderNodeEmission')
        if ecol is None: e.inputs['Strength'].default_value = 0.0; e.inputs['Color'].default_value = (0, 0, 0, 1)
        else:
            L(nt, ecol, e.inputs['Color']) if not isinstance(ecol, tuple) else None
            if isinstance(ecol, tuple): e.inputs['Color'].default_value = (*ecol, 1)
            if isinstance(estr, (int, float)): e.inputs['Strength'].default_value = estr
            else: L(nt, estr, e.inputs['Strength'])
        mx = nt.nodes.new('ShaderNodeMixShader'); v = nt.nodes.new('ShaderNodeValue'); v.outputs[0].default_value = 0.0; flags.append(v)
        L(nt, v.outputs[0], mx.inputs[0]); L(nt, b.outputs[0], mx.inputs[1]); L(nt, e.outputs[0], mx.inputs[2]); L(nt, mx.outputs[0], out.inputs['Surface'])

    def marble(name, tone=1.0, wet=False):
        m, nt, b = new(name)
        tc = nt.nodes.new('ShaderNodeTexCoord')
        nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 1.6; nz.inputs['Detail'].default_value = 6; nz.inputs['Distortion'].default_value = 4.0
        L(nt, tc.outputs['Object'], nz.inputs['Vector'])
        base = tuple(c * tone for c in (0.80, 0.81, 0.84)); vein = tuple(c * tone for c in (0.55, 0.57, 0.63))
        r = nt.nodes.new('ShaderNodeValToRGB'); el = r.color_ramp.elements
        el[0].position, el[0].color = 0.0, (*base, 1); el[1].position, el[1].color = 1.0, (*[c * 0.96 for c in base], 1)
        for p, c in ((0.47, base), (0.495, vein), (0.52, base)): e = el.new(p); e.color = (*c, 1)
        L(nt, nz.outputs['Fac'], r.inputs['Fac']); col = r.outputs['Color']
        if wet:   # ผนังคลอง: ใกล้ผิวน้ำเปียกเข้มอมเขียวฟ้า • ลึกลงไปมืด (แสงสะท้อนน้ำน้อย)
            ge = nt.nodes.new('ShaderNodeNewGeometry'); sp = nt.nodes.new('ShaderNodeSeparateXYZ'); L(nt, ge.outputs['Position'], sp.inputs[0])
            col = mixc(nt, col, (0.36, 0.50, 0.55), rng(nt, sp.outputs['Z'], -0.42, -0.6), 'MULTIPLY')
        L(nt, col, b.inputs['Base Color']); b.inputs['Roughness'].default_value = 0.5; b.inputs['Specular IOR Level'].default_value = 0.35
        if CLAY: b.inputs['Base Color'].default_value = (0.6, 0.6, 0.6, 1); nt.links.remove(b.inputs['Base Color'].links[0])
        glow_switch(nt, b); return m

    def floor_mat():
        m, nt, b = new('floor')
        uvn = nt.nodes.new('ShaderNodeUVMap')
        ti = nt.nodes.new('ShaderNodeTexImage'); ti.image = bpy.data.images.load(col_p); ti.interpolation = 'Cubic'
        td = nt.nodes.new('ShaderNodeTexImage'); td.image = bpy.data.images.load(dat_p); td.image.colorspace_settings.name = 'Non-Color'
        for t_ in (ti, td): L(nt, uvn.outputs['UV'], t_.inputs['Vector']); t_.extension = 'EXTEND'
        sp = nt.nodes.new('ShaderNodeSeparateColor'); L(nt, td.outputs['Color'], sp.inputs[0])
        hgt, emi, met = sp.outputs['Red'], sp.outputs['Green'], sp.outputs['Blue']
        # หินอ่อนขาว: albedo ลดจาก texture (โทน TownArt เป็น "ภาพหลังจัดแสงแล้ว") + ลายนอยส์จางมาก ๆ
        nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.9; nz.inputs['Detail'].default_value = 3
        tc = nt.nodes.new('ShaderNodeTexCoord'); L(nt, tc.outputs['Object'], nz.inputs['Vector'])
        col = mixc(nt, ti.outputs['Color'], (0.92, 0.92, 0.92), 1.0, 'MULTIPLY')
        col = mixc(nt, col, rng(nt, nz.outputs['Fac'], 0.3, 0.7, 0.97, 1.03), 1.0, 'MULTIPLY')
        col = mixc(nt, col, rng(nt, emi, 0, 1, 1.0, 0.12), 1.0, 'MULTIPLY')   # ใต้เส้นแสง: ผิวมืด ให้ emission คุมสี (ฟ้าอิ่ม ไม่ขาวจ้า)
        L(nt, col if not CLAY else ti.outputs['Color'], b.inputs['Base Color'])
        L(nt, rng(nt, met, 0, 1, 0, 0.85), b.inputs['Metallic'])
        L(nt, rng(nt, met, 0, 1, 0.42, 0.3), b.inputs['Roughness'])
        b.inputs['Specular IOR Level'].default_value = 0.35
        b.inputs['Emission Color'].default_value = (1, 1, 1, 1); L(nt, ti.outputs['Color'], b.inputs['Emission Color'])
        es = nt.nodes.new('ShaderNodeMath'); es.operation = 'MULTIPLY'; es.inputs[1].default_value = float(os.environ.get('TEMI', 1.25)); L(nt, emi, es.inputs[0])
        L(nt, es.outputs[0], b.inputs['Emission Strength'])
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.9; bp.inputs['Distance'].default_value = 0.006
        L(nt, hgt, bp.inputs['Height']); L(nt, bp.outputs['Normal'], b.inputs['Normal'])
        glow_switch(nt, b, ti.outputs['Color'], es.outputs[0]); return m

    def gold():
        m, nt, b = new('gold')
        b.inputs['Base Color'].default_value = (1.0, 0.70, 0.26, 1); b.inputs['Metallic'].default_value = 0.75; b.inputs['Roughness'].default_value = 0.32
        b.inputs['Emission Color'].default_value = (1.0, 0.72, 0.3, 1); b.inputs['Emission Strength'].default_value = 0.14
        glow_switch(nt, b); return m

    def led():
        m, nt, b = new('led')
        b.inputs['Base Color'].default_value = (0.3, 0.8, 1.0, 1)
        b.inputs['Emission Color'].default_value = (0.11, 0.66, 1.0, 1); b.inputs['Emission Strength'].default_value = 3.0
        glow_switch(nt, b, (0.11, 0.66, 1.0), 3.0); return m

    def water(name='water', tone=1.0):
        """ผิวน้ำคลอง • deep = น้ำใต้สะพาน/ในอุโมงค์ (มืดกว่า — เห็นผ่านซุ้มโค้งเป็นโพรงมืด)"""
        m, nt, b = new(name)
        tc = nt.nodes.new('ShaderNodeTexCoord')
        nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.35; nz.inputs['Detail'].default_value = 2
        L(nt, tc.outputs['Object'], nz.inputs['Vector'])
        # #4cc3e6 → #2c8fc8 (TownArt.canals) ในเชิงเส้น
        col = mixc(nt, (0.012 * tone, 0.16 * tone, 0.42 * tone), (0.03 * tone, 0.34 * tone, 0.62 * tone), rng(nt, nz.outputs['Fac'], 0.35, 0.65, 0.25, 0.85))
        L(nt, col, b.inputs['Base Color']); L(nt, col, b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = 0.22 * tone
        b.inputs['Roughness'].default_value = 0.16; b.inputs['IOR'].default_value = 1.33; b.inputs['Specular IOR Level'].default_value = 0.3
        rp = nt.nodes.new('ShaderNodeTexNoise'); rp.inputs['Scale'].default_value = 3.2; rp.inputs['Detail'].default_value = 3
        mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1.0, 2.6, 1.0); L(nt, tc.outputs['Object'], mp.inputs['Vector']); L(nt, mp.outputs['Vector'], rp.inputs['Vector'])
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.12; L(nt, rp.outputs['Fac'], bp.inputs['Height']); L(nt, bp.outputs['Normal'], b.inputs['Normal'])
        glow_switch(nt, b); return m

    def soil():
        m, nt, b = new('soil')
        tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 9; nz.inputs['Detail'].default_value = 5
        L(nt, tc.outputs['Object'], nz.inputs['Vector'])
        col = mixc(nt, (0.05, 0.16, 0.03), (0.15, 0.40, 0.07), nz.outputs['Fac'])   # #3d6e2c → #6aa848 (TownArt.planter)
        L(nt, col, b.inputs['Base Color']); b.inputs['Roughness'].default_value = 0.9
        glow_switch(nt, b); return m

    def dark():
        m, nt, b = new('dark'); b.inputs['Base Color'].default_value = (0.01, 0.02, 0.035, 1); b.inputs['Roughness'].default_value = 0.9
        glow_switch(nt, b); return m

    M = {'floor': floor_mat(), 'marble': marble('marble'), 'wall': marble('wall', 0.86, wet=True), 'gold': gold(), 'led': led(),
         'water': water(), 'deep': water('deep', 0.3), 'soil': soil(), 'dark': dark()}
    cm = bpy.data.materials.new('catcher'); M['catcher'] = cm

    # ---------------- วัตถุ ----------------
    cols = {}
    def coll(name):
        if name not in cols: c = bpy.data.collections.new(name); sc.collection.children.link(c); cols[name] = c
        return cols[name]
    import numpy as np
    for (mat, grp), (V, F, U) in G.parts.items():
        me = bpy.data.meshes.new(f'{mat}_{grp}'); me.from_pydata(V, [], F); me.update()
        if U:
            uvl = me.uv_layers.new(name='UVMap')
            loops = np.zeros(len(me.loops), np.int32); me.loops.foreach_get('vertex_index', loops)
            uvv = np.array(U, np.float32)[loops]; uvl.data.foreach_set('uv', uvv.ravel())
        o = bpy.data.objects.new(f'{mat}_{grp}', me); coll('ink' if grp == 'ink' else 'plain').objects.link(o)
        me.materials.append(M[mat])
        for p in me.polygons: p.use_smooth = False
        if mat == 'catcher': o.is_shadow_catcher = True
        print('mesh', mat, grp, len(V), 'verts', len(F), 'faces', flush=True)

    # ---------------- กล้อง (กล้องเกม: ออร์โธเอียง acos(0.76) yaw 0) ----------------
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = W; cam.sensor_fit = 'HORIZONTAL'; cam.clip_end = 600
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
    co.rotation_euler = (TH, 0, 0)
    d = Vector((0, math.sin(TH), -math.cos(TH))); co.location = -d * 200
    s = 0.5 if preview else ss
    sc.render.resolution_x = round(W * PX * s); sc.render.resolution_y = round(H * PX * K * s); sc.render.resolution_percentage = 100
    if crop:
        x0, y0, x1, y1 = crop; r = sc.render; r.use_border = True; r.use_crop_to_border = True
        r.border_min_x, r.border_max_x = x0 / W, x1 / W; r.border_min_y, r.border_max_y = 1 - y1 / H, 1 - y0 / H

    def ink(on):
        sc.render.use_freestyle = on
        if not on: return
        sc.render.line_thickness_mode = 'ABSOLUTE'; sc.render.line_thickness = 1.0
        vl = bpy.context.view_layer; vl.use_freestyle = True
        fs = vl.freestyle_settings; fs.crease_angle = math.radians(120)
        ls = fs.linesets[0] if fs.linesets else fs.linesets.new('ink')
        ls.select_by_visibility = True; ls.select_by_collection = True; ls.collection = cols['ink']
        ls.select_silhouette = True; ls.select_border = True; ls.select_crease = True
        if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new('ink')
        ls.linestyle.color = (0.10, 0.07, 0.05); ls.linestyle.alpha = 0.5; ls.linestyle.thickness = max(0.6, 0.8 * s)

    # ---------- ภาพหลัก ----------
    ink(True); sc.cycles.samples = 8 if preview else samples
    sc.render.filepath = os.path.join(outdir, 'ground.png')
    bpy.ops.render.render(write_still=True); print('เรนเดอร์ →', sc.render.filepath, flush=True)
    # ---------- pass เรืองแสง: ไฟดับ ท้องฟ้าดำ ทุกวัสดุดำยกเว้นเส้นแสง (ทำ glow ตอนติดตั้ง) ----------
    ink(False)
    for v in flags: v.outputs[0].default_value = 1.0
    so.hide_render = True; fo.hide_render = True; bg.inputs['Strength'].default_value = 0.0
    sc.cycles.samples = 6; sc.cycles.use_denoising = False
    sc.render.filepath = os.path.join(outdir, 'glow.png')
    bpy.ops.render.render(write_still=True); print('เรนเดอร์ →', sc.render.filepath, flush=True)
    json.dump({'ss': s, 'crop': crop, 'hash': town.d['hash']}, open(os.path.join(outdir, 'meta.json'), 'w'))


# ================================================================ ติดตั้ง
def install(src):
    import numpy as np
    from PIL import Image, ImageFilter, ImageEnhance
    from slice_sheet import manifest
    town = Town(); W, H = town.w, town.h
    meta = json.load(open(os.path.join(src, 'meta.json')))
    assert not meta.get('crop'), 'ภาพนี้เรนเดอร์แบบ --crop (ไม่ใช่ทั้งแมพ)'
    assert meta['hash'] == town.d['hash'], 'ผังช่องเปลี่ยนหลังเรนเดอร์ — รัน --extract แล้วเรนเดอร์ใหม่'
    out = finish(src, (W * PX, H * PX))
    dst = os.path.join(ROOT, 'assets', IMG_KEY + '.webp'); out.save(dst, 'WEBP', quality=86, method=6)
    print('ติดตั้ง →', dst, out.size, os.path.getsize(dst) // 1024, 'KB')
    manifest()
    js = os.path.join(ROOT, 'js', 'maps.js'); s = open(js, encoding='utf-8').read()
    line = 'const TOWN_BAKE = ' + json.dumps({MAP_ID: {'img': IMG_KEY, 'hash': town.d['hash']}}, separators=(',', ':')) + '; // tools/town3d.py --install'
    s2, n = re.subn(r'^const TOWN_BAKE = .*$', lambda _: line, s, flags=re.M)
    if n: open(js, 'w', encoding='utf-8').write(s2); print('อัปเดต js/maps.js TOWN_BAKE')
    else: print('ไม่พบบรรทัด TOWN_BAKE ใน js/maps.js — ใส่เอง:\n' + line)


def finish(src, S):
    """ภาพเรนเดอร์ (มุมกล้อง) → ภาพพื้นขนาด S (ยืด ×1/0.76) + เรืองฟุ้งเส้นแสง + เงาบนหญ้า — ใช้ทั้งตอนติดตั้งและดูตัวอย่างกรอบ (--look)"""
    import numpy as np
    from PIL import Image, ImageFilter, ImageEnhance
    im = Image.open(os.path.join(src, 'ground.png')).convert('RGBA').resize(S, Image.LANCZOS)
    gl = Image.open(os.path.join(src, 'glow.png')).convert('RGB').resize(S, Image.LANCZOS)
    a = np.asarray(im.getchannel('A')).astype(np.float32) / 255
    rgb = ImageEnhance.Contrast(ImageEnhance.Color(im.convert('RGB')).enhance(1.1)).enhance(1.05)   # อิ่ม/คมขึ้นเล็กน้อยแบบงานอบชิ้นอื่น (หินอ่อนยังไม่จ้า)
    rgb = np.asarray(rgb).astype(np.float32) / 255
    # เรืองฟุ้งของเส้นแสง (แทน shadowBlur ของโค้ดเดิม): เบลอ 2 ขนาด แล้ว screen ทับ — เฉพาะส่วนที่ภาพทึบ (ไม่ฟุ้งออกไปบนหญ้า)
    g1 = np.asarray(gl.filter(ImageFilter.GaussianBlur(2.0))).astype(np.float32) / 255
    g2 = np.asarray(gl.filter(ImageFilter.GaussianBlur(6.0))).astype(np.float32) / 255
    tint = np.array([0.37, 0.83, 1.0], np.float32)
    lum = lambda g: g.max(-1, keepdims=True)
    # บนหินอ่อนขาว screen แทบไม่เห็น → ทับแบบ over (ขาว → ฟ้า เหมือน shadowBlur สีฟ้าของโค้ดเดิม) • ตัวเส้นเอง (pass คม) คงสีจากเรนเดอร์
    g0 = lum(np.asarray(gl).astype(np.float32) / 255)
    al = np.clip(lum(g1) * 0.85 + lum(g2) * 1.3, 0, 0.7) * np.clip(1 - g0 * 1.4, 0, 1) * a[..., None]
    rgb = rgb * (1 - al) + tint * al
    # เงาบนหญ้า (shadow catcher: พิกเซลกึ่งโปร่งสีเข้ม) → เงาเขียวเข้มแบบเงาต้นไม้ของ Flora
    semi = (a < 0.985) & (rgb.sum(-1) < 0.5)
    rgb[semi] = np.array([20, 40, 10], np.float32) / 255; a = np.where(semi, a * 0.8, a)
    return Image.fromarray(np.clip(np.dstack([rgb, a[..., None]]) * 255 + 0.5, 0, 255).astype(np.uint8), 'RGBA')


if __name__ == '__main__':
    a = sys.argv
    arg = lambda k, dflt: a[a.index(k) + 1] if k in a else dflt
    if '--extract' in a: extract()
    elif '--check' in a:
        town = Town(); G, tall = plan(town); check(town, tall)
        cv = paint(town); save_tex(cv, arg('--out', '/tmp/town3d'))
    elif '--install' in a: install(a[a.index('--install') + 1])
    elif '--look' in a:   # ดูตัวอย่างกรอบที่เรนเดอร์ด้วย --crop แบบภาพพื้นในเกม (ไม่ติดตั้ง): --look <out> → <out>/look.png
        src = a[a.index('--look') + 1]; m = json.load(open(os.path.join(src, 'meta.json'))); x0, y0, x1, y1 = m['crop'] or (0, 0, 40, 40)
        finish(src, (round((x1 - x0) * PX), round((y1 - y0) * PX))).save(os.path.join(src, 'look.png')); print('→', os.path.join(src, 'look.png'))
    elif '--render' in a:
        build(int(arg('--samples', 24)), arg('--out', '/tmp/town3d'), '--preview' in a, float(arg('--ss', 2.0)),
              [float(v) for v in arg('--crop', '').split(',')] if '--crop' in a else None)
    else: print(__doc__)
