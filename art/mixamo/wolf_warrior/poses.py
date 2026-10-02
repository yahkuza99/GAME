# คีย์ท่าเพิ่มให้ Wolf Warrior (= Berserker F): walk / hurt / dead / sit / attack2
# ฐาน: wolf_fixed_anim.blend (rig แก้แล้ว + ขวานติดมือขวา) • ตัวละครหันหน้า -Y • โลก = พิกัดเกราะ (matrix_world = identity)
# หมุนทุกท่าในพิกัดโลกรอบข้อต่อ (rot_about) แล้วให้ Blender คิดกลับเป็น local เอง
import bpy, sys, math
from mathutils import Vector as V, Matrix as M
blend, outdir = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.open_mainfile(filepath=blend)
sc = bpy.context.scene
arm = next(o for o in sc.objects if o.type == 'ARMATURE')
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


def left_arm(swing, bend=55, out=0.35):
    aim(P('LeftArm'), Rx(-swing) @ V((out, 0, -1)))
    aim(P('LeftForeArm'), Rx(-(swing + bend)) @ V((0.2, 0, -1)))
    aim(P('LeftHand'), Rx(-(swing + bend + 5)) @ V((0.2, 0, -1)))


def spine(lean=0, twist=0, side=0):
    for nm, k in (('Spine', 0.4), ('Spine1', 0.3), ('Spine2', 0.3)):
        rot_about(P(nm), Rx(lean * k) @ Rz(twist * k) @ Ry(side * k))


def right_axe(chop=0, lift=0):
    rot_about(P('RightArm'), Ry(lift))
    rot_about(P('RightArm'), Rx(chop))


FEET = ['LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase']
reset()
REST_MIN = min(min(P(n).head.z, P(n).tail.z) for n in FEET)


def ground():  # เท้าข้างที่ต่ำสุดแตะพื้นเท่าท่ายืน (ท่าเดินแบบอยู่กับที่ ไม่ลอย ไม่จม)
    z = min(min(P(n).head.z, P(n).tail.z) for n in FEET)
    move_hips(V((0, 0, REST_MIN - z)))


mesh = next(o for o in sc.objects if o.type == 'MESH')
_rh = mesh.vertex_groups['mixamorig:RightHand'].index
AXE = {v.index for v in mesh.data.vertices if (mesh.matrix_world @ v.co).x < -0.52 and any(g.group == _rh and g.weight > 0.99 for g in v.groups)}
BODY = [i for i in range(len(mesh.data.vertices)) if i not in AXE]


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
    for side, p in (('Left', ph), ('Right', ph + math.pi)):
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
    leg('Left', 8 * k, 18 * k); leg('Right', -6 * k, 22 * k)
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
    leg('Left', -knee * 0.6, knee); leg('Right', -knee * 0.4, knee * 0.8)
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
    leg('Left', -80, 95, foot_flat=True); leg('Right', -70, 100, foot_flat=True)
    spine(lean=10 + 2.5 * math.sin(ph))
    rot_about(P('Head'), Rx(-6 + 2 * math.sin(ph + 0.6)))
    left_arm(40, bend=60, out=0.5)           # มือซ้ายวางบนเข่า
    right_axe(chop=25, lift=-35)             # ขวานพิงพื้นข้างตัว
    ground_mesh(with_axe=True); key(f)
# ---------------- ATTACK2: 22 เฟรม ง้างเร็ว → ฟาดเฉียงลงหน้า 3 เฟรม → ตามแรง → คืนท่า ----------------
acts['attack2'] = new_action('Attack2')
A2 = [  # f, เอน, บิด, ฟัน, ยกแขน, ย่อ, ก้าวหน้า, แขนซ้าย
    (1, 0, 0, 0, 0, 0.0, 0.00, 5), (4, -12, 24, -55, 65, 0.0, 0.00, 30), (6, -14, 28, -62, 72, 0.01, 0.00, 35),
    (8, 8, -6, 60, 25, -0.03, -0.03, 0), (9, 24, -28, 150, -28, -0.08, -0.07, -30),
    (12, 26, -30, 165, -38, -0.09, -0.07, -35), (16, 18, -20, 140, -25, -0.06, -0.05, -20), (22, 0, 0, 0, 0, 0.0, 0.00, 5)]
for f, lean, twist, chop, lift, drop, step, larm in A2:
    reset()
    k = min(1.0, abs(step) / 0.07)
    move_hips(V((0, step, drop)))
    spine(lean=lean, twist=twist)
    leg('Left', -28 * k, 30 * k); leg('Right', 18 * k, 12 * k)
    right_axe(chop, lift)
    left_arm(larm)
    ground_mesh(); key(f)

for name, act in acts.items():
    arm.animation_data.action = act
    a, b = act.frame_range; sc.frame_start, sc.frame_end = int(a), int(b)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.fbx(filepath=f'{outdir}/{name}.fbx', use_selection=True, object_types={'ARMATURE', 'MESH'},
        add_leaf_bones=False, bake_anim=True, bake_anim_use_all_actions=False, bake_anim_use_nla_strips=False,
        path_mode='STRIP', embed_textures=False)
    print('EXPORT', name, int(a), int(b))
bpy.ops.wm.save_as_mainfile(filepath=blend.replace('.blend', '_poses.blend'))
