const API_BASE_URL = 'http://localhost/projects/C-EnterpriseProject/recervingAPI.php';
let isLeaving = false;

window.addEventListener('beforeunload', function (e) {
    if (!isLeaving) {
        e.returnValue = '确定要取消吗？您的更改可能不会被保。';
    }
});

document.addEventListener('DOMContentLoaded', function() {
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
});

async function fetchStockDetails(stockId) {
    try {
        const response = await fetch(`${API_BASE_URL}?table=stock&search=${stockId}&ID=${stockId}`);
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
    document.getElementById('productId').value = stock['Product ID'];
    document.getElementById('name').value = stock.Name;
    document.getElementById('stock').value = stock.stock;
    document.getElementById('price').value = stock.Price;
    document.getElementById('publisher').value = stock.Publisher;
    document.getElementById('remarks').value = stock.Remarks;
}

async function saveChanges() {
    const stockId = new URLSearchParams(window.location.search).get('id');
    
    const updatedStock = {
        'Product ID': document.getElementById('productId').value,
        Name: document.getElementById('name').value,
        stock: document.getElementById('stock').value,
        Price: document.getElementById('price').value,
        Publisher: document.getElementById('publisher').value,
        Remarks: document.getElementById('remarks').value
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

function printData() {
    // Get form values
    const productId = document.getElementById('productId').value;
    const name = document.getElementById('name').value;
    const stock = document.getElementById('stock').value;
    const price = parseFloat(document.getElementById('price').value).toFixed(2);
    const publisher = document.getElementById('publisher').value;
    const remarks = document.getElementById('remarks').value.replace(new RegExp('\n', 'g'), '<br>');

    // Get the print template
    const template = document.getElementById('print-template').innerHTML;

    // Replace placeholders
    const printHtml = template
        .replace('{{productId}}', productId)
        .replace('{{name}}', name)
        .replace('{{stock}}', stock)
        .replace('{{price}}', price)
        .replace('{{publisher}}', publisher)
        .replace('{{remarks}}', remarks);

    // Open a new window and write the print HTML
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHtml);
    printWindow.focus();
}

function confirmCancel() {
    if (confirm('确定要取消吗，您所作的更改将不会保存。')) {
        isLeaving = true; // Set flag before redirecting
        location.href = 'searchStock.html';
    }
}