'use strict';
// Retain the original .28-second Holy Spear callback and .25-second afterglow.
const HolyVFX=(()=>{
  const ready=()=>!!Art.get('vfx_art_holy_spear');
  function sample(f){
    const end=f.dur+(f.linger||.25);if(!f.ref||f.t<0||f.t>=end)return null;
    const hit=f.hitAt??f.dur,flight=f.t<hit;
    return {x:f.ref.x*TILE,y:f.ref.y*TILE*R.K,index:flight?f.t/hit*3:3+(f.t-hit)/(end-hit)*4,
      width:118,opacity:flight?Math.min(1,f.t/.025):Math.min(1,(end-f.t)/.07),phase:flight?'descent':'impact'};
  }
  function draw(g,f){
    if(G.fastSim||f.type!=='holy'||f.src!=='holy_spear')return false;
    const img=Art.get('vfx_art_holy_spear');if(!img)return false;
    const q=sample(f);if(!q)return true;
    const cell=img.height,a=Math.floor(q.index),b=Math.min(7,a+1),mix=q.index-a;
    g.save();g.globalCompositeOperation='source-over';g.globalAlpha=q.opacity*(1-mix);
    g.drawImage(img,a*cell,0,cell,cell,q.x-q.width/2,q.y-q.width*220/256,q.width,q.width);
    if(b!==a){g.globalAlpha=q.opacity*mix;g.drawImage(img,b*cell,0,cell,cell,q.x-q.width/2,q.y-q.width*220/256,q.width,q.width);}
    g.restore();return true;
  }
  const draw0=R.drawFx;R.drawFx=function(g,f,t){if(draw(g,f))return;return draw0.call(this,g,f,t);};
  return {ready,sample,draw};
})();
