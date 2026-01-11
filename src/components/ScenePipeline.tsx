import React from 'react';
import { VideoScript } from '../types';

interface ScenePipelineProps {
  script: VideoScript;
  videoProgress: Record<string, string>;
  onGenerateAsset: (sceneId: string, type: 'image' | 'video') => void;
  onFullRender: () => void;
  isRenderingMaster: boolean;
}

const ScenePipeline: React.FC<ScenePipelineProps> = ({ 
  script, 
  videoProgress, 
  onGenerateAsset, 
  onFullRender, 
  isRenderingMaster 
}) => {
  const scenesReady = script.scenes.filter(s => s.assetUrl && s.assetType === 'video').length;
  
  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex justify-between items-center bg-zinc-900/50 p-4 rounded-xl border border-white/5 shrink-0">
        <h3 className="text-lg font-impact tracking-widest flex items-center gap-2 uppercase">
           Scene Pipeline
        </h3>
        <span className="text-xs bg-zinc-800 px-3 py-1 rounded-full text-zinc-400 font-mono">
          {script.scenes.length} Segments
        </span>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
        {script.scenes.map((scene) => (
          <div key={scene.id} className="group relative bg-zinc-900 border border-white/5 rounded-2xl p-4 flex gap-6 hover:border-yellow-500/30 transition-all shadow-lg">
            <div className="w-12 text-xs font-mono text-zinc-600 pt-1 flex flex-col items-center">
              <span className="text-yellow-500/50 font-bold">#{scene.id}</span>
              <span>{scene.timestamp}</span>
            </div>
            
            <div className="flex-1 space-y-3">
              <p className="text-sm text-zinc-100 font-medium leading-snug">{scene.text}</p>
              <div className="text-[10px] text-zinc-500 font-mono bg-black/30 p-3 rounded-xl border border-white/5 italic">
                Visual: {scene.visualPrompt}
              </div>
              
              <div className="flex gap-2 pt-2">
                 <button 
                    disabled={scene.isGenerating}
                    onClick={() => onGenerateAsset(scene.id, 'image')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${scene.assetType === 'image' && scene.assetUrl ? 'bg-yellow-500/10 text-yellow-500' : 'bg-zinc-800/50 text-zinc-400 hover:text-white'}`}
                  >
                   DRAFT IMAGE
                 </button>
                 <button 
                    disabled={scene.isGenerating}
                    onClick={() => onGenerateAsset(scene.id, 'video')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${scene.assetType === 'video' && scene.assetUrl ? 'bg-yellow-500/10 text-yellow-500' : 'bg-zinc-800/50 text-zinc-400 hover:text-white'}`}
                  >
                   RENDER VIDEO
                 </button>
              </div>
            </div>

            <div className="w-44 aspect-[9/16] bg-black rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center relative shadow-inner shrink-0">
              {scene.assetUrl ? (
                scene.assetType === 'image' ? (
                  <img src={scene.assetUrl} alt="Scene" className="w-full h-full object-cover" />
                ) : (
                  <video src={scene.assetUrl} controls className="w-full h-full object-cover" />
                )
              ) : scene.isGenerating ? (
                <div className="w-8 h-8 border-3 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <div className="text-center p-4">
                  <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Awaiting Render</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 p-5 bg-zinc-900/90 backdrop-blur-2xl border border-yellow-500/20 rounded-3xl flex items-center justify-between shadow-2xl shrink-0 z-10">
        <div className="flex flex-col">
            <span className="text-sm font-bold">Histori-Bot Status</span>
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider">{scenesReady} / {script.scenes.length} Scenes Ready</span>
        </div>
        
        <div className="flex gap-3">
          <button onClick={onFullRender} disabled={isRenderingMaster} className="px-8 py-3 bg-yellow-500 text-zinc-950 font-bold rounded-2xl text-xs hover:bg-yellow-400 transition flex items-center gap-2 shadow-lg shadow-yellow-500/20 active:scale-95">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
            STITCH & RENDER MASTER
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScenePipeline;