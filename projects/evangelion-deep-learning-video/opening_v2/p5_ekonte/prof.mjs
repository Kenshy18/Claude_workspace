// stage profile of a few frames: node opening_v2/p5_ekonte/prof.mjs 1580 1590 ...
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const frames = process.argv.slice(2).map(Number);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--font-render-hinting=none'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${srv.address().port}/opening_v2/p5_ekonte/index.html`);
await page.evaluate(() => window.READY);
const res = await page.evaluate((frames) => {
  const out = [];
  window.PROF = {};
  for (const f of frames) {
    window.PROF = {};
    const t0 = performance.now(); window.renderFrame(f); const t1 = performance.now();
    document.getElementById('out').toDataURL('image/jpeg', 0.95); const t2 = performance.now();
    out.push(f + ' render ' + (t1 - t0).toFixed(0) + ' jpeg ' + (t2 - t1).toFixed(0) + ' | ' + Object.entries(window.PROF).map(([k, v]) => k + ' ' + v.toFixed(0)).join(', '));
  }
  return out;
}, frames);
console.log(res.join('\n'));
await browser.close(); srv.close();
