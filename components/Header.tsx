
import React from 'react';

interface HeaderProps {
  onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  return (
    <header className="border-b border-white/10 py-4 px-6 flex justify-between items-center bg-black/50 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center font-bold text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]">H</div>
        <h1 className="text-xl font-bold tracking-tight">HISTORI<span className="text-yellow-500">-BOT</span></h1>
      </div>
      <nav className="hidden md:flex gap-6 text-sm font-medium text-zinc-400">
        <a href="#" className="text-zinc-100 hover:text-white transition">Dashboard</a>
        <a href="#" className="hover:text-white transition">Archives</a>
        <button onClick={onOpenSettings} className="hover:text-white transition flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          Settings
        </button>
      </nav>
      <div className="flex items-center gap-4">
        <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-400 font-mono">v1.1.0</span>
        <button onClick={onOpenSettings} className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center hover:bg-zinc-700 transition">
           <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
        </button>
      </div>
    </header>
  );
};

export default Header;
