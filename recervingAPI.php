<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');
require 'databaseConnection.php';

try {
  $stmt = $dsn->query('SELECT * FROM members');
  $data = $stmt->fetch_all(MYSQLI_ASSOC);
  echo json_encode($data);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['error' => $e->getMessage()]);
}
?>