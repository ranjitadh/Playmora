/**
 * Pure Jigsaw puzzle logic. No RN dependencies.
 *
 * A picture is split into size*size pieces. Pieces sit in a tray until placed
 * on their home slot; `placed[slot]` is the piece locked there (or null). A
 * piece can only be placed on its own slot, and the puzzle is solved once the
 * tray is empty and every slot holds its matching piece.
 */

export interface JigsawState {
  size: number;
  tray: number[];
  placed: (number | null)[];
  selected: number | null;
  moves: number;
  outcome: 'in_progress' | 'win';
}

function shuffled<T>(a: T[]): T[] {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createJigsaw(size = 4): JigsawState {
  const total = size * size;
  return {
    size,
    tray: shuffled(Array.from({ length: total }, (_, i) => i)),
    placed: new Array(total).fill(null),
    selected: null,
    moves: 0,
    outcome: 'in_progress',
  };
}

/** Selects a tray piece (toggles off when tapped twice). */
export function selectPiece(state: JigsawState, piece: number): JigsawState {
  if (state.outcome !== 'in_progress' || !state.tray.includes(piece)) return state;
  return { ...state, selected: state.selected === piece ? null : piece };
}

/**
 * Places the selected piece on `slot`. Only the piece's home slot accepts it;
 * any other slot (or an occupied slot) leaves the state unchanged.
 */
export function placePiece(state: JigsawState, slot: number): JigsawState {
  if (state.outcome !== 'in_progress' || state.selected === null) return state;
  if (slot < 0 || slot >= state.placed.length) return state;
  if (state.placed[slot] !== null || state.selected !== slot) return state;

  const placed = state.placed.slice();
  placed[slot] = state.selected;
  const tray = state.tray.filter((p) => p !== state.selected);
  const solved = tray.length === 0;
  return {
    ...state,
    placed,
    tray,
    selected: null,
    moves: state.moves + 1,
    outcome: solved ? 'win' : 'in_progress',
  };
}

export function remaining(state: JigsawState): number {
  return state.tray.length;
}

export function isSolved(state: JigsawState): boolean {
  return state.tray.length === 0 && state.placed.every((p, i) => p === i);
}
