-- ========================================================================
-- SCHEMA INICIAL DO BANCO DE DADOS MANGAFLIX PRIME
-- Base Oficial: aaa (VPS 2.25.124.5)
-- REGRA DE ISOLAMENTO: NUNCA TOCAR EM 'cell' OU 'ebook_readers_gtp'
-- ========================================================================

CREATE DATABASE IF NOT EXISTS `aaa` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `aaa`;

-- 1. Tabela de Usuários / Contas (Multi-login preparado)
CREATE TABLE IF NOT EXISTS `usuarios` (
    `id` VARCHAR(100) NOT NULL PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NULL,
    `avatar` VARCHAR(255) NULL,
    `rank` VARCHAR(50) NOT NULL DEFAULT 'RANK E',
    `level` INT UNSIGNED DEFAULT 1,
    `xp` INT UNSIGNED DEFAULT 0,
    `role` ENUM('leitor', 'vip', 'admin') DEFAULT 'leitor',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Inserir usuário padrão Alexandre para testes imediatos
INSERT INTO `usuarios` (`id`, `name`, `email`, `rank`, `level`, `xp`, `role`)
VALUES ('alexandre', 'Alexandre Guterres', 'alexandre@gtpsmart.com', 'RANK SSS', 42, 8420, 'admin')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2. Tabela de Mangás e Obras
CREATE TABLE IF NOT EXISTS `mangas` (
    `id` VARCHAR(100) NOT NULL PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `type` VARCHAR(50) DEFAULT 'Manhwa',
    `genres` JSON NULL,
    `cover` TEXT NOT NULL,
    `banner` TEXT NULL,
    `rating` DECIMAL(3, 2) DEFAULT 5.00,
    `total_ratings_count` INT UNSIGNED DEFAULT 0,
    `author` VARCHAR(255) NOT NULL,
    `status` ENUM('lancando', 'concluido') DEFAULT 'lancando',
    `chapters_count` INT UNSIGNED DEFAULT 0,
    `synopsis` TEXT NULL,
    `tags` JSON NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Tabela de Capítulos
CREATE TABLE IF NOT EXISTS `capitulos` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `manga_id` VARCHAR(100) NOT NULL,
    `chapter_number` INT UNSIGNED NOT NULL,
    `title` VARCHAR(255) NULL,
    `pages_json` JSON NOT NULL, -- Array com as URLs das imagens verticais
    `views_count` INT UNSIGNED DEFAULT 0,
    `rating` DECIMAL(3, 2) DEFAULT 5.00,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_manga_chapter` (`manga_id`, `chapter_number`),
    CONSTRAINT `fk_capitulos_manga` FOREIGN KEY (`manga_id`) REFERENCES `mangas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Tabela de Comentários (Para a obra e para capítulos específicos)
CREATE TABLE IF NOT EXISTS `comentarios` (
    `id` VARCHAR(100) NOT NULL PRIMARY KEY,
    `manga_id` VARCHAR(100) NOT NULL,
    `chapter_number` INT UNSIGNED NULL, -- NULL indica comentário geral da obra
    `user_id` VARCHAR(100) NOT NULL DEFAULT 'alexandre',
    `user_name` VARCHAR(150) NOT NULL DEFAULT 'Alexandre Guterres',
    `user_rank` VARCHAR(50) NOT NULL DEFAULT 'RANK SSS',
    `text` TEXT NOT NULL,
    `rating` TINYINT UNSIGNED NULL, -- Nota opcional dada no comentário (1 a 5)
    `likes_count` INT UNSIGNED DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_manga_comments` (`manga_id`, `chapter_number`),
    CONSTRAINT `fk_comentarios_manga` FOREIGN KEY (`manga_id`) REFERENCES `mangas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Tabela de Favoritos
CREATE TABLE IF NOT EXISTS `favoritos` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` VARCHAR(100) NOT NULL DEFAULT 'alexandre',
    `manga_id` VARCHAR(100) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_user_manga_fav` (`user_id`, `manga_id`),
    CONSTRAINT `fk_favoritos_manga` FOREIGN KEY (`manga_id`) REFERENCES `mangas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Tabela de Histórico de Leitura
CREATE TABLE IF NOT EXISTS `historico_leitura` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` VARCHAR(100) NOT NULL DEFAULT 'alexandre',
    `manga_id` VARCHAR(100) NOT NULL,
    `chapter_number` INT UNSIGNED NOT NULL,
    `percent_read` TINYINT UNSIGNED DEFAULT 100,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_user_manga_hist` (`user_id`, `manga_id`),
    CONSTRAINT `fk_historico_manga` FOREIGN KEY (`manga_id`) REFERENCES `mangas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
