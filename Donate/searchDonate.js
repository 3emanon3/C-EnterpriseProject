const API_BASE_URL = 'http://localhost/projects/C-EnterpriseProject/recervingAPI.php';

document.addEventListener("DOMContentLoaded", function () {
    // Element references
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");
    const totalDonations = document.getElementById("totalDonations");
    const loader = document.querySelector(".loader");
    const itemsPerPageSelect = document.getElementById("itemsPerPage");
    const table = document.getElementById('donationTable');
    const tableHeaders = table.querySelectorAll('th');
    const donationTableBody = table.querySelector('tbody');
    
    // Only create pagination container if it doesn't exist
    const paginationContainer = document.querySelector(".pagination");
    if (!paginationContainer) {
        console.warn("Pagination container not found, creating one");
        const paginationDiv = document.createElement("div");
        paginationDiv.className = "pagination";
        document.querySelector(".pagination-container").prepend(paginationDiv);
    }

    // State variables
    let currentSortColumn = null;
    let currentSortOrder = null;
    let donationData = []; 
    let itemsPerPage = parseInt(itemsPerPageSelect.value);
    let currentPage = 1;
    let totalPages = 0;
    let isListingAll = true; // Flag to indicate listing all data

    async function fetchDonations(query = "") {
        loader.style.display = "flex";
      
        // Create params object instead of using append
        const params = new URLSearchParams({
            table: "donation",
            includeInactive: true,  // Add this if needed
            includeDeleted: true ,   // Add this if needed
            page: currentPage,
    limit: itemsPerPage,
        });
        
        if (query && query.trim()) {
            params.append("search", query.trim());
            isListingAll = false; // Indicate not listing all when search query is present  // UPGRADE: Set isListingAll to false when search query is present
        } else {
            isListingAll = true; // Back to listing all if query is empty // UPGRADE: Set isListingAll back to true when query is empty
        }
    
        if (currentSortColumn) {
            // Ensure the column names match what the API expects
            const apiColumnName = mapColumnNameToApi(currentSortColumn);
            params.append("sort", apiColumnName);
            params.append("order", currentSortOrder || 'ASC');
        }
    
        const url = `${API_BASE_URL}?${params.toString()}`;
        console.log("Fetching from URL:", url); // Debug log
    
        try {
            const response = await fetch(url);
            console.log("Raw response status:", response.status);
            

            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("API Response :", data); // Log the entire response
            
            // More detailed safety checks
            if (!data|| typeof data !== 'object') {
                throw new Error("Empty response received");
            }
            
           
            
            // Check for data array, handle both formats that API might return
            let processedData = Array.isArray(data) ? data : data.data || [];
            let totalCount = data.total || processedData.length;
            
            
            donationData = processedData;
            totalDonations.textContent = totalCount;
            totalPages = Math.ceil(totalCount / itemsPerPage); // Always calculate pages
            displayDonations(donationData);
            updatePagination();
           
        } catch (error) {
            console.error("Error fetching donations:", error);
            donationTableBody.innerHTML = `<tr><td colspan="10" class="error-message">Failed to load donations. Please try again later. Error: ${error.message}</td></tr>`;
            totalDonations.textContent = "0";
            totalPages = 0;
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
            'donationTypes': 'donationTypes',
            'Bank': 'Bank',
            'membership': 'membership',
            'payment_date': 'paymentDate',
            'receipt_no': 'official receipt no',
            'amount': 'amount',
            'remarks': 'Remarks'
        };
        
        return mapping[columnName] || columnName;
    }

    function displayDonations(donations) {
        console.log("Displaying donations:", donations);
        donationTableBody.innerHTML = "";
        
        if (!Array.isArray(donations) || donations.length === 0) {
            console.log("No donations to display");
            donationTableBody.innerHTML = `<tr><td colspan="10" class="no-data">No donations found</td></tr>`;
            return;
        }
    
        console.log(`Processing ${donations.length} donations for display`);
        
        donations.forEach(donation => {
            if (!donation || typeof donation !== 'object') {
                console.warn("Invalid donation object:", donation);
                return;
            }
            
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
            const paymentDate = donation.paymentDate || donation.payment_date || '';
            const receiptNo = donation['official receipt no'] || donation.receipt_no || '';
            const amount = donation.amount || 0;
            const remarks = donation.Remarks || donation.remarks || '';
            
            row.innerHTML = `
                <td>${id}</td>
                <td>${donorName}</td>
                <td>${donationType}</td>
                <td>${bank}</td>
                <td>${membership}</td>
                <td>${formatDateTime(paymentDate) || ''}</td>
                <td>${receiptNo}</td>
                <td>${amount ? formatPrice(amount) : ''}</td>
                <td>${truncateText(remarks, 50) || ''}</td>
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
        return str
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
        return `¥${parseFloat(price).toFixed(2)}`;
    }

    function updatePagination() {
        const paginationContainer = document.querySelector(".pagination");
        if (!paginationContainer) return;

        
       
        const paginationHTML = [];
        
        // Previous page button
        paginationHTML.push(`
            <button class="pagination-btn" 
                    ${currentPage === 1 ? 'disabled' : ''} 
                    data-page="${currentPage - 1}"
                    aria-label="Previous page">
                上一页
            </button>
        `);

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                paginationHTML.push(`
                    <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                            data-page="${i}"
                            aria-label="Page ${i}"
                            ${i === currentPage ? 'aria-current="page"' : ''}>
                        ${i}
                    </button>
                `);
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                paginationHTML.push('<span class="pagination-ellipsis" aria-hidden="true">...</span>');
            }
        }

        // Next page button
        paginationHTML.push(`
            <button class="pagination-btn" 
                    ${currentPage === totalPages ? 'disabled' : ''} 
                    data-page="${currentPage + 1}"
                    aria-label="Next page">
                下一页
            </button>
        `);

        // Page jump
        paginationHTML.push(`
            <div class="pagination-info" aria-live="polite">
                <span class="page-indicator">Page ${currentPage} of ${totalPages}</span>
                <div class="page-jump">
                    <input type="number" 
                           id="pageInput" 
                           min="1" 
                           max="${totalPages}" 
                           placeholder="页码"
                           aria-label="Jump to page"
                           class="page-input">
                    <button id="jumpBtn" class="jump-btn" aria-label="Jump to the specified page">跳转</button>
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

        // Add event listener to jump button
        const jumpBtn = document.getElementById('jumpBtn');
        if (jumpBtn) {
            jumpBtn.addEventListener('click', jumpToPage);
        }

        // Add event listener to page input for Enter key
        const pageInput = document.getElementById('pageInput');
        if (pageInput) {
            pageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    jumpToPage();
                }
            });
        }
    
}

    function changePage(page) {
        if (page < 1 || page > totalPages) return;
        currentPage = page;
        fetchDonations(searchInput.value);
    }

    function jumpToPage() {
        const pageInput = document.getElementById('pageInput');
        if (!pageInput) return;
        
        let targetPage = parseInt(pageInput.value);
        if (isNaN(targetPage)) return;
        
        targetPage = Math.max(1, Math.min(targetPage, totalPages));
        if (targetPage !== currentPage) {
            currentPage = targetPage;
            fetchDonations(searchInput.value);
        }
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
            const icon = th.querySelector('i');
            if (!icon) return;
            
            icon.classList.remove('fa-sort', 'fa-sort-up', 'fa-sort-down');
            
            if (th.dataset.column === currentSortColumn) {
                const newClass = currentSortOrder === 'ASC' ? 'fa-sort-up' : 'fa-sort-down';
                icon.classList.add(newClass);
                
                // Update aria-sort attribute for accessibility
                th.setAttribute('aria-sort', currentSortOrder === 'ASC' ? 'ascending' : 'descending');
            } else {
                icon.classList.add('fa-sort');
                th.removeAttribute('aria-sort');
            }
        });
    }

    // Event handlers
    function handleSearch() {
        currentPage = 1;
        isListingAll = true; // Explicitly reset
        fetchDonations("");
    }

    function handleEmptySearch() {
        if (!searchInput.value.trim()) {
            currentPage = 1;
            fetchDonations();
        }
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

    searchButton.addEventListener("click", handleSearch);

    searchInput.addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSearch();
        }
    });

    searchInput.addEventListener("input", handleEmptySearch);

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
    
    itemsPerPageSelect.addEventListener("change", function() {
        itemsPerPage = parseInt(this.value);
        currentPage = 1;
        fetchDonations(searchInput.value);
    });

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
        window.location.href = `edit_donation.html?id=${id}`;
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
                if (data.success) {
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

    // Table column resizing
    tableHeaders.forEach(th => {
        const resizer = th.querySelector('.resizer');
        if (!resizer) return;

        let startX, startWidth;

        resizer.addEventListener('mousedown', function(e) {
            startX = e.pageX;
            startWidth = th.offsetWidth;
            
            function resizeColumn(e) {
                const newWidth = startWidth + (e.pageX - startX);
                if (newWidth > 50) {
                    th.style.width = newWidth + 'px';
                }
            }

            function stopResize() {
                document.removeEventListener('mousemove', resizeColumn);
                document.removeEventListener('mouseup', stopResize);
                
                // Save column widths when resizing is done
                saveColumnWidths();
            }
            
            document.addEventListener('mousemove', resizeColumn);
            document.addEventListener('mouseup', stopResize);
            e.preventDefault();
        });
    });

    // Load saved column widths
    loadColumnWidths();

    // Initial fetch
    fetchDonations();
});