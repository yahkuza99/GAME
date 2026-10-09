'use strict';
// Generated, alpha-transparent frame animations. Gameplay/damage remains in FX2/Runes.
const SkillArtFX = (() => {
  const groups={
    fire:['fire_rune','blood_frenzy','giants_wrath','blast_trap'],
    meteor:['meteor_rune'],
    lightning:['thunder_rune','chain_lightning'],
    ice:['ice_rune','frost_nova','frost_arrow','winter_hunt'],
    light:['first_aid','light_of_freyja','blessing_of_odin','divine_shield','valhallas_call','great_restoration','fate_weave','ragnarok_light','skuld_judgment','mountain_heart'],
    fang:['wolf_companion','fenrir_bite','fang_of_fenrir','howl_of_the_pack','alphas_mark','jaws_of_fenrir'],
    shield:['war_cry','valhalla_oath','runic_ward','einherjar_guard','rune_barrier','battle_aura','undying_rage','sap_ward','unchained'],
  };
  const bindings={};for(const [kind,ids] of Object.entries(groups))for(const id of ids)if(SKILLS[id]?.type==='active')bindings[id]=kind;
  const casts=new WeakMap();
  function emit(id,o,{width=110,ref=null,phase='impact',kind=bindings[id],runeVariant=null}={}){
    // A cut belongs to the moving weapon layer, never an impact sprite on a victim.
    if(!kind||kind==='slash'||G.fastSim||!o||!G.player||G.player.dead)return false;
    const img=Art.get('vfx_art_'+kind);if(!img)return false; // Existing procedural FX is always the fallback.
    const recent=G.fx.filter(f=>f.skillArt&&f.t<.1);
    if(recent.length>=(R.quality==='low'?3:7))return false;
    if(recent.some(f=>f.id===id&&f.kind===kind&&f.ref===ref&&Math.hypot(f.x-o.x,f.y-o.y)<.1))return false;
    addFx({type:'skill_art',skillArt:true,id,kind,runeVariant,x:o.x,y:o.y,ref,phase,flip:kind==='slash'&&o.x<G.player.x,width:Math.min(220,width),dur:kind==='shield'||kind==='light'?.95:.72});
    return true;
  }
  const cast0=FX2.cast;
  FX2.cast=function(s,lv,tgt){
    const p=G.player,o=s.dmg&&s.dmg.at==='self'?p:tgt||p;
    let rec=casts.get(p);if(!rec)casts.set(p,rec={});
    rec[s.id]={x:o.x,y:o.y,map:G.map.id,at:G.time,areaShown:{}};
    if(!s.dmg&&s.special!=='trap'&&bindings[s.id])emit(s.id,o,{ref:o.kind==='ground'?null:o,width:s.c3circle?180:125,phase:'cast'});
    return cast0.apply(this,arguments);
  };
  const hit0=applyHit;
  applyHit=function(m,r,opts={}){
    const s=SKILLS[opts.src];
    if(typeof ElementalVFX!=='undefined'&&ElementalVFX.covered(opts.src))return hit0.apply(this,arguments);
    if(s&&bindings[s.id]&&!m.dead&&!r.miss&&r.dmg>0){
      const kind=s.id==='ragnarok_verse'?({fire:'fire',water:'ice',wind:'lightning'}[r.el]||'fire'):bindings[s.id];
      const rec=casts.get(G.player)?.[s.id];
      if(s.dmg?.area&&rec&&rec.map===G.map.id&&G.time-rec.at<3){
        if(!rec.areaShown[kind])rec.areaShown[kind]=emit(s.id,rec,{kind,width:Math.max(125,Math.min(2.5,s.dmg.area)*TILE*2),runeVariant:opts.runeVariant});
      }else emit(s.id,m,{kind,ref:m,width:s.bow?95:115,runeVariant:opts.runeVariant});
    }
    return hit0.apply(this,arguments);
  };
  function draw(g,f){
    if(['meteor','lightning'].includes(f.kind)&&typeof ElementalVFX!=='undefined'&&ElementalVFX.burst(g,f))return;
    const img=Art.get('vfx_art_'+f.kind);if(!img)return;
    const k=U.clamp(f.t/f.dur,0,1),n=8,w=img.width/n,h=img.height;
    const pos=R.fxPos(f),width=f.width,height=width*h/w;
    const x=pos.x*TILE-width/2,y=pos.y*TILE*R.K-height*(220/256);
    // Meteor frames 0/1 depict flight; its hit starts with frame 2.
    const start=f.kind==='meteor'?2:0,fr=start+k*(n-1-start),a=Math.floor(fr),b=Math.min(n-1,a+1),mix=fr-a;
    const opacity=Math.min(1,k/.07,(1-k)/.22)*.82;
    g.save();g.globalCompositeOperation='source-over';
    if(f.flip){g.translate(pos.x*TILE*2,0);g.scale(-1,1);}
    g.globalAlpha=opacity*(1-mix);g.drawImage(img,a*w,0,w,h,x,y,width,height);
    if(b!==a){g.globalAlpha=opacity*mix;g.drawImage(img,b*w,0,w,h,x,y,width,height);}
    g.restore();
  }
  const draw0=R.drawFx;
  R.drawFx=function(g,f,t){if(f.skillArt)return draw(g,f);return draw0.call(this,g,f,t);};
  return {bindings,emit,draw};
})();
