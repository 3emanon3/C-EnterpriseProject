<?php
include 'db_config.php';

if (!isset($_GET['id'])) {
    die("Member ID is required.");
}

$memberId = intval($_GET['id']);

$query = "SELECT * FROM members WHERE id = ?";
$stmt = $conn->prepare($query);
$stmt->bind_param("i", $memberId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $member = $result->fetch_assoc();
} else {
    die("Member not found.");
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>View Member Details</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <h2>Member Details</h2>
    <p><strong>Name:</strong> <?php echo htmlspecialchars($member['name']); ?></p>
    <p><strong>Date of Birth:</strong> <?php echo htmlspecialchars($member['dob']); ?></p>
    <p><strong>Address:</strong> <?php echo htmlspecialchars($member['address']); ?></p>
    <p><strong>Status:</strong> <?php echo htmlspecialchars($member['status']); ?></p>
    <p><strong>Phone:</strong> <?php echo htmlspecialchars($member['phone']); ?></p>
    <p><strong>Email:</strong> <?php echo htmlspecialchars($member['email']); ?></p>
    <a href="index.php">Back to List</a>
</body>
</html>
