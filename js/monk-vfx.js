'use strict';
// Four chronological fist frames and four palm frames. FX2 retains all hit timing.
const MonkVFX=(()=>{
  const ready=()=>!!Art.get('vfx_art_monk_impacts');
  function sample(f){
    if(!f.ref||f.t<0||f.t>=f.dur)return null;
    const palm=f.kind==='palm',k=U.clamp(f.t/f.dur,0,1),i=(f.n||0)%3;
    const scale=f.ref.def?.scale||1;
    const dir=f.ref.x>=(f.px??G.player.x)?1:-1;
    return {x:f.ref.x*TILE+(palm?[-12,12,0][i]:-dir*16*(1-Math.min(1,k/.28))),
      y:f.ref.y*TILE*R.K-(f.ref===G.player?30:18*scale)+(palm?[-4,4,-18][i]:0),
      index:(palm?4:0)+k*3,width:palm?84:94,flip:!palm&&dir<0,
      opacity:Math.min(1,k/.06,(1-k)/.18)};
  }
  function draw(g,f){
    if(!f.fx2||!['holy_fist','palm'].includes(f.kind)||G.fastSim)return false;
    const img=Art.get('vfx_art_monk_impacts');if(!img)return false;
    const q=sample(f);if(!q)return true;
    const w=img.width/8,h=img.height,a=Math.floor(q.index),b=Math.min(f.kind==='palm'?7:3,a+1),mix=q.index-a,dh=q.width*h/w;
    g.save();g.translate(q.x,q.y);if(q.flip)g.scale(-1,1);g.globalCompositeOperation='source-over';
    g.globalAlpha=q.opacity*(1-mix);g.drawImage(img,a*w,0,w,h,-q.width/2,-dh/2,q.width,dh);
    if(b!==a){g.globalAlpha=q.opacity*mix;g.drawImage(img,b*w,0,w,h,-q.width/2,-dh/2,q.width,dh);}
    g.restore();return true;
  }
  const draw0=R.drawFx;R.drawFx=function(g,f,t){if(draw(g,f))return;return draw0.call(this,g,f,t);};
  return {ready,sample,draw};
})();
