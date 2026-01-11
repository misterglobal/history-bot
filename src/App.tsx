import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import ArchivesModal from './components/ArchivesModal';
import SettingsModal from './components/SettingsModal';
import HeroSection from './components/HeroSection';
import Storyboard from './components/Storyboard';
import ScenePipeline from './components/ScenePipeline';
import MasterVideoView from './components/MasterVideoView';
import { ErrorBanner, LoadingOverlay, RenderingOverlay } from './components/StatusOverlays';
import { AppState, VideoScript, Fact, ProjectData } from './types';
import * as gemini from './services/geminiService';
import * as storage from './services/storage';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<AppState>(AppState.IDLE);
  const [projectId, setProjectId] = useState<string>(() => crypto.randomUUID());
  const [topic, setTopic] = useState('');
  const [researchData, setResearchData] = useState<{ facts: Fact[], groundingSources: any[] } | null>(null);
  const [script, setScript] = useState<VideoScript | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState<Record<string, string>>({});
  
  // Settings & Config
  const [showSettings, setShowSettings] = useState(false);
  const [showArchives, setShowArchives] = useState(false);
  
  // Master Render States
  const [isRenderingMaster, setIsRenderingMaster] = useState(false);
  const [masterVideoUrl, setMasterVideoUrl] = useState<string | null>(null);
  const [masterProgressMsg, setMasterProgressMsg] = useState('');

  // Track if we need to save (debounce)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load latest project on mount
  useEffect(() => {
    checkApiKey(true);
    const archives = storage.getArchives();
    if (archives.length > 0) {
      loadProject(archives[0]);
    }
  }, []);

  // Save progress whenever key state changes
  useEffect(() => {
    if (script || topic) {
      debouncedSave();
    }
  }, [script, topic, researchData, masterVideoUrl]);

  const debouncedSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveProgress(), 2000);
  };

  const saveProgress = () => {
    if (!topic && !script) return;
    
    const projectData: ProjectData = {
      id: projectId,
      topic,
      script,
      researchData,
      masterVideoUrl,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    
    const existing = storage.getArchive(projectId);
    if (existing) projectData.createdAt = existing.createdAt;

    const success = storage.saveArchive(projectData);
    if (!success) console.warn('Could not auto-save project');
    else console.log('Project saved:', projectId);
  };

  const loadProject = (project: ProjectData) => {
    setProjectId(project.id);
    setTopic(project.topic || '');
    setScript(project.script);
    setResearchData(project.researchData);
    setMasterVideoUrl(project.masterVideoUrl);
    
    if (project.masterVideoUrl) {
      setCurrentStep(AppState.ASSET_GEN);
    } else if (project.script && (project.script.scenes.some(s => s.assetUrl) || project.script.scenes.some(s => s.kieTaskId))) {
      setCurrentStep(AppState.ASSET_GEN);
    } else if (project.script) {
      setCurrentStep(AppState.ASSET_GEN);
    } else if (project.researchData) {
      setCurrentStep(AppState.RESEARCHING);
    } else {
      setCurrentStep(AppState.IDLE);
    }
    
    setError(null);
    setShowArchives(false);
  };

  const handleDeleteArchive = (id: string) => {
    storage.deleteArchive(id);
    if (id === projectId) handleReset();
  };

  const checkApiKey = async (silent = false) => {
    const aistudio = (window as any).aistudio;
    if (typeof aistudio?.hasSelectedApiKey === 'function') {
      const hasKey = await aistudio.hasSelectedApiKey();
      if (!hasKey && !silent) await aistudio.openSelectKey();
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
    
    const geminiKey = localStorage.getItem('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      setError("Missing Gemini API Key. Please add it in Settings.");
      setShowSettings(true);
      return;
    }

    if (currentStep === AppState.IDLE) setProjectId(crypto.randomUUID());
    
    setLoading(true);
    setStatusMessage('Searching historical archives...');
    setError(null);
    setCurrentStep(AppState.RESEARCHING);

    try {
      const result = await gemini.researchTopic(topic);
      setResearchData(result);
      setStatusMessage('Analyzing ironies and bizarre details...');
      
      const factsString = result.facts.map(f => f.content).join('\n');
      const generatedScript = await gemini.generateScript(topic, factsString);
      setScript(generatedScript);
      setCurrentStep(AppState.ASSET_GEN);
    } catch (err: any) {
      setError(err.message || 'Failed to generate content');
      setCurrentStep(AppState.IDLE);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAsset = async (sceneId: string, type: 'image' | 'video') => {
    if (!script) return;
    
    const sceneIndex = script.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) return;

    if (type === 'image') {
       const geminiKey = localStorage.getItem('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
       if (!geminiKey) {
         setError("Missing Gemini API Key. Please add it in Settings.");
         setShowSettings(true);
         return;
       }
    } else if (type === 'video') {
       const kieKey = localStorage.getItem('KIEAI_API_KEY') || process.env.KIEAI_API_KEY;
       if (!kieKey) {
         setError("Missing KIE AI API Key. Please add it in Settings.");
         setShowSettings(true);
         return;
       }
    }

    const newScenes = [...script.scenes];
    newScenes[sceneIndex].isGenerating = true;
    newScenes[sceneIndex].assetType = type;
    setScript({ ...script, scenes: newScenes });

    try {
      if (type === 'image') {
        const url = await gemini.generateImage(newScenes[sceneIndex].visualPrompt);
        newScenes[sceneIndex].assetUrl = url;
      } else {
        const scene = newScenes[sceneIndex];
        const result = await gemini.generateVideo(
          scene.visualPrompt, 
          (msg) => setVideoProgress(prev => ({ ...prev, [sceneId]: msg })),
          { sceneText: scene.text, topic: script.topic, timestamp: scene.timestamp }
        );
        newScenes[sceneIndex].assetUrl = result.url;
        newScenes[sceneIndex].kieTaskId = result.taskId;
      }
    } catch (err: any) {
      if (err.message === "API_KEY_EXPIRED") {
        setError("Gemini API key expired. Please update it in Settings.");
        setShowSettings(true);
      } else {
        setError(`Failed to generate asset: ${err.message}`);
      }
    } finally {
      newScenes[sceneIndex].isGenerating = false;
      setVideoProgress(prev => {
        const next = { ...prev };
        delete next[sceneId];
        return next;
      });
      setScript({ ...script, scenes: newScenes });
    }
  };

  const handleFullRender = async () => {
    if (!script) return;
    const falKey = localStorage.getItem('FAL_API_KEY') || process.env.FAL_API_KEY;
    
    if (!falKey) {
      setError("Please enter your fal.ai API key in Settings before rendering.");
      setShowSettings(true);
      return;
    }
    
    setIsRenderingMaster(true);
    setError(null);
    setMasterProgressMsg("Orchestrating Historical Chaos...");

    try {
      const response = await gemini.generateMasterVideo(script, falKey, (msg) => setMasterProgressMsg(msg));
      setMasterVideoUrl(response.url);
    } catch (err: any) {
      setError(`Master render failed: ${err.message}`);
    } finally {
      setIsRenderingMaster(false);
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
    setProjectId(crypto.randomUUID());
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-yellow-500/30">
      <Header 
        onOpenSettings={() => setShowSettings(true)} 
        onOpenArchives={() => setShowArchives(true)}
        onNewProject={handleReset}
      />
      
      <main className="max-w-7xl mx-auto px-6 py-8 h-[calc(100vh-80px)]">
        {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}

        {currentStep === AppState.IDLE && (
          <HeroSection 
            topic={topic} 
            setTopic={setTopic} 
            loading={loading} 
            onSubmit={handleResearch} 
          />
        )}

        {currentStep !== AppState.IDLE && script && !masterVideoUrl && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500 h-full">
            <div className="lg:col-span-4 h-full">
              <Storyboard 
                script={script} 
                onSave={saveProgress} 
                onNewTopic={handleReset} 
              />
            </div>

            <div className="lg:col-span-8 h-full">
              <ScenePipeline 
                script={script}
                videoProgress={videoProgress}
                onGenerateAsset={handleGenerateAsset}
                onFullRender={handleFullRender}
                isRenderingMaster={isRenderingMaster}
              />
            </div>
          </div>
        )}

        {masterVideoUrl && (
          <MasterVideoView 
            videoUrl={masterVideoUrl} 
            topic={topic} 
            onReset={handleReset}
            onError={setError}
          />
        )}
      </main>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      
      {showArchives && (
        <ArchivesModal 
          archives={storage.getArchives()}
          onLoad={loadProject}
          onDelete={handleDeleteArchive}
          onClose={() => setShowArchives(false)}
        />
      )}

      {loading && <LoadingOverlay message={statusMessage} />}
      {isRenderingMaster && <RenderingOverlay message={masterProgressMsg} />}
    </div>
  );
};

export default App;