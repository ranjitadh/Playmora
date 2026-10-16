import {
  createShuffled,
  createSolved,
  blankIndex,
  countInversions,
  isSolved,
  isSolvable,
  move,
} from '../src/games/implementations/sliding-number-puzzle/slidingPuzzleLogic';

describe('Sliding Puzzle — setup', () => {
  it('creates a solved 3x3 board', () => {
    const b = createSolved(3);
    expect(b).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]);
    expect(isSolved(b)).toBe(true);
    expect(blankIndex(b)).toBe(8);
  });
});

describe('Sliding Puzzle — moves', () => {
  it('slides a tile into the blank', () => {
    const b = createSolved(3); // blank at index 8
    const moved = move(b, 'up'); // swap with 6
    expect(moved[8]).toBe(6);
    expect(moved[5]).toBe(0);
  });

  it('rejects moves that leave the board', () => {
    const b = createSolved(3);
    expect(move(b, 'down')).toBe(b);
    expect(move(b, 'right')).toBe(b);
  });

  it('moving and reversing returns to the original', () => {
    const b = createSolved(3);
    const moved = move(b, 'up');
    expect(move(moved, 'down')).toEqual(b);
  });
});

describe('Sliding Puzzle — solvability', () => {
  it('solved is solvable', () => {
    expect(isSolvable(createSolved(3))).toBe(true);
    expect(isSolvable(createSolved(4))).toBe(true);
  });

  it('detects the classic unsolvable 8-puzzle', () => {
    // Swapping two tiles (7 and 8) makes an odd-width puzzle unsolvable.
    const b = [1, 2, 3, 4, 5, 6, 8, 7, 0];
    expect(countInversions(b)).toBe(1);
    expect(isSolvable(b)).toBe(false);
  });

  it('generated shuffles are always solvable and not solved', () => {
    for (let i = 0; i < 25; i++) {
      const b = createShuffled(3, 40);
      expect(isSolvable(b)).toBe(true);
      expect(isSolved(b)).toBe(false);
      const b4 = createShuffled(4, 60);
      expect(isSolvable(b4)).toBe(true);
    }
  });
});
