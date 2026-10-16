/**
 * Pure "Math Rush" logic. Generates arithmetic problems scaled by level.
 */

export type Op = '+' | '-' | '*';
export interface Problem {
  a: number;
  b: number;
  op: Op;
  answer: number;
}

export const OP_SYMBOL: Record<Op, string> = { '+': '+', '-': '−', '*': '×' };

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function createProblem(level: number): Problem {
  const lvl = Math.max(1, Math.min(5, level));
  const ops: Op[] = lvl <= 1 ? ['+', '-'] : lvl <= 2 ? ['+', '-', '*'] : ['+', '-', '*'];
  const op = ops[randInt(0, ops.length - 1)];

  if (op === '*') {
    const max = lvl <= 2 ? 5 : lvl <= 4 ? 9 : 12;
    const a = randInt(2, max);
    const b = randInt(2, max);
    return { a, b, op, answer: a * b };
  }

  const max = lvl <= 1 ? 10 : lvl <= 3 ? 25 : 50;
  let a = randInt(1, max);
  let b = randInt(1, max);
  if (op === '-' && b > a) [a, b] = [b, a]; // keep the answer non-negative
  return { a, b, op, answer: op === '+' ? a + b : a - b };
}

export function formatProblem(p: Problem): string {
  return `${p.a} ${OP_SYMBOL[p.op]} ${p.b}`;
}

export function checkAnswer(p: Problem, value: number): boolean {
  return value === p.answer;
}

/** Score awarded for a correct answer — faster and higher-level answers score more. */
export function scoreForAnswer(level: number, timeLeftRatio: number): number {
  const base = 10 * Math.max(1, Math.min(5, level));
  return Math.round(base * (0.5 + 0.5 * Math.max(0, Math.min(1, timeLeftRatio))));
}
