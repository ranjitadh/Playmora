/**
 * Pure Minesweeper logic. No React Native dependencies.
 */

export interface Cell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
}

export type Board = Cell[][];

export interface MineState {
  board: Board;
  rows: number;
  cols: number;
  mineCount: number;
  status: 'playing' | 'won' | 'lost';
  revealedCount: number;
  flagCount: number;
}

export function createEmptyBoard(rows: number, cols: number): Board {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 }))
  );
}

export function neighbors(r: number, c: number, rows: number, cols: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push([nr, nc]);
    }
  }
  return out;
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

/** Places `mineCount` mines, excluding the safe cell and its neighbours. */
export function placeMines(board: Board, mineCount: number, safeR: number, safeC: number): Board {
  const rows = board.length;
  const cols = board[0].length;
  const next = cloneBoard(board);
  const forbidden = new Set<number>();
  forbidden.add(safeR * cols + safeC);
  for (const [nr, nc] of neighbors(safeR, safeC, rows, cols)) forbidden.add(nr * cols + nc);

  const candidates: number[] = [];
  for (let i = 0; i < rows * cols; i++) if (!forbidden.has(i)) candidates.push(i);

  // Fisher-Yates shuffle then take the first `mineCount`.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  for (let k = 0; k < Math.min(mineCount, candidates.length); k++) {
    const idx = candidates[k];
    next[Math.floor(idx / cols)][idx % cols].mine = true;
  }
  return next;
}

function withAdjacency(board: Board): Board {
  const rows = board.length;
  const cols = board[0].length;
  return board.map((row, r) =>
    row.map((cell, c) => {
      if (cell.mine) return { ...cell, adjacent: 0 };
      let count = 0;
      for (const [nr, nc] of neighbors(r, c, rows, cols)) if (board[nr][nc].mine) count++;
      return { ...cell, adjacent: count };
    })
  );
}

export function createGame(rows: number, cols: number, mineCount: number, safeR: number, safeC: number): MineState {
  const seeded = placeMines(createEmptyBoard(rows, cols), mineCount, safeR, safeC);
  return {
    board: withAdjacency(seeded),
    rows,
    cols,
    mineCount,
    status: 'playing',
    revealedCount: 0,
    flagCount: 0,
  };
}

/** Reveals a cell, flood-filling empty regions. First move is always safe via createGame. */
export function revealCell(state: MineState, r: number, c: number): MineState {
  if (state.status !== 'playing') return state;
  const cell = state.board[r][c];
  if (cell.revealed || cell.flagged) return state;

  const board = cloneBoard(state.board);
  if (cell.mine) {
    board.forEach((row) => row.forEach((cl) => { if (cl.mine) cl.revealed = true; }));
    return { ...state, board, status: 'lost' };
  }

  let revealedCount = state.revealedCount;
  const stack: Array<[number, number]> = [[r, c]];
  while (stack.length) {
    const [cr, cc] = stack.pop()!;
    const current = board[cr][cc];
    if (current.revealed || current.flagged || current.mine) continue;
    current.revealed = true;
    revealedCount++;
    if (current.adjacent === 0) {
      for (const [nr, nc] of neighbors(cr, cc, state.rows, state.cols)) {
        if (!board[nr][nc].revealed) stack.push([nr, nc]);
      }
    }
  }

  const won = revealedCount === state.rows * state.cols - state.mineCount;
  return { ...state, board, revealedCount, status: won ? 'won' : 'playing' };
}

export function toggleFlag(state: MineState, r: number, c: number): MineState {
  if (state.status !== 'playing') return state;
  const cell = state.board[r][c];
  if (cell.revealed) return state;
  const board = cloneBoard(state.board);
  board[r][c].flagged = !board[r][c].flagged;
  const flagCount = state.flagCount + (board[r][c].flagged ? 1 : -1);
  return { ...state, board, flagCount };
}
