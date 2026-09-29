// Per-frame timing that mirrors tools/render.mjs --video (renderFrame + JPEG 0.95 readback), SwiftShader.
//   node opening_v2/p4_rebuild/bench.mjs [times...]      (run from project root)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const PAGE = process.env.PAGE || 'opening_v2/p4_rebuild/index.html';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf', '.json': 'application/json', '.css': 'text/css' };
const srv = http.createServer((req, rsp) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
  rsp.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(rsp);
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--font-render-hinting=none'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type()==='warning' || m.type()==='log') console.log('[page]', m.text()); });
await page.goto(`http://127.0.0.1:${srv.address().port}/${PAGE}`);
const info = await page.evaluate(() => window.READY);
const times = process.argv.slice(2).map(Number);
const list = times.length ? times : Array.from({ length: 46 }, (_, i) => i * 2 + 0.3);
let sum = 0, worst = 0, wt = 0; const rows = [];
for (const t of list) {
  const f = Math.round(t * 30); if (f >= info.frames) continue;
  const t0 = Date.now();
  await page.evaluate((f) => { window.renderFrame(f); return document.getElementById('out').toDataURL('image/jpeg', 0.95).length; }, f);
  const dt = Date.now() - t0; sum += dt; if (dt > worst) { worst = dt; wt = t; } rows.push(`${t.toFixed(2)}:${dt}`);
}
console.log(rows.join('  '));
console.log(`frames ${rows.length}  mean ${(sum / rows.length).toFixed(0)} ms  worst ${worst} ms @ ${wt}s`);
await browser.close(); srv.close();
