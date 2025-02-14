document.addEventListener("DOMContentLoaded", function () {
    // Configuration
    const API_BASE_URL = 'http://localhost/projects/C-EnterpriseProject/recervingAPI.php';
    
    // State management
    let currentPage = 1;
    let currentTable = 'members';
    let allRecords = [];
    let sortColumn = 'Name';
    let sortDirection = 'asc';

    // DOM Elements
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");
    const tableBody = document.querySelector("#recordsTable tbody");
    const totalRecordsSpan = document.getElementById("totalRecords");
    const itemsPerPageSelect = document.getElementById("itemsPerPage");
    const tableSelect = document.getElementById("tableSelect");

    async function fetchRecords(searchTerm = '') {
        showLoader();
        
        try {
            const params = new URLSearchParams({
                table: currentTable,
                page: currentPage,
                limit: itemsPerPageSelect.value
            });

            if (searchTerm) {
                params.set('search', encodeURIComponent(searchTerm.trim()));
            }

            const response = await fetch(`${API_BASE_URL}?${params.toString()}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseData = await response.json();
            
            if (responseData.error) {
                throw new Error(responseData.error);
            }

            allRecords = responseData.data || [];
            totalRecordsSpan.textContent = responseData.pagination?.total_records || allRecords.length;
            
            sortRecords();
            displayRecords();
            
            if (responseData.pagination) {
                updatePagination(responseData.pagination);
            }
        } catch (error) {
            showError(`Failed to load records: ${error.message}`);
        } finally {
            hideLoader();
        }
    }

    function sortRecords() {
        allRecords.sort((a, b) => {
            let valueA = a[sortColumn] || '';
            let valueB = b[sortColumn] || '';
            
            if (sortColumn === 'Birthday' || sortColumn === 'expired date') {
                valueA = valueA ? new Date(valueA) : new Date(0);
                valueB = valueB ? new Date(valueB) : new Date(0);
            } else if (sortColumn === 'ID' || sortColumn === 'Designation of Applicant') {
                valueA = parseInt(valueA) || 0;
                valueB = parseInt(valueB) || 0;
            }

            return (valueA < valueB ? -1 : valueA > valueB ? 1 : 0) * (sortDirection === 'asc' ? 1 : -1);
        });
    }

    function displayRecords() {
        if (!allRecords || allRecords.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="16" class="no-results">No records found</td></tr>`;
            return;
        }

        const columns = Object.keys(allRecords[0]);
        tableBody.innerHTML = '';

        allRecords.forEach(record => {
            const row = document.createElement('tr');
            
            // Data columns
            columns.forEach(column => {
                const cell = document.createElement('td');
                let value = record[column];

                switch(column) {
                    case 'phone_number':
                        value = formatPhone(value);
                        break;
                    case 'IC':
                    case 'oldIC':
                        value = formatIC(value);
                        break;
                    case 'Birthday':
                        value = formatDate(value);
                        break;
                    case 'expired date':
                        value = formatExpiryDate(value);
                        break;
                    default:
                        value = escapeHtml(value);
                }

                cell.innerHTML = value;
                row.appendChild(cell);
            });

            // Operations column
            const operationsCell = document.createElement('td');
            operationsCell.className = 'operations-cell';
            operationsCell.innerHTML = `
                <div class="btn-group" role="group">
                    <button onclick="editRecord(${record.ID})" class="btn btn-warning btn-sm" title="Edit">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button onclick="printRecord(${record.ID})" class="btn btn-info btn-sm" title="Print">
                        <i class="fas fa-print"></i> Print
                    </button>
                    <button onclick="extendRecord(${record.ID})" class="btn btn-success btn-sm" title="Extend">
                        <i class="fas fa-clock"></i> Extend
                    </button>
                </div>
            `;
            row.appendChild(operationsCell);
            
            tableBody.appendChild(row);
        });
    }

    // Operation Functions
    window.editRecord = function(id) {
        try {
            const record = allRecords.find(r => r.ID === id);
            if (!record) {
                throw new Error('Record not found');
            }
            window.location.href = `edit_member.php?id=${id}`;
        } catch (error) {
            showError(`Failed to edit record: ${error.message}`);
        }
    };

    window.printRecord = async function(id) {
        try {
            const record = allRecords.find(r => r.ID === id);
            if (!record) {
                throw new Error('Record not found');
            }

            // Open print window with record details
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head>
                    <title>Member Details - ${record.Name}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        .header { text-align: center; margin-bottom: 20px; }
                        .details { margin-bottom: 20px; }
                        .row { margin: 10px 0; }
                        .label { font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Member Details</h1>
                    </div>
                    <div class="details">
                        ${Object.entries(record)
                            .map(([key, value]) => `
                                <div class="row">
                                    <span class="label">${key}:</span>
                                    <span>${value}</span>
                                </div>
                            `).join('')}
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        } catch (error) {
            showError(`Failed to print record: ${error.message}`);
        }
    };

    window.extendRecord = async function(id) {
        try {
            const record = allRecords.find(r => r.ID === id);
            if (!record) {
                throw new Error('Record not found');
            }

            const response = await fetch(`${API_BASE_URL}?action=extend&id=${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                showSuccess('Membership extended successfully');
                fetchRecords(); // Refresh the table
            } else {
                throw new Error(result.error || 'Failed to extend membership');
            }
        } catch (error) {
            showError(`Failed to extend membership: ${error.message}`);
        }
    };

    function showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'alert alert-success';
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px;
            border-radius: 4px;
            z-index: 1000;
            background-color: #4caf50;
            color: white;
        `;
        successDiv.textContent = message;
        document.body.appendChild(successDiv);
        setTimeout(() => successDiv.remove(), 3000);
    }

    // Keep existing utility functions...
    [formatPhone, formatIC, formatDate, formatExpiryDate, escapeHtml, 
     showLoader, hideLoader, showError].forEach(fn => {
        window[fn.name] = fn;
    });

    // Event Listeners
    searchButton?.addEventListener("click", () => fetchRecords(searchInput.value));
    
    searchInput?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            fetchRecords(searchInput.value);
        }
    });

    itemsPerPageSelect?.addEventListener("change", () => {
        currentPage = 1;
        fetchRecords(searchInput.value);
    });

    tableSelect?.addEventListener("change", (e) => {
        currentTable = e.target.value;
        currentPage = 1;
        fetchRecords();
    });

    // Initial load
    fetchRecords();
});