const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
// Player must finish a swing before walking (no sliding while the attack pose plays).
const root=path.join(__dirname,'..');
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.end(d);}});}).listen(0,async()=>{
const b=await chromium.launch({executablePath:process.env.CHROME});const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('https://**/*',r=>r.abort());
await p.goto(`http://localhost:${srv.address().port}/index.html`);await p.waitForTimeout(1500);
await p.click('#au-offline');await p.click('#btn-new');await p.fill('#cr-name','Sw');await p.click('#cr-start');
await p.waitForFunction(()=>G.started,null,{timeout:20000});await p.waitForTimeout(800);
const r=await p.evaluate(()=>{const pl=G.player;pl.x=Math.floor(pl.x)+.5;pl.y=Math.floor(pl.y)+.5;
 // swing just started, then player clicks ground 3 tiles away
 pl.atkAnim=1;let tx=Math.floor(pl.x),ty=Math.floor(pl.y);for(const [dx,dy] of [[3,0],[-3,0],[0,3],[0,-3]]){if(G.map.walkable(tx+dx,ty+dy)){tx+=dx;ty+=dy;break;}}
 pl.path=findPath(G.map,Math.floor(pl.x),Math.floor(pl.y),tx,ty);const x0=pl.x,y0=pl.y,out=[];
 for(let i=0;i<30;i++){updateGame(1/60);out.push({a:+pl.atkAnim.toFixed(2),mv:Math.hypot(pl.x-x0,pl.y-y0)>0.001,moving:pl.moving});}
 return {pathLen:pl.path.length,during:out.filter(o=>o.a>0).some(o=>o.mv||o.moving),after:out.filter(o=>o.a===0).some(o=>o.mv),n:out.filter(o=>o.a>0).length};});
console.log(JSON.stringify(r),'errors',errs.slice(0,3));
const ok=!r.during&&r.after&&!errs.length;console.log(ok?"ALL 1 PASSED":"FAIL swing lock");process.exitCode=ok?0:1;await b.close();srv.close();});
