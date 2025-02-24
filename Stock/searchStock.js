const API_BASE_URL = 'http://localhost/projects/C-EnterpriseProject/recervingAPI.php';

document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("searchInput");
    const stockTableBody = document.querySelector("#stockTable tbody");
    const totalStocks = document.getElementById("totalStocks");
    const loader = document.querySelector(".loader");
    const itemsPerPageSelect = document.getElementById("itemsPerPage");
    const prevPageButton = document.getElementById("prevPage");
    const nextPageButton = document.getElementById("nextPage");
    let stockData = [];
    let itemsPerPage = parseInt(itemsPerPageSelect.value);
    let currentPage = 1;
    const table = document.getElementById('stockTable');
    const tableHeaders = table.querySelectorAll('th');
    let currentSortColumn = null;
    let currentSortOrder = null;
    

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

    async function fetchStocks(query = "") {
        loader.style.display = "block";
        stockTableBody.innerHTML = "";
        
        const params = new URLSearchParams();
        params.append("table", "stock");
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
            const data = await response.json();
            stockData = data.data;
            totalStocks.textContent = data.total || stockData.length;
            displayStocks(stockData);
        } catch (error) {
            console.error("Error fetching stocks:", error);
        } finally {
            loader.style.display = "none";
        }
    }

    function displayStocks(stocks) {
        stockTableBody.innerHTML = "";
        stocks.forEach(stock => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${stock["Product ID"]}</td>
                <td>${stock.Name}</td>
                <td>${stock.stock}</td>
                <td>${stock.Price}</td>
                <td>${stock.Publisher}</td>
                <td>${stock.Remarks}</td>
                <td>
                    <button class="btn btn-edit" onclick="editStock(${stock.ID})">更改</button>
                    <button class="btn btn-delete" onclick="deleteStock(${stock.ID})">删除</button>
                    <button class="btn btn-increase" onclick="increaseStock(${stock.ID})">增加</button>
                    <button class="btn btn-decrease" onclick="decreaseStock(${stock.ID})">减少</button>    
                </td>
            `;
            stockTableBody.appendChild(row);
        });
    }

    function handleSortClick(colunmName) {
        if(currentSortColumn === colunmName) {
            currentSortOrder = currentSortOrder === 'ASC' ? 'DESC' : 'ASC';
        } else {
            currentSortColumn = colunmName;
            currentSortOrder = 'ASC';
        }
        currentPage = 1;
        updateSortIcons();
        fetchStocks(searchInput.value);
    }

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

    document.querySelectorAll('th[data-column]').forEach(th => {
        th.addEventListener('click', function() {
            handleSortClick(th.dataset.column);
        });
    });

    prevPageButton.addEventListener("click", function () {
        if (currentPage > 1) {
            currentPage -= 1;
            fetchStocks(searchInput.value);
        }
    });

    nextPageButton.addEventListener("click", function () {
        currentPage += 1;
        fetchStocks(searchInput.value);
    });

    // Remove searchButton event listener since we'll use real-time search
    
    // Update search input to use debounced real-time search
    const debouncedSearch = debounce((searchText) => {
        currentPage = 1; // Reset to first page when searching
        fetchStocks(searchText);
    }, 300); // 300ms delay

    searchInput.addEventListener("input", function() {
        debouncedSearch(this.value);
    });

    // Update itemsPerPage handler to refresh data immediately
    itemsPerPageSelect.addEventListener("change", function () {
        itemsPerPage = parseInt(this.value);
        currentPage = 1; // Reset to first page when changing items per page
        fetchStocks(searchInput.value);
    });

    window.editStock = function (id) {
        window.location.href = `editStock.html?id=${id}`;
    };

    window.deleteStock = async function (id) {
        if (confirm("Are you sure you want to delete this stock item?")) {
            try {
                const response = await fetch(`${API_BASE_URL}?id=${id}`, { method: "DELETE" });
                if (response.ok) {
                    fetchStocks(searchInput.value);
                } else {
                    alert("Failed to delete stock item.");
                }
            } catch (error) {
                console.error("Error deleting stock:", error);
            }
        }
    };

    
    tableHeaders.forEach(th => {
        const resizer = th.querySelector('.resizer');
        if (!resizer) return;
        
        let startX, startWidth;
        
        resizer.addEventListener('mousedown', function(e) {
            startX = e.pageX;
            startWidth = th.offsetWidth;
            document.addEventListener('mousemove', resizeColumn);
            document.addEventListener('mouseup', stopResize);
        });
        
        function resizeColumn(e) {
            const newWidth = startWidth + (e.pageX - startX);
            th.style.width = newWidth + 'px';
        }
        
        function stopResize() {
            document.removeEventListener('mousemove', resizeColumn);
            document.removeEventListener('mouseup', stopResize);
        }
    });

    // Initial fetch
    fetchStocks();
});