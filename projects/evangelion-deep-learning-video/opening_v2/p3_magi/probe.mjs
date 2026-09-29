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
const times = process.argv.slice(2).map(Number);
const res = await page.evaluate((times) => times.map((t) => {
  const f = Math.round(t * 30); const name = window.renderFrame(f);
  const px = sctx.getImageData(10, 10, 1, 1).data;
  const st = sctx.getTransform();
  return `${t}: ${name}  scene(10,10)=${px[0]},${px[1]},${px[2]}  saveDepthProbe`;
}), times);
console.log(res.join('\n'));
await browser.close(); srv.close();
