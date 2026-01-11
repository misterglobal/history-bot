import React from 'react';

export const ErrorBanner: React.FC<{ error: string; onDismiss: () => void }> = ({ error, onDismiss }) => (
  <div className="mb-8 p-4 bg-red-900/20 border border-red-500/50 rounded-xl flex items-center justify-between animate-in slide-in-from-top duration-300">
    <p className="text-red-400 text-sm">Error: {error}</p>
    <button onClick={onDismiss} className="text-red-400 hover:text-white">✕</button>
  </div>
);

export const LoadingOverlay: React.FC<{ message: string }> = ({ message }) => (
  <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex flex-col items-center justify-center text-center">
    <div className="w-24 h-24 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-8"></div>
    <h3 className="text-3xl font-impact tracking-widest text-yellow-500 uppercase mb-3 animate-pulse">{message}</h3>
  </div>
);

export const RenderingOverlay: React.FC<{ message: string }> = ({ message }) => (
  <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[100] flex flex-col items-center justify-center text-center p-6">
    <div className="relative mb-12">
      <div className="w-40 h-40 border-8 border-yellow-500/10 rounded-full"></div>
      <div className="absolute inset-0 w-40 h-40 border-8 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center text-4xl font-impact text-yellow-500 tracking-widest">VEO</div>
    </div>
    <h3 className="text-4xl font-impact tracking-widest text-white uppercase mb-4">{message}</h3>
    <p className="text-zinc-500 uppercase text-xs tracking-[0.5em] animate-pulse">Rendering coherent historical segments...</p>
  </div>
);