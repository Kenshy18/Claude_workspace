// Film finish for p4_rebuild (adapted from src/fx.js): gate weave (±1 px), mild softness, grain,
// light vignette, flash. Bloom passes run ONLY when fx.bloom > 0 (flares, cross explosions, wings).
export class PostFX {
  constructor(canvas, w, h) {
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false });
    this.gl = gl; this.w = w; this.h = h;
    const vs = `attribute vec2 p; varying vec2 uv; void main(){ uv = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }`;
    const bright = `precision highp float; varying vec2 uv; uniform sampler2D src; uniform float thr;
      void main(){ vec3 c = texture2D(src, uv).rgb; float l = max(max(c.r,c.g),c.b); gl_FragColor = vec4(c*smoothstep(thr, thr+0.2, l),1.); }`;
    const blur = `precision highp float; varying vec2 uv; uniform sampler2D src; uniform vec2 dir;
      void main(){ vec3 c = texture2D(src, uv).rgb*0.2270270270;
        c += texture2D(src, uv+dir*1.3846153846).rgb*0.3162162162; c += texture2D(src, uv-dir*1.3846153846).rgb*0.3162162162;
        c += texture2D(src, uv+dir*3.2307692308).rgb*0.0702702703; c += texture2D(src, uv-dir*3.2307692308).rgb*0.0702702703;
        gl_FragColor = vec4(c,1.); }`;
    const final = `precision highp float; varying vec2 uv;
      uniform sampler2D src; uniform sampler2D b1; uniform sampler2D b2;
      uniform float bloom, grain, vig, time, flash, soft, ca, contrast, sat, lift;
      uniform vec3 flashCol, tint; uniform vec2 res, weave;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      void main(){
        vec2 u = uv + weave / res;
        vec2 px = 1.0 / res;
        vec2 d = u - 0.5; vec2 off = d * ca * 0.004;
        vec3 c = vec3(texture2D(src, u + off).r, texture2D(src, u).g, texture2D(src, u - off).b);
        vec3 nb = texture2D(src, u + vec2(px.x, 0.0)).rgb + texture2D(src, u - vec2(px.x, 0.0)).rgb
                + texture2D(src, u + vec2(0.0, px.y)).rgb + texture2D(src, u - vec2(0.0, px.y)).rgb;
        c = mix(c, nb * 0.25, soft);
        if (bloom > 0.0) c += (texture2D(b1, u).rgb * 0.9 + texture2D(b2, u).rgb * 1.2) * bloom;
        float l = dot(c, vec3(0.299,0.587,0.114)); c = mix(vec3(l), c, sat);
        c = (c - 0.5) * contrast + 0.5 + lift; c *= tint;
        float r2 = dot(d, d); c *= mix(1.0, smoothstep(0.95, 0.2, r2 * 1.7), vig);
        float gt = floor(time * 24.0); float g = h(floor(uv * res * 0.5) + vec2(gt * 61.0, gt * 17.0)) - 0.5;
        c += g * grain;
        c = mix(c, flashCol, clamp(flash, 0.0, 1.0));
        gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
      }`;
    this.pBright = this.prog(vs, bright); this.pBlur = this.prog(vs, blur); this.pFinal = this.prog(vs, final);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.srcTex = this.tex(w, h);
    this.half = [this.fbo(w / 2, h / 2), this.fbo(w / 2, h / 2)];
    this.quarter = [this.fbo(w / 4, h / 4), this.fbo(w / 4, h / 4)];
  }
  prog(vsSrc, fsSrc) {
    const gl = this.gl;
    const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vsSrc)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fsSrc)); gl.linkProgram(p);
    p.u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); p.u[info.name] = gl.getUniformLocation(p, info.name); }
    p.a = gl.getAttribLocation(p, 'p'); return p;
  }
  tex(w, h) {
    const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    return t;
  }
  fbo(w, h) { const gl = this.gl, t = this.tex(w, h), f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null); return { f, t, w, h }; }
  pass(p, target, texs, uni) {
    const gl = this.gl; gl.useProgram(p); gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.f : null);
    gl.viewport(0, 0, target ? target.w : this.w, target ? target.h : this.h);
    gl.enableVertexAttribArray(p.a); gl.vertexAttribPointer(p.a, 2, gl.FLOAT, false, 0, 0);
    let unit = 0; for (const [name, t] of Object.entries(texs)) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(p.u[name], unit); unit++; }
    for (const [name, v] of Object.entries(uni)) { const loc = p.u[name]; if (!loc) continue; if (Array.isArray(v)) (v.length === 2 ? gl.uniform2fv : gl.uniform3fv).call(gl, loc, v); else gl.uniform1f(loc, v); }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  render(srcCanvas, fx) {
    const gl = this.gl;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, this.srcTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, srcCanvas);
    const [h0, h1] = this.half, [q0, q1] = this.quarter;
    if (fx.bloom > 0) {
      this.pass(this.pBright, h0, { src: this.srcTex }, { thr: fx.thr ?? 0.8 });
      this.pass(this.pBlur, h1, { src: h0.t }, { dir: [2.0 / h0.w, 0] });
      this.pass(this.pBlur, h0, { src: h1.t }, { dir: [0, 2.0 / h0.h] });
      this.pass(this.pBlur, q0, { src: h0.t }, { dir: [2.6 / q0.w, 0] });
      this.pass(this.pBlur, q1, { src: q0.t }, { dir: [0, 2.6 / q0.h] });
      this.pass(this.pBlur, q0, { src: q1.t }, { dir: [4.0 / q0.w, 0] });
      this.pass(this.pBlur, q1, { src: q0.t }, { dir: [0, 4.0 / q0.h] });
    }
    this.pass(this.pFinal, null, { src: this.srcTex, b1: h0.t, b2: q1.t }, {
      bloom: fx.bloom || 0, grain: fx.grain ?? 0.05, vig: fx.vig ?? 0.3, time: fx.time || 0, flash: fx.flash || 0,
      soft: fx.soft ?? 0.22, ca: fx.ca ?? 0.15, contrast: fx.contrast ?? 1, sat: fx.sat ?? 1, lift: fx.lift ?? 0,
      flashCol: fx.flashCol || [1, 1, 1], tint: fx.tint || [1, 1, 1], res: [this.w, this.h], weave: fx.weave || [0, 0],
    });
  }
}
