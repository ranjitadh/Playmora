import {
  MAX_GUESSES,
  evaluateGuess,
  isValidWord,
  keyboardStatus,
  outcome,
  pickSecret,
} from '../src/games/implementations/word-guess/wordGuessLogic';

describe('Word Guess — evaluation', () => {
  it('marks a fully correct guess green', () => {
    expect(evaluateGuess('apple', 'apple')).toEqual(['correct', 'correct', 'correct', 'correct', 'correct']);
  });

  it('marks a misplaced letter yellow and unknown grey', () => {
    const r = evaluateGuess('apple', 'clean');
    expect(r[0]).toBe('absent'); // c not in apple
    expect(r[1]).toBe('present'); // l in word, wrong spot
    expect(r[2]).toBe('present'); // e in word, wrong spot
    expect(r[3]).toBe('present'); // a in word, wrong spot
    expect(r[4]).toBe('absent'); // n not in apple
  });

  it('handles repeated letters correctly', () => {
    // secret has one 'o'; guess has two -> second 'o' is absent
    const r = evaluateGuess('phone', 'blood');
    expect(r).toEqual(['absent', 'absent', 'correct', 'absent', 'absent']);
  });

  it('does not over-count a repeated secret letter', () => {
    // apple has two p's; both are matched, no spurious presentes
    const r = evaluateGuess('apple', 'ppppp');
    expect(r.filter((x) => x === 'correct').length).toBe(2);
    expect(r.filter((x) => x === 'present').length).toBe(0);
  });

  it('is case-insensitive', () => {
    expect(evaluateGuess('APPLE', 'apple')).toEqual(evaluateGuess('apple', 'apple'));
  });
});

describe('Word Guess — validity', () => {
  it('accepts list words of the right length only', () => {
    expect(isValidWord('apple')).toBe(true);
    expect(isValidWord('APPLE')).toBe(true);
    expect(isValidWord('zzzzz')).toBe(false);
    expect(isValidWord('four')).toBe(false);
  });

  it('picks a secret from the list', () => {
    const s = pickSecret();
    expect(isValidWord(s)).toBe(true);
  });
});

describe('Word Guess — keyboard and outcome', () => {
  it('keeps the best status per letter', () => {
    const kb = keyboardStatus('apple', ['pales', 'apple']);
    expect(kb['a']).toBe('correct');
    expect(kb['e']).toBe('correct');
    expect(kb['s']).toBe('absent');
  });

  it('detects win, ongoing and loss', () => {
    expect(outcome('apple', ['apple'])).toBe('won');
    expect(outcome('apple', ['pales'])).toBe('in_progress');
    expect(outcome('apple', new Array(MAX_GUESSES).fill('pales'))).toBe('lost');
  });
});
