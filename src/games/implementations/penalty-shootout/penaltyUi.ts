/**
 * Pure presentation helpers for the Penalty Shootout primary button, kept out
 * of the component so the "Play Again" restart affordance is unit-testable.
 */

export type PenaltyPhase = 'aim' | 'meter' | 'result' | 'final';

export function penaltyPrimaryLabel(
  phase: PenaltyPhase,
  hasZone: boolean,
  outcomeOver: boolean
): string {
  if (phase === 'aim') return hasZone ? 'Start kick' : 'Pick a corner';
  if (phase === 'meter') return 'Shoot!';
  if (phase === 'result') return outcomeOver ? 'See results' : 'Next kick';
  return 'Play Again';
}

/**
 * The primary button is only disabled while the player still needs to pick a
 * target. It must remain enabled in the final phase so "Play Again" works even
 * when the engine's result modal is dismissed or bypassed.
 */
export function penaltyPrimaryDisabled(phase: PenaltyPhase, hasZone: boolean): boolean {
  return phase === 'aim' && !hasZone;
}
