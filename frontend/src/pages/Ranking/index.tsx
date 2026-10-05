import React, { useEffect, useState } from 'react';
import { api, ApiRankingUser } from '@/services/api';
import { RpgCard } from '@/components/ranking/RpgCard';
import { Podium } from '@/components/ranking/Podium';

export const RankingPage: React.FC = () => {
  const [ranking, setRanking] = useState<ApiRankingUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getRanking()
      .then(setRanking)
      .catch((err: Error) => setError(err.message));
  }, []);

  const myPosition = ranking?.find((u) => u.isUser)?.pos;

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="font-display font-black text-xl text-white">
          RANKING DE <span className="text-[#00f59b]">CAÇADORES</span>
        </h1>
        <p className="text-xs text-slate-400">
          Quem lê mais, ganha mais XP e sobe no Rank de Caçadores!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <RpgCard position={myPosition} />
        {ranking && <Podium top={ranking.slice(0, 3)} />}
      </div>

      <div className="space-y-2.5 pt-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00f59b] shadow-[0_0_8px_#00f59b]" />
          <h2 className="font-display font-black text-sm uppercase tracking-wider text-white">
            CLASSIFICAÇÃO GERAL
          </h2>
        </div>

        {error && (
          <div className="p-4 text-center text-xs text-red-300 bg-red-950/40 rounded-xl border border-red-500/30">{error}</div>
        )}
        {!ranking && !error && (
          <div className="p-4 text-center text-xs text-slate-500">Carregando ranking...</div>
        )}

        <div className="flex flex-col gap-2">
          {ranking?.map(user => (
            <div
              key={user.pos}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                user.isUser
                  ? 'bg-gradient-to-r from-[#0d281c] to-[#081510] border-[#00f59b] shadow-[0_0_15px_rgba(0,245,155,0.2)]'
                  : 'bg-[#091710] border-emerald-500/15 hover:border-emerald-500/30'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-display font-black text-xs text-slate-400 w-6">#{user.pos}</span>
                <div className="w-8 h-8 rounded-full bg-[#112d20] border border-emerald-500/30 text-[#00f59b] font-black text-xs flex items-center justify-center shrink-0">
                  {user.initial}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                    {user.name}
                    {user.isUser && (
                      <span className="text-[8px] bg-[#00f59b] text-black font-black px-1 rounded">VOCÊ</span>
                    )}
                  </span>
                  <span className="text-[9.5px] text-[#00f59b] font-semibold">
                    {user.rank} • Nível {user.level}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end shrink-0">
                <span className="text-xs font-black text-[#00f59b]">{user.xp.toLocaleString('pt-BR')} XP</span>
                <span className="text-[9.5px] text-slate-500 font-medium">{user.total_lidos} obras lidas</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
