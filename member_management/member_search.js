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
    const memberFilterSelect = document.getElementById("memberFilter"); // Add reference to the new filter
    const table = document.getElementById('memberTable');
    const tableHeaders = table.querySelectorAll('th');
    const paginationContainer = document.querySelector('.pagination');
    const memberFilter=document.getElementById('memberFilter')

    // State variables
    let currentPage = 1;
    let itemsPerPage = parseInt(itemsPerPageSelect?.value || 10);
    let sortColumn = '';
    let sortDirection = '';
    let totalPages = 0;
    let currentSearchType = 'all';
    let currentFilterValue = ''; // New variable to track current filter
    let membersData = [];
    
    fetchApplicantType();


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
            const response = await fetch(`${API_BASE_URL}?table=applicants types`);
            if (!response.ok) {
                throw new Error(`Failed to fetch applicant types: ${response.status}`);
            }
            
            const data = await response.json();
            const applicantTypes = data.data || [];
            
            // Add options for each applicant type
            applicantTypes.forEach(item => {
                const option = document.createElement("option");
                option.value = item["designation of applicant"];
                option.textContent = item["designation of applicant"];
                memberFilter.appendChild(option);
            });
        } catch (error) {
            console.error("Error fetching applicant types:", error);
        }
    }

    


    
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
    
    // Debounced search
    const debouncedSearch = debounce((searchText) => {
        console.log("Searching for:", searchText); 
        currentPage = 1; // Reset to first page when searching
        fetchMembers(searchText);
    }, 300); // 300ms delay
    
    searchInput?.addEventListener("input", function() {
        debouncedSearch(this.value);
    });

    // Fetch members data from API
    async function fetchMembers(query = "") {
        loader.style.display = "block";
        memberTableBody.innerHTML = "";
        
        const params = new URLSearchParams();
        params.append("table", "vmembers");
        params.append("limit", itemsPerPage);
        params.append("page", currentPage);
        
        // Add different parameters based on search type
        if (currentSearchType === 'Birthday') {
            const currentMonth = new Date().getMonth() + 1; // JavaScript 月份从 0 开始，+1 后为 1-12
            params.append("Birthday", "true");
            params.append("month", currentMonth.toString());
            params.append("search", "true"); 
            console.log(`Searching for birthdays in month ${currentMonth}`);
        } else if (currentSearchType === 'expired') {
            params.append("expired", "true");
            params.append("search", "true");
        } else if (query.trim() !== "") {
            params.append("search", query);
            //params.append("search_fields", "membersID,Name,CName,Address,phone_number,email,IC,oldIC,gender,companyName,Birthday,remarks");
            currentSearchType = 'search';
        } else {
            currentSearchType = 'all';
        }

        // Add applicant filter if selected
        if (memberFilter.value) {
            params.append("search", "true");
            params.append("designation of applicant", memberFilter.value);
            console.log("Filtering by applicant:", memberFilter.value);
        }


        // Add sorting parameters
        if (sortColumn) {
            // Fix any column name mismatches between frontend and database
            let dbSortColumn = sortColumn;
            if (sortColumn === 'componyName') {
                dbSortColumn = 'componyName'; // Fixing a possible typo in column name
            } else if (sortColumn === 'expired date' || sortColumn === 'expiredDate') {
                dbSortColumn = 'expired date'; // Use the actual database column name
            } else if (sortColumn === 'place of birth' || sortColumn === 'placeOfBirth') {
                dbSortColumn = 'place of birth'; // Use the actual database column name
            }
            
            params.append("sort", dbSortColumn);
            params.append("order", sortDirection);
        }
        
        const url = `${API_BASE_URL}?${params.toString()}`;
        console.log("API URL:", url);
        console.log("All params:", Object.fromEntries(params.entries()));

        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Server error response: ${errorText}`);
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log("API Response:", data);
            // Check if data and data.data exist before assigning
            if (data && typeof data === 'object') {
                membersData = Array.isArray(data.data) ? data.data : [];
                
                // Update total count and pages
                const total = data.pagination?.total_records || membersData.length;
                totalMembers.textContent = total;
                totalPages = Math.ceil(total / itemsPerPage) || 1; // Ensure at least 1 page
            } else {
                // Handle unexpected data format
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
            memberTableBody.innerHTML = `<tr><td colspan="16" class="no-results">加载失败: ${error.message}</td></tr>`;
            
            // Reset data on error
            membersData = [];
            totalMembers.textContent = 0;
            totalPages = 1;
            updatePagination();
        } finally {
            loader.style.display = "none";
        }
    }
    
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
            if (currentSearchType === 'expired') message = '本月没有会员需要续期';
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
            const designation = member['designation of applicant'];
            
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
                <td>${formatData(member.other)}</td>
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
    
    function initializeResizableColumns() {
        tableHeaders.forEach(th => {
            const resizer = document.createElement('div');
            resizer.className = 'resizer';
            th.appendChild(resizer);
            
            // Prevent text selection during resize
            resizer.addEventListener('selectstart', (e) => e.preventDefault());
    
            // More precise resize logic
            resizer.addEventListener('mousedown', initResize);
    
            function initResize(e) {
                // Prevent default to stop text selection
                e.preventDefault();
                e.stopPropagation();
    
                const startX = e.pageX;
                const startWidth = th.offsetWidth;
                const tableContainer = table.closest('.table-container');
    
                // Add resizing class for styling
                tableContainer?.classList.add('resizing');
    
                // Use document-level event listeners for better tracking
                document.addEventListener('mousemove', performResize);
                document.addEventListener('mouseup', stopResize);
    
                function performResize(moveEvent) {
                    // Calculate new width
                    const newWidth = startWidth + (moveEvent.pageX - startX);
                    
                    // Enforce minimum and maximum width constraints
                    const constrainedWidth = Math.max(50, Math.min(newWidth, 500));
                    
                    // Apply width with more precise CSS
                    th.style.width = `${constrainedWidth}px`;
                    th.style.minWidth = `${constrainedWidth}px`;
                    th.style.maxWidth = `${constrainedWidth}px`;
                    
                    // Optional: Adjust other columns if needed
                    updateRelatedColumns(th, constrainedWidth);
                }
    
                function stopResize() {
                    // Remove event listeners
                    document.removeEventListener('mousemove', performResize);
                    document.removeEventListener('mouseup', stopResize);
    
                    // Remove resizing class
                    tableContainer?.classList.remove('resizing');
    
                    // Save column widths
                    saveColumnWidths();
                }
            }
        });
    
        // Load saved widths on initialization
        loadColumnWidths();
    }
    
    function updateRelatedColumns(resizedHeader, newWidth) {
        // Optional: Add logic to adjust other columns if needed
        // For example, you might want to redistribute extra space
        const table = resizedHeader.closest('table');
        const headers = table.querySelectorAll('th');
        const totalColumns = headers.length;
        
        // Simple redistribution logic
        const averageWidth = (table.offsetWidth - newWidth) / (totalColumns - 1);
        
        headers.forEach(header => {
            if (header !== resizedHeader) {
                header.style.width = `${averageWidth}px`;
            }
        });
    }
    
    function saveColumnWidths() {
        try {
            const widths = {};
            tableHeaders.forEach(header => {
                const column = header.dataset.column;
                if (column) {
                    widths[column] = {
                        width: header.style.width,
                        minWidth: header.style.minWidth,
                        maxWidth: header.style.maxWidth
                    };
                }
            });
            localStorage.setItem('columnWidths', JSON.stringify(widths));
        } catch (error) {
            console.error('Error saving column widths:', error);
        }
    }
    
    function loadColumnWidths() {
        try {
            const savedWidths = JSON.parse(localStorage.getItem('columnWidths') || '{}');
            
            tableHeaders.forEach(header => {
                const column = header.dataset.column;
                if (savedWidths[column]) {
                    const columnWidth = savedWidths[column];
                    header.style.width = columnWidth.width || '100px';
                    header.style.minWidth = columnWidth.minWidth || '50px';
                    header.style.maxWidth = columnWidth.maxWidth || '500px';
                } else {
                    // Default width logic
                    setDefaultColumnWidth(header);
                }
            });
        } catch (error) {
            console.error('Error loading column widths:', error);
        }
    }
    
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
                header.style.width = '100px';
        }
        
        // Set min and max widths
        header.style.minWidth = '50px';
        header.style.maxWidth = '500px';
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
        if (th.dataset.column) {
            th.addEventListener('click', function() {
                handleSortClick(th.dataset.column);
            });
        }
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
    
    birthdayButton?.addEventListener("click", function() {
        console.log("Birthday button clicked"); // Debugging
        currentPage = 1;
        currentSearchType = 'Birthday';
        currentFilterValue = ''; // Reset filter when changing search type
        if (memberFilterSelect) memberFilterSelect.selectedIndex = 0; // Reset filter dropdown
        if (searchInput) searchInput.value = '';
        fetchMembers();
    });
    
    expiredButton?.addEventListener("click", function() {
        currentPage = 1;
        currentSearchType = 'expired';
        currentFilterValue = ''; // Reset filter when changing search type
        if (memberFilterSelect) memberFilterSelect.selectedIndex = 0; // Reset filter dropdown
        if (searchInput) searchInput.value = '';
        fetchMembers();
    });
    
    listAllMembersButton?.addEventListener("click", function() {
        currentPage = 1;
        currentSearchType = 'all';
        currentFilterValue = ''; // Reset filter when changing search type
        if (memberFilterSelect) memberFilterSelect.selectedIndex = 0; // Reset filter dropdown
        if (searchInput) searchInput.value = '';
        fetchMembers();
    });
    
    
    // Add event listener for member filter
    memberFilter?.addEventListener('change', function() {
        currentFilterValue = this.value;
        currentPage = 1; // Reset to first page when filtering
        fetchMembers();
    });
    
    // Items per page change
    itemsPerPageSelect?.addEventListener("change", function () {
        itemsPerPage = parseInt(this.value);
        currentPage = 1; // Reset to first page when changing items per page
        fetchMembers(searchInput?.value || '');
    });
    
    // Global functions
    window.editMember = function(id) {
        if (!id) {
            console.error("Cannot edit member: No ID provided");
            alert("无法编辑：会员ID未提供");
            return;
        }
        window.location.href = `edit_member.html?id=${id}`;
    };
    
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

    window.checkMember = async function (id) {
        if (!id) {
            console.error("Cannot edit member: No ID provided");
            alert("无法查看：会员ID未提供");
            return;
        }
        window.location.href = `check_details.html?id=${id}`;
    };
     
    window.changePage = function(page) {
        if (page >= 1 && page <= totalPages && page !== currentPage) {
            currentPage = page;
            fetchMembers(searchInput?.value || '');
            
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