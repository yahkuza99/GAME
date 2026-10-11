const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
// ล่าตามเควสต์ (Bot.only): ลำดับเป้า — มอนเควสต์ที่ตีเรา > ตัวอื่นที่ตีถึงตัว > ไม่ไล่ตัวอื่นที่ยังไม่ถึง (เจ้าของ 2026-10-11 "ใช้ priority ให้ดี")
const root=path.join(__dirname,'..');
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.end(d);}});}).listen(0,async()=>{
const b=await chromium.launch({executablePath:process.env.CHROME});const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('https://**/*',r=>r.abort());
await p.goto(`http://localhost:${srv.address().port}/index.html`,{timeout:120000});await p.waitForSelector('#au-offline',{state:'visible',timeout:120000});
await p.click('#au-offline');await p.click('#btn-new');await p.fill('#cr-name','Hp');await p.click('#cr-start');
await p.waitForFunction(()=>G.started,null,{timeout:120000});await p.waitForTimeout(800);
await p.evaluate(()=>{changeJob('einherjar');UI.dlgClose&&UI.dlgClose();changeMap('meadow');});await p.waitForFunction(()=>G.mobs.filter(m=>!m.dead&&!m.def.dummy).length>=2,null,{timeout:60000});
const r=await p.evaluate(()=>{const pl=G.player;const ms=G.mobs.filter(m=>!m.dead&&!m.def.dummy);
 const byType={};for(const m of ms)(byType[m.def.id]=byType[m.def.id]||[]).push(m);const ids=Object.keys(byType);if(ids.length<2)return{skip:'types '+ids.length};
 const Q=byType[ids[0]][0],O=byType[ids[1]][0];const c=Bot.cfg();pl.x=Math.floor(pl.x)+.5;pl.y=Math.floor(pl.y)+.5;Bot.only=Q.def.id;const out={};
 Q.x=pl.x+1;Q.y=pl.y;O.x=pl.x-1;O.y=pl.y;for(const m of [Q,O]){m.state='chase';m.path=[];}
 out.questFirstWhenBothHit=Bot.pickTarget([Q,O],c,80)===Q;
 out.survivalWhenLowHp=Bot.pickTarget([Q,O],c,30)!==undefined;
 O.x=pl.x-6;out.ignoreFarOtherChaser=Bot.pickTarget([O],c,80)!==O;
 O.x=pl.x-1;out.fightBackAdjacentOther=Bot.pickTarget([O],c,80)===O;
 Bot.only=null;O.x=pl.x-6;out.normalBotStillChasesFar=Bot.pickTarget([O],c,80)===O;
 return out;});
console.log(JSON.stringify(r),'errors',errs.slice(0,3));
const ok=!r.skip&&r.questFirstWhenBothHit&&r.survivalWhenLowHp&&r.ignoreFarOtherChaser&&r.fightBackAdjacentOther&&r.normalBotStillChasesFar&&!errs.length;
console.log(ok?"ALL 5 PASSED":"FAIL hunt-priority");process.exitCode=ok?0:1;await b.close();srv.close();});
