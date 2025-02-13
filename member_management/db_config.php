<?php
// Database configuration constants
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'member_management');

// PDO connection function
function getConnection() {
    try {
        $conn = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, 
            DB_USER, 
            DB_PASS, 
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8"
            ]
        );
        return $conn;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
        exit;
    }
}

// Function to handle member search
function searchMembers($searchTerm = '') {
    try {
        $conn = getConnection();
        $sql = "SELECT id, name, email, phone, address, status, dob 
                FROM members 
                WHERE name LIKE :term 
                OR email LIKE :term 
                OR phone LIKE :term 
                OR address LIKE :term";
        $stmt = $conn->prepare($sql);
        $stmt->execute(['term' => "%$searchTerm%"]);
        $results = $stmt->fetchAll();

        // Debugging: Check if data is fetched
        if (empty($results)) {
            return [];
        }
        return $results;
    } catch (PDOException $e) {
        throw new Exception('Search failed: ' . $e->getMessage());
    }
}

// Function to get single member by ID
function getMemberById($id) {
    try {
        $conn = getConnection();
        $stmt = $conn->prepare("SELECT id, name, email, phone, address, status, dob FROM members WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    } catch (PDOException $e) {
        throw new Exception('Failed to get member: ' . $e->getMessage());
    }
}

// Main request handler
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    header('Content-Type: application/json');
    
    try {
        $action = $_GET['action'] ?? 'search';
        
        switch ($action) {
            case 'search':
                $searchTerm = $_GET['term'] ?? '';
                $results = searchMembers($searchTerm);

                // Debugging: If no data, return empty array
                if (empty($results)) {
                    echo json_encode(['message' => 'No members found']);
                } else {
                    echo json_encode($results);
                }
                break;
                
            case 'get':
                $id = $_GET['id'] ?? 0;
                if (!$id) {
                    throw new Exception('Member ID is required');
                }
                $member = getMemberById($id);
                if (!$member) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Member not found']);
                } else {
                    echo json_encode($member);
                }
                break;
                
            default:
                http_response_code(400);
                echo json_encode(['error' => 'Invalid action']);
                break;
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>
