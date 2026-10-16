import {
  JigsawState,
  createJigsaw,
  isSolved,
  placePiece,
  remaining,
  selectPiece,
} from '../src/games/implementations/jigsaw-puzzle/jigsawLogic';

const SIZE = 4;
const TOTAL = SIZE * SIZE;

describe('Jigsaw — setup', () => {
  it('starts with every piece in the tray and no slot filled', () => {
    const s = createJigsaw(SIZE);
    expect(s.tray).toHaveLength(TOTAL);
    expect([...s.tray].sort((a, b) => a - b)).toEqual(Array.from({ length: TOTAL }, (_, i) => i));
    expect(s.placed.every((p) => p === null)).toBe(true);
    expect(s.outcome).toBe('in_progress');
  });
});

describe('Jigsaw — selection', () => {
  it('selects and deselects a tray piece', () => {
    const s = createJigsaw(SIZE);
    const piece = s.tray[0];
    const picked = selectPiece(s, piece);
    expect(picked.selected).toBe(piece);
    expect(selectPiece(picked, piece).selected).toBeNull();
  });
});

describe('Jigsaw — placement', () => {
  it('places a piece only on its home slot', () => {
    let s = createJigsaw(SIZE);
    const piece = 5;
    s = selectPiece(s, piece);
    const wrong = placePiece(s, 6);
    expect(wrong.placed[6]).toBeNull();
    expect(wrong.selected).toBe(piece);

    const right = placePiece(s, piece);
    expect(right.placed[piece]).toBe(piece);
    expect(right.tray).not.toContain(piece);
    expect(right.selected).toBeNull();
    expect(right.moves).toBe(1);
  });

  it('refuses to overwrite a locked slot', () => {
    let s = createJigsaw(SIZE);
    s = placePiece(selectPiece(s, 3), 3);
    // Now select another piece and try slot 3 (occupied)
    const other = s.tray[0];
    s = selectPiece(s, other);
    const blocked = placePiece(s, 3);
    expect(blocked.placed[3]).toBe(3);
    expect(blocked.tray).toContain(other);
  });

  it('counts down the remaining pieces', () => {
    let s = createJigsaw(SIZE);
    for (let i = 0; i < TOTAL; i++) {
      s = placePiece(selectPiece(s, i), i);
    }
    expect(remaining(s)).toBe(0);
    expect(s.outcome).toBe('win');
    expect(isSolved(s)).toBe(true);
  });

  it('ignores placement with nothing selected', () => {
    const s = createJigsaw(SIZE);
    expect(placePiece(s, 0)).toBe(s);
  });
});
