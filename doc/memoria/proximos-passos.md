# Próximos passos e pendências

Última atualização: 05/10/2026

## Urgente: trocar senhas que vazaram

Até 05/10/2026 estas senhas estavam escritas em arquivos do projeto e foram enviadas para o GitHub (`GTPSmartAI/teste`). Foram tiradas dos arquivos, mas continuam no histórico dos commits antigos:

- Senha **root da VPS** (estava em `docs/memoria/project_infra_vps_mangaflix.md`).
- Senha do usuário `mangaflix` do MariaDB (estava em `backend/database.py` e `deploy/deploy.ps1`).
- Chave do MinIO `gtpcellsuporte` (estava em `backend/storage.py`, `deploy/deploy.ps1` e na memória). É a mesma usada por outros projetos.

Depois de trocar, atualizar o `backend/.env` e rodar o deploy. Se o repositório for público, considerar também apagar o histórico antigo.

## Funções que ainda não existem de verdade

- **XP e nível:** nada no sistema dá XP ainda; toda conta fica em nível 1 / RANK E. Falta decidir a regra (ex.: XP por capítulo terminado) e gravar os capítulos lidos (hoje `historico_leitura` guarda só o último capítulo de cada obra).
- **Nota das obras e curtidas em comentários:** as estrelas e curtidas antigas eram só visuais (sumiam ao recarregar) e foram retiradas. Para voltar precisam de tabela no banco.
- **Notas das obras:** a nota só aparece quando a obra tem avaliações (`total_ratings_count` > 0); ainda não existe tela para avaliar.
- **Progresso de leitura:** o leitor salva 25/50/75/100% conforme a pessoa rola o capítulo.
- **Tradução IA:** qualquer conta logada pode disparar (é pesado: OCR + tradução + upload). Se virar problema, limitar a `vip`/`admin`.
- **Catálogo vazio:** a base `aaa` está sem obras. Ingestão: `python backend/components/IngestaoCapitulos/python/ingestion_engine.py --manga <id> --cap <n> --pasta <imagens>` (a obra precisa existir em `mangas`).
