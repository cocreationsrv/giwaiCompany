<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

function gy_contact_value(string $key, int $maxLength = 4000): string
{
    $value = trim((string) ($_POST[$key] ?? ''));
    if (mb_strlen($value, 'UTF-8') > $maxLength) {
        $value = mb_substr($value, 0, $maxLength, 'UTF-8');
    }
    return str_replace(["\r\n", "\r"], "\n", $value);
}

function gy_contact_redirect(string $status): void
{
    header('Location: ../thanks.html?status=' . rawurlencode($status), true, 303);
    exit;
}

function gy_contact_header_value(string $value): string
{
    return trim(str_replace(["\r", "\n"], ' ', $value));
}

function gy_contact_lang(string $lang): string
{
    return in_array($lang, ['ja', 'zh', 'en'], true) ? $lang : 'ja';
}

function gy_contact_template(string $lang): array
{
    $templates = [
        'ja' => [
            'subject' => 'GY COMPANY お問い合わせ',
            'heading' => 'GY COMPANY お問い合わせ',
            'name' => 'お名前',
            'company' => '会社名・団体名',
            'email' => 'メールアドレス',
            'phone' => '電話番号',
            'topic' => 'ご相談内容',
            'message' => 'メッセージ',
            'sent_at' => '送信日時',
            'empty' => '-',
            'topics' => [
                'Japan-China Business' => '日中ビジネス',
                'Cultural Exchange' => '文化交流',
                'Japanese Education / Teaching Application' => '日本語教育・講師応募',
                'Other' => 'その他',
            ],
        ],
        'zh' => [
            'subject' => 'GY COMPANY 咨询表单',
            'heading' => 'GY COMPANY 咨询表单',
            'name' => '姓名',
            'company' => '公司・团体名称',
            'email' => '电子邮箱',
            'phone' => '电话号码',
            'topic' => '咨询类型',
            'message' => '留言',
            'sent_at' => '提交时间',
            'empty' => '-',
            'topics' => [
                'Japan-China Business' => '中日商务',
                'Cultural Exchange' => '文化交流',
                'Japanese Education / Teaching Application' => '日语教育・讲师应聘',
                'Other' => '其他',
            ],
        ],
        'en' => [
            'subject' => 'GY COMPANY website inquiry',
            'heading' => 'GY COMPANY website inquiry',
            'name' => 'Name',
            'company' => 'Company / Organization',
            'email' => 'Email',
            'phone' => 'Phone',
            'topic' => 'Topic',
            'message' => 'Message',
            'sent_at' => 'Sent at',
            'empty' => '-',
            'topics' => [
                'Japan-China Business' => 'Japan-China Business',
                'Cultural Exchange' => 'Cultural Exchange',
                'Japanese Education / Teaching Application' => 'Japanese Education / Teaching',
                'Other' => 'Other',
            ],
        ],
    ];
    return $templates[$lang] ?? $templates['ja'];
}

function gy_contact_log(string $message): void
{
    $dir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'data';
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    $line = '[' . date('Y-m-d H:i:s') . '] ' . $message . PHP_EOL;
    file_put_contents($dir . DIRECTORY_SEPARATOR . 'contact-smtp.log', $line, FILE_APPEND | LOCK_EX);
}

function gy_contact_smtp_configured(): bool
{
    return trim(GY_SMTP_HOST) !== ''
        && GY_SMTP_PORT > 0
        && trim(GY_CONTACT_FROM_EMAIL) !== ''
        && trim(GY_CONTACT_RECIPIENT) !== '';
}

function gy_contact_smtp_read($socket): string
{
    $response = '';
    while (($line = fgets($socket, 515)) !== false) {
        $response .= $line;
        if (strlen($line) >= 4 && $line[3] === ' ') {
            break;
        }
    }
    return $response;
}

function gy_contact_smtp_code(string $response): int
{
    return (int) substr($response, 0, 3);
}

function gy_contact_smtp_command($socket, string $command, array $expected): string
{
    fwrite($socket, $command . "\r\n");
    $response = gy_contact_smtp_read($socket);
    if (!in_array(gy_contact_smtp_code($response), $expected, true)) {
        $safeCommand = preg_match('/^(AUTH|MAIL FROM|RCPT TO|DATA|EHLO|HELO|STARTTLS|QUIT)/i', $command)
            ? preg_replace('/AUTH\s+.*/i', 'AUTH ***', $command)
            : 'SMTP sensitive command';
        throw new RuntimeException('SMTP command failed after "' . $safeCommand . '": ' . trim($response));
    }
    return $response;
}

function gy_contact_smtp_connect()
{
    $encryption = strtolower(trim(GY_SMTP_ENCRYPTION));
    $transport = $encryption === 'tls' ? 'ssl://' : '';
    $remote = $transport . GY_SMTP_HOST . ':' . GY_SMTP_PORT;
    $socket = @stream_socket_client($remote, $errno, $errstr, GY_SMTP_TIMEOUT, STREAM_CLIENT_CONNECT);
    if (!$socket) {
        throw new RuntimeException('SMTP connection failed: ' . $errstr);
    }
    stream_set_timeout($socket, GY_SMTP_TIMEOUT);
    $greeting = gy_contact_smtp_read($socket);
    if (gy_contact_smtp_code($greeting) !== 220) {
        throw new RuntimeException('SMTP greeting failed: ' . trim($greeting));
    }
    return $socket;
}

