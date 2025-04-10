// member_search.js
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
    const expiredButton = document.getElementById("searchExpiry"); // Button now opens modified modal
    const listAllMembersButton = document.getElementById("listAllMembers");
    const memberFilter = document.getElementById("memberFilter");
    const table = document.getElementById('memberTable');
    const thead = table?.querySelector('thead'); // Get thead for delegation
    const paginationContainer = document.querySelector('.pagination');

    // --- Expiry Modal Elements (MODIFIED) ---
    const expiryModal = document.getElementById('expiryModal');
    const expiryStartYearInput = document.getElementById('expiryStartYearInput');
    const expiryStartMonthInput = document.getElementById('expiryStartMonthInput');
    const expiryStartDayInput = document.getElementById('expiryStartDayInput');
    const expiryEndYearInput = document.getElementById('expiryEndYearInput');
    const expiryEndMonthInput = document.getElementById('expiryEndMonthInput');
    const expiryEndDayInput = document.getElementById('expiryEndDayInput');
    const confirmExpirySearchButton = document.getElementById('confirmExpirySearch');
    const closeExpiryButton = expiryModal?.querySelector('.close-button');
    // Cancel button uses onclick in HTML

    // --- Birthday Modal Elements (Unchanged) ---
    const birthdayModal = document.getElementById('birthdayModal');
    const birthdayMonthInput = document.getElementById('birthdayMonthInput');
    const confirmBirthdaySearchButton = document.getElementById('confirmBirthdaySearch');
    const closeBirthdayButton = birthdayModal?.querySelector('.close-button');
    // Cancel button uses onclick in HTML

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
    // --- State for Expiry Search (MODIFIED) ---
    let targetStartDate = null; // Stores YYYY-MM-DD
    let targetEndDate = null;   // Stores YYYY-MM-DD
    // --- State for Birthday Search (Unchanged) ---
    let targetBirthdayMonth = null;


    // ===== HELPER FUNCTIONS =====

    // Utility to pad numbers with leading zeros (for date formatting)
    function padStart(num, length = 2) {
        return String(num).padStart(length, '0');
    }

    // Utility to check if a string represents a valid date (YYYY-MM-DD)
    function isValidDateString(dateString) {
        // Basic format check
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return false;
        }
        const date = new Date(dateString);
        // Check if the date object is valid and if the components match
        // (prevents dates like 2023-02-30 from being valid)
        const [year, month, day] = dateString.split('-').map(Number);
        return date instanceof Date && !isNaN(date) &&
               date.getFullYear() === year &&
               date.getMonth() + 1 === month &&
               date.getDate() === day;
    }

    // Debounce function (remains the same)
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

    // ===== INITIALIZATION =====
    function initializePage() {
        fetchApplicantType();
        initializeEventListeners();
        initializeResizableColumns();
        loadColumnWidths(); // Load widths after initializing resizers
        fetchMembers(); // Initial data fetch
    }

    // ===== DATA FETCHING FUNCTIONS =====
    async function fetchApplicantType() {
        // ... (existing code - no changes needed here) ...
        if (!memberFilter) {
            console.log("memberFilter element not found in the DOM");
            return;
        }
        while (memberFilter.options.length > 1) memberFilter.remove(1);
        const defaultOption = document.createElement("option");
        defaultOption.value = ""; defaultOption.textContent = "选择种类";
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
        } catch (error) { console.error("Error fetching applicant types:", error); }
    }

    // Fetch members data from API
    async function fetchMembers(query = "") {
        if (loader) loader.style.display = 'flex'; // Use flex for center alignment
        if (memberTableBody) memberTableBody.innerHTML = ""; // Clear previous results

        const params = new URLSearchParams();
        params.append("table", "members_with_applicant_designation");
        params.append("limit", itemsPerPage);
        params.append("page", currentPage);

        // --- MODIFIED: Parameter logic based on search type ---
        if (currentSearchType === 'Birthday') {
            if (targetBirthdayMonth) {
                params.append("Birthday", "true");
                params.append("search", "true"); // Keep search=true for consistency? Check API req.
                params.append("targetMonth", targetBirthdayMonth.toString());
                console.log(`Searching for birthdays in month ${targetBirthdayMonth}`);
            } else {
                console.warn("Birthday search triggered without target month. Reverting to 'all'.");
                currentSearchType = 'all';
                targetBirthdayMonth = null;
            }
            // Reset expiry targets
            targetStartDate = null;
            targetEndDate = null;
        } else if (currentSearchType === 'expired') {
            // Expiry search triggered ONLY after confirming from the modal
            if (targetStartDate && targetEndDate) {
                params.append("expired", "true"); // As requested
                params.append("search", "true");  // As requested
                params.append("startDate", targetStartDate); // New param
                params.append("endDate", targetEndDate);     // New param
                console.log(`Fetching members expiring between ${targetStartDate} and ${targetEndDate}`);
            } else {
                console.warn("Expired search triggered without target dates. Reverting to 'all'.");
                currentSearchType = 'all';
                targetStartDate = null;
                targetEndDate = null;
            }
             // Reset birthday target
            targetBirthdayMonth = null;
        } else if (query.trim() !== "") {
            params.append("search", query); // General text search
            currentSearchType = 'search';
             // Reset expiry and birthday targets
            targetStartDate = null;
            targetEndDate = null;
            targetBirthdayMonth = null;
        } else { // 'all' members (default or List All button)
            currentSearchType = 'all';
             // Reset expiry and birthday targets
            targetStartDate = null;
            targetEndDate = null;
            targetBirthdayMonth = null;
        }
        // --- END MODIFICATION ---

        // Add applicant filter if selected (applies to all search types)
        if (memberFilter && memberFilter.value) {
            if (!params.has('search')) {
                 params.append("search", "true"); // Ensure search=true if filtering
            }
            params.append("designation_of_applicant", memberFilter.value);
            console.log("Filtering by applicant:", memberFilter.value);
        }

        // Add sorting parameters
        if (sortColumn) {
            let dbSortColumn = sortColumn;
            // --- Column name mapping (ensure it's correct) ---
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
                'componyName': 'componyName', // Corrected potential typo if needed
                'Birthday': 'Birthday',
                'expired_date': 'expired_date',
                'place_of_birth': 'place_of_birth',
                'position': 'position',
                'others': 'others',
                'remarks': 'remarks'
            };
            dbSortColumn = columnMap[sortColumn] || sortColumn; // Use mapped name or original if not found
            // --- End Column name mapping ---

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
                const colspan = table?.querySelector('thead tr')?.cells.length || 18; // Dynamic colspan
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
        memberTableBody.innerHTML = ""; // Clear previous results

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
            // --- MODIFIED: Message for expiry range ---
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
                return; // Skip this iteration
            }

            // Helper to format data safely
            const formatData = (value) => {
                if (value === null || value === undefined || value === '' || value === 'For...') {
                    return '';
                }
                // Basic HTML escaping
                return String(value).replace(/[&<>"']/g, m => ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": "'" }[m]));
            };

            // Phone formatting (remains the same)
            const formatPhone = (phone) => {
                const phoneStr = String(phone || '');
                if (/^\d{10}$/.test(phoneStr)) { // 10 digits
                    return phoneStr.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
                } else if (/^\d{11}$/.test(phoneStr) && phoneStr.startsWith('0')) { // 11 digits starting with 0
                    return phoneStr.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3"); // Or adjust format as needed
                } else if (/^\d{11}$/.test(phoneStr) && phoneStr.startsWith('6')) { // Example: 601...
                     return phoneStr.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, "$1-$2-$3-$4"); // Adjust format
                }
                return phoneStr; // Return original if format doesn't match well
            };

            // IC formatting (remains the same)
            const formatIC = (ic) => {
                const icStr = String(ic || '');
                 if (/^\d{12}$/.test(icStr)) {
                    return icStr.replace(/(\d{6})(\d{2})(\d{4})/, "$1-$2-$3");
                 }
                 return icStr;
            };

            // Date formatting (remains the same)
            const formatDate = (dateString) => {
                if (!dateString || dateString === '0000-00-00') return ''; // Handle invalid zero date
                try {
                    // Check if it's already in YYYY-MM-DD format
                    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                         // Further check if it's a *valid* date in that format
                         if (isValidDateString(dateString)) {
                             return dateString;
                         } else {
                             // It's in the format but invalid (e.g., 2023-02-30)
                             console.warn(`Invalid date string received: ${dateString}`);
                             return ''; // Or return original string if preferred
                         }
                    }
                    // If not in the correct format, try parsing
                    const date = new Date(dateString);
                    if (isNaN(date.getTime())) {
                         console.warn(`Could not parse date: ${dateString}`);
                        return dateString; // Return original if parsing fails completely
                    }
                    // Format valid parsed date
                    const year = date.getFullYear();
                    const month = padStart(date.getMonth() + 1);
                    const day = padStart(date.getDate());
                    return `${year}-${month}-${day}`;
                } catch (e) {
                    console.warn(`Error formatting date: ${dateString}`, e);
                    return dateString; // Return original on error
                }
            };

            // Get data using safe access and formatting
            const designation = formatData(member['Designation_of_Applicant'] || member['designation_of_applicant']);
            const expiredDate = formatDate(member['expired_date'] || member['expiredDate']);
            const placeOfBirth = formatData(member['place_of_birth'] || member['placeOfBirth']);
            const gender = formatData(member['gender']);
            const position = formatData(member['position']);
            const companyName = formatData(member['componyName'] || member['companyName']); // Handle potential typo
            const memberId = formatData(member['membersID']); // Use formatted ID for display
            const rawId = member.ID || member.id || ''; // Use raw ID for actions

            const row = document.createElement("tr");
            // Ensure the order matches your <th> elements
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
        // ... (existing code - no changes needed here, uses totalPages and currentPage) ...
        if (!paginationContainer || !prevPageButton || !nextPageButton) return;

        paginationContainer.innerHTML = ''; // Clear existing buttons/info

        const maxPagesToShow = 5; // Max number of specific page buttons to show
        let startPage, endPage;

        if (totalPages <= maxPagesToShow) {
            startPage = 1; endPage = totalPages;
        } else {
            const maxPagesBeforeCurrent = Math.floor(maxPagesToShow / 2);
            const maxPagesAfterCurrent = Math.ceil(maxPagesToShow / 2) - 1;
            if (currentPage <= maxPagesBeforeCurrent) {
                startPage = 1; endPage = maxPagesToShow;
            } else if (currentPage + maxPagesAfterCurrent >= totalPages) {
                startPage = totalPages - maxPagesToShow + 1; endPage = totalPages;
            } else {
                startPage = currentPage - maxPagesBeforeCurrent; endPage = currentPage + maxPagesAfterCurrent;
            }
        }

        // First page and ellipsis
        if (startPage > 1) {
            paginationContainer.appendChild(createPaginationButton(1));
            if (startPage > 2) paginationContainer.appendChild(createPaginationEllipsis());
        }

        // Page numbers in range
        for (let i = startPage; i <= endPage; i++) {
            paginationContainer.appendChild(createPaginationButton(i, i === currentPage));
        }

        // Last page and ellipsis
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) paginationContainer.appendChild(createPaginationEllipsis());
            paginationContainer.appendChild(createPaginationButton(totalPages));
        }

        // Update Prev/Next button states
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage >= totalPages; // Use >= for safety

        // Add page info and jump input dynamically if needed (assuming it's not always present)
        if (!document.getElementById('pageInput')) {
             const pageInfoContainer = document.querySelector('.pagination-container'); // Or specific div
             if(pageInfoContainer) {
                 const pageInfoDiv = document.createElement('div');
                 pageInfoDiv.className = 'pagination-info'; // Add class for styling
                 pageInfoDiv.innerHTML = `
                    <span class="page-indicator">${currentPage} / ${totalPages}</span>
                    <div class="page-jump">
                        <input type="number" id="pageInput" min="1" max="${totalPages}" placeholder="页码" class="page-input" aria-label="Jump to page number">
                        <button onclick="jumpToPage()" class="jump-btn btn btn-secondary">跳转</button>
                    </div>
                 `;
                 // Append page info logically, e.g., after pagination buttons but before items-per-page
                 const itemsPerPageDiv = document.querySelector('.items-per-page');
                 if (itemsPerPageDiv) {
                     pageInfoContainer.insertBefore(pageInfoDiv, itemsPerPageDiv);
                 } else {
                     pageInfoContainer.appendChild(pageInfoDiv); // Fallback append
                 }

                 // Add Enter key listener for the new input
                 const pageInput = document.getElementById('pageInput');
                 pageInput?.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        jumpToPage();
                    }
                 });
             }
        } else {
             // Update existing elements if they are already there
             const pageIndicator = document.querySelector('.page-indicator');
             if (pageIndicator) pageIndicator.textContent = `${currentPage} / ${totalPages}`;
             const pageInput = document.getElementById('pageInput');
             if (pageInput) pageInput.max = totalPages;
        }
    }

    // Helper function for creating pagination buttons
    function createPaginationButton(pageNumber, isActive = false) {
        const button = document.createElement('button');
        button.textContent = pageNumber;
        button.className = `pagination-btn ${isActive ? 'active' : ''}`;
        button.onclick = () => changePage(pageNumber);
        return button;
    }

    // Helper function for creating ellipsis
    function createPaginationEllipsis() {
        const span = document.createElement('span');
        span.className = 'pagination-ellipsis';
        span.textContent = '...';
        return span;
    }

    function updateSortIcons() {
        // ... (existing code - no changes needed here) ...
         document.querySelectorAll('th[data-column]').forEach(th => {
            const column = th.dataset.column;
            let icon = th.querySelector('i.sort-arrow');
            if (!icon) { // Create icon if it doesn't exist
                icon = document.createElement('i');
                icon.className = 'sort-arrow fas fa-sort'; // Default state
                // Add a space before appending if no text node exists or last child is not text
                 if (!th.lastChild || th.lastChild.nodeType !== Node.TEXT_NODE) {
                    th.appendChild(document.createTextNode(' '));
                 }
                th.appendChild(icon);
            } else {
                 // Clear existing sort direction classes
                 icon.classList.remove('fa-sort-up', 'fa-sort-down');
                 // Add default sort icon class (fa-sort) if not the sorted column
                 if (column !== sortColumn) {
                     icon.classList.add('fa-sort');
                 } else {
                      icon.classList.remove('fa-sort'); // Remove default if it's the sorted column
                 }
            }

            // Add specific direction class if this is the sorted column
            if (column === sortColumn) {
                icon.classList.add(sortDirection === 'ASC' ? 'fa-sort-up' : 'fa-sort-down');
            }
        });
    }

    // ===== SORTING FUNCTIONS =====
    function handleSortClick(columnName) {
        // ... (existing code - no changes needed here) ...
        if (!columnName) return; // Don't sort if column name is invalid
        if (sortColumn === columnName) {
            sortDirection = sortDirection === 'ASC' ? 'DESC' : 'ASC';
        } else {
            sortColumn = columnName;
            sortDirection = 'ASC';
        }
        currentPage = 1;
        fetchMembers(searchInput?.value || ''); // Pass current search query
    }

    // ===== COLUMN RESIZING FUNCTIONS =====
    function initializeResizableColumns() {
        // ... (existing code - no changes needed here) ...
        const table = document.getElementById('memberTable');
        if (!table) return;
        const resizableHeaders = table.querySelectorAll('thead th[data-column]'); // Target only data columns

        resizableHeaders.forEach(th => {
            let resizer = th.querySelector('.resizer');
            if (!resizer) {
                resizer = document.createElement('div');
                resizer.className = 'resizer';
                th.appendChild(resizer);
            }
            resizer.addEventListener('mousedown', initResize);
            // Prevent text selection on the resizer itself
            resizer.addEventListener('selectstart', (e) => e.preventDefault());
        });

        function initResize(e) {
            const resizer = e.target;
            const currentTh = resizer.parentElement;
            if (!currentTh || currentTh.tagName !== 'TH') return;

            e.preventDefault(); // Prevent default text selection/drag
            e.stopPropagation(); // Stop event bubbling

            const startX = e.pageX;
            const startWidth = currentTh.offsetWidth;
            const tableContainer = currentTh.closest('.table-responsive') || document.body; // Find scroll container or body

            // Add classes for visual feedback
            currentTh.classList.add('resizing');
            tableContainer.classList.add('table-resizing'); // Class on container for cursor

            document.addEventListener('mousemove', performResize);
            document.addEventListener('mouseup', stopResize, { once: true }); // Use { once: true } for cleanup

            function performResize(moveEvent) {
                const widthChange = moveEvent.pageX - startX;
                let newWidth = startWidth + widthChange;
                const minWidth = parseInt(currentTh.style.minWidth || '50', 10); // Use min-width from style or default
                newWidth = Math.max(minWidth, newWidth);
                currentTh.style.width = `${newWidth}px`;
                 // Ensure table layout is fixed during resize for predictability
                 if (table.style.tableLayout !== 'fixed') {
                     table.style.tableLayout = 'fixed';
                 }
            }

            function stopResize() {
                document.removeEventListener('mousemove', performResize);
                // mouseup listener removed by { once: true }

                currentTh.classList.remove('resizing');
                tableContainer.classList.remove('table-resizing');

                // Optional: Revert table layout if you want it auto sometimes
                // table.style.tableLayout = ''; // Or keep fixed

                saveColumnWidths(); // Save the final widths
            }
        }
    }

    function saveColumnWidths() {
        // ... (existing code - no changes needed here) ...
         try {
            const widths = {};
            table.querySelectorAll('thead th[data-column]').forEach(header => {
                const column = header.dataset.column;
                // Only save if width is explicitly set and seems valid (e.g., contains 'px')
                if (column && header.style.width && header.style.width.includes('px')) {
                    widths[column] = header.style.width;
                }
            });
            // Only save if there are widths to save
            if (Object.keys(widths).length > 0) {
                 localStorage.setItem('memberTableColumnWidths', JSON.stringify(widths));
            } else {
                 localStorage.removeItem('memberTableColumnWidths'); // Clear if no widths set
            }
        } catch (error) {
            console.error('Error saving column widths:', error);
        }
    }

    function loadColumnWidths() {
        // ... (existing code - no changes needed here) ...
        try {
            const savedWidths = JSON.parse(localStorage.getItem('memberTableColumnWidths') || '{}');
            let widthsApplied = false;
            let requiresFixedLayout = false;

            table.querySelectorAll('thead th[data-column]').forEach(header => {
                const column = header.dataset.column;
                if (savedWidths[column]) {
                    header.style.width = savedWidths[column];
                    widthsApplied = true;
                    requiresFixedLayout = true; // If any width is loaded, use fixed layout
                } else {
                    // Apply default width if no saved width exists for this column
                    setDefaultColumnWidth(header);
                }
            });

             // Apply fixed layout if custom widths were loaded OR if defaults necessitate it
             if (requiresFixedLayout || tableRequiresFixedLayoutByDefault()) {
                  if (table.style.tableLayout !== 'fixed') {
                     table.style.tableLayout = 'fixed';
                  }
             } else {
                  // Optionally revert to auto layout if no custom widths and defaults don't need fixed
                  // table.style.tableLayout = '';
             }

        } catch (error) {
            console.error('Error loading column widths:', error);
            // Apply default widths in case of error
            table.querySelectorAll('thead th[data-column]').forEach(setDefaultColumnWidth);
             if (tableRequiresFixedLayoutByDefault()) { // Check again after applying defaults
                  if (table.style.tableLayout !== 'fixed') {
                     table.style.tableLayout = 'fixed';
                  }
             }
        }
    }

    // Helper to determine if table should have fixed layout based on default widths
    function tableRequiresFixedLayoutByDefault() {
         // If any default width setting implies wrapping or specific sizing, return true
         // Example: If Address or Remarks columns exist and have default widths set
         return !!(table.querySelector('th[data-column="Address"]') || table.querySelector('th[data-column="remarks"]'));
    }


    function setDefaultColumnWidth(header) {
        // ... (existing code - no changes needed here) ...
        if (!header || !header.dataset || !header.dataset.column) return;

        const column = header.dataset.column;
        let defaultWidth = '150px'; // Fallback default
        let minWidth = '60px';     // Default min-width
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
            // Action column is handled by CSS class .Action, not data-column usually
        }

        header.style.width = defaultWidth;
        header.style.minWidth = minWidth; // Apply min-width
        // Apply white-space based on flag
        header.style.whiteSpace = needsNormalWhitespace ? 'normal' : 'nowrap';
    }

    function resetColumnWidths() {
        // ... (existing code - no changes needed here) ...
        try {
            localStorage.removeItem('memberTableColumnWidths');
            // Clear inline width styles and re-apply defaults
            table.querySelectorAll('thead th[data-column]').forEach(header => {
                 header.style.width = ''; // Clear inline style first
                 setDefaultColumnWidth(header); // Reapply default
            });
            // Re-evaluate table layout after resetting
            if (tableRequiresFixedLayoutByDefault()) {
                 if (table.style.tableLayout !== 'fixed') {
                    table.style.tableLayout = 'fixed';
                 }
            } else {
                 table.style.tableLayout = ''; // Revert to auto if defaults allow
            }
            console.log('Column widths reset to default values');
        } catch (error) {
            console.error('Error resetting column widths:', error);
        }
    }


    // ===== EVENT LISTENERS =====
    function initializeEventListeners() {
        // Search input (debounced)
        const debouncedSearch = debounce((searchText) => {
            currentPage = 1;
            // fetchMembers will determine search type based on input value
            fetchMembers(searchText.trim());
        }, 350);

        searchInput?.addEventListener("input", function() {
            debouncedSearch(this.value);
        });

        // Table header sorting (event delegation)
        thead?.addEventListener('click', function(event) {
            const header = event.target.closest('th[data-column]');
            // Ensure click is on the header itself or its content, not the resizer
            if (header && !event.target.classList.contains('resizer')) {
                handleSortClick(header.dataset.column);
            }
        });

        // Pagination controls
        prevPageButton?.addEventListener("click", () => changePage(currentPage - 1));
        nextPageButton?.addEventListener("click", () => changePage(currentPage + 1));

        // Birthday button opens modal (onclick in HTML)
        // Expiry button opens modal (onclick in HTML)

        // List All Members button
        listAllMembersButton?.addEventListener("click", function() {
            currentPage = 1;
            currentSearchType = 'all';
            targetStartDate = null; // Reset expiry dates
            targetEndDate = null;
            targetBirthdayMonth = null; // Reset birthday month
            currentFilterValue = '';
            if (memberFilter) memberFilter.value = '';
            if (searchInput) searchInput.value = '';
            fetchMembers();
        });

        // Member filter dropdown
        memberFilter?.addEventListener('change', function() {
            currentFilterValue = this.value;
            currentPage = 1;
            // Fetch using the current search text/type *and* this filter
            fetchMembers(searchInput?.value || '');
        });

        // Items per page change
        itemsPerPageSelect?.addEventListener("change", function () {
            itemsPerPage = parseInt(this.value);
            currentPage = 1;
            fetchMembers(searchInput?.value || '');
        });

        // --- Expiry Modal Event Listeners ---
        confirmExpirySearchButton?.addEventListener('click', handleConfirmExpirySearch);
        closeExpiryButton?.addEventListener('click', closeExpiryModal); // Close via X

        // --- Birthday Modal Event Listeners ---
        confirmBirthdaySearchButton?.addEventListener('click', handleConfirmBirthdaySearch);
        closeBirthdayButton?.addEventListener('click', closeBirthdayModal); // Close via X

        // --- Shared Modal Overlay Listener ---
        modalOverlay?.addEventListener('click', () => {
            closeExpiryModal();
            closeBirthdayModal();
        });

        // --- Jump to Page Button Listener (if button exists outside pagination update) ---
        // This is better handled inside updatePagination where the button is created/updated
        // const jumpButton = document.querySelector('.jump-btn');
        // jumpButton?.addEventListener('click', jumpToPage);
        // const pageInput = document.getElementById('pageInput');
        // pageInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') jumpToPage(); });
    }

    // --- MODIFIED: Function to handle Expiry modal confirmation ---
    function handleConfirmExpirySearch() {
        const startYear = expiryStartYearInput?.value.trim();
        const startMonth = expiryStartMonthInput?.value;
        const startDay = expiryStartDayInput?.value.trim();
        const endYear = expiryEndYearInput?.value.trim();
        const endMonth = expiryEndMonthInput?.value;
        const endDay = expiryEndDayInput?.value.trim();

        // Basic presence validation
        if (!startYear || !startMonth || !startDay || !endYear || !endMonth || !endDay) {
            alert("请完整填写开始日期和结束日期的年、月、日。");
            return;
        }

        // Construct date strings (YYYY-MM-DD)
        const startDateStr = `${startYear}-${padStart(startMonth)}-${padStart(startDay)}`;
        const endDateStr = `${endYear}-${padStart(endMonth)}-${padStart(endDay)}`;

        // Validate date strings
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

        // Optional: Validate that start date is not after end date
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);
        if (startDate > endDate) {
            alert("开始日期不能晚于结束日期。");
            return;
        }

        // Store validated dates
        targetStartDate = startDateStr;
        targetEndDate = endDateStr;
        targetBirthdayMonth = null; // Reset birthday month

        // Set search type and trigger fetch
        currentPage = 1;
        currentSearchType = 'expired'; // Set the search type
        currentFilterValue = ''; // Reset other filters
        if (memberFilter) memberFilter.value = '';
        if (searchInput) searchInput.value = '';

        console.log(`Searching for members expiring between ${targetStartDate} and ${targetEndDate}`);
        fetchMembers(); // fetchMembers will now use the target dates

        closeExpiryModal(); // Close the modal after confirmation
    }

    // --- Function to handle Birthday modal confirmation (Unchanged) ---
    function handleConfirmBirthdaySearch() {
        const month = birthdayMonthInput?.value;
        if (!month) {
            alert("请选择一个月份。");
            birthdayMonthInput?.focus();
            return;
        }
        targetBirthdayMonth = parseInt(month, 10);
        targetStartDate = null; // Reset expiry dates
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


    // ===== GLOBAL FUNCTIONS (accessible from HTML onclick) =====

    window.editMember = function(id) {
        // ... (existing code - remains the same) ...
        if (!id) { console.error("Edit Error: No ID"); alert("无法编辑：ID未提供"); return; }
        console.log(`Redirecting to edit member with ID: ${id}`);
        window.location.href = `member_management.html?action=edit&id=${id}`;
    };

    window.deleteMember = async function(id) {
        // ... (existing code - remains the same) ...
        if (!id) { console.error("Delete Error: No ID"); alert("无法删除：ID未提供"); return; }
        if (confirm(`确定要删除塾员 ID ${id} 吗？此操作无法撤销。`)) {
            console.log(`Attempting to delete member with ID: ${id}`);
            const deleteUrl = `${API_BASE_URL}?table=members&ID=${id}`; // Ensure correct table name
            try {
                const response = await fetch(deleteUrl, { method: 'DELETE' });
                let message = `删除失败 (Status: ${response.status})`;
                let success = false;
                if (response.ok) {
                     message = '删除成功！';
                     success = true;
                     // Try parsing JSON only if content type suggests it or status is not 204
                     if (response.status !== 204 && response.headers.get("content-type")?.includes("application/json")) {
                        try {
                            const data = await response.json();
                            message = data.message || message;
                        } catch (e) { console.warn("Could not parse JSON response on delete success:", e); }
                     }
                } else {
                     // Try to get more specific error message
                     try {
                         const errorData = await response.json();
                         message = errorData.message || message;
                     } catch (e) {
                         try { message = await response.text() || message; } catch (e2) {}
                     }
                }
                alert(message);
                if (success) {
                    // Refresh the current page view
                    fetchMembers(searchInput?.value || '');
                }
            } catch (error) {
                console.error("Error deleting member:", error);
                alert(`删除时发生网络或脚本错误: ${error.message}`);
            }
        }
    };

    window.checkMember = function(id) {
        // ... (existing code - remains the same) ...
        if (!id) { console.error("Check Error: No ID"); alert("无法查看：ID未提供"); return; }
        console.log(`Redirecting to check details for member ID: ${id}`);
        window.location.href = `check_details.html?id=${id}`; // Ensure this page exists
    };

    window.changePage = function(page) {
        // ... (existing code - remains the same) ...
        const targetPage = parseInt(page, 10);
        // Check bounds and if page actually changed
        if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= totalPages && targetPage !== currentPage) {
            console.log(`Changing page from ${currentPage} to ${targetPage}`);
            currentPage = targetPage;
            fetchMembers(searchInput?.value || ''); // Fetch data for the new page
        } else {
             console.log(`Page change to ${page} ignored (invalid or same page). Current: ${currentPage}, Total: ${totalPages}`);
        }
    };

    window.jumpToPage = function() {
        // ... (existing code - remains the same) ...
        const pageInput = document.getElementById('pageInput');
        if (!pageInput) return;
        const targetPage = parseInt(pageInput.value, 10);
        if (isNaN(targetPage) || targetPage < 1 || targetPage > totalPages) {
            alert(`请输入有效的页码 (1 到 ${totalPages})。`);
            pageInput.value = '';
            pageInput.focus();
        } else {
            pageInput.value = ''; // Clear input after successful jump
            changePage(targetPage);
        }
    };

    // --- Expiry Modal Control Functions ---
    window.openExpiryModal = function() {
        if (expiryModal && modalOverlay) {
            // Optionally set default dates (e.g., start/end of current month) or clear fields
            const now = new Date();
            if(expiryStartYearInput) expiryStartYearInput.value = now.getFullYear();
            if(expiryStartMonthInput) expiryStartMonthInput.value = now.getMonth() + 1;
            if(expiryStartDayInput) expiryStartDayInput.value = '1'; // Default to 1st
            if(expiryEndYearInput) expiryEndYearInput.value = now.getFullYear();
            if(expiryEndMonthInput) expiryEndMonthInput.value = now.getMonth() + 1;
             // Default to last day of current month (approximation)
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            if(expiryEndDayInput) expiryEndDayInput.value = lastDay;

            expiryModal.style.display = 'block';
            modalOverlay.style.display = 'block';
            expiryStartYearInput?.focus(); // Focus the first field
        } else {
            console.error("Expiry modal or overlay element not found.");
            alert("无法打开到期查询窗口。");
        }
    };

    window.closeExpiryModal = function() {
        if (expiryModal && modalOverlay) {
            expiryModal.style.display = 'none';
            // Only hide overlay if the birthday modal isn't also open
            if (!birthdayModal || birthdayModal.style.display !== 'block') {
                modalOverlay.style.display = 'none';
            }
        }
    };

    // --- Birthday Modal Control Functions (Unchanged) ---
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
             // Only hide overlay if the expiry modal isn't also open
            if (!expiryModal || expiryModal.style.display !== 'block') {
                modalOverlay.style.display = 'none';
            }
        }
    };

    // Make resetColumnWidths globally available
    window.resetColumnWidths = resetColumnWidths;

    // Initialize the page
    initializePage();
});