# Class 2 → Meshy 3D (เจ้าของสั่ง 2026-10-03: "Class 2 เดี๋ยวผม Meshy 3D ทุกตัวเลย")

ทำแบบเดียวกับ Berserker F (Wolf Warrior) ที่อยู่ในเกมแล้ว: โมเดล Meshy → คีย์ 7 ท่า (tools/char3d) → เรนเดอร์ชีต 8 ทิศ → ติดตั้ง
ระหว่างที่ยังไม่มีภาพ เกมใช้ภาพ Class 1 ต้นสายแทน (Anim.playerKey) — ใส่ทีละตัวได้ ไม่ต้องรอครบ

## ขั้น 0 (สำคัญ): ทำภาพจิบิก่อนเข้า Meshy — ล็อกสัดส่วนด้วยภาพแม่แบบ
ภาพ `job_*` เป็นตัวสูงสมจริง (~7–8 หัว) → ใส่ Meshy ตรง ๆ จะได้ตัวสูง ไม่เข้ากับเกม • ให้ GPT แปลงเป็นจิบิก่อน
กัน "GPT ทำสัดส่วนไม่เท่ากันทุกภาพ": แนบ **3 ไฟล์ทุกแชต** (แชตละ 1 ตัว)
1. `job_<class>_<m|f>` (ดีไซน์ตัวละคร)
2. `art/chibi_proportion_guide.png` (หุ่นจิบิ 3 หัว A-pose + เส้นแดง หัว/คาง/สะโพก/เท้า — ตำแหน่งเดียวกันทุกภาพ)
3. `art/chibi_style_ref_class1.png` (ตัว Class 1 ในเกม = สไตล์/สัดส่วนที่ต้องตรง)

```
Attached: (1) a character design, (2) a proportion guide mannequin, (3) existing characters from the same game.
Redraw character (1) as a single full-body 3D-model reference for image-to-3D, in the SAME cute chibi style and proportions as the characters in (3).
Fill the mannequin in (2) EXACTLY: same canvas size, the top of the head on the HEAD TOP line, the chin on the CHIN line, the hips on the HIP line and the soles of the feet on the FEET line; same head width, same A-pose (arms down and slightly away from the body, legs slightly apart), facing the camera, front view, centered.
Keep the exact colors, armor, hair, cape and accessories of design (1). Android: smooth faceplate with ONE glowing visor strip, NO eyes, NO mouth. Hold the class weapon as in the design, fully visible, not crossing the body. Horns, hair spikes and helmet crests may go above the HEAD TOP line, but the head itself must not.
NO magic effects, NO smoke, NO particles, NO floating objects, NO glow aura. Short stiff cape (not reaching the ground). Plain flat white background, soft even lighting, no ground shadow. Do NOT draw the guide lines or labels.
```
แล้วค่อยเอาภาพจิบิที่ได้ไปใส่ Meshy (Image to 3D) • สัดส่วนต่างกันเล็กน้อย Claude แก้ตอนคีย์ท่าได้ (ปรับความสูงทั้งตัวให้เท่ากัน + ขยาย/ย่อกระดูกหัวเป็น 1/3)

## เจ้าของทำ (ต่อ 1 ตัว)
1. Meshy **Image to 3D** — ใช้ภาพจิบิจากขั้น 0 (ทำจาก `assets/job_<class>_<m|f>.webp`)
   - ให้มีอาวุธติดมือตามตารางด้านล่าง • ท่า A-pose/T-pose • ไม่ต้องมีผ้าฟิสิกส์ (ผ้าคลุมสั้นแข็งพอ)
2. **Auto-Rig** ใน Meshy (Humanoid) → Export **FBX** พร้อม texture
3. วางไฟล์ไว้ที่ `art/mixamo/<class>_<m|f>/model.fbx` + `texture.jpg` (หรือ .png) แล้ว push / ส่งในแชต
   - ไม่ต้องทำท่าใน Meshy (ท่าของ Meshy ใช้ไม่ได้หลังแก้กระดูก — Claude คีย์ใหม่เองทั้ง 7 ท่า)

## Claude ทำต่อ
ตรวจ rig (inspect_rig) → แก้ถ้าเพี้ยน (fix_rig) → คีย์ walk/attack(หรือ shoot)/skill/buff/hurt/dead/sit (poses.py) → ตรวจพื้น → เรนเดอร์ 8 ทิศ (render_blender.py, texture หม่นลงถ้าขาวจัด) → ติดตั้ง `anim_<class>_<m|f>_*` → ส่งภาพเทียบให้ดูก่อนเปิดใช้

## อาวุธประจำ Class 2 (เกมไม่เปลี่ยนอาวุธตามของที่สวม)
| # | Class | ไฟล์ | อาวุธ | มือ | ท่าโจมตี |
|---|---|---|---|---|---|
| 7 | Valkyrie Knight | valkyrie | ดาบยาวทอง + โล่กลมสุริยะ | ขวา + โล่แขนซ้าย | ฟันเฉียงหลังโล่ |
| 8 | Hersir Vanguard | hersir | ดาบใหญ่สองมือ เรืองแดง | สองมือ | ฟาดกว้าง |
| 9 | Galdr Sage | galdr | คทาคริสตัลน้ำแข็งยาว | ขวา | ชี้คทา/ร่าย |
| 10 | Seidr Witch | seidr | คทาดำ ลูกแก้ววงแหวนม่วง | ขวา | ร่าย |
| 11 | Skadi Ranger | skadi | ธนูคริสตัลน้ำแข็ง + กระบอกลูกศรหลัง | คันธนูซ้าย | shoot |
| 12 | Ullr Sniper | ullr | ธนูยาวไม้ + กระบอกลูกศรหลัง | คันธนูซ้าย | shoot |
| 13 | Norn Oracle | norn | คทาทองยาว | ขวา | ร่าย/ทุบ |
| 14 | Gythja Monk | gythja | ถุงมือเหล็กทองเรือง (ไม่มีอาวุธถือ) | สองมือ | ต่อย |
| 15 | Loki's Phantom | phantom | ใบมีดกรงเล็บคู่ ชมพูเรือง | มือละอัน | พุ่งแทงไขว้ |
| 16 | Skald Bard | skald | พิณ/ไลร์ฟ้าทอง | ซ้าย | ดีดพิณ |
| 17 | Ulfhednar Warlord | warlord | ขวานไฟสองมือ ด้ามยาว | สองมือ | ฟาดลง |
| 18 | Jotun Breaker | jotun | ค้อนศึกเทาน้ำแข็ง + ถุงมือใหญ่ | สองมือ | ทุบพื้น |

ครบ = 12 Class × ชาย/หญิง = **24 ตัว** • เริ่มตัวไหนก่อนก็ได้

## ข้อควรระวัง (จาก Wolf Warrior)
- ตัว+ผม+อาวุธเป็นก้อนเดียวใน Meshy → ถ้าผม/ผ้ายาวติดแขน Claude แก้น้ำหนักกระดูกให้ได้
- อาวุธยาวที่ปลายด้ามใกล้ขา มักขยับตามขา → แก้ด้วย `--pin` ตอนคีย์ท่า
- texture สว่าง/ขาวจัดเกินภาพวาด → Claude ทำ texture หม่นลงให้เข้ากับฉาก
