// PLAYMORA brand asset generator.
// Original vector assets (mascot, wordmark, app icon) rendered to PNG via
// headless Brave (CDP) so system fonts + full SVG/CSS render correctly.
//
// Usage: node brand/build.mjs
// Outputs: brand/*.svg  and  assets/images/*.png  (icon sizes)

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BRAND = path.join(ROOT, 'brand');
const IMAGES = path.join(ROOT, 'assets', 'images');

// ---------------------------------------------------------------------------
// Palette (matches src/theme/colors.ts)
// ---------------------------------------------------------------------------
const C = {
  navy: '#0B0F19',
  navy2: '#141B2E',
  ink: '#241B3A',      // cartoon outline
  inkSoft: '#2E2547',
  cream: '#FFF7ED',
  white: '#FFFFFF',
  purple: '#A855F7',
  purpleDeep: '#7E22CE',
  blue: '#38BDF8',
  blueDeep: '#0284C7',
  cyan: '#22D3EE',
  coral: '#F43F5E',
  coralDeep: '#BE123C',
  gold: '#F59E0B',
  goldLight: '#FCD34D',
  emerald: '#10B981',
  pink: '#F472B6',
};

const FONT = `'Arial Rounded MT Bold','SF Pro Rounded','Avenir Next Rounded',system-ui,sans-serif`;

// Measured at runtime (in-browser); width per 1px of font-size.
let M = { word: 5.6, tag: 10.5 };
// font-size so that a run of `chars` at `ratio` fits `avail` px (w/ 2% tracking).
const fitFont = (ratio, avail, chars, track = 0.02) =>
  Math.max(10, Math.floor((avail / (ratio + track * chars)) * 0.98));

// ---------------------------------------------------------------------------
// small geometry helpers
// ---------------------------------------------------------------------------
const rad = (d) => (d * Math.PI) / 180;

function starPath(cx, cy, outer, inner, points = 5, rotate = -90) {
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rad(rotate + (i * 180) / points);
    const x = (cx + Math.cos(a) * r).toFixed(2);
    const y = (cy + Math.sin(a) * r).toFixed(2);
    d += (i === 0 ? 'M' : 'L') + x + ' ' + y + ' ';
  }
  return d + 'Z';
}

function sparklePath(cx, cy, r) {
  const s = r * 0.32;
  return `M ${cx} ${cy - r} C ${cx + s} ${cy - s} ${cx + s} ${cy - s} ${cx + r} ${cy} ` +
    `C ${cx + s} ${cy + s} ${cx + s} ${cy + s} ${cx} ${cy + r} ` +
    `C ${cx - s} ${cy + s} ${cx - s} ${cy + s} ${cx - r} ${cy} ` +
    `C ${cx - s} ${cy - s} ${cx - s} ${cy - s} ${cx} ${cy - r} Z`;
}

// ---------------------------------------------------------------------------
// The mascot: "Mora" the game-controller buddy.
// Drawn in a 0..1024 box; returns a <g> so it can be transformed/placed.
// ---------------------------------------------------------------------------
function mascot() {
  const arms = `
    <g stroke="${C.ink}" stroke-width="16" stroke-linecap="round">
      <line x1="286" y1="452" x2="188" y2="360" stroke="url(#armGrad)"/>
      <line x1="738" y1="452" x2="836" y2="360" stroke="url(#armGrad)"/>
    </g>
    <circle cx="178" cy="352" r="52" fill="url(#handGrad)" stroke="${C.ink}" stroke-width="16"/>
    <circle cx="846" cy="352" r="52" fill="url(#handGrad)" stroke="${C.ink}" stroke-width="16"/>
    <circle cx="162" cy="336" r="16" fill="#FFFFFF" opacity="0.6"/>
    <circle cx="830" cy="336" r="16" fill="#FFFFFF" opacity="0.6"/>`;

  return `<g id="mora" transform="translate(0,0)">
    <!-- ground shadow -->
    <ellipse cx="512" cy="820" rx="300" ry="46" fill="#05070D" opacity="0.28"/>
    ${arms}
    ${MASCOT_CORE}
    <!-- antenna spark -->
    <line x1="512" y1="292" x2="512" y2="228" stroke="${C.ink}" stroke-width="14" stroke-linecap="round"/>
    <path d="${starPath(512, 196, 34, 15)}" fill="${C.goldLight}" stroke="${C.ink}" stroke-width="10" stroke-linejoin="round"/>
  </g>`;
}

