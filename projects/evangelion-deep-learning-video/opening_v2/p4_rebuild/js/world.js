// ─────────────────────────────────────────────────────────────────────────────
//  p4_rebuild — three.js world: Tokyo-3 as a GPU city on the Himmelblau loss landscape.
//  Cel shading = 2–3 hard bands; ink = analytic edge distances per face (no hull overdraw).
//  All geometry is merged & static; animation is uniforms only → every frame is f(t).
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from '../node_modules/three/build/three.module.js';
import * as M from './mathml.js';

THREE.ColorManagement.enabled = false;   // author and display cel colours exactly as the hex values (no sRGB→linear conversion)
export const W = 1920, H = 1080;
export const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
export const RS = 0.75;                 // 3D layer renders at 1440×810 and is upscaled (perf on SwiftShader; ink stays crisp enough)
renderer.setSize(Math.round(W * RS), Math.round(H * RS), false);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // we author colours directly in display space
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(35, W / H, 2, 9000);

const col = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const nrm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const PX1 = new Uint8Array(4);
export const syncGL = (gl) => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, PX1);
const hash = (n) => { n = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b); n ^= n >>> 13; n = Math.imul(n, 0xc2b2ae35); n ^= n >>> 16; return (n >>> 0) / 4294967296; };

// ── face builder: per-vertex affine edge distances → exact ink lines of constant pixel width ─────
class Builder {
  constructor() { this.P = []; this.N = []; this.E = []; this.C = []; this.A = []; this.I = []; this.n = 0; }
  // pts: 3–4 coplanar points, CCW seen from outside. mask bit k draws edge pts[k]→pts[k+1].
  face(pts, c, aux = [0, 0, 0, 0], mask = 15) {
    const n = pts.length, nn = nrm(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])));
    const ed = [];
    for (let k = 0; k < 4; k++) {
      if (k < n && (mask >> k) & 1) { const a = pts[k], b = pts[(k + 1) % n], inw = cross(nn, nrm(sub(b, a))); ed.push((p) => dot(sub(p, a), inw)); }
      else ed.push(() => 1e4);
    }
    const base = this.n;
    for (const p of pts) { this.P.push(p[0], p[1], p[2]); this.N.push(nn[0], nn[1], nn[2]); this.E.push(ed[0](p), ed[1](p), ed[2](p), ed[3](p)); this.C.push(c[0], c[1], c[2]); this.A.push(aux[0], aux[1], aux[2], aux[3]); this.n++; }
    for (let k = 1; k < n - 1; k++) this.I.push(base, base + k, base + k + 1);
  }
  // axis-aligned box (optionally rotated about Y by ry, and transformed by a matrix m)
  box(c, s, colors, aux = [0, 0, 0, 0], o = {}) {
    const [x, y, z] = c, [a, b, d] = [s[0] / 2, s[1] / 2, s[2] / 2];
    let V = [[-a, -b, d], [a, -b, d], [a, b, d], [-a, b, d], [-a, -b, -d], [a, -b, -d], [a, b, -d], [-a, b, -d]];
    const m = o.m || new THREE.Matrix4().makeRotationY(o.ry || 0);
    V = V.map((p) => { const q = new THREE.Vector3(p[0], p[1], p[2]).applyMatrix4(m); return [q.x + x, q.y + y, q.z + z]; });
    const cs = Array.isArray(colors[0]) ? colors : [colors, colors, colors, colors, colors, colors];
    const pat = o.pat || [0, 0, 0, 0, 0, 0];
    const F = [[0, 1, 2, 3], [5, 4, 7, 6], [1, 5, 6, 2], [4, 0, 3, 7], [3, 2, 6, 7], [4, 5, 1, 0]]; // +z −z +x −x +y −y
    for (let i = 0; i < 6; i++) { if (o.skip && o.skip[i]) continue; this.face(F[i].map((k) => V[k]), cs[i], [aux[0], aux[1], pat[i], aux[3]]); }
  }
  // generic prism between two polygons (bottom ring, top ring, CCW from above)
  prism(bot, top, c, aux = [0, 0, 0, 0], caps = true) {
    const n = bot.length;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; this.face([bot[i], bot[j], top[j], top[i]], c, aux); }
    if (caps) { this.face(top.slice(), c, aux, 15); this.face(bot.slice().reverse(), c, aux, 15); }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3));
    g.setAttribute('edge', new THREE.Float32BufferAttribute(this.E, 4));
    g.setAttribute('col', new THREE.Float32BufferAttribute(this.C, 3));
    g.setAttribute('aux', new THREE.Float32BufferAttribute(this.A, 4));
    g.setIndex(this.n > 65535 ? new THREE.Uint32BufferAttribute(this.I, 1) : new THREE.Uint16BufferAttribute(this.I, 1));
    g.computeBoundingSphere();
    return g;
  }
}

// ── shared uniforms (the "mood": light, shadow tint, ink, fog) ────────────────────────────────
export const U = {
  uL: { value: new THREE.Vector3(0.45, 0.75, 0.35).normalize() },
  uShadow: { value: new THREE.Vector3(0.62, 0.66, 0.82) },
  uHi: { value: new THREE.Vector3(1.1, 1.08, 1.04) },
  uInk: { value: new THREE.Vector3(0.1, 0.09, 0.12) },
  uInkW: { value: 1.25 },
  uInkFar: { value: 1400 },
  uFog: { value: new THREE.Vector3(0.7, 0.8, 0.92) },
  uFogR: { value: new THREE.Vector2(600, 2600) },
  uFogA: { value: 1 },
  uMode: { value: 0 },          // 0 cel, 1 sketch (paper + graphite), 2 silhouette (flat ink), 3 x-ray (dark + lit edges)
  uSil: { value: new THREE.Vector3(0.05, 0.03, 0.05) },
  uTime: { value: 0 },
  uRiseT: { value: 100 },
  uLed: { value: 0.35 },        // LED emission strength (0 day … 1 Geofront)
  uLedCol: { value: new THREE.Vector3(1.0, 0.55, 0.15) },
  uChunks: { value: new Float32Array(64) },
  uRingOn: { value: 0 },
  uCam: { value: new THREE.Vector3() },
  uWarm: { value: new THREE.Vector3(1, 1, 1) },   // global tint multiply (sunset etc.)
  uSwap: { value: 0 },          // Unit palette: 0 = Unit-01 purple/green, 1 = prototype 00 (orange/white), 2 = production 02 (red/orange)
  uShadowMap: { value: null }, uShadowMat: { value: new THREE.Matrix4() }, uShadowOn: { value: 0 },
};

const INK_VS = /* glsl */`
attribute vec4 edge; attribute vec3 col; attribute vec4 aux;
uniform float uRiseT; uniform float uSpread;
varying vec4 vE; varying vec3 vC; varying vec3 vN; varying vec4 vA; varying vec3 vW; varying float vDepth; varying float vRise;
void main(){
  vec3 p = position; vRise = 1.0;
  if (aux.y > 0.0) { float k = smoothstep(aux.x, aux.x + 2.4, uRiseT); p.y -= aux.y * (1.0 - k); vRise = k; }
#ifdef SPREAD
  p.y += aux.w * uSpread;
#endif
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vW = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); vE = edge; vC = col; vA = aux;
  vec4 mv = viewMatrix * wp; vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const INK_FS = /* glsl */`
uniform vec3 uL, uShadow, uHi, uInk, uFog, uSil, uLedCol, uWarm, uCam;
uniform float uInkW, uInkFar, uMode, uTime, uLed, uRingOn, uFogA, uSwap;
uniform vec2 uFogR; uniform float uChunks[64];
uniform float uEmis; uniform vec3 uEmisCol;
varying vec4 vE; varying vec3 vC; varying vec3 vN; varying vec4 vA; varying vec3 vW; varying float vDepth; varying float vRise;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
uniform sampler2D uShadowMap; uniform mat4 uShadowMat; uniform float uShadowOn;
float shadowAt(vec3 w){ if (uShadowOn < 0.5) return 0.0; vec4 s = uShadowMat * vec4(w, 1.0); vec3 q = s.xyz / s.w * 0.5 + 0.5;
  if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0 || q.z > 1.0) return 0.0; float d = texture2D(uShadowMap, q.xy).r; return step(d + 0.0012, q.z); }

