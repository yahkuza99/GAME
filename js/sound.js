'use strict';
// ============================================================
//  เสียงประกอบแบบสังเคราะห์ด้วย WebAudio (ไม่ต้องใช้ไฟล์เสียง)
// ============================================================

const Sound = {
  ctx: null, last: {},
  ensure() {
    if (this.ctx) return this.ctx;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
    return this.ctx;
  },
  tone(freq, dur, type = 'square', vol = 0.06, slide = 0, delay = 0) {
    const c = this.ctx; if (!c) return;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  },
  noise(dur, vol = 0.08, hp = 800) {
    const c = this.ctx; if (!c) return;
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol;
    s.buffer = buf; s.connect(f); f.connect(g); g.connect(c.destination); s.start();
  },
  play(name) {
    if (!G.player || !G.player.options.sound || document.hidden || G.fastSim) return;
    if (!this.ensure()) return;
    const now = performance.now();
    if (this.last[name] && now - this.last[name] < 45) return;
    this.last[name] = now;
    switch (name) {
      case 'hit': this.noise(0.08, 0.07, 1200); this.tone(180, 0.06, 'square', 0.03, -80); break;
      case 'crit': this.noise(0.12, 0.1, 600); this.tone(520, 0.12, 'sawtooth', 0.04, -300); break;
      case 'swing': this.noise(0.06, 0.03, 3000); break;
      case 'bow': this.tone(900, 0.08, 'triangle', 0.04, -600); break;
      case 'hurt': this.tone(140, 0.12, 'sawtooth', 0.05, -60); break;
      case 'kill': this.tone(300, 0.1, 'square', 0.04, -200); break;
      case 'levelup': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.07, 0, i * 0.1)); break;
      case 'mvp': [392, 523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.3, 'square', 0.05, 0, i * 0.09)); break;
      case 'pickup': this.tone(880, 0.06, 'square', 0.035); this.tone(1320, 0.08, 'square', 0.03, 0, 0.05); break;
      case 'potion': this.tone(600, 0.15, 'sine', 0.07, 400); break;
      case 'heal': [660, 880, 990].forEach((f, i) => this.tone(f, 0.2, 'sine', 0.05, 0, i * 0.07)); break;
      case 'buff': [440, 660, 880].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.05, 0, i * 0.06)); break;
      case 'skill': this.tone(700, 0.08, 'triangle', 0.04, 200); break;
      case 'magic': this.tone(300, 0.25, 'sawtooth', 0.035, 500); this.noise(0.2, 0.03, 2000); break;
      case 'zap': this.noise(0.25, 0.08, 1500); this.tone(1200, 0.15, 'square', 0.03, -900); break;
      case 'warp': this.tone(400, 0.35, 'sine', 0.05, 800); break;
      case 'equip': this.tone(300, 0.07, 'square', 0.04); this.tone(450, 0.07, 'square', 0.04, 0, 0.06); break;
      case 'click': this.tone(1000, 0.04, 'square', 0.03); break;
      case 'buy': this.tone(1200, 0.06, 'square', 0.035); this.tone(1600, 0.1, 'square', 0.03, 0, 0.06); break;
      case 'die': [400, 300, 200, 120].forEach((f, i) => this.tone(f, 0.3, 'sawtooth', 0.05, 0, i * 0.15)); break;
      case 'refine_ok': [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.06, 0, i * 0.08)); break;
      case 'refine_fail': this.noise(0.4, 0.12, 300); this.tone(200, 0.4, 'sawtooth', 0.05, -150); break;
    }
  },
};
