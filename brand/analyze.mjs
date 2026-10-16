// Programmatic QA for rendered brand PNGs (no eyeballs needed).
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import os from 'node:os';
import path from 'node:path';
import { rmSync } from 'node:fs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BRAVE = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage: node brand/analyze.mjs <png...>');
  process.exit(1);
}

async function connect(port) {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (r.ok) {
        const t = (await r.json()).find((x) => x.type === 'page' && x.webSocketDebuggerUrl);
        if (t) return t.webSocketDebuggerUrl;
      }
    } catch {}
    await sleep(250);
  }
  throw new Error('no CDP');
}
function cdp(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    let id = 0;
    ws.onopen = () => resolve({
      send: (m, p = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p })); }),
      close: () => ws.close(),
    });
    ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } };
    ws.onerror = (e) => reject(new Error('ws ' + e.message));
  });
}

const ANALYZE = (dataUrl) => `(async () => {
  const img = new Image();
  img.src = ${JSON.stringify(dataUrl)};
  await img.decode();
  const w = img.naturalWidth, h = img.naturalHeight;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, w, h);
  let minX = w, minY = h, maxX = -1, maxY = -1, op = 0;
  const buckets = new Set();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, a = data[i + 3];
    if (a > 12) {
      op++;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (((x + y) % 7) === 0) buckets.add((data[i]>>4)+','+(data[i+1]>>4)+','+(data[i+2]>>4));
    }
  }
  const transparent = (() => { const tl = data[3]; return tl < 12; })();
  return JSON.stringify({ w, h, minX, minY, maxX, maxY, opaquePct: +(op/(w*h)*100).toFixed(1),
    coverage: [minX, minY, maxX - minX, maxY - minY], distinctColors: buckets.size, transparent });
})()`;

const profile = path.join(os.tmpdir(), 'playmora-analyze');
rmSync(profile, { recursive: true, force: true });
const port = 9334;
const child = spawn(BRAVE, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
try {
  const page = await cdp(await connect(port));
  for (const f of files) {
    const p = path.isAbsolute(f) ? f : path.join(ROOT, f);
    const b64 = readFileSync(p).toString('base64');
    const url = `data:image/png;base64,${b64}`;
    const { result } = await page.send('Runtime.evaluate', { expression: ANALYZE(url), awaitPromise: true, returnByValue: true });
    const s = JSON.parse(result.value);
    const [bx, by, bw, bh] = s.coverage;
    const clipped = bx <= 0 || by <= 0 || bx + bw >= s.w || by + bh >= s.h;
    console.log(`${path.relative(ROOT, p)}`.padEnd(50),
      `${s.w}x${s.h}`.padEnd(10),
      `content=${bw}x${bh}@${bx},${by}`.padEnd(26),
      `opaque=${s.opaquePct}%`.padEnd(13),
      `colors~${s.distinctColors}`.padEnd(12),
      s.transparent ? 'bg=transparent' : 'bg=solid',
      clipped ? '  <-- TOUCHES EDGE' : '');
  }
  page.close();
} finally { child.kill('SIGKILL'); }
