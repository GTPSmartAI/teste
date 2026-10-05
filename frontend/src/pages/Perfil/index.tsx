import React from 'react';
import { Trash2, LogOut, Heart, BookOpen } from 'lucide-react';
import { useManga } from '@/contexts/MangaContext';

export const PerfilPage: React.FC = () => {
  const { 
    mangas, 
    favorites, 
    history, 
    currentUser, 
    logout, 
    toggleFavorite, 
    removeFromHistory, 
    clearAllHistory, 
    openMangaModal, 
    openReader 
  } = useManga();

  const favoriteMangas = favorites
    .map(id => mangas.find(m => m.id === id))
    .filter(Boolean) as typeof mangas;

  return (
    <div className="p-4 space-y-5 max-w-4xl mx-auto">
      {/* Profile Card */}
      <div className="bg-gradient-to-br from-[#0e291d] to-[#06140e] border border-emerald-500/30 rounded-3xl p-5 shadow-xl">
        <div className="flex items-center justify-between gap-3.5 mb-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative w-14 h-14 rounded-full bg-[#0d3321] border-2 border-[#00f59b] text-[#00f59b] font-black text-2xl flex items-center justify-center shadow-[0_0_20px_rgba(0,245,155,0.4)] shrink-0">
              {currentUser.avatarInitial}
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#00f59b] border-2 border-[#06140e] rounded-full" />
            </div>

            <div className="min-w-0">
              <h2 className="font-display font-black text-base text-white truncate">{currentUser.name}</h2>
              <span className="text-[11px] text-slate-400 truncate block">{currentUser.email}</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[9px] font-bold bg-emerald-500/20 text-[#00f59b] border border-emerald-500/30 px-2 py-0.5 rounded">
                  ★ {currentUser.rank}
                </span>
                <span className="text-[9px] font-bold text-slate-400">
                  Nível {currentUser.level}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="py-2 px-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 shrink-0"
            title="Sair da Conta"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-emerald-500/15">
          <div className="bg-[#06110c]/70 border border-emerald-500/20 rounded-xl p-2 flex flex-col items-center">
            <span className="font-display font-black text-lg text-[#00f59b]">{favorites.length}</span>
            <span className="text-[10px] text-slate-400 font-semibold">Favoritos</span>
          </div>
          <div className="bg-[#06110c]/70 border border-emerald-500/20 rounded-xl p-2 flex flex-col items-center">
            <span className="font-display font-black text-lg text-[#00f59b]">{history.length}</span>
            <span className="text-[10px] text-slate-400 font-semibold">Obras Lidas</span>
          </div>
          <div className="bg-[#06110c]/70 border border-emerald-500/20 rounded-xl p-2 flex flex-col items-center">
            <span className="font-display font-black text-lg text-amber-300">{currentUser.xp} XP</span>
            <span className="text-[10px] text-slate-400 font-semibold">Experiência</span>
          </div>
        </div>
      </div>

      {/* Meus Favoritos Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#00f59b]" />
            <h2 className="font-display font-black text-sm uppercase tracking-wider text-white">
              MEUS FAVORITOS
            </h2>
          </div>
          <span className="text-[10px] font-bold text-[#00f59b] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            {favorites.length} Obras
          </span>
        </div>

        {favoriteMangas.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500 bg-[#081510] rounded-xl border border-emerald-500/10">
            Nenhum favorito salvo ainda. Toque no coração em qualquer mangá para salvar aqui!
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {favoriteMangas.map(m => (
              <div
                key={m.id}
                onClick={() => openMangaModal(m.id)}
                className="bg-[#091710] border border-emerald-500/20 rounded-xl overflow-hidden relative cursor-pointer group hover:border-[#00f59b] transition-all"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(m.id);
                  }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/75 text-rose-400 flex items-center justify-center text-xs hover:bg-rose-500 hover:text-white transition-colors z-10"
                  title="Remover dos favoritos"
                >
                  ✕
                </button>
                <div className="aspect-[3/4] overflow-hidden bg-slate-900">
                  <img
                    src={m.cover}
                    alt={m.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-2">
                  <h4 className="font-bold text-xs text-white truncate">{m.title}</h4>
                  <span className="text-[10px] text-slate-400">{m.chaptersCount} Caps</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Histórico de Leitura */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#00f59b]" />
            <h2 className="font-display font-black text-sm uppercase tracking-wider text-white">
              HISTÓRICO RECENTE
            </h2>
          </div>
          {history.length > 0 && (
            <button
              onClick={clearAllHistory}
              className="text-[10px] text-slate-400 hover:text-red-400 transition-colors"
            >
              Limpar Tudo
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500 bg-[#081510] rounded-xl border border-emerald-500/10">
            Nenhum capítulo lido recentemente.
          </div>
        ) : (
          <div className="space-y-2">
            {history.map(item => {
              const m = mangas.find(m => m.id === item.id);
              return (
                <div
                  key={`${item.id}-${item.chapter}`}
                  className="bg-[#081510] border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between hover:border-emerald-500/40 transition-all"
                >
                  <div
                    onClick={() => openReader(item.id, item.chapter)}
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  >
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[#00f59b] font-bold text-xs flex items-center justify-center shrink-0">
                      Cap {item.chapter}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{m?.title || item.id}</h4>
                      <span className="text-[10px] text-slate-400">Lido {item.date}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => removeFromHistory(item.id)}
                    className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                    title="Remover do histórico"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
