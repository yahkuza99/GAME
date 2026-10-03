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
  // Rune Paths ใน PvP: สกิลที่ใส่รูน (Shield Throw "Boomerang" ตี 2 ครั้ง) ส่งดาเมจข้ามเครือข่าย • ผู้เล่นไม่ถูกรูนดึงตำแหน่ง
  //   และรูนสวนกลับของฝั่งที่โดนตี (Iron Body "Retaliate") ตีกลับผ่านเครือข่ายด้วย
  await B.evaluate(() => { const pl = G.player; pl.target = null; pl.options.autoCounter = false; pl.skills.iron_body = 5; pl.runes = { iron_body: 'iron_body.retaliate' }; recalc(); pl.hp = pl.d.maxHp; });
  const rb0 = await B.evaluate(() => G.player.hp), ra0 = await A.evaluate(() => { const pl = G.player; pl.target = null; pl.skills.shield_slam = 5; pl.skills.shield_throw = 5; pl.runes = { shield_throw: 'shield_throw.boomerang' }; recalc(); pl.hp = pl.d.maxHp; return pl.hp; });
  const bx0 = await B.evaluate(() => G.player.x);
  await A.evaluate(() => { const pl = G.player, m = G.mobs.find(x => x.isPlayer); pl.sp = pl.d.maxSp; pl.skillReadyAt = 0; pl.cds = {}; executeSkill('shield_throw', 5, m); });
  await B.waitForFunction(h => G.player.hp < h, rb0, { timeout: 15000 }).catch(() => {});
  await B.waitForTimeout(1500);
  const rb1 = await B.evaluate(() => ({ hp: G.player.hp, x: G.player.x }));
  ok('PvP: rune skill (Boomerang) damages the other player', rb1.hp < rb0, `${rb0} → ${rb1.hp}`);
  ok('PvP: runes never drag another player', Math.abs(rb1.x - bx0) < 0.01);
  await A.waitForFunction(h => G.player.hp < h, ra0, { timeout: 15000 }).catch(() => {});
  ok('PvP: Retaliate rune strikes back over the network', await A.evaluate(h => G.player.hp < h, ra0), `${ra0} → ${await A.evaluate(() => G.player.hp)}`);
  await A.evaluate(() => { G.player.runes = {}; G.player.target = null; recalc(); });
  await B.evaluate(() => { G.player.runes = {}; recalc(); });
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
