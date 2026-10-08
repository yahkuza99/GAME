'use strict';
// Replace only the in-flight drawing; the original effect owns travel, collision and damage.
const ProjectileArt = (() => {
  Art.alias('vfx_art_orb_fire','vfx_art_orb',{hue:180,sat:1.15});
  Art.alias('vfx_art_orb_void','vfx_art_orb',{hue:65,sat:1.1});
  Art.alias('vfx_art_arrow_ice','vfx_art_arrow',{hue:155,sat:.65});
  const arrows=new Set(['charge_arrow','frost_arrow','volley','twin']);
  const magic=new Set(['void_lance','drain','sonic']);
  const thrown={knife_spin:'main_gauche',axe_spin:'hand_axe',shield_spin:'fx_einherjar_shield'};
  function assetForSkill(id){
    const s=SKILLS[id];if(!s||s.type!=='active')return null;
    const kind=s.vfx;
    if(kind==='arrow_rain'||kind==='sharp_shot'||kind==='snipe'||arrows.has(kind))return 'vfx_art_'+(kind==='frost_arrow'?'arrow_ice':'arrow');
    if(kind==='void_lance')return 'vfx_art_void_lance';
    if(kind==='drain')return 'vfx_art_orb_void';
    if(kind==='sonic')return 'vfx_art_sonic';
    if(kind==='valhalla_spear')return 'vfx_art_odin_spear';
    if(thrown[kind])return 'item_'+thrown[kind];
    if(!kind&&s.fx==='arrow')return 'vfx_art_arrow';
    if(!kind&&s.fx==='firebolt')return 'vfx_art_orb_fire';
    if(!kind&&s.fx==='coldbolt')return 'vfx_art_orb';
    return null;
  }
  function sample(f){
    if(f.t<0||f.t>=f.dur)return null;
    const k=U.clamp(f.t/f.dur,0,1),o=f.ref||{x:f.tx,y:f.ty};
    if(!o||!Number.isFinite(o.x)||!Number.isFinite(o.y))return null;
    const ex=o.x*TILE,ey=o.y*TILE*R.K-(f.type==='arrow'&&!f.ref?24:18*((o.def&&o.def.scale)||1));
    let sx,sy,arc=0,key,width,lane=0,item=false;
    if(f.fx2&&(arrows.has(f.kind)||magic.has(f.kind)||thrown[f.kind])){
      sx=f.X0;sy=f.Y0;arc=f.arc||0;
      key=arrows.has(f.kind)?f.kind==='frost_arrow'?'arrow_ice':'arrow':f.kind==='void_lance'?'void_lance':f.kind==='sonic'?'sonic':'orb_void';
      width=f.kind==='charge_arrow'?115:f.kind==='void_lance'?124:f.kind==='sonic'?94:arrows.has(f.kind)?92:82;
      if(thrown[f.kind]){item=true;key=thrown[f.kind];width=f.kind==='knife_spin'?32:42;}
      lane=f.kind==='twin'?(f.n%2?5:-5):f.kind==='volley'?((f.n||0)-1)*5:0;
    }else if(f.type==='arrow'){
      sx=f.X0==null?f.sx*TILE:f.X0;sy=f.Y0==null?f.sy*TILE*R.K:f.Y0;
      key='arrow';width=f.big?106:84;
    }else if(f.type==='firebolt'||f.type==='coldbolt'){
      sx=ex+30;sy=ey-150;key=f.type==='firebolt'?'orb_fire':'orb';width=78;
    }else if(f.type==='soul'||f.type==='frost'){
      sx=f.sx*TILE;sy=f.sy*TILE*R.K;arc=20;key=f.type==='soul'?'orb_void':'orb';width=80;
    }else return null;
    if(!Number.isFinite(sx)||!Number.isFinite(sy))return null;
    const x=U.lerp(sx,ex,k),y=U.lerp(sy,ey,k)-Math.sin(k*Math.PI)*(arc-lane);
    return {x,y,clipTail:f.kind==='void_lance'?Math.hypot(x-sx,y-sy)+14:null,
      angle:Math.atan2(ey-sy-Math.cos(k*Math.PI)*Math.PI*(arc-lane),ex-sx),key,width,item};
  }
  function draw(g,f){
    const o=sample(f);if(!o||G.fastSim)return false;
    const img=Art.get((o.item?'item_':'vfx_art_')+o.key)||(o.key==='fx_einherjar_shield'?Art.get('item_round_shield'):null);if(!img)return false;
    if(o.item){
      g.save();g.translate(o.x,o.y);g.rotate(o.angle+f.t*18);g.globalCompositeOperation='source-over';
      const h=o.width*img.height/img.width;g.drawImage(img,-o.width/2,-h/2,o.width,h);g.restore();return true;
    }
    stamp(g,img,o,f.t);return true;
  }
  function stamp(g,img,o,time,opacity=1){
    const fr=(time*18)%8,a=Math.floor(fr),b=(a+1)%8,mix=fr-a,w=img.width/8,h=img.height;
    g.save();g.translate(o.x,o.y);g.rotate(o.angle);g.globalCompositeOperation='source-over';
    // Every atlas frame anchors the arrow tip / magical core at (200,128).
    const dh=o.width*h/w,x=-o.width*200/256,y=-dh/2;
    // A long magical lance emerges from the casting hand. Reveal its trailing
    // texture as it travels rather than drawing most of it behind the caster.
    if(o.clipTail!=null){g.beginPath();g.rect(-o.clipTail,-dh,Math.max(o.width,o.clipTail)+o.width,dh*2);g.clip();}
    g.globalAlpha=opacity*(1-mix);g.drawImage(img,a*w,0,w,h,x,y,o.width,dh);
    g.globalAlpha=opacity*mix;g.drawImage(img,b*w,0,w,h,x,y,o.width,dh);
    g.restore();
  }
  function head(g,x,y,angle,width,time,travelled,key='arrow'){
    const img=Art.get('vfx_art_'+key);if(!img||G.fastSim)return false;
    stamp(g,img,{x,y,angle,width,clipTail:travelled==null?null:travelled+8},time);return true;
  }
  // The original Arrow Storm owns its area, seed and damage schedule. Only its arrows change.
  function rainSample(f,i){
    const hash=s=>U.hash2(i,s,f.seed),delay=hash(1)*.5,fall=.2,q=(f.t-delay)/fall;
    if(q<0)return null;
    const angle=hash(2)*Math.PI*2,radius=Math.sqrt(hash(3))*f.r*TILE*.95;
    const gx=f.x*TILE+Math.cos(angle)*radius,gy=f.y*TILE*R.K+Math.sin(angle)*radius*R.K;
    const landed=q>=1-1e-9,age=f.t-delay-fall,opacity=!landed?1:1-U.clamp((age-.3)/.3,0,1);
    if(opacity<=0)return null;
    return {x:gx-46*Math.max(0,1-q),y:gy-190*Math.max(0,1-q),gx,gy,age,
      angle:!landed?Math.atan2(190,46):Math.atan2(16,5),width:!landed?68:42,opacity,landed};
  }
  function drawRain(g,f){
    if(!f.fx2||f.kind!=='arrow_rain'||G.fastSim)return false;
    const img=Art.get('vfx_art_arrow');if(!img)return false;
    const k=U.clamp(f.t/f.dur,0,1),a=Math.max(0,Math.min(1,k/.1,(1-k)/.3)),r=f.r*TILE;
    g.save();g.globalCompositeOperation='source-over';g.strokeStyle=`rgba(211,193,119,${.35*a})`;g.lineWidth=1.2;
    g.beginPath();g.ellipse(f.x*TILE,f.y*TILE*R.K,r,r*R.K,0,0,Math.PI*2);g.stroke();
    for(let i=0;i<(R.quality==='low'?11:22);i++){
      const o=rainSample(f,i);if(!o)continue;
      stamp(g,img,o,f.t+i*.07,o.opacity);
      if(o.landed&&o.age<.25){g.strokeStyle=`rgba(235,217,153,${1-o.age/.25})`;g.lineWidth=1;
        g.beginPath();g.ellipse(o.gx,o.gy,3+o.age*44,(3+o.age*44)*R.K,0,0,Math.PI*2);g.stroke();}
    }
    g.restore();return true;
  }
  const draw0=R.drawFx;
  R.drawFx=function(g,f,t){if(drawRain(g,f)||draw(g,f))return;return draw0.call(this,g,f,t);};
  return {sample,draw,rainSample,drawRain,assetForSkill,head};
})();
