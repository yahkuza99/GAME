# -*- coding: utf-8 -*-
"""เรนเดอร์โมเดล 3D (Mixamo .fbx ที่มีท่าทาง หรือ .obj นิ่ง) เป็นชีตท่าทางของเกม — ใช้ Blender แบบโมดูล (bpy)
ติดตั้ง bpy ในสภาพแวดล้อมแยก (bpy ต้องใช้ numpy 1.x ชนกับ opencv ของเครื่อง):
    python3 -m venv /tmp/bvenv && /tmp/bvenv/bin/pip install bpy
ใช้:
    /tmp/bvenv/bin/python tools/render_blender.py <model.fbx|.obj|.glb> <out.png> [--frames 8] [--dirs S,SW,W,NW,N]
        [--size 512] [--pitch 25] [--yaw0 0] [--tex texture.png] [--loop] [--range 0,1] [--anim walk.fbx]
  - ไฟล์ใหญ่: โหลดตัวละคร With Skin ครั้งเดียว + ท่าแบบ Without Skin (ไฟล์ละไม่กี่ร้อย KB) แล้วใช้ --anim
ได้: ชีต N คอลัมน์ (เฟรม) × จำนวนทิศ (แถว) บนพื้นขาว → ติดตั้งด้วย sprite_std.py install <out.png> <key> <ท่า> --grid Nx5 --dirs S,SW,W,NW,N
  - กล้องตั้งฉาก (orthographic) มองลง pitch องศา ขนาดตัวคงที่ทุกเฟรมทุกทิศ (คิดจากกรอบรวมของทั้งท่า)
  - --loop (เดิน/ยืน): ไม่เอาเฟรมสุดท้ายที่ซ้ำกับเฟรมแรก
  - --yaw0: หมุนแก้ถ้าโมเดลหันผิดทาง (ทิศ S ต้องเห็นหน้า)"""
import sys, math, argparse, os
import bpy, mathutils

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
ap = argparse.ArgumentParser()
ap.add_argument('model'); ap.add_argument('out')
ap.add_argument('--frames', type=int, default=8); ap.add_argument('--dirs', default='S,SW,W,NW,N')
ap.add_argument('--size', type=int, default=512); ap.add_argument('--pitch', type=float, default=25)
ap.add_argument('--yaw0', type=float, default=0); ap.add_argument('--tex', default='')
ap.add_argument('--loop', action='store_true'); ap.add_argument('--range', default='0,1')
ap.add_argument('--style', default='toon', help='toon = แสงคอนทราสต์สูง + เส้นขอบ (เข้ากับภาพวาด Class อื่น) • flat = แสงนุ่มแบบเดิม')
ap.add_argument('--frame', default='', help='กล้องคงที่ข้ามท่า: "ortho,centerZ" (ค่าที่พิมพ์ออกมาตอนเรนเดอร์ท่าเดิน) — ทุกท่าของตัวเดียวกันต้องใช้ค่าเดียวกัน ตัวจะได้ขนาดเท่ากัน')
ap.add_argument('--pick', default='', help='เลือกเฟรมเอง (เลขเฟรมในไฟล์) เช่น 1,4,7,10,13,17 — แทนการสุ่มเท่า ๆ กัน')
ap.add_argument('--anim', default='', help='ไฟล์ท่า Mixamo แบบ Without Skin (ใช้กับโมเดล With Skin ตัวเดียว — ไฟล์เล็ก)')
a = ap.parse_args(argv)

YAW = {'S': 0, 'SW': 45, 'W': 90, 'NW': 135, 'N': 180, 'NE': 225, 'E': 270, 'SE': 315}
bpy.ops.wm.read_factory_settings(use_empty=True)
ext = os.path.splitext(a.model)[1].lower()
if ext == '.fbx': bpy.ops.import_scene.fbx(filepath=a.model)
elif ext == '.dae': bpy.ops.wm.collada_import(filepath=a.model)
elif ext in ('.glb', '.gltf'): bpy.ops.import_scene.gltf(filepath=a.model)
else: bpy.ops.wm.obj_import(filepath=a.model)
sc = bpy.context.scene
meshes = [o for o in sc.objects if o.type == 'MESH']
arm = next((o for o in sc.objects if o.type == 'ARMATURE'), None)
if a.anim and arm:  # ใส่ท่าจากไฟล์ท่าเปล่า (กระดูกชื่อเดียวกันเพราะมาจาก Mixamo ตัวเดียวกัน) แล้วลบโครงที่มากับไฟล์ท่า
    before = set(sc.objects)
    bpy.ops.import_scene.fbx(filepath=a.anim) if a.anim.lower().endswith('.fbx') else bpy.ops.import_scene.gltf(filepath=a.anim)
    new = [o for o in sc.objects if o not in before]
    src = next((o for o in new if o.type == 'ARMATURE' and o.animation_data and o.animation_data.action), None)
    if src:
        if not arm.animation_data: arm.animation_data_create()
        arm.animation_data.action = src.animation_data.action
        if hasattr(src.animation_data, 'action_slot') and src.animation_data.action_slot:  # Blender 4.4+ (action slots)
            try: arm.animation_data.action_slot = src.animation_data.action_slot
            except Exception: pass
    for o in new: bpy.data.objects.remove(o, do_unlink=True)

