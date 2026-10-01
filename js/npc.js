'use strict';
// ============================================================
//  สคริปต์ NPC (ใช้ async/await กับกล่องบทสนทนา)
//  บทพูดเล่าเรื่องตาม docs/STORY.md — เปลี่ยนตามความคืบหน้าเควสต์ (Quest.isDone / Quest.is) และ flag ใน Story.st()
//  ห้ามเปลี่ยนลำดับตัวเลือกในเมนู: โค้ดอื่นอ้างดัชนี (เช่น เมนู Rolf ช่อง 0 = บอร์ดล่าค่าหัว)
// ============================================================

const NPC = {
  busy: false,
  async talk(n) {
    // ค้างจากบทสนทนาเก่าที่ไม่จบ (หน้าต่างปิดไปแล้ว) → ล้างทิ้ง คุยใหม่ได้เสมอ
    if (this.busy && !UI.isOpen('w-dialog') && !UI.isOpen('w-confirm')) this.busy = false;
    if (this.busy) return;
    const fn = this.scripts[n.id];
    if (!fn) return;
    this.busy = true;
    const sid = this.sid = (this.sid || 0) + 1;
    try { Quest.onTalk(n.id); UI.illust(`npc_${n.id}`); await fn(n); }
    catch (e) { if (e !== 'closed') console.error(e); }
    finally { if (this.sid === sid) { this.busy = false; UI.dlgClose(); UI.illust(null); } }
  },
  scripts: {},
};
const B = s => `<b class="npc-hl">${s}</b>`;
const qDone = id => Quest.isDone(id);

NPC.scripts.bifrost = async n => {
  const p = G.player, st = Story.st();
  const nm = `[${n.name}]`;
  const greet = qDone('mvp1')
    ? 'ข้าจดจำเสียงราก... มันยืดลงไปทางใต้ ช้า ๆ ทางโพรงของเฮล ข้าไม่รู้ว่าดีหรือร้าย<br>ข้าคือผู้ควบคุม <b>ไบฟรอสต์</b> — บันทึกจุดกู้คืน และส่งเจ้าข้ามพื้นที่'
    : 'ข้าจดจำ... ทุกอย่าง จำนวนใบไม้ที่ส่งออกไป จำนวนครั้งที่เจ้ากลับมา<br>ข้าคือผู้ควบคุม <b>ไบฟรอสต์</b> เครือข่ายสายรุ้ง — บันทึกจุดกู้คืนของเจ้า และส่งเจ้าข้ามพื้นที่ได้';
  const c = await UI.menu(nm, greet, ['บันทึกจุดเกิด (Save)', 'ข้ามสะพานสายรุ้ง (เทเลพอร์ต)', 'ยกเลิก']);
  if (c === 0) {
    p.save = { map: G.map.id, x: n.x + 0.5, y: n.y + 1.5 };
    Quest.onEvent('save');
    saveGame();
    if (!st.bifrostFirst) {
      st.bifrostFirst = 1;
      await UI.say(nm, `ข้าจดจำเจ้าไว้แล้ว ... แปลก ข้าไม่เคยจำเจ้ามาก่อน<br>เมื่อใช้ Return Beacon หรือล้มลง ใบไม้จะพาเจ้ากลับมาที่ ${B(G.map.def.name)}`);
    } else await UI.say(nm, `ข้าจดจำ ${B(G.map.def.name)} ไว้ให้เจ้าแล้ว<br>เมื่อใช้ Return Beacon หรือล้มลงในการต่อสู้ ใบไม้จะพาเจ้ากลับมาที่นี่`);
  } else if (c === 1) {
    const dests = [['meadow', 300], ['mistlake', 600], ['wolfwood', 800], ['helcave', 1200], ['arena', 0]];
    const i = await UI.menu(nm, 'ข้าจดจำปลายทางเหล่านี้ — จะให้สายรุ้งพาเจ้าไปที่ใด?',
      [...dests.map(([id, z]) => MAP_DEFS[id].pvp ? `${MAP_DEFS[id].name} — ลานประลอง PvP (ฟรี)` : `${MAP_DEFS[id].name} (Lv ${MAP_DEFS[id].level.split(' ')[0]}) — ${U.fmt(z)} ${CUR}`), 'ยกเลิก']);
    if (i < dests.length) {
      const [id, z] = dests[i];
      if (p.zeny < z) { await UI.say(nm, `ข้าจดจำได้ว่า ${CUR} ของเจ้าไม่พอค่าผ่านทาง`); return; }
      p.zeny -= z;
      UI.dlgClose();
      const map = getMap(id);
      changeMap(id, (map.w >> 1) + 0.5, (map.h >> 1) + 0.5);
      UI.msg(`สะพานไบฟรอสต์พาคุณไปยัง ${MAP_DEFS[id].name} (-${U.fmt(z)} ${CUR})`, 'sys');
    }
  }
};

