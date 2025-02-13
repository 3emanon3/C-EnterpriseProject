<?php
require __DIR__ . '/member_management/member_management.php';
$host = 'localhost';
$db   = 'entreprise_test';
$user = 'root';
$pass = '';

// Create connection
$dsn = mysqli_connect($host, $user, $pass, $db);

// Check connection
if (!$dsn) {
    die("Connection failed: " . mysqli_connect_error());
} else {
    echo "Connected successfully";
}
?>
