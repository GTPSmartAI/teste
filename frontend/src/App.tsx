import React, { useEffect, useState } from 'react';
import { MangaProvider, useManga } from '@/contexts/MangaContext';
import { getSessionUser, onSessionChange, refreshSession, SessionUser } from '@/services/session';
import { WebLayout } from '@/components/layout/WebLayout';
import { AppHeader } from '@/components/layout/AppHeader';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { LoginPage } from '@/pages/Login';
import { InicioPage } from '@/pages/Inicio';
import { ExplorarPage } from '@/pages/Explorar';
import { RankingPage } from '@/pages/Ranking';
import { PerfilPage } from '@/pages/Perfil';
import { MangaDetalhesModal } from '@/pages/MangaDetalhes';
import { LeitorPage } from '@/pages/Leitor';

const AppContent: React.FC = () => {
  const { activeTab, toastMessage, catalogError } = useManga();

  return (
    <WebLayout>
      <AppHeader />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 pb-24 md:pb-12">
        {catalogError && (
          <div role="alert" className="mx-4 mb-2 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs text-center">
            {catalogError}
          </div>
        )}
        {activeTab === 'inicio' && <InicioPage />}
        {activeTab === 'explorar' && <ExplorarPage />}
        {activeTab === 'ranking' && <RankingPage />}
        {activeTab === 'perfil' && <PerfilPage />}
      </main>

      <MobileBottomNav />

      {/* Modal de Detalhes do Mangá */}
      <MangaDetalhesModal />

      {/* Leitor de Mangá Fullscreen */}
      <LeitorPage />

      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#0d2a1d] border border-[#00f59b] text-white px-4 py-2 rounded-full text-xs font-bold shadow-[0_8px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(0,245,155,0.4)] flex items-center gap-2">
          <span className="text-[#00f59b] font-black">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </WebLayout>
  );
};

export const App: React.FC = () => {
  // Login obrigatório: sem sessão, só a tela de login aparece
  const [user, setUser] = useState<SessionUser | null>(() => getSessionUser());

  useEffect(() => {
    const unsubscribe = onSessionChange(setUser);
    // Confere no servidor se a sessão guardada ainda vale (senha trocada, sessão expirada...)
    refreshSession();
    return unsubscribe;
  }, []);

  if (!user) return <LoginPage />;

  return (
    // key: trocar de conta zera todo o estado da conta anterior
    <MangaProvider key={user.id} user={user}>
      <AppContent />
    </MangaProvider>
  );
};

export default App;
