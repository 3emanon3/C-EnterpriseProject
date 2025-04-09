document.addEventListener("DOMContentLoaded", function () {
    // Element references
    const API_BASE_URL = 'http://localhost/projects/C-EnterpriseProject/recervingAPI.php';
    const searchInput = document.getElementById("searchInput");
    // Removed searchButton reference as it seems unused/redundant with debounced input
    const totalDonations = document.getElementById("totalDonations");
    const loader = document.querySelector(".loader");
    const itemsPerPageSelect = document.getElementById("itemsPerPage");
    const table = document.getElementById('donationTable');
    const tableHeaders = table.querySelectorAll('th[data-column]'); // More specific selector
    const donationTableBody = table.querySelector('tbody');
    const paginationContainer = document.querySelector(".pagination");
    const prevPageButton = document.getElementById("prevPage");
    const nextPageButton = document.getElementById("nextPage");
    const bankSearchBtn = document.getElementById("bankSearchBtn");
    const donationTypeFilterBtn = document.getElementById("donationTypeFilterBtn"); // New button reference

    // State variables
    let currentSortColumn = null;
    let currentSortOrder = 'ASC'; // Default sort order
    let donationData = [];
    let itemsPerPage = parseInt(itemsPerPageSelect.value);
    let currentPage = 1;
    let totalPages = 0;
    // let currentSearchType = 'all'; // This flag seems less necessary now, filters determine the state
    let currentBankFilter = null; // Stores selected bank NAME or null
    let currentDonationTypeFilter = null; // Stores selected donation type NAME or null

    // Data caches for display purposes only
    let DONATION_TYPES = {}; // Stores { id: name }
    let BANKS = {};          // Stores { id: name }

    // --- Data Fetching for Filters ---

    async function fetchFilterData(type) {
        const url = `${API_BASE_URL}?table=${type}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${type} data: ${response.status}`);
            }
            const data = await response.json();
            if (data && data.data && Array.isArray(data.data)) {
                const map = {};
                const keyField = (type === 'bank') ? 'Bank' : 'donationTypes'; // Field containing the name
                data.data.forEach(item => {
                    // Use the actual name field (Bank or donationTypes) as the value for filtering
                    // The key remains the ID for potential internal use, though filtering uses names now
                    map[item.ID] = item[keyField];
                });
                console.log(`${type} data loaded for display/filtering:`, map);
                return map;
            } else {
                console.error(`Invalid ${type} data format received`);
                return {};
            }
        } catch (error) {
            console.error(`Error fetching ${type} data:`, error);
            return {}; // Return empty object on error
        }
    }

    async function initializeFilters() {
        // Fetch both sets of data concurrently
        [BANKS, DONATION_TYPES] = await Promise.all([
            fetchFilterData('bank'),
            fetchFilterData('donationtypes') // Ensure endpoint matches API
        ]);
        // Update buttons initially
        updateBankFilterButtonText();
        updateDonationTypeFilterButtonText();
        // Initial data load
        fetchDonations();
    }


    // --- Mapping Functions ---
    // These are less critical now if filtering/display uses names directly, but kept for potential compatibility
    function mapDonationTypeIdToName(typeId) {
        return DONATION_TYPES[typeId] || typeId; // Fallback to ID if not found
    }

    function mapBankIdToName(bankId) {
        return BANKS[bankId] || bankId; // Fallback to ID if not found
    }

    // --- Generic Modal Creation ---
    function createFilterModal({ modalId, title, dataMap, currentFilterValue, filterKey, filterAttribute, iconClass, allOptionText, onSelect }) {
        // Remove existing modals of this type
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal elements
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.id = modalId;

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content'; // Generic class

        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        modalHeader.innerHTML = `
            <h3>${title}</h3>
            <button class="close-btn" aria-label="关闭">×</button>
        `;

        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body filter-selection-grid'; // Generic class

        // Add "All" option
        const allOptionDiv = document.createElement('div');
        // Check if currentFilterValue is null or empty string for 'All' selection
        allOptionDiv.className = `filter-option-card ${!currentFilterValue ? 'selected' : ''}`;
        allOptionDiv.setAttribute(filterAttribute, ''); // Empty value signifies 'All'
        allOptionDiv.innerHTML = `
            <div class="filter-option-icon"><i class="fas fa-list"></i></div>
            <div class="filter-option-name">${allOptionText}</div>
        `;
        modalBody.appendChild(allOptionDiv);

        // Add options for each item in the dataMap (using the NAME as the value)
        Object.entries(dataMap).forEach(([id, name]) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = `filter-option-card ${currentFilterValue === name ? 'selected' : ''}`;
            optionDiv.setAttribute(filterAttribute, name); // Use the NAME as the value
            optionDiv.innerHTML = `
                <div class="filter-option-icon"><i class="fas ${iconClass}"></i></div>
                <div class="filter-option-name">${name}</div>
            `;
            modalBody.appendChild(optionDiv);
        });

        // Assemble modal
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        modalOverlay.appendChild(modalContent);

        // Add modal to DOM
        document.body.appendChild(modalOverlay);
        // Force reflow to enable transition
        modalOverlay.offsetHeight;
        modalOverlay.classList.add('visible'); // Add class to trigger transition

        // Event listeners for modal
        const closeModal = () => {
            modalOverlay.classList.remove('visible');
            // Remove after transition ends
            modalOverlay.addEventListener('transitionend', () => {
                 if (document.body.contains(modalOverlay)) {
                    modalOverlay.remove();
                 }
            }, { once: true });
        };

        modalContent.querySelector('.close-btn').addEventListener('click', closeModal);

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });

        // Handle option selection
        modalBody.querySelectorAll('.filter-option-card').forEach(option => {
            option.addEventListener('click', () => {
                const selectedValue = option.getAttribute(filterAttribute);
                onSelect(selectedValue || null); // Pass null if 'All' (empty string) was selected
                closeModal();
            });
        });
    }

    // --- Bank Filter Specific Functions ---
    function openBankFilterModal() {
        createFilterModal({
            modalId: 'bankFilterModal',
            title: '选择银行',
            dataMap: BANKS,
            currentFilterValue: currentBankFilter,
            filterKey: 'Bank',
            filterAttribute: 'data-bank-name',
            iconClass: 'fa-landmark',
            allOptionText: '所有银行',
            onSelect: (selectedBankName) => {
                currentBankFilter = selectedBankName;
                currentPage = 1;
                updateBankFilterButtonText();
                fetchDonations(searchInput.value);
            }
        });
    }

    function updateBankFilterButtonText() {
        if (bankSearchBtn) {
            if (currentBankFilter) {
                bankSearchBtn.innerHTML = `<i class="fas fa-filter"></i> ${escapeHTML(currentBankFilter)}`;
                bankSearchBtn.classList.add('active-filter');
            } else {
                bankSearchBtn.innerHTML = `<i class="fas fa-university"></i> 银行筛选`;
                bankSearchBtn.classList.remove('active-filter');
            }
        }
    }

    // --- Donation Type Filter Specific Functions ---
    function openDonationTypeFilterModal() {
        createFilterModal({
            modalId: 'donationTypeFilterModal',
            title: '选择乐捐类型',
            dataMap: DONATION_TYPES,
            currentFilterValue: currentDonationTypeFilter,
            filterKey: 'donationTypes',
            filterAttribute: 'data-donation-type-name',
            iconClass: 'fa-tag', // Single tag icon
            allOptionText: '所有类型',
            onSelect: (selectedTypeName) => {
                currentDonationTypeFilter = selectedTypeName;
                currentPage = 1;
                updateDonationTypeFilterButtonText();
                fetchDonations(searchInput.value);
            }
        });
    }

    function updateDonationTypeFilterButtonText() {
        if (donationTypeFilterBtn) {
            if (currentDonationTypeFilter) {
                // Truncate long type names on the button for display
                const displayName = currentDonationTypeFilter.length > 15
                    ? currentDonationTypeFilter.substring(0, 12) + '...'
                    : currentDonationTypeFilter;
                donationTypeFilterBtn.innerHTML = `<i class="fas fa-filter"></i> ${escapeHTML(displayName)}`;
                donationTypeFilterBtn.title = `筛选: ${escapeHTML(currentDonationTypeFilter)}`; // Full name on hover
                donationTypeFilterBtn.classList.add('active-filter');
            } else {
                donationTypeFilterBtn.innerHTML = `<i class="fas fa-tags"></i> 类型筛选`;
                donationTypeFilterBtn.title = ''; // Clear title
                donationTypeFilterBtn.classList.remove('active-filter');
            }
        }
    }

    // --- Debounce Function ---
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

    // --- Core Data Fetching and Display ---
    async function fetchDonations(query = "") {
        loader.style.display = "flex"; // Use flex to center content
        donationTableBody.innerHTML = ""; // Clear previous results

        const params = new URLSearchParams({
            table: "donation_details",
            page: currentPage,
            limit: itemsPerPage,
        });

        const searchTerm = query.trim();
        let isSearching = false;

        // Add search term if present
        if (searchTerm) {
            params.append("search", searchTerm);
            isSearching = true;
        }

        // Add bank filter if active (using NAME)
        if (currentBankFilter) {
            params.append("Bank", currentBankFilter);
            params.append("search", "true");
            isSearching = true;
        }

        // Add donation type filter if active (using NAME)
        if (currentDonationTypeFilter) {
            params.append("donationTypes", currentDonationTypeFilter);
            params.append("search", "true");
            isSearching = true;
        }

        // The backend API needs to know when to apply filters vs just listing all.
        // Add a flag if any search/filter criteria are active.
        // The original code added search=true only for bank filter or text search.
        // Let's add it if *any* filter/search is active.
        if (isSearching) {
             // Check if the API actually needs this 'search=true' parameter
             // If the API filters whenever Bank or donationTypes params are present,
             // this might be redundant. Adjust based on API behavior.
             // For now, assuming it might be needed:
             // params.append("search", "true"); // Or whatever flag the API expects
        }


        // Add sorting parameters
        if (currentSortColumn) {
            const apiColumnName = mapColumnNameToApi(currentSortColumn);
            params.append("sort", apiColumnName);
            params.append("order", currentSortOrder || 'ASC');
        }

        const url = `${API_BASE_URL}?${params.toString()}`;
        console.log("API Request URL:", url);

        try {
            const response = await fetch(url);
            console.log("Raw response status:", response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Server error response: ${errorText}`);
                throw new Error(`Server responded with status: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log("API Response Data:", data);

            // Standardize data access (assuming API returns { data: [], total: N } or similar)
            if (data && typeof data === 'object') {
                donationData = Array.isArray(data.data) ? data.data : [];
                // Look for total in common places
                const totalRecords = data.total || data.pagination?.total_records || donationData.length;
                 totalDonations.textContent = totalRecords;
                 totalPages = Math.ceil(parseInt(totalRecords) / itemsPerPage);
                 // Ensure totalPages is at least 1 if there are records, or 0 if none
                 if (totalRecords > 0 && totalPages === 0) totalPages = 1;
                 if (totalRecords === 0) totalPages = 0;

            } else {
                 // Handle cases where the response might be just an array (less ideal)
                 if (Array.isArray(data)) {
                     donationData = data;
                     totalDonations.textContent = data.length; // Might be inaccurate if paginated server-side without total
                     // Estimate total pages if not provided - less reliable
                     totalPages = (currentPage === 1 && data.length < itemsPerPage) ? 1 : Math.max(currentPage, 1);
                     console.warn("API did not provide total records count; pagination might be limited.");
                 } else {
                    throw new Error("Invalid data format received from API.");
                 }
            }


            displayDonations(donationData);
            updatePagination();
            updateSortIcons();

        } catch (error) {
            console.error("Error fetching or processing donations:", error);
            donationTableBody.innerHTML = `<tr><td colspan="10" class="error-message">加载乐捐记录失败. 错误: ${escapeHTML(error.message)}</td></tr>`;
            // Reset state on error
            donationData = [];
            totalDonations.textContent = 0;
            totalPages = 0;
            updatePagination();
        } finally {
            loader.style.display = "none";
        }
    }

    function mapColumnNameToApi(columnName) {
        // Mapping from HTML data-column to API field names
        const mapping = {
            'id': 'ID',
            'donor_name': 'Name/Company_Name',
            'donationTypes': 'donationTypes', // Assumes API uses this name
            'Bank': 'Bank',                 // Assumes API uses this name
            'membership': 'membership',
            'payment_date': 'paymentDate',
            'receipt_no': 'official_receipt_no',
            'amount': 'amount',
            'Remarks': 'Remarks'
        };
        return mapping[columnName] || columnName; // Fallback to original name
    }

    function displayDonations(donations) {
        console.log("Attempting to display donations:", donations);
        donationTableBody.innerHTML = ""; // Clear previous content

        if (!Array.isArray(donations) || donations.length === 0) {
            let message = '暂无乐捐记录';
            if (searchInput.value.trim() || currentBankFilter || currentDonationTypeFilter) {
                message = '没有找到匹配的记录';
            }
            donationTableBody.innerHTML = `<tr><td colspan="10" class="no-data">${message}</td></tr>`;
            return;
        }

        console.log(`Rendering ${donations.length} donation rows.`);

        // Calculate starting display ID for the current page
        const startDisplayId = (currentPage - 1) * itemsPerPage + 1;

        donations.forEach((donation, index) => {
            const databaseId = donation.ID || donation.id; // Get the actual ID
            if (!databaseId) {
                console.warn("Skipping donation row due to missing ID:", donation);
                return; // Skip rendering if no ID
            }
            const displayId = startDisplayId + index; // Sequential ID for display

            const row = document.createElement("tr");
            row.setAttribute('id', `donation-row-${databaseId}`); // Use actual ID for the row ID

            // Extract data, using fallbacks and mapping where needed
            const donorName = donation['Name/Company_Name'] || donation.donor_name || '-';
            // Directly use the name from the data if available, otherwise map ID (less likely needed now)
            const donationType = donation.donationTypes || mapDonationTypeIdToName(donation.donation_type) || '-';
            const bank = donation.Bank || mapBankIdToName(donation.bank) || '-';
            const membership = donation.membership || '非会员'; // Localized text
            const paymentDate = formatDateTime(donation.paymentDate || donation.payment_date);
            const receiptNo = donation['official_receipt_no'] || donation.receipt_no || '-';
            const amount = formatPrice(donation.amount);
            const remarks = donation.Remarks || donation.remarks || ''; // Get full remarks

            row.innerHTML = `
                <td>${displayId}</td>
                <td>${escapeHTML(donorName)}</td>
                <td>${escapeHTML(donationType)}</td>
                <td>${escapeHTML(bank)}</td>
                <td>${escapeHTML(membership)}</td>
                <td>${paymentDate || '-'}</td>
                <td>${escapeHTML(receiptNo)}</td>
                <td style="text-align: right;">${amount}</td>
                <td>${truncateText(remarks, 50)}</td>
                <td>
                    <button class="btn btn-edit" data-id="${databaseId}" onclick="editDonation('${databaseId}')" aria-label="编辑 ${displayId}">编辑</button>
                    <button class="btn btn-delete" data-id="${databaseId}" onclick="deleteDonation('${databaseId}')" aria-label="删除 ${displayId}">删除</button>
                </td>
            `;
            donationTableBody.appendChild(row);
        });
    }

    // --- Utility Functions ---

    function truncateText(text, maxLength) {
        if (!text) return '';
        const escapedText = escapeHTML(text);
        if (text.length > maxLength) {
            // Add a title attribute for the full text tooltip
            return `<span title="${escapedText}">${escapedText.substring(0, maxLength)}...</span>`;
        }
        return escapedText;
    }

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
        if (!dateTimeStr) return null; // Return null instead of empty string
        try {
            const date = new Date(dateTimeStr);
            // Check if the date is valid
            if (isNaN(date.getTime())) {
                 console.warn("Invalid date format received:", dateTimeStr);
                 return dateTimeStr; // Return original string if invalid
            }
            // Format to YYYY-MM-DD HH:MM (more standard)
            return date.toLocaleString('sv-SE', { // Swedish locale gives YYYY-MM-DD HH:MM
                 year: 'numeric',
                 month: '2-digit',
                 day: '2-digit',
                 hour: '2-digit',
                 minute: '2-digit',
                 hour12: false // Use 24-hour format
            });
        } catch (e) {
            console.error("Error formatting date:", dateTimeStr, e);
            return dateTimeStr; // Return original on error
        }
    }


    function formatPrice(price) {
        const num = parseFloat(price);
        if (isNaN(num)) return '-'; // Return dash if not a valid number
        // Format as Malaysian Ringgit
        return `RM ${num.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }


    // --- Pagination ---

    function updatePagination() {
        if (!paginationContainer) return;

        // Clear previous pagination buttons
        paginationContainer.innerHTML = '';

        // Handle case of no pages
        if (totalPages <= 0) {
             prevPageButton.disabled = true;
             nextPageButton.disabled = true;
             document.querySelector('.pagination-container .items-per-page').style.display = 'none'; // Hide controls if no data
             document.querySelector('.pagination-container .pagination-info')?.remove(); // Remove jump section
             return;
        } else {
             document.querySelector('.pagination-container .items-per-page').style.display = 'flex'; // Show controls
        }


        // Enable/disable Prev/Next buttons
        prevPageButton.disabled = (currentPage <= 1);
        nextPageButton.disabled = (currentPage >= totalPages);

        // Generate page number buttons
        const MAX_VISIBLE_PAGES = 5; // Max number of page buttons to show (excluding first/last)
        const buttons = [];

        // Always show first page
        buttons.push(createPageButton(1));

        // Ellipsis after first page if needed
        if (currentPage > MAX_VISIBLE_PAGES / 2 + 2) {
            buttons.push(createEllipsis());
        }

        // Calculate start and end for middle pages
        let startPage = Math.max(2, currentPage - Math.floor(MAX_VISIBLE_PAGES / 2));
        let endPage = Math.min(totalPages - 1, currentPage + Math.floor(MAX_VISIBLE_PAGES / 2));

        // Adjust start/end if near the beginning or end
         if (currentPage <= MAX_VISIBLE_PAGES / 2 + 1) {
            endPage = Math.min(totalPages - 1, MAX_VISIBLE_PAGES);
        }
         if (currentPage >= totalPages - MAX_VISIBLE_PAGES / 2) {
            startPage = Math.max(2, totalPages - MAX_VISIBLE_PAGES + 1);
        }


        // Add middle page numbers
        for (let i = startPage; i <= endPage; i++) {
            buttons.push(createPageButton(i));
        }

        // Ellipsis before last page if needed
        if (currentPage < totalPages - MAX_VISIBLE_PAGES / 2 - 1) {
             buttons.push(createEllipsis());
        }

        // Always show last page (if more than 1 page)
        if (totalPages > 1) {
            buttons.push(createPageButton(totalPages));
        }

        // Add generated buttons to the DOM
        buttons.forEach(btn => paginationContainer.appendChild(btn));


         // Add Page Jump section (if it doesn't exist)
         let paginationInfo = document.querySelector('.pagination-container .pagination-info');
         if (!paginationInfo) {
             paginationInfo = document.createElement('div');
             paginationInfo.className = 'pagination-info';
             // Insert it after the next page button (or adjust layout as needed)
             nextPageButton.parentNode.insertBefore(paginationInfo, itemsPerPageSelect.parentNode);
         }

         paginationInfo.innerHTML = `
            <span class="page-indicator" aria-live="polite">第 ${currentPage} / ${totalPages} 页</span>
            ${totalPages > 1 ? `
            <div class="page-jump">
                <input type="number"
                       id="pageInput"
                       min="1"
                       max="${totalPages}"
                       placeholder="页码"
                       aria-label="跳转到页码"
                       class="page-input">
                <button onclick="jumpToPage()" class="jump-btn" aria-label="跳转">跳转</button>
            </div>` : ''}
        `;

         // Re-attach event listener for Enter key on page input
         const pageInput = document.getElementById('pageInput');
         if (pageInput) {
             pageInput.addEventListener('keypress', (e) => {
                 if (e.key === 'Enter') {
                     e.preventDefault(); // Prevent potential form submission
                     jumpToPage();
                 }
             });
         }
    }


    function createPageButton(page) {
        const button = document.createElement('button');
        button.className = `pagination-btn ${page === currentPage ? 'active' : ''}`;
        button.dataset.page = page;
        button.textContent = page;
        button.setAttribute('aria-label', `第 ${page} 页`);
        if (page === currentPage) {
            button.setAttribute('aria-current', 'page');
        }
        button.addEventListener('click', function () {
            changePage(parseInt(this.dataset.page));
        });
        return button;
    }

    function createEllipsis() {
        const span = document.createElement('span');
        span.className = 'pagination-ellipsis';
        span.innerHTML = '…';
        span.setAttribute('aria-hidden', 'true');
        return span;
    }


    function changePage(page) {
        if (page >= 1 && page <= totalPages && page !== currentPage) {
            currentPage = page;
            fetchDonations(searchInput.value);
        }
    }

    // Make jumpToPage globally accessible if called via onclick
    window.jumpToPage = function() {
        const pageInput = document.getElementById('pageInput');
        if (!pageInput) return;

        const targetPage = parseInt(pageInput.value);

        if (isNaN(targetPage) || targetPage < 1 || targetPage > totalPages) {
            alert(`请输入 1 到 ${totalPages} 之间的有效页码`);
            pageInput.focus(); // Keep focus on input for correction
            pageInput.select(); // Select current input
            return;
        }

        if (targetPage !== currentPage) {
            changePage(targetPage);
        }

        pageInput.value = ''; // Clear input after jump
    }

    // --- Sorting ---

    function handleSortClick(columnName) {
        if (currentSortColumn === columnName) {
            // Cycle through ASC -> DESC -> None
            if (currentSortOrder === 'ASC') {
                currentSortOrder = 'DESC';
            } else if (currentSortOrder === 'DESC') {
                 currentSortColumn = null; // Remove sorting
                 currentSortOrder = 'ASC'; // Reset default order
            }
        } else {
            // New column selected, start with ASC
            currentSortColumn = columnName;
            currentSortOrder = 'ASC';
        }
        currentPage = 1; // Reset to first page when sorting changes
        // fetchDonations will handle updating icons via updateSortIcons
        fetchDonations(searchInput.value);
    }


    function updateSortIcons() {
        tableHeaders.forEach(th => {
            const icon = th.querySelector('i.fas'); // Target only Font Awesome icons
            if (!icon) return; // Skip if no icon element found

            // Reset classes first
            icon.classList.remove('fa-sort', 'fa-sort-up', 'fa-sort-down');
            th.removeAttribute('aria-sort');

            if (th.dataset.column === currentSortColumn) {
                // Add specific sort icon and ARIA attribute
                if (currentSortOrder === 'ASC') {
                    icon.classList.add('fa-sort-up');
                    th.setAttribute('aria-sort', 'ascending');
                } else {
                    icon.classList.add('fa-sort-down');
                    th.setAttribute('aria-sort', 'descending');
                }
            } else {
                // Add default sort icon for non-active columns
                icon.classList.add('fa-sort');
            }
        });
    }


    // --- Column Resizing ---

    function initializeResizableColumns() {
        let currentResizer = null;
        let startX, startWidth, thBeingResized;

        tableHeaders.forEach(th => {
            let resizer = th.querySelector('.resizer');
            if (!resizer) {
                resizer = document.createElement('div');
                resizer.className = 'resizer';
                th.appendChild(resizer);
            }

            resizer.addEventListener('mousedown', (e) => {
                // Prevent sorting when starting resize
                e.stopPropagation();

                currentResizer = e.target;
                thBeingResized = currentResizer.parentElement;
                startX = e.pageX;
                startWidth = thBeingResized.offsetWidth;

                // Add resizing class to table container for cursor style
                table.closest('.table-container')?.classList.add('resizing');

                // Attach listeners to document for wider drag area
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
            });
        });

        function handleMouseMove(e) {
            if (!currentResizer) return;
            const width = startWidth + (e.pageX - startX);
            // Set a minimum width (e.g., 50px)
            if (width >= 50) {
                thBeingResized.style.width = `${width}px`;
                // Adjust table layout dynamically if needed (might impact performance)
                // table.style.tableLayout = 'auto'; // Temporarily allow auto layout
                // table.style.tableLayout = 'fixed'; // Revert to fixed layout
            }
        }

        function handleMouseUp() {
            if (!currentResizer) return;

            // Remove resizing class
            table.closest('.table-container')?.classList.remove('resizing');

            // Remove document listeners
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);

            // Save the new widths
            saveColumnWidths();

            // Reset state
            currentResizer = null;
            thBeingResized = null;
        }

        // Load saved widths on initialization
        loadColumnWidths();
    }


    function saveColumnWidths() {
        const columnWidths = {};
        tableHeaders.forEach(th => {
            if (th.dataset.column && th.style.width) {
                columnWidths[th.dataset.column] = th.style.width;
            }
        });
        try {
            localStorage.setItem('donationTableColumnWidths', JSON.stringify(columnWidths));
        } catch (e) {
            console.error("Failed to save column widths to localStorage:", e);
        }
    }

    function loadColumnWidths() {
        try {
            const savedWidths = localStorage.getItem('donationTableColumnWidths');
            if (savedWidths) {
                const columnWidths = JSON.parse(savedWidths);
                tableHeaders.forEach(th => {
                    if (th.dataset.column && columnWidths[th.dataset.column]) {
                        th.style.width = columnWidths[th.dataset.column];
                    }
                });
            }
        } catch (e) {
            console.error('Failed to load or parse saved column widths:', e);
            // Optionally clear invalid data: localStorage.removeItem('donationTableColumnWidths');
        }
    }


    // --- Event Listeners Setup ---

    // Debounced search input
    const debouncedSearch = debounce((value) => {
        currentPage = 1; // Reset page on new search
        fetchDonations(value);
    }, 350); // 350ms delay

    if (searchInput) {
        searchInput.addEventListener("input", function () {
            debouncedSearch(this.value);
        });
        // Optional: Trigger search on Enter key immediately if needed
        searchInput.addEventListener("keypress", function (e) {
            if (e.key === "Enter") {
                e.preventDefault();
                // Clear any pending debounce timeout and search immediately
                clearTimeout(debouncedSearch._timeoutId); // Access internal timeout if debounce function exposes it, or manage differently
                currentPage = 1;
                fetchDonations(this.value);
            }
        });
    }

    // Sorting listeners
    tableHeaders.forEach(th => {
        th.addEventListener('click', function (e) {
             // Only sort if the click is not on the resizer
             if (!e.target.classList.contains('resizer')) {
                handleSortClick(this.dataset.column);
             }
        });
        // Accessibility: Allow keyboard sorting
        th.addEventListener('keydown', function (e) {
            if ((e.key === 'Enter' || e.key === ' ') && !e.target.classList.contains('resizer')) {
                e.preventDefault();
                handleSortClick(this.dataset.column);
            }
        });
    });

    // Pagination: Items per page change
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener("change", function () {
            itemsPerPage = parseInt(this.value);
            currentPage = 1; // Reset to page 1
            fetchDonations(searchInput.value);
        });
    }

     // Pagination: Prev/Next buttons (ensure listeners are attached once)
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


    // Filter buttons
    if (bankSearchBtn) {
        bankSearchBtn.addEventListener('click', openBankFilterModal);
    }
    if (donationTypeFilterBtn) {
        donationTypeFilterBtn.addEventListener('click', openDonationTypeFilterModal);
    }

    // --- Global Functions for Edit/Delete (called via onclick) ---
    window.editDonation = function (id) {
        console.log("Navigating to edit page for ID:", id);
        window.location.href = `editDonate.html?id=${id}`;
    };

    window.deleteDonation = async function (id) {
        if (!id) {
            console.error("Delete failed: No ID provided.");
            alert("删除失败：未提供记录ID。");
            return;
        }

        // Use SweetAlert for a nicer confirmation dialog, if available
        const confirmationText = "确定要删除这个捐赠记录吗？此操作无法撤销。";
        if (typeof Swal !== 'undefined') {
             Swal.fire({
                title: '请确认',
                text: confirmationText,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: '是的，删除！',
                cancelButtonText: '取消'
             }).then(async (result) => {
                if (result.isConfirmed) {
                    await performDelete(id);
                }
             });
        } else {
             // Fallback to standard confirm
             if (confirm(confirmationText)) {
                await performDelete(id);
             }
        }
    };

    async function performDelete(id) {
         console.log("Attempting to delete donation with ID:", id);
         // Show some loading indicator if possible
         try {
             const response = await fetch(`${API_BASE_URL}`, { // Send ID in body for DELETE
                 method: "DELETE",
                 headers: {
                     "Content-Type": "application/json"
                 },
                 // Ensure body matches what the API expects for deletion
                 body: JSON.stringify({ table: "donation_details", ID: id }),
             });

             console.log("Delete response status:", response.status);

             // Try parsing JSON regardless of status code for potential error messages
             let data;
             try {
                 data = await response.json();
                 console.log("Delete response data:", data);
             } catch (jsonError) {
                 console.error("Failed to parse delete response JSON:", jsonError);
                 // If JSON parsing fails, use status text or default message
                 if (!response.ok) {
                    throw new Error(`删除失败，服务器响应: ${response.status} ${response.statusText}`);
                 }
                 // If response was OK but JSON failed, assume success but log warning
                 data = { success: true, message: "删除成功，但响应格式无效。" };
                 console.warn(data.message);
             }


             if (!response.ok) {
                 // Use message from API response if available, otherwise use status text
                 const errorMessage = data?.message || data?.error || `服务器错误 ${response.status}`;
                 throw new Error(errorMessage);
             }

             // Check for success flag in the response body
             if (data.success || data.status === 'success') {
                 console.log("Deletion successful for ID:", id);
                 // Optional: Show success message (e.g., using Toastr or SweetAlert)
                 if (typeof Swal !== 'undefined') {
                    Swal.fire('已删除!', '捐赠记录已成功删除。', 'success');
                 } else {
                    alert("捐赠记录已成功删除！");
                 }

                 // Remove the row directly from the table for immediate feedback
                 const rowToRemove = document.getElementById(`donation-row-${id}`);
                 if (rowToRemove) {
                     rowToRemove.remove();
                 }
                 // Refresh data to ensure pagination and totals are correct
                 // Check if removing the last item on a page requires going back a page
                 const remainingRows = donationTableBody.querySelectorAll('tr').length;
                 if (currentPage > 1 && remainingRows === 0) {
                    currentPage--;
                 }
                 fetchDonations(searchInput.value);

             } else {
                 // API indicated failure even with a 2xx status
                 throw new Error(data.message || "删除失败，未知错误。");
             }

         } catch (error) {
             console.error("Error during delete operation:", error);
              // Show error message (e.g., using Toastr or SweetAlert)
              if (typeof Swal !== 'undefined') {
                 Swal.fire('错误', `删除捐赠记录时出错: ${error.message}`, 'error');
              } else {
                 alert(`删除捐赠记录时出错: ${error.message}`);
              }
         } finally {
             // Hide loading indicator if shown
         }
     }


    // --- Initializations ---
    initializeResizableColumns(); // Initialize column resizing
    initializeFilters();          // Fetch filter data and then the initial donation list

}); // End DOMContentLoaded