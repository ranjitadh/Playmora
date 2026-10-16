import {
  checkAnswer,
  createProblem,
  formatProblem,
  scoreForAnswer,
} from '../src/games/implementations/math-rush/mathRushLogic';

describe('Math Rush — problem generation', () => {
  it('always produces the arithmetic answer', () => {
    for (let i = 0; i < 200; i++) {
      const p = createProblem((i % 5) + 1);
      if (p.op === '+') expect(p.answer).toBe(p.a + p.b);
      else if (p.op === '-') expect(p.answer).toBe(p.a - p.b);
      else expect(p.answer).toBe(p.a * p.b);
    }
  });

  it('never produces a negative subtraction result', () => {
    for (let i = 0; i < 200; i++) {
      const p = createProblem(2);
      if (p.op === '-') expect(p.answer).toBeGreaterThanOrEqual(0);
    }
  });

  it('level 1 only uses addition and subtraction', () => {
    for (let i = 0; i < 100; i++) {
      expect(['+', '-']).toContain(createProblem(1).op);
    }
  });

  it('formats problems with symbols', () => {
    expect(formatProblem({ a: 3, b: 4, op: '*', answer: 12 })).toBe('3 × 4');
    expect(formatProblem({ a: 9, b: 2, op: '-', answer: 7 })).toBe('9 − 2');
  });
});

describe('Math Rush — checking and scoring', () => {
  it('accepts the correct answer only', () => {
    const p = { a: 6, b: 7, op: '+' as const, answer: 13 };
    expect(checkAnswer(p, 13)).toBe(true);
    expect(checkAnswer(p, 12)).toBe(false);
  });

  it('scores more for higher levels and faster answers', () => {
    expect(scoreForAnswer(3, 1)).toBeGreaterThan(scoreForAnswer(3, 0));
    expect(scoreForAnswer(5, 1)).toBeGreaterThan(scoreForAnswer(1, 1));
  });
});
