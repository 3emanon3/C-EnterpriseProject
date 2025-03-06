const API_BASE_URL = 'http://localhost/projects/C-EnterpriseProject/recervingAPI.php';
let isLeaving = false;
let selectedMemberId = null;

window.addEventListener('beforeunload', function (e) {
    if (!isLeaving) {
        e.returnValue = '确定要取消吗？您的更改可能不会被保。';
    }
});

function confirmCancel() {
    if (confirm('确定要取消吗，您所作的更改将不会保存。')) {
        isLeaving = true; // Set flag before redirecting
        window.location.href = 'searchStock.html';
    }
}

async function saveChanges() {
    
    if(selectedMemberId != null) {
        const newMember = {

        }

    }
    
    const newSoldRecord = [
    ]

    try {
        const response = await fetch(`${API_BASE_URL}?table=soldRecord`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newStock)
        });

        if (response.ok) {
            alert('SoldRecord updated successfully');
            isLeaving = true;
            window.location.href = 'searchStock.html';
        } else {
            throw new Error('Failed to update stock');
        }
    } catch (error) {
        console.error('Error updating stock:', error);
        alert('Error updating stock');
    }
}


function updateMemberSection() {
    const membershipType = document.getElementById('membership').value;
    const newMemberSection = document.querySelector('.new-member-section');
    const searchMemberSection = document.querySelector('.search-member-section');

    if (membershipType === '1') { // 新人 - New member
        newMemberSection.style.display = 'block'; // Show new member section
        searchMemberSection.style.display = 'none'; // Hide search member section
        selectedMemberId = null; // Reset selected member ID when switching to new member
    } else if (membershipType === '2') { // 旧人 - Existing member
        newMemberSection.style.display = 'none'; // Hide new member section
        searchMemberSection.style.display = 'block'; // Show search member section
    }
}

async function searchMembers() {
    const searchTerm = document.getElementById('searchMember').value;
    const searchResultsDiv = document.getElementById('searchResults');

    // Clear previous search results
    searchResultsDiv.innerHTML = '搜索中...';

    if (!searchTerm) {
        searchResultsDiv.innerHTML = ''; // Clear results if search term is empty
        return;
    }

    try {
        
        const searchResponse = await fetch(`${API_BASE_URL}?table=members&search=${searchTerm}`); // Example API endpoint
        if (!searchResponse.ok) {
            throw new Error(`Search failed: ${searchResponse.status} - ${searchResponse.statusText}`);
        }

        const data = await searchResponse.json();
        const members = data.data; // Assuming API returns JSON array of members

        searchResultsDiv.innerHTML = ''; // Clear "Searching..." message

        if (members && data.total > 0) {
            const ul = document.createElement('ul');
            members.forEach(member => {
                const li = document.createElement('li');
                li.textContent = `${member.Name} (ID: ${member.ID})`; // Display member name and ID
                li.addEventListener('click', function() {
                    selectMember(member.Name, member.ID); // Call selectMember function on click
                });
                ul.appendChild(li);
            });
            searchResultsDiv.appendChild(ul);
        } else {
            searchResultsDiv.textContent = '未找到会员。'; // Display message if no members found
        }

    } catch (error) {
        console.error('Member search error:', error);
        searchResultsDiv.textContent = '搜索会员时出错。'; // Display error message to user
    }
}

function selectMember(memberId, memberName) {
    selectedMemberId = memberId; // Store the selected member ID
    const searchResultsDiv = document.getElementById('searchResults');
    searchResultsDiv.innerHTML = `<p>已选择会员: ${memberName} (ID: ${memberId})</p>`; // Display selected member
    // Optionally, you could also fill in other fields with member data if needed.
}


// Quantity Input Logic (Crucial part) - No changes here
document.addEventListener('DOMContentLoaded', function() {
    const quantityInput = document.getElementById('quantity_in');
    const quantityButtons = document.querySelectorAll('.quantity-btn');
    const applicantType = document.getElementById("applicantTypeFilter");

    quantityButtons.forEach(button => {
        button.addEventListener('click', function() {
            const change = parseInt(this.dataset.change, 10);
            let currentValue = parseInt(quantityInput.value, 10) || 0;
            let newValue = currentValue + change;
            newValue = Math.max(0, newValue);
            quantityInput.value = newValue;
        });
    });
     quantityInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    });

    async function fetchApplicantType(){
        try {
            const response = await fetch(`${API_BASE_URL}?table=applicants%20types&limit=100`);
            const data = await response.json();
            
            if (data && data.data) {
                // Clear existing options except the first one
                while (applicantType.options.length > 1) {
                    applicantType.remove(1);
                }
                
                // Add unique applicant types to the  dropdown
                const uniqueApplicant = data.data;
                uniqueApplicant.forEach(item => {
                    const option = document.createElement("option");
                    option.value = item.ID;
                    option.textContent = `${item["designation of applicant"]}`;
                    applicantType.appendChild(option);
                });
            }

    }catch(error){
        console.error("Error fetching applicant type options:", error);
    }
    }

    fetchApplicantType()
    updateMemberSection(); // Call this initially to set the initial state based on default selection (新人)
});