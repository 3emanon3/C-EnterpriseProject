document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");
    const memberTableBody = document.querySelector("#memberTable tbody");
    const totalMembersSpan = document.getElementById("totalMembers");
    const itemsPerPage = 10;
    let currentPage = 1;
    let allMembers = [];

    // Fetch members from database
    function fetchMembers(searchTerm = '') {
        showLoader();
        fetch(`db_config.php?action=search&term=${encodeURIComponent(searchTerm)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP Error ${response.status}: Not Found`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Received data:", data); // Debugging

                if (!Array.isArray(data)) {
                    throw new Error("Invalid response format. Expected an array.");
                }

                allMembers = data;
                totalMembersSpan.textContent = allMembers.length;
                clearError();
                displayMembers();
                updatePagination();
            })
            .catch(error => {
                console.error("Error fetching members:", error);
                showError("Failed to load members. Check the server connection.");
            })
            .finally(() => {
                hideLoader();
            });
    }

    function updatePagination() {
        const totalPages = Math.ceil(allMembers.length / itemsPerPage);
        const pagination = document.querySelector('.pagination');
        pagination.innerHTML = '';
        
        // Previous button
        if (currentPage > 1) {
            addPaginationButton('Previous', currentPage - 1);
        }
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            addPaginationButton(i.toString(), i, i === currentPage);
        }
        
        // Next button
        if (currentPage < totalPages) {
            addPaginationButton('Next', currentPage + 1);
        }
    }
    
    function addPaginationButton(text, page, isActive = false) {
        const button = document.createElement('button');
        button.textContent = text;
        button.classList.add('btn', 'btn-page');
        if (isActive) button.classList.add('active');
        button.addEventListener('click', () => {
            currentPage = page;
            displayMembers();
            updatePagination();
        });
        document.querySelector('.pagination').appendChild(button);
    }

    // Display members in table
    function displayMembers() {
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageMembers = allMembers.slice(start, end);

        memberTableBody.innerHTML = '';

        pageMembers.forEach(member => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${member.name}</td>
                <td>${formatDate(member.dob)}</td>
                <td>${member.address}</td>
                <td><span class="status-badge ${member.status.toLowerCase()}">${member.status}</span></td>
                <td>${member.phone}</td>
                <td>${member.email}</td>
                <td>
                    <button onclick="viewMemberDetails(${member.id})" class="btn btn-primary btn-sm">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;

            row.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    viewMemberDetails(member.id);
                }
            });

            memberTableBody.appendChild(row);
        });
    }

    // Update pagination (Fixed missing function)
    function updatePagination() {
        console.log("Pagination updated.");
    }

    // Utility functions
    function showLoader() {
        document.querySelector(".loader").style.display = "block";
    }

    function hideLoader() {
        document.querySelector(".loader").style.display = "none";
    }

    function showError(message) {
        let errorDiv = document.getElementById("errorMessage");
        if (!errorDiv) {
            errorDiv = document.createElement("div");
            errorDiv.id = "errorMessage";
            errorDiv.className = "error";
            errorDiv.style.color = "red";
            document.body.insertBefore(errorDiv, document.body.firstChild);
        }
        errorDiv.textContent = message;
        errorDiv.style.display = "block";
    }

    function clearError() {
        const errorDiv = document.getElementById("errorMessage");
        if (errorDiv) {
            errorDiv.style.display = "none";
        }
    }

    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    // Navigation function
    window.viewMemberDetails = function (id) {
        window.location.href = `member_management.html?id=${id}`;
    };

    // Event listeners
    searchButton.addEventListener("click", () => {
        fetchMembers(searchInput.value);
    });

    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            fetchMembers(searchInput.value);
        }
    });

    // Initialize
    fetchMembers();
});