// Compact, bold mark (no arms/antenna/shadow) for small sizes: app icon,
// adaptive icon foreground, monochrome. Body spans x:200..824 y:292..729.
const MASCOT_CORE = (() => {
  const body =
    'M512 292 C636 292 716 320 760 366 C806 414 830 520 824 604 ' +
    'C820 668 792 714 736 722 C690 729 662 704 640 670 ' +
    'C622 642 592 624 556 624 L468 624 C432 624 402 642 384 670 ' +
    'C362 704 334 729 288 722 C232 714 204 668 200 604 ' +
    'C194 520 218 414 264 366 C308 320 388 292 512 292 Z';

  const controls = `
    <g stroke="${C.ink}" stroke-width="12" stroke-linejoin="round">
      <rect x="250" y="596" width="104" height="36" rx="18" fill="${C.cream}"/>
      <rect x="284" y="562" width="36" height="104" rx="18" fill="${C.cream}"/>
    </g>
    <g stroke="${C.ink}" stroke-width="12">
      <circle cx="742" cy="580" r="26" fill="${C.cyan}"/>
      <circle cx="782" cy="620" r="26" fill="${C.gold}"/>
      <circle cx="742" cy="660" r="26" fill="${C.coral}"/>
      <circle cx="702" cy="620" r="26" fill="${C.emerald}"/>
    </g>`;

  return `
    <!-- controller body -->
    <path d="${body}" fill="url(#bodyGrad)" stroke="${C.ink}" stroke-width="18" stroke-linejoin="round"/>
    <!-- top gloss -->
    <path d="M300 380 C340 322 420 300 512 300 C604 300 684 322 724 380
             C660 348 590 338 512 338 C434 338 364 348 300 380 Z"
          fill="#FFFFFF" opacity="0.42"/>
    <ellipse cx="392" cy="372" rx="70" ry="26" fill="#FFFFFF" opacity="0.35"
             transform="rotate(-14 392 372)"/>
    ${controls}
    <!-- face plate -->
    <ellipse cx="512" cy="470" rx="176" ry="120" fill="#FFFFFF" opacity="0.10"/>
    <!-- eyes -->
    <g stroke="${C.ink}" stroke-width="12">
      <ellipse cx="424" cy="430" rx="66" ry="74" fill="#FFFFFF"/>
      <ellipse cx="600" cy="430" rx="66" ry="74" fill="#FFFFFF"/>
    </g>
    <ellipse cx="430" cy="446" rx="34" ry="40" fill="${C.ink}"/>
    <ellipse cx="606" cy="446" rx="34" ry="40" fill="${C.ink}"/>
    <circle cx="418" cy="430" r="15" fill="#FFFFFF"/>
    <circle cx="594" cy="430" r="15" fill="#FFFFFF"/>
    <circle cx="446" cy="462" r="7" fill="#FFFFFF" opacity="0.8"/>
    <circle cx="622" cy="462" r="7" fill="#FFFFFF" opacity="0.8"/>
    <!-- cheeks -->
    <ellipse cx="352" cy="512" rx="34" ry="22" fill="${C.coral}" opacity="0.55"/>
    <ellipse cx="672" cy="512" rx="34" ry="22" fill="${C.coral}" opacity="0.55"/>
    <!-- mouth -->
    <path d="M456 496 C470 566 554 566 568 496 Z" fill="${C.ink}"/>
    <path d="M486 546 C500 578 540 578 554 546 C536 534 504 534 486 546 Z" fill="${C.coral}"/>`;
})();

// place the compact mark centered in a square canvas at a given fill fraction
// (fraction of the canvas width occupied by the mark's width, incl. stroke).
function mascotMark(canvas, fill, markColor) {
  const markW = 642; // 200..824 body + 9px stroke each side
  const scale = (fill * canvas) / markW;
  const cx = canvas / 2;
  const cy = canvas / 2;
  const bodyCy = (292 + 729) / 2; // 510.5
  const inner = markColor
    ? `<g style="filter:brightness(0) invert(1)">${MASCOT_CORE}</g>`
    : MASCOT_CORE;
  return `<g transform="translate(${cx},${cy}) scale(${scale.toFixed(4)}) translate(-512,-${bodyCy})">${inner}</g>`;
}

