const API_BASE_URL = '../recervingAPI.php';

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
    const searchInput = document.getElementById("searchInput");
    const notification = document.getElementById('notification');
    const notificationIcon = document.getElementById('notification-icon');
    const notificationMessage = document.getElementById('notification-message');

    // New Search Date Modal Elements
    const searchDateModal = document.getElementById('searchDateModal');
    const searchDateStartYearInput = document.getElementById('searchDateStartYearInput');
    const searchDateStartMonthInput = document.getElementById('searchDateStartMonthInput');
    const searchDateStartDayInput = document.getElementById('searchDateStartDayInput');
    const searchDateEndYearInput = document.getElementById('searchDateEndYearInput');
    const searchDateEndMonthInput = document.getElementById('searchDateEndMonthInput');
    const searchDateEndDayInput = document.getElementById('searchDateEndDayInput');
    const confirmSearchDateButton = document.getElementById('confirmSearchDate');
    const cancelSearchDateButton = document.getElementById('cancelSearchDate');
    const closeSearchDateModalBtn = document.getElementById('closeSearchDateModalBtn');
    
    let recordsData = [];
    let itemsPerPage = parseInt(itemsPerPageSelect.value);
    let currentPage = 1;
    let currentSortColumn = null;
    let currentSortOrder = null;
    let activeFilter = null; // Stores BookID for book filter
    let searchTerm = "";
    let searchTimeout = null;

    // State for date range filter
    let targetStartDate = null;
    let targetEndDate = null;

    // Helper functions for date handling
    function padStart(num, length = 2) {
        return String(num).padStart(length, '0');
    }

    function isValidDateString(dateString) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return false;
        }
        const date = new Date(dateString);
        const [year, month, day] = dateString.split('-').map(Number);
        return date instanceof Date &&
            !isNaN(date.getTime()) &&
            date.getFullYear() === year &&
            (date.getMonth() + 1) === month &&
            date.getDate() === day;
    }

    initializeResizableColumns();

    async function fetchBookOptions() {
        try {
            const response = await fetch(`${API_BASE_URL}?table=stock&limit=10000`);
            const data = await response.json();
            
            if (data && data.data) {
                while (bookFilter.options.length > 1) {
                    bookFilter.remove(1);
                }
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

    async function fetchRecords() {
        loader.style.display = "flex";
        recordsTableBody.innerHTML = "";
        
        const params = new URLSearchParams();
        params.append("table", "vsoldrecord");
        params.append("limit", itemsPerPage);
        params.append("page", currentPage);
        
        if (targetStartDate && targetEndDate) {
            params.append("dateRange", "true");
            params.append("startDate", targetStartDate);
            params.append("endDate", targetEndDate);
        } else if (activeFilter) { // Book filter
            params.append("BookID", activeFilter);
            params.append("search", "true"); 
            params.append("direct", "true"); 
        } else if (searchTerm) { // General search
            params.append("search", searchTerm);
        }

        if (activeFilter || (targetStartDate && targetEndDate) || searchTerm) {
            params.append("search", "true");
        }
        
        if (currentSortColumn) {
            params.append("sort", currentSortColumn);
            params.append("order", currentSortOrder);
        }
        
        const url = `${API_BASE_URL}?${params.toString()}`;
        console.log("Fetching records with URL:", url);
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data && data.data) {
                recordsData = data.data;
                totalRecords.textContent = data.pagination?.total_records || data.total || recordsData.length; // Prefer pagination total
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
        const headers = Array.from(document.querySelectorAll('#recordsTable th[data-column]')).map(th => th.textContent.trim());
        records.forEach(record => {
            const row = document.createElement("tr");
            const cells = [
                { label: headers[0], value: record.Book || '-' },
                { label: headers[1], value: record.membership_display || '-' },
                { label: headers[2], value: record["Name/Company_Name"] || record["Name_Company_Name"] || '-' }, // Adjusted for potential API key variation
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
            const actionTd = document.createElement('td');
            actionTd.innerHTML = `
                <div class="action-cell">
                    <button class="btn btn-edit" onclick="editRecord(${record.ID})" title="编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-delete" onclick="deleteRecord(${record.ID})" title="删除">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            row.appendChild(actionTd);
            recordsTableBody.appendChild(row);
        });
    }

    function handleSearch() {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        searchTimeout = setTimeout(() => {
            searchTerm = searchInput.value.trim();
            currentPage = 1;
            fetchRecords();
        }, 300);
    }
    
    searchInput.addEventListener("input", function() {
        const currentSearchTerm = searchInput.value.trim();
        if (currentSearchTerm !== "") {
            if (bookFilter.value !== "") {
                bookFilter.value = "";
                activeFilter = null;
            }
            if (targetStartDate || targetEndDate) {
                targetStartDate = null;
                targetEndDate = null;
            }
        }
        handleSearch();
    });


    function handleSortClick(columnName) {
        if(currentSortColumn === columnName) {
            currentSortOrder = currentSortOrder === 'ASC' ? 'DESC' : 'ASC';
        } else {
            currentSortColumn = columnName;
            currentSortOrder = 'ASC';
        }
        currentPage = 1;
        updateSortIcons();
        fetchRecords();
    }

    function updateSortIcons() {
        document.querySelectorAll('th[data-column]').forEach(th => {
            const icon = th.querySelector('i');
            icon.classList.remove('fa-sort', 'fa-sort-up', 'fa-sort-down');
            if(th.dataset.column === currentSortColumn) {
                icon.classList.add(currentSortOrder === 'ASC' ? 'fa-sort-up' : 'fa-sort-down');
            } else {
                icon.classList.add('fa-sort');
            }
        });
    }

    function initializeResizableColumns() {
        const headers = table.querySelectorAll('th');
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
                if (width > 30) {
                    header.style.width = `${width}px`;
                }
            }
            function stopResize() {
                header.classList.remove('resizing');
                document.removeEventListener('mousemove', performResize);
                document.removeEventListener('mouseup', stopResize);
                saveColumnWidths();
            }
        }
    }

    function saveColumnWidths() {
        const headers = document.querySelectorAll('#recordsTable th');
        const widths = {};
        headers.forEach((header, index) => {
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
            const headers = document.querySelectorAll('#recordsTable th');
            if (savedWidths) {
                const widths = JSON.parse(savedWidths);
                Object.keys(widths).forEach(index => {
                    if (headers[index]) {
                        headers[index].style.width = widths[index];
                    }
                });
            } else {
                 headers.forEach((header, index) => {
                    if (index === headers.length - 1) return; // Skip action column for default setting here
                    let defaultWidth = "150px"; // Default for most
                    switch(header.dataset.column) {
                        case "Book": defaultWidth = "180px"; break;
                        case "membership_display": defaultWidth = "120px"; break;
                        case "Name/Company Name": defaultWidth = "180px"; break;
                        case "quantity_in": case "quantity_out": defaultWidth = "100px"; break;
                        case "InvoiceNo": case "Date": defaultWidth = "120px"; break;
                        case "price": defaultWidth = "100px"; break;
                        case "Remarks": defaultWidth = "180px"; break;
                    }
                    header.style.width = defaultWidth;
                });
            }
            // Always set/ensure operation column width
            if (headers.length > 0) {
                 headers[headers.length - 1].style.width = "140px";
            }

        } catch (e) {
            console.error("Error loading column widths:", e);
        }
    }

    function showNotification(success, message) {
        notificationIcon.className = success ? 'fas fa-check-circle' : 'fas fa-times-circle';
        notificationMessage.textContent = message;
        notification.className = success ? 'notification show success' : 'notification show error';
        setTimeout(() => {
            notification.className = notification.className.replace('show', 'hide');
            setTimeout(() => {
                notification.className = 'notification';
            }, 500);
        }, 3000);
    }

    document.querySelectorAll('th[data-column]').forEach(th => {
        th.addEventListener('click', function() {
            handleSortClick(th.dataset.column);
        });
    });

    bookFilter.addEventListener("change", function() {
        const selectedID = bookFilter.value;
        activeFilter = selectedID; 
        if (selectedID) { // If a book is selected
            searchInput.value = ""; 
            searchTerm = "";
            targetStartDate = null;
            targetEndDate = null;
        }
        currentPage = 1;
        fetchRecords();
    });

    resetFilterButton.addEventListener("click", function() {
        bookFilter.value = "";
        activeFilter = null;
        searchInput.value = "";
        searchTerm = "";
        targetStartDate = null; 
        targetEndDate = null;   
        currentPage = 1;
        fetchRecords();
    });

    prevPageButton.addEventListener("click", function () {
        if (currentPage > 1) {
            currentPage -= 1;
            fetchRecords();
        }
    });

    nextPageButton.addEventListener("click", function () {
        currentPage += 1; // Add check for total pages if available from API
        fetchRecords();
    });

    itemsPerPageSelect.addEventListener("change", function () {
        itemsPerPage = parseInt(this.value);
        currentPage = 1;
        fetchRecords();
    });

    window.resetColumnWidths = function() {
        localStorage.removeItem('soldRecordTableColumnWidths');
        const headers = document.querySelectorAll('#recordsTable th');
        headers.forEach((header, index) => {
            header.style.width = ''; // Clear inline style
        });
        loadColumnWidths(); // Reload defaults
        showNotification(true, "列宽已重置");
    };

    window.editRecord = function(id) {
        window.location.href = `editRecord.html?ID=${id}`;
    };
    
    let recordIdToDelete = null;
    const deleteModal = document.getElementById('deleteModal');
    const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
    const cancelDeleteBtn = document.getElementById('cancelDelete');
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    
    function closeDeleteModal() {
        deleteModal.style.display = 'none';
    }
    
    if(closeDeleteModalBtn) closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
    if(cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    
    window.deleteRecord = function(id) {
        recordIdToDelete = id;
        deleteModal.style.display = 'block';
    };
    
    if(confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', async function() {
        closeDeleteModal();
        if (recordIdToDelete) {
            try {
                const response = await fetch(`${API_BASE_URL}?table=soldrecord&ID=${recordIdToDelete}`, { 
                    method: "DELETE" 
                });
                if (response.ok) {
                    showNotification(true, "记录删除成功！");
                    fetchRecords();
                } else {
                    showNotification(false, "删除记录失败。");
                }
            } catch (error) {
                console.error("Error deleting record:", error);
                showNotification(false, "删除操作发生错误。");
            }
            recordIdToDelete = null;
        }
    });

    // Search Date Modal Functions
    window.openSearchDateModal = function() {
        if (searchDateModal) {
            const now = new Date();
            if (searchDateStartYearInput) searchDateStartYearInput.value = now.getFullYear();
            if (searchDateStartMonthInput) searchDateStartMonthInput.value = String(now.getMonth() + 1);
            if (searchDateStartDayInput) searchDateStartDayInput.value = '1';
            if (searchDateEndYearInput) searchDateEndYearInput.value = now.getFullYear();
            if (searchDateEndMonthInput) searchDateEndMonthInput.value = String(now.getMonth() + 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            if (searchDateEndDayInput) searchDateEndDayInput.value = String(lastDay);
            searchDateModal.style.display = 'flex'; // Use flex for centering defined in CSS
        }
    };

    function closeSearchDateModal() {
        if (searchDateModal) {
            searchDateModal.style.display = 'none';
        }
    }

    function handleConfirmSearchDate() {
        const startYear = searchDateStartYearInput.value.trim();
        const startMonth = searchDateStartMonthInput.value;
        const startDay = searchDateStartDayInput.value.trim();
        const endYear = searchDateEndYearInput.value.trim();
        const endMonth = searchDateEndMonthInput.value;
        const endDay = searchDateEndDayInput.value.trim();

        if (!startYear || !startMonth || !startDay || !endYear || !endMonth || !endDay) {
            showNotification(false, "请完整填写开始日期和结束日期的年、月、日。");
            return;
        }
        const startDateStr = `${startYear}-${padStart(startMonth)}-${padStart(startDay)}`;
        const endDateStr = `${endYear}-${padStart(endMonth)}-${padStart(endDay)}`;

        if (!isValidDateString(startDateStr)) {
            showNotification(false, `开始日期无效: ${startDateStr}。`);
            return;
        }
        if (!isValidDateString(endDateStr)) {
            showNotification(false, `结束日期无效: ${endDateStr}。`);
            return;
        }
        const startDateObj = new Date(startDateStr);
        const endDateObj = new Date(endDateStr);
        if (startDateObj > endDateObj) {
            showNotification(false, "开始日期不能晚于结束日期。");
            return;
        }

        targetStartDate = startDateStr;
        targetEndDate = endDateStr;
        bookFilter.value = "";
        activeFilter = null;
        searchInput.value = "";
        searchTerm = "";
        currentPage = 1;
        fetchRecords();
        closeSearchDateModal();
    }

    if(confirmSearchDateButton) confirmSearchDateButton.addEventListener('click', handleConfirmSearchDate);
    if(cancelSearchDateButton) cancelSearchDateButton.addEventListener('click', closeSearchDateModal);
    if(closeSearchDateModalBtn) closeSearchDateModalBtn.addEventListener('click', closeSearchDateModal);

    // General click listener for closing modals by clicking on the overlay
    window.addEventListener('click', (event) => {
        if (event.target === deleteModal) {
            closeDeleteModal();
        }
        if (event.target === searchDateModal) {
            closeSearchDateModal();
        }
    });

    fetchBookOptions();
    fetchRecords();
});