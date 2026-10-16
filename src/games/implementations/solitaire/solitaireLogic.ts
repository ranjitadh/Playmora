/**
 * Pure Klondike Solitaire logic. No RN dependencies.
 *
 * Cards are `{rank, suit, up}` with rank 1..13 (Ace..King) and suits
 * 0 hearts, 1 diamonds, 2 clubs, 3 spades (0-1 red, 2-3 black). Tableau
 * columns build down in alternating colours, foundations build up in a single
 * suit from Ace to King. The stock feeds the waste; an empty stock recycles
 * the waste back so nothing is ever lost.
 */

export const SUITS = 4;
export const RANKS = 13;
export const TABLEAU = 7;

export type Color = 'r' | 'b';

export interface Card {
  rank: number;
  suit: number;
  up: boolean;
}

export interface SolState {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: Card[][];
  score: number;
  moves: number;
  outcome: 'in_progress' | 'won';
}

export function colorOf(card: Card): Color {
  return card.suit < 2 ? 'r' : 'b';
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (let s = 0; s < SUITS; s++) {
    for (let r = 1; r <= RANKS; r++) deck.push({ rank: r, suit: s, up: false });
  }
  return deck;
}

/** Fisher-Yates. Pass `rng` for a deterministic shuffle in tests. */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Deals the standard opening layout: 1..7 cards in the seven columns. */
export function dealSolitaire(rng: () => number = Math.random): SolState {
  const deck = shuffle(createDeck(), rng);
  const tableau: Card[][] = [];
  let cursor = 0;
  for (let col = 0; col < TABLEAU; col++) {
    const colCards = deck.slice(cursor, cursor + col + 1);
    cursor += col + 1;
    colCards.forEach((c, i) => (c.up = i === colCards.length - 1));
    tableau.push(colCards);
  }
  const stock = deck.slice(cursor).map((c) => ({ ...c, up: false }));
  return {
    stock,
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    score: 0,
    moves: 0,
    outcome: 'in_progress',
  };
}

export function canPlaceOnTableau(card: Card, top: Card | undefined): boolean {
  if (!top) return card.rank === RANKS;
  if (!top.up) return false;
  return card.rank === top.rank - 1 && colorOf(card) !== colorOf(top);
}

export function canPlaceOnFoundation(card: Card, top: Card | undefined): boolean {
  if (!top) return card.rank === 1;
  return card.suit === top.suit && card.rank === top.rank + 1;
}

/** True when `cards` (left to right) is a legal descending alternating run. */
export function isValidRun(cards: Card[]): boolean {
  if (cards.length === 0) return false;
  if (cards.some((c) => !c.up)) return false;
  for (let i = 1; i < cards.length; i++) {
    const prev = cards[i - 1];
    const cur = cards[i];
    if (cur.rank !== prev.rank - 1) return false;
    if (colorOf(cur) === colorOf(prev)) return false;
  }
  return true;
}

/** Draws one card from the stock, or recycles an empty stock from the waste. */
export function draw(state: SolState): SolState {
  if (state.stock.length > 0) {
    const stock = state.stock.slice();
    const card = stock.pop() as Card;
    return { ...state, stock, waste: [...state.waste, { ...card, up: true }] };
  }
  if (state.waste.length > 0) {
    const stock = state.waste
      .slice()
      .reverse()
      .map((c) => ({ ...c, up: false }));
    return { ...state, stock, waste: [], score: Math.max(0, state.score - 100), moves: state.moves + 1 };
  }
  return state;
}

function afterMove(state: SolState): SolState {
  const tableau = state.tableau.map((col) => col.slice());
  for (const col of tableau) {
    if (col.length && !col[col.length - 1].up) col[col.length - 1] = { ...col[col.length - 1], up: true };
  }
  const won = state.foundations.every((f) => f.length === RANKS);
  return {
    ...state,
    tableau,
    moves: state.moves + 1,
    outcome: won ? 'won' : 'in_progress',
  };
}

/** Moves the top `count` cards of one tableau column onto another. */
export function moveTableauToTableau(state: SolState, from: number, to: number, count: number): SolState {
  if (from === to) return state;
  const src = state.tableau[from];
  const dst = state.tableau[to];
  if (count < 1 || count > src.length) return state;
  const moving = src.slice(src.length - count);
  if (!isValidRun(moving)) return state;
  const targetTop = dst[dst.length - 1];
  if (targetTop && !canPlaceOnTableau(moving[0], targetTop)) return state;
  if (!targetTop && moving[0].rank !== RANKS) return state;

  const tableau = state.tableau.map((c) => c.slice());
  tableau[from] = src.slice(0, src.length - count);
  tableau[to] = dst.concat(moving);
  return afterMove({ ...state, tableau, score: state.score + (targetTop ? 5 : 0) });
}

/** Moves a card from the waste onto a tableau column. */
export function moveWasteToTableau(state: SolState, to: number): SolState {
  if (state.waste.length === 0) return state;
  const card = state.waste[state.waste.length - 1];
  const dst = state.tableau[to];
  const targetTop = dst[dst.length - 1];
  if (!canPlaceOnTableau(card, targetTop)) return state;
  const waste = state.waste.slice(0, -1);
  const tableau = state.tableau.map((c) => c.slice());
  tableau[to] = dst.concat([card]);
  return afterMove({ ...state, waste, tableau, score: state.score + 5 });
}

/** Moves a tableau column card onto its foundation. */
export function moveTableauToFoundation(state: SolState, from: number): SolState {
  const src = state.tableau[from];
  if (src.length === 0) return state;
  const card = src[src.length - 1];
  const foundation = state.foundations[card.suit];
  const top = foundation[foundation.length - 1];
  if (!canPlaceOnFoundation(card, top)) return state;
  const foundations = state.foundations.map((f, i) => (i === card.suit ? [...f, card] : f));
  const tableau = state.tableau.map((c) => c.slice());
  tableau[from] = src.slice(0, -1);
  return afterMove({ ...state, foundations, tableau, score: state.score + 10 });
}

/** Moves a card from the waste onto its foundation. */
export function moveWasteToFoundation(state: SolState): SolState {
  if (state.waste.length === 0) return state;
  const card = state.waste[state.waste.length - 1];
  const foundation = state.foundations[card.suit];
  const top = foundation[foundation.length - 1];
  if (!canPlaceOnFoundation(card, top)) return state;
  const foundations = state.foundations.map((f, i) => (i === card.suit ? [...f, card] : f));
  const waste = state.waste.slice(0, -1);
  return afterMove({ ...state, foundations, waste, score: state.score + 10 });
}

/** Moves a foundation card back down onto a tableau column. */
export function moveFoundationToTableau(state: SolState, from: number, to: number): SolState {
  const foundation = state.foundations[from];
  if (foundation.length === 0) return state;
  const card = foundation[foundation.length - 1];
  const dst = state.tableau[to];
  const targetTop = dst[dst.length - 1];
  if (!canPlaceOnTableau(card, targetTop)) return state;
  const foundations = state.foundations.map((f, i) => (i === from ? f.slice(0, -1) : f));
  const tableau = state.tableau.map((c) => c.slice());
  tableau[to] = dst.concat([card]);
  return afterMove({ ...state, foundations, tableau, score: Math.max(0, state.score - 15) });
}

/** Total cards parked on foundations — handy for progress meters. */
export function foundationCount(state: SolState): number {
  return state.foundations.reduce((sum, f) => sum + f.length, 0);
}

export function isWon(state: SolState): boolean {
  return state.foundations.every((f) => f.length === RANKS);
}
