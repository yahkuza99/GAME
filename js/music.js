'use strict';
// ============================================================
//  เพลงประกอบสังเคราะห์ด้วย WebAudio (ไม่ใช้ไฟล์เสียง)
//  แต่ละแผนที่มีธีมของตัวเอง: คอร์ด + เบส + อาร์เปจโจ + ทำนอง + กลอง
//  ทำนองสร้างจาก seed คงที่ จึงได้เพลงเดิมทุกครั้งที่เข้าแผนที่นั้น
// ============================================================

const NOTE = n => 440 * Math.pow(2, (n - 69) / 12); // MIDI -> Hz
const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10], DORIAN = [0, 2, 3, 5, 7, 9, 10];

// chords = ดีกรีของสเกล (0 = I) ต่อห้อง, lead = เสียงทำนอง
const THEMES = {
  town:   { bpm: 104, root: 60, scale: MAJOR, chords: [0, 4, 5, 3], seed: 11, lead: 'triangle', drums: 'light', arp: true, swing: 0.08, vol: 1 },
  field:  { bpm: 116, root: 55, scale: MAJOR, chords: [0, 3, 4, 0, 5, 3, 4, 4], seed: 23, lead: 'flute', drums: 'march', arp: true, vol: 1 },
  lake:   { bpm: 78, root: 62, scale: MAJOR, chords: [0, 5, 3, 4], seed: 37, lead: 'flute', drums: 'none', arp: true, pad7: true, vol: 0.95 },
  forest: { bpm: 94, root: 57, scale: DORIAN, chords: [0, 6, 5, 6], seed: 41, lead: 'triangle', drums: 'soft', arp: true, vol: 0.95 },
  cave:   { bpm: 68, root: 50, scale: MINOR, chords: [0, 0, 5, 6], seed: 53, lead: 'bell', drums: 'deep', arp: false, drone: true, vol: 0.9 },
};
const MAP_THEME = { eldheim: 'town', meadow: 'field', mistlake: 'lake', wolfwood: 'forest', helcave: 'cave' };

