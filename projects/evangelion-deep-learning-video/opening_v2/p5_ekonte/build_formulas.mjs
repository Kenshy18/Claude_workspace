// p5_ekonte: typeset every formula with MathJax (TeX -> SVG), then flatten the SVG into a glyph list
// (codepoint, path, absolute transform) + rules (fraction bars / radical overbars). At runtime each glyph is
// drawn separately with pencil jitter; common glyphs are re-drawn in a handwriting font at the TeX position.
//   node opening_v2/p5_ekonte/build_formulas.mjs   -> opening_v2/p5_ekonte/js/formulas_p5.js
import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';
import fs from 'node:fs';

const R = String.raw;
const F = {
  // intro — compute-optimal planning (Chinchilla)
  ch1: R`C \approx 6ND`,
  ch2: R`\min_{N,D}\; L = E + \frac{A}{N^{\alpha}} + \frac{B}{D^{\beta}}`,
  ch3: R`\text{s.t. } 6ND = C`,
  ch4: R`\alpha\frac{A}{N^{\alpha}} = \beta\frac{B}{D^{\beta}}`,
  ch5: R`N_{\rm opt} \propto C^{\frac{\beta}{\alpha+\beta}} = C^{0.45}`,
  ch6: R`D_{\rm opt} \propto C^{\frac{\alpha}{\alpha+\beta}} = C^{0.55}`,
  ch7: R`\frac{D}{N} \approx \frac{1.4\,{\rm T}}{70\,{\rm B}} = 20`,
  // verse A — why sqrt(d_k)
  sd1: R`q,\,k \in \mathbb{R}^{d_k}`,
  sd2: R`q\cdot k = \sum_{i=1}^{d_k} q_i k_i`,
  sd3: R`{\rm Var}(q\cdot k) = \sum_i {\rm Var}(q_i k_i) = d_k`,
  sd4: R`d_k = 64 \;\Rightarrow\; \sigma = 8`,
  sd5a: R`\frac{q\cdot k}{d_k}`,
  sd5b: R`\frac{q\cdot k}{\sqrt{d_k}}`,
  sd6: R`{\rm softmax}\Big(\frac{QK^{\top}}{\sqrt{d_k}}\Big)V`,
  sd7: R`{\rm Var}\Big(\frac{q\cdot k}{\sqrt{d_k}}\Big) = 1`,
  // verse B — softmax + cross-entropy
  ce1: R`L = -\sum_i y_i \log p_i`,
  ce1b: R`p_i = \frac{e^{z_i}}{\sum_j e^{z_j}}`,
  ce2: R`\frac{\partial p_i}{\partial z_j} = p_i(\delta_{ij} - p_j)`,
  ce3: R`\frac{\partial L}{\partial z_j} = -\sum_i \frac{y_i}{p_i}\,p_i(\delta_{ij}-p_j)`,
  ce4: R`= -y_j + p_j \sum_i y_i`,
  ce5a: R`= y - p`,
  ce5: R`\frac{\partial L}{\partial z} = p - y`,
  // pre-chorus — Adam bias correction
  ad1: R`m_t = \beta_1 m_{t-1} + (1-\beta_1)\,g_t`,
  ad1b: R`m_0 = 0`,
  ad2: R`\mathbb{E}[m_t] = (1-\beta_1^{\,t})\,\mathbb{E}[g]`,
  ad3a: R`\hat m_t = m_t/\beta_1^{\,t}`,
  ad3: R`\hat m_t = \frac{m_t}{1-\beta_1^{\,t}}`,
  ad3b: R`\hat v_t = \frac{v_t}{1-\beta_2^{\,t}}`,
  ad4: R`\theta_t = \theta_{t-1} - \eta\,\frac{\hat m_t}{\sqrt{\hat v_t}+\epsilon}`,
  ad5: R`t=1:\ \hat m_1 = g_1,\ \hat v_1 = g_1^2`,
  ad6: R`\Delta\theta = -\eta\,\frac{g_1}{|g_1|} = -\eta\,{\rm sign}(g_1)`,
  // residual stream Jacobian
  rs1: R`x_{\ell+1} = x_\ell + F_\ell(x_\ell)`,
  rs2: R`\frac{\partial x_{\ell+1}}{\partial x_\ell} = I + \frac{\partial F_\ell}{\partial x_\ell}`,
  rs3: R`\frac{\partial L}{\partial x_\ell} = \frac{\partial L}{\partial x_L}\prod_{k=\ell}^{L-1}\Big(I + \frac{\partial F_k}{\partial x_k}\Big)`,
  rs4: R`= \frac{\partial L}{\partial x_L}\Big(I + \sum_k \frac{\partial F_k}{\partial x_k} + \cdots\Big)`,
  // labels, cards, pause-frame notes
  lm: R`p(x) = \prod_{t} p(x_t \mid x_{<t})`,
  lrf: R`\eta = d^{-0.5}\min(s^{-0.5},\, s\,w^{-1.5})`,
  chinL: R`L(N,D) = E + \frac{A}{N^{\alpha}} + \frac{B}{D^{\beta}}`,
  sgd: R`\theta \leftarrow \theta - \eta\,\nabla L`,
  mom: R`v \leftarrow \mu v + \nabla L`,
  nest: R`v \leftarrow \mu v + \nabla L(\theta - \eta\mu v)`,
  adag: R`\theta \leftarrow \theta - \frac{\eta\,g}{\sqrt{\textstyle\sum g^2}}`,
  adamr: R`\theta \leftarrow \theta - \eta\,\frac{\hat m}{\sqrt{\hat v}+\epsilon}`,
  drop: R`\tilde h = \frac{m\odot h}{1-p}`,
  mse: R`E = \tfrac{1}{2}\sum (y-\hat y)^2`,
  corr: R`\frac{1}{1-\beta^{t}}`,
  zdz: R`0/0`,
  inf: R`\|\nabla L\| \to \infty`,
  qkv: R`Q = XW_Q`,
  kk: R`K = XW_K`,
  vv: R`V = XW_V`,
  pe: R`{\rm softmax}(\beta\,\tilde P_h\tilde P_h^{\top}/\sqrt{d_h})`,
  xor: R`y = x_1 \oplus x_2`,
  mlp: R`h = {\rm ReLU}(W_1x)`,
  six: R`6ND`,
  res: R`x + F(x)`,
  sign: R`{\rm sign}(g)`,
  gn: R`\|g\|_2`,
};

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const tex = new TeX({ packages: AllPackages });
const svg = new SVG({ fontCache: 'none' });
const doc = mathjax.document('', { InputJax: tex, OutputJax: svg });

