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
    ? L('ข้าจดจำเสียงราก... มันยืดลงไปทางใต้ ช้า ๆ ทางโพรงของเฮล ข้าไม่รู้ว่าดีหรือร้าย<br>ข้าคือผู้ควบคุม <b>ไบฟรอสต์</b> — บันทึกจุดกู้คืน และส่งเจ้าข้ามพื้นที่', 'I remember the voice of the roots... they are stretching south, slowly, toward Hel\'s Hollow. I do not know if that is good or ill.<br>I am the keeper of the <b>Bifrost</b> — I record your recovery point and send you across the lands.')
    : L('ข้าจดจำ... ทุกอย่าง จำนวนใบไม้ที่ส่งออกไป จำนวนครั้งที่เจ้ากลับมา<br>ข้าคือผู้ควบคุม <b>ไบฟรอสต์</b> เครือข่ายสายรุ้ง — บันทึกจุดกู้คืนของเจ้า และส่งเจ้าข้ามพื้นที่ได้', 'I remember... everything. How many leaves were sent out. How many times you came back.<br>I am the keeper of the <b>Bifrost</b>, the rainbow network — I record your recovery point and can send you across the lands.');
  const c = await UI.menu(nm, greet, [L('บันทึกจุดเกิด (Save)', 'Set Save Point (Save)'), L('ข้ามสะพานสายรุ้ง (เทเลพอร์ต)', 'Cross the Rainbow Bridge (Teleport)'), L('ยกเลิก', 'Cancel')]);
  if (c === 0) {
    p.save = { map: G.map.id, x: n.x + 0.5, y: n.y + 1.5 };
    Quest.onEvent('save');
    saveGame();
    if (!st.bifrostFirst) {
      st.bifrostFirst = 1;
      await UI.say(nm, L(`ข้าจดจำเจ้าไว้แล้ว ... แปลก ข้าไม่เคยจำเจ้ามาก่อน<br>เมื่อใช้ Return Beacon หรือล้มลง ใบไม้จะพาเจ้ากลับมาที่ ${B(G.map.def.name)}`, `I remember you now ... Strange. I have never remembered you before.<br>When you use a Return Beacon or fall, the leaves will carry you back to ${B(G.map.def.name)}.`));
    } else await UI.say(nm, L(`ข้าจดจำ ${B(G.map.def.name)} ไว้ให้เจ้าแล้ว<br>เมื่อใช้ Return Beacon หรือล้มลงในการต่อสู้ ใบไม้จะพาเจ้ากลับมาที่นี่`, `I remember ${B(G.map.def.name)} for you.<br>When you use a Return Beacon or fall in battle, the leaves will carry you back here.`));
  } else if (c === 1) {
    // [แผนที่, ค่าผ่านทาง, Base Lv ขั้นต่ำ] • บทที่ 6 (ใต้ Hel's Hollow) เปิดเมื่อเลเวลถึงช่วงของแผนที่
    const dests = [['meadow', 300], ['mistlake', 600], ['wolfwood', 800], ['helcave', 1200], ['archive', 1800, 33], ['roots', 2500, 45], ['arena', 0]].filter(([id]) => MAP_DEFS[id]);
    const i = await UI.menu(nm, L('ข้าจดจำปลายทางเหล่านี้ — จะให้สายรุ้งพาเจ้าไปที่ใด?', 'I remember these destinations — where shall the rainbow take you?'),
      [...dests.map(([id, z, lv]) => MAP_DEFS[id].pvp ? L(`${MAP_DEFS[id].name} — ลานประลอง PvP (ฟรี)`, `${MAP_DEFS[id].name} — PvP Arena (Free)`)
        : `${MAP_DEFS[id].name} (Lv ${MAP_DEFS[id].level.split(' ')[0]}) — ${U.fmt(z)} ${CUR}${lv && p.baseLv < lv ? L(` · 🔒 ต้อง Base Lv ${lv}`, ` · 🔒 Base Lv ${lv}+`) : ''}`), L('ยกเลิก', 'Cancel')]);
    if (i < dests.length) {
      const [id, z, lv] = dests[i];
      if (lv && p.baseLv < lv) { await UI.say(nm, L(`สายรุ้งยังไม่ยอมพาเจ้าลงไปที่ ${B(MAP_DEFS[id].name)}... ข้าจดจำได้ทุกหน่วยที่ลงไปก่อนจะพร้อม<br>กลับมาหาข้าเมื่อเจ้ามี ${B('Base Lv ' + lv)} นะ (ตอนนี้ ${p.baseLv}) — หรือเดินลงไปเองผ่าน Hel's Hollow ถ้ามั่นใจ`, `The rainbow will not yet carry you down to ${B(MAP_DEFS[id].name)}... I remember every unit that went down before it was ready.<br>Come back to me at ${B('Base Lv ' + lv)} (you are ${p.baseLv}) — or walk down through Hel's Hollow yourself, if you are sure.`)); return; }
      if (p.zeny < z) { await UI.say(nm, L(`ข้าจดจำได้ว่า ${CUR} ของเจ้าไม่พอค่าผ่านทาง`, `I remember that your ${CUR} will not cover the toll.`)); return; }
      p.zeny -= z;
      UI.dlgClose();
      const map = getMap(id), at = bifrostArrival(map);
      changeMap(id, at.x, at.y);
      UI.msg(L(`สะพานไบฟรอสต์พาคุณไปยัง ${MAP_DEFS[id].name} (-${U.fmt(z)} ${CUR})`, `The Bifrost carries you to ${MAP_DEFS[id].name} (-${U.fmt(z)} ${CUR})`), 'sys');
    }
  }
};

// จุดลงจากสะพานสายรุ้ง: MAP_DEFS[id].arrive.bifrost ถ้ากำหนดไว้ ไม่งั้นกลางแผนที่ • ถ้าเดินไม่ได้/ทับวาร์ป เลื่อนไปช่องว่างที่ใกล้ที่สุด
function bifrostArrival(map) {
  const a = map.def.arrive && map.def.arrive.bifrost, cx = a ? Math.floor(a[0]) : map.w >> 1, cy = a ? Math.floor(a[1]) : map.h >> 1;
  for (let r = 0; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = cx + dx, y = cy + dy;
    if (map.walkable(x, y) && !map.portals.some(q => U.dist(q.x, q.y, x, y) < 3)) return { x: x + 0.5, y: y + 0.5 };
  }
  return { x: cx + 0.5, y: cy + 0.5 };
}

