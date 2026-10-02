# -*- coding: utf-8 -*-
"""สร้างหน้าเว็บ Midgard Codex (เอกสารเกมค้นหา/กรองได้) จาก JSON ที่ dump.js ดึงมา + ไอคอนจริงใน assets/
ใช้:  NODE_PATH=$(npm root -g) node tools/reference_web/dump.js data.json
      python3 tools/reference_web/build.py data.json out.html"""
import sys, os, json, base64, io
from PIL import Image

HERE = os.path.dirname(__file__)
ROOT = os.path.join(HERE, '..', '..', 'assets')
data_path, out_path = sys.argv[1], sys.argv[2]
D = json.load(open(data_path, encoding='utf-8'))

def icon(key, size):
    p = os.path.join(ROOT, key + '.webp')
    if not os.path.exists(p): return None
    im = Image.open(p).convert('RGBA'); im.thumbnail((size, size), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=82, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()

IC = {}
for s in D['skills']:
    u = icon('skill_' + s['id'], 56)
    if u: IC['s:' + s['id']] = u
for m in D['mobs']:
    u = icon('mob_' + m['id'], 72)
    if u: IC['m:' + m['id']] = u
for i in D['items']:
    u = icon('item_' + i['id'], 44)
    if u: IC['i:' + i['id']] = u
for j in D['jobs']:
    u = icon('emblem_' + j, 56)
    if u: IC['e:' + j] = u
D['icons'] = IC
tpl = open(os.path.join(HERE, 'template.html'), encoding='utf-8').read()
html = tpl.replace('/*__DATA__*/null', json.dumps(D, ensure_ascii=False, separators=(',', ':')))
open(out_path, 'w', encoding='utf-8').write(html)
print('wrote', out_path, round(len(html) / 1024), 'KB', len(IC), 'icons')
