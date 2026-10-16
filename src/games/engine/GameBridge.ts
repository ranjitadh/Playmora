export type AllowedBridgeMessageType =
  | 'GAME_READY'
  | 'GAME_STARTED'
  | 'GAME_PAUSED'
  | 'GAME_RESUMED'
  | 'GAME_OVER'
  | 'SCORE_UPDATED'
  | 'REQUEST_RESTART'
  | 'REQUEST_EXIT';

export interface BridgeMessage {
  type: AllowedBridgeMessageType;
  payload?: any;
}

const ALLOWED_TYPES = new Set<AllowedBridgeMessageType>([
  'GAME_READY',
  'GAME_STARTED',
  'GAME_PAUSED',
  'GAME_RESUMED',
  'GAME_OVER',
  'SCORE_UPDATED',
  'REQUEST_RESTART',
  'REQUEST_EXIT',
]);

export function parseAndValidateBridgeMessage(raw: unknown): BridgeMessage | null {
  try {
    let parsed: any = raw;
    if (typeof raw === 'string') {
      parsed = JSON.parse(raw);
    }
    if (typeof parsed !== 'object' || parsed === null) return null;
    if (!ALLOWED_TYPES.has(parsed.type)) return null;

    return {
      type: parsed.type,
      payload: parsed.payload ?? null,
    };
  } catch {
    return null;
  }
}
