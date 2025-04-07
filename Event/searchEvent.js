const API_BASE_URL = 'http://localhost/projects/C-EnterpriseProject/recervingAPI.php';

document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");
    const eventTableBody = document.querySelector("#eventTable tbody");
    const totalEvents = document.getElementById("totalEvents");
    const loader = document.querySelector(".loader");
    const itemsPerPageSelect = document.getElementById("itemsPerPage");
    const prevPageButton = document.getElementById("prevPage");
    const nextPageButton = document.getElementById("nextPage");
    const paginationContainer = document.querySelector(".pagination");
    const table = document.getElementById('eventTable');
    const tableHeaders = table.querySelectorAll('th');
    const pageInput = document.getElementById('pageInput');
    const jumpButton = document.getElementById('jumpButton');

    let currentSortColumn = null;
    let currentSortOrder = null;
    let eventData = [];
    let itemsPerPage = parseInt(itemsPerPageSelect.value);
    let currentPage = 1;
    let totalPages = 0;
    let currentSearchQuery = "";
    
    
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
    
    // Implement the debounced search
    const debouncedSearch = debounce((searchText) => {
        console.log("Searching for events:", searchText);
        currentPage = 1; // Reset to first page when searching
        fetchEvents(searchText);
    }, 300); // 300ms delay
    
    // Add this event listener after your other listeners
    if (searchInput) {
        searchInput.addEventListener("input", function() {
            debouncedSearch(this.value);
        });
    }

    async function fetchEvents(query = "") {
        loader.style.display = "flex";
        eventTableBody.innerHTML = "";
        
        // Store the current search query
        currentSearchQuery = query;
        
        const params = new URLSearchParams();
        params.append("table", "event");
        params.append("limit", itemsPerPage);
        params.append("page", currentPage);
        if (query.trim() !== "") {
            params.append("search", query);
        }
        if (currentSortColumn) {
            params.append("sort", currentSortColumn);
            params.append("order", currentSortOrder);
        }
        
        const url = `${API_BASE_URL}?${params.toString()}`;
        console.log("API URL:", url);
        
        try {
            console.log("Fetching events...");
            const response = await fetch(url);
            console.log("Raw response status:", response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Server error response: ${errorText}`);
                throw new Error(`Server responded with status: ${response.status}`);
            }
            const data = await response.json();
            eventData = data.data;
            totalEvents.textContent = data.total || 0;
            totalPages = Math.ceil((data.total || eventData.length) / itemsPerPage);
            displayEvents(eventData);
            updatePagination();
            updatePageInputMax();
        } catch (error) {
            console.error("Error fetching events:", error);
            eventTableBody.innerHTML = `<tr><td colspan="13" class="error-message">Failed to load events. Please try again later. Error: ${error.message}</td></tr>`;
            totalEvents.textContent = "0";
            totalPages = 0;
            updatePagination();
        } finally {
            loader.style.display = "none";
        }
    }

    function displayEvents(events) {
        eventTableBody.innerHTML = "";
        if (events.length === 0) {
            eventTableBody.innerHTML = `<tr><td colspan="13" class="no-data">No events found</td></tr>`;
            return;
        }
        
        const startIndex = (currentPage - 1) * itemsPerPage + 1;

        events.forEach((event,index) => {
            const displayIndex = startIndex + index;
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${displayIndex}</td> <!-- Display sequential number -->
                <td class="hidden-id">${highlightText(event.ID || '-', currentSearchQuery)}</td>
                <td>${highlightText(event.title || '-', currentSearchQuery)}</td>
                <td>${highlightText(event.status || '-', currentSearchQuery)}</td>
                <td>${highlightText(formatDateTime(event.start_time) || '-', currentSearchQuery)}</td>
                <td>${highlightText(formatDateTime(event.end_time) || '-', currentSearchQuery)}</td>
                <td>${highlightText(formatDateTime(event.created_at) || '-', currentSearchQuery)}</td>
                <td>${highlightText(event.location || '-', currentSearchQuery)}</td>
                <td>${highlightText(truncateText(event.description, 50) || '-', currentSearchQuery)}</td>
                <td>${highlightText(event.max_participant || '-', currentSearchQuery)}</td>
                <td>${highlightText(formatDateTime(event.registration_deadline) || '-', currentSearchQuery)}</td>
                <td>${highlightText(formatPrice(event.price) || '0', currentSearchQuery)}</td>
                <td>${highlightText(truncateText(event.online_link, 30) || '', currentSearchQuery)}</td>
                <td>
                <button class="btn btn-edit" data-id="${event.ID}">编辑</button>
                <button class="btn btn-delete" data-id="${event.ID}">删除</button>
                <button class="btn btn-view" data-id="${event.ID}">查看</button>
                </td>
            `;
            eventTableBody.appendChild(row);
        });
    }

    function highlightText(text, searchQuery) {
        if (!searchQuery || searchQuery.trim() === '' || !text) return text;
        
        // Convert both text and search to lowercase for case-insensitive matching
        const textStr = String(text).toLowerCase();
        const searchStr = searchQuery.toLowerCase();
        
        if (textStr.includes(searchStr)) {
            // Create a regular expression with the search query to match case-insensitively
            const regex = new RegExp(`(${escapeRegExp(searchStr)})`, 'gi');
            return String(text).replace(regex, '<span class="highlight">$1</span>');
        }
        
        return text;
    }
    
    // Helper function to escape special characters in search query for safe regex use
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    function formatDateTime(dateTimeStr) {
        if (!dateTimeStr || dateTimeStr === '0000-00-00 00:00:00') return '-';
        const date = new Date(dateTimeStr);
        if (isNaN(date.getTime())) return dateTimeStr;
        
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatPrice(price) {
        if (price === null || price === undefined) return '';
        return `RM${parseFloat(price).toFixed(2)}`;
    }

    function updatePagination() {
        paginationContainer.innerHTML = '';
        totalPages = Math.ceil((totalEvents.textContent || eventData.length) / itemsPerPage);
        currentPage = Math.min(currentPage, totalPages) || 1;  // Ensure valid page number
    
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage >= totalPages;
        // Only show pagination if we have more than one page
        if (totalPages <= 1) {
            prevPageButton.disabled = true;
            nextPageButton.disabled = true;
            return;
        }
        
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage === totalPages;
        
        // Determine page range to show
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        // Show first page button if not starting from page 1
        if (startPage > 1) {
            addPageButton(1);
            if (startPage > 2) {
                addEllipsis();
            }
        }
        
        // Add page buttons
        for (let i = startPage; i <= endPage; i++) {
            addPageButton(i);
        }
        
        // Show last page button if not ending at last page
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                addEllipsis();
            }
            addPageButton(totalPages);
        }
    }
    
    function addPageButton(pageNum) {
        const button = document.createElement('button');
        button.className = 'page-number';
        if (pageNum === currentPage) {
            button.classList.add('active');
        }
        button.textContent = pageNum;
        button.addEventListener('click', () => {
            changePage(pageNum);
        });
        paginationContainer.appendChild(button);
    }
    
    function addEllipsis() {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'ellipsis';
        ellipsis.textContent = '...';
        paginationContainer.appendChild(ellipsis);
    }

    function handleSortClick(columnName) {
        if (currentSortColumn === columnName) {
            currentSortOrder = currentSortOrder === 'ASC' ? 'DESC' : 'ASC';
        } else {
            currentSortColumn = columnName;
            currentSortOrder = 'ASC';
        }
        currentPage = 1;
        updateSortIcons();
        fetchEvents(currentSearchQuery);
    }

    function updateSortIcons() {
        document.querySelectorAll('th[data-column]').forEach(th => {
            const icon = th.querySelector('i');
            if (!icon) return;
            icon.classList.remove('fa-sort', 'fa-sort-up', 'fa-sort-down');
            if (th.dataset.column === currentSortColumn) {
                icon.classList.add(currentSortOrder === 'ASC' ? 'fa-sort-up' : 'fa-sort-down');
            } else {
                icon.classList.add('fa-sort');
            }
        });
    }
    
    // New pagination functions
    window.changePage = function(page) {
        if (page >= 1 && page <= totalPages && page !== currentPage) {
            currentPage = page;
            fetchEvents(currentSearchQuery);
        }
    };
    
    window.jumpToPage = function() {
        const pageInputElement = document.getElementById('pageInput');
        if (!pageInputElement) return;
        
        let targetPage = parseInt(pageInputElement.value);
        
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
        pageInputElement.value = '';
    };

    function updatePageInputMax() {
        if (pageInput) {
            pageInput.max = totalPages;
        }
    }

    document.querySelectorAll('th[data-column]').forEach(th => {
        th.addEventListener('click', function() {
            handleSortClick(this.dataset.column);
        });
    });

    prevPageButton.addEventListener("click", function () {
        if (currentPage > 1) {
            changePage(currentPage - 1);
        }
    });

    nextPageButton.addEventListener("click", function () {
        if (currentPage < totalPages) {
            changePage(currentPage + 1);
        }
    });

    // Handle search button click
    if (searchButton && searchInput) {
        searchButton.addEventListener("click", function() {
            currentPage = 1;
            fetchEvents(searchInput.value);
        });
        
        // Also search when Enter key is pressed
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchButton.click();
            }
        });
    }
    
    // Update itemsPerPage handler to refresh data immediately
    itemsPerPageSelect.addEventListener("change", function () {
        itemsPerPage = parseInt(this.value);
        currentPage = 1; // Reset to first page when changing items per page
        fetchEvents(currentSearchQuery);
    });

    // Jump button event handler
    if (jumpButton) {
        jumpButton.addEventListener('click', function() {
            jumpToPage();
        });
    }

    // Also handle Enter key press in page input
    if (pageInput) {
        pageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                jumpToPage();
            }
        });
    }

    window.editEvent = function (id) {
        window.location.href = `edit_event.html?id=${id}`;
    };

    window.deleteEvent = async function (id) {
        if (confirm("确定要删除这个活动吗？")) {
            try {
                const response = await fetch(`${API_BASE_URL}?table=event&action=delete&ID=${id}`, {
                    method: "DELETE"
                });
    
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Error response: ${errorText}`);
                    throw new Error(`Server responded with status: ${response.status}`);
                }
        
                const data = await response.json();
                console.log("Delete response:", data);

                if (data.success || (data.message && data.message.includes("deleted successfully"))) {
                    alert("活动已成功删除！");
                    fetchEvents(currentSearchQuery);
                } else {
                    alert("删除活动失败: " + (data.message || "未知错误"));
                }
            } catch (error) {
                console.error("Error deleting event:", error);
                alert("删除活动时发生错误，请稍后再试。");
            }
        }
    };


    
    // Existing viewEventDetails function (already present in the code)
window.viewEventDetails = function (id) {
    window.location.href = `eventDetails.html?id=${id}`;
};

// Update the event listener to include view button handling
eventTableBody.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-edit')) {
        const id = e.target.dataset.id;
        editEvent(id);
    } else if (e.target.classList.contains('btn-delete')) {
        const id = e.target.dataset.id;
        deleteEvent(id);
    } else if (e.target.classList.contains('btn-view')) {
        const id = e.target.dataset.id;
        viewEventDetails(id);
    }
});
    
    // Table column resizing
    tableHeaders.forEach(th => {
        const resizer = th.querySelector('.resizer');
        if (!resizer) return;
        
        let startX, startWidth;
        
        resizer.addEventListener('mousedown', function(e) {
            startX = e.pageX;
            startWidth = th.offsetWidth;
            document.addEventListener('mousemove', resizeColumn);
            document.addEventListener('mouseup', stopResize);
            e.preventDefault(); // Prevent text selection while dragging
        });
        
        function resizeColumn(e) {
            const newWidth = startWidth + (e.pageX - startX);
            if (newWidth > 50) { // Minimum column width
                th.style.width = newWidth + 'px';
            }
        }
        
        function stopResize() {
            document.removeEventListener('mousemove', resizeColumn);
            document.removeEventListener('mouseup', stopResize);
        }
    });

    // Initial fetch
    fetchEvents();
});