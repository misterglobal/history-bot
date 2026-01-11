import React, { useState } from 'react';

interface MasterVideoViewProps {
  videoUrl: string;
  topic: string;
  onReset: () => void;
  onError: (msg: string) => void;
}

const MasterVideoView: React.FC<MasterVideoViewProps> = ({ videoUrl, topic, onReset, onError }) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = `histori-bot-${topic.toLowerCase().replace(/\s/g, '-')}.mp4`;
      a.target = '_blank';
      a.click();
      
      // Fallback fetch method
      setTimeout(async () => {
        try {
          const response = await fetch(videoUrl);
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
      onError(`Download failed: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center py-10 animate-in fade-in slide-in-from-bottom duration-700">
      <div className="bg-zinc-900 p-8 rounded-[3rem] border border-yellow-500/30 shadow-2xl max-w-2xl w-full">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-impact tracking-widest text-yellow-500 uppercase">Master Content Generated</h2>
            <p className="text-zinc-500 text-sm uppercase">Topic: {topic}</p>
          </div>
          <button onClick={() => onReset()} className="text-zinc-500 hover:text-white text-xs uppercase tracking-widest">Edit Scenes</button>
        </div>

        <div className="aspect-[9/16] bg-black rounded-[2rem] overflow-hidden border border-white/10 shadow-inner mb-8 ring-4 ring-yellow-500/10">
          <video src={videoUrl} controls autoPlay className="w-full h-full object-cover" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={handleDownload}
            disabled={downloading}
            className="bg-yellow-500 text-zinc-950 font-bold py-4 rounded-2xl hover:bg-yellow-400 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            {downloading ? "DOWNLOADING..." : "DOWNLOAD MP4"}
          </button>
          <button onClick={onReset} className="bg-zinc-800 text-white font-bold py-4 rounded-2xl hover:bg-zinc-700 transition">
            START NEW PROJECT
          </button>
        </div>
      </div>
    </div>
  );
};

export default MasterVideoView;