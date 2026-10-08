# CHANGELOG — NEO MIDGARD

## 2026-10-08 — ตัวคูณมอนหลัง Passive แบบ D (branch `claude/tune-mob-mul-after-passive-d` · ยังไม่ขึ้นเว็บ)

- **เปลี่ยน** มอน Lv 30+ เลือด ×0.8 · ATK ×0.86 ครั้งเดียวตอนโหลด (`js/balance.js` `MOB_HP_MUL`/`MOB_ATK_MUL` ธง `mulTuned`) — งานที่คลาวด์ส่งต่อ: Passive D ทำให้ฆ่ามอนช้าลง
  - อยู่ก่อน `js/worldboss.js` → Ancient สร้างจาก MVP ที่คูณแล้ว ไม่คูณซ้ำ (Codex เตือนเรื่องคูณซ้ำใน `spawnMob`) · EXP/ดรอปต่อตัวเท่าเดิม · ลูกสมุนบอส (`js/bosskit.js`) ไม่โดน
- **วัด** `CURVE=1 tests/balance_sim.js` เทียบ commit ก่อน D (`048f888`, worktree แยก) ทุก Class เดียวกัน 162 ดวล:
  - ก่อนแก้: เวลาฆ่ารวม ×1.26 · ดาเมจที่โดน/นาที ×1.16 · %HP ที่เสียต่อตัว ×1.53 → หลังแก้: ×1.03 · ×1.04 · ×1.09 · ตาย 0
  - EXP/ชม. ฟาร์ม 10 จุด รวม ×1.04 ของก่อน D (Lv15/Lv30 ยังต่ำกว่าเดิม ×0.91/×0.86 — มอนต่ำกว่า Lv 30 ไม่ได้คูณ)
  - MVP (boss_sim GEAR=lv) ไม่มีตาย เวลาใกล้ก่อน D แต่ยังต่างตาม Class · Ancient ปาร์ตี้ 5 ผลแกว่งมากต่อรอบ (ก่อน D 11–17 นาที · หลังแก้ 6–20 นาที) ยังสรุปไม่ได้จากรอบเดียว
- เจอระหว่างทาง: ตัวคูณกลางไม่แก้ความต่างราย Class — หลังแก้ Berserker/Runecaster ยังช้ากว่าก่อน D ×1.24/×1.26 · Einherjar เร็วขึ้น ×0.80
- เทสต์ (เทียบโค้ดเดียวกันไม่มีตัวคูณ): passive ตกเพิ่ม 1 ข้อ "total norn ≤ +60%" (+50.9% → +63.1% คงที่ 2 รอบ) · smoke/class3/runes ตกเท่าเดิม (smoke login card · class3 17 ข้อ · runes พังที่ `js/class-expansion.js:282`) — ตกอยู่ก่อนแล้วบนโค้ดที่ deploy `ebf7aef`
- `tests/balance_sim.js`, `tests/boss_sim.js`: ใช้ Chrome ของเครื่องบน Windows (ไม่มี Playwright browser)

## 2026-10-02 — รอยฟันแบบ Ragnarok ตอนตีโดน

- **เพิ่ม** รอยฟันบนตัวมอนตอนตีประชิดโดน (ยะยา: "สร้างเอฟเฟกต์การฟัน เกมจะออกสไตล์ Ragnarok") — `js/juice.js` `J.slashMark` + `drawSlash`
  - อาวุธมีคม (มีด/ดาบ/ขวาน): เสี้ยวจันทร์บางสีขาว ขอบเรืองฟ้า วิ่งจากหางถึงหัวใน 0.07 วิ แล้วจาง + เส้นรองบาง ๆ + ประกายดาวเล็ก · ตีติดกันสลับทิศเป็นกากบาท
  - อาวุธทุบ (กระบอง/คทา/มือเปล่า): แฟลชขาว + วงกระแทก + รัศมีหนา 6 เส้น + ดาว 4 แฉก
  - คริ: รอยไขว้ X สีทอง-แดง + ดาวระเบิด (ใต้ป้าย CRITICAL เดิม)
  - เฉพาะตีธรรมดาประชิด (`opts.sfx` = slash/smash) · ธนู/สกิล/DoT ไม่มีรอย · คุณภาพ low = ประกายครึ่งเดียว · `G.fastSim` ไม่วาด
- ที่พลาดระหว่างทาง: รอบแรกวาดแกนขาวแบบบวกแสง (lighter) บนพื้นหญ้าสว่างแล้วจางจนเหมือนครีบฉลาม → เปลี่ยนแกนเป็นขาวทึบ + เรียวยาวขึ้น
- พิสูจน์: `node --check` ผ่าน · จับภาพในเกมจริง (Chrome headless, แผนที่ meadow) ทีละจังหวะ 0.017–0.24 วิ ทั้ง ฟัน/คริ/ทุบ ไม่มี pageerror · `tests/smoke.js` ตก 2 ข้อ "login card on entry" ซึ่งตกเหมือนกันบนโค้ดก่อนแก้ (git stash เทียบแล้ว)

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
