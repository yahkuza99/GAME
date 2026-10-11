const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
// บั๊กจากรอบตรวจ Sonnet 2026-10-11: หน้าไอเทมแคชค้างหลังใส่ Hunt Rune · เงิน NaN ซื้อรูนฟรี · ราคาเปลี่ยนระหว่างยืนยัน
const root=path.join(__dirname,'..');
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.end(d);}});}).listen(0,async()=>{
const b=await chromium.launch({executablePath:process.env.CHROME});const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('https://**/*',r=>r.abort());
await p.goto(`http://localhost:${srv.address().port}/index.html`,{timeout:120000});await p.waitForSelector('#au-offline',{state:'visible',timeout:120000});
await p.click('#au-offline');await p.click('#btn-new');await p.fill('#cr-name','Bf');await p.click('#cr-start');
await p.waitForFunction(()=>G.started,null,{timeout:120000});await p.waitForTimeout(800);
await p.evaluate(()=>{changeJob('einherjar');UI.dlgClose&&UI.dlgClose();changeMap('meadow');});await p.waitForFunction(()=>G.mobs.filter(m=>!m.dead&&!m.def.dummy).length>=2,null,{timeout:60000});
const r=await p.evaluate(()=>{const pl=G.player,out={};
 pl.baseLv=40;pl.zeny=1e6;HuntRunes.buy('hr_slay_brute');UI.open('w-inv');UI.invTab='hrune';UI.selItem=null;UI.renderInv();
 const before=document.querySelector('#w-inv .win-body').textContent;out.setOk=HuntRunes.set(0,'hr_slay_brute',true);UI.renderInv();
 const after=document.querySelector('#w-inv .win-body').textContent;out.invUpdates=before!==after;UI.close('w-inv');
 const rid=Object.keys(Runes.BY_ID).find(k=>!RuneShop.ownsSkill(k));
 pl.zeny=NaN;out.nanRefused=RuneShop.buy('skill',rid)===false&&!RuneShop.ownsSkill(rid);
 pl.zeny=1e6;const q=RuneShop.quote('skill',rid);out.priceGuard=RuneShop.buy('skill',rid,q.price-1)===false&&pl.zeny===1e6;
 out.okBuy=RuneShop.buy('skill',rid,q.price)===true&&pl.zeny===1e6-q.price;
 return out;});
console.log(JSON.stringify(r),'errors',errs.slice(0,3));
const ok=r.invUpdates&&r.nanRefused&&r.priceGuard&&r.okBuy&&!errs.length;
console.log(ok?"ALL 4 PASSED":"FAIL bugfix1011");process.exitCode=ok?0:1;await b.close();srv.close();});
