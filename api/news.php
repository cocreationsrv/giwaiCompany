<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

try {
    $pdo = gy_db();
    $action = $_GET['action'] ?? 'list';
    $lang = gy_lang((string) ($_GET['lang'] ?? 'ja'));

    if ($action === 'list') {
        $limit = (int) ($_GET['limit'] ?? 100);
        $limit = max(1, min($limit, 100));
        $stmt = $pdo->prepare("
            SELECT
                n.slug,
                n.published_at,
                COALESCE(NULLIF(t.title, ''), NULLIF(ja.title, ''), n.slug) AS title,
                COALESCE(NULLIF(t.excerpt, ''), NULLIF(ja.excerpt, ''), '') AS excerpt
            FROM news n
            LEFT JOIN news_translations t ON t.news_id = n.id AND t.lang = :lang
            LEFT JOIN news_translations ja ON ja.news_id = n.id AND ja.lang = 'ja'
            WHERE n.status = 'published'
            ORDER BY n.published_at DESC, n.id DESC
            LIMIT :limit
        ");
        $stmt->bindValue(':lang', $lang, PDO::PARAM_STR);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        gy_json(['ok' => true, 'items' => $stmt->fetchAll()]);
    }

    if ($action === 'detail') {
        $slug = trim((string) ($_GET['slug'] ?? ''));
        $stmt = $pdo->prepare("
            SELECT
                n.slug,
                n.published_at,
                COALESCE(NULLIF(t.title, ''), NULLIF(ja.title, ''), n.slug) AS title,
                COALESCE(NULLIF(t.excerpt, ''), NULLIF(ja.excerpt, ''), '') AS excerpt,
                COALESCE(NULLIF(t.body, ''), NULLIF(ja.body, ''), '') AS body
            FROM news n
            LEFT JOIN news_translations t ON t.news_id = n.id AND t.lang = :lang
            LEFT JOIN news_translations ja ON ja.news_id = n.id AND ja.lang = 'ja'
            WHERE n.status = 'published' AND n.slug = :slug
            LIMIT 1
        ");
        $stmt->execute([':lang' => $lang, ':slug' => $slug]);
        $item = $stmt->fetch();
        if (!$item) {
            gy_json(['ok' => false, 'error' => 'Not found'], 404);
        }
        gy_json(['ok' => true, 'item' => $item]);
    }

    gy_json(['ok' => false, 'error' => 'Unknown action'], 400);
} catch (Throwable $error) {
    gy_json(['ok' => false, 'error' => 'Server error'], 500);
}
