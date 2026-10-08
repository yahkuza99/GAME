'use strict';
// ============================================================
//  สคริปต์ NPC (ใช้ async/await กับกล่องบทสนทนา)
//  บทพูดเล่าเรื่องตาม docs/STORY.md — เปลี่ยนตามความคืบหน้าเควสต์ (Quest.isDone / Quest.is) และ flag ใน Story.st()
//  ห้ามเปลี่ยนลำดับตัวเลือกในเมนู: โค้ดอื่นอ้างดัชนี (เช่น เมนู Rolf ช่อง 0 = บอร์ดล่าค่าหัว)
// ============================================================

const NPC = {
  talkRange: 4, // ช่องแผนที่: คุยได้โดยไม่ต้องเดินไปชิดตัว NPC
  distance(n, p = G.player) { return U.dist(p.x, p.y, n.x + 0.5, n.y + 0.5); },
  inTalkRange(n, p = G.player) { return this.distance(n, p) <= this.talkRange; },
  busy: false,
  async talk(n) {
    // ค้างจากบทสนทนาเก่าที่ไม่จบ (หน้าต่างปิดไปแล้ว) → ล้างทิ้ง คุยใหม่ได้เสมอ
    if (this.busy && !UI.isOpen('w-dialog') && !UI.isOpen('w-confirm')) this.busy = false;
    if (this.busy) return;
    const fn = this.scripts[n.id];
    if (!fn) return;
    this.busy = true;
    const sid = this.sid = (this.sid || 0) + 1;
    try {
      const q0 = Quest.current();
      Quest.onTalk(n.id); UI.illust(`npc_${n.id}`);
      // เควสต์เสริม (js/quest.js Side): ส่ง/รับก่อนสคริปต์ปกติ — ข้ามรอบที่เควสต์หลักเพิ่งสำเร็จที่ NPC ตัวนี้ (ให้บทพูดเนื้อเรื่องมาก่อน)
      if (typeof Side !== 'undefined' && Quest.current() === q0) await Side.npcTalk(n);
      await fn(n);
    }
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
  const greet = Quest.passed('ch4_sigrun') && !Quest.passed('lv30') // บทที่ 4: ตัวเลขของ Sigrún
    ? L('ข้าจดจำ Sigrún ได้ — นางล้มลง <b>1,204 ครั้ง</b> ข้าบอกตัวเลขนี้กับนางเมื่อคืน แล้วนางก็เงียบไป<br>ข้าคือผู้ควบคุม <b>ไบฟรอสต์</b> — บันทึกจุดกู้คืน และส่งเจ้าข้ามพื้นที่', 'I remember Sigrún — she has fallen <b>1,204 times</b>. I told her that number last night, and she fell silent.<br>I am the keeper of the <b>Bifrost</b> — I record your recovery point and send you across the lands.')
    : qDone('mvp1')
    ? L('ข้าจดจำเสียงราก... มันยืดลงไปทางใต้ ช้า ๆ ทางโพรงของเฮล ข้าไม่รู้ว่าดีหรือร้าย<br>ข้าคือผู้ควบคุม <b>ไบฟรอสต์</b> — บันทึกจุดกู้คืน และส่งเจ้าข้ามพื้นที่', 'I remember the voice of the roots... they are stretching south, slowly, toward Hel\'s Hollow. I do not know if that is good or ill.<br>I am the keeper of the <b>Bifrost</b> — I record your recovery point and send you across the lands.')
    : L('ข้าจดจำ... ทุกอย่าง จำนวนใบไม้ที่ส่งออกไป จำนวนครั้งที่เจ้ากลับมา<br>ข้าคือผู้ควบคุม <b>ไบฟรอสต์</b> เครือข่ายสายรุ้ง — บันทึกจุดกู้คืนของเจ้า และส่งเจ้าข้ามพื้นที่ได้', 'I remember... everything. How many leaves were sent out. How many times you came back.<br>I am the keeper of the <b>Bifrost</b>, the rainbow network — I record your recovery point and can send you across the lands.');
  const c = await UI.menu(nm, greet, [L('บันทึกจุดเกิด (Save)', 'Set Save Point (Save)'), L('ข้ามสะพานสายรุ้ง (เทเลพอร์ต)', 'Cross the Rainbow Bridge (Teleport)'), 'Cancel']);
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
        : `${MAP_DEFS[id].name} (Lv ${MAP_DEFS[id].level.split(' ')[0]}) — ${U.fmt(z)} ${CUR}${lv && p.baseLv < lv ? L(` · 🔒 ต้อง Base Lv ${lv}`, ` · 🔒 Base Lv ${lv}+`) : ''}`), 'Cancel']);
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
  if (Quest.passed('ch4_lopt') && !Quest.passed('hollow4') && !st.mimirKitsura) { // บทที่ 4: ชื่อของไฟ (ครั้งเดียว)
    st.mimirKitsura = 1;
    await UI.say(nm, L(`Kitsura... ${B('Kitsura EX')} หน่วยเผาผลาญที่ Odin สร้างไว้เป็นทางเลือกสุดท้าย — EX คือ Extinguish<br>มันตื่นได้ด้วยกุญแจของผู้พิทักษ์เท่านั้น`, `Kitsura... ${B('Kitsura EX')}, the incinerator Odin built as a last resort — EX stands for Extinguish.<br>Only a Guardian's key can wake it.`));
    await UI.say(nm, L('ข้อมูลไม่ครบหนึ่งข้อ: พ่อค้าเร่รู้ชื่อมันได้อย่างไร<br>ข้าเคยเตือนเจ้าแล้ว — ระวังพ่อค้าที่ใจดีเกินไป', 'One fact is missing: how does a wandering peddler know its name?<br>I warned you once already — beware any merchant who seems too kind.'));
    saveGame();
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
    const c2 = await UI.menu(nm, L(`แน่ใจหรือ? จะเสีย ${U.fmt(cost)} ${CUR}`, `Are you certain? It will cost ${U.fmt(cost)} ${CUR}.`), [L('แน่ใจ', 'I\'m sure'), 'Cancel']);
    if (c2 !== 0) return;
    p.zeny -= cost;
    const pts = i === 0 ? resetSkills() : resetStats();
    UI.dirty();
    await UI.say(nm, L(`เสร็จสิ้น! ข้าคืน ${B(pts)} ${i === 0 ? 'Skill' : 'Status'} Point ให้เจ้าแล้ว — แม่พิมพ์ไม่ว่าอะไรหรอก มันปรับตัวเก่ง`, `It is done. I have returned ${B(pts)} ${i === 0 ? 'Skill' : 'Status'} Points to you — the mold does not mind. It adapts well.`));
  }
};

