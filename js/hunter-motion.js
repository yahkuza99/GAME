'use strict';
// One simulation clock for draw, release and recovery; distance drives walking frames.
const HunterMotion = {
  muzzle(p, target) {
    const sx = p.x*TILE, sy = p.y*TILE*R.K-30;
    const tx = target.x*TILE, ty = target.y*TILE*R.K-18*((target.def && target.def.scale)||1);
    const a = Math.atan2(ty-sy,tx-sx);
    return [sx+Math.cos(a)*12,sy+Math.sin(a)*12];
  },
  start(p, duration) {
    const dur = U.clamp(duration, .2, .44);
    p._bowPose = { at: G.time, dur, dir: p.dir, map: G.map.id };
    return dur * .46;
  },
  pose(p) {
    const a = p._bowPose;
    if (!a || a.map !== G.map.id || p.dead || p.sitting || G.time < a.at || G.time >= a.at+a.dur) return null;
    const k = (G.time-a.at)/a.dur;
    return { progress: 1-k, dir: a.dir, recoil: k>.46 ? Math.sin((k-.46)/.54*Math.PI)*1.8 : 0 };
  },
  followPoint(p, wolf) {
    const angle = (p.dir == null ? 2 : p.dir)*Math.PI/4, side = wolf.split ? -1 : 1;
    const x = p.x-Math.cos(angle)*.9-Math.sin(angle)*side*.95;
    const y = p.y-Math.sin(angle)*.9+Math.cos(angle)*side*.95;
    return G.map.walkable(Math.floor(x),Math.floor(y)) ? {x,y} : G.map.nearestWalkable(x,y);
  },
};
