'use strict';
// ============================================================
//  Class 3 รอบ 3 (2026-10-09): Heimdall Warden (← Valkyrie Knight) + Jarl Warbringer (← Hersir Vanguard)
//  ตามแบบ docs/CLASS3_DESIGN.md §3.1 / §3.2 — สาย Einherjar ครบคู่ • โครงเดียวกับ js/class3_wave2.js (โหลดต่อจากไฟล์นั้น)
//  ทำให้ง่ายลงจากแบบ (บันทึกไว้):
//   • Oath of the Bridge "20% ของดาเมจที่เพื่อนรับโอนมาหาเรา" — ตอนนี้เพื่อน = ผู้ช่วยในเกม (G.allies) เท่านั้น
//     (ปาร์ตี้ออนไลน์ยังส่งดาเมจข้ามเครื่องไม่ได้) จึงเพิ่มผลเล่นเดี่ยว: เรารับดาเมจ −10%
//   • Gjallar Call / Raven Banner บัฟตัวเราเท่านั้น (ยังไม่ส่งผ่านช่องปาร์ตี้)
//   • Shieldwall Breaker "ลด DEF ศัตรู −20%" → ศัตรูรับดาเมจกายภาพจากเรา +12% 6 วิ (ผลเท่ากันโดยประมาณ ไม่แตะสูตร DEF)
//   • Gram Rend "จังหวะสองคริแน่นอนถ้าเป้ามึน" → จังหวะสองแรง ×1.5 ถ้าเป้ามึน
// ============================================================
(() => {
  if (typeof Class3 === 'undefined') return;
  const C = Class3;
  const K = Object.assign(C.K, {
    // Warden
    we_mark: lv => 0.03 * lv, we_r: 6, we_dur: 4,      // Watchful Eye: ตัวที่ตีเราในระยะ 6 รับดาเมจจากเรา +3%×Lv 4 วิ
    bl_len: 6, bl_w: 1.2, bl_tick: lv => 0.7 + 0.12 * lv, bl_def: lv => 3 * lv,
    pw_root: 3, pw_boss: 1,                             // รูน Prism Wall: ตรึง 3 วิ (บอส/ผู้เล่น: ช้า 1 วิ) ไม่มีดาเมจ
    rr_r: 3, rr_k: 0.8,                                 // รูน Rainbow Ring: วงรอบตัว 3 ช่อง แรง 80%
    gc_taken: 0.85, gc_r: 8,                            // Gjallar Call: รับดาเมจ −15%
    ws_taken: 0.6, ws_ret: 0.3,                         // Warden's Stand: −40% สะท้อน 30%
    ob_taken: 0.9, ob_share: 0.2,                       // Oath of the Bridge
    oh_cap: 0.6,                                        // Oath of the Horn: ดาเมจที่กันได้ → Rainbow Bash แรงขึ้น (สูงสุด +60%)
    ult_horn: 6, ult_horn_r: 8,
    // Jarl
    jc_atk: lv => lv, jc_aspd: lv => lv, jc_max: 3, jc_dur: 6, // Jarl's Command: ต่อชั้น ATK +Lv% ASPD +Lv% (≤3 ชั้น)
    ls_len: 7, ls_w: 1.1, ls_push: 1.5,
    ram_k: 1.8, ram_stun: 2, wake_k: 0.25, wake_dur: 3, // รูน Longship Charge: Ram / Wake
    rb_r: 4, rb_cd: 0.6,                                // Raven Banner: ในธง คูลดาวน์ Longship ×0.6
    gr_k: 1.5, sb_k: 1.12, sb_dur: 6, sb_cos: 0.5,      // Gram Rend / Shieldwall Breaker (กรวย ±60°)
    oh_hits: 4,                                         // Oath of the Hold: ตีติดกัน 4 ครั้ง = โมเมนตัม 1 ชั้น
    ult_raid: 10,
  });
  const P = () => G.player;
  const fast = () => !!G.fastSim;
  const lvOf = id => (G.player && G.player.skills[id]) || 0;
  const say = (o, t, c, big) => { if (!fast()) addFloater(o.x, o.y - 1.6, t, c, big); };
  const chosen = sk => typeof Runes !== 'undefined' && Runes.chosen(sk);
  const oath = sk => { const r = chosen(sk); return r ? r.oath || null : null; };
  const rune = sk => { const r = chosen(sk); return r ? r.c3w3 || null : null; };
  const isJob = j => !!G.player && G.player.job === j;
  const buffOn = id => { const p = P(), b = p && p.buffs[id]; return !!(b && b.until > G.time); };

  // ------------------------------------------------------------
  //  ข้อมูล Class + สกิล
  // ------------------------------------------------------------
  Object.assign(THIRD_JOBS, { valkyrie: 'warden', hersir: 'jarl' });
  Object.assign(JOBS, {
    warden: { glow: '#fff0b0', name: 'Heimdall Warden', thai: L('ผู้คุมสะพานแห่งไฮม์ดัล', 'Warden of Heimdall\'s Bridge'), parent: 'valkyrie', tier: 3,
      bonus: { atkPct: 20, matkPct: 15, hit: 15, hpPct: 15 }, hp: 2.2, sp: 1.05, jobMax: 60, aspd: 1150,
      outfit: '#e8ecf4', outfit2: '#f0c850', pants: '#4a4f62', cape: '#fff4d8', jobHat: 'viking',
      stats: 'VIT / STR', role: L('แทงค์คุมพื้นที่ ขีดเส้นรุ้งที่ศัตรูข้ามไม่ได้', 'Zone Tank — Draws Lines Foes Cannot Cross'),
      desc: L('ผู้เดินตามความคิดสุดท้ายของยามสะพานที่ไม่เคยหันหลัง ขีดเส้นรุ้งกลางสนาม รับแทนทุกคน แล้วฟาดโล่คืนด้วยแรงที่กันไว้',
        'One who followed the last thought of a bridge-guard who never turned his back. She draws a rainbow line across the field, takes every blow, and answers with the force she held back.'),
      skills: ['watchful_eye', 'bifrost_line', 'gjallar_call', 'rainbow_bash', 'wardens_stand', 'guardian_leap'] },
    jarl: { glow: '#ff6a40', name: 'Jarl Warbringer', thai: L('ยาร์ลผู้นำศึก', 'Jarl Who Brings the War'), parent: 'hersir', tier: 3,
      bonus: { atkPct: 15, matkPct: 15, hit: 15, hpPct: 15 }, hp: 1.95, sp: 1.0, jobMax: 60, aspd: 1100,
      outfit: '#3a3e48', outfit2: '#a0201a', pants: '#22252c', cape: '#1a1416', jobHat: 'viking',
      stats: 'STR / AGI', role: L('หัวหอกบุก ร้อยการพุ่งเป็นโซ่ ยิ่งเคลื่อนยิ่งแรง', 'Spearhead — Chains Charges, Stronger in Motion'),
      desc: L('ผู้ตอบความคิดสุดท้ายของยาร์ลที่นำ ไม่ใช่แข่ง พุ่งเรือยาวทะลุแนวศัตรู ปักธงอีกา แล้วพุ่งต่อไม่หยุด',
        'One who answered the last thought of a jarl who led rather than raced. He drives a longship charge through the line, plants the raven banner, and never stops moving.'),
      skills: ['jarls_command', 'longship_charge', 'raven_banner', 'gram_rend', 'shieldwall_breaker', 'conquerors_roar'] },
  });
  Object.assign(SKILLS, {
    // ===== Heimdall Warden =====
    watchful_eye: { name: 'Watchful Eye', max: 5, type: 'passive', icon: '#fff0a0', glyph: 'ᛗ',
      passive: lv => ({ def: 2 * lv, mdef: lv, hpPct: lv, atkPct: lv }),
      desc: L('ตาไฮม์ดัล DEF +2×Lv MDEF +Lv MaxHP +1%×Lv ATK +1%×Lv • ศัตรูที่ตีเราในระยะ 6 ช่องติดรอย "ถูกจ้อง" 4 วิ รับดาเมจจากเรา +3%×Lv',
        "Heimdall's eye. DEF +2×Lv, MDEF +Lv, MaxHP +1%×Lv, ATK +1%×Lv • an enemy that strikes you within 6 cells is Watched for 4s and takes +3%×Lv damage from you.") },
    bifrost_line: { name: 'Bifrost Line', max: 5, type: 'active', target: 'enemy', range: 6, icon: '#ffd0ff', glyph: '⌇', req: { watchful_eye: 1 },
      sp: lv => 26 + 2 * lv, cast: () => 400, delay: 700, cd: 10, special: 'c3w3_bifrost',
      desc: L('ขีดเส้นรุ้งยาว 6 ช่องไปทางเป้า 6 วินาที ศัตรูบนเส้นโดนศักดิ์สิทธิ์ 82~130% ทุกวินาทีและช้า • เรายืนบนเส้น DEF +3×Lv',
        'Draw a 6-cell rainbow line toward the target for 6s: enemies on it take 82~130% Holy every second and are slowed • standing on it gives you DEF +3×Lv.') },
    gjallar_call: { name: 'Gjallar Call', max: 5, type: 'active', target: 'self', icon: '#ffe0a0', glyph: '♫', req: { watchful_eye: 2 },
      sp: () => 28, delay: 900, cd: 15, aggro: 8, selfFx: 'shout', c3w3call: true,
      buff: { dur: () => 8, stats: lv => ({ mdef: 2 * lv }) },
      desc: L('เป่าแตร Gjallar ดึงศัตรูรอบ 8 ช่องเข้าหา • 8 วินาที รับดาเมจ −15% MDEF +2×Lv',
        'Sound the Gjallarhorn: pulls enemies within 8 cells to you • for 8s take 15% less damage, MDEF +2×Lv.') },
    rainbow_bash: { name: 'Rainbow Bash', max: 5, type: 'active', target: 'enemy', melee: true, icon: '#ffc0e0', glyph: '◈', req: { bifrost_line: 1 },
      sp: lv => 14 + 2 * lv, delay: 800, cd: 3.5, fx: 'bash', chain: true, c3w3bash: true,
      dmg: { type: 'phys', element: 'holy', mult: lv => 4.0 + 0.65 * lv, status: { kind: 'stun', chance: () => 100, dur: () => 1 } },
      desc: L('ฟาดโล่ขอบรุ้ง 465~725% ธาตุศักดิ์สิทธิ์ มึน 1 วินาที (บอส/ผู้เล่น: ได้แค่ดาเมจ)',
        'Bash with the rainbow-rimmed shield for 465~725% Holy and stun for 1s (bosses/players: damage only).') },
    wardens_stand: { name: "Warden's Stand", max: 5, type: 'active', target: 'self', icon: '#f0e0b0', glyph: '⛨', req: { gjallar_call: 1 },
      sp: () => 22, delay: 500, cd: 18, selfFx: 'buff', c3w3stand: true,
      buff: { dur: () => 5, stats: lv => ({ stunRes: 20 * lv }) },
      desc: L('ยืนนิ่ง 5 วินาที รับดาเมจ −40% สะท้อน 30% ใส่ตัวที่ตี ต้านมึน +20%×Lv (เดินเมื่อไหร่ = ยกเลิก)',
        'Hold your ground for 5s: take 40% less damage, reflect 30% onto the attacker, stun resistance +20%×Lv (moving ends it).') },
    guardian_leap: { name: 'Guardian Leap', max: 5, type: 'active', target: 'enemy', range: 6, icon: '#fff8d0', glyph: '⤒', req: { rainbow_bash: 1 },
      sp: () => 18, delay: 700, cd: 8, fx: 'quake', c3w3leap: true,
      dmg: { type: 'phys', element: 'holy', mult: lv => 1.7 + 0.3 * lv, area: 2, at: 'self' },
      desc: L('กระโดดเข้าหาเป้า (ไม่เกิน 6 ช่อง) กระแทกรอบตัว 2 ช่อง 200~320% ธาตุศักดิ์สิทธิ์',
        'Leap at the target (up to 6 cells) and slam everything within 2 cells for 200~320% Holy.') },
    // ===== Jarl Warbringer =====
    jarls_command: { name: "Jarl's Command", max: 5, type: 'passive', icon: '#ff8050', glyph: 'ᛉ',
      passive: lv => ({ atkPct: lv, str: lv, hit: 2 * lv }),
      desc: L('คำสั่งยาร์ล ATK +1%×Lv STR +Lv HIT +2×Lv • หลังพุ่ง Longship Charge ได้ "โมเมนตัม" 6 วิ ต่อชั้น ATK +Lv% ความเร็วตี +Lv% (ซ้อน 3 ชั้น)',
        "The jarl's command. ATK +1%×Lv, STR +Lv, HIT +2×Lv • each Longship Charge grants Momentum for 6s: ATK +Lv% and attack speed +Lv% per stack (up to 3).") },
    longship_charge: { name: 'Longship Charge', max: 5, type: 'active', target: 'enemy', range: 7, icon: '#ff6a40', glyph: '⇛', req: { jarls_command: 1 },
      sp: lv => 16 + 2 * lv, delay: 700, cd: 6, fx: 'bash', c3w3ship: true,
      dmg: { type: 'phys', mult: lv => 2.4 + 0.4 * lv },
      desc: L('พุ่งเรือยาว 7 ช่องไปทางเป้า ทะลุทุกตัวในแนว 280~440% ผลักออกข้าง',
        'Drive a longship charge 7 cells toward the target, ramming everything in the line for 280~440% and shoving them aside.') },
    raven_banner: { name: 'Raven Banner', max: 5, type: 'active', target: 'self', icon: '#c04030', glyph: '⚑', req: { jarls_command: 2 },
      sp: () => 30, delay: 900, cd: 20, selfFx: 'shout', c3w3banner: true,
      buff: { dur: () => 15, stats: lv => ({ atk: 5 * lv, hit: 3 * lv }) },
      desc: L('ปักธงอีการัศมี 4 ช่อง 15 วินาที ATK +5×Lv HIT +3×Lv • ยืนในธง คูลดาวน์ Longship Charge เร็วขึ้น 40%',
        'Plant the raven banner (4 cells) for 15s: ATK +5×Lv, HIT +3×Lv • inside the banner, Longship Charge cools down 40% faster.') },
    gram_rend: { name: 'Gram Rend', max: 5, type: 'active', target: 'enemy', melee: true, icon: '#e04040', glyph: '⚔', req: { longship_charge: 1 },
      sp: lv => 18 + 2 * lv, delay: 900, cd: 8, fx: 'slash', chain: true, c3w3rend: true,
      dmg: { type: 'phys', mult: lv => 2.3 + 0.4 * lv, hits: 2 },
      desc: L('ฟัน Gram 2 จังหวะ ครั้งละ 270~430% • จังหวะสองแรง ×1.5 ถ้าเป้ามึนอยู่',
        'Rend with Gram in 2 strokes of 270~430% each • the second stroke hits ×1.5 if the target is stunned.') },
    shieldwall_breaker: { name: 'Shieldwall Breaker', max: 5, type: 'active', target: 'enemy', melee: true, icon: '#b0a090', glyph: '⊿', req: { gram_rend: 1 },
      sp: lv => 18 + 2 * lv, delay: 800, cd: 7, fx: 'slash', c3w3cone: true,
      dmg: { type: 'phys', mult: lv => 2.2 + 0.4 * lv },
      desc: L('ฟาดกรวยหน้า 3 ช่อง 260~420% • ศัตรูที่โดนรับดาเมจกายภาพจากเรา +12% 6 วินาที',
        'Smash a 3-cell cone ahead for 260~420% • enemies hit take 12% more physical damage from you for 6s.') },
    conquerors_roar: { name: "Conqueror's Roar", max: 5, type: 'active', target: 'self', icon: '#ffa060', glyph: '!', req: { raven_banner: 1 },
      sp: () => 15, delay: 500, cd: 18, selfFx: 'shout', c3w3roar: true,
      buff: { dur: () => 6, stats: lv => ({ stunRes: 100, def: 2 * lv }) },
      desc: L('คำรามผู้พิชิต ล้างมึน/ช้าทันที + ต้านมึน 100% 6 วินาที DEF +2×Lv',
        "The conqueror's roar: instantly clears stun/slow, then 100% stun resistance for 6s, DEF +2×Lv.") },
  });
  const NEW = ['watchful_eye', 'bifrost_line', 'gjallar_call', 'rainbow_bash', 'wardens_stand', 'guardian_leap', 'jarls_command', 'longship_charge', 'raven_banner', 'gram_rend', 'shieldwall_breaker', 'conquerors_roar'];
  for (const id of NEW) SKILLS[id].id = id;

  // ------------------------------------------------------------
  //  ตัวช่วย: แนวเส้น / กระโดด
  // ------------------------------------------------------------
  const onLine = (o, z) => { const t = (o.x - z.sx) * z.ux + (o.y - z.sy) * z.uy, perp = Math.abs((o.x - z.sx) * z.uy - (o.y - z.sy) * z.ux); return t >= -0.3 && t <= z.len + 0.3 && perp < K.bl_w; };
  const dirTo = (p, t) => { const dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy) || 1; return { ux: dx / d, uy: dy / d, d }; };
  const leapTo = (tgt, maxD, col) => {
    const p = P(), { ux, uy, d } = dirTo(p, tgt), go = Math.max(0, Math.min(maxD, d - 0.9));
    const nx = p.x + ux * go, ny = p.y + uy * go;
    if (G.map.walkable(Math.floor(nx), Math.floor(ny))) { p.x = nx; p.y = ny; p.path = []; }
    if (!fast()) addFx({ type: 'ring', x: p.x, y: p.y, dur: 0.5, r: 2, color: col });
  };

  // ------------------------------------------------------------
  //  Bifrost Line (Warden)
  // ------------------------------------------------------------
  C.bifrost = (s, lv, at) => {
    const p = P(), rn = rune('bifrost_line'), dur = 6;
    if (rn === 'ring') {
      Runes.zone({ skill: s.id, x: p.x, y: p.y, ref: p, r: K.rr_r, until: G.time + dur, every: 1, first: 0.05, rgb: '255,200,255',
        tick: (z, ms) => { for (const m of ms) { Runes.hit(m, s, K.bl_tick(lv) * K.rr_k, { element: 'holy', color: '#ffd0ff' }); m.slowUntil = Math.max(m.slowUntil || 0, G.time + 1.1); } } });
      return;
    }
    const o = at && !at.dead ? at : p, { ux, uy } = o === p ? { ux: p.facing < 0 ? -1 : 1, uy: 0 } : dirTo(p, o);
    const z0 = { sx: p.x, sy: p.y, ux, uy, len: K.bl_len };
    const wall = rn === 'wall', walled = new Set();
    Runes.zone({ skill: s.id, x: p.x + ux * K.bl_len / 2, y: p.y + uy * K.bl_len / 2, r: K.bl_len / 2 + 1, until: G.time + (wall ? 3 : dur), every: wall ? 0.25 : 1, first: 0.05, draw: false, rgb: '255,210,255', c3line: z0,
      tick: (z, ms) => {
        for (const m of ms) {
          if (!onLine(m, z0)) continue;
          if (wall) { // Prism Wall: ตรึงตัวที่แตะเส้น (ครั้งเดียวต่อตัว) ไม่มีดาเมจ
            if (walled.has(m)) continue; walled.add(m);
            if (m.def.boss || m.isPlayer) m.slowUntil = Math.max(m.slowUntil || 0, G.time + K.pw_boss);
            else { m.stunUntil = G.time + K.pw_root; m.path = []; m.moving = false; say(m, 'WALL', '#ffd0ff'); }
            continue;
          }
          Runes.hit(m, s, K.bl_tick(lv), { element: 'holy', color: '#ffd0ff' });
          m.slowUntil = Math.max(m.slowUntil || 0, G.time + 1.1);
        }
        if (!wall && onLine(p, z0)) Runes.giveBuff('c3w3_line', s.id, 1.2, { def: K.bl_def(lv) });
      } });
    if (!fast()) for (let i = 0; i < 4; i++) Runes.fx({ kind: 'zone', x: p.x + ux * (0.75 + i * 1.5), y: p.y + uy * (0.75 + i * 1.5), r: 0.9, dur: wall ? 3 : dur, col: ['255,120,120', '255,230,120', '140,255,170', '150,170,255'][i], style: 'ring' });
  };

  // ------------------------------------------------------------
  //  Longship Charge / Shieldwall Breaker (Jarl) — เลือกเป้าเอง แล้วส่งดาเมจผ่าน skillHitOne
  // ------------------------------------------------------------
  C.longship = (s, lv, tgt) => {
    const p = P(), { ux, uy } = dirTo(p, tgt), ram = rune('longship_charge') === 'ram';
    const sx = p.x, sy = p.y;
    let hits = G.mobs.filter(m => { if (m.dead) return false; const t = (m.x - sx) * ux + (m.y - sy) * uy, perp = Math.abs((m.x - sx) * uy - (m.y - sy) * ux); return t >= 0 && t <= K.ls_len + 0.5 && perp < K.ls_w; })
      .sort((a, b) => ((a.x - sx) * ux + (a.y - sy) * uy) - ((b.x - sx) * ux + (b.y - sy) * uy));
    if (!hits.includes(tgt)) hits.push(tgt);
    if (ram) hits = hits.slice(0, 1);
    const stop = ram ? Math.max(0, ((hits[0].x - sx) * ux + (hits[0].y - sy) * uy) - 0.9) : K.ls_len;
    let go = 0;
    for (let g = 0.3; g <= stop; g += 0.3) { if (!G.map.walkable(Math.floor(sx + ux * g), Math.floor(sy + uy * g))) break; go = g; }
    p.x = sx + ux * go; p.y = sy + uy * go; p.path = []; p.skillIntent = null;
    if (!fast()) Runes.fx({ kind: 'drag', x: p.x, y: p.y, ox: ux, oy: uy, dur: 0.4, col: '255,120,70' });
    p.c3shipAt = G.time; p.c3shipDir = { ux, uy };
    hits.forEach((m, i) => later(i * 0.04, () => skillHitOne(s, lv, m, ram ? K.ram_k : 1)));
    if (rune('longship_charge') === 'wake') {
      for (let g = 1; g <= go; g += 1.5) {
        const x = sx + ux * g, y = sy + uy * g;
        Runes.zone({ skill: s.id, x, y, r: 0.9, until: G.time + K.wake_dur, every: 1, first: 0.5, rgb: '255,120,60',
          tick: (z, ms) => { for (const m of ms) Runes.hit(m, s, s.dmg.mult(lv) * K.wake_k, { color: '#ff9060' }); } });
      }
    }
    C.momentum();
  };
  C.cone = (s, lv, tgt) => {
    const p = P(), { ux, uy } = dirTo(p, tgt);
    const hits = G.mobs.filter(m => { if (m.dead) return false; const dx = m.x - p.x, dy = m.y - p.y, d = Math.hypot(dx, dy) || 1; return d <= 3 && (dx * ux + dy * uy) / d >= K.sb_cos; });
    if (!hits.includes(tgt)) hits.push(tgt);
    hits.forEach((m, i) => later(i * 0.03, () => skillHitOne(s, lv, m)));
    if (!fast()) addFx({ type: 'whirl', x: p.x + ux, y: p.y + uy, dur: 0.35, r: 2 });
  };
  C.momentum = () => {
    const lv = lvOf('jarls_command'); if (!lv || !isJob('jarl')) return;
    const b = Runes.giveBuff('c3w3_mom', 'jarls_command', K.jc_dur, { atkPct: K.jc_atk(lv), aspdPct: K.jc_aspd(lv) }, K.jc_max);
    say(P(), `MOMENTUM ×${b.stacks}`, '#ff8050');
  };
  C.raid = () => C.ultOn('raid');

  // ------------------------------------------------------------
  //  ดาเมจที่เราโดน (Warden): Gjallar −15% • Stand −40% • Bridge −10% • Horn เก็บแรงที่กันได้ • ไม้ตาย ไม่ล้ม
  // ------------------------------------------------------------
  const takenMul = () => {
    const p = P(); if (!p || !isJob('warden')) return 1;
    let k = 1;
    if (buffOn('gjallar_call')) k *= K.gc_taken;
    if (buffOn('wardens_stand')) k *= K.ws_taken;
    if (oath('watchful_eye') === 'bridge') k *= K.ob_taken;
    return k;
  };
  C.takenMul = takenMul;
  if (typeof damagePlayer === 'function' && !damagePlayer._c3w3) {
    const f0 = damagePlayer;
    damagePlayer = function (dmg, color, src) { // eslint-disable-line no-global-assign
      const p = G.player;
      if (p && !p.dead && dmg > 0 && isJob('warden')) {
        const k = takenMul(), d1 = Math.max(1, Math.round(dmg * k));
        if (oath('watchful_eye') === 'horn' && d1 < dmg) p.c3horn = Math.min(p.d.maxHp * K.oh_cap, (p.c3horn || 0) + (dmg - d1));
        dmg = d1;
        if (C.ultOn('gjallar') && dmg >= p.hp && p.hp > 1) { dmg = p.hp - 1; say(p, 'GJALLARHORN', '#fff0b0'); }
      }
      return f0.call(this, dmg, color, src);
    };
    damagePlayer._c3w3 = true;
  }
  // Oath of the Bridge: ผู้ช่วย (G.allies) รับดาเมจ 20% น้อยลง — ส่วนนั้นโอนมาที่เรา
  if (typeof damageAlly === 'function' && !damageAlly._c3w3) {
    const f0 = damageAlly;
    damageAlly = function (a, dmg, source) { // eslint-disable-line no-global-assign
      const p = G.player;
      if (p && !p.dead && isJob('warden') && oath('watchful_eye') === 'bridge' && dmg > 1) {
        const share = Math.round(dmg * K.ob_share); dmg -= share;
        if (share > 0) damagePlayer(share, '#fff0b0', { dot: true });
      }
      return f0.call(this, a, dmg, source);
    };
    damageAlly._c3w3 = true;
  }
  // ตัวที่ตีเรา: รอยถูกจ้อง (Watchful Eye) + สะท้อน (Warden's Stand)
  const RU = Runes;
  { const f0 = RU.onHurt;
    RU.onHurt = function (m, dmg) {
      const r = f0.apply(this, arguments), p = P();
      if (p && m && !m.dead && isJob('warden')) {
        if (lvOf('watchful_eye') && U.dist(m.x, m.y, p.x, p.y) <= K.we_r) m.c3watch = G.time + K.we_dur;
        if (buffOn('wardens_stand') && r > 0) damageMob(m, Math.max(1, Math.round(r * K.ws_ret)), { src: 'wardens_stand', color: '#fff0b0' });
      }
      return r;
    }; }
  // มึน: Conqueror's Roar ต้านเต็ม (ผ่าน stunRes 100 อยู่แล้ว — กันซ้ำตรงนี้ให้ชัด รวมมึนจากบอส)
  if (typeof stunPlayer === 'function' && !stunPlayer._c3w3) {
    const f0 = stunPlayer;
    stunPlayer = function () { // eslint-disable-line no-global-assign
      if (isJob('jarl') && buffOn('conquerors_roar')) { say(P(), 'Unbowed', '#ffa060'); return; }
      return f0.apply(this, arguments);
    };
    stunPlayer._c3w3 = true;
  }
  // Oath of the Hold: ตีโดนติดกัน 4 ครั้ง (ตีธรรมดาหรือสกิล) = โมเมนตัม 1 ชั้น
  if (typeof applyHit === 'function' && !applyHit._c3w3) {
    const f0 = applyHit;
    applyHit = function (m, r, opts) { // eslint-disable-line no-global-assign
      const out = f0.apply(this, arguments), p = G.player;
      if (p && r && isJob('jarl') && oath('jarls_command') === 'hold' && opts && opts.src && !opts.dot) {
        if (r.miss) p.c3hold = 0;
        else if ((p.c3hold = (p.c3hold || 0) + 1) >= K.oh_hits) { p.c3hold = 0; C.momentum(); }
      }
      return out;
    };
    applyHit._c3w3 = true;
  }
  // คูลดาวน์ Longship ในธง • ไม้ตาย RAID: Longship ไม่ใช้ SP
  if (typeof skillDef === 'function' && !skillDef._c3w3) {
    const f0 = skillDef;
    skillDef = function (id) { // eslint-disable-line no-global-assign
      const s = f0.apply(this, arguments), p = G.player;
      if (!s || !s.c3w3ship || !p || !(p.c3inBanner > G.time)) return s;
      const d = Object.create(s); d.cd = s.cd * K.rb_cd; return d;
    };
    skillDef._c3w3 = true;
  }
  if (typeof skillCost === 'function' && !skillCost._c3w3) {
    const f0 = skillCost;
    skillCost = function (id) { return id === 'longship_charge' && C.raid() ? 0 : f0.apply(this, arguments); }; // eslint-disable-line no-global-assign
    skillCost._c3w3 = true;
  }

  // ------------------------------------------------------------
  //  จุดเกาะ Runes (ห่อต่อจาก js/class3_wave2.js)
  // ------------------------------------------------------------
  { const f0 = RU.preCast;
    RU.preCast = function (s, lv, tgt) {
      const p = P();
      if (p && s && s.c3w3bash && p.c3horn > 0) { p.c3hornCast = { k: 1 + Math.min(K.oh_cap, p.c3horn / Math.max(1, p.d.maxHp)), until: G.time + 2 }; p.c3horn = 0; }
      if (p && s && s.c3w3stand) p.c3standAt = { x: p.x, y: p.y };
      if (p && s && s.c3w3roar) { p.stunUntil = 0; p.slowUntil = 0; p.flinchUntil = 0; }
      return f0.apply(this, arguments);
    }; }
  { const f0 = RU.onCast;
    RU.onCast = function (s, lv, tgt) {
      const p = P();
      if (s.c3w3leap && tgt && !tgt.dead) leapTo(tgt, 6, '255,240,190');
      if (s.c3w3call) for (const m of G.mobs) if (!m.dead && U.dist(m.x, m.y, p.x, p.y) <= K.gc_r) Runes.pull(m, p.x, p.y, 1.2);
      if (s.c3w3banner) {
        const bx = p.x, by = p.y;
        Runes.zone({ skill: s.id, x: bx, y: by, r: K.rb_r, until: G.time + 15, every: 0.5, first: 0.05, rgb: '200,60,40',
          tick: () => { if (U.dist(p.x, p.y, bx, by) <= K.rb_r) p.c3inBanner = G.time + 0.6; } });
      }
      const r = f0.apply(this, arguments);
      if (s.c3w3ship && tgt && !tgt.dead) { C.longship(s, lv, tgt); return true; }
      if (s.c3w3cone && tgt && !tgt.dead) { C.cone(s, lv, tgt); return true; }
      return r;
    }; }
  { const f0 = RU.hitMul;
    RU.hitMul = function (s, lv, m) {
      let k = f0.apply(this, arguments);
      const p = P(); if (!p || !m) return k;
      if (m.c3watch > G.time && isJob('warden')) k *= 1 + K.we_mark(lvOf('watchful_eye'));
      const hc = p.c3hornCast; if (s.c3w3bash && hc && hc.until > G.time) k *= hc.k;
      if (s.c3w3rend) { m.c3rendN = (m.c3rendN || 0) + 1; if (m.c3rendN % 2 === 0 && m.stunUntil > G.time) k *= K.gr_k; }
      if (s.dmg && s.dmg.type === 'phys' && m.c3sunder > G.time) k *= K.sb_k;
      return k;
    }; }
  { const f0 = RU.afterHit;
    RU.afterHit = function (s, lv, m, r) {
      f0.apply(this, arguments);
      if (!r || r.miss || !m || m.dead) return;
      const p = P();
      if (s.c3w3bash) p.c3hornCast = null;
      if (s.c3w3cone) m.c3sunder = G.time + K.sb_dur;
      if (s.c3w3ship) {
        if (rune('longship_charge') === 'ram') { if (!m.def.boss && !m.isPlayer) { m.stunUntil = G.time + K.ram_stun; m.path = []; m.moving = false; } }
        else if (!m.def.boss) { // ผลักออกข้างแนวพุ่ง
          const sd = p.c3shipDir || { ux: 1, uy: 0 }, side = ((m.x - p.x) * sd.uy - (m.y - p.y) * sd.ux) >= 0 ? 1 : -1;
          knockback(m, m.x - sd.uy * side, m.y + sd.ux * side, K.ls_push);
        }
      }
    }; }
  { const f0 = RU.onKill;
    RU.onKill = function (m) {
      f0.apply(this, arguments);
      const p = P(); if (!p || !isJob('jarl')) return;
      const raidOath = oath('jarls_command') === 'raid' && p.c3shipAt && G.time - p.c3shipAt < 1.5;
      if ((raidOath || C.raid()) && p.cds && p.cds.longship_charge > G.time) { p.cds.longship_charge = G.time; say(p, 'RAID!', '#ff6a40'); }
    }; }
  { const f0 = RU.update;
    RU.update = function () {
      f0.apply(this, arguments);
      const p = P(); if (!p) return;
      const st = p.buffs.wardens_stand; // เดิน = ยกเลิก Warden's Stand
      if (st && st.until > G.time && p.c3standAt && U.dist(p.x, p.y, p.c3standAt.x, p.c3standAt.y) > 0.35) { delete p.buffs.wardens_stand; p.c3standAt = null; recalc(); say(p, 'Stand broken', '#c0b090'); }
      if (C.ultOn('gjallar') && G.time >= (p.c3hornAggro || 0)) { p.c3hornAggro = G.time + 1; for (const m of G.mobs) if (!m.dead && !m.isPlayer && U.dist(m.x, m.y, p.x, p.y) <= K.ult_horn_r) aggroMob(m); }
    }; }
  if (typeof runSpecialSkill === 'function' && !runSpecialSkill._c3w3) {
    const f0 = runSpecialSkill;
    runSpecialSkill = function (kind, s, lv) { // eslint-disable-line no-global-assign
      if (kind === 'c3w3_bifrost') return void C.bifrost(s, lv, C.tgt);
      return f0.apply(this, arguments);
    };
    runSpecialSkill._c3w3 = true;
  }

  // ------------------------------------------------------------
  //  Oath (สกิลติดตัว) + รูนสกิลประจำตัว ★
  // ------------------------------------------------------------
  const pc = v => Math.round(v * 100);
  const keepP = id => () => ({ passive: SKILLS[id].passive });
  Runes.add('watchful_eye', [
    { id: 'watchful_eye.bridge', name: 'Of the Bridge', oath: 'bridge', intent: 'pack', glyph: 'ᛒ', col: '#fff0b0',
      short: `Oath: you take −${pc(1 - K.ob_taken)}% · ${pc(K.ob_share)}% of allies' damage to you`,
      desc: () => L(`Oath of the Bridge — เรารับดาเมจ −${pc(1 - K.ob_taken)}% และ ${pc(K.ob_share)}% ของดาเมจที่ผู้ช่วย (หมาป่า/สิ่งที่อัญเชิญ) รับโอนมาหาเรา — ยืนแทนคนที่หันหลังให้ไม่ได้`,
        `Oath of the Bridge — you take ${pc(1 - K.ob_taken)}% less damage, and ${pc(K.ob_share)}% of the damage your allies (wolves/summons) take is moved onto you — stand for those who cannot turn around.`),
      mod: keepP('watchful_eye') },
    { id: 'watchful_eye.horn', name: 'Of the Horn', oath: 'horn', intent: 'single', glyph: 'ᚺ', col: '#ffc070',
      short: `Oath: blocked damage powers Rainbow Bash (≤ +${pc(K.oh_cap)}%)`,
      desc: () => L(`Oath of the Horn — ดาเมจที่ลดได้ (Gjallar Call / Warden's Stand) สะสมเป็นพลัง ปล่อยใน Rainbow Bash ลูกถัดไป (สูงสุด +${pc(K.oh_cap)}%) — สายตีโต้`,
        `Oath of the Horn — damage you prevent (Gjallar Call / Warden's Stand) is stored and released in your next Rainbow Bash (up to +${pc(K.oh_cap)}%) — the counter-attack path.`),
      mod: keepP('watchful_eye') },
  ]);
  Runes.add('bifrost_line', [
    { id: 'bifrost_line.prism_wall', name: 'Prism Wall', c3w3: 'wall', intent: 'both', glyph: '▥', col: '#ffd0ff',
      short: `Line roots foes that touch it ${K.pw_root}s · no damage`,
      desc: () => L(`เส้นกลายเป็นกำแพง 3 วินาที ศัตรูที่แตะเส้นถูกตรึง ${K.pw_root} วินาที (บอส/ผู้เล่น: ช้า ${K.pw_boss} วิ) — ไม่มีดาเมจ`, `The line becomes a wall for 3s: enemies that touch it are rooted for ${K.pw_root}s (bosses/players: slowed ${K.pw_boss}s) — no damage.`) },
    { id: 'bifrost_line.rainbow_ring', name: 'Rainbow Ring', c3w3: 'ring', intent: 'pack', glyph: '◯', col: '#c0d0ff',
      short: `A ${K.rr_r}-cell ring around you · ${pc(K.rr_k)}%`,
      desc: () => L(`วงรุ้งรอบตัว ${K.rr_r} ช่องตามตัวเราแทนเส้น แรง ${pc(K.rr_k)}%`, `A ${K.rr_r}-cell rainbow ring that follows you instead of a line, at ${pc(K.rr_k)}%.`) },
  ]);
  Runes.add('jarls_command', [
    { id: 'jarls_command.raid', name: 'Of the Raid', oath: 'raid', intent: 'pack', glyph: 'ᚱ', col: '#ff6a40',
      short: 'Oath: a kill right after Longship resets its cooldown',
      desc: () => L('Oath of the Raid — ฆ่าได้ภายใน 1.5 วิหลังพุ่ง Longship Charge = คูลดาวน์ Longship รีเซ็ตทันที (สายวิ่งฟาร์ม)', 'Oath of the Raid — a kill within 1.5s of a Longship Charge resets its cooldown at once (the farming path).'),
      mod: keepP('jarls_command') },
    { id: 'jarls_command.hold', name: 'Of the Hold', oath: 'hold', intent: 'single', glyph: 'ᛟ', col: '#c0a080',
      short: `Oath: Momentum from ${K.oh_hits} hits in a row (not only from charging)`,
      desc: () => L(`Oath of the Hold — ได้โมเมนตัมจากการตีโดนติดกัน ${K.oh_hits} ครั้งด้วย (ตีพลาด = นับใหม่) — สายยืนสู้บอส`, `Oath of the Hold — also gain Momentum from ${K.oh_hits} hits in a row (a miss resets the count) — the boss-fight path.`),
      mod: keepP('jarls_command') },
  ]);
  Runes.add('longship_charge', [
    { id: 'longship_charge.ram', name: 'Ram', c3w3: 'ram', intent: 'single', glyph: '⯈', col: '#ff9060',
      short: `Stops at the first foe ×${K.ram_k} · stun ${K.ram_stun}s`,
      desc: () => L(`หยุดที่ตัวแรก แรง ×${K.ram_k} มึน ${K.ram_stun} วินาที (บอส/ผู้เล่น: ได้แค่ดาเมจ)`, `Stops at the first foe for ×${K.ram_k} and stuns for ${K.ram_stun}s (bosses/players: damage only).`) },
    { id: 'longship_charge.wake', name: 'Wake', c3w3: 'wake', intent: 'pack', glyph: '≋', col: '#ff7040',
      short: `Leaves a burning wake ${K.wake_dur}s · ${pc(K.wake_k)}%/s`,
      desc: () => L(`ทิ้งรอยคลื่นไฟตามทางพุ่ง ${K.wake_dur} วินาที ศัตรูบนรอยโดน ${pc(K.wake_k)}% ทุกวินาที`, `Leaves a burning wake along the path for ${K.wake_dur}s: foes on it take ${pc(K.wake_k)}% every second.`) },
  ]);

  // ------------------------------------------------------------
  //  ไม้ตายตัวเลือกที่ 4
  // ------------------------------------------------------------
  if (typeof Feel !== 'undefined' && Feel.ULTS) {
    Feel.ULTS.gjallar = { job: 'warden', name: 'GJALLARHORN', th: L('แตรกยัลลาร์', 'Gjallarhorn'),
      desc: L(`${K.ult_horn} วินาที: ไม่ล้ม (HP ต่ำสุด 1) + ดึงศัตรูทุกตัวในระยะ ${K.ult_horn_r} ช่องมาที่เรา`, `${K.ult_horn}s: you cannot fall (HP stays at least 1) + draws every enemy within ${K.ult_horn_r} cells to you`),
      fire(p, col) { p.c3ult = { kind: 'gjallar', until: G.time + K.ult_horn }; p.c3hornAggro = 0; addFloater(p.x, p.y - 2, 'GJALLARHORN!', col || '#fff0b0', true); } };
    Feel.ULTS.raid = { job: 'jarl', name: 'RAID OF THE JARL', th: L('ศึกบุกของยาร์ล', 'Raid of the Jarl'),
      desc: L(`${K.ult_raid} วินาที: ฆ่าได้ = รีเซ็ตคูลดาวน์ Longship Charge + พุ่งไม่ใช้ SP`, `${K.ult_raid}s: every kill resets Longship Charge + charging costs no SP`),
      fire(p, col) { p.c3ult = { kind: 'raid', until: G.time + K.ult_raid }; if (p.cds) p.cds.longship_charge = G.time; addFloater(p.x, p.y - 2, 'RAID OF THE JARL!', col || '#ff6a40', true); } };
  }

  // ------------------------------------------------------------
  //  เควสต์ทดสอบ (เงาแม่พิมพ์)
  // ------------------------------------------------------------
  const NB = s => (typeof B === 'function' ? B(s) : `<b>${s}</b>`);
  Object.assign(C.TRIAL, {
    warden: { npc: 'hrolf', map: 'eldheim', place: 'Eldheim Gate', who: 'Hrólf',
      thought: L('"ยืนแทนคนที่หันหลังให้ไม่ได้"', '"Stand for the one who cannot turn around."'),
      meet: L(`(Hrólf แตะบานประตูเก่า) คนแรกที่ยืนตรงนี้แทนข้า... เขาแค่ยกมือขอบใจ แล้วหันกลับไปเฝ้าต่อ ความคิดที่เขาทิ้งไว้คือ ${NB('"ยืนแทนคนที่หันหลังให้ไม่ได้"')}<br>ยืนตรงนั้นสิ... (เงาถือโล่ทองก้าวออกจากซุ้มประตู — มันยืนแบบเจ้าทุกท่า)`,
        `(Hrólf touches the old gate) The first one who stood here for me... he only raised a hand in thanks, then turned back to his watch. The thought he left was ${NB('"Stand for the one who cannot turn around."')}<br>Stand there... (a shadow with a golden shield steps out of the archway — it stands exactly as you do)`) },
    jarl: { npc: 'sigrun', map: 'wolfwood', place: 'Wolfwood', who: 'Sigrún',
      thought: L('"นำ ไม่ใช่แข่ง"', '"Lead. Don\'t race."'),
      meet: L(`(Sigrún ปักหอกลงดิน) ข้าวิ่งนำเจ้าทุกครั้ง แต่ยาร์ลคนหนึ่งเคยบอกข้าว่า ${NB('"นำ ไม่ใช่แข่ง"')} — วันนี้บุกไปด้วยกัน ไม่ต้องแย่งค่าหัว... (เงาถือดาบใหญ่พุ่งออกจากพุ่มไม้ — มันไม่รอใคร)`,
        `(Sigrún plants her spear) I always run ahead of you. But a jarl once told me ${NB('"Lead. Don\'t race."')} — today we charge together, no fighting over the bounty... (a shadow with a greatsword bursts from the brush — it waits for no one)`) },
  });
  if (typeof C.install === 'function') C.install();

  // ------------------------------------------------------------
  //  บอท: Bifrost Line = โซน • Longship เปิดการต่อสู้ • Roar เมื่อโดนมึน
  // ------------------------------------------------------------
  if (typeof Bot !== 'undefined') {
    const role0 = Bot.role;
    Bot.role = function (id) {
      const s = skillDef(id);
      if (s && s.special === 'c3w3_bifrost') return 'zone';
      return role0.apply(this, arguments);
    };
    const pick0 = Bot.pickSkill;
    Bot.pickSkill = function (t, threats, hpPct, spPct) {
      const p = G.player;
      if (isJob('jarl') && t && lvOf('longship_charge') && this.canCast('longship_charge')) return 'longship_charge'; // พุ่งทุกครั้งที่พร้อม (ตัวตนของ Class: ไม่หยุดเคลื่อน)
      if (isJob('warden') && t && lvOf('bifrost_line') && this.canCast('bifrost_line') && (threats ? threats.length : 0) >= 2) return 'bifrost_line';
      return pick0.apply(this, arguments);
    };
  }

  // ------------------------------------------------------------
  //  ภาพ: ย้อมจาก Class 2 จนกว่าจะมีภาพจริง (prompt docs/CLASS3_ART.md)
  // ------------------------------------------------------------
  if (typeof Art !== 'undefined') {
    const ART = { warden: ['valkyrie', { hue: 15, sat: 0.8, bri: 1.12, tint: ['#fff0b0', 0.22] }], jarl: ['hersir', { hue: -10, sat: 1.1, bri: 0.82, tint: ['#5a1010', 0.24] }] };
    for (const [id, [base, spec]] of Object.entries(ART)) {
      for (const g of ['f', 'm']) Art.alias(`job_${id}_${g}`, `job_${base}_${g}`, Object.assign({ flip: true }, spec));
      Art.alias(`emblem_${id}`, `emblem_${base}`, spec);
    }
    const SRC = {
      warden: [['watchful_eye', 'aegis_wall', 40], ['bifrost_line', 'judgment_quake', 260], ['gjallar_call', 'einherjar_guard', 20], ['rainbow_bash', 'spear_of_valhalla', 300], ['wardens_stand', 'aegis_wall', -30], ['guardian_leap', 'valhallas_call', 30]],
      jarl: [['jarls_command', 'hersir_might', -15], ['longship_charge', 'charge_strike', -10], ['raven_banner', 'battle_aura', -30], ['gram_rend', 'spiral_pierce', 340], ['shieldwall_breaker', 'ragnars_fury', 20], ['conquerors_roar', 'battle_aura', 15]],
    };
    for (const job in SRC) SRC[job].forEach(([id, from, hue], i) => Art.alias('skill_' + id, 'skill_' + from, { hue, sat: 1.15, bri: i % 2 ? 1.0 : 1.06, flip: i % 2 === 0, tint: [JOBS[job].glow, 0.14] }));
  }
  if (typeof CLASSBOOK !== 'undefined') Object.assign(CLASSBOOK, {
    warden: { diff: 2, weapon: L('ดาบสั้น + โล่สูง', 'Short sword + tower shield'), stats: [['vit', 50], ['str', 40], ['dex', 10]],
      build: [['watchful_eye', 5], ['bifrost_line', 5], ['rainbow_bash', 5], ['gjallar_call', 5], ['wardens_stand', 4], ['guardian_leap', 1]],
      play: L('ขีด Bifrost Line ขวางทางฝูง แล้วเป่า Gjallar Call ดึงทุกตัวข้ามเส้น • ฟาด Rainbow Bash ตัวที่ถูกจ้อง • โดนรุมหนัก ยืน Warden\'s Stand สะท้อนคืน',
        "Draw a Bifrost Line across the pack's path, then sound Gjallar Call to drag them over it • Rainbow Bash the Watched ones • when swarmed, hold Warden's Stand and reflect it back."),
      pros: L('ทนมาก คุมฝูงด้วยเส้น', 'Very tough, controls packs with lines'), cons: L('ต้องวางตำแหน่ง ยืนนิ่งถึงจะคุ้ม', 'Positioning matters; rewards standing still'),
      tips: L('Oath of the Horn = เล่นเดี่ยว/ตีโต้ • Oath of the Bridge = มีผู้ช่วย/ปาร์ตี้', 'Oath of the Horn for solo counter-play • Oath of the Bridge with allies/party.') },
    jarl: { diff: 2, weapon: L('ดาบใหญ่สองมือ', 'Two-handed greatsword'), stats: [['str', 55], ['agi', 25], ['vit', 20]],
      build: [['jarls_command', 5], ['longship_charge', 5], ['gram_rend', 5], ['raven_banner', 5], ['shieldwall_breaker', 4], ['conquerors_roar', 1]],
      play: L('เปิดด้วย Longship Charge ทะลุแนว (ได้โมเมนตัม) • ปัก Raven Banner แล้วพุ่งวนในธง • ปิดตัวแข็งด้วย Shieldwall Breaker → Gram Rend',
        'Open with Longship Charge through the line (gain Momentum) • plant the Raven Banner and keep charging inside it • finish tough ones with Shieldwall Breaker → Gram Rend.'),
      pros: L('เคลื่อนไหวเร็ว ฟาร์มฝูงลื่น', 'Fast, fluid pack farming'), cons: L('หยุดพุ่ง = แรงตก', 'Loses power when it stops moving'),
      tips: L('Oath of the Raid = วิ่งฟาร์ม • Oath of the Hold = ยืนสู้บอส', 'Oath of the Raid for running farms • Oath of the Hold for standing boss fights.') },
  });
})();
