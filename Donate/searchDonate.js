document.addEventListener("DOMContentLoaded", function () {
    // Element references
    const API_BASE_URL = 'http://localhost/projects/C-EnterpriseProject/recervingAPI.php';
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");
    const totalDonations = document.getElementById("totalDonations");
    const loader = document.querySelector(".loader");
    const itemsPerPageSelect = document.getElementById("itemsPerPage");
    const table = document.getElementById('donationTable');
    const tableHeaders = table.querySelectorAll('th');
    const donationTableBody = table.querySelector('tbody');
    const paginationContainer = document.querySelector(".pagination");
    const prevPageButton = document.getElementById("prevPage");
    const nextPageButton = document.getElementById("nextPage");
    
    // State variables
    let currentSortColumn = null;
    let currentSortOrder = null;
    let donationData = []; 
    let itemsPerPage = parseInt(itemsPerPageSelect.value);
    let currentPage = 1;
    let totalPages = 0;
    let currentSearchType = 'all'; // Flag to indicate listing all data

    // Debounce function to limit API calls during rapid typing
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
    
    // Debounced search
    const debouncedSearch = debounce((searchText) => {
        console.log("Searching for:", searchText); 
        currentPage = 1; // Reset to first page when searching
        fetchDonations(searchText);
    }, 300); // 300ms delay
    
    searchInput.addEventListener("input", function() {
        debouncedSearch(this.value);
    });

    async function fetchDonations(query = "") {
        loader.style.display = "block";
        donationTableBody.innerHTML = "";
      
        // Create params object instead of using append
        const params = new URLSearchParams({
            table: "donation",
            page: currentPage,
            limit: itemsPerPage,
        });
        
        if (query && query.trim() !== "") {
            params.append("search", query.trim());
            currentSearchType = 'search'; // Indicate not listing all when search query is present
        } else {
            currentSearchType = 'all'; // Back to listing all if query is empty
        }
    
        if (currentSortColumn) {
            // Ensure the column names match what the API expects
            const apiColumnName = mapColumnNameToApi(currentSortColumn);
            params.append("sort", apiColumnName);
            params.append("order", currentSortOrder || 'ASC');
        }
    
        const url = `${API_BASE_URL}?${params.toString()}`;
        console.log("API URL:", url);
    
        try {
            const response = await fetch(url);
            console.log("Raw response status:", response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Server error response: ${errorText}`);
                throw new Error(`Server responded with status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("API Response:", data); // Log the entire response
            
            // Check for different response formats
            if (Array.isArray(data)) {
                donationData = data;
                totalDonations.textContent = data.length;
            } else if (data && typeof data === 'object') {
                donationData = Array.isArray(data.data) ? data.data : [];
                totalDonations.textContent = data.total || data.pagination?.total_records || donationData.length;
            } else {
                throw new Error("Invalid data format received");
            }
    
            totalPages = Math.ceil(parseInt(totalDonations.textContent) / itemsPerPage);
            displayDonations(donationData);
            updatePagination();
            updateSortIcons();
        } catch (error) {
            console.error("Error fetching donations:", error);
            donationTableBody.innerHTML = `<tr><td colspan="10" class="error-message">Failed to load donations. Error: ${error.message}</td></tr>`;
            
            // Reset data on error
            donationData = [];
            totalDonations.textContent = 0;
            totalPages = 1;
            updatePagination();
        } finally {
            loader.style.display = "none";
        }
    }

    function mapColumnNameToApi(columnName) {
        // Updated mapping to match HTML data-column attributes
        const mapping = {
            'id': 'ID',
            'donor_name': 'Name/Company Name',
            'donationTypes': 'vdonation',
            'Bank': 'Bank',
            'membership': 'membership',
            'payment_date': 'payment_date',
            'receipt_no': 'receipt_no',
            'amount': 'amount',
            'Remarks': 'Remarks'
        };
        
        return mapping[columnName] || columnName;
    }

    function displayDonations(donations) {
        console.log("Displaying donations:", donations);
        donationTableBody.innerHTML = ""; // Reset the table body
        
        if (!Array.isArray(donations) || donations.length === 0) {
            let message = '暂无记录';
            if (currentSearchType === 'search') message = '没有找到匹配的记录';
            
            donationTableBody.innerHTML = `<tr><td colspan="10" class="no-data">${message}</td></tr>`;
            return;
        }
    
        console.log(`Processing ${donations.length} donations for display`);
        
        donations.forEach(donation => {
            // Log the donation object to see its structure
            console.log("Processing donation:", donation);
            
            const row = document.createElement("tr");
            row.setAttribute('id', `donation-row-${donation.ID || 'unknown'}`);
            
            // Handle potential property name variations
            const id = donation.ID || donation.id || '';
            const donorName = donation['Name/Company Name'] || donation.donor_name || '';
            const donationType = donation.donationTypes || donation.donation_type || '';
            const bank = donation.Bank || donation.bank || '';
            const membership = donation.membership || '';
            const paymentDate = formatDateTime(donation.paymentDate || donation.payment_date || '');
            const receiptNo = donation['official receipt no'] || donation.receipt_no || '';
            const amount = formatPrice(donation.amount || 0);
            const remarks = truncateText(donation.Remarks || donation.remarks || '', 50);
            
            row.innerHTML = `
            <td>${escapeHTML(id)}</td>
            <td>${escapeHTML(donorName)}</td>
            <td>${escapeHTML(donationType)}</td>
            <td>${escapeHTML(bank)}</td>
            <td>${escapeHTML(membership)}</td>
            <td>${paymentDate}</td>
            <td>${escapeHTML(receiptNo)}</td>
            <td>${amount}</td>
            <td>${remarks}</td>
            <td>
                <button class="btn btn-edit" data-id="${id}" aria-label="Edit donation ${id}">编辑</button>
                <button class="btn btn-delete" data-id="${id}" aria-label="Delete donation ${id}">删除</button>
            </td>
            `;
            donationTableBody.appendChild(row);
        });
    }

    function truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length > maxLength) {
            // Add a title attribute for the full text when truncated
            return `<span title="${escapeHTML(text)}">${escapeHTML(text.substring(0, maxLength))}...</span>`;
        }
        return escapeHTML(text);
    }
    
    // Helper function to escape HTML
    function escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatDateTime(dateTimeStr) {
        if (!dateTimeStr) return '';
        const date = new Date(dateTimeStr);
        if (isNaN(date.getTime())) return dateTimeStr;

        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatPrice(price) {
        if (price === null || price === undefined) return '';
        return `RM${parseFloat(price).toFixed(2)}`;
    }

    function updatePagination() {
        if (!paginationContainer) return;
        
        const paginationHTML = [];
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                paginationHTML.push(`
                    <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                            data-page="${i}"
                            aria-label="第${i}页"
                            ${i === currentPage ? 'aria-current="page"' : ''}>
                        ${i}
                    </button>
                `);
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                paginationHTML.push('<span class="pagination-ellipsis" aria-hidden="true">...</span>');
            }
        }

        // Page jump
        paginationHTML.push(`
            <div class="pagination-info" aria-live="polite">
                <span class="page-indicator">${currentPage}/${totalPages}</span>
                <div class="page-jump">
                    <input type="number" 
                           id="pageInput" 
                           min="1" 
                           max="${totalPages}" 
                           placeholder="页码"
                           aria-label="跳转到页码"
                           class="page-input">
                    <button onclick="jumpToPage()" class="jump-btn">跳转</button>
                </div>
            </div>
        `);

        paginationContainer.innerHTML = paginationHTML.join('');
        
        // Add event listeners to pagination buttons
        paginationContainer.querySelectorAll('.pagination-btn[data-page]').forEach(button => {
            button.addEventListener('click', function() {
                const page = parseInt(this.dataset.page);
                if (!isNaN(page) && page >= 1 && page <= totalPages) {
                    changePage(page);
                }
            });
        });

        // Add event listener to page input for Enter key
        const pageInput = document.getElementById('pageInput');
        if (pageInput) {
            pageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    jumpToPage();
                }
            });
        }
        
        // Re-attach event listeners for prev/next buttons
        if (prevPageButton) {
            prevPageButton.addEventListener('click', () => {
                if (currentPage > 1) changePage(currentPage - 1);
            });
        }
        
        if (nextPageButton) {
            nextPageButton.addEventListener('click', () => {
                if (currentPage < totalPages) changePage(currentPage + 1);
            });
        }
    }

    function changePage(page) {
        if (page >= 1 && page <= totalPages && page !== currentPage) {
            currentPage = page;
            fetchDonations(searchInput.value);
        }
    }

    function jumpToPage() {
        const pageInput = document.getElementById('pageInput');
        if (!pageInput) return;
        
        let targetPage = parseInt(pageInput.value);
        
        // Validate input
        if (isNaN(targetPage)) {
            alert('请输入有效的页码');
            return;
        }
        
        if (targetPage < 1) {
            targetPage = 1;
        } else if (targetPage > totalPages) {
            targetPage = totalPages;
        }
        
        // Only change page if it's different from current page
        if (targetPage !== currentPage) {
            changePage(targetPage);
        }
        
        // Clear input after jumping
        pageInput.value = '';
    }

    function handleSortClick(columnName) {
        if (currentSortColumn === columnName) {
            currentSortOrder = currentSortOrder === 'ASC' ? 'DESC' : 'ASC';
        } else {
            currentSortColumn = columnName;
            currentSortOrder = 'ASC';
        }
        currentPage = 1;
        updateSortIcons();
        fetchDonations(searchInput.value);
    }

    function updateSortIcons() {
        document.querySelectorAll('th[data-column]').forEach(th => {
            const icon = th.querySelector('i') || document.createElement('i');
            icon.className = 'sort-arrow fas';
            
            if (th.dataset.column === currentSortColumn) {
                icon.classList.remove('fa-sort');
                icon.classList.add(currentSortOrder === 'ASC' ? 'fa-sort-up' : 'fa-sort-down');
                
                // Update aria-sort attribute for accessibility
                th.setAttribute('aria-sort', currentSortOrder === 'ASC' ? 'ascending' : 'descending');
            } else {
                icon.classList.remove('fa-sort-up', 'fa-sort-down');
                icon.classList.add('fa-sort');
                th.removeAttribute('aria-sort');
            }
            
            // Add icon if it doesn't exist
            if (!th.querySelector('i')) {
                th.appendChild(icon);
            }
        });
    }

    // Event handlers
    function handleSearch() {
        currentPage = 1;
        fetchDonations(searchInput.value);
    }

    // Event listeners
    tableHeaders.forEach(th => {
        if (th.dataset.column) {
            th.addEventListener('click', function() {
                handleSortClick(this.dataset.column);
            });
            
            // Make sortable headers more accessible
            th.setAttribute('role', 'button');
            th.setAttribute('tabindex', '0');
            th.setAttribute('aria-label', `Sort by ${th.textContent.trim()}`);
            
            // Allow keyboard sorting
            th.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSortClick(this.dataset.column);
                }
            });
        }
    });

    // 修复搜索按钮事件监听器
    if (searchButton) {
        searchButton.addEventListener("click", handleSearch);
    }

    // 修复搜索输入框回车键事件监听器
    if (searchInput) {
        searchInput.addEventListener("keypress", function(e) {
            if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
            }
        });
    }

    donationTableBody.addEventListener('click', function(e) {
        const target = e.target;
        const id = target.dataset.id;
        
        if (!id) return;
        
        if (target.classList.contains('btn-edit')) {
            editDonation(id);
        } else if (target.classList.contains('btn-delete')) {
            deleteDonation(id);
        }
    });
    
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener("change", function() {
            itemsPerPage = parseInt(this.value);
            currentPage = 1;
            fetchDonations(searchInput.value);
        });
    }

    // Table column resizing
    function initializeResizableColumns() {
        tableHeaders.forEach(th => {
            // Create resizer element if it doesn't exist
            let resizer = th.querySelector('.resizer');
            if (!resizer) {
                resizer = document.createElement('div');
                resizer.className = 'resizer';
                th.appendChild(resizer);
            }
            
            let startX, startWidth;
            
            resizer.addEventListener('mousedown', function(e) {
                startX = e.pageX;
                startWidth = th.offsetWidth;
                
                const tableContainer = table.closest('.table-container');
                if (tableContainer) {
                    tableContainer.classList.add('resizing');
                }
                
                document.addEventListener('mousemove', resizeColumn);
                document.addEventListener('mouseup', stopResize);
                e.preventDefault();
            });
            
            function resizeColumn(e) {
                const width = startWidth + (e.pageX - startX);
                if (width >= 50) { // Minimum width
                    th.style.width = `${width}px`;
                }
            }
            
            function stopResize() {
                const tableContainer = table.closest('.table-container');
                if (tableContainer) {
                    tableContainer.classList.remove('resizing');
                }
                
                document.removeEventListener('mousemove', resizeColumn);
                document.removeEventListener('mouseup', stopResize);
                
                // Save column widths
                saveColumnWidths();
            }
        });
        
        // Load saved column widths
        loadColumnWidths();
    }

    // Save column widths to localStorage
    function saveColumnWidths() {
        const columnWidths = {};
        
        tableHeaders.forEach(th => {
            if (th.dataset.column && th.style.width) {
                columnWidths[th.dataset.column] = th.style.width;
            }
        });
        
        localStorage.setItem('donationTableColumnWidths', JSON.stringify(columnWidths));
    }
    
    // Load column widths from localStorage
    function loadColumnWidths() {
        const savedWidths = localStorage.getItem('donationTableColumnWidths');
        if (savedWidths) {
            try {
                const columnWidths = JSON.parse(savedWidths);
                
                tableHeaders.forEach(th => {
                    if (th.dataset.column && columnWidths[th.dataset.column]) {
                        th.style.width = columnWidths[th.dataset.column];
                    }
                });
            } catch (e) {
                console.error('Failed to load saved column widths:', e);
            }
        }
    }

    // Global functions
    window.editDonation = function(id) {
        window.location.href = `donate.html?id=${id}`;
    };

    window.deleteDonation = async function(id) {
        if (confirm("确定要删除这个捐赠记录吗？")) {
            try {
                const response = await fetch(`${API_BASE_URL}`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ table: "donation", id: id }),
                });

                // Handle different HTTP status codes
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error("The donation record could not be found.");
                    } else if (response.status === 403) {
                        throw new Error("You don't have permission to delete this record.");
                    } else {
                        throw new Error(`Server responded with status: ${response.status}`);
                    }
                }

                const data = await response.json();
                if (data.success || data.status === 'success') {
                    alert("捐赠记录已成功删除！");
                    fetchDonations(searchInput.value);
                } else {
                    alert("删除捐赠记录失败: " + (data.message || "未知错误"));
                }
            } catch (error) {
                console.error("Error deleting donation:", error);
                alert("删除捐赠记录时发生错误，请稍后再试。" + error.message);
            }
        }
    };

    // Initialize resizable columns
    initializeResizableColumns();

    // Initial fetch
    fetchDonations();
});