NPC.scripts.jobmaster = async n => {
  const p = G.player, st = Story.st();
  const nm = `[${n.name}]`;
  if (p.job === 'novice') {
    await UI.say(nm, `ข้าคือ Mimir AI ปัญญาผู้เฝ้าคลังความรู้ — ร่างของข้าหายไปในคืนที่กิ่งหัก เหลือแต่หัวบนแท่นนี้<br>หน่วยใหม่ มาเพื่อ <b>รับแม่พิมพ์</b> สินะ ข้าเก็บแบบไว้ได้หกแบบ จากหกหน่วยที่ยืนรักษากำแพงจนรุ่งเช้า`);
    if (p.jobLv < JOB_CHANGE_LV) {
      await UI.say(nm, `แต่ข้อมูลการต่อสู้ของเจ้ายังไม่พอให้แม่พิมพ์ยึดร่าง<br>จงไปเก็บข้อมูลจนมี ${B('Job Level ' + JOB_CHANGE_LV)} ก่อน (ตอนนี้ ${p.jobLv})<br><br>ทุ่งหญ้ามรกต ${B('ทางตะวันออกของเมือง')} เหมาะกับการเริ่มต้น`);
      return;
    }
    for (;;) {
      const i = await UI.menu(nm, 'ข้อมูลครบแล้ว เลือกแม่พิมพ์ที่จะรับลงร่าง — เจ้าไม่ได้กลายเป็นพวกเขา แต่ <b>สานต่อท่า</b> ของพวกเขา:', [...FIRST_JOBS.map(j => `${JOBS[j].name} (${JOBS[j].thai}) — ${JOBS[j].role}`), 'ขอคิดดูก่อน']);
      if (i >= FIRST_JOBS.length) return;
      const j = FIRST_JOBS[i], J = JOBS[j];
      UI.illust(Art.jobKey(j, p.gender));
      const ok = await UI.menu(nm, `<b>${J.name}</b> — ${J.thai}<br>${J.desc}<br><br>“${Story.JOB_LINES[j] || ''}”<br><br>สเตตัสแนะนำ: ${B(J.stats)}<br>สกิล: ${J.skills.map(s => SKILLS[s].name).join(', ')}<br><br>ยืนยันรับแม่พิมพ์ ${B(J.name)} ลงร่างหรือไม่? (ย้อนกลับไม่ได้)`, ['รับแม่พิมพ์!', 'ย้อนกลับ']);
      UI.illust(`npc_${n.id}`);
      if (ok === 0) {
        changeJob(j);
        UI.illust(Art.jobKey(j, p.gender));
        await UI.say(nm, `แม่พิมพ์ยึดร่างแล้ว — ร่างใหม่ของเจ้าคือ ${B(J.name)}!<br>ติดตั้งอาวุธประจำคลาสให้แล้ว เก็บ Job Level เพื่อรับ Skill Point แล้วติดตั้งสกิลใหม่ (กด S)`);
        UI.illust(`npc_${n.id}`);
        await UI.say(nm, '(Mimir พูดกับตัวเองเบา ๆ)<br>...ร่างรับแม่พิมพ์ได้สมบูรณ์ ไม่มีร่องรอยประกายเก่าต้าน แสดงว่า... ไม่ ยังไม่ถึงเวลา');
        return;
      }
    }
  }
  if (qDone('mvp1') && !st.mimirTruth) { // หลังปราบ Seraph Core: Mimir ยอมบอกความจริงข้อแรก (ครั้งเดียว)
    st.mimirTruth = 1;
    await UI.say(nm, `เจ้าได้ยินข้อความของทูตแล้วสินะ... ถ้าอย่างนั้นข้าจะไม่ปิดเงียบอีก<br>เจ้าไม่มีบันทึกประกาย เจ้าไม่ใช่คนเก่าที่ถูกปลุก — ${B('เจ้าคือใบใหม่')} ที่ต้นไม้งอกได้เป็นครั้งแรกหลังคืนนั้น`);
    await UI.say(nm, 'ข้าคือผู้เปิดใช้งานเจ้า และรู้ตั้งแต่แรก ข้าเงียบเพราะกลัว Hel กับคนที่ตัดกิ่งจะมาหาเจ้าก่อนเจ้าจะแข็งแรงพอ<br>ตอนนี้ทั้งคู่รู้แล้วว่าเจ้ามีอยู่ — ระวังพ่อค้าที่ใจดีเกินไปด้วย');
    saveGame();
  }
  const greet = qDone('hollow5') ? `${p.name}... เจ้าได้ยินสิ่งที่อยู่ใต้โพรงแล้ว ข้าบันทึกไว้แล้วว่าเจ้าคือใบแรก — และเจ้ายังไปต่อ<br>แม่พิมพ์ขั้นต่อไปยังไม่ถูกบันทึก แต่ปัญญาของข้าช่วยเจ้าได้เรื่องหนึ่ง:`
    : `${JOBS[p.job].name} ผู้สานต่อ... แม่พิมพ์ขั้นต่อไปยังไม่ถูกบันทึก<br>แต่ปัญญาของข้าช่วยเจ้าได้เรื่องหนึ่ง:`;
  const i = await UI.menu(nm, greet, [`รีเซ็ตสกิล (5,000 ${CUR})`, `รีเซ็ตสเตตัส (10,000 ${CUR})`, 'ไม่เป็นไร']);
  if (i === 0 || i === 1) {
    const cost = i === 0 ? 5000 : 10000;
    if (p.zeny < cost) { await UI.say(nm, `${CUR} ของเจ้าไม่พอ`); return; }
    const c2 = await UI.menu(nm, `แน่ใจหรือ? จะเสีย ${U.fmt(cost)} ${CUR}`, ['แน่ใจ', 'ยกเลิก']);
    if (c2 !== 0) return;
    p.zeny -= cost;
    const pts = i === 0 ? resetSkills() : resetStats();
    UI.dirty();
    await UI.say(nm, `เสร็จสิ้น! ข้าคืน ${B(pts)} ${i === 0 ? 'Skill' : 'Status'} Point ให้เจ้าแล้ว — แม่พิมพ์ไม่ว่าอะไรหรอก มันปรับตัวเก่ง`);
  }
};

