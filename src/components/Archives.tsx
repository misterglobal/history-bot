import React from 'react';
import { ArchiveItem } from '../types';
import { Trash2, Play, FileText, Calendar, Download, Eye, Clock, AlertTriangle, Link as LinkIcon, Check } from 'lucide-react';

interface ArchivesProps {
  archives: ArchiveItem[];
  onLoad: (item: ArchiveItem) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const Archives: React.FC<ArchivesProps> = ({ archives, onLoad, onDelete, onClose }) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const getDaysLeft = (timestamp: string) => {
    const createdDate = new Date(timestamp);
    const expiryDate = new Date(createdDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diff = expiryDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const handleDownload = async (url: string, topic: string) => {
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = `histori-bot-${topic.toLowerCase().replace(/\s/g, '-')}.mp4`;
      a.target = '_blank';
      a.click();
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom duration-500 pb-20">
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
          {archives.map((item) => {
            const daysLeft = getDaysLeft(item.timestamp);
            const isExpiringSoon = daysLeft <= 3;
            const hasExpired = daysLeft === 0;

            // Find first available scene image/video for preview
            const previewAsset = item.script.scenes.find(s => s.assetUrl)?.assetUrl;

            return (
              <div
                key={item.id}
                className={`bg-zinc-900 border ${hasExpired ? 'border-red-900/50' : 'border-white/10'} rounded-2xl p-0 hover:border-yellow-500/30 transition-all group relative overflow-hidden flex flex-col`}
              >
                {/* Preview Thumbnail */}
                <div className="aspect-video w-full bg-black relative overflow-hidden">
                  {previewAsset ? (
                    item.script.scenes.find(s => s.assetUrl && s.assetType === 'video') ? (
                      <video src={item.script.scenes.find(s => s.assetUrl && s.assetType === 'video')?.assetUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition" />
                    ) : (
                      <img src={previewAsset} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition" />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20">
                      <FileText size={48} />
                    </div>
                  )}

                  {/* Status Overlay */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter flex items-center gap-1 backdrop-blur-md shadow-lg ${hasExpired ? 'bg-red-500/80 text-white' : 'bg-black/60 text-yellow-500'}`}>
                      {hasExpired ? <AlertTriangle size={10} /> : <Clock size={10} />}
                      {hasExpired ? 'Links Expired' : `${daysLeft} Days Left`}
                    </div>
                  </div>

                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                      className="p-2 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition backdrop-blur-md"
                      title="Delete Archive"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-white truncate pr-2" title={item.topic}>{item.topic}</h3>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-1 uppercase tracking-wider font-semibold">
                      <Calendar size={10} />
                      <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6 flex-1">
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 bg-black/50 p-2 rounded-lg border border-white/5 font-mono">
                      <span className="text-yellow-500/80">SCENES: {item.script.scenes.length}</span>
                      <span className="text-zinc-700">|</span>
                      <span>{item.masterVideoUrl ? 'MASTER READY' : 'DRAFT ONLY'}</span>
                    </div>
                    {item.script.hook && (
                      <p className="text-xs text-zinc-500 italic line-clamp-2 leading-relaxed">"{item.script.hook}"</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <button
                      onClick={() => onLoad(item)}
                      className="py-2.5 bg-yellow-500 text-black font-bold rounded-xl transition flex items-center justify-center gap-2 text-xs uppercase hover:bg-yellow-400 active:scale-95"
                    >
                      {item.masterVideoUrl ? <Play size={14} /> : <Eye size={14} />}
                      {item.masterVideoUrl ? 'Re-Edit' : 'View'}
                    </button>

                    {item.masterVideoUrl && (
                      <button
                        onClick={() => handleDownload(item.masterVideoUrl!, item.topic)}
                        className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition flex items-center justify-center gap-2 text-xs uppercase active:scale-95"
                        title="Download MP4"
                      >
                        <Download size={14} />
                      </button>
                    )}

                    {item.masterVideoUrl && (
                      <button
                        onClick={() => copyToClipboard(item.masterVideoUrl!, item.id)}
                        className={`py-2.5 ${copiedId === item.id ? 'bg-green-500/20 text-green-500' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'} font-bold rounded-xl transition flex items-center justify-center gap-2 text-xs uppercase active:scale-95`}
                        title="Copy Video Link"
                      >
                        {copiedId === item.id ? <Check size={14} /> : <LinkIcon size={14} />}
                      </button>
                    )}

                    {!item.masterVideoUrl && (
                      <div className="py-2.5 bg-zinc-800/50 text-zinc-600 font-bold rounded-xl flex items-center justify-center gap-2 text-[10px] uppercase cursor-not-allowed">
                        Draft Only
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Archives;