NPC.scripts.jobmaster = async n => {
  const p = G.player, st = Story.st();
  const nm = `[${n.name}]`;
  if (p.job === 'novice') {
    await UI.say(nm, L(`ข้าคือ Mimir AI ปัญญาผู้เฝ้าคลังความรู้ — ร่างของข้าหายไปในคืนที่กิ่งหัก เหลือแต่หัวบนแท่นนี้<br>หน่วยใหม่ มาเพื่อ <b>รับแม่พิมพ์</b> สินะ ข้าเก็บแบบไว้ได้หกแบบ จากหกหน่วยที่ยืนรักษากำแพงจนรุ่งเช้า`, `I am Mimir AI, the mind that keeps the vault of knowledge. My body was lost on the night the branch broke — only this head upon its pedestal remains.<br>New unit... you have come to <b>receive a mold</b>, have you not? I preserved six designs, from the six units who held the walls until dawn.`));
    if (p.jobLv < JOB_CHANGE_LV) {
      await UI.say(nm, L(`แต่ข้อมูลการต่อสู้ของเจ้ายังไม่พอให้แม่พิมพ์ยึดร่าง<br>จงไปเก็บข้อมูลจนมี ${B('Job Level ' + JOB_CHANGE_LV)} ก่อน (ตอนนี้ ${p.jobLv})<br><br>ทุ่งหญ้ามรกต ${B('ทางตะวันออกของเมือง')} เหมาะกับการเริ่มต้น`, `But your combat data is not yet sufficient for a mold to take hold.<br>Gather data until you reach ${B('Job Level ' + JOB_CHANGE_LV)} (currently ${p.jobLv}).<br><br>Emerald Meadow, ${B('east of town')}, is a fitting place to begin.`));
      return;
    }
    for (;;) {
      const i = await UI.menu(nm, L('ข้อมูลครบแล้ว เลือกแม่พิมพ์ที่จะรับลงร่าง — เจ้าไม่ได้กลายเป็นพวกเขา แต่ <b>สานต่อท่า</b> ของพวกเขา:', 'Your data is complete. Choose the mold your frame will receive — you will not become them, but you will <b>carry on their techniques</b>:'), [...FIRST_JOBS.map(j => `${JOBS[j].name} (${JOBS[j].thai}) — ${JOBS[j].role}`), L('ขอคิดดูก่อน', 'Let me think it over')]);
      if (i >= FIRST_JOBS.length) return;
      const j = FIRST_JOBS[i], J = JOBS[j];
      UI.illust(Art.jobKey(j, p.gender));
      const ok = await UI.menu(nm, L(`<b>${J.name}</b> — ${J.thai}<br>${J.desc}<br><br>“${Story.JOB_LINES[j] || ''}”<br><br>สเตตัสแนะนำ: ${B(J.stats)}<br>สกิล: ${J.skills.map(s => SKILLS[s].name).join(', ')}<br><br>ยืนยันรับแม่พิมพ์ ${B(J.name)} ลงร่างหรือไม่? (ย้อนกลับไม่ได้)`, `<b>${J.name}</b> — ${J.thai}<br>${J.desc}<br><br>“${Story.JOB_LINES[j] || ''}”<br><br>Recommended stats: ${B(J.stats)}<br>Skills: ${J.skills.map(s => SKILLS[s].name).join(', ')}<br><br>Accept the ${B(J.name)} mold into your frame? (This cannot be undone.)`), [L('รับแม่พิมพ์!', 'Accept the mold!'), L('ย้อนกลับ', 'Go back')]);
      UI.illust(`npc_${n.id}`);
      if (ok === 0) {
        changeJob(j);
        UI.illust(Art.jobKey(j, p.gender));
        await UI.say(nm, L(`แม่พิมพ์ยึดร่างแล้ว — ร่างใหม่ของเจ้าคือ ${B(J.name)}!<br>ติดตั้งอาวุธประจำ Class ให้แล้ว เก็บ Job Level เพื่อรับ Skill Point แล้วติดตั้งสกิลใหม่ (กด S)`, `The mold has taken hold — your new frame is ${B(J.name)}!<br>Your class weapon has been equipped. Earn Job Levels for Skill Points, then learn new skills (press S).`));
        UI.illust(`npc_${n.id}`);
        await UI.say(nm, L('(Mimir พูดกับตัวเองเบา ๆ)<br>...ร่างรับแม่พิมพ์ได้สมบูรณ์ ไม่มีร่องรอยประกายเก่าต้าน แสดงว่า... ไม่ ยังไม่ถึงเวลา', '(Mimir murmurs to himself)<br>...The frame accepted the mold completely. No trace of an old spark resisting. Which means... no. Not yet.'));
        return;
      }
    }
  }
  // Class ขั้นที่ 2 (แยก 2 สาย): Base Lv 30 + Job ของ Class แรกเต็ม (SECOND_JOB_REQ)
  const nj = SECOND_JOBS[p.job];
  if (nj && p.baseLv >= SECOND_JOB_REQ.base && p.jobLv >= SECOND_JOB_REQ.job) {
    for (;;) {
      const pick = await UI.menu(nm, L(`ข้อมูลการต่อสู้ของเจ้าแน่นพอแล้ว ${B(p.name)}... แม่พิมพ์ ${B(JOBS[p.job].name)} มี ${B('ชั้นที่สองซ่อนอยู่สองทาง')} ข้าเพิ่งถอดรหัสได้<br>เลือกได้ทางเดียว — สกิลและอาวุธของ ${JOBS[p.job].name} ยังอยู่ครบทั้งสองทาง:`, `Your combat data runs deep now, ${B(p.name)}... The ${B(JOBS[p.job].name)} mold holds ${B('two hidden second tiers')}, which I have only just decoded.<br>You may choose only one — the skills and weapons of ${JOBS[p.job].name} remain intact on either path:`),
        [...nj.map(j => `${JOBS[j].name} (${JOBS[j].thai}) — ${JOBS[j].role}`), L('ไว้ก่อน', 'Not yet')]);
      if (pick >= nj.length) return;
      const j2 = nj[pick], J = JOBS[j2];
      UI.illust(Art.jobKey(j2, p.gender));
      const ok = await UI.menu(nm, L(`<b>${J.name}</b> — ${J.thai}<br>${J.desc}<br><br>“${Story.JOB_LINES[j2] || ''}”<br><br>สเตตัสแนะนำ: ${B(J.stats)}<br>สกิลใหม่: ${J.skills.map(id => SKILLS[id].name).join(', ')}<br>แต้มสกิลที่เหลือยกมาด้วย<br><br>ปลุกแม่พิมพ์ชั้นที่สองทางนี้หรือไม่? (ย้อนกลับไม่ได้)`, `<b>${J.name}</b> — ${J.thai}<br>${J.desc}<br><br>“${Story.JOB_LINES[j2] || ''}”<br><br>Recommended stats: ${B(J.stats)}<br>New skills: ${J.skills.map(id => SKILLS[id].name).join(', ')}<br>Unspent skill points carry over.<br><br>Awaken the second tier along this path? (This cannot be undone.)`), [L('ปลุกแม่พิมพ์!', 'Awaken the mold!'), L('ดูอีกทาง', 'See the other path')]);
      UI.illust(`npc_${n.id}`);
      if (ok === 0) {
        changeJob(j2);
        UI.illust(Art.jobKey(j2, p.gender));
        await UI.say(nm, L(`ชั้นที่สองตื่นแล้ว — ตอนนี้เจ้าคือ ${B(J.name)}<br>Job Level เริ่มใหม่ที่ 1 เก็บต่อถึง ${J.jobMax} เพื่อรับแต้มสกิลใหม่ (กด S)`, `The second tier has awakened — you are now ${B(J.name)}.<br>Job Level restarts at 1. Raise it to ${J.jobMax} to earn new skill points (press S).`));
        UI.illust(`npc_${n.id}`);
        return;
      }
    }
  }
  if (qDone('mvp1') && !st.mimirTruth) { // หลังปราบ Seraph Core: Mimir ยอมบอกความจริงข้อแรก (ครั้งเดียว)
    st.mimirTruth = 1;
    await UI.say(nm, L(`เจ้าได้ยินข้อความของทูตแล้วสินะ... ถ้าอย่างนั้นข้าจะไม่ปิดเงียบอีก<br>เจ้าไม่มีบันทึกประกาย เจ้าไม่ใช่คนเก่าที่ถูกปลุก — ${B('เจ้าคือใบใหม่')} ที่ต้นไม้งอกได้เป็นครั้งแรกหลังคืนนั้น`, `So you have heard the envoy's message... Then I will keep silent no longer.<br>You have no spark record. You are no old one reawakened — ${B('you are a new leaf')}, the first the tree has grown since that night.`));
    await UI.say(nm, L('ข้าคือผู้เปิดใช้งานเจ้า และรู้ตั้งแต่แรก ข้าเงียบเพราะกลัว Hel กับคนที่ตัดกิ่งจะมาหาเจ้าก่อนเจ้าจะแข็งแรงพอ<br>ตอนนี้ทั้งคู่รู้แล้วว่าเจ้ามีอยู่ — ระวังพ่อค้าที่ใจดีเกินไปด้วย', 'I am the one who activated you, and I knew from the very start. I kept silent for fear that Hel, and the one who cut the branch, would find you before you were strong enough.<br>Now both of them know you exist — and beware any merchant who seems too kind.'));
    saveGame();
  }
  const greet = qDone('hollow5') ? L(`${p.name}... เจ้าได้ยินสิ่งที่อยู่ใต้โพรงแล้ว ข้าบันทึกไว้แล้วว่าเจ้าคือใบแรก — และเจ้ายังไปต่อ<br>แม่พิมพ์ขั้นต่อไปยังไม่ถูกบันทึก แต่ปัญญาของข้าช่วยเจ้าได้เรื่องหนึ่ง:`, `${p.name}... you have heard what lies beneath the Hollow. I have recorded that you are the First Leaf — and that you go on.<br>The next mold has yet to be recorded, but my wisdom can aid you in one matter:`)
    : nj ? L(`${JOBS[p.job].name} ผู้สานต่อ... แม่พิมพ์ชั้นที่สอง (${B(nj.map(j => JOBS[j].name).join(' หรือ '))}) จะตื่นเมื่อเจ้ามี ${B('Base Lv ' + SECOND_JOB_REQ.base)} และ ${B('Job Lv ' + SECOND_JOB_REQ.job)} (ตอนนี้ ${p.baseLv} / ${p.jobLv})<br>ระหว่างนี้ ปัญญาของข้าช่วยเจ้าได้เรื่องหนึ่ง:`, `${JOBS[p.job].name}, inheritor... the second tier of your mold (${B(nj.map(j => JOBS[j].name).join(' or '))}) will awaken once you reach ${B('Base Lv ' + SECOND_JOB_REQ.base)} and ${B('Job Lv ' + SECOND_JOB_REQ.job)} (currently ${p.baseLv} / ${p.jobLv}).<br>Until then, my wisdom can aid you in one matter:`)
    : L(`${JOBS[p.job].name}... แม่พิมพ์ของเจ้าตื่นครบทั้งสองชั้นแล้ว ข้าบันทึกท่าของเจ้าไว้ทุกครั้งที่เจ้าสู้<br>ปัญญาของข้าช่วยเจ้าได้เรื่องหนึ่ง:`, `${JOBS[p.job].name}... both tiers of your mold have awakened. I record your techniques every time you fight.<br>My wisdom can aid you in one matter:`);
  const i = await UI.menu(nm, greet, [L(`รีเซ็ตสกิล (5,000 ${CUR})`, `Reset Skills (5,000 ${CUR})`), L(`รีเซ็ตสเตตัส (10,000 ${CUR})`, `Reset Stats (10,000 ${CUR})`), L('ไม่เป็นไร', 'No, thank you')]);
  if (i === 0 || i === 1) {
    const cost = i === 0 ? 5000 : 10000;
    if (p.zeny < cost) { await UI.say(nm, L(`${CUR} ของเจ้าไม่พอ`, `You do not have enough ${CUR}.`)); return; }
    const c2 = await UI.menu(nm, L(`แน่ใจหรือ? จะเสีย ${U.fmt(cost)} ${CUR}`, `Are you certain? It will cost ${U.fmt(cost)} ${CUR}.`), [L('แน่ใจ', 'I\'m sure'), L('ยกเลิก', 'Cancel')]);
    if (c2 !== 0) return;
    p.zeny -= cost;
    const pts = i === 0 ? resetSkills() : resetStats();
    UI.dirty();
    await UI.say(nm, L(`เสร็จสิ้น! ข้าคืน ${B(pts)} ${i === 0 ? 'Skill' : 'Status'} Point ให้เจ้าแล้ว — แม่พิมพ์ไม่ว่าอะไรหรอก มันปรับตัวเก่ง`, `It is done. I have returned ${B(pts)} ${i === 0 ? 'Skill' : 'Status'} Points to you — the mold does not mind. It adapts well.`));
  }
};

