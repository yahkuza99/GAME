# CHANGELOG — NEO MIDGARD

## 2026-10-01 (รอบ 3) — ปีกไม่มีเสียง + ขึ้นเว็บ

- **เปลี่ยน** ใช้ Blink Chip / Return Beacon (ปีก) ไม่มีเสียง (ยะยาสั่ง) — `changeMap(..., { quiet: true })` ตอนใช้บีคอน · ย้ายแผนที่ปกติ (ประตูวาร์ป/NPC) ยังมีเสียง `warp`
- rebase งานเสียงทับ remote ที่ไปไกลแล้ว 56 commit (อาชีพขั้น 2) · conflict แค่ `.gitignore` · `tests/smoke.js` **ALL 52 PASSED** บนฐานใหม่

## 2026-10-01 (รอบ 2) — เสียงโจมตีจากยะยา

- **เพิ่ม** ไฟล์เสียงที่ยะยาเลือกเอง (Downloads, ส่วนใหญ่จาก Mixkit) → `assets/sfx_*.ogg`
  - `attack พัน` → `sfx_slash` · `attack ทุบ` → `sfx_smash` · `attack miss` → `sfx_miss` · `arrow` → `sfx_bow` · `Cri` → `sfx_crit`
  - `high damag` → `sfx_hit_big` · `boss hit` → `sfx_hit_boss` · `skill` → `sfx_skill` · `skill range` → `sfx_skill_range` · `ย้ายห้อง` → `sfx_warp` · `Click` → `sfx_click`
- **เปลี่ยน** ตีโดน 1 ครั้ง = เสียงเดียว (ยะยา: "รวมเป็นเสียงเดียว") — `js/game.js` `damageMob`: คริ > ตีบอส/MVP > ดาเมจแรง (≥25% เลือดเต็มของมอน) > เสียงของท่า
  - ตีธรรมดาประชิด: มีด/ดาบ/ขวาน = ฟัน · กระบอง/คทา/มือเปล่า = ทุบ · เลิกเล่นเสียงเหวี่ยง (`swing`) ซ้อน
  - ธนู: เสียงตอนปล่อยลูก ตอนโดนไม่ซ้อนอีก (ยกเว้นคริ/บอส/ดาเมจแรง)
  - พลาด (Miss) มีเสียงของตัวเองแล้ว · สกิลระยะไกล (ระยะ > 3 ช่อง) ใช้ `skill_range` · ย้ายแผนที่ใช้ `warp`
  - `js/sound.js`: `SYNTH_ALIAS` — ชื่อเสียงใหม่ที่ยังโหลดไฟล์ไม่เสร็จจะใช้เสียงสังเคราะห์ตัวใกล้เคียงแทน
- พิสูจน์: `node --check` ผ่าน · `tests/smoke.js` (Playwright) **ALL 48 PASSED** · **ยังไม่ได้ฟังในเกมจริง**
- ไม่ได้ใช้: ไฟล์ Mixkit ที่ยะยายังไม่ได้ตั้งชื่อ (swift-sword-strike, medieval-metal-sword-blade, quick-ninja-strike, boxing-punch, unlock-game-notification) · `high damag` = ไฟล์เดียวกับ sword-cutting-flesh

## 2026-10-01

- **เปลี่ยน** ฉากทั้ง 5 ใช้เสียงบรรยากาศธรรมชาติแทนเพลงสังเคราะห์ (ยะยา: "เน้นเสียงธรรมชาติ ไม่เอาดนตรี")
  - ไฟล์ `assets/bgm_<ธีม>_v1..v3.ogg` ฉากละ 3 ตัวเลือก (town / field / lake / forest / cave) ยาว ~20 วินาที สเตอริโอ ต่อหัว-ท้ายให้วนเนียน
  - `js/music.js`: มีหลายตัวเลือก = สุ่มเล่นสลับกัน ไม่ซ้ำตัวเดิมติดกัน · สลับตัว crossfade 2 วินาที · โหลดไม่ได้เลยกลับไปใช้เพลงสังเคราะห์เดิม
  - สร้างด้วย AudioLDM2 ในเครื่อง (`tools/audiogen/amb_v2.py`, ใบอนุญาตโมเดล CC-BY-NC-SA = ใช้ได้เฉพาะไม่หากำไร)
  - พิสูจน์: `node --check js/music.js` ผ่าน · ทดสอบตรรกะสุ่มด้วย stub audio (เล่น field_v2 → v3 → v1 ไม่ซ้ำติดกัน) · เสิร์ฟ local ไฟล์ตอบ 200 · **ยังไม่ได้ฟังในเกมจริง**
- **พลาดระหว่างทาง:** AudioLDM2 พังกับ transformers 5.x (`get_text_features` คืน object, `_get_initial_cache_position` หาย) → แก้ด้วย venv แยก `tools/audiogen/.venv` + transformers 4.46.3 · โหลดโมเดลผ่าน HF cache บน Windows พังเรื่อง symlink → ใช้ `local_dir` · เอฟเฟกต์ 30 เสียงรอบแรก (AudioLDM2) ยะยาฟังแล้วใช้ไม่ได้ → ยังไม่ใส่เข้าเกม
