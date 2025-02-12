// Store members data
let members = [];

// DOM Elements
const memberForm = document.getElementById('memberForm');
const memberTable = document.getElementById('memberTable');
const searchInput = document.getElementById('searchInput');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadMembers();
    renderMemberTable();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    memberForm.addEventListener('submit', handleFormSubmit);
    searchInput.addEventListener('input', handleSearch);
}

// Handle form submission
function handleFormSubmit(e) {
    e.preventDefault();
    
    const memberId = document.getElementById('memberId').value;
    const memberData = {
        name: document.getElementById('memberName').value,
        dob: document.getElementById('memberDOB').value,
        address: document.getElementById('memberAddress').value,
        status: document.getElementById('memberStatus').value,
        phone: document.getElementById('memberPhone').value,
        email: document.getElementById('memberEmail').value
    };

    if (memberId) {
        updateMember(memberId, memberData);
    } else {
        addMember(memberData);
    }

    memberForm.reset();
    document.getElementById('memberId').value = '';
}

// Add new member
function addMember(memberData) {
    const newMember = {
        id: Date.now().toString(),
        ...memberData
    };
    members.push(newMember);
    saveMembersToStorage();
    renderMemberTable();
}

// Update existing member
function updateMember(id, memberData) {
    members = members.map(member => 
        member.id === id ? { ...member, ...memberData } : member
    );
    saveMembersToStorage();
    renderMemberTable();
}

// Delete member
function deleteMember(id) {
    if (confirm('Are you sure you want to delete this member?')) {
        members = members.filter(member => member.id !== id);
        saveMembersToStorage();
        renderMemberTable();
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

// Handle search
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filteredMembers = members.filter(member => 
        member.name.toLowerCase().includes(searchTerm) ||
        member.email.toLowerCase().includes(searchTerm) ||
        member.phone.includes(searchTerm)
    );
    renderMemberTable(filteredMembers);
}

// Render member table
function renderMemberTable(data = members) {
    const tbody = memberTable.querySelector('tbody');
    tbody.innerHTML = '';

    data.forEach(member => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${member.name}</td>
            <td>${formatDate(member.dob)}</td>
            <td>${member.address}</td>
            <td>${member.status}</td>
            <td>${member.phone}</td>
            <td>${member.email}</td>
            <td>
                <button onclick="editMember('${member.id}')" class="action-btn edit-btn">Edit</button>
                <button onclick="deleteMember('${member.id}')" class="action-btn delete-btn">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Format date for display
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

// Local Storage functions
function saveMembersToStorage() {
    localStorage.setItem('members', JSON.stringify(members));
}

function loadMembers() {
    const storedMembers = localStorage.getItem('members');
    members = storedMembers ? JSON.parse(storedMembers) : [];
}