# Contas, login e segurança

Última atualização: 05/10/2026

## Como funciona o login

- O login é **obrigatório**: sem sessão o app mostra só a tela `frontend/src/pages/Login`. O antigo "multilogin" (lista de contas para trocar com um toque, sem senha) e o "modo livre de testes" foram removidos.
- Cada pessoa cria a própria conta (nome, e-mail e senha). Toda conta nova nasce como `leitor`, `RANK E`, nível 1. O papel `vip`/`admin` só muda direto no banco.
- **Senhas:** Argon2id (`argon2-cffi`). Regra: 8+ caracteres, maiúsculas, minúsculas e número (a tela de cadastro mostra as regras).
- **Sessão:** o login devolve um token aleatório de 256 bits. O app manda no cabeçalho `Authorization: Bearer ...`. No banco (tabela `sessoes`) fica só o SHA-256 do token, válido por 30 dias. "Sair" (aba Perfil) apaga a sessão.
- **Tentativas erradas:** 5 por e-mail ou 25 por IP em 15 minutos bloqueiam por 15 minutos (em memória: a API roda 1 processo; o uvicorn usa `--proxy-headers` para ver o IP real atrás do Traefik).
- Código: `backend/shared/python/auth.py` (senha, sessão, bloqueio, `require_user`/`require_admin`) e `frontend/src/services/session.ts` (token, `apiFetch`, entrar/cadastrar/sair).
- Conta antiga sem senha, ou senha esquecida: `python backend/scripts/definir_senha.py <email>` (com o túnel do banco aberto). Também derruba as sessões abertas da conta.

## Regras de acesso (backend)

- O servidor **nunca** usa `user_id` mandado pelo app: o usuário vem do token. Favoritos, histórico e comentários são sempre da conta logada; o nome e o rank do comentário também vêm da conta.
- Rotas abertas: `/`, `/api/health`, catálogo (`/api/mangas...`, `/api/capitulos/...`), leitura de comentários e consulta de tradução, `/api/auth/login|register|logout`.
- Exigem login: favoritos, histórico, ranking, publicar comentário, disparar tradução (`max_pages` até 30).
- Só `admin`: backup no Google Drive e download do ZIP da obra.
- O ranking mostra nome, rank, nível, XP e obras lidas, **nunca e-mails**. A antiga rota `GET /api/usuarios` (que entregava nome e e-mail de todas as contas) e `POST /api/usuarios` (que criava conta sem senha e deixava escolher `admin`) foram removidas.
- CORS só aceita o site, o app Android (`https://localhost`, `capacitor://localhost`) e o `localhost:5173`. Variável `CORS_ORIGINS` para mudar.
