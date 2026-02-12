import React, { useState, useRef } from 'react';
import { Film, User, Plus, Trash2, Clapperboard, X, Monitor, Smartphone, Upload, LucideProps } from 'lucide-react';
import { CastMember, AspectRatio } from '../types';

interface TrailerInputProps {
    onGenerate: (title: string, genre: string, cast: CastMember[], plot: string, aspectRatio: AspectRatio) => void;
    onCancel: () => void;
    isGenerating?: boolean;
}

const TrailerInput: React.FC<TrailerInputProps> = ({ onGenerate, onCancel, isGenerating = false }) => {
    const [title, setTitle] = useState('');
    const [genre, setGenre] = useState('');
    const [plot, setPlot] = useState('');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    const [cast, setCast] = useState<CastMember[]>([
        { role: 'Lead Actor', name: '' },
        { role: 'Lead Actress', name: '' }
    ]);
    const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const addCastMember = () => {
        setCast([...cast, { role: 'Supporting', name: '' }]);
    };

    const removeCastMember = (index: number) => {
        setCast(cast.filter((_, i) => i !== index));
    };

    const updateCastMember = (index: number, field: keyof CastMember, value: string) => {
        const newCast = [...cast];
        // @ts-ignore
        newCast[index][field] = value;
        setCast(newCast);
    };

    const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            updateCastMember(index, 'imageUrl', base64String);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !genre || !plot || cast.some(c => !c.name)) {
            alert('Please fill in all fields');
            return;
        }
        onGenerate(title, genre, cast, plot, aspectRatio);
    };

    // Preset Genres
    const genres = ["Action Thriller", "Sci-Fi Horror", "Romantic Comedy", "Epic Fantasy", "Noir Mystery", "Cyberpunk", "Period Drama"];

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2 mb-8">
                <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-amber-600 bg-clip-text text-transparent flex items-center justify-center gap-3">
                    <Clapperboard className="text-yellow-500" size={36} />
                    Movie Trailer Mode
                </h2>
                <p className="text-zinc-400 max-w-xl mx-auto">
                    Cast your favorite stars in a fake movie trailer. Generate a script, visual prompts, and scenes automatically.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-8 shadow-xl backdrop-blur-sm space-y-8">

                {/* Title & Genre */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-zinc-300">Movie Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. The Last Barista"
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-zinc-300">Genre</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={genre}
                                onChange={(e) => setGenre(e.target.value)}
                                placeholder="e.g. Sci-Fi Noir"
                                list="genre-suggestions"
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition"
                            />
                            <datalist id="genre-suggestions">
                                {genres.map(g => <option key={g} value={g} />)}
                            </datalist>
                        </div>
                    </div>
                </div>

                {/* Aspect Ratio Selector */}
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-zinc-300">Aspect Ratio</label>
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => setAspectRatio('16:9')}
                            className={`flex-1 p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${aspectRatio === '16:9' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-black/30 border-white/10 text-zinc-500 hover:border-white/30 hover:text-zinc-300'}`}
                        >
                            <Monitor size={24} />
                            <span className="font-bold text-sm">Cinematic (16:9)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setAspectRatio('9:16')}
                            className={`flex-1 p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${aspectRatio === '9:16' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-black/30 border-white/10 text-zinc-500 hover:border-white/30 hover:text-zinc-300'}`}
                        >
                            <Smartphone size={24} />
                            <span className="font-bold text-sm">Social (9:16)</span>
                        </button>
                    </div>
                </div>

                {/* Plot */}
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-zinc-300">Plot Summary</label>
                    <textarea
                        value={plot}
                        onChange={(e) => setPlot(e.target.value)}
                        placeholder="In a world where coffee is illegal, one barista fights back..."
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition min-h-[100px]"
                    />
                </div>

                {/* Cast List */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="block text-sm font-medium text-zinc-300">Starring Cast</label>
                        <button
                            type="button"
                            onClick={addCastMember}
                            className="text-xs flex items-center gap-1 text-yellow-500 hover:text-yellow-400 transition"
                        >
                            <Plus size={12} /> Add Actor
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {cast.map((member, index) => (
                            <div key={index} className="flex gap-3 items-center group">
                                <div className="w-10 h-10 rounded-full bg-black/50 border border-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden hover:border-yellow-500/50 transition cursor-pointer group/avatar relative"
                                    onClick={() => fileInputRefs.current[index]?.click()}>
                                    {member.imageUrl ? (
                                        <img src={member.imageUrl} alt={member.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={18} className="text-zinc-600 group-hover/avatar:text-yellow-500 transition" />
                                    )}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition">
                                        <Upload size={14} className="text-white" />
                                    </div>
                                    <input
                                        type="file"
                                        ref={el => fileInputRefs.current[index] = el}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(index, e)}
                                    />
                                </div>
                                <div className="w-1/3">
                                    <select
                                        value={member.role}
                                        onChange={(e) => updateCastMember(index, 'role', e.target.value)}
                                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:border-yellow-500/30 outline-none"
                                    >
                                        <option value="Lead Actor">Lead Actor</option>
                                        <option value="Lead Actress">Lead Actress</option>
                                        <option value="Supporting">Supporting</option>
                                        <option value="Villain">Villain</option>
                                    </select>
                                </div>
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={member.name}
                                        onChange={(e) => updateCastMember(index, 'name', e.target.value)}
                                        placeholder="Actor Name"
                                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-yellow-500/30 outline-none"
                                    />
                                </div>
                                {cast.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeCastMember(index)}
                                        className="p-2 text-zinc-600 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-4 border-t border-white/5">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-zinc-400 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isGenerating}
                        className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-bold py-3 px-6 rounded-xl hover:shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                Generating Script...
                            </>
                        ) : (
                            <>
                                <Film size={20} />
                                Generate Trailer Script
                            </>
                        )}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default TrailerInput;
