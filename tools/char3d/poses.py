# -*- coding: utf-8 -*-
"""คีย์ 7 ท่าให้ตัวละคร 3D (rig ชื่อกระดูก mixamorig:*) → FBX ต่อท่า สำหรับ tools/render_blender.py
ใช้ (Blender 4.4+/5.x):
  blender -b --factory-startup -P tools/char3d/poses.py -- <rig.blend|rig.fbx> <outdir> [--hand Right] [--pin x<-0.52]
      [--actions walk,attack,skill,buff,hurt,dead,sit] [--save out.blend]
  - rig ต้องถูกแล้ว (ดู README: inspect_rig.py → fix_rig.py ถ้ากระดูกเพี้ยน)
  - --hand   มือที่ถืออาวุธ (Right/Left) — อีกมือเป็นมือว่าง (แกว่งแขน/กำหมัด) • ท่าทั้งหมดกลับด้านให้เองถ้าเป็น Left
  - --pin    บังคับจุดที่ตรงเงื่อนไข (พิกัดโลกท่าตั้งต้น เช่น x<-0.52 หรือ x>0.6) ให้ติดมือถืออาวุธ 100% (อาวุธจะไม่ยืด/งอตามขา)
  - ตัวละครต้องหันหน้า -Y (มาตรฐาน FBX จาก Meshy/Mixamo หลัง import) • เลขเฟรม/มุมทั้งหมดอยู่ในตารางของแต่ละท่า ปรับตามตัวได้
  - ทุกเฟรมยกสะโพกให้จุดต่ำสุดของเนื้อโมเดล (ไม่นับอาวุธ) แตะพื้นพอดี — ยกเว้นช่วงกระโดดของ skill
ที่มา: Wolf Warrior = Berserker F (2026-10-02) • ตัวเลขทั้งหมดจูนจากตัวนั้น (chibi ~1.9 ม.)"""
import bpy, sys, os, math, argparse
from mathutils import Vector as V, Matrix as M
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('outdir')
ap.add_argument('--hand', default='Right', choices=['Right', 'Left'])
ap.add_argument('--pin', default='', help='เช่น x<-0.52 — จุดที่ตรงเงื่อนไขติดมือถืออาวุธ 100%%')
ap.add_argument('--actions', default='walk,attack,skill,buff,hurt,dead,sit')
ap.add_argument('--save', default='')
a = ap.parse_args(argv)
if a.src.lower().endswith('.blend'):
    bpy.ops.wm.open_mainfile(filepath=a.src)
else:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=a.src)
sc = bpy.context.scene
arm = next(o for o in sc.objects if o.type == 'ARMATURE')
for o in list(sc.objects):  # Meshy แถม Icosphere (ไม่มี vertex group) มาด้วย
    if o.type == 'MESH' and not o.vertex_groups: bpy.data.objects.remove(o)
mesh = next(o for o in sc.objects if o.type == 'MESH')
if not arm.animation_data: arm.animation_data_create()
arm.animation_data.action = None
W = a.hand; FR = 'Left' if W == 'Right' else 'Right'
WS = 1 if W == 'Right' else -1          # กลับทิศการหมุนเมื่อถืออาวุธมือซ้าย
FS = 1 if FR == 'Left' else -1          # มือว่างอยู่ฝั่ง +x (ซ้ายตัวละคร) หรือ -x
P = lambda n: arm.pose.bones['mixamorig:' + n]
up = lambda: bpy.context.view_layer.update()
Rx = lambda a: M.Rotation(math.radians(a), 3, 'X')
Ry = lambda a: M.Rotation(math.radians(a), 3, 'Y')
Rz = lambda a: M.Rotation(math.radians(a), 3, 'Z')
ALL = [b.name.replace('mixamorig:', '') for b in arm.pose.bones if b.name.startswith('mixamorig:') and not b.name.endswith('_end')]


def rot_about(pb, R, pivot=None):
    pivot = pb.head.copy() if pivot is None else pivot
    pb.matrix = M.Translation(pivot) @ R.to_4x4() @ M.Translation(-pivot) @ pb.matrix; up()


def aim(pb, d):
    cur = (pb.tail - pb.head).normalized()
    rot_about(pb, cur.rotation_difference(d.normalized()).to_matrix())


def reset():
    for b in arm.pose.bones: b.rotation_quaternion = (1, 0, 0, 0); b.location = (0, 0, 0)
    up()


def move_hips(d):
    P('Hips').matrix = M.Translation(d) @ P('Hips').matrix; up()


