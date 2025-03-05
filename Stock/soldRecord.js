const API_BASE_URL = 'http://localhost/projects/C-EnterpriseProject/recervingAPI.php';

document.addEventListener("DOMContentLoaded", function () {
    const bookFilter = document.getElementById("bookFilter");
    const applyFilterButton = document.getElementById("applyFilter");
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
    
    let recordsData = [];
    let itemsPerPage = parseInt(itemsPerPageSelect.value);
    let currentPage = 1;
    let currentSortColumn = null;
    let currentSortOrder = null;
    let activeFilter = null;
    let searchTerm = "";
    let searchTimeout = null;

    // Fetch book options for filter
    async function fetchBookOptions() {
        try {
            const response = await fetch(`${API_BASE_URL}?table=stock`);
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
                    option.textContent = `${item.Name} (${item.Price})`;
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
        params.append("table", "soldrecord");
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
        
        records.forEach(record => {
            const row = document.createElement("tr");
            
            row.innerHTML = `
                <td>${record.Book || '-'}</td>
                <td>${record.membership || '-'}</td>
                <td>${record["Name/Company Name"] || '-'}</td>
                <td>${record.quantity_in || '-'}</td>
                <td>${record.quantity_out || '-'}</td>
                <td>${record.InvoiceNo || '-'}</td>
                <td>${record.Date || '-'}</td>
                <td>${record.price || '-'}</td>
                <td>${record.Remarks || '-'}</td>
                <td>
                    <button class="btn btn-edit" onclick="editRecord(${record.ID})">编辑</button>
                    <button class="btn btn-delete" onclick="deleteRecord(${record.ID})">删除</button>
                </td>
            `;
            
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

    // Event listener for search input
    searchInput.addEventListener("input", handleSearch);

    // Event listeners for sorting
    document.querySelectorAll('th[data-column]').forEach(th => {
        th.addEventListener('click', function() {
            handleSortClick(th.dataset.column);
        });
    });

    // Event listeners for filter buttons
    applyFilterButton.addEventListener("click", function() {
        const selectedID = bookFilter.value;
        activeFilter = selectedID;
        currentPage = 1;
        
        const filterParams = selectedID ? { Book: selectedID, search: "true" } : {};
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

    // Column resizing
    tableHeaders.forEach(th => {
        const resizer = th.querySelector('.resizer');
        if (!resizer) return;
        
        let startX, startWidth;
        
        resizer.addEventListener('mousedown', function(e) {
            startX = e.pageX;
            startWidth = th.offsetWidth;
            document.addEventListener('mousemove', resizeColumn);
            document.addEventListener('mouseup', stopResize);
        });
        
        function resizeColumn(e) {
            const newWidth = startWidth + (e.pageX - startX);
            th.style.width = newWidth + 'px';
        }
        
        function stopResize() {
            document.removeEventListener('mousemove', resizeColumn);
            document.removeEventListener('mouseup', stopResize);
        }
    });

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
                    const filterParams = activeFilter ? { Book: activeFilter } : {};
                    fetchRecords(filterParams);
                } else {
                    alert("删除记录失败。");
                }
            } catch (error) {
                console.error("Error deleting record:", error);
                alert("删除操作发生错误。");
            }
        }
    };

    // Initialize the page
    fetchBookOptions();
    fetchRecords();
});