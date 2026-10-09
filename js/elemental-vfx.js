'use strict';
// One composed spell owns its picture; the original timers still own damage.
const ElementalVFX=(()=>{
  const active=new WeakMap();
  const ready=kind=>kind==='meteor'?!!(Art.get('vfx_meteor_flight_v2')&&Art.get('vfx_meteor_impact_v2')):!!Art.get('vfx_lightning_v2');
  function owner(id){const f=active.get(G.player)?.[id];return f&&G.fx.includes(f)&&f.t<f.dur&&f.map===G.map.id?f:null;}
  function covered(id){return !!owner(id)&&ready(id==='meteor_rune'?'meteor':'lightning');}
  const cast0=FX2.cast;
  FX2.cast=function(s,lv,tgt){
    const old=cast0.apply(this,arguments);
    if(G.fastSim||!['meteor_rune','thunder_rune'].includes(s.id))return old;
    const kind=s.id==='meteor_rune'?'meteor':'lightning';if(!ready(kind))return old;
    const o=tgt||G.player;
    const f=kind==='meteor'?G.fx.findLast(f=>f.fx2&&f.kind==='meteor'&&f.t===0):addFx({type:'elemental',elemental:true,kind,x:o.x,y:o.y,r:s.dmg.area,dur:.82});
    if(f){f.elemental=true;f.src=s.id;f.map=G.map.id;if(['thunder_rune.storm','thunder_rune.focus'].includes(s.rune?.id))f.runeVariant=s.rune.id;
      if(s.rune?.id==='thunder_rune.focus'){f.focusOrigin={x:G.player.x,y:G.player.y,facing:G.player.facing||1};f.focusTarget=tgt;}
      let rec=active.get(G.player);if(!rec)active.set(G.player,rec={});rec[s.id]=f;}
    return !!f||old;
  };
  function meteorSample(f){
    const ti=.42,q=U.clamp(f.t/ti,0,1),e=Math.pow(q,1.5);
    const x=f.x*TILE,y=f.y*TILE*R.K;
    return {phase:f.t<ti?'flight':'impact',x:x+170*(1-e),y:y-330*(1-e),groundX:x,groundY:y,impactAt:ti};
  }
  function frame(g,img,index,x,y,width,alpha=1,anchor=220){
    const cell=img.height,n=Math.round(img.width/cell),f=U.clamp(index,0,n-1),a=Math.floor(f),mix=f-a;
    g.save();g.globalCompositeOperation='source-over';
    const dy=y-width*anchor/256;
    g.globalAlpha=alpha*(1-mix);g.drawImage(img,a*cell,0,cell,cell,x-width/2,dy,width,width);
    if(mix&&a+1<n){g.globalAlpha=alpha*mix;g.drawImage(img,(a+1)*cell,0,cell,cell,x-width/2,dy,width,width);}
    g.restore();
  }
  function ellipse(g,x,y,r,alpha,col){
    g.strokeStyle=`rgba(${col},${alpha})`;g.lineWidth=1.2;g.beginPath();g.ellipse(x,y,r,r*R.K,0,0,Math.PI*2);g.stroke();
  }
  function meteor(g,f){
    if(!ready('meteor'))return false;
    const p=meteorSample(f),radius=(f.r||2.5)*TILE;
    g.save();
    if(p.phase==='flight'){
      const q=f.t/.42;
      ellipse(g,p.groundX,p.groundY,radius,.16+.18*q,'255,166,78');
      g.fillStyle=`rgba(255,120,38,${.035+.04*q})`;g.fill();
      // Small trailing embers leave the stone texture readable.
      const count=R.quality==='low'?4:9;
      for(let i=1;i<=count;i++){
        const t=Math.max(0,f.t-i*.013),prev=meteorSample({...f,t});
        g.fillStyle=`rgba(255,${130+i*8},65,${(1-i/(count+1))*.65})`;
        g.beginPath();g.arc(prev.x+Math.sin(i*2.7+f.seed)*4,prev.y,1.8-i*.1,0,Math.PI*2);g.fill();
      }
      const im=Art.get('vfx_meteor_flight_v2'),width=190;
      // The hot contact tip, not the center of a padded image, lands on the ground.
      g.translate(p.x,p.y);g.rotate(-.31);g.drawImage(im,-width*112/256,-width*220/256,width,width);
    }else{
      const age=f.t-.42,k=U.clamp(age/.92,0,1),alpha=Math.min(1,(1-k)/.18);
      // The contact flash is immediate; debris and ash then settle at one fixed point.
      const index=k<.18?k/.18*2:2+(k-.18)/.82*5;
      const width=Math.max(180,Math.min(255,radius*2.15));
      frame(g,Art.get('vfx_meteor_impact_v2'),index,p.groundX,p.groundY,width,alpha,180);
      const shock=U.clamp(age/.32,0,1);
      if(shock<1)ellipse(g,p.groundX,p.groundY,radius*(.25+.75*shock),.46*(1-shock),'255,197,115');
    }
    g.restore();return true;
  }
  function lightning(g,f){
    if(!ready('lightning'))return false;
    const pos=R.fxPos(f),x=pos.x*TILE,y=pos.y*TILE*R.K;
    const hit=f.elemental?.28:(f.hitAt??f.dur),end=f.dur+(f.linger||0),age=Math.max(0,f.t-hit);
    const index=f.t<hit?Math.min(2,f.t/Math.max(.01,hit)*2):2+U.clamp(age/Math.max(.08,end-hit),0,1)*5;
    const alpha=f.t<hit?.35+.65*f.t/Math.max(.01,hit):Math.min(1,Math.max(0,(end-f.t)/.12));
    frame(g,Art.get('vfx_lightning_v2'),index,x,y,f.elemental?230:170,alpha);
    return true;
  }
  function burst(g,f){
    const kind=f.kind;if(!ready(kind))return false;
    const pos=R.fxPos(f),k=U.clamp(f.t/f.dur,0,1),alpha=Math.min(1,(1-k)/.2);
    const img=Art.get(kind==='meteor'?'vfx_meteor_impact_v2':'vfx_lightning_v2');
    // Chain lightning uses ground arcs at each hop, preserving the connecting bolt.
    const start=kind==='lightning'&&f.id==='chain_lightning'?4:kind==='lightning'?2:0;
    frame(g,img,start+(7-start)*k,pos.x*TILE,pos.y*TILE*R.K,f.width,alpha,kind==='meteor'?180:220);
    return true;
  }
  function draw(g,f){
    if(f.fx2&&f.kind==='meteor')return meteor(g,f);
    if(f.elemental&&f.kind==='lightning')return lightning(g,f);
    if(f.type==='lightning'||f.type==='sprite'&&f.sprite==='fx_lightning'){
      if(f.src==='thunder_rune'&&covered(f.src))return true;
      return lightning(g,f);
    }
    return false;
  }
  const draw0=R.drawFx;R.drawFx=function(g,f,t){if(draw(g,f))return;return draw0.call(this,g,f,t);};
  return {ready,covered,meteorSample,draw,burst};
})();
