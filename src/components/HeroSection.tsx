import React from 'react';

interface HeroSectionProps {
  topic: string;
  setTopic: (topic: string) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ topic, setTopic, loading, onSubmit }) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in-95 duration-700">
      <h2 className="text-5xl md:text-7xl font-impact tracking-wider mb-6 text-center max-w-3xl uppercase">
        Make History <span className="text-yellow-500 underline decoration-zinc-800">Go Viral</span>
      </h2>
      <p className="text-zinc-400 text-lg mb-10 text-center max-w-xl">
        Coherent scene-by-scene generation. Powered by <b>Veo 3.1</b> and <b>FFmpeg</b> for seamless historical storytelling.
      </p>
      
      <form onSubmit={onSubmit} className="w-full max-w-2xl relative group">
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
  );
};

export default HeroSection;