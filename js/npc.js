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

NPC.scripts.kafra = async n => {
  const p = G.player;
  const nm = `[${n.name}]`;
  const c = await UI.menu(nm, 'ยินดีต้อนรับสู่ <b>Kafra Corporation</b> ค่ะ<br>บริการของ Kafra พร้อมอยู่เคียงข้างนักผจญภัยเสมอ มีอะไรให้ช่วยคะ?',
    ['บันทึกจุดเกิด (Save)', 'บริการเทเลพอร์ต', 'ยกเลิก']);
  if (c === 0) {
    p.save = { map: G.map.id, x: n.x + 0.5, y: n.y + 1.5 };
    saveGame();
    await UI.say(nm, `บันทึกจุดเกิดของคุณที่ ${B(G.map.def.name)} เรียบร้อยแล้วค่ะ<br>เมื่อใช้ Butterfly Wing หรือเสียชีวิต คุณจะกลับมาที่นี่ค่ะ`);
  } else if (c === 1) {
    const dests = [['prt_fild', 300], ['gef_fild', 600], ['pay_fild', 800], ['pay_dun', 1200]];
    const i = await UI.menu(nm, 'ต้องการเดินทางไปที่ไหนคะ?',
      [...dests.map(([id, z]) => `${MAP_DEFS[id].name} (Lv ${MAP_DEFS[id].level.split(' ')[0]}) — ${U.fmt(z)} z`), 'ยกเลิก']);
    if (i < dests.length) {
      const [id, z] = dests[i];
      if (p.zeny < z) { await UI.say(nm, 'ขออภัยค่ะ Zeny ของคุณไม่เพียงพอ'); return; }
      p.zeny -= z;
      UI.dlgClose();
      const map = getMap(id);
      changeMap(id, (map.w >> 1) + 0.5, (map.h >> 1) + 0.5);
      UI.msg(`Kafra เทเลพอร์ตคุณไปยัง ${MAP_DEFS[id].name} (-${U.fmt(z)} z)`, 'sys');
    }
  }
};

