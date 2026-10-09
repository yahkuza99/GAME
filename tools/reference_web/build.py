# -*- coding: utf-8 -*-
"""สร้างหน้าเว็บ Valhalla Codex (เอกสารเกมค้นหา/กรองได้) จาก JSON ที่ dump.js ดึงมา + ไอคอนจริงใน assets/
ใช้:  NODE_PATH=$(npm root -g) node tools/reference_web/dump.js data.json
      python3 tools/reference_web/build.py data.json out.html
ไอคอน: ไฟล์ใน assets/ ก่อน • ไม่มีไฟล์ (สกิล/ตรา Class ที่เกมย้อมสีจากภาพอื่น เช่น Class 3) = ใช้ภาพที่ dump.js ให้เกมย้อมมา (aliasIcons)"""
import sys, os, json, base64, io
from PIL import Image

HERE = os.path.dirname(__file__)
ROOT = os.path.join(HERE, '..', '..', 'assets')
data_path, out_path = sys.argv[1], sys.argv[2]
D = json.load(open(data_path, encoding='utf-8'))
ALIAS = D.pop('aliasIcons', {}) or {}

def icon(key, size):
    p = os.path.join(ROOT, key + '.webp')
    if not os.path.exists(p): return ALIAS.get(key)
    im = Image.open(p).convert('RGBA'); im.thumbnail((size, size), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=82, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()

IC = {}
def put(k, u):
    if u: IC[k] = u
for s in D['skills']: put('s:' + s['id'], icon('skill_' + s['id'], 56))
for m in D['mobs']: put('m:' + m['id'], icon('mob_' + m['id'], 72))
for i in D['items']: put('i:' + i['id'], icon('item_' + i['id'], 44))
for j in D['jobs']:
    put('e:' + j, icon('emblem_' + j, 56))
    for g in ('m', 'f'): put('j:%s_%s' % (j, g), icon('job_%s_%s' % (j, g), 240))  # ภาพ Class ชาย/หญิง
for r in D.get('runes', []): put('r:' + r['id'], icon(r['art'], 48))           # Skill Rune / Oath (หินรูน 3D)
for r in (D.get('hunt') or {}).get('list', []): put('h:' + r['id'], icon('rune_' + r['id'], 48))  # Hunt Rune
D['icons'] = IC

# ภาพหน้าจอเกม (ไม่บังคับ): อาร์กิวเมนต์ที่ 3 = โฟลเดอร์จาก tools/reference_web/shots.js (manifest.json + *.jpg) → แท็บ "ภาพเกม"
D['shots'] = []
if len(sys.argv) > 3 and os.path.exists(os.path.join(sys.argv[3], 'manifest.json')):
    man = json.load(open(os.path.join(sys.argv[3], 'manifest.json'), encoding='utf-8'))
    for s in man.get('shots', []):
        f = os.path.join(sys.argv[3], s['key'] + '.jpg')
        if not os.path.exists(f): continue
        im = Image.open(f).convert('RGB'); im.thumbnail((420, 900) if s.get('phone') else (1100, 700), Image.LANCZOS)
        b = io.BytesIO(); im.save(b, 'WEBP', quality=72, method=4)
        D['shots'].append(dict(s, src='data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode(), w=im.width, h=im.height))
    D['shotsWhen'] = man.get('when', '')[:10]
tpl = open(os.path.join(HERE, 'template.html'), encoding='utf-8').read()
html = tpl.replace('/*__DATA__*/null', json.dumps(D, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/'))
open(out_path, 'w', encoding='utf-8').write(html)
print('wrote', out_path, round(len(html) / 1024), 'KB', len(IC), 'icons')
