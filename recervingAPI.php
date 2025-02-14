<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Debug logging
$requestDebug = [
    'GET' => $_GET,
    'POST' => $_POST,
    'URI' => $_SERVER['REQUEST_URI'],
    'METHOD' => $_SERVER['REQUEST_METHOD']
];
file_put_contents('debug.log', date('Y-m-d H:i:s') . ': ' . print_r($requestDebug, true) . "\n", FILE_APPEND);

require 'databaseConnection.php';

class DatabaseAPI {
    private $dsn;
    private $allowedTables = [
        'members' => ['ID', 'Name', 'CName', 'Designation of Applicant', 'Address', 'phone_number', 'email', 'IC', 'oldIC', 'gender', 'componyName', 'Birthday', 'expired date', 'place of birth'],
        'applicants types' => ['ID', 'designation of applicant']
    ];

    public function __construct($dsn) {
        $this->dsn = $dsn;
        
        // Test database connection
        try {
            $this->dsn->query("SELECT 1");
        } catch (Exception $e) {
            error_log("Database connection failed: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Database connection failed']);
            exit;
        }
    }

    public function handleRequest() {
        // Test endpoint for debugging
        if (isset($_GET['test'])) {
            echo json_encode([
                'status' => 'API is running',
                'received_params' => $_GET,
                'tables_available' => array_keys($this->allowedTables)
            ]);
            return;
        }

        $method = $_SERVER['REQUEST_METHOD'];
        
        // Get table from query parameter
        $table = $_GET['table'] ?? '';

        if (!array_key_exists($table, $this->allowedTables)) {
            http_response_code(404);
            echo json_encode([
                'error' => 'Table not found',
                'available_tables' => array_keys($this->allowedTables)
            ]);
            return;
        }

        $params = $_GET;

        switch($method) {
            case 'GET':
                if (isset($_GET['birthdays'])) {
                    $this->getBirthdays($table, $params);
                } else {
                    $this->getAllRecords($table, $params);
                }
                break;
            default:
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
                break;
        }
    }

    private function validateSortParams($table, $sortColumn, $sortOrder) {
      if (!in_array($sortColumn, $this->allowedTables[$table])) {
        return false;
      }
      return in_array(strtoupper($sortOrder),['ASC', 'DESC']);
    }

    private function getBirthdays($table, $id) {
        
        if (!array_key_exists($table, $this->allowedTables)) {
          throw new Exception('Invalid table name');
        }
                
        if($table!== 'members'){
            //only members table has birthday
            http_response_code(404);
            echo json_encode(['error' => 'Table not found']);
            return;
        }else {
          try {

            date_default_timezone_set('Asia/Kuala_Lumpur');
            $date = date('n');

            // Get total count for pagination
            $countQuery = "SELECT COUNT(*) as total FROM `$table` WHERE Birthday = ?";
            $stmt = $this->dsn->prepare($countQuery);

            if($stmt){
              $stmt->bind_param('i', $date);
              if (!$stmt->execute()) {
                throw new Exception('Failed to execute query: ' . $stmt->error);
              }
              $result = $stmt->get_result();
              $row = $result->fetch_assoc();
              $totalRecords = $row['total'];
              $result->free();
              $stmt->close();
            }else{
              throw new Exception('Failed to prepare statement: ' . $this->dsn->error);
            }

            // Handle pagination
            $page = max(1, intval($_GET['page'] ?? 1));
            $limit = max(1, min(100, intval($_GET['limit'] ?? 10))); // Limit between 1 and 100
            $offset = ($page - 1) * $limit;

            // Prepare and execute main query
            $query = "SELECT * FROM `$table` WHERE Birthday = ? LIMIT ? OFFSET ?";
            $stmt = $this->dsn->prepare($query);

            if (!$stmt) {
              throw new Exception('Failed to prepare statement: ' . $this->dsn->error);
             }

            $stmt->bind_param('iii', $date, $limit, $offset);
            $stmt->execute();
            $result = $stmt->get_result();
            $data = $result->fetch_all(MYSQLI_ASSOC);

            // Calculate total pages
            $totalPages = ceil($totalRecords / $limit);
            
            echo json_encode([
                'data' => $data,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total_records' => $totalRecords,
                    'total_pages' => $totalPages
                ]
            ]);
          } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
          }
        }
    }

    private function getAllRecords($table, $params) {
        try {
            // Validate table name to prevent SQL injection
            if (!array_key_exists($table, $this->allowedTables)) {
                throw new Exception('Invalid table name');
            }

            $sortColumn = $params['sort'] ?? 'ID';
            $sortOrder = strtoupper($params['order'] ?? 'ASC');

            // Get total count for pagination
            $countQuery = "SELECT COUNT(*) as total FROM `$table`";
            $countResult = $this->dsn->query($countQuery);
            $totalRecords = $countResult->fetch_assoc()['total'];

            // Handle pagination
            $page = max(1, intval($params['page'] ?? 1));
            $limit = max(1, min(100, intval($params['limit'] ?? 10))); // Limit between 1 and 100
            $offset = ($page - 1) * $limit;

            // Prepare and execute main query
            $query = "SELECT * FROM `$table` ORDER BY `$sortColumn` $sortOrder LIMIT ? OFFSET ?";
            $stmt = $this->dsn->prepare($query);
            
            if ($stmt === false) {
                throw new Exception('Failed to prepare statement: ' . $this->dsn->error);
            }

            $stmt->bind_param('ii', $limit, $offset);
            
            if (!$stmt->execute()) {
                throw new Exception('Failed to execute query: ' . $stmt->error);
            }

            $result = $stmt->get_result();
            $data = $result->fetch_all(MYSQLI_ASSOC);

            // Calculate total pages
            $totalPages = ceil($totalRecords / $limit);
            
            echo json_encode([
                'data' => $data,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total_records' => $totalRecords,
                    'total_pages' => $totalPages
                ],
                'sorting' => [
                    'column' => $sortColumn,
                    'order' => $sortOrder
                ]
            ]);

        } catch (Exception $e) {
            error_log("Error in getAllRecords: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'error' => 'Database error',
                'message' => $e->getMessage()
            ]);
        }
    }
}

// Create API instance and handle request
$api = new DatabaseAPI($dsn);
$api->handleRequest();
?>