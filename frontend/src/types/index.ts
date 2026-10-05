export interface Manga {
  id: string;
  title: string;
  type: string;
  genres: string[];
  cover: string;
  banner: string;
  rating: number;
  totalRatingsCount: number;
  author: string;
  status: 'lancando' | 'concluido';
  chaptersCount: number;
  synopsis: string;
  tags: string[];
}

export interface Comment {
  id: string;
  mangaId: string;
  chapterNumber?: number | null; // Se for comentário de capítulo específico
  userName: string;
  userInitial: string;
  userRank: string;
  date: string;
  text: string;
}

export interface HistoryItem {
  id: string; // manga_id
  chapter: number;
  date: string;
  percent: number;
}

export type AppTab = 'inicio' | 'explorar' | 'ranking' | 'perfil';