async function shopNpc(n, key, greet) {
  const nm = `[${n.name}]`;
  const i = await UI.menu(nm, greet, ['Buy', 'Sell', 'Cancel']);
  if (i > 1) return;
  UI.dlgClose();
  UI.openShop(n.name, SHOPS[key]);
  UI.shop.mode = i === 0 ? 'buy' : 'sell';
  UI.renderShop();
}
// ชาวเมืองธรรมดา: Tool Dealer ขี้บ่นเรื่องน้ำมัน • Weapon Dealer พูดเหมือนนักกีฬา • Armor Dealer ขี้กังวล
// บทพูดเปลี่ยนตามบท (docs/STORY.md ข้อ 10.6): ก่อนปราบ Seraph / หลังปราบ Seraph / หลัง Lv 30 (จบบทที่ 4)
const chLine = (early, seraph, hollow) => Quest.passed('lv30') ? hollow : Quest.passed('mvp1') ? seraph : early;
NPC.scripts.tool = n => shopNpc(n, 'tool', chLine(
  L('ยา Blink Chip อาหาร มีครบทุกอย่างที่นักผจญภัยต้องการ — ราคาน้ำมันขึ้นอีกแล้วนะ อย่าถามว่าทำไมของแพง<br>จะรับอะไรดี?', 'Potions, Blink Chips, food — everything an adventurer needs. Oil prices went up AGAIN, so don\'t ask me why everything\'s so pricey.<br>What\'ll it be?'),
  L('ได้ยินว่าทูตในหมอกเงียบไปแล้ว ทีนี้คนแห่ลงป่าทางใต้กันหมด ยาขายดีจนน้ำมันขึ้นอีก!<br>ไม่ใช่ความผิดเจ้าหรอก... ก็นิดหน่อย จะรับอะไรดี?', 'Heard the envoy in the mist went quiet — now everyone\'s rushing into the southern forest, and potions sell so fast the oil price went up AGAIN!<br>Not your fault... well, a little. What\'ll it be?'),
  L('จะลงโพรงงั้นรึ? ซื้อยาไปเยอะ ๆ — ข้าไม่ได้พูดเพราะอยากขายนะ<br>...ก็นิดหน่อย จะรับอะไรดี?', 'Heading down into the Hollow, eh? Stock up on potions — and I\'m not just saying that to make a sale.<br>...Well, a little. What\'ll it be?')));
NPC.scripts.weapon = n => shopNpc(n, 'weapon', chLine(
  L('โย่! อาวุธจากโรงงานนีโอเอลด์ไฮม์ — ตัวนี้แรงนะ ตัวนั้นก็แรง!<br>ฟิตร่างให้พร้อมก่อนออกไปล่า เลือกดูได้เลย', 'Yo! Weapons straight from the Neo Eldheim works — this one hits hard! That one hits hard too!<br>Get your frame in shape before the hunt. Have a look!'),
  L('โย่! ได้ข่าวว่าเจ้าล้มทูตในหมอกได้ — ตัวนี้แรงนะ แต่เจ้าแรงกว่า!<br>ป่าทางใต้มีหมีเหล็กกับรถถังหมูป่า ฟิตร่างไว้ก่อน เลือกดูได้เลย', 'Yo! Heard you took down the envoy in the mist — this one hits hard, but you hit harder!<br>The southern forest\'s full of iron bears and boar tanks. Get in shape first — have a look!'),
  L('ลงโพรงเหรอ! ข้างล่างมืด ฟันให้แรงเข้าไว้ — ตัวนี้แรงนะ ตัวนั้นก็แรง!<br>กลับมาเล่าให้ข้าฟังด้วยว่าอันไหนแรงสุด', 'Into the Hollow, huh! It\'s dark down there — swing hard. This one hits hard! That one too!<br>Come back and tell me which one hit hardest.')));
