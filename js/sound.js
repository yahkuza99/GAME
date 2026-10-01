'use strict';
// ============================================================
//  เสียงประกอบ: สังเคราะห์ด้วย WebAudio (ไม่ต้องใช้ไฟล์) แบบหลายชั้น
//  ซองเสียง (attack/decay) + ฟิลเตอร์ + นอยส์ + FM (เสียงโลหะ) + รีเวิร์บสั้น ๆ
//  ถ้ามีไฟล์ assets/sfx_<ชื่อ>.ogg|mp3|wav ในรายการ manifest เกมจะใช้ไฟล์นั้นแทนเสียงสังเคราะห์ของชื่อเดียวกัน
// ============================================================

// ปรับความดังรายเสียงให้ใกล้กัน (เสียงลม/ประกายที่ผ่านฟิลเตอร์แคบจะเบากว่าเสียงอื่นมาก)
const SFX_GAIN = { swing: 3.5, bow: 2.5, skill: 3, magic: 2.5, equip: 2, click: 2.5, storage: 2, emote: 2, ice: 2, buy: 1.6, pickup: 1.6, warp: 1.5 };

const Sound = {
  ctx: null, out: null, rev: null, k: 1, last: {}, files: {}, bgm: {}, buffers: {}, _noise: null,
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; return null; }
    this.wire(this.ctx, this.ctx.destination);
    return this.ctx;
  },
  // ทางเดินเสียง: ทุกเสียง → out (ความดัง) → คอมเพรสเซอร์ → ลำโพง • ส่งบางส่วนเข้ารีเวิร์บ
  wire(c, dest) {
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.15;
    comp.connect(dest);
    this.out = c.createGain(); this.out.gain.value = this.vol(); this.out.connect(comp);
    // รีเวิร์บ: อิมพัลส์นอยส์ที่จางลง 0.9 วินาที
    const len = Math.floor(c.sampleRate * 0.9), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    const cv = c.createConvolver(); cv.buffer = ir;
    this.rev = c.createGain(); this.rev.gain.value = 0.35; this.rev.connect(cv); cv.connect(this.out);
    const n = c.sampleRate * 2, nb = c.createBuffer(1, n, c.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < n; i++) nd[i] = Math.random() * 2 - 1;
    this._noise = nb;
  },
  vol(v) { const o = typeof G !== 'undefined' && G.player && G.player.options; return 2.2 * (v != null ? v : o && o.sfxVol != null ? o.sfxVol : 0.8); },
  setVolume(v) { if (this.out && this.ctx) this.out.gain.setTargetAtTime(this.vol(v), this.ctx.currentTime, 0.05); },

  // ---------- ชิ้นส่วนเสียง ----------
  // o: { type, f, to (ความถี่ปลาย), at (หน่วงเริ่ม), dur, vol, a (attack), lp/hp (ฟิลเตอร์), q, wet (ส่งรีเวิร์บ), det (cents) }
  osc(o) {
    const c = this.ctx; if (!c) return;
    const t0 = c.currentTime + (o.at || 0), dur = o.dur || 0.2, a = o.a || 0.004;
    const s = c.createOscillator(), g = c.createGain();
    s.type = o.type || 'sine'; s.frequency.setValueAtTime(o.f, t0);
    if (o.det) s.detune.value = o.det;
    if (o.to) s.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + (o.slide || dur));
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime((o.vol || 0.1) * this.k, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = s;
    if (o.lp || o.hp) { const f = c.createBiquadFilter(); f.type = o.lp ? 'lowpass' : 'highpass'; f.frequency.value = o.lp || o.hp; f.Q.value = o.q || 0.7; node.connect(f); node = f; }
    node.connect(g); this.send(g, o.wet);
    s.start(t0); s.stop(t0 + dur + 0.05);
  },
  // นอยส์ผ่านฟิลเตอร์ (กวาดความถี่ได้): เสียงฟู่ ลม กระแทก แตก
  hiss(o) {
    const c = this.ctx; if (!c || !this._noise) return;
    const t0 = c.currentTime + (o.at || 0), dur = o.dur || 0.15, a = o.a || 0.003;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this._noise; s.loop = true;
    f.type = o.ft || 'bandpass'; f.Q.value = o.q || 1; f.frequency.setValueAtTime(o.f || 1000, t0);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime((o.vol || 0.1) * this.k, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); this.send(g, o.wet);
    s.start(t0, Math.random() * 1.5); s.stop(t0 + dur + 0.05);
  },
  // FM: ตัวพาความถี่ f ถูกกล้ำด้วย f*ratio → เสียงโลหะ ระฆัง ทั่ง
  fm(o) {
    const c = this.ctx; if (!c) return;
    const t0 = c.currentTime + (o.at || 0), dur = o.dur || 0.5;
    const car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain();
    car.frequency.value = o.f; mod.frequency.value = o.f * (o.ratio || 3.5);
    mg.gain.setValueAtTime(o.f * (o.index || 4), t0); mg.gain.exponentialRampToValueAtTime(1, t0 + dur);
    mod.connect(mg); mg.connect(car.frequency);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime((o.vol || 0.08) * this.k, t0 + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    car.connect(g); this.send(g, o.wet);
    car.start(t0); mod.start(t0); car.stop(t0 + dur + 0.05); mod.stop(t0 + dur + 0.05);
  },
  send(g, wet) { g.connect(this.out); if (wet) { const w = this.ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(this.rev); } },
  // ระฆังใส ๆ (ไซน์ + โอเวอร์โทน)
  chime(f, at = 0, vol = 0.05, dur = 0.6, wet = 0.5) {
    this.osc({ type: 'sine', f, at, dur, vol, wet });
    this.osc({ type: 'sine', f: f * 2.76, at, dur: dur * 0.45, vol: vol * 0.35, wet });
    this.osc({ type: 'sine', f: f * 5.4, at, dur: dur * 0.2, vol: vol * 0.15, wet });
  },
  // ของเดิม (ยังใช้ได้)
  tone(freq, dur, type = 'square', vol = 0.06, slide = 0, delay = 0) { this.osc({ type, f: freq, to: slide ? freq + slide : 0, dur, vol, at: delay }); },
  noise(dur, vol = 0.08, hp = 800) { this.hiss({ ft: 'highpass', f: hp, dur, vol }); },

  // ---------- ไฟล์เสียงจริง (ถ้ามี) ----------
  // ชื่อไฟล์จาก manifest เช่น sfx_hit.ogg → this.files.hit = 'sfx_hit.ogg?v=…'
  register(files, ver) {
    for (const f of files) {
      const m = /^sfx_([a-z0-9_]+)\.(ogg|mp3|wav)$/.exec(f);
      if (m) this.files[m[1]] = f + (ver[f] ? `?v=${ver[f]}` : '');
      const b = /^bgm_([a-z0-9_]+)\.(ogg|mp3|wav)$/.exec(f);
      if (b) this.bgm[b[1]] = f + (ver[f] ? `?v=${ver[f]}` : '');
    }
  },
  playFile(name) {
    const b = this.buffers[name];
    if (b === undefined) { // โหลดครั้งแรก: ระหว่างโหลดใช้เสียงสังเคราะห์ไปก่อน
      this.buffers[name] = null;
      fetch('assets/' + this.files[name]).then(r => r.arrayBuffer()).then(a => this.ctx.decodeAudioData(a))
        .then(buf => { this.buffers[name] = buf; }).catch(() => { delete this.files[name]; });
      return false;
    }
    if (!b) return false;
    const s = this.ctx.createBufferSource(); s.buffer = b;
    s.playbackRate.value = 1 + (Math.random() - 0.5) * 0.06;
    s.connect(this.out); s.start();
    return true;
  },

  play(name) {
    if (!G.player || !G.player.options.sound || document.hidden || G.fastSim) return;
    if (!this.ensure()) return;
    const now = performance.now();
    if (this.last[name] && now - this.last[name] < 45) return;
    this.last[name] = now;
    if (this.files[name] && this.playFile(name)) return;
    this.synth(name);
  },

  // เสียงสังเคราะห์ของแต่ละชื่อ (j = สุ่มระดับเสียงเล็กน้อย ตีรัว ๆ จะได้ไม่ซ้ำซาก)
  synth(name) {
    const j = 1 + (Math.random() - 0.5) * 0.08;
    this.k = SFX_GAIN[name] || 1;
    switch (name) {
      // --- ต่อสู้ ---
      case 'swing': // มีดฟันอากาศ: ลมวูบ
        this.hiss({ f: 900 * j, to: 3200, q: 2.5, dur: 0.16, vol: 0.12, a: 0.03 });
        break;
      case 'hit': // ฟันโดน: ตุ้บ + กรุบ
        this.osc({ type: 'sine', f: 150 * j, to: 55, dur: 0.12, vol: 0.32 });
        this.hiss({ f: 2200 * j, to: 700, q: 0.9, dur: 0.07, vol: 0.2 });
        this.osc({ type: 'square', f: 420 * j, to: 180, dur: 0.05, vol: 0.04, lp: 1800 });
        break;
      case 'crit': // คริติคอล: กระแทกหนัก + เสียงโลหะก้อง
        this.osc({ type: 'sine', f: 120, to: 40, dur: 0.22, vol: 0.4 });
        this.hiss({ f: 3000, to: 500, q: 0.8, dur: 0.14, vol: 0.26 });
        this.fm({ f: 620 * j, ratio: 2.41, index: 3, dur: 0.45, vol: 0.06, wet: 0.4 });
        break;
      case 'bow': // ยิงธนู: สายดีด + ลูกธนูพุ่ง
        this.osc({ type: 'triangle', f: 330 * j, to: 220, dur: 0.14, vol: 0.12, lp: 2000 });
        this.hiss({ f: 2500, to: 5200, q: 3, dur: 0.18, vol: 0.07, at: 0.02 });
        break;
      case 'hurt': // โดนตี: ตุ้บทึบ ๆ
        this.osc({ type: 'sine', f: 110 * j, to: 50, dur: 0.16, vol: 0.32 });
        this.hiss({ ft: 'lowpass', f: 900, dur: 0.1, vol: 0.18 });
        this.osc({ type: 'sawtooth', f: 160, to: 90, dur: 0.12, vol: 0.03, lp: 600 });
        break;
      case 'stun': // มึน: ตุ้บ + นกจิ๊บ ๆ วนหัว
        this.osc({ type: 'sine', f: 90, to: 40, dur: 0.2, vol: 0.32 });
        [1500, 1900, 1500, 1900, 1500].forEach((f, i) => this.osc({ type: 'sine', f, to: f * 1.15, dur: 0.07, vol: 0.035, at: 0.12 + i * 0.09, wet: 0.3 }));
        break;
      case 'kill': // มอนพัง: ตูม + ชิ้นส่วนกระจาย
        this.osc({ type: 'sine', f: 180, to: 45, dur: 0.25, vol: 0.3 });
        this.hiss({ f: 1600, to: 300, q: 0.7, dur: 0.3, vol: 0.16 });
        [0.04, 0.09, 0.15].forEach((at, i) => this.fm({ f: 900 + i * 260, ratio: 1.7, index: 2, dur: 0.12, vol: 0.025, at }));
        break;
      case 'die': // ผู้เล่นล้ม: เครื่องดับ เสียงต่ำลงเรื่อย ๆ
        this.osc({ type: 'sawtooth', f: 440, to: 55, slide: 1.1, dur: 1.2, vol: 0.07, lp: 1200, wet: 0.3 });
        this.osc({ type: 'sine', f: 220, to: 40, slide: 1.0, dur: 1.1, vol: 0.12 });
        this.hiss({ ft: 'lowpass', f: 1200, to: 120, dur: 0.9, vol: 0.06 });
        break;

      // --- สกิล/เวท ---
      case 'skill': // เริ่มร่าย: ประกายวูบขึ้น
        this.osc({ type: 'triangle', f: 500, to: 1100, dur: 0.18, vol: 0.06, wet: 0.4 });
        this.hiss({ f: 3000, to: 6000, q: 4, dur: 0.2, vol: 0.04, a: 0.05 });
        break;
      case 'magic': // ลูกพลังงาน
        this.osc({ type: 'sawtooth', f: 220, to: 660, dur: 0.3, vol: 0.05, lp: 1800, wet: 0.5 });
        this.osc({ type: 'sine', f: 440, to: 1320, dur: 0.3, vol: 0.06, wet: 0.5 });
        this.hiss({ f: 1500, to: 4000, q: 3, dur: 0.3, vol: 0.05 });
        break;
      case 'fire': // ไฟ: ฟู่ + ตูมอุ่น ๆ
        this.hiss({ ft: 'lowpass', f: 600, to: 2600, dur: 0.35, vol: 0.2, a: 0.04 });
        this.osc({ type: 'sine', f: 140, to: 60, dur: 0.3, vol: 0.2, at: 0.08 });
        this.hiss({ f: 3500, q: 0.6, dur: 0.18, vol: 0.06, at: 0.1 });
        break;
      case 'ice': // น้ำแข็ง: แก้วแตกกริ๊ง
        [2600, 3400, 2900, 4100].forEach((f, i) => this.fm({ f: f * j, ratio: 1.41, index: 1.5, dur: 0.25, vol: 0.03, at: i * 0.03, wet: 0.5 }));
        this.hiss({ ft: 'highpass', f: 5000, dur: 0.15, vol: 0.06 });
        break;
      case 'zap': // สายฟ้า: ปร๊ะ แตกกระจาย
        this.hiss({ ft: 'highpass', f: 1800, dur: 0.3, vol: 0.2 });
        this.osc({ type: 'square', f: 1200, to: 120, dur: 0.22, vol: 0.05, lp: 4000 });
        this.osc({ type: 'sine', f: 90, to: 40, dur: 0.25, vol: 0.2, at: 0.03 });
        break;
      case 'holy': // แสง: ระฆังสว่าง + ประกาย
        [1047, 1319, 1568].forEach((f, i) => this.chime(f, i * 0.04, 0.04, 0.7));
        this.hiss({ f: 6000, q: 2, dur: 0.4, vol: 0.03, a: 0.1, wet: 0.5 });
        break;
      case 'heal': // ฮีล: ไล่โน้ตขึ้นใส ๆ
        [784, 988, 1175, 1568].forEach((f, i) => this.chime(f, i * 0.07, 0.04, 0.7));
        this.hiss({ f: 5000, to: 8000, q: 3, dur: 0.5, vol: 0.025, a: 0.15, wet: 0.5 });
        break;
      case 'buff': // บัฟ: เสียงพุ่งขึ้น + ระฆัง
        this.osc({ type: 'triangle', f: 300, to: 900, dur: 0.35, vol: 0.06, wet: 0.4 });
        this.chime(1319, 0.2, 0.04, 0.6);
        break;
      case 'warp': // วาร์ป/ใช้ปีก: วูบหมุน
        this.osc({ type: 'sine', f: 300, to: 1600, slide: 0.45, dur: 0.5, vol: 0.08, wet: 0.6 });
        this.osc({ type: 'triangle', f: 450, to: 2400, slide: 0.45, dur: 0.5, vol: 0.04, wet: 0.6, det: 12 });
        this.hiss({ f: 800, to: 6000, q: 2, dur: 0.5, vol: 0.05 });
        break;

      // --- ไอเทม/ระบบ ---
      case 'potion': // ดื่มยา: อึก ๆ ฟองน้ำ
        [0, 0.09, 0.18].forEach((at, i) => this.osc({ type: 'sine', f: 300 + i * 60, to: 700 + i * 80, dur: 0.07, vol: 0.12, at }));
        this.chime(1175, 0.26, 0.03, 0.4);
        break;
      case 'pickup': // เก็บของ: ติ๊ง-ติ๊ง
        this.chime(1568 * j, 0, 0.05, 0.25, 0.2); this.chime(2093 * j, 0.06, 0.04, 0.3, 0.2);
        break;
      case 'buy': // ซื้อขาย: เหรียญกรุ๊งกริ๊ง
        [2400, 3100, 2700].forEach((f, i) => this.fm({ f, ratio: 1.5, index: 1.2, dur: 0.22, vol: 0.035, at: i * 0.05 }));
        break;
      case 'equip': // สวมของ: เหล็กกระทบ
        this.fm({ f: 520, ratio: 2.76, index: 2.5, dur: 0.25, vol: 0.07 });
        this.hiss({ f: 2500, q: 1, dur: 0.05, vol: 0.08 });
        break;
      case 'click': // ปุ่ม: ติ๊กเบา ๆ
        this.osc({ type: 'sine', f: 1800, to: 1200, dur: 0.04, vol: 0.05 });
        break;
      case 'storage': // คลังของ: กล่องเปิด
        this.osc({ type: 'square', f: 520, dur: 0.07, vol: 0.03, lp: 1500 });
        this.osc({ type: 'square', f: 780, dur: 0.09, vol: 0.03, lp: 1500, at: 0.07 });
        this.hiss({ f: 1200, q: 1, dur: 0.08, vol: 0.05, at: 0.05 });
        break;
      case 'emote': // อีโมต: ป๊อป
        this.osc({ type: 'sine', f: 900, to: 1800, dur: 0.08, vol: 0.07 });
        this.chime(2093, 0.05, 0.025, 0.25, 0.2);
        break;
      case 'refine_ok': // ตีบวกสำเร็จ: ทั่งดังเปรี้ยง + ระฆังฉลอง
        this.fm({ f: 440, ratio: 3.2, index: 5, dur: 0.6, vol: 0.09, wet: 0.4 });
        [1047, 1319, 1568, 2093].forEach((f, i) => this.chime(f, 0.18 + i * 0.07, 0.04, 0.7));
        break;
      case 'refine_fail': // ตีบวกพัง: แตกร้าว
        this.fm({ f: 300, ratio: 3.7, index: 6, dur: 0.3, vol: 0.08 });
        this.hiss({ f: 2000, to: 300, q: 0.6, dur: 0.6, vol: 0.18 });
        this.osc({ type: 'sawtooth', f: 200, to: 60, dur: 0.6, vol: 0.06, lp: 800 });
        break;

      // --- ฉลอง ---
      case 'levelup': // เลเวลอัป: อาร์เปจโจขึ้น + ประกายค้าง
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.osc({ type: 'triangle', f, dur: 0.3, vol: 0.06, at: i * 0.07, wet: 0.5 }));
        [1568, 2093].forEach((f, i) => this.chime(f, 0.38 + i * 0.08, 0.04, 0.9));
        this.hiss({ f: 6000, to: 9000, q: 2, dur: 0.8, vol: 0.025, at: 0.3, a: 0.2, wet: 0.6 });
        break;
      case 'mvp': // ล้ม MVP: แตรฉลองยาว
        [[392, 0], [523, 0.12], [659, 0.24], [784, 0.36], [1047, 0.5]].forEach(([f, at], i) => {
          this.osc({ type: 'sawtooth', f, dur: i === 4 ? 0.9 : 0.16, vol: 0.05, at, lp: 2400, wet: 0.5 });
          this.osc({ type: 'square', f: f / 2, dur: i === 4 ? 0.9 : 0.16, vol: 0.03, at, lp: 1200 });
        });
        [1568, 2093, 2637].forEach((f, i) => this.chime(f, 0.6 + i * 0.1, 0.035, 0.9));
        break;
      case 'quest': // เควสต์สำเร็จ: แตรสั้นแบบ RO (ขึ้น-ค้าง)
        [[523, 0], [659, 0.09], [784, 0.18], [1047, 0.3]].forEach(([f, at], i) => this.osc({ type: 'triangle', f, dur: i === 3 ? 0.5 : 0.14, vol: 0.07, at, wet: 0.4 }));
        this.chime(2093, 0.32, 0.03, 0.6);
        break;
      case 'quest_new':
        this.chime(784, 0, 0.05, 0.3); this.chime(988, 0.08, 0.05, 0.45);
        break;
    }
  },
};