function mascotDefs() {
  return `
  <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${C.purple}"/>
    <stop offset="0.55" stop-color="${C.purpleDeep}"/>
    <stop offset="1" stop-color="${C.blueDeep}"/>
  </linearGradient>
  <linearGradient id="armGrad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${C.blue}"/>
    <stop offset="1" stop-color="${C.purple}"/>
  </linearGradient>
  <radialGradient id="handGrad" cx="0.35" cy="0.3" r="0.8">
    <stop offset="0" stop-color="#93E9FF"/>
    <stop offset="1" stop-color="${C.blueDeep}"/>
  </radialGradient>
  <filter id="softShadow" x="-30%" y="-30%" width="160%" height="170%">
    <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#05070D" flood-opacity="0.35"/>
  </filter>`;
}

// floating playful elements around the mascot area (0..1024)
function floaters() {
  return `
  <g>
    <path d="${starPath(802, 178, 62, 28)}" fill="${C.goldLight}" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round"/>
    <path d="${starPath(852, 268, 26, 12)}" fill="${C.cyan}" stroke="${C.ink}" stroke-width="7" stroke-linejoin="round"/>
    <path d="${sparklePath(214, 214, 46)}" fill="${C.cyan}" stroke="${C.ink}" stroke-width="8" stroke-linejoin="round"/>
    <path d="${sparklePath(168, 566, 34)}" fill="${C.white}" opacity="0.9"/>
    <path d="${sparklePath(820, 470, 30)}" fill="${C.pink}" opacity="0.95"/>
    <!-- lightning bolt -->
    <path d="M150 300 L214 300 L182 372 L236 372 L150 492 L176 396 L126 396 Z"
          fill="${C.coral}" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round"/>
    <!-- puzzle piece -->
    <g transform="translate(806,690)" stroke="${C.ink}" stroke-width="11" stroke-linejoin="round">
      <path d="M0 0 h52 a20 20 0 1 1 40 0 h52 v52 a20 20 0 0 0 0 40 v52 h-52 a20 20 0 1 0 -40 0 h-52 v-52 a20 20 0 1 0 0 -40 Z"
            fill="url(#puzzleGrad)"/>
    </g>
    <!-- coin -->
    <g transform="translate(196,760)">
      <circle r="52" fill="${C.gold}" stroke="${C.ink}" stroke-width="11"/>
      <circle r="36" fill="none" stroke="${C.goldLight}" stroke-width="10"/>
      <path d="${starPath(0, 0, 24, 10)}" fill="${C.goldLight}"/>
    </g>
  </g>`;
}

function floatersDefs() {
  return `
  <linearGradient id="puzzleGrad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${C.cyan}"/>
    <stop offset="1" stop-color="${C.purple}"/>
  </linearGradient>`;
}

// ---------------------------------------------------------------------------
// Compositions
// ---------------------------------------------------------------------------

// Mascot on transparent background (1024).
function artMascot() {
  return svg(1024, 1024, `${mascotDefs()}${floatersDefs()}`, `${floaters()}${mascot()}`);
}

// Rounded-square app icon (1024).
function artIcon({ rounded = true } = {}) {
  const r = rounded ? 228 : 0;
  const border = rounded
    ? `<rect x="10" y="10" width="1004" height="1004" rx="220" fill="none" stroke="#FFFFFF" stroke-opacity="0.10" stroke-width="6"/>`
    : '';
  const bgDefs = `
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#232B54"/>
      <stop offset="0.5" stop-color="${C.navy}"/>
      <stop offset="1" stop-color="#0A1030"/>
    </linearGradient>
    <radialGradient id="bgGlow" cx="0.5" cy="0.36" r="0.7">
      <stop offset="0" stop-color="${C.purple}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${C.purple}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bgGlow2" cx="0.7" cy="0.8" r="0.7">
      <stop offset="0" stop-color="${C.blue}" stop-opacity="0.4"/>
      <stop offset="1" stop-color="${C.blue}" stop-opacity="0"/>
    </radialGradient>`;
  const content = `
    <rect x="0" y="0" width="1024" height="1024" rx="${r}" fill="url(#bgGrad)"/>
    <rect x="0" y="0" width="1024" height="1024" rx="${r}" fill="url(#bgGlow)"/>
    <rect x="0" y="0" width="1024" height="1024" rx="${r}" fill="url(#bgGlow2)"/>
    ${border}
    <g filter="url(#softShadow)">${mascotMark(1024, 0.60)}</g>
    <g opacity="0.95">
      <path d="${sparklePath(190,206,30)}" fill="${C.white}"/>
      <path d="${sparklePath(842,800,26)}" fill="${C.cyan}"/>
      <path d="${starPath(846,190,42,19)}" fill="${C.goldLight}" stroke="${C.ink}" stroke-width="8" stroke-linejoin="round"/>
      <path d="${sparklePath(168,772,24)}" fill="${C.pink}"/>
    </g>`;
  return svg(1024, 1024, `${mascotDefs()}${floatersDefs()}${bgDefs}`, content);
}

