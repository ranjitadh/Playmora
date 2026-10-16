import {
  TaxiState,
  createTaxi,
  startTaxi,
  stepTaxi,
} from '../src/games/implementations/taxi-driver-challenge/taxiLogic';

const playing = () => startTaxi(createTaxi());
const still = { x: 0, y: 0 };

describe('Taxi Driver — movement', () => {
  it('starts ready at the centre, empty', () => {
    const s = createTaxi();
    expect(s.status).toBe('ready');
    expect(s.carrying).toBe(false);
  });

  it('accelerates in the input direction', () => {
    const right = stepTaxi(playing(), 0.05, { x: 1, y: 0 });
    expect(right.vx).toBeGreaterThan(0);
    expect(right.x).toBeGreaterThan(0.5);
  });

  it('stays inside the city bounds', () => {
    const s: TaxiState = { ...playing(), x: 0.05, vx: -2 };
    expect(stepTaxi(s, 0.05, { x: -1, y: 0 }).x).toBeGreaterThanOrEqual(0.05);
  });
});

describe('Taxi Driver — fares', () => {
  it('picks up a passenger at the pickup point', () => {
    const s: TaxiState = { ...playing(), x: 0.2, y: 0.2, pickup: { x: 0.2, y: 0.2 } };
    expect(stepTaxi(s, 0.001, still).carrying).toBe(true);
  });

  it('delivers a passenger and scores', () => {
    const s: TaxiState = { ...playing(), x: 0.2, y: 0.2, carrying: true, dropoff: { x: 0.2, y: 0.2 } };
    const after = stepTaxi(s, 0.001, still);
    expect(after.delivered).toBe(1);
    expect(after.carrying).toBe(false);
    expect(after.score).toBeGreaterThan(0);
  });

  it('does not deliver without a passenger', () => {
    const s: TaxiState = { ...playing(), x: 0.2, y: 0.2, carrying: false, dropoff: { x: 0.2, y: 0.2 } };
    expect(stepTaxi(s, 0.001, still).delivered).toBe(0);
  });

  it('ends when the clock expires', () => {
    const s: TaxiState = { ...playing(), timeLeft: 0.01 };
    expect(stepTaxi(s, 0.05, still).status).toBe('over');
  });
});