async function shopNpc(n, key, greet) {
  const nm = `[${n.name}]`;
  const i = await UI.menu(nm, greet, [L('ซื้อ', 'Buy'), L('ขาย', 'Sell'), L('ยกเลิก', 'Cancel')]);
  if (i > 1) return;
  UI.dlgClose();
  UI.openShop(n.name, SHOPS[key]);
  UI.shop.mode = i === 0 ? 'buy' : 'sell';
  UI.renderShop();
}
// ชาวเมืองธรรมดา: Tool Dealer ขี้บ่นเรื่องน้ำมัน • Weapon Dealer พูดเหมือนนักกีฬา • Armor Dealer ขี้กังวล
NPC.scripts.tool = n => shopNpc(n, 'tool', L('ยา Blink Chip อาหาร มีครบทุกอย่างที่นักผจญภัยต้องการ — ราคาน้ำมันขึ้นอีกแล้วนะ อย่าถามว่าทำไมของแพง<br>จะรับอะไรดี?', 'Potions, Blink Chips, food — everything an adventurer needs. Oil prices went up AGAIN, so don\'t ask me why everything\'s so pricey.<br>What\'ll it be?'));
NPC.scripts.weapon = n => shopNpc(n, 'weapon', L('โย่! อาวุธจากโรงงานนีโอเอลด์ไฮม์ — ตัวนี้แรงนะ ตัวนั้นก็แรง!<br>ฟิตร่างให้พร้อมก่อนออกไปล่า เลือกดูได้เลย', 'Yo! Weapons straight from the Neo Eldheim works — this one hits hard! That one hits hard too!<br>Get your frame in shape before the hunt. Have a look!'));
NPC.scripts.armor = n => shopNpc(n, 'armor', L('ใส่เกราะหรือยัง? หมวกล่ะ? รองเท้า?... ข้าเป็นห่วง อย่าออกไปตัวเปล่านะ<br>เกราะ หมวก โล่ รองเท้า เครื่องประดับ — ป้องกันตัวให้ดีก่อนออกเดินทาง', 'Are you wearing armor? A helm? Boots?... I worry, you know. Please don\'t go out there unprotected.<br>Armor, helms, shields, boots, accessories — protect yourself before you set off.'));

