import { slideRow, hasMovesRemaining } from '../src/games/implementations/number-merge/numberMergeLogic';

describe('Number Merge (2048) Core Game Logic', () => {
  test('Slides non-zero tiles to the left', () => {
    const row = [0, 2, 0, 4];
    const { newRow, scoreGained } = slideRow(row);
    expect(newRow).toEqual([2, 4, 0, 0]);
    expect(scoreGained).toBe(0);
  });

  test('Merges adjacent equal tiles and calculates score gain', () => {
    const row = [2, 2, 4, 8];
    const { newRow, scoreGained } = slideRow(row);
    expect(newRow).toEqual([4, 4, 8, 0]);
    expect(scoreGained).toBe(4);
  });

  test('Double merge in a single row', () => {
    const row = [4, 4, 8, 8];
    const { newRow, scoreGained } = slideRow(row);
    expect(newRow).toEqual([8, 16, 0, 0]);
    expect(scoreGained).toBe(24);
  });

  test('Does not cascade merge three identical numbers into one', () => {
    const row = [2, 2, 2, 0];
    const { newRow, scoreGained } = slideRow(row);
    expect(newRow).toEqual([4, 2, 0, 0]);
    expect(scoreGained).toBe(4);
  });

  test('Correctly identifies remaining valid moves on board', () => {
    // Board with empty cell has moves
    const boardWithEmpty = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 0, 4],
      [4, 2, 4, 2],
    ];
    expect(hasMovesRemaining(boardWithEmpty)).toBe(true);

    // Full board with adjacent horizontal match has moves
    const boardWithHorizontalMatch = [
      [2, 4, 2, 4],
      [4, 2, 2, 8],
      [8, 16, 32, 64],
      [2, 4, 8, 16],
    ];
    expect(hasMovesRemaining(boardWithHorizontalMatch)).toBe(true);

    // Full board with adjacent vertical match has moves
    const boardWithVerticalMatch = [
      [2, 4, 8, 16],
      [32, 4, 64, 128],
      [256, 512, 1024, 2],
      [4, 8, 16, 32],
    ];
    expect(hasMovesRemaining(boardWithVerticalMatch)).toBe(true);

    // Completely locked board has no moves
    const lockedBoard = [
      [2, 4, 8, 16],
      [32, 64, 128, 256],
      [512, 1024, 2, 4],
      [8, 16, 32, 64],
    ];
    expect(hasMovesRemaining(lockedBoard)).toBe(false);
  });
});
