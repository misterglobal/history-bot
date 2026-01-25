export type VideoStyle = 'cinematic' | 'gritty' | 'meme' | 'watercolor' | 'anime';
export type VideoEngine = 'veo' | 'sora2';
export type SocialPlatform = 'youtube' | 'instagram';
export type Persona = 'sarcastic_teacher' | 'gen_z_explainer' | 'noir_detective' | 'alien_observer';

export interface PersonaDefinition {
  id: Persona;
  name: string;
  description: string;
  systemPromptSnippet: string;
}

export interface SocialMetadata {
  youtubeTitle: string;
  youtubeDescription: string;
  instagramCaption: string;
}

export interface R2Config {
  accountId: string;
  accessKey: string;
  secretKey: string;
  bucketName: string;
  publicUrl: string;
}

export interface MasterVideoResponse {
  url: string;
}

export interface Scene {
  id: string;
  timestamp: string;
  text: string;
  visualPrompt: string;
  assetType: 'image' | 'video';
  assetUrl?: string;
  audioUrl?: string;
  kieTaskId?: string; // KIE AI task ID for video generation
  isGenerating?: boolean;
  isGeneratingAudio?: boolean;
  useNarration?: boolean;
  engine?: VideoEngine;
}

export interface VideoScript {
  topic: string;
  hook: string;
  body: string;
  outro: string;
  scenes: Scene[];
  useNarration?: boolean;
  voiceId?: string;
  engine?: VideoEngine;
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