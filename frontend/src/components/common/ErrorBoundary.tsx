import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[MANGAFLIX ERROR BOUNDARY]', error, errorInfo);
  }

  private handleResetCache = () => {
    try {
      // Limpa dados antigos guardados no aparelho (a sessão de login também: a pessoa entra de novo)
      Object.keys(localStorage).filter((k) => k.startsWith('mangaflix_')).forEach((k) => localStorage.removeItem(k));
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#020704] text-white flex flex-col items-center justify-center p-6 selection:bg-[#00f59b] selection:text-black">
          <div className="w-full max-w-lg bg-[#06140e] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(244,63,94,0.2)]">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="font-display font-black text-xl text-white">
                Ops! Ocorreu uma inconsistência
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Detectamos uma atualização de dados. Clique abaixo para recarregar o sistema limpo.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-black/60 border border-emerald-500/20 rounded-xl text-left text-[11px] font-mono text-emerald-400 max-h-32 overflow-y-auto">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#00f59b] to-[#059669] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,245,155,0.3)] hover:shadow-[0_0_30px_rgba(0,245,155,0.5)] transition-all active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar Página
              </button>

              <button
                onClick={this.handleResetCache}
                className="py-3 px-4 rounded-xl bg-[#091b12] border border-emerald-500/30 text-[#00f59b] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-emerald-500/10 transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                Restaurar Cache
              </button>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
