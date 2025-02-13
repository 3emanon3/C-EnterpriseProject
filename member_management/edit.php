<?php
include 'db_config.php';

if (!isset($_GET['id'])) {
    die("Member ID is required.");
}

$memberId = intval($_GET['id']);

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $name = $_POST['name'];
    $dob = $_POST['dob'];
    $address = $_POST['address'];
    $status = $_POST['status'];
    $phone = $_POST['phone'];
    $email = $_POST['email'];

    $query = "UPDATE members SET name=?, dob=?, address=?, status=?, phone=?, email=? WHERE id=?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param("ssssssi", $name, $dob, $address, $status, $phone, $email, $memberId);

    if ($stmt->execute()) {
        echo "Member updated successfully!";
    } else {
        echo "Error updating member.";
    }
}

$query = "SELECT * FROM members WHERE id = ?";
$stmt = $conn->prepare($query);
$stmt->bind_param("i", $memberId);
$stmt->execute();
$result = $stmt->get_result();
$member = $result->fetch_assoc();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Member</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <h2>Edit Member</h2>
    <form method="POST">
        <label>Name:</label>
        <input type="text" name="name" value="<?php echo htmlspecialchars($member['name']); ?>" required>
        
        <label>Date of Birth:</label>
        <input type="date" name="dob" value="<?php echo htmlspecialchars($member['dob']); ?>" required>
        
        <label>Address:</label>
        <input type="text" name="address" value="<?php echo htmlspecialchars($member['address']); ?>" required>
        
        <label>Status:</label>
        <select name="status">
            <option value="Active" <?php if ($member['status'] == 'Active') echo 'selected'; ?>>Active</option>
            <option value="Pending" <?php if ($member['status'] == 'Pending') echo 'selected'; ?>>Pending</option>
        </select>
        
        <label>Phone:</label>
        <input type="text" name="phone" value="<?php echo htmlspecialchars($member['phone']); ?>" required>
        
        <label>Email:</label>
        <input type="email" name="email" value="<?php echo htmlspecialchars($member['email']); ?>" required>
        
        <button type="submit">Save Changes</button>
    </form>
    <a href="index.php">Back to List</a>
</body>
</html>
