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

  // Initialize resizable columns
  function initializeResizableColumns() {
    const headers = elements.tableHeaders;
    
    // Set initial column widths
    function initializeColumnWidths() {
        try {
            const savedWidths = JSON.parse(localStorage.getItem('columnWidths') || '{}');
            
            headers.forEach(header => {
                const column = header.dataset.column;
                if (savedWidths[column]) {
                    header.style.width = savedWidths[column];
                } else {
                    // Set default widths based on column type
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
                            header.style.width = '100px';
                    }
                }
            });
        } catch (error) {
            console.error('Error initializing column widths:', error);
            // Set default widths if there's an error
            headers.forEach(header => header.style.width = '100px');
        }
    }

    // Save column widths
    function saveColumnWidths() {
        try {
            const widths = {};
            headers.forEach(header => {
                widths[header.dataset.column] = header.style.width;
            });
            localStorage.setItem('columnWidths', JSON.stringify(widths));
        } catch (error) {
            console.error('Error saving column widths:', error);
        }
    }

    // Add resizers to headers
    headers.forEach(header => {
        // Create resizer element if it doesn't exist
        let resizer = header.querySelector('.resizer');
        if (!resizer) {
            resizer = document.createElement('div');
            resizer.className = 'resizer';
            header.appendChild(resizer);
        }

        let startX, startWidth;

        resizer.addEventListener('mousedown', function(e) {
            startX = e.pageX;
            startWidth = header.offsetWidth;
            isResizing = true;
            
            const tableContainer = elements.table.closest('.table-container');
            if (tableContainer) {
                tableContainer.classList.add('resizing');
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            e.preventDefault();
        });

        function onMouseMove(e) {
            if (!isResizing) return;
            
            const width = startWidth + (e.pageX - startX);
            if (width >= 50) { // Minimum width
                header.style.width = `${width}px`;
            }
        }

        function onMouseUp() {
            isResizing = false;
            const tableContainer = elements.table.closest('.table-container');
            if (tableContainer) {
                tableContainer.classList.remove('resizing');
            }
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            saveColumnWidths();
        }
    });

    // Initialize widths
    initializeColumnWidths();
}



