<?php
require __DIR__ . '/../db_config.php';

header('Content-Type: application/json');

$memberName = trim($_GET['name'] ?? '');

if (!$memberName) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Member name is required']);
    exit;
}

try {
    $conn = getConnection();
    $stmt = $conn->prepare("DELETE FROM members WHERE name = ?");
    $stmt->execute([$memberName]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(['status' => 'success', 'message' => 'Member deleted successfully']);
    } else {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Member not found']);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database error']);
}
?>