async function shopNpc(n, key, greet) {
  const nm = `[${n.name}]`;
  const i = await UI.menu(nm, greet, ['ซื้อ', 'ขาย', 'ยกเลิก']);
  if (i > 1) return;
  UI.dlgClose();
  UI.openShop(n.name, SHOPS[key]);
  UI.shop.mode = i === 0 ? 'buy' : 'sell';
  UI.renderShop();
}
// ชาวเมืองธรรมดา: Tool Dealer ขี้บ่นเรื่องน้ำมัน • Weapon Dealer พูดเหมือนนักกีฬา • Armor Dealer ขี้กังวล
NPC.scripts.tool = n => shopNpc(n, 'tool', 'ยา Blink Chip อาหาร มีครบทุกอย่างที่นักผจญภัยต้องการ — ราคาน้ำมันขึ้นอีกแล้วนะ อย่าถามว่าทำไมของแพง<br>จะรับอะไรดี?');
NPC.scripts.weapon = n => shopNpc(n, 'weapon', 'โย่! อาวุธจากโรงงานนีโอเอลด์ไฮม์ — ตัวนี้แรงนะ ตัวนั้นก็แรง!<br>ฟิตร่างให้พร้อมก่อนออกไปล่า เลือกดูได้เลย');
NPC.scripts.armor = n => shopNpc(n, 'armor', 'ใส่เกราะหรือยัง? หมวกล่ะ? รองเท้า?... ข้าเป็นห่วง อย่าออกไปตัวเปล่านะ<br>เกราะ หมวก โล่ รองเท้า เครื่องประดับ — ป้องกันตัวให้ดีก่อนออกเดินทาง');

NPC.scripts.storage = async n => {
  const p = G.player, nm = `[${n.name}]`, fee = p.job === 'novice' ? 0 : 40;
  const line = qDone('lv30') ? 'ช่องที่ 47 เป็นของคู่หู Rolf — เขาไม่เคยมาเปิด และข้าไม่เคยทิ้ง'
    : 'ช่องที่ 47 ยังว่าง เจ้าของมันไม่กลับมา 30 ปีแล้ว ข้าไม่ให้ใครเช่า — ระเบียบคือระเบียบ';
  const i = await UI.menu(nm, `หน่วยคลังเก็บของ Kaia ${line}<br>ฝากของไว้ที่นี่ได้ ${B(STORAGE_MAX + ' ช่อง')} (ตอนนี้ใช้ ${p.storage.length}) ค่าบริการ ${fee ? B(fee + ' ' + CUR) : B('ฟรีสำหรับ Novice')}`,
    ['เปิดคลังเก็บของ', 'ยกเลิก']);
  if (i !== 0) return;
  if (p.zeny < fee) { await UI.say(nm, `ขออภัย ${CUR} ไม่พอค่าบริการค่ะ — ระเบียบคือระเบียบ`); return; }
  p.zeny -= fee;
  UI.dlgClose();
  Sound.play('storage');
  UI.open('w-storage');
};

