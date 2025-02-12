header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

<?php

header('Content-Type: application/json');
require 'databaseConnection.php';

try {
  $stmt = $pdo->query('SELECT * FROM enterprise.test');
  $data = $stmt->fetchAll();
  echo json_encode($data);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['error' => $e->getMessage()]);
}
?>