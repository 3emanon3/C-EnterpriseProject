let members = JSON.parse(localStorage.getItem('members')) || [];
const memberForm = document.getElementById('memberForm');
const memberTable = document.getElementById('memberTable');
const searchInput = document.getElementById('searchInput');

// Load members when page loads
document.addEventListener('DOMContentLoaded', () => {
    renderMembers();
});

// Search functionality
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredMembers = members.filter(member => 
        member.name.toLowerCase().includes(searchTerm) ||
        member.address.toLowerCase().includes(searchTerm) ||
        member.email.toLowerCase().includes(searchTerm) ||
        member.phone.toLowerCase().includes(searchTerm) ||
        member.status.toLowerCase().includes(searchTerm)
    );
    renderMembers(filteredMembers);
});

// Save or update member
memberForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const memberId = document.getElementById('memberId').value;
    const member = {
        id: memberId || Date.now().toString(),
        name: document.getElementById('memberName').value,
        dob: document.getElementById('memberDOB').value,
        address: document.getElementById('memberAddress').value,
        status: document.getElementById('memberStatus').value,
        phone: document.getElementById('memberPhone').value,
        email: document.getElementById('memberEmail').value
    };

    if (memberId) {
        // Update existing member
        const index = members.findIndex(m => m.id === memberId);
        members[index] = member;
    } else {
        // Add new member
        members.push(member);
    }

    // Save to localStorage
    localStorage.setItem('members', JSON.stringify(members));
    
    clearForm();
    renderMembers();
});

// Render members table
function renderMembers(membersToRender = members) {
    const tbody = memberTable.querySelector('tbody');
    tbody.innerHTML = '';

    membersToRender.forEach(member => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${member.name}</td>
            <td>${formatDate(member.dob)}</td>
            <td>${member.address}</td>
            <td><span class="status-${member.status.toLowerCase()}">${member.status}</span></td>
            <td>${member.phone}</td>
            <td>${member.email}</td>
            <td class="action-buttons">
                <button class="btn btn-warning" onclick="editMember('${member.id}')">Edit</button>
                <button class="btn btn-danger" onclick="deleteMember('${member.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Show message if no members found
    if (membersToRender.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center;">No members found</td>
            </tr>
        `;
    }
}

// Edit member
function editMember(id) {
    const member = members.find(m => m.id === id);
    if (member) {
        document.getElementById('memberId').value = member.id;
        document.getElementById('memberName').value = member.name;
        document.getElementById('memberDOB').value = member.dob;
        document.getElementById('memberAddress').value = member.address;
        document.getElementById('memberStatus').value = member.status;
        document.getElementById('memberPhone').value = member.phone;
        document.getElementById('memberEmail').value = member.email;
    }
}

// Delete member
function deleteMember(id) {
    const member = members.find(m => m.id === id);
    if (confirm(`Are you sure you want to delete member "${member.name}"?`)) {
        members = members.filter(m => m.id !== id);
        localStorage.setItem('members', JSON.stringify(members));
        renderMembers();
    }
}

// Clear form
function clearForm() {
    document.getElementById('memberId').value = '';
    memberForm.reset();
}

// Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Input validation
document.getElementById('memberPhone').addEventListener('input', function(e) {
    // Remove any non-digit characters
    let phone = e.target.value.replace(/\D/g, '');
    
    // Format as XXX-XXX-XXXX
    if (phone.length >= 6) {
        phone = `${phone.slice(0,3)}-${phone.slice(3,6)}-${phone.slice(6)}`;
    } else if (phone.length >= 3) {
        phone = `${phone.slice(0,3)}-${phone.slice(3)}`;
    }
    
    e.target.value = phone;
});