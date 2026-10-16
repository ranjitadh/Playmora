import {
  Card,
  RANKS,
  TABLEAU,
  canPlaceOnFoundation,
  canPlaceOnTableau,
  createDeck,
  dealSolitaire,
  draw,
  foundationCount,
  isWon,
  isValidRun,
  moveFoundationToTableau,
  moveTableauToFoundation,
  moveTableauToTableau,
  moveWasteToFoundation,
  moveWasteToTableau,
} from '../src/games/implementations/solitaire/solitaireLogic';

function card(rank: number, suit: number, up = true): Card {
  return { rank, suit, up };
}

describe('solitaire — layout', () => {
  test('createDeck holds 52 unique cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    const keys = new Set(deck.map((c) => `${c.rank}-${c.suit}`));
    expect(keys.size).toBe(52);
  });

  test('deal builds 1..7 columns with only the bottom card face up', () => {
    const s = dealSolitaire();
    expect(s.tableau).toHaveLength(TABLEAU);
    s.tableau.forEach((col, i) => {
      expect(col).toHaveLength(i + 1);
      expect(col[col.length - 1].up).toBe(true);
      expect(col.slice(0, -1).every((c) => !c.up)).toBe(true);
    });
    expect(s.stock).toHaveLength(52 - (TABLEAU * (TABLEAU + 1)) / 2);
    expect(s.waste).toHaveLength(0);
    expect(s.foundations).toHaveLength(4);
    expect(s.foundations.every((f) => f.length === 0)).toBe(true);
    expect(s.outcome).toBe('in_progress');
  });

  test('stock feeds the waste and an empty stock recycles the waste', () => {
    let s = dealSolitaire();
    const stockStart = s.stock.length;
    s = draw(s);
    expect(s.waste).toHaveLength(1);
    expect(s.waste[0].up).toBe(true);
    expect(s.stock).toHaveLength(stockStart - 1);

    while (s.stock.length > 0) s = draw(s);
    expect(s.stock).toHaveLength(0);
    expect(s.waste).toHaveLength(stockStart);

    s = draw(s);
    expect(s.stock).toHaveLength(stockStart);
    expect(s.waste).toHaveLength(0);
    expect(s.score).toBeGreaterThanOrEqual(0);

    s = draw(s);
    expect(s.stock).toHaveLength(stockStart - 1);
    expect(s.waste).toHaveLength(1);
  });
});

describe('solitaire — placement rules', () => {
  test('tableau accepts a same-rank gap only with a King', () => {
    expect(canPlaceOnTableau(card(13, 2), undefined)).toBe(true);
    expect(canPlaceOnTableau(card(12, 2), undefined)).toBe(false);
  });

  test('tableau stacks descending in alternating colours', () => {
    expect(canPlaceOnTableau(card(7, 0), card(8, 3))).toBe(true);
    expect(canPlaceOnTableau(card(7, 1), card(8, 2))).toBe(true);
    expect(canPlaceOnTableau(card(7, 0), card(8, 1))).toBe(false);
    expect(canPlaceOnTableau(card(6, 3), card(8, 0))).toBe(false);
    expect(canPlaceOnTableau(card(9, 0), card(8, 3))).toBe(false);
  });

  test('tableau refuses to stack on a face-down card', () => {
    expect(canPlaceOnTableau(card(7, 0), card(8, 3, false))).toBe(false);
  });

  test('foundation builds Ace up in one suit', () => {
    expect(canPlaceOnFoundation(card(1, 0), undefined)).toBe(true);
    expect(canPlaceOnFoundation(card(2, 0), card(1, 0))).toBe(true);
    expect(canPlaceOnFoundation(card(3, 1), card(2, 0))).toBe(false);
    expect(canPlaceOnFoundation(card(4, 0), card(2, 0))).toBe(false);
    expect(canPlaceOnFoundation(card(13, 0), card(1, 0))).toBe(false);
  });

  test('isValidRun checks alternating descending order', () => {
    expect(isValidRun([card(10, 0), card(9, 3), card(8, 0)])).toBe(true);
    expect(isValidRun([card(10, 0), card(9, 0)])).toBe(false);
    expect(isValidRun([card(10, 0), card(8, 3)])).toBe(false);
    expect(isValidRun([card(10, 0, false), card(9, 3)])).toBe(false);
    expect(isValidRun([])).toBe(false);
  });
});

describe('solitaire — moves', () => {
  test('moves a tableau run onto another column and flips the new top', () => {
    let s = dealSolitaire();
    // Build a clean scenario: col0 has a single red 10, col1 ends black J.
    s = {
      ...s,
      tableau: [
        [card(12, 0)],
        [card(13, 2, false), card(11, 3), card(10, 0)],
      ],
      waste: [],
      stock: [],
    };
    const out = moveTableauToTableau(s, 1, 0, 2);
    expect(out.tableau[0]).toHaveLength(3);
    expect(out.tableau[1]).toHaveLength(1);
    expect(out.tableau[1][0].up).toBe(true);
    expect(out.moves).toBe(1);
  });

  test('rejects an illegal tableau move', () => {
    const s: ReturnType<typeof dealSolitaire> = {
      ...dealSolitaire(),
      tableau: [[card(10, 0)], [card(11, 2)]],
    };
    expect(moveTableauToTableau(s, 1, 0, 1).tableau[0]).toHaveLength(1);
  });

  test('moves waste onto tableau and onto the foundation', () => {
    let s = dealSolitaire();
    s = {
      ...s,
      tableau: [[card(13, 2), card(12, 3)]],
      waste: [card(11, 0)],
      stock: [],
    };
    const toTab = moveWasteToTableau(s, 0);
    expect(toTab.tableau[0]).toHaveLength(3);
    expect(toTab.waste).toHaveLength(0);

    const toFound: ReturnType<typeof dealSolitaire> = {
      ...dealSolitaire(),
      tableau: [[]],
      waste: [card(1, 2)],
      stock: [],
    };
    const done = moveWasteToFoundation(toFound);
    expect(done.foundations[2]).toHaveLength(1);
    expect(done.waste).toHaveLength(0);
  });

  test('moves tableau top onto foundation and counts it', () => {
    const s: ReturnType<typeof dealSolitaire> = {
      ...dealSolitaire(),
      tableau: [[card(1, 1)]],
      foundations: [[], [], [], []],
    };
    const out = moveTableauToFoundation(s, 0);
    expect(out.foundations[1]).toHaveLength(1);
    expect(out.tableau[0]).toHaveLength(0);
    expect(foundationCount(out)).toBe(1);
  });

  test('moves a foundation card back down to a tableau column', () => {
    const s: ReturnType<typeof dealSolitaire> = {
      ...dealSolitaire(),
      tableau: [[card(8, 0)]],
      foundations: [[card(7, 2)], [], [], []],
    };
    const out = moveFoundationToTableau(s, 0, 0);
    expect(out.foundations[0]).toHaveLength(0);
    expect(out.tableau[0]).toHaveLength(2);
  });

  test('detects a win when all four foundations are complete', () => {
    const s: ReturnType<typeof dealSolitaire> = {
      ...dealSolitaire(),
      foundations: [
        Array.from({ length: RANKS }, (_, i) => card(i + 1, 0)),
        Array.from({ length: RANKS }, (_, i) => card(i + 1, 1)),
        Array.from({ length: RANKS }, (_, i) => card(i + 1, 2)),
        Array.from({ length: RANKS }, (_, i) => card(i + 1, 3)),
      ],
      tableau: [[], [], [], [], [], [], []],
    };
    expect(isWon(s)).toBe(true);
    expect(foundationCount(s)).toBe(52);
  });
});
