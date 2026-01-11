import React from 'react';
import { VideoScript } from '../types';

interface StoryboardProps {
  script: VideoScript;
  onSave: () => void;
  onNewTopic: () => void;
}

const Storyboard: React.FC<StoryboardProps> = ({ script, onSave, onNewTopic }) => {
  const isSaved = script.scenes.some(s => s.assetUrl && s.assetType === 'video');

  return (
    <div className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl h-full flex flex-col">
      <div className="p-6 border-b border-white/10 flex justify-between items-center shrink-0">
        <h3 className="font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></span>
          Storyboard
          {isSaved && (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded ml-2" title="Progress auto-saved">
              💾 Saved
            </span>
          )}
        </h3>
        <div className="flex gap-2">
          <button 
            onClick={onSave} 
            className="text-xs text-zinc-500 hover:text-yellow-500 uppercase tracking-tighter transition"
            title="Manually save progress"
          >
            Save
          </button>
          <button onClick={onNewTopic} className="text-xs text-zinc-500 hover:text-white uppercase tracking-tighter transition">New Topic</button>
        </div>
      </div>
      
      <div className="p-6 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
        <div className="group">
          <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold block mb-2">Hook</label>
          <p className="text-zinc-300 italic border-l-2 border-yellow-500/30 pl-4 py-1 text-sm">"{script.hook}"</p>
        </div>
        <div className="group">
          <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold block mb-2">Full Script</label>
          <p className="text-zinc-100 text-sm leading-relaxed whitespace-pre-wrap">{script.body}</p>
        </div>
      </div>
    </div>
  );
};

export default Storyboard;