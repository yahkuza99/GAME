# -*- coding: utf-8 -*-
"""ตรวจ rig ของโมเดล 3D: พิมพ์ตำแหน่งกระดูก (พิกัดโลก) + ภาพกระดูกทับเนื้อ (โปร่งครึ่ง) มุมหน้า/ข้าง
ใช้: blender -b --factory-startup -P tools/char3d/inspect_rig.py -- <model.fbx|.blend> <out_prefix> [--tex texture.png]
ได้: <out_prefix>_front.png / _side.png (แดง = ฝั่งซ้ายตัวละคร, ฟ้า = ขวา, เขียว = กลาง) + บรรทัด BONE/MESH ใน stdout
ดูอะไร: กระดูกแขน/ขาต้องอยู่ในแขน/ขาจริง • Meshy ชอบวางแขนลงในผม/ผ้าคลุม (Wolf Warrior: แขนซ้ายทั้งโซ่อยู่ในแผงผม)"""
import bpy, sys, math, argparse
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('out'); ap.add_argument('--tex', default='')
a = ap.parse_args(argv)
if a.src.lower().endswith('.blend'):
    bpy.ops.wm.open_mainfile(filepath=a.src)
else:
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.fbx(filepath=a.src)
sc = bpy.context.scene
for o in list(sc.objects):
    if o.type == 'MESH' and not o.vertex_groups: bpy.data.objects.remove(o)
arm = next(o for o in sc.objects if o.type == 'ARMATURE'); mesh = next(o for o in sc.objects if o.type == 'MESH')
if arm.animation_data: arm.animation_data.action = None
for pb in arm.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
bpy.context.view_layer.update()
for b in arm.data.bones:
    h = arm.matrix_world @ b.head_local; t = arm.matrix_world @ b.tail_local
    print('BONE %-30s head=(%.3f,%.3f,%.3f) tail=(%.3f,%.3f,%.3f)' % (b.name, *h, *t))
vs = [mesh.matrix_world @ v.co for v in mesh.data.vertices]
print('MESH', len(vs), 'verts  x[%.2f..%.2f] y[%.2f..%.2f] z[%.2f..%.2f]' % (
    min(v.x for v in vs), max(v.x for v in vs), min(v.y for v in vs), max(v.y for v in vs), min(v.z for v in vs), max(v.z for v in vs)))
if a.tex:
    img = bpy.data.images.load(a.tex)
    for s in mesh.material_slots:
        nt = s.material.node_tree; bs = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
        tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = img; nt.links.new(tx.outputs['Color'], bs.inputs['Base Color'])
for s in mesh.material_slots:
    bs = next((n for n in s.material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if bs: bs.inputs['Alpha'].default_value = 0.45


def mat(col):
    m = bpy.data.materials.new('m'); m.use_nodes = True
    e = m.node_tree.nodes.new('ShaderNodeEmission'); e.inputs[0].default_value = col; e.inputs[1].default_value = 3
    m.node_tree.links.new(e.outputs[0], m.node_tree.nodes['Material Output'].inputs[0]); return m


ML, MR, MC = mat((1, .1, .1, 1)), mat((.1, .4, 1, 1)), mat((.1, 1, .2, 1))
for b in arm.data.bones:
    if b.name.endswith('_end'): continue
    h = arm.matrix_world @ b.head_local; t = arm.matrix_world @ b.tail_local
    m = ML if 'Left' in b.name else MR if 'Right' in b.name else MC
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.02, location=h); bpy.context.object.data.materials.append(m)
    v = t - h
    if v.length > 1e-4:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.007, depth=v.length, location=(h + t) / 2); c = bpy.context.object
        c.rotation_mode = 'QUATERNION'; c.rotation_quaternion = v.to_track_quat('Z', 'Y'); c.data.materials.append(m)
sc.render.engine = 'BLENDER_EEVEE'; sc.render.resolution_x = 700; sc.render.resolution_y = 800
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (1, 1, 1, 1)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
H = max(v.z for v in vs); cam.data.type = 'ORTHO'; cam.data.ortho_scale = H * 1.25
for name, yaw in (('front', 0), ('side', 90)):
    r = math.radians(yaw)
    cam.location = (4 * math.sin(r), -4 * math.cos(r), H / 2); cam.rotation_euler = (math.radians(90), 0, r)
    sc.render.filepath = f'{a.out}_{name}.png'; bpy.ops.render.render(write_still=True)
