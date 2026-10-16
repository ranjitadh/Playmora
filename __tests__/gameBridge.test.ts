import { parseAndValidateBridgeMessage } from '../src/games/engine/GameBridge';

describe('WebView Game Bridge Security & Message Validation', () => {
  test('Validates approved game bridge message types', () => {
    const validRaw = JSON.stringify({ type: 'SCORE_UPDATED', payload: { score: 150 } });
    const parsed = parseAndValidateBridgeMessage(validRaw);
    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe('SCORE_UPDATED');
    expect(parsed?.payload?.score).toBe(150);

    const gameOverRaw = JSON.stringify({ type: 'GAME_OVER', payload: { finalScore: 300 } });
    const parsedGameOver = parseAndValidateBridgeMessage(gameOverRaw);
    expect(parsedGameOver?.type).toBe('GAME_OVER');
  });

  test('Rejects unauthorized or malicious messages', () => {
    // Arbitrary command injection attempt
    const malicious1 = JSON.stringify({ type: 'EVAL_CODE', payload: 'alert(1)' });
    expect(parseAndValidateBridgeMessage(malicious1)).toBeNull();

    // Native bridge access attempt
    const malicious2 = JSON.stringify({ type: 'ACCESS_FILESYSTEM' });
    expect(parseAndValidateBridgeMessage(malicious2)).toBeNull();

    // Malformed JSON
    expect(parseAndValidateBridgeMessage('invalid-json{{{')).toBeNull();

    // Null or non-object
    expect(parseAndValidateBridgeMessage(null)).toBeNull();
    expect(parseAndValidateBridgeMessage(12345)).toBeNull();
  });
});
