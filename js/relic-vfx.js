'use strict';
// Painted materials only. FX2 continues to schedule every hit, heal and buff.
const RelicVFX=(()=>{
  function stone(g,x,y,width,index,opacity){
    const img=Art.get('vfx_art_healing_stone');if(!img||G.fastSim)return false;
    const sw=img.width/4;g.save();g.globalCompositeOperation='source-over';g.globalAlpha=opacity;
    g.drawImage(img,(index%4)*sw,0,sw,img.height,x-width/2,y-width/2,width,width);g.restore();return true;
  }
  function swordSample(f){
    if(!f.fx2||f.kind!=='judgment'||!f.ref||f.t<0||f.t>=f.dur)return null;
    const ti=f.hitAt||.3,t=f.t,k=U.clamp(t/ti,0,1);
    return {x:f.ref.x*TILE,y:f.ref.y*TILE*R.K-4-(1-k*k)*280,
      index:t<ti?Math.min(1,t/ti):Math.min(3,2+(t-ti)/Math.max(.01,f.dur-ti)),
      opacity:t>.55?U.clamp(1-(t-.55)/.4,0,1):1,width:148};
  }
  function sword(g,f){
    const q=swordSample(f),img=Art.get('vfx_art_judgment_sword');if(!q||!img||G.fastSim)return false;
    const a=Math.floor(q.index),b=Math.min(3,a+1),mix=q.index-a,sw=img.width/4,dh=q.width*img.height/sw;
    g.save();g.globalCompositeOperation='source-over';g.globalAlpha=q.opacity*(1-mix);
    g.drawImage(img,a*sw,0,sw,img.height,q.x-q.width/2,q.y-dh*220/256,q.width,dh);
    if(b!==a){g.globalAlpha=q.opacity*mix;g.drawImage(img,b*sw,0,sw,img.height,q.x-q.width/2,q.y-dh*220/256,q.width,dh);}
    g.restore();return true;
  }
  const base=R.drawFx;R.drawFx=function(g,f,t){if(sword(g,f))return;return base.call(this,g,f,t);};
  return {stone,swordSample,sword};
})();
