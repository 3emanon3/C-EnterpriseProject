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

    let currentSortColumn = null;
    let currentSortOrder = null;
    let eventData = [];
    let itemsPerPage = parseInt(itemsPerPageSelect.value);
    let currentPage = 1;
    let totalPages = 0;
    

    async function fetchEvents(query = "") {
        loader.style.display = "flex";
        eventTableBody.innerHTML = "";
        
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
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            const data = await response.json();
            eventData = data.data;
            totalEvents.textContent = data.total || 0;
            totalPages = Math.ceil((data.total || eventData.length) / itemsPerPage);
            displayEvents(eventData);
            updatePagination();
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
        
        events.forEach(event => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${event.ID || ''}</td>
                <td>${event.title || ''}</td>
                <td>${event.status || ''}</td>
                <td>${formatDateTime(event.start_time) || ''}</td>
                <td>${formatDateTime(event.end_time) || ''}</td>
                <td>${formatDateTime(event.created_at) || ''}</td>
                <td>${event.location || ''}</td>
                <td>${truncateText(event.description, 50) || ''}</td>
                <td>${event.max_participant || ''}</td>
                <td>${formatDateTime(event.registration_deadline) || ''}</td>
                <td>${formatPrice(event.price) || ''}</td>
                <td>${truncateText(event.online_link, 30) || ''}</td>
                <td>
                <button class="btn btn-edit" data-id="${event.ID}">编辑</button>
                <button class="btn btn-delete" data-id="${event.ID}">删除</button>
                </td>
            `;
            eventTableBody.appendChild(row);
        });
    }

    function truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    function formatDateTime(dateTimeStr) {
        if (!dateTimeStr) return '';
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
        return `¥${parseFloat(price).toFixed(2)}`;
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
            currentPage = pageNum;
            fetchEvents(searchInput.value);
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
        fetchEvents(searchInput.value);
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
    

    document.querySelectorAll('th[data-column]').forEach(th => {
        th.addEventListener('click', function() {
            handleSortClick(this.dataset.column);
        });
    });

    prevPageButton.addEventListener("click", function () {
        if (currentPage > 1) {
            currentPage -= 1;
            fetchEvents(searchInput.value);
        }
    });

    nextPageButton.addEventListener("click", function () {
        if (currentPage < totalPages) {
            currentPage += 1;
            fetchEvents(searchInput.value);
        }
    });

    // Handle search button click
    searchButton.addEventListener("click", function() {
        currentPage = 1;
        fetchEvents(searchInput.value);
    });
    
    // Also search when Enter key is pressed
    eventTableBody.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-edit')) {
            const id = e.target.dataset.id;
            editEvent(id);
        } else if (e.target.classList.contains('btn-delete')) {
            const id = e.target.dataset.id;
            deleteEvent(id);
        } // etc.
    });

    // Update itemsPerPage handler to refresh data immediately
    itemsPerPageSelect.addEventListener("change", function () {
        itemsPerPage = parseInt(this.value);
        currentPage = 1; // Reset to first page when changing items per page
        fetchEvents(searchInput.value);
    });

    window.editEvent = function (id) {
        window.location.href = `edit_event.html?id=${id}`;
    };

    window.deleteEvent = async function (id) {
        if (confirm("确定要删除这个活动吗？")) {
            try {
                const response = await fetch(`${API_BASE_URL}`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ table: "event", id: id }),
                });
    
                const data = await response.json();
                if (data.success) {
                    alert("活动已成功删除！");
                    fetchEvents(searchInput.value);
                } else {
                    alert("删除活动失败: " + (data.message || "未知错误"));
                }
            } catch (error) {
                console.error("Error deleting event:", error);
                alert("删除活动时发生错误，请稍后再试。");
            }
        }
    };
    

    window.viewEventDetails = function (id) {
        window.location.href = `eventDetails.html?id=${id}`;
    };
    
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