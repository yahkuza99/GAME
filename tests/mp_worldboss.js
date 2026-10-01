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
  // ปราบแล้วไม่เกิดซ้ำในรอบเดียวกัน แม้เข้าแผนที่ใหม่
  await B.evaluate(async () => { changeMap('eldheim', 20, 20); await new Promise(r => setTimeout(r, 300)); changeMap('mistlake', 20, 20); await new Promise(r => setTimeout(r, 1500)); });
  ok('ปราบแล้วไม่เกิดซ้ำในรอบเดียวกัน', await B.evaluate(() => !WB.live()));
};
require('./multiplayer.js');
