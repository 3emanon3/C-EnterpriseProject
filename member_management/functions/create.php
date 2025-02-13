<?php
require __DIR__ . '/../db_config.php';
header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid JSON input']);
    exit;
}

$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$phone = trim($data['phone'] ?? '');
$address = trim($data['address'] ?? '');
$status = trim($data['status'] ?? '');
$dob = trim($data['dob'] ?? '');

// Validate input
$errors = [];

if (empty($name)) $errors[] = "Name is required";
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = "Valid email is required";
if (empty($phone) || !preg_match('/^[0-9]{10}$/', $phone)) $errors[] = "Valid 10-digit phone number is required";
if (empty($dob)) $errors[] = "Date of birth is required";

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => implode(', ', $errors)]);
    exit;
}

try {
    $conn = getConnection();
    $stmt = $conn->prepare("INSERT INTO members (name, email, phone, address, status, dob, created_at) 
                            VALUES (?, ?, ?, ?, ?, ?, NOW())");
    $stmt->execute([$name, $email, $phone, $address, $status, $dob]);

    http_response_code(201);
    echo json_encode(['status' => 'success', 'message' => 'Member added successfully']);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
