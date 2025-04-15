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
    const API_BASE_URL = 'http://localhost/projects/C-EnterpriseProject/recervingAPI.php';

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
    const listAllMembersButton = document.getElementById("listAllMembers");
    const memberFilter = document.getElementById("memberFilter");
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

    // --- Shared Modal Overlay ---
    const modalOverlay = document.getElementById('modalOverlay');

    // ===== STATE VARIABLES =====
    let currentPage = 1;
    let itemsPerPage = parseInt(itemsPerPageSelect?.value || 10);
    let sortColumn = '';
    let sortDirection = '';
    let totalPages = 0;
    // let currentSearchType = 'all'; // 'all', 'search', 'Birthday', 'expired' - Replaced by checking individual filter states
    // let currentFilterValue = ''; // Use memberFilter.value directly
    let membersData = [];
    let targetStartDate = null; // For expiry search (YYYY-MM-DD)
    let targetEndDate = null;
    let targetBirthdayMonth = null;

    // ===== INITIALIZATION =====
    function initializePage() {
        fetchApplicantType();
        initializeEventListeners();
        initializeResizableColumns();
        loadColumnWidths();
        fetchMembers();
        setupFilterButtonsAnimation();
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
        if (memberFilter) {
            memberFilter.classList.add('filter-button');
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
            btn.style.bottom = '';  // clear any inline bottom setting
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
            if (memberFilter && memberFilter.value) {
                memberFilter.classList.add('active');
                activeFilters.push(memberFilter);
            }
        }
    
        // Now update each active filter’s position:
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
            const response = await fetch(`${API_BASE_URL}?table=applicants_types`);
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
            if (memberFilter) memberFilter.value = '';
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

            // Applicant Type Filter
            if (memberFilter && memberFilter.value) {
                params.append("designation_of_applicant", memberFilter.value);
                isAnyFilterActive = true;
                console.log("Filtering by applicant type:", memberFilter.value);
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
                'position': 'position', 'others': 'others', 'remarks': 'remarks'
            };
            dbSortColumn = columnMap[sortColumn] || sortColumn;
            params.append("sort", dbSortColumn);
            params.append("order", sortDirection);
        }

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
                const colspan = table?.querySelector('thead tr')?.cells.length || 18;
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
        const isTypeFilterActive = !!(memberFilter && memberFilter.value);

        if (members.length === 0) {
            if (generalSearchQuery) {
                message = `没有找到匹配 "${generalSearchQuery}" 的记录`;
            } else if (isBirthdayFilterActive || isExpiryFilterActive || isTypeFilterActive) {
                let filterDescriptions = [];
                if (isTypeFilterActive) filterDescriptions.push(`种类 "${memberFilter.value}"`);
                if (isBirthdayFilterActive) filterDescriptions.push(`${targetBirthdayMonth}月生日`);
                if (isExpiryFilterActive) filterDescriptions.push(`到期日期 ${targetStartDate} 至 ${targetEndDate}`);
                message = `没有找到符合条件 (${filterDescriptions.join(', ')}) 的记录`;
            }
            // Default message '暂无记录' remains if no search/filter is active

            const colspan = table?.querySelector('thead tr')?.cells.length || 18;
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
                </td>
            `;
            memberTableBody.appendChild(row);
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
                if (memberFilter) memberFilter.value = '';

                // Close modals if open
                if (birthdayModal && birthdayModal.style.display === 'block') closeBirthdayModal();
                if (expiryModal && expiryModal.style.display === 'block') closeExpiryModal();
            }
             // Always trigger debounced search on input
            debouncedSearch();
            // Update button states immediately for responsiveness
            updateFilterButtonStates();
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
            if (memberFilter) memberFilter.value = '';
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

        modalOverlay?.addEventListener('click', () => {
            // Close any open modal when clicking overlay
            if (expiryModal?.style.display === 'block') closeExpiryModal();
            if (birthdayModal?.style.display === 'block') closeBirthdayModal();
            if (exportModal?.style.display === 'block') closeExportModal();
            if (applicantTypesModal?.style.display === 'block') closeApplicantTypesModal();
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
            const emails = splitEmails(emailValue);

            // Create a row for each email address
            emails.forEach(email => {
                const rowData = [...rowDataTemplate]; // Clone the template

                // Format the email value for the current row
                if (exportFormat === 'csv') {
                    rowData[emailColumnIndex] = `"${email.replace(/"/g, '""')}"`;
                } else {
                    rowData[emailColumnIndex] = email.replace(/;/g, ',');
                }

                exportContent += rowData.join(delimiter) + '\n';
            });
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
            const response = await fetch(`${API_BASE_URL}?table=applicants_types`);
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

    // ===== INITIALIZE PAGE =====
    initializePage();

}); // End DOMContentLoaded