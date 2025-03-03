document.addEventListener("DOMContentLoaded", function () {
    const API_BASE_URL = 'http://localhost/projects/C-EnterpriseProject/recervingAPI.php';
    
    // DOM Elements
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
    const table = document.getElementById('memberTable');
    const tableHeaders = table.querySelectorAll('th');
    const paginationContainer = document.querySelector('.pagination');
    
    // State variables
    let currentPage = 1;
    let itemsPerPage = parseInt(itemsPerPageSelect.value);
    let sortColumn = 'membersID';
    let sortDirection = 'ASC';
    let totalPages = 0;
    let currentSearchType = 'all';
    
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
    
    // Fetch members data from API
    async function fetchMembers(query = "") {
        loader.style.display = "block";
        memberTableBody.innerHTML = "";
        
        const params = new URLSearchParams();
        params.append("table", "members");
        params.append("limit", itemsPerPage);
        params.append("page", currentPage);
        
        // Add different parameters based on search type
        if ( query.trim() !== "") {
            params.append("search", query);
           // params.append("searchFields", "membersID,Name,CName,Address,phone_number,email,gender,IC,oldIC,componyName,companyName,remarks");
        }

        // Add sorting parameters
        if (sortColumn) {
            params.append("sort", sortColumn);
            params.append("order", sortDirection);
        }
        
        const url = `${API_BASE_URL}?${params.toString()}`;
        
        try {
            const response = await fetch(url);
            
            const data = await response.json();
            
            const members = data.data || [];
            
            // Update total count and pages
            const total = data.pagination?.total_records || members.length;
            totalMembers.textContent = total;
            totalPages = Math.ceil(total / itemsPerPage);
            
            displayMembers(members);
           updatePagination();
          // updateSortIcons();
            
        } catch (error) {
            console.error("Error fetching members:", error);
            memberTableBody.innerHTML = `<tr><td colspan="16" class="no-results">加载失败: ${error.message}</td></tr>`;
        } finally {
            loader.style.display = "none";
        }
    }
    
    // Display members in the table
    function displayMembers(members) {
        memberTableBody.innerHTML = "";
        
        if (members.length === 0) {
            let message = '暂无记录';
            if (currentSearchType === 'search') message = '没有找到匹配的记录';
            if (currentSearchType === 'Birthday') message = '本月没有会员生日';
            if (currentSearchType === 'expired') message = '本月没有会员需要续期';
            
            memberTableBody.innerHTML = `<tr><td colspan="16" class="no-results">${message}</td></tr>`;
            return;
        }
        
        members.forEach(member => {
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
            const designation = member['designation of applicant'] || 
                               member['Designation of Applicant'] || 
                               member['designation_of_applicant'];
                               
            const designationDisplay = designation === '3' ? '外国人' :
                                     designation === '2' ? '非会员' :
                                     designation === '1' ? '会员' :
                                     designation === '4' ? '拒绝继续' :
                                     formatData(designation);
            
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
                <td>${designationDisplay}</td>
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
                <td>${formatData(member.remarks)}</td>
                <td>
                    <button class="btn btn-edit" onclick="editMember('${member.ID}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-delete" onclick="deleteMember('${member.ID}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            memberTableBody.appendChild(row);
        });
    }
    
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
    
    // Update sort icons in table headers
    function updateSortIcons() {
        document.querySelectorAll('th[data-column]').forEach(th => {
            const icon = th.querySelector('i');
            icon.classList.remove('fa-sort', 'fa-sort-up', 'fa-sort-down');
            if(th.dataset.column === currentSortColumn) {
                if(currentSortOrder === 'ASC') {
                    icon.classList.add('fa-sort-up');
                } else {
                    icon.classList.add('fa-sort-down');
                }
            } else {
                icon.classList.add('fa-sort');
            }
        });
    }
    
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
    
    // Update pagination controls
    function updatePagination() {
        if (!paginationContainer) return;
        
        const paginationHTML = [];
        
        // Previous button
       /* paginationHTML.push(`
            <button id="prevPage" class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
                ${currentPage === 1 ? 'disabled' : ''}>
                上一页
            </button>
        `);*/
        
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
        
        // Next button
        /*paginationHTML.push(`
            <button id="nextPage" class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" 
                ${currentPage === totalPages ? 'disabled' : ''}>
                下一页
            </button>
        `);*/
        
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
    
    // Set up column resizing
    function initializeResizableColumns() {
        tableHeaders.forEach(th => {
            // Create resizer element if it doesn't exist
            let resizer = th.querySelector('.resizer');
            if (!resizer) {
                resizer = document.createElement('div');
                resizer.className = 'resizer';
                th.appendChild(resizer);
            }
            
            let startX, startWidth;
            
            resizer.addEventListener('mousedown', function(e) {
                startX = e.pageX;
                startWidth = th.offsetWidth;
                
                const tableContainer = table.closest('.table-container');
                if (tableContainer) {
                    tableContainer.classList.add('resizing');
                }
                
                document.addEventListener('mousemove', resizeColumn);
                document.addEventListener('mouseup', stopResize);
                e.preventDefault();
            });
            
            function resizeColumn(e) {
                const width = startWidth + (e.pageX - startX);
                if (width >= 50) { // Minimum width
                    th.style.width = `${width}px`;
                }
            }
            
            function stopResize() {
                const tableContainer = table.closest('.table-container');
                if (tableContainer) {
                    tableContainer.classList.remove('resizing');
                }
                
                document.removeEventListener('mousemove', resizeColumn);
                document.removeEventListener('mouseup', stopResize);
                
                // Save column widths
                saveColumnWidths();
            }
        });
        
        // Load saved column widths
        loadColumnWidths();
    }
    
    // Save column widths to localStorage
    function saveColumnWidths() {
        try {
            const widths = {};
            tableHeaders.forEach(header => {
                widths[header.dataset.column] = header.style.width;
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
            console.error('Error loading column widths:', error);
        }
    }
    
    // Add event listeners
    tableHeaders.forEach(th => {
        th.addEventListener('click', function() {
            handleSortClick(th.dataset.column);
        });
    });
    
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
    
    // Debounced search
    const debouncedSearch = debounce((searchText) => {
        currentPage = 1; // Reset to first page when searching
        currentSearchType = searchText.trim() ? 'search' : 'all';
        fetchMembers(searchText);
    }, 300); // 300ms delay
    
    searchInput?.addEventListener("input", function() {
        debouncedSearch(this.value);
    });
    
    
    
    birthdayButton?.addEventListener("click", function() {
        currentPage = 1;
        currentSearchType = 'Birthday';
        fetchMembers();
    });
    
    expiredButton?.addEventListener("click", function() {
        currentPage = 1;
        currentSearchType = 'expired';
        fetchMembers();
    });
    
    listAllMembersButton?.addEventListener("click", function() {
        currentPage = 1;
        currentSearchType = 'all';
        searchInput.value = '';
        fetchMembers();
    });
    
    // Items per page change
    itemsPerPageSelect?.addEventListener("change", function () {
        itemsPerPage = parseInt(this.value);
        currentPage = 1; // Reset to first page when changing items per page
        fetchMembers(searchInput.value);
    });
    
    // Global functions
    window.editMember = function(id) {
        window.location.href = `edit_member.html?id=${id}`;
    };
    
    window.deleteMember = async function(id) {
        if (confirm("确定要删除这个会员吗？")) {
            try {
                const response = await fetch(`${API_BASE_URL}?table=members&ID=${id}`, { method: "DELETE" });
                const data = await response.json();
                
                if (data.status === 'success') {
                    alert('删除成功！');
                    fetchMembers(searchInput.value);
                } else {
                    alert(data.message || "删除失败");
                }
            } catch (error) {
                console.error("Error deleting member:", error);
                alert("删除时发生错误");
            }
        }
    };
    
    window.changePage = function(page) {
        if (page >= 1 && page <= totalPages && page !== currentPage) {
            currentPage = page;
            fetchMembers(searchInput.value);
        }
    };
    
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
    
    // Initialize resizable columns
    initializeResizableColumns();
    
    // Initial fetch
    fetchMembers();
});