// ข้อมูลส่วนเสริมที่ทั้ง tools/make_reference.js และ tools/reference_web/dump.js ใช้ร่วมกัน
// (Class 3 / Oath / Skill Rune / Hunt Rune / ไม้ตาย / Passive / Ancient / ท่าบอส / เควสต์เสริม / ตำนาน / ชิป)
// ฟังก์ชันนี้ถูกส่งเข้าไปรันในหน้าเกม (page.evaluate) → ห้ามอ้างตัวแปรนอกฟังก์ชัน • อ่านจากอ็อบเจกต์จริงในเกมเท่านั้น ไม่มีตัวเลขฝังในนี้
// ใช้ร่วมกับเบราว์เซอร์: launchOpts() — CHROME=/path/to/chrome ได้ (ไม่ตั้ง = /opt/pw-browsers/chromium ถ้ามี ไม่งั้นของ Playwright เอง)
// gameUrl() — เปิดหน้าเกมจากเซิร์ฟเวอร์ในตัว (หรือ BASE=<url>)
const fs = require('fs');

function launchOpts() {
  const o = { headless: true };
  if (process.env.CHROME) o.executablePath = process.env.CHROME;
  else if (fs.existsSync('/opt/pw-browsers/chromium')) o.executablePath = '/opt/pw-browsers/chromium';
  return o;
}

// หน้าเกมที่จะเปิด: BASE=<url> ถ้าตั้งไว้ ไม่งั้นเปิดเซิร์ฟเวอร์ไฟล์ในตัว (แบบ tests/smoke.js) จากโฟลเดอร์ repo
// (python -m http.server บน Windows ปฏิเสธการเชื่อมต่อเมื่อเกมขอภาพพร้อมกันเยอะ → ภาพหาย/หน้าแรกไม่ขึ้น)
// คืน { url, close() }
function gameUrl() {
  if (process.env.BASE) return Promise.resolve({ url: process.env.BASE, close() {} });
  const http = require('http'), path = require('path'), ROOT = path.join(__dirname, '..');
  const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.webmanifest': 'application/manifest+json' };
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    }).listen(0, '127.0.0.1', () => res({ url: `http://127.0.0.1:${srv.address().port}/index.html`, close: () => srv.close() }));
  });
}