# texture (Mixamo ส่ง fbx ที่ฝัง texture มาให้อยู่แล้ว • obj ใช้ --tex)
if a.tex:
    img = bpy.data.images.load(os.path.abspath(a.tex))
    for o in meshes:
        for slot in o.material_slots or []:
            m = slot.material
            if not m: continue
            m.use_nodes = True; nt = m.node_tree
            bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if not bsdf: continue
            # ภาพที่ไฟล์อ้างถึงหาไม่เจอ (ชี้ไปโฟลเดอร์ .fbm ของเครื่องอื่น) → ตัดทิ้งทั้งหมด แล้วใช้ --tex เป็นสีพื้นแทน
            for l in list(nt.links):
                if l.to_node == bsdf and l.from_node.type == 'TEX_IMAGE': nt.links.remove(l)
                elif l.to_node.type == 'NORMAL_MAP': nt.links.remove(l)
            t = nt.nodes.new('ShaderNodeTexImage'); t.image = img
            nt.links.new(t.outputs['Color'], bsdf.inputs['Base Color'])
for o in meshes:  # ผิวไม่มันวาว ดูเป็นงานวาดมากกว่า
    for slot in o.material_slots or []:
        m = slot.material
        if m and m.use_nodes:
            for n in m.node_tree.nodes:
                if n.type == 'BSDF_PRINCIPLED':
                    if 'Roughness' in n.inputs: n.inputs['Roughness'].default_value = 1.0
                    for k in ('Specular IOR Level', 'Specular'):
                        if k in n.inputs: n.inputs[k].default_value = 0.0

# ช่วงเฟรมของท่า
act = arm.animation_data.action if arm and arm.animation_data and arm.animation_data.action else None
f0, f1 = (int(act.frame_range[0]), int(act.frame_range[1])) if act else (1, 1)
r0, r1 = map(float, a.range.split(','))
s0, s1 = f0 + (f1 - f0) * r0, f0 + (f1 - f0) * r1
N = a.frames
frames = [s0 + (s1 - s0) * i / (N if a.loop else max(1, N - 1)) for i in range(N)] if act else [f0] * 1
if a.pick and act: frames = [float(x) for x in a.pick.split(',')]

# กรอบรวมของทั้งท่า (ทุกเฟรม) → ขนาดกล้องคงที่
def bbox_world():
    dg = bpy.context.evaluated_depsgraph_get(); lo = mathutils.Vector((1e9,) * 3); hi = -lo
    for o in meshes:
        oe = o.evaluated_get(dg); me = oe.to_mesh()
        for v in me.vertices:
            p = oe.matrix_world @ v.co
            lo = mathutils.Vector(map(min, lo, p)); hi = mathutils.Vector(map(max, hi, p))
        oe.to_mesh_clear()
    return lo, hi
LO = mathutils.Vector((1e9,) * 3); HI = -LO
for f in (frames if act else [f0]):
    sc.frame_set(int(round(f)), subframe=f - int(round(f)))
    lo, hi = bbox_world(); LO = mathutils.Vector(map(min, LO, lo)); HI = mathutils.Vector(map(max, HI, hi))
H = HI.z - LO.z; W = max(HI.x - LO.x, HI.y - LO.y)
# จุดหมุน = กลางเท้าในเฟรมแรก (ตัวละครเดินอยู่กับที่) • Mixamo ที่ไม่ได้ติ๊ก In Place จะเลื่อนไปข้างหน้า → ล็อกราก
if arm:
    root = next((b for b in arm.pose.bones if 'hips' in b.name.lower()), None)
