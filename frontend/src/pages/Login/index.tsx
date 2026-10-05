import React, { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Check, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { login, register } from '@/services/session';

// Erros de digitação comuns no domínio do e-mail ("gmal.com" -> "gmail.com")
const DOMAIN_TYPOS: Record<string, string> = {
  'gmal.com': 'gmail.com', 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.com.br': 'gmail.com',
  'hotmal.com': 'hotmail.com', 'hotmial.com': 'hotmail.com', 'hotmail.con': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com', 'yahoo.con': 'yahoo.com', 'yaho.com': 'yahoo.com',
};

function emailSuggestion(email: string): string | null {
  const m = email.trim().toLowerCase().match(/^([^@\s]+)@([^@\s]+)$/);
  const fixed = m && DOMAIN_TYPOS[m[2]];
  return fixed ? `${m![1]}@${fixed}` : null;
}

const Field: React.FC<{
  id: string;
  label: string;
  icon: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
}> = ({ id, label, icon, hint, children }) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
      {label}
    </label>
    <div className="flex items-center gap-2.5 h-12 px-3.5 rounded-xl bg-[#081711] border border-emerald-500/25 focus-within:border-[#00f59b] focus-within:shadow-[0_0_0_3px_rgba(0,245,155,0.12)] transition-all">
      {icon}
      {children}
    </div>
    {hint}
  </div>
);

const inputClass = 'bg-transparent text-sm text-white placeholder:text-slate-600 outline-none w-full h-full min-w-0';

/** Tela de entrada. Sem sessão o app mostra só esta tela; depois do login o App troca sozinho. */
export const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isRegister = mode === 'register';
  const suggestion = emailSuggestion(email);

  // As mesmas regras do backend (auth.password_problem)
  const rules = useMemo(
    () => [
      { ok: password.length >= 8, text: '8 caracteres ou mais' },
      { ok: /[a-z]/.test(password) && /[A-Z]/.test(password), text: 'maiúsculas e minúsculas' },
      { ok: /\d/.test(password), text: 'pelo menos um número' },
    ],
    [password],
  );

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    setErrorMsg(null);
    setConfirm('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (isRegister) {
      if (!name.trim()) {
        setErrorMsg('Informe seu nome.');
        return;
      }
      if (rules.some((r) => !r.ok)) {
        setErrorMsg('A senha ainda não atende a todas as regras.');
        return;
      }
      if (password !== confirm) {
        setErrorMsg('As senhas não conferem.');
        return;
      }
    }
    setLoading(true);
    try {
      if (isRegister) await register({ name, email, password });
      else await login(email, password);
      // A sessão nova troca a tela sozinha (App escuta onSessionChange)
    } catch (err) {
      setErrorMsg((err as Error)?.message || 'Não foi possível entrar. Tente de novo.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#020704] flex flex-col items-center justify-center px-4 py-6 overflow-y-auto selection:bg-[#00f59b] selection:text-black">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-80 bg-gradient-to-b from-emerald-600/15 to-transparent blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-[420px] bg-[#050d09]/95 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(0,245,155,0.12)]">
        {/* Marca */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0b3320] to-[#00f59b] flex items-center justify-center shadow-[0_0_25px_rgba(0,245,155,0.35)] mb-3">
            <BookOpen className="w-7 h-7 text-[#030a06]" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-display font-black text-2xl tracking-wider text-white">MANGAFLIX</span>
            <span className="text-[9px] font-black uppercase bg-emerald-500/20 text-[#00f59b] px-1.5 py-0.5 rounded border border-emerald-500/30">
              PRIME
            </span>
          </div>
          <span className="text-[10px] font-bold tracking-widest text-[#00f59b] uppercase mt-0.5">por GTP Smart</span>
          <p className="text-sm text-slate-400 mt-2">
            {isRegister ? 'Crie sua conta para começar a ler.' : 'Entre para continuar sua leitura.'}
          </p>
        </div>

        {/* Entrar / Criar conta */}
        <div role="tablist" className="grid grid-cols-2 p-1 rounded-xl bg-[#030906] border border-emerald-500/20 mb-5">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchMode(m)}
              className={`h-10 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                mode === m
                  ? 'bg-gradient-to-r from-[#00f59b] to-[#059669] text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {m === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {isRegister && (
            <Field id="login-name" label="Seu nome" icon={<User className="w-4 h-4 text-emerald-400 shrink-0" />}>
              <input
                id="login-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como você quer aparecer no ranking"
                required
                maxLength={150}
                className={inputClass}
              />
            </Field>
          )}

          <Field
            id="login-email"
            label="E-mail"
            icon={<Mail className="w-4 h-4 text-emerald-400 shrink-0" />}
            hint={suggestion && (
              <button
                type="button"
                onClick={() => setEmail(suggestion)}
                className="self-start text-xs text-amber-400 text-left"
              >
                Você quis dizer <u className="font-bold">{suggestion}</u>? Toque para corrigir.
              </button>
            )}
          >
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              required
              maxLength={254}
              className={inputClass}
            />
          </Field>

          <Field
            id="login-password"
            label="Senha"
            icon={<Lock className="w-4 h-4 text-emerald-400 shrink-0" />}
            hint={isRegister && (
              <ul className="flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
                {rules.map((r) => (
                  <li key={r.text} className={`flex items-center gap-1 text-[11px] ${r.ok ? 'text-[#00f59b]' : 'text-slate-500'}`}>
                    <Check className={`w-3 h-3 ${r.ok ? 'opacity-100' : 'opacity-40'}`} strokeWidth={3} />
                    {r.text}
                  </li>
                ))}
              </ul>
            )}
          >
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              maxLength={256}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
              className="text-slate-500 hover:text-slate-300 p-1 shrink-0"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </Field>

          {isRegister && (
            <Field id="login-confirm" label="Repita a senha" icon={<Lock className="w-4 h-4 text-emerald-400 shrink-0" />}>
              <input
                id="login-confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                maxLength={256}
                className={inputClass}
              />
            </Field>
          )}

          {errorMsg && (
            <div role="alert" className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs text-center">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 h-12 rounded-xl bg-gradient-to-r from-[#00f59b] to-[#059669] text-black font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,245,155,0.35)] transition-all active:scale-95 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Aguarde...' : isRegister ? 'Criar conta' : 'Entrar'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <p className="flex items-start gap-2 mt-6 pt-4 border-t border-emerald-500/10 text-[11px] leading-relaxed text-slate-500">
          <ShieldCheck className="w-4 h-4 text-[#00f59b] shrink-0 mt-px" />
          Sua senha é guardada com criptografia (Argon2id) e nunca fica salva no aparelho. Favoritos e histórico ficam na sua conta.
        </p>
      </div>
    </div>
  );
};