NPC.scripts.storage = async n => {
  const p = G.player, nm = `[${n.name}]`, fee = p.job === 'novice' ? 0 : 40;
  const line = qDone('lv30') ? L('ช่องที่ 47 เป็นของคู่หู Rolf — เขาไม่เคยมาเปิด และข้าไม่เคยทิ้ง', 'Slot 47 belongs to Rolf\'s old partner — he never came to open it, and I never threw it out.')
    : L('ช่องที่ 47 ยังว่าง เจ้าของมันไม่กลับมา 30 ปีแล้ว ข้าไม่ให้ใครเช่า — ระเบียบคือระเบียบ', 'Slot 47 is still empty. Its owner hasn\'t come back in 30 years. I won\'t rent it to anyone — rules are rules.');
  const i = await UI.menu(nm, L(`หน่วยคลังเก็บของ Kaia ${line}<br>ฝากของไว้ที่นี่ได้ ${B(STORAGE_MAX + ' ช่อง')} (ตอนนี้ใช้ ${p.storage.length}) ค่าบริการ ${fee ? B(fee + ' ' + CUR) : B('ฟรีสำหรับ Novice')}`, `Storage Unit Kaia. ${line}<br>You can store up to ${B(STORAGE_MAX + ' slots')} here (in use: ${p.storage.length}). Fee: ${fee ? B(fee + ' ' + CUR) : B('free for Novices')}`),
    [L('เปิดคลังเก็บของ', 'Open Storage'), L('ยกเลิก', 'Cancel')]);
  if (i !== 0) return;
  if (p.zeny < fee) { await UI.say(nm, L(`ขออภัย ${CUR} ไม่พอค่าบริการค่ะ — ระเบียบคือระเบียบ`, `Apologies — you don't have enough ${CUR} for the fee. Rules are rules.`)); return; }
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
    text = L('กำลังสแกนร่าง... แปลกจังค่ะ ไม่มีรอยซ่อมเก่าเลยสักจุด<br>ร่างเจ้าใหม่เหมือนเพิ่งออกจากต้นไม้เมื่อเช้า — เอ่อ ไม่มีอะไรนะคะ ติดตั้งบัฟให้แล้ว ✚', 'Scanning your frame... how odd. Not a single old repair mark anywhere.<br>Your frame is as new as if it left the tree this morning — oh, um, it\'s nothing! Your buffs are installed ✚');
  } else if (qDone('lv30') && !st.eirMask) { // จบบทที่ 4: ฝากเศษหน้ากากไปให้ Hel
    st.eirMask = 1;
    await UI.say(nm, L('มาคนเดียวนะคะ... (เธอยื่นเศษหน้ากากครึ่งหนึ่งให้ — ขอบของมันเรืองแสงจาง ๆ)<br>ถ้าเจอคนที่หน้ากากตรงกับชิ้นนี้ บอกเธอว่า <b>ผิวดินยังไม่ล่ม</b> และ Eir ยังซ่อมคนอยู่ทุกวันค่ะ', 'You came alone... (She hands you half of a broken mask — its edge glows faintly.)<br>If you meet someone whose mask matches this piece, please tell her <b>the surface hasn\'t fallen</b>, and that Eir is still repairing people every day.'));
    text = L('เธอกับข้ามาจากสายการผลิตเดียวกันค่ะ สายผู้ดูแล... (วิเซอร์หรี่ลง)<br>พบรอยร้าวเล็กน้อย — ซ่อมและติดตั้งบัฟให้นะคะ ✚ กลับมาให้ข้าเห็นด้วยนะคะ', 'She and I came off the same production line — the caretaker line... (Her visor dims.)<br>Minor cracks found — repairing and installing buffs ✚ Please come back so I can see you again, okay?');
  } else if (qDone('hollow5') && !st.eirAfter) {
    st.eirAfter = 1;
    text = L('เจ้าส่งข้อความให้เธอแล้วใช่ไหมคะ... (วิเซอร์ของเธอสว่างวาบ แล้วหรี่ลงช้า ๆ) ขอบคุณค่ะ<br>พบรอยร้าวเล็กน้อย — ซ่อมและติดตั้งบัฟให้นะคะ ✚', 'You delivered my message to her, didn\'t you... (Her visor flares bright, then slowly dims.) Thank you.<br>Minor cracks found — repairing and installing buffs ✚');
  } else if (qDone('jelly') && !st.eirJelly) {
    st.eirJelly = 1;
    text = L('ตัวอย่างเจลที่เจ้าเก็บมา น้ำเลี้ยงยังสะอาดค่ะ สะอาดจริง ๆ (วิเซอร์สว่างวาบ)<br>พบรอยร้าวเล็กน้อย — ซ่อมและติดตั้งบัฟให้นะคะ ✚', 'The gel samples you brought — the sap is still clean. Truly clean! (Her visor flares bright.)<br>Minor cracks found — repairing and installing buffs ✚');
  } else if (p.hp < p.d.maxHp * 0.3) {
    text = L('รอยร้าวเล็กน้อย... ค่ะ เล็กน้อย (เธอพูดเบาลง)<br>นั่งนิ่ง ๆ นะคะ ซ่อมและติดตั้งบัฟให้แล้ว ✚', 'Just minor cracks... yes. Minor. (Her voice grows softer.)<br>Please hold still. Repairs and buffs are done ✚');
  } else text = L('กำลังสแกนความเสียหาย... พบรอยร้าวเล็กน้อยค่ะ<br>เริ่มซ่อมและติดตั้งบัฟให้นะคะ ✚', 'Scanning for damage... minor cracks found.<br>Beginning repairs and installing buffs ✚');
  await UI.say(nm, text);
  p.hp = p.d.maxHp; p.sp = p.d.maxSp; p.poisonUntil = 0;
  p.buffs.blessing_of_odin = { lv: 2, until: G.time + 240 };
  recalc();
  addFx({ type: 'heal', ref: p, dur: 1.2 });
  addFx({ type: 'buff', ref: p, dur: 1.2 });
  Sound.play('heal');
  UI.msg(L('Eir Repair Unit ซ่อมแซม HP/SP และติดตั้ง Blessing of Odin Lv2 ให้คุณ', 'Eir Repair Unit restored your HP/SP and installed Blessing of Odin Lv2'), 'sys');
};

