'use strict';
// Distinct geometry and timing per skill, layered with existing hand-reviewed transparent artwork.
// New generated artwork acceptance is tracked separately in art/class-expansion/COMPLETION.md.
const ExpansionArt = (() => {
  const TAU=Math.PI*2,cl=v=>Math.max(0,Math.min(1,v));
  const tones={fire:'#ffb963',water:'#b8efff',wind:'#fff0a7',holy:'#fff2c6',shadow:'#c89dff',poison:'#bbf68e',earth:'#e5be8a'};
  const families={fire:'fire',water:'ice',wind:'lightning',holy:'light',shadow:'dark_nova',poison:'dark_nova',earth:'earth'};
  function seal(g,s,x,y,r,alpha){
    const img=Art.get('exp_seals'),index=Object.keys(CLASS_EXPANSION).indexOf(ClassExpansion.owner[s.id]);if(!img||index<0)return;
    const cell=img.width/4;g.save();g.translate(x,y);g.scale(1,R.K);g.globalAlpha*=alpha;
    g.drawImage(img,index%4*cell,Math.floor(index/4)*cell,cell,cell,-r,-r,r*2,r*2);g.restore();
  }
  function bitmap(g,key,x,y,w,k,opacity=1){const img=Art.get('vfx_art_'+key);if(!img)return false;
    const n=img.width/img.height,frame=cl(k)*(n-1),a=Math.floor(frame),b=Math.min(n-1,a+1),mix=frame-a,h=w;
    g.save();const alpha=g.globalAlpha;g.globalAlpha=alpha*opacity*(1-mix);g.drawImage(img,a*img.height,0,img.height,img.height,x-w/2,y-h*.84,w,h);
    if(a!==b){g.globalAlpha=alpha*opacity*mix;g.drawImage(img,b*img.height,0,img.height,img.height,x-w/2,y-h*.84,w,h);}g.restore();return true;}
  function pillar(g,x,y,size,age,duration,opacity){
    const img=Art.get('exp_fire_pillar');if(!img)return bitmap(g,'fire',x,y,size,age%1,opacity);
    const frame=age<.45?age/.45*2:duration-age<.65?5+(1-(duration-age)/.65)*2:2.5+(Math.sin(age*6)+1)*.75;
    const a=Math.floor(frame),b=Math.min(7,a+1),mix=frame-a,alpha=g.globalAlpha;g.save();
    g.globalAlpha=alpha*opacity*(1-mix);g.drawImage(img,a*256,0,256,256,x-size/2,y-size*220/256,size,size);
    if(a!==b){g.globalAlpha=alpha*opacity*mix;g.drawImage(img,b*256,0,256,256,x-size/2,y-size*220/256,size,size);}g.restore();
  }
  function circle(g,x,y,r,color,alpha,width=1){g.save();g.globalAlpha*=alpha;g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.ellipse(x,y,r,r*R.K,0,0,TAU);g.stroke();g.restore();}
  function ribbon(g,x,y,angle,r,k,color,fan=.8){
    const sweep=angle-fan*.5+fan*k,tail=Math.max(0,k-.65);
    g.save();g.translate(x,y);g.scale(1,.7);
    const path=new Path2D();path.arc(0,0,r,angle-fan*.5+fan*tail,sweep);path.arc(0,0,r-3, sweep,angle-fan*.5+fan*tail,true);path.closePath();
    g.fillStyle=color;g.fill(path);g.strokeStyle='#fff8e8';g.lineWidth=1;g.beginPath();g.arc(0,0,r,sweep-.12,sweep);g.stroke();g.restore();
  }
  function field(g,f,s,k,pos){const x=pos.x*TILE,y=pos.y*TILE*R.K,r=(f.r||s.exp.r||2)*TILE;
    const color=tones[s.exp.element]||s.icon,a=cl(f.t/.3)*cl((f.dur-f.t)/.6),phase=f.t*.65;
    seal(g,s,x,y,r,.18*a);
    circle(g,x,y,r,color,.7*a,1.6);circle(g,x,y,r*.92,color,.2*a);
    g.save();g.globalAlpha=.35*a;g.strokeStyle=color;g.lineWidth=1;
    const count=s.exp.kind==='trap'?3:R.quality==='low'?3:6;
    for(let i=0;i<count;i++){const an=i/count*TAU,rr=r*(s.exp.kind==='trap'?.6:.82),xx=x+Math.cos(an)*rr,yy=y+Math.sin(an)*rr*R.K;
      g.beginPath();g.moveTo(xx-3,yy-5);g.lineTo(xx+3,yy+5);g.moveTo(xx-3,yy);g.lineTo(xx+3,yy);g.stroke();}
    g.restore();
    if(s.id==='fire_pillar'){pillar(g,x,y,132,f.t,f.dur,.85*a);if(R.quality!=='low')for(let i=0;i<2;i++){const an=i*Math.PI+.8;pillar(g,x+Math.cos(an)*r*.5,y+Math.sin(an)*r*.5*R.K,78,f.t,f.dur,.55*a);}}
    else if(['whiteout','hail_trap'].includes(s.id)){bitmap(g,'ice',x,y,90,(f.t%1),.35*a);const n=R.quality==='low'?4:8;for(let i=0;i<n;i++){const an=i/n*TAU+phase;circle(g,x+Math.cos(an)*r*.6,y+Math.sin(an)*r*.6*R.K,2,color,.7*a);}}
    else if(s.exp.kind==='regeneration'){bitmap(g,'light',x,y,100,(f.t%1),.3*a);circle(g,x,y,r*(.25+.7*(f.t%1)),color,.3*a);}
    else if(s.exp.kind==='shelter'){bitmap(g,'shield',x,y,105,(f.t%1),.25*a);}
    else if(s.id==='convergence_seal'){for(let i=0;i<3;i++)circle(g,x+Math.cos(phase+i*TAU/3)*r*.38,y+Math.sin(phase+i*TAU/3)*r*.38*R.K,r*.38,['#ffb477','#b8eeff','#ffecaf'][i],.45*a);}
  }
  function draw(g,f){
    const s=SKILLS[f.id];if(!s?.exp)return;const p=R.fxPos(f),k=cl(f.t/f.dur),color=tones[f.element||s.exp.element]||s.icon;
    const x=p.x*TILE,y=p.y*TILE*R.K,a=cl(f.t/.04)*cl((1-k)/.25),seed=f.seed||0;
    g.save();g.globalAlpha=a;
    if(f.kind==='field'){field(g,f,s,k,p);g.restore();return;}
    if(f.kind==='burst_area'){
      const r=(f.r||2)*TILE,e=1-Math.pow(1-k,3);
      circle(g,x,y,r*e,color,.6*(1-k),2);circle(g,x,y,r*.9,color,.3*(1-k),1);
      for(let i=0;i<6;i++){const an=i*TAU/6+seed*.08,xx=x+Math.cos(an)*r*.75*e,yy=y+Math.sin(an)*r*.75*e*R.K;
        const family=families[s.exp.element];
        if(family)bitmap(g,family,xx,yy,s.exp.element==='earth'?65:42,k,.45*(1-k));}
      g.restore();return;
    }
    if(f.kind==='cast'){
      const r=22+16*Math.sin(k*Math.PI);circle(g,x,y,r,color,.6,1.5);
      seal(g,s,x,y,r,.4);
      const kind=s.exp.kind;
      if(['guard','dash_guard','stance'].includes(kind))bitmap(g,'shield',x,y,80,k,.55);
      else if(s.heal||['recover','recover_heal','exchange'].includes(kind))bitmap(g,s.exp.kind==='exchange'?'dark_nova':'light',x,y,80,k,.5);
      else for(let i=0;i<3;i++){const an=i*TAU/3+k*2;circle(g,x+Math.cos(an)*r,y+Math.sin(an)*r*R.K,3,color,.7);}
    }else if(f.kind==='projectile'){
      const bx=f.sx*TILE,by=f.sy*TILE*R.K-28,tx=x,ty=y-22;
      const xx=bx+(tx-bx)*k,yy=by+(ty-by)*k,angle=Math.atan2(ty-by,tx-bx);
      g.save();g.translate(xx,yy);g.rotate(angle);g.globalAlpha=.75;
      g.strokeStyle=color;g.lineWidth=2;g.beginPath();g.moveTo(-Math.min(48,Math.hypot(tx-bx,ty-by)*k),0);g.lineTo(5,0);g.stroke();
      const asset=Art.get('exp_projectiles'),row=ClassExpansion.owner[s.id]&&Object.keys(CLASS_EXPANSION).indexOf(ClassExpansion.owner[s.id]);
      if(asset&&row>=0){const cell=asset.width/4;g.drawImage(asset,row%4*cell,Math.floor(row/4)*cell,cell,cell,-19,-19,38,38);}
      else if(s.bow){g.strokeStyle='#fff7df';g.lineWidth=1.5;g.beginPath();g.moveTo(-14,0);g.lineTo(14,0);g.moveTo(14,0);g.lineTo(6,-4);g.moveTo(14,0);g.lineTo(6,4);g.stroke();}
      else{g.fillStyle=color;g.beginPath();g.moveTo(13,0);g.quadraticCurveTo(0,-8,-7,0);g.quadraticCurveTo(0,8,13,0);g.fill();g.fillStyle='#fff9ed';g.beginPath();g.ellipse(2,0,5,2,0,0,TAU);g.fill();}
      g.restore();
    }else{
      const family=families[s.exp.element] || (['phantom','packlord','warlord'].includes(ClassExpansion.owner[s.id])?'fang':'slash');
      const magic=s.dmg?.type==='magic';
      if(ClassExpansion.owner[s.id]==='gythja')bitmap(g,'monk_impacts',x,y,70,k,.75);
      else if(ClassExpansion.owner[s.id]==='skald')bitmap(g,'sonic',x,y,85,k,.6);
      else if(magic)bitmap(g,family,x,y,95,k,.65);
      else{
        // WeaponTrail owns cutting motion at the actor. Bow hits have no melee ribbons.
        if(s.exp.element==='earth')bitmap(g,'earth',x,y,90,k,.55);
      }
      circle(g,x,y,9+28*k,color,.45*(1-k));
    }
    g.restore();
  }
  const draw0=R.drawFx;
  R.drawFx=function(g,f,t){if(f.expArt)return draw(g,f);return draw0.apply(this,arguments);};
  return {draw,bitmap,pillar};
})();
