// -----------------------
// Global Helper Functions
// -----------------------
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

function formatPhone(phone) {
    const phoneStr = String(phone || '');
    if (/^\d{10}$/.test(phoneStr)) { // 10 digits
        return phoneStr.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
    } else if (/^\d{11}$/.test(phoneStr) && phoneStr.startsWith('0')) { // 11 digits starting with 0
        return phoneStr.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
    } else if (/^\d{11}$/.test(phoneStr) && phoneStr.startsWith('6')) { // Example: 601...
        return phoneStr.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, "$1-$2-$3-$4");
    }
    return phoneStr;
}

function formatIC(ic) {
    const icStr = String(ic || '');
    if (/^\d{12}$/.test(icStr)) {
        return icStr.replace(/(\d{6})(\d{2})(\d{4})/, "$1-$2-$3");
    }
    return icStr;
}

function formatDate(dateString) {
    if (!dateString || dateString === '0000-00-00') return '';
    try {
        // Check if already in proper format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            if (isValidDateString(dateString)) {
                return dateString;
            } else {
                console.warn(`Invalid date string received: ${dateString}`);
                return '';
            }
        }
        // Otherwise, parse and reformat
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            console.warn(`Could not parse date: ${dateString}`);
            return dateString;
        }
        const year = date.getFullYear();
        const month = padStart(date.getMonth() + 1);
        const day = padStart(date.getDate());
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.warn(`Error formatting date: ${dateString}`, e);
        return dateString;
    }
}

