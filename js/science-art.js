'use strict';
// Generated raster pictures only: original effect objects/timers still own combat.
const ScienceArt=(()=>{
  const names=['plasma','cryo','tesla','nano','photon','medical','rail','orbital'];
  function family(id,f={}){
    const profile=typeof ScienceSkillProfiles!=='undefined'&&ScienceSkillProfiles.get(id);
    if(profile&&id!=='ragnarok_verse'&&id!=='triune_lance')return profile.family;
    const name=(SciencePresentation.names[id]||SKILLS[id]?.name||'').toLowerCase();
    if(id==='ragnarok_verse'||id==='triune_lance')return {fire:'plasma',water:'cryo',wind:'tesla'}[f.el||f.element]||(id==='triune_lance'?'rail':'orbital');
    if(/orbital|bombardment/.test(name))return 'orbital';
    if(/cryo|insulation/.test(name))return 'cryo';
    if(/tesla|conductive|capacitor|electric/.test(name))return 'tesla';
    if(/nanotech|nano|corrosion|signal disruption|siphon|particle/.test(name))return 'nano';
    if(/shield|barrier|ward|photon|stabilizer|protection/.test(name))return 'photon';
    if(/repair|medical|bio|tissue|decontamination|homeostasis|respiration|oxygen|recovery|reconstruction/.test(name))return 'medical';
    if(/railgun|lance|kinetic|impact|impulse|counterforce|palm|shock|seismic/.test(name))return 'rail';
    return 'plasma';
  }
  function projectileFrame(g,id,kind,x,y,angle,width,time){
    const profile=typeof ScienceSkillProfiles!=='undefined'&&ScienceSkillProfiles.get(id);
    const name=id==='triune_lance'?kind:profile?.projectile||kind,img=Art.get('vfx_science_projectile_'+name+'_v1');
    if(!img)return false;
    g.save();g.translate(x,y);g.rotate(angle);
    frame(g,img,Math.floor(time*16)%4,0,0,width,1,200/256,.5);g.restore();return true;
  }
  function fragments(g,f,x,y,r,color){
    const age=f.kind==='meteor'?f.t-.42:f.t;
    if(age<0||age>.8)return;
    const seed=f.seed||0,count=R.quality==='low'?3:6;
    g.save();const opacity=g.globalAlpha;g.fillStyle=color;
    for(let i=0;i<count;i++){
      const a=(i+.3)/count*Math.PI*2+(seed%17)*.1,speed=25+(i%3)*15;
      const height=Math.max(0,65*age-115*age*age),dx=Math.cos(a)*speed*age,dy=Math.sin(a)*speed*age*R.K;
      const side=2+(i%2),alpha=Math.max(0,1-age/.8);g.globalAlpha=opacity*alpha;
      g.save();g.translate(x+dx,y+dy-height);g.rotate(age*(i%2?5:-4));g.fillRect(-side/2,-side/2,side,side);g.restore();
    }g.restore();
  }
  function frame(g,img,index,x,y,width,alpha=1,anchorX=.5,anchorY=.5){
    const cell=img.height,n=Math.round(img.width/cell),a=Math.floor(U.clamp(index,0,n-1));
    // Keep the authored sprite silhouette sharp rather than blending two poses.
    g.save();const opacity=g.globalAlpha;g.globalAlpha=opacity*alpha;
    g.drawImage(img,a*cell,0,cell,cell,x-width*anchorX,y-width*anchorY,width,width);
    g.restore();
  }
  function draw(g,f){
    const id=f.id||f.src,s=SKILLS[id];
    if(!s||!SciencePresentation.ids.has(id))return false;
    if(f.runeVariant==='runic_ward.feedback'&&f.type==='lightning'){
      const img=Art.get('vfx_science_rune_insulation_feedback_contact_v2');if(!img)return false;
      const k=U.clamp(f.t/f.dur,0,1),target=f.ref,o=f.feedbackOrigin;if(!target||!o)return false;
      if(f.t>=f.dur)return true; // Keep the original linger object, without a frozen final contact.
      const sx=o.x*TILE+o.facing*10,sy=o.y*TILE*R.K-28,tx=target.x*TILE,ty=target.y*TILE*R.K-22*(target.def?.scale||1);
      const beamAlpha=Math.max(0,1-f.t/.09);
      if(beamAlpha>0){
        // Retaliation damage is instant. Both strands are full-length from the first picture; no flight timer.
        const dx=tx-sx,dy=ty-sy,length=Math.hypot(dx,dy)||1,count=R.quality==='low'?3:5;
        g.save();g.globalAlpha*=beamAlpha;g.lineWidth=1;g.lineJoin='round';g.lineCap='round';
        for(const sign of [-1,1]){g.strokeStyle=sign<0?'#c9f9ff':'#7bbccc';g.beginPath();g.moveTo(sx,sy);
          for(let i=1;i<=count;i++){const q=i/count,bend=i===count?0:sign*Math.sin(q*Math.PI)*2+Math.sin(i*2.1+f.t*40);
            g.lineTo(sx+dx*q-dy/length*bend,sy+dy*q+dx/length*bend);}g.stroke();}
        g.restore();
      }
      frame(g,img,Math.min(3,Math.floor(k*4)),tx,ty,100,Math.min(1,(1-k)/.18));return true;
    }
    if(f.runeVariant==='runic_ward.barrier'){
      const img=Art.get('vfx_science_rune_insulation_barrier_'+(f.type==='ring'?'break':'ready')+'_v1');if(!img)return false;
      const p=R.fxPos(f),x=p.x*TILE,y=p.y*TILE*R.K,k=U.clamp(f.t/f.dur,0,1);
      if(f.kind==='aura'){
        // An early block consumes the ready state even if its old aura clock still runs.
        if(!f.ref?.rc?.barrier||Runes.chosen('runic_ward')?.id!=='runic_ward.barrier')return true;
        frame(g,img,Math.min(3,Math.floor(k*4)),x,y,140,Math.min(1,k/.08),.5,220/256);return true;
      }
      if(f.type==='ring'){
        // Display the existing three pulse waves within the original two-cell extent.
        g.save();g.lineWidth=1;const opacity=g.globalAlpha;
        for(let i=0;i<(f.waves||1);i++){const q=U.clamp(k*1.4-i*.2,0,1);if(q<=0||q>=1)continue;
          g.globalAlpha=opacity*(1-q);g.strokeStyle='#9dd4e5';g.beginPath();g.ellipse(x,y,f.r*TILE*q,f.r*TILE*q*R.K,0,0,Math.PI*2);g.stroke();}
        g.restore();frame(g,img,Math.min(3,Math.floor(k*4)),x,y,140,Math.min(1,(1-k)/.18),.5,220/256);return true;
      }
    }
    if(f.runeVariant==='thunder_rune.focus'){
      const img=Art.get('vfx_science_rune_thunder_focus_contact_v1');if(!img)return false;
      // Preserve native objects and callbacks; only this Rune's picture is replaced.
      if(f.type==='lightning')return true;
      if(f.elemental){
        const target=f.focusTarget,origin=f.focusOrigin;if(!target||!origin)return false;
        if(target.dead)return true;
        const sx=origin.x*TILE+origin.facing*10,sy=origin.y*TILE*R.K-30;
        const tx=target.x*TILE,ty=target.y*TILE*R.K-22*(target.def?.scale||1);
        const contactAge=f.focusContactAge,hit=contactAge!==undefined;
        const progress=Math.min(1,f.t/.28),beamAlpha=hit?Math.max(0,1-(f.t-contactAge)/.06):Math.min(1,f.t/.04);
        if(beamAlpha>0){
          const count=R.quality==='low'?4:7,dx=tx-sx,dy=ty-sy,length=Math.hypot(dx,dy)||1;
          g.save();g.globalAlpha*=beamAlpha;g.lineJoin='round';g.lineCap='round';g.beginPath();g.moveTo(sx,sy);
          for(let i=1;i<=count;i++){const q=i/count*progress,bend=i===count?0:Math.sin((f.seed||0)*.13+i*2.7+f.t*36)*3;
            g.lineTo(sx+dx*q-dy/length*bend,sy+dy*q+dx/length*bend);}
          g.strokeStyle='#b58a2a';g.lineWidth=3;g.stroke();g.strokeStyle='#fff7c4';g.lineWidth=1;g.stroke();g.restore();
        }
        if(hit){const k=U.clamp((f.t-contactAge)/(f.dur-contactAge),0,1);
          frame(g,img,Math.min(3,Math.floor(k*4)),tx,ty,100,Math.min(1,(1-k)/.2),.5,220/256);}
        return true;
      }
    }
    if(f.runeVariant==='thunder_rune.storm'){
      if(f.kind==='zone'){
        const img=Art.get('vfx_science_rune_thunder_storm_field_v2');if(!img)return false;
        const x=f.x*TILE,y=f.y*TILE*R.K,r=f.r*TILE,remaining=f.dur-f.t;
        const pulse=f.pulseAt===undefined?Infinity:G.time-f.pulseAt;
        const active=pulse>=0&&pulse<.3,alpha=Math.min(1,f.t/.07,remaining/.22);
        g.save();g.globalAlpha*=alpha;g.fillStyle=active?'rgba(91,173,202,.12)':'rgba(35,72,83,.08)';
        g.strokeStyle=active?'#c7f9ff':'#6ca7bc';g.lineWidth=active?1.5:1;g.setLineDash([4,7]);
        g.beginPath();g.ellipse(x,y,r,r*R.K,0,0,Math.PI*2);g.fill();g.stroke();g.restore();
        const index=remaining<.3?3:pulse<.08?1:pulse<.3?2:0;
        frame(g,img,index,x,y,112,alpha,.5,220/256);return true;
      }
      // Keep the original generic impact object/seed, but show contact only on its native lightning clock.
      if(f.skillArt||f.elemental)return true;
      if(f.type==='lightning'){
        const img=Art.get('vfx_science_rune_thunder_storm_contact_v2');if(!img)return false;
        const p=R.fxPos(f),k=U.clamp(f.t/f.dur,0,1);
        frame(g,img,Math.min(3,Math.floor(k*4)),p.x*TILE,p.y*TILE*R.K-22,105,Math.min(1,k/.07,(1-k)/.25));return true;
      }
    }
    if(f.runeVariant==='fire_rune.split'){
      const k=U.clamp(f.t/f.dur,0,1);
      if(f.kind==='bolt'){
        const img=Art.get('vfx_science_rune_fire_split_projectile_v1'),target=f.to||f.ref;if(!img||!target)return false;
        // Sample the original homing position and arc; its callback still owns damage.
        const sx=f.sx*TILE,sy=f.sy*TILE*R.K-24,tx=target.x*TILE,ty=target.y*TILE*R.K-20*(target.def?.scale||1);
        const dx=tx-sx,dy=ty-sy,arc=f.arc||0;
        g.save();g.translate(sx+dx*k,sy+dy*k-Math.sin(k*Math.PI)*arc);
        g.rotate(Math.atan2(dy-Math.cos(k*Math.PI)*Math.PI*arc,dx));
        frame(g,img,Math.min(3,Math.floor(k*4)),0,0,86,1,210/256,.5);g.restore();return true;
      }
      if(f.skillArt){
        const img=Art.get('vfx_science_rune_fire_split_contact_v1');if(!img)return false;
        const p=R.fxPos(f);frame(g,img,Math.min(3,Math.floor(k*4)),p.x*TILE,p.y*TILE*R.K-20*(p.def?.scale||1),90,Math.min(1,k/.07,(1-k)/.25));return true;
      }
    }
    if(f.runeVariant==='earth_rune.fissure'){
      const img=Art.get('vfx_science_rune_earth_fissure_v2')||Art.get('vfx_science_rune_earth_fissure_v1');if(!img)return false;
      if(f.kind==='fissure'){
        const length=f.len*TILE,travel=FX2.SPEC.fissure.travel,k=U.clamp(f.t/f.dur,0,1);
        const index=f.t<travel?0:f.t<.5?1:f.t<.73?2:3;
        g.save();g.translate(f.x*TILE,f.y*TILE*R.K);g.scale(1,R.K);g.rotate(Math.atan2(f.uy,f.ux));
        // The native front reaches each ground-plane distance in travel * distance / length.
        g.beginPath();g.rect(0,-TILE,length*Math.min(1,f.t/travel),TILE*2);g.clip();
        // Source material spans about 198 pixels; project its width into the original 1.6-cell hit band.
        g.scale(1,.42);frame(g,img,index,0,0,length*256/198,Math.min(1,(1-k)/.22),30/256,.5);g.restore();return true;
      }
      if(f.kind==='imp'){
        const p=R.fxPos(f),k=U.clamp(f.t/f.dur,0,1);
        g.save();g.translate(p.x*TILE,p.y*TILE*R.K);g.scale(1,R.K);g.rotate(f.groundAngle||0);
        frame(g,img,Math.min(3,1+Math.floor(k*3)),0,0,50,Math.min(1,k/.07,(1-k)/.25));g.restore();return true;
      }
    }
    if(f.runeVariant==='ice_rune.lance'){
      const img=Art.get('vfx_science_rune_ice_lance_v2');if(!img)return false;
      // Retain the per-target native delivery object and callback, without a second falling projectile.
      if(f.type==='coldbolt')return true;
      if(f.skillArt){
        const contact=Art.get('vfx_science_rune_ice_lance_contact_v1');if(!contact)return false;
        const p=R.fxPos(f),k=U.clamp(f.t/f.dur,0,1);
        frame(g,contact,Math.min(3,Math.floor(k*4)),p.x*TILE,p.y*TILE*R.K-18,85,Math.min(1,k/.07,(1-k)/.3));return true;
      }
      if(f.type==='arrow'){
      // Draw between the casting hand and target body; the ground-plane ray and clock stay native.
      const k=U.clamp(f.t/f.dur,0,1),sx=f.sx*TILE,sy=(f.sy+.6)*TILE*R.K-30,tx=f.tx*TILE,ty=f.ty*TILE*R.K-18;
      g.save();g.translate(sx+(tx-sx)*k,sy+(ty-sy)*k);g.rotate(Math.atan2(ty-sy,tx-sx));
      frame(g,img,Math.min(3,Math.floor(k*4)),0,0,100,Math.min(1,(1-k)/.15),.5,.5);g.restore();
      return true;
      }
    }
    if(f.runeVariant==='ice_rune.shatter'){
      const img=Art.get('vfx_science_rune_ice_shatter_v2');if(!img)return false;
      // The native fracture replaces this hit's base cryo impact, not its delivery.
      if(f.skillArt)return true;
      if(f.type==='coldbolt'){
        const p=R.fxPos(f),k=U.clamp(f.t/f.dur,0,1);
        frame(g,img,Math.min(3,Math.floor(k*4)),p.x*TILE,p.y*TILE*R.K,100,Math.min(1,(1-k)/.25),128/256,224/256);
        return true;
      }
    }
    if(f.runeVariant==='fire_rune.kindle'&&['mark','burst'].includes(f.kind)){
      if(f.kind==='mark'&&f.ref?.dead)return true;
      const img=Art.get('vfx_science_rune_fire_kindle_v1');if(!img)return false;
      const p=R.fxPos(f),k=U.clamp(f.t/f.dur,0,1);
      const index=f.kind==='mark'?Math.floor(f.t*2)%2:k<.45?2:3;
      const alpha=f.kind==='mark'?Math.min(1,f.t/.1,(f.dur-f.t)/.4):Math.min(1,(1-k)/.3);
      frame(g,img,index,p.x*TILE+24,p.y*TILE*R.K-24,72,alpha,128/256,224/256);
      return true;
    }
    if(f.runeVariant==='earth_rune.boulder'&&['sky','boulder_impact'].includes(f.kind)){
      const img=Art.get('vfx_science_rune_earth_boulder_v1');if(!img)return false;
      const p=R.fxPos(f),x=p.x*TILE,y=p.y*TILE*R.K,k=U.clamp(f.t/f.dur,0,1);
      if(f.kind==='sky'){
        const r=f.r*TILE;
        g.save();g.fillStyle=`rgba(28,24,20,${.2+.15*k})`;g.beginPath();g.ellipse(x,y,r,r*R.K,0,0,Math.PI*2);g.fill();
        g.strokeStyle='#ba995c';g.lineWidth=1;g.setLineDash([4,5]);g.stroke();g.restore();
        if(k>=.55){
          const u=(k-.55)/.45;
          // Keep the falling stone visible above its ground anchor in short viewports.
          const height=Math.max(12,Math.min(140,y-R.camY-112*(220/256)-8/R.zoom));
          frame(g,img,0,x,y-height*(1-u*u),112,1,128/256,220/256);
        }
      }else{
        const index=k<.2?1:k<.7?2:3;
        frame(g,img,index,x,y,112,Math.min(1,(1-k)/.25),128/256,220/256);
      }
      return true;
    }
    const profile=typeof ScienceSkillProfiles!=='undefined'&&ScienceSkillProfiles.get(id);
    if(f.type==='castcircle'){
      const p=R.fxPos(f),x=p.x*TILE,y=p.y*TILE*R.K-48,k=U.clamp(f.t/f.dur,0,1);
      g.save();g.strokeStyle='#6dabbc';g.fillStyle='#b6e8f0';g.lineWidth=1;
      g.strokeRect(x-17,y,34,4);g.fillRect(x-16,y+1,32*k,2);g.restore();return true;
    }
    if(f.kind==='chain'&&f.fx2){
      const p=R.fxPos(f),body=[p.x*TILE,p.y*TILE*R.K-18],a=f.from||body,b=f.to||body;
      g.save();g.globalAlpha*=Math.max(0,1-f.t/f.dur);g.strokeStyle='#b2f3ff';g.lineWidth=1.5;
      g.beginPath();g.moveTo(a[0],a[1]);const count=R.quality==='low'?5:9;
      for(let i=1;i<count;i++){const q=i/count,jitter=Math.sin(i*2.6+(f.seed||0))*(i%2?5:-5);
        g.lineTo(U.lerp(a[0],b[0],q)+jitter,U.lerp(a[1],b[1],q)-jitter*.5);
      }g.lineTo(b[0],b[1]);g.stroke();
      const relay=Art.get('vfx_science_skill_'+id+'_v1');
      if(relay)frame(g,relay,Math.min(3,Math.floor(U.clamp(f.t/f.dur,0,1)*4)),b[0],b[1],(profile?.size||100)*.6);
      g.restore();return true;
    }
    if(id==='meteor_rune'&&f.kind==='imp'&&ElementalVFX.covered(id))return true;
    if(f.kind==='drain_back'){
      const source=R.fxPos(f),p=G.player,k=U.clamp(f.t/f.dur,0,1);
      const sx=source.x*TILE,sy=source.y*TILE*R.K-18,ex=p.x*TILE,ey=p.y*TILE*R.K-28;
      return projectileFrame(g,id,'nano',U.lerp(sx,ex,k),U.lerp(sy,ey,k),Math.atan2(ey-sy,ex-sx),44,f.t);
    }
    if(f.kind==='meteor'){
      const img=Art.get('vfx_science_orbital_v2');if(!img)return false;
      const p=ElementalVFX.meteorSample(f),hit=p.impactAt,r=(f.r||s.dmg?.area||2.5)*TILE;
      if(p.phase==='flight'){
        SciencePresentation.grid(g,p.groundX,p.groundY,r,'#ffa36d',.3);
        // The capsule tip follows the original trajectory; no impact before the hit timer.
        g.save();g.translate(p.x,p.y);g.rotate(Math.atan2(330,-170)-Math.PI/4);
        // Authored atlas contact: bottom capsule tip at (182.5,173), not padded cell center.
        frame(g,img,0,0,0,105,1,182.5/256,173/256);g.restore();
      }else{
        const k=U.clamp((f.t-hit)/Math.max(.01,f.dur-hit),0,1);
        const index=k<.18?1:k<.72?2:3;
        // Peak's white contact core is (123,130); later debris may rise away from that point.
        frame(g,img,index,p.groundX,p.groundY,Math.min(255,Math.max(150,r*2.15)),Math.min(1,(1-k)/.18),123/256,130/256);
        fragments(g,f,p.groundX,p.groundY,r,'#80919a');
      }
      return true;
    }
    const projectile=ProjectileArt.sample(f);
    if(projectile){
      if(projectileFrame(g,id,family(id,f),projectile.x,projectile.y,projectile.angle,Math.min(115,projectile.width),f.t))return true;
      const img=Art.get('vfx_science_rail_v2');if(!img)return false;
      // Sample the existing flight object; collision and its onHit callback remain native.
      g.save();g.translate(projectile.x,projectile.y);g.rotate(projectile.angle);
      frame(g,img,0,0,0,Math.min(100,projectile.width),1,.8,.5);g.restore();return true;
    }
    if(f.kind==='projectile'){
      const p=R.fxPos(f),k=U.clamp(f.t/f.dur,0,1),sx=f.sx*TILE,sy=f.sy*TILE*R.K-28;
      const ex=p.x*TILE,ey=p.y*TILE*R.K-18,img=Art.get('vfx_science_rail_v2');
      if(!img||![sx,sy,ex,ey].every(Number.isFinite))return false;
      if(projectileFrame(g,id,family(id,f),U.lerp(sx,ex,k),U.lerp(sy,ey,k),Math.atan2(ey-sy,ex-sx),profile?.mode==='lance'?112:82,f.t))return true;
      g.save();g.translate(U.lerp(sx,ex,k),U.lerp(sy,ey,k));g.rotate(Math.atan2(ey-sy,ex-sx));
      frame(g,img,0,0,0,90,1,.8,.5);g.restore();return true;
    }
    const kind=family(id,f),img=Art.get('vfx_science_'+kind+'_v2')||Art.get('vfx_science_'+kind+'_v1');if(!img)return false;
    const p=R.fxPos(f),x=p.x*TILE,y=p.y*TILE*R.K-18,k=U.clamp(f.t/f.dur,0,1);
    const field=['field','circle','cast','zone','tree'].includes(f.kind)||!!s.buff||!s.dmg;
    const radius=(f.r||s.dmg?.area||.8)*TILE,width=f.kind==='tree'?156:profile?.size||(field?Math.min(155,Math.max(65,radius*2)):Math.min(190,Math.max(70,radius*2.4)));
    const mode=f.kind==='tree'?'node':profile?.mode,alpha=Math.max(0,Math.min(1,k/.035,(1-k)/.16));
    if(s.type==='passive'&&f.kind!=='tree'){
      // Show a compact readout only when a native passive event exists.
      g.save();g.globalAlpha*=alpha;g.strokeStyle='#9ed6d3';g.lineWidth=1;
      const count=1+(Number(f.index||0)%3);for(let i=0;i<count;i++)g.strokeRect(x-9+i*7,y-20,4,7);
      g.restore();return true;
    }
    const individual=Art.get('vfx_science_skill_'+id+'_v1');
    if(individual){
      // Legacy self feedback accompanies the authored cast; it must not stamp it twice.
      if(['heal','buff'].includes(f.type)&&G.fx.some(q=>q.skillArt&&q.id===id&&q.ref===f.ref))return true;
      const apparatus=['pillar','containment','node','station'].includes(mode);
      const secondary=apparatus&&['cast','impact','imp'].includes(f.kind);
      // One authored apparatus for the native field; hit events only show a small contact.
      const size=width*(secondary?.35:field?1.3:1.1);
      frame(g,individual,f.kind==='cast'?0:Math.min(3,Math.floor(k*4)),x,y,size,alpha);
      if(['seismic','kinetic','combo'].includes(mode))fragments(g,f,x,y+18,radius,'#8498a5');
      return true;
    }
    if(['repair','station','regulation','recharge','exchange'].includes(mode)){
      const drone=Art.get('vfx_science_projectile_medical_v1');
      if(drone){
        const count=mode==='station'?4:profile.motif==='chassis-reconstruction'?3:mode==='repair'?2:1;
        if(mode==='station')SciencePresentation.grid(g,x,y+18,radius,'#98e8bc',.35);
        for(let i=0;i<count;i++){
          const a=i/count*Math.PI*2+(mode==='station'?0:k*.7),orbit=mode==='station'?radius*.7:20+width*.13;
          const px=x+Math.cos(a)*orbit,py=y+Math.sin(a)*orbit*R.K-8*Math.sin(k*Math.PI);
          g.save();g.translate(px,py);g.rotate(Math.sin(a)*.2);frame(g,drone,Math.floor(f.t*12)%4,0,0,45,alpha);g.restore();
        }
        if(profile.motif==='decontamination'){
          g.save();g.globalAlpha*=alpha;g.strokeStyle='#b7f2d6';g.lineWidth=1;
          g.beginPath();g.moveTo(x-23,y-35+65*k);g.lineTo(x+23,y-35+65*k);g.stroke();g.restore();
        }
        return true;
      }
    }
    if(mode==='barrier'){
      frame(g,img,0,x,y,width,alpha*.8);return true;
    }
    if(mode==='pillar'||mode==='containment'||mode==='node'){
      // Charging and per-victim hit events do not instantiate a second field.
      if(f.kind==='cast'||f.kind==='impact'||f.kind==='imp'){
        frame(g,img,f.kind==='cast'?0:Math.min(3,Math.floor(k*4)),x,y,width*.35,alpha);return true;
      }
      const count=R.quality==='low'?3:mode==='pillar'?3:mode==='containment'?5:4;
      SciencePresentation.grid(g,x,y+18,radius,kind==='cryo'?'#a6efff':'#b5e6f5',.4);
      for(let i=0;i<count;i++){
        const a=i/count*Math.PI*2,spread=radius*(mode==='pillar'?.4:.72);
        const px=x+Math.cos(a)*spread,py=y+18+Math.sin(a)*spread*R.K;
        frame(g,img,mode==='pillar'?1:0,px,py-width*.14,width*.52,alpha);
      }return true;
    }
    if(mode==='collapse'){
      const count=R.quality==='low'?3:6;
      for(let i=0;i<count;i++){const a=i/count*Math.PI*2,spread=radius*(1-k);
        frame(g,img,0,x+Math.cos(a)*spread,y+Math.sin(a)*spread*R.K,width*.36,alpha);
      }return true;
    }
    if(field){SciencePresentation.grid(g,x,y+18,radius,{cryo:'#a6efff',tesla:'#8bdaff',nano:'#aab5ff',medical:'#b8f4d6',photon:'#c6f9ff'}[kind]||'#ffa36d',.4);}
    frame(g,img,Math.min(3,Math.floor(k*4)),x,y,width,alpha);
    if(['seismic','kinetic','combo'].includes(mode))fragments(g,f,x,y+18,radius,'#8498a5');
    return true;
  }
  function passive(g,p){
    if(p!==G.player||p.dead||!p.rc?.barrier||Runes.chosen('runic_ward')?.id!=='runic_ward.barrier')return false;
    if(G.fx.some(f=>f.runeVariant==='runic_ward.barrier'&&f.kind==='aura'&&f.t<f.dur))return false;
    const img=Art.get('vfx_science_rune_insulation_barrier_ready_v1');if(!img)return false;
    // Player drawing already carries its ground-plane Y translation. No persistent FX/timer is added.
    frame(g,img,3,p.x*TILE,p.y*TILE,140,.75,.5,220/256);return true;
  }
  const playerDraw=Sprites.drawPlayer;
  Sprites.drawPlayer=function(g,p,t){passive(g,p);return playerDraw.apply(this,arguments);};
  return {names,family,frame,draw,projectileFrame,passive};
})();
