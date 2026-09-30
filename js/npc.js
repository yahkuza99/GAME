'use strict';
// ============================================================
//  สคริปต์ NPC (ใช้ async/await กับกล่องบทสนทนา)
// ============================================================

const NPC = {
  busy: false,
  async talk(n) {
    if (this.busy) return;
    const fn = this.scripts[n.id];
    if (!fn) return;
    this.busy = true;
    try { await fn(n); }
    catch (e) { if (e !== 'closed') console.error(e); }
    finally { this.busy = false; UI.dlgClose(); }
  },
  scripts: {},
};
const B = s => `<b class="npc-hl">${s}</b>`;

NPC.scripts.bifrost = async n => {
  const p = G.player;
  const nm = `[${n.name}]`;
  const c = await UI.menu(nm, 'ข้าคือผู้ควบคุม <b>ไบฟรอสต์</b> เครือข่ายเทเลพอร์ตสายรุ้ง<br>ข้าบันทึกจุดกู้คืนของเจ้า และส่งเจ้าข้ามพื้นที่ได้',
    ['บันทึกจุดเกิด (Save)', 'ข้ามสะพานสายรุ้ง (เทเลพอร์ต)', 'ยกเลิก']);
  if (c === 0) {
    p.save = { map: G.map.id, x: n.x + 0.5, y: n.y + 1.5 };
    saveGame();
    await UI.say(nm, `ข้าจดจำ ${B(G.map.def.name)} ไว้ให้เจ้าแล้ว<br>เมื่อใช้ Return Beacon หรือล้มลงในการต่อสู้ เจ้าจะกลับมาที่นี่`);
  } else if (c === 1) {
    const dests = [['meadow', 300], ['mistlake', 600], ['wolfwood', 800], ['helcave', 1200]];
    const i = await UI.menu(nm, 'จะให้สายรุ้งพาเจ้าไปที่ใด?',
      [...dests.map(([id, z]) => `${MAP_DEFS[id].name} (Lv ${MAP_DEFS[id].level.split(' ')[0]}) — ${U.fmt(z)} z`), 'ยกเลิก']);
    if (i < dests.length) {
      const [id, z] = dests[i];
      if (p.zeny < z) { await UI.say(nm, 'Zeny ของเจ้าไม่พอสำหรับค่าผ่านทาง'); return; }
      p.zeny -= z;
      UI.dlgClose();
      const map = getMap(id);
      changeMap(id, (map.w >> 1) + 0.5, (map.h >> 1) + 0.5);
      UI.msg(`สะพานไบฟรอสต์พาคุณไปยัง ${MAP_DEFS[id].name} (-${U.fmt(z)} z)`, 'sys');
    }
  }
};

