import {
  MTile,
  MahjongState,
  createMahjong,
  freeTiles,
  hasMoves,
  isFree,
  liveTiles,
  remaining,
  selectTile,
} from '../src/games/implementations/mahjong-solitaire/mahjongLogic';

const tile = (id: number, x: number, y: number, layer: number, symbol: number, removed = false): MTile => ({
  id,
  x,
  y,
  layer,
  symbol,
  removed,
});

describe('Mahjong — setup', () => {
  it('lays out tiles in matching pairs', () => {
    const s = createMahjong();
    expect(s.tiles.length % 2).toBe(0);
    expect(s.tiles.length).toBeGreaterThan(20);
    const counts = new Map<number, number>();
    for (const t of s.tiles) counts.set(t.symbol, (counts.get(t.symbol) ?? 0) + 1);
    expect([...counts.values()].every((c) => c === 2)).toBe(true);
  });

  it('always starts with at least one move', () => {
    expect(hasMoves(createMahjong().tiles)).toBe(true);
  });
});

describe('Mahjong — freedom rule', () => {
  it('a lone tile is free', () => {
    const tiles = [tile(0, 0, 0, 0, 1)];
    expect(isFree(tiles, tiles[0])).toBe(true);
  });

  it('a covered tile is not free', () => {
    const tiles = [tile(0, 0, 0, 0, 1), tile(1, 0, 0, 1, 2)];
    expect(isFree(tiles, tiles[0])).toBe(false);
    expect(isFree(tiles, tiles[1])).toBe(true);
  });

  it('a tile boxed in on both sides is not free, but one open side frees it', () => {
    const boxed = [tile(0, 0, 0, 0, 1), tile(1, 1, 0, 0, 2), tile(2, 2, 0, 0, 3)];
    expect(isFree(boxed, boxed[1])).toBe(false);
    const open = [tile(0, 0, 0, 0, 1), tile(1, 1, 0, 0, 2)];
    expect(isFree(open, open[1])).toBe(true);
  });
});

describe('Mahjong — selection', () => {
  it('matches and removes two free tiles of the same symbol', () => {
    let s: MahjongState = { tiles: [tile(0, 0, 0, 0, 1), tile(1, 5, 0, 0, 1)], selected: null, outcome: 'in_progress' as const };
    s = selectTile(s, 0);
    expect(s.selected).toBe(0);
    s = selectTile(s, 1);
    expect(s.selected).toBeNull();
    expect(liveTiles(s.tiles)).toHaveLength(0);
    expect(s.outcome).toBe('win');
  });

  it('switches selection when symbols differ', () => {
    let s: MahjongState = { tiles: [tile(0, 0, 0, 0, 1), tile(1, 5, 0, 0, 2)], selected: null, outcome: 'in_progress' as const };
    s = selectTile(s, 0);
    s = selectTile(s, 1);
    expect(s.selected).toBe(1);
    expect(liveTiles(s.tiles)).toHaveLength(2);
  });

  it('ignores tiles that are not free', () => {
    const tiles = [tile(0, 0, 0, 0, 1), tile(1, 1, 0, 0, 2), tile(2, 2, 0, 0, 3)];
    const s = { tiles, selected: null, outcome: 'in_progress' as const };
    expect(selectTile(s, 1).selected).toBeNull();
  });

  it('deselects when the same tile is tapped twice', () => {
    const tiles = [tile(0, 0, 0, 0, 1), tile(1, 5, 0, 0, 1)];
    let s: MahjongState = { tiles, selected: null, outcome: 'in_progress' as const };
    s = selectTile(s, 0);
    s = selectTile(s, 0);
    expect(s.selected).toBeNull();
  });
});

describe('Mahjong — board helpers', () => {
  it('counts remaining tiles and reports when no moves exist', () => {
    const s = createMahjong();
    expect(remaining(s)).toBe(s.tiles.length);
    expect(freeTiles(s.tiles).length).toBeGreaterThan(0);
    const stuck = [tile(0, 0, 0, 0, 1), tile(1, 5, 0, 0, 2)];
    expect(hasMoves(stuck)).toBe(false);
  });
});
