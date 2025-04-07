import { API_BASE_URL } from '../config.js';

document.addEventListener("DOMContentLoaded", function () {
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
    const tableHeaders = table.querySelectorAll('th');
    const paginationContainer = document.querySelector('.pagination');

    const expiryModal = document.getElementById('expiryModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const expiryYearInput = document.getElementById('expiryYearInput');
    const expiryMonthInput = document.getElementById('expiryMonthInput');
    const confirmExpirySearchButton = document.getElementById('confirmExpirySearch');

    // ===== STATE VARIABLES =====
    let currentPage = 1;
    let itemsPerPage = parseInt(itemsPerPageSelect?.value || 10);
    let sortColumn = '';
    let sortDirection = '';
    let totalPages = 0;
    let currentSearchType = 'all';
    let currentFilterValue = '';
    let membersData = [];
    let selectedExpiryYear = null;
    let selectedExpiryMonth = null;
    
    // ===== INITIALIZATION =====
    function initializePage() {
        fetchApplicantType();
        initializeEventListeners();
        initializeResizableColumns();
        loadColumnWidths();
        fetchMembers(); // Initial data fetch
    }

    // ===== DATA FETCHING FUNCTIONS =====
    async function fetchApplicantType() {
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
        defaultOption.textContent = "选择会员种类";
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
        async function fetchMembers(query = "") { // query is specifically the text search term
            loader.style.display = "block";
            memberTableBody.innerHTML = "";
    
            const params = new URLSearchParams();
            params.append("table", "members_with_applicant_designation");
            params.append("limit", itemsPerPage);
            params.append("page", currentPage);
    
            let isFilterActive = false; // Flag to track if ANY filter is applied
    
            // --- Apply Filters Based on Current State ---
            // (State like currentSearchType, selectedExpiryYear/Month, memberFilter.value are set by event listeners BEFORE calling this function)
    
            if (currentSearchType === 'Birthday') {
                const currentMonth = new Date().getMonth() + 1;
                params.append("Birthday", "true");
                isFilterActive = true; // Birthday filter is active
                console.log(`Filtering by Birthday: Month ${currentMonth}`);
    
            } else if (currentSearchType === 'expiredSpecificDate' && selectedExpiryYear && selectedExpiryMonth) {
                params.append("expired", "true");
                params.append("targetYear", selectedExpiryYear.toString());
                params.append("targetMonth", selectedExpiryMonth.toString());
                isFilterActive = true; // Expiry filter is active
                console.log(`Filtering by Expiry: ${selectedExpiryYear}-${selectedExpiryMonth}`);
    
            } else if (currentSearchType === 'search' && query.trim() !== "") {
                // Use a distinct parameter for the search term if your API supports it
                // If API strictly uses search=term, adjust accordingly. Assuming search_term here.
                params.append("search_term", query.trim());
                isFilterActive = true; // Text search filter is active
                console.log(`Filtering by Text Search: "${query.trim()}"`);
    
            } else if (currentSearchType === 'filter' && memberFilter.value) {
                 // Check currentSearchType is 'filter' AND dropdown has a value
                params.append("designation_of_applicant", memberFilter.value);
                isFilterActive = true; // Dropdown filter is active
                console.log(`Filtering by Applicant Type: "${memberFilter.value}"`);
    
            } else {
                // No specific filter type matched or explicitly set to 'all'
                 console.log("No active filters detected based on currentSearchType or inputs.");
                 // isFilterActive remains false
            }
    
            // --- Conditionally Add 'search=true' ---
            // Add it ONLY if any of the above filter conditions were met
            if (isFilterActive) {
                params.append("search", "true");
                console.log("Adding 'search=true' because a filter is active.");
            } else {
                console.log("Not adding 'search=true' as no filter is active (fetching all).");
                // Ensure currentSearchType reflects 'all' if no filter was active
                // This might already be handled correctly by the event listeners setting the type.
                if (currentSearchType !== 'all') {
                     console.warn(`currentSearchType was '${currentSearchType}' but no filter params were added. Treating as 'all'.`);
                     currentSearchType = 'all'; // Correct state if needed
                }
            }
    
    
            // --- Add Sorting Parameters (Independent of filtering) ---
            if (sortColumn) {
                let dbSortColumn = sortColumn;
                // Remap column names if necessary (keep your existing mapping logic)
                if (sortColumn === 'componyName') dbSortColumn = 'componyName';
                else if (sortColumn === 'expired_date') dbSortColumn = 'expired_date';
                else if (sortColumn === 'place_of_birth') dbSortColumn = 'place_of_birth';
                 // Ensure this matches your <th> data-column attribute exactly
                else if (sortColumn === 'Designation_of_Applicant') dbSortColumn = 'designation_of_applicant';
    
                params.append("sort", dbSortColumn);
                params.append("order", sortDirection);
                console.log(`Applying Sort: Column ${dbSortColumn}, Direction ${sortDirection}`);
            }
    
            // --- API Call and Response Handling ---
            const url = `${API_BASE_URL}?${params.toString()}`;
            console.log("API URL:", url);
            console.log("Current Search Type State:", currentSearchType); // Log the state being used
            console.log("All params sent:", Object.fromEntries(params.entries()));
    
            try {
                const response = await fetch(url);
    
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Server error response: ${errorText}`);
                    throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                }
    
                const data = await response.json();
                console.log("API Response:", data);
    
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
    
                displayMembers(membersData); // Ensure displayMembers handles all 'no results' messages correctly
                updatePagination();
                updateSortIcons();
    
            } catch (error) {
                console.error("Error fetching members:", error);
                // *** IMPORTANT: Update colspan to match your table columns (e.g., 17) ***
                memberTableBody.innerHTML = `<tr><td colspan="17" class="no-results">加载失败: ${error.message}</td></tr>`;
    
                membersData = [];
                totalMembers.textContent = 0;
                totalPages = 1;
                updatePagination();
            } finally {
                loader.style.display = "none";
            }
        } // End of fetchMembers

    //===== MODAL FUNCTIONS =====
    /**
     * Opens the Expiry Date selection modal.
     * Pre-fills year/month inputs with current date as default.
     */
    function openExpiryModal() {
        const now = new Date();
        // Set default values in the modal inputs
        expiryYearInput.value = now.getFullYear();
        expiryMonthInput.value = now.getMonth() + 1; // JS months are 0-indexed

        // Display the modal and overlay
        if (expiryModal) expiryModal.style.display = 'block';
        if (modalOverlay) modalOverlay.style.display = 'block';
    }

    /**
     * Closes the Expiry Date selection modal.
     */
    function closeExpiryModal() {
        if (expiryModal) expiryModal.style.display = 'none';
        if (modalOverlay) modalOverlay.style.display = 'none';
    }

    /**
     * Handles the click on the modal's "Confirm" button.
     * Validates input, updates state, closes modal, and triggers member fetch.
     */
    function handleConfirmExpirySearch() {
        const year = parseInt(expiryYearInput.value);
        const month = parseInt(expiryMonthInput.value);

        // --- Input Validation ---
        if (isNaN(year) || year < 1900 || year > 2100) {
            alert('请输入有效的年份 (1900-2100)。');
            expiryYearInput.focus(); // Focus the problematic input
            return; // Stop execution
        }
        if (isNaN(month) || month < 1 || month > 12) {
            alert('请选择有效的月份 (1-12)。');
            expiryMonthInput.focus(); // Focus the problematic input
            return; // Stop execution
        }

        // --- Update State ---
        selectedExpiryYear = year;
        selectedExpiryMonth = month;
        currentSearchType = 'expiredSpecificDate'; // Set the search type
        currentPage = 1; // Reset to page 1 for the new search
        currentFilterValue = ''; // Clear any active dropdown filter
        if (memberFilter) memberFilter.selectedIndex = 0; // Reset dropdown visually
        if (searchInput) searchInput.value = ''; // Clear any text search

        // --- Close Modal & Fetch Data ---
        closeExpiryModal(); // Hide the modal
        console.log(`Confirmed expiry search for: ${year}-${month}`);
        fetchMembers(); // Trigger the API call with new criteria
    }

    // ===== DISPLAY FUNCTIONS =====
    // Display members in the table
    function displayMembers(members) {
        memberTableBody.innerHTML = "";
        
        // Ensure members is an array
        if (!Array.isArray(members)) {
            console.error("Expected members to be an array, got:", members);
            members = [];
        }
        
        if (members.length === 0) {
            let message = '暂无记录';
            if (currentSearchType === 'search') message = '没有找到匹配的记录';
            if (currentSearchType === 'Birthday') message = '本月没有会员生日';
            if (currentSearchType === 'expiredSpecificDate') message = `没有在 ${selectedExpiryYear}-${selectedExpiryMonth} 或之前到期的会员`;
            if (currentSearchType === 'blacklist') message = '没有黑名单会员';
            if (currentFilterValue) message = `没有符合"${currentFilterValue}"条件的会员`;
            
            memberTableBody.innerHTML = `<tr><td colspan="16" class="no-results">${message}</td></tr>`;
            return;
        }
        
        members.forEach(member => {
            // Ensure member is an object
            if (!member || typeof member !== 'object') {
                console.error("Invalid member data:", member);
                return;
            }
            
            // Helper function to format data
            const formatData = (value) => {
                if (value === null || value === undefined || value === 'For...') {
                    return '';
                }
                return String(value || '').replace(/[&<>"']/g, (m) => ({
                    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
                }[m]));
            };
            
            // Get proper field values with fallbacks
            const designation = member['designation_of_applicant'];
            const expiredDate = member['expired_date'];
            const placeOfBirth = member['place_of_birth'];
            const gender = member['gender'];
            const position = member['position'];
            
            // Format functions
            const formatPhone = (phone) => {
                return phone ? String(phone).replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3") : '';
            };
            
            const formatIC = (ic) => {
                if (!ic) return '';
                return String(ic).replace(/(\d{6})(\d{2})(\d{4})/, "$1-$2-$3");
            };
            
            const formatDate = (dateString) => {
                if (!dateString) return '';
                const date = new Date(dateString);
                if (isNaN(date.getTime())) return '';
                
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                
                return `${year}-${month}-${day}`;
            };
            
            const row = document.createElement("tr");
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
                <td>${formatData(member.componyName || member.companyName)}</td>
                <td>${formatData(member.Birthday)}</td>
                <td>${formatDate(expiredDate)}</td>
                <td>${formatData(placeOfBirth)}</td>
                <td>${formatData(position)}</td>
                <td>${formatData(member.others)}</td>
                <td>${formatData(member.remarks)}</td>
                <td>
                    <button class="btn btn-edit" onclick="editMember('${member.ID || member.id || ''}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-delete" onclick="deleteMember('${member.ID || member.id || ''}')">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-check" onclick="checkMember('${member.ID || member.id || ''}')">
                        <i class="fas fa-check"></i>
                    </button>
                </td>
            `;
            memberTableBody.appendChild(row);
        });
    }
    
    // Update pagination controls
    function updatePagination() {
        if (!paginationContainer) return;
        
        const paginationHTML = [];
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                paginationHTML.push(`
                    <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                            onclick="changePage(${i})">
                        ${i}
                    </button>
                `);
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                paginationHTML.push('<span class="pagination-ellipsis">...</span>');
            }
        }
        
        // Page jump
        paginationHTML.push(`
            <div class="pagination-info">
                <span class="page-indicator">${currentPage}/${totalPages}</span>
                <div class="page-jump">
                    <input type="number" 
                           id="pageInput" 
                           min="1" 
                           max="${totalPages}" 
                           placeholder="页码"
                           class="page-input">
                    <button onclick="jumpToPage()" class="jump-btn">跳转</button>
                </div>
            </div>
        `);
        
        paginationContainer.innerHTML = paginationHTML.join('');
        
        // Re-attach event listeners for prev/next buttons
        document.getElementById('prevPage')?.addEventListener('click', () => {
            if (currentPage > 1) changePage(currentPage - 1);
        });
        
        document.getElementById('nextPage')?.addEventListener('click', () => {
            if (currentPage < totalPages) changePage(currentPage + 1);
        });
        
        // Add event listener for page input
        const pageInput = document.getElementById('pageInput');
        if (pageInput) {
            pageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    jumpToPage();
                }
            });
        }
    }
    
    // Update sort icons in table headers
    function updateSortIcons() {
        document.querySelectorAll('th[data-column]').forEach(th => {
            const icon = th.querySelector('i') || document.createElement('i');
            icon.className = 'sort-arrow fas';
            
            if (th.dataset.column === sortColumn) {
                icon.classList.remove('fa-sort');
                icon.classList.add(sortDirection === 'ASC' ? 'fa-sort-up' : 'fa-sort-down');
            } else {
                icon.classList.remove('fa-sort-up', 'fa-sort-down');
                icon.classList.add('fa-sort');
            }
            
            // Add icon if it doesn't exist
            if (!th.querySelector('i')) {
                th.appendChild(icon);
            }
        });
    }
    
    // ===== SORTING FUNCTIONS =====
    // Handle sort column click
    function handleSortClick(columnName) {
        if (sortColumn === columnName) {
            sortDirection = sortDirection === 'ASC' ? 'DESC' : 'ASC';
        } else {
            sortColumn = columnName;
            sortDirection = 'ASC';
        }
        currentPage = 1;
        updateSortIcons();
        fetchMembers(searchInput.value);
    }
    
    // ===== COLUMN RESIZING FUNCTIONS =====
    function initializeResizableColumns() {
        const table = document.getElementById('memberTable');
        if (!table) return;
        const tableHeaders = table.querySelectorAll('thead th');

        tableHeaders.forEach(th => {
            // Ensure the header is one that should be resizable
            if (!th.dataset.column && !th.querySelector('.resizer')) return; 

            const resizer = th.querySelector('.resizer') || document.createElement('div');
            if (!th.querySelector('.resizer')) {
                resizer.className = 'resizer';
                th.appendChild(resizer);
            }

            // Prevent text selection during resize
            resizer.addEventListener('selectstart', (e) => e.preventDefault());

            // Use mousedown on the resizer
            resizer.addEventListener('mousedown', initResize);

            function initResize(e) {
                // Ensure we are resizing the correct header
                const currentTh = e.target.parentElement; 
                if (!currentTh || currentTh.tagName !== 'TH') return;

                // Prevent default to stop text selection etc.
                e.preventDefault();
                e.stopPropagation();

                const startX = e.pageX;
                const startWidth = currentTh.offsetWidth;
                const tableContainer = table.closest('.table-container'); 

                // Add resizing class for styling feedback
                currentTh.classList.add('resizing');
                if (tableContainer) tableContainer.classList.add('resizing');

                // Use document-level event listeners for reliable tracking
                document.addEventListener('mousemove', performResize);
                document.addEventListener('mouseup', stopResize);

                function performResize(moveEvent) {
                    // Calculate new width
                    let newWidth = startWidth + (moveEvent.pageX - startX);
                    const minWidth = 50; 
                    newWidth = Math.max(minWidth, newWidth);
                    currentTh.style.width = `${newWidth}px`; 
                }

                function stopResize() {
                    // Remove event listeners
                    document.removeEventListener('mousemove', performResize);
                    document.removeEventListener('mouseup', stopResize);

                    // Remove resizing class feedback
                    currentTh.classList.remove('resizing');
                    if (tableContainer) tableContainer.classList.remove('resizing');

                    // Save column widths after resizing stops
                    saveColumnWidths();
                }
            }
        });

        // Load saved widths on initialization
        loadColumnWidths();
    }
    
    // Save column widths to localStorage
    function saveColumnWidths() {
        try {
            const widths = {};
            tableHeaders.forEach(header => {
                const column = header.dataset.column;
                if (column) {
                    widths[column] = header.style.width;
                }
            });
            localStorage.setItem('columnWidths', JSON.stringify(widths));
        } catch (error) {
            console.error('Error saving column widths:', error);
        }
    }
    
    // Load column widths from localStorage
    function loadColumnWidths() {
        try {
            const savedWidths = JSON.parse(localStorage.getItem('columnWidths') || '{}');
            
            tableHeaders.forEach(header => {
                const column = header.dataset.column;
                if (savedWidths[column]) {
                    header.style.width = savedWidths[column];
                } else {
                    // Set default widths based on column type
                    setDefaultColumnWidth(header);
                }
            });
        } catch (error) {
            console.error('Error loading column widths:', error);
        }
    }
    
    // Set default column width based on column type
    function setDefaultColumnWidth(header) {
        const column = header.dataset.column;
        switch (column) {
            case 'membersID':
            case 'gender':
                header.style.width = '80px';
                break;
            case 'Name':
            case 'CName':
            case 'email':
                header.style.width = '150px';
                break;
            case 'Address':
            case 'remarks':
                header.style.width = '200px';
                break;
            case 'phone_number':
            case 'IC':
            case 'oldIC':
                header.style.width = '120px';
                break;
            default:
                header.style.width = '200px';
        }
        
        // Set min and max widths
        header.style.minWidth = '50px';
        header.style.maxWidth = '500px';
    }
    
    // Function to reset column widths to default values
    function resetColumnWidths() {
        try {
            // Remove saved column widths from localStorage
            localStorage.removeItem('columnWidths');
            
            // Apply default widths to all table headers
            tableHeaders.forEach(header => {
                setDefaultColumnWidth(header);
            });
            
            console.log('Column widths reset to default values');
        } catch (error) {
            console.error('Error resetting column widths:', error);
        }
    }
    
    // ===== UTILITY FUNCTIONS =====
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
    
    // ===== EVENT LISTENERS =====
    function initializeEventListeners() {
        // Search input
        const debouncedSearch = debounce((searchText) => {
            console.log("Searching for:", searchText); 
            currentPage = 1;
            currentSearchType = 'search';
            selectedExpiryYear = null;
            selectedExpiryMonth = null;
            currentFilterValue = '';
            if (memberFilter) memberFilter.selectedIndex = 0;
            fetchMembers(searchText);
        }, 300); // 300ms delay
        
        searchInput?.addEventListener("input", function() {
            debouncedSearch(this.value.trim());
        });
        
        // Table header sorting
        tableHeaders.forEach(th => {
            if (th.dataset.column) {
                th.addEventListener('click', function() {
                    handleSortClick(th.dataset.column);
                });
            }
        });
        
        // Pagination controls
        prevPageButton?.addEventListener("click", function () {
            if (currentPage > 1) {
                currentPage -= 1;
                fetchMembers(searchInput.value);
            }
        });
        
        nextPageButton?.addEventListener("click", function () {
            if (currentPage < totalPages) {
                currentPage += 1;
                fetchMembers(searchInput.value);
            }
        });
        
        // Filter buttons
        birthdayButton?.addEventListener("click", function() {
            console.log("Birthday button clicked");
            currentPage = 1;
            currentSearchType = 'Birthday';
            currentFilterValue = ''; // Reset filter when changing search type
            selectedExpiryYear = null; // <-- Add reset (already done in fetchMembers, but good practice here too)
            selectedExpiryMonth = null;
            if (memberFilter) memberFilter.selectedIndex = 0; // Reset filter dropdown
            if (searchInput) searchInput.value = '';
            fetchMembers();
        });
        
        listAllMembersButton?.addEventListener("click", function() {
            currentPage = 1;
            currentSearchType = 'all';
            currentFilterValue = ''; // Reset filter when changing search type
            selectedExpiryYear = null; // <-- Add reset (already done in fetchMembers, but good practice here too)
            selectedExpiryMonth = null;
            if (memberFilter) memberFilter.selectedIndex = 0; // Reset filter dropdown
            if (searchInput) searchInput.value = '';
            fetchMembers();
        });

        confirmExpirySearchButton?.addEventListener('click', handleConfirmExpirySearch);
        modalOverlay?.addEventListener('click', closeExpiryModal); 

        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && expiryModal && expiryModal.style.display === 'block') {
                closeExpiryModal();
            }
        });
        
        // Member filter dropdown
        memberFilter?.addEventListener('change', function() {
            currentFilterValue = this.value;
            currentPage = 1;
            currentSearchType = this.value ? 'filter' : 'all'; // Set type based on if a filter is selected
            selectedExpiryYear = null; // <-- Add reset
            selectedExpiryMonth = null; // <-- Add reset
            if (searchInput) searchInput.value = '';
            fetchMembers();
        });
        
        // Items per page change
        itemsPerPageSelect?.addEventListener("change", function () {
            itemsPerPage = parseInt(this.value);
            currentPage = 1; // Reset to first page when changing items per page
            fetchMembers(searchInput?.value || '');
        });
    }
    
    // ===== GLOBAL FUNCTIONS =====
    // These functions need to be accessible from the global scope
    
    // Edit member function
    window.editMember = function(id) {
        if (!id) {
            console.error("Cannot edit member: No ID provided");
            alert("无法编辑：会员ID未提供");
            return;
        }
        window.location.href = `edit_member.html?id=${id}`;
    };
    
    // Delete member function
    window.deleteMember = async function(id) {
        if (!id) {
            console.error("Cannot delete member: No ID provided");
            alert("无法删除：会员ID未提供");
            return;
        }
        
        if (confirm("确定要删除这个会员吗？所有相关记录也将被删除。")) {
            try {
                // First, check if the member has any related records
                const checkResponse = await fetch(`${API_BASE_URL}?table=members&action=checkRelations&ID=${id}`, {
                    method: 'GET'
                });
                
                if (!checkResponse.ok) {
                    const errorText = await checkResponse.text();
                    console.error(`Server error response: ${errorText}`);
                    throw new Error(`Server returned ${checkResponse.status}: ${checkResponse.statusText}`);
                }
                
                const checkData = await checkResponse.json();
                
                if (checkData.hasRelations) {
                    // If member has relations, offer options to the user
                    if (confirm("此会员有关联的参与记录。您想先删除这些关联记录吗？")) {
                        // Delete relations first
                        const deleteRelationsResponse = await fetch(`${API_BASE_URL}?table=participants&action=deleteByMember&memberID=${id}`, {
                            method: 'DELETE'
                        });
                        
                        if (!deleteRelationsResponse.ok) {
                            throw new Error("删除关联记录失败");
                        }
                    } else {
                        alert("操作已取消");
                        return;
                    }
                }
                
                // Now proceed with member deletion
                const response = await fetch(`${API_BASE_URL}?table=members&ID=${id}`, {
                    method: 'DELETE'
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Server error response: ${errorText}`);
                    throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (data.status === 'success') {
                    alert('删除成功！');
                    fetchMembers(searchInput?.value || '');
                } else {
                    alert(data.message || "删除失败");
                }
            } catch (error) {
                console.error("Error deleting member:", error);
                alert(`删除时发生错误: ${error.message}`);
            }
        }
    };

    // Check member details function
    window.checkMember = function(id) {
        if (!id) {
            console.error("Cannot edit member: No ID provided");
            alert("无法查看：会员ID未提供");
            return;
        }
        window.location.href = `check_details.html?id=${id}`;
    };
     
    // Change page function
    window.changePage = function(page) {
        if (page >= 1 && page <= totalPages && page !== currentPage) {
            currentPage = page;
            fetchMembers(searchInput?.value || '');
        }
    };
    
    // Jump to page function
    window.jumpToPage = function() {
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
    };

    // Make resetColumnWidths available globally
    window.resetColumnWidths = resetColumnWidths;
    window.openExpiryModal = openExpiryModal;
    window.closeExpiryModal = closeExpiryModal;
    
    // Initialize the page
    initializePage();
});