NPC.scripts.jobmaster = async n => {
  const p = G.player;
  const nm = `[${n.name}]`;
  if (p.job === 'novice') {
    await UI.say(nm, `ข้าคือ Mimir AI ปัญญาประดิษฐ์ผู้เฝ้าคลังความรู้...<br>หน่วยใหม่อย่างเจ้า ต้องการติดตั้งโปรแกรมอาชีพสินะ`);
    if (p.jobLv < JOB_CHANGE_LV) {
      await UI.say(nm, `แต่เจ้ายังอ่อนประสบการณ์นัก!<br>จงไปฝึกจนมี ${B('Job Level ' + JOB_CHANGE_LV)} ก่อน (ตอนนี้ ${p.jobLv})<br><br>ทุ่งหญ้ามรกต ${B('ทางตะวันออกของเมือง')} เหมาะกับการเริ่มต้น`);
      return;
    }
    for (;;) {
      const i = await UI.menu(nm, 'เจ้าพร้อมแล้ว! จงเลือกเส้นทางแห่งโชคชะตา:', [...FIRST_JOBS.map(j => `${JOBS[j].name} (${JOBS[j].thai}) — ${JOBS[j].role}`), 'ขอคิดดูก่อน']);
      if (i >= FIRST_JOBS.length) return;
      const j = FIRST_JOBS[i], J = JOBS[j];
      const ok = await UI.menu(nm, `<b>${J.name}</b> — ${J.thai}<br>${J.desc}<br><br>สเตตัสแนะนำ: ${B(J.stats)}<br>สกิล: ${J.skills.map(s => SKILLS[s].name).join(', ')}<br><br>ยืนยันที่จะเป็น ${B(J.name)} หรือไม่? (เปลี่ยนกลับไม่ได้)`, ['ยืนยัน!', 'ย้อนกลับ']);
      if (ok === 0) {
        changeJob(j);
        await UI.say(nm, `จากนี้ไปเจ้าคือ ${B(J.name)}!<br>ข้ามอบอาวุธประจำอาชีพให้เจ้าแล้ว เก็บ Job Level เพื่อรับ Skill Point แล้วเรียนสกิลใหม่ (กด S)`);
        return;
      }
    }
  }
  const i = await UI.menu(nm, `${JOBS[p.job].name} ผู้กล้า... เส้นทางขั้นต่อไปยังซ่อนอยู่ในสายหมอกแห่งอนาคต<br>แต่ปัญญาของข้าช่วยเจ้าได้เรื่องหนึ่ง:`,
    ['รีเซ็ตสกิล (5,000 z)', 'รีเซ็ตสเตตัส (10,000 z)', 'ไม่เป็นไร']);
  if (i === 0 || i === 1) {
    const cost = i === 0 ? 5000 : 10000;
    if (p.zeny < cost) { await UI.say(nm, 'Zeny ของเจ้าไม่พอ'); return; }
    const c2 = await UI.menu(nm, `แน่ใจหรือ? จะเสีย ${U.fmt(cost)} z`, ['แน่ใจ', 'ยกเลิก']);
    if (c2 !== 0) return;
    p.zeny -= cost;
    const pts = i === 0 ? resetSkills() : resetStats();
    UI.dirty();
    await UI.say(nm, `เสร็จสิ้น! เจ้าได้รับคืน ${B(pts)} ${i === 0 ? 'Skill' : 'Status'} Point`);
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
NPC.scripts.tool = n => shopNpc(n, 'tool', 'ยินดีต้อนรับ! ยา ปีกผีเสื้อ อาหาร มีครบทุกอย่างที่นักผจญภัยต้องการ!');
NPC.scripts.weapon = n => shopNpc(n, 'weapon', 'อาวุธชั้นดีจากโรงงานนีโอเอลด์ไฮม์! เลือกดูได้เลย');
NPC.scripts.armor = n => shopNpc(n, 'armor', 'เกราะ หมวก โล่ รองเท้า และเครื่องประดับ ป้องกันตัวให้ดีก่อนออกเดินทางนะ!');

NPC.scripts.nurse = async n => {
  const p = G.player;
  const nm = `[${n.name}]`;
  await UI.say(nm, 'กำลังสแกนความเสียหาย... พบรอยร้าวเล็กน้อย<br>เริ่มซ่อมแซมและติดตั้งบัฟให้นะ ✚');
  p.hp = p.d.maxHp; p.sp = p.d.maxSp; p.poisonUntil = 0;
  p.buffs.blessing_of_odin = { lv: 2, until: G.time + 240 };
  recalc();
  addFx({ type: 'heal', ref: p, dur: 1.2 });
  addFx({ type: 'buff', ref: p, dur: 1.2 });
  Sound.play('heal');
  UI.msg('Eir Repair Unit ซ่อมแซม HP/SP และติดตั้ง Blessing of Odin Lv2 ให้คุณ', 'sys');
};

NPC.scripts.guide = async n => {
  const nm = `[${n.name}]`;
  for (;;) {
    const i = await UI.menu(nm, 'ยินดีต้อนรับสู่ <b>นีโอเอลด์ไฮม์</b> ฐานที่มั่นสุดท้ายของแอนดรอยด์!<br>มีอะไรให้ข้าช่วยแนะนำ?',
      ['วิธีควบคุม', 'แผนที่รอบเมือง', 'ผู้คนในเมือง', 'อาชีพทั้ง 6', 'เคล็ดลับ', 'ขอบคุณ']);
    if (i === 0) await UI.say(nm, `• ${B('คลิกซ้าย')} ที่พื้นเพื่อเดิน / คลิกค้างเพื่อเดินตามเมาส์<br>• ${B('คลิกมอนสเตอร์')} เพื่อโจมตีอัตโนมัติ<br>• ${B('คลิกไอเทม')} บนพื้นเพื่อเก็บ<br>• ${B('1-9')} ใช้ปุ่มลัด • ${B('X')} นั่งพัก (ฟื้นฟูเร็วขึ้น)<br>• ${B('A')} สถานะ • ${B('E')} ไอเทม • ${B('Q')} อุปกรณ์ • ${B('S')} สกิล • ${B('Enter')} แชท<br>• ${B('ล้อเมาส์')} ซูมเข้า/ออก`);
    else if (i === 1) await UI.say(nm, `• ${B('ทางตะวันออก')} → Emerald Meadow (Lv 1-6) → Mistlake Plains (Lv 8-16, MVP Seraph Core)<br>• ${B('ทางใต้')} → Wolfwood Forest (Lv 18-30) → Hel's Hollow (Lv 17-45, MVP Kitsura EX)<br><br>วงแสงสีฟ้าคือ ${B('ประตูมิติ')} เดินเข้าไปเพื่อย้ายแผนที่`);
    else if (i === 2) await UI.say(nm, `• ${B('Bifrost Keeper')} — บันทึกจุดเกิด / เทเลพอร์ต<br>• ${B('Mimir AI')} — เปลี่ยนอาชีพ (Job Lv ${JOB_CHANGE_LV})<br>• ${B('Eir Repair Unit')} — ซ่อมแซมและบัฟฟรี<br>• ${B('Tool / Weapon / Armor Dealer')} — ซื้อขายของ<br>• ${B('Brokk Forge-Bot')} — ตีบวกอาวุธและชุดเกราะ`);
    else if (i === 3) await UI.say(nm, FIRST_JOBS.map(j => `• ${B(JOBS[j].name)} (${JOBS[j].thai}) — ${JOBS[j].role} [${JOBS[j].stats}]`).join('<br>'));
    else if (i === 4) await UI.say(nm, `• อัปสเตตัสด้วย Status Point ทุกครั้งที่เลเวลอัป (กด A)<br>• มอนสเตอร์บางชนิดจะ ${B('โจมตีก่อน')}! ระวังตัวด้วย<br>• ${B('ชิป')} ดรอปยาก ใส่ในอุปกรณ์ที่มีช่อง [ ] เพื่อเพิ่มพลัง<br>• ธาตุมีผล! ไฟแรงกับดิน น้ำแรงกับไฟ ศักดิ์สิทธิ์แรงกับอมตะ<br>• สกิลแต่ละอันอัปได้สูงสุด Lv 5`);
    else return;
  }
};

NPC.scripts.refine = async n => {
  const p = G.player;
  const nm = `[${n.name}]`;
  const RATE = [1, 1, 1, 1, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];
  const slots = EQUIP_SLOTS.filter(s => p.equip[s]);
  if (!slots.length) { await UI.say(nm, 'ข้าคือ Brokk Forge-Bot หุ่นช่างตีเหล็กรุ่นโบราณ!<br>สวมอุปกรณ์ที่ต้องการตีบวกก่อน แล้วค่อยมาหาข้า'); return; }
  const i = await UI.menu(nm, 'ข้าคือ Brokk Forge-Bot หุ่นช่างตีเหล็กรุ่นโบราณ!<br>+1~+4 สำเร็จแน่นอน แต่หลังจากนั้น... <b style="color:#c03030">ถ้าล้มเหลว อุปกรณ์จะแตก!</b><br>จะตีบวกชิ้นไหน?',
    [...slots.map(s => `${SLOT_THAI[s]}: ${itemDisplayName(p.equip[s])}`), 'ยกเลิก']);
  if (i >= slots.length) return;
  const slot = slots[i], e = p.equip[slot];
  if ((e.refine || 0) >= 10) { await UI.say(nm, 'ชิ้นนี้ถูกตีบวกถึง +10 แล้ว ไม่มีอะไรให้ข้าทำอีก!'); return; }
  const lvl = e.refine || 0;
  const cost = (slot === 'weapon' ? 250 : 400) * (lvl + 1);
  const rate = RATE[lvl];
  const c = await UI.menu(nm, `ตีบวก ${B(itemDisplayName(e))} เป็น ${B('+' + (lvl + 1))}<br>ค่าบริการ: ${B(U.fmt(cost) + ' z')} • โอกาสสำเร็จ: ${B(Math.round(rate * 100) + '%')}${rate < 1 ? '<br><span style="color:#c03030">หากล้มเหลว อุปกรณ์จะหายไป!</span>' : ''}`,
    ['ตีเลย!', 'ยกเลิก']);
  if (c !== 0) return;
  if (p.zeny < cost) { await UI.say(nm, 'Zeny ไม่พอนะเจ้าหนู'); return; }
  if (p.equip[slot] !== e) return;
  p.zeny -= cost;
  UI.dlgClose();
  await new Promise(r => setTimeout(r, 400));
  if (U.chance(rate)) {
    e.refine = lvl + 1;
    recalc();
    addFx({ type: 'levelup', ref: p, dur: 1.5 });
    UI.msg(`ตีบวกสำเร็จ! ${itemDisplayName(e)}`, 'lvl');
    Sound.play('refine_ok');
    await UI.say(nm, `ฮ่าฮ่า! สำเร็จ! ตอนนี้กลายเป็น ${B(itemDisplayName(e))} แล้ว!`);
  } else {
    p.equip[slot] = null;
    recalc();
    UI.msg(`ตีบวกล้มเหลว... ${ITEMS[e.id].name} แตกสลาย`, 'err');
    Sound.play('refine_fail');
    await UI.say(nm, 'เพล้ง!!! ...ข้าขอโทษ อุปกรณ์ของเจ้าแตกสลายไปแล้ว...');
  }
  saveGame();
};
