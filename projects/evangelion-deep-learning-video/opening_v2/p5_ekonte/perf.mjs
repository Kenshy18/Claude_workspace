// p5 perf probe: time renderFrame (+ jpeg encode, as the video path does) sequentially over a frame range.
//   node opening_v2/p5_ekonte/perf.mjs 0 2715 3      (from, to, step)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const [a = 0, b = 2715, st = 1] = process.argv.slice(2).map(Number);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--font-render-hinting=none'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
await page.goto(`http://127.0.0.1:${srv.address().port}/opening_v2/p5_ekonte/index.html`);
await page.evaluate(() => window.READY);
const res = await page.evaluate(([a, b, st]) => {
  const out = [];
  for (let f = a; f < b; f += st) {
    const t0 = performance.now(); const id = window.renderFrame(f);
    document.getElementById('out').toDataURL('image/jpeg', 0.95);
    out.push([f, id, performance.now() - t0]);
  }
  return out;
}, [a, b, st]);
const per = {};
for (const [f, id, ms] of res) { const p = per[id] || (per[id] = { n: 0, sum: 0, max: 0, first: ms }); p.n++; p.sum += ms; p.max = Math.max(p.max, ms); }
const all = res.map((r) => r[2]);
console.log('frames', res.length, 'avg', (all.reduce((x, y) => x + y, 0) / all.length).toFixed(0), 'ms  max', Math.max(...all).toFixed(0), 'ms');
for (const [id, p] of Object.entries(per)) if (p.max > 350) console.log(id, 'first', p.first.toFixed(0), 'avg', (p.sum / p.n).toFixed(0), 'max', p.max.toFixed(0));
await browser.close(); srv.close();
