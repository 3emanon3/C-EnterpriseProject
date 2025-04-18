const API_BASE_URL = 'http://localhost/projects/C-EnterpriseProject/recervingAPI.php';

document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("searchInput");
    const stockTableBody = document.querySelector("#stockTable tbody");
    const totalStocks = document.getElementById("totalStocks");
    const loader = document.querySelector(".loader");
    const itemsPerPageSelect = document.getElementById("itemsPerPage");
    const prevPageButton = document.getElementById("prevPage");
    const nextPageButton = document.getElementById("nextPage");
    let stockData = [];
    let itemsPerPage = parseInt(itemsPerPageSelect.value);
    let currentPage = 1;
    const table = document.getElementById('stockTable');
    const tableHeaders = table.querySelectorAll('th');
    let currentSortColumn = null;
    let currentSortOrder = null;

    // Initialize resizable columns
    initializeResizableColumns();

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    const debouncedSearch = debounce((searchText) => {
        currentPage = 1;
        fetchStocks(searchText);
    }, 300);

    searchInput.addEventListener("input", function () {
        debouncedSearch(this.value);
    });

    async function fetchStocks(query = "") {
        loader.style.display = "flex"; // Use flex for center alignment
        stockTableBody.innerHTML = "";

        const params = new URLSearchParams();
        params.append("table", "stock");
        params.append("limit", itemsPerPage);
        params.append("page", currentPage);
        if (query.trim() !== "") {
            params.append("search", query);
        }
        if (currentSortColumn) {
            params.append("sort", currentSortColumn);
            params.append("order", currentSortOrder);
        }

        const url = `${API_BASE_URL}?${params.toString()}`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            stockData = data.data;
            totalStocks.textContent = data.total || stockData.length;
            displayStocks(stockData);
            updatePagination(data.total || stockData.length);
        } catch (error) {
            console.error("Error fetching stocks:", error);
            stockTableBody.innerHTML = `<tr><td colspan="7">Error loading data. Please try again.</td></tr>`; // Show error in table
            totalStocks.textContent = '0';
            updatePagination(0);
        } finally {
            loader.style.display = "none";
        }
    }

    function displayStocks(stocks) {
        stockTableBody.innerHTML = "";
        if (!stocks || stocks.length === 0) {
            stockTableBody.innerHTML = `<tr><td colspan="7">No stocks found.</td></tr>`;
            return;
        }
        stocks.forEach(stock => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${stock["Product_ID"] || '-'}</td>
                <td>${stock.Name || '-'}</td>
                <td>${stock.stock !== null ? stock.stock : '-'}</td>
                <td>RM ${stock.Price !== null ? parseFloat(stock.Price).toFixed(2) : 'N/A'}</td>
                <td>${stock.Publisher || '-'}</td>
                <td>${stock.Remarks || ''}</td>
                <td class="action-cell">
                    <button class="btn btn-edit" onclick="editStock(${stock.ID})" title="编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-delete" onclick="deleteStock(${stock.ID})" title="删除">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-increase" onclick="increaseStock(${stock.ID})" title="增加">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="btn btn-decrease" onclick="decreaseStock(${stock.ID})" title="减少">
                        <i class="fas fa-minus"></i>
                    </button>
                </td>
            `;
            stockTableBody.appendChild(row);
        });
    }

     function updatePagination(totalItems) {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage === totalPages || totalPages === 0;

        // Basic pagination display (can be enhanced later)
        const paginationDiv = document.querySelector('.pagination');
        paginationDiv.innerHTML = `Page ${currentPage} of ${totalPages || 1}`;
    }


    function handleSortClick(columnName) {
        if (!columnName) return; // Don't sort if no data-column attribute
        if (currentSortColumn === columnName) {
            currentSortOrder = currentSortOrder === 'ASC' ? 'DESC' : 'ASC';
        } else {
            currentSortColumn = columnName;
            currentSortOrder = 'ASC';
        }
        currentPage = 1;
        updateSortIcons();
        fetchStocks(searchInput.value);
    }

    function updateSortIcons() {
        document.querySelectorAll('th[data-column]').forEach(th => {
            const icon = th.querySelector('i.fa-sort, i.fa-sort-up, i.fa-sort-down');
            if (icon) {
                 icon.classList.remove('fa-sort', 'fa-sort-up', 'fa-sort-down');
                 if (th.dataset.column === currentSortColumn) {
                    icon.classList.add(currentSortOrder === 'ASC' ? 'fa-sort-up' : 'fa-sort-down');
                 } else {
                    icon.classList.add('fa-sort');
                 }
            }
        });
    }

    document.querySelectorAll('th[data-column]').forEach(th => {
        th.addEventListener('click', function () {
            handleSortClick(th.dataset.column);
        });
    });

    prevPageButton.addEventListener("click", function () {
        if (currentPage > 1) {
            currentPage -= 1;
            fetchStocks(searchInput.value);
        }
    });

    nextPageButton.addEventListener("click", function () {
         // We don't know the exact total pages here without fetching,
         // but the button state is handled in updatePagination after fetch
        currentPage += 1;
        fetchStocks(searchInput.value);
    });

    itemsPerPageSelect.addEventListener("change", function () {
        itemsPerPage = parseInt(this.value);
        currentPage = 1;
        fetchStocks(searchInput.value);
    });

    // Column Resizing Functionality
    function initializeResizableColumns() {
        const table = document.getElementById('stockTable');
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
        const headers = document.querySelectorAll('#stockTable th');
        const widths = {};
        
        headers.forEach((header, index) => {
            // Skip the operations column (last column)
            if (index === headers.length - 1) return;
            
            if (header.style.width) {
                widths[index] = header.style.width;
            }
        });
        
        localStorage.setItem('stockTableColumnWidths', JSON.stringify(widths));
    }

    function loadColumnWidths() {
        try {
            const savedWidths = localStorage.getItem('stockTableColumnWidths');
            if (savedWidths) {
                const widths = JSON.parse(savedWidths);
                const headers = document.querySelectorAll('#stockTable th');
                
                Object.keys(widths).forEach(index => {
                    if (headers[index]) {
                        headers[index].style.width = widths[index];
                    }
                });

                // Always set operation column width
                const operationColumn = headers[headers.length - 1];
                operationColumn.style.width = "150px";
            } else {
                // Set default column widths for specific columns
                const headers = document.querySelectorAll('#stockTable th');
                headers.forEach((header, index) => {
                    // Skip the operations column (last column)
                    if (index === headers.length - 1) {
                        header.style.width = "150px";
                        return;
                    }
                    
                    // Set default widths based on data-column attribute
                    if (header.dataset.column === "Product ID") {
                        header.style.width = "90px";
                    }
                    if (header.dataset.column === "Name") {
                        header.style.width = "250px";
                    }
                    if (header.dataset.column === "stock") {
                        header.style.width = "70px";
                    }
                    if (header.dataset.column === "Price") {
                        header.style.width = "100px";
                    }
                    if (header.dataset.column === "Publisher") {
                        header.style.width = "150px";
                    }
                    if (header.dataset.column === "Remarks") {
                        header.style.width = "150px";
                    }
                });
            }
        } catch (e) {
            console.error("Error loading column widths:", e);
        }
    }
    
    // Make resetColumnWidths available globally
    window.resetColumnWidths = function() {
        // Remove saved column widths
        localStorage.removeItem('stockTableColumnWidths');
        
        // Reset all column widths to default
        const headers = document.querySelectorAll('#stockTable th');
        headers.forEach((header, index) => {
            // Set operations column width separately
            if (index === headers.length - 1) {
                header.style.width = "150px";
                return;
            }
            
            header.style.width = '';
            
            // Set default widths based on data-column attribute
            if (header.dataset.column === "Product ID") {
                header.style.width = "90px";
            }
            if (header.dataset.column === "Name") {
                header.style.width = "250px";
            }
            if (header.dataset.column === "stock") {
                header.style.width = "70px";
            }
            if (header.dataset.column === "Price") {
                header.style.width = "100px";
            }
            if (header.dataset.column === "Publisher") {
                header.style.width = "150px";
            }
            if (header.dataset.column === "Remarks") {
                header.style.width = "150px";
            }
        });
        
        // Show notification
        showNotification(true, "列宽已重置");
    };

    window.editStock = function (id) {
        window.location.href = `editStock.html?id=${id}`;
    };

    let stockIdToDelete = null;
    const deleteModal = document.getElementById('deleteModal');
    const closeModalBtn = document.querySelector('.close-modal');
    const cancelDeleteBtn = document.getElementById('cancelDelete');
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    const notification = document.getElementById('notification');
    const notificationIcon = document.getElementById('notification-icon');
    const notificationMessage = document.getElementById('notification-message');

    function closeDeleteModal() {
        deleteModal.style.display = 'none';
    }

    closeModalBtn.addEventListener('click', closeDeleteModal);
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    window.addEventListener('click', (event) => {
        if (event.target === deleteModal) {
            closeDeleteModal();
        }
    });

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

    window.deleteStock = function (id) {
        stockIdToDelete = id;
        deleteModal.style.display = 'block';
    };

    confirmDeleteBtn.addEventListener('click', async function() {
        closeDeleteModal();

        if (stockIdToDelete) {
            try {
                const response = await fetch(`${API_BASE_URL}?table=stock&ID=${stockIdToDelete}`, {
                    method: "DELETE"
                });

                if (response.ok) {
                    showNotification(true, "删除成功！");
                    fetchStocks(searchInput.value); // Refresh data
                } else {
                    const errorData = await response.json().catch(() => ({ message: "删除失败，请重试。" }));
                    showNotification(false, errorData.message || "删除失败，请重试。");
                }
            } catch (error) {
                console.error("Error deleting record:", error);
                showNotification(false, "删除操作发生错误。");
            }

            stockIdToDelete = null;
        }
    });

    window.increaseStock = function (id) {
        window.location.href = `increaseStock.html?id=${id}`;
    };

    window.decreaseStock = function (id) {
        window.location.href = `decreaseStock.html?id=${id}`;
    };

    // Initial fetch
    fetchStocks();
});