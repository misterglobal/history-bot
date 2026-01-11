import React from 'react';
import { ArchiveItem } from '../types';
import { Trash2, Play, FileText, Calendar } from 'lucide-react';

interface ArchivesProps {
  archives: ArchiveItem[];
  onLoad: (item: ArchiveItem) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const Archives: React.FC<ArchivesProps> = ({ archives, onLoad, onDelete, onClose }) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h2 className="text-3xl font-impact tracking-widest text-white uppercase flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></span>
            Project Archives
            </h2>
            <p className="text-zinc-500 text-sm mt-1">
                Video URLs expire after ~14 days (depending on provider retention).
            </p>
        </div>
        <button 
          onClick={onClose}
          className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition text-sm uppercase"
        >
          Back to Studio
        </button>
      </div>

      {archives.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-white/5 border-dashed">
          <div className="text-zinc-600 mb-4">
            <FileText size={48} className="mx-auto opacity-50" />
          </div>
          <h3 className="text-xl font-bold text-zinc-400 mb-2">No Archives Found</h3>
          <p className="text-zinc-500">Completed projects will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {archives.map((item) => (
            <div 
              key={item.id} 
              className="bg-zinc-900 border border-white/10 rounded-2xl p-6 hover:border-yellow-500/30 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                  className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition"
                  title="Delete Archive"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="mb-4">
                <h3 className="text-xl font-bold text-white truncate pr-8" title={item.topic}>{item.topic}</h3>
                <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                  <Calendar size={12} />
                  <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-xs text-zinc-400 bg-black/30 p-2 rounded-lg">
                   <span className="font-mono text-yellow-500/70">{item.script.scenes.length} Scenes</span>
                   <span className="text-zinc-600">|</span>
                   <span>{item.masterVideoUrl ? 'Master Video Ready' : 'Storyboard Only'}</span>
                </div>
                {item.script.hook && (
                    <p className="text-xs text-zinc-500 italic line-clamp-2">"{item.script.hook}"</p>
                )}
              </div>

              <button 
                onClick={() => onLoad(item)}
                className="w-full py-3 bg-zinc-800 hover:bg-yellow-500 hover:text-black text-zinc-300 font-bold rounded-xl transition flex items-center justify-center gap-2 text-sm uppercase"
              >
                {item.masterVideoUrl ? <Play size={16} /> : <FileText size={16} />}
                {item.masterVideoUrl ? 'Watch / Edit' : 'Load Storyboard'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Archives;