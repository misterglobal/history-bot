
export interface Scene {
  id: string;
  timestamp: string;
  text: string;
  visualPrompt: string;
  assetType: 'image' | 'video';
  assetUrl?: string;
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
  PREVIEW = 'PREVIEW'
}

export interface Fact {
  title: string;
  content: string;
  sourceUrl?: string;
}
