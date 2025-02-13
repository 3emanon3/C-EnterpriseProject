document.addEventListener("DOMContentLoaded", function () {
    const memberForm = document.getElementById("memberForm");
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");
    const memberTableBody = document.querySelector("#memberTable tbody");
    const totalMembersSpan = document.getElementById("totalMembers");
    const itemsPerPage = 10;
    let currentPage = 1;
    let currentSort = { column: 'name', direction: 'asc' };
    let allMembers = [];

    // Form validation
    function validateForm() {
        const name = document.getElementById("memberName").value.trim();
        const email = document.getElementById("memberEmail").value.trim();
        const phone = document.getElementById("memberPhone").value.trim();
        const dob = document.getElementById("memberDOB").value;
        
        const errors = [];
        
        if (!name) errors.push("Name is required");
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push("Valid email is required");
        }
        if (!phone || !/^[0-9]{10}$/.test(phone)) {
            errors.push("Valid 10-digit phone number is required");
        }
        if (!dob) errors.push("Date of birth is required");
        
        if (errors.length > 0) {
            showError(errors.join("\n"));
            return false;
        }
        return true;
    }

    // UI Feedback functions
    function showLoader() {
        document.querySelector(".loader").style.display = "block";
    }

    function hideLoader() {
        document.querySelector(".loader").style.display = "none";
    }

    function showSuccess(message) {
        alert(message); // Replace with better UI feedback if desired
    }

    function showError(message) {
        alert(message); // Replace with better UI feedback if desired
    }

    // Member display functions
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
                    <button onclick="editMember(${member.id})" class="btn btn-warning btn-sm">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteMember(${member.id})" class="btn btn-danger btn-sm">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            memberTableBody.appendChild(row);
        });
    }

    // Sorting functions
    function sortMembers() {
        allMembers.sort((a, b) => {
            let valueA = a[currentSort.column];
            let valueB = b[currentSort.column];
            
            if (typeof valueA === 'string') valueA = valueA.toLowerCase();
            if (typeof valueB === 'string') valueB = valueB.toLowerCase();
            
            if (valueA < valueB) return currentSort.direction === 'asc' ? -1 : 1;
            if (valueA > valueB) return currentSort.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // Pagination functions
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
        if (isActive) button.classList.add('active');
        button.addEventListener('click', () => {
            currentPage = page;
            displayMembers();
            updatePagination();
        });
        document.querySelector('.pagination').appendChild(button);
    }

    // Utility functions
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    // Event Listeners
    searchButton.addEventListener("click", () => {
        fetchMembers(searchInput.value);
    });

    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            fetchMembers(searchInput.value);
        }
    });

    // Table header sorting
    document.querySelectorAll('th[data-column]').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.column;
            if (currentSort.column === column) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.column = column;
                currentSort.direction = 'asc';
            }
            sortMembers();
            displayMembers();
        });
    });

    // Initialize
    fetchMembers();
});

// Member CRUD functions
function editMember(id) {
    // Implement edit functionality
    console.log('Edit member:', id);
}

// Add this to your DOMContentLoaded event listener
if (document.getElementById('memberForm')) {
    document.getElementById('memberForm').addEventListener('submit', function(e) {
        e.preventDefault();
        if (!validateForm()) return;

        const formData = new FormData(this);
        
        fetch('db_config.php?action=update', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                showSuccess('Member updated successfully');
                // Refresh the page or redirect back to search
                window.location.href = 'index.html';
            } else {
                showError(result.message);
            }
        })
        .catch(error => {
            console.error('Error updating member:', error);
            showError('Failed to update member');
        });
    });
}

function editMember(id) {
    // Get the member data
    fetch(`db_config.php?action=get&id=${id}`)
        .then(response => response.json())
        .then(member => {
            // Populate the form
            document.getElementById('memberId').value = member.id;
            document.getElementById('memberName').value = member.name;
            document.getElementById('memberDOB').value = member.dob;
            document.getElementById('memberAddress').value = member.address;
            document.getElementById('memberStatus').value = member.status;
            document.getElementById('memberPhone').value = member.phone;
            document.getElementById('memberEmail').value = member.email;
            
            // Show the form
            document.getElementById('memberForm').style.display = 'block';
        })
        .catch(error => {
            console.error('Error fetching member:', error);
            showError('Failed to load member details');
        });
}

function deleteMember(id) {
    if (confirm('Are you sure you want to delete this member?')) {
        fetch(`member_management.php?action=delete&id=${id}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                showSuccess('Member deleted successfully');
                fetchMembers();
            } else {
                showError(result.message);
            }
        })
        .catch(error => {
            console.error('Error deleting member:', error);
            showError('Failed to delete member');
        });
    }
}