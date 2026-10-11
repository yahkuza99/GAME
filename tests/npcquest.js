const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
// คุย NPC เพื่อส่ง/รับเควสต์แล้ว ไม่ต้องขึ้นเมนูบริการทั่วไป (Mimir ถามรีเซ็ต) — เจ้าของ 2026-10-12
const root=path.join(__dirname,'..');
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.end(d);}});}).listen(0,async()=>{
const b=await chromium.launch({executablePath:process.env.CHROME});const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('https://**/*',r=>r.abort());
await p.goto(`http://localhost:${srv.address().port}/index.html`,{timeout:120000});await p.waitForSelector('#au-offline',{state:'visible',timeout:120000});
await p.click('#au-offline');await p.click('#btn-new');await p.fill('#cr-name','Np');await p.click('#cr-start');
await p.waitForFunction(()=>G.started,null,{timeout:120000});await p.waitForTimeout(800);
await p.evaluate(()=>{changeJob('einherjar');UI.dlgClose&&UI.dlgClose();changeMap('eldheim');});await p.waitForFunction(()=>G.npcs&&G.npcs.some(n=>n.id==='jobmaster'),null,{timeout:60000});
const r=await p.evaluate(async()=>{const out={};const n=G.npcs.find(x=>x.id==='jobmaster');const txt=()=>(document.querySelector('#w-dialog')||{}).textContent||'';
 const s0=Side.npcTalk;Side.npcTalk=async()=>true;NPC.talk(n);await new Promise(r=>setTimeout(r,600));out.noResetAfterQuest=!/รีเซ็ตสกิล|Reset Skills/.test(txt());
 await new Promise(r=>setTimeout(r,300));UI.dlgClose&&UI.dlgClose();NPC.busy=false;
 Side.npcTalk=async()=>false;NPC.talk(n);await new Promise(r=>setTimeout(r,600));out.resetMenuNormally=/รีเซ็ตสกิล|Reset Skills/.test(txt());
 Side.npcTalk=s0;return out;});
console.log(JSON.stringify(r),'errors',errs.slice(0,3));
const ok=r.noResetAfterQuest&&r.resetMenuNormally&&!errs.length;
console.log(ok?"ALL 2 PASSED":"FAIL npcquest");process.exitCode=ok?0:1;await b.close();srv.close();});
