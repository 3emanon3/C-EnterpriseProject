const API_BASE_URL = 'http://localhost/projects/Enterprise/C-EnterpriseProject/stockAPI.php';

document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");
    const stockTableBody = document.querySelector("#stockTable tbody");
    const totalStocks = document.getElementById("totalStocks");
    const loader = document.querySelector(".loader");
    const itemsPerPageSelect = document.getElementById("itemsPerPage");
    let stockData = [];
    let itemsPerPage = parseInt(itemsPerPageSelect.value);

    async function fetchStocks(query = "") {
        loader.style.display = "block";
        stockTableBody.innerHTML = "";
        try {
            const response = await fetch(`${API_BASE_URL}?search=${encodeURIComponent(query)}`);
            const data = await response.json();
            stockData = data;
            totalStocks.textContent = stockData.length;
            displayStocks(stockData);
        } catch (error) {
            console.error("Error fetching stocks:", error);
        } finally {
            loader.style.display = "none";
        }
    }

    function displayStocks(stocks) {
        stockTableBody.innerHTML = "";
        stocks.slice(0, itemsPerPage).forEach(stock => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${stock.name}</td>
                <td>${stock.category}</td>
                <td>${stock.quantity}</td>
                <td>${stock.supplier}</td>
                <td>${stock.status}</td>
                <td>${stock.lastUpdated}</td>
                <td>
                    <button class="btn btn-edit" onclick="editStock(${stock.id})">Edit</button>
                    <button class="btn btn-delete" onclick="deleteStock(${stock.id})">Delete</button>
                </td>
            `;
            stockTableBody.appendChild(row);
        });
    }

    searchButton.addEventListener("click", function () {
        fetchStocks(searchInput.value);
    });

    searchInput.addEventListener("keyup", function (event) {
        if (event.key === "Enter") {
            fetchStocks(searchInput.value);
        }
    });

    itemsPerPageSelect.addEventListener("change", function () {
        itemsPerPage = parseInt(this.value);
        displayStocks(stockData);
    });

    window.editStock = function (id) {
        alert(`Edit stock item with ID: ${id}`);
        // Implement edit functionality
    };

    window.deleteStock = async function (id) {
        if (confirm("Are you sure you want to delete this stock item?")) {
            try {
                const response = await fetch(`${API_BASE_URL}?id=${id}`, { method: "DELETE" });
                if (response.ok) {
                    fetchStocks();
                } else {
                    alert("Failed to delete stock item.");
                }
            } catch (error) {
                console.error("Error deleting stock:", error);
            }
        }
    };

    fetchStocks();
});
