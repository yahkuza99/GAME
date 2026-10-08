'use strict';
// Build-specific skills. Saved data uses the ordinary skill ranks; combat state is transient.
const ClassExpansion = (() => {
  const owner = {}, states = new WeakMap();
  const damaging = new Set(['nova','nova_target','dash','line','execute','field','chain','chain_shot','dot','drain','trap','retreat_shot','volley','shot','combo','strike','triune']);
  const fields = new Set(['field','trap','shelter','regeneration']);
  const magical = job => ['runecaster','volva'].includes(jobRoot(job)) && job !== 'gythja';
  const value = (s,key,lv) => (s[key] || 0) + (s[key+'Per'] || 0) * (lv-1);
  for (const [job,c] of Object.entries(CLASS_EXPANSION)) {
    const base = JOBS[job].skills.find(id => SKILLS[id].type === 'passive');
    for (const x of c.passive) {
      owner[x.id]=job;
      SKILLS[x.id]={id:x.id,name:x.name,max:5,type:'passive',icon:c.color,glyph:['ᛉ','ᚲ','ᚷ'][x.branch],
        req:{[base]:1},exp:x,passive:()=>({}),desc:x.note+' • สาย '+c.builds[x.branch]};
      JOBS[job].skills.push(x.id);
    }
    c.active.forEach((x,i) => {
      owner[x.id]=job;
      const damage = damaging.has(x.kind), magic = x.magic || magical(job), bow = damage && jobRoot(job)==='wildhunter' && x.kind!=='trap';
      const s={id:x.id,name:x.name,max:x.max||5,type:'active',icon:c.color,glyph:['✧','⟡','ᚱ'][x.branch],
        exp:x,expJob:job,expJobLv:[8,15,25,35][i],req:{[c.passive[x.branch].id]:1},
        target:damage&&!['nova'].includes(x.kind)?'enemy':'self',sp:x.sp?()=>x.sp:undefined,
        range:x.range || (bow?8:magic?8:['line'].includes(x.kind)?4:['dash'].includes(x.kind)?4:2),
        delay:bow?450:magic?600:500,cd:x.cd,cast:()=>x.cast||0,vfx:'expansion',
        desc:x.note+' • สาย '+c.builds[x.branch]+` • Job ${[8,15,25,35][i]}+`};
      if (bow) s.bow=true;
      if (damage) s.dmg={type:magic?'magic':'phys',element:x.element||'neutral',mult:lv=>x.mult+(x.per||0)*(lv-1)};
      if (x.r && damage) {s.dmg.area=x.r;s.dmg.at=x.kind==='nova'?'self':'target';}
      if (x.kind==='line') s.dmg.line=true;
      if (x.hits && !['triune','drain','dot'].includes(x.kind)) s.dmg.hits=x.hits;
      if (x.hpCost) s.hpCost=()=>x.hpCost;
      if (x.kind==='stance') s.buff={dur:()=>x.duration,stats:lv=>Object.fromEntries(Object.entries(x.stats).map(([k,v])=>[k,v[0]+v[1]*(lv-1)]))};
      if (!damage) s.special='expansion';
      if (x.kind==='heal') s.heal=(lv,d)=>Math.floor(d.maxHp*value(x,'heal',lv));
      SKILLS[x.id]=s;JOBS[job].skills.push(x.id);
    });
  }
  function state() {
    const p=G.player;if(!p)return null;
    let q=states.get(p);
    if (!q || q.job!==p.job || q.map!==G.map || p.dead) {
      q={job:p.job,map:G.map,x:p.x,y:p.y,moved:0,lastMove:-Infinity,still:G.time,
        shield:0,shieldUntil:0,charges:{},cd:{},repeat:{},expose:new WeakMap(),dots:new WeakMap(),trapped:new WeakMap(),hits:{},lastSkill:null,lastEl:null,lastCast:-Infinity};
      states.set(p,q);
    }
    const distance=Math.hypot(p.x-q.x,p.y-q.y);
    if(distance>.001){q.still=G.time;q.lastMove=G.time;if(distance<1)q.moved=Math.min(20,q.moved+distance);q.x=p.x;q.y=p.y;}
    return q;
  }
  const learned = () => jobLine(G.player.job).flatMap(j=>CLASS_EXPANSION[j]?.passive||[]).filter(x=>skillLv(x.id)>0);
  const restore = n => {const p=G.player;p.sp=Math.min(p.d.maxSp,p.sp+Math.max(0,Math.floor(n)));};
  const realMob = m => !m.dead && !m.isPlayer && !m.def.dummy && !m.minion;
  const nearby = r => G.mobs.filter(m=>realMob(m)&&U.dist(m.x,m.y,G.player.x,G.player.y)<=r).length;
  const wolves = () => G.allies.filter(a=>!a.dead&&(a.hp==null||a.hp>0)&&a.until>G.time&&(a.kind==='wolf'||a.kind==='c3wolf'));
  function barrier(n,cap=.3,duration=6) {
    const p=G.player,q=state();if(p.dead)return;
    q.shield=Math.min(p.d.maxHp*cap,(q.shieldUntil>G.time?q.shield:0)+Math.floor(n));q.shieldUntil=G.time+duration;
  }
  function build(job,branch=0) {
    const c=CLASS_EXPANSION[job];if(!c)return CLASSBOOK[job]?.build||[];
    const core=JOBS[job].skills.filter(id=>!SKILLS[id].exp),ranks={},order=[];
    const allocate=(id,target)=>{if(!SKILLS[id]||target<=0)return;for(const [need,rank] of Object.entries(SKILLS[id].req||{}))allocate(need,rank);
      if(!order.includes(id))order.push(id);ranks[id]=Math.max(ranks[id]||0,Math.min(SKILLS[id].max,target));};
    for(const id of core)allocate(id,3);
    allocate(c.passive[branch].id,5);
    for(const x of c.active.filter(x=>x.branch===branch))allocate(x.id,SKILLS[x.id].max);
    for(const x of c.active.filter(x=>x.branch!==branch))allocate(x.id,1);
    let remaining=JOBS[job].jobMax-1-Object.values(ranks).reduce((n,v)=>n+v,0);
    const priorities=[...core.filter(id=>SKILLS[id].type==='active'),...c.active.filter(x=>x.branch!==branch).map(x=>x.id),...core.filter(id=>SKILLS[id].type==='passive')];
    for(const id of priorities){if(remaining<=0)break;const more=Math.min(remaining,SKILLS[id].max-(ranks[id]||0));if(more>0){allocate(id,(ranks[id]||0)+more);remaining-=more;}}
    return order.map(id=>[id,ranks[id]]);
  }
  function emit(s,kind,o,more={}) {
    if(G.fastSim || !o)return;
    addFx({type:'class_expansion',expArt:true,id:s.id,kind,x:o.x,y:o.y,ref:more.follow?o:null,
      color:s.icon,dur:kind==='field'?s.exp.duration:kind==='cast'?.6:.55,seed:Object.keys(owner).indexOf(s.id),element:s.dmg?.element,...more});
  }
  function move(dx,dy,distance) {
    const p=G.player,len=Math.hypot(dx,dy)||1;let x=p.x,y=p.y;
    for(let d=.2;d<=distance+.001;d+=.2){const nx=p.x+dx/len*d,ny=p.y+dy/len*d;
      if(!G.map.walkable(Math.floor(nx),Math.floor(ny))||G.map.portalAt(Math.floor(nx),Math.floor(ny)))break;x=nx;y=ny;}
    p.x=x;p.y=y;p.path=[];p.moving=false;state();
  }
  const forward = () => {const a=(G.player.dir||0)*Math.PI/4;return [Math.cos(a),Math.sin(a)];};
  const alive = (p,map,t) => G.player===p && G.map===map && !p.dead && (!t || !t.dead && G.mobs.includes(t));
  function schedule(delay,fn,t) {const p=G.player,map=G.map,job=p.job;later(delay,()=>{if(alive(p,map,t)&&p.job===job)fn();});}
  function slow(m,dur) {if(m.dead)return;m.slowUntil=Math.max(m.slowUntil||0,G.time+Math.min(dur,m.def.boss||m.isPlayer?1:dur));}
  function deliver(s,lv,m,index=0) {
    const r=skillDeliver(s,lv,m);if(r && !r.miss && !m.dead && s.exp.slow)slow(m,s.exp.slow);
    emit(s,'impact',m,{follow:true,index});return r;
  }
  function zone(s,lv,t) {
    const x=s.exp,p=G.player,map=G.map,job=p.job,pos={x:(t||p).x,y:(t||p).y},q=state();
    if(x.kind==='trap'){
      const existing=G.zones.filter(z=>z.expOwner===p&&z.skill===s.id&&z.until>G.time);
      if(existing.length>=2)existing[0].until=G.time;
    }
    const z=Runes.zone({skill:s.id,expOwner:p,x:pos.x,y:pos.y,r:x.r,until:G.time+x.duration,every:x.kind==='trap'?.15:1,first:x.kind==='trap'?.1:.2,draw:false,
      tick:(z,ms)=>{
        if(!alive(p,map)||p.job!==job){z.until=G.time;if(z.expFx)z.expFx.t=z.expFx.dur;return;}
        if(x.kind==='shelter' && U.dist(p.x,p.y,z.x,z.y)<=z.r)barrier(p.d.maxHp*value(x,'shield',lv),.2,2);
        else if(x.kind==='regeneration' && U.dist(p.x,p.y,z.x,z.y)<=z.r)healPlayer(Math.floor(p.d.maxHp*value(x,'heal',lv)),s.name);
        else if(x.kind==='field')for(const m of ms)deliver(s,lv,m);
        else if(x.kind==='trap' && ms.length){for(const m of ms){q.trapped.set(m,G.time+4);deliver(s,lv,m);}z.until=G.time;if(z.expFx)z.expFx.t=z.expFx.dur;}
      }});
    const prior=G.fx.length;emit(s,'field',pos,{r:x.r});z.expFx=G.fx.length>prior?G.fx[G.fx.length-1]:null;
  }
  // Native learning stays authoritative. New nodes unlock progressively within their own tier.
  const learn0=canLearn;
  const jobNeed = id => {const s=SKILLS[id];return s?.expJobLv?s.expJobLv+skillLv(id)*(JOBS[owner[id]].tier===3?3:2):0;};
  const ground0=groundSkill;
  groundSkill=function(id){const s=SKILLS[id];return !!(s?.exp && s.target==='enemy' && s.dmg?.area) || ground0(id);};
  canLearn=function(id){
    const s=SKILLS[id];if(s?.expJobLv){const p=G.player,j=owner[id];const jl=p.job===j?p.jobLv:JOBS[j].tier===2?p.job2Lv:p.job1Lv;if((jl||1)<jobNeed(id))return false;}
    return learn0(id);
  };
  const cast0=executeSkill;
  executeSkill=function(id,lv,t) {
    const p=G.player,s=skillDef(id),x=s.exp,q=state();
    if(x?.kind==='exchange' && p.hp<=Math.ceil(p.d.maxHp*x.hp)){UI.msg(L('HP ไม่พอสำหรับแลกมานา','Not enough HP to exchange for mana'),'err');return;}
    if(p.dead||(t&&!skillTargetValid(id,t))||!canPaySkill(skillCost(id,lv)))return cast0.apply(this,arguments);
    q.hits[id]={seen:new Set(),refunded:0,primary:t,at:G.time,previous:{id:q.lastSkill,element:q.lastEl,at:q.lastCast},bonus:0};
    for(const passive of learned()){
      if(!s.dmg)continue;
      const kind=passive.mechanic,elementOK=!passive.element||passive.element===s.dmg.element;
      if(['hurt_charge','heal_charge'].includes(kind) && elementOK && (kind!=='heal_charge'||s.dmg.element==='holy') && q.charges[passive.id]){
        q.hits[id].bonus+=passive.rate*skillLv(passive.id)*q.charges[passive.id];q.charges[passive.id]=0;
      }
      if(kind==='move_charge' && s.dmg.type==='phys' && q.moved>=passive.distance){q.hits[id].bonus+=passive.rate*skillLv(passive.id);q.moved=0;}
    }
    const wasHp=p.hp;
    cast0.apply(this,arguments);
    if(x){
      if(x.cleanse){p.stunUntil=0;p.slowUntil=0;p.flinchUntil=0;}
      if(x.command)for(const wolf of wolves())wolf.target=t;
      if(['dash','retreat_shot'].includes(x.kind)&&t){const sign=x.kind==='dash'?1:-1;move((t.x-p.x)*sign,(t.y-p.y)*sign,Math.min(x.distance,Math.max(0,U.dist(p.x,p.y,t.x,t.y)-.9)));}
    }
    for(const passive of learned()){
      const lv=skillLv(passive.id);
      if(passive.mechanic==='cost_barrier' && p.hp<wasHp)barrier((wasHp-p.hp)*passive.rate*lv,passive.cap,6);
      if(passive.mechanic==='buff_extension' && JOBS.skald.skills.includes(id) && s.buff && p.buffs[id])p.buffs[id].until=G.time+(p.buffs[id].until-G.time)*(1+passive.rate*lv);
      if(passive.mechanic==='move_cast_sp' && s.dmg?.type==='magic' && q.moved>=passive.distance && (q.cd[passive.id]||0)<=G.time){restore(p.d.maxSp*passive.rate*lv);q.moved=0;q.cd[passive.id]=G.time+passive.cd;}
    }
    q.lastSkill=id;q.lastEl=s.dmg?.element;q.lastCast=G.time;
  };
  const special0=runSpecialSkill;
  runSpecialSkill=function(kind,s,lv) {
    if(kind!=='expansion')return special0.apply(this,arguments);
    const x=s.exp,p=G.player;
    if(fields.has(x.kind))zone(s,lv,null);
    if(x.shield && !fields.has(x.kind))barrier(p.d.maxHp*value(x,'shield',lv),.3,x.duration||6);
    if(['retreat','dash_guard'].includes(x.kind)){const [dx,dy]=forward(),sign=x.kind==='retreat'?-1:1;move(dx*sign,dy*sign,x.distance);}
    if(x.restore){
      if(x.hp)p.hp-=Math.ceil(p.d.maxHp*x.hp);
      restore(p.d.maxSp*value(x,'restore',lv));
      if(x.heal)healPlayer(Math.floor(p.d.maxHp*value(x,'heal',lv)),s.name);
    }
  };
  const damage0=skillDamage;
  skillDamage=function(s,lv,t) {
    const x=s.exp;if(!x)return damage0.apply(this,arguments);
    if(['field','trap'].includes(x.kind)){zone(s,lv,t);return;}
    if(['chain','chain_shot'].includes(x.kind)){
      if(!t || t.kind==='ground')return;
      const used=new Set(),targets=[];let current=t;
      while(current && targets.length<x.count){targets.push(current);used.add(current);const last=current;
        current=G.mobs.filter(m=>!m.dead&&!used.has(m)&&U.dist(m.x,m.y,last.x,last.y)<=3).sort((a,b)=>U.dist(a.x,a.y,last.x,last.y)-U.dist(b.x,b.y,last.x,last.y))[0];}
      const mark=state().hits[s.id];if(mark)mark.ordinals=new WeakMap(targets.map((m,i)=>[m,i]));
      targets.forEach((m,i)=>schedule(i*.18,()=>skillHitOne(i?{...s,expOrigin:{x:targets[i-1].x,y:targets[i-1].y}}:s,lv,m),m));return;
    }
    if(['dot','drain','triune'].includes(x.kind)){
      if(!t || t.kind==='ground')return;
      const q=state(),n=x.duration||x.hits,token={};
      if(x.kind==='dot'){const existing=q.dots.get(t)||{};existing[s.id]=token;existing.until=G.time+x.duration;q.dots.set(t,existing);}
      for(let i=0;i<n;i++)schedule(i*(x.kind==='dot'?1:.2),()=>{
        if(x.kind==='dot' && q.dots.get(t)?.[s.id]!==token)return;
        const spell=x.kind==='triune'?{...s,dmg:{...s.dmg,element:['fire','water','wind'][i]}}:s;
        skillHitOne(spell,lv,t);
      },t);return;
    }
    return damage0.apply(this,arguments);
  };
  const fxCast0=FX2.cast,fxHit0=FX2.hit;
  FX2.cast=function(s,lv,t){if(!s.exp)return fxCast0.apply(this,arguments);emit(s,'cast',G.player,{follow:true});
    if(s.dmg?.line&&t)emit(s,'projectile',G.player,{ref:t,sx:G.player.x,sy:G.player.y,dur:.3});
    if(s.dmg?.area&&!fields.has(s.exp.kind))emit(s,'burst_area',s.dmg.at==='self'?G.player:t||G.player,{r:s.dmg.area,dur:.8});return true;};
  FX2.hit=function(s,lv,m,callback){
    if(!s.exp)return fxHit0.apply(this,arguments);
    const x=s.exp,p=G.player;
    const impact=()=>{callback();if(x.slow&&!m.dead)slow(m,x.slow);emit(s,'impact',m,{follow:true});};
    if(s.bow || s.dmg?.type==='magic' && !['dot','field','trap','nova','nova_target'].includes(x.kind)){
      const origin=s.expOrigin||p,duration=Math.max(.12,Math.min(.5,U.dist(origin.x,origin.y,m.x,m.y)/18)),map=G.map,job=p.job;
      if(!G.fastSim)emit(s,'projectile',origin,{ref:m,sx:origin.x,sy:origin.y,dur:duration});
      later(duration,()=>{if(alive(p,map,m)&&p.job===job)impact();});
    }else impact();
    return true;
  };
  const hit0=applyHit;
  applyHit=function(m,r,opts={}) {
    const p=G.player,s=SKILLS[opts.src],q=state();
    if(!p || p.dead || !r || r.miss || m.dead)return hit0.apply(this,arguments);
    let mult=1+(q.hits[opts.src]?.bonus||0),leech=s?.exp?.leech||0;
    const mark=q.hits[opts.src],seen=mark?.seen,index=mark?.ordinals?.get(m) ?? (seen?seen.has(m)?[...seen].indexOf(m):seen.size:0);
    if(seen)seen.add(m);
    const element=opts.element||r.el||s?.dmg?.element;
    const skill=!!s?.dmg,phys=s?.dmg?.type==='phys',magic=s?.dmg?.type==='magic',fraction=m.hp/m.maxHp;
    if(s?.exp?.execute && fraction<.3)mult+=s.exp.execute;
    for(const x of learned()){
      const lv=skillLv(x.id),rate=x.rate*lv,k=x.mechanic,elementOK=!x.element||x.element===element;
      if(k==='stationary_damage' && G.time-q.still>=1.5 && skill && elementOK && (!s.bow || !s.dmg.area&&!s.dmg.line))mult+=rate;
      if(k==='low_target' && s?.bow && fraction<.3)mult+=rate;
      if(k==='slow_bonus' && skill && elementOK && m.slowUntil>G.time)mult+=rate;
      if(k==='low_player' && phys && p.hp/p.d.maxHp<.4)mult+=rate;
      if(k==='boss_bonus' && phys && m.def.boss && !m.def.dummy)mult+=rate;
      if(k==='surrounded_damage' && phys && nearby(3)>=x.count)mult+=rate;
      if(k==='surrounded_leech' && phys && nearby(3)>=x.count)leech+=rate;
      if(k==='inside_circle' && magic && (G.zones||[]).some(z=>z.c3circle&&z.until>G.time&&U.dist(p.x,p.y,z.x,z.y)<=z.r))mult+=rate;
      if(k==='ally_target' && phys && wolves().some(w=>w.target===m))mult+=rate;
      if(k==='dot_bonus' && skill && elementOK && (m.poisonUntil>G.time||m.dot&&Object.keys(m.dot).length||q.dots.get(m)?.until>G.time))mult+=rate;
      if(k==='trap_bonus' && s?.bow && q.trapped.get(m)>G.time)mult+=rate;
      if(k==='secondary_bonus' && s?.exp?.kind==='chain_shot' && index>0)mult+=rate;
      if(k==='moving_chill' && s?.bow && G.time-q.lastMove<=1)slow(m,rate);
      if(k==='line_exposure' && skill){
        const exposed=q.expose.get(m);if(exposed>G.time){mult+=rate;q.expose.delete(m);}
        if(s.dmg.line)q.expose.set(m,G.time+6);
      }
      if(['element_repeat','repeat_target'].includes(k) && skill && elementOK){
        let rep=q.repeat[x.id];if(!rep||rep.target!==m||rep.until<G.time)rep={target:m,n:0};
        mult+=rate*rep.n;rep.n=Math.min(x.cap,rep.n+1);rep.until=G.time+(k==='element_repeat'?6:5);q.repeat[x.id]=rep;
      }
      // Per-cast history is recorded before resolving delayed hits, avoiding same-cast multi-hit bonuses.
      const history=mark?.previous;
      if(k==='alternate_skill' && skill && elementOK && history && history.id!==s.id && G.time-history.at<=5)mult+=rate;
      if(k==='alternate_element' && magic && history && history.element && history.element!==element && G.time-history.at<=5)mult+=rate;
    }
    mult=1+(mult-1)*(m.isPlayer?.5:1);
    const adjusted={...r,dmg:Math.max(0,Math.round(r.dmg*mult))},actual=Math.min(m.hp,adjusted.dmg);
    hit0.call(this,m,adjusted,opts);
    if(actual>0 && leech && !m.def.dummy && !m.minion && !p.dead)healPlayer(Math.floor(actual*leech*(m.isPlayer?.5:1)),s?.name);
    for(const x of learned()){
      const lv=skillLv(x.id),rate=x.rate*lv,k=x.mechanic;
      if((k==='kill_heal'||k==='kill_sp') && m.dead && !m.def.dummy&&!m.minion&&!m.isPlayer && (q.cd[x.id]||0)<=G.time){
        q.cd[x.id]=G.time+x.cd;if(k==='kill_heal')healPlayer(Math.floor(p.d.maxHp*rate),x.name);else restore(p.d.maxSp*rate);
      }
      if(k==='third_hit_sp' && actual>0 && phys && element==='holy'){
        q.charges[x.id]=Math.min(3,(q.charges[x.id]||0)+1);
        if(q.charges[x.id]>=3 && (q.cd[x.id]||0)<=G.time){q.charges[x.id]=0;q.cd[x.id]=G.time+x.cd;restore(p.d.maxSp*rate);}
      }
      if(k==='chain_refund' && actual>0 && element===x.element && mark && index>0 && mark.refunded<x.cap && !mark.refundSeen?.has(m)){
        (mark.refundSeen||(mark.refundSeen=new Set())).add(m);mark.refunded++;restore(p.d.maxSp*rate);
      }
      if(k==='multi_target_sp' && skill && mark && mark.seen.size>=x.count && !mark['refund_'+x.id]){mark['refund_'+x.id]=true;restore(p.d.maxSp*rate);}
    }
  };
  const hurt0=damagePlayer;
  damagePlayer=function(dmg,color,src={}){
    const p=G.player,q=state();if(!p||p.dead)return hurt0.apply(this,arguments);
    let reduction=0;
    if(!src.dot)for(const x of learned()){
      if(x.mechanic==='stationary_guard' && G.time-q.still>=1.5)reduction+=x.rate*skillLv(x.id);
      if(x.mechanic==='ally_guard' && wolves().some(w=>U.dist(w.x,w.y,p.x,p.y)<=4))reduction+=x.rate*skillLv(x.id);
    }
    dmg=Math.max(0,Math.round(dmg*(1-Math.min(.25,reduction))));
    if(q.shieldUntil>G.time&&q.shield>0){const absorbed=Math.min(dmg,q.shield);q.shield-=absorbed;dmg-=absorbed;}
    const hp=p.hp;hurt0.call(this,dmg,color,src);
    if(!p.dead&&!src.dot&&p.hp<hp)for(const x of learned())if(x.mechanic==='hurt_charge' && (q.cd[x.id]||0)<=G.time){q.charges[x.id]=Math.min(x.cap,(q.charges[x.id]||0)+1);q.cd[x.id]=G.time+.5;}
  };
  const heal0=healPlayer;
  healPlayer=function(amt,label){
    const p=G.player,q=state();if(!p||p.dead)return;
    const before=p.hp,overflow=Math.max(0,amt-(p.d.maxHp-before));heal0.apply(this,arguments);
    const spell=Object.values(SKILLS).some(s=>s.name===label && (s.heal||s.exp?.kind==='regeneration'||s.exp?.kind==='recover_heal'));
    if(!spell)return;
    for(const x of learned()){
      const lv=skillLv(x.id);
      if(x.mechanic==='overheal_barrier'&&overflow>0)barrier(overflow*x.rate*lv,x.cap,8);
      if(x.mechanic==='heal_sp'&&p.hp>before&&(q.cd[x.id]||0)<=G.time){restore(p.d.maxSp*x.rate*lv);q.cd[x.id]=G.time+x.cd;}
      if(x.mechanic==='heal_charge'&&p.hp>before&&(q.cd[x.id]||0)<=G.time){q.charges[x.id]=Math.min(x.cap,(q.charges[x.id]||0)+1);q.cd[x.id]=G.time+.5;}
    }
  };
  const update0=updateGame;
  updateGame=function(){const result=update0.apply(this,arguments);state();return result;};
  const profile0=SkillPresentation.profile;
  SkillPresentation.profile=function(id){const s=SKILLS[id];if(!s?.exp)return profile0(id);const x=s.exp,job=owner[id];
    if(s.type==='passive')return null;
    if(x.kind==='trap')return {kind:'trap',action:'trap',duration:.8};
    if(job==='gythja')return {kind:x.kind==='combo'?'palm4':x.kind==='line'?'palm':s.dmg?'punch':'meditate',action:'monk',duration:.75};
    if(job==='skald')return {kind:s.dmg?'strum':'song',action:'bard',duration:.85};
    if(s.bow)return {kind:'shoot',action:'shoot',duration:.5};
    return {kind:fields.has(x.kind)?'cast':s.dmg?.type==='phys'?'slash':s.dmg?'cast':'guard',action:s.dmg?.type==='phys'?'attack':s.dmg?'cast':'buff',duration:.7};};
  const monkFrame0=SkillPresentation.monkFrame;
  SkillPresentation.monkFrame=function(kind,elapsed){if(kind==='palm4')return elapsed<.525&&(elapsed+1e-8)% .15<.075?2:0;return monkFrame0(kind,elapsed);};
  const skillsUI=UI.renderSkills;
  UI.renderSkills=function(){
    skillsUI.apply(this,arguments);
    const c=CLASS_EXPANSION[this.skTab],list=document.querySelector('#w-skills .sk-list');if(!c||!list)return;
    const rows=[...list.querySelectorAll('.sk-row')],groups=[[],[],[]];
    for(const row of rows){const s=SKILLS[row._tip?.skill];if(!s?.exp)continue;
      const sub=row.querySelector('.sk-sub');if(sub)sub.append(' • '+c.builds[s.exp.branch]+(s.expJobLv&&skillLv(s.id)<s.max?' • Job '+jobNeed(s.id)+'+':''));
      groups[s.exp.branch].push(row);
    }
    for(let i=0;i<3;i++){
      const heading=h('div',{class:'exp-build-heading'},c.builds[i]);heading.style.cssText='margin-top:12px;padding:6px 8px;border-bottom:1px solid #9b773f;color:#402708;font-weight:bold';
      list.append(heading,...groups[i]);
    }
    const head=document.querySelector('#w-skills .sk-head');if(head)head.append(h('div',{class:'hint'},L(`Job ${G.player.jobLv}/${JOBS[G.player.job].jobMax} • แต้มไม่พอเต็มทุกสกิล เลือกบิลด์หรือผสมสายได้`, `Job ${G.player.jobLv}/${JOBS[G.player.job].jobMax} • choose or combine builds; you cannot max every skill`)));
  };
  const hud0=UI.updateHud;
  UI.updateHud=function(){hud0.apply(this,arguments);if(!G.player)return;const q=state();let el=document.querySelector('#bi-build');
    if(!el){el=h('span',{id:'bi-build'});el.style.cssText='display:block;flex:0 0 100%;font-size:10px;line-height:1.2;color:#ffe1a5;text-shadow:0 1px 2px #211505';document.querySelector('#basic-info .bi-foot')?.append(el);}
    const parts=[];if(q.shieldUntil>G.time&&q.shield>0)parts.push(L('เกราะ ','Barrier ')+Math.ceil(q.shield)+' · '+Math.ceil(q.shieldUntil-G.time)+'s');
    for(const x of learned())if(['hurt_charge','heal_charge'].includes(x.mechanic)&&q.charges[x.id])parts.push(x.name+' '+q.charges[x.id]+'/'+x.cap);
    el.hidden=parts.length===0;el.style.display=parts.length?'block':'none';el.textContent=parts.join(' • ');
  };
  const book0=ClassBook.render;
  ClassBook.render=function(){book0.apply(this,arguments);const job=this.sel||G.player?.job,c=CLASS_EXPANSION[job],det=document.querySelector('#w-classbook .cb-det');if(!c||!det)return;
    const section=this.sec(L('บิลด์ Custom ที่แนะนำ','Suggested custom builds'),...c.builds.map((name,i)=>h('details',{},h('summary',{},name),h('p',{},build(job,i).map(([id,rank])=>SKILLS[id].name+' '+rank).join(' → ')))));det.append(section);};
  return {state,owner,value,learned,emit,barrier,jobNeed,build};
})();