NPC.scripts.armor = n => shopNpc(n, 'armor', chLine(
  L('ใส่เกราะหรือยัง? หมวกล่ะ? รองเท้า?... ข้าเป็นห่วง อย่าออกไปตัวเปล่านะ<br>เกราะ หมวก โล่ รองเท้า เครื่องประดับ — ป้องกันตัวให้ดีก่อนออกเดินทาง', 'Are you wearing armor? A helm? Boots?... I worry, you know. Please don\'t go out there unprotected.<br>Armor, helms, shields, boots, accessories — protect yourself before you set off.'),
  L('ป่าทางใต้เพิ่งไหม้... เกราะกันไฟไม่ได้หรอกนะ แต่ดีกว่าไม่ใส่<br>ข้าเป็นห่วงจริง ๆ — ดูของก่อนไปเถอะ', 'The southern forest just burned... armor won\'t stop fire, you know, but it\'s better than nothing.<br>I really do worry — have a look before you go.'),
  L('โพรงของเฮล... ใบไม้ไปไม่ถึงที่นั่นนะ (เสียงของเขาสั่น)<br>ใส่ให้ครบทุกชิ้นก่อนลงไป สัญญากับข้า', 'Hel\'s Hollow... the leaves don\'t reach down there. (His voice trembles.)<br>Wear every piece before you go down. Promise me.')));

NPC.scripts.storage = async n => {
  const p = G.player, nm = `[${n.name}]`, fee = p.job === 'novice' ? 0 : 40;
  const line = typeof Side !== 'undefined' && Side.isDone('s_slot47') ? L('ช่องที่ 47 ฝาแน่นแล้ว ขอบใจ — ระเบียบคือระเบียบ แต่บางช่องก็ไม่ใช่แค่ระเบียบ', 'Slot 47\'s lid is tight again. Thank you — rules are rules, but some slots are more than rules.')
    : qDone('lv30') ? L('ช่องที่ 47 เป็นของคู่หู Rolf — เขาไม่เคยมาเปิด และข้าไม่เคยทิ้ง', 'Slot 47 belongs to Rolf\'s old partner — he never came to open it, and I never threw it out.')
    : L('ช่องที่ 47 ยังว่าง เจ้าของมันไม่กลับมา 30 ปีแล้ว ข้าไม่ให้ใครเช่า — ระเบียบคือระเบียบ', 'Slot 47 is still empty. Its owner hasn\'t come back in 30 years. I won\'t rent it to anyone — rules are rules.');
  const i = await UI.menu(nm, L(`หน่วยคลังเก็บของ Kaia ${line}<br>ฝากของไว้ที่นี่ได้ ${B(STORAGE_MAX + ' ช่อง')} (ตอนนี้ใช้ ${p.storage.length}) ค่าบริการ ${fee ? B(fee + ' ' + CUR) : B('ฟรีสำหรับ Novice')}`, `Storage Unit Kaia. ${line}<br>You can store up to ${B(STORAGE_MAX + ' slots')} here (in use: ${p.storage.length}). Fee: ${fee ? B(fee + ' ' + CUR) : B('free for Novices')}`),
    [L('เปิดคลังเก็บของ', 'Open Storage'), 'Cancel']);
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
  } else if (Quest.passed('ch4_filter') && !Quest.passed('lv30') && !st.eirAsh) { // บทที่ 4: ไส้กรองเถ้ายังอุ่น
    st.eirAsh = 1;
    text = L('ไส้กรองเถ้าในป่ายังอุ่นงั้นหรือคะ... ไฟที่ร้อนจนเผาป่าทั้งแถบแล้วเดินต่อไปได้ ไม่ใช่ไฟป่าธรรมดาค่ะ<br>พบรอยร้าวเล็กน้อย — ซ่อมและติดตั้งบัฟให้นะคะ ✚ อย่าเดินตามมันไปคนเดียวนะคะ', 'The ash filters in the forest are still warm...? A fire hot enough to burn a whole stretch of forest and keep walking — that\'s no ordinary wildfire.<br>Minor cracks found — repairing and installing buffs ✚ Please don\'t follow it alone.');
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
      [L('งานล่าค่าหัวประจำวัน', 'Daily Bounties') + (Bounty.ready().length ? L(` (ส่งได้ ${Bounty.ready().length})`, ` (${Bounty.ready().length} ready)`) : ''), L('วิธีควบคุม', 'Controls'), L('แผนที่รอบเมือง', 'Maps Around Town'), L('ผู้คนในเมือง', 'People in Town'), L('Class อัปเกรดทั้ง 6', 'The 6 Upgrade Classes'), 'Tips', L('ขอบคุณ', 'Thanks')]);
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

