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
    let currentSearchType = 'all'; // 'all', 'search', 'Birthday', 'expired'
    let currentFilterValue = '';
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
    }

    // ===== DATA FETCHING FUNCTIONS =====
    async function fetchApplicantType() {
        if (!memberFilter) {
            console.log("memberFilter element not found in the DOM");
            return;
        }
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
        } catch (error) {
            console.error("Error fetching applicant types:", error);
        }
    }

    async function fetchMembers(query = "") {
        if (loader) loader.style.display = 'flex';
        if (memberTableBody) memberTableBody.innerHTML = "";
        const params = new URLSearchParams();
        params.append("table", "members_with_applicant_designation");
        params.append("limit", itemsPerPage);
        params.append("page", currentPage);

        if (currentSearchType === 'Birthday') {
            if (targetBirthdayMonth) {
                params.append("Birthday", "true");
                params.append("search", "true");
                params.append("targetMonth", targetBirthdayMonth.toString());
                console.log(`Searching for birthdays in month ${targetBirthdayMonth}`);
            } else {
                console.warn("Birthday search triggered without target month. Reverting to 'all'.");
                currentSearchType = 'all';
                targetBirthdayMonth = null;
            }
            targetStartDate = null;
            targetEndDate = null;
        } else if (currentSearchType === 'expired') {
            if (targetStartDate && targetEndDate) {
                params.append("expired", "true");
                params.append("search", "true");
                params.append("startDate", targetStartDate);
                params.append("endDate", targetEndDate);
                console.log(`Fetching members expiring between ${targetStartDate} and ${targetEndDate}`);
            } else {
                console.warn("Expired search triggered without target dates. Reverting to 'all'.");
                currentSearchType = 'all';
                targetStartDate = null;
                targetEndDate = null;
            }
            targetBirthdayMonth = null;
        } else if (query.trim() !== "") {
            params.append("search", query);
            currentSearchType = 'search';
            targetStartDate = null;
            targetEndDate = null;
            targetBirthdayMonth = null;
        } else {
            currentSearchType = 'all';
            targetStartDate = null;
            targetEndDate = null;
            targetBirthdayMonth = null;
        }

        if (memberFilter && memberFilter.value) {
            if (!params.has('search')) {
                params.append("search", "true");
            }
            params.append("designation_of_applicant", memberFilter.value);
            console.log("Filtering by applicant:", memberFilter.value);
        }

        if (sortColumn) {
            let dbSortColumn = sortColumn;
            const columnMap = {
                'membersID': 'membersID',
                'Name': 'Name',
                'CName': 'CName',
                'Designation_of_Applicant': 'Designation_of_Applicant',
                'Address': 'Address',
                'phone_number': 'phone_number',
                'email': 'email',
                'IC': 'IC',
                'oldIC': 'oldIC',
                'gender': 'gender',
                'componyName': 'componyName',
                'Birthday': 'Birthday',
                'expired_date': 'expired_date',
                'place_of_birth': 'place_of_birth',
                'position': 'position',
                'others': 'others',
                'remarks': 'remarks'
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
        if (members.length === 0) {
            let message = '暂无记录';
            if (currentSearchType === 'search' && searchInput?.value) {
                message = '没有找到匹配的记录';
            } else if (currentSearchType === 'Birthday' && targetBirthdayMonth) {
                message = `没有在 ${targetBirthdayMonth} 月份生日的塾员`;
            } else if (currentSearchType === 'expired' && targetStartDate && targetEndDate) {
                message = `没有在 ${targetStartDate} 到 ${targetEndDate} 之间到期的塾员`;
            } else if (currentFilterValue) {
                message = `没有符合 "${currentFilterValue}" 条件的记录`;
            }
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
            const rawId = member.ID || member.id || '';

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
        if (!document.getElementById('pageInput')) {
             const pageInfoContainer = document.querySelector('.pagination-container');
             if(pageInfoContainer) {
                 const pageInfoDiv = document.createElement('div');
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
             const pageIndicator = document.querySelector('.page-indicator');
             if (pageIndicator) pageIndicator.textContent = `${currentPage} / ${totalPages}`;
             const pageInput = document.getElementById('pageInput');
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
                if (!th.lastChild || th.lastChild.nodeType !== Node.TEXT_NODE) {
                    th.appendChild(document.createTextNode(' '));
                }
                th.appendChild(icon);
            } else {
                 icon.classList.remove('fa-sort-up', 'fa-sort-down');
                 if (column !== sortColumn) {
                     icon.classList.add('fa-sort');
                 } else {
                      icon.classList.remove('fa-sort');
                 }
            }
            if (column === sortColumn) {
                icon.classList.add(sortDirection === 'ASC' ? 'fa-sort-up' : 'fa-sort-down');
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
        fetchMembers(searchInput?.value || '');
    }

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
        const debouncedSearch = debounce((searchText) => {
            currentPage = 1;
            fetchMembers(searchText.trim());
        }, 350);

        searchInput?.addEventListener("input", function() {
            debouncedSearch(this.value);
        });

        thead?.addEventListener('click', function(event) {
            const header = event.target.closest('th[data-column]');
            if (header && !event.target.classList.contains('resizer')) {
                handleSortClick(header.dataset.column);
            }
        });

        prevPageButton?.addEventListener("click", () => changePage(currentPage - 1));
        nextPageButton?.addEventListener("click", () => changePage(currentPage + 1));

        listAllMembersButton?.addEventListener("click", function() {
            currentPage = 1;
            currentSearchType = 'all';
            targetStartDate = null;
            targetEndDate = null;
            targetBirthdayMonth = null;
            currentFilterValue = '';
            if (memberFilter) memberFilter.value = '';
            if (searchInput) searchInput.value = '';
            fetchMembers();
        });

        memberFilter?.addEventListener('change', function() {
            currentFilterValue = this.value;
            currentPage = 1;
            fetchMembers(searchInput?.value || '');
        });

        itemsPerPageSelect?.addEventListener("change", function () {
            itemsPerPage = parseInt(this.value);
            currentPage = 1;
            fetchMembers(searchInput?.value || '');
        });

        confirmExpirySearchButton?.addEventListener('click', handleConfirmExpirySearch);
        closeExpiryButton?.addEventListener('click', closeExpiryModal);

        confirmBirthdaySearchButton?.addEventListener('click', handleConfirmBirthdaySearch);
        closeBirthdayButton?.addEventListener('click', closeBirthdayModal);

        modalOverlay?.addEventListener('click', () => {
            closeExpiryModal();
            closeBirthdayModal();
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
        targetStartDate = startDateStr;
        targetEndDate = endDateStr;
        targetBirthdayMonth = null;
        currentPage = 1;
        currentSearchType = 'expired';
        currentFilterValue = '';
        if (memberFilter) memberFilter.value = '';
        if (searchInput) searchInput.value = '';
        console.log(`Searching for members expiring between ${targetStartDate} and ${targetEndDate}`);
        fetchMembers();
        closeExpiryModal();
    }

    function handleConfirmBirthdaySearch() {
        const month = birthdayMonthInput?.value;
        if (!month) {
            alert("请选择一个月份。");
            birthdayMonthInput?.focus();
            return;
        }
        targetBirthdayMonth = parseInt(month, 10);
        targetStartDate = null;
        targetEndDate = null;
        currentPage = 1;
        currentSearchType = 'Birthday';
        currentFilterValue = '';
        if (memberFilter) memberFilter.value = '';
        if (searchInput) searchInput.value = '';
        console.log(`Searching for members with birthday in month ${targetBirthdayMonth}`);
        fetchMembers();
        closeBirthdayModal();
    }

    window.editMember = function(id) {
        if (!id) { console.error("Edit Error: No ID"); alert("无法编辑：ID未提供"); return; }
        console.log(`Redirecting to edit member with ID: ${id}`);
        window.location.href = `edit_member.html?action=edit&id=${id}`;
    };

    window.deleteMember = async function(id) {
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
                         try { message = await response.text() || message; } catch (e2) {}
                     }
                }
                alert(message);
                if (success) {
                    fetchMembers(searchInput?.value || '');
                }
            } catch (error) {
                console.error("Error deleting member:", error);
                alert(`删除时发生网络或脚本错误: ${error.message}`);
            }
        }
    };

    window.checkMember = function(id) {
        if (!id) { console.error("Check Error: No ID"); alert("无法查看：ID未提供"); return; }
        console.log(`Redirecting to check details for member ID: ${id}`);
        window.location.href = `check_details.html?id=${id}`;
    };

    window.changePage = function(page) {
        const targetPage = parseInt(page, 10);
        if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= totalPages && targetPage !== currentPage) {
            console.log(`Changing page from ${currentPage} to ${targetPage}`);
            currentPage = targetPage;
            fetchMembers(searchInput?.value || '');
        } else {
             console.log(`Page change to ${page} ignored. Current: ${currentPage}, Total: ${totalPages}`);
        }
    };

    window.jumpToPage = function() {
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

    window.openExpiryModal = function() {
        if (expiryModal && modalOverlay) {
            const now = new Date();
            if(expiryStartYearInput) expiryStartYearInput.value = now.getFullYear();
            if(expiryStartMonthInput) expiryStartMonthInput.value = now.getMonth() + 1;
            if(expiryStartDayInput) expiryStartDayInput.value = '1';
            if(expiryEndYearInput) expiryEndYearInput.value = now.getFullYear();
            if(expiryEndMonthInput) expiryEndMonthInput.value = now.getMonth() + 1;
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            if(expiryEndDayInput) expiryEndDayInput.value = lastDay;
            expiryModal.style.display = 'block';
            modalOverlay.style.display = 'block';
            expiryStartYearInput?.focus();
        } else {
            console.error("Expiry modal or overlay element not found.");
            alert("无法打开到期查询窗口。");
        }
    };

    window.closeExpiryModal = function() {
        if (expiryModal && modalOverlay) {
            expiryModal.style.display = 'none';
            if (!birthdayModal || birthdayModal.style.display !== 'block') {
                modalOverlay.style.display = 'none';
            }
        }
    };

    window.openBirthdayModal = function() {
        if (birthdayModal && modalOverlay) {
            const now = new Date();
            if(birthdayMonthInput) birthdayMonthInput.value = String(now.getMonth() + 1);
            birthdayModal.style.display = 'block';
            modalOverlay.style.display = 'block';
            birthdayMonthInput?.focus();
        } else {
            console.error("Birthday modal or overlay element not found.");
            alert("无法打开生日查询窗口。");
        }
    };

    window.closeBirthdayModal = function() {
        if (birthdayModal && modalOverlay) {
            birthdayModal.style.display = 'none';
            if (!expiryModal || expiryModal.style.display !== 'block') {
                modalOverlay.style.display = 'none';
            }
        }
    };

    window.resetColumnWidths = resetColumnWidths;

    // ===== INITIALIZE PAGE =====
    initializePage();

    // ===== EXPORT FUNCTIONS =====
    const exportModal = document.getElementById('exportModal');
    const exportColumnsContainer = document.querySelector('.export-columns-container');
    const confirmExportButton = document.getElementById('confirmExport');

    function openExportModal() {
        if (!exportModal || !exportColumnsContainer) return;
        exportColumnsContainer.innerHTML = '';
        const selectActions = document.createElement('div');
        selectActions.className = 'select-actions';
        selectActions.innerHTML = `
            <button type="button" class="btn btn-secondary" id="selectAllColumns">全选</button>
            <button type="button" class="btn btn-secondary" id="deselectAllColumns">取消全选</button>
        `;
        exportColumnsContainer.appendChild(selectActions);
        const columnHeaders = Array.from(document.querySelectorAll('#memberTable thead th[data-column]'));
        columnHeaders.forEach(header => {
            const columnName = header.dataset.column;
            const displayName = header.textContent.trim().replace(/[▲▼]/, '');
            const columnItem = document.createElement('div');
            columnItem.className = 'export-column-item';
            columnItem.innerHTML = `
                <input type="checkbox" id="export-${columnName}" name="export-columns" value="${columnName}" checked>
                <label for="export-${columnName}">${displayName}</label>
            `;
            exportColumnsContainer.appendChild(columnItem);
        });
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
    
    function closeExportModal() {
        if (!exportModal) return;
        exportModal.style.display = 'none';
        modalOverlay.style.display = 'none';
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
        const exportFormat = document.querySelector('input[name="export-format"]:checked').value;
        const delimiter = exportFormat === 'csv' ? ',' : ';';
        
        let exportContent = '';
        const headers = selectedColumns.map(column => {
            const headerElement = document.querySelector(`#memberTable thead th[data-column="${column}"]`);
            const headerText = headerElement ? headerElement.textContent.trim().replace(/[▲▼]/, '') : column;
            // 如果是CSV格式，需要处理包含逗号的字段
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
                    rowDataTemplate.push('');
                    return;
                }
                
                let value = '';
                
                if (column === 'phone_number') {
                    value = member[column] || ''; // Don't format phone numbers for export
                } else if (column === 'IC' || column === 'oldIC') {
                    value = formatIC(member[column] || '');
                } else if (column === 'expired_date') {
                    value = formatDate(member[column] || member['expiredDate'] || '');
                } else if (column === 'Designation_of_Applicant') {
                    value = member[column] || member['designation_of_applicant'] || '';
                } else if (column === 'place_of_birth') {
                    value = member[column] || member['placeOfBirth'] || '';
                } else if (column === 'componyName') {
                    value = member[column] || member['companyName'] || '';
                } else {
                    value = member[column] || '';
                }
                
                // 处理分隔符和引号
                if (exportFormat === 'csv') {
                    // CSV格式：将字段用双引号包围，内部的双引号用两个双引号表示
                    rowDataTemplate[index] = `"${String(value).replace(/"/g, '""')}"`;  
                } else {
                    // TXT格式：将分号替换为逗号
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
                
                // Format the email value
                if (exportFormat === 'csv') {
                    rowData[emailColumnIndex] = `"${email.replace(/"/g, '""')}"`;  
                } else {
                    rowData[emailColumnIndex] = email.replace(/;/g, ',');
                }
                
                exportContent += rowData.join(delimiter) + '\n';
            });
        });
        
        // 设置正确的MIME类型
        const mimeType = exportFormat === 'csv' 
            ? 'text/csv;charset=utf-8;' 
            : 'text/plain;charset=utf-8';
            
        // 为CSV添加BOM标记，以便Excel正确识别UTF-8编码
        const BOM = exportFormat === 'csv' ? new Uint8Array([0xEF, 0xBB, 0xBF]) : '';
        const blob = BOM 
            ? new Blob([BOM, exportContent], { type: mimeType })
            : new Blob([exportContent], { type: mimeType });
            
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // 设置文件名
        let filename = '塾员数据';
        if (currentSearchType === 'Birthday' && targetBirthdayMonth) {
            filename = `${targetBirthdayMonth}月生日塾员`;
        } else if (currentSearchType === 'expired' && targetStartDate && targetEndDate) {
            filename = `${targetStartDate}至${targetEndDate}到期塾员`;
        } else if (currentFilterValue) {
            filename = `${currentFilterValue}塾员`;
        }
        
        // 设置文件扩展名
        const extension = exportFormat === 'csv' ? '.csv' : '.txt';
        a.download = `${filename}_${new Date().toISOString().slice(0, 10)}${extension}`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        closeExportModal();
    }
    
    confirmExportButton?.addEventListener('click', exportData);
    
    window.addEventListener('click', function(event) {
        if (event.target === modalOverlay) {
            if (birthdayModal && birthdayModal.style.display === 'block') {
                closeBirthdayModal();
            } else if (expiryModal && expiryModal.style.display === 'block') {
                closeExpiryModal();
            } else if (exportModal && exportModal.style.display === 'block') {
                closeExportModal();
            }
        }
    });
    
    window.openExportModal = openExportModal;
    window.closeExportModal = closeExportModal;
});
