import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [falKey, setFalKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [kieKey, setKieKey] = useState('');

  // Env presence check
  const envHasGemini = !!process.env.GEMINI_API_KEY;
  const envHasKie = !!process.env.KIEAI_API_KEY;
  const envHasFal = !!process.env.FAL_API_KEY;

  useEffect(() => {
    setFalKey(localStorage.getItem('FAL_API_KEY') || '');
    setGeminiKey(localStorage.getItem('GEMINI_API_KEY') || '');
    setKieKey(localStorage.getItem('KIEAI_API_KEY') || '');
  }, []);

  const saveSettings = () => {
    localStorage.setItem('FAL_API_KEY', falKey);
    localStorage.setItem('GEMINI_API_KEY', geminiKey);
    localStorage.setItem('KIEAI_API_KEY', kieKey);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-6">
      <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
        <h3 className="text-2xl font-impact tracking-widest text-white uppercase mb-6 flex items-center gap-2">
           Engine Configuration
        </h3>
        
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Gemini API Key</label>
                <span className={`text-[10px] px-2 py-0.5 rounded ${envHasGemini ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {envHasGemini ? 'ENV DETECTED' : 'ENV MISSING'}
                </span>
            </div>
            <input 
              type="password"
              placeholder={envHasGemini ? "Using env key (enter to override)" : "Required for text/image gen"}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-yellow-500 outline-none transition"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">KIE AI API Key</label>
                <span className={`text-[10px] px-2 py-0.5 rounded ${envHasKie ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {envHasKie ? 'ENV DETECTED' : 'ENV MISSING'}
                </span>
            </div>
            <input 
              type="password"
              placeholder={envHasKie ? "Using env key (enter to override)" : "Required for video generation"}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-yellow-500 outline-none transition"
              value={kieKey}
              onChange={(e) => setKieKey(e.target.value)}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">FAL.AI API KEY</label>
                <span className={`text-[10px] px-2 py-0.5 rounded ${envHasFal ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {envHasFal ? 'ENV DETECTED' : 'ENV MISSING'}
                </span>
            </div>
            <p className="text-[10px] text-zinc-500 mb-2 leading-relaxed">Required for stitching multiple scenes using FFmpeg. Get one at <a href="https://fal.ai" target="_blank" className="text-yellow-500 hover:underline">fal.ai</a>.</p>
            <input 
              type="password"
              placeholder={envHasFal ? "Using env key (enter to override)" : "Paste your fal.ai key here"}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-yellow-500 outline-none transition"
              value={falKey}
              onChange={(e) => setFalKey(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button 
            onClick={saveSettings}
            className="flex-1 bg-yellow-500 text-zinc-950 font-bold py-3 rounded-xl hover:bg-yellow-400 transition text-sm shadow-lg shadow-yellow-500/20"
          >
            SAVE CONFIG
          </button>
          <button 
            onClick={onClose}
            className="flex-1 bg-zinc-800 text-white font-bold py-3 rounded-xl hover:bg-zinc-700 transition text-sm"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;