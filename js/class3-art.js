'use strict';
// Three elemental pulses, each drawn when its existing Class3 damage wave fires.
const Class3Art=(()=>{
  function verse(g,f){
    if(!f.c3||f.kind!=='verse'||G.fastSim)return false;
    const kind={fire:'fire',water:'ice',wind:'lightning'}[f.el];
    if(!kind||!Art.get('vfx_art_'+kind))return false;
    SkillArtFX.draw(g,{...f,skillArt:true,kind,width:f.r*TILE*2,phase:'impact'});
    return true;
  }
  function shatter(g,f){
    if(!f.c3||f.kind!=='shatter'||G.fastSim)return false;
    const img=Art.get('vfx_art_ice');if(!img)return false;
    const k=U.clamp(f.t/f.dur,0,1),fr=4+k*3,a=Math.floor(fr),b=Math.min(7,a+1),mix=fr-a;
    const width=f.r*TILE*2.5,x=f.x*TILE-width/2,y=f.y*TILE*R.K-width*220/256;
    g.save();g.globalCompositeOperation='source-over';
    const opacity=Math.min(1,(1-k)/.2)*.85;
    g.globalAlpha=opacity*(1-mix);g.drawImage(img,a*256,0,256,256,x,y,width,width);
    if(b!==a){g.globalAlpha=opacity*mix;g.drawImage(img,b*256,0,256,256,x,y,width,width);}
    g.restore();return true;
  }
  const base=Class3.draw;
  Class3.draw=function(g,f,t){if(verse(g,f)||shatter(g,f))return;return base.call(this,g,f,t);};
  const draw=R.drawFx;
  R.drawFx=function(g,f,t){if(f.c3wardBurst&&Art.get('vfx_art_ice'))return;return draw.call(this,g,f,t);};
  return {verse,shatter};
})();