function extract() {
  const has = n => { try { return typeof eval(n) !== 'undefined'; } catch (e) { return false; } }; // eslint-disable-line no-eval
  const strip = o => JSON.parse(JSON.stringify(o, (k, v) => typeof v === 'function' ? undefined : v));
  const txt = v => { try { return typeof v === 'function' ? v() : v; } catch (e) { return ''; } };
  const clean = s => String(txt(s) == null ? '' : txt(s)).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const out = {};

  // ---------- Skill Rune / Oath (Runes.TREE — รวม Class 1, 2, 3) ----------
  out.runeUnlock = Runes.UNLOCK;
  out.runes = [];
  for (const [skill, list] of Object.entries(Runes.TREE)) for (const r of list)
    out.runes.push({ id: r.id, skill, name: r.name, oath: r.oath || null, intent: r.intent || null, intentTh: Runes.INTENT[r.intent] ? Runes.INTENT[r.intent]() : '',
      short: clean(r.short || ''), desc: clean(r.desc), art: Runes.artKey(r.id) });

  // ---------- Class 3 ----------
  const C3 = has('Class3') ? Class3 : null;
  out.third = has('THIRD_JOBS') ? strip(THIRD_JOBS) : {};
  out.thirdReq = has('THIRD_JOB_REQ') ? strip(THIRD_JOB_REQ) : null;
  out.thirdQuest = null;
  if (out.thirdReq && has('QUESTS')) { const q = QUESTS.find(x => x.id === out.thirdReq.quest); if (q) out.thirdQuest = { id: q.id, title: q.title, ch: q.ch || null }; }
  out.trials = {};
  if (C3 && C3.TRIAL) for (const [job, t] of Object.entries(C3.TRIAL))
    out.trials[job] = { who: t.who, place: t.place, map: t.map, thought: clean(t.thought), how: C3.howText ? clean(C3.howText(job)) : '' };

  // ---------- ไม้ตาย (Feel.ULTS — กลาง 3 แบบ + ตัวที่ผูก Class 3) ----------
  out.ults = has('Feel') && Feel.ULTS ? Object.entries(Feel.ULTS).map(([k, u]) => ({ key: k, job: u.job || null, name: u.name, th: clean(u.th), desc: clean(u.desc) })) : [];

  // ---------- Hunt Rune ----------
  if (has('HuntRunes')) out.hunt = { unlock: strip(HuntRunes.UNLOCK), cap: HuntRunes.CAP, kinds: strip(HuntRunes.KINDS),
    list: HuntRunes.LIST.map(d => ({ id: d.id, kind: d.kind, name: d.name, short: d.short || '', desc: d.desc || '', price: d.price, rarity: d.rarity, race: d.race || null, elem: d.elem || null, pct: d.pct || null, arena: !!d.arena })) };

  // ---------- Passive (เพดานรวม + Notable + Keystone ทุกแฉก) ----------
  if (has('PSECT')) {
    const bTxt = b => Object.entries(b || {}).map(([k, v]) => PSTAT_FMT(k, v)).join(', ');
    const fxTxt = f => Object.entries(f || {}).map(([k, v]) => PFX[k] ? PFX[k].th(v) : k).join(' • ');
    out.passive = { cap: strip(PCAP), capFx: strip(PCAP_FX), capLabel: Object.fromEntries(Object.keys(PCAP).map(k => [k, clean(PSTAT[k] || k)])), ver: PASSIVE_VER,
      sects: PSECT.map(s => ({ job: s.job, name: s.name, th: clean(s.th), tag: clean(s.tag), main: s.main,
        notables: s.notables.map(([n, b, fx]) => ({ name: n, b: bTxt(b), fx: fxTxt(fx) })),
        key: { name: s.key[0], b: bTxt(s.key[1]), kind: s.key[2], fx: fxTxt(s.key[3]) } })) };
  }

  // ---------- World Boss (Ancient) ต่อบอส ----------
  out.wbTune = has('WB') && WB.TUNE ? strip(WB.TUNE) : {};

  // ---------- ท่าบอส + ลูกสมุน (BossKit.KITS) ----------
  out.bossKits = {};
  if (has('BossKit') && BossKit.KITS) {
    const bs = has('BOSS_SKILLS') ? BOSS_SKILLS : {};
    const move = k => {
      const src = bs[k] ? String(bs[k]) : '', m = src.match(/cue\(\s*m\s*,\s*'([^']+)'/), h = src.match(/say\(\s*m\s*,\s*L\(\s*`([^`]+)`/);
      return { key: k, name: m ? m[1] : k.replace(/^./, c => c.toUpperCase()), hint: h ? h[1].replace(/\$\{[^}]+\}/g, '').replace(/^\s*/, '').trim() : '' };
    };
    for (const [id, k] of Object.entries(BossKit.KITS))
      out.bossKits[id] = { rot: (k.rot || []).map(move), wbRot: (k.wbRot || []).map(move), ult: k.ult ? move(k.ult) : null,
        minions: (k.minions || []).map(x => MOBS[x] ? MOBS[x].name : x), elite: k.elite && MOBS[k.elite + '_e'] ? MOBS[k.elite + '_e'].name : null };
  }

  // ---------- ชิป / Elite / เงินจากมอน ----------
  out.chip = { drop: has('CHIP_DROP') ? CHIP_DROP : null, boss: has('CHIP_DROP_BOSS') ? CHIP_DROP_BOSS : null };
  out.elites = Object.values(MOBS).filter(m => m.elite && /^elite_/.test(m.id)).map(m => ({ id: m.id, name: m.name, lv: m.lv, hp: m.hp, exp: m.exp, drops: m.drops || [] }));

  // ---------- เควสต์เสริม + จุดตำนาน + NPC ใหม่ ----------
  if (has('Side')) out.side = Side.all().map(q => ({ id: q.id, title: clean(q.title), giver: Side.npcName(q.giver), offer: clean(q.offer).slice(0, 160),
    steps: (q.steps || []).map(st => ({ type: st.type, n: st.n || null, mob: st.mob ? (MOBS[st.mob] ? MOBS[st.mob].name : st.mob) : null, item: st.item ? (ITEMS[st.item] ? ITEMS[st.item].name : st.item) : null, to: st.to ? Side.npcName(st.to) : null, map: st.map || null })),
    reward: strip(q.reward || null) }));
  if (has('WorldPack') && WorldPack.LORE) out.lore = WorldPack.LORE.map(l => ({ id: l.id, map: l.map, name: l.name, title: clean(l.title) }));
  if (has('WorldPack') && WorldPack.NEW_NPCS) out.newNpcs = WorldPack.NEW_NPCS.map(e => ({ id: e.npc.id, name: e.npc.name, map: e.map }));

  // ---------- กลไกต่อสู้ / ธาตุ / เงิน / การควบคุม ----------
  out.flinch = has('FLINCH') ? strip(FLINCH) : null;
  out.mobFlinch = has('MOB_FLINCH') ? strip(MOB_FLINCH) : null;
  if (has('lvChanceMul')) out.lvChance = { perLv: Math.round((1 - lvChanceMul(10, 11)) * 100), floor: lvChanceMul(1, 99) };
  out.elemTable = has('ELEM_TABLE') ? strip(ELEM_TABLE) : {};
  out.zeny = has('mobZeny') ? Object.fromEntries(Object.values(MOBS).filter(m => !m.dummy).map(m => [m.id, mobZeny(m)])) : {};
  out.windows = [...document.querySelectorAll('#menubar [data-win]')].map(b => { const w = document.getElementById(b.dataset.win), t = w && w.querySelector('.win-title');
    return { id: b.dataset.win, label: (b.querySelector('span') || b).textContent.trim(), key: (b.querySelector('small') || {}).textContent || '', title: t ? t.textContent.trim() : '' }; });
  out.help = [...document.querySelectorAll('#w-help .win-body h4')].map(h4 => ({ title: h4.textContent.trim(),
    items: [...(h4.nextElementSibling ? h4.nextElementSibling.querySelectorAll('li') : [])].map(li => li.textContent.replace(/\s+/g, ' ').trim()) }));
  return out;
}

