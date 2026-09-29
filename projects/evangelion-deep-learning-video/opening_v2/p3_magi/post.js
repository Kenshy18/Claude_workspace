// ─────────────────────────────────────────────────────────────────────────────
//  p3_magi post: 1995 TV-master texture + CRT tube character.
//  scene layer  -> optional barrel curvature (only for full-frame CRT shots), roll bar,
//                  phosphor bloom (threshold: only bright phosphor blooms)
//  overlay layer-> credits / optical titles, composited flat on top (not warped), like the real OP
//  both         -> gate weave (±1 px), mild softness, fine grain, flash
// ─────────────────────────────────────────────────────────────────────────────
class PostFX {
  constructor(canvas, w, h) {
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false });
    if (!gl) throw new Error('WebGL unavailable');
    this.gl = gl; this.w = w; this.h = h;
    const vs = `attribute vec2 p; varying vec2 uv; void main(){ uv = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }`;
    const bright = `precision highp float; varying vec2 uv; uniform sampler2D src; uniform float thr;
      void main(){ vec3 c = texture2D(src, uv).rgb; float l = max(max(c.r,c.g),c.b);
        float k = smoothstep(thr, thr+0.22, l); gl_FragColor = vec4(c*k,1.); }`;
    const blur = `precision highp float; varying vec2 uv; uniform sampler2D src; uniform vec2 dir;
      void main(){ vec3 c = texture2D(src, uv).rgb*0.2270270270;
        c += texture2D(src, uv+dir*1.3846153846).rgb*0.3162162162; c += texture2D(src, uv-dir*1.3846153846).rgb*0.3162162162;
        c += texture2D(src, uv+dir*3.2307692308).rgb*0.0702702703; c += texture2D(src, uv-dir*3.2307692308).rgb*0.0702702703;
        gl_FragColor = vec4(c,1.); }`;
    const final = `precision highp float; varying vec2 uv;
      uniform sampler2D src; uniform sampler2D b1; uniform sampler2D b2; uniform sampler2D ovl;
      uniform float bloom, ca, grain, vig, frame, flash, sat, contrast, curve, roll, rollPos, soft, useOvl, lift;
      uniform vec3 flashCol; uniform vec2 res, weave;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      vec2 warp(vec2 u){ vec2 c = u*2.0-1.0; float r2 = dot(c*vec2(1.0,0.86),c*vec2(1.0,0.86)); c *= (1.0 + curve*r2)/(1.0 + curve*0.55); return c*0.5+0.5; }
      vec3 tap(sampler2D t, vec2 w, vec2 px){
        vec3 c = texture2D(t, w).rgb;
        if (soft > 0.0) c = c*(1.0-soft) + soft*0.25*(texture2D(t,w+vec2(px.x,0.)).rgb + texture2D(t,w-vec2(px.x,0.)).rgb + texture2D(t,w+vec2(0.,px.y)).rgb + texture2D(t,w-vec2(0.,px.y)).rgb);
        return c; }
      void main(){
        vec2 px = 1.0/res;
        vec2 u = uv + weave*px;
        vec2 w = u; float inside = 1.0;
        if (curve > 0.0) { w = warp(u);
          vec2 e = smoothstep(vec2(0.0), vec2(0.007), w) * smoothstep(vec2(0.0), vec2(0.007), 1.0-w); inside = e.x*e.y; }
        vec3 c = tap(src, w, px);
        if (ca > 0.0) { vec2 d = w-0.5; vec2 off = d*ca*0.006; c.r = texture2D(src, w+off).r*0.5 + c.r*0.5; c.b = texture2D(src, w-off).b*0.5 + c.b*0.5; }
        vec3 bl = texture2D(b1, w).rgb*0.9 + texture2D(b2, w).rgb*1.1;
        c += bl*bloom;
        if (roll > 0.0) { float d = fract(w.y - rollPos + 2.0); float band = smoothstep(0.0, 0.05, d) * (1.0 - smoothstep(0.05, 0.16, d));
          c *= 1.0 + roll*0.22*band; c += roll*0.025*band; }
        c *= inside;
        if (useOvl > 0.5) { vec4 o = texture2D(ovl, u); if (soft > 0.0) { o = o*(1.0-soft*0.8) + soft*0.2*(texture2D(ovl,u+vec2(px.x,0.)) + texture2D(ovl,u-vec2(px.x,0.)) + texture2D(ovl,u+vec2(0.,px.y)) + texture2D(ovl,u-vec2(0.,px.y))); }
          c = mix(c, o.rgb/max(o.a,0.001), clamp(o.a,0.0,1.0)); }
        float l = dot(c, vec3(0.299,0.587,0.114));
        c = mix(vec3(l), c, sat);
        c = (c - 0.5) * contrast + 0.5;
        c = c*(1.0-lift) + lift*0.06;
        vec2 dv = uv-0.5; c *= mix(1.0, smoothstep(0.98, 0.2, dot(dv,dv)*1.8), vig);
        float g = h(floor(uv*res*0.7) + vec2(frame*61.0, frame*17.0)) - 0.5;
        float g2 = h(floor(uv*res*0.35) + vec2(frame*13.0, frame*7.0)) - 0.5;
        c += (g*0.7 + g2*0.5) * grain;
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
    this.ovlTex = this.tex(w, h);
    this.half = [this.fbo(w / 2, h / 2), this.fbo(w / 2, h / 2)];
    this.quarter = [this.fbo(w / 4, h / 4), this.fbo(w / 4, h / 4)];
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
  render(srcCanvas, ovlCanvas, fx) {
    const gl = this.gl;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, srcCanvas);
    if (fx.useOvl) { gl.bindTexture(gl.TEXTURE_2D, this.ovlTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ovlCanvas); }
    const [h0, h1] = this.half, [q0, q1] = this.quarter;
    const doBloom = (fx.bloom ?? 0) > 0.001;
    if (doBloom) {
      this.pass(this.pBright, h0, { src: this.srcTex }, { thr: fx.thr ?? 0.62 });
      this.pass(this.pBlur, h1, { src: h0.t }, { dir: [1.6 / h0.w, 0] });
      this.pass(this.pBlur, h0, { src: h1.t }, { dir: [0, 1.6 / h0.h] });
      this.pass(this.pBlur, q0, { src: h0.t }, { dir: [2.4 / q0.w, 0] });
      this.pass(this.pBlur, q1, { src: q0.t }, { dir: [0, 2.4 / q0.h] });
      this.pass(this.pBlur, q0, { src: q1.t }, { dir: [3.4 / q0.w, 0] });
      this.pass(this.pBlur, q1, { src: q0.t }, { dir: [0, 3.4 / q0.h] });
    }
    this.pass(this.pFinal, null, { src: this.srcTex, b1: h0.t, b2: q1.t, ovl: this.ovlTex }, {
      bloom: doBloom ? fx.bloom : 0, ca: fx.ca ?? 0.12, grain: fx.grain ?? 0.035, vig: fx.vig ?? 0.25,
      frame: fx.frame ?? 0, flash: fx.flash ?? 0, flashCol: fx.flashCol || [1, 1, 1], sat: fx.sat ?? 1, contrast: fx.contrast ?? 1,
      curve: fx.curve ?? 0, roll: fx.roll ?? 0, rollPos: fx.rollPos ?? 0, soft: fx.soft ?? 0.35, useOvl: fx.useOvl ? 1 : 0,
      lift: fx.lift ?? 0.0, res: [this.w, this.h], weave: fx.weave || [0, 0],
    });
  }
}