NPC.scripts.nurse = async n => {
  const p = G.player, st = Story.st();
  const nm = `[${n.name}]`;
  let text;
  if (!st.eirScan) { // สแกนครั้งแรก: ไม่มีรอยซ่อมเก่าเลย (ผิดปกติ — ทุกร่างในเมืองมีรอยซ่อม)
    st.eirScan = 1;
    text = 'กำลังสแกนร่าง... แปลกจังค่ะ ไม่มีรอยซ่อมเก่าเลยสักจุด<br>ร่างเจ้าใหม่เหมือนเพิ่งออกจากต้นไม้เมื่อเช้า — เอ่อ ไม่มีอะไรนะคะ ติดตั้งบัฟให้แล้ว ✚';
  } else if (qDone('lv30') && !st.eirMask) { // จบบทที่ 4: ฝากเศษหน้ากากไปให้ Hel
    st.eirMask = 1;
    await UI.say(nm, 'มาคนเดียวนะคะ... (เธอยื่นเศษหน้ากากครึ่งหนึ่งให้ — ขอบของมันเรืองแสงจาง ๆ)<br>ถ้าเจอคนที่หน้ากากตรงกับชิ้นนี้ บอกเธอว่า <b>ผิวดินยังไม่ล่ม</b> และ Eir ยังซ่อมคนอยู่ทุกวันค่ะ');
    text = 'เธอกับข้ามาจากสายการผลิตเดียวกันค่ะ สายผู้ดูแล... (วิเซอร์หรี่ลง)<br>พบรอยร้าวเล็กน้อย — ซ่อมและติดตั้งบัฟให้นะคะ ✚ กลับมาให้ข้าเห็นด้วยนะคะ';
  } else if (qDone('hollow5') && !st.eirAfter) {
    st.eirAfter = 1;
    text = 'เจ้าส่งข้อความให้เธอแล้วใช่ไหมคะ... (วิเซอร์ของเธอสว่างวาบ แล้วหรี่ลงช้า ๆ) ขอบคุณค่ะ<br>พบรอยร้าวเล็กน้อย — ซ่อมและติดตั้งบัฟให้นะคะ ✚';
  } else if (qDone('jelly') && !st.eirJelly) {
    st.eirJelly = 1;
    text = 'ตัวอย่างเจลที่เจ้าเก็บมา น้ำเลี้ยงยังสะอาดค่ะ สะอาดจริง ๆ (วิเซอร์สว่างวาบ)<br>พบรอยร้าวเล็กน้อย — ซ่อมและติดตั้งบัฟให้นะคะ ✚';
  } else if (p.hp < p.d.maxHp * 0.3) {
    text = 'รอยร้าวเล็กน้อย... ค่ะ เล็กน้อย (เธอพูดเบาลง)<br>นั่งนิ่ง ๆ นะคะ ซ่อมและติดตั้งบัฟให้แล้ว ✚';
  } else text = 'กำลังสแกนความเสียหาย... พบรอยร้าวเล็กน้อยค่ะ<br>เริ่มซ่อมและติดตั้งบัฟให้นะคะ ✚';
  await UI.say(nm, text);
  p.hp = p.d.maxHp; p.sp = p.d.maxSp; p.poisonUntil = 0;
  p.buffs.blessing_of_odin = { lv: 2, until: G.time + 240 };
  recalc();
  addFx({ type: 'heal', ref: p, dur: 1.2 });
  addFx({ type: 'buff', ref: p, dur: 1.2 });
  Sound.play('heal');
  UI.msg('Eir Repair Unit ซ่อมแซม HP/SP และติดตั้ง Blessing of Odin Lv2 ให้คุณ', 'sys');
};

