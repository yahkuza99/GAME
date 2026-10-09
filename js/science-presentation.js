'use strict';
// Presentation only. Stable job/skill IDs and all combat formulas remain unchanged.
const SciencePresentation = (() => {
  const roots=new Set(['runecaster','volva']);
  const caster=job=>roots.has(jobRoot(job));
  const jobs={
    runecaster:['Field Scientist','นักวิทยาศาสตร์สนาม','พลาสมา • ความเย็น • ไฟฟ้า'],
    galdr:['Energy Engineer','วิศวกรพลังงาน','ควบคุมอุณหภูมิและกระแสไฟฟ้า'],
    seidr:['Nanotech Engineer','วิศวกรนาโน','สารกัดกร่อนและการถ่ายเทพลังงาน'],
    runelord:['Systems Architect','สถาปนิกระบบ','โหนดสนามและระบบยิงประสาน'],
    volva:['Combat Medic','แพทย์สนาม','นาโนแพทย์และเกราะโฟตอน'],
    norn:['Bioengineer','วิศวกรชีวภาพ','ฟื้นฟู • ชำระสาร • ควบคุมระบบชีวภาพ'],
    gythja:['Kinetic Specialist','ผู้เชี่ยวชาญจลนศาสตร์','แรงกระแทกและการควบคุมร่างกาย'],
  };
  const names={
    rune_mastery:'Energy Calibration',fire_rune:'Plasma Injector',ice_rune:'Cryo Injector',thunder_rune:'Tesla Discharge',runic_ward:'Insulation Matrix',earth_rune:'Seismic Driver',
    sanctuary:'Medical Training',freyjas_grace:'Biometric Feedback',light_of_freyja:'Nanobot Repair',blessing_of_odin:'Performance Booster',holy_spear:'Photon Lance',divine_shield:'Photon Shield',
    galdr_focus:'Thermal Control',meteor_rune:'Orbital Strike',frost_nova:'Cryogenic Pulse',chain_lightning:'Tesla Chain',rune_barrier:'Electromagnetic Shield',
    ember_memory:'Heat Retention',frost_fracture:'Cryo Fracture',storm_conductor:'Conductive Circuit',fire_pillar:'Plasma Column',glacial_cage:'Cryo Containment',thunder_wake:'Conductive Cascade',astral_focus:'Capacitor Focus',
    seidr_lore:'Nanomaterial Research',soul_drain:'Energy Siphon',hex_of_hel:'Corrosive Injection',dark_nova:'Nanite Detonation',void_lance:'Particle Lance',creeping_corruption:'Corrosion Propagation',soul_harvest:'Energy Recovery',curse_weaver:'Nanite Networking',blight_brand:'Corrosion Marker',soul_tether:'Transfer Link',nightfall:'Particle Collapse',forbidden_exchange:'Emergency Power Exchange',
    wyrd_thread:'Biometric Link',great_restoration:'Tissue Reconstruction',fate_weave:'Predictive Shield',ragnarok_light:'Photon Pulse',skuld_judgment:'Targeted Irradiation',woven_overflow:'Recovery Overflow',restoration_cycle:'Repair Cycle',fates_balance:'Homeostasis',fate_anchor:'Stabilizer Anchor',cleansing_thread:'Decontamination Link',woven_sanctuary:'Medical Station',severed_fate:'Signal Disruption',
    iron_faith:'Kinetic Conditioning',holy_fist:'Impact Punch',triple_palm:'Triple Impulse',divine_burst:'Kinetic Burst',zen_body:'Breathing Control',palm_rhythm:'Impulse Rhythm',measured_breath:'Oxygen Efficiency',temple_reversal:'Counterforce',consecrated_combo:'Impact Combination',breath_of_battle:'Combat Respiration',temple_counter:'Reactive Counter',sunbreak_palm:'Shock Palm',
    root_script:'Adaptive Circuit',rune_circle:'Amplifier Node',ragnarok_verse:'Tri-Phase Bombardment',odins_spear_rune:'Railgun Lance',sap_ward:'Cryo Shield',blink_glyph:'Phase Transit',circle_custodian:'Node Maintenance',elemental_braid:'Phase Coupling',root_recollection:'Charge Recovery',convergence_seal:'Convergence Node',triune_lance:'Tri-Phase Lance',root_transit:'Node Transit',
  };
  const terms=[[/คำสาป|สาป/g,'สารกัดกร่อน'],[/วิญญาณ/g,'ชีวพลังงาน'],[/ศักดิ์สิทธิ์/g,'โฟตอน'],[/เวทมนตร์|เวทมนต์|คาถา|เวท/g,'พลังงาน'],[/ร่าย/g,'ชาร์จ'],[/รูน/g,'โมดูล'],[/พรแห่งโอดิน|พรแห่งเฟรยา/g,'ระบบบูสต์'],[/โอดิน|เฟรยา|เทพ/g,'ระบบ'],[/ชะตา/g,'สัญญาณ'],[/แม่มด/g,'วิศวกร'],[/\bspells?\b/gi,'discharge'],[/\bmagic\b/gi,'technology'],[/\brunes?\b/gi,'module'],[/\bholy\b/gi,'photon'],[/\bsouls?\b/gi,'bioenergy'],[/\bcurses?\b/gi,'corrosion'],[/\bblessing\b/gi,'enhancement'],[/\bfate\b/gi,'signal'],[/\bwitch\b/gi,'engineer']];
  const text=v=>typeof v==='string'?terms.reduce((out,[a,b])=>out.replace(a,b),v):v;
  const ids=new Set();
  for(const [id,[name,thai,role]] of Object.entries(jobs)){
    const j=JOBS[id];if(!j)continue;
    j.name=name;j.thai=thai;j.role=role;j.desc=role+' • ใช้อุปกรณ์และระบบพลังงานในการต่อสู้';
    for(const skill of j.skills)ids.add(skill);
    const book=typeof CLASSBOOK!=='undefined'&&CLASSBOOK[id];
    if(book)for(const key of ['play','pros','cons','tips'])book[key]=text(book[key]);
  }
  for(const id of ids){const s=SKILLS[id];if(!s)continue;
    s.name=names[id]||text(s.name);s.desc=text(s.desc);s.glyph=s.type==='passive'?'▤':'⌁';
    for(const option of Runes.list(id)){option.name=text(option.name);option.glyph='▤';for(const field of ['desc','note','short'])option[field]=text(option[field]);}
  }
  const guideHook=Class3.hookUI;
  Class3.hookUI=function(){const result=guideHook.apply(this,arguments);
    for(const id of Object.keys(jobs)){const book=CLASSBOOK[id];if(book)for(const key of ['play','pros','cons','tips'])book[key]=text(book[key]);}
    return result;
  };
  const sound=Sound.play;
  Sound.play=function(key,...args){if(caster(G.player?.job)&&['holy','magic'].includes(key))key='zap';return sound.call(this,key,...args);};
  const runeFx=Runes.fx;
  Runes.fx=function(f){f.presentationRoot=jobRoot(G.player?.job);return runeFx.call(this,f);};
  // Distinguish source ownership before any draw wrappers see the effect.
  for(const method of ['cast','hit']){
    const original=FX2[method];
    FX2[method]=function(s,...args){const previous=this.presentationSource;this.presentationSource=s.id;
      try{return original.call(this,s,...args);}finally{this.presentationSource=previous;}
    };
  }
  const palette={fire:'#ffa36d',water:'#a6efff',wind:'#8bdaff',holy:'#dcfff2',shadow:'#99b3ff',poison:'#b5ef95',earth:'#e9c898'};
  function owns(f){
    if(ids.has(f.id||f.src))return true;
    if(f.traitFx)return roots.has(f.root);
    if(roots.has(f.presentationRoot))return true;
    if(f.c3)return ['circle','verse','echo','shatter','blink','ward','resonance','tree'].includes(f.kind);
    // Legacy projectiles lack source IDs; the active actor owns these visuals.
    return caster(G.player?.job)&&!f.src&&['firebolt','coldbolt','lightning','holy','soul','frost'].includes(f.type);
  }
  function grid(g,x,y,r,color,alpha){
    g.save();g.translate(x,y);g.scale(1,R.K);g.strokeStyle=color;g.globalAlpha*=alpha;g.lineWidth=1;
    g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.stroke();
    g.save();g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.clip();
    for(let i=-2;i<=2;i++){const q=i*r/3;g.beginPath();g.moveTo(q,-r);g.lineTo(q,r);g.moveTo(-r,q);g.lineTo(r,q);g.stroke();}
    g.restore();
    for(const [sx,sy] of [[-1,0],[1,0],[0,-1],[0,1]]){g.fillStyle=color;g.fillRect(sx*r-2,sy*r-2,4,4);}
    g.restore();
  }
  function draw(g,f){
    // Older Class 3 field events carry a semantic kind rather than a skill ID.
    const c3Ids={verse:'ragnarok_verse',circle:'rune_circle',echo:'rune_circle',shatter:'sap_ward',blink:'blink_glyph',ward:'sap_ward',resonance:'root_script',tree:'root_script'};
    if(f.c3&&!f.id&&!f.src&&c3Ids[f.kind])f={...f,src:c3Ids[f.kind]};
    if(typeof ScienceArt!=='undefined'&&ScienceArt.draw(g,f))return true;
    const s=SKILLS[f.id||f.src],k=U.clamp(f.t/f.dur,0,1),pos=R.fxPos(f);
    const el=f.el||f.element||s?.dmg?.element||s?.exp?.element||'holy',color=palette[el]||'#a6efff';
    let x=pos.x*TILE,y=pos.y*TILE*R.K-20;
    const projectile=typeof ProjectileArt!=='undefined'&&ProjectileArt.sample(f);
    g.save();g.globalAlpha=Math.min(1,k/.06,(1-k)/.18);g.strokeStyle=color;g.fillStyle=color;
    if(projectile||f.kind==='projectile'){
      let angle=projectile?.angle||0;
      if(projectile){x=projectile.x;y=projectile.y;}
      else {const sx=f.sx*TILE,sy=f.sy*TILE*R.K-28;angle=Math.atan2(y-sy,x-sx);x=U.lerp(sx,x,k);y=U.lerp(sy,y,k);}
      g.translate(x,y);g.rotate(angle);g.lineWidth=2;g.beginPath();g.moveTo(-25,0);g.lineTo(8,0);g.stroke();
      g.fillRect(-6,-3,12,6);g.fillStyle='#f5ffff';g.fillRect(4,-1,7,2);
    }else if(['field','circle','cast','zone','tree'].includes(f.kind)||s?.buff||!s?.dmg){
      const r=(f.r||s?.dmg?.area||.8)*TILE;
      grid(g,x,y+20,r,color,.65);
      // Scanning line and instrument readout, no sigils, stars or incantations.
      g.lineWidth=2;const scan=y+20-r*R.K+2*r*R.K*k;
      g.beginPath();g.moveTo(x-r,scan);g.lineTo(x+r,scan);g.stroke();
      g.font='9px monospace';g.fillText(s?.name||'SYSTEM ACTIVE',x-r,y+14-r*R.K);
    }else{
      const r=(f.r||s?.dmg?.area||.5)*TILE;
      if(el==='wind'){
        g.lineWidth=2;g.beginPath();g.moveTo(x,y-90);g.lineTo(x+9,y-57);g.lineTo(x-6,y-34);g.lineTo(x,y);g.stroke();
      }else if(f.kind==='meteor'||f.kind==='verse'){
        const drop=Math.max(0,1-f.t/.42)*100;g.fillStyle='#738791';g.fillRect(x-7,y-drop-10,14,20);
        g.strokeStyle=color;g.lineWidth=2;g.beginPath();g.moveTo(x,y-drop-40);g.lineTo(x,y-drop-10);g.stroke();
      }
      g.lineWidth=1.5;const n=R.quality==='low'?4:8;
      for(let i=0;i<n;i++){const a=i/n*Math.PI*2,rr=r*(.2+.8*k);g.fillRect(x+Math.cos(a)*rr-2,y+Math.sin(a)*rr*R.K-2,4*(1-k)+1,2);}
      g.strokeRect(x-8*(1+k),y-8*(1+k),16*(1+k),16*(1+k));
    }
    g.restore();return true;
  }
  const original=R.drawFx;
  R.drawFx=function(g,f,t){if(owns(f))return f.ground?true:draw(g,f);return original.call(this,g,f,t);};
  const ground=Class3.drawGround;
  Class3.drawGround=function(g,f,t){if(owns(f))return draw(g,f);return ground.call(this,g,f,t);};
  const aim=R.drawSkillAreaAim;
  R.drawSkillAreaAim=function(g,a,t){if(!caster(G.player?.job))return aim.call(this,g,a,t);
    grid(g,a.x*TILE,a.y*TILE*R.K,a.r*TILE,a.col,.8);
    g.save();g.strokeStyle=a.col;g.lineWidth=1;const x=a.x*TILE,y=a.y*TILE*R.K;
    g.beginPath();g.moveTo(x-7,y);g.lineTo(x+7,y);g.moveTo(x,y-5);g.lineTo(x,y+5);g.stroke();g.restore();
  };
  return {caster,ids,names,text,owns,draw,grid};
})();
