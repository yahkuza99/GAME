# IRON VALHALLA — กติกาการทำงาน

- ตอบเจ้าของเป็นภาษาไทย • ข้อความ UI ภาษาไทยใช้คำว่า "Class" (ไม่ใช้ คลาส/อาชีพ) และ "Epic"
- ห้ามเปลี่ยน SAVE_KEY / salt ล็อกอินใน js/online.js / id ใน data (เซฟผู้เล่นจะหาย)
- รัน `sh tools/stamp.sh` ก่อน commit ที่แก้ js/css
- **Pending list:** เอกสาร/หน้าเว็บประกอบ (Valhalla Codex, docs/GAME_REFERENCE.md ฯลฯ) ไม่ต้องอัปเดตทันทีหลังแก้เกม
  → จดลง `docs/PENDING.md` แล้วอัปเดตรวดเดียวเมื่อเจ้าของสั่ง
- Rig (ตัวละครแยกชิ้น) และผ้าคลุมฟิสิกส์ถูกยกเลิก • เป้าหมายคือ "เคลื่อนไหวเป็นธรรมชาติ" → ใช้แอนิเมชันวาดทีละเฟรม (ท่าเดิน/ตี ต่อ Class)
- Paperdoll: ภาพ Class วาดมือเปล่า (แท่ง magenta บอกมือ) → `anim_<key>_bare_*` + `js/paperdoll.js` วาด **อาวุธประจำ Class** (ไม่เปลี่ยนตามของที่สวม — เจ้าของเลือก) — ดู docs/PAPERDOLL.md
- วิดีโอ (Grok image-to-video) ลองแล้วไม่รอด — ใช้ภาพชีตจาก ChatGPT (ถืออาวุธในภาพ) ต่อ • ติดตั้งด้วย `tools/install_armed.py`
