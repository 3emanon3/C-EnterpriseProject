document.addEventListener("DOMContentLoaded", function () {
    // Configuration
    const API_BASE_URL = 'http://localhost/projects/Enterprise/C-EnterpriseProject/recervingAPI.php';
    
    // State management
    let currentPage = 1;
    let currentTable = 'members';
    let allRecords = [];
    let sortColumn = 'ID';
    let sortDirection = 'asc';
    let itemsPerPage = 10;
    let currentMode = 'all'; // 'all', 'birthdays', or 'search'

    // DOM Elements
    const elements = {
        searchInput: document.getElementById("searchInput"),
        searchButton: document.getElementById("searchButton"),
        tableBody: document.querySelector("#memberTable tbody"),
        totalRecordsSpan: document.getElementById("totalMembers"),
        itemsPerPageSelect: document.getElementById("itemsPerPage"),
        tableHeaders: document.querySelectorAll("#memberTable th[data-column]"),
        paginationContainer: document.querySelector(".pagination"),
        tableSelect: document.getElementById("tableSelect")
    };

    // Add navigation buttons
    const systemNav = document.querySelector('.system-nav');
    if (systemNav) {
        systemNav.insertAdjacentHTML('beforeend', `
            <button id="fetchAllButton" class="btn btn-info">
                <i class="fas fa-sync"></i> 所有记录
            </button>
            <button id="fetchBirthdaysButton" class="btn btn-warning">
                <i class="fas fa-birthday-cake"></i> 本月生日
            </button>
        `);
    }

    // Main fetch function
    async function fetchRecords(searchTerm = '') {
        showLoader();
        try {
            const params = new URLSearchParams({
                table: currentTable,
                page: currentPage,
                limit: elements.itemsPerPageSelect?.value || itemsPerPage
            });

            if (searchTerm) {
                params.set('search', String(searchTerm).trim());
            }

            if (currentMode === 'Birthdays') {
                params.set('Birthdays', 'true');
            }

            const response = await fetch(`${API_BASE_URL}?${params.toString()}`);
            console.log('Fetching URL:', `${API_BASE_URL}?${params.toString()}`); // Debug log
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseData = await response.json();
            console.log('Response data:', responseData); // Debug log
            
            if (responseData.error) {
                throw new Error(responseData.error);
            }

            allRecords = responseData.data || [];
            if (elements.totalRecordsSpan) {
                elements.totalRecordsSpan.textContent = responseData.pagination?.total_records || allRecords.length;
            }
            
            sortRecords();
            displayRecordsForCurrentPage();
            updatePaginationControls();
        } catch (error) {
            console.error('Fetch error:', error); // Debug log
            showError(`Failed to load records: ${error.message}`);
        } finally {
            hideLoader();
        }
    }

    // Fetch all records
    async function fetchAllRecords() {
        currentMode = 'all';
        currentPage = 1;
        await fetchRecords();
    }

    // Fetch birthday records
    async function fetchBirthdayRecords() {
        currentMode = 'Birthdays';
        currentPage = 1;
        await fetchRecords();
    }

    // Sort records
    function sortRecords() {
        allRecords.sort((a, b) => {
            let valueA = a[sortColumn] || '';
            let valueB = b[sortColumn] || '';
            
            switch(sortColumn) {
                case 'Birthday':
                case 'expired date':
                    valueA = valueA ? new Date(valueA) : new Date(0);
                    valueB = valueB ? new Date(valueB) : new Date(0);
                    break;
                case 'ID':
                    valueA = parseInt(valueA) || 0;
                    valueB = parseInt(valueB) || 0;
                    break;
            }

            return (valueA < valueB ? -1 : valueA > valueB ? 1 : 0) * (sortDirection === 'asc' ? 1 : -1);
        });
    }

    // Display records for current page
    function displayRecordsForCurrentPage() {
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const recordsToDisplay = allRecords.slice(start, end);
        console.log('Displaying records:', start, end, recordsToDisplay.length); // Debug log
        
        if (elements.tableBody) {
            displayRecords(recordsToDisplay);
        }
    }

    // Display records in table
    function displayRecords(records) {
        if (!elements.tableBody) return;

        if (!records || records.length === 0) {
            elements.tableBody.innerHTML = `<tr><td colspan="15" class="no-results">暂无记录</td></tr>`;
            return;
        }

        elements.tableBody.innerHTML = records.map(record => `
            <tr>
                <td>${escapeHtml(record.ID)}</td>
                <td>${escapeHtml(record.Name)}</td>
                <td>${escapeHtml(record.CName)}</td>
                <td>${escapeHtml(record['Designation of Applicant'])}</td>
                <td>${escapeHtml(record.Address)}</td>
                <td>${formatPhone(record.phone_number)}</td>
                <td>${escapeHtml(record.email)}</td>
                <td>${formatIC(record.IC)}</td>
                <td>${formatIC(record.oldIC)}</td>
                <td>${escapeHtml(record.gender)}</td>
                <td>${escapeHtml(record.componyName)}</td>
                <td>${formatDate(record.Birthday)}</td>
                <td>${formatDate(record['expired date'])}</td>
                <td>${escapeHtml(record['place of birth'])}</td>
                <td>
                    <button class="btn btn-edit" onclick="editMember(${record.ID})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-delete" onclick="deleteMember(${record.ID})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Pagination controls
    function updatePaginationControls() {
        if (!elements.paginationContainer) return;
    
        const totalPages = Math.ceil(allRecords.length / itemsPerPage);
        elements.paginationContainer.innerHTML = '';
    
        // Left arrow button
        const leftArrow = document.createElement('button');
        leftArrow.innerHTML = '&lt;'; // Left arrow symbol
        leftArrow.className = 'pagination-btn';
        leftArrow.disabled = currentPage === 1;
        leftArrow.addEventListener('click', () => {
            if (currentPage > 1) {
                changePage(currentPage - 1);
            }
        });
    
        // Current page number
        const pageNumber = document.createElement('button');
        pageNumber.textContent = currentPage;
        pageNumber.className = 'pagination-btn active';
    
        // Right arrow button
        const rightArrow = document.createElement('button');
        rightArrow.innerHTML = '&gt;'; // Right arrow symbol
        rightArrow.className = 'pagination-btn';
        rightArrow.disabled = currentPage === totalPages;
        rightArrow.addEventListener('click', () => {
            if (currentPage < totalPages) {
                changePage(currentPage + 1);
            }
        });
    
        // Add all elements to the container
        elements.paginationContainer.appendChild(leftArrow);
        elements.paginationContainer.appendChild(pageNumber);
        elements.paginationContainer.appendChild(rightArrow);
    }

    // Utility functions
    function formatPhone(phone) {
        if (!phone) return '';
        return String(phone).replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
    }
    
    function formatIC(ic) {
        if (!ic) return '';
        return String(ic).replace(/(\d{6})(\d{2})(\d{4})/, "$1-$2-$3");
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return isNaN(date) ? "" : date.toISOString().split('T')[0];
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function showLoader() {
        const loader = document.querySelector('.loader');
        if (loader) loader.style.display = 'flex';
    }
    
    function hideLoader() {
        const loader = document.querySelector('.loader');
        if (loader) loader.style.display = 'none';
    }
    
    function showError(message) {
        alert(message);
    }

    // Page navigation
    function changePage(newPage) {
        console.log('Changing to page:', newPage); // Debug log
        const totalPages = Math.ceil(allRecords.length / itemsPerPage);
        if (newPage < 1 || newPage > totalPages) return;
        
        currentPage = newPage;
        displayRecordsForCurrentPage();
        updatePaginationControls();
        
        // Scroll to top of table
        elements.tableBody?.closest('table')?.scrollIntoView({ behavior: 'smooth' });
    }

    // Event Listeners
    elements.searchButton?.addEventListener("click", () => {
        currentMode = 'search';
        fetchRecords(elements.searchInput.value);
    });

    elements.searchInput?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            currentMode = 'search';
            fetchRecords(elements.searchInput.value);
        }
    });

    elements.itemsPerPageSelect?.addEventListener("change", (e) => {
        itemsPerPage = parseInt(e.target.value);
        currentPage = 1;
        fetchRecords(); // Fetch new records with updated limit
    });

    elements.tableSelect?.addEventListener('change', (e) => {
        currentTable = e.target.value;
        currentPage = 1;
        currentMode = 'all';
        fetchRecords();
    });

    document.getElementById('fetchAllButton')?.addEventListener('click', fetchAllRecords);
    document.getElementById('fetchBirthdaysButton')?.addEventListener('click', fetchBirthdayRecords);

    // Sort event listeners
    elements.tableHeaders?.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.column;
            if (sortColumn === column) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortColumn = column;
                sortDirection = 'asc';
            }
            
            elements.tableHeaders.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
            header.classList.add(`sort-${sortDirection}`);
            
            sortRecords();
            displayRecordsForCurrentPage();
        });
    });

    // Global functions for inline handlers
    window.editMember = function(id) {
        window.location.href = `member_management.html?id=${id}`;
    };
    
    window.deleteMember = function(id) {
        if (confirm('确定要删除这个会员吗？')) {
            fetch(`${API_BASE_URL}?action=delete&id=${id}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(result => {
                if (result.status === 'success') {
                    fetchRecords();
                } else {
                    showError(result.message || '删除失败');
                }
            })
            .catch(error => {
                showError('删除时发生错误');
                console.error('Error:', error);
            });
        }
    };

    // Initialize
    fetchRecords();
});