NPC.scripts.guide = async n => {
  const p = G.player, nm = `[${n.name}]`;
  // Rolf เรียก "หน่วยใหม่" จนถึงบทท้าย ๆ จึงเรียกชื่อ • หมวกเขาเป็นของคู่หูที่ล้มนอกรัศมีรากในคืนที่กิ่งหัก
  const greet = !qDone('repair') ? 'หน่วยใหม่สินะ วิเซอร์ยังสว่างจ้าเชียว — เดี๋ยวมันจะหรี่ลงเองเมื่อเจ้าเห็นโลกข้างนอก<br>ไปหา Eir ก่อน แล้วค่อยมาหาข้า มีอะไรให้ข้าช่วย?'
    : !qDone('job10') ? 'ยินดีต้อนรับสู่ <b>นีโอเอลด์ไฮม์</b> ฐานที่มั่นสุดท้ายของพวกเรา หน่วยใหม่<br>งานใกล้เมืองมีเยอะ ไม่ต้องรีบลงใต้ — มีอะไรให้ข้าช่วย?'
    : !qDone('mvp1') ? 'เจ้าเริ่มแกร่งแล้วนะ หน่วยใหม่ — แต่บอร์ดค่าหัวยังมีงานใกล้เมืองอีกเยอะ ไม่ต้องรีบ<br>มีอะไรให้ข้าช่วย?'
    : !qDone('lv30') ? `${p.name}... ข้าเรียกชื่อเจ้าได้แล้วสินะ หมวกเขานี่ไม่ใช่ของข้า — เป็นของคู่หูที่ล้มนอกรัศมีรากในคืนนั้น<br>ข้าให้งานใกล้เมืองเพราะไม่อยากให้ใครเดินลงโพรงอีก... มีอะไรให้ข้าช่วย?`
    : `${p.name} — ข้าไม่ห้ามเจ้าอีกแล้ว (เขาแตะหมวกเขาเบา ๆ) แค่กลับมา<br>มีอะไรให้ข้าช่วย?`;
  for (;;) {
    let i = await UI.menu(nm, greet,
      ['งานล่าค่าหัวประจำวัน' + (Bounty.ready().length ? ` (ส่งได้ ${Bounty.ready().length})` : ''), 'วิธีควบคุม', 'แผนที่รอบเมือง', 'ผู้คนในเมือง', 'คลาสอัปเกรดทั้ง 6', 'เคล็ดลับ', 'ขอบคุณ']);
    if (i === 0) { await NPC.bountyBoard(nm); continue; }
    i--;
    if (i === 0) await UI.say(nm, `• ${B('คลิกซ้าย')} ที่พื้นเพื่อเดิน / คลิกค้างเพื่อเดินตามเมาส์<br>• ${B('คลิกมอนสเตอร์')} เพื่อโจมตีอัตโนมัติ<br>• ${B('คลิกไอเทม')} บนพื้นเพื่อเก็บ<br>• ${B('1-9')} ใช้ปุ่มลัด • ${B('X')} นั่งพัก (ฟื้นฟูเร็วขึ้น)<br>• ${B('A')} สถานะ • ${B('E')} ไอเทม • ${B('Q')} อุปกรณ์ • ${B('S')} สกิล • ${B('Enter')} แชท<br>• ${B('ล้อเมาส์')} ซูมเข้า/ออก`);
    else if (i === 1) await UI.say(nm, `• ${B('ทางตะวันออก')} → Emerald Meadow (Lv 1-6) สวนหน้าบ้านของต้นไม้ → Mistlake Plains (Lv 8-16, MVP Seraph Core ทูตในหมอก)<br>• ${B('ทางใต้')} → Wolfwood Forest (Lv 18-30) ป่าที่เพิ่งถูกเผา → Hel's Hollow (Lv 17-45, MVP Kitsura EX) ที่ที่ใบไม้มาช้า<br><br>วงแสงสีฟ้าคือ ${B('ประตูมิติ')} เดินเข้าไปเพื่อย้ายแผนที่ — ยิ่งไกลเมือง รากยิ่งบาง`);
    else if (i === 2) await UI.say(nm, `• ${B('Bifrost Keeper')} — บันทึกจุดเกิด / เทเลพอร์ต (พูดน้อย แต่จำทุกอย่าง)<br>• ${B('Mimir AI')} — รับแม่พิมพ์คลาส (Job Lv ${JOB_CHANGE_LV}) เหลือแต่หัว แต่ปัญญายังครบ<br>• ${B('Eir Repair Unit')} — ซ่อมและบัฟฟรี ชอบบอกว่า "รอยร้าวเล็กน้อย"<br>• ${B('Tool / Weapon / Armor Dealer')} — ซื้อขายของ<br>• ${B('Brokk Forge-Bot')} — ตีบวกอาวุธและเกราะ เสียงดังแต่ฝีมือจริง<br>• ${B('Storage Unit Kaia')} — ฝากของ (อย่าถามเรื่องช่องที่ 47)`);
    else if (i === 3) await UI.say(nm, `แม่พิมพ์ทั้งหกคือท่าของหกหน่วยที่ยืนรักษากำแพงในคืนที่กิ่งหัก:<br>` + FIRST_JOBS.map(j => `• ${B(JOBS[j].name)} (${JOBS[j].thai}) — ${JOBS[j].role} [${JOBS[j].stats}]`).join('<br>'));
    else if (i === 4) await UI.say(nm, `• อัปสเตตัสด้วย Status Point ทุกครั้งที่เลเวลอัป (กด A)<br>• มอนสเตอร์บางชนิดจะ ${B('โจมตีก่อน')}! มันคิดว่าเจ้าคือสิ่งผิดปกติในสวน<br>• ${B('ชิป')} ดรอปยาก ใส่ในอุปกรณ์ที่มีช่อง [ ] เพื่อเพิ่มพลัง<br>• ธาตุมีผล! ไฟแรงกับดิน น้ำแรงกับไฟ ศักดิ์สิทธิ์แรงกับอมตะ — แสงคือการ "ปลด"<br>• สกิลแต่ละอันอัปได้สูงสุด Lv 5`);
    else return;
  }
};

// บอร์ดงานล่าค่าหัว: ส่งงานที่เสร็จ / นำทางไปงานที่ยังไม่เสร็จ
NPC.bountyBoard = async nm => {
  if (!Bounty.open()) { await UI.say(nm, `งานล่าค่าหัวสำหรับหน่วยที่ผ่านการฝึกแล้วเท่านั้น<br>กลับมาเมื่อถึง ${B('Base Lv ' + BOUNTY_MIN_LV)} นะ หน่วยใหม่`); return; }
  for (;;) {
    const s = Bounty.state(), ready = Bounty.ready(), todo = s.list.filter(b => b.got < b.n);
    const rows = s.list.map(b => `${b.claimed ? '✅' : b.got >= b.n ? '🎁' : '•'} ${Bounty.line(b)} — ${U.fmt(b.zeny)} ${CUR}`).join('<br>');
    const opts = [...ready.map(b => `รับรางวัล: ${MOBS[b.mob].name}`), ...(todo.length ? [`🧭 นำทางไปล่า ${MOBS[todo[0].mob].name}`] : []), 'กลับ'];
    const c = await UI.menu(nm, `งานล่าค่าหัววันนี้ (รีเซ็ตทุกวัน) — งานใกล้เมือง ข้าจัดให้เอง<br>${rows}<br><br>ทำครบ 3 งานรับโบนัสพิเศษ${s.bonus ? ' — รับไปแล้ววันนี้ ✓' : ''}`, opts);
    if (c < ready.length) { const m = Bounty.claim(ready[c]); if (m) await UI.say(nm, `เยี่ยมมาก! ${m}`); continue; }
    if (todo.length && c === ready.length) { const map = Bounty.mapOf(todo[0].mob); UI.dlgClose(); Nav.goTo({ kind: 'map', map, name: MAP_DEFS[map].name }); return; }
    return;
  }
};