function gy_contact_smtp_send(string $subject, string $body, string $replyName, string $replyEmail): bool
{
    if (!gy_contact_smtp_configured()) {
        gy_contact_log('SMTP config is incomplete.');
        return false;
    }

    $socket = null;
    try {
        $socket = gy_contact_smtp_connect();
        $hostname = $_SERVER['SERVER_NAME'] ?? 'localhost';
        gy_contact_smtp_command($socket, 'EHLO ' . gy_contact_header_value($hostname), [250]);

        if (strtolower(trim(GY_SMTP_ENCRYPTION)) === 'starttls') {
            gy_contact_smtp_command($socket, 'STARTTLS', [220]);
            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new RuntimeException('SMTP STARTTLS failed');
            }
            gy_contact_smtp_command($socket, 'EHLO ' . gy_contact_header_value($hostname), [250]);
        }

        $hasUsername = trim(GY_SMTP_USERNAME) !== '';
        $hasPassword = trim(GY_SMTP_PASSWORD) !== '';
        if ($hasUsername !== $hasPassword) {
            throw new RuntimeException('SMTP username and password must be set together');
        }
        if ($hasUsername && $hasPassword) {
            gy_contact_smtp_command($socket, 'AUTH LOGIN', [334]);
            gy_contact_smtp_command($socket, base64_encode(GY_SMTP_USERNAME), [334]);
            gy_contact_smtp_command($socket, base64_encode(GY_SMTP_PASSWORD), [235]);
        }

        $fromEmail = gy_contact_header_value(GY_CONTACT_FROM_EMAIL);
        $envelopeFrom = gy_contact_header_value(GY_SMTP_ENVELOPE_FROM !== '' ? GY_SMTP_ENVELOPE_FROM : (GY_SMTP_USERNAME !== '' ? GY_SMTP_USERNAME : GY_CONTACT_FROM_EMAIL));
        $fromName = mb_encode_mimeheader(gy_contact_header_value(GY_CONTACT_FROM_NAME), 'UTF-8');
        $replyName = mb_encode_mimeheader(gy_contact_header_value($replyName), 'UTF-8');
        $replyEmail = gy_contact_header_value($replyEmail);
        $encodedSubject = mb_encode_mimeheader($subject, 'UTF-8');

        $headers = [
            'From: ' . $fromName . ' <' . $fromEmail . '>',
            'To: <' . gy_contact_header_value(GY_CONTACT_RECIPIENT) . '>',
            'Reply-To: ' . $replyName . ' <' . $replyEmail . '>',
            'Subject: ' . $encodedSubject,
            'Date: ' . date(DATE_RFC2822),
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
        ];
        $message = implode("\r\n", $headers) . "\r\n\r\n" . str_replace(["\r\n", "\r"], "\n", $body);
        $message = preg_replace("/(?<!\r)\n/", "\r\n", $message) ?? $message;
        $message = str_replace("\n.", "\n..", $message);

        gy_contact_smtp_command($socket, 'MAIL FROM:<' . $envelopeFrom . '>', [250]);
        gy_contact_smtp_command($socket, 'RCPT TO:<' . gy_contact_header_value(GY_CONTACT_RECIPIENT) . '>', [250, 251]);
        gy_contact_smtp_command($socket, 'DATA', [354]);
        fwrite($socket, $message . "\r\n.\r\n");
        $dataResponse = gy_contact_smtp_read($socket);
        if (!in_array(gy_contact_smtp_code($dataResponse), [250], true)) {
            throw new RuntimeException('SMTP DATA failed: ' . trim($dataResponse));
        }
        gy_contact_smtp_command($socket, 'QUIT', [221]);
        fclose($socket);
        return true;
    } catch (Throwable $error) {
        if (is_resource($socket)) {
            fclose($socket);
        }
        gy_contact_log($error->getMessage());
        return false;
    }
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    gy_contact_redirect('error');
}

$name = gy_contact_value('name', 200);
$company = gy_contact_value('company', 200);
$email = gy_contact_value('email', 300);
$phone = gy_contact_value('phone', 100);
$topic = gy_contact_value('topic', 300);
$message = gy_contact_value('message', 10000);
$lang = gy_contact_lang(gy_contact_value('lang', 10));

if ($name === '' || $email === '' || $topic === '' || $message === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    gy_contact_redirect('error');
}

$template = gy_contact_template($lang);
$topicLabel = $template['topics'][$topic] ?? $topic;
$subject = $template['subject'];
$body = implode("\n", [
    $template['heading'],
    '',
    $template['name'] . ': ' . $name,
    $template['company'] . ': ' . ($company !== '' ? $company : $template['empty']),
    $template['email'] . ': ' . $email,
    $template['phone'] . ': ' . ($phone !== '' ? $phone : $template['empty']),
    $template['topic'] . ': ' . $topicLabel,
    '',
    $template['message'] . ':',
    $message,
    '',
    $template['sent_at'] . ': ' . date('Y-m-d H:i:s'),
]);

$sent = gy_contact_smtp_send($subject, $body, $name, $email);
gy_contact_redirect($sent ? 'sent' : 'error');
