export type VideoStyle = 'cinematic' | 'gritty' | 'meme' | 'watercolor' | 'anime';

export interface Scene {
  id: string;
  timestamp: string;
  text: string;
  visualPrompt: string;
  assetType: 'image' | 'video';
  assetUrl?: string;
  kieTaskId?: string; // KIE AI task ID for video generation
  isGenerating?: boolean;
}

export interface VideoScript {
  topic: string;
  hook: string;
  body: string;
  outro: string;
  scenes: Scene[];
}

export enum AppState {
  IDLE = 'IDLE',
  RESEARCHING = 'RESEARCHING',
  SCRIPTING = 'SCRIPTING',
  ASSET_GEN = 'ASSET_GEN',
  PREVIEW = 'PREVIEW',
  ARCHIVES = 'ARCHIVES'
}

export interface Fact {
  title: string;
  content: string;
  sourceUrl?: string;
}

export interface ArchiveItem {
  id: string;
  topic: string;
  timestamp: string;
  script: VideoScript;
  masterVideoUrl: string | null;
}