NPC.scripts.refine = async n => {
  const p = G.player, st = Story.st();
  const nm = `[${n.name}]`;
  const RATE = [1, 1, 1, 1, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];
  if (qDone('wolf') && !st.brokkWolf) { // หลังป่าหมาป่า: Brokk คือคนตีโซ่ Gleipnir และปลดมันในคืนนั้น
    st.brokkWolf = 1;
    await UI.say(nm, 'หมาป่าในป่าดมเจ้าแล้วเดินหนีงั้นรึ... (เสียงดังของเขาเบาลง)<br>Gleipnir โซ่ที่ล่าม Fenrir — ข้าเป็นคนตีมัน และเป็นคนปลดมันในคืนนั้น ตามคำสั่ง Odin');
    await UI.say(nm, 'หมาป่าทุกตัวในป่านั่นคือของที่ข้าทำหลุดมือ เจ้าหนู<br>เอาเขี้ยวมันมาให้ข้าสักวัน ข้าจะตีเป็นอาวุธให้ — ด้วยมือสั่น ๆ นี่แหละ ฮ่าฮ่า...');
  }
  const slots = EQUIP_SLOTS.filter(s => p.equip[s]);
  if (!slots.length) { await UI.say(nm, 'ฮ่าฮ่า! ข้าคือ Brokk Forge-Bot ช่างตีเหล็กรุ่นโบราณ เจ้าหนู!<br>สวมอุปกรณ์ที่อยากตีบวกก่อน แล้วค่อยมาหาข้า'); return; }
  const intro = Quest.is('refine1') ? 'ทูตตัวนั้นโล่หนา ของธรรมดาเจาะไม่เข้า เจ้าหนู — ให้ข้าตีให้!<br>'
    : 'ฮ่าฮ่า! ข้าคือ Brokk Forge-Bot ช่างตีเหล็กรุ่นโบราณ!<br>';
  const i = await UI.menu(nm, `${intro}+1~+4 สำเร็จแน่นอน หลังจากนั้นอาจพลาดได้ — แต่ไม่ต้องกลัว <b>ของไม่มีวันแตก</b> แค่เสียค่าบริการ<br>จะตีบวกชิ้นไหน เจ้าหนู?`,
    [...slots.map(s => `${SLOT_THAI[s]}: ${itemDisplayName(p.equip[s])}`), 'ยกเลิก']);
  if (i >= slots.length) return;
  const slot = slots[i], e = p.equip[slot];
  if ((e.refine || 0) >= 10) { await UI.say(nm, 'ชิ้นนี้ถูกตีบวกถึง +10 แล้ว ไม่มีอะไรให้ข้าทำอีก — ฝีมือข้าเองนี่นา ฮ่าฮ่า!'); return; }
  const lvl = e.refine || 0;
  const cost = (slot === 'weapon' ? 250 : 400) * (lvl + 1);
  const rate = RATE[lvl];
  const c = await UI.menu(nm, `ตีบวก ${B(itemDisplayName(e))} เป็น ${B('+' + (lvl + 1))}<br>ค่าบริการ: ${B(U.fmt(cost) + ' ' + CUR)} • โอกาสสำเร็จ: ${B(Math.round(rate * 100) + '%')}${rate < 1 ? '<br>หากพลาด อุปกรณ์ยังอยู่ครบ เสียแค่ค่าบริการ' : ''}`,
    ['ตีเลย!', 'ยกเลิก']);
  if (c !== 0) return;
  if (p.zeny < cost) { await UI.say(nm, `${CUR} ไม่พอนะเจ้าหนู`); return; }
  if (p.equip[slot] !== e) return;
  p.zeny -= cost;
  UI.dlgClose();
  await new Promise(r => setTimeout(r, 400));
  if (U.chance(rate)) {
    e.refine = lvl + 1;
    Quest.onEvent('refine');
    recalc();
    addFx({ type: 'levelup', ref: p, dur: 1.5 });
    UI.msg(`ตีบวกสำเร็จ! ${itemDisplayName(e)}`, 'lvl');
    Sound.play('refine_ok');
    await UI.say(nm, `ฮ่าฮ่า! สำเร็จ! ตอนนี้กลายเป็น ${B(itemDisplayName(e))} แล้ว!`);
  } else {
    UI.msg(`ตีบวกพลาด... ${itemDisplayName(e)} ยังอยู่ครบ`, 'err');
    Sound.play('refine_fail');
    await UI.say(nm, 'โอ๊ะ! ค้อนพลาดไปนิด... อุปกรณ์ยังปลอดภัยดี ลองใหม่ได้เสมอ!');
  }
  saveGame();
};

