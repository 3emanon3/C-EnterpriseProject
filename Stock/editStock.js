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

document.addEventListener('DOMContentLoaded', function () {
    // Get the stock ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const stockId = urlParams.get('id');

    if (!stockId) {
        alert('No stock ID provided');
        window.location.href = 'searchStock.html';
        return;
    }

    // Fetch stock details
    fetchStockDetails(stockId);

    // Set up image container click event
    const imageContainer = document.getElementById('imageContainer');
    if (imageContainer) {
        imageContainer.addEventListener('click', () => {
            fileInput.click(); // Trigger the file input
        });
    }
});

async function fetchStockDetails(stockId) {
    try {
        const response = await fetch(`${API_BASE_URL}?table=stock&search=true&ID=${stockId}`);
        const data = await response.json();

        if (data && data.data && data.data.length > 0) {
            const stock = data.data[0];
            populateForm(stock);
        } else {
            alert('Stock not found');
            window.location.href = 'searchStock.html';
        }
    } catch (error) {
        console.error('Error fetching stock details:', error);
        alert('Error loading stock details');
    }
}

function populateForm(stock) {
    document.getElementById('productId').value = stock['Product_ID'];
    document.getElementById('name').value = stock.Name;
    document.getElementById('stock').value = stock.stock;
    document.getElementById('price').value = stock.Price;
    document.getElementById('publisher').value = stock.Publisher;
    document.getElementById('remarks').value = stock.Remarks;

    // Store and display the image
    if (stock.Picture) {
        currentBase64Image = stock.Picture;
        displayBase64Image(currentBase64Image);
    }
}

async function saveChanges() {
    const stockId = new URLSearchParams(window.location.search).get('id');

    const updatedStock = {
        'Product_ID': document.getElementById('productId').value,
        'Name': document.getElementById('name').value,
        'stock': document.getElementById('stock').value,
        'Price': document.getElementById('price').value,
        'Publisher': document.getElementById('publisher').value,
        'Remarks': document.getElementById('remarks').value,
        'Picture': currentBase64Image // Include the image in the update
    };

    try {
        const response = await fetch(`${API_BASE_URL}?table=stock&ID=${stockId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedStock)
        });

        if (response.ok) {
            alert('Stock updated successfully');
            isLeaving = true;
            window.location.href = 'searchStock.html';
        } else {
            throw new Error('Failed to update stock');
        }
    } catch (error) {
        console.error('Error updating stock:', error);
        alert('Error updating stock');
    }
}

async function fetchSoldRecords(stockId, limit = 10) {
    try {
        const response = await fetch(`${API_BASE_URL}?table=soldrecord&search=true&Book=${stockId}&limit=${limit}`);
        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('Error fetching sold records:', error);
        return [];
    }
}

async function printData() {
    // Get form values
    const stockId = new URLSearchParams(window.location.search).get('id');
    const productId = document.getElementById('productId').value;
    const name = document.getElementById('name').value;
    const stock = document.getElementById('stock').value;
    const price = parseFloat(document.getElementById('price').value).toFixed(2);
    const publisher = document.getElementById('publisher').value;
    const remarks = document.getElementById('remarks').value.replace(new RegExp('\n', 'g'), '<br>');

    // Get the current image
    const imageSource = currentBase64Image || '../assets/placeholder.png';

    // Fetch sold records for this product
    const soldRecords = await fetchSoldRecords(stockId, 20);

    // Generate sold records table HTML
    let soldRecordsHtml = '';
    if (soldRecords.length > 0) {
        soldRecordsHtml = `
            <section class="sold-records">
                <h3>近期交易记录</h3>
                <table class="records-table">
                    <thead>
                        <tr>
                            <th>日期</th>
                            <th>客户/公司</th>
                            <th>名称</th>
                            <th>入库</th>
                            <th>出库</th>
                            <th>发票号</th>
                            <th>价格</th>
                            <th>备注</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        soldRecords.forEach(record => {
            soldRecordsHtml += `
                <tr>
                    <td>${record.Date || '-'}</td>
                    <td>${record["Name/Company Name"] || '-'}</td>
                    <td>${record.membership || '-'}</td>
                    <td>${record.quantity_in || '-'}</td>
                    <td>${record.quantity_out || '-'}</td>
                    <td>${record.InvoiceNo || '-'}</td>
                    <td>${record.price || '-'}</td>
                    <td>${record.Remarks || '-'}</td>
                </tr>
            `;
        });

        soldRecordsHtml += `
                    </tbody>
                </table>
            </section>
        `;
    }

    // Get the print template
    const template = document.getElementById('print-template').innerHTML;

    // Replace placeholders
    const printHtml = template
        .replace('{{productId}}', productId)
        .replace('{{name}}', name)
        .replace('{{stock}}', stock)
        .replace('{{price}}', price)
        .replace('{{publisher}}', publisher)
        .replace('{{remarks}}', remarks)
        .replace('{{productImage}}', imageSource)
        .replace('{{soldRecordsTable}}', soldRecordsHtml); // Add the sold records table

    // Open a new window and write the print HTML
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHtml);
    printWindow.document.close(); // Properly finish loading the document
    printWindow.focus();
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

    reader.onload = function (event) {
        callback(event.target.result);
    };

    reader.onerror = function (error) {
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
// Set current date in the report
document.addEventListener('DOMContentLoaded', function () {
    const currentDateEl = document.getElementById('currentDate');
    if (currentDateEl) {
        currentDateEl.textContent = new Date().toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
});