NPC.scripts.guide = async n => {
  const p = G.player, nm = `[${n.name}]`;
  // Rolf เรียก "หน่วยใหม่" จนถึงบทท้าย ๆ จึงเรียกชื่อ • หมวกเขาเป็นของคู่หูที่ล้มนอกรัศมีรากในคืนที่กิ่งหัก
  const greet = !qDone('repair') ? L('หน่วยใหม่สินะ วิเซอร์ยังสว่างจ้าเชียว — เดี๋ยวมันจะหรี่ลงเองเมื่อเจ้าเห็นโลกข้างนอก<br>ไปหา Eir ก่อน แล้วค่อยมาหาข้า มีอะไรให้ข้าช่วย?', 'A rookie, eh? Visor\'s still blazing bright — it\'ll dim on its own once you\'ve seen the world out there.<br>Go see Eir first, then come back to me. What do you need?')
    : !qDone('job10') ? L('ยินดีต้อนรับสู่ <b>นีโอเอลด์ไฮม์</b> ฐานที่มั่นสุดท้ายของพวกเรา หน่วยใหม่<br>งานใกล้เมืองมีเยอะ ไม่ต้องรีบลงใต้ — มีอะไรให้ข้าช่วย?', 'Welcome to <b>Neo Eldheim</b>, our last stronghold, rookie.<br>Plenty of work near town — no need to rush south. What do you need?')
    : !qDone('mvp1') ? L('เจ้าเริ่มแกร่งแล้วนะ หน่วยใหม่ — แต่บอร์ดค่าหัวยังมีงานใกล้เมืองอีกเยอะ ไม่ต้องรีบ<br>มีอะไรให้ข้าช่วย?', 'You\'re getting tougher, rookie — but the bounty board\'s still got plenty of work near town. No rush.<br>What do you need?')
    : !qDone('lv30') ? L(`${p.name}... ข้าเรียกชื่อเจ้าได้แล้วสินะ หมวกเขานี่ไม่ใช่ของข้า — เป็นของคู่หูที่ล้มนอกรัศมีรากในคืนนั้น<br>ข้าให้งานใกล้เมืองเพราะไม่อยากให้ใครเดินลงโพรงอีก... มีอะไรให้ข้าช่วย?`, `${p.name}... Guess I can call you by name now. This horned helm isn't mine — it belonged to my partner, who fell beyond the roots' reach that night.<br>I hand out work near town because I don't want anyone else walking down into the Hollow... What do you need?`)
    : L(`${p.name} — ข้าไม่ห้ามเจ้าอีกแล้ว (เขาแตะหมวกเขาเบา ๆ) แค่กลับมา<br>มีอะไรให้ข้าช่วย?`, `${p.name} — I won't stop you anymore. (He gently touches his horned helm.) Just come back.<br>What do you need?`);
  for (;;) {
    let i = await UI.menu(nm, greet,
      [L('งานล่าค่าหัวประจำวัน', 'Daily Bounties') + (Bounty.ready().length ? L(` (ส่งได้ ${Bounty.ready().length})`, ` (${Bounty.ready().length} ready)`) : ''), L('วิธีควบคุม', 'Controls'), L('แผนที่รอบเมือง', 'Maps Around Town'), L('ผู้คนในเมือง', 'People in Town'), L('Class อัปเกรดทั้ง 6', 'The 6 Upgrade Classes'), L('เคล็ดลับ', 'Tips'), L('ขอบคุณ', 'Thanks')]);
    if (i === 0) { await NPC.bountyBoard(nm); continue; }
    i--;
    if (i === 0) await UI.say(nm, L(`• ${B('คลิกซ้าย')} ที่พื้นเพื่อเดิน / คลิกค้างเพื่อเดินตามเมาส์<br>• ${B('คลิกมอนสเตอร์')} เพื่อโจมตีอัตโนมัติ<br>• ${B('คลิกไอเทม')} บนพื้นเพื่อเก็บ<br>• ${B('1-9')} ใช้ปุ่มลัด • ${B('X')} นั่งพัก (ฟื้นฟูเร็วขึ้น)<br>• ${B('A')} สถานะ • ${B('E')} ไอเทม • ${B('Q')} อุปกรณ์ • ${B('S')} สกิล • ${B('Enter')} แชท<br>• ${B('ล้อเมาส์')} ซูมเข้า/ออก`, `• ${B('Left-click')} the ground to walk / hold to follow the mouse<br>• ${B('Click a monster')} to auto-attack<br>• ${B('Click an item')} on the ground to pick it up<br>• ${B('1-9')} hotkeys • ${B('X')} sit and rest (faster recovery)<br>• ${B('A')} status • ${B('E')} items • ${B('Q')} equipment • ${B('S')} skills • ${B('Enter')} chat<br>• ${B('Mouse wheel')} zoom in/out`));
    else if (i === 1) await UI.say(nm, L(`• ${B('ทางตะวันออก')} → Emerald Meadow (Lv 1-6) สวนหน้าบ้านของต้นไม้ → Mistlake Plains (Lv 8-16, MVP Seraph Core ทูตในหมอก)<br>• ${B('ทางใต้')} → Wolfwood Forest (Lv 18-30) ป่าที่เพิ่งถูกเผา → Hel's Hollow (Lv 17-45, MVP Kitsura EX) ที่ที่ใบไม้มาช้า<br><br>วงแสงสีฟ้าคือ ${B('ประตูมิติ')} เดินเข้าไปเพื่อย้ายแผนที่ — ยิ่งไกลเมือง รากยิ่งบาง`, `• ${B('East')} → Emerald Meadow (Lv 1-6), the tree's front garden → Mistlake Plains (Lv 8-16, MVP Seraph Core, the envoy in the mist)<br>• ${B('South')} → Wolfwood Forest (Lv 18-30), freshly burned → Hel's Hollow (Lv 17-45, MVP Kitsura EX), where the leaves come late<br><br>Rings of blue light are ${B('portals')} — walk into one to change maps. The farther from town, the thinner the roots.`));
    else if (i === 2) await UI.say(nm, L(`• ${B('Bifrost Keeper')} — บันทึกจุดเกิด / เทเลพอร์ต (พูดน้อย แต่จำทุกอย่าง)<br>• ${B('Mimir AI')} — รับแม่พิมพ์ Class (Job Lv ${JOB_CHANGE_LV}) เหลือแต่หัว แต่ปัญญายังครบ<br>• ${B('Eir Repair Unit')} — ซ่อมและบัฟฟรี ชอบบอกว่า "รอยร้าวเล็กน้อย"<br>• ${B('Tool / Weapon / Armor Dealer')} — ซื้อขายของ<br>• ${B('Brokk Forge-Bot')} — ตีบวกอาวุธและเกราะ เสียงดังแต่ฝีมือจริง<br>• ${B('Storage Unit Kaia')} — ฝากของ (อย่าถามเรื่องช่องที่ 47)`, `• ${B('Bifrost Keeper')} — save point / teleport (says little, remembers everything)<br>• ${B('Mimir AI')} — class molds (Job Lv ${JOB_CHANGE_LV}); only a head left, but the mind's all there<br>• ${B('Eir Repair Unit')} — free repairs and buffs; always says "just minor cracks"<br>• ${B('Tool / Weapon / Armor Dealer')} — buy and sell goods<br>• ${B('Brokk Forge-Bot')} — refines weapons and armor; loud, but the real deal<br>• ${B('Storage Unit Kaia')} — item storage (don't ask about slot 47)`));
    else if (i === 3) await UI.say(nm, L(`แม่พิมพ์ทั้งหกคือท่าของหกหน่วยที่ยืนรักษากำแพงในคืนที่กิ่งหัก:<br>`, `The six molds are the techniques of the six units who held the walls on the night the branch broke:<br>`) + FIRST_JOBS.map(j => `• ${B(JOBS[j].name)} (${JOBS[j].thai}) — ${JOBS[j].role} [${JOBS[j].stats}]`).join('<br>'));
    else if (i === 4) await UI.say(nm, L(`• อัปสเตตัสด้วย Status Point ทุกครั้งที่เลเวลอัป (กด A)<br>• มอนสเตอร์บางชนิดจะ ${B('โจมตีก่อน')}! มันคิดว่าเจ้าคือสิ่งผิดปกติในสวน<br>• ${B('ชิป')} ดรอปยาก ใส่ในอุปกรณ์ที่มีช่อง [ ] เพื่อเพิ่มพลัง<br>• ธาตุมีผล! ไฟแรงกับดิน น้ำแรงกับไฟ ศักดิ์สิทธิ์แรงกับอมตะ — แสงคือการ "ปลด"<br>• สกิลแต่ละอันอัปได้สูงสุด Lv 5`, `• Spend Status Points every time you level up (press A)<br>• Some monsters ${B('attack first')}! They think you're something wrong in the garden<br>• ${B('Chips')} are rare drops — socket them into gear with [ ] slots for more power<br>• Elements matter! Fire beats Earth, Water beats Fire, Holy beats Undead — light is a "release"<br>• Each skill can be raised to Lv 5 at most`));
    else return;
  }
};

