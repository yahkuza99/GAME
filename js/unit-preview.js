'use strict';
// Preview actors never mutate the live player or saved character.
const UnitPreview = {
  states: new WeakMap(),
  init(canvas) {
    if(this.states.has(canvas))return;
    this.states.set(canvas,{actor:{},key:null});
  },
  draw(g,canvas,fake,t) {
    this.init(canvas);const state=this.states.get(canvas),key=fake.job+'_'+fake.gender;
    if(state.key!==key){state.actor={};state.key=key;}
    const {_an,...appearance}=fake,actor=Object.assign(state.actor,appearance);
    actor.moving=false;actor.atkAnim=0;
    actor.skillPose=null;actor._bowPose=null;
    Sprites.drawPlayer(g,actor,t);
  }
};