// จุดสังเกต/บรรยากาศของแต่ละแมพ (ข้อความเขียนมือ — ภาพ 3D ใน assets/bake_* และ js/ambient.js ไม่มีข้อมูลบรรยายในเกม)
// แก้ที่นี่ที่เดียว → GAME_REFERENCE หัวข้อแผนที่ + การ์ดแผนที่ใน Codex • ภาพจริงดูแท็บ "ภาพเกม" (tools/reference_web/shots.js)
const LANDMARKS = {
  eldheim: 'พื้นหินอ่อน 3D ร่องทอง + เส้นแสงฟ้า คลองลึก สะพานโค้ง ขั้นบันไดลงน้ำ • น้ำพุคริสตัล 3D น้ำไหล • แท่น Bifrost + เสาคริสตัล 7 สี • Norn\'s Wheel วงล้อรูน 12 ช่อง (หมุนเร็วตอนหมุนกาชา) • อาคาร 3D: หอคอย CENTRAL CORE + ร้าน SUPPLY / ARMORY / PLATING / FORGE • ชาวเมืองแอนดรอยด์เดินเล่น นกพิราบ ควันปล่องไฟ ละอองน้ำพุ',
  meadow: 'ลายพื้นแบบภาพวาด ดงโคลเวอร์/ดอกไม้ • ถนนหินอ่อน + เสาไฟต่อจากประตูเมือง • ผีเสื้อ แมลงปอ นกกระจอก ฝูงนกนางนวล ใบไม้ร่วง • ขอบเปิดเดินข้ามไป Mistlake ได้ทุกจุด',
  mistlake: 'บ่อน้ำหลายบ่อ + ซากโบราณ 3D ในน้ำลึก (ซุ้มโค้งหัก เสาสลักรูน ศิลารูนเรือง) พร้อมเงาสะท้อน • ปลากระโดด เป็ดแม่ลูก • แสงเย็นชมพูส้มจากขวา',
  wolfwood: 'ป่ากลางคืนแสงจันทร์ เห็ด/ตะเกียง/คริสตัลเป็นแหล่งแสง • ต้นหมาป่าเก่า (ต้นไม้ยักษ์ 3D ริมลานโล่งกลางแมพ โทเท็มหัวหมาป่าตาเรือง ผ้าและป้ายรูนผูกกิ่ง) • สันหิน + ซุ้มปากถ้ำ 3D ขอบใต้ • ผีเสื้อกลางคืน ตานกฮูก ค้างคาว',
  helcave: 'ผนังหน้าผาหิน 3D ทั้งแมพ • บัลลังก์ Hel + แท่นออบซิเดียน 3 ขั้น + ชั้นวางประกาย 5 ตู้ • ปากทางแสงแดดประตูเหนือ (บันไดหินแตก มอส ใบไม้ปลิว) • น้ำหยด ค้างคาว ประกายคริสตัล',
  archive: 'หินโทนน้ำเงินเย็น ตราผนึกรูนทองบนพื้น • ชั้นวางสลักผนัง 15 ช่อง • ประตูห้องนิรภัยวงกลม 2 บาน • ตู้ตั้งอิสระ 4 ตู้กลางห้องโถง • อักษรรูนลอย',
  roots: 'โทนสนิมส้มแดง • รากยักษ์โค้งข้ามทาง 6 จุด (จางเมื่อเดินลอด) • ประตูรากของ Garmr ฝั่งตะวันออก — MVP Garmr เดินออกจากประตูนี้เสมอ และเป็นทางลง Nidhogg\'s Hollow • เศษดินร่วง',
  abyss: 'บทที่ 7 (Lv 58–70) ลงทางประตูรากของ Garmr • เถ้า ถ่านไฟ ฟองพิษ',
  arena: 'โคลอสเซียม v2: พื้นทรายมีรอยเท้า/รอยดาบ เหรียญหินอ่อนตราวาลค์นัตกลางลาน • อัฒจันทร์ 5 ชั้น ผู้ชม ~650 คนขยับตามความตื่นเต้น (คลื่นเชียร์) • กำแพงซุ้มโค้ง ฝั่งใต้เป็นซากพัง • คบเพลิง 11 ต้น',
};
const GATES = 'ทุกประตูวาร์ปเป็นซุ้ม 3D ตามวัสดุแมพ (เมือง = หินอ่อนขาวขอบทอง • ทุ่ง/ป่า = หินมอสลายถักนอร์ส • ถ้ำ = บะซอลต์ฝังคริสตัลม่วง) มีป้ายปลายทางเหนือซุ้ม • เดินเข้า = ม่านแสงดูด + แฟลช ถึงปลายทาง = วงแสงกระจาย';

module.exports = { extract, launchOpts, gameUrl, LANDMARKS, GATES };
