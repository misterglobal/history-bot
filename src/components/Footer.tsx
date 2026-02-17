import React from 'react';
import { AppState } from '../types';

interface FooterProps {
    onNavigate: (state: AppState) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
    return (
        <footer className="w-full py-12 px-6 border-t border-white/5 bg-zinc-950 mt-20">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex flex-col items-center md:items-start">
                    <div className="text-xl font-impact tracking-widest text-white mb-2 uppercase">
                        HISTORI<span className="text-yellow-500">-BOT</span>
                    </div>
                    <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">
                        Splicing Chronological Reality Since 2026
                    </p>
                </div>

                <div className="flex items-center gap-8">
                    <button
                        onClick={() => onNavigate(AppState.PRIVACY)}
                        className="text-zinc-500 hover:text-yellow-500 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors"
                    >
                        Privacy Policy
                    </button>
                    <button
                        onClick={() => onNavigate(AppState.TERMS)}
                        className="text-zinc-500 hover:text-yellow-500 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors"
                    >
                        Terms of Service
                    </button>
                </div>

                <div className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
                    © 2026 Histori-Bot. No Rights Reserved.
                </div>
            </div>
        </footer>
    );
};

export default Footer;
