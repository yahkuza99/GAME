'use strict';
// Signature VFX for empowered class skills. Drawn in projected world space.
const ClassTraitFX = (() => {
  const colors={einherjar:'#ffe19b',runecaster:'#87efff',wildhunter:'#baff91',volva:'#fff4bb',trickster:'#dba7ff',berserker:'#ff8959'};
  const glyphs={einherjar:'ᛉ',runecaster:'ᚨ',wildhunter:'ᛏ',volva:'ᛒ',trickster:'ᛚ',berserker:'ᚢ'};
  function emit(root,phase,at,job,r=1){
    if(G.fastSim||!G.player||G.player.dead)return;
    const p=G.player,o=at||p;
    // Multi-hit attacks share a short impact limit; packs stay readable.
    if(phase==='impact'){
      const recent=G.fx.filter(f=>f.traitFx&&f.phase==='impact'&&f.t<.08);
      if(recent.length>=5)return;
    }
    const col=job==='seidr'?'#bc87ff':job==='skadi'?'#a0e6ff':job==='jotun'?'#f0b27f':colors[root];
    G.fx.push({type:'class_trait',traitFx:true,root,job,phase,x:o.x,y:o.y,sx:p.x,sy:p.y,
      col,r:Math.min(3.5,r||1),t:0,dur:phase==='zone'?3:phase==='ready'?.8:phase==='impact'?.42:.9,linger:0});
  }
  const path=(g,fn)=>{g.beginPath();fn();g.stroke();};
  function draw(g,f){
    const k=U.clamp(f.t/f.dur,0,1),a=Math.sin(Math.PI*k),x=f.x*TILE,y=f.y*TILE*R.K;
    g.save();g.translate(x,y);g.globalCompositeOperation='lighter';g.globalAlpha=a*.85;
    g.strokeStyle=f.col;g.fillStyle=f.col;g.lineWidth=2;g.shadowColor=f.col;g.shadowBlur=8;
    if(f.phase==='zone'){
      const r=f.r*TILE;g.scale(1,R.K);g.globalAlpha=a*.38;g.lineWidth=1.2;
      path(g,()=>g.arc(0,0,r,0,Math.PI*2));path(g,()=>g.arc(0,0,r*.88,0,Math.PI*2));
      for(let i=0;i<3;i++)path(g,()=>g.arc(0,0,r*.72,i*2.1+k*3,i*2.1+k*3+1.3));
      g.restore();return;
    }
    if(f.phase==='ready'){
      path(g,()=>g.ellipse(0,-28,22,27,0,-Math.PI*.85+k,Math.PI*.85+k));
      g.font='bold 22px serif';g.textAlign='center';g.fillText(glyphs[f.root],0,-49+4*k);
      g.restore();return;
    }
    const impact=f.phase==='impact',rr=impact?12+20*k:28+12*k;
    if(f.root==='einherjar'){
      // Curved shield silhouette; Hersir releases three spear strokes instead.
      if(f.job==='hersir')for(let i=-1;i<=1;i++)path(g,()=>{g.moveTo(-36+i*7,-18);g.lineTo(20+i*7+24*k,-39);});
      else {g.translate(0,-29);path(g,()=>{g.moveTo(-23,-14);g.quadraticCurveTo(0,-29,23,-14);g.lineTo(20,8);g.quadraticCurveTo(10,27,0,32);g.quadraticCurveTo(-10,27,-20,8);g.closePath();});
        path(g,()=>{g.moveTo(0,-14);g.lineTo(0,20);});}
    }else if(f.root==='runecaster'){
      const r=impact?rr:f.r*TILE;
      g.scale(1,R.K);
      for(let i=0;i<3;i++)path(g,()=>g.arc(0,0,r*(.62+i*.14),i*2.1+k*2,i*2.1+k*2+1.5));
      g.font='bold 15px serif';g.textAlign='center';g.textBaseline='middle';
      for(let i=0;i<6;i++){const an=i*Math.PI/3-k;g.fillText('ᚠᚢᚦᚨᚱᚲ'[i],Math.cos(an)*r*.9,Math.sin(an)*r*.9);}
    }else if(f.root==='wildhunter'){
      // Curved prey brackets plus three feather trails.
      g.translate(0,-23);
      for(const sign of [-1,1])path(g,()=>g.arc(0,0,rr,sign>0?-.7:Math.PI-.7,sign>0?.7:Math.PI+.7));
      for(let i=-1;i<=1;i++)path(g,()=>{g.moveTo(-45-20*k,-25+i*9);g.quadraticCurveTo(-18,-18+i*7,10,-7+i*7);});
    }else if(f.root==='volva'){
      // Rising petal arcs and a small halo, with an open centre.
      for(let i=0;i<5;i++){const an=i*Math.PI*2/5;g.save();g.rotate(an);
        path(g,()=>{g.moveTo(0,-10);g.bezierCurveTo(-12,-rr,12,-rr-20*k,0,-rr-15*k);});g.restore();}
      path(g,()=>g.ellipse(0,-38-18*k,18,6,0,0,Math.PI*2));
    }else if(f.root==='trickster'){
      // Violet blade crescents; Skald turns them into concentric sound waves.
      if(f.job==='skald'){g.scale(1,R.K);for(let i=0;i<3;i++)path(g,()=>g.arc(0,0,rr+i*11,0,Math.PI*2));}
      else if(!impact)for(let i=0;i<2;i++)path(g,()=>g.arc(i?12:-12,-25,rr,i?2.5:-.8,i?5.2:1.9));
    }else if(f.root==='berserker'){
      // A heavy axe crescent with branching ground cracks, no star polygon.
      if(!impact)path(g,()=>g.arc(0,-24,rr*1.45,-2.5,-2.5+3.4*k));
      for(let i=-1;i<=1;i++)path(g,()=>{g.moveTo(0,0);g.lineTo(i*18,12*k);g.lineTo(i*35+7,24*k);g.lineTo(i*48-8,35*k);});
    }
    g.restore();
  }
  const draw0=R.drawFx;
  R.drawFx=function(g,f,t){if(f.traitFx)return draw(g,f);return draw0.call(this,g,f,t);};
  return {emit,draw};
})();
