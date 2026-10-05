import React from 'react';
import { Heart, Star } from 'lucide-react';
import type { Manga } from '@/types';
import { useManga } from '@/contexts/MangaContext';

interface MangaCardProps {
  manga: Manga;
}

export const MangaCard: React.FC<MangaCardProps> = ({ manga }) => {
  const { openMangaModal, toggleFavorite, isFavorite } = useManga();
  const favorited = isFavorite(manga.id);

  return (
    <div
      onClick={() => openMangaModal(manga.id)}
      className="bg-[#09140e] border border-emerald-500/20 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-[#00f59b] hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,245,155,0.25)] flex flex-col group"
    >
      <div className="relative w-full aspect-[3/4] overflow-hidden">
        <img
          src={manga.cover}
          alt={manga.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-md text-[#00f59b] text-[9px] font-black px-1.5 py-0.5 rounded border border-emerald-500/30">
          {manga.type}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(manga.id);
          }}
          className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
            favorited
              ? 'bg-[#00f59b] text-black shadow-[0_0_10px_#00f59b]'
              : 'bg-black/70 text-slate-400 border border-emerald-500/20 hover:text-white'
          }`}
          title="Favoritar"
        >
          <Heart className={`w-3.5 h-3.5 ${favorited ? 'fill-black' : ''}`} />
        </button>
      </div>

      <div className="p-2.5 flex flex-col gap-1">
        <span className="font-display font-black text-xs text-white truncate">
          {manga.title}
        </span>
        <span className="text-[10px] text-slate-400 truncate">
          {(Array.isArray(manga.genres) ? manga.genres : []).join(' • ')}
        </span>
        <div className="flex items-center justify-between mt-1 text-[10px]">
          <span className="text-[#00f59b] font-bold">{manga.chaptersCount} Caps</span>
          <span className="text-amber-400 font-bold flex items-center gap-0.5">
            <Star className="w-3 h-3 fill-amber-400" />
            {manga.rating}
          </span>
        </div>
      </div>
    </div>
  );
};
