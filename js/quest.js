'use strict';
// ============================================================
//  เควสต์เนื้อเรื่อง (สายเดียว ทำทีละเควสต์): สอนระบบพื้นฐานไปพร้อมกับเล่าเรื่อง (docs/STORY.md บทที่ 1–5)
//  ความคืบหน้าเก็บใน p.quests = { i: เควสต์ที่กำลังทำ, n: ตัวนับ, done: [id] }
//  เป้าหมาย: talk (คุย NPC) • kill (ล่ามอน) • hit (ตีหุ่นฝึก) • collect (เก็บของ ส่งแล้วหาย)
//           event (เช่น บันทึกจุดเกิด) • baseLv / jobLv • job (อัปเกรดคลาส)
//  ห้ามเปลี่ยน id / obj / reward ของเควสต์เดิม (เซฟอ้างอิงอยู่) — เปลี่ยนได้แค่ title / desc / done / ch
//  ch = บท (ป้ายในหน้าต่างเควสต์) • done = บรรทัดเล่าเรื่องตอนเควสต์สำเร็จ (ประกาศกลางจอ + แชต)
// ============================================================

const CHAPTERS = { 1: L('ตื่น', 'Awakening'), 2: L('ร่างใหม่', 'A New Frame'), 3: L('ข้อความในหมอก', 'A Message in the Mist'), 4: L('เสียงหอนในป่า', 'Howls in the Wood'), 5: L('โพรงแห่งเฮล', 'The Hollow of Hel') };
const QUESTS = [
  // ---- บทที่ 1 — ตื่น (Neo Eldheim → Emerald Meadow, Lv 1–7) ----
  { id: 'welcome', ch: 1, title: L('หน่วยใหม่รายงานตัว', 'New Unit, Reporting In'), desc: L('วิเซอร์ของเจ้าเพิ่งสว่างขึ้น — ไปรายงานตัวกับ Guard Unit Rolf (หุ่นหมวกเขา) ที่ลานกลางเมือง', 'Your visor has only just lit up — report to Guard Unit Rolf (the bot with the horned helm) in the town square.'),
    done: L('Rolf: "หน่วยใหม่สินะ วิเซอร์ยังสว่างจ้าเชียว — ไปให้ Eir ตรวจร่างก่อน"', 'Rolf: "A rookie, eh? Visor\'s still blazing bright — go let Eir check you over first."'),
    obj: { type: 'talk', npc: 'guide' }, reward: { items: [['red_potion', 5]], bexp: 10, jexp: 5 } },
  { id: 'repair', ch: 1, title: L('ตรวจร่างกับ Eir', 'A Checkup with Eir'), desc: L('ให้ Eir Repair Unit สแกนร่าง — เธอซ่อม HP/SP และติดตั้งบัฟให้ฟรีทุกครั้ง', 'Let Eir Repair Unit scan your frame — she restores HP/SP and installs buffs for free, every time.'),
    done: L('Eir: "แปลกจังค่ะ... ไม่มีรอยซ่อมเก่าเลยสักจุด — เอ่อ ไม่มีอะไรนะคะ"', 'Eir: "How odd... not a single old repair mark anywhere — oh, um, it\'s nothing."'),
    obj: { type: 'talk', npc: 'nurse' }, reward: { zeny: 100, bexp: 20, jexp: 10 } },
  { id: 'dummy', ch: 1, title: L('ฝึกท่าแรก', 'First Moves'), desc: L('ร่างใหม่ต้องรู้จักเคลื่อนไหว — ตีหุ่นฝึกซ้อมใต้ลานเมือง 10 ครั้ง (คลิกที่หุ่นเพื่อโจมตี)', 'A new frame has to learn to move — strike the training dummy below the town square 10 times (click the dummy to attack).'),
    done: L('Rolf: "ท่ายังแข็ง แต่ใช้ได้ — ออกประตูตะวันออกไปดูสวนของต้นไม้สิ"', 'Rolf: "Stiff, but it\'ll do — head out the east gate and see the tree\'s garden."'),
    obj: { type: 'hit', n: 10 }, reward: { items: [['apple', 5]], bexp: 20, jexp: 15 } },
  { id: 'gel5', ch: 1, title: L('คนสวนที่ลืมหน้าที่', 'Gardeners Who Forgot Their Work'), desc: L('ออกประตูตะวันออกไป Emerald Meadow — Gel Unit คือถุงน้ำเลี้ยงเดินได้ที่ลืมเส้นทางไปนานแล้ว ปล่อยพวกมันพัก 5 ตัว', 'Head out the east gate to Emerald Meadow — Gel Units are walking sacs of sap that lost their route long ago. Lay 5 of them to rest.'),
    done: L('ถุงน้ำเลี้ยงหยุดเดินแล้ว... แสงข้างในยังสะอาดอยู่', 'The sap sac stops walking... the light inside is still clean.'),
    obj: { type: 'kill', mob: 'pudding', n: 5 }, reward: { items: [['red_potion', 5]], bexp: 60, jexp: 40 } },
  { id: 'jelly', ch: 1, title: L('น้ำเลี้ยงยังสะอาดไหม', 'Is the Sap Still Clean?'), desc: L('Eir อยากรู้ว่าน้ำเลี้ยงในสวนยังสะอาดอยู่ไหม — เก็บ Gel Cell 3 ชิ้นจาก Gel Unit (ส่งแล้วไอเทมจะถูกใช้ไป)', 'Eir wants to know if the garden\'s sap is still clean — collect 3 Gel Cells from Gel Units (they are used up when you turn them in).'),
    done: L('Eir: "สะอาดค่ะ... สะอาดจริง ๆ" — วิเซอร์ของเธอสว่างวาบ นี่คือความหวังแรก', 'Eir: "It\'s clean... truly clean." — Her visor flares bright. The first sign of hope.'),
    obj: { type: 'collect', item: 'jelly_drop', n: 3, mob: 'pudding' }, reward: { zeny: 300, bexp: 50, jexp: 30 } },
  { id: 'savept', ch: 1, title: L('ให้ Bifrost จดจำเจ้า', 'Let the Bifrost Remember You'), desc: L('คุยกับ Bifrost Keeper แล้วเลือก "บันทึกจุดเกิด" — เมื่อล้มลง ใบไม้ Yggdrasil จะพาเจ้ากลับมาที่นี่', 'Talk to the Bifrost Keeper and choose "Save Point" — when you fall, Yggdrasil\'s leaves will carry you back here.'),
    done: L('Bifrost Keeper: "ข้าจดจำเจ้าไว้แล้ว... แปลก ข้าไม่เคยจำเจ้ามาก่อน"', 'Bifrost Keeper: "I remember you now... Strange. I have never remembered you before."'),
    obj: { type: 'event', ev: 'save', npc: 'bifrost' }, reward: { items: [['blink_feather', 3]] } },
  { id: 'lv5', ch: 1, title: L('ร่างเริ่มปรับตัว', 'The Frame Adapts'), desc: L('ขึ้นถึง Base Lv 5 — ยิ่งเล่น ร่างยิ่งเข้ากับเจ้า (อย่าลืมแจก Status Point กด A)', 'Reach Base Lv 5 — the more you play, the better your frame fits you (don\'t forget to spend Status Points — press A).'),
    done: L('ร่างตอบสนองไวขึ้น... ราวกับมันรู้จักเจ้ามาก่อน', 'Your frame responds faster... as if it has known you all along.'),
    obj: { type: 'baseLv', n: 5 }, reward: { items: [['hood', 1]], zeny: 300 } },
  { id: 'buzz', ch: 1, title: L('โดรนที่ดุผิดปกติ', 'Drones Gone Wild'), desc: L('Buzz Unit ปกป้องทุ่งเหมือนรังของตัวเอง แต่คืนนี้พวกมันดุผิดปกติ — ทำลาย 3 ตัว (พวกมันโจมตีก่อน ระวังตัว!)', 'Buzz Units guard the meadow like their own hive, but tonight they\'re unusually fierce — destroy 3 (they attack first, so watch yourself!).'),
    done: L('Rolf: "มีอะไรบางอย่างเดินผ่านทุ่งไปทางตะวันออกเมื่อคืน... เจ้าเริ่มแกร่งแล้ว ไปหา Mimir เถอะ"', 'Rolf: "Something walked through the meadow, heading east, last night... You\'re getting tough. Go see Mimir."'),
    obj: { type: 'kill', mob: 'buzzfly', n: 3 }, reward: { items: [['orange_potion', 3]], bexp: 150, jexp: 100 } },
  // ---- บทที่ 2 — ร่างใหม่ (Job Lv 10, ในเมือง) ----
  { id: 'job10', ch: 2, title: L('ข้อมูลการต่อสู้ครบถ้วน', 'Combat Data Complete'), desc: L(`แม่พิมพ์จะยึดร่างได้เมื่อข้อมูลการต่อสู้พอ — ขึ้นถึง Job Lv ${JOB_CHANGE_LV} แล้วไปหา Mimir AI`, `A mold can only take hold once your combat data is sufficient — reach Job Lv ${JOB_CHANGE_LV}, then go see Mimir AI.`),
    done: L('Mimir AI: "ข้อมูลครบแล้ว หน่วยใหม่ — มาที่แท่นของข้า"', 'Mimir AI: "Your data is complete, new unit — come to my pedestal."'),
    obj: { type: 'jobLv', n: JOB_CHANGE_LV }, reward: { items: [['sandals', 1]] } },
  { id: 'upgrade', ch: 2, title: L('รับแม่พิมพ์ของวีรชน', 'The Mold of a Hero'), desc: L('คุยกับ Mimir AI แล้วเลือกแม่พิมพ์ 1 ใน 6 — ท่าของหกหน่วยที่ยืนรักษากำแพงเอลด์ไฮม์ในคืนที่กิ่งหัก', 'Speak with Mimir AI and choose 1 of 6 molds — the techniques of the six units who held the walls of Eldheim on the night the branch broke.'),
    done: L('Mimir AI (เบา ๆ): "...ไม่มีร่องรอยประกายเก่าต้าน แสดงว่า... ไม่ ยังไม่ถึงเวลา"', 'Mimir AI (quietly): "...No trace of an old spark resisting. Which means... no. Not yet."'),
    obj: { type: 'job', npc: 'jobmaster' }, reward: { items: [['yellow_potion', 3]], zeny: 1000 } },
  { id: 'skill1', ch: 2, title: L('ติดตั้งท่าแรกของแม่พิมพ์', 'The Mold\'s First Technique'), desc: L('ใช้ Skill Point ติดตั้งสกิลของคลาสใหม่อย่างน้อย 1 สกิล (กด S) — ท่านี้เคยเป็นของใครบางคน', 'Spend a Skill Point to learn at least 1 skill of your new class (press S) — this technique once belonged to someone.'),
    done: L('ท่าที่ติดตั้งขยับเองเล็กน้อย... แม่พิมพ์ยังจำเจ้าของเดิมได้', 'The technique twitches on its own... the mold still remembers its first owner.'),
    obj: { type: 'skill' }, reward: { items: [['orange_potion', 5]], bexp: 300, jexp: 200 } },
  { id: 'useskill', ch: 2, title: L('สานต่อท่าของเขา', 'Carry On Their Legacy'), desc: L('ใช้สกิล 10 ครั้งในสนามจริง (ลากสกิลไปวางที่แถบลัด แล้วกดเลขหรือแตะปุ่ม)', 'Use skills 10 times in real combat (drag a skill onto the hotbar, then press its number or tap the button).'),
    done: L('Lopt (พ่อค้าเร่ที่ปากทางไป Mistlake): "ที่ราบข้างหน้ามีทูตบินวนอยู่ — อาจรอเจ้าก็ได้นะ"', 'Lopt (a peddler on the road to Mistlake): "There\'s an envoy circling the plains ahead — maybe it\'s waiting for you."'),
    obj: { type: 'useskill', n: 10 }, reward: { items: [['grape', 3]], bexp: 400, jexp: 300 } },
  // ---- บทที่ 3 — ข้อความในหมอก (Mistlake Plains, Lv 8–16 / MVP Lv 25) ----
  { id: 'mist', ch: 3, title: L('สนิมยังลามอยู่', 'The Rust Still Spreads'), desc: L('เดินทางไป Mistlake Plains (ต่อจาก Emerald Meadow) — Rust Sentry คือหน่วยยามที่สนิมกินถึงข้อต่อ ปล่อยพวกมันพัก 10 ตัว', 'Travel to Mistlake Plains (past Emerald Meadow) — Rust Sentries are guard units eaten by rust down to the joints. Lay 10 of them to rest.'),
    done: L('สนิมยังลามอยู่... มันไม่ได้หายไปกับ Fenrir ในคืนนั้น', 'The rust is still spreading... it didn\'t vanish with Fenrir that night.'),
    obj: { type: 'kill', mob: 'stumpling', n: 10 }, reward: { items: [['guard', 1]], bexp: 800, jexp: 500 } },
  { id: 'shroom', ch: 3, title: L('ทุ่นที่ไม่ควรเดิน', 'Buoys That Shouldn\'t Walk'), desc: L('Mine Unit คือทุ่นที่ผู้พิทักษ์วางกั้นสนิมในคืนนั้น ตอนนี้มันเดินได้เองและกั้นทุกคน — ทำลาย 8 ตัว (ระวังแรงระเบิด!)', 'Mine Units are buoys the Guardians laid to hold back the rust that night. Now they walk on their own and block everyone — destroy 8 (beware the blasts!).'),
    done: L('ลายเซ็นผู้วางคำสั่งบนทุ่น... ถูกลบออกไปแล้ว', 'The signature of whoever set the buoys\' orders... has been erased.'),
    obj: { type: 'kill', mob: 'capshroom', n: 8 }, reward: { items: [['yellow_potion', 3]], bexp: 1000, jexp: 700 } },
  { id: 'refine1', ch: 3, title: L('โล่ของทูตหนาเกินไป', 'The Envoy\'s Shield Is Too Thick'), desc: L('Brokk: "ทูตตัวนั้นโล่หนา ของธรรมดาเจาะไม่เข้า เจ้าหนู" — ให้ Brokk Forge-Bot ตีบวกอุปกรณ์ที่สวมอยู่สำเร็จ 1 ครั้ง (+1 ถึง +4 ไม่มีวันแตก)', 'Brokk: "That envoy\'s got a thick shield. Ordinary gear won\'t pierce it, kiddo." — Have Brokk Forge-Bot successfully refine a piece of your equipped gear once (+1 to +4 never breaks).'),
    done: L('Brokk: "ฮ่าฮ่า! ทีนี้ก็เจาะเข้าแล้ว — ไปแสดงให้ทูตดูว่าเจ้าคือใคร"', 'Brokk: "Ha-ha! NOW you\'ll punch through — go show that envoy who you are!"'),
    obj: { type: 'event', ev: 'refine', npc: 'refine' }, reward: { zeny: 1500 } },
  { id: 'lv20', ch: 3, title: L('ร่างที่หมอกไม่กล้าแตะ', 'A Frame the Mist Won\'t Touch'), desc: L('ขึ้นถึง Base Lv 20 — แม่พิมพ์ปรับเข้ากับเจ้ามากขึ้นทุกเลเวล', 'Reach Base Lv 20 — the mold fits you a little better with every level.'),
    done: L('Rolf: "...ข้าคงเรียกเจ้าว่าหน่วยใหม่ได้อีกไม่นานหรอก"', 'Rolf: "...Guess I can\'t call you rookie for much longer."'),
    obj: { type: 'baseLv', n: 20 }, reward: { items: [['shoes', 1]], zeny: 1000 } },
  { id: 'wolf', ch: 3, title: L('ไฟเพิ่งผ่านไป', 'The Fire Just Passed'), desc: L('ก่อนสู้ทูต ลงใต้ไป Wolfwood Forest เก็บแรงก่อน — ป่าถูกเผาเมื่อไม่นานนี้ Ash Stalker ยังอุ่นอยู่ ทำลาย 10 ตัว', 'Before facing the envoy, head south to Wolfwood Forest to build your strength — the forest burned only recently, and the Ash Stalkers are still warm. Destroy 10.'),
    done: L('Fenrir Unit แค่ดมเจ้าแล้วเดินหนี... เจ้าไม่มีกลิ่นสนิม — และไฟนั่นเดินลงไปทางโพรง', 'The Fenrir Units just sniff you and walk away... you carry no scent of rust — and that fire went down toward the Hollow.'),
    obj: { type: 'kill', mob: 'ashtail', n: 10 }, reward: { items: [['yellow_potion', 5]], bexp: 2500, jexp: 1600 } },
  { id: 'mvp1', ch: 3, title: L('ข้อความในหมอก', 'A Message in the Mist'), desc: L('Seraph Core คือทูตคนสุดท้ายของ Odin ระบบยืนยันตัวตนพังจึงโจมตีทุกคน — ปราบมันที่ Mistlake Plains เพื่อปล่อยข้อความออกมา (เช็กเวลาเกิดได้ที่ ⓘ)', 'Seraph Core is Odin\'s last envoy; its identity check is broken, so it attacks everyone — defeat it at Mistlake Plains to release its message (check spawn times via ⓘ).'),
    done: L('Mimir AI: "เจ้าไม่ใช่คนเก่าที่ถูกปลุก — เจ้าคือใบใหม่ และตอนนี้พวกเขารู้แล้วว่าเจ้ามีอยู่"', 'Mimir AI: "You are no old one reawakened — you are a new leaf. And now they know you exist."'),
    obj: { type: 'kill', mob: 'seraph_pudding', n: 1 }, reward: { items: [['clip', 1], ['white_potion', 3]], zeny: 5000 } },
  // ---- บทที่ 4 — เสียงหอนในป่า (Wolfwood Forest, Lv 18–30) ----
  { id: 'lv30', ch: 4, title: L('เสียงหอนในป่า', 'Howls in the Wood'), desc: L('ทุกคืนเสียงหอนจากป่าทางใต้ดังมาถึงกำแพง — ขึ้นถึง Base Lv 30 แล้ว Eir กับ Rolf มีเรื่องจะบอกก่อนเจ้าลงโพรง', 'Every night, howls from the southern forest reach the walls — reach Base Lv 30. Eir and Rolf have something to tell you before you descend into the Hollow.'),
    done: L('Rolf ถอดหมวกเขาวางบนบอร์ดครู่หนึ่ง แล้วสวมกลับ: "ไปเถอะ แต่กลับมา"', 'Rolf sets his horned helm on the board for a moment, then puts it back on: "Go. But come back."'),
    obj: { type: 'baseLv', n: 30 }, reward: { items: [['white_potion', 5]], zeny: 3000 } },
  // ---- บทที่ 5 — โพรงแห่งเฮล (Hel's Hollow, Lv 30–45) ----
  { id: 'hollow1', ch: 5, title: L('ประกายในร่างผิด', 'Sparks in the Wrong Frames'), desc: L('ลงใต้สุดป่าไป Hel\'s Hollow — Draugr Husk คือประกายที่ถูกยัดลงเศษเหล็กที่ไม่พอดี พวกมันไม่ชั่วร้าย แค่สับสนและเจ็บ ปลดพวกมัน 10 ตัว', 'Head to the far south of the forest, to Hel\'s Hollow — Draugr Husks are sparks crammed into scrap frames that don\'t fit. They aren\'t evil, just confused and in pain. Release 10 of them.'),
    done: L('แสงวิเซอร์ของ Draugr ดับลงอย่างสงบ... ราวกับได้พักเป็นครั้งแรก', 'The Draugr\'s visor light fades out peacefully... as if resting for the first time.'),
    obj: { type: 'kill', mob: 'draugr', n: 10 }, reward: { items: [['white_potion', 3]], bexp: 4000, jexp: 2600 } },
  { id: 'hollow2', ch: 5, title: L('ตะเกียงบนชั้นวาง', 'Lanterns on the Shelves'), desc: L('Hel Maiden Unit ปัดฝุ่นชั้นวางประกายที่ไม่มีใครมาเยี่ยม — เก็บ Soul Lantern 5 ดวงที่หล่นจากชั้น (ส่งแล้วไอเทมจะถูกคืนขึ้นชั้น)', 'Hel Maiden Units dust spark shelves no one visits anymore — collect 5 Soul Lanterns that fell from the shelves (turning them in returns them to the shelves).'),
    done: L('ตะเกียงแต่ละดวงยังอุ่น — ที่กลางโพรง มีใครบางคนนั่งอยู่ท่ามกลางแสงนั้น', 'Each lantern is still warm — and in the heart of the Hollow, someone sits amid that light.'),
    obj: { type: 'collect', item: 'hel_lantern', n: 5, mob: 'hel_maiden' }, reward: { zeny: 4000, bexp: 5000, jexp: 3200 } },
  { id: 'hollow3', ch: 5, title: L('ราชินีแห่งโพรง', 'Queen of the Hollow'), desc: L('กลางโพรง มีผู้หญิงครึ่งหน้ากากสว่างครึ่งดับนั่งอยู่ท่ามกลางชั้นวางประกายนับพัน — ไปคุยกับ Hel', 'In the heart of the Hollow, a woman whose mask is half lit, half dark sits among a thousand spark shelves — go speak with Hel.'),
    done: L('Hel ไม่ได้ขอให้เจ้าสู้เพื่อเธอ — เธอขอให้เจ้าหยุดไฟ', 'Hel didn\'t ask you to fight for her — she asked you to stop the fire.'),
    obj: { type: 'talk', npc: 'hel' }, reward: { items: [['blue_potion', 3]], bexp: 3000, jexp: 2000 } },
  { id: 'hollow4', ch: 5, title: L('หน้ากากของไฟ', 'The Mask of Fire'), desc: L('Kitsura EX หน่วยเผาผลาญเก้าหางกำลังเผาชั้นวางประกายทีละชั้น — หยุดมัน (MVP Lv 45 เตรียมยาให้พร้อม เช็กเวลาเกิดได้ที่ ⓘ)', 'Kitsura EX, a nine-tailed incinerator unit, is burning the spark shelves one by one — stop it (MVP Lv 45: stock up on potions; check spawn times via ⓘ).'),
    done: L('เก้าหัวเผาดับลงทีละหัว... ใครบางคนเพิ่งใช้กุญแจของผู้พิทักษ์ — กลับไปหา Hel', 'The nine burners die out one by one... someone has just used a Guardian\'s key — return to Hel.'),
    obj: { type: 'kill', mob: 'kitsura', n: 1 }, reward: { items: [['white_potion', 5], ['blue_potion', 5]], zeny: 10000 } },
  { id: 'hollow5', ch: 5, title: L('ใบแรก', 'The First Leaf'), desc: L('ไฟดับแล้ว — กลับไปหา Hel ที่กลางโพรง มีคนรออยู่ในเงาหลังเธอ', 'The fire is out — return to Hel in the heart of the Hollow. Someone waits in the shadow behind her.'),
    done: L('บทที่ 6 — รากที่ถูกแทะ (เร็ว ๆ นี้)', 'Chapter 6 — The Gnawed Root (Coming Soon)'),
    obj: { type: 'talk', npc: 'hel' }, reward: { items: [['white_potion', 5]], zeny: 5000, bexp: 8000, jexp: 5000 } },
];

