import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { AppTab, Comment, HistoryItem, Manga } from '@/types';
import { api, ApiComment } from '@/services/api';
import { logout as sessionLogout, SessionUser } from '@/services/session';

interface ReaderState {
  isOpen: boolean;
  manga: Manga | null;
  chapter: number;
}

interface MangaContextType {
  currentUser: SessionUser;
  mangas: Manga[];
  catalogError: string | null;
  favorites: string[];
  history: HistoryItem[];
  activeManga: Manga | null;
  readerState: ReaderState;
  activeTab: AppTab;
  toastMessage: string | null;
  setActiveTab: (tab: AppTab) => void;
  logout: () => void;
  openMangaModal: (mangaId: string) => void;
  closeMangaModal: () => void;
  toggleFavorite: (mangaId: string) => void;
  isFavorite: (mangaId: string) => boolean;
  lastChapterRead: (mangaId: string) => number;
  getChapters: (mangaId: string) => number[] | undefined;
  loadChapters: (mangaId: string) => Promise<number[]>;
  openReader: (mangaId: string, chapter?: number) => void;
  saveProgress: (mangaId: string, chapter: number, percent: number) => void;
  closeReader: () => void;
  goToNextChapter: () => void;
  goToPrevChapter: () => void;
  hasNextChapter: boolean;
  hasPrevChapter: boolean;
  removeFromHistory: (mangaId: string) => void;
  clearAllHistory: () => void;
  getComments: (mangaId: string, chapterNumber?: number) => Comment[] | undefined;
  loadComments: (mangaId: string, chapterNumber?: number) => void;
  addComment: (mangaId: string, text: string, chapterNumber?: number) => void;
  showToast: (msg: string) => void;
}

const MangaContext = createContext<MangaContextType | undefined>(undefined);

const commentsKey = (mangaId: string, chapterNumber?: number) => `${mangaId}|${chapterNumber ?? 'obra'}`;