def leg(side, thigh, knee, foot_flat=True, toe=0.0):
    """thigh: + = เหวี่ยงไปหลัง (องศารอบแกน X) • knee: + = งอ (หน้าแข้งไปหลัง)"""
    rot_about(P(side + 'UpLeg'), Rx(thigh))
    rot_about(P(side + 'Leg'), Rx(knee))
    if foot_flat: rot_about(P(side + 'Foot'), Rx(-(thigh + knee) + toe))


def left_arm(swing, bend=55, out=0.35):  # มือว่าง (ชื่อเดิม left_arm): swing + = แกว่งไปหน้า
    aim(P(FR + 'Arm'), Rx(-swing) @ V((out * FS, 0, -1)))
    aim(P(FR + 'ForeArm'), Rx(-(swing + bend)) @ V((0.2 * FS, 0, -1)))
    aim(P(FR + 'Hand'), Rx(-(swing + bend + 5)) @ V((0.2 * FS, 0, -1)))


def spine(lean=0, twist=0, side=0):  # twist กลับด้านตามมือถืออาวุธ
    for nm, k in (('Spine', 0.4), ('Spine1', 0.3), ('Spine2', 0.3)):
        rot_about(P(nm), Rx(lean * k) @ Rz(twist * k * WS) @ Ry(side * k * WS))


def right_axe(chop=0, lift=0, upright=0.0):  # มือถืออาวุธ (ชื่อเดิม right_axe): chop + = ฟันไปหน้า, lift + = ยกแขนขึ้น
    rot_about(P(W + 'Arm'), Ry(lift * WS))
    rot_about(P(W + 'Arm'), Rx(chop))
    if upright: rot_about(P(W + 'Hand'), Ry(-lift * upright * WS) @ Rx(-chop * upright))  # หมุนข้อมือกลับ → ด้ามตั้งตรง


FEET = ['LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase']
reset()
REST_MIN = min(min(P(n).head.z, P(n).tail.z) for n in FEET)


def ground():  # เท้าข้างที่ต่ำสุดแตะพื้นเท่าท่ายืน (ท่าเดินแบบอยู่กับที่ ไม่ลอย ไม่จม)
    z = min(min(P(n).head.z, P(n).tail.z) for n in FEET)
    move_hips(V((0, 0, REST_MIN - z)))


HAND_G = mesh.vertex_groups['mixamorig:' + W + 'Hand']
if a.pin:  # ปักอาวุธติดมือ
    ax, op, val = a.pin[0], a.pin[1], float(a.pin[2:])
    k = 'xyz'.index(ax); n = 0
    for v in mesh.data.vertices:
        c = (mesh.matrix_world @ v.co)[k]
        if (c < val) if op == '<' else (c > val):
            for g in mesh.vertex_groups:
                try: g.remove([v.index])
                except RuntimeError: pass
            HAND_G.add([v.index], 1.0, 'REPLACE'); n += 1
    print('PIN', n, 'verts ->', HAND_G.name)
WEAPON = {v.index for v in mesh.data.vertices if any(g.group == HAND_G.index and g.weight > 0.99 for g in v.groups)}
BODY = [i for i in range(len(mesh.data.vertices)) if i not in WEAPON]


def ground_mesh(with_axe=False):  # วัดจากเนื้อโมเดลจริง: จุดต่ำสุด (ตัว หรือรวมขวาน) แตะพื้นพอดี
    dg = bpy.context.evaluated_depsgraph_get(); ev = mesh.evaluated_get(dg); me = ev.to_mesh()
    idx = range(len(me.vertices)) if with_axe else BODY
    z = min((mesh.matrix_world @ me.vertices[i].co).z for i in idx); ev.to_mesh_clear()
    move_hips(V((0, 0, -z)))


def key(f):
    for nm in ALL: P(nm).keyframe_insert('rotation_quaternion', frame=f)
    P('Hips').keyframe_insert('location', frame=f)


def new_action(name):
    act = bpy.data.actions.new(name); act.use_fake_user = True; arm.animation_data.action = act; return act


acts = {}
# ---------------- WALK: 24 เฟรม 2 ก้าว (loop) ขวานถือต่ำข้างตัว ----------------
acts['walk'] = new_action('Walk')
for f in range(1, 26):
    ph = 2 * math.pi * (f - 1) / 24
    reset()
    spine(lean=4, twist=5 * math.sin(ph))
    for side, p in ((FR, ph), (W, ph + math.pi)):
        th = -24 * math.sin(p)                              # ลบ = ขาไปหน้า
        kn = 6 + 34 * max(0.0, math.cos(p)) ** 1.5          # งอเข่าตอนเหวี่ยงขาไปหน้า
        leg(side, th, kn, toe=-10 * max(0.0, -math.cos(p)))
    left_arm(-22 * math.sin(ph))
    right_axe(chop=6 * math.sin(ph), lift=4)
    ground_mesh()
    move_hips(V((0, 0, 0.012 * math.cos(2 * ph))))
    key(f)
