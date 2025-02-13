<?php
require __DIR__ . '/../db_config.php';
header('Content-Type: application/json');

$conn = getConnection();
$search = $_GET['search'] ?? '';
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 10;
$page = isset($_GET['page']) ? intval($_GET['page']) : 1;
$offset = ($page - 1) * $limit;

try {
    if ($search) {
        
        $stmt = $conn->prepare("SELECT * FROM members WHERE name LIKE ? OR email LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?");
        $searchTerm = "%$search%";
        $stmt->bindParam(1, $searchTerm, PDO::PARAM_STR);
        $stmt->bindParam(2, $searchTerm, PDO::PARAM_STR);
        $stmt->bindParam(3, $limit, PDO::PARAM_INT);
        $stmt->bindParam(4, $offset, PDO::PARAM_INT);
    } else {
        $stmt = $conn->prepare("SELECT * FROM members ORDER BY created_at DESC LIMIT ? OFFSET ?");
        $stmt->bindParam(1, $limit, PDO::PARAM_INT);
        $stmt->bindParam(2, $offset, PDO::PARAM_INT);
    }

    $stmt->execute();
    $members = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['status' => 'success', 'data' => $members]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database error']);
}
?>
