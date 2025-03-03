

document.addEventListener("DOMContentLoaded", function () {
    const API_BASE_URL = 'http://localhost/projects/C-EnterpriseProject/recervingAPI.php';
    
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

    // State variables
    let members = [];//Stores all member records fetched from the API.
    let filteredMembers = [];//Stores the filtered subset of members (used for display).
    let currentPage = 1;//Tracks the current page for pagination (default: 1).
    let currentTable = 'members';//Specifies the table being managed (default: 'members').
    let sortColumn = 'membersID';//Tracks the column currently being sorted (default: 'membersID').
    let sortDirection = 'asc';//Tracks the sort direction ('asc' or 'desc', default: 'asc').
    let itemsPerPage = 10;//Number of items displayed per page (default: 10).
    let totalPages = 0;//Total number of pages for pagination.
    let currentSearchType = 'normal';//Tracks the type of search ('normal', 'search', 'Birthday', 'expired', or 'all').
    let isResizing = false;//Boolean flag to track if a column is being resized.

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
        currentPage = 1;

        if (!searchTerm) {
          
            currentSearchType = 'all';
            fetchRecords('all');
            return;
        }

       
        currentSearchType = 'search';
        fetchRecords('search');
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
          initializeTableScrollControls();
          loadColumnWidths();
          
          // Process URL parameters
          const urlParams = new URLSearchParams(window.location.search);
          processUrlParameters(urlParams);
          
          // Start with clean state
          resetState();
          
          // Fetch initial data
          await fetchRecords(currentSearchType);
          
          // Post-fetch processing
          processPostFetch();
          
          console.log('Application initialized successfully');
        } catch (error) {
          console.error('Initialization error:', error);
          showError('Failed to initialize the application');
        }
      }
      
      // Helper functions for better organization
      function processUrlParameters(urlParams) {
        const updateStatus = urlParams.get('update');
        const addStatus = urlParams.get('add');
        const newMemberId = urlParams.get('id');
        
        if (updateStatus === 'success') {
          window.history.replaceState({}, '', 'member_search.html');
          showToast('会员信息已更新', 'success');
        }
        
        if (addStatus === 'success') {
          showToast('新会员添加成功', 'success');
          if (newMemberId) {
            window.newlyAddedMemberId = newMemberId;
          }
        }
      }
      
      function resetState() {
        currentPage = 1;
        if (elements.searchInput) elements.searchInput.value = '';
        currentSearchType = 'all';
      }
      
      function processPostFetch() {
        setupSorting();
        updatePagination();
        
        if (window.newlyAddedMemberId) {
          highlightNewMember(window.newlyAddedMemberId);
          delete window.newlyAddedMemberId;
        }
      }

