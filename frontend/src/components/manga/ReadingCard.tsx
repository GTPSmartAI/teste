import React from 'react';
import type { Manga } from '@/types';
import { useManga } from '@/contexts/MangaContext';

interface ReadingCardProps {
  manga: Manga;
  chapter: number;
  percent: number;
}

export const ReadingCard: React.FC<ReadingCardProps> = ({ manga, chapter, percent }) => {
  const { openReader } = useManga();
  if (!manga) return null;
  const safePercent = percent ?? 0;
  const isCompleted = safePercent >= 100;
  const safeType = (manga.type || 'Manhwa').toUpperCase();

  return (
    <div
      onClick={() => openReader(manga.id, chapter)}
      className="min-w-[175px] max-w-[175px] bg-gradient-to-b from-[#0d2118] to-[#081510] border border-emerald-500/20 rounded-2xl p-3 flex flex-col cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-[#00f59b] hover:shadow-[0_8px_24px_rgba(0,245,155,0.2)] group"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-black bg-black/40 text-slate-400 px-1.5 py-0.5 rounded">
          {safeType}
        </span>
        <span
          className={`text-[9.5px] font-black px-2 py-0.5 rounded-full border ${
            isCompleted
              ? 'bg-emerald-500/30 text-white border-[#00f59b]'
              : 'bg-emerald-500/15 text-[#00f59b] border-emerald-500/30'
          }`}
        >
          {safePercent}% LIDO
        </span>
      </div>

      <img
        src={manga.cover}
        alt={manga.title || 'Capa'}
        className="w-full h-28 object-cover rounded-xl mb-2 group-hover:scale-[1.02] transition-transform duration-300"
      />

      <span className="font-display font-black text-xs text-white truncate mb-0.5">
        {manga.title || 'Sem Título'}
      </span>
      <span className="text-[10.5px] font-bold text-[#00f59b]">
        Capítulo {chapter || 1}
      </span>

      <div className="w-full h-1 bg-[#11281e] rounded-full mt-2 overflow-hidden">
        <div
          className="h-full bg-[#00f59b] shadow-[0_0_8px_#00f59b] transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, safePercent))}%` }}
        />
      </div>
    </div>
  );
};
