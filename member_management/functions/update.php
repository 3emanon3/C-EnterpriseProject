<?php
require __DIR__ . '/../db_config.php';
header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);
$name = trim($data['name'] ?? '');

if (!$name) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Member name is required']);
    exit;
}

$email = trim($data['email'] ?? '');
$phone = trim($data['phone'] ?? '');
$address = trim($data['address'] ?? '');
$status = trim($data['status'] ?? '');
$dob = trim($data['dob'] ?? '');

try {
    $conn = getConnection();
    $stmt = $conn->prepare("UPDATE members SET email=?, phone=?, address=?, status=?, dob=?, updated_at=NOW() WHERE name=?");
    $stmt->execute([$email, $phone, $address, $status, $dob, $name]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(['status' => 'success', 'message' => 'Member updated successfully']);
    } else {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Member not found or no changes made']);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database error']);
}
?>
