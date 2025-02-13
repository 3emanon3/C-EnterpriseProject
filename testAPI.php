<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Simple test endpoint
echo json_encode([
    'status' => 'success',
    'message' => 'API is running',
    'timestamp' => date('Y-m-d H:i:s')
]);
?>