// Horizontal logo: mascot + wordmark (1600x560, transparent).
function artLogoHorizontal() {
  const word = fitFont(M.word, 1010, 8);
  const tag = Math.min(66, fitFont(M.tag, 1010, 21));
  const content = `
    <g transform="translate(60,20) scale(0.42)">${mascotDefs()}${floatersDefs()}${mascot()}</g>
    <text x="540" y="250" font-family="${FONT}" font-size="${word}" font-weight="800"
          letter-spacing="${(word * 0.02).toFixed(1)}" fill="url(#wordGrad)" stroke="${C.ink}" stroke-width="${(word * 0.1).toFixed(0)}"
          paint-order="stroke" stroke-linejoin="round">PLAYMORA</text>
    <text x="548" y="360" font-family="${FONT}" font-size="${tag}" font-weight="700"
          letter-spacing="${(tag * 0.03).toFixed(1)}" fill="${C.blue}">One App. Endless Play.</text>
    <path d="${sparklePath(1540,150,26)}" fill="${C.cyan}"/>
    <path d="${starPath(500,140,34,15)}" fill="${C.goldLight}" stroke="${C.ink}" stroke-width="8" stroke-linejoin="round"/>`;
  const defs = `
    <linearGradient id="wordGrad" x1="0" y1="0" x2="1" y2="0.4">
      <stop offset="0" stop-color="${C.cyan}"/>
      <stop offset="0.45" stop-color="${C.purple}"/>
      <stop offset="1" stop-color="${C.coral}"/>
    </linearGradient>`;
  return svg(1600, 560, `${mascotDefs()}${floatersDefs()}${defs}`, content);
}

// Stacked logo for splash screens (1024, transparent).
function artSplash() {
  const word = fitFont(M.word, 920, 8);
  const tag = Math.min(52, fitFont(M.tag, 920, 21));
  const content = `
    <g transform="translate(512,470) scale(0.66) translate(-512,-520)" filter="url(#softShadow)">
      ${mascotDefs()}${floatersDefs()}${mascot()}
    </g>
    <text x="512" y="892" text-anchor="middle" font-family="${FONT}" font-size="${word}" font-weight="800"
          letter-spacing="${(word * 0.02).toFixed(1)}" fill="url(#wordGrad2)" stroke="${C.ink}"
          stroke-width="${(word * 0.1).toFixed(0)}" paint-order="stroke" stroke-linejoin="round">PLAYMORA</text>
    <text x="512" y="962" text-anchor="middle" font-family="${FONT}" font-size="${tag}" font-weight="700"
          letter-spacing="${(tag * 0.03).toFixed(1)}" fill="${C.blue}">One App. Endless Play.</text>`;
  const defs = `
    <linearGradient id="wordGrad2" x1="0" y1="0" x2="1" y2="0.4">
      <stop offset="0" stop-color="${C.cyan}"/>
      <stop offset="0.5" stop-color="${C.purple}"/>
      <stop offset="1" stop-color="${C.coral}"/>
    </linearGradient>`;
  return svg(1024, 1024, `${mascotDefs()}${floatersDefs()}${defs}`, content);
}

// Android adaptive foreground (512, transparent; mark inside 66% safe zone).
function artAndroidForeground() {
  const content = mascotMark(512, 0.56);
  return svg(512, 512, mascotDefs(), content);
}

// Android adaptive background (512, solid gradient).
function artAndroidBackground() {
  const defs = `
    <linearGradient id="abGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2A2350"/>
      <stop offset="0.5" stop-color="${C.navy}"/>
      <stop offset="1" stop-color="#0A1030"/>
    </linearGradient>
    <radialGradient id="abGlow" cx="0.5" cy="0.4" r="0.75">
      <stop offset="0" stop-color="${C.purple}" stop-opacity="0.5"/>
      <stop offset="1" stop-color="${C.purple}" stop-opacity="0"/>
    </radialGradient>`;
  const content = `<rect width="512" height="512" fill="url(#abGrad)"/><rect width="512" height="512" fill="url(#abGlow)"/>`;
  return svg(512, 512, defs, content);
}

