/**
 * Pure Word Guess (Wordle-style) logic. No RN dependencies.
 */

import { WORD_SET, WORDS } from './wordList';

export type LetterStatus = 'correct' | 'present' | 'absent';
export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

export interface KeyStatus {
  [letter: string]: LetterStatus;
}

const rank: Record<LetterStatus, number> = { absent: 0, present: 1, correct: 2 };

export function isValidWord(guess: string): boolean {
  return guess.length === WORD_LENGTH && WORD_SET.has(guess.toLowerCase());
}

export function pickSecret(): string {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

/** Scores a guess against the secret, handling repeated letters correctly. */
export function evaluateGuess(secret: string, guess: string): LetterStatus[] {
  const s = secret.toLowerCase();
  const g = guess.toLowerCase();
  const result: LetterStatus[] = new Array(WORD_LENGTH).fill('absent');
  const counts: Record<string, number> = {};

  for (let i = 0; i < WORD_LENGTH; i++) counts[s[i]] = (counts[s[i]] ?? 0) + 1;

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (g[i] === s[i]) {
      result[i] = 'correct';
      counts[g[i]] -= 1;
    }
  }
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === 'correct') continue;
    if ((counts[g[i]] ?? 0) > 0) {
      result[i] = 'present';
      counts[g[i]] -= 1;
    }
  }
  return result;
}

/** Best-known status per letter across all guesses, for keyboard colouring. */
export function keyboardStatus(secret: string, guesses: string[]): KeyStatus {
  const status: KeyStatus = {};
  for (const guess of guesses) {
    const marks = evaluateGuess(secret, guess);
    for (let i = 0; i < guess.length; i++) {
      const ch = guess[i].toLowerCase();
      const cur = status[ch];
      if (cur === undefined || rank[marks[i]] > rank[cur]) status[ch] = marks[i];
    }
  }
  return status;
}

export type GuessOutcome = 'in_progress' | 'won' | 'lost';

export function outcome(secret: string, guesses: string[]): GuessOutcome {
  if (guesses.some((g) => g.toLowerCase() === secret.toLowerCase())) return 'won';
  if (guesses.length >= MAX_GUESSES) return 'lost';
  return 'in_progress';
}