const Quest = {
  state() {
    const p = G.player;
    if (!p.quests || typeof p.quests !== 'object') p.quests = { i: 0, n: 0, done: [] };
    return p.quests;
  },
  current() { const s = this.state(); return QUESTS[s.i] || null; },
  isDone(id) { return this.state().done.includes(id); },
  is(id) { const q = this.current(); return !!q && q.id === id; },
  chapterText(q = this.current()) { return q && q.ch ? L(`บทที่ ${q.ch} — ${CHAPTERS[q.ch] || ''}`, `Chapter ${q.ch} — ${CHAPTERS[q.ch] || ''}`) : 'QUEST'; },

  // ความคืบหน้า [ทำได้, เป้า] ของเควสต์ปัจจุบัน
  progress(q = this.current()) {
    if (!q) return [0, 0];
    const p = G.player, s = this.state(), o = q.obj;
    switch (o.type) {
      case 'kill': case 'hit': return [Math.min(s.n, o.n), o.n];
      case 'collect': return [Math.min(countItem(o.item), o.n), o.n];
      case 'baseLv': return [Math.min(p.baseLv, o.n), o.n];
      case 'jobLv': return [p.job !== 'novice' ? o.n : Math.min(p.jobLv, o.n), o.n];
      case 'job': return [p.job !== 'novice' ? 1 : 0, 1];
      case 'skill': return [p.job !== 'novice' && Object.keys(p.skills).some(k => JOBS[p.job].skills.includes(k) && !JOBS.novice.skills.includes(k) && p.skills[k] > 0) ? 1 : 0, 1];
      case 'useskill': return [Math.min(s.n, o.n), o.n];
      default: return [s.n ? 1 : 0, 1];
    }
  },
  objText(q = this.current()) {
    if (!q) return '';
    const o = q.obj, [a, b] = this.progress(q);
    const npc = id => { for (const m in MAP_DEFS) { const n = (MAP_DEFS[m].npcs || []).find(x => x.id === id); if (n) return n.name; } return id; };
    switch (o.type) {
      case 'talk': return L(`คุยกับ ${npc(o.npc)}`, `Talk to ${npc(o.npc)}`);
      case 'kill': return `${MOBS[o.mob].name} ${a}/${b}`;
      case 'hit': return L(`ตีหุ่นฝึกซ้อม ${a}/${b}`, `Strike the training dummy ${a}/${b}`);
      case 'collect': return `${ITEMS[o.item].name} ${a}/${b}`;
      case 'event': return o.ev === 'refine' ? L(`ตีบวกสำเร็จที่ ${npc(o.npc)}`, `Refine successfully at ${npc(o.npc)}`) : L(`บันทึกจุดเกิดที่ ${npc(o.npc)}`, `Save your point at ${npc(o.npc)}`);
      case 'baseLv': return `Base Lv ${G.player.baseLv}/${b}`;
      case 'jobLv': return `Job Lv ${Math.min(G.player.jobLv, b)}/${b}`;
      case 'job': return L(`อัปเกรดคลาสที่ ${npc(o.npc)}`, `Change class at ${npc(o.npc)}`);
      case 'skill': return L('ติดตั้งสกิลคลาสใหม่ (กด S)', 'Learn a new class skill (press S)');
      case 'useskill': return L(`ใช้สกิล ${a}/${b}`, `Use skills ${a}/${b}`);
    }
    return '';
  },
  rewardText(q) {
    const r = q.reward, out = [];
    if (r.bexp) out.push(`Base EXP ${r.bexp}`);
    if (r.jexp) out.push(`Job EXP ${r.jexp}`);
    if (r.zeny) out.push(`${U.fmt(r.zeny)} ${CUR}`);
    for (const [id, n] of r.items || []) out.push(`${ITEMS[id].name} ×${n}`);
    return out.join(' • ');
  },
  // จุดหมายสำหรับระบบนำทาง
  navTarget(q = this.current()) {
    if (!q) return null;
    const o = q.obj;
    const npcT = id => { for (const m in MAP_DEFS) { const n = (MAP_DEFS[m].npcs || []).find(x => x.id === id); if (n) return { kind: 'npc', map: m, x: n.x, y: n.y, name: n.name, npcId: n.id }; } return null; };
    const mobT = id => { for (const m in MAP_DEFS) if ((MAP_DEFS[m].spawns || []).some(s => s[0] === id) || MAP_DEFS[m].mvp === id) return { kind: 'mob', map: m, mobId: id, name: MOBS[id].name }; return null; };
    switch (o.type) {
      case 'talk': case 'event': case 'job': return npcT(o.npc || 'jobmaster');
      case 'kill': return mobT(o.mob);
      case 'collect': return mobT(o.mob);
      case 'hit': return { kind: 'mob', map: HOME_MAP, mobId: 'training_dummy', name: MOBS.training_dummy.name };
      case 'jobLv': case 'baseLv': { // แนะนำที่ล่าตามเลเวล
        const lv = G.player.baseLv;
        return lv < 8 ? mobT('pudding') : lv < 16 ? mobT('stumpling') : lv < 24 ? mobT('ashtail') : mobT('draugr');
      }
      case 'useskill': return mobT(G.player.baseLv < 12 ? 'stumpling' : 'ashtail');
      case 'skill': return null;
    }
    return null;
  },
  go() { const t = this.navTarget(); if (t) Nav.goTo(t); else if (this.current() && this.current().obj.type === 'skill') UI.open('w-skills'); },

  // ---------- เหตุการณ์จากเกม ----------
  onTalk(npcId) { const q = this.current(); if (q && q.obj.type === 'talk' && q.obj.npc === npcId) { this.state().n = 1; this.check(); } },
  onKill(mobId) { const q = this.current(); if (q && q.obj.type === 'kill' && q.obj.mob === mobId) { this.state().n++; this.changed(); this.check(); } },
  onHitDummy() { const q = this.current(); if (q && q.obj.type === 'hit') { this.state().n++; this.changed(); this.check(); } },
  onSkillUse() { const q = this.current(); if (q && q.obj.type === 'useskill') { this.state().n++; this.changed(); this.check(); } },
  onEvent(ev) { const q = this.current(); if (q && q.obj.type === 'event' && q.obj.ev === ev) { this.state().n = 1; this.check(); } },
  changed() { this.dirty = true; UI.dirty(); },

  // เรียกทุกเฟรม (เบา): เป้าหมายที่ขึ้นกับสถานะ (เลเวล/ไอเทม/คลาส) และอัปเดตแถบติดตาม
  tick() {
    if (!G.started || !G.player) return;
    if (G.time >= (this.nextCheck || 0)) { this.nextCheck = G.time + 0.5; this.check(); this.dirty = true; }
    if (this.dirty) { this.dirty = false; this.renderTracker(); }
  },
  check() {
    const q = this.current(); if (!q) return;
    const [a, b] = this.progress(q);
    if (a >= b) this.complete(q);
  },
  complete(q) {
    const p = G.player, s = this.state(), r = q.reward;
    if (q.obj.type === 'collect') {
      let need = q.obj.n;
      for (const e of [...p.inventory]) { if (e.id !== q.obj.item || need <= 0) continue; const k = Math.min(e.qty, need); removeEntry(e, k); need -= k; }
    }
    s.done.push(q.id); s.i++; s.n = 0;
    if (r.zeny) p.zeny += r.zeny;
    for (const [id, n] of r.items || []) addItem(id, n, true);
    if (r.bexp || r.jexp) gainExp(r.bexp || 0, r.jexp || 0);
    addFloater(p.x, p.y - 1.8, 'QUEST CLEAR!', '#ffd34a', true);
    addFx({ type: 'buff', ref: p, dur: 1.2 });
    Sound.play('quest');
    if (this.current()) setTimeout(() => Sound.play('quest_new'), 900);
    UI.msg(L(`📜 เควสต์สำเร็จ: ${q.title} — รางวัล ${this.rewardText(q)}`, `📜 Quest complete: ${q.title} — Reward: ${this.rewardText(q)}`), 'lvl');
    if (q.done) { UI.msg(`📖 ${q.done}`, 'map'); setTimeout(() => { if (G.started) UI.announce(q.done); }, 1500); } // บรรทัดเล่าเรื่อง (หลัง QUEST CLEAR)
    const nx = this.current();
    if (nx) UI.msg(L(`📜 เควสต์ใหม่: ${nx.title} — ${nx.desc}`, `📜 New quest: ${nx.title} — ${nx.desc}`), 'info');
    else UI.msg(L('📜 จบเนื้อเรื่องที่มีตอนนี้แล้ว — บทที่ 6 "รากที่ถูกแทะ" เร็ว ๆ นี้ ขอให้สนุกกับการผจญภัยใน NEO MIDGARD', '📜 You\'ve reached the end of the story so far — Chapter 6, "The Gnawed Root," is coming soon. Enjoy your adventures in NEO MIDGARD!'), 'lvl');
    UI.dirty(); this.dirty = true;
    saveGame();
  },

  // ---------- แถบติดตามบนจอ ----------
  renderTracker() {
    const el = document.getElementById('quest-track'); if (!el) return;
    const q = this.current();
    if (!q || G.player.options.questTrack === false) { el.hidden = true; return; }
    el.hidden = false;
    const [a, b] = this.progress(q);
    const key = `${q.id}|${a}|${b}|${G.player.baseLv}|${G.player.jobLv}`;
    if (el.dataset.key === key) return;
    el.dataset.key = key;
    el.dataset.ch = this.chapterText(q); // ป้ายบท (HUD แบบ Visor แสดงแทนคำว่า QUEST)
    el.innerHTML = '';
    el.append(
      h('div', { class: 'qt-title' }, h('span', { class: 'qt-ic' }, '📜'), q.title),
      h('div', { class: 'qt-obj' }, this.objText(q), b > 1 ? h('span', { class: 'qt-bar' }, h('i', { style: `width:${Math.round(a / b * 100)}%` })) : null),
    );
  },
};