function initializeTableScrollControls() {
    const tableContainer = document.querySelector('.table-container');
    if (!tableContainer) {
        console.error('Table container not found');
        return;
    }
    
    // Create scroll controls
    const scrollControlsContainer = document.createElement('div');
    scrollControlsContainer.className = 'scroll-controls-container';
    scrollControlsContainer.innerHTML = `
        <div class="scroll-track">
            <div class="scroll-thumb"></div>
        </div>
        <div class="scroll-indicator">
            <span class="scroll-position-text">0%</span>
        </div>
    `;
    
    // Insert controls before table container
    tableContainer.parentNode.insertBefore(scrollControlsContainer, tableContainer);
    
    // Get control elements
    const scrollTrack = scrollControlsContainer.querySelector('.scroll-track');
    const scrollThumb = scrollControlsContainer.querySelector('.scroll-thumb');
    const scrollPositionText = scrollControlsContainer.querySelector('.scroll-position-text');
    
    if (!scrollThumb || !scrollTrack || !scrollPositionText) {
        console.error('Scroll control elements not found');
        return;
    }
    
    // Update scroll position indicator
    function updateScrollPosition() {
        const scrollWidth = tableContainer.scrollWidth - tableContainer.clientWidth;
        if (scrollWidth <= 0) {
            scrollThumb.style.width = '100%';
            scrollThumb.style.left = '0';
            scrollPositionText.textContent = '0%';
            scrollControlsContainer.classList.add('hidden');
            return;
        }
        
        scrollControlsContainer.classList.remove('hidden');
        const scrollPercent = (tableContainer.scrollLeft / scrollWidth) * 100;
        const thumbWidth = Math.max((tableContainer.clientWidth / tableContainer.scrollWidth) * 100, 10);
        
        // Update thumb position and width
        scrollThumb.style.width = `${thumbWidth}%`;
        scrollThumb.style.left = `${scrollPercent * (100 - thumbWidth) / 100}%`;
        
        // Update scroll percentage text
        scrollPositionText.textContent = `${Math.round(scrollPercent)}%`;
    }
    
    // Track click - Jump to position
    scrollTrack.addEventListener('click', (e) => {
        // Ignore if clicked on thumb
        if (e.target === scrollThumb) return;
        
        const trackRect = scrollTrack.getBoundingClientRect();
        const clickPosition = (e.clientX - trackRect.left) / trackRect.width;
        
        // Calculate scroll position
        const scrollWidth = tableContainer.scrollWidth - tableContainer.clientWidth;
        const newScrollLeft = scrollWidth * clickPosition;
        
        // Smooth scroll to position
        tableContainer.scrollTo({
            left: newScrollLeft,
            behavior: 'smooth'
        });
    });
    
    // Thumb drag functionality
    let isDragging = false;
    let startX, startScrollLeft;
    
    scrollThumb.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startScrollLeft = tableContainer.scrollLeft;
        scrollThumb.classList.add('dragging');
        document.body.style.cursor = 'grabbing';
        
        // Prevent text selection during drag
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const trackRect = scrollTrack.getBoundingClientRect();
        const scrollWidth = tableContainer.scrollWidth - tableContainer.clientWidth;
        
        // Calculate movement ratio
        const dx = e.clientX - startX;
        const moveRatio = dx / trackRect.width;
        
        // Apply scroll
        tableContainer.scrollLeft = startScrollLeft + (moveRatio * scrollWidth);
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            scrollThumb.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
    
    // Add mousewheel horizontal scrolling with shift key
    tableContainer.addEventListener('wheel', (e) => {
        if (e.shiftKey) {
            e.preventDefault();
            tableContainer.scrollLeft += e.deltaY;
        }
    });
    
    // Add keyboard support with table focus check
    document.addEventListener('keydown', (e) => {
        if (document.activeElement.tagName === 'INPUT') return;
        
        // Check if table is in viewport
        const rect = tableContainer.getBoundingClientRect();
        const isInViewport = rect.top >= 0 &&
                           rect.left >= 0 &&
                           rect.bottom <= window.innerHeight &&
                           rect.right <= window.innerWidth;
        
        if (!isInViewport) return;
        
        if (e.key === 'ArrowLeft') {
            tableContainer.scrollBy({
                left: -50,
                behavior: 'smooth'
            });
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            tableContainer.scrollBy({
                left: 50,
                behavior: 'smooth'
            });
            e.preventDefault();
        }
    });
    
    // Track scroll events with debounce
    let scrollTimeout;
    tableContainer.addEventListener('scroll', () => {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(updateScrollPosition, 10);
    });
    
    // Handle window resize with debounce
    let resizeTimeout;
    window.addEventListener('resize', () => {
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(updateScrollPosition, 100);
    });
    
    // Initialize position
    updateScrollPosition();

    // Add horizontal touch scroll support
    let touchStartX = 0;
    let touchScrollLeft = 0;

    tableContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchScrollLeft = tableContainer.scrollLeft;
        // Prevent page scroll while in table
        e.preventDefault();
    }, { passive: false });

    tableContainer.addEventListener('touchmove', (e) => {
        const dx = touchStartX - e.touches[0].clientX;
        tableContainer.scrollLeft = touchScrollLeft + dx;
        e.preventDefault();
    }, { passive: false });
}

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
            initializeResizableColumns(); 
            initializeTableScrollControls();// Add this line
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
                <td>${escapeHtml(member['designation of applicant'])}</td>
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
                    <button class="btn btn-edit" onclick="editMember(${member.ID})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-delete" onclick="deleteMember(${member.ID})">
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
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return ''; // Return empty string for invalid dates
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Add leading zero if needed
        const day = String(date.getDate()).padStart(2, '0'); // Add leading zero if needed
        
        return `${year}-${month}-${day}`;
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

    window.editMember = function(ID) {
        window.location.href = `edit_member.html?id=${ID}`;

    };
    

    window.deleteMember = function(ID) {
        if (confirm('确定要删除这个会员吗？')) {
            fetch(`${API_BASE_URL}?table=members&ID=${ID}`, { 
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