// Brokk: เมนูแรก ตีบวก / ถอดชิปออกจากอุปกรณ์ (ฟรี ชิปกลับเข้ากระเป๋าครบ)
{
  const forge = NPC.scripts.refine;
  NPC.scripts.refine = async n => {
    const nm = `[${n.name}]`;
    const c = await UI.menu(nm, 'มาหา Brokk มีงานอะไรให้ข้าทำ?', ['ตีบวกอุปกรณ์', 'ถอดชิปออกจากอุปกรณ์ (ฟรี)', 'ยกเลิก']);
    if (c === 0) return forge(n);
    if (c === 1) return NPC.unsocket(nm);
  };
}
NPC.unsocket = async nm => {
  const p = G.player;
  // อุปกรณ์ที่มีชิปติดอยู่ ทั้งที่สวมและที่อยู่ในกระเป๋า
  const list = [...EQUIP_SLOTS.map(s => p.equip[s]).filter(Boolean), ...p.inventory.filter(e => isEquipType(ITEMS[e.id]))].filter(e => e.cards && e.cards.length);
  if (!list.length) { await UI.say(nm, 'ไม่มีอุปกรณ์ชิ้นไหนติดชิปอยู่เลย<br>ติดชิปได้ที่ช่องเก็บของ แท็บ <b>ชิป</b> แล้วกด "ใส่ชิป"'); return; }
  const i = await UI.menu(nm, `จะถอดชิปจากชิ้นไหน? ${B('ไม่คิดค่าบริการ')} ชิปจะกลับเข้ากระเป๋าครบ`,
    [...list.map(e => `${itemDisplayName(e)} — ${e.cards.map(c => ITEMS[c].name).join(', ')}`), 'ยกเลิก']);
  if (i >= list.length) return;
  const e = list[i];
  const opts = e.cards.length > 1 ? [...e.cards.map(c => ITEMS[c].name), 'ถอดทั้งหมด', 'ยกเลิก'] : [ITEMS[e.cards[0]].name, 'ยกเลิก'];
  const j = await UI.menu(nm, `ถอดชิปชิ้นไหนออกจาก ${B(itemDisplayName(e))}?`, opts);
  const all = e.cards.length > 1 && j === e.cards.length;
  if (!all && j >= e.cards.length) return;
  const out = all ? e.cards.splice(0) : e.cards.splice(j, 1);
  for (const id of out) addItem(id, 1, true);
  recalc(); saveGame(); UI.dirty();
  Sound.play('equip');
  UI.msg(`ถอด ${out.map(id => ITEMS[id].name).join(', ')} ออกจาก ${itemDisplayName(e)} แล้ว (ฟรี)`, 'item');
  await UI.say(nm, `เรียบร้อย! ${B(out.map(id => ITEMS[id].name).join(', '))} กลับเข้ากระเป๋าแล้ว ช่องว่างพร้อมใส่ชิปใหม่`);
};