// Monochrome silhouette (transparent; tinted by the OS).
function artMonochrome() {
  const content = mascotMark(1024, 0.56, true);
  return svg(1024, 1024, mascotDefs(), content);
}

// Open Graph / social share card (1200x630, navy background).
function artOg() {
  const word = fitFont(M.word, 600, 8);
  const tag = Math.min(54, fitFont(M.tag, 600, 21));
  const content = `
    <rect width="1200" height="630" fill="url(#ogBg)"/>
    <circle cx="1010" cy="120" r="260" fill="${C.purple}" opacity="0.28"/>
    <circle cx="150" cy="560" r="240" fill="${C.blue}" opacity="0.22"/>
    <g transform="translate(120,315) scale(0.52) translate(-512,-520)" filter="url(#softShadow)">
      ${mascotDefs()}${floatersDefs()}
      ${mascot()}
    </g>
    <text x="560" y="300" font-family="${FONT}" font-size="${word}" font-weight="800"
          letter-spacing="${(word * 0.02).toFixed(1)}" fill="url(#ogWord)" stroke="${C.ink}" stroke-width="${(word * 0.1).toFixed(0)}"
          paint-order="stroke" stroke-linejoin="round">PLAYMORA</text>
    <text x="566" y="392" font-family="${FONT}" font-size="${tag}" font-weight="700"
          letter-spacing="${(tag * 0.03).toFixed(1)}" fill="${C.blue}">One App. Endless Play.</text>
    <path d="${starPath(1128,150,40,18)}" fill="${C.goldLight}" stroke="${C.ink}" stroke-width="8" stroke-linejoin="round"/>
    <path d="${sparklePath(1120,470,30)}" fill="${C.cyan}"/>`;
  const defs = `
    <linearGradient id="ogBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1A2145"/>
      <stop offset="0.55" stop-color="${C.navy}"/>
      <stop offset="1" stop-color="#0A1030"/>
    </linearGradient>
    <linearGradient id="ogWord" x1="0" y1="0" x2="1" y2="0.4">
      <stop offset="0" stop-color="${C.cyan}"/>
      <stop offset="0.5" stop-color="${C.purple}"/>
      <stop offset="1" stop-color="${C.coral}"/>
    </linearGradient>`;
  return svg(1200, 630, `${mascotDefs()}${floatersDefs()}${defs}`, content);
}

function svg(w, h, defs, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<defs>${defs}</defs>${body}</svg>`;
}

// ---------------------------------------------------------------------------
// Render pipeline: headless Brave + CDP
// ---------------------------------------------------------------------------
const BRAVE = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';

async function connect(port) {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (r.ok) {
        const targets = await r.json();
        const pg = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
        if (pg) return pg.webSocketDebuggerUrl;
      }
    } catch {}
    await sleep(250);
  }
  throw new Error('Brave did not expose a page target in time');
}

function cdp(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    let id = 0;
    ws.onopen = () => resolve({
      send: (method, params = {}) => new Promise((res, rej) => {
        const mid = ++id;
        pending.set(mid, { res, rej });
        ws.send(JSON.stringify({ id: mid, method, params }));
      }),
      close: () => ws.close(),
    });
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
      }
    };
    ws.onerror = (e) => reject(new Error('ws error ' + e.message));
  });
}

async function renderPng(page, frameId, svgString, w, h, transparent) {
  await page.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await page.send('Emulation.setDefaultBackgroundColorOverride', {
    color: transparent ? { r: 0, g: 0, b: 0, a: 0 } : { r: 11, g: 15, b: 25, a: 1 },
  });
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>` +
    `html,body{margin:0;padding:0;width:${w}px;height:${h}px;overflow:hidden;background:transparent}` +
    `svg{display:block;width:${w}px;height:${h}px}</style></head><body>${svgString}</body></html>`;
  await page.send('Page.setDocumentContent', { frameId, html });
  await page.send('Runtime.evaluate', {
    expression: 'document.fonts && document.fonts.ready',
    awaitPromise: true,
  });
  await sleep(250);
  const { data } = await page.send('Page.captureScreenshot', {
    format: 'png', fromSurface: true, captureBeyondViewport: false,
  });
  return Buffer.from(data, 'base64');
}

