'use strict';
// Texture only: native FX2 still owns radius, stun, damage and the one-second lifetime.
const JudgmentVFX=(()=>{
  const ready=()=>!!Art.get('vfx_art_judgment_quake');
  function sample(f){
    if(!f.fx2||f.kind!=='quake'||f.t<0||f.t>=f.dur)return null;
    const k=f.t/f.dur;
    return {x:f.x*TILE,y:f.y*TILE*R.K,width:f.r*TILE*2.25,index:Math.min(7,k*7/.88),opacity:Math.min(1,k/.04,(1-k)/.2)};
  }
  function draw(g,f){
    const q=sample(f);return q?ground(g,q.x,q.y,q.width,f.t,f.dur):false;
  }
  function ground(g,x,y,width,age,duration){
    const q={x,y,width,index:Math.min(7,age/duration*7/.88),opacity:Math.min(1,age/duration/.04,(1-age/duration)/.2)},img=Art.get('vfx_art_judgment_quake');
    if(age<0||age>=duration||!img||G.fastSim)return false;
    const a=Math.floor(q.index),b=Math.min(7,a+1),mix=q.index-a,sw=img.width/8,sh=img.height,h=q.width*sh/sw;
    g.save();g.globalCompositeOperation='source-over';
    g.globalAlpha=q.opacity*(1-mix);g.drawImage(img,a*sw,0,sw,sh,q.x-q.width/2,q.y-h*220/256,q.width,h);
    if(b!==a){g.globalAlpha=q.opacity*mix;g.drawImage(img,b*sw,0,sw,sh,q.x-q.width/2,q.y-h*220/256,q.width,h);}
    g.restore();return true;
  }
  const base=R.drawFx;R.drawFx=function(g,f,t){if(draw(g,f))return;return base.call(this,g,f,t);};
  return {ready,sample,draw,ground};
})();