NPC.scripts.jobmaster = async n => {
  const p = G.player;
  const nm = `[${n.name}]`;
  if (p.job === 'novice') {
    await UI.say(nm, `ฮึ่ม... เจ้าคือ Novice ผู้ปรารถนาจะก้าวเดินบนเส้นทางแห่งอาชีพสินะ<br>ข้าคือผู้ชี้นำเส้นทางของนักผจญภัยทั้งปวง`);
    if (p.jobLv < 10 || skillLv('basic_skill') < 9) {
      await UI.say(nm, `แต่เจ้ายังไม่พร้อม!<br>• Job Level ต้องถึง ${B('10')} (ตอนนี้ ${p.jobLv})<br>• Basic Skill ต้องถึง ${B('Lv 9')} (ตอนนี้ ${skillLv('basic_skill')})<br><br>ไปล่ามอนสเตอร์ใน ${B('Prontera Field')} ทางตะวันออกของเมืองก่อนเถิด`);
      return;
    }
    for (;;) {
      const i = await UI.menu(nm, 'เจ้าพร้อมแล้ว! จงเลือกเส้นทางของเจ้า:', [...FIRST_JOBS.map(j => `${JOBS[j].name} (${JOBS[j].thai})`), 'ขอคิดดูก่อน']);
      if (i >= FIRST_JOBS.length) return;
      const j = FIRST_JOBS[i];
      const ok = await UI.menu(nm, `<b>${JOBS[j].name}</b> — ${JOBS[j].desc}<br><br>สกิล: ${JOBS[j].skills.map(s => SKILLS[s].name).join(', ')}<br><br>ยืนยันที่จะเป็น ${B(JOBS[j].name)} หรือไม่? (เปลี่ยนกลับไม่ได้)`, ['ยืนยัน!', 'ย้อนกลับ']);
      if (ok === 0) {
        changeJob(j);
        await UI.say(nm, `จากนี้ไปเจ้าคือ ${B(JOBS[j].name)}!<br>ข้ามอบอาวุธประจำอาชีพให้เจ้าแล้ว จงใช้ Skill Point เรียนรู้สกิลใหม่ (กด S)`);
        return;
      }
    }
  }
  const i = await UI.menu(nm, `อ้อ ${JOBS[p.job].name} ผู้กล้า... อาชีพขั้นที่สองยังไม่เปิดให้ในดินแดนนี้<br>แต่ข้าช่วยเจ้าได้เรื่องหนึ่ง:`,
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
NPC.scripts.weapon = n => shopNpc(n, 'weapon', 'อาวุธชั้นดีจากช่างตีเหล็กแห่ง Prontera! เลือกดูได้เลย');
NPC.scripts.armor = n => shopNpc(n, 'armor', 'เกราะ หมวก โล่ รองเท้า และเครื่องประดับ ป้องกันตัวให้ดีก่อนออกเดินทางนะ!');

NPC.scripts.nurse = async n => {
  const p = G.player;
  const nm = `[${n.name}]`;
  await UI.say(nm, 'ขอพรจากพระเจ้าจงสถิตอยู่กับคุณ...<br>ฉันจะรักษาและอวยพรให้คุณนะคะ ✚');
  p.hp = p.d.maxHp; p.sp = p.d.maxSp; p.poisonUntil = 0;
  p.buffs.blessing = { lv: 5, until: G.time + 240 };
  p.buffs.increase_agi = { lv: 5, until: G.time + 240 };
  recalc();
  addFx({ type: 'heal', ref: p, dur: 1.2 });
  addFx({ type: 'buff', ref: p, dur: 1.2 });
  Sound.play('heal');
  UI.msg('Healer ได้ฟื้นฟู HP/SP และมอบ Blessing Lv5, Increase AGI Lv5 ให้คุณ', 'sys');
};

NPC.scripts.guide = async n => {
  const nm = `[${n.name}]`;
  for (;;) {
    const i = await UI.menu(nm, 'ยินดีต้อนรับสู่ <b>Prontera</b> เมืองหลวงแห่งอาณาจักร Rune-Midgard!<br>มีอะไรให้ข้าช่วยแนะนำ?',
      ['วิธีควบคุม', 'แผนที่รอบเมือง', 'NPC ในเมือง', 'เคล็ดลับ', 'ขอบคุณ']);
    if (i === 0) await UI.say(nm, `• ${B('คลิกซ้าย')} ที่พื้นเพื่อเดิน / คลิกค้างเพื่อเดินตามเมาส์<br>• ${B('คลิกมอนสเตอร์')} เพื่อโจมตีอัตโนมัติ<br>• ${B('คลิกไอเทม')} บนพื้นเพื่อเก็บ<br>• ${B('1-9')} ใช้ปุ่มลัด • ${B('X')} นั่งพัก (ฟื้นฟูเร็วขึ้น)<br>• ${B('A')} สถานะ • ${B('E')} ไอเทม • ${B('Q')} อุปกรณ์ • ${B('S')} สกิล • ${B('Enter')} แชท<br>• ${B('ล้อเมาส์')} ซูมเข้า/ออก`);
    else if (i === 1) await UI.say(nm, `• ${B('ทางตะวันออก')} → Prontera Field (Lv 1-6) → Geffen Field (Lv 8-16, MVP Angeling)<br>• ${B('ทางใต้')} → Payon Forest (Lv 18-30) → Payon Cave (Lv 17-45, MVP Moonlight Flower)<br><br>วงแสงสีฟ้าคือ ${B('Warp Portal')} เดินเข้าไปเพื่อย้ายแผนที่`);
    else if (i === 2) await UI.say(nm, `• ${B('Kafra')} — บันทึกจุดเกิด / เทเลพอร์ต<br>• ${B('Job Master')} — เปลี่ยนอาชีพ<br>• ${B('Healer')} — ฟื้นฟูและบัฟฟรี<br>• ${B('Tool / Weapon / Armor Dealer')} — ซื้อขายของ<br>• ${B('Hollgrehenn')} — ตีบวกอาวุธและชุดเกราะ`);
    else if (i === 3) await UI.say(nm, `• อัปสเตตัสด้วย Status Point ทุกครั้งที่เลเวลอัป (กด A)<br>• มอนสเตอร์ที่มีชื่อสีแดงอ่อนจะ ${B('โจมตีก่อน')}!<br>• ${B('การ์ด')} ดรอปยาก ใส่ในอุปกรณ์ที่มีช่อง [ ] เพื่อเพิ่มพลัง<br>• ธาตุมีผล! ไฟแรงกับดิน น้ำแรงกับไฟ ศักดิ์สิทธิ์แรงกับอมตะ<br>• Auto Loot เปิดได้ที่เมนูตั้งค่า`);
    else return;
  }
};

NPC.scripts.refine = async n => {
  const p = G.player;
  const nm = `[${n.name}]`;
  const RATE = [1, 1, 1, 1, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];
  const slots = EQUIP_SLOTS.filter(s => p.equip[s]);
  if (!slots.length) { await UI.say(nm, 'ข้าคือช่างตีบวก Hollgrehenn!<br>สวมอุปกรณ์ที่ต้องการตีบวกก่อน แล้วค่อยมาหาข้า'); return; }
  const i = await UI.menu(nm, 'ข้าคือ Hollgrehenn ช่างตีบวกฝีมือดีที่สุดใน Prontera!<br>+1~+4 สำเร็จแน่นอน แต่หลังจากนั้น... <b style="color:#c03030">ถ้าล้มเหลว อุปกรณ์จะแตก!</b><br>จะตีบวกชิ้นไหน?',
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
