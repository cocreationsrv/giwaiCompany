<?php
declare(strict_types=1);

function gy_data_dir(): string
{
    return dirname(__DIR__) . DIRECTORY_SEPARATOR . 'data';
}

function gy_db_path(): string
{
    return gy_data_dir() . DIRECTORY_SEPARATOR . 'site.sqlite';
}

function gy_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dir = gy_data_dir();
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }

    $pdo = new PDO('sqlite:' . gy_db_path());
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->exec('PRAGMA foreign_keys = ON');
    gy_migrate($pdo);

    return $pdo;
}

function gy_migrate(PDO $pdo): void
{
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS news (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT NOT NULL UNIQUE,
            status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
            published_at TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS news_translations (
            news_id INTEGER NOT NULL,
            lang TEXT NOT NULL CHECK (lang IN ('ja', 'zh', 'en')),
            title TEXT NOT NULL DEFAULT '',
            excerpt TEXT NOT NULL DEFAULT '',
            body TEXT NOT NULL DEFAULT '',
            PRIMARY KEY (news_id, lang),
            FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE
        )
    ");
}

function gy_admin_exists(PDO $pdo): bool
{
    return (bool) $pdo->query('SELECT 1 FROM admins LIMIT 1')->fetchColumn();
}

function gy_json(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function gy_input(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function gy_lang(string $lang): string
{
    return in_array($lang, ['ja', 'zh', 'en'], true) ? $lang : 'ja';
}

function gy_require_admin(): void
{
    if (empty($_SESSION['admin_id'])) {
        gy_json(['ok' => false, 'error' => 'Authentication required'], 401);
    }
}

function gy_plain_text(?string $value, int $maxLength = 20000): string
{
    $value = trim((string) $value);
    if (mb_strlen($value, 'UTF-8') > $maxLength) {
        $value = mb_substr($value, 0, $maxLength, 'UTF-8');
    }
    return $value;
}
