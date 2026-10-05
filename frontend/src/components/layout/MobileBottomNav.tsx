import React from 'react';
import { Home, Compass, Trophy, User } from 'lucide-react';
import { useManga } from '@/contexts/MangaContext';

export const MobileBottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useManga();

  const tabs = [
    { id: 'inicio', label: 'Início', icon: Home },
    { id: 'explorar', label: 'Explorar', icon: Compass },
    { id: 'ranking', label: 'Ranking', icon: Trophy },
    { id: 'perfil', label: 'Perfil', icon: User },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#030a06]/95 backdrop-blur-xl border-t border-emerald-500/20 flex items-center justify-around z-40 px-2 pb-safe md:hidden">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 h-full relative transition-all duration-200 ${
              isActive ? 'text-[#00f59b]' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {isActive && (
              <span className="absolute top-0 w-8 h-[3px] bg-[#00f59b] rounded-b shadow-[0_0_12px_#00f59b]" />
            )}
            <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? '-translate-y-0.5 scale-105' : ''}`} />
            <span className="text-[10px] font-bold mt-1 tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
