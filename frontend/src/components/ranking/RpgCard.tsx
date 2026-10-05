import React from 'react';
import { useManga } from '@/contexts/MangaContext';

/** Cartão do leitor logado: nível, rank e XP vindos da conta. */
export const RpgCard: React.FC<{ position?: number }> = ({ position }) => {
  const { currentUser, history, favorites } = useManga();
  const rankShort = currentUser.rank.replace(/^RANK\s*/i, '');

  return (
    <div className="bg-gradient-to-br from-[#0d281c] to-[#06150e] border-2 border-emerald-500/40 rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.6),inset_0_0_20px_rgba(0,245,155,0.1)]">
      <div className="flex items-center gap-3.5">
        <div className="relative w-14 h-14 shrink-0">
          <div className="w-14 h-14 rounded-full bg-[#092c1c] text-[#00f59b] font-black text-2xl flex items-center justify-center border-2 border-[#00f59b] shadow-[0_0_16px_rgba(0,245,155,0.5)]">
            {currentUser.avatarInitial}
          </div>
          <span className="absolute -top-1 -right-1.5 bg-gradient-to-r from-[#00f59b] to-[#059669] text-black text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-[0_0_8px_#00f59b]">
            {rankShort}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <span className="font-display font-black text-base text-white truncate block">{currentUser.name}</span>
          <div className="text-[10px] font-black text-amber-400 my-0.5 tracking-wider">
            NÍVEL {currentUser.level} • {currentUser.rank}
          </div>
          <span className="text-[11px] font-semibold text-[#00f59b]">
            {currentUser.xp.toLocaleString('pt-BR')} XP{position ? ` • #${position} no ranking` : ''}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-emerald-500/20 text-[10px] font-bold text-slate-300">
        <span className="bg-black/40 px-2 py-1 rounded-full">{history.length} obras em leitura</span>
        <span className="bg-black/40 px-2 py-1 rounded-full">{favorites.length} favoritos</span>
      </div>
    </div>
  );
};
