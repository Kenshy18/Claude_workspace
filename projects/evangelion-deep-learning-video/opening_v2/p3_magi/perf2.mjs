import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = '/home/user/Claude_workspace/projects/evangelion-deep-learning-video';
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.html') ? 'text/html' : p.endsWith('.css') ? 'text/css' : 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
await new Promise((res) => srv.listen(0, '127.0.0.1', res));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--font-render-hinting=none'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${srv.address().port}/opening_v2/p3_magi/index.html`);
await page.evaluate(() => window.READY);
const times = process.argv.slice(2).map(Number);
const res = await page.evaluate((times) => {
  const gl = document.getElementById('out').getContext('webgl'); const px = new Uint8Array(4); const out = [];
  for (const t of times) {
    const f = Math.round(t * 30); const r = [];
    for (let k = 0; k < 4; k++) { const t0 = performance.now(); window.renderFrame(f + k); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); r.push(Math.round(performance.now() - t0)); }
    // split: scene draw only / credits only
    const T = (f) / 30; let t0 = performance.now();
    const sh = SHOTS.find((s) => T >= s.t0 && T < s.t1); const fx = {}; sctx.save(); sh.draw(sctx, T - sh.t0, T, fx, sh.t1 - sh.t0); sctx.restore(); const a = performance.now() - t0;
    t0 = performance.now(); octx.clearRect(0, 0, 1440, 1080); for (const c of CREDITS) if (T >= c.t0 && T < c.t1) { octx.save(); c.draw(octx, T, 1); octx.restore(); } octx.getImageData(0, 0, 1, 1); const b = performance.now() - t0;
    out.push(`${t}: frames ${r.join(',')}  scene ${a.toFixed(0)}  credits ${b.toFixed(0)}`);
  }
  return out;
}, times);
console.log(res.join('\n'));
await browser.close(); srv.close();
