# Mangaflix Prime 📚

Plataforma no estilo Netflix para ler mangás e manhwas, com leitor vertical contínuo, tradução de balões por IA, favoritos, histórico, comentários e ranking de "caçadores". Site e APK Android usam a mesma conta (login obrigatório).

- Site: https://front-teste.iagtp.com.br
- API: https://back-api-teste.iagtp.com.br (docs em `/docs`)

---

## 📂 Estrutura do Projeto

Mesma organização do projeto Aedolia (`Criação de pdf Readers`).

```
.
├── backend/
│   ├── api_server.py              # API FastAPI (rotas)
│   ├── main.py                    # Sobe a API localmente (porta 4000)
│   ├── shared/python/             # config, banco MariaDB, login (auth), MinIO
│   ├── components/
│   │   ├── IngestaoCapitulos/     # Imagens -> WebP -> MinIO -> banco
│   │   ├── TradutorIA/            # OCR + tradução PT-BR dos balões
│   │   └── BackupDrive/           # ZIP da obra para o Google Drive
│   ├── scripts/                   # definir_senha.py
│   ├── docs/                      # ARQUITETURA.md, API_ENDPOINTS.md
│   ├── schema_mariadb.sql         # Tabelas da base 'aaa'
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/                 # Login, Inicio, Explorar, Ranking, Perfil, MangaDetalhes, Leitor
│   │   ├── components/            # layout/, manga/, ranking/, common/
│   │   ├── services/              # session.ts (login), api.ts
│   │   ├── contexts/              # Estado do app
│   │   └── types/
│   └── android/                   # Projeto Capacitor (APK)
├── deploy/                        # deploy.ps1, build-apk.ps1, remote_deploy.sh, nginx
├── doc/memoria/                   # Memória do projeto (um arquivo por assunto)
├── iniciar_dev.ps1                # Túnel do banco + backend + frontend
└── README.md
```

---

## 🛠️ Como Executar Localmente

1. Preencha o `backend/.env` (ver `doc/memoria/deploy.md`) e instale as dependências:
   ```bash
   cd backend && pip install -r requirements.txt
   cd ../frontend && npm install
   ```
2. Na raiz: `.\iniciar_dev.ps1` (abre o túnel do MariaDB, o backend em `http://localhost:4000` e o frontend em `http://localhost:5173`).

## 🚀 Publicar

```powershell
powershell -ExecutionPolicy Bypass -File deploy\deploy.ps1 -Message "o que mudou"
```

Detalhes em `doc/memoria/deploy.md`. Login e regras de acesso em `doc/memoria/contas-e-seguranca.md`.