const Music = {
  theme: null, want: null, bus: null, timer: null, step: 0, nextT: 0, song: null,

  // เรียกทุกเฟรม: เล่นธีมของแผนที่ปัจจุบันเมื่อผู้เล่นเปิดเพลง
  update() {
    const p = G.player;
    const on = p && G.started && p.options.music !== false && !document.hidden;
    const want = on ? (MAP_THEME[G.map && G.map.id] || 'field') : null;
    if (want === this.theme) return;
    if (!Sound.ctx || Sound.ctx.state !== 'running') { if (want) Sound.ensure(); if (!Sound.ctx || Sound.ctx.state !== 'running') return; }
    this.stop();
    if (want) this.start(want);
  },
  setVolume(v) { if (this.bus) this.bus.gain.setTargetAtTime(this.vol(v), Sound.ctx.currentTime, 0.2); },
  vol(v) { return 0.26 * (v == null ? (G.player && G.player.options.musicVol != null ? G.player.options.musicVol : 0.7) : v) * (THEMES[this.theme] ? THEMES[this.theme].vol : 1); },

  start(name) {
    const c = Sound.ctx, T = THEMES[name];
    this.theme = name;
    this.bus = c.createGain();
    this.bus.gain.setValueAtTime(0, c.currentTime);
    this.bus.gain.linearRampToValueAtTime(this.vol(), c.currentTime + 1.5);
    // เอคโค่เบา ๆ ให้เสียงกว้าง
    const dl = c.createDelay(1), fb = c.createGain(), wet = c.createGain();
    dl.delayTime.value = 60 / T.bpm * 0.75; fb.gain.value = 0.28; wet.gain.value = 0.22;
    this.bus.connect(c.destination); this.bus.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(c.destination);
    this.fx = { dl, fb, wet };
    if (this.variants(name).length) { this.playFile(name); return; }
    this.song = this.compose(T);
    this.step = 0; this.nextT = c.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 40);
  },
  // ไฟล์เสียงจริง assets/bgm_<ธีม>.ogg หรือหลายตัวเลือก bgm_<ธีม>_v1.ogg, _v2 … (มีหลายตัว = สุ่มเล่นสลับกันไปเรื่อย ๆ)
  // แต่ละไฟล์ต่อหัว-ท้ายให้วนเนียนอยู่แล้ว • ตอนสลับตัวเลือกจะ crossfade 2 วินาที • โหลดไม่ได้เลยก็กลับไปใช้เพลงสังเคราะห์
  variants(name) { return Object.keys(Sound.bgm).filter(k => k === name || k.startsWith(name + '_v')); },
  load(key) {
    const k = 'bgm_' + key;
    if (Sound.buffers[k]) return Promise.resolve(Sound.buffers[k]);
    return fetch('assets/' + Sound.bgm[key]).then(r => (r.ok ? r.arrayBuffer() : Promise.reject())).then(a => Sound.ctx.decodeAudioData(a))
      .then(buf => (Sound.buffers[k] = buf));
  },
  playFile(name) {
    const c = Sound.ctx, bus = this.bus, XF = 2;
    let last = null;
    const pick = () => {
      const v = this.variants(name), pool = v.length > 1 ? v.filter(k => k !== last) : v;
      return pool[Math.floor(Math.random() * pool.length)];
    };
    const playNext = (fadeIn) => {
      if (this.bus !== bus) return; // เปลี่ยนแผนที่ไปแล้ว
      const key = pick();
      if (!key) return this.fallback(name, bus);
      this.load(key).then(buf => {
        if (this.bus !== bus) return;
        last = key;
        const g = c.createGain(), t = c.currentTime, src = c.createBufferSource();
        g.gain.setValueAtTime(fadeIn ? 0 : 1, t); if (fadeIn) g.gain.linearRampToValueAtTime(1, t + XF);
        src.buffer = buf; src.connect(g); g.connect(bus); src.start(t);
        const end = t + buf.duration;
        g.gain.setValueAtTime(1, end - XF); g.gain.linearRampToValueAtTime(0, end);
        src.stop(end + 0.05);
        this.src = src;
        clearTimeout(this.nextFile);
        this.nextFile = setTimeout(() => playNext(true), Math.max(0.5, buf.duration - XF) * 1000);
      }).catch(() => { delete Sound.bgm[key]; playNext(fadeIn); });
    };
    playNext(false);
  },
  fallback(name, bus) {
    if (this.bus !== bus || !THEMES[name]) return;
    const c = Sound.ctx;
    this.song = this.compose(THEMES[name]); this.step = 0; this.nextT = c.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 40);
  },
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    clearTimeout(this.nextFile); this.nextFile = null;
    if (this.src) { const s = this.src; this.src = null; setTimeout(() => { try { s.stop(); } catch (e) { /* หยุดไปแล้ว */ } }, 1300); }
    if (this.bus && Sound.ctx) {
      const b = this.bus, fx = this.fx, t = Sound.ctx.currentTime;
      b.gain.cancelScheduledValues(t); b.gain.setValueAtTime(b.gain.value, t); b.gain.linearRampToValueAtTime(0, t + 1.2);
      setTimeout(() => { try { b.disconnect(); fx.wet.disconnect(); } catch (e) { /* ปิดไปแล้ว */ } }, 1500);
    }
    this.bus = null; this.theme = null;
  },

  // สร้างทำนอง 16 ห้อง รูปแบบ A A' B A (ห้องละ 8 จังหวะย่อย)
  compose(T) {
    const rnd = U.seeded(T.seed);
    const len = T.chords.length;
    const motif = [], alt = [];
    const makeBar = (chordDeg, prevDeg, busy) => {
      const bar = []; let deg = prevDeg;
      for (let s = 0; s < 8; s++) {
        const strong = s % 4 === 0, play = strong || rnd() < busy;
        if (!play) { bar.push(null); continue; }
        if (strong) { const tones = [chordDeg, chordDeg + 2, chordDeg + 4]; deg = tones.reduce((a, b) => (Math.abs(b - deg) < Math.abs(a - deg) ? b : a)); }
        else deg += U.pick([-1, 1, 1, -1, 2, -2], rnd);
        deg = U.clamp(deg, chordDeg - 3, chordDeg + 7);
        const long = rnd() < 0.3 && s % 2 === 0;
        bar.push({ deg, len: long ? 2 : 1 });
        if (long) { bar.push(null); s++; }
      }
      return { bar, last: deg };
    };
    let d = 4;
    for (let i = 0; i < 4; i++) { const r = makeBar(T.chords[i % len], d, 0.45); motif.push(r.bar); d = r.last; }
    for (let i = 0; i < 4; i++) { const r = makeBar(T.chords[(i + 2) % len] + 2, d, 0.55); alt.push(r.bar); d = r.last; }
    const var2 = motif.map((b, i) => (i === 3 ? makeBar(T.chords[3 % len], 4, 0.3).bar : b));
    return { lead: [...motif, ...var2, ...alt, ...motif], bars: 16 };
  },
  // เลขดีกรีสเกล -> ความถี่ (รองรับดีกรีติดลบ/ข้ามอ็อกเทฟ)
  pitch(T, deg, oct = 0) {
    const n = T.scale.length, o = Math.floor(deg / n), i = ((deg % n) + n) % n;
    return NOTE(T.root + T.scale[i] + 12 * (o + oct));
  },

  schedule() {
    const c = Sound.ctx, T = THEMES[this.theme];
    if (!c || !T || !this.bus) return;
    const stepDur = 60 / T.bpm / 2; // โน้ตเขบ็ตหนึ่งชั้น
    if (this.nextT < c.currentTime - 0.1) this.nextT = c.currentTime + 0.05; // ตัวจับเวลาถูกหน่วง: ข้ามไป ไม่เล่นโน้ตค้างรวดเดียว
    while (this.nextT < c.currentTime + 0.25) {
      const st = this.step, bar = Math.floor(st / 8) % this.song.bars, s = st % 8;
      const chord = T.chords[bar % T.chords.length];
      let t = this.nextT + (s % 2 ? (T.swing || 0) * stepDur : 0);
      // คอร์ดแพด (ต้นห้อง)
      if (s === 0) {
        const tones = [0, 2, 4].concat(T.pad7 ? [6] : []);
        tones.forEach(k => this.voice('pad', this.pitch(T, chord + k, -1), t, stepDur * 8, 0.05));
        if (T.drone) this.voice('drone', this.pitch(T, 0, -2), t, stepDur * 8, 0.09);
      }
      // เบส
      if (s === 0 || s === 4 || (T.drums === 'march' && s === 6)) this.voice('bass', this.pitch(T, chord, -2), t, stepDur * (s === 6 ? 1 : 3), 0.16);
      // อาร์เปจโจ
      if (T.arp) {
        const pat = [0, 2, 4, 7, 4, 2, 4, 7];
        this.voice('pluck', this.pitch(T, chord + pat[s], 0), t, stepDur * 0.9, 0.035);
      }
      // ทำนอง
      const n = this.song.lead[bar][s];
      if (n) this.voice(T.lead, this.pitch(T, n.deg, 1), t, stepDur * n.len * 0.95, T.lead === 'bell' ? 0.07 : 0.06);
      // กลอง
      this.drum(T.drums, s, t);
      this.nextT += stepDur; this.step++;
    }
  },

  voice(kind, f, t, dur, vol) {
    const c = Sound.ctx, g = c.createGain();
    g.connect(this.bus);
    const osc = (type, freq, det = 0) => { const o = c.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = det; return o; };
    let srcs = [], out = g, a = 0.01, r = 0.15;
    if (kind === 'pad') {
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(g); out = lp;
      srcs = [osc('sawtooth', f, -7), osc('sawtooth', f, 7)]; a = 0.5; r = 0.8;
    } else if (kind === 'drone') {
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400; lp.connect(g); out = lp;
      srcs = [osc('sawtooth', f, -4), osc('square', f / 2, 3)]; a = 1.2; r = 1.2;
    } else if (kind === 'bass') { srcs = [osc('triangle', f)]; a = 0.01; r = 0.12; }
    else if (kind === 'pluck') {
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.connect(g); out = lp;
      srcs = [osc('square', f)]; a = 0.004; r = 0.05;
    } else if (kind === 'flute') {
      const o = osc('sine', f), lfo = osc('sine', 5.5), lg = c.createGain(); lg.gain.value = f * 0.012;
      lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.4);
      srcs = [o, osc('triangle', f * 2)]; a = 0.05; r = 0.18;
    } else if (kind === 'bell') {
      srcs = [osc('sine', f), osc('sine', f * 2.76), osc('sine', f * 5.4)]; a = 0.003; r = dur * 1.5;
    } else { srcs = [osc('triangle', f), osc('sine', f * 2)]; a = 0.02; r = 0.14; }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    if (kind === 'bell' || kind === 'pluck') g.gain.exponentialRampToValueAtTime(0.0001, t + a + Math.max(r, dur));
    else { g.gain.setValueAtTime(vol, t + Math.max(a, dur - r)); g.gain.linearRampToValueAtTime(0.0001, t + dur + r); }
    srcs.forEach((o, i) => {
      if (kind === 'bell' && i) { const hg = c.createGain(); hg.gain.value = i === 1 ? 0.35 : 0.12; o.connect(hg); hg.connect(out); } else o.connect(out);
      o.start(t); o.stop(t + dur + r + 0.6);
    });
    setTimeout(() => { try { g.disconnect(); } catch (e) { /* ปิดแล้ว */ } }, (t - c.currentTime + dur + r + 1) * 1000);
  },
  drum(style, s, t) {
    if (!style || style === 'none') return;
    const kick = s === 0 || (style !== 'deep' && s === 4 && style !== 'soft');
    const snare = (style === 'light' || style === 'march') && (s === 4);
    const hat = (style === 'light' || style === 'march' || style === 'soft') && s % 2 === 1;
    if (kick || (style === 'deep' && s === 0)) this.hit('kick', t, style === 'deep' ? 0.35 : 0.3);
    if (style === 'march' && s === 7) this.hit('snare', t, 0.05);
    if (snare) this.hit('snare', t, 0.09);
    if (hat) this.hit('hat', t, style === 'soft' ? 0.025 : 0.035);
  },
  hit(kind, t, vol) {
    const c = Sound.ctx, g = c.createGain(); g.connect(this.bus);
    if (kind === 'kick') {
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.18);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(g); o.start(t); o.stop(t + 0.3);
    } else {
      if (!this.noiseBuf) {
        const n = c.sampleRate * 0.3; this.noiseBuf = c.createBuffer(1, n, c.sampleRate);
        const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      }
      const src = c.createBufferSource(), f = c.createBiquadFilter();
      src.buffer = this.noiseBuf;
      f.type = kind === 'hat' ? 'highpass' : 'bandpass'; f.frequency.value = kind === 'hat' ? 7000 : 1800;
      const d = kind === 'hat' ? 0.05 : 0.14;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      src.connect(f); f.connect(g); src.start(t); src.stop(t + d + 0.02);
    }
    setTimeout(() => { try { g.disconnect(); } catch (e) { /* ปิดแล้ว */ } }, (t - c.currentTime + 0.6) * 1000);
  },
};