center = mathutils.Vector(((LO.x + HI.x) / 2, (LO.y + HI.y) / 2, LO.z))

# กล้อง orthographic + แสง
ortho, cz = max(H, W) * 1.25, center.z + H * 0.45
if a.frame: ortho, cz = map(float, a.frame.split(','))
print(f'FRAME {ortho:.4f},{cz:.4f}  (ใช้ --frame นี้กับท่าอื่นของตัวเดียวกัน)')
cam_d = bpy.data.cameras.new('cam'); cam_d.type = 'ORTHO'; cam_d.ortho_scale = ortho
cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
pivot = bpy.data.objects.new('pivot', None); sc.collection.objects.link(pivot); pivot.location = mathutils.Vector((center.x, center.y, cz))
cam.parent = pivot
p = math.radians(a.pitch); dist = ortho * 5
cam.location = (0, -dist * math.cos(p), dist * math.sin(p)); cam.rotation_euler = (math.pi / 2 - p, 0, 0)
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 2.2
sun.rotation_euler = (math.radians(40), math.radians(-25), math.radians(-30)); sc.collection.objects.link(sun); sun.parent = pivot
world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (1, 1, 1, 1); world.node_tree.nodes['Background'].inputs[1].default_value = 0.9
sc.render.engine = 'CYCLES'  # Eevee ต้องใช้ GPU/EGL — เครื่องไม่มีจอใช้ Cycles CPU แทน
sc.cycles.device = 'CPU'; sc.cycles.samples = 24; sc.cycles.use_denoising = False
sc.cycles.max_bounces = 2; sc.render.threads_mode = 'AUTO'
sc.render.film_transparent = True
sc.render.resolution_x = sc.render.resolution_y = a.size
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
try: sc.view_settings.view_transform = 'Standard'
except Exception: pass
if a.style == 'toon':  # ให้ดูเป็นภาพวาดมากขึ้น: แสงหลักแรง เงาเข้ม + เส้นขอบดำบาง (Freestyle)
    sun.data.energy = 3.6; world.node_tree.nodes['Background'].inputs[1].default_value = 0.45
    try: sc.view_settings.look = 'Medium High Contrast'
    except Exception: pass
    sc.render.use_freestyle = True; sc.render.line_thickness_mode = 'ABSOLUTE'; sc.render.line_thickness = max(1.0, a.size / 320)
    ls = bpy.context.view_layer.freestyle_settings.linesets[0] if bpy.context.view_layer.freestyle_settings.linesets else bpy.context.view_layer.freestyle_settings.linesets.new('L')
    ls.select_by_visibility = True; ls.select_silhouette = True; ls.select_border = True; ls.select_crease = False
    if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new('line')
    ls.linestyle.color = (0.08, 0.05, 0.04); ls.linestyle.thickness = max(1.0, a.size / 320)

dirs = a.dirs.split(',')
tmp = os.path.splitext(a.out)[0] + '_frames'; os.makedirs(tmp, exist_ok=True)
for di, d in enumerate(dirs):
    pivot.rotation_euler = (0, 0, math.radians(YAW[d] + a.yaw0))
    for fi, f in enumerate(frames):
        if act: sc.frame_set(int(round(f)), subframe=f - int(round(f)))
        sc.render.filepath = os.path.join(tmp, f'{di}_{fi}.png')
        bpy.ops.render.render(write_still=True)
    print('dir', d, 'done')

# ประกอบชีต (ใช้ PIL จาก venv ถ้ามี ไม่มีก็ใช้ bpy image)
try:
    from PIL import Image
    # พื้นโปร่งใส (ไม่ใช่พื้นขาว): ตัวละครขน/ผมขาวจะไม่ถูกลบไปพร้อมพื้นตอนติดตั้ง • sprite_std ใช้ภาพโปร่งใสได้ตรง ๆ
    S = a.size; sheet = Image.new('RGBA', (S * len(frames), S * len(dirs)), (0, 0, 0, 0))
    for di in range(len(dirs)):
        for fi in range(len(frames)):
            sheet.alpha_composite(Image.open(os.path.join(tmp, f'{di}_{fi}.png')).convert('RGBA'), (fi * S, di * S))
    sheet.save(a.out); print('sheet', a.out, sheet.size)
except ImportError:
    print('frames in', tmp, '(install pillow in the venv to build the sheet)')
