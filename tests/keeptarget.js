const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
// เดินเอง (จอย/คลิกพื้น) แล้วกดตี/สกิล → ต้องใช้ "เป้าเดิม" ไม่ใช่ตัวใกล้สุด (เจ้าของ 2026-10-11)
const root=path.join(__dirname,'..');
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.end(d);}});}).listen(0,async()=>{
const b=await chromium.launch({executablePath:process.env.CHROME});const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('https://**/*',r=>r.abort());
await p.goto(`http://localhost:${srv.address().port}/index.html`,{timeout:120000});await p.waitForSelector('#au-offline',{state:'visible',timeout:120000});
await p.click('#au-offline');await p.click('#btn-new');await p.fill('#cr-name','Kt');await p.click('#cr-start');
await p.waitForFunction(()=>G.started,null,{timeout:120000});await p.waitForTimeout(800);
await p.evaluate(()=>{changeJob('einherjar');UI.dlgClose&&UI.dlgClose();changeMap('meadow');});await p.waitForFunction(()=>G.mobs.filter(m=>!m.dead&&!m.def.dummy).length>=2,null,{timeout:60000});
const r=await p.evaluate(()=>{const pl=G.player;const ms=G.mobs.filter(m=>!m.dead&&!m.def.dummy);if(ms.length<2)return{skip:'mobs '+ms.length};
 const [A,B]=ms;pl.x=Math.floor(pl.x)+.5;pl.y=Math.floor(pl.y)+.5;
 A.x=pl.x+6;A.y=pl.y;B.x=pl.x+1.5;B.y=pl.y+0.5;for(const m of [A,B]){m.state='idle';m.path=[];}
 const out={};
 pl.target=A;G.time=Math.max(G.time,(pl.kbAt||0)+1);stepMove(0,1);out.clearedChase=pl.target===null;
 Pad.interact();out.attackKeepsOld=pl.target===A;
 pl.target=null;out.skillAimOld=skillLockTarget()===A;
 A.dead=true;out.deadFallsBackToNearest=skillLockTarget()===B;A.dead=false;
 pl.target=B;mapWalkTo(Math.floor(pl.x),Math.floor(pl.y)+1);pl.target=null;out.newPickRemembered=skillLockTarget()===B;
 return out;});
console.log(JSON.stringify(r),'errors',errs.slice(0,3));
const ok=!r.skip&&r.clearedChase&&r.attackKeepsOld&&r.skillAimOld&&r.deadFallsBackToNearest&&r.newPickRemembered&&!errs.length;
console.log(ok?"ALL 5 PASSED":"FAIL keep-target");process.exitCode=ok?0:1;await b.close();srv.close();});
