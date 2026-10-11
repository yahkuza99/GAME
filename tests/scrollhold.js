const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
// เลื่อนหน้าต่างแล้วไม่เด้งกลับ: ระหว่างเลื่อน (≤0.8 วิ) การวาดใหม่อัตโนมัติรอก่อน (เจ้าของ 2026-10-11)
const root=path.join(__dirname,'..');
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.end(d);}});}).listen(0,async()=>{
const b=await chromium.launch({executablePath:process.env.CHROME});const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('https://**/*',r=>r.abort());
await p.goto(`http://localhost:${srv.address().port}/index.html`,{timeout:120000});await p.waitForSelector('#au-offline',{state:'visible',timeout:120000});
await p.click('#au-offline');await p.click('#btn-new');await p.fill('#cr-name','Sc');await p.click('#cr-start');
await p.waitForFunction(()=>G.started,null,{timeout:120000});await p.waitForTimeout(800);
await p.evaluate(()=>{changeJob('einherjar');UI.dlgClose&&UI.dlgClose();changeMap('meadow');});await p.waitForFunction(()=>G.mobs.filter(m=>!m.dead&&!m.def.dummy).length>=2,null,{timeout:60000});
const r=await p.evaluate(async()=>{const pl=G.player,out={};for(const id of Object.keys(ITEMS).filter(k=>ITEMS[k].type==='etc').slice(0,80))addItem(id,1,true);
 UI.invTab='etc';UI.open('w-inv');UI.renderWindows(true);const sc=[...document.querySelectorAll('#w-inv .win-body *')].find(e=>e.scrollHeight>e.clientHeight+20&&/(auto|scroll)/.test(getComputedStyle(e).overflowY));out.hasScroll=!!sc;if(!sc)return out;
 const first=sc.firstElementChild;const T=Math.max(10,Math.floor((sc.scrollHeight-sc.clientHeight)/2));out.T=T;sc.scrollTop=T;sc.dispatchEvent(new Event('scroll',{bubbles:true}));
 UI.dirty();UI.renderWindows();out.sameDom=sc.isConnected&&sc.firstElementChild===first;out.keptScroll=Math.abs(sc.scrollTop-T)<=2;out.stillDirty=UI.isDirty;
 await new Promise(r=>setTimeout(r,950));UI.renderWindows();const sc2=[...document.querySelectorAll('#w-inv .win-body *')].find(e=>e.scrollHeight>e.clientHeight+20&&/(auto|scroll)/.test(getComputedStyle(e).overflowY));
 out.renderedLater=!UI.isDirty;out.scrollAfter=sc2?sc2.scrollTop:-1;return out;});
console.log(JSON.stringify(r),'errors',errs.slice(0,3));
const ok=r.hasScroll&&r.sameDom&&r.keptScroll&&r.stillDirty&&r.renderedLater&&Math.abs(r.scrollAfter-r.T)<=2&&!errs.length;
console.log(ok?"ALL 5 PASSED":"FAIL scrollhold");process.exitCode=ok?0:1;await b.close();srv.close();});
