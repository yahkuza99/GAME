# Class 3 — ออกแบบตัวละครกับเจ้าของ (2026-10-03)

เจ้าของเลือก: **Runelord = นักบวชรูนแอนดรอยด์** • **Packlord = จอมทัพเกราะเหล็กเฟนเรียร์** • **ชาย/หญิง ชุดเดียวกัน ทรงต่าง** (เหมือน Class 1/2)

ขั้นตอน (เหมือน Class 2 — docs/CLASS2_MESHY.md):
1. **ภาพดีไซน์** `job_<class>_<m|f>` ด้วย ChatGPT — แนบภาพ Class 2 ต้นสาย 2 ไฟล์เป็นแม่แบบ (ให้ดูเป็น "ร่างที่วิวัฒน์ขึ้น" ไม่ใช่ตัวใหม่ลอย ๆ)
2. **ภาพจิบิ** (ขั้น 0 ใน CLASS2_MESHY.md — แนบ proportion guide + style ref)
3. **Meshy** Image to 3D → Auto-Rig → วาง `art/mixamo/<class>_<m|f>/` → Claude คีย์ท่า/ติดตั้ง

---

## Yggdrasil Runelord (`runelord` ← Galdr Sage) — นักบวชรูนแอนดรอยด์
แนบ: `assets/job_galdr_f.webp` + `assets/job_galdr_m.webp` (ไฟล์ในเกม) เป็นแม่แบบ

```
Attached: the Galdr Sage (female and male) from my game. Design its evolved 3rd-tier class "Yggdrasil Runelord" — an android rune-priest of the World Tree.
Full-body character design sheet, front view, standing, same art style, rendering quality and proportions as the attached images (tall, elegant anime-fantasy, Norse knotwork details), dark plain background.
Android body: sleek ivory-white and pale-gold armor plates over a slim mechanical frame, smooth faceplate with ONE glowing cyan visor strip, NO eyes, NO mouth.
Glowing cyan rune circuitry lines run across the armor like circuit traces, shaped like Yggdrasil roots; fine gold Norse knotwork engraving; deep navy accents inherited from the Galdr robe.
Tall high collar, a SHORT stiff ceremonial cape (not reaching the knees), layered priest tabards with rune glyphs.
Weapon held in the right hand, fully visible: a tall pale-gold metal staff whose head is a ring of living white roots gripping THREE rune stones glowing cyan (attached to the staff, not floating).
Palette: ivory white, pale gold, cyan glow, deep navy. Holy, calm, powerful — clearly a higher rank than the Galdr Sage.
NO floating runes, NO magic circles, NO particles, NO smoke — keep the silhouette clean for 3D.
Make the {FEMALE | MALE} version: same outfit, weapon and colors; {female: long flowing white-silver hair behind the faceplate, slimmer frame | male: short swept-back white-silver hair, broader shoulders}.
```

## Fenrir Packlord (`packlord` ← Ulfhednar Warlord) — จอมทัพเกราะเหล็กเฟนเรียร์
แนบ: `assets/job_warlord_f.webp` + `assets/job_warlord_m.webp`

```
Attached: the Ulfhednar Warlord (female and male) from my game. Design its evolved 3rd-tier class "Fenrir Packlord" — an iron war-lord of the great wolf Fenrir.
Full-body character design sheet, front view, standing, same art style, rendering quality and proportions as the attached images (tall, heavy anime-fantasy armor, Norse knotwork), dark plain background.
Android warrior in HEAVY blackened-iron plate armor with wolf motifs: snarling wolf-head pauldrons, a wolf-jaw faceguard framing a smooth faceplate with ONE glowing ember-orange visor strip, NO eyes, NO mouth.
Thin glowing ember-orange cracks in the armor like molten iron inside; broken heavy chain links (the chain Gleipnir) wrapped around both forearms and hanging from the belt; a grey wolf-pelt mantle on the shoulders, SHORT and stiff (not reaching the knees).
Weapon held in both hands across the body but fully visible, not hiding the torso: a huge two-handed double-bit greataxe with a long iron haft, each blade shaped like an open wolf jaw, ember glow along the edges.
Palette: black iron, rust brown, ember orange, grey fur. Brutal, commanding — clearly a higher rank than the Ulfhednar Warlord.
NO fire effects, NO smoke, NO particles, NO floating objects — keep the silhouette clean for 3D.
Make the {FEMALE | MALE} version: same armor, weapon and colors; {female: long wild silver-grey hair falling from under the wolf helm, slimmer waist | male: short spiky grey hair, very broad shoulders}.
```

ใช้แชตละ 1 ภาพ (4 ภาพ: runelord_f, runelord_m, packlord_f, packlord_m) • ได้ภาพแล้วส่งในแชตหรือวางที่ `art/class3/` แล้ว push — Claude ตัดพื้น/บีบไฟล์เป็น `assets/job_<class>_<m|f>.webp` แล้วใช้เป็นภาพ Class ในเกมทันที (ระหว่างรอ Meshy)
