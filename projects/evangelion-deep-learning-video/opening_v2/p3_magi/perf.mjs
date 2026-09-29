// perf probe: times window.renderFrame (+ a GPU readback) for every Nth frame. usage: node opening_v2/p3_magi/perf.mjs [step]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const step = +(process.argv[2] || 15);
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'Content-Type': p.endsWith('.js') || p.endsWith('.mjs') ? 'text/javascript' : p.endsWith('.html') ? 'text/html' : p.endsWith('.css') ? 'text/css' : 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
await new Promise((res) => srv.listen(0, '127.0.0.1', res));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--font-render-hinting=none'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${srv.address().port}/opening_v2/p3_magi/index.html`);
const info = await page.evaluate(() => window.READY);
const res = await page.evaluate(([n, st]) => {
  const out = []; const c = document.getElementById('out'); const gl = c.getContext('webgl'); const px = new Uint8Array(4);
  for (let f = 0; f < n; f += st) { const t0 = performance.now(); const name = window.renderFrame(f); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); out.push([f, performance.now() - t0, name]); }
  return out;
}, [info.frames, step]);
res.sort((a, b) => b[1] - a[1]);
const avg = res.reduce((s, r) => s + r[1], 0) / res.length;
console.log('frames', res.length, 'avg', avg.toFixed(0), 'ms  max', res[0][1].toFixed(0), 'ms');
console.log('slowest:', res.slice(0, 12).map((r) => `${(r[0] / 30).toFixed(2)}s ${r[2]} ${r[1].toFixed(0)}ms`).join('\n  '));
await browser.close(); srv.close();
