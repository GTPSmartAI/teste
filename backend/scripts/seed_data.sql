-- Seed de Dados Iniciais no Banco 'aaa' (Mangaflix Prime)
USE `aaa`;

-- 1. Perfis de Usuários para o Sistema de Multilogins
INSERT INTO `usuarios` (`id`, `name`, `email`, `rank`, `level`, `xp`, `role`) VALUES
('alexandre', 'Alexandre Guterres', 'alexandre@gtpsmart.com', 'RANK SSS', 42, 8420, 'admin'),
('vip_beta', 'Perfil VIP Beta', 'vip@mangaflix.com', 'RANK S', 28, 4150, 'vip'),
('convidado', 'Conta Teste Convidado', 'convidado@mangaflix.com', 'RANK E', 1, 150, 'leitor')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `role`=VALUES(`role`);

-- 2. Mangás Iniciais
INSERT INTO `mangas` (`id`, `title`, `type`, `genres`, `cover`, `banner`, `rating`, `total_ratings_count`, `author`, `status`, `chapters_count`, `synopsis`, `tags`) VALUES
(
    'solo-leveling',
    'Solo Leveling: Ragnarok',
    'Manhwa',
    '["Ação", "Sobrenatural", "Fantasia"]',
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1000&auto=format&fit=crop&q=80',
    4.99,
    18420,
    'Chugong & Daul',
    'lancando',
    182,
    'A Terra enfrenta novas fendas dimensionais que ameaçam a extinção de toda a humanidade. Sung Jinwoo precisa defender a realidade contra entidades celestiais nunca antes vistas, despertando novos caçadores no mundo todo.',
    '["Caçadores", "Monarcas", "Subida de Nível", "Rank SSS"]'
),
(
    'omniscient-reader',
    'Omniscient Reader\'s Viewpoint',
    'Manhwa',
    '["Ação", "Isekai", "Fantasia"]',
    'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1563089145-599997674d42?w=1000&auto=format&fit=crop&q=80',
    4.96,
    14210,
    'Sing Shong & Sleepy-C',
    'lancando',
    215,
    'Dokja era um assalariado comum cujo único hobby era ler uma novel que ninguém mais lia. Quando o último capítulo é publicado, o mundo real se transforma exatamente nos cenários apocalípticos da história.',
    '["Apocalipse", "Constelações", "Profecia", "Cenários"]'
),
(
    'tbate',
    'The Beginning After the End',
    'Manhwa',
    '["Fantasia", "Aventura", "Isekai"]',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1000&auto=format&fit=crop&q=80',
    4.92,
    9840,
    'TurtleMe & Fuyuki23',
    'lancando',
    175,
    'O Rei Grey possui força incomparável num mundo governado pela capacidade marcial. Renascido num novo mundo repleto de magia e monstros, ele tem a chance de refazer seu destino.',
    '["Reencarnação", "Magia", "Dragões", "Academia"]'
),
(
    'nano-machine',
    'Nano Machine',
    'Manhwa',
    '["Ação", "Sobrenatural", "Fantasia"]',
    'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1000&auto=format&fit=crop&q=80',
    4.91,
    8200,
    'Hanjung Wolya',
    'lancando',
    198,
    'Um órfão do Culto Demoníaco recebe a visita inesperada de seu descendente do futuro, que injeta uma nanomáquina em seu corpo.',
    '["Culto Demoníaco", "Murim", "Nanotecnologia", "Vingança"]'
),
(
    'jujutsu-kaisen',
    'Jujutsu Kaisen',
    'Mangá',
    '["Ação", "Sobrenatural"]',
    'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1563089145-599997674d42?w=1000&auto=format&fit=crop&q=80',
    4.88,
    22100,
    'Gege Akutami',
    'concluido',
    271,
    'Yuji Itadori engole um dedo amaldiçoado de Ryomen Sukuna e entra no violento mundo dos Feiticeiros Jujutsu.',
    '["Maldições", "Feitiçaria", "Sukuna", "Shonen"]'
),
(
    'tower-of-god',
    'Tower of God',
    'Manhwa',
    '["Ação", "Aventura", "Fantasia"]',
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1000&auto=format&fit=crop&q=80',
    4.90,
    16700,
    'SIU',
    'lancando',
    620,
    'O que você mais deseja? Tudo o que você sonha está no topo da Torre.',
    '["A Torre", "Shinsu", "Irregulares", "Competição"]'
)
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`), `rating`=VALUES(`rating`), `chapters_count`=VALUES(`chapters_count`);

-- 3. Capítulos Iniciais (Páginas Webtoon com imagens em alta qualidade)
INSERT INTO `capitulos` (`manga_id`, `chapter_number`, `title`, `pages_json`, `views_count`, `rating`) VALUES
(
    'solo-leveling',
    160,
    'O Despertar do Monarca',
    '["https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=85", "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1000&auto=format&fit=crop&q=85", "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1000&auto=format&fit=crop&q=85", "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1000&auto=format&fit=crop&q=85", "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1000&auto=format&fit=crop&q=85", "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1000&auto=format&fit=crop&q=85"]',
    14500,
    5.00
),
(
    'solo-leveling',
    161,
    'Fronteiras Celestiais',
    '["https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1000&auto=format&fit=crop&q=85", "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=85", "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1000&auto=format&fit=crop&q=85", "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1000&auto=format&fit=crop&q=85"]',
    9800,
    4.98
),
(
    'omniscient-reader',
    215,
    'O Fim do Quarto Cenário',
    '["https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1000&auto=format&fit=crop&q=85", "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1000&auto=format&fit=crop&q=85", "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=85"]',
    11200,
    4.97
)
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`), `views_count`=VALUES(`views_count`);

-- 4. Favoritos Iniciais
INSERT IGNORE INTO `favoritos` (`user_id`, `manga_id`) VALUES
('alexandre', 'solo-leveling'),
('alexandre', 'omniscient-reader'),
('alexandre', 'tbate'),
('vip_beta', 'solo-leveling');

-- 5. Histórico Inicial
INSERT INTO `historico_leitura` (`user_id`, `manga_id`, `chapter_number`, `percent_read`) VALUES
('alexandre', 'solo-leveling', 160, 88),
('alexandre', 'omniscient-reader', 215, 100),
('vip_beta', 'solo-leveling', 161, 45)
ON DUPLICATE KEY UPDATE `chapter_number`=VALUES(`chapter_number`), `percent_read`=VALUES(`percent_read`);
