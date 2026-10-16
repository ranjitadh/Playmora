import { Platform } from 'react-native';

export type SoundEffectType =
  | 'tap'
  | 'pop'
  | 'match'
  | 'score'
  | 'combo'
  | 'game_over'
  | 'victory'
  | 'error'
  | 'countdown'
  | 'dice_roll'
  | 'ladder'
  | 'snake'
  | 'hop';

class AudioService {
  private enabled: boolean = true;
  private audioCtx: any = null;

  constructor() {
    this.setEnabled = this.setEnabled.bind(this);
    this.isEnabled = this.isEnabled.bind(this);
    this.playSound = this.playSound.bind(this);

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      } catch {
        // AudioContext not allowed or not supported yet
      }
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public playSound(type: SoundEffectType) {
    if (!this.enabled) return;

    // Web Audio Synthesizer fallback for instant offline micro-sounds
    if (this.audioCtx) {
      try {
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        const now = this.audioCtx.currentTime;

        switch (type) {
          case 'tap':
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
            break;
          case 'pop':
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
            break;
          case 'match':
          case 'score':
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.setValueAtTime(659.25, now + 0.06); // E5
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
            break;
          case 'combo':
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(554.37, now + 0.05);
            osc.frequency.setValueAtTime(659.25, now + 0.1);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            osc.start(now);
            osc.stop(now + 0.22);
            break;
          case 'game_over':
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.linearRampToValueAtTime(150, now + 0.35);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.35);
            break;
          case 'victory':
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(659.25, now + 0.1);
            osc.frequency.setValueAtTime(783.99, now + 0.2);
            osc.frequency.setValueAtTime(1046.5, now + 0.3);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
            osc.start(now);
            osc.stop(now + 0.45);
            break;
          case 'error':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.setValueAtTime(140, now + 0.1);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
            break;
          case 'dice_roll': {
            // Clatter of a die tumbling across a hard surface.
            for (let i = 0; i < 9; i++) {
              const t = now + i * 0.05 + Math.random() * 0.02;
              const click = this.audioCtx.createOscillator();
              const clickGain = this.audioCtx.createGain();
              click.type = 'square';
              click.frequency.setValueAtTime(260 + Math.random() * 480, t);
              clickGain.gain.setValueAtTime(0.001, t);
              clickGain.gain.exponentialRampToValueAtTime(0.14, t + 0.004);
              clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
              click.connect(clickGain);
              clickGain.connect(this.audioCtx.destination);
              click.start(t);
              click.stop(t + 0.05);
            }
            break;
          }
          case 'ladder': {
            // Rising arpeggio — climbing up.
            const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
            notes.forEach((freq, i) => {
              const t = now + i * 0.07;
              const note = this.audioCtx.createOscillator();
              const noteGain = this.audioCtx.createGain();
              note.type = 'triangle';
              note.frequency.setValueAtTime(freq, t);
              noteGain.gain.setValueAtTime(0.001, t);
              noteGain.gain.exponentialRampToValueAtTime(0.2, t + 0.01);
              noteGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
              note.connect(noteGain);
              noteGain.connect(this.audioCtx.destination);
              note.start(t);
              note.stop(t + 0.17);
            });
            break;
          }
          case 'snake':
            // Sliding downward with a short hiss.
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(720, now);
            osc.frequency.exponentialRampToValueAtTime(130, now + 0.5);
            gain.gain.setValueAtTime(0.14, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
            break;
          case 'hop':
            // Small bounce of a token landing on a square.
            osc.frequency.setValueAtTime(660, now);
            osc.frequency.exponentialRampToValueAtTime(1180, now + 0.07);
            gain.gain.setValueAtTime(0.16, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
            osc.start(now);
            osc.stop(now + 0.09);
            break;
          default:
            break;
        }
      } catch {
        // Fallback silently
      }
    }
  }
}

export const audioService = new AudioService();
