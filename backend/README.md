# Backend Mangaflix Prime

API em Python (FastAPI) com login, catálogo, leitor, ranking, comentários, tradução de capítulos e backup no Google Drive. Base MariaDB `aaa` e bucket MinIO `mangaflix`.

## Como rodar

1. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```
2. Preencha o `backend/.env` (senhas do banco e do MinIO; ver `doc/memoria/deploy.md`). Ele nunca vai para o Git.
3. Na raiz do projeto, `.\iniciar_dev.ps1` abre o túnel do banco, o backend e o frontend. Só o backend:
   ```bash
   python main.py
   ```
   API em `http://localhost:4000`, documentação em `http://localhost:4000/docs`.

## Documentação

- `docs/ARQUITETURA.md`: pastas e módulos.
- `docs/API_ENDPOINTS.md`: todas as rotas e quem pode chamar.
- Senha de uma conta pelo terminal: `python scripts/definir_senha.py <email>`.
