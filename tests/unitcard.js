'use strict';
// ============================================================
//  ทดสอบการ์ดรายละเอียดยูนิต (js/unitcard.js) ด้วย Playwright:
//  คอม: คลิกขวามอน = การ์ดข้อมูลถูกต้อง (HP สด/ดรอป/ธาตุ/Hunt Rune/ชิป) • สกิลรอเล็ง = คลิกขวายกเลิกสกิลเหมือนเดิม
//       • คลิกขวาพื้นว่าง = ไม่มีอะไร • Esc / คลิกนอก / มอนตาย = ปิด • NPC (ปุ่มคุย) • ผู้เล่นอื่น + ตัวแทน PvP • ตัวเรา = Status
//       • คลิกขวาปุ่ม AUTO ยังเปิดตั้งค่าบอท • สมุดมอนสเตอร์มี Hunt Rune
//  มือถือ: แตะค้าง 0.5 วิ = การ์ด (แผ่นล่างจอ) ไม่เดิน/ไม่ตี • แตะสั้นที่มอน = ตีเหมือนเดิม
//  รัน:  NODE_PATH=$(npm root -g) node tests/unitcard.js   (เปิดเซิร์ฟเวอร์เอง) • SHOTS=<โฟลเดอร์> = เก็บภาพหน้าจอ
// ============================================================
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SHOTS = process.env.SHOTS || '';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png' };
function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    }).listen(0, () => res(srv));
  });
}
async function start(browser, port, vp, mobile) {
  const ctx = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  const p = await ctx.newPage();
  p._ctx = ctx; p._errors = [];
  p.on('pageerror', e => p._errors.push(e.message));
  await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(1200);
  await p.click('#au-offline'); await p.click('#btn-new'); await p.fill('#cr-name', 'Inspector'); await p.click('#cr-start'); await p.waitForTimeout(1500);
  await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {});
  await p.waitForFunction(() => { const b = document.querySelector('#prologue-skip'); if (b && b.offsetParent) b.click(); return !b || !b.offsetParent; }, null, { timeout: 8000, polling: 250 }).catch(() => {});
  await p.waitForTimeout(500);
  await p.evaluate(() => {
    document.querySelectorAll('.win:not(.hidden)').forEach(w => w.classList.add('hidden'));
    Bot.toggle(false);
    // ตัวช่วย: ตำแหน่งบนจอของยูนิต / วางมอนนิ่ง ๆ ข้างตัว
    window.UCT = {
      at(x, y, up = 16) { const r = R.cv.getBoundingClientRect(); return { x: r.left + (x * TILE - R.camX) * R.zoom, y: r.top + (y * TILE * R.K - up - R.camY) * R.zoom }; },
      mob(m) { return this.at(m.x, m.y, 16 * ((m.def.scale || 1) * (m.def.size || 1))); },
      put(id, dx, dy, o = {}) {
        const pl = G.player, m = spawnMob(id, { x: Math.floor(pl.x) + dx, y: Math.floor(pl.y) + dy });
        m.stunUntil = 1e9; m.nextWander = 1e9; Object.assign(m, o); return m;
      },
      card() { const c = document.querySelector('#unit-card'); return c && !c.hidden ? c : null; },
      clean() { G.mobs = G.mobs.filter(m => m.def.dummy); G.respawns = []; UnitCard.close(); G.pendingSkill = null; const p = G.player; p.target = null; p.path = []; p.npcTarget = null; },
    };
  });
  return p;
}
const shot = async (p, name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, name + '.png') }); } };
const frames = (p, n = 4) => p.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);