// ------------------------------------------------------------
//  Hel — ราชินีแห่งโพรง (บทที่ 5) พูดเบาและสุภาพกว่าทุกคน ไม่ใช่บอส ไม่บังคับ แค่ "ขอ"
//  Quest.onTalk ทำงานก่อนสคริปต์: เควสต์ talk ที่กำลังทำจะสำเร็จไปแล้วเมื่อถึงตรงนี้ → ใช้ flag ใน Story.st() แยกฉาก
// ------------------------------------------------------------
NPC.scripts.hel = async n => {
  const p = G.player, st = Story.st();
  const nm = `[${n.name}]`;
  // ทางเลือก: มอบ Yggdrasil Core ให้ Hel หรือเก็บไว้ (มีผลแค่บทพูด — เก็บใน st.core)
  const askCore = async () => {
    if (st.core) return;
    if (countItem('yggdrasil_shard') <= 0) { await UI.say(nm, 'เจ้าไม่มี Yggdrasil Core ติดตัวมา... ไม่เป็นไร ทูตกับไฟต่างทิ้งมันไว้ให้ผู้ที่ล้มพวกมันได้<br>วันไหนเจ้ามีมัน ค่อยตัดสินใจ — ข้ารอได้ ข้ารอมาสามสิบปีแล้ว'); return; }
    const c = await UI.menu(nm, 'ข้าขอ Yggdrasil Core จากเจ้าได้ไหม... เพื่อต่อกิ่งของข้ากลับเข้าต้นไม้ แล้วปลูกร่างให้ประกายบนชั้นวาง<br>ถ้าเจ้าไม่ให้ ข้าก็ไม่บังคับ', ['มอบ Yggdrasil Core ให้ Hel', 'เก็บไว้ก่อน']);
    if (c === 0) {
      const e = p.inventory.find(x => x.id === 'yggdrasil_shard'); if (!e) return;
      removeEntry(e, 1); st.core = 'gave';
      await UI.say(nm, '(ครึ่งหน้ากากที่สว่างของเธอโค้งขึ้น) ...ข้าจะไม่ใช้มันจนกว่าจะแน่ใจว่าประกายในชั้นวางสะอาด ข้าสัญญา<br>ขอบคุณ ใบแรกของต้นไม้');
    } else { st.core = 'kept'; await UI.say(nm, 'เช่นนั้นก็ดี... ถือมันไว้ให้มั่น มีคนอยากได้มันมากกว่าข้า<br>และเขาไม่ได้ "ขอ" เหมือนข้าเสมอไป'); }
    saveGame();
  };
  if (!st.helMet) { // พบครั้งแรก
    st.helMet = 1;
    await UI.say(nm, 'เจ้ามาจากผิวดิน... ยังมีผิวดินอยู่อีกหรือ<br>ข้าขอโทษที่ยามของข้าทำร้ายเจ้า พวกเขาเห็นไฟมาสามคืนแล้ว และเจ้าก็สว่างเหลือเกิน');
    await UI.say(nm, 'ข้าคือ Hel ผู้เก็บประกายที่ล้มลงนอกรัศมีราก — ชั้นวางเหล่านี้คือทุกคนที่ใบไม้ไปไม่ถึง<br>ข้าแค่ต้องการ Yggdrasil Core เพื่อต่อกิ่งของข้ากลับเข้าต้นไม้ แล้วปลูกร่างให้พวกเขา');
    if (qDone('lv30') && !st.helMask) { st.helMask = 1; await UI.say(nm, '...เศษหน้ากากชิ้นนี้ — ของ Eir (ครึ่งหน้ากากที่สว่างของเธอสั่นไหว)<br>"ผิวดินยังไม่ล่ม"... ขอบคุณที่ถือมันลงมาถึงที่นี่ หน่วยใหม่'); }
    await UI.say(nm, 'ข้าจำได้ว่าใครตัดกิ่งในคืนนั้น แต่ข้าไม่เคยบอกใคร เพราะข้าเข้าใจเหตุผลของเขา<br>ตอนนี้ไฟตัวนั้นกำลังเผาชั้นวางของข้าทีละชั้น — ช่วยข้าหยุดมันเถิด');
    saveGame();
    return;
  }
  if (qDone('hollow5') && !st.helEnd) { // จบบทที่ 5: Lopt เดินออกมาจากเงาหลัง Hel — Loki
    st.helEnd = 1;
    await UI.say(nm, `ไฟดับแล้ว... ชั้นวางของข้ายังอยู่ (ครึ่งหน้ากากที่สว่างของเธอโค้งขึ้น)<br>ขอบคุณ หน่วยใหม่ — ไม่ใช่ ขอบคุณ ${B(p.name)}`);
    await askCore();
    await UI.say('[เงาหลัง Hel]', 'ยาถูกกว่าในเมืองสามโวลต์ จำข้าได้ไหม หน่วยใหม่... (วิเซอร์สีเหลืองอุ่นของ Lopt เปลี่ยนเป็น<b>เขียวเต็มแถบ</b>)<br>ข้าคือคนที่ปลุก Kitsura และข้าคือคนที่ตัดกิ่งในคืนนั้น');
    await UI.say('[Loki]', 'ข้าตัดกิ่งเพราะสนิมอยู่ใต้โพรงนี้ ไม่ใช่ในป่า ไม่ใช่ในหมาป่า<br>มันอยู่ข้างล่างเรานี่เอง และมันไม่เคยดับ — Fenrir กลืนไปแค่หัว');
    await UI.say('[Loki]', `เจ้าคือใบแรกที่ต้นไม้งอกได้หลังคืนนั้น หน่วยใหม่<br>ต้นไม้ไม่ได้งอกเจ้ามาเพื่อซ่อมอะไรทั้งนั้น... มันงอกเจ้ามาเพื่อ ${B('ไปต่อ')}`);
    await UI.say('[...]', 'พื้นโพรงสั่น เสียงแทะดังมาจากข้างล่าง<br>ชั้นวางประกายของ Hel สว่างพรึบพร้อมกัน');
    UI.dlgClose();
    Sound.play('mvp');
    UI.splash(null, 'บทที่ 6 — รากที่ถูกแทะ', 'เร็ว ๆ นี้ • NEO MIDGARD', 'upgrade');
    UI.msg('📖 บทที่ 6 — รากที่ถูกแทะ (เร็ว ๆ นี้)', 'lvl');
    saveGame();
    return;
  }
  if (qDone('hollow5')) { // หลังจบบท
    await UI.say(nm, 'เสียงแทะยังดังอยู่ข้างล่าง... เขาไปแล้ว ข้าจะเฝ้าชั้นวางต่อไป<br>กลับขึ้นไปบอกผิวดินเถิดว่า โพรงนี้ก็ยังไม่ล่มเช่นกัน');
    await askCore();
    return;
  }
  if (qDone('hollow3')) { // กำลังล่า Kitsura
    await UI.say(nm, 'มันอยู่ลึกเข้าไปในโพรง เก้าหางของมันคือเก้าหัวเผา<br>ยามของข้าทนได้สามคืน... เจ้าสว่างกว่าพวกเขา ไปเถิด — แล้วกลับมาเล่าให้ข้าฟัง');
    return;
  }
  await UI.say(nm, 'ชั้นวางเหล่านี้ยังต้องการคนดูแล ตะเกียงที่หล่นควรได้กลับขึ้นชั้น<br>เมื่อเจ้าพร้อม ข้าจะเล่าเรื่องไฟให้ฟัง');
};