// ------------------------------------------------------------
//  Brokk Forge-Bot — ตีบวก / ถอดชิป
//  UI เป็นหน้าต่างสมุดเปิด #w-forge (js/ui.js: UI.openForge / renderForge) • สูตรตีบวกอยู่ที่นี่ที่เดียว (ไม่เปลี่ยนจากเดิม)
//  +1~+4 สำเร็จแน่นอน • จากนั้นอาจพลาด (ของไม่แตก เสียค่าบริการ) • ตั้งแต่ +5 ใช้แร่ 1 ชิ้นต่อครั้ง (js/loot.js)
// ------------------------------------------------------------
NPC.REFINE_RATE = [1, 1, 1, 1, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];
// ข้อมูลตีบวกของอุปกรณ์ที่สวมในช่อง slot: ค่าบริการ / โอกาส / แร่ / ค่าเฉลี่ยถึงเป้า
NPC.refineCalc = slot => {
  const p = G.player, e = p.equip[slot]; if (!e) return null;
  const RATE = NPC.REFINE_RATE, lvl = e.refine || 0;
  const costAt = l => (slot === 'weapon' ? 250 : 400) * (l + 1);
  const ore = typeof LOOT !== 'undefined' ? LOOT.oreFor(slot) : null;
  const needOre = l => !!ore && l >= LOOT.ORE_FROM; // ตีจาก +l ไป +(l+1) ต้องใช้แร่ไหม
  const avg = t => { let sum = 0, ores = 0; for (let l = lvl; l < t; l++) { sum += costAt(l) / RATE[l]; if (needOre(l)) ores += 1 / RATE[l]; } return { zeny: Math.round(sum), ore: Math.ceil(ores) }; };
  return { slot, e, lvl, maxed: lvl >= 10, rate: RATE[lvl], cost: costAt(lvl), costAt, ore, oreName: ore ? ITEMS[ore].name : '', needOre, avg,
    oreHave: ore ? countItem(ore) : 0, canPay: p.zeny >= costAt(lvl), oreOk: !needOre(lvl) || (ore && countItem(ore) > 0) };
};
// ตีทีละครั้ง เว้นจังหวะให้เห็นผล (เสียง + ข้อความ) จนถึงเป้า / เงินหรือแร่ไม่พอ / อุปกรณ์ถูกถอด / ผู้เล่นตาย
// auto = ตีต่อเนื่อง (ค้อน 1 จังหวะต่อครั้ง) • คืนสรุปผล
NPC.refineRun = async (slot, target, auto) => {
  const p = G.player, c = NPC.refineCalc(slot);
  if (!c || c.maxed) return null;
  const { e, costAt, needOre, ore } = c, RATE = NPC.REFINE_RATE;
  let tries = 0, spent = 0, fails = 0, oreUsed = 0;
  while ((e.refine || 0) < target) {
    const l = e.refine || 0, cost = costAt(l);
    if (p.zeny < cost || p.equip[slot] !== e || p.dead) break;
    if (needOre(l)) { const oe = p.inventory.find(x => x.id === ore); if (!oe) break; removeEntry(oe, 1); oreUsed++; }
    p.zeny -= cost; spent += cost; tries++;
    if (typeof Feel !== 'undefined') await Feel.forge(auto); // ค้อน 3 จังหวะ → เงียบลุ้น (ตีอัตโนมัติ = 1 จังหวะ)
    else await new Promise(r => setTimeout(r, auto ? 380 : 400));
    if (U.chance(RATE[l])) {
      e.refine = l + 1;
      Quest.onEvent('refine');
      recalc();
      addFx({ type: 'levelup', ref: p, dur: 1.2 });
      addFloater(p.x, p.y - 1.5, `+${e.refine}!`, '#ffe36a', true);
      UI.msg(L(`ตีบวกสำเร็จ! ${itemDisplayName(e)}`, `Refine success! ${itemDisplayName(e)}`), 'lvl');
      Sound.play('refine_ok');
      if (typeof Feel !== 'undefined') Feel.forgeResult(true, e.refine);
    } else {
      fails++;
      addFloater(p.x, p.y - 1.5, L('พลาด', 'Miss'), '#ff9aa8');
      UI.msg(L(`ตีบวก +${l + 1} พลาด... ${itemDisplayName(e)} ยังอยู่ครบ`, `Refine +${l + 1} missed... ${itemDisplayName(e)} is still intact`), 'err');
      Sound.play('refine_fail');
      if (typeof Feel !== 'undefined') Feel.forgeResult(false, l + 1);
    }
    UI.dirty();
    if (!auto) break;
  }
  saveGame();
  const lv = e.refine || 0, done = lv >= target;
  const noOre = !done && needOre(lv) && countItem(ore) < 1, broke = !done && p.zeny < costAt(lv);
  return { e, tries, fails, spent, oreUsed, done, noOre, broke, oreName: c.oreName };
};
// ถอดชิปออกจากอุปกรณ์ (ฟรี ชิปกลับเข้ากระเป๋าครบ) • j = ลำดับชิป หรือ 'all'
NPC.removeChips = (e, j) => {
  if (!e || !e.cards || !e.cards.length) return [];
  const out = j === 'all' ? e.cards.splice(0) : e.cards.splice(j, 1);
  for (const id of out) addItem(id, 1, true);
  recalc(); saveGame(); UI.dirty();
  Sound.play('equip');
  UI.msg(L(`ถอด ${out.map(id => ITEMS[id].name).join(', ')} ออกจาก ${itemDisplayName(e)} แล้ว (ฟรี)`, `Removed ${out.map(id => ITEMS[id].name).join(', ')} from ${itemDisplayName(e)} (free)`), 'item');
  return out;
};