(async () => {
  const srv = await serve();
  const opts = { headless: true };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME;
  else if (fs.existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(opts);
  const port = srv.address().port;
  const out = [];
  const ok = (name, cond, info = '') => out.push([name, !!cond, typeof info === 'string' ? info : JSON.stringify(info)]);

  // ======================= คอม =======================
  const p = await start(browser, port, { width: 1100, height: 720 }, false);
  await p.evaluate(async () => { G.player.baseLv = 20; recalc(); changeMap('meadow', 30.5, 30.5); await new Promise(r => setTimeout(r, 300)); UCT.clean(); });
  await p.waitForTimeout(400);
  const rclick = async xy => { await p.mouse.move(xy.x, xy.y); await frames(p, 2); await p.mouse.click(xy.x, xy.y, { button: 'right' }); await p.waitForTimeout(150); };

  // 1) คลิกขวามอน = การ์ดข้อมูล
  await p.evaluate(() => { window._m = UCT.put('pudding', 2, -1); G.player.kills = { pudding: 7 }; G.player.hrunesOwn = ['hr_slay_plant']; });
  await frames(p, 4);
  await rclick(await p.evaluate(() => UCT.mob(_m)));
  const c1 = await p.evaluate(() => {
    const c = UCT.card(); if (!c) return null;
    const q = s => c.querySelector(s), qa = s => [...c.querySelectorAll(s)];
    return { kind: c.dataset.kind, id: c.dataset.id, name: q('.uc-name b').textContent, lv: q('.uc-lv').textContent, lvCol: q('.uc-lv').style.color,
      want: R.lvColor(1, G.player.baseLv), hp: q('.uc-hp em').textContent, drops: qa('.uc-drop').map(e => e.dataset.item), want2: MOBS.pudding.drops.map(d => d[0]),
      weak: qa('.uc-ech.weak').map(e => e.dataset.el + e.textContent), hr: qa('.uc-hr').map(e => e.dataset.hr + (e.classList.contains('own') ? '+own' : '')),
      chip: q('.uc-chip') && q('.uc-chip').textContent, grid: q('.uc-grid').textContent, aggro: q('.uc-aggro').className,
      target: !!G.player.target, path: G.player.path.length, sheet: c.classList.contains('uc-sheet'), r: c.getBoundingClientRect().toJSON() };
  });
  ok('right-click a monster opens the card', c1 && c1.kind === 'mob' && c1.id === 'pudding', c1);
  ok('card: name + Lv colored with R.lvColor', c1 && c1.name === 'Gel Unit' && c1.lv === 'Lv 1' && c1.lvCol && c1.lvCol.length > 0, c1 && [c1.name, c1.lv, c1.lvCol, c1.want]);
  ok('card: HP numbers, ATK/DEF/MDEF, passive', c1 && c1.hp === '50 / 50' && /ATK7–10/.test(c1.grid) && /DEF0/.test(c1.grid) && /MDEF5/.test(c1.grid) && /ok/.test(c1.aggro), c1 && [c1.hp, c1.grid]);
  ok('card: drop list = MOBS drops (with icons)', c1 && JSON.stringify(c1.drops) === JSON.stringify(c1.want2), c1 && c1.drops);
  ok('card: element weakness from ELEM_TABLE (water → weak to wind ×1.5)', c1 && c1.weak.length === 1 && /^wind.*×1\.5/.test(c1.weak[0]), c1 && c1.weak);
  ok('card: Hunt Rune hints (Mech Plant Slayer owned ✓, Wind Endow)', c1 && c1.hr.includes('hr_slay_plant+own') && c1.hr.includes('hr_endow_wind') && !c1.hr.some(x => /hr_giant/.test(x)), c1 && c1.hr);
  ok('card: chip shows % drop chance', c1 && /0\.20%/.test(c1.chip), c1 && c1.chip);
  ok('right-click does not attack or walk', c1 && !c1.target && c1.path === 0);
  ok('desktop: floating card on screen (not a bottom sheet)', c1 && !c1.sheet && c1.r.left >= 0 && c1.r.top >= 0 && c1.r.right <= 1100 && c1.r.bottom <= 720, c1 && c1.r);
  await shot(p, 'desktop_mob');
  await p.evaluate(() => { _m.hp = 20; });
  await p.waitForTimeout(350);
  ok('HP bar updates live', await p.evaluate(() => UCT.card() && UCT.card().querySelector('.uc-hp em').textContent === '20 / 50'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  ok('Esc closes the card', await p.evaluate(() => !UCT.card()));

  // 2) สกิลรอเล็ง: คลิกขวายังยกเลิกสกิล (ไม่เปิดการ์ด)
  await p.evaluate(() => { G.pendingSkill = Object.keys(SKILLS)[0]; });
  await rclick(await p.evaluate(() => UCT.mob(_m)));
  ok('pending skill: right-click still cancels it (and no card)', await p.evaluate(() => G.pendingSkill === null && !UCT.card()));

  // 3) พื้นว่าง / คลิกนอก / มอนตาย
  await rclick(await p.evaluate(() => UCT.at(G.player.x - 4, G.player.y + 3, 0)));
  ok('right-click on empty ground does nothing', await p.evaluate(() => !UCT.card() && !G.player.target));
  await rclick(await p.evaluate(() => UCT.mob(_m)));
  const outside = await p.evaluate(() => UCT.at(G.player.x - 4, G.player.y + 3, 0));
  await p.mouse.click(outside.x, outside.y); await p.waitForTimeout(120);
  ok('click outside closes the card', await p.evaluate(() => !UCT.card()));
  await rclick(await p.evaluate(() => UCT.mob(_m)));
  await p.evaluate(() => { _m.dead = true; });
  await p.waitForTimeout(300);
  ok('card closes when the unit dies', await p.evaluate(() => !UCT.card()));

  // 4) บอส MVP / Ancient
  await p.evaluate(() => { UCT.clean(); window._b = UCT.put('seraph_pudding', 3, -1, { isMvp: true }); _b.hp = 3100; });
  await frames(p, 4);
  await rclick(await p.evaluate(() => UCT.mob(_b)));
  const cb = await p.evaluate(() => { const c = UCT.card(); return c && { tok: typeof Gacha !== 'undefined' ? Gacha.TOKEN : null, tags: [...c.querySelectorAll('.uc-tag')].map(e => e.textContent), hr: [...c.querySelectorAll('.uc-hr')].map(e => e.dataset.hr), drops: [...c.querySelectorAll('.uc-drop')].map(e => e.dataset.item), hp: c.querySelector('.uc-hp em').textContent, n: MOBS.seraph_pudding.drops.length }; });
  ok('boss card: MVP tag, Giant Slayer + Angel Slayer hints, HP', cb && cb.tags.includes('MVP') && cb.hr.includes('hr_giant') && cb.hr.includes('hr_slay_angel') && /3,?100 \/ 5,?500/.test(cb.hp), cb);
  ok('boss card: MVP token listed first, then every MOBS drop', cb && (!cb.tok || cb.drops[0] === cb.tok) && cb.drops.length === cb.n + (cb.tok ? 1 : 0), cb && cb.drops);
  await shot(p, 'desktop_boss');
  await p.keyboard.press('Escape');
  await p.evaluate(() => { UCT.clean(); window._w = UCT.put('wb_seraph_pudding', 3, -1, { isWB: true }); });
  await frames(p, 4);
  await rclick(await p.evaluate(() => UCT.mob(_w)));
  ok('Ancient card: ANCIENT tag', await p.evaluate(() => { const c = UCT.card(); return !!c && [...c.querySelectorAll('.uc-tag')].some(e => e.textContent === 'ANCIENT'); }));
  await shot(p, 'desktop_ancient');
  // ปุ่ม Attack = ตั้งเป้าเหมือนคลิกซ้าย
  await p.click('#unit-card [data-act="attack"]'); await p.waitForTimeout(100);
  ok('Attack button targets the monster (same as left-click)', await p.evaluate(() => G.player.target === _w && !UCT.card()));
  await p.evaluate(() => { G.player.target = null; UCT.clean(); });

  // 5) สมุดมอนสเตอร์มี Hunt Rune / ต้านธาตุ
  await p.evaluate(() => UI.showMob('seraph_pudding')); await p.waitForTimeout(150);
  ok('Monster Book (#w-mob) shows Hunt Rune hints', await p.evaluate(() => !!document.querySelector('#w-mob .uc-mbx .uc-hr[data-hr="hr_giant"]')));
  await p.evaluate(() => UI.close('w-mob'));

  // 6) ผู้เล่นอื่น (ออนไลน์) — ใส่ข้อมูลแบบเดียวกับที่ Online.onPos สร้าง
  await p.evaluate(() => {
    const pl = G.player, x = pl.x + 2.5, y = pl.y + 0.2;
    window._o = { id: 'u_freya', name: 'Freya', job: 'valkyrie', baseLv: 42, hair: '#e0b050', gender: 'f', look: null, x, y, tx: x, ty: y, facing: -1, dir: 3, moving: false, sitting: false, dead: false, stealth: false, bot: false,
      equip: { weapon: { id: 'valhalla_blade' }, head: { id: 'iron_helm' }, garment: null }, atkAnim: 0, speech: null, buffs: {}, seen: performance.now() + 1e9 };
    Online.others.set(_o.id, _o);
  });
  await frames(p, 4);
  await rclick(await p.evaluate(() => UCT.at(_o.x, _o.y, 24)));
  const co = await p.evaluate(() => { const c = UCT.card(); return c && { kind: c.dataset.kind, id: c.dataset.id, text: c.textContent, eq: [...c.querySelectorAll('.uc-eqr')].map(e => e.dataset.item), acts: [...c.querySelectorAll('[data-act]')].map(b => b.dataset.act) }; });
  ok('right-click another player opens the player card', co && co.kind === 'player' && co.id === 'u_freya' && /Freya/.test(co.text), co);
  ok('player card: Class 2 with its Class 1, Lv, party line', co && /Einherjar → Valkyrie Knight/.test(co.text) && /Lv 42/.test(co.text) && /Class 2/.test(co.text), co && co.text);
  ok('player card: visible equipment from the network payload', co && JSON.stringify(co.eq) === '["valhalla_blade","iron_helm"]', co && co.eq);
  ok('player card: Invite / Trade / Emote buttons', co && ['invite', 'trade', 'emote'].every(a => co.acts.includes(a)), co && co.acts);
  await shot(p, 'desktop_player');
  await p.evaluate(() => Online.others.delete('u_freya')); await p.waitForTimeout(300);
  ok('card closes when the player leaves', await p.evaluate(() => !UCT.card()));
  await p.evaluate(() => { _o.equip = { weapon: null, head: null, garment: null }; Online.others.set(_o.id, _o); });
  await rclick(await p.evaluate(() => UCT.at(_o.x, _o.y, 24)));
  ok('player with nothing visible: shows the Class weapon', await p.evaluate(() => { const c = UCT.card(); const w = Paperdoll.classWeapon('valkyrie'); return !!c && !!w && [...c.querySelectorAll('.uc-eqr')].map(e => e.dataset.item).join() === w.id; }));
  await p.keyboard.press('Escape');
  await p.evaluate(() => Online.others.delete('u_freya'));

  // 7) ตัวเรา = Status • ปุ่ม AUTO คลิกขวา = ตั้งค่าบอท
  await rclick(await p.evaluate(() => UCT.at(G.player.x, G.player.y, 24)));
  ok('right-click yourself opens the Status window', await p.evaluate(() => UI.isOpen('w-status') && !UCT.card()));
  await p.evaluate(() => UI.close('w-status'));
  await p.click('#auto-btn', { button: 'right' }); await p.waitForTimeout(150);
  ok('AUTO button right-click still opens bot settings (UI.altPress)', await p.evaluate(() => UI.isOpen('w-bot') && !Bot.on));
  await p.evaluate(() => UI.close('w-bot'));

  // 8) NPC (เมือง)
  await p.evaluate(async () => { const n = MAP_DEFS.eldheim.npcs.find(n => n.id === 'refine'); changeMap('eldheim', n.x + 0.5, n.y + 2.5); await new Promise(r => setTimeout(r, 300)); UCT.clean(); });
  await p.waitForTimeout(400);
  const np = await p.evaluate(() => { const n = G.npcs.find(n => n.id === 'refine'); return UCT.at(n.x + 0.5, n.y + 0.5 + 10 / TILE, 24); });
  await rclick(np);
  const cn = await p.evaluate(() => { const c = UCT.card(); return c && { kind: c.dataset.kind, id: c.dataset.id, text: c.textContent }; });
  ok('right-click an NPC: name, role, Talk button', cn && cn.kind === 'npc' && cn.id === 'refine' && /Brokk/.test(cn.text), cn);
  await shot(p, 'desktop_npc');
  await p.evaluate(() => { window._talk = null; const t0 = NPC.talk.bind(NPC); NPC.talk = n => { window._talk = n.id; return t0(n); }; });
  await p.click('#unit-card [data-act="talk"]'); await p.waitForTimeout(100);
  ok('Talk button walks to the NPC to talk (same as left-click)', await p.evaluate(() => ((G.player.npcTarget && G.player.npcTarget.id === 'refine') || _talk === 'refine') && !UCT.card()), await p.evaluate(() => [!!G.player.npcTarget, _talk]));
  await p.evaluate(() => { G.player.npcTarget = null; UI.close('w-dialog'); UI.close('w-forge'); });

  // 9) ลานประลอง: ตัวแทนผู้เล่นใน G.mobs (isPlayer)
  await p.evaluate(async () => { changeMap('arena', 17, 17); await new Promise(r => setTimeout(r, 300)); UCT.clean();
    const x = G.player.x + 2.5, y = G.player.y;
    window._o2 = { id: 'u_bjorn', name: 'Bjorn', job: 'berserker', baseLv: 38, gender: 'm', hair: '#3a3f4c', look: null, x, y, tx: x, ty: y, facing: -1, dir: 3, moving: false, sitting: false, dead: false, stealth: false,
      equip: { weapon: { id: 'hand_axe' }, head: null, garment: null }, atkAnim: 0, speech: null, buffs: {}, seen: performance.now() + 1e9, hp: 900, maxHp: 1400, pv: [20, 10, 30, 20, 38] };
    Online.others.set(_o2.id, _o2);
    window._pm = { uid: G.uid++, isPlayer: true, ref: _o2, state: 'idle', path: [], facing: 1, hitFlash: 0, atkAnim: 0, nextAtk: 0, x, y, hp: 900, maxHp: 1400, dead: false,
      def: { id: 'pvp_u_bjorn', name: 'Bjorn', lv: 38, def: 20, mdef: 10, flee: 30, vit: 20, element: 'neutral', race: 'human', scale: 1, exp: 0, jexp: 0, drops: [] } };
    G.mobs.push(_pm); G.player.hrunesOwn = ['hr_slay_human']; });
  await frames(p, 4);
  await rclick(await p.evaluate(() => UCT.mob(_pm)));
  const cp = await p.evaluate(() => { const c = UCT.card(); return c && { kind: c.dataset.kind, hp: c.querySelector('.uc-hp em') && c.querySelector('.uc-hp em').textContent, tags: [...c.querySelectorAll('.uc-tag')].map(e => e.textContent), hr: [...c.querySelectorAll('.uc-hr')].map(e => e.dataset.hr), acts: [...c.querySelectorAll('[data-act]')].map(b => b.dataset.act) }; });
  ok('PvP stand-in: player card with HP bar, PvP tag, Human Slayer hint, Attack', cp && cp.kind === 'player' && /900 \/ 1,?400/.test(cp.hp) && cp.tags.includes('PvP') && cp.hr.includes('hr_slay_human') && cp.acts.includes('attack'), cp);
  await shot(p, 'desktop_pvp');
  await p.keyboard.press('Escape');
  ok('desktop: no page errors', !p._errors.length, p._errors.slice(0, 4));
  await p._ctx.close();

  // ======================= มือถือ =======================
  const m = await start(browser, port, { width: 390, height: 844 }, true);
  const cdp = await m._ctx.newCDPSession(m);
  const touch = async (xy, ms) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: xy.x, y: xy.y }] });
    await m.waitForTimeout(ms);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await m.waitForTimeout(120);
  };
  const press = async (xy, ms) => { // ค้างไว้ เช็กระหว่างยังไม่ยกนิ้ว
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: xy.x, y: xy.y }] });
    await m.waitForTimeout(ms);
  };
  const lift = async () => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await m.waitForTimeout(120); };
  await m.evaluate(async () => { G.player.baseLv = 20; recalc(); changeMap('meadow', 30.5, 30.5); await new Promise(r => setTimeout(r, 300)); UCT.clean(); window._m = UCT.put('pudding', 2, 1); });
  await m.waitForTimeout(400); await frames(m, 4);
  const mxy = await m.evaluate(() => UCT.mob(_m));
  await press(mxy, 750);
  const lp = await m.evaluate(() => { const c = UCT.card(); return { open: !!c, kind: c && c.dataset.kind, sheet: !!c && c.classList.contains('uc-sheet'), target: !!G.player.target, path: G.player.path.length, r: c && { bottom: c.offsetTop + c.offsetHeight, width: c.offsetWidth, vh: innerHeight } }; });
  await lift();
  ok('phone: long-press a monster opens the card', lp.open && lp.kind === 'mob', lp);
  ok('phone: long-press does not attack or walk', !lp.target && lp.path === 0 && await m.evaluate(() => !G.player.target && !G.player.path.length), lp);
  ok('phone: card is a bottom sheet (full width, touching the bottom edge)', lp.sheet && lp.r && Math.abs(lp.r.bottom - lp.r.vh) < 2 && lp.r.width === 390, lp.r);
  ok('phone: card stays open after lifting the finger', await m.evaluate(() => !!UCT.card()));
  await shot(m, 'phone_mob');
  await m.keyboard.press('Escape'); await m.waitForTimeout(100);
  ok('phone: Esc closes the card', await m.evaluate(() => !UCT.card()));
  await touch(mxy, 60);
  ok('phone: short tap on a monster still attacks', await m.evaluate(() => G.player.target === _m && !UCT.card()));
  await m.evaluate(() => { G.player.target = null; UCT.clean(); window._b = UCT.put('seraph_pudding', 2, 1, { isMvp: true }); });
  await frames(m, 4);
  await touch(await m.evaluate(() => UCT.mob(_b)), 750);
  ok('phone: boss card', await m.evaluate(() => { const c = UCT.card(); return !!c && [...c.querySelectorAll('.uc-tag')].some(e => e.textContent === 'MVP'); }));
  await shot(m, 'phone_boss');
  await m.evaluate(() => { UnitCard.close(); UCT.clean(); });
  // NPC
  await m.evaluate(async () => { const n = MAP_DEFS.eldheim.npcs.find(n => n.id === 'nurse'); changeMap('eldheim', n.x - 1.5, n.y + 1.5); await new Promise(r => setTimeout(r, 300)); UCT.clean(); });
  await m.waitForTimeout(400); await frames(m, 4);
  await touch(await m.evaluate(() => { const n = G.npcs.find(n => n.id === 'nurse'); return UCT.at(n.x + 0.5, n.y + 0.5 + 10 / TILE, 24); }), 750);
  ok('phone: long-press an NPC opens its card without walking', await m.evaluate(() => { const c = UCT.card(); return !!c && c.dataset.id === 'nurse' && !G.player.npcTarget; }));
  await shot(m, 'phone_npc');
  await m.evaluate(() => UnitCard.close());
  // PvP
  await m.evaluate(async () => { changeMap('arena', 17, 17); await new Promise(r => setTimeout(r, 300)); UCT.clean();
    const x = G.player.x + 2, y = G.player.y + 1;
    const o = { id: 'u_bjorn', name: 'Bjorn', job: 'berserker', baseLv: 38, gender: 'm', hair: '#3a3f4c', look: null, x, y, tx: x, ty: y, facing: -1, dir: 3, moving: false, sitting: false, dead: false, stealth: false,
      equip: { weapon: { id: 'hand_axe' }, head: null, garment: null }, atkAnim: 0, speech: null, buffs: {}, seen: performance.now() + 1e9, hp: 900, maxHp: 1400, pv: [20, 10, 30, 20, 38] };
    Online.others.set(o.id, o);
    window._pm = { uid: G.uid++, isPlayer: true, ref: o, state: 'idle', path: [], facing: 1, hitFlash: 0, atkAnim: 0, nextAtk: 0, x, y, hp: 900, maxHp: 1400, dead: false,
      def: { id: 'pvp_u_bjorn', name: 'Bjorn', lv: 38, def: 20, mdef: 10, flee: 30, vit: 20, element: 'neutral', race: 'human', scale: 1, exp: 0, jexp: 0, drops: [] } };
    G.mobs.push(_pm); });
  await frames(m, 4);
  await touch(await m.evaluate(() => UCT.mob(_pm)), 750);
  ok('phone: long-press a PvP player opens the player card', await m.evaluate(() => { const c = UCT.card(); return !!c && c.dataset.kind === 'player' && !G.player.target; }));
  await shot(m, 'phone_pvp');
  ok('phone: no page errors', !m._errors.length, m._errors.slice(0, 4));

  await browser.close(); srv.close();
  let fail = 0;
  for (const [n, pass, info] of out) { if (!pass) fail++; console.log(`${pass ? '✔' : '✘'} ${n}${!pass && info ? `  — ${info}` : ''}`); }
  console.log(fail ? `\n${fail} FAILED` : `\nALL ${out.length} PASSED`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
