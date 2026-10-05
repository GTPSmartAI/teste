import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Send, MessageSquare, CheckCircle2 } from 'lucide-react';
import { useManga } from '@/contexts/MangaContext';
import { api } from '@/services/api';

export const LeitorPage: React.FC = () => {
  const {
    currentUser,
    readerState,
    closeReader,
    goToNextChapter,
    goToPrevChapter,
    hasNextChapter,
    hasPrevChapter,
    getChapters,
    history,
    saveProgress,
    getComments,
    loadComments,
    addComment,
  } = useManga();

  const [commentText, setCommentText] = useState('');
  const [chapterPages, setChapterPages] = useState<string[]>([]);
  const [translatedPages, setTranslatedPages] = useState<string[]>([]);
  const [loadingPages, setLoadingPages] = useState<boolean>(false);
  const [hasTranslation, setHasTranslation] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'pt' | 'orig'>('pt');
  const [translationStatusMsg, setTranslationStatusMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Maior % já salvo deste capítulo (só grava quando passa de 25%, 50%, 75% e 100%)
  const savedPercentRef = useRef(0);

  useEffect(() => {
    if (!readerState.manga) return;
    const h = history.find((item) => item.id === readerState.manga!.id);
    savedPercentRef.current = h && h.chapter === readerState.chapter ? h.percent : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readerState.chapter, readerState.manga?.id]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el || !readerState.manga || loadingPages || chapterPages.length === 0) return;
    const max = el.scrollHeight - el.clientHeight;
    const ratio = max > 0 ? el.scrollTop / max : 1;
    const step = ratio >= 0.95 ? 100 : Math.floor(ratio * 4) * 25;
    if (step > savedPercentRef.current) {
      savedPercentRef.current = step;
      saveProgress(readerState.manga.id, readerState.chapter, step);
    }
  };

  // Busca páginas reais do capítulo e checa se já existe versão traduzida no MinIO
  useEffect(() => {
    if (!readerState.isOpen || !readerState.manga) return;
    const mangaId = readerState.manga.id;
    const chapter = readerState.chapter;
    // Trocando de capítulo rápido, a resposta do capítulo anterior pode chegar depois: é ignorada
    let stale = false;
    setLoadingPages(true);
    setChapterPages([]);
    setTranslatedPages([]);
    setHasTranslation(false);
    setTranslationStatusMsg(null);
    loadComments(mangaId, chapter);

    // 1. Páginas oficiais do capítulo
    const fetchPages = api.getChapterPages(mangaId, chapter)
      .then((data) => {
        if (!stale) setChapterPages(Array.isArray(data.pages_json) ? data.pages_json : []);
      })
      .catch(() => {});

    // 2. Versão traduzida já pronta no MinIO
    const checkTranslation = api.getChapterTranslation(mangaId, chapter)
      .then((data) => {
        if (stale || !data.translated || !Array.isArray(data.pages) || data.pages.length === 0) return;
        setTranslatedPages(data.pages);
        setHasTranslation(true);
      })
      .catch(() => {});

    Promise.all([fetchPages, checkTranslation]).finally(() => {
      if (!stale) setLoadingPages(false);
    });
    return () => {
      stale = true;
    };
  }, [readerState.isOpen, readerState.chapter, readerState.manga?.id, loadComments]);

  // Função para disparar a tradução IA sob demanda
  const handleTriggerTranslation = async () => {
    if (!readerState.manga || isTranslating) return;
    setIsTranslating(true);
    setTranslationStatusMsg('Extraindo balões via OCR e traduzindo para PT-BR...');

    try {
      const data = await api.translateChapter(readerState.manga.id, readerState.chapter, 15);
      if (data && data.pages && data.pages.length > 0) {
        setTranslatedPages(data.pages);
        setHasTranslation(true);
        setSelectedLanguage('pt');
        setTranslationStatusMsg('Tradução concluída com sucesso!');
        setTimeout(() => setTranslationStatusMsg(null), 4000);
      }
    } catch {
      setTranslationStatusMsg('Erro ao traduzir. Exibindo versão original.');
      setTimeout(() => setTranslationStatusMsg(null), 5000);
    } finally {
      setIsTranslating(false);
    }
  };

  // Scroll para o topo sempre que mudar de capítulo
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [readerState.chapter, readerState.manga?.id]);

  // Atalhos de teclado no Desktop (Setas e Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!readerState.isOpen) return;
      if (e.key === 'Escape') closeReader();
      if (e.key === 'ArrowRight' && hasNextChapter) goToNextChapter();
      if (e.key === 'ArrowLeft' && hasPrevChapter) goToPrevChapter();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readerState.isOpen, hasNextChapter, hasPrevChapter, closeReader, goToNextChapter, goToPrevChapter]);

  if (!readerState.isOpen || !readerState.manga) return null;

  const { manga, chapter } = readerState;

  // Comentários específicos deste capítulo
  const chapterComments = getComments(manga.id, chapter) || [];
  const totalChapters = getChapters(manga.id)?.length;

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment(manga.id, commentText.trim(), chapter);
    setCommentText('');
  };

  // Páginas ativas baseadas no idioma selecionado
  const currentDisplayPages = (selectedLanguage === 'pt' && hasTranslation && translatedPages.length > 0)
    ? translatedPages
    : chapterPages;

  return (
    <div className="fixed inset-0 z-50 bg-[#020503] flex flex-col select-none animate-in fade-in duration-200">
      {/* Topbar com Controles de Idioma e Tradução */}
      <div className="h-14 py-2 px-3 bg-[#050d09]/95 backdrop-blur-md border-b border-emerald-500/20 flex items-center justify-between z-20 shrink-0">
        <button
          onClick={closeReader}
          className="w-8 h-8 rounded-full bg-[#0d281e] border border-emerald-500/30 text-[#00f59b] flex items-center justify-center hover:bg-emerald-500/20 transition-all active:scale-95 shrink-0"
          title="Voltar ao catálogo"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center max-w-[45%] text-center">
          <span className="font-display font-black text-xs text-white truncate w-full">
            {manga.title}
          </span>
          <span className="text-[10px] font-bold text-[#00f59b] flex items-center gap-1.5 truncate">
            Capítulo {chapter.toString().padStart(2, '0')}
            {currentDisplayPages.length > 0 && (
              <span className="text-slate-400 font-normal">({currentDisplayPages.length} págs)</span>
            )}
          </span>
        </div>

        {/* Switcher de Idioma & Status de Tradução */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center bg-[#07160f] border border-emerald-500/30 rounded-xl p-0.5 shadow-sm">
            <button
              onClick={() => setSelectedLanguage('pt')}
              className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                selectedLanguage === 'pt'
                  ? 'bg-emerald-500/25 text-[#00f59b] border border-emerald-500/40 shadow-[0_0_8px_rgba(0,245,155,0.25)]'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Ler em Português"
            >
              🇧🇷 PT-BR
            </button>
            <button
              onClick={() => setSelectedLanguage('orig')}
              className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                selectedLanguage === 'orig'
                  ? 'bg-emerald-500/25 text-[#00f59b] border border-emerald-500/40 shadow-[0_0_8px_rgba(0,245,155,0.25)]'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Ler versão Original"
            >
              🌐 Original
            </button>
          </div>
        </div>
      </div>

      {/* Banner de Aviso de Tradução / Progresso */}
      {translationStatusMsg && (
        <div className="bg-emerald-950/80 border-b border-emerald-500/30 px-3 py-1.5 text-center text-xs text-[#00f59b] font-semibold flex items-center justify-center gap-2 animate-in fade-in">
          {isTranslating && <div className="w-3.5 h-3.5 border-2 border-[#00f59b] border-t-transparent rounded-full animate-spin" />}
          {translationStatusMsg}
        </div>
      )}

      {/* Sugestão de Tradução caso esteja em PT-BR e não haja versão traduzida */}
      {!hasTranslation && !isTranslating && selectedLanguage === 'pt' && (
        <div className="bg-[#06180f] border-b border-emerald-500/20 px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-300">
          <span className="truncate">Capítulo exibindo páginas originais. Deseja traduzir balões com IA?</span>
          <button
            onClick={handleTriggerTranslation}
            className="ml-2 px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#00f59b] to-[#059669] text-black font-black text-[9px] uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shrink-0"
          >
            Traduzir IA
          </button>
        </div>
      )}

      {/* Pages Container - Rolagem Infinita Contínua Webtoon (Sem emendas) */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center bg-[#020503] scroll-smooth"
      >
        <div className="w-full max-w-[680px] flex flex-col items-center">
          {loadingPages ? (
            <div className="py-32 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-[#00f59b] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                Carregando Capítulo {chapter}...
              </span>
            </div>
          ) : currentDisplayPages.length > 0 ? (
            currentDisplayPages.map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt={`Painel ${idx + 1}`}
                className="w-full h-auto block m-0 p-0 border-0 shadow-lg object-cover pointer-events-none"
                loading="eager"
              />
            ))
          ) : (
            <div className="py-24 text-center text-xs text-slate-400">
              Este capítulo ainda não tem páginas disponíveis.
            </div>
          )}

          {/* Fim do Capítulo: Banner de Conclusão, Avaliação e Comentários */}
          <div className="w-full p-4 md:p-6 space-y-6 bg-[#040c07] border-t border-emerald-500/30 mt-2">
            
            {/* Card de Fim de Capítulo */}
            <div className="bg-gradient-to-br from-[#0d281c] to-[#06150e] border border-emerald-500/40 rounded-2xl p-5 text-center space-y-4 shadow-xl">
              <div className="flex items-center justify-center gap-2 text-[#00f59b]">
                <CheckCircle2 className="w-6 h-6 animate-pulse" />
                <span className="font-display font-black text-sm uppercase tracking-wider">
                  Você concluiu o Capítulo {chapter}!
                </span>
              </div>

              {/* Botões de Navegação Entre Capítulos */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={goToPrevChapter}
                  disabled={!hasPrevChapter}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#0a1a12] border border-emerald-500/30 text-[#00f59b] font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:pointer-events-none hover:bg-emerald-500/10 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Cap. Anterior
                </button>

                <button
                  onClick={goToNextChapter}
                  disabled={!hasNextChapter}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#00f59b] to-[#059669] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:pointer-events-none shadow-[0_0_20px_rgba(0,245,155,0.35)] transition-all active:scale-95"
                >
                  Próximo Cap.
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Seção de Comentários do Capítulo */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#00f59b]" />
                  <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
                    Comentários do Cap. {chapter} ({chapterComments.length})
                  </h3>
                </div>
              </div>

              {/* Formulário de Novo Comentário */}
              <form onSubmit={handleSendComment} className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-[#0d281e] border border-emerald-500/40 text-[#00f59b] font-black text-xs flex items-center justify-center shrink-0">
                  {currentUser.avatarInitial}
                </div>
                <div className="flex-1 flex bg-[#081510] border border-emerald-500/30 rounded-xl overflow-hidden focus-within:border-[#00f59b] focus-within:shadow-[0_0_12px_rgba(0,245,155,0.2)] transition-all">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={`Comente sobre o capítulo ${chapter}...`}
                    className="flex-1 bg-transparent px-3 py-2 text-xs text-white outline-none placeholder:text-slate-500"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="px-3 bg-emerald-500/20 text-[#00f59b] hover:bg-[#00f59b] hover:text-black transition-all flex items-center justify-center disabled:opacity-30"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>

              {/* Lista de Comentários */}
              <div className="space-y-2.5">
                {chapterComments.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500 bg-[#06120b] rounded-xl border border-emerald-500/10">
                    Seja o primeiro a comentar sobre este capítulo!
                  </div>
                ) : (
                  chapterComments.map((c) => (
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
          </div>
        </div>
      </div>

      {/* Floating Bottom Bar - Apenas Avançar/Voltar Capítulo Conforme Solicitado */}
      <div className="h-12 bg-[#050d09]/95 backdrop-blur-md border-t border-emerald-500/20 px-4 flex items-center justify-between shrink-0 z-20">
        <button
          onClick={goToPrevChapter}
          disabled={!hasPrevChapter}
          className="flex items-center gap-1 text-xs font-bold text-[#00f59b] disabled:opacity-30 disabled:pointer-events-none hover:underline"
        >
          <ChevronLeft className="w-4 h-4" />
          Cap. Anterior
        </button>

        <div className="flex flex-col items-center">
          <span className="text-xs font-black text-white">
            Capítulo <strong className="text-[#00f59b]">{chapter}</strong>
          </span>
          {totalChapters !== undefined && (
            <span className="text-[9px] text-slate-400 font-semibold">
              de {totalChapters} capítulos
            </span>
          )}
        </div>

        <button
          onClick={goToNextChapter}
          disabled={!hasNextChapter}
          className="flex items-center gap-1 text-xs font-bold text-[#00f59b] disabled:opacity-30 disabled:pointer-events-none hover:underline"
        >
          Próximo Cap.
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
