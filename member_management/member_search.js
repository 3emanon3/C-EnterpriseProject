document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");
    const memberTableBody = document.querySelector("#memberTable tbody");
    const totalMembersSpan = document.getElementById("totalMembers");
    const itemsPerPage = 10;
    let currentPage = 1;
    let allMembers = [];
    let sortColumn = 'name';
    let sortDirection = 'asc';

    // Fetch members from the database
    function fetchMembers(searchTerm = '') {
        showLoader();
        const trimmedSearchTerm = searchTerm.trim();
        
        fetch(`db_config.php?action=search&term=${encodeURIComponent(trimmedSearchTerm)}`)
            .then(response => response.json())
            .then(data => {
                if (!Array.isArray(data)) {
                    throw new Error("Invalid response format.");
                }

                allMembers = data;
                totalMembersSpan.textContent = allMembers.length;
                currentPage = 1;
                clearError();
                sortMembers();
                displayMembers();
                updatePagination();
            })
            .catch(error => {
                console.error("Error fetching members:", error);
                showError(`Failed to load members: ${error.message}`);
            })
            .finally(() => hideLoader());
    }

    function sortMembers() {
        allMembers.sort((a, b) => {
            let valueA = a[sortColumn];
            let valueB = b[sortColumn];

            if (sortColumn === 'dob') {
                valueA = new Date(valueA);
                valueB = new Date(valueB);
            }

            return (valueA < valueB ? -1 : valueA > valueB ? 1 : 0) * (sortDirection === 'asc' ? 1 : -1);
        });
    }

    function updatePagination() {
        const totalPages = Math.ceil(allMembers.length / itemsPerPage);
        const pagination = document.querySelector('.pagination');
        pagination.innerHTML = '';

        if (currentPage > 1) addPaginationButton('«', 1);
        if (currentPage > 1) addPaginationButton('‹', currentPage - 1);

        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);

        if (startPage > 1) pagination.appendChild(document.createTextNode('...'));

        for (let i = startPage; i <= endPage; i++) {
            addPaginationButton(i.toString(), i, i === currentPage);
        }

        if (endPage < totalPages) pagination.appendChild(document.createTextNode('...'));

        if (currentPage < totalPages) addPaginationButton('›', currentPage + 1);
        if (currentPage < totalPages) addPaginationButton('»', totalPages);
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

    function displayMembers() {
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageMembers = allMembers.slice(start, end);

        memberTableBody.innerHTML = '';

        if (pageMembers.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="7" class="no-results">No members found</td>`;
            memberTableBody.appendChild(row);
            return;
        }

        pageMembers.forEach(member => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${escapeHtml(member.name)}</td>
                <td>${formatDate(member.dob)}</td>
                <td>${escapeHtml(member.address)}</td>
                <td><span class="status-badge ${member.status.toLowerCase()}">${escapeHtml(member.status)}</span></td>
                <td>${escapeHtml(member.phone)}</td>
                <td>${escapeHtml(member.email)}</td>
                <td>
                    <div class="action-buttons">
                        <button onclick="editMember(${member.id})" class="btn btn-warning btn-sm" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
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

    // Utility functions
    function showLoader() { document.querySelector(".loader").style.display = "block"; }
    function hideLoader() { document.querySelector(".loader").style.display = "none"; }
    function showError(message) { alert(message); }
    function clearError() { console.log("Clearing error messages..."); }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function escapeHtml(unsafe) {
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    // Event listeners
    searchButton.addEventListener("click", () => fetchMembers(searchInput.value));
    searchInput.addEventListener("keypress", (e) => { if (e.key === "Enter") fetchMembers(searchInput.value); });

    // Initialize
    fetchMembers();
});
