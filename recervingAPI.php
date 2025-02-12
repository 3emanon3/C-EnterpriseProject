<<<<<<< HEAD
<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');
=======


<?php

>>>>>>> 60cae8894ec77caf56121757ddf9049443b62e82
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

require 'databaseConnection.php';

try {
<<<<<<< HEAD
  $stmt = $dsn->query('SELECT * FROM members');
  $data = $stmt->fetch_all(MYSQLI_ASSOC);
=======
  $stmt = $pdo->query('SELECT * FROM enterprise_test');
  $data = $stmt->fetchAll();
>>>>>>> 60cae8894ec77caf56121757ddf9049443b62e82
  echo json_encode($data);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['error' => $e->getMessage()]);
}
