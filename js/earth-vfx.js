'use strict';
// Ground artwork uses the existing FX2 casts, seeds and hit timers; no gameplay events here.
const EarthVFX=(()=>{
  const ready=()=>!!Art.get('vfx_art_earth');
  function frame(age,lifetime=1.1){
    if(age<0||age>=lifetime)return null;
    // Cracks precede the original .15-second impact, followed by growth, settling and retraction.
    const k=age/lifetime;
    const index=k<.136?k/.136:k<.30?1+(k-.136)/.164*2:k<.64?3+(k-.30)/.34:k<.84?4+(k-.64)/.20*2:6+(k-.84)/.16;
    return {index:U.clamp(index,0,7),opacity:Math.min(1,k/.035,(1-k)/.12)};
  }
  function cluster(g,x,y,width,age,lifetime=1.1){
    const img=Art.get('vfx_art_earth'),q=frame(age,lifetime);
    if(!img||!q||G.fastSim)return false;
    const a=Math.floor(q.index),b=Math.min(7,a+1),mix=q.index-a,w=img.width/8,h=img.height,dh=width*h/w;
    g.save();g.globalCompositeOperation='source-over';
    g.globalAlpha=q.opacity*(1-mix);g.drawImage(img,a*w,0,w,h,x-width/2,y-dh*190/256,width,dh);
    if(b!==a){g.globalAlpha=q.opacity*mix;g.drawImage(img,b*w,0,w,h,x-width/2,y-dh*190/256,width,dh);}
    g.restore();return true;
  }
  function draw(g,f){
    if(!f.fx2||f.kind!=='rock_spikes'||!ready()||G.fastSim)return false;
    const x=f.x*TILE,y=f.y*TILE*R.K,r=f.r*TILE;
    cluster(g,x,y,Math.max(200,Math.min(340,r*2.4)),f.t,f.dur);
    const a=Math.max(0,1-f.t/.48);
    if(a>0){g.save();g.strokeStyle=`rgba(228,187,112,${.35*a})`;g.lineWidth=1;
      g.beginPath();g.ellipse(x,y,r,r*R.K,0,0,Math.PI*2);g.stroke();g.restore();}
    return true;
  }
  const draw0=R.drawFx;
  R.drawFx=function(g,f,t){if(draw(g,f))return;return draw0.call(this,g,f,t);};
  return {ready,frame,cluster,draw};
})();
