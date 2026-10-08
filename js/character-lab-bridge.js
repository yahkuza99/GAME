'use strict';
if (window.CHARACTER_LAB) window.addEventListener('load', () => {
  const style=document.createElement('style');style.textContent='#title,#hud,.window,#prologue,#story-overlay{display:none!important}';document.head.append(style);
  Online.enabled=true;Online.local=true;Online.username='character_lab';Online.user={local:true,id:'character_lab'};
  Online.lsSet(Online.LS.accounts,{character_lab:{gmTester:true}});
  Acct.data=Acct.wrap(null);
  const p=newPlayer('Character Lab','f','#e8d8b0');p.options.sound=false;p.options.autoCounter=false;p.options.skillLock=false;p.options.noShift=false;
  startGame(p,false);Bot.toggle(false);Nav.cancel();G.npcs=[];G.mobs=[];G.respawns=[];
  let pose='live', direction=2, speed=1, infinite=false, invincible=false, paused=false, scene='studio', noCooldown=true, previewActor=null;
  const messages=[],message=UI.msg;UI.msg=function(text,...args){messages.push(String(text));if(messages.length>30)messages.shift();return message.call(this,text,...args);};
  const originalUpdate=updateGame;
  window.updateGame=function(dt){if(!paused)originalUpdate(dt*speed);if(infinite)p.sp=p.d.maxSp;if(noCooldown){p.cds={};p.cdTot={};p.skillReadyAt=0;}if(invincible){p.dead=false;p.hp=p.d.maxHp;}G.respawns=[];};
  const draw=Sprites.drawPlayer;
  Sprites.drawPlayer=function(g,actor,t){if(actor!==p||pose==='live')return draw.call(this,g,actor,t);
    const a=previewActor||(previewActor=Object.assign({},actor,{_an:null}));const track=a._an;
    Object.assign(a,actor,{x:actor.x,y:actor.y,dir:direction,facing:direction>=3&&direction<=5?-1:1,moving:pose==='walk',sitting:pose==='sit',dead:pose==='dead',atkAnim:pose==='attack'?Math.max(.01,1-(t*speed% .6)/.6):0,cast:null,skillPose:null,hurtFlash:pose==='hurt'?.2:0,_an:track,walkTime:t*speed});
    return draw.call(this,g,a,t*speed);
  };
  const render=R.render;
  R.render=()=>{if(scene==='map')return render();const g=R.g,t=G.time;
    g.setTransform(R.dpr,0,0,R.dpr,0,0);g.fillStyle='#101e29';g.fillRect(0,0,R.W,R.H);
    R.camX=p.x*TILE-R.W/R.zoom/2;R.camY=p.y*TILE*R.K-R.H/R.zoom/2-35;
    g.save();g.scale(R.zoom,R.zoom);g.translate(-R.camX,-R.camY);
    g.strokeStyle='#24414c';g.lineWidth=.5;
    for(let x=Math.floor(R.camX/TILE)*TILE;x<R.camX+R.W/R.zoom;x+=TILE){g.beginPath();g.moveTo(x,R.camY);g.lineTo(x,R.camY+R.H/R.zoom);g.stroke();}
    for(let y=Math.floor(R.camY/(TILE*R.K))*TILE*R.K;y<R.camY+R.H/R.zoom;y+=TILE*R.K){g.beginPath();g.moveTo(R.camX,y);g.lineTo(R.camX+R.W/R.zoom,y);g.stroke();}
    if(typeof Class3!=='undefined')for(const f of G.fx)if(f.ground)Class3.drawGround(g,f,t);
    if(pose==='live')for(const f of G.fx)if(f.groundLayer)R.drawFx(g,f,t);
    const actors=[{y:p.y,draw:()=>Sprites.drawPlayer(g,p,t)}];
    if(pose==='live'){for(const m of G.mobs)actors.push({y:m.y,draw:()=>Sprites.drawMob(g,m,t)});for(const a of G.allies)actors.push({y:a.y,draw:()=>Sprites.drawAlly(g,a,t)});}
    for(const a of actors.sort((a,b)=>a.y-b.y)){g.save();g.translate(0,a.y*TILE*(R.K-1));a.draw();g.restore();}
    if(pose==='live')for(const f of G.fx)if(!f.groundLayer)R.drawFx(g,f,t);
    g.restore();
  };
  const bounded=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||min));
  const state=()=>({job:p.job,gender:p.gender,baseLv:p.baseLv,jobLv:p.jobLv,zeny:p.zeny,stats:{...p.stats},hp:p.hp,maxHp:p.d.maxHp,sp:p.sp,maxSp:p.d.maxSp,cast:p.cast?.id||null,targetHP:G.mobs[0]?.hp??null,allies:G.allies.length,fx:G.fx.length,pose,paused,noCooldown,skills:Object.entries(p.skills).filter(([id])=>SKILLS[id]).map(([id,lv])=>({id,name:SKILLS[id].name,type:SKILLS[id].type,current:JOBS[p.job].skills.includes(id),owner:Object.keys(JOBS).find(job=>JOBS[job].skills.includes(id))||'novice',icon:Art.get('skill_'+id)?.src||null,lv,max:SKILLS[id].max,target:SKILLS[id].target,cooldown:skillCdLeft(id),runes:Runes.list(id).map(r=>({id:r.id,name:r.name})),rune:p.runes[id]||null})),equipment:Object.fromEntries(Object.entries(p.equip).map(([k,v])=>[k,v?.id||null]))});
  const clear=()=>{GM.command('/gm clear');G.drops=[];G.npcs=[];G.respawns=[];};
  const target=()=>{clear();const pos=G.map.nearestWalkable(p.x+1,p.y);const m=spawnMob('training_dummy',{x:Math.floor(pos.x),y:Math.floor(pos.y)});m.hp=m.maxHp=10000000;return m;};
  const tier=id=>Object.values(THIRD_JOBS).includes(id)?3:Object.values(SECOND_JOBS).flat().includes(id)?2:id==='novice'?0:1;
  const api={
    messages:()=>messages.slice(),
    level(id,value){if(!(id in p.skills)||!SKILLS[id])throw Error('Unknown learned skill');p.skills[id]=Math.trunc(bounded(value,0,SKILLS[id].max));recalc();return state();},
    catalog:()=>({jobs:Object.entries(JOBS).map(([id,j])=>({id,name:j.name,thai:j.thai,parent:j.parent||null,tier:tier(id)})),items:Object.entries(ITEMS).map(([id,i])=>({id,name:i.name,type:i.type})),mobs:Object.entries(MOBS).map(([id,m])=>({id,name:m.name})),maps:Object.entries(MAP_DEFS).map(([id,m])=>({id,name:m.name})),commands:GM.help}),
    state,
    build(job,gender){if(!JOBS[job])throw Error('Unknown class');previewActor=null;p.dead=false;p.buffs={};p.rb={};p.skillPose=null;p._bowPose=null;G.allies=[];G.zones=[];G.traps=[];p.gender=gender==='m'?'m':'f';if(job==='novice'){clear();p.skills={first_aid:1,basic_training:9};changeJob(job);}else GM.command('/gm class'+tier(job)+' '+job);p.options.autoCounter=false;p.options.noShift=false;p.options.skillLock=false;clear();target();return state();},
    numbers(values){p.baseLv=Math.trunc(bounded(values.baseLv,1,MAX_BASE_LV));p.jobLv=Math.trunc(bounded(values.jobLv,1,99));p.zeny=Math.trunc(bounded(values.zeny,0,100000000));for(const k of Object.keys(p.stats))if(k in values)p.stats[k]=Math.trunc(bounded(values[k],1,99));recalc();p.hp=p.d.maxHp;p.sp=p.d.maxSp;return state();},
    pose(action,dir){if(!['live','idle','walk','attack','hurt','sit','dead'].includes(action))throw Error('Unknown pose');pose=action;previewActor=null;direction=bounded(dir,0,7);p.dir=direction;p.path=[];return state();},
    options(o){infinite=!!o.infinite;if('noCooldown' in o)noCooldown=!!o.noCooldown;invincible=!!o.invincible;paused=!!o.paused;scene=o.scene==='map'?'map':'studio';speed=bounded(o.speed,.25,2);p.options.sound=!!o.sound;R.setQuality(o.quality==='low'?'low':'high');return state();},
    cast(id,lv){if(!p.skills[id]||SKILLS[id]?.type!=='active')throw Error('Select a learned active skill');pose='live';if(noCooldown){p.cds={};p.cdTot={};p.skillReadyAt=0;}if(infinite)p.sp=p.d.maxSp;p.skills[id]=bounded(lv,1,SKILLS[id].max);const s=skillDef(id);let t=null;if(s.target==='enemy'||groundSkill(id)){t=G.mobs.find(m=>!m.dead)||target();if(groundSkill(id))t={kind:'ground',map:G.map.id,x:t.x,y:t.y};}beginSkill(id,p.skills[id],t);return state();},
    rune(id,value){if(!p.skills[id]||!Runes.list(id).some(r=>r.id===value)&&value!=='')throw Error('Unknown upgrade');if(value)p.runes[id]=value;else delete p.runes[id];recalc();return state();},
    item(id,qty,equip){if(!ITEMS[id])throw Error('Unknown item');addItem(id,bounded(qty,1,999),true);if(equip){const entry=p.inventory.find(e=>e.id===id);if(!canEquip(ITEMS[id],false))throw Error('อุปกรณ์นี้ไม่ตรงอาชีพหรือเลเวล');equipItem(entry,true);}return state();},
    unequip(slot){if(!(slot in p.equip))throw Error('Unknown slot');unequip(slot,true);return state();},
    command(text){if(!/^\/gm(?:\s|$)/i.test(text))throw Error('ใช้ /gm เท่านั้น');GM.command(text);return state();},
    target,clear,
    heal(){p.dead=false;p.hp=p.d.maxHp;p.sp=p.d.maxSp;p.cds={};p.cdTot={};p.skillReadyAt=0;return state();},
    export:()=>({version:1,kind:'character-lab',character:saveData()}),
    screenshot:()=>R.cv.toDataURL('image/png')
  };
  window.CharacterLabBridge=api;api.build('novice','f');
});
