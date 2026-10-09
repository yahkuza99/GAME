'use strict';
// Dark Nova is a single composed charge/release/dispersal; native FX2 owns the damage wave.
const ShadowVFX=(()=>{
  const ready=()=>!!Art.get('vfx_art_dark_nova');
  function sample(f){
    if(f.t<0||f.t>=f.dur)return null;
    const charge=.22,edge=FX2.SPEC.dark_nova.ring;
    const index=f.t<charge?f.t/charge*2:f.t<edge?2+(f.t-charge)/(edge-charge)*2:4+(f.t-edge)/(f.dur-edge)*3;
    const pos=f.ref||f;
    return {x:pos.x*TILE,y:pos.y*TILE*R.K-22*Math.max(0,1-f.t/charge),
      index:U.clamp(index,0,7),width:Math.min(380,Math.max(180,f.r*TILE*2.4)),
      opacity:Math.min(1,f.t/.035,(f.dur-f.t)/.14),phase:f.t<charge?'charge':f.t<edge?'release':'disperse'};
  }
  function draw(g,f){
    if(!f.fx2||f.kind!=='dark_nova'||G.fastSim)return false;
    const img=Art.get('vfx_art_dark_nova');if(!img)return false;
    const q=sample(f);if(!q)return true;
    const w=img.width/8,h=img.height,a=Math.floor(q.index),b=Math.min(7,a+1),mix=q.index-a,dh=q.width*h/w;
    g.save();g.globalCompositeOperation='source-over';g.globalAlpha=q.opacity*(1-mix);
    g.drawImage(img,a*w,0,w,h,q.x-q.width/2,q.y-dh*170/256,q.width,dh);
    if(b!==a){g.globalAlpha=q.opacity*mix;g.drawImage(img,b*w,0,w,h,q.x-q.width/2,q.y-dh*170/256,q.width,dh);}
    g.restore();return true;
  }
  const draw0=R.drawFx;R.drawFx=function(g,f,t){if(draw(g,f))return;return draw0.call(this,g,f,t);};
  return {ready,sample,draw};
})();
