document.addEventListener("DOMContentLoaded", function () {
    // Configuration
    const API_BASE_URL = 'http://localhost/projects/Enterprise/C-EnterpriseProject/recervingAPI.php';
    
    // State management
    let members = [];
    let filteredMembers = [];
    let currentPage = 1;
    let currentTable = 'members';
    let sortColumn = 'ID';
    let sortDirection = 'asc';
    let itemsPerPage = 10;
    let currentMode = 'all'; // 'all', 'birthdays', or 'search'

    // DOM Elements
    const elements = {
        searchInput: document.getElementById('searchInput'),
        searchButton: document.getElementById('searchButton'),
        memberTable: document.getElementById('memberTable'),
        tableBody: document.querySelector("#memberTable tbody"),
        totalMembersSpan: document.getElementById('totalMembers'),
        itemsPerPageSelect: document.getElementById('itemsPerPage'),
        tableHeaders: document.querySelectorAll("#memberTable th[data-column]"),
        paginationContainer: document.querySelector('.pagination'),
        loader: document.querySelector('.loader'),
        printButton: document.getElementById('printButton')
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

    // Initialize the application
    async function initialize() {
        try {
            await fetchRecords();
            setupEventListeners();
        } catch (error) {
            console.error('Initialization error:', error);
            showError('Failed to initialize the application');
        }
    }

    // Event Listeners Setup
    function setupEventListeners() {
        elements.searchButton?.addEventListener('click', () => {
            currentMode = 'search';
            handleSearch();
        });

        elements.searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                currentMode = 'search';
                handleSearch();
            }
        });

        elements.itemsPerPageSelect?.addEventListener('change', (e) => {
            itemsPerPage = parseInt(e.target.value);
            currentPage = 1;
            updateTable();
        });

        elements.printButton?.addEventListener('click', printMemberDetails);

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
                updateTable();
            });
        });
    }

    // Fetch records from backend
    async function fetchRecords(searchTerm = '') {
        showLoader();
        try {
            const params = new URLSearchParams({
                table: currentTable,
                page: currentPage,
                limit: elements.itemsPerPageSelect?.value || itemsPerPage
            });

            if (searchTerm) {
                params.append('search', String(searchTerm).trim());
            }

            if (currentMode === 'birthdays') {
                params.append('birthdays', 'true');
                params.append('month', new Date().getMonth() + 1);
            }

            const response = await fetch(`${API_BASE_URL}?${params.toString()}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseData = await response.json();
            
            if (responseData.error) {
                throw new Error(responseData.error);
            }

            members = responseData.data || [];
            filteredMembers = [...members];
            
            if (elements.totalMembersSpan) {
                elements.totalMembersSpan.textContent = responseData.pagination?.total_records || members.length;
            }
            
            sortRecords();
            updateTable();
        } catch (error) {
            console.error('Fetch error:', error);
            showError(`Failed to load records: ${error.message}`);
        } finally {
            hideLoader();
        }
    }

    // Search functionality
    function handleSearch() {
        const searchTerm = elements.searchInput.value.toLowerCase().trim();
        fetchRecords(searchTerm);
    }

    // Sort records
    function sortRecords() {
        filteredMembers.sort((a, b) => {
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

    // Table update and pagination
    function updateTable() {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageMembers = filteredMembers.slice(startIndex, endIndex);
        
        renderTableRows(pageMembers);
        updatePagination();
        if (elements.totalMembersSpan) {
            elements.totalMembersSpan.textContent = filteredMembers.length;
        }
    }

    function renderTableRows(pageMembers) {
        if (!elements.tableBody) return;

        if (!pageMembers || pageMembers.length === 0) {
            elements.tableBody.innerHTML = `<tr><td colspan="15" class="no-results">暂无记录</td></tr>`;
            return;
        }

        elements.tableBody.innerHTML = pageMembers.map((member, index) => `
            <tr>
                <td>${(currentPage - 1) * itemsPerPage + index + 1}</td>
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
                <td>${formatDate(member.Birthday)}</td>
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
        `).join('');
    }

    function updatePagination() {
        if (!elements.paginationContainer) return;
    
        const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
        elements.paginationContainer.innerHTML = '';
    
        // Previous button
        addPaginationButton('«', currentPage > 1, () => {
            if (currentPage > 1) {
                currentPage--;
                updateTable();
            }
        });
    
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            addPaginationButton(i, true, () => {
                currentPage = i;
                updateTable();
            }, i === currentPage);
        }
    
        // Next button
        addPaginationButton('»', currentPage < totalPages, () => {
            if (currentPage < totalPages) {
                currentPage++;
                updateTable();
            }
        });
    }

    function addPaginationButton(text, enabled, onClick, isActive = false) {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = `pagination-btn ${isActive ? 'active' : ''} ${!enabled ? 'disabled' : ''}`;
        if (enabled) {
            button.addEventListener('click', onClick);
        }
        elements.paginationContainer.appendChild(button);
    }

    // Fetch specific record types
    async function fetchAllRecords() {
        currentMode = 'all';
        currentPage = 1;
        await fetchRecords();
    }

    async function fetchBirthdayRecords() {
        currentMode = 'birthdays';
        currentPage = 1;
        await fetchRecords();
    }

    // Member operations
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

    function escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function showLoader() {
        if (elements.loader) elements.loader.style.display = 'flex';
    }

    function hideLoader() {
        if (elements.loader) elements.loader.style.display = 'none';
    }

    function showError(message) {
        alert(message);
    }

    function printMemberDetails() {
        window.print();
    }

    // Initialize the application
    initialize();
});