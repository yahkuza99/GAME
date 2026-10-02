# -*- coding: utf-8 -*-
"""เรนเดอร์โมเดล 3D (Mixamo .fbx ที่มีท่าทาง หรือ .obj นิ่ง) เป็นชีตท่าทางของเกม — ใช้ Blender แบบโมดูล (bpy)
ติดตั้ง bpy ในสภาพแวดล้อมแยก (bpy ต้องใช้ numpy 1.x ชนกับ opencv ของเครื่อง):
    python3 -m venv /tmp/bvenv && /tmp/bvenv/bin/pip install bpy
ใช้:
    /tmp/bvenv/bin/python tools/render_blender.py <model.fbx|.obj|.glb> <out.png> [--frames 8] [--dirs S,SW,W,NW,N]
        [--size 512] [--pitch 25] [--yaw0 0] [--tex texture.png] [--loop] [--range 0,1]
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

# texture (Mixamo ส่ง fbx ที่ฝัง texture มาให้อยู่แล้ว • obj ใช้ --tex)
if a.tex:
    img = bpy.data.images.load(os.path.abspath(a.tex))
    for o in meshes:
        for slot in o.material_slots or []:
            m = slot.material
            if not m: continue
            m.use_nodes = True; nt = m.node_tree
            bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if bsdf and not bsdf.inputs['Base Color'].is_linked:
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
cam_d = bpy.data.cameras.new('cam'); cam_d.type = 'ORTHO'; cam_d.ortho_scale = max(H, W) * 1.25
cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
pivot = bpy.data.objects.new('pivot', None); sc.collection.objects.link(pivot); pivot.location = center + mathutils.Vector((0, 0, H * 0.45))
cam.parent = pivot
p = math.radians(a.pitch); dist = max(H, W) * 6
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
    S = a.size; sheet = Image.new('RGBA', (S * len(frames), S * len(dirs)), (255, 255, 255, 255))
    for di in range(len(dirs)):
        for fi in range(len(frames)):
            sheet.alpha_composite(Image.open(os.path.join(tmp, f'{di}_{fi}.png')).convert('RGBA'), (fi * S, di * S))
    sheet.convert('RGB').save(a.out); print('sheet', a.out, sheet.size)
except ImportError:
    print('frames in', tmp, '(install pillow in the venv to build the sheet)')
