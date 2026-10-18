import { ProgressRepository } from '../src/database/progressRepository';
import { appDatabase } from '../src/database/database';

describe('ProgressRepository — resumable game snapshots', () => {
  test('saves and loads a snapshot round-trip', async () => {
    const state = { board: [1, 2, 3], moves: 4, nested: { ok: true } };
    await ProgressRepository.saveProgress('minesweeper', state);
    expect(await ProgressRepository.loadProgress('minesweeper')).toEqual(state);
  });

  it('returns null for a game with no saved progress', async () => {
    expect(await ProgressRepository.loadProgress('never-played')).toBeNull();
  });

  it('overwrites an existing snapshot', async () => {
    await ProgressRepository.saveProgress('snake-classic', { score: 10 });
    await ProgressRepository.saveProgress('snake-classic', { score: 25 });
    expect(await ProgressRepository.loadProgress('snake-classic')).toEqual({ score: 25 });
  });

  it('clears saved progress', async () => {
    await ProgressRepository.saveProgress('minesweeper', { foo: 'bar' });
    await ProgressRepository.clearProgress('minesweeper');
    expect(await ProgressRepository.loadProgress('minesweeper')).toBeNull();
  });

  it('returns null when the stored state is corrupt JSON', async () => {
    const db = await appDatabase.getDriver();
    await db.runAsync(
      `INSERT OR REPLACE INTO game_progress (game_id, state, updated_at) VALUES (?, ?, ?)`,
      ['corrupt-game', '{not valid json', Date.now()]
    );
    expect(await ProgressRepository.loadProgress('corrupt-game')).toBeNull();
  });
});