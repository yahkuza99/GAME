'use strict';
// Semantic action routing, shared by real actors and the skill audit.
const SkillPresentation = (() => {
  const sets={
    slam:new Set(['shield_slam','judgment_quake','holy_fist','triple_palm','divine_burst','titan_smash','earth_splitter']),
    spin:new Set(['whirlwind','ragnarok_cleave','ragnars_fury','wolfstorm_cleave']),
    throw:new Set(['shield_throw','throwing_knife','axe_throw']),
    howl:new Set(['war_cry','howl','war_howl','howl_of_the_pack']),
    song:new Set(['war_drum','song_of_battle','hymn_of_loki']),
    dash:new Set(['charge_strike','wind_walk','trickster_haste','blink_glyph']),
    guard:new Set(['divine_shield','einherjar_guard','rune_barrier','battle_aura','zen_body','sap_ward','undying_rage','unchained']),
  };
  function profile(id){
    const s=SKILLS[id];if(!s||s.type!=='active')return null;
    let kind='cast',action='cast',duration=.6;
    if(id==='shield_slam'){kind='shield_bash';action='shield';duration=.6;}
    else if(id==='first_aid'){kind='heal';action='first_aid';duration=.75;}
    else if(id==='shield_throw'){kind='shield_throw';action='shield_throw';duration=.5;}
    else if(['holy_fist','triple_palm','divine_burst','zen_body'].includes(id)){
      kind=({holy_fist:'punch',triple_palm:'palm',divine_burst:'burst',zen_body:'meditate'})[id];
      action='monk';duration=id==='triple_palm'?.6:id==='divine_burst'?.75:id==='zen_body'?.9:.45;
    }
    else if(['sonic_strike','war_drum','song_of_battle','hymn_of_loki'].includes(id)){
      kind=id==='war_drum'?'drum':id==='sonic_strike'?'strum':'song';
      action='bard';duration=id==='sonic_strike'?.6:.85;
    }
    else if(s.bow){kind='shoot';action='shoot';duration=.5;}
    else if(s.special==='trap'){kind='trap';action='trap';duration=.8;}
    else if(s.special==='summon_wolf'){kind='summon';action='summon';duration=.85;}
    else if(sets.howl.has(id)){kind='howl';action='buff';duration=.7;}
    else if(sets.song.has(id)){kind='song';action='buff';duration=.85;}
    else if(sets.dash.has(id)){kind='dash';action=s.dmg?'attack':'buff';duration=.5;}
    else if(sets.guard.has(id)){kind='guard';action='buff';duration=.7;}
    else if(s.heal){kind='heal';action='buff';duration=.75;}
    else if(sets.throw.has(id)){kind='throw';action='attack';duration=.5;}
    else if(sets.spin.has(id)){kind='spin';action='attack';duration=.7;}
    else if(sets.slam.has(id)){kind='slam';action='attack';duration=.65;}
    else if(s.dmg?.type==='phys'&&!s.bow){kind='slash';action='attack';duration=.5;}
    else if(s.buff||(!s.dmg&&s.target==='self')){kind='buff';action='buff';duration=.7;}
    return {kind,action,duration};
  }
  function monkFrame(kind,elapsed){
    if(kind==='palm')return elapsed<.37&&(elapsed+1e-8)% .15<.075?2:0;
    if(kind==='burst')return elapsed<.4?3:0;
    if(kind==='punch')return elapsed<.23?1:0;
    return 0;
  }
  function bardFrame(kind,elapsed){
    // The three native drum ripples begin at 0, .28 and .56 seconds.
    if(kind==='drum')return elapsed<.65&&(elapsed+1e-8)% .28<.09?4:3;
    if(kind==='strum')return elapsed<.28?2:0;
    return elapsed<.7?((Math.floor((elapsed+1e-8)/.12)%2)?2:1):0;
  }
  return {profile,monkFrame,bardFrame};
})();
