<?php
$host = 'localhost';
$db   = 'entreprise_test';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

// Create connection
$dsn = mysqli_connect($host, $user, $pass, $db);

// Check connection
if (!$dsn) {
    die("Connection failed: " . mysqli_connect_error());
}

echo "Connected successfully";
?>
