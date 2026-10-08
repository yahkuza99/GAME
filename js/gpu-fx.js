'use strict';
// Optional GPU glow only. Canvas gameplay stays authoritative and always renders normally.
const GpuFX = (() => {
  const MAX = 6, SIZE = 224, CONTENT = 192, PAD = 16;
  let app = null, pending = null, generation = 0, status = 'off', draws = [], slots = [], libs = null;
  const contextLost = e => { if (app?.canvas !== e.currentTarget) return; e.preventDefault(); fail(); };
  const wanted = () => !!G.player?.options.gpuFx && R.quality !== 'low';
  const script = src => new Promise((resolve, reject) => {
    const el = document.createElement('script'); el.src = src;
    el.onload = resolve; el.onerror = () => { el.remove(); reject(Error('Graphics library unavailable')); };
    document.head.appendChild(el);
  });
  function libraries() {
    if (!libs) libs = (async () => {
      if (!window.PIXI) await script('js/vendor/pixi-8.22.0.min.js');
      if (!window.PIXI.filters?.GlowFilter) await script('js/vendor/pixi-filters-6.1.5.js');
    })().catch(e => { libs = null; throw e; });
    return libs;
  }
  function release() {
    generation++; pending = null; draws = [];
    if (app) {
      app.canvas.removeEventListener('webglcontextlost', contextLost);
      for (const slot of slots) { slot.sprite.filters = null; slot.filter.destroy(); slot.texture.destroy(true); }
      slots = []; app.destroy(true, { children: true }); app = null;
    }
    status = R.quality === 'low' && G.player?.options.gpuFx ? 'low' : 'off';
  }
  function fail() {
    release(); status = 'unsupported';
    if (G.player) { G.player.options.gpuFx = false; saveGame(); }
    UI.msg(L('เครื่องนี้เปิดแสงสกิลเพิ่มเติมไม่ได้ ใช้ภาพปกติต่อได้ครับ', 'Extra skill lighting is unavailable; standard graphics remain active.'), 'info');
    if (UI.isOpen('w-options')) UI.renderOptions(true);
  }
  function sync() {
    if (!wanted()) { release(); return Promise.resolve(false); }
    if (app) return Promise.resolve(true);
    if (pending) return pending;
    const token = ++generation; status = 'loading';
    pending = (async () => {
      let candidate;
      try {
        await libraries(); if (token !== generation || !wanted()) return false;
        candidate = new PIXI.Application();
        await candidate.init({ width: R.W, height: R.H, resolution: 1, autoStart: false,
          preference: 'webgl', powerPreference: 'low-power', backgroundAlpha: 0, antialias: false });
        if (token !== generation || !wanted()) { candidate.destroy(true, {children:true}); return false; }
        app = candidate; candidate = null;
        app.canvas.id = 'gpu-skill-light'; app.canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1';
        app.canvas.setAttribute('aria-hidden', 'true'); app.canvas.hidden = true;
        R.cv.insertAdjacentElement('afterend', app.canvas);
        app.canvas.addEventListener('webglcontextlost', contextLost, {once:true});
        status = 'on'; return true;
      } catch (e) {
        if (candidate?.renderer) candidate.destroy(true, {children:true});
        if (token === generation && wanted()) fail();
        return false;
      } finally { if (token === generation) pending = null; }
    })();
    return pending;
  }
  function slot(index) {
    if (slots[index]) return slots[index];
    const cv = document.createElement('canvas'); cv.width = cv.height = SIZE;
    const texture = PIXI.Texture.from(cv), sprite = new PIXI.Sprite(texture);
    const filter = new PIXI.filters.GlowFilter({distance:7,outerStrength:1.3,innerStrength:0,quality:.1,knockout:true});
    sprite.filters = [filter]; sprite.alpha = .55; sprite.eventMode = 'none';
    app.stage.addChild(sprite);
    return (slots[index] = {cv, g:cv.getContext('2d'), texture, sprite, filter});
  }
  function render() {
    if (!app) return;
    if (!wanted() || !G.started) { release(); return; }
    if (app.screen.width !== R.W || app.screen.height !== R.H) app.renderer.resize(R.W, R.H);
    for (const s of slots) s.sprite.visible = false;
    app.canvas.hidden = draws.length === 0;
    if (!draws.length) return;
    draws.slice(0, MAX).forEach(({f,m},i) => {
      const s = slot(i), pos = R.fxPos(f), width = f.width, ratio = CONTENT / width;
      s.g.setTransform(1,0,0,1,0,0); s.g.clearRect(0,0,SIZE,SIZE);
      s.g.setTransform(ratio,0,0,ratio,PAD + CONTENT/2 - pos.x*TILE*ratio,
        PAD + CONTENT*220/256 - pos.y*TILE*R.K*ratio);
      SkillArtFX.draw(s.g,f); s.texture.source.update();
      const x = pos.x*TILE - width/2 - PAD/ratio, y = pos.y*TILE*R.K - width*220/256 - PAD/ratio;
      s.sprite.position.set((m.a*x+m.c*y+m.e)/R.dpr,(m.b*x+m.d*y+m.f)/R.dpr);
      s.sprite.width = SIZE/ratio*m.a/R.dpr; s.sprite.height = SIZE/ratio*m.d/R.dpr;
      s.filter.color = ({fire:0xffbc75,ice:0xb7efff,light:0xffebb2,shield:0xa8dcff,fang:0xffa080,slash:0xf0c7ff})[f.kind] || 0xffffff;
      s.sprite.visible = true;
    });
    app.render();
  }
  const draw0 = R.drawFx;
  R.drawFx = function(g,f,t) {
    if (app && wanted() && !G.fastSim && g === R.g && f.skillArt && !['meteor','lightning'].includes(f.kind) && draws.length < MAX)
      draws.push({f,m:g.getTransform()});
    return draw0.apply(this,arguments);
  };
  const render0 = R.render;
  R.render = function() { draws = []; const result = render0.apply(this,arguments); try { render(); } catch(e) { fail(); } return result; };
  const quality0 = R.setQuality;
  R.setQuality = function(q) { quality0(q); sync(); };
  return { sync, release, get active(){return !!app;}, get status(){return status;}, get resources(){return slots.length;},
    get pending(){return !!pending;}, get maxEffects(){return MAX;} };
})();