// Add debounce functionality to prevent excessive API calls
function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
  
  // Apply debounce to search input
  elements.searchInput?.addEventListener('keyup', debounce((e) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (elements.searchInput.value.trim() === '') {
      currentPage = 1;
      currentSearchType = 'all';
      fetchRecords('all');
    }
  }, 300));

    function highlightNewMember(memberId) {
        const rows = document.querySelectorAll('#memberTable tbody tr');
        rows.forEach(row => {
            const idCell = row.cells[0]; // Assuming ID is in the first column
            if (idCell && idCell.textContent === memberId) {
                row.classList.add('highlight-new');
                // Scroll to the row
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Remove highlight after a few seconds
                setTimeout(() => {
                    row.classList.remove('highlight-new');
                }, 5000);
            }
        });
    }
    

    function setupSearchEventListeners() {

        // Search input events with debounce
        elements.searchInput?.addEventListener('keyup', debounce((e) => {
            const searchTerm = elements.searchInput.value.trim().toLowerCase();
            
            // Filter the existing members array
            if (searchTerm) {
              filterMembersLocally(searchTerm);
            } else {
              // If search is empty, restore all members
              filteredMembers = [...members];
              updateTable();
              updatePagination();
            }
            
            // Only fetch from server on Enter key
            if (e.key === 'Enter') {
                handleSearch();
            } else if (elements.searchInput.value.trim() === '') {
                // If search is cleared, reset to showing all
                currentPage = 1;
                currentSearchType = 'all';
                fetchRecords('all');
            }
        }, 300));
    
        // Search button click
        elements.searchButton?.addEventListener("click", handleSearch);
    
        // Clear search button (if you want to add one)
        document.getElementById('clearSearch')?.addEventListener('click', () => {
            if (elements.searchInput) {
                elements.searchInput.value = '';
                currentPage = 1;
                currentSearchType = 'all';
                fetchRecords('all');
            }
        });
        elements.searchIcon?.addEventListener('click', handleSearch);
    }

    function filterMembersLocally(searchTerm) {
        searchTerm = searchTerm.toLowerCase();
        
        filteredMembers = members.filter(member => {
          // Check name fields (prioritize these for your search)
          const nameMatch = 
            (member.Name && member.Name.toLowerCase().includes(searchTerm)) || 
            (member.CName && member.CName.toLowerCase().includes(searchTerm));
          
          // If you want to search in other fields as well
          const otherFieldsMatch = 
            (member.membersID && member.membersID.toString().includes(searchTerm)) ||
            (member.phone_number && member.phone_number.toString().includes(searchTerm)) ||
            (member.email && member.email.toLowerCase().includes(searchTerm)) ||
            (member.componyName && member.componyName.toLowerCase().includes(searchTerm)) ||
            (member.companyName && member.companyName.toLowerCase().includes(searchTerm));
          
          return nameMatch || otherFieldsMatch;
        });
        
        totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
        currentPage = 1; // Reset to first page when filtering
        
        updateTable();
        updatePagination();
        
        if (elements.totalMembersSpan) {
          elements.totalMembersSpan.textContent = filteredMembers.length;
        }
      }

    // Event Listeners Setup
    function setupEventListeners() {
        setupSearchEventListeners();
       

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

 
        document.getElementById('prevPage')?.addEventListener('click', () => {
            if (currentPage > 1) changePage(currentPage - 1);
        });
        
        document.getElementById('nextPage')?.addEventListener('click', () => {
            if (currentPage < totalPages) changePage(currentPage + 1);
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
    
    const apiCache = {
        data: {},
        set(key, data, ttl = 60000) { // 1 minute TTL by default
          this.data[key] = {
            timestamp: Date.now(),
            ttl,
            value: data
          };
        },
        get(key) {
          const item = this.data[key];
          if (!item) return null;
          
          if (Date.now() - item.timestamp > item.ttl) {
            delete this.data[key];
            return null;
          }
          
          return item.value;
        }
      };

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
                direction: sortDirection 
            });
            
            // Add specific parameters based on request type
            switch(type) {
                case 'search':
                    if (searchTerm) {
                        params.append('search', searchTerm);
                        // Make sure all relevant fields are included for search
                        params.append('searchFields','membersID,Name,CName,Address,phone_number,email,gender,IC,oldIC,componyName,companyName,remarks');
                        params.append('search_all', 'true'); // N
                    }
                    break;

                case 'Birthday':   
                    params.append('Birthday', new Date().getMonth() + 1);
                        break;
                    
                case 'expired':
                    params.append('expired', 'true');
                    break;

                 case 'all':
                        params.append('listAll', 'true');
                        break;
            }

           

            console.log('Fetching records with params:', params.toString());
            const response = await fetch(`${API_BASE_URL}?${params.toString()}`);
            console.log('Response status:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Received non-JSON response");
            }
            
            const data = await response.json();
           
            handleApiData(data);
            
             // Show appropriate message based on request type
             if (members.length === 0) {
                let message = '暂无记录';
                if (type === 'search') message = '没有找到匹配的记录';
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

    function handleApiData(data) {
        if (data.error) throw new Error(data.error);
        
        members = data.data || [];
        filteredMembers = [...members];
       
        totalPages = Math.ceil((data.pagination?.total_records || members.length) / itemsPerPage);
        
        if (elements.totalMembersSpan) {
          elements.totalMembersSpan.textContent = data.pagination?.total_records || members.length;
        }
        
        updateTable();
        updatePagination();
        updateSortIndicators();
      }
    // Handle sort column click
    function handleSort(column) {
        // Normalize column name to handle case inconsistency
        const normalizedColumn = column.toLowerCase();
        if (sortColumn.toLowerCase() === normalizedColumn) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortColumn = column;
            sortDirection = 'asc';
        }
        fetchRecords(currentSearchType);
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
        
        console.log("Table updated with", filteredMembers.length, "records");
        if (filteredMembers.length > 0) {
            
            console.log("Sample record structure:", filteredMembers[0]);

            console.log("Full member data:", JSON.stringify(filteredMembers[0], null, 2));
            console.log("Gender value:", filteredMembers[0]['gender'], 
                                        filteredMembers[0]['Gender'], 
                                        filteredMembers[0]['sex'], 
                                        filteredMembers[0]['Sex']);
        }
      

        sortRecords();
        
        elements.tableBody.innerHTML = filteredMembers.length ? filteredMembers.map(member => {
            // Properly handle empty or null values
            const formatTableData = (value) => {
                if (value === null || value === undefined || value === 'For...') {
                    return '';
                }
                return escapeHtml(value);
            };
    
            // Handle designation display
          
            const designation = member['designation of applicant'] ||
                                member['Designation of Applicant']||
                                member['designation_of_applicant'];;
            const designationDisplay = designation === '3' ? '外国人' :
                                     designation === '2' ? '非会员' :
                                     designation === '1' ? '会员' :
                                     designation === '4' ? '拒绝继续' :
                                     formatTableData(designation);
    
            const expiredDate = member['expired date'] || 
                                member['expired_date'] || 
                                member['expiredDate'] || 
                                member['expireddate'];
                                     
           const placeOfBirth = member['place of birth'] || 
                                member['place_of_birth'] || 
                                member['placeOfBirth'] || 
                                member['placeofbirth'];

            const gender = member['gender'] ||
               member['Gender'] ||
               member['sex'] ||
               member['Sex'];

            return `
                <tr>
                    <td>${formatTableData(member.membersID)}</td>
                    <td>${formatTableData(member.Name)}</td>
                    <td>${formatTableData(member.CName)}</td>
                    <td>${designationDisplay}</td>
                    <td>${formatTableData(member.Address)}</td>
                    <td>${formatPhone(member.phone_number)}</td>
                    <td>${formatTableData(member.email)}</td>
                    <td>${formatIC(member.IC)}</td>
                    <td>${formatIC(member.oldIC)}</td>
                    <td>${formatTableData(gender)}</td>
                    <td>${formatTableData(member.componyName || member.companyName)}</td>
                    <td>${formatTableData(member.Birthday)}</td>
                    <td>${formatDate(expiredDate)}</td>
                    <td>${formatTableData(placeOfBirth)}</td>
                    <td>${formatTableData(member.remarks)}</td>
                    <td>
                        <button class="btn btn-edit" onclick="editMember('${member.ID}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-delete" onclick="deleteMember('${member.ID}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('') : '<tr><td colspan="16" class="no-results">暂无记录</td></tr>';
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

        elements.paginationContainer.innerHTML = paginationHTML.join('');

        const pageInput = document.getElementById('pageInput');
        if (pageInput) {
            pageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    jumpToPage();
                }
            });
        }
    }
    
    // Add jump to page function
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

    

    // Start the application
    initialize();
});