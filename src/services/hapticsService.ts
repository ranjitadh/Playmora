import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

class HapticsService {
  private enabled: boolean = true;

  constructor() {
    // Bind so methods can be safely passed/detached (e.g. `cond ? hapticsService.success : hapticsService.error`).
    this.setEnabled = this.setEnabled.bind(this);
    this.isEnabled = this.isEnabled.bind(this);
    this.lightImpact = this.lightImpact.bind(this);
    this.mediumImpact = this.mediumImpact.bind(this);
    this.heavyImpact = this.heavyImpact.bind(this);
    this.success = this.success.bind(this);
    this.error = this.error.bind(this);
    this.selection = this.selection.bind(this);
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public async lightImpact() {
    if (!this.enabled || Platform.OS === 'web') return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics unavailable on some hardware
    }
  }

  public async mediumImpact() {
    if (!this.enabled || Platform.OS === 'web') return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Haptics unavailable on some hardware
    }
  }

  public async heavyImpact() {
    if (!this.enabled || Platform.OS === 'web') return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      // Haptics unavailable on some hardware
    }
  }

  public async success() {
    if (!this.enabled || Platform.OS === 'web') return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Haptics unavailable
    }
  }

  public async error() {
    if (!this.enabled || Platform.OS === 'web') return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // Haptics unavailable
    }
  }

  public async selection() {
    if (!this.enabled || Platform.OS === 'web') return;
    try {
      await Haptics.selectionAsync();
    } catch {
      // Haptics unavailable
    }
  }
}

export const hapticsService = new HapticsService();
