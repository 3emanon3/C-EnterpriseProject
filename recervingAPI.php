<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set CORS and content headers
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
file_put_contents(
    'debug.log', 
    date('Y-m-d H:i:s') . ': ' . print_r($requestDebug, true) . "\n", 
    FILE_APPEND
);

// Database connection
require 'databaseConnection.php';

class DatabaseAPI {
    private $dsn;
    private $allowedTables = [
        'members' => ['ID', 'membersID', 'Name', 'CName', 'Designation of Applicant', 'Address', 'phone_number', 'email', 'IC', 'oldIC', 'gender', 'componyName', 'Birthday', 'expired date', 'place of birth', 'remarks'],
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
                if (isset($_GET['search'])) {
                    $this->searchRecords($table, $params);
                }else if (isset($_GET['birthdays'])) {
                    $this->getBirthdays($table, $params);
                } else if (isset($_GET['expired'])) {
                    $this->getExpired($table, $params);
                } else {
                    $this->getAllRecords($table, $params);
                }
                break;
            case 'POST':
                $postData = json_decode(file_get_contents('php://input'), true);
                if ($postData === null) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Invalid JSON data']);
                    return;
                }
                $this->createRecord($table, $postData);
                break;
            case 'PUT':
                break;
            case 'DELETE':
                $deleteID = $_GET['id'] ?? null;
                if ($deleteID === null) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Missing ID parameter']);
                    return;
                }
                $this->deleteRecord($table, $deleteID);
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

    private function searchRecords($table, $params) {
        try {
            if (!array_key_exists($table, $this->allowedTables)) {
                throw new Exception('Invalid table name');
            }

            $searchTerm = $params['search'] ?? '';
            $sortColumn = $params['sort'] ?? 'ID';
            $sortOrder = strtoupper($params['order'] ?? 'ASC');

            if (!$this->validateSortParams($table, $sortColumn, $sortOrder)) {
                throw new Exception('Invalid sort parameters');
            }

            // Build search conditions for each column
            $searchConditions = [];
            $searchValues = [];
            foreach ($this->allowedTables[$table] as $column) {
                $searchConditions[] = "`$column` LIKE ?";
                $searchValues[] = "%$searchTerm%";
            }

            // Get total count for pagination
            $countQuery = "SELECT COUNT(*) as total FROM `$table` WHERE " . implode(' OR ', $searchConditions);
            $stmt = $this->dsn->prepare($countQuery);
            
            if ($stmt === false) {
                throw new Exception('Failed to prepare count statement: ' . $this->dsn->error);
            }

            $stmt->bind_param(str_repeat('s', count($searchValues)), ...$searchValues);
            
            if (!$stmt->execute()) {
                throw new Exception('Failed to execute count query: ' . $stmt->error);
            }

            $result = $stmt->get_result();
            $totalRecords = $result->fetch_assoc()['total'];

            // Handle pagination
            $page = max(1, intval($params['page'] ?? 1));
            $limit = max(1, min(100, intval($params['limit'] ?? 10)));
            $offset = ($page - 1) * $limit;

            // Main search query
            $query = "SELECT * FROM `$table` WHERE " . implode(' OR ', $searchConditions) . 
                    " ORDER BY `$sortColumn` $sortOrder LIMIT ? OFFSET ?";
            
            $stmt = $this->dsn->prepare($query);
            
            if ($stmt === false) {
                throw new Exception('Failed to prepare search statement: ' . $this->dsn->error);
            }

            // Bind all search parameters plus limit and offset
            $bindValues = array_merge($searchValues, [$limit, $offset]);
            $types = str_repeat('s', count($searchValues)) . 'ii';
            $stmt->bind_param($types, ...$bindValues);

            if (!$stmt->execute()) {
                throw new Exception('Failed to execute search query: ' . $stmt->error);
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
                ],
                'search' => [
                    'term' => $searchTerm,
                    'matched_records' => count($data)
                ]
            ]);

        } catch (Exception $e) {
            error_log("Error in searchRecords: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'error' => 'Database error',
                'message' => $e->getMessage()
            ]);
        }
    }

    private function getBirthdays($table, $params) {
        
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

            $sortColumn = $params['sort'] ?? 'ID';
            $sortOrder = strtoupper($params['order'] ?? 'ASC');

            if (!$this->validateSortParams($table, $sortColumn, $sortOrder)) {
              throw new Exception('Invalid sort parameters');
            }

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
            $query = "SELECT * FROM `$table` WHERE Birthday = ? ORDER BY `$sortColumn` $sortOrder LIMIT ? OFFSET ?";
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
                ],
                'sorting' => [
                    'column' => $sortColumn,
                    'order' => $sortOrder
                ]
            ]);
          } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
          }
        }
    }

    private function getExpired($table, $params) {
      if (!array_key_exists($table, $this->allowedTables)) {
        throw new Exception('Invalid table name');
      }

      if($table!== 'members'){
        //only members table has birthday
        http_response_code(404);
        echo json_encode(['error' => 'Table not found']);
        return;
      }
      
      try {
          $sortColumn = $params['sort'] ?? 'ID';
          $sortOrder = strtoupper($params['order'] ?? 'ASC');

          if (!$this->validateSortParams($table, $sortColumn, $sortOrder)) {
              throw new Exception('Invalid sort parameters');
          }

         date_default_timezone_set('Asia/Kuala_Lumpur');
         $month = date('n');
         $year = date('Y');

         $sortColumn = $params['sort'] ?? 'ID';
            $sortOrder = strtoupper($params['order'] ?? 'ASC');

            if (!$this->validateSortParams($table, $sortColumn, $sortOrder)) {
              throw new Exception('Invalid sort parameters');
            }

            date_default_timezone_set('Asia/Kuala_Lumpur');
            $month = date('n');
            $year = date('Y');

            // Get total count for pagination
            $countQuery = "SELECT COUNT(*) as total FROM `$table` WHERE Year(`expired date`) = ? AND Month(`expired date`) = ?";
            $stmt = $this->dsn->prepare($countQuery);

            if($stmt){
              $stmt->bind_param('ii', $year, $month);
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

            $page = max(1, intval($_GET['page'] ?? 1));
            $limit = max(1, min(100, intval($_GET['limit'] ?? 10))); // Limit between 1 and 100
            $offset = ($page - 1) * $limit;

            // Prepare and execute main query
            $query = "SELECT * FROM `$table` WHERE Year(`expired date`) = ? AND Month(`expired date`) = ? ORDER BY `$sortColumn` $sortOrder LIMIT ? OFFSET ?";
            $stmt = $this->dsn->prepare($query);

            if (!$stmt) {
                throw new Exception('Failed to prepare statement: ' . $this->dsn->error);
               }
  
              $stmt->bind_param('iiii', $year, $month, $limit, $offset);
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
                  ],
                  'sorting' => [
                      'column' => $sortColumn,
                      'order' => $sortOrder
                  ]
              ]);

      } catch (Exception $e) {
            error_log("Error in getExpired: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'error' => 'Database error',
                'message' => $e->getMessage()
            ]);
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

    private function createRecord($table, $data) {
      try {
          // Validate table name
          if (!array_key_exists($table, $this->allowedTables)) {
              throw new Exception('Invalid table name');
          }
  
          // Validate input fields against allowed columns
          $allowedColumns = $this->allowedTables[$table];
          $filteredData = array_intersect_key($data, array_flip($allowedColumns));
  
          if (empty($filteredData)) {
              throw new Exception('No valid fields provided');
          }
  
          // Build query
          $columns = array_keys($filteredData);
          $values = array_values($filteredData);
          $placeholders = str_repeat('?,', count($values) - 1) . '?';
          
          $query = "INSERT INTO `$table` (`" . implode('`, `', $columns) . "`) VALUES ($placeholders)";
          
          // Prepare and execute statement
          $stmt = $this->dsn->prepare($query);
          
          if ($stmt === false) {
              throw new Exception('Failed to prepare statement: ' . $this->dsn->error);
          }
  
          // Generate type string for bind_param
          $types = '';
          foreach ($values as $value) {
              if (is_int($value)) $types .= 'i';
              elseif (is_float($value)) $types .= 'd';
              else $types .= 's';
          }
  
          // Bind parameters dynamically
          $bindParams = array_merge([$types], $values);
          $stmt->bind_param(...$bindParams);
  
          if (!$stmt->execute()) {
              throw new Exception('Failed to execute query: ' . $stmt->error);
          }
  
          $insertId = $stmt->insert_id;
          
          // Return success response
          http_response_code(201); // Created
          echo json_encode([
              'status' => 'success',
              'message' => 'Record created successfully',
              'id' => $insertId
          ]);
  
      } catch (Exception $e) {
          error_log("Error in createRecord: " . $e->getMessage());
          http_response_code(500);
          echo json_encode([
              'error' => 'Database error',
              'message' => $e->getMessage()
          ]);
      }
    }


    private function deleteRecord($table, $deleteID) {
        try {
            // Validate table name
            if (!array_key_exists($table, $this->allowedTables)) {
                throw new Exception('Invalid table name');
            }
    
            // Check if record exists before deleting
            $checkQuery = "SELECT ID FROM `$table` WHERE ID = ?";
            $checkStmt = $this->dsn->prepare($checkQuery);
            
            if ($checkStmt === false) {
                throw new Exception('Failed to prepare check statement: ' . $this->dsn->error);
            }
            
            $checkStmt->bind_param('i', $deleteID);
            
            if (!$checkStmt->execute()) {
                throw new Exception('Failed to execute check query: ' . $checkStmt->error);
            }
            
            $result = $checkStmt->get_result();
            
            if ($result->num_rows === 0) {
                http_response_code(404);
                echo json_encode([
                    'error' => 'Record not found',
                    'message' => "No record found with ID $deleteID"
                ]);
                return;
            }
    
            // Build delete query
            $query = "DELETE FROM `$table` WHERE ID = ?";
    
            // Prepare and execute statement
            $stmt = $this->dsn->prepare($query);
          
            if ($stmt === false) {
                throw new Exception('Failed to prepare delete statement: ' . $this->dsn->error);
            }
            
            $stmt->bind_param('i', $deleteID);
    
            if (!$stmt->execute()) {
                throw new Exception('Failed to execute delete query: ' . $stmt->error);
            }
    
            // Check if any rows were affected
            if ($stmt->affected_rows === 0) {
                http_response_code(400);
                echo json_encode([
                    'error' => 'Delete failed',
                    'message' => 'No records were deleted'
                ]);
                return;
            }
    
            // Return success response
            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'message' => 'Record deleted successfully',
                'id' => $deleteID
            ]);
    
        } catch (Exception $e) {
            error_log("Error in deleteRecord: " . $e->getMessage());
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