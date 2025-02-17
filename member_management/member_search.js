document.addEventListener("DOMContentLoaded", function () {
    const API_BASE_URL = 'http://localhost/projects/Enterprise/C-EnterpriseProject/recervingAPI.php';
    
    let members = [];
    let filteredMembers = [];
    let currentPage = 1;
    let currentTable = 'members';
    let sortColumn = 'membersID';
    let sortDirection = 'asc';
    let itemsPerPage = 10;
    let currentMode = 'all';

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

    async function initialize() {
        try {
            await fetchRecords();
            setupEventListeners();
        } catch (error) {
            console.error('Initialization error:', error);
            showError('Failed to initialize the application');
        }
    }

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
    }

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

            const response = await fetch(`${API_BASE_URL}?${params.toString()}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const responseData = await response.json();
            if (responseData.error) throw new Error(responseData.error);

            members = responseData.data || [];
            filteredMembers = [...members];
            elements.totalMembersSpan.textContent = responseData.pagination?.total_records || members.length;
            
            sortRecords();
            updateTable();
        } catch (error) {
            console.error('Fetch error:', error);
            showError(`Failed to load records: ${error.message}`);
        } finally {
            hideLoader();
        }
    }

    function handleSearch() {
        const searchTerm = elements.searchInput.value.toLowerCase().trim();
        fetchRecords(searchTerm);
    }

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
                case 'membersID':
                    valueA = parseInt(valueA) || 0;
                    valueB = parseInt(valueB) || 0;
                    break;
            }

            return (valueA < valueB ? -1 : valueA > valueB ? 1 : 0) * (sortDirection === 'asc' ? 1 : -1);
        });
    }

    function updateTable() {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageMembers = filteredMembers.slice(startIndex, endIndex);
        renderTableRows(pageMembers);
    }

    function renderTableRows(pageMembers) {
        if (!elements.tableBody) return;
        elements.tableBody.innerHTML = pageMembers.length ? pageMembers.map((member, index) => `
            <tr>
              
                <td>${escapeHtml(member.membersID)}</td>
                <td>${escapeHtml(member.Name)}</td>
                <td>${escapeHtml(member.CName)}</td>
                <td>${escapeHtml(member.Designation of Application)}</td>
                <td>${escapeHtml(member.Address)}</td>
                <td>${formatPhone(member.phone_number)}</td>
                <td>${escapeHtml(member.email)}</td>
                <td>${formatDate(member.Birthday)}</td>
                <td>${escapeHtml(member.expired_date)}</td>
                <td>
                    <button class="btn btn-edit" onclick="editMember(${member.membersID})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-delete" onclick="deleteMember(${member.membersID})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('') : `<tr><td colspan="8" class="no-results">暂无记录</td></tr>`;
    }

    window.editMember = function(membersID) {
        window.location.href = `member_management.html?id=${membersID}`;
    };
    
    window.deleteMember = function(membersID) {
        if (confirm('确定要删除这个会员吗？')) {
            fetch(`${API_BASE_URL}?action=delete&id=${membersID}`, { method: 'DELETE' })
            .then(response => response.json())
            .then(result => {
                if (result.status === 'success') fetchRecords();
                else showError(result.message || '删除失败');
            })
            .catch(error => {
                showError('删除时发生错误');
                console.error('Error:', error);
            });
        }
    };

    function formatPhone(phone) {
        return phone ? String(phone).replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3") : '';
    }

    function formatDate(dateString) {
        return dateString ? new Date(dateString).toISOString().split('T')[0] : '';
    }

    function escapeHtml(unsafe) {
        return String(unsafe || '').replace(/[&<>"']/g, (m) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'}[m]));
    }

    function showLoader() { elements.loader.style.display = 'flex'; }
    function hideLoader() { elements.loader.style.display = 'none'; }
    function showError(message) { alert(message); }
    function printMemberDetails() { window.print(); }

    initialize();
});
