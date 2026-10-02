# -*- coding: utf-8 -*-
"""แก้ rig ที่กระดูกวางผิด (เช่น Meshy เอาแขนไปไว้ในผม): ย้ายกระดูกตาม JSON → คำนวณน้ำหนักใหม่ทั้งตัว (heat)
→ (ถ้าระบุ) บังคับแผงผม/ผ้าคลุมด้านหลังให้ตามหัว/หลัง → บันทึก .blend (ส่งต่อให้ poses.py)
ใช้: blender -b --factory-startup -P tools/char3d/fix_rig.py -- <meshy.fbx> <fix.json> <out.blend>
fix.json:
  {"bones": {"mixamorig:LeftArm": [[hx,hy,hz],[tx,ty,tz]], ...},   ← พิกัดโลก (ม.) หาได้จาก inspect_rig.py + วัดเส้นกลางแขนจากเนื้อ
   "hair_behind_y": 0.12, "hair_min_z": 0.55, "hair_max_abs_x": 0.75}  ← ไม่ใส่ = ไม่บังคับผม
ตัวอย่างจริง: tools/char3d/examples/wolf_warrior_fix.json
ระดับความสูงแบ่งหัว/คอ/อก (1.25 / 1.05 / 0.85 ม.) จูนจาก Wolf Warrior (สูง 1.88 ม.) — ตัวสูงต่างมากให้ปรับ"""
import bpy, sys, json
from mathutils import Vector as V
argv = sys.argv[sys.argv.index('--') + 1:]
src, cfg, out = argv[0], json.load(open(argv[1], encoding='utf-8')), argv[2]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.fbx(filepath=src)
sc = bpy.context.scene
for o in list(sc.objects):
    if o.type == 'MESH' and not o.vertex_groups: bpy.data.objects.remove(o)
arm = next(o for o in sc.objects if o.type == 'ARMATURE'); mesh = next(o for o in sc.objects if o.type == 'MESH')
if arm.animation_data: arm.animation_data.action = None
bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT')
inv = arm.matrix_world.inverted(); B = cfg.get('bones', {})
for name, (h, t) in B.items():
    eb = arm.data.edit_bones.get(name)
    if eb: eb.use_connect = False; eb.head = inv @ V(h); eb.tail = inv @ V(t)
    else: print('WARN ไม่มีกระดูก', name)
for name in B:
    eb = arm.data.edit_bones.get(name)
    if eb and eb.parent and eb.parent.name in B: eb.use_connect = True
bpy.ops.object.mode_set(mode='OBJECT')
for mod in list(mesh.modifiers): mesh.modifiers.remove(mod)
mesh.vertex_groups.clear(); mesh.parent = None
bpy.ops.object.select_all(action='DESELECT'); mesh.select_set(True); arm.select_set(True); bpy.context.view_layer.objects.active = arm
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
print('REWEIGHT done, unweighted verts =', sum(1 for v in mesh.data.vertices if not v.groups))
if 'hair_behind_y' in cfg:
    G = {g.name: g for g in mesh.vertex_groups}

    def gset(i, ws):
        for g in mesh.vertex_groups:
            try: g.remove([i])
            except RuntimeError: pass
        tot = sum(ws.values())
        for n, w in ws.items(): G[n].add([i], w / tot, 'REPLACE')

    n = 0
    for v in mesh.data.vertices:
        p = mesh.matrix_world @ v.co
        if p.y > cfg['hair_behind_y'] and p.z > cfg.get('hair_min_z', 0.55) and abs(p.x) < cfg.get('hair_max_abs_x', 0.75):
            n += 1
            if p.z > 1.25: ws = {'mixamorig:Head': 1.0}
            elif p.z > 1.05: t = (p.z - 1.05) / 0.2; ws = {'mixamorig:Head': t + 1e-3, 'mixamorig:Neck': 0.3, 'mixamorig:Spine2': 1 - t + 1e-3}
            elif p.z > 0.85: ws = {'mixamorig:Spine2': 0.7, 'mixamorig:Spine1': 0.3}
            else: ws = {'mixamorig:Spine1': 0.5, 'mixamorig:Spine': 0.5}
            gset(v.index, ws)
    print('HAIR pinned', n)
bpy.ops.wm.save_as_mainfile(filepath=out); print('SAVED', out)
