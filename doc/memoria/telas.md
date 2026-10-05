# Telas do app

Última atualização: 05/10/2026

- **Login** (`pages/Login`): entrar ou criar conta. Aparece sempre que não há sessão.
- **Início** (`pages/Inicio`): saudação com o primeiro nome da conta, obras disponíveis, "Continuar lendo", destaque (obra mais bem avaliada), filtros (Todos, Lendo, Manhwas, Shonen, Concluídos) e o catálogo.
- **Explorar** (`pages/Explorar`): busca por título, autor ou gênero, filtro de gênero e status, ordenação.
- **Ranking** (`pages/Ranking`): cartão da conta logada, pódio e classificação geral vindos de `GET /api/ranking` (ordem por XP).
- **Perfil** (`pages/Perfil`): dados da conta, botão Sair, favoritos e histórico (remover um item ou limpar tudo, salvo no servidor).
- **Detalhes da obra** (`pages/MangaDetalhes`, janela): ler/continuar, favoritar, capítulos que existem no banco (busca e ordem), comentários da obra e sinopse.
- **Leitor** (`pages/Leitor`, tela cheia): rolagem vertical contínua, troca Original/PT-BR, botão "Traduzir IA" quando não há tradução, anterior/próximo pelos capítulos reais, comentários do capítulo. Setas do teclado e Esc funcionam no computador.
- Navegação: cabeçalho com Início, Explorar, Ranking e Perfil no computador; menu de baixo no celular (`components/layout/AppHeader.tsx` e `MobileBottomNav.tsx`).