// ============================================================
//  งานล่าค่าหัวประจำวัน (รับ/ส่งที่ Guard Unit Rolf) — ทำซ้ำได้ทุกวัน
//  วันละ 3 งาน สุ่มจากมอนที่เลเวลใกล้ตัวเรา (สุ่มตามวันที่+ชื่อ ได้ชุดเดิมทั้งวัน) • ทำครบ 3 งานได้โบนัส
//  เก็บใน p.bounty = { day, list: [{ mob, n, got, zeny, bexp, jexp, claimed }], bonus }
// ============================================================
const BOUNTY_MIN_LV = 8;
const Bounty = {
  today() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; },
  open() { return G.player.baseLv >= BOUNTY_MIN_LV; },
  state() {
    const p = G.player, day = this.today();
    if (!this.open()) return null;
    if (!p.bounty || p.bounty.day !== day || !Array.isArray(p.bounty.list) || p.bounty.list.some(b => !MOBS[b.mob])) p.bounty = { day, list: this.roll(p, day), bonus: false };
    return p.bounty;
  },
  mapOf(id) { return Object.keys(MAP_DEFS).find(m => (MAP_DEFS[m].spawns || []).some(s => s[0] === id)); },
  roll(p, day) {
    let h = 7; for (const c of day + p.name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const rnd = U.seeded(h);
    const pool = Object.values(MOBS).filter(m => !m.boss && !m.dummy && this.mapOf(m.id))
      .sort((a, b) => Math.abs(a.lv - p.baseLv) - Math.abs(b.lv - p.baseLv)).slice(0, 6);
    const out = [];
    while (out.length < 3 && pool.length) {
      const m = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
      const n = 8 + Math.floor(rnd() * 4) * 2; // 8–14 ตัว
      const [z0, z1] = mobZeny(m);
      out.push({ mob: m.id, n, got: 0, zeny: Math.round((z0 + z1) / 2 * n * 1.5), bexp: Math.round(m.exp * n * 0.5), jexp: Math.round(m.jexp * n * 0.5), claimed: false });
    }
    return out;
  },
  onKill(id) {
    const s = this.state(); if (!s) return;
    for (const b of s.list) if (b.mob === id && b.got < b.n) {
      b.got++;
      if (b.got === b.n) { UI.msg(L(`งานล่าค่าหัวเสร็จ: ${MOBS[id].name} ${b.n} ตัว — กลับไปรับรางวัลที่ Guard Unit Rolf`, `Bounty complete: ${b.n} ${MOBS[id].name} — return to Guard Unit Rolf for your reward`), 'lvl'); Sound.play('quest_new'); }
      UI.dirty();
    }
  },
  ready() { const s = this.state(); return s ? s.list.filter(b => b.got >= b.n && !b.claimed) : []; },
  claim(b) {
    const p = G.player, s = this.state();
    if (!s || b.claimed || b.got < b.n) return '';
    b.claimed = true; p.zeny += b.zeny; gainExp(b.bexp, b.jexp);
    let msg = L(`รับรางวัล ${U.fmt(b.zeny)} ${CUR} • ${U.fmt(b.bexp)} Base EXP • ${U.fmt(b.jexp)} Job EXP`, `Reward claimed: ${U.fmt(b.zeny)} ${CUR} • ${U.fmt(b.bexp)} Base EXP • ${U.fmt(b.jexp)} Job EXP`);
    if (!s.bonus && s.list.every(x => x.claimed)) { // โบนัสครบ 3 งาน
      s.bonus = true; addItem('yellow_potion', 3, true); addItem('blink_feather', 2, true); p.zeny += 500;
      msg += L(`<br>🎁 โบนัสทำครบ 3 งาน: Repair Kit L ×3, Blink Chip ×2, 500 ${CUR}`, `<br>🎁 All 3 bounties bonus: Repair Kit L ×3, Blink Chip ×2, 500 ${CUR}`);
    }
    addFloater(p.x, p.y - 1.8, 'BOUNTY CLEAR!', '#ffd34a', true); Sound.play('quest'); UI.dirty(); saveGame();
    return msg;
  },
  line(b) { const m = MOBS[b.mob], map = this.mapOf(b.mob); return `${m.name} ${Math.min(b.got, b.n)}/${b.n}${map ? ` • ${MAP_DEFS[map].name}` : ''}`; },
};
