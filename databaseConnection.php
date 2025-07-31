<?php
$host = 'localhost';
$db   = 'enterprise_test';
$user = 'root';
$pass = 'admin';
$port = 3307;
$charset = 'utf8mb4';

// Create connection
$dsn = new mysqli($host, $user, $pass, $db, $port);
?>
