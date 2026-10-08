'use strict';
// ============================================================
//  ภาพฉากเคลื่อนไหวแบบ 2.5D (2026-10-08 เจ้าของ "เราทำขยับได้ไหม" ระดับ 2)
//  ภาพฉากเต็มจอ (#illust.scene) ที่มีแผนที่ความลึก assets/depth_<key>.webp → WebGL เลื่อนพิกเซลตามความลึก:
//  ใกล้ (ขาว) ขยับมาก ไกล (ดำ) ขยับน้อย → ตัวละครลอยเด่นจากฉากหลัง กล้องค่อย ๆ โคจร + เอียงตามเมาส์/แตะเล็กน้อย
//  แผนที่ความลึกสร้างในเครื่องด้วย Depth Anything V2 Small (ไม่ส่งภาพออก) • ไม่มีไฟล์ความลึก/ไม่มี WebGL = ใช้ภาพนิ่งเดิม (+ซูมช้า css)
// ============================================================
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const el = document.getElementById('illust'); if (!el) return;
  const VS = 'attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}';
  const FS = 'precision mediump float;varying vec2 v;uniform sampler2D img,dep;uniform vec2 off,cover;uniform float zoom;' +
    'void main(){vec2 uv=(v-.5)*cover/zoom+.5;float d=texture2D(dep,uv).r;vec2 q=uv+off*(d-.35);gl_FragColor=texture2D(img,clamp(q,.001,.999));}';
  let gl = null, cv = null, prog = null, raf = 0, key = '', tex = [], mx = 0, my = 0;
  const load = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  function setup() {
    cv = document.createElement('canvas'); cv.className = 'scene-depth';
    gl = cv.getContext('webgl', { premultipliedAlpha: false }); if (!gl) return false;
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
    prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });
    return true;
  }
  function texture(i, unit, img) {
    gl.activeTexture(gl.TEXTURE0 + unit); const t = tex[unit] || (tex[unit] = gl.createTexture()); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.uniform1i(gl.getUniformLocation(prog, i), unit);
  }
  async function start() {
    const k = el.dataset.key, img = el.querySelector('img'); if (!k || !img) return;
    let dep; try { dep = await load(`assets/depth_${k}.webp`); } catch (e) { return; } // ไม่มีแผนที่ความลึก = ภาพนิ่งเดิม
    if (!gl && !setup()) return;
    if (el.dataset.key !== k || !el.classList.contains('show')) return;
    const pic = img.complete ? img : await load(img.src);
    texture('img', 0, pic); texture('dep', 1, dep); key = k;
    if (cv.parentNode !== el) el.prepend(cv);
    el.classList.add('depth');
    const t0 = performance.now(), ar = pic.width / pic.height;
    cancelAnimationFrame(raf);
    const frame = now => {
      if (!el.classList.contains('show') || el.dataset.key !== key) return; // ตัวเฝ้าข้างล่างถอด class เอง
      const W = el.clientWidth, H = el.clientHeight, dpr = Math.min(1.5, devicePixelRatio || 1);
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); gl.viewport(0, 0, cv.width, cv.height); }
      const t = (now - t0) / 1000, va = W / H, cover = va > ar ? [1, ar / va] : [va / ar, 1];
      gl.uniform2f(gl.getUniformLocation(prog, 'cover'), cover[0], cover[1]);
      gl.uniform1f(gl.getUniformLocation(prog, 'zoom'), 1.06 + 0.03 * Math.sin(t * 0.12)); // ซูมเผื่อขอบ (ขยับแล้วไม่เห็นขอบภาพ)
      gl.uniform2f(gl.getUniformLocation(prog, 'off'), 0.018 * Math.sin(t * 0.33) + 0.012 * mx, 0.010 * Math.cos(t * 0.27) + 0.008 * my);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }
  // เริ่มเฉพาะตอน "เพิ่งเข้าฉาก" (สถานะเปลี่ยนจริง) — เดิมเรียก start ทุกครั้งที่ class เปลี่ยน รวมถึง class 'depth' ที่ตัวเองใส่
  // → วนเริ่มซ้ำไม่จบ (โหลดภาพ/อัปโหลดเท็กซ์เจอร์/เปิดลูปซ้อน) จนเบราว์เซอร์ล่ม (tests/class3.js: Target crashed)
  let was = '';
  new MutationObserver(() => {
    const on = el.classList.contains('scene') && el.classList.contains('show'), now = on ? 'on|' + el.dataset.key : '';
    if (now === was) return; was = now;
    if (on) start(); else { cancelAnimationFrame(raf); key = ''; if (el.classList.contains('depth')) el.classList.remove('depth'); }
  }).observe(el, { attributes: true, attributeFilter: ['class', 'data-key'] });
})();
