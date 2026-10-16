import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'assets', 'games');
const SRC = path.join(ROOT, 'brand', 'game-sources');
const BRAVE = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';

const S = 512;
const R = 116;
const INK = '#2E2A3A';
const SW = 9;
const FONT = 'Arial Rounded MT Bold,system-ui,sans-serif';

// category palette: [background, soft blob]
const CAT = {
  retro: ['#FFF3E0', '#FFE1B8'],
  traditional: ['#EFEAFF', '#DED2FF'],
  racing: ['#FFEAEF', '#FFD2DC'],
  brain: ['#E7F6EC', '#C7ECD3'],
  modern: ['#E6F4FF', '#CBE7FF'],
};

// ---------- primitives ----------
const rect = (x, y, w, h, fill, rx = 18, stroke = INK) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${SW}"` : ''}/>`;
const circle = (cx, cy, r, fill, stroke = INK) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${SW}"` : ''}/>`;
const ring = (cx, cy, r, color, w = SW) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${w}"/>`;
const line = (x1, y1, x2, y2, color = INK, w = SW, cap = 'round') =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${w}" stroke-linecap="${cap}"/>`;
const poly = (pts, fill, stroke = INK) =>
  `<polygon points="${pts}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${SW}" stroke-linejoin="round"` : ''}/>`;
const text = (x, y, str, size, fill = INK, weight = 800) =>
  `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}">${str}</text>`;
const grid = (x, y, size, n, color, w = 6) => {
  let g = '';
  for (let i = 1; i < n; i++) {
    g += line(x + (i * size) / n, y, x + (i * size) / n, y + size, color, w);
    g += line(x, y + (i * size) / n, x + size, y + (i * size) / n, color, w);
  }
  return g;
};
const check = (cx, cy, s, color) =>
  `<path d="M${cx - s} ${cy} l${s * 0.7} ${s * 0.8} l${s * 1.5} -${s * 1.7}" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`;

