export enum DeviceType {
  TV = 'TV',
  DESKTOP = 'DESKTOP',
  MOBILE = 'MOBILE',
}

export enum AdFormatType {
  NON_SKIPPABLE_BRAND = 'NON_SKIPPABLE_BRAND',
  SKIPPABLE_BRAND = 'SKIPPABLE_BRAND',
  SKIPPABLE_PERFORMANCE = 'SKIPPABLE_PERFORMANCE',
  SQUEEZEBACK_QR = 'SQUEEZEBACK_QR',
}

export interface Scene {
  id: string;
  type: 'CONTENT' | 'AD';
  youtubeUrl: string;
  startTime?: number; // in seconds
  duration?: number; // for ads, if we want to force a duration or just use video length
  contentDuration?: number; // how long to play content before moving to next scene
  adFormat?: AdFormatType;
  skipOffset?: number; // seconds before skip button appears
  ctaText?: string; // for performance ads
  displayUrl?: string; // for performance ads
  headline?: string; // for performance ads
  advertiserLogoUrl?: string; // for performance ads
}

export interface SceneBuilderState {
  device: DeviceType;
  scenes: Scene[];
  currentSceneIndex: number;
  isPlaying: boolean;
}
