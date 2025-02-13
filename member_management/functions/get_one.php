<?php
require __DIR__ . '/../db_config.php';
header('Content-Type: application/json');

$name = $_GET['name'] ?? '';

if (!$name) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Member name is required']);
    exit;
}

try {
    $conn = getConnection();
    $stmt = $conn->prepare("SELECT * FROM members WHERE name = ?");
    $stmt->execute([$name]);
    $member = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($member) {
        echo json_encode(['status' => 'success', 'data' => $member]);
    } else {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Member not found']);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database error']);
}
?>
