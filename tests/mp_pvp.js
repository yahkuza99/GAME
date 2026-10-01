// PvP 2 ผู้เล่น (Supabase ปลอม): เข้าลานประลอง เห็นเป็นเป้า ตีโดน เลือดลดฝั่งโดนตี ล้มแล้วนับฆ่า/ล้ม ไม่เสีย EXP
globalThis.EXTRA = async (A, B, ok) => {
  for (const P of [A, B]) await P.evaluate(async () => { const pl = G.player; pl.job = FIRST_JOBS[0]; pl.baseLv = 20; pl.stats.str = 30; recalc(); pl.hp = pl.d.maxHp; changeMap('arena', 17, 17); await new Promise(r => setTimeout(r, 300)); });
  await A.evaluate(() => teleportPlayer(16, 17)); await B.evaluate(() => teleportPlayer(17.2, 17));
  await A.waitForFunction(() => G.mobs.some(m => m.isPlayer), null, { timeout: 20000 }).catch(() => {});
  const tg = await A.evaluate(() => G.mobs.filter(m => m.isPlayer).map(m => m.def.name));
  ok('A เห็น B เป็นเป้าในลานประลอง', tg.includes('Bobby'), JSON.stringify(tg));
  const hp0 = await B.evaluate(() => G.player.hp);
  const exp0 = await B.evaluate(() => G.player.baseExp);
  await A.evaluate(() => { const m = G.mobs.find(m => m.isPlayer); G.player.target = m; });
  await B.waitForFunction(h => G.player.hp < h, hp0, { timeout: 30000 }).catch(() => {});
  await B.waitForTimeout(1500);
  const hp1 = await B.evaluate(() => G.player.hp);
  ok('B โดนตีเลือดลด', hp1 < hp0, `${hp0} → ${hp1}`);
  ok('B โจมตีกลับอัตโนมัติ', await B.evaluate(() => !!(G.player.target && G.player.target.isPlayer)));
  // ให้ B เลือดเหลือน้อยแล้วโดนตีจนล้ม
  await B.evaluate(() => { G.player.hp = 5; G.player.target = null; G.player.options.autoCounter = false; });
  await A.evaluate(() => { G.player.target = G.mobs.find(m => m.isPlayer) || null; });
  await B.waitForFunction(() => G.player.dead, null, { timeout: 30000 }).catch(() => {});
  const st = await B.evaluate(() => ({ dead: G.player.dead, pvp: G.player.pvp, exp: G.player.baseExp }));
  ok('B ล้มในลานประลอง', st.dead, JSON.stringify(st));
  ok('B ไม่เสีย EXP', st.exp === exp0, `${exp0} → ${st.exp}`);
  ok('B นับล้ม 1', st.pvp && st.pvp.d === 1, JSON.stringify(st.pvp));
  await A.waitForFunction(() => (G.player.pvp || {}).k === 1, null, { timeout: 15000 }).catch(() => {});
  ok('A นับฆ่า 1', await A.evaluate(() => (G.player.pvp || {}).k === 1), JSON.stringify(await A.evaluate(() => G.player.pvp)));
  ok('แถบ PvP แสดง', await A.evaluate(() => !document.querySelector('#pvp-hud').hidden && /ฆ่า/.test(document.querySelector('#pvp-hud').textContent)));
  await A.screenshot({ path: '/tmp/claude-0/-home-user-GAME/0dd6dfaf-a882-5a62-be74-1aa6c490590e/scratchpad/pvp-A.png' });
  // นอกลานประลองตีกันไม่ได้
  for (const P of [A, B]) await P.evaluate(async () => { if (G.player.dead) respawnPlayer(true); changeMap('meadow', 22.5, 29.1); await new Promise(r => setTimeout(r, 300)); });
  await A.waitForTimeout(2000);
  ok('นอกลานประลองไม่มีเป้าผู้เล่น', await A.evaluate(() => !G.mobs.some(m => m.isPlayer)));
};
require('./multiplayer.js');