async function main() {
  mkdirSync(BRAND, { recursive: true });
  mkdirSync(IMAGES, { recursive: true });

  // 1. write SVG sources
  const svgs = {
    'mascot.svg': artMascot(),
    'app-icon.svg': artIcon({ rounded: true }),
    'icon-fullbleed.svg': artIcon({ rounded: false }),
    'logo-horizontal.svg': artLogoHorizontal(),
    'logo-stacked.svg': artSplash(),
    'android-foreground.svg': artAndroidForeground(),
    'android-background.svg': artAndroidBackground(),
    'monochrome.svg': artMonochrome(),
    'og.svg': artOg(),
  };
  for (const [name, content] of Object.entries(svgs)) {
    writeFileSync(path.join(BRAND, name), content);
  }
  console.log('wrote', Object.keys(svgs).join(', '));

  // 2. launch Brave headless with a temp profile
  const profile = path.join(os.tmpdir(), 'playmora-brand-chrome');
  rmSync(profile, { recursive: true, force: true });
  const port = 9333;
  const child = spawn(BRAVE, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
    '--force-color-profile=srgb', '--disable-lcd-text', 'about:blank',
  ], { stdio: 'ignore' });

  try {
    const wsUrl = await connect(port);
    const page = await cdp(wsUrl);
    await page.send('Page.enable');
    const { frameTree } = await page.send('Page.getFrameTree');
    const frameId = frameTree.frame.id;

    // Measure font metrics
    const MEAS = `(() => {
      const c = document.createElement('canvas').getContext('2d');
      let F = '800 100px "Arial Rounded MT Bold","SF Pro Rounded","Avenir Next Rounded",system-ui,sans-serif';
      c.font = F;
      const word = c.measureText('PLAYMORA').width / 100;
      F = '700 100px "Arial Rounded MT Bold","SF Pro Rounded","Avenir Next Rounded",system-ui,sans-serif';
      c.font = F;
      const tag = c.measureText('One App. Endless Play.').width / 100;
      const ok = document.fonts && document.fonts.check('800 100px "Arial Rounded MT Bold"');
      return JSON.stringify({ word, tag, ok });
    })()`;
    const mres = await page.send('Runtime.evaluate', { expression: MEAS, awaitPromise: true, returnByValue: true });
    try { M = Object.assign(M, JSON.parse(mres.result.value)); console.log('metrics', M); } catch {}

    // 3. render the required PNGs  [svgKey, outPath, w, h, transparent]
    const jobs = [
      ['icon-fullbleed.svg', path.join(IMAGES, 'icon.png'), 1024, 1024, false],
      ['logo-stacked.svg', path.join(IMAGES, 'splash-icon.png'), 1024, 1024, true],
      ['app-icon.svg', path.join(IMAGES, 'favicon.png'), 48, 48, true],
      ['android-foreground.svg', path.join(IMAGES, 'android-icon-foreground.png'), 512, 512, true],
      ['android-background.svg', path.join(IMAGES, 'android-icon-background.png'), 512, 512, false],
      ['monochrome.svg', path.join(IMAGES, 'android-icon-monochrome.png'), 432, 432, true],
      // extra marketing/brand exports (rounded corners, transparent outside)
      ['app-icon.svg', path.join(BRAND, 'playmora-app-icon-1024.png'), 1024, 1024, true],
      ['app-icon.svg', path.join(BRAND, 'playmora-app-icon-512.png'), 512, 512, true],
      ['logo-horizontal.svg', path.join(BRAND, 'playmora-logo-horizontal.png'), 1600, 560, true],
      ['og.svg', path.join(BRAND, 'playmora-logo-og-1200x630.png'), 1200, 630, false],
      ['mascot.svg', path.join(BRAND, 'playmora-mascot-1024.png'), 1024, 1024, true],
      ['logo-stacked.svg', path.join(BRAND, 'playmora-splash-1024.png'), 1024, 1024, true],
      ['monochrome.svg', path.join(BRAND, 'playmora-monochrome-432.png'), 432, 432, true],
    ];

    for (const [key, out, w, h, transparent] of jobs) {
      const buf = await renderPng(page, frameId, svgs[key], w, h, transparent);
      await writeFile(out, buf);
      console.log('  rendered', path.relative(ROOT, out), `${buf.length} bytes`);
    }

    page.close();
  } finally {
    child.kill('SIGKILL');
  }
  console.log('done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