void main(){
  vec3 N = normalize(vN);
  float ndl = dot(N, uL);
  if (ndl > 0.08 && shadowAt(vW + N * 0.4) > 0.5) ndl = -1.0;
  vec3 base = vC;
  if (uSwap > 0.5) {                        // palette swap (only the Unit's purple armour + green trim)
    float purple = step(vC.g + 0.03, vC.r) * step(vC.r + 0.1, vC.b);
    float green = step(vC.r + 0.2, vC.g) * step(vC.b + 0.2, vC.g);
    vec3 pA = uSwap < 1.5 ? vec3(0.93, 0.62, 0.16) : vec3(0.78, 0.1, 0.08);
    vec3 gA = uSwap < 1.5 ? vec3(0.95, 0.94, 0.9) : vec3(0.98, 0.55, 0.12);
    base = mix(base, pA * (0.55 + 0.45 * vC.b / 0.76), purple);
    base = mix(base, gA, green);
  }
  // face-local coords (rect faces built bottom,right,top,left): u from left edge, v from bottom
  float u = vE.w, v = vE.x, FW = vE.y + vE.w, FH = vE.x + vE.z;
  float pat = vA.z; float seed = vA.w;
  float emis = 0.0; vec3 ecol = uLedCol;
  float lineK = 0.0; // pattern ink
  if (pat > 0.5 && pat < 1.5) {            // server-rack bay recessed into the armour face: 1U slots + status LEDs
    float bx0 = FW * 0.2, bx1 = FW * 0.8;
    float inset = step(bx0, u) * step(u, bx1) * step(2.0, v) * step(2.6, FH - v);
    float px = 1.35 / max(fwidth(v), 1e-4);
    float edgeK = smoothstep(2.0, 4.0, px);
    base = mix(base, vec3(0.16, 0.17, 0.2), inset);
    float U1 = 1.35; float row = floor(v / U1); float fr = fract(v / U1);
    float slot = inset * (1.0 - smoothstep(0.0, 0.16, fr)) * smoothstep(3.0, 7.0, px);
    base = mix(base, vec3(0.3, 0.31, 0.35), slot);
    float lx = bx1 - (bx1 - bx0) * 0.18;
    float led = inset * step(lx - 0.5, u) * step(u, lx) * step(0.35, fr) * step(fr, 0.7);
    float on = step(0.45, h21(vec2(row + seed * 13.0, floor(uTime * 3.0 + seed * 7.0 + row * 0.37))));
    emis = led * on * smoothstep(2.5, 5.0, px);
    ecol = mix(uLedCol, vec3(0.45, 1.0, 0.55), step(0.7, h21(vec2(row, seed))));
    float bd = min(abs(u - bx0), abs(u - bx1)) / max(fwidth(u), 1e-4);
    lineK = max(lineK, (1.0 - smoothstep(0.6, 1.4, bd)) * step(2.0, v) * step(2.6, FH - v) * edgeK * 0.9);
  } else if (pat > 1.5 && pat < 2.5) {     // armour panel: floor bands + vertical rib
    float bandH = 5.2; float px = bandH / max(fwidth(v), 1e-4);
    float band = 1.0 - smoothstep(0.0, 0.06, fract(v / bandH));
    lineK = band * smoothstep(3.0, 8.0, px) * 0.55;
    float rib = step(abs(u - FW * 0.5), 0.35) * smoothstep(3.0, 8.0, px);
    base = mix(base, base * 0.8, rib);
  } else if (pat > 2.5 && pat < 3.5) {     // all-reduce rank tower: 8 chunk cells near the top
    float cellH = 2.4; float top0 = FH - 3.0 - 8.0 * cellH;
    float inCol = step(1.2, u) * step(u, FW - 1.2);
    base = mix(base, base * 0.3, inCol * step(top0, v) * step(v, FH - 3.0));
    float ci = floor((v - top0) / cellH);
    if (inCol > 0.5 && ci >= 0.0 && ci < 8.0) {
      float fr = fract((v - top0) / cellH);
      int idx = int(seed) * 8 + int(ci);
      float fill = uChunks[idx];
      float cell = step(0.18, fr) * step(fr, 0.82);
      vec3 cc = mix(vec3(1.0, 0.45, 0.08), vec3(1.0, 0.97, 0.85), step(0.999, fill));
      emis = max(emis, cell * uRingOn * smoothstep(0.05, 0.2, fill) * (0.35 + 0.65 * fill));
      ecol = cc;
    }
  } else if (pat > 3.5 && pat < 4.5) {     // heatsink fins (vertical)
    float px = 0.9 / max(fwidth(u), 1e-4);
    float fin = step(0.55, fract(u / 0.9)) * smoothstep(2.0, 5.0, px);
    base = mix(base, base * 0.55, fin);
  } else if (pat > 4.5 && pat < 5.5) {     // emissive panel (eyes, core, pyramid seams)
    emis = 1.0; ecol = uEmisCol;
  }
  vec3 c;
  if (ndl > 0.62) c = base * uHi; else if (ndl > 0.08) c = base; else c = base * uShadow;
#ifdef SPREAD
  if (vC.b > 0.5) c = ndl > 0.45 ? vec3(0.66, 0.8, 1.0) : (ndl > -0.15 ? vec3(0.33, 0.55, 0.94) : vec3(0.13, 0.25, 0.58));
#endif
  c *= uWarm;
  c = mix(c, c * 0.45, lineK);
  // ink
  vec4 fw = max(fwidth(vE), vec4(1e-5)); vec4 ed = vE / fw;
  float e = min(min(ed.x, ed.y), min(ed.z, ed.w));
  float ink = 1.0 - smoothstep(uInkW - 0.55, uInkW + 0.55, e);
  ink *= 1.0 - smoothstep(uInkFar * 0.45, uInkFar, vDepth);
  if (uMode > 0.5 && uMode < 1.5) {        // sketch: paper + graphite
    c = vec3(0.93, 0.91, 0.87) - 0.05 * step(ndl, 0.08); c = mix(c, vec3(0.28, 0.26, 0.27), ink);
  } else if (uMode > 1.5 && uMode < 2.5) { // silhouette: flat ink, only emissive pops
    c = uSil; c = mix(c, ecol * 1.2, emis * uLed);
  } else if (uMode > 2.5) {                // x-ray/engraving: dark body, luminous edges
    c = vec3(0.02, 0.05, 0.12); c = mix(c, vec3(0.55, 0.8, 1.0), ink);
  } else {
    c = mix(c, uInk, ink);
    c = mix(c, ecol, emis * uLed);
    c = mix(c, uEmisCol, uEmis);
  }
  float fg = smoothstep(uFogR.x, uFogR.y, vDepth) * uFogA;
  c = mix(c, uFog, fg);
  gl_FragColor = vec4(c, 1.0);
}`;
function inkMat(extra = {}, defines = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { ...U, uSpread: { value: 0 }, uEmis: { value: 0 }, uEmisCol: { value: new THREE.Vector3(1, 0.2, 0.1) }, ...extra },
    vertexShader: INK_VS, fragmentShader: INK_FS, defines, side: THREE.FrontSide,
  });
}

// ── TERRAIN ───────────────────────────────────────────────────────────────────────────────
const TER_VS = /* glsl */`
attribute float lfv; attribute float urb; attribute float pn;
varying float vLf; varying float vUrb; varying float vPn; varying vec3 vN; varying vec3 vW; varying float vDepth;
void main(){ vLf = lfv; vUrb = urb; vPn = pn; vN = normal; vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xyz;
  vec4 mv = viewMatrix * wp; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`;
const TER_FS = /* glsl */`
uniform vec3 uL, uFog, uInk, uCam, uWarm;
uniform vec3 tLand, tLandSh, tLandHi, tLine, tUrb, tWater, tShore;
uniform vec2 uFogR; uniform float uFogA; uniform float tStep, tLineA, tRimA, tWaterLv, uMode, tUrbA;
uniform vec3 uSil; uniform vec2 tCity;
varying float vLf; varying float vUrb; varying vec3 vN; varying vec3 vW; varying float vDepth; varying float vPn;
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  float a = fract(sin(dot(i, vec2(127.1,311.7)))*43758.5453), b = fract(sin(dot(i+vec2(1,0), vec2(127.1,311.7)))*43758.5453);
  float c = fract(sin(dot(i+vec2(0,1), vec2(127.1,311.7)))*43758.5453), d = fract(sin(dot(i+vec2(1,1), vec2(127.1,311.7)))*43758.5453);
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }
uniform float tPatch;
uniform sampler2D uShadowMap; uniform mat4 uShadowMat; uniform float uShadowOn;
float shadowAt(vec3 w){ if (uShadowOn < 0.5) return 0.0; vec4 s = uShadowMat * vec4(w, 1.0); vec3 q = s.xyz / s.w * 0.5 + 0.5;
  if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0 || q.z > 1.0) return 0.0; float d = texture2D(uShadowMap, q.xy).r; return step(d + 0.0012, q.z); }
