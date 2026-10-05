import React from 'react';

export const WebLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#020704] text-slate-100 flex flex-col selection:bg-[#00f59b] selection:text-black">
      {/* Luz ambiente de fundo no topo */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-emerald-600/10 via-emerald-900/5 to-transparent blur-3xl pointer-events-none -z-10" />
      
      {/* Container principal */}
      <div className="flex-1 flex flex-col w-full relative">
        {children}
      </div>
    </div>
  );
};
