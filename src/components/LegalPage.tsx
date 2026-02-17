import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface LegalPageProps {
    title: string;
    content: string;
    onBack: () => void;
}

const LegalPage: React.FC<LegalPageProps> = ({ title, content, onBack }) => {
    // Simple markdown renderer for the legal content
    const renderMarkdown = (text: string) => {
        return text.split('\n').map((line, i) => {
            if (line.startsWith('# ')) {
                return <h1 key={i} className="text-4xl font-impact tracking-widest text-white uppercase mb-8">{line.replace('# ', '')}</h1>;
            }
            if (line.startsWith('## ')) {
                return <h2 key={i} className="text-2xl font-impact tracking-widest text-yellow-500 uppercase mt-12 mb-4">{line.replace('## ', '')}</h2>;
            }
            if (line.startsWith('**')) {
                return <p key={i} className="text-zinc-400 text-sm mb-4"><strong>{line.replace(/\*\*/g, '')}</strong></p>;
            }
            if (line.trim() === '') {
                return <div key={i} className="h-4" />;
            }
            return <p key={i} className="text-zinc-400 text-sm leading-relaxed mb-4">{line}</p>;
        });
    };

    return (
        <div className="max-w-3xl mx-auto py-12 px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button
                onClick={onBack}
                className="group flex items-center gap-2 text-zinc-500 hover:text-white mb-12 transition-colors uppercase text-[10px] font-bold tracking-widest"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to App
            </button>

            <div className="prose prose-invert max-w-none">
                {renderMarkdown(content)}
            </div>
        </div>
    );
};

export default LegalPage;
