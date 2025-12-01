export type AspectRatio = 'Auto' | '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
export type ImageResolution = '1K' | '2K' | '4K';

export interface GenerationSettings {
  aspectRatio: AspectRatio;
  resolution: ImageResolution;
  temperature: number;
}

export interface GeneratedImageResult {
  imageUrl: string;
  prompt: string;
}

// Augment window for AI Studio key selection
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}