export function formatDate(value?: string | null): string {
  if (!value) return 'Agora';
  const d = new Date(value.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('pt-BR');
}

function mapComment(c: ApiComment): Comment {
  return {
    id: c.id,
    mangaId: c.manga_id,
    chapterNumber: c.chapter_number,
    userName: c.user_name,
    userInitial: c.userInitial || (c.user_name || 'U').charAt(0).toUpperCase(),
    userRank: c.user_rank || '',
    date: formatDate(c.created_at),
    text: c.text,
  };
}

export const MangaProvider: React.FC<{ user: SessionUser; children: React.ReactNode }> = ({ user, children }) => {
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [chaptersByManga, setChaptersByManga] = useState<Record<string, number[]>>({});
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [activeManga, setActiveManga] = useState<Manga | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('inicio');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [readerState, setReaderState] = useState<ReaderState>({ isOpen: false, manga: null, chapter: 1 });
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMessage(null), 2500);
  }, []);

  // Catálogo oficial (base MariaDB 'aaa')
  useEffect(() => {
    api.getMangas()
      .then((dbMangas) => {
        setCatalogError(null);
        setMangas(dbMangas.map((m) => ({
          id: m.id,
          title: m.title,
          type: m.type || 'Manhwa',
          genres: Array.isArray(m.genres) ? m.genres : [],
          cover: m.cover || '',
          banner: m.banner || m.cover || '',
          rating: Number(m.rating) || 0,
          totalRatingsCount: m.total_ratings_count || 0,
          author: m.author || 'Autor desconhecido',
          status: m.status || 'lancando',
          chaptersCount: m.chapters_count || 0,
          synopsis: m.synopsis || '',
          tags: Array.isArray(m.tags) ? m.tags : [],
        })));
      })
      .catch(() => setCatalogError('Não foi possível carregar o catálogo. Verifique a conexão e recarregue a página.'));
  }, []);

  // Favoritos e histórico vêm do servidor (a conta é a mesma no site e no APK)
  useEffect(() => {
    api.getFavorites().then(setFavorites).catch(() => {});
    api.getHistory()
      .then((items) => setHistory(items.map((h) => ({
        id: h.manga_id,
        chapter: h.chapter_number,
        date: formatDate(h.updated_at),
        percent: h.percent_read,
      }))))
      .catch(() => {});
  }, [user.id]);

  const logout = () => {
    sessionLogout(); // a tela de login volta sozinha (App escuta onSessionChange)
  };

  const openMangaModal = (mangaId: string) => {
    const manga = mangas.find((m) => m.id === mangaId);
    if (manga) setActiveManga(manga);
  };

  const closeMangaModal = () => setActiveManga(null);

  const isFavorite = (mangaId: string) => favorites.includes(mangaId);

  const toggleFavorite = (mangaId: string) => {
    const wasFav = favorites.includes(mangaId);
    setFavorites((prev) => (wasFav ? prev.filter((id) => id !== mangaId) : [...prev, mangaId]));
    showToast(wasFav ? 'Removido dos favoritos' : 'Adicionado aos favoritos');
    api.toggleFavorite(mangaId).catch(() => {
      // Desfaz se o servidor não salvou
      setFavorites((prev) => (wasFav ? [...prev, mangaId] : prev.filter((id) => id !== mangaId)));
      showToast('Não foi possível salvar o favorito. Tente de novo.');
    });
  };

  const lastChapterRead = (mangaId: string) => history.find((h) => h.id === mangaId)?.chapter || 0;

  const getChapters = (mangaId: string) => chaptersByManga[mangaId];

  const loadChapters = useCallback(async (mangaId: string): Promise<number[]> => {
    try {
      const list = await api.getChapters(mangaId);
      const numbers = list.map((c) => c.chapter_number).sort((a, b) => a - b);
      setChaptersByManga((prev) => ({ ...prev, [mangaId]: numbers }));
      return numbers;
    } catch {
      return [];
    }
  }, []);

  const openReader = (mangaId: string, chapter?: number) => {
    const manga = mangas.find((m) => m.id === mangaId);
    if (!manga) return;
    const known = chaptersByManga[mangaId];
    const target = chapter ?? known?.[0] ?? 1;
    setReaderState({ isOpen: true, manga, chapter: target });
    if (!known) loadChapters(mangaId);

    // Abrir o capítulo começa em 0%; o leitor vai salvando o quanto a pessoa rolou (saveProgress)
    const previous = history.find((h) => h.id === mangaId);
    const percent = previous && previous.chapter === target ? previous.percent : 0;
    saveProgress(mangaId, target, percent);
  };

  const saveProgress = (mangaId: string, chapter: number, percent: number) => {
    setHistory((prev) => [
      { id: mangaId, chapter, date: formatDate(new Date().toISOString()), percent },
      ...prev.filter((h) => h.id !== mangaId),
    ]);
    api.saveHistory(mangaId, chapter, percent).catch(() => {});
  };

  const closeReader = () => setReaderState({ isOpen: false, manga: null, chapter: 1 });

  // Navegação pelos capítulos que existem de verdade no banco
  const readerChapters = readerState.manga ? chaptersByManga[readerState.manga.id] || [] : [];
  const readerIndex = readerChapters.indexOf(readerState.chapter);
  const hasNextChapter = readerIndex >= 0 && readerIndex < readerChapters.length - 1;
  const hasPrevChapter = readerIndex > 0;

  const goToNextChapter = () => {
    if (readerState.manga && hasNextChapter) openReader(readerState.manga.id, readerChapters[readerIndex + 1]);
  };

  const goToPrevChapter = () => {
    if (readerState.manga && hasPrevChapter) openReader(readerState.manga.id, readerChapters[readerIndex - 1]);
  };

  const removeFromHistory = (mangaId: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== mangaId));
    api.removeHistory(mangaId).then(
      () => showToast('Removido do histórico'),
      () => showToast('Não foi possível remover do histórico.'),
    );
  };

  const clearAllHistory = () => {
    setHistory([]);
    api.clearHistory().then(
      () => showToast('Histórico limpo'),
      () => showToast('Não foi possível limpar o histórico.'),
    );
  };

  const getComments = (mangaId: string, chapterNumber?: number) => comments[commentsKey(mangaId, chapterNumber)];

  const loadComments = useCallback((mangaId: string, chapterNumber?: number) => {
    api.getComments(mangaId, chapterNumber)
      .then((list) => setComments((prev) => ({ ...prev, [commentsKey(mangaId, chapterNumber)]: list.map(mapComment) })))
      .catch(() => setComments((prev) => ({ ...prev, [commentsKey(mangaId, chapterNumber)]: [] })));
  }, []);

  const addComment = (mangaId: string, text: string, chapterNumber?: number) => {
    api.addComment({ manga_id: mangaId, chapter_number: chapterNumber ?? null, text })
      .then(() => {
        showToast('Comentário publicado!');
        loadComments(mangaId, chapterNumber);
      })
      .catch((err: Error) => showToast(err.message || 'Não foi possível publicar o comentário.'));
  };

  return (
    <MangaContext.Provider
      value={{
        currentUser: user,
        mangas,
        catalogError,
        favorites,
        history,
        activeManga,
        readerState,
        activeTab,
        toastMessage,
        setActiveTab,
        logout,
        openMangaModal,
        closeMangaModal,
        toggleFavorite,
        isFavorite,
        lastChapterRead,
        getChapters,
        loadChapters,
        openReader,
        saveProgress,
        closeReader,
        goToNextChapter,
        goToPrevChapter,
        hasNextChapter,
        hasPrevChapter,
        removeFromHistory,
        clearAllHistory,
        getComments,
        loadComments,
        addComment,
        showToast,
      }}
    >
      {children}
    </MangaContext.Provider>
  );
};

export const useManga = () => {
  const context = useContext(MangaContext);
  if (!context) {
    throw new Error('useManga must be used within a MangaProvider');
  }
  return context;
};
