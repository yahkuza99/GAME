# -*- coding: utf-8 -*-
"""แปลง prompt แชตละ 6 ภาพ (docs/CLASS_ARMED.md, CLASS2_ARMED.md) เป็นแชตละ 4 ภาพ (เจ้าของ: 4 ภาพกำลังดี)
  ชุด A ต่อ Class = เดิน ชาย/หญิง + ตี ชาย/หญิง • ชุด B = สกิลของ 2 Class รวมกัน (ชาย/หญิง × 2)
ใช้: python3 tools/split_prompts.py docs/CLASS_ARMED.md docs/CLASS_ARMED4.md [--skip-walk-attack einherjar]"""
import re, sys

src, dst = sys.argv[1], sys.argv[2]
skip = set(sys.argv[sys.argv.index('--skip') + 1].split(',')) if '--skip' in sys.argv else set()
text = open(src, encoding='utf-8').read()
head, *blocks = re.split(r'\n(?=## \d+\. )', text)
classes = []
# หมายเหตุเฉพาะ Class (งานที่ทำไปแล้ว)
NOTES = {'einherjar': '\n> ท่าตี (ภาพ 3-4) ได้แล้ว ✓ — สั่งแค่ภาพ 1-2 (เดิน) ใหม่ก็พอ: วาง prompt แล้วต่อท้ายว่า `Only draw IMAGE 1 and IMAGE 2.`\n'}
for b in blocks:
    title = re.match(r'## (\d+)\. ([^\n]+)', b)
    attach = re.search(r'แนบ: ([^•\n]+)', b).group(1).strip()
    install = re.search(r'ติดตั้ง: ([^\n]+)', b).group(1)
    prompt = re.search(r'```\n(.*?)\n```', b, re.S).group(1).split('\n')
    get = lambda p, prompt=prompt: next((l for l in prompt if l.startswith(p)), '')
    files = re.findall(r'`([^`]+)`', attach)
    key = re.match(r'\d+_(\w+?)_m\.png', next(f for f in files if f.endswith('_m.png'))).group(1)
    classes.append(dict(n=title.group(1), name=title.group(2), key=key, files=files, prompt=prompt, get=get,
                        atk_act='shoot' if '= `shoot`' in install else 'attack'))

def desc(c, g):
    line = c['get'](f'IMAGE {1 if g == "m" else 2} ')
    return line.split(': ', 1)[1]

out = [re.sub(r'— .*?\n', '— แชตละ 4 ภาพ\n', head.split('\n')[0] + '\n', count=1)]
out.append("""
**แชตละ 4 ภาพ (เจ้าของเลือก):** ชุด A = Class เดียว เดิน+ตี (ชาย/หญิง) • ชุด B = สกิลของ 2 Class (ชาย/หญิง × 2)
ถ้าได้ไม่ครบ พิมพ์ `now draw IMAGE 2` (3, 4) • ส่งภาพกลับมาตอนที่ Claude ตอบเสร็จแล้ว ทีละ 2–4 ภาพ
ท่าเดินเพี้ยน/ก้าวถอยหลัง: `Redraw the WALK image frame by frame copying the mannequin in walk_rig.png (blue = LEFT leg, orange = RIGHT leg), walking forward in every row`
อาวุธเพี้ยน: `Redraw: the weapon must look exactly like the attached reference, same size, in every frame`
""")
chat = 0
for c in classes:
    if c['key'] in skip: continue
    chat += 1
    p = list(c['prompt'])
    p[0] = p[0].replace('Create 6 SEPARATE images', 'Create 4 SEPARATE images')
    p = [l for l in p if not l.startswith('SKILL') and not l.startswith('IMAGE 5') and not l.startswith('IMAGE 6')]
    p = [l.replace('ATTACK and SKILL play once 1-2-3-4', 'ATTACK plays once 1-2-3-4') for l in p]
    note = NOTES.get(c['key'], '')
    out.append(f"""## {chat}. {c['name']} — ชุด A: เดิน + {'ยิง' if c['atk_act'] == 'shoot' else 'ตี'}
{note}
แนบ: {', '.join('`' + f + '`' for f in c['files'])} • ติดตั้ง: ภาพ 1-2 = `walk`, 3-4 = `{c['atk_act']}`

```
{chr(10).join(p)}
```
""")
# ชุด B: สกิลทีละ 2 Class
for i in range(0, len(classes), 2):
    pair = classes[i:i + 2]
    chat += 1
    files = ['template_tpl_walk.png'] + [f for c in pair for f in c['files'] if f not in ('template_tpl_walk.png', 'walk_rig.png')]
    p0 = pair[0]['prompt']
    style = next(l for l in p0 if l.startswith('2D MMORPG'))
    each = next(l for l in p0 if l.startswith('Each image'))
    lines = [f"Create {2 * len(pair)} SEPARATE images (do not merge them). Attached: a blank sheet template and, for each class below, its male and female character designs" +
             (" and its signature WEAPON image." if any('weapon' in f for f in files) else "."),
             "PURPOSE: frame-by-frame SKILL animation sprite sheets for a 2D action RPG game. The game plays the 4 frames of each row once, left to right (1-2-3-4). Every frame must be a clearly different pose, flowing from the frame before, like a professional game animation.",
             style, each]
    imgs, k = [], 1
    for c in pair:
        w = c['get']('WEAPON:'); s = c['get']('SKILL')
        lines.append(f"CLASS {c['name'].split(' (')[0].upper()} — {w}")
        lines.append(f"CLASS {c['name'].split(' (')[0].upper()} — {s}")
        for g, gn in (('m', 'male'), ('f', 'female')):
            imgs.append(f"IMAGE {k} — {gn} SKILL: {desc(c, g)}"); k += 1
    lines += imgs
    names = ' + '.join(c['name'].split(' (')[0] for c in pair)
    inst = ', '.join(f"ภาพ {2 * j + 1}-{2 * j + 2} = `{c['key']}` `cast`" for j, c in enumerate(pair))
    out.append(f"""## {chat}. ชุด B: สกิล {names}

แนบ: {', '.join('`' + f + '`' for f in files)} • ติดตั้ง: {inst}

```
{chr(10).join(lines)}
```
""")
out.insert(1, f"\nรวม {chat} แชต\n")
open(dst, 'w', encoding='utf-8').write('\n'.join(out))
print('wrote', dst, chat, 'chats')