function frame(cat, inner) {
  const [bg, blob] = CAT[cat];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs><clipPath id="clip"><rect width="${S}" height="${S}" rx="${R}"/></clipPath></defs>
  <g clip-path="url(#clip)">
    <rect width="${S}" height="${S}" fill="${bg}"/>
    <circle cx="380" cy="132" r="150" fill="${blob}" opacity="0.75"/>
    <circle cx="120" cy="410" r="120" fill="${blob}" opacity="0.5"/>
    ${inner}
  </g>
</svg>`;
}

const fourBoard = (cells, opts = {}) => {
  const bx = 96, by = 96, bw = 320, pad = 14, cell = (bw - pad * 3) / 2;
  const cellRect = (c, r, fill, stroke = INK) => {
    const x = bx + pad + c * (cell + pad), y = by + pad + r * (cell + pad);
    return rect(x, y, cell, cell, fill, 22, stroke);
  };
  return `${rect(bx, by, bw, bw, '#FFFFFF', 34)}${rect(bx + 7, by + 7, bw - 14, bw - 14, '#F3F1FB', 28, '')}${cells(cellRect)}${opts.extra || ''}`;
};

// ---------- per-game artwork ----------
const art = {
  'snake-classic': () => frame('retro', `${rect(120, 340, 76, 76, '#22C55E', 22)}${rect(184, 340, 76, 76, '#22C55E', 22)}${rect(248, 312, 76, 76, '#22C55E', 22)}${rect(300, 250, 76, 76, '#22C55E', 22)}${circle(210, 210, 34, '#F43F5E')}${circle(196, 200, 9, '#FFFFFF', '')}${line(210, 176, 214, 150, '#8B5E34', 10)}`),
  pong: () => frame('retro', `${line(256, 90, 256, 422, '#2E2A3A', 5, 'butt')}${rect(96, 300, 26, 120, '#7557E8', 12)}${rect(390, 160, 26, 120, '#F43F5E', 12)}${circle(320, 230, 26, '#F59E0B')}`),
  'brick-breaker': () => frame('retro', `${[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => rect(72 + c * 96, 96 + r * 56, 80, 44, ['#F43F5E', '#F59E0B', '#38BDF8', '#10B981'][c], 12, '')).join('')).join('')}${circle(300, 300, 22, '#FFFFFF')}${rect(200, 400, 130, 26, '#7557E8', 13)}`),
  'pixel-space-shooter': () => frame('retro', `${poly('256,360 200,430 312,430', '#7557E8')}${rect(236, 300, 40, 50, '#38BDF8', 8)}${circle(256, 296, 14, '#38BDF8')}${rect(140, 150, 46, 46, '#10B981', 8)}${rect(233, 130, 46, 46, '#10B981', 8)}${rect(326, 150, 46, 46, '#10B981', 8)}${line(256, 340, 256, 250, '#F59E0B', 8)}${line(170, 250, 170, 220, '#F59E0B', 8)}${line(342, 250, 342, 220, '#F59E0B', 8)}`),
  'maze-chaser': () => frame('retro', `${rect(96, 96, 320, 320, '#1E3A8A', 30)}${grid(96, 96, 320, 8, '#3B5BC7', 5)}${circle(160, 160, 16, '#F59E0B')}${circle(352, 352, 16, '#F59E0B')}${circle(160, 352, 16, '#F59E0B')}${circle(352, 160, 16, '#F59E0B')}<g>${circle(232, 232, 30, '#F43F5E')}${circle(224, 224, 9, '#FFFFFF', '')}</g>`),
  'frog-road-crossing': () => frame('retro', `${rect(0, 200, 512, 112, '#3B4252', 0, '')}${[0, 1, 2].map((i) => rect(40 + i * 160, 248, 90, 12, '#F8F7F4', 0, '')).join('')}${rect(0, 90, 512, 80, '#8B5E34', 0, '')}${rect(0, 340, 512, 80, '#38BDF8', 0, '')}${circle(256, 420, 34, '#22C55E')}${circle(244, 410, 9, '#FFFFFF', '')}`),
  'classic-pinball': () => frame('retro', `${circle(256, 256, 190, '#3B3B54')}${circle(180, 180, 26, '#F59E0B')}${circle(330, 180, 26, '#F43F5E')}${circle(256, 140, 22, '#38BDF8')}${circle(256, 320, 24, '#E5E7EB')}${rect(150, 388, 90, 22, '#10B981', 11)}${rect(272, 388, 90, 22, '#10B981', 11)}`),
  'helicopter-escape': () => frame('retro', `${rect(0, 0, 512, 150, '#4B5563', 0, '')}${rect(0, 362, 512, 150, '#4B5563', 0, '')}${rect(140, 230, 150, 46, '#38BDF8', 16)}${circle(300, 246, 30, '#38BDF8')}${line(300, 210, 300, 176, '#2E2A3A', 10)}${line(250, 176, 350, 176, '#2E2A3A', 10)}`),
  minesweeper: () => frame('retro', `${rect(96, 96, 320, 320, '#F3F1FB', 30)}${grid(96, 96, 320, 4, '#C9C4DA', 6)}${rect(160, 160, 80, 80, '#FFFFFF', 8)}${text(200, 202, '1', 44, '#3B82F6')}${rect(240, 160, 80, 80, '#FFFFFF', 8)}${text(280, 202, '2', 44, '#10B981')}${rect(256, 272, 80, 80, '#FFFFFF', 8)}${circle(296, 312, 18, '#2E2A3A')}${circle(352, 128, 40, '#2E2A3A')}<path d="M352 118 l0 -34 l30 16 z" fill="#F43F5E" stroke="#2E2A3A" stroke-width="6" stroke-linejoin="round"/>`),
  solitaire: () => frame('retro', `${rect(120, 170, 150, 200, '#FFFFFF', 20)}${text(195, 250, 'A', 60, '#F43F5E')}${text(195, 320, '♥', 44, '#F43F5E')}${rect(200, 150, 150, 200, '#FFFFFF', 20)}${text(275, 230, 'K', 60, '#2E2A3A')}${text(275, 300, '♠', 44, '#2E2A3A')}`),
  ludo: () => frame('traditional', `${rect(150, 150, 212, 212, '#FFFFFF', 30)}${circle(256, 256, 40, '#F59E0B')}${circle(206, 206, 22, '#F43F5E')}${circle(206, 306, 22, '#10B981')}${circle(306, 206, 22, '#38BDF8')}${circle(306, 306, 22, '#7557E8')}`),
  'snakes-and-ladders': () => frame('traditional', `${[110, 220, 330].map((y) => rect(300, y, 110, 14, '#8B5E34', 6)).join('')}${rect(300, 100, 16, 360, '#8B5E34', 8)}${rect(406, 100, 16, 360, '#8B5E34', 8)}${`<path d="M120 420 q60 -60 0 -110 q-60 -50 0 -100" fill="none" stroke="#10B981" stroke-width="16" stroke-linecap="round"/>`}${circle(120, 210, 16, '#10B981')}`),
  chess: () => frame('traditional', ''),
  checkers: () => frame('traditional', `${rect(96, 96, 320, 320, '#F3D9B1', 26)}<g clip-path="url(#clip)">${Array.from({ length: 4 }).flatMap((_, r) => Array.from({ length: 4 }).map((__, c) => (((r + c) % 2) ? rect(96 + c * 80, 96 + r * 80, 80, 80, '#B5793F', 0, '') : ''))).join('')}</g>${circle(176, 256, 30, '#EF4444')}${circle(336, 176, 30, '#2E2A3A')}${ring(176, 256, 14, '#FFD9D9', 6)}`),
  'nine-mens-morris': () => frame('traditional', `${rect(96, 96, 320, 320, '#FFFFFF', 26)}${rect(140, 140, 232, 232, '#10B981', 14, '')}${rect(190, 190, 132, 132, '#FFFFFF', 10, '')}${rect(140, 140, 232, 232, 'none', 14, '#2E2A3A')}${circle(256, 140, 14, '#F43F5E')}${circle(190, 190, 14, '#7557E8')}${circle(322, 322, 14, '#F43F5E')}${circle(256, 256, 14, '#7557E8')}`),
  mancala: () => frame('traditional', `${rect(96, 170, 320, 172, '#8B5E34', 86)}${[0, 1, 2, 3, 4, 5].map((i) => circle(150 + i * 42, 256, 16, '#F3E4CF')).join('')}${circle(120, 256, 30, '#F59E0B')}${circle(392, 256, 30, '#10B981')}`),
  backgammon: () => frame('traditional', `${rect(96, 120, 320, 272, '#2E7D5B', 22)}${[0, 1, 2, 3, 4].map((i) => poly(`${120 + i * 64},150 ${152 + i * 64},150 ${136 + i * 64},240`, '#F3E4CF', '')).join('')}${[0, 1, 2, 3, 4].map((i) => poly(`${120 + i * 64},362 ${152 + i * 64},362 ${136 + i * 64},272`, '#EF4444', '')).join('')}${circle(136, 200, 18, '#FFFFFF')}${circle(392, 300, 18, '#FFFFFF')}`),
  reversi: () => frame('traditional', `${rect(96, 96, 320, 320, '#2E7D5B', 30)}${grid(96, 96, 320, 4, '#1B5E43', 5)}${circle(176, 176, 30, '#FFFFFF')}${circle(336, 336, 30, '#2E2A3A')}${circle(336, 176, 30, '#2E2A3A')}${circle(176, 336, 30, '#FFFFFF')}<g transform="translate(256,256)">${circle(0, 0, 30, '#2E2A3A')}<path d="M0 -30 A 30 30 0 0 1 0 30 Z" fill="#FFFFFF" stroke="#2E2A3A" stroke-width="7"/></g>`),
  'tic-tac-toe': () => frame('traditional', `${rect(120, 120, 272, 272, '#FFFFFF', 30)}${grid(120, 120, 272, 3, '#2E2A3A', 12)}${line(150, 150, 214, 214, '#7557E8', 15)}${line(214, 150, 150, 214, '#7557E8', 15)}${ring(256, 182, 32, '#F43F5E', 15)}${line(150, 334, 214, 334, '#7557E8', 15)}${ring(182, 256, 32, '#F43F5E', 15)}`),
  'connect-four': () => frame('traditional', `${rect(96, 120, 320, 300, '#1E3A8A', 30)}${[0, 1, 2, 3, 4].map((c) => [0, 1, 2, 3].map((r) => { const x = 118 + c * 61, y = 142 + r * 61; const col = (r === 3 && c < 4) ? '#EEB421' : (r === 2 && c >= 1 && c <= 3 ? '#EF4444' : '#132A5E'); return circle(x, y, 24, col); }).join('')).join('')}`),
  'traffic-racer': () => frame('racing', `${rect(170, 96, 172, 320, '#3B4252', 24)}${[140, 240, 340].map((y) => rect(250, y, 12, 60, '#F8F7F4', 4, '')).join('')}${rect(196, 300, 46, 90, '#F43F5E', 12)}${rect(272, 180, 46, 90, '#38BDF8', 12)}`),
  'parking-master': () => frame('racing', `${rect(140, 140, 232, 232, 'none', 26, '#F43F5E')}${rect(170, 210, 150, 96, '#7557E8', 20)}${circle(206, 316, 22, '#2E2A3A')}${circle(286, 316, 22, '#2E2A3A')}${rect(196, 230, 60, 40, '#CBE7FF', 8)}`),
  'drift-challenge': () => frame('racing', `${rect(150, 250, 160, 90, '#F59E0B', 18)}${circle(190, 356, 22, '#2E2A3A')}${circle(276, 356, 22, '#2E2A3A')}<path d="M120 360 q60 -30 20 -70" fill="none" stroke="#2E2A3A" stroke-width="8" stroke-linecap="round"/>`),
  'endless-highway': () => frame('racing', `${poly('256,120 200,432 312,432', '#3B4252', '')}${[0, 1, 2].map((i) => rect(252, 160 + i * 90, 10, 46, '#F8F7F4', 4, '')).join('')}${rect(210, 330, 40, 72, '#F43F5E', 12)}`),
  'taxi-driver-challenge': () => frame('racing', `${rect(150, 230, 212, 100, '#F59E0B', 20)}${circle(196, 336, 22, '#2E2A3A')}${circle(316, 336, 22, '#2E2A3A')}${rect(210, 190, 92, 44, '#2E2A3A', 10)}${rect(168, 250, 176, 26, '#CBE7FF', 8)}`),
  'monster-truck-jump': () => frame('racing', `${poly('120,360 220,360 256,300 292,360 392,360', '#8B5E34')}${rect(150, 220, 170, 80, '#7557E8', 18)}${circle(196, 306, 30, '#2E2A3A')}${circle(276, 306, 30, '#2E2A3A')}`),
  'mini-kart-racing': () => frame('racing', `${rect(150, 250, 150, 80, '#F43F5E', 18)}${circle(190, 336, 24, '#2E2A3A')}${circle(262, 336, 24, '#2E2A3A')}${rect(330, 130, 90, 90, '#2E2A3A', 12)}${[[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, b]) => rect(336 + a * 30, 138 + b * 30, 26, 26, (a + b) % 2 ? '#2E2A3A' : '#FFFFFF', 4, '')).join('')}`),
  'car-dodge': () => frame('racing', `${rect(180, 96, 152, 320, '#3B4252', 22)}${[0, 1, 2].map((i) => rect(250, 130 + i * 90, 10, 50, '#F8F7F4', 4, '')).join('')}${rect(226, 300, 60, 100, '#F43F5E', 14)}${rect(226, 140, 60, 100, '#38BDF8', 14)}`),
  'road-crossing-challenge': () => frame('racing', `${rect(96, 200, 320, 120, '#3B4252', 0, '')}${[0, 1, 2, 3].map((i) => rect(120 + i * 80, 240, 50, 40, '#F8F7F4', 6, '')).join('')}${circle(256, 130, 26, '#F59E0B')}${circle(256, 380, 26, '#F59E0B')}`),
  'hill-climb-challenge': () => frame('racing', `<path d="M60 400 q120 -180 240 -40 q80 90 152 40" fill="none" stroke="#8B5E34" stroke-width="14" stroke-linecap="round"/>${rect(210, 250, 110, 60, '#10B981', 16)}${circle(240, 316, 22, '#2E2A3A')}${circle(292, 316, 22, '#2E2A3A')}`),
  '2048': () => frame('brain', fourBoard((cr) => `${cr(0, 0, '#E9D5FF')}${cr(1, 0, '#C4B5FD')}${cr(0, 1, '#A78BFA')}${cr(1, 1, '#22C55E')}${text(179, 179, '2', 76, '#6B21A8')}${text(303, 179, '4', 76, '#5B21B6')}${text(179, 303, '8', 76, '#FFFFFF')}${text(303, 303, '16', 64, '#FFFFFF')}`)),
  sudoku: () => frame('brain', `${rect(120, 120, 272, 272, '#FFFFFF', 24)}${grid(120, 120, 272, 9, '#D8D4E8', 4)}${grid(120, 120, 272, 3, '#2E2A3A', 10)}${text(166, 166, '5', 40, '#7557E8')}${text(256, 166, '3', 40, '#2E2A3A')}${text(346, 256, '7', 40, '#2E2A3A')}${text(166, 346, '9', 40, '#7557E8')}`),
  'memory-card-match': () => frame('brain', `${rect(150, 150, 100, 140, '#FFFFFF', 16)}${rect(164, 164, 72, 112, '#F59E0B', 12)}${star(200, 220, 30, '#FFF6E1')}${rect(262, 210, 100, 140, '#7557E8', 16)}${circle(292, 250, 9, '#B9A7FF')}${circle(332, 310, 9, '#B9A7FF')}${circle(332, 250, 7, '#B9A7FF')}`),
  'sliding-number-puzzle': () => frame('brain', `${rect(120, 120, 272, 272, '#FFFFFF', 24)}${[0, 1, 2].map((r) => [0, 1, 2].map((c) => { if (r === 2 && c === 2) return rect(216 + c * 84 - 6, 216, 84 - 12, 84 - 12, '#F3F1FB', 12, '#D8D4E8'); return rect(132 + c * 84, 132 + r * 84, 72, 72, '#A78BFA', 14); }).join('')).join('')}${text(168, 168, '1', 46, '#FFFFFF')}${text(252, 168, '2', 46, '#FFFFFF')}${text(168, 252, '3', 46, '#FFFFFF')}`),
  'mahjong-solitaire': () => frame('brain', `${rect(140, 220, 90, 120, '#F3E4CF', 12)}${rect(170, 190, 90, 120, '#F3E4CF', 12)}${rect(240, 210, 90, 120, '#F3E4CF', 12)}${rect(280, 180, 90, 120, '#F3E4CF', 12)}${text(300, 260, '🀄', 40)}`),
  'block-puzzle': () => frame('brain', `${[[0, 0], [1, 0], [0, 1]].map(([a, b]) => rect(150 + a * 84, 200 + b * 84, 78, 78, '#F43F5E', 14)).join('')}${[[2, 1], [3, 1], [2, 2], [3, 2]].map(([a, b]) => rect(120 + a * 84, 130 + b * 84, 78, 78, '#7557E8', 14)).join('')}`),
  'word-guess': () => frame('brain', `${[0, 1, 2].map((c) => rect(120 + c * 92, 220, 78, 78, '#FFFFFF', 12)).join('')}${rect(306, 220, 78, 78, '#FFFFFF', 12)}${text(159, 259, 'W', 48, '#10B981')}${text(251, 259, 'O', 48, '#F59E0B')}${text(343, 259, 'R', 48, '#2E2A3A')}`),
  'jigsaw-puzzle': () => frame('brain', `<path d="M180 180 h70 a26 26 0 1 1 40 0 h70 v70 a26 26 0 1 0 0 40 v70 h-70 a26 26 0 1 1 -40 0 h-70 v-70 a26 26 0 1 0 0 -40 z" fill="#10B981" stroke="#2E2A3A" stroke-width="9" stroke-linejoin="round"/>`),
  'lights-out': () => frame('brain', `${[0, 1, 2].map((r) => [0, 1, 2].map((c) => { const on = (r + c) % 2 === 0; return rect(132 + c * 84, 132 + r * 84, 72, 72, on ? '#F59E0B' : '#D8D4E8', 14); }).join('')).join('')}`),
  'math-rush': () => frame('brain', `${rect(120, 150, 272, 212, '#FFFFFF', 26)}${text(256, 210, '7 + 5', 56, '#2E2A3A')}${text(256, 300, '= ?', 56, '#7557E8')}`),
  'flappy-flight': () => frame('modern', `${rect(340, 100, 80, 140, '#10B981', 12)}${rect(340, 300, 80, 130, '#10B981', 12)}${circle(220, 250, 34, '#F59E0B')}${poly('248,250 300,226 300,274', '#F59E0B')}${circle(210, 240, 9, '#FFFFFF', '')}${circle(210, 240, 4, '#2E2A3A', '')}`),
  'stack-tower': () => frame('modern', `${rect(160, 380, 192, 60, '#7557E8', 14)}${rect(180, 316, 152, 60, '#38BDF8', 14)}${rect(200, 252, 112, 60, '#F43F5E', 14)}${rect(220, 188, 72, 60, '#F59E0B', 14)}`),
  'fruit-slice': () => frame('modern', `${circle(180, 320, 46, '#F43F5E')}${circle(300, 300, 42, '#10B981')}${circle(256, 180, 40, '#F59E0B')}${line(120, 400, 400, 140, '#FFFFFF', 10)}`),
  'color-switch': () => frame('modern', `${ring(256, 256, 150, '#F43F5E', 46)}<path d="M256 106 A 150 150 0 0 1 406 256" fill="none" stroke="#38BDF8" stroke-width="46"/><path d="M256 406 A 150 150 0 0 1 106 256" fill="none" stroke="#F59E0B" stroke-width="46"/>${circle(256, 256, 34, '#7557E8')}`),
  'reaction-time-challenge': () => frame('modern', `${circle(256, 256, 150, '#10B981')}${poly('256,150 216,270 256,270 236,360 300,230 256,230', '#FFFFFF')}`),
  'basketball-shots': () => frame('modern', `${rect(180, 160, 200, 20, '#F43F5E', 8)}${rect(300, 170, 14, 120, '#F43F5E', 6)}${ring(280, 300, 44, '#F59E0B', 8)}${circle(180, 340, 34, '#F59E0B')}${line(256, 200, 200, 316, '#2E2A3A', 6)}`),
  'penalty-shootout': () => frame('modern', `${rect(120, 150, 272, 180, 'none', 16, '#FFFFFF')}${grid(120, 150, 272, 4, '#FFFFFF', 5)}${circle(256, 360, 34, '#FFFFFF')}`),
  'bubble-shooter': () => frame('modern', `${circle(200, 200, 34, '#F43F5E')}${circle(268, 200, 34, '#38BDF8')}${circle(336, 200, 34, '#F43F5E')}${circle(234, 268, 34, '#38BDF8')}${circle(302, 268, 34, '#10B981')}${circle(256, 380, 26, '#F59E0B')}`),
  'whack-a-mole': () => frame('modern', `${circle(160, 300, 46, '#8B5E34')}${circle(256, 280, 50, '#A9744F')}${circle(352, 300, 46, '#8B5E34')}${circle(256, 268, 14, '#2E2A3A', '')}${rect(320, 130, 26, 120, '#F59E0B', 10)}${rect(280, 110, 110, 50, '#7557E8', 14)}`),
  'jump-and-dodge': () => frame('modern', `${line(0, 380, 512, 380, '#2E2A3A', 8)}${rect(330, 300, 70, 80, '#F43F5E', 12)}${circle(200, 230, 40, '#7557E8')}${rect(180, 250, 40, 110, '#7557E8', 18)}${line(180, 300, 150, 350, '#7557E8', 14)}${line(220, 300, 250, 350, '#7557E8', 14)}`),
};

// chess needs a valid glyph; define separately (knight-ish silhouette + board square)
art.chess = () => frame('traditional', `${rect(120, 120, 272, 272, '#FFFFFF', 26)}${grid(120, 120, 272, 8, '#D8D4E8', 3)}${circle(256, 300, 66, '#2E2A3A')}${poly('256,150 210,230 240,230 226,290 286,290 272,230 302,230', '#2E2A3A')}${circle(300, 200, 16, '#2E2A3A')}`);

// tiny star helper (used by memory card)
function star(cx, cy, r, fill) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = ((-90 + i * 36) * Math.PI) / 180;
    d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1) + ' ';
  }
  return `<path d="${d}Z" fill="${fill}" stroke="#2E2A3A" stroke-width="6" stroke-linejoin="round"/>`;
}

// ---------- CDP render ----------
async function connect(port) {
  for (let i = 0; i < 50; i++) {
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
    const pending = new Map(); let id = 0;
    ws.onopen = () => resolve({ send: (m, p = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p })); }), close: () => ws.close() });
    ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } };
    ws.onerror = () => reject(new Error('ws'));
  });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(SRC, { recursive: true });
  const profile = path.join(os.tmpdir(), 'gi_' + Date.now());
  rmSync(profile, { recursive: true, force: true });
  const port = 9342;
  const child = spawn(BRAVE, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', '--force-color-profile=srgb', 'about:blank'], { stdio: 'ignore' });
  try {
    const page = await cdp(await connect(port));
    await page.send('Page.enable');
    const { frameTree } = await page.send('Page.getFrameTree');
    const frameId = frameTree.frame.id;
    await page.send('Emulation.setDeviceMetricsOverride', { width: S, height: S, deviceScaleFactor: 1, mobile: false });
    await page.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
    let count = 0;
    for (const [id, fn] of Object.entries(art)) {
      const svg = fn();
      const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;width:${S}px;height:${S}px;background:transparent}svg{display:block;width:${S}px;height:${S}px}</style></head><body>${svg}</body></html>`;
      await page.send('Page.setDocumentContent', { frameId, html });
      await page.send('Runtime.evaluate', { expression: 'document.fonts&&document.fonts.ready', awaitPromise: true });
      await sleep(180);
      const { data } = await page.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
      await writeFile(path.join(OUT, id + '.png'), Buffer.from(data, 'base64'));
      writeFileSync(path.join(SRC, id + '.svg'), svg);
      count++;
    }
    console.log('wrote', count, 'icons');
    page.close();
  } finally { child.kill('SIGKILL'); }
  console.log('done');
}
main().catch((e) => { console.error(e); process.exit(1); });
