'use strict';
// Custom class engines. Combat state is transient: never stored in the save.
const ClassTraits = (() => {
  let enabled=true;
  const states = new WeakMap();
  const roots = {
    einherjar: {name:'Resolve', max:3, color:'#ffd078', rule:'รับโจมตีโดยตรงสะสม Resolve สูงสุด 3 ชั้น สกิลโจมตีถัดไปใช้ทั้งหมดสร้างเกราะ 8% MaxHP นาน 6 วิ'},
    runecaster: {name:'Sigils', max:3, color:'#80ddff', rule:'ร่ายเวทต่างธาตุ 3 ธาตุใน 12 วิ เวทธาตุที่สามแรงขึ้น 20% และคืน SP 3% MaxSP จากนั้นเริ่มชุดใหม่'},
    wildhunter: {name:'Hunt Mark', max:3, color:'#a7e58d', rule:'ยิงปกติถูกเป้าเดิม 3 ครั้ง สกิลธนูถัดไปใส่เป้านั้นแรงขึ้น 20% เปลี่ยนเป้าจะเริ่มนับใหม่'},
    volva: {name:'Devotion', max:4, color:'#fff0a6', rule:'ฮีลที่ฟื้นเลือดจริงหรือโจมตี Holy สะสม Devotion สูงสุด 4 ชั้น (ครั้งละไม่เกิน 1 ชั้น/วิ) ใช้กับฮีลถัดไป +25% หรือสกิล Holy +20%'},
    trickster: {name:'Flow', max:3, color:'#d8a6ff', rule:'ใช้สกิลโจมตีต่างกัน 2 สกิลสำหรับ Class 1 หรือ 3 สกิลสำหรับ Class 2 ใน 12 วิ สกิลโจมตีถัดไปแรงขึ้น 25% การใช้สกิลเดิมไม่เพิ่ม Flow'},
    berserker: {name:'Fury', max:100, color:'#ff987c', rule:'เสีย HP จากสกิลหรือการรับโจมตีโดยตรงสะสม Fury ตาม %MaxHP ×3 (สูงสุด 20/วิ) เมื่อมี 60 สกิลโจมตีถัดไปใช้ 60 เพื่อแรงขึ้น 25% และดูดเลือด 8%'},
  };
  const branches = {
    valkyrie:'Resolve เปลี่ยนเป็นเกราะ 15% MaxHP เน้นรับแรงโจมตีและควบคุมฝูง',
    hersir:'Resolve เปลี่ยนเป็นสกิลโจมตี +25% แทนเกราะ เน้นสวนกลับ',
    galdr:'ครบ Sigils สร้างพื้นที่ชะลอ 3 ช่องนาน 3 วิที่จุดร่าย เพิ่มบทบาทควบคุมพื้นที่',
    seidr:'ครบ Sigils เวทธาตุที่สาม +30% และดูดเลือด 15% แทนคืน SP',
    skadi:'Hunt Mark ใช้กับ Arrow Storm เพื่อเพิ่มแรง 20% และทิ้งพื้นที่ชะลอ 2.5 ช่องนาน 3 วิ',
    ullr:'Hunt Mark ใช้กับสกิลธนูเป้าเดี่ยวเพื่อเพิ่มแรง 30% เน้นล่าเป้าเดิม',
    norn:'Devotion ฮีลถัดไป +35% และคืน SP 6% MaxSP เน้นรักษาต่อเนื่อง',
    gythja:'Devotion สกิล Holy ถัดไป +25% และดูดเลือด 15% เน้นบุกเพื่อรักษาตัว',
    phantom:'Flow สกิลถัดไป +25% พร้อมบาดแผล 3 ครั้ง ครั้งละ 10% ของดาเมจที่ทำได้จริง',
    skald:'Flow ใช้กับบัฟถัดไปเพื่อยืดเวลาบัฟ 50% และคืน SP 8% MaxSP เน้นสลับโจมตีแล้วต่อเพลง',
    warlord:'ใช้ Fury 60 เพื่อสกิล +10% และดูดเลือด 20% เน้นยืนสู้',
    jotun:'ใช้ Fury 60 เพื่อสกิล +35% โดยไม่ดูดเลือด เน้นแรงปะทะแลกความเสี่ยง',
    runelord:'ใช้ Rune Circle, สลับธาตุและเวทสะท้อนจากวงเป็นระบบเฉพาะของ Runelord',
    packlord:'ใช้ฝูงหมาป่า, Hunter Mark และช่วง Unchained เป็นระบบเฉพาะของ Packlord',
  };
  // ความถนัดประจำสาย (2026-10-08 เจ้าของ: "Class แบบ Diablo ปรับที่ตัวละคร" • "ต้องการความมีสีสัน")
  // Passive แบบ D ตัดค่าหลักของแต่ละสายไม่เท่ากัน (MATK Runecaster -40%, Völva -26%, ATK Berserker/Wildhunter -13%, FLEE Trickster -16%)
  // → คืนผ่านพลังประจำสาย: ยิ่งสะสมชั้นมาก ยิ่งแรง (dmg ต่อชั้น) / Trickster โดนตีเบาลง (guard ต่อชั้น) • Einherjar ไม่ได้ (D ไม่ทำให้ช้าลง)
  // วัดด้วย CURVE=1 ONLY=duel tests/balance_sim.js เทียบ commit ก่อน D (048f888) • ลานประลองได้ครึ่งเดียวเหมือนโบนัสอื่น
  const EDGE = {
    runecaster: {dmg:.4},    // ต่อธาตุที่ร่ายในชุดปัจจุบัน (สูงสุด 3)
    volva:      {dmg:.09},   // ต่อ Devotion (สูงสุด 4)
    wildhunter: {dmg:.06},   // ต่อ Hunt Mark บนเป้าเดิม (สูงสุด 3)
    berserker:  {dmg:.009},  // ต่อ Fury 1 แต้ม (สูงสุด 100)
    trickster:  {dmg:.12, guard:.08}, // ต่อ Flow (สูงสุด 2/3)
  };
  const state = () => {
    const p=G.player;if(!p)return null;
    let q=states.get(p);
    if(!q || q.job!==p.job || q.map!==G.map.id || p.dead) {
      q={job:p.job,map:G.map.id,n:0,last:G.time,gainAt:-Infinity,elements:new Set(),skills:new Set(),target:null,bonus:{},shield:0,shieldUntil:0};
      states.set(p,q);
    }
    if(G.time-q.last>12){q.n=0;q.elements.clear();q.skills.clear();q.target=null;q.last=G.time;}
    return q;
  };
  const active = () => {
    const p=G.player;
    if(!enabled||!p||p.dead||(JOBS[p.job].tier||1)>=3)return false;
    const r=roots[jobRoot(p.job)];
    return p.job==='trickster'?{...r,max:2}:r;
  };
  const restore = fraction => {const p=G.player;p.sp=Math.min(p.d.maxSp,p.sp+Math.floor(p.d.maxSp*fraction));};
  const gain = n => {
    const q=state(),r=active();if(!r||!q)return;
    const threshold=jobRoot(G.player.job)==='berserker'?60:r.max,before=q.n;
    q.n=Math.min(r.max,q.n+n);q.last=G.time;
    if(before<threshold&&q.n>=threshold)ClassTraitFX.emit(jobRoot(G.player.job),'ready',G.player,G.player.job);
  };
  const fury = lost => {
    if(jobRoot(G.player.job)!=='berserker'||!active()||lost<=0)return;
    const q=state();if(G.time<q.gainAt)return;q.gainAt=G.time+1;
    gain(Math.min(20,lost/G.player.d.maxHp*300));
  };
  const slowZone = (s,t,r) => {
    const p=G.player,o=t||p;
    Runes.zone({skill:s.id,x:o.x,y:o.y,r,until:G.time+3,every:.3,first:.05,rgb:'140,215,255',draw:false,
      tick:(z,ms)=>{for(const m of ms)m.slowUntil=Math.max(m.slowUntil||0,G.time+.6);}});
    ClassTraitFX.emit(jobRoot(p.job),'zone',o,p.job,r);
  };
  const prepare = (s,t) => {
    const p=G.player,q=state(),root=jobRoot(p.job),job=p.job;
    const attack=!!s.dmg,holy=attack&&s.dmg.element==='holy';
    let bonus={k:1,heal:0,bleed:false,until:G.time+12,edgeN:q.n},trigger=false;
    if(root==='einherjar'&&q.n>=3&&attack){
      q.n=0;trigger=true;
      if(job==='hersir')bonus.k=1.25;
      else {q.shield=Math.floor(p.d.maxHp*(job==='valkyrie'?.15:.08));q.shieldUntil=G.time+6;}
    }
    if(root==='runecaster'&&attack&&s.dmg.type==='magic'){
      const el=s.dmg.element||'neutral';q.elements.add(el);q.n=q.elements.size;q.last=G.time;
      if(q.n>=3){q.n=0;q.elements.clear();trigger=true;bonus.k=job==='seidr'?1.3:1.2;
        if(job==='seidr')bonus.heal=.15;else bonus.restore=.03;
        if(job==='galdr')slowZone(s,t,3);
      }
    }
    if(root==='wildhunter'&&attack&&s.bow&&q.n>=3&&q.target===t){
      const eligible=job==='skadi'?s.id==='arrow_storm':job==='ullr'?!s.dmg.area&&!s.dmg.line:true;
      if(eligible){q.n=0;trigger=true;bonus.k=job==='ullr'?1.3:1.2;if(job==='skadi')slowZone(s,t,2.5);}
    }
    if(root==='volva'&&q.n>=4&&(s.heal||holy)){
      const eligible=job==='norn'?!!s.heal:job==='gythja'?holy:true;
      if(eligible){q.n=0;trigger=true;
        if(s.heal){bonus.healMul=job==='norn'?1.35:1.25;if(job==='norn')bonus.restore=.06;}
        else {bonus.k=job==='gythja'?1.25:1.2;if(job==='gythja')bonus.heal=.15;}
      }
    }
    if(root==='trickster'){
      const needed=active().max;
      if(q.n>=needed&&(job==='skald'?!!s.buff:attack)){
        q.n=0;q.skills.clear();trigger=true;
        if(job==='skald'){bonus.buffMul=1.5;bonus.restore=.08;}else {bonus.k=1.25;bonus.bleed=job==='phantom';}
      }else if(attack){const before=q.n;q.skills.add(s.id);q.n=q.skills.size;q.last=G.time;
        if(before<needed&&q.n>=needed)ClassTraitFX.emit(root,'ready',p,job);}
    }
    if(root==='berserker'&&q.n>=60&&attack){
      q.n-=60;trigger=true;bonus.k=job==='jotun'?1.35:job==='warlord'?1.1:1.25;
      bonus.heal=job==='jotun'?0:job==='warlord'?.2:.08;
    }
    q.bonus[s.id]=bonus;
    if(trigger){q.last=G.time;bonus.empowered=true;addFloater(p.x,p.y-1.8,roots[root].name+'!',roots[root].color);
      const at=root==='einherjar'&&job!=='hersir'?p:t||p;
      ClassTraitFX.emit(root,'cast',at,job,skillAimRadius(s.id)||1);
    }
    return bonus;
  };
  const cast0=executeSkill;
  executeSkill=function(id,lv,t){
    if(!active())return cast0.apply(this,arguments);
    const p=G.player,s=skillDef(id);
    if(p.dead||(t&&!skillTargetValid(id,t))||!canPaySkill(skillCost(id,lv)))return cast0.apply(this,arguments);
    const bonus=prepare(s,t),hp=p.hp;
    cast0.apply(this,arguments);fury(Math.max(0,hp-p.hp));
    if(bonus.restore)restore(bonus.restore);
    if(bonus.buffMul&&p.buffs[id])p.buffs[id].until=G.time+(p.buffs[id].until-G.time)*bonus.buffMul;
  };
  const hit0=applyHit;
  applyHit=function(m,r,opts={}){
    if(!active()||!r||r.miss||m.dead)return hit0.apply(this,arguments);
    const p=G.player,q=state(),root=jobRoot(p.job),bonus=q.bonus[opts.src];
    const b=bonus&&bonus.until>=G.time?bonus:null;
    const e=EDGE[root],n=root==='wildhunter'&&q.target!==m?0:(b?b.edgeN:q.n),edge=e&&e.dmg?e.dmg*n:0,k=(b?b.k:1)*(1+edge); // Hunt Mark นับเฉพาะเป้าเดิม
    const adjusted=k!==1?{...r,dmg:Math.max(0,Math.round(r.dmg*(1+(k-1)*(m.isPlayer?.5:1))))}:r;
    const actual=Math.min(m.hp,adjusted.dmg);
    hit0.call(this,m,adjusted,opts);
    if(b&&b.empowered&&actual>0)ClassTraitFX.emit(root,'impact',m,p.job);
    if(b&&b.heal&&!m.def.dummy&&!p.dead)healPlayer(Math.floor(actual*b.heal*(m.isPlayer?.5:1)),roots[root].name);
    if(b&&b.bleed&&!m.dead&&!m.isPlayer){const map=G.map,p0=p;for(let i=1;i<=3;i++)later(i,()=>{
      if(G.map===map&&G.player===p0&&!p0.dead&&!m.dead&&G.mobs.includes(m))damageMob(m,Math.floor(actual*.1),{src:opts.src,color:'#dba8ff'});
    });}
    if(root==='wildhunter'&&opts.src==='attack'){
      if(q.target!==m){q.target=m;q.n=0;}gain(1);
    }
    if(root==='volva'&&adjusted.el==='holy'&&G.time>=q.gainAt){q.gainAt=G.time+1;gain(1);}
    q.last=G.time;
  };
  const hurt0=damagePlayer;
  damagePlayer=function(dmg,color,src={}){
    if(!active())return hurt0.apply(this,arguments);
    const p=G.player,q=state(),hp=p.hp;
    if(q.shieldUntil>G.time&&q.shield>0&&dmg>0){const blocked=Math.min(dmg,q.shield);q.shield-=blocked;dmg-=blocked;}
    const e=EDGE[jobRoot(p.job)];if(e&&e.guard&&dmg>0&&q.n>0)dmg=Math.max(1,Math.round(dmg*(1-e.guard*q.n)));
    hurt0.call(this,dmg,color,src);
    if(!p.dead&&dmg>0&&!src.dot){
      if(jobRoot(p.job)==='einherjar'&&G.time>=q.gainAt){q.gainAt=G.time+1;gain(1);}
      fury(Math.max(0,hp-p.hp));
    }
  };
  const heal0=healPlayer;
  healPlayer=function(amt,label){
    const p=G.player;if(!active()||jobRoot(p.job)!=='volva')return heal0.apply(this,arguments);
    const q=state(),s=Object.values(SKILLS).find(s=>s.heal&&s.name===label),b=s&&q.bonus[s.id];
    if(b&&b.until>=G.time&&b.healMul)amt=Math.floor(amt*b.healMul);
    const hp=p.hp;heal0.call(this,amt,label);
    if(s&&p.hp>hp&&G.time>=q.gainAt){q.gainAt=G.time+1;gain(1);}
  };
  const hud0=UI.updateHud;
  UI.updateHud=function(){
    hud0.apply(this,arguments);const el=document.querySelector('#bi-trait'),p=G.player;
    if(!el||!p)return;const r=active(),q=state();el.hidden=!r;
    if(r){el.textContent=r.name+' '+Math.floor(q.n)+'/'+r.max;el.style.color=r.color;el.title=info(p.job);}
  };
  function info(job){const r=roots[jobRoot(job)];return (JOBS[job].tier===3?'':r?r.rule+' • ':'')+(branches[job]||'');}
  return {state,info,get enabled(){return enabled;},set enabled(v){enabled=!!v;}};
})();
