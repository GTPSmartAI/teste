/**
 * Cliente da API do Mangaflix Prime (FastAPI na VPS, base MariaDB 'aaa').
 * Rotas do usuário (favoritos, histórico, comentários, ranking) usam a sessão de services/session.ts:
 * o servidor sabe quem é o usuário pelo token, o app nunca manda user_id.
 */
import { apiFetch } from './session';

export interface ApiManga {
  id: string;
  title: string;
  type: string;
  genres: string[];
  cover: string;
  banner?: string;
  rating: number;
  total_ratings_count: number;
  author: string;
  status: 'lancando' | 'concluido';
  chapters_count: number;
  synopsis: string;
  tags?: string[];
}

export interface ApiChapter {
  id: number;
  manga_id: string;
  chapter_number: number;
  title: string;
  pages_json?: string[];
  views_count?: number;
  rating?: number;
  created_at?: string;
}

export interface ApiComment {
  id: string;
  manga_id: string;
  chapter_number?: number | null;
  user_id: string;
  user_name: string;
  user_rank?: string;
  text: string;
  rating?: number | null;
  likes_count?: number;
  created_at?: string;
  userInitial?: string;
}

export interface ApiHistoryItem {
  manga_id: string;
  chapter_number: number;
  percent_read: number;
  updated_at?: string;
}

export interface ApiRankingUser {
  pos: number;
  name: string;
  rank: string;
  level: number;
  xp: number;
  total_lidos: number;
  initial: string;
  isUser: boolean;
}

async function getJson<T>(path: string, init?: RequestInit, errorMsg = 'Falha na comunicação com o servidor'): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === 'string' ? err.detail : errorMsg);
  }
  return res.json();
}

function jsonBody(body: unknown): RequestInit {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export const api = {
  // === CATÁLOGO ===
  getMangas(q?: string, genre?: string, status?: string): Promise<ApiManga[]> {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (genre && genre !== 'Todos') params.append('genre', genre);
    if (status && status !== 'todos') params.append('status', status);
    return getJson(`/api/mangas?${params.toString()}`, undefined, 'Falha ao listar mangás');
  },

  getChapters(mangaId: string): Promise<ApiChapter[]> {
    return getJson(`/api/mangas/${encodeURIComponent(mangaId)}/capitulos`, undefined, 'Falha ao buscar capítulos');
  },

  getChapterPages(mangaId: string, chapterNumber: number): Promise<ApiChapter> {
    return getJson(`/api/capitulos/${encodeURIComponent(mangaId)}/${chapterNumber}`, undefined, 'Falha ao obter páginas do capítulo');
  },

  // === COMENTÁRIOS ===
  getComments(mangaId: string, chapterNumber?: number): Promise<ApiComment[]> {
    const query = chapterNumber !== undefined ? `?chapter=${chapterNumber}` : '';
    return getJson(`/api/comentarios/${encodeURIComponent(mangaId)}${query}`, undefined, 'Falha ao buscar comentários');
  },

  addComment(comment: { manga_id: string; chapter_number?: number | null; text: string }): Promise<{ success: boolean; comment_id: string }> {
    return getJson('/api/comentarios', jsonBody(comment), 'Falha ao enviar comentário');
  },

  // === FAVORITOS ===
  getFavorites(): Promise<string[]> {
    return getJson('/api/favoritos', undefined, 'Falha ao buscar favoritos');
  },

  toggleFavorite(mangaId: string): Promise<{ favorited: boolean }> {
    return getJson(`/api/favoritos/${encodeURIComponent(mangaId)}/toggle`, { method: 'POST' }, 'Falha ao alternar favorito');
  },

  // === HISTÓRICO DE LEITURA ===
  getHistory(): Promise<ApiHistoryItem[]> {
    return getJson('/api/historico', undefined, 'Falha ao buscar histórico');
  },

  saveHistory(mangaId: string, chapterNumber: number, percentRead: number): Promise<{ success: boolean }> {
    return getJson('/api/historico', jsonBody({ manga_id: mangaId, chapter_number: chapterNumber, percent_read: percentRead }));
  },

  removeHistory(mangaId: string): Promise<{ success: boolean }> {
    return getJson(`/api/historico/${encodeURIComponent(mangaId)}`, { method: 'DELETE' });
  },

  clearHistory(): Promise<{ success: boolean }> {
    return getJson('/api/historico', { method: 'DELETE' });
  },

  // === RANKING ===
  getRanking(): Promise<ApiRankingUser[]> {
    return getJson('/api/ranking', undefined, 'Falha ao carregar o ranking');
  },

  // === TRADUÇÃO IA ===
  getChapterTranslation(mangaId: string, chapterNumber: number): Promise<{ translated: boolean; pages: string[] }> {
    return getJson(`/api/traducao/${encodeURIComponent(mangaId)}/${chapterNumber}`, undefined, 'Falha ao buscar tradução');
  },

  translateChapter(mangaId: string, chapterNumber: number, maxPages = 15): Promise<{ success: boolean; pages?: string[]; error?: string }> {
    return getJson(
      `/api/traducao/${encodeURIComponent(mangaId)}/${chapterNumber}?max_pages=${maxPages}`,
      { method: 'POST' },
      'Falha ao processar tradução',
    );
  },
};
