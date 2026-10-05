import React from 'react';
import { Crown } from 'lucide-react';
import type { ApiRankingUser } from '@/services/api';

const STYLES = {
  1: { medal: null, avatar: 'w-[52px] h-[52px] border-amber-400 text-amber-400 text-xl shadow-[0_0_18px_rgba(251,191,36,0.35)]', bar: 'h-24 border-[#00f59b] shadow-[0_0_20px_rgba(0,245,155,0.25)] from-[#133928]' },
  2: { medal: '🥈', avatar: 'w-11 h-11 border-slate-400 text-white text-base', bar: 'h-16 border-emerald-500/20 from-[#0f241a]' },
  3: { medal: '🥉', avatar: 'w-11 h-11 border-amber-700 text-white text-base', bar: 'h-12 border-emerald-500/20 from-[#0c1c14]' },
} as const;

/** Top 3 do ranking (2º, 1º, 3º da esquerda para a direita). */
export const Podium: React.FC<{ top: ApiRankingUser[] }> = ({ top }) => {
  if (top.length === 0) return null;
  const order = [top[1], top[0], top[2]].filter(Boolean) as ApiRankingUser[];

  return (
    <div className="flex items-end justify-center gap-2.5 my-4 px-2">
      {order.map((u) => {
        const s = STYLES[u.pos as 1 | 2 | 3];
        return (
          <div key={u.pos} className="flex-1 flex flex-col items-center min-w-0">
            <div className="relative mb-1.5">
              {u.pos === 1 ? (
                <Crown className="absolute -top-4 -right-1 w-5 h-5 text-amber-400 fill-amber-400" />
              ) : (
                <span className="absolute -top-3.5 -right-1 text-sm">{s.medal}</span>
              )}
              <div className={`rounded-full bg-[#0a1b12] border-2 font-black flex items-center justify-center ${s.avatar}`}>
                {u.initial}
              </div>
            </div>
            <span className="text-[11px] font-black text-white truncate max-w-full">{u.name}</span>
            <span className="text-[9.5px] text-[#00f59b] font-bold">{u.xp.toLocaleString('pt-BR')} XP</span>
            <div className={`w-full bg-gradient-to-b to-[#071710] border border-b-0 rounded-t-xl flex flex-col items-center justify-center mt-1.5 ${s.bar}`}>
              <span className="font-display font-black text-base text-white">{u.pos}</span>
              <span className="text-[8px] font-bold text-[#00f59b]">{u.rank}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
