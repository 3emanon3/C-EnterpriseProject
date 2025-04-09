document.addEventListener("DOMContentLoaded", function () {
    // --- Element References ---
    const API_BASE_URL = 'http://localhost/projects/C-EnterpriseProject/recervingAPI.php';
    const searchInput = document.getElementById("searchInput");
    const totalDonations = document.getElementById("totalDonations");
    const loader = document.querySelector(".loader");
    const itemsPerPageSelect = document.getElementById("itemsPerPage");
    const table = document.getElementById('donationTable');
    const tableHeaders = table.querySelectorAll('th[data-column]');
    const donationTableBody = table.querySelector('tbody');
    const paginationContainer = document.querySelector(".pagination");
    const prevPageButton = document.getElementById("prevPage");
    const nextPageButton = document.getElementById("nextPage");
    const bankSearchBtn = document.getElementById("bankSearchBtn");
    const donationTypeFilterBtn = document.getElementById("donationTypeFilterBtn");
    // New button references
    const dateRangeFilterBtn = document.getElementById("dateRangeFilterBtn");
    const amountRangeFilterBtn = document.getElementById("amountRangeFilterBtn");

    // --- State Variables ---
    let currentSortColumn = null;
    let currentSortOrder = 'ASC';
    let donationData = [];
    let itemsPerPage = parseInt(itemsPerPageSelect.value);
    let currentPage = 1;
    let totalPages = 0;
    let currentBankFilter = null; // Stores selected bank NAME
    let currentDonationTypeFilter = null; // Stores selected donation type NAME
    // New state variables for range filters
    let currentStartDate = null;
    let currentEndDate = null;
    let currentStartPrice = null;
    let currentEndPrice = null;

    // Data caches for display/filter modals
    let DONATION_TYPES = {}; // Stores { id: name }
    let BANKS = {};          // Stores { id: name }

    // --- Utility Functions ---

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
        if (!dateTimeStr) return null;
        try {
            const date = new Date(dateTimeStr);
            if (isNaN(date.getTime())) {
                 console.warn("Invalid date format received:", dateTimeStr);
                 return dateTimeStr;
            }
            // Format to YYYY-MM-DD HH:MM
            return date.toLocaleString('sv-SE', {
                 year: 'numeric', month: '2-digit', day: '2-digit',
                 hour: '2-digit', minute: '2-digit', hour12: false
            });
        } catch (e) {
            console.error("Error formatting date:", dateTimeStr, e);
            return dateTimeStr;
        }
    }

    function formatDateForInput(dateStr) {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            // Format as YYYY-MM-DD for <input type="date">
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (e) {
            return '';
        }
    }


    function formatPrice(price) {
        const num = parseFloat(price);
        if (isNaN(num)) return '-';
        return `RM ${num.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function truncateText(text, maxLength) {
        if (!text) return '';
        const escapedText = escapeHTML(text);
        if (text.length > maxLength) {
            return `<span title="${escapedText}">${escapedText.substring(0, maxLength)}...</span>`;
        }
        return escapedText;
    }

    function debounce(func, wait) {
        let timeout;
        const debouncedFunc = function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
        // Add a way to clear the timeout if needed (e.g., for Enter key press)
        debouncedFunc.clear = () => clearTimeout(timeout);
        debouncedFunc._timeoutId = timeout; // Expose for potential external clearing (use carefully)
        return debouncedFunc;
    }

    // --- Data Fetching for Filters (Bank/Type) ---

    async function fetchFilterData(type) {
        const url = `${API_BASE_URL}?table=${type}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch ${type} data: ${response.status}`);
            const data = await response.json();
            if (data?.data && Array.isArray(data.data)) {
                const map = {};
                const keyField = (type === 'bank') ? 'Bank' : 'donationTypes';
                data.data.forEach(item => { map[item.ID] = item[keyField]; });
                console.log(`${type} data loaded:`, map);
                return map;
            } else {
                console.error(`Invalid ${type} data format received`); return {};
            }
        } catch (error) {
            console.error(`Error fetching ${type} data:`, error); return {};
        }
    }

    async function initializeFilters() {
        [BANKS, DONATION_TYPES] = await Promise.all([
            fetchFilterData('bank'),
            fetchFilterData('donationtypes')
        ]);
        // Update all filter buttons initially
        updateBankFilterButtonText();
        updateDonationTypeFilterButtonText();
        updateDateRangeFilterButton();
        updateAmountRangeFilterButton();
        // Initial data load
        fetchDonations();
    }

    // --- Generic Modal Creation (For Selection Grid) ---
    function createFilterModal({ modalId, title, dataMap, currentFilterValue, filterKey, filterAttribute, iconClass, allOptionText, onSelect }) {
        const existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove();

        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.id = modalId;

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';

        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        modalHeader.innerHTML = `<h3>${title}</h3><button class="close-btn" aria-label="关闭">×</button>`;

        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body filter-selection-grid';

        // Add "All" option
        const allOptionDiv = document.createElement('div');
        allOptionDiv.className = `filter-option-card ${!currentFilterValue ? 'selected' : ''}`;
        allOptionDiv.setAttribute(filterAttribute, '');
        allOptionDiv.innerHTML = `<div class="filter-option-icon"><i class="fas fa-list"></i></div><div class="filter-option-name">${allOptionText}</div>`;
        modalBody.appendChild(allOptionDiv);

        // Add specific options
        Object.entries(dataMap).forEach(([id, name]) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = `filter-option-card ${currentFilterValue === name ? 'selected' : ''}`;
            optionDiv.setAttribute(filterAttribute, name);
            optionDiv.innerHTML = `<div class="filter-option-icon"><i class="fas ${iconClass}"></i></div><div class="filter-option-name">${escapeHTML(name)}</div>`;
            modalBody.appendChild(optionDiv);
        });

        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        // Show modal with transition
        requestAnimationFrame(() => { // Ensures transition occurs
            modalOverlay.classList.add('visible');
        });


        const closeModal = () => {
            modalOverlay.classList.remove('visible');
            modalOverlay.addEventListener('transitionend', () => modalOverlay.remove(), { once: true });
        };

        modalContent.querySelector('.close-btn').addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

        modalBody.querySelectorAll('.filter-option-card').forEach(option => {
            option.addEventListener('click', () => {
                const selectedValue = option.getAttribute(filterAttribute);
                onSelect(selectedValue || null);
                closeModal();
            });
        });
    }

    // --- Bank Filter ---
    function openBankFilterModal() {
        createFilterModal({
            modalId: 'bankFilterModal', title: '选择银行', dataMap: BANKS,
            currentFilterValue: currentBankFilter, filterKey: 'Bank', filterAttribute: 'data-bank-name',
            iconClass: 'fa-landmark', allOptionText: '所有银行',
            onSelect: (selectedBankName) => {
                currentBankFilter = selectedBankName;
                currentPage = 1;
                updateBankFilterButtonText();
                fetchDonations(searchInput.value);
            }
        });
    }

    function updateBankFilterButtonText() {
        if (!bankSearchBtn) return;
        if (currentBankFilter) {
            bankSearchBtn.innerHTML = `<i class="fas fa-filter"></i> ${escapeHTML(currentBankFilter)}`;
            bankSearchBtn.classList.add('active-filter');
            bankSearchBtn.title = `筛选银行: ${escapeHTML(currentBankFilter)}`;
        } else {
            bankSearchBtn.innerHTML = `<i class="fas fa-university"></i> 银行筛选`;
            bankSearchBtn.classList.remove('active-filter');
            bankSearchBtn.title = '';
        }
    }

    // --- Donation Type Filter ---
    function openDonationTypeFilterModal() {
        createFilterModal({
            modalId: 'donationTypeFilterModal', title: '选择乐捐类型', dataMap: DONATION_TYPES,
            currentFilterValue: currentDonationTypeFilter, filterKey: 'donationTypes', filterAttribute: 'data-donation-type-name',
            iconClass: 'fa-tag', allOptionText: '所有类型',
            onSelect: (selectedTypeName) => {
                currentDonationTypeFilter = selectedTypeName;
                currentPage = 1;
                updateDonationTypeFilterButtonText();
                fetchDonations(searchInput.value);
            }
        });
    }

    function updateDonationTypeFilterButtonText() {
        if (!donationTypeFilterBtn) return;
        if (currentDonationTypeFilter) {
            const displayName = currentDonationTypeFilter.length > 15 ? currentDonationTypeFilter.substring(0, 12) + '...' : currentDonationTypeFilter;
            donationTypeFilterBtn.innerHTML = `<i class="fas fa-filter"></i> ${escapeHTML(displayName)}`;
            donationTypeFilterBtn.title = `筛选类型: ${escapeHTML(currentDonationTypeFilter)}`;
            donationTypeFilterBtn.classList.add('active-filter');
        } else {
            donationTypeFilterBtn.innerHTML = `<i class="fas fa-tags"></i> 类型筛选`;
            donationTypeFilterBtn.title = '';
            donationTypeFilterBtn.classList.remove('active-filter');
        }
    }

    // --- Date Range Filter ---

    function openDateRangeModal() {
        const modalId = 'dateRangeFilterModal';
        const existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove();

        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.id = modalId;

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';

        modalContent.innerHTML = `
            <div class="modal-header">
                <h3>按日期范围筛选</h3>
                <button class="close-btn" aria-label="关闭">×</button>
            </div>
            <div class="modal-body">
                <div class="range-filter-inputs">
                    <div class="input-group">
                        <label for="startDateInput">开始日期:</label>
                        <input type="date" id="startDateInput" value="${formatDateForInput(currentStartDate)}">
                    </div>
                    <div class="input-group">
                        <label for="endDateInput">结束日期:</label>
                        <input type="date" id="endDateInput" value="${formatDateForInput(currentEndDate)}">
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-warning clear-filter-btn">
                    <i class="fas fa-times"></i> 清除筛选
                </button>
                <button class="btn btn-success apply-filter-btn">
                    <i class="fas fa-check"></i> 应用筛选
                </button>
            </div>
        `;

        document.body.appendChild(modalOverlay);
        modalOverlay.appendChild(modalContent);

        // Show modal with transition
        requestAnimationFrame(() => {
             modalOverlay.classList.add('visible');
        });


        const closeModal = () => {
            modalOverlay.classList.remove('visible');
            modalOverlay.addEventListener('transitionend', () => modalOverlay.remove(), { once: true });
        };

        // Event Listeners within the modal
        modalContent.querySelector('.close-btn').addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

        const startDateInput = modalContent.querySelector('#startDateInput');
        const endDateInput = modalContent.querySelector('#endDateInput');

        modalContent.querySelector('.apply-filter-btn').addEventListener('click', () => {
            const startDate = startDateInput.value;
            const endDate = endDateInput.value;

            // Basic Validation
            if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
                alert('开始日期不能晚于结束日期。');
                return;
            }

            currentStartDate = startDate || null; // Store as YYYY-MM-DD or null
            currentEndDate = endDate || null;   // Store as YYYY-MM-DD or null
            currentPage = 1;
            updateDateRangeFilterButton();
            fetchDonations(searchInput.value);
            closeModal();
        });

        modalContent.querySelector('.clear-filter-btn').addEventListener('click', () => {
            currentStartDate = null;
            currentEndDate = null;
            currentPage = 1;
            updateDateRangeFilterButton();
            fetchDonations(searchInput.value);
            closeModal();
        });
    }

    function updateDateRangeFilterButton() {
        if (!dateRangeFilterBtn) return;
        if (currentStartDate || currentEndDate) {
            let text = '日期: ';
            if (currentStartDate && currentEndDate) text += `${currentStartDate} 至 ${currentEndDate}`;
            else if (currentStartDate) text += `从 ${currentStartDate}`;
            else if (currentEndDate) text += `至 ${currentEndDate}`;

            // Truncate if too long for button display
            const shortText = text.length > 25 ? text.substring(0, 22) + '...' : text;
            dateRangeFilterBtn.innerHTML = `<i class="fas fa-filter"></i> ${escapeHTML(shortText)}`;
            dateRangeFilterBtn.title = escapeHTML(text); // Full range on hover
            dateRangeFilterBtn.classList.add('active-filter');
        } else {
            dateRangeFilterBtn.innerHTML = `<i class="fas fa-calendar-alt"></i> 日期范围筛选`;
            dateRangeFilterBtn.title = '';
            dateRangeFilterBtn.classList.remove('active-filter');
        }
    }

    // --- Amount Range Filter ---

    function openAmountRangeModal() {
        const modalId = 'amountRangeFilterModal';
        const existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove();

        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.id = modalId;

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';

        modalContent.innerHTML = `
            <div class="modal-header">
                <h3>按金额范围筛选</h3>
                <button class="close-btn" aria-label="关闭">×</button>
            </div>
            <div class="modal-body">
                <div class="range-filter-inputs">
                    <div class="input-group">
                        <label for="startPriceInput">最低金额 (RM):</label>
                        <input type="number" id="startPriceInput" min="0" step="0.01" placeholder="例如 50.00" value="${currentStartPrice !== null ? escapeHTML(currentStartPrice) : ''}">
                    </div>
                    <div class="input-group">
                        <label for="endPriceInput">最高金额 (RM):</label>
                        <input type="number" id="endPriceInput" min="0" step="0.01" placeholder="例如 500.00" value="${currentEndPrice !== null ? escapeHTML(currentEndPrice) : ''}">
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                 <button class="btn btn-warning clear-filter-btn">
                    <i class="fas fa-times"></i> 清除筛选
                </button>
                <button class="btn btn-success apply-filter-btn">
                    <i class="fas fa-check"></i> 应用筛选
                </button>
            </div>
        `;

        document.body.appendChild(modalOverlay);
        modalOverlay.appendChild(modalContent);

        // Show modal with transition
        requestAnimationFrame(() => {
            modalOverlay.classList.add('visible');
        });

        const closeModal = () => {
            modalOverlay.classList.remove('visible');
            modalOverlay.addEventListener('transitionend', () => modalOverlay.remove(), { once: true });
        };

        // Event Listeners within the modal
        modalContent.querySelector('.close-btn').addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

        const startPriceInput = modalContent.querySelector('#startPriceInput');
        const endPriceInput = modalContent.querySelector('#endPriceInput');

        modalContent.querySelector('.apply-filter-btn').addEventListener('click', () => {
            const startPriceStr = startPriceInput.value.trim();
            const endPriceStr = endPriceInput.value.trim();

            const startPrice = startPriceStr ? parseFloat(startPriceStr) : null;
            const endPrice = endPriceStr ? parseFloat(endPriceStr) : null;

            // Basic Validation
            if (startPrice !== null && isNaN(startPrice)) { alert('最低金额无效。'); return; }
            if (endPrice !== null && isNaN(endPrice)) { alert('最高金额无效。'); return; }
            if (startPrice !== null && startPrice < 0) { alert('金额不能为负数。'); return; }
            if (endPrice !== null && endPrice < 0) { alert('金额不能为负数。'); return; }
            if (startPrice !== null && endPrice !== null && startPrice > endPrice) {
                alert('最低金额不能高于最高金额。');
                return;
            }

            currentStartPrice = startPrice;
            currentEndPrice = endPrice;
            currentPage = 1;
            updateAmountRangeFilterButton();
            fetchDonations(searchInput.value);
            closeModal();
        });

        modalContent.querySelector('.clear-filter-btn').addEventListener('click', () => {
            currentStartPrice = null;
            currentEndPrice = null;
            currentPage = 1;
            updateAmountRangeFilterButton();
            fetchDonations(searchInput.value);
            closeModal();
        });
    }

    function updateAmountRangeFilterButton() {
        if (!amountRangeFilterBtn) return;
        if (currentStartPrice !== null || currentEndPrice !== null) {
            let text = '金额: ';
            if (currentStartPrice !== null && currentEndPrice !== null) text += `RM ${currentStartPrice} - ${currentEndPrice}`;
            else if (currentStartPrice !== null) text += `最低 RM ${currentStartPrice}`;
            else if (currentEndPrice !== null) text += `最高 RM ${currentEndPrice}`;

            // Truncate if too long
            const shortText = text.length > 25 ? text.substring(0, 22) + '...' : text;
            amountRangeFilterBtn.innerHTML = `<i class="fas fa-filter"></i> ${escapeHTML(shortText)}`;
            amountRangeFilterBtn.title = escapeHTML(text); // Full range on hover
            amountRangeFilterBtn.classList.add('active-filter');
        } else {
            amountRangeFilterBtn.innerHTML = `<i class="fas fa-dollar-sign"></i> 金额范围筛选`;
            amountRangeFilterBtn.title = '';
            amountRangeFilterBtn.classList.remove('active-filter');
        }
    }


    // --- Core Data Fetching and Display ---
    async function fetchDonations(query = "") {
        loader.style.display = "flex";
        donationTableBody.innerHTML = ""; // Clear previous results

        const params = new URLSearchParams({
            table: "donation_details",
            page: currentPage,
            limit: itemsPerPage,
        });

        const searchTerm = query.trim();
        let isSearching = false; // Flag to indicate if *any* filter/search is active

        // Add text search term
        if (searchTerm) {
            params.append("search", searchTerm);
            isSearching = true;
        }

        // Add bank filter (using NAME)
        if (currentBankFilter) {
            params.append("Bank", currentBankFilter);
            isSearching = true;
        }

        // Add donation type filter (using NAME)
        if (currentDonationTypeFilter) {
            params.append("donationTypes", currentDonationTypeFilter);
            isSearching = true;
        }

        // Add date range filter
        if (currentStartDate || currentEndDate) {
            params.append("dateRange", "true");
            if (currentStartDate) params.append("startDate", currentStartDate); // YYYY-MM-DD
            if (currentEndDate) params.append("endDate", currentEndDate);     // YYYY-MM-DD
            isSearching = true;
        }

        // Add amount range filter
        if (currentStartPrice !== null || currentEndPrice !== null) {
            params.append("priceRange", "true");
            if (currentStartPrice !== null) params.append("startPrice", currentStartPrice.toString());
            if (currentEndPrice !== null) params.append("endPrice", currentEndPrice.toString());
            isSearching = true;
        }

        // IMPORTANT: Add search=true if *any* filter is active, as requested
        if (isSearching) {
            // Only add 'search=true' if it's not already added by the text search itself
            if (!params.has('search') || !searchTerm) {
                 params.append("search", "true");
            } else if (searchTerm && !params.get('search').includes(searchTerm)){
                 // If text search exists, ensure the 'true' flag doesn't overwrite it.
                 // This logic might need adjustment depending on how the API handles
                 // multiple 'search' parameters or expects the flag.
                 // A safer approach might be a dedicated 'filter_active=true' parameter if the API supports it.
                 // For now, assuming the API handles 'search=term' and 'search=true' coexistently or 'search=true' is sufficient alongside other filters.
                 // Let's stick to adding it if isSearching is true and no text term is present.
                 if (!searchTerm) params.append("search", "true");
            }
        }


        // Add sorting parameters
        if (currentSortColumn) {
            const apiColumnName = mapColumnNameToApi(currentSortColumn);
            params.append("sort", apiColumnName);
            params.append("order", currentSortOrder || 'ASC');
        }

        const url = `${API_BASE_URL}?${params.toString()}`;
        console.log("API Request URL:", url); // Log the final URL for debugging

        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server responded with status: ${response.status}. ${errorText}`);
            }

            const data = await response.json();
            console.log("API Response Data:", data);

            if (data && typeof data === 'object') {
                donationData = Array.isArray(data.data) ? data.data : [];
                const totalRecords = data.total || data.pagination?.total_records || (Array.isArray(data.data) ? data.data.length : 0); // Be careful with length if server paginates without total
                totalDonations.textContent = totalRecords;
                totalPages = itemsPerPage > 0 ? Math.ceil(parseInt(totalRecords) / itemsPerPage) : 0;
                if (totalRecords > 0 && totalPages === 0) totalPages = 1; // Ensure at least one page if records exist
                if (totalRecords === 0) totalPages = 0;
            } else {
                throw new Error("Invalid data format received from API.");
            }

            displayDonations(donationData);
            updatePagination();
            updateSortIcons();

        } catch (error) {
            console.error("Error fetching or processing donations:", error);
            donationTableBody.innerHTML = `<tr><td colspan="10" class="error-message">加载乐捐记录失败. 错误: ${escapeHTML(error.message)}</td></tr>`;
            donationData = [];
            totalDonations.textContent = 0;
            totalPages = 0;
            updatePagination();
        } finally {
            loader.style.display = "none";
        }
    }

    function mapColumnNameToApi(columnName) {
        const mapping = {
            'id': 'ID', 'donor_name': 'Name/Company_Name', 'donationTypes': 'donationTypes',
            'Bank': 'Bank', 'membership': 'membership', 'payment_date': 'paymentDate',
            'receipt_no': 'official_receipt_no', 'amount': 'amount', 'Remarks': 'Remarks'
        };
        return mapping[columnName] || columnName;
    }

    function displayDonations(donations) {
        donationTableBody.innerHTML = "";

        if (!Array.isArray(donations) || donations.length === 0) {
            let message = '暂无乐捐记录';
            if (searchInput.value.trim() || currentBankFilter || currentDonationTypeFilter || currentStartDate || currentEndDate || currentStartPrice !== null || currentEndPrice !== null) {
                message = '没有找到匹配的记录';
            }
            donationTableBody.innerHTML = `<tr><td colspan="10" class="no-data">${message}</td></tr>`;
            return;
        }

        const startDisplayId = (currentPage - 1) * itemsPerPage + 1;

        donations.forEach((donation, index) => {
            const databaseId = donation.ID || donation.id;
            if (!databaseId) { console.warn("Skipping row, missing ID:", donation); return; }
            const displayId = startDisplayId + index;

            const donorName = donation['Name/Company_Name'] || '-';
            const donationType = donation.donationTypes || '-';
            const bank = donation.Bank || '-';
            const membership = donation.membership || '非会员';
            const paymentDate = formatDateTime(donation.paymentDate);
            const receiptNo = donation['official_receipt_no'] || '-';
            const amount = formatPrice(donation.amount);
            const remarks = donation.Remarks || '';

            const row = document.createElement("tr");
            row.setAttribute('id', `donation-row-${databaseId}`);
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

    // --- Pagination ---

    function updatePagination() {
        if (!paginationContainer) return;
        paginationContainer.innerHTML = ''; // Clear previous buttons

        const paginationControlsContainer = paginationContainer.closest('.pagination-container');
        let paginationInfo = paginationControlsContainer.querySelector('.pagination-info');

        // Remove existing jump section if it exists
        if (paginationInfo) paginationInfo.remove();

        if (totalPages <= 0) {
            prevPageButton.disabled = true;
            nextPageButton.disabled = true;
            paginationControlsContainer.querySelector('.items-per-page').style.display = 'none';
            return;
        } else {
             paginationControlsContainer.querySelector('.items-per-page').style.display = 'flex';
        }

        prevPageButton.disabled = (currentPage <= 1);
        nextPageButton.disabled = (currentPage >= totalPages);

        const MAX_VISIBLE_PAGES = 5;
        const buttons = [];

        if (totalPages <= MAX_VISIBLE_PAGES + 2) { // Show all pages if total is small
            for (let i = 1; i <= totalPages; i++) {
                buttons.push(createPageButton(i));
            }
        } else { // Handle ellipsis logic
            buttons.push(createPageButton(1)); // Always show first page

            let start = Math.max(2, currentPage - Math.floor((MAX_VISIBLE_PAGES - 2) / 2));
            let end = Math.min(totalPages - 1, currentPage + Math.ceil((MAX_VISIBLE_PAGES - 2) / 2));

             // Adjust start/end if close to beginning/end
             if (currentPage < MAX_VISIBLE_PAGES -1) {
                 end = MAX_VISIBLE_PAGES -1;
             }
             if (currentPage > totalPages - (MAX_VISIBLE_PAGES - 2)) {
                 start = totalPages - (MAX_VISIBLE_PAGES - 2);
             }


            if (start > 2) buttons.push(createEllipsis()); // Ellipsis after first

            for (let i = start; i <= end; i++) {
                buttons.push(createPageButton(i));
            }

            if (end < totalPages - 1) buttons.push(createEllipsis()); // Ellipsis before last

            buttons.push(createPageButton(totalPages)); // Always show last page
        }


        buttons.forEach(btn => paginationContainer.appendChild(btn));

        // Add Page Jump section dynamically
        paginationInfo = document.createElement('div');
        paginationInfo.className = 'pagination-info';
        paginationInfo.innerHTML = `
           <span class="page-indicator" aria-live="polite">第 ${currentPage} / ${totalPages} 页</span>
           ${totalPages > 1 ? `
           <div class="page-jump">
               <input type="number" id="pageInput" min="1" max="${totalPages}" placeholder="页码" aria-label="跳转到页码" class="page-input">
               <button onclick="jumpToPage()" class="jump-btn" aria-label="跳转">跳转</button>
           </div>` : ''}
       `;
        // Insert the jump section before the items-per-page selector
        const itemsPerPageDiv = paginationControlsContainer.querySelector('.items-per-page');
        paginationControlsContainer.insertBefore(paginationInfo, itemsPerPageDiv);


        const pageInput = document.getElementById('pageInput');
        if (pageInput) {
            pageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); jumpToPage(); }
            });
        }
    }

    function createPageButton(page) {
        const button = document.createElement('button');
        button.className = `pagination-btn ${page === currentPage ? 'active' : ''}`;
        button.dataset.page = page;
        button.textContent = page;
        button.setAttribute('aria-label', `第 ${page} 页`);
        if (page === currentPage) button.setAttribute('aria-current', 'page');
        button.addEventListener('click', function () { changePage(parseInt(this.dataset.page)); });
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
            // Optional: Scroll to top of table after page change
            // table.scrollIntoView({ behavior: 'smooth' });
        }
    }

    window.jumpToPage = function() { // Make globally accessible
        const pageInput = document.getElementById('pageInput');
        if (!pageInput) return;
        const targetPage = parseInt(pageInput.value);
        if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= totalPages) {
            changePage(targetPage);
        } else {
            alert(`请输入 1 到 ${totalPages} 之间的有效页码`);
            pageInput.focus(); pageInput.select();
        }
        pageInput.value = ''; // Clear input
    }

    // --- Sorting ---

    function handleSortClick(columnName) {
        if (!columnName) return; // Ignore clicks on non-sortable headers (like '操作')
        if (currentSortColumn === columnName) {
            currentSortOrder = (currentSortOrder === 'ASC') ? 'DESC' : 'ASC'; // Toggle order
            // Optional: third click removes sort
            // if (currentSortOrder === 'ASC') currentSortOrder = 'DESC';
            // else if (currentSortOrder === 'DESC') { currentSortColumn = null; currentSortOrder = 'ASC'; }
        } else {
            currentSortColumn = columnName;
            currentSortOrder = 'ASC';
        }
        currentPage = 1;
        fetchDonations(searchInput.value);
    }

    function updateSortIcons() {
        tableHeaders.forEach(th => {
            const icon = th.querySelector('i.fas');
            if (!icon) return;
            icon.classList.remove('fa-sort', 'fa-sort-up', 'fa-sort-down');
            th.removeAttribute('aria-sort');
            if (th.dataset.column) { // Only add icons to sortable columns
                if (th.dataset.column === currentSortColumn) {
                    icon.classList.add(currentSortOrder === 'ASC' ? 'fa-sort-up' : 'fa-sort-down');
                    th.setAttribute('aria-sort', currentSortOrder === 'ASC' ? 'ascending' : 'descending');
                } else {
                    icon.classList.add('fa-sort'); // Default icon for other sortable columns
                }
            }
        });
    }

    // --- Column Resizing ---

    function initializeResizableColumns() {
        let currentResizer = null, startX, startWidth, thBeingResized;

        tableHeaders.forEach(th => {
            if (!th.dataset.column) return; // Don't add resizer to non-data columns like '操作'
            let resizer = th.querySelector('.resizer');
            if (!resizer) {
                resizer = document.createElement('div');
                resizer.className = 'resizer';
                th.appendChild(resizer);
            }

            resizer.addEventListener('mousedown', (e) => {
                e.stopPropagation(); // Prevent sorting
                currentResizer = e.target;
                thBeingResized = currentResizer.parentElement;
                startX = e.pageX;
                startWidth = thBeingResized.offsetWidth;
                table.closest('.table-container')?.classList.add('resizing');
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
            });
        });

        function handleMouseMove(e) {
            if (!currentResizer) return;
            const width = startWidth + (e.pageX - startX);
            if (width >= 50) { // Min width
                thBeingResized.style.width = `${width}px`;
            }
        }

        function handleMouseUp() {
            if (!currentResizer) return;
            table.closest('.table-container')?.classList.remove('resizing');
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            saveColumnWidths();
            currentResizer = null; thBeingResized = null;
        }
        loadColumnWidths(); // Load saved widths on init
    }

    function saveColumnWidths() {
        const columnWidths = {};
        tableHeaders.forEach(th => {
            if (th.dataset.column && th.style.width) {
                columnWidths[th.dataset.column] = th.style.width;
            }
        });
        try { localStorage.setItem('donationTableColumnWidths', JSON.stringify(columnWidths)); }
        catch (e) { console.error("Failed to save column widths:", e); }
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
        } catch (e) { console.error('Failed to load column widths:', e); }
    }

    // --- Event Listeners Setup ---

    // Debounced search input
    const debouncedSearch = debounce((value) => {
        currentPage = 1;
        fetchDonations(value);
    }, 350);

    if (searchInput) {
        searchInput.addEventListener("input", function () { debouncedSearch(this.value); });
        searchInput.addEventListener("keypress", function (e) {
            if (e.key === "Enter") {
                e.preventDefault();
                debouncedSearch.clear(); // Clear pending debounce
                currentPage = 1;
                fetchDonations(this.value); // Search immediately
            }
        });
    }

    // Sorting listeners
    tableHeaders.forEach(th => {
        th.addEventListener('click', (e) => {
             if (!e.target.classList.contains('resizer')) {
                handleSortClick(th.dataset.column);
             }
        });
        th.addEventListener('keydown', (e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !e.target.classList.contains('resizer')) {
                e.preventDefault(); handleSortClick(th.dataset.column);
            }
        });
    });

    // Pagination: Items per page change
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener("change", function () {
            itemsPerPage = parseInt(this.value);
            currentPage = 1;
            fetchDonations(searchInput.value);
        });
    }

     // Pagination: Prev/Next buttons
     if (prevPageButton) prevPageButton.addEventListener('click', () => changePage(currentPage - 1));
     if (nextPageButton) nextPageButton.addEventListener('click', () => changePage(currentPage + 1));

    // Filter buttons
    if (bankSearchBtn) bankSearchBtn.addEventListener('click', openBankFilterModal);
    if (donationTypeFilterBtn) donationTypeFilterBtn.addEventListener('click', openDonationTypeFilterModal);
    if (dateRangeFilterBtn) dateRangeFilterBtn.addEventListener('click', openDateRangeModal);
    if (amountRangeFilterBtn) amountRangeFilterBtn.addEventListener('click', openAmountRangeModal);

    // --- Global Functions for Edit/Delete ---
    window.editDonation = function (id) {
        console.log("Navigating to edit page for ID:", id);
        window.location.href = `editDonate.html?id=${id}`;
    };

    window.deleteDonation = async function (id) {
        if (!id) { console.error("Delete failed: No ID."); alert("删除失败：未提供记录ID。"); return; }

        const result = await Swal.fire({
            title: '请确认',
            text: "确定要删除这个捐赠记录吗？此操作无法撤销。",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33', // Red for delete
            cancelButtonColor: '#3085d6', // Blue for cancel
            confirmButtonText: '是的，删除！',
            cancelButtonText: '取消'
        });

        if (result.isConfirmed) {
            await performDelete(id);
        }
    };

    async function performDelete(id) {
         console.log("Attempting to delete donation with ID:", id);
         // Optional: Show loading state on the delete button or overlay
         try {
             const response = await fetch(`${API_BASE_URL}`, {
                 method: "DELETE",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({ table: "donation_details", ID: id }), // Send ID in body
             });

             let data;
             try { data = await response.json(); }
             catch (jsonError) { data = { success: false, message: "响应格式无效" }; } // Handle non-JSON response

             if (!response.ok || !data.success) {
                 throw new Error(data.message || `删除失败，服务器响应: ${response.status}`);
             }

             Swal.fire('已删除!', '捐赠记录已成功删除。', 'success');

             // Refresh data: Check if removing the last item on a page requires going back
             const remainingRows = donationTableBody.querySelectorAll('tr').length - 1; // -1 because row isn't removed yet
             if (currentPage > 1 && remainingRows <= 0) {
                 currentPage--;
             }
             fetchDonations(searchInput.value); // Refresh the current (or previous) page

         } catch (error) {
             console.error("Error during delete operation:", error);
             Swal.fire('错误', `删除捐赠记录时出错: ${error.message}`, 'error');
         } finally {
             // Optional: Hide loading state
         }
     }

    // --- Initializations ---
    initializeResizableColumns(); // Setup column resizing
    initializeFilters();          // Fetch Bank/Type data and then the initial donation list

}); // End DOMContentLoaded