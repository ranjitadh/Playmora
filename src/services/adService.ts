export interface AdConfig {
  adsEnabled: boolean;
  bannerAdUnitId: string;
  interstitialAdUnitId: string;
  rewardedAdUnitId: string;
  testMode: boolean;
}

// Official Google AdMob Test Ad Unit IDs for Android
export const GOOGLE_TEST_AD_UNITS = {
  BANNER: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
  REWARDED: 'ca-app-pub-3940256099942544/5224354917',
};

class AdService {
  private config: AdConfig = {
    adsEnabled: false, // Default to false during development / Expo Go
    bannerAdUnitId: GOOGLE_TEST_AD_UNITS.BANNER,
    interstitialAdUnitId: GOOGLE_TEST_AD_UNITS.INTERSTITIAL,
    rewardedAdUnitId: GOOGLE_TEST_AD_UNITS.REWARDED,
    testMode: true,
  };

  private sessionsCompletedSinceLastAd = 0;
  private readonly INTERSTITIAL_FREQUENCY = 3; // Show interstitial at most every 3 completed games

  public setEnabled(enabled: boolean) {
    this.config.adsEnabled = enabled;
  }

  public isEnabled(): boolean {
    return this.config.adsEnabled;
  }

  public onGameSessionCompleted(): boolean {
    this.sessionsCompletedSinceLastAd += 1;
    if (this.sessionsCompletedSinceLastAd >= this.INTERSTITIAL_FREQUENCY) {
      this.sessionsCompletedSinceLastAd = 0;
      return this.showInterstitialIfEligible();
    }
    return false;
  }

  public showInterstitialIfEligible(): boolean {
    if (!this.config.adsEnabled) return false;
    // In production with react-native-google-mobile-ads in custom dev build:
    // InterstitialAd.createForAdRequest(...).show();
    return true;
  }

  public async showRewardedAd(): Promise<boolean> {
    if (!this.config.adsEnabled) {
      // In offline/dev mode without live ads, grant reward immediately
      return true;
    }
    // Present native rewarded ad
    return true;
  }
}

export const adService = new AdService();
