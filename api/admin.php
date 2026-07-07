<?php
declare(strict_types=1);

session_start();
require_once __DIR__ . '/db.php';

try {
    $pdo = gy_db();
    $action = $_GET['action'] ?? '';
    $input = gy_input();

    if ($action === 'status') {
        gy_json([
            'ok' => true,
            'setupRequired' => !gy_admin_exists($pdo),
            'authenticated' => !empty($_SESSION['admin_id']),
            'username' => $_SESSION['admin_username'] ?? null,
        ]);
    }

    if ($action === 'setup') {
        if (gy_admin_exists($pdo)) {
            gy_json(['ok' => false, 'error' => 'Setup is already complete'], 409);
        }
        $username = gy_plain_text($input['username'] ?? '', 80);
        $password = (string) ($input['password'] ?? '');
        if ($username === '' || mb_strlen($password, 'UTF-8') < 8) {
            gy_json(['ok' => false, 'error' => 'Username and an 8+ character password are required'], 422);
        }
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare('INSERT INTO admins (username, password_hash) VALUES (:username, :hash)');
        $stmt->execute([':username' => $username, ':hash' => $hash]);
        $_SESSION['admin_id'] = (int) $pdo->lastInsertId();
        $_SESSION['admin_username'] = $username;
        gy_json(['ok' => true]);
    }

    if ($action === 'login') {
        $username = gy_plain_text($input['username'] ?? '', 80);
        $password = (string) ($input['password'] ?? '');
        $stmt = $pdo->prepare('SELECT id, username, password_hash FROM admins WHERE username = :username LIMIT 1');
        $stmt->execute([':username' => $username]);
        $admin = $stmt->fetch();
        if (!$admin || !password_verify($password, $admin['password_hash'])) {
            gy_json(['ok' => false, 'error' => 'Invalid username or password'], 401);
        }
        session_regenerate_id(true);
        $_SESSION['admin_id'] = (int) $admin['id'];
        $_SESSION['admin_username'] = $admin['username'];
        gy_json(['ok' => true]);
    }

    if ($action === 'logout') {
        $_SESSION = [];
        session_destroy();
        gy_json(['ok' => true]);
    }

    if ($action === 'listNews') {
        gy_require_admin();
        $rows = $pdo->query("
            SELECT n.id, n.slug, n.status, n.published_at, n.created_at, n.updated_at,
                   tr.lang, tr.title, tr.excerpt, tr.body
            FROM news n
            LEFT JOIN news_translations tr ON tr.news_id = n.id
            ORDER BY n.published_at DESC, n.id DESC
        ")->fetchAll();
        $items = [];
        foreach ($rows as $row) {
            $id = (int) $row['id'];
            if (!isset($items[$id])) {
                $items[$id] = [
                    'id' => $id,
                    'slug' => $row['slug'],
                    'status' => $row['status'],
                    'published_at' => $row['published_at'],
                    'created_at' => $row['created_at'],
                    'updated_at' => $row['updated_at'],
                    'translations' => [
                        'ja' => ['title' => '', 'excerpt' => '', 'body' => ''],
                        'zh' => ['title' => '', 'excerpt' => '', 'body' => ''],
                        'en' => ['title' => '', 'excerpt' => '', 'body' => ''],
                    ],
                ];
            }
            if ($row['lang']) {
                $items[$id]['translations'][$row['lang']] = [
                    'title' => $row['title'],
                    'excerpt' => $row['excerpt'],
                    'body' => $row['body'],
                ];
            }
        }
        gy_json(['ok' => true, 'items' => array_values($items)]);
    }

    if ($action === 'saveNews') {
        gy_require_admin();
        $id = isset($input['id']) && $input['id'] !== '' ? (int) $input['id'] : null;
        $slug = strtolower(gy_plain_text($input['slug'] ?? '', 120));
        $status = ($input['status'] ?? 'draft') === 'published' ? 'published' : 'draft';
        $publishedAt = gy_plain_text($input['published_at'] ?? date('Y-m-d'), 10);
        $translations = is_array($input['translations'] ?? null) ? $input['translations'] : [];

        if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) {
            gy_json(['ok' => false, 'error' => 'Slug must use lowercase letters, numbers, and hyphens'], 422);
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $publishedAt)) {
            gy_json(['ok' => false, 'error' => 'Published date must be YYYY-MM-DD'], 422);
        }
        if (gy_plain_text($translations['ja']['title'] ?? '', 180) === '') {
            gy_json(['ok' => false, 'error' => 'Japanese title is required'], 422);
        }

        $pdo->beginTransaction();
        if ($id) {
            $stmt = $pdo->prepare('UPDATE news SET slug = :slug, status = :status, published_at = :published_at, updated_at = CURRENT_TIMESTAMP WHERE id = :id');
            $stmt->execute([':slug' => $slug, ':status' => $status, ':published_at' => $publishedAt, ':id' => $id]);
            if ($stmt->rowCount() === 0) {
                $pdo->rollBack();
                gy_json(['ok' => false, 'error' => 'News item not found'], 404);
            }
        } else {
            $stmt = $pdo->prepare('INSERT INTO news (slug, status, published_at) VALUES (:slug, :status, :published_at)');
            $stmt->execute([':slug' => $slug, ':status' => $status, ':published_at' => $publishedAt]);
            $id = (int) $pdo->lastInsertId();
        }

        $stmt = $pdo->prepare("
            INSERT INTO news_translations (news_id, lang, title, excerpt, body)
            VALUES (:news_id, :lang, :title, :excerpt, :body)
            ON CONFLICT(news_id, lang) DO UPDATE SET
              title = excluded.title,
              excerpt = excluded.excerpt,
              body = excluded.body
        ");
        foreach (['ja', 'zh', 'en'] as $lang) {
            $entry = is_array($translations[$lang] ?? null) ? $translations[$lang] : [];
            $stmt->execute([
                ':news_id' => $id,
                ':lang' => $lang,
                ':title' => gy_plain_text($entry['title'] ?? '', 180),
                ':excerpt' => gy_plain_text($entry['excerpt'] ?? '', 500),
                ':body' => gy_plain_text($entry['body'] ?? '', 20000),
            ]);
        }
        $pdo->commit();
        gy_json(['ok' => true, 'id' => $id]);
    }

    if ($action === 'deleteNews') {
        gy_require_admin();
        $id = (int) ($input['id'] ?? 0);
        if ($id <= 0) {
            gy_json(['ok' => false, 'error' => 'Invalid id'], 422);
        }
        $stmt = $pdo->prepare('DELETE FROM news WHERE id = :id');
        $stmt->execute([':id' => $id]);
        gy_json(['ok' => true]);
    }

    gy_json(['ok' => false, 'error' => 'Unknown action'], 400);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    $code = $error instanceof PDOException && str_contains($error->getMessage(), 'UNIQUE') ? 409 : 500;
    gy_json(['ok' => false, 'error' => $code === 409 ? 'Slug already exists' : 'Server error'], $code);
}