const mul = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3],
  A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
function parseT(s) {
  let M = [1, 0, 0, 1, 0, 0];
  if (!s) return M;
  const re = /(translate|scale|matrix)\(([^)]*)\)/g;
  let m;
  while ((m = re.exec(s))) {
    const v = m[2].split(/[\s,]+/).filter(Boolean).map(Number);
    let T;
    if (m[1] === 'translate') T = [1, 0, 0, 1, v[0], v[1] || 0];
    else if (m[1] === 'scale') T = [v[0], 0, 0, v.length > 1 ? v[1] : v[0], 0, 0];
    else T = v;
    M = mul(M, T);
  }
  return M;
}
function bbox(d) {
  const tok = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  let cmd = 'M', cx = 0, cy = 0, xs = [], ys = [], i = 0;
  while (i < tok.length) {
    const t = tok[i];
    if (/[A-Za-z]/.test(t)) { cmd = t; i++; if (cmd === 'Z' || cmd === 'z') continue; }
    if (cmd === 'H') { cx = +tok[i++]; xs.push(cx); ys.push(cy); }
    else if (cmd === 'V') { cy = +tok[i++]; xs.push(cx); ys.push(cy); }
    else { cx = +tok[i++]; cy = +tok[i++]; xs.push(cx); ys.push(cy); }
  }
  if (!xs.length) return [0, 0, 0, 0];
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

const out = {};
for (const [k, src] of Object.entries(F)) {
  const node = doc.convert(src, { display: true });
  const svgNode = adaptor.childNodes(node).find((n) => adaptor.kind(n) === 'svg') || adaptor.firstChild(node);
  const vb = adaptor.getAttribute(svgNode, 'viewBox').split(/\s+/).map(Number);
  const glyphs = [], rules = [];
  const walk = (n, M) => {
    const kind = adaptor.kind(n);
    if (kind === '#text' || kind === '#comment') return;
    const M2 = mul(M, parseT(adaptor.getAttribute(n, 'transform')));
    if (kind === 'path') {
      const d = adaptor.getAttribute(n, 'd');
      const c = adaptor.getAttribute(n, 'data-c') || '';
      if (d && d.length > 2) glyphs.push({ c, d, m: M2.map((x) => +x.toFixed(4)), b: bbox(d) });
    } else if (kind === 'rect') {
      const x = +adaptor.getAttribute(n, 'x') || 0, y = +adaptor.getAttribute(n, 'y') || 0;
      const w = +adaptor.getAttribute(n, 'width'), h = +adaptor.getAttribute(n, 'height');
      // rect corners through M
      const p = (px, py) => [M2[0] * px + M2[2] * py + M2[4], M2[1] * px + M2[3] * py + M2[5]];
      const a = p(x, y), b = p(x + w, y + h);
      rules.push([Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])].map((v) => +v.toFixed(1)));
    }
    for (const ch of adaptor.childNodes(n) || []) walk(ch, M2);
  };
  for (const ch of adaptor.childNodes(svgNode)) walk(ch, [1, 0, 0, 1, 0, 0]);
  // reading order: sort glyphs by left edge (after transform)
  for (const g of glyphs) { g.x0 = g.m[0] * g.b[0] + g.m[4]; }
  glyphs.sort((a, b) => a.x0 - b.x0);
  out[k] = { vb, g: glyphs.map(({ c, d, m, b }) => ({ c, d, m, b })), r: rules };
}
fs.writeFileSync(new URL('./js/formulas_p5.js', import.meta.url),
  '// generated by build_formulas.mjs — do not edit\nwindow.F5 = ' + JSON.stringify(out) + ';\n');
console.log('formulas:', Object.keys(out).length, 'bytes', JSON.stringify(out).length);
