// ─────────────────────────────────────────────────────────────────────────────
//  p2_mincho post-process: a 1995 TV-master look, nothing more.
//  mild softness (small-radius blur mix), very slight chroma offset, film grain,
//  soft vignette, full-frame flash. Bloom exists only for the few frames where the
//  real OP has light (flare, X-flash, wings) and is skipped entirely otherwise.
// ─────────────────────────────────────────────────────────────────────────────
class PostFX {
  constructor(canvas, w, h) {
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false });
    if (!gl) throw new Error('WebGL unavailable');
    this.gl = gl; this.w = w; this.h = h;
    const vs = `attribute vec2 p; varying vec2 uv; void main(){ uv = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }`;
    const bright = `precision highp float; varying vec2 uv; uniform sampler2D src; uniform float thr;
      void main(){ vec3 c = texture2D(src, uv).rgb; float l = max(max(c.r,c.g),c.b);
        gl_FragColor = vec4(c*smoothstep(thr, thr+0.2, l),1.); }`;
    const blur = `precision highp float; varying vec2 uv; uniform sampler2D src; uniform vec2 dir;
      void main(){ vec3 c = texture2D(src, uv).rgb*0.2270270270;
        c += texture2D(src, uv+dir*1.3846153846).rgb*0.3162162162; c += texture2D(src, uv-dir*1.3846153846).rgb*0.3162162162;
        c += texture2D(src, uv+dir*3.2307692308).rgb*0.0702702703; c += texture2D(src, uv-dir*3.2307692308).rgb*0.0702702703;
        gl_FragColor = vec4(c,1.); }`;
    const final = `precision highp float; varying vec2 uv;
      uniform sampler2D src; uniform sampler2D b1;
      uniform float bloom, ca, grain, vig, time, flash, soft, contrast, lift;
      uniform vec3 flashCol; uniform vec2 res;
      // sin-free hash (Hoskins): sin() of large arguments loses precision in SwiftShader and
      // left a diagonal grain-free band on late frames
      float h(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      void main(){
        vec2 u = uv; vec2 px = 1.0/res;
        vec2 d = u - 0.5; float r2 = dot(d,d);
        vec2 off = d * ca * (0.4 + r2*1.2) * 0.004;
        vec3 c = vec3(texture2D(src, u + off).r, texture2D(src, u).g, texture2D(src, u - off).b);
        // softness: 4-tap cross at ~0.9px, like a composite master
        vec3 s = texture2D(src, u + vec2(px.x*0.9, 0.)).rgb + texture2D(src, u - vec2(px.x*0.9, 0.)).rgb
               + texture2D(src, u + vec2(0., px.y*0.9)).rgb + texture2D(src, u - vec2(0., px.y*0.9)).rgb;
        c = mix(c, s*0.25, soft);
        if (bloom > 0.0) c += texture2D(b1, u).rgb * bloom;
        c = (c - 0.5) * contrast + 0.5;
        c = c*(1.0-lift) + lift;          // black lift: TV blacks are never 0
        c *= mix(1.0, smoothstep(1.05, 0.2, r2*1.8), vig);
        // grain: per-frame, luma-weighted, 2px clumps
        float gt = floor(time*30.0);
        float g = h(floor(u*res/1.6) + vec2(mod(gt*61.0, 1009.0), mod(gt*17.0, 997.0))) - 0.5;
        float lum = dot(c, vec3(0.299,0.587,0.114));
        c += g * grain * (0.55 + 0.9*lum*(1.0-lum)*2.0);
        c = mix(c, flashCol, clamp(flash,0.0,1.0));
        gl_FragColor = vec4(clamp(c,0.0,1.0), 1.0);
      }`;
    this.pBright = this.prog(vs, bright);
    this.pBlur = this.prog(vs, blur);
    this.pFinal = this.prog(vs, final);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.srcTex = this.tex(w, h);
    this.q = [this.fbo(w / 4, h / 4), this.fbo(w / 4, h / 4)];
  }
  prog(vsSrc, fsSrc) {
    const gl = this.gl;
    const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vsSrc)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    p.u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); p.u[info.name] = gl.getUniformLocation(p, info.name); }
    p.a = gl.getAttribLocation(p, 'p');
    return p;
  }
  tex(w, h) {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  fbo(w, h) {
    const gl = this.gl, t = this.tex(w, h), f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { f, t, w, h };
  }
  pass(p, target, texs, uni) {
    const gl = this.gl;
    gl.useProgram(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.f : null);
    gl.viewport(0, 0, target ? target.w : this.w, target ? target.h : this.h);
    gl.enableVertexAttribArray(p.a);
    gl.vertexAttribPointer(p.a, 2, gl.FLOAT, false, 0, 0);
    let unit = 0;
    for (const [name, t] of Object.entries(texs)) {
      gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.uniform1i(p.u[name], unit); unit++;
    }
    for (const [name, v] of Object.entries(uni)) {
      const loc = p.u[name]; if (!loc) continue;
      if (Array.isArray(v)) (v.length === 2 ? gl.uniform2fv : gl.uniform3fv).call(gl, loc, v);
      else gl.uniform1f(loc, v);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  render(srcCanvas, fx) {
    const gl = this.gl;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, srcCanvas);
    const [q0, q1] = this.q;
    const bloom = fx.bloom ?? 0;
    if (bloom > 0) {
      this.pass(this.pBright, q0, { src: this.srcTex }, { thr: fx.thr ?? 0.7 });
      this.pass(this.pBlur, q1, { src: q0.t }, { dir: [2.0 / q0.w, 0] });
      this.pass(this.pBlur, q0, { src: q1.t }, { dir: [0, 2.0 / q0.h] });
      this.pass(this.pBlur, q1, { src: q0.t }, { dir: [3.5 / q0.w, 0] });
      this.pass(this.pBlur, q0, { src: q1.t }, { dir: [0, 3.5 / q0.h] });
    }
    this.pass(this.pFinal, null, { src: this.srcTex, b1: q0.t }, {
      bloom, ca: fx.ca ?? 0.15, grain: fx.grain ?? 0.05, vig: fx.vig ?? 0.18, time: fx.time ?? 0,
      flash: fx.flash ?? 0, flashCol: fx.flashCol || [1, 1, 1], soft: fx.soft ?? 0.35,
      contrast: fx.contrast ?? 1, lift: fx.lift ?? 0.025, res: [this.w, this.h],
    });
  }
}