// ---------------------------
// Main Application Code
// ---------------------------
document.addEventListener("DOMContentLoaded", function () {
    // ===== CONFIGURATION =====
    const API_BASE_URL = '../recervingAPI.php';
    const SESSION_STORAGE_KEY = 'memberSearchState';

    // ===== DOM ELEMENTS =====
    const searchInput = document.getElementById("searchInput");
    const memberTableBody = document.querySelector("#memberTable tbody");
    const totalMembers = document.getElementById("totalMembers");
    const loader = document.querySelector(".loader");
    const itemsPerPageSelect = document.getElementById("itemsPerPage");
    const prevPageButton = document.getElementById("prevPage");
    const nextPageButton = document.getElementById("nextPage");
    const birthdayButton = document.getElementById("searchBirthday");
    const expiredButton = document.getElementById("searchExpiry");
    const renewalTermButton = document.getElementById("searchRenewalTerm");
    const renewalDateButton = document.getElementById("searchRenewalDate");
    const listAllMembersButton = document.getElementById("listAllMembers");
    const memberFilter = document.getElementById("memberFilter");
    const madedPaymentFilter = document.getElementById("madedPaymentFilter");
    const table = document.getElementById('memberTable');
    const thead = table?.querySelector('thead');
    const paginationContainer = document.querySelector('.pagination');

    // --- Expiry Modal Elements ---
    const expiryModal = document.getElementById('expiryModal');
    const expiryStartYearInput = document.getElementById('expiryStartYearInput');
    const expiryStartMonthInput = document.getElementById('expiryStartMonthInput');
    const expiryStartDayInput = document.getElementById('expiryStartDayInput');
    const expiryEndYearInput = document.getElementById('expiryEndYearInput');
    const expiryEndMonthInput = document.getElementById('expiryEndMonthInput');
    const expiryEndDayInput = document.getElementById('expiryEndDayInput');
    const confirmExpirySearchButton = document.getElementById('confirmExpirySearch');
    const closeExpiryButton = expiryModal?.querySelector('.close-button');

    // --- Birthday Modal Elements ---
    const birthdayModal = document.getElementById('birthdayModal');
    const birthdayMonthInput = document.getElementById('birthdayMonthInput');
    const confirmBirthdaySearchButton = document.getElementById('confirmBirthdaySearch');
    const closeBirthdayButton = birthdayModal?.querySelector('.close-button');

    // --- Renewal Term Modal Elements ---
    const renewalTermModal = document.getElementById('renewalTermModal');
    const renewalTermInput = document.getElementById('renewalTermInput');
    const confirmRenewalTermSearchButton = document.getElementById('confirmRenewalTermSearch');
    const closeRenewalTermButton = renewalTermModal?.querySelector('.close-button');

    // --- Renewal Date Modal Elements ---
    const renewalDateModal = document.getElementById('renewalDateModal');
    const renewalStartDateYearInput = document.getElementById('renewalStartDateYearInput');
    const renewalStartDateMonthInput = document.getElementById('renewalStartDateMonthInput');
    const renewalStartDateDayInput = document.getElementById('renewalStartDateDayInput');
    const renewalEndDateYearInput = document.getElementById('renewalEndDateYearInput');
    const renewalEndDateMonthInput = document.getElementById('renewalEndDateMonthInput');
    const renewalEndDateDayInput = document.getElementById('renewalEndDateDayInput');
    const confirmRenewalDateSearchButton = document.getElementById('confirmRenewalDateSearch');
    const closeRenewalDateButton = renewalDateModal?.querySelector('.close-button');

    // --- Import Modal Elements ---
    const importModal = document.getElementById('importModal');
    const importFileInput = document.getElementById('importFileInput');
    const importStatus = document.getElementById('importStatus');
    const confirmImportButton = document.getElementById('confirmImport');
    const closeImportButton = importModal?.querySelector('.close-button');

    // --- Renewal Add/Edit Modal Elements ---
    const renewalAddEditModal = document.getElementById('renewalAddEditModal');
    const renewalModalTitle = document.getElementById('renewalModalTitle');
    const renewalMemberIdInput = document.getElementById('renewalMemberId');
    const renewalRecordIdInput = document.getElementById('renewalRecordId');
    const renewalAtYear = document.getElementById('renewalAtYear');
    const renewalAtMonth = document.getElementById('renewalAtMonth');
    const renewalAtDay = document.getElementById('renewalAtDay');
    const prevEndYear = document.getElementById('prevEndYear');
    const prevEndMonth = document.getElementById('prevEndMonth');
    const prevEndDay = document.getElementById('prevEndDay');
    const newEndYear = document.getElementById('newEndYear');
    const newEndMonth = document.getElementById('newEndMonth');
    const newEndDay = document.getElementById('newEndDay');
    const recordedAtYear = document.getElementById('recordedAtYear');
    const recordedAtMonth = document.getElementById('recordedAtMonth');
    const recordedAtDay = document.getElementById('recordedAtDay');
    const renewalTermMonths = document.getElementById('renewalTermMonths');
    const isFirstTime = document.getElementById('isFirstTime');
    const saveRenewalButton = document.getElementById('saveRenewalButton');

    // --- Shared Modal Overlay ---
    const modalOverlay = document.getElementById('modalOverlay');

    // ===== STATE VARIABLES =====
    let currentPage = 1;
    let itemsPerPage = parseInt(itemsPerPageSelect?.value || 10);
    let sortColumn = '';
    let sortDirection = '';
    let totalPages = 0;
    let membersData = [];
    let targetStartDate = null; // For expiry search (YYYY-MM-DD)
    let targetEndDate = null;
    let targetBirthdayMonth = null;
    let targetRenewalTerm = null;
    let targetRenewalStartDate = null;
    let targetRenewalEndDate = null;
    let targetRenewalType = null;
    let targetMadedPayment = null;
    let dataToImport = [];
    let renewalDataCache = {};

    // ===== INITIALIZATION =====
    function initializePage() {
        loadStateFromSession();
        fetchApplicantType();
        populateMonthSelects();
        initializeEventListeners();
        initializeResizableColumns();
        loadColumnWidths();
        fetchMembers();
        setupFilterButtonsAnimation();
        initializeTooltipPositioning();
    }

    // ===== SESSION STATE MANAGEMENT =====
    function saveStateToSession() {
        try {
            const state = {
                sortColumn: sortColumn,
                sortDirection: sortDirection,
                itemsPerPage: itemsPerPage
            };
            sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            console.error('Failed to save state to session storage:', error);
        }
    }

    function loadStateFromSession() {
        try {
            const savedStateJSON = sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (savedStateJSON) {
                const savedState = JSON.parse(savedStateJSON);
                console.log('Loaded state from session:', savedState);

                if (savedState.sortColumn) {
                    sortColumn = savedState.sortColumn;
                }
                if (savedState.sortDirection) {
                    sortDirection = savedState.sortDirection;
                }
                if (savedState.itemsPerPage) {
                    itemsPerPage = parseInt(savedState.itemsPerPage, 10);
                    if (itemsPerPageSelect) {
                        itemsPerPageSelect.value = itemsPerPage;
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load state from session storage:', error);
        }
    }

    // ===== FILTER BUTTON ANIMATION =====
    function setupFilterButtonsAnimation() {
        // Add filter-button class to the buttons we want to animate
        if (birthdayButton) {
            birthdayButton.classList.add('filter-button');        
        }
        if (expiredButton) {
            expiredButton.classList.add('filter-button');
        }
        if (renewalTermButton) {
            renewalTermButton.classList.add('filter-button');
        }
        if (renewalDateButton) {
            renewalDateButton.classList.add('filter-button');
        }
        if (memberFilter) {
            memberFilter.classList.add('filter-button');
        }
        if (madedPaymentFilter) {
            madedPaymentFilter.classList.add('filter-button');
        }
    }

    // Function to update filter button states
    function updateFilterButtonStates() {
        const isGeneralSearchActive = searchInput?.value.trim() !== '';
        // This array will hold the active filter elements in the order they are applied
        const activeFilters = [];
    
        // First, remove the active class and clear any inline bottom position on all filter buttons.
        document.querySelectorAll('.filter-button').forEach(btn => {
            btn.classList.remove('active');
            btn.style.bottom = '';
            btn.style.zIndex   = '';  // clear any inline bottom setting
        });
    
        // Only activate filter buttons if a general search is not in progress.
        if (!isGeneralSearchActive) {
            // Check each filter and, if active, add it to the list.
            if (targetBirthdayMonth) {
                birthdayButton?.classList.add('active');
                activeFilters.push(birthdayButton);
            }
            if (targetStartDate && targetEndDate) {
                expiredButton?.classList.add('active');
                activeFilters.push(expiredButton);
            }
            if (targetRenewalTerm) {
                renewalTermButton?.classList.add('active');
                activeFilters.push(renewalTermButton);
            }
            if (targetRenewalStartDate && targetRenewalEndDate) {
                renewalDateButton?.classList.add('active');
                activeFilters.push(renewalDateButton);
            }
            if (memberFilter && memberFilter.value) {
                memberFilter.classList.add('active');
                activeFilters.push(memberFilter);
            }
            if (madedPaymentFilter && madedPaymentFilter.value) {
                madedPaymentFilter.classList.add('active');
                activeFilters.push(madedPaymentFilter);
            }
        }
    
        // Now update each active filter's position:
        // The first in the activeFilters array will be at the bottom (baseBottom), 
        // the second is shifted up by spacing, and the third even higher.
        const baseBottom = 20;  // starting offset from the bottom in px
        const spacing = 50;     // vertical spacing between filters in px
    
        activeFilters.forEach((btn, index) => {
             btn.style.bottom = (baseBottom + index * spacing) + 'px';
             // Adjust z-index so the later (stacked on top) have a higher z-index
             btn.style.zIndex = 1000 + index;
        });
    }
    


    // ===== DATA FETCHING FUNCTIONS =====
    async function fetchApplicantType() {
        if (!memberFilter) {
            console.log("memberFilter element not found in the DOM");
            return;
        }
        // Preserve current value if exists
        const currentValue = memberFilter.value;
        while (memberFilter.options.length > 1) memberFilter.remove(1);
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "选择种类";
        memberFilter.appendChild(defaultOption);
        try {
            const response = await fetch(`${API_BASE_URL}?table=applicants_types&limit=10000`);
            if (!response.ok) throw new Error(`Failed to fetch applicant types: ${response.status}`);
            const data = await response.json();
            const applicantTypes = data.data || [];
            applicantTypes.forEach(item => {
                const option = document.createElement("option");
                option.value = item["designation_of_applicant"];
                option.textContent = item["designation_of_applicant"];
                memberFilter.appendChild(option);
            });
            // Restore previous selection if possible
            if (currentValue) {
                memberFilter.value = currentValue;
            }
        } catch (error) {
            console.error("Error fetching applicant types:", error);
        }
    }

    async function fetchMembers() {
        if (loader) loader.style.display = 'flex';
        if (memberTableBody) memberTableBody.innerHTML = "";

        const params = new URLSearchParams();
        params.append("table", "members_with_applicant_designation");
        params.append("limit", itemsPerPage);
        params.append("page", currentPage);

        const generalSearchQuery = searchInput?.value.trim() || "";
        let isAnyFilterActive = false;

        // --- General Search (Overrides other filters) ---
        if (generalSearchQuery !== "") {
            console.log("Performing general search for:", generalSearchQuery);
            params.append("search", generalSearchQuery);
            // Ensure filter states are cleared if general search is active
            // This should ideally be handled by the input event listener,
            // but double-check here for safety.
            targetBirthdayMonth = null;
            targetStartDate = null;
            targetEndDate = null;
            targetRenewalTerm = null;
            targetRenewalStartDate = null;
            targetRenewalEndDate = null;
            targetRenewalType = null;
            targetMadedPayment = null;
            if (memberFilter) memberFilter.value = '';
            if (madedPaymentFilter) madedPaymentFilter.value = '';
        }
        // --- Specific Filters (Applied only if general search is inactive) ---
        else {
            // Birthday Filter
            if (targetBirthdayMonth) {
                params.append("Birthday", "true");
                params.append("targetMonth", targetBirthdayMonth.toString());
                isAnyFilterActive = true;
                console.log(`Filtering for birthdays in month ${targetBirthdayMonth}`);
            }

            // Expiry Filter
            if (targetStartDate && targetEndDate) {
                params.append("expired", "true");
                params.append("startDate", targetStartDate);
                params.append("endDate", targetEndDate);
                isAnyFilterActive = true;
                console.log(`Filtering for members expiring between ${targetStartDate} and ${targetEndDate}`);
            }

            // Renewal Term Filter
            if (targetRenewalTerm) {
                params.append("renewalTerm", "true");
                params.append("termMonths", targetRenewalTerm.toString());
                isAnyFilterActive = true;
                console.log(`Filtering for members with renewal term of ${targetRenewalTerm} months`);
            }

            // Renewal Date Range Filter
            if (targetRenewalStartDate && targetRenewalEndDate && targetRenewalType) {
                params.append("renewalDateRange", "true");
                params.append("startDate", targetRenewalStartDate);
                params.append("endDate", targetRenewalEndDate);
                params.append("renewalType", targetRenewalType);
                isAnyFilterActive = true;
                console.log(`Filtering for renewals between ${targetRenewalStartDate} and ${targetRenewalEndDate} (Type: ${targetRenewalType})`);
            }

            // Applicant Type Filter
            if (memberFilter && memberFilter.value) {
                params.append("designation_of_applicant", memberFilter.value);
                isAnyFilterActive = true;
                console.log("Filtering by applicant type:", memberFilter.value);
            }

            // Maded Payment Filter
            if (targetMadedPayment !== null && targetMadedPayment !== '') {
                params.append("maded_payment", targetMadedPayment);
                params.append("direct", "true")
                isAnyFilterActive = true;
                console.log("Filtering by maded payment status:", targetMadedPayment);
            }

            // Add search=true if any specific filter is active
            if (isAnyFilterActive) {
                params.append("search", "true"); // Generic flag for filtering
            }
        }

        // --- Sorting ---
        if (sortColumn) {
            let dbSortColumn = sortColumn;
            // Simplified map - ensure your backend handles these column names
            const columnMap = {
                'membersID': 'membersID', 'Name': 'Name', 'CName': 'CName',
                'Designation_of_Applicant': 'Designation_of_Applicant', 'Address': 'Address',
                'phone_number': 'phone_number', 'email': 'email', 'IC': 'IC', 'oldIC': 'oldIC',
                'gender': 'gender', 'componyName': 'componyName', 'Birthday': 'Birthday',
                'expired_date': 'expired_date', 'place_of_birth': 'place_of_birth',
                'position': 'position', 'others': 'others', 'remarks': 'remarks',
                'maded_payment': 'maded_payment'
            };
            dbSortColumn = columnMap[sortColumn] || sortColumn;
            params.append("sort", dbSortColumn);
            params.append("order", sortDirection);
        }

        // Save the current state before fetching
        saveStateToSession();

        const url = `${API_BASE_URL}?${params.toString()}`;
        console.log("API URL:", url);

        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Server error response: ${errorText}`);
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            if (data && typeof data === 'object') {
                membersData = Array.isArray(data.data) ? data.data : [];
                const total = data.pagination?.total_records ?? membersData.length;
                if (totalMembers) totalMembers.textContent = total;
                totalPages = Math.ceil(total / itemsPerPage) || 1;
            } else {
                membersData = [];
                if (totalMembers) totalMembers.textContent = 0;
                totalPages = 1;
                console.error("Unexpected API response format:", data);
            }
            displayMembers(membersData);
            updatePagination();
            updateSortIcons();
            updateFilterButtonStates(); // Update button visuals after fetch
        } catch (error) {
            console.error("Error fetching members:", error);
            if (memberTableBody) {
                const colspan = table?.querySelector('thead tr')?.cells.length || 20;
                memberTableBody.innerHTML = `<tr><td colspan="${colspan}" class="no-results">加载失败: ${error.message}</td></tr>`;
            }
            membersData = [];
            if (totalMembers) totalMembers.textContent = 0;
            totalPages = 1;
            updatePagination();
            updateFilterButtonStates(); // Also update on error
        } finally {
            if (loader) loader.style.display = "none";
        }
    }


    // ===== DISPLAY FUNCTIONS =====
    function displayMembers(members) {
        if (!memberTableBody) return;
        memberTableBody.innerHTML = "";
        if (!Array.isArray(members)) {
            console.error("Expected members to be an array, got:", members);
            members = [];
        }

        // Determine message based on search/filter state
        let message = '暂无记录';
        const generalSearchQuery = searchInput?.value.trim();
        const isBirthdayFilterActive = !!targetBirthdayMonth;
        const isExpiryFilterActive = !!(targetStartDate && targetEndDate);
        const isRenewalTermFilterActive = !!targetRenewalTerm;
        const isRenewalDateFilterActive = !!(targetRenewalStartDate && targetRenewalEndDate);
        const isTypeFilterActive = !!(memberFilter && memberFilter.value);
        const isPaymentFilterActive = !!(madedPaymentFilter && madedPaymentFilter.value);

        if (members.length === 0) {
            if (generalSearchQuery) {
                message = `没有找到匹配 "${generalSearchQuery}" 的记录`;
            } else if (isBirthdayFilterActive || isExpiryFilterActive || isTypeFilterActive || isRenewalTermFilterActive || isRenewalDateFilterActive || isPaymentFilterActive) {
                let filterDescriptions = [];
                if (isTypeFilterActive) filterDescriptions.push(`种类 "${memberFilter.value}"`);
                if (isPaymentFilterActive) filterDescriptions.push(`付款状态 "${madedPaymentFilter.options[madedPaymentFilter.selectedIndex].text}"`);
                if (isBirthdayFilterActive) filterDescriptions.push(`${targetBirthdayMonth}月生日`);
                if (isExpiryFilterActive) filterDescriptions.push(`到期日期 ${targetStartDate} 至 ${targetEndDate}`);
                if (isRenewalTermFilterActive) filterDescriptions.push(`续费时长 ${targetRenewalTerm}个月`);
                if (isRenewalDateFilterActive) filterDescriptions.push(`续费日期 ${targetRenewalStartDate} 至 ${targetRenewalEndDate}`);
                message = `没有找到符合条件 (${filterDescriptions.join(', ')}) 的记录`;
            }
            // Default message '暂无记录' remains if no search/filter is active

            const colspan = table?.querySelector('thead tr')?.cells.length || 20;
            memberTableBody.innerHTML = `<tr><td colspan="${colspan}" class="no-results">${message}</td></tr>`;
            return;
        }


        members.forEach(member => {
            if (!member || typeof member !== 'object') {
                console.warn("Skipping invalid member data:", member);
                return;
            }
            // Helper to safely escape HTML
            const formatData = (value) => {
                if (value === null || value === undefined || value === '' || value === 'For...') {
                    return '';
                }
                return String(value).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
            };

            const designation = formatData(member['Designation_of_Applicant'] || member['designation_of_applicant']);
            const expiredDate = formatDate(member['expired_date'] || member['expiredDate']);
            const placeOfBirth = formatData(member['place_of_birth'] || member['placeOfBirth']);
            const gender = formatData(member['gender']);
            const position = formatData(member['position']);
            const companyName = formatData(member['componyName'] || member['companyName']);
            const memberId = formatData(member['membersID']);
            const rawId = member.ID || member.id || ''; // Use the actual primary key ID
            const isPaid = member.maded_payment == '1';

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${memberId}</td>
                <td>${formatData(member.Name)}</td>
                <td>${formatData(member.CName)}</td>
                <td>${designation}</td>
                <td>${formatData(member.Address)}</td>
                <td>${formatPhone(member.phone_number)}</td>
                <td>${formatData(member.email)}</td>
                <td>${formatIC(member.IC)}</td>
                <td>${formatIC(member.oldIC)}</td>
                <td>${gender}</td>
                <td>${companyName}</td>
                <td>${formatData(member.Birthday)}</td>
                <td>${expiredDate}</td>
                <td>${placeOfBirth}</td>
                <td>${position}</td>
                <td>${formatData(member.others)}</td>
                <td>${formatData(member.remarks)}</td>
                <td class="payment-status-cell">
                    <div class="payment-checkbox ${isPaid ? 'checked' : ''}" onclick="toggleMadedPayment(this, '${rawId}', ${isPaid ? 0 : 1})" title="点击切换付款状态"></div>
                </td>
                <td class="renewal-cell">
                    <button class="btn btn-info btn-expand" onclick="toggleRenewalDetails(this, '${rawId}')" title="查看续费记录">
                        <i class="fas fa-plus"></i>
                    </button>
                </td>
                <td class="action-cell">
                    <button class="btn btn-edit" onclick="editMember('${rawId}')" title="编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-delete" onclick="deleteMember('${rawId}')" title="删除">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-check" onclick="checkMember('${rawId}')" title="查看详情">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-info" onclick="openRenewalModal('${rawId}')" title="添加续费记录">
                        <i class="fas fa-plus-circle"></i>
                    </button>
                </td>
            `;
            memberTableBody.appendChild(row);

            // Add the hidden details row
            const detailsRow = document.createElement('tr');
            detailsRow.id = `renewal-details-${rawId}`;
            detailsRow.className = 'renewal-details-row';
            detailsRow.style.display = 'none';
            const colspan = table?.querySelector('thead tr')?.cells.length || 20;
            detailsRow.innerHTML = `<td colspan="${colspan}"><div class="renewal-details-content"></div></td>`;
            memberTableBody.appendChild(detailsRow);
        });
    }

    function updatePagination() {
        if (!paginationContainer || !prevPageButton || !nextPageButton) return;
        paginationContainer.innerHTML = '';
        const maxPagesToShow = 5;
        let startPage, endPage;
        if (totalPages <= maxPagesToShow) {
            startPage = 1;
            endPage = totalPages;
        } else {
            const maxPagesBeforeCurrent = Math.floor(maxPagesToShow / 2);
            const maxPagesAfterCurrent = Math.ceil(maxPagesToShow / 2) - 1;
            if (currentPage <= maxPagesBeforeCurrent) {
                startPage = 1;
                endPage = maxPagesToShow;
            } else if (currentPage + maxPagesAfterCurrent >= totalPages) {
                startPage = totalPages - maxPagesToShow + 1;
                endPage = totalPages;
            } else {
                startPage = currentPage - maxPagesBeforeCurrent;
                endPage = currentPage + maxPagesAfterCurrent;
            }
        }
        if (startPage > 1) {
            paginationContainer.appendChild(createPaginationButton(1));
            if (startPage > 2) paginationContainer.appendChild(createPaginationEllipsis());
        }
        for (let i = startPage; i <= endPage; i++) {
            paginationContainer.appendChild(createPaginationButton(i, i === currentPage));
        }
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) paginationContainer.appendChild(createPaginationEllipsis());
            paginationContainer.appendChild(createPaginationButton(totalPages));
        }
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage >= totalPages;
        // Update or create page jump info
        let pageInfoDiv = document.querySelector('.pagination-info');
        if (!pageInfoDiv) {
            const pageInfoContainer = document.querySelector('.pagination-container');
            if (pageInfoContainer) {
                pageInfoDiv = document.createElement('div');
                pageInfoDiv.className = 'pagination-info';
                pageInfoDiv.innerHTML = `
                    <span class="page-indicator">${currentPage} / ${totalPages}</span>
                    <div class="page-jump">
                        <input type="number" id="pageInput" min="1" max="${totalPages}" placeholder="页码" class="page-input" aria-label="Jump to page number">
                        <button onclick="jumpToPage()" class="jump-btn btn btn-secondary">跳转</button>
                    </div>
                 `;
                const itemsPerPageDiv = document.querySelector('.items-per-page');
                if (itemsPerPageDiv) {
                    pageInfoContainer.insertBefore(pageInfoDiv, itemsPerPageDiv);
                } else {
                    pageInfoContainer.appendChild(pageInfoDiv);
                }
                const pageInput = document.getElementById('pageInput');
                pageInput?.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        jumpToPage();
                    }
                });
            }
        } else {
            const pageIndicator = pageInfoDiv.querySelector('.page-indicator');
            if (pageIndicator) pageIndicator.textContent = `${currentPage} / ${totalPages}`;
            const pageInput = pageInfoDiv.querySelector('#pageInput');
            if (pageInput) pageInput.max = totalPages;
        }
    }


    function createPaginationButton(pageNumber, isActive = false) {
        const button = document.createElement('button');
        button.textContent = pageNumber;
        button.className = `pagination-btn ${isActive ? 'active' : ''}`;
        button.onclick = () => changePage(pageNumber);
        return button;
    }

    function createPaginationEllipsis() {
        const span = document.createElement('span');
        span.className = 'pagination-ellipsis';
        span.textContent = '...';
        return span;
    }

    function updateSortIcons() {
        document.querySelectorAll('th[data-column]').forEach(th => {
            const column = th.dataset.column;
            let icon = th.querySelector('i.sort-arrow');
            if (!icon) {
                icon = document.createElement('i');
                icon.className = 'sort-arrow fas fa-sort';
                // Ensure space before icon if header text exists
                if (th.firstChild && th.firstChild.nodeType === Node.TEXT_NODE) {
                   th.insertBefore(document.createTextNode(' '), th.firstChild.nextSibling);
                } else {
                   th.appendChild(document.createTextNode(' '));
                }
                th.appendChild(icon);
            }

            icon.classList.remove('fa-sort-up', 'fa-sort-down', 'fa-sort'); // Reset classes

            if (column === sortColumn) {
                icon.classList.add(sortDirection === 'ASC' ? 'fa-sort-up' : 'fa-sort-down');
            } else {
                icon.classList.add('fa-sort'); // Default icon if not the sorted column
            }
        });
    }


    function handleSortClick(columnName) {
        if (!columnName) return;
        if (sortColumn === columnName) {
            sortDirection = sortDirection === 'ASC' ? 'DESC' : 'ASC';
        } else {
            sortColumn = columnName;
            sortDirection = 'ASC';
        }
        currentPage = 1;
        fetchMembers(); // Fetch with current search/filter state
    }

    // ===== Column Resizing (No changes needed) =====
    function initializeResizableColumns() {
        const table = document.getElementById('memberTable');
        if (!table) return;
        const resizableHeaders = table.querySelectorAll('thead th[data-column]');
        resizableHeaders.forEach(th => {
            let resizer = th.querySelector('.resizer');
            if (!resizer) {
                resizer = document.createElement('div');
                resizer.className = 'resizer';
                th.appendChild(resizer);
            }
            resizer.addEventListener('mousedown', initResize);
            resizer.addEventListener('selectstart', (e) => e.preventDefault());
        });

        function initResize(e) {
            const resizer = e.target;
            const currentTh = resizer.parentElement;
            if (!currentTh || currentTh.tagName !== 'TH') return;
            e.preventDefault();
            e.stopPropagation();
            const startX = e.pageX;
            const startWidth = currentTh.offsetWidth;
            const tableContainer = currentTh.closest('.table-responsive') || document.body;
            currentTh.classList.add('resizing');
            tableContainer.classList.add('table-resizing');
            document.addEventListener('mousemove', performResize);
            document.addEventListener('mouseup', stopResize, { once: true });
            function performResize(moveEvent) {
                const widthChange = moveEvent.pageX - startX;
                let newWidth = startWidth + widthChange;
                const minWidth = parseInt(currentTh.style.minWidth || '50', 10);
                newWidth = Math.max(minWidth, newWidth);
                currentTh.style.width = `${newWidth}px`;
                if (table.style.tableLayout !== 'fixed') {
                    table.style.tableLayout = 'fixed';
                }
            }
            function stopResize() {
                document.removeEventListener('mousemove', performResize);
                currentTh.classList.remove('resizing');
                tableContainer.classList.remove('table-resizing');
                saveColumnWidths();
            }
        }
    }

    function saveColumnWidths() {
        try {
            const widths = {};
            table.querySelectorAll('thead th[data-column]').forEach(header => {
                const column = header.dataset.column;
                if (column && header.style.width && header.style.width.includes('px')) {
                    widths[column] = header.style.width;
                }
            });
            if (Object.keys(widths).length > 0) {
                localStorage.setItem('memberTableColumnWidths', JSON.stringify(widths));
            } else {
                localStorage.removeItem('memberTableColumnWidths');
            }
        } catch (error) {
            console.error('Error saving column widths:', error);
        }
    }

    function loadColumnWidths() {
        try {
            const savedWidths = JSON.parse(localStorage.getItem('memberTableColumnWidths') || '{}');
            let widthsApplied = false;
            let requiresFixedLayout = false;
            table.querySelectorAll('thead th[data-column]').forEach(header => {
                const column = header.dataset.column;
                if (savedWidths[column]) {
                    header.style.width = savedWidths[column];
                    widthsApplied = true;
                    requiresFixedLayout = true;
                } else {
                    setDefaultColumnWidth(header);
                }
            });
            if (requiresFixedLayout || tableRequiresFixedLayoutByDefault()) {
                if (table.style.tableLayout !== 'fixed') {
                    table.style.tableLayout = 'fixed';
                }
            }
        } catch (error) {
            console.error('Error loading column widths:', error);
            table.querySelectorAll('thead th[data-column]').forEach(setDefaultColumnWidth);
            if (tableRequiresFixedLayoutByDefault()) {
                if (table.style.tableLayout !== 'fixed') {
                    table.style.tableLayout = 'fixed';
                }
            }
        }
    }

    function tableRequiresFixedLayoutByDefault() {
        return !!(table.querySelector('th[data-column="Address"]') || table.querySelector('th[data-column="remarks"]'));
    }

    function setDefaultColumnWidth(header) {
        if (!header || !header.dataset || !header.dataset.column) return;
        const column = header.dataset.column;
        let defaultWidth = '150px';
        let minWidth = '60px';
        let needsNormalWhitespace = false;
        switch (column) {
            case 'membersID': defaultWidth = '90px'; break;
            case 'Name': case 'CName': defaultWidth = '160px'; break;
            case 'Designation_of_Applicant': defaultWidth = '100px'; break;
            case 'Address': defaultWidth = '250px'; needsNormalWhitespace = true; minWidth = '150px'; break;
            case 'phone_number': defaultWidth = '130px'; break;
            case 'email': defaultWidth = '180px'; break;
            case 'IC': case 'oldIC': defaultWidth = '140px'; break;
            case 'gender': defaultWidth = '70px'; break;
            case 'componyName': defaultWidth = '180px'; break;
            case 'Birthday': defaultWidth = '100px'; break;
            case 'expired_date': defaultWidth = '120px'; break;
            case 'place_of_birth': defaultWidth = '130px'; break;
            case 'position': defaultWidth = '120px'; break;
            case 'others': defaultWidth = '150px'; break;
            case 'remarks': defaultWidth = '250px'; needsNormalWhitespace = true; minWidth = '150px'; break;
            case 'maded_payment': defaultWidth = '80px'; break;
        }
        header.style.width = defaultWidth;
        header.style.minWidth = minWidth;
        header.style.whiteSpace = needsNormalWhitespace ? 'normal' : 'nowrap';
    }

    function resetColumnWidths() {
        try {
            localStorage.removeItem('memberTableColumnWidths');
            table.querySelectorAll('thead th[data-column]').forEach(header => {
                header.style.width = '';
                setDefaultColumnWidth(header);
            });
            if (tableRequiresFixedLayoutByDefault()) {
                if (table.style.tableLayout !== 'fixed') {
                    table.style.tableLayout = 'fixed';
                }
            } else {
                table.style.tableLayout = '';
            }
            console.log('Column widths reset to default values');
        } catch (error) {
            console.error('Error resetting column widths:', error);
        }
    }

    // ===== EVENT LISTENERS =====
    function initializeEventListeners() {
        const debouncedSearch = debounce(() => {
            currentPage = 1;
            fetchMembers(); // fetchMembers now reads searchInput value directly
        }, 350);

        searchInput?.addEventListener("input", function () {
            const query = this.value.trim();
            if (query !== "") {
                // General search is active, clear specific filters
                console.log("General search activated, clearing specific filters.");
                targetBirthdayMonth = null;
                targetStartDate = null;
                targetEndDate = null;
                targetRenewalTerm = null;
                targetRenewalStartDate = null;
                targetRenewalEndDate = null;
                targetRenewalType = null;
                targetMadedPayment = null;
                if (memberFilter) memberFilter.value = '';
                if (madedPaymentFilter) madedPaymentFilter.value = '';

                // Close modals if open
                if (birthdayModal && birthdayModal.style.display === 'block') closeBirthdayModal();
                if (expiryModal && expiryModal.style.display === 'block') closeExpiryModal();
                if (renewalTermModal && renewalTermModal.style.display === 'block') closeRenewalTermModal();
                if (renewalDateModal && renewalDateModal.style.display === 'block') closeRenewalDateModal();
            }
             // Always trigger debounced search on input
            debouncedSearch();
            // Update button states immediately for responsiveness
            updateFilterButtonStates();
        });

        // Add paste event handler to clear the search input before pasting
        searchInput?.addEventListener("paste", function(e) {
            // Prevent the default paste behavior
            e.preventDefault();
            
            // Get the clipboard data as text
            const clipboardData = e.clipboardData || window.clipboardData;
            const pastedText = clipboardData.getData('text');
            
            // Clear the current value and set the new value
            this.value = pastedText;
            
            // Trigger the input event to activate search
            this.dispatchEvent(new Event('input'));
        });

        thead?.addEventListener('click', function (event) {
            const header = event.target.closest('th[data-column]');
            if (header && !event.target.classList.contains('resizer')) {
                handleSortClick(header.dataset.column);
            }
        });

        prevPageButton?.addEventListener("click", () => changePage(currentPage - 1));
        nextPageButton?.addEventListener("click", () => changePage(currentPage + 1));

        listAllMembersButton?.addEventListener("click", function () {
            console.log("Listing all members, resetting filters and search.");
            currentPage = 1;
            targetStartDate = null;
            targetEndDate = null;
            targetBirthdayMonth = null;
            targetRenewalTerm = null;
            targetRenewalStartDate = null;
            targetRenewalEndDate = null;
            targetRenewalType = null;
            targetMadedPayment = null;
            if (memberFilter) memberFilter.value = '';
            if (madedPaymentFilter) madedPaymentFilter.value = '';
            if (searchInput) searchInput.value = '';
            fetchMembers();
            // No need to call updateFilterButtonStates here, fetchMembers does it
        });

        memberFilter?.addEventListener('change', function () {
            console.log("Applicant type filter changed to:", this.value);
            // Clear general search when a specific filter is changed
            if (searchInput) searchInput.value = '';
            currentPage = 1;
            fetchMembers();
            // No need to call updateFilterButtonStates here, fetchMembers does it
        });

        madedPaymentFilter?.addEventListener('change', function () {
            console.log("Maded payment filter changed to:", this.value);
            if (searchInput) searchInput.value = '';
            currentPage = 1;
            targetMadedPayment = this.value; // Set the state
            fetchMembers();
        });

        itemsPerPageSelect?.addEventListener("change", function () {
            itemsPerPage = parseInt(this.value);
            currentPage = 1;
            fetchMembers();
            // No need to call updateFilterButtonStates here, fetchMembers does it
        });

        confirmExpirySearchButton?.addEventListener('click', handleConfirmExpirySearch);
        closeExpiryButton?.addEventListener('click', closeExpiryModal);

        confirmBirthdaySearchButton?.addEventListener('click', handleConfirmBirthdaySearch);
        closeBirthdayButton?.addEventListener('click', closeBirthdayModal);

        confirmRenewalTermSearchButton?.addEventListener('click', handleConfirmRenewalTermSearch);
        closeRenewalTermButton?.addEventListener('click', closeRenewalTermModal);

        confirmRenewalDateSearchButton?.addEventListener('click', handleConfirmRenewalDateSearch);
        closeRenewalDateButton?.addEventListener('click', closeRenewalDateModal);

        // Import Modal Listeners
        closeImportButton?.addEventListener('click', closeImportModal);
        importFileInput?.addEventListener('change', handleFileSelect);
        confirmImportButton?.addEventListener('click', performImport);

        // Renewal Add/Edit Modal Listener
        saveRenewalButton?.addEventListener('click', saveRenewalData);

        modalOverlay?.addEventListener('click', () => {
            // Close any open modal when clicking overlay
            if (expiryModal?.style.display === 'block') closeExpiryModal();
            if (birthdayModal?.style.display === 'block') closeBirthdayModal();
            if (renewalTermModal?.style.display === 'block') closeRenewalTermModal();
            if (renewalDateModal?.style.display === 'block') closeRenewalDateModal();
            if (exportModal?.style.display === 'block') closeExportModal();
            if (applicantTypesModal?.style.display === 'block') closeApplicantTypesModal();
            if (importModal?.style.display === 'block') closeImportModal();
            if (renewalAddEditModal?.style.display === 'block') closeRenewalModal();
        });
    }

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

    function handleConfirmExpirySearch() {
        const startYear = expiryStartYearInput?.value.trim();
        const startMonth = expiryStartMonthInput?.value;
        const startDay = expiryStartDayInput?.value.trim();
        const endYear = expiryEndYearInput?.value.trim();
        const endMonth = expiryEndMonthInput?.value;
        const endDay = expiryEndDayInput?.value.trim();

        if (!startYear || !startMonth || !startDay || !endYear || !endMonth || !endDay) {
            alert("请完整填写开始日期和结束日期的年、月、日。");
            return;
        }
        const startDateStr = `${startYear}-${padStart(startMonth)}-${padStart(startDay)}`;
        const endDateStr = `${endYear}-${padStart(endMonth)}-${padStart(endDay)}`;

        if (!isValidDateString(startDateStr)) {
            alert(`开始日期无效: ${startDateStr}。请检查年月日是否正确。`);
            expiryStartDayInput?.focus();
            return;
        }
        if (!isValidDateString(endDateStr)) {
            alert(`结束日期无效: ${endDateStr}。请检查年月日是否正确。`);
            expiryEndDayInput?.focus();
            return;
        }
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);
        if (startDate > endDate) {
            alert("开始日期不能晚于结束日期。");
            return;
        }

        console.log(`Applying expiry filter: ${startDateStr} to ${endDateStr}`);
        targetStartDate = startDateStr;
        targetEndDate = endDateStr;
        // Clear general search when applying specific filter
        if (searchInput) searchInput.value = '';
        currentPage = 1;
        fetchMembers();
        closeExpiryModal();
        // No need to call updateFilterButtonStates here, fetchMembers does it
    }

    function handleConfirmBirthdaySearch() {
        const month = birthdayMonthInput?.value;
        if (!month) {
            alert("请选择一个月份。");
            birthdayMonthInput?.focus();
            return;
        }
        console.log(`Applying birthday filter for month: ${month}`);
        targetBirthdayMonth = parseInt(month, 10);
        // Clear general search when applying specific filter
        if (searchInput) searchInput.value = '';
        currentPage = 1;
        fetchMembers();
        closeBirthdayModal();
        // No need to call updateFilterButtonStates here, fetchMembers does it
    }

    function handleConfirmRenewalTermSearch() {
        const term = renewalTermInput?.value;
        if (!term || isNaN(parseInt(term, 10)) || parseInt(term, 10) <= 0) {
            alert("请输入一个有效的正整数作为续费时长。");
            renewalTermInput?.focus();
            return;
        }
        console.log(`Applying renewal term filter for: ${term} months`);
        targetRenewalTerm = parseInt(term, 10);
        // Clear general search when applying specific filter
        if (searchInput) searchInput.value = '';
        currentPage = 1;
        fetchMembers();
        closeRenewalTermModal();
    }

    function handleConfirmRenewalDateSearch() {
        const startYear = renewalStartDateYearInput?.value.trim();
        const startMonth = renewalStartDateMonthInput?.value;
        const startDay = renewalStartDateDayInput?.value.trim();
        const endYear = renewalEndDateYearInput?.value.trim();
        const endMonth = renewalEndDateMonthInput?.value;
        const endDay = renewalEndDateDayInput?.value.trim();
        const renewalType = document.querySelector('input[name="renewalType"]:checked')?.value;

        if (!startYear || !startMonth || !startDay || !endYear || !endMonth || !endDay) {
            alert("请完整填写开始日期和结束日期的年、月、日。");
            return;
        }
        const startDateStr = `${startYear}-${padStart(startMonth)}-${padStart(startDay)}`;
        const endDateStr = `${endYear}-${padStart(endMonth)}-${padStart(endDay)}`;

        if (!isValidDateString(startDateStr)) {
            alert(`开始日期无效: ${startDateStr}。请检查年月日是否正确。`);
            renewalStartDateDayInput?.focus();
            return;
        }
        if (!isValidDateString(endDateStr)) {
            alert(`结束日期无效: ${endDateStr}。请检查年月日是否正确。`);
            renewalEndDateDayInput?.focus();
            return;
        }
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);
        if (startDate > endDate) {
            alert("开始日期不能晚于结束日期。");
            return;
        }

        console.log(`Applying renewal date filter: ${startDateStr} to ${endDateStr} with type ${renewalType}`);
        targetRenewalStartDate = startDateStr;
        targetRenewalEndDate = endDateStr;
        targetRenewalType = renewalType;
        
        if (searchInput) searchInput.value = '';
        currentPage = 1;
        fetchMembers();
        closeRenewalDateModal();
    }


    // ===== Action Button Handlers (No changes needed) =====
    window.editMember = function (id) {
        if (!id) { console.error("Edit Error: No ID"); alert("无法编辑：ID未提供"); return; }
        console.log(`Redirecting to edit member with ID: ${id}`);
        window.location.href = `edit_member.html?action=edit&id=${id}`;
    };

    window.deleteMember = async function (id) {
        if (!id) { console.error("Delete Error: No ID"); alert("无法删除：ID未提供"); return; }
        if (confirm(`确定要删除塾员 ID ${id} 吗？此操作无法撤销。`)) {
            console.log(`Attempting to delete member with ID: ${id}`);
            const deleteUrl = `${API_BASE_URL}?table=members&ID=${id}`;
            try {
                const response = await fetch(deleteUrl, { method: 'DELETE' });
                let message = `删除失败 (Status: ${response.status})`;
                let success = false;
                if (response.ok) {
                    message = '删除成功！';
                    success = true;
                    if (response.status !== 204 && response.headers.get("content-type")?.includes("application/json")) {
                        try {
                            const data = await response.json();
                            message = data.message || message;
                        } catch (e) { console.warn("Could not parse JSON response on delete success:", e); }
                    }
                } else {
                    try {
                        const errorData = await response.json();
                        message = errorData.message || message;
                    } catch (e) {
                        try { message = await response.text() || message; } catch (e2) { }
                    }
                }
                alert(message);
                if (success) {
                    fetchMembers(); // Refresh list after successful deletion
                }
            } catch (error) {
                console.error("Error deleting member:", error);
                alert(`删除时发生网络或脚本错误: ${error.message}`);
            }
        }
    };

    window.checkMember = function (id) {
        if (!id) { console.error("Check Error: No ID"); alert("无法查看：ID未提供"); return; }
        console.log(`Redirecting to check details for member ID: ${id}`);
        window.location.href = `check_details.html?id=${id}`;
    };

    window.toggleMadedPayment = async function(element, memberId, newStatus) {
        // Prevent multiple clicks while processing
        if (element.classList.contains('processing')) return;
        element.classList.add('processing');

        console.log(`Updating maded_payment for member ID ${memberId} to ${newStatus}`);

        try {
            const updateUrl = `${API_BASE_URL}?table=members&ID=${encodeURIComponent(memberId)}`;
            const response = await fetch(updateUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ maded_payment: newStatus })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: '更新失败，无法解析服务器响应。' }));
                throw new Error(errorData.message || `更新失败 (Status: ${response.status})`);
            }

            // Success: Update UI
            element.classList.toggle('checked', newStatus === 1);
            // Update the onclick attribute for the next toggle
            element.setAttribute('onclick', `toggleMadedPayment(this, '${memberId}', ${newStatus === 1 ? 0 : 1})`);

        } catch (error) {
            console.error("Error updating maded_payment:", error);
            alert(`更新付款状态失败: ${error.message}`);
            // Revert UI on failure? For now, we just show an alert.
        } finally {
            element.classList.remove('processing');
        }
    };

    // ===== Renewal Details Handlers =====
    window.toggleRenewalDetails = async function(button, memberId) {
        const detailsRow = document.getElementById(`renewal-details-${memberId}`);
        const icon = button.querySelector('i');

        if (!detailsRow || !icon) {
            console.error("Could not find details row or icon for member", memberId);
            return;
        }

        const isExpanded = detailsRow.style.display !== 'none';

        if (isExpanded) {
            detailsRow.style.display = 'none';
            icon.classList.remove('fa-minus');
            icon.classList.add('fa-plus');
            button.classList.remove('expanded');
        } else {
            detailsRow.style.display = 'table-row';
            icon.classList.remove('fa-plus');
            icon.classList.add('fa-minus');
            button.classList.add('expanded');

            // Fetch data only if it hasn't been loaded yet
            if (detailsRow.dataset.loaded !== 'true') {
                const detailsContent = detailsRow.querySelector('.renewal-details-content');
                if (detailsContent) {
                    detailsContent.innerHTML = '<span><i class="fas fa-spinner fa-spin"></i> 正在加载续费记录...</span>';
                    try {
                        const renewals = await fetchRenewalData(memberId);
                        displayRenewalData(detailsContent, renewals, memberId);
                        detailsRow.dataset.loaded = 'true';
                    } catch (error) {
                        detailsContent.innerHTML = `<span style="color: red;">加载失败: ${error.message}</span>`;
                    }
                }
            }
        }
    };

    async function fetchRenewalData(memberId) {
        // Note: The API endpoint needs to support fetching renewals by member_id
        const url = `${API_BASE_URL}?table=member_renewals&search=true&member_id=${memberId}&direct=true&limit=1000`;
        console.log("Fetching renewals from:", url);
        const response = await fetch(url);
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Server error response for renewals: ${errorText}`);
            throw new Error(`服务器错误 (Status: ${response.status})`);
        }
        const data = await response.json();
        const renewals = data.data || [];
        renewalDataCache[memberId] = renewals; // Cache the data
        return renewals;
    }

    function displayRenewalData(container, renewals, memberId) {
        if (!renewals || renewals.length === 0) {
            container.innerHTML = '此塾员还未有续费记录';
            return;
        }

        let tableHTML = `
            <table class="renewal-history-table">
                <thead>
                    <tr>
                        <th>续费日期（具体续费日期）</th>
                        <th>旧的到期日期</th>
                        <th>新的到期日期</th>
                        <th>续费时长 (月)</th>
                        <th>首次续费（记录此条记录是否是首次续费记录）</th>
                        <th>记录时间（此条记录记录时间）</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
        `;

        // Sort renewals by renewed_at date, descending (most recent first)
        renewals.sort((a, b) => new Date(b.renewed_at) - new Date(a.renewed_at));

        renewals.forEach(renewal => {
            const renewalId = renewal.ID || renewal.id;
            tableHTML += `
                <tr>
                    <td>${formatDate(renewal.renewed_at)}</td>
                    <td>${formatDate(renewal.previous_end)}</td>
                    <td>${formatDate(renewal.new_end)}</td>
                    <td>${renewal.term_months || ''}</td>
                    <td>${renewal.is_first_time == '1' ? '是' : '否'}</td>
                    <td>${renewal.recorded_at || ''}</td>
                    <td>
                        <button class="btn btn-edit" onclick="openRenewalModal('${memberId}', '${renewalId}')" title="编辑此条记录">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-delete btn-delete-renewal" onclick="deleteRenewalRecord('${renewalId}', '${memberId}')" title="删除此条记录">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        tableHTML += `</tbody></table>`;
        container.innerHTML = tableHTML;
    }

    async function reloadRenewalDetails(memberId) {
        const detailsRow = document.getElementById(`renewal-details-${memberId}`);
        if (!detailsRow) return;
        const detailsContent = detailsRow.querySelector('.renewal-details-content');
        if (!detailsContent) return;

        detailsContent.innerHTML = '<span><i class="fas fa-spinner fa-spin"></i> 正在刷新...</span>';
        try {
            const renewals = await fetchRenewalData(memberId);
            displayRenewalData(detailsContent, renewals, memberId);
        } catch (error) {
            detailsContent.innerHTML = `<span style="color: red;">刷新失败: ${error.message}</span>`;
        }
    }

    window.deleteRenewalRecord = async function(renewalId, memberId) {
        if (!renewalId || !memberId) {
            alert("删除错误：缺少必要ID。");
            return;
        }
        if (!confirm('确定要删除这条续费记录吗？此操作无法撤销。')) {
            return;
        }

        try {
            const deleteUrl = `${API_BASE_URL}?table=member_renewals&ID=${renewalId}`;
            const response = await fetch(deleteUrl, { method: 'DELETE' });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: '删除失败，无法解析服务器响应。' }));
                throw new Error(errorData.message || `删除失败 (Status: ${response.status})`);
            }

            alert("续费记录删除成功！");
            reloadRenewalDetails(memberId); // Refresh the list for this member

        } catch (error) {
            console.error("Error deleting renewal record:", error);
            alert(`删除失败: ${error.message}`);
        }
    };


    // ===== Pagination Handlers (No changes needed) =====
    window.changePage = function (page) {
        const targetPage = parseInt(page, 10);
        if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= totalPages && targetPage !== currentPage) {
            console.log(`Changing page from ${currentPage} to ${targetPage}`);
            currentPage = targetPage;
            fetchMembers();
        } else {
            console.log(`Page change to ${page} ignored. Current: ${currentPage}, Total: ${totalPages}`);
        }
    };

    window.jumpToPage = function () {
        const pageInput = document.getElementById('pageInput');
        if (!pageInput) return;
        const targetPage = parseInt(pageInput.value, 10);
        if (isNaN(targetPage) || targetPage < 1 || targetPage > totalPages) {
            alert(`请输入有效的页码 (1 到 ${totalPages})。`);
            pageInput.value = '';
            pageInput.focus();
        } else {
            pageInput.value = '';
            changePage(targetPage);
        }
    };

    // ===== Modal Handlers (Minor adjustments for overlay logic) =====
    window.openExpiryModal = function () {
        if (expiryModal && modalOverlay) {
            const now = new Date();
            if (expiryStartYearInput) expiryStartYearInput.value = now.getFullYear();
            if (expiryStartMonthInput) expiryStartMonthInput.value = now.getMonth() + 1;
            if (expiryStartDayInput) expiryStartDayInput.value = '1';
            if (expiryEndYearInput) expiryEndYearInput.value = now.getFullYear();
            if (expiryEndMonthInput) expiryEndMonthInput.value = now.getMonth() + 1;
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            if (expiryEndDayInput) expiryEndDayInput.value = lastDay;
            expiryModal.style.display = 'block';
            modalOverlay.style.display = 'block';
            expiryStartYearInput?.focus();
        } else {
            console.error("Expiry modal or overlay element not found.");
            alert("无法打开到期查询窗口。");
        }
    };

    window.closeExpiryModal = function () {
        if (expiryModal && modalOverlay) {
            expiryModal.style.display = 'none';
            // Only hide overlay if NO OTHER modal is open
            if (document.querySelectorAll('.modal[style*="display: block"]').length === 0) {
                modalOverlay.style.display = 'none';
            }
        }
    };

    window.openBirthdayModal = function () {
        if (birthdayModal && modalOverlay) {
            const now = new Date();
            if (birthdayMonthInput) birthdayMonthInput.value = String(now.getMonth() + 1);
            birthdayModal.style.display = 'block';
            modalOverlay.style.display = 'block';
            birthdayMonthInput?.focus();
        } else {
            console.error("Birthday modal or overlay element not found.");
            alert("无法打开生日查询窗口。");
        }
    };

    window.closeBirthdayModal = function () {
        if (birthdayModal && modalOverlay) {
            birthdayModal.style.display = 'none';
            // Only hide overlay if NO OTHER modal is open
            if (document.querySelectorAll('.modal[style*="display: block"]').length === 0) {
                modalOverlay.style.display = 'none';
            }
        }
    };

    window.openRenewalTermModal = function () {
        if (renewalTermModal && modalOverlay) {
            if (renewalTermInput) renewalTermInput.value = ''; // Clear previous input
            renewalTermModal.style.display = 'block';
            modalOverlay.style.display = 'block';
            renewalTermInput?.focus();
        } else {
            console.error("Renewal Term modal or overlay element not found.");
            alert("无法打开续费时长查询窗口。");
        }
    };

    window.closeRenewalTermModal = function () {
        if (renewalTermModal && modalOverlay) {
            renewalTermModal.style.display = 'none';
            if (document.querySelectorAll('.modal[style*="display: block"]').length === 0) {
                modalOverlay.style.display = 'none';
            }
        }
    };

    window.openRenewalDateModal = function () {
        if (renewalDateModal && modalOverlay) {
            const now = new Date();
            if (renewalStartDateYearInput) renewalStartDateYearInput.value = now.getFullYear();
            if (renewalStartDateMonthInput) renewalStartDateMonthInput.value = now.getMonth() + 1;
            if (renewalStartDateDayInput) renewalStartDateDayInput.value = '1';
            if (renewalEndDateYearInput) renewalEndDateYearInput.value = now.getFullYear();
            if (renewalEndDateMonthInput) renewalEndDateMonthInput.value = now.getMonth() + 1;
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            if (renewalEndDateDayInput) renewalEndDateDayInput.value = lastDay;
            // Reset radio button to default
            const defaultRadio = document.querySelector('input[name="renewalType"][value="all"]');
            if (defaultRadio) defaultRadio.checked = true;

            renewalDateModal.style.display = 'block';
            modalOverlay.style.display = 'block';
            renewalStartDateYearInput?.focus();
        } else {
            console.error("Renewal Date modal or overlay element not found.");
            alert("无法打开续费日期查询窗口。");
        }
    };

    window.closeRenewalDateModal = function () {
        if (renewalDateModal && modalOverlay) {
            renewalDateModal.style.display = 'none';
            if (document.querySelectorAll('.modal[style*="display: block"]').length === 0) {
                modalOverlay.style.display = 'none';
            }
        }
    };

    // Make reset function globally accessible
    window.resetColumnWidths = resetColumnWidths;

    // ===== EXPORT FUNCTIONS (No changes needed) =====
    const exportModal = document.getElementById('exportModal');
    const exportColumnsContainer = document.querySelector('.export-columns-container');
    const confirmExportButton = document.getElementById('confirmExport');
    const applicantTypesModal = document.getElementById('applicantTypesModal'); // Define applicantTypesModal

    window.openExportModal = function() { // Make globally accessible
        if (!exportModal || !exportColumnsContainer || !modalOverlay) return;
        exportColumnsContainer.innerHTML = ''; // Clear previous content

        // Add Select/Deselect All buttons
        const selectActions = document.createElement('div');
        selectActions.className = 'select-actions';
        selectActions.innerHTML = `
            <button type="button" class="btn btn-secondary" id="selectAllColumns">全选</button>
            <button type="button" class="btn btn-secondary" id="deselectAllColumns">取消全选</button>
        `;
        // Prepend actions to the container
        exportColumnsContainer.insertBefore(selectActions, exportColumnsContainer.firstChild);


        const columnHeaders = Array.from(document.querySelectorAll('#memberTable thead th[data-column]'));
        columnHeaders.forEach(header => {
            const columnName = header.dataset.column;
            // Get text content and remove sort arrows (▲▼) if present
            const displayName = header.textContent.trim().replace(/[▲▼\s]*$/, '');
            const columnItem = document.createElement('div');
            columnItem.className = 'export-column-item';
            columnItem.innerHTML = `
                <input type="checkbox" id="export-${columnName}" name="export-columns" value="${columnName}" checked>
                <label for="export-${columnName}">${displayName}</label>
            `;
            exportColumnsContainer.appendChild(columnItem);
        });

        // Add event listeners for select/deselect buttons
        document.getElementById('selectAllColumns')?.addEventListener('click', () => {
            document.querySelectorAll('input[name="export-columns"]').forEach(checkbox => {
                checkbox.checked = true;
            });
        });
        document.getElementById('deselectAllColumns')?.addEventListener('click', () => {
            document.querySelectorAll('input[name="export-columns"]').forEach(checkbox => {
                checkbox.checked = false;
            });
        });

        exportModal.style.display = 'block';
        modalOverlay.style.display = 'block';
    }

    window.closeExportModal = function() { // Make globally accessible
        if (!exportModal || !modalOverlay) return;
        exportModal.style.display = 'none';
        // Only hide overlay if NO OTHER modal is open
        if (document.querySelectorAll('.modal[style*="display: block"]').length === 0) {
            modalOverlay.style.display = 'none';
        }
    }


    // Helper function to split emails with multiple addresses
    function splitEmails(emailStr) {
        if (!emailStr) return [''];
        // Split by comma or slash
        if (emailStr.includes(',') || emailStr.includes('/')) {
            // Replace slashes with commas first, then split by comma
            return emailStr.replace(/\//g, ',').split(',').map(email => email.trim()).filter(email => email);
        }
        return [emailStr];
    }

    function exportData() {
        const selectedColumns = Array.from(document.querySelectorAll('input[name="export-columns"]:checked'))
            .map(checkbox => checkbox.value);
        if (selectedColumns.length === 0) {
            alert('请至少选择一列数据进行导出');
            return;
        }

        // 获取选择的导出格式
        const exportFormatElement = document.querySelector('input[name="export-format"]:checked');
        if (!exportFormatElement) {
             alert('请选择导出格式 (TXT 或 CSV)');
             return;
        }
        const exportFormat = exportFormatElement.value;
        const delimiter = exportFormat === 'csv' ? ',' : ';';
        const splitEmailsCheckbox = document.getElementById('splitEmailsCheckbox');
        const shouldSplitEmails = splitEmailsCheckbox ? splitEmailsCheckbox.checked : true;

        let exportContent = '';
        const headers = selectedColumns.map(column => {
            const headerElement = document.querySelector(`#memberTable thead th[data-column="${column}"]`);
            // Get text content and remove sort arrows (▲▼) if present
            const headerText = headerElement ? headerElement.textContent.trim().replace(/[▲▼\s]*$/, '') : column;
            // If CSV format, handle quotes and commas within the header itself
            return exportFormat === 'csv' ? `"${headerText.replace(/"/g, '""')}"` : headerText;
        });


        exportContent += headers.join(delimiter) + '\n';

        // Check if email column is selected for export
        const emailColumnIndex = selectedColumns.indexOf('email');
        const hasEmailColumn = emailColumnIndex !== -1;

        membersData.forEach(member => {
            // Process each member data
            let rowDataTemplate = [];

            // Prepare all column values except email (if present)
            selectedColumns.forEach((column, index) => {
                if (column === 'email' && hasEmailColumn) {
                    // Skip email column here, we'll handle it separately
                    rowDataTemplate.push(''); // Placeholder
                    return;
                }

                let value = '';

                // Use original unformatted data where appropriate for export
                if (column === 'phone_number') {
                    value = member[column] || ''; // Export raw phone number
                } else if (column === 'IC' || column === 'oldIC') {
                     value = member[column] || ''; // Export raw IC
                } else if (column === 'expired_date') {
                    value = formatDate(member[column] || member['expiredDate'] || ''); // Keep formatted date
                } else if (column === 'Designation_of_Applicant') {
                    value = member[column] || member['designation_of_applicant'] || '';
                } else if (column === 'place_of_birth') {
                    value = member[column] || member['placeOfBirth'] || '';
                } else if (column === 'componyName') {
                    value = member[column] || member['companyName'] || '';
                }else if (column === 'maded_payment') {
                    value = member[column] == '1' ? '是' : '否';
                } else {
                    value = member[column] || '';
                }

                // Escape for CSV or replace delimiter for TXT
                if (exportFormat === 'csv') {
                    // CSV: Enclose in quotes, double internal quotes
                    rowDataTemplate[index] = `"${String(value).replace(/"/g, '""')}"`;
                } else {
                    // TXT: Replace semicolon with comma (or another safe char)
                    rowDataTemplate[index] = String(value).replace(/;/g, ',');
                }
            });

            // If no email column is selected, just add the row as is
            if (!hasEmailColumn) {
                exportContent += rowDataTemplate.join(delimiter) + '\n';
                return;
            }

            // Handle email column if present
            const emailValue = member['email'] || '';
            
            if (shouldSplitEmails) {
                const emails = splitEmails(emailValue);
                emails.forEach(email => {
                    const rowData = [...rowDataTemplate];
                    if (exportFormat === 'csv') {
                        rowData[emailColumnIndex] = `"${email.replace(/"/g, '""')}"`;
                    } else {
                        rowData[emailColumnIndex] = email.replace(/;/g, ',');
                    }
                    exportContent += rowData.join(delimiter) + '\n';
                });
            } else {
                if (exportFormat === 'csv') {
                    rowDataTemplate[emailColumnIndex] = `"${emailValue.replace(/"/g, '""')}"`;
                } else {
                    rowDataTemplate[emailColumnIndex] = emailValue.replace(/;/g, ',');
                }
                exportContent += rowDataTemplate.join(delimiter) + '\n';
            }
        });


        // Set correct MIME type
        const mimeType = exportFormat === 'csv'
            ? 'text/csv;charset=utf-8;'
            : 'text/plain;charset=utf-8';

        // Add BOM for CSV for Excel compatibility
        const BOM = exportFormat === 'csv' ? new Uint8Array([0xEF, 0xBB, 0xBF]) : '';
        const blob = BOM
            ? new Blob([BOM, exportContent], { type: mimeType })
            : new Blob([exportContent], { type: mimeType });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Set filename based on filters
        let filename = '塾员数据';
        let filtersApplied = [];
        if (memberFilter && memberFilter.value) filtersApplied.push(memberFilter.value);
        if (targetBirthdayMonth) filtersApplied.push(`${targetBirthdayMonth}月生日`);
        if (targetStartDate && targetEndDate) filtersApplied.push(`${targetStartDate}至${targetEndDate}到期`);

        if (filtersApplied.length > 0) {
            filename = filtersApplied.join('_');
        } else if (searchInput?.value.trim()) {
             filename = `搜索_${searchInput.value.trim()}`;
        }


        // Set file extension
        const extension = exportFormat === 'csv' ? '.csv' : '.txt';
        // Sanitize filename slightly
        const safeFilename = filename.replace(/[^a-z0-9_\-月日至\u4e00-\u9fa5]/gi, '_').substring(0, 50);
        a.download = `${safeFilename}_${new Date().toISOString().slice(0, 10)}${extension}`;


        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        closeExportModal();
    }

    confirmExportButton?.addEventListener('click', exportData);

    // ===== Import Data Functions =====
    window.openImportModal = function() {
        if (importModal && modalOverlay) {
            // Reset state
            dataToImport = [];
            if (importFileInput) importFileInput.value = ''; // Clear file selection
            if (importStatus) {
                importStatus.style.display = 'none';
                importStatus.textContent = '';
                importStatus.className = '';
            }
            if (confirmImportButton) confirmImportButton.disabled = true;

            importModal.style.display = 'block';
            modalOverlay.style.display = 'block';
        } else {
            alert("无法打开导入窗口。");
        }
    };

    window.closeImportModal = function() {
        if (importModal && modalOverlay) {
            importModal.style.display = 'none';
            if (document.querySelectorAll('.modal[style*="display: block"]').length === 0) {
                modalOverlay.style.display = 'none';
            }
        }
    };

    function showImportStatus(message, type = 'info') {
        if (!importStatus) return;
        importStatus.textContent = message;
        importStatus.className = `status-${type}`;
        importStatus.style.display = 'block';
    }

    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        dataToImport = [];
        confirmImportButton.disabled = true;
        showImportStatus('正在读取文件...', 'info');

        const reader = new FileReader();
        reader.onload = function(e) {
            const data = e.target.result;
            try {
                const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                processAndValidateFile(jsonData);
            } catch (error) {
                console.error("Error reading or parsing file:", error);
                showImportStatus(`文件处理失败: ${error.message}`, 'error');
            }
        };
        reader.onerror = function(error) {
            console.error("FileReader error:", error);
            showImportStatus(`读取文件时出错: ${error.message}`, 'error');
        };
        reader.readAsBinaryString(file);
    }

    async function getApplicantTypeMap() {
        const typeMap = new Map();
        try {
            const response = await fetch(`${API_BASE_URL}?table=applicants_types&limit=10000`);
            if (!response.ok) throw new Error(`Failed to fetch applicant types: ${response.status}`);
            const data = await response.json();
            const applicantTypes = data.data || [];
            applicantTypes.forEach(item => {
                if (item.designation_of_applicant && item.ID) {
                    typeMap.set(item.designation_of_applicant.trim(), item.ID);
                }
            });
            return typeMap;
        } catch (error) {
            console.error("Error fetching applicant types for validation:", error);
            throw new Error("无法获取用于验证的申请人种类列表。");
        }
    }

    async function processAndValidateFile(jsonData) {
        if (!jsonData || jsonData.length === 0) {
            showImportStatus('文件为空或格式不正确，没有找到数据。', 'error');
            return;
        }

        showImportStatus('正在验证数据...', 'info');

        const REQUIRED_COLUMNS = [
            'membersID', 'Name', 'CName', 'Designation_of_Applicant', 'Address',
            'phone_number', 'email', 'IC', 'oldIC', 'gender', 'componyName',
            'Birthday', 'expired_date', 'place_of_birth', 'position', 'others', 'remarks',
            'maded_payment'
        ];

        const fileHeaders = Object.keys(jsonData[0]);
        const missingHeaders = REQUIRED_COLUMNS.filter(col => !fileHeaders.includes(col));

        if (missingHeaders.length > 0) {
            showImportStatus(`文件缺少必需的列: ${missingHeaders.join(', ')}`, 'error');
            return;
        }

        try {
            const applicantTypeMap = await getApplicantTypeMap();
            const processedData = [];

            for (let i = 0; i < jsonData.length; i++) {
                const row = jsonData[i];
                const newRecord = {};

                for (const col of REQUIRED_COLUMNS) {
                    let value = row[col];

                    if (col === 'Designation_of_Applicant') {
                        if (value !== null && value !== undefined && String(value).trim() !== '') {
                            const trimmedValue = String(value).trim();
                            if (applicantTypeMap.has(trimmedValue)) {
                                newRecord[col] = applicantTypeMap.get(trimmedValue);
                            } else {
                                throw new Error(`第 ${i + 2} 行错误: 'Designation_of_Applicant' 的值 "${trimmedValue}" 无效。`);
                            }
                        } else {
                            newRecord[col] = null;
                        }
                    } else if (col === 'maded_payment') {
                        // Coerce to 1 or 0, default to 0 if invalid/empty
                        newRecord[col] = (value == '1' || String(value).toLowerCase() === 'true') ? 1 : 0;
                    } else if (col === 'expired_date' && value instanceof Date) {
                        const year = value.getFullYear();
                        const month = String(value.getMonth() + 1).padStart(2, '0');
                        const day = String(value.getDate()).padStart(2, '0');
                        newRecord[col] = `${year}-${month}-${day}`;
                    } else {
                        newRecord[col] = value ?? null;
                    }
                }
                processedData.push(newRecord);
            }

            dataToImport = processedData;
            confirmImportButton.disabled = false;
            showImportStatus(`验证成功! ${dataToImport.length} 条记录准备就绪。`, 'success');

        } catch (error) {
            dataToImport = [];
            confirmImportButton.disabled = true;
            showImportStatus(error.message, 'error');
        }
    }

    async function performImport() {
        if (dataToImport.length === 0) {
            alert("没有可导入的数据。");
            return;
        }

        confirmImportButton.disabled = true;
        showImportStatus(`正在导入 ${dataToImport.length} 条记录...`, 'info');

        try {
            const response = await fetch(`${API_BASE_URL}?table=members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataToImport)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `服务器错误 (Status: ${response.status})`);
            }

            showImportStatus(result.message || '导入成功!', 'success');
            setTimeout(() => {
                closeImportModal();
                fetchMembers();
            }, 2000);

        } catch (error) {
            console.error("Import failed:", error);
            showImportStatus(`导入失败: ${error.message}`, 'error');
            confirmImportButton.disabled = false;
        }
    }

    // Global click listener for closing modals via overlay
    window.addEventListener('click', function (event) {
        if (event.target === modalOverlay) {
             // Close any modal that is currently displayed
             document.querySelectorAll('.modal').forEach(modal => {
                 if (modal.style.display === 'block') {
                     // Call the specific close function if available, otherwise just hide
                     const closeFnName = `close${modal.id.charAt(0).toUpperCase() + modal.id.slice(1)}`;
                     if (typeof window[closeFnName] === 'function') {
                         window[closeFnName]();
                     } else {
                         modal.style.display = 'none';
                     }
                 }
             });
             // Ensure overlay is hidden if all modals are closed
             if (document.querySelectorAll('.modal[style*="display: block"]').length === 0) {
                modalOverlay.style.display = 'none';
             }
        }
    });


    // ===============================
    // Applicant Types Management Functions (No changes needed)
    // ===============================

    window.openApplicantTypesModal = function () {
        const modal = document.getElementById('applicantTypesModal');
        const modalOverlay = document.getElementById('modalOverlay');
        if (modal && modalOverlay) {
            modal.style.display = 'block';
            modalOverlay.style.display = 'block';
            loadApplicantTypes();
        } else {
            alert("无法打开申请人类别管理窗口。");
        }
    };

    window.closeApplicantTypesModal = function () {
        const modal = document.getElementById('applicantTypesModal');
        const modalOverlay = document.getElementById('modalOverlay');
        if (modal) modal.style.display = 'none';
        // Only hide the overlay if no other modal is open.
        if (modalOverlay && document.querySelectorAll('.modal[style*="display: block"]').length === 0) {
            modalOverlay.style.display = 'none';
        }
    };

    async function loadApplicantTypes() {
        const container = document.getElementById('applicantTypesContainer');
        if (!container) return;
        container.innerHTML = '<p>加载中……</p>';
        try {
            const response = await fetch(`${API_BASE_URL}?table=applicants_types&limit=10000`);
            if (!response.ok) throw new Error("获取申请人类别失败。");
            const data = await response.json();
            const types = data.data || [];
            if (types.length === 0) {
                container.innerHTML = '<p>没有找到任何申请人类别。</p>';
                return;
            }
            container.innerHTML = ''; // Clear loading message
            types.forEach(item => {
                // Adjust the field names as needed based on your API response.
                const typeId = item.ID || item.id || '';
                const typeName = item.designation_of_applicant || '';
                const typeDiv = document.createElement('div');
                typeDiv.className = 'applicant-type-item';
                // Use encodeURIComponent to safely pass the type name to the functions.
                typeDiv.innerHTML = `
                <span class="applicant-type-name">${typeName}</span>
                <button class="btn btn-edit" onclick="editApplicantType('${typeId}', '${encodeURIComponent(typeName)}')">编辑</button>
                <button class="btn btn-delete" onclick="deleteApplicantType('${typeId}', '${encodeURIComponent(typeName)}')">删除</button>
            `;
                container.appendChild(typeDiv);
            });
        } catch (error) {
            container.innerHTML = `<p>加载失败: ${error.message}</p>`;
        }
    }

    window.editApplicantType = async function (typeId, encodedTypeName) {
        const currentName = decodeURIComponent(encodedTypeName);
        const newName = prompt("请输入新的类别名称，当前名称为：" + currentName, currentName);
        if (newName === null || newName.trim() === "" || newName.trim() === currentName) {
            alert("操作取消或名称未更改。");
            return;
        }
        const confirmInput = prompt(`注意：编辑操作将级联更新相关数据。\n将 "${currentName}" 修改为 "${newName}"？\n请输入 'CONFIRM' 以确认修改。`);
        if (confirmInput !== "CONFIRM") {
            alert("确认失败，修改取消。");
            return;
        }
        try {
            const updateUrl = `${API_BASE_URL}?table=applicants_types&ID=${encodeURIComponent(typeId)}`;
            // Assume the update uses a PUT request with JSON data.
            const response = await fetch(updateUrl, {
                method: 'PUT', // Or POST/PATCH depending on your API
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ designation_of_applicant: newName.trim() }) // Send new name
            });

            // Check response status and content type
            let responseData = {};
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                responseData = await response.json();
            } else {
                responseData.message = await response.text(); // Get text if not JSON
            }

            if (!response.ok) {
                throw new Error(responseData.message || `更新失败 (Status: ${response.status})`);
            }

            alert(responseData.message || "类别更新成功！");
            loadApplicantTypes(); // Refresh the list in the modal
            fetchApplicantType(); // Refresh the main filter dropdown
        } catch (error) {
            console.error("Error updating applicant type:", error);
            alert("更新类别出错: " + error.message);
        }
    };

    window.deleteApplicantType = async function (typeId, encodedTypeName) {
        const typeName = decodeURIComponent(encodedTypeName);
        const confirmInput = prompt(`删除操作将级联删除相关数据。\n确定要删除类别 "${typeName}" 吗？\n请输入 'CONFIRM' 确认删除。`);
        if (confirmInput !== "CONFIRM") {
            alert("确认失败，删除取消。");
            return;
        }
        try {
            const deleteUrl = `${API_BASE_URL}?table=applicants_types&ID=${encodeURIComponent(typeId)}`;
            const response = await fetch(deleteUrl, { method: 'DELETE' });

             // Check response status and content type
            let responseData = {};
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                responseData = await response.json();
            } else {
                responseData.message = await response.text(); // Get text if not JSON
            }

            if (!response.ok) {
                 throw new Error(responseData.message || `删除失败 (Status: ${response.status})`);
            }

            alert(responseData.message || "类别删除成功！");
            loadApplicantTypes(); // Refresh the list in the modal
            fetchApplicantType(); // Refresh the main filter dropdown
        } catch (error) {
             console.error("Error deleting applicant type:", error);
            alert("删除类别出错: " + error.message);
        }
    };

    function initializeTooltipPositioning() {
        document.querySelectorAll('.tooltip').forEach(button => {
            const tooltipText = button.querySelector('.tooltip-text');
            if (!tooltipText) return;
    
            button.addEventListener('mouseenter', () => {
                // Make tooltip temporarily visible but transparent to measure
                tooltipText.style.visibility = 'visible';
                tooltipText.style.opacity = '0';
                // Ensure transform is reset initially if needed, depending on CSS
                tooltipText.style.transform = 'translateX(-50%)'; // Default centering
                tooltipText.style.left = '50%';
                tooltipText.style.right = 'auto';
    
    
                const buttonRect = button.getBoundingClientRect();
                const tooltipRect = tooltipText.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
    
                // Calculate where the right edge *would* be if centered
                // buttonRect.left is position relative to viewport
                // buttonRect.width / 2 is button's center
                // tooltipRect.width is tooltip's width
                const centeredTooltipLeft = buttonRect.left + (buttonRect.width / 2) - (tooltipRect.width / 2);
                const centeredTooltipRight = centeredTooltipLeft + tooltipRect.width;
    
                const padding = 10; // Space from the edge
    
                // Check for overflow
                if (centeredTooltipRight > (viewportWidth - padding)) {
                    // --- Overflow detected! Align to the right ---
                    tooltipText.style.left = 'auto'; // Unset left
                    tooltipText.style.right = '0'; // Align tooltip's right edge with button's right edge
                    tooltipText.style.transform = 'translateX(0)'; // Remove centering transform
                    tooltipText.classList.add("align-right");
                } else {
                     // --- No overflow, use default centering ---
                    tooltipText.style.left = '50%'; // Default
                    tooltipText.style.right = 'auto'; // Ensure right is auto
                    tooltipText.style.transform = 'translateX(-50%)'; // Default centering
                    tooltipText.classList.remove("align-right");
                }
    
                // Now make it fully visible
                tooltipText.style.opacity = '1';
    
            }, { passive: true }); // Use passive listener for performance if scroll/touch isn't needed
    
            button.addEventListener('mouseleave', () => {
                tooltipText.style.opacity = '0';
                // Allow transition to finish before hiding completely
                setTimeout(() => {
                     if (button.matches(':hover')) return; // Check if mouse re-entered quickly
                     tooltipText.style.visibility = 'hidden';
                }, 300); // Match transition duration
            });
        });
    }

    // ===============================
    // Renewal Add/Edit Functions
    // ===============================
    function populateMonthSelects() {
        const monthSelects = document.querySelectorAll('#renewalAtMonth, #prevEndMonth, #newEndMonth, #recordedAtMonth');
        let optionsHTML = '<option value="">--月--</option>';
        for (let i = 1; i <= 12; i++) {
            optionsHTML += `<option value="${i}">${i}</option>`;
        }
        monthSelects.forEach(select => select.innerHTML = optionsHTML);
    }

    function setDateInputs(dateString, yearEl, monthEl, dayEl) {
        if (dateString && isValidDateString(dateString)) {
            const [year, month, day] = dateString.split('-').map(Number);
            yearEl.value = year;
            monthEl.value = month;
            dayEl.value = day;
        } else {
            yearEl.value = '';
            monthEl.value = '';
            dayEl.value = '';
        }
    }

    function getDateFromInputs(yearEl, monthEl, dayEl) {
        const year = yearEl.value.trim();
        const month = monthEl.value;
        const day = dayEl.value.trim();
        if (!year || !month || !day) return null;
        const dateStr = `${year}-${padStart(month)}-${padStart(day)}`;
        return isValidDateString(dateStr) ? dateStr : 'invalid';
    }

    window.openRenewalModal = function(memberId, renewalId = null) {
        if (!renewalAddEditModal || !modalOverlay) {
            alert("无法打开续费管理窗口。");
            return;
        }

        // Reset form
        const inputs = renewalAddEditModal.querySelectorAll('input, select');
        inputs.forEach(input => input.value = '');
        isFirstTime.value = '0'; // Default to 'No'

        renewalMemberIdInput.value = memberId;

        if (renewalId) { // EDIT MODE
            renewalModalTitle.textContent = '编辑续费记录';
            renewalRecordIdInput.value = renewalId;

            const memberRenewals = renewalDataCache[memberId] || [];
            const renewalData = memberRenewals.find(r => (r.ID || r.id) == renewalId);

            if (renewalData) {
                setDateInputs(renewalData.renewed_at, renewalAtYear, renewalAtMonth, renewalAtDay);
                setDateInputs(renewalData.previous_end, prevEndYear, prevEndMonth, prevEndDay);
                setDateInputs(renewalData.new_end, newEndYear, newEndMonth, newEndDay);
                setDateInputs(renewalData.recorded_at, recordedAtYear, recordedAtMonth, recordedAtDay);
                renewalTermMonths.value = renewalData.term_months || '';
                isFirstTime.value = renewalData.is_first_time == '1' ? '1' : '0';
            } else {
                alert("找不到要编辑的续费记录数据。");
                return;
            }
        } else { // ADD MODE
            renewalModalTitle.textContent = '添加新的续费记录';
            renewalRecordIdInput.value = '';
            const today = new Date();
            setDateInputs(formatDate(today.toISOString()), renewalAtYear, renewalAtMonth, renewalAtDay);
            setDateInputs(formatDate(today.toISOString()), recordedAtYear, recordedAtMonth, recordedAtDay);
        }

        renewalAddEditModal.style.display = 'block';
        modalOverlay.style.display = 'block';
    }

    window.closeRenewalModal = function() {
        if (renewalAddEditModal && modalOverlay) {
            renewalAddEditModal.style.display = 'none';
            if (document.querySelectorAll('.modal[style*="display: block"]').length === 0) {
                modalOverlay.style.display = 'none';
            }
        }
    }

    async function saveRenewalData() {
        const memberId = renewalMemberIdInput.value;
        const renewalId = renewalRecordIdInput.value;

        const renewed_at = getDateFromInputs(renewalAtYear, renewalAtMonth, renewalAtDay);
        const previous_end = getDateFromInputs(prevEndYear, prevEndMonth, prevEndDay);
        const new_end = getDateFromInputs(newEndYear, newEndMonth, newEndDay);
        const recorded_at = getDateFromInputs(recordedAtYear, recordedAtMonth, recordedAtDay);

        if ([renewed_at, previous_end, new_end, recorded_at].includes('invalid')) {
            alert("一个或多个日期无效。请检查年/月/日输入。");
            return;
        }
        if (!renewed_at || !new_end) {
            alert("续费日期和新的到期日期是必填项。");
            return;
        }

        const renewalData = {
            member_id: memberId,
            renewed_at: renewed_at,
            previous_end: previous_end,
            new_end: new_end,
            term_months: renewalTermMonths.value || null,
            is_first_time: parseInt(isFirstTime.value, 10),
            recorded_at: recorded_at
        };

        const isEdit = !!renewalId;
        const url = isEdit
            ? `${API_BASE_URL}?table=member_renewals&ID=${renewalId}`
            : `${API_BASE_URL}?table=member_renewals`;
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(renewalData)
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || `保存失败 (Status: ${response.status})`);
            }

            alert(result.message || "保存成功！");
            closeRenewalModal();
            reloadRenewalDetails(memberId);
            fetchMembers();

        } catch (error) {
            console.error("Error saving renewal data:", error);
            alert(`保存失败: ${error.message}`);
        }
    }

    // ===== INITIALIZE PAGE =====
    initializePage();

}); // End DOMContentLoaded