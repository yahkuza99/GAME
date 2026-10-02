# -*- coding: utf-8 -*-
"""วัดจุดต่ำสุด/สูงสุดของเนื้อโมเดลทุก ~ไม่กี่เฟรม ต่อท่า (ตรวจตัวลอย/จมพื้นก่อนเรนเดอร์ชีต)
ใช้: blender -b --factory-startup -P tools/char3d/ground_check.py -- <a.fbx> [b.fbx ...]
ได้: GROUND <ไฟล์> [(เฟรม, zต่ำสุด, zสูงสุด) ...] • เกณฑ์: zต่ำสุด ≈ 0 (±0.01) ทุกเฟรมที่ยืนบนพื้น
ติดลบมาก = มีส่วนจมพื้น → หลังตัดพื้นในชีต ตัวจะลอย (Meshy run.fbx เดิม: ขวานจม −16 ซม.)"""
import bpy, sys, os
for f in sys.argv[sys.argv.index('--') + 1:]:
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.fbx(filepath=f)
    sc = bpy.context.scene
    arm = next(o for o in sc.objects if o.type == 'ARMATURE'); mesh = next(o for o in sc.objects if o.type == 'MESH' and o.vertex_groups)
    act = arm.animation_data.action; a, b = map(int, act.frame_range); res = []
    for fr in range(a, b + 1, max(1, (b - a) // 6)):
        sc.frame_set(fr); dg = bpy.context.evaluated_depsgraph_get(); ev = mesh.evaluated_get(dg); me = ev.to_mesh()
        zs = [(mesh.matrix_world @ v.co).z for v in me.vertices]; res.append((fr, round(min(zs), 3), round(max(zs), 3))); ev.to_mesh_clear()
    print('GROUND', os.path.basename(f), res)
