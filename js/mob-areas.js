'use strict';
// Normalized habitats keep their locations stable across visits without changing terrain seeds.
const MobAreas = {
  colors: ['#82db78', '#ffd279', '#82cfff', '#f7a3bc', '#c7a5ff'],
  layouts: {
    meadow: [[.22,.65,.19,.25], [.27,.25,.21,.20], [.53,.30,.20,.23], [.77,.72,.19,.22], [.77,.26,.18,.20]],
    mistlake: [[.23,.30,.20,.23], [.72,.28,.22,.23], [.72,.72,.22,.23], [.28,.72,.23,.23]],
    wolfwood: [[.32,.20,.24,.17], [.69,.41,.23,.19], [.30,.63,.23,.20], [.65,.81,.24,.15]],
    helcave: [[.25,.26,.22,.22], [.74,.28,.21,.22], [.27,.72,.22,.22], [.73,.73,.22,.22]],
    archive: [[.25,.20,.22,.16], [.73,.22,.22,.18], [.27,.51,.23,.19], [.72,.61,.22,.20], [.30,.82,.22,.15]],
    roots: [[.20,.27,.16,.22], [.43,.73,.20,.21], [.61,.27,.20,.22], [.82,.72,.15,.22]],
    abyss: [[.23,.22,.20,.16], [.72,.23,.20,.17], [.26,.51,.22,.19], [.73,.52,.21,.18], [.37,.80,.24,.15]],
  },
  cache: new WeakMap(),
  list(map) {
    const layout = this.layouts[map.id] || [];
    return (map.def.spawns || []).map(([id], i) => {
      const a = layout[i];
      return a && { id, index: i + 1, color: this.colors[i % this.colors.length], x: a[0]*map.w, y: a[1]*map.h, rx: a[2]*map.w, ry: a[3]*map.h };
    }).filter(Boolean);
  },
  get(map, id) { return this.list(map).find(a => a.id === id); },
  contains(a, x, y) { return ((x-a.x)/a.rx)**2 + ((y-a.y)/a.ry)**2 <= 1; },
  cells(map, area) {
    let zones = this.cache.get(map);
    if (!zones) { zones = new Map(); this.cache.set(map, zones); }
    if (!zones.has(area.id)) {
      const cells = [];
      for (let y=2; y<map.h-2; y++) for (let x=2; x<map.w-2; x++) {
        if (!this.contains(area, x+.5, y+.5) || !map.walkable(x,y)) continue;
        if (map.portals.some(p => U.dist(p.x+.5,p.y+.5,x+.5,y+.5)<4)) continue;
        if ((map.def.npcs || []).some(n => U.dist(n.x+.5,n.y+.5,x+.5,y+.5)<3)) continue;
        cells.push({x,y});
      }
      zones.set(area.id, cells);
    }
    return zones.get(area.id);
  },
  position(map, area, player) {
    const cells = this.cells(map, area);
    if (!cells.length) return null;
    // Prefer a safe gap from the player, but never fall back to a wall or outside the habitat.
    for (let i=0;i<80;i++) {
      const q = cells[U.randi(0,cells.length-1)];
      if (U.dist(q.x+.5,q.y+.5,player.x,player.y)>=7) return q;
    }
    return cells.reduce((best,q) => U.dist(q.x+.5,q.y+.5,player.x,player.y)>U.dist(best.x+.5,best.y+.5,player.x,player.y) ? q : best);
  },
  draw(g, map, scale, display = 1) {
    g.save();
    for (const a of this.list(map)) {
      g.fillStyle = a.color; g.strokeStyle = a.color; g.lineWidth=1.5*display;
      g.beginPath(); g.ellipse(a.x*scale,a.y*scale,a.rx*scale,a.ry*scale,0,0,Math.PI*2);
      g.globalAlpha=.12; g.fill(); g.globalAlpha=.8; g.setLineDash([6*display,4*display]); g.stroke(); g.setLineDash([]); g.globalAlpha=1;
      g.beginPath(); g.arc(a.x*scale,a.y*scale,10*display,0,Math.PI*2); g.fill();
      g.fillStyle='#172018'; g.font=`bold ${12*display}px sans-serif`; g.textAlign='center'; g.textBaseline='middle'; g.fillText(a.index,a.x*scale,a.y*scale);
    }
    g.restore();
  },
};
