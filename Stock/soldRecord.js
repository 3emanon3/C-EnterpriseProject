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

    const exportModal = document.getElementById('exportModal');
    const closeExportModalBtn = document.getElementById('closeExportModalBtn');
    const cancelExportBtn = document.getElementById('cancelExport');
    const confirmExportBtn = document.getElementById('confirmExportBtn');
    const exportBookFilter = document.getElementById('exportBookFilter');
    const exportRecordLimit = document.getElementById('exportRecordLimit');
    const exportStartDateYear = document.getElementById('exportStartDateYear');
    const exportStartDateMonth = document.getElementById('exportStartDateMonth');
    const exportStartDateDay = document.getElementById('exportStartDateDay');
    const exportEndDateYear = document.getElementById('exportEndDateYear');
    const exportEndDateMonth = document.getElementById('exportEndDateMonth');
    const exportEndDateDay = document.getElementById('exportEndDateDay');
    
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

    // Populates month dropdowns in the export modal
    function populateExportMonthSelects() {
        const monthSelects = [exportStartDateMonth, exportEndDateMonth];
        let optionsHTML = '<option value="">--月--</option>';
        for (let i = 1; i <= 12; i++) {
            optionsHTML += `<option value="${i}">${i}</option>`;
        }
        monthSelects.forEach(select => {
            if (select) select.innerHTML = optionsHTML;
        });
    }

    // Opens the export modal and prepares the filters
    window.openExportModal = async function() {
        if (exportModal) {
            // --- START: Clear previous inputs ---
            exportBookFilter.value = '';
            exportRecordLimit.value = '1000';
            document.querySelector('input[name="transactionType"][value="both"]').checked = true;
            // --- END: Clear previous inputs ---

            // --- START: New code to set default dates ---
            const now = new Date();
            // Calculate the first day of the current month
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            // Calculate the last day of the current month
            const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            // Set the start date fields to the first day of the month
            exportStartDateYear.value = firstDayOfMonth.getFullYear();
            exportStartDateMonth.value = firstDayOfMonth.getMonth() + 1; // getMonth() is 0-indexed, so add 1
            exportStartDateDay.value = firstDayOfMonth.getDate();

            // Set the end date fields to the last day of the month
            exportEndDateYear.value = lastDayOfMonth.getFullYear();
            exportEndDateMonth.value = lastDayOfMonth.getMonth() + 1; // getMonth() is 0-indexed, so add 1
            exportEndDateDay.value = lastDayOfMonth.getDate();
            // --- END: New code to set default dates ---

            // Populate book filter options (this part remains the same)
            try {
                const response = await fetch(`${API_BASE_URL}?table=stock&limit=10000`);
                const data = await response.json();
                if (data && data.data) {
                    // Clear existing options except the first "All Books"
                    while (exportBookFilter.options.length > 1) {
                        exportBookFilter.remove(1);
                    }
                    data.data.forEach(item => {
                        const option = document.createElement("option");
                        option.value = item.ID;
                        option.textContent = `${item.Name} (RM${item.Price})`;
                        exportBookFilter.appendChild(option);
                    });
                }
            } catch (error) {
                console.error("Error fetching book options for export:", error);
                showNotification(false, "加载产品列表失败。");
            }

            exportModal.style.display = 'flex';
        }
    }

    // Closes the export modal
    function closeExportModal() {
        if (exportModal) {
            exportModal.style.display = 'none';
        }
    }

    // Main function to handle the export process
    async function handleConfirmExport() {
        showNotification(true, "正在准备数据，请稍候...");
        confirmExportBtn.disabled = true;
        confirmExportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在导出...';

        // 1. Gather filter values
        const bookId = exportBookFilter.value;
        const limit = exportRecordLimit.value;
        const transactionType = document.querySelector('input[name="transactionType"]:checked').value;

        const startYear = exportStartDateYear.value.trim();
        const startMonth = exportStartDateMonth.value;
        const startDay = exportStartDateDay.value.trim();
        const endYear = exportEndDateYear.value.trim();
        const endMonth = exportEndDateMonth.value;
        const endDay = exportEndDateDay.value.trim();

        let startDate = null, endDate = null;

        // 2. Validate date range (if provided)
        if (startYear && startMonth && startDay) {
            startDate = `${startYear}-${padStart(startMonth)}-${padStart(startDay)}`;
            if (!isValidDateString(startDate)) {
                showNotification(false, `开始日期无效: ${startDate}`);
                confirmExportBtn.disabled = false;
                confirmExportBtn.innerHTML = '<i class="fas fa-download"></i> 开始导出';
                return;
            }
        }
        if (endYear && endMonth && endDay) {
            endDate = `${endYear}-${padStart(endMonth)}-${padStart(endDay)}`;
            if (!isValidDateString(endDate)) {
                showNotification(false, `结束日期无效: ${endDate}`);
                confirmExportBtn.disabled = false;
                confirmExportBtn.innerHTML = '<i class="fas fa-download"></i> 开始导出';
                return;
            }
        }

        // 3. Construct API URL
        const params = new URLSearchParams();
        params.append("table", "vsoldrecord");
        params.append("limit", limit);
        params.append("search", "true"); 

        if (bookId) {
            params.append("BookID", bookId);
            params.append("direct", "true");
        }


        if (transactionType === 'in') {
            params.append("transactionTypeIn", "true");
        } else if (transactionType === 'out') {
            params.append("transactionTypeOut", "true");
        }

        if (startDate && endDate) {
            params.append("dateRange", "true");
            params.append("startDate", startDate);
            params.append("endDate", endDate);
        }

        const url = `${API_BASE_URL}?${params.toString()}`;
        console.log("Exporting with URL:", url);

        try {
            // 4. Fetch data from API
            const response = await fetch(url);
            const result = await response.json();

            if (!response.ok || !result.data) {
                throw new Error(result.message || "无法获取导出数据。");
            }

            if (result.data.length === 0) {
                showNotification(false, "根据您的筛选条件，没有找到可导出的数据。");
                return;
            }

            // 5. Generate .xlsx file
            const dataToExport = result.data.map(record => ({
                '产品': record.Book,
                '塾员编号': record.membership_display,
                '公司': record["Name/Company_Name"] || record["Name_Company_Name"],
                '进库数量': record.quantity_in,
                '出库数量': record.quantity_out,
                '发票号码': record.InvoiceNo,
                '日期': record.Date,
                '价格': record.price,
                '备注': record.Remarks
            }));

            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "销售记录");

            const filename = `销售记录_${new Date().toISOString().slice(0, 10)}.xlsx`;
            XLSX.writeFile(workbook, filename);

            showNotification(true, "导出成功！");
            closeExportModal();

        } catch (error) {
            console.error("Export failed:", error);
            showNotification(false, `导出失败: ${error.message}`);
        } finally {
            // Reset button state
            confirmExportBtn.disabled = false;
            confirmExportBtn.innerHTML = '<i class="fas fa-download"></i> 开始导出';
        }
    }

    // Add Event Listeners for Export Modal
    if (closeExportModalBtn) closeExportModalBtn.addEventListener('click', closeExportModal);
    if (cancelExportBtn) cancelExportBtn.addEventListener('click', closeExportModal);
    if (confirmExportBtn) confirmExportBtn.addEventListener('click', handleConfirmExport);

    // Initialize month dropdowns for the new modal
    populateExportMonthSelects();

    // Add to general click listener for closing modals
    window.addEventListener('click', (event) => {
        // ... existing code inside this listener
        if (event.target === exportModal) {
            closeExportModal();
        }
    });
});

