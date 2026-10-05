# Frontend Mangaflix Prime

React + Vite + TypeScript + Tailwind, empacotado como APK Android com Capacitor.

## Como rodar

```bash
npm install
npm run dev        # http://localhost:5173 (precisa do backend em http://localhost:4000)
npm run build      # confere os tipos e gera dist/
```

O endereço da API vem de `VITE_API_URL` (`.env.production` e `.env.android` apontam para `https://back-api-teste.iagtp.com.br`; sem ela, `http://localhost:4000`). Ver `src/config.ts`.

## Organização

```
src/
├── App.tsx                 # Sem sessão mostra o Login; com sessão, o app
├── config.ts               # BACKEND_URL
├── contexts/MangaContext   # Estado do app (catálogo, favoritos, histórico, leitor)
├── services/
│   ├── session.ts          # Token de login, apiFetch, entrar/cadastrar/sair
│   └── api.ts              # Chamadas à API
├── pages/                  # Login, Inicio, Explorar, Ranking, Perfil, MangaDetalhes, Leitor
├── components/             # layout/ (AppHeader, MobileBottomNav, WebLayout), manga/, ranking/, common/
└── types/                  # Tipos TypeScript
```

APK: `deploy\build-apk.ps1` (ver `doc/memoria/apk.md`).
