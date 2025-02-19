<?php
// Enable error reporting for debugging
//make it report all errors no matters how small is it
error_reporting(E_ALL);
//display errors become
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
        'applicants types' => ['ID', 'designation of applicant'],
        'vmembers' => ['ID', 'membersID', 'Name', 'CName', 'designation of applicant', 'Address', 'phone_number', 'email', 'IC', 'oldIC', 'gender', 'componyName', 'Birthday', 'expired date', 'place of birth', 'remarks'],
        'donation' => ['ID', 'Name/Company Name', 'donationTypes', 'Bank', 'membership', 'paymentDate', 'official receipt no', 'amount', 'Remarks'],
        'vdonation' => ['ID', 'Name/Company Name', 'donationTypes', 'Bank', 'membership', 'paymentDate', 'official receipt no', 'amount', 'Remarks']
    ];
    private $specialConditions = [
        'members' => [
            'Birthday' =>[
                'conditions'=>['Birthday = MONTH(CURDATE()) '],
            ], 
            'expired' => [
                'conditions'=>['(YEAR(`expired date`) < YEAR(CURDATE())) OR (YEAR(`expired date`) = YEAR(CURDATE()) AND MONTH(`expired date`) <= MONTH(CURDATE())) '],
            ],
            'applicant' => [
                'conditions'=>['`designation of applicant` = ? '],
                'params' => ['applicant'],
                'type' => 'i'
            ],
        ]
    ];

    // Response status constants
    private const HTTP_OK = 200;
    private const HTTP_CREATED = 201;
    private const HTTP_BAD_REQUEST = 400;
    private const HTTP_NOT_FOUND = 404;
    private const HTTP_METHOD_NOT_ALLOWED = 405;
    private const HTTP_SERVER_ERROR = 500;

    public function __construct($dsn) {
        $this->dsn = $dsn;
        $this->validateDatabaseConnection();
    }

    /**
     * Main request handler
     */
    public function handleRequest() {
        try {
            if (isset($_GET['test'])) {
                $this->handleTestEndpoint();
                return;
            }

            $method = $_SERVER['REQUEST_METHOD'];
            $table = $_GET['table'] ?? '';
            
            if (!$this->isValidTable($table)) {
                $this->sendError('Table not found', self::HTTP_NOT_FOUND, ['available_tables' => array_keys($this->allowedTables)]);
                return;
            }

            $this->processRequest($method, $table);
        } catch (Exception $e) {
            $this->sendError($e->getMessage());
        }
    }

    /**
     * Process the incoming request based on HTTP method
     */
    private function processRequest($method, $table) {
        $params = $_GET;

        switch($method) {
            case 'GET':
                $this->handleGetRequest($table, $params);
                break;
            case 'POST':
                $this->handlePostRequest($table);
                break;
            case 'PUT':
                $this->handlePutRequest($table);
                break;
            case 'DELETE':
                $this->handleDeleteRequest($table);
                break;
            default:
                $this->sendError('Method not allowed', self::HTTP_METHOD_NOT_ALLOWED);
                break;
        }
    }

    /**
     * Handle different types of GET requests
     */
    private function handleGetRequest($table, $params) {
        if (isset($params['search'])) {
            $this->searchRecords($table, $params);
        } else {
            $this->getAllRecords($table, $params);
        }
    }

    /**
     * Generic query executor with pagination and sorting
     */
    private function executeQuery($table, $baseQuery, $countQuery, $params = [], $types = '') {
        try {
            // Get total count
            $countStmt = $this->prepareAndExecute($countQuery, $params, $types);
            $totalRecords = $countStmt->get_result()->fetch_assoc()['total'];

            // Handle pagination and sorting
            $page = max(1, intval($_GET['page'] ?? 1));
            $limit = max(1, min(100, intval($_GET['limit'] ?? 10)));
            $offset = ($page - 1) * $limit;
            
            $sortColumn = $this->getSortColumn($_GET['sort'] ?? 'ID');
            $sortOrder = $this->validateSortOrder($_GET['order'] ?? 'ASC');

            // Execute main query
            $fullQuery = $baseQuery . " ORDER BY $sortColumn $sortOrder LIMIT ? OFFSET ?";
            $params[] = $limit;
            $params[] = $offset;
            $types .= 'ii';

            $stmt = $this->prepareAndExecute($fullQuery, $params, $types);
            $data = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

            $this->sendResponse([
                'data' => $data,
                'pagination' => $this->getPaginationInfo($page, $limit, $totalRecords),
                'sorting' => ['column' => $sortColumn, 'order' => $sortOrder]
            ]);
        } catch (Exception $e) {
            $this->sendError($e->getMessage());
        }
    }

    /**
     * Search records with pagination and sorting
     */
    private function searchRecords($table, $params) {
        $searchTerm = $params['search'] ?? '';
        $conditions = $this->buildSearchConditions($table, $searchTerm);
        
        $table = $table === 'vmembers' ? 'members' : $table;
        $baseQuery = "SELECT * FROM `$table` WHERE " . $conditions['sql'];
        $countQuery = "SELECT COUNT(*) as total FROM `$table` WHERE " . $conditions['sql'];
        
        $this->executeQuery($table, $baseQuery, $countQuery, $conditions['params'], $conditions['types']);
    }

    /**
     * Get all records with pagination and sorting
     */
    private function getAllRecords($table, $params) {
        
        $table1 = $table;
        $queryParams = [];
        $queryTypes = '';

        if($table === 'members') {
            $table1 = 'members';
            $table = 'vmembers';
        }
        IF($table === 'donation') {
            $table1 = 'donation';
            $table = 'vdonation';
        }

        $baseQuery = "SELECT * FROM `$table` WHERE 1";
        $countQuery = "SELECT COUNT(*) as total FROM `$table` WHERE 1";

        if(array_key_exists($table1, $this->specialConditions)) {
            foreach ($this->specialConditions[$table1] as $conditionKey => $condition) {
                if (isset($params[$conditionKey])) {
                    $baseQuery = $baseQuery . " AND " . $this->specialConditions[$table1][$conditionKey]['conditions'][0];
                    $countQuery = $countQuery . " AND " . $this->specialConditions[$table1][$conditionKey]['conditions'][0];

                    if (isset($condition['params'])) {
                        foreach ($condition['params'] as $param) {
                            $queryParams[] = $params[$param];
                            $queryTypes .= $condition['type'];
                        }
                    }
                }
            }
        }
        

        $this->executeQuery($table1, $baseQuery, $countQuery, $queryParams, $queryTypes);
    }

    /**
     * Create a new record
     */
    private function handlePostRequest($table) {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            if ($data === null) {
                $this->sendError('Invalid JSON data', self::HTTP_BAD_REQUEST);
                return;
            }

            $filteredData = $this->filterAllowedFields($table, $data);
            $insertId = $this->insertRecord($table, $filteredData);
            
            $this->sendResponse([
                'status' => 'success',
                'message' => 'Record created successfully',
                'id' => $insertId,
            ], self::HTTP_CREATED);
        } catch (Exception $e) {
            $this->sendError($e->getMessage());
        }
    }

    /**
     * Update an existing record
     */
    private function handlePutRequest($table) {
        try {
            $id = $_GET["ID"] ?? null;
            if ($id === null){
                $this->sendError('Missing ID parameter', self::HTTP_BAD_REQUEST);
                return;
            }

            if(!$this->recordExists($table, $id)) {
                $this->sendError("Record not found with ID $id", self::HTTP_NOT_FOUND);
                return;
            }

            $data = json_decode(file_get_contents('php://input'), true);
            if($data === null) {
                $this->sendError('Invalid JSON data', self::HTTP_BAD_REQUEST);
                return;
            }

            $filteredData = $this->filterAllowedFields($table, $data);
            $this->updateRecord($table, $id, $filteredData);

            $this->sendResponse([
                'status' => 'success',
                'message' => 'Record updated successfully',
                'id' => $id
            ]);
        } catch (Exception $e) {
            $this->sendError($e->getMessage());
        }
    }

    /**
     * Delete a record
     */
    private function handleDeleteRequest($table) {
        try {
            $id = $_GET['ID'] ?? null;
            if ($id === null) {
                $this->sendError('Missing ID parameter', self::HTTP_BAD_REQUEST);
                return;
            }

            if (!$this->recordExists($table, $id)) {
                $this->sendError("Record not found with ID $id", self::HTTP_NOT_FOUND);
                return;
            }

            $this->deleteRecord($table, $id);
            
            $this->sendResponse([
                'status' => 'success',
                'message' => 'Record deleted successfully',
                'id' => $id
            ]);
        } catch (Exception $e) {
            $this->sendError($e->getMessage());
        }
    }

    /**
     * Utility methods
     */
    private function validateDatabaseConnection() {
        try {
            $this->dsn->query("SELECT 1");
        } catch (Exception $e) {
            $this->sendError('Database connection failed', self::HTTP_SERVER_ERROR);
            exit;
        }
    }

    private function isValidTable($table) {
        return array_key_exists($table, $this->allowedTables);
    }

    private function prepareAndExecute($query, $params = [], $types = '') {
        $stmt = $this->dsn->prepare($query);
        if ($stmt === false) {
            throw new Exception('Failed to prepare statement: ' . $this->dsn->error);
        }
        
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        
        if (!$stmt->execute()) {
            throw new Exception('Failed to execute query: ' . $stmt->error);
        }
        
        return $stmt;
    }

    private function getSortColumn($column) {
        return $column === 'membersID' 
            ? "CAST(REPLACE(membersID, '-', '') AS UNSIGNED)" 
            : "`$column`";
    }

    private function validateSortOrder($order) {
        return in_array(strtoupper($order), ['ASC', 'DESC']) ? strtoupper($order) : 'ASC';
    }

    private function getPaginationInfo($page, $limit, $totalRecords) {
        return [
            'page' => $page,
            'limit' => $limit,
            'total_records' => $totalRecords,
            'total_pages' => ceil($totalRecords / $limit)
        ];
    }

    private function filterAllowedFields($table, $data) {
        $filtered = array_intersect_key($data, array_flip($this->allowedTables[$table]));
        if (empty($filtered)) {
            throw new Exception('No valid fields provided');
        }
        return $filtered;
    }

    private function generateNewMemberId() {
        $query = "SELECT `membersID` FROM `members` ORDER BY `ID` DESC LIMIT 1";
        $result = $this->prepareAndExecute($query)->get_result();
        
        if ($result->num_rows > 0) {
            $parts = explode('-', $result->fetch_assoc()['membersID']);
            $newNumber = intval($parts[1]) + 1;
        } else {
            $newNumber = 1;
        }
        
        return date('Y') . '-' . str_pad($newNumber, 6, '0', STR_PAD_LEFT);
    }

    private function buildSearchConditions($table, $searchTerm) {
        $conditions = [];
        $params = [];
        $types = '';
        
        foreach ($this->allowedTables[$table] as $column) {
            $conditions[] = "`$column` LIKE ?";
            $params[] = "%$searchTerm%";
            $types .= 's';
        }
        
        return [
            'sql' => implode(' OR ', $conditions),
            'params' => $params,
            'types' => $types
        ];
    }

    private function recordExists($table, $id) {
        $stmt = $this->prepareAndExecute(
            "SELECT ID FROM `$table` WHERE ID = ?",
            [$id],
            'i'
        );
        return $stmt->get_result()->num_rows > 0;
    }

    private function insertRecord($table, $data) {
        $columns = array_keys($data);
        $values = array_values($data);
        $placeholders = str_repeat('?,', count($values) - 1) . '?';
        
        $query = "INSERT INTO `$table` (`" . implode('`, `', $columns) . "`) VALUES ($placeholders)";
        
        $types = '';
        foreach ($values as $value) {
            $types .= is_int($value) ? 'i' : (is_float($value) ? 'd' : 's');
        }
        
        $stmt = $this->prepareAndExecute($query, $values, $types);
        return $stmt->insert_id;
    }

    private function updateRecord($table, $id, $data) {
        $updates = [];
        $values = [];
        $types = '';

        foreach ($data as $column => $value) {
            $updates[] = "`$column` = ?";
            $values[] = $value;
            $types .= is_int($value) ? 'i' : (is_float($value) ? 'd' : 's');
        }

        $query = "UPDATE `$table` SET " . implode(', ', $updates) . " WHERE ID = ?";
        $values[] = $id;
        $types .= 'i';

        $this->prepareAndExecute($query, $values, $types);
    }

    private function deleteRecord($table, $id) {
        $this->prepareAndExecute(
            "DELETE FROM `$table` WHERE ID = ?",
            [$id],
            'i'
        );
    }

    private function sendResponse($data, $statusCode = self::HTTP_OK) {
        http_response_code($statusCode);
        echo json_encode($data);
    }

    private function sendError($message, $statusCode = self::HTTP_SERVER_ERROR, $additional = []) {
        error_log("API Error: $message");
        http_response_code($statusCode);
        echo json_encode(array_merge(
            ['error' => 'Database error', 'message' => $message],
            $additional
        ));
    }

    private function handleTestEndpoint() {
        $this->sendResponse([
            'status' => 'API is running',
            'received_params' => $_GET,
            'tables_available' => array_keys($this->allowedTables)
        ]);
    }
}

// Create API instance and handle request
$api = new DatabaseAPI($dsn);
$api->handleRequest();