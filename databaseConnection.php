<?php
$host = 'localhost';
$db   = 'entreprise_test';
$user = 'root';
$pass = '0000';
$charset = 'utf8mb4';

<<<<<<< HEAD
$dsn = mysqli_connect($host, $user, $pass, $db);
=======
$dsn = mysqli_connect(
                      $host,
                      $user,
                      $pass,
                      $db
);

if ($dsn) {
    echo "Database connected successfully";
} else {
    echo "Database connection failed";
}
>>>>>>> 60cae8894ec77caf56121757ddf9049443b62e82
?>