import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = '/home/user/Claude_workspace/projects/evangelion-deep-learning-video';
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
await new Promise((res) => srv.listen(0, '127.0.0.1', res));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--font-render-hinting=none'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.text()); });
await page.goto(`http://127.0.0.1:${srv.address().port}/opening_v2/p3_magi/index.html`);
await page.evaluate(() => window.READY);
await page.evaluate(() => { window.fx0name = (t) => { for (const s of SHOTS) if (t >= s.t0 && t < s.t1) return s.name; return "?"; }; });
const times = process.argv.slice(2).map(Number);
const res = await page.evaluate((times) => times.map((t) => {
  const gl = document.getElementById("out").getContext("webgl"); const pxb = new Uint8Array(4);
  const f0 = Math.round(t * 30); const T = []; for (let k = 0; k < 3; k++) { const fr = f0 + k; const tt = fr / 30; const fx = { frame: fr, bloom: 0, thr: 0.62, weave: [0, 0] };
    for (const c of [sctx, octx]) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = "source-over"; c.filter = "none"; } octx.clearRect(0, 0, 1440, 1080);
    let a = performance.now(); drawFrame(sctx, octx, tt, fx); sctx.getImageData(0, 0, 1, 1); if (fx.useOvl) octx.getImageData(0, 0, 1, 1); const d1 = performance.now() - a;
    a = performance.now(); post.render(sceneCanvas, ovlCanvas, fx); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pxb); const d2 = performance.now() - a; T.push(`${d1.toFixed(0)}+${d2.toFixed(0)}`); }
  return `${t} ${fx0name(t)}: draw+post ${T.join("  ")}`;
}), times);
const _unused = await page.evaluate((times) => times.map((t) => {
  const f = Math.round(t * 30); const name = window.renderFrame(f);
  const px = sctx.getImageData(10, 10, 1, 1).data;
  const st = sctx.getTransform();
  return `${t}: ${name}  scene(10,10)=${px[0]},${px[1]},${px[2]}  saveDepthProbe`;
}), times);
console.log(res.join('\n'));
await browser.close(); srv.close();
