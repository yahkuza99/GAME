// แกลเลอรีท่าทางตัวละคร (js/pose.js): ทุกคลาส (คลาสแรก + คลาสขั้น 2) × ทุกชนิดอาวุธที่ใช้ได้
// วาดเป็นแถบเฟรม: ยืน / เดิน (ข้าง) / เดิน (หน้า) / โจมตี (ข้าง) / โจมตี (เฉียง) / ร่าย / นั่ง / สะดุ้ง+ล้ม
// ใช้: NODE_PATH=$(npm root -g) node tests/pose_gallery.js   (ต้องมีเซิร์ฟเวอร์ — BASE=http://localhost:8809/index.html)
//      OUT=โฟลเดอร์ผลลัพธ์ (ค่าเริ่มต้น /tmp/pose_gallery) • JOBS=einherjar,valkyrie (เฉพาะบางคลาส) • GFX=low • ZOOM=2 • OFF=1 (ปิด pose เทียบท่าเดิม)
// ผลลัพธ์: <job>.png (แถว = อาวุธ × ท่า, คอลัมน์ = เฟรม) + strip ของแต่ละท่าใน <job>/<wtype>_<action>.png
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const OUT = process.env.OUT || '/tmp/pose_gallery';
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 680 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.stack.split('\n').slice(0, 2).join(' | ')));
  await p.goto(process.env.BASE || 'http://localhost:8809/index.html'); await p.waitForTimeout(1500);
  await p.click('#au-offline'); await p.click('#btn-new'); await p.fill('#cr-name', 'Gallery'); await p.click('#cr-start'); await p.waitForTimeout(1500);
  await p.click('#prologue-skip', { timeout: 3000 }).catch(() => {});
  await p.waitForTimeout(800);
  const jobs = process.env.JOBS ? process.env.JOBS.split(',') : (await p.evaluate(() => FIRST_JOBS.flatMap(j => [j, ...SECOND_JOBS[j]])));
  for (const job of jobs) {
    const res = await p.evaluate(({ job, gfx, zoom, off }) => {
      window.frame = () => {}; // หยุดลูปจริง → เดินเวลาเอง
      if (gfx) R.setQuality(gfx);
      if (off) Pose.on = false;
      const Z = zoom, CW = 92 * Z, CH = 96 * Z, NF = 12;
      // อาวุธที่คลาสนี้ใช้ได้ (ชิ้นแรกของแต่ละชนิด)
      const root = jobRoot(job), wts = {};
      for (const id in ITEMS) {
        const it = ITEMS[id]; if (it.slot !== 'weapon' || !it.wtype || wts[it.wtype]) continue;
        const js = it.jobs === 'all' ? null : it.jobs; if (js && !js.includes(job) && !js.includes(root)) continue;
        wts[it.wtype] = id;
      }
      const shieldOk = root === 'einherjar';
      const ACTS = [['idle', 1], ['walk', 0], ['walkS', 2], ['attack', 0], ['attackSE', 1], ['cast', 1], ['sit', 1], ['hurtdie', 3]];
      const rows = [], strips = [];
      let gi = 0;
      for (const [wt, wid] of Object.entries(wts)) {
        const gender = gi++ % 2 ? 'm' : 'f';
        for (const [act, dir] of ACTS) {
          const c = document.createElement('canvas'); c.width = CW * NF; c.height = CH;
          const g = c.getContext('2d');
          g.fillStyle = '#3c5a34'; g.fillRect(0, 0, c.width, c.height);
          const delay = 0.62;
          const fake = {
            x: 0, y: 0, job, gender, hair: '#c8ccd4', look: null, facing: dir === 3 ? -1 : 1, dir, moving: false, sitting: false, dead: false,
            atkAnim: 0, hurtFlash: 0, buffs: {}, cast: null, stunUntil: 0,
            equip: { weapon: { id: wid }, head: null, garment: null, shield: shieldOk && wt !== 'bow' ? { id: 'guard' } : null },
            d: { aspdDelay: delay * 1000, range: wt === 'bow' ? 5 : 1.5 },
          };
          let T = 100 + gi * 7, dt = 1 / 24, atkDone = false;
          G.time = T;
          if (act.startsWith('walk')) { fake.moving = true; dt = 0.6 / NF; }
          if (act.startsWith('attack')) { fake.target = { x: wt === 'bow' ? 4 : 1, y: 0, dead: false }; fake.nextAttack = T + 0.3; dt = (delay + 0.12) / NF; }
          if (act === 'cast') { fake.cast = { start: T, end: T + 1.5 }; dt = 1.5 / NF; }
          if (act === 'hurtdie') dt = 1 / 14;
          if (act === 'sit') { fake.sitting = true; dt = 0.12; }
          // อุ่นเครื่อง (ให้ความจำท่าตั้งตัว)
          for (let i = 0; i < 6; i++) { T += dt / 2; G.time = T; g.save(); g.translate(-999, -999); Sprites.drawPlayer(g, fake, T); g.restore(); }
          for (let f = 0; f < NF; f++) {
            if (act.startsWith('attack') && !atkDone && G.time >= fake.nextAttack) { fake.atkAnim = 1; atkDone = true; fake.nextAttack = G.time + delay; }
            if (act === 'hurtdie') { if (f === 1) fake.hurtFlash = 0.15; if (f === 6) fake.dead = true; }
            g.save(); g.beginPath(); g.rect(f * CW, 0, CW, CH); g.clip();
            g.translate(f * CW + CW / 2, CH - 14 * Z); g.scale(Z, Z);
            // เส้นพื้น + จุดยืน
            g.strokeStyle = 'rgba(255,255,255,0.15)'; g.lineWidth = 1 / Z; g.beginPath(); g.moveTo(-46, 0); g.lineTo(46, 0); g.stroke();
            Sprites.drawPlayer(g, fake, T);
            g.restore();
            g.fillStyle = 'rgba(255,255,255,0.5)'; g.font = `${9 * Z / 2 + 4}px monospace`; g.fillText(String(f), f * CW + 3, 11);
            T += dt; G.time = T;
            fake.atkAnim = Math.max(0, fake.atkAnim - dt * 4); fake.hurtFlash = Math.max(0, fake.hurtFlash - dt);
          }
          rows.push({ label: `${wt} · ${act} (${gender})`, c });
          strips.push({ name: `${wt}_${act}`, url: c.toDataURL('image/png') });
        }
      }
      // แผ่นรวม
      const LW = 150, S = document.createElement('canvas'); S.width = LW + CW * NF; S.height = rows.length * CH;
      const sg = S.getContext('2d'); sg.fillStyle = '#1a2230'; sg.fillRect(0, 0, S.width, S.height);
      rows.forEach((r, i) => { sg.drawImage(r.c, LW, i * CH); sg.fillStyle = '#fff'; sg.font = '13px sans-serif'; sg.fillText(r.label, 6, i * CH + CH / 2); });
      Pose.on = true;
      return { sheet: S.toDataURL('image/png'), strips, wts: Object.keys(wts) };
    }, { job, gfx: process.env.GFX || '', zoom: +(process.env.ZOOM || 2), off: !!process.env.OFF });
    const dir = path.join(OUT, job); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(OUT, `${job}.png`), Buffer.from(res.sheet.split(',')[1], 'base64'));
    for (const s of res.strips) fs.writeFileSync(path.join(dir, `${s.name}.png`), Buffer.from(s.url.split(',')[1], 'base64'));
    console.log(job, res.wts.join(','));
  }
  if (errs.length) console.log('ERRORS:\n' + errs.join('\n'));
  await b.close();
})();
