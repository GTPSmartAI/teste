import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { useManga } from '@/contexts/MangaContext';
import { MangaCard } from '@/components/manga/MangaCard';

export const ExplorarPage: React.FC = () => {
  const { mangas } = useManga();
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'rating' | 'caps' | 'az'>('caps');

  // Só os gêneros que existem nas obras cadastradas
  const genres = [
    { id: 'all', label: 'Todos os Gêneros' },
    ...Array.from(new Set(mangas.flatMap(m => m.genres)))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map(g => ({ id: g, label: g })),
  ];

  const filtered = mangas
    .filter(m => {
      // Busca
      const matchesSearch =
        m.title.toLowerCase().includes(search.toLowerCase()) ||
        m.author.toLowerCase().includes(search.toLowerCase()) ||
        m.genres.some(g => g.toLowerCase().includes(search.toLowerCase()));

      // Gênero
      const matchesGenre = selectedGenre === 'all' || m.genres.includes(selectedGenre);

      // Status
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;

      return matchesSearch && matchesGenre && matchesStatus;
    })
    .sort((a, b) => {
      // Obra sem nenhuma avaliação conta como sem nota (não como 5 estrelas)
      if (sortOrder === 'rating') return (b.totalRatingsCount ? b.rating : 0) - (a.totalRatingsCount ? a.rating : 0);
      if (sortOrder === 'az') return a.title.localeCompare(b.title, 'pt-BR');
      return b.chaptersCount - a.chaptersCount;
    });

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="font-display font-black text-xl text-white">
          EXPLORAR <span className="text-[#00f59b]">ACERVO</span>
        </h1>
        <p className="text-xs text-slate-400">
          Encontre novos mangás, webtoons e manhwas com filtros precisos.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative flex items-center bg-[#081510] border border-emerald-500/30 rounded-xl px-3.5 h-12 shadow-lg focus-within:border-[#00f59b] focus-within:shadow-[0_0_15px_rgba(0,245,155,0.2)] transition-all">
        <Search className="w-5 h-5 text-[#00f59b] mr-2.5 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título, autor ou gênero..."
          className="w-full bg-transparent border-none outline-none text-white text-sm placeholder:text-slate-500"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Genre Pills Carousel */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
        {genres.map(g => (
          <button
            key={g.id}
            onClick={() => setSelectedGenre(g.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              selectedGenre === g.id
                ? 'bg-emerald-500/20 text-[#00f59b] border border-[#00f59b]'
                : 'bg-[#091710] text-slate-400 border border-emerald-500/20 hover:text-white'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Select Controls (Status & Sort) */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center justify-between bg-[#091710] border border-emerald-500/20 rounded-lg px-2.5 py-1.5 text-xs">
          <span className="text-slate-500 font-semibold text-[11px]">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent border-none outline-none text-[#00f59b] font-bold text-xs cursor-pointer"
          >
            <option value="all" className="bg-[#0a1712] text-white">Todos</option>
            <option value="lancando" className="bg-[#0a1712] text-white">Lançando</option>
            <option value="concluido" className="bg-[#0a1712] text-white">Concluído</option>
          </select>
        </div>

        <div className="flex-1 flex items-center justify-between bg-[#091710] border border-emerald-500/20 rounded-lg px-2.5 py-1.5 text-xs">
          <span className="text-slate-500 font-semibold text-[11px]">Ordenar:</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="bg-transparent border-none outline-none text-[#00f59b] font-bold text-xs cursor-pointer"
          >
            <option value="rating" className="bg-[#0a1712] text-white">Maior Nota</option>
            <option value="caps" className="bg-[#0a1712] text-white">+ Capítulos</option>
            <option value="az" className="bg-[#0a1712] text-white">A-Z</option>
          </select>
        </div>
      </div>

      {/* Results Count Meta */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-1">
        <span>Mostrando {filtered.length} resultados</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 md:gap-5 pt-1">
        {filtered.map(manga => (
          <MangaCard key={manga.id} manga={manga} />
        ))}
      </div>
    </div>
  );
};
