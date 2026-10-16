import {
  ParkingState,
  createParking,
  isParked,
  startParking,
  stepParking,
} from '../src/games/implementations/parking-master/parkingLogic';

const playing = (): ParkingState => startParking(createParking());
const noSteer = { throttle: 0, steer: 0 };

describe('Parking Master — driving', () => {
  it('starts ready and stationary', () => {
    const s = createParking();
    expect(s.status).toBe('ready');
    expect(s.speed).toBe(0);
  });

  it('accelerates forward and reverses', () => {
    expect(stepParking(playing(), 0.05, { throttle: 1, steer: 0 }).speed).toBeGreaterThan(0);
    expect(stepParking(playing(), 0.05, { throttle: -1, steer: 0 }).speed).toBeLessThan(0);
  });

  it('cannot steer while stationary', () => {
    const s = playing();
    expect(stepParking(s, 0.05, { throttle: 0, steer: 1 }).angle).toBe(s.angle);
  });

  it('turns while moving', () => {
    const s = { ...playing(), speed: 0.2 };
    expect(stepParking(s, 0.05, { throttle: 0, steer: 1 }).angle).toBeGreaterThan(s.angle);
    expect(stepParking(s, 0.05, { throttle: 0, steer: -1 }).angle).toBeLessThan(s.angle);
  });

  it('reports parked when aligned and stopped in the bay', () => {
    const s: ParkingState = { ...playing(), ...createParking().target, speed: 0 };
    expect(isParked(s)).toBe(true);
    expect(stepParking(s, 0.001, noSteer).status).toBe('won');
  });

  it('reports not parked when misaligned', () => {
    const s: ParkingState = { ...playing(), x: 0.5, y: 0.24, angle: 0, speed: 0 };
    expect(isParked(s)).toBe(false);
  });
});

describe('Parking Master — fail states', () => {
  it('crashes into an obstacle', () => {
    const s: ParkingState = { ...playing(), x: 0.385, y: 0.28, speed: 0 };
    expect(stepParking(s, 0.001, noSteer).status).toBe('over');
  });

  it('ends when running out of bounds', () => {
    const s: ParkingState = { ...playing(), x: 0.02, y: 0.5, speed: 0 };
    expect(stepParking(s, 0.001, noSteer).status).toBe('over');
  });

  it('ends when the timer expires', () => {
    const s: ParkingState = { ...playing(), timeLeft: 0.01 };
    expect(stepParking(s, 0.05, noSteer).status).toBe('over');
  });
});
