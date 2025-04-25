const API_BASE_URL = '../recervingAPI.php';
let isLeaving = false;
let currentBase64Image = ''; // Store the current image
let formChanged = false; // Track if form has been modified

const imageDisplay = document.getElementById('imageDisplay');
const fileInput = document.getElementById('fileInput');
const imageContainer = document.getElementById('imageContainer');

// Replace browser beforeunload with our own handling
window.addEventListener('beforeunload', function (e) {
    if (!isLeaving && formChanged) {
        e.preventDefault();
        e.returnValue = '';
        showLeaveConfirmation();
        return e.returnValue;
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

    // Add event listeners to track form changes
    const formInputs = document.querySelectorAll('input, textarea');
    formInputs.forEach(input => {
        input.addEventListener('input', () => {
            formChanged = true;
        });
    });

    // Set up confirmation modal buttons
    const confirmLeaveBtn = document.getElementById('confirmLeaveBtn');
    const stayBtn = document.getElementById('stayBtn');

    confirmLeaveBtn.addEventListener('click', () => {
        isLeaving = true;
        hideLeaveConfirmation();
        window.location.href = 'searchStock.html';
    });

    stayBtn.addEventListener('click', () => {
        hideLeaveConfirmation();
    });
});

// Show the leave confirmation modal
function showLeaveConfirmation() {
    const modal = document.getElementById('confirmLeaveModal');
    modal.classList.add('show');
}

// Hide the leave confirmation modal
function hideLeaveConfirmation() {
    const modal = document.getElementById('confirmLeaveModal');
    modal.classList.remove('show');
}

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
            formChanged = false; // Reset form changed state
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
    if (formChanged) {
        showLeaveConfirmation();
    } else {
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
    formChanged = true; // Mark form as changed when image is uploaded

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