// บอร์ดงานล่าค่าหัว: ส่งงานที่เสร็จ / นำทางไปงานที่ยังไม่เสร็จ
NPC.bountyBoard = async nm => {
  if (!Bounty.open()) { await UI.say(nm, L(`งานล่าค่าหัวสำหรับหน่วยที่ผ่านการฝึกแล้วเท่านั้น<br>กลับมาเมื่อถึง ${B('Base Lv ' + BOUNTY_MIN_LV)} นะ หน่วยใหม่`, `Bounties are for trained units only.<br>Come back once you hit ${B('Base Lv ' + BOUNTY_MIN_LV)}, rookie.`)); return; }
  for (;;) {
    const s = Bounty.state(), ready = Bounty.ready(), todo = s.list.filter(b => b.got < b.n);
    const rows = s.list.map(b => `${b.claimed ? '✅' : b.got >= b.n ? '🎁' : '•'} ${Bounty.line(b)} — ${U.fmt(b.zeny)} ${CUR}`).join('<br>');
    const opts = [...ready.map(b => L(`รับรางวัล: ${MOBS[b.mob].name}`, `Claim reward: ${MOBS[b.mob].name}`)), ...(todo.length ? [L(`🧭 นำทางไปล่า ${MOBS[todo[0].mob].name}`, `🧭 Guide me to hunt ${MOBS[todo[0].mob].name}`)] : []), L('กลับ', 'Back')];
    const c = await UI.menu(nm, L(`งานล่าค่าหัววันนี้ (รีเซ็ตทุกวัน) — งานใกล้เมือง ข้าจัดให้เอง<br>${rows}<br><br>ทำครบ 3 งานรับโบนัสพิเศษ${s.bonus ? ' — รับไปแล้ววันนี้ ✓' : ''}`, `Today's bounties (reset daily) — work near town, picked by yours truly.<br>${rows}<br><br>Finish all 3 for a special bonus${s.bonus ? ' — claimed today ✓' : ''}`), opts);
    if (c < ready.length) { const m = Bounty.claim(ready[c]); if (m) await UI.say(nm, L(`เยี่ยมมาก! ${m}`, `Great work! ${m}`)); continue; }
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
    await UI.say(nm, L('หมาป่าในป่าดมเจ้าแล้วเดินหนีงั้นรึ... (เสียงดังของเขาเบาลง)<br>Gleipnir โซ่ที่ล่าม Fenrir — ข้าเป็นคนตีมัน และเป็นคนปลดมันในคืนนั้น ตามคำสั่ง Odin', 'The wolves in that forest sniffed you and walked away, eh... (His booming voice drops low.)<br>Gleipnir, the chain that bound Fenrir — I forged it. And I\'m the one who unchained it that night, on Odin\'s orders.'));
    await UI.say(nm, L('หมาป่าทุกตัวในป่านั่นคือของที่ข้าทำหลุดมือ เจ้าหนู<br>เอาเขี้ยวมันมาให้ข้าสักวัน ข้าจะตีเป็นอาวุธให้ — ด้วยมือสั่น ๆ นี่แหละ ฮ่าฮ่า...', 'Every wolf in that forest is something that slipped through my hands, kiddo.<br>Bring me one of their fangs someday. I\'ll forge you a weapon — with these shaky old hands. Ha-ha...'));
  }
  const slots = EQUIP_SLOTS.filter(s => p.equip[s]);
  if (!slots.length) { await UI.say(nm, L('ฮ่าฮ่า! ข้าคือ Brokk Forge-Bot ช่างตีเหล็กรุ่นโบราณ เจ้าหนู!<br>สวมอุปกรณ์ที่อยากตีบวกก่อน แล้วค่อยมาหาข้า', 'Ha-ha! I\'m Brokk Forge-Bot, smith of the ancient line, kiddo!<br>Put on the gear you want refined first, then come see me!')); return; }
  const intro = Quest.is('refine1') ? L('ทูตตัวนั้นโล่หนา ของธรรมดาเจาะไม่เข้า เจ้าหนู — ให้ข้าตีให้!<br>', 'That envoy\'s got a thick shield — ordinary gear won\'t pierce it, kiddo. Let me hammer yours!<br>')
    : L('ฮ่าฮ่า! ข้าคือ Brokk Forge-Bot ช่างตีเหล็กรุ่นโบราณ!<br>', 'Ha-ha! I\'m Brokk Forge-Bot, smith of the ancient line!<br>');
  // แร่ตีบวก (js/loot.js): ตั้งแต่ +5 ทุกครั้งที่ตีใช้แร่ 1 ชิ้น — อาวุธใช้ Rune Alloy ชุดเกราะใช้ Volt Ore
  const oreOn = typeof LOOT !== 'undefined';
  const oreNote = oreOn ? L(`<br>ตั้งแต่ +5 ขึ้นไป ทุกครั้งที่ตีต้องใช้แร่ 1 ชิ้น: ${B(ITEMS[LOOT.ORE.weapon].name)} (อาวุธ) / ${B(ITEMS[LOOT.ORE.armor].name)} (ชุดเกราะ) — ได้จากมอนสเตอร์เลเวลกลางขึ้นไป`, `<br>From +5 upward, every strike also needs 1 ore: ${B(ITEMS[LOOT.ORE.weapon].name)} for weapons, ${B(ITEMS[LOOT.ORE.armor].name)} for armor — mid-level monsters and up drop them.`) : '';
  const i = await UI.menu(nm, L(`${intro}+1~+4 สำเร็จแน่นอน หลังจากนั้นอาจพลาดได้ — แต่ไม่ต้องกลัว <b>ของไม่มีวันแตก</b> แค่เสียค่าบริการ${oreNote}<br>จะตีบวกชิ้นไหน เจ้าหนู?`, `${intro}+1 to +4 always succeeds. After that it might miss — but fear not, <b>your gear never breaks</b>. You only lose the fee!${oreNote}<br>Which piece are we hammering, kiddo?`),
    [...slots.map(s => `${SLOT_THAI[s]}: ${itemDisplayName(p.equip[s])}`), L('ยกเลิก', 'Cancel')]);
  if (i >= slots.length) return;
  const slot = slots[i], e = p.equip[slot];
  if ((e.refine || 0) >= 10) { await UI.say(nm, L('ชิ้นนี้ถูกตีบวกถึง +10 แล้ว ไม่มีอะไรให้ข้าทำอีก — ฝีมือข้าเองนี่นา ฮ่าฮ่า!', 'This piece is already at +10. Nothing left for me to do — my own handiwork, after all! Ha-ha!')); return; }
  const lvl = e.refine || 0;
  const costAt = l => (slot === 'weapon' ? 250 : 400) * (l + 1);
  const rate = RATE[lvl];
  const ore = oreOn ? LOOT.oreFor(slot) : null, oreName = ore ? ITEMS[ore].name : '';
  const needOre = l => !!ore && l >= LOOT.ORE_FROM; // ตีจาก +l ไป +(l+1) ต้องใช้แร่ไหม
  const oreLine = needOre(lvl) ? L(` • ใช้ ${B(oreName + ' 1 ชิ้น')} (มี ${B(countItem(ore))})`, ` • uses ${B('1 ' + oreName)} (you have ${B(countItem(ore))})`)
    : ore ? L(` • ตั้งแต่ +5 ต้องใช้ ${oreName}`, ` • from +5: needs ${oreName}`) : '';
  const c = await UI.menu(nm, L(`ตีบวก ${B(itemDisplayName(e))} (ตอนนี้ +${lvl})<br>ครั้งถัดไป +${lvl + 1}: ค่าบริการ ${B(U.fmt(costAt(lvl)) + ' ' + CUR)}${oreLine} • โอกาสสำเร็จ ${B(Math.round(rate * 100) + '%')}<br>หากพลาด อุปกรณ์ยังอยู่ครบ เสียแค่ค่าบริการ${ore ? 'และแร่' : ''} • มี ${B(U.fmt(p.zeny) + ' ' + CUR)}`, `Refine ${B(itemDisplayName(e))} (currently +${lvl})<br>Next, +${lvl + 1}: fee ${B(U.fmt(costAt(lvl)) + ' ' + CUR)}${oreLine} • success rate ${B(Math.round(rate * 100) + '%')}<br>On a miss your gear stays intact — you only lose the fee${ore ? ' and the ore' : ''} • You have ${B(U.fmt(p.zeny) + ' ' + CUR)}`),
    [L('ตี 1 ครั้ง', 'Strike once'), L('ตีต่อเนื่องอัตโนมัติจนถึงเป้า', 'Auto-strike until target'), L('ยกเลิก', 'Cancel')]);
  if (c !== 0 && c !== 1) return;
  let target = lvl + 1;
  if (c === 1) {
    const tg = [];
    for (let t = lvl + 1; t <= 10; t++) tg.push(t);
    const k = await UI.menu(nm, L(`ตีต่อเนื่องจนถึง +เท่าไร? ข้าจะตีไปเรื่อย ๆ ไม่ต้องสั่งใหม่ — หยุดเองเมื่อถึงเป้า หรือ ${CUR}${ore ? `/${oreName}` : ''} ไม่พอ`, `Strike up to what level? I'll keep hammering without another word from you — I stop at the target or when your ${CUR}${ore ? ` or ${oreName}` : ''} runs out.`),
      [...tg.map(t => {
        let sum = 0, ores = 0; for (let l = lvl; l < t; l++) { sum += costAt(l) / RATE[l]; if (needOre(l)) ores += 1 / RATE[l]; }
        const o = ores ? L(` + ${oreName} ~${Math.ceil(ores)}`, ` + ~${Math.ceil(ores)} ${oreName}`) : '';
        return L(`+${t} (เฉลี่ยราว ${U.fmt(Math.round(sum))} ${CUR}${o})`, `+${t} (avg. ~${U.fmt(Math.round(sum))} ${CUR}${o})`);
      }), L('ยกเลิก', 'Cancel')]);
    if (k >= tg.length) return;
    target = tg[k];
  }
  if (p.zeny < costAt(lvl)) { await UI.say(nm, L(`${CUR} ไม่พอนะเจ้าหนู`, `Not enough ${CUR}, kiddo!`)); return; }
  if (needOre(lvl) && countItem(ore) < 1) { await UI.say(nm, L(`จะตีเกิน +4 ต้องมี ${B(oreName)} ด้วยนะเจ้าหนู — ไม่มีแร่ ค้อนข้าก็ไร้ความหมาย!<br>ไปล่ามอนสเตอร์เลเวลกลางขึ้นไป (Wolfwood, Hel's Hollow และลึกกว่านั้น) แล้วค่อยกลับมา`, `Going past +4 takes ${B(oreName)}, kiddo — without ore my hammer's just noise!<br>Go hunt mid-level monsters and up (Wolfwood, Hel's Hollow and deeper), then come back.`)); return; }
  UI.dlgClose();
  let tries = 0, spent = 0, fails = 0, oreUsed = 0;
  // ตีทีละครั้ง เว้นจังหวะให้เห็นผล (เสียง + ข้อความ) จนถึงเป้า / เงินไม่พอ / อุปกรณ์ถูกถอด / ผู้เล่นตาย
  while ((e.refine || 0) < target) {
    const l = e.refine || 0, cost = costAt(l);
    if (p.zeny < cost || p.equip[slot] !== e || p.dead) break;
    if (needOre(l)) { const oe = p.inventory.find(x => x.id === ore); if (!oe) break; removeEntry(oe, 1); oreUsed++; }
    p.zeny -= cost; spent += cost; tries++;
    await new Promise(r => setTimeout(r, c === 1 ? 380 : 400));
    if (U.chance(RATE[l])) {
      e.refine = l + 1;
      Quest.onEvent('refine');
      recalc();
      addFx({ type: 'levelup', ref: p, dur: 1.2 });
      addFloater(p.x, p.y - 1.5, `+${e.refine}!`, '#ffe36a', true);
      UI.msg(L(`ตีบวกสำเร็จ! ${itemDisplayName(e)}`, `Refine success! ${itemDisplayName(e)}`), 'lvl');
      Sound.play('refine_ok');
    } else {
      fails++;
      addFloater(p.x, p.y - 1.5, L('พลาด', 'Miss'), '#ff9aa8');
      UI.msg(L(`ตีบวก +${l + 1} พลาด... ${itemDisplayName(e)} ยังอยู่ครบ`, `Refine +${l + 1} missed... ${itemDisplayName(e)} is still intact`), 'err');
      Sound.play('refine_fail');
    }
    UI.dirty();
    if (c === 0) break;
  }
  saveGame();
  const done = (e.refine || 0) >= target;
  if (c === 0) await UI.say(nm, done ? L(`ฮ่าฮ่า! สำเร็จ! ตอนนี้กลายเป็น ${B(itemDisplayName(e))} แล้ว!`, `Ha-ha! Success! It's now ${B(itemDisplayName(e))}!`) : L('โอ๊ะ! ค้อนพลาดไปนิด... อุปกรณ์ยังปลอดภัยดี ลองใหม่ได้เสมอ!', 'Whoops! The hammer slipped a bit... your gear\'s safe and sound. You can always try again!'));
  else {
    const noOre = !done && needOre(e.refine || 0) && countItem(ore) < 1;
    const oreSpent = oreUsed ? L(` และ ${B(oreName + ' ' + oreUsed + ' ชิ้น')}`, ` and ${B(oreUsed + ' ' + oreName)}`) : '';
    await UI.say(nm, L(`${done ? 'ถึงเป้าแล้ว! ฮ่าฮ่า!' : noOre ? `${oreName} หมดก่อนถึงเป้า — ไปล่าแร่มาเพิ่มแล้วค่อยมาใหม่!` : p.zeny < costAt(e.refine || 0) ? `${CUR} หมดกระเป๋าก่อนถึงเป้า — พักไปหาเงินแล้วมาใหม่!` : 'หยุดก่อนนะเจ้าหนู'}<br>ตอนนี้: ${B(itemDisplayName(e))}<br>ตีไป ${B(tries + ' ครั้ง')} (พลาด ${fails}) • ใช้ไป ${B(U.fmt(spent) + ' ' + CUR)}${oreSpent}`, `${done ? 'Target reached! Ha-ha!' : noOre ? `You ran out of ${oreName} before the target — go hunt for more ore and come back!` : p.zeny < costAt(e.refine || 0) ? `Your ${CUR} ran dry before the target — go earn some more and come back!` : 'Let\'s stop here, kiddo'}<br>Now: ${B(itemDisplayName(e))}<br>Strikes: ${B(tries)} (${fails} missed) • Spent ${B(U.fmt(spent) + ' ' + CUR)}${oreSpent}`));
  }
};

