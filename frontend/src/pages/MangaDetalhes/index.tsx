import React, { useEffect, useState } from 'react';
import { X, Play, Heart, Star, MessageSquare, ListOrdered, Info, Search, Send, ArrowUpDown } from 'lucide-react';
import { useManga } from '@/contexts/MangaContext';

export const MangaDetalhesModal: React.FC = () => {
  const {
    currentUser,
    activeManga,
    closeMangaModal,
    toggleFavorite,
    isFavorite,
    openReader,
    lastChapterRead,
    getChapters,
    loadChapters,
    getComments,
    loadComments,
    addComment,
  } = useManga();

  const [activeTab, setActiveTab] = useState<'capitulos' | 'comentarios' | 'sobre'>('capitulos');
  const [chapterSearch, setChapterSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(false); // false = mais recentes primeiro
  const [mangaCommentText, setMangaCommentText] = useState('');

  // Ao abrir outra obra: volta para a aba de capítulos e busca capítulos e comentários reais
  useEffect(() => {
    if (!activeManga) return;
    setActiveTab('capitulos');
    setChapterSearch('');
    loadChapters(activeManga.id);
    loadComments(activeManga.id);
  }, [activeManga?.id, loadChapters, loadComments]);

  if (!activeManga) return null;

  const favorited = isFavorite(activeManga.id);
  const lastRead = lastChapterRead(activeManga.id);
  const chapterNumbers = getChapters(activeManga.id);

  // Comentários gerais da obra (sem capítulo específico)
  const mangaComments = getComments(activeManga.id) || [];

  const chaptersList = (chapterNumbers || [])
    .map((num) => ({
      num,
      title: `Capítulo ${num.toString().padStart(2, '0')}`,
      isRead: lastRead >= num,
    }))
    .filter(c => c.num.toString().includes(chapterSearch.trim()) || c.title.toLowerCase().includes(chapterSearch.toLowerCase()))
    .sort((a, b) => sortAsc ? a.num - b.num : b.num - a.num);

  const handleSendMangaComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mangaCommentText.trim()) return;
    addComment(activeManga.id, mangaCommentText.trim());
    setMangaCommentText('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-[460px] md:max-w-2xl lg:max-w-3xl max-h-[92vh] bg-[#05110a] border border-emerald-500/30 rounded-t-[32px] md:rounded-[32px] overflow-y-auto relative shadow-2xl flex flex-col no-scrollbar">
        
        {/* Botão Fechar Modal */}
        <button
          onClick={closeMangaModal}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/75 border border-emerald-500/20 text-white flex items-center justify-center hover:bg-black transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Banner Cinematográfico */}
        <div className="relative h-44 w-full overflow-hidden shrink-0">
          <img
            src={activeManga.banner || activeManga.cover}
            alt={activeManga.title}
            className="w-full h-full object-cover filter brightness-[0.5]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05110a] via-[#05110a]/60 to-transparent" />
        </div>

        {/* Cabeçalho da Obra */}
        <div className="px-4 pb-4 -mt-14 relative space-y-4">
          <div className="flex gap-3.5 items-end">
            <img
              src={activeManga.cover}
              alt={activeManga.title}
              className="w-24 h-36 object-cover rounded-xl border-2 border-[#00f59b] shadow-[0_8px_24px_rgba(0,245,155,0.35)] shrink-0 bg-[#091a12]"
            />
            <div className="flex-1 space-y-1">
              <span className="text-[9px] font-black text-[#00f59b] tracking-wider uppercase">
                {activeManga.type}
              </span>
              <h2 className="font-display font-black text-lg text-white leading-tight">
                {activeManga.title}
              </h2>
              <span className="text-[11px] text-slate-400 block">
                Autor: {activeManga.author}
              </span>

              {/* Avaliação e Status */}
              <div className="flex items-center gap-2 pt-1 text-xs">
                {activeManga.totalRatingsCount > 0 ? (
                  <span className="text-amber-400 font-bold flex items-center gap-0.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    {activeManga.rating.toFixed(1)} ({activeManga.totalRatingsCount})
                  </span>
                ) : (
                  <span className="text-slate-500 text-[10px] font-semibold">Sem avaliações</span>
                )}
                <span className="text-[#00f59b] font-semibold text-[10px]">
                  {activeManga.status === 'lancando' ? 'Em Lançamento' : 'Concluído'}
                </span>
              </div>
            </div>
          </div>

          {/* Botões de Ação Principal (Favoritar e Ler) */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              onClick={() => openReader(activeManga.id, lastRead || chapterNumbers?.[0])}
              disabled={chapterNumbers !== undefined && chapterNumbers.length === 0}
              className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-[#00f59b] to-[#059669] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,245,155,0.35)] transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            >
              <Play className="w-4 h-4 fill-black" />
              {lastRead > 0
                ? `CONTINUAR CAP. ${lastRead}`
                : `LER CAPÍTULO ${chapterNumbers?.[0] ?? 1}`}
            </button>

            {/* Favoritar apenas na página da obra como solicitado */}
            <button
              onClick={() => toggleFavorite(activeManga.id)}
              className={`flex-1 py-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                favorited
                  ? 'bg-[#00f59b] text-black border-[#00f59b] shadow-[0_0_15px_rgba(0,245,155,0.3)]'
                  : 'bg-[#0c2016] text-[#00f59b] border-emerald-500/40 hover:bg-emerald-500/10'
              }`}
            >
              <Heart className={`w-4 h-4 ${favorited ? 'fill-black' : ''}`} />
              <span>{favorited ? 'Favoritado' : 'Favoritar'}</span>
            </button>
          </div>

          {/* Abas da Página de Detalhes: Capítulos | Comentários | Sobre */}
          <div className="flex items-center gap-1 border-b border-emerald-500/20 pt-2">
            <button
              onClick={() => setActiveTab('capitulos')}
              className={`flex items-center gap-1.5 py-2.5 px-3 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'capitulos'
                  ? 'text-[#00f59b] border-[#00f59b]'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Capítulos ({chapterNumbers ? chapterNumbers.length : '...'})</span>
            </button>

            <button
              onClick={() => setActiveTab('comentarios')}
              className={`flex items-center gap-1.5 py-2.5 px-3 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'comentarios'
                  ? 'text-[#00f59b] border-[#00f59b]'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Comentários ({mangaComments.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('sobre')}
              className={`flex items-center gap-1.5 py-2.5 px-3 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'sobre'
                  ? 'text-[#00f59b] border-[#00f59b]'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Sobre</span>
            </button>
          </div>

          {/* ABA 1: CAPÍTULOS MELHORADA */}
          {activeTab === 'capitulos' && (
            <div className="space-y-3 pt-1">
              {/* Barra de Busca e Ordenação de Capítulos */}
              <div className="flex items-center gap-2">
                <div className="flex-1 relative flex items-center bg-[#081510] border border-emerald-500/20 rounded-lg px-2.5 h-9">
                  <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={chapterSearch}
                    onChange={(e) => setChapterSearch(e.target.value)}
                    placeholder="Buscar capítulo..."
                    className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-500"
                  />
                </div>

                <button
                  onClick={() => setSortAsc(!sortAsc)}
                  className="h-9 px-2.5 bg-[#081510] border border-emerald-500/20 text-[#00f59b] rounded-lg text-xs font-bold flex items-center gap-1 hover:border-[#00f59b]"
                  title="Inverter ordem"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>{sortAsc ? 'Antigos' : 'Novos'}</span>
                </button>
              </div>

              {/* Lista Rica de Capítulos */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {chapterNumbers === undefined ? (
                  <div className="text-center py-8 text-xs text-slate-500">Carregando capítulos...</div>
                ) : chaptersList.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    {chapterNumbers.length === 0 ? 'Esta obra ainda não tem capítulos publicados.' : 'Nenhum capítulo encontrado para a busca.'}
                  </div>
                ) : (
                  chaptersList.map((c) => (
                    <button
                      key={c.num}
                      onClick={() => openReader(activeManga.id, c.num)}
                      className="w-full p-2.5 rounded-xl bg-[#081710] border border-emerald-500/15 hover:border-[#00f59b] hover:bg-[#0c2217] transition-all flex items-center justify-between text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#0e271c] border border-emerald-500/30 text-[#00f59b] font-black text-xs flex items-center justify-center group-hover:bg-[#00f59b] group-hover:text-black transition-colors">
                          {c.num}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-200 group-hover:text-white">
                            {c.title}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[9.5px] px-2 py-0.5 rounded font-black ${
                          c.isRead
                            ? 'bg-emerald-500/20 text-[#00f59b]'
                            : 'bg-amber-500/15 text-amber-400'
                        }`}
                      >
                        {c.isRead ? '✓ LIDO' : 'NOVO'}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ABA 2: COMENTÁRIOS DA OBRA */}
          {activeTab === 'comentarios' && (
            <div className="space-y-3 pt-1">
              {/* Form de Comentário */}
              <form onSubmit={handleSendMangaComment} className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-[#0d281e] border border-emerald-500/40 text-[#00f59b] font-black text-xs flex items-center justify-center shrink-0">
                  {currentUser.avatarInitial}
                </div>
                <div className="flex-1 flex bg-[#081510] border border-emerald-500/30 rounded-xl overflow-hidden focus-within:border-[#00f59b] transition-all">
                  <input
                    type="text"
                    value={mangaCommentText}
                    onChange={(e) => setMangaCommentText(e.target.value)}
                    placeholder="O que você achou desta obra? Deixe sua análise..."
                    className="flex-1 bg-transparent px-3 py-2 text-xs text-white outline-none placeholder:text-slate-500"
                  />
                  <button
                    type="submit"
                    disabled={!mangaCommentText.trim()}
                    className="px-3 bg-emerald-500/20 text-[#00f59b] hover:bg-[#00f59b] hover:text-black transition-all flex items-center justify-center disabled:opacity-30"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>

              {/* Lista de Comentários */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {mangaComments.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500 bg-[#081510] rounded-xl border border-emerald-500/10">
                    Ainda não há comentários gerais. Seja o primeiro a comentar!
                  </div>
                ) : (
                  mangaComments.map((c) => (
                    <div
                      key={c.id}
                      className="bg-[#081510] border border-emerald-500/15 rounded-xl p-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#112d20] border border-emerald-500/30 text-[#00f59b] font-bold text-[10px] flex items-center justify-center">
                            {c.userInitial}
                          </div>
                          <span className="text-xs font-bold text-white">{c.userName}</span>
                          <span className="text-[9px] bg-emerald-500/15 text-[#00f59b] px-1.5 py-0.2 rounded font-black">
                            {c.userRank}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500">{c.date}</span>
                      </div>

                      <p className="text-xs text-slate-300 pl-8 leading-relaxed break-words">
                        {c.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ABA 3: SOBRE A OBRA */}
          {activeTab === 'sobre' && (
            <div className="space-y-3 pt-1">
              <div className="bg-[#081510] border border-emerald-500/20 rounded-2xl p-3.5 space-y-2">
                <h4 className="font-display font-black text-xs text-white uppercase tracking-wider">
                  Sinopse Completa
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeManga.synopsis}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {activeManga.tags.map(t => (
                    <span
                      key={t}
                      className="text-[10px] bg-black/40 text-[#00f59b] border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#081510] border border-emerald-500/15 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-500 block">Autor / Artista:</span>
                  <strong className="text-white font-bold">{activeManga.author}</strong>
                </div>
                <div className="bg-[#081510] border border-emerald-500/15 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-500 block">Status:</span>
                  <strong className="text-[#00f59b] font-bold">
                    {activeManga.status === 'lancando' ? 'Em Publicação' : 'Concluído'}
                  </strong>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