# ---------------- HURT: 12 เฟรม สะดุ้งถอยครึ่งก้าว ----------------
acts['hurt'] = new_action('Hurt')
HURT = [(1, 0, 0, 0, 5, 0), (3, -26, 16, 0.08, 40, 1), (5, -30, 18, 0.10, 50, 1), (8, -14, 8, 0.05, 25, 0.6), (12, 0, 0, 0, 5, 0)]
for f, lean, head, back, larm, k in HURT:
    reset()
    move_hips(V((0, back, -0.03 * k)))
    spine(lean=lean, twist=-6 * k)
    rot_about(P('Head'), Rx(head))
    leg(FR, 8 * k, 18 * k); leg(W, -6 * k, 22 * k)
    left_arm(larm, bend=30 + 30 * k, out=0.6)
    right_axe(chop=-15 * k, lift=10 * k)
    ground_mesh(); key(f)
# ---------------- DEAD: 24 เฟรม เซ → เข่าทรุด → ล้มหงาย จบนอนนิ่ง ----------------
acts['dead'] = new_action('Dead')
DEAD = [  # f, ล้ม(องศา หงายไปหลัง), เอน, ย่อสะโพก, เข่า, แขนซ้าย
    (1, 0, 0, 0, 0, 5), (4, 0, -18, 0.0, 20, 35), (8, 6, -10, -0.12, 55, 40),
    (12, 35, -8, -0.2, 60, 30), (15, 70, -4, -0.25, 40, 15), (17, 90, 0, -0.27, 25, 0),
    (19, 84, 0, -0.27, 25, 5), (21, 90, 0, -0.27, 20, 0), (24, 90, 0, -0.27, 20, 0)]
for f, fall, lean, drop, knee, larm in DEAD:
    reset()
    spine(lean=lean, twist=-8 if f < 12 else 0)
    leg(FR, -knee * 0.6, knee); leg(W, -knee * 0.4, knee * 0.8)
    left_arm(larm, bend=20, out=0.9)
    right_axe(chop=-30 * min(1, fall / 90), lift=40 * min(1, fall / 90))
    move_hips(V((0, 0, drop)))
    # ล้มทั้งตัวรอบจุดบนพื้นด้านหลังเท้า (หงายไปทาง +Y)
    if fall: rot_about(P('Hips'), Rx(-fall), V((0, 0.12, 0.0)))
    ground_mesh(with_axe=True); key(f)
# ---------------- SIT: 24 เฟรม (loop) นั่งพื้น เข่าตั้ง หายใจ ----------------
acts['sit'] = new_action('Sit')
for f in range(1, 26):
    ph = 2 * math.pi * (f - 1) / 24
    reset()
    move_hips(V((0, 0.05, -0.36)))
    leg(FR, -80, 95, foot_flat=True); leg(W, -70, 100, foot_flat=True)
    spine(lean=10 + 2.5 * math.sin(ph))
    rot_about(P('Head'), Rx(-6 + 2 * math.sin(ph + 0.6)))
    left_arm(40, bend=60, out=0.5)           # มือซ้ายวางบนเข่า
    right_axe(chop=25, lift=-35)             # ขวานพิงพื้นข้างตัว
    ground_mesh(with_axe=True); key(f)
# ---------------- ATTACK2: 22 เฟรม ง้างเร็ว → ฟาดเฉียงลงหน้า 3 เฟรม → ตามแรง → คืนท่า ----------------
acts['attack'] = new_action('Attack')
A2 = [  # f, เอน, บิด, ฟัน, ยกแขน, ย่อ, ก้าวหน้า, แขนซ้าย
    (1, 0, 0, 0, 0, 0.0, 0.00, 5), (4, -12, 24, -55, 65, 0.0, 0.00, 30), (6, -14, 28, -62, 72, 0.01, 0.00, 35),
    (8, 8, -6, 60, 25, -0.03, -0.03, 0), (9, 24, -28, 150, -28, -0.08, -0.07, -30),
    (12, 26, -30, 165, -38, -0.09, -0.07, -35), (16, 18, -20, 140, -25, -0.06, -0.05, -20), (22, 0, 0, 0, 0, 0.0, 0.00, 5)]
