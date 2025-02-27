<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set CORS and content headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Debug logging
$requestDebug = [
    'GET' => $_GET,
    'POST' => $_POST,
    'PUT' => json_decode(file_get_contents('php://input'), true),
    'DELETE' => $_GET,
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
    
    // Table configuration
    private $allowedTables = [
        'members' => ['ID', 'membersID', 'Name', 'CName', 'Designation of Applicant', 'Address', 'phone_number', 'email', 'IC', 'oldIC', 'gender', 'componyName', 'Birthday', 'expired date', 'place of birth', 'remarks'],
        'applicants types' => ['ID', 'designation of applicant'],
        'vmembers' => ['ID', 'membersID', 'Name', 'CName', 'designation of applicant', 'Address', 'phone_number', 'email', 'IC', 'oldIC', 'gender', 'componyName', 'Birthday', 'expired date', 'place of birth', 'remarks'],
        'donation' => ['ID', 'Name/Company Name', 'donationTypes', 'Bank', 'membership', 'paymentDate', 'official receipt no', 'amount', 'Remarks'],
        'vdonation' => ['ID', 'Name/Company Name', 'donationTypes', 'Bank', 'membership', 'paymentDate', 'official receipt no', 'amount', 'Remarks'],
        'stock' => ['ID', 'Product ID', 'Name', 'stock', 'Price', 'Publisher', 'Remarks', 'Picture'],
        'soldrecord' => ['ID', 'Book', 'membership', 'Name/Company Name', 'quantity_in', 'quantity_out', 'InvoiceNo', 'Date', 'price', 'Remarks'],
        'vsoldrecord' => ['ID', 'Name', 'CName', 'Name/Company Name', 'quantity_in', 'quantity_out', 'InvoiceNo', 'Date', 'price', 'Remarks'],
        'event' => ['ID', 'title', 'status', 'start_time', 'end_time', 'created_at', 'location', 'description', 'max_participant', 'registration_deadline', 'price', 'online_link'],
        'participants' => ['ID', 'eventID', 'memberID', 'joined_at'],
        'vparticipants' => ['ID', 'memberID', 'Name', 'CName', 'phone_number', 'email', 'IC', 'title', 'joined_at'],
    ];
    
    // Table mappings
    private $tableToView = [
        'members' => 'vmembers',
        'donation' => 'vdonation',
        'soldrecord' => 'vsoldrecord',
        'participants' => 'vparticipants'
    ];
    
    // Special conditions that need processing through the original tables
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
        ],
        'soldrecord' => [
            'Date' => [
                'conditions'=>['Date = MONTH(CURDATE()) '],
            ],
            'Book' => [
                'conditions' => ['Book = ?'],
                'params' => ['Book'],
                'type' => 'i'
            ],
        ],
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
            $this->handleSearchRequest($table, $params);
        } else {
            $this->getAllRecords($table, $params);
        }
    }
    
    /**
     * Handle search requests with special conditions and normal filters
     */
    private function handleSearchRequest($table, $params) {
        $searchTerm = $params['search'] === 'true' ? '' : $params['search'];
        
        // Simple ID search
        if ($params['search'] === 'true' && isset($params['ID'])) {
            $queryTable = $this->getViewTable($table);
            $baseQuery = "SELECT * FROM `$queryTable` WHERE ID = ?";
            $countQuery = "SELECT COUNT(*) as total FROM `$queryTable` WHERE ID = ?";
            $this->executeQuery($table, $baseQuery, $countQuery, [$params['ID']], 'i');
            return;
        }
        
        // Extract search parameters
        $knownParams = ['table', 'search', 'page', 'limit', 'sort', 'order'];
        $specificParams = array_diff_key($params, array_flip($knownParams));
        
        if (!empty($specificParams)) {
            $this->handleParameterizedSearch($table, $specificParams);
        } else if (!empty($searchTerm)) {
            $this->handleGeneralSearch($table, $searchTerm);
        } else {
            $this->getAllRecords($table, $params);
        }
    }
    
    /**
     * Handle search with specific parameters including special conditions
     */
    private function handleParameterizedSearch($table, $specificParams) {
        $allowedColumns = $this->allowedTables[$table];
        
        // Separate special and normal parameters
        $specialParams = array_intersect_key($specificParams, $this->specialConditions[$table] ?? []);
        $normalParams = array_diff_key($specificParams, $specialParams);
        
        // Filter normal params to only include allowed columns
        $searchColumns = array_intersect_key($normalParams, array_flip($allowedColumns));
        
        $queryTable = $this->getViewTable($table);
        $originalTable = $table;
        
        $idParams = [];
        $idTypes = '';
        
        // Process special conditions
        if (!empty($specialParams)) {
            $specialIds = $this->getIdsFromSpecialConditions($originalTable, $specialParams);
            
            if (empty($specialIds)) {
                // No matches found, return empty result
                $this->sendEmptyResponse();
                return;
            }
            
            $idParams = $specialIds;
            $idTypes = str_repeat('i', count($specialIds));
        }
        
        // Construct base and count queries
        list($baseQuery, $countQuery, $normalParamsValues, $normalTypes) = 
            $this->buildSearchQueries($queryTable, $searchColumns);
        
        // Add condition for IDs from special parameters
        if (!empty($idParams)) {
            $placeholders = implode(',', array_fill(0, count($idParams), '?'));
            $baseQuery .= " AND ID IN ($placeholders)";
            $countQuery .= " AND ID IN ($placeholders)";
        }
        
        // Combine all parameters and types
        $allParams = array_merge($idParams, $normalParamsValues);
        $allTypes = $idTypes . $normalTypes;
        
        // Execute the query
        $this->executeQuery($table, $baseQuery, $countQuery, $allParams, $allTypes);
    }
    
    /**
     * Handle general search across all columns
     */
    private function handleGeneralSearch($table, $searchTerm) {
        $queryTable = $this->getViewTable($table);
        $conditions = $this->buildSearchConditions($table, $searchTerm);
        
        $baseQuery = "SELECT * FROM `$queryTable` WHERE " . $conditions['sql'];
        $countQuery = "SELECT COUNT(*) as total FROM `$queryTable` WHERE " . $conditions['sql'];
        
        $this->executeQuery($table, $baseQuery, $countQuery, $conditions['params'], $conditions['types']);
    }
    
    /**
     * Get IDs matching special conditions from original table
     */
    private function getIdsFromSpecialConditions($table, $specialParams) {
        $conditions = [];
        $specialParamsValues = [];
        $specialTypes = '';
        
        foreach ($specialParams as $key => $value) {
            if (isset($this->specialConditions[$table][$key])) {
                $condition = $this->specialConditions[$table][$key];
                $conditions[] = $condition['conditions'][0];
                
                if (isset($condition['params'])) {
                    $specialParamsValues[] = $value;
                    $specialTypes .= $condition['type'];
                }
            }
        }
        
        if (empty($conditions)) {
            return [];
        }
        
        $whereClause = implode(' AND ', $conditions);
        $idQuery = "SELECT ID FROM `$table` WHERE $whereClause";
        $stmt = $this->prepareAndExecute($idQuery, $specialParamsValues, $specialTypes);
        $result = $stmt->get_result();
        
        return array_column($result->fetch_all(MYSQLI_ASSOC), 'ID');
    }
    
    /**
     * Build search queries for column-specific searches
     */
    private function buildSearchQueries($queryTable, $searchColumns) {
        $conditions = [];
        $params = [];
        $types = '';
        
        foreach ($searchColumns as $column => $value) {
            if (!empty($value)) {
                $conditions[] = "`$column` = ?";
                $params[] = $value;
                $types .= is_numeric($value) ? 'i' : 's';
            }
        }
        
        $whereClause = empty($conditions) ? "1=1" : implode(' AND ', $conditions);
        $baseQuery = "SELECT * FROM `$queryTable` WHERE $whereClause";
        $countQuery = "SELECT COUNT(*) as total FROM `$queryTable` WHERE $whereClause";
        
        return [$baseQuery, $countQuery, $params, $types];
    }

    /**
     * Get all records with pagination and sorting
     */
    private function getAllRecords($table, $params) {
        $originalTable = $table;
        $queryTable = $this->getViewTable($table);
        
        $baseQuery = "SELECT * FROM `$queryTable` WHERE 1";
        $countQuery = "SELECT COUNT(*) as total FROM `$queryTable` WHERE 1";

        $queryParams = [];
        $queryTypes = '';

        // Apply special conditions if they exist for this table
        if(array_key_exists($originalTable, $this->specialConditions)) {
            list($baseQuery, $countQuery, $queryParams, $queryTypes) = 
                $this->applySpecialConditions($originalTable, $baseQuery, $countQuery, $params);
        }

        $this->executeQuery($originalTable, $baseQuery, $countQuery, $queryParams, $queryTypes);
    }
    
    /**
     * Apply special conditions to queries
     */
    private function applySpecialConditions($table, $baseQuery, $countQuery, $params) {
        $queryParams = [];
        $queryTypes = '';
        
        foreach ($this->specialConditions[$table] as $conditionKey => $condition) {
            if (isset($params[$conditionKey])) {
                $baseQuery .= " AND " . $condition['conditions'][0];
                $countQuery .= " AND " . $condition['conditions'][0];

                if (isset($condition['params'])) {
                    foreach ($condition['params'] as $param) {
                        if (isset($params[$param])) {
                            $queryParams[] = $params[$param];
                            $queryTypes .= $condition['type'];
                        }
                    }
                }
            }
        }
        
        return [$baseQuery, $countQuery, $queryParams, $queryTypes];
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
                'total' => $totalRecords,
                'pagination' => $this->getPaginationInfo($page, $limit, $totalRecords),
                'sorting' => ['column' => $sortColumn, 'order' => $sortOrder]
            ]);
        } catch (Exception $e) {
            $this->sendError($e->getMessage());
        }
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

    private function buildSearchConditions($table, $searchTerm) {
        $conditions = [];
        $params = [];
        $types = '';
        
        if (empty($searchTerm)) {
            return [
                'sql' => '1=1',
                'params' => [],
                'types' => ''
            ];
        }

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
    
    private function sendEmptyResponse() {
        $this->sendResponse([
            'data' => [],
            'total' => 0,
            'pagination' => $this->getPaginationInfo(1, 10, 0),
            'sorting' => ['column' => 'ID', 'order' => 'ASC']
        ]);
    }

    private function handleTestEndpoint() {
        $this->sendResponse([
            'status' => 'API is running',
            'received_params' => $_GET,
            'tables_available' => array_keys($this->allowedTables)
        ]);
    }

    private function getViewTable($table) {
        return $this->tableToView[$table] ?? $table;
    }
}

// Create API instance and handle request
$api = new DatabaseAPI($dsn);
$api->handleRequest();