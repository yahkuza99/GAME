# ภาพกรอบหน้าต่าง UI (สั่ง ChatGPT ทีละภาพ)

> ⚠️ ฉบับย่อเดิม — ใช้ **docs/UI_ART_SPEC.md** (สเปกเต็ม ระดับโลก 16 ชิ้น) แทน

เป้าหมาย: เปลี่ยนพื้นหลัง/กรอบหน้าต่างทุกบานจากสีพื้นเรียบ ๆ เป็นภาพวาด
ธีมเดียวทั้งเกม: **หินเข้ม + บรอนซ์หม่น + รูนนอร์สเรืองฟ้าจาง ๆ** (นอร์สผสมหุ่นเหล็ก เข้ากับ IRON VALHALLA)

วิธีใช้ในเกม: ภาพกรอบใช้แบบ 9 ส่วน (มุม 4 มุมคงที่ ขอบยืดได้ ตรงกลางยืดได้) → หน้าต่างกี่ขนาดก็ใช้ภาพเดียวกัน
ส่งภาพมาแล้ว Claude ตัด/ติดตั้งเอง

---

## ภาพ 1 — กรอบหน้าต่าง (สำคัญสุด)
```
Game UI window frame for a fantasy MMORPG, Norse style.
Square, front view, flat (no perspective).
Dark stone panel in the middle, bronze metal border with small rune carvings,
four decorated corners, thin faint cyan glow on the runes.
Middle area plain and dark (text will go on it).
1024x1024, transparent or pure black background outside the frame.
```

## ภาพ 2 — แถบหัวหน้าต่าง
```
Same style as the window frame. A long thin horizontal title bar,
bronze with rune carvings, dark stone center, both ends decorated.
Very thin and flat. 2048x160, transparent background.
```

## ภาพ 3 — ช่องไอเทม (ใช้ในกระเป๋า / Equipment / ปุ่มลัด)
```
Same style. One small square item slot: dark stone inset,
thin bronze rim, tiny rune at each corner. Empty inside.
512x512, transparent background.
```

## ภาพ 4 — ปุ่ม
```
Same style. One wide game button: bronze border, dark stone face,
slight bevel, no text. 1024x320, transparent background.
```

---

ข้อสังเกต
- สั่งทีละภาพ แนบภาพ 1 ไปด้วยตอนสั่งภาพ 2–4 แล้วพิมพ์ "same style as this" ให้เข้าชุดกัน
- ห้ามมีตัวหนังสือในภาพ (เกมใส่ข้อความเอง)
- ถ้า AI ทำพื้นหลังเป็นตาราง (checkerboard) แทนโปร่งใส ไม่เป็นไร Claude ลบให้
