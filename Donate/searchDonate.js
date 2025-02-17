document.addEventListener("DOMContentLoaded", function() {
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");
    const donationTable = document.getElementById("donationTable").querySelector("tbody");
    const totalDonations = document.getElementById("totalDonations");
    const itemsPerPage = document.getElementById("itemsPerPage");

    let donations = [];
    let filteredDonations = [];
    let currentPage = 1;
    let itemsPerPageValue = parseInt(itemsPerPage.value);

    function fetchDonations() {
        // Mock data
      
        renderTable(donations);
    }

    function renderTable(data) {
        donationTable.innerHTML = "";
        totalDonations.textContent = data.length;
        
        data.slice((currentPage - 1) * itemsPerPageValue, currentPage * itemsPerPageValue).forEach(donation => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${donation.donor}</td>
                <td>${donation.date}</td>
                <td>${donation.amount}</td>
                <td>${donation.method}</td>
                <td>${donation.status}</td>
                <td>${donation.receiver}</td>
                <td><button class="btn btn-edit">Edit</button> <button class="btn btn-delete">Delete</button></td>
            `;
            donationTable.appendChild(row);
        });
    }

    searchButton.addEventListener("click", function() {
        const query = searchInput.value.toLowerCase();
        filteredDonations = donations.filter(donation => 
            donation.donor.toLowerCase().includes(query) ||
            donation.amount.toLowerCase().includes(query) ||
            donation.status.toLowerCase().includes(query)
        );
        renderTable(filteredDonations);
    });

    itemsPerPage.addEventListener("change", function() {
        itemsPerPageValue = parseInt(this.value);
        renderTable(donations);
    });

    fetchDonations();
});
