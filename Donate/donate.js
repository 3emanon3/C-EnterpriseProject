let donations = JSON.parse(localStorage.getItem('donations')) || [];
const donationForm = document.getElementById('donationForm');
const donationTable = document.getElementById('donationTable');
const searchInput = document.getElementById('searchInput');

// Load donations when page loads
document.addEventListener('DOMContentLoaded', () => {
    renderDonations();
});

// Search functionality
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredDonations = donations.filter(donation => 
        donation.donorName.toLowerCase().includes(searchTerm) ||
        donation.email.toLowerCase().includes(searchTerm) ||
        donation.category.toLowerCase().includes(searchTerm) ||
        donation.paymentMethod.toLowerCase().includes(searchTerm)
    );
    renderDonations(filteredDonations);
});

// Save or update donation
donationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const donationId = document.getElementById('donationId').value;
    const donation = {
        id: donationId || Date.now().toString(),
        donorName: document.getElementById('donorName').value,
        amount: parseFloat(document.getElementById('amount').value),
        donationDate: document.getElementById('donationDate').value,
        paymentMethod: document.getElementById('paymentMethod').value,
        category: document.getElementById('category').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        notes: document.getElementById('notes').value
    };

    if (donationId) {
        // Update existing donation
        const index = donations.findIndex(d => d.id === donationId);
        donations[index] = donation;
    } else {
        // Add new donation
        donations.push(donation);
    }

    // Save to localStorage
    localStorage.setItem('donations', JSON.stringify(donations));
    
    clearForm();
    renderDonations();
});

// Render donations table
function renderDonations(donationsToRender = donations) {
    const tbody = donationTable.querySelector('tbody');
    tbody.innerHTML = '';

    donationsToRender.forEach(donation => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${donation.donorName}</td>
            <td>$${donation.amount.toFixed(2)}</td>
            <td>${formatDate(donation.donationDate)}</td>
            <td>${donation.paymentMethod}</td>
            <td>${donation.category}</td>
            <td>${donation.email}</td>
            <td class="action-buttons">
                <button class="btn btn-warning" onclick="editDonation('${donation.id}')">Edit</button>
                <button class="btn btn-danger" onclick="deleteDonation('${donation.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (donationsToRender.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center;">No donations found</td>
            </tr>
        `;
    }
}

// Edit donation
function editDonation(id) {
    const donation = donations.find(d => d.id === id);
    if (donation) {
        document.getElementById('donationId').value = donation.id;
        document.getElementById('donorName').value = donation.donorName;
        document.getElementById('amount').value = donation.amount;
        document.getElementById('donationDate').value = donation.donationDate;
        document.getElementById('paymentMethod').value = donation.paymentMethod;
        document.getElementById('category').value = donation.category;
        document.getElementById('email').value = donation.email;
        document.getElementById('phone').value = donation.phone;
        document.getElementById('notes').value = donation.notes;
    }
}

// Delete donation
function deleteDonation(id) {
    const donation = donations.find(d => d.id === id);
    if (confirm(`Are you sure you want to delete this donation from ${donation.donorName}?`)) {
        donations = donations.filter(d => d.id !== id);
        localStorage.setItem('donations', JSON.stringify(donations));
        renderDonations();
    }
}

// Clear form
function clearForm() {
    document.getElementById('donationId').value = '';
    donationForm.reset();
}

// Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Format phone number
document.getElementById('phone').addEventListener('input', function(e) {
    let phone = e.target.value.replace(/\D/g, '');
    if (phone.length >= 6) {
        phone = `${phone.slice(0,3)}-${phone.slice(3,6)}-${phone.slice(6)}`;
    } else if (phone.length >= 3) {
        phone = `${phone.slice(0,3)}-${phone.slice(3)}`;
    }
    e.target.value = phone;
});