for f, lean, twist, chop, lift, drop, step, larm in A2:
    reset()
    k = min(1.0, abs(step) / 0.07)
    move_hips(V((0, step, drop)))
    spine(lean=lean, twist=twist)
    leg(FR, -28 * k, 30 * k); leg(W, 18 * k, 12 * k)
    right_axe(chop, lift)
    left_arm(larm)
    ground_mesh(); key(f)

# ---------------- BUFF: 20 เฟรม ตั้งหลัก → ชูขวานขึ้นฟ้า + กำหมัดซ้าย เงยหน้าคำราม → ค้าง f9–f13 → คืนท่า ----------------
acts['buff'] = new_action('Buff')
BUFF = [  # f, ย่อ(0..1), เอน, เงยหัว, ฟัน, ยกแขน, แขนซ้าย, งอศอกซ้าย, ยืดตัว
    (1, 0, 0, 0, 0, 0, 5, 55, 0.0), (4, 1, 10, 8, -10, -5, 40, 110, 0.0), (6, 0.6, 4, 0, -15, 20, 70, 90, 0.0),
    (9, 0, -14, -26, -25, 80, 150, 20, 0.02), (11, 0, -16, -28, -27, 82, 155, 15, 0.025), (13, 0, -14, -26, -25, 80, 150, 20, 0.02),
    (17, 0.3, -4, -8, -10, 30, 60, 50, 0.0), (20, 0, 0, 0, 0, 0, 5, 55, 0.0)]
for f, crouch, lean, head, chop, lift, larm, lbend, rise in BUFF:
    reset()
    spine(lean=lean)
    rot_about(P('Head'), Rx(head))
    leg(FR, -10 * crouch, 30 * crouch); leg(W, 6 * crouch, 30 * crouch)
    right_axe(chop, lift, upright=0.9 if lift > 40 else 0.0)
    left_arm(larm, bend=lbend, out=0.45)
    ground_mesh()
    if rise: move_hips(V((0, 0, rise)))   # เขย่งยืดตัวตอนคำราม
    key(f)
# ---------------- SKILL: 22 เฟรม ย่อ → กระโดดง้างขวานเหนือหัว → ทุบลงพื้นด้านหน้า → ค้างแรงกระแทก → คืนท่า ----------------
acts['skill'] = new_action('Skill')
SK = [  # f, สูงจากพื้น(ม.), ย่อ(0..1), ขาพับกลางอากาศ(0..1), เอน, ฟัน, ยกแขน, ก้าวหน้า, แขนซ้าย
    (1, 0, 0, 0, 0, 0, 0, 0.0, 5), (4, 0, 1, 0, 8, -35, 35, 0.0, -20),
    (7, 0.30, 0, 1, -10, -70, 75, -0.04, 60), (10, 0.42, 0, 1, -14, -80, 80, -0.07, 70),
    (12, 0.20, 0, 0.6, 10, 40, 30, -0.10, 20), (13, 0, 1.2, 0, 32, 160, -35, -0.12, -35),
    (17, 0, 1.0, 0, 30, 158, -33, -0.12, -30), (22, 0, 0, 0, 0, 0, 0, 0.0, 5)]
for f, air, crouch, tuck, lean, chop, lift, step, larm in SK:
    reset()
    move_hips(V((0, step, 0)))
    spine(lean=lean, twist=-10 if chop > 100 else 0)
    if tuck: leg(FR, -45 * tuck, 75 * tuck); leg(W, -25 * tuck, 85 * tuck)
    else: leg(FR, -30 * crouch, 55 * crouch); leg(W, 15 * crouch, 45 * crouch)
    right_axe(chop, lift)
    left_arm(larm)
    ground_mesh()
    if air: move_hips(V((0, 0, air)))
    key(f)

want = a.actions.split(','); os.makedirs(a.outdir, exist_ok=True)
for name, act in acts.items():
    if name not in want: continue
    arm.animation_data.action = act
    fa, fb = act.frame_range; sc.frame_start, sc.frame_end = int(fa), int(fb)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.fbx(filepath=f'{a.outdir}/{name}.fbx', use_selection=True, object_types={'ARMATURE', 'MESH'},
        add_leaf_bones=False, bake_anim=True, bake_anim_use_all_actions=False, bake_anim_use_nla_strips=False,
        path_mode='STRIP', embed_textures=False)
    print('EXPORT', name, int(fa), int(fb))
if a.save: bpy.ops.wm.save_as_mainfile(filepath=a.save)
