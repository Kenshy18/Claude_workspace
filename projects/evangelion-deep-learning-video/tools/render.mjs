// Render driver: serves the project over HTTP, drives headless Chromium frame by frame,
// and streams frames into ffmpeg. Modes:
//   node tools/render.mjs --film episodes --stills 12.3,40,99.5  -> out/episodes/stills/*.png
//   node tools/render.mjs --film opening --cues                  -> out/opening/cues.json (audio cue sheet)
//   node tools/render.mjs --film episodes --video [--workers 4] [--from s --to s]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT0 = path.join(ROOT, 'out');
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const has = (k) => args.includes(k);
// --film picks the page and its output folder: episodes (本編) or opening (OP)
const FILM = arg('--film', 'episodes');
const PAGE = `${FILM}.html`;
const NAME = FILM;
const OUT = path.join(OUT0, NAME);
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf', '.json': 'application/json', '.png': 'image/png' };
function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(rsp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

async function openPage(port) {
  const browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--font-render-hinting=none'],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${port}/${PAGE}`);
  const info = await page.evaluate(() => window.READY);
  return { browser, page, info };
}

async function grab(page, f, fmt = 'png') {
  const b64 = await page.evaluate(([f, fmt]) => {
    window.renderFrame(f);
    const c = document.getElementById('out');
    return fmt === 'png' ? c.toDataURL('image/png').slice(22) : c.toDataURL('image/jpeg', 0.95).slice(23);
  }, [f, fmt]);
  return Buffer.from(b64, 'base64');
}

const srv = await serve();
const port = srv.address().port;

if (has('--cues')) {
  const { browser, page } = await openPage(port);
  const cues = await page.evaluate(() => window.getCues());
  fs.writeFileSync(path.join(OUT, 'cues.json'), JSON.stringify(cues, null, 1));
  console.log('total', cues.total, 's,', cues.cues.length, 'cues');
  console.log(cues.scenes.map((s) => `${s.name}@${s.start}`).join('  '));
  await browser.close();
} else if (has('--stills')) {
  const times = arg('--stills').split(',').map(Number);
  const dir = path.join(OUT, 'stills');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const { browser, page, info } = await openPage(port);
  console.log('timeline', info);
  for (const t of times) {
    const f = Math.round(t * 30);
    const t0 = Date.now();
    const buf = await grab(page, f);
    const name = `still_${t.toFixed(2).padStart(7, '0')}.png`;
    fs.writeFileSync(path.join(dir, name), buf);
    console.log(name, (Date.now() - t0) + 'ms', (buf.length / 1e6).toFixed(2) + 'MB');
  }
  await browser.close();
} else if (has('--video')) {
  const workers = +arg('--workers', 3);
  const probe = await openPage(port);
  const total = probe.info.frames;
  await probe.browser.close();
  const from = Math.round(+arg('--from', 0) * 30), to = Math.min(total, Math.round(+arg('--to', total / 30) * 30));
  const n = to - from;
  const segDir = path.join(OUT, 'segments');
  fs.rmSync(segDir, { recursive: true, force: true });
  fs.mkdirSync(segDir, { recursive: true });
  const t0 = Date.now();
  let done = 0;
  const jobs = [];
  for (let w = 0; w < workers; w++) {
    const a = from + Math.floor((n * w) / workers), b = from + Math.floor((n * (w + 1)) / workers);
    jobs.push((async () => {
      const { browser, page } = await openPage(port);
      const segPath = path.join(segDir, `seg_${String(w).padStart(2, '0')}.mp4`);
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', '30', segPath]);
      ff.stderr.on('data', (d) => process.stderr.write(d));
      for (let f = a; f < b; f++) {
        const buf = await grab(page, f, 'jpeg');
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
        done++;
        if (done % 60 === 0) {
          const el = (Date.now() - t0) / 1000;
          console.log(`frames ${done}/${n}  ${(done / el).toFixed(2)} fps  eta ${((n - done) / (done / el) / 60).toFixed(1)} min`);
        }
      }
      ff.stdin.end();
      await new Promise((r) => ff.on('close', r));
      await browser.close();
      return segPath;
    })());
  }
  const segs = await Promise.all(jobs);
  fs.writeFileSync(path.join(segDir, 'list.txt'), segs.map((s) => `file '${s}'`).join('\n'));
  console.log('rendered', n, 'frames in', ((Date.now() - t0) / 1000).toFixed(0), 's');
}
srv.close();
