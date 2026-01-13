import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Archives from './components/Archives';
import { AppState, VideoScript, Fact, Scene, ArchiveItem, VideoStyle } from './types';
import * as gemini from './services/geminiService';
import * as archiveService from './services/archiveService';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<AppState>(AppState.IDLE);
  const [topic, setTopic] = useState('');
  const [researchData, setResearchData] = useState<{ facts: Fact[], groundingSources: any[] } | null>(null);
  const [script, setScript] = useState<VideoScript | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState<Record<string, string>>({});
  const [archives, setArchives] = useState<ArchiveItem[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<VideoStyle>('cinematic');

  // Settings & Config
  const [showSettings, setShowSettings] = useState(false);
  const [falKey, setFalKey] = useState(localStorage.getItem('FAL_API_KEY') || '');
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('GEMINI_API_KEY') || '');
  const [kieKey, setKieKey] = useState(localStorage.getItem('KIEAI_API_KEY') || '');

  // Master Render States
  const [isRenderingMaster, setIsRenderingMaster] = useState(false);
  const [masterVideoUrl, setMasterVideoUrl] = useState<string | null>(null);
  const [masterProgressMsg, setMasterProgressMsg] = useState('');

  // Env check helpers
  const envGemini = process.env.GEMINI_API_KEY || process.env.API_KEY;
  const envKie = process.env.KIEAI_API_KEY;

  // Load saved progress on mount
  useEffect(() => {
    checkApiKey(true);
    loadSavedProgress();
    loadArchives();
  }, []);

  // Save progress whenever script or scenes change
  useEffect(() => {
    if (script && currentStep !== AppState.ARCHIVES) {
      saveProgress();
    }
  }, [script, currentStep]);

  const saveProgress = () => {
    if (!script) return;

    const progressData = {
      topic,
      script,
      researchData,
      timestamp: new Date().toISOString()
    };

    try {
      localStorage.setItem('histori_bot_progress', JSON.stringify(progressData));
    } catch (error) {
      console.warn('Failed to save progress:', error);
    }
  };

  const loadSavedProgress = () => {
    try {
      const saved = localStorage.getItem('histori_bot_progress');
      if (saved) {
        const progressData = JSON.parse(saved);
        const { topic, script, researchData } = progressData;

        // Check if progress is recent (within last 7 days)
        const savedTime = new Date(progressData.timestamp);
        const daysSince = (Date.now() - savedTime.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSince > 7) {
          localStorage.removeItem('histori_bot_progress');
          return;
        }

        setTopic(topic || '');
        setScript(script);
        setResearchData(researchData);

        // Restore videos from KIE AI task IDs if URLs are missing
        if (script) {
          const scenesWithTaskIds = script.scenes.filter((s: Scene) => s.kieTaskId && (!s.assetUrl || s.assetType === 'video'));

          if (scenesWithTaskIds.length > 0) {
            restoreVideos(script, scenesWithTaskIds);
          }
        }

        // Set step based on what's available
        if (script) {
          setCurrentStep(AppState.ASSET_GEN);
        } else if (researchData) {
          setCurrentStep(AppState.RESEARCHING);
        }
      }
    } catch (error) {
      console.warn('Failed to load saved progress:', error);
      localStorage.removeItem('histori_bot_progress');
    }
  };

  const restoreVideos = (currentScript: VideoScript, scenes: Scene[]) => {
    Promise.all(
      scenes.map(async (scene) => {
        if (!scene.kieTaskId) return;

        try {
          const videoUrl = await gemini.getVideoFromTaskId(scene.kieTaskId, undefined, kieKey);
          setScript(prev => {
            if (!prev) return null;
            const sceneIndex = prev.scenes.findIndex(s => s.id === scene.id);
            if (sceneIndex !== -1) {
              const updatedScenes = [...prev.scenes];
              updatedScenes[sceneIndex].assetUrl = videoUrl;
              return { ...prev, scenes: updatedScenes };
            }
            return prev;
          });
        } catch (error: any) {
          console.warn(`Failed to restore video for scene ${scene.id}:`, error.message);
        }
      })
    );
  };

  const loadArchives = () => {
    setArchives(archiveService.getArchives());
  };

  const handleOpenArchives = () => {
    loadArchives();
    setCurrentStep(AppState.ARCHIVES);
  };

  const handleLoadArchive = (item: ArchiveItem) => {
    setTopic(item.topic);
    setScript(item.script);
    setMasterVideoUrl(item.masterVideoUrl);
    setResearchData(null);
    setCurrentStep(AppState.ASSET_GEN);

    if (item.script) {
      const scenesWithTaskIds = item.script.scenes.filter((s: Scene) => s.kieTaskId && !s.assetUrl);
      if (scenesWithTaskIds.length > 0) {
        restoreVideos(item.script, scenesWithTaskIds);
      }
    }
  };

  const handleDeleteArchive = (id: string) => {
    archiveService.deleteArchive(id);
    loadArchives();
  };

  const clearSavedProgress = () => {
    localStorage.removeItem('histori_bot_progress');
  };

  const saveSettings = () => {
    localStorage.setItem('FAL_API_KEY', falKey);
    localStorage.setItem('GEMINI_API_KEY', geminiKey);
    localStorage.setItem('KIEAI_API_KEY', kieKey);
    setShowSettings(false);
  };

  const checkApiKey = async (silent = false) => {
    const aistudio = (window as any).aistudio;
    if (typeof aistudio?.hasSelectedApiKey === 'function') {
      const hasKey = await aistudio.hasSelectedApiKey();
      if (!hasKey && !silent) {
        await aistudio.openSelectKey();
      }
      return true;
    }
    return true;
  };

  const handleOpenKeyPicker = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) await aistudio.openSelectKey();
  };

  const handleResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic) return;

    setLoading(true);
    setStatusMessage('Searching historical archives...');
    setError(null);
    setCurrentStep(AppState.RESEARCHING);

    try {
      const result = await gemini.researchTopic(topic, geminiKey);
      setResearchData(result);
      setStatusMessage('Analyzing ironies and bizarre details...');

      const factsString = result.facts.map(f => f.content).join('\n');
      const generatedScript = await gemini.generateScript(topic, factsString, geminiKey);
      setScript(generatedScript);
      setCurrentStep(AppState.ASSET_GEN);
    } catch (err: any) {
      setError(err.message || 'Failed to generate content');
      setCurrentStep(AppState.IDLE);
      // If error is about missing key, open settings
      if (err.message?.includes("API Key is missing")) {
        setShowSettings(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAsset = async (sceneId: string, type: 'image' | 'video') => {
    if (!script) return;

    const sceneIndex = script.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) return;

    if (type === 'video') {
      await checkApiKey();
    }

    // Prepare fresh scene state (clear old URLs/IDs)
    setScript(prev => {
      if (!prev) return null;
      const scenes = [...prev.scenes];
      const idx = scenes.findIndex(s => s.id === sceneId);
      if (idx !== -1) {
        scenes[idx] = {
          ...scenes[idx],
          isGenerating: true,
          assetType: type,
          assetUrl: undefined, // Clear stale URL
          kieTaskId: undefined // Clear stale Task ID
        };
      }
      return { ...prev, scenes };
    });

    try {
      if (type === 'image') {
        const url = await gemini.generateImage(script.scenes[sceneIndex].visualPrompt, geminiKey);
        setScript(prev => {
          if (!prev) return null;
          const scenes = [...prev.scenes];
          const idx = scenes.findIndex(s => s.id === sceneId);
          if (idx !== -1) {
            scenes[idx] = { ...scenes[idx], assetUrl: url, isGenerating: false };
          }
          return { ...prev, scenes };
        });
      } else {
        const currentScene = script.scenes[sceneIndex];
        const result = await gemini.generateVideo(
          currentScene.visualPrompt,
          (msg) => {
            setVideoProgress(prev => ({ ...prev, [sceneId]: msg }));
          },
          {
            sceneText: currentScene.text,
            topic: script.topic,
            timestamp: currentScene.timestamp,
            style: selectedStyle
          },
          kieKey,
          (taskId) => {
            // Save taskId immediately upon generation
            setScript(prev => {
              if (!prev) return null;
              const scenes = [...prev.scenes];
              const idx = scenes.findIndex(s => s.id === sceneId);
              if (idx !== -1) {
                scenes[idx] = { ...scenes[idx], kieTaskId: taskId };
              }
              return { ...prev, scenes };
            });
          }
        );

        setScript(prev => {
          if (!prev) return null;
          const scenes = [...prev.scenes];
          const idx = scenes.findIndex(s => s.id === sceneId);
          if (idx !== -1) {
            scenes[idx] = {
              ...scenes[idx],
              assetUrl: result.url,
              kieTaskId: result.taskId,
              isGenerating: false
            };
          }
          return { ...prev, scenes };
        });
      }
    } catch (err: any) {
      if (err.message === "API_KEY_EXPIRED") {
        setError("Gemini API key expired. Please select a key.");
        await handleOpenKeyPicker();
      } else {
        setError(`Failed to generate asset: ${err.message}`);
        if (err.message?.includes("API Key is missing")) {
          setShowSettings(true);
        }
      }

      // Reset generating state on error
      setScript(prev => {
        if (!prev) return null;
        const scenes = [...prev.scenes];
        const idx = scenes.findIndex(s => s.id === sceneId);
        if (idx !== -1) {
          scenes[idx] = { ...scenes[idx], isGenerating: false };
        }
        return { ...prev, scenes };
      });
    } finally {
      setVideoProgress(prev => {
        const next = { ...prev };
        delete next[sceneId];
        return next;
      });
    }
  };

  const handleFullRender = async () => {
    if (!script) return;
    if (!falKey) {
      setError("Please enter your fal.ai API key in Settings before rendering.");
      setShowSettings(true);
      return;
    }

    await checkApiKey();
    setIsRenderingMaster(true);
    setError(null);
    setMasterProgressMsg("Orchestrating Historical Chaos...");

    try {
      const response = await gemini.generateMasterVideo(
        script,
        falKey,
        (msg) => setMasterProgressMsg(msg),
        kieKey,
        selectedStyle
      );
      setMasterVideoUrl(response.url);

      try {
        archiveService.saveArchive(topic, script, response.url);
        console.log('Project automatically archived.');
      } catch (e) {
        console.warn('Failed to auto-archive:', e);
      }

    } catch (err: any) {
      setError(`Master render failed: ${err.message}`);
      if (err.message?.includes("API Key is missing")) {
        setShowSettings(true);
      }
    } finally {
      setIsRenderingMaster(false);
    }
  };

  const handleManualSave = () => {
    if (!script) return;
    try {
      archiveService.saveArchive(topic, script, masterVideoUrl);
      const originalError = error;
      setError("Project saved to Archives!");
      setTimeout(() => setError(originalError), 3000);
    } catch (err: any) {
      setError(`Failed to save archive: ${err.message}`);
    }
  };

  const handleReset = () => {
    setTopic('');
    setScript(null);
    setResearchData(null);
    setMasterVideoUrl(null);
    setIsRenderingMaster(false);
    setCurrentStep(AppState.IDLE);
    setError(null);
    clearSavedProgress();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-yellow-500/30">
      <Header
        onOpenSettings={() => setShowSettings(true)}
        onOpenArchives={handleOpenArchives}
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-8 p-4 bg-red-900/20 border border-red-500/50 rounded-xl flex items-center justify-between animate-in slide-in-from-top duration-300 sticky top-24 z-40 backdrop-blur-sm">
            <p className={error === "Project saved to Archives!" ? "text-green-400 font-bold" : "text-red-400 text-sm"}>
              {error === "Project saved to Archives!" ? "✓ " : "Error: "}{error}
            </p>
            <button onClick={() => setError(null)} className="text-zinc-400 hover:text-white">✕</button>
          </div>
        )}

        {currentStep === AppState.ARCHIVES && (
          <Archives
            archives={archives}
            onLoad={handleLoadArchive}
            onDelete={handleDeleteArchive}
            onClose={() => setCurrentStep(script ? AppState.ASSET_GEN : AppState.IDLE)}
          />
        )}

        {currentStep === AppState.IDLE && (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in-95 duration-700">
            <h2 className="text-5xl md:text-7xl font-impact tracking-wider mb-6 text-center max-w-3xl uppercase">
              Make History <span className="text-yellow-500 underline decoration-zinc-800">Go Viral</span>
            </h2>
            <p className="text-zinc-400 text-lg mb-10 text-center max-w-xl">
              Coherent scene-by-scene generation. Powered by <b>Veo 3.1</b> and <b>FFmpeg</b> for seamless historical storytelling.
            </p>

            <div className="flex flex-wrap justify-center gap-3 mb-10 max-w-2xl">
              {(['cinematic', 'gritty', 'meme', 'watercolor', 'anime'] as VideoStyle[]).map((style) => (
                <button
                  key={style}
                  onClick={() => setSelectedStyle(style)}
                  className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${selectedStyle === style
                    ? 'bg-yellow-500 text-zinc-950 shadow-lg shadow-yellow-500/20 scale-105'
                    : 'bg-zinc-900 text-zinc-500 hover:text-white border border-white/5'
                    }`}
                >
                  {style}
                </button>
              ))}
            </div>

            <form onSubmit={handleResearch} className="w-full max-w-2xl relative group">
              <input
                type="text"
                placeholder="Enter a historical topic (e.g. The Emu War)"
                className="w-full bg-zinc-900 border-2 border-white/5 group-hover:border-yellow-500/50 focus:border-yellow-500 rounded-2xl py-5 px-6 outline-none transition-all text-xl shadow-2xl shadow-black"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !topic}
                className="absolute right-3 top-3 bottom-3 px-8 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 font-bold rounded-xl transition-all shadow-lg"
              >
                {loading ? "Drafting..." : "GO!"}
              </button>
            </form>
          </div>
        )}

        {currentStep !== AppState.IDLE && currentStep !== AppState.ARCHIVES && script && !masterVideoUrl && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                  <h3 className="font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></span>
                    Storyboard
                    {script.scenes.some(s => s.assetUrl && s.assetType === 'video') && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded ml-2" title="Progress auto-saved">
                        💾 Saved
                      </span>
                    )}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleManualSave}
                      className="text-xs text-zinc-500 hover:text-yellow-500 uppercase tracking-tighter transition"
                      title="Save to Archives"
                    >
                      Archive
                    </button>
                    <button onClick={handleReset} className="text-xs text-zinc-500 hover:text-white uppercase tracking-tighter transition">Restart</button>
                  </div>
                </div>

                <div className="p-6 space-y-8 h-[75vh] overflow-y-auto custom-scrollbar">
                  <div className="group">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold block mb-2">Hook</label>
                    <p className="text-zinc-300 italic border-l-2 border-yellow-500/30 pl-4 py-1 text-sm">"{script.hook}"</p>
                  </div>
                  <div className="group">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold block mb-2">Full Script</label>
                    <textarea
                      className="w-full bg-transparent text-zinc-100 text-sm leading-relaxed whitespace-pre-wrap outline-none focus:ring-1 focus:ring-yellow-500/30 rounded p-1 min-h-[40vh] resize-none custom-scrollbar"
                      value={script.body}
                      onChange={(e) => {
                        const val = e.target.value;
                        setScript(prev => prev ? { ...prev, body: val } : null);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-6">
              <div className="flex justify-between items-center bg-zinc-900/50 p-4 rounded-xl border border-white/5">
                <h3 className="text-lg font-impact tracking-widest flex items-center gap-2 uppercase">
                  Scene Pipeline
                </h3>
                <span className="text-xs bg-zinc-800 px-3 py-1 rounded-full text-zinc-400 font-mono">
                  {script.scenes.length} Segments
                </span>
              </div>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                {script.scenes.map((scene, idx) => (
                  <div key={scene.id} className="group relative bg-zinc-900 border border-white/5 rounded-2xl p-4 flex gap-6 hover:border-yellow-500/30 transition-all shadow-lg">
                    <div className="w-12 text-xs font-mono text-zinc-600 pt-1 flex flex-col items-center">
                      <span className="text-yellow-500/50 font-bold">#{scene.id}</span>
                      <span>{scene.timestamp}</span>
                    </div>

                    <div className="flex-1 space-y-3">
                      <textarea
                        className="w-full bg-transparent text-sm text-zinc-100 font-medium leading-snug outline-none focus:ring-1 focus:ring-yellow-500/30 rounded p-1 resize-none"
                        value={scene.text}
                        rows={2}
                        onChange={(e) => {
                          const val = e.target.value;
                          setScript(prev => {
                            if (!prev) return null;
                            const scenes = [...prev.scenes];
                            const idx = scenes.findIndex(s => s.id === scene.id);
                            if (idx !== -1) {
                              scenes[idx] = { ...scenes[idx], text: val };
                            }
                            return { ...prev, scenes };
                          });
                        }}
                      />
                      <div className="text-[10px] text-zinc-500 font-mono bg-black/30 p-3 rounded-xl border border-white/5 italic">
                        <label className="block text-[8px] uppercase tracking-widest text-zinc-600 mb-1 font-bold">Visual Prompt</label>
                        <textarea
                          className="w-full bg-transparent outline-none focus:text-zinc-300 transition-colors resize-none"
                          value={scene.visualPrompt}
                          rows={3}
                          onChange={(e) => {
                            const val = e.target.value;
                            setScript(prev => {
                              if (!prev) return null;
                              const scenes = [...prev.scenes];
                              const idx = scenes.findIndex(s => s.id === scene.id);
                              if (idx !== -1) {
                                scenes[idx] = {
                                  ...scenes[idx],
                                  visualPrompt: val,
                                  assetUrl: undefined,
                                  kieTaskId: undefined
                                };
                              }
                              return { ...prev, scenes };
                            });
                          }}
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          disabled={scene.isGenerating}
                          onClick={() => handleGenerateAsset(scene.id, 'image')}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${scene.assetType === 'image' && scene.assetUrl ? 'bg-yellow-500/10 text-yellow-500' : 'bg-zinc-800/50 text-zinc-400 hover:text-white'}`}
                        >
                          DRAFT IMAGE
                        </button>
                        <button
                          disabled={scene.isGenerating}
                          onClick={() => handleGenerateAsset(scene.id, 'video')}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${scene.assetType === 'video' && scene.assetUrl ? 'bg-yellow-500/10 text-yellow-500' : 'bg-zinc-800/50 text-zinc-400 hover:text-white'}`}
                        >
                          RENDER VIDEO
                        </button>
                      </div>
                    </div>

                    <div className="w-44 aspect-[9/16] bg-black rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center relative shadow-inner">
                      {scene.assetUrl ? (
                        scene.assetType === 'image' ? (
                          <img src={scene.assetUrl} alt="Scene" className="w-full h-full object-cover" />
                        ) : (
                          <video
                            src={scene.assetUrl}
                            controls
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLVideoElement;
                              if (target.src && !target.src.includes('blob:')) {
                                console.warn("Asset link possibly expired:", scene.id);
                              }
                            }}
                          />
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

              <div className="sticky bottom-0 p-5 bg-zinc-900/90 backdrop-blur-2xl border border-yellow-500/20 rounded-3xl flex items-center justify-between shadow-2xl">
                <div className="flex flex-col">
                  <span className="text-sm font-bold">Histori-Bot Status</span>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider">{script.scenes.filter(s => s.assetUrl && s.assetType === 'video').length} / {script.scenes.length} Scenes Ready</span>
                </div>

                <div className="flex gap-3">
                  <button onClick={handleFullRender} disabled={isRenderingMaster} className="px-8 py-3 bg-yellow-500 text-zinc-950 font-bold rounded-2xl text-xs hover:bg-yellow-400 transition flex items-center gap-2 shadow-lg shadow-yellow-500/20 active:scale-95">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                    STITCH & RENDER MASTER
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {masterVideoUrl && currentStep !== AppState.ARCHIVES && (
          <div className="flex flex-col items-center py-10 animate-in fade-in slide-in-from-bottom duration-700">
            <div className="bg-zinc-900 p-8 rounded-[3rem] border border-yellow-500/30 shadow-2xl max-w-2xl w-full">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-impact tracking-widest text-yellow-500 uppercase">Master Content Generated</h2>
                  <p className="text-zinc-500 text-sm uppercase">Topic: {topic}</p>
                </div>
                <button onClick={() => setMasterVideoUrl(null)} className="text-zinc-500 hover:text-white text-xs uppercase tracking-widest">Edit Scenes</button>
              </div>

              <div className="aspect-[9/16] bg-black rounded-[2rem] overflow-hidden border border-white/10 shadow-inner mb-8 ring-4 ring-yellow-500/10 relative group">
                <video
                  src={masterVideoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLVideoElement;
                    if (target.src) {
                      setError("Video link may have expired (14-day limit). Try re-rendering scenes.");
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={async () => {
                    try {
                      setError(null);
                      const a = document.createElement('a');
                      a.href = masterVideoUrl;
                      a.download = `histori-bot-${topic.toLowerCase().replace(/\s/g, '-')}.mp4`;
                      a.target = '_blank';
                      a.click();

                      setTimeout(async () => {
                        try {
                          const response = await fetch(masterVideoUrl);
                          if (response.ok) {
                            const blob = await response.blob();
                            const blobUrl = URL.createObjectURL(blob);
                            const downloadLink = document.createElement('a');
                            downloadLink.href = blobUrl;
                            downloadLink.download = `histori-bot-${topic.toLowerCase().replace(/\s/g, '-')}.mp4`;
                            document.body.appendChild(downloadLink);
                            downloadLink.click();
                            document.body.removeChild(downloadLink);
                            URL.revokeObjectURL(blobUrl);
                          }
                        } catch (fetchError) {
                          console.warn('Blob download fallback failed, using direct link:', fetchError);
                        }
                      }, 100);
                    } catch (err: any) {
                      setError(`Download failed: ${err.message}`);
                    }
                  }}
                  className="bg-yellow-500 text-zinc-950 font-bold py-4 rounded-2xl hover:bg-yellow-400 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  DOWNLOAD MP4
                </button>
                <button onClick={handleReset} className="bg-zinc-800 text-white font-bold py-4 rounded-2xl hover:bg-zinc-700 transition">
                  START NEW PROJECT
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-6">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-impact tracking-widest text-white uppercase mb-6 flex items-center gap-2">
              Engine Configuration
            </h3>

            <div className="space-y-6">
              {/* Gemini API Key */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-2">Google Gemini API Key</label>
                <p className="text-[10px] text-zinc-500 mb-2">Required for research, scripting, and image generation. {envGemini ? <span className="text-green-500 font-bold">(Present in .env)</span> : <span className="text-yellow-500 font-bold">(Missing in .env)</span>}</p>
                <input
                  type="password"
                  placeholder="Paste your Gemini API key"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-yellow-500 outline-none transition"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                />
              </div>

              {/* KIE AI API Key */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-2">KIE AI API Key (Veo 3.1)</label>
                <p className="text-[10px] text-zinc-500 mb-2">Required for Veo video generation. {envKie ? <span className="text-green-500 font-bold">(Present in .env)</span> : <span className="text-yellow-500 font-bold">(Missing in .env)</span>}</p>
                <input
                  type="password"
                  placeholder="Paste your KIE AI key"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-yellow-500 outline-none transition"
                  value={kieKey}
                  onChange={(e) => setKieKey(e.target.value)}
                />
              </div>

              {/* Fal.ai API Key */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-2">Fal.ai API Key (FFmpeg)</label>
                <p className="text-[10px] text-zinc-500 mb-2">Required for stitching videos.</p>
                <input
                  type="password"
                  placeholder="Paste your fal.ai key"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-yellow-500 outline-none transition"
                  value={falKey}
                  onChange={(e) => setFalKey(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={saveSettings}
                className="flex-1 bg-yellow-500 text-zinc-950 font-bold py-3 rounded-xl hover:bg-yellow-400 transition text-sm"
              >
                SAVE & CLOSE
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 bg-zinc-800 text-white font-bold py-3 rounded-xl hover:bg-zinc-700 transition text-sm"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-8"></div>
          <h3 className="text-3xl font-impact tracking-widest text-yellow-500 uppercase mb-3 animate-pulse">{statusMessage}</h3>
        </div>
      )}

      {isRenderingMaster && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[100] flex flex-col items-center justify-center text-center p-6 overflow-hidden">
          {/* Background Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-yellow-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>

          <div className="relative z-10 flex flex-col items-center max-w-2xl w-full">
            <div className="relative mb-12 group">
              <div className="w-48 h-48 border-[12px] border-yellow-500/5 rounded-full shadow-[0_0_50px_rgba(234,179,8,0.1)]"></div>
              <div className="absolute inset-0 w-48 h-48 border-[12px] border-yellow-500 border-t-transparent rounded-full animate-[spin_3s_linear_infinite]"></div>
              <div className="absolute inset-0 w-48 h-48 border-[2px] border-white/10 rounded-full animate-ping"></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-impact text-yellow-500 tracking-widest group-hover:scale-110 transition-transform">VEO</span>
                <span className="text-[10px] text-zinc-500 font-bold tracking-[0.3em] mt-1 uppercase">Engine 3.1</span>
              </div>
            </div>

            <div className="space-y-4 w-full">
              <h3 className="text-4xl font-impact tracking-widest text-white uppercase animate-in slide-in-from-bottom duration-500">
                {masterProgressMsg}
              </h3>

              <div className="flex flex-col items-center gap-2">
                <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden border border-white/5 max-w-md">
                  <div className="h-full bg-yellow-500 animate-[progress_20s_ease-in-out_infinite] shadow-[0_0_15px_rgba(234,179,8,0.5)]"></div>
                </div>
                <p className="text-zinc-500 uppercase text-[10px] tracking-[0.5em] font-bold">
                  Splicing Chronological Reality
                </p>
              </div>

              <div className="mt-12 bg-zinc-900/50 border border-white/5 rounded-2xl p-6 w-full text-left backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Active Pipeline</span>
                </div>
                <div className="space-y-3 font-mono text-[11px]">
                  <div className="flex justify-between items-center text-zinc-400">
                    <span>VEO Fast Generation</span>
                    <span className="text-green-500 font-bold text-[9px] px-2 py-0.5 bg-green-500/10 rounded">ACTIVE</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-600">
                    <span>Character Consistency Mapping</span>
                    <span className="text-[9px]">QUEUED</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-600">
                    <span>Fal.ai FFmpeg Stitching</span>
                    <span className="text-[9px]">PENDING</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <style dangerouslySetInnerHTML={{
            __html: `
            @keyframes progress {
              0% { width: 0%; }
              50% { width: 70%; }
              100% { width: 100%; }
            }
          `}} />
        </div>
      )}
    </div>
  );
};

export default App;