void main(){
  vec3 N = normalize(vN); float ndl = dot(N, uL);
  if (ndl > 0.34 && shadowAt(vW + N * 0.6) > 0.5) ndl = 0.0;
  float n = vPn;                                                 // value noise baked per vertex (was per pixel)
  float patchK = step(0.56, n) * tPatch;                       // painted forest clumps (two flat greens)
  float hk = smoothstep(95.0, 190.0, vW.y);                    // higher ground: cooler, darker
  vec3 lit = mix(tLand, tLand * vec3(0.86, 0.92, 0.9), patchK), hi = mix(tLandHi, tLandHi * vec3(0.9, 0.95, 0.92), patchK), sh = mix(tLandSh, tLandSh * vec3(0.9, 0.95, 1.0), patchK);
  lit = mix(lit, lit * vec3(0.85, 0.9, 1.02), hk); hi = mix(hi, hi * vec3(0.88, 0.92, 1.0), hk);
  vec3 c = ndl > 0.8 ? hi : (ndl > 0.34 ? lit : sh);
  c = mix(c, tUrb * (ndl > 0.36 ? 1.0 : 0.8), step(0.5, vUrb) * tUrbA);
  float q = vLf / tStep; float fw = max(fwidth(q), 1e-4);
  float d = abs(fract(q + 0.5) - 0.5) / fw;
  float line = 1.0 - smoothstep(0.55, 1.5, d);
  float major = step(abs(mod(floor(q + 0.5), 4.0)), 0.5);
  c = mix(c, tLine, line * tLineA * (0.55 + 0.45 * major) * (1.0 - vUrb * 0.7));
  // lakes in the three other basins of attraction (minima as water)
  float far = step(160.0, length(vW.xz - tCity));
  float wet = step(vLf, tWaterLv) * far;
  float shore = step(vLf, tWaterLv * 1.35) * far * (1.0 - wet);
  c = mix(c, tShore, shore); c = mix(c, tWater, wet);
  c *= uWarm;
  vec3 V = normalize(uCam - vW); float rim = dot(N, V);
  c = mix(c, uInk, (1.0 - smoothstep(0.05, 0.13, rim)) * tRimA);
  if (uMode > 1.5 && uMode < 2.5) c = uSil;
  if (uMode > 2.5) { c = vec3(0.015, 0.035, 0.09); c = mix(c, vec3(0.45, 0.7, 1.0), line * (0.4 + 0.6 * major)); }
  float fg = smoothstep(uFogR.x, uFogR.y, vDepth) * uFogA;
  gl_FragColor = vec4(mix(c, uFog, fg), 1.0);
}`;
export const TU = {
  tLand: { value: new THREE.Vector3() }, tLandSh: { value: new THREE.Vector3() }, tLandHi: { value: new THREE.Vector3() },
  tLine: { value: new THREE.Vector3() }, tUrb: { value: new THREE.Vector3() }, tWater: { value: new THREE.Vector3() }, tShore: { value: new THREE.Vector3() },
  tStep: { value: 0.25 }, tLineA: { value: 0.35 }, tRimA: { value: 0 }, tWaterLv: { value: 0.7 }, tUrbA: { value: 1 },
  tCity: { value: new THREE.Vector2(M.S * 3, -M.S * 2) }, tPatch: { value: 1 },
};
function buildTerrain() {
  const seg = 210, half = 760;
  const g = new THREE.PlaneGeometry(2 * half, 2 * half, seg, seg); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, lfa = new Float32Array(p.count), urb = new Float32Array(p.count), pn = new Float32Array(p.count);
  const h2 = (x, y) => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v); };
  const vn = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y); let fx = x - ix, fy = y - iy; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const a = h2(ix, iy), b = h2(ix + 1, iy), c = h2(ix, iy + 1), d = h2(ix + 1, iy + 1); return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy; };
  for (let i = 0; i < p.count; i++) {
    const [u, v] = M.fromWorld(p.getX(i), p.getZ(i)); lfa[i] = M.lf(u, v); p.setY(i, M.hgt(u, v));
    const x = p.getX(i), z = p.getZ(i); pn[i] = vn(x * 0.018, z * 0.018) * 0.6 + vn(x * 0.061 + 7, z * 0.061 + 7) * 0.4;
  }
  g.setAttribute('lfv', new THREE.BufferAttribute(lfa, 1));
  g.setAttribute('urb', new THREE.BufferAttribute(urb, 1));
  g.setAttribute('pn', new THREE.BufferAttribute(pn, 1));
  g.computeVertexNormals();
  const m = new THREE.ShaderMaterial({ uniforms: { ...U, ...TU }, vertexShader: TER_VS, fragmentShader: TER_FS });
  const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 10;
  return mesh;
}

// ── CITY: lots in the basin of attraction of the (3,2) minimum ─────────────────────────────
function basinOf(u, v) { // normalised gradient flow → which minimum
  for (let k = 0; k < 400; k++) { const [gu, gv] = M.grad(u, v), n = Math.hypot(gu, gv); if (n < 1e-3) break; const s = Math.min(0.02, 0.004 * n); u -= (gu / n) * s; v -= (gv / n) * s; }
  let best = 0, bd = 1e9; M.MINIMA.forEach((m, i) => { const d = Math.hypot(m.u - u, m.v - v); if (d < bd) { bd = d; best = i; } }); return M.MINIMA[best];
}
export const CITYDATA = { lots: [], ring: [], tokens: [] };
export const UNIT_SPOT = [M.S * 3 + 70, -M.S * 2 + 84];   // avenue crossing where Unit-01 stands in the chorus (kept clear of lots)
const PAL = {
  armour: ['#e3e6ea', '#cfd6de', '#d9d3c8', '#bfc8d2', '#e8e4dc'].map(col),
  rack: ['#3a404a', '#343a44', '#2f3540'].map(col),
  roof: col('#f0f0ee'), ring: col('#e9e2d4'), ringFace: col('#2a2e36'),
};
function buildCity() {
  const b = new Builder(), cx = M.S * 3, cz = -M.S * 2;
  const SP = 14; let id = 0;
  const minH = (x, z, w, d) => { let m = 1e9; for (const [ox, oz] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) { const [u, v] = M.fromWorld(x + ox * w / 2, z + oz * d / 2); m = Math.min(m, M.hgt(u, v)); } return m; };
  // ring ranks: 8 towers on a circle (a DGX-style 8-GPU ring)
  const ringR = 78, ringSet = [];
  for (let r = 0; r < M.RING_N; r++) { const a = (r / M.RING_N) * Math.PI * 2 + 0.3; ringSet.push([cx + Math.cos(a) * ringR, cz + Math.sin(a) * ringR * 0.8]); }
  // token row: attention towers along the main NE avenue
  const tokSet = []; for (let i = 0; i < 10; i++) tokSet.push([cx - 96 + i * 21, cz + 46 - i * 5.5]);
  const reserved = [...ringSet, ...tokSet];
  for (let gx = -14; gx <= 14; gx++) for (let gz = -14; gz <= 14; gz++) {
    if (gx % 5 === 0 || gz % 6 === 0) continue;        // avenues
    const r1 = hash(gx * 131 + gz * 977), r2 = hash(gx * 71 + gz * 373 + 5), r3 = hash(gx * 13 + gz * 29 + 11);
    const x = cx + gx * SP + (r1 - 0.5) * 2, z = cz + gz * SP + (r2 - 0.5) * 2;
    const [u, v] = M.fromWorld(x, z); const L = M.lf(u, v);
    if (L > 3.35) continue;
    if (reserved.some(([a, c]) => Math.hypot(a - x, c - z) < 13)) continue;
    if (Math.hypot(UNIT_SPOT[0] - x, UNIT_SPOT[1] - z) < 24) continue;
    const bm = basinOf(u, v); if (bm !== M.CITY) continue;
    const rr = Math.hypot(x - cx, (z - cz) * 1.2) / 190;
    const w = 7 + r1 * 4.2, d = 7 + r2 * 4.2;
    const tall = r3 > 0.35;
    const h = tall ? 22 + Math.max(0, 1 - rr) * 44 * (0.45 + r3) : 6 + r3 * 9;
    const base = minH(x, z, w, d) - 1.5, sink = 3;
    const armour = PAL.armour[Math.floor(r3 * 5) % 5], rack = PAL.rack[Math.floor(r1 * 3) % 3];
    const delay = tall ? 0.15 + rr * 1.8 + r2 * 0.8 : -10;
    const riseH = tall ? h + sink + 2 : 0;
    const ry = 0;
    const pat = tall ? [1, 1, 2, 2, 0, 0] : [2, 2, 2, 2, 0, 0];
    const cs = [armour, armour, armour, armour, PAL.roof, armour];
    b.box([x, base + (h + sink) / 2 - sink, z], [w, h + sink, d], cs, [delay, riseH, 0, id % 97], { pat, ry });
    if (tall && r2 > 0.55) { // setback crown
      const h2 = 3 + r1 * 5; b.box([x, base + h + h2 / 2, z], [w * 0.6, h2, d * 0.6], [armour, armour, armour, armour, PAL.roof, armour], [delay, riseH, 0, id % 97], { pat: [2, 2, 2, 2, 0, 0] });
    }
    CITYDATA.lots.push({ x, z, w, d, h, base, tall }); id++;
  }
  // ring rank towers (taller, cream armour, chunk displays on the city-facing side)
  ringSet.forEach(([x, z], r) => {
    const w = 11, d = 11, h = 84, base = minH(x, z, w, d) - 1.5;
    const ry = -Math.atan2(z - cz, x - cx) + Math.PI / 2;
    b.box([x, base + h / 2 - 1.5, z], [w, h + 3, d], [PAL.ringFace, PAL.ringFace, PAL.ring, PAL.ring, PAL.roof, PAL.ring], [1.2 + r * 0.12, h + 6, 0, r], { pat: [3, 1, 2, 2, 0, 0], ry });
    b.box([x, base + h + 2.8, z], [4.5, 5.6, 4.5], PAL.roof, [1.2 + r * 0.12, h + 6, 0, r], { ry });
    CITYDATA.ring.push({ x, z, top: base + h + 5.6, base, ry });
  });
  tokSet.forEach(([x, z], i) => {
    const w = 9, d = 9, h = 52 + 12 * Math.sin(i * 1.7), base = minH(x, z, w, d) - 1.5;
    b.box([x, base + h / 2 - 1.5, z], [w, h + 3, d], [PAL.armour[1], PAL.armour[1], PAL.armour[1], PAL.armour[1], PAL.roof, PAL.armour[1]], [0.6 + i * 0.1, h + 6, 0, 40 + i], { pat: [1, 1, 2, 2, 0, 0] });
    CITYDATA.tokens.push({ x, z, top: base + h + 1.5, base });
  });
  const mesh = new THREE.Mesh(b.geometry(), inkMat()); mesh.renderOrder = 1;
  return mesh;
}

// ── OCTAHEDRON: the L1 ball ‖w‖₁ ≤ R, sliced into layers, red core, halo ────────────────────
export const OCTA = { R: 44, pos: new THREE.Vector3(250, 245, -150) };
function buildOcta() {
  const g = new THREE.Group(); const R = OCTA.R;
  const b = new Builder();
  const cuts = [-R, -0.64 * R, -0.3 * R, 0.02 * R, 0.34 * R, 0.66 * R, R];
  const gap = 1.1;
  const blue = col('#5b93f0'), inner = col('#0e1838');
  const ring = (y) => { const s = Math.max(0, R - Math.abs(y)); return [[s, y, 0], [0, y, -s], [-s, y, 0], [0, y, s]]; }; // CCW from above
  for (let k = 0; k < cuts.length - 1; k++) {
    let y0 = cuts[k] + (k > 0 ? gap / 2 : 0), y1 = cuts[k + 1] - (k < cuts.length - 2 ? gap / 2 : 0);
    const idx = k - (cuts.length - 2) / 2; // signed slab index for spreading
    const parts = (y0 < 0 && y1 > 0) ? [[y0, 0], [0, y1]] : [[y0, y1]];
    for (const [a, c] of parts) {
      const A = ring(a), C = ring(c);
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        const q = [A[i], A[j], C[j], C[i]];
        const degenerateTop = Math.abs(Math.abs(c) - R) < 1e-6, degenerateBot = Math.abs(Math.abs(a) - R) < 1e-6;
        if (degenerateTop) b.face([A[i], A[j], C[i]], blue, [0, 0, 0, idx], 7);
        else if (degenerateBot) b.face([A[i], A[j], C[j]], blue, [0, 0, 0, idx], 7);
        else b.face(q, blue, [0, 0, 0, idx], (a === 0 || c === 0) ? 10 : 15); // don't ink the equator seam
      }
    }
    if (k < cuts.length - 2) b.face(ring(y1), inner, [0, 0, 0, idx]);                  // top cap (inside the gap)
    if (k > 0) b.face(ring(y0).slice().reverse(), inner, [0, 0, 0, idx]);              // bottom cap
  }
  const mat = inkMat({}, { SPREAD: 1 });
  const body = new THREE.Mesh(b.geometry(), mat); g.add(body);
  const core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.2, 24, 16), new THREE.MeshBasicMaterial({ color: 0xff1f2a }));
  g.add(core);
  // halo: thin ring above the apex (flat cel + ink hull)
  const tor = new THREE.TorusGeometry(R * 0.42, 0.9, 6, 64); tor.rotateX(Math.PI / 2);
  const halo = new THREE.Mesh(tor, new THREE.MeshBasicMaterial({ color: 0xf4efe0 })); halo.position.y = R + 12;
  const haloInk = new THREE.Mesh(tor, new THREE.MeshBasicMaterial({ color: 0x14121a, side: THREE.BackSide })); haloInk.scale.set(1.012, 1.9, 1.012); haloInk.position.y = R + 12;
  g.add(halo); g.add(haloInk);
  g.userData = { body, core, halo, haloInk, mat };
  g.position.copy(OCTA.pos);
  return g;
}

// ── UNIT-01: an original purple/green GPU tower-mech (tapered armour, Eva-like proportions) ─────
export const UNIT = {};
function frustum(b, c, wb, db, wt, dt, h, colr, o = {}) {
  // bottom rect (wb×db) at y=-h/2, top rect (wt×dt) at +h/2 (optionally shifted forward by o.shift), rotated by o.m, placed at c
  const sh = o.shift || 0;
  const bot = [[-wb / 2, -h / 2, db / 2], [wb / 2, -h / 2, db / 2], [wb / 2, -h / 2, -db / 2], [-wb / 2, -h / 2, -db / 2]];
  const top = [[-wt / 2, h / 2, dt / 2 + sh], [wt / 2, h / 2, dt / 2 + sh], [wt / 2, h / 2, -dt / 2 + sh], [-wt / 2, h / 2, -dt / 2 + sh]];
  const m = o.m || new THREE.Matrix4();
  const tf = (p) => { const v = new THREE.Vector3(p[0], p[1], p[2]).applyMatrix4(m); return [v.x + c[0], v.y + c[1], v.z + c[2]]; };
  const B = bot.map(tf), T = top.map(tf);
  const pat = o.pat || [0, 0, 0, 0, 0, 0], cs = Array.isArray(colr[0]) ? colr : [colr, colr, colr, colr, colr, colr];
  // faces: front(+z) right(+x) back(-z) left(-x) (CCW from outside), top, bottom
  b.face([B[0], B[1], T[1], T[0]], cs[0], [0, 0, pat[0], 0]);
  b.face([B[1], B[2], T[2], T[1]], cs[2], [0, 0, pat[2], 0]);
  b.face([B[2], B[3], T[3], T[2]], cs[1], [0, 0, pat[1], 0]);
  b.face([B[3], B[0], T[0], T[3]], cs[3], [0, 0, pat[3], 0]);
  b.face([T[0], T[1], T[2], T[3]], cs[4], [0, 0, pat[4], 0]);
  b.face([B[3], B[2], B[1], B[0]], cs[5], [0, 0, pat[5], 0]);
}
function buildUnit() {
  const g = new THREE.Group();
  // Unit-01 palette: violet armour, darker violet under-plates, green trim, orange details
  const P = col('#6a48a6'), Pd = col('#45307a'), Pl = col('#7b58bc'), G = col('#8ee04c'), O = col('#f07a2a'), D = col('#25202e'), Gr = col('#9aa0aa');
  const body = new Builder();
  const rz = (a) => new THREE.Matrix4().makeRotationZ(a), rx = (a) => new THREE.Matrix4().makeRotationX(a);
  const rzx = (az, ax) => new THREE.Matrix4().makeRotationZ(az).multiply(new THREE.Matrix4().makeRotationX(ax));
  for (const s of [-1, 1]) {
    frustum(body, [s * 3.9, 1.4, 1.5], 3.8, 9.6, 3.0, 5.2, 2.8, Pd, { shift: -1.4 });                         // foot (long wedge, toe forward)
    frustum(body, [s * 3.9, 11.9, 0], 3.0, 3.8, 4.4, 5.2, 18.2, P, { pat: [2, 0, 2, 2, 0, 0] });              // shin (flares to the knee)
    frustum(body, [s * 3.9, 13.4, 2.45], 2.0, 0.9, 3.3, 1.2, 13, Pl, { shift: 0.35 });                         // shin armour plate
    frustum(body, [s * (3.9 + 2.05), 12.4, 0.3], 0.35, 1.4, 0.4, 2.4, 12, G);                                  // green stripe (outer)
    frustum(body, [s * 3.9, 22.2, 2.7], 3.8, 2.6, 2.0, 1.4, 4.2, G, { m: rx(-0.3) });                          // pointed knee pad
    frustum(body, [s * 3.75, 28.8, 0], 4.2, 5.0, 5.6, 6.2, 11.8, P, { m: rz(s * 0.04), pat: [2, 0, 0, 0, 0, 0] }); // thigh
    frustum(body, [s * (3.75 + 2.85), 28.8, 0.2], 0.35, 2.0, 0.4, 2.8, 8.5, G, { m: rz(s * 0.04) });
    frustum(body, [s * 5.2, 36.4, 0], 2.6, 5.4, 3.2, 6.0, 3.2, O);                                             // hip joint cap
  }
  frustum(body, [0, 36.4, 0], 9.0, 6.4, 10.4, 7.0, 3.6, D);                                                  // pelvis
  frustum(body, [0, 36.6, 3.4], 2.2, 0.8, 4.4, 0.8, 3.2, Pd);                                                 // groin plate
  frustum(body, [0, 41.0, 0], 5.6, 4.8, 7.0, 5.6, 5.6, Pd, { pat: [1, 1, 0, 0, 0, 0] });                      // waist: 1U rack slots
  frustum(body, [0, 49.0, 0.3], 8.4, 6.0, 15.0, 8.6, 11.4, P, { shift: 0.9 });                                // chest (V)
  frustum(body, [0, 49.3, 4.9], 6.6, 0.6, 9.6, 0.6, 8.4, D, { shift: 0.4 });                                  // fan bay
  for (const s of [-1, 1]) {
    frustum(body, [s * 6.25, 49.2, 4.55], 0.55, 0.6, 0.8, 0.6, 9.6, G, { m: rz(s * -0.3) });                 // chest chevrons
    frustum(body, [s * 5.6, 45.2, 3.4], 1.6, 1.2, 1.2, 1.2, 2.2, O);                                           // orange rib lamps
  }
  frustum(body, [0, 55.8, -0.6], 5.4, 5.4, 3.4, 4.2, 2.8, D);                                                  // collar / neck
  // head: narrow helmet set low and forward, jaw, chin, horn
  const hm = rx(0.1);
  frustum(body, [0, 61.4, 0.9], 3.6, 5.6, 2.9, 6.2, 5.2, P, { shift: 0.9, m: hm });                          // helmet
  frustum(body, [0, 58.7, 2.6], 3.0, 3.2, 3.6, 3.6, 2.0, Pd, { m: hm });                                      // jaw
  frustum(body, [0, 57.5, 3.6], 0.8, 1.0, 2.6, 2.2, 1.4, Pd);                                                  // chin
  frustum(body, [0, 61.75, 4.42], 3.4, 0.24, 3.1, 0.24, 1.3, D, { m: hm });                                     // eye slot
  frustum(body, [0, 58.9, 4.3], 1.6, 0.25, 2.0, 0.25, 0.8, G, { m: hm });                                      // mouth vent (green)
  body.prism([[-0.5, 63.6, 3.3], [0.5, 63.6, 3.3], [0, 63.6, 4.4]], [[-0.08, 70.6, 8.2], [0.08, 70.6, 8.2], [0, 70.6, 8.6]], Pl);  // horn
  frustum(body, [0, 50.5, -5.6], 8, 2.6, 7.4, 2.6, 9, Gr);                                                     // power unit (back)
  frustum(body, [0, 50.5, -7.2], 3, 0.8, 3, 0.8, 3, O);                                                        // 12-pin socket
  g.add(new THREE.Mesh(body.geometry(), inkMat()));
  // eyes (emissive; flash on cue)
  const eb = new Builder();
  eb.box([-0.95, 61.78, 4.62], [1.25, 0.42, 0.1], col('#d8ff6a'), [0, 0, 0, 0], { pat: [5, 5, 5, 5, 5, 5], m: rzx(0.12, 0.1) });
  eb.box([0.95, 61.78, 4.62], [1.25, 0.42, 0.1], col('#d8ff6a'), [0, 0, 0, 0], { pat: [5, 5, 5, 5, 5, 5], m: rzx(-0.12, 0.1) });
  const eyeMat = inkMat({ uEmisCol: { value: new THREE.Vector3(0.85, 1.0, 0.4) } });
  const eyes = new THREE.Mesh(eb.geometry(), eyeMat); g.add(eyes);
  // chest fan (the GPU cooler)
  const fan = new THREE.Group(); fan.position.set(0, 49.4, 5.3);
  fan.add(new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.5, 40).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x17141e })));
  fan.add(new THREE.Mesh(new THREE.TorusGeometry(3.35, 0.26, 6, 48), new THREE.MeshBasicMaterial({ color: 0x8ee04c })));
  const blades = new Builder();
  for (let i = 0; i < 9; i++) { const a0 = (i / 9) * Math.PI * 2, a1 = a0 + 0.45; blades.face([[0, 0, 0.35], [Math.cos(a0) * 2.9, Math.sin(a0) * 2.9, 0.35], [Math.cos(a1) * 2.9, Math.sin(a1) * 2.9, 0.35]], col('#4d4760'), [0, 0, 0, 0], 7); }
  fan.add(new THREE.Mesh(blades.geometry(), inkMat()));
  fan.add(new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.8, 20).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x8ee04c })));
  g.add(fan);
  // shoulders: tall heatsink pylons rising past the head (the Eva silhouette), arms on shoulder + elbow pivots
  const arms = [], elbows = [];
  for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(s * 8.4, 53.2, 0);
    const ab = new Builder();
    frustum(ab, [s * 1.9, 4.6, 0], 5.6, 8.4, 3.6, 5.8, 15.5, P, { m: rz(s * -0.2), pat: [4, 4, 2, 2, 0, 0] });  // heatsink pylon
    frustum(ab, [s * 4.75, 4.2, 0], 0.5, 5.4, 0.5, 3.8, 12.5, G, { m: rz(s * -0.2) });                        // pylon trim
    frustum(ab, [s * 1.2, 12.6, 0], 3.4, 5.4, 2.2, 3.4, 1.4, Pd, { m: rz(s * -0.2) });                        // pylon cap
    frustum(ab, [s * 1.2, -5.4, 0], 3.2, 3.6, 3.8, 4.2, 10.5, P);                                             // upper arm
    const elb = new THREE.Group(); elb.position.set(s * 1.2, -11.2, 0);
    const fb = new Builder();
    frustum(fb, [0, -0.2, 0.2], 2.6, 2.6, 3.0, 3.0, 1.6, O);                                                  // elbow joint
    frustum(fb, [0, -6.6, 0.3], 3.0, 3.6, 4.0, 4.6, 11.2, P);                                                 // forearm
    frustum(fb, [s * 2.0, -6.4, 0.3], 0.35, 1.8, 0.4, 2.6, 8, G);                                             // forearm trim
    frustum(fb, [0, -13.8, 0.5], 2.4, 3.0, 3.2, 3.4, 3.4, Pd);                                                // hand
    for (let k = 0; k < 4; k++) frustum(fb, [s * (-1.05 + k * 0.7), -16.6, 0.9], 0.5, 0.75, 0.55, 0.85, 2.6, Pd);  // fingers
    frustum(fb, [s * -1.7, -14.6, 1.4], 0.6, 0.8, 0.7, 0.9, 2.4, Pd, { m: rz(s * 0.5) });                      // thumb
    elb.add(new THREE.Mesh(fb.geometry(), inkMat()));
    piv.add(new THREE.Mesh(ab.geometry(), inkMat())); piv.add(elb);
    g.add(piv); arms.push(piv); elbows.push(elb);
  }
  Object.assign(UNIT, { group: g, arms, elbows, eyes, eyeMat, fan });
  return g;
}

// ── CAGE: restraint gantry around Unit-01 ────────────────────────────────────────────────
function buildCage() {
  const b = new Builder(); const D = col('#2c2a31'), Y = col('#d9a21b'), Dm = col('#3a3740');
  for (const x of [-16, 16]) for (const z of [-12, 12]) b.box([x, 38, z], [2.4, 80, 2.4], D);
  for (const y of [22, 38, 55]) {                                             // back + side beams only: the front stays open
    b.box([0, y, -12], [34, 1.8, 2.4], D);
    b.box([16, y, 0], [2.4, 1.8, 26], D); b.box([-16, y, 0], [2.4, 1.8, 26], D);
  }
  for (const s of [-1, 1]) { b.box([s * 13.2, 55, 0], [6.2, 2.4, 3.6], D); b.box([s * 12.6, 38, 1], [6.4, 2, 3.2], D); } // restraint arms
  b.box([0, 33.2, 10.5], [34, 1.4, 5], Dm); b.box([0, 34.05, 12.9], [34, 0.3, 0.3], Y);                // umbilical bridge (catwalk) at the knees
  for (const x of [-15, -5, 5, 15]) b.box([x, 35.3, 12.9], [0.3, 2.2, 0.3], Y);
  b.box([0, 77.5, 0], [34, 2.5, 26], D);
  return new THREE.Mesh(b.geometry(), inkMat());
}

// ── GEOFRONT DATACENTER: dome with hanging inverted racks, pyramid, rack aisles ─────────────
export const GEO = { y0: -2200, R: 760 };
function buildGeofront() {
  const g = new THREE.Group(); g.position.y = GEO.y0;
  // dome (inside) with panel seams
  const dome = new THREE.Mesh(new THREE.SphereGeometry(GEO.R, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: { ...U }, side: THREE.BackSide,
    vertexShader: `varying vec3 vP; varying float vDepth; void main(){ vP = position; vec4 mv = modelViewMatrix*vec4(position,1.0); vDepth=-mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uFog, uWarm; uniform vec2 uFogR; uniform float uFogA; varying vec3 vP; varying float vDepth;
      void main(){ vec3 n = normalize(vP); float lat = asin(clamp(n.y,-1.0,1.0)); float lon = atan(n.z, n.x);
        vec2 q = vec2(lon * 24.0 / 3.14159, lat * 18.0 / 1.5708); vec2 fw = max(fwidth(q), vec2(1e-4)); vec2 d = abs(fract(q) - 0.5) / fw;
        float seam = 1.0 - smoothstep(0.0, 1.2, min(d.x, d.y) - (0.5/fw.x) + 0.8);
        vec3 c = mix(vec3(0.16, 0.12, 0.12), vec3(0.28, 0.2, 0.17), smoothstep(0.1, 1.0, n.y));
        float gl = smoothstep(0.93, 0.995, n.y);
        c = mix(c, vec3(1.0, 0.82, 0.55), gl);
        vec2 dd = abs(fract(q) - 0.5); float ln = 1.0 - smoothstep(0.0, 1.5, min((0.5-dd.x)/fw.x, (0.5-dd.y)/fw.y));
        c = mix(c, vec3(0.07, 0.05, 0.06), ln * 0.8 * (1.0 - gl));
        c *= uWarm; gl_FragColor = vec4(mix(c, uFog, smoothstep(uFogR.x, uFogR.y, vDepth) * uFogA), 1.0); }`,
  }));
  g.add(dome);
  const b = new Builder();
  const rack = [col('#2d3139'), col('#343842')], side = col('#6d7480'), roof = col('#8b929c');
  // hanging racks from the dome ceiling (Tokyo-3's inverted underside)
  for (let i = 0; i < 150; i++) {
    const a = hash(i * 7 + 1) * Math.PI * 2, rr = Math.sqrt(hash(i * 13 + 2)) * 330 + 30;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr; const yTop = Math.sqrt(Math.max(0, GEO.R * GEO.R - rr * rr)) + 6;
    const len = 30 + hash(i * 3 + 3) * 90, w = 8 + hash(i * 5) * 8;
    b.box([x, yTop - len / 2, z], [w, len, w], [rack[i % 2], rack[i % 2], side, side, roof, roof], [0, 0, 0, i % 97], { pat: [1, 1, 2, 2, 0, 0] });
  }
  // floor aisles of racks (hot/cold aisle rows) around the pyramid
  for (let rx = -9; rx <= 9; rx++) for (let rz = -9; rz <= 9; rz++) {
    if (Math.abs(rx) < 3 && Math.abs(rz) < 3) continue;
    const x = rx * 34, z = rz * 26; if (Math.hypot(x, z) > 420) continue;
    const h = 11 + hash(rx * 31 + rz * 17) * 4;
    b.box([x, h / 2, z], [26, h, 7], [rack[(rx + rz) & 1], rack[(rx + rz) & 1], side, side, roof, side], [0, 0, 0, (rx * 19 + rz * 7 + 200) % 97], { pat: [1, 1, 2, 2, 0, 0] });
  }
  // pyramid HQ
  const ph = 150, pb = 95, top = [0, ph, 0], c0 = [pb, 0, pb], c1 = [pb, 0, -pb], c2 = [-pb, 0, -pb], c3 = [-pb, 0, pb];
  const pc = col('#3b3440'), pc2 = col('#4a3f4a');
  b.face([c3, c0, top], pc, [0, 0, 0, 0], 7); b.face([c0, c1, top], pc2, [0, 0, 0, 0], 7); b.face([c1, c2, top], pc, [0, 0, 0, 0], 7); b.face([c2, c3, top], pc2, [0, 0, 0, 0], 7);
  // floor
  b.face([[-800, -0.1, 800], [800, -0.1, 800], [800, -0.1, -800], [-800, -0.1, -800]], col('#232427'), [0, 0, 0, 0], 0);
  g.add(new THREE.Mesh(b.geometry(), inkMat()));
  // the shaft from Tokyo-3 down to the Geofront (camera descends through it)
  const sb = new Builder(); const sw = col('#3a3a40'), sl = col('#e0a030');
  for (let k = 0; k < 18; k++) {
    const y = GEO.R + 20 + k * 60;
    const ring = [[-26, y, 26], [26, y, 26], [26, y, -26], [-26, y, -26]], ring2 = ring.map((p) => [p[0], p[1] + 60, p[2]]);
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; sb.face([ring2[i], ring2[j], ring[j], ring[i]].reverse(), sw, [0, 0, 2, 0]); }
    sb.box([0, y + 2, 25.2], [52, 1.4, 0.8], sl); sb.box([0, y + 2, -25.2], [52, 1.4, 0.8], sl);
  }
  g.add(new THREE.Mesh(sb.geometry(), inkMat()));
  return g;
}

// ── LANCE (gradient clipping): long red rod with a twisted fork ───────────────────────────
function buildLance() {
  const b = new Builder(); const R = col('#c8201e'), Rd = col('#8e1414');
  const L = 150, w = 1.1;
  const sq = (y, s, rot = 0) => [0, 1, 2, 3].map((i) => { const a = rot + (i * Math.PI) / 2 + Math.PI / 4; return [Math.cos(a) * s, y, Math.sin(a) * s]; });
  b.prism(sq(-L / 2, w), sq(L / 2 - 30, w), R);
  // fork: two prongs spiralling around each other
  for (const ph of [0, Math.PI]) {
    let prev = null;
    for (let k = 0; k <= 10; k++) {
      const t = k / 10, y = L / 2 - 30 + t * 36, a = ph + t * 2.6, r = 0.9 + t * 3.2;
      const c = [Math.cos(a) * r, y, Math.sin(a) * r];
      const ring = [0, 1, 2, 3].map((i) => { const aa = (i * Math.PI) / 2 + Math.PI / 4; const s = w * (1 - t * 0.75); return [c[0] + Math.cos(aa) * s, y, c[2] + Math.sin(aa) * s]; });
      if (prev) b.prism(prev, ring, k % 2 ? R : Rd, [0, 0, 0, 0], false);
      prev = ring;
    }
  }
  const m = new THREE.Mesh(b.geometry(), inkMat()); m.rotation.z = Math.PI / 2;
  const g = new THREE.Group(); g.add(m); return g;
}

// ── TRAILS: optimizer trajectories as ribbons on the terrain ───────────────────────────────
const TRAIL_VS = `attribute float k; varying float vK; varying float vDepth; void main(){ vK = k; vec4 mv = modelViewMatrix*vec4(position,1.0); vDepth=-mv.z; gl_Position = projectionMatrix*mv; }`;
const TRAIL_FS = `uniform float uHead; uniform vec3 uCol; uniform vec3 uFog; uniform vec2 uFogR; uniform float uFogA; varying float vK; varying float vDepth;
  void main(){ if (vK > uHead) discard; float hot = smoothstep(uHead - 14.0, uHead, vK);
    vec3 c = mix(uCol, vec3(1.0, 0.98, 0.9), hot * 0.8);
    gl_FragColor = vec4(mix(c, uFog, smoothstep(uFogR.x, uFogR.y, vDepth) * uFogA * 0.6), 1.0); }`;
function buildTrail(tr, color, width) {
  const P = tr.P, pos = [], ks = [], idx = [];
  const pts = [];
  // resample densely between steps for smooth ribbons
  for (let i = 0; i < P.length - 1; i++) for (let s = 0; s < 4; s++) { const t = s / 4; pts.push([P[i][0] + (P[i + 1][0] - P[i][0]) * t, P[i][1] + (P[i + 1][1] - P[i][1]) * t, i + t]); }
  pts.push([...P[P.length - 1], P.length - 1]);
  for (let i = 0; i < pts.length; i++) {
    const [u, v, k] = pts[i]; const a = pts[Math.max(0, i - 1)], c = pts[Math.min(pts.length - 1, i + 1)];
    let dx = (c[0] - a[0]) * M.S, dz = -(c[1] - a[1]) * M.S; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const [x, y, z] = M.toWorld(u, v, 1.6);
    pos.push(x - dz * width, y, z + dx * width, x + dz * width, y, z - dx * width); ks.push(k, k);
    if (i > 0) { const b0 = (i - 1) * 2; idx.push(b0, b0 + 1, b0 + 2, b0 + 1, b0 + 3, b0 + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('k', new THREE.Float32BufferAttribute(ks, 1)); g.setIndex(idx);
  const m = new THREE.ShaderMaterial({ uniforms: { uHead: { value: 0 }, uCol: { value: new THREE.Vector3(...col(color)) }, uFog: U.uFog, uFogR: U.uFogR, uFogA: U.uFogA }, vertexShader: TRAIL_VS, fragmentShader: TRAIL_FS, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 20; return mesh;
}

// ── assemble ────────────────────────────────────────────────────────────────────────────
export const OBJ = {};
export function buildWorld() {
  OBJ.terrain = buildTerrain(); scene.add(OBJ.terrain);
  OBJ.city = buildCity(); scene.add(OBJ.city);
  // urban tint on terrain vertices near lots
  {
    const g = OBJ.terrain.geometry, p = g.attributes.position, urb = g.attributes.urb;
    const cx = M.S * 3, cz = -M.S * 2;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i); if (Math.hypot(x - cx, z - cz) > 240) continue;
      let best = 1e9; for (const l of CITYDATA.lots) { const d = Math.hypot(l.x - x, l.z - z); if (d < best) best = d; }
      urb.setX(i, best < 12 ? 1 : 0);
    }
    urb.needsUpdate = true;
  }
  OBJ.octa = buildOcta(); scene.add(OBJ.octa);
  OBJ.unit = buildUnit(); scene.add(OBJ.unit);
  OBJ.cage = buildCage(); scene.add(OBJ.cage);
  OBJ.geo = buildGeofront(); scene.add(OBJ.geo);
  OBJ.lance = buildLance(); scene.add(OBJ.lance);
  OBJ.trailSGD = buildTrail(M.TRAJ.sgd, '#e8412c', 1.5); scene.add(OBJ.trailSGD);
  OBJ.trailAdam = buildTrail(M.TRAJ.adam, '#f2f0e6', 1.5); scene.add(OBJ.trailAdam);
}

// ── per-frame state reset (so no state leaks between shots) ─────────────────────────────────
export function resetWorld(t) {
  for (const k of Object.keys(OBJ)) OBJ[k].visible = false;
  U.uTime.value = t; U.uSwap.value = 0; U.uRiseT.value = 100; U.uShadowOn.value = 0; U.uMode.value = 0; U.uLed.value = 0.35; U.uRingOn.value = 0; U.uFogA.value = 1;
  U.uInkW.value = 1.25; U.uInkFar.value = 1400; U.uWarm.value.set(1, 1, 1);
  U.uChunks.value.fill(0);
  TU.tLineA.value = 0.35; TU.tRimA.value = 0; TU.tPatch.value = 1; TU.tStep.value = 0.25; TU.tUrbA.value = 1; TU.tWaterLv.value = 0.7;
  OBJ.octa.position.copy(OCTA.pos); OBJ.octa.rotation.set(0, t * 0.12, 0); OBJ.octa.scale.setScalar(1);
  OBJ.octa.userData.mat.uniforms.uSpread.value = 0; OBJ.octa.userData.core.visible = true; OBJ.octa.userData.halo.visible = true; OBJ.octa.userData.haloInk.visible = true;
  OBJ.unit.position.set(0, 0, 0); OBJ.unit.rotation.set(0, 0, 0);
  UNIT.arms[0].rotation.set(0, 0, 0); UNIT.arms[1].rotation.set(0, 0, 0); UNIT.elbows[0].rotation.set(0, 0, 0); UNIT.elbows[1].rotation.set(0, 0, 0); UNIT.eyeMat.uniforms.uEmis.value = 0; UNIT.fan.rotation.z = t * 5; UNIT.fan.visible = true;
  OBJ.cage.position.set(0, 0, 0);
  OBJ.lance.position.set(0, 0, 0); OBJ.lance.rotation.set(0, 0, 0);
  OBJ.trailSGD.material.uniforms.uHead.value = 0; OBJ.trailAdam.material.uniforms.uHead.value = 0;
  camera.fov = 35; camera.up.set(0, 1, 0);
}
export const ground = (x, z) => { const [u, v] = M.fromWorld(x, z); return M.hgt(u, v); };
export function setCam(pos, look, fov = 35, roll = 0) {
  camera.position.set(pos[0], pos[1], pos[2]); camera.fov = fov; camera.updateProjectionMatrix();
  camera.up.set(Math.sin(roll), Math.cos(roll), 0); camera.lookAt(look[0], look[1], look[2]);
  camera.updateMatrixWorld(); U.uCam.value.copy(camera.position);
}
// mood presets: light direction, shadow tint, fog, terrain palette
export function mood(name) {
  const set = (u, a) => u.value.set(a[0], a[1], a[2]);
  const hx = (h) => col(h);
  const M_ = MOODS[name];
  set(U.uL, M_.L); U.uL.value.normalize(); set(U.uShadow, M_.shadow); set(U.uHi, M_.hi || [1.1, 1.08, 1.04]); set(U.uFog, hx(M_.fog)); U.uFogR.value.set(...M_.fogR);
  set(U.uInk, hx(M_.ink || '#18161c')); set(U.uLedCol, M_.led || [1, 0.55, 0.15]);
  set(TU.tLand, hx(M_.land)); set(TU.tLandSh, hx(M_.landSh)); set(TU.tLandHi, hx(M_.landHi)); set(TU.tLine, hx(M_.line)); set(TU.tUrb, hx(M_.urb));
  set(TU.tWater, hx(M_.water)); set(TU.tShore, hx(M_.shore));
  if (M_.warm) set(U.uWarm, M_.warm);
}
export const MOODS = {
  day: { L: [0.5, 0.75, 0.3], shadow: [0.58, 0.64, 0.84], fog: '#b7cbe6', fogR: [150, 1700], land: '#7a8f66', landSh: '#4b5f59', landHi: '#9aae7c', line: '#5c7156', urb: '#b9bcbf', water: '#4a7fd0', shore: '#e8ecee' },
  predawn: { L: [-0.2, 0.35, -0.9], shadow: [0.55, 0.5, 0.7], fog: '#5a1420', fogR: [250, 1700], land: '#24161e', landSh: '#130a10', landHi: '#3a1c24', line: '#9a2a30', urb: '#2c2632', water: '#241a33', shore: '#4a2a3a', ink: '#070508', warm: [1, 1, 1] },
  blue: { L: [-0.3, 0.5, -0.8], shadow: [0.5, 0.58, 0.8], fog: '#0d2350', fogR: [300, 2200], land: '#142850', landSh: '#0a1834', landHi: '#1d3a6c', line: '#4d78c8', urb: '#1a2a4c', water: '#08122a', shore: '#3a5a9a', ink: '#03060e' },
  sunset: { L: [-0.55, 0.45, 0.7], shadow: [0.62, 0.45, 0.62], hi: [1.12, 1.02, 0.9], fog: '#ee9a58', fogR: [150, 1600], land: '#9a7058', landSh: '#5a3e52', landHi: '#d49a62', line: '#6e4448', urb: '#b89484', water: '#e0a070', shore: '#f2c898', ink: '#1a0e14', warm: [1.0, 0.92, 0.84] },
  dusk: { L: [-0.75, 0.25, 0.45], shadow: [0.5, 0.36, 0.5], fog: '#c8603a', fogR: [300, 1800], land: '#5e4448', landSh: '#35243a', landHi: '#8e5e50', line: '#3e2632', urb: '#7e6068', water: '#b86848', shore: '#e0a080', ink: '#12080e', warm: [1.0, 0.85, 0.78] },
  geo: { L: [0.2, 0.9, 0.3], shadow: [0.5, 0.42, 0.45], fog: '#1a1214', fogR: [500, 2400], land: '#333', landSh: '#222', landHi: '#444', line: '#555', urb: '#333', water: '#111', shore: '#333', ink: '#050405', led: [1.0, 0.5, 0.12], warm: [1.05, 0.9, 0.78] },
  cage: { L: [-0.4, 0.4, 0.8], shadow: [0.42, 0.34, 0.5], hi: [1.15, 1.05, 0.95], fog: '#e2601e', fogR: [800, 3000], land: '#333', landSh: '#222', landHi: '#444', line: '#555', urb: '#333', water: '#111', shore: '#333', ink: '#0a0608', warm: [1.0, 0.95, 0.92] },
  night: { L: [0.3, 0.6, 0.5], shadow: [0.45, 0.45, 0.62], fog: '#0b0d1a', fogR: [300, 2000], land: '#1b2030', landSh: '#0f1220', landHi: '#262c40', line: '#2e3a5a', urb: '#20242e', water: '#0a0e1c', shore: '#2a3048', ink: '#030306' },
};

// ── hard cel shadows: one ortho depth pass from the key light over a chosen box ────────────
const SHADOW_RES = 1024;
const shadowRT = new THREE.WebGLRenderTarget(SHADOW_RES, SHADOW_RES, { depthBuffer: true });
shadowRT.depthTexture = new THREE.DepthTexture(SHADOW_RES, SHADOW_RES); shadowRT.depthTexture.type = THREE.UnsignedIntType;
const shadowCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 4000);
const depthMat = new THREE.ShaderMaterial({ uniforms: { uRiseT: U.uRiseT, uSpread: { value: 0 } }, vertexShader: `attribute vec4 aux; uniform float uRiseT;
  void main(){ vec3 p = position; if (aux.y > 0.0) { float k = smoothstep(aux.x, aux.x + 2.4, uRiseT); p.y -= aux.y * (1.0 - k); }
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`, fragmentShader: `void main(){ gl_FragColor = vec4(1.0); }` });
export function shadows(center, size) {
  const L = U.uL.value; const c = new THREE.Vector3(center[0], center[1], center[2]);
  shadowCam.left = -size; shadowCam.right = size; shadowCam.top = size; shadowCam.bottom = -size; shadowCam.near = 1; shadowCam.far = 3000;
  shadowCam.position.copy(c).addScaledVector(L, 1400); shadowCam.up.set(0, 1, 0); if (Math.abs(L.y) > 0.99) shadowCam.up.set(0, 0, 1);
  shadowCam.lookAt(c); shadowCam.updateProjectionMatrix(); shadowCam.updateMatrixWorld();
  U.uShadowMat.value.multiplyMatrices(shadowCam.projectionMatrix, shadowCam.matrixWorldInverse);
  const vis = {}; for (const k of ['geo', 'trailSGD', 'trailAdam']) { vis[k] = OBJ[k].visible; OBJ[k].visible = false; }
  const oct = OBJ.octa.userData; const hv = oct.halo.visible; oct.halo.visible = false; oct.haloInk.visible = false;
  const pa = performance.now();
  scene.overrideMaterial = depthMat; renderer.setRenderTarget(shadowRT); renderer.setClearColor(0, 1); renderer.clear();
  renderer.render(scene, shadowCam);
  renderer.setRenderTarget(null); scene.overrideMaterial = null; renderer.setClearColor(0, 0);
  for (const k in vis) OBJ[k].visible = vis[k]; oct.halo.visible = hv; oct.haloInk.visible = hv;
  U.uShadowMap.value = shadowRT.depthTexture; U.uShadowOn.value = 1;
  if (window.PROFILE) syncGL(renderer.getContext()); PROF.shadow += performance.now() - pa;
}
export function project(p) { const v = new THREE.Vector3(p[0], p[1], p[2]).project(camera); return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H, v.z]; }
export const PROF = { shadow: 0, main: 0 };
// depth pre-pass: lay down depth with a trivial shader, then the heavy cel/ink shaders only run on visible fragments
const preMat = new THREE.ShaderMaterial({ uniforms: { uRiseT: U.uRiseT }, colorWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2,
  vertexShader: `attribute vec4 aux; uniform float uRiseT;
  void main(){ vec3 p = position; if (aux.y > 0.0) { float k = smoothstep(aux.x, aux.x + 2.4, uRiseT); p.y -= aux.y * (1.0 - k); }
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`, fragmentShader: `void main(){ gl_FragColor = vec4(0.0); }` });
export function render() { const a = performance.now();
  if (OBJ.city.visible || OBJ.terrain.visible || OBJ.geo.visible) {
    const hide = []; for (const k of ['octa', 'unit', 'lance', 'trailSGD', 'trailAdam', 'cage']) if (OBJ[k].visible) { hide.push(k); OBJ[k].visible = false; }
    const gv = OBJ.geo.visible; if (gv) OBJ.geo.children[0].visible = false;   // dome is back-faced; skip it in the pre-pass
    renderer.autoClear = true; scene.overrideMaterial = preMat; renderer.render(scene, camera); scene.overrideMaterial = null;
    if (gv) OBJ.geo.children[0].visible = true; for (const k of hide) OBJ[k].visible = true;
    renderer.autoClear = false; renderer.render(scene, camera); renderer.autoClear = true;
  } else renderer.render(scene, camera); if (window.PROFILE) syncGL(renderer.getContext()); PROF.main += performance.now() - a; return renderer.domElement; }
export { THREE };