// Brokk: เมนูแรก ตีบวก / ถอดชิปออกจากอุปกรณ์ (ฟรี ชิปกลับเข้ากระเป๋าครบ)
{
  const forge = NPC.scripts.refine;
  NPC.scripts.refine = async n => {
    const nm = `[${n.name}]`;
    const c = await UI.menu(nm, L('มาหา Brokk มีงานอะไรให้ข้าทำ?', 'Come to see Brokk, eh? What job have you got for me?'), [L('ตีบวกอุปกรณ์', 'Refine Equipment'), L('ถอดชิปออกจากอุปกรณ์ (ฟรี)', 'Remove Chips from Equipment (Free)'), L('ยกเลิก', 'Cancel')]);
    if (c === 0) return forge(n);
    if (c === 1) return NPC.unsocket(nm);
  };
}
NPC.unsocket = async nm => {
  const p = G.player;
  // อุปกรณ์ที่มีชิปติดอยู่ ทั้งที่สวมและที่อยู่ในกระเป๋า
  const list = [...EQUIP_SLOTS.map(s => p.equip[s]).filter(Boolean), ...p.inventory.filter(e => isEquipType(ITEMS[e.id]))].filter(e => e.cards && e.cards.length);
  if (!list.length) { await UI.say(nm, L('ไม่มีอุปกรณ์ชิ้นไหนติดชิปอยู่เลย<br>ติดชิปได้ที่ช่องเก็บของ แท็บ <b>ชิป</b> แล้วกด "ใส่ชิป"', 'None of your gear has any chips in it!<br>You can socket chips from the <b>Chips</b> tab of your inventory.')); return; }
  const i = await UI.menu(nm, L(`จะถอดชิปจากชิ้นไหน? ${B('ไม่คิดค่าบริการ')} ชิปจะกลับเข้ากระเป๋าครบ`, `Which piece should I pull chips from? ${B('No charge')} — every chip goes right back into your bag.`),
    [...list.map(e => `${itemDisplayName(e)} — ${e.cards.map(c => ITEMS[c].name).join(', ')}`), L('ยกเลิก', 'Cancel')]);
  if (i >= list.length) return;
  const e = list[i];
  const opts = e.cards.length > 1 ? [...e.cards.map(c => ITEMS[c].name), L('ถอดทั้งหมด', 'Remove All'), L('ยกเลิก', 'Cancel')] : [ITEMS[e.cards[0]].name, L('ยกเลิก', 'Cancel')];
  const j = await UI.menu(nm, L(`ถอดชิปชิ้นไหนออกจาก ${B(itemDisplayName(e))}?`, `Which chip comes out of ${B(itemDisplayName(e))}?`), opts);
  const all = e.cards.length > 1 && j === e.cards.length;
  if (!all && j >= e.cards.length) return;
  const out = all ? e.cards.splice(0) : e.cards.splice(j, 1);
  for (const id of out) addItem(id, 1, true);
  recalc(); saveGame(); UI.dirty();
  Sound.play('equip');
  UI.msg(L(`ถอด ${out.map(id => ITEMS[id].name).join(', ')} ออกจาก ${itemDisplayName(e)} แล้ว (ฟรี)`, `Removed ${out.map(id => ITEMS[id].name).join(', ')} from ${itemDisplayName(e)} (free)`), 'item');
  await UI.say(nm, L(`เรียบร้อย! ${B(out.map(id => ITEMS[id].name).join(', '))} กลับเข้ากระเป๋าแล้ว ช่องว่างพร้อมใส่ชิปใหม่`, `All done! ${B(out.map(id => ITEMS[id].name).join(', '))} is back in your bag, and the socket's ready for a new chip!`));
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
    if (countItem('yggdrasil_shard') <= 0) { await UI.say(nm, L('เจ้าไม่มี Yggdrasil Core ติดตัวมา... ไม่เป็นไร ทูตกับไฟต่างทิ้งมันไว้ให้ผู้ที่ล้มพวกมันได้<br>วันไหนเจ้ามีมัน ค่อยตัดสินใจ — ข้ารอได้ ข้ารอมาสามสิบปีแล้ว', 'You carry no Yggdrasil Core... that is all right. The envoy and the fire each leave one for whoever brings them down.<br>Decide on the day you hold one — I can wait. I have waited thirty years already.')); return; }
    const c = await UI.menu(nm, L('ข้าขอ Yggdrasil Core จากเจ้าได้ไหม... เพื่อต่อกิ่งของข้ากลับเข้าต้นไม้ แล้วปลูกร่างให้ประกายบนชั้นวาง<br>ถ้าเจ้าไม่ให้ ข้าก็ไม่บังคับ', 'May I ask you for your Yggdrasil Core...? With it, I could graft my branch back onto the tree, and grow frames for the sparks on my shelves.<br>If you would rather not, I will not force you.'), [L('มอบ Yggdrasil Core ให้ Hel', 'Give the Yggdrasil Core to Hel'), L('เก็บไว้ก่อน', 'Keep it for now')]);
    if (c === 0) {
      const e = p.inventory.find(x => x.id === 'yggdrasil_shard'); if (!e) return;
      removeEntry(e, 1); st.core = 'gave';
      await UI.say(nm, L('(ครึ่งหน้ากากที่สว่างของเธอโค้งขึ้น) ...ข้าจะไม่ใช้มันจนกว่าจะแน่ใจว่าประกายในชั้นวางสะอาด ข้าสัญญา<br>ขอบคุณ ใบแรกของต้นไม้', '(The lit half of her mask curves upward.) ...I will not use it until I am certain the sparks on my shelves are clean. I promise.<br>Thank you, First Leaf of the tree.'));
    } else { st.core = 'kept'; await UI.say(nm, L('เช่นนั้นก็ดี... ถือมันไว้ให้มั่น มีคนอยากได้มันมากกว่าข้า<br>และเขาไม่ได้ "ขอ" เหมือนข้าเสมอไป', 'Then so be it... hold on to it tightly. There is one who wants it more than I do.<br>And he does not always "ask," as I do.')); }
    saveGame();
  };
  if (!st.helMet) { // พบครั้งแรก
    st.helMet = 1;
    await UI.say(nm, L('เจ้ามาจากผิวดิน... ยังมีผิวดินอยู่อีกหรือ<br>ข้าขอโทษที่ยามของข้าทำร้ายเจ้า พวกเขาเห็นไฟมาสามคืนแล้ว และเจ้าก็สว่างเหลือเกิน', 'You come from the surface... is there still a surface up there?<br>Forgive me — my guards have hurt you. They have watched fire for three nights now, and you shine so very brightly.'));
    await UI.say(nm, L('ข้าคือ Hel ผู้เก็บประกายที่ล้มลงนอกรัศมีราก — ชั้นวางเหล่านี้คือทุกคนที่ใบไม้ไปไม่ถึง<br>ข้าแค่ต้องการ Yggdrasil Core เพื่อต่อกิ่งของข้ากลับเข้าต้นไม้ แล้วปลูกร่างให้พวกเขา', 'I am Hel. I keep the sparks of those who fell beyond the roots\' reach — these shelves hold everyone the leaves could not reach.<br>All I want is a Yggdrasil Core, to graft my branch back onto the tree and grow frames for them.'));
    if (qDone('lv30') && !st.helMask) { st.helMask = 1; await UI.say(nm, L('...เศษหน้ากากชิ้นนี้ — ของ Eir (ครึ่งหน้ากากที่สว่างของเธอสั่นไหว)<br>"ผิวดินยังไม่ล่ม"... ขอบคุณที่ถือมันลงมาถึงที่นี่ หน่วยใหม่', '...This mask fragment — it is Eir\'s. (The lit half of her mask flickers.)<br>"The surface hasn\'t fallen"... Thank you for carrying it all the way down here, new unit.')); }
    await UI.say(nm, L('ข้าจำได้ว่าใครตัดกิ่งในคืนนั้น แต่ข้าไม่เคยบอกใคร เพราะข้าเข้าใจเหตุผลของเขา<br>ตอนนี้ไฟตัวนั้นกำลังเผาชั้นวางของข้าทีละชั้น — ช่วยข้าหยุดมันเถิด', 'I remember who cut the branch that night, but I have never told anyone, for I understand his reasons.<br>Now that fire is burning my shelves, one after another — please, help me stop it.'));
    saveGame();
    return;
  }
  if (qDone('hollow5') && !st.helEnd) { // จบบทที่ 5: Lopt เดินออกมาจากเงาหลัง Hel — Loki
    st.helEnd = 1;
    await UI.say(nm, L(`ไฟดับแล้ว... ชั้นวางของข้ายังอยู่ (ครึ่งหน้ากากที่สว่างของเธอโค้งขึ้น)<br>ขอบคุณ หน่วยใหม่ — ไม่ใช่ ขอบคุณ ${B(p.name)}`, `The fire is out... my shelves still stand. (The lit half of her mask curves upward.)<br>Thank you, new unit — no. Thank you, ${B(p.name)}.`));
    await askCore();
    await UI.say(L('[เงาหลัง Hel]', '[The Shadow Behind Hel]'), L('ยาถูกกว่าในเมืองสามโวลต์ จำข้าได้ไหม หน่วยใหม่... (วิเซอร์สีเหลืองอุ่นของ Lopt เปลี่ยนเป็น<b>เขียวเต็มแถบ</b>)<br>ข้าคือคนที่ปลุก Kitsura และข้าคือคนที่ตัดกิ่งในคืนนั้น', 'Potions three Volt cheaper than in town — remember me, new unit...? (Lopt\'s warm yellow visor turns <b>solid green</b>.)<br>I am the one who woke Kitsura. And I am the one who cut the branch that night.'));
    await UI.say('[Loki]', L('ข้าตัดกิ่งเพราะสนิมอยู่ใต้โพรงนี้ ไม่ใช่ในป่า ไม่ใช่ในหมาป่า<br>มันอยู่ข้างล่างเรานี่เอง และมันไม่เคยดับ — Fenrir กลืนไปแค่หัว', 'I cut the branch because the Rust lies beneath this Hollow. Not in the forest. Not in the wolf.<br>It is right here below us, and it never went out — Fenrir swallowed only its head.'));
    await UI.say('[Loki]', L(`เจ้าคือใบแรกที่ต้นไม้งอกได้หลังคืนนั้น หน่วยใหม่<br>ต้นไม้ไม่ได้งอกเจ้ามาเพื่อซ่อมอะไรทั้งนั้น... มันงอกเจ้ามาเพื่อ ${B('ไปต่อ')}`, `You are the first leaf the tree has grown since that night, new unit.<br>The tree did not grow you to repair anything... it grew you to ${B('go on')}.`));
    await UI.say('[...]', L('พื้นโพรงสั่น เสียงแทะดังมาจากข้างล่าง<br>ชั้นวางประกายของ Hel สว่างพรึบพร้อมกัน', 'The floor of the Hollow trembles. A gnawing sound rises from below.<br>All of Hel\'s spark shelves blaze to light at once.'));
    UI.dlgClose();
    Sound.play('mvp');
    UI.splash(null, L('บทที่ 6 — รากที่ถูกแทะ', 'Chapter 6 — The Gnawed Root'), L('เร็ว ๆ นี้ • IRON VALHALLA', 'Coming Soon • IRON VALHALLA'), 'upgrade');
    UI.msg(L('📖 บทที่ 6 — รากที่ถูกแทะ (เร็ว ๆ นี้)', '📖 Chapter 6 — The Gnawed Root (Coming Soon)'), 'lvl');
    saveGame();
    return;
  }
  if (qDone('hollow5')) { // หลังจบบท
    await UI.say(nm, L('เสียงแทะยังดังอยู่ข้างล่าง... เขาไปแล้ว ข้าจะเฝ้าชั้นวางต่อไป<br>กลับขึ้นไปบอกผิวดินเถิดว่า โพรงนี้ก็ยังไม่ล่มเช่นกัน', 'The gnawing still echoes from below... He is gone. I will keep watch over the shelves.<br>Go back up, and tell the surface that this Hollow has not fallen either.'));
    await askCore();
    return;
  }
  if (qDone('hollow3')) { // กำลังล่า Kitsura
    await UI.say(nm, L('มันอยู่ลึกเข้าไปในโพรง เก้าหางของมันคือเก้าหัวเผา<br>ยามของข้าทนได้สามคืน... เจ้าสว่างกว่าพวกเขา ไปเถิด — แล้วกลับมาเล่าให้ข้าฟัง', 'It lies deep within the Hollow. Its nine tails are nine burners.<br>My guards held for three nights... you shine brighter than they do. Go — and come back to tell me of it.'));
    return;
  }
  await UI.say(nm, L('ชั้นวางเหล่านี้ยังต้องการคนดูแล ตะเกียงที่หล่นควรได้กลับขึ้นชั้น<br>เมื่อเจ้าพร้อม ข้าจะเล่าเรื่องไฟให้ฟัง', 'These shelves still need tending. The lanterns that have fallen should return to their places.<br>When you are ready, I will tell you about the fire.'));
};