NPC.scripts.refine = async n => {
  const st = Story.st();
  const nm = `[${n.name}]`;
  if (qDone('wolf') && !st.brokkWolf) { // หลังป่าหมาป่า: Brokk คือคนตีโซ่ Gleipnir และปลดมันในคืนนั้น
    st.brokkWolf = 1;
    await UI.say(nm, L('หมาป่าในป่าดมเจ้าแล้วเดินหนีงั้นรึ... (เสียงดังของเขาเบาลง)<br>Gleipnir โซ่ที่ล่าม Fenrir — ข้าเป็นคนตีมัน และเป็นคนปลดมันในคืนนั้น ตามคำสั่ง Odin', 'The wolves in that forest sniffed you and walked away, eh... (His booming voice drops low.)<br>Gleipnir, the chain that bound Fenrir — I forged it. And I\'m the one who unchained it that night, on Odin\'s orders.'));
    await UI.say(nm, L('หมาป่าทุกตัวในป่านั่นคือของที่ข้าทำหลุดมือ เจ้าหนู<br>เอาเขี้ยวมันมาให้ข้าสักวัน ข้าจะตีเป็นอาวุธให้ — ด้วยมือสั่น ๆ นี่แหละ ฮ่าฮ่า...', 'Every wolf in that forest is something that slipped through my hands, kiddo.<br>Bring me one of their fangs someday. I\'ll forge you a weapon — with these shaky old hands. Ha-ha...'));
  }
  UI.dlgClose();
  UI.openForge(n); // หน้าต่างเตาตีเหล็ก: แท็บ ตีบวก / ถอดชิป
};
// ถอดชิปแบบบทสนทนา (สำรอง — หน้าต่างเตาตีเหล็กมีแท็บถอดชิปแล้ว)
NPC.unsocket = async nm => {
  const p = G.player;
  // อุปกรณ์ที่มีชิปติดอยู่ ทั้งที่สวมและที่อยู่ในกระเป๋า
  const list = [...EQUIP_SLOTS.map(s => p.equip[s]).filter(Boolean), ...p.inventory.filter(e => isEquipType(ITEMS[e.id]))].filter(e => e.cards && e.cards.length);
  if (!list.length) { await UI.say(nm, L('ไม่มีอุปกรณ์ชิ้นไหนติดชิปอยู่เลย<br>ติดชิปได้ที่ช่องเก็บของ แท็บ <b>ชิป</b> แล้วกด "ใส่ชิป"', 'None of your gear has any chips in it!<br>You can socket chips from the <b>Chips</b> tab of your inventory.')); return; }
  const i = await UI.menu(nm, L(`จะถอดชิปจากชิ้นไหน? ${B('ไม่คิดค่าบริการ')} ชิปจะกลับเข้ากระเป๋าครบ`, `Which piece should I pull chips from? ${B('No charge')} — every chip goes right back into your bag.`),
    [...list.map(e => `${itemDisplayName(e)} — ${e.cards.map(c => ITEMS[c].name).join(', ')}`), 'Cancel']);
  if (i >= list.length) return;
  const e = list[i];
  const opts = e.cards.length > 1 ? [...e.cards.map(c => ITEMS[c].name), L('ถอดทั้งหมด', 'Remove All'), 'Cancel'] : [ITEMS[e.cards[0]].name, 'Cancel'];
  const j = await UI.menu(nm, L(`ถอดชิปชิ้นไหนออกจาก ${B(itemDisplayName(e))}?`, `Which chip comes out of ${B(itemDisplayName(e))}?`), opts);
  const all = e.cards.length > 1 && j === e.cards.length;
  if (!all && j >= e.cards.length) return;
  const out = NPC.removeChips(e, all ? 'all' : j);
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
    UI.splash(null, L('บทที่ 6 — รากที่ถูกแทะ', 'Chapter 6 — The Gnawed Root'), L('ลงไปที่ Archive Depths • IRON VALHALLA', 'Descend to the Archive Depths • IRON VALHALLA'), 'upgrade');
    UI.msg(L('📖 เริ่มบทที่ 6 — รากที่ถูกแทะ: ทางลงอยู่ใต้ Hel\'s Hollow (Archive Depths)', '📖 Chapter 6 begins — The Gnawed Root: the way down lies beneath Hel\'s Hollow (Archive Depths)'), 'lvl');
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

// ------------------------------------------------------------
//  Sigrún — คู่แข่ง (บทที่ 4, Wolfwood) หน่วยทหารผ่านศึกที่ถูกปลุกซ้ำจนไม่เหลือความทรงจำ แต่มั่นใจเต็มร้อย
//  กระจกของผู้เล่น: คนหนึ่งไม่มีอดีตเพราะใหม่เกินไป อีกคนไม่มีอดีตเพราะเก่าเกินไป
//  บทพูดตามความคืบหน้า (Quest.passed — เซฟเก่าที่ข้ามบท 4 ไปแล้วก็ได้บทที่ตรงกับตอนนี้) • flag: sigrunMet, sigrunAsk
// ------------------------------------------------------------
NPC.scripts.sigrun = async n => {
  const st = Story.st(), nm = `[${n.name}]`, P = id => Quest.passed(id);
  if (P('hollow5')) {
    await UI.say(nm, L('เจ้ากลับขึ้นมาจากโพรงแล้ว... (แถบแสงโค้งขึ้น)<br>วันนี้ข้าเร็วกว่าเจ้าแค่เรื่องเดียว — ข้าล้มเร็วกว่า ฮ่า', 'You came back up from the Hollow... (Her light-band curves upward.)<br>Today I\'m faster than you at only one thing — falling. Ha.'));
    return;
  }
  if (P('lv30')) {
    await UI.say(nm, L('เจ้าจะลงโพรงสินะ ข้าจะเฝ้าป่าไว้ให้<br>ถ้าเจ้าล้ม Bifrost จะนับให้... ข้าไม่นับหรอก ข้าแค่จะรอ', 'You\'re going down into the Hollow, then. I\'ll watch the forest for you.<br>If you fall, the Bifrost will count it... I won\'t count. I\'ll just wait.'));
    return;
  }
  if (P('ch4_tusk')) {
    if (!st.sigrunAsk) { // หลังแข่ง: Bifrost บอกตัวเลขแล้ว — นางเปลี่ยนไป
      st.sigrunAsk = 1;
      await UI.say(nm, L('(วิเซอร์ของนางหรี่ลง) Bifrost Keeper บอกข้าว่าข้าล้มลงมา <b>1,204 ครั้ง</b><br>ข้าจำไม่ได้สักครั้ง ไม่ได้สักครั้งเดียว', '(Her visor dims.) The Bifrost Keeper told me I\'ve fallen <b>1,204 times</b>.<br>I don\'t remember a single one. Not one.'));
      await UI.say(nm, L('...เจ้าจำได้ไหมว่าตัวเองชื่ออะไรก่อนตื่น<br>เจ้าจำอะไรได้บ้าง?', '...Do you remember what your name was before you woke?<br>What do you remember?'));
      await UI.say(L('[...]', '[...]'), L('เจ้าไม่มีอะไรจะตอบ — วิเซอร์ของเจ้ายังสว่างจ้าเหมือนวันแรก', 'You have nothing to answer with — your visor still blazes as bright as on the first day.'));
      await UI.say(nm, L('งั้นเราก็เหมือนกัน คนหนึ่งใหม่เกินไป อีกคนเก่าเกินไป<br>รอยไหม้จบที่ปากป่าด้านใต้ — มีพ่อค้าตั้งแผงอยู่ตรงนั้น ข้าไม่ชอบหน้าเขา... ถ้าเขามีหน้า', 'Then we\'re the same. One too new, one too old.<br>The burn trail ends at the southern edge of the forest — there\'s a peddler set up there. I don\'t like his face... if he even has one.'));
      saveGame();
      return;
    }
    await UI.say(nm, P('ch4_lopt')
      ? L('พ่อค้านั่นรู้ชื่อไฟงั้นรึ... คนขายยารู้เรื่องหน่วยเผาผลาญได้ยังไง<br>ข้าจะเฝ้าทางนี้ไว้ เจ้าไปเก็บแรงให้ถึง Lv 30 ก่อนลงโพรง', 'That peddler knew the fire\'s name? How does a potion seller know about an incinerator unit?<br>I\'ll guard this road. Build your strength to Lv 30 before you go down.')
      : L('ปากป่าด้านใต้ ตรงทางลงโพรง — ไปคุยกับพ่อค้าคนนั้นเถอะ<br>ข้าจะไม่ไป ข้าไม่ซื้อของจากคนที่วิเซอร์กะพริบ', 'The southern edge of the forest, where the path drops into the Hollow — go talk to that peddler.<br>I\'m not going. I don\'t buy from anyone whose visor flickers.'));
    return;
  }
  if (P('ch4_fenrir')) { // แข่ง Tusk Trooper
    await UI.say(nm, L(`แข่งกัน — ${B('Tusk Trooper 5 ตัว')} ใครครบก่อนชนะ<br>ข้านำอยู่สองตัวแล้ว เร็วกว่าเจ้าอีกแล้ว!`, `A race — ${B('five Tusk Troopers')}, first to five wins.<br>I\'m already two ahead. Faster than you again!`));
    return;
  }
  if (P('ch4_filter')) { // หมาป่าไล่นาง ไม่ไล่เจ้า
    await UI.say(nm, L(`หมาป่าพวกนั้นไล่ข้าอีกแล้ว — ${B('Fenrir Unit')} ดมเจ้าแล้วเดินหนี แต่ตามข้าไม่เลิก<br>ช่วยข้าหยุดพวกมันสักสิบตัว... อย่าถามว่าทำไมมันเลือกข้า`, `Those wolves are after me again — the ${B('Fenrir Units')} sniff you and walk away, but they won't leave me be.<br>Help me stop ten of them... and don't ask why they pick me.`));
    return;
  }
  if (P('ch4_sigrun')) {
    if (!st.sigrunMet) { // พบครั้งแรกในบทที่ 4
      st.sigrunMet = 1;
      await UI.say(nm, L('เร็วกว่าเจ้าอีกแล้ว หน่วยใหม่ — ข้าชื่อ Sigrún ล้มมาแล้วมากกว่าที่ Bifrost จะนับไหว และยังยืนอยู่<br>ป่านี้ไม่ได้ไหม้ตั้งแต่คืนที่กิ่งหัก มันเพิ่งไหม้ ไม่กี่คืนก่อน', 'Faster than you again, rookie. I\'m Sigrún — I\'ve fallen more times than the Bifrost can count, and I\'m still standing.<br>This forest didn\'t burn on the night the branch broke. It burned just now — a few nights ago.'));
      await UI.say(nm, L(`มีอะไรบางอย่าง ใหญ่และร้อน เดินผ่านป่าลงไปทางใต้ ทางโพรง<br>อยากรู้ว่ามันผ่านไปเมื่อไหร่ เก็บ ${B('Ash Filter')} จาก Ash Stalker มาดู ไส้กรองไม่โกหก`, `Something big and hot walked through the forest, heading south — toward the Hollow.<br>Want to know when it passed? Bring me some ${B('Ash Filters')} from the Ash Stalkers. Filters don't lie.`));
      saveGame();
      return;
    }
    await UI.say(nm, L('ไส้กรองครบหรือยัง? Ash Stalker อยู่ทั่วป่า ตัวที่ยังอุ่นนั่นแหละ<br>เร็วเข้า ข้าไม่รอนานหรอก', 'Got those filters yet? Ash Stalkers are all over the forest — the warm ones.<br>Hurry up. I don\'t wait long.'));
    return;
  }
  // ก่อนบทที่ 4: ยังไม่รู้จักกัน แค่แย่งงานล่า
  await UI.say(nm, P('wolf')
    ? L('ทูตในหมอกยังบินวนอยู่สินะ... ข้าไม่สนทูต ข้าสนว่าอะไรเผาป่านี้<br>กลับไปเมื่อเจ้าได้ยินข้อความของมันแล้ว หน่วยใหม่', 'The envoy in the mist is still circling, huh... I don\'t care about envoys. I care about what burned this forest.<br>Come back once you\'ve heard its message, rookie.')
    : L('ตัวนั้นข้าจองแล้ว หน่วยใหม่ — เร็วกว่าเจ้าอีกแล้ว<br>ป่านี้ไม่ใช่ที่เล่นของหน่วยที่วิเซอร์ยังสว่างจ้าขนาดนั้น', 'That one\'s mine, rookie — faster than you again.<br>This forest is no playground for a unit whose visor still shines that bright.'));
};

// ------------------------------------------------------------
//  Lopt — พ่อค้าเร่ / หน้ากากของ Loki: ปากทาง Mistlake (lopt) + ปากป่า Wolfwood ด้านใต้ (lopt_wood) ใช้สคริปต์เดียวกัน
//  พูดอ่อนโยนขี้เล่น วิเซอร์สีเหลืองอุ่น... กะพริบเขียวเสี้ยววินาทีทุกครั้งที่โกหก (ราคา "ถูกกว่าในเมืองสามโวลต์" ก็โกหก — ราคาเท่ากัน)
//  หลังบทที่ 5 (เปิดเผยตัวแล้ว) ไม่กะพริบอีก • ร้านขายของ 3 อย่าง (SHOPS.lopt)
// ------------------------------------------------------------
if (typeof SHOPS !== 'undefined' && !SHOPS.lopt) SHOPS.lopt = ['orange_potion', 'green_herb', 'blink_feather'];
NPC.scripts.lopt = async n => {
  const st = Story.st(), nm = `[${n.name}]`, wood = n.id === 'lopt_wood', P = id => Quest.passed(id);
  const LIE = L('<br><i>(วิเซอร์สีเหลืองอุ่นของเขากะพริบเขียวเสี้ยววินาที)</i>', '<br><i>(His warm yellow visor flickers green for a split second.)</i>');
  if (wood && P('ch4_lopt') && !st.loptWood) { // บทที่ 4: ปลายรอยไหม้ (เซฟเก่าที่ข้ามบท 4 ไปแล้วไม่ต้องดูฉากนี้)
    st.loptWood = 1;
    if (!P('hollow1')) {
      await UI.say(nm, L('อ้าว หน่วยใหม่ เดินตามรอยไหม้มาถึงนี่เลยรึ (แถบแสงของเขาโค้งขึ้น)<br>เอานี่ไป — Ash Filter ชิ้นนี้ข้าเก็บได้ตรงที่ไฟหยุดยืน ก่อนมันจะลงไปข้างล่าง', 'Well, if it isn\'t the new unit — followed the burn trail all the way here, did you? (His light-band curves upward.)<br>Here, take this — I picked up this Ash Filter right where the fire stopped, before it went down below.'));
      await UI.say(nm, L(`ไฟตัวนั้นชื่อ ${B('Kitsura')} ข้าเคยเห็นมันครั้งหนึ่ง... นานมาแล้ว${LIE}`, `That fire has a name — ${B('Kitsura')}. I saw it once... long ago.${LIE}`));
      await UI.say(nm, L('มันลงไปในโพรงของเฮลแล้ว ข้างล่างนั่นใบไม้ไปไม่ถึงนะ<br>ถ้าจะตามไป แข็งแรงกว่านี้อีกหน่อย — ข้าไม่อยากเสียลูกค้าประจำ', 'It has gone down into Hel\'s Hollow — where the leaves can\'t reach.<br>If you mean to follow it, get a little stronger first. I\'d hate to lose a regular customer.'));
      saveGame();
    }
  }
  let greet;
  if (P('hollow5')) greet = wood
    ? L('(แถบวิเซอร์ของเขาเป็นสีเขียวทั้งแถบ แต่น้ำเสียงยังอุ่นเหมือนเดิม)<br>เจ้ารู้แล้วว่าข้าเป็นใคร... ยังอยากซื้อยาอยู่ไหม', '(His visor-band glows solid green, but his voice is as warm as ever.)<br>You know who I am now... still want to buy potions?')
    : L('(วิเซอร์สีเหลืองอุ่น — ไม่กะพริบเลยสักครั้ง)<br>ยาราคาเท่าในเมืองเป๊ะ ครั้งนี้ข้าไม่โกหก', '(A warm yellow visor — not a single flicker.)<br>Potions at exactly the town price. This time, I\'m not lying.');
  else if (wood) greet = P('ch4_lopt')
    ? L(`ไฟยังไม่ดับหรอก มันแค่ลงไปข้างล่าง... ซื้อยาติดตัวไว้ ถูกกว่าในเมืองสามโวลต์${LIE}`, `The fire isn't out — it just went down below... Keep some potions on you. Three Volt cheaper than in town.${LIE}`)
    : L(`ทางลงโพรงอยู่ข้างหลังข้า ยังไม่ต้องรีบหรอก<br>ซื้อยาก่อนไหม ถูกกว่าในเมืองสามโวลต์${LIE}`, `The way down to the Hollow is right behind me — no need to rush.<br>Potions first? Three Volt cheaper than in town.${LIE}`);
  else greet = !P('mvp1')
    ? L(`ยาถูกกว่าในเมืองสามโวลต์ ไม่ต้องขอบคุณหรอก<br>ที่ราบข้างหน้ามีทูตบินวนอยู่ มันรอใครบางคนมาหลายปี — <i>อาจเป็นเจ้าก็ได้นะ</i>${LIE}`, `Potions three Volt cheaper than in town — no need to thank me.<br>There's an envoy circling the plains ahead. It has waited years for someone — <i>maybe it's you</i>.${LIE}`)
    : !P('ch4_lopt')
    ? L('ทูตส่งข้อความถึงมือแล้วสินะ... หมอกเงียบลงจนข้าเบื่อ<br>ได้ข่าวว่าป่าทางใต้มีอะไรร้อน ๆ เดินผ่าน — ข้าว่าจะไปตั้งแผงที่ปากป่าด้านใต้ดูสักหน่อย', 'So the envoy\'s message reached you... the mist has gone so quiet I\'m bored.<br>Word is something hot walked through the southern forest — I think I\'ll set up shop at its southern edge for a while.')
    : L(`อ้าว เจอกันอีกแล้ว ข้าเดินเร็วนะ — ทั้งที่นี่และที่ปากป่า<br>ยาถูกกว่าในเมืองสามโวลต์ เหมือนเดิม${LIE}`, `Well, we meet again — I get around, here and at the forest's edge alike.<br>Three Volt cheaper than town, same as always.${LIE}`);
  return shopNpc(n, 'lopt', greet);
};
NPC.scripts.lopt_wood = n => NPC.scripts.lopt(n); // ตัวเดียวกัน คนละที่ (id ต่างกันเพื่อให้เควสต์/นำทางชี้ถูกแผนที่)

// ภาพ: ไม่มีภาพเฉพาะตัว — ย้อมจากภาพเดิม (Art.alias) • Sigrún = ท่าเดิน Einherjar หญิง (หมวกเขา ดาบ โล่) ย้อมโทนเหล็กฟ้า
//   Lopt = ภาพ Tool Dealer (พ่อค้ากล่องเครื่องมือ วิเซอร์เหลือง) กลับด้าน + เคลือบม่วงหม่น • ภาพหน้าในกล่องคุย = ภาพเดียวกันแบบเต็มตัว
if (typeof Art !== 'undefined') {
  const SIG = { hue: 175, sat: 0.8, bri: 1.02 }, LOPT = { flip: true, sat: 0.8, tint: ['#5a3a7a', 0.22] };
  Art.alias('anim_npc_sigrun_walk', 'anim_einherjar_f_walk', SIG); // Anim.has('npc_sigrun') → Sprites.drawNpc วาดด้วยท่าเดิน (เฟรมยืน)
  Art.alias('npc_sigrun', 'job_einherjar_f', SIG);
  for (const id of ['lopt', 'lopt_wood']) { Art.alias(`npcsprite_${id}`, 'npcsprite_tool', LOPT); Art.alias(`npc_${id}`, 'npc_tool', LOPT); }
}
