# Midgard Codex (หน้าเว็บเอกสารเกม)

สร้างใหม่หลังแก้ข้อมูลเกม:

```
(python3 -m http.server 8790 &)
NODE_PATH=$(npm root -g) node tools/reference_web/dump.js /tmp/ref_data.json
python3 tools/reference_web/build.py /tmp/ref_data.json /tmp/midgard-codex.html
```

แล้วเผยแพร่ไฟล์ HTML ที่ได้ (ลิงก์เดิม: https://claude.ai/artifact/7mrJsDWNZkEZrdfBsBpNqr)
