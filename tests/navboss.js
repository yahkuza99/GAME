const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
// หน้านำทาง แท็บบอส: MVP ทุกแผนที่ + Ancient พร้อมสถานะเกิด/นับถอยหลัง (เจ้าของ 2026-10-11)
const root=path.join(__dirname,'..');
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.end(d);}});}).listen(0,async()=>{
const b=await chromium.launch({executablePath:process.env.CHROME});const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('https://**/*',r=>r.abort());
await p.goto(`http://localhost:${srv.address().port}/index.html`,{timeout:120000});await p.waitForSelector('#au-offline',{state:'visible',timeout:120000});
await p.click('#au-offline');await p.click('#btn-new');await p.fill('#cr-name','Bs');await p.click('#cr-start');
await p.waitForFunction(()=>G.started,null,{timeout:120000});await p.waitForTimeout(800);
await p.evaluate(()=>{changeJob('einherjar');UI.dlgClose&&UI.dlgClose();changeMap('meadow');});await p.waitForFunction(()=>G.mobs.filter(m=>!m.dead&&!m.def.dummy).length>=2,null,{timeout:60000});
const r=await p.evaluate(()=>{const out={};UI.navTab='boss';UI.open('w-nav');UI.renderNav();
 const rows=[...document.querySelectorAll('#w-nav .boss-row')];out.n=rows.length;
 const mvps=Object.keys(MAP_DEFS).filter(k=>MAP_DEFS[k].mvp&&MOBS[MAP_DEFS[k].mvp]).length;out.mvps=mvps;
 out.hasWb=rows.some(r=>/ANCIENT/.test(r.textContent));out.status=rows.every(r=>/(อยู่|พร้อมเกิด|เกิดใน|Alive|Ready|Respawns|Up|Spawns)/.test(r.textContent));
 G.player.mvpAt=G.player.mvpAt||{};const k=Object.keys(MAP_DEFS).find(k=>MAP_DEFS[k].mvp&&MOBS[MAP_DEFS[k].mvp]&&k!==G.map.id);G.player.mvpAt[k]=Date.now()+600e3;
 document.querySelector('#w-nav .win-body').dataset.key='';UI.renderNav();out.rowsTxt=[...document.querySelectorAll('#w-nav .boss-row')].map(r=>r.textContent.slice(0,80));out.countdown=out.rowsTxt.some(t=>/(เกิดใน|Respawns in) \d+:\d\d/.test(t));
 const r0=document.querySelector('#w-nav .boss-row');r0.click();out.nav=!!Nav.target;return out;});
console.log(JSON.stringify(r),'errors',errs.slice(0,3));
const ok=r.n>=r.mvps+1&&r.hasWb&&r.status&&r.countdown&&r.nav&&!errs.length;
console.log(ok?"ALL 5 PASSED":"FAIL navboss");process.exitCode=ok?0:1;await b.close();srv.close();});
