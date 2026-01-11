import React from 'react';
import { ProjectData } from '../types';
import { Trash2, Film, Clock, FileText, PlayCircle } from 'lucide-react';

interface ArchivesModalProps {
  archives: ProjectData[];
  onLoad: (project: ProjectData) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const ArchivesModal: React.FC<ArchivesModalProps> = ({ archives, onLoad, onDelete, onClose }) => {
  
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      }).format(date);
    } catch (e) {
      return 'Unknown date';
    }
  };

  const isExpired = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays > 14;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-impact tracking-widest text-white uppercase flex items-center gap-2">
            <Film className="w-6 h-6 text-yellow-500" />
            Project Archives
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition">
            ✕
          </button>
        </div>

        {archives.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 py-12">
            <Clock className="w-12 h-12 mb-4 opacity-20" />
            <p>No archived projects found.</p>
            <p className="text-xs mt-2">Projects are auto-saved as you create them.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
            <div className="grid grid-cols-12 gap-4 text-xs font-bold text-zinc-500 uppercase tracking-wider px-4 mb-2">
              <div className="col-span-5">Topic</div>
              <div className="col-span-3">Status</div>
              <div className="col-span-3">Last Edited</div>
              <div className="col-span-1 text-right">Action</div>
            </div>
            
            {archives.map((project) => {
              const hasMaster = !!project.masterVideoUrl;
              const sceneCount = project.script?.scenes.length || 0;
              const videosReady = project.script?.scenes.filter(s => s.assetUrl && s.assetType === 'video').length || 0;
              const expired = isExpired(project.timestamp);

              return (
                <div key={project.id} className="grid grid-cols-12 gap-4 items-center bg-zinc-950/50 border border-white/5 p-4 rounded-xl hover:border-yellow-500/30 transition group">
                  <div className="col-span-5">
                    <h4 className="font-bold text-zinc-200 truncate pr-4">{project.topic || "Untitled Project"}</h4>
                    {hasMaster && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-green-400 mt-1">
                        <PlayCircle className="w-3 h-3" /> Master Video Ready
                      </span>
                    )}
                  </div>
                  
                  <div className="col-span-3">
                    <div className="flex flex-col gap-1">
                      <div className="text-xs text-zinc-400">
                        {videosReady}/{sceneCount} Scenes
                      </div>
                      <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-yellow-500" 
                          style={{ width: `${sceneCount ? (videosReady / sceneCount) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-span-3">
                    <span className="text-xs text-zinc-400 block">{formatDate(project.timestamp)}</span>
                    {expired && (
                      <span className="text-[10px] text-red-400 block mt-0.5">Media may be expired (>14 days)</span>
                    )}
                  </div>
                  
                  <div className="col-span-1 flex justify-end gap-2">
                    <button 
                      onClick={() => onLoad(project)}
                      className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
                      title="Load Project"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if(confirm('Are you sure you want to delete this archive?')) onDelete(project.id);
                      }}
                      className="p-2 hover:bg-red-900/30 rounded-lg text-zinc-600 hover:text-red-400 transition"
                      title="Delete Archive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-white/10 text-[10px] text-zinc-500 flex justify-between">
          <span>Note: Generated videos are hosted by KIE AI / Fal.ai and may expire after ~14 days.</span>
          <span>{archives.length} / 10 saved slots used</span>
        </div>
      </div>
    </div>
  );
};

export default ArchivesModal;