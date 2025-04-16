const API_BASE_URL = 'http://localhost/projects/C-EnterpriseProject/recervingAPI.php';
let isLeaving = false;
let currentBase64Image = ''; // Store the current image

const imageDisplay = document.getElementById('imageDisplay');
const fileInput = document.getElementById('fileInput');
const imageContainer = document.getElementById('imageContainer');

window.addEventListener('beforeunload', function (e) {
    if (!isLeaving) {
        e.returnValue = '确定要取消吗？您的更改可能不会被保。';
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // Set up image container click event
    const imageContainer = document.getElementById('imageContainer');
    if (imageContainer) {
        imageContainer.addEventListener('click', () => {
            fileInput.click(); // Trigger the file input
        });
    }
});

async function saveNewData() {
    const newStock = {
        'Product_ID': document.getElementById('productId').value,
        'Name': document.getElementById('name').value,
        'stock': document.getElementById('stock').value,
        'Price': document.getElementById('price').value,
        'Publisher': document.getElementById('publisher').value,
        'Remarks': document.getElementById('remarks').value,
        'Picture': currentBase64Image // Include the image in the update
    };

    try {
        const response = await fetch(`${API_BASE_URL}?table=stock`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newStock)
        });

        if (response.ok) {
            // Show success modal instead of alert
            const successModal = document.getElementById('successModal');
            successModal.classList.add('show');
            
            // Set redirect timer after animation completes
            isLeaving = true;
            setTimeout(() => {
                window.location.href = 'searchStock.html';
            }, 2000); // 2 seconds delay to show the animation
        } else {
            throw new Error('Failed to update stock');
        }
    } catch (error) {
        console.error('Error updating stock:', error);
        alert('Error updating stock');
    }
}

function confirmCancel() {
    if (confirm('确定要取消吗，您所作的更改将不会保存。')) {
        isLeaving = true; // Set flag before redirecting
        window.location.href = 'searchStock.html';
    }
}

function displayBase64Image(base64String) {
    if (base64String) {
        // Make sure image is visible
        imageDisplay.style.display = 'block';
        imageDisplay.src = base64String;
    } else {
        // Show placeholder or default image
        imageDisplay.src = '../assets/placeholder.png'; // Replace with actual placeholder path
    }
}

function encodeImageToBase64(file, callback) {
    const reader = new FileReader();

    reader.onload = function(event) {
        callback(event.target.result);
    };

    reader.onerror = function(error) {
        console.error("Error reading file:", error);
        callback(null); // Indicate an error
    };

    reader.readAsDataURL(file);
}

// Event listener for when a file is selected
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];

    if (file) {
        // Check if the file size exceeds 1MB (1,048,576 bytes)
        if (file.size > 1048576) {
            alert('The image size exceeds 1MB. Please choose a smaller image.');
            fileInput.value = ''; // Clear the file input
            return; // Stop further execution
        }

        // If size is acceptable, proceed with encoding
        encodeImageToBase64(file, (base64String) => {
            if (base64String) {
                // Store and display the new image
                currentBase64Image = base64String;
                displayBase64Image(base64String);
            }
        });
    }
});