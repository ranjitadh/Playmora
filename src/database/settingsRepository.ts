import { appDatabase } from './database';

export interface AppSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  theme: 'dark' | 'system';
  hasCompletedOnboarding: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
  theme: 'dark',
  hasCompletedOnboarding: true,
};

export class SettingsRepository {
  public static async getSettings(): Promise<AppSettings> {
    const db = await appDatabase.getDriver();
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      `SELECT key, value FROM user_settings`
    );

    const result: AppSettings = { ...DEFAULT_SETTINGS };
    for (const r of rows) {
      if (r.key === 'soundEnabled') result.soundEnabled = r.value === 'true';
      if (r.key === 'hapticsEnabled') result.hapticsEnabled = r.value === 'true';
      if (r.key === 'theme') result.theme = r.value as any;
      if (r.key === 'hasCompletedOnboarding') result.hasCompletedOnboarding = r.value === 'true';
    }
    return result;
  }

  public static async setSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): Promise<void> {
    const db = await appDatabase.getDriver();
    await db.runAsync(`INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)`, [
      key,
      String(value),
    ]);
  }
}
