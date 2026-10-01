// World Boss 2 ผู้เล่น (Supabase ปลอม): เลือดบอสใช้ร่วมกัน • ผู้เล่นตายแล้วกลับมา บอสไม่ฟื้นเลือด • ปราบแล้วทั้งคู่ได้รางวัล
globalThis.EXTRA = async (A, B, ok) => {
  // บังคับให้อยู่ในช่วงเวลาที่บอสโลกปรากฏ (ทดสอบได้ทุกเวลา)
  for (const P of [A, B]) await P.evaluate(async () => {
    WB.WINDOW = WB.PERIOD; WB.st = {}; try { localStorage.removeItem('nm_wb'); } catch (e) {}
    const pl = G.player; pl.job = 'einherjar'; pl.baseLv = 40; pl.stats.vit = 90; recalc(); pl.hp = pl.d.maxHp;
    changeMap('mistlake', 20, 20); await new Promise(r => setTimeout(r, 300));
  });
  for (const P of [A, B]) await P.waitForFunction(() => G.mobs.some(m => m.isWB && !m.dead), null, { timeout: 10000 }).catch(() => {});
  const max = await A.evaluate(() => { const m = WB.live(); return m && m.maxHp; });
  const want = await A.evaluate(() => MOBS.seraph_pudding.hp * 5);
  ok('บอสโลกเกิดในแผนที่ (เลือด 5 เท่า MVP)', max === want, `${max} / ${want}`);
  // B ตีก่อน 1 ครั้ง (ร่วมตี) แล้ว A ตีแรง ๆ
  await B.evaluate(() => damageMob(WB.live(), 1000));
  await A.waitForFunction(() => WB.live() && WB.live().hp <= WB.live().maxHp - 1000, null, { timeout: 8000 }).catch(() => {});
  await A.evaluate(() => damageMob(WB.live(), 20000));
  await B.waitForFunction(() => WB.live() && WB.live().hp <= WB.live().maxHp - 21000, null, { timeout: 8000 }).catch(() => {});
  const [ha, hb] = [await A.evaluate(() => WB.live().hp), await B.evaluate(() => WB.live().hp)];
  ok('เลือดบอสตรงกันทั้งสองเครื่อง', ha === hb && ha === max - 21000, `${ha} / ${hb}`);
  // ตารางดาเมจ: ทั้งสองเครื่องเห็นอันดับเดียวกัน (Alice 20000 > Bobby 1000) + ป้าย Top damage แสดงอยู่
  const topOf = P => P.evaluate(() => { WB.tick(); const el = document.getElementById('wb-top');
    return { top: WB.top('mistlake').map(r => `${r.rank}.${r.n}:${r.d}`).join(','), me: (WB.top('mistlake').find(r => r.me) || {}).n, shown: !!el && !el.hidden && /Alice/.test(el.textContent) }; });
  const [ta, tb] = [await topOf(A), await topOf(B)];
  ok('ตารางดาเมจตรงกันทั้งสองเครื่อง', ta.top === tb.top && ta.top === '1.Alice:20000,2.Bobby:1000', `${ta.top} / ${tb.top}`);
  ok('ป้าย Top damage แสดงและรู้ว่าแถวไหนคือตัวเอง', ta.shown && tb.shown && ta.me === 'Alice' && tb.me === 'Bobby', JSON.stringify([ta, tb]));
  ok('ยอดดาเมจรอบนี้เก็บใน nm_wb', await B.evaluate(() => { WB.save(true); const s2 = JSON.parse(localStorage.getItem('nm_wb')).mistlake; return !!(s2 && s2.dmg && Object.values(s2.dmg).some(r => r.n === 'Alice' && r.d === 20000)); }));
  // B ตาย → ฟื้นที่เมือง → กลับมาแผนที่เดิม: บอสยังเลือดเท่าเดิม
  await B.evaluate(async () => { playerDie(); await new Promise(r => setTimeout(r, 200)); respawnPlayer(false); await new Promise(r => setTimeout(r, 300)); changeMap('mistlake', 20, 20); await new Promise(r => setTimeout(r, 1500)); });
  await B.waitForFunction(() => WB.live(), null, { timeout: 8000 }).catch(() => {});
  const hb2 = await B.evaluate(() => WB.live() && WB.live().hp);
  ok('ผู้เล่นตายแล้วกลับมา บอสไม่เลือดเต็ม', hb2 === max - 21000, String(hb2));
  await B.evaluate(() => damageMob(WB.live(), 1)); // B กลับมาร่วมตีต่อ (บอสใหม่ในเครื่อง B ต้องนับว่าร่วมตี)
  // A ปิดฉาก → B เห็นบอสตายและได้ EXP
  const expB = await B.evaluate(() => G.player.baseExp + G.player.baseLv * 1e9);
  await A.evaluate(() => damageMob(WB.live(), 1e9));
  await B.waitForFunction(() => !WB.live(), null, { timeout: 8000 }).catch(() => {});
  const r = await B.evaluate(() => ({ dead: !WB.live(), st: WB.state('mistlake').dead, exp: G.player.baseExp + G.player.baseLv * 1e9 }));
  ok('A ปราบแล้ว บอสตายในเครื่อง B ด้วย', r.dead && r.st);
  ok('B ที่ร่วมตีได้ EXP', r.exp > expB, `${expB} → ${r.exp}`);
  // การ์ดสรุปตอนบอสตาย: ทั้งสองเครื่องเห็นอันดับเดียวกัน (รวมดาเมจปิดฉากของ A ที่ส่งตามหลัง 'dead')
  const resOf = P => P.waitForFunction(() => WB.resultOpen, null, { timeout: 5000 }).then(() => P.waitForTimeout(1200)).catch(() => {})
    .then(() => P.evaluate(() => { const el = document.getElementById('wb-result');
      return { open: !!el && !el.hidden, top: WB.top('mistlake').map(r => `${r.rank}.${r.n}`).join(','), sum: WB.ranking('mistlake').reduce((a, r) => a + r.d, 0), max: MOBS.wb_seraph_pudding.hp, txt: el ? el.textContent : '' }; }));
  const [ra, rb] = [await resOf(A), await resOf(B)];
  ok('การ์ดสรุปดาเมจขึ้นทั้งสองเครื่อง (อันดับตรงกัน)', ra.open && rb.open && ra.top === rb.top && ra.top === '1.Alice,2.Bobby' && /#1/.test(ra.txt) && /#2/.test(rb.txt), `${ra.top} / ${rb.top}`);
  ok('ยอดดาเมจรวมเท่ากันและเท่าเลือดบอส', ra.sum === rb.sum && Math.abs(ra.sum - ra.max) <= 1, `${ra.sum} / ${rb.sum} / ${ra.max}`);
  // ปราบแล้วไม่เกิดซ้ำในรอบเดียวกัน แม้เข้าแผนที่ใหม่
  await B.evaluate(async () => { changeMap('eldheim', 20, 20); await new Promise(r => setTimeout(r, 300)); changeMap('mistlake', 20, 20); await new Promise(r => setTimeout(r, 1500)); });
  ok('ปราบแล้วไม่เกิดซ้ำในรอบเดียวกัน', await B.evaluate(() => !WB.live()));
};
require('./multiplayer.js');
