# Valhalla Codex (หน้าเว็บเอกสารเกม)

สร้างใหม่หลังแก้ข้อมูลเกม (สคริปต์เปิดเซิร์ฟเวอร์ไฟล์ในตัวเอง ไม่ต้องรัน http.server — ตั้ง `BASE=<url>` ได้ถ้ามีอยู่แล้ว):

```
export NODE_PATH=$(npm root -g)          # ถ้า playwright ไม่ได้อยู่ใน node_modules ใกล้ ๆ
export CHROME="/path/to/chrome"          # ไม่ตั้ง = /opt/pw-browsers/chromium ถ้ามี ไม่งั้น Chromium ของ Playwright
                                         # Windows: CHROME="C:/Program Files/Google/Chrome/Application/chrome.exe"
node tools/make_reference.js                               # docs/GAME_REFERENCE.md
node tools/reference_web/dump.js /tmp/ref_data.json         # ข้อมูลเกม → JSON
node tools/reference_web/shots.js /tmp/codex_shots          # (ไม่บังคับ) ภาพหน้าจอเกมจริง ~32 ภาพ → แท็บ "ภาพเกม"
python3 tools/reference_web/build.py /tmp/ref_data.json /tmp/midgard-codex.html /tmp/codex_shots
```

- ข้อมูลส่วนเสริม (Class 3 / Oath / Skill Rune / Hunt Rune / ไม้ตาย / Passive / ท่าบอส / เควสต์เสริม / ตำนาน / กลไกต่อสู้ / การควบคุม)
  อยู่ใน `tools/ref_extract.js` ใช้ร่วมกันทั้ง GAME_REFERENCE และ Codex — อ่านจากอ็อบเจกต์จริงในเกม ยกเว้นคำบรรยายจุดสังเกตแมพ (`LANDMARKS`)
- build.py ใช้เวลา ~1–2 นาที (ย่อไอคอน ~600 ภาพเป็น webp)

แล้วเผยแพร่ไฟล์ HTML ที่ได้ (ลิงก์เดิม: https://claude.ai/artifact/7mrJsDWNZkEZrdfBsBpNqr)
