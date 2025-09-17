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
        'members' => ['ID', 'membersID', 'Name', 'CName', 'Designation_of_Applicant', 'Address', 'phone_number', 'email', 'IC', 'oldIC', 'gender', 'componyName', 'Birthday', 'expired_date', 'place_of_birth', 'position', 'others', 'remarks', 'payment_date', 'Invoice_number','payment_fee', 'maded_payment'],
        'applicants_types' => ['ID', 'designation_of_applicant'],
        'members_with_applicant_designation' => ['ID', 'membersID', 'Name', 'CName', 'designation_of_applicant', 'Address', 'phone_number', 'email', 'IC', 'oldIC', 'gender', 'componyName', 'Birthday', 'expired_date', 'place_of_birth', 'position', 'others', 'remarks', 'payment_date', 'Invoice_number', 'payment_fee', 'maded_payment'],
        'donation' => ['ID', 'Name/Company_Name', 'donationTypes', 'Bank', 'membership', 'paymentDate', 'official_receipt_no', 'amount', 'Remarks'],
        'donation_details' => ['ID', 'Name/Company_Name', 'donationTypes', 'Bank', 'membership', 'paymentDate', 'official_receipt_no', 'amount', 'Remarks'],
        'stock' => ['ID', 'Product_ID', 'Name', 'stock', 'Price', 'Publisher', 'Remarks', 'Picture'],
        'soldrecord' => ['ID', 'Book', 'membership', 'Name/Company_Name', 'quantity_in', 'quantity_out', 'InvoiceNo', 'Date', 'price', 'Remarks'],
        'vsoldrecord' => ['ID', 'BookID', 'Book', 'memberID', 'membership', 'Name/Company_Name', 'quantity_in', 'quantity_out', 'InvoiceNo', 'Date', 'price', 'Remarks'],
        'event' => ['ID', 'title', 'status', 'start_time', 'end_time', 'created_at', 'location', 'description', 'max_participant', 'registration_deadline', 'price', 'online_link'],
        'participants' => ['ID', 'eventID', 'memberID', 'joined_at'],
        'vparticipants' => ['ID', 'membersID', 'memberId', 'Name', 'CName', 'phone_number', 'email', 'IC', 'eventID', 'joined_at'],
        'bank'=>['ID','Bank'],
        'donationtypes'=>['ID','donationTypes'],
        'member_renewals'=>['id','member_id','renewed_at','previous_end','new_end','term_months','recorded_at','is_first_time'],
    ];

    private $secondarySortColumns = [
        'members' => 'membersID',
        'members_with_applicant_designation' => 'membersID',
        'applicants_types' => 'ID',
        'donation' => 'ID',
        'donation_details' => 'ID',
        'stock' => 'ID',
        'soldrecord' => 'ID',
        'vsoldrecord' => 'BookID',
        'event' => 'ID',
        'vparticipants' => 'membersID',
        'participants' => 'ID',
        'bank' => 'ID',
        'donationtypes' => 'ID',
        'member_renewals' => 'id',
    ];

    // Table mappings
    private $tableToView = [
        
    ];

    // Special conditions that need processing through the original tables
    private $specialConditions = [
        'members' => [
            'Birthday' =>[
                'conditions'=>['Birthday = MONTH(CURDATE()) '], // Corrected Birthday check
            ],
            'expired' => [
                'conditions'=>['(YEAR(`expired_date`) < ?) OR (YEAR(`expired_date`) = ? AND MONTH(`expired_date`) <= ?) '],
                'param' => ['targetYear', 'targetYear', 'targetMonth'],
                'paramTypes' => 'iii'
            ],
        ],
        'members_with_applicant_designation' => [
            'Birthday' =>[
                'conditions'=>['Birthday = ? '],
                'param' => ['targetMonth'],
                'paramTypes' => 'i'

            ],
            'expired' => [
                'conditions'=>['`expired_date` BETWEEN ? AND ?'],
                'param' => ['startDate', 'endDate'],
                'paramTypes' => 'ss'
            ],
            'renewalTerm' => [
                'conditions' => ['ID IN (SELECT DISTINCT member_id FROM member_renewals WHERE term_months = ?)'],
                'param' => ['termMonths'],
                'paramTypes' => 'i'
            ],
            'renewalDateRange' => [
                'conditions' => ['ID IN (SUBQUERY_PLACEHOLDER)'],
                'param' => ['startDate', 'endDate'],
                'paramTypes' => 'ss'
            ],
        ],
        'donation_details' => [
            'dateRange' => [
                // Condition to check if 'paymentDate' is between start and end dates
                'conditions' => ['`paymentDate` BETWEEN ? AND ?'],
                // Parameter names expected in the GET request
                'param' => ['startDate', 'endDate'],
                // Data types for the parameters (both dates are treated as strings)
                'paramTypes' => 'ss'
            ],
            'priceRange' => [
                // Condition to check if 'price' is between start and end prices
                'conditions' => ['`amount` BETWEEN ? AND ?'],
                'param' => ['startPrice','endPrice'],
                'paramTypes' => 'dd'
            ]
        ],
        'event' => [
            'startDateRange' => [
                'conditions' => ['`start_time` BETWEEN ? AND ?'],
                'param' => ['startDate', 'endDate'],
                'paramTypes' => 'ss'
            ],
            'endDateRange' => [
                'conditions' => ['`end_time` BETWEEN ? AND ?'],
                'param' => ['startDate', 'endDate'],
                'paramTypes' =>'ss'
            ],
            'createDateRange' => [
                'conditions' => ['`created_at` BETWEEN ? AND ?'],
                'param' => ['startDate', 'endDate'],
                'paramTypes' => 'ss'
            ],
            'priceRange' => [
                'conditions' => ['`price` BETWEEN ? AND ?'],
                'param' => ['startPrice','endPrice'],
                'paramTypes' => 'dd'
            ]
        ],
        'stock' => [
            'quantityRange' => [
                'conditions' => ['`stock` BETWEEN ? AND ?'],
                'param' => ['startQuantity', 'endQuantity'],
                'paramTypes' => 'ii'
            ],
            'priceRange' => [
                'conditions' => ['`Price` BETWEEN ? AND ?'],
                'param' => ['startPrice', 'endPrice'],
                'paramTypes' => 'dd'
            ]
        ],
        'vsoldrecord' => [
            'dateRange' => [
                'conditions' => ['`Date` BETWEEN ? AND ?'],
                'param' => ['startDate', 'endDate'],
                'paramTypes' => 'ss'
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
            // Log the detailed error server-side
             error_log("API Exception: " . $e->getMessage() . "\n" . $e->getTraceAsString());
            // Send a generic error to the client
            $this->sendError('An internal server error occurred.');
        }
    }

    /**
     * Process the incoming request based on HTTP method
     */
    private function processRequest($method, $table) {
        $params = $_GET;
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
        $isDirect = isset($params['direct']) && $params['direct'] === 'true';

        // Extract search parameters
        $knownParams = ['table', 'search', 'page', 'limit', 'sort', 'order', 'direct'];
        $specificParams = array_diff_key($params, array_flip($knownParams));

        if (!empty($specificParams)) {
            $this->handleParameterizedSearch($table, $specificParams, $params, $isDirect);
        } else if (!empty($searchTerm)) {
            $this->handleGeneralSearch($table, $searchTerm, $isDirect);
        } else {
            // If search=true but no specific params or search term, get all records
            $this->getAllRecords($table, $params);
        }
    }

    /**
     * Handle search with specific parameters including special conditions
     */
    private function handleParameterizedSearch($table, $specificParams, $allGetParams, $isDirect = false) {
        // error_log('Specific Params: ' . print_r($specificParams, true));
        // error_log('All GET Params: ' . print_r($allGetParams, true));

        $allowedColumns = $this->allowedTables[$table];

        $normalizedParams = [];
        foreach ($specificParams as $key => $value) {
            // Keep original key for matching against specialConditions and allowedColumns
            $normalizedParams[$key] = $value;
        }

        // Separate special and normal parameters
        $tableSpecialConditions = $this->specialConditions[$table] ?? [];
        $specialParams = array_intersect_key($normalizedParams, $tableSpecialConditions);
        $normalParams = array_diff_key($normalizedParams, $specialParams);

        // Filter normal params to only include allowed columns *and* remove params used by special conditions
        $normalParams = array_diff_key($normalParams, array_flip($this->getSpecialConditionParamNames($tableSpecialConditions)));
        $searchColumns = array_intersect_key($normalParams, array_flip($allowedColumns));

        $queryTable = $this->getViewTable($table);
        $originalTable = $table; // Use original table name for special condition lookup

        $idParams = [];
        $idTypes = '';

        // Process special conditions if any exist for this table and are present in the request
        if (!empty($specialParams) && isset($this->specialConditions[$originalTable])) {
            try {
                 // Pass only the relevant special conditions found in the request
                $activeSpecialParams = array_intersect_key($this->specialConditions[$originalTable], $specialParams);
                $specialIds = $this->getIdsFromSpecialConditions($originalTable, $activeSpecialParams, $allGetParams);

                if (empty($specialIds) && !empty($activeSpecialParams)) {
                    // If special conditions were requested but returned no IDs, the result set is empty
                    $this->sendEmptyResponse();
                    return;
                }

                if (!empty($specialIds)) {
                    $idParams = $specialIds;
                    $idTypes = str_repeat('i', count($specialIds));
                }
                // If special conditions exist but weren't requested, or returned IDs, continue processing normal params

            } catch (Exception $e) {
                $this->sendError($e->getMessage(), self::HTTP_BAD_REQUEST);
                return;
            }
        }

        // Construct base and count queries for normal parameters
        list($baseQuery, $countQuery, $normalParamsValues, $normalTypes) =
            $this->buildSearchQueries($queryTable, $searchColumns, $isDirect); // Pass $isDirect parameter

        // Add condition for IDs from special parameters if they exist
        if (!empty($idParams)) {
            $placeholders = implode(',', array_fill(0, count($idParams), '?'));
            if (strpos($baseQuery, 'WHERE') === false) {
                $baseQuery .= " WHERE ID IN ($placeholders)";
                $countQuery .= " WHERE ID IN ($placeholders)";
            } else {
                 $baseQuery .= " AND ID IN ($placeholders)";
                 $countQuery .= " AND ID IN ($placeholders)";
            }
        } elseif (empty($searchColumns) && empty($idParams) && !empty($specialParams)) {
             // Case: Only special conditions were applied (which returned results), but no normal conditions
             // The base query might still be just "SELECT * FROM table WHERE 1"
             // No change needed here, the special IDs logic above handles filtering.
        } elseif (empty($searchColumns) && empty($idParams) && empty($specialParams)) {
            // Case: search=true but no valid search criteria found (e.g., ?search=true&invalidParam=xyz)
            // Fallback to getting all records for the table
             $this->getAllRecords($table, $allGetParams);
             return;
        }


        // Combine all parameters and types
        $allParams = array_merge($normalParamsValues, $idParams);
        $allTypes = $normalTypes . $idTypes;

        // Execute the query
        $this->executeQuery($table, $baseQuery, $countQuery, $allParams, $allTypes);
    }

    /**
     * Helper to get all parameter names used by special conditions for a table
     */
    private function getSpecialConditionParamNames($tableSpecialConditions) {
        $paramNames = [];
        foreach ($tableSpecialConditions as $condition) {
            if (isset($condition['param'])) {
                $paramNames = array_merge($paramNames, $condition['param']);
            }
        }
        return array_unique($paramNames);
    }

    /**
     * Handle general search across all allowed columns
     */
    private function handleGeneralSearch($table, $searchTerm, $isDirect = false) {
        $queryTable = $this->getViewTable($table);
        $conditions = $this->buildSearchConditions($queryTable, $searchTerm, $isDirect); // Pass $isDirect parameter

        if ($conditions['sql'] === '1=1') {
             // Avoid "WHERE 1=1" if no searchable columns found
             $baseQuery = "SELECT * FROM `$queryTable`";
             $countQuery = "SELECT COUNT(*) as total FROM `$queryTable`";
        } else {
            $baseQuery = "SELECT * FROM `$queryTable` WHERE " . $conditions['sql'];
            $countQuery = "SELECT COUNT(*) as total FROM `$queryTable` WHERE " . $conditions['sql'];
        }


        $this->executeQuery($table, $baseQuery, $countQuery, $conditions['params'], $conditions['types']);
    }

    /**
     * Get IDs matching special conditions from original table
     */
     private function getIdsFromSpecialConditions($table, $activeSpecialConditions, $allGetParams) {
        $conditions = [];
        $specialConditionParamsValues = [];
        $specialConditionTypes = '';

        // Process only the active special conditions passed in $activeSpecialConditions
        foreach ($activeSpecialConditions as $key => $condition) {
            $conditionSql = $condition['conditions'][0];

            if ($key === 'renewalDateRange') {
                $renewalType = $allGetParams['renewalType'] ?? 'all';
                $baseSubquery = "FROM member_renewals WHERE renewed_at BETWEEN ? AND ?";
                $subquery = "";

                switch ($renewalType) {
                    case 'both':
                        // Members who have at least one of each type (is_first_time = 1 and 0)
                        $subquery = "SELECT member_id $baseSubquery GROUP BY member_id HAVING COUNT(DISTINCT is_first_time) = 2";
                        break;
                    case 'first_only':
                        // Members where all records in range are is_first_time = 1
                        $subquery = "SELECT member_id $baseSubquery GROUP BY member_id HAVING MIN(is_first_time) = 1";
                        break;
                    case 'subsequent_only':
                        // Members where all records in range are is_first_time = 0
                        $subquery = "SELECT member_id $baseSubquery GROUP BY member_id HAVING MAX(is_first_time) = 0";
                        break;
                    case 'all':
                    default:
                        $subquery = "SELECT DISTINCT member_id $baseSubquery";
                        break;
                }
                $conditionSql = str_replace('SUBQUERY_PLACEHOLDER', $subquery, $conditionSql);
            }

            $conditions[] = $conditionSql;

            if (isset($condition['param'])) {
                foreach ($condition['param'] as $paramName) {
                    if (!isset($allGetParams[$paramName])) {
                        throw new Exception("Missing required parameter '{$paramName}' for condition '{$key}'.");
                    }
                    $specialConditionParamsValues[] = $allGetParams[$paramName];
                }
                $specialConditionTypes .= $condition['paramTypes'];
            }
        }


        if (empty($conditions)) {
            return [];
        }

        $whereClause = implode(' AND ', $conditions);
        $idQuery = "SELECT ID FROM `$table` WHERE $whereClause";

        error_log("Special Condition ID Query: $idQuery");
        error_log("Special Condition Params: " . print_r($specialConditionParamsValues, true));
        error_log("Special Condition Types: $specialConditionTypes");

        try {
            $stmt = $this->prepareAndExecute($idQuery, $specialConditionParamsValues, $specialConditionTypes);
            $result = $stmt->get_result();

            if (!$result) {
                 error_log("MySQL Error in getIdsFromSpecialConditions: " . $this->dsn->error);
                throw new Exception("Failed to get result for special condition query.");
            }

            $ids = array_column($result->fetch_all(MYSQLI_ASSOC), 'ID');
            $stmt->close();
            return $ids;

        } catch (Exception $e) {
            error_log("Exception during special condition query execution: " . $e->getMessage());
            throw new Exception("Error processing special conditions: " . $e->getMessage());
        }
    }


    /**
     * Build search queries for column-specific searches
     */
    private function buildSearchQueries($queryTable, $searchColumns, $isDirect = false) {
        $conditions = [];
        $params = [];
        $types = '';

        // Use allowed columns for the *original* table definition to build the query
        // but execute against the $queryTable (which might be a view)
        // $allowedColumns = $this->allowedTables[$originalTable]; // Not needed directly here

        foreach ($searchColumns as $column => $value) {
             // No need to normalize column names if they come directly from $allowedTables keys
            if ($value !== '' && $value !== null) { // Check for non-empty value
                // Check if the column actually exists in the target query table (view or base table)
                 if ($this->columnExistsInTable($queryTable, $column)) {
                    if ($isDirect) {
                        $conditions[] = "`$column` = ?"; // Use exact matching
                        $params[] = $value; // No wildcards for exact matching
                    } else {
                        $conditions[] = "`$column` LIKE ?"; // Use LIKE for broader matching
                        $params[] = "%" . $value . "%"; // Add wildcards
                    }
                    // Determine type based on original value - simplistic check
                    $types .= is_numeric($value) && !is_string($value) ? 'd' : 's'; // Use 'd' for numbers, 's' for others/strings
                 } else {
                     // Log a warning if a requested search column doesn't exist in the query target
                     error_log("Warning: Search column '$column' not found in query target '$queryTable'.");
                 }
            }
        }


        $whereClause = empty($conditions) ? "1=1" : implode(' AND ', $conditions);
        // Ensure WHERE clause is added only if there are conditions
        $baseQuery = "SELECT * FROM `$queryTable`" . (empty($conditions) ? "" : " WHERE $whereClause");
        $countQuery = "SELECT COUNT(*) as total FROM `$queryTable`" . (empty($conditions) ? "" : " WHERE $whereClause");


        return [$baseQuery, $countQuery, $params, $types];
    }

    /**
    * Check if a column exists in a given table or view.
    * Caches results for efficiency within a single request.
    */
    private $tableColumnCache = [];
    private function columnExistsInTable($tableName, $columnName) {
        if (!isset($this->tableColumnCache[$tableName])) {
            try {
                $query = "SHOW COLUMNS FROM `$tableName`";
                $result = $this->dsn->query($query);
                if (!$result) {
                    error_log("Failed to get columns for table '$tableName': " . $this->dsn->error);
                    $this->tableColumnCache[$tableName] = []; // Cache empty on error
                    return false;
                }
                $columns = [];
                while ($row = $result->fetch_assoc()) {
                    $columns[$row['Field']] = true;
                }
                $this->tableColumnCache[$tableName] = $columns;
                $result->free();
            } catch (Exception $e) {
                 error_log("Exception getting columns for table '$tableName': " . $e->getMessage());
                 $this->tableColumnCache[$tableName] = []; // Cache empty on exception
                 return false;
            }
        }
        return isset($this->tableColumnCache[$tableName][$columnName]);
    }


    /**
     * Get all records with pagination and sorting
     */
    private function getAllRecords($table, $params) {
        $queryTable = $this->getViewTable($table);

        $baseQuery = "SELECT * FROM `$queryTable`"; // No WHERE 1 needed initially
        $countQuery = "SELECT COUNT(*) as total FROM `$queryTable`";

        // Note: Special conditions are generally handled by handleParameterizedSearch.
        // If you need special conditions to apply even when just getting all records
        // (e.g., always filter expired members unless explicitly requested otherwise),
        // that logic would need to be added here, similar to handleParameterizedSearch.
        // For now, getAllRecords fetches everything from the $queryTable.

        $this->executeQuery($table, $baseQuery, $countQuery); // No initial params/types needed
    }

    /**
     * Apply special conditions to queries - (Currently not used by getAllRecords)
     * Kept for potential future use if needed.
     */
    private function applySpecialConditions($table, $baseQuery, $countQuery, $params) {
        $queryParams = [];
        $queryTypes = '';
        $conditionsAdded = false;

        // Check if any special condition keys for this table exist in the $params
        if (isset($this->specialConditions[$table])) {
            foreach ($this->specialConditions[$table] as $conditionKey => $condition) {
                // Check if the *key* of the special condition (e.g., 'expired', 'dateRange')
                // is present in the $params array passed to this function.
                if (isset($params[$conditionKey])) {
                     if (!$conditionsAdded) {
                         // Add WHERE clause only once
                         $baseQuery .= " WHERE ";
                         $countQuery .= " WHERE ";
                         $conditionsAdded = true;
                     } else {
                         // Add AND for subsequent conditions
                         $baseQuery .= " AND ";
                         $countQuery .= " AND ";
                     }

                    $baseQuery .= $condition['conditions'][0]; // Append the condition SQL
                    $countQuery .= $condition['conditions'][0];

                    if (isset($condition['param'])) {
                        foreach ($condition['param'] as $paramName) {
                            if (isset($params[$paramName])) {
                                $queryParams[] = $params[$paramName];
                            } else {
                                // This indicates an issue - the condition key was present, but required params were not.
                                throw new Exception("Missing parameter '{$paramName}' required by condition '{$conditionKey}' during application.");
                            }
                        }
                         if (isset($condition['paramTypes'])) { // Ensure paramTypes exists
                            $queryTypes .= $condition['paramTypes'];
                         } else {
                             // Fallback or error if paramTypes is missing but params exist
                             throw new Exception("Missing 'paramTypes' for condition '{$conditionKey}' which requires parameters.");
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
        $stmt = null; // Initialize statement variable
        $countStmt = null;
        try {
            // Get total count first, applying the same filters
            $countStmt = $this->prepareAndExecute($countQuery, $params, $types);
            $countResult = $countStmt->get_result();
            if (!$countResult) throw new Exception("Failed to get result for count query: " . $this->dsn->error);
            $totalRecords = $countResult->fetch_assoc()['total'];
            $countStmt->close(); // Close count statement immediately

            // Handle pagination and sorting
            $page = max(1, intval($_GET['page'] ?? 1));
            $limit = max(1, min(50000, intval($_GET['limit'] ?? 10))); // Limit page size
            $offset = ($page - 1) * $limit;

            // --- 1. Handle Primary Sort ---
            $primarySortColumnInput = $_GET['sort'] ?? 'ID';
            $primarySortColumn = 'ID'; // Default primary sort column
            $primarySortExpression = '`ID`'; // Default sort expression

            if (in_array($primarySortColumnInput, $this->allowedTables[$table])) {
                $primarySortColumn = $primarySortColumnInput;
                // Handle the special 'membersID' case
                $primarySortExpression = $primarySortColumn === 'membersID'
                    ? $this->numericMembersIdExpr()
                    : "`" . $primarySortColumn . "`";
            } else {
                error_log("Warning: Invalid sort column requested: '$primarySortColumnInput'. Defaulting to ID.");
            }
            
            $sortOrder = $this->validateSortOrder($_GET['order'] ?? 'ASC');

            // --- 2. Determine the secondary sort column (tie-breaker) ---
            // Get the secondary sort column for this table from our configuration
            $secondarySortColumnName = $this->secondarySortColumns[$table] ?? $this->secondarySortColumns['default'];
            $secondarySortExpression = '`' . $secondarySortColumnName . '`'; // The secondary sort order is always ASC

            // If the secondary sort column is 'membersID', use the special handling function as well
            if ($secondarySortColumnName === 'membersID') {
                $secondarySortExpression = $this->numericMembersIdExpr($secondarySortColumnName);
            }

            // --- 3. Build the complete ORDER BY clause ---
            $orderByClause = "ORDER BY $primarySortExpression $sortOrder";
            
            // Avoid redundant sorting, e.g., if the primary sort column is the same as the secondary one
            if ($primarySortColumn !== $secondarySortColumnName) {
                // Append the secondary sort rule, separated by a comma
                $orderByClause .= ", $secondarySortExpression ASC"; 
            }

            // Append ORDER BY, LIMIT, OFFSET to the base query
            $fullQuery = $baseQuery . " " . $orderByClause . " LIMIT ? OFFSET ?";

            // Add limit and offset parameters and types
            $finalParams = $params; // Copy original params
            $finalParams[] = $limit;
            $finalParams[] = $offset;
            $finalTypes = $types . 'ii'; // Add types for limit and offset

            // Execute main query
            $stmt = $this->prepareAndExecute($fullQuery, $finalParams, $finalTypes);
            $dataResult = $stmt->get_result();
             if (!$dataResult) throw new Exception("Failed to get result for main query: " . $this->dsn->error);
            $data = $dataResult->fetch_all(MYSQLI_ASSOC);
            $stmt->close(); // Close main statement

            $this->sendResponse([
                'data' => $data,
                'total' => $totalRecords,
                'pagination' => $this->getPaginationInfo($page, $limit, $totalRecords),
                'sorting' => ['column' => $primarySortColumnInput, 'order' => $sortOrder] // Report original requested column
            ]);
        } catch (Exception $e) {
             // Ensure statements are closed even on error
             if ($stmt !== null && $stmt instanceof mysqli_stmt) $stmt->close();
             if ($countStmt !== null && $countStmt instanceof mysqli_stmt) $countStmt->close();
             error_log("Error during executeQuery: " . $e->getMessage() . "\nQuery: " . ($fullQuery ?? $countQuery) . "\nParams: " . print_r($finalParams ?? $params, true));
             $this->sendError('Failed to retrieve data: ' . $e->getMessage()); // Provide more detail for debugging if needed
        }
    }


    /**
     * Create new record(s) - supports both single and multiple records
     */
    private function handlePostRequest($table) {
        $conn = $this->dsn; // Use the existing connection property
        try {
            $rawData = json_decode(file_get_contents('php://input'), true);
            if ($rawData === null && json_last_error() !== JSON_ERROR_NONE) {
                $this->sendError('Invalid JSON data: ' . json_last_error_msg(), self::HTTP_BAD_REQUEST);
                return;
            }
            if (empty($rawData)) {
                 $this->sendError('No data provided for insertion.', self::HTTP_BAD_REQUEST);
                 return;
            }


            // Check if data is an array of records (multiple records) or a single record
            $isBatchInsert = isset($rawData[0]) && is_array($rawData[0]);
            $recordsToInsert = $isBatchInsert ? $rawData : [$rawData];

            $insertedIds = [];
            $conn->begin_transaction();

            try {
                foreach ($recordsToInsert as $index => $data) {
                     if (!is_array($data)) {
                         throw new Exception("Invalid data format for record at index $index. Expected an object/associative array.");
                     }
                    $filteredData = $this->filterAllowedFields($table, $data);
                    if (empty($filteredData)) {
                        // Decide whether to skip or throw error for empty records after filtering
                        error_log("Skipping empty record after filtering at index $index for table $table.");
                        continue; // Skip this record
                        // OR: throw new Exception("No valid fields provided for record at index $index.");
                    }
                    $insertId = $this->insertRecord($table, $filteredData);
                    $insertedIds[] = $insertId;
                }

                if (empty($insertedIds) && !empty($recordsToInsert)) {
                     // This means all records were skipped (e.g., due to filtering)
                     $conn->rollback(); // Rollback if nothing was actually inserted
                     $this->sendError('No valid data found to insert after filtering.', self::HTTP_BAD_REQUEST);
                     return;
                }


                $conn->commit();

                $this->sendResponse([
                    'status' => 'success',
                    'message' => count($insertedIds) . ' record(s) created successfully',
                    'ids' => $insertedIds,
                ], self::HTTP_CREATED);
            } catch (Exception $e) {
                $conn->rollback();
                // Log the detailed error
                 error_log("Error during POST transaction for table '$table': " . $e->getMessage());
                 // Send a more generic error to the client
                $this->sendError('Failed to create record(s): ' . $e->getMessage()); // Provide specific error during dev/debug
            }
        } catch (Exception $e) {
            // Catch potential issues like file_get_contents failure or initial JSON decode error
             error_log("Error in handlePostRequest for table '$table': " . $e->getMessage());
            $this->sendError('An error occurred processing the request.');
        }
    }

    /**
     * Routes PUT requests to the appropriate handler.
     */
    private function handlePutRequest($table) {
        if ($table === 'members') {
            $this->handleMemberUpdateRequest();
        } else {
            $this->handleGenericPutRequest($table);
        }
    }

    /**
     * Update an existing record (generic handler).
     */
    private function handleGenericPutRequest($table) {
        $conn = $this->dsn;
        try {
            $id = $_GET["ID"] ?? null;
            if ($id === null || !is_numeric($id) || $id <= 0) {
                $this->sendError('Missing or invalid ID parameter', self::HTTP_BAD_REQUEST);
                return;
            }
            $id = intval($id);

            if (!$this->recordExists($table, $id)) {
                $this->sendError("Record not found with ID $id in table '$table'", self::HTTP_NOT_FOUND);
                return;
            }

            $rawData = file_get_contents('php://input');
            $data = json_decode($rawData, true);

            if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
                $this->sendError('Invalid JSON data: ' . json_last_error_msg(), self::HTTP_BAD_REQUEST);
                return;
            }
            if (empty($data) || !is_array($data)) {
                $this->sendError('Invalid or empty data provided for update.', self::HTTP_BAD_REQUEST);
                return;
            }

            $filteredData = $this->filterAllowedFields($table, $data);
            unset($filteredData['ID']); // Prevent updating primary key
            if (empty($filteredData)) {
                $this->sendError('No updatable fields provided.', self::HTTP_BAD_REQUEST);
                return;
            }

            $conn->begin_transaction();
            try {
                $this->updateRecord($table, $id, $filteredData);
                $conn->commit();
                $this->sendResponse([
                    'status' => 'success',
                    'message' => "Record with ID $id updated successfully",
                    'id' => $id
                ]);
            } catch (Exception $e) {
                $conn->rollback();
                error_log("Error during PUT transaction for table '$table', ID '$id': " . $e->getMessage());
                $this->sendError('Failed to update record: ' . $e->getMessage());
            }
        } catch (Exception $e) {
            error_log("Error in handleGenericPutRequest for table '$table': " . $e->getMessage());
            $this->sendError('An error occurred processing the update request.');
        }
    }

    /**
     * Handles updating a member and automatically logging a renewal record.
     * This logic replaces the database trigger.
     */
    private function handleMemberUpdateRequest() {
        $conn = $this->dsn;
        try {
            $id = $_GET["ID"] ?? null;
            if ($id === null || !is_numeric($id) || $id <= 0) {
                $this->sendError('Missing or invalid member ID', self::HTTP_BAD_REQUEST);
                return;
            }
            $id = intval($id);

            $rawData = file_get_contents('php://input');
            $data = json_decode($rawData, true);
            if (empty($data) || !is_array($data)) {
                $this->sendError('Invalid or empty data provided for member update.', self::HTTP_BAD_REQUEST);
                return;
            }

            $conn->begin_transaction();
            try {
                // 1. Fetch old expired_date before update
                $old_date_stmt = $this->prepareAndExecute("SELECT expired_date FROM members WHERE ID = ? LIMIT 1", [$id], 'i');
                $result = $old_date_stmt->get_result();
                if ($result->num_rows === 0) {
                    throw new Exception("Member with ID $id not found.", self::HTTP_NOT_FOUND);
                }
                $old_expired_date = $result->fetch_assoc()['expired_date'] ?? null;
                $old_date_stmt->close();

                // 2. Filter and update the main member record
                $filteredMemberData = $this->filterAllowedFields('members', $data);
                unset($filteredMemberData['ID']);
                if (!empty($filteredMemberData)) {
                    $this->updateRecord('members', $id, $filteredMemberData);
                }

                // 3. Check if a renewal needs to be logged
                $new_expired_date = $filteredMemberData['expired_date'] ?? null;
                if ($new_expired_date && ($old_expired_date === null || $new_expired_date > $old_expired_date)) {
                    
                    $renewalData = [];
                    $renewalData['member_id'] = $id;
    
                    // Check for manual override from payload
                    if (isset($data['renewal']) && is_array($data['renewal'])) {
                        $manual = $data['renewal'];
                        // Use manual values, falling back to calculated/default values if a specific manual value is null/empty
                        $renewalData['renewed_at'] = !empty($manual['renewed_at']) ? $manual['renewed_at'] : date('Y-m-d');
                        $renewalData['previous_end'] = !empty($manual['previous_end']) ? $manual['previous_end'] : $old_expired_date;
                        $renewalData['new_end'] = !empty($manual['new_end']) ? $manual['new_end'] : $new_expired_date;
                        $renewalData['term_months'] = !empty($manual['term_months']) ? $manual['term_months'] : $this->calculateMonthDiff($renewalData['previous_end'], $renewalData['new_end']);
                        $renewalData['recorded_at'] = !empty($manual['recorded_at']) ? $manual['recorded_at'] : date('Y-m-d');
                        // is_first_time is a bit different, 0 is a valid value. So check if it's set.
                        $renewalData['is_first_time'] = isset($manual['is_first_time']) ? $manual['is_first_time'] : $this->isFirstRenewal($id);
    
                    } else {
                        // Default logic if no 'renewal' object is sent
                        $renewalData['renewed_at'] = date('Y-m-d');
                        $renewalData['previous_end'] = $old_expired_date;
                        $renewalData['new_end'] = $new_expired_date;
                        $renewalData['term_months'] = $this->calculateMonthDiff($old_expired_date, $new_expired_date);
                        $renewalData['recorded_at'] = date('Y-m-d');
                        $renewalData['is_first_time'] = $this->isFirstRenewal($id);
                    }
    
                    // 5. Insert the renewal record
                    $this->insertRecord('member_renewals', $renewalData);
                }

                $conn->commit();
                $this->sendResponse([
                    'status' => 'success',
                    'message' => "Member with ID $id updated successfully",
                    'id' => $id
                ]);

            } catch (Exception $e) {
                $conn->rollback();
                error_log("Error during member update transaction for ID '$id': " . $e->getMessage());
                $this->sendError('Failed to update member: ' . $e->getMessage(), $e->getCode() ?: self::HTTP_SERVER_ERROR);
            }
        } catch (Exception $e) {
            error_log("Error in handleMemberUpdateRequest: " . $e->getMessage());
            $this->sendError('An error occurred processing the member update request.');
        }
    }


    /**
     * Delete a record
     */
    private function handleDeleteRequest($table) {
        $conn = $this->dsn;
        try {
            $id = $_GET['ID'] ?? null;
            if ($id === null || !is_numeric($id) || $id <= 0) { // Basic ID validation
                $this->sendError('Missing or invalid ID parameter', self::HTTP_BAD_REQUEST);
                return;
            }
             $id = intval($id); // Sanitize ID


            if (!$this->recordExists($table, $id)) {
                // It's debatable whether to return 404 or 200/204 on deleting non-existent resource.
                // 404 is arguably more informative.
                $this->sendError("Record not found with ID $id in table '$table'", self::HTTP_NOT_FOUND);
                return;
            }

            $conn->begin_transaction();
            try {
                $this->deleteRecord($table, $id);
                $conn->commit();

                $this->sendResponse([
                    'status' => 'success',
                    'message' => "Record with ID $id deleted successfully",
                    'id' => $id
                ]);
                 // Alternatively, send HTTP 204 No Content on successful deletion
                 // http_response_code(204); exit;
            } catch (Exception $e) {
                $conn->rollback();
                 error_log("Error during DELETE transaction for table '$table', ID '$id': " . $e->getMessage());
                 // Check for foreign key constraint errors specifically if possible
                 if ($conn->errno == 1451) { // MySQL error code for foreign key constraint violation
                     $this->sendError('Cannot delete record: it is referenced by other records.', self::HTTP_BAD_REQUEST);
                 } else {
                    $this->sendError('Failed to delete record: ' . $e->getMessage());
                 }
            }
        } catch (Exception $e) {
             error_log("Error in handleDeleteRequest for table '$table': " . $e->getMessage());
            $this->sendError('An error occurred processing the delete request.');
        }
    }


    /**
     * Utility methods
     */
    private function validateDatabaseConnection() {
        if ($this->dsn->connect_error) {
             error_log("Database Connection Error: " . $this->dsn->connect_error);
            $this->sendError('Database connection failed', self::HTTP_SERVER_ERROR);
            exit; // Stop execution if DB connection fails
        }
         // Set charset for the connection
         if (!$this->dsn->set_charset("utf8mb4")) {
             error_log("Error loading character set utf8mb4: " . $this->dsn->error);
             // Continue, but log the error. Might cause issues with special characters.
         }
    }


    private function isValidTable($table) {
        return array_key_exists($table, $this->allowedTables);
    }

    private function prepareAndExecute($query, $params = [], $types = '') {
        $stmt = $this->dsn->prepare($query);
        if ($stmt === false) {
            // Log the query that failed
             error_log("Failed to prepare statement. Error: " . $this->dsn->error . " | Query: " . $query);
            throw new Exception('Failed to prepare statement: ' . $this->dsn->error);
        }

        if (!empty($params)) {
             // Ensure the number of types matches the number of params
             if (strlen($types) !== count($params)) {
                 $stmt->close(); // Close the prepared statement before throwing
                 error_log("Parameter count mismatch. Types: '$types' (" . strlen($types) . "), Params: " . count($params) . " | Query: " . $query);
                 throw new Exception('Parameter count does not match type definition count.');
             }
            if (!$stmt->bind_param($types, ...$params)) {
                 $stmt->close();
                 error_log("Failed to bind parameters. Error: " . $stmt->error . " | Query: " . $query . " | Types: " . $types . " | Params: " . print_r($params, true));
                throw new Exception('Failed to bind parameters: ' . $stmt->error);
            }
        }

        if (!$stmt->execute()) {
             $error = $stmt->error;
             $errno = $stmt->errno;
             $stmt->close();
             error_log("Failed to execute query. Error $errno: " . $error . " | Query: " . $query . " | Types: " . $types . " | Params: " . print_r($params, true));
            throw new Exception("Failed to execute query (Error $errno): " . $error);
        }

        return $stmt; // Return the statement object for fetching results or getting insert_id
    }

    // getSortColumn is now handled directly within executeQuery for better context

    private function validateSortOrder($order) {
        return in_array(strtoupper($order), ['ASC', 'DESC']) ? strtoupper($order) : 'ASC';
    }

    /**
     * Normalises a membersID so it can be cast safely.
     * Example:  OS2021-000123  →  2021000123
     */
    private function numericMembersIdExpr(string $column = 'membersID'): string
    {
        // MySQL ≥ 8 has REGEXP_REPLACE; fall back to nested REPLACEs if you are on 5.7
        $supportsRegexpReplace = version_compare($this->dsn->server_info, '8.0.0', '>=');
        if ($supportsRegexpReplace) {
            // Strip everything that is not 0-9 in a single pass
            return "CAST(REGEXP_REPLACE($column, '[^0-9]', '') AS UNSIGNED)";
        } else {
            // MySQL 5.7: get rid of the known “OS” prefix first, then the hyphen
            // add more REPLACE() calls here if new alpha prefixes appear later
            return "CAST(REPLACE(REPLACE($column, 'OS', ''), '-', '') AS UNSIGNED)";
        }
    }

    private function getPaginationInfo($page, $limit, $totalRecords) {
        $totalPages = ($limit > 0) ? ceil($totalRecords / $limit) : 0;
        return [
            'page' => $page,
            'limit' => $limit,
            'total_records' => (int) $totalRecords, // Cast to int
            'total_pages' => (int) $totalPages // Cast to int
        ];
    }

    private function filterAllowedFields($table, $data) {
        if (!isset($this->allowedTables[$table])) {
            throw new Exception("Table '$table' not found in allowedTables configuration.");
        }
         if (!is_array($data)) {
             throw new Exception("Invalid data provided for filtering. Expected an array.");
         }
        // Use array_flip for efficient key checking
        $allowed = array_flip($this->allowedTables[$table]);
        $filtered = array_intersect_key($data, $allowed);

        // Optional: Add type casting or validation here based on expected column types if needed

        return $filtered; // Return empty array if no valid fields found
    }

    /**
     * Build search conditions for general search (LIKE %term% or exact match)
     */
    private function buildSearchConditions($queryTable, $searchTerm, $isDirect = false) {
        $conditions = [];
        $params = [];
        $types = '';

        if (empty($searchTerm)) {
            return ['sql' => '1=1', 'params' => [], 'types' => ''];
        }

        // Get the columns for the actual table/view we are querying
        $viewColumns = $this->getTableColumns($queryTable);

        error_log("buildSearchConditions: Query Table = $queryTable");
        error_log("buildSearchConditions: Search Term = $searchTerm");
        error_log("buildSearchConditions: Columns from getTableColumns = " . print_r($viewColumns, true));

        if (empty($viewColumns)) {
             error_log("Could not retrieve columns for query target '$queryTable'. General search may fail.");
             return ['sql' => '1=1', 'params' => [], 'types' => '']; // Prevent query errors
        }


        // Use allowed columns from the *original* table definition to decide *which* columns to search
        // But only add the condition if the column *also* exists in the $queryTable (view)
        foreach ($this->allowedTables[array_search($queryTable, $this->tableToView) ?: $queryTable] as $column) {
             // Check if this allowed column exists in the actual query target (view or table)
            if (isset($viewColumns[$column])) {
                // Simple heuristic: search string-like columns. Adapt if needed.
                 // This check is basic; a more robust approach might involve checking actual column types from DESCRIBE/SHOW COLUMNS
                 // For now, assume most text-based columns in allowedTables are searchable strings.
                 if ($isDirect) {
                     $conditions[] = "`$column` = ?"; // Use exact matching
                     $params[] = $searchTerm; // No wildcards
                 } else {
                     $conditions[] = "`$column` LIKE ?"; // Use pattern matching
                     $params[] = "%" . $searchTerm . "%"; // Add wildcards
                 }
                 $types .= 's';
            }
        }


        if (empty($conditions)) {
            // No searchable columns found or applicable for the search term
            return ['sql' => '1=1', 'params' => [], 'types' => ''];
        }
        
        error_log("buildSearchConditions: Final SQL Conditions = " . ($conditions['sql'] ?? 'NONE'));
        error_log("buildSearchConditions: Final Params = " . print_r($conditions['params'] ?? [], true));

        return [
            'sql' => '(' . implode(' OR ', $conditions) . ')', // Wrap OR conditions in parentheses
            'params' => $params,
            'types' => $types
        ];
    }

    /**
    * Helper to get column names for a table/view, using cache.
    */
    private function getTableColumns($tableName) {
        if (!isset($this->tableColumnCache[$tableName])) {
            try {
                $query = "SHOW COLUMNS FROM `$tableName`";
                $result = $this->dsn->query($query);
                if (!$result) {
                    error_log("Failed to get columns for table '$tableName': " . $this->dsn->error);
                    $this->tableColumnCache[$tableName] = []; // Cache as empty on error
                    return [];
                }
                $columns = [];
                while ($row = $result->fetch_assoc()) {
                    $columns[$row['Field']] = true;
                }
                $this->tableColumnCache[$tableName] = $columns;
                $result->free();
            } catch (Exception $e) {
                error_log("Exception getting columns for table '$tableName': " . $e->getMessage());
                $this->tableColumnCache[$tableName] = []; // Cache empty on exception
                return [];
            }
        }
        return $this->tableColumnCache[$tableName] ?? [];
    }
    


    private function recordExists($table, $id) {
        $stmt = null;
        try {
             // Query the actual table, not necessarily the view, for existence check
            $query = "SELECT 1 FROM `$table` WHERE ID = ? LIMIT 1";
            $stmt = $this->prepareAndExecute($query, [$id], 'i');
            $result = $stmt->get_result();
            $exists = $result->num_rows > 0;
            $stmt->close();
            return $exists;
        } catch (Exception $e) {
             if ($stmt !== null && $stmt instanceof mysqli_stmt) $stmt->close();
             error_log("Error checking if record exists in table '$table' for ID '$id': " . $e->getMessage());
             // Depending on policy, either return false or re-throw
             return false; // Assume not found if error occurs
        }
    }


    private function insertRecord($table, $data) {
        $columns = array_keys($data);
        $values = array_values($data);
        $placeholders = rtrim(str_repeat('?,', count($values)), ','); // More robust placeholder generation

        if (empty($columns)) {
             throw new Exception("No data provided for insert operation in table '$table'.");
        }


        $query = "INSERT INTO `$table` (`" . implode('`, `', $columns) . "`) VALUES ($placeholders)";

        $types = '';
        foreach ($values as $value) {
            // More robust type checking
            if (is_int($value)) {
                $types .= 'i';
            } elseif (is_float($value)) {
                $types .= 'd';
            } elseif ($value === null) {
                $types .= 's'; // Null values are often bound as strings in mysqli, or handled specially if needed
            } else {
                $types .= 's'; // Default to string for boolean, string, etc.
            }
        }

        $stmt = $this->prepareAndExecute($query, $values, $types);
        $insertId = $stmt->insert_id;
        $stmt->close(); // Close statement after getting insert_id

        if ($insertId === 0 || $insertId === null) {
             // This might happen if the table has no auto-increment ID or insertion failed silently
             error_log("Insert operation in table '$table' did not return a valid insert ID. Data: " . print_r($data, true));
             // Depending on requirements, you might throw an exception here
        }


        return $insertId;
    }


    private function updateRecord($table, $id, $data) {
        $updates = [];
        $values = [];
        $types = '';

        if (empty($data)) {
            throw new Exception("No data provided for update operation in table '$table'.");
        }

        foreach ($data as $column => $value) {
            $updates[] = "`$column` = ?";
            $values[] = $value;
            // Robust type checking (same as insertRecord)
            if (is_int($value)) {
                $types .= 'i';
            } elseif (is_float($value)) {
                $types .= 'd';
            } elseif ($value === null) {
                $types .= 's';
            } else {
                $types .= 's';
            }
        }

        $query = "UPDATE `$table` SET " . implode(', ', $updates) . " WHERE ID = ?";
        $values[] = $id; // Add the ID for the WHERE clause
        $types .= 'i';   // Add type for the ID

        $stmt = $this->prepareAndExecute($query, $values, $types);
        $affectedRows = $stmt->affected_rows; // Check how many rows were changed
        $stmt->close();

        // Optional: Check affected rows. If 0, the data might have been the same or the record didn't exist (though we check existence before).
         if ($affectedRows === 0) {
             error_log("Update operation on table '$table' for ID '$id' affected 0 rows. Data might be unchanged.");
         } elseif ($affectedRows === -1) {
             error_log("Error during update operation on table '$table' for ID '$id'. Affected rows returned -1.");
             // This usually indicates an error occurred during execution, though prepareAndExecute should catch it.
         }


        // No return value needed, throws exception on failure
    }


    private function deleteRecord($table, $id) {
        $stmt = $this->prepareAndExecute(
            "DELETE FROM `$table` WHERE ID = ?",
            [$id],
            'i'
        );
        $affectedRows = $stmt->affected_rows;
        $stmt->close();

         if ($affectedRows === 0) {
             // This shouldn't happen if recordExists check passed, but good to log.
             error_log("Delete operation on table '$table' for ID '$id' affected 0 rows. Record might have been deleted between check and execution.");
         } elseif ($affectedRows === -1) {
             error_log("Error during delete operation on table '$table' for ID '$id'. Affected rows returned -1.");
             // This usually indicates an error occurred during execution.
             throw new Exception("Error occurred during delete operation."); // Throw if -1
         }
        // No return value needed, throws exception on failure
    }

    /**
     * Calculates the difference in full months between two dates, similar to MySQL's TIMESTAMPDIFF(MONTH, ...).
     */
    private function calculateMonthDiff($date1, $date2) {
        // Coalesce null old date to the new date for calculation, as per trigger logic
        $d1_str = $date1 ?? $date2;
        if (!$d1_str || !$date2) {
            return 0;
        }
        try {
            $d1 = new DateTime($d1_str);
            $d2 = new DateTime($date2);
            $interval = $d1->diff($d2);
            return ($interval->y * 12) + $interval->m;
        } catch (Exception $e) {
            error_log("Error calculating month difference between '$date1' and '$date2': " . $e->getMessage());
            return 0;
        }
    }

    /**
     * Checks if a member has any prior renewal records.
     */
    private function isFirstRenewal($memberId) {
        $stmt = $this->prepareAndExecute("SELECT 1 FROM member_renewals WHERE member_id = ? LIMIT 1", [$memberId], 'i');
        $is_first = $stmt->get_result()->num_rows === 0 ? 1 : 0;
        $stmt->close();
        return $is_first;
    }


    private function sendResponse($data, $statusCode = self::HTTP_OK) {
        if (!headers_sent()) {
            http_response_code($statusCode);
            header('Content-Type: application/json; charset=utf-8'); // Ensure UTF-8
        }
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_NUMERIC_CHECK); // Add flags for readability and correct number encoding
    }

    private function sendError($message, $statusCode = self::HTTP_SERVER_ERROR, $additional = []) {
        // Log the detailed message server-side regardless of what is sent to client
        error_log("API Error Response: Status=$statusCode, Message=$message, Additional=" . print_r($additional, true));

        if (!headers_sent()) {
             http_response_code($statusCode);
             header('Content-Type: application/json; charset=utf-8');
        }

        // Decide whether to send detailed errors to the client (e.g., during development)
        $isDevelopment = (ini_get('display_errors') === '1'); // Simple check if errors are displayed
        $clientMessage = $isDevelopment ? $message : 'An error occurred.'; // Generic message for production

        echo json_encode(array_merge(
            ['error' => true, 'message' => $clientMessage],
            $additional
        ), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }

    private function sendEmptyResponse() {
        $this->sendResponse([
            'data' => [],
            'total' => 0,
            'pagination' => $this->getPaginationInfo(1, ($_GET['limit'] ?? 10), 0), // Use requested limit or default
            'sorting' => ['column' => ($_GET['sort'] ?? 'ID'), 'order' => ($_GET['order'] ?? 'ASC')] // Reflect requested sort
        ]);
    }

    private function handleTestEndpoint() {
        $this->sendResponse([
            'status' => 'API is running',
            'timestamp' => date('Y-m-d H:i:s'),
            'received_params' => $_GET,
            'tables_available' => array_keys($this->allowedTables),
            'special_conditions_config' => array_keys($this->specialConditions) // Show tables with special conditions
        ]);
    }

    private function getViewTable($table) {
        // If a mapping exists in tableToView, return the view name, otherwise return the original table name.
        return $this->tableToView[$table] ?? $table;
    }
}

// --- Main Execution ---
try {
    // Ensure database connection is established
    if (!isset($dsn) || $dsn->connect_error) {
        // If databaseConnection.php failed or didn't define $dsn correctly
        throw new Exception("Database connection is not available.");
    }
    // Create API instance and handle request
    $api = new DatabaseAPI($dsn);
    $api->handleRequest();

    // Close the database connection if it's still open
    if (isset($dsn) && $dsn instanceof mysqli && $dsn->thread_id) {
        $dsn->close();
    }

} catch (Exception $e) {
    // Catch exceptions happening outside the DatabaseAPI class methods (e.g., during instantiation or connection check)
    error_log("Critical API Failure: " . $e->getMessage());
    // Attempt to send a generic server error response if headers not already sent
    if (!headers_sent()) {
        http_response_code(500); // Use constant if accessible, otherwise 500
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => true, 'message' => 'A critical server error occurred.']);
    }
     // Ensure connection is closed if it was partially opened
     if (isset($dsn) && $dsn instanceof mysqli && $dsn->thread_id) {
         $dsn->close();
     }
}
?>