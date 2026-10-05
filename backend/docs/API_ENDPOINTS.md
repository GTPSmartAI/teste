# Rotas da API

Base: `https://back-api-teste.iagtp.com.br` (local: `http://localhost:4000`). Documentação interativa em `/docs`.
"Login" = cabeçalho `Authorization: Bearer <token>`.

| Método | Rota | Acesso | O que faz |
|---|---|---|---|
| GET | `/api/health` | aberto | Status do banco e contagem de obras/capítulos |
| POST | `/api/auth/register` `{name, email, password}` | aberto | Cria conta (leitor) e devolve `{token, user}`. 409 se o e-mail existe |
| POST | `/api/auth/login` `{email, password}` | aberto | Devolve `{token, user}`. 401 senha errada, 429 bloqueado |
| POST | `/api/auth/logout` | aberto | Apaga a sessão do token enviado |
| GET | `/api/auth/me` | login | Dados atualizados da conta |
| GET | `/api/mangas?q=&genre=&status=` | aberto | Catálogo, ordenado por nota |
| GET | `/api/mangas/{id}` | aberto | Uma obra |
| GET | `/api/mangas/{id}/capitulos` | aberto | Capítulos da obra (sem as páginas) |
| GET | `/api/capitulos/{id}/{n}` | aberto | Capítulo com `pages_json` (URLs das páginas) |
| GET | `/api/ranking` | login | Top 50 por XP (sem e-mails), com `isUser` na conta logada |
| GET | `/api/favoritos` | login | IDs das obras favoritas |
| POST | `/api/favoritos/{id}/toggle` | login | Favorita/desfavorita |
| GET | `/api/historico` | login | Último capítulo lido de cada obra |
| POST | `/api/historico` `{manga_id, chapter_number, percent_read}` | login | Salva o ponto de leitura |
| DELETE | `/api/historico/{id}` | login | Tira uma obra do histórico |
| DELETE | `/api/historico` | login | Limpa o histórico |
| GET | `/api/comentarios/{id}?chapter=` | aberto | Comentários da obra (sem `chapter`) ou do capítulo |
| POST | `/api/comentarios` `{manga_id, chapter_number?, text}` | login | Publica (nome e rank vêm da conta) |
| GET | `/api/traducao/{id}/{n}` | aberto | Páginas já traduzidas no MinIO |
| POST | `/api/traducao/{id}/{n}?max_pages=10` | login | Roda OCR + tradução (até 30 páginas) |
| POST | `/api/backup/{id}/gdrive` | admin | ZIP da obra para o Google Drive |
| GET | `/api/backup/{id}/download` | admin | Baixa o ZIP da obra |
