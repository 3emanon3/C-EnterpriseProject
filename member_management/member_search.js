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
    const birthdayButton = document.getElementById("searchBirthday"); // Button now opens modal
    const expiredButton = document.getElementById("searchExpiry");
    const listAllMembersButton = document.getElementById("listAllMembers");
    const memberFilter = document.getElementById("memberFilter");
    const table = document.getElementById('memberTable');
    const tableHeaders = table.querySelectorAll('th');
    const paginationContainer = document.querySelector('.pagination');

    // --- Expiry Modal Elements ---
    const expiryModal = document.getElementById('expiryModal');
    const expiryYearInput = document.getElementById('expiryYearInput');
    const expiryMonthInput = document.getElementById('expiryMonthInput');
    const confirmExpirySearchButton = document.getElementById('confirmExpirySearch');
    const closeExpiryButton = expiryModal?.querySelector('.close-button');
    const cancelExpiryModalButton = expiryModal?.querySelector('.btn-secondary[onclick="closeExpiryModal()"]');

    // --- Birthday Modal Elements ---
    const birthdayModal = document.getElementById('birthdayModal');
    const birthdayMonthInput = document.getElementById('birthdayMonthInput');
    const confirmBirthdaySearchButton = document.getElementById('confirmBirthdaySearch');
    const closeBirthdayButton = birthdayModal?.querySelector('.close-button');
    const cancelBirthdayModalButton = birthdayModal?.querySelector('.btn-secondary[onclick="closeBirthdayModal()"]');

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
    // --- State for Expiry Search ---
    let targetExpiryYear = null;
    let targetExpiryMonth = null;
    // --- State for Birthday Search ---
    let targetBirthdayMonth = null; // Stores the month selected in the birthday modal


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

        // Clear existing options except the first one
        while (memberFilter.options.length > 1) {
            memberFilter.remove(1);
        }

        // Add default option
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "选择种类";
        memberFilter.appendChild(defaultOption);

        try {
            // Fetch applicant types from API
            const response = await fetch(`${API_BASE_URL}?table=applicants_types`);
            if (!response.ok) {
                throw new Error(`Failed to fetch applicant types: ${response.status}`);
            }

            const data = await response.json();
            const applicantTypes = data.data || [];

            // Add options for each applicant type
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

    // Fetch members data from API
    async function fetchMembers(query = "") {
        loader.style.display = "block";
        memberTableBody.innerHTML = ""; // Clear previous results

        const params = new URLSearchParams();
        params.append("table", "members_with_applicant_designation");
        params.append("limit", itemsPerPage);
        params.append("page", currentPage);

        // --- MODIFIED: Parameter logic based on search type ---
        if (currentSearchType === 'Birthday') {
            // Birthday search is now triggered ONLY after confirming from the modal
            if (targetBirthdayMonth) {
                params.append("Birthday", "true"); // Parameter name from requirement
                params.append("search", "true"); // Parameter name from requirement
                params.append("targetMonth", targetBirthdayMonth.toString()); // Use the stored target month
                console.log(`Searching for birthdays in month ${targetBirthdayMonth}`);
            } else {
                // This case should ideally not happen if the flow is correct,
                // but as a fallback, maybe fetch all members or show an error.
                console.warn("Birthday search triggered without target month. Reverting to 'all'.");
                currentSearchType = 'all'; // Revert to avoid confusion
                targetBirthdayMonth = null; // Ensure reset
            }
            // Reset expiry targets if switching search type
            targetExpiryYear = null;
            targetExpiryMonth = null;
        } else if (currentSearchType === 'expired') {
            // Expiry search triggered ONLY after confirming from the modal
            if (targetExpiryYear && targetExpiryMonth) {
                params.append("expired", "true");
                params.append("search", "true");
                params.append("targetYear", targetExpiryYear);
                params.append("targetMonth", targetExpiryMonth);
                console.log(`Fetching members expiring on or before ${targetExpiryYear}-${targetExpiryMonth}`);
            } else {
                console.warn("Expired search triggered without target year/month. Reverting to 'all'.");
                currentSearchType = 'all';
                targetExpiryYear = null;
                targetExpiryMonth = null;
            }
             // Reset birthday target if switching search type
            targetBirthdayMonth = null;
        } else if (query.trim() !== "") {
            params.append("search", query); // General text search
            currentSearchType = 'search';
             // Reset expiry and birthday targets if switching search type
            targetExpiryYear = null;
            targetExpiryMonth = null;
            targetBirthdayMonth = null;
        } else { // 'all' members (default or List All button)
            currentSearchType = 'all';
             // Reset expiry and birthday targets if switching search type
            targetExpiryYear = null;
            targetExpiryMonth = null;
            targetBirthdayMonth = null;
        }
        // --- END MODIFICATION ---

        // Add applicant filter if selected (applies to all search types)
        if (memberFilter.value) {
            // Ensure search=true is set if filtering, even for 'all' list
            if (!params.has('search')) {
                 params.append("search", "true");
            }
            params.append("designation_of_applicant", memberFilter.value);
            console.log("Filtering by applicant:", memberFilter.value);
        }

        // Add sorting parameters
        if (sortColumn) {
            let dbSortColumn = sortColumn;
            // ... (existing column name mapping logic - remains the same) ...
            if (sortColumn === 'componyName') {
                dbSortColumn = 'componyName';
            } else if (sortColumn === 'expired_date' || sortColumn === 'expiredDate') {
                dbSortColumn = 'expired_date';
            } else if (sortColumn === 'place_of_birth' || sortColumn === 'placeOfBirth') {
                dbSortColumn = 'place_of_birth';
            } else if (sortColumn === 'Designation_of_Applicant') {
                dbSortColumn = 'Designation_of_Applicant';
            }

            params.append("sort", dbSortColumn);
            params.append("order", sortDirection);
        }

        const url = `${API_BASE_URL}?${params.toString()}`;
        console.log("API URL:", url);
        // console.log("All params:", Object.fromEntries(params.entries())); // Useful for debugging

        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Server error response: ${errorText}`);
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            // console.log("API Response:", data);

            if (data && typeof data === 'object') {
                membersData = Array.isArray(data.data) ? data.data : [];
                const total = data.pagination?.total_records ?? membersData.length; // Use nullish coalescing
                totalMembers.textContent = total;
                totalPages = Math.ceil(total / itemsPerPage) || 1;
            } else {
                membersData = [];
                totalMembers.textContent = 0;
                totalPages = 1;
                console.error("Unexpected API response format:", data);
            }

            displayMembers(membersData);
            updatePagination();
            updateSortIcons();

        } catch (error) {
            console.error("Error fetching members:", error);
            memberTableBody.innerHTML = `<tr><td colspan="18" class="no-results">加载失败: ${error.message}</td></tr>`; // Adjusted colspan
            membersData = [];
            totalMembers.textContent = 0;
            totalPages = 1;
            updatePagination();
        } finally {
            loader.style.display = "none";
        }
    }

    // ===== DISPLAY FUNCTIONS =====
    function displayMembers(members) {
        memberTableBody.innerHTML = ""; // Clear previous results

        if (!Array.isArray(members)) {
            console.error("Expected members to be an array, got:", members);
            members = []; // Default to empty array to prevent errors
        }

        if (members.length === 0) {
            let message = '暂无记录';
            if (currentSearchType === 'search' && searchInput.value) message = '没有找到匹配的记录';
            // --- MODIFIED: Birthday message uses targetBirthdayMonth ---
            else if (currentSearchType === 'Birthday') message = `没有在 ${targetBirthdayMonth} 月份生日的塾员`;
            else if (currentSearchType === 'expired') message = `没有在 ${targetExpiryYear}-${targetExpiryMonth} 或之前到期的塾员`;
            else if (currentFilterValue) message = `没有符合 "${currentFilterValue}" 条件的记录`;
            // Adjust colspan based on the actual number of columns in your table header
            memberTableBody.innerHTML = `<tr><td colspan="18" class="no-results">${message}</td></tr>`;
            return;
        }

        members.forEach(member => {
            if (!member || typeof member !== 'object') {
                console.warn("Skipping invalid member data:", member);
                return; // Skip this iteration
            }

            const formatData = (value) => {
                // Handle null, undefined, or specific placeholder values
                if (value === null || value === undefined || value === '' || value === 'For...') {
                    return ''; // Return empty string for display
                }
                // Convert to string and escape HTML characters
                return String(value).replace(/[&<>"']/g, (m) => ({
                    '&': '&', '<': '<', '>': '>', '"': '"', "'": "'"
                }[m]));
            };

            // Use correct field names based on your API response and handle potential variations
            const designation = member['Designation_of_Applicant'] || member['designation_of_applicant'] || '';
            const expiredDate = member['expired_date'] || member['expiredDate'] || '';
            const placeOfBirth = member['place_of_birth'] || member['placeOfBirth'] || ''; // Corrected field name
            const gender = member['gender'] || '';
            const position = member['position'] || '';
            const companyName = member['componyName'] || member['companyName'] || ''; // Handle potential typo

            const formatPhone = (phone) => {
                const phoneStr = String(phone || '');
                // Basic formatting, adjust regex if needed for different formats
                if (phoneStr.length === 10) {
                     return phoneStr.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
                } else if (phoneStr.length === 11 && phoneStr.startsWith('0')) { // e.g., 012-3456789
                    return phoneStr.replace(/(\d{3})(\d{7,8})/, "$1-$2");
                }
                return phoneStr; // Return original if format doesn't match
            };

            const formatIC = (ic) => {
                const icStr = String(ic || '');
                 if (icStr.length === 12) {
                    return icStr.replace(/(\d{6})(\d{2})(\d{4})/, "$1-$2-$3");
                 }
                 return icStr; // Return original if format doesn't match
            };

            const formatDate = (dateString) => {
                if (!dateString) return '';
                try {
                    const date = new Date(dateString);
                    // Check if the date is valid
                    if (isNaN(date.getTime())) {
                        return dateString; // Or return '' if invalid dates should be hidden
                    }
                    const year = date.getFullYear();
                    // Ensure month/day are two digits
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                } catch (e) {
                    console.warn(`Could not parse date: ${dateString}`, e);
                    return dateString; // Return original string if parsing fails
                }
            };

            const row = document.createElement("tr");
            // Ensure the order matches your <th> elements and use the formatted data
            row.innerHTML = `
                <td>${formatData(member.membersID)}</td>
                <td>${formatData(member.Name)}</td>
                <td>${formatData(member.CName)}</td>
                <td>${formatData(designation)}</td>
                <td>${formatData(member.Address)}</td>
                <td>${formatPhone(member.phone_number)}</td>
                <td>${formatData(member.email)}</td>
                <td>${formatIC(member.IC)}</td>
                <td>${formatIC(member.oldIC)}</td>
                <td>${formatData(gender)}</td>
                <td>${formatData(companyName)}</td>
                <td>${formatData(member.Birthday)}</td>
                <td>${formatDate(expiredDate)}</td>
                <td>${formatData(placeOfBirth)}</td>
                <td>${formatData(position)}</td>
                <td>${formatData(member.others)}</td>
                <td>${formatData(member.remarks)}</td>
                <td>
                    <button class="btn btn-edit" onclick="editMember('${member.ID || member.id || ''}')" title="编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-delete" onclick="deleteMember('${member.ID || member.id || ''}')" title="删除">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-check" onclick="checkMember('${member.ID || member.id || ''}')" title="查看详情">
                        <i class="fas fa-check"></i>
                    </button>
                </td>
            `;
            memberTableBody.appendChild(row);
        });
    }

    function updatePagination() {
        // ... (existing code - no changes needed here) ...
         if (!paginationContainer) return;

        paginationContainer.innerHTML = ''; // Clear existing buttons/info

        const maxPagesToShow = 5; // Max number of specific page buttons to show
        let startPage, endPage;

        if (totalPages <= maxPagesToShow) {
            // Less than max pages, show all
            startPage = 1;
            endPage = totalPages;
        } else {
            // More than max pages, calculate range
            const maxPagesBeforeCurrent = Math.floor(maxPagesToShow / 2);
            const maxPagesAfterCurrent = Math.ceil(maxPagesToShow / 2) - 1;
            if (currentPage <= maxPagesBeforeCurrent) {
                // Near the start
                startPage = 1;
                endPage = maxPagesToShow;
            } else if (currentPage + maxPagesAfterCurrent >= totalPages) {
                // Near the end
                startPage = totalPages - maxPagesToShow + 1;
                endPage = totalPages;
            } else {
                // In the middle
                startPage = currentPage - maxPagesBeforeCurrent;
                endPage = currentPage + maxPagesAfterCurrent;
            }
        }

        // Always show first page button if needed
        if (startPage > 1) {
            paginationContainer.appendChild(createPaginationButton(1));
            if (startPage > 2) {
                paginationContainer.appendChild(createPaginationEllipsis());
            }
        }

        // Show page numbers in calculated range
        for (let i = startPage; i <= endPage; i++) {
            paginationContainer.appendChild(createPaginationButton(i, i === currentPage));
        }

        // Always show last page button if needed
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationContainer.appendChild(createPaginationEllipsis());
            }
            paginationContainer.appendChild(createPaginationButton(totalPages));
        }

        // Add page info and jump input
        const pageInfoDiv = document.createElement('div');
        pageInfoDiv.className = 'pagination-info';
        pageInfoDiv.innerHTML = `
            <span class="page-indicator">${currentPage} / ${totalPages}</span>
            <div class="page-jump">
                <input type="number"
                       id="pageInput"
                       min="1"
                       max="${totalPages}"
                       placeholder="页码"
                       class="page-input"
                       aria-label="Jump to page number">
                <button onclick="jumpToPage()" class="jump-btn btn btn-secondary">跳转</button>
            </div>
        `;
        paginationContainer.appendChild(pageInfoDiv);

        // Re-attach event listener for the new page input's Enter key press
        const pageInput = document.getElementById('pageInput');
        if (pageInput) {
            pageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    jumpToPage(); // Ensure jumpToPage is globally accessible or called correctly
                }
            });
        }

        // Update Prev/Next button states
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage === totalPages;
    }

    // Helper function for creating pagination buttons
    function createPaginationButton(pageNumber, isActive = false) {
        const button = document.createElement('button');
        button.textContent = pageNumber;
        button.className = `pagination-btn ${isActive ? 'active' : ''}`;
        button.onclick = () => changePage(pageNumber); // Ensure changePage is globally accessible
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
            const icon = th.querySelector('i.sort-arrow') || document.createElement('i');
            icon.className = 'sort-arrow fas'; // Base classes

            if (column === sortColumn) {
                icon.classList.remove('fa-sort', 'fa-sort-up', 'fa-sort-down'); // Clear previous sort icons
                icon.classList.add(sortDirection === 'ASC' ? 'fa-sort-up' : 'fa-sort-down');
            } else {
                 icon.classList.remove('fa-sort-up', 'fa-sort-down'); // Clear specific direction
                 icon.classList.add('fa-sort'); // Add the default sort icon
            }

            // Ensure the icon is appended if it wasn't there
            if (!th.querySelector('i.sort-arrow')) {
                // Add some spacing if needed
                th.appendChild(document.createTextNode(' ')); // Add a space before the icon
                th.appendChild(icon);
            }
        });
    }

    // ===== SORTING FUNCTIONS =====
    function handleSortClick(columnName) {
        // ... (existing code - no changes needed here) ...
        if (sortColumn === columnName) {
            // Toggle direction
            sortDirection = sortDirection === 'ASC' ? 'DESC' : 'ASC';
        } else {
            // New column, default to ASC
            sortColumn = columnName;
            sortDirection = 'ASC';
        }
        currentPage = 1; // Reset to first page when sorting
        // updateSortIcons(); // Update icons immediately for feedback
        fetchMembers(searchInput.value); // Fetch sorted data (fetchMembers calls updateSortIcons)
    }

    // ===== COLUMN RESIZING FUNCTIONS =====
    function initializeResizableColumns() {
        // ... (existing code - no changes needed here) ...
        const table = document.getElementById('memberTable');
        if (!table) return;
        // Select only headers that are meant to be resizable (have data-column or a resizer div)
        const resizableHeaders = table.querySelectorAll('thead th[data-column], thead th:has(.resizer)');

        resizableHeaders.forEach(th => {
            // Ensure a resizer element exists or create one
            let resizer = th.querySelector('.resizer');
            if (!resizer) {
                resizer = document.createElement('div');
                resizer.className = 'resizer';
                th.appendChild(resizer);
            }

            // Prevent text selection during resize
            resizer.addEventListener('selectstart', (e) => e.preventDefault());

            // Attach mousedown listener to the resizer itself
            resizer.addEventListener('mousedown', initResize);
        });

        function initResize(e) {
            // Get the header element (parent of the resizer)
            const currentTh = e.target.parentElement;
            if (!currentTh || currentTh.tagName !== 'TH') return;

            e.preventDefault(); // Prevent default drag behavior
            e.stopPropagation(); // Stop event bubbling

            const startX = e.pageX;
            const startWidth = currentTh.offsetWidth;
            // Find the closest scrollable container if needed for cursor styling
            const tableContainer = currentTh.closest('.table-responsive') || currentTh.closest('.table-container');

            // Add classes for visual feedback during resize
            currentTh.classList.add('resizing');
            if (tableContainer) tableContainer.classList.add('resizing-active'); // Use a different class for the container


            // Attach listeners to the document to capture mouse movements anywhere on the page
            document.addEventListener('mousemove', performResize);
            document.addEventListener('mouseup', stopResize);

            function performResize(moveEvent) {
                // Calculate the difference in X position
                const widthChange = moveEvent.pageX - startX;
                let newWidth = startWidth + widthChange;

                // Enforce minimum width (e.g., 50px)
                const minWidth = parseInt(currentTh.style.minWidth || '50', 10);
                newWidth = Math.max(minWidth, newWidth);

                // Apply the new width directly to the header
                currentTh.style.width = `${newWidth}px`;

                // Optional: Adjust table layout if not using fixed
                // table.style.tableLayout = 'fixed'; // Ensure fixed layout for consistent resizing
            }

            function stopResize() {
                // Remove document-level listeners
                document.removeEventListener('mousemove', performResize);
                document.removeEventListener('mouseup', stopResize);

                // Remove resizing classes
                currentTh.classList.remove('resizing');
                 if (tableContainer) tableContainer.classList.remove('resizing-active');


                // Optional: Revert table layout if changed
                // table.style.tableLayout = ''; // Or back to 'auto' if preferred

                // Save the final widths
                saveColumnWidths();
            }
        }
    }

    function saveColumnWidths() {
        // ... (existing code - no changes needed here) ...
        try {
            const widths = {};
            // Select only headers with data-column attribute to save
            table.querySelectorAll('thead th[data-column]').forEach(header => {
                const column = header.dataset.column;
                if (column && header.style.width) { // Only save if width is explicitly set
                    widths[column] = header.style.width;
                }
            });
            localStorage.setItem('memberTableColumnWidths', JSON.stringify(widths)); // Use a specific key
        } catch (error) {
            console.error('Error saving column widths:', error);
        }
    }

    function loadColumnWidths() {
        // ... (existing code - no changes needed here) ...
         try {
            const savedWidths = JSON.parse(localStorage.getItem('memberTableColumnWidths') || '{}');
            let widthsApplied = false;

            table.querySelectorAll('thead th[data-column]').forEach(header => {
                const column = header.dataset.column;
                if (savedWidths[column]) {
                    header.style.width = savedWidths[column];
                    widthsApplied = true;
                } else {
                    // Optionally set default widths if no saved width exists
                    // setDefaultColumnWidth(header); // Consider calling this if needed
                }
            });

             // If any widths were loaded, ensure table layout is fixed
             if (widthsApplied) {
                 // table.style.tableLayout = 'fixed'; // Apply fixed layout if using saved widths
             } else {
                 // If no widths loaded, apply default widths to all relevant headers
                 table.querySelectorAll('thead th[data-column]').forEach(setDefaultColumnWidth);
             }


        } catch (error) {
            console.error('Error loading column widths:', error);
            // Apply default widths in case of error
            table.querySelectorAll('thead th[data-column]').forEach(setDefaultColumnWidth);
        }
    }

    function setDefaultColumnWidth(header) {
        // ... (existing code - no changes needed here) ...
        if (!header || !header.dataset || !header.dataset.column) return; // Basic check

        const column = header.dataset.column;
        let defaultWidth = '150px'; // Default width

        // Set specific widths based on column name
        switch (column) {
            case 'membersID':
                defaultWidth = '90px';
                break;
            case 'Name':
            case 'CName':
                 defaultWidth = '160px';
                 break;
            case 'Designation_of_Applicant':
                 defaultWidth = '100px';
                 break;
            case 'Address':
                defaultWidth = '250px';
                header.style.whiteSpace = 'normal'; // Allow wrapping for address
                break;
            case 'phone_number':
                defaultWidth = '130px';
                break;
            case 'email':
                defaultWidth = '180px';
                break;
            case 'IC':
            case 'oldIC':
                defaultWidth = '140px';
                break;
            case 'gender':
                defaultWidth = '70px';
                break;
            case 'componyName': // Match the data-column value
                 defaultWidth = '180px';
                 break;
            case 'Birthday':
                 defaultWidth = '100px';
                 break;
            case 'expired_date':
                 defaultWidth = '120px';
                 break;
             case 'place_of_birth': // Corrected field name
                 defaultWidth = '130px';
                 break;
            case 'position':
                 defaultWidth = '120px';
                 break;
            case 'others':
                 defaultWidth = '150px';
                 break;
            case 'remarks':
                defaultWidth = '250px';
                header.style.whiteSpace = 'normal'; // Allow wrapping for remarks
                break;
            // Add cases for any other specific columns
            default:
                defaultWidth = '150px'; // Fallback width
        }

        header.style.width = defaultWidth;
        // Set min-width for all resizable columns
        header.style.minWidth = '60px';
        // Optional: Set max-width if desired
        // header.style.maxWidth = '500px';
    }

    function resetColumnWidths() {
        // ... (existing code - no changes needed here) ...
        try {
            localStorage.removeItem('memberTableColumnWidths'); // Use the specific key
            // Re-apply default widths
            table.querySelectorAll('thead th[data-column]').forEach(setDefaultColumnWidth);
            // Reset table layout if it was set to fixed
            // table.style.tableLayout = ''; // Or 'auto'

            console.log('Column widths reset to default values');
            // Optional: Rerender or reflow table if needed, but applying widths should suffice
        } catch (error) {
            console.error('Error resetting column widths:', error);
        }
    }

    // ===== UTILITY FUNCTIONS =====
    function debounce(func, wait) {
        // ... (existing code - no changes needed here) ...
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

    // ===== EVENT LISTENERS =====
    function initializeEventListeners() {
        // Search input
        const debouncedSearch = debounce((searchText) => {
            currentPage = 1;
            fetchMembers(searchText.trim()); // Pass trimmed search text
        }, 350); // Slightly longer delay might be better

        searchInput?.addEventListener("input", function() {
            // No need to set currentSearchType here, fetchMembers handles it
            debouncedSearch(this.value);
        });

        // Table header sorting (delegated listener on thead)
        const thead = table?.querySelector('thead');
        thead?.addEventListener('click', function(event) {
            // Find the closest TH element from the click target
            const header = event.target.closest('th[data-column]');
            if (header && !event.target.classList.contains('resizer')) { // Ensure click wasn't on the resizer
                handleSortClick(header.dataset.column);
            }
        });


        // Pagination controls (Prev/Next)
        prevPageButton?.addEventListener("click", function () {
            if (currentPage > 1) {
                changePage(currentPage - 1); // Use changePage function
            }
        });

        nextPageButton?.addEventListener("click", function () {
            if (currentPage < totalPages) {
                changePage(currentPage + 1); // Use changePage function
            }
        });

        // --- MODIFIED: Birthday button now opens modal (listener removed, handled by onclick in HTML) ---
        // birthdayButton?.addEventListener("click", function() { ... }); // REMOVED

        // Expiry button's onclick is in HTML, pointing to openExpiryModal

        listAllMembersButton?.addEventListener("click", function() {
            currentPage = 1;
            currentSearchType = 'all';
            targetExpiryYear = null; // Reset expiry dates
            targetExpiryMonth = null;
            targetBirthdayMonth = null; // Reset birthday month
            currentFilterValue = ''; // Reset other filters
            if (memberFilter) memberFilter.value = '';
            if (searchInput) searchInput.value = '';
            fetchMembers();
        });

        // Member filter dropdown
        memberFilter?.addEventListener('change', function() {
            currentFilterValue = this.value;
            currentPage = 1;
            // Fetch members with the current search type/query *and* this filter
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
        closeExpiryButton?.addEventListener('click', closeExpiryModal); // Close via X button
        // The cancel button in HTML already calls closeExpiryModal via onclick
        // modalOverlay?.addEventListener('click', closeExpiryModal); // Overlay click handled below

        // --- Birthday Modal Event Listeners ---
        confirmBirthdaySearchButton?.addEventListener('click', handleConfirmBirthdaySearch);
        closeBirthdayButton?.addEventListener('click', closeBirthdayModal); // Close via X button
        // The cancel button in HTML already calls closeBirthdayModal via onclick

        // --- Shared Modal Overlay Listener ---
        // Close *either* modal if the overlay is clicked
        modalOverlay?.addEventListener('click', () => {
            closeExpiryModal();
            closeBirthdayModal();
        });
    }

    // --- Function to handle Expiry modal confirmation ---
    function handleConfirmExpirySearch() {
        const year = expiryYearInput.value.trim();
        const month = expiryMonthInput.value; // Value is 1-12 from select

        // Validation
        if (!year || !month) {
            alert("请选择年份和月份。");
            expiryMonthInput.focus(); // Focus on month if empty
            return;
        }
        const yearNum = parseInt(year, 10);
        if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) { // Example range
             alert("请输入有效的年份 (例如 1900-2100)。");
             expiryYearInput.focus();
             return;
        }

        // Store selected values
        targetExpiryYear = yearNum;
        targetExpiryMonth = parseInt(month, 10);
        targetBirthdayMonth = null; // Reset birthday month

        // Set search type and trigger fetch
        currentPage = 1;
        currentSearchType = 'expired'; // This is the key change
        currentFilterValue = ''; // Reset other filters
        if (memberFilter) memberFilter.value = '';
        if (searchInput) searchInput.value = '';

        console.log(`Searching for members expiring on or before ${targetExpiryYear}-${targetExpiryMonth}`);
        fetchMembers(); // fetchMembers will now use the target year/month

        closeExpiryModal(); // Close the modal after confirmation
    }

    // --- NEW: Function to handle Birthday modal confirmation ---
    function handleConfirmBirthdaySearch() {
        const month = birthdayMonthInput.value; // Value is 1-12 from select

        // Validation
        if (!month) {
            alert("请选择一个月份。");
            birthdayMonthInput.focus();
            return;
        }

        // Store selected value
        targetBirthdayMonth = parseInt(month, 10);
        targetExpiryYear = null; // Reset expiry dates
        targetExpiryMonth = null;

        // Set search type and trigger fetch
        currentPage = 1;
        currentSearchType = 'Birthday'; // Set the search type
        currentFilterValue = ''; // Reset other filters
        if (memberFilter) memberFilter.value = '';
        if (searchInput) searchInput.value = '';

        console.log(`Searching for members with birthday in month ${targetBirthdayMonth}`);
        fetchMembers(); // fetchMembers will now use the target birthday month

        closeBirthdayModal(); // Close the modal after confirmation
    }


    // ===== GLOBAL FUNCTIONS =====
    // These need to be accessible from HTML onclick attributes or other scopes

    window.editMember = function(id) {
        // ... (existing code - remains the same) ...
        if (!id) {
            console.error("Cannot edit member: No ID provided");
            alert("无法编辑：ID未提供");
            return;
        }
        window.location.href = `member_management.html?action=edit&id=${id}`;
    };

    window.deleteMember = async function(id) {
        // ... (existing code - remains the same) ...
         if (!id) {
            console.error("Cannot delete member: No ID provided");
            alert("无法删除：ID未提供");
            return;
        }

        if (confirm(`确定要删除塾员 ID ${id} 吗？此操作无法撤销。`)) {
            try {
                const deleteUrl = `${API_BASE_URL}?table=members&ID=${id}`;
                const response = await fetch(deleteUrl, {
                    method: 'DELETE',
                     headers: { 'Content-Type': 'application/json' }
                });

                if (response.ok) {
                    let data = {};
                    const contentType = response.headers.get("content-type");
                    if (contentType && contentType.indexOf("application/json") !== -1) {
                        data = await response.json();
                    } else if (response.status === 204) {
                        data = { status: 'success', message: '删除成功！' };
                    } else {
                         data = { status: 'success', message: `删除成功 (Status: ${response.status})` };
                    }
                    alert(data.message || '删除成功！');
                    fetchMembers(searchInput?.value || '');

                } else {
                    let errorData = { message: `删除失败 (Status: ${response.status})` };
                    try {
                         const errorJson = await response.json();
                         errorData.message = errorJson.message || errorData.message;
                    } catch (e) {
                        errorData.message = await response.text() || errorData.message;
                    }
                    console.error("Deletion failed:", errorData);
                    alert(`删除失败: ${errorData.message}`);
                }

            } catch (error) {
                console.error("Error deleting member:", error);
                alert(`删除时发生网络或脚本错误: ${error.message}`);
            }
        }
    };

    window.checkMember = function(id) {
        // ... (existing code - remains the same) ...
        if (!id) {
            console.error("Cannot check member details: No ID provided");
            alert("无法查看：ID未提供");
            return;
        }
        window.location.href = `check_details.html?id=${id}`;
    };

    window.changePage = function(page) {
        // ... (existing code - remains the same) ...
        const targetPage = parseInt(page, 10);
        if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= totalPages && targetPage !== currentPage) {
            currentPage = targetPage;
            fetchMembers(searchInput?.value || '');
        }
    };

    window.jumpToPage = function() {
        // ... (existing code - remains the same) ...
        const pageInput = document.getElementById('pageInput');
        if (!pageInput) return;
        const targetPage = parseInt(pageInput.value, 10);
        if (isNaN(targetPage)) {
            alert('请输入有效的页码数字。');
            pageInput.value = '';
            pageInput.focus();
            return;
        }
        const clampedPage = Math.max(1, Math.min(targetPage, totalPages));
        if (clampedPage !== currentPage) {
            changePage(clampedPage);
        }
        pageInput.value = '';
    };

    // --- Expiry Modal Control Functions ---
    window.openExpiryModal = function() {
        if (expiryModal && modalOverlay) {
            const now = new Date();
            expiryYearInput.value = now.getFullYear();
            expiryMonthInput.value = String(now.getMonth() + 1);
            expiryModal.style.display = 'block';
            modalOverlay.style.display = 'block';
            expiryYearInput.focus();
        } else {
            console.error("Expiry modal or overlay element not found.");
            alert("无法打开到期查询窗口。");
        }
    };

    window.closeExpiryModal = function() {
        if (expiryModal && modalOverlay) {
            expiryModal.style.display = 'none';
            // Only hide overlay if the *other* modal isn't also open
            if (birthdayModal && birthdayModal.style.display !== 'block') {
                modalOverlay.style.display = 'none';
            }
        }
    };

    // --- NEW: Birthday Modal Control Functions ---
    window.openBirthdayModal = function() {
        if (birthdayModal && modalOverlay) {
            // Set default month (e.g., current month or empty)
            const now = new Date();
            // Set month, ensuring it's a string matching the <option> value
            birthdayMonthInput.value = String(now.getMonth() + 1); // Default to current month
            // Or set to empty if you prefer user must select:
            // birthdayMonthInput.value = "";

            birthdayModal.style.display = 'block';
            modalOverlay.style.display = 'block';
            // Focus the month input field
            birthdayMonthInput.focus();
        } else {
            console.error("Birthday modal or overlay element not found.");
            alert("无法打生日开查询窗口。");
        }
    };

    window.closeBirthdayModal = function() {
        if (birthdayModal && modalOverlay) {
            birthdayModal.style.display = 'none';
             // Only hide overlay if the *other* modal isn't also open
            if (expiryModal && expiryModal.style.display !== 'block') {
                modalOverlay.style.display = 'none';
            }
        }
    };

    // Make resetColumnWidths globally available for the button's onclick
    window.resetColumnWidths = resetColumnWidths;

    // Initialize the page once the DOM is fully loaded
    initializePage();
});