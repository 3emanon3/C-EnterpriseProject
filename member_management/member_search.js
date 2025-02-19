document.addEventListener("DOMContentLoaded", function () {
    const API_BASE_URL = 'http://localhost/projects/Enterprise/C-EnterpriseProject/recervingAPI.php';
    
    // State variables
    let members = [];
    let filteredMembers = [];
    let currentPage = 1;
    let currentTable = 'members';
    let sortColumn = 'membersID';
    let sortDirection = 'asc';
    let itemsPerPage = 10;
    let totalPages = 0;
    let currentSearchType = 'normal';
    let isResizing = false;

    // DOM Elements
    const elements = {
        tableBody: document.querySelector("#memberTable tbody"),
        totalMembersSpan: document.getElementById('totalMembers'),
        itemsPerPageSelect: document.getElementById('itemsPerPage'),
        tableHeaders: document.querySelectorAll("#memberTable th[data-column]"),
        paginationContainer: document.querySelector('.pagination'),
        loader: document.querySelector('.loader'),
        searchInput: document.getElementById('searchInput'),
        searchIcon: document.getElementById('searchIcon'),
        searchButton: document.getElementById("searchButton"),
        birthdayButton: document.getElementById("searchBirthday"),
        expiredButton: document.getElementById("searchExpiry"),
        listAllMembersButton: document.getElementById('listAllMembers'),
        table: document.getElementById('memberTable')
    };

    async function handleListAllMembers() {
        showLoader();
        try {
            currentPage = 1; // Reset to first page
            currentSearchType = 'all';
            elements.searchInput.value = ''; // Clear search input


            const params = new URLSearchParams({
                table: currentTable,
                page: currentPage,
                limit: itemsPerPage,
                sort: sortColumn,
                direction: sortDirection,
                listAll: 'true' // New parameter to indicate listing all members
            });
    
            const response = await fetchWithTimeout(`${API_BASE_URL}?${params.toString()}`);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
    
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Received non-JSON response");
            }

            const data = await handleApiResponse(response);
            
            if (data.error) {
                throw new Error(data.error);
            }

            members = data.data || [];
            filteredMembers = [...members];
            totalPages = Math.ceil((data.pagination?.total_records || members.length) / itemsPerPage);
            
            updateTable();
            updatePagination();
            
            showToast('已显示所有会员', 'success');
        } catch (error) {
            console.error('获取会员列表失败', error);
           
        } finally {
            hideLoader();
        }
    }
    
    function showToast(message, type) {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
    
    
    function handleApiResponse(response) {
        if (!response.ok) {
            throw new Error(`HTTP 错误！状态码: ${response.status}`);
        }
        return response.json();
    }
    

    function fetchWithTimeout(url, options = {}, timeout = 5000) {
        return Promise.race([
            fetch(url, options),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timed out')), timeout)
            )
        ]);
    }

    function setupAdditionalEventListeners() {
        elements.listAllMembersButton?.addEventListener('click', handleListAllMembers);
    }

    function handleSearch() {
        const searchTerm = elements.searchInput?.value.trim() || '';
        if (!searchTerm) {
            currentPage = 1;
            currentSearchType = 'all';
            fetchRecords('all');
            return;
        }

        currentPage = 1; // Reset to page 1 when a new search is performed
        currentSearchType = 'search';
        fetchRecords(currentSearchType);
    }

// Improved column resizing functionality
function setupResizableColumns() {
    const table = document.getElementById('memberTable');
    const tableContainer = table.closest('.table-container') || table.parentElement;
    
    // Make sure table has position relative for proper positioning
    if (tableContainer) {
        tableContainer.style.position = 'relative';
        tableContainer.style.overflow = 'auto';
    }
    
    const headers = table.querySelectorAll('th');
    
    // Set initial widths based on content or saved preferences
    headers.forEach(header => {
        // Use saved width or default based on content
        if (!header.style.width) {
            // Provide sensible default widths based on column type
            const column = header.dataset.column || header.textContent.trim();
            let defaultWidth;
            
            // Assign appropriate widths based on column content type
            if (['membersID', 'gender', 'Birthday'].includes(column)) {
                defaultWidth = '80px';  // Narrow columns
            } else if (['Name', 'CName', 'email'].includes(column)) {
                defaultWidth = '120px'; // Medium columns
            } else if (['Address', 'remarks'].includes(column)) {
                defaultWidth = '150px'; // Wide columns
            } else {
                defaultWidth = '100px'; // Default
            }
            
            header.style.width = defaultWidth;
        }
        
        // Set min-width to prevent columns from collapsing too small
        header.style.minWidth = '50px';
    });
    
    // Add visual resizer elements to each header
    headers.forEach(header => {
        // Remove any existing resizers to avoid duplicates
        const existingResizer = header.querySelector('.column-resizer');
        if (existingResizer) {
            existingResizer.remove();
        }
        
        // Create and style the resizer element
        const resizer = document.createElement('div');
        resizer.classList.add('column-resizer');
        resizer.style.position = 'absolute';
        resizer.style.top = '0';
        resizer.style.left = '0';
        resizer.style.width = '5px';
        resizer.style.height = '100%';
        resizer.style.cursor = 'col-resize';
        resizer.style.zIndex = '1';
        resizer.style.backgroundColor = 'transparent';
        
        // Add hover effect
        resizer.addEventListener('mouseover', () => {
            resizer.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
        });
        
        resizer.addEventListener('mouseout', () => {
            if (!resizer.classList.contains('resizing')) {
                resizer.style.backgroundColor = 'transparent';
            }
        });
        
        // Make sure header has position relative for proper positioning of resizer
        header.style.position = 'relative';
        header.appendChild(resizer);
        
        let startX, startWidth;
        
        function startResize(e) {
            startX = e.pageX;
            startWidth = header.offsetWidth;
            
            // Add visual indicator during resize
            resizer.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
            resizer.classList.add('resizing');
            if (tableContainer) {
                tableContainer.classList.add('resizing');
                tableContainer.style.cursor = 'col-resize';
                tableContainer.style.userSelect = 'none';
            }
            
            // Add ghost indicator to show where column will resize to
            const ghostIndicator = document.createElement('div');
            ghostIndicator.id = 'ghost-resize-indicator';
            ghostIndicator.style.position = 'absolute';
            ghostIndicator.style.top = '0';
            ghostIndicator.style.width = '1px';
            ghostIndicator.style.height = table.offsetHeight + 'px';
            ghostIndicator.style.backgroundColor = '#007bff';
            ghostIndicator.style.zIndex = '100';
            ghostIndicator.style.left = (header.getBoundingClientRect().right - tableContainer.getBoundingClientRect().left) + 'px';
            tableContainer.appendChild(ghostIndicator);
            
            function resize(e) {
                const width = startWidth + (e.pageX - startX);
                if (width > 50) { // Minimum width constraint
                    // Update ghost indicator position
                    const indicator = document.getElementById('ghost-resize-indicator');
                    if (indicator) {
                        indicator.style.left = (header.getBoundingClientRect().left - tableContainer.getBoundingClientRect().left + width) + 'px';
                    }
                }
            }
            
            function stopResize() {
                // Apply the actual resize
                const width = startWidth + (e.pageX - startX);
                if (width > 50) {
                    header.style.width = `${width}px`;
                }
                
                // Remove ghost indicator
                const indicator = document.getElementById('ghost-resize-indicator');
                if (indicator) {
                    indicator.remove();
                }
                
                // Reset styles
                resizer.classList.remove('resizing');
                resizer.style.backgroundColor = 'transparent';
                if (tableContainer) {
                    tableContainer.classList.remove('resizing');
                    tableContainer.style.cursor = '';
                    tableContainer.style.userSelect = '';
                }
                
                // Remove listeners
                document.removeEventListener('mousemove', resize);
                document.removeEventListener('mouseup', stopResize);
                
                // Save column widths
                saveColumnWidths();
            }
            
            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', stopResize);
            e.preventDefault(); // Prevent text selection
        }
        
        resizer.addEventListener('mousedown', startResize);
    });
}

// Save column widths to localStorage
function saveColumnWidths() {
    const headers = document.querySelectorAll('#memberTable th');
    const widths = Array.from(headers).map(header => header.style.width);
    localStorage.setItem('columnWidths', JSON.stringify(widths));
    
    // Also save column names to handle table structure changes
    const columnNames = Array.from(headers).map(header => header.dataset.column || header.textContent.trim());
    localStorage.setItem('columnNames', JSON.stringify(columnNames));
}

// Load saved column widths with version checking
function loadColumnWidths() {
    const savedWidths = localStorage.getItem('columnWidths');
    const savedColumnNames = localStorage.getItem('columnNames');
    
    if (savedWidths && savedColumnNames) {
        const widths = JSON.parse(savedWidths);
        const columnNames = JSON.parse(savedColumnNames);
        const currentHeaders = document.querySelectorAll('#memberTable th');
        
        // Only apply saved widths if column structure matches
        if (currentHeaders.length === columnNames.length) {
            currentHeaders.forEach((header, index) => {
                const currentName = header.dataset.column || header.textContent.trim();
                // Only apply width if column name matches
                if (currentName === columnNames[index] && widths[index]) {
                    header.style.width = widths[index];
                }
            });
        } else {
            // Column structure changed, clear saved widths
            localStorage.removeItem('columnWidths');
            localStorage.removeItem('columnNames');
        }
    }
}



    // Initialize the application
    async function initialize() {
        try {
            setupEventListeners();
            setupResizableColumns(); // Add this line
            loadColumnWidths();      // Add this line
            await fetchRecords('normal');
            setupSorting();
            updatePagination();
        } catch (error) {
            console.error('Initialization error:', error);
            showError('Failed to initialize the application');
        }
    }


    
    // Event Listeners Setup
    function setupEventListeners() {
        // Search input events
        elements.searchInput?.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            } else if (elements.searchInput.value.trim() === '') {
                // When search is cleared, list all members
                currentPage = 1;
                currentSearchType = 'all';
                fetchRecords('all');
            }
        });

        elements.searchButton?.addEventListener("click", handleSearch);

    elements.birthdayButton?.addEventListener('click', () => {
        handleDateSearch('Birthday');
    });
    
    elements.expiredButton?.addEventListener('click', () => {
        handleDateSearch('expired date');
    });
    

        // Items per page change
        elements.itemsPerPageSelect?.addEventListener('change', (e) => {
            itemsPerPage = parseInt(e.target.value);
            currentPage = 1;
            fetchRecords();
        });

        // Date search events
        elements.searchBirthday?.addEventListener('click', () => {
            handleDateSearch('Birthday');
        });

        elements.searchExpiry?.addEventListener('click', () => {
            handleDateSearch('expired date');
        });

        setupAdditionalEventListeners();
    }

    // Handle date search functionality
    async function handleDateSearch(dateType) {
        currentPage = 1;
        showLoader();
    
        try {
            const params = new URLSearchParams({
                table: currentTable,
                page: currentPage,
                limit: itemsPerPage,
                sort: sortColumn,
                direction: sortDirection
            });
    
            if (dateType === 'Birthday') {
                params.append('Birthday', new Date().getMonth() + 1); // Only send the month
            } else if (dateType === 'expired date') {
                params.append('expired', 'true');
            }
    
            const response = await fetch(`${API_BASE_URL}?${params.toString()}`);

if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
}

const contentType = response.headers.get("content-type");
if (!contentType || !contentType.includes("application/json")) {
    throw new Error("Received non-JSON response");
}

const data = await response.json(); 

            if (data.error) throw new Error(data.error);
    
            members = data.data || [];
            filteredMembers = [...members];
            totalPages = Math.ceil((data.pagination?.total_records || members.length) / itemsPerPage);
    
            if (elements.totalMembersSpan) {
                elements.totalMembersSpan.textContent = data.pagination?.total_records || members.length;
            }
    
            updateTable();
            updatePagination();
    
            if (filteredMembers.length === 0) {
                elements.tableBody.innerHTML = "<tr><td colspan='16' class='no-results'>本月没有会员生日</td></tr>";

            }
        } catch (error) {
            console.error('Search error:', error);
            showError(`搜索失败: ${error.message}`);
        } finally {
            hideLoader();
        }
    }
    
    // Modified fetchRecords function to include date parameters
    async function fetchRecords(type ='normal') {
        showLoader();
        try {
            const searchTerm = elements.searchInput?.value.trim() || '';
            const params = new URLSearchParams({
                table: currentTable,
                page: currentPage,
                limit: itemsPerPage,
                sort: sortColumn,
                order: sortDirection
            });
            
            // Add specific parameters based on request type
            switch(type) {
                case 'search':
                    params.append('search', elements.searchInput?.value.trim() || '');
                    break;
                    case 'Birthday':
                        const currentMonth = new Date().getMonth() + 1; // Get current month (1-12)
                        params.append('Birthday', currentMonth);
                        break;
                    
                case 'expired':
                    params.append('expired', 'true');
                    break;
                    case 'all':
                        params.append('listAll', 'true');
                        break;
            }

            const response = await fetch(`${API_BASE_URL}?${params.toString()}`);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Received non-JSON response");
            }
            
            const data = await response.json(); // ✅ Now it's safe to parse JSON
            
            if (data.error) throw new Error(data.error);
    
            members = data.data || [];
            console.log(members);
            filteredMembers = [...members];
            totalPages = Math.ceil((data.pagination?.total_records || members.length) / itemsPerPage);
            
            if (elements.totalMembersSpan) {
                elements.totalMembersSpan.textContent = data.pagination?.total_records || members.length;
            }
    
            updateTable();
            updatePagination();
            updateSortIndicators();
            

             // Show appropriate message based on request type
             if (members.length === 0) {
                let message = '暂无记录';
                if (type === 'Birthday') message = '本月没有会员生日';
                if (type === 'expired') message = '本月没有会员需要续期';
                elements.tableBody.innerHTML = "<tr><td colspan='16' class='no-results'>" + message + "</td></tr>";

            }

        } catch (error) {
            console.error('Fetch error:', error);
            showError(`Failed to load records: ${error.message}`);
        } finally {
            hideLoader();
        }
    }

    // Handle sort column click
    function handleSort(column) {
        if (sortColumn === column) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortColumn = column;
            sortDirection = 'asc';
        }
        fetchRecords();
    }

    // Setup sorting functionality
    function setupSorting() {
        elements.tableHeaders?.forEach(header => {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                handleSort(header.dataset.column);
            });
        });
    }

    // Update sort indicators Error
    function updateSortIndicators() {
        elements.tableHeaders?.forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
            const existingArrow = header.querySelector('.sort-arrow');
            if (existingArrow) existingArrow.remove();
            
            if (header.dataset.column === sortColumn) {
                header.classList.add(`sort-${sortDirection}`);
                const arrow = document.createElement('span');
                arrow.className = 'sort-arrow';
                arrow.textContent = sortDirection === 'asc' ? ' ↑' : ' ↓';
                header.appendChild(arrow);
            }
        });
    }

    // Update table with current data
    function updateTable() {
        if (!elements.tableBody) return;
        
        sortRecords();
        
        elements.tableBody.innerHTML = filteredMembers.length ? filteredMembers.map(member => `
            <tr>
                <td>${escapeHtml(member.membersID)}</td>
                <td>${escapeHtml(member.Name)}</td>
                <td>${escapeHtml(member.CName)}</td>
                <td>${escapeHtml(member['Designation of Applicant'])}</td>
                <td>${escapeHtml(member.Address)}</td>
                <td>${formatPhone(member.phone_number)}</td>
                <td>${escapeHtml(member.email)}</td>
                <td>${formatIC(member.IC)}</td>
                <td>${formatIC(member.oldIC)}</td>
                <td>${escapeHtml(member.gender)}</td>
                <td>${escapeHtml(member.componyName)}</td>
                <td>${escapeHtml(member.Birthday)}</td>
                <td>${formatDate(member['expired date'])}</td>
                <td>${escapeHtml(member['place of birth'])}</td>
                <td>${escapeHtml(member.remarks)}</td>
                <td>
                    <button class="btn btn-edit" onclick="editMember(${member.membersID})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-delete" onclick="deleteMember(${member.membersID})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('') : '<tr><td colspan="16" class="no-results">暂无记录</td></tr>';
    }

    function sortRecords() {
        filteredMembers.sort((a, b) => {
            if (a[sortColumn] < b[sortColumn]) return sortDirection === 'asc' ? -1 : 1;
            if (a[sortColumn] > b[sortColumn]) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }
    

    // Update pagination controls
    function updatePagination() {
        if (!elements.paginationContainer) return;

        const paginationHTML = [];
        
        paginationHTML.push(`
            <button class="pagination-btn" 
                    ${currentPage === 1 ? 'disabled' : ''} 
                    onclick="changePage(${currentPage - 1})">
                上一页
            </button>
        `);

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

        paginationHTML.push(`
            <button class="pagination-btn" 
                    ${currentPage === totalPages ? 'disabled' : ''} 
                    onclick="changePage(${currentPage + 1})">
                下一页
            </button>
        `);

        elements.paginationContainer.innerHTML = paginationHTML.join('');
    }

    // Utility functions
    function formatPhone(phone) {
        return phone ? String(phone).replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3") : '';
    }

    function formatIC(ic) {
        if (!ic) return '';
        return String(ic).replace(/(\d{6})(\d{2})(\d{4})/, "$1-$2-$3");
    }

    function formatDate(dateString) {
        return dateString ? new Date(dateString).toISOString().split('T')[0] : '';
    }

    function escapeHtml(unsafe) {
        return String(unsafe || '').replace(/[&<>"']/g, (m) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m]));
    }

    function showLoader() {
        if (elements.loader) {
            elements.loader.style.display = 'flex';
        }
    }

    function hideLoader() {
        if (elements.loader) {
            elements.loader.style.display = 'none';
        }
    }

    function showError(message) {
        alert(message);
    }

    // Global functions for pagination and member actions
    window.changePage = function(page) {
        if (page >= 1 && page <= totalPages && page !== currentPage) {
            currentPage = page;
            fetchRecords(currentSearchType);
        }
    };

    window.editMember = function(membersID) {
        window.location.href = `edit_member.html?id=${membersID}`;

    };
    

    window.deleteMember = function(membersID) {
        if (confirm('确定要删除这个会员吗？')) {
            fetch(`${API_BASE_URL}?action=delete&id=${membersID}`, { 
                method: 'DELETE' 
            })
            .then(response => response.json())
            .then(result => {
                if (result.status === 'success') {
                    alert('删除成功！');
                    fetchRecords();
                } else {
                    showError(result.message || '删除失败');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showError('删除时发生错误');
            });
        }
    };

    // Start the application
    initialize();
});