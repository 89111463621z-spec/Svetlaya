<?php
/**
 * Приём заявок с сайта «Светлая Дача» → лид в Битрикс24.
 *
 * Адрес вебхука хранится только здесь, на сервере (в config.php),
 * поэтому посетители сайта его не видят.
 * Настройка — см. api/README.md
 */

header('Content-Type: application/json; charset=utf-8');

function respond(int $code, array $data): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'method']);
}

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    respond(500, ['ok' => false, 'error' => 'config']);
}
$config = require $configFile;
$webhook = rtrim($config['webhook'] ?? '', '/') . '/';
if ($webhook === '/') {
    respond(500, ['ok' => false, 'error' => 'config']);
}

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) {
    $in = $_POST;
}

// Ловушка для ботов: скрытое поле должно быть пустым
if (!empty($in['website'])) {
    respond(200, ['ok' => true]);
}

$clean = static fn($v, int $max = 200): string =>
    mb_substr(trim(strip_tags((string)($v ?? ''))), 0, $max);

$name  = $clean($in['name'] ?? '', 100);
$phone = preg_replace('/\D+/', '', (string)($in['phone'] ?? ''));
$goal  = $clean($in['goal'] ?? '');
$lot   = $clean($in['lot'] ?? '');
$form  = $clean($in['form'] ?? '', 50);
$page  = $clean($in['page'] ?? '', 500);

if (strlen($phone) === 11 && $phone[0] === '8') {
    $phone = '7' . substr($phone, 1);
}
if (strlen($phone) !== 11) {
    respond(422, ['ok' => false, 'error' => 'phone']);
}

// Простая защита от повторной отправки: не чаще раза в 30 секунд с одного IP
$ip = $_SERVER['REMOTE_ADDR'] ?? '0';
$lock = sys_get_temp_dir() . '/sd_lead_' . md5($ip);
if (is_file($lock) && time() - filemtime($lock) < 30) {
    respond(429, ['ok' => false, 'error' => 'rate']);
}
@touch($lock);

$comments = array_filter([
    $lot  ? "Интересует: $lot" : '',
    $goal ? "Цель покупки: $goal" : '',
    $form ? "Форма: $form" : '',
    $page ? "Страница: $page" : '',
]);

$fields = [
    'TITLE'     => 'Светлая Дача — заявка с сайта' . ($lot ? " ($lot)" : ''),
    'NAME'      => $name ?: 'Без имени',
    'PHONE'     => [['VALUE' => '+' . $phone, 'VALUE_TYPE' => 'WORK']],
    'SOURCE_ID' => $config['source_id'] ?? 'WEB',
    'SOURCE_DESCRIPTION' => 'Сайт «Светлая Дача»',
    'COMMENTS'  => implode("\n", $comments),
];
foreach (['UTM_SOURCE', 'UTM_MEDIUM', 'UTM_CAMPAIGN', 'UTM_CONTENT', 'UTM_TERM'] as $k) {
    $v = $clean($in[strtolower($k)] ?? '', 100);
    if ($v !== '') $fields[$k] = $v;
}
if (!empty($config['assigned_by_id'])) {
    $fields['ASSIGNED_BY_ID'] = (int)$config['assigned_by_id'];
}

$ch = curl_init($webhook . 'crm.lead.add.json');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => http_build_query(['fields' => $fields, 'params' => ['REGISTER_SONET_EVENT' => 'Y']]),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 15,
]);
$res  = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$data = json_decode((string)$res, true);
if ($code !== 200 || empty($data['result'])) {
    error_log('Bitrix lead error: ' . $code . ' ' . $res);
    respond(502, ['ok' => false, 'error' => 'crm']);
}

respond(200, ['ok' => true]);
