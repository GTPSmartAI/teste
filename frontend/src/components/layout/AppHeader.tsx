import React from 'react';
import { BookOpen, Home, Compass, Trophy, User } from 'lucide-react';
import { useManga } from '@/contexts/MangaContext';

// Celular: a navegação fica no menu de baixo (MobileBottomNav); aqui só a marca.
// Conta e "Sair" ficam na aba Perfil.
export const AppHeader: React.FC = () => {
  const { activeTab, setActiveTab } = useManga();

  const navLinks = [
    { id: 'inicio', label: 'Início', icon: Home },
    { id: 'explorar', label: 'Explorar', icon: Compass },
    { id: 'ranking', label: 'Ranking', icon: Trophy },
    { id: 'perfil', label: 'Perfil', icon: User },
  ] as const;

  return (
    <header className="sticky top-0 z-40 w-full bg-[#030a06]/90 backdrop-blur-xl border-b border-emerald-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

        {/* LOGO & BRAND */}
        <button
          onClick={() => setActiveTab('inicio')}
          className="flex items-center gap-3 group shrink-0 text-left"
          aria-label="Início"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0b3320] to-[#00f59b] flex items-center justify-center shadow-[0_0_20px_rgba(0,245,155,0.3)] group-hover:scale-105 transition-transform duration-200">
            <BookOpen className="w-5 h-5 text-[#030a06]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-display font-black text-lg tracking-wider text-white">
                MANGAFLIX
              </span>
              <span className="text-[9px] font-black uppercase bg-emerald-500/20 text-[#00f59b] px-1.5 py-0.5 rounded border border-emerald-500/30">
                PRIME
              </span>
            </div>
            <span className="text-[9px] font-bold tracking-widest text-[#00f59b] uppercase">
              POR GTP SMART
            </span>
          </div>
        </button>

        {/* NAVEGAÇÃO DESKTOP */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map(link => {
            const Icon = link.icon;
            const isActive = activeTab === link.id;

            return (
              <button
                key={link.id}
                onClick={() => setActiveTab(link.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/25 to-[#00f59b]/15 text-[#00f59b] border border-emerald-500/40 shadow-[0_0_15px_rgba(0,245,155,0.15)]'
                    : 'text-slate-400 hover:text-white hover:bg-emerald-500/10'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#00f59b]' : 'text-slate-400'}`} />
                <span>{link.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
