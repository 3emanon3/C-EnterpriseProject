const API_BASE_URL = 'http://localhost/projects/C-EnterpriseProject/recervingAPI.php';

document.addEventListener("DOMContentLoaded", function () {
    const bookFilter = document.getElementById("bookFilter");
    const resetFilterButton = document.getElementById("resetFilter");
    const recordsTableBody = document.querySelector("#recordsTable tbody");
    const totalRecords = document.getElementById("totalRecords");
    const loader = document.querySelector(".loader");
    const itemsPerPageSelect = document.getElementById("itemsPerPage");
    const prevPageButton = document.getElementById("prevPage");
    const nextPageButton = document.getElementById("nextPage");
    const table = document.getElementById('recordsTable');
    const tableHeaders = table.querySelectorAll('th');
    const searchInput = document.getElementById("searchInput");
    const notification = document.getElementById('notification');
    const notificationIcon = document.getElementById('notification-icon');
    const notificationMessage = document.getElementById('notification-message');
    
    let recordsData = [];
    let itemsPerPage = parseInt(itemsPerPageSelect.value);
    let currentPage = 1;
    let currentSortColumn = null;
    let currentSortOrder = null;
    let activeFilter = null;
    let searchTerm = "";
    let searchTimeout = null;

    // Initialize resizable columns
    initializeResizableColumns();

    // Fetch book options for filter
    async function fetchBookOptions() {
        try {
            const response = await fetch(`${API_BASE_URL}?table=stock&limit=10000`);
            const data = await response.json();
            
            if (data && data.data) {
                // Clear existing options except the first one
                while (bookFilter.options.length > 1) {
                    bookFilter.remove(1);
                }
                
                // Add unique book names to the filter dropdown
                const uniqueBooks = data.data;
                uniqueBooks.forEach(item => {
                    const option = document.createElement("option");
                    option.value = item.ID;
                    option.textContent = `${item.Name} (RM${item.Price})`;
                    bookFilter.appendChild(option);
                });
            }
        } catch (error) {
            console.error("Error fetching book options:", error);
        }
    }

    async function fetchRecords(filterParams = {}) {
        loader.style.display = "flex";
        recordsTableBody.innerHTML = "";
        
        const params = new URLSearchParams();
        params.append("table", "vsoldrecord");
        params.append("limit", itemsPerPage);
        params.append("page", currentPage);
        
        // Add filter parameters
        for (const [key, value] of Object.entries(filterParams)) {
            if (value) {
                params.append(key, value);
            }
        }
        
        // Add search parameter if exists
        if (searchTerm) {
            params.append("search", searchTerm);
        }
        
        // Add sorting parameters
        if (currentSortColumn) {
            params.append("sort", currentSortColumn);
            params.append("order", currentSortOrder);
        }
        
        const url = `${API_BASE_URL}?${params.toString()}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data && data.data) {
                recordsData = data.data;
                totalRecords.textContent = data.total || recordsData.length;
                displayRecords(recordsData);
            } else {
                recordsData = [];
                totalRecords.textContent = "0";
                recordsTableBody.innerHTML = "<tr><td colspan='10' style='text-align: center;'>No records found</td></tr>";
            }
        } catch (error) {
            console.error("Error fetching records:", error);
            recordsTableBody.innerHTML = "<tr><td colspan='10' style='text-align: center;'>Error loading data</td></tr>";
        } finally {
            loader.style.display = "none";
        }
    }

    function displayRecords(records) {
        recordsTableBody.innerHTML = "";
        
        if (records.length === 0) {
            recordsTableBody.innerHTML = "<tr><td colspan='10' style='text-align: center;'>No records found</td></tr>";
            return;
        }

        // Get headers text
        const headers = Array.from(document.querySelectorAll('#recordsTable th[data-column]')).map(th => th.textContent.trim());
        
        records.forEach(record => {
            const row = document.createElement("tr");
            
            // Map record data to table cells with data-label
            const cells = [
                { label: headers[0], value: record.Book || '-' },
                { label: headers[1], value: record.membership_display || '-' }, // Use 'membership' based on th data-column
                { label: headers[2], value: record["Name/Company_Name"] || '-' },
                { label: headers[3], value: record.quantity_in || '-' },
                { label: headers[4], value: record.quantity_out || '-' },
                { label: headers[5], value: record.InvoiceNo || '-' },
                { label: headers[6], value: record.Date || '-' },
                { label: headers[7], value: record.price || '-' },
                { label: headers[8], value: record.Remarks || '-' }
            ];

            cells.forEach(cell => {
                const td = document.createElement('td');
                td.textContent = cell.value;
                td.setAttribute('data-label', cell.label);
                row.appendChild(td);
            });

            // Add action buttons cell (without data-label)
            const actionTd = document.createElement('td');
            actionTd.innerHTML = `
                <button class="btn btn-edit" onclick="editRecord(${record.ID})">编辑</button>
                <button class="btn btn-delete" onclick="deleteRecord(${record.ID})">删除</button>
            `;
            actionTd.classList.add('action-cell');
            row.appendChild(actionTd);
            
            recordsTableBody.appendChild(row);
        });
    }

    // Handle search input
    function handleSearch() {
        // Clear any existing timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Set a small timeout to prevent making requests for every keystroke
        searchTimeout = setTimeout(() => {
            searchTerm = searchInput.value.trim();
            currentPage = 1;
            
            const filterParams = activeFilter ? { Book: activeFilter } : {};
            fetchRecords(filterParams);
        }, 300); // 300ms delay
    }

    function handleSortClick(columnName) {
        if(currentSortColumn === columnName) {
            currentSortOrder = currentSortOrder === 'ASC' ? 'DESC' : 'ASC';
        } else {
            currentSortColumn = columnName;
            currentSortOrder = 'ASC';
        }
        
        currentPage = 1;
        updateSortIcons();
        
        const filterParams = activeFilter ? { Book: activeFilter } : {};
        fetchRecords(filterParams);
    }

    function updateSortIcons() {
        document.querySelectorAll('th[data-column]').forEach(th => {
            const icon = th.querySelector('i');
            icon.classList.remove('fa-sort', 'fa-sort-up', 'fa-sort-down');
            
            if(th.dataset.column === currentSortColumn) {
                if(currentSortOrder === 'ASC') {
                    icon.classList.add('fa-sort-up');
                } else {
                    icon.classList.add('fa-sort-down');
                }
            } else {
                icon.classList.add('fa-sort');
            }
        });
    }

    // Column Resizing Functionality
    function initializeResizableColumns() {
        const headers = table.querySelectorAll('th');
        
        // Load saved column widths from localStorage
        loadColumnWidths();

        headers.forEach(header => {
            const resizer = header.querySelector('.resizer');
            if (resizer) {
                resizer.addEventListener('mousedown', initResize);
            }
        });

        function initResize(e) {
            e.preventDefault();
            const header = e.target.parentElement;
            const initialWidth = header.offsetWidth;
            const startX = e.clientX;
            header.classList.add('resizing');
            
            document.addEventListener('mousemove', performResize);
            document.addEventListener('mouseup', stopResize);
            
            function performResize(moveEvent) {
                const width = initialWidth + (moveEvent.clientX - startX);
                if (width > 30) { // Minimum width
                    header.style.width = `${width}px`;
                }
            }
            
            function stopResize() {
                header.classList.remove('resizing');
                document.removeEventListener('mousemove', performResize);
                document.removeEventListener('mouseup', stopResize);
                
                // Save column widths to localStorage
                saveColumnWidths();
            }
        }
    }

    function saveColumnWidths() {
        const headers = document.querySelectorAll('#recordsTable th');
        const widths = {};
        
        headers.forEach((header, index) => {
            // Skip the operations column (last column)
            if (index === headers.length - 1) return;
            
            if (header.style.width) {
                widths[index] = header.style.width;
            }
        });
        
        localStorage.setItem('soldRecordTableColumnWidths', JSON.stringify(widths));
    }

    function loadColumnWidths() {
        try {
            const savedWidths = localStorage.getItem('soldRecordTableColumnWidths');
            if (savedWidths) {
                const widths = JSON.parse(savedWidths);
                const headers = document.querySelectorAll('#recordsTable th');
                
                Object.keys(widths).forEach(index => {
                    if (headers[index]) {
                        headers[index].style.width = widths[index];
                    }
                });

                // Always set operation column width
                const operationColumn = headers[headers.length - 1];
                operationColumn.style.width = "140px";
            } else {
                // Set default column widths for specific columns
                const headers = document.querySelectorAll('#recordsTable th');
                headers.forEach((header, index) => {
                    // Skip the operations column (last column)
                    if (index === headers.length - 1) {
                        header.style.width = "140px";
                        return;
                    }
                    
                    // Set default widths for specific columns
                    if (header.dataset.column === "Book") {
                        header.style.width = "180px";
                    }
                    if (header.dataset.column === "membership") {
                        header.style.width = "120px";
                    }
                    if (header.dataset.column === "Name/Company Name") {
                        header.style.width = "180px";
                    }
                    if (header.dataset.column === "quantity_in") {
                        header.style.width = "100px";
                    }
                    if (header.dataset.column === "quantity_out") {
                        header.style.width = "100px";
                    }
                    if (header.dataset.column === "InvoiceNo") {
                        header.style.width = "120px";
                    }
                    if (header.dataset.column === "Date") {
                        header.style.width = "120px";
                    }
                    if (header.dataset.column === "price") {
                        header.style.width = "100px";
                    }
                    if (header.dataset.column === "Remarks") {
                        header.style.width = "180px";
                    }
                });
            }
        } catch (e) {
            console.error("Error loading column widths:", e);
        }
    }

    // Show notification function
    function showNotification(success, message) {
        notificationIcon.className = success ? 'fas fa-check-circle' : 'fas fa-times-circle';
        notificationMessage.textContent = message;
        notification.className = success ? 'notification show success' : 'notification show error';

        setTimeout(() => {
            notification.className = notification.className.replace('show', 'hide');
            setTimeout(() => {
                notification.className = 'notification'; // Reset class fully after animation
            }, 500); // Match animation duration
        }, 3000);
    }

    // Event listener for search input
    searchInput.addEventListener("input", function() {
        // Clear book filter when search is used
        if (searchInput.value.trim() !== "" && bookFilter.value !== "") {
            bookFilter.value = "";
            activeFilter = null;
        }
        
        handleSearch();
    });

    // Event listeners for sorting
    document.querySelectorAll('th[data-column]').forEach(th => {
        th.addEventListener('click', function() {
            handleSortClick(th.dataset.column);
        });
    });

    // Event listeners for filter buttons
    bookFilter.addEventListener("change", function() {
        const selectedID = bookFilter.value;
        activeFilter = selectedID;
        currentPage = 1;
        
        // Clear search input when filter is used
        if (selectedID !== "" && searchInput.value.trim() !== "") {
            searchInput.value = "";
            searchTerm = "";
        }
        
        const filterParams = selectedID ? { BookID: selectedID, search: "true", direct: true } : {};
        fetchRecords(filterParams);
    });

    resetFilterButton.addEventListener("click", function() {
        bookFilter.value = "";
        activeFilter = null;
        currentPage = 1;
        searchInput.value = "";
        searchTerm = "";
        fetchRecords();
    });

    // Pagination event listeners
    prevPageButton.addEventListener("click", function () {
        if (currentPage > 1) {
            currentPage -= 1;
            const filterParams = activeFilter ? { Book: activeFilter } : {};
            fetchRecords(filterParams);
        }
    });

    nextPageButton.addEventListener("click", function () {
        currentPage += 1;
        const filterParams = activeFilter ? { Book: activeFilter } : {};
        fetchRecords(filterParams);
    });

    // Items per page change handler
    itemsPerPageSelect.addEventListener("change", function () {
        itemsPerPage = parseInt(this.value);
        currentPage = 1;
        const filterParams = activeFilter ? { Book: activeFilter } : {};
        fetchRecords(filterParams);
    });

    // Make resetColumnWidths available globally
    window.resetColumnWidths = function() {
        // Remove saved column widths
        localStorage.removeItem('soldRecordTableColumnWidths');
        
        // Reset all column widths to default
        const headers = document.querySelectorAll('#recordsTable th');
        headers.forEach((header, index) => {
            // Set operations column width separately
            if (index === headers.length - 1) {
                header.style.width = "140px";
                return;
            }
            
            header.style.width = '';
            
            // Set default widths for specific columns
            if (header.dataset.column === "Book") {
                header.style.width = "180px";
            }
            if (header.dataset.column === "membership") {
                header.style.width = "120px";
            }
            if (header.dataset.column === "Name/Company Name") {
                header.style.width = "180px";
            }
            if (header.dataset.column === "quantity_in") {
                header.style.width = "100px";
            }
            if (header.dataset.column === "quantity_out") {
                header.style.width = "100px";
            }
            if (header.dataset.column === "InvoiceNo") {
                header.style.width = "120px";
            }
            if (header.dataset.column === "Date") {
                header.style.width = "120px";
            }
            if (header.dataset.column === "price") {
                header.style.width = "100px";
            }
            if (header.dataset.column === "Remarks") {
                header.style.width = "180px";
            }
        });
        
        // Show notification
        showNotification(true, "列宽已重置");
    };

    // Global record editing and deleting functions
    window.editRecord = function(id) {
        window.location.href = `editRecord.html?ID=${id}`;
    };

    window.deleteRecord = async function(id) {
        if (confirm("确定要删除这条记录吗？")) {
            try {
                const response = await fetch(`${API_BASE_URL}?table=soldrecord&ID=${id}`, { 
                    method: "DELETE" 
                });
                
                if (response.ok) {
                    showNotification(true, "记录删除成功！");
                    const filterParams = activeFilter ? { Book: activeFilter } : {};
                    fetchRecords(filterParams);
                } else {
                    showNotification(false, "删除记录失败。");
                }
            } catch (error) {
                console.error("Error deleting record:", error);
                showNotification(false, "删除操作发生错误。");
            }
        }
    };

    // Initialize the page
    fetchBookOptions();
    fetchRecords();
});