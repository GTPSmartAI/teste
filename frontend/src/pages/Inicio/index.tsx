import React, { useState } from 'react';
import { Play, Search, Heart, Star, BookOpen } from 'lucide-react';
import { useManga } from '@/contexts/MangaContext';
import { ReadingCard } from '@/components/manga/ReadingCard';
import { MangaCard } from '@/components/manga/MangaCard';

export const InicioPage: React.FC = () => {
  const { currentUser, mangas, history, openMangaModal, openReader, setActiveTab, toggleFavorite, isFavorite } = useManga();
  const firstName = (currentUser.name.trim().split(/\s+/)[0] || 'leitor').toUpperCase();
  const [filter, setFilter] = useState<'all' | 'lendo' | 'manhwa' | 'shonen' | 'completo'>('all');

  const historyIds = history.map(h => h.id);

  const filteredMangas = mangas.filter(m => {
    if (filter === 'lendo') return historyIds.includes(m.id);
    if (filter === 'manhwa') return m.type.toLowerCase() === 'manhwa';
    if (filter === 'shonen') return m.genres.includes('Ação') || m.type.toLowerCase() === 'mangá';
    if (filter === 'completo') return m.status === 'concluido';
    return true;
  });

  // O catálogo já vem do servidor ordenado pela nota
  const featured = mangas.length > 0 ? mangas[0] : null;

  return (
    <div className="p-4 space-y-6">
      {/* Hero Welcome Card - Exact Aedolia Style */}
      <div className="relative overflow-hidden bg-radial-at-t from-[#0d281c] via-[#07150f] to-[#040906] border border-emerald-500/30 rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(0,245,155,0.2)]">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="bg-emerald-500/15 text-[#00f59b] border border-emerald-500/30 text-[9px] font-black tracking-widest px-2 py-0.5 rounded uppercase">
            PAINEL GERAL
          </span>
          <span className="text-[11px] font-semibold text-slate-400">
            Mangaflix Prime
          </span>
        </div>

        <h1 className="font-display font-black text-2xl text-white tracking-tight leading-tight">
          OLÁ, <span className="text-[#00f59b] drop-shadow-[0_0_15px_rgba(0,245,155,0.4)]">{firstName}!</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">
          Aqui está o status da sua biblioteca. Você pode continuar suas leituras de onde parou ou explorar os novos lançamentos.
        </p>

        {/* Stats row reais baseadas no usuário */}
        <div className="flex flex-wrap gap-2 mb-5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#081610]/80 border border-emerald-500/20 text-xs text-slate-300">
            <span>📖</span>
            <span><strong>{mangas.length}</strong> {mangas.length === 1 ? 'Obra Disponível' : 'Obras Disponíveis'}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#081610]/80 border border-emerald-500/20 text-xs text-slate-300">
            <span>⚡</span>
            <span><strong>{history.length}</strong> {history.length === 1 ? 'Obra em leitura' : 'Obras em leitura'}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              if (history.length > 0) {
                openReader(history[0].id, history[0].chapter);
              } else if (featured) {
                openMangaModal(featured.id);
              } else {
                setActiveTab('explorar');
              }
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#00f59b] to-[#059669] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,245,155,0.4)] transition-all active:scale-95 hover:shadow-[0_0_35px_rgba(0,245,155,0.6)]"
          >
            <Play className="w-4 h-4 fill-black" />
            {history.length > 0 ? 'CONTINUAR LENDO' : 'EXPLORAR CATÁLOGO'}
          </button>
          <button
            onClick={() => setActiveTab('explorar')}
            className="py-3 px-4 rounded-xl bg-[#081610] border border-emerald-500/30 text-[#00f59b] font-bold text-xs flex items-center justify-center gap-1.5 transition-all hover:bg-emerald-500/10 active:scale-95"
          >
            <Search className="w-4 h-4" />
            Explorar
          </button>
        </div>
      </div>

      {/* Featured Banner (Netflix Style) */}
      {featured ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00f59b] shadow-[0_0_8px_#00f59b]" />
              <h2 className="font-display font-black text-sm uppercase tracking-wider text-white">
                DESTAQUE DA SEMANA
              </h2>
            </div>
            <span className="text-[10px] font-extrabold text-[#00f59b] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              MAIS BEM AVALIADO
            </span>
          </div>

          <div className="relative h-64 md:h-80 lg:h-96 rounded-3xl overflow-hidden border border-emerald-500/30 shadow-2xl group">
            <img
              src={featured.banner}
              alt={featured.title}
              className="w-full h-full object-cover filter brightness-[0.55] group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#040906] via-[#040906]/60 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 space-y-2 max-w-3xl">
              <span className="text-[10px] md:text-xs font-black uppercase text-[#00f59b] tracking-widest bg-emerald-950/70 border border-emerald-500/30 px-2.5 py-1 rounded-md inline-block">
                {featured.type} • {featured.genres.join(' • ')}
              </span>
              <h3 className="font-display font-black text-2xl md:text-4xl text-white leading-tight">
                {featured.title}
              </h3>
              <p className="text-xs md:text-sm text-slate-300 line-clamp-2 md:line-clamp-3 leading-relaxed">
                {featured.synopsis}
              </p>

              <div className="flex items-center gap-4 text-xs pt-1">
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400" />
                  {featured.rating ? featured.rating.toFixed(1) : '5.0'} {featured.totalRatingsCount > 0 ? `(${featured.totalRatingsCount} avaliações)` : '(Obra Oficial)'}
                </span>
                <span className="text-slate-300 font-medium">
                  {featured.chaptersCount} {featured.chaptersCount === 1 ? 'Capítulo Disponível' : 'Capítulos Disponíveis'}
                </span>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  onClick={() => openMangaModal(featured.id)}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00f59b] to-[#059669] text-black font-black text-xs md:text-sm uppercase tracking-wider transition-all active:scale-95 shadow-[0_0_20px_rgba(0,245,155,0.4)] hover:shadow-[0_0_30px_rgba(0,245,155,0.6)]"
                >
                  Acessar Obra & Capítulos
                </button>
                <button
                  onClick={() => toggleFavorite(featured.id)}
                  className={`p-3 rounded-xl border transition-all ${
                    isFavorite(featured.id)
                      ? 'bg-[#00f59b] text-black border-[#00f59b]'
                      : 'bg-[#081610] text-[#00f59b] border-emerald-500/30 hover:bg-emerald-500/10'
                  }`}
                  title="Favoritar"
                >
                  <Heart className={`w-4 h-4 ${isFavorite(featured.id) ? 'fill-black' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#050d09] border border-emerald-500/20 rounded-3xl p-8 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-[#00f59b] mx-auto opacity-70" />
          <h3 className="font-display font-black text-lg text-white">Catálogo Limpo e Pronto</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Nenhuma obra cadastrada no momento. O sistema está pronto para ingestão de novas obras no MariaDB e MinIO.
          </p>
        </div>
      )}

      {/* Continuar Lendo Horizontal Carousel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00f59b] shadow-[0_0_8px_#00f59b]" />
            <h2 className="font-display font-black text-sm uppercase tracking-wider text-white">
              CONTINUAR LENDO ({history.length})
            </h2>
          </div>
          <button
            onClick={() => setActiveTab('perfil')}
            className="text-xs font-bold text-[#00f59b] hover:underline"
          >
            Ver Histórico
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {history.map(item => {
            const m = mangas.find(m => m.id === item.id);
            if (!m) return null;
            return (
              <ReadingCard
                key={item.id}
                manga={m}
                chapter={item.chapter}
                percent={item.percent}
              />
            );
          })}
        </div>
      </div>

      {/* Filter Chips Bar (Todos 14, Lendo 3, Manhwas 6...) */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            filter === 'all'
              ? 'bg-emerald-500/20 text-[#00f59b] border border-[#00f59b] shadow-[0_0_12px_rgba(0,245,155,0.2)]'
              : 'bg-[#091a12] text-slate-400 border border-emerald-500/20 hover:text-white'
          }`}
        >
          Todos {mangas.length}
        </button>
        <button
          onClick={() => setFilter('lendo')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            filter === 'lendo'
              ? 'bg-emerald-500/20 text-[#00f59b] border border-[#00f59b] shadow-[0_0_12px_rgba(0,245,155,0.2)]'
              : 'bg-[#091a12] text-slate-400 border border-emerald-500/20 hover:text-white'
          }`}
        >
          Lendo {history.length}
        </button>
        <button
          onClick={() => setFilter('manhwa')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            filter === 'manhwa'
              ? 'bg-emerald-500/20 text-[#00f59b] border border-[#00f59b] shadow-[0_0_12px_rgba(0,245,155,0.2)]'
              : 'bg-[#091a12] text-slate-400 border border-emerald-500/20 hover:text-white'
          }`}
        >
          Manhwas {mangas.filter(m => m.type.toLowerCase() === 'manhwa').length}
        </button>
        <button
          onClick={() => setFilter('shonen')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            filter === 'shonen'
              ? 'bg-emerald-500/20 text-[#00f59b] border border-[#00f59b] shadow-[0_0_12px_rgba(0,245,155,0.2)]'
              : 'bg-[#091a12] text-slate-400 border border-emerald-500/20 hover:text-white'
          }`}
        >
          Shonen {mangas.filter(m => m.genres.includes('Ação') || m.type.toLowerCase() === 'mangá').length}
        </button>
        <button
          onClick={() => setFilter('completo')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            filter === 'completo'
              ? 'bg-emerald-500/20 text-[#00f59b] border border-[#00f59b] shadow-[0_0_12px_rgba(0,245,155,0.2)]'
              : 'bg-[#091a12] text-slate-400 border border-emerald-500/20 hover:text-white'
          }`}
        >
          Concluídos {mangas.filter(m => m.status === 'concluido').length}
        </button>
      </div>

      {/* Grid of Mangas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00f59b] shadow-[0_0_8px_#00f59b]" />
            <h2 className="font-display font-black text-sm uppercase tracking-wider text-white">
              CATÁLOGO DE MANGÁS
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            {filteredMangas.length} Obras
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 md:gap-5">
          {filteredMangas.map(manga => (
            <MangaCard key={manga.id} manga={manga} />
          ))}
        </div>
      </div>
    </div>
  );
};
